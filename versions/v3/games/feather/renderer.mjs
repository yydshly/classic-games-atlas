import {render as renderV2,hitNode} from '../../../v2/games/feather/renderer.mjs';
import {SPRITE_META} from '../../../v2/games/feather/asset-meta.mjs';
import {phase,active,maxHP,SPECIES,ELEMENTS,trialElement,trialIntent,TRIAL} from './model.mjs';
export {hitNode};
function label(ctx,text,x,y,size=24){ctx.font='600 '+size+'px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f6edcf';ctx.fillText(text,x,y);}
function sprite(ctx,assets,id,x,foot,width){const im=assets[id];if(!im)return;const h=width*im.height/im.width,a=SPRITE_META[id].foot;ctx.drawImage(im,x-width*a[0],foot-h*a[1],width,h);}
export function render(ctx,s,assets,options){
 const mode=phase(s),b=s.base;
 if(mode!=='trial'){renderV2(ctx,b,assets,options);if(mode==='ending'){ctx.fillStyle='#163c32';ctx.fillRect(300,30,600,90);label(ctx,'浅滩冒险完成',600,70,30);label(ctx,'这次归途，已经有了新的同行',600,101,21);}return;}
 if(assets.background)ctx.drawImage(assets.background,0,0,1200,675);else{ctx.fillStyle='#315c4c';ctx.fillRect(0,0,1200,675);}
 ctx.fillStyle='#0d2d25a6';ctx.fillRect(0,0,1200,675);
 const t=s.trial,p=active(b),element=trialElement(s),color=ELEMENTS[element].color;
 sprite(ctx,assets,p.id,310,530,280);
 const other=b.team.find(id=>id!==b.active);if(other)sprite(ctx,assets,other,140,570,100);
 ctx.save();ctx.translate(850,330);ctx.strokeStyle=color;ctx.fillStyle=color+'22';ctx.lineWidth=7;
 ctx.beginPath();ctx.arc(0,0,110,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([12,18]);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,142,0,Math.PI*2);ctx.stroke();ctx.restore();
 label(ctx,ELEMENTS[element].name,850,348,64);label(ctx,'浅滩回响 · 自然的合奏，不是新的生灵',600,54,25);
 label(ctx,SPECIES[p.id].name+(p.rank?' · 已成长':''),310,570,25);label(ctx,'体力 '+p.hp+'/'+maxHP(p)+' · 能量 '+p.energy+'/3',310,610,23);
 label(ctx,'余势 '+t.hp+'/'+TRIAL.hp+' · 安心 '+t.calm+'/60',850,530,25);
 label(ctx,'第 '+(t.turn+1)+' 拍 / '+TRIAL.turns+' · '+trialIntent(s),850,576,25);
 label(ctx,'属性与来招均已预告；换位、守息和技能各占一拍',600,648,21);
}
