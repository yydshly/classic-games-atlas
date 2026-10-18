export const STEP=1/60,LIMIT=120,SPEED=2.6,RADIUS=.18;
export const THEMES={sand:{wall:"#536365",floor:"#242d30",sky:"#101b24"},blue:{wall:"#436070",floor:"#242c36",sky:"#111927"},night:{wall:"#705346",floor:"#302c30",sky:"#171b24"}};
export const TYPES={prism:{name:"巡猎者",hp:36,power:16,range:1.15,wind:48,cooldown:70},sentinel:{name:"浮空守卫",hp:48,power:12,range:6,wind:66,cooldown:120}};
export const LEVELS=[
  {
    "id": 1,
    "name": "余烬入口",
    "theme": "sand",
    "map": [
      "###########",
      "#.........#",
      "#..##.....#",
      "#..#......#",
      "#..#..##..#",
      "#.........#",
      "#..##.....#",
      "#.......#.#",
      "###########"
    ],
    "start": {
      "x": 1.5,
      "y": 1.5,
      "yaw": 0
    },
    "route": [],
    "exit": {
      "x": 9.5,
      "y": 7.5
    },
    "doors": [
      {
        "id": "gate",
        "x": 9,
        "y": 6,
        "key": "amber",
        "color": "amber"
      }
    ],
    "pickups": [
      {
        "id": "key",
        "kind": "key",
        "x": 1.5,
        "y": 7.5,
        "key": "amber",
        "color": "amber"
      },
      {
        "id": "ammo1",
        "kind": "ammo",
        "x": 7.5,
        "y": 1.5,
        "amount": 6
      },
      {
        "id": "ammo2",
        "kind": "ammo",
        "x": 7.5,
        "y": 5.5,
        "amount": 6
      },
      {
        "id": "heal",
        "kind": "heal",
        "x": 4.5,
        "y": 5.5,
        "amount": 35
      }
    ],
    "enemies": [
      {
        "id": "hunter",
        "kind": "prism",
        "x": 5.5,
        "y": 1.5
      },
      {
        "id": "guard",
        "kind": "sentinel",
        "x": 8.5,
        "y": 5.5
      }
    ]
  },
  {
    "id": 2,
    "name": "分流仓库",
    "theme": "blue",
    "map": [
      "###########",
      "#....#....#",
      "#....#....#",
      "#.........#",
      "#..###.#..#",
      "#......#..#",
      "#..#......#",
      "#.......#.#",
      "###########"
    ],
    "start": {
      "x": 1.5,
      "y": 1.5,
      "yaw": 0
    },
    "route": [],
    "exit": {
      "x": 9.5,
      "y": 7.5
    },
    "doors": [
      {
        "id": "gate",
        "x": 9,
        "y": 6,
        "key": "amber",
        "color": "amber"
      }
    ],
    "pickups": [
      {
        "id": "key",
        "kind": "key",
        "x": 1.5,
        "y": 7.5,
        "key": "amber",
        "color": "amber"
      },
      {
        "id": "ammo1",
        "kind": "ammo",
        "x": 7.5,
        "y": 1.5,
        "amount": 6
      },
      {
        "id": "ammo2",
        "kind": "ammo",
        "x": 8.5,
        "y": 5.5,
        "amount": 6
      },
      {
        "id": "heal",
        "kind": "heal",
        "x": 4.5,
        "y": 5.5,
        "amount": 35
      }
    ],
    "enemies": [
      {
        "id": "hunter",
        "kind": "prism",
        "x": 4.5,
        "y": 1.5
      },
      {
        "id": "guard",
        "kind": "sentinel",
        "x": 8.5,
        "y": 5.5
      },
      {
        "id": "hunter2",
        "kind": "prism",
        "x": 5.5,
        "y": 6.5
      }
    ]
  },
  {
    "id": 3,
    "name": "静默撤离",
    "theme": "night",
    "map": [
      "###########",
      "#.........#",
      "#..##.##..#",
      "#.....#...#",
      "#..#......#",
      "#..#..##..#",
      "#.........#",
      "#.......#.#",
      "###########"
    ],
    "start": {
      "x": 1.5,
      "y": 1.5,
      "yaw": 0
    },
    "route": [],
    "exit": {
      "x": 9.5,
      "y": 7.5
    },
    "doors": [
      {
        "id": "gate",
        "x": 9,
        "y": 6,
        "key": "amber",
        "color": "amber"
      }
    ],
    "pickups": [
      {
        "id": "key",
        "kind": "key",
        "x": 1.5,
        "y": 7.5,
        "key": "amber",
        "color": "amber"
      },
      {
        "id": "ammo1",
        "kind": "ammo",
        "x": 7.5,
        "y": 1.5,
        "amount": 6
      },
      {
        "id": "ammo2",
        "kind": "ammo",
        "x": 8.5,
        "y": 5.5,
        "amount": 6
      },
      {
        "id": "heal",
        "kind": "heal",
        "x": 4.5,
        "y": 5.5,
        "amount": 35
      }
    ],
    "enemies": [
      {
        "id": "hunter",
        "kind": "prism",
        "x": 5.5,
        "y": 1.5
      },
      {
        "id": "guard",
        "kind": "sentinel",
        "x": 8.5,
        "y": 5.5
      },
      {
        "id": "hunter2",
        "kind": "prism",
        "x": 5.5,
        "y": 6.5
      }
    ]
  }
];
