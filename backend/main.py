import json
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from db import init_db
from auth import get_current_user, register_user, login_user
from agent import create_agent_for_user
from conversations import create_conversation, get_conversations, get_messages, save_message, save_attachments, delete_conversation, generate_title
from input_processors import image_to_text, document_to_text, audio_to_text
from tools.memory import list_memories

app = FastAPI(title="AI Virtual Tutor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# --- Auth ---

class AuthRequest(BaseModel):
    username: str
    password: str

@app.post("/api/register")
def register(req: AuthRequest):
    return register_user(req.username, req.password)

@app.post("/api/login")
def login(req: AuthRequest):
    return login_user(req.username, req.password)


# --- Conversations ---

@app.get("/api/conversations")
def list_convs(user: dict = Depends(get_current_user)):
    return get_conversations(user["user_id"])

@app.get("/api/conversations/{conv_id}/messages")
def conv_messages(conv_id: int, user: dict = Depends(get_current_user)):
    return get_messages(conv_id, user["user_id"])

@app.delete("/api/conversations/{conv_id}")
def del_conv(conv_id: int, user: dict = Depends(get_current_user)):
    delete_conversation(conv_id, user["user_id"])
    return {"ok": True}


# --- Chat ---

@app.post("/api/chat")
async def chat(
    message: str = Form(""),
    conversation_id: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    user: dict = Depends(get_current_user),
):
    user_id = user["user_id"]

    # Process uploaded files → extract text, build attachment records
    attachments = []
    for f in files:
        content = await f.read()
        if not content:
            continue
        ct = f.content_type or ""
        if ct.startswith("image/"):
            file_type = "image"
            extracted = await image_to_text(content, ct)
        elif ct.startswith("audio/"):
            file_type = "audio"
            extracted = await audio_to_text(content, f.filename)
        else:
            file_type = "document"
            extracted = await document_to_text(content, f.filename)
        attachments.append({"filename": f.filename, "file_type": file_type, "extracted_text": extracted})

    if not message.strip() and not attachments:
        raise HTTPException(status_code=400, detail="No message or files provided")

    # Get or create conversation
    conv_id = int(conversation_id) if conversation_id else None
    is_new = False
    if not conv_id:
        conv_id = create_conversation(user_id)
        is_new = True

    # Load chat history as LangChain messages (with attachment context)
    history_rows = get_messages(conv_id, user_id)
    chat_history = []
    for row in history_rows:
        text = row["content"]
        # Inject stored attachment context into historical user messages
        if row["role"] == "user" and row.get("attachments"):
            att_context = "\n\n".join(
                f"[{a['file_type'].title()}: {a['filename']}]\n{a['extracted_text']}" for a in row["attachments"]
            )
            text = text + "\n\n" + att_context
            chat_history.append(HumanMessage(content=text))
        elif row["role"] == "user":
            chat_history.append(HumanMessage(content=text))
        else:
            chat_history.append(AIMessage(content=text))

    # Save user message (text only, no extracted file content)
    msg_id = save_message(conv_id, "user", message if message.strip() else "[File uploaded]")
    save_attachments(msg_id, attachments)

    # Build current user prompt for agent (text + attachment context)
    agent_prompt = message
    if attachments:
        att_context = "\n\n".join(
            f"[{a['file_type'].title()}: {a['filename']}]\n{a['extracted_text']}" for a in attachments
        )
        agent_prompt = (message + "\n\n" + att_context) if message.strip() else att_context

    # Load user context from memory
    user_context = list_memories.invoke({"user_id": user_id})

    # Create agent
    agent = create_agent_for_user(user_id, user_context)

    # Build messages list: history + new user message
    messages = chat_history + [HumanMessage(content=agent_prompt)]

    async def event_stream():
        # Send conversation_id first
        yield f"data: {json.dumps({'type': 'conversation_id', 'data': conv_id})}\n\n"

        full_response = ""
        try:
            async for message, metadata in agent.astream(
                {"messages": messages},
                stream_mode="messages",
            ):
                msg_type = getattr(message, 'type', '')

                # ToolMessage = result of a tool execution
                if msg_type == "tool":
                    yield f"data: {json.dumps({'type': 'tool_result', 'data': {'name': getattr(message, 'name', ''), 'output': str(message.content)[:500]}})}\n\n"
                    continue

                # AIMessageChunk - check for tool calls, reasoning, text
                tool_chunks = getattr(message, 'tool_call_chunks', None)
                if tool_chunks:
                    for tc in tool_chunks:
                        name = tc.get('name', '') if isinstance(tc, dict) else getattr(tc, 'name', '')
                        args = tc.get('args', '') if isinstance(tc, dict) else getattr(tc, 'args', '')
                        if name:  # Only emit on the first chunk that has the tool name
                            yield f"data: {json.dumps({'type': 'tool_call', 'data': {'name': name, 'input': str(args)}})}\n\n"
                    continue

                # Check for reasoning/thinking content
                additional = getattr(message, 'additional_kwargs', {})
                reasoning = additional.get('reasoning') or additional.get('reasoning_content', '')
                if reasoning:
                    yield f"data: {json.dumps({'type': 'thinking', 'data': reasoning})}\n\n"

                # Regular text content
                content = getattr(message, 'content', '')
                if isinstance(content, str) and content:
                    full_response += content
                    yield f"data: {json.dumps({'type': 'text', 'data': content})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

        # Save assistant response
        if full_response:
            save_message(conv_id, "assistant", full_response)

        # Generate title for new conversations
        if is_new and full_response:
            try:
                title = await generate_title(conv_id)
                yield f"data: {json.dumps({'type': 'title', 'data': title})}\n\n"
            except Exception:
                pass

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# --- Title generation ---

@app.post("/api/conversations/{conv_id}/title")
async def gen_title(conv_id: int, user: dict = Depends(get_current_user)):
    title = await generate_title(conv_id)
    return {"title": title}
