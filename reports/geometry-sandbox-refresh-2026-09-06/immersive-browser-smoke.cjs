const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), os = require('node:os');
const { chromium } = require('node:module').createRequire(path.join(process.cwd(),'package.json'))('playwright');
const assert = require('node:assert/strict');
const root = process.cwd(), out = path.join(os.tmpdir(),'geometry-immersive-qa-2026-09-06');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req,res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
const results = { desktop: {}, mobile: {}, pageErrors: [] };
let browser;
async function ready(page) {
  await page.waitForFunction(() => !!document.getElementById('figure')?.components?.['stretch-lab']);
  await page.waitForFunction(() => document.getElementById('immersiveBootStatus').dataset.state === 'ready');
  await page.waitForFunction(() => document.getElementById('immersiveBootStatus').hidden);
}
async function capture(page, name) {
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
}
async function geometry(page) {
  return page.evaluate(() => {
    const c = document.getElementById('figure').components['stretch-lab'];
    return { ...c.capture(), history: c.history };
  });
}
async function run() {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = 'http://127.0.0.1:' + server.address().port + '/immersive_geometry/immersive_geometry.html';
  browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  page.on('pageerror', error=>results.pageErrors.push(String(error)));
  await page.goto(base+'?d=3&L=2.1&W=1.6&H=1.35&axis=2&workspace=free'); await ready(page);
  assert.equal(await page.locator('#uiModeFree').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#lessonWorkspace').isVisible(),false);
  assert.equal(await page.locator('#uiFocusMode').inputValue(),'explore');
  assert.equal(await page.evaluate(()=>document.getElementById('labelWrap').object3D.visible),false);
  results.desktop.before = await geometry(page);
  await capture(page,'immersive-desktop-free');
  await page.locator('#uiModeLesson').click();
  assert.equal(await page.locator('#lessonWorkspace').isVisible(),true);
  assert.deepEqual(await geometry(page), results.desktop.before);
  await capture(page,'immersive-desktop-lessons');
  await page.locator('#uiModeFree').click();
  assert.equal(await page.evaluate(()=>document.getElementById('figure').components['stretch-lab'].activeMission),null);
  await page.locator('#uiPanelSettings').click();
  await page.locator('#uiBackdrop').selectOption('ocean');
  await page.locator('#uiMeasureCard').check(); assert.equal(await page.evaluate(()=>document.getElementById('labelWrap').object3D.visible),true);
  await page.waitForFunction(()=>document.getElementById('label3d').components.text.texture?.image?.complete);
  await capture(page,'immersive-desktop-formula-card');
  await page.locator('#uiGroundGrid').uncheck(); await page.locator('#uiMeasureCard').uncheck();
  assert.equal(await page.evaluate(()=>document.getElementById('grid').object3D.visible),false);
  assert.equal(await page.evaluate(()=>document.getElementById('labelWrap').object3D.visible),false);
  assert.deepEqual(await geometry(page),results.desktop.before);
  results.desktop.saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow_stretch_lab_v1')));
  await capture(page,'immersive-desktop-settings');
  await page.reload(); await ready(page);
  assert.equal(await page.locator('#uiModeFree').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.getElementById('grid').object3D.visible),false);
  assert.equal(await page.evaluate(()=>document.getElementById('labelWrap').object3D.visible),false);
  results.desktop.reloaded = await geometry(page);
  await page.locator('#uiModeLesson').click();
  await page.goto(base+'?workspace=free'); await ready(page);
  assert.equal(await page.locator('#uiModeFree').getAttribute('aria-pressed'),'true');
  assert.deepEqual((await geometry(page)).d,results.desktop.before.d);
  assert.equal(new URL(page.url()).search,'');
  results.desktop.workspaceOnlyLaunch = true;
  await page.close();
  const mobile = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
  mobile.on('pageerror', error=>results.pageErrors.push(String(error)));
  await mobile.goto(base+'?d=3&L=2.1&W=1.6&H=1.35&axis=2&workspace=free'); await ready(mobile);
  results.mobile.freeBounds = await mobile.evaluate(()=>({hud:document.getElementById('hud').getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth}));
  assert(results.mobile.freeBounds.hud.height < 422); assert(results.mobile.freeBounds.scrollWidth <= 390);
  await capture(mobile,'immersive-mobile-free');
  await mobile.locator('#uiModeLesson').click();
  assert.equal(await mobile.locator('#lessonWorkspace').isVisible(),true);
  await capture(mobile,'immersive-mobile-lessons');
  await mobile.locator('#uiPanelSettings').click(); await mobile.locator('#uiBackdrop').selectOption('slate');
  await mobile.locator('#uiGroundGrid').uncheck();
  assert.equal(await mobile.evaluate(()=>document.getElementById('grid').object3D.visible),false);
  await capture(mobile,'immersive-mobile-settings');
  await mobile.locator('#uiHudToggle').click();
  assert.equal(await mobile.locator('#hudBody').isVisible(),false);
  results.mobile.collapsedHeight = await mobile.locator('#hud').evaluate(e=>e.getBoundingClientRect().height);
  assert(results.mobile.collapsedHeight < 80);
  await capture(mobile,'immersive-mobile-focus');
  await mobile.close();
  assert.deepEqual(results.pageErrors, []);
  fs.writeFileSync(path.join(out,'immersive-browser-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:true,output:out,desktopGeometryPreserved:true,persistedPreferences:true,mobile:results.mobile,pageErrors:results.pageErrors},null,2));
}
run().catch(error=>{console.error(error);fs.writeFileSync(path.join(out,'immersive-browser-error.txt'),String(error.stack||error));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();await new Promise(r=>server.close(r));});