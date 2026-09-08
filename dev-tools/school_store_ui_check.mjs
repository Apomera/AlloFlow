import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';
const require = createRequire(import.meta.url);
const out = new URL('../reports/school-store-ui-review-2026-09-07/', import.meta.url);
await mkdir(out, { recursive: true });
const { server, url } = await createDemoServer();
const browser = await chromium.launch({ headless: true });
const report = { interactions: [], views: {}, errors: [] };
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  async function open(role) {
    await page.goto(url + '/?role=' + role);
    await page.waitForFunction(r => document.getElementById('actor-pill').textContent === r.toUpperCase(), role);
    await page.locator('#tab-store').click();
    await page.waitForFunction(() => !document.getElementById('notice').classList.contains('busy'));
  }
  const cards = () => page.locator('#store-catalog .prize');
  const titles = () => page.locator('#store-catalog h3').allTextContents();
  const active = () => page.evaluate(() => ({ id: document.activeElement.id, label: document.activeElement.getAttribute('aria-label'), pressed: document.activeElement.getAttribute('aria-pressed') }));
  await open('student');
  assert.equal(await cards().count(), 6);
  assert.equal(await page.locator('#store-catalog [data-add]').count(), 0);
  const widths = await page.evaluate(() => ({ catalog: document.querySelector('#store-catalog-card').getBoundingClientRect().width, shell: document.querySelector('.shell').clientWidth }));
  assert.ok(widths.catalog > widths.shell * .9);
  await page.evaluate(() => { window.walletChanges = 0; new MutationObserver(() => window.walletChanges++).observe(document.getElementById('store-wallet'), { childList: true, subtree: true, characterData: true }); });
  await page.locator('#catalog-search').fill('sketch');
  assert.equal(await page.evaluate(() => window.walletChanges), 0, 'Searching should not repeat the balance announcement');
  assert.deepEqual(await titles(), ['Sketching set']);
  await page.locator('#catalog-search').fill('<img src=x onerror=alert(1)>');
  assert.equal(await cards().count(), 0);
  assert.ok((await page.locator('#store-catalog').innerText()).includes('No rewards match'));
  await page.locator('#catalog-clear').focus(); await page.keyboard.press('Enter');
  assert.equal((await active()).id, 'catalog-search');
  await page.locator('#catalog-sort').selectOption('cost-low');
  assert.deepEqual(await titles(), ['Sticker pack', 'Notebook', 'Puzzle pack', 'Sketching set', 'Creative studio time', 'Art supply bundle']);
  await page.locator('#catalog-affordable').check(); assert.equal(await cards().count(), 5);
  await page.locator('#catalog-in-stock').check(); assert.equal(await cards().count(), 4);
  await page.locator('#catalog-clear').click();
  report.interactions.push('Search, escaping, empty state, sorting, affordability, stock, clear-filter focus');
  await page.getByRole('button', { name: 'Save for Art supply bundle', exact: true }).focus(); await page.keyboard.press('Space');
  assert.equal((await active()).label, 'Stop saving for Art supply bundle');
  assert.equal((await active()).pressed, 'true');
  assert.ok((await page.locator('#store-goal').innerText()).includes('30 more points'));
  assert.equal(await page.locator('#store-goal progress').getAttribute('value'), '60');
  await page.getByRole('button', { name: 'Save for Puzzle pack', exact: true }).click();
  assert.ok((await page.locator('#store-goal').innerText()).includes('Currently sold out'));
  await page.getByRole('button', { name: 'Save for Art supply bundle', exact: true }).click();
  report.interactions.push('Saving progress, sold-out explanation, keyboard focus retained after goal change');
  async function audit(name, width, media = {}, height = 844) {
    await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference', forcedColors: 'none', reducedMotion: 'reduce', ...media });
    await page.setViewportSize({ width, height });
    if (await page.locator('#catalog-search').isVisible()) await page.locator('#catalog-search').focus();
    await page.screenshot({ path: new URL(name + '.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
    if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const result = await page.evaluate(async () => {
      const a = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return { violations: a.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: a.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), width: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    // Axe cannot resolve layered gradients. Check the actual CSS colors over
    // 101 evenly spaced gradient samples, compositing the wallet background.
    result.gradientContrast = await page.evaluate(() => {
      const hero = document.querySelector('.store-intro');
      if (!hero || !hero.offsetWidth) return [];
      const parse = value => (value.match(/[\d.]+/g) || []).map(Number);
      const stops = (getComputedStyle(hero).backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse);
      if (stops.length !== 2) return [];
      const lum = color => color.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      return ['.store-intro > div > .eyebrow', '#store-welcome-title', '#store-welcome-copy', '.wallet-label', '.wallet-value', '.wallet-value small', '.wallet-note'].flatMap(selector => {
        const node = hero.querySelector(selector); if (!node || !node.getBoundingClientRect().width) return [];
        const foreground = lum(parse(getComputedStyle(node).color));
        const wallet = node.closest('.store-wallet'), overlay = wallet ? parse(getComputedStyle(wallet).backgroundColor) : null;
        let minimumRatio = Infinity;
        for (let i = 0; i <= 100; i++) {
          let background = stops[0].map((v, k) => v + (stops[1][k] - v) * i / 100);
          if (overlay) { const alpha = overlay[3] ?? 1; background = background.map((v, k) => v * (1 - alpha) + overlay[k] * alpha); }
          const back = lum(background), ratio = (Math.max(foreground, back) + .05) / (Math.min(foreground, back) + .05);
          minimumRatio = Math.min(minimumRatio, ratio);
        }
        return [{ selector, minimumRatio }];
      });
    });
    for (const sample of result.gradientContrast) assert.ok(sample.minimumRatio >= 4.5, name + ': gradient text contrast for ' + sample.selector);
    report.views[name] = result;
    assert.ok(result.width <= result.viewport + 1, name + ': horizontal overflow');
    assert.deepEqual(result.violations, [], name + ': accessibility');
  }
  await audit('student-desktop', 1440, {}, 1000);
  await audit('student-mobile', 390);
  await page.getByRole('button', { name: 'Save for Puzzle pack', exact: true }).focus();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  const focusBox = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(), nav = document.querySelector('nav.tabs').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, navTop: nav.top }; });
  assert.ok(focusBox.top >= 0 && focusBox.bottom <= focusBox.navTop, 'Keyboard focus must be visible above mobile navigation');
  report.interactions.push('Mobile goal keyboard focus stays above fixed navigation; search does not repeat wallet announcements');
  await audit('student-dark', 390, { colorScheme: 'dark' });
  await audit('student-high-contrast', 390, { contrast: 'more' });
  await audit('student-forced-colors', 390, { forcedColors: 'active' });
  await audit('student-narrow', 320);
  await audit('student-short-viewport', 640, {}, 360);
  assert.equal(await page.locator('nav.tabs').evaluate(el => getComputedStyle(el).position), 'static');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#lang-select').selectOption('es');
  await page.waitForFunction(() => document.getElementById('store-welcome-title').textContent === 'Descubre tu próximo premio');
  assert.equal(await page.locator('#catalog-clear').innerText(), 'Quitar filtros');
  assert.equal(await page.locator('#store-goal progress').getAttribute('aria-valuetext'), '60 de 90 puntos disponibles');
  assert.ok((await page.locator('#store-goal').textContent()).includes('Tu meta de ahorro'));
  await page.screenshot({ path: new URL('student-spanish.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  assert.equal(await page.locator('#catalog-results').innerText(), 'Se muestran 6 de 6 premios');
  await page.locator('#catalog-search').fill('sketch');
  assert.equal(await page.locator('#catalog-results').innerText(), 'Se muestran 1 de 6 premios');
  await page.locator('#lang-select').selectOption('en');
  assert.equal(await page.locator('#catalog-results').innerText(), '1 of 6 rewards shown');
  await page.locator('#catalog-clear').click();
  report.interactions.push('Spanish control and saving-goal labels; short viewport navigation stays in flow');
  await page.locator('#catalog-affordable').check(); assert.equal(await cards().count(), 5);
  await page.evaluate(async () => {
    async function rpc(role, name, argument) { const r = await fetch('/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, name, argument }) }); const out = await r.json(); if (!out.ok) throw Error(out.error); return out.result; }
    const boot = await rpc('staff', 'getSchoolRewardsBootstrap');
    await rpc('staff', 'awardSchoolRewardsPoints', { studentId: boot.students[0].id, categoryId: boot.categories[0].id, amount: 40, reason: 'Fictional UI refresh check', idempotencyKey: 'ui_live_refresh' });
  });
  await page.locator('#refresh-store-live').click();
  await page.waitForFunction(() => document.querySelector('#store-wallet .wallet-value').textContent.startsWith('100'));
  assert.equal(await cards().count(), 6);
  report.interactions.push('Live balance refresh updates the wallet, saving goal, and affordability filter');
  await page.locator('#tab-dashboard').click();
  await audit('student-overview', 390);
  await open('cashier');
  await page.locator('#checkout-student').selectOption({ index: 1 });
  const addNotebook = () => page.getByRole('button', { name: 'Add Notebook to cart', exact: true });
  await addNotebook().click();
  await page.getByRole('button', { name: 'Add one more Notebook', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal((await active()).label, 'Add one more Notebook');
  assert.equal(await page.locator('#cart-total').innerText(), '20 points');
  await page.getByRole('button', { name: 'Remove one Notebook', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal((await active()).label, 'Remove one Notebook');
  assert.equal(await page.locator('#cart-total').innerText(), '10 points');
  await page.keyboard.press('Enter');
  assert.equal((await active()).label, 'Add Notebook to cart');
  assert.equal(await page.locator('#cart-total').innerText(), '0 points');
  await addNotebook().click();
  await page.locator('#catalog-search').fill('sticker');
  assert.equal(await page.locator('#cart-total').innerText(), '10 points');
  assert.deepEqual(await titles(), ['Sticker pack']);
  await page.locator('#catalog-clear').click();
  report.interactions.push('Cashier keyboard quantities retain focus; final removal restores catalog focus; filters preserve the cart');
  await audit('cashier-desktop', 1440, {}, 1000);
  await audit('cashier-mobile', 390);
  const tiny = await page.locator('#panel-store button:not([disabled]), #panel-store .catalog-check, #panel-store input:not([type=checkbox]), #panel-store select').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().width > 0).map(n => ({ label: n.getAttribute('aria-label') || n.id || n.textContent, width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })).filter(n => n.height < 44 || n.width < 24));
  assert.deepEqual(tiny, []);
  report.interactions.push('Store controls have at least 44px height and 24px width');
  await open('staff');
  assert.equal(await page.locator('#store-wallet').isVisible(), false);
  assert.equal(await page.locator('#store-welcome-copy').innerText(), 'Help learners find a meaningful reward.');
  await audit('staff-store', 1440, {}, 1000);
  report.interactions.push('Staff browsing hides register-only guidance; shared overview cards remain accessible');
  assert.deepEqual(report.errors, []); report.ok = true;
} catch (error) {
  report.failure = error.stack;
  if (page) await writeFile(new URL('failure.txt', out), error.stack + '\n\n' + await page.locator('body').innerText());
  throw error;
} finally {
  await writeFile(new URL('browser-results.json', out), JSON.stringify(report, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
console.log('School store UI checks passed.');
