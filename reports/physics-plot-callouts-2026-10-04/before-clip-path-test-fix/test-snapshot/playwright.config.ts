import { defineConfig, devices } from '@playwright/test';

/**
 * Timeouts are deliberately generous.
 *
 * These specs drive the deployed app, which boots from CDN (React, Tailwind,
 * lucide, then the AlloFlow bundle and its lazy modules). A cold first paint
 * routinely exceeds Playwright's 30s default, and most specs wait on an element
 * that only exists after mount — so the default budget produced failures that
 * looked like missing UI but were just an unfinished boot.
 *
 * Measured on 05-sidebar-controls against the deployed app:
 *     30s  per test, 6 workers  ->  0 passed / 10 failed
 *    150s  per test, 2 workers  ->  7 passed /  3 failed
 * Two of the three residual failures were `page.goto` hitting the 45s
 * navigation timeout, which is why navigationTimeout is raised as well.
 *
 * Fewer local workers matters too: parallel cold boots contend for the same CDN
 * and make every one of them slower.
 *
 * NOTE ON baseURL (2026-08-16): the default is the live Cloudflare shell at
 * .../app/. The old default, https://prismflow-911fe.web.app, still answers 200
 * but serves a FROZEN pre-migration bundle (main.0b2144c6.js vs the repo's
 * main.bf002dda.js), so the whole suite silently "passed" against months-old
 * code. The Prismflow production-path cleanup (AGENT_HANDOFF.md, 2026-07-09)
 * moved serving to the CDN; nothing repointed this file until now.
 *
 * Because the base now carries a path, URL resolution matters:
 *   - App-shell specs navigate with `page.goto('./')`, which resolves INTO the
 *     base directory (.../app/). A bare '/' would resolve against the ORIGIN
 *     and silently drop /app/, landing on the marketing site.
 *   - Origin-root pages (catalog.html, contribute.html, admin-submissions.html)
 *     keep absolute paths like `goto('/catalog.html')` — on this CDN those
 *     genuinely live at the origin root, so origin resolution is what they want.
 *   - PW_BASE_URL overrides still work, and a trailing slash is appended below
 *     when missing, because `new URL('./', '.../app')` (no slash) drops the
 *     last segment and would land on the origin.
 */
const rawBase = process.env.PW_BASE_URL || 'https://alloflow-cdn.pages.dev/app/';
const baseURL = rawBase.endsWith('/') ? rawBase : rawBase + '/';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 3,
  timeout: 120000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 90000,
  },
  expect: {
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results',
});
