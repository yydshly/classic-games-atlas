import assert from 'node:assert/strict';
import {writeFileSync}from'node:fs';
import {createGame,start,pause,update,command,snapshot,checkpoint,restore,canStand,lineOfSight,deriveStats}from'../preview/glimmer/engine.mjs';
const step=(g,seconds,input={})=>{for(let i=0;i<Math.round(seconds*30);i++)update(g,1/30,input);};
const checks=[];
{
 const g=createGame();assert.equal(restore(checkpoint(g)).state,'ready');start(g);assert.equal(command(g,{type:'open',chestId:'first-cache'}).ok,true);const before=snapshot(g);step(g,5,{attack:true});assert.deepEqual(snapshot(g),before);assert.equal(restore(checkpoint(g)).state,'choosing');assert.equal(command(g,{type:'choose',gearId:'ward'}).ok,false);assert.equal(command(g,{type:'choose',gearId:'blade'}).ok,true);assert.equal(g.player.gear.weapon,'blade');assert.equal(g.stats.loot,1);assert.equal(command(g,{type:'choose',gearId:'hammer'}).ok,false);assert.equal(command(g,{type:'open',chestId:'first-cache'}).ok,false);assert.equal(g.stats.loot,1);
 const skip=createGame();start(skip);command(skip,{type:'open',chestId:'first-cache'});command(skip,{type:'leaveChoice'});assert.equal(skip.goals.find(v=>v.id==='loot').done,true);assert.equal(skip.player.gear.weapon,'worn');checks.push('choice stops time; valid listed equipment only; no duplicate pickup; preserving original gear is a valid decision');
}
{
 const g=createGame(1,{gear:{weapon:'blade',charm:'spark'}});start(g);step(g,2,{x:1});assert.ok(g.player.x<4.77);assert.ok(canStand(g,g.player.x,g.player.y));assert.equal(g.stats.attacks,0);assert.equal(g.stats.damageDealt,0);
 update(g,1/30,{skill:true,dodge:true});assert.equal(g.stats.skills,1);assert.equal(g.stats.dodges,1);const p=snapshot(g),cp=checkpoint(g);pause(g);step(g,5,{attack:true,skill:true});assert.equal(g.time,p.time);assert.equal(g.player.energy,p.player.energy);assert.equal(g.player.skillCooldown,p.player.skillCooldown);const r=restore(cp);assert.equal(r.state,'paused');start(g);start(r);step(g,.5,{x:0,y:1});step(r,.5,{x:0,y:1});assert.deepEqual(snapshot(g),snapshot(r));checks.push('free movement blocked by wall; movement alone does not attack; cooldown and energy freeze paused; active checkpoint resumes exactly');
}
{
 const g=createGame();start(g);let found=false;for(let i=0;i<30*20;i++){update(g,1/30,{});const e=g.enemies.find(e=>e.state==='windup');if(e){found=true;assert.equal(g.player.hp,g.player.maxHp);const old=g.player.hp;step(g,Math.max(0,e.windup-.15));assert.equal(g.player.hp,old);break;}}assert.ok(found);while(g.player.hp===g.player.maxHp&&g.time<30)update(g,1/30,{});assert.ok(g.player.hp<g.player.maxHp);const hp=g.player.hp;assert.equal(command(g,{type:'heal'}).ok,true);assert.equal(g.player.hp,Math.min(g.player.maxHp,hp+38));assert.equal(g.heals,0);assert.equal(command(g,{type:'heal'}).ok,false);checks.push('enemy warns before first damage; one finite heal gives actual capped recovery');
}
{
 // Explicit model fixtures below test geometry and boundary conditions, not ordinary UI completion.
 const g=createGame();g.player.x=4.5;g.player.y=3.5;g.enemies[0].x=6.5;g.enemies[0].y=3.5;assert.equal(lineOfSight(g,g.player,g.enemies[0]),false);start(g);const hp=g.enemies[0].hp;update(g,1/30,{skill:true});assert.equal(g.enemies[0].hp,hp);
 const h=createGame(2,{gear:{weapon:'hammer',charm:'spark'}});h.enemies[0].x=3.3;h.enemies[0].y=5.5;h.enemies[0].hp=1;start(h);update(h,1/30,{attack:true});assert.equal(h.stats.damageDealt,1);assert.equal(h.enemies[0].alive,false);checks.push('fixture: pulse blocked by wall; overkill summary records actual HP removed');
}
{
 const g=createGame(2);start(g);while(g.state==='playing'&&g.time<90)update(g,1/30,{});assert.equal(g.state,'lost');assert.equal(g.player.hp,0);assert.equal(restore(checkpoint(g)).state,'lost');assert.equal(command(g,{type:'heal'}).ok,false);checks.push('natural idle loss without terminal injection; lost checkpoint retained');
}
{
 assert.equal(restore({}),null);assert.equal(restore(null),null);for(const mutate of [g=>g.player.hp=-1,g=>g.enemies[1].id=g.enemies[0].id,g=>g.player.gear.weapon='fake',g=>g.grid.walls=[],g=>g.events.push({time:NaN,text:'bad'}),g=>g.chests[0].offers=['spark'],g=>g.player.x=0,g=>g.exit.open=true]){const cp=checkpoint(createGame());mutate(cp.game);assert.equal(restore(cp),null);}checks.push('malformed checkpoint rejects impossible health, duplicate enemies, gear/map/events/offers/walls/exit corruption');
}
{
 const ward=deriveStats({weapon:'blade',charm:'ward'}),spark=deriveStats({weapon:'hammer',charm:'spark'});assert.ok(ward.attackInterval<spark.attackInterval);assert.ok(ward.maxHp>spark.maxHp);assert.ok(ward.speed>spark.speed);assert.ok(spark.damage>ward.damage);assert.ok(spark.skillDamage>ward.skillDamage);assert.ok(spark.skillCost<ward.skillCost);checks.push('weapon cadence/damage and survival/mobility versus skill-energy modifiers differ in actual derived stats');
}
console.log(JSON.stringify({ok:true,groups:checks.length}));
