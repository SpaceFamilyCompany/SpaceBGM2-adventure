import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile('web/navigation.js','utf8');
function setup(){
 const handlers={};const element=()=>({children:[],attrs:{},classList:{add(){}},setAttribute(k,v){this.attrs[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},addEventListener(name,fn){handlers[name]=fn;},focus(){}});
 const main=element(),nav=element(),panels=[element(),element(),element()];main.children=[nav,...panels];
 const map={main,'.screen-nav':nav,...Object.fromEntries(panels.map((p,i)=>['#screen-panel-'+i,p]))};
 const document={querySelector:s=>map[s],createElement:element};vm.runInNewContext(source,{document,innerWidth:390});
 const selected=()=>main.children[0].children.findIndex(b=>b.attrs['aria-selected']==='true');
 const touch=(type,x,y,control=false,count=1)=>handlers[type]({touches:Array.from({length:count},()=>({clientX:x,clientY:y})),changedTouches:[{clientX:x,clientY:y}],target:{closest:()=>control}});
 return {main,handlers,selected,touch};
}
test('horizontal swipes change panels, stop at edges, and reverse',()=>{const s=setup();assert.equal(s.selected(),0);for(const expected of [1,2,2]){s.touch('touchstart',300,250);s.touch('touchend',100,255);assert.equal(s.selected(),expected);}s.touch('touchstart',100,250);s.touch('touchend',300,255);assert.equal(s.selected(),1);});
test('vertical scrolling, sliders, edge gestures and short drags do not switch screens',()=>{const s=setup();s.touch('touchstart',300,250);s.touch('touchmove',200,320);s.touch('touchend',100,325);assert.equal(s.selected(),0);s.touch('touchstart',300,250,true);s.touch('touchend',100,255);assert.equal(s.selected(),0);s.touch('touchstart',10,250);s.touch('touchend',200,255);assert.equal(s.selected(),0);s.touch('touchstart',200,250);s.touch('touchend',170,255);assert.equal(s.selected(),0);});
test('tabs support keyboard navigation and one visible panel',()=>{const s=setup();s.handlers.keydown({key:'End',preventDefault(){}});assert.equal(s.selected(),2);assert.equal(s.main.children.slice(1).filter(p=>!p.hidden).length,1);s.handlers.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(s.selected(),0);});
