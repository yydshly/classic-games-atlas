import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {Renderer} from '../../experiments/crate-courier/view.mjs';
import {createGame,command} from '../../experiments/crate-courier/engine.mjs';
import {combatRoute,jumpRoute,shelfRoute,runner} from '../../experiments/crate-courier/routes.mjs';
import {recordingCanvas} from './svg-context.mjs';
const output=process.argv[2];if(!output)throw Error('usage: node export.mjs OUTPUT_DIRECTORY');mkdirSync(output,{recursive:true});
const combat=combatRoute(),jump=jumpRoute(),shelf=shelfRoute(),start=createGame();command(start,'start');
const fall=runner();fall.until(g=>g.player.x>=185,{right:true});fall.tap('action');fall.until(g=>g.player.x>=315,{right:true});fall.tap('action');fall.advance({},90);fall.until(g=>g.phase==='failed',{right:true});
const scenarios=[{label:'departure',snapshot:start},combat.observations[0],combat.observations[1],shelf.observations.find(s=>s.label==='shelf-reached'),combat.observations.at(-1),{label:'water-failure',snapshot:fall.game}];
for(const scenario of scenarios)for(const [w,h,name]of [[960,560,'desktop'],[390,480,'portrait']]){const canvas=recordingCanvas(w,h),view=new Renderer(canvas);view.resize(w,h,1);view.draw(scenario.snapshot,{snapCamera:true});writeFileSync(path.join(output,scenario.label+'-'+name+'.svg'),canvas.svg());}
writeFileSync(path.join(output,'legal-route-evidence.json'),JSON.stringify({scope:'same live fixed-step model, legal held input and offline Canvas2D commands; no browser/DOM/native touch/playability acceptance',combat:{phase:combat.game.phase,ticks:combat.game.tick,hp:combat.game.player.hp,runs:combat.runs,observations:combat.observations},jump:{phase:jump.game.phase,ticks:jump.game.tick,hp:jump.game.player.hp,runs:jump.runs,observations:jump.observations},shelf:{phase:shelf.game.phase,ticks:shelf.game.tick,hp:shelf.game.player.hp,runs:shelf.runs,observations:shelf.observations}},null,2)+'\n');
console.log(JSON.stringify({directory:output,svgCount:scenarios.length*2,combatTicks:combat.game.tick,jumpTicks:jump.game.tick}));
