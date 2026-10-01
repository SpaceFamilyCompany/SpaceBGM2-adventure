// 舞台の中身（何を・どこに・どの順で描くか）を、曲（composeTrack の結果）と再生位置だけから決める。
// DOM に触らない純粋な関数なので、Node のテストで表示の不具合を確かめられる。画面側（app.js）はこのリストを描くだけ。
// 座標は世界（320×180）の座標。画面に映るのは VIEW_LEFT〜VIEW_RIGHT（256×144）。
// build.mjs は楽譜エンジンの後ろにこのファイルをつなげる（その時、下の import 行は取り除く）。
import {stepAt,segmentIndex,VIEW_LEFT,VIEW_RIGHT} from './score.mjs';

// 役者の立ち位置（左上）。モンスターは数に応じて並べ、奥の敵ほど遅れて滑り込む。
// 隊列は右から ゆっぴ → ミオ → トム → コロ。ルミはゆっぴの後ろの空を飛ぶ。
export const SPOTS={owl:[240,62],firefly:[148,64],frog:[256,142],koro:[34,140],cat:[54,140],mio:[78,138],lumi:[84,98],hero:[104,138],foe:[196,138],fire:[140,138],leaves:[264,150],god:[128,36]};
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

// 攻撃のポーズと踏み込み。武器のヒット（hits: 斬撃のポーズに入ってから何コマ後に斬るか）の時刻に、斬撃のポーズ（コマ2）と
// 踏み込みの山が来る。連撃ではヒットの間に一瞬構え直す。音も同じ hits から鳴るので、斬った絵と斬った音は同じ瞬間。
export function attackPose(frame,fraction,hits){
 const t=frame+fraction,times=hits.map(h=>2+h),last=times.at(-1);
 const striking=times.some(h=>t>=h&&t<h+.35);
 const pose=striking?2:t<times[0]?(t<1?0:1):t<last+.35?1:3;
 const lunge=Math.max(0,...times.map(h=>10*Math.exp(-(((t-h)/.3)**2))));
 const windup=t<times[0]?-3*Math.min(1,t/1):0;
 return {pose,dx:Math.round(lunge+windup),dy:Math.round(-2*Math.min(1,Math.max(0,times[0]-t)))};
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
//  {kind:'aura', x, y, r, alpha}                     癒しの道具の光の輪（中心と半径）
export function sceneAt(track,seconds,gear=[]){
 const {step,fraction}=stepAt(track,seconds),index=segmentIndex(track,step),seg=track.segments[index],local=step-seg.start;
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
 at('koro',SPOTS.koro);
 at('cat',SPOTS.cat,motion(actor('cat'),fraction,beats));
 at('mio',SPOTS.mio,motion(actor('mio').replace('mio-','hero-'),fraction,beats));
 at('lumi',SPOTS.lumi,[0,Math.round(3*Math.sin(Math.PI*beats/2))]);
 // 攻撃中は、武器のヒットに合わせてポーズ（コマ）と踏み込みを決める。
 let heroKey=actor('hero'),[hdx,hdy]=motion(heroKey,fraction,beats);
 // プロローグ: ゆっぴは光の粒。天の庭では神の光のそばで揺れ、堕ちる場面では空から森へ落ちていく。
 if(heroKey.startsWith('soul-')){
  const k=(local+fraction)/seg.steps,x=seg.mood==='fall'?SPOTS.hero[0]+8-Math.round(20*k):150+Math.round(10*Math.sin(Math.PI*beats/2));
  const y=seg.mood==='fall'?Math.round(40+118*k*k):96+Math.round(4*Math.sin(Math.PI*beats));
  if(seg.mood==='heaven')sprite(actor('foe0'),...SPOTS.god);
  sprite(heroKey,x,y);
  at('leaves',SPOTS.leaves);
  return {step,fraction,index,seg,theme:seg.theme,shake:0,items};
 }
 const [,heroAction,heroFrame]=heroKey.split('-');
 if(heroAction==='attack'){const a=attackPose(+heroFrame,fraction,track.hits||[0]);heroKey='hero-attack-'+a.pose;hdx=a.dx;hdy=a.dy;}
 const hx=SPOTS.hero[0]+hdx,hy=SPOTS.hero[1]+hdy,pose=heroKey.slice(5);
 const layer=side=>gear.filter(g=>g.endsWith(':'+side)).map(g=>g.split(':')[0]);
 // 癒しの道具の光の輪。拍の頭（響きが鳴る瞬間）で一番大きく、拍の間にしぼむ。
 if(track.healing){const beatFrac=((step+fraction)/2)%1;items.push({kind:'aura',x:hx+16,y:hy+18,r:Math.round(14+5*(1-beatFrac)),alpha:.25+.35*(1-beatFrac)});}
 for(const item of layer('back'))sprite(`eq:${item}-back-${pose}`,hx,hy);
 sprite(heroKey,hx,hy);
 for(const item of layer('front'))sprite(`eq:${item}-front-${pose}`,hx,hy);
 // 敵（焚き火・道の光も同じ枠）。敵はカードの頭で右から順に滑り込む（楽譜側でもその間は鳴らさない）。
 const count=seg.mood==='battle'?seg.foes:1;
 for(let k=count-1;k>=0;k--){
  const key=actor('foe'+k);if(!key)continue;
  if(seg.mood==='rest'){sprite(key,...SPOTS.fire);continue;}
  if(seg.mood==='altar'){sprite(key,SPOTS.foe[0]-12,SPOTS.foe[1]+2);continue;}
  const lead=4+k*2,entering=!/^(spark|fire|signpost|koro|lumi)/.test(key)&&local<lead,slide=entering?110*(1-(local+fraction)/lead)**2:0;
  const [dx,dy]=motion(key,fraction,beats);
  sprite(key,FOE_X[count][k]+slide+dx,SPOTS.foe[1]+dy);
 }
 lane('near',o=>o.id==='arch');
 at('leaves',SPOTS.leaves);
 // 守り人の足踏み（コマ0）で、画面がほんの一瞬揺れる
 const shake=/^guardian-idle-0/.test(actor('foe0'))&&fraction<.35?(Math.round(fraction*20)%2?1:-1):0;
 return {step,fraction,index,seg,theme:seg.theme,shake,items};
}
