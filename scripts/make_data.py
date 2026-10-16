"""Maintain the editorial catalogue. Run from the project root with Python 3.10+."""
import json
from pathlib import Path

GROUPS = [
    ('fc', '红白机时代', '01', '一张卡带，一个下午。', '8 位家用机里，跳跃、闯关与双人合作的共同记忆。'),
    ('arcade', '街机厅', '02', '下一枚硬币，下一次挑战。', '从横版清关到格斗对决，读懂街机的节奏与技巧。'),
    ('puzzle', '益智与解谜', '03', '规则很短，余味很长。', '方块、迷宫、数字与路线：在简单规则中反复推敲。'),
    ('casual', '休闲与塔防', '04', '再来一局，就一局。', '种植防线、匹配宝石、瞄准弹珠，轻松上手也需要规划。'),
    ('strategy', '策略与战术', '05', '把下一步，想在前面。', '调配资源、安排兵种，让每一个决定连成全局。'),
    ('rpg', 'RPG 与冒险', '06', '出发时，还不知道故事多长。', '跟随伙伴、收集与探索，走进各不相同的幻想世界。'),
    ('sim', '经营与养成', '07', '慢慢来，世界由你搭建。', '一座城市、一间医院或一片牧场，观察系统如何运转。'),
    ('action', '射击与动作', '08', '走进屏幕的另一侧。', '空间探索、行动时机与关卡设计，记录 3D 游戏的不同面貌。'),
    ('sports', '赛车与体育', '09', '终点之前，仍有悬念。', '在赛道与球场，体验速度、配合和临场判断。'),
    ('online', '手机与网络', '10', '从口袋到共同的世界。', '触屏小游戏与长线网游，连接碎片时间和线上伙伴。'),
]

# id | title | english | aliases | group | scope | platforms | era | genres | play | classic | edition | source
# Platforms describe representative historical platforms, not an exhaustive compatibility list.
ROWS = """
super-mario-bros|超级马力欧兄弟|Super Mario Bros.|超级玛丽,超级马里奥,SMB|fc|作品|FC / NES|8 位时代|动作,平台跳跃|控制马力欧奔跑和跳跃，越过深坑与敌人，寻找通往终点的路线。|惯性、跳跃弧线和隐藏区域，让几颗按键也能产生丰富变化。|指初代横版作品；不等同于整个马力欧系列。|mario
contra|魂斗罗|Contra|魂斗羅,Konami Contra|fc|作品|FC / NES,街机|8 位时代|动作,射击|在横向与纵深关卡中移动射击，拾取不同武器，挑战敌人与首领。|双人协作和高密度的攻防节奏，构成反复练习的闯关体验。|以 FC / NES 版的回忆为主；参考合集也包含街机及其他作品。|contra
battle-city|坦克大战|Battle City|BattleCity,小坦克|fc|作品|FC / NES|8 位时代|射击,动作|驾驶坦克穿越砖墙和障碍，在击退敌方坦克的同时保护基地。|破坏地形、守卫目标与双人配合，让小地图充满战术选择。|指南梦宫《Battle City》，不泛指所有坦克游戏。|battle
bomberman|炸弹人|Bomberman|爆破超人,ボンバーマン|fc|系列|FC / NES,多种主机|8 位时代起|动作,迷宫|在网格迷宫放置炸弹、清除障碍，计算爆炸范围并及时躲避。|延迟引爆与十字火线，将空间规划和对手心理融在一起。|系列条目；以早期迷宫玩法为主，后续版本模式各异。|bomberman
adventure-island|冒险岛|Adventure Island|高桥名人的冒险岛,高橋名人の冒険島|fc|作品|FC / NES|8 位时代|动作,平台跳跃|在横向关卡中跳跃、投掷武器并收集食物，维持体力走向终点。|持续消耗的体力与障碍节奏，使推进和收集必须兼顾。|指 Hudson 的 FC 作品；与 Nexon《冒险岛 Online》无关。|adventure
chip-dale|松鼠大战|Chip 'n Dale Rescue Rangers|奇奇与蒂蒂,救援突击队,Chip and Dale|fc|作品|FC / NES|8 位时代|动作,平台跳跃|操控救援队员跳跃前进，举起箱子等物件投掷，合作通过关卡。|投掷和双人互动为横版闯关带来鲜明的合作趣味。|指初代作品；参考《迪士尼午后合集》也收录续作。|disney
double-dragon|双截龙|Double Dragon|DoubleDragon,ダブルドラゴン|fc|系列|街机,FC / NES|8 位与街机时代|动作,清版过关|沿街道与场景前进，运用拳脚、投技和武器击退成群敌人。|近身距离、走位和连招组合，体现早期清版动作的节奏。|系列条目；街机与 FC 各代的合作模式和招式有差别。|double
kunio|热血系列|Kunio-kun / River City|热血物语,热血足球,热血篮球,国夫君|fc|系列|FC / NES,多种主机|8 位时代起|动作,体育,角色扮演|在街头动作与夸张体育比赛中控制热血角色，依作品进行战斗或竞赛。|把校园喜剧、成长系统与体育规则重新组合，形成多种支线玩法。|一个系列条目，涵盖物语、足球、篮球等；它们不是同一部游戏。|kunio
kof|拳皇|The King of Fighters|KOF,格斗之王,拳皇97,拳皇98|arcade|系列|街机 / Neo Geo|街机时代|格斗,动作|挑选队伍，按出招与防守规则轮流对战，利用角色差异争取胜利。|团队阵容与连续对局，让格斗从单个角色延伸到整体搭配。|系列条目；以早期 2D 作品为主，参考为《KOF '98》版本页。|kof
street-fighter-2|街头霸王Ⅱ|Street Fighter II|街霸2,街头霸王2,SF2|arcade|作品|街机,家用主机|街机时代|格斗,动作|选择格斗家，结合移动、普通攻击、防守与必杀技进行对战。|角色风格、距离控制与招式克制，构成容易理解又值得钻研的对抗。|指《街头霸王Ⅱ》及其迭代语境；不同修订版并非完全相同。|sf
samurai-shodown|侍魂|Samurai Shodown|Samurai Spirits,真侍魂,サムライスピリッツ|arcade|系列|街机 / Neo Geo|街机时代|格斗,动作|使用持有不同兵器的角色，在攻防间判断距离和出手时机。|兵刃攻击的分量感与谨慎试探，带来不同于高速连招的节奏。|系列条目；参考《侍魂 NeoGeo 合集》中的早期作品。|samurai
metal-slug|合金弹头|Metal Slug|越南大战,メタルスラッグ|arcade|系列|街机 / Neo Geo|街机时代|射击,动作|边跑边射击、营救俘虏，使用武器与载具通过密集战场。|细致的像素演出、载具与合作闯关，使紧张战斗带着幽默。|系列条目；参考初代发行方商店页。|slug
warriors-fate|三国志Ⅱ／吞食天地Ⅱ|Warriors of Fate|三国志2,吞食天地2,天地を喰らうII|arcade|作品|街机|街机时代|动作,清版过关|选择三国题材武将，以步战、骑战和武器攻击击败关卡敌人。|多人协作、鲜明角色与场景道具，形成街机厅常见的清关记忆。|指 Capcom 街机《天地を喰らうII》；不等同于光荣策略《三国志Ⅱ》。|capcom
cadillacs|恐龙快打|Cadillacs and Dinosaurs|恐龙新世纪,凯迪拉克与恐龙|arcade|作品|街机|街机时代|动作,清版过关|在恐龙与人类并存的场景中近身搏斗，拾取武器推进关卡。|角色动作、可用道具与合作清关，将漫画题材融入街机动作。|指 Capcom 街机游戏；当前参考为百科资料，未找到可核读的官方作品页。|cadillacs
captain-commando|名将|Captain Commando|上尉密令,キャプテンコマンドー|arcade|作品|街机|街机时代|动作,清版过关|选择能力不同的队员，用拳脚、特殊技和载具对付沿途敌人。|科幻队伍和多人合作，让角色组合成为清版动作的鲜明特色。|指 Capcom《Captain Commando》，不是泛称的名将题材游戏。|capcom
raiden|雷电|Raiden|雷電,Raiden Legacy|arcade|作品|街机|街机时代|射击,飞行射击|驾驶战机沿纵向战场飞行，切换火力、躲避弹幕并适时投放炸弹。|清晰的敌机路线与火力成长，使路线记忆和临场闪避同样关键。|以初代《雷电》为主；参考合集还收录 Raiden Fighters 作品。|raiden
tetris|俄罗斯方块|Tetris|俄羅斯方塊,方块|puzzle|系列|多种主机,电脑,手机|跨时代|益智,消除|移动和旋转下落的方块，填满横行以消除，并避免堆叠到顶部。|用极少的规则产生持续变化的空间判断与节奏压力。|系列条目；不同版本的旋转、保留与计分规则可能不同。|tetris
pacman|吃豆人|Pac-Man|Pacman,食鬼,小精灵|puzzle|作品|街机|街机时代|益智,迷宫|在迷宫中吃完豆子并躲开幽灵，利用能量豆创造反击机会。|追逐关系的短暂逆转，让路线规划同时带有风险与诱惑。|以初代街机版为主，不将其他吃豆人衍生作品混为一部。|pacman
puzzle-bobble|泡泡龙|Puzzle Bobble / Bust-A-Move|PuzzleBobble,パズルボブル|puzzle|系列|街机,家用主机|街机时代起|益智,消除|瞄准并发射彩色泡泡，连接同色泡泡消除，避免泡泡压到下方。|墙壁反弹与悬挂结构，让瞄准和颜色安排相互影响。|指发射泡泡的 Puzzle Bobble 系列；不是跳跃动作《Bubble Bobble》。|bubble
arkanoid|打砖块／Arkanoid|Arkanoid|快打砖块,打磚塊,アルカノイド|puzzle|作品|街机,家用主机|街机时代|益智,动作|移动挡板反弹小球，击碎场上砖块，并利用道具改变局势。|角度控制、强化道具和关卡结构，将反弹玩法扩展成多样挑战。|以 Taito《Arkanoid》为代表；打砖块也可指更广泛的玩法类别。|arkanoid
sokoban|推箱子|Sokoban|仓库番,倉庫番|puzzle|玩法谱系|早期电脑,多种平台|早期电脑时代起|益智,解谜|在狭小地图中把箱子逐一推到目标格，避免把箱子卡进死角。|只能推、不能拉的限制，使每一步都需要为后续留出空间。|以原始 Sokoban 规则为代表，不把所有后继实现当作同一版本。|sokoban
minesweeper|扫雷|Minesweeper|踩地雷,扫地雷|puzzle|玩法谱系|电脑 / Windows|桌面游戏时代|益智,解谜|根据已揭开格子的数字推断周围地雷位置，标记危险并找出安全区域。|局部信息与排除法交织，几次简单点击就能形成连锁推理。|以经典 Windows 玩法为代表；现代版本可能加入额外模式。|mines
snake|贪吃蛇|Snake|诺基亚贪吃蛇,貪食蛇|puzzle|玩法谱系|手机,电脑|早期手机时代|益智,动作|改变蛇的方向寻找食物，身体逐渐变长，同时避免撞上自身或障碍。|可用空间随着成长而缩小，得分与生存形成直接张力。|玩法谱系条目；以早期手机体验为代表，边界规则依实现而异。|snake
link-match|连连看|Tile-link Matching|四川省,对对碰,连连看游戏,Shisen-Sho|puzzle|玩法谱系|电脑,网页,手机|桌面与网页时代|益智,消除|寻找相同图案，在允许的连线路径内成对消除，逐步清空棋盘。|图案识别与路径可达性必须同时满足，考验观察和清除顺序。|泛指连线配对玩法；并非单一品牌。常见两次转折限制不适用于所有版本。|shisen
pvz|植物大战僵尸|Plants vs. Zombies|PVZ,植物大戰殭屍|casual|作品|电脑,手机,主机|桌面休闲时代|塔防,策略|收集阳光、种植功能不同的植物，守住草坪各条路线的防线。|固定行路与植物组合，把资源节奏和阵容搭配讲得直观有趣。|以初代为主，后续续作与衍生射击游戏另有规则。|pvz
kingdom-rush|王国保卫战|Kingdom Rush|皇家守卫军,王國保衛戰,KR|casual|系列|网页,电脑,手机|网页与触屏时代|塔防,策略|沿敌人行进路线修建防御塔，升级分支并结合援军等能力守住出口。|塔位、兵种与技能时机相互配合，让每张地图有不同解法。|系列条目；以初代为切入，不将各部的英雄与防御塔混用。|ironhide
bejeweled|宝石迷阵|Bejeweled|宝石迷情,寶石迷陣|casual|系列|电脑,手机|桌面休闲时代|益智,消除|交换相邻宝石，使同色宝石连成一线，触发消除并创造新的组合。|直观的三消规则和连锁反馈，为不同节奏的模式提供共同基础。|系列条目；参考《Bejeweled 3》，各代模式与特殊宝石有差异。|bejeweled
zuma|祖玛|Zuma|祖馬,青蛙吐珠|casual|作品|电脑,手机|桌面休闲时代|益智,消除|转动发射器将彩珠射入移动珠链，凑成同色组合，阻止珠链抵达终点。|行进路线、空隙穿射与连续消除，把瞄准和节奏安排结合起来。|以初代《Zuma Deluxe》为主，不泛指所有滚动珠链游戏。|zuma
peggle|幻幻球|Peggle|幻幻球Peggle,佩格尔|casual|作品|电脑,主机,手机|桌面休闲时代|益智,物理弹射|选择发射角度，让弹球在钉子间反弹，在有限球数内清除目标。|可预判的初始角度与随后弹跳的不确定性，带来惊喜式连锁反馈。|以初代《Peggle Deluxe》为主；不是传统弹球台的同义词。|peggle
richman|大富翁系列|Richman|大富翁4,大富翁10,大富翁11|casual|系列|电脑,手机,主机|中文电脑游戏时代起|棋盘,策略|掷骰移动、买地盖楼，运用卡片和资金管理与其他角色竞争。|随机事件、地产经营与角色个性，让棋盘博弈兼具规划和戏剧性。|指软星 Richman 系列；与 Monopoly 品牌分开。参考为系列后续作品。|richman
red-alert-2|红色警戒2|Command & Conquer: Red Alert 2|红警2,RA2,尤里的复仇|strategy|作品|电脑 / Windows|电脑策略时代|即时战略,策略|采集资源、建设基地，训练陆海空单位，在实时战场中协调攻防。|阵营差异与单位克制，让基地布局、侦察和多线操作互相牵动。|指《红色警戒2》；《尤里的复仇》是资料片，不与本体混作一个版本。|ra2
age-empires-2|帝国时代Ⅱ|Age of Empires II|帝国时代2,AOE2,帝國時代II|strategy|作品|电脑|电脑策略时代|即时战略,策略|采集多种资源、发展城镇与时代，运用不同兵种组织进攻和防守。|经济扩张与军事投入的平衡，使每次侦察和发展路线都有代价。|指《帝国时代Ⅱ》；参考决定版，重制内容与早期版本有差异。|aoe2
starcraft|星际争霸|StarCraft|星際爭霸,星际1,SC,Brood War,母巢之战|strategy|作品|电脑|电脑策略时代|即时战略,策略|在实时战场管理资源和生产，以人类、异虫或星灵的单位与机制对抗。|不对称阵营与精细操作，使战术选择和执行强度都影响结果。|指初代及其资料片语境；参考官方重制版，不是《星际争霸Ⅱ》。|starcraft
warcraft-3|魔兽争霸Ⅲ|Warcraft III|魔兽争霸3,魔獸爭霸3,冰封王座,WC3|strategy|作品|电脑|电脑策略时代|即时战略,策略|建设基地、训练军队，同时培养英雄、获取物品并参与实时战斗。|英雄成长与地图事件让传统资源战融入角色培养和战术节奏。|《混乱之治》为本体，《冰封王座》为资料片；参考重制版官网。|wc3
heroes-3|英雄无敌Ⅲ|Heroes of Might and Magic III|英雄无敌3,魔法门之英雄无敌3,HOMM3|strategy|作品|电脑|电脑策略时代|回合策略,策略|让英雄在大地图探索、招募部队和经营城镇，在战斗网格上轮流行动。|周回资源节奏与兵种搭配，把冒险探索和战棋决策串成循环。|指第三代；参考 HD 版商店页，该版本不含原版全部资料片。|heroes3
civilization|文明|Sid Meier's Civilization|席德梅尔的文明,Civ,文明系列|strategy|系列|电脑,部分主机|电脑策略时代起|回合策略,策略|从聚落发展文明，规划科技、城市、外交和军事，选择通往胜利的道路。|长时段的系统联动，使眼前一格土地能影响许多回合后的世界。|系列条目；参考《文明VI》官方资料，各代规则与胜利条件不同。|civ
romance-three-kingdoms|三国志|Romance of the Three Kingdoms|光荣三国志,三國志,RTK|strategy|系列|电脑,家用主机|电脑策略时代起|历史策略,策略|在三国地图中经营势力、任用武将，结合内政、外交与战争争取优势。|人物能力与地理局势交织，让历史题材成为不同路线的策略沙盘。|指光荣特库摩策略系列；不是 Capcom《吞食天地》街机游戏。|rtk
heroes-three-kingdoms|三国群英传|Heroes of the Three Kingdoms|三國群英傳,三国群英传2,三国群英传7|strategy|系列|电脑|中文电脑游戏时代起|历史策略,策略|管理城池与武将，在大地图调兵，进入战场后指挥兵种与武将技能。|内政推进和即时军阵演出交替，突出武将带兵的战场感。|指宇峻奥汀系列；参考《三国群英传7》，不同代机制有别。|sgqy
pal|仙剑奇侠传|The Legend of Sword and Fairy|仙剑1,PAL,Chinese Paladin,仙劍奇俠傳|rpg|系列|电脑,部分主机|中文电脑游戏时代起|角色扮演,冒险|跟随主角与伙伴探索城镇、迷宫和江湖，通过剧情与战斗推进旅程。|人物关系、仙侠叙事与音乐记忆，使旅途中的情感成为核心体验。|系列条目；以早期作品为记忆起点，各代战斗系统并不相同。|pal
xuanyuan|轩辕剑|Xuan-Yuan Sword|軒轅劍,天之痕,轩辕剑叁|rpg|系列|电脑,部分主机|中文电脑游戏时代起|角色扮演,冒险|在历史与神话交错的世界中结伴旅行，探索场景并通过战斗与事件成长。|古典题材、叙事选择与水墨气质，形成独特的中文角色扮演风格。|系列条目；正传和外传各有故事与系统，参考《轩辕剑叁》。|xuan
jinyong|金庸群侠传|Heroes of Jin Yong|金庸群俠傳,金庸群侠传原版|rpg|作品|电脑|中文电脑游戏时代|角色扮演,冒险|在武侠世界探索、结交人物、学习武功，组合队伍完成江湖目标。|开放式游历与网格战斗，把多部武侠作品的人物串成可探索空间。|指河洛早期单机原作；不等同于后来网游或同人改作。|jinyong
diablo-2|暗黑破坏神Ⅱ|Diablo II|暗黑2,大菠萝2,D2,暗黑破壞神2|rpg|作品|电脑|电脑角色扮演时代|角色扮演,动作|选择职业、探索地下城，实时击败怪物，寻找装备并组合技能成长。|随机掉落与职业搭配，使通关之外仍有反复调整角色的空间。|指第二代及《毁灭之王》语境；参考《狱火重生》官方重制资料。|diablo
final-fantasy|最终幻想|Final Fantasy|FF,太空战士,最終幻想|rpg|系列|家用主机,电脑|8 位时代起|角色扮演,冒险|在各部独立或相关的幻想世界中组建队伍，经历剧情、探索与成长。|鲜明世界观、音乐和队伍系统，使每一代都能呈现不同的冒险主题。|系列条目；早期回合制与后期动作系统有别，不概括为统一玩法。|ff
dragon-quest|勇者斗恶龙|Dragon Quest|DQ,勇者鬥惡龍,勇者斗恶龙1|rpg|系列|家用主机,掌机,电脑|8 位时代起|角色扮演,冒险|以勇者旅行为线索，走访城镇、探索迷宫，管理队伍并与怪物战斗。|清楚的成长目标与亲切的怪物设计，形成易理解的角色扮演旅程。|系列条目；以早期指令战斗为切入，各部系统有所演化。|dq
pokemon|宝可梦|Pokémon|Pokemon,口袋妖怪,宠物小精灵,精灵宝可梦|rpg|系列|Game Boy,任天堂掌机与主机|掌机时代起|角色扮演,收集|在地区中探索，发现和培育宝可梦，安排队伍并参与对战。|属性搭配、收集与交换，把单人旅行延伸成玩家之间的连接。|以主系列为主；不同世代与外传的规则、平台和地图不同。|pokemon
zelda|塞尔达传说|The Legend of Zelda|薩爾達傳說,塞尔达,Zelda,林克|rpg|系列|任天堂家用主机与掌机|8 位时代起|动作,冒险,解谜|探索世界与迷宫，利用装备、环境线索和动作技巧解开前进的道路。|道具与空间谜题彼此呼应，让发现新能力也意味着重新理解地图。|系列条目；更接近动作冒险，不将其一概定义为回合制 RPG。|zelda
simcity|模拟城市|SimCity|模擬城市,模拟城市2000|sim|系列|电脑,部分主机|电脑模拟时代起|经营,模拟|划分城市用地、铺设交通和公共设施，在预算内应对城市发展的需求。|交通、财政和居民需求互相反馈，使建设过程成为系统实验。|系列条目；参考《SimCity 4 Deluxe》发行资料，不把各代城市系统混用。|simcity
sims|模拟人生|The Sims|模擬市民,模擬人生,Sims|sim|系列|电脑,部分主机|生活模拟时代起|养成,模拟|创建人物和居所，照顾需求、发展关系，安排工作与日常生活。|开放的生活目标与建造工具，让玩家自己决定故事的走向。|系列条目；参考官方系列介绍，各代生活内容和扩展不同。|sims
harvest-moon|牧场物语|Bokujō Monogatari / Story of Seasons|牧場物語,Harvest Moon,Story of Seasons|sim|系列|家用主机,掌机,电脑|田园模拟时代起|经营,养成,模拟|照顾农作物和动物，安排每天的体力与时间，并与镇上的居民往来。|季节、劳动和人际关系相互交织，让缓慢成长也有可期待的变化。|指日本「牧場物語」谱系，现以 Story of Seasons 等名发行；近年英文 Harvest Moon 是另一产品线。|farm
theme-hospital|主题医院|Theme Hospital|主題醫院,牛蛙医院|sim|作品|电脑|电脑模拟时代|经营,模拟|规划诊室、雇用员工、安排治疗流程，平衡病患需求与医院财务。|夸张病症与真实的排队、效率难题相遇，使经营充满黑色幽默。|指 Bullfrog 原作；《双点医院》是后来的不同作品。|hospital
rollercoaster|过山车大亨|RollerCoaster Tycoon|过山车大亨1,RCT,模擬樂園|sim|系列|电脑,部分主机与手机|电脑模拟时代起|经营,模拟|铺设过山车、道路和商店，考虑游客感受与成本，经营游乐园。|自由建造与经营约束并存，让一条轨道同时关乎刺激、可靠与收益。|系列条目；参考《Deluxe》所含初代与扩展，后续作品系统有别。|rct
transport|运输大亨|Transport Tycoon|运输大亨豪华版,TTD,Transport Tycoon Deluxe|sim|系列|电脑|电脑模拟时代|经营,模拟|连接城镇和工业设施，建设铁路、公路等交通网络，运送乘客与货物。|线路、运力与产业分布共同决定效率，让运输网络逐渐成为复杂系统。|以 TTD 为主要语境；OpenTTD 是受其启发的开源项目，不是原作本身。|openttd
doom|DOOM|DOOM|毁灭战士,毀滅戰士,Doom 1993|action|作品|电脑|早期 3D 射击时代|射击,动作|以第一人称穿越基地和迷宫，管理弹药与生命，寻找钥匙并击退敌人。|高速移动、空间路线与武器选择，把探索和战斗紧密连在一起。|指初代经典《DOOM》，不是同名的后期重启作品。|doom
quake|Quake|Quake|雷神之锤,雷神之鎚,Quake 1|action|作品|电脑|早期 3D 射击时代|射击,动作|在立体关卡中移动、射击和寻找出口，也可在竞技地图中与他人对抗。|立体空间、运动技巧与武器切换，让战斗更强调位置和路线。|指第一代；参考增强版发行页，新增内容与原版有差异。|quake
half-life|半条命|Half-Life|战栗时空,半衰期,HL|action|作品|电脑|3D 叙事探索时代|射击,冒险|在科研设施灾难中求生，通过战斗、环境谜题和沿途事件推进故事。|持续的第一人称视角与场景叙事，使故事直接发生在可行动的空间。|指初代《Half-Life》，不是续作或重制《Black Mesa》。|hl
counter-strike|反恐精英1.6|Counter-Strike 1.6|CS1.6,CS 1.6,反恐精英,Counter Strike|action|作品版本|电脑|局域网与竞技时代|射击,竞技|分成两队执行爆破或解救等任务，在回合之间购买装备并合作争胜。|经济积累、信息和队伍站位，让每一局的决策影响后续回合。|明确指经典 1.6 版本语境；不与 CS:GO 或 CS2 合并。|cs
resident-evil|生化危机|Resident Evil|恶灵古堡,生化危機,Biohazard|action|系列|家用主机,电脑|3D 生存恐怖时代起|动作,冒险,生存恐怖|在危险场景搜寻线索与物资，处理敌人和机关，设法维持生存。|有限资源和不安的空间感，让探索中的每一次消耗都带有压力。|系列条目；以早期生存恐怖作品为主，后期视角与动作比重不同。|re
tomb-raider|古墓丽影|Tomb Raider|古墓奇兵,古墓麗影,劳拉,Lara Croft|action|系列|电脑,家用主机|3D 冒险时代起|动作,冒险,解谜|跟随劳拉探索遗迹，观察空间、攀爬跳跃，解开机关并应对危险。|平台跳跃与立体谜题结合，使遗迹本身成为需要读懂的关卡。|系列条目；以早期作品为切入，重启三部曲另有叙事与系统。|tomb
need-speed|极品飞车|Need for Speed|NFS,極品飛車,极品飞车9|sports|系列|电脑,家用主机|3D 赛车时代起|赛车,竞速|驾驶不同车辆在道路或赛道竞速，依据作品体验改装、追逐等模式。|车辆表现与速度氛围构成核心吸引力，不同作品强调不同驾驶主题。|系列条目；并非每一部都有开放世界、改装或警匪追逐。|nfs
mario-kart|马力欧卡丁车|Mario Kart|马里奥赛车,瑪利歐賽車,马车,MK|sports|系列|任天堂家用主机与掌机|主机竞速时代起|赛车,竞速|在主题赛道驾驶卡丁车，利用漂移、路线与道具争取领先。|可改变局势的道具和赛道机关，让技术和临场应变同时发挥作用。|系列条目；角色、车辆与反重力等机制依版本不同。|mk
kartrider|跑跑卡丁车|KartRider|跑跑,卡丁车,泡泡卡丁车|sports|系列|电脑,手机|网络竞速时代|赛车,竞速|控制卡丁车漂移过弯，在竞速或道具比赛中与其他玩家竞争。|漂移积累与路线选择构成竞速节奏，道具赛则更强调局势变化。|以原版 PC 网游回忆为主；移动版与其他续作不是同一客户端。|kart
pes|实况足球|Pro Evolution Soccer / Winning Eleven|PES,实况,勝利十一人,WE|sports|系列|家用主机,电脑|主机足球时代起|体育,竞技|控制球队传球、跑位和射门，结合阵型和球员特点完成足球比赛。|控球手感与攻防组织，使比赛节奏既取决于操作也取决于战术。|指 PES / Winning Eleven 历史系列；当前官方品牌为 eFootball，规则不完全相同。|pes
fifa|FIFA系列|EA Sports FIFA|FIFA足球,国际足联足球,FIFA International Soccer|sports|系列|电脑,家用主机|主机足球时代起|体育,竞技|在足球比赛中控制球队攻防，并依作品体验联赛、球队管理等模式。|球队呈现与多种比赛模式，让现实足球文化进入可操作的赛场。|指 EA 的历史 FIFA 系列；后继 EA Sports FC 与 FIFA 品牌应区分。|fifa
nba-jam|NBA Jam|NBA Jam|NBA JAM,篮球嘉年华|sports|作品|街机,家用主机|街机体育时代|体育,竞技|进行节奏明快的二对二篮球比赛，以抢断、传球和夸张扣篮争取分数。|简化规则与超现实演出，把篮球浓缩成易上手的街机对抗。|以初代街机作品为主；后续 Tournament Edition 和重启作另有内容。|jam
angry-birds|愤怒的小鸟|Angry Birds|憤怒鳥,怒鸟|online|作品|手机,电脑|触屏时代|益智,物理弹射|拉动弹弓调整角度和力度，发射小鸟撞击结构，处理藏在其中的目标。|弹道、材料和坍塌反馈，将物理直觉转成可以反复尝试的解题过程。|以初代玩法为主；现存版本、续作与衍生作有差异。|angry
fruit-ninja|水果忍者|Fruit Ninja|切水果,水果忍者经典版|online|作品|手机,平板|触屏时代|动作,休闲|滑动手指切开飞起的水果，按模式追求连切或躲避炸弹。|手势直接对应刀光，简洁反馈把触屏操作转成即时动作体验。|以早期经典玩法为主，不含其他品牌的同类切水果游戏。|fruit
cut-rope|割绳子|Cut the Rope|割繩子,Om Nom,小怪兽吃糖果|online|系列|手机,网页|触屏时代|益智,物理解谜|按顺序切断绳索，利用摆动、气泡等装置，让糖果抵达小怪兽嘴边。|短关卡将时机与物理路线结合，可通关与全收集有不同难度。|系列条目；以初代为切入，各续作加入不同机关与角色能力。|rope
temple-run|神庙逃亡|Temple Run|神廟逃亡,神庙逃亡1|online|作品|手机|触屏时代|动作,跑酷|在持续延伸的路径中转向、跳跃和滑行，躲开障碍并收集奖励。|简单手势、不断加快的节奏和失误压力，形成紧凑的重复挑战。|以初代为主；续作与授权主题版本另有场景和机制。|temple
crazy-arcade|泡泡堂|Crazy Arcade / BnB|BNB,爆爆王,泡泡堂Online|online|作品|电脑|网络休闲时代|动作,竞技,迷宫|在格子地图中放置水泡清理障碍或限制对手，并寻找脱困和救援机会。|延迟爆破与多人互动结合，让熟悉的迷宫规则带上在线社交节奏。|指 Nexon 的 PC 网络游戏；不等同于 Taito《泡泡龙》。|bnb
maplestory|冒险岛 Online|MapleStory|冒险岛Online,枫之谷,楓之谷,冒险岛网游|online|作品|电脑|网络游戏时代|角色扮演,多人在线|在横向卷轴世界中选择职业、打怪成长、完成任务并与玩家组队冒险。|横版动作与长期角色成长结合，让地图探索也成为社交旅程。|指 Nexon PC 网游；与 Hudson 的 FC《冒险岛》没有同一作品关系。|maple
fantasy-westward|梦幻西游|Fantasy Westward Journey|夢幻西遊,梦幻西游电脑版|online|作品|电脑|网络游戏时代|角色扮演,回合制,多人在线|在西游题材世界中选择门派、培养角色与召唤兽，组队完成回合制战斗和任务。|门派分工、养成与玩家协作交织，构成长线游玩的共同世界。|以电脑版为主；手游与其他衍生产品有独立规则。|xyq
world-warcraft|魔兽世界|World of Warcraft|WOW,WoW,魔獸世界,艾泽拉斯|online|作品|电脑|网络游戏时代|角色扮演,多人在线|在艾泽拉斯创建角色，完成任务、探索区域，与他人组队挑战地下城等内容。|职业分工与持续变化的共同世界，让协作和个人成长相互连接。|零售版、经典怀旧服及各资料片内容不同，不视为完全一致的版本。|wow
""".strip()

# Publisher pages and publisher-controlled store listings are primary sources.
SOURCES = {
    'mario': ('任天堂 · 马力欧历史', 'https://mario.nintendo.com/history/', 'official', '系列历史'),
    'contra': ('Konami · 魂斗罗周年合集', 'https://www.konami.com/games/50th/ac/contra/asia/en/', 'official', '含原作的合集'),
    'battle': ('Bandai Namco · Namco Museum Archives', 'https://en.bandainamcoent.eu/namco-museum/namco-museum-archives-vol-1-vol-2', 'official', '含原作的合集'),
    'bomberman': ('Konami · 炸弹人经典合集', 'https://www.konami.com/games/bomberman/collection/us/en/', 'official', '含早期作品的合集'),
    'adventure': ('Wikipedia · Adventure Island（游戏）', 'https://en.wikipedia.org/wiki/Adventure_Island_(video_game)', 'secondary', '原作百科；官方档案待补'),
    'disney': ('Capcom · 迪士尼午后合集', 'https://store.steampowered.com/app/525040/', 'publisher-store', '含原作的合集'),
    'double': ('Dotemu · 双截龙三部曲', 'https://store.steampowered.com/app/314150/', 'publisher-store', '街机三部曲'),
    'kunio': ('Arc System Works · 热血系列', 'https://www.kuniokun.jp/', 'official', '系列作品入口'),
    'kof': ('SNK · KOF 98 UM Final Edition', 'https://store.steampowered.com/app/222420/', 'publisher-store', '系列中的增强版本'),
    'sf': ('Capcom · 街霸 30 周年合集', 'https://store.steampowered.com/app/586200/', 'publisher-store', '含多个 II 版本的合集'),
    'samurai': ('SNK · 侍魂 NeoGeo 合集', 'https://store.steampowered.com/app/999660/', 'publisher-store', '早期系列合集'),
    'slug': ('SNK · 合金弹头', 'https://store.steampowered.com/app/366250/', 'publisher-store', '原作移植'),
    'capcom': ('Capcom · Beat ’Em Up Bundle', 'https://store.steampowered.com/app/885150/', 'publisher-store', '含原作的合集'),
    'cadillacs': ('Wikipedia · Cadillacs and Dinosaurs（游戏）', 'https://en.wikipedia.org/wiki/Cadillacs_and_Dinosaurs_(video_game)', 'secondary', '原作百科；官方档案待补'),
    'raiden': ('Dotemu · Raiden Legacy', 'https://store.steampowered.com/app/407600/', 'publisher-store', '含初代的合集'),
    'tetris': ('Tetris · 官方版本', 'https://tetris.com/play-tetris', 'official', '现代官方网页实现'),
    'pacman': ('Bandai Namco · Pac-Man 历史', 'https://www.pacman.com/en/history/', 'official', '系列历史'),
    'bubble': ('Wikipedia · Puzzle Bobble', 'https://en.wikipedia.org/wiki/Puzzle_Bobble', 'secondary', '原作百科；官方历史档案待补'),
    'arkanoid': ('Taito · Arkanoid Eternal Battle', 'https://store.steampowered.com/app/1717270/', 'publisher-store', '后续作品；含复古模式'),
    'sokoban': ('Thinking Rabbit · Sokoban', 'https://www.sokoban.jp/', 'official', '原权利方系列入口'),
    'mines': ('Xbox · Microsoft Minesweeper', 'https://www.xbox.com/en-US/games/store/microsoft-minesweeper/9wzdncrfhwcn', 'official', '现代官方实现'),
    'snake': ('Google · Play Games 内置游戏', 'https://play.google.com/store/apps/details?id=com.google.android.play.games&hl=zh', 'official', '含贪吃蛇的现代实现；非诺基亚原作资料'),
    'shisen': ('KDE · KShisen 规则', 'https://apps.kde.org/kshisen/', 'project', '同类实现规则；不是某个连连看品牌'),
    'pvz': ('PopCap / EA · 植物大战僵尸 GOTY', 'https://store.steampowered.com/app/3590/', 'publisher-store', '初代年度版'),
    'ironhide': ('Ironhide · 游戏目录', 'https://www.ironhidegames.com/Games', 'official', '系列作品目录'),
    'bejeweled': ('PopCap / EA · 宝石迷阵3', 'https://store.steampowered.com/app/78000/', 'publisher-store', '系列第三作'),
    'zuma': ('PopCap / EA · Zuma Deluxe', 'https://store.steampowered.com/app/3330/', 'publisher-store', '初代版本'),
    'peggle': ('PopCap / EA · Peggle Deluxe', 'https://store.steampowered.com/app/3480/', 'publisher-store', '初代版本'),
    'richman': ('软星 · 大富翁11', 'https://store.steampowered.com/app/2074800/', 'publisher-store', '系列后续作品'),
    'ra2': ('EA · 红色警戒2与尤里的复仇', 'https://store.steampowered.com/app/2229850/', 'publisher-store', '本体与资料片组合'),
    'aoe2': ('Xbox Game Studios · 帝国时代II决定版', 'https://store.steampowered.com/app/813780/', 'publisher-store', '决定版'),
    'starcraft': ('Blizzard · 星际争霸重制版', 'https://us.shop.battle.net/en-us/product/starcraft-remastered', 'official', '重制版产品资料'),
    'wc3': ('Blizzard · 魔兽争霸III重制版', 'https://warcraft3.blizzard.com/en-us/', 'official', '重制版'),
    'heroes3': ('Ubisoft · 英雄无敌III HD', 'https://store.steampowered.com/app/297000/', 'publisher-store', 'HD版本；非完整版资料片集'),
    'civ': ('2K · Civilization VI', 'https://civilization.2k.com/civ-vi/', 'official', '系列第六作'),
    'rtk': ('Koei Tecmo · 三国志14', 'https://www.koeitecmoamerica.com/rtk14/', 'official', '系列第十四作'),
    'sgqy': ('宇峻奥汀 · 三国群英传7', 'https://store.steampowered.com/app/1437880/', 'publisher-store', '系列第七作'),
    'pal': ('软星 · 仙剑奇侠传', 'https://store.steampowered.com/app/1546570/', 'publisher-store', '早期原作版本'),
    'xuan': ('软星 · 轩辕剑叁', 'https://store.steampowered.com/app/1638230/', 'publisher-store', '系列第三作'),
    'jinyong': ('Wikipedia · Heroes of Jin Yong', 'https://en.wikipedia.org/wiki/Heroes_of_Jin_Yong', 'secondary', '原作百科；官方档案待补'),
    'diablo': ('Blizzard · 暗黑破坏神II狱火重生', 'https://diablo2.blizzard.com/en-us/', 'official', '重制版'),
    'ff': ('Square Enix · 最终幻想系列', 'https://na.finalfantasy.com/', 'official', '系列入口'),
    'dq': ('Square Enix · 勇者斗恶龙', 'https://dragonquest.square-enix-games.com/', 'official', '系列入口'),
    'pokemon': ('The Pokémon Company · 游戏目录', 'https://www.pokemon.com/us/pokemon-video-games', 'official', '系列目录'),
    'zelda': ('任天堂 · 塞尔达传说', 'https://zelda.nintendo.com/', 'official', '系列入口'),
    'simcity': ('EA · SimCity 4 Deluxe', 'https://store.steampowered.com/app/24780/', 'publisher-store', '系列第四作与扩展'),
    'sims': ('EA · The Sims', 'https://www.ea.com/games/the-sims', 'official', '系列入口'),
    'farm': ('Marvelous / XSEED · Story of Seasons', 'https://www.storyofseasons.com/', 'official', '日本牧场物语谱系的英文发行入口'),
    'hospital': ('EA · Theme Hospital', 'https://www.gog.com/en/game/theme_hospital', 'publisher-store', '原作授权商店页'),
    'rct': ('Atari · RollerCoaster Tycoon Deluxe', 'https://store.steampowered.com/app/285310/', 'publisher-store', '初代与扩展合集'),
    'openttd': ('OpenTTD · About', 'https://www.openttd.org/about', 'project', '受 TTD 启发的开源项目；非原版发行页'),
    'doom': ('Bethesda · DOOM + DOOM II', 'https://store.steampowered.com/app/2280/', 'publisher-store', '现代经典版合集'),
    'quake': ('Bethesda · Quake', 'https://store.steampowered.com/app/2310/', 'publisher-store', '增强版'),
    'hl': ('Valve · Half-Life', 'https://store.steampowered.com/app/70/', 'publisher-store', '初代'),
    'cs': ('Valve · Counter-Strike', 'https://store.steampowered.com/app/10/', 'publisher-store', '经典 Counter-Strike 客户端'),
    're': ('Capcom · 生化危机系列', 'https://game.capcom.com/residentevil/en/', 'official', '系列入口'),
    'tomb': ('Crystal Dynamics · 古墓丽影', 'https://www.tombraider.com/', 'official', '系列入口'),
    'nfs': ('EA · Need for Speed', 'https://www.ea.com/games/need-for-speed', 'official', '系列入口'),
    'mk': ('任天堂 · 马力欧历史', 'https://mario.nintendo.com/history/', 'official', '系列历史中的卡丁车作品'),
    'kart': ('世纪天成 · 跑跑卡丁车', 'https://popkart.tiancity.com/', 'official', '中国大陆 PC 运营站'),
    'pes': ('Konami · eFootball', 'https://www.konami.com/efootball/en/', 'official', '后继品牌；非旧 PES 版本资料页'),
    'fifa': ('The Strong · FIFA International Soccer', 'https://www.museumofplay.org/games/fifa-international-soccer/', 'museum', '系列初代历史档案'),
    'jam': ('Wikipedia · NBA Jam（初代）', 'https://en.wikipedia.org/wiki/NBA_Jam_(1993_video_game)', 'secondary', '原作百科；官方档案待补'),
    'angry': ('Rovio · Angry Birds', 'https://www.angrybirds.com/', 'official', '系列入口'),
    'fruit': ('Halfbrick · Fruit Ninja', 'https://www.halfbrick.com/games/fruit-ninja', 'official', '作品官方介绍'),
    'rope': ('ZeptoLab · Cut the Rope', 'https://www.cuttherope.net/', 'official', '系列入口'),
    'temple': ('Imangi · Temple Run', 'https://imangistudios.com/', 'official', '开发者游戏目录'),
    'bnb': ('Nexon · Crazy Arcade', 'https://ca.nexon.com/', 'official', '韩国 PC 运营站'),
    'maple': ('Nexon · MapleStory', 'https://www.nexon.com/maplestory/', 'official', '国际 PC 运营站'),
    'xyq': ('网易 · 梦幻西游电脑版', 'https://xyq.163.com/', 'official', '中国大陆 PC 运营站'),
    'wow': ('Blizzard · 魔兽世界', 'https://worldofwarcraft.blizzard.com/en-us/', 'official', '现行版本与怀旧服入口'),
}

def main():
    root = Path(__file__).resolve().parents[1]
    audit_path = root / 'data/source-audit.json'
    audit = json.loads(audit_path.read_text(encoding='utf-8')) if audit_path.exists() else {}
    sources = {}
    for key, (label, url, kind, relation) in SOURCES.items():
        checked = audit.get(key, {})
        sources[key] = dict(label=label, url=url, kind=kind, relation=relation,
                            checkedAt=checked.get('checkedAt'),
                            status=checked.get('status', '待核读'),
                            note=checked.get('note', '提供参考入口，尚未逐页核读。'))
    games = []
    for line in ROWS.splitlines():
        fields = line.split('|')
        assert len(fields) == 13, (len(fields), line)
        ident, title, en, aliases, group, scope, platforms, era, genres, play, classic, edition, source = fields
        games.append(dict(id=ident, title=title, english=en, aliases=aliases.split(','),
                          group=group, scope=scope, platforms=platforms.split(','), era=era,
                          genres=genres.split(','), play=play, classic=classic, edition=edition,
                          sources=[source]))
    experiments = json.loads((root / 'data/experiments.json').read_text(encoding='utf-8'))
    for game in games:
        experiment = next((e for e in experiments if e['sourceGame'] == game['id'] and e['status'] == 'published'), None)
        if experiment:
            game['experiment'] = experiment
    assert len(games) == 72
    catalogue = dict(version='2026.10.16.29', experiments=experiments, groups=[dict(id=i,title=t,number=n,tagline=ta,description=d) for i,t,n,ta,d in GROUPS], games=games, sources=sources)
    (root / 'data').mkdir(exist_ok=True)
    (root / 'data/games.json').write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'entries':len(games), 'groups': {g[1]:sum(x['group']==g[0] for x in games) for g in GROUPS}}, ensure_ascii=False))

if __name__ == '__main__':
    main()
