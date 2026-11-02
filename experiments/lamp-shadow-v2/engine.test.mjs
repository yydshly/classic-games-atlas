import test from 'node:test';import assert from 'node:assert/strict';
import {STAGES,createRun,tile,move,tick,seen,chime,guardFacing,newRecord,finish,snapshot,validateRecord} from './engine.mjs';

const dirs=[[0,-1,'up'],[1,0,'right'],[0,1,'down'],[-1,0,'left']];
function pathFrom(plan,start,target){const q=[[...start,[]]],used=new Set([start.join(',')]);for(let i=0;i<q.length;i++){
  const [x,y,path]=q[i];if(x===target[0]&&y===target[1])return path;
  for(const [dx,dy,name] of dirs){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(plan.map[ny]?.[nx]&&plan.map[ny][nx]!=='#'&&!used.has(key)){used.add(key);q.push([nx,ny,[...path,name]]);}}
}return null;}
test('all five distinct layouts have legal document and exit paths',()=>{
  assert.equal(STAGES.length,5);assert.equal(new Set(STAGES.map(s=>s.map.join(''))).size,5);
  for(const p of STAGES){assert.equal(p.map.length,9);p.map.forEach(r=>assert.equal(r.length,11));
    assert.ok(p.map.join('').includes('C'),`${p.id} has a readable shadow stop`);
    const s=createRun(p.id);let at=[s.x,s.y];for(let y=0;y<9;y++)for(let x=0;x<11;x++)if(tile(s,x,y)==='D'){const path=pathFrom(p,at,[x,y]);assert.ok(path,`${p.id} document ${x},${y}`);at=[x,y];}
    const ex=p.map.map((r,y)=>[r.indexOf('X'),y]).find(([x])=>x>=0);assert.ok(pathFrom(p,at,ex),`${p.id} exit`);
    for(const g of s.guards)for(const [x,y] of g.path)assert.notEqual(tile(s,x,y),'#');
  }
});
test('document required, movement blocked by walls, stage record advances once',()=>{
  const s=createRun(1),r=newRecord();s.phase='running';assert.equal(move(s,'left'),false);assert.equal(s.steps,0);
  const ex=[9,1],p=pathFrom(s.plan,[s.x,s.y],ex);for(const d of p){move(s,d);tick(s,.08);tick(s,.08);}
  assert.equal(s.phase,'won');assert.equal(s.collected.length,1);assert.equal(finish(r,s),true);assert.equal(finish(r,s),true);assert.deepEqual(r.completed,[1]);assert.equal(r.unlocked,2);
});
test('shadow cover prevents line exposure but not direct guard collision',()=>{
  const s=createRun(1);s.phase='running';s.x=5;s.y=3;assert.ok(seen(s));tick(s,.08);assert.equal(s.phase,'running');assert.ok(s.suspicion>0);
  s.x=3;s.y=3;assert.equal(tile(s,s.x,s.y),'C');assert.equal(seen(s),false);tick(s,.08);assert.equal(s.suspicion,0);
  s.x=5;s.y=3;for(let i=0;i<10;i++)tick(s,.08);assert.equal(s.phase,'failed');
  const t=createRun(1);t.phase='running';t.x=3;t.y=3; t.guards[0].index=0;assert.equal(seen(t),false);t.guards[0].index=0;t.x=4;assert.equal(seen(t),true);
});
test('sound only affects nearby guards and visibly turns their cone',()=>{
  const s=createRun(2);s.phase='running';s.x=1;s.y=7;
  assert.equal(chime(s),false);assert.equal(s.chimes,1);
  s.x=2;s.y=1;assert.equal(chime(s),true);assert.equal(s.chimes,0);assert.equal(s.guards[0].linger,1.8);assert.equal(s.guards[1].linger,0);
  assert.equal(guardFacing(s.guards[0]),'left');assert.equal(chime(s),false);
  const t=createRun(4);t.phase='running';t.x=1;t.y=5;
  assert.equal(chime(t),true);assert.equal(chime(t),false);assert.equal(t.chimes,1);
  for(let i=0;i<7;i++)tick(t,.08);
  assert.equal(chime(t),true);assert.equal(t.chimes,0);
});
test('save recovery pauses active run and invalid schema fails closed',()=>{
  const s=createRun(4),r=newRecord();r.unlocked=4;s.phase='running';s.x=2;s.y=6;s.collected=['8,2'];s.suspicion=.45;s.guards[0].linger=1.2;s.guards[0].focus='left';r.run=s;
  const copy=validateRecord(JSON.parse(JSON.stringify({...r,run:snapshot(s)})));
  assert.equal(copy.run.phase,'paused');assert.equal(copy.run.x,2);assert.deepEqual(copy.run.collected,['8,2']);
  assert.equal(copy.run.suspicion,.45);assert.equal(copy.run.guards[0].focus,'left');assert.equal(copy.run.guards[0].linger,1.2);
  assert.deepEqual(validateRecord({schema:99,unlocked:5,completed:[5]}),newRecord());
});
