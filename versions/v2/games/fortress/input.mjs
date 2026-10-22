export class Controls {
 constructor(){this.keys=new Map();this.order=0;this.sources=new Map();}
 press(code,source='keyboard'){if(!this.sources.has(code))this.sources.set(code,new Set());this.sources.get(code).add(source);if(!this.keys.has(code))this.keys.set(code,++this.order);}
 release(code,source='keyboard'){const sources=this.sources.get(code);if(!sources?.delete(source))return;if(!sources.size){this.sources.delete(code);this.keys.delete(code);}}
 clear(){this.keys.clear();this.sources.clear();}
 read(){return {players:[this.player(['KeyW','KeyD','KeyS','KeyA'],'KeyJ'),this.player(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'],'Enter')]};}
 player(directions,fire){let dir=null,latest=-1;directions.forEach((key,i)=>{if((this.keys.get(key)||-1)>latest){latest=this.keys.get(key);dir=i;}});return {dir,fire:this.keys.has(fire)};}
}
export const PLAY_KEYS=['KeyW','KeyA','KeyS','KeyD','KeyJ','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Enter'];
