// Measures actual shared-shell code in an isolated real-browser fixture.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('@playwright/test');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const mode = process.argv.includes('--before') ? 'before' : 'after';
const file = mode === 'before' ? 'scratch/app-performance-pass3/AlloFlowANTI.before.txt' : 'AlloFlowANTI.txt';
const source = fs.readFileSync(path.join(root, file), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw Error('Missing shell section: ' + start);
  return source.slice(from, to);
}
const focusCode = section('const useFocusTrap =', 'window.__alloHooks =');
const watchCode = source.includes('// MODULE_GATE_WATCH_START') ? section('// MODULE_GATE_WATCH_START', '// MODULE_GATE_WATCH_END') : '';
const gateCode = watchCode + section('const CDNModuleGate =', '// Thin host adapters').replace('return function CDNModuleGate(props) {', 'return function CDNModuleGate(props) { window.__gateRenders++;');
const gateJs = esbuild.transformSync(gateCode, { loader: 'jsx', target: 'es2020' }).code;
async function run() {
  const files = {
    '/react.js': path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'),
    '/react-dom.js': path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js')
  };
  const server = http.createServer((req, res) => {
    if (files[req.url]) { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(files[req.url])); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><style>button{margin:2px}#dialog{height:400px;overflow:auto}</style><button id="opener">Open</button><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(({ focusCode, gateJs }) => {
      window.__gateRenders = 0; window.__updates = 0; window.__styles = 0;
      const computed = window.getComputedStyle;
      window.getComputedStyle = function(...args) { __styles++; return computed.apply(this, args); };
      window.AppFocus = Function('useRef', 'useEffect', focusCode + '\nreturn useFocusTrap;')(React.useRef, React.useEffect);
      const gateReact = { ...React, useState(initial) { const [v, set] = React.useState(initial); return [v, next => { __updates++; set(next); }]; } };
      window.Gate = Function('React', gateJs + '\nreturn CDNModuleGate;')(gateReact);
      window.__root = ReactDOM.createRoot(document.getElementById('root'));
      window.FocusFixture = function() {
        const ref = React.useRef(); AppFocus(ref, true, () => {});
        return React.createElement('div', { id: 'dialog', role: 'dialog', ref }, Array.from({ length: 600 }, (_, i) => React.createElement('button', { key: i, id: 'control-' + i }, 'Control ' + i)));
      };
      ReactDOM.flushSync(() => __root.render(React.createElement(FocusFixture)));
    }, { focusCode, gateJs });
    const focus = await page.evaluate(() => {
      __styles = 0; const start = performance.now();
      for (let i = 0; i < 40; i++) {
        document.getElementById('control-300').focus();
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      }
      return { controls: 600, tabEvents: 40, computedStyleReads: __styles, elapsedMs: performance.now() - start };
    });
    await page.locator('#control-599').focus(); await page.keyboard.press('Tab');
    focus.forwardWrap = await page.locator('#control-0').evaluate(el => el === document.activeElement);
    await page.keyboard.press('Shift+Tab');
    focus.backwardWrap = await page.locator('#control-599').evaluate(el => el === document.activeElement);
    await page.evaluate(() => {
      ReactDOM.flushSync(() => __root.render(null));
      window.AlloModules = {}; window.__alloModuleRegistry = { Target: { status: 'pending' } }; window.__loadTarget = () => {};
      ReactDOM.flushSync(() => __root.render(React.createElement(Gate, { moduleKey: 'Target', loaderName: '__loadTarget', displayName: 'Target', size: 'inline' }, Mod => React.createElement(Mod))));
    });
    await page.waitForTimeout(50);
    const loading = await page.evaluate(async () => {
      __updates = __gateRenders = 0;
      for (let i = 0; i < 100; i++) { window.dispatchEvent(new Event('alloflow:module-registry-changed')); await new Promise(resolve => setTimeout(resolve, 4)); }
      const result = { unrelatedEvents: 100, stateUpdates: __updates, renders: __gateRenders };
      __alloModuleRegistry.Target.status = 'failed'; window.dispatchEvent(new Event('alloflow:module-registry-changed'));
      return result;
    });
    await page.getByRole('button', { name: 'Retry loading', exact: true }).waitFor();
    loading.failureShown = true;
    await page.evaluate(() => { AlloModules.Target = () => React.createElement('p', null, 'Target ready'); window.dispatchEvent(new Event('alloflow:module-registry-changed')); });
    await page.getByText('Target ready', { exact: true }).waitFor();
    loading.readyShown = true;
    const result = { mode, cpuSlowdown: 4, scope: 'actual shared hooks and components; isolated 600-control and module-event fixtures, not whole-app Core Web Vitals', focus, loading };
    fs.mkdirSync(path.join(root, 'reports/app-performance-pass3'), { recursive: true });
    fs.writeFileSync(path.join(root, 'reports/app-performance-pass3', mode + '.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
