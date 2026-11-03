/* Eye-level jug inspection reveals displayed measurements and checks explicitly. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/kitchen-studio-measure-view');
const storageKey = 'alloflow-kitchen-studio-v1';
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css'};
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(data);
  });
});

function controls(page) {
  const canvas = page.locator('#scene canvas');
  const saved = () => page.evaluate(key => localStorage.getItem(key), storageKey);
  const current = async () => {
    const value = JSON.parse(await saved());
    return value.serviceActive ? value.service.work : value.drafts[value.current];
  };
  async function station(id) {
    await page.locator('[data-station="'+id+'"]').click();
    await page.locator('#focusView').click();
    await canvas.scrollIntoViewIfNeeded();
  }
  async function point(name) {
    await canvas.scrollIntoViewIfNeeded();
    return canvas.evaluate((node, id) => {
      const point = JSON.parse(node.dataset.targets)[id], bounds = node.getBoundingClientRect();
      if (!point || point.x < 0 || point.x > bounds.width || point.y < 0 || point.y > bounds.height) {
        throw new Error('The projected tool is outside the canvas: '+id);
      }
      return {x: bounds.left + point.x, y: bounds.top + point.y};
    }, name);
  }
  async function tap(name) { const p = await point(name); await page.mouse.click(p.x, p.y); }
  async function carry() {
    const end = await point('jugFill'), start = await point('stockCarton');
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    assert.equal(await canvas.getAttribute('data-held'), 'stockCarton');
    await page.mouse.move(end.x, end.y, {steps: 10});
  }
  async function pour() { await carry(); await page.mouse.up(); }
  const action = name => page.locator('[data-action="'+name+'"]').click();
  const open = () => page.locator('#studioMeasureOpen').click();
  const close = () => page.locator('#studioMeasureClose').click();
  const cameraTargets = () => canvas.evaluate(node => JSON.parse(node.dataset.targets));
  async function inspection(amount) {
    await page.waitForFunction(() => document.querySelector('#scene canvas').dataset.measureInspection === 'true');
    assert.equal(await canvas.getAttribute('data-measure-eye-ml'), String(amount));
    assert.equal(await page.locator('#studioMeasurePanel').isVisible(), true);
  }
  return {canvas, saved, current, station, point, tap, carry, pour, action, open, close, cameraTargets, inspection};
}

(async () => {
  fs.mkdirSync(out, {recursive:true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.KITCHEN_STUDIO_URL || 'http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html';
  const browser = await chromium.launch({headless:true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const report = {checks:[], accessibility:[], screenshots:[], errors:[]};
  let page;
  async function open(options = {}) {
    const p = await browser.newPage({viewport:{width:1360,height:1000}, reducedMotion:'reduce', ...options});
    p.setDefaultTimeout(20000);
    p.on('pageerror', error => report.errors.push(error.message));
    p.on('console', message => { if (message.type() === 'warning' && message.text().startsWith('Kitchen Studio')) report.errors.push(message.text()); });
    await p.goto(url); await p.locator('#scene canvas[data-targets]').waitFor();
    return p;
  }
  async function shot(p, name) {
    await p.locator('.scene-card').screenshot({path:path.join(out,name+'.png'), style:'.taskbar{visibility:hidden!important}'});
    report.screenshots.push(name+'.png');
  }
  async function audit(p, label) {
    await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const issues = await p.evaluate(async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v => ({id:v.id, targets:v.nodes.map(n => n.target)})));
    report.accessibility.push({label,issues}); assert.deepEqual(issues, [], label);
  }
  try {
    page = await open(); const ui = controls(page); await ui.station('measure');
    const original = await ui.saved(), initialTargets = await ui.cameraTargets();
    await ui.open(); await ui.inspection(0);
    assert.equal(await ui.canvas.getAttribute('data-measure-eye-height'), '100');
    assert.equal(await page.locator('#studioMeasureCheck').isDisabled(), true);
    assert.match(await page.locator('#studioMeasureReadout').innerText(), /empty|0 mL/i);
    await page.locator('#studioMeasureHeight').fill('35'); await page.locator('#studioMeasureHeight').dispatchEvent('input');
    await page.locator('#studioMeasureAlign').click();
    assert.equal(await ui.canvas.getAttribute('data-measure-eye-height'), '0');
    assert.equal(await ui.saved(), original);
    await shot(page, 'empty-jug-inspection');
    await ui.close();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'studioMeasureOpen');
    assert.equal(await page.locator('[data-studio-tool="stockCarton"]').isEnabled(), true);
    assert.equal(await ui.canvas.getAttribute('data-measure-inspection'), 'false');
    const restoredTargets = await ui.cameraTargets();
    for (const name of Object.keys(initialTargets)) for (const axis of ['x','y']) {
      assert.ok(Math.abs(restoredTargets[name][axis]-initialTargets[name][axis])<.00001, 'Closing restores the original camera target '+name);
    }
    await ui.open(); await page.keyboard.press('Escape');
    assert.equal(await ui.canvas.getAttribute('data-measure-inspection'), 'false');
    assert.equal(await ui.saved(), original);
    report.checks.push('Opening, moving and aligning the eye line, closing and Escape leave the cooking record unchanged and restore the camera. Empty jugs are identified.');

    await ui.carry(); assert.equal(await ui.canvas.getAttribute('data-measure-preview'), '150');
    await page.locator('#studioMeasureOpen').evaluate(node => node.click());
    await page.mouse.up(); await ui.inspection(0);
    assert.equal(await ui.canvas.getAttribute('data-held'), '');
    assert.equal(await ui.canvas.getAttribute('data-stock-stream'), 'false');
    assert.equal(await ui.saved(), original);
    await ui.close(); await ui.pour(); const onePour = await ui.saved();
    await ui.tap('jug'); await ui.inspection(150); assert.equal(await ui.saved(), onePour);
    assert.equal(await page.locator('#studioMeasureCheck').isDisabled(), true);
    await page.locator('#studioMeasureCheck').evaluate(node => node.click()); assert.equal(await ui.saved(), onePour);
    await page.locator('#studioMeasureAlign').click();
    assert.equal(await page.locator('#studioMeasureCheck').isEnabled(), true);
    async function holdJugAdjustment() {
      const start = await ui.point('jug');
      await page.mouse.move(start.x,start.y); await page.mouse.down();
      assert.equal(await ui.canvas.getAttribute('data-held'),'jug');
      await page.mouse.move(start.x,start.y-55,{steps:8});
      assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'200');
      assert.match(await page.locator('#studioMeasureReadout').innerText(),/Preview 200 mL/);
      assert.equal(await page.locator('#studioMeasureCheck').isDisabled(),true);
      assert.equal(await ui.saved(),onePour);
    }
    await holdJugAdjustment(); await shot(page,'inspection-quantity-preview');
    await page.locator('#studioMeasureHeight').evaluate(input => {
      input.value='37'; input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.mouse.up();
    assert.equal(await ui.canvas.getAttribute('data-held'),'');
    assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'');
    assert.equal(await ui.canvas.getAttribute('data-measure-eye-height'),'37');
    assert.equal(await ui.saved(),onePour);
    assert.match(await page.locator('#studioMeasureReadout').innerText(),/150 mL/);
    await page.locator('#studioMeasureAlign').click();
    await holdJugAdjustment(); await page.keyboard.press('Escape'); await page.mouse.up();
    assert.equal(await ui.canvas.getAttribute('data-measure-inspection'),'true');
    assert.equal(await ui.canvas.getAttribute('data-held'),'');
    assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'');
    await ui.inspection(150);
    assert.equal(await ui.saved(),onePour);
    await page.keyboard.press('Escape');
    assert.equal(await ui.canvas.getAttribute('data-measure-inspection'),'false');
    assert.equal(await ui.saved(),onePour);
    await ui.open(); await page.locator('#studioMeasureAlign').click();
    await holdJugAdjustment(); await page.mouse.up(); await ui.inspection(200);
    assert.equal((await ui.current()).log.at(-1).action,'add50');
    assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'');
    assert.doesNotMatch(await page.locator('#studioMeasureReadout').innerText(),/Preview/);
    assert.equal(await page.locator('#studioMeasureCheck').isEnabled(),true);
    await ui.action('remove50'); await ui.inspection(150);
    report.checks.push('Aligned quantity drags show a reversible 200 mL preview and withhold checking while held. Escape and a viewpoint input cancel the adjustment, retain the requested eye height and preserve 150 mL; release commits one 50 mL decision.');
    await page.locator('#studioMeasureCheck').click();
    let state = await ui.current(); assert.equal(state.done, false);
    assert.equal(state.log.at(-1).action, 'check'); assert.equal(state.log.at(-1).accepted, false);
    await ui.close(); await ui.pour(); await ui.pour(); await ui.open(); await ui.inspection(450);
    const unchecked = await ui.saved(); await page.locator('#studioMeasureAlign').click();
    assert.equal(await ui.saved(), unchecked); await shot(page, 'eye-level-450ml');
    await audit(page, 'Desktop jug inspection');
    await page.locator('#studioMeasureCheck').click(); state = await ui.current();
    assert.equal(state.done, true); assert.equal(state.log.at(-1).action, 'check');
    assert.equal(await page.locator('#studioMeasureCheck').isDisabled(), true);
    report.checks.push('Opening cancels a held pour, tapping the jug opens inspection, and only the explicit check records an answer. Wrong amounts retain their correction and 450 mL completes the recipe.');

    await ui.close(); await page.locator('input[name=reason][value="2"]').check(); await page.locator('#submit').click();
    if (!(await page.locator('#replayPanel').evaluate(node => node.open))) await page.locator('#replayPanel > summary').click();
    await page.locator('#replayStep').fill('1'); await page.locator('#replayStep').dispatchEvent('input');
    const submitted = await ui.saved(); await ui.open(); await ui.inspection(150);
    assert.equal(await page.locator('#studioMeasureCheck').isDisabled(), true);
    assert.match(await page.locator('#studioMeasureReadout').innerText(), /recorded/i);
    await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    await ui.inspection(0); assert.equal(await ui.saved(), submitted);
    await ui.close(); await page.locator('#returnLatest').click();
    await page.locator('#newChallenge').click(); await ui.pour(); await ui.pour(); await ui.open(); await ui.inspection(300);
    await page.locator('#studioMeasureAlign').click();
    await page.locator('#studioMeasureCheck').click(); assert.equal((await ui.current()).done, true);
    report.checks.push('Historical inspection follows each displayed replay quantity and disables checking. The four-serving challenge accepts an explicit 300 mL check.');

    await ui.close(); await page.locator('#retry').click();
    for (let n = 0; n < 6; n++) await ui.action('add150'); await ui.action('add50'); await ui.action('add50');
    await ui.open(); await ui.inspection(1000);
    await ui.action('remove50'); await ui.inspection(950);
    await ui.action('add50'); await ui.inspection(1000);
    const full = await ui.saved();
    await page.locator('#studioMeasureHeight').fill('0'); await page.locator('#studioMeasureHeight').dispatchEvent('input');
    assert.equal(await ui.saved(), full); await ui.close();
    for (const button of ['focusView','resetView','rotateLeft']) {
      await ui.open(); await page.locator('#'+button).click();
      assert.equal(await ui.canvas.getAttribute('data-measure-inspection'), 'false');
    }
    await ui.open(); await page.locator('#viewToggle').click();
    assert.equal(await page.locator('#studioMeasureView').isVisible(), false);
    assert.equal(await ui.canvas.getAttribute('data-measure-inspection'), 'false');
    await page.locator('#viewToggle').click(); await ui.open(); await ui.station('knife');
    assert.equal(await page.locator('#studioMeasureView').isVisible(), false);
    assert.equal(await ui.canvas.getAttribute('data-measure-inspection'), 'false');
    report.checks.push('Full-jug inspection remains within capacity. Text view, station changes and standard camera controls leave the close-up cleanly.');
    await page.close();

    page = await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const phone = controls(page); await phone.station('measure');
    for (let n=0;n<3;n++) await phone.action('add150');
    const phoneBefore = await phone.saved(), tap = await phone.point('jug'), scroll = await page.evaluate(() => scrollY);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...tap,id:1,radiusX:3,radiusY:3,force:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await phone.inspection(450); assert.equal(await phone.saved(),phoneBefore);
    assert.equal(await page.evaluate(() => scrollY), scroll);
    await page.locator('#studioMeasureHeight').focus(); await page.keyboard.press('Home');
    assert.equal(await phone.canvas.getAttribute('data-measure-eye-height'),'0');
    await shot(page,'phone-eye-level-jug');
    await page.setViewportSize({width:320,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
    await audit(page,'320px eye-level measuring');
    await page.locator('#studioMeasureCheck').focus(); await page.keyboard.press('Enter');
    assert.equal((await phone.current()).done,true);
    assert.equal((await phone.current()).log.at(-1).action,'check');
    report.checks.push('Native phone taps open inspection without scrolling or recording a decision. Keyboard alignment and explicit checking work at 320px with no overflow.');
    await page.close(); assert.deepEqual(report.errors, []); report.pass=true;
  } catch (error) {
    report.failure=error.stack||error.message;
    if (page) await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(report,null,2));
})().catch(error => {console.error(error);process.exitCode=1;server.close();});
