const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const prior=fs.readFileSync(path.join(__dirname,'enhancement-browser.cjs'),'utf8');
const context={require,__dirname,process,Buffer,console,URL};vm.createContext(context);
vm.runInContext(prior.slice(0,prior.lastIndexOf('(async()=>{')).replace("'enhancement-browser'","'correctness-browser'")+'\nthis.server=server;this.measure=context.measure;this.seed=seed;',context);
const svg=color=>'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="16" fill="'+color+'"/></svg>').toString('base64');
const approvedImage=svg('#0284c7'),flaggedImage=svg('#ef4444');
Object.assign(context.seed,{
  'alloSymbolGallery__ui-review':[
    {id:'approved',label:'Water',image:approvedImage,reviewStatus:'approved'},
    {id:'flagged',label:'Water',image:flaggedImage,reviewStatus:'needs_changes',isPreferred:true},
    {id:'tea',label:'Tea',image:flaggedImage,reviewStatus:'needs_changes'},
    {id:'nfc',label:'Café',image:approvedImage},{id:'nfd',label:'Cafe\u0301',image:approvedImage}],
  'alloSymbolFamiliarity__ui-review':{'café':{taps:2,lastSeen:Date.now()},'cafe\u0301':{taps:3,lastSeen:Date.now()}},
  'alloSymbolBoards__ui-review':[{id:'board',title:'Communication',cols:3,words:['I','want','Water'].map((label,i)=>({id:'cell-'+i,label,image:approvedImage}))}],
  'alloAACUsage__ui-review':{'ui-review':{sessions:[{date:new Date().toISOString(),entries:[{label:'Café'},{label:'Cafe\u0301'},{label:'__UTTERANCE__'},{label:'__UTTERANCE__',length:2}]}]}}
});
const output=path.join(__dirname,'correctness-browser');
(async()=>{
  await new Promise(done=>context.server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+context.server.address().port,browser=await chromium.launch({headless:true}),results=[];
  try{
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(30000);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
      await page.goto(origin);await page.locator('.ss-main-modal').waitFor();
      await page.getByRole('tab',{name:/Sequences/}).click();
      await page.getByRole('textbox',{name:'Sequence steps, one per line'}).fill('Water\nTea');
      await page.getByRole('button',{name:'Generate visual sequence',exact:true}).click();
      const steps=page.locator('[role=list][aria-label$="ordered steps"] > [role=listitem]');
      await steps.first().waitFor();assert.equal(await steps.count(),2);
      assert.equal(await steps.first().locator('img').first().getAttribute('src'),approvedImage);
      const toasts=await page.evaluate(()=>window.__reviewToasts.map(t=>t[0]));
      assert.ok(toasts.some(t=>t.includes('1 marked needs changes')));
      await page.getByRole('tab',{name:/Word Garden/}).click();
      assert.equal(await page.getByRole('button',{name:/^Café — /}).count(),1);
      assert.equal(await page.getByRole('button',{name:/^Café — /}).count(),0);
      await page.getByText('📊 Saved AAC sessions: 1 unique tapped labels / 2 symbol taps · 2 speech requests',{exact:true}).waitFor();
      await page.screenshot({path:path.join(output,width+'-garden.png'),animations:'disabled'});
      const garden=await page.evaluate('('+context.measure.toString()+')()');
      assert.equal(garden.workspaceOverflow.length,0);
      await page.getByRole('tab',{name:/Board Builder/}).click();
      await page.getByRole('button',{name:'Toggle saved boards gallery',exact:true}).click();
      await page.getByRole('button',{name:'Use board in AAC mode',exact:true}).click();
      for(let i=0;i<3;i++)await page.getByRole('gridcell').nth(i).click();
      await page.getByRole('button',{name:'Delete last word from sentence strip',exact:true}).click();
      await page.getByRole('button',{name:'Speak constructed sentence',exact:true}).click();
      await page.getByRole('button',{name:'Exit AAC mode',exact:true}).click();
      await page.getByRole('button',{name:'Close session summary',exact:true}).waitFor();
      const dialog=page.getByRole('dialog');
      assert.ok((await dialog.innerText()).includes('2.0'));assert.ok((await dialog.innerText()).includes('1 speech request'));
      const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('alloAACUsage__ui-review'))['ui-review'].sessions.at(-1));
      assert.equal(session.metricsVersion,2);assert.equal(session.entries.at(-1).phrase,'I want');assert.equal(session.entries.at(-1).length,2);
      assert.deepEqual(session.entries.at(-1).symbols.map(w=>w.label),['I','want']);
      const summary=await dialog.boundingBox();assert.ok(summary.x>=0&&summary.x+summary.width<=width+1);
      await page.screenshot({path:path.join(output,width+'-summary.png'),animations:'disabled'});
      const close=page.getByRole('button',{name:'Close session summary',exact:true});await close.focus();await close.press('Escape');
      await page.locator('.ss-main-modal').waitFor();
      await page.getByRole('tab',{name:/Word Garden/}).click();
      await page.getByText('📊 Saved AAC sessions: 4 unique tapped labels / 5 symbol taps · 3 speech requests',{exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      results.push({width,approvedReuse:true,flaggedFallbackNotice:true,unicodeGardenMerged:true,legacyMessagesCounted:true,persistedComposition:true,summaryMean:2,aggregateTaps:5,aggregateSpeechRequests:3,gardenOverflow:garden.workspaceOverflow,summaryFits:true,errors});
      fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(results,null,2)+'\n');await page.close();
    }
  }finally{await browser.close();context.server.close();}
  console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);context.server.close();process.exitCode=1;});
