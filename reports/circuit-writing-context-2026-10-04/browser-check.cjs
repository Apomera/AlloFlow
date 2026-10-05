const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const sourcePath=path.join(root,'stem_lab/stem_tool_circuit.js'),mirrorPath=path.join(root,'desktop/web-app/public/stem_lab/stem_tool_circuit.js'),source=fs.readFileSync(sourcePath,'utf8');
const result={sourceSha256:hash(source),scriptSha256:hash(fs.readFileSync(__filename)),errors:[],workflows:[],views:[],screenshots:[],focus:[]};
const write=(file,value)=>fs.writeFileSync(path.join(__dirname,file),JSON.stringify(value,null,2)+'\n');
(async()=>{
  assert.equal(result.sourceSha256,'e9c7d6a86b45def1263ffb3ba4ea98de19078563a471a6b14d95c285299fe030');assert.equal(hash(fs.readFileSync(mirrorPath)),result.sourceSha256);
  assert.ok(!fs.existsSync(path.join(__dirname,'browser-results.json')),'Preserve any earlier attempt before rerunning.');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.on('pageerror',error=>result.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit writing context</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});window.stateWrites=0;
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:4.2}),view:'schematic',notebookOpen:true,observations:[StemLab.circuitActiveObservation({input:1},'First note.'),StemLab.circuitActiveObservation({input:1.5},'Second note.')],investigationQuestion:'How does the input affect lamp current?',investigationPrediction:'I predict that increasing the input will increase lamp current because more base current can flow.',reflection:'My explanation remains my own.\nI will use the saved readings to support my reasoning.',undo:[StemLab.circuitActiveDesign({input:.8})],redo:[StemLab.circuitActiveDesign({input:2})]},_circuitNetwork:{reflection:'Keep other work.'}});const[locale,changeLocale]=React.useState('');window.state=data;window.setState=update;window.setLocale=changeLocale;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:value=>{stateWrites++;update(value);},t:(_key,fallback)=>locale+fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const editor=page.locator('.circuit-reflection-editor'),review=page.locator('.circuit-reflection-plan'),reflection=page.locator('.circuit-notebook-reflection'),comparison=page.locator('.circuit-observation-compare');
    const planField=slot=>page.locator('.circuit-investigation-plan-input[id$="-'+slot+'"]'),edit=slot=>review.locator('.circuit-reflection-plan-edit[aria-controls$="-'+slot+'"]'),back=page.locator('.circuit-plan-return-writing');
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const snapshot=()=>page.evaluate(()=>JSON.stringify(state));
    await editor.waitFor();assert.equal(await review.evaluate(el=>el.open),false);
    await review.locator('summary').focus();await page.keyboard.press('Enter');await settle();assert.equal(await review.evaluate(el=>el.open),true);
    async function capture(name,locator){await locator.scrollIntoViewIfNeeded();await page.mouse.move(0,0);const clip=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left+scrollX)-6),y=Math.max(0,Math.floor(r.top+scrollY)-6);return{x,y,width:Math.min(document.documentElement.scrollWidth-x,Math.ceil(r.right+scrollX)+6-x),height:Math.ceil(r.bottom+scrollY)+6-y};});const file=name+'.png';await page.screenshot({path:path.join(__dirname,file),clip,fullPage:true,animations:'disabled'});result.screenshots.push({file,clip,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});}
    async function focusCheck(name,locator){const data=await locator.evaluate(el=>{const s=getComputedStyle(el);return{focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outline:s.outlineStyle,width:s.outlineWidth};});assert.equal(data.focused,true);assert.equal(data.focusVisible,true);assert.equal(data.outline,'solid');assert.ok(parseFloat(data.width)>=2);result.focus.push({name,...data});}
    const saved=await snapshot();const retained=await reflection.evaluate(el=>{el.style.height='200px';el.setSelectionRange(3,15,'backward');return{value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,height:el.style.height};});
    await page.setViewportSize({width:390,height:1000});
    for(const slot of ['question','prediction']){
      await edit(slot).focus();await page.keyboard.press(slot==='question'?'Enter':'Space');await settle();await focusCheck('original-'+slot,planField(slot));assert.equal(await snapshot(),saved);assert.equal(await back.isVisible(),true);
      if(slot==='prediction')await capture('original-plan-editor',page.locator('.circuit-notebook-prompts'));
      await back.focus();await page.keyboard.press('Enter');await settle();await focusCheck('return-from-'+slot,reflection);assert.equal(await back.count(),0);assert.equal(await snapshot(),saved);assert.equal(await review.evaluate(el=>el.open),true);
      assert.deepEqual(await reflection.evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,height:el.style.height})),retained);
    }
    assert.equal(await page.evaluate(()=>stateWrites),0);await capture('writer-return-focus',editor);result.workflows.push({name:'Review, edit either original plan field, and return with keyboard',wholeStateUnchanged:true,retainedDraft:retained});
    await edit('prediction').click();const revised='I predict the current will rise until the lamp reaches its current limit.\nI will compare two saved readings.';await planField('prediction').fill(revised);await back.click();await settle();
    assert.equal(await review.locator('.circuit-reflection-plan-text').nth(1).textContent(),revised);assert.equal(await reflection.inputValue(),retained.value);result.workflows.push({name:'Edit the original prediction and see its exact updated preview',passed:true});
    const beforeReading=await snapshot();await editor.locator('.circuit-reflection-review-readings').focus();await page.keyboard.press('Space');await settle();await focusCheck('review-readings',comparison.locator(':scope > summary'));assert.equal(await comparison.evaluate(el=>el.open),true);
    await comparison.locator('.circuit-comparison-writing-own').focus();await page.keyboard.press('Enter');await settle();await focusCheck('return-from-readings',reflection);assert.equal(await snapshot(),beforeReading);result.workflows.push({name:'Review saved readings and return to the existing explanation',wholeStateUnchanged:true});

    async function fixture({question='How does the input affect lamp current?\nI will keep both resistors fixed.',prediction='I predict a larger lamp current.\nThe saved readings will help me test this idea.',prefix='',dir='ltr'}={}){
      await editor.locator('[style]').evaluateAll(nodes=>nodes.forEach(el=>{el.style.removeProperty('font-size');el.style.removeProperty('transition');el.style.removeProperty('animation');}));
      await page.evaluate(({question,prediction,prefix,dir})=>{document.documentElement.dir=dir;setLocale(prefix);setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,investigationQuestion:question,investigationPrediction:prediction}}));},{question,prediction,prefix,dir});await settle();await review.evaluate(el=>el.open=true);await reflection.evaluate(el=>el.style.height='');
    }
    async function inspect(name,width,{double=false,forced=false}={}){
      await page.setViewportSize({width,height:1000});await page.emulateMedia({forcedColors:forced?'active':'none',reducedMotion:'reduce'});await settle();
      const text=editor.locator('h3,h4,p,summary,button,textarea'),normal=double?await text.evaluateAll(nodes=>nodes.map(el=>parseFloat(getComputedStyle(el).fontSize))):[];
      if(double)await text.evaluateAll((nodes,sizes)=>nodes.forEach((el,i)=>{el.style.setProperty('transition','none','important');el.style.setProperty('animation','none','important');el.style.setProperty('font-size',sizes[i]*2+'px','important');}),normal);await settle();
      const fonts=double?await text.evaluateAll((nodes,sizes)=>nodes.map((el,i)=>({before:sizes[i],after:parseFloat(getComputedStyle(el).fontSize)})),normal):[];for(const font of fonts)assert.equal(font.after,font.before*2);
      const data=await editor.evaluate(el=>{
        const rect=node=>{const r=node.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height};},outside=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent.trim()||node.parentElement.closest('textarea,.circuit-reflection-label'))continue;const bounds=rect(node.parentElement.closest('.circuit-reflection-plan-card')||el);for(const word of node.textContent.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);for(const r of range.getClientRects())if(r.width>.1&&(r.left<bounds.left-1||r.right>bounds.right+1))outside.push({word:word[0],left:r.left,right:r.right,bounds});}}
        const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return{viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,outside,duplicates:ids.filter((id,i)=>ids.indexOf(id)!==i),columns:getComputedStyle(el.querySelector('.circuit-reflection-plan-grid')).gridTemplateColumns,cards:[...el.querySelectorAll('.circuit-reflection-plan-card')].map(card=>({text:card.querySelector('p').textContent,authored:card.querySelector('p').classList.contains('circuit-reflection-plan-text'),direction:getComputedStyle(card.querySelector('p')).direction,target:document.getElementById(card.querySelector('button').getAttribute('aria-controls')).value,button:card.querySelector('button').textContent})),actions:[...el.querySelectorAll('summary,button')].map(n=>({text:n.textContent,...rect(n)}))};
      });
      assert.equal(data.viewport,width);assert.ok(data.pageWidth<=width+1);assert.deepEqual(data.outside,[]);assert.deepEqual(data.duplicates,[]);assert.equal(data.columns.split(' ').length,width>640?2:1);
      for(const card of data.cards)if(card.authored)assert.equal(card.text,card.target);for(const action of data.actions){assert.ok(action.width>=44);assert.ok(action.height>=44);}
      const violations=await editor.evaluate(async(el,forced)=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:!forced}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})),forced);assert.deepEqual(violations,[]);
      let colors=[];if(forced)colors=await editor.locator('.circuit-reflection-plan summary,.circuit-reflection-plan p,.circuit-reflection-plan h4,.circuit-reflection-plan button,.circuit-reflection-review-readings').evaluateAll(nodes=>{const lum=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);return nodes.map(el=>{const foreground=getComputedStyle(el).color;let parent=el,background;while(parent){const color=getComputedStyle(parent).backgroundColor;if(color!=='transparent'&&color!=='rgba(0, 0, 0, 0)'){background=color;break;}parent=parent.parentElement;}const a=lum(foreground),b=lum(background);return{text:el.textContent,foreground,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});for(const color of colors)assert.ok(color.ratio>=4.5);
      const accessibility=await editor.ariaSnapshot();for(const card of data.cards)assert.ok(accessibility.includes(card.button));
      result.views.push({name,width,double,forced,fonts,colors,axeViolations:violations,excludedRules:forced?['color-contrast']:[],forcedColorsReason:forced?'Actual used colors checked; axe uses authored colors in forced mode.':null,accessibility,...data});await capture(name,editor);
    }
    await fixture();await inspect('writing-context-desktop',1280);
    await fixture({question:'',prediction:'   '});await inspect('writing-context-phone-empty',390);
    await fixture({question:'My measurement label: '+ 'recorded_current_'.repeat(45)+'\nI will vary one setting.',prediction:'I predict more current. I will compare the numbers before deciding.'});await inspect('writing-context-narrow-long',320);
    await fixture({question:'Which setting affects current?',prediction:'I predict an increase.',prefix:'Translated '});await inspect('writing-context-doubled-text',390,{double:true});
    await fixture();await inspect('writing-context-forced-colors',320,{forced:true});
    await fixture({question:'كيف يؤثر الجهد على تيار المصباح؟\nسأثبت قيم المقاومات.',prediction:'أتوقع زيادة التيار.\nسأستخدم القراءات لاختبار توقعي.',dir:'rtl'});await inspect('writing-context-rtl',390);
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);assert.equal(hash(fs.readFileSync(mirrorPath)),result.sourceSha256);assert.equal(hash(fs.readFileSync(__filename)),result.scriptSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;write('browser-results.json',result);}
  console.log(JSON.stringify({passed:true,views:result.views.length,workflows:result.workflows.length,screenshots:result.screenshots.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
