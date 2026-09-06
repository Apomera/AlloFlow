// school_rewards_mobile_sweep.cjs
// Phone sweep of the portal at 390x844 in every role: horizontal overflow, the
// bottom tab bar the manual promises below 760px, and the rendered size of every
// visible interactive control (including the built-in Help panel and the tour).
// Reports targets under 24x24 (WCAG 2.5.8 AA) and under the portal's own 44px
// baseline separately, because those are different kinds of finding.
// Run from the repository root: node dev-tools/school_rewards_mobile_sweep.cjs
// Outputs go to scratch/ (gitignored). Registered in dev-tools/README.md.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http');
const ROLES=['staff','cashier','admin','student'];
const SEL='button,a[href],input:not([type="hidden"]),select,textarea,summary,[role="radio"],[role="checkbox"],[tabindex]:not([tabindex="-1"])';
(async()=>{
 fs.mkdirSync('scratch',{recursive:true});
 const html=fs.readFileSync('school-rewards-practice.html');
 const server=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});
 await new Promise(x=>server.listen(0,'127.0.0.1',x));
 const url='http://127.0.0.1:'+server.address().port+'/p.html';
 const browser=await chromium.launch({headless:true});
 const report={};const errors=[];
 const measure=(page,where)=>page.evaluate(([sel,where])=>{
   const seen=new Map();
   document.querySelectorAll(sel).forEach(el=>{
     const cs=getComputedStyle(el);
     if(cs.display==='none'||cs.visibility==='hidden'||!el.getClientRects().length)return;
     if(el.closest('[aria-hidden="true"]')||el.classList.contains('sr-only'))return;
     let box=el;
     // A checkbox or radio wrapped in its own label is tapped through the label.
     if((el.type==='checkbox'||el.type==='radio')&&el.closest('label'))box=el.closest('label');
     const r=box.getBoundingClientRect();
     if(r.width<1||r.height<1)return;
     const label=(el.getAttribute('aria-label')||el.textContent||el.getAttribute('placeholder')||el.id||el.tagName).trim().slice(0,32);
     const key=(el.id||el.className||el.tagName)+'|'+label;
     if(seen.has(key))return;
     seen.set(key,{where,label,w:Math.round(r.width),h:Math.round(r.height),
       sel:el.id?('#'+el.id):(el.tagName.toLowerCase()+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/)[0]:''))});
   });
   return [...seen.values()];
 },[SEL,where]);
 try{
  for(const role of ROLES){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   page.setDefaultTimeout(90000);
   page.on('pageerror',e=>errors.push(role+': '+e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STAFF');
   if(role!=='staff'){
     await page.selectOption('#practice-role',role);
     await page.waitForFunction(r=>document.querySelector('#actor-pill').textContent===r.toUpperCase(),role);
   }
   const layout=await page.evaluate(()=>{
     const tabs=document.querySelector('nav.tabs'),cs=tabs?getComputedStyle(tabs):null;
     return {docWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,
       tabsPosition:cs?cs.position:null,tabsBottom:cs?cs.bottom:null};
   });
   let controls=await measure(page,'portal');
   await page.locator('#help-toggle').click();
   await page.waitForFunction(()=>!document.querySelector('#help-panel').hidden);
   const helpOverflow=await page.evaluate(()=>({docWidth:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   controls=controls.concat(await measure(page,'help'));
   await page.locator('#help-close').click();
   await page.locator('#practice-tour').click();
   await page.waitForSelector('.tour-box h2',{timeout:15000}).catch(()=>{});
   await page.waitForTimeout(400);
   if(await page.locator('.tour-box').count()){
     controls=controls.concat(await measure(page,'tour'));
     await page.locator('.tour-box').screenshot({path:'scratch/school-rewards-mobile-tour-'+role+'.png'}).catch(()=>{});
   }
   await page.screenshot({path:'scratch/school-rewards-mobile-'+role+'.png'});
   report[role]={layout,helpOverflow,
     underWcag:controls.filter(c=>c.w<24||c.h<24),
     underBaseline:controls.filter(c=>(c.w>=24&&c.h>=24)&&(c.h<44)),
     counted:controls.length};
   await page.close();
  }
  report.pageErrors=errors;
  console.log(JSON.stringify(report,null,1));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
