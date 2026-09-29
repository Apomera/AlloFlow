// Review the local Scale Explorer preview with deterministic, still scenes.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const out = path.resolve(process.env.SCALE_REVIEW_OUT || 'reports/scale-explorer-realism');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
    page.on('console',msg=>{if(msg.type()==='error'){errors.push(msg.text());console.log('CONSOLE ERROR',msg.text());}});
    page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
    page.on('requestfailed',r=>console.log('REQUEST FAILED',r.url(),r.failure()));
    await page.goto(process.env.SCALE_PREVIEW_URL || 'http://127.0.0.1:54391/');
    await page.locator('[data-atlas-ready]').waitFor();
    await page.waitForFunction(()=>document.querySelector('[data-atlas-ready]')?.dataset.atlasSurface==='detailed',{},{timeout:10000}).catch(async()=>console.log('Human surface fallback',await page.evaluate(()=>({scripts:[...document.scripts].map(s=>s.src),gltf:!!window.THREE.GLTFLoader,urls:performance.getEntriesByType('resource').map(r=>r.name)}))));
    for(const id of (process.argv.slice(2).length?process.argv.slice(2):['human','elephant','blue-whale','rbc','mitochondrion','dna','earth','jupiter','milkyway'])) {
      await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
      await page.waitForFunction(id=>document.querySelector('[data-atlas-ready]')?.dataset.atlasObjects===id,id);
      if(['earth','moon','jupiter'].includes(id))await page.waitForTimeout(700);
      await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-review.png')});
      console.log('Captured',id);
    }
    fs.writeFileSync(path.join(out,'visual-errors.json'),JSON.stringify(errors,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
