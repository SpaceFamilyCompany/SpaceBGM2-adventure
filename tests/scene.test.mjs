import test from 'node:test';import assert from 'node:assert/strict';
import {composeTrack,SEGMENT_STEPS,VIEW_LEFT,VIEW_RIGHT,HERO_X} from '../web/score.mjs';
import {sceneAt,SPOTS,FOE_X,SPRITE_SIZE} from '../web/scene.mjs';
import * as world from '../scripts/forest-objects.mjs';
import {CREATURE_SPRITES} from '../scripts/creature-motion.mjs';
import {MONSTER_SPRITES} from '../scripts/monsters.mjs';
import {EQUIPMENT_LAYERS} from '../scripts/pixel-art.mjs';

// build.mjs と同じ規則で、描けるドット絵の名前をそろえる
const keys=new Set();
for(const [sprite,actions] of Object.entries({...CREATURE_SPRITES,...MONSTER_SPRITES}))for(const [action,frames] of Object.entries(actions))frames.forEach((_,f)=>keys.add(`${sprite}-${action}-${f}`));
for(const [item,layers] of Object.entries(EQUIPMENT_LAYERS))for(const [layer,actions] of Object.entries(layers))for(const [action,frames] of Object.entries(actions))frames.forEach((_,f)=>keys.add(`eq:${item}-${layer}-${action}-${f}`));
for(const [id,o] of Object.entries(world.OBJECTS))o.frames.forEach((_,f)=>keys.add(`obj:${id}-${f}`));
const gear=Object.entries(EQUIPMENT_LAYERS).flatMap(([id,layers])=>Object.keys(layers).map(layer=>id+':'+layer));
const scenes=function*(track,every=1){for(let s=0;s<track.steps;s+=every)for(const fr of [0,.5])yield sceneAt(track,track.stepTimes[s]+(track.stepTimes[s+1]-track.stepTimes[s])*fr,gear);};

test('every drawn sprite exists and sits inside the stage',()=>{
 for(const state of [{running:true,cycle:0},{running:true,cycle:3},{running:false,cycle:2,card:5}]){
  const t=composeTrack({zone:'forest',companion:true,weapon:'leaf-blade',armor:'moss-cloak',...state},world);
  for(const scene of scenes(t)){
   assert.equal(scene.items.filter(i=>i.kind==='bg').length,2,'sky and ground');
   for(const i of scene.items.filter(i=>i.kind==='sprite')){
    assert.ok(keys.has(i.key),'missing art '+i.key);
    assert.ok(i.y>=0&&i.y<=180,'y inside the world: '+i.key+' '+i.y);
    if(!i.key.startsWith('obj:')&&!i.key.startsWith('eq:'))assert.ok(i.x+SPRITE_SIZE>VIEW_LEFT-120&&i.x<VIEW_RIGHT+120,'x near the stage: '+i.key+' '+i.x);
   }
  }
 }
});

test('the frog and the grass never stand where monsters fight',()=>{
 const monsters=Object.values(FOE_X).flat();
 for(const x of monsters){assert.ok(x+SPRITE_SIZE<=SPOTS.frog[0]+4,'monster at '+x+' overlaps the frog');}
 assert.ok(SPOTS.frog[0]+SPRITE_SIZE>VIEW_RIGHT-8||SPOTS.frog[0]>=Math.max(...monsters)+SPRITE_SIZE-4);
});

test('no gate hangs over Yuppi while the party stands still',()=>{
 for(let cycle=0;cycle<6;cycle++){
  const t=composeTrack({zone:'forest',running:true,cycle,companion:true},world);
  for(const scene of scenes(t,2)){
   if(scene.seg.mood==='travel')continue;
   for(const i of scene.items.filter(i=>i.key?.startsWith('obj:arch')))assert.ok(!(i.x<=HERO_X&&i.x+64>=HERO_X),`gate over Yuppi at cycle ${cycle} step ${scene.step}`);
  }
 }
});

test('a new deck opens on the forest entrance, not on scenery left from the end of the last deck',()=>{
 for(let cycle=0;cycle<8;cycle++){
  const t=composeTrack({zone:'forest',running:true,cycle,companion:true},world),first=sceneAt(t,0,gear);
  assert.equal(first.theme,'entrance');
  for(const i of first.items.filter(i=>i.key?.startsWith('obj:'))){
   const id=i.key.slice(4).replace(/-\d$/,'');
   assert.ok(id==='arch'||world.OBJECTS[id].themes.includes('entrance'),`${id} at the start of deck ${cycle}`);
  }
 }
});

test('the same moment always draws the same picture, and gear is layered around Yuppi',()=>{
 const t=composeTrack({zone:'forest',running:true,cycle:1,companion:true},world);
 const a=sceneAt(t,12.34,gear),b=sceneAt(t,12.34,gear);assert.deepEqual(a,b);
 const order=a.items.map(i=>i.key??i.layer),hero=order.findIndex(k=>/^hero-/.test(k));
 assert.ok(order.findIndex(k=>k?.startsWith('eq:moss-cloak-back'))<hero,'cloak behind Yuppi');
 assert.ok(order.findIndex(k=>k?.startsWith('eq:leaf-blade-front'))>hero,'blade in front of Yuppi');
 assert.ok(order.indexOf('near')<hero,'ground behind the party');
});

test('monsters slide in from the right, then stand at their places on the beat',()=>{
 let cycle=0;const withFoes=()=>composeTrack({zone:'forest',running:true,cycle,companion:true},world);
 let t=withFoes();while(!t.segments.some(s=>s.foes===3)){cycle++;t=withFoes();}
 const seg=t.segments.find(s=>s.foes===3),at=step=>sceneAt(t,t.stepTimes[step],gear).items.filter(i=>/^(slime|mushling|beetle|wisp)-/.test(i.key));
 const start=at(seg.start),settled=at(seg.start+12);
 assert.equal(settled.length,3);
 assert.ok(Math.max(...start.map(i=>i.x))>Math.max(...settled.map(i=>i.x)),'enter from the right');
 for(const i of settled)assert.ok(FOE_X[3].some(x=>Math.abs(i.x-x)<=8),'monster near its place: '+i.x);
});
