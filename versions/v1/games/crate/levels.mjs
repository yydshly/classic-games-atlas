// Original hand designs and seeded reverse-pull rooms. See scripts/generate_crate.mjs.
export const LEVELS=[
  {
    "id": 1,
    "name": "一箱启程",
    "band": "单箱起步",
    "tip": "先走到箱子背后，再把它推上目标。撤销始终可用。",
    "grid": [
      "######",
      "#....#",
      "#....#",
      "#..#.#",
      "#....#",
      "######"
    ],
    "player": {
      "x": 1,
      "y": 2
    },
    "boxes": [
      {
        "x": 2,
        "y": 2
      }
    ],
    "goals": [
      {
        "x": 4,
        "y": 2
      }
    ],
    "generation": {
      "method": "original hand design"
    }
  },
  {
    "id": 2,
    "name": "绕柱入位",
    "band": "单箱起步",
    "tip": "先走到箱子背后，再把它推上目标。撤销始终可用。",
    "grid": [
      "#######",
      "#.....#",
      "#.....#",
      "#..#..#",
      "#.....#",
      "#.....#",
      "#######"
    ],
    "player": {
      "x": 2,
      "y": 4
    },
    "boxes": [
      {
        "x": 3,
        "y": 4
      }
    ],
    "goals": [
      {
        "x": 4,
        "y": 2
      }
    ],
    "generation": {
      "method": "original hand design"
    }
  },
  {
    "id": 3,
    "name": "窄门转身",
    "band": "单箱起步",
    "tip": "先走到箱子背后，再把它推上目标。撤销始终可用。",
    "grid": [
      "#######",
      "#.....#",
      "#..#..#",
      "#..#..#",
      "#.....#",
      "#.....#",
      "#######"
    ],
    "player": {
      "x": 1,
      "y": 4
    },
    "boxes": [
      {
        "x": 2,
        "y": 4
      }
    ],
    "goals": [
      {
        "x": 4,
        "y": 2
      }
    ],
    "generation": {
      "method": "original hand design"
    }
  },
  {
    "id": 4,
    "name": "双位初见",
    "band": "双箱协调",
    "tip": "先给另一只箱子留出站位。只推不拉，转身比抢步更重要。",
    "grid": [
      "#########",
      "#.......#",
      "#.#..#..#",
      "#.......#",
      "#.##....#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 4,
        "y": 2
      }
    ],
    "boxes": [
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      }
    ],
    "player": {
      "x": 6,
      "y": 3
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 533134,
      "attempt": 0,
      "pulls": 6,
      "lowerBound": 4
    }
  },
  {
    "id": 5,
    "name": "回廊调头",
    "band": "双箱协调",
    "tip": "先给另一只箱子留出站位。只推不拉，转身比抢步更重要。",
    "grid": [
      "########",
      "#......#",
      "#......#",
      "#....#.#",
      "#......#",
      "#......#",
      "########"
    ],
    "goals": [
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 5,
        "y": 4
      }
    ],
    "boxes": [
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 4
      }
    ],
    "player": {
      "x": 2,
      "y": 4
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 534143,
      "attempt": 0,
      "pulls": 5,
      "lowerBound": 5
    }
  },
  {
    "id": 6,
    "name": "双箱接力",
    "band": "双箱协调",
    "tip": "先给另一只箱子留出站位。只推不拉，转身比抢步更重要。",
    "grid": [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#..#.#..#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 4
      }
    ],
    "boxes": [
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 4,
        "y": 4
      }
    ],
    "player": {
      "x": 4,
      "y": 5
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 535152,
      "attempt": 0,
      "pulls": 6,
      "lowerBound": 6
    }
  },
  {
    "id": 7,
    "name": "侧舱让行",
    "band": "双箱协调",
    "tip": "先给另一只箱子留出站位。只推不拉，转身比抢步更重要。",
    "grid": [
      "########",
      "#......#",
      "#....#.#",
      "#......#",
      "#...##.#",
      "#......#",
      "#......#",
      "########"
    ],
    "goals": [
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "boxes": [
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 5,
        "y": 5
      }
    ],
    "player": {
      "x": 2,
      "y": 6
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 536161,
      "attempt": 0,
      "pulls": 9,
      "lowerBound": 7
    }
  },
  {
    "id": 8,
    "name": "两路归仓",
    "band": "双箱协调",
    "tip": "先给另一只箱子留出站位。只推不拉，转身比抢步更重要。",
    "grid": [
      "#########",
      "#.......#",
      "#....#..#",
      "#.....#.#",
      "#.......#",
      "#....##.#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 5,
        "y": 3
      }
    ],
    "boxes": [
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 2,
        "y": 2
      }
    ],
    "player": {
      "x": 7,
      "y": 4
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 537170,
      "attempt": 0,
      "pulls": 36,
      "lowerBound": 8
    }
  },
  {
    "id": 9,
    "name": "三角周转",
    "band": "三箱周转",
    "tip": "留意通路和站位。暂时离开目标，可能让另一只箱子顺利通过。",
    "grid": [
      "########",
      "#......#",
      "#......#",
      "#......#",
      "#..#...#",
      "#......#",
      "#......#",
      "########"
    ],
    "goals": [
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      }
    ],
    "boxes": [
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      }
    ],
    "player": {
      "x": 6,
      "y": 3
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 538698,
      "attempt": 3,
      "pulls": 17,
      "lowerBound": 9
    }
  },
  {
    "id": 10,
    "name": "交换通道",
    "band": "三箱周转",
    "tip": "留意通路和站位。暂时离开目标，可能让另一只箱子顺利通过。",
    "grid": [
      "#########",
      "#.......#",
      "#.......#",
      "#..#....#",
      "#.#.....#",
      "#.......#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "boxes": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 2
      }
    ],
    "player": {
      "x": 5,
      "y": 1
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 539188,
      "attempt": 0,
      "pulls": 50,
      "lowerBound": 10
    }
  },
  {
    "id": 11,
    "name": "错位装卸",
    "band": "三箱周转",
    "tip": "留意通路和站位。暂时离开目标，可能让另一只箱子顺利通过。",
    "grid": [
      "########",
      "#......#",
      "#...#..#",
      "#......#",
      "#..#...#",
      "#..#...#",
      "#......#",
      "########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 2
      }
    ],
    "boxes": [
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 5
      }
    ],
    "player": {
      "x": 3,
      "y": 1
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 540543,
      "attempt": 2,
      "pulls": 17,
      "lowerBound": 11
    }
  },
  {
    "id": 12,
    "name": "折返货廊",
    "band": "三箱周转",
    "tip": "留意通路和站位。暂时离开目标，可能让另一只箱子顺利通过。",
    "grid": [
      "#########",
      "#.......#",
      "#.......#",
      "#.....#.#",
      "#..###..#",
      "#.......#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      }
    ],
    "boxes": [
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 6,
        "y": 5
      }
    ],
    "player": {
      "x": 2,
      "y": 6
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 542071,
      "attempt": 5,
      "pulls": 22,
      "lowerBound": 12
    }
  },
  {
    "id": 13,
    "name": "四向中庭",
    "band": "四箱调度",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#...#...#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      }
    ],
    "boxes": [
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 2,
        "y": 6
      }
    ],
    "player": {
      "x": 2,
      "y": 7
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 542215,
      "attempt": 0,
      "pulls": 20,
      "lowerBound": 12
    }
  },
  {
    "id": 14,
    "name": "长巷回旋",
    "band": "四箱调度",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.##....#",
      "#.......#",
      "#.......#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      }
    ],
    "boxes": [
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 6
      }
    ],
    "player": {
      "x": 7,
      "y": 5
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 543224,
      "attempt": 0,
      "pulls": 20,
      "lowerBound": 14
    }
  },
  {
    "id": 15,
    "name": "分区入仓",
    "band": "四箱调度",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "#########",
      "#.......#",
      "#.#.....#",
      "#.......#",
      "#....#..#",
      "#.......#",
      "#.....#.#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 5,
        "y": 2
      }
    ],
    "boxes": [
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      }
    ],
    "player": {
      "x": 1,
      "y": 5
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 544233,
      "attempt": 0,
      "pulls": 42,
      "lowerBound": 16
    }
  },
  {
    "id": 16,
    "name": "交叉调度",
    "band": "四箱调度",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "#########",
      "#.......#",
      "#.......#",
      "#....#..#",
      "#.#.....#",
      "#...#...#",
      "#..#....#",
      "#.......#",
      "#########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      }
    ],
    "boxes": [
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 2,
        "y": 6
      }
    ],
    "player": {
      "x": 6,
      "y": 5
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 545242,
      "attempt": 0,
      "pulls": 46,
      "lowerBound": 18
    }
  },
  {
    "id": 17,
    "name": "五箱合流",
    "band": "五箱合流",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "#...#....#",
      "#........#",
      "#........#",
      "##########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 6
      }
    ],
    "boxes": [
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      }
    ],
    "player": {
      "x": 3,
      "y": 6
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 546251,
      "attempt": 0,
      "pulls": 34,
      "lowerBound": 18
    }
  },
  {
    "id": 18,
    "name": "深舱回转",
    "band": "五箱合流",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "##########",
      "#........#",
      "#....#...#",
      "#........#",
      "#....#...#",
      "#........#",
      "#........#",
      "#........#",
      "##########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      }
    ],
    "boxes": [
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      }
    ],
    "player": {
      "x": 7,
      "y": 5
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 547260,
      "attempt": 0,
      "pulls": 36,
      "lowerBound": 20
    }
  },
  {
    "id": 19,
    "name": "终端换线",
    "band": "五箱合流",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#..#.....#",
      "#........#",
      "#..#..#..#",
      "#........#",
      "##########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 4,
        "y": 4
      }
    ],
    "boxes": [
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 6
      }
    ],
    "player": {
      "x": 5,
      "y": 6
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 548269,
      "attempt": 0,
      "pulls": 52,
      "lowerBound": 22
    }
  },
  {
    "id": 20,
    "name": "仓格归一",
    "band": "五箱合流",
    "tip": "先规划通道，再逐一归位。可以随时撤销，不必一次想完。",
    "grid": [
      "##########",
      "#........#",
      "#...#....#",
      "#.....#..#",
      "#........#",
      "#.....##.#",
      "#........#",
      "#........#",
      "##########"
    ],
    "goals": [
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 4,
        "y": 4
      }
    ],
    "boxes": [
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 7,
        "y": 6
      }
    ],
    "player": {
      "x": 7,
      "y": 1
    },
    "generation": {
      "method": "original seeded room, reverse-pull construction, independent forward search",
      "seed": 549278,
      "attempt": 0,
      "pulls": 74,
      "lowerBound": 24
    }
  }
];
