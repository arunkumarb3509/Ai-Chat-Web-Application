# Full-Stack AI Chatbot with React, Python FastAPI, LLM & RAG

A production-oriented AI Chatbot application modeled after ChatGPT, featuring multi-turn conversational AI, Retrieval-Augmented Generation (RAG) over uploaded documents (PDF, Markdown, TXT), real-time Server-Sent Events (SSE) streaming, source citations, and dark/light themes.

---

## 🌟 Key Features

- **Multi-Turn Conversational Memory**: Retains conversation history context across turns with follow-up awareness.
- **Retrieval-Augmented Generation (RAG)**: Users can upload documents (PDF, Markdown, TXT, CSV, JSON). Documents are chunked, embedded, and indexed in ChromaDB.
- **Genuine Source Citations**: Answers generated from reference documents cite exact document names, page numbers, and snippet excerpts.
- **Multi-Language & Dialect Support**: Fluent responses in English, தமிழ் (Tamil), and Tanglish.
- **Real-Time Streaming**: Server-Sent Events (SSE) stream tokens as they are generated, with an active stop-generation button and retry capabilities.
- **Multi-Provider LLM Integration**: Pluggable backend architecture supporting OpenAI (`gpt-4o-mini`, `gpt-4o`), Google Gemini (`gemini-1.5-flash`), or zero-configuration built-in offline mock provider.
- **Security & Safety Guardrails**: Context fence delimiters against prompt injection, file upload size limits, JWT authentication, and isolated per-user vector collections.
- **Modern React UI**: Responsive desktop/tablet/mobile layout, code syntax highlighting with one-click copy, expandable citations, and theme toggling.

---

## 🏗️ Architecture Overview

```
ai-chat-app/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Routers (/chat, /conversations, /documents, /auth, /health)
│   │   ├── core/            # Config (.env parsing) and JWT Security
│   │   ├── database/        # SQLAlchemy engine & SQLite session
│   │   ├── models/          # User, Conversation, Message, Document ORM models
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # LLMService, RAGService, EmbeddingService, DocumentService
│   │   └── main.py          # FastAPI application entry point & CORS
│   ├── tests/               # Pytest suite with FastAPI TestClient
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Template configuration
│   └── .env                 # Active configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, ChatArea, MessageItem, DocumentModal, AuthModal
│   │   ├── hooks/           # useChat (SSE stream reader, state management)
│   │   ├── services/        # api.js REST & fetch stream client
│   │   ├── styles/          # theme.css & main.css (responsive styling)
│   │   ├── App.jsx          # App root
│   │   └── main.jsx         # Vite entry
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **Python**: 3.11+ (or `uv` package manager)
- **Git**

---

## 🚀 Quickstart Guide

### 1. Backend Setup

Open a terminal in the project root:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (using uv or standard python)
uv venv .venv --python 3.11
# Or standard python: python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat

# Install dependencies
uv pip install -r requirements.txt
# Or: pip install -r requirements.txt

# Create .env from template
copy .env.example .env
```

#### Configuring LLM API Keys (Optional)
The backend runs out-of-the-box in `LLM_PROVIDER=mock` mode without any external API keys. To connect live providers, edit `backend/.env`:

- **OpenAI**:
  ```env
  LLM_PROVIDER=openai
  LLM_MODEL=gpt-4o-mini
  LLM_API_KEY=sk-proj-your-openai-api-key
  EMBEDDING_PROVIDER=openai
  EMBEDDING_MODEL=text-embedding-3-small
  ```
- **Google Gemini**:
  ```env
  LLM_PROVIDER=gemini
  LLM_MODEL=gemini-1.5-flash
  LLM_API_KEY=your-gemini-api-key
  EMBEDDING_PROVIDER=gemini
  EMBEDDING_MODEL=models/text-embedding-004
  ```

#### Launch Backend Server
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

---

### 2. Frontend Setup

In a separate terminal:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 🧪 Running Automated Tests

Run backend unit and integration tests with `pytest`:

```powershell
cd backend
.venv\Scripts\Activate.ps1
pytest tests -v
```

Tests cover:
- Health endpoints and root diagnostics
- User registration, login, and guest session handling
- Conversation lifecycle (creation, listing, renaming, message logging, deletion)
- Document uploading, parsing (PDF, MD, TXT), chunking, and ChromaDB vector indexing
- Multi-turn conversational memory, Tamil/Tanglish processing, and code generation
- Input validation (empty message rejection, file size limits)

---

## 🛡️ RAG Security and Safe Citations

1. **Untrusted Context Fences**: User-uploaded documents are treated as untrusted data and wrapped in `<document_context>` delimiters to protect against prompt injection attacks.
2. **Deterministic Citations**: Answers derived from uploaded materials include source badges with document names, page numbers, and chunk snippets.
3. **Graceful Uncertainty**: When context lacks answers, the model clearly states: *"The uploaded documents do not contain sufficient information to answer this question."*
4. **Data Isolation**: Chunks in ChromaDB and conversations in SQLite are strictly scoped to the authenticated `user_id`.

---

## 🔧 Troubleshooting

- **CORS Error**: Ensure `ALLOWED_ORIGINS` in `backend/.env` contains your frontend URL (default `http://localhost:5173`).
- **PowerShell Execution Policy Error**: Run `npm.cmd` directly or execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
- **ChromaDB / SQLite Locks**: If a database becomes locked during concurrent test execution, delete `backend/test_ai_chatbot.db` and re-run.

