const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const before = process.argv.includes('--before'), dir = __dirname;
const bundle = path.join(dir, 'harness.cjs');
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const contrast = panel => {
  const rgba = color => color.match(/[\d.]+/g).map(Number);
  const lum = color => color.slice(0, 3).map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const samples = [...panel.querySelectorAll('h3,h4,p,label,span,div,button,th,td,dt,dd,figcaption')].filter(node => node.textContent.trim() && !node.children.length && node.getBoundingClientRect().height && !node.disabled && !node.closest('[aria-hidden="true"]'));
  return Math.min(...samples.map(node => {
    const layers = [];
    for (let parent = node; parent; parent = parent.parentElement) { const color = rgba(getComputedStyle(parent).backgroundColor); layers.unshift(color); if ((color[3] ?? 1) >= 1) break; }
    let bg = [255,255,255];
    for (const layer of layers) bg = bg.map((v, i) => layer[i] * (layer[3] ?? 1) + v * (1 - (layer[3] ?? 1)));
    const a = lum(rgba(getComputedStyle(node).color)), b = lum(bg); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }));
};
(async () => {
  const harness = new GlHarness({ toolFile:'stem_lab/stem_tool_solarsystem.js', toolId:'solarSystem', width:1060, height:1400, appStyles:true, layout:'document' });
  await harness.start();
  const browser = await chromium.launch();
  const page = await browser.newPage({deviceScaleFactor:1});
  await page.emulateMedia({reducedMotion:'reduce'});
  const results=[];
  try {
    for (const [width,dark] of (before ? [[1060,true],[320,false]] : [[1060,true],[1060,false],[736,true],[320,false],[320,true]])) {
      await page.setViewportSize({width,height:1400});
      await page.goto(harness.url+'/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node,w) => node.style.width=w+'px',width);
      await page.evaluate(data => {
        window.__mount({solarSystem:data});
        window.__ctx.isDark=data.isDark;
        document.documentElement.classList.toggle('dark',data.isDark);
        window.__rerender();
      }, {
        tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:8,isDark:dark,
        keplerInquiry:{a:1,e:0,mass:1,hypothesis:'I predict shape will change while the period stays the same.',understood:true,explanation:'Compare the period and endpoint speeds.',log:[]}
      });
      const svg=page.getByRole('img',{name:'Kepler inquiry orbit visualization',exact:true});
      await svg.waitFor({timeout:60000});
      const panel=before ? svg.locator('..') : page.locator('#solar-kepler-inquiry');
      const name=`${before?'before':'after'}-${width}-${dark?'dark':'light'}`;
      await panel.screenshot({path:path.join(dir,name+'-circle.png')});
      if (!before) await panel.getByRole('button',{name:'Save baseline',exact:true}).click();
      await page.evaluate(() => window.__ctx.updateMulti('solarSystem',{keplerInquiry:{...window.__toolData.solarSystem.keplerInquiry,e:.98}}));
      await panel.screenshot({path:path.join(dir,name+'-elongated.png')});
      const metrics=await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:window.__events.errors}));
      assert.deepEqual(metrics.errors,[]);
      if (!before) {
        assert.ok(metrics.scrollWidth<=width+1,JSON.stringify(metrics));
        metrics.minimumContrast=await panel.evaluate(contrast);
        assert.ok(metrics.minimumContrast>=4.5,'Contrast '+metrics.minimumContrast);
        metrics.minimumTargetHeight=await panel.evaluate(node => Math.min(...[...node.querySelectorAll('button,select,input[type=range]')].map(n => n.getBoundingClientRect().height)));
        assert.ok(metrics.minimumTargetHeight>=43.5,'Targets '+metrics.minimumTargetHeight);
        metrics.svgText=await svg.evaluate(node => [...node.querySelectorAll('text')].map(n => {const b=n.getBBox();return {text:n.textContent,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};}));
        assert.ok(metrics.svgText.every(b => b.x>=0 && b.y>=0 && b.right<=360 && b.bottom<=300),JSON.stringify(metrics.svgText));
        metrics.tableTextFits=await panel.locator('th,td').evaluateAll(nodes => nodes.every(node => {const b=node.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(node);return [...r.getClientRects()].every(t => t.left>=b.left-1 && t.right<=b.right+1);}));
        assert.ok(metrics.tableTextFits,'Table text overflow');
      }
      results.push({dark,...metrics});
      console.log('Checked Inquiry '+width+'px '+(dark?'dark':'light'));
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir,(before?'before':'after')+'-metrics.json'),JSON.stringify(results,null,2));
  } finally {await page.close();await browser.close();await harness.stop();fs.unlinkSync(bundle);}
})().catch(error => {console.error(error);process.exitCode=1;});
