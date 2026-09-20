const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const prior=fs.readFileSync(path.join(root,'reports/symbol-studio-review-2026-09-12/browser-review.cjs'),'utf8');
const context={require,__dirname:path.join(root,'reports/symbol-studio-review-2026-09-12'),process,Buffer,console};
vm.createContext(context);
vm.runInContext(prior.slice(0,prior.indexOf(' (async()=>{'))+'\nthis.html=html;this.measure=summarize;',context);
const output=path.join(__dirname,'enhancement-browser');fs.mkdirSync(output,{recursive:true});
const image='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="15" fill="#0369a1"/><circle cx="50" cy="50" r="25" fill="white"/></svg>').toString('base64');
const seed={
  alloStudentProfiles:[{id:'ui-review',name:'Demo Learner',codename:'DEMO'},{id:'second',name:'Second Learner',codename:'SECOND'}],
  'alloSymbolGallery__ui-review':[{id:'water',label:'水',image,category:'noun',topicTags:['daily living']},{id:'arabic',label:'ماء',image,category:'noun',topicTags:['daily living']},{id:'apple',label:'Apple',image,category:'food'}],
  alloGardenWishSeeds:[{label:'My wish',profileId:'ui-review'},{label:'Foreign wish',profileId:'second',ts:new Date().toISOString()},{label:'Older unassigned wish'}]
};
const routes={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/audio.js':'karaoke_audio_store_module.js','/studio.js':'symbol_studio_module.js'};
const server=require('http').createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(routes[url.pathname]){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(root,routes[url.pathname])));}
  else{res.setHeader('content-type','text/html');res.end(context.html('symbols').replace('<script>const noop=', '<script>for(const [k,v] of Object.entries('+JSON.stringify(seed)+'))localStorage.setItem(k,JSON.stringify(v));const noop='));}
});
(async()=>{
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  const results=[];
  try{
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:900}});
      page.setDefaultTimeout(120000);
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('data:')?route.continue():route.abort());
      await page.goto(origin);
      await page.locator('.ss-main-modal').waitFor();
      const checks={width};
      await page.getByRole('textbox',{name:'Search symbols in the Symbol Bank',exact:true}).fill('ماء');
      await page.waitForFunction(()=>document.querySelectorAll('[aria-label^="Select symbol:"]').length===1);
      assert.equal(await page.locator('[aria-label^="Select symbol:"]').count(),1);
      assert.equal(await page.getByRole('button',{name:'Select symbol: ماء',exact:true}).count(),1);
      checks.multilingualSearch=true;
      await page.getByRole('textbox',{name:'Search symbols in the Symbol Bank',exact:true}).fill('');
      await page.getByRole('combobox',{name:'Filter Symbol Bank by topic'}).selectOption('food');
      await page.getByRole('button',{name:'Filter by Other',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Select symbol: Apple',exact:true}).count(),1);
      checks.legacyTopics=true;
      await page.getByRole('button',{name:'Select symbol: Apple',exact:true}).click();
      await page.getByRole('combobox',{name:'Word type for Apple',exact:true}).waitFor();
      await page.screenshot({path:path.join(output,width+'-topics.png')});
      checks.symbolMetrics=await page.evaluate('('+context.measure.toString()+')()');
      await page.getByRole('combobox',{name:'Word type for Apple',exact:true}).selectOption('noun');
      const topics=page.getByRole('textbox',{name:'Topics for Apple',exact:true});
      await topics.fill('food, home, food');await topics.press('Tab');
      await page.waitForFunction(()=>{const apple=JSON.parse(localStorage.getItem('alloSymbolGallery__ui-review')).find(a=>a.id==='apple');return apple.category==='noun' && apple.topicTags.join(',')==='food,home';});
      checks.taxonomyEditing=true;
      await page.getByRole('tab',{name:/Word Garden/}).click();
      assert.equal(await page.getByRole('button',{name:'Foreign wish — Seed',exact:true}).count(),0);
      assert.equal(await page.getByRole('button',{name:'My wish — Seed',exact:true}).count(),1);
      await page.getByText('Review unassigned wish words (1)',{exact:true}).click();
      await page.getByRole('combobox',{name:'Assign wish Older unassigned wish to learner'}).selectOption('second');
      assert.equal(await page.getByRole('button',{name:'Older unassigned wish — Seed',exact:true}).count(),0);
      if(width<800)await page.getByRole('button',{name:/Profile & settings/}).click();
      await page.getByRole('button',{name:'Profile: Second Learner',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Older unassigned wish — Seed',exact:true}).count(),1);
      assert.equal(await page.getByRole('button',{name:'My wish — Seed',exact:true}).count(),0);
      await page.getByRole('button',{name:'Profile: Demo Learner',exact:true}).click();
      if(width<800)await page.getByRole('button',{name:/Profile & settings/}).click();
      checks.wishOwnership=true;
      await page.screenshot({path:path.join(output,width+'-garden.png')});
      checks.gardenMetrics=await page.evaluate('('+context.measure.toString()+')()');
      await page.getByRole('tab',{name:/Board Builder/}).click();
      await page.getByRole('button',{name:'Toggle saved boards gallery',exact:true}).click();
      await page.getByRole('button',{name:'Use board in AAC mode',exact:true}).click();
      await page.getByRole('button',{name:'Plant a wish seed — record a word the student wanted',exact:true}).click();
      const wish=page.getByRole('textbox',{name:'Wish seed word',exact:true});
      await wish.fill('During this session');await wish.press('Enter');
      await page.getByRole('gridcell',{name:/^Water(?:$|:)/}).click();
      await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+300000;});
      await page.getByRole('button',{name:'Exit AAC mode',exact:true}).click();
      const summary=page.getByRole('dialog',{name:'Session Complete!',exact:true});
      await summary.waitFor();
      assert.match(await summary.innerText(),/1 wish seed planted/);
      assert.match(await summary.innerText(),/During this session/);
      assert.doesNotMatch(await summary.innerText(),/Foreign wish/);
      if(width===1440){await page.waitForTimeout(5200);assert.equal(await summary.count(),1);}
      await page.getByRole('button',{name:'Close session summary'}).focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Close session summary');
      await page.screenshot({path:path.join(output,width+'-summary.png'),animations:'disabled'});
      const bounds=await summary.boundingBox();
      assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width && bounds.y>=0 && bounds.y+bounds.height<=900);
      assert.equal(await summary.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      await page.keyboard.press('Escape');
      assert.equal(await summary.count(),0);
      checks.sessionAttributionAndKeyboard=true;
      checks.errors=errors;
      assert.deepEqual(errors,[]);
      assert.equal(checks.symbolMetrics.workspaceOverflow.length,0);
      assert.equal(checks.gardenMetrics.workspaceOverflow.length,0);
      results.push(checks);
      fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(results,null,2));
      await page.close();
    }
  }finally{await browser.close();server.close();}
  console.log(JSON.stringify(results.map(({width,multilingualSearch,legacyTopics,wishOwnership,sessionAttributionAndKeyboard,errors})=>({width,multilingualSearch,legacyTopics,wishOwnership,sessionAttributionAndKeyboard,errors})),null,2));
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
