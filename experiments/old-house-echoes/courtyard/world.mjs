// Original second chapter. Floor coordinates share the first chapter's 20 x 14 metre convention.
export const VERSION='echoes-courtyard-1';
export const CAPACITY=6;
export const ITEMS=Object.freeze({
 badge:{name:'旧馆值守章',short:'章',slots:1,description:'章背刻着庭院档案翼的压印方向。检查后与拓片组合。'},
 sleeve:{name:'防潮套',short:'套',slots:1,description:'档案册离开干燥室之前，需和防潮套组合。'},
 pistol:{name:'救援信号枪',short:'枪',slots:1,description:'低冲击镇止弹；弹仓最多四发。举枪停步，方向调整朝向。'},
 rounds:{name:'镇止弹盒',short:'弹',slots:1,description:'备用三发，与枪组合装填。子弹不会恢复。'},
 herb:{name:'清凉药叶',short:'叶',slots:1,description:'自己使用恢复25体力；可与净布合成敷包。'},
 cloth:{name:'净布',short:'布',slots:1,description:'与药叶合成敷包，占用的一格便可空出。'},
 kit:{name:'清凉敷包',short:'药',slots:1,description:'自己使用恢复60体力。带药会挤占档案的携带空间。'},
 rubbing:{name:'压印拓片',short:'拓',slots:1,description:'与检查过的值守章组合，辨认档案翼的柜号。'},
 marked:{name:'对号值守章',short:'号',slots:1,description:'在档案翼北侧的干燥室门使用。'},
 ledger:{name:'潮湿调度册',short:'册',slots:2,description:'占两格。与防潮套组合，才能带回庭院交给接应者。'},
 wrapped:{name:'封好的调度册',short:'封',slots:1,description:'在庭院南侧接应台交付；防潮套使它只占一格。'}
});
const door=(id,x,y,to,tx,ty,label,lock)=>({id,x,y,to,tx,ty,label,lock});
const prop=(id,x,y,label,kind,item)=>({id,x,y,label,kind,item});
export const ROOMS={
 yard:{name:'雨后庭院',subtitle:'接应台旁有补给铁柜。决定带什么再出门。',tint:'#647475',floor:'flagstone',obstacles:[[3,4,4,1.4],[13,8,3,1.2]],doors:[door('yard-corridor',10,1.5,'corridor',10,11.4,'北 · 石廊'),door('yard-garden',18.5,7,'garden',2.6,7,'东 · 花架小径'),door('yard-pump',1.5,7,'pump',17.3,7,'西 · 排水间内闩','loop')],props:[prop('box',5,7,'补给铁柜','box'),prop('desk',7,3.5,'巡查记录台','checkpoint'),prop('exit',10,11,'南 · 接应台','exit'),prop('yard-note',14,4,'庭院便条','note')]},
 corridor:{name:'石廊',subtitle:'巡馆偶守着短路。清理它会让往返更直接。',tint:'#626a68',floor:'runner',obstacles:[],walls:[[1,1,7,6],[12,1,7,6],[1,10,7,3],[12,10,7,3]],doors:[door('corridor-yard',10,12,'yard',10,2.7,'南 · 雨后庭院'),door('corridor-archive',10,1.5,'archive',10,11.4,'北 · 档案翼')],props:[]},
 garden:{name:'花架小径',subtitle:'雨滴顺着铜藤落下。这里安静，但路弯且远。',tint:'#647864',floor:'earth',obstacles:[[7,3.8,6,4.2],[2.5,2.5,2.4,2.5],[15,8.5,2,1.8]],doors:[door('garden-yard',1.5,7,'yard',17.3,7,'西 · 雨后庭院'),door('garden-pump',18.5,3,'pump',2.7,10,'东北 · 排水间')],props:[prop('garden-note',4.5,10,'花架记录','note')]},
 pump:{name:'排水间',subtitle:'内闩可以直通补给铁柜；档案翼在北。',tint:'#5b7674',floor:'tile',obstacles:[[7,5,5,2],[13,9,3,1.4]],doors:[door('pump-garden',1.5,10,'garden',17.3,3,'西南 · 花架小径'),door('pump-archive',10,1.5,'archive',2.7,7,'北 · 档案翼'),door('pump-yard',18.5,7,'yard',2.7,7,'东 · 庭院内闩','loop')],props:[prop('pump-note',14,3,'排水计','note')]},
 archive:{name:'庭院档案翼',subtitle:'压印拓片在中央台上。先留空位，再取潮湿调度册。',tint:'#6e7166',floor:'wood',obstacles:[[3.5,4,4,2],[13,7,3,2]],doors:[door('archive-corridor',10,12,'corridor',10,2.7,'南 · 石廊'),door('archive-pump',1.5,7,'pump',10,2.7,'西 · 排水间'),door('archive-vault',10,1.5,'vault',10,11.3,'北 · 干燥室','vault')],props:[prop('rubbing',10,6,'压印拓片','pickup','rubbing'),prop('archive-note',15,4,'档案批注','note')]},
 vault:{name:'干燥室',subtitle:'册子很大；防潮套能把两格材料整理成一格。',tint:'#797569',floor:'wood',obstacles:[[4,4,3,1.5],[13,4,3,1.5]],doors:[door('vault-archive',10,12,'archive',10,2.7,'南 · 档案翼')],props:[prop('ledger',10,5,'潮湿调度册 · 占两格','pickup','ledger')]}
};
export const NOTES={
 'yard-note':'阿遥已经安全离馆。林芜重返雨庭，只取最后一册调度记录。补给有枪弹与治疗；装得太满，档案台上的东西就拿不动。石廊短却有巡馆偶，花架远却安全。',
 'garden-note':'花架绕路能避开石廊。排水间的门闩只可从里面打开；回程可以直达庭院铁柜。',
 'pump-note':'从排水间打开内闩后，庭院和这里双向相通。若背包满了，不必丢关键物，原路回铁柜即可。',
 'archive-note':'值守章背的柜号压痕与拓片吻合。先检查章，再将两件组合；干燥室门只认对号的章。潮湿册占两格，防潮套可合成一格封册。'
};
export const slots=inventory=>inventory.reduce((n,id)=>n+ITEMS[id].slots,0);
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function walkable(room,x,y,r=.26){
 if(x<1.15+r||x>18.85-r||y<1.15+r||y>12.85-r)return false;
 return ![...(ROOMS[room].walls||[]),...ROOMS[room].obstacles].some(([a,b,w,h])=>x+r>a&&x-r<a+w&&y+r>b&&y-r<b+h);
}
