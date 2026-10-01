// 天の庭と第1章。整数ピクセル、1コマ＝8分音符。
import {PALETTE} from './pixel-art.mjs';
const canvas=(w=32,h=w)=>Array.from({length:h},()=>Array(w).fill('.'));
function box(g,x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){if(!g[j]||i<0||i>=g[0].length)throw new RangeError(`Pixel outside grid: ${i},${j}`);g[j][i]=c;}}
function stamp(g,x,y,rows){rows.forEach((r,j)=>[...r].forEach((c,i)=>{if(c!=='.')box(g,x+i,y+j,1,1,c);}));}
const finish=g=>g.map(r=>r.join(''));
const frames=fn=>Array.from({length:4},(_,f)=>finish(fn(f)));
function panel(g,x,y,w,h,c){box(g,x,y,w,h,'o');box(g,x+1,y+1,w-2,h-2,c);}
// コロの目と鉱脈も回転する。0・2で接地、光源は常に左上。
const stone=['....oooooo....','..oofflllfoo..','.offlllllfffo.','offflfffffffdo','offfffffffffdo','offfffffffffdo','offffffffdddo.','.offfffffddo..','..ooffddddo...','....oooooo....'];
function koro(f,idle=false){
 const g=canvas(),x=idle?9:[8,9,10,9][f],y=idle?21:[21,19,21,19][f];stamp(g,x,y,stone);
 const eyes=idle?[[4,4],[8,4]]:[[[4,4],[8,4]],[[6,3],[9,6]],[[5,5],[9,5]],[[3,6],[6,3]]][f];
 for(const [ex,ey] of eyes)box(g,x+ex,y+ey,idle&&f===2?2:1,idle&&f===2?1:2,'o');
 box(g,x+6,y+7,2,1,'h');stamp(g,x+(idle?9:f%2?2:9),y+2,['f','d']);return g;
}
const angelHead=['...oooooo...','..oyYYYYyo..','.oyYYyYYyyo.','.oySSSSSSyo.','.oySoSSoSyo.','..oSSSSSSo..','...oSppSo...','....oooo....'];
const wingDown=['.....ooo','...oollo','..ollwlo','.ollwlo.','olwwlo..','olllo...','.ooo....'];
const wingMid=['..oooo..','.olwwloo','olwwwllo','.ollloo.','..ooo...'];
const wingUp=['..oo....','.olwo...','olwwlo..','olwwlo..','.olwllo.','..ollloo','...oooo.'];
function lumi(f,flying){
 const g=canvas(),x=flying?10:[9,10,9,10][f],y=flying?[6,5,5,5][f]:11;
 if(flying){
  const wing=[wingDown,wingMid,wingUp,wingMid][f],wy=y+[9,7,2,7][f];
  stamp(g,4,wy,wing);stamp(g,21,wy,wing.map(r=>[...r.padEnd(8,'.')].reverse().join('')));
  stamp(g,10,y+8,['oooo','olll','oooo']);stamp(g,20,y+8,['oooo','lllo','oooo']);
 }
 stamp(g,x+2,y-5,['.oyyyyyo.','oyY...Yyo','.oyyyyyo.']);stamp(g,x,y,angelHead);
 stamp(g,x+2,y+8,['..oooo..','.olwwlo.','olwwwwlo','olwYwwlo','olwwwwlo','olwwwwlo','olwlwwlo','ollllwlo','.oooooo.']);
 if(flying)stamp(g,x+3,y+17,['oSo.oSo','.oo.oo.']);
 else{stamp(g,x+1,y+9,['ooo....ooo','oSSooooSSo','.oSSSSSSo.','..oooooo..']);stamp(g,x+3,28,['oSo.oSo','oSo.oSo','ooo.ooo']);}
 return g;
}
const mioHead=['.....oooooo....','...oobbbbbboo..','..obbbSSbbbbbo.','.obbbSSSSSbbbo.','.obbSSSSSSSbbo.','.obbSSoSSoSSbo.','.obbSSSSSSSSbo.','..obbSSSppSbo..','..obboSSSSobo..','..obbbooobbbo..','...obo....obo..'];
function mio(f,idle=false){
 const g=canvas(),dy=idle?0:[0,-1,0,-1][f];stamp(g,7,4+dy,mioHead);
 // 花飾りと葉、独自の髪形。主人公と同じ足のアンカー。
 stamp(g,8,3+dy,['..opo..','.opwpo.','opwYwpo','.opwpo.','..oGo..']);
 stamp(g,10,15+dy,['....oooo....','...oSYYSo...','..ogGLLGo...','.ogGGLLGGo..','ogGGGyGGGGo.','.ogGGGGGGo..','.ogLGGGLGo..','ogLLGGGLLGo.','ogGGGGGGGGo.','.ooooooooo..']);
 const lx=!idle&&f===2?10:12,rx=!idle&&f===0?19:18;
 panel(g,lx,25+dy,4,5,'S');panel(g,rx,25+dy,4,5,'S');box(g,lx-1,29+dy,5,2,'o');box(g,lx,29+dy,3,1,'b');box(g,rx,29+dy,5,2,'o');box(g,rx+1,29+dy,3,1,'b');
 if(!idle&&f%2){box(g,f===1?11:18,28,6,2,'.');box(g,f===1?12:18,27,5,2,'o');}
 stamp(g,9,19+dy,['ogo','oSo','.oo']);stamp(g,21,20+dy,['ogo','oSo','.oo']);
 if(idle&&f===2){box(g,13,9,2,1,'o');box(g,16,9,2,1,'o');box(g,13,10,1,1,'S');box(g,16,10,1,1,'S');}return g;
}
function signpost(f){
 const g=canvas(),lean=[-2,0,1,0][f];stamp(g,11,26,['..ogoo..','.ogGggo.','oogGgGoo','oggggggo','oooooooo']);
 for(let y=8;y<28;y++){const x=15+Math.round(lean*(28-y)/20);stamp(g,x,y,['ohbo']);}
 stamp(g,6+lean,5,['.ooooooooooooo...','ohbbbbbbbbbbhho..','ohbYYbbbbbYbbhho.','ohbbbbbbbbbbhho..','.ooooooooooooo...']);
 stamp(g,4+lean,13,['...ooooooooooooo.','..ohbbbbbbbbbbho.','.ohbbYbbbbYYbbhho','..ohbbbbbbbbbbho.','...ooooooooooooo.']);
 box(g,15+lean,7,1,1,'o');box(g,15+lean,15,1,1,'o');stamp(g,21+lean,9,['oGLo','.oo.']);return g;
}
function altar(f){
 const g=canvas(56,32);panel(g,8,11,40,17,'d');panel(g,2,25,52,7,'m');panel(g,4,6,48,8,'g');box(g,6,7,44,2,'G');box(g,7,9,42,2,'L');box(g,10,14,36,1,'f');box(g,10,23,36,2,'v');
 for(const x of [14,39]){box(g,x,15,1,9,'v');box(g,x+1,16,2,5,'g');}
 stamp(g,8,11,['GGLGG','gGGg.','.Gg..','..g..']);stamp(g,40,11,['GGGLG','.gGGG','..gG.','...g.']);box(g,5,26,46,1,'g');box(g,6,29,44,1,'d');
 stamp(g,23,15,['..ooooo..','.ovvvvvo.','ovvvvvvvo','ovvvvvvvo','.ovvvvvo.','..ooooo..']);const light=f===0?'w':f===2?'d':'c';
 box(g,27,16,1,7,light);box(g,24,18,7,1,light);box(g,26,17,3,3,f===0?'Y':light);
 if(f===0){stamp(g,24,1,['...Y...','..YwY..','...Y...']);box(g,19,4,1,1,'c');box(g,35,3,1,1,'c');}
 stamp(g,6,27,['gGLg','GGg.']);stamp(g,44,27,['gGGL','..Gg']);return g;
}
// 魂と神の光に共通する四方の光芒＝はじまりの歌のひとふし。
function light(size,f){
 const g=canvas(size),big=size===64,c=(size-1)/2,radius=big?[23,20,18,20][f]:[5.5,4,5.5,4][f];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=Math.abs(x-c),dy=Math.abs(y-c),d=Math.max(dx,dy)*0.7+(dx+dy)*0.3;if(d<=radius)g[y][x]=d>radius-1?'o':d>radius-3?'c':d>radius*0.55?'l':d>radius*0.3?'Y':'w';}
 const reach=big?[30,26,24,26][f]:[7,5,7,5][f];
 for(let k=Math.ceil(radius+1);k<=reach;k++)for(const [x,y] of [[Math.floor(c),Math.floor(c)-k],[Math.ceil(c),Math.ceil(c)+k],[Math.floor(c)-k,Math.ceil(c)],[Math.ceil(c)+k,Math.floor(c)]])box(g,x,y,1,1,k===reach?'o':big?'Y':'c');
 if(big){for(const [x,y] of [[10,10],[49,10],[10,49],[49,49]])stamp(g,x,y,f===0?['.o.','oYo','.o.']:['...','.f.','...']);for(const d of [-7,0,7])stamp(g,30+d,27+Math.abs(d)/7,['.w.','www','.w.']);}return g;
}
export const STORY_SPRITES={koro:{roll:frames(f=>koro(f)),idle:frames(f=>koro(f,true))},lumi:{shiver:frames(f=>lumi(f,false)),fly:frames(f=>lumi(f,true))},mio:{walk:frames(f=>mio(f)),idle:frames(f=>mio(f,true))},signpost:{sway:frames(signpost)},altar:{glow:frames(altar)},soul:{glow:frames(f=>light(16,f))},god:{pulse:frames(f=>light(64,f))}};
// Contract with the score: never move a sound to a different frame.
export const STORY_SOUND_FRAMES={
 'koro.roll':[0,2], 'lumi.fly':[0], 'mio.walk':[0,2], 'signpost.sway':[0], 'altar.glow':[0], 'soul.glow':[0,2], 'god.pulse':[0]
};
// 各レイヤーは独立してタイル可能。雲の上端は y=135〜146。
export function heavenScene(){
 const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PALETTE[c]}"/>`;
 let far=rect(0,0,320,180,'f');
 for(const [y,h,c] of [[0,24,'d'],[24,24,'f'],[48,30,'l'],[78,22,'w'],[100,30,'l']])far+=rect(0,y,320,h,c);
 for(const [x,y,w,h,c] of [[112,15,96,8,'f'],[88,23,144,12,'l'],[64,35,192,16,'l'],[96,40,128,8,'w'],[120,32,80,8,'w'],[24,63,43,2,'w'],[242,58,52,2,'w'],[41,108,65,2,'w'],[206,117,78,2,'w']])far+=rect(x,y,w,h,c);
 for(const [x,y] of [[28,22],[68,12],[252,19],[292,35]])far+=rect(x,y,1,5,'Y')+rect(x-2,y+2,5,1,'Y');
 let near=rect(0,146,320,34,'l');
 for(let x=0;x<320;x+=40){near+=rect(x+4,141,32,7,'w')+rect(x+10,137,20,6,'w')+rect(x+16,135,8,2,'l');near+=rect(x,148,40,7,'w')+rect(x+8,155,24,2,'f');near+=rect(x+4,164,32,3,'w')+rect(x+12,161,16,3,'w');}
 near+=rect(0,175,320,5,'f');return {far,near};
}
