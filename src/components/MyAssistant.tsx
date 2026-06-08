"use client";

import { useChat } from "@ai-sdk/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

export function MyAssistant() {
  const chat = useChat({
    api: "/api/chat",
  } as any);
  const runtime = useChatRuntime(chat);

  return (
    <div className="flex flex-col h-full w-full bg-black text-neutral-100 rounded-2xl overflow-hidden border border-neutral-900 shadow-2xl">
      <div className="bg-neutral-950 border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Text Assistant</h2>
          <p className="text-[11px] text-neutral-500">Ask about tourist places, district details, and activities in India</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border border-white bg-black animate-pulse"></span>
          <span className="text-[10px] text-neutral-400 font-mono">Llama-3.1 Active</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}
