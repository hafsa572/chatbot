"use client";

import { useState } from "react";
import { MyAssistant } from "@/components/MyAssistant";
import { MyVoiceAgent } from "@/components/MyVoiceAgent";
import { Compass, Volume2, MessageSquare, ShieldAlert } from "lucide-react";
import placesData from "@/data/places.json";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text");

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-400 p-2 rounded-xl text-white">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                TRAVLEX
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase">
                Jammu & Kashmir Travel Companion
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-slate-300 font-medium">
              Loaded: {placesData.length} Locations
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none"></div>
          <div className="max-w-2xl">
            <span className="text-xs text-emerald-400 font-bold tracking-widest uppercase mb-2 block">
              Inclusive Travel AI
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight mb-4">
              Explore Paradise with Voice & Text
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Travlex is a specialized AI travel companion for Jammu & Kashmir, configured with real-time text chat
              and live audio streams. This project is built specifically to assist visually impaired or blind users
              with descriptive, voice-first navigation guides.
            </p>
            
            {/* Screen Reader Assist */}
            <div className="flex items-center gap-3 p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs rounded-xl">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>
                <strong>Accessibility Tip:</strong> Switch to the <strong>Voice Guide</strong> tab for a screen-reader friendly voice conversation.
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-center">
          <button
            onClick={() => setActiveTab("text")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "text"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Switch to Text Chatbot Mode"
          >
            <MessageSquare className="w-4 h-4" />
            Text Chatbot
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "voice"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-label="Switch to Voice Guide Mode"
          >
            <Volume2 className="w-4 h-4" />
            Voice Guide
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="flex-1 flex min-h-[450px]">
          {activeTab === "text" ? (
            <div className="w-full h-[550px] animate-fade-in">
              <MyAssistant />
            </div>
          ) : (
            <div className="w-full min-h-[450px] animate-fade-in">
              <MyVoiceAgent />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Travlex. Deployed on Cloudflare Workers Runtime.</p>
          <div className="flex gap-4">
            <a href="https://developers.cloudflare.com/pages/" className="hover:text-slate-300">Cloudflare Pages</a>
            <span>•</span>
            <a href="https://assistant-ui.com/" className="hover:text-slate-300">Assistant-UI</a>
            <span>•</span>
            <a href="https://livekit.io/" className="hover:text-slate-300">LiveKit Realtime</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
