"use client";

import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { Menu, Volume2 } from "lucide-react";

interface MyAssistantProps {
  chat: any;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeMode: "text" | "voice";
  setActiveMode: (mode: "text" | "voice") => void;
}

export function MyAssistant({
  chat,
  sidebarOpen,
  setSidebarOpen,
  activeMode,
  setActiveMode,
}: MyAssistantProps) {
  const runtime = useChatRuntime(chat);

  return (
    <div className="flex flex-col h-full w-full bg-black text-neutral-100 overflow-hidden">
      <div className="bg-neutral-950 border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all cursor-pointer mr-1"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Text Assistant</h2>
            <p className="text-[11px] text-neutral-500">Ask about tourist places, district details, and activities in India</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveMode("voice")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-[11px] font-mono text-neutral-200 hover:text-white transition-all cursor-pointer"
            aria-label="Switch to Voice Guide"
          >
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            VOICE MODE
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-black animate-pulse"></span>
            <span className="text-[10px] text-neutral-400 font-mono">Llama-3.1 Active</span>
          </div>
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
