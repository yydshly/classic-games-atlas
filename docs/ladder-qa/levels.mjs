export const WIDTH=21,HEIGHT=15;
function room({floors,ladders,ropes,clear=[],soft=[]}){const a=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>!x||!y||x===WIDTH-1||y===HEIGHT-1?'#':'.'));for(let x=1;x<WIDTH-1;x++)a[13][x]='#';for(const [y,t]of floors)for(let x=1;x<WIDTH-1;x++)a[y][x]=t;for(const[x,y]of clear)a[y][x]='.';for(const[x,y]of soft)a[y][x]=':';for(const[y,x1,x2]of ropes)for(let x=x1;x<=x2;x++)a[y][x]='-';for(const[x,y1,y2]of ladders)for(let y=y1;y<=y2;y++)a[y][x]='H';return a.map(r=>r.join(''));}
export const LEVELS=[
 {id:1,name:'第一站 · 修梯小港',brief:'先在底层软砖开洞取核，再向右借梯退出洞口；洞在5.5秒后回填。上层星核与悬绳星核全部取齐，才能从右上离港。',limit:100,spawn:{x:3,y:11},exit:{x:18,y:3},
  tiles:room({floors:[[4,':'],[8,':'],[12,'#']],ladders:[[6,3,12],[17,3,11]],ropes:[[6,6,17]],soft:[[5,12]]}),
  cores:[{id:'buried',x:5,y:12,buried:true},{id:'loft',x:3,y:3},{id:'rope',x:11,y:6}],guards:[{id:1,x:16,y:11,dir:-1}],
  routeHints:['洞内取核后向右进梯，不要等软砖回填。','守卫落进洞后暂时不能追你；回填后会回岗。']},
 {id:2,name:'第二站 · 双梯货栈',brief:'双侧长梯连通三层，中段悬绳可横越守卫。可先走长梯逐层取核，也可开顶层软砖直落悬绳，再从中层开洞下撤；两条顺序都能返回左上出口。',limit:120,spawn:{x:2,y:3},exit:{x:2,y:3},
  tiles:room({floors:[[4,':'],[8,':'],[12,'#']],ladders:[[3,3,11],[18,3,11]],ropes:[[6,3,18]]}),
  cores:[{id:'upper',x:17,y:3},{id:'rope',x:10,y:6},{id:'middle',x:4,y:7},{id:'lower',x:17,y:11}],guards:[{id:1,x:14,y:7,dir:-1}],
  routeHints:['先右上后悬绳可减少和守卫同层。','直落路线省梯程，但要观察落点与守卫位置。']},
 {id:3,name:'第三站 · 回环灯塔',brief:'两名守卫分别守住下层与中层。上下回环、中央梯与两处悬绳提供换层路线；规划五枚星核的顺序，必要时挖洞截断追兵，再回中央灯台撤离。',limit:140,spawn:{x:11,y:3},exit:{x:11,y:3},
  tiles:room({floors:[[4,':'],[8,':'],[12,'#']],ladders:[[2,3,11],[11,3,11],[18,3,11]],ropes:[[3,9,12],[7,6,10],[6,11,18]],clear:[[10,4],[11,4],[7,8],[8,8],[9,8]]}),
  cores:[{id:'upperLeft',x:4,y:3},{id:'upperRight',x:16,y:3},{id:'middleLeft',x:5,y:7},{id:'middleRight',x:15,y:7},{id:'lower',x:10,y:11}],guards:[{id:1,x:6,y:11,dir:-1},{id:2,x:16,y:7,dir:1}],
  routeHints:['左先行可沿侧梯绕到中层，再向中央下撤。','右先行可用软砖直落，避开右侧梯上的迎面守卫。']}
];
