// school_rewards_demo_walkthrough.cjs
// Headless walkthrough of the demo route: Staff award -> Student view -> Cashier
// checkout -> Administrator checklist, plus a 390px mobile pass. Written in the
// 2026-09-04 handoff session; relocated from scratch/ (gitignored) on 2026-09-05.
// Run from the repository root: node dev-tools/school_rewards_demo_walkthrough.cjs
const assert=require('assert/strict');
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http');
(async()=>{
 const html=fs.readFileSync('school-rewards-practice.html');
 const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':html.length});res.end(html)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/school-rewards-practice.html';
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(20000);
  const errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async d=>{dialogs.push(d.message());await d.accept()});
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STAFF');
  await page.selectOption('#practice-scenario','shopping');
  await page.waitForFunction(()=>document.querySelector('#school-title').textContent.includes('Middle'));
  await page.locator('#tab-award').click();
  await page.locator('#award-student-search').fill('Avery');
  console.log('SELECTION '+await page.locator('#award-student').inputValue());
  await page.getByRole('radio',{name:/Avery R/}).click();
  console.log('SELECTION '+await page.locator('#award-student').inputValue());
  await page.locator('#award-amount').fill('20');
  console.log('SELECTION '+await page.locator('#award-student').inputValue());
  await page.locator('#award-reason').fill('Included a classmate in the group.');
  console.log('SELECTION '+await page.locator('#award-student').inputValue());
  await page.locator('#award-submit').click();
  await page.waitForTimeout(500);console.log('AWARD_STATE '+JSON.stringify(await page.evaluate(()=>({notice:document.querySelector('#notice').textContent,amount:document.querySelector('#award-amount').value,selected:document.querySelector('#award-student').value,students:srPractice.call('getSchoolRewardsBootstrap').students.slice(0,2),formValid:document.querySelector('#award-form').checkValidity()}))));
  assert.equal(await page.evaluate(()=>srPractice.call('getSchoolRewardsBootstrap').students[0].balance),29);
  await page.waitForFunction(()=>!document.querySelector('#notice').classList.contains('busy'));
  await page.selectOption('#practice-role','student');
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STUDENT');
  assert.equal(await page.evaluate(()=>srPractice.call('getSchoolRewardsBootstrap').students[0].balance),29);
  await page.locator('#tab-activity').click();
  assert.match(await page.locator('#panel-activity').innerText(),/Included a classmate/);
  await page.selectOption('#practice-role','cashier');
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='CASHIER');
  await page.locator('#tab-store').click();
  await page.locator('#checkout-student-search').fill('Avery');
  await page.selectOption('#checkout-student','student_00000001');
  await page.locator('#store-catalog .prize').filter({hasText:'Front-of-line pass'}).locator('[data-add]').click();
  await page.locator('#checkout-submit').click();
  await page.waitForFunction(()=>srPractice.repo().orders.length===1);
  await page.waitForFunction(()=>!document.querySelector('#notice').classList.contains('busy'));
  assert.equal(await page.evaluate(()=>srPractice.call('getSchoolRewardsBootstrap').students[0].balance),14);
  assert.equal(await page.evaluate(()=>srPractice.call('getSchoolRewardsBootstrap').catalog.find(i=>i.name==='Front-of-line pass').remaining),19);
  await page.selectOption('#practice-role','admin');
  await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='ADMIN');
  await page.locator('#tab-admin').click();
  await page.screenshot({path:'scratch/school-rewards-demo-after-admin.png'});
  const admin=await page.evaluate(()=>({collapsed:document.querySelectorAll('#panel-admin .card.collapsed').length,cards:document.querySelectorAll('#panel-admin .card').length,height:document.body.scrollHeight,checklist:document.querySelector('#admin-checklist').innerText}));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'scratch/school-rewards-demo-after-mobile.png'});
  await page.locator('#practice-tour').click();
  await page.locator('.tour-box').waitFor();
  const mobile=await page.evaluate(()=>{const box=document.querySelector('.tour-box').getBoundingClientRect(),nav=document.querySelector('.tabs').getBoundingClientRect();return{width:document.documentElement.scrollWidth,viewport:innerWidth,tourBottom:box.bottom,navTop:nav.top,barPosition:getComputedStyle(document.querySelector('.practice-bar')).position}});
  assert.ok(mobile.width<=mobile.viewport);
  assert.ok(mobile.tourBottom<=mobile.navTop);
  assert.equal(mobile.barPosition,'static');
  await page.screenshot({path:'scratch/school-rewards-demo-after-mobile-tour.png'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({awardBalance:29,checkoutBalance:14,stockAfter:19,dialogs,admin,mobile,errors},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
