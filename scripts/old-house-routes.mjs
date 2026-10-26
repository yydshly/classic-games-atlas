// Bounded waypoint replays using the same movement / interactions as the UI.
import assert from 'node:assert/strict';
import {createGame,tick,interact,inspect,combine,useItem,transfer,snapshot} from '../experiments/old-house-echoes/engine.mjs';
export function modelDriver(){const s=createGame();s.mode='playing';return {state:()=>s,
 async go(x,y){let n=0;while(Math.hypot(s.player.x-x,s.player.y-y)>.12){assert(++n<1800,`blocked waypoint ${s.room} ${x},${y} from ${s.player.x},${s.player.y}`);const dx=x-s.player.x,dy=y-s.player.y;tick(s,{left:dx<-.08,right:dx>.08,up:dy<-.08,down:dy>.08});assert.notEqual(s.mode,'lost');}},
 async door(room){interact(s);for(let n=0;n<28;n++)tick(s,{});assert.equal(s.room,room);},async interact(){interact(s);},async pack(a,b){if(a==='inspect')inspect(s,b);else if(a==='use')useItem(s,b);},async combine(a,b){combine(s,a,b);},async store(item){assert(transfer(s,item,'store'));},async take(item){assert(transfer(s,item,'take'));},async close(){s.mode='playing';},async shoot(){for(let n=0;n<140;n++)tick(s,{aim:true,up:true,fire:true});},async mark(){},async checkpoint(){interact(s);this.recorded=snapshot(s);},recorded:null};}
export async function route(d,style){
 const go=async(...pairs)=>{for(const [x,y] of pairs)await d.go(x,y);};const door=async(room)=>d.door(room);
 // Both routes collect the same wire and open the same storage loop before choosing a corridor.
 await go([17.5,7]);await door('greenhouse');await go([4.5,10.5]);await d.interact();await d.mark('greenhouse-wire');await go([10,11.2]);await door('duty');assert(d.state().flags.loop);
 await go([10,5]);await d.checkpoint();await d.mark('duty-record');await go([10,7],[5,7]);await d.interact();await d.combine('herb','cloth');await d.store('rounds');if(style==='bypass')await d.store('pistol');await d.close();await go([17.5,7]);await door('hall');
 if(style==='clear'){
  await go([10,7],[10,2.3]);await door('corridor');await d.shoot();assert.equal(d.state().enemy.hp,0);await d.mark('corridor-cleared');await go([10,2.3]);await door('library');
 }else{
  await go([17.5,7]);await door('greenhouse');await go([4,10.8],[17.8,10.8],[17.8,3]);await go([17.6,3]);await door('library');
 }
 if(style==='bypass')await go([2.7,8.8],[10,8.8]);await go([10,3.8]);await d.interact();await d.pack('inspect','key');await d.mark('library-key');await go([10,7],[17.6,7]);await d.pack('use','key');await door('archive');
 await go([3,2.5],[11.5,2.5],[12,5]);await d.interact();assert(d.state().inventory.includes('fuse'));await d.mark('pack-planned');
 await d.combine('fuse','wire');await go([10,3]);await d.pack('use','repaired');await go([10,1.8]);await door('station');await go([10,4.5]);await d.pack('use','kit');assert(d.state().rescued);await d.mark('rescued');await go([10,11.5]);await door('archive');await go([3,2.5],[2.4,7]);await door('library');
 if(style==='clear'){await go([10,7],[10,11.4]);await door('corridor');await go([10,11.4]);await door('hall');}
 else {await go([10,7],[10,4.8],[2.5,4.8],[2.5,7]);await door('greenhouse');await go([17.8,3],[17.8,10.8],[2.4,10.8]);await door('hall');}
 await go([10,10.8]);await d.pack('use','flare');assert.equal(d.state().mode,'won');await d.mark('won');return d.state();
}
