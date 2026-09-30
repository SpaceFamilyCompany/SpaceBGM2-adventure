import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {appIcon} from './scripts/app-icon.mjs';
import {spriteSheet,EQUIPMENT_LAYERS} from './scripts/pixel-art.mjs';
import {objectSheet,LANES,THEMES,OBJECTS} from './scripts/forest-objects.mjs';
import {forestScene} from './scripts/forest-scene.mjs';

// 楽譜エンジンは画面（コマ番号）と Web Worker（音の合成）の両方で同じソースを使う。
const score=(await readFile('web/score.mjs','utf8')).replaceAll('export ','');
// 背景オブジェクトの設定（絵のグリッドは除く）と、装備ごとの重ねレイヤー。
const world={LANES,THEMES,OBJECTS:Object.fromEntries(Object.entries(OBJECTS).map(([id,{frames,...o}])=>[id,o]))};
const equipLayers=Object.fromEntries(Object.entries(EQUIPMENT_LAYERS).map(([id,layers])=>[id,Object.keys(layers)]));
// 景色ごとの土台（空の層・地面の層）を、横に並べてスクロールできる symbol にする。
const backgrounds=THEMES.map(({id})=>{const svg=forestScene(id);return ['far','near'].map(layer=>{const body=svg.match(new RegExp(`<g id="forest-${layer}">([\\s\\S]*?)</g>`))[1];return `<symbol id="bg-${id}-${layer}" viewBox="0 0 320 180" preserveAspectRatio="none" shape-rendering="crispEdges">${body}</symbol>`;}).join('');}).join('');
const sheet='<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>'+backgrounds+spriteSheet()+objectSheet()+'</defs></svg>';

const css=await readFile('web/app.css','utf8');
const app='const SCORE_SOURCE='+JSON.stringify(score)+';\nconst WORLD='+JSON.stringify(world)+';\nconst EQUIP_LAYERS='+JSON.stringify(equipLayers)+';\n'
 +(await readFile('web/app.js','utf8')).replace('/* SCORE_JS */',()=>score);
const html=(await readFile('web/page.html','utf8')).replace('/* APP_CSS */',()=>css).replace('/* APP_JS */',()=>app).replace('<!-- SPRITE_SHEET -->',()=>sheet);

const game=(await readFile('server/game.mjs','utf8')).replaceAll('export ','');
const source='const PAGE='+JSON.stringify(html)+';\nconst ICON_PNG='+JSON.stringify(appIcon())+';\n'+(await readFile('server/store.mjs','utf8'))+'\n'+game+'\n'+(await readFile('server/worker.mjs','utf8'));
await mkdir('worker',{recursive:true});await writeFile('worker/index.js',source);
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built SpaceBGM Worker',(source.length/1024).toFixed(0)+'KB');
