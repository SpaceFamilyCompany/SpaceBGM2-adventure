import { PALETTE } from './pixel-art.mjs';

// Only sky, distant terrain and ground. Individually animated forms live in OBJECTS.
export function forestScene(themeId='entrance') {
  const themes={entrance:['v','d','g'],deep:['i','v','m'],mist:['o','i','m'],clearing:['i','d','g']};
  if(!Object.hasOwn(themes,themeId))throw new RangeError(`Unknown forest theme: ${themeId}`);
  const [sky,ridge,ground]=themes[themeId];
  const far=Array.from({length:180},()=>Array(320).fill(sky));
  const near=Array.from({length:180},()=>Array(320).fill('.'));
  function rect(g,x,y,w,h,c){for(let j=y;j<Math.min(180,y+h);j++)for(let i=x;i<x+w;i++)g[j][((i%320)+320)%320]=c;}
  if(themeId==='entrance'||themeId==='clearing'){
    const x=themeId==='clearing'?150:222;
    rect(far,x,18,20,28,'f');rect(far,x-4,22,28,20,'f');rect(far,x+2,20,16,24,'l');
    if(themeId==='entrance'){rect(far,x+12,18,10,19,sky);rect(far,0,66,320,3,'d');}
    else {rect(far,142,48,36,102,'v');rect(far,150,48,20,102,'d');rect(far,157,48,6,102,'f');}
  }
  if(themeId==='deep'){rect(far,224,23,14,14,'d');rect(far,214,22,40,7,'i');rect(far,230,29,24,10,'i');}
  for(let n=0;n<20;n++)rect(far,n*16,112+(n%5)*3,16,38,ridge);
  rect(far,0,143,320,7,ground);
  if(themeId==='mist'){rect(far,0,63,320,4,'v');rect(far,0,87,320,3,'d');rect(far,0,116,320,5,'f');rect(far,0,132,320,4,'d');}
  rect(near,0,150,320,3,ground);rect(near,0,153,320,4,'m');rect(near,0,157,320,23,themeId==='mist'?'o':'i');
  for(let n=0;n<20;n++){rect(near,n*16+5,162+n%3*4,4,2,'v');rect(near,n*16+10,175,3,1,'h');}
  function layer(id,g){
    for(const row of g)row[319]=row[0];
    const runs=[];let prev=new Map();
    g.forEach((row,y)=>{const next=new Map();for(let x=0;x<320;){const start=x,c=row[x];while(x<320&&row[x]===c)x++;if(c==='.')continue;
      const key=`${c}:${start}:${x-start}`,old=prev.get(key),r=old||{x:start,y,w:x-start,h:0,c};r.h++;if(!old)runs.push(r);next.set(key,r);
    }prev=next;});
    return `<g id="${id}">${runs.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${PALETTE[r.c]}"/>`).join('')}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges">${layer('forest-far',far)}${layer('forest-near',near)}</svg>`;
}
