import assert from 'node:assert/strict';
import {fresh,step,action,DT,serialize,restore,retry} from '../versions/v2/games/ruins/engine.mjs';
// Unit/model tests. Focused combat fixtures below deliberately arrange positions;
// full normal progression is independently tested without state injection.
const passed=[];
function test(name,fn){fn();passed.push(name);}
function run(s,n,i={}){for(let k=0;k<n;k++)step(s,i,DT);}
function running(level=0){let s=fresh(level);s.paused=false;return s;}
test('paused freezes time, movement, enemies and actions',()=>{const s=fresh(0),before=JSON.stringify(s);action(s,'attack');action(s,'interact');run(s,120,{right:true});assert.equal(JSON.stringify(s),before);});
test('restore preserves progress and remains paused',()=>{const s=running(1);run(s,30,{right:true});const restored=restore(serialize(s));assert(restored);assert.equal(restored.p.x,s.p.x);assert.equal(restored.time,s.time);assert.equal(restored.paused,true);const before=JSON.stringify(restored);run(restored,30,{right:true});assert.equal(JSON.stringify(restored),before);assert.equal(restore('broken json'),null);assert.equal(restore('{}'),null);});
test('walking and dodging cannot cross a wall or arena boundary',()=>{const s=running();s.room=1;s.p.x=365;s.p.y=300;run(s,120,{right:true});assert(s.p.x<=377);action(s,'dodge');run(s,30,{right:true});assert(s.p.x<=377);s.p.x=70;s.p.y=100;run(s,20,{left:true});action(s,'dodge');run(s,30,{left:true});assert(s.p.x>=61);});
test('one swing hits each target at most once',()=>{const s=running();s.room=1;s.rooms[1].walls=[];s.rooms[1].enemies=[{id:'unit',x:260,y:288,hp:3,maxHp:3,type:'scout',phase:'recover',timer:10,stun:0}];s.p.x=200;s.p.y=288;s.p.dir='right';action(s,'attack');run(s,19);assert.equal(s.rooms[1].enemies[0].hp,2);run(s,10);action(s,'attack');run(s,19);assert.equal(s.rooms[1].enemies[0].hp,1);});
test('echo cannot pass solid walls',()=>{const s=running(1);s.room=1;s.p.x=280;s.p.y=250;s.p.dir='right';s.echo=true;s.rooms[1].enemies=[{id:'behind-wall',x:430,y:250,hp:5,type:'brute',phase:'recover',timer:10,stun:0}];action(s,'echo');run(s,50);assert.equal(s.rooms[1].enemies[0].stun,0);assert.equal(s.projectiles.length,0);});
test('echo passes bars and activates the real switch',()=>{const s=running(1);s.echo=true;s.p.x=570;s.p.y=220;s.p.dir='right';action(s,'echo');run(s,35);assert(s.switch);});
test('melee cannot hit through solid walls',()=>{const s=running();s.room=1;s.p.x=370;s.p.y=300;s.p.dir='right';s.rooms[1].enemies=[{id:'blocked',x:440,y:300,hp:3,type:'scout',phase:'recover',timer:10,stun:0}];action(s,'attack');run(s,19);assert.equal(s.rooms[1].enemies[0].hp,3);});
test('death freezes simulation; retry restores a live paused checkpoint',()=>{const s=running();s.room=1;s.p.x=560;s.p.y=280;run(s,3000);assert.equal(s.status,'dead');assert.equal(s.p.hp,0);const frozen=JSON.stringify(s);action(s,'attack');action(s,'interact');run(s,100,{left:true});assert.equal(JSON.stringify(s),frozen);const r=retry(s);assert.equal(r.status,'playing');assert.equal(r.paused,true);assert.equal(r.p.hp,r.p.maxHp);assert.equal(r.room,0);assert.equal(r.p.x,180);});
test('shield rejects J and non-recovery L; recovery L opens it',()=>{const s=running(2);s.west=true;s.east=true;s.p.x=600;s.p.y=270;s.p.dir='up';const b=s.rooms[0].enemies[0];b.phase='windup';b.timer=10;action(s,'attack');action(s,'echo');run(s,25);assert.equal(b.hp,10);assert.equal(b.exposed,0);run(s,20);b.phase='recover';b.timer=1.6;action(s,'echo');run(s,8);assert(b.exposed>0);action(s,'attack');run(s,18);assert.equal(b.hp,9);});
console.log(JSON.stringify({type:'unit/controller model; fixtures isolated from normal-path test; not browser',passed},null,2));
// A locked windup rectangle must not track a later player movement.
{const s=running();s.room=1;s.p.x=560;s.p.y=310;const e=s.rooms[1].enemies[0];step(s);assert.equal(e.phase,'windup');const locked=JSON.stringify(e.region),dir=e.dir;run(s,15,{left:true});assert.equal(JSON.stringify(e.region),locked);assert.equal(e.dir,dir);}
console.log('PASS locked windup direction / region');
// Unattended time must naturally produce damage and death, with no input.
{const s=running();s.room=1;s.p.x=560;s.p.y=310;for(let i=0;i<2000&&s.status==='playing';i++)step(s);assert.equal(s.status,'dead');assert.equal(s.p.hp,0);}
console.log('PASS enemy time advances without input and naturally defeats idle player');
