import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const existingNodeOptions = process.env.NODE_OPTIONS || '';
const memoryLimit = '--max-old-space-size=1280';
const nodeOptions = existingNodeOptions.includes('--max-old-space-size')
  ? existingNodeOptions
  : `${existingNodeOptions} ${memoryLimit}`.trim();

const build = spawn(
  process.execPath,
  [viteBin, 'build', '--minify=false', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  },
);

build.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

build.on('exit', (code, signal) => {
  if (signal) {
    console.error(`vite build terminated by ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
