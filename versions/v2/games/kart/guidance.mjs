import {LEVELS,RULES,pointAt} from './engine.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function distance(a,b,length){let d=(a-b)%length;if(d>length/2)d-=length;if(d< -length/2)d+=length;return d;}
export function pulseTargets(g){const p=g.cars[0],l=LEVELS[g.level-1];return g.cars.filter(c=>c.id!==0&&c.finishTime===null&&c.shield<=0&&Math.hypot(distance(c.s,p.s,l.track.length),c.lateral-p.lateral)<=RULES.pulseRange).map(c=>c.id);}
export function drivingCue(g){const p=g.cars[0],l=LEVELS[g.level-1],ahead=clamp(p.speed*.55,30,65),here=pointAt(l,p.s),next=pointAt(l,p.s+ahead);let curve=next.curvature;const direction=curve>.003?'右弯':curve<-.003?'左弯':'直道';const sharp=Math.abs(curve)>.012;
 const stage=p.boost>0?'boost':p.driftCharge>=1.15?'gold':p.driftCharge>=RULES.driftMinimum?'blue':p.drifting?'charge':'idle';
 const text=p.offroad?'路肩减速 · 先回到路面':p.slow>0?'被脉冲击中 · 稳住方向':p.boost>0?'冲刺中 · 准备下一弯':p.driftCharge>=RULES.driftMinimum&&Math.abs(next.curvature)<Math.abs(here.curvature)*.75?'出弯了 · 松开漂移冲刺':`${direction}${sharp?' · 先收速':' · 看准出口'}`;
 return {direction,sharp,curvature:curve,ahead,stage,text,charge:p.driftCharge,releaseReady:p.driftCharge>=RULES.driftMinimum,targets:p.item==='pulse'?pulseTargets(g):[]};
}
export function itemCue(g){const p=g.cars[0],cue=drivingCue(g);if(p.item==='pulse'){const n=cue.targets.length;return n?`范围内 ${n} 位对手 · 现在可干扰`:'范围内无目标 · 留到贴身超车';}if(p.item==='boost')return cue.sharp?'前方急弯 · 留到出口再冲':'前方较顺 · 可用冲刺追赶';if(p.item==='shield')return g.cars.some(c=>c.id!==0&&c.finishTime===null&&Math.hypot(distance(c.s,p.s,LEVELS[g.level-1].track.length),c.lateral-p.lateral)<40)?'近身争位 · 可开护盾保护':'保留护盾 · 接近对手或木桩时使用';return p.shield>0?`护盾剩余 ${p.shield.toFixed(1)} 秒`:'沿路接近补给箱 · 空槽才可拾取';}
