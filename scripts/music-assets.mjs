export function musicAssets(){
 const assets={};
 for(const [zone,bpm,roots] of [['forest',88,[64,60,62,59]],['cave',96,[57,53,55,52]],['castle',108,[62,58,60,57]]])for(const mood of ['travel','battle','treasure','boss']){
  const rate=16000,beat=60/bpm,length=Math.round(16*beat*rate),samples=new Float32Array(length);
  function tone(midi,start,duration,gain){const hz=440*2**((midi-69)/12);for(let n=0;n<duration*rate;n++){const t=n/rate,envelope=Math.min(1,t/.018)*Math.exp(-t/(duration*.26))*Math.min(1,(duration-t)/.035);samples[(Math.round(start*rate)+n)%length]+=Math.sin(t*hz*Math.PI*2)*envelope*gain;}}
  for(let i=0;i<32;i++){const root=roots[Math.floor(i/8)],chord=[root,root+3,root+7],time=i*beat/2;
   if(i%4===0)tone(root-24,time,beat*1.3,.28);
   if(i%8===0)chord.forEach(n=>tone(n,time,beat*3.6,.065));
   if(i%3===0||mood==='treasure')tone(chord[(i+Math.floor(i/8))%3]+12,time,beat*.85,.12);
   if((mood==='battle'||mood==='boss')&&i%2===0)tone(root-12,time,beat*.25,.1);
   if(mood==='boss'&&i%2===0)tone(chord[(i/2)%3|0],time,beat*.42,.12);
  }
  const wav=Buffer.alloc(44+length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*2,40);
  for(let n=0;n<length;n++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[n]))*24000),44+n*2);
  assets[zone+'-'+mood]=wav.toString('base64');
 }
 return assets;
}
