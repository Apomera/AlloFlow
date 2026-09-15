const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const base=pathToFileURL(path.join(__dirname,'current-preview.html')).href;
(async()=>{const browser=await chromium.launch({headless:true});const results={checks:[],errors:[]};try{
 for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>results.errors.push(e.message));await page.goto(base+'?pass=5');
  await page.locator('#applied-workspace-workingQuestion').fill('Which watering plan should we compare?');
  await page.getByRole('button',{name:'2. Explore',exact:true}).click();await page.locator('#applied-workspace-possibilities').fill('My own comparison: fast or slow watering.');
  await page.locator('summary').filter({hasText:'Find outside evidence'}).click();
  await page.getByLabel('Topic or factual question to search',{exact:true}).fill('soil infiltration runoff');await page.getByRole('button',{name:'Search for sources',exact:true}).click();
  await page.getByRole('link',{name:'Soil and water: a fictional review source',exact:false}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.reviewSearchQueries),[{query:'soil infiltration runoff',count:5,override:'soil infiltration runoff'}]);
  assert.deepEqual(await page.evaluate(()=>window.reviewAiPrompts),[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const issues=await page.evaluate(async()=>(await axe.run(document.querySelector('#root'),{rules:{region:{enabled:false}}})).violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})));assert.deepEqual(issues,[]);
  await page.screenshot({path:path.join(__dirname,'pass5-search-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Add reference to my evidence',exact:true}).first().click();
  const ledger=await page.evaluate(()=>Object.values(window.reviewResponses)[0].studio.evidenceLedger);
  assert.equal(ledger.length,1);assert.equal(ledger[0].status,'needs-check');assert.equal(ledger[0].claim,'');assert.equal(ledger[0].factId,'');assert(ledger[0].evidence.includes('https://example.org/soil-water'));assert(!ledger[0].evidence.includes('Authored search preview'));
  assert((await page.evaluate(()=>document.activeElement.id)).startsWith('aps-ledger-claim-'));
  assert.equal(await page.locator('#applied-workspace-possibilities').inputValue(),'My own comparison: fast or slow watering.');
  const teacher=await page.evaluate(()=>window.reviewResource.data);assert(!teacher.evidenceLedger?.length);assert.equal(teacher.brief.factVerified,false);
  await page.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).fill('Could soil compaction change the result?');
  await page.screenshot({path:path.join(__dirname,'pass5-reference-'+width+'.png'),fullPage:true});
  if(width===390){
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download my work',exact:true}).click();const file=await download;const backup=path.join(__dirname,'pass5-source-backup.json');await file.saveAs(backup);const text=fs.readFileSync(backup,'utf8');assert(text.includes('https://example.org/soil-water'));assert(text.includes('Could soil compaction'));
    await page.reload();await page.getByRole('button',{name:'2. Explore',exact:true}).click();await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles(backup);await page.getByText('Backup restored to this workspace. Check the save status before leaving.',{exact:true}).waitFor();await page.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).waitFor();assert.equal(await page.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).inputValue(),'Could soil compaction change the result?');
  }
  results.checks.push({width,axeViolations:issues.length,queryOnly:true,referenceNeedsChecking:true,lessonAndDraftPreserved:true});await page.close();
 }
 const offline=await browser.newPage({viewport:{width:390,height:900}});await offline.goto(base+'?offline');await offline.getByRole('button',{name:'2. Explore',exact:true}).click();await offline.locator('summary').filter({hasText:'Find outside evidence'}).click();assert(await offline.getByRole('button',{name:'Search for sources',exact:true}).isDisabled());assert(await offline.getByText('Web search is unavailable in this view.',{exact:false}).isVisible());await offline.close();results.checks.push({offlineUnavailable:true});assert.deepEqual(results.errors,[]);
 fs.writeFileSync(path.join(__dirname,'pass5-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
