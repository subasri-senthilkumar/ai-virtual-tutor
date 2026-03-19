import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
DATABASE_PATH = os.getenv("DATABASE_PATH", "tutor.db")

# Models
TUTOR_MODEL = os.getenv("TUTOR_MODEL", "minimax/minimax-m2.5:free")
TITLE_MODEL = os.getenv("TITLE_MODEL", "openai/gpt-oss-20b:free")
OCR_MODEL = os.getenv("OCR_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
DOC_EXTRACTION_MODEL = os.getenv("DOC_EXTRACTION_MODEL", "minimax/minimax-m2.5:free")
