const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/printingpress-reader-review');
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
        const [data, setData] = R.useState({ printingPress: { view: 'broadside', ...initial } });
        const updateMulti = (id, patch) => setData(p => ({ ...p, [id]: { ...p[id], ...patch } }));
        window.ppData = data; window.ppPatch = patch => updateMulti('printingPress', patch);
        return StemLab._registry.printingPress.render({ React: R, toolData: data, update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti, t: (k, f) => f || k, addToast: () => {}, awardXP: () => {}, setStemLabTool: () => {} });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(h(App));
    }, initial);
    await page.locator('#pp-content').waitFor();
  }
  try {
    const page=await context.newPage();await mount(page);
    const content='REPAIR CAFE\nSaturday at 10 am\nSchool library\nBring a broken toy. Learn to repair it.\n<em>Everyone is welcome.</em>';
    await page.locator('#pp-content').fill(content);
    await page.getByText('Plan for your reader',{exact:true}).click();
    await page.locator('#pp-audience').fill('Families in our school');
    await page.locator('#pp-purpose').fill('Invite readers to repair together');
    await page.getByRole('button',{name:'Text-only proof',exact:true}).focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#pp-reader-proof').isVisible(),true);
    assert.equal(await page.locator('#pp-design-proof').isVisible(),false);
    assert.equal(await page.locator('#pp-reader-body').innerText(),content.split('\n').slice(1).join('\n'));
    assert.equal(await page.locator('#pp-reader-body em').count(),0,'Markup stays text');
    const checks=page.locator('.pp-proof-check input');
    for(let i=0;i<3;i++)await checks.nth(i).check();
    assert.ok((await page.locator('#pp-reader-progress').innerText()).startsWith('3 of 3'));
    await page.getByRole('button',{name:'Design proof',exact:true}).click();
    assert.equal(await checks.nth(0).isChecked(),true,'View switching preserves checks');
    await page.locator('#pp-body-size').fill('18');
    for(let i=0;i<3;i++)assert.equal(await checks.nth(i).isChecked(),false,'Design change invalidates review');
    await checks.nth(0).check();await page.locator('#pp-content').fill(content+'\nFree entry.');
    assert.equal(await checks.nth(0).isChecked(),false,'Text change invalidates review');
    await page.getByRole('button',{name:'Text-only proof',exact:true}).click();
    await page.getByRole('button',{name:'Return to my text',exact:true}).click();
    assert.equal(await page.locator('#pp-content').evaluate(el=>document.activeElement===el),true);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download broadside',exact:true}).click();
    await(await download).saveAs(path.join(out,'broadside-from-reader.html'));
    const html=fs.readFileSync(path.join(out,'broadside-from-reader.html'),'utf8');
    assert.ok(!html.includes('Families in our school'));assert.ok(!html.includes('Invite readers to repair together'));
    assert.ok(!html.includes('self-check'));assert.ok(!html.includes('Text-only proof'));assert.ok(html.includes('Free entry.'));
    assert.ok(!html.includes('<em>Everyone'));
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('#pp-design-proof').isVisible(),true,'Lesson print shows design even from reader view');
    assert.equal(await page.locator('#pp-reader-proof').isVisible(),false);
    await page.emulateMedia({media:'screen'});
    await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
    const accessibility=[],sizes=[];
    for(const width of [1280,390,320]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));sizes.push(width);
      const violations=await page.evaluate(async()=> (await axe.run({include:[['.pp-reader-tools'],['#pp-reader-proof'],['.pp-reader-plan']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
      accessibility.push({width,violations});assert.deepEqual(violations,[]);
      await page.locator('.pp-reader-tools').screenshot({path:path.join(out,'review-'+width+'.png')});
      await page.locator('#pp-reader-proof').screenshot({path:path.join(out,'text-proof-'+width+'.png')});
    }
    await page.locator('#pp-audience').fill('R'.repeat(240));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Long reader note wraps on phone');
    await page.locator('#pp-audience').fill('Families in our school');
    await checks.nth(0).check();
    await page.evaluate(()=>ppPatch({broadsideDraft:{...ppData.printingPress.broadsideDraft,content:'UPDATED TITLE\nNew body'}}));
    await page.waitForFunction(()=>document.getElementById('pp-content').value.startsWith('UPDATED TITLE') && !document.querySelector('.pp-proof-check input').checked);
    assert.equal(await checks.nth(0).isChecked(),false,'External draft changes invalidate review');
    const reopened=await context.newPage();await mount(reopened);
    await reopened.getByText('Plan for your reader',{exact:true}).click();
    assert.equal(await reopened.locator('#pp-audience').inputValue(),'Families in our school');
    assert.equal(await reopened.locator('#pp-purpose').inputValue(),'Invite readers to repair together');
    assert.ok((await reopened.locator('#pp-reader-progress').innerText()).startsWith('0 of 3'));
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks:['planning recovery','keyboard proof toggle','plain text safety','check invalidation','view switching','focus return','design export from text mode','planning excluded from output','print visibility','responsive layout','WCAG A/AA'],sizes,accessibility,errors},null,2));
    console.log('Printing Press reader review browser checks passed.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
