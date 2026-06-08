"use client";

import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

export function MyAssistant() {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Travlex Text Assistant</h2>
          <p className="text-xs text-slate-400">Ask questions about locations, districts, categories, and activities</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-slate-400 font-medium">OpenAI Active</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-2">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread 
            welcome={{
              message: "Hi! I'm Travlex. I can answer questions about tourist spots in Jammu & Kashmir. What kind of place would you like to explore today?"
            }}
          />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}
