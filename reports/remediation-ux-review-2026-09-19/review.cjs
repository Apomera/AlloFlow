const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const esbuild = require('esbuild');
const ROOT = path.resolve(__dirname, '../..');
const spec = fs.readFileSync(path.join(ROOT, 'tests/e2e/remediation_continuity.spec.ts'), 'utf8');
const css = fs.readdirSync(path.join(ROOT,'app/static/css')).find(f=>/^main\..*\.css$/.test(f));
const harness = spec.slice(spec.indexOf('const source ='), spec.indexOf("test('modal retains")).replace('main.bba82ce3.css', css);
const resultHelper = spec.slice(spec.indexOf('async function setResult('), spec.indexOf("test('workspace source"));
const js = esbuild.transformSync(harness + resultHelper, { loader: 'ts', format: 'cjs' }).code;
const {mount, setResult} = new Function('fs', 'path', 'ROOT', 'expect', js + '\nreturn {mount:mountWorkspace,setResult};')(fs, path, ROOT, expect);
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const { errors } = await mount(page);
    const captures = [];
    const capture = async name => {
      await page.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true });
      captures.push({ name, text: await page.locator('body').innerText() });
    };
    await capture('intake-desktop');
    await page.locator('[data-help-key="pdf_audit_view_settings_panel"] summary').click();
    await page.locator('[data-help-key="pdf_audit_view_settings_panel"]').scrollIntoViewIfNeeded();
    await capture('settings-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-help-key="pdf_audit_view_settings_panel"]').scrollIntoViewIfNeeded();
    await capture('settings-phone');
    await page.setViewportSize({width:1280,height:900});
    await setResult(page);
    await page.locator('[data-help-key="pdf_audit_verification_status"]').first().scrollIntoViewIfNeeded();
    await capture('results-desktop');
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-help-key="pdf_audit_verification_status"]').first().scrollIntoViewIfNeeded();
    await capture('results-phone');
    await page.evaluate(()=>window.__setModalState({pdfFixResult:null,pdfAuditLoading:true,auditElapsedSec:240,auditStage:{stage:'Reading document',at:Date.now()-240000}}));
    const closeDisabled = await page.locator('[data-help-key="pdf_audit_view_close_btn"]').isDisabled();
    await capture('audit-stalled-phone');
    fs.writeFileSync(path.join(__dirname, 'browser-review.json'), JSON.stringify({ errors, closeDisabledWhileAuditStalled:closeDisabled, captures }, null, 2));
    console.log(JSON.stringify({ errors, closeDisabledWhileAuditStalled:closeDisabled, screenshots: captures.map(c => c.name) }, null, 2));
  } finally {await browser.close();}
})().catch(error => { console.error(error); process.exit(1); });
