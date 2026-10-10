/* Native Chromium acceptance for Word Sounds grading and tracing follow-through.
 * Full production modal, React and CSS; native HTMLAudioElement plays local banks.
 * Tracing fills the target mask with deterministic ink but invokes the real UI
 * and production formation scorer. This does not assess human handwriting. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.env.WORD_SOUNDS_REPO||path.resolve(__dirname,'..');
const {chromium}=require(require.resolve('playwright',{paths:[repo]}));
const out=process.env.WORD_SOUNDS_QA_OUT||path.join(repo,'reports/word-sounds-followthrough-2026-10-10/browser');
fs.mkdirSync(out,{recursive:true});
function wav(hz){const rate=16000,n=8000,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*hz/rate)*2000*Math.min(1,i/160,(n-i)/160)),44+i*2);return 'data:audio/wav;base64,'+b.toString('base64');}
const tones=Array.from({length:6},(_,i)=>wav(220+i*55));
const loadBank=file=>JSON.parse(fs.readFileSync(path.join(repo,file),'utf8'));
const bank=loadBank('audio_bank.json'),extra=loadBank('audio_bank_kokoro.json');
const instructions=Object.fromEntries(Object.entries({...bank.instructions,...extra.instructions}).filter(([key])=>key.startsWith('fb_')||['inst_spelling_bee','inst_word_scramble','inst_missing_letter','inst_blending','now_try_lowercase','inst_letter_tracing','inst_segmentation','inst_orthography','inst_mapping'].includes(key)));
const phonemes=Object.fromEntries(Object.entries({...bank.phonemes,...extra.phonemes}).filter(([key])=>['a','k','t','c','d','o','g','s','ee','b','e','i','n','oi','oy'].includes(key)));
const wordBank=loadBank('word_audio_kokoro_bank.json').words;
const words=Object.fromEntries(['toy','cat','at','bat','dog','sun','cup','map','bed','see','it','on','up','an','in'].filter(key=>typeof wordBank[key]==='string').map(key=>[key,wordBank[key]]));
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
  const ordinaryItem=q.item;q.item=w=>({...ordinaryItem(w),...(w===word?config.item||{}:{})});
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
    q.resolveTTS=index=>q.pendingTTS[index].resolve(tones[5]);q.editData=update=>setData(previous=>({...previous,...update}));
    return React.createElement(window.AlloModules.WordSoundsModal,props);
   }
   q.root=ReactDOM.createRoot(document.getElementById('root'));q.root.render(React.createElement(Host));
  });
 },{words,instructions,phonemes,tones,strings,activity,word,engine,enableTts,config});
 if(engine==='shared')await page.addScriptTag({url:'/voice.js'});
 for(const url of ['/pure.js','/misc.js','/readiness.js','/runtime.js'])await page.addScriptTag({url});
 await page.locator('#qa-start').click();
 if(activity==='letter_tracing')await page.locator('canvas[role="img"]').waitFor();
 else if(activity==='orthography')await page.getByRole('textbox',{name:label('common','drag_letters_here','Drag letters here'),exact:true}).waitFor();
 else if(activity==='mapping')await page.getByRole('button',{name:'Empty Slot 1',exact:true}).waitFor();
 else await page.getByRole('button',{name:label('common','check','Check'),exact:true}).waitFor();await frames();
 await page.waitForFunction(({activity,word})=>window.__qa.act===activity&&window.__qa.word===word,{activity,word});
 if(activity==='isolation')await page.getByRole('button',{name:playAllLabel,exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>typeof window.renderVoiceInputOverlay),'undefined');
}

async function snapshot(name){runs.push(await page.evaluate(name=>({name,word:window.__qa.word,activity:window.__qa.act,score:window.__qa.score,history:window.__qa.history,feedback:window.__qa.feedback,audioEvents:window.__qa.audioEvents,toasts:window.__qa.toasts,synthesis:window.__qa.synthesis,gemini:window.__qa.gemini}),name));}
async function close(name){await snapshot(name);await page.evaluate(()=>window.__qa.root.unmount());await frames();}
const segmentationCheck=()=>page.getByRole('button',{name:label('common','check','Check'),exact:true});
const orthographyInput=()=>page.getByRole('textbox',{name:label('common','drag_letters_here','Drag letters here'),exact:true});
const orthographyCheck=()=>page.getByRole('button',{name:label('common','next','Next'),exact:true}).filter({hasText:label('word_sounds','check_spelling','Check Spelling')});
const mappingChip=letter=>page.getByRole('button',{name:(label('word_sounds','select_sound_chip','Select sound')+' '+letter),exact:true});
const tracingCanvas=()=>page.locator('canvas[role="img"]');
const tracingCheck=()=>page.getByRole('button',{name:label('word_sounds','word_scramble_check','Check ✓'),exact:true});
async function sameTaskClick(locator,twice=true){return locator.evaluate((button,twice)=>{const q=window.__qa;ReactDOM.flushSync(()=>{button.click();if(twice)button.click();});return {score:q.score,history:q.history,feedback:q.feedback,disabled:button.disabled};},twice);}
function expectOneCorrect(receipt,attempts=1){assert.equal(receipt.score.total,1,'grading must commit before the event task returns');assert.equal(receipt.score.correct,1);assert.equal(receipt.history.length,1,'duplicate activation must commit only once');assert.equal(receipt.history[0].attempts,attempts);}
async function moveSegChip(sound){await page.getByRole('button',{name:'Phoneme '+sound,exact:true}).press('Enter');}
const segItem={phonemes:['t','oi'],phonemeCount:2,activityItems:{segmentation:{chips:[{id:'t',phoneme:'t'},{id:'oy',phoneme:'oy'},{id:'a',phoneme:'a'}]}}};
async function segmentationAliases(){
 await boot('segmentation','toy','native',false,{item:segItem});
 // The teacher display option reveals labels, while movement still uses real keyboard handlers.
 const show=page.getByTitle(/Show letter|Show.*phoneme|Show Letters/i);if(await show.count())await show.first().click();
 await moveSegChip('t');await moveSegChip('oy');
 const receipt=await sameTaskClick(segmentationCheck());expectOneCorrect(receipt);assert.equal(receipt.disabled,true);
 await close('equivalent sound spelling');pass('Segmentation accepts oi/oy sound aliases consistently and commits once immediately');
}
async function segmentationRetry(){
 await boot('segmentation','toy','native',false,{item:segItem});
 const show=page.getByTitle(/Show letter|Show.*phoneme|Show Letters/i);if(await show.count())await show.first().click();
 await moveSegChip('oy');await moveSegChip('t');
 const wrong=await sameTaskClick(segmentationCheck());assert.equal(wrong.score.total,0);assert.equal(wrong.history.length,0);assert.equal(wrong.feedback?.isCorrect,false);
 await page.locator('div[aria-label^="Phoneme oy."]').press('Enter');await page.locator('div[aria-label^="Phoneme t."]').press('Enter');
 await moveSegChip('t');await moveSegChip('oy');
 const receipt=await sameTaskClick(segmentationCheck());expectOneCorrect(receipt,2);assert.equal(receipt.history[0].firstTry,false);
 await close('segmentation corrected retry');pass('Segmentation rejects a wrong arrangement and records one miss plus a corrected retry');
}
async function orthographyImmediate(){
 await boot('orthography');await orthographyInput().fill('cat');
 const receipt=await sameTaskClick(orthographyCheck());expectOneCorrect(receipt);assert.equal(await orthographyInput().isDisabled(),true);
 await page.evaluate(()=>ReactDOM.flushSync(()=>window.__qa.change('dog','mapping')));await page.getByRole('button',{name:'Empty Slot 1',exact:true}).waitFor();await page.waitForTimeout(650);
 assert.equal(await page.evaluate(()=>window.__qa.history.length),1);assert.equal(await page.evaluate(()=>window.__qa.word),'dog');
 await close('orthography immediate and switch');pass('Sight & Spell scores synchronously, locks edits, and switching activities cannot apply an old delayed answer');
}
async function orthographyRetry(){
 await boot('orthography');await orthographyInput().fill('   ');assert.equal(await orthographyCheck().isDisabled(),true);await orthographyInput().press('Enter');assert.equal(await page.evaluate(()=>window.__qa.score.total),0);
 await orthographyInput().fill('cut');const wrong=await sameTaskClick(orthographyCheck());assert.equal(wrong.score.total,0);assert.equal(wrong.history.length,0);
 await orthographyInput().fill('cat');const receipt=await sameTaskClick(orthographyCheck());expectOneCorrect(receipt,2);
 await close('orthography retry');pass('Sight & Spell ignores blanks and duplicate misses while allowing a corrected retry');
}
async function mappingImmediate(){
 await boot('mapping');await mappingChip('c').click();await mappingChip('a').click();const receipt=await sameTaskClick(mappingChip('t'));expectOneCorrect(receipt);
 for(const text of ['Slot 1: c','Slot 2: a','Slot 3: t'])assert.equal(await page.getByRole('button',{name:text,exact:true}).isDisabled(),true);
 await page.evaluate(()=>ReactDOM.flushSync(()=>window.__qa.change('dog','orthography')));await orthographyInput().waitFor();await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.__qa.history.length),1);
 await close('mapping immediate and switch');pass('Sound Mapping grades the completed arrangement immediately, locks slots, and does not grade after switching');
}
async function mappingRetryAndRevision(){
 await boot('mapping');await mappingChip('t').click();await mappingChip('a').click();const wrong=await sameTaskClick(mappingChip('c'));assert.equal(wrong.score.total,0);assert.equal(wrong.history.length,0);
 await page.getByRole('button',{name:'Slot 1: t',exact:true}).click();await page.getByRole('button',{name:'Slot 3: c',exact:true}).click();await mappingChip('c').click();const right=await sameTaskClick(mappingChip('t'));expectOneCorrect(right,2);
 await close('mapping corrected retry');pass('Sound Mapping permits tile corrections after one wrong arrangement and records the corrected second attempt');
 await boot('mapping');await mappingChip('c').click();await page.evaluate(()=>ReactDOM.flushSync(()=>window.__qa.editData({graphemes:['ca','t'],phonemes:['k','a','t']})));await page.getByRole('button',{name:'Empty Slot 2',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Empty Slot 3',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Slot 1: c',exact:true}).count(),0);
 await mappingChip('ca').click();const revision=await sameTaskClick(mappingChip('t'));expectOneCorrect(revision);
 await close('mapping same word grapheme revision');pass('Sound Mapping clears stale placed tiles when the same word receives a revised grapheme board');
}
async function fillTrace(){
 await tracingCanvas().evaluate(canvas=>{const mask=document.querySelector('canvas[aria-hidden="true"]'),context=canvas.getContext('2d'),data=mask.getContext('2d').getImageData(0,0,mask.width,mask.height);for(let i=0;i<data.data.length;i+=4){if(data.data[i+3]){data.data[i]=80;data.data[i+1]=20;data.data[i+2]=150;}}context.putImageData(data,0,0);});
}
async function traceSubmit(){await fillTrace();const receipt=await sameTaskClick(tracingCheck());assert.equal(receipt.disabled,true,'accepted tracing immediately disables Check');assert.equal(await page.getByRole('button',{name:label('word_sounds','word_scramble_clear','Clear'),exact:true}).isDisabled(),true,'accepted tracing disables Clear');assert.equal(await tracingCanvas().evaluate(canvas=>{const before=canvas.toDataURL(),rect=canvas.getBoundingClientRect();for(const [type,x,y]of [['mousedown',15,15],['mousemove',80,80],['mouseup',80,80]])ReactDOM.flushSync(()=>canvas.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:rect.left+x,clientY:rect.top+y})));return canvas.toDataURL()===before;}),true,'accepted tracing blocks further ink edits');return receipt;}
const feedbackPlays=()=>page.evaluate(()=>window.__qa.audioEvents.filter(e=>e.type==='play-call'&&e.label.startsWith('instruction:')));
async function waitTraceLabel(letter){await page.waitForFunction(letter=>document.querySelector('canvas[role="img"]')?.getAttribute('aria-label')?.includes(' '+letter+'.'),letter);}
async function tracingOrdered(){
 await page.setViewportSize({width:390,height:844});await boot('letter_tracing');await page.screenshot({path:path.join(out,'tracing-upper-390.png'),fullPage:true});await traceSubmit();
 await page.waitForFunction(()=>window.__qa.audioEvents.some(e=>e.type==='ended'&&e.label==='instruction:now_try_lowercase'));
 await waitTraceLabel('c');const events=await page.evaluate(()=>window.__qa.audioEvents);const praise=events.filter(e=>e.type==='play-call'&&e.label==='instruction:fb_great_job'),lower=events.filter(e=>e.type==='play-call'&&e.label==='instruction:now_try_lowercase');assert.equal(praise.length,1);assert.equal(lower.length,1);const praiseEnd=events.find(e=>e.type==='ended'&&e.id===praise[0].id);assert.ok(praiseEnd&&lower[0].at>=praiseEnd.at,'lowercase instruction must await praise completion');
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(out,'tracing-lower-1280.png'),fullPage:true});await traceSubmit();await page.waitForFunction(()=>window.__qa.history.length===1);
 const row=await page.evaluate(()=>window.__qa.history[0]);assert.equal(row.practiceOnly,true);assert.equal(row.activity,'letter_tracing');assert.ok(row.formationScore>=70);
 await close('tracing ordered completion');pass('Tracing plays one praise then one lowercase prompt, suppresses duplicate checks, and records one practice completion');
}
async function tracingSkip(){
 await boot('letter_tracing');await traceSubmit();await waitTraceLabel('c');
 const receipt=await sameTaskClick(page.getByRole('button',{name:label('word_sounds','skip_lowercase','Skip lowercase →'),exact:true}));expectOneCorrect(receipt);assert.equal(receipt.history[0].practiceOnly,true);assert.ok(receipt.history[0].formationScore>=70,'skipping lowercase retains the accepted uppercase formation score');
 await close('tracing lowercase skipped');pass('Skipping the optional lowercase trace records one practice completion with the uppercase formation score');
}
async function tracingCancel(kind){
 await boot('letter_tracing');await traceSubmit();await page.waitForFunction(()=>window.__qa.audioEvents.some(e=>e.type==='play-call'&&e.label==='instruction:fb_great_job'));
 const before=await page.evaluate(()=>window.__qa.audioEvents.length);
 await page.evaluate(kind=>ReactDOM.flushSync(()=>window.__qa.change('dog',kind==='activity'?'orthography':'letter_tracing')),kind);
 if(kind==='activity')await orthographyInput().waitFor();else await waitTraceLabel('D');
 await page.waitForTimeout(1800);
 const late=await page.evaluate(before=>window.__qa.audioEvents.slice(before).filter(e=>e.type==='play-call'),before);assert.equal(late.filter(e=>e.label==='instruction:now_try_lowercase').length,0);assert.equal(await page.evaluate(()=>window.__qa.history.length),0);if(kind==='word')await waitTraceLabel('D');
 await close('tracing cancel '+kind);pass('Tracing cancels old praise continuation after changing '+kind+' without stale lowercase audio or completion');
}
async function tracingUnmount(){
 await boot('letter_tracing');await traceSubmit();await page.waitForFunction(()=>window.__qa.audioEvents.some(e=>e.type==='play-call'&&e.label==='instruction:fb_great_job'));await snapshot('tracing before unmount');
 await page.evaluate(()=>{window.__qa.beforeUnmount=window.__qa.audioEvents.length;window.__qa.root.unmount();});await page.waitForTimeout(1800);
 const late=await page.evaluate(()=>window.__qa.audioEvents.slice(window.__qa.beforeUnmount).filter(e=>e.type==='play-call'));assert.equal(late.length,0);assert.equal(await page.evaluate(()=>window.__qa.history.length),0);await snapshot('tracing after unmount');pass('Closing tracing cancels pending completion audio and history writes');
}
async function run(){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true,timeout:120000,args:['--autoplay-policy=no-user-gesture-required']});const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();externalRequests.push(url);return route.abort();});page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(consoleMessages.length<200)consoleMessages.push(msg.text());});await segmentationAliases();await segmentationRetry();await orthographyImmediate();await orthographyRetry();await mappingImmediate();await mappingRetryAndRevision();await tracingOrdered();await tracingSkip();await tracingCancel('activity');await tracingCancel('word');await tracingUnmount();assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);assert.ok(runs.every(run=>!run.gemini.length));assert.equal(checks.length,12);}
run().catch(async error=>{console.error(error.stack||error);process.exitCode=1;errors.push(String(error.stack||error));if(page)try{await snapshot('failure');await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'failure-dom.txt'),await page.locator('body').innerText());}catch(_){};}).finally(async()=>{const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,externalRequests,runs,consoleMessages,runtimeSha256:hash('word_sounds_module.js'),voiceSha256:hash('voice_module.js'),limitations:['Controlled local React host with production runtime/CSS validates grading, retry and navigation ownership.','Tracing fixture paints deterministic complete ink and invokes the real production formation scorer; human pointer accuracy is not assessed.','Native audio uses local banks. No physical microphone, live provider generation or pronunciation quality is assessed.']},null,2));if(browser)await browser.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:checks.length,errors:errors.length,externalRequests:externalRequests.length,out}));});
