export const TYPES={skiff:{name:'掠翼',role:'轻型直落 · 铜色直射',hp:4,r:16,score:120,color:'#dca775'},dart:{name:'折翼',role:'横向游弋 · 青色锁点瞄准',hp:6,r:17,score:180,color:'#92c8c9'},fan:{name:'弧翼',role:'缓行重型 · 紫色扇形',hp:10,r:20,score:260,color:'#b8a8d7'},elite:{name:'巡航精英',role:'末段精英 · 交替三类弹道',hp:100,r:32,score:1500,color:'#e3c68d'}};
const maps=[
 ['晨线航道','先识别直射航线，再看瞄准预告。机体中央亮点才是受弹核心。',0,[120,300,480]],
 ['云边静电','瞄准弹锁定预告时的位置，保持移动就能错开航线。',0,[170,430,300]],
 ['琥珀裂谷','扇形弹的间隔可以穿过。风幕有限，留给真正拥挤的交汇。',0,[90,280,500]],
 ['雨后折锋','把视线放在前方，拾取强化后火力会改变，核心判定始终不变。',1,[150,450,250]],
 ['薄暮风廊','多种航线开始交错。沿着弹隙缓缓移动，不必大幅度甩动。',1,[110,390,520]],
 ['夜色回旋','留意精英的虚线预告；发射后弹道固定，瞄准弹不会追踪。',2,[180,420,80]],
 ['霁海星井','护盾期间仍可移动和射击。修复不超过三点机体生命。',2,[80,330,510]],
 ['云穹交汇','最后一程，把有限风幕、强化与提前读弹组合起来。',2,[130,460,300]]
];
export const LEVELS=maps.map(([name,tip,palette,lanes],i)=>{
 const waves=[],cycle=['skiff','dart','fan'];for(let w=0;w<8;w++){const type=cycle[(w+(i>1?i%3:0))%3],xs=w%3===0?[lanes[w%3],600-lanes[w%3]]:w%3===1?[lanes[(w+1)%3]]:[120+(i%3)*25,300,480-(i%2)*30];waves.push({at:1+w*(1.8+i*.035),label:`航段 ${w+1}`,craft:xs.map((x,j)=>({type,x,phase:j*1.4+w*.9,delay:j*.28}))});}
 const eliteAt=17+i*.65;return {id:i+1,name,tip,palette,waves,eliteAt,eliteHP:96+i*13,bulletSpeed:164+i*7,enemyScale:1+i*.055,fanCount:i<3?3:5,drops:[{at:3.6,x:200+(i%2)*200,type:'upgrade'},{at:8.3,x:400-(i%2)*200,type:'upgrade'},{at:12.5,x:300,type:'repair'},{at:16.6,x:180+(i%3)*120,type:'upgrade'},{at:20.5,x:300,type:'repair'}]};
});
