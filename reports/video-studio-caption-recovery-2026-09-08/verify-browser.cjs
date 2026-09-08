const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const out='reports/video-studio-caption-recovery-2026-09-08';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:960}}),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.dismiss();});
  await page.route('**/*',route=>route.request().url().startsWith('http://studio.test/')?route.fulfill({contentType:'text/html',body:fs.readFileSync('video_studio/video_studio.html','utf8')}):route.abort());
  await page.goto('http://studio.test/');
  const bytes=fs.readFileSync('reports/video-studio-usability-2026-09-08/regression/export-fixture.webm');
  await page.locator('#importInput').setInputFiles([{name:'First lesson.webm',mimeType:'video/webm',buffer:bytes},{name:'Second lesson.webm',mimeType:'video/webm',buffer:bytes}]);
  await page.waitForFunction(()=>document.querySelectorAll('#takesList .take').length===2);
  const undo=page.locator('#captionUndoBtn'),redo=page.locator('#captionRedoBtn');
  const text=()=>page.getByRole('textbox',{name:'text for caption 1',exact:true});
  const count=()=>page.locator('#cueBody tr').count();
  const captionFile=(name,content)=>({name,mimeType:'text/vtt',buffer:Buffer.from('WEBVTT\n\n00:00:00.100 --> 00:00:01.500\n'+content+'\n')});
  const importCaption=async(name,content)=>page.locator('#importCapInput').setInputFiles(captionFile(name,content));
  const selectFirst=()=>page.getByRole('button',{name:/Select.*First lesson/}).click();
  const selectSecond=()=>page.getByRole('button',{name:/Select.*Second lesson/}).click();
  await selectFirst();await page.locator('#editorFocusMode').selectOption('basics');
  assert.equal(await undo.isDisabled(),true);
  await importCaption('original.vtt','Original caption');
  await text().waitFor();assert.equal(await text().inputValue(),'Original caption');
  await undo.click();assert.equal(await count(),0);await redo.click();assert.equal(await text().inputValue(),'Original caption');
  await text().fill('Edited caption\nSecond line');await text().blur();
  await page.locator('#trimStart').fill('0.2');
  await undo.click();assert.equal(await text().inputValue(),'Original caption');assert.equal(await page.locator('#trimStart').inputValue(),'0.2');
  await redo.click();assert.equal(await text().inputValue(),'Edited caption\nSecond line');
  const start=page.getByRole('spinbutton',{name:'start for caption 1',exact:true});
  await start.fill('0.3');await start.blur();await undo.click();assert.equal(await start.inputValue(),'0.1');await redo.click();assert.equal(await start.inputValue(),'0.3');
  await page.getByRole('button',{name:'Delete caption 1',exact:true}).click();assert.equal(await count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'captionUndoBtn');
  await undo.click();assert.equal(await text().inputValue(),'Edited caption\nSecond line');
  // A new edit after undo discards only the redo branch, not other take state.
  await text().fill('Branch caption');await text().blur();assert.equal(await redo.isDisabled(),true);
  await selectSecond();assert.equal(await undo.isDisabled(),true);assert.equal(await count(),0);
  await importCaption('second.vtt','Second take caption');await text().waitFor();
  await selectFirst();assert.equal(await text().inputValue(),'Branch caption');await undo.click();assert.equal(await text().inputValue(),'Edited caption\nSecond line');await redo.click();
  // Replacements and merges require an explicit choice; Cancel must make no edits.
  await importCaption('replacement.vtt','Replacement caption');await page.locator('#captionImportReview').waitFor({state:'visible'});
  assert.equal(await text().inputValue(),'Branch caption');
  await page.locator('#captionImportCancelBtn').click();assert.equal(await text().inputValue(),'Branch caption');assert.equal(await count(),1);
  await importCaption('replacement.vtt','Replacement caption');await page.locator('#captionImportReplaceBtn').click();assert.equal(await text().inputValue(),'Replacement caption');
  await undo.click();assert.equal(await text().inputValue(),'Branch caption');await redo.click();assert.equal(await text().inputValue(),'Replacement caption');
  await importCaption('added.vtt','Additional caption');await page.locator('#captionImportAddBtn').click();assert.equal(await count(),2);
  await undo.click();assert.equal(await count(),1);await redo.click();assert.equal(await count(),2);
  await importCaption('escape.vtt','Do not import');await page.locator('#captionImportCancelBtn').focus();await page.keyboard.press('Escape');assert.equal(await count(),2);assert.equal(await page.locator('#captionImportReview').isVisible(),false);
  await page.locator('#importCapInput').setInputFiles({name:'empty.vtt',mimeType:'text/vtt',buffer:Buffer.from('not captions')});
  await page.waitForFunction(()=>document.querySelector('#captionImportStatus').textContent.startsWith('No captions found'));assert.equal(await count(),2);
  // Simulate file-read rejection and a delayed file without real user data.
  await page.evaluate(()=>{const read=File.prototype.text;File.prototype.text=function(){if(this.name==='unreadable.vtt')return Promise.reject(new Error('fixture read failure'));if(this.name==='delayed.vtt')return new Promise(resolve=>window.releaseCaptionRead=resolve);return read.call(this);};});
  await importCaption('unreadable.vtt','Unused');await page.waitForFunction(()=>document.querySelector('#captionImportStatus').textContent.startsWith('Could not read'));assert.equal(await count(),2);
  await importCaption('delayed.vtt','Unused');await page.waitForFunction(()=>typeof window.releaseCaptionRead==='function');
  await selectSecond();await page.evaluate(()=>window.releaseCaptionRead('WEBVTT\n\n00:00:00.100 --> 00:00:01.000\nStale caption\n'));
  assert.equal(await text().inputValue(),'Second take caption');assert.equal(await page.locator('#captionImportReview').isVisible(),false);
  assert.match(await page.locator('#captionImportStatus').textContent(),/canceled because the selected take changed/);
  await selectFirst();assert.equal(await count(),2);
  // Invalid timing is excluded from history and the saved caption.
  await start.fill('-1');await start.blur();assert.equal(await start.getAttribute('aria-invalid'),'true');
  await undo.click();assert.equal(await count(),1);assert.equal(await text().inputValue(),'Replacement caption');
  // Caption preview reserves the bottom 64 px of the video, including letterboxed stages.
  await page.locator('#editVideo').evaluate(v=>{v.currentTime=0.5;});await page.locator('#editCapPreview').waitFor({state:'visible'});
  const clearControls=async()=>page.evaluate(()=>{const host=document.querySelector('#editCapPreview'),video=document.querySelector('#editVideo');return video.getBoundingClientRect().bottom-host.getBoundingClientRect().bottom>=63;});
  assert.equal(await clearControls(),true);
  await page.locator('#editVideo').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/preview-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('#editVideo').scrollIntoViewIfNeeded();assert.equal(await clearControls(),true);
  await page.screenshot({path:out+'/preview-mobile.png'});
  await importCaption('review.vtt','A reviewed import');await page.locator('#captionImportReview').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:out+'/import-mobile.png'});
  await page.locator('#captionImportCancelBtn').click();
  // Current captions persist; undo history is intentionally session-only.
  await page.waitForFunction(()=>new Promise(resolve=>{const req=indexedDB.open('allo_video_studio');req.onsuccess=()=>{const db=req.result;const q=db.transaction('takes').objectStore('takes').getAll();q.onsuccess=()=>{resolve(q.result.some(t=>/First lesson/.test(t.name)&&t.captions.length===1&&t.captions[0].text==='Replacement caption'));db.close();};};}));
  await page.reload();await page.locator('#recoverBtn').click();await selectFirst();assert.equal(await text().inputValue(),'Replacement caption');assert.equal(await undo.isDisabled(),true);
  for(let i=0;i<32;i++){await text().fill('History '+i);await text().blur();}
  for(let i=0;i<30;i++)await undo.click();
  assert.equal(await undo.isDisabled(),true);assert.equal(await text().inputValue(),'History 1');
  for(let i=0;i<30;i++)await redo.click();
  assert.equal(await redo.isDisabled(),true);assert.equal(await text().inputValue(),'History 31');
  assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
  fs.writeFileSync(out+'/results.json',JSON.stringify({passed:true,checks:['caption text/timing/import/delete undo and redo','redo branches','per-take history isolation','unrelated trim retained','delete focus recovery','replace/add/cancel import choices','Escape cancellation','invalid and unreadable files','stale import after take switch','invalid timings excluded from history','desktop and mobile preview control clearance','mobile import review fits','current captions survive reload','history starts fresh after reload','no page errors or browser dialogs'],errors,dialogs},null,2));
  console.log('Caption recovery and preview browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

