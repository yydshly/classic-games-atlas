export const flagSvg='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 32V8m0 1 17 5-17 5M8 33h13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="m14 10 14 4-14 4" fill="currentColor" opacity=".4"/></svg>';
export const mineSvg='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 8 9 12-9 12-9-12Z" fill="currentColor" opacity=".5"/><path d="m20 8 9 12-9 12-9-12Zm0 0v24M8 8l-3-3m27 27 3 3M8 32l-3 3M32 8l3-3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>';
export const startSvg='<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m20 8 2.8 9.2L32 20l-9.2 2.8L20 32l-2.8-9.2L8 20l9.2-2.8Z" fill="currentColor"/><path d="M20 2v4m0 28v4M2 20h4m28 0h4" stroke="currentColor"/></svg>';
export class Renderer{
 constructor(board){this.board=board;this.signature='';}
 draw(v,cursor){
  const signature=JSON.stringify([v.state,v.cells,v.hint,cursor]);if(signature===this.signature)return;this.signature=signature;
  const active=this.board.contains(document.activeElement),hint=new Set(v.hint?.indices||[]),sources=new Set(v.hint?.sources||[]);this.board.style.setProperty('--cols',v.w);this.board.style.setProperty('--rows',v.h);this.board.setAttribute('aria-rowcount',v.h);this.board.setAttribute('aria-colcount',v.w);
  this.board.innerHTML=v.cells.map((c,i)=>{if(!c)return'<span class="void" role="presentation" aria-hidden="true"></span>';const r=(i/v.w|0)+1,col=i%v.w+1,first=!v.started&&i===v.start,over=v.state==='won'||v.state==='lost',hazard=over&&c.mine,wrong=!!c.wrongFlag;let symbol='',meaning='未揭开';
   if(c.state==='open'){symbol=c.number?String(c.number):'<i class="zero-dot"></i>';meaning=`已揭开，数字 ${c.number}`;}if(first){symbol=startSvg;meaning='首次安全观测点，从这里开始';}if(c.state==='flagged'){symbol=flagSvg;meaning='已标旗，尚未核验';}if(hazard){symbol=mineSvg;meaning=v.state==='won'?'已封存雷点':'地雷';}if(wrong){symbol=flagSvg+'<i class="wrong-cross">×</i>';meaning='错误旗标，安全格';}
   return`<button type="button" role="gridcell" aria-rowindex="${r}" aria-colindex="${col}" aria-label="${r}行${col}列，${meaning}" data-index="${i}" data-number="${c.number??''}" class="cell ${c.state}${first?' starting':''}${hazard?' hazard':''}${wrong?' wrong':''}${i===v.exploded?' exploded':''}${hint.has(i)?' conclusion':''}${sources.has(i)?' evidence':''}" tabindex="${i===cursor?0:-1}" ${v.state!=='playing'?'disabled':''}>${symbol}</button>`;
  }).join('');if(active&&v.state==='playing')this.board.querySelector(`[data-index="${cursor}"]`)?.focus({preventScroll:true});
 }
}
