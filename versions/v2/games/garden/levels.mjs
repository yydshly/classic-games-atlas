export const COLORS=[{name:'日珀',symbol:'✦',color:'#e5b664',shape:'sun'},{name:'叶翡',symbol:'◇',color:'#8cb9a0',shape:'leaf'},{name:'雨蓝',symbol:'●',color:'#83adca',shape:'drop'},{name:'暮紫',symbol:'△',color:'#baa0c3',shape:'kite'},{name:'莓红',symbol:'♥',color:'#d4919c',shape:'heart'},{name:'月白',symbol:'✚',color:'#dedbc0',shape:'cross'}];
const first=[0,4,4,1,5,2,2,1,2,0,3,2,5,0,2,0,0,5,0,2,1,0,5,2,0,0,1,0,0,1,2,0,2,0,5,4,0,3,4,3,2,3,2,0,3,3,5,3,4,1,4,2,3,1,3,2,2,0,4,0,5,2,1,5];
const second=[0,3,5,4,3,0,2,4,3,3,2,4,3,1,3,5,4,4,0,2,1,0,0,4,0,0,1,0,0,3,5,3,3,4,0,3,3,2,0,3,5,2,2,0,1,4,0,5,3,5,5,3,4,1,2,2,2,4,0,4,2,4,0,3];
export const LEVELS=[
{id:1,name:'把雨蓝留给棱光',seed:109,moves:6,colors:6,score:0,collect:[{color:2,count:14}],layers:0,soil:Array(64).fill(0),board:first,specials:{},palette:0,solution:[[18,26],[26,27]],tip:'先补齐第四行的日珀五连，再让棱晶选择雨蓝。',hint:'第3行第3列向下交换，等掉落结束；再把第4行第3列的棱晶向右交换。'},
{id:2,name:'远处的一束长光',seed:580,moves:8,colors:6,score:0,collect:[{color:1,count:10}],layers:4,soil:Array.from({length:64},(_,i)=>[15,23,47,55].includes(i)?1:0),board:second.map((_,i)=>second[(i%8)*8+(i/8|0)]).map(c=>c===1?2:c===2?1:c),specials:{7:'col'},palette:1,solution:[[18,19],[35,27]],tip:'纵五连造棱，选择叶翡，让远端绿色清列晶松开竖畦。',hint:'第3行第3列向右交换造棱；等棱晶落到第5行第4列，再向上交换第4行第4列的叶翡，触发第8列清列晶。'}
];
