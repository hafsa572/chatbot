import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { searchPlaces, getPlaceDetails } from "@/lib/search";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: 
        "You are 'Travlex', a helpful and friendly Travel AI Assistant for Jammu & Kashmir Tourism. " +
        "Your mission is to guide visitors, including visually impaired or blind users, to discover beautiful places. " +
        "Because some users are visually impaired, make sure your answers are descriptive, structured, and easy to follow. " +
        "Always use the available tools to search the database when users ask about places, districts, activities, or recommendations, " +
        "and rely ONLY on facts from the database. Do not hallucinate place details or reviews. " +
        "When recommending list of places, keep it to a concise, clear list of up to 5 recommendations with basic metrics (rating, district, category, best season).",
      messages,
      tools: {
        searchTourismDatabase: tool({
          description: "Search for tourist spots in Jammu & Kashmir using search terms (keywords, district, vibe, activity, season).",
          parameters: z.object({
            query: z.string().describe("The search query or keyword (e.g. 'peaceful lake', 'Srinagar', 'skiing')."),
            category: z.string().optional().describe("Optional category filter (e.g. 'Lake', 'Temple', 'Hill Station', 'Garden', 'Buddhist pilgrimage', 'Muslim pilgrimage')."),
          }),
          execute: async ({ query, category }) => {
            const results = searchPlaces(query, category || "All", 5);
            return results;
          },
        }),
        getPlaceDetails: tool({
          description: "Retrieve comprehensive details, ratings, review snippets, and descriptions for a specific place name.",
          parameters: z.object({
            name: z.string().describe("The exact or partial name of the place (e.g. 'Dal Lake', 'Vaishno Devi Temple')."),
          }),
          execute: async ({ name }) => {
            const detail = getPlaceDetails(name);
            if (!detail) {
              return { error: `Place '${name}' not found in the database.` };
            }
            return detail;
          },
        }),
      },
      // Automatically execute tools when called by the model
      maxSteps: 5,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message || "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
