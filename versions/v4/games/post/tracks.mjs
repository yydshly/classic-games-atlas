// Independent model candidate: retain both published track objects exactly.
import {TRACKS as ORIGINAL_TRACKS,buildCompatibleTrack} from '../../../v3/games/post/tracks.mjs';
export {atArc,project,gates,buildCompatibleTrack,BASELINE_ROUTE_ID,CANDIDATE_ROUTE_ID} from '../../../v3/games/post/tracks.mjs';
export const THIRD_ROUTE_ID='post-v4-bridge-return-v1';
export const THIRD_DEFINITION=[
 '桥湾回环','coast',2,95,43,
 [[130,115],[420,115],[500,195],[585,115],[770,115],[815,340],
  [705,530],[520,530],[470,430],[360,430],[305,530],[115,530],
  [85,315],[230,260]],
 '桥头反向弯要提前看下一弯；回湾前可中线稳刹，也可先摆位后晚切。所有道路等宽，须按顺序穿过闸门。'
];
export const THIRD_TRACK=buildCompatibleTrack(THIRD_DEFINITION,10,THIRD_ROUTE_ID);
export const TRACKS=[...ORIGINAL_TRACKS,THIRD_TRACK];
export const routeById=id=>TRACKS.find(t=>t.routeId===id);
export const trackFor=g=>routeById(g.routeId);
