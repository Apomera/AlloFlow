const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const results = { started: new Date().toISOString(), fixture: 'Canonical ATC component in a local React fixture with installed Chrome. Product controls and native slider keyboard input drive investigations. Restored-state cases initialize a fresh fixture with captured tool data or explicitly marked malformed records.', checks: [], errors: [], screenshots: [] };
const artifactDir = process.env.ATC_QA_ARTIFACT_DIR || path.join(__dirname, 'runs', results.started.replace(/[^0-9A-Za-z]/g, ''));
fs.mkdirSync(artifactDir, { recursive: true });
let fixture, browser;
async function check(name, action) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function makePage(width = 1440, initial = null, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(30000); page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  if (initial) {
    await page.addInitScript(data => { window.__opsInitial = { atcTower: data }; }, initial);
    await page.route(fixture.url, async route => {
      const response = await route.fetch(), source = await response.text(), marker = "React.useState({atcTower:{view:'menu'}})";
      assert.ok(source.includes(marker)); await route.fulfill({ response, body: source.replace(marker, "React.useState(window.__opsInitial || {atcTower:{view:'menu'}})") });
    });
  }
  await page.goto(fixture.url); await page.locator('#stem-atctower-tab-ops').click(); await page.locator('.atc-ops').waitFor(); return page;
}
async function range(page, key, value) {
  const input = page.locator('[data-atctower-ops-input="' + key + '"]');
  const bounds = await input.evaluate(el => ({ min: Number(el.min), max: Number(el.max), step: Number(el.step) }));
  const left = Math.round((value - bounds.min) / bounds.step), right = Math.round((bounds.max - value) / bounds.step);
  await input.focus(); await input.press(left <= right ? 'Home' : 'End');
  for (let i = 0; i < Math.min(left, right); i++) await input.press(left <= right ? 'ArrowRight' : 'ArrowLeft');
  assert.equal(Number(await input.inputValue()), value);
}
async function record(page) { await page.locator('[data-atctower-ops-log]').click(); }
async function score(page) { return page.locator('[data-atctower-ops-score]').innerText(); }
async function delta(page) { return page.locator('[data-atctower-ops-delta] strong').innerText(); }
async function data(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); }
async function fit(page) { const value = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })); assert.ok(value.document <= value.viewport + 1, JSON.stringify(value)); return value; }
async function axe(page) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(v => ['serious','critical'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
  assert.deepEqual(violations, []);
}
async function capture(page, name, selector = null) { const file = path.join(artifactDir, name + '.png'); if (selector) await page.locator(selector).screenshot({ path: file }); else { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: file, fullPage: true }); } results.screenshots.push(file); }
async function pair(page) { await record(page); await range(page, 'wind', 20); await record(page); }
async function checks() {
  for (const width of [1440,390,320]) await check('Visual investigation and recorded comparison fit accessibly at ' + width + 'px', async () => {
    const page = await makePage(width);
    try {
      assert.equal(await score(page), '54.3'); assert.equal(await page.getByRole('meter').getAttribute('aria-valuenow'), '54.3');
      await fit(page); await axe(page); await capture(page, 'after-initial-' + width);
      await pair(page); assert.equal(await delta(page), '+8.3');
      assert.equal(await page.locator('[data-atctower-ops-setting][data-changed="true"]').count(), 1);
      const controls = await page.locator('.atc-ops button, .atc-ops input, .atc-ops select, .atc-ops textarea').evaluateAll(nodes => nodes.map(el => ({ label: el.getAttribute('aria-label') || el.textContent || el.type, height: el.getBoundingClientRect().height })));
      assert.ok(controls.every(item => item.height >= 44), JSON.stringify(controls));
      const layout = await fit(page); await axe(page); await capture(page, 'after-comparison-' + width);
      if (width === 390) await capture(page, 'after-comparison-detail-390', '[data-atctower-ops-comparison]');
      return { layout, controls: controls.length };
    } finally { await page.close(); }
  });
  await check('Every control changes its own weighted contribution and endpoints reach zero and one hundred', async () => {
    const page = await makePage();
    try {
      const before = await page.locator('[data-atctower-ops-contribution] strong').allTextContents();
      await range(page, 'wind', 20); assert.equal(await score(page), '62.7');
      const after = await page.locator('[data-atctower-ops-contribution] strong').allTextContents(); assert.deepEqual(after.slice(1), before.slice(1)); assert.notEqual(after[0], before[0]);
      for (const [key,value] of Object.entries({ wind:0, spawn:10, sep:20, descent:0.5, timeout:60 })) await range(page,key,value);
      assert.equal(await score(page), '0.0'); assert.equal(await page.locator('[data-atctower-ops-band]').innerText(), 'Sandbox');
      for (const [key,value] of Object.entries({ wind:30, spawn:1, sep:5, descent:2, timeout:10 })) await range(page,key,value);
      assert.equal(await score(page), '100.0'); assert.equal(await page.locator('[data-atctower-ops-band]').innerText(), 'Overload');
      const bars = await page.locator('.atc-ops-contribution-track>span').evaluateAll(nodes => nodes.map(n => Number.parseFloat(n.style.width))); assert.ok(bars.every(value => value >= 0 && value <= 100));
      await capture(page, 'after-maximum-index', '.atc-ops-model'); return { maximumBarPercent: bars };
    } finally { await page.close(); }
  });
  await check('Duplicate logging is blocked while same-band numeric differences remain visible', async () => {
    const page = await makePage();
    try {
      await range(page,'wind',9); await record(page); assert.equal(await page.locator('[data-atctower-ops-log]').isDisabled(), true);
      await range(page,'wind',10); await record(page); assert.equal(await delta(page), '+0.8');
      assert.equal(await page.locator('[data-atctower-ops-same-band]').count(),1); assert.equal((await data(page)).opsControl.log.length,2);
      assert.equal(await page.locator('[data-atctower-fair-test-check]').getAttribute('data-atctower-fair-test-check'),'one-variable');
      assert.equal(await page.getByRole('textbox', {name:'Evidence-based ATC load explanation'}).isDisabled(),false);
      await capture(page,'after-same-band-evidence','[data-atctower-ops-comparison]');
    } finally { await page.close(); }
  });
  await check('Different setups can share a score without being mislabeled as a fair one-variable test', async () => {
    const page=await makePage();
    try {
      await record(page); await range(page,'wind',16); await range(page,'timeout',55); await record(page);
      assert.equal(await delta(page),'0.0'); assert.equal(await page.locator('[data-atctower-ops-setting][data-changed="true"]').count(),2);
      assert.equal(await page.locator('[data-atctower-fair-test-check]').getAttribute('data-atctower-fair-test-check'),'multiple-variables');
      await page.getByRole('textbox',{name:'Evidence-based ATC load explanation'}).fill('Setup 2 raised wind and lengthened the decision window. The contributions offset each other; I cannot isolate wind from this comparison.');
      assert.equal(await page.locator('[data-atctower-inquiry-progress]').getAttribute('data-atctower-inquiry-progress'),'complete');
      assert.deepEqual(await page.evaluate(()=>window.__atcXP),[]);
    } finally { await page.close(); }
  });
  await check('Older evidence can be selected and loaded without rewriting the recorded comparison', async () => {
    const page=await makePage();
    try {
      for(const wind of [0,5,10,15,20,25,30]) { await range(page,'wind',wind); await record(page); }
      assert.equal(await page.locator('[data-atctower-ops-record]').count(),4);
      await page.locator('[data-atctower-ops-compare="first"]').selectOption('0');
      assert.equal(await delta(page),'+25.0');
      const saved=(await data(page)).opsControl.log;
      await page.locator('[data-atctower-ops-load-comparison="A"]').click();
      assert.equal(await page.locator('[data-atctower-ops-input="wind"]').inputValue(),'0');
      assert.equal(await page.locator('#atctower-ops-controls-title').evaluate(el=>document.activeElement===el),true);
      await range(page,'spawn',1); assert.equal(await delta(page),'+25.0'); assert.deepEqual((await data(page)).opsControl.log,saved);
      await page.locator('[data-atctower-ops-reset]').click(); assert.equal(await score(page),'54.3'); assert.deepEqual((await data(page)).opsControl.log,saved);
      await capture(page,'after-history-selection-1440');
    } finally { await page.close(); }
  });
  await check('Clear can be undone with evidence, explanation, focus, and current controls preserved', async () => {
    const page=await makePage(390);
    try {
      await pair(page); const explanation='Setup 2 changed only wind from 10 to 20 kt, adding 8.3 model points.';
      await page.getByRole('textbox',{name:'Evidence-based ATC load explanation'}).fill(explanation);
      const saved=(await data(page)).opsControl;
      await page.getByRole('button',{name:'Clear ATC evidence log and explanation',exact:true}).click();
      assert.deepEqual((await data(page)).opsControl.log,[]); assert.equal(await page.getByRole('textbox',{name:'Evidence-based ATC load explanation'}).isDisabled(),true);
      const undo=page.locator('[data-atctower-ops-undo]'); assert.equal(await undo.evaluate(el=>document.activeElement===el),true);
      await range(page,'wind',30); await undo.click();
      const restored=(await data(page)).opsControl; assert.deepEqual(restored.log,saved.log); assert.equal(restored.explanation,explanation); assert.equal(restored.wind,30);
      assert.equal(await page.locator('#atctower-ops-evidence-title').evaluate(el=>document.activeElement===el),true);
      assert.equal(await page.locator('[data-atctower-inquiry-progress]').getAttribute('data-atctower-inquiry-progress'),'complete');
      await fit(page); await axe(page);
    } finally { await page.close(); }
  });
  await check('Starting a new evidence log dismisses undo instead of restoring over the new investigation', async () => {
    const page=await makePage();
    try { await pair(page); await page.getByRole('button',{name:'Clear ATC evidence log and explanation',exact:true}).click(); await record(page); assert.equal(await page.locator('[data-atctower-ops-undo]').count(),0); assert.equal((await data(page)).opsControl.log.length,1); }
    finally { await page.close(); }
  });
  await check('Recorded evidence and explanation survive reopening and prompts only provide scaffolding', async () => {
    const original=await makePage(); let saved;
    try {
      await pair(original); await original.getByRole('textbox',{name:'Evidence-based ATC load explanation'}).fill('I changed only wind; the model contribution increased.');
      await original.getByRole('button',{name:"I'm stuck — show investigation prompts",exact:true}).click();
      assert.equal(await original.locator('[data-atctower-investigation-prompts]').count(),1); saved=await data(original);
    } finally { await original.close(); }
    const page=await makePage(320,saved);
    try { assert.deepEqual((await data(page)).opsControl,saved.opsControl); assert.equal(await delta(page),'+8.3'); assert.equal(await page.locator('[data-atctower-inquiry-progress]').getAttribute('data-atctower-inquiry-progress'),'complete'); await fit(page); await axe(page); await capture(page,'after-restored-320'); }
    finally { await page.close(); }
  });
  await check('Malformed restored values recover without manufacturing evidence or trusting saved scores', async () => {
    const normal={wind:10,spawn:5,sep:8,descent:1,timeout:30};
    const page=await makePage(320,{view:'menu',atcMenuPanel:'ops',opsControl:{wind:'bad',descent:null,explanation:'An old explanation',log:[null,{...normal,wind:'10'},{...normal,state:'Overload',loadIndex:999}]}});
    try { assert.equal(await score(page),'54.3'); assert.equal(await page.locator('[data-atctower-ops-record]').count(),1); assert.equal(await page.locator('[data-atctower-ops-record="3"] .atc-ops-record-score').innerText(),'54.3 / 100'); assert.equal(await page.locator('[data-atctower-inquiry-progress]').getAttribute('data-atctower-inquiry-progress'),'collect-evidence'); await range(page,'wind',20); await record(page); assert.equal((await data(page)).opsControl.log.length,4); assert.equal(await delta(page),'+8.3'); await fit(page); await axe(page); }
    finally { await page.close(); }
  });
  await check('Ops investigations preserve a real saved tower shift and resume it through the product control', async () => {
    const original=await makePage(); let saved;
    try { await original.locator('#stem-atctower-tab-practice').click(); await original.locator('[data-atctower-practice-start="first_landing"]').click(); await original.locator('[data-atctower-playing]').waitFor(); await original.waitForFunction(()=>!!window.__atcToolData.atcTower.activeShift); saved=await data(original); }
    finally { await original.close(); }
    const page=await makePage(390,{...saved,view:'menu'});
    try {
      await pair(page); await page.locator('[data-atctower-ops-load="1"]').click(); await page.locator('[data-atctower-ops-reset]').click();
      assert.deepEqual((await data(page)).activeShift,saved.activeShift); assert.deepEqual(await page.evaluate(()=>window.__atcXP),[]);
      await page.locator('[data-atctower-resume]').click(); await page.locator('[data-atctower-playing]').waitFor();
      const game=await page.evaluate(()=>window.__atcGameRef.current); assert.equal(game.practice.id,'first_landing'); assert.equal(game.time,0); assert.equal(game.paused,true);
    } finally { await page.close(); }
  });
  await check('Keyboard controls retain visible focus and the comparison chooses distinct records', async () => {
    const page=await makePage(320);
    try {
      await pair(page); const select=page.locator('[data-atctower-ops-compare="first"]'); await select.focus();
      const focused=await select.evaluate(el=>({focused:document.activeElement===el,outline:getComputedStyle(el).outlineStyle,width:Number.parseFloat(getComputedStyle(el).outlineWidth)})); assert.ok(focused.focused && focused.outline==='solid' && focused.width>=2);
      assert.equal(await select.locator('option[value="1"]').evaluate(el=>el.disabled && el.matches(':disabled')),true);
      await select.press('End'); assert.equal(await select.inputValue(),'0');
      const input=page.locator('[data-atctower-ops-input="wind"]'); await input.focus(); await input.press('ArrowLeft'); assert.equal(await input.inputValue(),'19'); assert.equal((await data(page)).view,'menu'); await capture(page,'after-keyboard-320','.atc-ops-controls');
    } finally { await page.close(); }
  });
  await check('Live score stays beside mobile and tablet controls while learners adjust every factor', async () => {
    for (const width of [320,390,900]) {
      const page=await makePage(width);
      try {
        const summary=page.locator('.atc-ops-mobile-score'); assert.equal(await summary.isVisible(),true);
        for (const [key,value] of Object.entries({wind:20,spawn:6,sep:9,descent:1.2,timeout:35})) {
          const control=page.locator('[data-atctower-ops-input="'+key+'"]');
          await control.evaluate(el=>el.scrollIntoView({block:'center'})); await range(page,key,value);
          assert.equal(await summary.locator('strong').innerText(),await score(page));
          const positions=await page.evaluate(key=>{const bar=document.querySelector('.atc-ops-mobile-score').getBoundingClientRect(),input=document.querySelector('[data-atctower-ops-input="'+key+'"]').getBoundingClientRect();return {barTop:bar.top,barBottom:bar.bottom,inputTop:input.top,inputBottom:input.bottom,height:innerHeight};},key);
          assert.ok(positions.barTop>=0 && positions.barBottom<positions.inputTop && positions.inputBottom<positions.height,JSON.stringify(positions));
        }
        await fit(page); await axe(page);
        const file=path.join(artifactDir,'after-live-controls-'+width+'.png'); await page.screenshot({path:file}); results.screenshots.push(file);
      } finally {await page.close();}
    }
  });
  await check('High contrast and forced colors at two hundred percent zoom preserve comparison and controls', async () => {
    const page=await makePage(390);
    try {
      await pair(page); await page.getByRole('button',{name:'High contrast',exact:true}).click(); assert.equal(await page.locator('.atc-ops').getAttribute('data-contrast'),'true');
      const colors=await page.locator('.atc-ops-model').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color})); assert.deepEqual(colors,{background:'rgb(0, 0, 0)',color:'rgb(255, 255, 255)'}); await fit(page); await axe(page); await capture(page,'after-high-contrast-390','.atc-ops-model');
    } finally { await page.close(); }
    const forced=await makePage(1280,null,{forcedColors:'active'});
    try { await forced.evaluate(()=>{document.documentElement.style.zoom='2'}); await pair(forced); await fit(forced); await axe(forced); assert.equal(await delta(forced),'+8.3'); await capture(forced,'after-forced-colors-200percent','[data-atctower-ops-comparison]'); }
    finally { await forced.close(); }
  });
}
async function main() {
  const source=path.join(repo,'stem_lab/stem_tool_atctower.js'), hash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'); results.sourceHash=hash(); fixture=await createFixtureServer();
  try { browser=await chromium.launch({channel:'chrome',headless:true}); await checks(); }
  finally { if(browser)await browser.close(); await new Promise(resolve=>fixture.server.close(resolve)); }
  results.passed=results.checks.filter(c=>c.pass).length; results.failed=results.checks.filter(c=>!c.pass).length; results.sourceStable=results.sourceHash===hash(); results.completed=new Date().toISOString();
  fs.writeFileSync(process.env.ATC_QA_RESULTS_PATH || path.join(artifactDir,'browser-qa-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({passed:results.passed,failed:results.failed,errors:results.errors,sourceStable:results.sourceStable,artifactDir}));
  if(!results.checks.length || results.failed || results.errors.length || !results.sourceStable)process.exitCode=1;
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
