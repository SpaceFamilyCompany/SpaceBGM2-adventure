import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {musicAssets} from './scripts/music-assets.mjs';
import {appIcon} from './scripts/app-icon.mjs';
import {characterSheet} from './scripts/pixel-characters.mjs';
let html=await readFile('web/page.html','utf8');
let css=await readFile('web/app.css','utf8');
let app=await readFile('web/app.js','utf8');
for(const [marker,path] of [['EQUIPMENT_JS','equipment.js'],['MUSIC_JS','music.js'],['NAVIGATION_JS','navigation.js'],['CHARACTERS_JS','characters.js']])app=app.replace('/* '+marker+' */',await readFile('web/'+path,'utf8'));
for(const zone of ['forest','cave','castle']){
 const asset=await readFile('web/'+zone+(zone==='forest'?'.webp':'.svg'));
 css+=`.scene[data-zone=${zone}]{background-image:linear-gradient(to bottom,#0915229c,transparent 45%,#091522c9),url("data:image/${zone==='forest'?'webp':'svg+xml'};base64,${asset.toString('base64')}")}\n`;
}
css+=await readFile('web/characters.css','utf8');
html=html.replace('/* APP_CSS */',css).replace('/* APP_JS */',app).replace('<!-- CHARACTER_SHEET -->',characterSheet());
const game=(await readFile('server/game.mjs','utf8')).replaceAll('export ','');
const server=await readFile('server/worker.mjs','utf8');
const source='const PAGE='+JSON.stringify(html)+';\nconst ICON_PNG='+JSON.stringify(appIcon())+';\nconst AUDIO='+JSON.stringify(musicAssets())+';\n'+(await readFile('server/media.mjs','utf8'))+'\n'+game+'\n'+server;
await mkdir('worker',{recursive:true});await writeFile('worker/index.js',source);
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built SpaceBGM2 Worker');
