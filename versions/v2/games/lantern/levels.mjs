// Two hand-authored compact harbour routes. No runtime generation.
const common={safe:[],playerSpeed:4.2,enemySpeed:2.05,powerDuration:6.4,enemyTypes:['tracker','cutter','roamer'],patrolDuration:4.5,chaseDuration:12};
export const LEVELS=[
 {...common,id:1,name:'环堤穿灯',band:'环形码头 · 横渡航道',palette:0,
 grid:['###############','#.............#','#.###########.#','#.###########.#','#.###########.#','..###########..','#.###########.#','#.###########.#','#.###########.#','#.............#','###############'],
 start:{x:1,y:1},home:{x:13,y:9},tunnelRows:[5],powers:[{x:4,y:1},{x:13,y:3},{x:10,y:9},{x:1,y:7}],waypoints:[{x:13,y:1},{x:13,y:9},{x:1,y:9},{x:1,y:1}],tip:'沿单环码头拾光；两侧金色箭头互通，巡灯也能穿隧。巡游4.5秒后围追12秒，循环交替。'},
 {...common,id:2,name:'双湾交汇',band:'双环水道 · 十字交汇',palette:1,enemySpeed:2.15,
 grid:['###########','#.........#','#.###.###.#','#.###.###.#','#.###.###.#','...........','#.###.###.#','#.###.###.#','#.###.###.#','#.........#','###########'],
 start:{x:1,y:1},home:{x:5,y:5},tunnelRows:[5],powers:[{x:3,y:1},{x:9,y:3},{x:7,y:9},{x:1,y:7}],waypoints:[{x:9,y:1},{x:9,y:9},{x:1,y:9},{x:1,y:1}],tip:'中心交汇可提前存入转向。围追时循迹灯跟随、截路灯瞄准前方、巡航灯沿航标；辉光退避优先。'}
];
