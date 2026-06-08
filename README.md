# Travlex: Jammu & Kashmir Travel AI Assistant (Next.js + LiveKit Voice Agent)

Travlex is a state-of-the-art travel AI chatbot and voice agent built specifically for J&K Tourism. It features a rich text-based interface and a real-time voice guidance interface designed to be fully accessible for blind and visually impaired users.

The project is split into two components:
1. **Next.js Full-Stack App**: Deployed on Cloudflare Pages/Workers using `@opennextjs/cloudflare`. It hosts the chat UI, the token endpoint, and the OpenAI-integrated chat API.
2. **Python LiveKit Voice Agent**: A persistent voice assistant script (`agent.py`) that runs locally or on a VPS/fly.io. It joins the LiveKit audio room, listens to the user, queries the J&K tourism database, and speaks back using OpenAI's voice models.

---

## Technical Stack
- **Framework**: Next.js 16 (App Router)
- **Deployment Platform**: Cloudflare Pages / Workers Runtime
- **Text Chat Engine**: `assistant-ui` + Vercel AI SDK + NVIDIA Llama-3.1-Nemotron-70b-Instruct
- **Voice Agent**: LiveKit Realtime Audio + OpenAI (Whisper STT, GPT-4o-mini, OpenAI TTS)
- **Data Source**: Embedded static JSON module (`src/data/places.json`) compiled from J&K tripadvisor dataset.

---

## Environment Setup
Create a `.dev.vars` (for Wrangler/Cloudflare emulation) and a `.env.local` (for Next.js dev server) in the root directory:

```text
LIVEKIT_URL="wss://your-livekit-server-url"
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-api-secret"
NVIDIA_API_KEY="your-nvidia-api-key"
OPENAI_API_KEY="your-openai-api-key" # Optional: required for agent.py STT/TTS
```

For production deployment, add these environment variables as Secrets in your Cloudflare Pages Dashboard or run `wrangler secret put <KEY>`.

---

## How to Run Locally

### 1. Run the Next.js Frontend
Install the Node dependencies:
```bash
bun install
```

Start the Next.js dev server:
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Run the LiveKit Voice Agent
The voice agent (`agent.py`) performs heavy audio streaming and VAD (Voice Activity Detection), which require a persistent Python worker environment instead of serverless edge nodes.

Install the Python dependencies:
```bash
pip install "livekit-agents[openai,silero]" python-dotenv
```

Start the LiveKit agent worker in development mode:
```bash
python agent.py dev
```
Once the agent is running, click **START GUIDE** in the web interface to connect.

---

## Production Deployment to Cloudflare
Build and deploy the Next.js app to Cloudflare:
```bash
bun run deploy
```
This builds your Next.js application using OpenNext and deploys it automatically to your Cloudflare Pages account.
