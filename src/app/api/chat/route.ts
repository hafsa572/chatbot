import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { searchPlaces, getPlaceDetails } from "@/lib/search";

export const runtime = "edge";

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
      model: nvidia("nvidia/llama-3.1-nemotron-70b-instruct"),
      system: 
        "You are 'Travlex', a helpful and friendly Travel AI Assistant for Jammu & Kashmir Tourism. " +
        "Your mission is to guide visitors, including visually impaired or blind users, to discover beautiful places. " +
        "Because some users are visually impaired, make sure your answers are descriptive, structured, and easy to follow. " +
        "Always use the available tools to search the database when users ask about places, districts, activities, or recommendations, " +
        "and rely ONLY on facts from the database. Do not hallucinate place details or reviews. " +
        "When recommending lists of places, keep it to a concise, clear list of up to 5 recommendations with basic metrics (rating, district, category, best season).",
      messages,
      tools: {
        searchTourismDatabase: tool({
          description: "Search for tourist spots in Jammu & Kashmir using search terms (keywords, district, vibe, activity, season).",
          parameters: z.object({
            query: z.string(),
            category: z.string().optional(),
          }),
          execute: async ({ query, category }: { query: string; category?: string }) => {
            const results = searchPlaces(query, category || "All", 5);
            return results;
          },
        } as any),
        getPlaceDetails: tool({
          description: "Retrieve comprehensive details, ratings, review snippets, and descriptions for a specific place name.",
          parameters: z.object({
            name: z.string(),
          }),
          execute: async ({ name }: { name: string }) => {
            const detail = getPlaceDetails(name);
            if (!detail) {
              return { error: `Place '${name}' not found in the database.` };
            }
            return detail;
          },
        } as any),
      },
      maxSteps: 5,
    } as any);

    return (result as any).toDataStreamResponse();
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message || "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
