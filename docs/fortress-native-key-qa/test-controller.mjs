import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {createGame,start,pause} from '../../versions/v2/games/fortress/engine.mjs';
import {Controls,PLAY_KEYS} from '../../versions/v2/games/fortress/input.mjs';
const file='versions/v2/games/fortress/game.mjs',source=fs.readFileSync(file,'utf8'),baseline=execFileSync('git',['show','5eea35188341e18b3b059a2ed2bd8bd44deade3e:'+file],{encoding:'utf8'});
const extract=s=>s.split("window.addEventListener('keydown',")[1].split(/\);\s*window\.addEventListener\('keyup'/)[0].trim();
const cases=[];
function run(state,kind,code,{repeat=false,ctrlKey=false,metaKey=false,altKey=false,defaultPrevented=false,old=false}={}){
 const game=createGame(0,{players:2});if(['playing','paused'].includes(state))start(game);if(state==='paused')pause(game);if(['won','lost'].includes(state))game.state=state;
 const controls=new Controls(),calls={begin:0,prepare:0,pause:0},scope={game,PLAY_KEYS,controls,startEnterHeld:false};
 scope.prepare=()=>{calls.prepare++;game.state='ready';controls.clear();};scope.begin=()=>{calls.begin++;controls.clear();start(game);};scope.$=()=>({click:()=>{calls.pause++;if(game.state==='paused')scope.begin();else pause(game);}});
 const tokens={link:['a[href]'],linkChild:['a[href]'],summary:['summary'],summaryChild:['summary'],input:['input'],select:['select'],textarea:['textarea'],editable:['[contenteditable]:not([contenteditable="false"])'],button:['button'],canvas:[],body:[]}[kind];
 const parent={kind},target={matches:s=>s.split(',').some(x=>tokens.includes(x)),closest:s=>s.split(',').some(x=>tokens.includes(x))?parent:null};let prevented=false;
 const event={code,repeat,ctrlKey,metaKey,altKey,defaultPrevented,target,preventDefault(){prevented=true;}};vm.runInNewContext('('+extract(old?baseline:source)+')',scope)(event);
 return {game,controls,scope,calls,prevented};
}
for(const state of ['ready','playing','paused','won','lost'])for(const kind of ['link','linkChild','summary','summaryChild','editable']){
 const x=run(state,kind,'Enter');assert.equal(x.game.state,state);assert(!x.prevented);assert.equal(x.controls.read().players[1].fire,false);assert.equal(x.calls.begin,0);cases.push({state,kind,key:'Enter',nativeNotPrevented:true,gameUnchanged:true,terminalFixture:['won','lost'].includes(state)});
}
for(const [kind,key]of [['input','KeyP'],['select','ArrowDown'],['textarea','Enter'],['button','Enter'],['button','Space']]){
 const x=run('playing',kind,key);assert.equal(x.game.state,'playing');assert(!x.prevented);assert.equal(x.calls.begin,0);cases.push({state:'playing',kind,key,nativeNotPrevented:true});
}
for(const state of ['ready','paused','won','lost']){const x=run(state,'canvas','Enter');assert.equal(x.game.state,'playing');assert(x.prevented);assert.equal(x.calls.prepare,['won','lost'].includes(state)?1:0);cases.push({state,kind:'canvas',key:'Enter',after:'playing',terminalFixture:['won','lost'].includes(state)});}
for(const kind of ['canvas','body'])for(const state of ['playing','paused'])for(const key of ['KeyP','Escape']){const x=run(state,kind,key);assert.equal(x.game.state,state==='playing'?'paused':'playing');assert(x.prevented);cases.push({state,kind,key,after:x.game.state});}
for(const state of ['playing','paused']){const x=run(state,'button','KeyP');assert.equal(x.game.state,state==='playing'?'paused':'playing');cases.push({state,kind:'button',key:'KeyP',previousFocusedPauseFixRetained:true});}
const firing=run('playing','canvas','Enter');assert(firing.controls.read().players[1].fire);assert(firing.prevented);firing.controls.release('Enter');assert(!firing.controls.read().players[1].fire);cases.push({state:'playing',kind:'canvas',key:'Enter',p2FireThenRelease:true});
for(const flags of [{ctrlKey:true},{metaKey:true},{altKey:true},{defaultPrevented:true}]){const x=run('playing','canvas','KeyP',flags);assert.equal(x.game.state,'playing');assert(!x.prevented);cases.push({flags,browserOrHandledKeyPreserved:true});}
const repeated=run('paused','canvas','KeyP',{repeat:true});assert.equal(repeated.game.state,'paused');cases.push({kind:'canvas',repeat:true,noDoubleToggle:true});
const old=run('paused','link','Enter',{old:true});assert.equal(old.game.state,'playing');assert(old.prevented);
console.log(JSON.stringify({passed:true,cases:cases.length,method:'Actual production keydown callback with real engine start/pause and Controls; small DOM stubs. Terminal states explicit fixtures, not normal UI wins. Native focus/links/forms separately tested in Chromium.',baselineNegativeControl:true,results:cases},null,2));
