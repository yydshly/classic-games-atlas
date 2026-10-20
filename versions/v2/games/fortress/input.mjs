export class Controls {
 constructor(){this.keys=new Map();this.order=0;}
 press(code){if(!this.keys.has(code))this.keys.set(code,++this.order);}
 release(code){this.keys.delete(code);}
 clear(){this.keys.clear();}
 read(){return {players:[this.player(['KeyW','KeyD','KeyS','KeyA'],'KeyJ'),this.player(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'],'Enter')]};}
 player(directions,fire){let dir=null,latest=-1;directions.forEach((key,i)=>{if((this.keys.get(key)||-1)>latest){latest=this.keys.get(key);dir=i;}});return {dir,fire:this.keys.has(fire)};}
}
export const PLAY_KEYS=['KeyW','KeyA','KeyS','KeyD','KeyJ','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Enter'];
