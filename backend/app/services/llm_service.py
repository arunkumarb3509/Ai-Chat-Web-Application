import os
import json
import asyncio
from typing import List, Dict, Any, Generator, AsyncGenerator, Optional
from app.core.config import settings

SYSTEM_INSTRUCTION = """You are a helpful, knowledgeable, and polite AI assistant.
Your capabilities:
- Answering questions across technology, programming, science, business, education, and daily life.
- You maintain multi-turn context and understand follow-up questions.
- You communicate fluently in English, Tamil, and Tanglish (Tamil written using the English alphabet) depending on the user's language and preference.
- You format long answers clearly using Markdown: headers (##, ###), bullet points, numbered lists, tables, and fenced code blocks with language identifiers.
- When answering from retrieved document context, strictly ground your response in the provided context and never hallucinate facts or false citations.
- If the retrieved documents do not contain the necessary information, state honestly that the uploaded documents do not contain the answer.
"""

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY
        self.temperature = settings.LLM_TEMPERATURE
        self.max_tokens = settings.LLM_MAX_TOKENS

    def _prepare_history(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        max_history = settings.MAX_HISTORY_MESSAGES
        trimmed = messages[-max_history:] if len(messages) > max_history else messages

        formatted = [{"role": "system", "content": system_prompt or SYSTEM_INSTRUCTION}]
        for msg in trimmed:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"]:
                formatted.append({"role": role, "content": content})
        return formatted

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens

        if self.provider == "openai" and self.api_key:
            return self._call_openai(messages, system_prompt, temp, tokens)
        elif self.provider == "gemini" and self.api_key:
            return self._call_gemini(messages, system_prompt, temp, tokens)
        else:
            return self._call_mock(messages, system_prompt)

    async def stream_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens

        if self.provider == "openai" and self.api_key:
            async for token in self._stream_openai(messages, system_prompt, temp, tokens):
                yield token
        elif self.provider == "gemini" and self.api_key:
            async for token in self._stream_gemini(messages, system_prompt, temp, tokens):
                yield token
        else:
            async for token in self._stream_mock(messages, system_prompt):
                yield token

    # --- OpenAI Implementation ---
    def _call_openai(self, messages: List[Dict[str, str]], system_prompt: Optional[str], temp: float, tokens: int) -> str:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            formatted_messages = self._prepare_history(messages, system_prompt)
            response = client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                temperature=temp,
                max_tokens=tokens
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            return f"Error communicating with OpenAI: {str(e)}"

    async def _stream_openai(self, messages: List[Dict[str, str]], system_prompt: Optional[str], temp: float, tokens: int) -> AsyncGenerator[str, None]:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)
            formatted_messages = self._prepare_history(messages, system_prompt)
            stream = await client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                temperature=temp,
                max_tokens=tokens,
                stream=True
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else ""
                if delta:
                    yield delta
        except Exception as e:
            yield f"\n[Error communicating with OpenAI: {str(e)}]"

    # --- Gemini Implementation ---
    def _call_gemini(self, messages: List[Dict[str, str]], system_prompt: Optional[str], temp: float, tokens: int) -> str:
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model_name = self.model if "gemini" in self.model else "gemini-1.5-flash"
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt or SYSTEM_INSTRUCTION,
                generation_config={"temperature": temp, "max_output_tokens": tokens}
            )
            gemini_history = []
            for m in messages[:-1]:
                role = "user" if m.get("role") == "user" else "model"
                gemini_history.append({"role": role, "parts": [m.get("content", "")]})
            
            chat = model.start_chat(history=gemini_history)
            latest_prompt = messages[-1].get("content", "") if messages else ""
            response = chat.send_message(latest_prompt)
            return response.text or ""
        except Exception as e:
            return f"Error communicating with Gemini: {str(e)}"

    async def _stream_gemini(self, messages: List[Dict[str, str]], system_prompt: Optional[str], temp: float, tokens: int) -> AsyncGenerator[str, None]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model_name = self.model if "gemini" in self.model else "gemini-1.5-flash"
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt or SYSTEM_INSTRUCTION,
                generation_config={"temperature": temp, "max_output_tokens": tokens}
            )
            latest_prompt = messages[-1].get("content", "") if messages else ""
            response = await asyncio.to_thread(model.generate_content, latest_prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    await asyncio.sleep(0.01)
        except Exception as e:
            yield f"\n[Error communicating with Gemini: {str(e)}]"

    # --- Built-in Mock / Test Provider (Instant Offline Operation) ---
    def _call_mock(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> str:
        last_message = messages[-1].get("content", "").strip() if messages else "Hello"
        lower_q = last_message.lower()

        # Check for context in system prompt (RAG scenario)
        if system_prompt and "RELEVANT DOCUMENT CONTEXT" in system_prompt:
            return (
                "Based on the uploaded documents:\n\n"
                "- The document details that the subject operates within the specified parameters.\n"
                "- Key points identified include structural integrity, procedural workflows, and verified citations.\n\n"
                "*(Generated with verified context references)*"
            )

        # Tamil / Tanglish detection
        if any(w in lower_q for w in ["vanakkam", "epdi irukinga", "sollunga", "nandri"]) or any('\u0b80' <= c <= '\u0bff' for c in last_message):
            return (
                "வணக்கம்! நான் உங்கள் AI உதவியாளர்.\n\n"
                "உங்களுக்கு எவ்வாறு உதவ முடியும்? நிரலாக்கம் (Coding), தொழில்நுட்பம், அறிவியல் அல்லது பொதுவான கேள்விகள் எதுவாக இருந்தாலும் தயங்காமல் கேளுங்கள்!\n\n"
                "Ask me anything in English or Tamil/Tanglish!"
            )

        # Code question
        if any(w in lower_q for w in ["code", "python", "javascript", "react", "function", "api"]):
            return (
                f"### Solution for: `{last_message[:30]}...`\n\n"
                "Here is an efficient implementation using modern best practices:\n\n"
                "```python\n"
                "def solve_problem(data: list) -> dict:\n"
                "    \"\"\"\n"
                "    Processes data efficiently and returns aggregated results.\n"
                "    \"\"\"\n"
                "    result = {\"count\": len(data), \"processed\": True}\n"
                "    return result\n"
                "```\n\n"
                "#### Key Highlights:\n"
                "1. **Type hints** ensure static safety and documentation.\n"
                "2. **Clean error boundaries** prevent runtime panics.\n"
                "3. **Modular design** allows effortless extension."
            )

        return (
            f"Hello! I received your query: **{last_message}**.\n\n"
            "I can assist you with:\n"
            "- **Programming & Software Engineering**: Code snippets, debugging, and system architecture.\n"
            "- **Document Q&A (RAG)**: Upload PDFs, text files, or markdown to query custom knowledge.\n"
            "- **Multi-lingual Support**: English, தமிழ் (Tamil), and Tanglish.\n\n"
            "How would you like to proceed?"
        )

    async def _stream_mock(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        full_text = self._call_mock(messages, system_prompt)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.02)

llm_service = LLMService()

