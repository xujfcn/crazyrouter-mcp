# Crazyrouter MCP Server — Access 627+ AI Models with One API

> **One key. 627+ models. Text, image, video, audio, music, 3D — all through MCP.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue.svg)](https://modelcontextprotocol.io)
[![npm](https://img.shields.io/badge/npm-crazyrouter--mcp-red.svg)](https://www.npmjs.com/package/crazyrouter-mcp)

An MCP (Model Context Protocol) server that gives your AI assistant access to **627+ AI models** through [Crazyrouter](https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community) — the unified AI API gateway. Chat with GPT-5, generate images with DALL-E 3, create videos with Sora 2, compose music with Suno V4, and more — all from a single API key.

---

## ✨ Features

- 🌐 **627+ Models, One API** — GPT-5, Claude Opus 4.6, Gemini 3, DeepSeek R1, Llama 4, Qwen3, Grok 4, and hundreds more
- 🎨 **Image Generation** — DALL-E 3, Midjourney, Flux, Stable Diffusion, Nano Banana Pro
- 🎬 **Video Generation** — Sora 2, Kling V2, Veo 3, Seedance, Pika
- 🎵 **Music Generation** — Suno V4, Chirp
- 🗣️ **Text-to-Speech & Speech-to-Text** — Multiple TTS/STT engines
- 💰 **Competitive Pricing** — Below official rates for most models
- 🌍 **7 Global Edge Nodes** — Low latency worldwide
- 🔄 **OpenAI + Anthropic + Gemini Protocol Compatible** — Drop-in replacement
- ⚡ **Credits Never Expire** — Pay once, use anytime

---

## 🚀 Quick Start

### 1. Get Your API Key

Sign up at [crazyrouter.com](https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community) and grab your API key.

### 2. Install

```bash
git clone https://github.com/xujfcn/crazyrouter-mcp.git
cd crazyrouter-mcp
npm install
npm run build
```

### 3. Configure Your AI Client

<details>
<summary><strong>Claude Desktop</strong></summary>

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "crazyrouter": {
      "command": "node",
      "args": ["/path/to/crazyrouter-mcp/dist/index.js"],
      "env": {
        "CRAZYROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "crazyrouter": {
      "command": "node",
      "args": ["/path/to/crazyrouter-mcp/dist/index.js"],
      "env": {
        "CRAZYROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code (Copilot)</strong></summary>

Add to your VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "crazyrouter": {
        "command": "node",
        "args": ["/path/to/crazyrouter-mcp/dist/index.js"],
        "env": {
          "CRAZYROUTER_API_KEY": "your-api-key-here"
        }
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "crazyrouter": {
      "command": "node",
      "args": ["/path/to/crazyrouter-mcp/dist/index.js"],
      "env": {
        "CRAZYROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>OpenClaw</strong></summary>

Add to your OpenClaw MCP config:

```json
{
  "mcpServers": {
    "crazyrouter": {
      "command": "node",
      "args": ["/path/to/crazyrouter-mcp/dist/index.js"],
      "env": {
        "CRAZYROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

</details>

---

## 🛠️ Available Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `chat` | Chat with any AI model | `model`, `messages`, `temperature` |
| `list_models` | List available models by category | `category` (chat/image/video/audio/music) |
| `generate_image` | Generate images with AI | `prompt`, `model`, `size` |
| `generate_video` | Generate videos with AI | `prompt`, `model` |

### Usage Examples

**Chat with any model:**
> "Use the chat tool to ask GPT-5 to explain quantum computing"

**Generate an image:**
> "Use generate_image to create a sunset over mountains with DALL-E 3"

**Generate a video:**
> "Use generate_video with Kling V2 to create a 5-second clip of ocean waves"

**Discover models:**
> "Use list_models to show me all available image generation models"

---

## 📋 Supported Models

### 💬 Chat / Text Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-5, GPT-5-mini, GPT-4.1, GPT-4o, o3, o4-mini |
| Anthropic | Claude Opus 4.6, Claude Sonnet 4, Claude Haiku 3.5 |
| Google | Gemini 3 Pro, Gemini 2.5 Flash, Gemini 2.0 |
| DeepSeek | DeepSeek R1, DeepSeek V3 |
| Meta | Llama 4 Scout, Llama 4 Maverick |
| Alibaba | Qwen3 235B, Qwen3 32B, Qwen3 Coder |
| xAI | Grok 4, Grok 3 |
| Mistral | Mistral Large, Codestral |
| And more... | 600+ chat models available |

### 🎨 Image Generation Models

| Model | Description |
|-------|-------------|
| DALL-E 3 | OpenAI's latest image model |
| Midjourney | Industry-leading artistic image generation |
| Flux Pro / Dev / Schnell | Black Forest Labs' open models |
| Stable Diffusion 3.5 | Stability AI's open model |
| Nano Banana Pro | Fast, high-quality generation |
| Ideogram V2 | Text-in-image specialist |

### 🎬 Video Generation Models

| Model | Description |
|-------|-------------|
| Sora 2 | OpenAI's video generation model |
| Kling V2 | Kuaishou's cinematic video model |
| Veo 3 | Google's video generation model |
| Seedance | ByteDance's dance video model |
| Pika | Creative video generation |
| Runway Gen-4 | Professional video synthesis |

### 🎵 Music & Audio Models

| Model | Description |
|-------|-------------|
| Suno V4 | AI music composition |
| Chirp | Music generation model |
| TTS Models | Multiple text-to-speech engines |
| STT Models | Speech-to-text transcription |

> 📖 Full model list: [crazyrouter.com/models](https://crazyrouter.com/models?utm_source=github&utm_medium=mcp&utm_campaign=dev_community)

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRAZYROUTER_API_KEY` | ✅ | Your Crazyrouter API key |

### API Endpoints

Crazyrouter is **OpenAI-compatible**, meaning any tool or library that works with OpenAI can work with Crazyrouter by simply changing the base URL:

```
Base URL: https://crazyrouter.com/v1
```

This MCP server uses the following endpoints:
- `POST /v1/chat/completions` — Chat completions
- `GET /v1/models` — List available models
- `POST /v1/images/generations` — Image generation

---

## 🏗️ Development

```bash
# Clone the repo
git clone https://github.com/xujfcn/crazyrouter-mcp.git
cd crazyrouter-mcp

# Install dependencies
npm install

# Build
npm run build

# Run
CRAZYROUTER_API_KEY=your-key node dist/index.js
```

### Project Structure

```
crazyrouter-mcp/
├── src/
│   └── index.ts          # MCP server implementation
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

---

## 🤔 Why Crazyrouter?

| Feature | Crazyrouter | Direct API |
|---------|------------|------------|
| Models Available | 627+ | 1 provider |
| API Keys Needed | 1 | Multiple |
| Protocol Support | OpenAI + Anthropic + Gemini | Varies |
| Pricing | Below official rates | Official rates |
| Credits Expiry | Never | Varies |
| Global Edge Nodes | 7 | Varies |

**One API key. All providers. Better prices.**

👉 [Get started at crazyrouter.com](https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community)

---

## 📄 License

[MIT](LICENSE) — use it however you like.

---

## 🔗 Links

- 🌐 [Crazyrouter Website](https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community)
- 📖 [API Documentation](https://crazyrouter.com/docs?utm_source=github&utm_medium=mcp&utm_campaign=dev_community)
- 💬 [Discord Community](https://discord.gg/crazyrouter)
- 🐛 [Report Issues](https://github.com/xujfcn/crazyrouter-mcp/issues)

---

## 🌏 中文说明

### Crazyrouter MCP 服务器 — 一个 API 访问 627+ AI 模型

Crazyrouter MCP 服务器是一个标准的 MCP（模型上下文协议）服务器，让你的 AI 助手（如 Claude Desktop、Cursor、VS Code 等）通过 [Crazyrouter AI API 网关](https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community) 访问 627+ AI 模型。

**核心功能：**
- 🌐 627+ AI 模型，一个 API Key 搞定
- 🎨 图片生成（DALL-E 3, Midjourney, Flux, Stable Diffusion）
- 🎬 视频生成（Sora 2, Kling V2, Veo 3）
- 🎵 音乐生成（Suno V4）
- 💰 价格低于官方价格
- ⚡ 充值永不过期

**快速开始：**
1. 在 [crazyrouter.com](https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community) 注册获取 API Key
2. 克隆仓库并编译
3. 配置到你的 AI 客户端（Claude Desktop / Cursor / VS Code）

详细配置请参考上方英文文档。

---

<p align="center">
  Built with ❤️ for the AI community by <a href="https://crazyrouter.com?utm_source=github&utm_medium=mcp&utm_campaign=dev_community">Crazyrouter</a>
</p>
