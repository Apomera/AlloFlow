// Local component integration check using the shipped generated modules and built CSS.
// This verifies the delivery dialog, not full-app routing, network delivery, or a deployment.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const edgeMode = process.argv.includes('--edge');
const beforePolicy = process.argv.includes('--before-policy');
const policyMode = process.argv.includes('--policy') || beforePolicy;
const modules = ['instructional_context_module.js', 'shared_activity_module.js', 'view_share_session_surfaces_module.js'];
const cssDir = path.join(root, 'desktop/web-app/build/static/css');
const cssFile = fs.readdirSync(cssDir).filter(name => /^main\..*\.css$/.test(name)).sort().at(-1);
assert(cssFile, 'Built desktop CSS must be available');
const hashes = Object.fromEntries(modules.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
if (beforePolicy) {
  delete hashes['view_share_session_surfaces_module.js'];
  hashes['before-view_share_session_surfaces_source.jsx'] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'reports/homework-conversion-followup/before-view_share_session_surfaces_source.jsx'))).digest('hex');
}
hashes[cssFile] = crypto.createHash('sha256').update(fs.readFileSync(path.join(cssDir, cssFile))).digest('hex');

async function main() {
  const externalRequests = [], pageErrors = [], scenarios = [];
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AlloFlow delivery dialog local check</title></head><body><main id="root"></main></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    async function setup(name, viewport, options = {}) {
      const page = await browser.newPage({ viewport });
      page.on('pageerror', error => pageErrors.push({ name, message: error.message }));
      await page.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        externalRequests.push(route.request().url()); return route.abort();
      });
      await page.goto(origin);
      await page.addStyleTag({ content: fs.readFileSync(path.join(cssDir, cssFile), 'utf8') });
      for (const file of ['react/umd/react.production.min.js', 'react-dom/umd/react-dom.production.min.js']) {
        await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'desktop/web-app/node_modules', file), 'utf8') });
      }
      await page.evaluate(() => { window.AlloModules = {}; });
      for (const file of modules) {
        const content = beforePolicy && file === 'view_share_session_surfaces_module.js'
          ? require(path.join(root, '_build_first_wave_view_modules.js')).buildFirstWaveModule('ShareSessionSurfaces', fs.readFileSync(path.join(root, 'reports/homework-conversion-followup/before-view_share_session_surfaces_source.jsx'), 'utf8'))
          : fs.readFileSync(path.join(root, file), 'utf8');
        await page.addScriptTag({ content });
      }
      await page.evaluate(options => {
        const api = window.AlloModules.InstructionalContext;
        const shared = window.AlloModules.SharedActivity;
        const passage = 'Upon the heath. Anon.';
        const original = api.createSupportedReading(passage, { id: 'original', title: 'Original scene', sourceFamilyId: 'scene', unitId: 'lesson-a' });
        original.readingSupports = api.validateReadingSupports(original, {
          annotations: [
            { id: 'heath', start: 9, end: 14, quote: 'heath', text: 'PRIVATE_DEFINITION_NOT_IN_SUMMARY', origin: 'educator', pinned: true },
            { id: 'anon', start: 16, end: 20, quote: 'Anon', text: 'suppressed explanation' }
          ], suppressedAnnotations: [{ start: 16, end: 20, quote: 'Anon' }]
        });
        const adapted = { id: 'companion', type: 'simplified', title: options.escaped ? '<img src=x onerror=evil>' : 'Scene companion', data: 'On open ground. Soon.',
          sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'scene', unitId: 'lesson-a', instructionalText: { form: 'adapted', role: 'supplemental' } };
        let resources = options.reduced ? [{ ...adapted, syncTruncated: true, sourceSnapshot: null }] : [adapted, original];
        let selectedIds = [adapted.id];
        if (options.many) {
          resources = []; selectedIds = [];
          for (let index = 0; index < 25; index++) {
            const title = 'Lesson ' + (index + 1) + ': How writers use imagery, character, and language to develop the central theme';
            const source = api.createSupportedReading('Source passage for lesson ' + (index + 1) + '.', { id: 'original-' + index, title: title + ' — original', sourceFamilyId: 'family-' + index, unitId: 'lesson-' + index });
            const companion = { id: 'companion-' + index, type: 'simplified', title: title + ' — companion', data: 'Companion passage ' + (index + 1) + '.',
              sourceSnapshot: source.sourceSnapshot, sourceFamilyId: source.sourceFamilyId, unitId: source.unitId, instructionalText: { form: 'adapted', role: 'supplemental' } };
            resources.push(companion, source); selectedIds.push(companion.id);
          }
        }
        if (options.empty) { resources = []; selectedIds = []; }
        window.__summary = options.legacy ? undefined : shared.describeAssignmentDelivery(resources, resources[0]?.id, selectedIds);
        if (options.emptyMetadata) window.__summary = { schemaVersion: 1 };
        if (options.oldSchema) window.__summary = { ...window.__summary, schemaVersion: 0 };
        window.__calls = { selfContained: [], mailbox: [], selfContainedOptions: [], mailboxOptions: [], preview: 0, copied: [], closed: 0 };
        window.__activeTeacherSelection = ['unrelated-current-reading'];
        const noop = () => {};
        const Icon = ({ size = 16 }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true }, React.createElement('path', { d: 'M6 4h12v16H6z M9 8h6 M9 12h6 M9 16h4' }));
        const props = {
          BookOpen: Icon, ClipboardList: Icon, Copy: Icon, ExternalLink: Icon, Printer: Icon, Share2: Icon, Trash2: Icon, X: Icon,
          SharedAssignmentActivityPanel: () => null, addToast: noop, t: options.keyEcho ? key => key : () => undefined, homeworkQrDialogRef: React.createRef(),
          createSelfContainedHomeworkLink: (ids, options) => { __calls.selfContained.push(ids.slice()); __calls.selfContainedOptions.push(options || null); ids.push('callback-mutation'); },
          hostPackOnMailbox: (ids, options) => { __calls.mailbox.push(ids.slice()); __calls.mailboxOptions.push(options || null); ids.push('callback-mutation'); },
          copyToClipboard: url => __calls.copied.push(url), testHomeworkAsStudent: () => __calls.preview++,
          setQrShareModal: value => { if (value === null) __calls.closed++; }, printQrSheet: noop, revokeHomeworkAssignment: noop,
          mbBusy: false, mbConfig: null, qrShareSvg: '', qrShareError: 'Local component fixture has no QR service',
          qrShareModal: { type: 'assignment', aiPolicy: options.policy, title: 'Macbeth — Act 1, Scene 1', url: 'https://school.example.invalid/homework/fixture', resourceCount: resources.length,
            resourceTitles: resources.map(resource => resource.title), deliverySummary: __summary, expiresAt: '2026-10-01T00:00:00Z' }
        };
        window.__root = ReactDOM.createRoot(document.getElementById('root'));
        __root.render(React.createElement('div', { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'alloflow-homework-qr-title', 'aria-describedby': 'alloflow-homework-qr-description',
          style: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', background: '#e2e8f0' } },
          React.createElement(window.AlloModules.HomeworkQrDialogView, props)));
      }, options);
      await page.getByRole('heading', { name: 'Homework assignment ready' }).waitFor();
      return page;
    }
    async function keyboardActivate(page, locator) {
      await locator.focus();
      assert.equal(await locator.evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Enter');
    }
    async function dimensions(page) {
      return page.evaluate(() => {
        const panel = document.querySelector('[tabindex="-1"]');
        const bounds = panel.getBoundingClientRect();
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, panelWidth: bounds.width, left: bounds.left, right: bounds.right, panelScrollWidth: panel.scrollWidth, panelClientWidth: panel.clientWidth };
      });
    }
    if (!edgeMode && !policyMode) {
    for (const width of [1280, 320]) {
      const name = 'saved-selection-' + width;
      const page = await setup(name, { width, height: 1000 });
      const summary = await page.evaluate(() => __summary);
      assert.deepEqual(summary.conversionResourceIds, ['companion']);
      assert.equal(summary.openingResourceId, 'companion');
      assert.equal(summary.resourceCount, 2);
      assert.deepEqual(summary.readings.map(row => [row.originalStatus, row.supportsCount]), [['included', 1], ['included', 1]]);
      assert(!JSON.stringify(summary).includes('PRIVATE_DEFINITION'));
      assert(!JSON.stringify(summary).includes('Upon the heath'));
      const copy = await page.locator('[data-reading-delivery-summary]').innerText();
      assert(copy.includes('Matching original included.'));
      assert(copy.includes('This describes the saved link.'));
      const layout = await dimensions(page);
      assert(layout.documentWidth <= width && layout.left >= 0 && layout.right <= width, JSON.stringify(layout));
      assert(layout.panelScrollWidth <= layout.panelClientWidth, 'No horizontal scrolling inside the dialog');
      await page.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true });
      const disclosure = page.locator('summary').filter({ hasText: 'Readings and saved word supports' });
      await keyboardActivate(page, disclosure);
      assert.equal(await disclosure.evaluate(el => el.parentElement.open), false);
      await keyboardActivate(page, disclosure);
      assert.equal(await disclosure.evaluate(el => el.parentElement.open), true);
      await keyboardActivate(page, page.getByRole('button', { name: /Make self-contained version/ }));
      await keyboardActivate(page, page.getByRole('button', { name: /Host on Class Mailbox/ }));
      await keyboardActivate(page, page.getByRole('button', { name: 'Test as student' }));
      await keyboardActivate(page, page.getByRole('button', { name: 'Copy homework link', exact: true }));
      await keyboardActivate(page, page.getByRole('button', { name: 'Close', exact: true }));
      const calls = await page.evaluate(() => __calls);
      assert.deepEqual(calls.selfContained, [['companion']]); assert.deepEqual(calls.mailbox, [['companion']]);
      assert.equal(calls.preview, 1); assert.equal(calls.closed, 1); assert.equal(calls.copied.length, 1);
      assert.deepEqual(await page.evaluate(() => __summary.conversionResourceIds), ['companion']);
      scenarios.push({ name, pass: true, layout, calls, metadataExcludesReadingAndGlossBodies: true, screenshot: name + '.png' });
      await page.close();
    }
    {
      const page = await setup('legacy', { width: 320, height: 1000 }, { legacy: true });
      assert.equal(await page.getByRole('button', { name: /Make self-contained version/ }).isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: /Host on Class Mailbox/ }).isDisabled(), true);
      assert((await page.locator('body').innerText()).includes('select the resources again in History'));
      await keyboardActivate(page, page.getByRole('button', { name: 'Test as student' }));
      await keyboardActivate(page, page.getByRole('button', { name: 'Copy homework link', exact: true }));
      const calls = await page.evaluate(() => __calls);
      assert.deepEqual(calls.selfContained, []); assert.deepEqual(calls.mailbox, []); assert.equal(calls.preview, 1); assert.equal(calls.copied.length, 1);
      scenarios.push({ name: 'legacy-selection-not-reused', pass: true, calls }); await page.close();
    }
    {
      const page = await setup('escaped-reduced', { width: 320, height: 1000 }, { escaped: true, reduced: true });
      const copy = await page.locator('[data-reading-delivery-summary]').innerText();
      assert(copy.includes('<img src=x onerror=evil>')); assert(copy.includes('Matching original unavailable')); assert(copy.includes('reading was reduced'));
      assert.equal(await page.locator('img,[onerror]').count(), 0);
      await page.screenshot({ path: path.join(__dirname, 'escaped-reduced-320.png'), fullPage: true });
      scenarios.push({ name: 'escaped-title-and-reduced-warning', pass: true, screenshot: 'escaped-reduced-320.png' }); await page.close();
    }
    } else if (edgeMode) {
      for (const width of [1280, 320]) {
        const name = 'long-assignment-' + width;
        const page = await setup(name, { width, height: 800 }, { many: true });
        assert.equal(await page.locator('[data-reading-delivery-summary] li').count(), 50);
        assert.equal(await page.evaluate(() => __summary.conversionResourceIds.length), 25);
        const layout = await dimensions(page);
        assert(layout.documentWidth <= width && layout.panelScrollWidth <= layout.panelClientWidth, JSON.stringify(layout));
        await page.getByRole('button', { name: 'Close', exact: true }).focus();
        const tabStops = [];
        for (let index = 0; index < 11; index++) {
          await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent).trim().slice(0, 100),
            isReadingList: document.activeElement.matches('[data-reading-delivery-summary] ul') }));
          tabStops.push(focused);
          if (focused.isReadingList) {
            await page.keyboard.press('End');
            await page.waitForFunction(() => { const list = document.querySelector('[data-reading-delivery-summary] ul'); return list.scrollTop + list.clientHeight >= list.scrollHeight - 1; });
          }
        }
        assert(tabStops.some(stop => stop.isReadingList), 'Reading list is reachable with Tab');
        assert(tabStops.some(stop => stop.text.startsWith('Host on Class Mailbox')), 'Conversion is reachable after the scroll region');
        const scroll = await page.locator('[data-reading-delivery-summary] ul').evaluate(el => ({ top: el.scrollTop, height: el.clientHeight, fullHeight: el.scrollHeight, tabIndex: el.tabIndex }));
        assert(scroll.top + scroll.height >= scroll.fullHeight - 1, 'End reaches the final reading');
        await page.locator('[data-reading-delivery-summary]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true });
        scenarios.push({ name, pass: true, layout, readingCount: 50, selectedCount: 25, scroll, tabStops });
        await page.close();
      }
      for (const [name, options] of [['empty-packet', { empty: true }], ['empty-metadata', { emptyMetadata: true }], ['legacy-metadata', { legacy: true }], ['old-schema', { oldSchema: true }]]) {
        const page = await setup(name, { width: 320, height: 800 }, options);
        assert.equal(await page.getByRole('button', { name: /Make self-contained version/ }).isDisabled(), true);
        assert.equal(await page.getByRole('button', { name: /Host on Class Mailbox/ }).isDisabled(), true);
        await keyboardActivate(page, page.getByRole('button', { name: 'Test as student' }));
        await keyboardActivate(page, page.getByRole('button', { name: 'Copy homework link', exact: true }));
        const copy = await page.locator('body').innerText();
        assert(copy.includes('select the resources again in History'));
        scenarios.push({ name, pass: true, emptyOrLegacyConversionDisabled: true, calls: await page.evaluate(() => __calls) });
        await page.close();
      }
      {
        const page = await setup('key-echo-fallback', { width: 320, height: 800 }, { keyEcho: true });
        const copy = await page.locator('[data-reading-delivery-summary]').innerText();
        assert(copy.includes('What students receive') && copy.includes('Matching original included.'));
        assert(!copy.includes('share_collect.'));
        scenarios.push({ name: 'summary-key-echo-fallback', pass: true, note: 'Extra robustness case; production host returns undefined for missing keys, used by all other scenarios.' });
        await page.close();
      }
    }
    if (policyMode) {
      for (const policy of ['off', 'student-byok']) {
        const page = await setup('saved-policy-' + policy, { width: 320, height: 800 }, { policy });
        await keyboardActivate(page, page.getByRole('button', { name: /Make self-contained version/ }));
        await keyboardActivate(page, page.getByRole('button', { name: /Host on Class Mailbox/ }));
        const calls = await page.evaluate(() => __calls);
        if (beforePolicy) {
          assert.deepEqual(calls.selfContainedOptions, [null]);
          assert.deepEqual(calls.mailboxOptions, [null]);
        } else {
          assert.deepEqual(calls.selfContainedOptions, [{ aiPolicy: policy }]);
          assert.deepEqual(calls.mailboxOptions, [{ includeSharedActivity: false, aiPolicy: policy }]);
        }
        scenarios.push({ name: 'saved-policy-' + policy, pass: true, phase: beforePolicy ? 'before' : 'after', beforeMissingPolicyAndActivityOptions: beforePolicy, calls });
        await page.close();
      }
    }
    assert.deepEqual(externalRequests, []); assert.deepEqual(pageErrors, []);
    const result = { timestamp: new Date().toISOString(), scope: 'Actual generated delivery contract and dialog, local React and built CSS; controlled callbacks/icons; no full-app transport, focus-trap, QR generation, or deployment validation.', browser: browser.version(), hashes, scenarios, externalRequests, pageErrors };
    fs.writeFileSync(path.join(__dirname, edgeMode ? 'edge-browser-results.json' : policyMode ? (beforePolicy ? 'before-policy-browser-results.json' : 'policy-browser-results.json') : 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
