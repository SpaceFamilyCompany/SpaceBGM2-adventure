import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const html=await readFile('web/index.html','utf8');
const game=(await readFile('server/game.mjs','utf8')).replaceAll('export ','');
const server=await readFile('server/worker.mjs','utf8');
const source='const PAGE='+JSON.stringify(html)+';\n'+game+'\n'+server;
await mkdir('worker',{recursive:true});await writeFile('worker/index.js',source);
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built SpaceBGM2 Worker');
