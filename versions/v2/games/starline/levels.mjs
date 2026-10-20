// Original constellations. A–E encode colour and a unique readable symbol.
export const PALETTE=[
 {name:'珊瑚',fill:'#ee9785',dark:'#9d4d49',symbol:'●'},
 {name:'薄荷',fill:'#9ed8bf',dark:'#427f72',symbol:'◆'},
 {name:'琥珀',fill:'#edc774',dark:'#9b7636',symbol:'▲'},
 {name:'天蓝',fill:'#98b9ec',dark:'#4e709c',symbol:'■'},
 {name:'丁香',fill:'#c3a1e1',dark:'#775699',symbol:'✦'},
];

export const LEVELS=[
 {id:1,name:'悬岛落潮',tip:'左右悬岛分别悬挂。先拆低处，再找支撑。每4发后顶板下降；瞄准不限时。',seed:9241,dropEvery:4,dropStep:Math.sqrt(3)*24,par:12,rows:[
 'AABB.CCDDEE',
 'A.B..C.D.E',
 'AAEE.BBDDAA',
 '.E...B..A.',
 '.EE..BB.AA.',
 ]},
 {id:2,name:'双塔侧航',tip:'双塔下方的开口适合墙面反弹。清理低处，给下一次下压留空间。',seed:15311,dropEvery:4,dropStep:Math.sqrt(3)*24,par:18,rows:[
 'AABBC.CDDEE',
 'A.B.C.D.E.',
 'AABB...DDEE',
 '.C......A.',
 '.CC.....AA.',
 '.E......C.',
 '.EE.....CC.',
 '.E......C.',
 ]},
];
