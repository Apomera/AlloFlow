import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/** Repo root, from tests/e2e/mobile. */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Serve the CDN modules from the working tree.
 *
 * The React shell is local (App.jsx, index.css compile into the dev bundle),
 * but every extracted module is loaded from
 * `https://alloflow-cdn.pages.dev/<name>.js?v=<hash>` — the **deployed** CDN.
 * Without this route, a local fix to any `*_module.js` is invisible to the
 * running app and the suite silently tests shipped code instead of your edit.
 *
 * The CDN mirrors the repo-root compiled modules, so the mapping is a straight
 * path join with the version query stripped. Anything missing locally falls
 * through to the network rather than 404ing the app.
 */
export async function routeCdnToWorkingTree(page: Page): Promise<void> {
  await page.route('https://alloflow-cdn.pages.dev/**', async (route) => {
    const url = new URL(route.request().url());
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const local = path.join(REPO_ROOT, rel);

    if (!local.startsWith(REPO_ROOT) || !fs.existsSync(local) || !fs.statSync(local).isFile()) {
      await route.fallback();
      return;
    }
    const ext = path.extname(local).toLowerCase();
    const type = ext === '.js' ? 'text/javascript; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.json' ? 'application/json; charset=utf-8'
      : 'application/octet-stream';
    await route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(local) });
  });
}

/** The launch pad ("Choose how to use AlloFlow") that gates first run. */
export const LAUNCH_PAD = '.lp-root';

const MODE_PATTERN: Record<string, RegExp> = {
  learning: /learning tools/i,
  full: /full platform/i,
  educator: /educator/i,
};

/**
 * Boot AlloFlow on a touch device and get past the first-run gates.
 *
 * Selectors here were read off the running app, not guessed: the launch-pad
 * cards are `button.lp-card` with no aria-label (so getByRole name matching
 * does not find them), and the mic card's skip control is named
 * "Skip microphone setup" by aria-label rather than by its "Skip for Now" text.
 *
 * Waits are on elements rather than timers: WebKit boots this app measurably
 * slower than Chromium, and a fixed sleep that passes on Chromium reports a
 * phantom "launch pad missing" on iOS.
 */
export async function bootMobile(
  page: Page,
  mode: 'learning' | 'full' | 'educator' = 'learning',
): Promise<void> {
  await routeCdnToWorkingTree(page);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // The CRA loader hides itself once React mounts into #root.
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return !!root && root.children.length > 0;
    },
    null,
    { timeout: 90000 },
  );

  const pad = page.locator(LAUNCH_PAD);
  const appeared = await pad
    .waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(() => false);

  if (appeared) {
    // First-run microphone card. Skipping keeps the run deterministic and
    // avoids a native permission prompt Playwright cannot dismiss.
    const skipMic = page.getByRole('button', { name: /skip microphone setup/i }).first();
    if (await skipMic.isVisible().catch(() => false)) {
      await skipMic.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // The card grid overflows the fixed-height pad, which scrolls internally.
    const card = page.locator('.lp-card').filter({ hasText: MODE_PATTERN[mode] }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click({ timeout: 20000 });
    await pad.waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  }

  // Choosing a pathway lands on its hub, not on a bare workspace: picking
  // "Learning Tools" opens the Learning Tools dialog straight over the
  // workspace. So readiness is "a hub dialog OR the source textbox", and
  // waiting only for the textbox hangs for the full timeout on every device.
  await Promise.race([
    page.locator(HUB_DIALOG).first().waitFor({ state: 'visible', timeout: 60000 }),
    page
      .getByRole('textbox', { name: /Source material input/i })
      .first()
      .waitFor({ state: 'visible', timeout: 60000 }),
  ]).catch(() => {});

  await dismissOverlays(page);
}

/** Any open modal dialog. */
export const HUB_DIALOG = '[role="dialog"], [aria-modal="true"]';

/**
 * Close the hub that boot leaves open, to get at the workspace behind it.
 * Its close control is named by aria-label ("Close learning hub"), not text.
 */
export async function closeOpenHub(page: Page): Promise<void> {
  const dialog = page.locator(HUB_DIALOG).last();
  if (!(await dialog.isVisible().catch(() => false))) return;

  const close = page.getByRole('button', { name: /^close /i }).last();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
  } else {
    await page.keyboard.press('Escape');
  }
  await page.locator(HUB_DIALOG).first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** Close tutorial/tour overlays that would otherwise sit over every assertion. */
export async function dismissOverlays(page: Page): Promise<void> {
  for (const name of [/got it/i, /skip tour/i, /skip/i, /dismiss/i, /no thanks/i]) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

/** Settle layout after a viewport/orientation change or a modal transition. */
export async function settle(page: Page, ms = 700): Promise<void> {
  await page.waitForTimeout(ms);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
}

/** Collect console errors for the life of the page. Call before goto. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 300)));
  return errors;
}

/**
 * Errors that are environmental rather than product defects: the dev server
 * has no API keys and no service worker, and this machine cannot reach the
 * third-party CDNs the app pulls at runtime.
 *
 * Note the drag-drop-touch entry. That script is the polyfill that makes HTML5
 * drag-and-drop work under touch, and it is loaded from jsdelivr. It cannot
 * load here, so **this suite does not cover touch drag-and-drop** — treat any
 * drag interaction as untested rather than as passing.
 */
export const IGNORABLE_CONSOLE = [
  /favicon/i,
  /service worker/i,
  /sw\.js/i,
  /Failed to load resource.*40[34]/i,
  /Failed to load resource/i,
  /Could not resolve hostname/i,
  /Refused to execute.*(jsdelivr|unpkg)/i,
  /net::ERR_/i,
  /API key/i,
  /Gemini/i,
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /caniuse-lite/i,
];

export function realErrors(errors: string[]): string[] {
  return errors.filter((e) => !IGNORABLE_CONSOLE.some((re) => re.test(e)));
}
