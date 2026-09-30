import { PALETTE } from './pixel-art.mjs';

export const LANES = { far:{pxPerBeat:4,y:[60,120]}, mid:{pxPerBeat:8,y:[90,150]}, near:{pxPerBeat:16,y:[150,178]} };
export const THEMES = [{id:'entrance',floors:[1,3]},{id:'deep',floors:[4,7]},{id:'mist',floors:[8,9]},{id:'clearing',floors:[10,10]}];
const all = THEMES.map(t=>t.id);
// baseline is the bottom edge: draw at (x, baseline - height).
// Frame indices are eighth notes; sound.frames share this same four-step clock.
function object(lane,themes,weight,width,height,baseline,voice,sounds,paint) {
  const frames=Array.from({length:4},(_,f)=>{
    const grid=Array.from({length:height},()=>Array(width).fill('.'));
    const box=(x,y,w,h,c)=>{
      if(x<0||y<0||x+w>width||y+h>height) throw new RangeError('Object pixel outside grid');
      for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)grid[j][i]=c;
    };
    const edge=lane==='far'?'d':lane==='mid'?'v':'o';
    const panel=(x,y,w,h,c)=>{box(x,y,w,h,edge);box(x+1,y+1,w-2,h-2,c);};
    paint(box,panel,f,edge,sounds.includes(f));
    return grid.map(r=>r.join(''));
  });
  return {lane,themes,weight,width,height,baseline,frames,sound:{frames:sounds,voice}};
}
const sway=[0,1,0,-1];
function tree(b,p,f,e,lit,w,h,dead=false){
  const x=Math.floor(w/2),s=sway[f];
  p(x-3,8,7,h-8,dead?'d':'m');
  b(x-9+s,12,9,3,e);b(x-9+s,7,3,7,e);
  b(x+2,19,9+s,3,e);b(x+8+s,12,3,9,e);
  if(!dead){p(3+s,3,w-6,10,'g');b(6+s,4,w-12,2,'G');p(1+s,15,w-4,9,'m');}
  b(x-7,h-3,15,3,e);
}
export const OBJECTS = {
  flower:object('near',['entrance'],3,16,16,176,'chime',[2],(b,p,f)=>{
    b(7,7,2,9,'o');b(8,8,1,7,'g');b(3,11,4,2,'G');b(10,9,3,2,'g');
    const r=[2,3,5,3][f];p(8-r,5-r,2*r,2*r,'p');b(7,4,2,2,f===2?'Y':'r');
  }),
  brook:object('near',['entrance'],2,40,16,173,'drip',[0,2],(b,p,f)=>{
    p(1,7,38,7,'v');b(7,9,25,2,'c');p(3,4,9,6,'g');p(28,5,9,5,'m');
    b(14+f*3,7,4,1,f%2===0?'w':'d');b(18-f*2,12,5,1,'f');
  }),
  sapling:object('mid',['entrance'],3,28,40,146,'rustle',[0],(b,p,f,e,a)=>tree(b,p,f,e,a,28,40)),
  fireflies:object('far',['entrance'],3,24,16,86,'glass',[0],(b,p,f)=>{
    for(const [x,y] of [[4,5],[12,10],[20,3]]){b(x,y+sway[f],1,2,f===0?'l':'f');if(f===0){b(x-1,y,3,1,'f');}}
  }),
  bush:object('near',['entrance','deep'],3,32,22,176,'rustle',[0,2],(b,p,f)=>{
    p(3+sway[f],9,26,11,'m');p(7+sway[f],4,17,12,'g');b(9+sway[f],5,11,2,'G');b(4,19,24,3,'o');
  }),
  mushroom:object('near',['deep'],3,32,32,176,'pop',[0],(b,p,f)=>{
    const y=[3,6,8,5][f];p(13,15,7,17,'s');p(3,y+5,26,9,'r');p(8,y,16,9,'p');b(10,y+3,4,2,'Y');b(22,y+7,3,2,'f');
  }),
  'lantern-moss':object('mid',['deep'],3,24,40,139,'glass',[0],(b,p,f)=>{
    p(10,3,4,35,'m');b(5,4,13,3,'g');p(3,9,14,18,'m');p(6,12,8,11,f===0?'Y':f===2?'d':'G');b(2,27,16,3,'g');b(4,30,2,4,'G');
  }),
  'big-tree':object('mid',['deep'],4,48,48,150,'creak',[0],(b,p,f,e,a)=>tree(b,p,f,e,a,48,48)),
  'distant-tree':object('far',['deep'],4,28,32,116,'creak',[0],(b,p,f,e,a)=>{
    tree(b,(x,y,w,h)=>p(x,y,w,h,'d'),f,e,a,28,32);b(7+sway[f],5,13,2,'f');
  }),
  'stone-pillar':object('mid',['mist'],3,24,46,150,'bell-low',[0],(b,p,f)=>{
    p(5,5,14,38,'d');p(2,2,20,7,'g');p(2,40,20,6,'m');b(8,16,8,2,f===0?'l':'v');b(11,13,2,13,f===0?'c':'v');b(7,31,3,2,'v');
  }),
  'dead-tree':object('far',['mist'],3,30,32,118,'creak',[2],(b,p,f,e,a)=>tree(b,p,f,e,a,30,32,true)),
  'mist-puff':object('mid',['mist'],3,48,20,127,'whoosh',[0],(b,p,f)=>{
    const s=[0,2,4,2][f];b(3+s,8,42-2*s,5,'d');b(10+s,4,28-2*s,4,'f');b(7+s,13,32-2*s,3,'v');
  }),
  'owl-perch':object('near',['mist'],2,40,48,175,'wood',[0,2],(b,p,f)=>{
    p(19,26,6,22,'h');p(5,26,32,5,'h');p(12,7+sway[f],18,19,'h');b(12,4+sway[f],4,5,'o');b(26,4+sway[f],4,5,'o');
    b(15,11+sway[f],4,4,'f');b(23,11+sway[f],4,4,'f');b(16,12+sway[f],2,f%2?1:2,'o');b(24,12+sway[f],2,f%2?1:2,'o');b(20,16+sway[f],2,3,'y');
  }),
  altar:object('near',['clearing'],4,56,32,176,'bell-low',[0],(b,p,f)=>{
    p(8,11,40,17,'d');p(2,25,52,7,'m');p(4,6,48,8,'g');b(6,7,44,2,'G');b(13,14,3,5,'g');b(26,16,4,7,f===0?'Y':'v');b(23,18,10,2,f===0?'c':'v');
  }),
  'moon-mote':object('far',['clearing'],3,20,24,90,'chime',[2],(b,p,f)=>{
    const s=[1,2,4,2][f];b(10-s,9,2*s+1,1,'f');b(10,9-s,1,2*s+1,f===2?'l':'d');b(5,19+sway[f],2,1,'d');
  }),
  'resonant-stone':object('mid',['clearing'],2,32,28,146,'pluck-low',[0],(b,p,f)=>{
    p(5,7,22,18,'d');p(9,3,14,7,'g');b(11,11,10,2,f===0?'l':'f');b(15,9,2,11,f===0?'c':'v');b(3,25,26,3,'m');
  }),
  // A 44px-wide, 46px-high opening. The score owns crossing/floor changes.
  arch:object('near',all,1,64,72,176,'whoosh',[0],(b,p,f)=>{
    p(3,21,7,51,'h');p(54,21,7,51,'h');p(7,12,8,16,'h');p(49,12,8,16,'h');p(13,6,38,9,'h');p(21,2,22,7,'m');
    b(4,23,2,40,'g');b(56,23,2,40,'g');b(15,7,34,2,'G');b(6,32,5,3,'G');b(53,44,6,3,'g');p(28,11,8,10,f===0?'Y':'d');b(30,14,4,2,f===0?'l':'f');
  })
};
export function objectSheet(){
  return Object.entries(OBJECTS).map(([id,o])=>o.frames.map((grid,f)=>{
    const runs=[];let prev=new Map();
    grid.forEach((row,y)=>{const next=new Map();for(let x=0;x<o.width;){const start=x,c=row[x];while(x<o.width&&row[x]===c)x++;if(c==='.')continue;
      const key=`${c}:${start}:${x-start}`,old=prev.get(key),r=old||{x:start,y,w:x-start,h:0,c};r.h++;if(!old)runs.push(r);next.set(key,r);
    }prev=next;});
    const colors=new Map();for(const r of runs)colors.set(r.c,(colors.get(r.c)||'')+`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`);
    return `<symbol id="px-obj-${id}-${f}" viewBox="0 0 ${o.width} ${o.height}" shape-rendering="crispEdges">${[...colors].map(([c,r])=>`<g fill="${PALETTE[c]}">${r}</g>`).join('')}</symbol>`;
  }).join('')).join('');
}
