const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const report=path.resolve('reports/universe-flight-2026-09-29');
(async()=>{
  const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file:///'+path.join(report,'preview.html').replaceAll('\\','/'));
  await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false);
  const button=name=>page.getByRole('button',{name,exact:true});
  const readout=()=>page.locator('.uf-readouts').innerText();
  const paceMax=()=>page.locator('#uf-speed').evaluate(input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'100');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  const before=await readout();
  await button('Start landmark tour').click();
  assert.equal(await readout(),before,'Preparing a tour leaves the camera in place');
  assert.equal(await button('Next tour stop').isDisabled(),true);
  assert.equal(await page.locator('.uf-tour-stops li').count(),3);
  await page.locator('.uf-tour').screenshot({path:path.join(report,'landmark-tour-desktop.png')});
  for(let stop=0;stop<3;stop++){
    await paceMax();await button('Fly to tour stop').click();
    if(stop===0){
      await page.waitForTimeout(200);await button('Pause travel').click();
      const paused=await readout();await page.waitForTimeout(250);assert.equal(await readout(),paused);
      await button('Resume tour leg').click();
    }
    await page.waitForFunction(()=>document.querySelector('.uf-tour-stops li[aria-current="step"] small')?.textContent==='Visited',null,{timeout:20000});
    assert.equal(await page.locator('.uf-transport button').first().innerText(),'Start travel');
    const arrived=await readout();await page.waitForTimeout(300);assert.equal(await readout(),arrived,'Arrival never departs for the next stop automatically');
    await button(stop===2?'Finish tour':'Next tour stop').click();
    assert.equal(await readout(),arrived,'Preparing the next stop does not move the camera');
  }
  assert.match(await page.locator('.uf-tour-complete').innerText(),/3 visited · 0 skipped/);
  assert.equal(await page.locator('#uf-target-info h4').innerText(),'Pale star','Tour completion keeps the final destination available');
  await page.locator('.uf-tour').screenshot({path:path.join(report,'landmark-tour-complete.png')});
  await button('Close tour summary').click();await button('Start landmark tour').click();
  await button('Skip this stop').click();
  const priorPace=await page.locator('#uf-speed').inputValue();
  await button('Skip this stop').click();
  assert.equal(await page.locator('#uf-speed').inputValue(),priorPace,'A stop already in range preserves the current pace');
  await button('Skip this stop').click();
  assert.match(await page.locator('.uf-tour-complete').innerText(),/0 visited · 3 skipped/);
  await button('Close tour summary').click();await button('Start landmark tour').click();
  await button('Einstein’s light chase').click();assert.equal(await page.locator('.uf-tour').count(),0);
  await button('Free exploration').click();assert.equal(await button('Start landmark tour').count(),1);
  for(const [region,count] of [['galaxy',3],['cosmic',4]]){
    await page.locator('#uf-region').selectOption(region);await button('Start landmark tour').click();
    assert.equal(await page.locator('.uf-tour-stops li').count(),count);
    await button('Fly to tour stop').click();await page.waitForTimeout(200);await button('End tour').click();
    assert.equal(await page.locator('.uf-transport button').first().innerText(),'Start travel');
    assert.equal(await button('End guided approach').count(),0);
  }
  await button('Start landmark tour').click();
  await button('Select destination: Golden elliptical').click();assert.equal(await button('Start landmark tour').count(),1);
  await button('Start landmark tour').click();
  await page.locator('.uf-vistas').getByRole('button',{name:/The companion/}).click();assert.equal(await button('Start landmark tour').count(),1);
  await button('Start landmark tour').click();await button('Close flight explorer').click();await button('Open 3D flight').click();
  await page.waitForFunction(()=>document.querySelector('.uf-transport button')?.disabled===false);
  assert.equal(await button('Start landmark tour').count(),1);
  await button('Start landmark tour').click();await button('Reset position').click();
  assert.equal(await button('Start landmark tour').count(),1);
  await button('Start landmark tour').click();await page.setViewportSize({width:320,height:800});
  await page.locator('.uf-tour').screenshot({path:path.join(report,'landmark-tour-phone.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const accessibility=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('.uf-tour'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});
  assert.deepEqual(accessibility,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(report,'tour-check.json'),JSON.stringify({errors,accessibility,checks:['prepare paused','complete three-stop tour','pause/resume','arrival holds','skip counts','three scenes','end during travel','manual destination','scenic view','mode change','close/reopen','mobile layout']},null,2));
  await browser.close();console.log('Landmark tour browser checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
