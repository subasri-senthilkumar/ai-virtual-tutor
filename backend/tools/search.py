from langchain_core.tools import tool
from serpapi import GoogleSearch
from config import SERPAPI_KEY


@tool
def web_search(query: str) -> str:
    """Search the web for real-time information. Use this when the user asks about current events, facts you're unsure about, or needs up-to-date information."""
    search = GoogleSearch({"q": query, "api_key": SERPAPI_KEY, "num": 5})
    results = search.get_dict()
    organic = results.get("organic_results", [])
    if not organic:
        return "No search results found."
    output = []
    for r in organic[:5]:
        output.append(f"**{r.get('title', '')}**\n{r.get('snippet', '')}\nURL: {r.get('link', '')}")
    return "\n\n---\n\n".join(output)


@tool
def image_search(query: str) -> str:
    """Search for images on the web. Use this when the user needs visual references, diagrams, or images related to a topic. Returns image URLs that can be included in your response."""
    search = GoogleSearch({"q": query, "tbm": "isch", "api_key": SERPAPI_KEY, "num": 5})
    results = search.get_dict()
    images = results.get("images_results", [])
    if not images:
        return "No image results found."
    output = []
    for img in images[:5]:
        output.append(f"![{img.get('title', 'image')}]({img.get('original', img.get('thumbnail', ''))})")
    return "\n\n".join(output)
