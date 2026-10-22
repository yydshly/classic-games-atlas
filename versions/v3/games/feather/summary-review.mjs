import {createGame,input} from './model.mjs';

// Reconstruct the first earned ending from the existing v3 record. Later free
// travel must not change its companions, outing count or growth snapshot.
// All commands run on a separate replay object; no current state or save changes.
export function completedSummary(state) {
 try {
  if(state?.version!==3||!state.origin||!state.journey?.completed||!Array.isArray(state.commands)||state.commands.length>4000)return null;
  const replay=createGame(undefined,state.origin);
  if(!replay)return null;
  for(const command of state.commands){
   if(!input(replay,command))return null;
   if(replay.ending)return JSON.parse(JSON.stringify(replay.ending));
  }
  return null;
 } catch {return null;}
}
