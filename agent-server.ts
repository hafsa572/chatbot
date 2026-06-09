import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables BEFORE importing @livekit/agents,
// because the CLI needs LIVEKIT_API_KEY and LIVEKIT_API_SECRET at boot time.
dotenv.config({ path: resolve(__dirname, ".env.local") });
dotenv.config({ path: resolve(__dirname, ".dev.vars") });

// Strip any proxy OPENAI_API_KEY inherited from the parent shell
const openaiKey = process.env.OPENAI_API_KEY;
if (openaiKey && !openaiKey.startsWith("sk-")) {
  console.warn("Warning: Stripping non-OpenAI OPENAI_API_KEY from shell environment.");
  delete process.env.OPENAI_API_KEY;
}
if (process.env.OPENAI_BASE_URL && !process.env.OPENAI_BASE_URL.includes("api.openai.com")) {
  delete process.env.OPENAI_BASE_URL;
}

import { cli, ServerOptions } from "@livekit/agents";

// The agent file path — cli.runApp will dynamically import this module
// and use its default export (defineAgent) as the entrypoint.
const agentFile = fileURLToPath(new URL("./agent.ts", import.meta.url));

cli.runApp(
  new ServerOptions({
    agent: agentFile,
  })
);
