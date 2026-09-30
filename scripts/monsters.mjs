// 仮のモンスター（Claude 作。Codex の本番のドット絵に差し替える予定）。
// パレットは scripts/pixel-art.mjs と同じ文字。32×32、足元は y=30、左向き（ゆっぴの方を向く）。
// bounce: 0 着地（つぶれる・音が鳴る） 1 上がる 2 頂点 3 下がる / hit: 0 白く光る 1 のけぞる。1コマ = 8分音符。

const BASES={
 // キノコの子: 桃色の傘に白い水玉、クリーム色の軸に顔。着地で「ポン」。
 mushling:[
  '....oooooooo....',
  '..oorrrrrrrroo..',
  '.orrwwrrrrrwwrro',
  '.orrwwrrrrrrrrro',
  'orrrrrrrwwrrrrro',
  'oooooooooooooooo',
  '...oSSSSSSSSo...',
  '...oSoSSSSoSo...',
  '...oSSSSSSSSo...',
  '...oSSSppSSSo...',
  '...oSSSSSSSSo...',
  '....oSSoSSSo....',
  '....oo..ooo.....'
 ],
 // カブトムシ: 焦げ茶の殻に光の筋、角。表と裏の拍で「カッ」。
 beetle:[
  '......o.........',
  '.....obo........',
  '......obo.......',
  '.....ooboo......',
  '...oohhhhhoo....',
  '..ohchbhhhcho...',
  '.ohhhhbhhhhhho..',
  '.ohhhhbhhhhhho..',
  '.ohhhhbhhhhhho..',
  '..ohhhhhhhhho...',
  '...ooooooooo....',
  '...o.o...o.o....'
 ],
 // 鬼火: 水色の炎に目。宙に浮き、光るたびに鈴のような音。
 wisp:[
  '.......o........',
  '......oco.......',
  '.....occco......',
  '....occlcco.....',
  '...occllllco....',
  '..occlllllllco..',
  '..oclwollwolco..',
  '..occllllllcco..',
  '...occllllcco...',
  '....occccco.....',
  '.....ooooo......'
 ]
};

// 32×32 に置く。bottom = 足元の行、dx = 横のずれ。
function place(rows,bottom=30,dx=0){
 const grid=Array.from({length:32},()=>Array(32).fill('.')),top=bottom-rows.length+1,left=8+dx;
 rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!=='.'&&top+y>=0&&left+x>=0&&left+x<32)grid[top+y][left+x]=ch;}));
 return grid.map(r=>r.join(''));
}
const squash=rows=>[...rows.slice(0,1),...rows.slice(2)]; // 上から2行目を抜いて、つぶれて見せる
const flash=rows=>rows.map(r=>r.replace(/[^.o]/g,'w'));
const glow=rows=>rows.map(r=>r.replace(/c/g,'l'));

function monster(id){
 const base=BASES[id],float=id==='wisp'?6:0,b=30-float;
 const bounce=id==='wisp'
  ?[place(glow(base),b),place(base,b-1),place(base,b-2),place(base,b-1)]
  :[place(squash(base),b),place(base,b-2),place(base,b-4),place(base,b-2)];
 return {bounce,hit:[place(flash(base),b,3),place(base,b,2)]};
}

export const MONSTER_SPRITES=Object.fromEntries(Object.keys(BASES).map(id=>[id,monster(id)]));
