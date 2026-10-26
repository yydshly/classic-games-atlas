"""Check editorial integrity and static local resources, without network access."""
import collections
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
EXTERNAL_REFERENCES = {'moss': 'lemmings', 'inlet': 'qix', 'ladder': 'lode-runner'}


def validate_references(games, experiments, comparisons):
    """Bind every experiment to its catalogue game or an evidenced external reference."""
    game_by_id = {game['id']: game for game in games}
    comparison_by_slug = {item['slug']: item for item in comparisons}
    experiment_by_id = {item['id']: item for item in experiments}
    assert len(game_by_id) == len(games), 'duplicate catalogue id'
    assert len(comparison_by_slug) == len(comparisons), 'duplicate comparison slug'
    assert len(experiment_by_id) == len(experiments), 'duplicate experiment id'
    for game in games:
        linked = game.get('experiment')
        if linked:
            assert linked.get('sourceGame') == game['id'], (game['id'], 'reverse source')
            assert experiment_by_id.get(linked.get('id')) == linked, (game['id'], 'experiment missing from manifest')
    external = {}
    for experiment in experiments:
        identity = experiment['id']
        source_id = experiment['sourceGame']
        comparison = comparison_by_slug.get(identity)
        assert comparison and comparison.get('reference_id') == source_id, (identity, source_id, 'comparison binding')
        if source_id in game_by_id:
            game = game_by_id[source_id]
            if experiment['status'] == 'published':
                assert game.get('experiment') == experiment, (identity, source_id, 'catalogue reverse link')
            else:
                assert 'experiment' not in game, (identity, source_id, 'planned catalogue link')
            continue
        assert EXTERNAL_REFERENCES.get(identity) == source_id, (identity, source_id, 'unregistered external reference')
        assert source_id not in external, (identity, source_id, 'duplicate external reference')
        assert '未计入原72条图鉴' in comparison.get('reference_binding', ''), (identity, source_id, 'external declaration')
        assert comparison.get('relation') == experiment['relation'], (identity, source_id, 'relation mismatch')
        for field in ('original_title', 'original_core'):
            assert comparison.get(field), (identity, source_id, field)
        sources = comparison.get('original_sources')
        assert isinstance(sources, list) and sources, (identity, source_id, 'missing original sources')
        for source in sources:
            for field in ('label', 'kind', 'relation', 'checkedAt', 'status', 'note'):
                assert source.get(field), (identity, source_id, field)
            address = urlparse(source.get('url', ''))
            assert address.scheme == 'https' and address.netloc, (identity, source_id, 'source URL')
        external[source_id] = identity
    for comparison in comparisons:
        reference_id = comparison.get('reference_id')
        if reference_id and reference_id not in game_by_id:
            assert external.get(reference_id) == comparison['slug'], (comparison['slug'], reference_id, 'unbound external reference')
    assert external == {source: identity for identity, source in EXTERNAL_REFERENCES.items()}, 'external experiment missing'
    return external


def main():
    data = json.loads((ROOT/'data/games.json').read_text(encoding='utf-8'))
    games = data['games']
    assert len(games) == 72
    assert len(data['groups']) == 10
    assert len({game['id'] for game in games}) == 72
    assert len({game['title'] for game in games}) == 72
    counts = collections.Counter(game['group'] for game in games)
    assert list(counts.values()) == [8,8,8,6,8,8,6,6,6,8], counts
    for game in games:
        for field in ['title','english','aliases','scope','platforms','era','genres','play','classic','edition','sources']:
            assert game[field], (game['id'], field)
        assert game['group'] in {group['id'] for group in data['groups']}
        for key in game['sources']:
            source = data['sources'][key]
            assert urlparse(source['url']).scheme == 'https'
            assert source['relation'] and source['status'] and source['note']
    html = (ROOT/'index.html').read_text(encoding='utf-8')
    experiments = json.loads((ROOT/'data/experiments.json').read_text(encoding='utf-8'))
    comparisons = json.loads((ROOT/'data/comparisons.json').read_text(encoding='utf-8'))['items']
    assert experiments == data['experiments']
    external = validate_references(games, experiments, comparisons)
    for experiment in experiments:
        assert '原创' in experiment['relation']
        if experiment['status'] == 'published':
            assert experiment['levels'] == {'fortress':10,'maze':10,'starline':12,'prism':12,'crate':20,'pass':8,'trail':8,'lantern':10,'cloud':8,'garden':20,'vine':16,'petal':20,'sand':20,'pinfall':12,'gale':8,'post':8,'beacon':10,'chime':16,'brook':10,'tide':12,'paper':16,'harbor':12,'farm':12,'ruins':8,'orchard':12,'courier':12,'venture':12,'island':12,'orbit':12,'duel':8,'expedition':8,'feather':8,'echo':8,'escort':8,'windowlife':3,'glimmer':3,'moss':3,'inlet':3,'ladder':3}[experiment['id']] and experiment['url']
            assert (ROOT/experiment['url']/'index.html').is_file()
            assert (ROOT/experiment['cover']).is_file()
        else:
            assert experiment['status'] == 'planned' and experiment['url'] is None
    for resource in re.findall(r'(?:src|href)="(\./[^"#]+)"', html):
        local_path = urlparse(resource).path
        assert (ROOT/local_path).is_file() or (ROOT/local_path/'index.html').is_file(), resource
    assert '原创玩法原型' in html and '不是游戏平台分类' in html
    report = dict(entries=len(games), uniqueIds=72, uniqueTitles=72, groups=dict(counts), sourceRecords=len(data['sources']), sourceStatuses=dict(collections.Counter(source['status'] for source in data['sources'].values())), externalReferences=external, localResources='all present')
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
