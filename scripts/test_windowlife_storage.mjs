import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,start,update,command,checkpoint} from '../preview/windowlife/engine.mjs';
import {fresh,validate,readSave,writeSave,KEY} from '../preview/windowlife/storage.mjs';
const plans=JSON.parse(readFileSync(new URL('./fixtures/windowlife-schedules.json',import.meta.url))).schedules;
const p=fresh();
for(let index=0;index<3;index++){
 const g=createGame(index),plan=plans.find(s=>s.level===index+1);start(g);let at=0;
 while(g.state==='playing'){
  while(at<plan.commands.length&&plan.commands[at].at<=g.time+.00001){const c=plan.commands[at++];assert.equal(command(g,{type:'enqueue',actor:c.actor,kind:c.kind}).ok,true);}
  update(g,.1);p.last=g.level;p.current=checkpoint(g);p.layouts[g.level]=Object.fromEntries(g.objects.filter(o=>['desk','bench'].includes(o.id)).map(o=>[o.id,{x:o.x,y:o.y}]));
  if(g.state==='won'){p.completed[g.level]={level:g.level,title:g.title,time:g.time,people:g.actors.map(a=>({name:a.name,needs:{...a.needs}}))};p.unlocked=Math.min(3,g.level+1);}
  assert.ok(validate(p),'whole progress round-trip '+g.level+' at '+g.time);
 }assert.equal(g.state,'won');
}
const original=JSON.stringify(p);let raw=original,fail=false;const store={getItem:()=>raw,setItem(k,v){assert.equal(k,KEY);if(fail)throw new Error('quota');raw=v;}};
assert.equal(readSave(store).game.state,'won');fail=true;assert.equal(writeSave(store,fresh(),null),false);assert.equal(raw,original);fail=false;assert.equal(writeSave(store,p,null),true);
raw='{bad original';const bad=readSave(store);assert.equal(bad.protection,'invalid');assert.equal(writeSave(store,fresh(),bad.protection),false);assert.equal(raw,'{bad original');
const invalid=JSON.parse(original);invalid.current.game.actors[0].needs.hunger=-1;assert.equal(validate(invalid),null);
const inaccessible={getItem(){throw new Error('denied');},setItem(){throw new Error('must not write');}};assert.equal(readSave(inaccessible).protection,'unavailable');assert.equal(writeSave(inaccessible,p,'unavailable'),false);
console.log(JSON.stringify({passed:true,checks:['three-day whole-progress roundtrip every tick','terminal result preserved','failed write retains old bytes','subsequent write succeeds','bad bytes never overwritten','invalid checkpoint rejected','read denial protected']}));
