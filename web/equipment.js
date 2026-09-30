let equipmentRenderKey='';
function renderEquipment(){
 const g=snapshot.game,items=snapshot.equipmentCatalog;
 $('power').textContent=snapshot.combatPower;
 $('powerBreakdown').textContent='Lv.'+g.level+' ＋ 装備'+snapshot.equipmentPower;
 $('collection').textContent=g.inventory.length+' / '+items.length;
 const best=['weapon','armor'].map(slot=>items.filter(i=>i.slot===slot&&g.inventory.includes(i.id)).sort((a,b)=>b.power-a.power)[0]);
 const canImprove=best.some(item=>item&&g.equipment[item.slot]!==item.id);
 $('equipBest').disabled=busy||!canImprove;
 $('equipBest').textContent=canImprove?'おすすめを装備':g.inventory.length?'おすすめを装備中':'冒険で装備を見つけよう';
 $('equipBest').onclick=()=>command({type:'equipBest'}).catch(()=>{});
 const key=JSON.stringify([g.inventory,g.equipment,busy]);if(key===equipmentRenderKey)return;equipmentRenderKey=key;
 $('equipmentSlots').replaceChildren();
 for(const [slot,label] of [['weapon','武器'],['armor','防具']]){
  const item=items.find(i=>i.id===g.equipment[slot]),row=document.createElement('div');row.className='equipment-slot';
  const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small');
  meta.textContent=label+(item?' · ＋'+item.power:'');name.textContent=item?item.icon+' '+item.name:'まだ装備なし';info.append(meta,name);row.append(info);
  if(item){const b=document.createElement('button');b.textContent='外す';b.disabled=busy;b.setAttribute('aria-label',item.name+'を外す');b.onclick=()=>command({type:'unequip',slot}).catch(()=>{});row.append(b);}
  $('equipmentSlots').append(row);
 }
 $('inventory').replaceChildren();$('undiscovered').replaceChildren();$('undiscoveredCount').textContent=items.length-g.inventory.length+'点';
 if(!g.inventory.length){const p=document.createElement('p');p.className='empty-state';p.textContent='宝箱を見つけると、ここに装備が届きます。';$('inventory').append(p);}
 for(const item of items){
  const owned=g.inventory.includes(item.id),equipped=g.equipment[item.slot]===item.id,current=items.find(i=>i.id===g.equipment[item.slot]),diff=item.power-(current?.power||0);
  const card=document.createElement('div');card.className='equipment-item'+(equipped?' equipped':'')+(owned?'':' undiscovered');
  const icon=document.createElement('span');icon.className='item-icon';icon.textContent=owned?item.icon:'◇';
  const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small');
  name.textContent=owned?item.name:'未発見の'+(item.slot==='weapon'?'武器':'防具');
  meta.textContent=owned?'戦闘力 ＋'+item.power+(equipped?' · 装備中':diff?' · 今より'+(diff>0?'＋':'')+diff:''):snapshot.zones.find(z=>z.id===item.zone).name;
  info.append(name,meta);card.append(icon,info);
  if(owned&&!equipped){const b=document.createElement('button');b.textContent='装備';b.disabled=busy;b.setAttribute('aria-label',item.name+'を装備する');b.onclick=()=>command({type:'equip',itemId:item.id}).catch(()=>{});card.append(b);}
  $(owned?'inventory':'undiscovered').append(card);
 }
}
