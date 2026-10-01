// 森の小さな相手たち。左向き、接地 y=30。1コマ＝8分音符。
// bounce: 0 着地 / 1 離陸 / 2 頂点 / 3 下降。hit: 0 閃光 / 1 のけぞり。
const BASES={
 mushling:[
  '.......oooooo.......',
  '.....oorpppproo.....',
  '...oorppwwppprroo...',
  '..orpppwwwpppprrro..',
  '.orppppppppwwpprrro.',
  'orppwwpppppwwppprrro',
  'orppwwpppppppppprrro',
  '.orrrrrrrrrrrrrrrro.',
  '..oooYYYYYYYYoooo...',
  '....oSSSSSSSSSo.....',
  '...oSoSSoSSSSSo.....',
  '...oSoSSoSSSSso.....',
  '...oSSSSSSSSsso.....',
  '....opSSSSSSso......',
  '.....oSSSSSso.......',
  '....oSSooSSSo.......',
  '...oooo..oooo.......'
 ],
 beetle:[
  '..oo....................',
  '.oho..oo................',
  '.ohhooho................',
  '..ohbho.......oooo......',
  '...ohho....ooobbbboo....',
  '....oho..oobbYbbbhhho...',
  '....oho.oobYYbbbbhhhho..',
  '..ooohhooobbbbbbbhhhho..',
  '.ohhhhhhhohbbbbbbhhhhho.',
  'ohSwShhhhhohbbbbbhhhhho.',
  'ohSoShhhhhohhbbbbhhhhho.',
  '.ohhhhhhhhohhhhhhhhho..',
  '..oohhhhoooohhhhhhoo...',
  '....oooo....oooooo.....',
  '...oho.oho...oho.oho...',
  '..ooo..ooo...ooo..ooo..'
 ],
 wisp:[
  '............oo......',
  '...........oco......',
  '.........oocco......',
  '.......oocclo.......',
  '......occlllo.......',
  '....ooccllllco......',
  '...occllwwllcco.....',
  '..ocllwwwwlllcco....',
  '.ocllwwwwwwwllco....',
  '.oclowwowwwwllcco...',
  '.oclowwowwwwllcco...',
  '.ocllwwwwwwwllco....',
  '..oclppwwwwllcco....',
  '...ocllwwlllcco.....',
  '....occllllcco......',
  '.....oocclco........',
  '.......occo.........',
  '........oo..........'
 ]
};
function place(rows,bottom=30,dx=0,lean=0){
 const g=Array.from({length:32},()=>Array(32).fill('.')),width=Math.max(...rows.map(r=>r.length)),left=Math.floor((32-width)/2)+dx,top=bottom-rows.length+1;
 rows.forEach((row,y)=>[...row].forEach((c,x)=>{const gx=left+x+Math.round(lean*(1-y/(rows.length-1))),gy=top+y;if(c!=='.'){if(gx<0||gx>=32||gy<0||gy>=32)throw new RangeError('Monster outside grid');g[gy][gx]=c;}}));return g.map(r=>r.join(''));
}
const flash=rows=>rows.map(r=>r.replace(/[^.o]/g,'w'));
function monster(id){
 const base=BASES[id],floating=id==='wisp',bottom=floating?25:30;
 const compressed=base.filter((_,y)=>y!==5&&y!==12);
 const bounce=floating?[place(base.map(r=>r.replace(/l/g,'w')),bottom),place(base,bottom-2,-1),place(base,bottom-4),place(base,bottom-2,1)]:[place(compressed,bottom),place(base,bottom-2,0,-1),place(base,bottom-5),place(base,bottom-2,0,1)];
 return {bounce,hit:[place(flash(base),bottom),place(base,bottom-1,2,3)]};
}
export const MONSTER_SPRITES=Object.fromEntries(Object.keys(BASES).map(id=>[id,monster(id)]));
