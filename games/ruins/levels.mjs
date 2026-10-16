export const DIRS={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
export const ENEMIES={moss:{name:'苔卫',hp:2,recover:2,pace:2,note:'靠近后蓄力，落点提前两拍标明。'},eye:{name:'棱眼',hp:2,recover:3,pace:3,note:'直线看见你时预警整条光束，侧移躲开。'},armor:{name:'壁铠',hp:3,recover:3,pace:3,note:'蓄力后打出两格十字，斜角是空隙。'}};
const item=(id,type,x,y)=>({id,type,x,y});const foe=(id,type,x,y)=>({id,type,x,y});
const layouts=[[],[[3,2],[3,3],[5,4]],[[3,3],[5,3]],[[2,2],[3,2],[5,4],[6,4]],[[4,2],[4,4]],[[2,3],[6,3],[4,4]],[[3,2],[5,2],[3,4],[5,4]],[[2,2],[6,2],[2,4],[6,4]]];
function room(id,name,shape,enemies=[],items=[],lamp=false,hazards=[]){const reserved=[[1,3],[7,3],[4,1],[4,5],[6,4],...(lamp?[[6,2]]:[]),...enemies.map(e=>[e.x,e.y]),...items.map(e=>[e.x,e.y])];return{id,name,at:({A:[0,0],B:[1,0],C:[0,1],D:[1,1],E:[2,1]})[id],walls:layouts[shape].filter(([x,y])=>!reserved.some(p=>p[0]===x&&p[1]===y)),enemies,items,lamp:lamp?{id,x:6,y:2}:null,hazards:hazards.map(([x,y,offset=0])=>({x,y,offset}))};}
const edge=(a,b,kind='free',requirement=null)=>({id:[a,b].sort().join(''),a,b,kind,requirement});
const level=(id,name,theme,rooms,edges,exit,hint)=>({id,name,theme,hp:6,potions:2,start:{room:'A',x:2,y:3},rooms,edges,exit:{room:exit,x:6,y:4},hint});
export const LEVELS=[
level(1,'苔门初灯','moss',[
room('A','入林小厅',0,[],[item('k1','key',5,2),item('r1','relic',2,5)]),room('B','苔影灯室',0,[foe('b1','moss',5,4)],[],true),room('C','归途石庭',2,[foe('c1','moss',6,4)],[],true)],
[edge('A','B'),edge('A','C','key')],'C','先去东侧灯室，回入口取钥匙，再开南门。点亮两座灯，去归途门按互动。'),
level(2,'岔路与棱光','moss',[
room('A','分岔阶庭',1,[],[item('r1','relic',6,5)]),room('B','持钥东廊',3,[foe('b1','moss',6,4)],[item('k1','key',6,1)],true),room('C','西侧灯井',4,[foe('c1','moss',2,4)],[],true),room('D','棱光归庭',0,[foe('d1','eye',6,2)],[item('p1','potion',2,5)])],
[edge('A','B'),edge('A','C','key'),edge('B','D','lamp','C'),edge('C','D','lamp','B')],'D','钥匙在东廊，灯井在南侧。两边的灯分别打开另一侧通道；棱眼只打预告直线。'),
level(3,'石刺回廊','moss',[
room('A','守望前厅',2,[foe('a1','moss',6,4)],[item('k1','key',6,1)],true),room('B','东侧侧廊',5,[foe('b1','moss',4,2)],[item('r1','relic',6,5)]),room('C','脉动灯庭',0,[foe('c1','moss',6,4)],[],true,[[4,3,0],[5,3,2]]),room('D','回响归庭',3,[foe('d1','eye',6,2),foe('d2','moss',2,5)],[],true)],
[edge('A','B','clear','A'),edge('A','C'),edge('C','D','key'),edge('B','D','lamp','C')],'D','橙色石刺先预告一拍，再亮两拍。可以绕路或闪步；门旁文字会解释封门条件。'),
level(4,'铜壁的空隙','copper',[
room('A','铜阶入口',4,[],[item('k1','key',2,5)]),room('B','棱眼横廊',1,[foe('b1','eye',6,2)],[],true),room('C','壁铠内庭',0,[foe('c1','armor',5,3)],[item('p1','potion',2,5)]),room('D','铜火归庭',7,[foe('d1','moss',5,3)],[],true)],
[edge('A','B','key'),edge('A','C','lamp','B'),edge('B','D'),edge('C','D','clear','C')],'D','壁铠十字攻击有斜角空隙。闪步最多走两格，不穿墙或敌人；药露只在受伤时消耗。'),
level(5,'双灯交汇','copper',[
room('A','双向门廊',7,[],[item('r1','relic',4,5)]),room('B','钥匙藏室',2,[foe('b1','moss',6,4)],[item('k1','key',6,1)]),room('C','西井灯台',3,[foe('c1','eye',6,2)],[],true),room('D','合流内庭',0,[foe('d1','armor',5,3),foe('d2','moss',2,5)],[],true,[[4,4,1]]),room('E','余火归庭',4,[foe('e1','eye',6,3)],[item('p1','potion',2,5)],true)],
[edge('A','B'),edge('A','C'),edge('B','D','key'),edge('C','D','lamp','C'),edge('D','E','clear','D')],'E','两条路汇入内庭。钥匙门与灯门可择路，但出口仍要三灯齐明；探索可找有限补给。'),
level(6,'回望持钥人','copper',[
room('A','回望阶庭',1,[],[]),room('B','门后灯台',0,[foe('b1','armor',5,3)],[],true),room('C','南侧藏室',4,[foe('c1','eye',6,2)],[item('k1','key',2,5)]),room('D','折返内庭',6,[foe('d1','moss',6,4),foe('d2','eye',2,3)],[],true,[[4,3,0]]),room('E','铜铃归庭',3,[foe('e1','armor',5,3)],[item('p1','potion',2,5)],true)],
[edge('A','B','key'),edge('A','C'),edge('C','D','clear','C'),edge('B','D'),edge('D','E','lamp','B')],'E','先走南侧取钥匙，再回东廊点灯。房间离开后状态保留，重进不会刷怪、补血或重生钥匙。'),
level(7,'霜廊余温','frost',[
room('A','霜廊前庭',0,[foe('a1','moss',6,2),foe('a2','moss',5,5)],[],true),room('B','白石钥廊',4,[foe('b1','eye',6,3)],[item('k1','key',2,5)]),room('C','霜井灯台',7,[foe('c1','armor',5,3)],[],true,[[4,3,1],[4,4,3]]),room('D','长明内庭',2,[foe('d1','eye',6,2),foe('d2','moss',2,5)],[],true),room('E','侧院补给',3,[foe('e1','moss',6,4)],[item('p1','potion',2,5),item('r1','relic',6,1)])],
[edge('A','B'),edge('A','C','key'),edge('B','D','lamp','C'),edge('C','D'),edge('D','E','clear','D')],'D','侧院补给是可选探索，不是凭空恢复。所有灯点亮后，清开归庭并互动出口。'),
level(8,'遗迹的长明灯','frost',[
room('A','长明门廊',6,[],[item('r1','relic',6,5)]),room('B','北侧灯库',3,[foe('b1','armor',5,3),foe('b2','moss',2,5)],[item('k2','key',6,1)],true),room('C','南侧持钥庭',0,[foe('c1','eye',6,2),foe('c2','moss',2,5)],[item('k1','key',6,5)],true,[[4,3,0]]),room('D','三岔内庭',4,[foe('d1','armor',5,3),foe('d2','eye',2,3)],[item('p1','potion',2,5)],false,[[3,3,1],[5,3,4]]),room('E','长明归庭',0,[foe('e1','armor',5,3),foe('e2','eye',6,1)],[],true)],
[edge('A','B','key'),edge('A','C'),edge('C','D','clear','C'),edge('B','D','lamp','B'),edge('D','E','key','B')],'E','先取南钥，再点北灯并取第二钥。三座灯、两把钥匙、五个房间：在预警之间找下一步。')
];
export function ports(level,edge,room){const a=level.rooms.find(r=>r.id===edge.a),b=level.rooms.find(r=>r.id===edge.b),from=room===a.id?a:b,to=room===a.id?b:a,dx=to.at[0]-from.at[0],dy=to.at[1]-from.at[1];if(dx>0)return{x:8,y:3,spawn:[1,3],to:to.id};if(dx<0)return{x:0,y:3,spawn:[7,3],to:to.id};if(dy>0)return{x:4,y:6,spawn:[4,1],to:to.id};return{x:4,y:0,spawn:[4,5],to:to.id};}
