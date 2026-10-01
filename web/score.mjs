// 楽譜 → 音と動き。画面で動くもの（足音・攻撃・カエル・蛍・背景の花や門…）の1コマ1コマが音符になる。
// 同じ楽譜から各キャラ・背景オブジェクトのコマ番号とスクロール量も決めるので、見た目と音は必ず同じ拍に乗る。
// 1コマ = 8分音符。音は「音が鳴るコマに入った瞬間」だけ鳴る。鳴らない物は動かない。
// 冒険中の曲は「ダンジョン1周（1〜10階）」そのもの。1階 = 16拍 = サーバーの1歩（STEP_MS）なので、再生位置がそのまま冒険の進行になる。
// ブラウザーではここで合成したWAVを1つのHTML Audioでループ再生する（背景再生のため、リアルタイム生成はしない）。
// 1ターン = 1小節 = 8コマ（4拍）。カードは何ターンか続く（道は4ターン、戦闘は敵の強さとゆっぴの攻撃力で変わる）。
export const TURN_STEPS = 8;
export const SEGMENT_STEPS = 32; // 道・宝箱・試練のカードの長さ（4ターン）。休憩・プロローグの区間もこの長さ
// モンスターの体力。戦闘のターン数 = 体力の合計 ÷ 攻撃力（切り上げ）＋登場の1ターン。
// 上限は30ターン（倒しきれなければ強制的に勝ち）。server/game.mjs と同じ（テストで確認）。
export const MONSTER_HP = {slime:2, mushling:2, beetle:3, wisp:3, guardian:24};
export const MAX_BATTLE_TURNS = 30;
export function cardTurns(card,{power=1}={}){
 if(card.kind==='battle'||card.kind==='boss')return Math.min(MAX_BATTLE_TURNS,Math.max(2,Math.ceil(card.monsters.reduce((a,m)=>a+(MONSTER_HP[m]||2),0)/Math.max(1,power)))+1);
 return 4;
}
// イベントカードの山札。1枚 = 16拍。道5・戦闘3（敵1〜3体）・宝箱2・試練1をシャッフルし、最初は必ず道、最後に森の守り人。
// 試練は束ごとに 迷い → 施し → 祈り の順に1枚ずつ。物語は docs/chapter1.md。
// server/game.mjs の deckFor と同じ結果になる（テストで確認）。1束を最後までめくったら、次の束をシャッフルし直す。
export const DECK_SIZE = 12;
export const TRIAL_ORDER = ['fork','alms','altar'];
export const MONSTERS = ['slime','mushling','beetle','wisp'];
export function deckFor(cycle){
 const r=rng('forest:deck:'+cycle),cards=['travel','travel','travel','travel','travel','battle','battle','battle','treasure','treasure',TRIAL_ORDER[cycle%3]];
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 const first=cards.indexOf('travel');[cards[0],cards[first]]=[cards[first],cards[0]];
 // 戦闘カードは1〜3体。種類はスライム・キノコの子・カブトムシ・鬼火から。
 return [...cards.map(kind=>{if(kind!=='battle')return {kind,foes:0,monsters:[]};const foes=1+Math.floor(r()*3);return {kind,foes,monsters:Array.from({length:foes},()=>MONSTERS[Math.floor(r()*MONSTERS.length)])};}),{kind:'boss',foes:1,monsters:['guardian']}];
}
// 山札の何枚目か → 景色の深さ（1〜10）。前半は森の入口、進むほど奥・霧、最後は守り人の広場。
const depthOf=index=>Math.round(index*9/(DECK_SIZE-1))+1;
export const MUSIC_RATE = 16000; // 端末で軽く合成するため（再生できない高さの倍音は計算しない）
export const HERO_X = 120; // ゆっぴの立ち位置の中心（世界 320×180 の座標）。後ろに仲間が並ぶ
export const VIEW_LEFT = 32, VIEW_RIGHT = 288; // 画面に映る範囲（世界の中央 256×144）

// どのコマで音が鳴るか。scripts/pixel-art.mjs の SOUND_FRAMES と一致させる（テストで確認）。
export const SOUND_FRAMES = {
 'hero.walk':[0,2], 'hero.attack':[2], 'hero.cheer':[0,2], 'hero.rest':[0],
 'cat.walk':[1,3], 'cat.pounce':[0], 'slime.bounce':[0], 'guardian.idle':[0],
 'chest.open':[0,1,2,3], 'spark.twinkle':[0,2], 'fire.burn':[0,1,2,3],
 'frog.croak':[0], 'owl.hoot':[0,2], 'firefly.glow':[0], 'leaves.sway':[0,2],
 // 仮のモンスター（scripts/monsters.mjs）
 'mushling.bounce':[0], 'beetle.bounce':[0,2], 'wisp.bounce':[0],
 // 物語（scripts/story-art.mjs の STORY_SOUND_FRAMES と一致させる）
 'koro.roll':[0,2], 'lumi.fly':[0], 'mio.walk':[0,2], 'signpost.sway':[0], 'altar.glow':[0], 'soul.glow':[0,2], 'god.pulse':[0]
};
// 世界の音（リズムゲームで集める音）。音の出どころ → 歌の書に記す名前。server/game.mjs の SOUNDS と同じ一覧（テストで確認）。
// 集めていない音は、くすんで小さく鳴る（COLLECT_GAIN 倍）。集めると澄んで鳴る。
export const SOUND_NAMES = {
 slime:'スライムのぽよん', mushling:'キノコの子のポン', beetle:'カブトムシのカッ', wisp:'鬼火のりん', guardian:'守り人の地響き',
 frog:'カエルのケロッ', owl:'フクロウのホー', firefly:'蛍のひかり', leaves:'葉ずれ',
 chest:'宝箱の鈴', spark:'道の光', fire:'焚き火のぱちぱち', signpost:'道しるべのきしみ', altar:'祭壇の鐘',
 flower:'花のチリン', brook:'小川のチャプ', sapling:'若木のさわさわ', fireflies:'遠くの蛍', bush:'茂みのがさっ', mushroom:'大キノコのポン',
 'lantern-moss':'苔ランタンのきらり', 'big-tree':'大木のきしみ', 'distant-tree':'遠くの木', 'stone-pillar':'石柱の響き', 'dead-tree':'枯れ木の音',
 'mist-puff':'霧のふわり', 'owl-perch':'止まり木のコツ', 'moon-mote':'月のかけら', 'resonant-stone':'響く石', arch:'門のひゅう'
};
export const COLLECT_GAIN = .5;
// 癒しの道具。使うと30分、曲の下で響きが鳴る（効能はうたわない）。tone はその周波数の柔らかな音を1拍ごとに息をするように鳴らす、
// tuning は曲全体の基準の音（A）の高さを変える。ゆっぴのまわりの光の輪も同じ拍で脈打つ。server/game.mjs の HEALING_ITEMS と同じ並び。
export const HEALING = {
 herb:{name:'薬草', tone:528, text:'528Hzの響き'},
 'holy-water':{name:'聖水', tone:417, text:'417Hzの響き'},
 'angel-feather':{name:'天使の羽', tuning:432, text:'432Hzの調律'}
};
// 試練のカード。server/game.mjs の TRIALS と同じ選択肢・既定（テストで確認）。画面の選択肢の文言もここ。
export const TRIALS = {
 fork:{title:'迷い', text:'分かれ道。小石がひとつ、片方の道へ転がっていく。', options:[{id:'follow',label:'小石を追う'},{id:'light',label:'光の道を行く'}], default:'follow', join:{follow:'koro'}},
 alms:{title:'施し', text:'羽を落とした天使が、道のそばで震えている。', options:[{id:'give',label:'30Gを分ける'},{id:'pass',label:'通り過ぎる'}], default:'give', join:{give:'lumi'}},
 altar:{title:'祈り', text:'苔むした祭壇が、静かに光っている。', options:[{id:'offer',label:'10Gを捧げる'},{id:'pray',label:'祈るだけ'}], default:'offer', join:{}}
};
// プロローグ（はじまりの歌 → 堕ちる）。docs/story.md。
export const PROLOGUE_TURNS = 8;
export const PROLOGUE_LINES = [
 'はじめに、ひとつの歌があった。','歌は神のもとで、すべてを包んでいた。','ゆっぴは、その歌のひとふしだった。','けれど、ひとふしは歌からこぼれ落ちた。',
 '堕ちていく。歌が遠くなる。','旋律はほどけ、足音だけになった。','暗い森で、ゆっぴは目を覚ます。','還ろう。あの歌のもとへ。'
];

// 和音は1小節（8コマ = 4拍）ごと。8小節の進行をくり返す。
const ZONE_SCORES = {
 forest:{bpm:88, chords:[[52,55,59],[48,52,55],[43,47,50],[50,54,57],[52,55,59],[48,52,55],[45,48,52],[47,51,54]]}
};
export const ZONE_BPM = Object.fromEntries(Object.entries(ZONE_SCORES).map(([id,z])=>[id,z.bpm]));
// 1ターンの長さ（ミリ秒）。server/game.mjs の STEP_MS と一致させる（テストで確認）。
export const turnMs = zone => TURN_STEPS/2*60000/ZONE_BPM[zone];

// 区間ごとの表情。swing は裏拍の位置（0.5 = まっすぐ）、fill は区間最後の4コマの型、breakBar は立ち止まる小節。
const STYLES = [
 {swing:.5, fill:'none', lift:0},
 {swing:.56, fill:'run', lift:0},
 {swing:.62, fill:'tame', lift:1},
 {swing:.54, fill:'tame', lift:0, breakBar:2}
];
// フィル: 区間最後の4コマで、ゆっぴ・トムの動きのコマを入れ替える。音はコマから自動で決まる。
//  run = 小走り・2連撃（8分で連打）  tame = わざと止めて遅らせ、詰めて取り戻す
const FILLS = {
 walk:{run:[0,2,0,2], tame:[3,3,0,2]},
 catwalk:{run:[1,3,1,3], tame:[0,0,1,3]},
 attack:{run:[2,3,2,3], tame:[0,0,1,2]},
 pounce:{run:[0,1,0,1], tame:[3,3,3,0]},
 cheer:{run:[0,2,0,2], tame:[3,3,0,2]}
};
const HERO_ACTION = {travel:'walk',battle:'attack',treasure:'cheer',boss:'attack',rest:'rest',fork:'walk',alms:'rest',altar:'rest'};
const CAT_ACTION = {travel:'walk',battle:'pounce',treasure:'walk',boss:'pounce',rest:'rest',fork:'walk',alms:'rest',altar:'rest'};
const FOE = {travel:['spark','twinkle'],battle:['slime','bounce'],treasure:['chest','open'],boss:['guardian','idle'],rest:['fire','burn'],fork:['signpost','sway'],alms:['spark','twinkle'],altar:['altar','glow'],heaven:['god','pulse']};
// 歩いて進むカード（背景がスクロールする）
const WALKING = new Set(['travel','fork']);
// 仲間の動作（歩く場面・止まる場面）
const COMPANION_ACTION = {koro:['roll','idle'], lumi:['fly','fly'], mio:['walk','idle']};

// 装備の特性。武器は「攻撃のリズム」、防具は「曲のジャンル」。
// hits: 斬撃のポーズ（コマ2）に入ってから、何コマ後に斬るか（1 = 8分音符、0.5 = 16分音符、2/3 = 三連符）。
//       音も絵（web/scene.mjs が同じ hits から斬撃のポーズを出す）もこの時刻に合わせるので、ずれない。
export const WEAPONS = {
 none:{voice:'hum', hits:[0], trait:'素手。8分音符で1発'},
 'leaf-blade':{voice:'pluck', hits:[0,.5], trait:'2連切り。16分音符で2発'},
 'crystal-staff':{voice:'bell', hits:[0,2/3,4/3], trait:'三連符の3連撃。和音を駆け上がる'},
 'moon-blade':{voice:'lead', hits:[1], trait:'溜め斬り。わざと遅らせて裏拍に重い一撃'}
};
// genre: 世界じゅうの楽器の割り当て（map）、和音に7thを足すか、スウィングの足し引き、響き（fx）を変える。
// どの音も、画面で動いている何かが鳴らしている音のまま（楽器が変わるだけ）。
export const ARMORS = {
 none:{genre:'森の素朴', trait:'森の素朴な音', map:{}, fx:{}},
 'moss-cloak':{genre:'ローファイ・チル', trait:'ローファイ・チル。7thの和音、エレピ、ブラシ、強めのスウィング', sevenths:true, swing:.08,
  map:{pad:'epiano', tick:'brush', shaker:'brush', swish:'brush', boing:'sub', boom:'sub', kick:'soft-kick'}, fx:{lowpass:.3, echo:[.5,.15,.25], warm:.5}},
 'prism-mail':{genre:'チップチューン', trait:'チップチューン。矩形波、スウィングなし', straight:true,
  map:{pad:'square-pad', hum:'square', pluck:'square', bell:'square', lead:'square', chime:'square', glass:'square', croak:'square', hoot:'square', 'bell-low':'square', pop:'square', drip:'square', creak:'square',
   boing:'pulse-bass', boom:'pulse-bass', 'pluck-low':'pulse-bass', tick:'noise-hat', shaker:'noise-hat', swish:'noise-hat', rustle:'noise-hat', wood:'noise-hat', whoosh:'noise-hat', crackle:'noise-hat'}, fx:{}},
 'star-cloak':{genre:'シンフォニック', trait:'シンフォニック。弦、ティンパニ、鐘の響き',
  map:{pad:'strings', kick:'timpani', boom:'timpani', boing:'pizz', 'pluck-low':'pizz', chime:'bell', glass:'bell', tick:'pizz-tick'}, fx:{echo:[1,.25,.3]}}
};
// 7thを足した和音（短三和音には短7度、長三和音には長7度）。
const withSeventh=chord=>[...chord,chord[0]+((chord[1]-chord[0])===3?10:11)];

const INSTRUMENTS = {
 hum:{partials:[[1,1],[2,.12],[3,.05]], attack:.03, decay:.42},
 pluck:{partials:[[1,1],[2,.55],[3,.35],[4,.22],[5,.12]], attack:.002, decay:.2},
 bell:{partials:[[1,1],[2,.45],[3,.18],[4,.1],[6,.05]], attack:.002, decay:.7},
 lead:{partials:[[1,1],[2,.5],[3,.33],[4,.25],[5,.2],[6,.16]], attack:.02, decay:.5, vibrato:[5.5,.006]},
 // ジャンルの楽器（防具の map で差し替わる）
 epiano:{partials:[[1,1],[2,.28],[4,.12]], attack:.004, decay:.9, tremolo:[4.5,.25]},
 sub:{partials:[[1,1],[2,.08]], attack:.006, decay:.3, glide:2},
 'soft-kick':{partials:[[1,1]], attack:.004, decay:.1, glide:7},
 brush:{noise:true, attack:.012, decay:.06, hp:.35},
 square:{partials:[[1,1],[3,.33],[5,.2],[7,.14],[9,.11]], attack:.001, decay:.22},
 'square-pad':{partials:[[1,.7],[3,.23],[5,.14]], attack:.02, decay:.35},
 'pulse-bass':{partials:[[1,1],[2,.5],[3,.33],[4,.25]], attack:.001, decay:.14},
 'noise-hat':{noise:true, attack:.001, decay:.018, hp:.95},
 strings:{partials:[[1,1],[2,.5],[3,.33],[4,.25],[5,.2]], attack:.35, decay:2.6, vibrato:[5,.004]},
 timpani:{partials:[[1,1],[1.5,.25],[2,.2]], attack:.002, decay:.55, glide:3},
 pizz:{partials:[[1,1],[2,.4],[3,.15]], attack:.002, decay:.12},
 'pizz-tick':{partials:[[1,1],[2,.3]], attack:.001, decay:.04},
 aura:{partials:[[1,1],[2,.04]], attack:.22, decay:1.6},
 chime:{partials:[[1,1],[2,.22],[4,.08]], attack:.002, decay:.35},
 boing:{partials:[[1,1],[2,.25]], attack:.004, decay:.2, glide:3},
 boom:{partials:[[1,1],[2,.3],[3,.15]], attack:.004, decay:.5, glide:7},
 kick:{partials:[[1,1]], attack:.002, decay:.12, glide:12},
 croak:{partials:[[1,1],[2,.8],[3,.6],[4,.4],[5,.3]], attack:.01, decay:.09, tremolo:[28,.8]},
 hoot:{partials:[[1,1],[2,.08]], attack:.06, decay:.32, glide:1},
 pad:{partials:[[1,1],[1.004,.6],[2,.25]], attack:.9, decay:2.2},
 tick:{noise:true, attack:.001, decay:.025, hp:.55},
 swish:{noise:true, attack:.01, decay:.08, hp:.25},
 shaker:{noise:true, attack:.003, decay:.035, hp:.85},
 crackle:{noise:true, attack:.001, decay:.012, hp:.5},
 // 背景オブジェクトの声（scripts/forest-objects.mjs の voice）
 drip:{partials:[[1,1],[2,.2]], attack:.002, decay:.08, glide:-7},
 rustle:{noise:true, attack:.02, decay:.07, hp:.7},
 pop:{partials:[[1,1],[2,.3]], attack:.002, decay:.06, glide:-5},
 glass:{partials:[[1,1],[2,.3],[4,.12]], attack:.002, decay:.5},
 creak:{partials:[[1,1],[2,.6],[3,.5],[4,.3]], attack:.04, decay:.15, glide:3, tremolo:[18,.6]},
 'bell-low':{partials:[[1,1],[2,.35],[3,.12]], attack:.003, decay:1.1},
 whoosh:{noise:true, attack:.12, decay:.25, hp:.15},
 'pluck-low':{partials:[[1,1],[2,.5],[3,.25]], attack:.002, decay:.25},
 wood:{partials:[[1,1],[3,.3]], attack:.001, decay:.05}
};
// 背景オブジェクトの声の高さ（和音のどの音か・オクターブ）と、段ごとの音量・出番の間隔（小節）
const OBJECT_PITCH = {chime:[2,24], drip:[0,24], pop:[1,12], glass:[2,24], creak:[0,0], 'bell-low':[0,0], 'pluck-low':[0,0], wood:[1,12]};
const LANE_GAIN = {near:.2, mid:.12, far:.07};
const LANE_PERIOD = {mid:2, far:4};

// いちばん近い和音の構成音（同じ高さなら下を選ぶ）
export function toChord(midi,chord){const classes=chord.map(n=>n%12);for(let d=0;d<=6;d++)for(const m of [midi-d,midi+d])if(classes.includes(((m%12)+12)%12))return m;return midi;}
function rng(seed){let s=0;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),2654435761)>>>0;return()=>{s=s+0x6D2B79F5>>>0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function pick(r,items){const total=items.reduce((a,i)=>a+(i.weight||1),0);let x=r()*total;for(const i of items){x-=i.weight||1;if(x<0)return i;}return items.at(-1);}
export function levelTier(level){return level>=20?3:level>=10?2:level>=5?1:0;}
export function themeFor(world,floor,mood){
 if(!world)return 'entrance';
 if(mood==='boss')return world.THEMES.at(-1).id;
 return world.THEMES.find(t=>floor>=t.floors[0]&&floor<=t.floors[1])?.id??world.THEMES[0].id;
}

// ゆっぴの旋律（1拍に1音 = 1歩）。8拍の動機 a・b を変奏して 64拍。
function melody(zone){
 const r=rng(zone+':melody'),motif=()=>Array.from({length:8},()=>Math.floor(r()*5));
 const a=motif(),b=motif(),vary=(m,k)=>m.map((d,i)=>i<k?d:(d+2)%5),lift=m=>m.map(d=>Math.min(5,d+1)),home=m=>m.map((d,i)=>i<7?d:0);
 const plan=[...a,...vary(a,6), ...a,...b, ...lift(b),...vary(lift(b),5), ...a,...home(vary(a,6))];
 return plan.map((d,beat)=>{const c=ZONE_SCORES[zone].chords[Math.floor(beat/4)%8];return [...c.map(n=>n+12),...c.map(n=>n+24)][d];});
}

export function trackKey(s){return [s.zone||'forest',s.running===false?'rest':'run',s.cycle||0,s.running===false?s.card||0:'',s.weapon||'none',s.armor||'none',levelTier(s.level||1),s.companion?1:0,'p'+(s.power||1),'party:'+(s.party||['tom']).join('+'),'c:'+JSON.stringify(s.choices||{}),s.prologue>0?'prologue':'','book:'+[...(s.songbook||[])].sort().join('+'),'heal:'+(s.healing||'')].join('|');}

// 区間の並び。冒険中は山札1束（12枚）、休憩中は焚き火の4区間。道のカードは、めくるたびに表情（スウィング・フィル・ブレイク）を変える。
function planFor(state,world){
 let walked=0;
 const resting=state.running===false,card=state.card||0;
 // プロローグ: はじまりの歌（天の庭）→ 堕ちる（森へ）
 if(state.prologue>0)return [{kind:'heaven',depth:0},{kind:'fall',depth:1}].map((c,k)=>({mood:c.kind,foes:0,monsters:[],card:k,index:k,start:k*SEGMENT_STEPS,turns:4,steps:SEGMENT_STEPS,theme:c.kind==='heaven'?'heaven':themeFor(world,1,'travel'),party:[],style:{swing:.5,fill:'none',lift:0}}));
 const cards=resting?Array.from({length:4},()=>({kind:'rest',foes:0,monsters:[],card,depth:depthOf(card)})):deckFor(state.cycle||0).map((c,i)=>({...c,card:i,depth:depthOf(i)}));
 let start=0;
 // 隊列の仲間: いまの仲間に、この束の試練で加わる見込みの仲間（選んだ／既定の選択）を順に足す。
 let party=[...(state.party||['tom'])];
 return cards.map((c,k)=>{
  const mood=c.kind,style=STYLES[(mood==='travel'?walked++:k)%4],turns=resting?4:cardTurns(c,{power:state.power||1});
  const choice=TRIALS[mood]?(state.choices?.[k]??TRIALS[mood].default):null,joins=choice?TRIALS[mood].join[choice]:null;
  const seg={mood,foes:c.foes,monsters:c.monsters||[],card:c.card,index:k,start,turns,steps:turns*TURN_STEPS,theme:themeFor(world,c.depth,mood),party:[...party],choice,joins:joins&&!party.includes(joins)?joins:null,
   style:mood==='travel'||mood==='rest'?style:mood==='altar'?{...style,breakBar:2}:{...style,breakBar:null}};
  if(seg.joins)party.push(seg.joins);
  start+=seg.steps;return seg;
 });
}
// コマ → そのコマの区間。区間の長さはカードごとに違うので、区間の開始位置から探す。
const planSteps=plan=>plan.at(-1).start+plan.at(-1).steps;
function segIndexer(plan){const idx=new Int32Array(planSteps(plan));plan.forEach((seg,k)=>idx.fill(k,seg.start,seg.start+seg.steps));return s=>plan[idx[s]];}
const breakAt=(seg,s)=>seg.style.breakBar===Math.floor((s-seg.start)/8);
// 歩いているコマ（道のカードで、ブレイクの小節以外）と、その累計。
function walkOf(plan){
 const steps=planSteps(plan),segAt=segIndexer(plan),moving=Array.from({length:steps},(_,s)=>WALKING.has(segAt(s).mood)&&!breakAt(segAt(s),s)),moved=[0];
 for(let s=0;s<steps;s++)moved.push(moved[s]+(moving[s]?1:0));
 return {moving,moved};
}

// 山札1束ぶんの景色 = 1枚の長いスクロール絵。3つの段それぞれに、その束で歩く長さの帯があり、そこに物が並ぶ。
// 物の景色（森の入口・森の奥…）は「その物が画面の右端から現れる時のカード」で決まるので、景色は切れ目なく移り変わる。
// 門は、道のカードが続く境目でゆっぴの真上を通る位置に置く。帯の端は先頭へつながる。
export function layoutArea(world,zone='forest',cycle=0,state={}){
 const plan=planFor({...state,zone,running:true,cycle},world),{moved}=walkOf(plan),total=Math.max(1,moved[moved.length-1]),steps=planSteps(plan),segOf=segIndexer(plan);
 const r=rng(zone+':area:'+cycle),lanes={};
 for(const [lane,spec] of Object.entries(world.LANES)){
  const pxPerStep=spec.pxPerBeat/2,period=total*pxPerStep,items=[];
  // 束の頭から見えている物（x が画面の右端より手前）は、最初のカードの景色にする（束の終わりの景色を回り込ませない）。
  const themeAt=x=>{const m=Math.min(total,Math.max(0,(x-VIEW_RIGHT)/pxPerStep)),s=Math.min(steps-1,moved.findIndex(v=>v>=m));return segOf(Math.max(0,s)).theme;};
  const arch=world.OBJECTS.arch;
  // 門は、道から道へ歩き続けるカードの境目だけ（立ち止まるカードの間は、ゆっぴの上に門が居座らないように）。
  if(lane==='near'&&arch)for(const seg of plan)if(seg.mood==='travel'&&seg.index>0&&plan[seg.index-1].mood==='travel')items.push({id:'arch',x:HERO_X-arch.width/2+moved[seg.start]*pxPerStep});
  const clear=(x,w)=>items.every(i=>{const o=world.OBJECTS[i.id];return [-period,0,period].every(p=>x+w+8<=i.x+p||x>=i.x+p+o.width+8);});
  let x=r()*48;
  while(x<period-16){
   const pool=Object.entries(world.OBJECTS).filter(([id,o])=>id!=='arch'&&o.lane===lane&&o.themes.includes(themeAt(x))).map(([id,o])=>({id,...o}));
   if(!pool.length){x+=32;continue;}
   const o=pick(r,pool);
   if(!(x+o.width<=period&&clear(x,o.width))){x+=8;continue;}
   items.push({id:o.id,x:Math.round(x)});
   x+=o.width+(lane==='near'?16:lane==='mid'?12:8)+r()*(lane==='far'?24:lane==='mid'?40:48);
  }
  items.sort((a,b)=>a.x-b.x);
  lanes[lane]={pxPerStep,period,objects:items};
 }
 return {zone,cycle,cards:plan.map(({mood,foes,theme})=>({mood,foes,theme})),cardStart:plan.map(seg=>moved[seg.start]),walk:total,lanes};
}

// state: {zone, running, cycle, card, weapon, armor, level, companion}
// world: scripts/forest-objects.mjs の {LANES, THEMES, OBJECTS}。area: その束の景色（layoutArea）。
export function composeTrack(state,world=null,area=world?layoutArea(world,state.zone||'forest',state.cycle||0,state):null){
 const zone=ZONE_SCORES[state.zone]?state.zone:'forest',score=ZONE_SCORES[zone],tier=levelTier(state.level||1),running=state.running!==false;
 const weapon=WEAPONS[state.weapon]?state.weapon:'none',armor=ARMORS[state.armor]?state.armor:'none',arms=WEAPONS[weapon],genre=ARMORS[armor];
 const plan=planFor(state,world),steps=planSteps(plan),beat=60/score.bpm,prev=s=>(s+steps-1)%steps;
 const chords=genre.sevenths?score.chords.map(withSeventh):score.chords;
 const segAt=segIndexer(plan),chordAt=s=>chords[(s>>3)%8],local=s=>s-segAt(s).start;
 // 防具のジャンルでスウィングの量が変わる（チップチューンはまっすぐ）。
 const swingAt=s=>genre.straight?.5:Math.min(.7,segAt(s).style.swing+(genre.swing||0));
 const inFill=s=>local(s)>=segAt(s).steps-4,inBreak=s=>breakAt(segAt(s),s);
 // スウィング: 裏拍（奇数コマ）を区間ごとの量だけ後ろへ。コマの切り替えも同じ時刻にずらすので、絵もずれない。
 const stepTimes=Array.from({length:steps+1},(_,s)=>s===steps?steps/2*beat:Math.floor(s/2)*beat+(s%2?swingAt(s)*beat:0));
 const tune=melody(zone),notes=[],voice=arms.voice,fx=genre.fx;
 // 音程はすべて、その小節の和音の構成音に吸着させ、小節の終わりで閉じる（次の和音へ持ち越さない）。
 const barEnd=step=>stepTimes[Math.min(steps,(step>>3)*8+8)];
 // off: そのコマの中で鳴る位置（0〜1。16分音符や三連符の連撃に使う）。楽器は防具のジャンルで差し替わる。
 // src: その音を鳴らした物（世界の音なら、歌の書に集めたかどうかで音量が変わる）。
 const songbook=new Set(state.songbook||[]);let srcNow=null;
 const note=(step,inst,midi,gain,bus='main',dur=.3,off=0,src=srcNow)=>{step%=steps;const wild=src&&SOUND_NAMES[src]&&!songbook.has(src);notes.push({step,off,inst:genre.map[inst]??inst,midi:midi==null?null:toChord(midi,chordAt(step)),gain:wild?gain*COLLECT_GAIN:gain,bus,dur,end:barEnd(step),src:src&&SOUND_NAMES[src]?src:null});};
 const heroNote=(s,midi,gain,off=0)=>{note(s,voice,midi,gain,'hero',.3,off);if(tier>=2)note(s,voice,midi-12,gain*.3,'hero',.3,off);if(tier>=3)note(s,voice,chordAt(s)[1]+12,gain*.25,'hero',.3,off);};
 const melodyAt=s=>tune[(s>>1)%tune.length]+12*segAt(s).style.lift;
 // 各コマで鳴る音。どれも「その役者がそのコマの動きをした音」。
 const sounds={
  'hero.walk':s=>heroNote(s,melodyAt(s),.34),
  'hero.attack':s=>arms.hits.forEach((h,i)=>{const at=s+Math.floor(h),off=h-Math.floor(h),up=[0,4,7][i]??0;heroNote(at,melodyAt(s)+12+up,i?.34:.42,off);note(at,'swish',null,weapon==='none'?.12:.2,'main',.3,off);}),
  'hero.cheer':s=>heroNote(s,melodyAt(s)+12,.36),
  'hero.rest':s=>note(s,voice,melodyAt(s),.24,'hero',.9),
  'cat.walk':s=>note(s,'tick',null,.16),
  'cat.pounce':s=>note(s,'kick',48,.5),
  // 複数の敵は、それぞれ和音の別の音でベースを弾く（1体目: 根音、2体目: 5度、3体目: 3度）。
  'slime.bounce':(s,k=0)=>note(s,'boing',chordAt(s)[[0,2,1][k]]-12,.46-.08*k),
  'mushling.bounce':(s,k=0)=>note(s,'pop',chordAt(s)[[0,2,1][k]]+12,.3-.05*k),
  'beetle.bounce':(s,k=0)=>note(s,'wood',chordAt(s)[[0,2,1][k]]+12,.26-.04*k),
  'wisp.bounce':(s,k=0)=>note(s,'glass',chordAt(s)[[2,0,1][k]]+24,.16-.03*k),
  // 仲間のパート: コロは木琴の刻み、ルミはハープの分散和音、ミオはゆっぴの旋律の3度上で歌う
  'koro.roll':s=>note(s,'wood',chordAt(s)[(s>>1)%3]+12,.14),
  'lumi.fly':s=>[0,1,2].forEach(i=>note(s,'pluck',chordAt(s)[i]+24,.09,'main',.3,i/3)),
  'mio.walk':s=>note(s,'hum',melodyAt(s)+4,.2),
  // 試練の場面
  'signpost.sway':s=>note(s,'wood',chordAt(s)[0],.12),
  'altar.glow':s=>note(s,'bell-low',chordAt(s)[0],.22),
  // プロローグ: ひとふしの光が旋律を鳴らす（堕ちる間は下へ崩れ、だんだん遠くなる）、神の光は合唱
  'soul.glow':s=>{const seg=segAt(s),fall=seg.mood==='fall',k=local(s)/seg.steps;note(s,'bell',fall?melodyAt(s)+12-Math.floor(k*4)*5:melodyAt(s)+12,fall?.3*(1-k*.8):.3,'hero');},
  'god.pulse':s=>{chordAt(s).forEach(n=>note(s,'strings',n+12,.09,'main',2));note(s,'bell',chordAt(s)[2]+24,.12);},
  'guardian.idle':s=>{note(s,'boom',chordAt(s)[0]-12,.6);note(s,'kick',40,.5);},
  'chest.open':s=>note(s,'chime',chordAt(s)[s%3]+24+(s%4===3?12:0),.16),
  'spark.twinkle':s=>note(s,'chime',chordAt(s)[(s>>1)%3]+36,.12),
  'fire.burn':s=>note(s,'crackle',null,.05+.05*((s*7)%3)),
  'frog.croak':s=>note(s,'croak',chordAt(s)[0],.18),
  'owl.hoot':s=>note(s,'hoot',chordAt(s)[2]+12,.2),
  'firefly.glow':s=>note(s,'chime',chordAt(s)[2]+24,.1),
  'leaves.sway':s=>note(s,'shaker',null,segAt(s).mood==='travel'?.06:.09)
 };
 // ゆっぴ・トムのコマ。区間最後の4コマはフィル、ブレイクの小節は立ち止まって（音を止めて）森の音を聞く。
 const partyEntry=(sprite,actions,fillKey)=>s=>{
  const seg=segAt(s),action=actions[seg.mood],base=`${sprite}-${action}-`;
  if(action==='rest')return base+s%4;
  if(inBreak(s))return base+(action==='walk'?1:3);
  const fill=FILLS[fillKey(action)]?.[seg.style.fill];
  return base+(fill&&inFill(s)?fill[s%4]:s%4);
 };
 const prologueMood=m=>m==='heaven'||m==='fall';
 const hero=Array.from({length:steps},(_,s)=>prologueMood(segAt(s).mood)?`soul-glow-${s%4}`:partyEntry('hero',HERO_ACTION,a=>a)(s));
 const heroFrame=s=>+hero[s].split('-')[2],fighting=s=>['battle','boss'].includes(segAt(s).mood);
 const cast={hero};
 if(state.companion)cast.cat=Array.from({length:steps},(_,s)=>prologueMood(segAt(s).mood)?'':partyEntry('cat',CAT_ACTION,a=>a==='walk'?'catwalk':a)(s));
 // 隊列の仲間。その区間の仲間だけが並ぶ（試練で加わった仲間は、次のカードから）。
 for(const id of Object.keys(COMPANION_ACTION))cast[id]=Array.from({length:steps},(_,s)=>{
  const seg=segAt(s);if(!seg.party?.includes(id))return '';
  const [go,stay]=COMPANION_ACTION[id],action=WALKING.has(seg.mood)&&!inBreak(s)?go:stay;
  return `${id}-${action}-${s%4}`;
 });
 // 敵はカードの頭で右から順に滑り込む（近づく間は跳ねずに鳴らない）。複数の敵は跳ねる拍をずらして掛け合う
 // （1体目: 表拍、2体目: 拍の裏、3体目: 8分遅れ）。ゆっぴの斬撃は1体ずつ順に当たり、当たった敵だけがひるむ。
 const heroHits=s=>fighting(s)&&!prologueMood(segAt(s).mood)&&heroFrame(s)===2,attackNo=s=>{let n=0;for(let k=segAt(s).start;k<s;k++)if(heroHits(k)&&!heroHits(k-1))n++;return n;};
 // 斬撃のポーズに入ったコマから見て、武器のヒットが続くコマ数（最後のヒットまで）。
 const hitSpan=Math.floor(arms.hits.at(-1))+1;
 const swingStart=s=>{for(let d=0;d<hitSpan;d++){const k=(s-d+steps)%steps;if(heroHits(k)&&!heroHits((k-1+steps)%steps)&&segAt(k)===segAt(s))return k;}return -1;};
 for(let k=0;k<3;k++)cast['foe'+k]=Array.from({length:steps},(_,s)=>{
  const seg=segAt(s),count=seg.mood==='battle'?seg.foes:1;
  if(k>=count||seg.mood==='fall')return '';
  // 試練で加わる仲間は、そのカードでは出来事の役者として出る（転がっていく小石・震える天使）
  if(k===0&&seg.joins==='koro')return `koro-roll-${s%4}`;
  if(k===0&&seg.joins==='lumi')return `lumi-shiver-${s%4}`;
  const [sprite,action]=seg.mood==='battle'?[seg.monsters[k]??'slime','bounce']:FOE[seg.mood];
  const offset=[0,2,1][k];
  if(!['spark','fire','god','altar','signpost'].includes(sprite)&&local(s)<4+k*2)return `${sprite}-${action}-${[1,2][local(s)%2]}`;
  const struck=fighting(s)?swingStart(s):-1,after=fighting(s)?swingStart((s-1+steps)%steps):-1;
  if(struck>=0&&attackNo(struck)%count===k&&s-struck>=Math.floor(arms.hits[0]))return `${sprite}-hit-0`;
  if(struck<0&&after>=0&&attackNo(after)%count===k)return `${sprite}-hit-1`;
  if(sprite==='spark'&&(s>>3)%4<2)return `${sprite}-${action}-3`;
  return `${sprite}-${action}-${(s+4-offset)%4}`;
 });
 // 森の生き物は小節ごとに鳴く・休むを切り替える。
 // 鳴かない間も、待機の動き（idle: 揺れる・呼吸・浮かぶ。音の出ないコマだけ）で拍に乗り続ける。
 const IDLE_MOTION=new Set(['owl','frog','firefly']);
 const ambient=(sprite,action,idle,active)=>Array.from({length:steps},(_,s)=>{const m=segAt(s).mood,bar=Math.floor(local(s)/8);if(prologueMood(m))return '';return active(m,bar,s)?`${sprite}-${action}-${s%4}`:IDLE_MOTION.has(sprite)?`${sprite}-idle-${s%4}`:`${sprite}-${action}-${idle}`;});
 const calm=m=>m==='travel'||m==='rest';
 cast.frog=ambient('frog','croak',2,(m,bar)=>calm(m)&&bar%2===1);
 cast.owl=ambient('owl','hoot',1,(m,bar,s)=>calm(m)&&bar===3||m==='rest'&&bar===1&&segAt(s).index%2===1);
 cast.firefly=ambient('firefly','glow',3,(m,bar)=>m==='rest'||m==='treasure'||m==='travel'&&bar%2===0);
 cast.leaves=ambient('leaves','sway',1,(m,bar,s)=>m!=='rest'&&!inBreak(s));
 // コマの切り替わりで、音が鳴るコマに入った瞬間だけ鳴らす（いない役者 '' は鳴らない）。
 for(const [id,frames] of Object.entries(cast))frames.forEach((entry,s)=>{
  if(!entry)return;
  const [sprite,action,frame]=entry.split('-'),key=sprite+'.'+action;
  if(SOUND_FRAMES[key]?.includes(+frame)&&entry!==frames[prev(s)]){srcNow=SOUND_NAMES[sprite]?sprite:null;sounds[key](s,+(id.match(/^foe(\d)$/)?.[1]??0));srcNow=null;}
 });
 const {moving,moved}=running?walkOf(plan):{moving:Array(steps).fill(false),moved:Array(steps+1).fill(0)};
 // 休憩中は、いまのカードの入口で立ち止まった景色のまま。
 const scrollBase=running||!area?0:area.cardStart[Math.max(0,Math.min(DECK_SIZE-1,state.card||0))];
 const objects=world&&area?sceneObjects(world,area,moved,scrollBase,steps,note,chordAt,local):[];
 // 癒しの道具の響き。1拍ごとに、その周波数の音が息をするように鳴る（周波数そのままで、和音には合わせない）。
 const healing=HEALING[state.healing]??null;
 if(healing?.tone)for(let s=0;s<steps;s+=2)notes.push({step:s,off:0,inst:'aura',midi:null,freq:healing.tone,gain:.05,bus:'main',dur:beat*.9,end:barEnd(s),src:null});
 // 夜風（背景の空気）。小節の頭で和音がゆっくり息をする。
 for(let s=0;s<steps;s+=8)chordAt(s).forEach(n=>note(s,'pad',n+12,segAt(s).mood==='rest'||inBreak(s)?.05:.035,'main',2.2));
 // 集められる音が鳴る時刻（同じ物・同じコマは1つにまとめる）。画面はこれでタップを判定する。
 const seen=new Set(),events=[];
 for(const n of notes){if(!n.src)continue;const id=n.src+':'+n.step+':'+n.off;if(seen.has(id))continue;seen.add(id);events.push({t:stepTimes[n.step]+n.off*(stepTimes[n.step+1]-stepTimes[n.step]),src:n.src,step:n.step});}
 events.sort((a,b)=>a.t-b.t);
 return {key:trackKey({...state,zone,weapon,armor}),zone,bpm:score.bpm,running,events,
  weapon,armor,hits:arms.hits,healing:state.healing||null,tuning:healing?.tuning??440,genre:genre.genre,chords,cycle:state.cycle||0,kind:state.prologue>0?'prologue':state.running===false?'rest':'deck',segments:plan.map(({card,mood,foes,monsters,theme,start,turns,steps,party,joins,choice})=>({card,mood,foes,monsters,theme,start,turns,steps,party,joins,choice})),steps,stepTimes,duration:stepTimes[steps],moving,scrollBase,notes,actors:cast,objects,fx};
}

// エリアの帯から、この曲で画面に映る物を取り出し、各コマの動きと音を決める。
// 手前（near）の物は、ゆっぴが触れた時だけ動いて鳴る。中景・遠景は数小節に1回の出番の間だけ動いて鳴る。
function sceneObjects(world,area,moved,scrollBase,steps,note,chordAt,local){
 const shown=[];
 for(const [lane,{pxPerStep,period,objects}] of Object.entries(area.lanes))objects.forEach((item,i)=>{
  const o=world.OBJECTS[item.id];if(!o)return;
  const idle=[0,1,2,3].find(f=>!o.sound?.frames.includes(f))??0,phase=i%(LANE_PERIOD[lane]||1),frames=[];
  let seen=false;
  for(let s=0;s<steps;s++){
   const sx=((item.x-(scrollBase+moved[s])*pxPerStep)%period+period)%period,copies=[sx,sx-period];
   const visible=copies.some(c=>c+o.width>VIEW_LEFT&&c<VIEW_RIGHT);seen||=visible;
   const active=lane==='near'?copies.some(c=>c<=HERO_X+8&&c+o.width>=HERO_X-8)&&(item.id!=='arch'||local(s)<4):visible&&((s>>3)+phase)%LANE_PERIOD[lane]===0;
   const frame=active?s%4:idle;frames.push(frame);
   if(active&&o.sound?.frames.includes(frame)&&(s===0||frames[s-1]!==frame)){
    const [tone,octave]=OBJECT_PITCH[o.sound.voice]??[0,12];
    note(s,o.sound.voice,chordAt(s)[tone]+octave,LANE_GAIN[lane]*(item.id==='arch'?2:1),'main',.3,0,item.id);
   }
  }
  if(seen)shown.push({id:item.id,lane,x:item.x,width:o.width,height:o.height,baseline:o.baseline,pxPerStep,period,frames:frames.join('')});
 });
 return shown;
}

// 楽譜を波形にする。末尾からはみ出た余韻は先頭へ回し込み、ループの継ぎ目を消す。
export function renderTrack(track,rate=MUSIC_RATE){
 const len=Math.round(track.duration*rate),buses={main:new Float32Array(len),hero:new Float32Array(len)};
 track.notes.forEach((n,i)=>{n.tuning=track.tuning;const t=track.stepTimes[n.step]+(n.off||0)*(track.stepTimes[n.step+1]-track.stepTimes[n.step]),start=Math.round(t*rate);voice(buses[n.bus],n,INSTRUMENTS[n.inst],start,rate,i,Math.round(n.end*rate)-start);});
 const beat=60/track.bpm;
 if(track.fx.lowpass)lowpass(buses.hero,track.fx.lowpass);
 if(track.fx.warm)lowpass(buses.main,track.fx.warm);
 if(track.fx.echo)echo(buses.hero,Math.round(track.fx.echo[0]*beat*rate),track.fx.echo[1],track.fx.echo[2]);
 const out=new Float32Array(len);
 for(let n=0;n<len;n++)out[n]=Math.tanh((buses.main[n]+buses.hero[n])*1.2)*.9;
 return out;
}
// サイン波は表引き（Math.sin より数倍速い）。位相は 0〜1 の周期で持つ。
const TABLE_SIZE=4096,SINE=Float32Array.from({length:TABLE_SIZE+1},(_,i)=>Math.sin(2*Math.PI*i/TABLE_SIZE));
function sine(phase){const x=(phase-Math.floor(phase))*TABLE_SIZE,i=x|0;return SINE[i]+(SINE[i+1]-SINE[i])*(x-i);}
// 1音を合成して足し込む。減衰は掛け算で進め、聞こえなくなったら打ち切る（端末で一瞬で終わるように）。
function voice(buf,n,inst,start,rate,seed,until=Infinity){
 const len=buf.length,frames=Math.min(Math.ceil((n.dur+inst.decay*3)*rate),rate*3),r=rng('noise'+seed);
 const f0=n.freq??(n.midi==null?0:(n.tuning||440)*2**((n.midi-69)/12)),ratios=inst.partials?.map(p=>p[0])??[],amps=inst.partials?.map(p=>p[1])??[],phases=ratios.map(()=>0);
 const fall=Math.exp(-1/(inst.decay*rate)),release=Math.exp(-1/(inst.decay*.5*rate)),held=Math.round(n.dur*rate),attack=Math.max(1,inst.attack*rate),w=1/rate;
 const bend=inst.glide?Math.exp(-1/(.06*rate)):0,close=Math.exp(-1/(.06*rate));
 let x0=0,y=0,decay=1,glide=1,trem=1;
 // 再生できる高さ（サンプリングレートの半分）を超える倍音は計算しない（折り返して濁るのも防ぐ）
 const nyquist=rate*.45,usable=ratios.length?ratios.filter(ratio=>f0*ratio<nyquist).length||1:0;
 for(let k=0;k<frames;k++){
  decay*=k<held?fall:fall*release;
  if(k>=until)decay*=close;
  let env=decay*n.gain;if(k<attack)env*=k/attack;
  if(env<3e-4&&k>attack)break; // 聞こえない小ささになったら打ち切る（端末で軽く）
  const t=k/rate;
  if(inst.tremolo){if((k&15)===0)trem=1-inst.tremolo[1]*.5*(1+sine(inst.tremolo[0]*t));env*=trem;}
  let v=0;
  if(inst.noise){const x=r()*2-1;y=inst.hp*(y+x-x0);x0=x;v=y;}
  else{
   let f=f0;
   if(bend){glide*=bend;f*=2**(inst.glide*glide/12);}
   if(inst.vibrato)f*=1+inst.vibrato[1]*sine(inst.vibrato[0]*t);
   for(let p=0;p<usable;p++){phases[p]+=w*f*ratios[p];v+=amps[p]*sine(phases[p]);}
  }
  buf[(start+k)%len]+=v*env;
 }
}
function lowpass(buf,a){let y=0;for(let lap=0;lap<2;lap++)for(let n=0;n<buf.length;n++){y+=a*(buf[n]-y);if(lap)buf[n]=y;}}
function echo(buf,delay,feedback,mix){
 const len=buf.length,wet=new Float32Array(len);
 for(let lap=0;lap<4;lap++)for(let n=0;n<len;n++){const d=(n-delay%len+len)%len;wet[n]=buf[d]+feedback*wet[d];}
 for(let n=0;n<len;n++)buf[n]+=mix*wet[n];
}

// 再生位置（秒）→ 今のコマ番号。画面はこれだけを見て動く。
export function stepAt(track,seconds){
 const t=((seconds%track.duration)+track.duration)%track.duration,times=track.stepTimes;
 let lo=0,hi=track.steps-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(times[mid]<=t)lo=mid;else hi=mid-1;}
 return {step:lo,fraction:(t-times[lo])/(times[lo+1]-times[lo])};
}
// 冒険の進み具合（山札の何枚目か・そのカードの何ターン目か・ターンの経過割合）→ 曲の再生位置（秒）。
// 区間の番号（コマから）。
export function segmentIndex(track,step){let lo=0,hi=track.segments.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(track.segments[mid].start<=step)lo=mid;else hi=mid-1;}return lo;}
export function secondsAt(track,card,turn,fraction){
 const seg=track.running?track.segments[Math.max(0,Math.min(track.segments.length-1,card))]:track.segments[0];
 // 冒険中は、ターンの終わりを過ぎても（次の通信が届くまで）次のターン・次のカードへそのまま進む。止めると絵が止まって跳ねる。
 const raw=seg.start+(Math.max(0,turn)+Math.max(0,Math.min(8,fraction)))*TURN_STEPS;
 const step=track.running?raw%track.steps:Math.min(seg.start+seg.steps-1e-6,raw),k=Math.floor(step);
 return track.stepTimes[k]+(step-k)*(track.stepTimes[k+1]-track.stepTimes[k]);
}

export function encodeWav(samples,rate=MUSIC_RATE){
 const bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer);
 const text=(offset,s)=>[...s].forEach((c,i)=>bytes[offset+i]=c.charCodeAt(0));
 text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let n=0;n<samples.length;n++)view.setInt16(44+n*2,Math.round(Math.max(-1,Math.min(1,samples[n]))*32000),true);
 return bytes;
}
