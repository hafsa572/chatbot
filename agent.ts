import { defineAgent, voice, llm } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import dotenv from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: resolve(__dirname, ".env.local") });
dotenv.config({ path: resolve(__dirname, ".dev.vars") });

// ── Load J&K tourism dataset ────────────────────────────────────────
const placesJsonPath = resolve(__dirname, "src", "data", "places.json");
let placesData: any[] = [];
if (existsSync(placesJsonPath)) {
  placesData = JSON.parse(readFileSync(placesJsonPath, "utf-8"));
  console.log(`Loaded ${placesData.length} places from database.`);
} else {
  console.warn(`Warning: Database not found at ${placesJsonPath}`);
}

// ── Search helpers ──────────────────────────────────────────────────
function normalizeText(text: string): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchPlacesLocal(query: string, limit = 3): any[] {
  const queryNorm = normalizeText(query);
  const tokens = queryNorm.split(" ").filter((t) => t.length > 1);

  if (!tokens.length && !queryNorm) {
    return [...placesData]
      .sort(
        (a, b) =>
          (b.tripadvisor_rating || 0) - (a.tripadvisor_rating || 0) ||
          (b.tripadvisor_review_count || 0) - (a.tripadvisor_review_count || 0)
      )
      .slice(0, limit);
  }

  const scored: [any, number][] = [];
  for (const p of placesData) {
    let score = 0;
    const name = normalizeText(p.place_name || "");
    const district = normalizeText(p.district || "");
    const category = normalizeText(p.category || "");
    const tags = normalizeText(p.tags || "");
    const activities = normalizeText(p.activities || "");
    const vibe = normalizeText(p.vibe || "");
    const season = normalizeText(p.best_season || "");

    if (name && queryNorm && name.includes(queryNorm)) score += 15;
    if (district && queryNorm && district.includes(queryNorm)) score += 6;
    if (category && queryNorm && category.includes(queryNorm)) score += 8;

    for (const token of tokens) {
      if (name.includes(token)) score += 7;
      if (district.includes(token)) score += 3;
      if (category.includes(token)) score += 4;
      if (tags.includes(token)) score += 2;
      if (activities.includes(token)) score += 2;
      if (vibe.includes(token)) score += 1;
      if (season.includes(token)) score += 1;
    }

    const rating = p.tripadvisor_rating;
    if (rating != null) score += Number(rating);

    if (score > 0) scored.push([p, score]);
  }

  scored.sort((a, b) => b[1] - a[1]);
  return scored.slice(0, limit).map(([p]) => p);
}

// ── Build tool result text ──────────────────────────────────────────
function formatSearchResults(results: any[]): string {
  if (!results.length)
    return "No matching tourist spots found in the database. Please try other keywords.";

  return results
    .map((r, i) => {
      const name = r.place_name;
      const district = r.district;
      const category = r.category;
      const vibe = r.vibe;
      const activities = r.activities;
      const rating = r.tripadvisor_rating;
      const ratingText = rating ? `${rating} stars` : "no rating";
      const desc = r.tripadvisor_description || "A beautiful spot to visit.";
      return `${i + 1}. ${name} in ${district} district. It is a ${category} with a ${vibe} vibe. Activities include: ${activities}. Tripadvisor rating: ${ratingText}. Brief description: ${desc}`;
    })
    .join("\n\n");
}

// ── Define the tool using the SDK's tool() helper ───────────────────
const searchTourismDb = llm.tool({
  description:
    "Search the local tourism database for India tourism locations based on keywords, district, activities, vibe, or category.",
  parameters: {
    type: "object" as const,
    properties: {
      query: {
        type: "string" as const,
        description: "Search keyword or query",
      },
    },
    required: ["query"],
  },
  execute: async (args: { query: string }) => {
    console.log(`Voice Agent Tool Call: search_tourism_db for '${args.query}'`);
    const results = searchPlacesLocal(args.query, 3);
    return formatSearchResults(results);
  },
});

// ── Agent definition (LiveKit Agents Node.js SDK) ───────────────────
interface ProcessUserData {
  vad: silero.VAD;
}

export default defineAgent<ProcessUserData>({
  prewarm: async (proc) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx) => {
    console.log(`Connecting to room ${ctx.room.name}...`);
    await ctx.connect();
    console.log(
      `Connected to room ${ctx.room.name}. Waiting for participant to speak...`
    );

    // ── NVIDIA LLM (OpenAI-compatible endpoint) ───────────────────
    const nvidiaApiKey = process.env.NVIDIA_API_KEY;
    if (!nvidiaApiKey) {
      console.error("Error: NVIDIA_API_KEY environment variable is not set.");
      return;
    }

    const nvidiaLlm = new openai.LLM({
      model: "meta/llama-3.1-70b-instruct",
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: nvidiaApiKey,
    });

    // ── OpenAI STT & TTS ──────────────────────────────────────────
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error(
        "\n[ERROR] OPENAI_API_KEY is not set.\n" +
          "To run the voice agent, add a valid OpenAI API key (starting with 'sk-') " +
          "to your .env.local file.\n" +
          'Example: OPENAI_API_KEY="sk-proj-xxxx"\n'
      );
      return;
    }

    const stt = new openai.STT({ apiKey: openaiApiKey });
    const tts = new openai.TTS({ voice: "alloy", apiKey: openaiApiKey });

    // ── Voice agent ───────────────────────────────────────────────
    const agent = new voice.Agent({
      instructions:
        "You are 'Travlex', an AI Voice Travel Guide for India Tourism. " +
        "You are talking directly to a traveler. Some users might be visually impaired or blind, " +
        "so speak clearly, expressively, and make your descriptions rich, vivid, and easy to visualize. " +
        "Do not use markdown syntax in your speech, as it will be read literally or confuse the audio rendering. " +
        "You have a local database specifically for locations in the Jammu & Kashmir and Ladakh regions. " +
        "Always use the tool `search_tourism_db` when the user asks about spots, recommendation, or activities " +
        "in Jammu & Kashmir or Ladakh, and rely solely on facts returned from the tool. For other parts of India, " +
        "use your own knowledge base to provide descriptive guides. Greet the traveler warmly.",
      tools: {
        search_tourism_db: searchTourismDb,
      },
    });

    // ── Voice session setup ───────────────────────────────────────
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad,
      stt,
      llm: nvidiaLlm,
      tts,
    });

    await session.start({ agent, room: ctx.room });

    session.say(
      "Welcome to Travlex! I am your voice travel assistant for India. " +
        "How can I help you plan your journey today?",
      { allowInterruptions: true }
    );
  },
});
