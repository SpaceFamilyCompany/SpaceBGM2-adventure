import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE } from '../scripts/pixel-art.mjs';
import { LANES, THEMES, OBJECTS, objectSheet } from '../scripts/forest-objects.mjs';
import { forestScene } from '../scripts/forest-scene.mjs';
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const voices=['chime','drip','rustle','pop','glass','creak','bell-low','whoosh','pluck-low','wood'];
test('object grids, animation and score contract',()=>{
 assert.ok(Object.keys(OBJECTS).length>=16);
 assert.deepEqual(LANES,{far:{pxPerBeat:4,y:[60,120]},mid:{pxPerBeat:8,y:[90,150]},near:{pxPerBeat:16,y:[150,178]}});
 assert.deepEqual(THEMES,[{id:'entrance',floors:[1,3]},{id:'deep',floors:[4,7]},{id:'mist',floors:[8,9]},{id:'clearing',floors:[10,10]}]);
 for(const [id,o] of Object.entries(OBJECTS)){
  assert.ok(LANES[o.lane]);assert.ok(o.weight>0);assert.ok(Number.isInteger(o.width)&&o.width>0);assert.ok(Number.isInteger(o.height)&&o.height>0);
  assert.ok(o.baseline>=LANES[o.lane].y[0]&&o.baseline<=LANES[o.lane].y[1]);
  assert.equal(o.frames.length,4);assert.ok(new Set(o.frames.map(g=>g.join('\n'))).size>1,id+' animates');
  for(const grid of o.frames){assert.equal(grid.length,o.height);for(const row of grid){assert.equal(row.length,o.width);for(const c of row)assert.ok(c==='.'||Object.hasOwn(PALETTE,c));}}
  assert.ok(voices.includes(o.sound.voice));assert.ok(o.sound.frames.length);assert.equal(new Set(o.sound.frames).size,o.sound.frames.length);
  for(const f of o.sound.frames)assert.ok(Number.isInteger(f)&&f>=0&&f<4);
  for(const t of o.themes)assert.ok(THEMES.some(theme=>theme.id===t));
 }
 for(const {id} of THEMES)for(const lane of Object.keys(LANES))assert.ok(Object.values(OBJECTS).some(o=>o.lane===lane&&o.themes.includes(id)),id+' '+lane);
 assert.equal(OBJECTS.arch.lane,'near');assert.ok(OBJECTS.arch.height>=60);assert.deepEqual(OBJECTS.arch.themes,THEMES.map(t=>t.id));
 for(const g of OBJECTS.arch.frames)for(let y=30;y<72;y++)assert.equal(g[y].slice(12,52),'.'.repeat(40));
});
test('object symbols reproduce grids with unique ids and merged runs within 200KB',()=>{
 const sheet=objectSheet(),symbols=[...sheet.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)];
 assert.ok(Buffer.byteLength(sheet)<=200000);assert.equal(symbols.length,Object.keys(OBJECTS).length*4);
 const expected=Object.entries(OBJECTS).flatMap(([id,o])=>o.frames.map((grid,f)=>({id:`px-obj-${id}-${f}`,o,grid})));
 assert.equal(new Set(symbols.map(s=>attrs(s[1]).id)).size,symbols.length);
 symbols.forEach((s,index)=>{
  const {id,o,grid}=expected[index],a=attrs(s[1]);assert.equal(a.id,id);assert.equal(a.viewBox,`0 0 ${o.width} ${o.height}`);assert.equal(a['shape-rendering'],'crispEdges');
  const pixels=Array.from({length:o.height},()=>Array(o.width).fill('.'));
  for(const g of s[2].matchAll(/<g fill="([^"]+)">([\s\S]*?)<\/g>/g)){
   const c=Object.entries(PALETTE).find(([,color])=>color===g[1])?.[0];assert.ok(c);
   for(const m of g[2].matchAll(/<rect\b[^>]*\/>/g)){
    const r=attrs(m[0]);for(const k of ['x','y','width','height'])assert.ok(Number.isInteger(+r[k]));
    assert.ok(+r.width>0&&+r.height>0&&+r.x>=0&&+r.y>=0&&+r.x+ +r.width<=o.width&&+r.y+ +r.height<=o.height);
    for(let y=+r.y;y<+r.y+ +r.height;y++)for(let x=+r.x;x<+r.x+ +r.width;x++){assert.equal(pixels[y][x],'.');pixels[y][x]=c;}
    for(let y=+r.y;y<+r.y+ +r.height;y++){assert.notEqual(grid[y][+r.x-1],c);assert.notEqual(grid[y][+r.x+ +r.width],c);}
   }
  }
  assert.deepEqual(pixels.map(r=>r.join('')),grid);
 });
});
test('all terrain themes tile seamlessly, ground starts at 150 and combined size <=80KB',()=>{
 const scenes=THEMES.map(t=>forestScene(t.id));assert.equal(new Set(scenes).size,4);assert.equal(forestScene(),scenes[0]);
 assert.ok(scenes.reduce((n,s)=>n+Buffer.byteLength(s),0)<=80000);assert.throws(()=>forestScene('missing'),RangeError);
 for(const svg of scenes){
  assert.equal(attrs(svg.slice(0,svg.indexOf('>'))).viewBox,'0 0 320 180');
  const groups=[...svg.matchAll(/<g id="([^"]+)">([\s\S]*?)<\/g>/g)];assert.deepEqual(groups.map(g=>g[1]),['forest-far','forest-near']);
  for(const [,id,body] of groups){
   const pixels=Array.from({length:180},()=>Array(320).fill('.'));
   for(const m of body.matchAll(/<rect\b[^>]*\/>/g)){
    const r=attrs(m[0]);assert.ok(Object.values(PALETTE).includes(r.fill));
    for(const k of ['x','y','width','height'])assert.ok(Number.isInteger(+r[k]));
    assert.ok(+r.x>=0&&+r.y>=0&&+r.width>0&&+r.height>0&&+r.x+ +r.width<=320&&+r.y+ +r.height<=180);
    for(let y=+r.y;y<+r.y+ +r.height;y++)for(let x=+r.x;x<+r.x+ +r.width;x++)pixels[y][x]=r.fill;
   }
   for(let y=0;y<180;y++)assert.equal(pixels[y][0],pixels[y][319],`${id} ${y}`);
   if(id==='forest-near'){assert.ok(pixels.slice(0,150).every(r=>r.every(c=>c==='.')));assert.ok(pixels.slice(150).every(r=>r.every(c=>c!=='.')));}
  }
 }
});
