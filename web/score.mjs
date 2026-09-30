// 楽譜 → 音と動き。画面で動くもの（足音・攻撃・カエル・蛍・背景の花や門…）の1コマ1コマが音符になる。
// 同じ楽譜から各キャラ・背景オブジェクトのコマ番号とスクロール量も決めるので、見た目と音は必ず同じ拍に乗る。
// 1コマ = 8分音符。音は「音が鳴るコマに入った瞬間」だけ鳴る。鳴らない物は動かない。
// 冒険中の曲は「ダンジョン1周（1〜10階）」そのもの。1階 = 16拍 = サーバーの1歩（STEP_MS）なので、再生位置がそのまま冒険の進行になる。
// ブラウザーではここで合成したWAVを1つのHTML Audioでループ再生する（背景再生のため、リアルタイム生成はしない）。
export const SEGMENT_STEPS = 32; // 16拍 = 1階
export const FLOORS = 10;
export const MUSIC_RATE = 22050;
export const HERO_X = 88; // ゆっぴの立ち位置の中心（世界 320×180 の座標）
export const VIEW_LEFT = 32, VIEW_RIGHT = 288; // 画面に映る範囲（世界の中央 256×144）

// どのコマで音が鳴るか。scripts/pixel-art.mjs の SOUND_FRAMES と一致させる（テストで確認）。
export const SOUND_FRAMES = {
 'hero.walk':[0,2], 'hero.attack':[2], 'hero.cheer':[0,2], 'hero.rest':[0],
 'cat.walk':[1,3], 'cat.pounce':[0], 'slime.bounce':[0], 'guardian.idle':[0],
 'chest.open':[0,1,2,3], 'spark.twinkle':[0,2], 'fire.burn':[0,1,2,3],
 'frog.croak':[0], 'owl.hoot':[0,2], 'firefly.glow':[0], 'leaves.sway':[0,2]
};

// 和音は1小節（8コマ = 4拍）ごと。8小節の進行をくり返す。
const ZONE_SCORES = {
 forest:{bpm:88, chords:[[52,55,59],[48,52,55],[43,47,50],[50,54,57],[52,55,59],[48,52,55],[45,48,52],[47,51,54]]}
};
export const ZONE_BPM = Object.fromEntries(Object.entries(ZONE_SCORES).map(([id,z])=>[id,z.bpm]));
// 1階の長さ（ミリ秒）。server/game.mjs の STEP_MS と一致させる（テストで確認）。
export const floorMs = zone => Math.round(SEGMENT_STEPS/2*60000/ZONE_BPM[zone]);
// 階 → 場面。server/game.mjs の eventFor と同じ規則（テストで確認）。
export const moodForFloor = floor => floor===10?'boss':floor%4===0?'treasure':floor%2===0?'battle':'travel';

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
const HERO_ACTION = {travel:'walk',battle:'attack',treasure:'cheer',boss:'attack',rest:'rest'};
const CAT_ACTION = {travel:'walk',battle:'pounce',treasure:'walk',boss:'pounce',rest:'rest'};
const FOE = {travel:['spark','twinkle'],battle:['slime','bounce'],treasure:['chest','open'],boss:['guardian','idle'],rest:['fire','burn']};

// 武器はゆっぴの音色、防具はゆっぴの響き。
const WEAPON_VOICE = {none:'hum', 'leaf-blade':'pluck', 'crystal-staff':'bell', 'moon-blade':'lead'};
const ARMOR_FX = {none:{}, 'moss-cloak':{lowpass:.35, echo:[.5,.15,.25]}, 'prism-mail':{shimmer:true}, 'star-cloak':{echo:[1,.25,.3]}};

const INSTRUMENTS = {
 hum:{partials:[[1,1],[2,.12],[3,.05]], attack:.03, decay:.42},
 pluck:{partials:[[1,1],[2,.55],[3,.35],[4,.22],[5,.12]], attack:.002, decay:.2},
 bell:{partials:[[1,1],[2,.45],[3,.18],[4,.1],[6,.05]], attack:.002, decay:.7},
 lead:{partials:[[1,1],[2,.5],[3,.33],[4,.25],[5,.2],[6,.16]], attack:.02, decay:.5, vibrato:[5.5,.006]},
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

export function trackKey(s){return [s.zone||'forest',s.running===false?'rest':'run',s.running===false?s.floor||1:'',s.weapon||'none',s.armor||'none',levelTier(s.level||1),s.companion?1:0].join('|');}

// 区間の並び。冒険中は 1〜10階、休憩中は焚き火の4区間。道を進む階は、進むたびに表情（スウィング・フィル・ブレイク）を変える。
function planFor(state,world){
 let walked=0;
 const floors=state.running===false?Array.from({length:4},()=>({floor:state.floor||1,mood:'rest'})):Array.from({length:FLOORS},(_,i)=>({floor:i+1,mood:moodForFloor(i+1)}));
 return floors.map((seg,k)=>{const style=STYLES[(seg.mood==='travel'?walked++:k)%4];return {...seg,index:k,start:k*SEGMENT_STEPS,theme:themeFor(world,seg.floor,seg.mood),style:seg.mood==='travel'||seg.mood==='rest'?style:{...style,breakBar:null}};});
}
const breakAt=(plan,s)=>{const seg=plan[Math.floor(s/SEGMENT_STEPS)];return seg.style.breakBar===Math.floor(s%SEGMENT_STEPS/8);};
// 歩いているコマ（道の階で、ブレイクの小節以外）と、その累計。
function walkOf(plan){
 const steps=plan.length*SEGMENT_STEPS,moving=Array.from({length:steps},(_,s)=>plan[Math.floor(s/SEGMENT_STEPS)].mood==='travel'&&!breakAt(plan,s)),moved=[0];
 for(let s=0;s<steps;s++)moved.push(moved[s]+(moving[s]?1:0));
 return {moving,moved};
}

// エリア = 1枚の長いスクロール絵 = 楽譜。3つの段それぞれに、ダンジョン1周で進む長さの帯があり、そこに物が並ぶ。
// 物の景色（森の入口・森の奥…）は「その物が画面の右端から現れる時の階」で決まるので、景色は切れ目なく移り変わる。
// 門は、道の階が始まる瞬間にゆっぴの真上を通る位置に置く。帯の端は先頭へつながり、1周してもそのまま続く。
export function layoutArea(world,zone='forest'){
 const plan=planFor({zone,running:true},world),{moved}=walkOf(plan),total=moved[moved.length-1],steps=plan.length*SEGMENT_STEPS;
 const r=rng(zone+':area'),lanes={};
 for(const [lane,spec] of Object.entries(world.LANES)){
  const pxPerStep=spec.pxPerBeat/2,period=total*pxPerStep,items=[];
  const themeAt=x=>{const m=((x-VIEW_RIGHT)/pxPerStep%total+total)%total,s=Math.min(steps-1,moved.findIndex(v=>v>=m));return plan[Math.floor(Math.max(0,s)/SEGMENT_STEPS)].theme;};
  const arch=world.OBJECTS.arch;
  if(lane==='near'&&arch)for(const seg of plan)if(seg.mood==='travel')items.push({id:'arch',x:HERO_X-arch.width/2+moved[seg.start]*pxPerStep});
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
 return {zone,bpm:ZONE_SCORES[zone].bpm,floors:plan.map(({floor,mood,theme})=>({floor,mood,theme})),floorStart:plan.map(seg=>moved[seg.start]),walk:total,lanes};
}

// state: {zone, running, floor, weapon, armor, level, companion}
// world: scripts/forest-objects.mjs の {LANES, THEMES, OBJECTS}。area: layoutArea の結果（areas/forest.json）。
export function composeTrack(state,world=null,area=world?layoutArea(world,state.zone||'forest'):null){
 const zone=ZONE_SCORES[state.zone]?state.zone:'forest',score=ZONE_SCORES[zone],tier=levelTier(state.level||1),running=state.running!==false;
 const weapon=WEAPON_VOICE[state.weapon]?state.weapon:'none',armor=ARMOR_FX[state.armor]?state.armor:'none';
 const plan=planFor(state,world),steps=plan.length*SEGMENT_STEPS,beat=60/score.bpm,prev=s=>(s+steps-1)%steps;
 const segAt=s=>plan[Math.floor(s/SEGMENT_STEPS)],chordAt=s=>score.chords[(s>>3)%8],local=s=>s%SEGMENT_STEPS;
 const inFill=s=>local(s)>=SEGMENT_STEPS-4,inBreak=s=>breakAt(plan,s);
 // スウィング: 裏拍（奇数コマ）を区間ごとの量だけ後ろへ。コマの切り替えも同じ時刻にずらすので、絵もずれない。
 const stepTimes=Array.from({length:steps+1},(_,s)=>s===steps?steps/2*beat:Math.floor(s/2)*beat+(s%2?segAt(s).style.swing*beat:0));
 const tune=melody(zone),notes=[],voice=WEAPON_VOICE[weapon],fx=ARMOR_FX[armor];
 // 音程はすべて、その小節の和音の構成音に吸着させ、小節の終わりで閉じる（次の和音へ持ち越さない）。
 const barEnd=step=>stepTimes[Math.min(steps,(step>>3)*8+8)];
 const note=(step,inst,midi,gain,bus='main',dur=.3)=>notes.push({step,inst,midi:midi==null?null:toChord(midi,chordAt(step)),gain,bus,dur,end:barEnd(step)});
 const heroNote=(s,midi,gain)=>{note(s,voice,midi,gain,'hero');if(fx.shimmer)note(s,'chime',midi+12,gain*.3,'hero');if(tier>=2)note(s,voice,midi-12,gain*.3,'hero');if(tier>=3)note(s,voice,chordAt(s)[1]+12,gain*.25,'hero');};
 const melodyAt=s=>tune[(s>>1)%tune.length]+12*segAt(s).style.lift;
 // 各コマで鳴る音。どれも「その役者がそのコマの動きをした音」。
 const sounds={
  'hero.walk':s=>heroNote(s,melodyAt(s),.34),
  'hero.attack':s=>{heroNote(s,melodyAt(s)+12,.42);note(s,'swish',null,weapon==='none'?.12:.22);if(tier>=1)note(s,voice,melodyAt(s)+19,.14,'hero');},
  'hero.cheer':s=>heroNote(s,melodyAt(s)+12,.36),
  'hero.rest':s=>note(s,voice,melodyAt(s),.24,'hero',.9),
  'cat.walk':s=>note(s,'tick',null,.16),
  'cat.pounce':s=>note(s,'kick',48,.5),
  'slime.bounce':s=>note(s,'boing',chordAt(s)[0]-12,.46),
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
 const hero=Array.from({length:steps},(_,s)=>partyEntry('hero',HERO_ACTION,a=>a)(s));
 const heroFrame=s=>+hero[s].split('-')[2],fighting=s=>['battle','boss'].includes(segAt(s).mood);
 const cast={hero};
 if(state.companion)cast.cat=Array.from({length:steps},(_,s)=>partyEntry('cat',CAT_ACTION,a=>a==='walk'?'catwalk':a)(s));
 // 敵は階の頭で右から滑り込む（最初の4コマは跳ねずに近づくので鳴らない）。斬撃が当たったコマ（attack-2）と次のコマでひるむ。
 cast.foe=Array.from({length:steps},(_,s)=>{
  const [sprite,action]=FOE[segAt(s).mood];
  if(sprite!=='spark'&&sprite!=='fire'&&local(s)<4)return `${sprite}-${action}-${[1,2,1,2][local(s)]}`;
  if(fighting(s)&&heroFrame(s)===2)return `${sprite}-hit-0`;
  if(fighting(s)&&heroFrame(s)===3&&heroFrame(prev(s))===2)return `${sprite}-hit-1`;
  if(sprite==='spark'&&(s>>3)%4<2)return `${sprite}-${action}-3`;
  return `${sprite}-${action}-${s%4}`;
 });
 // 森の生き物は小節ごとに鳴く・休むを切り替える（休む間は止まっている）。
 const ambient=(sprite,action,idle,active)=>Array.from({length:steps},(_,s)=>{const m=segAt(s).mood,bar=Math.floor(local(s)/8);return `${sprite}-${action}-${active(m,bar,s)?s%4:idle}`;});
 const calm=m=>m==='travel'||m==='rest';
 cast.frog=ambient('frog','croak',2,(m,bar)=>calm(m)&&bar%2===1);
 cast.owl=ambient('owl','hoot',1,(m,bar,s)=>calm(m)&&bar===3||m==='rest'&&bar===1&&segAt(s).index%2===1);
 cast.firefly=ambient('firefly','glow',3,(m,bar)=>m==='rest'||m==='treasure'||m==='travel'&&bar%2===0);
 cast.leaves=ambient('leaves','sway',1,(m,bar,s)=>m!=='rest'&&!inBreak(s));
 // コマの切り替わりで、音が鳴るコマに入った瞬間だけ鳴らす。
 for(const frames of Object.values(cast))frames.forEach((entry,s)=>{
  const [sprite,action,frame]=entry.split('-'),key=sprite+'.'+action;
  if(SOUND_FRAMES[key]?.includes(+frame)&&entry!==frames[prev(s)])sounds[key](s);
 });
 const {moving,moved}=running?walkOf(plan):{moving:Array(steps).fill(false),moved:Array(steps+1).fill(0)};
 // 休憩中は、その階の入口で立ち止まった景色のまま。
 const scrollBase=running||!area?0:area.floorStart[Math.max(0,Math.min(FLOORS-1,(state.floor||1)-1))];
 const objects=world&&area?sceneObjects(world,area,moved,scrollBase,steps,note,chordAt):[];
 // 夜風（背景の空気）。小節の頭で和音がゆっくり息をする。
 for(let s=0;s<steps;s+=8)chordAt(s).forEach(n=>note(s,'pad',n+12,segAt(s).mood==='rest'||inBreak(s)?.05:.035,'main',2.2));
 return {key:trackKey({...state,zone,weapon,armor}),zone,bpm:score.bpm,running,
  segments:plan.map(({floor,mood,theme,start})=>({floor,mood,theme,start})),steps,stepTimes,duration:stepTimes[steps],moving,scrollBase,notes,actors:cast,objects,fx};
}

// エリアの帯から、この曲で画面に映る物を取り出し、各コマの動きと音を決める。
// 手前（near）の物は、ゆっぴが触れた時だけ動いて鳴る。中景・遠景は数小節に1回の出番の間だけ動いて鳴る。
function sceneObjects(world,area,moved,scrollBase,steps,note,chordAt){
 const shown=[];
 for(const [lane,{pxPerStep,period,objects}] of Object.entries(area.lanes))objects.forEach((item,i)=>{
  const o=world.OBJECTS[item.id];if(!o)return;
  const idle=[0,1,2,3].find(f=>!o.sound?.frames.includes(f))??0,phase=i%(LANE_PERIOD[lane]||1),frames=[];
  let seen=false;
  for(let s=0;s<steps;s++){
   const sx=((item.x-(scrollBase+moved[s])*pxPerStep)%period+period)%period,copies=[sx,sx-period];
   const visible=copies.some(c=>c+o.width>VIEW_LEFT&&c<VIEW_RIGHT);seen||=visible;
   const active=lane==='near'?copies.some(c=>c<=HERO_X+8&&c+o.width>=HERO_X-8)&&(item.id!=='arch'||s%SEGMENT_STEPS<4):visible&&((s>>3)+phase)%LANE_PERIOD[lane]===0;
   const frame=active?s%4:idle;frames.push(frame);
   if(active&&o.sound?.frames.includes(frame)&&(s===0||frames[s-1]!==frame)){
    const [tone,octave]=OBJECT_PITCH[o.sound.voice]??[0,12];
    note(s,o.sound.voice,chordAt(s)[tone]+octave,LANE_GAIN[lane]*(item.id==='arch'?2:1));
   }
  }
  if(seen)shown.push({id:item.id,lane,x:item.x,width:o.width,height:o.height,baseline:o.baseline,pxPerStep,period,frames:frames.join('')});
 });
 return shown;
}

// 楽譜を波形にする。末尾からはみ出た余韻は先頭へ回し込み、ループの継ぎ目を消す。
export function renderTrack(track,rate=MUSIC_RATE){
 const len=Math.round(track.duration*rate),buses={main:new Float32Array(len),hero:new Float32Array(len)};
 track.notes.forEach((n,i)=>{const start=Math.round(track.stepTimes[n.step]*rate);voice(buses[n.bus],n,INSTRUMENTS[n.inst],start,rate,i,Math.round(n.end*rate)-start);});
 const beat=60/track.bpm;
 if(track.fx.lowpass)lowpass(buses.hero,track.fx.lowpass);
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
 const len=buf.length,frames=Math.min(Math.ceil((n.dur+inst.decay*4)*rate),rate*4),r=rng('noise'+seed);
 const f0=n.midi==null?0:440*2**((n.midi-69)/12),ratios=inst.partials?.map(p=>p[0])??[],amps=inst.partials?.map(p=>p[1])??[],phases=ratios.map(()=>0);
 const fall=Math.exp(-1/(inst.decay*rate)),release=Math.exp(-1/(inst.decay*.5*rate)),held=Math.round(n.dur*rate),attack=Math.max(1,inst.attack*rate),w=1/rate;
 const bend=inst.glide?Math.exp(-1/(.06*rate)):0,close=Math.exp(-1/(.06*rate));
 let x0=0,y=0,decay=1,glide=1;
 for(let k=0;k<frames;k++){
  decay*=k<held?fall:fall*release;
  if(k>=until)decay*=close;
  let env=decay*n.gain;if(k<attack)env*=k/attack;
  if(env<1e-4&&k>attack)break;
  const t=k/rate;
  if(inst.tremolo)env*=1-inst.tremolo[1]*.5*(1+sine(inst.tremolo[0]*t));
  let v=0;
  if(inst.noise){const x=r()*2-1;y=inst.hp*(y+x-x0);x0=x;v=y;}
  else{
   let f=f0;
   if(bend){glide*=bend;f*=2**(inst.glide*glide/12);}
   if(inst.vibrato)f*=1+inst.vibrato[1]*sine(inst.vibrato[0]*t);
   for(let p=0;p<ratios.length;p++){phases[p]+=w*f*ratios[p];v+=amps[p]*sine(phases[p]);}
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
// 冒険の進み具合（階と、その階の経過割合）→ 曲の再生位置（秒）。
export function secondsForFloor(track,floor,fraction){
 const seg=track.running?Math.max(0,Math.min(FLOORS-1,floor-1)):0;
 return (seg+Math.max(0,Math.min(.999,fraction)))*track.duration/track.segments.length;
}

export function encodeWav(samples,rate=MUSIC_RATE){
 const bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer);
 const text=(offset,s)=>[...s].forEach((c,i)=>bytes[offset+i]=c.charCodeAt(0));
 text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let n=0;n<samples.length;n++)view.setInt16(44+n*2,Math.round(Math.max(-1,Math.min(1,samples[n]))*32000),true);
 return bytes;
}
