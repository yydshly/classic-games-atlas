// Saved paper-space endpoints, not pointer samples or animation-time artwork.
export const LIMIT = 2;
export const RESPONSE_TIME = .8;
// New drafts keep 44px endpoint targets apart even on the 320px layout.
// validMark keeps its original lower bound so saved v2 marks never change.
export const MIN_GESTURE=240;
export const clone = value => JSON.parse(JSON.stringify(value));
export function validMark(mark) {
  return !!mark && Object.keys(mark).sort().join(',') === 'x1,x2,y1,y2' &&
    Object.values(mark).every(n => Number.isInteger(n) && n >= 80 && n <= 920) &&
    Math.hypot(mark.x2-mark.x1,mark.y2-mark.y1) >= 60;
}
export function leaf(mark) {
  const a={x:mark.x1/1000,y:mark.y1/1000}, b={x:mark.x2/1000,y:mark.y2/1000};
  const dx=b.x-a.x,dy=b.y-a.y,side={x:-dy*.38,y:dx*.38};
  const bound=n=>Math.max(.04,Math.min(.96,n));
  return {a,b,left:{x:bound((a.x+b.x)/2+side.x),y:bound((a.y+b.y)/2+side.y)},right:{x:bound((a.x+b.x)/2-side.x),y:bound((a.y+b.y)/2-side.y)}};
}
export function response(mark,index=0) {
  const {a}=leaf(mark),from={x:.46,y:.86};
  return {from,bend:{x:from.x+(a.x-from.x)*.15+(index%2?-.025:.025),y:Math.min(.96,a.y+.13)},to:{...a}};
}
export function normalizeGesture(a,b) {
  const bound=n=>Math.max(80,Math.min(920,Math.round(n)));
  let mark={x1:bound(a.x),y1:bound(a.y),x2:bound(b.x),y2:bound(b.y)};
  let dx=mark.x2-mark.x1,dy=mark.y2-mark.y1,length=Math.hypot(dx,dy);
  if(length<1) {
    mark.x2=bound(mark.x1+(mark.x1>700?-130:130));mark.y2=bound(mark.y1+(mark.y1>700?-200:-130));
    dx=mark.x2-mark.x1;dy=mark.y2-mark.y1;length=Math.hypot(dx,dy);
  }
  if(length<MIN_GESTURE) {
    // Keep a short drag's chosen direction; the same minimum-sized leaf is
    // shown during the draft and saved on release. Shift the stem at an edge.
    const ux=dx/length,uy=dy/length;
    mark.x2=bound(mark.x1+ux*(MIN_GESTURE+4));mark.y2=bound(mark.y1+uy*(MIN_GESTURE+4));
    if(Math.hypot(mark.x2-mark.x1,mark.y2-mark.y1)<MIN_GESTURE) {
      mark.x1=bound(mark.x2-ux*(MIN_GESTURE+4));mark.y1=bound(mark.y2-uy*(MIN_GESTURE+4));
    }
  }
  return mark;
}
