import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function textOf(result) {
  if (result.isError) throw new Error('MCP tool failed. Run the diagnostic guide; raw tool errors are omitted to avoid leaking credentials.');
  return result.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
}
function imageExtension(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (bytes[0] === 255 && bytes[1] === 216) return '.jpg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  throw new Error('Result is not a recognized PNG, JPEG or WebP image.');
}
export async function saveImage(result, directory, { fetchImpl = fetch, save = writeFile } = {}) {
  if (result.isError) throw new Error('Image generation failed; no file saved.');
  let bytes;
  const inline = result.content.find(c => c.type === 'image');
  if (inline) bytes = Buffer.from(inline.data, 'base64');
  else {
    const item = result.content.find(c => c.type === 'text' && /^https:\/\//.test(c.text.trim()));
    if (!item) throw new Error('No image or HTTPS image URL returned.');
    const url = new URL(item.text.trim());
    if (url.username || url.password) throw new Error('Image URL must not contain credentials.');
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
    if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);
    const chunks = []; let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > 25 * 1024 * 1024) throw new Error('Image exceeds 25 MiB limit.');
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
  }
  if (!bytes?.length || bytes.length > 25 * 1024 * 1024) throw new Error('Empty or oversized image.');
  const name = 'image' + imageExtension(bytes);
  await save(join(directory, name), bytes, { flag: 'wx' });
  return { file: name, bytes: bytes.length };
}

export async function workflow(client, { mode, brief, directory, chatModel = 'gpt-4o-mini', imageModel = 'gpt-image-2', fetchImpl, runKind = 'test-or-custom-client' }) {
  const steps = [];
  async function call(name, args) {
    const start = Date.now(); const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 210_000 });
    if (result.isError) throw new Error(`Tool ${name} failed; no automatic retry was made.`);
    steps.push({ tool: name, elapsed_ms: Date.now() - start, ok: true }); return result;
  }
  try {
    const discovery = JSON.parse(textOf(await call('list_models', {})));
    if (!discovery.models?.some(x => x.id === imageModel && x.endpoints?.includes('image-generation'))) throw new Error('Selected image model is not visible with the Images endpoint. Choose another exact ID.');
    if (mode === 'campaign') {
      if (!discovery.models.some(x => x.id === chatModel && x.endpoints?.includes('openai') && x.category === 'chat')) throw new Error('Selected chat model is not visible for Chat Completions.');
      const copy = textOf(await call('chat', { model: chatModel, messages: [{ role: 'user', content: `Write a headline and three short feature bullets using only these product facts. Do not invent prices, discounts or certifications.\n${brief}` }], max_tokens: 256 }));
      await writeFile(join(directory, 'copy.md'), copy + '\n', { flag: 'wx' });
    }
    const image = await call('generate_image', { model: imageModel, prompt: `Create a simple product illustration, no text, no logos. Product facts: ${brief}`, n: 1 });
    const artifact = await saveImage(image, directory, { fetchImpl });
    const report = { run_kind: runKind, mode, chat_model: mode === 'campaign' ? chatModel : null, image_model: imageModel, steps, artifact, billing: 'Not measured: MCP 1.0.1 tools omit usage and actual charges. Check your account ledger; elapsed time is not a cost.' };
    await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' }); return report;
  } catch (error) {
    await writeFile(join(directory, 'failure.json'), JSON.stringify({ mode, completed_steps: steps, message: 'Workflow stopped. Earlier successful calls may be billed; inspect existing artifacts before retrying.' }, null, 2), { flag: 'wx' });
    throw error;
  }
}

const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl2cAAAAASUVORK5CYII=';
export function demoClient() {
  return { async callTool({ name }) {
    if (name === 'list_models') return { content: [{ type: 'text', text: JSON.stringify({ models: [{ id: 'gpt-image-2', endpoints: ['image-generation'] }, { id: 'gpt-4o-mini', category: 'chat', endpoints: ['openai'] }] }) }] };
    if (name === 'chat') return { content: [{ type: 'text', text: '# OFFLINE DEMO\nA notebook for everyday ideas.\n- Recycled paper\n- Dotted pages\n- Pocket size' }] };
    return { content: [{ type: 'image', mimeType: 'image/png', data: pixel }] };
  } };
}
async function main() {
  const args = process.argv.slice(2); const mode = args[0];
  if (!['campaign', 'image'].includes(mode) || args.some((x,i) => i > 0 && x !== '--live')) throw new Error('Usage: node examples/workflows.mjs campaign|image [--live]');
  const live = args.includes('--live');
  if (live && !process.env.CRAZYROUTER_API_KEY) throw new Error('Set CRAZYROUTER_API_KEY locally.');
  const base = dirname(fileURLToPath(import.meta.url)); const brief = await readFile(join(base, 'product-brief.txt'), 'utf8');
  const root = resolve('results'); await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, `${live ? 'live' : 'offline-demo'}-${mode}-`));
  let client = demoClient();
  try {
    if (live) {
      const transport = new StdioClientTransport({ command: process.execPath, args: [resolve(base, '../dist/index.js')], env: { CRAZYROUTER_API_KEY: process.env.CRAZYROUTER_API_KEY }, stderr: 'pipe' });
      client = new Client({ name: 'workflow-example', version: '1.0.0' }); await client.connect(transport);
    }
    const report = await workflow(client, { mode, brief, directory, runKind: live ? 'live' : 'offline-demo' });
    await writeFile(join(directory, 'mode.txt'), live ? 'LIVE: billable API calls\n' : 'OFFLINE DEMO: simulated text and a 1-pixel PNG; no API calls\n');
    console.log(JSON.stringify({ mode: live ? 'live' : 'offline-demo', directory, ...report }, null, 2));
  } finally { if (live) await client.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error('Workflow failed. See results/*/failure.json where available; verify your key, model and network. Raw server errors are omitted.'); process.exitCode = 1; });
