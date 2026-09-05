'use strict';
// Local narration adapter. Document semantics, synthesis orchestration, MP3
// encoding, and EPUB overlays are shared with the app. Only durable IO is here.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Planner = require('./remediation_narration_plan.cjs');
const EpubValidation = require('./remediation_epub_validation.cjs');
const { zipFileMap } = require('./zip_writer.cjs');
const ASSETS = ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js',
  'doc_pipeline_module.js', 'view_pdf_audit_module.js', 'audio_helpers_module.js',
  'karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js',
  'document_narration_text_module.js', 'read_aloud_artifact_audio_module.js', 'kokoro_tts_loader.js', 'piper_tts_loader.js'];
const DEPENDENCIES = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const IMPLEMENTATION_HASH = hash(fs.readFileSync(__filename));
const PLAN_HASH = hash(fs.readFileSync(require.resolve('./remediation_narration_plan.cjs')));
function atomic(file, bytes) {
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  try { fs.writeFileSync(tmp, bytes, {mode: 0o600}); fs.renameSync(tmp, file); }
  finally { try { fs.unlinkSync(tmp); } catch (_) {} }
}
function wavInfo(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WAVE') throw Error('Invalid narration WAV');
  let fmt, start, length;
  for (let p=12;p+8<=bytes.length;) {
    const size=bytes.readUInt32LE(p+4), end=p+8+size;
    if(end>bytes.length) throw Error('Truncated narration WAV');
    const tag=bytes.toString('ascii',p,p+4);
    if(tag==='fmt ' && size>=16) fmt=Buffer.from(bytes.subarray(p+8,end));
    if(tag==='data') {start=p+8; length=size;}
    p=end+(size%2);
  }
  if(!fmt || !length || fmt.readUInt16LE(0)!==1 || fmt.readUInt16LE(2)!==1 || fmt.readUInt16LE(14)!==16 || !fmt.readUInt32LE(8)) throw Error('Unsupported or empty narration WAV');
  return {fmt,start,length,duration:length/fmt.readUInt32LE(8)};
}
function mergeWavs(files, target) {
  // Stream PCM from disk: an entire textbook must not require all audio in RAM.
  const infos=files.map(file=>{const bytes=fs.readFileSync(file);return wavInfo(bytes);});
  const first=infos[0]; if(!first) throw Error('No audio to merge');
  if(infos.some(i=>!i.fmt.equals(first.fmt))) throw Error('Narration WAV formats differ');
  const total=infos.reduce((n,i)=>n+i.length,0);
  if(total>0xffffffff-36) throw Error('Narration exceeds WAV size limit; split the document');
  const header=Buffer.alloc(44); header.write('RIFF');header.writeUInt32LE(total+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);first.fmt.copy(header,20,0,16);header.write('data',36);header.writeUInt32LE(total,40);
  const fd=fs.openSync(target,'wx',0o600);
  try {fs.writeSync(fd,header); for(let k=0;k<files.length;k++) {const bytes=fs.readFileSync(files[k]);fs.writeSync(fd,bytes.subarray(infos[k].start,infos[k].start+infos[k].length));} fs.fsyncSync(fd);}
  finally {fs.closeSync(fd);}
  return infos.reduce((n,i)=>n+i.duration,0);
}

// Completed packages survive restarts. Reuse requires the same source, options,
// implementation and output directory, plus every artifact's current file hash.
function hashFile(file) {
  const fd=fs.openSync(file,'r'),digest=crypto.createHash('sha256'),buffer=Buffer.alloc(1024*1024);
  try{let size;while((size=fs.readSync(fd,buffer,0,buffer.length,null))>0)digest.update(buffer.subarray(0,size));return digest.digest('hex');}finally{fs.closeSync(fd);}
}
function completionFingerprint(o, sourceHash, runtimeHash) {
  return hash(JSON.stringify({sourceHash,runtimeHash,implementationHash:IMPLEMENTATION_HASH,planHash:PLAN_HASH,epubValidationHash:o.epub!==false?EpubValidation.fingerprint():null,
    sourceCoverage:o.sourceCoverage||null,sourcePath:path.resolve(o.filePath),outputDir:path.resolve(o.outputDir),mode:o.mode||'accessible',
    language:Planner.normalizeLanguage(o.language),provider:o.provider||'auto',voice:o.voice||'auto',epub:o.epub!==false}));
}
function loadCompletion(file, fingerprint, outputDir, epub) {
  try {
    if(fs.statSync(file).size>16*1024*1024)return null;
    const record=JSON.parse(fs.readFileSync(file,'utf8'));
    if(record.version!==1||record.fingerprint!==fingerprint||record.result?.status!=='completed')return null;
    const required=['audioWav','audioMp3','narratedHtml','narrationReport',...(epub?['readalongEpub']:[])];
    const validatorRoles=['epubcheckReport','epubAccessibilityReport'];
    for(const [index,role] of validatorRoles.entries())if(epub){
      const check=record.result.epubValidation?.checks?.[index===0?'epubcheck':'ace'];
      if(check&&['passed','failed','review-required'].includes(check.status)&&!record.result.files[role])return null;
      if(record.result.files[role])required.push(role);
    }
    if(JSON.stringify(Object.keys(record.result.files).sort())!==JSON.stringify(required.sort())||record.artifacts.length!==required.length)return null;
    const root=fs.realpathSync(outputDir),roles=new Set();
    for(const artifact of record.artifacts){
      if(roles.has(artifact.role)||!required.includes(artifact.role)||artifact.path!==record.result.files[artifact.role])return null;
      roles.add(artifact.role);
      if(path.dirname(path.resolve(artifact.path))!==path.resolve(outputDir)||path.dirname(fs.realpathSync(artifact.path))!==root||fs.lstatSync(artifact.path).isSymbolicLink())return null;
      const stat=fs.statSync(artifact.path);if(!stat.isFile()||stat.size!==artifact.sizeBytes||hashFile(artifact.path)!==artifact.sha256)return null;
    }
    return {...record.result,reused:true};
  }catch(_){return null;}
}
function saveCompletion(file, fingerprint, result) {
  const artifacts=Object.entries(result.files).map(([role,artifactPath])=>({role,path:artifactPath,sizeBytes:fs.statSync(artifactPath).size,sha256:hashFile(artifactPath)}));
  fs.mkdirSync(path.dirname(file),{recursive:true});atomic(file,JSON.stringify({version:1,fingerprint,result,artifacts}));
}

function clipCachePath(stateDir,runtimeHash,mode,segment,route) {
  const namespace=hash(JSON.stringify({runtimeHash,implementationHash:IMPLEMENTATION_HASH,mode,sampleRate:24000,speed:1,version:4}));
  return path.join(stateDir,'narration-cache','clips-v1',namespace,hash(JSON.stringify({text:segment.text,provider:route.provider,language:route.language,voice:route.voice})));
}
function readClipCache(stem) {
  try{
    const m=JSON.parse(fs.readFileSync(stem+'.json','utf8')),wav=fs.readFileSync(stem+'.wav'),mp3=fs.readFileSync(stem+'.mp3');
    if(m.wav!==hash(wav)||m.mp3!==hash(mp3)||mp3.length<32)return null;
    const info=wavInfo(wav);return info.fmt.readUInt32LE(4)===24000?info:null;
  }catch(_){return null;}
}
function narrationRuntimeHash(assetsRoot){return hash(ASSETS.map(f=>hash(fs.readFileSync(path.join(assetsRoot,f)))).join(':'));}

// Planning uses only bundled scripts, with all network requests blocked.
async function preflight(o) {
  if(hash(fs.readFileSync(__filename))!==IMPLEMENTATION_HASH || hash(fs.readFileSync(require.resolve('./remediation_narration_plan.cjs')))!==PLAN_HASH)throw Error('Narration adapter changed; restart the MCP server');
  if(o.signal?.aborted)throw Error('Narration cancelled');
  const res=o.resolveChromium();if(!res.installed)throw Error('Chromium is not installed; run remediation_setup');
  const browser=await res.chromium.launch({headless:true});
  const rows=[];const abort=()=>browser.close().catch(()=>{});o.signal?.addEventListener('abort',abort,{once:true});
  try {
    const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',route=>route.abort());
    const page=await context.newPage();await page.goto('about:blank');
    for(const file of ['accessibility_evidence_module.js','verification_policy_module.js','doc_builder_renderer_module.js','doc_pipeline_module.js','document_narration_text_module.js'])await page.addScriptTag({path:path.join(o.assetsRoot,file)});
    const catalog=Planner.voiceCatalog(o.assetsRoot),voices=Planner.kokoroVoiceIds(o.assetsRoot),runtimeHash=o.stateDir?narrationRuntimeHash(o.assetsRoot):null;
    for(const file of o.filePaths) {
      if(o.signal?.aborted)throw Error('Narration cancelled');
      try {
        const bytes=fs.readFileSync(file);const sourceSha256=hash(bytes);
        const plan=await page.evaluate(Planner.planDocument,{html:bytes.toString('utf8'),mode:o.mode||'accessible',language:Planner.normalizeLanguage(o.language),labels:Planner.LABELS});
        if(plan.contentCoverage.status==='blocked'){rows.push({file,ready:false,sourceSha256,contentCoverage:plan.contentCoverage,error:'Narration coverage is incomplete: '+plan.contentCoverage.missingUnits+' text units omitted; '+plan.contentCoverage.unresolvedVisuals+' visuals need spoken descriptions. Check contentCoverage.issues.',modelsTested:false});continue;}
        const routing=Planner.routePlan(plan,o,catalog,voices);
        const cachedSections=o.stateDir?plan.segments.filter((segment,index)=>readClipCache(clipCachePath(o.stateDir,runtimeHash,o.mode||'accessible',segment,routing.routes[index]))).length:null;
        rows.push({file,ready:true,sourceSha256,contentCoverage:plan.contentCoverage,cachedSections,sectionsToSynthesize:cachedSections===null?null:plan.segments.length-cachedSections,language:plan.lang,languages:plan.languages,sections:plan.segments.length,characters:routing.characters,voices:routing.voices,estimatedSpokenMinutes:routing.estimatedSpokenMinutes,warnings:plan.warnings,modelsTested:false,downloadsMayBeRequired:true,...(o.includePlan?{plan,routing}:{})});
      }catch(error){if(o.signal?.aborted)throw Error('Narration cancelled');rows.push({file,ready:false,error:error.message||String(error),modelsTested:false});}
    }
    return {epubVerification:EpubValidation.capabilities(),files:rows,total:rows.length,ready:rows.filter(row=>row.ready).length,blocked:rows.filter(row=>!row.ready).length,note:'Local planning only: no model downloads, synthesis or accessibility certification. Language selection relies on document metadata, not automatic language detection. Processing time is not estimated.'};
  }finally{o.signal?.removeEventListener('abort',abort);await browser.close();}
}
// Runs in Chromium. Web Audio resamples each provider's PCM to a common rate.
async function normalizeClip(base64) {
  const input=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const context=new OfflineAudioContext(1,1,24000);
  const decoded=await context.decodeAudioData(input.buffer);
  if(decoded.numberOfChannels!==1||!decoded.length)throw Error('Expected nonempty mono narration');
  const samples=decoded.getChannelData(0),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);
  for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(i*2,Math.round(value*(value<0?32768:32767)),true);}
  const wav=window.AlloModules.AudioHelpers.pcmToWav(bytes,24000);
  const u=new Uint8Array(wav);let binary='';for(let i=0;i<u.length;i+=8192)binary+=String.fromCharCode(...u.subarray(i,i+8192));
  return btoa(binary);
}

async function narrate(o) {
  if(hash(fs.readFileSync(__filename))!==IMPLEMENTATION_HASH || hash(fs.readFileSync(require.resolve('./remediation_narration_plan.cjs')))!==PLAN_HASH)throw Error('Narration adapter changed; restart the MCP server');
  const log=o.onLog || (()=>{}); const mode=o.mode || 'accessible';
  if(!['accessible','natural'].includes(mode)) throw Error('Narration mode must be accessible or natural');
  if(o.signal?.aborted)throw Error('Narration cancelled');
  const source=fs.readFileSync(o.filePath,'utf8'),sourceHash=hash(source);
  const runtimeHash=narrationRuntimeHash(o.assetsRoot);
  const fingerprint=o.outputDir?completionFingerprint(o,sourceHash,runtimeHash):null;
  const completionFile=fingerprint?path.join(o.stateDir,'narration-completions',fingerprint+'.json'):null;
  const prior=completionFile&&loadCompletion(completionFile,fingerprint,o.outputDir,o.epub!==false);
  if(prior){if(o.signal?.aborted)throw Error('Narration cancelled');if(hashFile(o.filePath)!==sourceHash)throw Error('Source changed while checking saved narration; retry');log('narration: reused hash-verified completed outputs');o.onProgress?.({total:prior.totalSections,completed:prior.completedSections,mode,reused:true});return prior;}
  const checked=await preflight({...o,filePaths:[o.filePath],includePlan:true});
  if(!checked.files[0].ready)throw Error(checked.files[0].error);
  const {plan,routing}=checked.files[0];
  if(sourceHash!==checked.files[0].sourceSha256)throw Error('Source changed during narration preflight; retry');
  const res=o.resolveChromium();
  if(!res.installed) throw Error('Chromium is not installed; run remediation_setup');
  const profile=path.join(o.stateDir,'kokoro-browser'); fs.mkdirSync(profile,{recursive:true});
  const context=await res.chromium.launchPersistentContext(profile,{headless:true,serviceWorkers:'block',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const abort=()=>{context.close().catch(()=>{});};
  o.signal?.addEventListener('abort',abort,{once:true});
  const wallTimer=setTimeout(abort,Math.min(180,Math.max(1,Number(o.maxRunMinutes)||180))*60000);wallTimer.unref?.();
  try {
    if(o.signal?.aborted) throw Error('Narration cancelled');
    const boot='http://127.0.0.1/__alloflow_narration__';
    // Only dependency GETs can leave this browser. Source HTML is parsed inertly,
    // never navigated to, and cannot introduce a remote request or script.
    await context.route('**/*',route=>{
      const request=route.request();const url=new URL(request.url());
      if(url.href===boot) return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head></head><body></body></html>'});
      const allowed=['cdn.jsdelivr.net','unpkg.com','huggingface.co','hf.co','cdn-lfs.huggingface.co','cdn-lfs-us-1.hf.co','cas-bridge.xethub.hf.co'];
      if(request.method()==='GET' && url.protocol==='https:' && (allowed.includes(url.hostname) || (url.hostname==='cdnjs.cloudflare.com' && url.pathname.startsWith('/ajax/libs/onnxruntime-web/')))) return route.continue();
      log('narration: blocked dependency origin '+url.origin);
      return route.abort();
    });
    const page=await context.newPage();
    page.on('requestfailed',request=>{let origin;try{origin=new URL(request.url()).origin;}catch(_){origin='dependency';}log('narration: dependency request failed at '+origin+': '+(request.failure()?.errorText||'unknown'));});
    await page.goto(boot);
    for(const url of DEPENDENCIES) await page.addScriptTag({url});
    for(const asset of ASSETS) await page.addScriptTag({path:path.join(o.assetsRoot,asset)});
    await page.evaluate(fn=>{window.normalizeNarrationClip=(0,eval)('('+fn+')');},normalizeClip.toString());
    const selected=routing.voices;const providers=[...new Set(selected.map(v=>v.provider))];
    const provider=providers.length===1?providers[0]:'mixed-local';const voice=selected.length===1?selected[0].voice:'multiple';
    for(const warning of plan.warnings)log('narration: '+warning);
    const completed=[];const durations=[];const mp3s=[];const coverage=[];let elapsedSeconds=0;
    log('narration: '+plan.segments.length+' sections; '+mode+' narration using '+voice);
    for(let i=0;i<plan.segments.length;i++) {
      if(o.signal?.aborted)throw Error('Narration cancelled');
      const seg=plan.segments[i];const route=routing.routes[i];const stem=clipCachePath(o.stateDir,runtimeHash,mode,seg,route);fs.mkdirSync(path.dirname(stem),{recursive:true});const wav=stem+'.wav', mp3=stem+'.mp3',meta=stem+'.json';
      let info=readClipCache(stem);const reused=!!info;
      if(!reused) {
        let last;
        for(let attempt=0;attempt<3;attempt++) {
          try {
            const clip=await page.evaluate(async ({seg,voice,provider,language})=>{
              const K=provider==='piper'?window._piperTTS:window._kokoroTTS;
              const ready=provider==='piper'?await K.init(language):await K.init();
              if(provider==='piper'&&!ready)throw Error(K.lastError||'Piper model initialization failed');
              const A=window.AlloModules;
              const service=A.createReadAloudArtifactAudio({callTTS:(text,v,s,options)=>K.speak(text,provider==='piper'?language:v,s,options)});
              const prepared=await service.prepare({ownerApproved:true,segments:[{...seg,voice,language,speed:1}],provider:provider+'-browser',defaultVoice:voice,maxRetries:0});
              const entry=prepared.audioBySegmentId[seg.segmentId];
              if(!entry||prepared.failed)throw Error((K.lastError||provider)+' did not produce the complete section');
              const normalized=await window.normalizeNarrationClip(entry.base64);
              const raw=new Blob([Uint8Array.from(atob(normalized),c=>c.charCodeAt(0))],{type:'audio/wav'});
              const mp3=await A.DocumentNarrationExports.epubAudio(raw);if(!mp3)throw Error('MP3 encoding failed');
              const bytes=new Uint8Array(await mp3.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
              return {wav:normalized,mp3:btoa(binary)};
            },{seg,voice:route.voice,provider:route.provider,language:route.language});
            const w=Buffer.from(clip.wav,'base64'),m=Buffer.from(clip.mp3,'base64');info=wavInfo(w);
            if(m.length<32)throw Error('Empty MP3 narration');
            atomic(wav,w);atomic(mp3,m);atomic(meta,JSON.stringify({wav:hash(w),mp3:hash(m)}));last=null;break;
          }catch(error){last=error;if(o.signal?.aborted)throw error;log('narration: retrying section '+(i+1)+' ('+(attempt+1)+'/3)');}
        }
        if(last)throw Error('Narration incomplete at section '+(i+1)+'/'+plan.segments.length+'. Completed sections are saved; resume to retry. '+last.message);
      }
      completed.push(wav);mp3s.push(mp3);durations.push(info.duration);coverage.push({segmentId:seg.segmentId,targetId:seg.id,startSeconds:elapsedSeconds,language:route.language,provider:route.provider,voice:route.voice,durationSeconds:info.duration,reused});elapsedSeconds+=info.duration;
      o.onProgress?.({total:plan.segments.length,completed:completed.length,mode,language:route.language,provider:route.provider});
      log('narration: '+completed.length+'/'+plan.segments.length+(reused?' (reused)':''));
    }
    if(hash(fs.readFileSync(o.filePath,'utf8'))!==sourceHash)throw Error('Source changed during narration; restart using the current document');
    // Claim collision-safe output names only after every section is complete.
    const title=path.basename(o.filePath).replace(/\.html?$/i,'');
    const wavOut=o.claimPath(title+'-'+mode+'-audio.wav');
    // claimPath reserves a placeholder, whereas mergeWavs requires an exclusive create.
    const temp=wavOut+'.'+crypto.randomUUID()+'.tmp';
    const duration=mergeWavs(completed,temp);fs.renameSync(temp,wavOut);
    const mp3Out=o.claimPath(title+'-'+mode+'-audio.mp3');
    const fd=fs.openSync(mp3Out,'w',0o600);try{for(const f of mp3s)fs.writeSync(fd,fs.readFileSync(f));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    const htmlOut=o.claimPath(title+'-'+mode+'-readalong.html');
    const player=await page.evaluate(({html,audio,mode,labels})=>{const doc=new DOMParser().parseFromString(html,'text/html');const section=doc.createElement('section');const label=doc.createElement('p');label.textContent=(mode==='accessible'?(labels?.playerAccessible||'Accessible narration'):(labels?.playerNatural||'Natural narration'))+' — '+(labels?.complete||'complete document');section.setAttribute('aria-label',label.textContent);if(!labels)section.lang='en';const player=doc.createElement('audio');player.controls=true;player.preload='none';player.src=audio;player.setAttribute('aria-label',label.textContent);section.append(label,player);doc.body.prepend(section);const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; media-src 'self' file:; font-src data:";doc.head.prepend(csp);return '<!doctype html>\n'+doc.documentElement.outerHTML;},{html:plan.html,audio:encodeURIComponent(path.basename(mp3Out)),mode,labels:Planner.LABELS[plan.lang.split('-')[0]]});
    atomic(htmlOut,player);
    const files={audioWav:wavOut,audioMp3:mp3Out,narratedHtml:htmlOut};
    if(o.epub!==false) {
      const pkg=await page.evaluate(({plan,durations})=>{
        const A=window.AlloModules;const N=A.DocumentNarrationExports;
        const pkg=A.AltFormatExports.epub(plan.html,{title:plan.title});
        // The OPF declares this active class; EPUB readers require its stylesheet.
        pkg.files['OEBPS/content.xhtml']=pkg.files['OEBPS/content.xhtml'].replace('</head>', '<style type="text/css">.-epub-media-overlay-active{background-color:#ffea80;color:#111;}</style></head>');
        pkg.files['OEBPS/content.xhtml']=pkg.files['OEBPS/content.xhtml'].replace(/<body[^>]*>[\s\S]*<\/body>/,'<body>'+plan.bodyHtml+'</body>');
        const present=plan.segments.map(()=>true);
        pkg.files['OEBPS/content.smil']=N.smil(plan.segments,durations,'mp3',present);
        const props=[];if(/<svg\b/i.test(plan.bodyHtml))props.push('svg');if(/<math\b/i.test(plan.bodyHtml))props.push('mathml');
        pkg.files['OEBPS/content.opf']=N.opf(plan.title,plan.lang,plan.segments,durations.reduce((a,b)=>a+b,0),null,'mp3','audio/mpeg',present,props);
        const check={...pkg.files};for(let i=0;i<plan.segments.length;i++)check['OEBPS/audio/seg'+(i+1)+'.mp3']=true;
        const errors=A.AltFormatExports.validateEpub(check).issues.filter(x=>x.severity==='error');if(errors.length)throw Error('Read-along EPUB structural check failed: '+JSON.stringify(errors));
        return pkg.files;
      },{plan,durations});
      for(let i=0;i<mp3s.length;i++)pkg['OEBPS/audio/seg'+(i+1)+'.mp3']=fs.readFileSync(mp3s[i]);
      files.readalongEpub=o.claimPath(title+'-'+mode+'-readalong.epub');atomic(files.readalongEpub,zipFileMap(pkg,'mimetype'));
    }
    // Release synthesis models before starting another browser/JVM for verification.
    await context.close();
    const epubValidation=files.readalongEpub?await EpubValidation.validate(files.readalongEpub,{stateDir:o.stateDir,resolveChromium:o.resolveChromium,claimPath:o.claimPath,onLog:o.onLog,signal:o.signal}):undefined;
    if(epubValidation)Object.assign(files,epubValidation.files);
    const result={status:'completed',deliveryStatus:epubValidation?.status||'complete-for-tested-scope',reviewRequired:epubValidation?.reviewRequired||false,sourceCoverage:o.sourceCoverage||null,contentCoverage:plan.contentCoverage,reusedSections:coverage.filter(section=>section.reused).length,generatedSections:coverage.filter(section=>!section.reused).length,provider:provider==='mixed-local'?provider:provider+'-browser',mode,voice,language:plan.lang,languages:plan.languages,voices:selected,sampleRate:24000,coverage,warnings:plan.warnings,sourceSha256:sourceHash,totalSections:plan.segments.length,completedSections:completed.length,durationSeconds:duration,files,epubValidation};
    files.narrationReport=o.claimPath(title+'-'+mode+'-narration.json');
    result.artifacts=Object.entries(files).filter(([role])=>role!=='narrationReport').map(([role,file])=>({role,path:file,sizeBytes:fs.statSync(file).size,sha256:hashFile(file)}));
    atomic(files.narrationReport,JSON.stringify(result,null,2));if(completionFile)saveCompletion(completionFile,fingerprint,result);return result;
  } finally {clearTimeout(wallTimer);o.signal?.removeEventListener('abort',abort);await context.close();}
}
module.exports={narrate,preflight,clipCachePath,readClipCache,narrationRuntimeHash,completionFingerprint,loadCompletion,saveCompletion,normalizeClip,ASSETS,wavInfo,mergeWavs,voiceCatalog:Planner.voiceCatalog,normalizeLanguage:Planner.normalizeLanguage,accessibleLanguages:Object.keys(Planner.LABELS)};
