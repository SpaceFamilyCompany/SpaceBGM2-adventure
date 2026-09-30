import http from 'node:http';
import worker from '../dist/server/index.js';
import {initialGame,EQUIPMENT} from '../server/game.mjs';
const port=Number(process.argv[2]||4318);
const sample=initialGame();sample.level=5;sample.coins=500;sample.clears.forest=1;sample.clears.cave=1;sample.inventory=EQUIPMENT.map(i=>i.id);sample.running=false;
const bucket={body:JSON.stringify(sample),revision:1,async get(){return {etag:String(this.revision),json:async()=>JSON.parse(this.body)};},async put(key,body,options){if(options.onlyIf.etagMatches!==String(this.revision))return null;this.body=body;return {etag:String(++this.revision)};}};
http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const response=await worker.fetch(new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}),{BUCKET:bucket});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end(error.message);}}).listen(port,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:'+port+' — local sample save only'));
