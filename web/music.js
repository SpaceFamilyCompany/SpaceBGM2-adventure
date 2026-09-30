// One native media element owns all playback, including while JavaScript is suspended.
const music={audio:new Audio(),playing:false,bpm:88,targetBpm:88,mood:'travel',zone:'forest',targetZone:'forest',track:'',previousTime:0,
 desired(){return this.targetZone+'-'+this.mood;},
 metadata(){if('mediaSession' in navigator&&'MediaMetadata' in window)navigator.mediaSession.metadata=new MediaMetadata({title:($('zoneName')?.textContent||'音の冒険')+' · '+(labels[this.mood]||'探索'),artist:'SpaceBGM2',album:'音の冒険'});},
 setTrack(){this.track=this.desired();this.zone=this.targetZone;this.bpm=this.targetBpm;this.audio.src='/music/'+this.track+'.wav';this.previousTime=0;this.metadata();},
 sync(){this.playing=!this.audio.paused;$('sound').textContent=this.playing?'音楽を止める':'音楽を再生';$('sound').setAttribute('aria-pressed',String(this.playing));$('music').dataset.playing=String(this.playing);if('mediaSession' in navigator)navigator.mediaSession.playbackState=this.playing?'playing':'paused';},
 async play(){try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}try{if(!this.track||this.track!==this.desired())this.setTrack();this.volume();await this.audio.play();}catch{toast('音楽を再生できませんでした。再生ボタンでもう一度お試しください。');}this.sync();},
 pause(){this.audio.pause();this.sync();},
 toggle(){if(this.audio.paused)return this.play();this.pause();},
 volume(){this.audio.volume=Number($('volume').value)/100;}
};
music.audio.loop=true;music.audio.preload='none';music.audio.setAttribute('playsinline','');
music.audio.addEventListener('play',()=>music.sync());music.audio.addEventListener('pause',()=>music.sync());
music.audio.addEventListener('error',()=>{music.pause();toast('音楽の読み込みに失敗しました。接続を確認して再生してください。');});
music.audio.addEventListener('timeupdate',()=>{
 const t=music.audio.currentTime,wrapped=t<music.previousTime;
 music.previousTime=t;
 if(!document.hidden&&wrapped&&!music.audio.paused&&music.desired()!==music.track){music.setTrack();music.audio.play().catch(()=>{music.sync();toast('新しい曲を再生するには音楽の再生ボタンを押してください。');});}
});
if('mediaSession' in navigator){for(const [action,handler] of [['play',()=>music.play()],['pause',()=>music.pause()],['stop',()=>music.pause()]]){try{navigator.mediaSession.setActionHandler(action,handler);}catch{}}}
