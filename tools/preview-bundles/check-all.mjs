import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {repositoryRoot} from './build.mjs';
const commands = [
  ['tools/preview-bundles/check.mjs'],
  ['--test', 'tools/preview-bundles/check.test.mjs',
    'tests/inlet-v3-preview-deadline.test.mjs',
    'tests/windowlife-request-scene.test.mjs',
    'tests/windowlife-request-controller.test.mjs',
    'tests/windowlife-request-view.test.mjs',
    'tests/quiet-workbench-fall-marker.test.mjs',
    'tests/quiet-viewport-layout.test.mjs'],
  ['docs/inlet-deadline-layout-qa/verify.mjs']
];
if (process.argv.includes('--audit')) commands.push(['docs/inlet-deadline-layout-qa/forecast-audit.mjs']);
for (const args of commands) {
  const result = spawnSync(process.execPath, args, {cwd: repositoryRoot, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (args[0] === 'docs/inlet-deadline-layout-qa/forecast-audit.mjs') {
    const audit = JSON.parse(readFileSync(path.join(repositoryRoot, 'docs/inlet-deadline-layout-qa/forecast-audit.json'), 'utf8'));
    assert.equal(audit.safeDidNotClose.length, 0, 'a safe forecast did not actually close');
  }
}
