const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const out = __dirname;
const css = 'body{font:16px system-ui;margin:16px;color:#0f172a;background:white}*{box-sizing:border-box}main{max-width:640px;margin:auto}p{margin:8px 0}.text-xs{font-size:12px}.p-2{padding:8px}.border-t{border-top:1px solid #94a3b8}.border{border:1px solid #94a3b8}.block{display:block}.flex{display:flex}.gap-2{gap:8px}.my-2{margin-block:8px}.w-full{width:100%}.min-w-0{min-width:0}.min-h-11{min-height:44px}.min-h-6{min-height:24px}.px-3{padding-inline:12px}.rounded{border-radius:4px}.max-h-64{max-height:256px}.max-h-32{max-height:128px}.overflow-y-auto,.overflow-auto{overflow:auto}.whitespace-pre-wrap{white-space:pre-wrap}.break-words{overflow-wrap:anywhere}textarea,select,button{font:inherit;max-width:100%}button,summary{cursor:pointer}button:disabled{opacity:.65}pre{font-size:12px}';
(async () => {
 const browser = await chromium.launch({headless:true}), results = [];
 try { for (const width of [1280,320]) {
  const context = await browser.newContext({viewport:{width,height:900}}), requests=[], errors=[];
  let failNextAI=false;
  await context.route('**/*', async route => {
   const request=route.request(), url=new URL(request.url());
   if (url.hostname==='allobot.test' && request.isNavigationRequest()) return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Allobot destination and privacy</title><main><h1>Allobot</h1><div id="root"></div></main></html>'});
   requests.push({url:request.url(),body:request.postData()||'',headers:request.headers()});
   if(url.hostname==='google.serper.dev') return route.fulfill({contentType:'application/json',body:JSON.stringify({organic:[{title:'Public evidence',link:'https://udlguidelines.cast.org/',snippet:'Synthetic public reference excerpt'}]})});
   if(url.hostname==='generativelanguage.googleapis.com') {
    if(failNextAI){failNextAI=false;return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:{message:'Synthetic denied credential'}})});}
    return route.fulfill({contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:'Synthetic supported finding [1].'}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://udlguidelines.cast.org/',title:'CAST'}}]}}]})});
   }
   if(url.hostname==='district.test') return route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'Synthetic district answer'}}]})});
   return route.abort('blockedbyclient');
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://allobot.test/');await page.addStyleTag({content:css});
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','ai_backend_module.js','gemini_api_module.js','udl_chat_module.js','phase_k_helpers_module.js','view_misc_modals_module.js']) await page.addScriptTag({content:fs.readFileSync(file,'utf8')});
  await page.evaluate(()=>{
   window.testMessages=[{role:'user',text:'SYNTHETIC_PRIVATE_HISTORY'},{role:'model',text:'SYNTHETIC_PRIVATE_ANSWER'}];window.savedHistory=[{text:'SYNTHETIC_SAVED_COPY'}];window.chatResults=[];
   window.makeApi=canvas=>window.AlloModules.createGeminiAPI({apiKey:'synthetic-key',_isCanvasEnv:canvas,GEMINI_MODELS:{default:'fixture',fallback:'fixture'},fetchWithExponentialBackoff:(url,options)=>fetch(url,options),warnLog:()=>{},debugLog:()=>{},getAbortSignal:()=>null});
   window.api=window.makeApi(false);window.callGemini=window.api.callGemini;
   window.send=async question=>{const result=await window.AlloModules.UdlChat.generateStandardChatResponse(question,{udlMessages:window.testMessages,history:window.savedHistory,inputText:'SYNTHETIC_PRIVATE_EDITOR',getGroupDifferentiationContext:()=> 'SYNTHETIC_PRIVATE_ROSTER',currentUiLanguage:'English',callGemini:window.callGemini,warnLog:()=>{},setUdlMessages:update=>{window.chatResults=update(window.chatResults);}});window.lastResult=result;return result;};
   function App(){const [messages,setMessages]=React.useState(window.testMessages),[draft,setDraft]=React.useState('Suggest a reading strategy'),[busy,setBusy]=React.useState(false);
    return React.createElement(React.Fragment,null,React.createElement(window.AlloModules.AllobotContextControls,{messages,busy,setInput:setDraft,clearChat:()=>{setMessages([]);window.testMessages=[];setDraft('');},t:k=>k}),React.createElement('label',null,'Message',React.createElement('textarea',{'aria-label':'Message',value:draft,onChange:e=>setDraft(e.target.value),style:{display:'block',width:'100%'}})),React.createElement('button',{disabled:busy,onClick:async()=>{setBusy(true);try{await window.send(draft);}finally{setBusy(false);}}},'Send'));
   }
   ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  });
  const sendButton=page.getByRole('button',{name:'Send',exact:true});
  assert.match(await page.getByRole('region',{name:'AI destination and context'}).innerText(),/Active AI: Gemini/);
  assert.equal(await page.locator('details').getAttribute('open'),null);
  await sendButton.click();await page.waitForFunction(()=>window.lastResult?.ok);
  assert.equal(requests.length,1);assert.ok(!requests[0].body.includes('SYNTHETIC_PRIVATE'));assert.ok(!requests[0].url.includes('synthetic-key'));
  const summary=page.locator('summary');await summary.focus();await page.keyboard.press('Enter');
  await page.getByLabel('Include up to 4 recent messages (500 characters each)').check();await page.getByLabel('Excerpt to include with the next reply (optional)').fill('SYNTHETIC_PRIVATE_EXCERPT');
  await page.evaluate(()=>{localStorage.setItem('alloflow_ai_config',JSON.stringify({backend:'gemini',serperApiKey:'synthetic-serper'}));window.dispatchEvent(new Event('alloflow:ai-config-changed'));});
  await page.getByLabel('Public research topic',{exact:true}).selectOption('cell structure');await page.getByRole('button',{name:'Replace message with public query'}).click();
  assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'Search for cell structure');
  assert.match(await page.getByRole('region',{name:'AI destination and context'}).innerText(),/your question \+ selected context/);
  await page.screenshot({path:path.join(out,'destination-'+width+'.png'),fullPage:true});
  const researchStart=requests.length;await page.evaluate(()=>window.lastResult=null);await sendButton.click();await page.waitForFunction(()=>window.lastResult?.ok);
  const research=requests.slice(researchStart), serper=research.filter(r=>r.url.includes('serper.dev'));
  assert.equal(serper.length,1);assert.equal(JSON.parse(serper[0].body).q,'cell structure');assert.ok(!JSON.stringify(serper).includes('SYNTHETIC_PRIVATE'));
  const ai=research.find(r=>r.url.includes('googleapis'));assert.match(ai.body,/SYNTHETIC_PRIVATE_EXCERPT/);assert.match(ai.body,/SYNTHETIC_PRIVATE_HISTORY/);assert.ok(!JSON.parse(ai.body).tools);
  const reply=await page.evaluate(()=>window.chatResults.at(-1));assert.match(reply.text,/\[1\]\(https:\/\/udlguidelines.cast.org\/\)/);assert.equal(reply.evidence.sources[0].url,'https://udlguidelines.cast.org/');
  assert.equal(await page.getByLabel('Excerpt to include with the next reply (optional)').inputValue(),'');assert.equal(await page.getByLabel('Include up to 4 recent messages (500 characters each)').isChecked(),false);
  // Native Google grounding uses a separate public lookup before contextual reply.
  await page.evaluate(()=>{localStorage.setItem('alloflow_ai_config',JSON.stringify({backend:'gemini'}));window.AlloFlowChatPrivacy.set({excerpt:'SYNTHETIC_PRIVATE_NATIVE_EXCERPT'});});
  const nativeStart=requests.length;assert.equal((await page.evaluate(()=>window.send('Check UDL for SYNTHETIC_PRIVATE_NATIVE_QUESTION'))).ok,true);
  const native=requests.slice(nativeStart);assert.equal(native.length,2);assert.ok(JSON.parse(native[0].body).tools);assert.ok(!native[0].body.includes('SYNTHETIC_PRIVATE'));assert.ok(!JSON.parse(native[1].body).tools);assert.match(native[1].body,/SYNTHETIC_PRIVATE_NATIVE_EXCERPT/);assert.match(native[1].body,/SYNTHETIC_PRIVATE_NATIVE_QUESTION/);
  await page.evaluate(()=>localStorage.setItem('alloflow_ai_config',JSON.stringify({backend:'gemini',serperApiKey:'synthetic-serper'})));
  // Failed ordinary reply and user retry: consumed excerpt is never reattached.
  await page.getByLabel('Excerpt to include with the next reply (optional)').fill('SYNTHETIC_PRIVATE_RETRY_EXCERPT');failNextAI=true;
  assert.equal((await page.evaluate(()=>window.send('SYNTHETIC_CURRENT_QUESTION'))).ok,false);
  assert.match(requests.at(-1).body,/SYNTHETIC_PRIVATE_RETRY_EXCERPT/);
  assert.equal((await page.evaluate(()=>window.send(window.chatResults.at(-1).retryText))).ok,true);
  assert.match(requests.at(-1).body,/SYNTHETIC_CURRENT_QUESTION/);assert.ok(!requests.at(-1).body.includes('SYNTHETIC_PRIVATE_RETRY_EXCERPT'));
  // Real Phase K verification -> Gemini Canvas wrapper -> search -> HTTP.
  const canvasStart=requests.length;
  const verified=await page.evaluate(async()=>window.AlloModules.PhaseKHelpers.performDeepVerification('SYNTHETIC_PRIVATE_SOURCE',{chunkText:text=>[text],setGenerationStep:()=>{},callGemini:window.makeApi(true).callGemini,sourceTopic:'photosynthesis',applyGlobalCitations:text=>text,warnLog:()=>{}}));
  const canvas=requests.slice(canvasStart);assert.equal(canvas.length,2);assert.equal(JSON.parse(canvas[0].body).q,'photosynthesis');assert.ok(!JSON.stringify(canvas[0]).includes('SYNTHETIC_PRIVATE'));assert.match(canvas[1].body,/SYNTHETIC_PRIVATE_SOURCE/);assert.equal(verified.sources.length,1);
  const blockedStart=requests.length;
  const blocked=await page.evaluate(async()=>window.AlloModules.PhaseKHelpers.performDeepVerification('SYNTHETIC_PRIVATE_SOURCE',{chunkText:text=>[text],setGenerationStep:()=>{},callGemini:window.makeApi(true).callGemini,sourceTopic:'SYNTHETIC_PRIVATE_NAME student record',applyGlobalCitations:text=>text,warnLog:()=>{}}));
  assert.equal(requests.length,blockedStart);assert.equal(blocked.sources.length,0);assert.equal(blocked.text,'');
  // Managed profile rejects before fetch, then permits only the configured origin.
  await page.evaluate(()=>{window.ALLOFLOW_MANAGED_AI_POLICY={version:1,allowExternalSearch:false,connections:[{backend:'custom',baseUrl:'https://district.test/v1',keyless:true}]};});
  assert.equal((await page.evaluate(()=>window.send('SYNTHETIC_PRIVATE_BLOCKED'))).ok,false);assert.equal(requests.length,blockedStart);
  await page.evaluate(async()=>{const ai=new window.AIProvider({backend:'custom',baseUrl:'https://district.test/v1'});await ai.generateText('SYNTHETIC_APPROVED_ENDPOINT');});
  assert.equal(requests.length,blockedStart+1);assert.ok(requests.at(-1).url.startsWith('https://district.test/'));
  // Active local/custom backend research stays on the public Serper query path.
  const customStart=requests.length;
  await page.evaluate(async()=>{
   localStorage.setItem('alloflow_ai_config',JSON.stringify({backend:'custom',baseUrl:'https://district.test/v1',serperApiKey:'synthetic-serper',allobotWebSearch:true}));
   window.ALLOFLOW_MANAGED_AI_POLICY.allowExternalSearch=true;
   window.__alloActiveAIBackend={backend:'custom',baseUrl:'https://district.test/v1'};
   const provider=new window.AIProvider({backend:'custom',baseUrl:'https://district.test/v1'});
   const bridge=prompt=>provider.generateText(prompt);bridge._alloflowBackend='custom';window.callGemini=bridge;
   window.AlloFlowChatPrivacy.set({excerpt:'SYNTHETIC_PRIVATE_CUSTOM_CONTEXT'});
   await window.send('Search for cell structure');
  });
  const custom=requests.slice(customStart);assert.equal(custom.length,2);assert.equal(JSON.parse(custom[0].body).q,'cell structure');assert.ok(!custom[0].body.includes('SYNTHETIC_PRIVATE'));assert.ok(custom[1].url.startsWith('https://district.test/'));assert.match(custom[1].body,/SYNTHETIC_PRIVATE_CUSTOM_CONTEXT/);
  await page.evaluate(()=>{window.__alloActiveAIBackend={backend:'custom',baseUrl:'https://private:secret@district.test/v1?student=SYNTHETIC_PRIVATE_URL'};const fn=()=>{};fn._alloflowBackend='custom';window.callGemini=fn;window.dispatchEvent(new Event('alloflow:ai-config-changed'));});
  await page.waitForFunction(()=>document.querySelector('section').textContent.includes('Custom AI'));const destinationText=await page.locator('section').innerText();assert.match(destinationText,/https:\/\/district.test/);assert.ok(!destinationText.includes('SYNTHETIC_PRIVATE_URL'));assert.ok(!destinationText.includes('secret'));
  await page.evaluate(()=>{window.callGemini=window.api.callGemini;window.dispatchEvent(new Event('alloflow:ai-config-changed'));});await page.waitForFunction(()=>document.querySelector('section').textContent.includes('Active AI: Gemini'));
  await page.getByRole('button',{name:'Clear live conversation'}).click();assert.equal(await page.evaluate(()=>window.testMessages.length),0);assert.equal(await page.evaluate(()=>window.savedHistory.length),1);
  assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage}))).includes('SYNTHETIC_PRIVATE'));
  const unknown=requests.filter(r=>!['google.serper.dev','generativelanguage.googleapis.com','district.test'].includes(new URL(r.url).hostname));assert.deepEqual(unknown,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.addScriptTag({content:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
  results.push({width,ordinaryChatNoAmbientContext:true,selectedContextOnlyToAI:true,serperPublicQueryOnly:true,linkedEvidence:true,nativeGroundingPublicLookupOnly:true,customBackendResearchBoundary:true,contextResetAfterFailureAndRetry:true,canvasVerificationBoundary:true,unsafeCanvasQueryNoNetwork:true,managedRejectionNoNetwork:true,approvedEndpointOnly:true,destinationRefresh:true,clearLiveOnly:true,noContextStorage:true,requestCount:requests.length,unexpectedRequests:0,overflow:false,axeViolations:0,pageErrors:errors});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
