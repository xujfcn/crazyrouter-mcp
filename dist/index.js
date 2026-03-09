#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const API_BASE = "https://crazyrouter.com/v1";
const DEFAULT_CHAT_MODEL = "gpt-5-mini";
const DEFAULT_IMAGE_MODEL = "dall-e-3";
const DEFAULT_VIDEO_MODEL = "kling-v2-1";
function getApiKey() {
    const key = process.env.CRAZYROUTER_API_KEY;
    if (!key) {
        throw new Error("CRAZYROUTER_API_KEY environment variable is required. " +
            "Get your API key at https://crazyrouter.com");
    }
    return key;
}
async function apiRequest(endpoint, options = {}) {
    const apiKey = getApiKey();
    const { method = "GET", body } = options;
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };
    const fetchOptions = {
        method,
        headers,
    };
    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Crazyrouter API error (${response.status}): ${errorText}`);
    }
    return response.json();
}
// --- Model Categories ---
const MODEL_CATEGORIES = {
    chat: [
        "gpt-5",
        "gpt-5-mini",
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-4o",
        "o3",
        "o4-mini",
        "claude-opus-4-6",
        "claude-sonnet-4",
        "claude-haiku-3.5",
        "gemini-3-pro",
        "gemini-2.5-flash",
        "deepseek-r1",
        "deepseek-v3",
        "llama-4-scout",
        "llama-4-maverick",
        "qwen3-235b",
        "qwen3-32b",
        "grok-4",
        "grok-3",
        "mistral-large",
    ],
    image: [
        "dall-e-3",
        "midjourney",
        "flux-pro-1.1-ultra",
        "flux-kontext-pro",
        "flux-kontext-max",
        "sd3.5-large",
        "sd3.5-large-turbo",
        "stable-diffusion-xl-1024-v1-0",
        "imagen-4.0-generate-001",
        "imagen-4.0-ultra-generate-001",
        "imagen-3.0-generate-002",
    ],
    video: [
        "sora-2",
        "kling-v2-1",
        "kling-v1",
        "veo3",
        "doubao-seedance-1-5-pro_720p",
        "pika-1.5",
        "runway-vip-video",
        "MiniMax-Hailuo-2.3",
    ],
    audio: ["tts-1", "tts-1-hd", "gpt-4o-mini-tts", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts", "whisper-1"],
    music: ["suno_music", "suno-v3", "suno_lyrics"],
};
// --- Server Factory ---
function createServer() {
    const server = new McpServer({
        name: "crazyrouter",
        version: "1.0.0",
        description: "Access 627+ AI models through Crazyrouter — chat, image generation, video generation, music, and more.",
    });
    // --- Tool: chat ---
    server.tool("chat", "Send a message to any AI model via Crazyrouter. Supports 627+ models including GPT-5, Claude Opus 4.6, Gemini 3, DeepSeek R1, Llama 4, Qwen3, Grok 4, and more.", {
        model: z
            .string()
            .default(DEFAULT_CHAT_MODEL)
            .describe(`The AI model to use (default: ${DEFAULT_CHAT_MODEL}). Examples: gpt-5, claude-opus-4-6, gemini-3-pro, deepseek-r1, llama-4-scout, qwen3-235b, grok-4`),
        messages: z
            .array(z.object({
            role: z
                .enum(["system", "user", "assistant"])
                .describe("The role of the message sender"),
            content: z.string().describe("The message content"),
        }))
            .describe("Array of chat messages with role and content"),
        temperature: z
            .number()
            .min(0)
            .max(2)
            .optional()
            .describe("Sampling temperature (0-2). Lower = more deterministic, higher = more creative"),
        max_tokens: z
            .number()
            .optional()
            .describe("Maximum number of tokens to generate"),
    }, async ({ model, messages, temperature, max_tokens }) => {
        try {
            const body = { model, messages };
            if (temperature !== undefined)
                body.temperature = temperature;
            if (max_tokens !== undefined)
                body.max_tokens = max_tokens;
            const result = (await apiRequest("/chat/completions", {
                method: "POST",
                body,
            }));
            const content = result.choices?.[0]?.message?.content ?? "No response content";
            const usage = result.usage;
            const actualModel = result.model ?? model;
            let text = content;
            if (usage) {
                text += `\n\n---\n📊 Model: ${actualModel} | Tokens: ${usage.prompt_tokens ?? "?"}→${usage.completion_tokens ?? "?"} (${usage.total_tokens ?? "?"} total)`;
            }
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
        }
    });
    // --- Tool: list_models ---
    server.tool("list_models", "List available AI models on Crazyrouter. Filter by category: chat, image, video, audio, or music.", {
        category: z
            .enum(["chat", "image", "video", "audio", "music"])
            .optional()
            .describe("Filter models by category. Options: chat, image, video, audio, music. Omit to show all categories."),
    }, async ({ category }) => {
        try {
            let liveModels = [];
            try {
                const result = (await apiRequest("/models"));
                if (result.data)
                    liveModels = result.data.map((m) => m.id);
            }
            catch { /* fall back to local list */ }
            let output = "";
            if (category) {
                const models = MODEL_CATEGORIES[category] ?? [];
                output = `## ${category.charAt(0).toUpperCase() + category.slice(1)} Models\n\n`;
                output += models.map((m) => `- ${m}`).join("\n");
                output += `\n\nTotal: ${models.length} models listed (${liveModels.length > 0 ? liveModels.length + " total available via API" : "627+ total available"})`;
            }
            else {
                output = "## Available Model Categories\n\n";
                for (const [cat, models] of Object.entries(MODEL_CATEGORIES)) {
                    const emoji = cat === "chat" ? "💬" : cat === "image" ? "🎨" : cat === "video" ? "🎬" : cat === "audio" ? "🗣️" : "🎵";
                    output += `### ${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${models.length} listed)\n`;
                    output += models.map((m) => `- ${m}`).join("\n");
                    output += "\n\n";
                }
                output += `---\n📊 Total: 627+ models available on Crazyrouter\n🔗 Full list: https://crazyrouter.com/models`;
            }
            return { content: [{ type: "text", text: output }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
        }
    });
    // --- Tool: generate_image ---
    server.tool("generate_image", "Generate images using AI models via Crazyrouter. Supports DALL-E 3, Midjourney, Flux, Stable Diffusion, and more.", {
        prompt: z.string().describe("Text description of the image to generate"),
        model: z
            .string()
            .default(DEFAULT_IMAGE_MODEL)
            .describe(`Image generation model to use (default: ${DEFAULT_IMAGE_MODEL}). Options: dall-e-3, midjourney, flux-pro-1.1-ultra, flux-kontext-pro, sd3.5-large, imagen-4.0-generate-001`),
        size: z.string().optional().describe("Image size. For DALL-E 3: 1024x1024, 1024x1792, 1792x1024."),
        n: z.number().min(1).max(4).optional().describe("Number of images to generate (1-4, default: 1)"),
    }, async ({ prompt, model, size, n }) => {
        try {
            const body = { model, prompt };
            if (size)
                body.size = size;
            if (n)
                body.n = n;
            const result = (await apiRequest("/images/generations", {
                method: "POST",
                body,
            }));
            if (!result.data || result.data.length === 0) {
                return { content: [{ type: "text", text: "No images were generated. Please try a different prompt." }] };
            }
            const images = result.data;
            let text = `🎨 Generated ${images.length} image(s) with ${model}:\n\n`;
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img.url)
                    text += `**Image ${i + 1}:** ${img.url}\n`;
                if (img.revised_prompt)
                    text += `*Revised prompt:* ${img.revised_prompt}\n`;
                text += "\n";
            }
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
        }
    });
    // --- Tool: generate_video ---
    server.tool("generate_video", "Generate videos using AI models via Crazyrouter. Supports Sora 2, Kling V2, Veo 3, Seedance, Pika, and more.", {
        prompt: z.string().describe("Text description of the video to generate"),
        model: z
            .string()
            .default(DEFAULT_VIDEO_MODEL)
            .describe(`Video generation model to use (default: ${DEFAULT_VIDEO_MODEL}). Options: sora-2, kling-v2-1, veo3, doubao-seedance-1-5-pro_720p, pika-1.5, runway-vip-video, MiniMax-Hailuo-2.3`),
    }, async ({ prompt, model }) => {
        try {
            const body = {
                model,
                messages: [{ role: "user", content: prompt }],
            };
            const result = (await apiRequest("/chat/completions", {
                method: "POST",
                body,
            }));
            const content = result.choices?.[0]?.message?.content ?? "Video generation initiated.";
            const videoUrl = result.video_url;
            let text = `🎬 Video generation with ${model}:\n\n`;
            if (videoUrl)
                text += `**Video URL:** ${videoUrl}\n\n`;
            text += content;
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred";
            return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
        }
    });
    return server;
}
// --- Smithery Sandbox Server (for capability scanning) ---
export function createSandboxServer() {
    return createServer();
}
// --- Start Server ---
async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Crazyrouter MCP Server running on stdio");
    console.error("Access 627+ AI models at https://crazyrouter.com");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map