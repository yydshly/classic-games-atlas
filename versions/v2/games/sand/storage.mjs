import{restore}from'./engine.mjs';
export const STORAGE_KEY='classic-atlas.sand.seeded.v2';
export function cleanStore(raw){
 const out={version:2,mode:'small',slots:{small:{},large:{}},best:{}};
 if(!raw||raw.version!==2)return out;
 out.mode=raw.mode==='large'?'large':'small';
 for(const m of ['small','large']){
  const s=raw.slots?.[m];if(s&&Number.isInteger(s.seed)&&s.seed>=0&&s.seed<=4294967295){out.slots[m].seed=s.seed;if(s.resume&&s.resume.mode===m&&s.resume.seed===s.seed&&restore(s.resume))out.slots[m].resume=s.resume;}
  const b=raw.best?.[m];if(b&&Number.isInteger(b.hints)&&b.hints>=0&&b.hints<=5000&&Number.isFinite(b.time)&&b.time>=0&&b.time<=31536000)out.best[m]={hints:b.hints,time:b.time};
 }
 return out;
}
