import{neighbors}from'./deduction.mjs';
const colors=['#96c2cb','#77d5ff','#91e7bc','#ffc97a','#d1b4ff','#ff9dba','#90e6e6','#f2e6c2','#ffffff'];
const flag='<path d="M24 39V12l20 7-20 8M17 42h15" fill="none" stroke="#ffcf80" stroke-width="3" stroke-linejoin="round"/><path d="m26 15 13 4-13 5" fill="#ffcf80"/>';
const mine='<path d="m30 12 13 18-13 18-13-18Z" fill="#f19f95" stroke="#ffe1cd" stroke-width="2"/><path d="M30 15v30m-10-15h20" stroke="#502c39" stroke-width="2"/>';
export function boardSVG(v,cursor=-1,fresh=[]){
 const over=['won','lost'].includes(v.state),near=new Set(v.cells[cursor]?.state==='open'?neighbors(v,cursor):[]),hint=new Set(v.hint?.indices||[]),sources=new Set(v.hint?.sources||[]),size=v.w*60+24;
 const cells=v.cells.map((c,i)=>{const x=12+i%v.w*60,y=12+Math.floor(i/v.w)*60,open=c.state==='open',hazard=over&&c.mine,mark=c.state==='flagged';let fill=open?'#132f3b':'#294f60',stroke=open?'#365b67':'#60909b',symbol='',label=open?`数字 ${c.number}`:mark?'旗标，未核验':'未揭开';
 if(open&&c.number)symbol=`<text x="30" y="40" text-anchor="middle" fill="${colors[c.number]}" font-family="system-ui,sans-serif" font-weight="750" font-size="30">${c.number}</text>`;
 if(open&&!c.number)symbol='<circle cx="30" cy="30" r="2" fill="#50737c"/>';
 if(!open&&!mark)symbol='<path d="m27 27 3-3 3 3-3 3Z" fill="#8ab0b7" opacity=".4"/>';
 if(mark)symbol=flag;if(hazard){symbol=mine;fill=i===v.exploded?'#793c48':'#493b48';label='地雷';}
 if(c.wrongFlag){symbol=flag+'<path d="m16 16 28 28m0-28L16 44" stroke="#ff8b93" stroke-width="4"/>';label='错误旗标';}
 if(hint.has(i))stroke='#ffd18b';if(sources.has(i))stroke='#b5a0ff';
 return`<g data-index="${i}" role="button" tabindex="${i===cursor?0:-1}" aria-label="${Math.floor(i/v.w)+1}行${i%v.w+1}列，${label}" class="tile${fresh.includes(i)?' fresh':''}${i===cursor?' selected':''}" transform="translate(${x} ${y})"><rect x="3" y="5" width="54" height="54" rx="7" fill="#071c28"/><rect class="face" x="3" y="2" width="54" height="54" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="${hint.has(i)||sources.has(i)?3:1}"/>${!open?'<path d="M11 8h34" stroke="#91bbc3" opacity=".3"/>':''}${near.has(i)?'<rect x="6" y="5" width="48" height="48" rx="5" fill="#a9f1ff" opacity=".13"/>':''}${symbol}${i===cursor?'<rect x="7" y="6" width="46" height="46" rx="4" fill="none" stroke="#e2f6f5" stroke-width="2" stroke-dasharray="3 3"/>':''}</g>`;
 }).join('');
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="group" aria-label="${v.w}乘${v.h}勘探盘，方向键移动，空格揭开，F标旗，C展开" style="max-width:100%;height:auto;display:block"><rect x="1" y="1" width="${size-2}" height="${size-2}" rx="16" fill="#0b2330" stroke="#496875" stroke-width="2"/>${cells}</svg>`;
}
export class Renderer{
 constructor(board){this.board=board;this.open=new Set();this.signature='';}
 draw(v,cursor){const sig=JSON.stringify([v.state,v.cells,v.hint,cursor]);if(sig===this.signature)return;this.signature=sig;const focused=this.board.contains(document.activeElement),fresh=v.cells.flatMap((c,i)=>c.state==='open'&&!this.open.has(i)?[i]:[]);this.open=new Set(v.cells.flatMap((c,i)=>c.state==='open'?[i]:[]));this.board.innerHTML=boardSVG(v,cursor,fresh);if(focused)this.board.querySelector(`[data-index="${cursor}"]`)?.focus({preventScroll:true});}
}
