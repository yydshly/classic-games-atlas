import {spawnSync} from 'node:child_process';
import {repositoryRoot} from './build.mjs';
const commands = [
  ['tools/preview-bundles/check.mjs'],
  ['--test', 'tools/preview-bundles/check.test.mjs',
    'tests/inlet-v3-preview-deadline.test.mjs',
    'tests/inlet-preview-routes.test.mjs',
    'tests/inlet-preview-controller.test.mjs',
    'tests/windowlife-request-scene.test.mjs',
    'tests/windowlife-request-controller.test.mjs',
    'tests/windowlife-request-view.test.mjs',
    'tests/quiet-workbench-fall-marker.test.mjs',
    'tests/quiet-viewport-layout.test.mjs']
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, {cwd: repositoryRoot, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
