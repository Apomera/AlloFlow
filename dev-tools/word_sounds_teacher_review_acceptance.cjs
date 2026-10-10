/* Native Chromium acceptance of the real teacher review modules. Audio decode,
   upload, playback and React are real; generation returns local bank fixtures. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.env.WORD_SOUNDS_QA_REPO || path.resolve(__dirname,'..');
const {chromium}=require(require.resolve('playwright',{paths:[repo]}));
const out=process.env.WORD_SOUNDS_QA_OUT || path.join(repo,'reports/word-sounds-teacher-review-local');fs.mkdirSync(out,{recursive:true});
const bank=JSON.parse(fs.readFileSync(path.join(repo,'audio_bank.json'))),extra=JSON.parse(fs.readFileSync(path.join(repo,'audio_bank_kokoro.json'))),wordBank=JSON.parse(fs.readFileSync(path.join(repo,'word_audio_kokoro_bank.json')));
const instructions={...bank.instructions,...extra.instructions},phonemes={...bank.phonemes,...extra.phonemes};
const keys=['sun','set','sunset','raindrop','cupcake','milkshake'];
const words=Object.fromEntries(keys.map(key=>[key,wordBank.words[key]]));
for(const [key,src]of Object.entries(words))assert.match(src||'',/^data:audio\//,key+' needs real bank audio');
const strings=JSON.parse(fs.readFileSync(path.join(repo,'ui_strings.js'),'utf8'));
const harness=fs.readFileSync(path.join(repo,'tests/helpers/word_sounds_harness.js'),'utf8');
const iconLine=harness.match(/const ICONS = \[[^;]+;/)[0];
const install=harness.slice(harness.indexOf('function installAmbientGlobals()'),harness.indexOf('/**\n * Load WordSoundsModal'));
const base=harness.slice(harness.indexOf('const passthroughT'),harness.indexOf('function scrub(')).replace('export function baseProps','function baseProps');
const ambient=`const React=window.React;const noop=()=>{};${iconLine}\n${install}\n${base}\ninstallAmbientGlobals();window.__baseProps=baseProps;window.AlloLanguageContext=React.createContext({});`;
const routes={
 '/react.js':path.join(repo,'desktop/web-app/node_modules/react/umd/react.development.js'),
 '/react-dom.js':path.join(repo,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'),
 '/pure.js':path.join(repo,'pure_helpers_module.js'),
 '/misc.js':path.join(repo,'misc_components_module.js'),
 '/readiness.js':path.join(repo,'word_sounds_readiness_contract.js'),
 '/runtime.js':path.join(repo,'word_sounds_module.js'),
};
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Word Sounds teacher review acceptance</title><style>body{font:16px system-ui;margin:16px}button,input,select{margin:4px}summary{padding:8px;cursor:pointer}[role=dialog]{max-width:1050px;margin:auto}section{border:1px solid #bbb;padding:12px}details{border:1px solid #ddd;margin:10px;padding:8px}</style></head><body><button id="qa-start">Open teacher review</button><div id="root"></div></body></html>';
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(routes[req.url]){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(routes[req.url]));return;}res.statusCode=404;res.end();});
let browser,page;const errors=[],checks=[];let report={};
function pass(name,details){checks.push({name,passed:true,...details});console.log('PASS '+name);}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,timeout:120000});page=await browser.newPage({viewport:{width:1365,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 for(const url of ['/react.js','/react-dom.js'])await page.addScriptTag({url});
 await page.addScriptTag({content:ambient});
 await page.evaluate(({words,instructions,phonemes,strings})=>{
  const q=window.__qa={stage:'initial',synthesis:[],gemini:[],events:[],audios:[],overlaps:[],writes:[],options:['cupcake','sunset','raindrop','milkshake']};
  window.__ALLO_INSTRUCTION_AUDIO=instructions;window.__ALLO_PHONEME_AUDIO_BANK=phonemes;window._CACHE_WORD_AUDIO_BANK=words;window.loadWordAudioBank=async()=>words;window.loadAudioBank=async()=>{};
  const NativeAudio=window.Audio;
  window.Audio=function(...args){const el=new NativeAudio(...args);el.__qaId=q.audios.length;q.audios.push(el);for(const type of ['playing','pause','ended','loadedmetadata','error'])el.addEventListener(type,()=>{q.events.push({id:el.__qaId,type,at:performance.now(),duration:Number.isFinite(el.duration)?el.duration:null});if(type==='playing'&&q.audios.some(other=>other!==el&&!other.paused&&!other.ended))q.overlaps.push(el.__qaId);});return el;};window.Audio.prototype=NativeAudio.prototype;
  const lookup=(key,params={})=>{const [section,name]=key.split('.');let result=strings[section]?.[name];if(typeof result!=='string')return '';for(const [name,value]of Object.entries(params))result=result.replaceAll('{'+name+'}',String(value));return result;};
  const asset=src=>{const m=src.match(/^data:([^;,]+);base64,(.+)$/);return {mime:m[1],base64:m[2]};};
  document.getElementById('qa-start').addEventListener('click',()=>{
   function Host(){
    const [initial]=React.useState(()=>({word:'sunset',targetWord:'sunset',phonemes:['s','u','n','s','e','t'],phonemeCount:6,syllables:['sun','set'],_preparedActivities:['syllable_blending'],_studentPackVersion:2,_ttsRequiredKeys:['sunset','sun','set',...q.options],activityItems:{syllable_blending:{syllables:['sun','set'],options:[...q.options],teacherEdited:true}},_ttsAssets:Object.fromEntries(Object.entries(words).filter(([key])=>key!=='set').map(([key,src])=>[key,{...asset(src),...(key==='sunset'?{}:{provenance:{version:1,source:key==='cupcake'?'synthesized':'recorded_bank',provider:key==='cupcake'?'gemini':'kokoro',resolvedVoice:key==='cupcake'?'Kore':'af_heart',language:'en'}})}]))}));
    const [defaults]=React.useState(()=>window.__baseProps('syllable_blending'));
    const [word,setWord]=React.useState(initial.word),[data,setData]=React.useState(initial),[act,setAct]=React.useState('syllable_blending'),[feedback,setFeedback]=React.useState(null),[preloaded,setPreloaded]=React.useState([initial]);
    const setWords=React.useCallback(update=>setPreloaded(previous=>{const next=typeof update==='function'?update(previous):update;q.writes.push({stage:q.stage,words:next});return next;}),[]);
    const synth=React.useCallback(async(text,voice,speed,opts={})=>{q.synthesis.push({stage:q.stage,text,voice,force:opts.force,allowProviderFallback:opts.allowProviderFallback});opts.onResolvedProfile?.({provider:'kokoro',resolvedVoice:voice,language:'en'});return words[String(text).toLowerCase()]||words.sun;},[]);
    const gemini=React.useCallback(async(...args)=>{q.gemini.push(args);throw Error('Unexpected cloud generation in local UI acceptance');},[]);
    const props={...defaults,t:lookup,getWordSoundsString:(_t,key,params)=>lookup(key,params),currentWordSoundsWord:word,setCurrentWordSoundsWord:setWord,wordSoundsPhonemes:data,setWordSoundsPhonemes:setData,wordSoundsActivity:act,setWordSoundsActivity:setAct,wordSoundsFeedback:feedback,setWordSoundsFeedback:setFeedback,wsPreloadedWords:preloaded,setWsPreloadedWords:setWords,isTeacherMode:true,isProbeMode:false,isMinimized:false,initialShowReviewPanel:true,initialActivitySequence:['syllable_blending'],selectedVoice:'af_heart',wordSoundsLanguage:'English',playInstructions:false,allowRuntimeAi:true,callTTS:synth,callGemini:gemini,callImagen:null,wordSoundsAudioLibrary:words};
    q.props=props;q.preloaded=preloaded;q.current=data;return React.createElement(window.AlloModules.WordSoundsModal,props);
   }
   q.root=ReactDOM.createRoot(document.getElementById('root'));q.root.render(React.createElement(Host));
  });
 },{words,instructions,phonemes,strings});
 for(const url of ['/pure.js','/misc.js','/readiness.js','/runtime.js'])await page.addScriptTag({url});
 await page.locator('#qa-start').click();
 const panel=page.getByRole('region',{name:'Prepared lesson audio and repair'});
 await panel.waitFor({state:'visible',timeout:30000});assert.deepEqual(errors,[]);
 pass('real WordSoundsModal and MiscComponents render the maintenance panel');
 await panel.locator('summary').click();await panel.getByLabel('Show',{exact:false}).selectOption('all');
 assert.ok((await panel.innerText()).includes('gemini · Kore · generated speech'));assert.ok((await panel.innerText()).includes('Saved audio · voice/source unknown'));assert.ok((await panel.innerText()).includes('kokoro · af_heart · recording bank'));
 await panel.getByRole('button',{name:'Select clips with another voice or language',exact:true}).click();
 assert.deepEqual(await panel.locator('input[type=checkbox]:checked').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),['Select audio for cupcake']);
 pass('clip source labels distinguish known, unknown and mismatched voices');
 await page.evaluate(()=>{const q=window.__qa;q.beforeRevision=q.preloaded;q.props.setWsPreloadedWords(items=>items.map(item=>({...item,_runtimeAudioReady:true})));});
 await page.waitForFunction(()=>window.__qa.preloaded!==window.__qa.beforeRevision);
 await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
 assert.deepEqual(await panel.locator('input[type=checkbox]:checked').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),['Select audio for cupcake']);
 pass('selected clip survives an incidental readiness update to the prepared words');
 const unchangedAssets=await page.evaluate(()=>Object.fromEntries(Object.entries(window.__qa.preloaded[0]._ttsAssets).filter(([key])=>key!=='cupcake')));
 await page.evaluate(()=>{window.__qa.stage='replace';});await panel.getByRole('button',{name:'Regenerate selected (1)',exact:true}).click();
 await page.waitForFunction(()=>window.__qa.preloaded[0]._ttsAssets.cupcake.provenance.resolvedVoice==='af_heart',{},{timeout:30000});
 const replacement=await page.evaluate(()=>({calls:window.__qa.synthesis.filter(row=>row.stage==='replace'),options:window.__qa.preloaded[0].activityItems.syllable_blending.options}));
 assert.equal(replacement.calls.length,1);assert.equal(replacement.calls[0].text,'cupcake');assert.equal(replacement.calls[0].voice,'af_heart');assert.equal(replacement.calls[0].allowProviderFallback,false);assert.deepEqual(replacement.options,['cupcake','sunset','raindrop','milkshake']);
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(window.__qa.preloaded[0]._ttsAssets).filter(([key])=>key!=='cupcake'))),unchangedAssets);
 pass('selected regeneration updates one clip with strict Kokoro and retains authored choices');
 await page.evaluate(()=>{window.__qa.stage='repair';});await panel.getByRole('button',{name:'Repair prepared lesson',exact:true}).click();
 await page.waitForFunction(()=>window.__qa.preloaded[0].activityItems.syllable_blending.contentStatus==='curated_compound'&&window.__qa.preloaded[0]._ttsAssets.set,{},{timeout:30000});
 assert.deepEqual(await page.evaluate(()=>window.__qa.preloaded[0].activityItems.syllable_blending.options),['cupcake','sunset','raindrop','milkshake']);
 pass('prepared lesson repair upgrades legacy syllables and fills audio without replacing choices');
 await page.locator('[aria-controls="word-sounds-details-0"]').click();const editor=page.locator('#ws-syllables-0');await editor.locator(':scope > summary').click();
 await editor.getByLabel('Syllable 1 label',{exact:false}).fill('sun');await editor.getByLabel('Syllable 2 label',{exact:false}).fill('set');
 for(let index=0;index<2;index++){
  const key=['sun','set'][index],m=words[key].match(/^data:([^;,]+);base64,(.+)$/);
  await editor.getByLabel('Upload syllable '+(index+1),{exact:false}).setInputFiles({name:key+'.wav',mimeType:m[1],buffer:Buffer.from(m[2],'base64')});
  await editor.getByRole('button',{name:'Hear syllable '+(index+1),exact:true}).waitFor();
  await page.waitForFunction(index=>{const root=document.getElementById('ws-syllables-0');const button=[...root.querySelectorAll('button')].find(b=>b.textContent==='Hear syllable '+(index+1));return button&&!button.disabled;},index,{timeout:15000});
 }
 assert.equal(await editor.getByRole('button',{name:'Save reviewed syllables',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{window.__qa.stage='preview';});await editor.getByRole('button',{name:'Preview syllables in order',exact:true}).click();
 const confirmation=editor.getByRole('checkbox',{name:/I listened to the sequence/});await page.waitForFunction(()=>[...document.querySelectorAll('#ws-syllables-0 label')].some(label=>label.textContent.includes('I listened to the sequence')&&!label.querySelector('input').disabled),{},{timeout:30000});
 assert.equal(await editor.getByRole('button',{name:'Save reviewed syllables',exact:true}).isDisabled(),true);await confirmation.check();await editor.getByRole('button',{name:'Save reviewed syllables',exact:true}).click();
 await page.waitForFunction(()=>window.__qa.preloaded[0].activityItems.syllable_blending.contentStatus==='teacher_recorded',{},{timeout:10000});
 const saved=await page.evaluate(()=>({task:window.__qa.preloaded[0].activityItems.syllable_blending,current:window.__qa.current,events:window.__qa.events,overlaps:window.__qa.overlaps,gemini:window.__qa.gemini}));
 report={checks,errors,events:saved.events,overlaps:saved.overlaps,task:saved.task,currentItem:saved.current,synthesis:await page.evaluate(()=>window.__qa.synthesis)};
 assert.equal(saved.task.audioUnits.length,2);assert.deepEqual(saved.task.syllables,['sun','set']);assert.deepEqual(saved.task.options,['cupcake','sunset','raindrop','milkshake']);assert.ok(saved.task.audioUnits.every(u=>u.asset.decoded&&u.asset.durationSeconds>0));assert.deepEqual(saved.overlaps,[]);assert.deepEqual(saved.gemini,[]);assert.ok(saved.events.filter(e=>e.type==='ended').length>=2);
 assert.equal(await panel.getByText('Teacher-reviewed recording',{exact:true}).count(),2);for(const number of [1,2])assert.equal(await panel.getByRole('checkbox',{name:'Select audio for sunset · syllable '+number,exact:true}).isDisabled(),true);
 pass('real uploads decode, preview sequentially, require review, and save embedded syllables to lifted words',{activeItemHadTarget:!!saved.current?.targetWord,currentItemUpdated:saved.current?.activityItems?.syllable_blending?.contentStatus==='teacher_recorded'});
 await page.screenshot({path:path.join(out,'teacher-review-saved.png'),fullPage:true});
 report={checks,errors,events:saved.events,overlaps:saved.overlaps,task:saved.task,currentItem:saved.current,synthesis:await page.evaluate(()=>window.__qa.synthesis)};
 await page.evaluate(()=>{window.__qa.stage='start';});await page.getByRole('button',{name:'Start Activity',exact:true}).click();
 await page.waitForFunction(()=>window.__qa.current?.activityItems?.syllable_blending?.contentStatus==='teacher_recorded',{},{timeout:20000});
 const delivered=await page.evaluate(()=>({current:window.__qa.current,events:window.__qa.events,overlaps:window.__qa.overlaps,gemini:window.__qa.gemini}));
 assert.deepEqual(delivered.current.activityItems.syllable_blending.options,['cupcake','sunset','raindrop','milkshake']);assert.deepEqual(delivered.current.activityItems.syllable_blending.audioUnits,saved.task.audioUnits);assert.deepEqual(delivered.overlaps,[]);assert.deepEqual(delivered.gemini,[]);
 pass('Start Activity delivers the saved recordings and authored choice order to the current item');
 report={...report,events:delivered.events,overlaps:delivered.overlaps,currentItem:delivered.current};
 await page.evaluate(()=>window.__qa.root.unmount());assert.deepEqual(errors,[]);
}
run().catch(async error=>{console.error(error.stack||error);process.exitCode=1;report={...report,checks,errors,error:error.stack||String(error)};if(page&&!page.isClosed()){report.text=await page.locator('body').innerText();report.state=await page.evaluate(()=>({synthesis:window.__qa?.synthesis,gemini:window.__qa?.gemini,events:window.__qa?.events,overlaps:window.__qa?.overlaps,writes:window.__qa?.writes.map(row=>({stage:row.stage,keys:Object.keys(row.words?.[0]||{}),options:row.words?.[0]?.activityItems?.syllable_blending?.options})),currentTarget:window.__qa?.current?.targetWord,currentStatus:window.__qa?.current?.activityItems?.syllable_blending?.contentStatus}));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});}}).finally(async()=>{if(browser)await browser.close();server.close();report.hashes=Object.fromEntries(['/runtime.js','/misc.js','/readiness.js'].map(key=>[key,crypto.createHash('sha256').update(fs.readFileSync(routes[key])).digest('hex')]));report.limits='Real browser React, native audio decoding/playback and local bank uploads. Speech-generation responses are mocked with bank fixtures; no microphone or cloud generation; no pronunciation assessment or full production app layout evaluation.';fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));});
