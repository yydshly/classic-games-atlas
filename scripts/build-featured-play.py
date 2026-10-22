from pathlib import Path
import json,html,argparse

ROOT=Path(__file__).resolve().parents[1]
START=b'<!-- featured-play:start -->';END=b'<!-- featured-play:end -->'
def render(data):
 items=data['items']
 assert len(items)==3 and {x['slug']for x in items}=={'fortress','brook','post'}
 cards=[]
 for x in items:
  candidate=x.get('campaign');optional=''
  if candidate:optional='<a class="play-launch featured-campaign" href="'+html.escape(candidate['url'],quote=True)+'">'+html.escape(candidate['label'])+' <span class="arrow-icon" aria-hidden="true"></span></a>'
  esc=html.escape;keys=''.join('<span><kbd>'+esc(k)+'</kbd> '+esc(v)+'</span>'for k,v in x['keys']);cards.append('<article class="featured-card" data-play="'+x['slug']+'" data-featured="true" aria-labelledby="featured-'+x['slug']+'-title"><div class="featured-scene"><img src="'+x['image']+'" width="'+str(x['width'])+'" height="'+str(x['height'])+'" alt="'+esc(x['alt'])+'" decoding="async"><span>v2 实玩画面 · 非原作截图</span></div><div class="featured-copy"><p class="featured-meta">原型 '+x['number']+' / '+x['genre']+'<span>v2 候选</span></p><h4 id="featured-'+x['slug']+'-title">'+x['title']+'</h4><p class="featured-tagline">'+x['tagline']+'</p><p class="featured-pitch">'+x['pitch']+'</p><div class="featured-keys" aria-label="主要键盘操作">'+keys+'</div><p class="featured-goal">'+x['firstGoal']+'</p><a class="play-launch featured-launch" href="'+x['url']+'">试玩'+x['title']+' <span class="arrow-icon" aria-hidden="true"></span></a>'+optional+'<details class="featured-boundary"><summary>玩法范围与经典启发</summary><p>'+x['range']+'</p><p>'+x['reference']+'</p><a href="#compare='+x['slug']+'">查看版本对照与记录</a></details></div></article>')
 block='''<section class="featured-start" id="selected-play" aria-labelledby="featured-title"><div class="featured-heading"><div><p class="eyebrow">START WITH THREE / 精选试玩</p><h3 id="featured-title">三种节奏，挑一种开始。</h3></div><p>基地防守、分路布防、俯视竞速。<br>均为本项目原创玩法候选，仍待真人品质验收。</p></div><div class="featured-grid">'''+''.join(cards)+'''</div></section><div class="featured-library-heading" id="all-play"><h3>全部42款，继续挑选。</h3><a href="#collection">也可以先看经典图鉴 <span class="arrow-icon" aria-hidden="true"></span></a></div>'''
 return block.encode("utf-8")

def build(original,data):
 content=START+b'\n'+render(data)+b'\n'+END
 if START in original:
  assert original.count(START)==1 and original.count(END)==1
  a=original.index(START);b=original.index(END,a)+len(END)
  return original[:a]+content+original[b:]
 a=original.index(b'<section class="featured-start"');b=original.index(b'<div class="play-controls">',a)
 return original[:a]+content+b'\n      '+original[b:]

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');args=ap.parse_args()
 target=ROOT/'index.html';original=target.read_bytes();data=json.loads((ROOT/'data/featured-play.json').read_text(encoding='utf-8'));expected=build(original,data)
 if args.check:assert expected==original,'Run python scripts/build-featured-play.py to update the static section.'
 else:target.write_bytes(expected)
 print(json.dumps({'featured':len(data['items']),'staticHtmlMatchesData':True,'mode':'check'if args.check else'write'}))
