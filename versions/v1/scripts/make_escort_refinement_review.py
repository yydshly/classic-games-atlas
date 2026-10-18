"""Publish original-size real captures and real-input videos, no concept images."""
from pathlib import Path
import hashlib,json,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/escort-qa/refinement'
ff=shutil.which('ffmpeg');probe=Path(ff).with_name('ffprobe.exe');videos=[]
for p in OUT.glob('*/*.webm'):
 target=p.with_suffix('.mp4');cmd=[ff,'-hide_banner','-loglevel','error','-y','-i',str(p)]
 if p.parent.name=='validation':cmd+=['-t','12']
 subprocess.run(cmd+['-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(target)],check=True)
 meta=json.loads(subprocess.check_output([str(probe),'-v','error','-show_entries','stream=width,height,codec_name:format=duration','-of','json',str(target)]));videos.append({'file':target.relative_to(OUT).as_posix(),'source':p.relative_to(OUT).as_posix(),'trim':'first12seconds' if p.parent.name=='validation' else 'none','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),**meta})
(OUT/'video-metadata.json').write_text(json.dumps(videos,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>街巷护送 · 第34项修整评审</title><style>
:root{color-scheme:dark;background:#0d1922;color:#eadcc1;font:15px/1.8 system-ui}body{max-width:1280px;margin:auto;padding:28px}h1,h2{font-family:KaiTi,serif;font-weight:500}h1{font-size:38px}h2{margin-top:42px;color:#e4c17e}a{color:#dfc388}p{max-width:900px;color:#b6c5bd}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0;padding:12px;border:1px solid #a9874d55;background:#14262f;border-radius:6px}figcaption{font-size:13px;margin-bottom:8px;color:#d4c39e}img,video{width:100%;height:auto;display:block}video{background:#07131c;max-height:650px}.phone img{max-height:750px;width:auto;max-width:100%;margin:auto}code{color:#e5c58c}@media(max-width:700px){body{padding:16px}.grid{grid-template-columns:1fr}h1{font-size:30px}}
</style><nav><a href="../../../games/escort/">进入街巷护送 ↗</a> · <a href="../../ESCORT_REFINEMENT_REVIEW.md">文字记录</a></nav><h1>一盏灯，落在街巷里。</h1><p>第34项限定修整：环境光与接触影、多人辨识、手机实战布局。关卡、战斗规则、既有美术素材保持不变。以下均为实际网页渲染和真实输入录像；没有概念图，也没有修改生命、位置或时间来布置画面。</p><p>晨街与夜岸的多人/出手对照恢复同一份合法输入存档，24项战局字段完全一致。单人图为各关待开始画面。录像为独立的普通操作过程，原尺寸录制，MP4仅转码；手机最终短片截取原录像前12秒，无补帧或生成片段。点击图片查看原始PNG。</p>'''
for scene,title in [('dawn','晨街'),('night','夜岸')]:
 html+=f'<h2>{title} · 同一战局前后对照</h2>'
 for state,label in [('single','单人 / 待开始'),('crowd','多人 / 暂停取帧'),('strike','出手 / 暂停取帧')]:
  html+='<div class="grid">'
  for phase,text in [('before','修整前'),('after','修整后')]:
   src=f'{phase}/{scene}-{state}.png';html+=f'<figure><figcaption>{title} · {label} · {text} / 960×540</figcaption><a href="{src}"><img loading="lazy" src="{src}" alt="{title}{label}{text}实际画面"></a></figure>'
  html+='</div>'
 html+='<div class="grid">'
 for phase,text in [('before','修整前'),('after','修整后')]:html+=f'<figure><figcaption>{title} · {text}真实动作 / 1440×1000</figcaption><video controls playsinline preload="none" src="{phase}/{scene}-action.mp4"></video><a href="{phase}/{scene}-action.webm">原始 WebM</a></figure>'
 html+='</div>'
html+='<h2>雨巷与归巷 · 同一方法应用到其余环境</h2><div class="grid">'
for scene,title in [('rain','雨纹街心'),('gate','归巷之灯')]:html+=f'<figure><figcaption>{title} · 实际出手画面</figcaption><a href="after/{scene}-strike.png"><img loading="lazy" src="after/{scene}-strike.png" alt="{title}实景"></a></figure>'
html+='</div><h2>手机 · 战斗开始后让街巷占据主要空间</h2><p>390×844 竖屏：实战画面从360×203、顶端277px，调整为390×582、顶端48px。844×390 横屏：642×348，操作键放在右侧。手机标签使用单独的阅读尺度；主要触控按钮至少44×44px。信息、手册和街巷册会暂停。</p><div class="grid phone">'
for src,text in [('before/phone-portrait.png','修整前 · 390×844'),('validation/phone-portrait-live.png','修整后 · 390×844')]:html+=f'<figure><figcaption>{text}</figcaption><a href="{src}"><img loading="lazy" src="{src}" alt="{text}实景"></a></figure>'
html+='</div><figure><figcaption>修整后横屏 · 844×390 · 实战原尺寸</figcaption><a href="validation/phone-landscape-live.png"><img loading="lazy" src="validation/phone-landscape-live.png" alt="手机横屏实战"></a></figure><div class="grid">'
for label,text,size in [('portrait','竖屏','390×844'),('landscape','横屏','844×390')]:html+=f'<figure><figcaption>修整后{text}真实触控 / {size} / 前12秒</figcaption><video controls playsinline preload="none" src="validation/phone-{label}-action.mp4"></video><a href="validation/phone-{label}-action.webm">原始完整 WebM</a></figure>'
html+='</div><h2>验证与仍需评审的地方</h2><p>本地及公开站验证报告分别记录真实键盘/触控完整通关、暂停旋转、24字段刷新恢复与资源检查。浏览器自动化和帧序列只能证明这些具体行为；触感、持续多人遮挡和长时间阅读舒适度仍需要真人评审。未测试实体手机、Safari及各机型的动态地址栏和安全区。</p><p><a href="before/report.json">修整前采集记录</a> · <a href="after/report.json">修整后采集记录</a> · <a href="validation/report.json">最终本地验证</a> · <a href="video-metadata.json">录像尺寸与编码</a></p></html>'
(OUT/'index.html').write_text(html,encoding='utf8');print(json.dumps({'review':'docs/escort-qa/refinement/index.html','videos':len(videos)}))
