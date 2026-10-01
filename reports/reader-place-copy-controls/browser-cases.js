  await test('real reader restores a copy as a draft and saves only after explicit confirmation', async f => {
    const page=await f.page('/ui'); await page.evaluate(()=>mountReader());
    await page.locator('[data-section-prompts-toggle]').click(); await page.locator('[data-section-prompt="mainIdea"]').fill('Original answer');
    await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{}'))[0]?.responses[0]?.mainIdea==='Original answer',KEY);
    await page.locator('[data-reading-storage-tools] > summary').click(); await page.locator('[data-reading-storage-review]').click();
    await page.locator('[data-reading-storage-confirm]').check(); await page.locator('[data-reading-storage-remove]').click();
    await page.locator('[data-section-prompt="mainIdea"]').fill('Current answer');
    await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{}'))[0]?.responses[0]?.mainIdea==='Current answer',KEY);
    const raw=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await page.locator('[data-reading-recovery-copies] > summary').click(); await page.locator('[data-reading-copy-review]').first().click();
    await page.locator('[data-reading-copy-restore]').click();
    assert.equal(await page.locator('[data-section-prompt="mainIdea"]').inputValue(),'Original answer'); assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);
    await page.locator('[data-section-prompt="mainIdea"]').fill('Restored and checked'); assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);
    assert.equal(await page.locator('[data-reading-save-retry]').innerText(),'Save restored work'); await page.locator('[data-reading-save-retry]').click();
    await page.waitForFunction(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{}'))[0]?.responses[0]?.mainIdea==='Restored and checked',KEY);
    while(await page.locator('[data-reading-copy-review]').count()) {
      await page.locator('[data-reading-copy-review]').first().click(); await page.locator('[data-reading-copy-confirm]').check(); await page.locator('[data-reading-copy-remove]').click();
    }
    assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),false);
    const persisted=await page.evaluate(key=>localStorage.getItem(key),KEY); await page.reload(); assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),persisted);
  });
