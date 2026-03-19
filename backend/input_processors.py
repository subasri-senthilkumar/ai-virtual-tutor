import base64
import httpx
from groq import Groq
from config import OPENROUTER_API_KEY, GROQ_API_KEY, OCR_MODEL, DOC_EXTRACTION_MODEL

OPENROUTER_BASE = "https://openrouter.ai/api/v1"


async def image_to_text(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """Extract text from an image using Gemini Flash via OpenRouter."""
    b64 = base64.b64encode(image_bytes).decode()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
            json={
                "model": OCR_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text from this image. Return only the extracted text, preserving formatting."},
                            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                        ],
                    }
                ],
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def document_to_text(doc_bytes: bytes, filename: str) -> str:
    """Extract text from a document using GPT via OpenRouter."""
    b64 = base64.b64encode(doc_bytes).decode()
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    mime_map = {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "txt": "text/plain"}
    mime = mime_map.get(ext, "application/octet-stream")

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
            json={
                "model": DOC_EXTRACTION_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Extract and return all text content from this {ext} document. Preserve structure and formatting."},
                            {"type": "file", "file": {"filename": filename, "file_data": f"data:{mime};base64,{b64}"}},
                        ],
                    }
                ],
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def audio_to_text(audio_bytes: bytes, filename: str = "audio.wav") -> str:
    """Transcribe audio using Groq Whisper."""
    client = Groq(api_key=GROQ_API_KEY)
    transcription = client.audio.transcriptions.create(
        model="whisper-large-v3",
        file=(filename, audio_bytes),
    )
    return transcription.text
