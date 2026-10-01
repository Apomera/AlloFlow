import { test, expect } from '@playwright/test';

/**
 * Public static pages bundled with the deploy.
 */
test.describe('Public bundled pages', () => {
  test('catalog.html loads', async ({ page }) => {
    const resp = await page.goto('/catalog.html');
    expect(resp?.ok(), 'catalog.html should return 2xx').toBeTruthy();
    await page.waitForLoadState('domcontentloaded');
    expect((await page.content()).length).toBeGreaterThan(500);
  });

  test('contribute.html loads', async ({ page }) => {
    const resp = await page.goto('/contribute.html');
    expect(resp?.ok()).toBeTruthy();
    await page.waitForLoadState('domcontentloaded');
    expect((await page.content()).length).toBeGreaterThan(500);
  });

  test('admin-submissions.html loads (may require auth)', async ({ page }) => {
    const resp = await page.goto('/admin-submissions.html');
    // Could be 200 with auth gate or 401/403 — both acceptable as "page exists"
    const status = resp?.status() || 0;
    expect([200, 301, 302, 401, 403]).toContain(status);
  });
});

test.describe('Critical CDN modules respond OK', () => {
  const CDN_URLS = [
    'https://alloflow-cdn.pages.dev/stem_lab/stem_lab_module.js',
    'https://alloflow-cdn.pages.dev/sel_hub/sel_hub_module.js',
    'https://alloflow-cdn.pages.dev/allohaven_module.js',
    'https://alloflow-cdn.pages.dev/story_forge_module.js',
    'https://alloflow-cdn.pages.dev/view_learning_hub_modal_module.js',
  ];

  for (const url of CDN_URLS) {
    const name = url.split('/').pop()!.replace('.js', '');
    test(`CDN module reachable: ${name}`, async ({ request }) => {
      const resp = await request.get(url);
      expect(resp.ok(), `Failed to fetch ${url} (${resp.status()})`).toBeTruthy();
      const ct = resp.headers()['content-type'] || '';
      expect(/javascript|application\/octet/i.test(ct), `Wrong content-type: ${ct}`).toBeTruthy();
      const body = await resp.text();
      expect(body.length).toBeGreaterThan(100);
    });
  }
});
