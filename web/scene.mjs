// 舞台の中身（何を・どこに・どの順で描くか）を、曲（composeTrack の結果）と再生位置だけから決める。
// DOM に触らない純粋な関数なので、Node のテストで表示の不具合を確かめられる。画面側（app.js）はこのリストを描くだけ。
// 座標は世界（320×180）の座標。画面に映るのは VIEW_LEFT〜VIEW_RIGHT（256×144）。
// build.mjs は楽譜エンジンの後ろにこのファイルをつなげる（その時、下の import 行は取り除く）。
import {stepAt,SEGMENT_STEPS,VIEW_LEFT,VIEW_RIGHT} from './score.mjs';

// 役者の立ち位置（左上）。モンスターは数に応じて並べ、奥の敵ほど遅れて滑り込む。
export const SPOTS={owl:[240,62],firefly:[148,64],frog:[256,142],cat:[38,140],hero:[72,138],foe:[196,138],fire:[112,138],leaves:[264,150]};
export const FOE_X={1:[196],2:[178,212],3:[160,190,220]};
export const SPRITE_SIZE=32;

const lerpKeys=(keys,t)=>{for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [t0,v0]=keys[i-1],[t1,v1]=keys[i],u=(t-t0)/(t1-t0),e=u*u*(3-2*u);return v0+(v1-v0)*e;}return keys.at(-1)[1];};
// 動きのカーブ。役者のコマ（sprite-action-frame）とコマの中の進み具合（0〜1）から、位置のずれ [dx, dy]。
// すべて拍に合わせた形なので、音が鳴る瞬間（着地・斬撃）は必ず決まった位置になる。
export function motion(entry,fraction,beats){
 if(!entry)return [0,0];
 const [sprite,action,f]=entry.split('-'),t=(+f)+fraction,half=((+f)%2)+fraction;
 switch(sprite+'.'+action){
  // 足が着く（コマ0・2）で一番低く、その間で1〜2ドット浮く
  case 'hero.walk':return [0,-Math.round(2*Math.sin(Math.PI*half/2))];
  // 構え → 振りかぶって少し下がる → コマ2で踏み込んで斬る → 戻る
  case 'hero.attack':return [Math.round(lerpKeys([[0,0],[1,-3],[2,10],[3,6],[4,0]],t)),Math.round(lerpKeys([[0,0],[1.4,-2],[2,0],[4,0]],t))];
  // 喜んで跳ぶ（コマ0で跳び、コマ2で着地して小さくもう一度）
  case 'hero.cheer':return [0,-Math.round(t<2?8*Math.sin(Math.PI*t/2):3*Math.sin(Math.PI*(t-2)/2))];
  case 'cat.walk':return [0,-Math.round(1.5*Math.sin(Math.PI*((((+f)+1)%2)+fraction)/2))];
  // コマ2〜3で弧を描いて跳び、コマ0で着地（ドン）、コマ1で戻る
  case 'cat.pounce':return t>=2?[Math.round(26*(t-2)/2),-Math.round(10*Math.sin(Math.PI*(t-2)/2))]:[Math.round(26*(1-Math.min(1,t))),0];
  // 跳ねる敵: コマ0で着地（音）、コマ2で一番高い
  case 'slime.bounce':case 'mushling.bounce':case 'beetle.bounce':return [0,-Math.round(8*Math.sin(Math.PI*t/4))];
  case 'wisp.bounce':return [Math.round(2*Math.sin(Math.PI*t/2)),-Math.round(3*Math.sin(Math.PI*t/4))];
  default:
   // 斬撃が当たると、後ろへはじかれて戻る
   if(action==='hit')return [Math.round(7*(1-t/2)),-Math.round(3*Math.sin(Math.PI*t/2))];
   // 蛍は 8拍で横に、4拍で縦にゆっくり漂う
   if(sprite==='firefly')return [Math.round(10*Math.sin(Math.PI*beats/4)),Math.round(5*Math.sin(Math.PI*beats/2))];
   return [0,0];
 }
}

// 歩いた量（コマ数）の累計。曲ごとに1度だけ作る。
const walked=new WeakMap();
export function walkTable(track){
 let moved=walked.get(track);
 if(!moved){moved=[0];for(let s=0;s<track.steps;s++)moved.push(moved[s]+(track.moving[s]?1:0));walked.set(track,moved);}
 return moved;
}

// 再生位置 seconds の舞台。gear は身につけている装備の重ねレイヤー（例: ['moss-cloak:back','leaf-blade:front']）。
// items は描く順（奥から手前）に並ぶ:
//  {kind:'bg', layer:'far'|'near', theme, offset}  空・地面のタイル（offset だけ左へずらして横に並べる）
//  {kind:'sprite', key, x, y}                       ドット絵（key は ART のグリッド名）
export function sceneAt(track,seconds,gear=[]){
 const {step,fraction}=stepAt(track,seconds),index=Math.floor(step/SEGMENT_STEPS),seg=track.segments[index],local=step-seg.start;
 const moved=track.scrollBase+walkTable(track)[step]+(track.moving[step]?fraction:0),beats=(step+fraction)/2;
 const actor=id=>track.actors[id]?.[step]||'',items=[];
 const sprite=(key,x,y)=>items.push({kind:'sprite',key,x:Math.round(x),y:Math.round(y)});
 const lane=(name,only)=>{
  for(const o of track.objects){
   if(o.lane!==name||!only(o))continue;
   const sx=((o.x-moved*o.pxPerStep)%o.period+o.period)%o.period;
   for(const x of [sx,sx-o.period])if(x+o.width>VIEW_LEFT&&x<VIEW_RIGHT)sprite(`obj:${o.id}-${o.frames[step]}`,x,o.baseline-o.height);
  }
 };
 const at=(id,[x,y],[dx,dy]=[0,0])=>{const key=actor(id);if(key)sprite(key,x+dx,y+dy);};
 // 空 → 遠景 → 中景 → 地面 → 手前の物 → 生き物 → トム → ゆっぴ（装備の後ろ・本体・前）→ 敵 → 門 → 足元の草
 items.push({kind:'bg',layer:'far',theme:seg.theme,offset:moved*2});
 lane('far',()=>true);lane('mid',()=>true);
 items.push({kind:'bg',layer:'near',theme:seg.theme,offset:moved*8});
 lane('near',o=>o.id!=='arch');
 at('owl',SPOTS.owl);at('frog',SPOTS.frog);
 at('firefly',SPOTS.firefly,motion(actor('firefly'),fraction,beats));
 at('cat',SPOTS.cat,motion(actor('cat'),fraction,beats));
 const [hdx,hdy]=motion(actor('hero'),fraction,beats),hx=SPOTS.hero[0]+hdx,hy=SPOTS.hero[1]+hdy,pose=actor('hero').slice(5);
 const layer=side=>gear.filter(g=>g.endsWith(':'+side)).map(g=>g.split(':')[0]);
 for(const item of layer('back'))sprite(`eq:${item}-back-${pose}`,hx,hy);
 sprite(actor('hero'),hx,hy);
 for(const item of layer('front'))sprite(`eq:${item}-front-${pose}`,hx,hy);
 // 敵（焚き火・道の光も同じ枠）。敵はカードの頭で右から順に滑り込む（楽譜側でもその間は鳴らさない）。
 const count=seg.mood==='battle'?seg.foes:1;
 for(let k=count-1;k>=0;k--){
  const key=actor('foe'+k);if(!key)continue;
  if(seg.mood==='rest'){sprite(key,...SPOTS.fire);continue;}
  const lead=4+k*2,entering=!/^(spark|fire)/.test(key)&&local<lead,slide=entering?110*(1-(local+fraction)/lead)**2:0;
  const [dx,dy]=motion(key,fraction,beats);
  sprite(key,FOE_X[count][k]+slide+dx,SPOTS.foe[1]+dy);
 }
 lane('near',o=>o.id==='arch');
 at('leaves',SPOTS.leaves);
 // 守り人の足踏み（コマ0）で、画面がほんの一瞬揺れる
 const shake=/^guardian-idle-0/.test(actor('foe0'))&&fraction<.35?(Math.round(fraction*20)%2?1:-1):0;
 return {step,fraction,index,seg,theme:seg.theme,shake,items};
}
