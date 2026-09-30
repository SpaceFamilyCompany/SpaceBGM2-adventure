// PAGE and game engine are bundled by build.mjs.
const KEY='spacebgm2/owner-game-v1.json';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers});}
async function readGame(bucket,now){const object=await bucket.get(KEY);return {game:object?await object.json():initialGame(now),etag:object?.etag};}
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(url.pathname==='/')return new Response(PAGE,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
  if(url.pathname==='/favicon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#102527"/><path d="M16 4 19 12 28 16 19 19 16 28 12 19 4 16 12 12Z" fill="#b8ee91"/></svg>',{headers:{'Content-Type':'image/svg+xml'}});
  if(url.pathname!=='/api/game')return json({error:'Not found'},404);
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
  if(request.method==='POST') {
   if(request.headers.get('Origin')!==url.origin)return json({error:'このページから操作してください。'},403);
   if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'Invalid content type'},415);
  }
  if(!env.BUCKET)return json({error:'冒険の記録に接続できません。少し待ってから再試行してください。'},503);
  let action;
  if(request.method==='POST'){try {const text=await request.text();if(text.length>500)return json({error:'Request too large'},413);action=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}}
  try {
   for(let attempt=0;attempt<3;attempt++) {
    const now=Date.now();const {game:old,etag}=await readGame(env.BUCKET,now);
    const advanced=advanceGame(old,now);let game=advanced.game;
    if(action){try{game=applyAction(game,action,now);}catch(e){return json({error:e.message},400);}}
    if(!etag||action||game.lastAt!==old.lastAt){
     const stored=await env.BUCKET.put(KEY,JSON.stringify(game),{httpMetadata:{contentType:'application/json'},onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'}});
     if(!stored)continue;
    }
    return json(publicGame(game,now,advanced.report));
   }
   return json({error:'ほかの画面で更新されました。もう一度操作してください。'},409);
  } catch(e) {console.error('Game persistence unavailable',e?.message);return json({error:'冒険の記録を読み込めませんでした。再試行してください。'},503);}
 }
};
