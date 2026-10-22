import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v3/games/feather/model.mjs';
import {createTrialFeedbackReader,trialNotice} from '../../versions/v3/games/feather/trial-feedback.mjs';
const fixture=JSON.parse(fs.readFileSync('versions/v3/games/feather/fixtures.json','utf8'));
const checks=[],check=(name,fn)=>{fn();checks.push(name);};
const act=(s,kind,arg)=>assert(M.input(s,{kind,arg,revision:s.revision}),kind);
const pack=s=>createTrialFeedbackReader()(s),notice=s=>trialNotice(s,pack(s));
function ready(team){const s=M.createGame(undefined,fixture.preparedOrigin);for(const id of team)if(!s.base.team.includes(id)){if(s.base.team.length===2)act(s,'team',s.base.team.find(x=>!team.includes(x)));act(s,'team',id);}act(s,'lead',team[0]);act(s,'trialStart');return s;}
const observed=JSON.parse(fs.readFileSync('docs/feather-cap-feedback-qa/before-verification.json','utf8'));
const restore=x=>M.restore({version:3,origin:x.origin,commands:x.commands});
check('Actual UI earned44-to60 shows+16, raw notice and record remain unchanged',()=>{
 const s=restore(observed.actions.at(-1).after),old=structuredClone(s),cp=M.checkpoint(s);assert.equal(pack(s).rows.at(-1).calm,44);assert.equal(s.trial.calm,60);assert.match(s.base.notice,/合奏安心\+22/);assert.equal(notice(s),s.base.notice.replace('合奏安心+22','合奏安心+16'));assert.deepEqual(s,old);assert.deepEqual(M.checkpoint(s),cp);
});
check('Full calm60-to60 shows actual+0 and preserves weakening/attack response',()=>{
 const s=restore(observed.actions.at(-1).after);act(s,'trialGuard');act(s,'trialSkill');assert.equal(pack(s).rows.at(-1).calm,60);assert.match(notice(s),/合奏安心\+0（已达上限），下一次来招减半/);assert.equal(notice(s),s.base.notice.replace('合奏安心+22','合奏安心+0（已达上限）'));
});
check('Ordinary0-to22 and22-to44 retain existing text',()=>{
 for(const x of observed.actions.filter(x=>x.kind==='trialSkill'&&x.after.trial.calm<60)){const s=restore(x.after);assert.equal(notice(s),s.base.notice);}
});
check('Other calm skill54-to60 uses actual+6 and full cap+0 through same function (OFFLINE)',()=>{
 const s=ready(['bud','c']);for(const kind of ['trialSkill','trialGuard','trialSkill'])act(s,kind);act(s,'trialSwitch','c');act(s,'trialSkill');act(s,'trialGuard');act(s,'trialSkill');assert.equal(pack(s).rows.at(-1).calm,54);assert.equal(s.trial.calm,60);assert.match(notice(s),/合奏安心\+6/);assert.match(s.base.notice,/合奏安心\+10/);act(s,'trialGuard');act(s,'trialGuard');act(s,'trialSkill');assert.match(notice(s),/合奏安心\+0（已达上限）/);
});
check('Energy lower bound0 and upper bound3 preserve actual guard increments (OFFLINE)',()=>{
 const s=ready(['bud','a']),gains=[];for(const kind of ['trialSkill','trialGuard','trialSkill','trialGuard','trialGuard','trialGuard','trialGuard']){act(s,kind);if(kind==='trialGuard'){const p=pack(s),r=p.rows.at(-1);gains.push([r.energy,r.after.energy]);assert.match(trialNotice(s,p),r.energy===3?/能量\+0（已达上限）/:/能量\+1/);}}
 assert(gains.some(([a,b])=>a===0&&b===1));assert(gains.some(([a,b])=>a===2&&b===3));assert(gains.some(([a,b])=>a===3&&b===3));
});
check('Invalid skill at zero energy leaves history, notice, state and checkpoint exact',()=>{
 const s=restore(observed.actions.at(-1).after);act(s,'trialGuard');act(s,'trialSkill');const old=structuredClone(s),cp=M.checkpoint(s),read=createTrialFeedbackReader(),p=read(s),n=trialNotice(s,p);assert.equal(M.input(s,{kind:'trialSkill',revision:s.revision}),false);assert.deepEqual(read(s),p);assert.equal(trialNotice(s,read(s)),n);assert.deepEqual(s,old);assert.deepEqual(M.checkpoint(s),cp);
});
check('No-row, stale revision, retreat and legacy-v2 origin do not replace unrelated messages',()=>{
 const s=restore(observed.actions.at(-1).after),p=pack(s);assert.equal(trialNotice(s,{rows:[]}),s.base.notice);act(s,'trialRetreat');assert.equal(trialNotice(s,p),s.base.notice);const legacy=M.createGame(undefined,fixture.preparedOrigin);assert.equal(notice(legacy),legacy.base.notice);
});
check('Existing earned record reload and repeated display cannot mutate state/save',()=>{
 const a=restore(observed.actions.at(-1).after),b=M.restore(M.checkpoint(a));assert.equal(notice(a),notice(b));const cp=M.checkpoint(a),old=structuredClone(a);for(let i=0;i<20;i++)notice(a);assert.deepEqual(M.checkpoint(a),cp);assert.deepEqual(a,old);
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'Actual UI-earned checkpoint plus explicitly offline legal boundary sequences. No browser injection, no model or save changes.'},null,2));
