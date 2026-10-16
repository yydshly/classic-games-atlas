// A normal purchase policy. Uses production prices/actions, never writes combat state.
import {TOWERS} from '../games/pass/levels.mjs';
import {build,upgrade,pointAt} from '../games/pass/engine.mjs';
export function planFor(g){
 const ranked=g.sites.map(s=>({id:s.id,score:Array.from({length:Math.ceil(g.length/8)},(_,i)=>pointAt(g.path,i*8)).reduce((n,p)=>n+(Math.hypot(p.x-s.x,p.y-s.y)<=132?1:0),0)})).sort((a,b)=>b.score-a.score||a.id-b.id).map(s=>s.id);
 const order=[['build',ranked[0],'stone'],['build',ranked[1],'bolt'],['build',ranked[2],'frost'],['upgrade',ranked[1]],['build',ranked[3],'bolt'],['upgrade',ranked[0]],['build',ranked[4],'stone'],['upgrade',ranked[2]],['build',ranked[5],'bolt'],['upgrade',ranked[3]],['upgrade',ranked[4]],['build',ranked[6],'frost'],['upgrade',ranked[5]],['build',ranked[7],'bolt'],['upgrade',ranked[6]],['upgrade',ranked[7]]];
 return order.map(([kind,site,type])=>({kind,site,...(type?{type}:{} )}));
}
export function completed(g,a){const t=g.towers.find(t=>t.site===a.site);return a.kind==='build'?!!t:t?.level===2;}
export function purchaseStep(g){const a=planFor(g).find(a=>!completed(g,a));if(!a)return null;const t=g.towers.find(t=>t.site===a.site),cost=a.kind==='build'?TOWERS[a.type].cost:TOWERS[t.type].upgrade;if(g.gold<cost)return null;return {...a,cost};}
export function prepare(g){const log=[];for(let guard=0;guard<16;guard++){const a=purchaseStep(g);if(!a)break;const before=g.gold,ok=a.kind==='build'?build(g,a.site,a.type):upgrade(g,a.site);if(!ok)throw Error('Normal purchase rejected');log.push({...a,goldBefore:before,goldAfter:g.gold});}return log;}
