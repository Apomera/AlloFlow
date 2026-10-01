const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
async function main() {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:1000}}), errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:8768/');
    await page.waitForSelector('.ww-cover-options');
    const descriptions=await page.locator('.ww-cover-option').evaluateAll(cards=>cards.map(c=>({label:c.getAttribute('aria-label'),description:document.getElementById(c.getAttribute('aria-describedby'))?.textContent})));
    assert.equal(descriptions.length,4);assert(descriptions.every(c=>c.description?.length>20));
    const cases=await page.evaluate(()=>{
      const K=WaterWorldsKernel,finish=s=>K.advance(K.begin(s,false),240),base=K.record(finish(K.initial()));
      return {same:{...finish(base),question:'memory'},rain:{...finish({...base,settings:{...base.settings,rain:60}}),question:'memory'},cover:{...finish(K.edit(base,[0],'paved')),question:'memory'}};
    });
    const stages={};
    for(const [key,saved] of Object.entries(cases)){
      await page.evaluate(s=>mountWaterWorlds({wcMode:'worlds',waterWorlds:s},true),saved);
      await page.waitForSelector('.ww-inquiry-steps');
      stages[key]=await page.locator('.ww-inquiry-steps > [aria-current="step"] strong').innerText();
    }
    assert.equal(stages.same,'Explain with evidence');assert.equal(stages.rain,'Observe & test');assert.equal(stages.cover,'Observe & test');
    assert((await page.locator('.ww-inquiry-steps').innerText()).includes('This run also changed rain or cover.'));
    const colors=await page.locator('.ww-graph polyline').evaluateAll(nodes=>nodes.map(n=>({stroke:getComputedStyle(n).stroke,background:getComputedStyle(n.closest('.ww-panel')).backgroundColor})));
    function luminance(rgb){const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
    const contrast=colors.map(c=>{const a=luminance(c.stroke),b=luminance(c.background);return {...c,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
    assert.equal(contrast.length,2);assert(contrast.every(c=>c.ratio>=3));assert.deepEqual(errors,[]);
    await page.locator('.ww-graph').screenshot({path:'reports/water-worlds-design-studio/final-dark-graph.png'});
    const result={checks:['Cover descriptions exposed to assistive technology','Memory guide requires matching recorded rain and cover','Dark graph lines exceed 3:1 contrast'],descriptions,stages,contrast,errors};
    fs.writeFileSync('reports/water-worlds-design-studio/final-browser-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
