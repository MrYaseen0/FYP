"""
Healtheon — Similarity API Router
Endpoints for finding similar past cases using vector embeddings.
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text

from backend.auth import get_current_user, TokenData
from backend.db.database import get_db
from backend.db.models import Case

router = APIRouter(prefix="/api/similarity", tags=["similarity"])
logger = logging.getLogger("healtheon.api.similarity")


@router.get("/cases/{case_id}/similar")
async def get_similar_cases(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Find cases similar to the given one using cosine similarity on embeddings.
    Returns up to 3 most similar cases with similarity scores.
    Works on both PostgreSQL (pgvector) and SQLite (brute-force fallback).
    """
    current_case = db.query(Case).filter(Case.id == case_id).first()
    if not current_case:
        return {"similar_cases": []}

    # Check if any cases have embeddings
    embedding_col = _get_embedding_column()
    if embedding_col is None:
        return {"similar_cases": []}

    # Try pgvector first (PostgreSQL), fall back to brute-force (SQLite)
    try:
        return _search_pgvector(db, case_id, current_case, embedding_col)
    except Exception:
        pass

    try:
        return _search_bruteforce(db, case_id, current_case)
    except Exception as e:
        logger.warning(f"Similarity search failed: {e}")
        return {"similar_cases": []}


def _get_embedding_column():
    """Check if the Case model has an embedding column."""
    try:
        from backend.db.models import Case
        if hasattr(Case, 'embedding'):
            return Case.embedding
    except Exception:
        pass
    return None


def _search_pgvector(db: Session, case_id: str, current_case, embedding_col):
    """Use pgvector's <=> cosine distance operator for fast similarity search."""
    current_embedding = getattr(current_case, 'embedding', None)
    if current_embedding is None:
        return {"similar_cases": []}

    # Convert embedding to string for parameterized query
    if hasattr(current_embedding, 'tolist'):
        emb_str = str(current_embedding.tolist())
    elif isinstance(current_embedding, list):
        emb_str = str(current_embedding)
    else:
        emb_str = str(current_embedding)

    query = sql_text("""
        SELECT id, chief_complaint, status,
               1 - (embedding <=> :current_embedding::vector) as similarity_score
        FROM cases
        WHERE id != :current_id AND embedding IS NOT NULL
        ORDER BY embedding <=> :current_embedding::vector
        LIMIT 3
    """)

    results = db.execute(query, {
        "current_embedding": emb_str,
        "current_id": case_id,
    }).fetchall()

    similar = [
        {
            "id": r.id,
            "chief_complaint": r.chief_complaint,
            "status": r.status.value if hasattr(r.status, 'value') else r.status,
            "score": round(float(r.similarity_score) * 100, 1),
        }
        for r in results
        if float(r.similarity_score) > 0.3  # Only show >30% similarity
    ]

    return {"similar_cases": similar}


def _search_bruteforce(db: Session, case_id: str, current_case):
    """Brute-force cosine similarity for SQLite (no pgvector)."""
    import math

    current_embedding = getattr(current_case, 'embedding', None)
    if current_embedding is None:
        return {"similar_cases": []}

    if hasattr(current_embedding, 'tolist'):
        current_vec = current_embedding.tolist()
    elif isinstance(current_embedding, list):
        current_vec = current_embedding
    else:
        return {"similar_cases": []}

    # Get all cases with embeddings
    all_cases = db.query(Case).filter(
        Case.id != case_id,
        Case.embedding.isnot(None),
    ).all()

    scored = []
    for c in all_cases:
        other_vec = getattr(c, 'embedding', None)
        if other_vec is None:
            continue
        if hasattr(other_vec, 'tolist'):
            other_vec = other_vec.tolist()
        elif not isinstance(other_vec, list):
            continue

        # Cosine similarity
        dot = sum(a * b for a, b in zip(current_vec, other_vec))
        norm_a = math.sqrt(sum(a * a for a in current_vec))
        norm_b = math.sqrt(sum(b * b for b in other_vec))
        if norm_a == 0 or norm_b == 0:
            continue
        score = dot / (norm_a * norm_b)

        if score > 0.3:
            scored.append({
                "id": c.id,
                "chief_complaint": c.chief_complaint,
                "status": c.status.value if hasattr(c.status, 'value') else c.status,
                "score": round(score * 100, 1),
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"similar_cases": scored[:3]}
