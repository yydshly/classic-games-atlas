import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as E from '../../experiments/inlet-deadline-preview/source/engine.mjs';

export const fixtures = JSON.parse(readFileSync(new URL('./routes.json', import.meta.url), 'utf8'));
assert.equal(fixtures.step, E.STEP);
const position = g => ({x: g.player.x, y: g.player.y});
export const summary = g => ({state: g.state, time: g.time, remaining: Math.round((g.limit-g.time)*100)/100,
  lives: g.lives, percent: g.percent, stats: {...g.stats}, reason: g.reason,
  objectives: g.objectives.map(({id,total,claimed,percent,target,complete}) => ({id,total,claimed,percent,target,complete}))});

// The runner's world is initialized normally and changed only by start,
// toggleDraw and update(STEP,input). Output snapshots are never loaded as input.
export function runner(level) {
  const g = E.createGame(level-1);
  assert(E.start(g));
  const cuts=[], attempts=[], losses=[], waypoints=[];
  let active=null;
  function step(dir=null, stage='moving') {
    if(g.state!=='playing') return false;
    const before={time:g.time,cuts:g.stats.cuts,losses:g.stats.losses,claimed:g.claimedCount,trail:g.trail.length};
    let candidate=null;
    const d=E.DIRECTIONS[dir];
    if(!active && !g.trail.length && g.drawArmed && d && !E.isClaimed(g,g.player.x+d.x,g.player.y+d.y)) {
      const original=JSON.stringify(E.checkpoint(g));
      const forecast=E.previewThreat(g,dir);
      assert.equal(JSON.stringify(E.checkpoint(g)),original,'forecast must be read-only');
      candidate={at:g.time,from:position(g),dir,forecast,straight:true};
    }
    if(active && dir && dir!==active.dir) active.straight=false;
    E.update(g,E.STEP,{dir});
    if(candidate && (g.trail.length || g.stats.cuts>before.cuts || g.stats.losses>before.losses || g.state!=='playing')) active=candidate;
    if(g.stats.cuts>before.cuts) cuts.push({time:g.time,...g.lastCapture,allObjectives:g.objectives.every(o=>o.complete),overall:g.percent+1e-8>=g.target,state:g.state});
    if(g.stats.losses>before.losses) losses.push({time:g.time,lives:g.lives,reason:g.reason,stage,claimedBefore:before.claimed,claimedAfter:g.claimedCount});
    if(active && (g.stats.cuts>before.cuts || g.stats.losses>before.losses || g.state!=='playing')) {
      const closed=g.stats.cuts>before.cuts,hit=g.stats.losses>before.losses;
      const risk=hit?'danger':g.state==='lost'&&g.time>=g.limit?'timeout':closed?'safe':'incomplete';
      const outcome={...active,end:g.time,duration:Math.round((g.time-active.at)*100)/100,closed,risk,state:g.state};
      if(active.straight) {
        assert.equal(active.forecast.risk,risk,'straight execution must match its departure forecast');
        assert.equal(active.forecast.closed,closed);
        if(closed) assert(Math.abs(outcome.duration-active.forecast.closeIn)<1e-8,'closure ETA must match real ticks');
        if(hit) assert(Math.abs(outcome.duration-active.forecast.hitIn)<1e-8,'collision ETA must match real ticks');
      }
      attempts.push(outcome);active=null;
    }
    return g.state==='playing';
  }
  function ticks(count,dir=null,stage='moving') {for(let i=0;i<count&&g.state==='playing';i++) step(dir,stage);}
  function arm(){const result=E.toggleDraw(g);assert.equal(result.ok,true);}
  return {g,cuts,attempts,losses,waypoints,step,ticks,arm};
}

export function replay(route, waitTicks=0, stopOnLoss=false) {
  const r=runner(route.level);
  for(const command of route.input) {
    assert(Number.isInteger(command.ticks)&&command.ticks>0);
    assert(command.dir===null||E.DIRECTIONS[command.dir]);
    assert.equal(typeof command.toggle,'boolean');
    if(r.g.state!=='playing')break;
    const from=position(r.g),at=r.g.time;
    if(command.toggle) {
      if(!r.g.drawArmed) for(let i=0;i<waitTicks&&r.g.state==='playing';i++) {
        r.step(null,'observation-wait');if(stopOnLoss&&r.losses.length)break;
      }
      if(r.g.state!=='playing'||stopOnLoss&&r.losses.length)break;
      r.arm();
    }
    for(let i=0;i<command.ticks&&r.g.state==='playing';i++) {
      r.step(command.dir);if(stopOnLoss&&r.losses.length)break;
    }
    r.waypoints.push({at,end:r.g.time,from,to:position(r.g),dir:command.dir,ticks:command.ticks,toggle:command.toggle});
    if(stopOnLoss&&r.losses.length)break;
  }
  return r;
}

export function deadline(level,at,dir='L') {
  const r=runner(level);
  r.ticks(level===2?42:30,'R');r.ticks(6,'D');
  assert.deepEqual(position(r.g),level===2?{x:8,y:1}:{x:6,y:1});
  const target=Math.round(at/E.STEP);
  while(r.g.ticks<target&&r.g.state==='playing')r.step(null,'observation-wait');
  assert.equal(r.g.time,at);assert.equal(r.g.lives,3);
  r.arm();
  const beforeCuts=r.g.stats.cuts;
  while(r.g.state==='playing'&&r.g.stats.cuts===beforeCuts&&!r.losses.length)r.step(dir);
  return r;
}

export function goalRules(level) {
  const g=E.createGame(level-1);
  const components=g.objectives.map(o=>({id:o.id,target:o.target,total:o.total,
    enemyIds:g.enemies.filter(e=>o.cells.some(c=>c.x===e.x&&c.y===e.y)).map(e=>e.id)}));
  const cells=g.objectives.flatMap(o=>o.cells.map(p=>p.y*E.WIDTH+p.x));
  assert.equal(new Set(cells).size,cells.length,'objective regions are disjoint');
  assert.equal(cells.length,g.totalClaimable,'every initially claimable cell belongs to one target region');
  return {level,limit:g.limit,lives:g.lives,overallTarget:g.target,totalClaimable:g.totalClaimable,components};
}
const compactAttempt=a=>({at:a.at,from:a.from,dir:a.dir,to:a.forecast.to,waterCells:a.forecast.cells.length,
  closeIn:a.forecast.closeIn,forecastRisk:a.forecast.risk,hitIn:a.forecast.hitIn,end:a.end,actualRisk:a.risk,closed:a.closed,straight:a.straight});
export function audit() {
  const routes=fixtures.routes.map(route=>{
    const r=replay(route);
    assert.equal(r.g.state,'won');assert.equal(r.g.lives,3);
    return {id:route.id,level:route.level,kind:route.kind,result:summary(r.g),attempts:r.attempts.map(compactAttempt),cuts:r.cuts,waypoints:r.waypoints};
  });
  const sensitivity=[];
  for(const route of fixtures.routes)for(const ticks of [5,10,25,50]) {
    const r=replay(route,ticks,true);
    sensitivity.push({id:route.id,waitBeforeEachArm:ticks*E.STEP,completed:r.g.state==='won',result:summary(r.g),
      firstLoss:r.losses[0]||null,attempts:r.attempts.map(compactAttempt)});
  }
  const boundaries=[];
  for(const [level,times] of [[2,[84,84.14,84.4]],[3,[89,89.38,89.4]]])for(const at of times) {
    const r=deadline(level,at);
    boundaries.push({level,at,result:summary(r.g),attempts:r.attempts.map(compactAttempt)});
  }
  return {scope:'per-bay legal input, fixed 0.02s model replay; no browser or human completion claim; no state injection',
    discovery:'fixed routes were selected with a model planner; replay and these checks do not import or run the planner',
    rules:[goalRules(2),goalRules(3)],routes,sensitivity,boundaries,
    limits:['not a complete search or human success-rate estimate','sensitivity inserts waits then blindly retains the old input sequence; actual forecasts are still checked','per-bay standard initialization does not certify UI unlocking, full journey transitions or real phone controls']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=audit();
  if(process.argv.includes('--write'))writeFileSync(new URL('./report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
