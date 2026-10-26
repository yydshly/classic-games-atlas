"""Reference integrity regressions for the catalogue and three external classics."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.validate_data import validate_references


def fixtures():
    data = json.loads((ROOT/'data/games.json').read_text(encoding='utf-8'))
    comparisons = json.loads((ROOT/'data/comparisons.json').read_text(encoding='utf-8'))['items']
    return data['games'], data['experiments'], comparisons


def by_id(items, identity, field='id'):
    return next(item for item in items if item[field] == identity)


class ReferenceIntegrityTest(unittest.TestCase):
    def setUp(self):
        self.games, self.experiments, self.comparisons = copy.deepcopy(fixtures())

    def validate(self):
        return validate_references(self.games, self.experiments, self.comparisons)

    def test_real_external_references_are_bound_without_expanding_the_catalogue(self):
        self.assertEqual(self.validate(), {'lemmings':'moss', 'qix':'inlet', 'lode-runner':'ladder'})
        self.assertEqual(len(self.games), 72)

    def test_unregistered_or_crossed_reference_is_rejected(self):
        for source in ('unregistered-game', 'qix'):
            with self.subTest(source=source):
                games, experiments, comparisons = copy.deepcopy(fixtures())
                by_id(experiments, 'moss')['sourceGame'] = source
                with self.assertRaises(AssertionError):
                    validate_references(games, experiments, comparisons)

    def test_coordinated_fake_reference_is_rejected(self):
        by_id(self.experiments, 'moss')['sourceGame'] = 'fabricated-source'
        by_id(self.comparisons, 'moss', 'slug')['reference_id'] = 'fabricated-source'
        with self.assertRaises(AssertionError):
            self.validate()

    def test_catalogue_reverse_link_remains_required(self):
        by_id(self.games, 'contra')['experiment'] = {'id':'forged'}
        with self.assertRaises(AssertionError):
            self.validate()

    def test_published_catalogue_experiment_cannot_disappear(self):
        self.experiments.remove(by_id(self.experiments, 'fortress'))
        with self.assertRaises(AssertionError):
            self.validate()

    def test_external_experiment_cannot_disappear(self):
        self.experiments.remove(by_id(self.experiments, 'moss'))
        with self.assertRaises(AssertionError):
            self.validate()

    def test_duplicate_catalogue_experiment_comparison_or_external_reference_is_rejected(self):
        for change in ('catalogue', 'experiment', 'comparison', 'external'):
            with self.subTest(change=change):
                games, experiments, comparisons = copy.deepcopy(fixtures())
                if change == 'catalogue':
                    games.append(copy.deepcopy(by_id(games, 'contra')))
                elif change == 'experiment':
                    experiments.append(copy.deepcopy(by_id(experiments, 'moss')))
                elif change == 'comparison':
                    comparisons.append(copy.deepcopy(by_id(comparisons, 'moss', 'slug')))
                else:
                    by_id(experiments, 'ladder')['sourceGame'] = 'qix'
                    by_id(comparisons, 'ladder', 'slug')['reference_id'] = 'qix'
                with self.assertRaises(AssertionError):
                    validate_references(games, experiments, comparisons)

    def test_missing_registration_declaration_or_source_is_rejected(self):
        for change in ('registration', 'declaration', 'sources', 'source_url', 'source_host'):
            with self.subTest(change=change):
                games, experiments, comparisons = copy.deepcopy(fixtures())
                item = by_id(comparisons, 'moss', 'slug')
                if change == 'registration':
                    comparisons.remove(item)
                elif change == 'declaration':
                    item['reference_binding'] = ''
                elif change == 'sources':
                    item['original_sources'] = []
                elif change == 'source_url':
                    item['original_sources'][0]['url'] = ''
                else:
                    item['original_sources'][0]['url'] = 'https:'
                with self.assertRaises(AssertionError):
                    validate_references(games, experiments, comparisons)

    def test_unbound_external_comparison_is_rejected(self):
        item = copy.deepcopy(by_id(self.comparisons, 'moss', 'slug'))
        item.update(slug='invented', reference_id='invented-classic')
        self.comparisons.append(item)
        with self.assertRaises(AssertionError):
            self.validate()


if __name__ == '__main__':
    unittest.main()
