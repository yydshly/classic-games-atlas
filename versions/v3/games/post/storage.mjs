import {TRACKS,BASELINE_ROUTE_ID} from './tracks.mjs?v=post-v3-r1';
import {restore} from './engine.mjs?v=post-v3-r1';
export const KEY='classic-atlas.post.routes.v3',LEGACY_KEY='classic-atlas.post.v2';
const blank=()=>({unlocked:1,last:0,best:{},resume:null,lastResult:null});
export const freshProgress=()=>({version:3,selected:BASELINE_ROUTE_ID,routes:Object.fromEntries(TRACKS.map(t=>[t.routeId,blank()]))});
function record(v,id){
 if(!v||!Number.isInteger(v.unlocked)||v.unlocked<1||v.unlocked>3||!Number.isInteger(v.last)||v.last<0||v.last>=v.unlocked||!v.best||typeof v.best!=='object'||Array.isArray(v.best))return null;
 const result=blank();result.unlocked=v.unlocked;result.last=v.last;
 for(const [k,time] of Object.entries(v.best)){if(!/^[0-2]$/.test(k)||!Number.isFinite(time)||time<=0||time>95||Number(k)>=v.unlocked)return null;result.best[k]=time;}
 if(v.lastResult!=null){const r=v.lastResult;if(!Number.isInteger(r.stage)||r.stage<0||r.stage>=v.unlocked||!Number.isInteger(r.rank)||r.rank<1||r.rank>3||!Number.isFinite(r.time)||r.time<0||r.time>95.01||typeof r.finished!=='boolean')return null;result.lastResult={stage:r.stage,rank:r.rank,time:r.time,finished:r.finished};}
 if(v.resume!=null){const g=restore(v.resume);if(!g||g.routeId!==id||g.stage>=v.unlocked)return null;result.resume=structuredClone(v.resume);}
 return result;
}
export function readProgress(store){
 const result={value:freshProgress(),available:true,blocked:false,imported:false};
 let raw;try{raw=store.getItem(KEY);}catch{return {...result,available:false,blocked:true};}
 if(raw!==null){try{const v=JSON.parse(raw);if(v?.version!==3||!TRACKS.some(t=>t.routeId===v.selected)||!v.routes||Object.keys(v.routes).length!==2)throw Error('format');const routes={};for(const t of TRACKS){routes[t.routeId]=record(v.routes[t.routeId],t.routeId);if(!routes[t.routeId])throw Error('record');}result.value={version:3,selected:v.selected,routes};}catch{result.blocked=true;}return result;}
 // Read-only import: the old namespace remains owned by the unchanged v2 page.
 try{const v=JSON.parse(store.getItem(LEGACY_KEY)||'null'),r=v?.version===2?record(v,BASELINE_ROUTE_ID):null;if(r){result.value.routes[BASELINE_ROUTE_ID]=r;result.imported=true;}}catch{}
 return result;
}
export function writeProgress(store,value,blocked=false){if(blocked)return 'blocked';try{store.setItem(KEY,JSON.stringify(value));return 'saved';}catch{return 'failed';}}
