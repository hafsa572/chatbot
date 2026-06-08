"use client";

import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
  useLocalParticipant,
} from "@livekit/components-react";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";

export function MyVoiceAgent() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startVoiceSession = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "travlex-voice-room",
          identity: `traveler-${Math.random().toString(36).substring(7)}`,
          name: "Voice Traveler",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate connection token.");
      }

      const { token, serverUrl } = await res.json();
      setToken(token);
      setServerUrl(serverUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not connect. Verify server configuration.");
      setIsConnecting(false);
    }
  };

  const endVoiceSession = () => {
    setToken(null);
    setServerUrl(null);
    setIsConnecting(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-6 justify-between min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Voice Guide (Audio Agent)</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Talk directly to Travlex. Designed for blind and visually impaired travelers to hear and speak travel queries.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-6">
        {error && (
          <div 
            className="mb-4 p-3 bg-rose-950/50 border border-rose-800 text-rose-200 text-sm rounded-lg max-w-sm text-center"
            role="alert"
          >
            {error}
          </div>
        )}

        {token && serverUrl ? (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={false}
            onDisconnected={endVoiceSession}
            className="flex flex-col items-center gap-6 w-full"
          >
            <VoiceAgentActiveView onDisconnect={endVoiceSession} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : (
          <button
            onClick={startVoiceSession}
            disabled={isConnecting}
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 border-4 transition-all duration-300 shadow-lg ${
              isConnecting
                ? "bg-slate-800 border-slate-700 cursor-not-allowed animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 hover:scale-105 active:scale-95"
            }`}
            aria-label={isConnecting ? "Connecting to voice guide" : "Start voice guide"}
            aria-live="polite"
          >
            <Volume2 className="w-16 h-16 text-white" />
            <span className="text-sm font-bold tracking-wider text-white">
              {isConnecting ? "CONNECTING..." : "START GUIDE"}
            </span>
          </button>
        )}
      </div>

      <div className="text-center text-xs text-slate-500">
        {!token && "Click 'START GUIDE' and grant microphone permissions to talk."}
        {token && "Speaking is enabled. You can mute yourself or click disconnect at any time."}
      </div>
    </div>
  );
}

function VoiceAgentActiveView({ onDisconnect }: { onDisconnect: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(localParticipant?.isMicrophoneEnabled === false);

  const toggleMute = () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      localParticipant.setMicrophoneEnabled(!enabled);
      setIsMuted(enabled);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted, localParticipant]);

  // Translate agent state to user-friendly accessible screen reader texts
  const getAccessibilityStateText = () => {
    switch (state) {
      case "speaking":
        return "Travlex is speaking.";
      case "listening":
        return "Travlex is listening. You can speak now.";
      case "thinking":
        return "Travlex is processing your request.";
      default:
        return "Connected to voice room.";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div 
        className="text-lg font-medium text-slate-300 animate-pulse"
        aria-live="assertive"
        role="status"
      >
        {getAccessibilityStateText()}
      </div>

      <div className="w-full h-24 bg-slate-950 rounded-xl flex items-center justify-center p-4 border border-slate-800">
        {audioTrack ? (
          <BarVisualizer 
            trackRef={audioTrack} 
            barCount={9} 
            className="h-16 w-full text-emerald-500"
          />
        ) : (
          <div className="text-sm text-slate-500">Waiting for agent audio...</div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full border-2 transition-all ${
            isMuted
              ? "bg-rose-950 text-rose-400 border-rose-800 hover:bg-rose-900"
              : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
          }`}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={onDisconnect}
          className="p-4 rounded-full bg-rose-600 text-white border-2 border-rose-400 hover:bg-rose-500 transition-all"
          aria-label="Disconnect voice guide"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
      
      <p className="text-xs text-slate-400">
        Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Spacebar</kbd> (when focused) to toggle mute.
      </p>
    </div>
  );
}
