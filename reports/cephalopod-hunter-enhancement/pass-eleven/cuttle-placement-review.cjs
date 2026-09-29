const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[],captures=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const url=fs.readFileSync(path.join(__dirname,'../preview-url.txt'),'utf8').trim();
    await page.goto(url+'?species=cuttlefish&mode=observe');
    const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await canvas.focus();await page.keyboard.press('KeyF');
    await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();
    await page.waitForTimeout(500);await canvas.screenshot({path:path.join(__dirname,'cuttlefish-model.png')});captures.push('cuttlefish-model.png');
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(500);await canvas.screenshot({path:path.join(__dirname,'cuttlefish-phone.png')});captures.push('cuttlefish-phone.png');
    await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>{document.getElementById('wrap').style.width='';window.dispatchEvent(new Event('resize'));});
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Closer',exact:true}).click();
    await page.waitForTimeout(500);await canvas.screenshot({path:path.join(__dirname,'cuttlefish-eye-detail.png')});captures.push('cuttlefish-eye-detail.png');
    const result={errors,captures,fixture:'Ordinary paused inspection after one second of observe play; standard Orbit right/Higher controls and phone viewport. Eye detail uses one additional Orbit right and Closer. No geometry, camera-coordinate, material, light or pose overrides.'};
    fs.writeFileSync(path.join(__dirname,'cuttle-placement-captures.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
