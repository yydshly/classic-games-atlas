// Ten original battlefields. Coordinates and wave compositions are editable here.
export const GRID = 25;
export const TILE = 24;
export const SIZE = GRID * TILE;
export const SPAWNS = [{ x: 2, y: 2 }, { x: 12, y: 2 }, { x: 22, y: 2 }];
export const PLAYER_SPAWN = { x: 10, y: 22 };
export const BASE = { x: 12, y: 23 };

function battlefield(draw) {
  const map = Array.from({ length: GRID }, (_, y) => Array.from({ length: GRID }, (_, x) => x === 0 || y === 0 || x === 24 || y === 24 ? 'S' : '.'));
  const rect = (x, y, w, h, tile = 'B') => {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) if (col > 0 && col < 24 && row > 0 && row < 24) map[row][col] = tile;
  };
  draw(rect);
  // Leave staging areas clear; this does not copy any original game's layout.
  rect(1, 1, 23, 3, '.');
  rect(8, 20, 9, 4, '.');
  for (const point of [{x:11,y:22},{x:12,y:22},{x:13,y:22},{x:11,y:23},{x:13,y:23}]) map[point.y][point.x] = 'B';
  map[BASE.y][BASE.x] = '.';
  return map.map(row => row.join(''));
}

const maps = [
  battlefield(r => { for (const x of [5,9,14,18]) for (const y of [6,11,16]) r(x,y,2,2); r(2,13,1,3,'S'); r(22,13,1,3,'S'); }),
  battlefield(r => { r(4,9,7,2,'W'); r(14,9,7,2,'W'); r(5,5,4,1); r(16,5,4,1); r(5,15,4,2); r(16,15,4,2); r(11,14,3,1); }),
  battlefield(r => { for(const y of [6,12,18]) {r(4,y,4,1,'S');r(17,y,4,1,'S');} for(const y of [8,9,15,16]) {r(9,y,2,1);r(14,y,2,1);} r(11,5,3,1); }),
  battlefield(r => { for(const x of [5,17]) for(const y of [6,15]) r(x,y,3,3,'S'); r(10,10,5,2); r(2,11,3,2); r(20,11,3,2); r(11,17,3,2); }),
  battlefield(r => {r(6,5,2,4,'W');r(17,5,2,4,'W');r(4,11,6,2,'W');r(15,11,6,2,'W');r(10,6,5,1);r(5,16,5,2);r(15,16,5,2);r(11,14,3,1,'S');}),
  battlefield(r => {for(const x of [8,16]) {r(x,5,1,5,'S');r(x,13,1,3,'S');r(x,18,1,2,'S');} r(3,8,3,2);r(19,8,3,2);r(11,8,3,2);r(11,15,3,2);}),
  battlefield(r => {for(const y of [5,9,13,17]) for(const x of [4,9,14,19]) r(x+(y===9||y===17?1:0),y,2,2);r(2,12,1,4,'S');r(22,12,1,4,'S');}),
  battlefield(r => {r(7,7,11,2,'W');r(7,16,11,2,'W');r(7,9,2,7,'W');r(16,9,2,7,'W');r(11,7,3,2,'.');r(11,16,3,2,'.');r(7,11,2,3,'.');r(16,11,2,3,'.');r(11,11,3,3,'S');r(3,5,3,2);r(19,5,3,2);r(3,18,3,2);r(19,18,3,2);}),
  battlefield(r => {for(let i=0;i<4;i++){r(4+i*2,5+i*3,3,1,'S');r(18-i*2,5+i*3,3,1,'S');} r(3,9,3,3);r(19,9,3,3);r(7,17,4,2);r(14,17,4,2);r(11,5,3,3);}),
  battlefield(r => {for(const x of [5,18])for(const y of [6,14])r(x,y,2,3,'S');r(2,10,5,2,'W');r(18,10,5,2,'W');r(9,7,7,2);r(10,13,5,2);r(4,19,17,1);for(const x of [8,12,16])r(x,19,1,1,'.');}),
];

const descriptions = [
  ['晨雾哨站','先熟悉炮口与履带。宽阔的中路是你的第一条防线。','中央通道视野开阔；在敌人接近基地前拦截。',6,2,3.6],
  ['双河口','两条水带把战场分成外侧通道和中央桥梁。','水域阻挡车辆但不挡炮弹，注意远处火线。',7,2,3.3],
  ['铁轨交叉','钢制横梁改变推进方向，留意两翼来敌。','钢障不可摧毁，绕至出口拦截。',8,3,3.1],
  ['回声货场','四座钢仓之间，炮火会从转角突然出现。','先观察路口；连续射击可快速打开砖墙。',8,3,2.9],
  ['曲折水道','水道压缩了机动空间，火力比速度更重要。','开辟砖墙捷径，避免被堵在桥头。',9,3,2.7],
  ['三线夹击','纵向钢墙划出三条战线，随时准备转场。','穿过横向缺口支援另一条通道。',10,3,2.5],
  ['碎砖迷城','大量砖墙会随着战斗逐渐变成开放战场。','不要只守一处；地图会因炮火不断变化。',10,4,2.4],
  ['孤岛中继','环形水面将中央孤岛与外围战线分开。','利用岛屿的四个缺口，留意外围绕行。',11,4,2.3],
  ['棱镜防区','交错钢梁让直线射击与迂回路线交替出现。','优先处理已进入下半场的敌人。',12,4,2.2],
  ['最后的灯塔','最后一座信标。装甲集群正从三处集结。','保留维修与护盾的使用空间，守住三条来路。',14,4,2.0],
];

export const LEVELS = descriptions.map(([name,description,tip,total,maxActive,spawnGap],index) => {
  const pattern = index < 2 ? ['scout','scout','gunner'] : index < 5 ? ['scout','gunner','scout','heavy'] : ['scout','gunner','heavy','scout','gunner','heavy'];
  return { id:index+1,name,description,tip,map:maps[index],maxActive,spawnGap,
    queue:Array.from({length:total},(_,i)=>pattern[(i+(index>6?1:0))%pattern.length]),
    initialPower:['shield','rapid','repair'][index%3] };
});
