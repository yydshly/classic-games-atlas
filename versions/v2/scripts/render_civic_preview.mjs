import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createGame,start,snapshot} from '../games/civic/engine.mjs';
import {runPilot} from './civic_pilot.mjs';
import {render,hitTile,projectTile} from '../games/civic/renderer.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,GlobalFonts}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK SC');
const out=new URL('../../../../validation/frames/',import.meta.url);mkdirSync(out,{recursive:true});
const scenes=[['01-new-island',start(createGame(0)),22],['02-first-harvest',runPilot(0,{maxCommands:3}).state,15],['03-bridge-colony',runPilot(4).state,26],['04-lighthouse',runPilot(7).state,12]];
for(let id=0;id<42;id++){const p=projectTile(id);assert.equal(hitTile(p.x,p.y),id,`center hit ${id}`);}
assert.equal(hitTile(-100,-100),null);
for(const [name,state,selectedTile] of scenes){const view=snapshot(state),before=JSON.stringify(view);for(const w of [1200,390]){const c=createCanvas(w,w*2/3);render(c.getContext('2d'),view,{width:w,height:w*2/3,time:2300,selectedTile,reducedMotion:true});writeFileSync(new URL(`${name}-${w}.png`,out),c.toBuffer('image/png'));}assert.equal(JSON.stringify(view),before);writeFileSync(new URL(name+'.json',out),JSON.stringify(view,null,2));}
console.log('PASS: 42 tile center hits, outside rejection, 4 immutable real-engine states rendered at 1200px and 390px. Native offscreen Canvas only; not browser/layout/device evidence.');
