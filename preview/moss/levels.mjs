const grid=()=>Array.from({length:12},(_,y)=>Array.from({length:24},(_,x)=>x===0||x===23||y===0||y===11?'#':'.'));
const fill=(g,y,start,end,ch='#')=>{for(let x=start;x<=end;x++)g[y][x]=ch;};
const finish=g=>g.map(row=>row.join(''));
const first=grid();fill(first,9,1,7);fill(first,9,11,22);fill(first,11,8,10,'~');
const second=grid();fill(second,7,3,4);fill(second,7,8,18);fill(second,8,2,2);fill(second,8,19,19);fill(second,10,1,22);fill(second,6,14,15,':');
const third=grid();fill(third,7,1,10);fill(third,7,14,20);fill(third,8,21,21);fill(third,10,1,22);fill(third,6,6,7,':');
export const LEVELS=[
 {id:1,name:'第一程 · 溪口一桥',brief:'前方断口只有一座桥的材料。让领队架桥、后方同伴暂作挡员；整桥完成后免费放行挡员，带大家走到苔灯门。',grid:finish(first),spawn:{x:2.5,y:9,dir:1},exit:{x:21.5,y:9},total:5,quota:4,interval:1.25,limit:70,resources:{block:1,bridge:1,dig:0}},
 {id:2,name:'第二程 · 两岸回廊',brief:'向右开土是短路；也可用挡员令队伍折返，在左侧架桥走长路。两端都有安全下降台阶；直接跌进中间深坑会失足。',grid:finish(second),spawn:{x:10.5,y:7,dir:1},exit:{x:12.5,y:10},total:6,quota:5,interval:2.5,limit:85,resources:{block:1,bridge:1,dig:1}},
 {id:3,name:'第三程 · 苔灯归途',brief:'先开土，再跨过断口。可让后方挡员保护施工，也可领队先挡住全队回旋，待队伍散开后放行架桥。最后经台阶下降，回到苔灯门。',grid:finish(third),spawn:{x:2.5,y:7,dir:1},exit:{x:16.5,y:10},total:7,quota:6,interval:1.8,limit:90,resources:{block:2,bridge:1,dig:1}}
];
export const TOOLS={block:{name:'驻足挡员',description:'站定并让接近的同伴转向。消耗1次挡员，免费放行后不返还。'},bridge:{name:'搭一座桥',description:'朝前跨1–3格空口，须有对岸。0.7秒/格，整桥完工后同时开放。'},dig:{name:'横向开土',description:'挖通面前1–3格连续土墙。0.7秒/格，地板不挖，完工后开放。'},release:{name:'放行挡员',description:'免费恢复驻足同伴原来的行走方向。'}};
