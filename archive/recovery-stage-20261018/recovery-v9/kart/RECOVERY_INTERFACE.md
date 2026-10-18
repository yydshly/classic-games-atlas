# 林野杯赛界面文件恢复记录

恢复日期：2026-10-18（UTC）。恢复位置：`/workspace/shared/game-recovery/from-recorded-writes/kart`。

本次仅恢复界面任务负责的五个文件，保持原有相对路径。来源是此任务当前上下文中完整可见的原始 shell heredoc 写文件文本，以及随后全部成功的修改记录；没有访问原仓库、受限会话目录或远端，也没有从摘要补写缺失源码。

## 逐文件核验

| 相对路径 | 字节数 | 恢复后 SHA-256 | 历史 SHA-256 比对 |
|---|---:|---|---|
| `games/kart/index.html` | 9621 | `b0a18cc2b1459ba8ce11d2fb326e2ff3207f7abe2e5078c48fe792d1bd8e5afc` | 与历史冻结值完全一致 |
| `games/kart/kart.css` | 15932 | `416b12487d095539b91067ccc087c1b80210804c79da4c08d5fd61213c1a6356` | 与历史冻结值完全一致 |
| `games/kart/game.mjs` | 22966 | `6a72eea073f9a96d7c5ec2000163c9111d019e880f2d460a38150d49d23b8fc4` | 与历史冻结值完全一致 |
| `games/kart/progress.mjs` | 4075 | `1d7080686fb73f30022a693786eae0cfb380d9b27a8f5c9e0ae89be15c9371b2` | 与历史冻结值完全一致 |
| `scripts/test_kart_progress.mjs` | 6041 | `0909f7cdbb4d3239146838a013087aff425f5bc136e5cc3bda5b39a43640ce03` | 当前可见历史未记录此文件 SHA；依据完整写入及修改文本重放，无法独立做历史 SHA 比对 |

## 已重放的后续修改

- `game.mjs`：弹窗期间记录物理按键锁存，包含关闭弹窗的 Escape，防止省略 repeat 标志的后续 keydown 立即恢复或重开。
- `kart.css`：为 dialog 的最大高度规则显式加入 `overflow:auto`。
- `progress.mjs`：从 `levels.mjs` 导入 LEVELS，以真实关数、各关名次目标及时间限制校验已完成纪录；对应的进度测试同步增加准确时间边界。
- `index.html`：静态道具说明改为松果冲刺 1.3 秒、苔叶护盾 2.8 秒、铃果脉冲 54 赛道单位内减速 1.1 秒、共享补给箱 5 秒刷新。

## 验证边界

- 恢复后的 `game.mjs`、`progress.mjs` 与 `test_kart_progress.mjs` 已通过 `node --check`。
- 四个运行文件 SHA 均与恢复前已记录的最终冻结值一致。
- 恢复前历史验证为：控制器事件 32/32、八条赛道正常输入胜利解锁、进度边界 16/16；这些是历史结果，不是本次恢复后的完整复跑结果。
- 此恢复目录仅包含上述五个文件，仍需要配套的 `engine.mjs`、`levels.mjs`、`renderer.mjs` 与相应资源后才能执行完整运行验证；本次未擅自补造这些依赖。
- 未进行浏览器、真实设备、发布或部署验证。
