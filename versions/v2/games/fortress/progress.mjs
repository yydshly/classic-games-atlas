export const KEY='classic-atlas.fortress.v2';
export const fresh=()=>({version:2,last:0,mode:1,best:{}});
export function readProgress(storage){try{const text=storage.getItem(KEY);if(!text)return {data:fresh(),ok:true};const r=JSON.parse(text);if(r?.version!==2||![0,1].includes(r.last)||![1,2].includes(r.mode)||!r.best||typeof r.best!=='object'||Array.isArray(r.best))throw Error('invalid');const data=fresh();data.last=r.last;data.mode=r.mode;for(const key of ['0-1','0-2','1-1','1-2']){const n=r.best[key];if(Number.isInteger(n)&&n>=0&&n<=100000)data.best[key]=n;}return {data,ok:true};}catch{return {data:fresh(),ok:false};}}
export function saveProgress(storage,data){try{storage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
