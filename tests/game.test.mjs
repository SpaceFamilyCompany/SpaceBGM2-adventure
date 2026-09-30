import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,advanceGame,applyAction,unlocked,OFFLINE_LIMIT,STEP_MS} from '../server/game.mjs';
const now=1000000;
test('elapsed rewards are deterministic and cannot be collected twice',()=>{
 const g=initialGame(now),a=advanceGame(g,now+STEP_MS*5);assert.equal(a.game.floor,6);assert.equal(a.game.coins,124);assert.equal(a.report.steps,5);assert.deepEqual(advanceGame(g,now+STEP_MS*5),a);assert.equal(advanceGame(a.game,now+STEP_MS*5).report.coins,0);assert.equal(g.coins,60);
});
test('a stronger hero clears a boss and unlocks the next region at level three',()=>{
 let g=applyAction(initialGame(now),{type:'train'},now);g=advanceGame(g,now+10*STEP_MS).game;assert.equal(g.clears.forest,1);assert.equal(g.crystals,1);assert.equal(g.floor,1);assert.equal(unlocked(g,'cave'),false);g=applyAction(g,{type:'train'},now+10*STEP_MS);assert.equal(unlocked(g,'cave'),true);g=applyAction(g,{type:'zone',zone:'cave'},now+10*STEP_MS);assert.equal(g.zone,'cave');assert.equal(g.floor,1);
});
test('underpowered hero retreats without receiving boss rewards',()=>{
 const a=advanceGame(initialGame(now),now+10*STEP_MS);assert.equal(a.game.clears.forest,0);assert.equal(a.game.crystals,0);assert.equal(a.game.logs[0].kind,'retreat');assert.equal(a.game.floor,1);
});
test('offline simulation is capped at eight hours, including after a long absence',()=>{
 const a=advanceGame(initialGame(now),now+OFFLINE_LIMIT*8);assert.equal(a.report.steps,OFFLINE_LIMIT/STEP_MS);assert.equal(a.report.capped,true);assert.equal(a.game.lastAt,now+OFFLINE_LIMIT*8);assert.equal(a.game.logs.length,24);
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
