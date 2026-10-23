import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),results=[];
function source(path){return fs.readFileSync(new URL(path,root),'utf8');}
function extract(s,name){const start=s.indexOf('function '+name+'(');assert(start>=0,name);const b=s.indexOf('{',start);let n=1,i=b+1;for(;n;i++){if(s[i]==='{')n++;if(s[i]==='}')n--;}return s.slice(start,i);}
function test(name,fn){fn();results.push(name);}
const fortress=source('versions/v4/games/fortress/game.mjs');
test('Fortress single drain preserves renderer events; terminal overrides damage/pickup/hit and cannot repeat',()=>{
 const events=[{type:'hit'},{type:'power'},{type:'base-hit'},{type:'win'}],calls=[],g={events:[...events]};
 const c=vm.createContext({game:g,renderer:{effects:e=>calls.push(['visual',e])},callAudio:(m,k)=>calls.push([m,k])});
 vm.runInContext(extract(fortress,'battleAudioCue')+'\n'+extract(fortress,'consumeBattleEvents')+'\nconsumeBattleEvents();consumeBattleEvents();',c);
 assert.equal(calls.length,2);assert.deepEqual(calls[0],['visual',events]);assert.deepEqual(calls[1],['cue','win']);assert.equal(g.events.length,0);
});
test('Fortress only actual damage, power and hit cue; shots/terrain/spawns remain silent',()=>{
 const c=vm.createContext({});vm.runInContext(extract(fortress,'battleAudioCue'),c);
 for(const [events,want]of [[['hit'],'hit'],[['power','hit'],'collect'],[['player-hit','power'],'hurt'],[['lose','hit'],'lose'],[['brick','fire','spawn','deflect'],null]]){c.events=events.map(type=>({type}));assert.equal(vm.runInContext('battleAudioCue(events)',c),want);}
});
const brook=source('versions/v3/games/brook/game.mjs');
test('Brook effective events coalesce and terminal settlement emits once; legacy sound no longer controls context',()=>{
 const calls=[],c=vm.createContext({audio:{cue:k=>calls.push(k)},game:{state:'playing'},progress:{phase:'active'},C:{settle:p=>({...p,phase:'intermission'})},score:()=>1,persist(){},lastState:''});
 vm.runInContext(extract(brook,'playAudioEvents')+'\n'+extract(brook,'recordOutcome'),c);
 for(const [events,want]of [[['place'],'action'],[['remove'],'action'],[['collect'],'collect'],[['kill','trigger'],'hit'],[['broken','kill'],'hurt'],[['bullet'],null]]){c.events=events.map(type=>({type}));const n=calls.length;vm.runInContext('playAudioEvents(events)',c);assert.equal(calls.length,n+(want?1:0));if(want)assert.equal(calls.at(-1),want);}
 for(const [state,cue]of [['won','win'],['lost','lose']]){c.game.state=state;c.progress={phase:'active'};vm.runInContext('playAudioEvents([{type:"kill"}]);recordOutcome();recordOutcome();',c);assert.equal(calls.filter(k=>k===cue).length,1);}
 assert(!brook.includes('new(window.AudioContext'));assert(!brook.includes('progress.sound'));
});
for(const mode of ['','cup/'])test('Post '+(mode?'cup':'free')+' cues player gates/resets only, single legal finish or timeout, preserves reset cleanup',()=>{
 const s=source('versions/v4/games/post/'+mode+'game.mjs'),calls=[],c=vm.createContext({audio:{cue:k=>calls.push(k)},clearInputs:()=>calls.push('clear')});
 vm.runInContext(extract(s,'drainEvents'),c);c.g={car:{id:'player',finishedAt:null},events:[{type:'gate',id:'rival'},{type:'gate',id:'player'},{type:'reset',id:'player'},{type:'lap',id:'player'}]};vm.runInContext('drainEvents(g);drainEvents(g)',c);assert.deepEqual(calls,['gate','clear','reset','action']);
 for(const [finishedAt,want]of [[33,'finish'],[null,'lose']]){calls.length=0;c.g={car:{id:'player',finishedAt},events:[{type:'gate',id:'player'},{type:'finish',id:'player'},{type:'finished'}]};vm.runInContext('drainEvents(g);drainEvents(g)',c);assert.deepEqual(calls,[want]);}
});
console.log(JSON.stringify({passed:true,groups:results.length,tests:results,method:'Extracted actual controller event functions in VM fixtures, not natural wins or audible acceptance'},null,2));
