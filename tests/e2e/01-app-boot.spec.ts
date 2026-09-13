import { test, expect } from '@playwright/test';

test.describe('App boot + initial state', () => {
  test('main page loads with expected title', async ({ page }) => {
    await page.goto('./');
    // The APP title, not just /AlloFlow/: the marketing site at the origin root
    // is titled "AlloFlow | Open Tools…", so the loose match passed even when a
    // path-less base landed the suite on the wrong page. This assertion is the
    // sentinel for that failure mode — if base resolution ever drops /app/
    // again, this fails by name instead of the whole suite failing obscurely.
    await expect(page).toHaveTitle(/Adaptive UDL Platform/);
  });

  test('main app root mounts within 30s', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });
    expect((await page.content()).length).toBeGreaterThan(5000);
  });

  test('boot completes without critical pageerrors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('./');
    await page.waitForTimeout(5000);
    expect(pageErrors).toHaveLength(0);
  });

  test('console errors stay below threshold (filtered)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // Known noise: third-party CDNs, Firestore offline, deprecated APIs
      if (/firestore|firebase|workbox|favicon|googletagmanager|tracking|GA_|chrome-extension|error_reporter_module|cdn\.jsdelivr.*403/i.test(t)) return;
      errors.push(t.slice(0, 200));
    });
    await page.goto('./');
    await page.waitForTimeout(5000);
    expect(errors.length, `Console errors:\n${errors.slice(0, 5).join('\n')}`).toBeLessThan(8);
  });

  test('Skip to Content link exists (a11y)', async ({ page }) => {
    await page.goto('./');
    const skipLink = page.locator('text=/Skip to Content/i').first();
    await expect(skipLink).toBeVisible({ timeout: 10000 });
  });

  test('service worker is registered', async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(3000);
    const swActive = await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null);
    // SW activates on second visit; first visit registers
    // So we only check that the registration code ran
    const swRegistered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(swRegistered).toBeTruthy();
  });

  // 2026-09-13: with the worker ACTIVE, a second navigation in the same tab
  // failed with net::ERR_FAILED (a plain reload included) because the precached
  // shell was a redirected response (Pages 308s /app/index.html to /app/). Every
  // other spec navigates once in a fresh context, so none of them could see it.
  // This one waits for the worker to take control and then reloads, twice.
  test('a reload with the service worker active still loads (second navigation in one tab)', async ({ page }) => {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && reg.active);
    }, null, { timeout: 60000 });
    // Give the install step time to finish its precache before the reload.
    await page.waitForTimeout(4000);
    for (let i = 0; i < 2; i++) {
      let failure: string | null = null;
      try { await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e: any) { failure = String(e && e.message).split('\n')[0]; }
      expect(failure, `reload ${i + 1} with the worker active`).toBeNull();
      await expect(page).toHaveTitle(/Adaptive UDL Platform/);
    }
    const shell = await page.evaluate(async () => {
      const url = new URL('./index.html', location.href).toString();
      for (const k of await caches.keys()) { const r = await (await caches.open(k)).match(url); if (r) return { redirected: r.redirected, status: r.status }; }
      return null;
    });
    expect(shell, 'the shell is precached').not.toBeNull();
    expect(shell!.redirected, 'a redirected response must never be the cached shell').toBe(false);
  });
});
