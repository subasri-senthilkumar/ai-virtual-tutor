from langchain_core.tools import tool
from db import get_connection


@tool
def create_memory(key: str, value: str, user_id: int) -> str:
    """Store a piece of information about the user for future reference. Use this to remember user preferences, learning goals, feedback, or any important details the user shares. The key should be descriptive (e.g., 'preferred_language', 'learning_goal', 'name')."""
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO memories (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP",
            (user_id, key, value, value),
        )
        conn.commit()
        return f"Stored memory: {key} = {value}"
    finally:
        conn.close()


@tool
def get_memory(key: str, user_id: int) -> str:
    """Retrieve a stored memory about the user by key."""
    conn = get_connection()
    row = conn.execute("SELECT value FROM memories WHERE user_id = ? AND key = ?", (user_id, key)).fetchone()
    conn.close()
    if row:
        return row["value"]
    return f"No memory found for key: {key}"


@tool
def update_memory(key: str, value: str, user_id: int) -> str:
    """Update an existing memory about the user."""
    conn = get_connection()
    result = conn.execute(
        "UPDATE memories SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND key = ?",
        (value, user_id, key),
    )
    conn.commit()
    conn.close()
    if result.rowcount > 0:
        return f"Updated memory: {key} = {value}"
    return f"No memory found for key: {key}. Use create_memory instead."


@tool
def delete_memory(key: str, user_id: int) -> str:
    """Delete a stored memory about the user."""
    conn = get_connection()
    result = conn.execute("DELETE FROM memories WHERE user_id = ? AND key = ?", (user_id, key))
    conn.commit()
    conn.close()
    if result.rowcount > 0:
        return f"Deleted memory: {key}"
    return f"No memory found for key: {key}"


@tool
def list_memories(user_id: int) -> str:
    """List all stored memories about the user. Use this at the start of conversations to load user context."""
    conn = get_connection()
    rows = conn.execute("SELECT key, value FROM memories WHERE user_id = ?", (user_id,)).fetchall()
    conn.close()
    if not rows:
        return "No memories stored for this user."
    return "\n".join(f"- {r['key']}: {r['value']}" for r in rows)
