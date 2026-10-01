'use strict';
// build.mjs が先頭に SCORE_SOURCE（楽譜エンジンのソース）・WORLD（背景オブジェクトの設定）・EQUIP_LAYERS・ART（ドット絵）を入れる。
/* SCORE_JS */
/* SCENE_JS */
const $=id=>document.getElementById(id);
const THEME_NAMES={entrance:'森の入口',deep:'森の奥',mist:'霧の森',clearing:'守り人の広場',heaven:'天の庭'};
const COMPANION_NAMES={tom:'トム',koro:'コロ',lumi:'ルミ',mio:'ミオ'};
const MOOD_TEXT={travel:'ゆっぴとトムは、森の奥へ進んでいる。',treasure:'宝箱を見つけた。ふたが鳴っている。',boss:'森の守り人が立ちはだかる。',rest:'焚き火のそばで、ひと休み。'};
const MONSTER_NAMES={slime:'スライム',mushling:'キノコの子',beetle:'カブトムシ',wisp:'鬼火',guardian:'森の守り人'};
const CARD_NAME={travel:'道',battle:'戦闘',treasure:'宝箱',boss:'守り人',rest:'休憩'};
const TURN_MS=turnMs('forest');
const sceneText=seg=>TRIALS[seg.mood]?TRIALS[seg.mood].text:seg.mood==='heaven'||seg.mood==='fall'?PROLOGUE_LINES[seg.index*4]:seg.mood==='battle'?[...new Set(seg.monsters)].map(m=>MONSTER_NAMES[m]).join('と')+(seg.foes>1?'が'+seg.foes+'体':'が')+'現れた。ゆっぴが立ち向かう。':MOOD_TEXT[seg.mood];
const WORKER_MAIN='onmessage=e=>{const t=composeTrack(e.data.state,e.data.world);const wav=encodeWav(renderTrack(t));postMessage({key:t.key,wav},[wav.buffer]);};';

let snapshot=null,offset=0,busy=false,loading=false;

// 曲 = 冒険。楽譜から端末内で合成したWAVを、1つのHTML Audioでループ再生する。
const player={
 audio:new Audio(),worker:null,tracks:new Map(),urls:new Map(),track:null,wanted:'',pendingSeek:null,
 init(){
  this.worker=new Worker(URL.createObjectURL(new Blob([SCORE_SOURCE+'\n'+WORKER_MAIN],{type:'text/javascript'})));
  this.worker.onmessage=e=>{this.busyKey=null;this.rendered(e.data);this.flush();};
  this.worker.onerror=()=>showError('曲を作れませんでした。ページを再読み込みしてください。');
  const a=this.audio;a.loop=true;a.preload='auto';a.setAttribute('playsinline','');
  // ループが一周した瞬間に、次の束の曲ができていれば切り替える（画面を開いている間）。
  a.addEventListener('timeupdate',()=>{const t=a.currentTime,wrapped=t+1<(this.lastTime??0);this.lastTime=t;if(wrapped&&this.track?.running&&this.nextKey&&this.urls.has(this.nextKey)&&this.nextKey!==this.track.key){this.wanted=this.nextKey;this.apply(this.nextKey);}});
  a.addEventListener('loadedmetadata',()=>{if(this.pendingSeek!=null){a.currentTime=this.pendingSeek%a.duration;this.pendingSeek=null;}});
  for(const type of ['play','pause'])a.addEventListener(type,()=>this.sync());
  a.addEventListener('error',()=>{this.sync();showError('曲を読み込めませんでした。再生ボタンでもう一度お試しください。');});
  if('mediaSession' in navigator)for(const [action,run] of [['play',()=>this.toggle(true)],['pause',()=>this.audio.pause()],['stop',()=>this.audio.pause()]]){try{navigator.mediaSession.setActionHandler(action,run);}catch{}}
 },
 // 楽譜に渡す状態。攻撃力（戦闘のターン数が変わる）も渡す。
 // 合成の依頼。Worker が作業中なら、最新の依頼だけを取っておき、終わってから送る。
 request(state){const key=trackKey(state);if(this.urls.has(key)||this.busyKey===key)return;this.queued={state,key};this.flush();},
 flush(){if(this.busyKey||!this.queued)return;const {state,key}=this.queued;this.queued=null;if(this.urls.has(key))return;this.busyKey=key;this.worker.postMessage({state,world:WORLD});},
 stateFor(g){
  const choices=Object.fromEntries(Object.entries(g.choices||{}).filter(([k])=>k.startsWith(g.cycle+':')).map(([k,v])=>[+k.split(':')[1],v]));
  return {zone:'forest',running:g.running,cycle:g.cycle,card:g.card,weapon:g.equipment?.weapon,armor:g.equipment?.armor,level:1,companion:true,power:snapshot?.combatPower??1,party:g.party||['tom'],choices,prologue:g.prologue||0,songbook:g.songbook||[],healing:g.healing&&g.healing.until>Date.now()+offset?g.healing.id:null};
 },
 // ゲームの状態に合う曲を用意する（装備・休憩が変わった時だけ作り直す）。
 want(g){
  const state=this.stateFor(g),key=trackKey(state);
  if(key===this.wanted)return;
  this.wanted=key;
  if(!this.tracks.has(key))this.tracks.set(key,composeTrack(state,WORLD));
  if(this.urls.has(key))this.apply(key);else{this.request(state);this.sync();}
  // 束の残りが4枚になったら、次の束の曲を裏で作っておく（ループの継ぎ目でそのまま切り替える）。
  if(g.running&&g.card>=DECK_SIZE-4){const next={...state,cycle:state.cycle+1,card:0},nextKey=trackKey(next);this.nextKey=nextKey;if(!this.tracks.has(nextKey)&&this.urls.has(key)&&!this.busyKey){this.tracks.set(nextKey,composeTrack(next,WORLD));this.request(next);}}
 },
 rendered({key,wav}){
  this.urls.set(key,URL.createObjectURL(new Blob([wav],{type:'audio/wav'})));
  for(const [k,url] of this.urls)if(this.urls.size>4&&k!==key&&k!==this.track?.key&&k!==this.nextKey){URL.revokeObjectURL(url);this.urls.delete(k);this.tracks.delete(k);}
  if(key===this.wanted)this.apply(key);
 },
 // 曲を差し替える。冒険中どうし（装備を変えた時など）は、次の小節の頭まで待ってから差し替え、
 // 新しい曲の同じカード・同じターンから続ける（フレーズの途中で音色が変わらないように）。
 apply(key){
  const next=this.tracks.get(key),a=this.audio,playing=!a.paused,keep=playing&&this.track&&this.track.kind===next.kind;
  if(keep){const {step}=stepAt(this.track,a.currentTime),bar=(Math.floor(step/TURN_STEPS)+1)*TURN_STEPS;this.pendingSwap={key,bar,from:this.track};return;}
  this.swap(key,this.target());
 },
 swap(key,seconds){
  const a=this.audio,playing=!a.paused;
  this.pendingSwap=null;this.track=this.tracks.get(key);a.src=this.urls.get(key);
  this.pendingSeek=seconds;
  if(playing)a.play().catch(()=>this.sync());
  this.sync();
 },
 // 毎フレーム: 差し替え待ちの小節の頭に来たら、新しい曲の同じカード・同じターンへ。
 tick(){
  const p=this.pendingSwap,a=this.audio;if(!p||a.paused)return;
  const {step}=stepAt(p.from,a.currentTime),barStart=Math.floor(step/TURN_STEPS)*TURN_STEPS;
  if(barStart!==p.bar%p.from.steps)return;
  const seg=p.from.segments[segmentIndex(p.from,barStart)],turn=(barStart-seg.start)/TURN_STEPS;
  this.swap(p.key,secondsAt(this.tracks.get(p.key),seg.card,turn,0));
 },
 // 冒険の進み具合から、曲のどこを鳴らすべきか。
 target(){
  const t=this.visual();if(!t||!snapshot)return 0;
  if(!t.running)return performance.now()/1000%t.duration;
  const g=snapshot.game,fraction=(Date.now()+offset-g.lastAt)/TURN_MS;
  if(t.kind==='prologue'){const done=PROLOGUE_TURNS-(g.prologue||0);return secondsAt(t,Math.floor(done/4),done%4,fraction);}
  return secondsAt(t,g.card,g.turn||0,fraction);
 },
 // 描く楽譜: 再生中は鳴っている曲、止まっている間はサーバーの状態に合う曲（できていれば）。
 visual(){return !this.audio.paused&&this.track?this.track:this.tracks.get(this.wanted)??this.track??null;},
 clock(){return !this.audio.paused&&this.track?this.audio.currentTime:this.target();},
 // 通信で分かった進み具合と再生位置がずれていたら合わせる（冒険中のみ）。
 align(){
  const t=this.track,a=this.audio;if(!t?.running||a.paused||a.readyState<1)return;
  const want=this.target(),diff=Math.abs(((a.currentTime-want)%t.duration+t.duration*1.5)%t.duration-t.duration/2);
  if(diff>.4)a.currentTime=want;
 },
 async toggle(forcePlay=false){
  const a=this.audio;
  if(!a.paused&&!forcePlay){a.pause();return;}
  if(!this.track)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
  a.volume=Number($('volume').value)/100;
  if(a.readyState>=1)a.currentTime=this.target();else this.pendingSeek=this.target();
  try{await a.play();}catch{showError('音楽を再生できませんでした。もう一度再生ボタンを押してください。');}
  this.sync();
 },
 sync(){
  const playing=!this.audio.paused,waiting=!this.track||(this.wanted!==this.track.key&&!playing);
  $('play').disabled=!this.track;
  $('play').setAttribute('aria-pressed',String(playing));
  $('playLabel').textContent=!this.track?'準備中':playing?'止める':'再生';
  if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';
  document.body.dataset.waiting=String(waiting);
 },
metadata(seg){
  if(!('mediaSession' in navigator)||!('MediaMetadata' in window))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:(seg.mood==='rest'?'焚き火':CARD_NAME[seg.mood]+' · '+THEME_NAMES[seg.theme]),artist:'SpaceBGM',album:'蛍火の森'});
 }
};

// なめらかな時計。音声の再生位置は端末によって飛び飛びにしか進まないので、
// 最後に分かった位置から performance.now() で補って毎フレーム進め、実際の位置と 60ms 以上ずれたら合わせ直す。
const smooth={
 base:0,at:0,duration:0,
 now(seconds,duration){
  const t=performance.now(),predicted=this.base+(t-this.at)/1000;
  if(duration!==this.duration||Math.abs(predicted-seconds)>.06){this.base=seconds;this.at=t;this.duration=duration;return seconds;}
  return predicted%duration;
 }
};

// ドット絵は起動時に1度だけ小さな画像にしておき、毎回は貼るだけ。
// 舞台は世界（320×180）の横の中央 256 を描く。縦長の画面では空を上に伸ばし、残りの高さいっぱいに広げる（世界は下にそろえる）。
let VIEW_TOP=0;
function layoutStage(){
 const screen=document.querySelector('.screen'),wrap=document.querySelector('.stage-wrap'),c=$('stage');
 const status=$('statusWindow'),others=[...screen.children].filter(el=>el!==wrap&&el!==status&&!el.hidden).reduce((a,el)=>a+el.offsetHeight+8,0);
 const availW=screen.clientWidth-16,availH=screen.clientHeight-16-others-(status.hidden?0:96);if(availW<=0||availH<=0)return;
 const H=Math.max(180,Math.min(230,Math.round(256*availH/availW)));
 if(c.height!==H){c.height=H;stage.snap.height=H;stage.ctx.imageSmoothingEnabled=false;stage.dirty=true;VIEW_TOP=180-H;}
 wrap.style.width=Math.floor(Math.min(availW,availH*256/H))+'px';
 // 舞台と他のウィンドウを置いて残った高さが狭ければ、ステータスウィンドウを隠す（スクロールさせない）
 const left=screen.clientHeight-16-others-wrap.offsetHeight-8;status.hidden=left<88;
 // 仲間の姿は、空いた高さに合わせて大きく（32ドットの整数倍に近い大きさで）
 status.style.setProperty('--icon',Math.max(40,Math.min(112,Math.floor((left-110)/32)*32))+'px');
}
const sprites={
 cache:new Map(),bg:new Map(),
 rgba:Object.fromEntries(Object.entries(ART.palette).map(([ch,hex])=>[ch,[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]])),
 get(key){
  let c=this.cache.get(key);if(c!==undefined)return c;
  const g=ART.grids[key];c=null;
  if(g){
   c=document.createElement('canvas');c.width=g.w;c.height=g.h;
   const ctx=c.getContext('2d'),img=ctx.createImageData(g.w,g.h);
   for(let i=0;i<g.d.length;i++){const p=this.rgba[g.d[i]];if(!p)continue;img.data.set(p,i*4);img.data[i*4+3]=255;}
   ctx.putImageData(img,0,0);
  }
  this.cache.set(key,c);return c;
 },
 // 景色の空の色（遠景のいちばん上の色）。縦長の画面で伸ばした空を塗る。
 skyColor(theme){const c=this.bg.get(theme+'-far');if(!c)return '#232046';if(!this.sky)this.sky={};if(!this.sky[theme]){const [r,g,b]=c.getContext('2d').getImageData(4,1,1,1).data;this.sky[theme]=`rgb(${r},${g},${b})`;}return this.sky[theme];},
 // 空と地面は景色ごとの SVG を1度だけ画像にする。
 loadBackgrounds(){
  for(const [key,svg] of Object.entries(ART.bg)){
   const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=320;c.height=180;c.getContext('2d').drawImage(img,0,0);this.bg.set(key,c);stage.dirty=true;};
   img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
 }
};

// 舞台。何をどこに描くかは sceneAt（web/scene.mjs）が決め、ここはそのリストを Canvas に描くだけ。
// 変化があった時だけ描き直す。景色が変わる時（空と地面）と曲が切り替わる時（画面全体）は、前の絵から滑らかにつなぐ。
const stage={
 ctx:null,track:null,gear:[],last:'',dirty:true,segment:-1,theme:'',themeFade:null,swap:null,
 init(){const c=$('stage');this.ctx=c.getContext('2d');this.ctx.imageSmoothingEnabled=false;this.snap=document.createElement('canvas');this.snap.width=c.width;this.snap.height=c.height;},
 setGear(g){const items=[g.equipment?.weapon,g.equipment?.armor].filter(id=>id&&EQUIP_LAYERS[id]).flatMap(id=>EQUIP_LAYERS[id].map(layer=>id+':'+layer));if(items.join()!==this.gear.join()){this.gear=items;this.dirty=true;}},
 // 曲が切り替わったら、今の画面を写しておき 0.5 秒かけて新しい画面へ溶かす。
 setTrack(track){
  if(track===this.track)return;
  if(this.track){this.snap.getContext('2d').clearRect(0,0,256,this.snap.height);this.snap.getContext('2d').drawImage($('stage'),0,0);this.swap={start:performance.now()};}
  this.track=track;this.segment=-1;this.dirty=true;
 },
 enterSegment(scene){
  const seg=scene.seg;this.segment=scene.index;
  if(seg.theme!==this.theme){if(this.theme)this.themeFade={from:this.theme,start:performance.now()};this.theme=seg.theme;}
  $('themeName').textContent=THEME_NAMES[seg.theme]||'';
  $('sceneText').textContent=sceneText(seg);
  player.metadata(seg);
 },
 tiles(item,theme,alpha){
  const c=sprites.bg.get(theme+'-'+item.layer);if(!c||alpha<=0)return;
  const x=-Math.round(item.offset%320)-VIEW_LEFT;this.ctx.globalAlpha=alpha;
  this.ctx.drawImage(c,x,-VIEW_TOP);this.ctx.drawImage(c,x+320,-VIEW_TOP);this.ctx.globalAlpha=1;
 },
 draw(seconds){
  const t=this.track;if(!t)return;
  const scene=sceneAt(t,seconds,this.gear);
  if(scene.index!==this.segment)this.enterSegment(scene);
  if(t.kind==='prologue'){const line=PROLOGUE_LINES[scene.index*4+Math.min(3,Math.floor((scene.step-scene.seg.start)/TURN_STEPS))];if($('sceneText').textContent!==line)$('sceneText').textContent=line;}
  const now=performance.now(),themeA=this.themeFade?Math.min(1,(now-this.themeFade.start)/1200):1,swapA=this.swap?Math.min(1,(now-this.swap.start)/500):1;
  rhythm.update(t,seconds);
  const ring=rhythm.ring(t,scene,seconds),label=rhythm.label();
  if($('rhythmLabel').textContent!==label)$('rhythmLabel').textContent=label;
  const sig=(ring?ring.x+','+ring.y+','+ring.r+'|':'')+scene.items.map(i=>i.kind==='bg'?i.layer+Math.round(i.offset):i.kind==='aura'?'aura'+i.r+i.alpha.toFixed(2):i.key+i.x+','+i.y).join('|')+'|'+scene.shake+'|'+themeA.toFixed(2)+'|'+swapA.toFixed(2);
  if(sig===this.last&&!this.dirty)return;
  this.last=sig;this.dirty=false;
  const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,256,ctx.canvas.height);
  // 伸ばした空は、いまの景色の空の色で塗る
  if(VIEW_TOP<0){ctx.fillStyle=sprites.skyColor(this.theme);ctx.fillRect(0,0,256,-VIEW_TOP+2);
   // 伸ばした空の星（動かない飾り。動かない物は鳴らない）
   ctx.fillStyle='#EAE6F5';for(let i=0;i<-VIEW_TOP/6;i++){const x=(i*97+31)%256,y=(i*53+17)%Math.max(1,-VIEW_TOP-8);ctx.globalAlpha=.25+(i%3)*.2;ctx.fillRect(x,y,1,1);}ctx.globalAlpha=1;}
  ctx.setTransform(1,0,0,1,0,scene.shake);
  for(const item of scene.items){
   if(item.kind==='aura'){ctx.globalAlpha=item.alpha;ctx.fillStyle='#A9DDE2';ctx.beginPath();ctx.arc(item.x-VIEW_LEFT,item.y-VIEW_TOP,item.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;continue;}
   if(item.kind==='bg'){if(this.themeFade&&themeA<1)this.tiles(item,this.themeFade.from,1);this.tiles(item,this.theme,themeA);continue;}
   const c=sprites.get(item.key);if(c)ctx.drawImage(c,item.x-VIEW_LEFT,item.y-VIEW_TOP);
  }
  ctx.setTransform(1,0,0,1,0,0);
  if(ring){ctx.strokeStyle='#A9DDE2';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ring.x-VIEW_LEFT,ring.y-VIEW_TOP,Math.max(4,ring.r),0,Math.PI*2);ctx.stroke();if(ring.r<=6){ctx.fillStyle='#F0A9B9';ctx.fillRect(ring.x-VIEW_LEFT-1,ring.y-37,3,3);}}
  if(themeA>=1)this.themeFade=null;
  if(this.swap){ctx.globalAlpha=1-swapA;ctx.drawImage(this.snap,0,0);ctx.globalAlpha=1;if(swapA>=1)this.swap=null;}
 }
};

// リズムゲーム: 世界の音を集める。ねらいの物が鳴る瞬間に合わせて3回タップすると、その音が歌の書に記される。
// 判定は曲の再生位置（なめらかな時計）と、楽譜の events（集められる音が鳴る時刻）で行う。
const rhythm={
 target:null,hits:0,needed:3,lastEvent:null,message:'',messageUntil:0,collected:new Set(),
 // src の音が now から horizon 秒のうちに鳴る時刻（ループの継ぎ目をまたぐ分も含める）
 upcoming(track,now,src,horizon){
  const ev=track.events,out=[],first=t=>{let lo=0,hi=ev.length;while(lo<hi){const mid=(lo+hi)>>1;if(ev[mid].t<t)lo=mid+1;else hi=mid;}return lo;};
  // ループの継ぎ目をまたぐ分も見るため、now と now - duration の2か所から探す
  for(const shift of [0,track.duration])for(let i=first(now-.2-shift);i<ev.length;i++){const e=ev[i],dt=e.t+shift-now;if(dt>horizon)break;if(dt>-.2&&(!src||e.src===src))out.push({src:e.src,step:e.step,t:e.t,dt});}
  return out.sort((a,b)=>a.dt-b.dt);
 },
 update(track,now){
  if(!track.events?.length||track.kind==='prologue'){this.target=null;return;}
  const t=performance.now();if(t-(this.checked||0)<250)return;this.checked=t;
  const bar=8*(track.duration/track.steps);
  // ねらいを選び直す: これから2小節で、まだ集めていない音のうち一番多く鳴るもの（集め終えた音・集めている途中の音は外す）
  const book=new Set([...(snapshot?.game.songbook||[]),...this.collected]),count={};
  if(this.target&&!book.has(this.target)&&this.upcoming(track,now,this.target,bar*4).length)return;
  for(const e of this.upcoming(track,now,null,bar*2))if(!book.has(e.src))count[e.src]=(count[e.src]||0)+1;
  const next=Object.entries(count).sort((a,b)=>b[1]-a[1])[0]?.[0]??null;
  if(next!==this.target){this.target=next;this.hits=0;}
 },
 say(text){this.message=text;this.messageUntil=performance.now()+1400;},
 label(){
  if(performance.now()<this.messageUntil)return this.message;
  return this.target?'♪ '+SOUND_NAMES[this.target]+'　'+this.hits+'/'+this.needed:'';
 },
 tap(){
  const t=player.visual();if(!t||!this.target)return;
  if(player.audio.paused){this.say('再生すると、世界の音を集められる');return;}
  const now=smooth.now(player.clock(),t.duration),near=this.upcoming(t,now-.2,this.target,.4).map(e=>({...e,dt:Math.abs(e.dt-.2)})).sort((a,b)=>a.dt-b.dt)[0];
  const id=near&&near.src+':'+near.step;
  if(!near||near.dt>.12||id===this.lastEvent){this.hits=0;this.say('はずれ。もう一度、音に合わせて');return;}
  this.lastEvent=id;this.hits++;
  this.say((near.dt<=.06?'ぴったり！':'いいね！')+'　'+this.hits+'/'+this.needed);
  if(this.hits>=this.needed){const src=this.target;this.collected.add(src);this.target=null;this.hits=0;this.say('歌の書に「'+SOUND_NAMES[src]+'」');command({type:'collect',src});}
 },
 // ねらいの物の上のリング。鳴る瞬間へ向けて縮んでいく（1拍前から）。
 ring(track,scene,now){
  if(!this.target)return null;
  const item=scene.items.filter(i=>i.kind==='sprite'&&(i.key.startsWith(this.target+'-')||i.key.startsWith('obj:'+this.target+'-'))).sort((a,b)=>Math.abs(a.x-160)-Math.abs(b.x-160))[0];
  if(!item)return null;
  const c=sprites.get(item.key),beat=2*(track.duration/track.steps),next=this.upcoming(track,now,this.target,beat)[0];
  return {x:item.x+(c?.width??32)/2,y:item.y+(c?.height??32)/2,r:next?Math.round(5+18*Math.max(0,next.dt)/beat):0};
 }
};

function loop(){
 requestAnimationFrame(loop);
 if(document.hidden)return;
 const t=player.visual();if(!t)return;
 stage.setTrack(t);
 player.tick();
 stage.draw(smooth.now(player.clock(),t.duration));
}

function showError(text){$('error').textContent=text;$('error').hidden=false;}
function render(){
 layoutStage();
 if(!snapshot)return;
 const g=snapshot.game,catalog=snapshot.equipmentCatalog;
 wardrobe(g,catalog);
 choicePanel(g);
 healingPanel(g);
 journey(g);
 $('rest').textContent=g.running?'休む':'冒険を再開';
 $('rest').disabled=busy;
 $('logs').replaceChildren(...g.logs.slice(0,4).map(l=>{const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.textContent=new Date(l.at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'});text.textContent=l.text;li.append(time,text);return li;}));
 stage.setGear(g);
 player.want(g);
}
// 装備の着せ替え。持っている装備（と、外した状態）から選ぶ。選ぶと曲が作り直され、見た目と音がその場で変わる。
let wardrobeKey='';
function wardrobe(g,catalog){
 const key=JSON.stringify([g.inventory,g.equipment,busy]);if(key===wardrobeKey)return;wardrobeKey=key;
 for(const [slot,traits,none] of [['weapon',WEAPONS,'素手'],['armor',ARMORS,'なし']]){
  const worn=g.equipment?.[slot]??null,owned=catalog.filter(i=>i.slot===slot&&g.inventory.includes(i.id));
  const choices=[{id:null,name:none},...owned.map(i=>({id:i.id,name:i.name}))];
  $(slot+'Options').replaceChildren(...choices.map(choice=>{
   const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=choice.name;
   b.setAttribute('aria-checked',String(choice.id===worn));b.disabled=busy;
   b.onclick=()=>{if(choice.id===worn)return;command(choice.id?{type:'equip',itemId:choice.id}:{type:'unequip',slot});};
   return b;
  }));
  $(slot+'Trait').textContent=(traits[worn??'none']||traits.none).trait;
 }
}
// 試練のカードの間だけ、2つの選択肢を出す。選ばなければ前に進むほう（既定）になる。
let choiceKey='';
function choicePanel(g){
 const card=snapshot.card,trial=TRIALS[card?.kind],open=!!trial&&g.running&&!(g.prologue>0);
 $('choice').hidden=!open;
 const picked=open?(g.choices?.[g.cycle+':'+g.card]??null):null,key=JSON.stringify([open,g.cycle,g.card,picked,busy]);
 if(key===choiceKey)return;choiceKey=key;
 if(!open)return;
 $('choiceTitle').textContent=trial.title;
 $('choiceOptions').replaceChildren(...trial.options.map(o=>{
  const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=o.label;
  b.setAttribute('aria-checked',String((picked??trial.default)===o.id));b.disabled=busy;
  b.onclick=()=>command({type:'choose',option:o.id});
  return b;
 }));
 $('choiceNote').textContent=picked?'選んだ。このカードの終わりに決まる。':'選ばなければ「'+trial.options.find(o=>o.id===trial.default).label+'」になる。';
}
// 癒しの道具。持っている数と「使う」、使っている間は残り時間。効能はうたわず「リラックスのための響き」とだけ書く。
let healingKey='';
function healingPanel(g){
 const active=g.healing&&g.healing.until>Date.now()+offset?g.healing:null,mins=active?Math.ceil((active.until-Date.now()-offset)/60000):0;
 $('healingNow').textContent=active?HEALING[active.id].text+'　残り'+mins+'分（リラックスのための響き）':'';
 const key=JSON.stringify([g.items,active?.id,busy]);if(key===healingKey)return;healingKey=key;
 $('healingItems').replaceChildren(...Object.entries(HEALING).map(([id,h])=>{
  const n=g.items?.[id]??0,b=document.createElement('button');b.type='button';
  b.textContent=h.name+' ×'+n+'　使う';b.disabled=busy||n<1||!!active;b.title=h.text;
  b.onclick=()=>command({type:'use',item:id});
  return b;
 }));
}
function journey(g){
 const marks=g.marks?.length??0,need=snapshot.marksToPass??3;
 // 右上は短く: しるし（◆）と歌の書（♪ 集めた数）。仲間の一覧は「そうび」のウィンドウに
 $('marks').textContent='◆'.repeat(marks)+'◇'.repeat(Math.max(0,need-marks))+'　♪'+(g.songbook?.length??0)+'/'+(snapshot.soundCount??Object.keys(SOUND_NAMES).length)+(g.chapterDone?'　第1章 完':'');
 $('marks').title='しるし '+marks+'/'+need+'・歌の書 '+(g.songbook?.length??0);
 $('partyLine').textContent='なかま　'+(g.party||['tom']).map(id=>COMPANION_NAMES[id]||id).join('・');
 $('marksLine').textContent='しるし　'+'◆'.repeat(marks)+'◇'.repeat(Math.max(0,need-marks))+(g.chapterDone?'　第1章 完':'');
 const found=g.songbook?.length??0,total=snapshot.soundCount??Object.keys(SOUND_NAMES).length;
 $('songLine').textContent='歌の書　'+found+'/'+total;$('songFill').style.width=(found/total*100)+'%';
 // 仲間の姿（止まった絵。動かない物は鳴らない）
 const party=['hero',...(g.party||['tom'])],key=party.join();
 if(key!==partyKey){partyKey=key;const pose={hero:'hero-walk-1',tom:'cat-walk-1',koro:'koro-idle-0',lumi:'lumi-fly-1',mio:'mio-idle-0'};
  $('partyIcons').replaceChildren(...party.map(id=>{const li=document.createElement('li'),c=document.createElement('canvas'),src=sprites.get(pose[id]);c.width=32;c.height=32;if(src)c.getContext('2d').drawImage(src,0,0);const name=document.createElement('span');name.textContent=id==='hero'?'ゆっぴ':COMPANION_NAMES[id]||id;li.append(c,name);return li;}));}
}
let partyKey='';
function saved(state,text){$('saveStatus').dataset.state=state;$('saveStatus').textContent=text;}
async function load(){
 if(loading||busy||document.hidden)return;
 loading=true;
 try{
  const r=await fetch('api/game',{cache:'no-store'}),d=await r.json();
  if(!r.ok)throw new Error(d.error||'冒険の記録を読み込めませんでした。');
  offset=d.serverNow-Date.now();snapshot=d;render();player.align();
  $('error').hidden=true;saved('ok','保存済み');
 }catch(e){saved('error','接続を確認中');showError(e.message);}
 finally{loading=false;}
}
async function command(action){
 if(busy||!snapshot)return;
 busy=true;render();
 try{
  const r=await fetch('api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)}),d=await r.json();
  if(!r.ok)throw new Error(d.error||'操作できませんでした。');
  offset=d.serverNow-Date.now();snapshot=d;$('error').hidden=true;saved('ok','保存済み');
 }catch(e){showError(e.message);}
 finally{busy=false;render();}
}

stage.init();
sprites.loadBackgrounds();
player.init();
// 下から出るウィンドウ（そうび・どうぐ・きろく）。1つだけ開く。×・同じコマンド・Esc・下へのスワイプで閉じる。
const sheets={
 open(id){for(const b of document.querySelectorAll('[data-sheet]')){const on=b.dataset.sheet===id;b.setAttribute('aria-expanded',String(on));$(b.dataset.sheet).hidden=!on;}if(id)$(id).querySelector('.close')?.focus();},
 toggle(id){this.open($(id).hidden?id:null);}
};
for(const b of document.querySelectorAll('[data-sheet]'))b.onclick=()=>sheets.toggle(b.dataset.sheet);
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>sheets.open(null);
document.addEventListener('keydown',e=>{if(e.key==='Escape')sheets.open(null);});
for(const sheet of document.querySelectorAll('.sheet')){let y0=null;sheet.addEventListener('touchstart',e=>{y0=sheet.scrollTop<=0?e.touches[0].clientY:null;},{passive:true});sheet.addEventListener('touchend',e=>{if(y0!=null&&e.changedTouches[0].clientY-y0>60)sheets.open(null);y0=null;});}
window.addEventListener('resize',layoutStage);
$('play').onclick=()=>player.toggle();
$('stage').addEventListener('pointerdown',e=>{e.preventDefault();rhythm.tap();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['INPUT','BUTTON','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();rhythm.tap();}});
$('rest').onclick=()=>command({type:'toggle'});
$('volume').oninput=()=>{player.audio.volume=Number($('volume').value)/100;};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){load();player.sync();}});
setInterval(load,2500);
load();
requestAnimationFrame(loop);
