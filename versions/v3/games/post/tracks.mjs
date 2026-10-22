// Original second route, integrated from the reviewed geometry candidate.
import {atArc, project, gates} from '../../../v2/games/post/tracks.mjs?v=post-v2-r1';
export {atArc, project, gates};

export const BASELINE_ROUTE_ID = 'post-v2-morning-block-v1';
export const CANDIDATE_ROUTE_ID = 'post-v2-sluice-switchbacks-v1';

// Original hand-authored coordinates. This is neither a mirrored first route nor
// an imported real-world/copyrighted circuit. Same tuple shape as the existing defs.
export const CANDIDATE_DEFINITION = [
  '水闸折线', 'coast', 2, 95, 43,
  [[145,100],[740,100],[810,225],[620,280],[780,420],[680,535],
   [430,535],[320,400],[180,535],[90,410],[220,285],[90,205]],
  '长直道尽头先减速；水闸前连续换向，收住转向再接下一弯。两圈按序过闸，复位仍罚停三秒。'
];

// Same quadratic-corner construction, sampling, start anchor and gate placement
// as versions/v2/games/post/tracks.mjs at the declared baseline. Exporting this
// helper here avoids editing the tracked source to inspect the candidate.
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const mix = (a,b,t) => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function buildCompatibleTrack(d, id = 9, routeId = CANDIDATE_ROUTE_ID) {
  const [name,environment,laps,limit,halfWidth,coords,tip] = d;
  const v=coords.map(([x,y])=>({x,y})),raw=[];
  for(let i=0;i<v.length;i++) {
    const a=v[(i+v.length-1)%v.length],b=v[i],c=v[(i+1)%v.length];
    const r=Math.min(65,dist(a,b)*.24,dist(b,c)*.24);
    const entry=mix(b,a,r/dist(a,b)),exit=mix(b,c,r/dist(b,c));
    if(raw.length) {
      const prev=raw.at(-1);
      for(let j=1;j<=12;j++)raw.push(mix(prev,entry,j/12));
    } else raw.push(entry);
    for(let j=1;j<=16;j++) {
      const t=j/16;
      raw.push({x:(1-t)**2*entry.x+2*(1-t)*t*b.x+t*t*exit.x,
        y:(1-t)**2*entry.y+2*(1-t)*t*b.y+t*t*exit.y});
    }
  }
  const last=raw.at(-1),first=raw[0];
  for(let j=1;j<12;j++)raw.push(mix(last,first,j/12));
  const anchor=mix(v[0],v[1],.5);
  let at=0;
  raw.forEach((p,i)=>{if(dist(p,anchor)<dist(raw[at],anchor))at=i;});
  const points=[...raw.slice(at),...raw.slice(0,at)],segments=[];
  let length=0;
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],n=dist(a,b);
    if(n>1e-6) {
      segments.push({a,b,length:n,start:length,tx:(b.x-a.x)/n,ty:(b.y-a.y)/n});
      length+=n;
    }
  }
  const track={id,name,environment,laps,limit,halfWidth,gateCount:v.length,
    tip,points,segments,length,routeId};
  track.gateArcs=[0,...v.slice(1).map((b,i)=>
    project(track,mix(b,v[(i+2)%v.length],.5)).arc)];
  return track;
}

// 9 is the next unused numeric id after all eight existing definitions. It is a
// rendering compatibility hint, never a record key. The stable routeId is the key.
export const CANDIDATE_TRACK = buildCompatibleTrack(CANDIDATE_DEFINITION);


import {TRACKS as ORIGINAL} from '../../../v2/games/post/tracks.mjs?v=post-v2-r1';
export const TRACKS=[{...ORIGINAL[0],routeId:BASELINE_ROUTE_ID},CANDIDATE_TRACK];
export const routeById=id=>TRACKS.find(t=>t.routeId===id);
export const trackFor=g=>routeById(g.routeId);
