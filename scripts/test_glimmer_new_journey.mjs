import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createGame,checkpoint} from '../preview/glimmer/engine.mjs';
import {KEY,fresh,validate,readSave,writeSave} from '../preview/glimmer/storage.mjs';
const proof=JSON.parse(readFileSync(new URL('../docs/glimmer-qa/model-proof.json',import.meta.url),'utf8'));
const complete=fresh();
for(let level=1;level<=3;level++){
 const r=proof.results.find(r=>r.level===level&&r.build.weapon==='blade'&&(level===1||r.build.charm==='ward'));
 assert.ok(r);complete.entries[level]={...r.final.entryGear};complete.completed[level]={level,title:r.final.title,time:r.time,gear:{...r.build},hp:r.hp,kills:r.kills,damageTaken:r.stats.damageTaken};if(level===3)complete.current=checkpoint(r.final);
}
complete.last=3;complete.unlocked=3;assert.equal(validate(complete).game.state,'won');const original=JSON.stringify(complete);
const replay=createGame(2,complete.entries[3]);assert.equal(replay.level,3);assert.deepEqual(replay.player.gear,{weapon:'blade',charm:'ward'});assert.equal(Object.keys(complete.completed).length,3);
const next=fresh();assert.equal(next.last,1);assert.equal(next.unlocked,1);assert.deepEqual(next.entries,{1:{weapon:'worn',charm:null}});assert.deepEqual(next.completed,{});const game=validate(next).game;assert.equal(game.state,'ready');assert.equal(game.time,0);assert.equal(game.heals,1);assert.equal(game.kills,0);assert.ok(game.enemies.every(e=>e.hp===e.maxHp));assert.ok(game.chests.every(c=>!c.opened&&!c.resolved));assert.equal(JSON.stringify(complete),original);
const values=new Map([[KEY,original],['classic-atlas.windowlife.v1','other-game-sentinel']]);const store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};assert.equal(readSave(store).game.state,'won');assert(writeSave(store,next,null));assert.equal(readSave(store).game.state,'ready');assert.equal(values.get('classic-atlas.windowlife.v1'),'other-game-sentinel');assert.equal(readSave(store).progress.unlocked,1);
const failed={getItem:k=>k===KEY?original:null,setItem(){throw Error('quota');}};assert.equal(writeSave(failed,next,null),false);assert.equal(readSave(failed).game.state,'won');
if(process.argv.includes('--fixture')){const dir=new URL('../.local/glimmer-restart-round/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('completed-model-fixture.json',dir),original);}
console.log(JSON.stringify({passed:true,scope:'Model-derived old-format completed fixture; fresh journey distinct from current-stage retry, no original mutation, only own key changes, failed write keeps prior journey. Not natural UI completion.'}));
