// Additional synthetic viewport and overlay checks. No real mobile keyboard or AT.
const fs = require('fs'), path = require('path');
module.exports = async function checkReaderOverlays(page, render, out) {
  page.setDefaultTimeout(5000);
  const checks = [];
  async function check(name, task) {
    try { await task(); checks.push({ name, passed: true }); }
    catch (error) {
      checks.push({ name, passed: false, error: error.message });
      await page.screenshot({ path: path.join(out, name + '.png') });
    }
  }
  async function focusedVisible() {
    return page.evaluate(() => {
      const el = document.activeElement;
      return [...el.getClientRects()].some(r => {
        if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
        const hit = document.elementFromPoint((Math.max(0, r.left) + Math.min(innerWidth - 1, r.right)) / 2, (Math.max(0, r.top) + Math.min(innerHeight - 1, r.bottom)) / 2);
        return el === hit || el.contains(hit);
      });
    });
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await check('touch-selection-close', async () => {
    await render({ teacher: true, mode: 'revise', selectionMenu: { text: 'Plants grow.', x: 315, y: 620 }, isCustomReviseOpen: true });
    await page.locator('[data-selection-close]').tap();
    await page.locator('[data-selection-close]').waitFor({ state: 'detached' });
  });
  await check('visual-viewport-keyboard-and-pan', async () => {
    await page.evaluate(() => {
      window.nativeViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
      const viewport = new EventTarget();
      Object.assign(viewport, { width: 320, height: 640, offsetTop: 0, offsetLeft: 0 });
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    });
    try {
      await render({ teacher: true, mode: 'revise', selectionMenu: { text: 'Plants grow.', x: 315, y: 620 }, isCustomReviseOpen: true });
      const input = page.locator('[role=dialog] input[type=text]');
      await input.fill('Use shorter sentences');
      for (const viewport of [{ width: 320, height: 220, offsetTop: 0, offsetLeft: 0 }, { width: 280, height: 260, offsetTop: 90, offsetLeft: 20 }]) {
        await page.evaluate(v => { Object.assign(visualViewport, v); visualViewport.dispatchEvent(new Event('resize')); visualViewport.dispatchEvent(new Event('scroll')); }, viewport);
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const bounds = await page.locator('[data-selection-close]').locator('..').boundingBox();
        if (!bounds || bounds.x < viewport.offsetLeft || bounds.y < viewport.offsetTop || bounds.x + bounds.width > viewport.offsetLeft + viewport.width + 1 || bounds.y + bounds.height > viewport.offsetTop + viewport.height + 1) throw Error('Popup outside synthetic visual viewport: ' + JSON.stringify({ bounds, viewport }));
        if (await input.inputValue() !== 'Use shorter sentences') throw Error('Viewport change lost the instruction');
      }
    } finally {
      await page.evaluate(() => { Object.defineProperty(window, 'visualViewport', window.nativeViewportDescriptor); delete window.nativeViewportDescriptor; });
    }
  });
  const routes = [
    ['focus', 'immersive_focus_mode', 'focus-reader-dialog-title'],
    ['crawl', 'immersive_perspective_crawl', 'perspective-crawl-dialog-title'],
    ['karaoke', 'immersive_karaoke_overlay', 'karaoke-reader-dialog-title'],
  ];
  for (const [name, help, title] of routes) {
    await check(name + '-keyboard-loop', async () => {
      await page.setViewportSize({ width: 320, height: 640 });
      await render({ immersive: true });
      const trigger = page.locator('[data-help-key="' + help + '"]');
      await trigger.click();
      const dialog = page.locator('[role=dialog][aria-labelledby="' + title + '"]');
      await dialog.waitFor();
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        if (!await dialog.evaluate(el => el.contains(document.activeElement))) throw Error('Tab escaped the active dialog');
        if (!await focusedVisible()) throw Error('Tab focus is obscured: ' + await page.evaluate(() => document.activeElement.outerHTML.slice(0, 250)));
      }
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
      if (!await trigger.evaluate(el => el === document.activeElement)) throw Error('Escape did not restore the opener');
      if (await page.locator('[data-immersive-toolbar]').count() !== 1) throw Error('Escape also closed the parent');
    });
    for (const appearance of ['short', 'double-text', 'forced-colors', ...(name === 'crawl' ? [] : ['dark', 'sepia'])]) {
      await check(name + '-' + appearance, async () => {
        await page.setViewportSize({ width: 320, height: appearance === 'short' ? 256 : 640 });
        await page.emulateMedia({ forcedColors: appearance === 'forced-colors' ? 'active' : 'none', reducedMotion: 'reduce' });
        await render({ immersive: true });
        await page.locator('[data-help-key="' + help + '"]').click();
        const dialog = page.locator('[role=dialog][aria-labelledby="' + title + '"]');
        await dialog.waitFor();
        if (appearance === 'dark' || appearance === 'sepia') await dialog.locator('select[aria-label="Theme"]').selectOption(appearance);
        if (appearance === 'double-text') await dialog.evaluate(el => {
          const sizes = [...el.querySelectorAll('*')].map(n => [n, parseFloat(getComputedStyle(n).fontSize)]);
          for (const [node, size] of sizes) node.style.setProperty('font-size', size * 2 + 'px', 'important');
        });
        const size = await dialog.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
        if (size.scroll > size.client + 2) throw Error('Horizontal overflow: ' + JSON.stringify(size));
        if (name === 'crawl' && await dialog.locator('[data-help-key="perspective_crawl_play_pause_btn"]').getAttribute('aria-label') !== 'Play') throw Error('Crawl started playing under reduced motion');
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press('Tab');
          if (!await focusedVisible()) throw Error('Focus is obscured: ' + await page.evaluate(() => document.activeElement.outerHTML.slice(0, 250)));
        }
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
      });
    }
  }
  for (const chunk of [false, true]) for (const doubled of [false, true]) {
    await check((chunk ? 'chunk' : 'immersive') + (doubled ? '-double-text' : '-short'), async () => {
      await page.setViewportSize({ width: 320, height: doubled ? 640 : 256 });
      await render({ immersive: true });
      if (chunk) await page.locator('[data-help-key="immersive_chunk_reader"]').click();
      const dialog = page.locator('[data-immersive-toolbar]').locator('..');
      if (doubled) await dialog.evaluate(el => {
        const sizes = [...el.querySelectorAll('*')].map(n => [n, parseFloat(getComputedStyle(n).fontSize)]);
        for (const [node, size] of sizes) node.style.setProperty('font-size', size * 2 + 'px', 'important');
      });
      const size = await dialog.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
      if (size.scroll > size.client + 2) throw Error('Horizontal overflow: ' + JSON.stringify(size));
      const close = page.locator('[data-immersive-toolbar] button[aria-label]').first();
      await close.focus();
      const closeBox = await close.boundingBox();
      if (!closeBox || closeBox.x < 0 || closeBox.x + closeBox.width > 320 || !await focusedVisible()) throw Error('Immersive Close is obscured');
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('Tab');
        if (!await dialog.evaluate(el => el.contains(document.activeElement))) throw Error('Tab escaped Immersive Reader');
        if (!await focusedVisible()) throw Error('Focus is obscured: ' + await page.evaluate(() => document.activeElement.outerHTML.slice(0, 250)));
      }
    });
  }
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  fs.writeFileSync(path.join(out, 'overlay-results.json'), JSON.stringify({ browser: page.context().browser().version(), checks, limits: 'Synthetic viewport events, simulated doubled text and Chromium only; no real mobile keyboard or screen-reader verification.' }, null, 2));
  const failures = checks.filter(x => !x.passed);
  if (failures.length) throw Error(failures.map(x => x.name + ': ' + x.error).join('\n'));
  return checks;
};
