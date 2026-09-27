const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(); const page = await context.newPage();
  const results = [], errors = []; page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => route.abort());
  try {
    await page.setContent('<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'generation_helpers_module.js', 'view_simplified_module.js', 'tests/track07-browser-fixture.js']) await page.addScriptTag({ path: path.join(root, file) });
    const mount = async options => { await page.evaluate(options => mountReading(options), options); await expect(page.locator('[data-adapt-keep-terms]')).toBeVisible(); };
    const check = async (name, fn) => { try { await fn(); results.push({ name, status: 'passed' }); console.log('PASS ' + name); } catch (error) { results.push({ name, status: 'failed', error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); } };
    const tick = String.fromCharCode(96), literal = 'Herons are ' + tick + 'wading<!--example--> birds' + tick + '.';
    await check('a displayed literal mismatch is rejected before generation', async () => {
      await mount({ source: literal });
      await expect(page.locator('[data-reading-passage]')).toContainText('wading<!--example--> birds');
      await page.locator('[data-adapt-keep-terms]').fill('wading birds');
      await expect(page.locator('[data-apply-complexity]')).toBeDisabled();
      await expect(page.getByText('“wading birds”: not found exactly. Check spelling and case.')).toBeVisible();
      assert.equal(await page.evaluate(() => fixture.requests.length), 0);
    });
    await check('a candidate cannot hide a missing phrase in literal code', async () => {
      await mount({ candidate: literal }); await page.locator('[data-adapt-keep-terms]').fill('wading birds');
      await page.locator('[data-apply-complexity]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing: “wading birds”');
      await expect(page.locator('[data-adaptation-apply]')).toHaveCount(0);
      assert.equal(await page.evaluate(() => fixture.state.current.data), await page.evaluate(() => fixture.initial.data));
    });
    await check('Apply rechecks a literal mismatch and never acknowledges a save', async () => {
      await mount({}); await page.locator('[data-adapt-keep-terms]').fill('wading birds'); await page.locator('[data-apply-complexity]').click();
      await expect(page.locator('[data-adaptation-apply]')).toBeVisible();
      await page.evaluate(data => { fixture.preview.data = data; }, literal); await page.locator('[data-adaptation-apply]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing: “wading birds”');
      assert.equal(await page.evaluate(() => fixture.state.current.data), await page.evaluate(() => fixture.initial.data));
      assert.equal(await page.evaluate(() => fixture.toasts.filter(t => t.tone === 'success').length), 0);
    });
    await check('the actual literal phrase survives preview and acknowledged Apply', async () => {
      await mount({ source: literal, candidate: literal }); await page.locator('[data-adapt-keep-terms]').fill('wading<!--example--> birds');
      await page.locator('[data-apply-complexity]').click(); await page.locator('[data-adaptation-apply]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('Change applied');
      await expect(page.locator('[data-reading-passage]')).toContainText('wading<!--example--> birds');
      assert.equal(await page.evaluate(() => fixture.state.current.data), literal);
    });
    await check('shorter inner fences do not expose payload terms', async () => {
      const candidate = 'Other reading.\n' + tick.repeat(4) + '\n' + tick.repeat(3) + '\nwading birds\n' + tick.repeat(3) + '\n' + tick.repeat(4);
      await mount({ candidate }); await page.locator('[data-adapt-keep-terms]').fill('wading birds'); await page.locator('[data-apply-complexity]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing: “wading birds”');
      assert.equal(await page.evaluate(() => fixture.state.current.data), await page.evaluate(() => fixture.initial.data));
    });
    await check('translated feedback keeps literal placeholders and dollar signs', async () => {
      const catalog = JSON.parse(fs.readFileSync(path.join(root, 'lang/spanish_castilian.js'), 'utf8'));
      const terms = ['{terms}', '{constructor}', '{__proto__}', '$& and $$'];
      const result = await page.evaluate(({ catalog, terms }) => {
        const t = (key, params = {}) => { const value = key.split('.').reduce((obj, part) => obj?.[part], catalog); return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(params, name) ? params[name] : match) : key; };
        return AlloModules.GenerationHelpers.preservedVocabulary.feedback({ missingTerms: terms.map(term => ({ term, pane: 'primary' })) }, t);
      }, { catalog, terms });
      for (const term of terms) assert.ok(result.includes('“' + term + '”'), result);
      assert.ok(!result.includes('[native code]') && !result.includes('[object Object]'));
    });
    assert.deepEqual(errors, []);
  } catch (error) { results.push({ name: 'browser harness', status: 'failed', error: error.stack }); }
  finally { fs.writeFileSync(path.join(root, 'track07-literal-browser-results.json'), JSON.stringify({ results, errors }, null, 2)); await browser.close(); }
  if (errors.length || results.some(result => result.status !== 'passed')) process.exitCode = 1;
})();
