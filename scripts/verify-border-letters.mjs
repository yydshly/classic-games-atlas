// Scope and preservation audit for the local Border Letters candidate.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PLAY_ENTRIES } from '../play-entries.mjs';

const base = 'c074215850ac719c68e779d2a2214502488e103c';
const publishedTree = '1acd1c5320f102845340418cb232592c371cd3ab';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', `${base}^{tree}`), publishedTree, 'base content must equal published main');
const expected = {
  'experiments/border-letters/README.md': 'A',
  'experiments/border-letters/engine.mjs': 'A',
  'experiments/border-letters/index.html': 'A',
  'experiments/border-letters/main.mjs': 'A',
  'experiments/border-letters/style.css': 'A',
  'experiments/border-letters/world.mjs': 'A',
  'index.html': 'M', 'play/entries.json': 'M', 'play/index.html': 'M',
  'scripts/test-border-letters-browser.py': 'A',
  'scripts/verify-border-letters.mjs': 'A',
  'tests/border-letters.test.mjs': 'A',
};
const diff = git('diff', '--name-status', `${base}..HEAD`).split('\n').filter(Boolean).map(line => line.split('\t'));
assert.deepEqual(Object.fromEntries(diff.map(([status, path]) => [path, status])), expected);
const old = JSON.parse(execFileSync('git', ['show', `${base}:play/entries.json`], { encoding: 'utf8' }));
const entries = JSON.parse(readFileSync('play/entries.json', 'utf8'));
assert.equal(old.length, 9, 'the published baseline has nine independent addresses');
assert.equal(entries.length, old.length + 1);
assert.deepEqual(entries.slice(1), old, 'old experiment entries preserved');
assert.equal(new Set(entries.map(entry => entry.path)).size, entries.length, 'no experiment address replaced');
assert.equal(entries[0].id, 'border-letters');
assert(entries[0].label.includes('已上线试玩') && entries[0].label.includes('线上体验验收中'));
assert(readFileSync('index.html', 'utf8').includes('id="border-letters-local"'));
assert(readFileSync('play/index.html', 'utf8').includes('10</b> 个实验地址'));
assert.equal(PLAY_ENTRIES.length, 99);
assert.equal(new Set(PLAY_ENTRIES.map(entry => entry.slug)).size, 45);
for (const path of ['data/games.json','data/comparisons.json','data/experiments.json','play-entries.mjs','experiments/old-house-echoes/courtyard/storage.mjs']) {
  assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' }), `${path} changed`);
}
console.log(JSON.stringify({ passed: true, base, publishedTree, head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), exactChanges: diff, counts: { registered: 45, historical: 99, independentPublishedBaseline: old.length, independentCandidate: entries.length }, sourceStatus: 'prepared_for_publication; remote status must be checked separately' }, null, 2));
