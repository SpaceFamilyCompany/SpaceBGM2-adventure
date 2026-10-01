import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {PALETTE,SPRITES} from '../scripts/pixel-art.mjs';
import {STORY_SPRITES,STORY_SOUND_FRAMES,heavenScene} from '../scripts/story-art.mjs';
import {MONSTER_SPRITES} from '../scripts/monsters.mjs';
// Recorded by importing the placeholder modules before replacement: [count,width,height].
const expectedStory={koro:{roll:[4,32,32],idle:[4,32,32]},lumi:{shiver:[4,32,32],fly:[4,32,32]},mio:{walk:[4,32,32],idle:[4,32,32]},signpost:{sway:[4,32,32]},altar:{glow:[4,56,32]},soul:{glow:[4,16,16]},god:{pulse:[4,64,64]}};
const expectedMonsters={mushling:{bounce:[4,32,32],hit:[2,32,32]},beetle:{bounce:[4,32,32],hit:[2,32,32]},wisp:{bounce:[4,32,32],hit:[2,32,32]}};
const expectedSounds={'koro.roll':[0,2],'lumi.fly':[0],'mio.walk':[0,2],'signpost.sway':[0],'altar.glow':[0],'soul.glow':[0,2],'god.pulse':[0]};
for(const [label,sprites,expected] of [['story',STORY_SPRITES,expectedStory],['monsters',MONSTER_SPRITES,expectedMonsters]])test(label+' preserves every action, frame count, dimension and palette',()=>{
 assert.deepEqual(Object.keys(sprites),Object.keys(expected));
 for(const [id,actions] of Object.entries(expected)){
  assert.deepEqual(Object.keys(sprites[id]),Object.keys(actions));
  for(const [action,[count,w,h]] of Object.entries(actions)){
   assert.equal(sprites[id][action].length,count);
   for(const grid of sprites[id][action]){
    assert.equal(grid.length,h);
    for(const row of grid){assert.equal(row.length,w);for(const c of row)assert.ok(c==='.'||Object.hasOwn(PALETTE,c),`${id}.${action}: ${c}`);}
    assert.ok(grid.join('').includes('o'));
   }
  }
 }
});
test('story sound frames remain exactly the original score contract',()=>assert.deepEqual(STORY_SOUND_FRAMES,expectedSounds));
const bottom=g=>g.findLastIndex(row=>/[^.]/.test(row));
const count=(g,chars)=>[...g.join('')].filter(c=>chars.includes(c)).length;
test('footfalls, apex, flash and radiance follow the sounding frames',()=>{
 for(const id of ['koro','mio']){
  const f=STORY_SPRITES[id][id==='koro'?'roll':'walk'];
  assert.deepEqual(f.map(bottom),[30,29-(id==='koro'?1:0),30,29-(id==='koro'?1:0)]);
 }
 for(const f of [0,2])assert.equal(STORY_SPRITES.mio.walk[f][30],SPRITES.hero.walk[f][30]);
 for(const [id,{bounce,hit}] of Object.entries(MONSTER_SPRITES)){
  assert.equal(bottom(bounce[0]),id==='wisp'?25:30);
  assert.ok(bottom(bounce[2])<bottom(bounce[1]));assert.ok(bottom(bounce[2])<bottom(bounce[3]));
  assert.match(hit[0].join(''),/^[.ow]+$/);assert.notDeepEqual(hit[0],hit[1]);
 }
 const god=STORY_SPRITES.god.pulse.map(g=>count(g,'owYlcf'));
 assert.ok(god.slice(1).every(n=>n<god[0]));
 const soul=STORY_SPRITES.soul.glow.map(g=>count(g,'wYl'));
 assert.ok(soul[0]>soul[1]&&soul[2]>soul[3]);
 const altar=STORY_SPRITES.altar.glow.map(g=>count(g,'wY'));
 assert.ok(altar.slice(1).every(n=>n<altar[0]));
});
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
test('heaven layers contain palette rects in 320×180 and independently seamless edge columns',()=>{
 const scene=heavenScene();assert.deepEqual(Object.keys(scene),['far','near']);
 for(const [name,body] of Object.entries(scene)){
  const pixels=Array.from({length:180},()=>Array(320).fill('.'));
  assert.equal(body.replace(/<rect\b[^>]*\/>/g,''),'');
  for(const [tag] of body.matchAll(/<rect\b[^>]*\/>/g)){
   const a=attrs(tag),[x,y,w,h]=['x','y','width','height'].map(k=>Number(a[k]));
   assert.ok([x,y,w,h].every(Number.isInteger));assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=320&&y+h<=180);assert.ok(Object.values(PALETTE).includes(a.fill));
   for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[j][i]=a.fill;
  }
  for(let y=0;y<180;y++)assert.equal(pixels[y][0],pixels[y][319],`${name} seam y=${y}`);
  if(name==='far')assert.ok(pixels.every(row=>row.every(c=>c!=='.')));
  else{const top=pixels.findIndex(row=>row.some(c=>c!=='.'));assert.ok(top>=134&&top<=146);assert.ok(pixels[146].every(c=>c!=='.'));}
 }
});
test('preview renders every new frame and advances the shared clock',()=>{
 const html=execFileSync(process.execPath,['scripts/sprite-preview.mjs','--stdout'],{encoding:'utf8',maxBuffer:8*1024*1024});
 const nodes=new Map(),node=()=>({innerHTML:'',textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector(){return this;}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelectorAll(){return [];},documentElement:{style:{setProperty(){}}}};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document,performance:{now:()=>0},requestAnimationFrame(){}});
 for(let tick=0;tick<4;tick++){
  for(const [id,actions] of Object.entries({...STORY_SPRITES,...MONSTER_SPRITES}))for(const [action,grids] of Object.entries(actions)){
   const key=id+'-'+action,el=document.getElementById('story-live-'+key),f=tick%grids.length;
   assert.ok(html.includes(`id="story-live-${key}"`));assert.ok(el.innerHTML.includes(`href="#px-story-${key}-${f}"`));
   grids.forEach((_,i)=>assert.ok(html.includes(`id="px-story-${key}-${i}"`)));
  }
  document.getElementById('step').onclick();
 }
});
