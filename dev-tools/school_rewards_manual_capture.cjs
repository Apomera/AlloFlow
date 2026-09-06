// school_rewards_manual_capture.cjs
// Captures the manual figures from the generated practice page (fictional data).
// Run from the repository root: node dev-tools/school_rewards_manual_capture.cjs
// Outputs go to scratch/ (gitignored). Registered in dev-tools/README.md.
// Fictional data only. Writes PNGs to scratch/manual-capture/; convert to the
// manual's 1180px JPGs afterwards. Portal shots are cropped below the sticky
// practice bar so the figure shows the portal as a school would see it.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const html=fs.readFileSync('school-rewards-practice.html');
 const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':html.length});res.end(html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/school-rewards-practice.html';
 const dir='scratch/manual-capture';fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1180,height:1100},deviceScaleFactor:1});
  page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async d=>{await d.accept()});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STAFF');
  const barH=await page.evaluate(()=>{let el=document.elementFromPoint(600,20);while(el&&!/fixed|sticky/.test(getComputedStyle(el).position))el=el.parentElement;return el?Math.ceil(el.getBoundingClientRect().bottom):0});
  const under=async(sel,pad)=>{await page.evaluate(([q,b,p])=>{const r=document.querySelector(q).getBoundingClientRect();window.scrollTo(0,Math.max(0,Math.round(r.top+window.scrollY)-b-p))},[sel,barH,pad])};
  // 1. Practice page top: bar, introduction, demo guide open.
  await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('#practice-demo-guide').open=true});
  await page.screenshot({path:path.join(dir,'09-practice-portal.png'),clip:{x:0,y:0,width:1180,height:900}});
  // 2. Help panel as staff, portal header visible, practice bar cropped away.
  await page.evaluate(()=>{document.querySelector('#practice-demo-guide').open=false});
  await page.locator('#help-toggle').click();
  await page.waitForFunction(()=>!document.querySelector('#help-panel').hidden);
  await under('main.shell .top',14);
  await page.screenshot({path:path.join(dir,'10-help-panel.png'),clip:{x:0,y:barH,width:1180,height:1000}});
  await page.locator('#help-close').click();
  // 3. Admin tab: section index, checklist with an action button, School settings open, other cards collapsed.
  await page.selectOption('#practice-role','admin');
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='ADMIN');
  await page.locator('#tab-admin').click();
  await page.waitForFunction(()=>document.querySelectorAll('#admin-checklist li').length>0);
  await under('nav.tabs',8);
  await page.screenshot({path:path.join(dir,'11-admin-checklist.png'),clip:{x:0,y:barH,width:1180,height:1000}});
  const checklist=await page.evaluate(()=>[...document.querySelectorAll('#admin-checklist li')].map(li=>li.textContent.trim().slice(0,60)));
  // 4. Cashier store tab while the window is Open but scheduled for later.
  await page.selectOption('#practice-scenario','shopping');
  await page.waitForFunction(()=>document.querySelector('#school-title').textContent.includes('Middle'));
  await page.selectOption('#practice-role','cashier');
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='CASHIER');
  await page.evaluate(()=>{const repo=window.srPractice.repo();const w=repo.windows[0];w.status='OPEN';w.startsAt=new Date(Date.now()+36*3600*1000).toISOString();w.endsAt=new Date(Date.now()+72*3600*1000).toISOString();if(window.srPractice.save)window.srPractice.save()});
  await page.locator('#tab-store').click();
  await page.locator('#refresh-store-live').click();
  await page.waitForFunction(()=>/not started yet/.test(document.querySelector('#store-window-note').textContent));
  const note=await page.locator('#store-window-note').textContent();
  await under('nav.tabs',8);
  await page.screenshot({path:path.join(dir,'12-store-scheduled.png'),clip:{x:0,y:barH,width:1180,height:760}});
  console.log(JSON.stringify({errors,barH,checklist,note},null,1));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
