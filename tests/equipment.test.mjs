import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,advanceGame,applyAction,combatPower,deckFor,cardFor,cardTurns,EQUIPMENT,STEP_MS,OFFLINE_LIMIT} from '../server/game.mjs';
const now=1000000;
const fresh=at=>({...initialGame(at),prologue:0});
const at=(g,kind)=>{g.cycle=0;g.card=deckFor(0).findIndex(c=>c.kind===kind);g.turn=0;return g;};
const finish=g=>advanceGame(g,g.lastAt+STEP_MS*(cardTurns(cardFor(g),combatPower(g))-g.turn)).game;
test('recommended equipment selects only owned gear and keeps currency unchanged',()=>{
 const g=fresh(now);g.inventory=['leaf-blade','crystal-staff','moss-cloak'];
 const next=applyAction(g,{type:'equipBest'},now);assert.deepEqual(next.equipment,{weapon:'crystal-staff',armor:'moss-cloak'});assert.equal(next.coins,g.coins);assert.equal(next.crystals,g.crystals);assert.equal(combatPower(next),4);assert.deepEqual(g.equipment,{weapon:null,armor:null});
});
test('v1 saves preserve progress and paused state when migrating',()=>{
 const old={...fresh(now),version:1,coins:9876,level:8,running:false};delete old.inventory;delete old.equipment;
 const {game}=advanceGame(old,now);assert.equal(game.version,5);assert.equal(game.coins,9876);assert.equal(game.level,8);assert.equal(game.running,false);assert.deepEqual(game.inventory,[]);assert.equal(old.version,1);
});
test('treasure grants equipment that is worn at once; equip and unequip change combat power',()=>{
 let g=at(fresh(now),'treasure');
 g=finish(g);assert.equal(g.inventory.length,1);
 const item=EQUIPMENT.find(i=>i.id===g.inventory[0]);assert.equal(g.equipment[item.slot],item.id,'new gear is worn when the slot is empty');
 g=applyAction(g,{type:'unequip',slot:item.slot},g.lastAt);assert.equal(combatPower(g),1);
 const equipped=applyAction(g,{type:'equip',itemId:item.id},g.lastAt);assert.equal(combatPower(equipped),2);
});
test('unowned equipment and invalid slots cannot be equipped',()=>{
 const g=fresh(now);assert.throws(()=>applyAction(g,{type:'equip',itemId:'moon-blade'},now));assert.throws(()=>applyAction(g,{type:'unequip',slot:'__proto__'},now));assert.deepEqual(g.inventory,[]);
});
test('offline loot matches individual steps, stays bounded, and is not granted twice',()=>{
 const g=fresh(now);g.level=9;
 const batched=advanceGame(g,now+100*STEP_MS);let single=g;
 for(let i=1;i<=100;i++)single=advanceGame(single,now+i*STEP_MS).game;
 assert.deepEqual(single,batched.game);assert.ok(single.inventory.length<=2);assert.equal(advanceGame(single,single.lastAt).report.items.length,0);
 const capped=advanceGame(g,now+OFFLINE_LIMIT*5);assert.equal(capped.report.steps,Math.floor(OFFLINE_LIMIT/STEP_MS));assert.ok(capped.game.inventory.length<=2);
});
test('duplicate gear converts to shards and never grows inventory',()=>{
 const g=fresh(now);g.inventory=EQUIPMENT.filter(i=>i.zone==='forest').map(i=>i.id);at(g,'treasure');
 const next=finish(g);assert.deepEqual(next.inventory,g.inventory);assert.equal(next.crystals,1);
});
