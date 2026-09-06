// school_rewards_wrapper_a11y.cjs
// Contrast probe and keyboard walk over the practice wrapper (bar, introduction,
// demo guide, tour box) in light, dark, and forced-colours modes.
// Run from the repository root: node dev-tools/school_rewards_wrapper_a11y.cjs
// Outputs go to scratch/ (gitignored). Registered in dev-tools/README.md.
// Serves the generated practice page from memory; writes scratch/school-rewards-wrapper-*.png.
const {chromium}=require('playwright');const fs=require('fs'),http=require('http');
const SELECTORS='.practice-bar strong,.practice-bar span,.practice-bar label,.practice-bar button,.practice-bar a,.practice-bar select,#practice-welcome p,#practice-welcome h2,#practice-welcome .eyebrow,#practice-welcome summary,#practice-welcome li,#practice-welcome strong,.tour-box .kicker,.tour-box h2,.tour-box p,.tour-box button';
const PROBE=`(function(sel){
  function parse(c){var m=String(c).match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',').map(function(x){return parseFloat(x)});return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
  function lum(c){function ch(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}return 0.2126*ch(c.r)+0.7152*ch(c.g)+0.0722*ch(c.b)}
  function bg(el){var n=el;while(n&&n.nodeType===1){var c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0)return c;n=n.parentElement}return {r:255,g:255,b:255,a:1}}
  var out=[];document.querySelectorAll(sel).forEach(function(el){if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;var text=(el.childNodes.length&&Array.prototype.some.call(el.childNodes,function(n){return n.nodeType===3&&n.nodeValue.trim()}))?el.textContent.trim().slice(0,40):'';if(!text)return;var cs=getComputedStyle(el),fg=parse(cs.color),b=bg(el);if(!fg)return;var L1=lum(fg),L2=lum(b),ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);var size=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight,10)>=700,large=size>=24||(bold&&size>=18.66);out.push({text:text,fg:cs.color,bg:'rgb('+b.r+','+b.g+','+b.b+')',ratio:Math.round(ratio*100)/100,need:large?3:4.5})});
  return out})(${JSON.stringify(SELECTORS)})`;
(async()=>{
 fs.mkdirSync('scratch',{recursive:true});const html=fs.readFileSync('school-rewards-practice.html');
 const server=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});await new Promise(x=>server.listen(0,'127.0.0.1',x));
 const url='http://127.0.0.1:'+server.address().port+'/p.html';const browser=await chromium.launch({headless:true});const report={contrast:{},keyboard:{},errors:[]};
 try{
  for(const mode of [{name:'light',colorScheme:'light'},{name:'dark',colorScheme:'dark'},{name:'forced',colorScheme:'dark',forcedColors:'active'}]){
   const page=await browser.newPage({viewport:{width:1180,height:1000},colorScheme:mode.colorScheme,forcedColors:mode.forcedColors||'none'});page.setDefaultTimeout(90000);
   page.on('pageerror',e=>report.errors.push(mode.name+': '+e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STAFF');
   await page.evaluate(()=>{document.querySelector('#practice-demo-guide').open=true});
   await page.locator('#practice-tour').click();await page.waitForSelector('.tour-box h2');
   const rows=await page.evaluate(PROBE);
   report.contrast[mode.name]={checked:rows.length,failing:rows.filter(r=>r.ratio<r.need)};
   await page.screenshot({path:'scratch/school-rewards-wrapper-'+mode.name+'.png',clip:{x:0,y:0,width:1180,height:1000}});
   await page.locator('.tour-box').screenshot({path:'scratch/school-rewards-wrapper-tour-'+mode.name+'.png'});
   await page.close();
  }
  // Keyboard walk (light).
  const page=await browser.newPage({viewport:{width:1180,height:1000}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.errors.push('kb: '+e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>document.querySelector('#actor-pill').textContent==='STAFF');
  const active=()=>page.evaluate(()=>{const a=document.activeElement;return a?(a.id||a.className||a.tagName)+':'+(a.textContent||'').trim().slice(0,30):'none'});
  await page.focus('#help-toggle');await page.keyboard.press('Enter');
  const kb=report.keyboard;kb.afterOpen=await active();
  const seq=[];for(let i=0;i<7;i++){await page.keyboard.press('Tab');seq.push(await active())}kb.tabsInsidePanel=seq;
  await page.keyboard.press('Escape');kb.afterEscape=await active();kb.panelHiddenAfterEscape=await page.evaluate(()=>document.querySelector('#help-panel').hidden);
  kb.panelAria=await page.evaluate(()=>{const p=document.querySelector('#help-panel'),t=document.querySelector('#help-toggle');return {labelledby:p.getAttribute('aria-labelledby'),tabindex:p.getAttribute('tabindex'),toggleExpanded:t.getAttribute('aria-expanded'),toggleControls:t.getAttribute('aria-controls'),h3Count:p.querySelectorAll('h3').length,headingBefore:p.querySelector('h2')?p.querySelector('h2').textContent:null}});
  // Tour by keyboard.
  await page.focus('#practice-tour');await page.keyboard.press('Enter');await page.waitForSelector('.tour-box h2');await page.waitForTimeout(400);
  kb.tourFocusAfterOpen=await active();
  const t=[];for(let i=0;i<4;i++){await page.keyboard.press('Tab');t.push(await active())}kb.tourTabs=t;
  kb.tourAria=await page.evaluate(()=>{const b=document.querySelector('.tour-box');return {role:b.getAttribute('role'),label:b.getAttribute('aria-label'),labelledby:b.getAttribute('aria-labelledby'),live:b.getAttribute('aria-live'),modal:b.getAttribute('aria-modal'),targetHasFocusStyle:!!document.querySelector('.tour-target')}});
  await page.focus('.tour-box [data-tour="next"]');await page.keyboard.press('Enter');await page.waitForTimeout(450);kb.afterNext=await active();kb.step2=await page.locator('.tour-box .kicker').textContent();
  await page.keyboard.press('Escape');await page.waitForTimeout(100);kb.tourAfterEscape=await active();kb.tourGoneAfterEscape=await page.evaluate(()=>!document.querySelector('.tour-box'));
  console.log(JSON.stringify(report,null,1));
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exit(1)});
