// This module accepts only the public board: visible numbers, assumed flags,
// active geometry, total mine count and the disclosed safe starting point.
// No engine/level imports, mine positions, generation seeds or answer routes.
export function neighbors(v,index){const x=index%v.w,y=index/v.w|0,out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if((dx||dy)&&xx>=0&&xx<v.w&&yy>=0&&yy<v.h&&v.cells[yy*v.w+xx]!==null)out.push(yy*v.w+xx);}return out;}
const at=(v,i)=>`${(i/v.w|0)+1}行${i%v.w+1}列`;
const subset=(a,b)=>a.every(i=>b.includes(i));
export function deduce(v){
 if(v.state!=='playing')return{type:'none',indices:[],sources:[],rule:'inactive',reason:'请先展开星图，暂停时不能推理操作。'};
 if(!v.started)return{type:'reveal',indices:[v.start],sources:[],rule:'start',reason:`${at(v,v.start)}是公开标明的安全观测点，首次请从这里揭开。`};
 const covered=[],flags=[];v.cells.forEach((c,i)=>{if(c?.state==='covered')covered.push(i);if(c?.state==='flagged')flags.push(i);});
 const constraints=[];
 for(let i=0;i<v.cells.length;i++){
  const c=v.cells[i];if(c?.state!=='open')continue;const ns=neighbors(v,i),unknown=ns.filter(j=>v.cells[j].state==='covered'),marked=ns.filter(j=>v.cells[j].state==='flagged').length,need=c.number-marked;
  if(need<0||need>unknown.length)return{type:'conflict',indices:ns.filter(j=>v.cells[j].state==='flagged'),sources:[i],rule:'contradiction',reason:`${at(v,i)}显示 ${c.number}，邻旗 ${marked}、未知格 ${unknown.length}，与数字矛盾。先检查并撤回旗标；提示不核验隐藏雷位。`};
  if(!unknown.length)continue;
  const base={set:unknown,need,sources:[i],label:`${at(v,i)}数字 ${c.number} − 邻旗 ${marked} = ${need} 枚雷`,origin:i};base.proof=[base.label];constraints.push(base);
  if(need===unknown.length)return{type:'flag',indices:unknown,sources:[i],rule:'full',reason:`${base.label}；恰有 ${unknown.length} 个未知邻格，所以按现有旗标假设，这些格都应标雷。`};
  if(need===0)return{type:c.number>0?'chord':'reveal',index:i,indices:unknown,sources:[i],rule:'satisfied',reason:`${base.label}；余下 ${unknown.length} 个未知邻格可展开。此结论以当前旗标正确为前提。`};
 }
 const remaining=v.totalMines-flags.length;
 if(remaining<0||remaining>covered.length)return{type:'conflict',indices:flags,sources:[],rule:'total-conflict',reason:'当前旗数与公开总雷数矛盾，请先检查旗标。'};
 if(covered.length&&remaining===0)return{type:'reveal',indices:covered,sources:[],rule:'total',reason:`公开总雷数 ${v.totalMines} − 已插旗 ${flags.length} = 0。按旗标假设，其他未知格均可揭开。`};
 if(covered.length&&remaining===covered.length)return{type:'flag',indices:covered,sources:[],rule:'total',reason:`尚有 ${remaining} 枚雷与 ${covered.length} 个未知格；按旗标假设，这些格都应标雷。`};
 if(covered.length)constraints.push({set:covered,need:remaining,sources:[],label:`全图剩余 ${remaining} 枚雷`,proof:[`公开总雷数 ${v.totalMines} − 已插旗 ${flags.length} = ${remaining} 枚雷`],origin:null});
 // Derive proper-set differences; keep their public-number provenance.
 const seen=new Set(constraints.map(c=>c.set.join(',')+':'+c.need));
 for(let round=0;round<3;round++){
  const current=constraints.slice();let added=false;
  for(const a of current)for(const b of current){
   if(a.set.length>=b.set.length||!subset(a.set,b.set))continue;const diff=b.set.filter(i=>!a.set.includes(i)),need=b.need-a.need,sources=[...new Set([...a.sources,...b.sources])];
   if(need<0||need>diff.length)return{type:'conflict',indices:diff,sources,rule:'subset-conflict',reason:'可见数字的包含关系发生矛盾，请检查已有旗标；提示不读取隐藏答案。'};
   const proof=[...new Set([...(a.proof??[a.label]),...(b.proof??[b.label])])];
   const reason=`已知：${proof.join('；')}。集合差：${b.label}；其中包含“${a.label}”。相减后多出的 ${diff.length} 格含 ${need} 枚雷。${need===0?'因此可揭开。':'因此应全部标旗。'}所有结论以当前旗标正确为前提。`;
   if(need===0)return{type:'reveal',indices:diff,sources,rule:'subset',reason};
   if(need===diff.length)return{type:'flag',indices:diff,sources,rule:'subset',reason};
   const key=diff.join(',')+':'+need;if(!seen.has(key)&&constraints.length<200){seen.add(key);constraints.push({set:diff,need,sources,label:`${diff.map(i=>at(v,i)).join('、')}这 ${diff.length} 格含 ${need} 枚雷`,proof:[...proof,`上述两组相减后 ${diff.length} 格含 ${need} 枚雷`],origin:null});added=true;}
  }
  if(!added)break;
 }
 return{type:'none',indices:[],sources:[],rule:'undetermined',reason:'当前可见关系未得出新结论。检查旗标是否合理；本局只经过有限可见规则筛选，不承诺每种走法都无需猜测；提示不会偷看雷位。'};
}

