import {LEVELS as ORIGINAL,UNITS,ENEMIES,GRID,W,H,cellPoint} from '../../../v2/games/brook/levels.mjs';
export {UNITS,ENEMIES,GRID,W,H,cellPoint};
const wave=(at,list)=>({at,entries:list.map(([row,type,delay=0])=>({row,type,delay}))});
const waves=[
 wave(8,[[0,'leap'],[1,'dash',3],[2,'shell',7]]),
 wave(29,[[2,'leap'],[0,'shell',5],[1,'drift',9]]),
 wave(51,[[1,'leap'],[2,'dash',4],[0,'dash',7]]),
 wave(70,[[2,'shell'],[1,'shell',4],[0,'leap',8]])
];
const finale={id:3,name:'三溪合流',theme:'dusk',rows:3,budget:260,blocked:[[0,5],[2,4]],waves,
 tip:'三行轮换：上路先跃后甲，中路快敌后跃，下路重甲后跃。溪石挤占上路6格、下路5格；诱跳点与落地点要分开。可提前铺根，也可用雾环与复合火线。',
 allowed:Object.keys(UNITS),spawns:waves.flatMap((w,k)=>w.entries.map((e,j)=>({at:w.at+e.delay,row:e.row,type:e.type,wave:k+1,order:j}))).sort((a,b)=>a.at-b.at||a.wave-b.wave||a.order-b.order)};
export const LEVELS=[...ORIGINAL,finale];
