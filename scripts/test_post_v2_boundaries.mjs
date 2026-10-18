import assert from 'node:assert/strict';
import {createGame,start,pause,update,PHYSICS,checkpoint,restore,standings,aiInput} from '../versions/v2/games/post/engine.mjs';
import {TRACKS,atArc,project} from '../versions/v2/games/post/tracks.mjs';
const t=TRACKS[0];
const contact=createGame();contact.state='playing';contact.countdown=0;contact.time=10;
for(const [i,c] of contact.cars.entries()){const q=atArc(t,t.gateArcs[1]-[1,10,100][i]);Object.assign(c,{x:q.x,y:q.y,angle:Math.atan2(q.ty,q.tx),previousArc:project(t,q).arc,speed:0});}
update(contact,PHYSICS.step,{});
console.log('Contact-only crossing result:',{gates:contact.car.stats.gates,speed:contact.car.speed});
// This assertion encodes the requested rejection of correction-only gate credit.
const contactOnlyRejected=contact.car.stats.gates===0;
let checked=0;for(const stage of [0,1,2]){const g=createGame(stage);start(g);for(let n=0;g.state!=='finished';n++){update(g,PHYSICS.step,aiInput(g,g.car));if(n%53===0&&g.state!=='finished'){const cp=checkpoint(g),r=restore(cp);assert(r,`valid live checkpoint rejected ${stage}/${n}`);assert.deepEqual(checkpoint(r),cp);checked++;}}}
console.log('Exact sampled runtime checkpoint round trips:',checked);
const g=createGame();for(const c of g.cars){c.finishedAt=20;c.stats.gates=16;}assert.deepEqual(standings(g).map(c=>c.id),['player','rival-1','rival-2']);console.log('Exact timestamp tie uses stable car order, player first');
const deadline=createGame();deadline.state='playing';deadline.countdown=0;deadline.time=t.limit-PHYSICS.step;
const fin=deadline.car;Object.assign(fin,{lap:2,lapTimes:[20],lapStartedAt:20,lastGate:7,nextGate:0,travel:t.length*.9});fin.stats.gates=15;const fp=atArc(t,t.length-.5);Object.assign(fin,{x:fp.x,y:fp.y,angle:Math.atan2(fp.ty,fp.tx),speed:150,previousArc:fp.arc});for(const [i,c] of deadline.cars.slice(1).entries()){const q=atArc(t,400+i*60);Object.assign(c,{x:q.x,y:q.y,previousArc:q.arc});}update(deadline,PHYSICS.step,{gas:1});console.log('Deadline simultaneous crossing:',deadline.reason,deadline.result.outcome);
if(deadline.reason!=='超时'||deadline.result.outcome!=='lost'){console.error('FAIL: simultaneous deadline must adjudicate timeout first');process.exitCode=1;}
if(!contactOnlyRejected){console.error('FAIL: correction-only stationary gate crossing was credited');process.exitCode=1;}
