'use strict';
// build.mjs が先頭に SCORE_SOURCE（楽譜エンジンのソース）・WORLD（背景オブジェクトの設定）・EQUIP_LAYERS を入れる。
/* SCORE_JS */
const $=id=>document.getElementById(id);
const SVG_NS='http://www.w3.org/2000/svg';
const THEME_NAMES={entrance:'森の入口',deep:'森の奥',mist:'霧の森',clearing:'守り人の広場'};
const MOOD_TEXT={travel:'ゆっぴとトムは、森の奥へ進んでいる。',battle:'スライムが跳ねてきた。ゆっぴが立ち向かう。',treasure:'宝箱を見つけた。ふたが鳴っている。',boss:'森の守り人が立ちはだかる。',rest:'焚き火のそばで、ひと休み。'};
const MOOD_MARK={travel:'道',battle:'戦',treasure:'宝',boss:'主'};
const FLOOR_MS=floorMs('forest');
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
  a.addEventListener('loadedmetadata',()=>{if(this.pendingSeek!=null){a.currentTime=this.pendingSeek%a.duration;this.pendingSeek=null;}});
  for(const type of ['play','pause'])a.addEventListener(type,()=>this.sync());
  a.addEventListener('error',()=>{this.sync();showError('曲を読み込めませんでした。再生ボタンでもう一度お試しください。');});
  if('mediaSession' in navigator)for(const [action,run] of [['play',()=>this.toggle(true)],['pause',()=>this.audio.pause()],['stop',()=>this.audio.pause()]]){try{navigator.mediaSession.setActionHandler(action,run);}catch{}}
 },
 stateFor(g){return {zone:'forest',running:g.running,floor:g.floor,weapon:g.equipment?.weapon,armor:g.equipment?.armor,level:1,companion:true};},
 // ゲームの状態に合う曲を用意する（装備・休憩が変わった時だけ作り直す）。
 want(g){
  const state=this.stateFor(g),key=trackKey(state);
  if(key===this.wanted)return;
  this.wanted=key;
  if(!this.tracks.has(key))this.tracks.set(key,composeTrack(state,WORLD));
  if(this.urls.has(key))this.apply(key);else{this.worker.postMessage({state,world:WORLD});this.sync();}
 },
 rendered({key,wav}){
  this.urls.set(key,URL.createObjectURL(new Blob([wav],{type:'audio/wav'})));
  for(const [k,url] of this.urls)if(this.urls.size>4&&k!==key&&k!==this.track?.key){URL.revokeObjectURL(url);this.urls.delete(k);this.tracks.delete(k);}
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
  const g=snapshot.game;return secondsForFloor(t,g.floor,(Date.now()+offset-g.lastAt)/FLOOR_MS);
 },
 visual(){return this.track??this.tracks.get(this.wanted)??null;},
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
 metadata(floor,theme,mood){
  if(!('mediaSession' in navigator)||!('MediaMetadata' in window))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:(mood==='rest'?'焚き火':floor+'F '+THEME_NAMES[theme]),artist:'SpaceBGM',album:'蛍火の森'});
 }
};

// 舞台。すべて「いまの曲のコマ番号」から描くので、音と動きがずれない。
const stage={
 track:null,segment:-1,theme:'',moved:null,gearKey:'',lastFloor:'',
 prepare(track){
  this.track=track;this.segment=-1;
  this.moved=[0];for(let s=0;s<track.steps;s++)this.moved.push(this.moved[s]+(track.moving[s]?1:0));
 },
 use(parent,attrs){const u=document.createElementNS(SVG_NS,'use');for(const [k,v] of Object.entries(attrs))u.setAttribute(k,v);parent.append(u);return u;},
 enterSegment(index){
  const t=this.track,seg=t.segments[index];this.segment=index;
  if(seg.theme!==this.theme){this.theme=seg.theme;for(const layer of ['far','near'])for(const n of [0,1])$(layer+n).setAttribute('href','#bg-'+seg.theme+'-'+layer);}
  for(const lane of ['Far','Mid','Near'])$('lane'+lane).replaceChildren();
  this.objects=t.objects.filter(o=>o.segment===index).map(o=>({o,el:this.use($('lane'+o.lane[0].toUpperCase()+o.lane.slice(1)),{y:o.baseline-o.height,width:o.width,height:o.height})}));
  $('foe').setAttribute('x',seg.mood==='rest'?'112':'196');
  $('floorLabel').textContent=seg.mood==='rest'?'休憩':seg.floor+'F';
  $('themeName').textContent=THEME_NAMES[seg.theme]||'';
  $('sceneText').textContent=MOOD_TEXT[seg.mood];
  player.metadata(seg.floor,seg.theme,seg.mood);
 },
 gear(g){
  const items=[g.equipment?.weapon,g.equipment?.armor].filter(id=>id&&EQUIP_LAYERS[id]),key=items.join('|');
  if(key===this.gearKey)return;this.gearKey=key;
  for(const layer of ['back','front']){const group=$('hero'+(layer==='back'?'Back':'Front'));group.replaceChildren();
   for(const id of items)if(EQUIP_LAYERS[id].includes(layer))this.use(group,{x:72,y:138,width:32,height:32,'data-item':id,'data-layer':layer});}
 },
 draw(seconds){
  const t=this.track;if(!t)return;
  const {step,fraction}=stepAt(t,seconds),index=Math.floor(step/SEGMENT_STEPS);
  if(index!==this.segment)this.enterSegment(index);
  const moved=this.moved[step]+(t.moving[step]?fraction:0),local=moved-this.moved[t.segments[index].start];
  $('bgFar').setAttribute('transform',`translate(${-Math.round(moved*2%320)} 0)`);
  $('bgNear').setAttribute('transform',`translate(${-Math.round(moved*8%320)} 0)`);
  for(const [id,frames] of Object.entries(t.actors))$(id)?.setAttribute('href','#px-'+frames[step]);
  $('cat').style.display=t.actors.cat?'':'none';
  const pose=t.actors.hero[step].slice(5);
  for(const u of document.querySelectorAll('#heroBack use,#heroFront use'))u.setAttribute('href',`#px-eq-${u.dataset.item}-${u.dataset.layer}-${pose}`);
  const k=step-t.segments[index].start;
  for(const {o,el} of this.objects){
   const x=Math.round(o.x-local*o.pxPerStep),shown=x+o.width>0&&x<SCREEN_WIDTH;
   el.style.display=shown?'':'none';
   if(shown){el.setAttribute('x',x);el.setAttribute('href',`#px-obj-${o.id}-${o.frames[k]}`);}
  }
  this.rail(t,index,(step-t.segments[index].start+fraction)/SEGMENT_STEPS);
 },
 rail(t,index,progress){
  const floor=t.running?t.segments[index].floor:snapshot?.game.floor??1;
  $('rail').dataset.resting=String(!t.running);
  [...$('rail').children].forEach((li,i)=>{
   const state=i+1<floor?'done':i+1===floor?'now':'next';
   if(li.dataset.state!==state)li.dataset.state=state;
   li.style.setProperty('--p',state==='now'&&t.running?progress.toFixed(3):'0');
  });
 }
};

function buildRail(){
 $('rail').replaceChildren(...Array.from({length:FLOORS},(_,i)=>{const li=document.createElement('li'),b=document.createElement('b'),mark=document.createElement('i');b.textContent=(i+1)+'F';mark.textContent=MOOD_MARK[moodForFloor(i+1)];li.append(b,mark);li.dataset.state='next';return li;}));
}
function loop(){
 requestAnimationFrame(loop);
 if(document.hidden)return;
 const t=player.visual();if(!t)return;
 if(stage.track!==t)stage.prepare(t);
 stage.draw(player.clock());
}

function showError(text){$('error').textContent=text;$('error').hidden=false;}
function render(){
 if(!snapshot)return;
 const g=snapshot.game,catalog=snapshot.equipmentCatalog;
 const name=id=>catalog.find(i=>i.id===id)?.name??'なし';
 $('gearWeapon').textContent=name(g.equipment?.weapon);
 $('gearArmor').textContent=name(g.equipment?.armor);
 $('rest').textContent=g.running?'休む':'冒険を再開';
 $('rest').disabled=busy;
 $('logs').replaceChildren(...g.logs.slice(0,4).map(l=>{const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.textContent=new Date(l.at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'});text.textContent=l.text;li.append(time,text);return li;}));
 stage.gear(g);
 player.want(g);
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

buildRail();
player.init();
$('play').onclick=()=>player.toggle();
$('rest').onclick=()=>command({type:'toggle'});
$('volume').oninput=()=>{player.audio.volume=Number($('volume').value)/100;};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){load();player.sync();}});
setInterval(load,2500);
load();
requestAnimationFrame(loop);
