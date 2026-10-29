from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentUploadResponse
from app.services.document_service import document_service
from app.services.rag_service import rag_service
from app.core.security import get_current_user_or_guest

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_guest)
):
    docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.created_at.desc()).all()
    return docs

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_guest)
):
    filename = file.filename or "uploaded_document"
    ext = filename.lower().split(".")[-1]
    if ext not in ["pdf", "txt", "md", "markdown", "csv", "json"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Supported: PDF, TXT, MD, CSV, JSON"
        )

    content_bytes = await file.read()
    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    content_hash = document_service.calculate_hash(content_bytes)

    # Check for duplicate document
    existing_doc = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.content_hash == content_hash
    ).first()
    if existing_doc:
        return DocumentUploadResponse(
            document=existing_doc,
            message="Document already uploaded and indexed."
        )

    # Parse and chunk document
    try:
        pages = document_service.parse_document(filename, content_bytes)
        chunks = document_service.chunk_document(pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process document: {str(e)}")

    if not chunks:
        raise HTTPException(status_code=400, detail="The uploaded document contains no extractable text.")

    # Create document record in database
    new_doc = Document(
        user_id=current_user.id,
        filename=filename,
        file_type=ext,
        file_size=len(content_bytes),
        chunk_count=len(chunks),
        content_hash=content_hash
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Index into ChromaDB
    try:
        rag_service.index_document(
            document_id=new_doc.id,
            user_id=current_user.id,
            filename=filename,
            chunks=chunks
        )
    except Exception as e:
        # Rollback DB record if indexing fails
        db.delete(new_doc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Vector indexing failed: {str(e)}")

    return DocumentUploadResponse(
        document=new_doc,
        message=f"Document '{filename}' successfully uploaded and indexed into {len(chunks)} chunks."
    )

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_or_guest)
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from vector store
    rag_service.delete_document(document_id=doc.id, user_id=current_user.id)

    # Delete from DB
    db.delete(doc)
    db.commit()
    return None

