const screenNames=['ダンジョン','ステータス','装備'];
const main=document.querySelector('main'),layout=document.querySelector('.layout'),sidebar=document.querySelector('.right');
const screenPanels=[document.createElement('section'),document.createElement('section'),document.querySelector('.equipment-card')];
screenPanels[0].append(layout);
screenPanels[1].append(sidebar.lastElementChild,document.querySelector('.bottom'));
const screenNav=document.createElement('nav');screenNav.className='screen-nav';screenNav.setAttribute('aria-label','冒険の画面');screenNav.setAttribute('role','tablist');
const screenButtons=screenNames.map((name,index)=>{
 const button=document.createElement('button');button.textContent=name;button.id='screen-tab-'+index;button.setAttribute('role','tab');button.setAttribute('aria-controls','screen-panel-'+index);button.onclick=()=>selectScreen(index);screenNav.append(button);
 const panel=screenPanels[index];panel.id='screen-panel-'+index;panel.classList.add('screen-panel');panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
 return button;
});
main.replaceChildren(screenNav,...screenPanels);
let currentScreen=0;
function selectScreen(index,focus=false){
 currentScreen=Math.max(0,Math.min(2,index));
 screenPanels.forEach((panel,i)=>{panel.hidden=i!==currentScreen;screenButtons[i].setAttribute('aria-selected',String(i===currentScreen));screenButtons[i].tabIndex=i===currentScreen?0:-1;});
 if(focus)screenButtons[currentScreen].focus();
}
screenNav.addEventListener('keydown',event=>{
 const index=event.key==='ArrowRight'?(currentScreen+1)%3:event.key==='ArrowLeft'?(currentScreen+2)%3:event.key==='Home'?0:event.key==='End'?2:null;
 if(index!==null){event.preventDefault();selectScreen(index,true);}
});
let swipeStart=null;
main.addEventListener('touchstart',event=>{
 swipeStart=null;
 if(event.touches.length!==1||event.target.closest('button,input,a,select,textarea'))return;
 const touch=event.touches[0];
 if(touch.clientX<24||touch.clientX>innerWidth-24)return;
 swipeStart={x:touch.clientX,y:touch.clientY};
},{passive:true});
main.addEventListener('touchmove',event=>{
 if(!swipeStart)return;
 if(event.touches.length!==1||Math.abs(event.touches[0].clientY-swipeStart.y)>30)swipeStart=null;
},{passive:true});
main.addEventListener('touchend',event=>{
 if(!swipeStart)return;
 const start=swipeStart;swipeStart=null;const touch=event.changedTouches[0];
 const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
 if(Math.abs(dx)>=65&&Math.abs(dx)>Math.abs(dy)*1.8)selectScreen(currentScreen+(dx<0?1:-1));
},{passive:true});
main.addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
selectScreen(0);
