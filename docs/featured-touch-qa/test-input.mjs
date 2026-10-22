import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Controls,PLAY_KEYS} from '../../versions/v2/games/fortress/input.mjs';
const baseline='c66befb195f638e1731e139947fb168d9a21f066';
const oldSource=execFileSync('git',['show',baseline+':versions/v2/games/fortress/input.mjs'],{encoding:'utf8'});
const box={};vm.runInNewContext(oldSource.replaceAll('export ','')+';globalThis.Old=Controls;',box);
const results=[],test=(name,fn)=>{fn();results.push(name);};
test('Native before trace: second fire contact lifts, first stays held',()=>{
 const c=new Controls();c.press('KeyJ',7);c.press('KeyJ',8);c.release('KeyJ',8);
 assert(c.read().players[0].fire);c.release('KeyJ',8);assert(c.read().players[0].fire);
 c.release('KeyJ',7);assert(!c.read().players[0].fire);
 const old=new box.Old();old.press('KeyJ',7);old.press('KeyJ',8);old.release('KeyJ',8);assert(!old.read().players[0].fire);
});
test('Separate move/fire contacts release and cancel independently',()=>{
 const c=new Controls();c.press('KeyW',2);c.press('KeyJ',3);c.release('KeyW',2);
 assert.equal(c.read().players[0].dir,null);assert(c.read().players[0].fire);
 c.release('KeyJ',3);assert(!c.read().players[0].fire);
});
test('Keyboard and pointer ownership of one control remain independent',()=>{
 const c=new Controls();c.press('KeyW');c.press('KeyW',4);c.release('KeyW',4);assert.equal(c.read().players[0].dir,0);
 c.release('KeyW');assert.equal(c.read().players[0].dir,null);
 c.press('KeyW',4);c.press('KeyW');c.release('KeyW');assert.equal(c.read().players[0].dir,0);
 c.release('KeyW',4);assert.equal(c.read().players[0].dir,null);
});
test('P1 touch fire and P2 keyboard fire do not clear each other',()=>{
 const c=new Controls();c.press('KeyJ',9);c.press('Enter');assert(c.read().players.every(p=>p.fire));
 c.release('KeyJ',9);assert(c.read().players[1].fire);c.release('Enter');assert(!c.read().players[1].fire);
});
test('Clear removes all owners; stale lost-capture cannot clear a new keyboard hold',()=>{
 const c=new Controls();c.press('KeyJ',9);c.press('KeyW');c.clear();
 assert(!c.read().players[0].fire);assert.equal(c.read().players[0].dir,null);
 c.press('KeyJ');c.release('KeyJ',9);assert(c.read().players[0].fire);
 c.release('KeyJ');assert.equal(c.sources.size,0);
});
test('Default keyboard command replay exactly matches original direction/fire priority',()=>{
 const a=new Controls(),b=new box.Old();let seed=71239;
 for(let i=0;i<1200;i++){
  seed=(1664525*seed+1013904223)>>>0;const key=PLAY_KEYS[seed%PLAY_KEYS.length],op=seed%17===0?'clear':seed%3===0?'release':'press';
  a[op](key);b[op](key);assert.equal(JSON.stringify(a.read()),JSON.stringify(b.read()));assert.equal(a.order,b.order);
 }
});
test('Read operations do not alter input ownership',()=>{
 const c=new Controls();c.press('KeyA',2);c.press('KeyA',3);const order=c.order,keys=JSON.stringify([...c.keys]),owners=JSON.stringify([...c.sources].map(([k,v])=>[k,[...v]]));
 for(let i=0;i<10;i++)c.read();
 assert.equal(c.order,order);assert.equal(JSON.stringify([...c.keys]),keys);assert.equal(JSON.stringify([...c.sources].map(([k,v])=>[k,[...v]])),owners);
});
console.log(JSON.stringify({passed:true,groups:results.length,baseline,baselineNegativeControl:true,oldKeyboardReplayCommands:1200,results,method:'Production Controls and old-class negative control; source ownership boundary tests, not physical touch or gameplay wins.'},null,2));
