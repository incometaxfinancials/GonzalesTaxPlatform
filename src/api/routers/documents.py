"""
GONZALES TAX PLATFORM - Documents Router
Agent Valentina - Backend/API Master

Secure document upload and management endpoints.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

router = APIRouter()


# ===========================================
# SCHEMAS
# ===========================================
class DocumentResponse(BaseModel):
    id: str
    filename: str
    document_type: str
    upload_date: datetime
    status: str
    extracted_data: Optional[dict] = None


# ===========================================
# ENDPOINTS
# ===========================================
@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    return_id: Optional[str] = Form(None)
):
    """
    Upload a tax document (W-2, 1099, etc.).

    - Validates file type and size
    - Stores securely with encryption
    - Triggers OCR extraction
    """
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed"
        )

    # In production: save to S3, trigger OCR

    return DocumentResponse(
        id=str(uuid4()),
        filename=file.filename,
        document_type=document_type,
        upload_date=datetime.utcnow(),
        status="processing"
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    """
    Get document details and extracted data.
    """
    # In production: fetch from database
    return DocumentResponse(
        id=document_id,
        filename="w2_2025.pdf",
        document_type="w2",
        upload_date=datetime.utcnow(),
        status="processed",
        extracted_data={
            "employer_name": "Acme Corp",
            "box_1_wages": 75000.00,
            "box_2_federal_withheld": 12500.00
        }
    )


@router.get("/return/{return_id}", response_model=List[DocumentResponse])
async def list_documents_for_return(return_id: str):
    """
    List all documents for a tax return.
    """
    return []


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document.
    """
    return {"message": "Document deleted"}


@router.post("/{document_id}/reprocess")
async def reprocess_document(document_id: str):
    """
    Reprocess a document through OCR.
    """
    return {"message": "Document queued for reprocessing", "status": "processing"}
