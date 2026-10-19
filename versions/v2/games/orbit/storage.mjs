export const KEY='classic-atlas.orbit.score180.v2';
export const blank=()=>({version:2,best:null,sound:false,reduced:false,resume:null});
export function readProgress(storage,defaultReduced=false){
 const result={progress:{...blank(),reduced:defaultReduced},available:true,invalid:false};
 try{
  const raw=storage.getItem(KEY);if(!raw)return result;
  if(raw.length>20000000)throw Error('Oversized save');
  const p=JSON.parse(raw);if(p?.version!==2)throw Error('Unknown save');
  result.progress.sound=p.sound===true;result.progress.reduced=typeof p.reduced==='boolean'?p.reduced:defaultReduced;
  if(p.best&&['score','lines','combo'].every(k=>Number.isSafeInteger(p.best[k])&&p.best[k]>=0))result.progress.best={score:p.best.score,lines:p.best.lines,combo:p.best.combo};
  result.progress.resume=p.resume??null;
 }catch(e){result.invalid=true;if(e?.name==='SecurityError'||e?.name==='NotAllowedError')result.available=false;}
 return result;
}
export function writeProgress(storage,p){try{storage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}}
export function record(p,g){
 if(!['won','lost'].includes(g.state)||g.stats.settlements!==1)return false;
 const b={score:g.score,lines:g.lines,combo:g.stats.maxCombo},old=p.best;
 if(!old||b.score>old.score||b.score===old.score&&(b.lines>old.lines||b.lines===old.lines&&b.combo>old.combo)){p.best=b;return true;}return false;
}
