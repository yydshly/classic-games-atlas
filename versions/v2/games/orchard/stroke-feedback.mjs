// Presentation only. One current/recent stroke; no replay, game mutation or save fields.
export const strokeMark=g=>({score:g.score,cuts:g.stats.cuts,bombs:g.stats.bombs,penalties:g.stats.penalties});
export function createStrokeFeedback(){
 let owner=null,start=null,last=null;
 function ensure(g){if(owner!==g){owner=g;start=null;last=null;}}
 return {
  record(g,command,before,accepted){
   ensure(g);if(!accepted)return;
   if(command.kind==='down'){start={...before};last={kind:'active',text:'划切中 · 抬刀后可重新起弧。'};return;}
   if(!start)return;
   const cuts=g.stats.cuts-start.cuts,bombs=g.stats.bombs-start.bombs,penalty=g.stats.penalties-start.penalties;
   if(cuts||bombs){
    last=bombs?{kind:'bad',text:`最近一刀：切中${cuts}果、误核${bombs}枚 · 实扣${penalty}分，连切已中断；分数${start.score}→${g.score}。`}:{kind:'good',text:`最近一刀：切中${cuts}果 · 获得${g.score-start.score}分；分数${start.score}→${g.score}。`};
   }else if(command.kind==='up')last={kind:'neutral',text:'最近一刀未切中。抬刀后，试试靠近果实的短弧。'};
   else if(command.kind==='cancel')last={kind:'neutral',text:'这次划切已取消；继续时重新按下。'};
   if(['up','cancel'].includes(command.kind))start=null;
  },
  read(g){
   ensure(g);
   if(g.state==='complete')return {kind:'neutral',text:`本场完成：切中${g.stats.cuts}果、误核${g.stats.bombs}枚，累计扣${g.stats.penalties}分。`};
   if(last?.kind==='active'&&!g.stroke)return {kind:'neutral',text:'划切已取消；继续时重新按下。'};
   if(last)return {...last};
   if(g.state==='paused')return {kind:'neutral',text:`本场已切${g.stats.cuts}果、误核${g.stats.bombs}枚，累计扣${g.stats.penalties}分。继续时重新按下划切。`};
   return {kind:'neutral',text:'按住划过水果；遇到荆核请抬刀绕开。'};
  }
 };
}
