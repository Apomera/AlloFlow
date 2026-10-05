const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
async function main() {
  const fixture = await createFixtureServer(), browser = await chromium.launch({headless:true,channel:'chrome'}), errors = [], results = [];
  try {
    for (const width of [1440,390,320]) {
      const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}); page.on('pageerror', e => errors.push(e.message));
      await page.goto(fixture.url); await page.locator('#stem-atctower-tab-practice').click(); await page.locator('[data-atctower-practice-start="separation_recovery"]').click();
      await page.locator('[data-atctower-playing]').waitFor(); await page.locator('[data-atctower-command="pause"]').click();
      await page.locator('[data-atctower-separation-watch]').getByRole('button',{name:/Inspect/}).first().waitFor(); await page.locator('[data-atctower-command="pause"]').click();
      await page.screenshot({path:path.join(__dirname,'before-separation-'+width+'.png'),fullPage:true});
      const watch = page.locator('[data-atctower-separation-watch]');
      await watch.screenshot({path:path.join(__dirname,'before-watch-'+width+'.png')});
      const before = await page.evaluate(()=>({selected:window.__atcGameRef.current.selected,watch:document.querySelector('[data-atctower-separation-watch]').getBoundingClientRect().top+scrollY,controls:document.querySelector('[data-atctower-aircraft-controls]').getBoundingClientRect().top+scrollY,document:document.documentElement.scrollWidth,width:innerWidth}));
      const inspect = watch.getByRole('button',{name:/Inspect/}).last(); await inspect.click();
      const after = await page.evaluate(()=>({selected:window.__atcGameRef.current.selected,active:document.activeElement.textContent,controlsTop:document.querySelector('[data-atctower-aircraft-controls]').getBoundingClientRect().top,scroll:scrollY}));
      await page.locator('[data-atctower-command="h"]').click(); const current = await page.evaluate(()=>({selected:window.__atcGameRef.current.selected,targetHeading:window.__atcGameRef.current.aircraft.find(a=>a.id===window.__atcGameRef.current.selected).targetHeading}));
      const button = watch.getByRole('button',{name:/Inspect/}).first(); await button.click();
      const blocked = await page.locator('[data-atctower-command-feedback]').innerText();
      const stable = await page.evaluate(()=>({selected:window.__atcGameRef.current.selected,targetHeading:window.__atcGameRef.current.aircraft.find(a=>a.id===window.__atcGameRef.current.selected).targetHeading}));
      await page.getByRole('button',{name:'Cancel',exact:true}).click();
      const runway = page.locator('[data-atctower-runway-plan]'); await runway.screenshot({path:path.join(__dirname,'before-runway-'+width+'.png')});
      results.push({width,before,after,commandLock:{current,stable,blocked},stripLabels:await page.locator('[data-atctower-aircraft]').allTextContents(),runwayText:await runway.innerText()});
      await page.close();
    }
    const page = await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.goto(fixture.url);
    const tabs = await page.getByRole('tab').allTextContents(); const buttons = await page.getByRole('button').allTextContents();
    results.push({menu:{tabs,buttons:buttons.slice(0,30)}});
    await page.screenshot({path:path.join(__dirname,'before-menu-390.png'),fullPage:true});await page.close();
  } finally {await browser.close();await new Promise(r=>fixture.server.close(r));}
  fs.writeFileSync(path.join(__dirname,'baseline-findings.json'),JSON.stringify({results,errors},null,2)+'\n');console.log(JSON.stringify({results,errors}));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
