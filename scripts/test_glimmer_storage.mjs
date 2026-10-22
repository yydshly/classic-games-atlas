import assert from 'node:assert/strict';
import {createGame,start,command,update,checkpoint} from '../preview/glimmer/engine.mjs';
import {chooseInput} from './fixtures/glimmer-policy.mjs';
import {fresh,validate,readSave,writeSave,KEY} from '../preview/glimmer/storage.mjs';
const p=fresh();
for(let level=1;level<=3;level++){
 const g=createGame(level-1,p.entries[level]);start(g);
 while(!['won','lost'].includes(g.state)&&g.time<90){const choice=chooseInput(g,{weapon:'blade',charm:'ward'});if(choice.command?.type==='exit'&&level===1&&g.time<3600){for(let n=0;n<14404;n++)update(g,.25,{});assert.ok(g.time>3600);}if(choice.command){if(choice.command.type==='start')start(g);else assert.ok(command(g,choice.command).ok);}else for(let n=0;n<3;n++)update(g,1/30,choice.input);
  p.last=level;p.current=checkpoint(g);if(g.state==='won'){p.completed[level]={level,title:g.title,time:g.time,gear:{...g.player.gear},hp:g.player.hp,kills:g.kills,damageTaken:g.stats.damageTaken};if(level<3)p.entries[level+1]={...g.player.gear};p.unlocked=Math.min(3,level+1);}assert.ok(validate(p),'whole-progress roundtrip '+level+' at '+g.time);
 }assert.equal(g.state,'won');
}
const before=JSON.stringify(p);let raw=before,fail=false;const store={getItem:()=>raw,setItem(k,v){assert.equal(k,KEY);if(fail)throw Error('quota');raw=v;}};
assert.equal(readSave(store).game.state,'won');fail=true;assert.equal(writeSave(store,fresh(),null),false);assert.equal(raw,before);fail=false;assert.equal(writeSave(store,p,null),true);
raw='{bad original';const invalid=readSave(store);assert.equal(invalid.protection,'invalid');assert.equal(writeSave(store,fresh(),invalid.protection),false);assert.equal(raw,'{bad original');
const broken=JSON.parse(before);broken.current.game.player.hp=-1;assert.equal(validate(broken),null);const denied={getItem(){throw Error('read denied');},setItem(){throw Error('must not write');}};assert.equal(readSave(denied).protection,'unavailable');assert.equal(writeSave(denied,p,'unavailable'),false);
console.log(JSON.stringify({passed:true,scope:'Three-stage progress/entry gear/choice/terminal roundtrip including naturally simulated >1hour idle, quota old-byte preservation, recovery, bad-save protection; pure model/storage, not UI.'}));
