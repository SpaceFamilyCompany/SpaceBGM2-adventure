// エリアの楽譜（1枚の長いスクロール絵）を書き出す。
// node scripts/make-area.mjs → areas/forest.json
// エリアのファイルだけを差し替えれば、同じエンジンで別の景色・別の曲の並びを遊べる（配布の単位）。
import {writeFile,mkdir} from 'node:fs/promises';
import * as world from './forest-objects.mjs';
import {layoutArea} from '../web/score.mjs';

const area=layoutArea(world,'forest');
await mkdir('areas',{recursive:true});
await writeFile('areas/forest.json',JSON.stringify(area,null,1)+'\n');
console.log('areas/forest.json',Object.entries(area.lanes).map(([lane,l])=>`${lane} ${l.objects.length}`).join(' / '));
