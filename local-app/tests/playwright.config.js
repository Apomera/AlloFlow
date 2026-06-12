// @ts-check
/**
 * Playwright config — AlloFlow Local App E2E tests
 *
 * Tests assume the static server (port 3730) and SQLite backend (port 3747) are
 * already running.  The test orchestrator (scripts/test_local_app.js) starts
 * both servers before invoking Playwright.
 *
 * Override ports via env vars:
 *   ALLOFLOW_APP_PORT     (default 3730)
 *   ALLOFLOW_BACKEND_PORT (default 3747)
 *   ALLOFLOW_AI_PORT      (default 1234)
 */
const { defineConfig, devices } = require('@playwright/test');

const APP_PORT     = process.env.ALLOFLOW_APP_PORT     || '3730';
const BACKEND_PORT = process.env.ALLOFLOW_BACKEND_PORT || '3747';
const AI_PORT      = process.env.ALLOFLOW_AI_PORT      || '1234';

module.exports = defineConfig({
    // Test files
    testDir:         '.',   // relative to this config file (local-app/tests/)
    testMatch:       '**/*.spec.js',
    outputDir:       '../test-results/playwright-artifacts',
    snapshotDir:     '../test-results/snapshots',

    // Timeout per test
    timeout: 60_000,
    expect: { timeout: 15_000 },

    // Reporter
    reporter: [
        ['list'],
        ['html', { outputFolder: '../test-results/playwright-report', open: 'never' }],
    ],

    // Don't run in parallel — app state is shared
    fullyParallel: false,
    workers:        1,

    // Global setup
    use: {
        baseURL:     `http://127.0.0.1:${APP_PORT}`,
        headless:    true,
        viewport:    { width: 1280, height: 900 },
        screenshot:  'only-on-failure',
        video:       'retain-on-failure',
        trace:       'retain-on-failure',

        // Inject port config into browser context
        extraHTTPHeaders: {},
        storageState: undefined,
    },

    // Export port values so spec files can read them
    globalSetup:    undefined,

    projects: [
        {
            name:  'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Pass ports to tests via env
    env: {
        ALLOFLOW_APP_PORT:     APP_PORT,
        ALLOFLOW_BACKEND_PORT: BACKEND_PORT,
        ALLOFLOW_AI_PORT:      AI_PORT,
    },
});
