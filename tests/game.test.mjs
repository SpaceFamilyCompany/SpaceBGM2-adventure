import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,advanceGame,applyAction,unlocked,deckFor,OFFLINE_LIMIT,STEP_MS,DECK_SIZE} from '../server/game.mjs';
const now=1000000;
// 山札0束目の中で、指定した種類のカードの位置から始める。
const at=(g,kind)=>{g.cycle=0;g.card=deckFor(0).findIndex(c=>c.kind===kind);return g;};
test('elapsed rewards are deterministic and cannot be collected twice',()=>{
 const g=initialGame(now),a=advanceGame(g,now+STEP_MS*5);assert.equal(a.game.card,5);assert.ok(a.game.coins>60);assert.equal(a.report.steps,5);assert.deepEqual(advanceGame(g,now+STEP_MS*5),a);assert.equal(advanceGame(a.game,now+STEP_MS*5).report.coins,0);assert.equal(g.coins,60);
});
test('after the last card a new deck is shuffled',()=>{
 const g=advanceGame(initialGame(now),now+STEP_MS*(DECK_SIZE+2)).game;assert.equal(g.cycle,1);assert.equal(g.card,2);
 assert.notDeepEqual(deckFor(0).map(c=>c.kind),deckFor(1).map(c=>c.kind));
});
test('a stronger hero clears the guardian and unlocks the next region at level three',()=>{
 let g=at(applyAction(initialGame(now),{type:'train'},now),'boss');g=advanceGame(g,now+STEP_MS).game;assert.equal(g.clears.forest,1);assert.ok(g.crystals>=1);assert.equal(g.card,0);assert.equal(g.cycle,1);assert.equal(unlocked(g,'cave'),false);g=applyAction(g,{type:'train'},now+STEP_MS);assert.equal(unlocked(g,'cave'),true);g=applyAction(g,{type:'zone',zone:'cave'},now+STEP_MS);assert.equal(g.zone,'cave');assert.equal(g.card,0);
});
test('underpowered hero retreats without receiving boss rewards and draws a new deck',()=>{
 const before=at(initialGame(now),'boss');const a=advanceGame(before,now+STEP_MS);assert.equal(a.game.clears.forest,0);assert.equal(a.game.crystals,before.crystals);assert.equal(a.game.coins,before.coins);assert.equal(a.game.logs[0].kind,'retreat');assert.equal(a.game.card,0);assert.equal(a.game.cycle,1);
});
test('battles name the monsters and pay per monster',()=>{
 let cycle=0;while(!deckFor(cycle).some(c=>c.foes>=2))cycle++;
 const g=initialGame(now);g.cycle=cycle;g.card=deckFor(cycle).findIndex(c=>c.foes>=2);const card=deckFor(cycle)[g.card];
 const a=advanceGame(g,now+STEP_MS).game,log=a.logs.find(l=>l.kind==='battle');
 assert.match(log.text,/の群れを倒した！/);assert.equal(a.coins-60,15*card.foes);
});
test('v2 saves on floors move to the first card of a deck',()=>{
 const old={...initialGame(now),version:2,floor:7};delete old.card;delete old.cycle;
 const {game}=advanceGame(old,now);assert.equal(game.version,3);assert.equal(game.card,0);assert.equal(game.cycle,0);assert.equal('floor' in game,false);
});
test('offline simulation is capped at eight hours, including after a long absence',()=>{
 const a=advanceGame(initialGame(now),now+OFFLINE_LIMIT*8);assert.equal(a.report.steps,Math.floor(OFFLINE_LIMIT/STEP_MS));assert.equal(a.report.capped,true);assert.ok(a.game.lastAt>now+OFFLINE_LIMIT*8-STEP_MS&&a.game.lastAt<=now+OFFLINE_LIMIT*8,'keeps only the unfinished part of a card');assert.equal(a.game.logs.length,24);
});
test('rest stops accrual; resuming does not reward the rest period',()=>{
 let g=applyAction(initialGame(now),{type:'toggle'},now);g=advanceGame(g,now+OFFLINE_LIMIT).game;assert.equal(g.coins,60);g=applyAction(g,{type:'toggle'},now+OFFLINE_LIMIT);assert.equal(advanceGame(g,now+OFFLINE_LIMIT+STEP_MS).game.coins,68);
});
test('locked destinations and unaffordable actions fail without mutation',()=>{
 const g=initialGame(now);assert.throws(()=>applyAction(g,{type:'zone',zone:'castle'},now));assert.throws(()=>applyAction(g,{type:'hire'},now));assert.equal(g.coins,60);assert.equal(g.zone,'forest');
});
test('companion improves rewards by twenty percent',()=>{
 const g=initialGame(now);g.coins=120;const hired=applyAction(g,{type:'hire'},now);assert.equal(hired.coins,0);assert.equal(advanceGame(hired,now+STEP_MS).game.coins,10);
});
