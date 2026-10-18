# 街巷护送 · 视觉打磨评审

本轮依据“要有质感和风格，不能以简化代码演示累计数量”的要求打磨第34款，保留玩法、8关、存档和有效测试。本页用于视觉评审，技术通过不等于用户认可质感，不自动开始第35款。

## 实景依据与方向

[旧版桌面](escort-qa/design/desktop-street.png)与[旧版手机](escort-qa/design/mobile-street.png)为真实运行截图。观察到：人物以简单几何和标签为主，建筑重复且缺少材质；地面、光照和动作轮廓弱，页面顶部占用较多游戏空间。

统一方向为暖金灯火与靛青阴影的原创手绘质感街巷。角色服装、场景与灯车由本项目使用imagegen制作，明确属于AI辅助原创素材，不是原商业游戏画面，不冒称人类手绘。图片、真实提示与SHA-256记录见[素材档案](escort-qa/art-prompts.json)。

## 已落实的变化

- 守灯人有服装褶皱、发髻、围巾、腰包与六个姿态，行走、起手、出拳与闪步按真实动作阶段切换；四类对手以服装、体型和两种姿态区分。取消人名文字承担角色辨识的做法，保留脚下位置、保护对象标记和必要光息条。
- 晨街市场、雨檐巷、夜岸与终章院门使用同一画风的环境图集，画出石板、木作、布帘、瓦顶、水面和远景；与人物、路口、天气和粒子分层。灯车补齐木纹、绳结、铜件、布面与纸灯材质，轮子随实际行程转动，局部暖光照应场景。
- 出手阶段对应姿态与弧光，命中有受击明暗、碎光和伤害飘字，自身受击有轻微视觉震动。雨丝/水纹、夜间光尘和渐变暗角服务场景气氛，均不更改判定或游戏时钟。
- 顶部压缩为简洁标题，主场景放大，靛青/暖金界面延续美术；按键、状态与手册保留。手机提高场内信息字号，并保持可同时移动和闪步的操作区。

## 截图迭代

[第一轮真实画面](escort-qa/visual-v2/report.json)已检查，并正常完成8关和原生触屏首关。审视发现开场标题把“归途”拆开，以及程序灯车与绘画场景不协调；第二轮调整标题断行、替换绘画灯车并加入轮子运动。第一轮24组界面证据保留在本地，最终公网重新验收。

最终本地实景已逐张审视：[开场](escort-qa/visual-v3/opening-desktop.png)、[晨街战斗](escort-qa/visual-v3/dawn-combat.png)、[雨巷](escort-qa/visual-v3/rain-combat.png)、[夜岸](escort-qa/visual-v3/night-canal.png)、[终章院门](escort-qa/visual-v3/night-gate.png)、[手机](escort-qa/visual-v3/mobile-combat.png)。人物与灯车保持透明边缘并落在地面，手套/围巾和对手轮廓能在场景中辨识；标题断行与灯车风格两处修正已落实。完整图片保留，不以生成素材替代实景。

[实景对比图](escort-qa/visual-v3/review-board.png)只把真实截图排版并标注，旧版区域裁切坐标与源图SHA-256见[元数据](escort-qa/visual-v3/review-board.json)。[普通操作报告](escort-qa/visual-v3/report.json)包含8关、手机首关和实际输入；[24字段精确重放](escort-qa/visual-v3/replay.json)一致。公网打磨版已部署，真实网站的[开场](escort-qa/public-final/opening-desktop.png)、[晨街](escort-qa/public-final/dawn-combat.png)、[雨巷](escort-qa/public-final/rain-combat.png)、[夜岸](escort-qa/public-final/night-canal.png)、[终章](escort-qa/public-final/night-gate.png)、[手机](escort-qa/public-final/mobile-combat.png)已逐张审视；[操作与部署证据](ESCORT_VERIFICATION.md)记录4素材真实加载、8关、界面和253文件核对。技术通过不替代用户审美判断。

## 保留范围与边界

规则引擎与8关数据保持功能提交`5df2624f7fb67986e34bb4afb12c4d1aecedbf11`原样，39组核心证据有效；重新验证新增美术下的真实输入、截图、资源与界面。旧33款和72项图鉴保留。

目前采用有限精灵姿态与分层场景，并非完整商业规模逐帧动画或3D场景。实体设备、Safari/Firefox、读屏认证和人工难度研究未覆盖。是否符合用户对质感的期待，交由主对话评审实际截图与试玩版。


网页交付使用同尺寸WebP副本，四图由9,669,845字节降为2,227,824字节，透明通道逐像素一致。原始PNG保留，未扩大美术范围；[编码记录](escort-qa/web-encoding.json)说明来源与校验。
