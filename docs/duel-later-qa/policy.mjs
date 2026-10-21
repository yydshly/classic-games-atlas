import {phase,createGame,input,advanceTicks,snapshot} from '../../versions/v2/games/duel/engine.mjs';
export function decide(g){const p=g.player,e=g.enemy,dist=e.x-p.x,ep=phase(e),busy=p.action||g.ticks<p.stunUntil||p.jumpAge!==null;if(busy)return{move:0,guard:false};const ready=g.ticks>=p.cooldown;
 if(e.action?.kind==='throw'&&['前摇','出招'].includes(ep)&&dist<105)return{move:-1,guard:false};
 if(e.jumpAge!==null&&e.y>20&&dist<=105&&ready&&p.energy>=22)return{move:0,guard:false,attack:'anti',face:true};
 if(e.action&&e.action.kind!=='dash'&&['前摇','出招'].includes(ep)&&dist<=e.action.range+12)return{move:0,guard:true,face:true};
 if(e.guard){if(dist>61)return{move:1,guard:false};if(ready&&p.energy>=24)return{move:0,guard:false,attack:'throw',face:true};return{move:0,guard:false};}
 if(ep==='收招'&&dist<=146&&ready&&p.energy>=20)return{move:0,guard:false,attack:'heavy',face:true};
 if(!e.action&&g.ticks+50<e.cooldown&&dist<=146&&ready&&p.energy>=20)return{move:0,guard:false,attack:'heavy',face:true};
 return{move:dist>120?1:0,guard:false};}
if(process.argv.includes('--stdio')){const{createInterface}=await import('node:readline');for await(const l of createInterface({input:process.stdin})){try{console.log(JSON.stringify(decide(JSON.parse(l))));}catch(e){console.log(JSON.stringify({error:e.message}));}}}
else{const rows=[];for(let i=0;i<8;i++){const g=createGame(i);input(g,{kind:'start'});for(let n=0;n<1500&&g.state==='playing';n++){const c=decide(g);input(g,{kind:'guard',value:false});input(g,{kind:'move',value:c.move});if(c.face&&g.player.face<0){input(g,{kind:'move',value:1});input(g,{kind:'move',value:0});}if(c.guard)input(g,{kind:'guard',value:true});if(c.attack)input(g,{kind:c.attack});advanceTicks(g,6);}rows.push({level:i+1,state:g.state,time:g.ticks/120,hp:g.player.hp,enemyHP:g.enemy.hp,stats:g.stats});}console.log(JSON.stringify({kind:'OFFLINE legal-input reference, not public UI',rows},null,2));}
