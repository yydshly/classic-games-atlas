import assert from 'node:assert/strict';
import {createGame,tick,interact,inspect,useItem,combine,transfer,snapshot} from '../experiments/old-house-echoes/engine.mjs';
import {ROOMS,walkable} from '../experiments/old-house-echoes/world.mjs';
import {load,persist,SAVE_KEY} from '../experiments/old-house-echoes/storage.mjs';
import {modelDriver,route} from '../scripts/old-house-routes.mjs';
const results=[];function test(name,fn){fn();results.push(name);}
const clear=await route(modelDriver(),'clear'),bypass=await route(modelDriver(),'bypass');
assert.equal(clear.stats.shots,4);assert.equal(clear.enemy.hp,0);assert.equal(bypass.stats.shots,0);assert.equal(bypass.enemy.hp,4);assert(bypass.stats.distance>clear.stats.distance);assert(clear.flags.loop&&bypass.flags.loop);assert.equal(clear.player.hp,100);assert.equal(bypass.player.hp,100);results.push('Two bounded legal input routes rescue and evacuate; clearing spends4 rounds; bypass retains enemy and walks farther');
test('Wrong heading wastes finite ammo, aim stops movement, walls block movement, enemy has dodgeable windup',()=>{
 const s=createGame();s.mode='playing';s.room='corridor';s.player.x=10;s.player.y=11.4;const y=s.player.y;tick(s,{aim:true,right:true,fire:true});assert.equal(s.player.y,y);assert.equal(s.enemy.hp,4);assert.equal(s.loaded,3);
 for(let i=0;i<120;i++)tick(s,{left:true});assert(walkable(s.room,s.player.x,s.player.y));
 // A local collision scenario fixture; completion routes above do not set positions.
 const e=createGame();e.mode='playing';e.room='corridor';e.player.x=10;e.player.y=6.8;tick(e,{});assert(e.enemy.windup>0);for(let i=0;i<48;i++)tick(e,{right:true});assert.equal(e.player.hp,100);assert(e.enemy.windup>=0);assert(persist({setItem(){}},e,null));
});
test('Inventory full leaves pickup in place; inspect/use and proximity gate progression; medkit has self/rescue tradeoff',()=>{
 const s=createGame();s.mode='playing';s.room='library';s.player.x=9.6;s.player.y=3.8;interact(s);assert.equal(s.inventory.length,6);useItem(s,'key');assert(!s.flags.archive);inspect(s,'key');useItem(s,'key');assert(!s.flags.archive);s.player.x=18;s.player.y=7;useItem(s,'key');assert(s.flags.archive);assert(s.inventory.includes('key'));
 s.room='archive';s.player.x=12;s.player.y=5;interact(s);assert(!s.taken.includes('fuse'));assert(s.stats.full===1);combine(s,'cloth','herb');interact(s);assert(s.taken.includes('fuse'));assert.equal(s.inventory.length,6);s.player.hp=50;useItem(s,'kit');assert.equal(s.player.hp,100);assert(!s.inventory.includes('kit'));
});
test('No free storage away from box; medical copies occupy separate slots',()=>{
 const s=createGame();assert.equal(transfer(s,'pistol','store'),false);s.mode='box';assert(transfer(s,'pistol','store'));assert(transfer(s,'herb','take'));s.inventory.splice(s.inventory.lastIndexOf('herb'),1);s.box.push('herb');s.mode='playing';combine(s,'herb','cloth');s.mode='box';assert(transfer(s,'herb','take'));assert(transfer(s,'cloth','take'));assert.equal(s.inventory.length,5);combine(s,'herb','cloth');assert.equal(s.inventory.filter(i=>i==='kit').length,2);s.player.hp=30;useItem(s,'kit');assert.equal(s.inventory.filter(i=>i==='kit').length,1);assert(persist({setItem(){}},s,null));const ammo=createGame();ammo.loaded=0;ammo.reserve=1;combine(ammo,'pistol','rounds');assert.equal(ammo.loaded,1);assert(!ammo.inventory.includes('rounds'));
});
test('Independent save roundtrip pauses, preserves cleared corridor/loop and resource state; retries retain snapshots',()=>{
 const data=new Map([['other.save','unchanged']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};const before=snapshot(clear);assert(persist(storage,clear,before));const saved=load(storage);assert(saved.ok);assert.equal(saved.save.mode,'won');assert.equal(saved.save.enemy.hp,0);assert.equal(saved.save.flags.loop,true);assert.equal(data.get('other.save'),'unchanged');assert.equal(saved.checkpoint.stats.shots,4);
 const active=createGame();active.mode='playing';assert(persist(storage,active,before));assert.equal(load(storage).save.mode,'paused');assert.equal(active.mode,'playing');
});
test('Corruption, invalid coordinates, broken prototype keys, quota and denied storage are contained',()=>{
 const raw=JSON.stringify({schema:1,save:snapshot(clear),checkpoint:null});for(const broken of ['bad',raw.replace('"room":"hall"','"room":"__proto__"'),raw.replace('"hp":100','"hp":999'),raw.replace('"x":10','"x":999'),JSON.stringify({schema:1,save:{...snapshot(clear),inventory:['__proto__']},checkpoint:null})]){const s={getItem:()=>broken};assert(!load(s).ok);}
 const typed={schema:1,save:snapshot(clear),checkpoint:null};typed.save.player.x='10';assert(!load({getItem:()=>JSON.stringify(typed)}).ok);assert(!load(undefined).ok);assert(!persist({setItem(){throw Error('quota');}},clear,null));
});
test('Paused/map/box states cannot move, shoot or advance enemy; all door destinations are walkable',()=>{
 for(const mode of ['paused','box','lost','won']){const s=createGame();s.mode=mode;const before=JSON.stringify(s);for(let i=0;i<60;i++)tick(s,{up:true,aim:true,fire:true});assert.equal(JSON.stringify(s),before);}
 for(const r of Object.values(ROOMS))for(const d of r.doors)assert(walkable(d.to,d.tx,d.ty),d.id);
});
console.log(JSON.stringify({passed:true,groups:results.length,tests:results,clear:{stats:clear.stats,loaded:clear.loaded,reserve:clear.reserve,inventory:clear.inventory},bypass:{stats:bypass.stats,loaded:bypass.loaded,reserve:bypass.reserve,box:bypass.box},evidence:'Pure engine/action/storage tests. Scenario fixtures are separate from normal-input completion routes. No browser or human-quality claim.'},null,2));
