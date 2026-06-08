"use client";

import { useState } from "react";
import { MyAssistant } from "@/components/MyAssistant";
import { MyVoiceAgent } from "@/components/MyVoiceAgent";
import { Compass, Volume2, MessageSquare, ShieldAlert, Sparkles } from "lucide-react";
import placesData from "@/data/places.json";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text");

  return (
    <div className="flex flex-col min-h-screen bg-black font-sans text-neutral-100 selection:bg-neutral-800 selection:text-white">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="border border-neutral-800 p-2 rounded-lg bg-neutral-950 text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                TRAVLEX
              </h1>
              <p className="text-[9px] text-neutral-500 tracking-widest font-mono uppercase">
                India Travel Assistant
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono px-3 py-1 bg-neutral-950 rounded-full border border-neutral-900 text-neutral-400">
              Database: {placesData.length} Locations
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col gap-10">
        
        {/* Landing / Hero Section */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-900 bg-neutral-950 w-fit animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Inclusive Design
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-light text-white tracking-tight leading-[1.1] animate-fade-in">
            Experience India. <br />
            <span className="font-semibold text-neutral-400">Described in detail.</span>
          </h2>
          
          <p className="text-neutral-400 text-base leading-relaxed animate-fade-in">
            Travlex is a clean, minimal travel AI agent for India. Designed for blind, visually impaired, and sighted travelers alike, it integrates real-time conversation and audio streams to deliver rich, descriptive tourism guidance.
          </p>

          {/* Accessibility Notice */}
          <div className="flex gap-4 p-4 border border-neutral-900 bg-neutral-950 rounded-xl max-w-2xl animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-white">Accessibility Standard</span>
              <span className="text-xs text-neutral-400 leading-normal">
                Optimize your workflow by toggling the <strong>Voice Guide</strong>. This initiates a hands-free, two-way audio session optimized for screen readers and speech synthesis.
              </span>
            </div>
          </div>
        </section>

        {/* Workspace Dashboard */}
        <section className="flex flex-col gap-6 border-t border-neutral-900 pt-10">
          
          {/* Tab Switcher */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white font-mono">Workspace</h3>
              <p className="text-xs text-neutral-500">Toggle between text interface or real-time voice guide</p>
            </div>
            
            <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-900">
              <button
                onClick={() => setActiveTab("text")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono transition-all ${
                  activeTab === "text"
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                aria-label="Switch to Text Assistant"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Text Chatbot
              </button>
              <button
                onClick={() => setActiveTab("voice")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono transition-all ${
                  activeTab === "voice"
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                aria-label="Switch to Voice Guide"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Voice Guide
              </button>
            </div>
          </div>

          {/* Interactive Workspace Panel */}
          <div className="flex-1 min-h-[500px] border border-neutral-900 rounded-2xl bg-neutral-950/40 overflow-hidden">
            {activeTab === "text" ? (
              <div className="w-full h-[550px] animate-fade-in">
                <MyAssistant />
              </div>
            ) : (
              <div className="w-full h-[550px] animate-fade-in">
                <MyVoiceAgent />
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-black py-8 text-center text-xs text-neutral-600">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px]">
          <p>© {new Date().getFullYear()} Travlex. Deployed on Cloudflare Worker Runtime.</p>
          <div className="flex gap-4">
            <a href="https://developers.cloudflare.com/pages/" className="hover:text-neutral-400 transition-colors">Cloudflare Pages</a>
            <span>•</span>
            <a href="https://assistant-ui.com/" className="hover:text-neutral-400 transition-colors">Assistant-UI</a>
            <span>•</span>
            <a href="https://livekit.io/" className="hover:text-neutral-400 transition-colors">LiveKit Realtime</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
