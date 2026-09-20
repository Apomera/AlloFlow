const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{expect}=require('@playwright/test'),esbuild=require('esbuild');
const ROOT=path.resolve(__dirname,'../..');
const previous=path.join(ROOT,'reports/remediation-ux-review-2026-09-19');
const setup=fs.readFileSync(path.join(previous,'review.cjs'),'utf8').split('(async () => {')[0];
const {mount,setResult}=new Function('require','__dirname',setup+'\nreturn {mount,setResult};')(require,previous);
const spec=fs.readFileSync(path.join(ROOT,'tests/e2e/remediation_continuity.spec.ts'),'utf8');
const completeHelper=spec.slice(spec.indexOf('async function completeResult('),spec.indexOf("test('results lead with accurate"));
const completeResult=new Function('setResult','require',esbuild.transformSync(completeHelper,{loader:'ts',format:'cjs'}).code+'\nreturn completeResult;')(setResult,require);
const commitHelper=spec.slice(spec.indexOf('async function enableReviewCommits('),spec.indexOf("test('human review keeps focus"));
const enableReviewCommits=new Function(esbuild.transformSync(commitHelper,{loader:'ts',format:'cjs'}).code+'\nreturn enableReviewCommits;')();
(async()=>{const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1280,height:1000}});const {errors}=await mount(page);const checks=[];
 await completeResult(page,{verificationState:'review-required',axeAudit:{score:100,totalViolations:0,totalIncomplete:2,critical:[],serious:[],moderate:[],minor:[],passes:[],incomplete:[{id:'color-contrast',description:'Check text against the image background.',nodes:[]},{id:'link-in-text-block',description:'Check that the link is distinguishable without color.',nodes:[]}]}});await enableReviewCommits(page);
 await page.addScriptTag({path:path.join(ROOT,'node_modules/axe-core/axe.min.js')});
 for(const [width,theme]of [[1280,'light'],[320,'light'],[390,'dark'],[320,'contrast']]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>window.__setModalState({theme}),theme);await page.locator('.pdf-workspace-primary').click();
  const queue=page.locator('#pdf-review-findings');const mark=queue.locator('[data-review-action="mark"]').first();await mark.click();
  const reviewed=queue.locator('.pdf-workspace-reviewed');await reviewed.locator('summary').click();
  const overflow=await page.locator('.pdf-workspace-shell').evaluate(el=>el.scrollWidth-el.clientWidth);expect(overflow).toBeLessThanOrEqual(1);
  const violations=await page.evaluate(async()=>(await axe.run({include:[['#pdf-review-findings'],['#pdf-verification-status']]})).violations);expect(violations).toEqual([]);
  await queue.screenshot({path:path.join(__dirname,'review-'+width+'-'+theme+'.png')});
  await page.screenshot({path:path.join(__dirname,'review-screen-'+width+'-'+theme+'.png')});
  await reviewed.locator('[data-review-action="undo"]').click();checks.push({width,theme,overflow,axeViolations:violations.length});
 }
 await page.setViewportSize({width:390,height:1000});await page.evaluate(()=>{const w=window;w.__setModalState({theme:'light',pdfFixResult:{...w.__modalState.pdfFixResult,accessibleHtml:w.__modalState.pdfFixResult.accessibleHtml+'<p>Changed text.</p>'}});});
 await page.locator('.pdf-workspace-primary').click();await page.locator('#pdf-verification-status').getByText('Why this status?',{exact:true}).click();
 const staleViolations=await page.evaluate(async()=>(await axe.run({include:[['#pdf-verification-status']]})).violations);expect(staleViolations).toEqual([]);
 await page.locator('#pdf-verification-status').screenshot({path:path.join(__dirname,'stale-evidence-390-light.png')});expect(errors).toEqual([]);
 const report={checks,staleViolations:staleViolations.length,pageErrors:errors};fs.writeFileSync(path.join(__dirname,'visual-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});