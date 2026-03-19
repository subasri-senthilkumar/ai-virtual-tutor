import chromadb
from langchain_core.tools import tool

_client = chromadb.Client()


def _get_collection(user_id: int):
    return _client.get_or_create_collection(name=f"user_{user_id}")


@tool
def search_knowledge_base(query: str, user_id: int) -> str:
    """Search the user's uploaded knowledge base for relevant information. Use this when the user asks about topics that may be in their uploaded documents."""
    collection = _get_collection(user_id)
    if collection.count() == 0:
        return "Knowledge base is empty. No documents have been uploaded yet."
    results = collection.query(query_texts=[query], n_results=5)
    if not results["documents"][0]:
        return "No relevant results found in the knowledge base."
    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        dist = results["distances"][0][i] if results.get("distances") else ""
        chunks.append(f"[{i+1}] {doc}")
    return "\n\n".join(chunks)


@tool
def add_to_knowledge_base(text: str, user_id: int) -> str:
    """Add text content to the user's knowledge base for future retrieval. Use this when the user uploads a document or asks you to remember learning material."""
    collection = _get_collection(user_id)
    doc_id = f"doc_{collection.count()}"
    # Split into chunks of ~500 chars for better retrieval
    chunk_size = 500
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    ids = [f"{doc_id}_chunk_{j}" for j in range(len(chunks))]
    collection.add(documents=chunks, ids=ids)
    return f"Added {len(chunks)} chunk(s) to knowledge base."
