// Cloudflare版の保存先。Durable Object 1つにセーブを1件だけ持ち、R2と同じETag条件付き書き込みを提供する。
export class GameStore {
 constructor(state){this.storage=state.storage;}
 async fetch(request){
  const saved=await this.storage.get('save');
  if(request.method==='GET')return Response.json(saved??null);
  const {body,onlyIf}=await request.json();
  if(onlyIf.etagMatches?saved?.etag!==onlyIf.etagMatches:saved)return Response.json(null);
  const etag=String((Number(saved?.etag)||0)+1);
  await this.storage.put('save',{body,etag});return Response.json({etag});
 }
}
// worker.mjs からは R2 の BUCKET と同じ get/put で使う。
function durableBucket(namespace){
 const stub=namespace.get(namespace.idFromName('owner'));
 const call=async init=>(await stub.fetch('https://game-store/',init)).json();
 return {
  async get(){const saved=await call();return saved&&{etag:saved.etag,json:async()=>JSON.parse(saved.body)};},
  async put(key,body,options){return call({method:'POST',body:JSON.stringify({body,onlyIf:options.onlyIf??{}})});}
 };
}
