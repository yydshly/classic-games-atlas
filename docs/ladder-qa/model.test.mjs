import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,start,pause,update,dig,inspectDig,checkpoint,restore,holeAt,solidAt,STEP,HOLE_TIME} from './engine.mjs';
import {chooseAction,ORDERS} from './policy.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
function advance(g,seconds,input={}){for(let left=seconds;left>1e-9;){const dt=Math.min(STEP,left);update(g,dt,input);left-=dt;}}
function play(index,variant,period=.05){const g=createGame(index);start(g);const collected=[],actions=[];let group=null,known=new Set();const flush=()=>{if(group){group.until={x:g.player.x,y:g.player.y};group.seconds=Number((g.time-group.time).toFixed(2));actions.push(group);group=null;}};
 while(g.state==='playing'&&g.time<60){const before=checkpoint(g),a=chooseAction(g,variant);assert.deepEqual(checkpoint(g),before,'policy is readonly');if(a.dig){flush();const r=dig(g,a.dig);assert.equal(r.ok,true);actions.push({type:'dig',dir:a.dig,at:{x:g.player.x,y:g.player.y},target:r.target,time:g.time,reason:a.reason});}const dir=a.dir||null;if(!group||group.dir!==dir){flush();group={type:dir?'move':'wait',dir,from:{x:g.player.x,y:g.player.y},time:g.time,reason:a.reason};}advance(g,period,a.input);for(const c of g.cores)if(c.collected&&!known.has(c.id)){known.add(c.id);collected.push({id:c.id,time:g.time});}}
 flush();assert.equal(g.state,'won',JSON.stringify({index,variant,period,state:g.state,time:g.time,reason:g.reason}));assert.equal(g.stats.collected,g.cores.length);assert.ok(restore(checkpoint(g)));return {level:g.level,variant,period,state:g.state,time:g.time,stats:clone(g.stats),collectionOrder:collected,actions};}

const results=[];for(const period of [.05,.1,.2])for(const variant of ['main','alternate'])for(let i=0;i<3;i++)results.push(play(i,variant,period));
const main2=results.find(r=>r.level===2&&r.variant==='main'&&r.period===.05),alt2=results.find(r=>r.level===2&&r.variant==='alternate'&&r.period===.05);assert.equal(main2.stats.digs,0);assert.ok(alt2.stats.digs>=2&&alt2.stats.traps>=1);assert.notDeepEqual(main2.collectionOrder.map(c=>c.id),alt2.collectionOrder.map(c=>c.id));
const main3=results.find(r=>r.level===3&&r.variant==='main'&&r.period===.05),alt3=results.find(r=>r.level===3&&r.variant==='alternate'&&r.period===.05);assert.notDeepEqual(main3.collectionOrder.map(c=>c.id),alt3.collectionOrder.map(c=>c.id));assert.ok(main3.stats.traps>=1&&alt3.stats.traps>=1);

// Invalid digging does not consume/open anything; there is no jump input.
{
 const g=createGame();assert.equal(dig(g,1).ok,false);assert.equal(g.holes.length,0);start(g);const before=checkpoint(g);assert.equal(dig(g,-1).ok,false);assert.equal(g.stats.digs,0);assert.deepEqual(g.holes,before.holes);advance(g,.2,{up:true});assert.equal(g.player.y,11);assert.equal(g.player.x,3);pause(g);const frozen=checkpoint(g);assert.equal(dig(g,1).ok,false);advance(g,2,{right:true});assert.deepEqual(checkpoint(g),frozen);assert.deepEqual(restore(frozen),frozen);
}
// A closed exit never advances a stage or grants a result.
{
 const g=createGame(1);start(g);advance(g,.02);assert.equal(g.state,'playing');assert.equal(g.exit.open,false);assert.equal(g.stats.collected,0);assert.ok(g.reason.includes('还缺4'));
}
// Real no-input catch and a real buried-core route that deliberately fails to retreat.
const failures=[];
{
 const g=createGame();start(g);while(g.state==='playing')advance(g,.1);assert.equal(g.lossKind,'caught');assert.ok(restore(checkpoint(g)));failures.push({kind:'no-input-catch',time:g.time,state:g.state,lossKind:g.lossKind});
 const h=createGame();start(h);while(!h.cores[0].collected){const a=chooseAction(h);if(a.dig)dig(h,a.dig);advance(h,.05,a.input);}while(h.state==='playing')advance(h,.05);assert.equal(h.lossKind,'buried');assert.equal(h.holes.length,0);assert.ok(solidAt(h,5,12));assert.ok(restore(checkpoint(h)));failures.push({kind:'take-buried-core-and-never-retreat',time:h.time,state:h.state,lossKind:h.lossKind});
}
// Trap, frozen pause, countdown, refill, and readable guard return all use legal inputs.
{
 const g=createGame(1);start(g);while(!g.enemies.some(e=>e.state==='trapped')){const a=chooseAction(g,'alternate');if(a.dig)dig(g,a.dig);advance(g,.05,a.input);assert.equal(g.state,'playing');}const e=g.enemies[0],site={x:e.x,y:e.y};assert.ok(holeAt(g,site.x,site.y));assert.ok(g.stats.traps>=1);pause(g);const frozen=checkpoint(g);advance(g,1,{right:true});assert.deepEqual(checkpoint(g),frozen);assert.ok(restore(frozen));start(g);while(holeAt(g,site.x,site.y)&&g.state==='playing')advance(g,.02);assert.equal(g.state,'playing');assert.equal(e.state,'warning');assert.deepEqual({x:e.x,y:e.y},e.home);assert.ok(e.tellTimer>0);assert.ok(solidAt(g,site.x,site.y));assert.ok(restore(checkpoint(g)));
}
// Rope holds without input; Down intentionally releases the grip.
{
 const g=createGame(1);start(g);while(!g.cores.find(c=>c.id==='rope').collected){const a=chooseAction(g,'alternate');if(a.dig)dig(g,a.dig);advance(g,.05,a.input);}assert.equal(g.player.y,6);advance(g,.2);assert.equal(g.player.y,6);advance(g,.2,{down:true});assert.equal(g.player.y,7);
}
// dt is accumulated in full: a 200ms update equals ten 20ms substeps.
{
 const a=createGame(),b=createGame();start(a);start(b);update(a,.2,{right:true});for(let i=0;i<10;i++)update(b,.02,{right:true});assert.equal(a.time,.2);for(const k of ['time','ticks','player','enemies','cores','holes','stats'])assert.deepEqual(a[k],b[k]);
}
// Active restoration pauses, terminal results stay terminal, corrupt fields are refused.
{
 const g=createGame();start(g);advance(g,.2,{right:true});assert.equal(dig(g,1).ok,true);const cp=checkpoint(g);assert.equal(restore(cp).state,'paused');const r=restore(cp);start(r);const x=r.player.x;advance(r,.2);assert.equal(r.player.x,x);
 const mutations=[h=>h.level=4,h=>h.version=9,h=>h.tiles[0]='bad',h=>h.player.x=-1,h=>h.player.clock=NaN,h=>h.player.pose='jump',h=>h.enemies[0].id=3,h=>h.enemies[0].state='teleport',h=>h.enemies[0].tellTimer=0,h=>h.enemies[0].home.x++,h=>h.cores[0].collected='yes',h=>h.cores[1].x++,h=>h.stats.collected++,h=>h.stats.digs=0,h=>h.holes[0].remaining=HOLE_TIME+1,h=>h.holes.push(clone(h.holes[0])),h=>h.exit.open=true,h=>h.time=-1,h=>h.state='won',h=>{h.state='lost';h.lossKind='caught';},h=>h.events.push({time:-1,text:'bad'})];for(const mutate of mutations){const bad=clone(cp);mutate(bad);assert.equal(restore(bad),null,String(mutate));}assert.equal(restore(null),null);assert.equal(restore({}),null);assert.deepEqual(checkpoint(g),cp);
}
writeFileSync(new URL('./routes.json',import.meta.url),JSON.stringify({kind:'bounded-native-input-model-routes-not-browser-proof',instructions:'Prefer chooseAction(liveSnapshot,variant) at each decision. The waypoint lists are exact successful 50ms model baselines; pauses and external input overhead change guard phase, so do not blindly time-replay them.',orders:ORDERS,routes:results.filter(r=>r.period===.05)},null,2)+'\n');
writeFileSync(new URL('./proof.json',import.meta.url),JSON.stringify({kind:'bounded-model-proof-not-ui',rules:{step:STEP,player:.14,guard:.38,fall:.12,hole:HOLE_TIME,oneCatchEndsAttempt:true},matrix:results.map(({actions,...r})=>r),failures,checks:['valid/invalid dig','no jump','premature exit','real catch and burial','guard trap and refill return','pause/active/terminal restore','rope grip and drop','full dt accumulation','corrupt checkpoint rejection'],limits:['Original finite three-stage prototype, not an official remake.','Readonly path policy uses visible guard positions and is model assistance.','No exhaustive solver, browser, real-device or human-fun claim.']},null,2)+'\n');
console.log(JSON.stringify({ok:true,modelWins:results.length,levels:3,periods:[.05,.1,.2],naturalFailures:failures.length,files:['routes.json','proof.json']}));
