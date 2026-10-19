export const WIDTH=8,HEIGHT=16,STEP=1/120,LOCK_DELAY=.45,RESET_LIMIT=8;
const definitions={I:[[0,0],[1,0],[2,0],[3,0]],O:[[0,0],[1,0],[0,1],[1,1]],T:[[1,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]]};
function normalize(p){const x=Math.min(...p.map(v=>v[0])),y=Math.min(...p.map(v=>v[1]));return p.map(([a,b])=>[a-x,b-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);}
export const SHAPES=Object.fromEntries(Object.entries(definitions).map(([k,p])=>{const rotations=[];for(let i=0;i<4;i++){p=normalize(p);rotations.push(p);p=p.map(([x,y])=>[-y,x]);}return[k,rotations];}));
export const TYPES={I:{name:'长梭',color:'#879b70'},O:{name:'方舟',color:'#ca8e96'},T:{name:'三叉',color:'#c3a161'},L:{name:'折角',color:'#6f9da5'},J:{name:'镜角',color:'#8f89ae'},S:{name:'斜阶',color:'#8fb5a0'},Z:{name:'镜阶',color:'#be886d'}};
export const KICKS=[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]];
export const THEMES={dawn:{name:'晨星台',background:'#f1ebdf',ink:'#466855'},glow:{name:'霞光带',background:'#eee7e4',ink:'#8b6861'},night:{name:'深空庭',background:'#e8e8ee',ink:'#656783'}};
const specs=[['第一颗星，落在这里',0,[],2,22,.72],['让留白连成一行',0,[],3,26,.66],['两格宽的星尘井',2,[6,7],4,28,.62],['给长梭留一条路',3,[7],5,30,.58],['另一侧的晨光',2,[0,1],5,32,.54],['把折角放进余地',3,[0],6,34,.50],['四层星尘，逐层点亮',4,[6,7],6,34,.46],['中间也有一条归路',2,[3,4],6,38,.42],['让接地成为一拍',3,[7],7,40,.38],['留住下一枚的空间',4,[0],8,42,.34],['在起伏之间成行',3,[2,3],8,44,.30],['整座星环，都亮起来',4,[6,7],10,48,.27]];
export const LEVELS=specs.map(([name,depth,gaps,lines,budget,gravity],i)=>({id:i+1,name,theme:['dawn','glow','night'][Math.floor(i/4)],seed:173+i*7919,depth,gaps,goalLines:lines,budget,gravity,hint:i<4?'先看半透明落点，再横移和旋转。每一行填满后同时消除；星尘格也要清完。':i<8?'井口要留给能填下去的形状。预览三枚，兼顾当前落点和下一次空间。':'重力更快，接地后仍有短暂调整。用软降微调，硬降立即锁定；别把未填的洞埋住。'}));
export function sequence(seed,count=512){let state=seed>>>0||1;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;},out=[];while(out.length<count){const bag=Object.keys(SHAPES);for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}out.push(...bag);}return out.slice(0,count);}
export function foundation(l){return Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>y>=HEIGHT-l.depth&&!l.gaps.includes(x)?{type:'stone',id:`s${l.id}-${x}-${y}`} :null));}


// v2 is a bounded custom score run; the original campaign lives at /games/orbit/.
export const DURATION_TICKS=21600;
export const RUN_SEED=173;
export const speedLevel=g=>Math.min(7,Math.floor(g.lines/8)+1);
export const gravity=g=>[.72,.64,.56,.48,.40,.32,.24][speedLevel(g)-1];
