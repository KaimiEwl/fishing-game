import { copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoName = process.env.PAGES_REPO_NAME || 'fishing-game';
const basePath = process.env.VITE_BASE_PATH || `/${repoName}/`;
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

const build = spawnSync(
  process.execPath,
  [viteBin, 'build'],
  {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      VITE_BASE_PATH: basePath,
    },
  },
);

if (build.error) {
  console.error(build.error);
  process.exit(1);
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html was not created by the build.');
  process.exit(1);
}

copyFileSync('dist/index.html', 'dist/404.html');
console.log(`GitHub Pages artifact is ready in dist/ with VITE_BASE_PATH=${basePath}`);
