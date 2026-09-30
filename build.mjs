import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {musicAssets} from './scripts/music-assets.mjs';
import {appIcon} from './scripts/app-icon.mjs';
let html=await readFile('web/index.html','utf8');
html=html.replace('/* EQUIPMENT_CSS */',await readFile('web/equipment.css','utf8'));
html=html.replace('/* EQUIPMENT_JS */',await readFile('web/equipment.js','utf8'));
const musicStart=html.indexOf('// A single beat clock;'),musicEnd=html.indexOf("$('sound').onclick",musicStart);
html=html.slice(0,musicStart)+(await readFile('web/music.js','utf8'))+'\n'+html.slice(musicEnd);
html=html.replace("if(music.playing&&music.ctx.state==='running')music.next=music.ctx.currentTime+.06;",'music.sync();');
html=html.replace('</head>','<link rel="manifest" href="/manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="/app-icon.svg"></head>');
html=html.replace('href="/app-icon.svg"','href="/apple-touch-icon.png"');
html=html.replace('場面に合わせて、音が重なる','場面の音楽は次のループで切替');
html=html.replace('<div class="volume">','<p class="equipment-note">画面を閉じても同じ曲を繰り返し再生。ロック画面から再生・停止できます。音量はiPhone本体でも調整できます。</p><div class="volume">');
html=html.replace("$('sound').onclick",(await readFile('web/navigation.js','utf8'))+"\n$('sound').onclick");
for(const zone of ['cave','castle']) {
 const svg=await readFile('web/'+zone+'.svg','utf8');
 html=html.replace('</style>',`.scene[data-zone=${zone}]{background-image:linear-gradient(to top,rgba(8,20,25,.75),transparent 65%),url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")}\n</style>`);
}
const game=(await readFile('server/game.mjs','utf8')).replaceAll('export ','');
const server=await readFile('server/worker.mjs','utf8');
const source='const PAGE='+JSON.stringify(html)+';\nconst ICON_PNG='+JSON.stringify(appIcon())+';\nconst AUDIO='+JSON.stringify(musicAssets())+';\n'+(await readFile('server/media.mjs','utf8'))+'\n'+game+'\n'+server;
await mkdir('worker',{recursive:true});await writeFile('worker/index.js',source);
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built SpaceBGM2 Worker');
