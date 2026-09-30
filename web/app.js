'use strict';
// build.mjs が先頭に SCORE_SOURCE（楽譜エンジンのソース）・WORLD（背景オブジェクトの設定）・EQUIP_LAYERS・ART（ドット絵）を入れる。
/* SCORE_JS */
/* SCENE_JS */
const $=id=>document.getElementById(id);
const THEME_NAMES={entrance:'森の入口',deep:'森の奥',mist:'霧の森',clearing:'守り人の広場'};
const MOOD_TEXT={travel:'ゆっぴとトムは、森の奥へ進んでいる。',treasure:'宝箱を見つけた。ふたが鳴っている。',boss:'森の守り人が立ちはだかる。',rest:'焚き火のそばで、ひと休み。'};
const MONSTER_NAMES={slime:'スライム',mushling:'キノコの子',beetle:'カブトムシ',wisp:'鬼火',guardian:'森の守り人'};
const CARD_NAME={travel:'道',battle:'戦闘',treasure:'宝箱',boss:'守り人',rest:'休憩'};
const CARD_MS=cardMs('forest');
const sceneText=seg=>seg.mood==='battle'?[...new Set(seg.monsters)].map(m=>MONSTER_NAMES[m]).join('と')+(seg.foes>1?'が'+seg.foes+'体':'が')+'現れた。ゆっぴが立ち向かう。':MOOD_TEXT[seg.mood];
const WORKER_MAIN='onmessage=e=>{const t=composeTrack(e.data.state,e.data.world);const wav=encodeWav(renderTrack(t));postMessage({key:t.key,wav},[wav.buffer]);};';

let snapshot=null,offset=0,busy=false,loading=false;

// 曲 = 冒険。楽譜から端末内で合成したWAVを、1つのHTML Audioでループ再生する。
const player={
 audio:new Audio(),worker:null,tracks:new Map(),urls:new Map(),track:null,wanted:'',pendingSeek:null,
 init(){
  this.worker=new Worker(URL.createObjectURL(new Blob([SCORE_SOURCE+'\n'+WORKER_MAIN],{type:'text/javascript'})));
  this.worker.onmessage=e=>this.rendered(e.data);
  this.worker.onerror=()=>showError('曲を作れませんでした。ページを再読み込みしてください。');
  const a=this.audio;a.loop=true;a.preload='auto';a.setAttribute('playsinline','');
  // ループが一周した瞬間に、次の束の曲ができていれば切り替える（画面を開いている間）。
  a.addEventListener('timeupdate',()=>{const t=a.currentTime,wrapped=t+1<(this.lastTime??0);this.lastTime=t;if(wrapped&&this.track?.running&&this.nextKey&&this.urls.has(this.nextKey)&&this.nextKey!==this.track.key){this.wanted=this.nextKey;this.apply(this.nextKey);}});
  a.addEventListener('loadedmetadata',()=>{if(this.pendingSeek!=null){a.currentTime=this.pendingSeek%a.duration;this.pendingSeek=null;}});
  for(const type of ['play','pause'])a.addEventListener(type,()=>this.sync());
  a.addEventListener('error',()=>{this.sync();showError('曲を読み込めませんでした。再生ボタンでもう一度お試しください。');});
  if('mediaSession' in navigator)for(const [action,run] of [['play',()=>this.toggle(true)],['pause',()=>this.audio.pause()],['stop',()=>this.audio.pause()]]){try{navigator.mediaSession.setActionHandler(action,run);}catch{}}
 },
 stateFor(g){return {zone:'forest',running:g.running,cycle:g.cycle,card:g.card,weapon:g.equipment?.weapon,armor:g.equipment?.armor,level:1,companion:true};},
 // ゲームの状態に合う曲を用意する（装備・休憩が変わった時だけ作り直す）。
 want(g){
  const state=this.stateFor(g),key=trackKey(state);
  if(key===this.wanted)return;
  this.wanted=key;
  if(!this.tracks.has(key))this.tracks.set(key,composeTrack(state,WORLD));
  if(this.urls.has(key))this.apply(key);else{this.worker.postMessage({state,world:WORLD});this.sync();}
  // 束の残りが4枚になったら、次の束の曲を裏で作っておく（ループの継ぎ目でそのまま切り替える）。
  if(g.running&&g.card>=DECK_SIZE-4){const next={...state,cycle:state.cycle+1,card:0},nextKey=trackKey(next);this.nextKey=nextKey;if(!this.tracks.has(nextKey)){this.tracks.set(nextKey,composeTrack(next,WORLD));this.worker.postMessage({state:next,world:WORLD});}}
 },
 rendered({key,wav}){
  this.urls.set(key,URL.createObjectURL(new Blob([wav],{type:'audio/wav'})));
  for(const [k,url] of this.urls)if(this.urls.size>4&&k!==key&&k!==this.track?.key&&k!==this.nextKey){URL.revokeObjectURL(url);this.urls.delete(k);this.tracks.delete(k);}
  if(key===this.wanted)this.apply(key);
 },
 // 曲を差し替える。冒険中どうしなら同じ位置から続けるので、装備を変えると音色だけがその場で変わる。
 apply(key){
  const next=this.tracks.get(key),a=this.audio,playing=!a.paused,keep=playing&&this.track&&this.track.running===next.running;
  const at=keep?a.currentTime:null;
  this.track=next;a.src=this.urls.get(key);
  this.pendingSeek=at??this.target();
  if(playing)a.play().catch(()=>this.sync());
  this.sync();
 },
 // 冒険の進み具合から、曲のどこを鳴らすべきか。
 target(){
  const t=this.visual();if(!t||!snapshot)return 0;
  if(!t.running)return performance.now()/1000%t.duration;
  const g=snapshot.game;return secondsForCard(t,g.card,(Date.now()+offset-g.lastAt)/CARD_MS);
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
  $('playLabel').textContent=!this.track?'曲を準備中':playing?'止める':'再生';
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
  if(this.track){this.snap.getContext('2d').clearRect(0,0,256,144);this.snap.getContext('2d').drawImage($('stage'),0,0);this.swap={start:performance.now()};}
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
  this.ctx.drawImage(c,x,-36);this.ctx.drawImage(c,x+320,-36);this.ctx.globalAlpha=1;
 },
 draw(seconds){
  const t=this.track;if(!t)return;
  const scene=sceneAt(t,seconds,this.gear);
  if(scene.index!==this.segment)this.enterSegment(scene);
  const now=performance.now(),themeA=this.themeFade?Math.min(1,(now-this.themeFade.start)/1200):1,swapA=this.swap?Math.min(1,(now-this.swap.start)/500):1;
  const sig=scene.items.map(i=>i.kind==='bg'?i.layer+Math.round(i.offset):i.key+i.x+','+i.y).join('|')+'|'+scene.shake+'|'+themeA.toFixed(2)+'|'+swapA.toFixed(2);
  if(sig===this.last&&!this.dirty)return;
  this.last=sig;this.dirty=false;
  const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,256,144);ctx.setTransform(1,0,0,1,0,scene.shake);
  for(const item of scene.items){
   if(item.kind==='bg'){if(this.themeFade&&themeA<1)this.tiles(item,this.themeFade.from,1);this.tiles(item,this.theme,themeA);continue;}
   const c=sprites.get(item.key);if(c)ctx.drawImage(c,item.x-VIEW_LEFT,item.y-36);
  }
  ctx.setTransform(1,0,0,1,0,0);
  if(themeA>=1)this.themeFade=null;
  if(this.swap){ctx.globalAlpha=1-swapA;ctx.drawImage(this.snap,0,0);ctx.globalAlpha=1;if(swapA>=1)this.swap=null;}
 }
};

function loop(){
 requestAnimationFrame(loop);
 if(document.hidden)return;
 const t=player.visual();if(!t)return;
 stage.setTrack(t);
 stage.draw(smooth.now(player.clock(),t.duration));
}

function showError(text){$('error').textContent=text;$('error').hidden=false;}
function render(){
 if(!snapshot)return;
 const g=snapshot.game,catalog=snapshot.equipmentCatalog;
 wardrobe(g,catalog);
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
$('play').onclick=()=>player.toggle();
$('rest').onclick=()=>command({type:'toggle'});
$('volume').oninput=()=>{player.audio.volume=Number($('volume').value)/100;};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){load();player.sync();}});
setInterval(load,2500);
load();
requestAnimationFrame(loop);
