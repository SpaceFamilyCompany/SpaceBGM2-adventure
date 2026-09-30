
'use strict';
const $=id=>document.getElementById(id);
let snapshot=null,offset=0,busy=false,loading=false,firstLoad=true,toastTimer,requestGeneration=0;
const labels={travel:'探索',battle:'戦闘',treasure:'宝箱',boss:'ボス戦'};
const icons={travel:'🍃',battle:'⚔',treasure:'✧',boss:'♛',retreat:'↩',level:'✦'};
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3500);}
function format(n){return new Intl.NumberFormat('ja-JP').format(n);}
function render(){
 if(!snapshot)return;
 const g=snapshot.game,z=snapshot.zones.find(z=>z.id===g.zone),event=snapshot.event;
 $('coins').textContent=format(g.coins);$('crystals').textContent=format(g.crystals);$('level').textContent='Lv.'+g.level;
 $('zoneName').textContent=z.name;$('zoneSubtitle').textContent=z.subtitle;$('floor').textContent=g.floor+' / 10階';
 $('scene').dataset.zone=g.zone;$('scene').dataset.event=event;$('scene').dataset.running=g.running;
 $('stateBadge').textContent=g.running?'冒険中':'休憩中';$('eventBadge').textContent=g.running?labels[event]:'休憩';
 renderCharacters(g,event);
 $('enemyName').textContent=!g.running?'ひと休み':event==='boss'?z.boss:event==='battle'?z.enemy:event==='treasure'?'古い宝箱':'奥へ続く道';
 $('enemy').setAttribute('aria-label',$('enemyName').textContent);
 $('narration').textContent=!g.running?'旅を再開すると、冒険が進む。':event==='boss'?'ダンジョンの主が待ち構えている。':event==='battle'?'ゆっぴは武器を構えた。':event==='treasure'?'宝箱から、小さな旋律が聞こえる。':'ゆっぴは光を頼りに奥へ進む。';
 $('toggle').textContent=g.running?'休む':'冒険を再開';$('toggle').disabled=busy;
 $('trainCost').textContent=format(snapshot.trainCost)+' G';$('train').disabled=busy||g.coins<snapshot.trainCost||g.level>=30;
 $('recommended').textContent=String(z.level+1);$('hire').disabled=busy||g.companion||g.coins<120;
 $('hireText').textContent=g.companion?'同行中 · 報酬＋20％':'120 G · 報酬＋20％';
 $('catActor').style.display=g.companion?'block':'none';$('catActor').querySelector('.cat').style.display='block';
 $('zones').replaceChildren();snapshot.zones.forEach(zone=>{const b=document.createElement('button');b.className='zone'+(zone.id===g.zone?' active':'');b.disabled=busy||!zone.unlocked;b.setAttribute('aria-pressed',String(zone.id===g.zone));const icon=document.createElement('span');icon.className='icon';icon.textContent=zone.icon;const title=document.createElement('span');const strong=document.createElement('b');strong.textContent=zone.name;const meta=document.createElement('small');meta.textContent=zone.unlocked?'Lv.'+zone.level+'～ · 踏破 '+g.clears[zone.id]+'回':zone.id==='cave'?'森を踏破 ＋ Lv.3で解放':'洞窟を踏破 ＋ Lv.5で解放';title.append(strong,meta);const mark=document.createElement('span');mark.className='check';mark.textContent=zone.id===g.zone?'✓':zone.unlocked?'→':'🔒';b.append(icon,title,mark);b.onclick=()=>command({type:'zone',zone:zone.id}).then(()=>{$('mapDetails').open=false;}).catch(()=>{});$('zones').append(b);});
 $('logs').replaceChildren();g.logs.slice(0,5).forEach(l=>{const li=document.createElement('li'),time=document.createElement('time'),icon=document.createElement('span'),text=document.createElement('span');time.className='logtime';time.textContent=new Date(l.at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'});icon.className='logicon';icon.textContent=icons[l.kind]||'✦';text.textContent=l.text;li.append(time,icon,text);$('logs').append(li);});
 $('musicMood').textContent=z.name+' · '+(g.running?labels[event]:'休憩');$('tempo').textContent=z.bpm+' BPM';music.targetBpm=z.bpm;music.mood=g.running?event:'travel';music.targetZone=g.zone;
 renderEquipment();
 drawProgress();
}
function drawProgress(){const now=Date.now()+offset;$('clock').textContent=new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Tokyo'});if(!snapshot)return;const g=snapshot.game;const p=g.running?Math.min(1,Math.max(0,(now-g.lastAt)/8000)):0;$('bar').style.width=(p*100)+'%';$('progress').setAttribute('aria-valuenow',String(Math.round(p*100)));$('remaining').textContent=g.running?Math.max(0,Math.ceil(8-p*8))+'秒':'休憩中';$('journeyText').textContent=g.running?'この階の探索が終わるまで':'冒険を再開して続きを進める';}
async function load(){if(loading||busy||document.hidden)return;loading=true;const generation=requestGeneration;try{const r=await fetch('/api/game',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'記録を読み込めませんでした。');if(generation!==requestGeneration)return;offset=d.serverNow-Date.now();snapshot=d;render();$('error').style.display='none';$('saveStatus').textContent='保存済み';if(firstLoad){if(d.report.seconds>=25){const minutes=Math.max(1,Math.floor(d.report.seconds/60));$('offlineText').textContent='おかえり！ 留守中の冒険で '+format(d.report.coins)+'G、星のかけら'+d.report.crystals+'個を獲得。'+(d.report.items?.length?' 新しい装備'+d.report.items.length+'点も装備袋に届いたよ。':'')+(d.report.capped?'最大8時間分を記録したよ。':(d.report.seconds<60?d.report.seconds+'秒':minutes+'分')+'ほど旅していたよ。');$('offline').style.display='flex';}firstLoad=false;}}catch(e){$('errorText').textContent=e.message;$('error').style.display='flex';$('saveStatus').textContent='接続を確認中';}finally{loading=false;}}
async function command(action){if(busy||!snapshot)return;busy=true;requestGeneration++;render();try{const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)});const d=await r.json();if(!r.ok)throw new Error(d.error||'操作できませんでした。');offset=d.serverNow-Date.now();snapshot=d;$('error').style.display='none';$('saveStatus').textContent='保存済み';if(action.type==='equipBest')toast('おすすめの装備に変更した！');if(action.type==='equip')toast('装備を付け替えた！ 戦闘力 '+d.combatPower);if(action.type==='unequip')toast('装備を外した。');if(action.type==='train')toast('ゆっぴがLv.'+d.game.level+'になった！');if(action.type==='hire')toast('トムが旅の仲間になった！');if(action.type==='zone')toast('新しい場所へ出発！');return {zone:d.game.zone,level:d.game.level,coins:d.game.coins,running:d.game.running};}catch(e){toast(e.message);throw e;}finally{busy=false;render();}}
/* CHARACTERS_JS */
/* EQUIPMENT_JS */
/* MUSIC_JS */
/* NAVIGATION_JS */
$('sound').onclick=()=>music.toggle();$('volume').oninput=()=>{$('volumeLabel').textContent=$('volume').value+'％';music.volume();};
$('train').onclick=()=>command({type:'train'}).catch(()=>{});$('hire').onclick=()=>command({type:'hire'}).catch(()=>{});$('toggle').onclick=()=>command({type:'toggle'}).catch(()=>{});$('retry').onclick=()=>load();$('dismissOffline').onclick=()=>{$('offline').style.display='none';};
setInterval(drawProgress,250);setInterval(load,2500);document.addEventListener('visibilitychange',()=>{if(!document.hidden){firstLoad=true;load();music.sync();}});load();
if(document.modelContext?.registerTool){for(const tool of [{name:'get_adventure',description:'Read the visible adventure, gold, level and destination.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>snapshot?{zone:snapshot.game.zone,level:snapshot.game.level,coins:snapshot.game.coins,running:snapshot.game.running}:{loading:true}},{name:'train_adventurer',description:'Spend the displayed gold cost to increase Ruu by one level.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>command({type:'train'})},{name:'choose_dungeon',description:'Travel to an unlocked dungeon and begin on floor one.',inputSchema:{type:'object',properties:{zone:{type:'string',enum:['forest','cave','castle']}},required:['zone'],additionalProperties:false},execute:input=>{if(!input||!['forest','cave','castle'].includes(input.zone))throw new Error('Invalid dungeon');return command({type:'zone',zone:input.zone});}}]){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}}
