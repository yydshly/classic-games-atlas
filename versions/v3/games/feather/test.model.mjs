import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as M from './model.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures.json',import.meta.url),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x)),cases=[],strategies=[];
const check=(name,fn)=>{fn();cases.push(name);};
const digest=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const legacyModel=fs.readFileSync(new URL('../../../v2/games/feather/model.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
const act=(s,kind,arg)=>{assert(M.input(s,{kind,...(arg?{arg}:{}),revision:s.revision}),kind);assert(Object.values(M.invariants(s)).every(Boolean),JSON.stringify(M.invariants(s)));assert.deepEqual(M.restore(M.checkpoint(s)),s);};
function ready(team){
 const s=M.createGame(undefined,fixture.preparedOrigin);
 for(const id of team)if(!s.base.team.includes(id)){
  if(s.base.team.length===2)act(s,'team',s.base.team.find(q=>!team.includes(q)));
  act(s,'team',id);
 }
 act(s,'lead',team[0]);assert.equal(M.readiness(s),'');return s;
}
check('Frozen v2 model bytes retain their baseline hash',()=>assert.equal(digest(legacyModel),fixture.frozenModelSHA256));
check('New journey has a visible preparation boundary',()=>{const s=M.createGame();assert(M.readiness(s));assert.equal(M.allowed(s,'trialStart'),M.readiness(s));});
check('Old command replay imports camp, exploration and encounter states exactly',()=>{
 const cp=fixture.legacyReplay,phases=new Set();
 for(const n of [0,3,6,8,cp.commands.length]){
  const origin={...cp,commands:cp.commands.slice(0,n)},v2=M.V2.restore(origin);assert(v2);phases.add(v2.phase);
  const s=M.createGame(undefined,origin);assert.deepEqual(s.base,v2);assert.deepEqual(s.origin,origin);assert.deepEqual(M.restore(M.checkpoint(s)),s);
 }
 assert.deepEqual([...phases].sort(),['camp','encounter','explore']);
});
check('Prepared roster and growth come from legal old commands',()=>{
 const s=M.V2.restore(fixture.preparedOrigin);assert.equal(s.roster.length,5);assert(s.roster.every(p=>p.rank===1&&p.xp===2));
 for(const p of s.roster){assert.equal(M.maxHP(p),M.SPECIES[p.id].hp+8);assert.equal(M.power(p),M.SPECIES[p.id].power+2);}
});
for(const policy of fixture.strategies)check('Distinct team succeeds with meaningful skills: '+policy.team.join('+'),()=>{
 const s=ready(policy.team);act(s,'trialStart');const trace=[],used=new Set();
 for(const c of policy.path){
  const before=copy(s),p=M.active(s.base),mode=M.trialIntent(s),element=M.trialElement(s),predicted=M.trialIncoming(s);
  assert.equal(p.id,c.actor);act(s,c.kind,c.arg);
  trace.push({beat:before.trial.turn+1,actor:p.id,kind:c.kind,arg:c.arg,element,intent:mode,predictedIncoming:predicted,
   beforeTeam:before.base.team.map(id=>M.partner(before.base,id)),afterTeam:s.base.team.map(id=>copy(M.partner(s.base,id))),notice:s.base.notice});
  if(c.kind==='trialSkill'){used.add(p.id);if(p.id==='b')assert(before.base.roster.find(q=>q.id==='b').hp<M.maxHP(p),'healing skill must actually restore HP');}
 }
 assert(s.ending&&s.journey.completed);assert.equal(used.size,2);assert(s.ending.actions.trialGuard>0&&s.ending.actions.trialSwitch>0);
 assert.deepEqual(M.restore(M.checkpoint(s)),s);const ending=copy(s.ending);
 act(s,'continue');act(s,'depart');assert.equal(M.phase(s),'explore');assert(s.journey.completed);
 strategies.push({team:policy.team,ending,trace});
});
const attackOnly=[];
check('Attack-only fails for all 20 ordered two-partner teams at maximum finite growth',()=>{
 for(const a of Object.keys(M.SPECIES))for(const b of Object.keys(M.SPECIES))if(a!==b){
  const s=ready([a,b]);act(s,'trialStart');while(s.trial)act(s,'trialAttack');
  assert.equal(s.journey.completed,false);assert.equal(s.base.phase,'camp');attackOnly.push({team:[a,b],...s.journey.lastAttempt});
 }
});
check('Failure preserves roster/growth, restores by replay and allows free preparation',()=>{
 const s=ready(['a','bud']),roster=s.base.roster.map(p=>({id:p.id,xp:p.xp,rank:p.rank}));
 act(s,'trialStart');while(s.trial)act(s,'trialAttack');
 assert.equal(s.journey.lastAttempt.outcome,'defeated');assert.deepEqual(s.base.roster.map(p=>({id:p.id,xp:p.xp,rank:p.rank})),roster);
 const captures=s.base.stats.captures;act(s,'trialStart');assert.equal(s.base.stats.captures,captures);assert.equal(s.trial.berries,2);
 assert(s.base.roster.every(p=>p.hp===M.maxHP(p)&&p.energy===3));act(s,'trialRetreat');assert.equal(s.base.phase,'camp');
});
check('Malformed or stale new records are rejected without modifying old snapshots',()=>{
 for(const cp of [null,{version:3,commands:[]},{version:2},{version:3,origin:{version:2},commands:[]},
  {version:3,origin:fixture.preparedOrigin,commands:[{kind:'trialStart',revision:9}]}])assert.equal(M.restore(cp),null);
 const s=M.createGame(),before=copy(s);assert.equal(M.input(s,{kind:'depart',revision:9}),false);assert.deepEqual(s,before);
});
const report={kind:'model-only legal commands and replay, not browser/human play',passed:true,tests:cases,attackOnlyTeams:attackOnly.length,attackOnly,strategies,
 developmentNotes:['First 132-HP draft allowed attack-only victories and was rejected.','210-HP bounded search found no qualifying policy; this is not proof of impossibility.','Final 190-HP/24-beat challenge: two distinct policy wins; attack-only fails for all 20 ordered teams.','Preparation helper was corrected to reset the lead between trips and to replace one team member at a time. No game rules changed for those harness fixes.']};
const target=new URL('../../../../docs/feather-journey-qa/model-report.json',import.meta.url);fs.mkdirSync(new URL('.',target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,tests:cases.length,attackOnlyTeams:attackOnly.length,strategies:strategies.map(p=>({team:p.team,turns:p.ending.turns}))}));
