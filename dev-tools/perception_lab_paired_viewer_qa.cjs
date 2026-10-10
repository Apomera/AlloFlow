'use strict';
// Real Chromium checks for immutable, actual recorded-trial SVG previews.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-paired-viewer');
fs.mkdirSync(out, { recursive: true });
// Keep every earlier attempt when a source fix or interrupted run needs a rerun.
if (fs.existsSync(path.join(out, 'paired-viewer-browser-results.json')) || fs.existsSync(path.join(out, 'paired-viewer-browser-failure.json'))) {
  const previous = path.join(out, 'previous-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(previous);
  for (const item of fs.readdirSync(out, { withFileTypes: true })) if (item.isFile()) fs.copyFileSync(path.join(out, item.name), path.join(previous, item.name));
}
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright';
const sourceSHA256 = () => require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var init = {}; init[id] = state || {};', 'var init = {otherTool:{preserved:37}}; init[id] = state || {};')
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('isContrast: false', 'isContrast:!!window.__qaContrast')
  .replace('announceToSR: function(){}', 'announceToSR: function(message){window.__announced=message;}');
const fixtures = [
  { id: 'brightness', a: [81, 147, 203], b: [95, 156, 211], starts: [16, 240, 109], aModel: { target: 117, contrast: 65, swap: true }, bModel: { target: 117, contrast: 25, swap: false } },
  { id: 'ebbinghaus', a: [35, 53, 68], b: [40, 56, 70], starts: [32, 72, 51], aModel: { surround: 36, gap: 12, swap: false }, bModel: { surround: 45, gap: 20, swap: true } },
  { id: 'mullerLyer', a: [271, 409, 537], b: [294, 438, 522], starts: [250, 550, 411], aModel: { angle: 30, fin: 42, context: false }, bModel: { angle: 65, fin: 58, swap: true } },
];
const fullNote = trial => 'Recorded trial ' + trial + ': First line.\n' + 'Full note, retained word by word. '.repeat(12) + 'Last line of trial ' + trial + '.';
function records(fixture, groupId, values, revealed = true, settings = {}) {
  return [1, 2, 3].map((trial, index) => ({
    id: groupId + '-record-' + trial, experiment: fixture.id, date: '2026-10-04T14:0' + trial + ':00.000Z',
    model: { matching: true, reveal: revealed, prediction: fixture.id === 'mullerLyer' ? ['Top', 'Same', 'Bottom'][index] : ['Left', 'Same', 'Right'][index], note: fullNote(trial), matchValue: values[index], ...settings },
    repeat: { id: groupId, trial, startValue: fixture.starts[index] },
  }));
}
function seed(fixture = fixtures[0], options = {}) {
  const a = records(fixture, 'study-a', fixture.a, options.hiddenA !== true, fixture.aModel);
  const b = records(fixture, 'study-b', fixture.b, options.hiddenB !== true, fixture.bModel);
  const c = records(fixture, 'study-c', fixture.a.slice().reverse(), true, fixture.bModel);
  return { experiment: 'moire', models: { moire: { angle: 8.3, spacing: 19, prediction: 'Fine lines', note: 'Unfinished moiré draft' }, brightness: { target: 180, note: 'Separate brightness draft' } }, studies: [...a, ...b, ...c], comparison: { experiment: 'necker', model: { depth: 72, cue: 'front', reveal: true, note: 'Pinned cube' } } };
}

(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const checks = [], errors = [], loadedSourceSHA256 = sourceSHA256(); let phase = 'mount';
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })); await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_perception.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) }); await page.addScriptTag({ content: shell });
    const mount = async (state = seed(), dark = false, contrast = false) => page.evaluate(({ state, dark, contrast }) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); window.__qaContrast = contrast; document.documentElement.style.fontSize = ''; document.getElementById('slot').className = contrast ? 'theme-contrast' : dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, StemLab.PerceptionEngine.normalize(state)); }, { state, dark, contrast });
    const state = () => page.evaluate(() => __state.perceptionLab), allState = () => page.evaluate(() => __state);
    const button = name => page.getByRole('button', { name, exact: true });
    const preview = slot => page.locator('[data-perception-recorded-preview="' + slot + '"]');
    const scene = slot => page.locator('svg[data-perception-recorded-scene="' + slot + '"]');
    const trialControl = slot => page.locator('[data-perception-preview-trial="' + slot + '"]');
    const guides = slot => page.locator('[data-perception-preview-guides="' + slot + '"]');
    const openReview = async (id = 'study-a') => { await page.locator('[data-perception-study="' + id + '-record-1"]').getByRole('button', { name: 'Review study', exact: true }).click(); };
    const choosePair = async (id = 'study-b') => page.locator('[data-perception-study-selector]').selectOption(id);
    const openPair = async () => { await openReview(); await choosePair(); };
    const nativeInput = async (locator, value) => locator.evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); }, value);
    const edit = async change => page.evaluate(change => __edit(previous => ({ ...previous, perceptionLab: StemLab.PerceptionEngine.normalize({ ...previous.perceptionLab, ...change }) })), change);
    const none = async slots => { for (const slot of slots) { assert.equal(await preview(slot).count(), 0); assert.equal(await scene(slot).count(), 0); } };
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Viewport must not overflow horizontally.');
    const paint = async () => page.evaluate(() => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('No committed paint within 10 seconds.')), 10000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); })); }));
    const targets = async () => { const sizes = await page.locator('[data-perception-lab] button, [data-perception-preview-trial], [data-perception-study-selector], [data-perception-notebook-view], [data-perception-notebook-experiment], [data-perception-notebook-status], [data-perception-notebook-search]').evaluateAll(nodes => nodes.filter(node => node.offsetWidth && node.offsetHeight).map(node => ({ name: node.textContent.trim().slice(0, 80) || node.getAttribute('aria-label'), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))); assert(sizes.every(size => size.width >= 44 && size.height >= 44), 'Controls smaller than 44px: ' + JSON.stringify(sizes.filter(size => size.width < 44 || size.height < 44))); };
    const audit = async name => { await page.evaluate(() => scrollTo(0, 0)); await paint(); const violations = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.length, details: item.nodes.map(node => ({ html: node.html, target: node.target, failure: node.failureSummary })) }))); fs.writeFileSync(path.join(out, name + '-axe.json'), JSON.stringify(violations, null, 2)); assert.equal(violations.length, 0, name + ': accessibility failures saved in ' + name + '-axe.json'); };
    const accessibleSVGs = async () => { const info = await page.locator('[data-perception-lab] svg[role="img"]').evaluateAll(nodes => nodes.map(node => ({ viewBox: node.getAttribute('viewBox'), ids: node.getAttribute('aria-labelledby').split(/\s+/), namesResolve: node.getAttribute('aria-labelledby').split(/\s+/).every(id => document.getElementById(id)?.textContent.trim()), childIDs: [...node.querySelectorAll('title[id],desc[id]')].map(child => child.id) }))); const ids = info.flatMap(item => item.ids); assert.equal(ids.length, new Set(ids).size, 'Every SVG must have unique title and description IDs.'); assert(info.every(item => item.namesResolve && item.childIDs.length >= 1)); for (const slot of ['active', 'review', 'a', 'b']) if (await scene(slot).count()) assert.equal(await scene(slot).getAttribute('viewBox'), '0 0 800 480'); };
    // Compare complete SVG geometry with the selected persisted record; guides only change local reveal.
    const inspect = async (slot, groupId, trial, guideState = true) => {
      assert.equal(await trialControl(slot).inputValue(), String(trial)); assert.equal(await guides(slot).getAttribute('aria-pressed'), String(guideState)); assert.equal(await scene(slot).getAttribute('viewBox'), '0 0 800 480');
      assert.equal(await preview(slot).getByRole('combobox', { name: 'Recorded trial', exact: true }).count(), 1); assert.equal(await preview(slot).getByRole('button', { name: 'Show measurement guides', exact: true }).count(), 1);
      assert.deepEqual(await trialControl(slot).locator('option').evaluateAll(nodes => nodes.map(node => ({ value: node.value, text: node.textContent }))), [1, 2, 3].map(value => ({ value: String(value), text: 'Trial ' + value })));
      const actual = await scene(slot).evaluate(svg => { const convert = node => ({ tag: node.tagName.toLowerCase(), props: Object.fromEntries([...node.attributes].map(attr => [attr.name, attr.value]).sort(([a], [b]) => a.localeCompare(b))), children: [...node.childNodes].map(child => child.nodeType === Node.TEXT_NODE ? child.textContent : convert(child)) }); return [...svg.children].filter(child => !['title', 'desc'].includes(child.tagName.toLowerCase())).map(convert); });
      const expected = await page.evaluate(({ groupId, trial, guideState }) => { const record = __state.perceptionLab.studies.find(record => record.repeat?.id === groupId && record.repeat.trial === trial); if (!record) throw new Error('Selected recorded trial missing.'); const attr = key => ({ fontSize: 'font-size', fontFamily: 'font-family', textAnchor: 'text-anchor', strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap' }[key] || key); const convert = node => typeof node === 'string' ? node : ({ tag: node.tag.toLowerCase(), props: Object.fromEntries(Object.entries(node.props).map(([key, value]) => [attr(key), String(value)]).sort(([a], [b]) => a.localeCompare(b))), children: node.children.map(convert) }); return { nodes: StemLab.PerceptionEngine.scene(record.experiment, { ...record.model, reveal: guideState }).map(convert), record }; }, { groupId, trial, guideState });
      assert.deepEqual(actual, expected.nodes, slot + ' must render this actual trial, including its original surroundings.');
      const content = await preview(slot).innerText(); assert(content.includes(expected.record.model.prediction), 'Preview includes actual recorded impression.'); assert(content.replace(/\s+/g, ' ').includes(expected.record.model.note.replace(/\s+/g, ' ')), 'Preview includes the entire actual note.'); assert.equal(await preview(slot).locator('time').getAttribute('datetime'), expected.record.date);
      const target = await scene(slot).locator('[data-perception-target="right"]').evaluate(node => ({ tag: node.tagName.toLowerCase(), fill: node.getAttribute('fill'), r: Number(node.getAttribute('r')), x1: Number(node.getAttribute('x1')), x2: Number(node.getAttribute('x2')) })); const value = expected.record.model.matchValue;
      assert((await preview(slot).locator('[data-perception-recorded-values="' + slot + '"]').innerText()).includes(String(value)), 'Revealed actual values remain available when local guides are hidden.');
      if (expected.record.experiment === 'brightness') assert.equal(target.fill, 'rgb(' + value + ',' + value + ',' + value + ')');
      else if (expected.record.experiment === 'ebbinghaus') assert.equal(target.r, value / 2);
      else assert.equal(target.x2 - target.x1, value);
      if (guideState) assert(await scene(slot).locator('[data-perception-guide]').count()); else assert.equal(await scene(slot).locator('[data-perception-guide]').count(), 0);
      return expected.record;
    };

    const dialog = page.locator('[data-perception-drawing-viewer]');
    const pairLayout = page.locator('[data-perception-viewer-pair]');
    const open = async () => { await button('Compare enlarged drawings').click(); await paint(); assert(await dialog.evaluate(node => node.open && node.matches(':modal'))); };
    const closed = async () => { await paint(); assert.equal(await dialog.evaluate(node => node.open), false); assert.equal(await dialog.locator('svg').count(), 0); };
    const close = async () => { await button('Close enlarged drawing').click(); await closed(); };
    const stack = async () => { await button('Stack drawings for more space').click(); await paint(); };
    const focusInside = () => dialog.evaluate(node => node.contains(document.activeElement));
    const sizes = () => pairLayout.evaluate(node => [...node.querySelectorAll('svg')].map(svg => { const r = svg.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right }; }));
    const equalScale = async () => { const [a,b] = await sizes(); assert(Math.abs(a.width-b.width)<1 && Math.abs(a.height-b.height)<1, 'Both recorded drawings must use the same display scale.'); return [a,b]; };
    for (const fixture of fixtures) {
      phase = fixture.id + '-actual-pair'; await mount({...seed(fixture),expanded:true}); await openPair();
      await trialControl('a').selectOption('2'); await trialControl('b').selectOption('3'); await guides('b').click(); const before = await allState(); await open();
      assert.equal(await page.evaluate(() => document.activeElement.tagName),'H2');
      await inspect('viewer-a','study-a',2); await inspect('viewer-b','study-b',3,false);
      for (const trial of [1,2,3]) { await trialControl('viewer-a').selectOption(String(trial)); await trialControl('viewer-b').selectOption(String(4-trial)); await inspect('viewer-a','study-a',trial); await inspect('viewer-b','study-b',4-trial,false); }
      await guides('viewer-a').click(); await inspect('viewer-a','study-a',3,false); await accessibleSVGs(); await equalScale();
      for (const key of ['Tab','Shift+Tab']) for (let index=0;index<12;index++) { await page.keyboard.press(key); assert(await focusInside(),'Pair viewer must retain keyboard focus.'); }
      await stack(); assert.equal(await pairLayout.getAttribute('data-stacked'),'true'); assert.equal(await button('Stack drawings for more space').getAttribute('aria-pressed'),'true');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.perceptionViewerStack),'true'); await equalScale();
      await page.keyboard.press('Escape'); await closed(); assert.equal(await page.evaluate(() => document.activeElement.dataset.perceptionEnlargePair),'true');
      assert.equal(await trialControl('a').inputValue(),'3'); assert.equal(await trialControl('b').inputValue(),'1'); assert.deepEqual(await allState(),before);
      await open(); assert.equal(await pairLayout.getAttribute('data-stacked'),'false'); await inspect('viewer-b','study-b',1,false); await close();
      checks.push({experiment:fixture.id,exactActualGeometryBothStudies:true,independentTrialsAndGuides:true,sameDisplayScale:true,keyboardFocusAndEscape:true,preservedAllState:true});
    }
    for (const reason of ['hidden','partial','conflict','reference','experiment']) {
      phase='blocked-'+reason; const value=seed();
      if(reason==='hidden')value.studies[3].model.reveal=false;
      if(reason==='partial')value.studies=value.studies.filter(record=>record.id!=='study-b-record-3');
      if(reason==='conflict')value.studies[3].model.contrast=3;
      if(reason==='reference')value.studies.filter(record=>record.repeat.id==='study-b').forEach(record=>record.model.target=200);
      if(reason==='experiment')value.studies=value.studies.filter(record=>record.repeat.id!=='study-b').concat(records(fixtures[1],'study-b',fixtures[1].b,true,fixtures[1].bModel));
      await mount(value); await openReview(); await page.locator('[data-perception-study-selector]').evaluate(node=>{node.value='study-b';node.dispatchEvent(new Event('change',{bubbles:true}));});
      assert.equal(await page.locator('[data-perception-enlarge-pair]').count(),0); await closed(); checks.push({blockedPair:reason,noPairedDrawing:true});
    }
    for (const id of ['study-a','study-b']) for (const reason of ['remove','hide','note','settings']) {
      phase='invalidate-'+id+'-'+reason; await mount(); await openPair(); await open();
      await page.evaluate(({id,reason})=>__edit(previous=>{const next=JSON.parse(JSON.stringify(previous)),record=next.perceptionLab.studies.find(record=>record.id===id+'-record-2');
        if(reason==='remove')next.perceptionLab.studies=next.perceptionLab.studies.filter(item=>item!==record);
        if(reason==='hide')record.model.reveal=false;
        if(reason==='note')record.model.note='Updated saved note';
        if(reason==='settings')record.model.contrast=3;
        return next;
      }),{id,reason}); await closed(); assert.equal(await pairLayout.count(),0); checks.push({invalidatedStudy:id,reason,bothDrawingsRemoved:true});
    }
    for (const reason of ['profile','selection','close-review']) {
      phase=reason; await mount(); await openPair(); await open();
      await page.evaluate(reason=>{
        if(reason==='profile')__setProfile('another-learner');
        if(reason==='close-review')[...document.querySelectorAll('button')].find(node=>node.textContent==='Close study review').click();
        if(reason==='selection'){const node=document.querySelector('[data-perception-study-selector]');node.value='study-c';node.dispatchEvent(new Event('change',{bubbles:true}));}
      },reason); await closed(); checks.push({changed:reason,bothDrawingsRemoved:true});
    }
    phase='filters-and-drafts'; await mount(); await openPair(); await open(); await trialControl('viewer-b').selectOption('3'); await stack();
    await page.locator('[data-perception-notebook-search]').evaluate(node=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,'no matching record');node.dispatchEvent(new Event('input',{bubbles:true}));});
    await edit({models:{...(await state()).models,moire:{...(await state()).models.moire,note:'Updated live draft'}}}); await paint();
    assert(await dialog.evaluate(node=>node.open)); assert.equal(await trialControl('viewer-b').inputValue(),'3'); assert.equal(await pairLayout.getAttribute('data-stacked'),'true'); await close(); checks.push({filterAndDraftPreserveViewer:true});
    for (const width of [320,390,768,1280,1600]) {
      phase='width-'+width; await page.setViewportSize({width,height:1000}); await mount(); await openPair(); await open();
      await noOverflow(); await targets(); await accessibleSVGs(); let [a,b]=await equalScale();
      if(width<=768)assert(b.y>a.y); else assert(Math.abs(a.y-b.y)<1);
      assert(a.x>=0&&a.right<=width&&b.x>=0&&b.right<=width);
      await audit('pair-'+width); await dialog.screenshot({path:path.join(out,'pair-'+width+'.png')});
      // Measure the projected viewBox: the SVG element itself can contain letterboxing.
      const projection = async side => page.locator('[data-perception-recorded-scene="viewer-'+side+'"]').evaluate(svg => {
        const matrix=svg.getScreenCTM(),figure=svg.closest('figure');
        return { x:matrix.a,y:matrix.d,b:matrix.b,c:matrix.c,fit:Math.min(figure.clientWidth/800,innerHeight*.65/480) };
      });
      const initialProjection=await projection('a'); await stack(); [a,b]=await equalScale(); assert(b.y>a.y);
      const projectedA=await projection('a'),projectedB=await projection('b');
      for(const projected of [projectedA,projectedB]){
        assert(Math.abs(projected.x-projected.fit)<.002&&Math.abs(projected.y-projected.fit)<.002,'Stack must fit the complete drawing at the available scale.');
        assert(Math.abs(projected.b)<.001&&Math.abs(projected.c)<.001,'Stack must preserve drawing orientation.');
      }
      assert(Math.abs(projectedA.x-projectedB.x)<.002,'Stack must preserve equal A/B drawing scale.');
      if(width>=1280)assert(projectedA.x>initialProjection.x,'Stack must enlarge the actual drawing at desktop widths.');
      if(width===1600)await dialog.screenshot({path:path.join(out,'pair-stacked-1600.png')});
      for(const slot of ['viewer-a','viewer-b']){await preview(slot).locator('.perception-recorded-note').scrollIntoViewIfNeeded();assert(await preview(slot).locator('.perception-recorded-note').isVisible());}
      await close(); checks.push({width,equalScale:true,responsiveStacking:true,manualStacking:true,controls44px:true,fullNotesReachable:true,axe:[]});
    }
    await page.setViewportSize({width:1280,height:1000});
    for(const theme of ['dark','contrast','forced-light','forced-dark']){
      phase=theme; await page.emulateMedia({forcedColors:theme.startsWith('forced')?'active':'none',colorScheme:theme==='forced-dark'?'dark':'light'}); await mount(seed(fixtures[1]),theme==='dark',theme==='contrast'); await openPair(); await open();
      for(const slot of ['viewer-a','viewer-b']){const color=await scene(slot).evaluate(svg=>({background:getComputedStyle(svg).backgroundColor,forced:getComputedStyle(svg).forcedColorAdjust}));assert.equal(color.background,'rgb(255, 255, 255)');assert.equal(color.forced,'none');}
      await equalScale(); await noOverflow(); await targets(); await audit('pair-'+theme); await dialog.screenshot({path:path.join(out,'pair-'+theme+'.png')}); await close(); checks.push({theme,preservedDrawingColors:true,axe:[]});
    }
    phase='large-text'; await page.emulateMedia({forcedColors:'none',colorScheme:'light'}); await page.setViewportSize({width:390,height:844}); await mount(); await page.evaluate(()=>document.documentElement.style.fontSize='32px'); await openPair(); await open();
    await equalScale(); await noOverflow(); await targets(); await audit('pair-large-text'); await dialog.screenshot({path:path.join(out,'pair-large-text.png')});
    for(const [slot,id] of [['viewer-a','study-a'],['viewer-b','study-b']]){await scene(slot).scrollIntoViewIfNeeded();await inspect(slot,id,1);await preview(slot).locator('.perception-recorded-note').scrollIntoViewIfNeeded();assert(await preview(slot).locator('.perception-recorded-note').isVisible());}
    await scene('viewer-b').scrollIntoViewIfNeeded(); await dialog.screenshot({path:path.join(out,'pair-large-text-b.png')}); await close(); checks.push({text200Percent:true,bothDrawingsAndFullNotesReachable:true,axe:[]});
    phase='single-pair-transition'; await mount(); await openPair(); await open(); await trialControl('viewer-b').selectOption('3'); await close();
    await page.locator('[data-perception-enlarge="a"]').click(); await paint(); assert.equal(await pairLayout.count(),0); await inspect('viewer','study-a',1); await close(); await open(); await inspect('viewer-b','study-b',3); await close(); checks.push({singleAndPairViewersIsolated:true});
    phase='unmount'; await mount(); await openPair(); await open(); await page.evaluate(()=>ReactDOM.unmountComponentAtNode(document.getElementById('slot'))); assert.equal(await page.locator('dialog:modal').count(),0); checks.push({unmountReleasesModal:true});
    const finalSourceSHA256=sourceSHA256();assert.equal(finalSourceSHA256,loadedSourceSHA256);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'paired-viewer-browser-results.json'),JSON.stringify({checks,errors,sourceSHA256:finalSourceSHA256,loadedSourceSHA256,finalSourceSHA256},null,2));console.log(JSON.stringify({passedGroups:checks.length,errors,sourceSHA256:finalSourceSHA256}));
  }catch(error){fs.writeFileSync(path.join(out,'paired-viewer-browser-failure.json'),JSON.stringify({phase,message:error.message,stack:error.stack,checks,errors,loadedSourceSHA256,finalSourceSHA256:sourceSHA256()},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
