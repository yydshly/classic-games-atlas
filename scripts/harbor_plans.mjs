import{LEVELS}from'../games/harbor/levels.mjs';import{edgeFor}from'../games/harbor/engine.mjs';
const S=(type,route)=>({type,route:route.split(' ')});
export const PLANS=[
 [S('skiff','A B C')],[S('barge','A B C D')],
 [S('skiff','A C D F'),S('skiff','B C E')],[S('barge','A B C D')],
 [S('barge','A C E F'),S('skiff','B D E G')],[S('barge','A B D F'),S('skiff','C G B D')],
 [S('barge','A C D E'),S('barge','B C D F')],[S('barge','A B C E F')],
 [S('barge','A B D F'),S('skiff','C G B D')],[S('barge','A C D E'),S('barge','B C D F')],
 [S('barge','A B D F H'),S('skiff','C E G')],[S('barge','A B D E G'),S('barge','C F D B')]
];
export function commands(i){const edges=new Set();for(const s of PLANS[i])for(let n=1;n<s.route.length;n++)edges.add(edgeFor(LEVELS[i],s.route[n-1],s.route[n]).id);return[...[...edges].sort().map(edge=>({kind:'build',edge})),...PLANS[i].map(s=>({kind:'buy',...s}))];}
