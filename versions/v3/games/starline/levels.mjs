// Original constellations. A–E encode colour and a unique readable symbol.
export const PALETTE=[
 {name:'珊瑚',fill:'#ee9785',dark:'#9d4d49',symbol:'●'},
 {name:'薄荷',fill:'#9ed8bf',dark:'#427f72',symbol:'◆'},
 {name:'琥珀',fill:'#edc774',dark:'#9b7636',symbol:'▲'},
 {name:'天蓝',fill:'#98b9ec',dark:'#4e709c',symbol:'■'},
 {name:'丁香',fill:'#c3a1e1',dark:'#775699',symbol:'✦'},
];

export const LEVELS=[
 {id:1,name:'支影回廊',tip:'观察挂枝通向哪一顶锚。先清低处可腾出直射空间，支撑松开后整枝会掉落；也可绕侧面先拆支撑。',seed:9241,dropEvery:4,dropStep:Math.sqrt(3)*24,par:12,rows:[
  'AA...BB..CC',
  'A....B...C',
  'DE...DE..DE',
  'D....D...D',
  '.E...EE..E.',
 ]},
 {id:2,name:'侧窗折光',tip:'内侧挂枝挡住了部分直线。观察侧窗反弹落点，交换当前色与下一色后再决定拆哪边；单发只能交换一次。',seed:15311,dropEvery:4,dropStep:Math.sqrt(3)*24,par:14,rows:[
  '..AA.D.BB..',
  '...A.D.B..',
  '...CCDEE...',
  '...C.DE...',
  '...CCDDEE..',
  '....CD.E..',
  '....CC.EE..',
 ]},
 {id:3,name:'三锚回航',tip:'三组顶锚各有挂枝。先辨清支撑连接，再选择先拆一侧顶锚，还是先清两翼低枝；下压按结算发数发生，瞄准没有倒计时。',seed:23819,dropEvery:4,dropStep:Math.sqrt(3)*24,par:16,rows:[
  'AA..BB..CC.',
  'A...B...C.',
  'DE..DE..DE.',
  '.E..D...E.',
  '.EE.DD..EE.',
  '..C..A..B.',
  '..CC.AA.BB.',
 ]},
];
