"""
Healtheon — Multimodal API Router

Handles medical image/file uploads for cases: ECGs, X-rays, lab reports, photos.
AI-powered analysis via GPT-4o Vision when available.
Educational purposes only — never clinical diagnosis.

Endpoints:
    POST   /api/multimodal/cases/{case_id}/attachments   Upload one or more files
    GET    /api/multimodal/cases/{case_id}/attachments   List all attachments for a case
    GET    /api/multimodal/attachments/{id}              Get single attachment detail
    GET    /api/multimodal/attachments/{id}/file         Serve/download the actual file
    DELETE /api/multimodal/attachments/{id}              Delete an attachment
"""
import os
import uuid
import base64
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import Case
from backend.db.models_extended import CaseAttachment

router = APIRouter(prefix="/api/multimodal", tags=["multimodal"])
logger = logging.getLogger("healtheon.api.multimodal")

# ── Upload config ──────────────────────────────────────────────────────────
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "image/dicom", "application/dicom",  # DICOM support (X-ray)
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

VALID_ATTACHMENT_TYPES = {"ecg", "xray", "lab_report", "photo", "other"}

ATTACHMENT_LABELS = {
    "ecg": "ECG / Electrocardiogram",
    "xray": "X-ray / Radiology",
    "lab_report": "Lab Report / Blood Work",
    "photo": "Clinical Photo",
    "other": "Other File",
}

# ── Vision Analysis Prompts (per type) ────────────────────────────────────
ANALYSIS_PROMPTS = {
    "ecg": (
        "Analyze this ECG (electrocardiogram) for educational purposes only. "
        "Describe: heart rate, rhythm (sinus/irregular), P-wave, PR interval, QRS duration, "
        "ST segment changes (elevation/depression), T-wave abnormalities, Q waves, "
        "axis deviation, and any other notable findings. "
        "Do NOT provide a clinical diagnosis — this is for medical education only. "
        "Format as structured clinical observations."
    ),
    "xray": (
        "Analyze this medical X-ray for educational purposes only. "
        "Describe: anatomical region, positioning, bone structures, joint spaces, "
        "soft tissue shadows, lung fields (if thoracic), mediastinum, "
        "any visible abnormalities (fractures, lesions, infiltrates, masses), "
        "and comparison with normal anatomy. "
        "Do NOT provide a clinical diagnosis — this is for medical education only. "
        "Format as structured clinical observations."
    ),
    "lab_report": (
        "Analyze this laboratory report for educational purposes only. "
        "Identify: test panels, individual analytes, reference ranges, "
        "values that are outside normal range (critical/high/low), "
        "possible clinical significance of abnormal values, "
        "and any patterns across related tests. "
        "Do NOT provide a clinical diagnosis — this is for medical education only. "
        "Format as structured observations."
    ),
    "photo": (
        "Analyze this clinical photograph for educational purposes only. "
        "Describe: anatomical location, visible findings (color, texture, size, shape), "
        "bilateral comparison if applicable, any medical devices visible, "
        "and notable clinical observations. "
        "Do NOT provide a clinical diagnosis — this is for medical education only. "
        "Format as structured clinical observations."
    ),
    "other": (
        "Describe the contents of this medical document for educational purposes only. "
        "Summarize the key information visible, any measurements or values, "
        "and notable observations. "
        "Do NOT provide a clinical diagnosis — this is for medical education only."
    ),
}


def _generate_stored_name(case_id: str, original: str) -> str:
    """Create a unique stored filename to avoid collisions."""
    safe = original.replace(" ", "_").replace("/", "_")
    ext = Path(safe).suffix.lower() or ".bin"
    short_id = uuid.uuid4().hex[:12]
    return f"{case_id}_{short_id}{ext}"


async def _analyze_image_vision(contents: bytes, mime_type: str, attachment_type: str) -> Optional[str]:
    """Use GPT-4o Vision to analyze a medical image. Returns analysis text or None."""
    try:
        from backend.config import settings
        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            return None

        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        b64_string = base64.b64encode(contents).decode("utf-8")
        mime = mime_type or "image/jpeg"
        prompt = ANALYSIS_PROMPTS.get(attachment_type, ANALYSIS_PROMPTS["other"])

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_string}"}}
                ]
            }],
            max_tokens=1500,
            temperature=0.2,
        )
        result = response.choices[0].message.content
        logger.info(f"Vision analysis completed ({attachment_type}): {len(result)} chars")
        return result

    except ImportError:
        logger.info("openai package not installed — skipping AI analysis")
        return None
    except Exception as e:
        logger.warning(f"Vision analysis failed: {e}")
        return None


async def _analyze_pdf_report(contents: bytes, filename: str) -> Optional[str]:
    """Analyze a PDF lab report using GPT-4o with text extraction (if possible)."""
    try:
        from backend.config import settings
        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            return None

        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        # Try to extract text from PDF
        text_content = ""
        try:
            import io
            # Check if PyPDF2 is available for basic text extraction
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(contents))
            for page in reader.pages[:5]:  # First 5 pages max
                text_content += page.extract_text() or ""
        except ImportError:
            text_content = f"[PDF file: {filename} — {len(contents)} bytes]"
        except Exception:
            text_content = f"[PDF file: {filename} — {len(contents)} bytes]"

        if not text_content.strip():
            text_content = f"[PDF file: {filename} — {len(contents)} bytes, no text extracted]"

        prompt = (
            "Analyze this laboratory report for educational purposes only.\n"
            "Identify: test panels, individual analytes, reference ranges, "
            "values that are outside normal range (critical/high/low), "
            "possible clinical significance of abnormal values, "
            "and any patterns across related tests.\n"
            "Do NOT provide a clinical diagnosis — this is for medical education only.\n"
            "Format as structured observations."
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a medical education assistant. Analyze clinical documents for learning purposes only."},
                {"role": "user", "content": f"{prompt}\n\n--- Document Content ---\n{text_content[:4000]}"}
            ],
            max_tokens=1500,
            temperature=0.2,
        )
        result = response.choices[0].message.content
        logger.info(f"PDF analysis completed: {len(result)} chars")
        return result

    except Exception as e:
        logger.warning(f"PDF analysis failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/cases/{case_id}/attachments")
async def upload_attachments(
    case_id: str,
    files: list[UploadFile] = File(...),
    attachment_type: str = Form("other"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Upload one or more medical files to a case.
    Types: ecg, xray, lab_report, photo, other
    AI analysis runs automatically when OpenAI API key is configured.
    """
    if attachment_type not in VALID_ATTACHMENT_TYPES:
        raise HTTPException(400, f"Invalid type '{attachment_type}'. Must be one of: {', '.join(VALID_ATTACHMENT_TYPES)}")

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case '{case_id}' not found.")

    if not files or len(files) == 0:
        raise HTTPException(400, "No files provided.")

    if len(files) > 5:
        raise HTTPException(400, "Maximum 5 files per upload.")

    case_dir = UPLOAD_DIR / case_id
    case_dir.mkdir(parent_ok=True, parents=True)

    results = []
    for file in files:
        # Validate type
        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_TYPES:
            results.append({
                "filename": file.filename,
                "error": f"File type '{content_type}' not allowed.",
                "status": "rejected",
            })
            continue

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            results.append({
                "filename": file.filename,
                "error": "File too large (max 10MB).",
                "status": "rejected",
            })
            continue

        # Save file
        stored_name = _generate_stored_name(case_id, file.filename or "upload")
        file_path = case_dir / stored_name
        with open(file_path, "wb") as f:
            f.write(contents)

        # AI analysis based on type
        ai_findings = None
        ai_analysis_type = None
        is_image = content_type.startswith("image/")
        is_pdf = content_type == "application/pdf"

        if is_image:
            ai_findings = await _analyze_image_vision(contents, content_type, attachment_type)
            if ai_findings:
                ai_analysis_type = f"{attachment_type}_analysis"
        elif is_pdf and attachment_type == "lab_report":
            ai_findings = await _analyze_pdf_report(contents, file.filename or "report.pdf")
            if ai_findings:
                ai_findings = f"[PDF Lab Report Analysis]\n\n{ai_findings}"
                ai_analysis_type = "lab_report_analysis"

        # Save to database
        attachment = CaseAttachment(
            case_id=case_id,
            user_id=current_user.user_id,
            attachment_type=attachment_type,
            original_filename=file.filename or "upload",
            stored_filename=stored_name,
            file_path=str(file_path.relative_to(UPLOAD_DIR.parent)),
            file_size=len(contents),
            mime_type=content_type,
            ai_findings=ai_findings,
            ai_analysis_type=ai_analysis_type,
        )
        db.add(attachment)
        db.commit()
        db.refresh(attachment)

        results.append({
            "id": attachment.id,
            "filename": file.filename,
            "type": attachment_type,
            "size": len(contents),
            "has_ai_analysis": ai_findings is not None,
            "ai_findings": ai_findings,
            "status": "uploaded",
        })
        logger.info(f"Uploaded: {file.filename} ({content_type}, {len(contents)} bytes) → {stored_name}")

    return {
        "case_id": case_id,
        "uploaded": len([r for r in results if r["status"] == "uploaded"]),
        "rejected": len([r for r in results if r["status"] == "rejected"]),
        "results": results,
    }


@router.get("/cases/{case_id}/attachments")
async def list_attachments(
    case_id: str,
    attachment_type: Optional[str] = Query(None, description="Filter by type"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """List all attachments for a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case '{case_id}' not found.")

    q = db.query(CaseAttachment).filter(CaseAttachment.case_id == case_id)
    if attachment_type:
        q = q.filter(CaseAttachment.attachment_type == attachment_type)

    attachments = q.order_by(CaseAttachment.created_at.desc()).all()

    return {
        "case_id": case_id,
        "attachments": [a.to_dict() for a in attachments],
        "total": len(attachments),
        "type_labels": ATTACHMENT_LABELS,
    }


@router.get("/attachments/{attachment_id}")
async def get_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Get attachment metadata including AI findings."""
    attachment = db.query(CaseAttachment).filter(CaseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(404, "Attachment not found.")
    return {"attachment": attachment.to_dict()}


@router.get("/attachments/{attachment_id}/file")
async def serve_attachment_file(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Serve the actual file (image, PDF, etc.)."""
    attachment = db.query(CaseAttachment).filter(CaseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(404, "Attachment not found.")

    # Reconstruct path: file_path is stored relative to uploads/
    full_path = UPLOAD_DIR.parent / attachment.file_path
    if not full_path.exists():
        # Try absolute path from UPLOAD_DIR
        full_path = UPLOAD_DIR / os.path.basename(attachment.file_path)
        if not full_path.exists():
            raise HTTPException(404, "File not found on disk.")

    return FileResponse(
        path=str(full_path),
        media_type=attachment.mime_type or "application/octet-stream",
        filename=attachment.original_filename,
    )


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Delete an attachment and its file from disk."""
    attachment = db.query(CaseAttachment).filter(CaseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(404, "Attachment not found.")

    # Delete file from disk
    try:
        file_path = UPLOAD_DIR.parent / attachment.file_path
        if file_path.exists():
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to delete file: {e}")

    db.delete(attachment)
    db.commit()
    return {"message": "Attachment deleted.", "id": attachment_id}


# ═══════════════════════════════════════════════════════════════════════════
#  LEGACY ENDPOINT (kept for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/cases/{case_id}/upload-image")
async def upload_image_legacy(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Legacy endpoint — redirects to new attachment system."""
    results = await upload_attachments(
        case_id=case_id,
        files=[file],
        attachment_type="other",
        db=db,
        current_user=current_user,
    )
    r = results["results"][0] if results["results"] else {}
    return {
        "file_path": r.get("id", ""),
        "filename": r.get("filename", file.filename),
        "size": r.get("size", 0),
        "ai_description": r.get("ai_findings"),
    }
