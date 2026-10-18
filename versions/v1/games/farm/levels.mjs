export const CROPS=Object.freeze({
 radish:{name:'绯萝',english:'RADISH',days:2,cost:2,yield:2,color:'#bc6250',hardy:false,symbol:'●',note:'两次生长，收获2份。轻快的第一茬。'},
 bean:{name:'青豆',english:'BEAN',days:3,cost:3,yield:3,color:'#63865a',hardy:false,symbol:'◔',note:'三次生长，收获3份。适合成组订单。'},
 melon:{name:'金瓜',english:'SQUASH',days:4,cost:4,yield:2,color:'#c89239',hardy:false,symbol:'◉',note:'四次生长，收获2份。需要提前留地。'},
 grain:{name:'霜麦',english:'GRAIN',days:3,cost:3,yield:2,color:'#b5a15e',hardy:true,symbol:'✧',note:'三次生长，收获2份。寒潮中仍能长大。'}
});
export const WEATHER=Object.freeze({sun:{name:'晴日',icon:'☀',rain:false,cold:false,note:'有水才生长；每次生长用1格水。'},rain:{name:'细雨',icon:'☂',rain:true,cold:false,note:'结束本日先补至2格水，再正常生长。'},cold:{name:'寒潮',icon:'❄',rain:false,cold:true,note:'只有霜麦生长，其他作物保水停长。'}});
const order=(id,title,need,reward,due=null,open=1)=>({id,title,need,reward,due,open});
const level=(id,name,theme,plots,actions,budget,limit,crops,weather,orders,hint)=>({id,name,theme,plots,actions,budget,limit,crops,weather,orders,hint});
export const LEVELS=[
 level(1,'第一篮绯萝','spring',4,3,6,6,['radish'],['sun','rain','sun'],[order('basket','邻家的小篮',{radish:2},7)],'选一块空地，种下绯萝。两次生长后收获，再把两份一并交单。'),
 level(2,'雨水与豆荚','spring',4,3,7,7,['radish','bean'],['sun','sun','rain'],[order('beans','青豆午餐',{bean:3},9)],'种植自带1格水，晴日结束用掉1格。第二天浇到2格，或等待细雨。'),
 level(3,'两色春篮','spring',4,3,8,8,['radish','bean'],['sun','rain','sun'],[order('mixed','春日双拼',{radish:2,bean:3},15)],'不同生长周期可以同时安排。收获和交单也各用1次行动。'),
 level(4,'先交一篮','spring',4,3,6,9,['radish','bean'],['sun','sun','rain'],[order('early','早市绯萝',{radish:2},7,5),order('later','午后的青豆',{bean:3},10,null,3)],'先完成早市回款，再种后续作物。第5天仍可交早市，结束当天未交才逾期。'),
 level(5,'给金瓜留一角','summer',6,4,10,9,['radish','bean','melon'],['sun','sun','rain','sun'],[order('gold','金色小点',{melon:2,radish:2},18)],'金瓜要四次生长。先种长周期作物，再安排短周期与收获行动。'),
 level(6,'两张夏日单','summer',5,3,8,10,['radish','bean','melon'],['sun','rain','sun','sun'],[order('green','绿豆袋',{bean:3},10,6),order('gold','晚风金瓜',{melon:2},13,null,3)],'地块不必种满。留出照料与交单的行动，资金才会周转。'),
 level(7,'有限的六块地','summer',6,4,11,11,['radish','bean','melon'],['sun','sun','rain'],[order('market','六份绯萝',{radish:6},18,7),order('soup','豆瓜浓汤',{bean:3,melon:2},23)],'订单数量按份计；一株绯萝收2份、青豆收3份。仓库可跨天保留。'),
 level(8,'夏末轮作','summer',4,3,9,12,['radish','bean','melon'],['sun','rain','sun','sun'],[order('first','第一趟集市',{radish:4},13,6),order('second','第二趟集市',{radish:2,melon:2},19,null,4),order('third','青豆收尾',{bean:3},10,null,6)],'地块收获后才腾空，可以再种下一茬。交付过的货物不能用于第二张单。'),
 level(9,'寒潮中的麦穗','autumn',4,3,8,9,['radish','grain'],['sun','cold','rain','cold'],[order('wheat','第一袋霜麦',{grain:4},18)],'霜麦耐寒；其他作物在寒潮保水停长。天气按公开顺序循环，不随机。'),
 level(10,'秋色双拼','autumn',6,4,12,11,['radish','bean','melon','grain'],['sun','cold','rain','sun'],[order('autumn','萝麦双拼',{grain:4,radish:2},24,8),order('beans','一袋青豆',{bean:3},10,null,4)],'寒潮不会扣掉非耐寒作物的水。用天气预报安排照料日和收获日。'),
 level(11,'雨前雨后','autumn',5,3,10,13,['radish','bean','melon','grain'],['sun','cold','rain','sun','cold'],[order('morning','晨市麦袋',{grain:4},18,7),order('evening','傍晚三色',{radish:2,bean:3,melon:2},29,null,4)],'长周期作物遇冷会推迟，订单先后与空地周转同样重要。'),
 level(12,'四季的一桌','autumn',6,4,13,14,['radish','bean','melon','grain'],['sun','cold','rain','sun','rain'],[order('early','早市两袋',{radish:4,grain:2},23,7),order('feast','四季的一桌',{radish:2,bean:3,melon:2,grain:2},36,null,5)],'把有限地块、行动、种子费和天气合在一起考虑。全部交单才算收工。')
];
export const weatherAt=(l,day)=>WEATHER[l.weather[(day-1)%l.weather.length]];
