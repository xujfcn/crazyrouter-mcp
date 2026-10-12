import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/index.js';
import { writeFile } from 'node:fs/promises';

const [a,b] = InMemoryTransport.createLinkedPair();
const server = createServer();
const client = new Client({ name: 'maintainer-smoke', version: '1' });
const results=[];
try {
  await server.connect(b); await client.connect(a);
  for (const [name,args] of [
    ['list_models',{}],
    ['chat',{ messages:[{role:'user',content:'Reply OK'}],max_tokens:16 }],
    ...(process.argv.includes('--image') ? [['generate_image',{ prompt:'A simple blue circle on a plain white background',n:1 }]] : []),
  ]) {
    const result=await client.callTool({name,arguments:args},undefined,{timeout:210000});
    const summary={tool:name,ok:!result.isError,content:result.content.map(c=>({type:c.type,...(c.type==='image'?{mimeType:c.mimeType,bytes:Buffer.from(c.data,'base64').length}:{characters:c.text.length,...(result.isError?{error:c.text}:{})})}))};
    results.push(summary); console.log(JSON.stringify(summary));
  }
  if(process.env.AUDIT_RESULT_PATH) await writeFile(process.env.AUDIT_RESULT_PATH,JSON.stringify(results,null,2));
  if(results.some(r=>!r.ok)) process.exitCode=1;
} finally { await client.close(); await server.close(); }
