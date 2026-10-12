# Crazyrouter MCP: chat, image generation and model discovery

Updated 2026-10-12. This MCP server connects supported clients to Crazyrouter using your API key. The repository implements three tools; the gateway's complete catalogue is broader than these tools.

## Tools

| Tool | API | Scope |
|---|---|---|
| `chat` | `POST /v1/chat/completions` | Text messages for models listed for Chat Completions; default `gpt-4o-mini` |
| `list_models` | `GET /v1/models` plus public endpoint metadata | Live models available to your key; optional category filter |
| `generate_image` | `POST /v1/images/generations` | One synchronous image; default `gpt-image-2`; model-specific sizes |

Model discovery does not imply that this MCP implements each model's protocol. Video, music, transcription, TTS and Midjourney tasks require their own APIs. The old `generate_video` implementation sent video models to a chat endpoint and has been removed. Use the [API documentation](https://docs.crazyrouter.com?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_01__en&utm_medium=github_readme) for those task APIs.

The server no longer silently replaces failed discovery with a hardcoded model list. Authentication and discovery errors are returned to the client. Categories use public endpoint metadata and name-based audio detection; unknown types appear under `other`.

## Install from npm

Requires Node.js 22 or later.

Configure your MCP client with `npx -y crazyrouter-mcp@1.0.1` and set `CRAZYROUTER_API_KEY` as shown below. The client starts the server automatically.

To build from source instead:

```bash
git clone https://github.com/xujfcn/crazyrouter-mcp.git
cd crazyrouter-mcp
npm ci
npm run build
```

## Claude Desktop or Cursor

Create a key in the [Crazyrouter console](https://crazyrouter.com/console/token?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_02__en&utm_medium=github_readme). Add the following to the client's MCP configuration, replacing the key locally:

```json
{
  "mcpServers": {
    "crazyrouter": {
      "command": "npx",
      "args": ["-y", "crazyrouter-mcp@1.0.1"],
      "env": { "CRAZYROUTER_API_KEY": "YOUR_CRAZYROUTER_API_KEY" }
    }
  }
}
```

Claude Desktop uses its `claude_desktop_config.json`; Cursor supports `.cursor/mcp.json`. Restart the client after editing. Do not commit a configuration containing a real key.

## VS Code

Use `.vscode/mcp.json` and the VS Code MCP schema:

```json
{
  "servers": {
    "crazyrouter": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "crazyrouter-mcp@1.0.1"],
      "env": { "CRAZYROUTER_API_KEY": "${input:crazyrouter-api-key}" }
    }
  },
  "inputs": [
    { "type": "promptString", "id": "crazyrouter-api-key", "description": "Crazyrouter API key", "password": true }
  ]
}
```

## Example tool arguments

```json
{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Reply OK"}],"max_tokens":16}
```

Use only one of `max_tokens` and `max_completion_tokens`, according to the model's documented schema. Do not send optional temperature values to models that do not support them.

```json
{"category":"image"}
```

```json
{"model":"gpt-image-2","prompt":"A simple blue circle on a white background","n":1}
```

Image output may be a URL or base64 image. The tool returns both formats through MCP and does not report success for an empty result. Size constraints vary by model. Image requests incur the model's normal charges.

## Prices and troubleshooting

- [Current models](https://crazyrouter.com/en/models?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_03__en&utm_medium=github_readme) and [prices](https://crazyrouter.com/en/pricing?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_04__en&utm_medium=github_readme) are the source of truth; there is no fixed model count or universal discount.
- HTTP 400: inspect the exact model ID, endpoint, size and other fields. Start with the minimal example.
- HTTP 401/403: check your key and permissions. HTTP 429: inspect quota and rate limits.
- Models requiring a native task API are rejected by the chat/image tools before inference.
- The fixed API base is `https://crazyrouter.com/v1`; marketing parameters are never added to API requests.

## Development

```bash
npm ci
npm run build
npm test
```

Tests use mocked HTTP responses through an MCP client/server connection. On 2026-10-12, live checks through the updated MCP passed for model discovery, a minimal `gpt-4o-mini` chat request and one `gpt-image-2` image request. This does not establish that every model or media operation has been tested. Maintainers can run `node tests/live-smoke.mjs`; add `--image` to include one billable image request.

## 中文说明

本仓库支持文本聊天、同步图片生成、实时模型发现三个工具。模型目录会返回视频、音乐等类别，但不代表这些能力已在 MCP 中实现。旧版视频工具错误地调用聊天接口，已移除；请按 [API 文档](https://docs.crazyrouter.com?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_05__en&utm_medium=github_readme)使用原生任务接口。

使用 Node.js 22+，按上面的配置通过 `npx -y crazyrouter-mcp@1.0.1` 启动。也可以克隆仓库后运行 `npm ci` 和 `npm run build`，再将本地 `dist/index.js` 配置到 MCP 客户端。密钥通过 `CRAZYROUTER_API_KEY` 传入。不要将模型目录中的显示名称当作精确 API ID，也不要将推广参数添加到接口地址。

[创建密钥](https://crazyrouter.com/console/token?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_06__en&utm_medium=github_readme) · [当前模型与价格](https://crazyrouter.com/zh/pricing?utm_source=github&utm_campaign=crazyrouter-mcp&utm_content=readme_07__en&utm_medium=github_readme)

## License

[MIT](LICENSE)
