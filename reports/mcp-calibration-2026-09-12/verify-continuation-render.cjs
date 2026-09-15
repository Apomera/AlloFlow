const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {pathToFileURL} = require('url');
const {chromium} = require('playwright');
const dir = path.resolve('reports/mcp-calibration-2026-09-12');
const candidate = path.join(dir, 'continuation-replayed-candidate.html');
const original = path.resolve('mcp-testing/refinement-study/private/calibration-2026-09-12/followup/gated/ed-parent-guide-idea-accessible.html');
(async () => {
 const browser = await chromium.launch({headless: true});
 try {
  const context = await browser.newContext({javaScriptEnabled:false,viewport:{width:1000,height:1000}});
  await context.route('**/*', r => /^(file:|data:)/.test(r.request().url()) ? r.continue() : r.abort());
  const page = await context.newPage();
  async function content(file) {
   await page.goto(pathToFileURL(file).href);
   return page.evaluate(() => ({text:document.body.innerText.replace(/\s+/g,' ').trim(),links:Array.from(document.querySelectorAll('a[href]'), a => ({href:a.getAttribute('href'), text:a.textContent})),images:Array.from(document.images, img => ({src:img.getAttribute('src'),alt:img.alt}))}));
  }
  const before = await content(original), after = await content(candidate);
  assert.deepEqual(after, before, 'Visible text, links, image sources and alt text must remain identical');
  const checks = [];
  for (const width of [320,390,1000]) {
   await page.setViewportSize({width,height:1000});
   await page.goto(pathToFileURL(candidate).href);
   let reached = false;
   for (let n=0;n<15;n++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement.matches('input[type=file]'))) { reached = true; break; }
   }
   assert(reached, 'File input must be keyboard reachable');
   const facts = await page.evaluate(() => {const e=document.activeElement,s=getComputedStyle(e);return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,fileInputFocused:e.matches('input[type=file]'),focusVisible:e.matches(':focus-visible'),outlineColor:s.outlineColor,outlineWidth:s.outlineWidth,outlineOffset:s.outlineOffset,boxShadow:s.boxShadow,labelBackground:getComputedStyle(e.closest('label')).backgroundColor};});
   assert.equal(facts.width, facts.scrollWidth, 'No horizontal scrolling');
   assert.equal(facts.outlineColor, 'rgb(255, 255, 255)');
   assert.equal(facts.outlineWidth, '2px');
   assert.match(facts.boxShadow, /rgb\(17, 24, 39\).*4px/);
   assert(facts.focusVisible);
   checks.push(facts);
   if(width===390) await page.screenshot({path:path.join(dir,'continuation-mobile-review.png')});
   if(width===1000) await page.locator('input[type=file]').locator('..').screenshot({path:path.join(dir,'continuation-focus-review.png')});
  }
  const result = {scope:'Targeted stored-response replay; keyboard/reflow and content-preservation checks, not a new live accessibility verdict.',verifiedAt:new Date().toISOString(),preservation:{visibleTextIdentical:true,linkDestinationsAndTextIdentical:true,imageSourcesAndAltIdentical:true},checks};
  fs.writeFileSync(path.join(dir,'continuation-keyboard-reflow-checks.json'), JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
 } finally {await browser.close();}
})().catch(e => {console.error(e);process.exitCode=1;});
