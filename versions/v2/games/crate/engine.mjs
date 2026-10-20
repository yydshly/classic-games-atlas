import {LEVELS} from './levels.mjs';
export const MAX_RESTORE_ACTIONS=20000;
export const DIRS=[{key:'U',dx:0,dy:-1},{key:'R',dx:1,dy:0},{key:'D',dx:0,dy:1},{key:'L',dx:-1,dy:0}];
export function createGame(index=0){
 const l=LEVELS[Math.max(0,Math.min(LEVELS.length-1,index))];
 return {state:'ready',level:l.id,grid:[...l.grid],goals:l.goals.map(p=>({...p})),boxes:l.boxes.map((p,i)=>({id:i+1,...p})),player:{...l.player,dir:2},moves:0,pushes:0,time:0,history:[],serial:0,lastAction:null,events:[]};
}
export const wall=(g,x,y)=>x<0||y<0||y>=g.grid.length||x>=g.grid[0].length||g.grid[y][x]==='#';
export const goalAt=(g,x,y)=>g.goals.some(p=>p.x===x&&p.y===y);
export const satisfied=g=>g.boxes.filter(b=>goalAt(g,b.x,b.y)).length;
export function cornerBoxes(g){return g.boxes.filter(b=>!goalAt(g,b.x,b.y)&&[[0,3],[0,1],[2,3],[2,1]].some(([a,c])=>wall(g,b.x+DIRS[a].dx,b.y+DIRS[a].dy)&&wall(g,b.x+DIRS[c].dx,b.y+DIRS[c].dy))).map(b=>b.id);}
export function start(g){if(g.state==='ready')g.state=satisfied(g)===g.boxes.length?'won':'playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function move(g,direction){
 if(g.state!=='playing')return false;const d=typeof direction==='number'?DIRS[direction]:DIRS.find(d=>d.key===direction);if(!d)return false;
 const x=g.player.x+d.dx,y=g.player.y+d.dy;if(wall(g,x,y))return false;
 const box=g.boxes.find(b=>b.x===x&&b.y===y),bx=x+d.dx,by=y+d.dy;
 if(box&&(wall(g,bx,by)||g.boxes.some(b=>b.x===bx&&b.y===by)))return false;
 g.history.push({dir:d.key,player:{...g.player},boxes:g.boxes.map(b=>({...b})),moves:g.moves,pushes:g.pushes});
 const before={...g.player};g.player={x,y,dir:DIRS.indexOf(d)};g.moves++;g.serial++;
 if(box){box.x=bx;box.y=by;g.pushes++;g.events.push({type:'push'});if(goalAt(g,bx,by))g.events.push({type:'goal'});}else g.events.push({type:'step'});
 g.lastAction={kind:box?'push':'walk',from:before,to:{...g.player},boxId:box?.id??null};
 if(satisfied(g)===g.boxes.length){g.state='won';g.events.push({type:'win'});}
 return true;
}
export function undo(g){
 if(!['playing','won'].includes(g.state)||!g.history.length)return false;
 const old=g.history.pop();g.player={...old.player};g.boxes=old.boxes.map(b=>({...b}));g.moves=old.moves;g.pushes=old.pushes;g.state='playing';g.serial++;g.lastAction={kind:'undo'};g.events.push({type:'undo'});return true;
}
export function update(g,dt){if(g.state==='playing')g.time+=Math.max(0,Math.min(.1,dt));}
export const actions=g=>g.history.map(h=>h.dir).join('');
export function restoreActions(index,log,time=0){
 if(!Number.isInteger(index)||index<0||index>=LEVELS.length||typeof log!=='string'||log.length>MAX_RESTORE_ACTIONS||!/^[URDL]*$/.test(log))return null;
 const g=createGame(index);start(g);for(const d of log)if(!move(g,d))return null;
 g.events=[];g.time=Number.isFinite(time)?Math.max(0,time):0;
 if(!log.length)g.state='ready';else if(g.state==='playing')g.state='paused';
 return g;
}
export function snapshot(g){return JSON.parse(JSON.stringify({state:g.state,level:g.level,grid:g.grid,goals:g.goals,boxes:g.boxes,player:g.player,moves:g.moves,pushes:g.pushes,time:g.time,historyDepth:g.history.length,actions:actions(g),serial:g.serial,lastAction:g.lastAction,satisfied:satisfied(g),cornerBoxIds:cornerBoxes(g)}));}

