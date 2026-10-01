const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const {chromium}=require('./candidate/node_modules/playwright');
(async()=>{
 const {default:worker}=await import(pathToFileURL(path.join(__dirname,'candidate/catalog/cloudflare-worker/src/index.js')));
 const token='g'.repeat(43);
 const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 function kv(){const values=new Map();return {values,put:async(k,v)=>values.set(k,v),get:async k=>values.get(k)||null,delete:async k=>values.delete(k),list:async({prefix})=>({keys:[...values.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true})};}
 const env={BUG_REPORTS_ENABLED:'true',BUG_REPORTS:kv(),BUG_REPORT_AUDIT:kv(),
  BUG_REPORTS_POLICY:JSON.stringify({districtId:'synthetic-district',policyId:'test-v1',destinationName:'District technology support',
   noticeUrl:'https://school.example/privacy',approvedUntil:new Date(Date.now()+86400000).toISOString(),retentionSeconds:86400,auditRetentionSeconds:604800}),
  BUG_REPORTS_PRINCIPALS:JSON.stringify([{id:'fixture-gateway',tokenSha256:digest,roles:['submit']}])};
 const source=fs.readFileSync(path.join(__dirname,'candidate/error_reporter_module.js'),'utf8');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const observations=[];
 try {
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport});
   const page=await context.newPage();const requests=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());requests.push({path:u.pathname,method:req.method(),body:req.postData()});
    assert.equal(u.origin,'https://school.example');
    if(u.pathname==='/app')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated synthetic reporting fixture</title></head><body><button id="host">Synthetic host</button></body></html>'});
    const target=u.pathname==='/api/reporting/policy'?'/bug-report-policy':u.pathname==='/api/reporting/reports'?'/submitBug':null;
    assert.ok(target,'No fallback route');
    const response=await worker.fetch(new Request('https://worker.example'+target,{method:req.method(),
     headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(req.method()==='POST'?{body:req.postData()}: {})}),env);
    return route.fulfill({status:response.status,body:await response.text(),headers:Object.fromEntries(response.headers)});
   });
   await page.goto('https://school.example/app?allo_mb=SYNTHETIC_JOIN_SECRET');
   await page.addScriptTag({content:source});
   await page.evaluate(()=>{console.error('SyntheticSensitiveName score 72');window.AlloModules.ErrorReporter.openPanel('errors');});
   await page.locator('#aer-send').click();
   assert.equal(requests.length,1);
   assert.match(await page.locator('#aer-report-status').textContent(),/disabled/);
   if(viewport.width===1280)await page.screenshot({path:path.join(__dirname,'default-disabled.png')});
   await page.locator('#aer-report-close').click();
   await page.evaluate(()=>{window.__alloBugReportBasePath='/api/reporting';window.AlloModules.ErrorReporter.openPanel('errors');});
   await page.locator('#aer-send').click();
   await page.locator('#aer-report-summary').fill('Read aloud stops after the first paragraph.');
   await page.locator('#aer-report-steps').fill('Open a sample reading, choose a voice, and press play.');
   await page.locator('#aer-report-review').click();
   assert.equal(await page.locator('#aer-report-submit').isDisabled(),true);
   await page.locator('#aer-report-close').focus();await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.tagName),'A');
   const screenshot='review-'+viewport.width+'.png';
   await page.screenshot({path:path.join(__dirname,screenshot)});
   await page.locator('#aer-report-reviewed').check();
   await page.locator('#aer-report-submit').click();
   await page.getByText('Report sent. Your district support team can arrange deletion.').waitFor();
   const posts=requests.filter(x=>x.method==='POST');
   assert.equal(posts.length,1);assert.equal(posts[0].path,'/api/reporting/reports');
   assert.ok(!/SyntheticSensitiveName|SYNTHETIC_JOIN_SECRET/.test(posts[0].body));
   assert.deepEqual(errors,[]);
   observations.push({viewport,requests:requests.map(({path,method})=>({path,method})),screenshot,uncaughtErrors:errors.length});
   await context.close();
  }
  assert.equal(env.BUG_REPORTS.values.size,2);
  fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify({browser:browser.version(),observations,storedSyntheticReports:env.BUG_REPORTS.values.size,auditEvents:env.BUG_REPORT_AUDIT.values.size},null,2));
  console.log(JSON.stringify({browser:browser.version(),cases:observations.length,storedSyntheticReports:env.BUG_REPORTS.values.size,auditEvents:env.BUG_REPORT_AUDIT.values.size}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

