// Presentation only: observe base health without changing battle or save state.
export class BaseFeedback {
  constructor(game) { this.reset(game); }
  reset(game) { this.hp=game.base.hp;this.kind='';this.until=0; }
  update(game) {
    const {state,time,base:{hp}}=game;
    if(state==='ready')this.reset(game);
    else if(hp!==this.hp){
      if(state==='playing'&&hp>0){this.kind=hp<this.hp?'hit':'repair';this.until=time+5;}
      else this.kind='';
      this.hp=hp;
    }
    if(!['playing','paused'].includes(state)||time>=this.until||hp<=0)this.kind='';
    if(this.kind==='hit')return {kind:'hit',label:'基地受击',message:hp===1?'基地受击，仅剩 1/3！立即回防信标。':`基地受击 · 耐久 ${hp}/3，请回防信标。`};
    if(this.kind==='repair')return {kind:'repair',label:'基地修复',message:`基地已修复 · 耐久 ${hp}/3，继续守住信标。`};
    return {kind:'',label:'共享信标',message:''};
  }
}
