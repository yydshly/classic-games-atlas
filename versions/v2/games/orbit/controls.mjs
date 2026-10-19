// One deterministic repeat controller for keyboard and pointer input.
// A physical press belongs to one piece; the next piece never inherits it.
export function createControls({getGame,send}){
 const held=new Map(),down=new Set(),blocked=new Set();
 function clear(){held.clear();for(const k of down)blocked.add(k);const g=getGame();if(g.soft&&g.state==='playing')send('softOff');}
 function begin(kind,token=kind){
  const g=getGame();if(down.has(token)||blocked.has(token))return false;down.add(token);
  if(g.state!=='playing'||!g.active){blocked.add(token);return false;}
  const id=g.active.id;
  const existing=held.get(kind);if(existing?.piece===id){existing.tokens.add(token);return true;}
  if(kind==='soft'){send('softOn');held.set(kind,{piece:id,tokens:new Set([token])});}
  else if(kind==='left'||kind==='right'){
   held.delete(kind==='left'?'right':'left');send(kind);held.set(kind,{piece:id,tokens:new Set([token]),next:g.ticks+20});
  }else send(kind);
  return true;
 }
 function end(kind,token=kind){
  down.delete(token);blocked.delete(token);
  const h=held.get(kind);if(h?.tokens.has(token)){h.tokens.delete(token);if(!h.tokens.size){held.delete(kind);if(kind==='soft')send('softOff');}}
 }
 function repeat(){
  const g=getGame();for(const[k,h]of held){
   if(g.active?.id!==h.piece){clear();return;}
   if(k!=='soft'&&g.ticks>=h.next){send(k);h.next+=8;}
  }
 }
 return{begin,end,clear,repeat,held,down,blocked};
}
