const fs=require('fs'); const assert=require('node:assert/strict'); const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1360,height:960}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://studio.test/')?route.fulfill({contentType:'text/html',body:fs.readFileSync('video_studio/video_studio.html','utf8')}):route.abort());
 await page.goto('http://studio.test/');
 await page.waitForFunction(()=>document.querySelector('#studioNextBtn')&&document.querySelector('#pipCorner').hidden);
 assert.equal(await page.locator('#recoverBanner').isVisible(),false); assert.equal(await page.locator('#recordingRecoverBanner').isVisible(),false);
 await page.screenshot({path:'reports/video-studio-audio-reliability-2026-09-08/export/start-desktop.png',fullPage:false});
 assert.equal(await page.locator('#pipCorner').isVisible(),false);
 await page.locator('#srcPip').click(); assert.equal(await page.locator('#pipCorner').isVisible(),true);
 await page.locator('#srcScreen').click();
 assert.equal(await page.evaluate(()=>document.querySelector('#startBtn').compareDocumentPosition(document.querySelector('#demoAutopilotCard')) & Node.DOCUMENT_POSITION_FOLLOWING),4);
 await page.locator('#tabEdit').click(); assert.equal(await page.locator('#studioEmptyEdit').isVisible(),true);
 assert.equal(await page.locator('#trimStart').isVisible(),false);
 await page.locator('#tabExport').click(); assert.equal(await page.locator('#studioEmptyExport').isVisible(),true);
 await page.locator('#importInput').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not a video')});
 assert.equal(await page.locator('#studioImportFeedback').isVisible(),true);assert.match(await page.locator('#studioImportFeedback').textContent(),/doesn.t look like a video/);
 await page.locator('#studioNextBtn').click(); await page.waitForFunction(()=>document.activeElement.id==='srcScreen');
 // Generate a real, synthetic WebM without accessing a microphone, camera, or screen.
 const bytes=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
  const ctx=canvas.getContext('2d'); let frame=0; const draw=()=>{ctx.fillStyle='#164e63';ctx.fillRect(0,0,640,360);ctx.fillStyle='#e0f2fe';ctx.font='32px sans-serif';ctx.fillText('A short teaching video',60,160);ctx.fillStyle='#67e8f9';ctx.fillRect(60,210,++frame%500,12);};draw();
  const stream=canvas.captureStream(12), recorder=new MediaRecorder(stream,{mimeType:'video/webm'}), chunks=[];
  recorder.ondataavailable=e=>chunks.push(e.data);
  const done=new Promise(resolve=>recorder.onstop=()=>resolve()); const timer=setInterval(draw,80);
  recorder.start();await new Promise(r=>setTimeout(r,2200));recorder.stop();await done;clearInterval(timer);stream.getTracks().forEach(t=>t.stop());
  return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));
 });
 const file={name:'Lesson one.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)};
 await page.locator('#importInput').setInputFiles(file);
 await page.waitForFunction(()=>!document.querySelector('#panelEdit').hidden&&document.querySelector('#editVideo').duration>0);
 await page.locator('#editorFocusMode').selectOption('basics');
 assert.equal(await page.locator('#mediaCreditTitle').isVisible(),false); assert.equal(await page.locator('#sceneList').isVisible(),false);
 await page.locator('#trimStart').fill('0.4'); await page.locator('#trimEnd').fill('0.3');
 assert.match(await page.locator('#trimStatus').textContent(),/remaining/);
 await page.locator('#importInput').setInputFiles({...file,name:'Lesson two.webm'});
 await page.waitForFunction(()=>document.querySelectorAll('#takesList .take').length===2);
 await page.getByRole('button',{name:/Select.*Lesson one/}).click();
 assert.equal(await page.locator('#trimStart').inputValue(),'0.4'); assert.equal(await page.locator('#trimEnd').inputValue(),'0.3');
 await page.locator('#trimStart').fill('999');
 await page.waitForFunction(()=>document.querySelector('#editVideo').duration>0);
 const trim=await page.evaluate(()=>({s:Number(document.querySelector('#trimStart').value),e:Number(document.querySelector('#trimEnd').value),d:document.querySelector('#editVideo').duration}));
 assert.ok(trim.s+trim.e<trim.d);
 await page.locator('#trimResetBtn').click(); assert.equal(await page.locator('#trimStart').inputValue(),'0');
 await page.evaluate(()=>document.querySelector('#editVideo').currentTime=0.5); await page.locator('#trimAtStartBtn').click();
 assert.equal(await page.locator('#trimStart').inputValue(),'0.5');
 await page.locator('#trimStart').fill(''); await page.locator('#trimStart').pressSequentially('0.5');
 assert.equal(await page.locator('#trimStart').inputValue(),'0.5');
 await page.locator('#trimEnd').fill('0.2');
 await page.waitForFunction(()=>new Promise(resolve=>{const request=indexedDB.open('allo_video_studio');request.onsuccess=()=>{const db=request.result;const q=db.transaction('takes').objectStore('takes').getAll();q.onsuccess=()=>{resolve(q.result.some(t=>/Lesson one/.test(t.name)&&t.trim&&t.trim.start===0.5&&t.trim.end===0.2));db.close();};};}));
 await page.locator('#tabRecord').click(); await page.locator('#studioMoreWorkflows summary').click(); await page.locator('#flowNarrate').click();
 assert.equal(await page.locator('#editorFocusMode').inputValue(),'narrate');
 assert.equal(await page.locator('#aiNarrateBtn').isVisible(),true);
 await page.locator('#tabRecord').click(); await page.locator('#flowDescribe').click();
 assert.equal(await page.locator('#editorFocusMode').inputValue(),'describe'); assert.equal(await page.locator('#visualDescribeBtn').isVisible(),true);
 await page.locator('#editorFocusMode').selectOption('basics');
 await page.locator('#trimStart').scrollIntoViewIfNeeded();
 await page.screenshot({path:'reports/video-studio-audio-reliability-2026-09-08/export/editor-desktop.png'});
 await page.reload(); await page.locator('#recoverBtn').click();
 await page.getByRole('button',{name:/Select.*Lesson one/}).click();
 assert.equal(await page.locator('#trimStart').inputValue(),'0.5'); assert.equal(await page.locator('#trimEnd').inputValue(),'0.2');
 await page.locator('#trimResetBtn').click();
 await page.locator('#studioNextBtn').click(); await page.waitForFunction(()=>!document.querySelector('#panelExport').hidden);
 await page.locator('#exportPreset').selectOption('small'); await page.locator('#closingCardChk').uncheck(); await page.locator('#demoStepTransition').selectOption('none');
 await page.locator('#exportBtn').click(); await page.locator('#resultCard').waitFor({state:'visible',timeout:30000});
 const downloaded=page.waitForEvent('download'); await page.locator('#downloadBtn').click(); const download=await downloaded;
 assert.match(download.suggestedFilename(),/\.(webm|mp4)$/);
 await download.saveAs('reports/video-studio-audio-reliability-2026-09-08/export/export-fixture.webm');
 await page.setViewportSize({width:390,height:844});await page.locator('#tabEdit').click();
 const overflowing=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 assert.equal(overflowing,false,'Editor must fit the mobile viewport');
 await page.locator('#studioStepTitle').scrollIntoViewIfNeeded();
 await page.screenshot({path:'reports/video-studio-audio-reliability-2026-09-08/export/editor-mobile.png'});
 await page.locator('#trimStart').scrollIntoViewIfNeeded();await page.screenshot({path:'reports/video-studio-audio-reliability-2026-09-08/export/trim-mobile.png'});
 assert.deepEqual(errors,[]);
 fs.writeFileSync('reports/video-studio-audio-reliability-2026-09-08/export/browser-results.json',JSON.stringify({passed:true,checks:['hidden recovery banners','specialist workflow disclosure','decimal trim typing','empty states','source-dependent camera controls','recording before advanced tools','real WebM import','per-take trims','bounded trim input','trim at playhead and reset','draft recovery after reload','narration and visual workflow visibility','prepare and download actual video','mobile overflow','no page errors'],errors},null,2));
 console.log('Video Studio browser checks passed');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});



