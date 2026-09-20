// Exercises the actual Quick Start host adapter and shared gate in Chromium.
// The wizard export is a controlled local fixture; this is not a whole-app benchmark.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '../..');
const phase = process.argv.includes('--before') ? 'before' : 'after';
function currentSections() {
  const source = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
  const slice = (start, end) => {
    const a = source.indexOf(start), b = source.indexOf(end, a);
    if (a < 0 || b < a) throw Error('Missing source boundary: ' + start);
    return source.slice(a, b);
  };
  return {
    sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
    wrapper: slice('const QuickStartWizard = React.memo', 'const FocusReaderOverlay ='),
    gate: slice('// MODULE_GATE_WATCH_START', '// Thin host adapters'),
  };
}
const sections = phase === 'before'
  ? JSON.parse(fs.readFileSync(path.join(__dirname, 'before-source.json'), 'utf8').replace(/^\uFEFF/, ''))
  : currentSections();
const adapterCode = esbuild.transformSync(sections.gate + sections.wrapper
  + '\nwindow.QuickStartFixtureAdapter = QuickStartWizard;', { loader: 'jsx', target: 'es2020' }).code;

async function run() {
  const requestCounts = new Map();
  const fixture = "window.AlloModules.QuickStartWizard = function Wizard(props) { return props.isOpen ? React.createElement('section', {role:'dialog', 'aria-label':'Ready setup wizard'}, React.createElement('p', null, 'Wizard ready'), React.createElement('button', {onClick:props.onClose}, 'Close wizard')) : null; };";
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://fixture.local');
    if (url.pathname === '/fixture-module.js') {
      const scenario = url.searchParams.get('scenario');
      const count = (requestCounts.get(scenario) || 0) + 1;
      requestCounts.set(scenario, count);
      setTimeout(() => {
        if (scenario.startsWith('failure') && count === 1) { res.writeHead(503); res.end('fixture failure'); }
        else { res.setHeader('Content-Type', 'application/javascript'); res.end(fixture); }
      }, 200); // Deliberate fixture latency; never used as a product tuning value.
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Quick Start adapter fixture</title></head><body><div id="root"></div></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const scenarios = [];
  const externalRequests = [];
  try {
    browser = await chromium.launch({ headless: true });
    async function setup(name, options = {}) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        externalRequests.push(route.request().url()); return route.abort();
      });
      await page.goto(origin);
      for (const filename of ['react/umd/react.production.min.js', 'react-dom/umd/react-dom.production.min.js']) {
        await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'desktop/web-app/node_modules', filename), 'utf8') });
      }
      await page.evaluate(({ name, delayedLoader }) => {
        window.AlloModules = {};
        window.__alloModuleRegistry = {};
        window.__loadCalls = 0;
        window.__scriptRequests = 0;
        window.__closed = 0;
        window.t = () => null;
        window.__installLoader = () => {
          window.__alloLazyQuickStartWizard = () => {
            __loadCalls++;
            if (AlloModules.QuickStartWizard || __alloModuleRegistry.QuickStartWizard?.status === 'pending') return;
            __scriptRequests++;
            __alloModuleRegistry.QuickStartWizard = {status:'pending'};
            window.dispatchEvent(new Event('alloflow:module-registry-changed'));
            const script = document.createElement('script');
            script.src = '/fixture-module.js?scenario=' + encodeURIComponent(name);
            const settle = status => { __alloModuleRegistry.QuickStartWizard.status = status; window.dispatchEvent(new Event('alloflow:module-registry-changed')); };
            script.onload = () => settle('loaded'); script.onerror = () => settle('failed');
            document.head.appendChild(script);
          };
        };
        if (!delayedLoader) __installLoader();
      }, { name, delayedLoader: options.delayedLoader });
      await page.addScriptTag({ content: adapterCode });
      await page.evaluate(({initialOpen}) => {
        window.__root = ReactDOM.createRoot(document.getElementById('root'));
        window.__props = { isOpen: initialOpen, t: window.t, onClose: () => { __closed++; __props.isOpen = false; __render(); } };
        window.__render = () => ReactDOM.flushSync(() => __root.render(React.createElement(QuickStartFixtureAdapter, {...__props})));
        window.__render();
      }, {initialOpen:options.initialOpen !== false});
      return { page, errors };
    }
    const awaitReady = async page => { if (phase === 'after') await page.waitForFunction(() => !!window.AlloModules.QuickStartWizard, null, {timeout:15000}); };
    const snapshot = async (page) => page.evaluate(() => ({
      text: document.getElementById('root').textContent,
      ready: !!document.querySelector('[aria-label="Ready setup wizard"]'),
      retryVisible: Array.from(document.querySelectorAll('button')).some(b => /retry/i.test(b.textContent)),
      loaderCalls: __loadCalls, scriptRequests: __scriptRequests, closed: __closed,
      status: __alloModuleRegistry.QuickStartWizard?.status || 'unrequested',
      loadingOverlayZIndex: document.querySelector('[role="status"]')?.parentElement.style.zIndex || null,
    }));

    {
      const {page, errors} = await setup('demand-open');
      await page.waitForTimeout(650);
      await awaitReady(page);
      scenarios.push({ name:'demand-open', ...(await snapshot(page)), errors });
      await page.close();
    }
    {
      const {page, errors} = await setup('role-prewarm');
      await page.evaluate(() => __alloLazyQuickStartWizard());
      await page.waitForTimeout(650);
      await awaitReady(page);
      const settled = await snapshot(page);
      await page.evaluate(() => { for (let i=0; i<5; i++) __render(); });
      scenarios.push({ name:'role-prewarm', settled, afterSamePropsRerenders:await snapshot(page), errors });
      await page.close();
    }
    {
      const {page, errors} = await setup('failure-retry');
      await page.evaluate(() => __alloLazyQuickStartWizard());
      await page.waitForTimeout(650);
      await page.waitForFunction(() => window.__alloModuleRegistry.QuickStartWizard?.status === 'failed', null, {timeout:15000});
      const failed = await snapshot(page);
      if (failed.retryVisible) {
        await page.getByRole('button', {name:/retry/i}).focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(650);
      }
      await awaitReady(page);
      scenarios.push({ name:'failure-retry', failed, afterRetry:await snapshot(page), errors });
      await page.close();
    }
    {
      const {page, errors} = await setup('close-pending-reopen');
      await page.evaluate(() => __alloLazyQuickStartWizard());
      await page.getByRole('button', {name:'Close', exact:true}).focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(650);
      await page.waitForFunction(() => !!window.AlloModules.QuickStartWizard, null, {timeout:15000});
      const closed = await snapshot(page);
      await page.evaluate(() => { __props.isOpen=true; __render(); });
      await page.waitForTimeout(100);
      scenarios.push({ name:'close-pending-reopen', closed, reopened:await snapshot(page), errors });
      await page.close();
    }
    {
      const {page, errors} = await setup('late-loader', {delayedLoader:true});
      await page.waitForTimeout(150);
      await page.evaluate(() => __installLoader());
      await page.waitForTimeout(650);
      await awaitReady(page);
      scenarios.push({ name:'late-loader', ...(await snapshot(page)), errors });
      await page.close();
    }
    {
      const {page, errors} = await setup('initially-closed', {initialOpen:false});
      await page.waitForTimeout(300);
      const closed = await snapshot(page);
      await page.evaluate(() => { __props.isOpen=true; __render(); });
      await page.waitForTimeout(650);
      await awaitReady(page);
      scenarios.push({ name:'initially-closed', closed, opened:await snapshot(page), errors });
      await page.close();
    }
    {
      const {page, errors} = await setup('close-before-loader', {delayedLoader:true});
      await page.getByRole('button', {name:'Close', exact:true}).focus();
      await page.keyboard.press('Enter');
      await page.evaluate(() => __installLoader());
      await page.waitForTimeout(650);
      scenarios.push({ name:'close-before-loader', ...(await snapshot(page)), errors });
      await page.close();
    }
    const result = { phase, sourceHash:sections.sourceHash, scope:'Actual shell QuickStartWizard adapter and CDNModuleGate in local Chromium, controlled wizard export and loader; not a full-app cold-load or performance benchmark.', fixtureResponseDelayMs:200, externalRequests, scenarios };
    fs.writeFileSync(path.join(__dirname, phase + '-browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (phase === 'after') {
      const get = name => scenarios.find(s => s.name === name);
      assert.deepEqual(externalRequests, [], 'Fixture made external requests');
      for (const scenario of scenarios) assert.deepEqual(scenario.errors, [], scenario.name + ' raised page errors');
      assert.equal(get('demand-open').ready, true, 'Opening must demand-load the wizard');
      assert.equal(get('demand-open').scriptRequests, 1, 'Opening should request one script');
      assert.equal(get('role-prewarm').settled.ready, true, 'Delayed registration must replace loading without unrelated renders');
      assert.equal(get('role-prewarm').afterSamePropsRerenders.scriptRequests, 1, 'Repeated requests/renders must deduplicate');
      assert.equal(get('failure-retry').failed.retryVisible, true, 'Failed loading must offer Retry');
      assert.equal(get('failure-retry').failed.loadingOverlayZIndex, '300', 'Quick Start loading must retain its overlay stacking level');
      assert.equal(get('failure-retry').afterRetry.ready, true, 'Retry must recover');
      assert.equal(get('failure-retry').afterRetry.scriptRequests, 2, 'Retry should add exactly one request');
      assert.equal(get('close-pending-reopen').closed.text, '', 'Late completion must not reopen a closed wizard');
      assert.equal(get('close-pending-reopen').reopened.ready, true, 'Reopening should use loaded module');
      assert.equal(get('close-pending-reopen').reopened.scriptRequests, 1, 'Reopening must not reload a ready module');
      assert.equal(get('late-loader').ready, true, 'Initial child-before-parent ordering must recover');
      assert.equal(get('initially-closed').closed.scriptRequests, 0, 'Closed adapter must not demand-load');
      assert.equal(get('initially-closed').opened.ready, true, 'Opening after initial closed mount must load');
      assert.equal(get('close-before-loader').scriptRequests, 0, 'Closing must cancel late-loader discovery');
      assert.equal(get('close-before-loader').text, '', 'Closed adapter must stay empty');
      console.log('All seven Quick Start browser lifecycle scenarios passed.');
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => {console.error(error); process.exitCode=1;});
