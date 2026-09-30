import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {appIcon} from './scripts/app-icon.mjs';
import {PALETTE,EQUIPMENT_LAYERS} from './scripts/pixel-art.mjs';
import {CREATURE_SPRITES} from './scripts/creature-motion.mjs';
import {MONSTER_SPRITES} from './scripts/monsters.mjs';
import {STORY_SPRITES,heavenScene} from './scripts/story-art.mjs';
const SPRITES={...CREATURE_SPRITES,...MONSTER_SPRITES,...STORY_SPRITES};
import {LANES,THEMES,OBJECTS} from './scripts/forest-objects.mjs';
import {forestScene} from './scripts/forest-scene.mjs';

// 楽譜エンジンは画面（コマ番号）と Web Worker（音の合成）の両方で同じソースを使う。
const score=(await readFile('web/score.mjs','utf8')).replaceAll('export ','');
// 舞台の中身（何をどこに描くか）。画面だけで使う。import 行は外して楽譜エンジンの後ろにつなげる。
const scene=(await readFile('web/scene.mjs','utf8')).replace(/^import .*$/m,'').replaceAll('export ','');
// 背景オブジェクトの設定（絵のグリッドは除く）と、装備ごとの重ねレイヤー。
const world={LANES,THEMES,OBJECTS:Object.fromEntries(Object.entries(OBJECTS).map(([id,{frames,...o}])=>[id,o]))};
const equipLayers=Object.fromEntries(Object.entries(EQUIPMENT_LAYERS).map(([id,layers])=>[id,Object.keys(layers)]));

// ドット絵は文字のグリッドのまま渡し、画面側で1度だけ画像にする（毎フレームは貼るだけ）。
const grids={};
const grid=rows=>({w:rows[0].length,h:rows.length,d:rows.join('')});
for(const [sprite,actions] of Object.entries(SPRITES))for(const [action,frames] of Object.entries(actions))frames.forEach((rows,f)=>grids[`${sprite}-${action}-${f}`]=grid(rows));
for(const [item,layers] of Object.entries(EQUIPMENT_LAYERS))for(const [layer,actions] of Object.entries(layers))for(const [action,frames] of Object.entries(actions))frames.forEach((rows,f)=>grids[`eq:${item}-${layer}-${action}-${f}`]=grid(rows));
for(const [id,o] of Object.entries(OBJECTS))o.frames.forEach((rows,f)=>grids[`obj:${id}-${f}`]=grid(rows));
// 景色ごとの空（far）と地面（near）は、それぞれ1枚の SVG にして渡す。
const bg={};
for(const {id} of THEMES){const svg=forestScene(id);for(const layer of ['far','near']){const body=svg.match(new RegExp(`<g id="forest-${layer}">([\\s\\S]*?)</g>`))[1];bg[`${id}-${layer}`]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" shape-rendering="crispEdges">${body}</svg>`;}}
// プロローグの天の庭
{const heaven=heavenScene();for(const layer of ['far','near'])bg['heaven-'+layer]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" shape-rendering="crispEdges">${heaven[layer]}</svg>`;}
const art={palette:PALETTE,grids,bg};

const css=await readFile('web/app.css','utf8');
const app='const SCORE_SOURCE='+JSON.stringify(score)+';\nconst WORLD='+JSON.stringify(world)+';\nconst EQUIP_LAYERS='+JSON.stringify(equipLayers)+';\nconst ART='+JSON.stringify(art)+';\n'
 +(await readFile('web/app.js','utf8')).replace('/* SCORE_JS */',()=>score).replace('/* SCENE_JS */',()=>scene);
const html=(await readFile('web/page.html','utf8')).replace('/* APP_CSS */',()=>css).replace('/* APP_JS */',()=>app);

const game=(await readFile('server/game.mjs','utf8')).replaceAll('export ','');
const source='const PAGE='+JSON.stringify(html)+';\nconst ICON_PNG='+JSON.stringify(appIcon())+';\n'+(await readFile('server/store.mjs','utf8'))+'\n'+game+'\n'+(await readFile('server/worker.mjs','utf8'));
await mkdir('worker',{recursive:true});await writeFile('worker/index.js',source);
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built SpaceBGM Worker',(source.length/1024).toFixed(0)+'KB');
