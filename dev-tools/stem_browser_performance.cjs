// Local Chromium probe of the actual shared host lifecycle code, without network.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
async function run() {
  const baseline = process.argv.includes('--baseline');
  const source = fs.readFileSync(path.join(root, baseline ? 'scratch/browser-performance/stem_lab_module.before.js' : 'stem_lab/stem_lab_module.js'), 'utf8');
  const start = source.indexOf('      // ── WCAG Auto-Fixer:');
  const end = source.indexOf('      // ── Canvas Narration: Dual-Channel', start);
  if (start < 0 || end < 0) throw new Error('Host lifecycle boundaries missing');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><title>STEM runtime performance</title><div id="root"></div></html>');
    for (const file of ['react/umd/react.production.min.js', 'react-dom/umd/react-dom.production.min.js']) {
      await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules', file) });
    }
    await page.evaluate(() => {
      window.__work = { frames: 0, scans: 0, scanMs: 0 };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(now => { window.__work.frames++; callback(now); });
      const query = Element.prototype.querySelectorAll;
      Element.prototype.querySelectorAll = function (selector) {
        const start = performance.now();
        const result = query.call(this, selector);
        if (this.classList.contains('stem-lab-modal')) {
          window.__work.scans++; window.__work.scanMs += performance.now() - start;
        }
        return result;
      };
      window.__root = ReactDOM.createRoot(document.getElementById('root'));
    });
    const inputStart=source.indexOf('// STEM_INPUT_RUNTIME_BEGIN'), inputEnd=source.indexOf('// STEM_INPUT_RUNTIME_END');
    if(inputStart>=0 && inputEnd>inputStart) await page.addScriptTag({content:source.slice(inputStart,inputEnd)});
    await page.addScriptTag({ content: `function Probe() {
      var _stemDialogRef = React.useRef(null), stemLabTool = 'test', addToast = function(){};
      ${source.slice(start, end)}
      React.useEffect(function(){if(window.StemInput){window.StemInput.setScope('test',_stemDialogRef.current);return function(){window.StemInput.setScope(null);};}},[]);
      return React.createElement('div', {ref:_stemDialogRef,className:'stem-lab-modal'},
        Array.from({length:600}, (_,i)=>React.createElement('button',{key:i},'Control '+i)));
    }
    __root.render(React.createElement(Probe));` });
    await page.waitForTimeout(4400);
    const mounted = await page.evaluate(() => ({ ...__work }));
    await page.evaluate(() => { __root.unmount(); window.__work = { frames: 0, scans: 0, scanMs: 0 }; });
    await page.waitForTimeout(2200);
    const closed = await page.evaluate(() => ({ ...__work }));
    const result = { mode: baseline ? 'before' : 'after', scope: 'Real host accessibility/controller code in production React; 600-control fixture, no connected gamepad; not whole-app Core Web Vitals.', mountedMs:4400, closedMs:2200, mounted, closed, errors };
    fs.mkdirSync(path.join(root, 'reports/browser-performance'), { recursive: true });
    fs.writeFileSync(path.join(root, 'reports/browser-performance', result.mode+'.json'), JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
    if (errors.length) throw new Error(errors.join('\n'));
    if (!baseline && (mounted.frames || closed.frames || closed.scans)) throw new Error('Idle lifecycle work regressed');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
