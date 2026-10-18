// Original constellations. A–E encode colour and a unique readable symbol.
export const PALETTE=[
 {name:'珊瑚',fill:'#ee9785',dark:'#9d4d49',symbol:'●'},
 {name:'薄荷',fill:'#9ed8bf',dark:'#427f72',symbol:'◆'},
 {name:'琥珀',fill:'#edc774',dark:'#9b7636',symbol:'▲'},
 {name:'天蓝',fill:'#98b9ec',dark:'#4e709c',symbol:'■'},
 {name:'丁香',fill:'#c3a1e1',dark:'#775699',symbol:'✦'},
];
const plans=[
 ['双星起航','把同色泡泡连成至少三个。每种颜色还有独特图案，可同时辨认。',10,['..AA...BB..','..A....B..']],
 ['双湾回声','先处理一侧的湾区。只有场上仍存在的颜色才会成为新弹药。',14,['AA..BB..AA.','A...B...A.','AA..BB..AA.']],
 ['三色航标','第三种颜色加入。下一颗会提前显示，每发可以交换一次。',16,['.AA.BBB.CC.','.A..B..CC.','....BB.CC..']],
 ['悬岛实验','支撑点消失后，失去顶端连接的泡泡会整群掉落。',16,['....AAA....','....B.....','....BB.....','...CCDD...']],
 ['星桥工事','找到桥梁的支撑点，用较少的发射带走更大的星群。',20,['AAA..BBB...','..A..B....','..CCCCC....','..D...D...','..DD.DD....']],
 ['侧风入口','侧墙可以反弹。观察虚线的折返点与落点圆环。',22,['AABBBCCCDDA','AA......DD','AAA....DDDD','..BB..CC..','..BB...CC..']],
 ['五色星图','五种颜色各有图案。根据当前与下一颗，先选一个安全落点。',24,['AABBCCDDDEE','A.B.C.D.E.','AA.BB.CC.DD','..E..E....','..EE.EE....']],
 ['远岸灯塔','两侧长列向下延伸。先解除深处的悬挂，再清理顶端。',26,['AAB.....CCD','AA......CD','BB......DDD','BB......EE','CCC....EEE.','..D....A..','..DD...AA..']],
 ['结网星座','多色连接织成一张网。击破支撑点常常比追逐单个泡泡有效。',28,['..AABBBCC..','..A.B.C...','..DDEEECC..','..D.E.C...','..AABBDDD..','..A.B.D...','..CCEEEDD..']],
 ['窗间航线','穿过开口，或借墙面绕到另一侧。落点提示和实际飞行使用同一规则。',30,['AA.BBCC.DDD','A..B.C..D.','AA.BBCC.DDD','..E....E..','..EE..EE...','...A..B...','...AA.BB...']],
 ['折返星阶','阶梯结构较深。留意底线，并为下一种颜色保留连接点。',32,['AABBCCDDEEA','A.B.C.D.EA','AA.BB.CC.DD','..E..A..D.','..EE.AA.DD.','...B..C...','...BB.CC...','....D.E...']],
 ['群星归航','最后一张组合星图。用反弹、三连和悬岛掉落，为航线腾出空间。',36,['AABBCCDDEEA','AA..B.C.EA','BBB.CCDDDEE','..A.C.D...','..AA.CCDD..','...E..B...','...EE.BB...','....A.C...','....AACC...']],
];
export const LEVELS=plans.map(([name,tip,ammo,rows],i)=>({id:i+1,name,tip,ammo,rows,seed:7127+i*113,par:Math.ceil(rows.join('').replaceAll('.','').length/3)+3}));
