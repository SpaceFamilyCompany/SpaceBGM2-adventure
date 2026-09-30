import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PALETTE, SPRITES, SOUND_FRAMES, EQUIPMENT_LAYERS, spriteSheet } from './pixel-art.mjs';
import { forestScene } from './forest-scene.mjs';
import { OBJECTS, THEMES, LANES, objectSheet } from './forest-objects.mjs';

const combinations=[[],['leaf-blade'],['moss-cloak'],['leaf-blade','moss-cloak']];
const names={hero:'ゆっぴ',cat:'トム',slime:'森のスライム',guardian:'森の守り人',chest:'宝箱',spark:'蛍の光',fire:'焚き火',frog:'カエル',owl:'フクロウ',firefly:'蛍',leaves:'草・葉'};
function uses(name,action,f,items=[]) {
  const equipment=layer=>items.filter(i=>EQUIPMENT_LAYERS[i][layer]).map(i=>`<use href="#px-eq-${i}-${layer}-${action}-${f}"/>`).join('');
  return equipment('back')+`<use href="#px-${name}-${action}-${f}"/>`+equipment('front');
}
function sprite(name,action,f,items=[]) { return `<svg viewBox="0 0 32 32" class="sprite" role="img" aria-label="${name} ${action} コマ${f}">${uses(name,action,f,items)}</svg>`; }
let cards='';
for(const [name,actions] of Object.entries(SPRITES)) for(const [action,grids] of Object.entries(actions)) {
  for(const items of name==='hero'?combinations:[[]]) {
    const sound=SOUND_FRAMES[`${name}.${action}`]||[];
    cards+=`<article><h3>${names[name]} <code>${name}.${action}</code></h3><p>${items.length?items.join(' + '):'装備なし／本体'} · 音: ${sound.length?sound.join(', '):'—'}</p><div class="film"><div class="live" data-name="${name}" data-action="${action}" data-items="${items.join(',')}" data-count="${grids.length}">${sprite(name,action,0,items)}<b>再生 <span>0</span></b></div>${grids.map((_,f)=>`<figure>${sprite(name,action,f,items)}<figcaption>${f}${sound.includes(f)?' ♪':''}</figcaption></figure>`).join('')}</div></article>`;
  }
}
let layers='';
for(const [item,sides] of Object.entries(EQUIPMENT_LAYERS)) for(const [side,actions] of Object.entries(sides)) for(const [action,grids] of Object.entries(actions)) {
  layers+=`<article><h3>${item} / ${side} / ${action}</h3><div class="film">${grids.map((_,f)=>`<figure><svg class="sprite" viewBox="0 0 32 32" aria-label="装備単体 コマ${f}"><use href="#px-eq-${item}-${side}-${action}-${f}"/></svg><figcaption>${f}</figcaption></figure>`).join('')}</div></article>`;
}
const objectCards=Object.entries(OBJECTS).map(([id,o])=>`<article><h3>${id} ? ${o.lane}</h3><p>${o.themes.join(' / ')} ? ${o.sound.voice}</p><div class="film"><div id="live-${id}"></div>${o.frames.map((_,f)=>`<figure><svg class="sprite" viewBox="0 0 ${o.width} ${o.height}"><use href="#px-obj-${id}-${f}"/></svg><figcaption>${f}${o.sound.frames.includes(f)?' ?':''}</figcaption></figure>`).join('')}</div></article>`).join('');
const themeScenes=Object.fromEntries(THEMES.map(t=>[t.id,forestScene(t.id)]));
const background=forestScene();
const sceneContents=background.slice(background.indexOf('>')+1,background.lastIndexOf('</svg>'));
const page=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>蛍火の森｜Sprite atelier</title><style>
:root{color-scheme:dark;--zoom:3}*{box-sizing:border-box}body{margin:0;background:#232046;color:#EAE6F5;font:14px/1.6 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:24px}h1{font-size:28px;margin-bottom:4px}h2{margin-top:32px}h3{font-size:15px;margin:0}p{color:#B9B4D3;margin:6px 0 16px}code{font-size:12px;color:#A9DDE2}header{border-bottom:1px solid #5A548F;margin-bottom:20px}.controls{position:sticky;top:0;z-index:1;display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:#1C1A33;padding:12px;border:1px solid #5A548F;border-radius:8px}button,select{font:inherit;background:#3B3470;color:#F7F5FB;border:1px solid #A9DDE2;padding:6px 12px;border-radius:5px}button{cursor:pointer}.catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:16px}article{border:1px solid #5A548F;background:#1C1A33;padding:16px;border-radius:10px;overflow:auto}.film{display:flex;gap:8px;align-items:flex-start}figure{margin:0;text-align:center}figcaption,b{display:block;color:#A9DDE2;text-align:center;font-size:12px}.sprite{width:calc(32px * var(--zoom));height:calc(32px * var(--zoom));display:block;shape-rendering:crispEdges;background:repeating-conic-gradient(#3B3470 0% 25%,#302a59 0% 50%) 0 0/16px 16px}.live{border:2px solid #F0A9B9}.live[data-sound="true"]{border-color:#F5ECCB}.swatches{display:flex;flex-wrap:wrap;gap:8px}.swatches span{display:flex;gap:6px;align-items:center;font:12px monospace}.swatches i{width:22px;height:22px;border:1px solid #B9B4D3}.scene{display:block;width:100%;max-width:960px;image-rendering:pixelated;border:1px solid #5A548F}.tiles{display:flex;overflow:auto}.tiles svg{flex:0 0 640px;width:640px;height:360px}.note{color:#F0A9B9}
</style><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="0" height="0" style="position:absolute"><defs>${spriteSheet()}${objectSheet()}</defs></svg><main><header><h1>蛍火の森 <small>Sprite atelier</small></h1><p>SpaceBGM2｜音の冒険 · 32 × 32 · ゆっぴとトム · 20色</p></header><div class="controls"><button id="play">一時停止</button><button id="step">1コマ進む</button><button id="reset">コマ0へ</button><label>拡大 <select id="zoom"><option value="2">2倍</option><option value="3" selected>3倍</option><option value="4">4倍</option><option value="6">6倍</option></select></label><strong>88 BPM / 340.91 ms / 8分音符</strong><output id="clock">コマ0</output></div>
<h2>同じ拍の森</h2><p>背景は8分音符ごとに手前8px・奥2px移動（1拍で16px・4px）。♪と黄色の枠は発音コマ。音声は鳴らさない確認ページです。</p><svg class="scene" id="stage" viewBox="0 0 320 180" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-label="拍に同期して歩く蛍火の森"><defs>${sceneContents}</defs><g id="far-scroll"><use href="#forest-far"/><use href="#forest-far" x="320"/></g><g id="objects-far"></g><g id="objects-mid"></g><g id="near-scroll"><use href="#forest-near"/><use href="#forest-near" x="320"/></g><g id="objects-near"></g><g id="actors"></g></svg>
<h2>全動作・全装備の組み合わせ</h2><p>左が同期再生、右が全コマ。hero/cat の着地は交互。hitのみ2コマです。</p><section class="catalog">${cards}</section><h2>装備レイヤー単体</h2><section class="catalog">${layers}</section><h2>パレット</h2><div class="swatches">${Object.entries(PALETTE).map(([k,v])=>`<span><i style="background:${v}"></i>${k} ${v}</span>`).join('')}</div><h2>背景の継ぎ目（320px × 2）</h2><p>2枚の静止タイルを横に配置。地面上端 y=150。</p><div class="tiles" id="tiles">${background.replaceAll('id="forest-','id="tile-a-')}${background.replaceAll('id="forest-','id="tile-b-')}</div></main><script>
const equipmentSides=${JSON.stringify(Object.fromEntries(Object.entries(EQUIPMENT_LAYERS).map(([item,sides])=>[item,Object.fromEntries(Object.keys(sides).map(side=>[side,true]))])))};
const sounds=${JSON.stringify(SOUND_FRAMES)};
const objects=${JSON.stringify(Object.fromEntries(Object.entries(OBJECTS).map(([id,{frames,...o}])=>[id,o])))};
const lanes=${JSON.stringify(LANES)},themeScenes=${JSON.stringify(themeScenes)};
let theme='entrance';
function selectTheme(id){
 theme=id;
 const svg=themeScenes[id];
 document.getElementById('stage').querySelector('defs').innerHTML=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
 document.getElementById('tiles').innerHTML=svg.replaceAll('id="forest-','id="tile-a-')+svg.replaceAll('id="forest-','id="tile-b-');
 Object.keys(themeScenes).forEach(t=>document.getElementById('theme-'+t).setAttribute('aria-pressed',String(t===id)));
 render();
}
Object.keys(themeScenes).forEach(id=>document.getElementById('theme-'+id).onclick=()=>selectTheme(id));
const counts=${JSON.stringify(Object.fromEntries(Object.entries(SPRITES).map(([s,a])=>[s,Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v.length]))])))};
${uses.toString().replaceAll('EQUIPMENT_LAYERS','equipmentSides')}
let tick=0,playing=true,origin=performance.now();const duration=60000/88/2;
const actors=[['hero','walk',109,120,['leaf-blade','moss-cloak']],['cat','walk',76,120,[]],['frog','croak',42,120,[]],['owl','hoot',155,61,[]],['firefly','glow',186,101,[]],['leaves','sway',254,121,[]],['fire','burn',207,120,[]],['spark','twinkle',27,76,[]]];
function render(){
 const f=tick%4;
 for(const [id,o] of Object.entries(objects)){
  document.getElementById('live-'+id).innerHTML='<svg class="sprite" viewBox="0 0 '+o.width+' '+o.height+'"><use href="#px-obj-'+id+'-'+f+'"/></svg><b>'+f+(o.sound.frames.includes(f)?' ?':'')+'</b>';
 }
 for(const [lane,{pxPerBeat}] of Object.entries(lanes)){
  const entries=Object.entries(objects).filter(([,o])=>o.lane===lane&&o.themes.includes(theme)),span=Math.max(400,entries.length*100);
  document.getElementById('objects-'+lane).innerHTML=entries.map(([id,o],i)=>{
   const x=((i*100+span-(tick*pxPerBeat/2)%span)%span)-64;
   return '<use href="#px-obj-'+id+'-'+f+'" x="'+x+'" y="'+(o.baseline-o.height)+'" width="'+o.width+'" height="'+o.height+'"/>';
  }).join('');
 }

 document.querySelectorAll('.live').forEach(el=>{const {name,action,items,count}=el.dataset,f=tick%Number(count);el.querySelector('svg').innerHTML=uses(name,action,f,items?items.split(','):[]);el.querySelector('svg').setAttribute('aria-label',name+' '+action+' コマ'+f);el.querySelector('span').textContent=f;el.dataset.sound=String((sounds[name+'.'+action]||[]).includes(f));});
 document.getElementById('clock').textContent='コマ'+tick%4+' / 8分音符 '+tick;
 document.getElementById('far-scroll').setAttribute('transform','translate('+(-(tick*2)%320)+' 0)');
 document.getElementById('near-scroll').setAttribute('transform','translate('+(-(tick*8)%320)+' 0)');
 document.getElementById('actors').innerHTML=actors.map(([n,a,x,y,items])=>'<g transform="translate('+x+' '+y+')">'+uses(n,a,tick%counts[n][a],items).replaceAll('<use ','<use width="32" height="32" ')+'</g>').join('');
}
function loop(now){if(playing){const next=Math.floor((now-origin)/duration);if(next!==tick){tick=next;render();}}requestAnimationFrame(loop);}
function pause(){playing=false;document.getElementById('play').textContent='再生';}
document.getElementById('play').onclick=()=>{playing=!playing;origin=performance.now()-tick*duration;document.getElementById('play').textContent=playing?'一時停止':'再生';};
document.getElementById('step').onclick=()=>{pause();tick++;render();};
document.getElementById('reset').onclick=()=>{tick=0;origin=performance.now();render();};
document.getElementById('zoom').onchange=e=>document.documentElement.style.setProperty('--zoom',e.target.value);
render();requestAnimationFrame(loop);
</script></html>`;
const destination=new URL('../dist/sprite-preview.html',import.meta.url);
if(process.argv.includes('--stdout')){process.stdout.write(page);}else{
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await writeFile(destination,page,'utf8');
console.log(`Preview: ${fileURLToPath(destination)}`);

}
