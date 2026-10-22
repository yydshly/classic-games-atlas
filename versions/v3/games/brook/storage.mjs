import {fresh,valid,inBattle} from './campaign.mjs';
import {restore} from './engine.mjs';
export const KEY='classic-atlas.brook.campaign.v3';
export class CampaignStore{
 constructor(storage){
  this.storage=storage;this.data=fresh();this.blocked=false;this.reason='';this.wasEmpty=false;
  let raw;try{if(!storage)throw Error();raw=storage.getItem(KEY);}catch{this.blocked=true;this.reason='read';return;}
  if(raw===null){this.wasEmpty=true;return;}
  try{const s=JSON.parse(raw);if(!valid(s)||inBattle(s)&&s.resume&&!restore(s.resume))throw Error();this.data=s;}
  catch{this.blocked=true;this.reason='corrupt';}
 }
 save(s){
  if(this.blocked)return false;
  if(!valid(s))throw Error('Invalid campaign record');
  try{this.storage.setItem(KEY,JSON.stringify(s));this.reason='';return true;}
  catch{this.reason='write';return false;}
 }
}
