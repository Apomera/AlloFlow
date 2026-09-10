// Render the actual built AlloFlow Store launcher with local React and Tailwind.
// Fictional address only. External requests are blocked, not forwarded.
// Run: node dev-tools/school_store_setup_ui_check.cjs
// Screenshots: scratch/school-store-setup-ui/ (no production files are written).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const webRequire = createRequire(path.join(root, 'desktop/web-app/package.json'));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const asset = (pkg, file) => fs.readFileSync(path.join(path.dirname(webRequire.resolve(pkg + '/package.json')), file), 'utf8');
const output = path.join(root, 'scratch/school-store-setup-ui');
const origin = 'http://school-store-setup.test';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actual Store launcher QA</title><link rel="stylesheet" href="/style.css"></head><body><main id="root"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/school_rewards_module.js"></script><script src="/axe.js"></script><script>
window.opened=[];window.toastMessages=[];window.nativeOpen=window.open.bind(window);
window.open=(...args)=>{opened.push(args);return {}};
const root=ReactDOM.createRoot(document.getElementById('root'));let serial=0;
window.renderPanel=(props={})=>root.render(React.createElement(window.AlloModules.SchoolRewards.SchoolRewardsPanel,{key:++serial,isOpen:true,onClose:()=>{},t:()=>null,addToast:(...args)=>toastMessages.push(args),portalUrl:'',...props}));renderPanel();
</script></body></html>`;

async function checkRecovery(page, context, width, portalUrl) {
  const control = name => page.locator('[data-help-key="schoolrewards_' + name + '"]');
  // Exercise real browser noopener behavior; the navigation is fulfilled by a
  // local fixture below, never forwarded to Google. A null proxy is not failure.
  await page.evaluate(() => { window.open = (...args) => { const result = nativeOpen(...args); window.nativeResultWasNull = result === null; return result; }; });
  const opened = context.waitForEvent('page');
  await control('open_check').click();
  const popup = await opened;
  await popup.waitForLoadState('domcontentloaded');
  assert.equal(await popup.locator('h1').innerText(), 'Fictional navigation fixture');
  assert.equal(await popup.evaluate(() => window.opener), null);
  assert.equal(await page.evaluate(() => nativeResultWasNull), true);
  assert.equal(await control('launch_fallback').getAttribute('href'), portalUrl + '?api=status');
  assert.match(await control('launch_fallback').getAttribute('rel'), /noopener/);
  assert.match(await control('launch_fallback').getAttribute('rel'), /noreferrer/);
  assert.deepEqual(await page.evaluate(() => toastMessages.filter(value => value[1] === 'error')), []);
  await popup.close();
  await page.evaluate(() => { window.open = (...args) => { opened.push(args); return {}; }; });

  const input = page.locator('#schoolrewards-portal-url');
  const nextUrl = portalUrl.replace('ONLY', 'UPDATED');
  await input.fill(nextUrl);
  await control('unsaved_address').waitFor();
  for (const name of ['open_portal', 'open_recognition', 'open_check']) assert.equal(await control(name).isDisabled(), true);
  assert.equal(await control('launch_fallback').count(), 0, 'Old-target fallback must disappear while editing');
  await page.screenshot({ path: path.join(output, width + '-unsaved-address.png') });
  await control('discard_address').click();
  assert.equal(await input.inputValue(), portalUrl);
  assert.equal(await control('open_check').isDisabled(), false);
  await input.fill('');
  await control('connect').click();
  assert.equal(await page.locator('#schoolrewards-saved-url').inputValue(), portalUrl, 'Blank Save must not disconnect');
  await control('discard_address').click();

  await control('opening_help').locator('summary').first().click();
  assert.equal(await control('troubleshooting_item').count(), 5);
  await control('troubleshooting_item').first().locator('summary').click();
  await control('opening_help').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, width + '-opening-help.png') });

  // A failed browser-storage save must be recoverable without losing the form
  // or silently claiming the checklist was persisted.
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'allo_school_rewards_setup_v1') throw new DOMException('Fictional blocked storage', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
  });
  await page.locator('[data-store-path="setup"]').click();
  await page.locator('#sr-step-approval').check();
  await control('persistence_warning').waitFor();
  assert.match(await control('persistence_warning').innerText(), /kept in this tab only/i);
  assert.equal(await page.locator('#sr-step-approval').isChecked(), true);
  await page.evaluate(() => { Storage.prototype.setItem = originalSetItem; });
  await control('retry_setup_save').click();
  await control('persistence_warning').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('allo_school_rewards_setup_v1')).steps.includes('approval')), true);
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[role="dialog"]'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => v.id));
  assert.deepEqual(violations, []);
  return { nativeNoopener: true, unsavedLaunchGuard: true, blankSavePreservesAddress: true, localHelpTopics: 5, storageRecovery: true, violations };
}

(async () => {
  const baseConfig = webRequire('./tailwind.config.js');
  const css = await webRequire('postcss')([webRequire('tailwindcss')({ ...baseConfig, content: [{ raw: read('school_rewards_source.jsx'), extension: 'jsx' }] })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const routes = new Map([
    ['/', ['text/html; charset=utf-8', html]], ['/react.js', ['text/javascript; charset=utf-8', asset('react', 'umd/react.development.js')]],
    ['/react-dom.js', ['text/javascript', asset('react-dom', 'umd/react-dom.development.js')]],
    ['/style.css', ['text/css', css.css]], ['/school_rewards_module.js', ['text/javascript', read('school_rewards_module.js')]],
    ['/axe.js', ['text/javascript', asset('axe-core', 'axe.min.js')]],
  ]);
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const width of [1180, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const blocked = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === 'https://script.google.com' && url.pathname === '/macros/s/FICTIONAL_QA_ONLY/exec') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="en"><title>Local navigation fixture</title><h1>Fictional navigation fixture</h1><p>This response is supplied locally by the test. No Google service was contacted.</p></html>' });
        if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204, body: '' });
        const value = url.origin === origin && routes.get(url.pathname);
        if (!value) { blocked.push(url.href); return route.abort(); }
        return route.fulfill({ contentType: value[0], body: value[1] });
      });
      await page.goto(origin);
      await page.locator('[data-store-path="practice"]').waitFor();
      assert.equal(await page.locator('[data-help-key="schoolrewards_copy_source"]').count(), 0);
      assert.equal(await page.locator('#schoolrewards-portal-url').count(), 0);
      const before = await page.evaluate(() => JSON.stringify(localStorage));
      await page.screenshot({ path: path.join(output, width + '-choices.png') });
      const states = [];
      for (const name of ['practice', 'join', 'setup']) {
        await page.locator('[data-store-path="' + name + '"]').click();
        if (await page.locator('#sr-local-guide').count() === 0) await page.locator('[data-help-key="schoolrewards_guide"]').click();
        await page.locator('#sr-guide-title').waitFor();
        assert.equal(await page.locator('[data-help-key="schoolrewards_copy_source"]').count(), name === 'setup' ? 4 : 0);
        assert.equal(await page.locator('#schoolrewards-portal-url').count(), name === 'practice' ? 0 : 1);
        const guideTitles = [];
        while (true) {
          guideTitles.push(await page.locator('#sr-guide-title').innerText());
          await page.locator('[data-help-key="schoolrewards_guide_section"]').click();
          const focused = await page.evaluate(() => document.activeElement.id);
          assert.ok(focused, 'Guide section target should receive keyboard focus');
          const next = page.locator('[data-help-key="schoolrewards_guide_next"]');
          if (await next.isDisabled()) break;
          await next.click();
        }
        assert.equal(guideTitles.length, name === 'practice' ? 2 : name === 'join' ? 4 : 7);
        while (!(await page.locator('[data-help-key="schoolrewards_guide_back"]').isDisabled())) await page.locator('[data-help-key="schoolrewards_guide_back"]').click();
        await page.evaluate(() => document.querySelector('[role="dialog"] > div').scrollTop = 0);
        const overflow = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]');
          const b = d.querySelector(':scope > div');
          return { document: document.documentElement.scrollWidth > innerWidth, dialog: d.scrollWidth > d.clientWidth + 1, body: b.scrollWidth > b.clientWidth + 1 };
        });
        assert.deepEqual(overflow, { document: false, dialog: false, body: false }, name + ' should fit width ' + width);
        const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[role="dialog"]'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations.filter(v => ['serious','critical'].includes(v.impact)), [], name + ' accessibility');
        await page.screenshot({ path: path.join(output, width + '-' + name + '.png') });
        states.push({ name, steps: guideTitles.length, overflow, violations });
      }
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), before, 'Guidance must not save setup progress or an address');
      assert.equal(await page.evaluate(() => opened.length), 0, 'Guidance must not open remote setup or authorization');
      assert.deepEqual(blocked, [], 'No source files or remote services should be requested by navigation');
      const portalUrl = 'https://script.google.com/macros/s/FICTIONAL_QA_ONLY/exec';
      await page.evaluate(url => renderPanel({ portalUrl: url }), portalUrl);
      await page.locator('[data-store-path="join"][aria-pressed="true"]').waitFor();
      assert.match(await page.locator('[data-help-key="schoolrewards_status"]').innerText(), /address saved/i);
      assert.equal(await page.locator('[data-help-key="schoolrewards_copy_source"]').count(), 0);
      await page.locator('[data-help-key="schoolrewards_open_check"]').click();
      assert.equal(await page.evaluate(() => opened.length), 1);
      assert.deepEqual(await page.evaluate(() => opened[0]), [portalUrl + '?api=status', '_blank', 'noopener,noreferrer']);
      const recovery = await checkRecovery(page, context, width, portalUrl);
      assert.deepEqual(errors, []);
      assert.deepEqual(blocked, []);
      report.push({ width, states, blocked, errors, savedAddressDefaultsToJoin: true, recovery });
      await context.close();
    }
    console.log(JSON.stringify({ ok: true, output, report }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
