const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{expect}=require('@playwright/test'),esbuild=require('esbuild');
const previous=path.resolve(__dirname,'../remediation-ux-review-2026-09-19');
const setup=fs.readFileSync(path.join(previous,'review.cjs'),'utf8').split('(async () => {')[0];
const {mount,setResult}=new Function('require','__dirname',setup+'\nreturn {mount,setResult};')(require,previous);
const ROOT=path.resolve(__dirname,'../..');
const spec=fs.readFileSync(path.join(ROOT,'tests/e2e/remediation_continuity.spec.ts'),'utf8');
const completeHelper=spec.slice(spec.indexOf('async function completeResult('),spec.indexOf("test('results lead with accurate"));
const completeResult=new Function('setResult','require',esbuild.transformSync(completeHelper,{loader:'ts',format:'cjs'}).code+'\nreturn completeResult;')(setResult,require);
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const {errors}=await mount(page);const checks=[];
 await completeResult(page,{verificationState:'complete-for-tested-scope',verificationReasons:['static-source-audit']});
 await page.addScriptTag({path:path.join(ROOT,'node_modules/axe-core/axe.min.js')});
 for(const [width,theme] of [[1280,'light'],[320,'light'],[390,'dark'],[320,'contrast']]) {
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>window.__setModalState({theme}),theme);
  await page.getByTestId('pdf-workspace-header').getByRole('button',{name:'Verification & review'}).click();
  await page.screenshot({path:path.join(__dirname,'verification-'+width+'-'+theme+'.png')});
  const repairs=page.locator('#pdf-additional-repairs');await repairs.locator('summary').click();
  await repairs.locator('summary').scrollIntoViewIfNeeded();
  const overflow=await page.locator('.pdf-workspace-shell').evaluate(el=>el.scrollWidth-el.clientWidth);expect(overflow).toBeLessThanOrEqual(1);
  const violations=await page.evaluate(async()=> (await axe.run({include:[['#pdf-verification-status'],['#pdf-additional-repairs'],['.pdf-workspace-header']]})).violations);expect(violations).toEqual([]);
  await page.screenshot({path:path.join(__dirname,'repair-tools-'+width+'-'+theme+'.png')});
  await repairs.locator('summary').click();checks.push({width,theme,overflow,axeViolations:violations.length});
 }
 await page.setViewportSize({width:390,height:900});await page.evaluate(()=>window.__setModalState({theme:'light'}));
 await page.getByTestId('pdf-workspace-header').getByRole('button',{name:'Downloads',exact:true}).click();
 const exportViolations=await page.evaluate(async()=> (await axe.run({include:[['[data-help-key="pdf_audit_alt_formats_summary"]']]})).violations);expect(exportViolations).toEqual([]);
 await page.screenshot({path:path.join(__dirname,'export-formats-390-light.png')});
 expect(errors).toEqual([]);fs.writeFileSync(path.join(__dirname,'visual-check.json'),JSON.stringify({checks,exportViolations:exportViolations.length,pageErrors:errors},null,2));console.log(JSON.stringify({checks,exportViolations:exportViolations.length,pageErrors:errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});