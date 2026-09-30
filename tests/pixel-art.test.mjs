import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { PALETTE, FRAME_COUNT, SPRITES, SOUND_FRAMES, EQUIPMENT_LAYERS, spriteSheet } from '../scripts/pixel-art.mjs';
import { forestScene } from '../scripts/forest-scene.mjs';

const expected={hero:{walk:4,attack:4,rest:4,cheer:4},cat:{walk:4,pounce:4,rest:4},slime:{bounce:4,hit:2},guardian:{idle:4,hit:2},chest:{open:4},spark:{twinkle:4},fire:{burn:4},frog:{croak:4},owl:{hoot:4},firefly:{glow:4},leaves:{sway:4}};
const soundExpected={'hero.walk':[0,2],'hero.attack':[2],'hero.cheer':[0,2],'hero.rest':[0],'cat.walk':[1,3],'cat.pounce':[0],'slime.bounce':[0],'guardian.idle':[0],'chest.open':[0,1,2,3],'spark.twinkle':[0,2],'fire.burn':[0,1,2,3],'frog.croak':[0],'owl.hoot':[0,2],'firefly.glow':[0],'leaves.sway':[0,2]};
function validate(grid){assert.equal(grid.length,32);for(const row of grid){assert.equal(row.length,32);for(const c of row)assert.ok(c==='.'||Object.hasOwn(PALETTE,c),`Unknown ${c}`);}}
test('32×32 character and registered equipment grids; <=24 inks and all brand colors',()=>{
 assert.ok(Object.keys(PALETTE).length<=24);
 for(const c of Object.values(PALETTE))assert.match(c,/^#[0-9a-f]{6}$/i);
 for(const c of ['#232046','#1C1A33','#3B3470','#5A548F','#EAE6F5','#F7F5FB','#B9B4D3','#F0A9B9','#A9DDE2'])assert.ok(Object.values(PALETTE).includes(c));
 for(const actions of Object.values(SPRITES))for(const frames of Object.values(actions))frames.forEach(validate);
 for(const layers of Object.values(EQUIPMENT_LAYERS))for(const actions of Object.values(layers))for(const frames of Object.values(actions))frames.forEach(validate);
});
test('exact actions, frame counts and score events',()=>{
 assert.equal(FRAME_COUNT,4);
 assert.deepEqual(Object.fromEntries(Object.entries(SPRITES).map(([s,a])=>[s,Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v.length]))])),expected);
 assert.deepEqual(SOUND_FRAMES,soundExpected);
 for(const [key,events] of Object.entries(SOUND_FRAMES)){const [s,a]=key.split('.');assert.ok(SPRITES[s]?.[a]);for(const f of events)assert.ok(Number.isInteger(f)&&f>=0&&f<SPRITES[s][a].length);}
});
test('alternating footfalls use the y=30 baseline',()=>{
 for(const [s,indices] of [['hero',[0,2]],['cat',[1,3]]])for(const f of indices){assert.match(SPRITES[s].walk[f][30],/o/);assert.equal(SPRITES[s].walk[f][31],'.'.repeat(32));}
});
test('both equipment items cover every hero action and frame',()=>{
 assert.deepEqual(Object.keys(EQUIPMENT_LAYERS),['leaf-blade','moss-cloak']);
 for(const layers of Object.values(EQUIPMENT_LAYERS)){
  assert.ok(Object.keys(layers).length);for(const [side,actions] of Object.entries(layers)){
   assert.ok(['back','front'].includes(side));assert.deepEqual(Object.keys(actions),Object.keys(SPRITES.hero));
   for(const [a,grids] of Object.entries(actions)){assert.equal(grids.length,SPRITES.hero[a].length);for(const grid of grids)assert.ok(grid.some(row=>/[^.]/.test(row)));}
  }
 }
});
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));}
test('symbols have exact unique ids, rects reproduce grids, and sheet fits 250KB',()=>{
 const sheet=spriteSheet(),entries=[];
 for(const [s,actions] of Object.entries(SPRITES))for(const [a,grids] of Object.entries(actions))grids.forEach((g,f)=>entries.push([`px-${s}-${a}-${f}`,g]));
 for(const [item,layers] of Object.entries(EQUIPMENT_LAYERS))for(const [side,actions] of Object.entries(layers))for(const [a,grids] of Object.entries(actions))grids.forEach((g,f)=>entries.push([`px-eq-${item}-${side}-${a}-${f}`,g]));
 const symbols=[...sheet.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)];
 assert.equal(symbols.length,entries.length);assert.equal(new Set(symbols.map(s=>attrs(s[1]).id)).size,entries.length);
 symbols.forEach((s,index)=>{
  const a=attrs(s[1]);assert.equal(a.id,entries[index][0]);assert.equal(a.viewBox,'0 0 32 32');assert.equal(a['shape-rendering'],'crispEdges');
  const pixels=Array.from({length:32},()=>Array(32).fill('.'));
  for(const group of s[2].matchAll(/<g fill="([^"]+)">([\s\S]*?)<\/g>/g)){
   const color=Object.entries(PALETTE).find(([,v])=>v===group[1])[0];
   for(const match of group[2].matchAll(/<rect\b[^>]*\/>/g)){const r=attrs(match[0]);for(let y=+r.y;y<+r.y+ +r.height;y++)for(let x=+r.x;x<+r.x+ +r.width;x++){assert.equal(pixels[y][x],'.');pixels[y][x]=color;}}
  }
  assert.deepEqual(pixels.map(row=>row.join('')),entries[index][1]);
 });
 assert.ok(Buffer.byteLength(sheet)<=250000,`${Buffer.byteLength(sheet)} bytes`);
 assert.ok(/width="[2-9]\d*"/.test(sheet),'horizontal runs must merge');
});
test('forest dimensions, palette, budget, and independently seamless parallax layers',()=>{
 const svg=forestScene(),root=attrs(svg.slice(0,svg.indexOf('>')));
 assert.equal(root.viewBox,'0 0 320 180');assert.equal(320%16,0);assert.equal(root.preserveAspectRatio,'xMidYMax slice');assert.equal(root['shape-rendering'],'crispEdges');assert.ok(Buffer.byteLength(svg)<=60000);
 const groups=[...svg.matchAll(/<g id="(forest-(?:far|near))">([\s\S]*?)<\/g>/g)];assert.deepEqual(groups.map(g=>g[1]),['forest-far','forest-near']);
 for(const [,name,body] of groups){
  const pixels=Array.from({length:180},()=>Array(320).fill('.'));
  for(const match of body.matchAll(/<rect\b[^>]*\/>/g)){
   const r=attrs(match[0]);assert.ok(Object.values(PALETTE).includes(r.fill));
   for(const k of ['x','y','width','height'])assert.ok(Number.isInteger(+r[k]));
   assert.ok(+r.x>=0&&+r.y>=0&&+r.width>0&&+r.height>0&&+r.x+ +r.width<=320&&+r.y+ +r.height<=180);
   for(let y=+r.y;y<+r.y+ +r.height;y++)for(let x=+r.x;x<+r.x+ +r.width;x++)pixels[y][x]=r.fill;
  }
  for(let y=0;y<180;y++)assert.equal(pixels[y][0],pixels[y][319],`${name} seam y=${y}`);
  if(name==='forest-near')assert.ok(pixels[150].every(c=>c!=='.'));
 }
});
test('preview generates all combinations and its clock, steps and SVG references work',()=>{
 const html=execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/sprite-preview.mjs',import.meta.url)),'--stdout'],{encoding:'utf8',maxBuffer:4*1024*1024});
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1],nodes=new Map();
 const node=()=>({textContent:'',innerHTML:'',attrs:{},querySelector(){return this.defs??=node();},setAttribute(k,v){this.attrs[k]=v;}});
 const lives=[...html.matchAll(/class="live" data-name="([^"]+)" data-action="([^"]+)" data-items="([^"]*)" data-count="([^"]+)"/g)].map(([,name,action,items,count])=>({dataset:{name,action,items,count},svg:node(),span:node(),querySelector(s){return s==='svg'?this.svg:this.span;}}));
 const document={querySelectorAll:()=>lives,getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},documentElement:{style:{setProperty(){}}}};
 let callback;
 vm.runInNewContext(code,{document,performance:{now:()=>0},requestAnimationFrame(fn){callback=fn;}});
 assert.equal(lives.length,30);
 assert.ok(document.getElementById('clock').textContent.endsWith(' 0'));
 document.getElementById('step').onclick();
 assert.ok(document.getElementById('clock').textContent.endsWith(' 1'));
 assert.equal(document.getElementById('near-scroll').attrs.transform,'translate(-8 0)');
 assert.equal(document.getElementById('far-scroll').attrs.transform,'translate(-2 0)');
 document.getElementById('play').onclick();callback(341);
 assert.equal(document.getElementById('near-scroll').attrs.transform,'translate(-16 0)');
 assert.equal(document.getElementById('far-scroll').attrs.transform,'translate(-4 0)');
 const allIds=[...html.slice(0,html.indexOf('<script>')).matchAll(/id="([^"]+)"/g)].map(m=>m[1]),ids=new Set(allIds);
 assert.equal(ids.size,allIds.length);
 for(const markup of [html.slice(0,html.indexOf('<script>')),...lives.map(el=>el.svg.innerHTML),document.getElementById('actors').innerHTML])for(const m of markup.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(m[1]),m[1]);
 document.getElementById('theme-mist').onclick();assert.match(document.getElementById('objects-mid').innerHTML,/px-obj-stone-pillar/);
 assert.equal(document.getElementById('theme-mist').attrs['aria-pressed'],'true');
 assert.match(document.getElementById('live-flower').innerHTML,/2 ?/);
 document.getElementById('reset').onclick();assert.ok(document.getElementById('clock').textContent.endsWith(' 0'));
});
