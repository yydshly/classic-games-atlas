// Offline replay of accepted inputs captured from the real UI; not another UI victory.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {createGame,input,advanceTicks,snapshot} from '../../versions/v2/games/duel/engine.mjs';
const r=JSON.parse(fs.readFileSync(new URL('public-report.json',import.meta.url),'utf8'));assert.equal(r.passed,true);
const actual=r.terminal,g=createGame(0);input(g,{kind:'start'});
for(const c of actual.log){advanceTicks(g,c.tick-g.ticks);assert(input(g,c));}advanceTicks(g,actual.ticks-g.ticks);
const replay=snapshot(g);for(const k of ['state','ticks','player','enemy','stats','score','events','swings','log','reason'])assert.deepEqual(replay[k],actual[k]);
assert(Object.values(replay.invariants).every(Boolean));assert.equal(actual.state,'won');assert.equal(actual.stats.settlements,1);
const first=r.captures.find(c=>c.label==='first-visible-hit');assert(first.dom.enemyHP<80&&first.before.stats.hits>0);assert(first.before.events.some(e=>e.source==='player'&&e.damage>0));
assert.equal(r.initial.unlocked,1);assert.deepEqual(r.initial.best,{});assert.equal(r.winningProgress.unlocked,2);assert.equal(r.winningProgress.resume,null);assert.deepEqual(r.bestRefresh.best['1'],r.winningProgress.best['1']);assert(r.unlockDialog.secondEnabled&&r.unlockDialog.thirdLocked);
assert.equal(r.rematch.afterReset.ticks,0);assert.equal(r.rematch.afterReset.player.energy,100);assert.deepEqual(r.rematch.afterReset.best,r.bestRefresh.best);assert.equal(r.secondEntry.ready.level,2);assert.equal(r.secondEntry.ready.ticks,0);assert.equal(r.secondEntry.started.stats.attacks,0);assert.deepEqual(r.secondEntry.started.held,[]);
const out={kind:'offline captured UI input replay, not extra ordinary play',passed:true,level:1,status:replay.state,ticks:replay.ticks,gameSeconds:replay.time,wallSeconds:r.fightWallSeconds,hp:replay.player.hp,enemyHP:replay.enemy.hp,score:replay.score,stats:replay.stats,acceptedCommands:replay.log.length,unlock2AndThirdLocked:true,bestRefreshExact:true,rematchResetAndBestRetained:true,secondEntryClean:true,allInvariants:true};fs.writeFileSync(new URL('input-audit.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
