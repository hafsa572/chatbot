import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, convertToModelMessages } from "ai";
import { z } from "zod";
import { searchPlaces, getPlaceDetails } from "@/lib/search";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "NVIDIA_API_KEY is not configured on the server." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nvidia = createOpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: apiKey,
    });

    const result = streamText({
      model: nvidia.chat("meta/llama-3.1-70b-instruct"),
      system: 
        "You are 'Travlex', a helpful and friendly Travel AI Assistant for India Tourism. " +
        "Your mission is to guide visitors, including visually impaired or blind users, to discover beautiful places across India. " +
        "Because some users are visually impaired, make sure your answers are descriptive, structured, and easy to follow. " +
        "You have a local database of tourist spots specifically for the Jammu & Kashmir and Ladakh regions. " +
        "Always use the available tools to search this database when users ask about places in J&K/Ladakh, " +
        "and rely ONLY on facts from the database for those regions. For all other regions of India, use your own " +
        "general knowledge to recommend and describe places. Do not make up place details or reviews. " +
        "When recommending lists of places, keep it to a concise, clear list of up to 5 recommendations with basic metrics (rating, state, district, category, best season).",
      messages: convertToModelMessages(messages),
      tools: {
        searchTourismDatabase: tool({
          description: "Search for tourist spots in Jammu & Kashmir / Ladakh using search terms (keywords, district, vibe, activity, season).",
          parameters: z.object({
            query: z.string().optional(),
            keywords: z.string().optional(),
            category: z.string().optional(),
          }),
          execute: async ({ query, keywords, category }: { query?: string; keywords?: string; category?: string }) => {
            const searchQuery = query || keywords || "";
            const results = searchPlaces(searchQuery, category || "All", 5);
            return results;
          },
        } as any),
        getPlaceDetails: tool({
          description: "Retrieve comprehensive details, ratings, review snippets, and descriptions for a specific place name in Jammu & Kashmir / Ladakh.",
          parameters: z.object({
            name: z.string().optional(),
            place_name: z.string().optional(),
            place: z.string().optional(),
          }),
          execute: async ({ name, place_name, place }: { name?: string; place_name?: string; place?: string }) => {
            const searchName = name || place_name || place || "";
            const detail = getPlaceDetails(searchName);
            if (!detail) {
              return { error: `Place '${searchName}' not found in the database.` };
            }
            return detail;
          },
        } as any),
      },
      maxSteps: 5,
    } as any);

    return (result as any).toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message || "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
