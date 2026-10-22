export const GEAR = Object.freeze({
 worn:{id:'worn',slot:'weapon',name:'旅行短棍',description:'起始武器：伤害7，间隔0.52秒，距离1.15格。',damage:7,attackInterval:.52,attackRange:1.15,arc:.15},
 blade:{id:'blade',slot:'weapon',name:'逐光短刃',description:'伤害9，间隔0.32秒，距离1.25格；适合短促出手与走位。',damage:9,attackInterval:.32,attackRange:1.25,arc:.15},
 hammer:{id:'hammer',slot:'weapon',name:'砾纹重锤',description:'伤害18，间隔0.72秒，距离1.5格，横扫范围更宽。',damage:18,attackInterval:.72,attackRange:1.5,arc:-.25},
 ward:{id:'ward',slot:'charm',name:'苔纹护符',description:'生命上限+25，移速+0.2格/秒，闪避冷却−0.4秒，治疗量+6。',maxHp:25,speed:.2,dodgeCooldown:-.4,heal:6},
 spark:{id:'spark',slot:'charm',name:'星髓坠',description:'能量上限+20，脉冲伤害+8、消耗−8、冷却−0.8秒，每秒回能+1.5。',maxEnergy:20,skillDamage:8,skillCost:-8,skillCooldown:-.8,energyRegen:1.5}
});
const boundary=()=>{const out=[];for(let x=0;x<14;x++)out.push({x,y:0},{x,y:9});for(let y=1;y<9;y++)out.push({x:0,y},{x:13,y});return out;};
const enemy=(id,type,x,y,optional=false)=>({id,type,x,y,optional});
export const ENEMY_TYPES={
 crawler:{name:'苔甲兽',maxHp:25,speed:1.15,damage:10,range:.95,windup:.9,recovery:1.15,aggro:5.5},
 skirmisher:{name:'隙行兽',maxHp:22,speed:1.6,damage:9,range:1.05,windup:.8,recovery:1.0,aggro:5.5},
 wisp:{name:'矿火灵',maxHp:22,speed:.8,damage:9,range:4.3,windup:1.0,recovery:1.6,aggro:5.8},
 warden:{name:'砾光守望者',maxHp:145,speed:1.1,damage:17,range:1.65,windup:1.0,recovery:1.1,aggro:7}
};
export const LEVELS=[
 {id:'shale-approach',name:'第一段 · 页岩前庭',brief:'打开近处的遗匣选择武器。观察敌人的蓄势红区，用近战、脉冲与闪避清路，再到亮起的石门离开。',grid:{width:14,height:10,walls:[...boundary(),{x:5,y:3},{x:5,y:4},{x:8,y:6}]},spawn:{x:2.5,y:7.5},exit:{x:12.5,y:1.5},enemies:[enemy('moss-a','crawler',7.5,6.5),enemy('moss-b','skirmisher',10.5,3.5)],chests:[{id:'first-cache',x:3.5,y:7.5,offers:['blade','hammer'],lockedBy:[],required:true}]},
 {id:'split-vein',name:'第二段 · 岔脉回廊',brief:'清理右侧通路即可前进。左上侧室由两名守卫看管，进入会多打一场，但遗匣中的护符能改变后续战法。',grid:{width:14,height:10,walls:[...boundary(),{x:5,y:1},{x:5,y:2},{x:5,y:3},{x:5,y:4},{x:5,y:6},{x:5,y:7},{x:1,y:4},{x:2,y:4},{x:4,y:4},{x:9,y:5}]},spawn:{x:2.5,y:7.5},exit:{x:12.5,y:1.5},enemies:[enemy('hall-a','crawler',7.5,7.5),enemy('hall-b','skirmisher',10.5,6.5),enemy('hall-c','wisp',9.5,2.5),enemy('side-a','crawler',2.5,2.5,true),enemy('side-b','wisp',3.5,1.5,true)],chests:[{id:'side-cache',x:1.5,y:1.5,offers:['ward','spark'],lockedBy:['side-a','side-b'],required:false}]},
 {id:'lantern-core',name:'第三段 · 灯核石庭',brief:'守望者前半程近身蓄击，半血后交替释放圆形震波与三束矿火。清理守卫、取得砾光印记，再从石门离开。',grid:{width:14,height:10,walls:[...boundary(),{x:4,y:3},{x:4,y:6},{x:9,y:3},{x:9,y:6}]},spawn:{x:2.5,y:5.5},exit:{x:12.5,y:1.5},enemies:[enemy('core-a','crawler',7.5,2.5),enemy('core-b','skirmisher',7.5,7.5),enemy('warden','warden',10.5,4.5)],chests:[]}
];
