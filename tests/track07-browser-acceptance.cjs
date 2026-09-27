const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [], results = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => route.abort());
  try {
    await page.setContent('<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','instructional_context_module.js','pure_helpers_module.js','phase_n_misc_helpers_module.js','text_pipeline_helpers_module.js','generation_helpers_module.js','view_simplified_module.js','tests/track07-browser-fixture.js']) await page.addScriptTag({ path: path.join(root,file) });
    const mount = async options => { await page.evaluate(options => mountReading(options),options || {}); await expect(page.locator('[data-adapt-keep-terms]')).toBeVisible(); };
    const preview = async (terms='wading birds') => { await page.locator('[data-adapt-keep-terms]').fill(terms); await page.locator('[data-apply-complexity]').click(); };
    const apply = async () => { await page.locator('[data-adaptation-apply]').focus(); await page.keyboard.press('Enter'); };
    const check = async (name, fn) => { try { await fn(); results.push({name,status:'passed'}); console.log('PASS '+name); } catch(error) { failures.push(name);results.push({name,status:'failed',error:error.stack,reader:await page.evaluate(()=>({sections:[...document.querySelectorAll('[data-reading-passage] section')].map(n=>({language:n.dataset.readingLanguage,text:n.textContent.slice(0,100)})),translationTarget:window.AlloModules.TextPipelineHelpers.getArtifactTranslationTarget?.(fixture.state.current),config:fixture.state.current.config}))});console.error('FAIL '+name+': '+error.message); } };
    await check('acknowledged overwrite and keyboard Apply',async()=>{
      await mount();await preview();await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('Change applied');
      const state=await page.evaluate(()=>({data:fixture.state.current.data,history:fixture.state.history,toasts:fixture.toasts}));
      assert.equal(state.data,'Herons are wading birds. They catch fish.');assert.equal(state.history[0].data,state.data);
      assert.equal(state.toasts.filter(t=>t.tone==='success').length,1);
      await expect(page.locator('[data-adaptation-undo]')).toBeVisible();
    });
    await check('acknowledged new version retains original',async()=>{
      await mount({keepOriginal:true});await preview();await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('Change applied');
      const state=await page.evaluate(()=>fixture.state);
      assert.equal(state.history.length,2);assert.equal(state.history[0].data,'Herons are wading birds. They eat fish.');assert.notEqual(state.current.id,'fixture-1');
    });
    await check('declined save has no success or history entry',async()=>{
      await mount({decline:true});await preview();await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('not applied');
      await expect(page.locator('[data-apply-complexity]')).toBeFocused();
      assert.deepEqual(await page.evaluate(()=>fixture.state.current),await page.evaluate(()=>fixture.initial));
      assert.equal(await page.evaluate(()=>fixture.toasts.some(t=>t.tone==='success')),false);
      await expect(page.locator('[data-adaptation-undo]')).toHaveCount(0);
    });
    await check('declined unchanged text is not mistaken for a committed rewrite',async()=>{
      await mount({decline:true,candidate:'Herons are wading birds. They eat fish.'});await preview();await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('not applied');
      assert.equal(await page.evaluate(()=>fixture.toasts.some(t=>t.tone==='success')),false);
    });
    await check('Apply revalidation returns focus to preserved terms',async()=>{
      await mount();await preview();await expect(page.locator('[data-adaptation-apply]')).toBeVisible();
      await page.evaluate(()=>fixture.preview.data='Herons are birds that wade.');await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing: “wading birds”');
      await expect(page.locator('[data-adapt-keep-terms]')).toBeFocused();
      assert.equal(await page.evaluate(()=>fixture.state.current.data), 'Herons are wading birds. They eat fish.');
    });
    await check('obsolete in-flight preview cannot restore Apply',async()=>{
      await mount({delayed:true});await preview();
      await page.evaluate(()=>fixture.changeSource('A different reading.'));
      await page.evaluate(()=>fixture.finish('Herons are wading birds.'));
      await expect.poll(()=>page.evaluate(()=>fixture.state.processing)).toBe(false);
      await expect(page.locator('[data-adaptation-preview]')).toHaveCount(0);
      assert.equal(await page.evaluate(()=>fixture.state.current.data),'A different reading.');
    });
    await check('bilingual candidate reports the missing translation term',async()=>{
      const source='Las aves zancudas comen peces.\n\n--- ENGLISH TRANSLATION ---\n\nHerons are wading birds.';
      await mount({source,language:'Spanish',candidate:'Las aves zancudas comen.\n\n--- ENGLISH TRANSLATION ---\n\nHerons are birds that wade.'});
      await preview('aves zancudas; wading birds');
      await expect(page.locator('[data-adaptation-notice]')).toContainText('“wading birds” (translation)');
      await expect(page.locator('[data-adaptation-apply]')).toHaveCount(0);
      assert.equal(await page.evaluate(()=>fixture.state.current.data),source);
    });
    await check('supported inline markup matches the shared visible-text projection',async()=>{
      for(const source of ['Herons are wading **birds**.','Herons are wading <em>birds</em>.','Herons are wading [birds](https://example.org/a_(b)).','Herons are wading&nbsp;birds.','Herons are wading <a href="https://example.org/birds">birds</a>.']) {
        await mount({source});
        const visible=await page.locator('[data-reading-passage] [data-reading-paragraph]').first().innerText();
        assert.match(visible.replace(/\s+/g,' '), /Herons are wading birds\./);
        for (const link of await page.locator('[data-reading-passage] a').all()) assert.equal(await link.evaluate(node => !!node.closest('[data-reading-sentence][role=button]') || !!node.querySelector('[role=button]')),false);
        assert.equal(await page.evaluate(source=>AlloModules.GenerationHelpers.preservedVocabulary.validate(source,source,['wading birds'],AlloModules.TextPipelineHelpers.splitReferencesFromBody).valid,source),true);
      }
    });
    await check('emoji extensions do not satisfy preserved symbols',async()=>{
      await mount({source:'Learners see 👩.',candidate:'Learners see 👩‍🏫.'});await preview('👩');
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing: “👩”');
      await expect(page.locator('[data-adaptation-apply]')).toHaveCount(0);
      assert.equal(await page.evaluate(()=>fixture.state.current.data),'Learners see 👩.');
    });
    await check('partial emoji source terms fail before a model call',async()=>{
      await mount({source:'Learners see 👩‍🏫.'});await page.locator('[data-adapt-keep-terms]').fill('👩');
      await expect(page.locator('[data-adapt-keep-terms]')).toHaveAttribute('aria-invalid','true');
      await expect(page.locator('[data-apply-complexity]')).toBeDisabled();
      await expect(page.locator('[data-adapt-term-readiness]')).toContainText('not found exactly');
      assert.equal(await page.evaluate(()=>fixture.requests.length),0);
    });
    await check('changing readings during primary generation prevents the translation call',async()=>{
      const source='Las aves zancudas comen.\n\n--- ENGLISH TRANSLATION ---\n\nHerons are wading birds.';
      await mount({source,language:'Spanish',staged:true});await preview('wading birds');
      await expect.poll(()=>page.evaluate(()=>fixture.providerCalls)).toBe(1);
      await page.evaluate(()=>fixture.changeSource('A different reading.'));
      await page.evaluate(()=>fixture.finishPrimary('Las aves comen.'));
      await expect.poll(()=>page.evaluate(()=>fixture.state.processing)).toBe(false);
      assert.equal(await page.evaluate(()=>fixture.providerCalls),1);
      await expect(page.locator('[data-adaptation-apply]')).toHaveCount(0);
      assert.equal(await page.evaluate(()=>fixture.state.current.data),'A different reading.');
    });
    await check('Discard restores keyboard focus',async()=>{
      await mount();await preview();await page.locator('[data-adaptation-discard]').focus();await page.keyboard.press('Enter');
      await expect(page.locator('[data-apply-complexity]')).toBeFocused();
      await expect(page.locator('[data-adaptation-preview]')).toHaveCount(0);
    });
    await check('readiness shows each pane, duplicates and remaining capacity before Preview',async()=>{
      const source='Herons are wading birds. fish.\n\n--- ENGLISH TRANSLATION ---\n\nLas garzas comen fish.';
      await mount({source,config:{translationTarget:'Spanish'}});
      await page.locator('[data-adapt-keep-terms]').fill('wading birds; garzas; fish; garzas');
      const ready=page.locator('[data-adapt-term-readiness]');
      await expect(ready).toContainText('27 of 30');await expect(ready).toContainText('Repeated entries count once: garzas');
      await expect(ready).toContainText('“wading birds”: found in primary reading.');await expect(ready).toContainText('“garzas”: found in translation.');await expect(ready).toContainText('“fish”: found in primary reading, translation.');
      assert.equal(await page.evaluate(()=>fixture.requests.length),0);await expect(page.locator('[data-adapt-keep-terms]')).toHaveValue('wading birds; garzas; fish; garzas');
    });
    await check('readiness rejects case changes and recovers when corrected',async()=>{
      await mount();await page.locator('[data-adapt-keep-terms]').fill('Wading birds');
      await expect(page.locator('[data-adapt-term-readiness]')).toContainText('not found exactly');await expect(page.locator('[data-apply-complexity]')).toBeDisabled();
      assert.equal(await page.evaluate(()=>fixture.requests.length),0);
      await page.locator('[data-adapt-keep-terms]').fill('wading birds');await expect(page.locator('[data-apply-complexity]')).toBeEnabled();
    });
    await check('readiness invalidates immediately when the reading changes',async()=>{
      await mount();await page.locator('[data-adapt-keep-terms]').fill('wading birds');await expect(page.locator('[data-apply-complexity]')).toBeEnabled();
      await page.evaluate(()=>fixture.changeSource('A different reading.'));
      await expect(page.locator('[data-adapt-term-readiness]')).toContainText('not found exactly');await expect(page.locator('[data-apply-complexity]')).toBeDisabled();assert.equal(await page.evaluate(()=>fixture.requests.length),0);
    });
    await check('formatting feedback identifies the source pane before generation',async()=>{
      await mount({source:'Herons eat.\n\n--- ENGLISH TRANSLATION ---\n\n<span class="colored">garzas</span>',config:{translationTarget:'Spanish'}});
      await page.locator('[data-adapt-keep-terms]').fill('garzas');
      await expect(page.locator('[id^="simplified-adapt-terms-error"]')).toContainText('translation in the current reading: Custom styles or classes');await expect(page.locator('[data-apply-complexity]')).toBeDisabled();
      assert.equal(await page.evaluate(()=>fixture.requests.length),0);
    });
    await check('candidate formatting failure retains source and offers retry',async()=>{
      await mount({candidate:'<span class="colored">wading birds</span>'});await preview();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('primary reading in the proposed version');await expect(page.locator('[data-adaptation-notice]')).toContainText('Retry the preview');assert.equal(await page.evaluate(()=>fixture.state.current.data),await page.evaluate(()=>fixture.initial.data));
    });
    await check('failure notice stays cleared after switching readings and returning',async()=>{
      await mount({candidate:'Birds eat.'});await preview();await expect(page.locator('[data-adaptation-notice]')).toContainText('missing:');
      await page.evaluate(()=>fixture.replaceCurrent({...fixture.initial,id:'another-reading'}));await expect(page.locator('[data-adaptation-notice]')).toHaveText('');
      await page.evaluate(()=>fixture.replaceCurrent(fixture.initial));await expect(page.locator('[data-adaptation-notice]')).toHaveText('');
    });
    await check('editing adaptation options clears obsolete feedback',async()=>{
      await mount({candidate:'Birds eat.'});await preview();await expect(page.locator('[data-adaptation-notice]')).toContainText('missing:');
      await page.locator('[data-adapt-option="shorterSentences"]').check();await expect(page.locator('[data-adaptation-notice]')).toHaveText('');
    });
    await check('English primary and saved Spanish translation survive Preview and Apply',async()=>{
      const source='Herons are wading birds.\n\n--- ENGLISH TRANSLATION ---\n\nLas garzas comen.';
      await mount({source,config:{translationTarget:'Spanish'},translationMode:'off',pipeline:true,responses:['Herons remain wading birds.','Las garzas pescan.']});
      await preview('wading birds; garzas');await expect(page.locator('[data-adaptation-apply]')).toBeVisible();await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('Change applied');
      assert.equal(await page.evaluate(()=>fixture.providerCalls),2);assert.equal(await page.evaluate(()=>fixture.state.current.config.translationPolicy.target),'Spanish');
      await expect(page.locator('[data-reading-passage] section[data-reading-language="Spanish"]')).toHaveAttribute('lang','es');
      await expect(page.locator('[data-reading-passage] section[data-reading-language="Spanish"]')).toContainText('Spanish translation');
    });
    await check('saved Arabic translation receives RTL and Arabic metadata',async()=>{
      await mount({source:'Herons eat.\n\n--- ENGLISH TRANSLATION ---\n\nطيور الماء تأكل.',config:{translationTarget:'Arabic'}});
      await expect(page.locator('[data-reading-passage] section[data-reading-language="Arabic"]')).toHaveAttribute('dir','rtl');await expect(page.locator('[data-reading-passage] section[data-reading-language="Arabic"]')).toHaveAttribute('lang','ar');
    });
    await check('Spanish readiness strings interpolate terms and counts',async()=>{
      const entries=JSON.parse(fs.readFileSync(path.join(root,'lang/spanish_castilian.js'),'utf8')).simplified;
      await mount({strings:Object.fromEntries(Object.entries(entries).map(([key,value])=>['simplified.'+key,value]))});await page.locator('[data-adapt-keep-terms]').fill('wading birds; wading birds');
      await expect(page.locator('[data-adapt-term-readiness]')).toContainText('Quedan 29 de 30');await expect(page.locator('[data-adapt-term-readiness]')).toContainText('«wading birds»: aparece en');await expect(page.locator('[data-adapt-term-readiness]')).not.toContainText('{term}');
    });
    await check('Undo retains its confirmation after the reading changes back',async()=>{
      await mount({keepOriginal:true});await preview();await apply();await expect(page.locator('[data-adaptation-undo]')).toBeVisible();
      await page.locator('[data-adaptation-undo]').click();await expect(page.locator('[data-adaptation-notice]')).toHaveText('Back to the previous version.');
      assert.equal(await page.evaluate(()=>fixture.state.current.id),'fixture-1');
    });
    await check('required translation cannot disappear behind primary-only preserved terms',async()=>{
      const source='Herons are wading birds.\n\n--- ENGLISH TRANSLATION ---\n\nLas garzas comen.';
      await mount({source,config:{translationTarget:'Spanish'},candidate:'Herons are wading birds.'});await preview();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing the translation');await expect(page.locator('[data-apply-complexity]')).toBeFocused();await expect(page.locator('[data-adaptation-apply]')).toHaveCount(0);
      assert.equal(await page.evaluate(()=>fixture.state.current.data),source);assert.equal(await page.evaluate(()=>fixture.state.history.length),1);
    });
    await check('empty candidate is rejected without preserved terms',async()=>{
      await mount({level:3,candidate:''});await page.locator('[data-apply-complexity]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('primary reading has no readable text');await expect(page.locator('[data-apply-complexity]')).toBeFocused();assert.equal(await page.evaluate(()=>fixture.state.level),3);
      assert.equal(await page.evaluate(()=>fixture.state.current.data),await page.evaluate(()=>fixture.initial.data));
    });
    await check('hidden-only translation is rejected without preserved terms',async()=>{
      const source='Herons eat.\n\n--- ENGLISH TRANSLATION ---\n\nLas garzas comen.';
      await mount({source,level:3,config:{translationTarget:'Spanish'},candidate:'Herons eat.\n\n--- ENGLISH TRANSLATION ---\n\n<span hidden>Las garzas comen.</span>'});await page.locator('[data-apply-complexity]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('translation has no readable text');assert.equal(await page.evaluate(()=>fixture.state.current.data),source);
    });
    await check('Apply rechecks complete panes after preview data is changed',async()=>{
      const source='Herons are wading birds.\n\n--- ENGLISH TRANSLATION ---\n\nLas garzas comen.';
      await mount({source,config:{translationTarget:'Spanish'},candidate:source});await preview();await expect(page.locator('[data-adaptation-apply]')).toBeVisible();
      await page.evaluate(()=>fixture.preview.data='Herons are wading birds.');await apply();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('missing the translation');await expect(page.locator('[data-apply-complexity]')).toBeFocused();assert.equal(await page.evaluate(()=>fixture.state.current.data),source);
      assert.equal(await page.evaluate(()=>fixture.toasts.filter(t=>t.tone==='success').length),0);
    });
    await check('blank primary provider output never starts translation',async()=>{
      await mount({level:3,pipeline:true,translationMode:'Spanish',responses:['','Las garzas comen.']});await page.locator('[data-apply-complexity]').click();
      await expect(page.locator('[data-adaptation-notice]')).toContainText('primary reading has no readable text');assert.equal(await page.evaluate(()=>fixture.providerCalls),1);assert.equal(await page.evaluate(()=>fixture.state.current.data),await page.evaluate(()=>fixture.initial.data));
    });
    await check('complexity reset after Apply preserves its confirmation',async()=>{
      await mount({level:3});await preview();await apply();await expect.poll(()=>page.evaluate(()=>fixture.state.level)).toBe(5);
      await expect(page.locator('[data-adaptation-notice]')).toContainText('Change applied');await expect(page.locator('[data-adaptation-undo]')).toBeVisible();
    });
    assert.deepEqual(errors,[]);
  } catch(error) { results.push({name:'browser harness',status:'failed',error:error.stack});failures.push('browser harness'); }
  finally { fs.writeFileSync(path.join(root,'track07-completeness-browser-results.json'),JSON.stringify({results,errors},null,2));await browser.close(); }
  if(failures.length) process.exitCode=1;
})();
