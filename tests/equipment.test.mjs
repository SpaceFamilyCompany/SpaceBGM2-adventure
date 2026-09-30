import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,advanceGame,applyAction,combatPower,EQUIPMENT,STEP_MS,OFFLINE_LIMIT} from '../server/game.mjs';
const now=1000000;
test('recommended equipment selects only owned gear and keeps currency unchanged',()=>{
 const g=initialGame(now);g.inventory=['leaf-blade','crystal-staff','moss-cloak'];
 const next=applyAction(g,{type:'equipBest'},now);assert.deepEqual(next.equipment,{weapon:'crystal-staff',armor:'moss-cloak'});assert.equal(next.coins,g.coins);assert.equal(next.crystals,g.crystals);assert.equal(combatPower(next),4);assert.deepEqual(g.equipment,{weapon:null,armor:null});
});
test('v1 saves preserve progress and paused state when migrating',()=>{
 const old={...initialGame(now),version:1,coins:9876,level:8,running:false};delete old.inventory;delete old.equipment;
 const {game}=advanceGame(old,now);assert.equal(game.version,2);assert.equal(game.coins,9876);assert.equal(game.level,8);assert.equal(game.running,false);assert.deepEqual(game.inventory,[]);assert.equal(old.version,1);
});
test('treasure grants equipment; equipping changes boss outcome; unequip reverses it',()=>{
 let g=initialGame(now);g.floor=4;
 g=advanceGame(g,now+STEP_MS).game;assert.equal(g.inventory.length,1);
 const item=EQUIPMENT.find(i=>i.id===g.inventory[0]);g.floor=10;
 assert.equal(advanceGame(g,now+2*STEP_MS).game.clears.forest,0);
 const equipped=applyAction(g,{type:'equip',itemId:item.id},g.lastAt);assert.equal(combatPower(equipped),2);
 assert.equal(advanceGame(equipped,now+2*STEP_MS).game.clears.forest,1);
 const removed=applyAction(equipped,{type:'unequip',slot:item.slot},g.lastAt);assert.equal(combatPower(removed),1);
 assert.equal(advanceGame(removed,now+2*STEP_MS).game.clears.forest,0);
});
test('unowned equipment and invalid slots cannot be equipped',()=>{
 const g=initialGame(now);assert.throws(()=>applyAction(g,{type:'equip',itemId:'moon-blade'},now));assert.throws(()=>applyAction(g,{type:'unequip',slot:'__proto__'},now));assert.deepEqual(g.inventory,[]);
});
test('offline loot matches individual steps, stays bounded, and is not granted twice',()=>{
 const g=initialGame(now);g.level=9;
 const batched=advanceGame(g,now+100*STEP_MS);let single=g;
 for(let i=1;i<=100;i++)single=advanceGame(single,now+i*STEP_MS).game;
 assert.deepEqual(single,batched.game);assert.ok(single.inventory.length<=2);assert.equal(advanceGame(single,single.lastAt).report.items.length,0);
 const capped=advanceGame(g,now+OFFLINE_LIMIT*5);assert.equal(capped.report.steps,OFFLINE_LIMIT/STEP_MS);assert.ok(capped.game.inventory.length<=2);
});
test('duplicate gear converts to shards and never grows inventory',()=>{
 const g=initialGame(now);g.inventory=EQUIPMENT.filter(i=>i.zone==='forest').map(i=>i.id);g.floor=4;
 const next=advanceGame(g,now+STEP_MS).game;assert.deepEqual(next.inventory,g.inventory);assert.equal(next.crystals,1);
});
