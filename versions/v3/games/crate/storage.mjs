import {LEVELS} from './levels.mjs';
import {restoreActions} from './engine.mjs';
export const KEY='classic-atlas.crate.authored.v3',LEGACY_KEY='classic-atlas.crate.authored.v2';
const TOTAL=LEVELS.length;
export const defaults=()=>({version:3,unlocked:TOTAL,last:1,best:{},current:null,tutorialSeen:false,sound:true});
function parse(raw,legacy=false){
 const v=JSON.parse(raw),max=legacy?3:TOTAL;
 if(!v||typeof v!=='object'||Array.isArray(v)||(!legacy&&v.version!==3)||!Number.isInteger(v.unlocked)||v.unlocked<1||v.unlocked>max||!Number.isInteger(v.last)||v.last<1||v.last>max||!v.best||typeof v.best!=='object'||Array.isArray(v.best))throw Error('format');
 const value=defaults();value.last=v.last;value.tutorialSeen=!!v.tutorialSeen;value.sound=v.sound!==false;
 for(const [key,b] of Object.entries(v.best)){const id=Number(key);if(!Number.isInteger(id)||String(id)!==key||id<1||id>max||!b||!Number.isInteger(b.moves)||!Number.isInteger(b.pushes)||b.moves<0||b.pushes<0||b.pushes>b.moves)throw Error('best');value.best[id]={moves:b.moves,pushes:b.pushes};}
 if(v.current!=null){const c=v.current;if(c.level!==v.last||!Number.isFinite(c.time)||c.time<0||!restoreActions(c.level-1,c.actions,c.time))throw Error('current');value.current={level:c.level,actions:c.actions,time:c.time};}
 return value;
}
export function readProgress(store){
 const result={value:defaults(),available:true,blocked:false,imported:false,notice:''};let raw;
 try{raw=store.getItem(KEY);}catch{return {...result,available:false,blocked:true,notice:'本机存储无法读取；本次可以独立试玩。'};}
 if(raw!==null){try{result.value=parse(raw);}catch{result.blocked=true;result.notice='v3存档无法读取，原内容已保全，不会覆盖。';}return result;}
 try{raw=store.getItem(LEGACY_KEY);if(raw!==null){result.value=parse(raw,true);result.imported=true;result.notice='已只读承接v2进度，六题均可选择；旧版存档保持独立。';}}catch{result.notice='旧版进度未能导入，旧档保持原样；本次使用独立v3进度。';}
 return result;
}
export function writeProgress(store,value,blocked=false){if(blocked)return false;try{store.setItem(KEY,JSON.stringify(value));return true;}catch{return false;}}
