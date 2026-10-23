// Original, short synthesized cues. No audio is created until the sound button
// receives a user gesture; a remembered preference alone never starts audio.
export const AUDIO_KEY='classic-atlas.audio.preferences.v1';
const DEFAULT={schema:1,enabled:false,volume:.12};
const KINDS=new Set(['action','collect','hit','hurt','win','lose','gate','rank','finish','reset']);
const LIMITS={action:100,collect:120,hit:90,hurt:180,win:600,lose:600,gate:100,rank:600,finish:600,reset:180};
const clamp=v=>Math.max(0,Math.min(.25,Number.isFinite(v)?v:.12));
function preferences(raw){try{const p=JSON.parse(raw);if(p?.schema===1&&typeof p.enabled==='boolean'&&Number.isFinite(p.volume)&&p.volume>=0&&p.volume<=.25)return {...p,volume:clamp(p.volume)};}catch{}return {...DEFAULT};}

export class GameAudio{
 constructor({theme='fortress',env=globalThis,storage}={}){
  this.env=env;this.theme=theme;this.storage=storage;this.storageWarning=false;
  if(storage===undefined)try{this.storage=env.localStorage;}catch{this.storageWarning=true;}
  let raw;try{raw=this.storage?.getItem(AUDIO_KEY);}catch{this.storageWarning=true;}
  this.prefs=preferences(raw);this.armed=false;this.blocked=true;this.ctx=null;this.master=null;this.error='';this.voices=new Set();this.last=new Map();this.listeners=new Set();this.unlocking=null;this.enableSequence=0;
  this.counts={contexts:0,requested:{},played:{},suppressed:0,throttled:0,failures:0,maxVoices:0};
  this.supported=!!(env.AudioContext||env.webkitAudioContext);
  this.onBlur=()=>this.pause();this.onHidden=()=>{if(env.document?.hidden)this.pause();};
  this.onStorage=e=>{if(e.key!==AUDIO_KEY)return;const p=preferences(e.newValue),was=this.prefs.enabled;this.prefs=p;if(!p.enabled||!was){this.enableSequence++;this.armed=false;this.stop();}this.applyVolume();this.changed();};
  env.addEventListener?.('blur',this.onBlur);env.addEventListener?.('pagehide',this.onBlur);env.addEventListener?.('storage',this.onStorage);env.document?.addEventListener('visibilitychange',this.onHidden);
 }
 changed(){for(const f of this.listeners)try{f();}catch{}}
 save(){try{if(!this.storage)throw Error('storage unavailable');this.storage.setItem(AUDIO_KEY,JSON.stringify(this.prefs));this.storageWarning=false;}catch{this.storageWarning=true;}this.changed();}
 applyVolume(){try{if(this.master)this.master.gain.setValueAtTime(this.prefs.volume,this.ctx.currentTime);}catch{this.counts.failures++;}}
 setVolume(v){this.prefs.volume=clamp(v);this.applyVolume();this.save();}
 async enable(){
  if(this.unlocking)return this.unlocking;
  if(!this.supported){this.error='此浏览器暂不支持声音，仍可正常游玩。';this.changed();return false;}
  // Called only by the visible button's click handler, never by game start or
  // a saved preference. Do not queue any earlier gameplay cues after unlocking.
  const sequence=++this.enableSequence;
  this.unlocking=Promise.resolve().then(async()=>{try{
   if(!this.ctx){const C=this.env.AudioContext||this.env.webkitAudioContext;this.ctx=new C();this.counts.contexts++;this.master=this.ctx.createGain();this.master.gain.value=this.prefs.volume;this.master.connect(this.ctx.destination);}
   if(this.ctx.state!=='running')await this.ctx.resume();
   if(this.ctx.state!=='running')throw Error('audio suspended');
   if(sequence!==this.enableSequence||this.env.document?.hidden)return false;
   this.armed=true;this.prefs.enabled=true;this.error='';this.save();return true;
  }catch{this.armed=false;this.error='声音未能启用，可再次点按；游戏仍可继续。';this.counts.failures++;this.stop();this.changed();return false;}finally{this.unlocking=null;}});
  return this.unlocking;
 }
 mute(){this.enableSequence++;this.prefs.enabled=false;this.armed=false;this.stop();this.save();}
 resume(){
  this.blocked=false;
  // An explicit game Continue may resume an already gesture-armed context
  // interrupted by the browser. It cannot arm a new page or create a context.
  if(this.armed&&this.prefs.enabled&&this.ctx&&this.ctx.state!=='running'){
   const failed=()=>{this.armed=false;this.error='声音已中断，请在设置中点按恢复；游戏仍可继续。';this.stop();this.changed();};
   try{Promise.resolve(this.ctx.resume()).catch(failed);}catch{failed();}
  }
 }
 pause(){this.blocked=true;this.stop();}
 stop(){for(const voice of [...this.voices]){this.voices.delete(voice);try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}}}
 cue(kind){
  if(!KINDS.has(kind))return false;
  this.counts.requested[kind]=(this.counts.requested[kind]||0)+1;
  if(this.blocked||!this.prefs.enabled||!this.armed||!this.ctx||this.ctx.state!=='running'||this.env.document?.hidden||this.prefs.volume===0){this.counts.suppressed++;return false;}
  const now=this.env.performance?.now?.()??Date.now();
  if(now-(this.last.get(kind)??-Infinity)<LIMITS[kind]){this.counts.throttled++;return false;}
  this.last.set(kind,now);
  const themes={fortress:{base:220,type:'triangle'},brook:{base:523.25,type:'sine'},post:{base:440,type:'sine'}},t=themes[this.theme]||themes.fortress,b=t.base;
  const recipes={action:[[b,0,.065]],collect:[[b*1.5,0,.09],[b*2,.075,.11]],hit:[[b*.85,0,.06,b*.65]],hurt:[[b*.7,0,.16,b*.35]],gate:[[b*1.5,0,.085],[b*2,.06,.09]],rank:[[b,0,.08],[b*1.5,.07,.1]],reset:[[b*.7,0,.13,b*.5]],win:[[b,0,.14],[b*1.25,.09,.14],[b*1.5,.18,.18]],finish:[[b,0,.13],[b*1.5,.09,.13],[b*2,.18,.18]],lose:[[b*.9,0,.13],[b*.7,.09,.13],[b*.5,.18,.18]]};
  const notes=recipes[kind];
  if(['hurt','win','lose','finish'].includes(kind)||this.voices.size+notes.length>6)this.stop();
  try{
   for(const [frequency,delay,duration,end=frequency]of notes){
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),at=this.ctx.currentTime+delay,voice={osc,gain};
    osc.type=t.type;osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(end,at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.11,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain);gain.connect(this.master);this.voices.add(voice);
    osc.onended=()=>{this.voices.delete(voice);try{osc.disconnect();gain.disconnect();}catch{}};
    osc.start(at);osc.stop(at+duration+.015);
   }
   this.counts.maxVoices=Math.max(this.counts.maxVoices,this.voices.size);this.counts.played[kind]=(this.counts.played[kind]||0)+1;return true;
  }catch{this.counts.failures++;this.stop();return false;}
 }
 diagnostics(){return JSON.parse(JSON.stringify({theme:this.theme,supported:this.supported,enabled:this.prefs.enabled,armed:this.armed,blocked:this.blocked,volume:this.prefs.volume,contextState:this.ctx?.state||'none',activeVoices:this.voices.size,storageWarning:this.storageWarning,...this.counts}));}
 dispose(){this.pause();this.env.removeEventListener?.('blur',this.onBlur);this.env.removeEventListener?.('pagehide',this.onBlur);this.env.removeEventListener?.('storage',this.onStorage);this.env.document?.removeEventListener('visibilitychange',this.onHidden);try{this.ctx?.close();}catch{}this.listeners.clear();}
}

const mounted=new WeakMap();
export function mountGameAudio({theme,host,onOpen}={}){
 const doc=host?.ownerDocument||globalThis.document;
 if(mounted.has(doc))return mounted.get(doc);
 const audio=new GameAudio({theme,env:doc?.defaultView||globalThis});
 if(host&&doc){
  host.classList.add('game-audio-host');
  const details=doc.createElement('details');details.className='game-audio';
  const summary=doc.createElement('summary');
  const controls=doc.createElement('div');controls.className='game-audio-controls';
  const toggle=doc.createElement('button');toggle.type='button';toggle.dataset.audioToggle='';
  const label=doc.createElement('label'),caption=doc.createElement('span');caption.textContent='音量';label.append(caption);
  const range=doc.createElement('input');range.type='range';range.min='0';range.max='25';range.step='1';range.setAttribute('aria-label','声音音量，最高25%');range.dataset.audioVolume='';
  const output=doc.createElement('output');const status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  label.append(range,output);controls.append(toggle,label,status);details.append(summary,controls);host.replaceChildren(details);
  function sync(){
   const live=audio.prefs.enabled&&audio.armed;
   summary.textContent='声音 · '+(live?'已开启':audio.prefs.enabled?'待点按启用':'静音');
   toggle.textContent=live?'静音':audio.prefs.enabled?'点按恢复声音':'开启声音';toggle.setAttribute('aria-pressed',String(live));toggle.disabled=!audio.supported;
   range.value=String(Math.round(audio.prefs.volume*100));output.textContent=range.value+'%';
   status.textContent=audio.error||(!audio.supported?'此浏览器暂不支持声音，仍可正常游玩。':live?'仅关键动作短音；暂停、离开页面会停止声音。':'默认静音。每次打开页面需点按启用，游戏开始不会自动发声。');
   if(audio.storageWarning)status.textContent+=' 设置暂时无法记住，仍可游玩。';
  }
  toggle.addEventListener('click',()=>{if(audio.armed&&audio.prefs.enabled)audio.mute();else void audio.enable();});
  range.addEventListener('input',()=>audio.setVolume(Number(range.value)/100));
  details.addEventListener('toggle',()=>{if(details.open){try{onOpen?.();}catch{}audio.pause();}});
  // Keep native range arrows/Space/Enter out of each game's global shortcuts.
  for(const type of ['keydown','keyup'])details.addEventListener(type,e=>e.stopPropagation());
  audio.listeners.add(sync);sync();
 }
 if(doc)mounted.set(doc,audio);
 return audio;
}
