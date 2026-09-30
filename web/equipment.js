let equipmentRenderKey='';
function renderEquipment(){
 const g=snapshot.game,items=snapshot.equipmentCatalog;
 $('power').textContent=snapshot.combatPower+'（Lv.'+g.level+' ＋ 装備'+snapshot.equipmentPower+'）';
 $('collection').textContent=g.inventory.length+' / '+items.length;
 const key=JSON.stringify([g.inventory,g.equipment,busy]);
 if(key===equipmentRenderKey)return;
 equipmentRenderKey=key;
 $('equipmentSlots').replaceChildren();
 for(const [slot,label] of [['weapon','武器'],['armor','防具']]){
  const item=items.find(i=>i.id===g.equipment[slot]);
  const row=document.createElement('div');row.className='equipment-slot';
  const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small');
  name.textContent=item?item.icon+' '+item.name:label+'なし';meta.textContent=label+' · 戦闘力 ＋'+(item?.power||0);
  info.append(name,meta);row.append(info);
  if(item){const b=document.createElement('button');b.textContent='外す';b.className='small';b.disabled=busy;b.setAttribute('aria-label',item.name+'を外す');b.onclick=()=>command({type:'unequip',slot}).catch(()=>{});row.append(b);}
  $('equipmentSlots').append(row);
 }
 $('inventory').replaceChildren();
 for(const item of items){
  const owned=g.inventory.includes(item.id),equipped=g.equipment[item.slot]===item.id;
  const card=document.createElement('div');card.className='equipment-item'+(owned?'':' undiscovered');card.dataset.zone=item.zone;
  const icon=document.createElement('span');icon.className='item-icon';icon.textContent=owned?item.icon:'◇';
  const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small');
  name.textContent=owned?item.name:'未発見の'+(item.slot==='weapon'?'武器':'防具');
  meta.textContent=owned?item.rarity+' · 戦闘力 ＋'+item.power:snapshot.zones.find(z=>z.id===item.zone).name+'で発見';
  info.append(name,meta);card.append(icon,info);
  if(owned){const b=document.createElement('button');b.textContent=equipped?'装備中':'装備する';b.className=equipped?'small':'primary small';b.disabled=busy||equipped;b.setAttribute('aria-label',item.name+'を'+(equipped?'装備中':'装備する'));b.onclick=()=>command({type:'equip',itemId:item.id}).catch(()=>{});card.append(b);}
  $('inventory').append(card);
 }
}
