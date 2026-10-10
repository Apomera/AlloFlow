/* Native Chromium UI/audio acceptance for Word Sounds microphone lifetimes.
 * Real React, runtime, CSS and Audio; only SpeechRecognition events are controlled.
 * Speech service accuracy, physical microphones and cloud delivery are not tested. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.env.WORD_SOUNDS_REPO||path.resolve(__dirname,'..');
const {chromium}=require(require.resolve('playwright',{paths:[repo]}));
const out=process.env.WORD_SOUNDS_QA_OUT||path.join(repo,'reports/word-sounds-microphone-lifecycle-2026-10-09/browser');
fs.mkdirSync(out,{recursive:true});
const pick=(map,keep)=>Object.fromEntries(Object.entries(map||{}).filter(([key])=>keep(key)));
const loadBank=file=>{const bank=JSON.parse(fs.readFileSync(path.join(repo,file),'utf8'));return {instructions:pick(bank.instructions,key=>['inst_blending','inst_rhyming','which_word_did_you_hear'].includes(key)||key.startsWith('fb_')),phonemes:pick(bank.phonemes,key=>['k','c','a','t','d','o','g','b','u','s','n'].includes(key))};};
const bank=loadBank('audio_bank.json'),extra=loadBank('audio_bank_kokoro.json');
const instructions={...bank.instructions,...extra.instructions},phonemes={...bank.phonemes,...extra.phonemes};
const wanted=['cat','bat','hat','dog','log','sun','cup','map','bed'];
const words=pick(JSON.parse(fs.readFileSync(path.join(repo,'word_audio_kokoro_bank.json'),'utf8')).words,key=>wanted.includes(key));
assert.match(words.cat||'',/^data:audio\//,'cat needs a local real audio fixture');
const strings=pick(JSON.parse(fs.readFileSync(path.join(repo,'ui_strings.js'),'utf8')),key=>key==='common'||key==='word_sounds');
const harness=fs.readFileSync(path.join(repo,'tests/helpers/word_sounds_harness.js'),'utf8');
const iconLine=harness.match(/const ICONS = \[[^;]+;/)[0];
const install=harness.slice(harness.indexOf('function installAmbientGlobals()'),harness.indexOf('/**\n * Load WordSoundsModal'));
const base=harness.slice(harness.indexOf('const passthroughT'),harness.indexOf('function scrub(')).replace('export function baseProps','function baseProps');
const ambient=`const React=window.React;const noop=()=>{};${iconLine}\n${install}\n${base}\ninstallAmbientGlobals();window.__baseProps=baseProps;window.AlloLanguageContext=React.createContext({});`;
const routes={
 '/react.js':path.join(repo,'desktop/web-app/node_modules/react/umd/react.development.js'),
 '/react-dom.js':path.join(repo,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'),
 '/pure.js':path.join(repo,'pure_helpers_module.js'),'/misc.js':path.join(repo,'misc_components_module.js'),
 '/readiness.js':path.join(repo,'word_sounds_readiness_contract.js'),'/runtime.js':path.join(repo,'word_sounds_module.js'),
 '/voice.js':path.join(repo,'voice_module.js'),'/app.css':path.join(repo,'app/static/css/main.3f49a8fc.css'),
};
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Sounds microphone acceptance</title><link rel="stylesheet" href="/app.css"></head><body><button id="qa-start">Open Word Sounds</button><div id="root"></div></body></html>';
const server=http.createServer((req,res)=>{const key=(req.url||'').split('?')[0];if(key==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(routes[key]){res.setHeader('Content-Type',key.endsWith('.css')?'text/css':'application/javascript');res.end(fs.readFileSync(routes[key]));return;}res.statusCode=404;res.end();});
const checks=[],errors=[],externalRequests=[],runs=[];let browser,page;
const pass=(name,details={})=>{checks.push({name,passed:true,...details});console.log('PASS '+name);};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex');
const label=(section,key,fallback)=>typeof strings[section]?.[key]==='string'?strings[section][key]:fallback;
const modeOn=label('word_sounds','switch_mic_mode','Switch to Microphone Mode');
const modeOff=label('word_sounds','switch_click_mode','Switch to Click Mode');
const replay=label('common','read_instructions','Read instructions');
const minimize=label('common','minimize_to_background','Minimize to background'),maximize=label('common','maximize','Maximize');
const startLabel=label('word_sounds','use_microphone','Use Microphone');
const cancelLabel=label('common','cancel','Cancel')+' — '+label('common','microphone','Microphone');
async function frames(){await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});}
async function boot(engine){
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 for(const url of ['/react.js','/react-dom.js'])await page.addScriptTag({url});
 await page.addScriptTag({content:ambient});
 await page.evaluate(({words,instructions,phonemes,strings,engine})=>{
  const q=window.__qa={engine,recognitions:[],recEvents:[],audioEvents:[],audios:[],toasts:[],scoreWrites:[],historyWrites:[],synthesis:[],gemini:[],score:{correct:0,total:0,streak:0},slowAudio:false,failNext:false};
  window.__ALLO_INSTRUCTION_AUDIO=instructions;window.__ALLO_PHONEME_AUDIO_BANK=phonemes;window._CACHE_WORD_AUDIO_BANK=words;window.loadWordAudioBank=async()=>words;window.loadAudioBank=async()=>{};
  const NativeAudio=window.Audio;
  window.Audio=function(...args){const el=new NativeAudio(...args);el.__qaId=q.audios.length;q.audios.push(el);if(q.slowAudio)el.playbackRate=.1;for(const type of ['playing','pause','ended','error'])el.addEventListener(type,()=>q.audioEvents.push({id:el.__qaId,type,at:performance.now(),paused:el.paused,duration:Number.isFinite(el.duration)?el.duration:null}));return el;};window.Audio.prototype=NativeAudio.prototype;
  class ControlledRecognition{
   constructor(){this.id=q.recognitions.length;this.stopCalls=0;this.abortCalls=0;q.recognitions.push(this);}
   start(){this.callbacks={onstart:this.onstart,onresult:this.onresult,onend:this.onend,onerror:this.onerror};q.recEvents.push({id:this.id,type:'start',at:performance.now()});if(q.failNext){q.failNext=false;throw new Error('Controlled recognition start failed');}this.started=true;}
   stop(){this.stopCalls++;q.recEvents.push({id:this.id,type:'stop',at:performance.now()});}
   abort(){this.abortCalls++;q.recEvents.push({id:this.id,type:'abort',at:performance.now()});}
  }
  window.SpeechRecognition=ControlledRecognition;window.webkitSpeechRecognition=ControlledRecognition;
  q.emit=(id,type,text,isFinal=true)=>{const r=q.recognitions[id];if(!r)throw Error('Missing recognition '+id);const cb=r.callbacks?.['on'+type];q.recEvents.push({id,type:'emit:'+type,text,isFinal,at:performance.now()});if(typeof cb!=='function')return;if(type==='result'){const result=[{transcript:text,confidence:.95}];result.isFinal=isFinal;cb({resultIndex:0,results:[result]});}else if(type==='error')cb({error:text||'network'});else cb({});};
  const lookup=(key,params={})=>{const [section,name]=key.split('.');let result=strings[section]?.[name];if(typeof result!=='string')return '';for(const [name,value]of Object.entries(params||{}))result=result.replaceAll('{'+name+'}',String(value));return result;};
  const asset=src=>{const m=src.match(/^data:([^;,]+);base64,(.+)$/);return {mime:m[1],base64:m[2]};};
  const assets=Object.fromEntries(Object.entries(words).map(([key,src])=>[key,asset(src)]));
  q.item=word=>({word,targetWord:word,phonemes:word==='dog'?['d','o','g']:['k','a','t'],phonemeCount:3,rhymeWord:word==='dog'?'log':'bat',rhymeDistractors:['sun','cup','bed'],blendingDistractors:['dog','sun','cup'],ttsReady:true,_runtimeAudioReady:true,_ttsAssets:assets,activityItems:{blending:{answer:word,options:word==='dog'?['dog','cat','sun','cup']:['cat','dog','sun','cup']},rhyming:{answer:word==='dog'?'log':'bat',options:word==='dog'?['log','cat','sun','cup']:['bat','dog','sun','cup']}}});
  document.getElementById('qa-start').addEventListener('click',()=>{
   function Host(){
    const [defaults]=React.useState(()=>window.__baseProps('blending'));
    const [word,setWord]=React.useState('cat'),[data,setData]=React.useState(()=>q.item('cat')),[act,setAct]=React.useState('blending'),[feedback,setFeedback]=React.useState(null),[score,setScore]=React.useState({correct:0,total:0,streak:0}),[history,setHistory]=React.useState([]),[preloaded,setPreloaded]=React.useState(()=>[q.item('cat'),q.item('dog')]);
    const updateScore=React.useCallback(update=>setScore(previous=>{const next=typeof update==='function'?update(previous):update;q.scoreWrites.push({previous,next});return next;}),[]);
    const updateHistory=React.useCallback(update=>setHistory(previous=>{const next=typeof update==='function'?update(previous):update;q.historyWrites.push(next);return next;}),[]);
    const synth=React.useCallback(async(text)=>{q.synthesis.push(String(text));return words[String(text).toLowerCase()]||words.cat;},[]);
    const cloud=React.useCallback(async(...args)=>{q.gemini.push(args);throw Error('Unexpected cloud generation');},[]);
    const props={...defaults,t:lookup,getWordSoundsString:(_t,key,params)=>lookup(key,params),currentWordSoundsWord:word,setCurrentWordSoundsWord:setWord,wordSoundsPhonemes:data,setWordSoundsPhonemes:setData,wordSoundsActivity:act,setWordSoundsActivity:setAct,wordSoundsFeedback:feedback,setWordSoundsFeedback:setFeedback,wordSoundsScore:score,setWordSoundsScore:updateScore,wordSoundsHistory:history,setWordSoundsHistory:updateHistory,wsPreloadedWords:preloaded,setWsPreloadedWords:setPreloaded,isTeacherMode:true,isProbeMode:false,initialShowReviewPanel:false,initialActivitySequence:['blending','rhyming'],selectedVoice:'af_heart',wordSoundsLanguage:'en-US',playInstructions:false,allowRuntimeAi:false,callTTS:synth,callGemini:cloud,callImagen:null,wordSoundsAudioLibrary:words,addToast:(...args)=>q.toasts.push(args)};
    q.score=score;q.history=history;q.props=props;q.word=word;q.act=act;q.change=(nextWord,nextAct)=>{setWord(nextWord);setData(q.item(nextWord));setAct(nextAct||act);setFeedback(null);};
    return React.createElement(window.AlloModules.WordSoundsModal,props);
   }
   q.root=ReactDOM.createRoot(document.getElementById('root'));q.root.render(React.createElement(Host));
  });
 },{words,instructions,phonemes,strings,engine});
 if(engine==='shared')await page.addScriptTag({url:'/voice.js'});
 for(const url of ['/pure.js','/misc.js','/readiness.js','/runtime.js'])await page.addScriptTag({url});
 await page.locator('#qa-start').click();
 await page.getByTitle(modeOn,{exact:true}).waitFor({state:'visible'});
 await page.getByTitle(modeOn,{exact:true}).click();
 await page.getByRole('button',{name:startLabel,exact:true}).waitFor({state:'visible'});
 await frames();
 assert.equal(await page.evaluate(()=>!!window.AlloFlowVoice),engine==='shared');
}
async function start(){const before=await page.evaluate(()=>window.__qa.recognitions.length);await page.getByRole('button',{name:startLabel,exact:true}).click();await page.waitForFunction(n=>window.__qa.recognitions.length===n+1,before);await page.getByRole('button',{name:cancelLabel,exact:true}).waitFor();return before;}
async function emit(id,type,text,isFinal=true){await page.evaluate(({id,type,text,isFinal})=>window.__qa.emit(id,type,text,isFinal),{id,type,text,isFinal});await frames();}
async function late(id,answer='cat'){await page.evaluate(({id,answer})=>{const q=window.__qa;q.emit(id,'start');q.emit(id,'result',answer);q.emit(id,'end');q.emit(id,'error','network');},{id,answer});await frames();}
async function stopped(id){await page.waitForFunction(id=>{const r=window.__qa.recognitions[id];return r.stopCalls+r.abortCalls>0;},id);assert.ok(await page.evaluate(id=>{const r=window.__qa.recognitions[id];return r.stopCalls+r.abortCalls>0;},id),'recognition '+id+' must request recognition stop or abort');}
async function unscored(){assert.equal(await page.evaluate(()=>window.__qa.score.total),0);}
async function snapshot(engine){runs.push(await page.evaluate(engine=>({engine,score:window.__qa.score,recognitionEvents:window.__qa.recEvents,audioEvents:window.__qa.audioEvents,toasts:window.__qa.toasts,synthesis:window.__qa.synthesis,gemini:window.__qa.gemini}),engine));}
async function lifecycle(engine){
 await boot(engine);
 // Keep genuine native playback active long enough to prove the microphone interrupts it.
 await page.evaluate(()=>{window.__qa.slowAudio=true;});
 await page.getByTitle(replay,{exact:true}).click();
 await page.waitForFunction(()=>window.__qa.audios.some(a=>!a.paused&&!a.ended));
 const playing=await page.evaluate(()=>window.__qa.audios.filter(a=>!a.paused&&!a.ended).map(a=>a.__qaId));
 const first=await start();
 assert.ok(await page.evaluate(ids=>ids.every(id=>window.__qa.audios[id].paused),playing),'starting capture pauses native audio');
 assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:cancelLabel,exact:true}).click();await stopped(first);await late(first);await unscored();
 await page.getByRole('button',{name:startLabel,exact:true}).waitFor();
 pass(engine+': pending capture pauses native audio and manual cancellation discards delayed events');
 await page.evaluate(()=>{window.__qa.slowAudio=false;});

 const mode=await start();await page.getByTitle(modeOff,{exact:true}).click();await stopped(mode);await late(mode);await unscored();
 assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).count(),0);
 await page.getByTitle(modeOn,{exact:true}).click();
 pass(engine+': switching microphone mode off cancels capture and ignores its transcript');

 const old=await start();await page.getByTitle(replay,{exact:true}).click();await stopped(old);await page.getByRole('button',{name:startLabel,exact:true}).waitFor();
 const fresh=await start();const stopsBefore=await page.evaluate(id=>{const r=window.__qa.recognitions[id];return r.stopCalls+r.abortCalls;},fresh);
 await late(old);await unscored();assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(id=>{const r=window.__qa.recognitions[id];return r.stopCalls+r.abortCalls;},fresh),stopsBefore);
 await page.getByRole('button',{name:cancelLabel,exact:true}).click();
 pass(engine+': replay cancels the old attempt; its late result/end/error cannot stop a newer attempt');

 const priorWord=await page.evaluate(()=>window.__qa.word);const nextWord=priorWord==='dog'?'cat':'dog';const changedWord=await start();await page.evaluate(word=>window.__qa.change(word,'blending'),nextWord);await page.waitForFunction(word=>window.__qa.word===word,nextWord);await frames();await stopped(changedWord);await late(changedWord);await unscored();
 const currentWord=await start();await late(changedWord);assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:cancelLabel,exact:true}).click();await stopped(currentWord);
 pass(engine+': changing the word cancels capture and protects the next word attempt');

 const changedActivity=await start();await page.evaluate(()=>window.__qa.change('dog','rhyming'));await page.waitForFunction(()=>window.__qa.act==='rhyming');await frames();await stopped(changedActivity);await late(changedActivity,'dog');await unscored();
 const currentActivity=await start();await late(changedActivity,'dog');assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:cancelLabel,exact:true}).click();await stopped(currentActivity);
 pass(engine+': activity changes cancel capture and preserve a newer Rhyme Time attempt');

 const mini=await start();await page.getByTitle(minimize,{exact:true}).click();await page.locator('.word-sounds-minimized').waitFor();await stopped(mini);await late(mini,'log');await unscored();await page.getByTitle(maximize,{exact:true}).click();await page.getByRole('button',{name:startLabel,exact:true}).waitFor();
 pass(engine+': minimizing cancels capture and ignores transcripts while hidden');

 if(engine==='native'){
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});const id=await start();const button=page.getByRole('button',{name:cancelLabel,exact:true});await button.scrollIntoViewIfNeeded();const bounds=await button.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.width>0&&bounds.height>0,'microphone fits '+width+'px');
   await page.screenshot({path:path.join(out,'microphone-listening-'+width+'.png'),fullPage:true});await button.click();await stopped(id);
  }
  pass('390 and 1280 pixel layouts show a visible, labeled, pressed Cancel microphone control');
 }
 const removed=await start();await page.evaluate(()=>window.__qa.root.unmount());await frames();await stopped(removed);await late(removed,'log');await unscored();await snapshot(engine);
 pass(engine+': unmount stops capture and prevents delayed response scoring');

 await boot(engine);const expected=engine==='shared'?'log':'cat';await page.evaluate(engine=>window.__qa.change(engine==='shared'?'dog':'cat',engine==='shared'?'rhyming':'blending'),engine);await page.waitForFunction(engine=>window.__qa.word===(engine==='shared'?'dog':'cat')&&window.__qa.act===(engine==='shared'?'rhyming':'blending'),engine);await frames();await page.evaluate(()=>{window.__qa.failNext=true;});const failIndex=await page.evaluate(()=>window.__qa.recognitions.length);await page.getByRole('button',{name:startLabel,exact:true}).click();await page.waitForFunction(n=>window.__qa.recognitions.length===n+1,failIndex);await frames();await page.getByRole('button',{name:startLabel,exact:true}).waitFor();await unscored();assert.ok(await page.evaluate(()=>window.__qa.toasts.length>0),'start failure is explained');
 const retry=await start();await late(failIndex);assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).getAttribute('aria-pressed'),'true');await unscored();
 pass(engine+': a thrown recognition start is recoverable and its later errors cannot interrupt retry');
 await emit(retry,'start');await emit(retry,'result',expected,false);await unscored();assert.equal(await page.getByRole('button',{name:cancelLabel,exact:true}).getAttribute('aria-pressed'),'true');
 await page.evaluate(({id,expected})=>{const q=window.__qa;q.emit(id,'result',expected,true);q.emit(id,'result',expected,true);q.emit(id,'end');q.emit(id,'error','network');},{id:retry,expected});
 await page.waitForFunction(()=>window.__qa.score.total===1);assert.equal(await page.evaluate(()=>window.__qa.score.correct),1);await stopped(retry);await frames();assert.equal(await page.evaluate(()=>window.__qa.score.total),1);await snapshot(engine);
 pass(engine+': interim speech is unscored and one final transcript produces exactly one correct result');
 await page.evaluate(()=>window.__qa.root.unmount());
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,timeout:120000,args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();externalRequests.push(url);return route.abort();});
 page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await lifecycle('native');await lifecycle('shared');
 assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);assert.ok(runs.every(run=>!run.gemini.length));
 assert.equal(checks.length,19);
}
run().catch(async error=>{console.error(error.stack||error);process.exitCode=1;if(page)try{runs.push(await page.evaluate(()=>({failure:true,word:window.__qa.word,activity:window.__qa.act,score:window.__qa.score,recognitionEvents:window.__qa.recEvents,recognitions:window.__qa.recognitions.map(r=>({id:r.id,stops:r.stopCalls,aborts:r.abortCalls})),audioEvents:window.__qa.audioEvents}))); await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'failure-dom.txt'),await page.locator('body').innerText());}catch(_){};errors.push(String(error.stack||error));}).finally(async()=>{
 const report={checks,errors,externalRequests,runs,runtimeSha256:hash('word_sounds_module.js'),voiceSha256:hash('voice_module.js'),coreSha256:hash('word_sounds_core.js'),limitations:['Controlled SpeechRecognition callbacks exercise browser UI lifetimes; no physical microphone or speech service was tested.','Native audio uses local recorded-bank fixtures. No cloud calls or deployment were performed.']};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
 if(browser)await browser.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));
 console.log(JSON.stringify({checks:checks.length,errors:errors.length,externalRequests:externalRequests.length,out}));
});
