const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/galaxy-wcag-round4-2026-10-24'),read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const tag=process.env.GALAXY_WCAG4_TAG||'after',source=read(process.env.GALAXY_WCAG4_SOURCE||'stem_lab/stem_tool_galaxy.js');
const core=read('dev-tools/galaxy_core_clipping.cjs'),start=core.indexOf('const SHELL = `')+'const SHELL = `'.length;
const shell=core.slice(start,core.indexOf('`;\n\n(async',start)).replace('window.__mount = function (state) {','window.__mount = function (state, slotId) {').replaceAll("document.getElementById('slot')","document.getElementById(slotId || 'slot')");
const css='desktop/web-app/public/app/'+JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//,'');
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file=>fs.existsSync(file));
const RELEASE={blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:0,blackHoleRadialVelocity:0,blackHoleLaunchAngle:41};
const record=number=>({id:'entry_'+number,number,title:'Release '+number,note:'Evidence '+number,settings:{...RELEASE}});
const backup=JSON.stringify({schema:'galaxy-black-hole-experiments',version:1,experiments:[record(2)],comparison:null});
const saved={id:'obs-shared',targetKey:'m104',surveyId:'P/2MASS/color',catalogId:'none',note:'Original saved evidence.'};
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const report={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),renderer:'Production React/CSS/native DOM with Three loader held pending to isolate UI focus',states:[],interactions:[],errors:[]};
 const browser=await chromium.launch({...(executablePath?{executablePath}:{}),args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});page.on('pageerror',error=>report.errors.push(String(error)));
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Galaxy notebook keyboard checks</title><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><button id="outside">Outside the tool</button><main id="slot"></main><div id="slot2"></div></body></html>');
  await page.addStyleTag({content:read(css)});
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','node_modules/axe-core/axe.min.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:'window.__uiStrings='+read('ui_strings.js')+';'});await page.addScriptTag({content:shell});
  await page.evaluate(()=>{window.StemLab.ensureThree=()=>new Promise(()=>{});window._galaxyPPLoaded=true;});await page.addScriptTag({content:source});
  const settle=async()=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(25);};
  const mount=async(state={},slot='slot')=>{await page.evaluate(({state,slot})=>window.__mount({simMode:'galaxy',starCount:2500,galaxyAutoRotate:false,...state},slot),{state,slot});await settle();};
  const check=(name,pass,details)=>{report.interactions.push({name,pass,...details});console.log(name+': '+pass);};
  const focused=selector=>page.locator(selector).evaluate(node=>node===document.activeElement);
  const activate=async selector=>{await page.locator(selector).focus();await page.keyboard.press('Enter');await settle();};
  const race=async selector=>{await page.locator(selector).evaluate(node=>{node.focus();node.click();document.getElementById('outside').focus();});await settle();return focused('#outside');};
  const scan=async name=>{await settle();const result=await page.evaluate(async()=>({violations:(await axe.run('#slot',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),overflow:document.documentElement.scrollWidth>innerWidth+1}));report.states.push({name,...result});};
  await mount({simMode:'star',showLifecycle:true,lifecycleMass:1,stellarMassReference:2});
  for(const scheme of ['light','dark']){
   await page.emulateMedia({forcedColors:'active',colorScheme:scheme});await page.keyboard.press('Tab');const stage=page.locator('#slot [data-galaxy-hr-stage]').first();await stage.focus();await settle();
   const style=await stage.evaluate(node=>{const rgb=value=>(value.match(/[\d.]+/g)||[]).map(Number),lum=value=>{const c=rgb(value).slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];},contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};const ring=node.querySelector('[data-galaxy-hr-focus]'),s=getComputedStyle(ring);let ancestor=node.parentElement,bg='';while(ancestor){const color=getComputedStyle(ancestor).backgroundColor,channels=rgb(color);if(channels.length>=3&&(channels.length===3||channels[3]===1)){bg=color;break;}ancestor=ancestor.parentElement;}const svg=node.closest('svg'),texts=[...svg.querySelectorAll('text')],axes=[...svg.querySelectorAll('[data-galaxy-hr-axis],:scope > line')],dots=[...svg.querySelectorAll('[data-galaxy-hr-dot]')];return{stroke:s.stroke,background:bg,opacity:s.opacity,focus:node.matches(':focus-visible'),focusContrast:contrast(s.stroke,bg),textContrast:Math.min(...texts.map(n=>contrast(getComputedStyle(n).fill,bg))),axisContrast:Math.min(...axes.map(n=>contrast(getComputedStyle(n).stroke,bg))),dotContrast:Math.min(...dots.map(n=>contrast(getComputedStyle(n).fill,bg)))};});
   check('HR focus ring visible in forced '+scheme,style.focus&&style.opacity==='1'&&style.focusContrast>=3,{style});
   check('HR chart labels and marks contrast in forced '+scheme,style.textContrast>=4.5&&style.axisContrast>=3&&style.dotContrast>=3,{style});await page.locator('[data-galaxy-hr-diagram]').screenshot({path:path.join(OUT,tag+'-hr-forced-'+scheme+'.png')});
  }
  await page.emulateMedia({forcedColors:'none',colorScheme:'light'});
  const normalContrast=await page.locator('[data-galaxy-hr-diagram]').evaluate(node=>{const rgb=value=>(value.match(/[\d.]+/g)||[]).map(Number),lum=c=>{c=c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];},image=getComputedStyle(node).backgroundImage,backgrounds=(image.match(/rgba?\([^)]+\)/g)||[]).map(rgb),contrast=(stroke,bg)=>{const fg=rgb(stroke),a=fg.length>3?fg[3]:1,x=lum(fg.slice(0,3).map((v,i)=>a*v+(1-a)*bg[i])),y=lum(bg);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);},axes=[...node.querySelectorAll('[data-galaxy-hr-axis],svg > line')],band=node.querySelector('[data-galaxy-hr-band]')||[...node.querySelectorAll('svg > path')].find(n=>n.getAttribute('fill')?.includes('99,102,241'));return{image,backgrounds,axisMinimum:Math.min(...axes.flatMap(n=>backgrounds.map(bg=>contrast(getComputedStyle(n).stroke,bg)))),bandMinimum:band?Math.min(...backgrounds.map(bg=>contrast(getComputedStyle(band).stroke,bg))):0};});
  check('Normal HR axes and band retain contrast across gradient',normalContrast.backgrounds.length>=2&&normalContrast.axisMinimum>=3&&normalContrast.bandMinimum>=3,{normalContrast});
  await page.locator('#slot [data-galaxy-hr-stage]').first().evaluate(node=>{node.focus();node.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));document.getElementById('outside').focus();});await settle();
  check('HR navigation respects moved focus',await focused('#outside'));await scan('star-chart');
  if(tag!=='before'){const first=page.locator('#slot [data-galaxy-hr-stage]').first();await first.focus();await page.keyboard.press('End');await settle();check('HR End selects and focuses the last stage',await page.locator('#slot [data-galaxy-hr-stage]').last().evaluate(node=>document.activeElement===node&&node.getAttribute('aria-pressed')==='true'));}
  await mount({galaxyControlPanel:'motion',rotationProbeRadius:8.2,rotationSamples:[{radiusKpc:6},{radiusKpc:12}],rotationInvestigationNote:'Keep the evidence.'});
  check('Rotation removal respects moved focus',await race('#slot [data-galaxy-rotation-remove="6"]'));
  if(tag!=='before'){
   await activate('#slot [data-galaxy-rotation-undo]');check('Rotation undo focuses restored radius',await focused('#slot [data-galaxy-rotation-revisit="6"]'));
   await activate('#slot [data-galaxy-rotation-save]');check('Rotation save focuses saved radius',await focused('#slot [data-galaxy-rotation-revisit="8.2"]'));
   await activate('#slot [data-galaxy-rotation-remove="8.2"]');check('Rotation remove focuses undo',await focused('#slot [data-galaxy-rotation-undo]'));await scan('rotation-notebook');
  }
  await mount({simMode:'realSky',realSkyObservations:[saved]});check('Real Sky removal respects moved focus',await race('#slot [data-galaxy-real-sky-observation-remove-button]'));
  if(tag!=='before'){
   await activate('#slot [data-galaxy-real-sky-observation-undo-button]');check('Real Sky undo focuses restored row',await focused('#slot [data-galaxy-real-sky-observation-id="obs-shared"]'));
   await activate('#slot [data-galaxy-real-sky-observation-edit-button]');check('Real Sky edit focuses draft',await focused('#slot [data-galaxy-real-sky-observation-editor-input]'));
   await page.locator('#slot [data-galaxy-real-sky-observation-editor-input]').fill('Revised evidence stays with this observation.');await activate('#slot [data-galaxy-real-sky-observation-editor] button:has-text("Save changes")');check('Real Sky save restores edit focus and note',await focused('#slot [data-galaxy-real-sky-observation-edit-button]')&&(await page.locator('#slot [data-galaxy-real-sky-observation-id="obs-shared"]').textContent()).includes('Revised evidence'));
   await activate('#slot [data-galaxy-real-sky-observation-edit-button]');await page.keyboard.press('Escape');await settle();check('Real Sky Escape restores edit focus',await focused('#slot [data-galaxy-real-sky-observation-edit-button]'));await scan('real-sky-notebook');
   await page.locator('#outside').focus();await page.locator('#slot [data-galaxy-real-sky-observation-edit-button]').evaluate(node=>node.click());await settle();check('Programmatic editor activation preserves outside focus',await focused('#outside'));
   await page.locator('#slot [data-galaxy-real-sky-retry]').waitFor();await activate('#slot [data-galaxy-real-sky-retry]');
   check('Atlas retry preserves meaningful focus with an inset indicator',await page.locator('#slot #galaxy-real-sky-aladin').evaluate(node=>{const s=getComputedStyle(node);return document.activeElement===node&&node.getAttribute('aria-label')==='Interactive real-sky survey atlas'&&node.matches(':focus-visible')&&parseFloat(s.outlineWidth)>=3&&parseFloat(s.outlineOffset)<0;}));
   await page.locator('#slot [data-galaxy-real-sky-retry]').waitFor();check('Atlas retry respects focus moved elsewhere',await race('#slot [data-galaxy-real-sky-retry]'));await scan('atlas-retry');
  }
  await mount();check('Evidence observation respects moved focus',await race('#slot [data-galaxy-evidence-observe="0"]'));
  if(tag!=='before'){
   await activate('#slot [data-galaxy-evidence-observe="1"]');check('Evidence observation focuses its own canvas',await focused('#slot [data-galaxy-canvas]'));await activate('#slot [data-galaxy-evidence-return-note]');check('Evidence return focuses matching note',await focused('#slot [data-galaxy-evidence-note="1"]'));await activate('#slot [data-galaxy-evidence-open-model]');check('Evidence open model focuses canvas',await focused('#slot [data-galaxy-canvas]'));await scan('evidence-navigation');
  }
  await mount({simMode:'blackHole',blackHoleNotebook:[record(1)],blackHoleNotebookSerial:1});await page.locator('#slot [data-bh-notebook] details').evaluate(node=>node.open=true);await activate('#slot [data-bh-notebook-remove="entry_1"]');
  check('Black Hole removal focuses undo',await page.getByRole('button',{name:'Undo removal',exact:true}).evaluate(node=>node===document.activeElement));
  if(tag!=='before'){
   await activate('#slot [data-bh-notebook-undo]');check('Black Hole undo focuses restored name',await focused('#slot [data-bh-notebook-title="entry_1"]'));
   for(const outcome of ['cancel','apply']){await page.locator('#slot [data-bh-notebook-file]').setInputFiles({name:'experiments.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.locator('#slot [data-bh-import-apply]').waitFor();await activate('#slot [data-bh-import-'+outcome+']');check('Black Hole '+outcome+' import restores trigger',await focused('#slot [data-bh-notebook-import]'));}
   await activate('#slot [data-bh-notebook-undo-import]');check('Black Hole undo import restores trigger',await focused('#slot [data-bh-notebook-import]'));await scan('black-hole-notebook');
   for(const width of [640,320]){await page.setViewportSize({width,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await scan('black-hole-notebook-text200-'+width);}await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1280,height:900});
   await mount({simMode:'realSky',realSkyObservations:[saved]});await mount({simMode:'realSky',realSkyObservations:[saved]},'slot2');await activate('#slot2 [data-galaxy-real-sky-observation-edit-button]');await page.keyboard.press('Escape');await settle();check('Shared observation IDs keep focus in initiating instance',await focused('#slot2 [data-galaxy-real-sky-observation-edit-button]'));
   await page.locator('#slot2 [data-galaxy-real-sky-observation-remove-button]').evaluate(node=>{node.focus();node.click();ReactDOM.unmountComponentAtNode(document.getElementById('slot2'));document.getElementById('outside').focus();});await settle();check('Removed tool cannot reclaim deferred notebook focus',await focused('#outside'));
   assert.deepEqual(report.errors,[]);assert(report.states.every(state=>!state.violations.length&&!state.overflow),'Accessibility scan failed');assert(report.interactions.every(item=>item.pass),'Focus interaction failed');
  }
 }catch(error){report.failure=String(error.stack||error);throw error;}finally{fs.writeFileSync(path.join(OUT,tag+'-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
