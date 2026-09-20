const fs=require('fs'), path=require('path');
const {chromium}=require('playwright');const {expect}=require('@playwright/test');
const previous=path.resolve(__dirname,'../remediation-ux-review-2026-09-19');
const setup=fs.readFileSync(path.join(previous,'review.cjs'),'utf8').split('(async () => {')[0];
const {mount,setResult}=new Function('require','__dirname',setup+'\nreturn {mount,setResult};')(require,previous);
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:900}});const {errors}=await mount(page);
 await page.evaluate(()=>{const w=window;w.__setModalState({pdfAuditLoading:true,pdfExtraRequestPacing:true,_docPipeline:Object.assign({},w.__modalState._docPipeline,{getPdfAuditWait:()=>({reason:'recovery',remainingMs:45000,pacingMs:180000,recoveryMs:12000,queueMs:3500,extraRequestPacing:true}),stopPdfAccessibilityAudit:()=>true})});});
 await expect(page.locator('[data-audit-wait]')).toBeVisible();
 for(const [width,theme] of [[320,'light'],[390,'dark'],[390,'contrast'],[1280,'light']]) {
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>window.__setModalState({theme}),theme);
  await page.locator('[data-help-key="pdf_audit_stop"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(__dirname,`audit-wait-${width}-${theme}.png`)});
 }
 await page.evaluate(()=>window.__setModalState({pdfAuditLoading:false,theme:'light'}));await setResult(page);
 const retry=page.getByRole('button',{name:'Re-run verification',exact:true});await expect(retry).toHaveAccessibleDescription('Re-runs all verification checks on the current document without changing it.');
 await page.setViewportSize({width:390,height:900});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'verification-390-light.png')});
 expect(errors).toEqual([]);fs.writeFileSync(path.join(__dirname,'visual-check.json'),JSON.stringify({screenshots:5,verificationDescription:true,pageErrors:errors},null,2));console.log('Five screenshots captured; verification label and description passed; no page errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
