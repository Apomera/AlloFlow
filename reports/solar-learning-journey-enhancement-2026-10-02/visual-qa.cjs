const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const before = process.argv.includes('--before'), dir = __dirname;
const bundle = path.join(dir, 'harness.cjs');
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const contrast = panels => {
  const rgba = color => color.match(/[\d.]+/g).map(Number);
  const lum = color => color.slice(0, 3).map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const samples = panels.flatMap(panel => [...panel.querySelectorAll('h3,h4,h5,p,label,span,div,button,th,td')]).filter(node => node.textContent.trim() && !node.children.length && node.getBoundingClientRect().height && !node.disabled && !node.closest('[aria-hidden="true"]'));
  return Math.min(...samples.map(node => {
    const layers = [];
    for (let parent = node; parent; parent = parent.parentElement) { const color = rgba(getComputedStyle(parent).backgroundColor); layers.unshift(color); if ((color[3] ?? 1) >= 1) break; }
    let bg = [255,255,255];
    for (const layer of layers) bg = bg.map((v, i) => layer[i] * (layer[3] ?? 1) + v * (1 - (layer[3] ?? 1)));
    const a = lum(rgba(getComputedStyle(node).color)), b = lum(bg); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }));
};
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1200, appStyles: true, layout: 'document' });
  await harness.start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = [];
  try {
    for (const [width, dark] of (before ? [[1060,true],[320,false]] : [[1060,true],[1060,false],[736,true],[320,false],[320,true]])) {
      await page.setViewportSize({ width, height: 1200 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node,w) => node.style.width = w + 'px', width);
      await page.evaluate(data => window.__mount({ solarSystem: data }), {
        tutorialDismissed:true, solarMissionDashboardOpen:false, orreryMode:true, orr_tab:0, orr_sel:'mercury', orr_mission_idx:2, orr_paused:true, orr_time:0, orr_zoom:'inner', isDark:dark,
        orr_mission_progress:{mercury_speed:{started:true,correct:true},longer_year:{started:true,correct:true}},
        orr_snapshots:{mercury:{a:{bodyId:'mercury',time:0,distance:.307,speed:58.9,phase:'near perihelion'},b:{bodyId:'mercury',time:.12,distance:.467,phase:'near aphelion'},prediction:'slower',predictionResult:{choice:'slower',actual:'slower',correct:true,speedDelta:-20,distanceDelta:.16}}}
      });
      await page.locator('#orrery-guided-objective').waitFor({timeout:60000});
      await page.locator('.orr-evidence').waitFor({timeout:60000});
      const name = `${before ? 'before' : 'after'}-${width}-${dark ? 'dark' : 'light'}`;
      await page.locator('#orrery-guided-mission').screenshot({path:path.join(dir,name+'-missions.png')});
      await page.locator('.orr-evidence').screenshot({path:path.join(dir,name+'-evidence.png')});
      const metrics = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));
      assert.ok(metrics.scrollWidth <= width + 1, JSON.stringify(metrics));
      assert.deepEqual(metrics.errors, []);
      if (!before) {
        const panels = page.locator('#orrery-guided-mission,.orr-evidence');
        metrics.minimumContrast = await panels.evaluateAll(contrast);
        assert.ok(metrics.minimumContrast >= 4.5, 'Contrast '+metrics.minimumContrast);
        metrics.minimumTargetHeight = await panels.evaluateAll(nodes => Math.min(...nodes.flatMap(node => [...node.querySelectorAll('button,select')]).map(node => node.getBoundingClientRect().height)));
        assert.ok(metrics.minimumTargetHeight >= 43.5, 'Targets '+metrics.minimumTargetHeight);
        const missingReadings = await page.locator('.orr-evidence-unavailable').evaluateAll(nodes => nodes.flatMap(node => {
          const cell = node.closest('td').getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(node);
          return [...range.getClientRects()].map(line => ({ text: node.textContent, left: line.left, right: line.right, cellLeft: cell.left, cellRight: cell.right }));
        }));
        assert.ok(missingReadings.every(line => line.left >= line.cellLeft - 1 && line.right <= line.cellRight + 1), JSON.stringify(missingReadings));
        assert.equal(await page.getByText('All guided missions complete',{exact:true}).count(),0);
        assert.equal(await page.locator('.orr-evidence-result').count(),0);
        await page.getByRole('button',{name:'Continue unfinished mission',exact:true}).click();
        await page.locator('#orrery-guided-mission').screenshot({path:path.join(dir,name+'-resume.png')});
      }
      results.push({dark,...metrics});
      console.log('Checked learning journey '+width+'px '+(dark?'dark':'light'));
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
  } finally { await page.close(); await browser.close(); await harness.stop(); fs.unlinkSync(bundle); }
})().catch(error => {console.error(error);process.exitCode=1;});
