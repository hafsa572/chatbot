import { NextRequest, NextResponse } from "next/server";

async function signJwt(
  payload: Record<string, any>,
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  
  const base64UrlEncode = (input: string | Uint8Array): string => {
    let bytes: Uint8Array;
    if (typeof input === "string") {
      bytes = new TextEncoder().encode(input);
    } else {
      bytes = input;
    }
    let binString = "";
    for (let i = 0; i < bytes.length; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    return btoa(binString)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };

  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;

  const secretBytes = new TextEncoder().encode(secret);
  const signingInputBytes = new TextEncoder().encode(signingInput);

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, signingInputBytes);
  const signaturePart = base64UrlEncode(new Uint8Array(signatureBytes));

  return `${signingInput}.${signaturePart}`;
}

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
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured on the backend." },
        { status: 500 }
      );
    }

    const payload = {
      iss: apiKey,
      sub: identity,
      name: name,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      },
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    const token = await signJwt(payload, apiSecret);

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
        { error: "LiveKit credentials are not configured on the backend." },
        { status: 500 }
      );
    }

    const payload = {
      iss: apiKey,
      sub: identity,
      name: name,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      },
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    const token = await signJwt(payload, apiSecret);

    return NextResponse.json({
      token,
      serverUrl: serverUrl || "wss://your-livekit-server-url",
    });
  } catch (error: any) {
    console.error("LiveKit token generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate token" }, { status: 500 });
  }
}
