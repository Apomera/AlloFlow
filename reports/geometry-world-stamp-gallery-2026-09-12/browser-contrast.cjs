const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={checks:[],errors:[]};await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(25000);page.on('pageerror',e=>r.errors.push(e.message));
 try{
  await page.addInitScript(()=>localStorage.setItem('alloflow.geometry-world.build-stamps.v1',JSON.stringify({schema:'alloflow-build-stamps/1',stamps:[{id:'cube',name:'Stone cube',blocks:[{x:0,y:1,z:0,type:'stone',shape:'cube',rotation:0}]},{id:'slab',name:'Wooden half slab',blocks:[{x:0,y:1,z:0,type:'wood',shape:'halfB',rotation:0}]}]})));
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:60000});await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._currentLesson.sandbox&&!document.querySelector('.gwe-home'));
  await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();await page.locator('.gwe-stamp-library > summary').click();await page.getByRole('button',{name:'Use stamp Wooden half slab',exact:true}).waitFor();await page.evaluate(()=>document.body.classList.add('theme-contrast'));await page.locator('.gwe-stamp-gallery').scrollIntoViewIfNeeded();
  const labels=await page.locator('.gwe-stamp-selection').evaluateAll(nodes=>nodes.map(n=>({color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor})));
  r.checks.push({name:'High-contrast stamp labels use light text on opaque dark backgrounds',pass:labels.every(n=>n.color==='rgb(255, 255, 255)'&&['rgb(0, 0, 0)','rgb(41, 79, 60)'].includes(n.background)),labels});
  await page.getByRole('button',{name:'Use stamp Wooden half slab',exact:true}).focus();await page.keyboard.press('Space');r.checks.push({name:'Keyboard Space chooses the stamp card',pass:await page.getByRole('button',{name:'Use stamp Wooden half slab',exact:true}).getAttribute('aria-pressed')==='true'});
  r.checks.push({name:'Choosing a saved card does not place blocks',pass:await page.evaluate(()=>Object.values(__geoWorldEngine.blocks).filter(b=>!b.userData._lessonBlock).length===0)});
  await page.screenshot({path:path.join(out,'06-final-contrast-gallery.png'),timeout:60000});
 }catch(e){r.failure=e.stack;console.error(e.stack);await page.screenshot({path:path.join(out,'contrast-failure.png')}).catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'contrast.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(r.failure||r.errors.length||r.checks.some(c=>!c.pass))process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
