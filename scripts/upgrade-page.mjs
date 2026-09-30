import {readFile,writeFile} from 'node:fs/promises';
let html=await readFile('web/index.html','utf8');
if(!html.includes('id="inventory"')) {
 html=html.replace('</style>','/* EQUIPMENT_CSS */\n</style>');
 html=html.replace('<div class="bottom">','<section class="card equipment-card" aria-labelledby="equipmentTitle"><div class="card-header"><h2 id="equipmentTitle">旅の装備袋</h2><span class="caps" id="collection">0 / 6</span></div><p class="equipment-intro">拾った宝物を身につけて、もう一歩先へ。</p><div class="equipment-slots" id="equipmentSlots"></div><div class="inventory" id="inventory"></div><p class="equipment-note">宝箱・ボスから装備を発見。通常戦闘でも25％でドロップ。重複は星のかけらに変わります。</p></section><div class="bottom">');
 html=html.replace('<span>ボスに挑む目安</span>','<span>ボスの必要戦闘力</span>');
 html=html.replace('<button class="primary upgrade"','<div class="stats"><span>戦闘力</span><b id="power">—</b></div><button class="primary upgrade"');
 html=html.replace("'Lv.'+(z.level+1)","String(z.level+1)");
 html=html.replace(' drawProgress();',' renderEquipment();\n drawProgress();');
 html=html.replace('// A single beat clock;','/* EQUIPMENT_JS */\n// A single beat clock;');
 html=html.replace('試作版 0.1','試作版 0.2');
 html=html.replace("if(action.type==='train')toast", "if(action.type==='equip')toast('装備を付け替えた！ 戦闘力 '+d.combatPower);if(action.type==='unequip')toast('装備を外した。');if(action.type==='train')toast");
 html=html.replace("+'個を獲得。'", "+'個を獲得。'+(d.report.items?.length?' 新しい装備'+d.report.items.length+'点も装備袋に届いたよ。':'')");
 await writeFile('web/index.html',html);
}
