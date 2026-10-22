import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v3/games/feather/model.mjs';
import {completedSummary} from '../../versions/v3/games/feather/summary-review.mjs';
const before=JSON.parse(fs.readFileSync(new URL('./before-verification.json',import.meta.url),'utf8'));
const after=JSON.parse(fs.readFileSync(new URL('./local-verification.json',import.meta.url),'utf8'));
const earned=JSON.parse(fs.readFileSync(new URL('./earned-ending.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync('versions/v3/games/feather/fixtures.json','utf8'));
const checks=[],act=(s,kind,arg)=>assert(M.input(s,{kind,arg,revision:s.revision}),kind);
const restored=report=>{const x=report.states.at(-1).snapshot;return M.restore({version:3,origin:x.origin,commands:x.commands});};
const check=(name,fn)=>{fn();checks.push(name);};
check('Unfinished journey has no invented summary or state changes',()=>{
 const s=M.createGame(),old=structuredClone(s);assert.equal(completedSummary(s),null);assert.deepEqual(s,old);
});
check('Real normal-UI completed record after free travel replays the exact earned ending',()=>{
 const s=restored(before);assert(s&&s.ending===null);assert(s.base.outing>earned.ending.outings);assert.deepEqual(completedSummary(s),earned.ending);
});
check('Changed team and later travel retain original actors, outing count and growth snapshot',()=>{
 const s=restored(after);assert.deepEqual(s.base.team,['b','c']);assert(s.base.outing>earned.ending.outings);assert.deepEqual(completedSummary(s),earned.ending);
});
check('Repeated reading and mutation of a returned copy never changes current state/checkpoint',()=>{
 const s=restored(after),old=structuredClone(s),cp=M.checkpoint(s);
 for(let i=0;i<20;i++){const summary=completedSummary(s);assert.deepEqual(summary,earned.ending);summary.outings=999;summary.companions.push('invalid');summary.actions.trialSkill=999;assert.deepEqual(s,old);assert.deepEqual(M.checkpoint(s),cp);}
});
check('A later legitimate new companion does not rewrite the completion roster',()=>{
 const s=restored(after);act(s,'depart');for(const d of ['right','right','right','right','right','right','up','up'])act(s,'move',d);act(s,'attack');act(s,'soothe');act(s,'soothe');act(s,'capture');if(M.phase(s)==='encounter')act(s,'capture');act(s,'home');assert.equal(s.base.roster.length,5);assert.equal(completedSummary(s).companions.length,4);assert.deepEqual(completedSummary(s),earned.ending);
});
for(const policy of fixtures.strategies)check('Existing imported-v2 origin and ending/free-travel replay: '+policy.team.join('+')+' (OFFLINE MODEL)',()=>{
 const s=M.createGame(undefined,fixtures.preparedOrigin);
 for(const id of policy.team)if(!s.base.team.includes(id)){if(s.base.team.length===2)act(s,'team',s.base.team.find(x=>!policy.team.includes(x)));act(s,'team',id);}
 act(s,'lead',policy.team[0]);act(s,'trialStart');for(const c of policy.path)act(s,c.kind,c.arg);const expected=structuredClone(s.ending);assert.deepEqual(completedSummary(s),expected);act(s,'continue');act(s,'depart');act(s,'move','up');act(s,'home');assert.deepEqual(completedSummary(M.restore(M.checkpoint(s))),expected);
});
check('Invalid/incomplete records return null without modifying supplied data',()=>{
 for(const bad of [null,{}, {version:2}, {version:3,journey:{completed:true},commands:[]}, {version:3,origin:M.V2.checkpoint(M.V2.createGame()),journey:{completed:true},commands:[{kind:'depart',revision:9}]}]){const old=structuredClone(bad);assert.equal(completedSummary(bad),null);assert.deepEqual(bad,old);}
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'Read-only reconstruction tests over actual UI-earned command evidence; imported origins and later-companion branches are separately labelled offline model commands, never installed into a browser.',modelChanged:false},null,2));
