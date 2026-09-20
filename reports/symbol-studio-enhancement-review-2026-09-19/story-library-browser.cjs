const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const prior=fs.readFileSync(path.join(__dirname,'enhancement-browser.cjs'),'utf8');
const context={require,__dirname,process,Buffer,console,URL};vm.createContext(context);
vm.runInContext(prior.slice(0,prior.lastIndexOf('(async()=>{')).replace("'enhancement-browser'","'story-library-browser'")+'\nthis.server=server;this.measure=context.measure;this.seed=seed;this.image=image;',context);
context.seed['alloSavedStories__ui-review']=[{id:'quiet',title:'My quiet break',situation:'Taking a quiet break',details:'Return when ready',studentName:'Demo',pages:[{id:'one',text:'I can ask for a quiet break.',image:context.image,imagePrompt:'A quiet corner'},{id:'two',text:'I can return when I am ready.',image:null,imagePrompt:'Friends'}]}];
context.seed['alloSavedStories__second']=[{id:'second-story',title:'A story for the second learner',situation:'Sharing',details:'',studentName:'Second',pages:[{id:'other-page',text:'We can share.',image:null}]}];
const output=path.join(__dirname,'story-library-browser');
(async()=>{
  await new Promise(done=>context.server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+context.server.address().port;
  const browser=await chromium.launch({headless:true});const results=[];
  try{
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(60000);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('data:')?route.continue():route.abort());
      await page.goto(origin);await page.getByRole('tab',{name:/Social Stories/}).click();
      await page.locator('.ss-story-library summary').click();
      await page.getByRole('button',{name:'Open saved story: My quiet break',exact:true}).click();
      await page.getByRole('button',{name:'Edit text for story page 1',exact:true}).click();
      await page.getByRole('textbox',{name:'Story page text',exact:true}).fill('I can choose a quiet place to rest.');
      assert.equal(await page.getByRole('button',{name:'Save new story to library',exact:true}).isDisabled(),true);
      await page.getByRole('button',{name:'Save story page text',exact:true}).click();
      await page.getByRole('textbox',{name:'Name for saved story',exact:true}).fill('My revised quiet break');
      await page.getByRole('button',{name:'Save new story to library',exact:true}).click();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('alloSavedStories__ui-review')).length),2);
      await page.getByRole('button',{name:'Duplicate saved story: My revised quiet break',exact:true}).click();
      await page.getByRole('button',{name:'Rename saved story: My revised quiet break (copy)',exact:true}).click();
      await page.getByRole('textbox',{name:'Story name',exact:true}).fill('Classroom practice');
      await page.getByRole('button',{name:'Rename story',exact:true}).click();
      await page.screenshot({path:path.join(output,width+'-library.png')});
      const metrics=await page.evaluate('('+context.measure.toString()+')()');
      assert.equal(metrics.workspaceOverflow.length,0,JSON.stringify(metrics.workspaceOverflow));
      const controls=await page.locator('.ss-story-library button,.ss-story-library input,.ss-story-library summary').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {label:el.getAttribute('aria-label')||el.textContent,width:r.width,height:r.height};}));
      assert(controls.every(c=>c.width>=44&&c.height>=44),JSON.stringify(controls));
      await page.getByRole('button',{name:'Open saved story: My quiet break',exact:true}).click();
      await page.getByRole('alertdialog').waitFor();await page.keyboard.press('Escape');
      assert.equal(await page.locator('.ss-story-page p').textContent(),'I can choose a quiet place to rest.');
      await page.getByRole('button',{name:'Open saved story: My quiet break',exact:true}).click();
      await page.getByRole('button',{name:'Replace draft',exact:true}).click();
      assert.equal(await page.locator('.ss-story-page p').textContent(),'I can ask for a quiet break.');
      await page.getByRole('button',{name:'Next story page',exact:true}).click();
      assert.equal(await page.locator('.ss-story-page p').textContent(),'I can return when I am ready.');
      await page.getByRole('button',{name:'Delete saved story: Classroom practice',exact:true}).click();
      await page.getByRole('button',{name:'Delete story',exact:true}).click();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('alloSavedStories__ui-review')).length),2);
      if(width<800)await page.getByRole('button',{name:/Profile & settings/}).click();
      await page.getByRole('button',{name:'Profile: Second Learner',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Open saved story: My quiet break',exact:true}).count(),0);
      assert.equal(await page.getByRole('button',{name:'Open saved story: A story for the second learner',exact:true}).count(),1);
      assert.deepEqual(errors,[]);results.push({width,saveEditReopen:true,duplicateRenameDelete:true,cancelKeepsDraft:true,learnerIsolation:true,controls,workspaceOverflow:metrics.workspaceOverflow,errors});
      await page.close();
    }
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({width:r.width,passed:true,errors:r.errors})),null,2));
  }finally{await browser.close();context.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;context.server.close();});
