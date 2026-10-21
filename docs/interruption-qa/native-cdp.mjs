import {spawn} from 'node:child_process';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function launch(name) {
  const root = resolve('.local/interruption-round');
  const {executable} = JSON.parse(await readFile(root + '/chromium.json', 'utf8'));
  const profile = root + '/tmp/' + name + '-' + Date.now();
  await mkdir(profile, {recursive:true});
  const child = spawn(executable, ['--headless=new','--remote-debugging-port=0',
    '--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','about:blank'],
    {windowsHide:true, stdio:['ignore','ignore','ignore']});
  let address;
  for (let n=0;n<60;n++) {
    try {const lines=(await readFile(profile+'/DevToolsActivePort','utf8')).trim().split(/\r?\n/);
      address='ws://127.0.0.1:'+lines[0]+lines[1];break;} catch {await sleep(150);}
  }
  if (!address) {child.kill();throw Error('Own Chromium did not expose a debug endpoint');}
  const socket = new WebSocket(address), pending=new Map(), listeners=[];let id=0;
  await new Promise((ok,fail)=>{socket.addEventListener('open',ok,{once:true});socket.addEventListener('error',fail,{once:true});});
  socket.addEventListener('message', event=>{
    const value=JSON.parse(event.data);
    if(value.id){const p=pending.get(value.id);if(p){clearTimeout(p.timer);pending.delete(value.id);value.error?p.fail(Error(JSON.stringify(value.error))):p.ok(value.result);}}
    else for(const listener of listeners)listener(value);
  });
  function send(method,params={},sessionId){return new Promise((ok,fail)=>{
    const i=++id,timer=setTimeout(()=>{pending.delete(i);fail(Error('CDP timeout '+method));},15000);
    pending.set(i,{ok,fail,timer});socket.send(JSON.stringify({id:i,method,params,...(sessionId?{sessionId}:{})}));
  });}
  async function page(){const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const call=(method,params={})=>send(method,params,sessionId);
    await call('Page.enable');await call('Runtime.enable');
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    return {targetId,sessionId,call,evaluate,front:()=>send('Target.activateTarget',{targetId})};
  }
  async function close(){await send('Browser.close').catch(()=>{});socket.close();await sleep(250);if(child.exitCode===null)child.kill();}
  return {send,page,on:listener=>listeners.push(listener),close};
}
