export const CROPS=Object.freeze({
 radish:{name:'绯萝',english:'RADISH',days:2,cost:2,yield:2,color:'#bc6250',hardy:false,symbol:'●',note:'两次生长，收获2份。轻快的第一茬。'},
 bean:{name:'青豆',english:'BEAN',days:3,cost:3,yield:3,color:'#63865a',hardy:false,symbol:'◔',note:'三次生长，收获3份。适合成组订单。'},
 melon:{name:'金瓜',english:'SQUASH',days:4,cost:4,yield:2,color:'#c89239',hardy:false,symbol:'◉',note:'四次生长，收获2份。需要提前留地。'},
 grain:{name:'霜麦',english:'GRAIN',days:3,cost:3,yield:2,color:'#b5a15e',hardy:true,symbol:'✧',note:'三次生长，收获2份。寒潮中仍能长大。'}
});
export const WEATHER=Object.freeze({sun:{name:'晴日',icon:'☀',rain:false,cold:false,note:'有水才生长；每次生长用1格水。'},rain:{name:'细雨',icon:'☂',rain:true,cold:false,note:'结束本日先补至2格水，再正常生长。'},cold:{name:'寒潮',icon:'❄',rain:false,cold:true,note:'只有霜麦生长，其他作物保水停长。'}});
export const BUILDINGS=Object.freeze({
 fence:{id:'fence',name:'围栏',cost:3,actionCost:1,chapter:1,plots:2,note:'永久增加2块土地。'},
 bench:{id:'bench',name:'长凳',cost:6,actionCost:1,chapter:2,plots:0,note:'邻居可以坐下聊天；没有经济或行动加成。'}
});
const chapter=(id,name,theme,limit,weather,order,building,hint)=>({id,name,theme,limit,weather,orders:[order],building,actions:4,budget:8,plots:4,crops:Object.keys(CROPS),hint});
export const CHAPTERS=[
 chapter(1,'第一篮与新围栏','spring',6,['sun','rain','sun'],{id:'basket',title:'邻家的小篮',need:{radish:2},reward:7,open:1,due:null},'fence','交付绯萝2份，再花3币和1次行动建围栏，永久增加2块地。'),
 chapter(2,'豆瓜与庭院长凳','summer',7,['sun','sun','rain','sun'],{id:'soup',title:'邻居的豆瓜浓汤',need:{bean:3,melon:2},reward:18,open:1,due:null},'bench','交付青豆3份、金瓜2份，再花6币和1次行动建长凳。长凳没有经济加成。'),
 chapter(3,'秋日的一桌','autumn',8,['sun','cold','rain','sun','rain'],{id:'feast',title:'秋日萝麦双拼',need:{grain:2,radish:2},reward:20,open:1,due:null},null,'交付霜麦2份与绯萝2份。之前的土地、作物、仓库和建筑继续保留。')
];
export const LEVELS=CHAPTERS;
export const weatherAt=(chapter,day=1)=>WEATHER[chapter.weather[(day-1)%chapter.weather.length]];
