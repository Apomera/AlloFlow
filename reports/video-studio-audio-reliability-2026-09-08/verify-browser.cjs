const fs=require('node:fs'),assert=require('node:assert/strict');const {chromium}=require('playwright');const out='reports/video-studio-audio-reliability-2026-09-08';
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1360,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://studio.test/')?route.fulfill({contentType:'text/html',body:fs.readFileSync('video_studio/video_studio.html','utf8')}):route.abort());await page.goto('http://studio.test/');
 const bytes=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');const draw=()=>{ctx.fillStyle='#164e63';ctx.fillRect(0,0,640,360);ctx.fillStyle='#fff';ctx.font='30px sans-serif';ctx.fillText('Narration practice video',70,160);};draw();const s=c.captureStream(10),r=new MediaRecorder(s,{mimeType:'video/webm'}),chunks=[];r.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>r.onstop=resolve),timer=setInterval(draw,90);r.start();await new Promise(resolve=>setTimeout(resolve,8000));r.stop();await done;clearInterval(timer);s.getTracks().forEach(t=>t.stop());return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));});
 await page.locator('#importInput').setInputFiles(['First','Second'].map(name=>({name:name+' lesson.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)})));
 await page.waitForFunction(()=>document.querySelectorAll('#takesList .take').length===2);
 await page.getByRole('button',{name:/Select.*First lesson/}).click();await page.locator('#editorFocusMode').selectOption('all');
 await page.evaluate(()=>{
  window.previewPlayers=[];window.rejectNextPreview=false;
  window.Audio=class extends EventTarget {constructor(src){super();this.src=src;this.duration=20;this.currentTime=0;this.paused=true;this.volume=1;this.playbackRate=1;this.muted=false;this.preservesPitch=true;window.previewPlayers.push(this);}play(){if(window.rejectNextPreview){window.rejectNextPreview=false;return Promise.reject(new Error('fixture playback rejection'));}this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
  window.fixtureStreams=[];window.fixtureRecorders=[];
  const nativeRecorder=window.MediaRecorder;window.MediaRecorder=class extends nativeRecorder{constructor(...args){super(...args);window.fixtureRecorders.push(this);}};
  const makeStream=()=>{const ac=new AudioContext(),osc=ac.createOscillator(),dest=ac.createMediaStreamDestination();osc.frequency.value=220;osc.connect(dest);osc.start();ac.resume();const stream=dest.stream;stream.getTracks()[0].addEventListener('ended',()=>ac.close());window.fixtureStreams.push(stream);return stream;};
  window.fixtureMicMode='normal';
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>window.fixtureMicMode==='denied'?Promise.reject(new DOMException('Denied','NotAllowedError')):window.fixtureMicMode==='delayed'?new Promise(resolve=>window.releaseMicrophone=()=>resolve(makeStream())):Promise.resolve(makeStream())}});
 });
 await page.locator('#clipFileInput').setInputFiles({name:'Narration sound.wav',mimeType:'audio/wav',buffer:Buffer.alloc(256)});
 await page.locator('#musicFileInput').setInputFiles({name:'Background music.wav',mimeType:'audio/wav',buffer:Buffer.alloc(256)});
 await page.locator('#previewSpeed').selectOption('2');
 await page.locator('#editVideo').evaluate(v=>{v.currentTime=0;return v.play();});
 await page.waitForFunction(()=>window.previewPlayers.filter(a=>!a.paused).length===2);
 assert.equal(await page.evaluate(()=>window.previewPlayers.filter(a=>!a.paused).every(a=>a.playbackRate===2)),true);
 await page.locator('#previewSpeed').selectOption('0.5');
 assert.equal(await page.evaluate(()=>window.previewPlayers.filter(a=>!a.paused).every(a=>a.playbackRate===0.5)),true);
 await page.locator('#editVideo').evaluate(v=>{v.muted=true;v.dispatchEvent(new Event('timeupdate'));});
 assert.equal(await page.locator('#editVideo').evaluate(v=>v.muted),true);
 assert.equal(await page.evaluate(()=>window.previewPlayers.filter(a=>!a.paused).every(a=>a.muted)),true);
 await page.locator('#editVideo').evaluate(v=>{v.muted=false;v.dispatchEvent(new Event('waiting'));});
 assert.equal(await page.evaluate(()=>window.previewPlayers.every(a=>a.paused)),true);
 await page.locator('#editVideo').evaluate(v=>v.dispatchEvent(new Event('playing')));await page.waitForFunction(()=>window.previewPlayers.filter(a=>!a.paused).length===2);
 await page.locator('#editVideo').evaluate(v=>{v.pause();v.currentTime=1;});
 await page.waitForFunction(()=>!document.querySelector('#editVideo').seeking);
 assert.equal(await page.evaluate(()=>window.previewPlayers.every(a=>a.paused)),true);
 await page.locator('#removeAudioChk').check();
 await page.locator('#editVideo').evaluate(v=>{v.dispatchEvent(new Event('timeupdate'));return v.play();});
 await page.waitForFunction(()=>window.previewPlayers.filter(a=>!a.paused).length===2);
 assert.equal(await page.locator('#editVideo').evaluate(v=>v.volume),0);
 assert.equal(await page.evaluate(()=>window.previewPlayers.filter(a=>!a.paused).every(a=>!a.muted)),true,'Removing source audio keeps added tracks audible');
 // A rejected play promise is visible and retriable, without repeated attempts or page errors.
 await page.locator('#editVideo').evaluate(v=>v.pause());await page.waitForFunction(()=>window.previewPlayers.every(a=>a.paused));
 await page.evaluate(()=>window.rejectNextPreview=true);await page.locator('#editVideo').evaluate(v=>v.play());
 await page.locator('#previewAudioFeedback').waitFor({state:'visible'});await page.locator('#previewAudioRetryBtn').click();
 await page.waitForFunction(()=>window.previewPlayers.filter(a=>!a.paused).length===2);assert.equal(await page.locator('#previewAudioFeedback').isVisible(),false);
 await page.locator('#editVideo').evaluate(v=>v.pause());await page.locator('#previewSpeed').selectOption('2');
 await page.getByRole('button',{name:'Preview clip 1',exact:true}).click();
 await page.waitForFunction(()=>window.previewPlayers.some(a=>!a.paused));
 await page.getByRole('button',{name:'Stop preview clip 1',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.previewPlayers.every(a=>a.paused)),true);
 await page.getByRole('button',{name:'Preview clip 1',exact:true}).click();
 // Real MediaRecorder uses an oscillator stream, never a real microphone.
 await page.locator('#narrateBtn').click();await page.waitForFunction(()=>window.fixtureRecorders.at(-1)?.state==='recording');
 assert.equal(await page.locator('#editVideo').evaluate(v=>v.playbackRate),1);assert.equal(await page.locator('#editVideo').evaluate(v=>v.muted),true);assert.equal(await page.locator('#previewSpeed').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.previewPlayers.every(a=>a.paused)),true);
 await page.waitForFunction(()=>document.querySelector('#editVideo').currentTime>0.4);
 await page.locator('#narrateBtn').click();await page.waitForFunction(()=>document.querySelector('#narrationStatus').textContent.startsWith('Narration saved'));
 assert.equal(await page.locator('#previewSpeed').inputValue(),'2');assert.equal(await page.locator('#previewSpeed').isEnabled(),true);
 assert.equal(await page.locator('#editVideo').evaluate(v=>v.muted),false);
 assert.equal(await page.evaluate(()=>window.fixtureStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
 const readNarration=()=>page.evaluate(()=>new Promise(resolve=>{const req=indexedDB.open('allo_video_studio');req.onsuccess=()=>{const db=req.result;const q=db.transaction('takes').objectStore('takes').getAll();q.onsuccess=async()=>{const t=q.result.find(t=>/First lesson/.test(t.name));resolve(t?.narration?Array.from(new Uint8Array(await t.narration.blob.arrayBuffer())):null);db.close();};};}));
 const saved=await readNarration();assert.ok(saved?.length>200);
 await page.locator('#narrateBtn').click();await page.waitForFunction(()=>window.fixtureRecorders.at(-1)?.state==='recording');
 await page.locator('#narrCancelBtn').click();await page.waitForFunction(()=>document.querySelector('#narrationStatus').textContent.startsWith('Narration canceled'));
 assert.deepEqual(await readNarration(),saved);
 // Pause ends the recording cleanly and restores the previous playback controls.
 await page.locator('#narrateBtn').click();await page.waitForFunction(()=>window.fixtureRecorders.at(-1)?.state==='recording');
 await page.waitForFunction(()=>document.querySelector('#editVideo').currentTime>0.4);await page.locator('#editVideo').evaluate(v=>v.pause());
 await page.waitForFunction(()=>document.querySelector('#narrateBtn').textContent.includes('Record narration over'));assert.equal(await page.locator('#editVideo').evaluate(v=>v.controls),true);
 // Switching takes saves to the original take and releases its microphone.
 await page.locator('#narrateBtn').click();await page.waitForFunction(()=>window.fixtureRecorders.at(-1)?.state==='recording');
 await page.waitForFunction(()=>document.querySelector('#editVideo').currentTime>0.4);await page.getByRole('button',{name:/Select.*Second lesson/}).click();
 await page.waitForFunction(()=>window.fixtureStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
 assert.match(await page.locator('#narrInfo').textContent(),/No narration yet/);assert.equal(await page.locator('#previewSpeed').isEnabled(),true);
 // Permission denial and cancellation both leave the controls usable.
 await page.evaluate(()=>window.fixtureMicMode='denied');await page.locator('#narrateBtn').click();await page.waitForFunction(()=>document.querySelector('#narrationStatus').textContent.includes('Microphone unavailable'));
 await page.evaluate(()=>window.fixtureMicMode='delayed');await page.locator('#narrateBtn').click();await page.waitForFunction(()=>typeof window.releaseMicrophone==='function');await page.locator('#narrateBtn').click();await page.evaluate(()=>window.releaseMicrophone());
 await page.waitForFunction(()=>window.fixtureStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));assert.match(await page.locator('#narrationStatus').textContent(),/request canceled/);
 await page.setViewportSize({width:390,height:844});await page.locator('#narrationStatus').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+'/narration-mobile.png'});
 await page.reload();await page.locator('#recoverBtn').click();await page.getByRole('button',{name:/Select.*First lesson/}).click();assert.match(await page.locator('#narrInfo').textContent(),/Narration recorded/);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({passed:true,checks:['added audio follows preview speed','whole-preview mute survives source gain updates','buffering and seeking pause added audio','source removal retains added audio','rejected playback retries without page errors','normal-speed silent narration','stop saves actual recorded audio','cancel preserves previous narration','pause and take switching finalize safely','microphone denial and late permission cancellation','microphone tracks released','mobile controls fit','narration survives draft recovery'],errors},null,2));console.log('Audio preview and narration browser checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

