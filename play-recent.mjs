import {resolvePlayEntry} from './play-entries.mjs?v=recent-play-r2';

// Visits only. This module never reads, migrates or removes game save keys.
export const RECENT_PLAY_KEY='classic-games-atlas:recent-play:v1';
const BASE=new URL('./',import.meta.url).href;
const MAX=5;
export function readRecentPlays(storage,base=BASE,now=Date.now()){
 let raw;try{raw=storage.getItem(RECENT_PLAY_KEY);}catch{return{items:[],reason:'read'};}
 if(raw===null)return{items:[],reason:null};
 try{
  if(raw.length>12000)throw Error('large');
  const value=JSON.parse(raw);if(value?.schema!==1||!Array.isArray(value.items)||value.items.length>100)throw Error('schema');
  const seen=new Set(),items=[];
  const rows=value.items.map(row=>{const entry=resolvePlayEntry(row?.path,base);return entry&&row.path===entry.path&&Number.isFinite(row.at)&&row.at>=0&&row.at<=now+60000?{...entry,at:row.at}:null;}).filter(Boolean).sort((a,b)=>b.at-a.at);
  for(const row of rows)if(!seen.has(row.slug)){seen.add(row.slug);items.push(row);if(items.length===MAX)break;}
  return{items,reason:null};
 }catch{return{items:[],reason:'corrupt'};}
}
export function rememberRecentPlay(storage,href,base=BASE,now=Date.now()){
 const entry=resolvePlayEntry(href,base);
 if(!entry||!Number.isFinite(now)||now<0)return{ok:false,reason:'entry'};
 const previous=readRecentPlays(storage,base,now);if(previous.reason==='read')return{ok:false,reason:'read'};
 const items=[{path:entry.path,at:now},...previous.items.filter(row=>row.slug!==entry.slug).map(({path,at})=>({path,at}))].slice(0,MAX);
 try{storage.setItem(RECENT_PLAY_KEY,JSON.stringify({schema:1,items}));return{ok:true};}catch{return{ok:false,reason:'write'};}
}
export function clearRecentPlays(storage){try{storage.removeItem(RECENT_PLAY_KEY);return true;}catch{return false;}}
function localStorageFor(win){try{return win.localStorage;}catch{return undefined;}}

// Loaded before each known entry's controller module. Only a successfully loaded,
// visibly opened game document is recorded, never the link click or a report.
export function trackOpenedGame(doc=document,win=window){
 const entry=resolvePlayEntry(win.location.href,BASE);if(!entry)return()=>{};
 const controllers=[...doc.querySelectorAll('script[type="module"][src]:not([data-recent-recorder])')];
 if(!controllers.length||!doc.querySelector('canvas,main button,main [role=button]'))return()=>{};
 const pending=new Set(controllers);let failed=false,ready=doc.readyState!=='loading',recorded=false;
 const tryRecord=()=>{
  if(recorded||failed||!ready||pending.size||doc.hidden||doc.prerendering)return;
  win.requestAnimationFrame(()=>{
   if(recorded||failed||doc.hidden||doc.prerendering)return;
   const main=doc.querySelector('main')||doc.body;if(!main?.getClientRects().length)return;
   recorded=true;rememberRecentPlay(localStorageFor(win),win.location.href,BASE);
  });
 };
 const loaded=e=>{pending.delete(e.target);tryRecord();};
 const broken=e=>{if(pending.has(e.target)||e.message)failed=true;};
 const dom=()=>{ready=true;tryRecord();};
 const show=e=>{if(e.persisted)recorded=false;tryRecord();};
 for(const script of controllers){script.addEventListener('load',loaded);script.addEventListener('error',broken);}
 win.addEventListener('error',broken);doc.addEventListener('DOMContentLoaded',dom);doc.addEventListener('visibilitychange',tryRecord);doc.addEventListener('prerenderingchange',tryRecord);win.addEventListener('pageshow',show);
 tryRecord();
 return()=>{for(const s of controllers){s.removeEventListener('load',loaded);s.removeEventListener('error',broken);}win.removeEventListener('error',broken);doc.removeEventListener('DOMContentLoaded',dom);doc.removeEventListener('visibilitychange',tryRecord);doc.removeEventListener('prerenderingchange',tryRecord);win.removeEventListener('pageshow',show);};
}

export function mountRecentPlays({host=document.querySelector('#recent-play'),win=window}={}){
 if(!host)return null;
 const doc=host.ownerDocument,list=host.querySelector('#recent-play-list'),clear=host.querySelector('#recent-play-clear'),dialog=doc.querySelector('#recent-clear-dialog'),note=dialog.querySelector('[role=status]');
 let fingerprint='';
 function render(){
  const result=readRecentPlays(localStorageFor(win),BASE),key=JSON.stringify(result.items.map(({path,at})=>({path,at})));
  if(fingerprint===key)return;fingerprint=key;
  const active=host.contains(doc.activeElement)?doc.activeElement.closest('a[href]'):null,oldHref=active?.href,oldTop=active?.getBoundingClientRect().top;
  host.hidden=!result.items.length;list.replaceChildren();
  result.items.forEach((item,i)=>{
   const card=doc.createElement('article');card.className='recent-card';card.dataset.play=item.slug;card.dataset.recent='true';
   const number=doc.createElement('span');number.className='recent-number';number.textContent=String(i+1).padStart(2,'0');number.setAttribute('aria-hidden','true');
   const content=doc.createElement('div'),title=doc.createElement('h4'),version=doc.createElement('p'),date=doc.createElement('time'),link=doc.createElement('a');
   title.textContent=item.title;version.className='recent-version';version.textContent=item.version.toUpperCase()+' · '+item.chapter+(item.state?' · '+item.state:'');
   date.dateTime=new Date(item.at).toISOString();date.textContent='上次打开 '+new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(item.at));date.title=new Date(item.at).toLocaleString('zh-CN');
   link.href=new URL(item.path,BASE).href;link.className='recent-open play-launch';link.textContent='再次打开 ↗';link.setAttribute('aria-label','再次打开'+item.title+' '+item.version+' '+item.chapter);
   content.append(title,version,date);card.append(number,content,link);list.append(card);
  });
  if(oldHref){const target=[...list.querySelectorAll('a[href]')].find(a=>a.href===oldHref);if(target){target.focus({preventScroll:true});win.scrollBy(0,target.getBoundingClientRect().top-oldTop);}}
 }
 clear.addEventListener('click',()=>{note.textContent='';dialog.showModal();dialog.querySelector('[data-recent-cancel]').focus();});
 const cancel=()=>{dialog.close();clear.focus({preventScroll:true});};
 dialog.querySelector('[data-recent-cancel]').addEventListener('click',cancel);dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
 dialog.querySelector('[data-recent-confirm]').addEventListener('click',()=>{
  if(!clearRecentPlays(localStorageFor(win))){note.textContent='暂时无法清除，最近记录仍保留；游戏存档没有改动。';return;}
  dialog.close();render();const target=doc.querySelector('#featured-title')||doc.querySelector('#play-title');target?.setAttribute('tabindex','-1');target?.focus();
 });
 const changed=e=>{if(e.key===RECENT_PLAY_KEY||e.key===null)render();};win.addEventListener('storage',changed);win.addEventListener('pageshow',render);render();
 return{render};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')trackOpenedGame();
