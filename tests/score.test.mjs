import test from 'node:test';import assert from 'node:assert/strict';
import {composeTrack,renderTrack,encodeWav,stepAt,secondsAt,turnMs,deckFor,toChord,layoutArea,cardTurns,SOUND_FRAMES,SEGMENT_STEPS,TURN_STEPS,DECK_SIZE,MUSIC_RATE,HERO_X,WEAPONS,ARMORS,TRIALS,MONSTER_HP,MAX_BATTLE_TURNS} from '../web/score.mjs';
import {STORY_SOUND_FRAMES} from '../scripts/story-art.mjs';
import {sceneAt} from '../web/scene.mjs';
import {SOUND_FRAMES as ART_FRAMES} from '../scripts/pixel-art.mjs';
import {MONSTER_SPRITES} from '../scripts/monsters.mjs';
import * as world from '../scripts/forest-objects.mjs';
import {deckFor as serverDeck,cardTurns as serverTurns,TRIALS as SERVER_TRIALS,MONSTER_HP as SERVER_HP,MAX_BATTLE_TURNS as SERVER_MAX,STEP_MS,MONSTERS} from '../server/game.mjs';
const run={zone:'forest',running:true,cycle:0,card:0,weapon:'leaf-blade',armor:'moss-cloak',companion:true};

test('score, pixel art and server agree on sounding frames, the shuffled deck and the card length',()=>{
 for(const [key,frames] of Object.entries({...ART_FRAMES,...STORY_SOUND_FRAMES}))assert.deepEqual(SOUND_FRAMES[key],frames,key);
 for(const [id,trial] of Object.entries(TRIALS)){assert.equal(trial.default,SERVER_TRIALS[id].default);assert.deepEqual(trial.options.map(o=>o.id),Object.keys(SERVER_TRIALS[id].options));}
 assert.deepEqual(MONSTER_HP,SERVER_HP);assert.equal(MAX_BATTLE_TURNS,SERVER_MAX);
 for(let c=0;c<30;c++)for(const card of deckFor(c))for(const p of [1,2,3,5])assert.equal(cardTurns(card,{power:p}),serverTurns(card,p));
 for(const id of MONSTERS)if(id!=='slime'){assert.ok(SOUND_FRAMES[id+'.bounce'],id);assert.equal(MONSTER_SPRITES[id].bounce.length,4);assert.equal(MONSTER_SPRITES[id].hit.length,2);}
 for(let cycle=0;cycle<200;cycle++)assert.deepEqual(deckFor(cycle),serverDeck(cycle));
 assert.equal(turnMs('forest'),STEP_MS);
 const t=composeTrack(run,world),turns=t.segments.reduce((a,s)=>a+s.turns,0);
 assert.equal(t.segments.length,DECK_SIZE);assert.equal(t.steps,turns*TURN_STEPS);
 assert.ok(Math.abs(t.duration*1000-turns*STEP_MS)<5,'one turn of music lasts one server step');
 assert.deepEqual(t.segments.map(s=>s.mood),deckFor(0).map(c=>c.kind));
});

test('every deck is shuffled differently but always starts on the road and ends with the guardian',()=>{
 const seen=new Set();
 for(let cycle=0;cycle<60;cycle++){
  const deck=deckFor(cycle),kinds=deck.map(c=>c.kind);seen.add(kinds.join());
  assert.equal(deck.length,DECK_SIZE);assert.equal(kinds[0],'travel');assert.equal(kinds.at(-1),'boss');
  assert.equal(kinds.filter(k=>k==='travel').length,5);assert.equal(kinds.filter(k=>k==='battle').length,3);assert.equal(kinds.filter(k=>k==='treasure').length,2);assert.equal(kinds.filter(k=>TRIALS[k]).length,1);
  for(const c of deck.filter(c=>c.kind==='battle')){assert.ok(c.foes>=1&&c.foes<=3);assert.equal(c.monsters.length,c.foes);}
 }
 assert.ok(seen.size>50,'decks differ from cycle to cycle');
});

test('every party sound starts exactly when a character enters a sounding frame',()=>{
 const t=composeTrack({...run,weapon:null},world),heroSteps=new Set(t.notes.filter(n=>n.bus==='hero').map(n=>n.step));
 for(const s of heroSteps){const [,action,frame]=t.actors.hero[s].split('-');assert.ok(SOUND_FRAMES['hero.'+action].includes(+frame),'hero sound at step '+s);assert.notEqual(t.actors.hero[s],t.actors.hero[(s+t.steps-1)%t.steps]);}
 for(let s=1;s<t.steps;s++)if(t.actors.hero[s]===t.actors.hero[s-1])assert.ok(!heroSteps.has(s));
 // 森の生き物の待機（idle）は音の出ないコマだけ。守り人の idle は足踏み（地響き）なので対象外。
 for(const id of ['owl','frog','firefly']){assert.ok(!SOUND_FRAMES[id+'.idle']);assert.ok(t.actors[id].some(e=>e.includes('-idle-')),id+' has idle motion');}
});

test('battles bring one to three monsters that bounce on different beats and take turns being hit',()=>{
 let cycle=0;while(!deckFor(cycle).some(c=>c.foes===3))cycle++;
 const t=composeTrack({...run,cycle},world),seg=t.segments.find(s=>s.foes===3);
 const beats=k=>{const f=t.actors['foe'+k],out=new Set();for(let s=seg.start+8;s<seg.start+24;s++){const [sprite,action,frame]=f[s].split('-');if(action==='bounce'&&SOUND_FRAMES[sprite+'.bounce']?.includes(+frame)&&f[s]!==f[s-1])out.add(s%4);}return [...out].sort().join();};
 assert.notEqual(beats(0),beats(1),'second monster answers on another beat');
 for(const k of [0,1,2]){
  const f=t.actors['foe'+k].slice(seg.start,seg.start+seg.steps);
  assert.ok(f.every(Boolean),'monster '+k+' is on stage for the whole card');
  assert.ok(f.some(e=>e.includes('hit-0')),'monster '+k+' gets hit');
  f.forEach((e,i)=>{if(e.includes('hit-1'))assert.ok(f[i-1].includes('hit-0'));});
 }
 const road=t.segments.find(s=>s.mood==='travel');assert.equal(t.actors.foe1[road.start],'','only one sprite on road cards');
});

test('fills, breaks and swing keep the loop from sounding the same every card',()=>{
 const t=composeTrack(run,world),hero=t.actors.hero,roads=t.segments.filter(s=>s.mood==='travel');
 const tail=seg=>hero.slice(seg.start+28,seg.start+32).join(' ');
 // 道のカードは、めくるたびに表情が変わる: 1枚目 そのまま → 2枚目 ラン → 3枚目 ため → 4枚目 ブレイク
 assert.equal(tail(roads[0]),'hero-walk-0 hero-walk-1 hero-walk-2 hero-walk-3');
 assert.equal(tail(roads[1]),'hero-walk-0 hero-walk-2 hero-walk-0 hero-walk-2','ラン: quick steps');
 assert.equal(tail(roads[2]),'hero-walk-3 hero-walk-3 hero-walk-0 hero-walk-2','ため: hold, then catch up with two steps');
 assert.ok(t.moving.slice(roads[3].start,roads[3].start+roads[3].steps).some(m=>!m),'4th road card stops for a break bar');
 assert.ok(t.stepTimes[roads[0].start+1]-t.stepTimes[roads[0].start]<t.stepTimes[roads[2].start+1]-t.stepTimes[roads[2].start],'3rd road card swings the off-beat later');
 assert.equal(stepAt(t,t.stepTimes[70]+.001).step,70);
 const beat=60/t.bpm,seg=t.segments[3];assert.ok(Math.abs(secondsAt(t,3,1,.5)-(seg.start+12)/2*beat)<.05);
});

test('each deck is one long scroll: scenery never pops between cards, and gates pass Yuppi between road cards',()=>{
 const area=layoutArea(world,'forest',0),t=composeTrack(run,world,area);
 const moved=[0];for(let s=0;s<t.steps;s++)moved.push(moved[s]+(t.moving[s]?1:0));
 for(const o of t.objects)for(let s=1;s<t.steps;s++){const dx=(moved[s]-moved[s-1])*o.pxPerStep;assert.ok(dx===0||dx===o.pxPerStep);}
 const arches=area.lanes.near.objects.filter(o=>o.id==='arch');
 for(const seg of t.segments.filter(s=>s.mood==='travel'&&s.card>0&&t.segments[s.card-1].mood==='travel'))assert.ok(arches.some(o=>o.x===HERO_X-32+moved[seg.start]*8),'gate at card '+seg.card);
 // 立ち止まるカード（戦闘・宝箱・守り人）の間は、ゆっぴの上に門がない
 for(const seg of t.segments.filter(s=>s.mood!=='travel'))for(const o of arches){const sx=((o.x-moved[seg.start]*8)%o.period+o.period)%o.period;assert.ok(!(sx<=HERO_X&&sx+64>=HERO_X),'no gate over Yuppi at card '+seg.card);}
});

test('same state renders identical audio; gear changes the timbre but not the timing',()=>{
 const rest={...run,running:false,card:3};
 const a=renderTrack(composeTrack(rest,world)),b=renderTrack(composeTrack(rest,world));
 assert.deepEqual(a,b);
 const plain=composeTrack({...rest,weapon:null,armor:null},world),geared=composeTrack(rest,world);
 assert.equal(plain.duration,geared.duration);assert.deepEqual(plain.actors,geared.actors);assert.notEqual(plain.key,geared.key);
 const wav=encodeWav(a);assert.equal(Buffer.from(wav.slice(0,4)).toString(),'RIFF');assert.equal(new DataView(wav.buffer).getUint32(24,true),MUSIC_RATE);
 let peak=0;for(const v of a)peak=Math.max(peak,Math.abs(v));assert.ok(peak>.1&&peak<.95,'audible without clipping: '+peak);
});

test('every pitched note is a tone of its bar chord and stops ringing when the chord changes',()=>{
 assert.equal(toChord(65,[52,55,59]),64,'F snaps to E over E minor');assert.equal(toChord(66,[52,55,59]),67);
 for(const state of [run,{...run,running:false},{...run,cycle:7,weapon:'crystal-staff',armor:'star-cloak'},{...run,armor:'prism-mail'}]){
  const t=composeTrack(state,world),chords=t.chords;
  for(const n of t.notes){
   if(n.midi!=null)assert.ok(chords[(n.step>>3)%8].map(x=>x%12).includes(n.midi%12),`${n.inst} midi ${n.midi} at step ${n.step} is outside its chord`);
   assert.ok(n.end<=t.stepTimes[Math.min(t.steps,((n.step>>3)+1)*8)]+1e-9,'note ends with its bar');
  }
 }
});

test('weapons change the attack rhythm, and the slash pose lands exactly on every hit',()=>{
 let cycle=0;while(!deckFor(cycle).some(c=>c.kind==='battle'))cycle++;
 for(const [weapon,{hits}] of Object.entries(WEAPONS)){
  const t=composeTrack({...run,cycle,weapon},world),seg=t.segments.find(s=>s.mood==='battle');
  assert.deepEqual(t.hits,hits);
  const swing=seg.start+10; // 攻撃の3周目、斬撃のポーズに入るコマ
  assert.equal(t.actors.hero[swing],'hero-attack-2');
  const hitNotes=t.notes.filter(n=>n.bus==='hero'&&n.step>=swing&&n.step<swing+2&&n.gain>.3).map(n=>n.step-swing+n.off);
  assert.deepEqual(hitNotes.map(x=>+x.toFixed(3)),hits.map(h=>+h.toFixed(3)),weapon+' hits');
  // その瞬間の絵は斬撃のポーズ（コマ2）
  for(const h of hits){const step=swing+Math.floor(h),off=h-Math.floor(h),sec=t.stepTimes[step]+off*(t.stepTimes[step+1]-t.stepTimes[step])+.001;
   assert.ok(sceneAt(t,sec).items.some(i=>i.key==='hero-attack-2'),weapon+' shows the slash at hit '+h);}
 }
});

test('armor changes the genre: instruments, chords and swing',()=>{
 const plain=composeTrack({...run,armor:null},world),lofi=composeTrack({...run,armor:'moss-cloak'},world),chip=composeTrack({...run,armor:'prism-mail'},world),orch=composeTrack({...run,armor:'star-cloak'},world);
 const insts=t=>new Set(t.notes.map(n=>n.inst));
 assert.equal(lofi.genre,'ローファイ・チル');assert.ok(insts(lofi).has('epiano')&&insts(lofi).has('brush'));assert.equal(lofi.chords[0].length,4,'7th chords');
 assert.ok(lofi.stepTimes[1]-lofi.stepTimes[0]>plain.stepTimes[1]-plain.stepTimes[0],'lo-fi swings harder');
 assert.equal(chip.genre,'チップチューン');for(const i of insts(chip))assert.ok(['square','square-pad','pulse-bass','noise-hat','kick'].includes(i),'chiptune instrument '+i);
 assert.ok(Math.abs((chip.stepTimes[1]-chip.stepTimes[0])-(chip.stepTimes[2]-chip.stepTimes[1]))<1e-9,'chiptune is straight');
 assert.equal(orch.genre,'シンフォニック');assert.ok(insts(orch).has('strings')&&insts(orch).has('timpani'));
 // ジャンルが変わっても、動きの並びは同じ（楽器が変わるだけ）
 assert.deepEqual(lofi.actors,plain.actors);
 for(const id of Object.keys(ARMORS))assert.ok(ARMORS[id].trait);for(const id of Object.keys(WEAPONS))assert.ok(WEAPONS[id].trait);
});

test('rhythm game: world sounds are tagged, uncollected ones sound muted, and events list them in time order',async()=>{
 const {SOUND_NAMES,COLLECT_GAIN}=await import('../web/score.mjs');const {SOUNDS}=await import('../server/game.mjs');
 assert.deepEqual(Object.keys(SOUND_NAMES).sort(),[...SOUNDS].sort());
 for(const id of Object.keys(world.OBJECTS))assert.ok(SOUND_NAMES[id],'object '+id+' has a sound name');
 const wild=composeTrack(run,world),tamed=composeTrack({...run,songbook:['frog','slime']},world);
 assert.notEqual(wild.key,tamed.key);
 const gainOf=(t,src)=>t.notes.filter(n=>n.src===src).map(n=>n.gain);
 assert.ok(gainOf(wild,'frog').length>0);
 gainOf(wild,'frog').forEach((g,i)=>assert.ok(Math.abs(g/COLLECT_GAIN-gainOf(tamed,'frog')[i])<1e-9,'collected frog sounds clearer'));
 for(let i=1;i<wild.events.length;i++)assert.ok(wild.events[i].t>=wild.events[i-1].t);
 for(const e of wild.events)assert.ok(SOUND_NAMES[e.src]);
 assert.ok(!wild.notes.some(n=>n.bus==='hero'&&n.src),'Yuppi and the party are not collectible');
});
