/* Native Chromium acceptance for Word Sounds voice-mode and isolation playback.
 * Real React, production runtime/CSS and HTMLAudioElement; controlled recognition
 * and local recorded banks verify mechanics, not speech-recognition accuracy. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.env.WORD_SOUNDS_REPO||path.resolve(__dirname,'..');
const {chromium}=require(require.resolve('playwright',{paths:[repo]}));
const out=process.env.WORD_SOUNDS_QA_OUT||path.join(repo,'reports/word-sounds-construction-integrity-2026-10-09/browser');
fs.mkdirSync(out,{recursive:true});
function wav(hz){const rate=16000,n=8000,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*hz/rate)*2000*Math.min(1,i/160,(n-i)/160)),44+i*2);return 'data:audio/wav;base64,'+b.toString('base64');}
const tones=Array.from({length:6},(_,i)=>wav(220+i*55));
const loadBank=file=>JSON.parse(fs.readFileSync(path.join(repo,file),'utf8'));
const bank=loadBank('audio_bank.json'),extra=loadBank('audio_bank_kokoro.json');
const instructions=Object.fromEntries(Object.entries({...bank.instructions,...extra.instructions}).filter(([key])=>key.startsWith('fb_')||['inst_spelling_bee','inst_word_scramble','inst_missing_letter','inst_blending'].includes(key)));
const phonemes=Object.fromEntries(Object.entries({...bank.phonemes,...extra.phonemes}).filter(([key])=>['a','k','t','c','d','o','g','s','ee','b','e','i','n'].includes(key)));
const wordBank=loadBank('word_audio_kokoro_bank.json').words;
const words=Object.fromEntries(['cat','at','bat','dog','sun','cup','map','bed','see','it','on','up','an','in'].filter(key=>typeof wordBank[key]==='string').map(key=>[key,wordBank[key]]));
assert.match(words.cat,/^data:audio\//);assert.match(words.see,/^data:audio\//);
const deliverySource=fs.readFileSync(path.join(repo,'live_aac_source.jsx'),'utf8');
const deliveryEnd=deliverySource.indexOf('// Mailbox media preparation is separate from the synchronous privacy serializer.');
assert.ok(deliveryEnd>deliverySource.indexOf('const _alloSerializeResourceForStudentPack ='));
const delivery=deliverySource.slice(0,deliveryEnd)+'\nwindow.__qaSerialize = _alloSerializeResourceForStudentPack;';
const allStrings=JSON.parse(fs.readFileSync(path.join(repo,'ui_strings.js'),'utf8'));
const strings={common:allStrings.common,word_sounds:allStrings.word_sounds};
const helpers=fs.readFileSync(path.join(repo,'tests/helpers/word_sounds_harness.js'),'utf8');
const iconLine=helpers.match(/const ICONS = \[[^;]+;/)[0];
const install=helpers.slice(helpers.indexOf('function installAmbientGlobals()'),helpers.indexOf('/**\n * Load WordSoundsModal'));
const base=helpers.slice(helpers.indexOf('const passthroughT'),helpers.indexOf('function scrub(')).replace('export function baseProps','function baseProps');
// The production host never supplies this global: leaving the old ambient stub
// would conceal precisely the missing-overlay crash that this harness checks.
const ambient=`const React=window.React;const noop=()=>{};${iconLine}\n${install}\n${base}\ninstallAmbientGlobals();delete window.renderVoiceInputOverlay;window.__baseProps=baseProps;window.AlloLanguageContext=React.createContext({});`;
const routes={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/pure.js':'pure_helpers_module.js','/misc.js':'misc_components_module.js','/readiness.js':'word_sounds_readiness_contract.js','/runtime.js':'word_sounds_module.js','/voice.js':'voice_module.js','/firestore.js':'firestore_sync_module.js','/app.css':'app/static/css/main.3f49a8fc.css'};
const server=http.createServer((req,res)=>{const key=(req.url||'').split('?')[0];if(key==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Sounds construction integrity acceptance</title><link rel="stylesheet" href="/app.css"></head><body><button id="qa-start">Open Word Sounds</button><div id="root"></div></body></html>');return;}if(key==='/delivery.js'){res.setHeader('Content-Type','application/javascript');res.end(delivery);return;}if(routes[key]){res.setHeader('Content-Type',key.endsWith('.css')?'text/css':'application/javascript');res.end(fs.readFileSync(path.join(repo,routes[key])));return;}res.statusCode=404;res.end();});
const checks=[],errors=[],externalRequests=[],runs=[],consoleMessages=[];let browser,page;
const pass=(name,details={})=>{checks.push({name,passed:true,...details});console.log('PASS '+name);};
const label=(section,key,fallback)=>typeof strings[section]?.[key]==='string'?strings[section][key]:fallback;
const modeOn=label('word_sounds','switch_mic_mode','Switch to Microphone Mode'),modeOff=label('word_sounds','switch_click_mode','Switch to Click Mode');
const startLabel=label('word_sounds','use_microphone','Use Microphone'),cancelLabel=label('common','cancel','Cancel')+' — '+label('common','microphone','Microphone');
const repeatLabel=label('common','repeat_instruction','Repeat instruction'),playAllLabel=label('common','play_all_sounds','Play all sounds');
async function frames(){await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});}
async function boot(activity,word='cat',engine='native',enableTts=false,config={}){
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 for(const url of ['/react.js','/react-dom.js'])await page.addScriptTag({url});
 await page.addScriptTag({content:ambient});
 await page.evaluate(({words,instructions,phonemes,tones,strings,activity,word,engine,enableTts,config})=>{
  localStorage.setItem('allo_word_sounds_anchor_mode_v1',config.anchorMode||'full');
  const q=window.__qa={recognitions:[],recEvents:[],audioEvents:[],audios:[],synthesis:[],pendingTTS:[],gemini:[],toasts:[],scoreWrites:[],historyWrites:[],slowAudio:false,deferInstruction:false,engine};
  window.__ALLO_INSTRUCTION_AUDIO=instructions;window.__ALLO_PHONEME_AUDIO_BANK=phonemes;window.__ALLO_ISOLATION_AUDIO={};window._CACHE_WORD_AUDIO_BANK=words;window.loadWordAudioBank=async()=>words;window.loadAudioBank=async()=>{};
  const labels=new Map([...Object.entries(instructions).map(([k,v])=>[v,'instruction:'+k]),...Object.entries(words).map(([k,v])=>[v,'kokoro-word:'+k]),...Object.entries(phonemes).map(([k,v])=>[v,'phoneme:'+k])]);
  const NativeAudio=window.Audio;
  window.Audio=function(...args){const el=new NativeAudio(...args);el.__qaId=q.audios.length;q.audios.push(el);if(q.slowAudio)el.playbackRate=.1;const nativePlay=el.play.bind(el);el.play=()=>{q.audioEvents.push({id:el.__qaId,type:'play-call',label:labels.get(el.currentSrc||el.src)||'other',at:performance.now()});return nativePlay();};for(const type of ['playing','pause','ended','error','loadedmetadata','waiting','stalled'])el.addEventListener(type,()=>q.audioEvents.push({id:el.__qaId,type,label:labels.get(el.currentSrc||el.src)||'other',duration:Number.isFinite(el.duration)?el.duration:null,playbackRate:el.playbackRate,at:performance.now(),active:q.audios.filter(a=>!a.paused&&!a.ended).map(a=>a.__qaId)}));return el;};window.Audio.prototype=NativeAudio.prototype;
  class ControlledRecognition{constructor(){this.id=q.recognitions.length;this.stopCalls=0;this.abortCalls=0;q.recognitions.push(this);}start(){this.callbacks={onstart:this.onstart,onresult:this.onresult,onend:this.onend,onerror:this.onerror};q.recEvents.push({id:this.id,type:'start',at:performance.now()});}stop(){this.stopCalls++;q.recEvents.push({id:this.id,type:'stop',at:performance.now()});}abort(){this.abortCalls++;q.recEvents.push({id:this.id,type:'abort',at:performance.now()});}}
  window.SpeechRecognition=ControlledRecognition;window.webkitSpeechRecognition=ControlledRecognition;
  q.emit=(id,type,text,isFinal=true)=>{const r=q.recognitions[id];if(!r)throw Error('Missing recognition '+id);const cb=r.callbacks?.['on'+type];q.recEvents.push({id,type:'emit:'+type,text,isFinal,at:performance.now()});if(typeof cb!=='function')return;if(type==='result'){const result=[{transcript:text,confidence:.95}];result.isFinal=isFinal;cb({resultIndex:0,results:[result]});}else if(type==='error')cb({error:text||'network'});else cb({});};
  const lookup=(key,params={})=>{const [section,name]=key.split('.');let result=strings[section]?.[name];if(typeof result!=='string')return '';for(const [name,value]of Object.entries(params||{}))result=result.replaceAll('{'+name+'}',String(value));return result;};
  const asset=src=>{const m=src.match(/^data:([^;,]+);base64,(.+)$/);return {mime:m[1],base64:m[2]};};
  const assets=Object.fromEntries(Object.entries(words).map(([key,src])=>[key,asset(src)]));
  // Use the same supported inline raster format as a delivered lesson image.
  let fixtureImage;
  if(config.image){const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;const context=canvas.getContext('2d');context.fillStyle='#e9d5ff';context.fillRect(0,0,120,120);context.fillStyle='#6d28d9';context.beginPath();context.arc(60,60,35,0,Math.PI*2);context.fill();fixtureImage=canvas.toDataURL('image/png');}
  q.item=w=>({word:w,targetWord:w,image:fixtureImage,phonemes:w==='cat'?['k','a','t']:w==='see'?['s','ee']:['d','o','g'],phonemeCount:w==='see'?2:3,ttsReady:true,_runtimeAudioReady:true,_ttsAssets:assets,activityItems:{isolation:{position:1,correctSound:'a',options:['a','k','t']},missing_letter:{hiddenIndex:1,correctLetter:w[1],options:[...new Set([w[1],'c','b','d'])]},word_scramble:{letters:[...w].reverse()},blending:{answer:w,options:[w,'dog','sun','cup']}}});
  document.getElementById('qa-start').addEventListener('click',()=>{
   function Host(){
    const [defaults]=React.useState(()=>window.__baseProps(activity));
    const [current,setWord]=React.useState(word),[data,setData]=React.useState(()=>config.resource?.data?.[0]||q.item(word)),[act,setAct]=React.useState(activity),[feedback,setFeedback]=React.useState(null),[score,setScore]=React.useState({correct:0,total:0,streak:0}),[history,setHistory]=React.useState([]),[preloaded,setPreloaded]=React.useState(()=>config.resource?.data||[q.item(word)]);
    const updateScore=React.useCallback(update=>setScore(previous=>{const next=typeof update==='function'?update(previous):update;q.scoreWrites.push({previous,next});return next;}),[]);
    const updateHistory=React.useCallback(update=>setHistory(previous=>{const next=typeof update==='function'?update(previous):update;q.historyWrites.push(next);return next;}),[]);
    const synth=React.useCallback(async(text,voice,speed,options)=>{const request={text:String(text),voice,speed,options,at:performance.now()};q.synthesis.push(request);if(q.deferInstruction&&/^What is the .* sound\?$/i.test(String(text)))return new Promise(resolve=>q.pendingTTS.push({request,resolve}));return words[String(text).toLowerCase()]||tones[5];},[]);
    const cloud=React.useCallback(async(...args)=>{q.gemini.push(args);throw Error('Unexpected cloud generation');},[]);
    const props={...defaults,t:lookup,getWordSoundsString:(_t,key,params)=>lookup(key,params),glossaryTerms:[{term:word}],currentWordSoundsWord:current,setCurrentWordSoundsWord:setWord,wordSoundsPhonemes:data,setWordSoundsPhonemes:setData,wordSoundsActivity:act,setWordSoundsActivity:setAct,wordSoundsFeedback:feedback,setWordSoundsFeedback:setFeedback,wordSoundsScore:score,setWordSoundsScore:updateScore,wordSoundsHistory:history,setWordSoundsHistory:updateHistory,wsPreloadedWords:preloaded,setWsPreloadedWords:setPreloaded,isTeacherMode:true,isProbeMode:config.probe===true,sessionConfig:config.resource?.sessionConfig||{imageVisibilityMode:config.imageMode||'smart'},initialShowReviewPanel:false,initialActivitySequence:[activity],selectedVoice:'af_heart',wordSoundsLanguage:'en-US',playInstructions:false,allowRuntimeAi:enableTts,callTTS:synth,callGemini:cloud,callImagen:null,wordSoundsAudioLibrary:words,addToast:(...args)=>q.toasts.push(args)};
    q.score=score;q.history=history;q.preloaded=preloaded;q.data=data;q.props=props;q.word=current;q.act=act;q.feedback=feedback;q.change=(w,a)=>{setWord(w);setData(q.item(w));setAct(a||act);setFeedback(null);};
    q.editMissing=()=>setData(previous=>({...previous,activityItems:{...previous.activityItems,missing_letter:{hiddenIndex:2,correctLetter:'t',options:['t','a','b','d']}}}));
    q.resolveTTS=index=>q.pendingTTS[index].resolve(tones[5]);
    return React.createElement(window.AlloModules.WordSoundsModal,props);
   }
   q.root=ReactDOM.createRoot(document.getElementById('root'));q.root.render(React.createElement(Host));
  });
 },{words,instructions,phonemes,tones,strings,activity,word,engine,enableTts,config});
 if(engine==='shared')await page.addScriptTag({url:'/voice.js'});
 for(const url of ['/pure.js','/misc.js','/readiness.js','/runtime.js'])await page.addScriptTag({url});
 await page.locator('#qa-start').click();if(activity==='spelling_bee')await page.getByRole('textbox',{name:label('common','enter_user_answer','Enter your answer'),exact:true}).waitFor();else await page.getByTitle(modeOn,{exact:true}).waitFor();await frames();
 await page.waitForFunction(({activity,word})=>window.__qa.act===activity&&window.__qa.word===word,{activity,word});
 if(activity==='isolation')await page.getByRole('button',{name:playAllLabel,exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>typeof window.renderVoiceInputOverlay),'undefined');
}

const input=()=>page.getByRole('textbox',{name:label('common','enter_user_answer','Enter your answer'),exact:true});
const check=activity=>page.getByRole('button',{name:label('word_sounds',activity==='spelling_bee'?'spelling_bee_check':activity==='word_scramble'?'word_scramble_check':'check_answer','Check Answer'),exact:true});
const firstHint=()=>page.getByRole('button',{name:label('word_sounds','spelling_bee_first_letter','Hint: first letter'),exact:true});
const vowelHint=()=>page.getByRole('button',{name:label('word_sounds','spelling_bee_hint_vowels','💡 Show Vowels'),exact:true});
const moreHint=()=>page.getByRole('button',{name:label('word_sounds','spelling_bee_hint_more','💡 Show More'),exact:true});
const letterBoxes=()=>page.locator('div.w-11.h-13');
async function snapshot(name){runs.push(await page.evaluate(name=>({name,word:window.__qa.word,activity:window.__qa.act,score:window.__qa.score,history:window.__qa.history,feedback:window.__qa.feedback,audioEvents:window.__qa.audioEvents,toasts:window.__qa.toasts,synthesis:window.__qa.synthesis,gemini:window.__qa.gemini}),name));}
async function close(name){await snapshot(name);await page.evaluate(()=>window.__qa.root.unmount());await frames();}
async function synchronousDoubleSubmit(activity){
 const receipt=await check(activity).evaluate(button=>{const q=window.__qa;ReactDOM.flushSync(()=>{button.click();button.click();});return {score:q.score,history:q.history,checkDisabled:button.disabled};});
 assert.equal(receipt.score.total,1,'correct response must commit in the same event task without the old 1.5-second scoring delay');
 assert.equal(receipt.score.correct,1);assert.equal(receipt.history.length,1,'duplicate submit must write one history row');assert.equal(receipt.checkDisabled,true);
 return receipt.history[0];
}
async function neutralLetters(){
 assert.equal(await letterBoxes().count(),3);
 const classes=await letterBoxes().evaluateAll(elements=>elements.map(el=>el.className));
 assert.ok(classes.every(value=>!value.includes('border-green-400')&&!value.includes('border-rose-400')),'unsubmitted/probe letters must not expose correctness colors');
 assert.equal(await page.getByText(/\d+\s*\/\s*\d+\s*letters? correct/i).count(),0,'unsubmitted/probe letter correctness count must stay hidden');
}
async function immediateConstruction(){
 for(const activity of ['spelling_bee','word_scramble','missing_letter']){
  await boot(activity);
  if(activity==='missing_letter')await page.getByRole('button',{name:'A',exact:true}).click();
  else if(activity==='word_scramble')for(const letter of ['C','A','T'])await page.getByRole('button',{name:letter,exact:true}).click();
  else await input().fill('cat');
  const row=await synchronousDoubleSubmit(activity);assert.equal(row.firstTry,true);assert.equal(row.attempts,1);
  if(activity!=='missing_letter')assert.equal(await input().isDisabled(),true);
  if(activity==='spelling_bee'){assert.equal(await firstHint().isDisabled(),true);assert.equal(await vowelHint().isDisabled(),true);}
  if(activity==='word_scramble'){
   assert.equal(await page.getByRole('button',{name:label('word_sounds','word_scramble_clear','Clear'),exact:true}).isDisabled(),true);
   for(const letter of ['C','A','T'])assert.equal(await page.getByRole('button',{name:letter,exact:true}).getAttribute('aria-disabled'),'true');
  }
  if(activity==='missing_letter')for(const letter of ['A','C','B','D'])assert.equal(await page.getByRole('button',{name:letter,exact:true}).isDisabled(),true);
  await close(activity+' immediate submit');pass(activity+': correct duplicate submission commits once immediately and locks response controls');
 }
}
async function keyboardSafety(){
 for(const activity of ['spelling_bee','word_scramble']){
  await boot(activity);await input().press('Enter');await input().fill('   ');await input().press('Enter');assert.equal(await check(activity).isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>({score:window.__qa.score.total,rows:window.__qa.history.length,feedback:window.__qa.feedback})),{score:0,rows:0,feedback:null});
  await input().fill('cat');
  await input().evaluate(element=>{for(const options of [{repeat:true},{isComposing:true},{keyCode:229}])element.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true,...options}));});
  await frames();assert.equal(await page.evaluate(()=>window.__qa.score.total),0,'IME composition and held Enter must not submit');assert.equal(await page.evaluate(()=>window.__qa.history.length),0);
  const row=await synchronousDoubleSubmit(activity);assert.equal(row.attempts,1,'ignored blank/composition/repeat input consumes no attempt');assert.equal(row.firstTry,true);
  await close(activity+' keyboard safety');pass(activity+': empty/whitespace Enter, key repeat, and IME composition consume no attempt');
 }
}
async function checkedFeedback(){
 await page.setViewportSize({width:1280,height:900});await boot('spelling_bee');await input().fill('cut');await neutralLetters();
 await check('spelling_bee').evaluate(button=>{ReactDOM.flushSync(()=>{button.click();button.click();});});await frames();
 assert.equal(await page.evaluate(()=>window.__qa.score.total),0);assert.equal(await page.evaluate(()=>window.__qa.history.length),0);
 const classes=await letterBoxes().evaluateAll(elements=>elements.map(el=>el.className));assert.equal(classes.filter(value=>value.includes('border-green-400')).length,2);assert.equal(classes.filter(value=>value.includes('border-rose-400')).length,1);
 await page.screenshot({path:path.join(out,'spelling-checked-feedback-1280.png'),fullPage:true});
 await check('spelling_bee').click();assert.equal(await page.evaluate(()=>window.__qa.score.total),0,'an unchanged retry must not consume a second attempt');
 await input().fill('cat');const row=await synchronousDoubleSubmit('spelling_bee');assert.equal(row.attempts,2);assert.equal(row.firstTry,false);assert.equal(row.textSupported,true);assert.ok(row.cluesShown.includes('spelling_letter_feedback'));
 await close('checked spelling feedback');pass('Spelling Bee: checked feedback appears after a miss, duplicate wrong checks count once, and corrected spelling records two attempts with support');
}
async function cumulativeHints(){
 await boot('spelling_bee');await firstHint().click();assert.equal(await input().inputValue(),'c');await vowelHint().click();assert.equal(await input().inputValue(),'ca_');await moreHint().click();assert.equal(await input().inputValue(),'cat');
 const firstRow=await synchronousDoubleSubmit('spelling_bee');assert.equal(firstRow.answerExposed,true);assert.equal(firstRow.textSupported,true);assert.equal(firstRow.mode,'visual');for(const clue of ['spelling_first_letter','spelling_vowels','spelling_more_letters'])assert.ok(firstRow.cluesShown.includes(clue),clue);
 await close('first-letter plus cumulative hints');pass('Spelling Bee: first-letter, vowel, and more-letter hints accumulate and fully revealed answers are recorded honestly');
 await boot('spelling_bee');await vowelHint().click();assert.equal(await input().inputValue(),'_a_');await moreHint().click();assert.equal(await input().inputValue(),'ca_');await moreHint().click();assert.equal(await input().inputValue(),'cat');
 const vowelRow=await synchronousDoubleSubmit('spelling_bee');assert.equal(vowelRow.answerExposed,true);assert.ok(vowelRow.cluesShown.includes('spelling_vowels'));assert.ok(vowelRow.cluesShown.includes('spelling_more_letters'));
 await close('vowels monotonic reveal');pass('Spelling Bee: repeated Show More advances _a_ to ca_ to cat without resetting the revealed letters');
}
async function erasedHintEvidence(){
 await boot('spelling_bee');await firstHint().click();assert.equal(await input().inputValue(),'c');await input().fill('');await input().fill('cat');
 const row=await synchronousDoubleSubmit('spelling_bee');assert.equal(row.textSupported,true);assert.equal(row.mode,'visual');assert.ok(row.cluesShown.includes('spelling_first_letter'));assert.notEqual(row.answerExposed,true,'a partial hint must not claim that the full answer was exposed');
 await close('erased hint evidence');pass('Spelling Bee: erasing a hint does not erase its support evidence from the completed response');
}
async function independentAndProbe(){
 await page.setViewportSize({width:390,height:844});await boot('spelling_bee');await input().fill('cut');await neutralLetters();await page.screenshot({path:path.join(out,'spelling-independent-390.png'),fullPage:true});await close('neutral independent spelling');
 await page.setViewportSize({width:1280,height:900});await boot('spelling_bee','cat','native',false,{probe:true});assert.equal(await page.evaluate(()=>window.__qa.props.isProbeMode),true);await input().fill('cut');await neutralLetters();assert.equal(await firstHint().count(),0);assert.equal(await vowelHint().count(),0);
 await check('spelling_bee').evaluate(button=>ReactDOM.flushSync(()=>button.click()));
 const state=await page.evaluate(()=>({score:window.__qa.score,history:window.__qa.history}));assert.equal(state.score.total,1);assert.equal(state.score.correct,0);assert.equal(state.history.length,1);assert.equal(state.history[0].attempts,1);assert.ok(!state.history[0].cluesShown.includes('spelling_letter_feedback'));await neutralLetters();
 await close('probe neutral spelling');pass('Spelling Bee: letter correctness stays hidden before submission and throughout probe mode, with no hint controls or feedback support recorded in probes');
}
async function run(){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true,timeout:120000,args:['--autoplay-policy=no-user-gesture-required']});const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();externalRequests.push(url);return route.abort();});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(consoleMessages.length<200)consoleMessages.push(msg.text());});await immediateConstruction();await keyboardSafety();await checkedFeedback();await cumulativeHints();await erasedHintEvidence();await independentAndProbe();assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);assert.ok(runs.every(run=>!run.gemini.length));assert.equal(checks.length,10);}
run().catch(async error=>{console.error(error.stack||error);process.exitCode=1;errors.push(String(error.stack||error));if(page)try{await snapshot('failure');await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'failure-dom.txt'),await page.locator('body').innerText());}catch(_){};}).finally(async()=>{const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,externalRequests,runs,consoleMessages,runtimeSha256:hash('word_sounds_module.js'),voiceSha256:hash('voice_module.js'),limitations:['Controlled local React host and production runtime/CSS validate construction answer mechanics and recorded learning evidence.','Native audio remains available from existing local banks; this suite does not assess physical microphone accuracy, live provider generation, or pronunciation quality.']},null,2));if(browser)await browser.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:checks.length,errors:errors.length,externalRequests:externalRequests.length,out}));});
