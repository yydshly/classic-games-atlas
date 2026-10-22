import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createGame,start,pause,command,update,snapshot,checkpoint,restore} from '../preview/windowlife/engine.mjs';
const data=JSON.parse(readFileSync(new URL('./fixtures/windowlife-schedules.json',import.meta.url),'utf8'));
const runFor=(g,t)=>{for(let i=0;i<Math.round(t*10);i++)update(g,.1);};
const enqueue=(g,actor,kind)=>{const r=command(g,{type:'enqueue',actor,kind});assert.equal(r.ok,true,r.reason);return r.jobId;};
const results=[];
for(const s of data.schedules){const g=createGame(s.level-1,s.layout);start(g);assert.notEqual(restore(checkpoint(g)),null);let n=0;while(g.state==='playing'){
 while(n<s.commands.length&&s.commands[n].at<=g.time+.00001){const {actor,kind}=s.commands[n++];enqueue(g,actor,kind);}update(g,.1);if(g.ticks%10===0)assert.notEqual(restore(checkpoint(g)),null,s.id+' checkpoint at '+g.time);}
 assert.equal(g.state,'won',s.id+': '+JSON.stringify({time:g.time,goals:g.goals,actors:g.actors,events:g.events}));
 results.push({id:s.id,state:g.state,time:g.time,needs:g.actors.map(a=>({id:a.id,needs:a.needs})),completed:g.actors.map(a=>({id:a.id,...a.completed})),events:g.events});
 const r=restore(checkpoint(g));assert.equal(r.state,'won');assert.deepEqual(r,snapshot(g));}
{
 const g=createGame(1);start(g);enqueue(g,'a','cook');enqueue(g,'b','cook');runFor(g,1);assert.equal(g.actors[1].current.phase,'waiting');assert.match(g.actors[1].current.reason,/设施/);assert.equal(g.objects.find(o=>o.id==='stove').busyBy,g.actors[0].current.id);
 const cp=checkpoint(g),r=restore(cp);assert.equal(r.state,'paused');assert.equal(r.time,g.time);runFor(r,2);assert.equal(r.time,g.time);start(r);runFor(g,2);runFor(r,2);assert.deepEqual({...snapshot(r),reason:''},{...snapshot(g),reason:''});
 pause(g);const before=snapshot(g);runFor(g,3);assert.deepEqual(snapshot(g),before);assert.equal(restore(checkpoint(g)).state,'paused');
}
{
 const g=createGame(2);start(g);enqueue(g,'a','cook');enqueue(g,'b','cook');runFor(g,18);assert.equal(g.meals,2);
 const id=enqueue(g,'a','dinner');runFor(g,22.1);assert.equal(g.meals,0);assert.equal(g.actors.every(a=>a.current.id===id&&a.current.started),true);
 assert.equal(command(g,{type:'cancel',actor:'b',jobId:id}).ok,true);assert.equal(g.meals,0);assert.equal(g.actors.every(a=>!a.current),true);assert.equal(g.objects.every(o=>o.busyBy===null),true);assert.equal(g.actors.every(a=>!a.completed.dinner),true);
}
{
 const g=createGame(1);const id=enqueue(g,'a','chat');assert.equal(g.actors.every(a=>a.queue[0].id===id),true);command(g,{type:'cancel',actor:'a',jobId:id});assert.equal(g.actors.every(a=>a.queue.length===0),true);
 enqueue(g,'a','work');enqueue(g,'a','wash');enqueue(g,'a','sleep');assert.equal(command(g,{type:'enqueue',actor:'a',kind:'chat'}).ok,false);assert.equal(g.actors[1].queue.length,0);
 assert.equal(command(g,{type:'place',object:'desk',x:3,y:3}).ok,true);start(g);assert.equal(command(g,{type:'place',object:'desk',x:7,y:3}).ok,false);
}
{
 const g=createGame(2);start(g);runFor(g,18);enqueue(g,'a','cook');runFor(g,1);assert.match(g.actors[0].current.reason,/维护/);assert.equal(g.objects.find(o=>o.id==='stove').busyBy,null);runFor(g,14);assert.equal(g.actors[0].current.started,true);
}
{
 const g=createGame();start(g);runFor(g,80);assert.equal(g.state,'lost');assert.match(g.reason,/一天结束/);assert.equal(restore(checkpoint(g)).state,'lost');assert.equal(restore({}),null);assert.equal(restore(null),null);const cp=checkpoint(createGame());cp.game.actors[0].needs.energy=-1;assert.equal(restore(cp),null);assert.equal(restore(checkpoint(createGame())).state,'ready');
}
{
 const g=createGame(1);enqueue(g,'a','eat');start(g);runFor(g,1);assert.match(g.actors[0].current.reason,/没有餐食/);assert.equal(g.objects.find(o=>o.id==='bench').busyBy,null);command(g,{type:'cancel',actor:'a'});
 enqueue(g,'a','cook');enqueue(g,'a','cook');runFor(g,18);assert.equal(g.meals,2);enqueue(g,'a','cook');runFor(g,1);assert.match(g.actors[0].current.reason,/餐食已满/);assert.equal(g.objects.find(o=>o.id==='stove').busyBy,null);command(g,{type:'cancel',actor:'a'});
 enqueue(g,'a','eat');runFor(g,9);assert.equal(g.meals,1);assert.equal(g.actors[0].completed.eat,1);assert.ok(g.actors[0].needs.hunger<=100);
 const bad=checkpoint(g);bad.game.actors[1].id='a';assert.equal(restore(bad),null);
}
console.log(JSON.stringify({ok:true,schedules:results.map(({id,time,state})=>({id,time,state})),checks:8}));
