// Uses isolated Chromium contexts and intercepted localhost fixtures; no server,
// deployment, real app profile, external request, or existing browser state.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd(), read = file => fs.readFileSync(path.join(root, file), 'utf8');
const KEY = 'alloflow_reading_places_v1', ORIGIN = 'http://127.0.0.1:45871';
const scope = { learner: 'Blue', itemId: 'bird', fingerprint: 'exact', text: 'A heron waits.' };
const helper = read(process.env.ALLO_READING_PLACE_HELPER || 'reports/reader-place-copy-controls/reader_place_store.js'), results = [];
const moduleRoot = process.env.ALLO_READING_RECOVERY_UI_ROOT || 'reports/reader-place-copy-controls/';
const fixture = read('reports/reader-place-recovery-enhancement/conflict-ui.test.js');
const longLine = fixture.match(/^const LONG = .+;$/m)[0];
const itemFunction = fixture.slice(fixture.indexOf('function item('), fixture.indexOf('function mount('));
const props = fixture.match(/  const props = \{[\s\S]*?\};\r?\n  host =/)[0].replace(/\r?\n  host =$/, '');
const uiBoot = `window.AlloIcons = new Proxy({}, {get:()=>()=>null});
  const contract=window.AlloModules.InstructionalContext, pure=window.AlloModules.PureHelpers, phase=window.AlloModules.PhaseNHelpers;
  ${longLine}\n${itemFunction}
  window.mountReader=function(extra={}) { const noop=()=>{}, content=item(); ${props}
    window.readerRoot=ReactDOM.createRoot(document.getElementById('mount')); window.readerRoot.render(React.createElement(window.AlloModules.SimplifiedView,props)); };`;
const scripts = {
  '/react.js': read('desktop/web-app/node_modules/react/umd/react.development.js'),
  '/react-dom.js': read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'),
  '/contract.js': read('instructional_context_module.js'), '/pure.js': read('pure_helpers_module.js'), '/phase.js': read('phase_n_misc_helpers_module.js'),
  '/reader.js': read(moduleRoot + 'view_simplified_module.js'), '/ui-boot.js': uiBoot
};
const html = '<!doctype html><html><head><meta charset="utf-8"><title>Reader persistence fixture</title></head><body><button id="activate">Activate fixture</button><div id="mount"></div></body></html>';
const uiHtml = html.replace('</body>', Object.keys(scripts).map(url => `<script src="${url}"></script>`).join('') + '</body>');
let browser;
async function fresh() {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const body = scripts[url.pathname] || (url.pathname === '/ui' ? uiHtml : html);
    return route.fulfill({ status: 200, contentType: scripts[url.pathname] ? 'application/javascript' : 'text/html', body });
  });
  await context.addInitScript({ content: helper + `\nwindow.scope=${JSON.stringify(scope)};window.store=createReadingPlaceStore({getStorage:()=>localStorage,getLocks:()=>navigator.locks});store.watchPage(window);window.observed=[];window.addEventListener('storage',event=>{if(event.key==='${KEY}') {window.observed.push(event.newValue);store.load(scope);}});` });
  async function page(url = '/') { const p = await context.newPage(); await p.goto(ORIGIN + url); return p; }
  return { context, page };
}
async function test(name, run) {
  const start = Date.now(), f = await fresh();
  try { await run(f); results.push({ name, passed: true, milliseconds: Date.now() - start }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, passed: false, error: String(error.stack || error) }); console.error('FAIL ' + name + '\n' + error.stack); }
  finally { await f.context.close(); }
}
const save = (page, text, field = 'mainIdea') => page.evaluate(({ text, field }) => store.save(scope, { responses: { 0: { [field]: text } } }), { text, field });
const peek = page => page.evaluate(() => store.peek(scope));

(async () => {
  browser = await chromium.launch({ headless: true });
  await test('two real tabs merge independent fields and receive storage events', async f => {
    const a = await f.page(), b = await f.page();
    assert.equal(await a.evaluate(() => window.isSecureContext && !!navigator.locks), true);
    await Promise.all([a.evaluate(() => store.load(scope)), b.evaluate(() => store.load(scope))]);
    const writes = await Promise.all([save(a, 'Main idea'), save(b, 'Evidence', 'support')]);
    assert.ok(writes.every(x => x.status === 'saved'));
    await a.waitForFunction(() => store.load(scope).place.responses[0]?.support === 'Evidence');
    assert.deepEqual((await peek(a)).place.responses[0], { mainIdea: 'Main idea', support: 'Evidence' });
    assert.ok(await b.evaluate(() => observed.length > 0));
  });
  await test('two real tabs preserve competing drafts and reject stale conflict choices', async f => {
    const a = await f.page(), b = await f.page(); await save(a, 'First'); await b.evaluate(() => store.load(scope));
    await b.evaluate(() => { window.originalSet=Storage.prototype.setItem; Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');}; });
    await save(b, 'Local draft'); await b.evaluate(() => { Storage.prototype.setItem=originalSet; }); await save(a, 'Remote draft');
    assert.equal((await b.evaluate(() => store.save(scope, {}))).reason, 'conflict');
    await b.evaluate(() => { window.reviewed=store.review(scope); }); await save(a, 'Even newer');
    assert.equal((await b.evaluate(() => store.resolve(scope, reviewed, 'local'))).reason, 'review-changed');
    const chosen = await b.evaluate(() => store.resolve(scope, store.review(scope), 'saved'));
    assert.equal(chosen.place.responses[0].mainIdea, 'Even newer'); assert.equal(chosen.recoveryCopies[0].place.responses[0].mainIdea, 'Local draft');
  });
  await test('actual reload prompt protects failed work; accepted reload restores only durable work', async f => {
    const page = await f.page(); await page.click('#activate'); await save(page, 'Durable');
    await page.evaluate(() => { Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');}; });
    await save(page, 'Unsaved latest');
    let prompted = false; page.once('dialog', async dialog => { prompted = dialog.type() === 'beforeunload'; await dialog.dismiss(); });
    await page.reload({ timeout: 5000 }).catch(() => {}); assert.equal(prompted, true); assert.equal((await peek(page)).place.responses[0].mainIdea, 'Unsaved latest');
    page.once('dialog', dialog => dialog.accept()); await page.reload();
    assert.equal((await page.evaluate(() => store.load(scope))).place.responses[0].mainIdea, 'Durable');
  });
  await test('queued real Web Lock save is guarded until the lock is released', async f => {
    const a = await f.page(), b = await f.page();
    await a.evaluate(() => { navigator.locks.request(store.key, () => new Promise(resolve => { window.releaseLock=resolve; })); });
    await a.waitForFunction(() => !!window.releaseLock);
    await b.evaluate(() => { window.pending=store.save(scope,{responses:{0:{mainIdea:'Queued answer'}}}); });
    assert.equal((await peek(b)).status, 'saving'); assert.equal(await b.evaluate(() => store.hasUnsavedWork()), true);
    await a.evaluate(() => releaseLock()); assert.equal((await b.evaluate(() => pending)).status, 'saved');
    assert.equal(await b.evaluate(() => store.hasUnsavedWork()), false);
  });
  await test('denied reads and malformed records keep local text and durable bytes unchanged', async f => {
    const page = await f.page();
    await page.evaluate(key => localStorage.setItem(key, '{malformed'), KEY);
    assert.equal((await save(page, 'Recover me')).reason, 'corrupt-store');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), '{malformed');
    await page.evaluate(() => { window.originalGet=Storage.prototype.getItem; Storage.prototype.getItem=function(){throw new DOMException('Denied','SecurityError');}; });
    assert.equal((await save(page, 'Still recoverable')).reason, 'denied'); assert.equal((await peek(page)).place.responses[0].mainIdea, 'Still recoverable');
  });
  await test('native Chromium quota exhaustion retains the latest answer and the previous durable bytes', async f => {
    const page = await f.page(); await save(page, 'Earlier save');
    const prior = await page.evaluate(key => localStorage.getItem(key), KEY);
    const exhausted = await page.evaluate(() => {
      let quota = false;
      for (const size of [65536, 1024]) {
        for (let index=0;index<1024;index++) {
          try { localStorage.setItem('quota-fixture-'+size+'-'+index,'x'.repeat(size)); }
          catch(error) { if(error.name !== 'QuotaExceededError') throw error; quota=true; break; }
        }
      }
      return quota;
    });
    assert.equal(exhausted, true);
    const result = await save(page, 'x'.repeat(12000)); assert.equal(result.reason,'quota'); assert.equal(result.place.responses[0].mainIdea.length,12000);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),prior);
    assert.equal(await page.evaluate(()=>store.hasUnsavedWork()),true);
  });
  await test('legacy direct writes are detected on retry without migrating a bookmark to revised text', async f => {
    const a = await f.page(), b = await f.page(); await save(a, 'First');
    await a.evaluate(() => { window.originalSet=Storage.prototype.setItem; Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');}; });
    await save(a, 'This tab draft'); await a.evaluate(() => { Storage.prototype.setItem=originalSet; });
    await b.evaluate(key => { const rows=JSON.parse(localStorage.getItem(key));Object.values(rows)[0].responses[0].mainIdea='Legacy tab';localStorage.setItem(key,JSON.stringify(rows)); }, KEY);
    assert.equal((await a.evaluate(() => store.save(scope,{}))).reason, 'conflict');
    await b.evaluate(() => store.save(scope,{bookmark:{paragraph:0,snippet:'A heron waits.'}}));
    const revised = await a.evaluate(() => store.load({...scope,fingerprint:'revised',text:'A new passage.'}));
    assert.equal(revised.place.bookmark, undefined); assert.equal(revised.revised, true);
  });
  await test('real reader downloads readable anonymous recovery and keeps reload protection', async f => {
    const page = await f.page('/ui'), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => mountReader({ readingLearnerKey: '' }));
    await page.locator('[data-section-prompts-toggle]').click(); await page.locator('[data-section-prompt="mainIdea"]').fill('A patient bird.');
    await page.locator('[data-reading-storage-tools] > summary').click();
    const downloadEvent = page.waitForEvent('download'); await page.locator('[data-reading-download]').click();
    const download = await downloadEvent, file = await download.path(), text = fs.readFileSync(file,'utf8');
    assert.equal(download.suggestedFilename(), 'reading-work-recovery.txt'); assert.ok(text.includes('A patient bird.')); assert.ok(text.includes('What is the main idea?')); assert.ok(text.includes('The heron walked slowly'));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
    assert.ok((await page.locator('[data-reading-storage-tools]').innerText()).includes('Download requested'));
    assert.equal(await page.evaluate(() => { const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented; }),true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(__dirname, 'reader-recovery-browser.png'), fullPage: true });
  });
  await test('real reader restores a copy as a draft and saves only after explicit confirmation', async f => {
    const page=await f.page('/ui'); await page.evaluate(()=>mountReader());
    await page.locator('[data-section-prompts-toggle]').click(); await page.locator('[data-section-prompt="mainIdea"]').fill('Original answer');
    await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{}'))[0]?.responses[0]?.mainIdea==='Original answer',KEY);
    await page.locator('[data-reading-storage-tools] > summary').click(); await page.locator('[data-reading-storage-review]').click();
    await page.locator('[data-reading-storage-confirm]').check(); await page.locator('[data-reading-storage-remove]').click();
    await page.locator('[data-section-prompt="mainIdea"]').fill('Current answer');
    await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{}'))[0]?.responses[0]?.mainIdea==='Current answer',KEY);
    await page.locator('[data-reading-recovery-copies] > summary').click(); await page.locator('[data-reading-copy-review]').first().click();
    // Opening the review can scroll and legitimately save position metadata.
    // Capture the exact durable baseline at the restore action, in the same
    // browser task, so no pre-restore scroll timer can race the assertion.
    await page.locator('[data-reading-copy-restore]').focus();
    const raw=await page.evaluate(key=>{const before=localStorage.getItem(key);document.querySelector('[data-reading-copy-restore]').click();return before;},KEY);
    assert.equal(await page.locator('[data-section-prompt="mainIdea"]').inputValue(),'Original answer'); assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);
    await page.locator('[data-section-prompt="mainIdea"]').fill('Restored and checked'); assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);
    assert.equal(await page.locator('[data-reading-save-retry]').innerText(),'Save restored work'); await page.locator('[data-reading-save-retry]').click();
    await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{}'))[0]?.responses[0]?.mainIdea==='Restored and checked',KEY);
    while(await page.locator('[data-reading-copy-review]').count()) {
      await page.locator('[data-reading-copy-review]').first().click(); await page.locator('[data-reading-copy-confirm]').check(); await page.locator('[data-reading-copy-remove]').click();
    }
    assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),false);
    const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    await page.reload();
    const reloaded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    // Page-exit position saving may advance metadata. Authored work and its identity must survive exactly.
    assert.deepEqual(Object.keys(reloaded),Object.keys(persisted));
    for(const key of Object.keys(persisted)) for(const field of ['sourceText','responses','bookmark']) assert.deepEqual(reloaded[key][field],persisted[key][field]);
    await page.evaluate(()=>mountReader()); await page.locator('[data-section-prompts-toggle]').click();
    assert.equal(await page.locator('[data-section-prompt="mainIdea"]').inputValue(),'Restored and checked');
  });

  await browser.close(); browser = null;
  fs.writeFileSync(path.join(__dirname,'browser-results.json'), JSON.stringify({ at:new Date().toISOString(), browser:'Chromium', tests:results, limitation:'Legacy tabs do not participate in Web Locks. Detection on retry is tested; atomic safety against arbitrary legacy writers is not claimed.' },null,2)+'\n');
  if(results.some(x=>!x.passed)) process.exitCode=1;
})().catch(async error => { console.error(error); if(browser) await browser.close(); process.exitCode=1; });
