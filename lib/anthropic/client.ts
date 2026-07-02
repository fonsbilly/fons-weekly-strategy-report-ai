import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

// Server-only. Never import this file from a "use client" component.
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured in this environment.");
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}
