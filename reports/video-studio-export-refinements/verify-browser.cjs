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

 const file={name:'Prepared source.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)};
 await page.locator('#importInput').setInputFiles(file);
 await page.waitForFunction(()=>document.querySelectorAll('#takesList .take').length===1&&!document.querySelector('#panelEdit').hidden);
 await page.locator('#importCapInput').setInputFiles({name:'captions.vtt',mimeType:'text/vtt',buffer:Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nOriginal caption\n\n00:00:01.100 --> 00:00:09.000\nCaption crossing the end\n')});
 await page.waitForFunction(()=>document.querySelector('#cueCount').textContent.includes('2 caption'));
 await page.locator('#tabExport').click();await page.locator('#exportPreset').selectOption('small');await page.locator('#closingCardChk').uncheck();await page.locator('#demoStepTransition').selectOption('none');await page.locator('#titleInput').fill('درس العلوم');
 await page.locator('#exportBtn').click();await page.locator('#resultCard').waitFor({state:'visible',timeout:30000});
 const videoEvent=page.waitForEvent('download');await page.locator('#downloadBtn').click();const video=await videoEvent;assert.match(video.suggestedFilename(),/^درس_العلوم/);await video.saveAs('reports/video-studio-export-refinements/export.webm');
 const vttEvent=page.waitForEvent('download');await page.locator('#downloadVttBtn').click();const vttFile=await vttEvent;await vttFile.saveAs('reports/video-studio-export-refinements/captions.vtt');
 const vtt=fs.readFileSync('reports/video-studio-export-refinements/captions.vtt','utf8');assert.match(vtt,/Caption crossing the end/);assert.equal(vtt.includes('00:00:09.000'),false);
 await page.locator('#importInput').setInputFiles({...file,name:'Different take.webm'});await page.waitForFunction(()=>document.querySelectorAll('#takesList .take').length===2&&document.querySelector('#studioSelection').textContent.includes('Different take'));
 await page.locator('#tabExport').click();assert.match(await page.locator('#preparedFileSummary').textContent(),/درس العلوم/);assert.match(await page.locator('#preparedFileHint').textContent(),/another take/);
 const transcriptEvent=page.waitForEvent('download');await page.locator('#downloadTranscriptResultBtn').click();const transcript=await transcriptEvent;await transcript.saveAs('reports/video-studio-export-refinements/transcript.txt');assert.match(fs.readFileSync('reports/video-studio-export-refinements/transcript.txt','utf8'),/Original caption/);
 await page.locator('#preparedFileSummary').scrollIntoViewIfNeeded();await page.screenshot({path:'reports/video-studio-export-refinements/prepared-file.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);fs.writeFileSync('reports/video-studio-export-refinements/browser-results.json',JSON.stringify({passed:true,checks:['caption bounds in downloaded VTT','Unicode video filename','prepared-file identity','transcript after switching takes','mobile overflow','no page errors']},null,2));console.log('Export refinement browser checks passed');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
