import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v3/games/feather/model.mjs';
import {createTrialFeedbackReader,trialFeedbackText,trialNotice} from '../../versions/v3/games/feather/trial-feedback.mjs';
const before=JSON.parse(fs.readFileSync(new URL('./before-verification.json',import.meta.url),'utf8'));
const local=JSON.parse(fs.readFileSync(new URL('./local-verification.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync('versions/v3/games/feather/fixtures.json','utf8'));
const checks=[],check=(name,fn)=>{fn();checks.push(name);};
const restored=x=>M.restore({version:3,origin:x.origin,commands:x.commands});
const act=(s,kind,arg)=>assert(M.input(s,{kind,arg,revision:s.revision}),kind);
const baseline=()=>restored(before.states.at(-1).snapshot);
check('Real three-action trace reconstructs exact observed resource/target transitions',()=>{
 const s=baseline(),pack=createTrialFeedbackReader()(s);assert(pack.valid);assert.equal(pack.rows.length,3);
 for(let i=0;i<3;i++){
  const observation=before.initialThreeActions[i],row=pack.rows[i],old=observation.before,next=observation.after;
  const id=row.kind==='trialSwitch'?observation.arg:old.base.active,p=old.base.roster.find(x=>x.id===id),q=next.base.roster.find(x=>x.id===id);
  assert.equal(row.energy,p.energy);assert.equal(row.after.energy,q.energy);assert.equal(row.hp,p.hp);assert.equal(row.after.hp,q.hp);assert.equal(row.surplus,old.trial.hp);assert.equal(row.after.surplus,next.trial.hp);assert.equal(row.after.calm,next.trial.calm);
 }
 assert.match(pack.rows[0].response,/护盾吸收15/);assert.equal(pack.rows[0].energy,pack.rows[0].after.energy);
});
check('Incremental reader and a restored old record give identical bounded rows',()=>{
 const s=M.createGame(),read=createTrialFeedbackReader(),cp=M.checkpoint(baseline());
 for(const c of cp.commands){act(s,c.kind,c.arg);const old=structuredClone(s);const pack=read(s);assert(pack.valid&&pack.rows.length<=3);assert.deepEqual(s,old);}
 assert.deepEqual(read(s),createTrialFeedbackReader()(M.restore(cp)));
});
check('Repeated reads and returned-copy changes do not modify game or record',()=>{
 const s=baseline(),read=createTrialFeedbackReader(),old=structuredClone(s),cp=M.checkpoint(s),expected=read(s);
 for(let i=0;i<20;i++){const pack=read(s);assert.deepEqual(pack,expected);pack.rows[0].after.hp=999;assert.deepEqual(s,old);assert.deepEqual(M.checkpoint(s),cp);}
});
check('Invalid skill creates no phantom row and consumes no command',()=>{
 const x=local.actions.find(x=>x.kind==='trialSkill'&&x.after.trial?.turn===6).after,s=restored(x),read=createTrialFeedbackReader(),old=read(s),cp=M.checkpoint(s);assert.equal(M.input(s,{kind:'trialSkill',revision:s.revision}),false);assert.deepEqual(read(s),old);assert.deepEqual(M.checkpoint(s),cp);
});
check('Full-energy guard display uses actual zero gain; positive regeneration stays unchanged',()=>{
 const source=before.initialThreeActions[0].after,s=restored(source),pack=createTrialFeedbackReader()(s);assert.match(s.base.notice,/能量\+1/);assert.match(trialNotice(s,pack),/能量\+0（已达上限）/);
 const t=restored(before.initialThreeActions[1].after);act(t,'trialGuard');const p=createTrialFeedbackReader()(t);assert.equal(p.rows.at(-1).after.energy-p.rows.at(-1).energy,1);assert.equal(trialNotice(t,p),t.base.notice);
});
check('Retreat retains last beats, retry clears them and a fresh journey cannot leak them',()=>{
 const s=baseline(),read=createTrialFeedbackReader(),old=read(s);act(s,'trialRetreat');assert.deepEqual(read(s).rows,old.rows);act(s,'trialStart');assert.equal(read(s).rows.length,0);act(s,'trialGuard');assert.equal(read(s).rows.length,1);assert.equal(read(s).attempt,2);assert.equal(read(M.createGame()).rows.length,0);
});
function ready(team){const s=M.createGame(undefined,fixtures.preparedOrigin);for(const id of team)if(!s.base.team.includes(id)){if(s.base.team.length===2)act(s,'team',s.base.team.find(x=>!team.includes(x)));act(s,'team',id);}act(s,'lead',team[0]);act(s,'trialStart');return s;}
check('Terminal overwrite does not invent missing damage/absorption facts',()=>{
 const s=ready(['a','bud']),read=createTrialFeedbackReader();while(s.trial){act(s,'trialAttack');read(s);}const last=read(s).rows.at(-1);assert.equal(s.journey.lastAttempt.outcome,'defeated');assert.equal(last.response,'');assert.equal(trialFeedbackText(last).response,'');assert.equal(last.after.hp,0);
});
check('Legacy-v2 origin has no invented trial history; existing completion stays readable',()=>{
 const origin=M.createGame(undefined,fixtures.preparedOrigin);assert.equal(createTrialFeedbackReader()(origin).rows.length,0);
 const s=ready(['a','bud']);for(const c of fixtures.strategies[0].path)act(s,c.kind,c.arg);const read=createTrialFeedbackReader(),won=read(s);assert.equal(won.rows.length,3);assert.equal(won.rows.at(-1).after.surplus,0);act(s,'continue');act(s,'depart');act(s,'home');assert.deepEqual(read(s).rows,won.rows);assert.deepEqual(createTrialFeedbackReader()(M.restore(M.checkpoint(s))),read(s));
});
check('Calm cap is shown as actual44-to60, not inferred nominal22 (OFFLINE MODEL)',()=>{
 const s=ready(['bud','a']),read=createTrialFeedbackReader();for(const kind of ['trialSkill','trialGuard','trialSkill','trialGuard','trialGuard','trialSkill']){act(s,kind);read(s);}const row=read(s).rows.at(-1);assert.equal(row.calm,44);assert.equal(row.after.calm,60);assert.match(trialFeedbackText(row).changes,/安心 44→60/);assert.match(s.base.notice,/合奏安心\+22/);
});
check('Invalid/stale records hide feedback without modifying supplied data',()=>{
 for(const s of [{}, {version:3,origin:fixtures.preparedOrigin,commands:[{kind:'depart',revision:99}]}]){const old=structuredClone(s),pack=createTrialFeedbackReader()(s);assert.equal(pack.valid,false);assert.equal(pack.rows.length,0);assert.deepEqual(s,old);}
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'Actual UI-earned trace plus separately labelled legal offline model branches. Reader never writes game/storage; unknown response facts omitted. No browser state injection or ending replay.',modelChanged:false},null,2));
