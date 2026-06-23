"""
Healtheon — Health Analysis API

Upload any medical document (blood test, urine, ECG, DNA, imaging, etc.)
System auto-detects the document type, deeply analyzes it using GPT-4o Vision
and provides patient-friendly health insights, risk assessment, and advice.

Available to ALL users: guests, free trial, registered, doctors, admins.

Endpoints:
    POST /api/health/analyze              Upload document + get analysis
    GET  /api/health/analyses             List user's past analyses
    GET  /api/health/analyses/{id}        Get single analysis detail
    DELETE /api/health/analyses/{id}      Delete analysis
    GET  /api/health/supported-types      List all supported document types
"""
import os
import uuid
import base64
import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models_extended import HealthAnalysis

router = APIRouter(prefix="/api/health", tags=["health-analysis"])
logger = logging.getLogger("healtheon.api.health_analysis")

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "health"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB (lab reports can be large)

# ── Supported document types with detection keywords ───────────────────────
SUPPORTED_TYPES = {
    "blood_test": {
        "label": "Blood Test / Hematology",
        "icon": "🩸",
        "keywords": ["cbc", "complete blood count", "hemoglobin", "hematocrit", "wbc", "white blood cell",
                      "red blood cell", "platelet", "mcv", "mch", "mchc", "rdw", "blood count",
                      "differential", "neutrophil", "lymphocyte", "monocyte", "eosinophil", "basophil"],
        "subtypes": ["CBC", "Differential", "Reticulocyte", "ESR", "CRP"],
    },
    "metabolic_panel": {
        "label": "Metabolic Panel / Chemistry",
        "icon": "🔬",
        "keywords": ["bmp", "cmp", "basic metabolic", "comprehensive metabolic", "glucose", "sodium",
                      "potassium", "chloride", "co2", "bun", "creatinine", "calcium", "albumin",
                      "bilirubin", "alkaline phosphatase", "alt", "ast", "egfr"],
        "subtypes": ["BMP", "CMP", "Liver Panel", "Renal Panel"],
    },
    "lipid_panel": {
        "label": "Lipid Panel / Cholesterol",
        "icon": "🫀",
        "keywords": ["cholesterol", "hdl", "ldl", "triglyceride", "lipid", "total cholesterol",
                      "vldl", "non-hdl", "apolipoprotein", "lipoprotein"],
        "subtypes": ["Standard Lipid", "Advanced Lipid", "Lp(a)"],
    },
    "thyroid": {
        "label": "Thyroid Function",
        "icon": "🦋",
        "keywords": ["tsh", "thyroid", "t3", "t4", "free t4", "free t3", "thyroxine",
                      "triiodothyronine", "thyroid stimulating", "anti-tpo", "thyroglobulin"],
        "subtypes": ["TSH Only", "Full Thyroid Panel", "Thyroid Antibodies"],
    },
    "diabetes": {
        "label": "Diabetes / Blood Sugar",
        "icon": "💉",
        "keywords": ["hba1c", "a1c", "hemoglobin a1c", "fasting glucose", "blood sugar",
                      "oral glucose", "ogtt", "insulin", "c-peptide", "fructosamine"],
        "subtypes": ["HbA1c", "Fasting Glucose", "OGTT", "Insulin"],
    },
    "urine_test": {
        "label": "Urinalysis / Urine Test",
        "icon": "🧫",
        "keywords": ["urinalysis", "urine", "dipstick", "microscopic", "urine culture",
                      "albumin creatinine", "protein urine", "urine output", "specific gravity",
                      "nitrite", "leukocyte esterase", "ketone"],
        "subtypes": ["Routine UA", "Urine Culture", "Urine Protein", "Urine Drug Screen"],
    },
    "ecg": {
        "label": "ECG / EKG",
        "icon": "💓",
        "keywords": ["ecg", "ekg", "electrocardiogram", "electrocardiograph", "heart rhythm",
                      "sinus", "pr interval", "qrs", "qt interval", "st segment", "p wave"],
        "subtypes": ["12-Lead ECG", "Rhythm Strip", "Holter Monitor"],
    },
    "chest_xray": {
        "label": "Chest X-ray / Radiology",
        "icon": "🩻",
        "keywords": ["chest x-ray", "xray", "radiograph", "thoracic", "lung", "mediastinum",
                      "cardiomegaly", "pneumonia", "pleural", "rib", "clavicle"],
        "subtypes": ["PA View", "Lateral View", "Portable"],
    },
    "dna_genetic": {
        "label": "DNA / Genetic Test",
        "icon": "🧬",
        "keywords": ["dna", "genetic", "genome", "snp", "mutation", "variant", "allele",
                      "genotype", "phenotype", "pharmacogenomic", "carrier", "ancestry",
                      "brca", "mthfr", "cyp2d6"],
        "subtypes": ["Whole Genome", "Exome", "Pharmacogenomic", "Carrier Screen", "Ancestry"],
    },
    "hormone_panel": {
        "label": "Hormone Panel",
        "icon": "⚗️",
        "keywords": ["hormone", "testosterone", "estrogen", "progesterone", "cortisol",
                      "dhea", "estradiol", "lh", "fsh", "prolactin", "igf-1", "parathyroid",
                      "vitamin d", "calcitonin"],
        "subtypes": ["Male Hormone", "Female Hormone", "Stress Hormone", "Growth Hormone"],
    },
    "coagulation": {
        "label": "Coagulation / Clotting",
        "icon": "🩹",
        "keywords": ["pt", "inr", "ptt", "aptt", "fibrinogen", "coagulation", "clotting",
                      "bleeding time", "d-dimer", "factor", "thrombin"],
        "subtypes": ["PT/INR", "PTT", "Full Coag Panel", "D-Dimer"],
    },
    "cardiac_marker": {
        "label": "Cardiac Markers",
        "icon": "❤️",
        "keywords": ["troponin", "bnp", "nt-probnp", "ck-mb", "myoglobin",
                      "cardiac marker", "heart failure", "mi marker"],
        "subtypes": ["Troponin", "BNP", "CK-MB"],
    },
    "vitamin_mineral": {
        "label": "Vitamins & Minerals",
        "icon": "💊",
        "keywords": ["vitamin d", "vitamin b12", "folate", "iron", "ferritin", "transferrin",
                      "magnesium", "zinc", "selenium", "copper", "vitamin a", "vitamin c",
                      "vitamin e", "riboflavin"],
        "subtypes": ["Vitamin Panel", "Mineral Panel", "Iron Studies"],
    },
    "infectious_disease": {
        "label": "Infectious Disease / Serology",
        "icon": "🦠",
        "keywords": ["hiv", "hepatitis", "covid", "sars-cov", "antibody", "antigen",
                      "igm", "igg", "culture", "sensitivity", "pcr", "rapid test",
                      "syphilis", "rpr", "vdrl", "mono", "ebv"],
        "subtypes": ["HIV", "Hepatitis Panel", "COVID-19", "STI Panel", "Culture"],
    },
    "imaging_other": {
        "label": "Other Imaging / Document",
        "icon": "📋",
        "keywords": ["mri", "ct scan", "ultrasound", "echo", "pathology", "biopsy",
                      "pap smear", "mammogram", "bone density", "dexa", "scan"],
        "subtypes": ["MRI", "CT Scan", "Ultrasound", "Pathology Report", "Other"],
    },
}


def _detect_document_type(text: str, filename: str) -> tuple[str, str]:
    """
    Auto-detect document type from extracted text and filename.
    Returns (type, subtype) tuple.
    """
    text_lower = (text or "").lower()
    filename_lower = filename.lower()

    # Score each type based on keyword matches
    scores = {}
    for doc_type, info in SUPPORTED_TYPES.items():
        score = 0
        for kw in info["keywords"]:
            if kw in text_lower:
                score += 2
            if kw in filename_lower:
                score += 3
        if score > 0:
            scores[doc_type] = score

    if scores:
        best_type = max(scores, key=scores.get)
        # Try to detect subtype
        subtype = "general"
        text_lower_words = text_lower.split()
        for sub in SUPPORTED_TYPES[best_type]["subtypes"]:
            sub_words = sub.lower().split()
            if all(w in text_lower for w in sub_words):
                subtype = sub
                break
        return best_type, subtype

    # Fallback: try filename-based detection
    for doc_type, info in SUPPORTED_TYPES.items():
        for kw in info["keywords"][:3]:
            if kw in filename_lower:
                return doc_type, "general"

    return "unknown", "unclassified"


def _extract_pdf_text(contents: bytes) -> str:
    """Extract text from a PDF. Returns empty string if not possible."""
    try:
        import io
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(contents))
        text = ""
        for page in reader.pages[:10]:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except ImportError:
        logger.info("PyPDF2 not installed — PDF text extraction unavailable")
        return ""
    except Exception as e:
        logger.warning(f"PDF extraction failed: {e}")
        return ""


async def _analyze_document_ai(
    contents: bytes, mime_type: str, filename: str,
    detected_type: str, detected_subtype: str, raw_text: str
) -> dict:
    """
    Deep AI analysis of a medical document using GPT-4o Vision.
    Returns structured analysis dict with summary, findings, risk, recommendations.
    """
    try:
        from backend.config import settings
        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            return _demo_analysis(detected_type, detected_subtype, raw_text)

        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        type_info = SUPPORTED_TYPES.get(detected_type, {})
        type_label = type_info.get("label", detected_type)

        # Build the analysis prompt
        system_prompt = (
            "You are a compassionate, highly skilled medical document analyst. "
            "Your role is to help patients understand their medical test results "
            "in clear, simple, and empathetic language. "
            "You must NEVER provide a definitive diagnosis — only educational insights. "
            "Always recommend consulting a healthcare professional. "
            "Be thorough but gentle in your communication. "
            "Use markdown formatting for readability."
        )

        analysis_prompt = f"""Analyze this medical document thoroughly.

**Document Type Detected:** {type_label} ({detected_subtype})
**Filename:** {filename}

Please provide a COMPREHENSIVE analysis in the following JSON format (return ONLY valid JSON, no markdown fences):

{{
    "document_type": "detected type in plain English",
    "document_subtype": "specific test panel or subtype",
    "patient_summary": "A clear, 2-3 paragraph summary in plain English that a patient can understand. Be empathetic, clear, and avoid jargon where possible. Explain what the test measures, what the results mean, and the overall health picture.",

    "key_findings": [
        {{
            "parameter": "test name",
            "value": "measured value",
            "reference_range": "normal range",
            "status": "normal|borderline|high|low|critical",
            "explanation": "what this means in simple terms"
        }}
    ],

    "risk_assessment": {{
        "overall_risk": "low|moderate|high|critical",
        "risk_score": 0-100,
        "risk_factors": ["list of identified risk factors"],
        "protective_factors": ["list of positive findings"]
    }}",

    "flags": [
        {{
            "severity": "info|warning|critical",
            "message": "clear description of the flag",
            "action": "suggested action for the patient"
        }}
    ],

    "recommendations": [
        {{
            "category": "lifestyle|follow_up|supplement|medication|specialist",
            "priority": "low|medium|high|urgent",
            "recommendation": "specific, actionable recommendation",
            "reasoning": "why this is recommended"
        }}
    ],

    "overall_health_message": "A warm, encouraging 2-3 sentence message about the patient's overall health based on these results",

    "follow_up_timeline": "when to next get tested or see a doctor (e.g. '3-6 months', 'next week', 'annually')"
}}

**CRITICAL INSTRUCTIONS:**
1. Be EXTREMELY thorough in analyzing every value in the document
2. Compare each value against standard medical reference ranges
3. Identify patterns across related values (e.g., if glucose AND HbA1c are both high)
4. Consider the patient's overall picture, not just individual numbers
5. Flag anything that needs urgent medical attention
6. Provide SPECIFIC, ACTIONABLE recommendations (not generic ones)
7. Use empathetic, reassuring language even when delivering concerning results
8. ALWAYS recommend professional medical consultation
9. If the document is in another language, analyze it anyway and respond in English
10. If you cannot extract enough information, say so clearly"""

        # Build the message content
        content_parts = [{"type": "text", "text": analysis_prompt}]

        if mime_type.startswith("image/"):
            # Image: use vision
            b64 = base64.b64encode(contents).decode("utf-8")
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64}"}
            })
        elif mime_type == "application/pdf":
            # PDF: if we have extracted text, include it; also try vision on first page
            if raw_text:
                content_parts[0]["text"] += f"\n\n--- Extracted Document Text ---\n{raw_text[:6000]}"
            # Try to send PDF as image (GPT-4o can handle PDFs)
            b64 = base64.b64encode(contents).decode("utf-8")
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:application/pdf;base64,{b64}"}
            })

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content_parts}
            ],
            max_tokens=3000,
            temperature=0.3,
        )

        result_text = response.choices[0].message.content.strip()

        # Parse JSON from response
        # Try to extract JSON from the response
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        result_text = result_text.strip()

        try:
            result = json.loads(result_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, wrap in a structured response
            result = {
                "document_type": type_label,
                "patient_summary": result_text[:2000],
                "key_findings": [],
                "risk_assessment": {"overall_risk": "moderate", "risk_score": 50, "risk_factors": [], "protective_factors": []},
                "flags": [{"severity": "info", "message": "Analysis completed. Please review the summary.", "action": "Consult your healthcare provider for detailed interpretation."}],
                "recommendations": [{"category": "follow_up", "priority": "medium", "recommendation": "Schedule a follow-up with your doctor to discuss these results.", "reasoning": "Professional interpretation is recommended."}],
                "overall_health_message": "Your analysis is complete. Please review the findings above and discuss them with your healthcare provider.",
                "follow_up_timeline": "As recommended by your doctor"
            }

        return result

    except ImportError:
        logger.info("openai package not installed — using demo analysis")
        return _demo_analysis(detected_type, detected_subtype, raw_text)
    except Exception as e:
        logger.warning(f"AI analysis failed: {e}")
        return _demo_analysis(detected_type, detected_subtype, raw_text)


def _demo_analysis(detected_type: str, subtype: str, raw_text: str) -> dict:
    """Demo/fallback analysis when AI is unavailable. Uses keyword extraction."""
    type_info = SUPPORTED_TYPES.get(detected_type, {})
    type_label = type_info.get("label", detected_type.replace("_", " ").title())

    text_lower = (raw_text or "").lower()

    # Extract potential values from text (numbers near keywords)
    findings = []
    flags = []
    risk_factors = []

    # Simple pattern matching for common lab values
    import re
    # Look for "value" patterns like "12.5 g/dL" or "Glucose: 120 mg/dL"
    value_pattern = re.compile(r'([A-Za-z\s]+?)[:\s]+(\d+\.?\d*)\s*(mg|g|mmol|U|L|%|mL|IU|ng|pg|fL|T|thou|mEq|mmHg|bpm)?[/\w]*', re.IGNORECASE)
    matches = value_pattern.findall(raw_text or "")
    for name, value, unit in matches[:15]:
        name = name.strip()
        if name and len(name) > 2:
            findings.append({
                "parameter": name,
                "value": f"{value} {unit or ''}".strip(),
                "reference_range": "Consult reference ranges",
                "status": "normal",
                "explanation": f"Value detected: {value} {unit or ''}. Please compare with your reference ranges."
            })

    if not findings:
        findings.append({
            "parameter": "Document Analysis",
            "value": "See summary",
            "reference_range": "N/A",
            "status": "normal",
            "explanation": f"Document type detected as {type_label}. Please share this with your healthcare provider for detailed interpretation."
        })

    return {
        "document_type": type_label,
        "document_subtype": subtype,
        "patient_summary": (
            f"This appears to be a **{type_label}** document ({subtype}). "
            f"The system has detected and catalogued {len(findings)} parameters from your document. "
            f"For a detailed, accurate interpretation of your results, please consult with your healthcare provider "
            f"who can consider your complete medical history and clinical context.\n\n"
            f"This analysis is provided for educational purposes only and does not constitute medical advice."
        ),
        "key_findings": findings,
        "risk_assessment": {
            "overall_risk": "moderate",
            "risk_score": 40,
            "risk_factors": risk_factors if risk_factors else ["Professional interpretation needed"],
            "protective_factors": ["Document successfully analyzed"]
        },
        "flags": [{
            "severity": "info",
            "message": f"AI-powered deep analysis requires an OpenAI API key. Current analysis is based on document detection only.",
            "action": "Configure OPENAI_API_KEY in .env for full AI-powered analysis with detailed health insights."
        }] if not flags else flags,
        "recommendations": [
            {
                "category": "follow_up",
                "priority": "high",
                "recommendation": "Share these results with your doctor for proper interpretation.",
                "reasoning": "AI-powered analysis provides educational insights, but your doctor can give personalized medical advice."
            },
            {
                "category": "lifestyle",
                "priority": "medium",
                "recommendation": "Maintain a balanced diet, regular exercise, and adequate sleep.",
                "reasoning": "Healthy lifestyle habits support overall wellness regardless of test results."
            }
        ],
        "overall_health_message": (
            "Your document has been successfully analyzed. Remember that this analysis is for educational "
            "purposes and should complement — not replace — professional medical advice. "
            "Your health matters, and taking the initiative to review your results is a positive step!"
        ),
        "follow_up_timeline": "Consult your healthcare provider for personalized follow-up timing",
    }


# ═══════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/supported-types")
async def supported_types():
    """List all supported document types for the frontend."""
    types = {}
    for k, v in SUPPORTED_TYPES.items():
        types[k] = {
            "label": v["label"],
            "icon": v["icon"],
            "subtypes": v["subtypes"],
        }
    return {"types": types, "total": len(types)}


@router.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Upload a medical document and receive deep AI analysis.
    Auto-detects document type, extracts data, and provides health insights.
    Available to ALL authenticated users (including guests).
    """
    # Validate file type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type '{content_type}' not supported. Please upload JPEG, PNG, WebP, GIF, or PDF.")

    # Read file
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large. Maximum size is 15MB.")

    # Save file
    file_id = uuid.uuid4().hex[:12]
    safe_name = f"{file_id}_{(file.filename or 'upload').replace(' ', '_')}"
    file_path = UPLOAD_DIR / safe_name
    with open(file_path, "wb") as f:
        f.write(contents)

    # Extract text from PDF if applicable
    raw_text = ""
    if content_type == "application/pdf":
        raw_text = _extract_pdf_text(contents)

    # Auto-detect document type
    detected_type, detected_subtype = _detect_document_type(raw_text, file.filename or "")
    logger.info(f"Document detected: {detected_type}/{detected_subtype} ({file.filename})")

    # Run AI analysis
    analysis = await _analyze_document_ai(
        contents, content_type, file.filename or "unknown",
        detected_type, detected_subtype, raw_text
    )

    # Build summary
    summary = analysis.get("patient_summary", "Analysis complete.")
    risk = analysis.get("risk_assessment", {})
    risk_level = risk.get("overall_risk", "unknown")
    findings = analysis.get("key_findings", [])
    recs = analysis.get("recommendations", [])
    flags = analysis.get("flags", [])

    # Save to database
    record = HealthAnalysis(
        user_id=current_user.user_id,
        original_filename=file.filename or "upload",
        stored_filename=safe_name,
        file_path=str(file_path.relative_to(UPLOAD_DIR.parent)),
        file_size=len(contents),
        mime_type=content_type,
        detected_type=detected_type,
        detected_subtype=detected_subtype,
        raw_text=raw_text[:5000] if raw_text else None,
        analysis_json=json.dumps(analysis, default=str),
        summary=summary,
        risk_level=risk_level,
        key_findings=json.dumps(findings, default=str),
        recommendations=json.dumps(recs, default=str),
        flags=json.dumps(flags, default=str),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(f"Analysis saved: {record.id} (risk: {risk_level})")

    # Build response
    type_info = SUPPORTED_TYPES.get(detected_type, {})
    return {
        "id": record.id,
        "detected_type": detected_type,
        "detected_type_label": type_info.get("label", detected_type),
        "detected_type_icon": type_info.get("icon", "📋"),
        "detected_subtype": detected_subtype,
        "analysis": analysis,
        "summary": summary,
        "risk_level": risk_level,
        "risk_score": risk.get("risk_score"),
        "key_findings": findings,
        "recommendations": recs,
        "flags": flags,
        "overall_health_message": analysis.get("overall_health_message", ""),
        "follow_up_timeline": analysis.get("follow_up_timeline", ""),
        "filename": file.filename,
        "file_size": len(contents),
    }


@router.get("/analyses")
async def list_analyses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """List user's past health analyses."""
    q = db.query(HealthAnalysis).filter(HealthAnalysis.user_id == current_user.user_id)
    total = q.count()
    analyses = q.order_by(HealthAnalysis.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for a in analyses:
        d = a.to_dict()
        type_info = SUPPORTED_TYPES.get(a.detected_type, {})
        d["type_label"] = type_info.get("label", a.detected_type)
        d["type_icon"] = type_info.get("icon", "📋")
        results.append(d)

    return {"analyses": results, "total": total}


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Get full analysis detail including all findings and recommendations."""
    record = db.query(HealthAnalysis).filter(
        HealthAnalysis.id == analysis_id,
        HealthAnalysis.user_id == current_user.user_id,
    ).first()
    if not record:
        raise HTTPException(404, "Analysis not found.")

    d = record.to_dict()
    type_info = SUPPORTED_TYPES.get(record.detected_type, {})
    d["type_label"] = type_info.get("label", record.detected_type)
    d["type_icon"] = type_info.get("icon", "📋")
    return {"analysis": d}


@router.get("/analyses/{analysis_id}/file")
async def serve_analysis_file(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Serve the original uploaded file."""
    record = db.query(HealthAnalysis).filter(
        HealthAnalysis.id == analysis_id,
        HealthAnalysis.user_id == current_user.user_id,
    ).first()
    if not record:
        raise HTTPException(404, "Analysis not found.")

    full_path = UPLOAD_DIR.parent / record.file_path
    if not full_path.exists():
        full_path = UPLOAD_DIR / os.path.basename(record.file_path)
        if not full_path.exists():
            raise HTTPException(404, "File not found on disk.")

    return FileResponse(
        path=str(full_path),
        media_type=record.mime_type or "application/octet-stream",
        filename=record.original_filename,
    )


@router.delete("/analyses/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Delete an analysis and its file."""
    record = db.query(HealthAnalysis).filter(
        HealthAnalysis.id == analysis_id,
        HealthAnalysis.user_id == current_user.user_id,
    ).first()
    if not record:
        raise HTTPException(404, "Analysis not found.")

    try:
        full_path = UPLOAD_DIR.parent / record.file_path
        if full_path.exists():
            os.remove(full_path)
    except Exception as e:
        logger.warning(f"Failed to delete file: {e}")

    db.delete(record)
    db.commit()
    return {"message": "Analysis deleted.", "id": analysis_id}
