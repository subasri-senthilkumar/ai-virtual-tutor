from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.tools import StructuredTool

from config import OPENROUTER_API_KEY, TUTOR_MODEL
from tools.rag import search_knowledge_base, add_to_knowledge_base
from tools.search import web_search, image_search
from tools.memory import create_memory, get_memory, update_memory, delete_memory, list_memories

SYSTEM_PROMPT = """You are an expert AI tutor. Your goal is to help the user learn effectively.

Guidelines:
- Explain concepts clearly with examples
- Use markdown formatting with LaTeX for math (use $...$ for inline, $$...$$ for block)
- Include relevant images from search when they help understanding
- Adapt your teaching style based on user preferences stored in memory
- Proactively note user preferences, learning style, and feedback using memory tools
- When starting a new conversation, check user memories for context

User context:
{user_context}
"""


def _bind_user_id(tool_func, user_id: int):
    """Create a wrapper that injects user_id into tool calls."""
    original_fn = tool_func.func if hasattr(tool_func, 'func') else tool_func

    def bound_fn(**kwargs):
        return original_fn(**kwargs, user_id=user_id)

    return StructuredTool.from_function(
        func=bound_fn,
        name=tool_func.name,
        description=tool_func.description,
    )


def get_llm():
    return ChatOpenAI(
        model=TUTOR_MODEL,
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1",
        streaming=True,
        extra_body={"reasoning": {"effort": "high"}},
    )


def get_tools(user_id: int):
    user_tools = [
        search_knowledge_base,
        add_to_knowledge_base,
        create_memory,
        get_memory,
        update_memory,
        delete_memory,
        list_memories,
    ]
    bound = [_bind_user_id(t, user_id) for t in user_tools]
    bound.extend([web_search, image_search])
    return bound


def create_agent_for_user(user_id: int, user_context: str = "No stored preferences yet."):
    llm = get_llm()
    tools = get_tools(user_id)
    prompt = SYSTEM_PROMPT.format(user_context=user_context)
    return create_agent(llm, tools, system_prompt=prompt)

