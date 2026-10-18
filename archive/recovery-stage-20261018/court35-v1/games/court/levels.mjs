// Eight authored, deterministic 2v2 matchups. Difficulty changes basketball
// decisions and movement, never either team's score or the shared shot rules.
export const LEVELS = Object.freeze([
  { id: 'first-light', title: '晨光开场', name: '晨光开场', theme: 'sunrise', opponent: '早起小队', brief: '寻找空位，多传一次球，拿下你的首场街头篮球赛。', tip: '靠近右侧篮筐，两分上篮更稳。', duration: 75, aiSpeed: 125, defense: 0.36, aggression: 0.22, accuracy: 0.49, passing: 0.30, spacing: 130, range: 155, seed: 7139, color: '#ffb767' },
  { id: 'paint-patrol', title: '禁区巡逻', name: '禁区巡逻', theme: 'brick', opponent: '街区守卫', brief: '对手重点看守禁区，先传球再突破。', tip: '传球比运球更容易拉开防线。', duration: 75, aiSpeed: 138, defense: 0.49, aggression: 0.31, accuracy: 0.53, passing: 0.37, spacing: 145, range: 170, seed: 19513, color: '#f48270' },
  { id: 'wing-runners', title: '两翼齐飞', name: '两翼齐飞', theme: 'coast', opponent: '海风双人组', brief: '快速侧翼从不同角度进攻，及时回防。', tip: '防守时切换到离球更近的队友。', duration: 80, aiSpeed: 151, defense: 0.53, aggression: 0.38, accuracy: 0.56, passing: 0.52, spacing: 178, range: 195, seed: 34583, color: '#56c7cb' },
  { id: 'long-distance', title: '远程火力', name: '远程火力', theme: 'violet', opponent: '弧顶灯塔', brief: '对手偏爱三分球，及时上前干扰投篮。', tip: '在三分线外出手，投中可得三分。', duration: 80, aiSpeed: 150, defense: 0.59, aggression: 0.39, accuracy: 0.61, passing: 0.49, spacing: 190, range: 285, seed: 47933, color: '#b59bff' },
  { id: 'pressure-test', title: '高压试炼', name: '高压试炼', theme: 'lime', opponent: '全场紧逼', brief: '对手积极抢断，别在人群中停球。', tip: '抢断落空会短暂减速，看准时机再出手。', duration: 85, aiSpeed: 159, defense: 0.69, aggression: 0.70, accuracy: 0.62, passing: 0.54, spacing: 152, range: 200, seed: 59357, color: '#b5dc6a' },
  { id: 'give-and-go', title: '传切默契', name: '传切默契', theme: 'blue', opponent: '蓝色节拍', brief: '耐心传导的对手，让两名球员都参与进攻。', tip: '投篮不中时及时跟进，双方都能争抢篮板。', duration: 85, aiSpeed: 165, defense: 0.72, aggression: 0.55, accuracy: 0.66, passing: 0.78, spacing: 185, range: 225, seed: 64151, color: '#75aeff' },
  { id: 'night-shift', title: '夜场交锋', name: '夜场交锋', theme: 'night', opponent: '夜行球手', brief: '快速移动、贴身防守与均衡投篮，考验你的全面技术。', tip: '在蓄力条的最佳区域松开投篮键。', duration: 90, aiSpeed: 173, defense: 0.81, aggression: 0.66, accuracy: 0.70, passing: 0.71, spacing: 172, range: 240, seed: 79193, color: '#ed8fcc' },
  { id: 'rooftop-final', title: '天台决赛', name: '天台决赛', theme: 'gold', opponent: '天际双星', brief: '最后的对手善用全场空间，争取每一个回合。', tip: '空位两分往往比强投三分更划算。', duration: 90, aiSpeed: 180, defense: 0.88, aggression: 0.72, accuracy: 0.74, passing: 0.80, spacing: 195, range: 255, seed: 96557, color: '#f3cb73' },
].map((level, index) => Object.freeze({ ...level, index })));

export default LEVELS;
