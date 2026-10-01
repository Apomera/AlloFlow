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
    const check = async (name, fn) => { try { await fn(); results.push({name,status:'passed'}); console.log('PASS '+name); } catch(error) { failures.push(name);results.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.message); } };
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
    await check('Discard restores keyboard focus',async()=>{
      await mount();await preview();await page.locator('[data-adaptation-discard]').focus();await page.keyboard.press('Enter');
      await expect(page.locator('[data-apply-complexity]')).toBeFocused();
      await expect(page.locator('[data-adaptation-preview]')).toHaveCount(0);
    });
    assert.deepEqual(errors,[]);
  } catch(error) { results.push({name:'browser harness',status:'failed',error:error.stack});failures.push('browser harness'); }
  finally { fs.writeFileSync(path.join(root,'track07-browser-results.json'),JSON.stringify({results,errors},null,2));await browser.close(); }
  if(failures.length) process.exitCode=1;
})();
