const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),baseline=process.argv.includes('--baseline'),output=baseline?path.join(__dirname,'baseline'):__dirname;
fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'),'utf8'),sourceHash=crypto.createHash('sha256').update(source).digest('hex');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results={sourceSha256:sourceHash,baseline,checks:[],errors:[],axe:[],layouts:[],actions:[],focus:[],motion:[],textResize:[],contentBounds:[],readingStress:{screenshots:[]},screenshots:[],visualIssues:[],diagnostics:[]};
  let page;
  console.log('Circuit lesson navigation audit: '+sourceHash);
  try{
    page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',error=>results.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit lesson navigation checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});window.awards=[];
      const before={mode:'series',voltage:3,components:[{id:51,type:'resistor',value:330}]},after={...before,voltage:6};
      function Host(){
        const [data,setData]=React.useState({_circuit:{mode:'series',voltage:9,components:[],pauseMotion:false,lessonOpen:true,prediction:'Keep my own prediction.',observations:[{before,after,delta:3/330,prediction:'My voltage question.',explanation:'My original observation.',changes:['Supply voltage'],controlled:true}]}});
        window.state=data;window.setState=setData;
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:(...args)=>awards.push(args),announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    const lab=page.locator('.circuit-lessons'),chooser=page.locator('details.circuit-lesson-chooser'),guide=page.locator('.circuit-start-guide');
    const card=title=>chooser.locator('.circuit-lesson-cards button').filter({has:page.getByText(title,{exact:true})});
    const ownNotes=()=>page.evaluate(()=>JSON.stringify({prediction:state._circuit.prediction,observations:state._circuit.observations}));
    const protectedState=()=>page.evaluate(()=>JSON.stringify({mode:state._circuit.mode,voltage:state._circuit.voltage,components:state._circuit.components,undo:state._circuit.undo,redo:state._circuit.redo,prediction:state._circuit.prediction,observations:state._circuit.observations}));
    const originalNotes=await ownNotes();
    async function activate(locator){await locator.focus();await page.keyboard.press('Enter');}
    async function closedFocus(id){
      await page.waitForFunction(id=>document.activeElement?.id===id&&!document.querySelector('.circuit-lesson-chooser').open,id,{timeout:15000});
      await page.waitForTimeout(80);
      assert.equal(await chooser.evaluate(el=>el.open),false,'Chooser must remain closed after its native toggle event settles');
      assert.equal(await page.evaluate(()=>document.activeElement?.id),id);
    }
    async function toggleChooser(open){
      const before=await page.evaluate(()=>JSON.stringify(state));
      await activate(chooser.locator('summary'));await page.waitForFunction(open=>document.querySelector('.circuit-lesson-chooser').open===open,open);
      assert.equal(await page.evaluate(()=>JSON.stringify(state)),before,'Opening/closing the chooser must not change saved state');
    }
    async function focusCheck(name,locator,width){
      await locator.evaluate(el=>el.blur());const before=await locator.evaluate(el=>getComputedStyle(el).boxShadow);await page.keyboard.press('Tab');await locator.focus();
      const actual=await locator.evaluate(el=>{const s=getComputedStyle(el);return {focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,boxShadow:s.boxShadow};});
      actual.visible=actual.focused&&actual.focusVisible&&((actual.outlineStyle!=='none'&&parseFloat(actual.outlineWidth)>=2&&!['transparent','rgba(0, 0, 0, 0)'].includes(actual.outlineColor))||(actual.boxShadow!=='none'&&actual.boxShadow!==before));
      results.focus.push({name,width,...actual});if(!actual.visible)results.visualIssues.push({name,width,type:'focus',actual});await locator.evaluate(el=>el.blur());
    }
    async function capture(name,selector,width,screenshotBucket=results.screenshots){
      const clip=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,Math.floor(r.x+scrollX)-6),y=Math.max(0,Math.floor(r.y+scrollY)-6);return {x,y,width:Math.min(document.documentElement.scrollWidth-x,Math.ceil(r.right+scrollX)+6-x),height:Math.ceil(r.bottom+scrollY)+6-y};});
      const file=name+'-'+width+'.png';await page.screenshot({path:path.join(output,file),clip,fullPage:true,animations:'disabled'});screenshotBucket.push({name,width,file,clip});
    }
    async function resizeLessonText(scale){
      return lab.evaluate((el,scale)=>{
        for(const [node,style] of window.auditTextStyles||[]){if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);}
        window.auditTextStyles=[];if(scale===1)return;
        const nodes=[el,...el.querySelectorAll('*')],sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));
        window.auditTextStyles=nodes.map(node=>[node,node.getAttribute('style')]);
        nodes.forEach((node,index)=>{if(Number.isFinite(sizes[index])){node.style.setProperty('transition','none','important');node.style.setProperty('animation','none','important');node.style.setProperty('font-size',(sizes[index]*scale)+'px','important');}});
        const question=el.querySelector('#circuit-lesson-question');return {scope:'.circuit-lessons',scale,elements:nodes.length,beforeQuestionSize:sizes[nodes.findIndex(node=>node.id==='circuit-lesson-question')],afterQuestionSize:parseFloat(getComputedStyle(question).fontSize),questionStyle:question.getAttribute('style'),questionTransition:getComputedStyle(question).transition};
      },scale);
    }
    async function inspect(name,{widths=[1280,390,320],captures=[{name,selector:'.circuit-lessons'}],focus=['.circuit-lesson-chooser > summary'],textScale=1,screenshotBucket=results.screenshots}={}){
      for(const width of widths){
        await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
        results.diagnostics.push({name,width,target:await page.getByRole('button',{name:'Check target',exact:true}).evaluate(el=>{const style=getComputedStyle(el);return {disabled:el.disabled,matchesDisabled:el.matches(':disabled'),opacity:style.opacity,color:style.color,backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage,ancestors:Array.from((function*(node){for(let i=0;node&&i<5;i++,node=node.parentElement)yield node;})(el.parentElement)).map(node=>({tag:node.tagName,className:node.className,opacity:getComputedStyle(node).opacity,backgroundColor:getComputedStyle(node).backgroundColor}))};})});
        const scan={name,width,textScale,violations:await page.evaluate(async()=>{const scan=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));})};results.axe.push(scan);if(scan.violations.length)results.visualIssues.push({name,width,type:'axe',violations:scan.violations});
        const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));results.layouts.push({name,textScale,...dimensions});if(dimensions.scrollWidth>width+1)results.visualIssues.push({name,width,type:'overflow',...dimensions});
        const contentBounds=await page.locator('.circuit-evidence-bar,.circuit-evidence-delta,.circuit-evidence-change,#circuit-lesson-result').evaluateAll(elements=>elements.filter(el=>el.checkVisibility()).map(el=>{
          const r=el.getBoundingClientRect(),s=getComputedStyle(el),left=r.left+parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft),right=r.right-parseFloat(s.borderRightWidth)-parseFloat(s.paddingRight),violations=[],lines=[];
          const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let text;
          while((text=walker.nextNode())){
            if(!text.textContent.trim()||!text.parentElement.checkVisibility()||text.parentElement.closest('[aria-hidden="true"]'))continue;
            const range=document.createRange();range.selectNodeContents(text);
            for(const rect of range.getClientRects()){
              if(rect.width<.1||rect.height<.1)continue;
              const line={text:text.textContent.trim(),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};lines.push(line);
              if(rect.left<left-1||rect.right>right+1)violations.push({...line,overLeft:Math.max(0,left-rect.left),overRight:Math.max(0,rect.right-right)});
            }
          }
          return {selector:el.id?'#'+el.id:'.'+el.className.trim().split(/\s+/).join('.'),stage:el.getAttribute('data-stage'),left,right,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,lines,violations};
        }));
        results.contentBounds.push({name,width,textScale,cards:contentBounds});
        for(const card of contentBounds)if(card.violations.length||card.scrollWidth>card.clientWidth+1)results.visualIssues.push({name,width,textScale,type:'result-content-bounds',card});
        const actions=await page.locator('.circuit-lesson-chooser > summary,.circuit-lessons button,[data-circuit-start-experiment],.circuit-start-body .circuit-action-row button').evaluateAll(elements=>elements.filter(el=>el.checkVisibility()).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent.trim(),width:r.width,height:r.height,transitionDuration:s.transitionDuration};}));results.actions.push({name,width,textScale,actions});
        for(const action of actions){if(action.width<43.9||action.height<43.9)results.visualIssues.push({name,width,type:'primary-action-size',action});if(action.transitionDuration.split(',').some(value=>parseFloat(value)*(value.trim().endsWith('ms')?.001:1)>.0000101))results.visualIssues.push({name,width,type:'reduced-motion-transition',action});}
        for(const selector of focus)await focusCheck(name+' '+selector,page.locator(selector),width);
        await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);
        for(const item of captures)await capture(item.name,item.selector,width,screenshotBucket);
      }
      await page.setViewportSize({width:1280,height:1000});
    }

    assert.equal(await chooser.evaluate(el=>el.open),true);assert.equal(await guide.evaluate(el=>el.open),true);assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
    await inspect('fresh-invitation',{captures:[{name:'fresh-invitation',selector:'[data-circuit-bench]'},{name:'fresh-chooser',selector:'.circuit-lessons'}],focus:['[data-circuit-start-experiment]','.circuit-lesson-chooser > summary']});
    await page.getByRole('button',{name:'Start with a bulb',exact:true}).click();
    await page.waitForFunction(()=>state._circuit.lessonId==='loop'&&document.activeElement?.id==='circuit-lesson-question');
    assert.equal(await chooser.evaluate(el=>el.open),false);assert.equal(await lab.locator('.circuit-lesson-progress').getAttribute('data-active'),'true');
    assert.ok((await chooser.locator('summary').innerText()).includes('Change experiment'));assert.equal(await chooser.locator('summary small').innerText(),'Complete the loop');
    assert.equal(await page.evaluate(()=>state._circuit.components[1].closed),false);assert.equal(await ownNotes(),originalNotes);
    await inspect('start-active',{focus:['.circuit-lesson-chooser > summary','#circuit-lesson-question']});
    results.checks.push({name:'A fresh learner sees the invitation and open chooser; Start opens the loop question with compact navigation and preserved notes'});

    await lab.getByRole('button',{name:'It stays at zero',exact:true}).click();
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,voltage:12}})));
    await page.waitForFunction(()=>state._circuit.voltage===12);
    await toggleChooser(true);await inspect('chooser-open');await toggleChooser(false);await toggleChooser(true);
    const currentBefore=await protectedState();await activate(card('Complete the loop'));
    await page.waitForFunction(()=>!document.querySelector('.circuit-lesson-chooser').open&&document.activeElement?.id==='circuit-lesson-question');
    assert.equal(await protectedState(),currentBefore);assert.equal(await page.evaluate(()=>state._circuit.lessonChoice),1);
    results.checks.push({name:'Keyboard chooser toggles change no saved state; selecting the current untested lesson preserves an edited circuit, draft prediction, and Undo history'});

    await activate(guide.locator('summary'));await page.getByRole('button',{name:'Resume my experiment',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.id==='circuit-lesson-question');assert.equal(await protectedState(),currentBefore);assert.equal(await chooser.evaluate(el=>el.open),false);
    await lab.getByRole('button',{name:'Test my prediction',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='circuit-lesson-result');
    await lab.getByRole('textbox',{name:'Explain using evidence',exact:true}).fill('I revised my prediction: the closed loop carries about 90 mA.');
    await toggleChooser(true);await activate(card('Give charge another path'));await page.waitForFunction(()=>state._circuit.lessonId==='paths');await closedFocus('circuit-lesson-question');
    assert.equal(await chooser.evaluate(el=>el.open),false);
    const anotherBench=await protectedState();await toggleChooser(true);await activate(card('Complete the loop'));
    await page.waitForFunction(()=>state._circuit.lessonId==='loop');await closedFocus('circuit-lesson-result');
    assert.equal(await chooser.evaluate(el=>el.open),false);assert.equal(await protectedState(),anotherBench);
    assert.match(await lab.getByRole('textbox',{name:'Explain using evidence',exact:true}).inputValue(),/revised my prediction/);
    const beforeSavedReselect=await protectedState(),savedRecord=await page.evaluate(()=>JSON.stringify(state._circuit.lessonRecords));
    await toggleChooser(true);await activate(card('Complete the loop'));await page.waitForFunction(()=>document.activeElement?.id==='circuit-lesson-result');
    assert.equal(await protectedState(),beforeSavedReselect);assert.equal(await page.evaluate(()=>JSON.stringify(state._circuit.lessonRecords)),savedRecord);
    await activate(guide.locator('summary'));await page.getByRole('button',{name:'Resume my experiment',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.id==='circuit-lesson-result');assert.equal(await protectedState(),beforeSavedReselect);assert.equal(await ownNotes(),originalNotes);assert.equal(await chooser.evaluate(el=>el.open),false);
    await inspect('resumed-result',{focus:['.circuit-lesson-chooser > summary','#circuit-lesson-result']});
    results.checks.push({name:'Resume focuses the untested question or saved result; new and saved lesson selection close the chooser and preserve existing circuits and explanations'});

    const beforeMotion=await page.evaluate(()=>({tick:state._circuit.tick||0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:state._circuit.pauseMotion}));await page.waitForTimeout(250);
    const afterMotion=await page.evaluate(()=>({tick:state._circuit.tick||0,animations:document.getAnimations().filter(animation=>animation.playState==='running'&&Number(animation.effect?.getTiming().duration)>.01).map(animation=>({duration:animation.effect.getTiming().duration}))}));
    assert.equal(beforeMotion.reduced,true);assert.equal(beforeMotion.paused,false);assert.equal(afterMotion.tick,beforeMotion.tick);assert.deepEqual(afterMotion.animations,[]);results.motion.push({before:beforeMotion,after:afterMotion});
    const resized=await resizeLessonText(2);
    results.textResize.push(resized);assert.equal(resized.afterQuestionSize,resized.beforeQuestionSize*2);
    await inspect('resumed-result-200pct-text',{widths:[390,320],textScale:2,focus:['.circuit-lesson-chooser > summary','#circuit-lesson-result']});
    await resizeLessonText(1);await toggleChooser(true);await activate(card('Give charge another path'));await closedFocus('circuit-lesson-question');
    await lab.getByRole('button',{name:'It doubles',exact:true}).click();await lab.getByRole('button',{name:'Test my prediction',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='circuit-lesson-result');
    const readings=await lab.locator('.circuit-evidence-bar > strong').allTextContents(),delta=await lab.locator('.circuit-evidence-delta > strong').textContent();
    assert.deepEqual(readings,['90.00 mA','180.00 mA']);assert.equal(delta,'+90.00 mA');
    results.readingStress={...results.readingStress,lesson:'paths',width:320,textScale:2,readings,delta,resize:await resizeLessonText(2)};
    assert.equal(results.readingStress.resize.afterQuestionSize,results.readingStress.resize.beforeQuestionSize*2);
    await inspect('paths-result-200pct-text',{widths:[320],textScale:2,focus:['.circuit-lesson-chooser > summary','#circuit-lesson-result'],screenshotBucket:results.readingStress.screenshots});
    results.readingStress.passed=!results.visualIssues.some(issue=>issue.name==='paths-result-200pct-text');
    assert.equal(await ownNotes(),originalNotes);assert.deepEqual(await page.evaluate(()=>awards),[]);assert.deepEqual(results.errors,[]);
    if(!baseline)assert.deepEqual(results.visualIssues,[],'Inspect navigation-results.json for failures.');
    results.passed=true;await page.evaluate(()=>auditRoot.unmount());
  }catch(error){results.failure=error.stack;if(page)results.failureContext=await page.evaluate(()=>({lessonId:window.state?state._circuit.lessonId:null,chooserOpen:document.querySelector('.circuit-lesson-chooser')?.open,activeTag:document.activeElement?.tagName,activeId:document.activeElement?.id,activeText:document.activeElement?.textContent?.slice(0,180),chooser:document.querySelector('.circuit-lesson-chooser')?.outerHTML})).catch(()=>null);throw error;}
  finally{results.sourceSha256AtEnd=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'))).digest('hex');results.sourceChangedDuringRun=results.sourceSha256AtEnd!==sourceHash;fs.writeFileSync(path.join(output,'navigation-results.json'),JSON.stringify(results,null,2));await browser.close();}
  console.log('Circuit navigation: '+results.checks.length+' workflows, '+results.axe.length+' axe scans, '+results.layouts.length+' layout checks, '+results.screenshots.length+' screenshots, '+results.visualIssues.length+' visual issues.');
})().catch(error=>{console.error(error);process.exitCode=1;});
