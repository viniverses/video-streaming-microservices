import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pulumiDir = path.resolve(scriptDir, '..');

const command = process.argv[2];

const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (command === 'up') {
  run('pulumi', ['up', '--stack', 'dev', '--yes'], pulumiDir);
} else if (command === 'down') {
  run('pulumi', ['destroy', '--stack', 'dev', '--yes'], pulumiDir);
} else {
  console.error('Usage: node scripts/pulumi-dev.mjs <up|down>');
  process.exit(1);
}
