import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';

// Keep the existing test assertions and timeouts while isolating GPU/recording costs.
export default defineConfig(base, {
  testDir: resolve(process.cwd(), 'tests/e2e'),
  outputDir: resolve(process.cwd(), 'reports/firstresponse-depth-comparison/software-artifacts'),
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { ...base.use, trace: 'off', video: 'off' },
  projects: base.projects?.map(project => ({
    ...project,
    use: {
      ...project.use,
      trace: 'off',
      video: 'off',
      launchOptions: {
        ...project.use?.launchOptions,
        args: [
          ...(project.use?.launchOptions?.args || []),
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--enable-unsafe-swiftshader',
        ],
      },
    },
  })),
});
