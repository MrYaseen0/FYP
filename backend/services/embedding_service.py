"""
Healtheon — Embedding Service
Generates text embeddings for case similarity search.
Falls back gracefully if no API key is available.
"""
import logging

logger = logging.getLogger("healtheon.embedding")


def get_embedding(text: str) -> list[float] | None:
    """
    Turns text into a math vector array using OpenAI's embedding model.
    Returns None if OpenAI API key is not configured or request fails.
    Dimension: 1536 (text-embedding-3-small)
    """
    try:
        from backend.config import settings

        if not settings.OPENAI_API_KEY:
            logger.info("No OPENAI_API_KEY configured — skipping embedding generation")
            return None

        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000],  # Truncate to stay within token limits
        )
        return response.data[0].embedding

    except ImportError:
        logger.info("openai package not installed — skipping embedding")
        return None
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}")
        return None


def get_embedding_local(text: str) -> list[float] | None:
    """
    Local fallback: generates a simple TF-based vector when no API key is available.
    Returns a 384-dimension vector using hashing.
    NOT a real embedding — only for demo/testing purposes.
    """
    import hashlib
    import math

    words = text.lower().split()
    if not words:
        return None

    # Create a simple bag-of-words vector
    vec = [0.0] * 384
    for word in words:
        h = int(hashlib.md5(word.encode()).hexdigest(), 16)
        idx = h % 384
        vec[idx] += 1.0

    # Normalize
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]
