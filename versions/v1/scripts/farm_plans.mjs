import{LEVELS,CROPS,weatherAt}from'../games/farm/levels.mjs';
import{createGame,act,inventory,proposal,conservation}from'../games/farm/engine.mjs';
export function decide(g){const l=LEVELS[g.level-1],stock=inventory(g),w=weatherAt(l,g.day);if(g.state==='ready')return{kind:'start'};if(g.state!=='playing')return null;
 if(g.actions){for(const o of l.orders){const c={kind:'deliver',order:o.id};if(proposal(g,c).ok)return c;}for(let i=0;i<g.plots.length;i++)if(g.plots[i]&&g.plots[i].age>=CROPS[g.plots[i].crop].days)return{kind:'harvest',plot:i};
 for(let i=0;i<g.plots.length;i++){const p=g.plots[i];if(p&&p.moisture===0&&!w.rain&&(!w.cold||CROPS[p.crop].hardy))return{kind:'water',plot:i};}
 const free=g.plots.indexOf(null);if(free>=0){const choices=l.crops.map(k=>{const orders=l.orders.filter(o=>!g.completed.some(c=>c.id===o.id)&&(o.need[k]||0));const needed=orders.reduce((a,o)=>a+(o.need[k]||0),0)-stock[k]-g.plots.filter(p=>p?.crop===k).length*CROPS[k].yield;return{k,needed,due:Math.min(...orders.map(o=>o.due??l.limit+1))};}).filter(x=>x.needed>0&&g.cash>=CROPS[x.k].cost).sort((a,b)=>a.due-b.due||CROPS[b.k].days-CROPS[a.k].days||b.needed-a.needed);if(choices.length)return{kind:'plant',plot:free,crop:choices[0].k};}
 if(!w.rain)for(let i=0;i<g.plots.length;i++){const p=g.plots[i];if(p&&p.age<CROPS[p.crop].days&&p.moisture<2)return{kind:'water',plot:i};}
 }return{kind:'end'};
}
export function plan(i){const g=createGame(i),history=[];for(let n=0;n<800&&!['won','lost'].includes(g.state);n++){const c=decide(g);if(!c||!act(g,c))throw Error('Invalid ordinary plan '+JSON.stringify({i,c,g}));const inv=conservation(g);if(!Object.values(inv).every(Boolean))throw Error('Invariant '+JSON.stringify(inv));history.push({command:c,day:g.day,actions:g.actions,cash:g.cash,inventory:inventory(g),plots:g.plots.map(p=>p?{...p}:null),orders:g.completed.map(o=>o.id)});}return{game:g,history};}
