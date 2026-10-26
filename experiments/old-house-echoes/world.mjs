// Original rooms and props. All coordinates are world metres on a fixed floor plane.
export const VERSION='echoes-slice-1';
export const CAPACITY=6;
export const ITEMS=Object.freeze({
 pistol:{name:'救援信号枪',short:'枪',description:'改装为低冲击镇止弹。占一格，弹仓最多4发；举枪时只能转向，不能移动。'},
 rounds:{name:'镇止弹盒',short:'弹',description:'共5发。与信号枪组合装填；弹盒里的余弹占一格，空盒自动收起。'},
 herb:{name:'清凉药叶',short:'叶',description:'使用可恢复25体力；与净布组合成敷包，可恢复60，也可照料失联者。'},
 cloth:{name:'净布',short:'布',description:'与清凉药叶组合成敷包。单独不能治疗失联者。'},
 kit:{name:'清凉敷包',short:'药',description:'药叶与净布制成；自己使用恢复60，或留给失联者。'},
 flare:{name:'撤离信标',short:'标',description:'找到失联者后，带回门厅南侧发射座使用。它占一格，提前存放意味着撤离前还要取回。'},
 key:{name:'黄铜馆钥',short:'钥',description:'钥柄上有可翻开的铭牌。请检查；用过的钥匙仍占格，可寄存值班室。'},
 fuse:{name:'断脚熔芯',short:'芯',description:'陶瓷芯完好，缺少导线。与温室的绝缘线组合后可以修复档案室电柜。'},
 wire:{name:'绝缘线',short:'线',description:'给熔芯补上引脚的导线。与断脚熔芯组合。'},
 repaired:{name:'修复熔芯',short:'电',description:'在档案室北侧电柜旁使用，恢复撤离前室门锁。'}
});
const door=(id,x,y,to,tx,ty,label,lock)=>({id,x,y,to,tx,ty,label,lock});
const prop=(id,x,y,label,kind,item)=>({id,x,y,label,kind,item});
export const ROOMS={
 hall:{name:'雨檐门厅',subtitle:'雨水敲着封住的正门。南侧发射座还在。',tint:'#77766a',floor:'stone',
  walls:[],obstacles:[[4,4,3,1.5],[13,4,3,1.5]],doors:[door('hall-corridor',10,1.5,'corridor',10,11.4,'北 · 肖像回廊'),door('hall-duty',1.5,7,'duty',17.4,7,'西 · 值班室'),door('hall-greenhouse',18.5,7,'greenhouse',2.5,10,'东 · 玻璃温室')],
  props:[prop('hall-note',8,4,'湿页留言','note'),prop('beacon',10,11,'南门发射座','beacon')]},
 duty:{name:'灯下值班室',subtitle:'这里没有回声。铁柜可以寄存，记事台可留下重试点。',tint:'#7c735b',floor:'wood',
  walls:[],obstacles:[[3,3,4,1.5],[3,9,4,1.5]],doors:[door('duty-hall',18.5,7,'hall',2.6,7,'东 · 雨檐门厅'),door('duty-loop',10,1.5,'greenhouse',10,10.8,'北 · 温室内闩','loop')],
  props:[prop('box',5,7,'寄存铁柜','box'),prop('desk',10,5,'记事台 · 记录重试点','checkpoint')]},
 corridor:{name:'肖像回廊',subtitle:'窄廊里有一具覆灰的巡馆偶。可射停，也可引入壁龛后绕过。',tint:'#655c52',floor:'runner',
  walls:[[1,1,7,6],[12,1,7,6],[1,10,7,3],[12,10,7,3]],obstacles:[],doors:[door('corridor-hall',10,12,'hall',10,2.7,'南 · 雨檐门厅'),door('corridor-library',10,1.5,'library',10,11.3,'北 · 寂声阅览室')],props:[]},
 library:{name:'寂声阅览室',subtitle:'纸页上标着温室内闩与电柜。长桌后的钥匙仍在。',tint:'#6b715f',floor:'wood',
  walls:[],obstacles:[[4,5.5,4,2],[12,3,3,1.5],[12,10,4,1.2]],doors:[door('library-corridor',10,12,'corridor',10,2.7,'南 · 肖像回廊'),door('library-greenhouse',1.5,7,'greenhouse',17.3,3,'西 · 玻璃温室'),door('library-archive',18.5,7,'archive',2.7,7,'东 · 密签档案室','archive')],
  props:[prop('key',9.6,3.8,'黄铜馆钥','pickup','key'),prop('library-note',6,3,'旧馆导览图','note')]},
 greenhouse:{name:'玻璃温室',subtitle:'绕行路线较远；中央花台必须绕过。南边内闩可通往铁柜。',tint:'#596e69',floor:'glass',
  walls:[],obstacles:[[7,4,6,4.3],[3,3,2,3],[14.5,8,2.5,2]],doors:[door('greenhouse-hall',1.5,10,'hall',17.3,7,'西南 · 雨檐门厅'),door('greenhouse-library',18.5,3,'library',2.7,7,'东北 · 寂声阅览室'),door('greenhouse-loop',10,12,'duty',10,2.7,'南 · 开内闩，通值班室','loop')],
  props:[prop('wire',4.5,10.5,'绝缘线','pickup','wire'),prop('greenhouse-note',5,10,'温室便签','note')]},
 archive:{name:'密签档案室',subtitle:'失联者留下了位置。北侧电柜的熔芯断了脚。',tint:'#6b6671',floor:'stone',
  walls:[],obstacles:[[6,4,2.5,5],[13,8,3,2]],doors:[door('archive-library',1.5,7,'library',17.3,7,'西 · 寂声阅览室'),door('archive-station',10,1.5,'station',10,11.3,'北 · 撤离前室','power')],
  props:[prop('fuse',12,5,'断脚熔芯','pickup','fuse'),prop('panel',10,3,'北侧电柜','panel'),prop('archive-note',15.5,5,'失联者的录音抄页','note')]},
 station:{name:'风口前室',subtitle:'阿遥就在风口后。照料她，再一同回门厅发出信标。',tint:'#657582',floor:'stone',
  walls:[],obstacles:[[3,3,3.5,2],[13,4,3,2]],doors:[door('station-archive',10,12,'archive',10,2.7,'南 · 密签档案室')],props:[prop('patient',10,4,'失联者 · 阿遥','patient')]}
};
export const NOTES={
 'hall-note':'阿遥：我去北侧查漏。若无线电再没回应，请到档案室找我留下的抄页。信标要在门厅南座发射。别把敷包都用在自己身上。',
 'library-note':'馆钥在长桌北端，检查钥柄铭牌再使用。回廊最短，但巡馆偶会走向最后看见你的位置；温室绕路不耗弹。温室南侧的内闩能打开值班室回环。档案室电柜需要熔芯和导线。',
 'greenhouse-note':'内闩只可从温室打开。值班室有补充药叶与净布。六格装不下所有东西，钥匙用完可以寄存；撤离时记得取回信标。',
 'archive-note':'阿遥：前室门被断电锁住了。我还能走，但要先包扎。修复熔芯装回北电柜，带我回门厅。温室的线卷能补引脚。'
};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function walkable(room,x,y,r=.26){
 if(x<1.15+r||x>18.85-r||y<1.15+r||y>12.85-r)return false;
 return ![...ROOMS[room].walls,...ROOMS[room].obstacles].some(([a,b,w,h])=>x+r>a&&x-r<a+w&&y+r>b&&y-r<b+h);
}
