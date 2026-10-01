import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const builder = fs.readFileSync('desktop/scripts/build-desktop-web.cjs', 'utf8');
const sourceWorker = fs.readFileSync('app/sw.js', 'utf8');
const deployWorker = fs.readFileSync('desktop/web-app/public/app/sw.js', 'utf8');

const rootShellPattern = /cache\.(?:add|match|put)\(\s*['"]\/index\.html['"]/;

describe('desktop app service-worker scope', () => {
  it('uses the registration scope for the cached application shell', () => {
    for (const worker of [sourceWorker, deployWorker]) {
      expect(worker).toContain('self.registration.scope');
      expect(worker).toContain('SHELL_URL');
      expect(worker).not.toMatch(rootShellPattern);
    }
  });
  it('blocks packaging when a worker can leak the root command center into /app/', () => {
    expect(builder).toContain('function assertScopedServiceWorker');
    expect(builder).toContain('assertScopedServiceWorker(DESKTOP_APP_BUILD)');
    expect(builder).toContain('root /index.html cache serves the command center inside /app/');
  });
});
