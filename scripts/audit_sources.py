"""Read-only HTTP audit. Titles/excerpts stay in ignored .local; metadata is public."""
import concurrent.futures
import datetime
import json
import re
import sys
from pathlib import Path
import requests
from make_data import SOURCES

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime.date.today().isoformat()
sys.stdout.reconfigure(encoding='utf-8')

def check(item):
    key, (label, url, kind, relation) = item
    try:
        response = requests.get(url, timeout=28, headers={'User-Agent':'ClassicGamesAtlas/1.0 (reference-link-check)'})
        charset = re.search(br'charset=["\']?([a-zA-Z0-9_-]+)', response.content[:5000], re.I)
        if charset:
            response.encoding = charset.group(1).decode('ascii')
        html = response.text
        title = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
        title = re.sub(r'\s+', ' ', title.group(1)).strip() if title else ''
        text = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', html, flags=re.S | re.I)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if 'store.steampowered.com/app/' in url:
            desc = re.search(r'<div class="game_description_snippet"[^>]*>(.*?)</div>', html, re.S)
            if desc:
                text = re.sub(r'<[^>]+>', '', desc.group(1)).strip()
        desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', html, re.S | re.I)
        desc = desc_match.group(1) if desc_match else ''
        readable = response.status_code == 200 and len(text) > 100 and not any(t in title.lower() for t in ['just a moment', 'access denied', 'page not found','privacy error','site not found','ページが見つかりません'])
        status = '页面可读' if readable else '访问受限或失效'
        note = '已检查 HTTP、标题与正文可访问；不代表逐条事实均已核验。' if readable else f'本次 HTTP 检查未取得可用正文（HTTP {response.status_code}）；链接保留作资料线索。'
        result = dict(checkedAt=NOW, status=status, note=note, httpStatus=response.status_code, title=title, finalUrl=response.url)
        return key, result, dict(key=key,label=label,title=title,status=response.status_code,url=response.url,description=desc[:600],excerpt=text[:700])
    except requests.RequestException as exc:
        return key, dict(checkedAt=NOW,status='未能读取',note=f'本次连接未取得正文（{type(exc).__name__}）；链接保留作资料线索。'), dict(key=key,error=type(exc).__name__)

if __name__ == '__main__':
    selected = {k:v for k,v in SOURCES.items() if not sys.argv[1:] or k in sys.argv[1:]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check, selected.items()))
    (ROOT/'.local').mkdir(exist_ok=True)
    (ROOT/'data').mkdir(exist_ok=True)
    previous_path = ROOT/'data/source-audit.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else {}
    previous.update({key:metadata for key,metadata,_ in results})
    previous_path.write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'.local/source-excerpts.json').write_text(json.dumps([excerpt for _,_,excerpt in results],ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps([dict(key=key,status=metadata['status'],title=metadata.get('title'),excerpt=excerpt.get('excerpt','')[:330]) for key,metadata,excerpt in results],ensure_ascii=False,indent=2))
