import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build, version} from 'esbuild';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
export const configs = [
  {
    id: 'inlet-deadline', globalName: 'InletPreview',
    entry: 'versions/v3/preview/inlet/game.mjs',
    modules: ['engine.mjs', 'game.mjs', 'renderer.mjs', 'journey.mjs', 'levels.mjs']
      .map(name => ({name, canonical: `versions/v3/preview/inlet/${name}`})),
    styles: ['style.css', 'preview-layout.css'],
    storageKey: 'classic-atlas.preview.inlet-v3-deadline.970a268.v1',
    forbiddenKey: 'classic-atlas.inlet.v3'
  },
  {
    id: 'windowlife-request', globalName: 'WindowlifeRequestPreview',
    entry: 'experiments/windowlife-request/main.mjs',
    modules: [
      ...['main.mjs', 'controller.mjs', 'paper-controller.mjs', 'scene.mjs', 'legacy-scene.mjs', 'marks.mjs', 'storage.mjs', 'view.mjs']
        .map(name => ({name, canonical: `experiments/windowlife-request/${name}`})),
      {name: 'levels.mjs', canonical: 'preview/windowlife/levels.mjs'}
    ],
    styles: ['style.css'],
    storageKey: 'classic-atlas.windowlife.request-scene.v1',
    forbiddenKey: 'classic-atlas.windowlife.v1'
  }
];
export const sha256 = text => createHash('sha256').update(text).digest('hex');
const gitBlob = text => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const read = (root, name) => readFile(path.join(root, name), 'utf8');
export function blocks(html) {
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(styles.length, 1, 'expected one inline style');
  assert.equal(scripts.length, 1, 'expected one inline script');
  assert(!/\bsrc\s*=/.test(scripts[0][1]), 'preview must remain self-contained');
  return {css: styles[0][1], script: scripts[0][2]};
}

// These are imported baselines, not a second mutable copy of source. Later edits
// stay traceable in Git and must still rebuild exactly to the runtime HTML.
export async function provenance(root = repositoryRoot) {
  const manifest = JSON.parse(await read(root, 'tools/preview-bundles/sources.json'));
  assert.equal(version, manifest.esbuildVersion, 'install the pinned esbuild with npm ci');
  const records = [];
  for (const record of manifest.imports) {
    const current = await read(root, record.target);
    const unchangedSinceImport = sha256(current) === record.importedSha256;
    if (unchangedSinceImport) {
      let original = current;
      for (const edit of [...record.adaptations].reverse()) {
        assert(original.includes(edit.to), `missing documented adaptation: ${record.target}`);
        original = original.split(edit.to).join(edit.from);
      }
      assert.equal(gitBlob(original), record.originBlob, `origin reconstruction mismatch: ${record.target}`);
      assert.equal(sha256(original), record.originSha256);
    }
    records.push({path: record.target, originCommit: record.originCommit, unchangedSinceImport});
  }
  return records;
}

export async function rebuild(root = repositoryRoot) {
  const origins = await provenance(root);
  const temporary = await mkdtemp(path.join(tmpdir(), 'atlas-preview-build-'));
  const results = [];
  try {
    for (const config of configs) {
      const directory = `experiments/${config.id}-preview`;
      for (const module of config.modules) {
        let contents = await read(root, `${directory}/source/${module.name}`);
        // Stable canonical staging paths keep esbuild's existing source comments
        // and the published bundle bytes. All inputs come from this branch.
        if (config.id === 'windowlife-request' && contents.includes("'./levels.mjs'")) {
          assert.equal(contents.split("'./levels.mjs'").length, 2, 'expected one local levels import');
          contents = contents.replace("'./levels.mjs'", "'../../preview/windowlife/levels.mjs'");
        }
        const target = path.join(temporary, module.canonical);
        await mkdir(path.dirname(target), {recursive: true});
        await writeFile(target, contents);
      }
      const output = await build({
        absWorkingDir: temporary, entryPoints: [config.entry], bundle: true,
        write: false, format: 'iife', globalName: config.globalName,
        charset: 'utf8', target: 'es2022', legalComments: 'none', metafile: true
      });
      assert.deepEqual(Object.keys(output.metafile.inputs).sort(), config.modules.map(m => m.canonical).sort(), `${config.id}: unexpected dependency graph`);
      assert(Object.values(output.metafile.outputs).every(o => o.imports.length === 0), 'external imports are not allowed');
      const script = `\n${output.outputFiles[0].text}\n`;
      assert(script.includes(JSON.stringify(config.storageKey)), `${config.id}: preview storage key missing`);
      assert(!script.includes(JSON.stringify(config.forbiddenKey)), `${config.id}: formal storage key leaked`);
      const css = '\n' + (await Promise.all(config.styles.map(name => read(root, `${directory}/source/${name}`)))).join('') + '\n';
      const runtimePath = `${directory}/index.html`;
      const checkedIn = await read(root, runtimePath);
      const current = blocks(checkedIn);
      // The checked-in HTML is the editable markup source. CSS/modules have
      // separate source files; no second page template or new entry is needed.
      const html = checkedIn.replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/, (_, a, b) => a + css + b)
        .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/, (_, a, b) => a + script + b);
      results.push({id: config.id, runtimePath, html, checkedIn, script, css, current,
        dependencies: Object.keys(output.metafile.inputs),
        hashes: {html: sha256(html), script: sha256(script), css: sha256(css)}});
    }
    return {esbuildVersion: version, origins, results};
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
}

export async function check(root = repositoryRoot) {
  const built = await rebuild(root);
  for (const result of built.results) {
    // Keep failures small: assert.equal on the full strings would dump bundles.
    assert(result.script === result.current.script, `${result.id}: inline bundle differs from source`);
    assert(result.css === result.current.css, `${result.id}: inline CSS differs from source`);
    assert(result.html === result.checkedIn, `${result.id}: generated HTML differs`);
  }
  return {passed: true, scope: 'source provenance, dependency graph and byte identity; not browser/UI acceptance',
    esbuildVersion: built.esbuildVersion, origins: built.origins,
    previews: built.results.map(({id, runtimePath, dependencies, hashes}) => ({id, runtimePath, dependencies, hashes}))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--out-dir', 'usage: node build.mjs --out-dir /tmp/atlas-previews');
  assert(process.argv[3], 'an explicit output directory is required');
  const destination = path.resolve(process.argv[3]);
  const relative = path.relative(repositoryRoot, destination);
  assert(relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'output must be outside the repository; review generated files before copying');
  const built = await rebuild();
  for (const result of built.results) {
    const target = path.join(destination, result.runtimePath);
    await mkdir(path.dirname(target), {recursive: true});
    await writeFile(target, result.html);
  }
  console.log(JSON.stringify({outputDirectory: destination, files: built.results.map(r => r.runtimePath)}));
}
