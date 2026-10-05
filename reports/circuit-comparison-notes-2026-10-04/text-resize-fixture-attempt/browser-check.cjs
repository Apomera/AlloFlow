const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sourcePath=path.join(root,'stem_lab/stem_tool_circuit.js'),mirrorPath=path.join(root,'desktop/web-app/public/stem_lab/stem_tool_circuit.js'),source=fs.readFileSync(sourcePath,'utf8');
const result={sourceSha256:hash(source),scriptSha256:hash(fs.readFileSync(__filename)),errors:[],views:[],screenshots:[],navigation:[],focus:[]};
const write=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n');
(async()=>{
  assert.equal(result.sourceSha256,'6c25d629097876a19c030e8236351c32191eea9085c20e7e6f4a99eb3dd2402b');
  assert.equal(hash(fs.readFileSync(mirrorPath)),result.sourceSha256);
  assert.ok(!fs.existsSync(path.join(__dirname,'browser-results.json')),'Preserve any earlier browser attempt before rerunning');
  const stats=fs.statfsSync(path.parse(__dirname).root);assert.ok(stats.bavail*stats.bsize>200*1024*1024);
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',error=>result.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit saved-note review</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});window.stateWrites=0;
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:4.2}),view:'schematic',notebookOpen:true,observations:[],reflection:'My explanation remains my own.',investigationPrediction:'I predict more current.',undo:[StemLab.circuitActiveDesign({input:.8})],redo:[StemLab.circuitActiveDesign({input:2})]},_circuitNetwork:{reflection:'Keep other work.'}});const[locale,changeLocale]=React.useState('');window.state=data;window.setState=update;window.setLocale=changeLocale;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:value=>{stateWrites++;update(value);},t:(_key,fallback)=>locale+fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    await page.locator('.circuit-active-notebook').waitFor();
    const compare=page.locator('.circuit-observation-compare'),review=page.locator('.circuit-comparison-notes'),selects=page.locator('.circuit-observation-selectors select'),saved=page.locator('.circuit-notebook-observation'),noteFields=page.locator('.circuit-notebook-note');
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const snapshot=()=>page.evaluate(()=>JSON.stringify(state));
    async function fixture(notes,{prefix='',dir='ltr'}={}){
      await page.evaluate(({notes,prefix,dir})=>{document.documentElement.dir=dir;setLocale(prefix);setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,notebookOpen:true,observations:notes.map((note,index)=>StemLab.circuitActiveObservation({input:1+index*.5,probeRed:'drive',probeBlack:'base'},note)),removedObservations:[],removedObservation:null,investigationNotice:''}}));},{notes,prefix,dir});
      await settle();await compare.evaluate(el=>el.open=true);
      for(let i=0;i<2;i++)await selects.nth(i).selectOption(await selects.nth(i).locator('option').nth(i+1).getAttribute('value'));
      await settle();await review.evaluate(el=>el.open=true);await settle();
    }
    async function capture(name,locator,width){const file=name+'.png';await locator.scrollIntoViewIfNeeded();await page.mouse.move(0,0);const clip=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left+scrollX)-6),y=Math.max(0,Math.floor(r.top+scrollY)-6);return{x,y,width:Math.min(document.documentElement.scrollWidth-x,Math.ceil(r.right+scrollX)+6-x),height:Math.ceil(r.bottom+scrollY)+6-y};});await page.screenshot({path:path.join(__dirname,file),clip,fullPage:true,animations:'disabled'});result.screenshots.push({file,width,clip,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});}
    async function focusState(name,locator){const data=await locator.evaluate(el=>{const s=getComputedStyle(el);return{focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth};});assert.equal(data.focused,true);assert.equal(data.focusVisible,true);assert.notEqual(data.outlineStyle,'none');assert.ok(parseFloat(data.outlineWidth)>=2);result.focus.push({name,...data});}
    async function inspect(name,width,{forced=false,double=false}={}){
      await page.setViewportSize({width,height:1000});await page.emulateMedia({forcedColors:forced?'active':'none',reducedMotion:'reduce'});await settle();
      const fonts=double?await review.locator('summary,p,h5,button').evaluateAll(nodes=>nodes.map(el=>{const before=parseFloat(getComputedStyle(el).fontSize);el.style.fontSize=before*2+'px';return{tag:el.tagName,text:el.textContent,before,after:parseFloat(getComputedStyle(el).fontSize)};})):[];
      await settle();
      const data=await review.evaluate(el=>{
        const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},outside=[],textNodes=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent.trim())continue;const bounds=rect(node.parentElement.closest('.circuit-comparison-note-card')||el);for(const match of node.textContent.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);for(const r of range.getClientRects())if(r.width>.1&&(r.left<bounds.left-1||r.right>bounds.right+1))outside.push({text:match[0],left:r.left,right:r.right,bounds});}textNodes.push(node.textContent);}
        const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
        return{viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,columns:getComputedStyle(el.querySelector('.circuit-comparison-notes-grid')).gridTemplateColumns,open:el.open,outside,duplicates,textNodes,cards:[...el.querySelectorAll('.circuit-comparison-note-card')].map(card=>({heading:card.querySelector('h5').textContent,note:card.querySelector('p').textContent,direction:getComputedStyle(card.querySelector('p')).direction,button:card.querySelector('button').textContent,target:document.getElementById(card.querySelector('button').getAttribute('aria-controls')).value})),actions:[...el.querySelectorAll('summary,button')].map(e=>({text:e.textContent,...rect(e)}))};
      });
      assert.equal(data.viewport,width);assert.ok(data.pageWidth<=width+1);assert.ok(data.scrollWidth<=data.width+1);assert.deepEqual(data.outside,[]);assert.deepEqual(data.duplicates,[]);assert.equal(data.open,true);
      assert.equal(data.columns.split(' ').length,width>640?2:1);for(const action of data.actions){assert.ok(action.width>=44);assert.ok(action.height>=44);}for(const font of fonts)assert.equal(font.after,font.before*2);
      for(const card of data.cards)if(!card.button.includes('Add'))assert.equal(card.note,card.target);
      const violations=await review.evaluate(async(el,forced)=>{const scan=await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:!forced}}});return scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}));},forced);assert.deepEqual(violations,[]);
      const accessibility=await review.ariaSnapshot();for(const card of data.cards)assert.ok(accessibility.includes(card.button));
      let colors=[];
      if(forced){colors=await review.locator('summary,p,h5,button').evaluateAll(nodes=>{const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);return nodes.map(el=>{const foreground=getComputedStyle(el).color;let p=el,background;while(p){const value=getComputedStyle(p).backgroundColor;if(value!=='transparent'&&value!=='rgba(0, 0, 0, 0)'){background=value;break;}p=p.parentElement;}const a=lum(rgb(foreground)),b=lum(rgb(background));return{text:el.textContent,foreground,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});for(const color of colors)assert.ok(color.ratio>=4.5);}
      result.views.push({name,width,forcedColors:forced,fonts,colors,axeViolations:violations,excludedRules:forced?['color-contrast']:[],forcedColorsReason:forced?'axe4.12.1 uses authored colors in forced mode; actual computed foreground/background ratios verified.':null,accessibility,...data});
      await capture(name,review,width);
    }

    const draft=Array.from({length:18},(_,i)=>'Line '+(i+1)+': I noticed the lamp changed when I raised the input.').join('\n').slice(0,1000);
    await fixture([draft,'Second saved note: the lamp appeared brighter.']);
    await page.setViewportSize({width:390,height:1000});await settle();const before=await snapshot(),writesBefore=await page.evaluate(()=>stateWrites),edit=review.locator('button').first();
    await edit.focus();await page.keyboard.press('Enter');await settle();assert.equal(await saved.first().evaluate(el=>el.open),true);assert.equal(await noteFields.first().evaluate(el=>document.activeElement===el),true);assert.equal(await saved.nth(1).evaluate(el=>el.open),false);assert.equal(await snapshot(),before);assert.equal(await page.evaluate(()=>stateWrites),writesBefore);
    await focusState('original-note',noteFields.first());
    const retained=await noteFields.first().evaluate(el=>{el.style.height='180px';el.setSelectionRange(100,145,'backward');el.scrollTop=55;return{value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,height:el.style.height,scrollTop:el.scrollTop};});
    await capture('original-note-editor',saved.first().locator('.circuit-notebook-observation-body'),390);
    const back=saved.first().locator('.circuit-note-comparison-return');await back.focus();await page.keyboard.press('Space');await settle();await focusState('comparison-return',compare.locator(':scope > summary'));assert.equal(await snapshot(),before);assert.equal(await review.evaluate(el=>el.open),true);
    await capture('comparison-return-focus',compare.locator(':scope > summary'),390);
    await edit.focus();await page.keyboard.press('Space');await settle();const after=await noteFields.first().evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,height:el.style.height,scrollTop:el.scrollTop}));assert.deepEqual(after,retained);assert.equal(await snapshot(),before);
    result.navigation.push({action:'edit-return-edit',wholeStateUnchanged:true,originalNoteFocused:true,otherCardStayedClosed:true,retained,after});
    const revised='My revised note: more input increased the saved lamp current.\nI kept the resistance the same.';await noteFields.first().fill(revised);await settle();assert.equal(await review.locator('.circuit-comparison-note-text').first().textContent(),revised);assert.equal(await page.evaluate(()=>state._circuitActive.reflection),'My explanation remains my own.');
    await back.focus();await page.keyboard.press('Enter');await settle();result.navigation.push({action:'edit-original-and-return',previewMatchesOriginal:true,reflectionPreserved:true,comparisonFocused:await compare.locator(':scope > summary').evaluate(el=>document.activeElement===el)});
    assert.equal(result.navigation[1].comparisonFocused,true);

    await fixture(['At 1 V, the lamp was dim. I kept both resistors fixed.','At 1.5 V, the lamp was brighter. My readings support a change in current.']);await inspect('notes-desktop',1280);
    await fixture(['I noticed more current in the lamp branch.','']);await inspect('notes-phone-empty',390);
    await fixture(['My evidence label: '+ 'connected_reading_'.repeat(18)+'\nThe numbers belong to the saved circuit.','The probe positions stayed the same.']);await inspect('notes-narrow-long-text',320);
    await fixture(['I kept the resistor fixed.','The lamp grew brighter.'],{prefix:'Translated: '});await inspect('notes-doubled-text',320,{double:true});
    await fixture(['I kept the resistor fixed.','The lamp grew brighter.']);await review.locator('summary,p,h5,button').evaluateAll(nodes=>nodes.forEach(el=>el.style.fontSize=''));await inspect('notes-forced-colors',320,{forced:true});
    await fixture(['لاحظت أن المصباح أصبح أكثر سطوعًا.','احتفظت بقيمة المقاومة نفسها.'],{prefix:'Translated: ',dir:'rtl'});await inspect('notes-rtl',320);assert.ok(result.views.at(-1).cards.every(card=>card.direction==='rtl'));
    await fixture(['A','B','C']);const remove=page.getByRole('button',{name:'Remove observation 1',exact:true});await saved.first().evaluate(el=>el.open=true);await remove.click();await settle();assert.equal(await review.count(),0);assert.equal(await selects.first().inputValue(),'');
    await selects.first().selectOption(await selects.first().locator('option').nth(2).getAttribute('value'));await settle();await review.evaluate(el=>el.open=true);const selectedTarget=await review.locator('button').first().getAttribute('aria-controls');await review.locator('button').first().focus();await page.keyboard.press('Enter');await settle();assert.equal(await page.evaluate(id=>document.activeElement?.id===id,selectedTarget),true);assert.equal(await page.evaluate(()=>document.activeElement.value),'C');result.navigation.push({action:'remove-selected-and-reselect',staleReviewRemoved:true,explicitReselectionFocusedCorrectNote:true});
    assert.deepEqual(result.errors,[]);result.sourceSha256AtEnd=hash(fs.readFileSync(sourcePath));result.mirrorSha256AtEnd=hash(fs.readFileSync(mirrorPath));result.scriptSha256AtEnd=hash(fs.readFileSync(__filename));assert.equal(result.sourceSha256AtEnd,result.sourceSha256);assert.equal(result.mirrorSha256AtEnd,result.sourceSha256);assert.equal(result.scriptSha256AtEnd,result.scriptSha256);result.passed=true;
    console.log('Passed6 note-review views,8 captures and3 native workflows on '+result.sourceSha256);
  }catch(error){result.failure=error.stack;throw error;}
  finally{await browser.close();write('browser-results.json',result);write('browser-close.json',{browserClosed:!browser.isConnected(),passed:result.passed===true,sourceSha256:result.sourceSha256,scriptSha256:result.scriptSha256});}
})().catch(error=>{console.error(error);process.exitCode=1;});
