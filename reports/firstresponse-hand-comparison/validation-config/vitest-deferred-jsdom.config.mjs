import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const privateDirectory = dirname(fileURLToPath(import.meta.url));
const { default: baseline } = await import(pathToFileURL(resolve(repo, 'vitest.config.js')).href);
if (baseline.test?.environment !== 'jsdom') throw new Error('Expected the repository jsdom environment');
if (baseline.test?.runner) throw new Error('Review the repository custom runner before using deferred jsdom');
if (baseline.test?.sequence?.hooks && baseline.test.sequence.hooks !== 'stack') {
  throw new Error('Deferred jsdom cleanup requires the repository default stack hook order');
}
const setupFiles = Array.isArray(baseline.test.setupFiles)
  ? baseline.test.setupFiles
  : baseline.test.setupFiles ? [baseline.test.setupFiles] : [];
export default {
  ...baseline,
  root: repo,
  cacheDir: resolve(privateDirectory, 'deferred-jsdom-vite-cache'),
  test: {
    ...baseline.test,
    environment: 'node',
    setupFiles: [
      resolve(privateDirectory, 'setup-deferred-jsdom.mjs'),
      ...setupFiles.map(file => resolve(repo, file)),
    ],
    sequence: { ...baseline.test.sequence, setupFiles: 'list' },
    provide: {
      ...baseline.test.provide,
      firstResponsePrivateNormalEnvironmentOptions: baseline.test.environmentOptions || {},
    },
  },
};
