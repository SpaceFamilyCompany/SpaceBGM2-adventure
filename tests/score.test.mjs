import test from 'node:test';import assert from 'node:assert/strict';
import {composeTrack,renderTrack,encodeWav,stepAt,secondsForFloor,moodForFloor,floorMs,SOUND_FRAMES,SEGMENT_STEPS,FLOORS,MUSIC_RATE} from '../web/score.mjs';
import {SOUND_FRAMES as ART_FRAMES} from '../scripts/pixel-art.mjs';
import * as world from '../scripts/forest-objects.mjs';
import {eventFor,STEP_MS} from '../server/game.mjs';
const run={zone:'forest',running:true,floor:1,weapon:'leaf-blade',armor:'moss-cloak',companion:true};

test('score and pixel art agree on which frames make sound, and the dungeon run matches the server',()=>{
 assert.deepEqual(SOUND_FRAMES,ART_FRAMES);
 for(let floor=1;floor<=10;floor++)assert.equal(moodForFloor(floor),eventFor({floor}));
 assert.equal(floorMs('forest'),STEP_MS);
 const t=composeTrack(run,world);
 assert.equal(t.segments.length,FLOORS);assert.equal(t.steps,FLOORS*SEGMENT_STEPS);
 assert.ok(Math.abs(t.duration*1000-FLOORS*STEP_MS)<5,'one floor of music lasts one server step');
 assert.deepEqual(t.segments.map(s=>s.mood),Array.from({length:10},(_,i)=>eventFor({floor:i+1})));
});

test('every party sound starts exactly when a character enters a sounding frame',()=>{
 const t=composeTrack(run,world),heroSteps=new Set(t.notes.filter(n=>n.bus==='hero').map(n=>n.step));
 for(const s of heroSteps){const [,action,frame]=t.actors.hero[s].split('-');assert.ok(SOUND_FRAMES['hero.'+action].includes(+frame),'hero sound at step '+s);assert.notEqual(t.actors.hero[s],t.actors.hero[(s+t.steps-1)%t.steps]);}
 // 止まっている（同じコマが続く）間は鳴らない
 for(let s=1;s<t.steps;s++)if(t.actors.hero[s]===t.actors.hero[s-1])assert.ok(!heroSteps.has(s));
 // 手前の物は触れた時だけ動く: 動いていないコマ（idle）の間は同じコマのまま
 for(const o of t.objects.filter(o=>o.lane==='near'&&o.id!=='arch'))assert.ok(new Set(o.frames).size<=4);
});

test('fills, breaks and swing keep the loop from sounding the same every floor',()=>{
 const t=composeTrack(run,world),hero=t.actors.hero,tail=seg=>hero.slice(seg*SEGMENT_STEPS+28,seg*SEGMENT_STEPS+32).join(' ');
 assert.equal(tail(0),'hero-walk-0 hero-walk-1 hero-walk-2 hero-walk-3');
 assert.equal(tail(2),'hero-walk-3 hero-walk-3 hero-walk-0 hero-walk-2','ため: floor 3 holds, then catches up with two steps');
 assert.ok(t.moving.slice(0,SEGMENT_STEPS).every(Boolean));
 assert.ok(t.moving.slice(0,SEGMENT_STEPS*4).some(m=>!m),'a travel floor stops for a break bar');
 const beat=60/t.bpm;assert.ok(t.stepTimes[1]-t.stepTimes[0]<t.stepTimes[SEGMENT_STEPS*2+1]-t.stepTimes[SEGMENT_STEPS*2],'floor 3 swings the off-beat later');
 assert.equal(stepAt(t,t.stepTimes[70]+.001).step,70);
 assert.ok(Math.abs(secondsForFloor(t,4,.5)-3.5*16*beat)<1e-9);
});

test('same state renders identical audio; gear changes the timbre but not the timing',()=>{
 const rest={...run,running:false,floor:3};
 const a=renderTrack(composeTrack(rest,world)),b=renderTrack(composeTrack(rest,world));
 assert.deepEqual(a,b);
 const plain=composeTrack({...rest,weapon:null,armor:null},world),geared=composeTrack(rest,world);
 assert.equal(plain.duration,geared.duration);assert.deepEqual(plain.actors,geared.actors);assert.notEqual(plain.key,geared.key);
 const wav=encodeWav(a);assert.equal(Buffer.from(wav.slice(0,4)).toString(),'RIFF');assert.equal(new DataView(wav.buffer).getUint32(24,true),MUSIC_RATE);
 let peak=0;for(const v of a)peak=Math.max(peak,Math.abs(v));assert.ok(peak>.1&&peak<.95,'audible without clipping: '+peak);
});

test('every pitched note is a tone of its bar chord and stops ringing when the chord changes',async()=>{
 const {toChord}=await import('../web/score.mjs');
 assert.equal(toChord(65,[52,55,59]),64,'F snaps to E over E minor');assert.equal(toChord(66,[52,55,59]),67);
 for(const state of [run,{...run,running:false},{...run,weapon:'crystal-staff',armor:'star-cloak'}]){
  const t=composeTrack(state,world);
  const chord=s=>[[52,55,59],[48,52,55],[43,47,50],[50,54,57],[52,55,59],[48,52,55],[45,48,52],[47,51,54]][(s>>3)%8].map(n=>n%12);
  for(const n of t.notes){
   if(n.midi!=null)assert.ok(chord(n.step).includes(n.midi%12),`${n.inst} midi ${n.midi} at step ${n.step} is outside its chord`);
   assert.ok(n.end<=t.stepTimes[Math.min(t.steps,((n.step>>3)+1)*8)]+1e-9,'note ends with its bar');
  }
 }
});
