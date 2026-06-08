import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const roomName = url.searchParams.get("room") || "travlex-voice-room";
    const identity = url.searchParams.get("identity") || `user-${Math.random().toString(36).substring(7)}`;
    const name = url.searchParams.get("name") || "Traveler";

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      console.warn("LiveKit environment variables LIVEKIT_API_KEY or LIVEKIT_API_SECRET are missing.");
      // Fallback/Demo mode token so the app doesn't crash in preview if variables aren't defined
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured on the backend." },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "10m",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      serverUrl: serverUrl || "wss://your-livekit-server-url",
    });
  } catch (error: any) {
    console.error("LiveKit token generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate token" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomName = body.room || "travlex-voice-room";
    const identity = body.identity || `user-${Math.random().toString(36).substring(7)}`;
    const name = body.name || "Traveler";

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured on the backend." },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "10m",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      serverUrl: serverUrl || "wss://your-livekit-server-url",
    });
  } catch (error: any) {
    console.error("LiveKit token generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate token" }, { status: 500 });
  }
}
