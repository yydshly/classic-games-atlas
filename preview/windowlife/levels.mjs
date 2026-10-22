export const ACTIONS = Object.freeze({
  cook:{label:'做饭',target:'stove',duration:6,description:'完成后备好1份餐食，餐台最多存2份。'},
  eat:{label:'吃饭',target:'bench',duration:4,description:'开始时用掉1份餐食；完成后饱腹+42。'},
  sleep:{label:'小睡',target:'bed',duration:8,description:'完成后精力+38。'},
  wash:{label:'洗漱',target:'basin',duration:4,description:'完成后整洁+42。'},
  work:{label:'写手记',target:'desk',duration:8,description:'完成一份手记；精力−9，心情−4。'},
  relax:{label:'歇一会',target:'bench',duration:5,description:'完成后心情+28，精力+5。'},
  chat:{label:'一起聊天',target:'bench',duration:6,joint:true,description:'双方到齐后交谈；完成后各自心情+24。'},
  dinner:{label:'共享晚餐',target:'bench',duration:8,joint:true,description:'双方到齐且处于聚餐时段才能开始，用掉2份餐食；完成后各自饱腹+42、心情+18。'}
});

const names={stove:'小灶台',bed:'午睡床',basin:'洗漱台',desk:'窗边书桌',bench:'双人长座'};
const boundary=()=>{const out=[];for(let x=0;x<11;x++)out.push({x,y:0},{x,y:8});for(let y=1;y<8;y++)out.push({x:0,y},{x:10,y});return out;};
const object=(type,x,y,placements)=>({id:type,type,name:names[type],x,y,busyBy:null,placements:placements??[{x,y}]});
const people=(two,needs)=>[{id:'a',name:'禾禾',color:'#d68256',x:4,y:6,needs:{...needs}},...(two?[{id:'b',name:'阿沐',color:'#6d9b92',x:6,y:6,needs:{...needs}}]:[])];
export const LEVELS = [
 {id:'first-light',name:'第一日 · 把小屋点亮',brief:'给自己做饭、吃饭、洗漱，再写一份窗边手记。安排间隙可以休息。',limit:80,
  grid:{width:11,height:9,walls:boundary()},actors:people(false,{hunger:58,energy:70,hygiene:50,mood:65}),
  objects:[object('stove',2,2),object('bed',8,2),object('basin',2,5),object('desk',5,2,[{x:5,y:2},{x:6,y:4}]),object('bench',8,5,[{x:8,y:5},{x:5,y:5}])],
  goals:[['cook','备好一份餐食'],['eat','吃过饭'],['wash','完成洗漱'],['work','写好一份手记'],['needs','结束时饱腹≥40、精力≥30、整洁≥35、心情≥30']],thresholds:{hunger:40,energy:30,hygiene:35,mood:30}},
 {id:'shared-rhythm',name:'第二日 · 两个人的节奏',brief:'两位住户各自吃饭、洗漱、写手记，再一起聊聊今天。共用设施需要轮流。',limit:100,
  grid:{width:11,height:9,walls:[...boundary(),{x:5,y:3},{x:5,y:4}]},actors:people(true,{hunger:48,energy:65,hygiene:42,mood:38}),
  objects:[object('stove',2,2),object('bed',8,2),object('basin',2,5),object('desk',7,3,[{x:7,y:3},{x:3,y:3}]),object('bench',7,6,[{x:7,y:6},{x:4,y:5}])],
  goals:[['a-eat','禾禾吃过饭'],['b-eat','阿沐吃过饭'],['a-wash','禾禾完成洗漱'],['b-wash','阿沐完成洗漱'],['a-work','禾禾写好手记'],['b-work','阿沐写好手记'],['chat','一起聊过天'],['needs','两人饱腹≥35、精力≥25、整洁≥35、心情≥30']],thresholds:{hunger:35,energy:25,hygiene:35,mood:30}},
 {id:'window-supper',name:'第三日 · 窗灯下的晚餐',brief:'各写一份手记，并在40–100秒的相聚时段开始共享晚餐。灶台18–32秒维护，提前备餐或维护后再做都可以。',limit:110,
  grid:{width:11,height:9,walls:[...boundary(),{x:5,y:2},{x:5,y:3},{x:5,y:5}]},actors:people(true,{hunger:50,energy:60,hygiene:55,mood:50}),
  objects:[object('stove',2,2),object('bed',8,2),object('basin',2,5),object('desk',7,3,[{x:7,y:3},{x:3,y:3}]),object('bench',7,6,[{x:7,y:6},{x:4,y:5}])],
  closure:{start:18,end:32,label:'灶台维护：18–32秒不可开始做饭，已开火的行动可完成'},
  gatheringWindow:{start:40,end:100,label:'相聚时段：40–100秒可开始共享晚餐'},
  goals:[['a-work','禾禾写好手记'],['b-work','阿沐写好手记'],['dinner','两人完成共享晚餐'],['needs','两人饱腹≥40、精力≥30、整洁≥35、心情≥35']],thresholds:{hunger:40,energy:30,hygiene:35,mood:35}}
];
