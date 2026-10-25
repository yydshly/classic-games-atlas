// Presentation reads the real world; it never advances or edits physics.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function dockState(s,goal=[0,.35,-3.65],goalRadius=.65){
  const speed=Math.hypot(s.player.velocity[0],s.player.velocity[2]);
  const distance=Math.hypot(s.player.position[0]-goal[0],s.player.position[2]-goal[2]);
  return s.state==='charged'?'connected':s.state==='playing'&&distance<goalRadius&&speed>=.55?'too-fast':s.state==='playing'&&distance<1.35?'approach':'distant';
}
export class QuietPresentation {
  constructor(){this.reset=-1;this.clock=0;this.impactAge=10;this.endAge=0;this.state='playing';this.impactKey='';this.pitch=0;this.chargeStartPitch=0;}
  update(s,dt,{paused=false,brake=false,goal=[0,.35,-3.65],goalRadius=.65}={}){
    if(paused&&this.lastPose&&this.reset===s.resets)return {...this.lastPose};
    const step=paused?0:clamp(Number.isFinite(dt)?dt:0,0,.1);
    if(this.reset!==s.resets){this.reset=s.resets;this.clock=0;this.impactAge=10;this.endAge=0;this.state=s.state;this.impactKey='';this.pitch=0;this.chargeStartPitch=0;this.lastPose=null;}
    this.clock+=step;this.impactAge+=step;
    const key=s.lastImpact?`${s.lastImpact.time}:${s.lastImpact.tool}`:'';
    if(key&&key!==this.impactKey){this.impactKey=key;this.impactAge=0;}
    if(s.state!==this.state){
      if(s.state==='charged'&&this.lastPose)this.chargeStartPitch=this.lastPose.facePitch-this.lastPose.impact*this.lastPose.impactStrength*.10;
      this.state=s.state;this.endAge=0;
    }
    else if(s.state!=='playing')this.endAge+=step;
    const speed=Math.hypot(s.player.velocity[0],s.player.velocity[2]);
    // Identical threshold to the existing world, used only for guidance.
    const dock=dockState(s,goal,goalRadius);
    const impact=Math.exp(-this.impactAge*9),gain=clamp((s.lastImpact?.gain||0)*1.6);
    const awake=s.state==='woke',breath=Math.sin(this.clock*1.65),shallow=clamp((s.noise-.15)/.4);
    // Input changes stay immediate in physics and the brake light. Only the
    // self-levelled face eases its pose, including a release while still moving.
    const targetPitch=brake&&speed>.08?-.12:Math.min(.06,speed*.018);
    this.pitch+=(targetPitch-this.pitch)*(1-Math.exp(-step*18));
    const charge=s.state==='charged'?clamp(this.endAge/.7):0;
    const pose={
      clock:this.clock,speed,dock,connected:s.state==='charged',dockPulse:Math.sin(this.clock*5)*.5+.5,
      brake:brake&&speed>.08,faceYaw:clamp(s.player.velocity[0]/(speed+.3),-1,1)*.32,
      facePitch:this.pitch,
      impact,impactTool:s.lastImpact?.tool||null,impactStrength:gain,
      handLift:awake?.16+clamp(this.endAge/.65)*.55:shallow*.16+impact*gain*(.12+.02*shallow),
      headLift:awake?.12+clamp(this.endAge/.65)*.35:shallow*.10+impact*gain*.08*(1-shallow),
      headTurn:awake?-.22*clamp(this.endAge/.65):-shallow*.13-impact*gain*.10*(1-shallow),
      brow:awake?1:clamp(s.noise*1.8+impact*gain),awake,breath:awake?0:breath*.018,
      charge,chargePitch:this.chargeStartPitch*(1-charge)-Math.sin(charge*Math.PI)*.20,
      fall:s.state==='fell',endAge:this.endAge
    };
    this.lastPose=pose;return {...pose};
  }
}
