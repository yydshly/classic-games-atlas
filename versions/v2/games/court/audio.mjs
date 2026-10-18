// Original synthesized court sounds. No samples, music, or remote audio assets.
export function createCourtAudio(){
  let context,enabled=false,lastDribble=-1;const active=new Set();
  function unlock(){if(!enabled)return;try{context??=new(globalThis.AudioContext||globalThis.webkitAudioContext)();context.resume();}catch{}}
  function note(frequency,duration=.12,gain=.04,type='sine',end=frequency,delay=0){
    if(!enabled||!context||context.state!=='running'||active.size>=12)return;
    const t=context.currentTime+delay,o=context.createOscillator(),a=context.createGain();o.type=type;
    o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(25,end),t+duration);
    a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(gain,t+.008);a.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(a);a.connect(context.destination);active.add(o);o.onended=()=>{active.delete(o);o.disconnect();a.disconnect();};o.start(t);o.stop(t+duration+.01);
  }
  function play(type){
    if(type==='dribble')note(135,.075,.035,'sine',62);
    if(type==='pass')note(330,.09,.025,'triangle',175);
    if(type==='receive')note(180,.065,.025,'sine',90);
    if(type==='shot')note(390,.12,.025,'sine',650);
    if(type==='miss'){note(490,.09,.035,'triangle',240);note(230,.14,.018,'sine',110,.07);}
    if(type==='score'){note(740,.14,.042,'sine',880);note(990,.22,.035,'sine',1180,.10);}
    if(type==='steal-success'||type==='intercept'){note(310,.085,.035,'triangle',620);note(620,.13,.025,'sine',740,.075);}
    if(type==='steal-fail')note(160,.10,.025,'triangle',90);
    if(type==='rebound')note(210,.11,.04,'sine',120);
    if(type==='end'){note(620,.28,.035,'sine',610);note(920,.28,.018,'sine',910);}
  }
  return {unlock,play,setEnabled(value){enabled=!!value;if(!enabled)for(const o of active){try{o.stop();}catch{}}},
    update(state){if(state.state!=='playing'||state.ball.mode!=='held'||state.charging){lastDribble=-1;return;}
      const beat=Math.floor(state.elapsed*11/Math.PI);if(beat!==lastDribble){if(lastDribble>=0)play('dribble');lastDribble=beat;}},
    reset(){lastDribble=-1;},get enabled(){return enabled;}};
}
