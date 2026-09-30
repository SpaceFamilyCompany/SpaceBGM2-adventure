// Space Family / 蛍火の森. Integer pixels only; '.' is transparent.
export const PALETTE = {
  o:'#1C1A33', i:'#232046', v:'#3B3470', d:'#5A548F',
  l:'#EAE6F5', w:'#F7F5FB', f:'#B9B4D3', p:'#F0A9B9', c:'#A9DDE2',
  g:'#657B78', G:'#91AC99', m:'#455A60', L:'#C4D4AD',
  s:'#D7AFA9', S:'#F0CFC1', h:'#695365', b:'#92717B',
  y:'#E7D59D', Y:'#F5ECCB', r:'#BE8199'
};
export const FRAME_COUNT = 4;

function canvas() { return Array.from({length:32},()=>Array(32).fill('.')); }
function box(g,x,y,w,h,c) {
  for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) {
    if(i<0||i>31||j<0||j>31) throw new RangeError(`Pixel outside grid: ${i},${j}`);
    g[j][i]=c;
  }
}
function stamp(g,x,y,rows) {
  rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(c!=='.') box(g,x+i,y+j,1,1,c);}));
}
function finish(g) { return g.map(r=>r.join('')); }
function frames(fn,n=4) { return Array.from({length:n},(_,f)=>finish(fn(f))); }
function outline(g,x,y,w,h,c) { box(g,x,y,w,h,'o'); box(g,x+1,y+1,w-2,h-2,c); }

// Shared pose anchors: equipment is already registered to the unmodified body.
function pose(action,f) {
  const dy=action==='cheer'?[0,-3,0,-1][f]:action==='walk'?[0,-1,0,-1][f]:action==='rest'?[0,0,-1,-1][f]:[0,-1,0,0][f];
  const hand=action==='attack'?[[21,21],[17,13],[24,22],[22,22]][f]:action==='cheer'?[[22,13],[22,10],[22,13],[22,12]][f]:action==='rest'?[21,27+dy]:[21,22+dy];
  return {dy,hand};
}
const head=[
 '......oooo.....',
 '....oovccco....',
 '...ovcccccco...',
 '..ovcccccccco..',
 '.ovccccpccccoo.',
 'ovvvvvvvvvvvvvo',
 '.ooooooooooooo.',
 '..ohhSSSSSSo...',
 '..ohSSSSoSSSo..',
 '..ohSSSSoSSSSo.',
 '...oSSSSSSSSo..',
 '....ooSSSppo...',
 '......ooooo....'
];
function hero(action,f) {
  const g=canvas(),{dy,hand:[hx,hy]}=pose(action,f),sit=action==='rest';
  stamp(g,7,(sit?10:3)+dy,head);
  stamp(g,11,(sit?23:16)+dy,['..oppppo..','.ovpppvvo.','ovvvyvvvvo','ovvccvvvvo','.ovvvvvvo.','..oooooo..']);
  if(sit) {
    stamp(g,10,28+dy,['.ovvvvoooooo','ovvvvoohhhho','oooooo.ooooo']);
    box(g,11,25+dy,3,2,'s');
  } else {
    const legs=action==='walk'?f:0;
    stamp(g,12,22+dy,['ovvvvvvo','ovvoovvo','ovvoovvo']);
    const lx=legs===2?10:12,rx=legs===0?19:18;
    outline(g,lx,25+dy,4,5, 'v'); outline(g,rx,25+dy,4,5,'v');
    box(g,lx-1,29+dy,5,2,'o');box(g,lx,29+dy,3,1,'b');
    box(g,rx,29+dy,5,2,'o');box(g,rx+1,29+dy,3,1,'b');
    if(action==='walk'&&f%2) {box(g,f===1?11:18,28,6,2,'.');box(g,f===1?12:18,27,5,2,'o');}
  }
  if(action==='cheer') stamp(g,8,13+dy,['oso','oso','ovo','ovo','.oo']);
  else stamp(g,10,(sit?25:19)+dy,['ovo','oso','.oo']);
  // The forearm reaches the same grip used by the sword.
  if(action==='attack'&&f===1) stamp(g,17,14,['ovo','ovo','ovo','ovo']);
  else if(action==='attack'&&f===2) box(g,20,21,5,2,'v');
  else if(action==='cheer') box(g,21,hy+2,2,7,'v');
  else box(g,20,hy-2,2,3,'v');
  stamp(g,hx-1,hy-1,['ooo','oSo','.oo']);
  return g;
}

function blade(action,f) {
  const g=canvas(),{hand:[x,y]}=pose(action,f);
  if(action==='rest') {
    stamp(g,23,28,['....o....','ooogGGGGo','.oooyoooo']); return g;
  }
  if(action==='walk') {
    // Shoulder carry: the blade slopes away from the face, grip at the hand.
    stamp(g,x-1,y-11,['.......o.','......oLo','.....oLGo','.....oGo.','....oGGo.','....oGo..','...oGGo..','...oGo...','..oGo....','.oyyo....','..bo.....','.oo......']);
  } else if(action==='attack'&&f===2) {
    stamp(g,24,20,['....o...','..ooGooo','oogGGLLG','.oyooooo','..o.....']);
    // Discrete impact crescent, visible ONLY on the sound/impact frame.
    stamp(g,27,12,['.cc..','..cL.','...c.','...Lc','....c','....c','...Lc','...c.']);
  } else if(action==='attack'&&f===1) {
    stamp(g,8,6,['.oo........','oLGoo......','.oLGGoo....','...oLGGoo..','.....oGGoo.','.......oyoo','........oy.','.........o.']);
  } else {
    const top=y-10;
    stamp(g,x-2,top,['..o..','.oLo.','ogLGo','ogGGo','ogGGo','.oGo.','.oGo.','.ooo.','oyyyo','..b..','..o..']);
  }
  return g;
}
function cloak(action,f) {
  const g=canvas(),{dy}=pose(action,f),sit=action==='rest';
  const x=action==='walk'?[5,4,6,7][f]:7;
  stamp(g,x,(sit?22:16)+dy,['......ooo','....ooGGo','...ogGGGo','..ogGGGGo','.ogGgGGGo','ogGggGGGo','oggggGGGo','ogggggGGo','.ooogogoo','....ooo..']);
  return g;
}
function cat(action,f) {
  const g=canvas();
  if(action==='rest') {
    stamp(g,7,22,['....ooooooo..........','..oowwwffwwoo........','.owwwwwffwwwwo.oo....','owwwwwwwwwwwwwofwo...','owwfoowwwowwwwwfwo...','owwwwwpwwwwwwofwo....','.oowwwwwwwwwofwo.....','...oooooooooooo......']);
    stamp(g,5+(f%2),24,['oo','owo','owo','.oo']); return g;
  }
  const dy=action==='walk'?[ -1,0,-2,0][f]:[-6,-4,-2,0][f];
  const dx=action==='pounce'?[3,2,1,0][f]:0;
  stamp(g,6+dx,20+dy,['..ooooooo...','oowwwffwwoo.','owwwwffwwwwo','owwwwwwwwwwo','.owwwwwwwwo.','..oooooooo..']);
  stamp(g,16+dx,13+dy,['.oo....oo.','owwo..owwo','owpwooowpo','owwwffwwwo','owwwffwwwo','owwwwwwowo','.owwwwwwwwo','..owwwwppo.','...oooooo..']);
  stamp(g,4+dx,17+dy,['oo..','owo.','owo.','ofwo','.ofo','..oo']);
  const feet=action==='walk'&&f%2===0?27:28;
  stamp(g,8+dx,feet+dy,['owo...owo','owo...owo','oooo..oooo']);
  if(action==='pounce'&&f===0) stamp(g,22,21,['owwooo','oooooo']);
  return g;
}
function slime(action,f) {
  const g=canvas(),hit=action==='hit',dy=hit?0:[0,-3,-7,-3][f];
  const color=hit&&f===0?'w':'G';
  const rows=f===0&&!hit?['....oooooooooooo....','..ooGGGGGGGGGGGGoo..','.oGGccGGGGGGGGGGGGo.','oGGGccGGGGGGGGGGGGGo','oGGGoGGGGoGGGGGGGGGo','.oGGGGppGGGGGGGGGGo.','..oooooooooooooooo..']:
    ['.......oooo......','.....ooGGGGoo....','...ooGGGGGGGGoo..','..oGGccGGGGGGGGo.','.oGGGccGGGGGGGGGo','oGGGGGGGGGGGGGGGo','oGGoGGGGoGGGGGGGo','oGGGGGGGGGGGGGGGo','.oGGppGGGGGGGGGo.','..ooooooooooooo..'];
  stamp(g,hit&&f===1?8:6,31-rows.length+dy,rows.map(r=>r.replaceAll('G',color)));
  return g;
}
function guardian(action,f) {
  const g=canvas(),dy=action==='idle'?[0,-1,-2,-1][f]:f===0?-1:0;
  stamp(g,4,3+dy,['....oo......oo..........','...ogGo....ogGo.........','..ogGGGooooGGGGo........','.ogGGGGGGGGGGGGGo.......','ogGGggGGGGggGGGGGo......','.oooggooooooggGoo.......','...ohhhhhhhhhho.........','..ohccohhhccohho........','..ohYoohhhYoohho........','..ohhhhbhhhhhho.........','...ohhoooohhho..........','....ohbbbhhho...........']);
  // Three-quarter left-facing wooden brow/nose; the forward arm is at x=2.
  stamp(g,4,11+dy,['oohh','obho','oooo']);
  outline(g,9,15+dy,16,12,'h');
  stamp(g,11,16+dy,['gGghhbhhhgGG','gghhbbhhhggg','hhhhhbhhhhhh','hhhoccohhhhh','hhhoccohhhhh','hhhhbbhhhhhh','gghhhbhhhgGh']);
  stamp(g,2,16+dy,['..ooooo','.ohhbho','ohhbhho','ohhhooo','ohhho..','ooooo..']);
  stamp(g,24,16+dy,['ooooo..','ohhhho.','ohhbhho','.ohhbho','..ohhho','..ooooo']);
  outline(g,7,26+dy,9,5,'h');outline(g,19,26+dy,9,5,'h');
  box(g,8,29+dy,6,1,'g');box(g,20,29+dy,6,1,'g');
  if(action==='hit') {box(g,10,10+dy,3,1,f===0?'w':'o');box(g,18,10+dy,3,1,f===0?'w':'o');box(g,5,14,2,2,'p');}
  return g;
}
function chest(f) {
  const g=canvas();
  if(f>=2) {
    stamp(g,7,12,['..oooooooooooooooo..','.oybbbbbbbbbbbbyo...','oybhhhhhhhhhhhbyo...','oyyyyyyyyyyyyyyyo...','oooooooooooooooo....']);
    outline(g,7,21,20,4,'i');
    if(f===3) stamp(g,9,13,['....Y......Y....','Y...Y..Y...Y....','Y...Y..Y...Y..Y.','Y...Y..Y...Y..Y.','.Y..Y..Y..Y..Y..','.Y..Y..Y..Y..Y..','..Y.Y..Y..Y.Y...','..YYYYYYYYYYY...','...YYYYYYYYY....']);
  } else stamp(g,7+(f===1?1:0),18-(f===1?1:0),['..oooooooooooooo..','.oybbbbbbbbbbbbyo.','oybhhhhhhhhhhhhbyo','oybhhhhhhhhhhhhbyo','oyyyyyyyyyyyyyyyyo']);
  stamp(g,7,24,['oyhhhhhoYYohhhhhyo','oyhhhhhoYYohhhhhyo','oyhhhhhhoohhhhhhyo','oyhhhhhhhhhhhhhhyo','oyyyyyyyyyyyyyyyyo','.oooooooooooooooo.']);
  return g;
}
function spark(f) {
  const g=canvas(),r=[5,3,4,1][f],c=f===3?'p':'c';
  box(g,16-r,16,2*r+1,1,c);box(g,16,16-r,1,2*r+1,c);
  if(f!==3) stamp(g,15,15,['.Y.','YwY','.Y.']);return g;
}
function fire(f) {
  const g=canvas();
  stamp(g,8,27,['oo..........oo','ohhoooooooohho','.oobbbbbbbboo.','ohhoooooooohho','oo..........oo']);
  const tongues=[['......p.......','.....prp......','.....prrp.....','...pprrrp.....','..prrrrrrp....','.prrryyrrrp...','.prryYYyrrp...','..pryYYyrp....','...pyYYyp.....','....pppp......'],['........p.....','.......prp....','...p..prrp....','..prpprrrp....','..prrrrrrp....','.prrryrrrrp...','.prryYYrrrp...','..pryYYyrp....','...pyYYyp.....','....pppp......'],['....p.........','...prp........','...prrp.......','...prrrp.p....','..prrrrrprp...','.prrryyrrrp...','.prryYYyrrp...','..pryYYYrp....','...pyYYyp.....','....pppp......'],['.......p......','......prp.....','....pprrp.....','...prrrrp.....','..prrrrrrp....','.prrryyrrrp...','.prryYYyrrp...','..pryYYyrp....','...pyYYyp.....','....pppp......']];
  stamp(g,9,17,tongues[f]);return g;
}
function frog(f) {
  const g=canvas();
  stamp(g,9,21,['..ooo....ooo..','.oGcoooooGco.','ogGoGGGGGoGGo','ogGGGGGGGGGGo','.ogGGGGGGGGo.','..ooooooooo..']);
  outline(g,12,f===0?25:26,9,f===0?5:3,f===0?'L':'g');
  stamp(g,7,27,['.ooo.........ooo.','ogGGo.......ogGGo','oggGGo.....ogGggo','ooooooo...ooooooo']);return g;
}
function owl(f) {
  const g=canvas();
  stamp(g,8,9,['oo............oo','ohho........ohho','ohhhoooooooohhho','.ohhhhhhhhhhhho.','ohhffffhhffffhho','ohffwwffffwwffho','ohfwowffffwowfho','ohffwwffffwwffho','.ohffffyyffffho.','..ohhhhyyhhhho..','..ohhhhhhhhhho..','.ohbhhhffhhhbho.','.ohbbhffffhbbho.','.ohbbhffffhbbho.','..ohbhffffhbho..','...ohhffffhho...','....oooooooo....','....oyyooyyo....']);
  if(f%2===0) stamp(g,14,17,['oyyo','oyyo','.oo.']);
  stamp(g,6,28,['oooooooooooooooooooo','hbbbhhhhhbbbhhhhhbbo','oooooooooooooooooooo']);return g;
}
function firefly(f) {
  const g=canvas();
  if(f===0) stamp(g,11,12,['.....y.....','..y.....y..','...........','y.........y']);
  stamp(g,13,15,['cc...cc','.cco cc.'.replace(' ','.'),'..ooo..','..oyo..','..ooo..']);
  box(g,16,18,1,1,['Y','y','p','b'][f]);return g;
}
function leaves(f) {
  const g=canvas(),lean=[-2,0,2,0][f];
  for(let y=19;y<30;y++) box(g,15+Math.round(lean*(30-y)/11),y,1,1,'g');
  stamp(g,8+lean,19,['oGGGo.......','ogGGGo......','.oogGGo.....','...oooo.....']);
  stamp(g,16+lean,16,['....oGo','..ooGGo','.oGGGo.','ogGGo..','oooo...']);
  stamp(g,10,26,['oGGo....oGGo','.oGGo..oGGo.','..oGGoogGo..','...oooooo...']);return g;
}

export const SPRITES = {
  hero:Object.fromEntries(['walk','attack','rest','cheer'].map(a=>[a,frames(f=>hero(a,f))])),
  cat:Object.fromEntries(['walk','pounce','rest'].map(a=>[a,frames(f=>cat(a,f))])),
  slime:{bounce:frames(f=>slime('bounce',f)),hit:frames(f=>slime('hit',f),2)},
  guardian:{idle:frames(f=>guardian('idle',f)),hit:frames(f=>guardian('hit',f),2)},
  chest:{open:frames(chest)},spark:{twinkle:frames(spark)},fire:{burn:frames(fire)},
  frog:{croak:frames(frog)},owl:{hoot:frames(owl)},firefly:{glow:frames(firefly)},leaves:{sway:frames(leaves)}
};
export const SOUND_FRAMES = {
  'hero.walk':[0,2], 'hero.attack':[2], 'hero.cheer':[0,2], 'hero.rest':[0],
  'cat.walk':[1,3], 'cat.pounce':[0], 'slime.bounce':[0], 'guardian.idle':[0],
  'chest.open':[0,1,2,3], 'spark.twinkle':[0,2], 'fire.burn':[0,1,2,3],
  'frog.croak':[0], 'owl.hoot':[0,2], 'firefly.glow':[0], 'leaves.sway':[0,2]
};
export const EQUIPMENT_LAYERS = {
  'leaf-blade':{front:Object.fromEntries(Object.keys(SPRITES.hero).map(a=>[a,frames(f=>blade(a,f))]))},
  'moss-cloak':{back:Object.fromEntries(Object.keys(SPRITES.hero).map(a=>[a,frames(f=>cloak(a,f))]))}
};

// Horizontal runs are merged; grouping by ink avoids repeating fill attributes.
function symbol(id,grid) {
  const colors=new Map(),runs=[];let previous=new Map();
  grid.forEach((row,y)=>{
    const next=new Map();
    for(let x=0;x<32;) {
      const c=row[x],start=x;while(x<32&&row[x]===c)x++;
      if(c!=='.') {
        const key=`${c}:${start}:${x-start}`,old=previous.get(key);
        const run=old||{c,x:start,y,w:x-start,h:0};run.h++;
        if(!old) runs.push(run);next.set(key,run);
      }
    }
    previous=next;
  });
  for(const r of runs) colors.set(r.c,(colors.get(r.c)||'')+`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`);
  return `<symbol id="${id}" viewBox="0 0 32 32" shape-rendering="crispEdges">${[...colors].map(([c,r])=>`<g fill="${PALETTE[c]}">${r}</g>`).join('')}</symbol>`;
}
export function spriteSheet() {
  let result='';
  for(const [name,actions] of Object.entries(SPRITES)) for(const [action,grids] of Object.entries(actions)) grids.forEach((g,f)=>{result+=symbol(`px-${name}-${action}-${f}`,g);});
  for(const [item,layers] of Object.entries(EQUIPMENT_LAYERS)) for(const [layer,actions] of Object.entries(layers)) for(const [action,grids] of Object.entries(actions)) grids.forEach((g,f)=>{result+=symbol(`px-eq-${item}-${layer}-${action}-${f}`,g);});
  return result;
}
