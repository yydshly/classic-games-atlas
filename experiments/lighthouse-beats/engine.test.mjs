import test from 'node:test';import assert from 'node:assert/strict';
import {SETS,WINDOW,fresh,createRun,dueOf,durationOf,tick,press,release,cancelHold,pause,resume,finishRecord,snapshot,restore} from './engine.mjs';
function advance(s,to){while(s.phase==='running'&&s.elapsed<to-.001)tick(s,Math.min(.03,to-s.elapsed));}
function play(s){s.phase='running';for(const n of s.set.notes){advance(s,dueOf(n,s.set));assert.equal(press(s,n.lane),true);if(n.hold){advance(s,s.elapsed+durationOf(n,s.set));assert.equal(release(s,n.lane),true);}}advance(s,dueOf(s.set.notes.at(-1),s.set)+durationOf(s.set.notes.at(-1),s.set)+WINDOW+.5);}
test('five patterns add alternating, rests, holds and composite decisions',()=>{
  assert.equal(SETS.length,5);assert(SETS[1].notes.some(n=>n.lane==='right'));assert(SETS[2].notes.some(n=>n.at%1));assert(SETS[3].notes.some(n=>n.hold));assert(SETS[4].notes.some(n=>n.hold)&&SETS[4].notes.some(n=>n.at%1));
  const r=fresh();for(const set of SETS){const s=createRun(set.id);play(s);assert.equal(s.phase,set.id===5?'complete':'won',set.name);assert.equal(finishRecord(r,s),true);assert.equal(finishRecord(r,s),true);assert.equal(r.completed.length,set.id);}
  assert.equal(r.unlocked,5);
});
test('wrong lane, empty beat and missing a cue can fail without hidden penalty',()=>{
  const s=createRun(1);s.phase='running';press(s,'left');assert.equal(s.errors,1);advance(s,dueOf(s.set.notes[0],s.set));press(s,'right');assert.equal(s.errors,2);advance(s,dueOf(s.set.notes[1],s.set)+WINDOW+.03);assert.equal(s.phase,'failed');assert(s.errors>2);
});
test('hold needs a timely release, pause rewinds an interrupted hold',()=>{
  const s=createRun(4);s.phase='running';advance(s,dueOf(s.set.notes[0],s.set));press(s,'left');advance(s,s.elapsed+.15);release(s,'left');assert.equal(s.grades[0],'miss');
  const t=createRun(4);t.phase='running';advance(t,dueOf(t.set.notes[0],t.set));press(t,'left');advance(t,t.elapsed+.15);pause(t);assert.equal(t.phase,'paused');assert.equal(t.grades[0],null);assert(t.elapsed<dueOf(t.set.notes[0],t.set));resume(t);advance(t,dueOf(t.set.notes[0],t.set));assert.equal(press(t,'left'),true);
  assert.equal(cancelHold(t,'left'),true);assert.equal(t.errors,0);assert.equal(t.grades[0],null);
});
test('save of active stage resumes paused without changing other records',()=>{
  const r=fresh();r.unlocked=3;r.completed=[1,2];const s=createRun(3);s.phase='running';advance(s,.7);r.run=s;
  const raw=JSON.parse(JSON.stringify({...r,run:snapshot(s)})),restored=restore(raw);
  assert.equal(restored.run.phase,'paused');assert.equal(restored.run.stage,3);assert.deepEqual(restored.completed,[1,2]);assert.deepEqual(restore({schema:9,unlocked:5,completed:[5]}),fresh());
});
