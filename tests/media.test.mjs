import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
test('iOS byte range audio requests return playable WAV headers and exact byte counts',async()=>{
 const r=await worker.fetch(new Request('https://game.test/music/forest-travel.wav',{headers:{Range:'bytes=0-43'}}),{});
 assert.equal(r.status,206);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,44);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.equal(bytes.readUInt32LE(24),16000);
 const bad=await worker.fetch(new Request('https://game.test/music/forest-travel.wav',{headers:{Range:'bytes=999999999-'}}),{});assert.equal(bad.status,416);
 const head=await worker.fetch(new Request('https://game.test/music/castle-boss.wav',{method:'HEAD'}),{});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
});
test('home screen manifest stays scoped to the existing site',async()=>{const r=await worker.fetch(new Request('https://game.test/manifest.webmanifest'),{});const m=await r.json();assert.equal(m.display,'standalone');assert.equal(m.start_url,'/');});
