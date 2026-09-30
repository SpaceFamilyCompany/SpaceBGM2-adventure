// 森の生き物（フクロウ・カエル・蛍）の動きを、Codex のドット絵から組み立て直す。
// 鳴く動作（hoot / croak / glow）は「鳴くコマ」を元の絵のまま保ち、その前後に跳ねる・反動・まばたきを足す。
// 鳴いていない間の待機（idle）は、音の出ないコマだけで拍に合わせて揺れる・呼吸する・浮かぶ。1コマ = 8分音符。
import {SPRITES} from './pixel-art.mjs';

const copy=grid=>grid.map(row=>row.split(''));
const join=cells=>cells.map(row=>row.join(''));
// rows [top, bottom] の範囲の絵を dx, dy だけずらす（空いた所は透明）。
function shift(grid,[top,bottom],dx,dy){
 const src=copy(grid),out=copy(grid);
 for(let y=top;y<=bottom;y++)for(let x=0;x<32;x++)out[y][x]='.';
 for(let y=top;y<=bottom;y++)for(let x=0;x<32;x++){const c=src[y][x];if(c==='.')continue;const ny=y+dy,nx=x+dx;if(ny>=0&&ny<32&&nx>=0&&nx<32)out[ny][nx]=c;}
 return join(out);
}
// 指定したマスを塗る。paint: [[y, x0, x1, ch], ...]
function paint(grid,spans){const cells=copy(grid);for(const [y,x0,x1,ch] of spans)for(let x=x0;x<=x1;x++)cells[y][x]=ch;return join(cells);}

// フクロウ: 目は 14〜16 行の 11〜13 列と 18〜20 列。体は 9〜26 行、止まり木は 28〜30 行。
const owl=SPRITES.owl.hoot,owlBody=[9,26];
const owlBlink=grid=>paint(grid,[[14,11,13,'f'],[14,18,20,'f'],[15,11,13,'o'],[15,18,20,'o'],[16,11,13,'f'],[16,18,20,'f']]);
const owlMotion={
 // 0: くちばしを開けて小さく跳ねる（ホー） 1: 着地 2: もう一度開ける（ホー） 3: まばたき
 hoot:[shift(owl[0],owlBody,0,-1),owl[1],owl[2],owlBlink(owl[1])],
 // 止まり木の上で左右に揺れる
 idle:[owl[1],shift(owl[1],owlBody,-1,0),owl[1],shift(owl[1],owlBody,1,0)]
};

// カエル: 目は 22 行の 11〜12 列と 18〜19 列。体は 21〜28 行、脚は 28〜30 行。
const frog=SPRITES.frog.croak;
const frogBlink=grid=>paint(grid,[[22,11,12,'o'],[22,18,19,'o']]);
// 体を1マス持ち上げ、28行目（脚の付け根）はそのまま残して脚が伸びたように見せる。
const frogLift=grid=>{const lifted=shift(grid,[21,28],0,-1).map(row=>row.split(''));lifted[28]=grid[28].split('');return lifted.map(row=>row.join(''));};
const frogMotion={
 // 0: のどをふくらませる（ケロッ） 1: 反動で体が浮く 2: 戻る 3: まばたき
 croak:[frog[0],frogLift(frog[1]),frog[1],frogBlink(frog[1])],
 // 呼吸（体がふくらむ）とまばたき
 idle:[frog[1],frogLift(frog[1]),frog[1],frogBlink(frog[1])]
};

// 蛍: 鳴いていない間は、いちばん暗いコマのままふわふわ浮かぶ。
const fly=SPRITES.firefly.glow,flyBody=[0,31];
const fireflyMotion={idle:[fly[3],shift(fly[3],flyBody,0,-1),shift(fly[3],flyBody,0,-2),shift(fly[3],flyBody,0,-1)]};

export const CREATURE_SPRITES={
 ...SPRITES,
 owl:{...SPRITES.owl,...owlMotion},
 frog:{...SPRITES.frog,...frogMotion},
 firefly:{...SPRITES.firefly,...fireflyMotion}
};
