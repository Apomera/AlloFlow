const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const generated=path.join(__dirname,'capture-harness.generated.cjs');
require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../../../tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated);
const prefix=process.argv.includes('--initial')?'initial-':'';
(async()=>{const harness=new GlHarness({toolFile:prefix?'reports/cephalopod-hunter-enhancement/pass-twelve/baseline.generated.cjs':'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});await harness.start();const browser=await chromium.launch({headless:true}),errors=[],captures=[];try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const species of ['commonOcto','cuttlefish']){
    await page.setViewportSize({width:1280,height:1100});await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:'observe',huntSeed:2741,_threeLoaded:true}});
    const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await page.evaluate(()=>{window.__nativeDelta=THREE.Clock.prototype.getDelta;THREE.Clock.prototype.getDelta=function(){return 0;};});
    const overview=prefix+species+'-reef.png';await canvas.screenshot({path:path.join(__dirname,overview)});captures.push(overview);
    if(species==='commonOcto'){
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});
      await page.waitForTimeout(300);const phone=prefix+'reef-phone.png';await canvas.screenshot({path:path.join(__dirname,phone)});captures.push(phone);
    }else{
      await canvas.focus();await page.keyboard.press('KeyF');await page.evaluate(()=>{THREE.Clock.prototype.getDelta=window.__nativeDelta;});
      await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();
      await page.waitForTimeout(300);const model=prefix+'cuttlefish-plants.png';await canvas.screenshot({path:path.join(__dirname,model)});captures.push(model);
    }
  }
  const result={errors,captures,fixture:'Ordinary field study after one second, with simulation delta frozen for reef views. Cuttlefish uses standard paused inspection with one Orbit right and Higher input. No material, geometry, camera-coordinate or light overrides.'};
  fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
}finally{await browser.close();await harness.stop();}})().catch(e=>{console.error(e);process.exitCode=1;});
