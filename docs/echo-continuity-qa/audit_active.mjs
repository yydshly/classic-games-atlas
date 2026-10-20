// Offline audit of checkpoints captured by the UI; this is not extra browser play.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {restore} from '../../versions/v2/games/echo/engine.mjs';
const r=JSON.parse(fs.readFileSync(new URL('local/report.json',import.meta.url),'utf8'));
assert.equal(r.passed,true);const c=r.normalUI[1],a=restore(c.beforeActiveRefresh.session),b=restore(c.afterResumeWithoutKeys.session);
assert(a&&b);assert.deepEqual(a.player,b.player);assert(b.ticks>a.ticks);assert.deepEqual(a.controls,{forward:0,strafe:0,turn:0,fire:false});assert.deepEqual(b.controls,a.controls);
const out={kind:'offline captured active-checkpoint replay, separate from UI input',passed:true,beforeTicks:a.ticks,afterTicks:b.ticks,playerBefore:a.player,playerAfter:b.player,controls:b.controls,commandsUnchanged:JSON.stringify(a.log)===JSON.stringify(b.log)};
fs.writeFileSync(new URL('checkpoint-audit.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
