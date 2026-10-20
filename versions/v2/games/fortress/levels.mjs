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

// Original short operations, not layouts from Battle City.
export const LEVELS = [
 {id:1,name:'双翼哨口',description:'左右入口分守，基地共用。',tip:'沿两翼迎敌；中段横道可以换防。',
 map:battlefield(r=>{r(11,4,3,7,'S');r(11,14,3,4,'S');for(const x of [5,18]){r(x,7,2,2);r(x,14,2,2);}r(3,11,6,1);r(16,11,6,1);}),spawns:[{x:4,y:2},{x:20,y:2}],queue:['scout','scout','gunner','scout','gunner','heavy'],maxActive:2,spawnGap:12,initialPower:'shield'},
 {id:2,name:'交汇换防',description:'破开中央砖带，交换防区。',tip:'钢墙把来敌引向中央；打开砖带后可快速支援。',
 map:battlefield(r=>{r(5,5,1,9,'S');r(19,5,1,9,'S');r(9,9,7,2);r(9,15,7,1);r(7,17,2,2);r(16,17,2,2);r(10,5,1,2,'W');r(14,5,1,2,'W');}),spawns:[{x:8,y:2},{x:16,y:2}],queue:['scout','gunner','scout','heavy','gunner','scout'],maxActive:2,spawnGap:13,initialPower:'rapid'}
];
