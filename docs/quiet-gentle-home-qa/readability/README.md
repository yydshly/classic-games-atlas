# 有限可读性修订 · 基于 b576b8e

本轮只处理机器人修补片、充电窝和刹车/接通状态的视觉层级。没有重复时序审查、扩玩法或新增入口；使用同一实际游戏相机做 CPU 投影，不能称为浏览器视觉验收或真人理解验证。

## 先观察，再修改

修改前的固定 1280×800 投影中，机器人约 56×54 像素，原修补片虽有约 22×13 的投影包络，真正露出的形状只是一小块棕色区域；目标垫的主要轮廓在过快和 charged 状态下几乎相同，状态差别集中在细小亮条及颜色。

本轮保留相机、机器人尺寸和目标范围，通过以下有限改变处理：

- 在原球壳轮廓内制作较大的深色曲面修补片和双触点桥形。图形贴合球壳，随真实 quaternion 旋转，不是始终朝镜头的浮动标牌。ready 时修补片投影包络约 27×19，机器人整体仍约 56×54；包络数值含遮挡，不是可见像素面积或品质分数。
- 原目标垫内的双触点改成有真实空隙的开路形状。只有实际 charged 才补齐空隙与横向连接，形成和机器人相同的桥形；颜色变化只是附加线索。
- 过快进入时出现更大的平贴双线。单侧试稿在另一侧的实际靠近状态中被机器人遮住，因此将同一提示对称放在垫面两侧，并合并成一个绘制对象。
- 删除微小托盘色块、原有短箭纹和细碎接通灯，复用其预算；没有增加 HUD 箭头、说明文字、摆件或整体泛光。

图形表达的是“未连接 / 需要停稳 / 已连接”。真实玩家是否能自行理解“需要按制动”，仍待观察，不把图形存在称为理解通过。

## 同镜头、同快照对照

全部完整图均为 1280×800，前后使用完全相同的实际游戏相机位置、朝向与投影矩阵，且每对读取同一真实快照和表现状态。没有缩放场景或移动玩家来强化对照。

| 实际状态 | 修改前 | 修改后 |
| --- | --- | --- |
| ready | [ready-before.png](ready-before.png) | [ready-after.png](ready-after.png) |
| 过快靠窝 | [near-too-fast-before.png](near-too-fast-before.png) | [near-too-fast-after.png](near-too-fast-after.png) |
| 真正 charged、既有收尾完成 | [charged-before.png](charged-before.png) | [charged-after.png](charged-after.png) |
| 从另一侧过快靠窝 | [opposite-too-fast-before.png](opposite-too-fast-before.png) | [opposite-too-fast-after.png](opposite-too-fast-after.png) |

[修补片细节对照](repair-detail.png) 是相同 ready 投影的放大裁切，没有放大运行中的机器人。[黑白状态诊断](state-glyphs-gray.png) 是同一批图的灰度裁切，便于核对形状差异，不是新运行模式。

ready 来自真实初始化快照、尚未 step；它对应控制器准备态，世界内部仍称 playing。其余状态由原 Cannon 规则及键位等价二值控制得到，过快样本速度约 2.608，仍 playing；charged 样本由实际刹停判定产生。另一侧沿现有右侧工具路线到窝，没有移动物件或篡改状态。

## 本轮专项检查

`node --test tests/quiet-readability.test.mjs` 通过，详见 [checks.log](checks.log)：

- 物理与 presentation 模块逐字匹配 b576b8e，未动阈值或时序。
- 相机不变，修补几何位于既有球壳接缝轮廓内；目标图形都在原半径内，最高不超过原 0.045 的低矮触点范围。
- 几何射线证明开路确有空隙，charged 才有填补与横向连接；不只检查颜色字符串。
- 从实际相机向双线中心发射遮挡射线，左右两条真实靠近快照各有两个未遮挡中心。这是几何可见性检查，不是屏幕辨识度研究。
- ready / 过快 / 制动中 / charged 检查为 94–96 个可见 mesh 和 draw groups，投影对象仍 12；未超既有 97 级预算。DPR 1.25、512 阴影、灯光及材质后处理设置未动，不作帧率结论。

这不是重跑整套时序回归后计数；本轮只针对新的形状、几何条件、遮挡与预算检查。之前的时序、灯具包络和静态证据仍保留，未当作本轮新增验收。

## CPU 限制与复跑

[comparison.json](comparison.json) 记录真实 snapshot、输入来源、矩阵、投影包络及几何统计；[validation.json](validation.json) 记录旧证据保留和不变量。

投影读取实际 Three 几何，用 CPU 深度缓冲和近似平面光照生成图。它不重现 WebGL 的平滑着色、金属度/粗糙度、真实光源强度、阴影、色调映射和浏览器抗锯齿；不包含 DOM、实际输入设备或帧率。灰度诊断也不能替代色觉研究。曲面修补片在部分真实滚动相位会转到背面，本轮没有用朝向锁定隐藏这一点。

```sh
node docs/quiet-gentle-home-qa/readability/export.mjs
python docs/quiet-gentle-home-qa/readability/render.py
node --test tests/quiet-readability.test.mjs
```

中间几何写入忽略的 `.local/quiet-readability-static/`。旧构图和时序图未覆盖；浏览器、GitHub 403 均未重试。当前仍为未发布、未实际 UI 验收候选，供私有审查。
