from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.database.session import engine, Base
from app.models import User, Conversation, Message, Document
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Chatbot REST API",
    description="Full-stack AI Chatbot with Multi-turn Conversations, RAG Document Q&A, and Streaming",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error_type": type(exc).__name__}
    )

# Register API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "AI Chatbot API is operational.",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }

