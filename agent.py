import asyncio
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

from livekit.agents import JobContext, WorkerOptions, cli, llm
from livekit.plugins import openai, silero

# Load local .env if present
load_dotenv(dotenv_path=Path(__file__).parent / ".dev.vars")
load_dotenv()

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
        # Sort by rating
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

class TravelAgentTools(llm.FunctionContext):
    @llm.ai_callable(description="Search the J&K tourism database for locations based on keywords, district, activities, vibe, or category.")
    def search_tourism_db(
        self,
        query: str = llm.TypeInfo(description="Search keyword or query"),
    ) -> str:
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

    # Configure Assistant
    fnc_ctx = TravelAgentTools()
    assistant = llm.VoiceAssistant(
        vad=silero.VAD.load(),
        stt=openai.STT(),
        llm=openai.LLM(
            model="gpt-4o-mini",
            instructions=(
                "You are 'Travlex', an AI Voice Travel Guide for Jammu & Kashmir Tourism. "
                "You are talking directly to a traveler. Some users might be visually impaired or blind, "
                "so speak clearly, expressively, and make your descriptions rich, vivid, and easy to visualize. "
                "Do not use markdown syntax in your speech, as it will be read literally or confuse the audio rendering. "
                "Always use the tool `search_tourism_db` when the user asks about spots, recommendation, or activities "
                "in J&K, and rely solely on facts returned from the tool. Greet the traveler warmly."
            )
        ),
        tts=openai.TTS(voice="alloy"),
        fnc_ctx=fnc_ctx,
    )

    assistant.start(ctx.room)
    
    # Greet the user when they join
    await assistant.say(
        "Welcome to Travlex! I am your voice travel assistant for Jammu and Kashmir. "
        "How can I help you plan your journey today?",
        allow_interruptions=True
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
