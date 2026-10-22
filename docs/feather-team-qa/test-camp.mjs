import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v3/games/feather/model.mjs';
import {campSkillInfo} from '../../versions/v3/games/feather/camp-feedback.mjs';
const fixtures=JSON.parse(fs.readFileSync('versions/v3/games/feather/fixtures.json','utf8')),checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const act=(s,kind,arg)=>assert(M.input(s,{kind,arg,revision:s.revision}),kind);
const baseSpecies=structuredClone(M.SPECIES);
for(const id of Object.keys(M.SPECIES))check(id+': fixed camp summary is read-only and unchanged by growth/held resources',()=>{
 const fresh={id,rank:0,xp:0,hp:M.SPECIES[id].hp,energy:3},grown={id,rank:1,xp:2,hp:M.SPECIES[id].hp+8,energy:0},before=structuredClone([fresh,grown]);
 const a=campSkillInfo(fresh),b=campSkillInfo(grown);assert.deepEqual(a,b);assert.deepEqual([fresh,grown],before);assert.equal(a.name,M.SPECIES[id].skill);assert.equal(a.cost,'耗2能量');assert(!/造成|余势|当前|预计/.test(a.effect));
 if(['a','fin'].includes(id))assert.match(a.effect,/基础威力10/);
 if(['b','c'].includes(id))assert.match(a.effect,/最多恢复/);
 if(['c','bud'].includes(id))assert.match(a.effect,/安心最多\+/);
 assert.deepEqual(M.SPECIES,baseSpecies);
});
function fixture(id,trial){
 const s=M.createGame(undefined,fixtures.preparedOrigin);
 if(!s.base.team.includes(id)){act(s,'team',s.base.team[0]);act(s,'team',id);}
 act(s,'lead',id);
 if(trial){act(s,'trialStart');s.trial.turn=1;s.trial.calm=0;}
 else{act(s,'depart');for(const d of ['up','up','right','right','right'])act(s,'move',d);s.base.wild.turn=1;s.base.wild.calm=0;}
 const p=M.active(s.base);p.hp=M.maxHP(p)-40;return s;
}
// Explicit offline boundary fixtures. None is installed into a browser.
for(const trial of [false,true])for(const id of Object.keys(M.SPECIES))check(`${trial?'trial':'encounter'} ${id}: fixed role agrees with existing skill command`,()=>{
 const s=fixture(id,trial),p=M.active(s.base),info=campSkillInfo(p),hp=p.hp,target=trial?s.trial.hp:s.base.wild.hp,calm=trial?s.trial.calm:s.base.wild.calm;
 const cp=M.checkpoint(s);campSkillInfo(p);assert.deepEqual(M.checkpoint(s),cp);
 act(s,trial?'trialSkill':'skill');assert.equal(p.energy,1);
 if(['a','fin'].includes(id)){
  const element=trial?'moss':s.base.wild.element;assert.equal(target-(trial?s.trial.hp:s.base.wild.hp),Math.floor(10*M.factor(M.SPECIES[id].element,element)));assert(info.effect.includes('基础威力10'));
 }
 if(['b','c'].includes(id)){const restored=p.hp-hp;assert.equal(restored,id==='b'?28:18);assert(info.effect.includes('最多恢复'+restored));}
 if(['c','bud'].includes(id)){const gain=(trial?s.trial.calm:s.base.wild.calm)-calm;assert.equal(gain,id==='c'?10:22);assert(info.effect.includes('安心最多+'+gain));}
 if(id==='a')assert(info.effect.includes('减半2次'));
 if(id==='bud')assert(info.effect.includes('减半1次'));
 if(id==='fin')assert(info.effect.includes('本次18护盾'));
});
check('Capped restoration uses maximum wording without asserting guaranteed healing',()=>{
 const s=fixture('b',true),p=M.active(s.base);p.hp=M.maxHP(p);const info=campSkillInfo(p);assert.match(info.effect,/最多恢复28/);const hp=p.hp;act(s,'trialSkill');assert.equal(p.hp,hp);assert.equal(M.allowed(M.createGame(),'skill'),'当前没有相遇');
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'Offline: five read-only summary/growth groups, ten existing model skill command comparisons and one capped-restoration group. No browser state injection or ending replay.',modelChanged:false},null,2));
