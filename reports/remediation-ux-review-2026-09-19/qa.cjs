const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const setup = fs.readFileSync(path.join(__dirname,'review.cjs'),'utf8').split('(async () => {')[0];
const {mount,setResult} = new Function('require','__dirname',setup+'\nreturn {mount,setResult};')(require,__dirname);
(async()=>{
 const browser=await chromium.launch({headless:true});
 const checks=[];
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const {errors}=await mount(page);
  await page.evaluate(()=>window.__setModalState({pdfExtraRequestPacing:true}));
  const settings=page.locator('[data-help-key="pdf_audit_view_settings_panel"]');
  await settings.locator('summary').click();
  await expect(settings.locator('input[type=range]')).toHaveCount(4);
  const pacing=page.locator('[data-help-key="pdf_extra_request_pacing"]');
  await expect(pacing).toBeChecked();await pacing.uncheck();
  expect(await page.evaluate(()=>window.__modalState.pdfExtraRequestPacing)).toBe(false);
  await pacing.focus();await page.keyboard.press('Space');await expect(pacing).toBeChecked();
  checks.push('Four quality sliders retained; pacing toggles with mouse and keyboard');
  await page.addScriptTag({path:require.resolve('axe-core')});
  for(const theme of ['light','dark','contrast']) for(const width of [320,390,1280]) {
   await page.setViewportSize({width,height:width>600?900:844});
   await page.evaluate(theme=>window.__setModalState({theme}),theme);
   await pacing.scrollIntoViewIfNeeded();
   const overflow=await page.locator('.pdf-workspace-shell').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));
   expect(overflow.scroll).toBeLessThanOrEqual(overflow.client+1);
   const violations=await page.evaluate(async()=> (await axe.run({include:[['.pdf-workspace-header'],['.pdf-workspace-settings']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
   expect(violations,JSON.stringify(violations)).toEqual([]);
   await page.screenshot({path:path.join(__dirname,`pacing-${width}-${theme}.png`)});
   checks.push(`${width}px ${theme}: no horizontal overflow; header/settings accessibility scan passed`);
  }
  await page.evaluate(()=>window.__setModalState({pdfBatchMode:true,pdfBatchQueue:[]}));
  await page.locator('[data-help-key="pdf_batch_connection_settings"] summary').click();
  await expect(pacing).toBeEnabled();
  await page.evaluate(()=>window.__setModalState({pdfBatchProcessing:true}));await expect(pacing).toBeDisabled();
  checks.push('Batch exposes preference and locks it during processing');
  await page.evaluate(()=>window.__setModalState({pdfBatchProcessing:false,pdfExtraRequestPacing:false}));
  await setResult(page,{pipelineStats:{extraRequestPacing:false,elapsedWait:{pacingMs:0,recoveryMs:25000,queueMs:3000,extraRequestPacing:false}}});
  await expect(page.locator('[data-help-key="pdf_wait_summary"]')).toContainText('Off');
  await expect(page.getByRole('button',{name:'Re-run verification',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Re-run verification',exact:true})).toHaveAccessibleDescription('Re-runs all verification checks on the current document without changing it.');
  const evidence=page.locator('[data-help-key="pdf_audit_dashboard_bar"]');
  await expect(evidence).not.toHaveAttribute('open','');
  await evidence.locator('summary').click();await expect(evidence).toHaveAttribute('open','');
  await page.getByRole('navigation',{name:'Result sections'}).getByRole('button',{name:'Downloads',exact:true}).click();
  await expect(page.locator('#allo-sec-downloads')).toBeInViewport();
  checks.push('Partial verification has retry action, saved pacing summary, expandable evidence and working download navigation');
  for(const theme of ['light','dark','contrast']) {
   await page.setViewportSize({width:390,height:844});await page.evaluate(theme=>window.__setModalState({theme}),theme);
   await page.locator('[data-help-key="pdf_audit_verification_status"]').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,`outcome-390-${theme}.png`)});
  }
  await expect(page.locator('.pdf-workspace-header').getByRole('button',{name:'Open pipeline diagnostics log'})).toBeVisible();
  await page.getByRole('button',{name:'Open pipeline diagnostics log'}).click();
  await expect(page.getByRole('region',{name:'Pipeline diagnostics log',exact:true})).toBeVisible();
  checks.push('Diagnostics open from the reserved header toolbar');
  expect(errors).toEqual([]);
  fs.writeFileSync(path.join(__dirname,'ui-validation.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
  console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
