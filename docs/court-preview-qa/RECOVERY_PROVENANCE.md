# 第35款预览源码来源

## 可核对的归档

归档参考提交：`d964a605f614099f93fcae317d00a2299b7438a3`。

- [早期完整包](https://github.com/yydshly/classic-games-atlas/tree/d964a605f614099f93fcae317d00a2299b7438a3/archive/recovery-stage-20261018/court35-v1)
- [后期源码记录](https://github.com/yydshly/classic-games-atlas/tree/d964a605f614099f93fcae317d00a2299b7438a3/archive/recovery-stage-20261018/recovery-v9/accessibility)

2026-10-18只读核对归档树：完整包23个文件与早期ZIP逐字节一致，后期Court源码6个文件也与归档Git blob一致。`source-manifest.json` 列出归档路径、Git blob和SHA-256。

这些哈希验证的是现有恢复材料，不证明它们与曾经丢失的历史仓库终版相同。没有根据摘要臆造未捕获的引擎改动。

## 各运行文件

- `levels.mjs`、`renderer.mjs`：完整早期包原字节；8场ID、时长、难度与美术均保留。
- `progress.mjs`：保留早期保存格式与校验，只把键改为预览专用的 `atlas-preview-court-20261018-v1`。
- `engine.mjs`：早期完整版本，另加明确标注的新 `cancel-shot` 兼容分支。
- `game.mjs`：记录中的第1–6行与第7–42行逐字拼接。前6行来自较早完整读取，后36行来自修复后读取。两段时间不同；组合与归档combined record一致，不冒称单次最终快照。
- `court.css`：完整采用修复后的四行记录，小屏球场和状态面板位于不同网格行；没有另改颜色、比例或美术。
- `index.html`：早期完整版本，补两个精确记录的可访问性属性：dialog的 `aria-labelledby="help-title"` 和对应h2的 `id="help-title"`。预览适配另修改标题、未验收说明、noindex和相对导航；favicon引用保留。

## 新修复范围

后期控制器在pointercancel、lostpointercapture、键盘投篮按钮失焦时发送 `cancel-shot`。早期完整引擎原本忽略该动作，随后把取消当成释放，误发投篮。模型测试确实复现3项失败。

新增分支仅在比赛中清除 `charging`、`charge`、`lastShoot`；不出手、不加分、不改难度，不召回已经出手的球。相同回归修复后通过。

## 测试来源

- `test_court.mjs`、`test_court_progress.mjs` 和 `test_court_browser.py` 源于完整早期包，仅为预览调整导入路径或默认URL；浏览器脚本仅编译未执行。
- `test_court_controller.mjs`、`test_court_recovery.mjs` 和 `test_preview_isolation.mjs` 是本次新写验证，不是恢复的历史测试。
- 公开日志记录本次重跑结果。修复前日志明确保留为失败复现，不与最终通过结果混用。
