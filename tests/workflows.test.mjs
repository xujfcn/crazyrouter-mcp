import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { workflow, demoClient, saveImage } from '../examples/workflows.mjs';
test('campaign produces text, image and report from tool outputs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-workflow-'));
  try {
    const r = await workflow(demoClient(), { mode: 'campaign', brief: 'notebook', directory: dir });
    assert.deepEqual(r.steps.map(x => x.tool), ['list_models', 'chat', 'generate_image']);
    assert.match(await readFile(join(dir, 'copy.md'), 'utf8'), /OFFLINE DEMO/);
    assert.equal((await readFile(join(dir, 'image.png')))[0], 137);
  } finally { await rm(dir, { recursive: true }); }
});
test('image URL downloads without credentials; HTTP errors and HTML are rejected', async () => {
  const result = { content: [{ type: 'text', text: 'https://images.example/image' }] };
  let saved = false;
  await assert.rejects(saveImage(result, '.', { fetchImpl: async (u, opts) => { assert.equal(opts.headers, undefined); return new Response('no', { status: 404 }); }, save: async () => { saved = true; } }), /HTTP 404/);
  await assert.rejects(saveImage(result, '.', { fetchImpl: async () => new Response('<html>'), save: async () => { saved = true; } }), /recognized/);
  assert.equal(saved, false);
  let downloaded;
  const good = await demoClient().callTool({ name: 'generate_image' });
  const bytes = Buffer.from(good.content[0].data, 'base64');
  await saveImage(result, '.', { fetchImpl: async (url, options) => { assert.equal(options.headers, undefined); return new Response(bytes); }, save: async (file, data) => { downloaded = data; } });
  assert.deepEqual(downloaded, bytes);
});
test('failed tool stops workflow and records completed steps without retry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-workflow-')); let count = 0;
  const client = demoClient(); const original = client.callTool;
  client.callTool = async args => { count++; return args.name === 'chat' ? { isError: true, content: [{ type: 'text', text: 'secret' }] } : original(args); };
  try {
    await assert.rejects(workflow(client, { mode: 'campaign', brief: 'notebook', directory: dir }), /chat failed/);
    assert.equal(count, 2); assert.doesNotMatch(await readFile(join(dir, 'failure.json'), 'utf8'), /secret/);
  } finally { await rm(dir, { recursive: true }); }
});
