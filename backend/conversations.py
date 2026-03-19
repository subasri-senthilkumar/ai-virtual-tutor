import httpx
from db import get_connection
from config import OPENROUTER_API_KEY, TITLE_MODEL


def create_conversation(user_id: int) -> int:
    conn = get_connection()
    cursor = conn.execute("INSERT INTO conversations (user_id) VALUES (?)", (user_id,))
    conn.commit()
    conv_id = cursor.lastrowid
    conn.close()
    return conv_id


def get_conversations(user_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_messages(conversation_id: int, user_id: int) -> list[dict]:
    conn = get_connection()
    # Verify ownership
    conv = conn.execute(
        "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user_id),
    ).fetchone()
    if not conv:
        conn.close()
        return []
    rows = conn.execute(
        "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at",
        (conversation_id,),
    ).fetchall()
    messages = []
    for r in rows:
        msg = dict(r)
        # Fetch attachments for this message
        att_rows = conn.execute(
            "SELECT filename, file_type, extracted_text FROM message_attachments WHERE message_id = ?",
            (r["id"],),
        ).fetchall()
        msg["attachments"] = [dict(a) for a in att_rows]
        messages.append(msg)
    conn.close()
    return messages


def delete_conversation(conversation_id: int, user_id: int):
    conn = get_connection()
    conv = conn.execute(
        "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user_id),
    ).fetchone()
    if not conv:
        conn.close()
        return
    # Delete attachments, messages, then conversation
    msg_ids = conn.execute(
        "SELECT id FROM messages WHERE conversation_id = ?", (conversation_id,)
    ).fetchall()
    for m in msg_ids:
        conn.execute("DELETE FROM message_attachments WHERE message_id = ?", (m["id"],))
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.commit()
    conn.close()

def save_message(conversation_id: int, role: str, content: str) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        (conversation_id, role, content),
    )
    conn.commit()
    msg_id = cursor.lastrowid
    conn.close()
    return msg_id


def save_attachments(message_id: int, attachments: list[dict]):
    """Save file attachments. Each dict: {filename, file_type, extracted_text}."""
    if not attachments:
        return
    conn = get_connection()
    conn.executemany(
        "INSERT INTO message_attachments (message_id, filename, file_type, extracted_text) VALUES (?, ?, ?, ?)",
        [(message_id, a["filename"], a["file_type"], a["extracted_text"]) for a in attachments],
    )
    conn.commit()
    conn.close()


async def generate_title(conversation_id: int):
    conn = get_connection()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at LIMIT 4",
        (conversation_id,),
    ).fetchall()
    conn.close()
    if not rows:
        return

    messages_text = "\n".join(f"{r['role']}: {r['content'][:200]}" for r in rows)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
            json={
                "model": TITLE_MODEL,
                "messages": [
                    {"role": "user", "content": f"Generate a very short title (max 6 words) for this conversation. Return only the title, nothing else.\n\n{messages_text}"}
                ],
            },
        )
        resp.raise_for_status()
        title = resp.json()["choices"][0]["message"]["content"].strip().strip('"')

    conn = get_connection()
    conn.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))
    conn.commit()
    conn.close()
    return title
