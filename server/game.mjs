// 1歩 = 1ターン = 曲の1小節（4拍・88 BPM）。web/score.mjs の turnMs と一致させ、再生位置と冒険の進行をそろえる。
export const STEP_MS = 4*60000/88; // 端数を丸めない（丸めると曲と少しずつずれる）
export const OFFLINE_LIMIT = 8 * 60 * 60 * 1000;
export const EQUIPMENT = [
 {id:'leaf-blade',zone:'forest',slot:'weapon',name:'若葉の剣',icon:'🗡️',power:1,rarity:'木漏れ日'},
 {id:'moss-cloak',zone:'forest',slot:'armor',name:'苔織りのマント',icon:'🧥',power:1,rarity:'木漏れ日'},
 {id:'crystal-staff',zone:'cave',slot:'weapon',name:'水晶の杖',icon:'🪄',power:2,rarity:'水晶'},
 {id:'prism-mail',zone:'cave',slot:'armor',name:'輝石の胸当て',icon:'🛡️',power:2,rarity:'水晶'},
 {id:'moon-blade',zone:'castle',slot:'weapon',name:'月影の剣',icon:'⚔️',power:3,rarity:'月影'},
 {id:'star-cloak',zone:'castle',slot:'armor',name:'星詠みの外套',icon:'🌌',power:3,rarity:'月影'}
];
// イベントカードの山札。web/score.mjs の deckFor と同じ乱数・同じ手順（テストで一致を確認）。
// 道5・戦闘3（敵1〜3体）・宝箱2・試練1をシャッフルし、最初は必ず道、最後に森の守り人。
// 試練は束ごとに 迷い → 施し → 祈り の順に1枚ずつ（しるしは最短3束で3つ灯る）。
// めくり終えたら次の束をシャッフルする。物語は docs/chapter1.md。
export const DECK_SIZE=12;
export const TRIAL_ORDER=['fork','alms','altar'];
export const MONSTERS=['slime','mushling','beetle','wisp'];
export const MONSTER_NAMES={slime:'スライム',mushling:'キノコの子',beetle:'カブトムシ',wisp:'鬼火',guardian:'森の守り人'};
function rng(seed){let s=0;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),2654435761)>>>0;return()=>{s=s+0x6D2B79F5>>>0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function deckFor(cycle){
 const r=rng('forest:deck:'+cycle),cards=['travel','travel','travel','travel','travel','battle','battle','battle','treasure','treasure',TRIAL_ORDER[cycle%3]];
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 const first=cards.indexOf('travel');[cards[0],cards[first]]=[cards[first],cards[0]];
 return [...cards.map(kind=>{if(kind!=='battle')return {kind,foes:0,monsters:[]};const foes=1+Math.floor(r()*3);return {kind,foes,monsters:Array.from({length:foes},()=>MONSTERS[Math.floor(r()*MONSTERS.length)])};}),{kind:'boss',foes:1,monsters:['guardian']}];
}
export function cardFor(g){return deckFor(g.cycle)[g.card];}
// 試練のカード。web/score.mjs の TRIALS と同じ選択肢・既定（テストで確認）。選ばなければ前に進むほう（既定）を選ぶ。
// mark: そのしるしが灯る選択。join: 仲間が加わる選択。cost: かかるお金（足りなければ、もう片方になる）。
export const TRIALS={
 fork:{options:{follow:{mark:true,join:'koro'},light:{reward:10}},default:'follow',fallback:'light'},
 alms:{options:{give:{cost:30,mark:true,join:'lumi'},pass:{}},default:'give',fallback:'pass'},
 altar:{options:{offer:{cost:10,mark:true},pray:{}},default:'offer',fallback:'pray'}
};
export const MARKS_TO_PASS=3;
export const PROLOGUE_TURNS=8; // プロローグは 4ターン×2場面
// 1ターン = 1小節。カードは何ターンか続く。戦闘・守り人は 体力の合計 ÷ 攻撃力（切り上げ）＋1 ターン（上限30で強制的に勝ち）。
// web/score.mjs の cardTurns と同じ（テストで確認）。
export const TURNS_PER_CARD=4;
export const MONSTER_HP={slime:2,mushling:2,beetle:3,wisp:3,guardian:24};
export const MAX_BATTLE_TURNS=30;
export function cardTurns(card,power=1){
 if(card.kind==='battle'||card.kind==='boss')return Math.min(MAX_BATTLE_TURNS,Math.max(2,Math.ceil(card.monsters.reduce((a,m)=>a+(MONSTER_HP[m]||2),0)/Math.max(1,power)))+1);
 return TURNS_PER_CARD;
}
export const COMPANION_NAMES={tom:'トム',koro:'コロ',lumi:'ルミ',mio:'ミオ'};
// 癒しの道具。使うと30分、曲の下で特別な響きが鳴る（効能はうたわない。docs/story.md）。web/score.mjs の HEALING と同じ（テストで確認）。
export const HEALING_ITEMS=['herb','holy-water','angel-feather'];
export const HEALING_MS=30*60*1000;
const HEALING_NAMES={herb:'薬草','holy-water':'聖水','angel-feather':'天使の羽'};
// 世界の音（リズムゲームで集める音）。web/score.mjs の SOUND_NAMES と同じ一覧（テストで確認）。
export const SOUNDS=['slime','mushling','beetle','wisp','guardian','frog','owl','firefly','leaves','chest','spark','fire','signpost','altar',
 'flower','brook','sapling','fireflies','bush','mushroom','lantern-moss','big-tree','distant-tree','stone-pillar','dead-tree','mist-puff','owl-perch','moon-mote','resonant-stone','arch'];
const choiceKey=g=>g.cycle+':'+g.card;
export function migrateGame(input) {
 const g=structuredClone(input);
 g.version=5;
 g.inventory ??= [];
 g.equipment ??= {weapon:null,armor:null};
 // v2 までは「階（floor）」。v3 から山札の何束目（cycle）・何枚目（card）。
 if(g.card==null){g.cycle=0;g.card=0;}
 delete g.floor;
 // v4 から物語（第1章）: しるし・仲間・試練の選択。
 g.chapter ??= 1;g.chapterDone ??= false;g.marks ??= [];g.party ??= ['tom'];g.choices ??= {};
 // プロローグ（はじまりの歌 → 堕ちる）の残りカード数。これまでのセーブにも1度だけ流す。
 g.prologue ??= PROLOGUE_TURNS;
 g.turn ??= 0; // いまのカードの何ターン目か
 g.songbook ??= []; // 集めた世界の音（歌の書）
 g.items ??= {herb:1}; // 癒しの道具（はじめに薬草を1つ）
 g.healing ??= null; // 使っている癒しの道具 {id, until}
 return g;
}
export function equipmentPower(g) {return EQUIPMENT.filter(item=>g.inventory?.includes(item.id)&&g.equipment?.[item.slot]===item.id).reduce((sum,item)=>sum+item.power,0);}
export function combatPower(g) {return g.level+equipmentPower(g);}
// Stable rolls make retries and batched offline advancement produce the same loot.
function lootRoll(step,zone) {let n=(step ^ Math.imul(zone.length,2654435761))>>>0;n=Math.imul(n^(n>>>16),2246822507);n=Math.imul(n^(n>>>13),3266489909);return ((n^(n>>>16))>>>0);}
export const ZONES = [
 {id:'forest',name:'蛍火の森',subtitle:'小さな冒険のはじまり',level:1,mult:1,icon:'🌲',enemy:'スライム',boss:'森の守り人',bpm:88},
 {id:'cave',name:'水晶の洞窟',subtitle:'水晶が奏でる深い響き',level:3,mult:2,icon:'💎',enemy:'洞窟コウモリ',boss:'水晶ゴーレム',bpm:96},
 {id:'castle',name:'月影の古城',subtitle:'忘れられた旋律を探して',level:5,mult:3,icon:'🏰',enemy:'影の騎士',boss:'月影の竜',bpm:108}
];
export function initialGame(now = Date.now()) {
 return {version:5,inventory:[],equipment:{weapon:null,armor:null},coins:60,crystals:0,level:1,companion:false,zone:'forest',cycle:0,card:0,prologue:PROLOGUE_TURNS,turn:0,songbook:[],items:{herb:1},healing:null,chapter:1,chapterDone:false,marks:[],party:['tom'],choices:{},clears:{forest:0,cave:0,castle:0},running:true,lastAt:now,steps:0,totalCoins:0,logs:[{id:0,text:'はじめに、ひとつの歌があった。',kind:'prologue',at:now}]};
}
export function unlocked(g,id) {
 const i=ZONES.findIndex(z=>z.id===id);
 return i>=0 && g.level>=ZONES[i].level && (i===0 || g.clears[ZONES[i-1].id]>0);
}
export function cost(g) { return 40 * g.level; }
export function eventFor(g) { return cardFor(g).kind; }
// 次のカードへ。束の最後までめくったら、次の束をシャッフルする。
function nextCard(g){g.turn=0;g.card++;if(g.card>=DECK_SIZE){g.card=0;g.cycle++;}}
function newDeck(g){g.turn=0;g.card=0;g.cycle++;}
// 今の束の選択だけ残す（古い束の選択は捨てる）。
function pruneChoices(g){for(const k of Object.keys(g.choices))if(!k.startsWith(g.cycle+':'))delete g.choices[k];}
const TRIAL_LOGS={
 fork:{follow:'分かれ道で、転がる小石を追いかけた。',light:'分かれ道で、光の道を選んだ。10Gを拾った。'},
 alms:{give:'震える天使に30Gを分けた。',pass:'震える天使の前を通り過ぎた。'},
 altar:{offer:'苔の祭壇に10Gを捧げて祈った。',pray:'苔の祭壇の前で、静かに祈った。'}
};
function log(g,text,kind,at) { g.logs.unshift({id:g.steps,text,kind,at}); g.logs=g.logs.slice(0,24); }
export function advanceGame(input,now=Date.now()) {
 const g=migrateGame(input);
 if(g.healing&&g.healing.until<=now)g.healing=null; // 30分たったら響きが終わる
 const elapsed=Math.max(0,now-g.lastAt);
 const offline=Math.max(0,elapsed-20000);
 const report={seconds:Math.floor(Math.min(offline,OFFLINE_LIMIT)/1000),coins:0,crystals:0,steps:0,items:[],capped:elapsed>OFFLINE_LIMIT};
 if(!g.running) {g.lastAt=now;return {game:g,report};}
 // Accrue at most eight hours; retain a sub-step remainder for a smooth phase.
 if(elapsed>OFFLINE_LIMIT) g.lastAt=now-OFFLINE_LIMIT;
 const n=Math.floor(Math.max(0,now-g.lastAt)/STEP_MS+1e-9); // 1ターンは端数のある長さなので、割り切れる時の誤差を吸収する
 const beforeCoins=g.coins, beforeCrystals=g.crystals;
 for(let i=0;i<n;i++) {
  g.lastAt+=STEP_MS;g.steps++;
  // プロローグの間は山札をめくらない。終わると、ゆっぴは暗い森で目を覚ます。
  if(g.prologue>0){g.prologue--;if(!g.prologue)log(g,'ひとふしは歌からこぼれ落ち、ゆっぴは暗い森で目を覚ました。還ろう、あの歌のもとへ。','prologue',g.lastAt);continue;}
  const z=ZONES.find(z=>z.id===g.zone),card=cardFor(g),event=card.kind;
  // カードが終わるまでターンを重ねる（戦闘は敵の体力と攻撃力で長さが変わる）。
  g.turn++;if(g.turn<cardTurns(card,combatPower(g)))continue;g.turn=0;
  const reward=Math.round((event==='boss'?70:event==='treasure'?25:event==='battle'?15*card.foes:8)*z.mult*(g.companion?1.2:1));
  if(TRIALS[event]){
   const trial=TRIALS[event],picked=g.choices[choiceKey(g)]??trial.default;
   let id=picked,opt=trial.options[id];
   if(opt.cost&&g.coins<opt.cost){id=trial.fallback;opt=trial.options[id];}
   if(opt.cost)g.coins-=opt.cost;
   if(opt.reward){g.coins+=opt.reward;g.totalCoins+=opt.reward;}
   if(opt.mark&&!g.marks.includes(event))g.marks.push(event);
   if(opt.join&&!g.party.includes(opt.join))g.party.push(opt.join);
   log(g,TRIAL_LOGS[event][id]+(opt.join&&g.party.at(-1)===opt.join?' '+COMPANION_NAMES[opt.join]+'が仲間になった。':'')+(opt.mark?' しるしが'+g.marks.length+'つ灯った。':''),'trial',g.lastAt);
   nextCard(g);pruneChoices(g);continue;
  }
  if(event==='boss' && g.marks.length < MARKS_TO_PASS) {
   log(g,z.boss+'との試しを終えた。「まだ早い。しるしを'+MARKS_TO_PASS+'つ灯して、また来なさい」','retreat',g.lastAt);newDeck(g);pruneChoices(g);continue;
  }
  g.coins+=reward;g.totalCoins+=reward;
  if(event==='boss') {g.clears[g.zone]++;g.crystals+=z.mult;
   if(!g.chapterDone){g.chapterDone=true;if(!g.party.includes('mio'))g.party.push('mio');log(g,z.boss+'が道を開いた。花守りのミオと出会った。第1章　完。','chapter',g.lastAt);}
   else log(g,z.boss+'が道を示した。'+reward+'Gと星のかけら'+z.mult+'個。','boss',g.lastAt);
   nextCard(g);pruneChoices(g);}
  else { log(g,event==='treasure'?'宝箱を発見！ '+reward+'G。':event==='battle'?[...new Set(card.monsters)].map(m=>MONSTER_NAMES[m]).join('と')+(card.foes>1?'の群れ':'')+'を倒した！ '+reward+'G。':'道を進み、'+reward+'Gを見つけた。',event,g.lastAt);nextCard(g);pruneChoices(g); }
  const roll=lootRoll(g.steps,g.zone);
  // 宝箱を開けると、癒しの道具がひとつ入っている
  if(event==='treasure'){const item=HEALING_ITEMS[(roll>>8)%HEALING_ITEMS.length];g.items[item]=(g.items[item]||0)+1;log(g,'宝箱に'+HEALING_NAMES[item]+'が入っていた。','item',g.lastAt);}
  if(event==='boss'||event==='treasure'||(event==='battle'&&roll%100<15+10*card.foes)) {
   const items=EQUIPMENT.filter(item=>item.zone===g.zone);
   const missing=items.filter(item=>!g.inventory.includes(item.id));
   const item=(event==='boss'&&missing.length?missing:items)[roll%((event==='boss'&&missing.length)?missing.length:items.length)];
   if(!g.inventory.includes(item.id)) {g.inventory.push(item.id);report.items.push(item.id);if(!g.equipment[item.slot])g.equipment[item.slot]=item.id;log(g,item.name+'を手に入れた！ 装備袋で付け替えよう。','loot',g.lastAt);}
   else {g.crystals++;log(g,item.name+'が星のかけら1個に変わった。','loot',g.lastAt);}
  }
 }
 report.coins=g.coins-beforeCoins;report.crystals=g.crystals-beforeCrystals;report.steps=n;
 return {game:g,report};
}
export function applyAction(input,action,now=Date.now()) {
 const {game:g}=advanceGame(input,now);
 switch(action.type) {
  case 'equipBest': for(const slot of ['weapon','armor']){const best=EQUIPMENT.filter(item=>item.slot===slot&&g.inventory.includes(item.id)).sort((a,b)=>b.power-a.power)[0];if(best)g.equipment[slot]=best.id;}log(g,'おすすめの装備を身につけた。','equip',now);break;
  case 'equip': {const item=EQUIPMENT.find(item=>item.id===action.itemId);if(!item||!g.inventory.includes(item.id))throw new Error('持っている装備を選んでください。');g.equipment[item.slot]=item.id;log(g,item.name+'を装備した。','equip',now);break;}
  case 'unequip': if(!['weapon','armor'].includes(action.slot))throw new Error('不明な装備欄です。');g.equipment[action.slot]=null;break;
  case 'train': {const price=cost(g);if(g.coins<price) throw new Error('ゴールドが足りません。');if(g.level>=30)throw new Error('レベルは上限です。');g.coins-=price;g.level++;log(g,'ゆっぴがLv.'+g.level+'に成長した。','level',now);break;}
  case 'hire': if(g.companion)throw new Error('トムはもう仲間です。');if(g.coins<120)throw new Error('ゴールドが足りません。');g.coins-=120;g.companion=true;log(g,'白キジ猫のトムが仲間になった！ 報酬が20％増える。','level',now);break;
  case 'zone': if(!unlocked(g,action.zone))throw new Error('まだこの場所には行けません。');if(action.zone!==g.zone){g.zone=action.zone;newDeck(g);g.lastAt=now;log(g,ZONES.find(z=>z.id===g.zone).name+'へ旅立った。','travel',now);}break;
  case 'choose': {const card=cardFor(g),trial=TRIALS[card.kind];if(!trial||!trial.options[action.option])throw new Error('今は選べる試練がありません。');g.choices[choiceKey(g)]=action.option;break;}
  case 'use': {const id=action.item;if(!HEALING_ITEMS.includes(id)||!(g.items[id]>0))throw new Error('その道具を持っていません。');g.items[id]--;g.healing={id,until:now+HEALING_MS};log(g,HEALING_NAMES[id]+'を使った。30分、やわらかな響きに包まれる。','item',now);break;}
  case 'collect': {if(!SOUNDS.includes(action.src))throw new Error('この世界にない音です。');if(!g.songbook.includes(action.src)){g.songbook.push(action.src);log(g,'世界の音を1つ集めた。歌の書 '+g.songbook.length+'/'+SOUNDS.length,'song',now);}break;}
  case 'toggle':g.running=!g.running;g.lastAt=now;log(g,g.running?'冒険を再開した。':'焚き火でひと休み。','travel',now);break;
  default:throw new Error('不明な操作です。');
 }
 return g;
}
export function publicGame(g,now,report={}) {return {game:g,equipmentCatalog:EQUIPMENT,combatPower:combatPower(g),equipmentPower:equipmentPower(g),zones:ZONES.map(z=>({...z,unlocked:unlocked(g,z.id)})),trainCost:cost(g),serverNow:now,event:eventFor(g),card:cardFor(g),marksToPass:MARKS_TO_PASS,soundCount:SOUNDS.length,deck:deckFor(g.cycle),deckSize:DECK_SIZE,report};}
