function drawPixel(element,kind){
 if(element.dataset.character===kind)return;
 element.dataset.character=kind;element.classList.add('pixel-character');
 element.replaceChildren();
 for(let frame=0;frame<2;frame++){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 26');svg.setAttribute('aria-hidden','true');svg.classList.add('pixel-frame','pixel-frame-'+frame);
  const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#pixel-'+kind+'-'+frame);svg.append(use);element.append(svg);
 }
}
function renderCharacters(g,event){
 document.querySelectorAll('[data-pixel=hero]').forEach(el=>drawPixel(el,'hero'));
 document.querySelectorAll('[data-pixel=cat]').forEach(el=>drawPixel(el,'cat'));
 drawPixel($('enemy'),!g.running?'fire':event==='boss'?'boss':event==='treasure'?'chest':event==='battle'?(g.zone==='forest'?'slime':g.zone==='cave'?'bat':'ghost'):'spark');
}
