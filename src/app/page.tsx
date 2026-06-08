"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { MyAssistant } from "@/components/MyAssistant";
import { MyVoiceAgent } from "@/components/MyVoiceAgent";
import { Compass, Plus, Trash2, MessageSquare, Volume2, Sparkles, ShieldAlert, Menu } from "lucide-react";
import placesData from "@/data/places.json";

interface ChatThread {
  id: string;
  title: string;
  messages: any[];
}

export default function Home() {
  const [activeMode, setActiveMode] = useState<"text" | "voice" | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize chat hook
  const chat = useChat({
    api: "/api/chat",
  } as any);

  // Load state on mount
  useEffect(() => {
    const savedThreads = localStorage.getItem("travlex_threads");
    const savedCurrentId = localStorage.getItem("travlex_current_thread_id");
    const savedMode = localStorage.getItem("travlex_active_mode") as "text" | "voice";

    const initialThreads = savedThreads 
      ? JSON.parse(savedThreads) 
      : [{ id: "default", title: "New Conversation", messages: [] }];
    
    const initialCurrentId = savedCurrentId || "default";
    const initialMode = savedMode || "text";

    setThreads(initialThreads);
    setCurrentThreadId(initialCurrentId);
    setActiveMode(initialMode);
    
    // Load initial thread messages into useChat hook
    const activeThread = initialThreads.find((t: ChatThread) => t.id === initialCurrentId);
    if (activeThread && activeThread.messages.length > 0) {
      chat.setMessages(activeThread.messages);
    }
    
    setIsMounted(true);
  }, []);

  // Save threads to localStorage on change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("travlex_threads", JSON.stringify(threads));
    }
  }, [threads, isMounted]);

  // Save active mode to localStorage
  useEffect(() => {
    if (isMounted && activeMode) {
      localStorage.setItem("travlex_active_mode", activeMode);
    }
  }, [activeMode, isMounted]);

  // Save current thread ID to localStorage
  useEffect(() => {
    if (isMounted && currentThreadId) {
      localStorage.setItem("travlex_current_thread_id", currentThreadId);
    }
  }, [currentThreadId, isMounted]);

  // Sync useChat messages to the active thread state
  useEffect(() => {
    if (isMounted && chat.messages.length > 0 && currentThreadId) {
      setThreads(prev => prev.map(t => {
        if (t.id === currentThreadId) {
          const firstMsg = chat.messages[0] as any;
          const title = t.title === "New Conversation" && firstMsg?.content
            ? firstMsg.content.substring(0, 24) + (firstMsg.content.length > 24 ? "..." : "")
            : t.title;
          return { ...t, messages: chat.messages, title };
        }
        return t;
      }));
    }
  }, [chat.messages, currentThreadId, isMounted]);

  // Switch thread function
  const handleSwitchThread = (threadId: string) => {
    if (threadId === currentThreadId) return;

    // 1. Save current messages to the old thread
    setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: chat.messages } : t));
    
    // 2. Switch ID
    setCurrentThreadId(threadId);
    
    // 3. Load target thread messages
    const target = threads.find(t => t.id === threadId);
    if (target) {
      chat.setMessages(target.messages);
    } else {
      chat.setMessages([]);
    }
  };

  // Create new thread function
  const handleCreateNewThread = () => {
    // 1. Save current messages
    setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: chat.messages } : t));

    // 2. Create new thread
    const newId = `thread-${Math.random().toString(36).substring(7)}`;
    const newThread: ChatThread = {
      id: newId,
      title: "New Conversation",
      messages: [],
    };

    setThreads(prev => [newThread, ...prev]);
    setCurrentThreadId(newId);
    chat.setMessages([]);
  };

  // Delete thread function
  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent switching to deleted thread

    const filtered = threads.filter(t => t.id !== threadId);
    
    // If no threads left, create a default one
    if (filtered.length === 0) {
      const defaultThread = { id: "default", title: "New Conversation", messages: [] };
      setThreads([defaultThread]);
      setCurrentThreadId("default");
      chat.setMessages([]);
      return;
    }

    setThreads(filtered);

    // If we deleted the active thread, switch to the first available one
    if (threadId === currentThreadId) {
      const fallbackThread = filtered[0];
      setCurrentThreadId(fallbackThread.id);
      chat.setMessages(fallbackThread.messages);
    }
  };

  if (!isMounted || !activeMode) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono text-xs">LOADING...</div>;
  }

  return (
    <div className="flex h-screen w-screen bg-black font-sans text-neutral-100 selection:bg-neutral-800 selection:text-white overflow-hidden">
      
      {/* Collapsible Left Sidebar */}
      <aside className={`border-r border-neutral-900 bg-neutral-950 flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out ${
        sidebarOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden border-r-0"
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-neutral-900 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border border-neutral-800 p-2 rounded-lg bg-black text-white">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-md font-bold tracking-tight text-white font-mono">TRAVLEX</h1>
                <p className="text-[8px] text-neutral-500 tracking-widest font-mono uppercase">India Travel Companion</p>
              </div>
            </div>
            
            {/* Collapse button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-neutral-500 font-mono">
            <span>Locations: {placesData.length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500"></span>
            <span>Cloudflare Edge</span>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-6 py-4">
          <button
            onClick={handleCreateNewThread}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-neutral-800 bg-black text-xs font-mono font-semibold text-white hover:bg-neutral-900 transition-all active:scale-98 cursor-pointer"
            aria-label="Create a new conversation"
          >
            <Plus className="w-4 h-4" />
            NEW CHAT
          </button>
        </div>

        {/* Scrollable Threads List */}
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1 pb-4">
          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest px-2 mb-2 block">Conversations</span>
          {threads.map((thread) => {
            const isActive = thread.id === currentThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => handleSwitchThread(thread.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs truncate font-mono">{thread.title}</span>
                </div>
                
                <button
                  onClick={(e) => handleDeleteThread(thread.id, e)}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-800 transition-all ${
                    isActive ? "hover:bg-neutral-200 text-black" : "text-neutral-500 hover:text-white"
                  } cursor-pointer`}
                  aria-label={`Delete thread: ${thread.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Mode Switcher Button at the Bottom */}
        <div className="p-6 border-t border-neutral-900 bg-black">
          <button
            onClick={() => setActiveMode(activeMode === "text" ? "voice" : "text")}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-white text-black text-xs font-mono font-bold hover:bg-black hover:text-white border border-white transition-all active:scale-98 cursor-pointer"
            aria-label={activeMode === "text" ? "Switch to Voice Guide" : "Switch to Text Assistant"}
          >
            {activeMode === "text" ? (
              <>
                <Volume2 className="w-4 h-4" />
                ACTIVATE VOICE
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                ACTIVATE CHAT
              </>
            )}
          </button>
        </div>

      </aside>

      {/* Main Content Workspace - Full Screen */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-black">
        {activeMode === "text" ? (
          <div className="w-full h-full flex flex-col overflow-hidden">
            <MyAssistant
              chat={chat}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              activeMode={activeMode}
              setActiveMode={setActiveMode}
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col overflow-hidden">
            <MyVoiceAgent
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              activeMode={activeMode}
              setActiveMode={setActiveMode}
            />
          </div>
        )}
      </main>

    </div>
  );
}
