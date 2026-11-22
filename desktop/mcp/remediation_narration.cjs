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
const MAX_SOURCE_HTML_BYTES = 32 * 1024 * 1024;
const MAX_CLIP_META_BYTES = 16 * 1024;
const MAX_CLIP_AUDIO_BYTES = 64 * 1024 * 1024;
function writeAllSync(fd, buf) {
  const data = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let off = 0;
  while (off < data.length) {
    const n = fs.writeSync(fd, data, off, data.length - off);
    if (n <= 0) throw Error('Short write while writing narration output');
    off += n;
  }
}
function readRegularBounded(file, maxBytes) {
  const ls = fs.lstatSync(file);
  if (ls.isSymbolicLink() || !ls.isFile()) throw Error('Refusing non-regular or symlinked narration file');
  if (ls.size > maxBytes) throw Error('Narration file exceeds size limit');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.size > maxBytes) throw Error('Narration file exceeds size limit');
    const out = Buffer.alloc(st.size);
    let off = 0;
    while (off < st.size) {
      const n = fs.readSync(fd, out, off, st.size - off, off);
      if (n <= 0) break;
      off += n;
    }
    return off === st.size ? out : out.subarray(0, off);
  } finally { fs.closeSync(fd); }
}
function samePathDir(a, b) {
  const ra = path.resolve(a), rb = path.resolve(b);
  return process.platform === 'win32' ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
}
function atomic(file, bytes) {
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    const fd = fs.openSync(tmp, 'wx', 0o600);
    try { writeAllSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
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
  const sampleRate = fmt ? fmt.readUInt32LE(4) : 0;
  const byteRate = fmt ? fmt.readUInt32LE(8) : 0;
  if(!fmt || !length || (length % 2 !== 0) || fmt.readUInt16LE(0)!==1 || fmt.readUInt16LE(2)!==1 || fmt.readUInt16LE(14)!==16 || !sampleRate || byteRate !== sampleRate * 2) throw Error('Unsupported or empty narration WAV');
  return {fmt,start,length,duration:length/byteRate};
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
  try {writeAllSync(fd,header); for(let k=0;k<files.length;k++) {const bytes=fs.readFileSync(files[k]);writeAllSync(fd,bytes.subarray(infos[k].start,infos[k].start+infos[k].length));} fs.fsyncSync(fd);}
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
      if(!samePathDir(path.dirname(path.resolve(artifact.path)),path.resolve(outputDir))||!samePathDir(path.dirname(fs.realpathSync(artifact.path)),root)||fs.lstatSync(artifact.path).isSymbolicLink())return null;
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
    const m=JSON.parse(readRegularBounded(stem+'.json',MAX_CLIP_META_BYTES).toString('utf8')),wav=readRegularBounded(stem+'.wav',MAX_CLIP_AUDIO_BYTES),mp3=readRegularBounded(stem+'.mp3',MAX_CLIP_AUDIO_BYTES);
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
        const bytes=typeof o.readSource==='function'?o.readSource(file):readRegularBounded(file,MAX_SOURCE_HTML_BYTES);const sourceSha256=hash(bytes);
        const plan=await page.evaluate(Planner.planDocument,{html:bytes.toString('utf8'),mode:o.mode||'accessible',language:Planner.normalizeLanguage(o.language),labels:Planner.LABELS});
        if(plan.contentCoverage.status==='blocked'){rows.push({file,ready:false,sourceSha256,contentCoverage:plan.contentCoverage,error:'Narration coverage is incomplete: '+plan.contentCoverage.missingUnits+' text units omitted; '+plan.contentCoverage.unresolvedVisuals+' visuals need spoken descriptions. Check contentCoverage.issues.',modelsTested:false});continue;}
        const routing=Planner.routePlan(plan,o,catalog,voices);
        const cachedSections=o.stateDir?plan.segments.filter((segment,index)=>readClipCache(clipCachePath(o.stateDir,runtimeHash,o.mode||'accessible',segment,routing.routes[index]))).length:null;
        rows.push({file,ready:true,sourceSha256,contentCoverage:plan.contentCoverage,cachedSections,sectionsToSynthesize:cachedSections===null?null:plan.segments.length-cachedSections,language:plan.lang,languages:plan.languages,sections:plan.segments.length,characters:routing.characters,voices:routing.voices,estimatedSpokenMinutes:routing.estimatedSpokenMinutes,warnings:plan.warnings,modelsTested:false,downloadsMayBeRequired:true,...(o.includePlan?{plan,routing}:{})});
      }catch(error){if(o.signal?.aborted)throw Error('Narration cancelled');rows.push({file,ready:false,error:error.message||String(error),modelsTested:false});}
    }
    return {epubVerification:EpubValidation.capabilities(),files:rows,total:rows.length,ready:rows.filter(row=>row.ready).length,blocked:rows.filter(row=>!row.ready).length,note:'Local planning only: no model downloads, synthesis or accessibility certification. Language selection relies on document metadata, not automatic language detection. Processing time is not estimated.'};
  }finally{o.signal?.removeEventListener('abort',abort);await browser.close().catch(()=>{});}
}
// Runs in Chromium. Web Audio resamples each provider's PCM to a common rate.
async function normalizeClip(base64) {
  const input=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const context=new OfflineAudioContext(1,1,24000);
  const decoded=await context.decodeAudioData(input.buffer);
  if(decoded.numberOfChannels<1||!decoded.length)throw Error('Expected nonempty mono narration');
  const chCount=decoded.numberOfChannels,len=decoded.length;
  let samples;
  if(chCount===1){
    samples=decoded.getChannelData(0);
  }else{
    // Downmix multi-channel (e.g. stereo) TTS output cleanly to mono.
    samples=new Float32Array(len);
    for(let c=0;c<chCount;c++){
      const ch=decoded.getChannelData(c);
      for(let i=0;i<len;i++)samples[i]+=ch[i]/chCount;
    }
  }
  const bytes=new Uint8Array(len*2),view=new DataView(bytes.buffer);
  for(let i=0;i<len;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(i*2,Math.round(value*(value<0?32768:32767)),true);}
  const wav=window.AlloModules.AudioHelpers.pcmToWav(bytes,24000);
  const u=new Uint8Array(wav);let binary='';for(let i=0;i<u.length;i+=8192)binary+=String.fromCharCode(...u.subarray(i,i+8192));
  return btoa(binary);
}

async function narrate(o) {
  if(hash(fs.readFileSync(__filename))!==IMPLEMENTATION_HASH || hash(fs.readFileSync(require.resolve('./remediation_narration_plan.cjs')))!==PLAN_HASH)throw Error('Narration adapter changed; restart the MCP server');
  const log=o.onLog || (()=>{}); const mode=o.mode || 'accessible';
  if(!['accessible','natural'].includes(mode)) throw Error('Narration mode must be accessible or natural');
  if(o.signal?.aborted)throw Error('Narration cancelled');
  const sourceBytes=typeof o.readSource==='function'?o.readSource(o.filePath):readRegularBounded(o.filePath,MAX_SOURCE_HTML_BYTES),sourceHash=hash(sourceBytes);
  const runtimeHash=narrationRuntimeHash(o.assetsRoot);
  const fingerprint=o.outputDir?completionFingerprint(o,sourceHash,runtimeHash):null;
  const completionFile=fingerprint?path.join(o.stateDir,'narration-completions',fingerprint+'.json'):null;
  const prior=completionFile&&loadCompletion(completionFile,fingerprint,o.outputDir,o.epub!==false);
  if(prior){if(o.signal?.aborted)throw Error('Narration cancelled');const currentReuseBytes=typeof o.readSource==='function'?o.readSource(o.filePath):readRegularBounded(o.filePath,MAX_SOURCE_HTML_BYTES);if(hash(currentReuseBytes)!==sourceHash)throw Error('Source changed while checking saved narration; retry');log('narration: reused hash-verified completed outputs');o.onProgress?.({total:prior.totalSections,completed:prior.completedSections,mode,reused:true});return prior;}
  const checked=await preflight({...o,filePaths:[o.filePath],includePlan:true});
  if(!checked.files[0].ready)throw Error(checked.files[0].error);
  const {plan,routing}=checked.files[0];
  if(sourceHash!==checked.files[0].sourceSha256)throw Error('Source changed during narration preflight; retry');
  const res=o.resolveChromium();
  if(!res.installed) throw Error('Chromium is not installed; run remediation_setup');
  const needsSynthesis=plan.segments.some((seg,idx)=>!readClipCache(clipCachePath(o.stateDir,runtimeHash,mode,seg,routing.routes[idx])));
  let browser=null,context=null;
  if(needsSynthesis){
    const profile=path.join(o.stateDir,'kokoro-browser'); fs.mkdirSync(profile,{recursive:true});
    context=await res.chromium.launchPersistentContext(profile,{headless:true,serviceWorkers:'block',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  }else{
    // All clips already hit the verified local cache: skip persistent profile and remote CDN dependencies.
    browser=await res.chromium.launch({headless:true});
    context=await browser.newContext({serviceWorkers:'block'});
  }
  const wallController=typeof AbortController==='function'?new AbortController():null;
  const abort=()=>{try{wallController?.abort();}catch(_){}(browser?browser.close():context.close()).catch(()=>{});};
  o.signal?.addEventListener('abort',abort,{once:true});
  const wallTimer=setTimeout(abort,Math.min(180,Math.max(1,Number(o.maxRunMinutes)||180))*60000);wallTimer.unref?.();
  try {
    if(o.signal?.aborted) throw Error('Narration cancelled');
    const boot='http://127.0.0.1/__alloflow_narration__';
    // Only dependency GETs can leave this browser (and none at all when all clips are cached).
    // Source HTML is parsed inertly, never navigated to, and cannot introduce a remote request or script.
    await context.route('**/*',route=>{
      const request=route.request();
      let url;
      try{url=new URL(request.url());}catch(_){return route.abort();}
      if(url.href===boot) return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head></head><body></body></html>'});
      if(!needsSynthesis) return route.abort();
      const allowed=['cdn.jsdelivr.net','unpkg.com','huggingface.co','hf.co','cdn-lfs.huggingface.co','cdn-lfs-us-1.hf.co','cas-bridge.xethub.hf.co'];
      if(request.method()==='GET' && url.protocol==='https:' && (allowed.includes(url.hostname) || (url.hostname==='cdnjs.cloudflare.com' && url.pathname.startsWith('/ajax/libs/onnxruntime-web/')))) return route.continue();
      log('narration: blocked dependency origin '+url.origin);
      return route.abort();
    });
    const page=await context.newPage();
    page.on('requestfailed',request=>{let origin;try{origin=new URL(request.url()).origin;}catch(_){origin='dependency';}log('narration: dependency request failed at '+origin+': '+(request.failure()?.errorText||'unknown'));});
    await page.goto(boot);
    if(needsSynthesis){
      for(const url of DEPENDENCIES) await page.addScriptTag({url});
      for(const asset of ASSETS) await page.addScriptTag({path:path.join(o.assetsRoot,asset)});
      await page.evaluate(fn=>{window.normalizeNarrationClip=(0,eval)('('+fn+')');},normalizeClip.toString());
    }else if(o.epub!==false){
      for(const asset of ['accessibility_evidence_module.js','verification_policy_module.js','doc_builder_renderer_module.js','doc_pipeline_module.js','view_pdf_audit_module.js','document_narration_text_module.js']){
        await page.addScriptTag({path:path.join(o.assetsRoot,asset)});
      }
    }
    const selected=routing.voices;const providers=[...new Set(selected.map(v=>v.provider))];
    const provider=providers.length===1?providers[0]:'mixed-local';const voice=selected.length===1?selected[0].voice:'multiple';
    for(const warning of plan.warnings)log('narration: '+warning);
    const completed=[];const durations=[];const mp3s=[];const coverage=[];let elapsedSeconds=0;
    log('narration: '+plan.segments.length+' sections; '+mode+' narration using '+voice);
    for(let i=0;i<plan.segments.length;i++) {
      if(o.signal?.aborted)throw Error('Narration cancelled');
      if(wallController?.signal?.aborted)throw Error('Narration timed out');
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
          }catch(error){last=error;if(o.signal?.aborted)throw error;if(wallController?.signal?.aborted)throw Error('Narration timed out');log('narration: retrying section '+(i+1)+' ('+(attempt+1)+'/3)');}
        }
        if(last)throw Error('Narration incomplete at section '+(i+1)+'/'+plan.segments.length+'. Completed sections are saved; resume to retry. '+last.message);
      }
      completed.push(wav);mp3s.push(mp3);durations.push(info.duration);coverage.push({segmentId:seg.segmentId,targetId:seg.id,startSeconds:elapsedSeconds,language:route.language,provider:route.provider,voice:route.voice,durationSeconds:info.duration,reused});elapsedSeconds+=info.duration;
      o.onProgress?.({total:plan.segments.length,completed:completed.length,mode,language:route.language,provider:route.provider});
      log('narration: '+completed.length+'/'+plan.segments.length+(reused?' (reused)':''));
    }
    const currentSourceBytes=typeof o.readSource==='function'?o.readSource(o.filePath):readRegularBounded(o.filePath,MAX_SOURCE_HTML_BYTES);
    if(hash(currentSourceBytes)!==sourceHash)throw Error('Source changed during narration; restart using the current document');
    // Claim collision-safe output names only after every section is complete.
    const title=path.basename(o.filePath).replace(/\.html?$/i,'');
    const wavOut=o.claimPath(title+'-'+mode+'-audio.wav');
    // claimPath reserves a placeholder, whereas mergeWavs requires an exclusive create.
    const temp=wavOut+'.'+crypto.randomUUID()+'.tmp';
    let duration;
    try{duration=mergeWavs(completed,temp);fs.renameSync(temp,wavOut);}catch(err){try{fs.unlinkSync(temp);}catch(_){}throw err;}
    const mp3Out=o.claimPath(title+'-'+mode+'-audio.mp3');
    const mp3Temp=mp3Out+'.'+crypto.randomUUID()+'.tmp';
    try{const fd=fs.openSync(mp3Temp,'wx',0o600);try{for(const f of mp3s)writeAllSync(fd,fs.readFileSync(f));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(mp3Temp,mp3Out);}catch(err){try{fs.unlinkSync(mp3Temp);}catch(_){}throw err;}
    const htmlOut=o.claimPath(title+'-'+mode+'-readalong.html');
    await page.route('**/*',r=>(/^(?:about|blob|data):/i.test(r.request().url())?r.continue():r.abort()));
    const langKey=String(plan.lang||'').split('-')[0];
    const safeLabels=Object.prototype.hasOwnProperty.call(Planner.LABELS,langKey)?Planner.LABELS[langKey]:undefined;
    const player=await page.evaluate(({html,audio,mode,labels})=>{
      const doc=new DOMParser().parseFromString(html,'text/html');
      doc.querySelectorAll('script,iframe,object,embed,base,template,meta[http-equiv="refresh" i]').forEach(el=>el.remove());
      doc.querySelectorAll('*').forEach(el=>{
        for(const attr of Array.from(el.attributes)){
          const n=attr.name.toLowerCase();
          const norm=String(attr.value||'').replace(/[\u0000-\u0020]+/g,'');
          if(n.startsWith('on')||n==='srcdoc'){el.removeAttribute(attr.name);continue;}
          if((n==='href'||n==='src'||n==='xlink:href'||n==='formaction'||n==='action')&&(/^(?:javascript|vbscript|file):/i.test(norm)||/^data:(?!image\/(?:png|jpeg|jpg|gif|webp|avif);)/i.test(norm)))el.removeAttribute(attr.name);
        }
      });
      const section=doc.createElement('section');const label=doc.createElement('p');label.textContent=(mode==='accessible'?(labels?.playerAccessible||'Accessible narration'):(labels?.playerNatural||'Natural narration'))+' — '+(labels?.complete||'complete document');section.setAttribute('aria-label',label.textContent);if(!labels)section.lang='en';const player=doc.createElement('audio');player.controls=true;player.preload='none';player.src=audio;player.setAttribute('aria-label',label.textContent);section.append(label,player);doc.body.prepend(section);const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; img-src data:; style-src 'unsafe-inline'; media-src 'self'; font-src data:";doc.head.prepend(csp);return '<!doctype html>\n'+doc.documentElement.outerHTML;
    },{html:plan.html,audio:encodeURIComponent(path.basename(mp3Out)),mode,labels:safeLabels});
    atomic(htmlOut,player);
    const files={audioWav:wavOut,audioMp3:mp3Out,narratedHtml:htmlOut};
    if(o.epub!==false) {
      const pkg=await page.evaluate(({plan,durations})=>{
        const A=window.AlloModules;const N=A.DocumentNarrationExports;
        const pkg=A.AltFormatExports.epub(plan.html,{title:plan.title,externalizeImages:false});
        const moCss='<style type="text/css">.-epub-media-overlay-active{background-color:#ffea80;color:#111;}</style>';
        // The OPF declares this active class; EPUB readers require its stylesheet.
        if(/<\/head>/i.test(pkg.files['OEBPS/content.xhtml'])){
          pkg.files['OEBPS/content.xhtml']=pkg.files['OEBPS/content.xhtml'].replace(/<\/head>/i, () => moCss+'</head>');
        }else if(/<head\s*\/>/i.test(pkg.files['OEBPS/content.xhtml'])){
          pkg.files['OEBPS/content.xhtml']=pkg.files['OEBPS/content.xhtml'].replace(/<head\s*\/>/i, () => '<head>'+moCss+'</head>');
        }
        // Clean plan.bodyHtml for XHTML/EPUB3 while preserving every narration segment id,
        // then sync nav.xhtml links against the exact heading ids present in content.xhtml.
        const bodyDoc=new DOMParser().parseFromString('<!doctype html><html><body>'+plan.bodyHtml+'</body></html>','text/html');
        bodyDoc.querySelectorAll('script,iframe,object,embed,base,template,meta[http-equiv="refresh" i],annotation,annotation-xml,button,select,input,textarea').forEach(el=>el.remove());
        bodyDoc.querySelectorAll('*').forEach(el=>{
          for(const attr of Array.from(el.attributes)){
            const n=attr.name.toLowerCase();
            const norm=String(attr.value||'').replace(/[\u0000-\u0020]+/g,'');
            if(n.startsWith('on')||n==='srcdoc'){el.removeAttribute(attr.name);continue;}
            if((n==='href'||n==='src'||n==='xlink:href'||n==='formaction'||n==='action')&&(/^(?:javascript|vbscript|file):/i.test(norm)||/^data:(?!image\/(?:png|jpeg|jpg|gif|webp|avif);)/i.test(norm)))el.removeAttribute(attr.name);
          }
        });
        bodyDoc.querySelectorAll('svg').forEach(svg=>{
          if((!svg.namespaceURI||svg.namespaceURI==='http://www.w3.org/1999/xhtml')&&!svg.getAttribute('xmlns'))svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
        });
        const usedIds=new Set(Array.from(bodyDoc.querySelectorAll('[id]')).map(el=>el.getAttribute('id')).filter(Boolean));
        let secSeq=0;
        bodyDoc.querySelectorAll('h1,h2,h3').forEach(h=>{
          if(!h.getAttribute('id')){let cand;do{cand='sec-'+(++secSeq);}while(usedIds.has(cand));h.setAttribute('id',cand);usedIds.add(cand);}
        });
        const cleanBody=Array.from(bodyDoc.body.childNodes).map(n=>new XMLSerializer().serializeToString(n)).join('').replace(/\sxmlns="([^"]+)"(?=[^<>]*\sxmlns="\1")/g,'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'');
        pkg.files['OEBPS/content.xhtml']=pkg.files['OEBPS/content.xhtml'].replace(/<body([^>]*)>[\s\S]*<\/body>/i, (_m, attrs) => '<body'+(attrs||'')+'>'+cleanBody+'</body>');
        const escXml=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
        const heads=Array.from(bodyDoc.querySelectorAll('h1[id],h2[id],h3[id]'));
        const navItems=heads.length?heads.map(h=>'<li><a href="content.xhtml#'+escXml(h.getAttribute('id'))+'">'+(escXml((h.textContent||'').replace(/\s+/g,' ').trim())||'Section')+'</a></li>').join('\n'):'<li><a href="content.xhtml">Document</a></li>';
        const isRtl=/\bdir\s*=\s*['"]?rtl\b/i.test(plan.html)||/^(?:ar|fa|he|iw|ps|sd|ug|ur|yi)(?:-|$)/i.test(String(plan.lang||''));
        pkg.files['OEBPS/nav.xhtml']='<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="'+escXml(plan.lang)+'" xml:lang="'+escXml(plan.lang)+'"'+(isRtl?' dir="rtl"':'')+'>\n<head><title lang="en" dir="ltr">Navigation</title></head>\n<body><nav epub:type="toc" role="doc-toc"><h1 lang="en" dir="ltr">Table of Contents</h1><ol>'+navItems+'</ol></nav></body>\n</html>';
        const present=plan.segments.map(()=>true);
        pkg.files['OEBPS/content.smil']=N.smil(plan.segments,durations,'mp3',present);
        const props=[];
        if(/<svg\b/i.test(cleanBody))props.push('svg');
        if(/<math\b/i.test(cleanBody))props.push('mathml');
        if(/<(?:img|audio|video|source|object|iframe)\b[^>]*(?:src|data)\s*=\s*["']?(?:https?:)?\/\//i.test(cleanBody))props.push('remote-resources');
        pkg.files['OEBPS/content.opf']=N.opf(plan.title,plan.lang,plan.segments,durations.reduce((a,b)=>a+b,0),null,'mp3','audio/mpeg',present,props,{rtl:isRtl});
        const check={...pkg.files};for(let i=0;i<plan.segments.length;i++)check['OEBPS/audio/seg'+(i+1)+'.mp3']=true;
        const errors=A.AltFormatExports.validateEpub(check).issues.filter(x=>x.severity==='error');if(errors.length)throw Error('Read-along EPUB structural check failed: '+JSON.stringify(errors));
        return pkg.files;
      },{plan,durations});
      for(let i=0;i<mp3s.length;i++)pkg['OEBPS/audio/seg'+(i+1)+'.mp3']=fs.readFileSync(mp3s[i]);
      files.readalongEpub=o.claimPath(title+'-'+mode+'-readalong.epub');atomic(files.readalongEpub,zipFileMap(pkg,'mimetype'));
    }
    // Release synthesis models before starting another browser/JVM for verification.
    await context.close();
    if(browser){await browser.close().catch(()=>{});browser=null;}
    const epubValidation=files.readalongEpub?await EpubValidation.validate(files.readalongEpub,{stateDir:o.stateDir,resolveChromium:o.resolveChromium,claimPath:o.claimPath,onLog:o.onLog,signal:wallController?wallController.signal:o.signal}):undefined;
    if(epubValidation)Object.assign(files,epubValidation.files);
    const result={status:'completed',deliveryStatus:epubValidation?.status||'complete-for-tested-scope',reviewRequired:epubValidation?.reviewRequired||false,audioAuditVerified:false,sourceCoverage:o.sourceCoverage||null,contentCoverage:plan.contentCoverage,reusedSections:coverage.filter(section=>section.reused).length,generatedSections:coverage.filter(section=>!section.reused).length,provider:provider==='mixed-local'?provider:provider+'-browser',mode,voice,language:plan.lang,languages:plan.languages,voices:selected,sampleRate:24000,coverage,warnings:plan.warnings,sourceSha256:sourceHash,totalSections:plan.segments.length,completedSections:completed.length,durationSeconds:duration,files,epubValidation};
    files.narrationReport=o.claimPath(title+'-'+mode+'-narration.json');
    result.artifacts=Object.entries(files).filter(([role])=>role!=='narrationReport').map(([role,file])=>({role,path:file,sizeBytes:fs.statSync(file).size,sha256:hashFile(file)}));
    atomic(files.narrationReport,JSON.stringify(result,null,2));if(completionFile)saveCompletion(completionFile,fingerprint,result);return result;
  } finally {clearTimeout(wallTimer);o.signal?.removeEventListener('abort',abort);await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
}
module.exports={narrate,preflight,clipCachePath,readClipCache,narrationRuntimeHash,completionFingerprint,loadCompletion,saveCompletion,normalizeClip,ASSETS,wavInfo,mergeWavs,voiceCatalog:Planner.voiceCatalog,normalizeLanguage:Planner.normalizeLanguage,accessibleLanguages:Object.keys(Planner.LABELS)};
