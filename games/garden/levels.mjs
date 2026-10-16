export const COLORS=[{name:'日珀',symbol:'✦',color:'#e5b664',shape:'sun'},{name:'叶翡',symbol:'◇',color:'#8cb9a0',shape:'leaf'},{name:'雨蓝',symbol:'●',color:'#83adca',shape:'drop'},{name:'暮紫',symbol:'△',color:'#baa0c3',shape:'kite'},{name:'莓红',symbol:'♥',color:'#d4919c',shape:'heart'},{name:'月白',symbol:'✚',color:'#dedbc0',shape:'cross'}];
const names=['第一束晨光','叶间露珠','松开一寸土','窗边琥珀','雨落花盘','细根交织','紫色风铃','莓影小径','六色日晷','一场轻雨','午后花畦','月白石阶','风的回廊','双叶交响','青苔之环','向阳长廊','晚霞信笺','露台星图','花园深处','晶簇盛放'];
const configs=[
 [18,5,300,[],0],[20,5,0,[[1,12]],0],[22,5,0,[],6],[22,5,600,[],0],[24,5,0,[[2,16]],0],
 [24,5,450,[],10],[25,5,0,[[3,18]],0],[25,5,550,[[4,12]],0],[26,6,700,[],0],[26,6,0,[[2,16]],8],
 [27,6,750,[],10],[27,6,0,[[5,18]],0],[28,6,850,[[0,14]],0],[28,6,0,[[1,14],[2,14]],0],[29,6,650,[],14],
 [29,6,950,[[0,16]],0],[30,6,0,[[3,16],[4,16]],0],[30,6,800,[[5,14]],12],[31,6,1000,[[1,16]],12],[32,6,1200,[[0,16],[4,16]],14]
];
function soil(index){const out=Array(64).fill(0);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=y*8+x,a=index%5;const yes=a===0?(x===2||x===5||y===2||y===5):a===1?((x+y)%3===0):a===2?(x>=2&&x<=5&&y>=1&&y<=6):a===3?(x===y||x+y===7||y===3):((x%3===1)||(y%3===1));if(yes)out[i]=index>=14&&((x+y)%3===0)?2:1;}return out;}
export const LEVELS=configs.map(([moves,colors,score,collect,layers],i)=>({id:i+1,name:names[i],seed:73129+i*1709,moves,colors,score,collect:collect.map(([color,count])=>({color,count})),layers,soil:layers?soil(i):Array(64).fill(0),palette:Math.floor(i/7),tip:i<3?'先看目标，再选择让晶簇相遇的一步。':i<8?'四连留下一束长光，交叉让花蕊绽放。':i<14?'让特殊晶簇经过需要松动的土层。':'在最后一步之前，为连锁留出下一次相遇。'}));
