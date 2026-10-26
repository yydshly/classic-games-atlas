import assert from 'node:assert/strict';
import {createGame,tick,interact,inspect,useItem,combine,transfer,snapshot} from '../experiments/old-house-echoes/courtyard/engine.mjs';
import {ROOMS,slots,walkable} from '../experiments/old-house-echoes/courtyard/world.mjs';
import {load,persist,firstChapterComplete,SAVE_KEY} from '../experiments/old-house-echoes/courtyard/storage.mjs';
import {persist as persistFirst,SAVE_KEY as FIRST_KEY} from '../experiments/old-house-echoes/storage.mjs';
import {modelDriver as firstDriver,route as firstRoute} from '../scripts/old-house-routes.mjs';
import {modelDriver,route,packedRecoveryRoute} from '../scripts/old-house-courtyard-routes.mjs';
const groups=[];async function test(name,fn){await fn();groups.push(name);}
const clear=await route(modelDriver(),'clear'),bypass=await route(modelDriver(),'bypass'),packed=await packedRecoveryRoute(modelDriver());
assert.equal(clear.stats.shots,4);assert.equal(clear.enemy.hp,0);assert.equal(bypass.stats.shots,0);assert.equal(bypass.enemy.hp,4);assert(bypass.stats.distance>clear.stats.distance+20);assert(packed.stats.distance>bypass.stats.distance+20);assert.equal(packed.stats.full,2);assert(packed.flags.loop);assert.equal(clear.player.hp,100);assert.equal(bypass.player.hp,100);groups.push('Three bounded legal-action completions: short clear 4 shots; safe bypass 0 shots/longer; overpacked refusal and locker-return recovery');
await test('Two-slot ledger stays in room until there is space; combination does not duplicate it',()=>{
 const s=createGame();s.mode='playing';s.room='vault';s.player.x=10;s.player.y=5;s.inventory=['badge','sleeve','pistol','rounds','herb','cloth'];interact(s);assert(!s.taken.includes('ledger'));assert.equal(slots(s.inventory),6);combine(s,'herb','cloth');interact(s);assert(!s.taken.includes('ledger'));s.inventory.splice(s.inventory.indexOf('rounds'),1);interact(s);assert(s.taken.includes('ledger'));assert.equal(slots(s.inventory),6);combine(s,'ledger','sleeve');assert(s.inventory.includes('wrapped'));assert.equal(slots(s.inventory),4);interact(s);assert.equal(s.inventory.filter(i=>i==='ledger').length,0);
});
await test('Gate requires inspected badge; shortcut opens from pump only; reset cannot spend first save',()=>{
 const s=createGame();s.mode='playing';s.room='archive';s.player.x=10;s.player.y=6;interact(s);combine(s,'badge','rubbing');assert(!s.inventory.includes('marked'));inspect(s,'badge');combine(s,'badge','rubbing');assert(s.inventory.includes('marked'));s.player.x=10;s.player.y=1.8;useItem(s,'marked');assert(s.flags.vault);
 const l=createGame();l.mode='playing';l.room='yard';l.player.x=2;l.player.y=7;interact(l);assert(!l.flags.loop);l.room='pump';l.player.x=18;l.player.y=7;interact(l);assert(l.flags.loop&&l.room==='yard');
});
await test('Enemy windup can be dodged, aim stops movement, wrong heading costs ammo',()=>{
 const s=createGame();s.mode='playing';s.room='corridor';s.player.x=10;s.player.y=11.4;s.inventory.push('pistol');const y=s.player.y;tick(s,{aim:true,right:true,fire:true});assert.equal(s.player.y,y);assert.equal(s.loaded,3);assert.equal(s.enemy.hp,4);const e=createGame();e.mode='playing';e.room='corridor';e.player.x=10;e.player.y=6.8;tick(e,{});assert(e.enemy.windup>0);for(let i=0;i<48;i++)tick(e,{right:true});assert.equal(e.player.hp,100);
});
await test('Completed first chapter unlocks independent second key; no first bytes change; reload pauses and checkpoint keeps resources',async()=>{
 const data=new Map([['other.save','unchanged']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};assert(!firstChapterComplete(storage));const first=await firstRoute(firstDriver(),'bypass');assert(persistFirst(storage,first,null));const firstBytes=data.get(FIRST_KEY);assert(firstChapterComplete(storage));assert(persist(storage,clear,snapshot(bypass)));const loaded=load(storage);assert(loaded.ok);assert.equal(loaded.save.mode,'won');assert.equal(loaded.save.enemy.hp,0);assert.equal(loaded.checkpoint.stats.shots,0);assert.equal(data.get(FIRST_KEY),firstBytes);assert.equal(data.get('other.save'),'unchanged');assert.notEqual(SAVE_KEY,FIRST_KEY);
 const active=createGame();active.mode='playing';assert(persist(storage,active,snapshot(active)));assert.equal(load(storage).save.mode,'paused');assert.equal(data.get(FIRST_KEY),firstBytes);
 const bad=JSON.stringify({schema:1,save:{...snapshot(active),inventory:['__proto__']},checkpoint:null});data.set(SAVE_KEY,bad);assert(!load(storage).ok);assert.equal(data.get(SAVE_KEY),bad);assert.equal(data.get(FIRST_KEY),firstBytes);
});
await test('Damaged saves and quota errors stay contained; all destinations have a legal floor',()=>{
 const s=createGame();s.mode='playing';assert(!load(undefined).ok);assert(!persist({setItem(){throw Error('quota');}},s,null));for(const r of Object.values(ROOMS))for(const d of r.doors)assert(walkable(d.to,d.tx,d.ty),d.id);for(const mode of ['paused','box','lost','won']){const v=createGame();v.mode=mode;const before=JSON.stringify(v);for(let i=0;i<60;i++)tick(v,{up:true,aim:true,fire:true});assert.equal(JSON.stringify(v),before);}
});
console.log(JSON.stringify({passed:true,groups,clear:clear.stats,bypass:bypass.stats,packed:packed.stats,evidence:'Bounded engine actions and storage tests; browser and human acceptance are separate.'},null,2));
