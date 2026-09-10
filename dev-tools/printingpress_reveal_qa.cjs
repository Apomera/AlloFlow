const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/printingpress-reveal-review');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  await context.route('http://printingpress.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Printing Press review</title></head><body><main id="root"></main></body></html>' }));
  async function mount(page, initial = {}) {
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://printingpress.test/');
    await page.addStyleTag({ content: 'body{margin:0;background:#19140e;font-family:system-ui}button,input,select,textarea{font:inherit}button{cursor:pointer}#root{max-width:1120px;margin:auto}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_printingpress.js') });
    await page.evaluate(initial => {
      const R = React, h = R.createElement;
      function App() {
        const [data, setData] = R.useState({ printingPress: { view: 'pressMechanism', ...initial } });
        const updateMulti = (id, patch) => setData(p => ({ ...p, [id]: { ...p[id], ...patch } }));
        window.ppData = data; window.ppPatch = patch => updateMulti('printingPress', patch);
        return StemLab._registry.printingPress.render({ React: R, toolData: data, update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti, t: (k, f) => f || k, addToast: () => {}, awardXP: () => {}, setStemLabTool: () => {} });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(h(App));
    }, initial);
    await page.locator('#pp-phrase').waitFor();
  }
  try {
    const results=[];
    for (const motion of ['reduce','no-preference']) {
      const page=await context.newPage(); await page.emulateMedia({reducedMotion:motion}); await mount(page);
      await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
      for (let cycle=0;cycle<4;cycle++) {
        await page.locator('#pp-phrase').fill('PRINT');
        await page.getByRole('button',{name:'① Ink the type',exact:true}).click();
        assert.equal(await page.locator('#pp-phrase').isDisabled(),true);
        assert.ok((await page.locator('#pp-phrase-stage').innerText()).includes('Type locked'));
        assert.equal(await page.locator('.pp-scene > .printingpress-no-print > button').evaluate(el=>getComputedStyle(el).opacity),'1');
        await page.getByRole('button',{name:'② Lay paper',exact:true}).click();
        await page.getByRole('button',{name:'③ Pull the bar',exact:true}).click();
        await page.getByRole('button',{name:'④ Lift and reveal',exact:true}).click();
        const snapshot=await page.evaluate(async()=>{
          const button=document.querySelector('.pp-scene > .printingpress-no-print > button');
          const style=getComputedStyle(button);
          const violations=(await axe.run(document.querySelector('.pp-workbench'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations;
          return {button:{color:style.color,background:style.backgroundColor,opacity:style.opacity,disabled:button.disabled},violations};
        });
        results.push({motion,cycle,...snapshot});
        if(snapshot.violations.length) await page.screenshot({path:path.join(out,'failure-'+motion+'-'+cycle+'.png'),fullPage:false});
        await page.locator('#pp-phrase').fill('NEXT');
        assert.ok((await page.locator('#pp-phrase-stage').innerText()).includes('Editing the next impression'));
        assert.equal(await page.locator('.pp-scene svg text[transform="translate(480 0) scale(-1 1)"]').textContent(),'PRINT');
        assert.equal(await page.locator('#pp-paper-preview').innerText(),'PRINT');
        assert.equal(await page.locator('.pp-comparison [role="img"]').getAttribute('aria-label'),'Mirror-reversed type: PRINT');
        if(motion==='reduce' && cycle===0) {
          for(const width of [1280,390,320]) {
            await page.setViewportSize({width,height:1000});
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
            await page.locator('.pp-scene').screenshot({path:path.join(out,'next-impression-'+width+'.png')});
          }
          await page.setViewportSize({width:1280,height:1000});
        }
        await page.getByRole('button',{name:'⑤ Print another',exact:true}).click();
        assert.equal(await page.locator('.pp-comparison [role="img"]').getAttribute('aria-label'),'Mirror-reversed type: NEXT');
        assert.ok((await page.locator('#pp-phrase-stage').innerText()).includes('Ready to set type'));
      }
      await page.close();
    }
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors},null,2));
    console.log(JSON.stringify(results.map(r=>({motion:r.motion,cycle:r.cycle,button:r.button,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,checks:n.any}))}))})),null,2));
    assert.deepEqual(results.flatMap(r=>r.violations),[]);
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
