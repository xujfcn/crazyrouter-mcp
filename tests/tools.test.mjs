import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/index.js';

const metadata = [
  { model_name: 'gpt-4o-mini', public_endpoint_types: ['openai'] },
  { model_name: 'gpt-image-2', public_endpoint_types: ['image-generation'] },
  { model_name: 'midjourney', public_endpoint_types: ['midjourney'] },
  { model_name: 'some-video-model', public_endpoint_types: ['openai-video'] },
];

async function withClient(handler, run) {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.CRAZYROUTER_API_KEY;
  process.env.CRAZYROUTER_API_KEY = 'test-local-key';
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/api/pricing')) {
      assert.equal(options.headers.Authorization, undefined);
      return Response.json({ success: true, data: metadata });
    }
    assert.equal(options.headers.Authorization, 'Bearer test-local-key');
    return handler(url, options);
  };
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: 'audit-test', version: '1' });
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run(client);
  } finally {
    await client.close(); await server.close();
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.CRAZYROUTER_API_KEY;
    else process.env.CRAZYROUTER_API_KEY = oldKey;
  }
}

test('discovery returns only live key-visible models and errors are not hidden', async () => {
  await withClient(() => Response.json({ data: [{ id: 'gpt-image-2' }] }), async client => {
    const result = await client.callTool({ name: 'list_models', arguments: { category: 'image' } });
    assert.deepEqual(JSON.parse(result.content[0].text).models.map(x => x.id), ['gpt-image-2']);
    assert.deepEqual((await client.listTools()).tools.map(x => x.name).sort(), ['chat','generate_image','list_models']);
  });
  await withClient(() => new Response('denied test-local-key', { status: 401 }), async client => {
    const result = await client.callTool({ name: 'list_models', arguments: {} });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /401/);
    assert.doesNotMatch(result.content[0].text, /test-local-key/);
  });
});

test('chat sends a valid body; incompatible models do not invoke inference', async () => {
  let calls = 0;
  await withClient((url, options) => {
    calls++;
    assert.equal(url, 'https://crazyrouter.com/v1/chat/completions');
    assert.deepEqual(JSON.parse(options.body), { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 16 });
    return Response.json({ choices: [{ message: { content: 'OK' } }] });
  }, async client => {
    assert.equal((await client.callTool({ name: 'chat', arguments: { messages: [{ role: 'user', content: 'Hi' }], max_tokens: 16 } })).content[0].text, 'OK');
    const result = await client.callTool({ name: 'chat', arguments: { model: 'some-video-model', messages: [{ role: 'user', content: 'Hi' }] } });
    assert.equal(result.isError, true);
    assert.equal(calls, 1);
  });
});

test('images return base64 content; wrong protocols and invalid counts are rejected', async () => {
  let calls = 0;
  await withClient((url, options) => {
    calls++;
    assert.equal(url, 'https://crazyrouter.com/v1/images/generations');
    assert.equal(JSON.parse(options.body).n, 1);
    return Response.json({ data: [{ b64_json: 'iVBORw0KGgo=' }] });
  }, async client => {
    const image = await client.callTool({ name: 'generate_image', arguments: { prompt: 'Circle' } });
    assert.equal(image.content[0].type, 'image');
    assert.equal(image.content[0].mimeType, 'image/png');
    for (const args of [{ prompt: 'Circle', model: 'midjourney' }, { prompt: 'Circle', n: 2 }]) {
      const result = await client.callTool({ name: 'generate_image', arguments: args });
      assert.equal(result.isError, true);
    }
    assert.equal(calls, 1);
  });
});

test('empty image result is an error', async () => {
  await withClient(() => Response.json({ data: [] }), async client => {
    assert.equal((await client.callTool({ name: 'generate_image', arguments: { prompt: 'Circle' } })).isError, true);
  });
});
