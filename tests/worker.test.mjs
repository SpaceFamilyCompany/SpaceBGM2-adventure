import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const text=await readFile('dist/server/index.js','utf8');const worker=(await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'))).default;
class Bucket {body=null;etag=null;revision=0; async get(){return this.body?{etag:this.etag,json:async()=>JSON.parse(this.body)}:null;}async put(key,body,options){if(options.onlyIf?.etagMatches&&options.onlyIf.etagMatches!==this.etag)return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&this.body)return null;this.body=body;this.etag=String(++this.revision);return {etag:this.etag};}}
test('stage provides every element the client uses and every sprite the score can ask for',async()=>{
 const html=await(await worker.fetch(new Request('https://game.test/'),{})).text();
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 const used=[...html.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);assert.ok(used.length>10);
 for(const id of used)assert.ok(ids.has(id),'Missing UI element '+id);
 const art=JSON.parse(html.match(/^const ART=(.*);$/m)[1]),area=JSON.parse(html.match(/^const AREA=(.*);$/m)[1]);
 const {composeTrack}=await import('../web/score.mjs');const world=await import('../scripts/forest-objects.mjs');
 for(const running of [true,false])for(const [weapon,armor] of [[null,null],['leaf-blade','moss-cloak']]){
  const t=composeTrack({zone:'forest',running,floor:4,weapon,armor,companion:true},world,area);
  for(const frames of Object.values(t.actors))for(const entry of new Set(frames))assert.ok(art.grids[entry],'Missing sprite '+entry);
  for(const o of t.objects)for(const f of new Set(o.frames))assert.ok(art.grids[`obj:${o.id}-${f}`],'Missing object '+o.id+'-'+f);
  for(const s of t.segments)for(const layer of ['far','near'])assert.ok(art.bg[s.theme+'-'+layer]);
 }
 for(const [key,{w,h,d}] of Object.entries(art.grids))assert.equal(d.length,w*h,key);
 for(const item of ['leaf-blade','moss-cloak'])for(const pose of ['walk-0','attack-2','cheer-3','rest-1'])assert.ok(Object.keys(art.grids).some(k=>k.startsWith('eq:'+item)&&k.endsWith(pose)),'Missing gear '+item+' '+pose);
 assert.ok(!html.includes('/* APP_JS */')&&!html.includes('/* SCORE_JS */'));
});
test('page embeds a parseable client and a parseable worker source',async()=>{const r=await worker.fetch(new Request('https://game.test/'),{});assert.equal(r.status,200);const html=await r.text();assert.match(html,/<title>SpaceBGM<\/title>/);const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);new vm.Script(JSON.parse(js.match(/^const SCORE_SOURCE=(".*?");$/m)[1]));});
test('R2 game persists across independent requests, with guarded purchases',async()=>{const env={BUCKET:new Bucket()};const first=await(await worker.fetch(new Request('https://game.test/api/game'),env)).json();assert.equal(first.game.coins,60);const train=await worker.fetch(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json'},body:'{"type":"train"}'}),env);assert.equal(train.status,200);const second=await(await worker.fetch(new Request('https://game.test/api/game'),env)).json();assert.equal(second.game.level,2);assert.equal(second.game.coins,20);const bad=await worker.fetch(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json'},body:'{"type":"hire"}'}),env);assert.equal(bad.status,400);assert.equal(JSON.parse(env.BUCKET.body).coins,20);});
test('cross-origin writes and missing storage fail clearly',async()=>{assert.equal((await worker.fetch(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:'{"type":"train"}'}),{BUCKET:new Bucket()})).status,403);assert.equal((await worker.fetch(new Request('https://game.test/api/game'),{})).status,503);});
test('Durable Object store persists the game and rejects stale writes like R2',async()=>{
 const {GameStore}=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));const data=new Map();const store=new GameStore({storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,structuredClone(v));}}});
 const env={GAME:{idFromName:name=>name,get:()=>({fetch:(url,init)=>store.fetch(new Request(url,init))})}};
 assert.equal((await(await worker.fetch(new Request('https://spefami.com/bgm/api/game'),env)).json()).game.coins,60);
 const train=await worker.fetch(new Request('https://spefami.com/bgm/api/game',{method:'POST',headers:{Origin:'https://spefami.com','Content-Type':'application/json'},body:'{"type":"train"}'}),env);assert.equal(train.status,200);
 assert.equal((await(await worker.fetch(new Request('https://spefami.com/bgm/api/game'),env)).json()).game.level,2);
 const stale=await store.fetch(new Request('https://game-store/',{method:'POST',body:JSON.stringify({body:'{}',onlyIf:{etagMatches:'1'}})}));assert.equal(await stale.json(),null);
 const dup=await store.fetch(new Request('https://game-store/',{method:'POST',body:JSON.stringify({body:'{}',onlyIf:{etagDoesNotMatch:'*'}})}));assert.equal(await dup.json(),null);
 assert.equal(JSON.parse(data.get('save').body).level,2);
});
