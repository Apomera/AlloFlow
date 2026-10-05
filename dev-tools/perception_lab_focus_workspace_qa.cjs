'use strict';
// Real Chromium checks for the focused live workspace, keyboard access, matching safeguards, and responsive themes.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace/perception-focus-workspace');
fs.mkdirSync(out, { recursive: true });
// Keep every earlier attempt when a source fix or interrupted run needs a rerun.
if (fs.existsSync(path.join(out, 'focus-browser-results.json')) || fs.existsSync(path.join(out, 'focus-browser-failure.json'))) {
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

    const focus=page.locator('[data-perception-focus-dialog]'), current=page.locator('#perception-stage-current');
    const openFocus=async()=>{await button('Focus experiment').click();await paint();assert.equal(await focus.evaluate(node=>node.open),true);};
    const closeFocus=async()=>{await button('Back to workspace').click();await paint();assert.equal(await focus.evaluate(node=>node.open),false);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Focus experiment');};
    const geometry=()=>current.evaluate(node=>node.innerHTML);
    const shape=async()=>{
      await noOverflow();await targets();await accessibleSVGs();
      const result=await focus.evaluate(node=>({overflow:node.scrollWidth>node.clientWidth,bodyOverflow:node.querySelector('.perception-focus-body').scrollWidth>node.querySelector('.perception-focus-body').clientWidth,rect:{width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height},viewport:{width:innerWidth,height:innerHeight},workspaces:document.querySelectorAll('.perception-workspace').length,live:document.querySelectorAll('#perception-stage-current').length,notes:document.querySelectorAll('#perception-note').length,status:document.querySelectorAll('[role="status"]').length,ids:[...document.querySelectorAll('[id]')].map(el=>el.id)}));
      assert(!result.overflow&&!result.bodyOverflow);assert(result.rect.width>=result.viewport.width-25);assert(result.rect.height<=result.viewport.height);assert.equal(result.workspaces,1);assert.equal(result.live,1);assert.equal(result.notes,1);assert.equal(result.status,1);assert.equal(result.ids.length,new Set(result.ids).size);
    };
    for(const id of ['brightness','ebbinghaus','mullerLyer','cafeWall','necker','moire']){
      phase='experiment-'+id;await mount({experiment:id});const before=await allState(),svg=await geometry();await openFocus();
      assert.equal(await geometry(),svg);await shape();assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H2');
      assert.equal(await button('All tools').evaluate(node=>{node.focus();return document.activeElement===node;}),false,'Background navigation is inactive.');
      await audit('focus-'+id);await page.screenshot({path:path.join(out,'focus-'+id+'.png')});await closeFocus();assert.deepEqual(await allState(),before);assert.equal(await geometry(),svg);
      checks.push({experiment:id,liveGeometryPreserved:true,oneWorkspace:true,backgroundInert:true,axe:[]});
    }
    for(const width of [320,390,768,1280,1600]){
      phase='width-'+width;await page.setViewportSize({width,height:900});await mount({experiment:'ebbinghaus'});await openFocus();await shape();
      await audit('focus-'+width);await page.screenshot({path:path.join(out,'focus-'+width+'.png')});
      const before=await state();await button('Expand viewing area').click();await shape();await audit('expanded-'+width);await page.screenshot({path:path.join(out,'expanded-'+width+'.png')});
      await page.keyboard.press('Escape');assert.equal(await focus.evaluate(node=>node.open),false);assert.equal((await state()).expanded,true);assert.deepEqual((await state()).models,before.models);
      checks.push({width,fullWindowWorkspace:true,expandedPreservedOnEscape:true,axe:[]});
    }
    phase='live-save';await page.setViewportSize({width:1600,height:1100});await mount({experiment:'ebbinghaus'});await openFocus();
    await nativeInput(page.locator('#perception-surround'),47);await button('Left').click();await page.locator('#perception-note').fill('Full live note\nwith <literal> characters.');await button('Save observation').click();
    const saved=await state();assert.equal(saved.studies.length,1);assert.equal(saved.studies[0].model.surround,47);assert.equal(saved.studies[0].model.note,'Full live note\nwith <literal> characters.');
    assert((await focus.locator('[role="status"]').innerText()).includes('saved'));await closeFocus();assert.deepEqual(await state(),saved);checks.push({liveEditsSaved:true,fullNotePreserved:true,statusInsideDialog:true});
    phase='pinned';await mount({experiment:'ebbinghaus'});await openFocus();await button('Pin comparison').click();const pinned=(await state()).comparison;
    await nativeInput(page.locator('#perception-surround'),46);assert.deepEqual((await state()).comparison,pinned);await button('Expand viewing area').click();await shape();
    const scales=await page.locator('.perception-svg').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
    assert.equal(scales.length,2);assert(Math.abs(scales[0].width-scales[1].width)<1&&Math.abs(scales[0].height-scales[1].height)<1);await audit('focused-comparison');await page.screenshot({path:path.join(out,'focused-comparison.png')});
    await button('Clear comparison').click();assert.equal((await state()).comparison,null);await closeFocus();checks.push({livePinnedComparison:true,equalDrawingScale:true,axe:[]});
    phase='matching';await mount({models:{brightness:{matching:true}},comparison:{experiment:'brightness',model:{}}});await button('Start three matches').click();await openFocus();
    assert.equal(await button('Reveal measurements').isDisabled(),true);assert.equal(await button('Pin comparison').isDisabled(),true);assert.equal(await page.locator('#perception-stage-reference').count(),0);
    for(const value of [120,132,144]){await nativeInput(page.locator('#perception-match-value'),value);await button('Same').click();await button('Record match').click();}
    assert((await state()).studies.every(row=>!row.model.reveal));assert.equal(await page.locator('[data-perception-recorded-preview]').count(),0);await button('Reveal study results').click();
    await page.locator('[data-perception-enlarge="active"]').click();assert.equal(await page.locator('[data-perception-drawing-viewer]').evaluate(node=>node.open),true);assert.equal(await focus.evaluate(node=>node.open),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('[data-perception-drawing-viewer]').evaluate(node=>node.open),false);assert.equal(await focus.evaluate(node=>node.open),true);assert.equal(await page.evaluate(()=>document.activeElement.dataset.perceptionEnlarge),'active');
    await closeFocus();checks.push({threeMatchStudy:true,hiddenResultsProtected:true,nestedViewerReturnsToLiveWorkspace:true});
    phase='full-notebook';await mount({models:{brightness:{matching:true}},studies:Array.from({length:24},(_,index)=>({id:'record-'+index,experiment:'brightness',date:'',model:{}}))});await openFocus();await button('Review notebook').click();
    assert.equal(await focus.evaluate(node=>node.open),false);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Observation notebook');checks.push({fullNotebookNavigationClosesFocus:true});
    for(const theme of ['dark','contrast','forced-light','forced-dark']){
      phase='theme-'+theme;await page.emulateMedia({forcedColors:theme.startsWith('forced')?'active':'none',colorScheme:theme==='forced-dark'?'dark':'light'});await mount({experiment:'ebbinghaus'},theme==='dark',theme==='contrast');await openFocus();await shape();
      assert.equal(await current.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');await audit('focus-'+theme);await page.screenshot({path:path.join(out,'focus-'+theme+'.png')});await closeFocus();checks.push({theme,neutralDrawingSurface:true,axe:[]});
    }
    phase='large-text';await page.emulateMedia({forcedColors:'none',colorScheme:'light'});await page.setViewportSize({width:390,height:844});await mount({experiment:'brightness'});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await openFocus();await shape();await audit('focus-large-text');await page.screenshot({path:path.join(out,'focus-large-text.png')});await closeFocus();checks.push({text200Percent:true,axe:[]});
    phase='short-screen';await page.setViewportSize({width:568,height:320});await mount({experiment:'brightness'});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await openFocus();await shape();await audit('focus-short-screen');await button('Save observation').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'focus-short-screen.png')});await closeFocus();checks.push({shortLandscapeScreen:true,text200Percent:true,controlsReachableByScrolling:true,axe:[]});
    phase='keyboard';await page.setViewportSize({width:1280,height:1000});await mount({models:{brightness:{reveal:true}}});await openFocus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.tagName),'A');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Back to workspace');
    for(let index=0;index<30;index++){await page.keyboard.press('Tab');assert.equal(await focus.evaluate(node=>node.contains(document.activeElement)),true);}
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Focus experiment');checks.push({keyboardFocusContained:true,escapeRestoresFocus:true});
    phase='motion';await mount({experiment:'moire'});await button('Play slow rotation').click();await paint();await openFocus();assert.equal(await button('Play slow rotation').getAttribute('aria-pressed'),'false');await button('Play slow rotation').click();await paint();await closeFocus();assert.equal(await button('Play slow rotation').getAttribute('aria-pressed'),'false');checks.push({rotationPausesOnEntryAndExit:true});
    phase='external';await mount({experiment:'necker'});await openFocus();await edit({experiment:'moire'});assert.equal(await focus.evaluate(node=>node.open),false);assert.equal(await focus.innerText(),'');await openFocus();await page.evaluate(()=>__setProfile('another-learner'));assert.equal(await focus.evaluate(node=>node.open),false);checks.push({externalExperimentAndProfileCloseFocus:true});
    const finalSourceSHA256=sourceSHA256();assert.equal(finalSourceSHA256,loadedSourceSHA256);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'focus-browser-results.json'),JSON.stringify({checks,errors,sourceSHA256:finalSourceSHA256,loadedSourceSHA256,finalSourceSHA256},null,2));console.log(JSON.stringify({passedGroups:checks.length,errors,sourceSHA256:finalSourceSHA256}));
  }catch(error){fs.writeFileSync(path.join(out,'focus-browser-failure.json'),JSON.stringify({phase,message:error.message,stack:error.stack,checks,errors,loadedSourceSHA256,finalSourceSHA256:sourceSHA256()},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
