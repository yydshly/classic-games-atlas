import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v3/games/feather/model.mjs';
import {skillFeedback} from '../../versions/v3/games/feather/skill-feedback.mjs';
const fixtures=JSON.parse(fs.readFileSync('versions/v3/games/feather/fixtures.json','utf8'));
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
function fixture(id,trial){
 const s=M.createGame(undefined,fixtures.preparedOrigin);
 const act=(kind,arg)=>assert(M.input(s,{kind,arg,revision:s.revision}),kind);
 if(!s.base.team.includes(id)){act('team',s.base.team[0]);act('team',id);}
 act('lead',id);
 if(trial){act('trialStart');s.trial.turn=1;s.trial.calm=55;}
 else{act('depart');for(const d of ['up','up','right','right','right'])act('move',d);s.base.wild.turn=1;s.base.wild.calm=55;}
 const p=M.active(s.base);p.hp=M.maxHP(p)-8;
 return s;
}
// Explicit offline boundary fixtures; no fixtures are installed in any browser.
for(const trial of [false,true])for(const id of Object.keys(M.SPECIES))check(`${trial?'trial':'encounter'} ${id}: actual capped effect and energy recovery`,()=>{
 const s=fixture(id,trial),p=M.active(s.base),before=structuredClone(s),f=skillFeedback(s);
 assert.deepEqual(s,before,'preview is read-only');assert.equal(f.reason,'');assert.match(f.cost,/当前3\/3/);
 const hp=p.hp,calm=trial?s.trial.calm:s.base.wild.calm,targetHP=trial?s.trial.hp:s.base.wild.hp;
 assert(M.input(s,{kind:trial?'trialSkill':'skill',revision:s.revision}));
 const targetAfter=trial?s.trial.hp:s.base.wild.hp;
 if(['a','fin'].includes(id))assert(f.effect.includes(trial?'余势−'+(targetHP-targetAfter):'造成'+(targetHP-targetAfter)+'伤害'));
 if(['b','c'].includes(id))assert(f.effect.includes('先恢复'+(p.hp-hp)+'体力'));
 if(['c','bud'].includes(id))assert(f.effect.includes('安心+'+((trial?s.trial.calm:s.base.wild.calm)-calm)));
 const blocked=skillFeedback(s);assert.match(blocked.cost,/当前1\/3/);assert.match(blocked.reason,/需要2能量/);assert.match(blocked.reason,/守息/);
 const cp=structuredClone(M.checkpoint(s));assert.equal(M.input(s,{kind:trial?'trialSkill':'skill',revision:s.revision}),false);assert.deepEqual(M.checkpoint(s),cp,'blocked action cannot consume turn or save command');
 assert(M.input(s,{kind:trial?'trialGuard':'guard',revision:s.revision}));assert.equal(skillFeedback(s).reason,'');assert.match(skillFeedback(s).cost,/当前2\/3/);
});
check('full healing / calm previews show zero and do not disable legal skills',()=>{
 for(const id of ['b','c','bud']){
  const s=fixture(id,true),p=M.active(s.base);p.hp=M.maxHP(p);s.trial.calm=60;const f=skillFeedback(s);
  if(id!=='bud')assert.match(f.effect,/恢复0体力/);if(id!=='b')assert.match(f.effect,/安心\+0/);assert.equal(f.reason,'');
 }
});
check('target HP caps damage preview without changing model or checkpoint',()=>{
 for(const trial of [false,true]){
  const s=fixture('a',trial);if(trial)s.trial.hp=3;else s.base.wild.hp=3;
  const cp=structuredClone(M.checkpoint(s));assert.match(skillFeedback(s).effect,trial?/余势−3/:/造成3伤害/);assert.deepEqual(M.checkpoint(s),cp);
 }
});
check('camp/explore/ending have no skill preview',()=>{
 const s=M.createGame();assert.equal(skillFeedback(s),null);M.input(s,{kind:'depart',revision:s.revision});assert.equal(skillFeedback(s),null);
 const t=fixture('a',true);t.ending={};assert.equal(skillFeedback(t),null);
});
console.log(JSON.stringify({passed:true,groups:checks.length,method:'Offline model fixtures; effect preview compared against actual existing model command results, not browser play.',checks},null,2));
