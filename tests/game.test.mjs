import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,advanceGame,applyAction,unlocked,deckFor,cardFor,cardTurns,combatPower,TRIALS,OFFLINE_LIMIT,STEP_MS,DECK_SIZE,PROLOGUE_TURNS,MAX_BATTLE_TURNS} from '../server/game.mjs';
const now=1000000;
const fresh=at=>({...initialGame(at),prologue:0});
// 山札0束目の中で、指定した種類のカードの位置から始める。
const at=(g,kind)=>{g.cycle=0;g.card=deckFor(0).findIndex(c=>c.kind===kind);g.turn=0;return g;};
// いまのカードを終えるまで進める（1ターン = STEP_MS）。
const finish=g=>advanceGame(g,g.lastAt+STEP_MS*(cardTurns(cardFor(g),combatPower(g))-g.turn)).game;
const finishCards=(g,n)=>{for(let i=0;i<n;i++)g=finish(g);return g;};

test('elapsed rewards are deterministic and cannot be collected twice',()=>{
 const g=fresh(now),t=now+STEP_MS*20,a=advanceGame(g,t);assert.ok(a.game.card>=3);assert.ok(a.game.coins>60);assert.equal(a.report.steps,20);
 assert.deepEqual(advanceGame(g,t),a);assert.equal(advanceGame(a.game,t).report.coins,0);assert.equal(g.coins,60);
});
test('a card lasts several turns, and nothing is paid until it ends',()=>{
 let g=fresh(now);assert.equal(cardTurns(cardFor(g)),4);
 g=advanceGame(g,now+STEP_MS*3).game;assert.equal(g.card,0);assert.equal(g.turn,3);assert.equal(g.coins,60);
 g=advanceGame(g,now+STEP_MS*4).game;assert.equal(g.card,1);assert.equal(g.turn,0);assert.equal(g.coins,68);
});
test('battles and the guardian take turns from monster HP and attack power, capped at thirty',()=>{
 const slimes={kind:'battle',foes:3,monsters:['slime','slime','beetle']};
 assert.equal(cardTurns(slimes,1),8);assert.equal(cardTurns(slimes,2),5);assert.equal(cardTurns(slimes,7),2+1);
 const guardian=deckFor(0).at(-1);assert.equal(cardTurns(guardian,1),25);assert.equal(cardTurns(guardian,3),9);
 assert.equal(cardTurns({kind:'boss',foes:1,monsters:['guardian','guardian']},1),MAX_BATTLE_TURNS,'forced win after thirty turns');
});
test('after the last card a new deck is shuffled',()=>{
 const g=finishCards(fresh(now),DECK_SIZE+2);assert.equal(g.cycle,1);assert.equal(g.card,2);
 assert.notDeepEqual(deckFor(0).map(c=>c.kind),deckFor(1).map(c=>c.kind));
});
test('three marks open the path of the guardian, and the next region unlocks at level three',()=>{
 let g=at(applyAction(fresh(now),{type:'train'},now),'boss');g.marks=['fork','alms','altar'];g=finish(g);
 assert.equal(g.clears.forest,1);assert.ok(g.crystals>=1);assert.equal(g.card,0);assert.equal(g.cycle,1);assert.equal(g.chapterDone,true);
 assert.equal(unlocked(g,'cave'),false);g=applyAction(g,{type:'train'},g.lastAt);assert.equal(unlocked(g,'cave'),true);g=applyAction(g,{type:'zone',zone:'cave'},g.lastAt);assert.equal(g.zone,'cave');assert.equal(g.card,0);
});
test('without three marks the guardian sends the party back to a new deck',()=>{
 const before=at(fresh(now),'boss');const a=finish(before);assert.equal(a.clears.forest,0);assert.equal(a.crystals,before.crystals);assert.equal(a.coins,before.coins);assert.equal(a.logs[0].kind,'retreat');assert.equal(a.card,0);assert.equal(a.cycle,1);
});
test('battles name the monsters and pay per monster',()=>{
 let cycle=0;while(!deckFor(cycle).some(c=>c.foes>=2))cycle++;
 const g=fresh(now);g.cycle=cycle;g.card=deckFor(cycle).findIndex(c=>c.foes>=2);const card=deckFor(cycle)[g.card];
 const a=finish(g),log=a.logs.find(l=>l.kind==='battle');
 assert.match(log.text,/の群れを倒した！/);assert.equal(a.coins-60,15*card.foes);
});
test('v2 saves on floors move to the first card of a deck and see the prologue once',()=>{
 const old={...fresh(now),version:2,floor:7};delete old.card;delete old.cycle;delete old.prologue;delete old.turn;
 const {game}=advanceGame(old,now);assert.equal(game.version,5);assert.equal(game.card,0);assert.equal(game.cycle,0);assert.equal('floor' in game,false);assert.equal(game.prologue,PROLOGUE_TURNS);
});
test('offline simulation is capped at eight hours, including after a long absence',()=>{
 const a=advanceGame(fresh(now),now+OFFLINE_LIMIT*8);assert.equal(a.report.steps,Math.floor(OFFLINE_LIMIT/STEP_MS));assert.equal(a.report.capped,true);assert.ok(a.game.lastAt>now+OFFLINE_LIMIT*8-STEP_MS&&a.game.lastAt<=now+OFFLINE_LIMIT*8+1e-3,'keeps only the unfinished part of a turn');assert.equal(a.game.logs.length,24);
});
test('rest stops accrual; resuming does not reward the rest period',()=>{
 let g=applyAction(fresh(now),{type:'toggle'},now);g=advanceGame(g,now+OFFLINE_LIMIT).game;assert.equal(g.coins,60);g=applyAction(g,{type:'toggle'},now+OFFLINE_LIMIT);assert.equal(finish(g).coins,68);
});
test('locked destinations and unaffordable actions fail without mutation',()=>{
 const g=fresh(now);assert.throws(()=>applyAction(g,{type:'zone',zone:'castle'},now));assert.throws(()=>applyAction(g,{type:'hire'},now));assert.equal(g.coins,60);assert.equal(g.zone,'forest');
});
test('companion improves rewards by twenty percent',()=>{
 const g=fresh(now);g.coins=120;const hired=applyAction(g,{type:'hire'},now);assert.equal(hired.coins,0);assert.equal(finish(hired).coins,10);
});
test('a new journey opens with the prologue before the first card is drawn',()=>{
 let g=initialGame(now);assert.equal(g.prologue,PROLOGUE_TURNS);
 g=advanceGame(g,now+STEP_MS*PROLOGUE_TURNS).game;assert.equal(g.prologue,0);assert.equal(g.card,0);assert.equal(g.turn,0);assert.equal(g.logs[0].kind,'prologue');
 g=finish(g);assert.equal(g.card,1);
});
test('trials: choices light marks, companions join, and the guardian opens the path at three marks',()=>{
 let g=fresh(now);const trialAt=d=>deckFor(d).findIndex(c=>TRIALS[c.kind]);
 const goTo=(cycle)=>{g.cycle=cycle;g.card=trialAt(cycle);g.turn=0;};
 // 迷い: 何も選ばなければ小石を追い、コロが仲間に
 goTo(0);g=finish(g);assert.deepEqual(g.marks,['fork']);assert.ok(g.party.includes('koro'));
 // 施し: 「通り過ぎる」を選ぶと、しるしも仲間も増えない
 goTo(1);g=applyAction(g,{type:'choose',option:'pass'},g.lastAt);const before=g.coins;g=finish(g);
 assert.deepEqual(g.marks,['fork']);assert.ok(!g.party.includes('lumi'));assert.equal(g.coins,before);
 // 施し: 分けると30G減り、ルミが仲間に
 goTo(1);g.choices={};g=finish(g);assert.equal(g.marks.length,2);assert.ok(g.party.includes('lumi'));
 // 祈り → 守り人: しるし3つで章が完結し、ミオと出会う
 goTo(2);g=finish(g);assert.equal(g.marks.length,3);
 g.card=DECK_SIZE-1;g.turn=0;g=finish(g);assert.equal(g.chapterDone,true);assert.ok(g.party.includes('mio'));assert.ok(g.logs.some(l=>l.kind==='chapter'));
 assert.throws(()=>applyAction({...g,card:deckFor(g.cycle).findIndex(c=>c.kind==='battle')},{type:'choose',option:'give'},g.lastAt));
});
test('collecting a world sound writes it once into the songbook',()=>{
 let g=fresh(now);assert.deepEqual(g.songbook,[]);
 g=applyAction(g,{type:'collect',src:'frog'},now);g=applyAction(g,{type:'collect',src:'frog'},now);
 assert.deepEqual(g.songbook,['frog']);assert.equal(g.logs.filter(l=>l.kind==='song').length,1);
 assert.throws(()=>applyAction(g,{type:'collect',src:'dragon'},now));
});
test('healing items come from treasure chests and sound for thirty minutes once used',async()=>{
 const {HEALING_MS}=await import('../server/game.mjs');
 let g=fresh(now);assert.equal(g.items.herb,1);
 g=at(g,'treasure');g=finish(g);assert.equal(Object.values(g.items).reduce((a,b)=>a+b,0),2,'a chest holds a healing item');
 g=applyAction(g,{type:'use',item:'herb'},g.lastAt);assert.equal(g.healing.id,'herb');assert.equal(g.items.herb,(g.items.herb??0));
 assert.throws(()=>applyAction({...g,items:{}},{type:'use',item:'herb'},g.lastAt));
 const later=advanceGame(g,g.healing.until+1).game;assert.equal(later.healing,null);
 assert.ok(HEALING_MS===30*60*1000);
});
