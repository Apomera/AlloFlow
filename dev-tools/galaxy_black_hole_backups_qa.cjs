// Genuine React and WebGL scene with deterministic local investigation inputs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-black-hole-backups-2026-10-01');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, hasTouch: true });
    const errors = [], checks = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ path: path.join(ROOT, cssAsset) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => page.evaluate(() => window.__galaxyState);
    const patch = async data => { await page.evaluate(data => window.__patchGalaxy(data), data); await settle(); };
    const click = async name => { await page.getByRole('button', { name, exact: true }).click(); await settle(); };



    const canvas=page.locator('[data-black-hole-canvas]'),book=page.locator('[data-bh-notebook]'),preview=page.locator('[data-bh-import-preview]');
    const release={blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:0,blackHoleRadialVelocity:0,blackHoleLaunchAngle:0};
    const record=(i,changes={})=>({id:'local_'+i,number:i,note:'Local note '+i,settings:{...release},...changes});
    const ready=()=>page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHoleReleaseSettings);
    const mount=async data=>{await page.evaluate(data=>window.__mount({simMode:'blackHole',blackHolePaused:true,...data}),data);await ready();await settle();};
    const openBook=async()=>{if(!await book.locator('details').evaluate(e=>e.open))await book.locator('summary').click();await settle();};
    const snapshot=()=>canvas.evaluate(c=>{const s=c._blackHoleExperimentState();return {settings:c._blackHoleReleaseSettings(),time:s.time,released:s.released,yaw:s.cameraYaw,comparison:c._blackHolePredictionState().comparison};});
    const save=async()=>{await page.locator('[data-bh-notebook-save]').click();await settle();};
    const status=()=>page.locator('[data-bh-notebook-status]').textContent();
    const file=async(data,name='experiment-backup.json')=>{const chooser=page.waitForEvent('filechooser');await page.locator('[data-bh-notebook-import]').click();await (await chooser).setFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});await settle();};
    const loaded=()=>page.locator('[data-bh-import-apply]').waitFor({state:'visible'});
    const apply=async()=>{await page.locator('[data-bh-import-apply]').click();await settle();};
    const undo=async()=>{await page.locator('[data-bh-notebook-undo-import]').click();await settle();};
    const selectAll=async ids=>{for(const id of ids)await page.locator('[data-bh-import-entry="'+id+'"]').check();await settle();};
    const checkUnchanged=async before=>assert.deepEqual(await snapshot(),before);

    await mount({...release,metalHunt:{hypothesis:'Preserve this separate investigation.'}});await openBook();await save();let data=await state(),firstId=data.blackHoleNotebook[0].id;
    await page.locator('[data-bh-notebook-title="'+firstId+'"]').fill('Capture control');await page.locator('[data-bh-notebook-note="'+firstId+'"]').fill('Plain <script>note text</script>');await settle();
    await click('Orbit');await openBook();await save();data=await state();const secondId=data.blackHoleNotebook[1].id;
    await page.locator('[data-bh-notebook-title="'+secondId+'"]').fill('Orbit branch');await page.locator('[data-bh-notebook-note="'+secondId+'"]').fill('Circular center path');await page.locator('[data-bh-notebook-compare="'+secondId+'"]').click();await settle();
    const named=JSON.parse(JSON.stringify(await state()));await mount(named);await openBook();assert.equal(await page.locator('[data-bh-notebook-entry="'+firstId+'"] h5').textContent(),'Capture control');assert.equal(await page.locator('[data-bh-notebook-entry="'+secondId+'"] h5').textContent(),'Orbit branch');
    const downloadPromise=page.waitForEvent('download');await page.locator('[data-bh-notebook-export]').click();const download=await downloadPromise,exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.experiments[0].title,'Capture control');assert.equal(exported.experiments[1].title,'Orbit branch');assert.deepEqual(exported.experiments[0].settings,named.blackHoleNotebook[0].settings);assert.deepEqual(exported.comparison,named.blackHoleComparison);
    fs.writeFileSync(path.join(OUT,'exported-named-experiments.json'),JSON.stringify(exported,null,2));
    checks.push('Custom experiment names persist through JSON remounting and export with their notes, release settings, and reference.');

    const previousReference={...release,blackHoleReleaseRadius:4,blackHoleLaunchAngle:-80};
    await mount({...release,blackHoleReleaseRadius:6,blackHoleSideways:.8,blackHoleComparison:previousReference,metalHunt:{hypothesis:'Preserve this separate investigation.'}});await click('Release here');await canvas.evaluate(c=>c._seekBlackHoleExperiment(.4));await settle();await openBook();const before=await snapshot();
    const forged=JSON.parse(JSON.stringify(exported));forged.experiments[1].prediction={outcome:'captured',minimumRadius:1};forged.model='<img src=x onerror=alert(1)>';
    await file(forged);await loaded();await checkUnchanged(before);assert.equal((await state()).blackHoleNotebook,undefined);assert.equal(await page.locator('[data-bh-import-reference]').isChecked(),false);assert.equal(await page.locator('[data-bh-import-outcome="'+secondId+'"]').textContent(),'Circular center orbit');assert.equal(await book.locator('img').count(),0);
    await apply();data=await state();assert.equal(data.blackHoleNotebook.length,2);assert.equal(data.blackHoleNotebook[0].title,'Capture control');assert.equal(data.blackHoleNotebook[0].note,exported.experiments[0].note);await checkUnchanged(before);assert.equal(data.metalHunt.hypothesis,'Preserve this separate investigation.');
    await page.locator('[data-bh-notebook-title="'+firstId+'"]').fill('Edited control');await page.locator('[data-bh-notebook-note="'+firstId+'"]').fill('New work after import');await save();data=await state();const newId=data.blackHoleNotebook[2].id;await page.locator('[data-bh-notebook-note="'+newId+'"]').fill('Unrelated new release');await settle();
    await undo();data=await state();assert.deepEqual(data.blackHoleNotebook.map(e=>e.id),[firstId,newId]);assert.equal(data.blackHoleNotebook[0].title,'Edited control');assert.equal(data.blackHoleNotebook[1].note,'Unrelated new release');assert((await status()).includes('Removed: 1. Kept with new edits: 1.'));await checkUnchanged(before);
    checks.push('Preview is read-only, ignores forged predictions and metadata, and imports selected data without moving the current run or reference. Undo preserves later edits and unrelated work.');

    await mount({...release,blackHoleComparison:previousReference});await openBook();const previousLine=(await snapshot()).comparison.positions;
    await file(exported);await loaded();await page.locator('[data-bh-import-reference]').check();await apply();assert.deepEqual((await state()).blackHoleComparison,exported.comparison);assert((await status()).includes('kept reference is now in use'));await undo();data=await state();assert.equal(data.blackHoleNotebook.length,0);assert.deepEqual(data.blackHoleComparison,previousReference);assert.deepEqual((await snapshot()).comparison.positions,previousLine);assert.equal(data.blackHoleNotebookSerial,2);
    await file(exported);await loaded();await page.locator('[data-bh-import-reference]').check();await apply();await page.locator('[data-bh-notebook-compare="'+firstId+'"]').click();await settle();const chosenReference=(await state()).blackHoleComparison;await undo();assert.deepEqual((await state()).blackHoleComparison,chosenReference);
    checks.push('The backup reference is an explicit opt-in. Undo restores the previous reference, retains a reference selected later, and keeps experiment numbering monotonic.');

    await mount(named);await openBook();await file(exported);await loaded();assert.equal(await page.locator('[data-bh-import-entry]:disabled').count(),2);assert.equal(await page.locator('[data-bh-import-apply]').isDisabled(),true);await page.locator('[data-bh-import-cancel]').click();
    await page.locator('[data-bh-notebook-note="'+firstId+'"]').fill('Keep the local edition');await settle();await file(exported);await loaded();assert.equal(await page.locator('[data-bh-import-entry="'+firstId+'"]').isDisabled(),false);assert.equal(await page.locator('[data-bh-import-entry="'+secondId+'"]').isDisabled(),true);await apply();data=await state();assert.equal(data.blackHoleNotebook.length,3);assert.equal(data.blackHoleNotebook[0].note,'Keep the local edition');assert.notEqual(data.blackHoleNotebook[2].id,firstId);assert.equal(data.blackHoleNotebook[2].note,exported.experiments[0].note);assert.equal(data.blackHoleNotebook[2].number,3);
    checks.push('Unchanged saved IDs are skipped; conflicting local notes remain intact and the backup becomes a separate record.');

    const seven=Array.from({length:7},(_,i)=>record(i+1));await mount({...release,blackHoleNotebook:seven,blackHoleNotebookSerial:7});await openBook();await file(exported);await loaded();assert.equal(await page.locator('[data-bh-import-entry]:checked').count(),1);assert.equal(await page.locator('[data-bh-import-entry]').count(),2);await selectAll([firstId,secondId]);assert.equal(await page.locator('[data-bh-import-apply]').isDisabled(),true);assert.deepEqual((await state()).blackHoleNotebook,seven);
    await page.locator('[data-bh-notebook-remove="local_7"]').click();await settle();assert.equal(await page.locator('[data-bh-import-apply]').isDisabled(),false);await apply();assert.equal((await state()).blackHoleNotebook.length,8);assert.equal((await state()).blackHoleNotebook[0].note,'Local note 1');await undo();assert.equal((await state()).blackHoleNotebook.length,6);await page.locator('[data-bh-notebook-undo]').click();await settle();assert.deepEqual((await state()).blackHoleNotebook,seven);
    checks.push('The preview shows every incoming record and enforces available capacity without eviction; making room and separate removal/import undo actions preserve all existing notes.');

    const invalid=[['{broken','format'],[{...exported,version:2},'version'],[{...exported,experiments:[{...exported.experiments[0],settings:{...release,blackHoleReleaseRadius:100}}]},'entries'],[{...exported,experiments:[exported.experiments[0],exported.experiments[0]]},'entries'],['x'.repeat(262145),'size']];
    const protectedData=JSON.parse(JSON.stringify(await state()));
    for(const [input,error] of invalid){await file(input,error+'.json');await page.waitForFunction(()=>!document.querySelector('[data-bh-import-preview]'));assert.deepEqual(await state(),protectedData);assert((await status()).length>10);}
    checks.push('Malformed JSON, unsupported versions, invalid releases, duplicate IDs, and oversized files produce feedback without changing saved data.');

    await page.evaluate(()=>{const original=File.prototype.text;window.__backupReads=[];window.__delayBackupRead=true;File.prototype.text=function(){if(!window.__delayBackupRead)return original.call(this);const file=this;return new Promise((resolve,reject)=>window.__backupReads.push({resolve:()=>original.call(file).then(resolve,reject),reject:()=>reject(new Error('Simulated file read failure'))}));};});
    const fileA={...exported,experiments:[{...exported.experiments[0],id:'read_A',title:'File A'}]},fileB={...exported,experiments:[{...exported.experiments[1],id:'read_B',title:'File B'}]};
    await file(fileA,'A.json');assert.equal(await preview.getAttribute('aria-busy'),'true');await file(fileB,'B.json');await page.evaluate(()=>window.__backupReads[1].resolve());await loaded();assert.equal(await page.locator('[data-bh-import-entry="read_B"]').count(),1);await page.evaluate(()=>window.__backupReads[0].resolve());await settle();assert.equal(await page.locator('[data-bh-import-entry="read_A"]').count(),0);
    await page.locator('[data-bh-import-cancel]').click();await file(fileA,'cancel.json');await page.locator('[data-bh-import-cancel]').click();const cancelled=await status();await page.evaluate(()=>window.__backupReads[2].reject());await settle();assert.equal(await status(),cancelled);assert.equal(await preview.count(),0);
    await file(fileA,'mode.json');await page.locator('[data-galaxy-mode="star"]').click();await settle();await page.evaluate(()=>window.__backupReads[3].resolve());await settle();await page.locator('[data-galaxy-mode="blackHole"]').click();await ready();await openBook();assert.equal(await preview.count(),0);assert.equal(await status(),'');assert.deepEqual((await state()).blackHoleNotebook,seven);
    await file(fileA,'remount.json');const saved=JSON.parse(JSON.stringify(await state()));await mount(saved);await openBook();await page.evaluate(()=>window.__backupReads[4].resolve());await settle();assert.equal(await preview.count(),0);assert.equal(await status(),'');assert.deepEqual((await state()).blackHoleNotebook,seven);
    await file(fileB,'read-error.json');await page.evaluate(()=>window.__backupReads[5].reject());await page.waitForFunction(()=>!document.querySelector('[data-bh-import-preview]'));assert((await status()).includes('could not be read'));await page.evaluate(()=>window.__delayBackupRead=false);
    checks.push('Overlapping reads use the latest file; cancellation, mode changes, unmounting, and read failures cannot reopen a stale preview or modify the notebook.');

    const layouts=[],longBackup=JSON.parse(JSON.stringify(exported));longBackup.experiments[0].title='Experiment '+ 'X'.repeat(69);longBackup.experiments[0].note='Evidence '.repeat(65);longBackup.experiments[0].id='long_entry';
    for(const width of [1440,390,320]){await page.setViewportSize({width,height:1100});await mount({...named,blackHoleNotebook:named.blackHoleNotebook.map(e=>({...e,title:'T'.repeat(80)}))});await openBook();await file(longBackup,'long-backup-name-'+ 'N'.repeat(130)+'.json');await loaded();await preview.scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const targets=await book.locator('button:visible,input[type=text]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(targets.every(h=>h>=44));assert.equal(await book.locator('img').count(),0);const overflow=await book.locator('[data-bh-notebook-entry],[data-bh-import-preview],[data-bh-import-list]').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.outerHTML.slice(0,120)));assert.deepEqual(overflow,[]);assert.equal(await page.locator('[data-bh-import-entry="long_entry"]').getAttribute('aria-label'),'Select '+longBackup.experiments[0].title+' for import');
      await preview.screenshot({path:path.join(OUT,'import-preview-'+width+'.png')});await page.locator('[data-bh-notebook-entry]').first().screenshot({path:path.join(OUT,'named-experiment-'+width+'.png')});layouts.push({width,noOverflow:true,touchTargets:true});}
    await page.evaluate(()=>document.documentElement.dir='rtl');await preview.scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await preview.screenshot({path:path.join(OUT,'import-preview-320-rtl.png')});
    checks.push('Long names, notes, and filenames remain plain text and fit 1440, 390, 320 px and RTL layouts with accessible selection labels and touch targets.');
    const demo=JSON.parse(JSON.stringify(exported));demo.experiments[0].note='Release from five horizon radii with no sideways motion.';demo.experiments[1].note='Compare a circular center orbit with the capture control.';
    for(const width of [1440,390,320]){await page.setViewportSize({width,height:1100});await page.evaluate(()=>document.documentElement.dir='ltr');await mount({...release,blackHoleNotebook:[record(1,{title:'Existing investigation'})],blackHoleNotebookSerial:1});await openBook();await file(demo,'galaxy-black-hole-experiments.json');await loaded();await preview.scrollIntoViewIfNeeded();await settle();await preview.screenshot({path:path.join(OUT,'workflow-preview-'+width+'.png')});await apply();await page.locator('[data-bh-notebook-entry]').last().screenshot({path:path.join(OUT,'workflow-named-'+width+'.png')});}
    const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'galaxy'});return !c.isConnected&&!c._setBlackHoleComparison&&!c._blackHoleReleaseSettings;});assert(cleanup);assert.deepEqual(errors,[]);const result={passed:true,checks,layouts,cleanup,errors};fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }catch(error){if(page){console.log('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({tool:window.__galaxyState,preview:document.querySelector('[data-bh-import-preview]')?.textContent,status:document.querySelector('[data-bh-notebook-status]')?.textContent}))));await page.screenshot({path:path.join(OUT,'failure.png')});}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
