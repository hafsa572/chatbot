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
    <div className="flex flex-col h-full w-full bg-black text-neutral-100 rounded-2xl overflow-hidden border border-neutral-900 shadow-2xl p-6 justify-between min-h-[400px]">
      <div className="text-center">
        <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-2">Voice Guide (Audio Agent)</h2>
        <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
          Speak directly to Travlex. Designed for blind and visually impaired travelers to hear and speak travel queries hands-free.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-6">
        {error && (
          <div 
            className="mb-4 p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-lg max-w-sm text-center"
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
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 border transition-all duration-300 ${
              isConnecting
                ? "bg-neutral-950 border-neutral-900 cursor-not-allowed animate-pulse text-neutral-500"
                : "bg-white text-black border-white hover:bg-black hover:text-white hover:border-neutral-800 hover:scale-105 active:scale-95"
            }`}
            aria-label={isConnecting ? "Connecting to voice guide" : "Start voice guide"}
            aria-live="polite"
          >
            <Volume2 className="w-12 h-12" />
            <span className="text-[10px] font-mono font-bold tracking-wider">
              {isConnecting ? "CONNECTING..." : "START GUIDE"}
            </span>
          </button>
        )}
      </div>

      <div className="text-center text-[10px] font-mono text-neutral-600">
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
        className="text-sm font-semibold tracking-wide text-neutral-300 animate-pulse font-mono uppercase"
        aria-live="assertive"
        role="status"
      >
        {getAccessibilityStateText()}
      </div>

      <div className="w-full h-24 bg-neutral-950 rounded-xl flex items-center justify-center p-4 border border-neutral-900">
        {audioTrack ? (
          <BarVisualizer 
            trackRef={audioTrack} 
            barCount={11} 
            className="h-14 w-full text-white"
          />
        ) : (
          <div className="text-xs text-neutral-600 font-mono">Waiting for agent audio...</div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full border transition-all ${
            isMuted
              ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800"
              : "bg-white text-black border-white hover:bg-black hover:text-white hover:border-neutral-800"
          }`}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onDisconnect}
          className="p-4 rounded-full bg-neutral-900 text-white border border-neutral-800 hover:bg-white hover:text-black hover:border-white transition-all"
          aria-label="Disconnect voice guide"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
      
      <p className="text-[10px] font-mono text-neutral-600">
        Tip: Press <kbd className="px-1.5 py-0.5 bg-neutral-950 rounded border border-neutral-900">Spacebar</kbd> to toggle mute.
      </p>
    </div>
  );
}
