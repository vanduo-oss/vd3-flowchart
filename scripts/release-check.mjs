import { spawnSync } from 'node:child_process';
import process from 'node:process';

const steps = [
  ['pnpm', ['audit', '--audit-level=moderate', '--ignore', 'GHSA-vfj7-8cjw-p6xm']],
  ['pnpm', ['lint']],
  ['pnpm', ['run', 'format:check']],
  ['pnpm', ['run', 'stylelint']],
  ['pnpm', ['test']],
  ['pnpm', ['run', 'build']],
  ['pnpm', ['run', 'test:skills']],
  ['pnpm', ['run', 'test:types']],
  ['pnpm', ['run', 'test:e2e']],
  ['pnpm', ['exec', 'openspec', 'validate', '--all', '--strict']],
  ['node', ['scripts/pack-smoke.mjs']],
];

for (const [command, args] of steps) {
  process.stdout.write(`\n> ${command} ${args.join(' ')}\n`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

process.stdout.write('\nrelease:check passed without publishing.\n');
