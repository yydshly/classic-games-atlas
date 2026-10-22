import {GRID,LEVELS} from './levels.mjs';
// Same read-only feedback as v2, bound to this candidate's three-stage data.
export function laneFeedback(game) {
 if(game.state==='ready')return {warning:false,rows:[],text:'来敌从右侧进入，守住左岸防线。'};
 if(!['playing','paused'].includes(game.state))return {warning:false,rows:[],text:'本场守护已结束，请查看结算。'};
 const rows=[...new Set(game.enemies.filter(enemy=>enemy.hp>0&&Number.isInteger(enemy.row)&&
  enemy.row>=0&&enemy.row<LEVELS[game.level-1].rows&&Number.isFinite(enemy.x)&&
  enemy.x<=GRID.x+GRID.cw*2).map(enemy=>enemy.row+1))].sort((a,b)=>a-b);
 return rows.length?{warning:true,rows,text:'左岸附近：第 '+rows.join('、')+' 行有来敌。'}
  :{warning:false,rows:[],text:'左岸附近暂无来敌。'};
}
