const fs=require('fs'); const assert=require('node:assert/strict'); const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1360,height:960}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://studio.test/')?route.fulfill({contentType:'text/html',body:fs.readFileSync('video_studio/video_studio.html','utf8')}):route.abort());
 await page.goto('http://studio.test/');
 await page.waitForFunction(()=>document.querySelector('#studioNextBtn')&&document.querySelector('#pipCorner').hidden);
 assert.equal(await page.locator('#recoverBanner').isVisible(),false); assert.equal(await page.locator('#recordingRecoverBanner').isVisible(),false);
 await page.screenshot({path:'reports/video-studio-export-refinements/start-desktop.png',fullPage:false});
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


 const file={name:'Caption lesson.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)};
 await page.locator('#importInput').setInputFiles(file);
 await page.waitForFunction(()=>!document.querySelector('#panelEdit').hidden);
 await page.locator('#editorFocusMode').selectOption('caption');
 await page.locator('#importCapInput').setInputFiles({name:'captions.vtt',mimeType:'text/vtt',buffer:Buffer.from('WEBVTT\n\n00:00:00.100 --> 00:00:01.000\nFirst caption\n')});
 const row=page.locator('#cueBody tr').first();
 const text=row.locator('textarea');await text.fill('First line\nSecond line');await text.blur();
 assert.equal(await text.inputValue(),'First line\nSecond line');
 const start=row.getByRole('spinbutton',{name:'start for caption 1'});
 await start.fill('1.5');await start.blur();assert.equal(await start.getAttribute('aria-invalid'),'true');assert.match(await row.textContent(),/not been saved/);
 await start.fill('0.3');await start.blur();assert.equal(await start.getAttribute('aria-invalid'),'false');
 const end=row.getByRole('spinbutton',{name:'end for caption 1'});await end.fill('0.2');await end.blur();assert.equal(await end.getAttribute('aria-invalid'),'true');
 await end.fill('0.9');await end.blur();assert.equal(await end.getAttribute('aria-invalid'),'false');
 await row.getByRole('button',{name:'Go to caption 1'}).click();
 assert.ok(Math.abs(await page.locator('#editVideo').evaluate(v=>v.currentTime)-0.3)<0.05);
 await page.setViewportSize({width:390,height:844});await row.scrollIntoViewIfNeeded();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.ok(await text.evaluate(e=>e.getBoundingClientRect().width>200));
 await page.screenshot({path:'reports/video-studio-caption-editor/mobile.png'});
 assert.deepEqual(errors,[]);console.log('Caption editor browser checks passed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

