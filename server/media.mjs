const mediaCache=new Map();
function musicResponse(request,key){
 if(!Object.hasOwn(AUDIO,key))return new Response('Not found',{status:404});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
 let bytes=mediaCache.get(key);if(!bytes){bytes=Uint8Array.from(atob(AUDIO[key]),c=>c.charCodeAt(0));mediaCache.set(key,bytes);}
 const headers={'Content-Type':'audio/wav','Accept-Ranges':'bytes','Cache-Control':'private, max-age=86400'};
 const range=request.headers.get('Range');let start=0,end=bytes.length-1,status=200;
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+bytes.length}});
  if(!match[1])start=Math.max(0,bytes.length-Number(match[2]));else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
  if(start>end||start>=bytes.length)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+bytes.length}});
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;
 }
 headers['Content-Length']=String(end-start+1);return new Response(request.method==='HEAD'?null:bytes.slice(start,end+1),{status,headers});
}
const APP_ICON='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#102527"/><path d="m256 64 48 128 144 64-144 48-48 144-64-144-128-48 128-64Z" fill="#c0ee97"/></svg>';
