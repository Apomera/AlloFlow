const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');
const fragment = 'C:/Users/cabba/.codex/visualizations/2026/09/08/01a07f10-35b0-7362-bc69-0a7b7bc4f9e1/adventure-setup-proposal.html';
(async()=>{
  const html=fs.readFileSync(fragment,'utf8');
  assert(!html.includes('\\"'));
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><title>Adventure setup proposal</title></head><body>'+html+'</body></html>');
    for(const scheme of ['light','dark'])for(const width of [375,736]){
      await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:950});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(__dirname,'proposal-'+scheme+'-'+width+'.png'),fullPage:true});
    }
    await page.getByRole('button',{name:/Evidence Debate/}).click();
    assert.equal(await page.locator('#ap-response').inputValue(),'written');
    assert.equal(await page.locator('#ap-choices-wrap').isVisible(),false);
    await page.getByRole('button',{name:/Social Practice/}).click();
    assert.equal(await page.locator('#ap-social-wrap').isVisible(),true);
    await page.getByRole('button',{name:/Systems Challenge/}).click();
    assert.equal(await page.locator('#ap-resources-wrap').isVisible(),true);
    assert.equal(await page.locator('#ap-length').inputValue(),'12');
    await page.locator('#ap-length').selectOption('open');
    assert.equal(await page.locator('#ap-earliest-wrap').isVisible(),true);
    await page.getByRole('button',{name:'Preview student setup'}).click();
    assert.match(await page.locator('#ap-preview-result').innerText(),/Systems Challenge.*Open-ended/);
    assert.deepEqual(errors,[]);
    console.log('Proposal verified: light/dark, phone/desktop, profiles, conditional fields, open-ended finale, summary preview; no browser errors.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
