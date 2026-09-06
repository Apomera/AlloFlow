// school_rewards_portal_a11y.cjs
// axe-core scan of the portal in every role, with the built-in Help panel open
// and with the guided tour showing a step.
// Run from the repository root: node dev-tools/school_rewards_portal_a11y.cjs
// Outputs go to scratch/ (gitignored). Registered in dev-tools/README.md.
// (2026-09-05). Runs each role, with the built-in Help panel open, and again
// with the guided tour showing a step, so the dialog and the newly added
// region are both in scope. Reports violations AND incomplete items, because
// an "incomplete" is a real thing a human must look at, not a pass.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http');
const AXE=require.resolve('axe-core/axe.min.js');
const ROLES=['staff','cashier','admin','student'];
const summarise=(res)=>({
 violations:res.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,
   nodes:v.nodes.slice(0,4).map(n=>({target:n.target.join(' '),html:(n.html||'').slice(0,110)}))})),
 incomplete:res.incomplete.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,
   sample:(v.nodes[0]&&v.nodes[0].target||[]).join(' ')})),
});
(async()=>{
 fs.mkdirSync('scratch',{recursive:true});
 const html=fs.readFileSync('school-rewards-practice.html');
 const server=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});
 await new Promise(x=>server.listen(0,'127.0.0.1',x));
 const url='http://127.0.0.1:'+server.address().port+'/p.html';
 const browser=await chromium.launch({headless:true});
 const report={};const errors=[];
 try{
  for(const role of ROLES){
   const page=await browser.newPage({viewport:{width:1280,height:1000}});
   page.setDefaultTimeout(90000);
   page.on('pageerror',e=>errors.push(role+': '+e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STAFF');
   if(role!=='staff'){
     await page.selectOption('#practice-role',role);
     await page.waitForFunction(r=>document.querySelector('#actor-pill').textContent===r.toUpperCase(),role);
   }
   await page.addScriptTag({path:AXE});
   await page.locator('#help-toggle').click();
   await page.waitForFunction(()=>!document.querySelector('#help-panel').hidden);
   const withHelp=await page.evaluate(async()=>await window.axe.run(document,{resultTypes:['violations','incomplete']}));
   report[role+'/help']=summarise(withHelp);
   await page.locator('#help-close').click();
   await page.locator('#practice-tour').click();
   await page.waitForSelector('.tour-box h2',{timeout:15000}).catch(()=>{});
   await page.waitForTimeout(500);
   if(await page.locator('.tour-box').count()){
     const withTour=await page.evaluate(async()=>await window.axe.run(document,{resultTypes:['violations','incomplete']}));
     report[role+'/tour']=summarise(withTour);
   } else report[role+'/tour']='no tour steps for this role';
   await page.close();
  }
  report.pageErrors=errors;
  console.log(JSON.stringify(report,null,1));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
