export const STEP_MS = 8000;
export const OFFLINE_LIMIT = 8 * 60 * 60 * 1000;
export const ZONES = [
 {id:'forest',name:'蛍火の森',subtitle:'小さな冒険のはじまり',level:1,mult:1,icon:'🌲',enemy:'スライム',boss:'森の守り人',bpm:88},
 {id:'cave',name:'水晶の洞窟',subtitle:'水晶が奏でる深い響き',level:3,mult:2,icon:'💎',enemy:'洞窟コウモリ',boss:'水晶ゴーレム',bpm:96},
 {id:'castle',name:'月影の古城',subtitle:'忘れられた旋律を探して',level:5,mult:3,icon:'🏰',enemy:'影の騎士',boss:'月影の竜',bpm:108}
];
export function initialGame(now = Date.now()) {
 return {version:1,coins:60,crystals:0,level:1,companion:false,zone:'forest',floor:1,clears:{forest:0,cave:0,castle:0},running:true,lastAt:now,steps:0,totalCoins:0,logs:[{id:0,text:'ルウは蛍火の森へ出発した。',kind:'travel',at:now}]};
}
export function unlocked(g,id) {
 const i=ZONES.findIndex(z=>z.id===id);
 return i>=0 && g.level>=ZONES[i].level && (i===0 || g.clears[ZONES[i-1].id]>0);
}
export function cost(g) { return 40 * g.level; }
export function eventFor(g) { return g.floor===10 ? 'boss' : g.floor%4===0 ? 'treasure' : g.floor%2===0 ? 'battle' : 'travel'; }
function log(g,text,kind,at) { g.logs.unshift({id:g.steps,text,kind,at}); g.logs=g.logs.slice(0,24); }
export function advanceGame(input,now=Date.now()) {
 const g=structuredClone(input);
 const elapsed=Math.max(0,now-g.lastAt);
 const offline=Math.max(0,elapsed-20000);
 const report={seconds:Math.floor(Math.min(offline,OFFLINE_LIMIT)/1000),coins:0,crystals:0,steps:0,capped:elapsed>OFFLINE_LIMIT};
 if(!g.running) {g.lastAt=now;return {game:g,report};}
 // Accrue at most eight hours; retain a sub-step remainder for a smooth phase.
 if(elapsed>OFFLINE_LIMIT) g.lastAt=now-OFFLINE_LIMIT;
 const n=Math.floor(Math.max(0,now-g.lastAt)/STEP_MS);
 const beforeCoins=g.coins, beforeCrystals=g.crystals;
 for(let i=0;i<n;i++) {
  g.lastAt+=STEP_MS;g.steps++;
  const z=ZONES.find(z=>z.id===g.zone),event=eventFor(g);
  const reward=Math.round((event==='boss'?70:event==='treasure'?25:event==='battle'?15:8)*z.mult*(g.companion?1.2:1));
  if(event==='boss' && g.level < z.level+1) {
   log(g,z.boss+'は手強い！拠点で休み、再び探索へ。','retreat',g.lastAt);g.floor=1;continue;
  }
  g.coins+=reward;g.totalCoins+=reward;
  if(event==='boss') {g.clears[g.zone]++;g.crystals+=z.mult;log(g,z.boss+'を倒した！ '+reward+'Gと星のかけら'+z.mult+'個。','boss',g.lastAt);g.floor=1;}
  else { log(g,event==='treasure'?'宝箱を発見！ '+reward+'G。':event==='battle'?z.enemy+'を倒した！ '+reward+'G。':'道を進み、'+reward+'Gを見つけた。',event,g.lastAt);g.floor++; }
 }
 report.coins=g.coins-beforeCoins;report.crystals=g.crystals-beforeCrystals;report.steps=n;
 return {game:g,report};
}
export function applyAction(input,action,now=Date.now()) {
 const {game:g}=advanceGame(input,now);
 switch(action.type) {
  case 'train': {const price=cost(g);if(g.coins<price) throw new Error('ゴールドが足りません。');if(g.level>=30)throw new Error('レベルは上限です。');g.coins-=price;g.level++;log(g,'ルウがLv.'+g.level+'に成長した。','level',now);break;}
  case 'hire': if(g.companion)throw new Error('トムはもう仲間です。');if(g.coins<120)throw new Error('ゴールドが足りません。');g.coins-=120;g.companion=true;log(g,'白キジ猫のトムが仲間になった！ 報酬が20％増える。','level',now);break;
  case 'zone': if(!unlocked(g,action.zone))throw new Error('まだこの場所には行けません。');if(action.zone!==g.zone){g.zone=action.zone;g.floor=1;g.lastAt=now;log(g,ZONES.find(z=>z.id===g.zone).name+'へ旅立った。','travel',now);}break;
  case 'toggle':g.running=!g.running;g.lastAt=now;log(g,g.running?'冒険を再開した。':'焚き火でひと休み。','travel',now);break;
  default:throw new Error('不明な操作です。');
 }
 return g;
}
export function publicGame(g,now,report={}) {return {game:g,zones:ZONES.map(z=>({...z,unlocked:unlocked(g,z.id)})),trainCost:cost(g),serverNow:now,event:eventFor(g),report};}
