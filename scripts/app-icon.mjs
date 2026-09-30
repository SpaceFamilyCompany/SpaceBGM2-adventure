import {deflateSync} from 'node:zlib';
export function appIcon(){
 const size=180,raw=Buffer.alloc((size*4+1)*size);
 const polygon=[[90,23],[107,68],[158,90],[107,107],[90,158],[68,107],[23,90],[68,68]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}
  const offset=y*(size*4+1)+1+x*4;raw.set(inside?[192,238,151,255]:[16,37,39,255],offset);
 }
 function chunk(type,data){const name=Buffer.from(type),input=Buffer.concat([name,data]);let crc=0xffffffff;for(const byte of input){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
