const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {launch,measure,OUT}=require('./tree-browser-fixture.cjs');
const ROOT=path.resolve(__dirname,'../../../..');
(async()=>{
 const {browser,page,errors,blocked}=await launch('current');
 const checks=[],audits=[],views=[];
 async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
 async function set(patch){await page.evaluate(p=>window.__ctx.updateMulti('treeLab',p),patch);}
 async function state(){return page.evaluate(()=>JSON.parse(JSON.stringify(window.__toolData.treeLab)));}
 async function overflow(){return page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);}
 try {
  await page.evaluate(()=>{window.__ctx.reduceMotion=true;window.__rerender();});
  await check('Opening foregrounds a live tree with closed field tools',async()=>{
    const m=await measure(page);
    assert(m.scene.top<350);assert(m.scene.bottom<900);
    assert(m.gl.draws>0&&m.gl.visibleMeshes>0);
    assert.equal(await page.locator('.allo-tree-field-tools').getAttribute('open'),null);
    assert.equal(await overflow(),0);
  });
  await page.screenshot({path:path.join(OUT,'current-tree-desktop.png')});
  await check('Season exploration leaves age, history and food unchanged',async()=>{
    const before=await state();
    await page.locator('.allo-tree-field-seasons').getByRole('button',{name:'Autumn',exact:false}).click();
    const after=await state();
    for(const key of ['tree','discovery','light','soilWater','alloc','droughtYears']) assert.deepEqual(after[key],before[key],key);
    assert.equal(after.season,'autumn');
    assert.match(await page.locator('.allo-tree-field-seasons').innerText(),/does not advance/);
  });
  await check('Keyboard invitation reaches the prediction; only an answer enables testing',async()=>{
    await page.locator('.allo-tree-field-invitation').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.id==='treelab-discovery-heading');
    const run=page.getByRole('button',{name:'Test 3 dry years',exact:true});assert(await run.isDisabled());
    await page.getByRole('group',{name:'Your prediction',exact:true}).getByRole('button',{name:'Less food left',exact:true}).click();
    assert(await run.isEnabled());await run.click();
    await page.waitForFunction(()=>window.__toolData.treeLab.discovery?.record);
    const d=await state();assert.equal(d.discovery.record.control.summary.yearsCompleted,3);
    assert.equal(d.discovery.record.drought.summary.yearsCompleted,3);assert.equal(d.discovery.answer,null);
    assert.deepEqual(d.tree,d.discovery.record.drought.tree);
  });
  await check('Saved comparison survives view changes and evidence opens the closed notebook',async()=>{
    const saved=(await state()).discovery.record;
    await page.getByRole('group',{name:'What the evidence shows',exact:true}).getByRole('button',{name:'Less food left',exact:true}).click();
    await page.locator('.allo-tree-discovery-next').getByRole('button',{name:'Read the rings',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement.id==='grow-sec-memory');
    assert.equal(await page.locator('.allo-tree-field-tools').evaluate(e=>e.open),true);
    assert.deepEqual((await state()).discovery.record,saved);
    await page.locator('.allo-tree-discovery-next').getByRole('button',{name:'Care for a whole grove',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.allo-tree-lab').dataset.treeView==='grove');
    assert.deepEqual((await state()).discovery.record,saved);
    await page.getByRole('tab',{name:/Grow/}).click();
  });
  await check('Free exploration uses the real condition and annual growth handlers',async()=>{
    await page.getByRole('button',{name:'Explore freely',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement.id==='treelab-field-play-title');
    const before=await state();
    const water=page.locator('#treelab-field-water');await water.focus();await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>window.__toolData.treeLab.soilWater<0.7);
    const changed=await state();assert.equal(changed.lastEffect.factor,'water');
    assert.deepEqual(changed.tree,before.tree);assert.deepEqual(changed.discovery.record,before.discovery.record);
    await page.locator('.allo-tree-field-play').getByRole('button',{name:'+1 year',exact:true}).click();
    await page.waitForFunction(age=>window.__toolData.treeLab.tree.age>age,before.tree.age);
    const grown=await state();assert.equal(grown.tree.age,before.tree.age+1);
    assert.equal(grown.tree.rings.length,before.tree.rings.length+1);
    assert.deepEqual(grown.discovery.record,before.discovery.record);
  });
  await check('Scheduled drought and dead trees disable misleading quick actions',async()=>{
    const saved=await state();
    await set({droughtYears:[saved.tree.age]});assert(await page.locator('#treelab-field-water').isDisabled());
    assert.match(await page.locator('.allo-tree-field-play').innerText(),/overriding/);
    await set({tree:{...saved.tree,alive:false,causeOfDeath:'carbon deficit'}});
    assert(await page.locator('#treelab-field-light').isDisabled());
    assert(await page.locator('.allo-tree-field-play').getByRole('button',{name:'+1 year',exact:true}).isDisabled());
    await set({tree:saved.tree,droughtYears:[]});
  });
  await check('Active experiments own their conditions and remain reachable',async()=>{
    const d=await state(); await set({experiment:{phase:'predict',duration:3,prediction:{},baseline:{tree:d.tree,speciesId:'oak',env:{light:.8,soilWater:.7,tempC:22,co2ppm:420},alloc:{}}}});
    await page.waitForFunction(()=>!document.querySelector('.allo-tree-field-play'));
    assert.equal(await page.locator('.allo-tree-field-play').count(),0);
    assert.equal(await page.locator('.allo-tree-field-tools').evaluate(e=>e.open),true);
    await set({experiment:{phase:'idle'}});
  });
  await check('Camera disclosure and fullscreen preserve the canvas and restore focus',async()=>{
    await page.locator('.allo-tree-view-controls>summary').click();
    await page.getByRole('button',{name:'Rotate view left',exact:true}).click();
    await page.evaluate(()=>window.__canvasBefore=document.querySelector('.allo-tree-field-canvas canvas'));
    await page.getByRole('button',{name:'Full screen',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-tree-fullstage=true]'));
    assert(await page.evaluate(()=>window.__canvasBefore===document.querySelector('.allo-tree-field-canvas canvas')));
    assert(await page.getByRole('button',{name:'Rotate view left',exact:true}).isVisible());
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('[data-tree-fullstage=true]'));
    assert(await page.evaluate(()=>document.activeElement.id==='treelab-fullscreen-toggle'));
  });
  await check('Printing expands and restores disclosures',async()=>{
    await page.evaluate(()=>{document.querySelector('.allo-tree-field-tools').open=false;window.dispatchEvent(new Event('beforeprint'));});
    assert.equal(await page.locator('.allo-tree-field-tools').evaluate(e=>e.open),true);
    await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.locator('.allo-tree-field-tools').evaluate(e=>e.open),false);
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(ROOT,'node_modules/axe-core/axe.min.js'),'utf8')});
  for(const theme of ['light','dark','contrast']){
    await page.evaluate(t=>{window.__ctx.isDark=t==='dark';window.__ctx.isContrast=t==='contrast';window.__rerender();},theme);
    await page.waitForFunction(t=>document.querySelector('.allo-tree-lab').dataset.treeTheme===t,theme);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>scrollTo(0,0));
    const audit=await page.evaluate(async()=>{const r=await axe.run('.allo-tree-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
    audits.push({theme,violations:audit});console.log('AUDIT '+theme+' '+audit.length);
    await page.screenshot({path:path.join(OUT,'current-tree-'+theme+'-exploration.png')});
  }
  await page.evaluate(()=>{window.__ctx.isDark=false;window.__ctx.isContrast=false;window.__rerender();});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const view of ['grow','chem','transport','spread','grove','compare','quiz']){
      await set({view});await page.evaluate(()=>scrollTo(0,0));
      const extra=await overflow();views.push({width,view,overflow:extra});assert(extra<=1,view+' overflow at '+width+': '+extra);
    }
  }
  await check('Small-screen tabs support keyboard navigation',async()=>{
    await set({view:'grow'});
    await page.locator('#treelab-tab-grow').focus();await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>window.__toolData.treeLab.view==='chem');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'treelab-tab-chem');
  });
  await check('All grade bands retain a usable opening and camera controls',async()=>{
    for(const band of ['k2','g35','g68','g912']){
      await set({view:'grow',bandOverride:band,discoveryMode:null,discovery:null});
      assert(await page.locator('.allo-tree-field-invitation').isVisible());
      assert.equal(await overflow(),0);
    }
  });
  await check('Older starting tree begins a fresh, truthful investigation',async()=>{
    await set({view:'grow',tree:null,discovery:null,discoveryMode:null,light:.2,soilWater:.2,lastEffect:null});
    await page.locator('.allo-tree-starting-tree>summary').click();
    await page.getByRole('button',{name:'Use a 40-year starting tree',exact:true}).click();
    await page.waitForFunction(()=>window.__toolData.treeLab.tree?.age===40);
    const d=await state();assert.equal(d.tree.history.length,39);assert.equal(d.discovery,null);assert.equal(d.light,.8);assert.equal(d.soilWater,.7);assert.deepEqual(d.discoveries,{});
    assert.equal(await page.locator('.allo-tree-starting-tree').count(),0);
  });
  await page.setViewportSize({width:390,height:844});
  await set({bandOverride:'g68',tree:null,discoveryMode:null,discovery:null,season:'summer',droughtYears:[]});
  await page.evaluate(()=>{document.querySelector('.allo-tree-view-controls').open=false;scrollTo(0,0);});
  await page.screenshot({path:path.join(OUT,'current-tree-phone.png')});
  const mobile=await measure(page);assert(mobile.scene.bottom<844);
  await page.locator('.allo-tree-field-invitation').click();
  await page.waitForFunction(()=>document.activeElement.id==='treelab-discovery-heading');
  await page.screenshot({path:path.join(OUT,'current-tree-phone-mission.png')});
  await check('Text-spacing overrides reflow without sideways scrolling',async()=>{
    await page.addStyleTag({content:'.allo-tree-lab * {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} .allo-tree-lab p {margin-bottom:2em!important}'});
    assert.equal(await overflow(),0);
  });
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
  const report={checks,audits,views,mobile,errors,blocked,browser:browser.version()};
  fs.writeFileSync(path.join(OUT,'tree-browser-results.json'),JSON.stringify(report,null,2));
  assert(audits.every(a=>a.violations.length===0),'Accessibility violations: see browser-results.json');
  console.log('All '+checks.length+' behavioral scenarios, '+views.length+' reflow cases and three accessibility audits passed.');
 } catch(e){fs.writeFileSync(path.join(OUT,'tree-browser-partial.json'),JSON.stringify({checks,audits,views,errors,blocked,error:e.stack},null,2));await page.screenshot({path:path.join(OUT,'tree-browser-failure.png')});throw e;}
 finally {await page.evaluate(()=>window.__destroy());await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
