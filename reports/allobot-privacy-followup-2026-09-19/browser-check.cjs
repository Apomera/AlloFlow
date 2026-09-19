const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const out=path.resolve('reports/allobot-privacy-followup-2026-09-19');
const previous=fs.readFileSync('reports/allobot-evidence-2026-09-19/browser-check.cjs','utf8');
const css=previous.match(/const css=`([\s\S]*?)`;/)[1]+' .max-h-64{max-height:256px}.max-h-32{max-height:128px}.overflow-y-auto{overflow-y:auto}.overflow-auto{overflow:auto}.my-2{margin-block:8px}textarea,select{font:inherit;max-width:100%}pre{font-size:12px}button:disabled{opacity:.65}';
(async()=>{const browser=await chromium.launch({headless:true}),results=[];try{
 for(const width of [1280,320]){
  const context=await browser.newContext({viewport:{width,height:900}});await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Allobot privacy controls</title><main><h1>Allobot privacy controls</h1><div id="root"></div></main></html>'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://allobot.test/');await page.addStyleTag({content:css});
  for(const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','ai_backend_module.js','udl_chat_module.js','view_misc_modals_module.js'])await page.addScriptTag({content:fs.readFileSync(f,'utf8')});
  await page.evaluate(()=>{window.savedHistory=[{text:'Synthetic saved copy'}];window.testMessages=[{role:'user',text:'Synthetic earlier question'},{role:'model',text:'Synthetic earlier answer'}];window.prompts=[];
   function App(){const [messages,setMessages]=React.useState(window.testMessages),[draft,setDraft]=React.useState('Synthetic draft');window.testClear=()=>{setMessages([]);window.testMessages=[];setDraft('');};return React.createElement(React.Fragment,null,React.createElement(window.AlloModules.AllobotContextControls,{messages,busy:false,setInput:setDraft,clearChat:window.testClear,t:k=>k}),React.createElement('label',null,'Message',React.createElement('textarea',{'aria-label':'Message',value:draft,onChange:e=>setDraft(e.target.value),style:{display:'block',width:'100%'}})));}
   ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));});
  const summary=page.locator('summary');await summary.focus();await page.keyboard.press('Enter');
  await page.getByLabel('Include up to 4 recent messages (500 characters each)').check();await page.getByLabel('Excerpt to include with the next reply (optional)').fill('Synthetic reviewed excerpt');
  assert.match(await page.getByLabel('Recent-message preview').innerText(),/Synthetic earlier answer/);
  await page.getByLabel('Public research topic',{exact:true}).selectOption('cell structure');await page.getByRole('button',{name:'Replace message with public query'}).click();assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'Search for cell structure');
  const privateStorage=await page.evaluate(()=>JSON.stringify({...localStorage}));assert.ok(!privateStorage.includes('Synthetic'));
  await page.screenshot({path:path.join(out,`context-${width}.png`),fullPage:true});
  await page.evaluate(async()=>{await window.AlloModules.UdlChat.generateStandardChatResponse('Suggest a strategy',{udlMessages:window.testMessages,currentUiLanguage:'English',callGemini:async p=>{window.prompts.push(p);return 'A helpful strategy';},setUdlMessages:()=>{},warnLog:()=>{}});});
  await page.waitForFunction(()=>!window.AlloFlowChatPrivacy.get().recent && !window.AlloFlowChatPrivacy.get().excerpt);
  assert.equal(await page.getByLabel('Excerpt to include with the next reply (optional)').inputValue(),'');assert.equal(await page.getByLabel('Include up to 4 recent messages (500 characters each)').isChecked(),false);
  const prompts=await page.evaluate(()=>window.prompts);assert.equal(prompts.length,1);assert.match(prompts[0],/Synthetic reviewed excerpt/);
  await page.getByRole('button',{name:'Clear live conversation'}).click();assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'');assert.equal(await page.evaluate(()=>window.testMessages.length),0);assert.equal(await page.evaluate(()=>window.savedHistory.length),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.addScriptTag({content:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
  results.push({width,keyboardControls:true,contextPreview:true,oneReplyReset:true,publicTopicDraft:true,noContextStorage:true,clearLiveOnly:true,overflow:false,axeViolations:violations.length,pageErrors:errors});await context.close();
 }
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
