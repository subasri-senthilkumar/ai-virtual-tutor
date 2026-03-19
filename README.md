# AI Virtual Tutor

An AI-powered virtual tutor that delivers personalized learning experiences through an interactive chat interface. It remembers user preferences, adapts to learning styles, and supports multimodal input.

## Features

- **Conversational AI** - Streaming chat with tool-augmented responses (web search, RAG, memory)
- **Persistent Memory** - Learns and retains user preferences, strengths, and learning patterns across sessions
- **Multimodal Input** - Upload images, documents, and audio alongside text messages
- **Math & Code Rendering** - LaTeX formulas (KaTeX) and syntax-highlighted code blocks
- **Azure TTS Avatar** - Brings responses to life with a talking avatar (optional)
- **Auth** - JWT-based user registration and login

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, Vite, React Router, React Markdown |
| Backend  | FastAPI, LangChain, Groq |
| LLMs     | OpenRouter (configurable models) |
| Database | SQLite |
| Tools    | SerpAPI (web search), ChromaDB (RAG), Memory store |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to the backend on port `8000`.

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for required keys:

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | LLM access via OpenRouter |
| `GROQ_API_KEY` | Groq API for audio transcription |
| `SERPAPI_KEY` | Web search tool |
| `AZURE_SPEECH_KEY` | TTS Avatar |
| `AZURE_SPEECH_REGION` | TTS Avatar |
