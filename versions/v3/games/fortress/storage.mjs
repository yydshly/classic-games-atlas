import {fresh,restored,validCampaign} from './campaign.mjs';
export const KEY='classic-atlas.fortress.campaign.v3';
export class CampaignStore{
 constructor(storage){
  this.storage=storage;this.blocked=false;this.reason='';this.restartedBattle=false;this.wasEmpty=false;this.data=fresh();
  let raw;
  try{if(!storage)throw new Error('Storage inaccessible');raw=storage.getItem(KEY);}
  catch{this.blocked=true;this.reason='read';return;}
  if(raw===null){this.wasEmpty=true;return;}
  try{
   const loaded=restored(JSON.parse(raw));if(!loaded)throw new Error('Invalid checkpoint');
   this.data=loaded.data;this.restartedBattle=loaded.restartedBattle;
  }catch{this.blocked=true;this.reason='corrupt';}
 }
 save(data){
  if(this.blocked)return false;
  if(!validCampaign(data))throw new Error('Invalid campaign checkpoint');
  try{this.storage.setItem(KEY,JSON.stringify(data));this.reason='';return true;}
  catch{this.reason='write';return false;}
 }
}
