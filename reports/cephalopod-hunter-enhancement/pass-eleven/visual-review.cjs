const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const prefix=process.argv.includes('--initial')?'initial-':'';
(async()=>{const browser=await chromium.launch({headless:true}),errors=[],captures=[];try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const url=fs.readFileSync(path.join(__dirname,'../preview-url.txt'),'utf8').trim();
  for(const species of ['commonOcto','cuttlefish','bobtailSquid','dumboOcto','vampireSquid','humboldtSquid']){
    await page.setViewportSize({width:1280,height:1100});await page.goto(url+'?species='+species+'&mode=observe');
    const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await page.evaluate(()=>{window.__nativeDelta=THREE.Clock.prototype.getDelta;THREE.Clock.prototype.getDelta=function(){return 0;};});
    if(['commonOcto','dumboOcto','vampireSquid'].includes(species)){
      const file=prefix+species+'-environment.png';await canvas.screenshot({path:path.join(__dirname,file)});captures.push(file);
    }
    await canvas.focus();await page.keyboard.press('KeyF');await page.evaluate(()=>{THREE.Clock.prototype.getDelta=window.__nativeDelta;});
    await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();
    await page.waitForTimeout(500);const file=prefix+species+'-model.png';await canvas.screenshot({path:path.join(__dirname,file)});captures.push(file);
    if(species==='cuttlefish'||species==='vampireSquid'){
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});
      await page.waitForTimeout(500);const phone=prefix+species+'-phone.png';await canvas.screenshot({path:path.join(__dirname,phone)});captures.push(phone);
    }
  }
  const result={errors,captures,fixture:'Ordinary field study with simulation delta frozen for gameplay captures. Models use standard paused inspection, one Orbit right and Higher input. No camera-coordinate, geometry, material or lighting override.'};
  fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
