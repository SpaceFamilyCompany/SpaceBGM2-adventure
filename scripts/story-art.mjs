// 物語（プロローグ・第1章）の仮のドット絵（Claude 作。Codex の本番の絵に差し替える予定）。
// パレットは scripts/pixel-art.mjs と同じ文字。1コマ = 8分音符、4コマで1周。物語は docs/story.md・docs/chapter1.md。
import {SPRITES,PALETTE} from './pixel-art.mjs';
import {OBJECTS} from './forest-objects.mjs';

const W=32;
const pad=rows=>{const w=Math.max(...rows.map(r=>r.length));return rows.map(r=>r.padEnd(w,'.'));};
// 32×32 に置く（bottom = 足元の行、dx = 横のずれ）。
function place(rows,bottom=30,dx=0,size=W){
 rows=pad(rows);
 const grid=Array.from({length:size},()=>Array(size).fill('.')),top=bottom-rows.length+1,left=Math.floor((size-rows[0].length)/2)+dx;
 rows.forEach((row,y)=>[...row].forEach((ch,x)=>{const gy=top+y,gx=left+x;if(ch!=='.'&&gy>=0&&gy<size&&gx>=0&&gx<size)grid[gy][gx]=ch;}));
 return grid.map(r=>r.join(''));
}
const recolor=(grid,map)=>grid.map(r=>[...r].map(c=>map[c]??c).join(''));

// コロ：しゃべる小石。転がると木琴のように鳴る。
const KORO=[
 '.....oooo.....',
 '...ooffffoo...',
 '..offffffffo..',
 '.offofffoffdo.',
 '.offffffffffdo',
 '.offffppffffdo',
 '..offffffffdo.',
 '...ooffffddo..',
 '.....oooooo...'
];
const koroBlink=KORO.map((r,y)=>y===3?'.offfffffffdo.':r);
// ルミ：羽を落とした迷子の天使。飛ぶとハープの分散和音。
const LUMI=[
 '.....yyyy.....',
 '....y....y....',
 '.....yyyy.....',
 '.....oSSo.....',
 '....oSoSoS....',
 '....oSSSSo....',
 '.....owwo.....',
 '..l.owwwwo.l..',
 '.llowwwwwwoll.',
 '..lowwwwwwol..',
 '...owwwwwwo...',
 '....oooooo....'
];
const lumiWingsUp=LUMI.map((r,y)=>y===7?'.ll.owwwwo.ll.':y===8?'llloowwwwoolll':y===9?'...owwwwwwo...':r);
const lumiNoWings=LUMI.map(r=>r.replace(/l/g,'.'));
// 道しるべ：分かれ道の木の標。
const SIGN=[
 '..oooooooo....',
 '..ohhhhhhho...',
 '..ohbbbbbhho..',
 '..ohhhhhhho...',
 '..oooooooo....',
 '....ooho......',
 'oooooooho.....',
 'ohhhhhhhho....',
 'oohbbbbbho....',
 '.ohhhhhhho....',
 '..oooohoo.....',
 '.....oho......',
 '.....oho......',
 '.....oho......',
 '....ohhho.....',
 '...ooooooo....'
];
// ひとふしの光（プロローグ）と、神の光。
function orb(size,radius,rings){
 const c=(size-1)/2;
 return Array.from({length:size},(_,y)=>Array.from({length:size},(_,x)=>{const d=Math.hypot(x-c,y-c);for(const [r,ch] of rings)if(d<=r*radius)return ch;return '.';}).join(''));
}

// ミオ：森の花守り。ゆっぴの絵の色を替えて仮に作る（帽子は桃色、服は若葉色、髪は明るく）。
const mioColors={c:'p',C:'p',v:'G',h:'b',y:'Y'};
const mio=frames=>frames.map(f=>recolor(f,mioColors));

export const STORY_SPRITES={
 koro:{
  roll:[place(KORO,30,-1),place(KORO,29,0),place(KORO,30,1),place(KORO,29,0)],
  idle:[place(KORO,30),place(KORO,30),place(koroBlink,30),place(KORO,30)]
 },
 lumi:{
  shiver:[place(lumiNoWings,30,-1),place(lumiNoWings,30,1),place(lumiNoWings,30,-1),place(lumiNoWings,30,1)],
  fly:[place(lumiWingsUp,20),place(LUMI,21),place(LUMI,22),place(LUMI,21)]
 },
 mio:{walk:mio(SPRITES.hero.walk),idle:mio([SPRITES.hero.walk[1],SPRITES.hero.walk[1],SPRITES.hero.walk[3],SPRITES.hero.walk[1]])},
 signpost:{sway:[place(SIGN,30),place(SIGN,30,1),place(SIGN,30),place(SIGN,30,-1)]},
 altar:{glow:OBJECTS.altar.frames},
 soul:{glow:[orb(16,1,[[2,'w'],[4,'l'],[6,'c']]),orb(16,1,[[2,'w'],[4.5,'l'],[6.5,'c']]),orb(16,1,[[2.5,'w'],[5,'l'],[7,'c']]),orb(16,1,[[2,'w'],[4.5,'l'],[6.5,'c']])]},
 god:{pulse:[0,1,2,1].map(k=>orb(64,1,[[6+k,'w'],[12+k,'Y'],[18+k,'l'],[24+k*1.5,'f'],[30,'.']]))}
};
// 物語で音が鳴るコマ（web/score.mjs の SOUND_FRAMES と一致させる。テストで確認）。
export const STORY_SOUND_FRAMES={
 'koro.roll':[0,2], 'lumi.fly':[0], 'mio.walk':[0,2], 'signpost.sway':[0], 'altar.glow':[0], 'soul.glow':[0,2], 'god.pulse':[0]
};

// 天の庭（プロローグの景色）。空は光のにじむ lilac、地面は雲。forest-scene と同じ 320×180 の2層。
export function heavenScene(){
 const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PALETTE[c]}"/>`;
 let far=rect(0,0,320,180,'f')+rect(0,0,320,60,'l')+rect(0,60,320,20,'w');
 for(let i=0;i<10;i++)far+=rect(i*32+(i%3)*5,20+(i%4)*9,18,2,'w');
 let near='';
 for(let x=0;x<320;x+=40)near+=rect(x,146,40,34,'w')+rect(x+6,140,28,6,'w')+rect(x+14,136,12,4,'l');
 near+=rect(0,176,320,4,'l');
 return {far,near};
}
