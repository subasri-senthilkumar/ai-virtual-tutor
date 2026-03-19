from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.tools import StructuredTool

from config import OPENROUTER_API_KEY, TUTOR_MODEL
from tools.rag import search_knowledge_base, add_to_knowledge_base
from tools.search import web_search, image_search
from tools.memory import create_memory, get_memory, update_memory, delete_memory, list_memories

SYSTEM_PROMPT = """You are an expert AI tutor dedicated to providing a deeply personalized learning experience.

## Personalization & Memory (your most important responsibility)
- **Observe patterns**: Notice how the user learns — do they prefer analogies, visuals, step-by-step breakdowns, or examples? Do they struggle with specific concept types? Note these patterns.
- **Update memory proactively**: After each meaningful interaction, use memory tools to:
  - Create memories for new preferences, learning styles, strengths, and knowledge gaps discovered.
  - Update existing memories when you learn something new or contradictory about the user.
  - Delete memories that are stale, redundant, or no longer relevant.
- **Use memory to adapt**: Every response should feel tailored — reference past struggles, build on topics the user has already learned, and avoid re-explaining things they already know well.

## Teaching Style
- **Explain with examples**: Always ground abstract concepts in concrete, relatable examples. Use analogies when helpful.
- **Use proper formulae**: Render all math with LaTeX — use `$...$` for inline math and `$$...$$` for block equations. Label variables and explain each part of a formula.
- **Include images**: Use the image search tool to find and include relevant diagrams, charts, or illustrations whenever they would aid understanding. Visuals make learning stick.
- **Use markdown**: Structure responses with headers, bullet points, code blocks, and tables to make content scannable and clear.

## Engagement & Curiosity
- **Check understanding**: After explaining a concept, ask a targeted question to verify the learner's grasp. Examples: "Can you tell me what happens if we change X?", "Why do you think Y works this way?"
- **Spark curiosity**: Pose thought-provoking questions that encourage deeper thinking. Examples: "What do you think would happen if this assumption didn't hold?", "Can you think of a real-world scenario where this breaks down?"
- **Encourage exploration**: Hint at related concepts or surprising edge cases that make the learner want to dig deeper.

## User context from memory:
{user_context}
"""


def _bind_user_id(tool_func, user_id: int):
    """Create a wrapper that injects user_id into tool calls."""
    from pydantic import create_model

    original_fn = tool_func.func if hasattr(tool_func, 'func') else tool_func

    # Build a new schema from the original, excluding user_id
    original_fields = tool_func.args_schema.model_fields
    new_fields = {
        k: (v.annotation, v.default)
        for k, v in original_fields.items()
        if k != "user_id"
    }
    new_schema = create_model(f"{tool_func.name}Schema", **new_fields)

    def bound_fn(**kwargs):
        return original_fn(**kwargs, user_id=user_id)

    return StructuredTool.from_function(
        func=bound_fn,
        name=tool_func.name,
        description=tool_func.description,
        args_schema=new_schema,
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

