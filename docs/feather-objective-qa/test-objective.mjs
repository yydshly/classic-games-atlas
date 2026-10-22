import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v3/games/feather/model.mjs';
import {journeyObjective} from '../../versions/v3/games/feather/objective-feedback.mjs';
const evidence=JSON.parse(fs.readFileSync(new URL('./before-verification.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync('versions/v3/games/feather/fixtures.json','utf8'));
const checks=[];const check=(name,fn)=>{fn();checks.push(name);};
const saved=label=>{
 const snapshot=evidence.cases[0].stages.find(x=>x.label===label).snapshot;
 const s=M.restore({version:3,origin:snapshot.origin,commands:snapshot.commands});assert(s);return s;
};
const act=(s,kind,arg)=>assert(M.input(s,{kind,arg,revision:s.revision}),kind);
const oldText=s=>M.progress(s).completed?'旅途已完成，归羽营地仍欢迎自由出行。':s.trial?'属性和来招都已预告：每次行动都占一拍，看清再决定。':M.readiness(s)||'准备就绪：可以自由编队，在营地迎接浅滩回响。';
check('All15 ordinary-UI observed states replay and preview without changing state/checkpoint/gates',()=>{
 for(const item of evidence.cases[0].stages){
  const s=saved(item.label),before=structuredClone(s),cp=M.checkpoint(s),gate=M.allowed(s,'trialStart');
  assert.equal(typeof journeyObjective(s),'string');assert.deepEqual(s,before);assert.deepEqual(M.checkpoint(s),cp);assert.equal(M.allowed(s,'trialStart'),gate);assert(Object.values(M.invariants(s)).every(Boolean));
 }
});
check('Camp instructions keep existing readiness rules and wording',()=>{
 for(const label of ['01-search-camp','05-adjust-camp','06-growth-camp','10-ready-camp','12-return-camp']){const s=saved(label);assert.equal(journeyObjective(s),oldText(s));}
});
check('Searching field/encounter direct toward a new partner instead of premature return',()=>{
 assert.match(journeyObjective(saved('02-search-explore')),/晶芽草间.*回声浅湾/);assert.match(journeyObjective(saved('03-search-encounter')),/羽结/);
 assert(!journeyObjective(saved('02-search-explore')).startsWith('先回营'));
});
check('Pending capture says return for registration but does not mark discovery/adjustment complete',()=>{
 const s=saved('04-pending-explore');assert.match(journeyObjective(s),/晶雾芽回营入册/);assert.equal(M.progress(s).discovered,false);assert(M.allowed(s,'trialStart'));
});
check('Growth remains actionable in camp, field and encounter; readiness appears only after growth',()=>{
 for(const label of ['06-growth-camp','07-growth-explore','08-growth-encounter']){const s=saved(label);assert.equal(M.progress(s).grown,false);assert.match(journeyObjective(s),/两次有结果的相遇/);assert(!journeyObjective(s).startsWith('准备就绪'));}
 assert.match(journeyObjective(saved('09-grown-explore')),/^准备就绪：回营/);
});
check('Registered but unadjusted team in field correctly points back to camp',()=>{
 const s=saved('05-adjust-camp');act(s,'depart');assert.match(journeyObjective(s),/回营调整队伍/);assert.equal(M.progress(s).adjusted,false);
});
check('Ready milestones with one team slot still use existing choose-two readiness',()=>{
 const s=saved('10-ready-camp');act(s,'team',s.base.team[0]);assert.equal(s.base.team.length,1);assert.match(journeyObjective(s),/选好两位/);assert.equal(journeyObjective(s),M.readiness(s));
});
check('Trial prompt stays exact and is independent of field objective',()=>{
 const s=saved('11-trial');assert.equal(journeyObjective(s),oldText(s));assert.match(journeyObjective(s),/每次行动都占一拍/);
});
for(const policy of fixtures.strategies)check('Completed goal stable in ending, camp and free exploration: '+policy.team.join('+')+' (OFFLINE MODEL ONLY)',()=>{
 const s=M.createGame(undefined,fixtures.preparedOrigin);
 for(const id of policy.team)if(!s.base.team.includes(id)){
  if(s.base.team.length===2)act(s,'team',s.base.team.find(x=>!policy.team.includes(x)));
  act(s,'team',id);
 }
 act(s,'lead',policy.team[0]);act(s,'trialStart');for(const c of policy.path)act(s,c.kind,c.arg);
 assert.equal(M.phase(s),'ending');assert(s.journey.completed);const cp=M.checkpoint(s),message=journeyObjective(s);assert.equal(message,oldText(s));assert.deepEqual(M.checkpoint(s),cp);
 act(s,'continue');assert.equal(journeyObjective(s),message);act(s,'depart');assert.equal(journeyObjective(s),message);assert.deepEqual(M.restore(M.checkpoint(s)),s);
});
const report={passed:true,groups:checks.length,checks,method:'Read-only presentation over15 states restored from current normal-UI command evidence. Completed branches use legal existing prepared-origin/strategy OFFLINE MODEL commands only, not a new browser ending.',runtimeModelChanged:false};
console.log(JSON.stringify(report,null,2));
