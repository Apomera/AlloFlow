const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results=[];
  try{
    for(const width of [1280,390,320]){
      const page=await browser.newPage({viewport:{width,height:900}});const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href);
      await page.locator('.memory-aid-study:visible').waitFor();
      const measures=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,cueTop:document.querySelector('.memory-aid-study p.mt-3').getBoundingClientRect().top}));
      assert(measures.scrollWidth<=width,'Study overflow at '+width);assert(measures.cueTop<900,'Cue should be in first phone screen');
      assert.equal(await page.locator('article:visible').count(),1);
      await page.screenshot({path:path.join(__dirname,'study-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Make it mine',exact:true}).first().click();
      await page.locator('textarea[id$="-draft"]:visible').fill('A sculpture keeps its shape and space.');
      await page.getByRole('button',{name:'Next',exact:true}).click();
      await page.getByRole('button',{name:'Previous',exact:true}).click();
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H2');
      await page.getByText('A sculpture keeps its shape and space.',{exact:true}).first().waitFor({state:'visible'});
      await page.getByRole('button',{name:'Try recall',exact:true}).first().click();
      await page.getByRole('radio',{name:'Without hints',exact:true}).check();
      await page.getByRole('button',{name:'Start recall practice',exact:true}).click();
      assert.equal(await page.locator('article:visible h2').innerText(),'Memory target');
      assert.equal(await page.locator('img:visible').count(),0);
      assert.equal(await page.locator('.memory-aid-study:visible').count(),0);
      await page.getByRole('textbox',{name:'Recall response for Memory target',exact:true}).fill('A solid keeps its shape and has a definite volume.');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Recall overflow');
      await page.screenshot({path:path.join(__dirname,'recall-'+width+'.png'),fullPage:true});
      await page.getByRole('button',{name:'Reveal the facts',exact:true}).click();
      await page.getByRole('heading',{name:'Compare your recall with the accurate facts',exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      results.push({...measures,errors,studyNavigation:true,personalizationSaved:true,unsupportedRecall:true});
      await page.close();
    }
    for(const width of [1280,320]){
      const p=await browser.newPage({viewport:{width,height:900}});
      await p.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href+'?diagram=1');
      await p.getByRole('list',{name:'Visual connections'}).waitFor();
      assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await p.screenshot({path:path.join(__dirname,'diagram-'+width+'.png'),fullPage:true});
      await p.close();
    }
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href+'?teacher=1');
    await page.getByRole('button',{name:'Edit resource',exact:true}).click();
    await page.getByText('Mark as reviewed by me',{exact:true}).first().waitFor();
    await page.screenshot({path:path.join(__dirname,'teacher-edit-1280.png'),fullPage:true});
    results.push({teacherEditing:true});
    fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
