'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const before = process.argv.includes('--before');
const source = read(before ? 'scratch/tectonics-depth-comparison-review/before.js' : 'stem_lab/stem_tool_platetectonics.js');
const out = path.resolve('scratch/tectonics-depth-comparison-review', before ? 'before' : 'after');
fs.mkdirSync(out, { recursive: true });
const records = {
  convergent: { mode: 'convergent', events: 10, minKm: 10, maxKm: 650, shallow: 4, intermediate: 3, deep: 3, years: 600000, rate: 5 },
  divergent: { mode: 'divergent', events: 4, minKm: 5, maxKm: 30, shallow: 4, intermediate: 0, deep: 0, years: 600000, rate: 5 },
  transform: { mode: 'transform', events: 2, minKm: 5, maxKm: 30, shallow: 2, intermediate: 0, deep: 0, years: 600000, rate: 5 }
};
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const checks = [], captures = [], errors = [], accessibility = [];
  const check = async (name, fn) => {
    try { checks.push({ name, passed: true, detail: await fn() }); console.log('PASS', name); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<html lang="en"><head><title>Tectonics readings QA</title></head><body style="margin:0;font-family:system-ui"><main id="wrap" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => Promise.resolve(THREE);
      StemLab.loadScriptResilient = () => new Promise(() => {});
      const frames = new Map(); let id = 0, now = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
      window.cancelAnimationFrame = handle => frames.delete(handle);
      window.qaFrame = (delta = 16) => {
        now = Math.max(now + delta, performance.now());
        const callbacks = [...frames.values()]; frames.clear();
        ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now)));
      };
      window.qaFixedEvents = () => {
        // Event probability, magnitude, deep branch, depth, cross-strike jitter,
        // along-strike location. Only RNG/clock are fixtures; real state logic runs.
        const sequence = [0, 0.5, 0.9, 0.6, 0.5, 0.5]; let index = 0;
        Math.random = () => sequence[index++ % sequence.length];
      };
      window.qaLog = { announcements: [], xp: [], toasts: [], records: [], clears: 0 };
      window.qaNoEvents = () => { Math.random = () => 0.99999; }; qaNoEvents();
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.getElementById('wrap')); let generation = 0;
      function QAHost(props) {
        const [records, setRecords] = React.useState(props.records);
        return React.createElement(AlloTectonicsInteractive, { darkMode: props.dark, isContrast: false, depthRecords: records,
          onRecordDepths: trial => { qaLog.records.push(trial); setRecords(previous => ({ ...previous, [trial.mode]: trial })); }, onClearDepths: () => { qaLog.clears++; setRecords({}); },
          announceToSR: text => qaLog.announcements.push(text), awardXP: value => qaLog.xp.push(value), addToast: value => qaLog.toasts.push(value) });
      }
      window.qaMount = (dark, records) => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        qaLog.announcements = []; qaLog.xp = []; qaLog.toasts = []; qaLog.records = []; qaLog.clears = 0;
        ReactDOM.flushSync(() => root.render(React.createElement(QAHost, { key: ++generation, dark, records })));
      };
    });

    const click=selector=>page.locator(selector).evaluate(node=>node.click());
    const paint=async()=>page.evaluate(()=>{qaNoEvents();qaFrame(0);qaFrame(0);});
    const shot=async(selector,name)=>{
      await page.locator(selector).evaluate(node=>node.scrollIntoView({block:'center'}));await paint();
      await page.locator(selector).screenshot({path:path.join(out,name+'.png'),animations:'disabled'});captures.push(name+'.png');
    };
    for(const dark of [false,true]) for(const width of [1100,390]) {
      const tag=(dark?'dark':'light')+'-'+width;
      await page.setViewportSize({width,height:1000});
      await page.evaluate(({dark,records})=>qaMount(dark,records),{dark,records});await paint();
      const panel=page.locator('[data-pt-depth-investigation]');
      await panel.waitFor();
      if(before){await shot('[data-pt-depth-investigation]','saved-'+tag);continue;}
      await check(tag+': saved ranges and comparisons use retained data',async()=>{
        const ranges=await panel.locator('[data-pt-depth-range-bar]').evaluateAll(nodes=>nodes.map(node=>({mode:node.dataset.ptDepthRangeBar,left:parseFloat(node.style.left),width:parseFloat(node.style.width),trackWidth:node.parentElement.getBoundingClientRect().width})));
        assert.equal(ranges.length,3);
        // Chromium serializes percentage styles to limited significant digits.
        for(const item of ranges){assert(Math.abs(item.left-records[item.mode].minKm/700*100)<0.001);assert(Math.abs(item.width-(records[item.mode].maxKm-records[item.mode].minKm)/700*100)<0.001);}
        assert(Math.max(...ranges.map(item=>item.trackWidth))-Math.min(...ranges.map(item=>item.trackWidth))<1);
        assert.match(await panel.locator('[data-pt-depth-comparison="divergent"]').textContent(),/650 km; sample size 10.*30 km; sample size 4.*620 km deeper/);
        assert.equal(await page.evaluate(()=>qaLog.records.length),0);
        await shot('[data-pt-depth-investigation]','saved-'+tag);
        await panel.locator('[data-pt-depth-capture-details] summary').click({force:true});
        assert.match(await panel.locator('[data-pt-depth-capture="convergent"]').textContent(),/600,000 model years since reset; rate at capture 5/);
        await shot('[data-pt-depth-capture-details]','metadata-'+tag);
        const audit=await page.evaluate(async()=> (await axe.run('[data-pt-depth-investigation]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length})));
        assert.deepEqual(audit,[]);accessibility.push({name:tag,violations:audit});
        const metrics=await panel.evaluate(node=>({overflow:document.documentElement.scrollWidth-innerWidth,clipped:[...node.querySelectorAll('button,summary,[data-pt-depth-range-bar]')].filter(el=>{const r=el.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1;}).map(el=>el.dataset.ptDepthRangeBar||el.tagName),labelFont:getComputedStyle(node.querySelector('[data-pt-depth-sample] h6')).fontSize}));
        assert.equal(metrics.overflow,0);assert.deepEqual(metrics.clipped,[]);assert(parseFloat(metrics.labelFont)>=14);
        return {ranges,metrics};
      });
      await check(tag+': keyboard recording replaces only its boundary and survives reset',async()=>{
        await page.evaluate(()=>qaFixedEvents());await click('[data-pt-model-step]');await paint();
        assert.equal(await panel.locator('[data-pt-depth-preview-count]').getAttribute('data-pt-depth-preview-count'),'1');
        const record=panel.locator('[data-pt-depth-record]');await record.focus();await page.keyboard.press('Enter');await paint();
        assert.equal(await page.evaluate(()=>qaLog.records.length),1);
        const saved=await panel.locator('[data-pt-depth-sample="convergent"]').textContent();
        assert.match(saved,/Events: 1/);
        for(let i=0;i<2;i++){await page.evaluate(()=>qaFixedEvents());await click('[data-pt-model-step]');await paint();}
        assert.equal(await panel.locator('[data-pt-depth-preview-count]').getAttribute('data-pt-depth-preview-count'),'3');
        assert.equal(await panel.locator('[data-pt-depth-sample="convergent"]').textContent(),saved);
        assert.equal(await page.evaluate(()=>qaLog.records.length),1);
        await shot('[data-pt-depth-preview]','live-vs-saved-'+tag);
        await record.focus();await page.keyboard.press('Space');await paint();
        assert.equal(await page.evaluate(()=>qaLog.records.length),2);
        assert.match(await panel.locator('[data-pt-depth-sample="convergent"]').textContent(),/Events: 3/);
        assert.match(await panel.locator('[data-pt-depth-sample="divergent"]').textContent(),/Events: 4/);
        await click('[data-pt-model-reset]');await paint();
        assert.equal(await record.isDisabled(),true);
        assert.match(await panel.locator('[data-pt-depth-sample="convergent"]').textContent(),/Events: 3/);
        const beforeIdle=await page.evaluate(()=>JSON.stringify(qaLog));await page.waitForTimeout(200);await paint();
        assert.equal(await page.evaluate(()=>JSON.stringify(qaLog)),beforeIdle);
        assert.equal(await page.evaluate(()=>qaLog.xp.length+qaLog.toasts.length),0);
        await panel.locator('[data-pt-depth-clear]').focus();await page.keyboard.press('Enter');await paint();
        assert.equal(await panel.locator('[data-pt-depth-range-bar]').count(),0);
        assert.equal(await page.evaluate(()=>qaLog.clears),1);
        return {recordings:2,idleUnchanged:true,xp:0,toasts:0};
      });
    }
  }catch(error){errors.push(String(error.stack||error));console.error(error);}
  finally{
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),checks,captures,errors,accessibility},null,2));
    await browser.close();
  }
  console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,captures:captures.length,errors:errors.length,path:path.join(out,'results.json')}));
  if(errors.length||checks.some(c=>!c.passed))process.exitCode=1;
})();
