const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true}),errors=[],captures=[];try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const url=fs.readFileSync(path.join(__dirname,'../preview-url.txt'),'utf8').trim();
  for(const species of ['dumboOcto','vampireSquid']){
    await page.goto(url+'?species='+species+'&mode=observe');const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await canvas.focus();await page.keyboard.press('KeyF');
    await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
    for(let i=0;i<3;i++)await page.getByRole('button',{name:'Higher',exact:true}).click();
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();
    await page.waitForTimeout(500);const file=species+'-fin-detail.png';await canvas.screenshot({path:path.join(__dirname,file)});captures.push(file);
  }
  const result={errors,captures,fixture:'Unmodified standard paused inspection using three Higher inputs and one Orbit right; no pose or rendering overrides.'};
  fs.writeFileSync(path.join(__dirname,'fin-detail-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
