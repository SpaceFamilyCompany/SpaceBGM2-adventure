import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
test('home screen manifest stays scoped to the directory it is served from',async()=>{const r=await worker.fetch(new Request('https://game.test/manifest.webmanifest'),{});const m=await r.json();assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');assert.equal(m.name,'SpaceBGM');});
test('spefami.com/bgm/ serves the same app and API under the prefix',async()=>{
 const bare=await worker.fetch(new Request('https://spefami.com/bgm'),{});assert.equal(bare.status,301);assert.equal(bare.headers.get('Location'),'https://spefami.com/bgm/');
 const page=await worker.fetch(new Request('https://spefami.com/bgm/'),{});assert.equal(page.status,200);const html=await page.text();assert.ok(!/(href|src)="\/(?!\/)/.test(html),'root-absolute URL would escape /bgm/');
 assert.equal((await worker.fetch(new Request('https://spefami.com/bgm/api/game'),{})).status,503);
 assert.equal((await worker.fetch(new Request('https://spefami.com/bgm/manifest.webmanifest'),{})).status,200);
});
test('the bundle carries no audio files and fits the Workers free plan',async()=>{
 const {readFile}=await import('node:fs/promises');const {gzipSync}=await import('node:zlib');
 const src=await readFile('worker/index.js');assert.ok(gzipSync(src).length<1024*1024,'gzip size '+gzipSync(src).length);assert.ok(!src.includes('audio/wav"'));
});
