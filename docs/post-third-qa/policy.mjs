import {trackFor,project,atArc} from '../../versions/v4/games/post/tracks.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrap=n=>((n+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
// Pure geometric read-only pilot. Returns digital keys rather than modifying cars.
export function decide(g,{strategy='center',params={}}={}){
 if(strategy==='idle')return{steer:0,gas:0,brake:0,reason:'No driving input; ordinary time limit remains active'};
 const t=trackFor(g),c=g.cars[0],q=project(t,c);
 const p={speed:strategy==='center'?150:185,bend:strategy==='center'?85:62,look:.30,threshold:.15,lane:0,...params};
 const look=clamp(c.speed*p.look+30,35,100);
 const ahead=atArc(t,q.arc+look),far=atArc(t,q.arc+look+55);
 const signed=wrap(Math.atan2(far.ty,far.tx)-Math.atan2(q.ty,q.tx));
 let lane=p.lane;
 if(strategy==='late'){
  const near=atArc(t,q.arc+18),alreadyTurning=Math.abs(wrap(Math.atan2(near.ty,near.tx)-Math.atan2(q.ty,q.tx)))>.05;
  lane=Math.sign(signed)*(alreadyTurning?12:-20);
  // Visible traffic changes the chosen ordinary steering line, never positions.
  let best=Infinity,choice=lane;
  for(const value of [lane,-26,0,26]){
   let score=Math.abs(value-lane)*.8;
   for(const o of g.cars.slice(1)){
    if(o.finishedAt!==null)continue;
    const z=project(t,o),ds=(z.arc-q.arc+t.length)%t.length;
    if(ds<80||ds>t.length-32){const lat=(o.x-z.x)*(-z.ty)+(o.y-z.y)*z.tx;score+=Math.max(0,27-Math.abs(lat-value))*14;}
   }
   if(score<best){best=score;choice=value;}
  }
  lane=choice;
 }
 const heading=Math.atan2(ahead.y+ahead.tx*lane-c.y,ahead.x-ahead.ty*lane-c.x),err=wrap(heading-c.angle);
 const desired=clamp(p.speed-Math.abs(signed)*p.bend-Math.abs(err)*20,70,p.speed);
 return{steer:Math.abs(err*2.3)>p.threshold?Math.sign(err):0,gas:strategy==='reckless'?1:c.speed<desired?1:0,brake:strategy==='reckless'?0:c.speed>desired+8?1:0,lane,desired,reason:strategy==='late'?'setup for next bend':strategy==='reckless'?'Full throttle ignores braking demand':'centerline early brake'};
}
