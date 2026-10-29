import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.message import CitationItem
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.core.security import get_current_user_or_guest

router = APIRouter(prefix="/chat", tags=["Chat"])

def get_or_create_conversation(db: Session, user_id: str, conversation_id: Optional[str], initial_prompt: str) -> Conversation:
    if conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        ).first()
        if conv:
            return conv

    # Auto-generate title from first 35 chars of prompt
    title = (initial_prompt[:32] + "...") if len(initial_prompt) > 35 else initial_prompt
    conv = Conversation(
        user_id=user_id,
        title=title or "New Conversation"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

@router.post("", response_model=ChatResponse)
def chat_turn(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_guest)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conv = get_or_create_conversation(db, current_user.id, req.conversation_id, req.message)

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.message.strip(),
        mode=req.mode or "auto"
    )
    db.add(user_msg)
    db.commit()

    # Determine mode & retrieve RAG context if applicable
    citations: List[CitationItem] = []
    system_prompt = None
    active_mode = req.mode or "auto"

    if active_mode in ["rag", "auto"]:
        retrieved_chunks = rag_service.retrieve_relevant_chunks(
            query=req.message,
            user_id=current_user.id
        )
        if retrieved_chunks:
            system_prompt = rag_service.build_rag_system_prompt(retrieved_chunks)
            citations = [
                CitationItem(
                    document_id=c["document_id"],
                    filename=c["filename"],
                    page=c.get("page", 1),
                    chunk_index=c.get("chunk_index", 0),
                    snippet=c["snippet"],
                    score=c.get("score")
                )
                for c in retrieved_chunks
            ]
            active_mode = "rag"
        elif active_mode == "rag":
            # Strict RAG mode requested but no documents matched
            response_text = "The uploaded documents do not contain sufficient information to answer your question."
            asst_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=response_text,
                citations=[],
                mode="rag"
            )
            db.add(asst_msg)
            db.commit()
            db.refresh(asst_msg)
            return ChatResponse(
                conversation_id=conv.id,
                message_id=asst_msg.id,
                role="assistant",
                content=response_text,
                citations=[],
                mode="rag"
            )
        else:
            active_mode = "general"

    # Assemble conversation history
    history_messages = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.asc()).all()

    formatted_history = [{"role": m.role, "content": m.content} for m in history_messages]

    # Generate answer
    try:
        reply_content = llm_service.generate_response(
            messages=formatted_history,
            system_prompt=system_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens
        )
    except Exception as e:
        reply_content = f"An error occurred while contacting the AI service: {str(e)}"

    citations_json = [c.model_dump() for c in citations] if citations else None
    asst_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=reply_content,
        citations=citations_json,
        mode=active_mode
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)

    return ChatResponse(
        conversation_id=conv.id,
        message_id=asst_msg.id,
        role="assistant",
        content=reply_content,
        citations=citations,
        mode=active_mode
    )

@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_guest)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conv = get_or_create_conversation(db, current_user.id, req.conversation_id, req.message)

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.message.strip(),
        mode=req.mode or "auto"
    )
    db.add(user_msg)
    db.commit()

    # Determine mode & RAG chunks
    citations: List[CitationItem] = []
    system_prompt = None
    active_mode = req.mode or "auto"

    if active_mode in ["rag", "auto"]:
        retrieved_chunks = rag_service.retrieve_relevant_chunks(
            query=req.message,
            user_id=current_user.id
        )
        if retrieved_chunks:
            system_prompt = rag_service.build_rag_system_prompt(retrieved_chunks)
            citations = [
                CitationItem(
                    document_id=c["document_id"],
                    filename=c["filename"],
                    page=c.get("page", 1),
                    chunk_index=c.get("chunk_index", 0),
                    snippet=c["snippet"],
                    score=c.get("score")
                )
                for c in retrieved_chunks
            ]
            active_mode = "rag"
        elif active_mode == "rag":
            active_mode = "rag"

    # Assemble conversation history
    history_messages = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.asc()).all()

    formatted_history = [{"role": m.role, "content": m.content} for m in history_messages]

    async def event_generator():
        # Emit initial metadata
        yield f"data: {json.dumps({'event': 'start', 'conversation_id': conv.id, 'mode': active_mode})}\n\n"

        # Emit citations if available
        if citations:
            yield f"data: {json.dumps({'event': 'citations', 'citations': [c.model_dump() for c in citations]})}\n\n"

        full_content = []

        if active_mode == "rag" and not citations:
            no_doc_msg = "The uploaded documents do not contain sufficient information to answer your question."
            yield f"data: {json.dumps({'event': 'token', 'delta': no_doc_msg})}\n\n"
            full_content.append(no_doc_msg)
        else:
            try:
                async for token in llm_service.stream_response(
                    messages=formatted_history,
                    system_prompt=system_prompt,
                    temperature=req.temperature,
                    max_tokens=req.max_tokens
                ):
                    full_content.append(token)
                    yield f"data: {json.dumps({'event': 'token', 'delta': token})}\n\n"
            except Exception as e:
                err_text = f"\n[AI Service Error: {str(e)}]"
                full_content.append(err_text)
                yield f"data: {json.dumps({'event': 'token', 'delta': err_text})}\n\n"

        # Save assistant message to SQLite
        final_text = "".join(full_content)
        citations_json = [c.model_dump() for c in citations] if citations else None
        asst_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=final_text,
            citations=citations_json,
            mode=active_mode
        )
        db.add(asst_msg)
        db.commit()
        db.refresh(asst_msg)

        yield f"data: {json.dumps({'event': 'done', 'message_id': asst_msg.id})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

