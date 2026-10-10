const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {createFixtureServer,repo}=require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
(async()=>{const source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_atctower.js'));fs.writeFileSync(path.join(__dirname,'baseline-source.js.txt'),source,{flag:'wx'});fs.copyFileSync(path.join(repo,'reports/atc-ops-investigation-2026-10-05/verify.cjs'),path.join(__dirname,'verify.cjs'));
const fixture=await createFixtureServer(),browser=await chromium.launch({channel:'chrome',headless:true});const screenshots=[];
try{for(const width of [1440,390,320]){const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto(fixture.url);await page.locator('#stem-atctower-tab-practice').click();await page.locator('[data-atctower-practice-start="first_landing"]').click();await page.locator('[data-atctower-aircraft="101"]').click();const file=path.join(__dirname,'before-paused-'+width+'.png');await page.screenshot({path:file,fullPage:true});screenshots.push(file);await page.close();}}
finally{await browser.close();await new Promise(r=>fixture.server.close(r));}
fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify({capturedAt:new Date().toISOString(),sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),screenshots},null,2)+'\n');console.log('Captured the current simulation and its source before changes.');})().catch(e=>{console.error(e);process.exitCode=1});
