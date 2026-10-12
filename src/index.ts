#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { pathToFileURL } from "node:url";

const API_BASE = "https://crazyrouter.com/v1";
type Model = { model_name: string; public_endpoint_types?: string[] };

async function request(url: string, body?: Record<string, unknown>, authenticated = true): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authenticated) {
    const key = process.env.CRAZYROUTER_API_KEY;
    if (!key) throw new Error("Set CRAZYROUTER_API_KEY before calling this tool.");
    headers.Authorization = `Bearer ${key}`;
  }
  const response = await fetch(url, {
    method: body ? "POST" : "GET", headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    let detail = (await response.text()).slice(0, 1500);
    const key = process.env.CRAZYROUTER_API_KEY;
    if (key) detail = detail.split(key).join("[redacted]");
    throw new Error(`Crazyrouter HTTP ${response.status}: ${detail}`);
  }
  return response.json();
}

async function catalogue(): Promise<Model[]> {
  const result = await request("https://crazyrouter.com/api/pricing", undefined, false);
  if (result.success !== true || !Array.isArray(result.data)) throw new Error("Public model catalogue is unavailable. Check https://crazyrouter.com/models.");
  return result.data;
}

function category(model: Model): string {
  const types = model.public_endpoint_types ?? [];
  if (types.some(t => t.includes("video") || t === "kling")) return "video";
  if (types.includes("suno")) return "music";
  if (types.includes("image-generation") || types.includes("midjourney")) return "image";
  // Endpoint metadata does not distinguish every audio/embedding model from chat.
  if (/tts|whisper|speech|transcri|audio/.test(model.model_name)) return "audio";
  if (/embedding|rerank|moderation/.test(model.model_name)) return "other";
  return types.includes("openai") || types.includes("anthropic") || types.includes("gemini") ? "chat" : "other";
}

function errorResult(error: unknown) {
  return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unknown error" }], isError: true };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "crazyrouter", version: "1.0.1" });

  server.tool("chat", "Send text messages to a model supporting Chat Completions. Model-specific parameter limits apply.", {
    model: z.string().default("gpt-4o-mini"),
    messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() })).min(1),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    max_completion_tokens: z.number().int().positive().optional(),
  }, async ({ model, messages, temperature, max_tokens, max_completion_tokens }) => {
    try {
      if (max_tokens !== undefined && max_completion_tokens !== undefined) throw new Error("Use only one token limit: max_tokens or max_completion_tokens.");
      const models = await catalogue();
      const selected = models.find(m => m.model_name === model);
      if (!selected || category(selected) !== "chat" || !selected.public_endpoint_types?.includes("openai")) {
        throw new Error("This model is not listed for Chat Completions. Use its documented endpoint; see https://docs.crazyrouter.com.");
      }
      const body: Record<string, unknown> = { model, messages };
      if (temperature !== undefined) body.temperature = temperature;
      if (max_tokens !== undefined) body.max_tokens = max_tokens;
      if (max_completion_tokens !== undefined) body.max_completion_tokens = max_completion_tokens;
      const result = await request(`${API_BASE}/chat/completions`, body);
      const content = result.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.length === 0) throw new Error("No text response. Check the model's token budget and response format.");
      return { content: [{ type: "text" as const, text: content }] };
    } catch (error) { return errorResult(error); }
  });

  server.tool("list_models", "List models returned for your key. Categories use public endpoint metadata; discovery does not imply this MCP implements every model protocol.", {
    category: z.enum(["chat", "image", "video", "audio", "music", "other"]).optional(),
  }, async ({ category: filter }) => {
    try {
      const live = await request(`${API_BASE}/models`);
      if (!Array.isArray(live.data)) throw new Error("Invalid model discovery response.");
      const metadata = await catalogue();
      const byId = new Map(metadata.map(m => [m.model_name, m]));
      const models = live.data.map((m: { id: string }) => ({ id: m.id, category: byId.has(m.id) ? category(byId.get(m.id)!) : "other", endpoints: byId.get(m.id)?.public_endpoint_types ?? [] }))
        .filter((m: { category: string }) => !filter || m.category === filter);
      return { content: [{ type: "text" as const, text: JSON.stringify({ models, count: models.length, note: "Available for this key at query time. This MCP generates text and synchronous images only; use provider documentation for other protocols." }, null, 2) }] };
    } catch (error) { return errorResult(error); }
  });

  server.tool("generate_image", "Generate one image using a model listed for /v1/images/generations. Returns a URL or a base64 image. Midjourney and video task APIs are not supported by this tool.", {
    prompt: z.string().min(1), model: z.string().default("gpt-image-2"),
    size: z.string().optional(), n: z.number().int().min(1).max(1).optional(),
  }, async ({ prompt, model, size, n }) => {
    try {
      const models = await catalogue();
      if (!models.find(m => m.model_name === model)?.public_endpoint_types?.includes("image-generation")) {
        throw new Error("This model is not listed for /v1/images/generations. Use its native endpoint from https://docs.crazyrouter.com.");
      }
      const body: Record<string, unknown> = { model, prompt, n: n ?? 1 };
      if (size !== undefined) body.size = size;
      const result = await request(`${API_BASE}/images/generations`, body);
      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
      for (const img of result.data ?? []) {
        if (img.url) content.push({ type: "text", text: String(img.url) });
        if (img.b64_json) {
          const bytes = Buffer.from(img.b64_json, "base64");
          const mimeType = bytes.subarray(0, 4).equals(Buffer.from([137,80,78,71])) ? "image/png"
            : bytes[0] === 255 && bytes[1] === 216 ? "image/jpeg"
            : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
          if (!mimeType) throw new Error("Unrecognized image format in base64 response.");
          content.push({ type: "image", data: img.b64_json, mimeType });
        }
      }
      if (!content.length) throw new Error("No image was returned; inspect the model parameters and API response.");
      return { content };
    } catch (error) { return errorResult(error); }
  });
  return server;
}

export function createSandboxServer() { return createServer(); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer().connect(new StdioServerTransport()).then(() => console.error("Crazyrouter MCP server running on stdio")).catch(error => {
    console.error(error instanceof Error ? error.message : "Startup failed");
    process.exitCode = 1;
  });
}
