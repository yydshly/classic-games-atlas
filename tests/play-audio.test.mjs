import assert from 'node:assert/strict';
import {GameAudio,AUDIO_KEY} from '../play-audio.mjs';
const results=[];
function fixture({raw=null,storageFails=false,noAudio=false,resumeFails=false}={}){
 let clock=0,saved=raw,contexts=0;
 const listeners={},params=()=>({value:0,setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const node=()=>({gain:params(),frequency:params(),connect(){},disconnect(){},start(){},stop(){}});
 class Context{constructor(){contexts++;this.state='suspended';this.currentTime=0;this.destination={};}createGain(){return node();}createOscillator(){return node();}async resume(){if(resumeFails)throw Error('fixture');this.state='running';}close(){this.state='closed';}}
 const env={AudioContext:noAudio?undefined:Context,performance:{now:()=>clock},document:{hidden:false,addEventListener(n,f){listeners[n]=f;},removeEventListener(){}},addEventListener(n,f){listeners[n]=f;},removeEventListener(){}};
 const storage={getItem(){if(storageFails)throw Error('read fixture');return saved;},setItem(k,v){assert.equal(k,AUDIO_KEY);if(storageFails)throw Error('write fixture');saved=v;}};
 const a=new GameAudio({theme:'brook',env,storage});
 return {a,env,listeners,tick:n=>clock+=n,contexts:()=>contexts,saved:()=>saved};
}
async function test(name,fn){await fn();results.push(name);}
await test('Fresh and remembered enabled preferences create no context or automatic audio',async()=>{
 for(const raw of [null,JSON.stringify({schema:1,enabled:true,volume:.12})]){const f=fixture({raw});f.a.resume();assert.equal(f.a.cue('hit'),false);assert.equal(f.contexts(),0);assert.equal(f.a.armed,false);}
});
await test('Explicit enable, mute, re-enable reuse one context; no earlier event is queued',async()=>{
 const f=fixture();f.a.resume();f.a.cue('collect');assert(await f.a.enable());assert.equal(f.a.diagnostics().played.collect,undefined);assert(f.a.cue('collect'));f.a.mute();assert.equal(f.a.voices.size,0);assert.equal(f.a.cue('hit'),false);assert(await f.a.enable());assert.equal(f.contexts(),1);assert(f.a.cue('hit'));assert.equal(JSON.parse(f.saved()).enabled,true);
});
await test('Volume is bounded and zero stays silent without enabling',async()=>{
 const f=fixture();f.a.setVolume(.9);assert.equal(f.a.prefs.volume,.25);assert.equal(f.contexts(),0);await f.a.enable();f.a.resume();f.a.setVolume(-1);assert.equal(f.a.cue('win'),false);assert.equal(f.a.master.gain.value,0);f.a.setVolume(.08);assert(f.a.cue('win'));assert.equal(f.a.master.gain.value,.08);
});
await test('Throttle and bounded voices never queue; terminal cue survives previous hit',async()=>{
 const f=fixture();await f.a.enable();f.a.resume();assert(f.a.cue('hit'));assert.equal(f.a.cue('hit'),false);assert(f.a.cue('win'));assert.equal(f.a.voices.size,3);for(let i=0;i<30;i++){f.tick(200);f.a.cue(i%2?'collect':'gate');assert(f.a.voices.size<=6);}assert(f.a.diagnostics().throttled>0);f.a.stop();assert.equal(f.a.voices.size,0);
});
await test('Repeated pause, blur, hidden and pagehide stop all nodes; focus does not resume',async()=>{
 const f=fixture();await f.a.enable();for(const event of ['blur','visibilitychange','pagehide']){f.a.resume();f.tick(1000);f.a.cue('finish');f.env.document.hidden=event==='visibilitychange';f.listeners[event]();assert.equal(f.a.voices.size,0);assert.equal(f.a.blocked,true);assert.equal(f.a.cue('action'),false);f.env.document.hidden=false;f.a.pause();f.a.pause();assert.equal(f.a.blocked,true);}
});
await test('Read/write failures, corrupt prefs, unsupported audio and rejected resume do not throw into game',async()=>{
 for(const options of [{storageFails:true},{raw:'invalid'},{noAudio:true},{resumeFails:true}]){const f=fixture(options);await f.a.enable();f.a.resume();f.a.cue('collect');f.a.setVolume(.1);f.a.pause();if(options.noAudio||options.resumeFails)assert.equal(f.a.armed,false);if(options.storageFails)assert.equal(f.a.storageWarning,true);}
});
await test('Other-tab mute stops voices; remembered enable from another tab never arms page',async()=>{
 const f=fixture();await f.a.enable();f.a.resume();f.a.cue('win');f.listeners.storage({key:AUDIO_KEY,newValue:JSON.stringify({schema:1,enabled:false,volume:.1})});assert.equal(f.a.voices.size,0);assert.equal(f.a.armed,false);f.listeners.storage({key:AUDIO_KEY,newValue:JSON.stringify({schema:1,enabled:true,volume:.1})});assert.equal(f.a.armed,false);assert.equal(f.a.cue('hit'),false);
});
await test('Mute during pending enable cannot be undone by asynchronous unlock',async()=>{
 const f=fixture();const p=f.a.enable();f.a.mute();assert.equal(await p,false);assert.equal(f.a.armed,false);assert.equal(f.a.prefs.enabled,false);
});
await test('Explicit game Continue resumes an interrupted armed context but never arms a fresh page',async()=>{
 const f=fixture();f.a.resume();assert.equal(f.contexts(),0);await f.a.enable();f.a.ctx.state='suspended';f.a.pause();f.a.resume();await Promise.resolve();assert.equal(f.a.ctx.state,'running');assert.equal(f.contexts(),1);assert(f.a.cue('hit'));
});
console.log(JSON.stringify({passed:true,groups:results.length,method:'Fake AudioContext and storage fixtures; no hearing or browser gameplay claim',tests:results},null,2));
