"""Check editorial integrity and static local resources, without network access."""
import collections
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT/'data/games.json').read_text(encoding='utf-8'))
games = data['games']
assert len(games)==72
assert len(data['groups'])==10
assert len({game['id'] for game in games})==72
assert len({game['title'] for game in games})==72
counts=collections.Counter(game['group'] for game in games)
assert list(counts.values())==[8,8,8,6,8,8,6,6,6,8],counts
for game in games:
    for field in ['title','english','aliases','scope','platforms','era','genres','play','classic','edition','sources']:
        assert game[field],(game['id'],field)
    assert game['group'] in {group['id'] for group in data['groups']}
    for key in game['sources']:
        source = data['sources'][key]
        assert urlparse(source['url']).scheme=='https'
        assert source['relation'] and source['status'] and source['note']
html=(ROOT/'index.html').read_text(encoding='utf-8')
experiments=json.loads((ROOT/'data/experiments.json').read_text(encoding='utf-8'))
assert experiments==data['experiments']
assert len({e['id'] for e in experiments})==len(experiments)
for experiment in experiments:
    assert '原创' in experiment['relation']
    assert experiment['sourceGame'] in {game['id'] for game in games}
    game=next(g for g in games if g['id']==experiment['sourceGame'])
    if experiment['status']=='published':
        assert experiment['levels']=={'fortress':10,'maze':10,'starline':12,'prism':12,'crate':20,'pass':8,'trail':8,'lantern':10,'cloud':8,'garden':20,'vine':16,'petal':20,'sand':20,'pinfall':12,'gale':8,'post':8,'beacon':10,'chime':16,'brook':10,'tide':12}[experiment['id']] and experiment['url']
        assert (ROOT/experiment['url']/'index.html').is_file()
        assert (ROOT/experiment['cover']).is_file()
        assert game['experiment']==experiment
    else:
        assert experiment['status']=='planned' and experiment['url'] is None
        assert 'experiment' not in game
for resource in re.findall(r'(?:src|href)="(\./[^"#]+)"',html):
    assert (ROOT/resource).is_file() or (ROOT/resource/'index.html').is_file(),resource
assert '原创玩法实验' in html and '不是游戏平台分类' in html
report=dict(entries=len(games),uniqueIds=72,uniqueTitles=72,groups=dict(counts),sourceRecords=len(data['sources']),sourceStatuses=dict(collections.Counter(source['status'] for source in data['sources'].values())),localResources='all present')
print(json.dumps(report,ensure_ascii=True,indent=2))
