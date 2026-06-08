import asyncio
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

from livekit.agents import JobContext, WorkerOptions, cli, llm, voice
from livekit.plugins import openai, silero

# Load local environment files and override parent shell variables
load_dotenv(dotenv_path=Path(__file__).parent / ".dev.vars", override=True)
load_dotenv(override=True)

# Load J&K tourism dataset
places_json_path = Path(__file__).parent / "src" / "data" / "places.json"
places_data = []
if places_json_path.exists():
    with open(places_json_path, "r", encoding="utf-8") as f:
        places_data = json.load(f)
else:
    print(f"Warning: Database not found at {places_json_path}")

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def search_places_python(query: str, limit: int = 3) -> list:
    query_norm = normalize_text(query)
    tokens = [t for t in query_norm.split() if len(t) > 1]
    
    if not tokens and not query_norm:
        return sorted(
            places_data,
            key=lambda p: (p.get("tripadvisor_rating") or 0.0, p.get("tripadvisor_review_count") or 0),
            reverse=True
        )[:limit]
        
    scored_places = []
    for p in places_data:
        score = 0.0
        name = normalize_text(p.get("place_name", ""))
        district = normalize_text(p.get("district", ""))
        category = normalize_text(p.get("category", ""))
        tags = normalize_text(p.get("tags", ""))
        activities = normalize_text(p.get("activities", ""))
        vibe = normalize_text(p.get("vibe", ""))
        season = normalize_text(p.get("best_season", ""))
        location = normalize_text(p.get("tripadvisor_location", ""))
        
        if name and query_norm in name:
            score += 15.0
        if district and query_norm in district:
            score += 6.0
        if category and query_norm in category:
            score += 8.0
            
        for token in tokens:
            if token in name:
                score += 7.0
            if token in district:
                score += 3.0
            if token in category:
                score += 4.0
            if token in tags:
                score += 2.0
            if token in activities:
                score += 2.0
            if token in vibe:
                score += 1.0
            if token in season:
                score += 1.0
                
        # Factor rating
        rating = p.get("tripadvisor_rating")
        if rating is not None:
            score += float(rating) * 1.0
            
        if score > 0:
            scored_places.append((p, score))
            
    scored_places.sort(key=lambda item: item[1], reverse=True)
    return [item[0] for item in scored_places[:limit]]

@llm.function_tool
def search_tourism_db(
    query: str,
) -> str:
    """Search the local tourism database for India tourism locations based on keywords, district, activities, vibe, or category.

    Args:
        query: Search keyword or query
    """
    print(f"Voice Agent Tool Call: search_tourism_db for '{query}'")
    results = search_places_python(query, limit=3)
    if not results:
        return "No matching tourist spots found in the database. Please try other keywords."
    
    response_parts = []
    for i, r in enumerate(results, start=1):
        name = r.get("place_name")
        district = r.get("district")
        category = r.get("category")
        vibe = r.get("vibe")
        activities = r.get("activities")
        rating = r.get("tripadvisor_rating")
        rating_text = f"{rating} stars" if rating else "no rating"
        desc = r.get("tripadvisor_description") or "A beautiful spot to visit."
        
        response_parts.append(
            f"{i}. {name} in {district} district. It is a {category} with a {vibe} vibe. "
            f"Activities include: {activities}. Tripadvisor rating: {rating_text}. "
            f"Brief description: {desc}"
        )
        
    return "\n\n".join(response_parts)

async def entrypoint(ctx: JobContext):
    print(f"Connecting to room {ctx.room.name}...")
    await ctx.connect()
    print(f"Connected to room {ctx.room.name}. Waiting for participant to speak...")
    
    # Initialize NVIDIA client for LLM
    nvidia_api_key = os.environ.get("NVIDIA_API_KEY")
    if not nvidia_api_key:
        print("Error: NVIDIA_API_KEY environment variable is not set.")
        return
        
    nvidia_llm = openai.LLM(
        model="meta/llama-3.1-70b-instruct",
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=nvidia_api_key,
    )

    # Clear proxy variables from os.environ to prevent the OpenAI client from using them
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if openai_api_key and openai_api_key.startswith("ABSK"):
        print("Warning: Detected AWS Bedrock proxy key in shell environment. Ignoring for STT/TTS.")
        openai_api_key = None
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]

    global_base_url = os.environ.get("OPENAI_BASE_URL")
    if global_base_url and "api.openai.com" not in global_base_url:
        print(f"Warning: Detected non-OpenAI global base URL ({global_base_url}). Resetting for STT/TTS.")
        if "OPENAI_BASE_URL" in os.environ:
            del os.environ["OPENAI_BASE_URL"]

    # Validate that we have an OpenAI API key before starting
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError(
            "\n\n[ERROR] OPENAI_API_KEY is not set or was ignored because it was a proxy key.\n"
            "To run the local voice agent, you MUST define a valid OpenAI API key starting with 'sk-' "
            "in your `.env.local` or `.dev.vars` file.\n"
            "Example:\n"
            "OPENAI_API_KEY=\"sk-proj-xxxx\"\n"
        )

    stt_kwargs = {"api_key": openai_api_key}
    tts_kwargs = {"api_key": openai_api_key}

    # Initialize AgentSession
    session = voice.AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(**stt_kwargs),
        llm=nvidia_llm,
        tts=openai.TTS(voice="alloy", **tts_kwargs),
        tools=[search_tourism_db],
    )

    # Initialize Agent options
    agent = voice.Agent(
        instructions=(
            "You are 'Travlex', an AI Voice Travel Guide for India Tourism. "
            "You are talking directly to a traveler. Some users might be visually impaired or blind, "
            "so speak clearly, expressively, and make your descriptions rich, vivid, and easy to visualize. "
            "Do not use markdown syntax in your speech, as it will be read literally or confuse the audio rendering. "
            "You have a local database specifically for locations in the Jammu & Kashmir and Ladakh regions. "
            "Always use the tool `search_tourism_db` when the user asks about spots, recommendation, or activities "
            "in Jammu & Kashmir or Ladakh, and rely solely on facts returned from the tool. For other parts of India, "
            "use your own knowledge base to provide descriptive guides. Greet the traveler warmly."
        )
    )

    await session.start(agent=agent, room=ctx.room)
    
    await session.say(
        "Welcome to Travlex! I am your voice travel assistant for India. "
        "How can I help you plan your journey today?",
        allow_interruptions=True
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
