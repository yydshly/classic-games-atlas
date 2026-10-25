import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {check, configs, repositoryRoot} from './build.mjs';

async function fixture(action) {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-preview-check-test-'));
  try {
    const manifest = JSON.parse(await readFile(path.join(repositoryRoot, 'tools/preview-bundles/sources.json'), 'utf8'));
    const names = new Set(['tools/preview-bundles/sources.json', ...manifest.imports.map(r => r.target)]);
    for (const config of configs) {
      names.add(`experiments/${config.id}-preview/index.html`);
      for (const name of config.styles) names.add(`experiments/${config.id}-preview/source/${name}`);
    }
    for (const name of names) {
      await mkdir(path.dirname(path.join(root, name)), {recursive: true});
      await copyFile(path.join(repositoryRoot, name), path.join(root, name));
    }
    await action(root);
  } finally { await rm(root, {recursive: true, force: true}); }
}
async function replace(root, relative, before, after) {
  const target = path.join(root, relative), source = await readFile(target, 'utf8');
  assert(source.includes(before), `test mutation not applied: ${relative}`);
  await writeFile(target, source.replace(before, after));
}

test('both source graphs rebuild the exact current scripts, CSS and full HTML without modifying runtime', async () => {
  const before = new Map(await Promise.all(configs.map(async config => {
    const name = `experiments/${config.id}-preview/index.html`;
    return [name, await readFile(path.join(repositoryRoot, name), 'utf8')];
  })));
  const report = await check();
  assert.equal(report.previews.length, 2);
  for (const preview of report.previews) {
    assert.equal(await readFile(path.join(repositoryRoot, preview.runtimePath), 'utf8'), before.get(preview.runtimePath));
  }
});
test('a changed source limit is caught instead of accepting a stale runtime bundle', async () => fixture(async root => {
  const runtime = path.join(root, 'experiments/inlet-deadline-preview/index.html');
  const before = await readFile(runtime, 'utf8');
  await replace(root, 'experiments/inlet-deadline-preview/source/levels.mjs', 'limit:75', 'limit:76');
  await assert.rejects(check(root), /inlet-deadline: inline bundle differs from source/);
  assert.equal(await readFile(runtime, 'utf8'), before, 'checking must never write the checked-in page');
}));
test('a changed runtime bundle is caught independently of matching source files', async () => fixture(async root => {
  await replace(root, 'experiments/windowlife-request-preview/index.html', 'var WindowlifeRequestPreview', 'var ChangedPreview');
  await assert.rejects(check(root), /windowlife-request: inline bundle differs from source/);
}));
test('restoring the sticky map overlay in runtime CSS is caught', async () => fixture(async root => {
  await replace(root, 'experiments/inlet-deadline-preview/index.html', '.play-console .telemetry{order:1;position:static;', '.play-console .telemetry{order:1;position:sticky;');
  await assert.rejects(check(root), /inlet-deadline: inline CSS differs from source/);
}));
test('the formal storage key cannot leak into a rebuilt preview', async () => fixture(async root => {
  await replace(root, 'experiments/inlet-deadline-preview/source/journey.mjs', 'classic-atlas.preview.inlet-v3-deadline.970a268.v1', 'classic-atlas.inlet.v3');
  await assert.rejects(check(root), /preview storage key missing|formal storage key leaked/);
}));
