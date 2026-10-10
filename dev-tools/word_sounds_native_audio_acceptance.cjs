/* Real Chromium media acceptance checks. Audio.play/load/events are native.
   Only unrelated host services are stubbed. No model/network synthesis. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=process.env.WORD_SOUNDS_QA_REPO || path.resolve(__dirname,'..');
const moduleFile=process.env.WORD_SOUNDS_QA_MODULE || path.join(repo,'word_sounds_module.js');
const {chromium}=require(require.resolve('playwright',{paths:[repo]}));
const out=process.env.WORD_SOUNDS_QA_OUT || path.join(repo,'reports/word-sounds-native-audio-local');fs.mkdirSync(out,{recursive:true});
const bank=JSON.parse(fs.readFileSync(path.join(repo,'audio_bank.json'))),extra=JSON.parse(fs.readFileSync(path.join(repo,'audio_bank_kokoro.json'))),wordBank=JSON.parse(fs.readFileSync(path.join(repo,'word_audio_kokoro_bank.json')));
const instructions={...bank.instructions,...extra.instructions};
const selectedWords=['corn','tin','cat','sun','set','sunset','raincoat','cupcake','backpack'];
const words=Object.fromEntries(selectedWords.filter(k=>typeof wordBank.words[k]==='string').map(k=>[k,wordBank.words[k]]));
const phonemes={...bank.phonemes,...extra.phonemes};
const strings=JSON.parse(fs.readFileSync(path.join(repo,'ui_strings.js'),'utf8')).word_sounds;
const harness=fs.readFileSync(path.join(repo,'tests/helpers/word_sounds_harness.js'),'utf8');
const iconLine=harness.match(/const ICONS = \[[^;]+;/)[0];
const install=harness.slice(harness.indexOf('function installAmbientGlobals()'),harness.indexOf('/**\n * Load WordSoundsModal'));
const base=harness.slice(harness.indexOf('const passthroughT'),harness.indexOf('function scrub(')).replace('export function baseProps','function baseProps');
const ambient=`const React=window.React; const noop=()=>{}; ${iconLine}\n${install}\n${base}\ninstallAmbientGlobals();window.__baseProps=baseProps;`;
const routes={
 '/react.js':path.join(repo,'desktop/web-app/node_modules/react/umd/react.development.js'),
 '/react-dom.js':path.join(repo,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'),
 '/runtime.js':moduleFile,
 '/pure.js':path.join(repo,'pure_helpers_module.js'),
};
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Word Sounds real audio QA</title></head><body><button id="qa-start">Start playback check</button><div id="root"></div></body></html>');return;}if(routes[req.url]){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(routes[req.url]));return;}res.statusCode=404;res.end();});
const results=[];let browser,active;
async function setup(name,activity='counting',delay=0){
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&errors.length<20)errors.push(m.text());});active={page,name,errors};console.log('START '+name);
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.addScriptTag({url:'/react.js'});await page.addScriptTag({url:'/react-dom.js'});await page.addScriptTag({content:ambient});
 await page.evaluate(({instructions,words,phonemes,strings,activity,delay})=>{
   window.__qa={events:[],overlaps:[],audios:[],synthesis:[],activity,delay,errors:[]};
   window.__ALLO_INSTRUCTION_AUDIO=delay?{}:instructions;window.__ALLO_PHONEME_AUDIO_BANK=phonemes;window._CACHE_WORD_AUDIO_BANK=words;
   window.loadWordAudioBank=async()=>words;window.loadAudioBank=async()=>{};
   window.__qaClips={instructions,words,phonemes};window.__qaStrings=strings;
   const labels=new Map([...Object.entries(instructions).map(([k,v])=>[v,'instruction:'+k]),...Object.entries(words).map(([k,v])=>[v,'word:'+k]),...Object.entries(phonemes).map(([k,v])=>[v,'phoneme:'+k])]);
   const NativeAudio=window.Audio;
   window.Audio=function(...args){
     const el=new NativeAudio(...args);const q=window.__qa;el.__qaId=q.audios.length;q.audios.push(el);
     const log=type=>{const label=labels.get(el.currentSrc||el.src)||'other';q.events.push({type,id:el.__qaId,label,at:performance.now(),position:el.currentTime,duration:Number.isFinite(el.duration)?el.duration:null});if(type==='playing'){const other=q.audios.filter(a=>a!==el&&!a.paused&&!a.ended);if(other.length)q.overlaps.push({label,other:other.map(a=>labels.get(a.currentSrc||a.src)||'other')});}};
     for(const type of ['play','playing','pause','ended','error','loadedmetadata'])el.addEventListener(type,()=>log(type));
     return el;
   };
   window.Audio.prototype=NativeAudio.prototype;
   document.getElementById('qa-start').addEventListener('click',async()=>{
     const q=window.__qa;
     const React=window.React;
     function Host(){
       const [initial]=React.useState(()=>{const item=activity==='syllable_blending'?{word:'sunset',targetWord:'sunset',phonemes:['s','u','n','s','e','t'],phonemeCount:6}:{word:'corn',targetWord:'corn',phonemes:['k','or','n'],phonemeCount:3};item._studentPackVersion=2;item._ttsRequiredKeys=activity==='syllable_blending'?['sunset','sun','set']:[item.word];item._ttsAssets=Object.fromEntries(Object.entries(words).map(([key,src])=>{const match=src.match(/^data:([^;,]+);base64,(.+)$/);return [key,{mime:match[1],base64:match[2]}];}));return item;});
       const [baseProps]=React.useState(()=>window.__baseProps(activity));
       const [overrides,setOverrides]=React.useState({});window.__qaSet=setOverrides;
       const [word,setWord]=React.useState(initial.word),[data,setData]=React.useState(initial),[act,setAct]=React.useState(activity),[feedback,setFeedback]=React.useState(null),[score,setScore]=React.useState({correct:0,total:0,streak:0}),[level,setLevel]=React.useState(1),[preloaded,setPreloaded]=React.useState([initial]);
       window.__qaLoadWord=nextWord=>{const next={...initial,word:nextWord,targetWord:nextWord,phonemes:['t','i','n'],phonemeCount:3,_ttsRequiredKeys:[nextWord]};setWord(nextWord);setData(next);setPreloaded([next]);setFeedback(null);};
       const translate=React.useCallback((_t,key,params={})=>{let v=strings[key.replace('word_sounds.','')]||key;for(const [k,val]of Object.entries(params))v=v.replaceAll('{'+k+'}',String(val));return v;},[]);
       const unavailableTts=React.useCallback(async(text)=>{q.synthesis.push(text);return null;},[]);
       const props={...baseProps,currentWordSoundsWord:word,setCurrentWordSoundsWord:setWord,wordSoundsPhonemes:data,setWordSoundsPhonemes:setData,wordSoundsActivity:act,setWordSoundsActivity:setAct,wordSoundsFeedback:feedback,setWordSoundsFeedback:setFeedback,wordSoundsScore:score,setWordSoundsScore:setScore,wordSoundsLevel:level,setWordSoundsLevel:setLevel,wsPreloadedWords:preloaded,setWsPreloadedWords:setPreloaded,isTeacherMode:false,isProbeMode:false,isMinimized:false,playInstructions:true,wordSoundsAudioLibrary:words,selectedVoice:'af_heart',allowRuntimeAi:false,callTTS:unavailableTts,getWordSoundsString:translate,...overrides};
       window.__qaProps=props;return React.createElement(window.AlloModules.WordSoundsModal,props);
     }
     q.root=ReactDOM.createRoot(document.getElementById('root'));q.root.render(React.createElement(Host));
     if(delay)setTimeout(()=>{window.__ALLO_INSTRUCTION_AUDIO=instructions;window.dispatchEvent(new Event('audio_bank_loaded'));},delay);
   });
   window.__qaStop=async()=>{const q=window.__qa;q.root?.unmount();return {events:q.events,overlaps:q.overlaps,synthesis:q.synthesis};};
 },{instructions,words,phonemes,strings,activity,delay});
 await page.addScriptTag({url:'/pure.js'});await page.addScriptTag({url:'/runtime.js'});await page.locator('#qa-start').click({noWaitAfter:true,timeout:60000});
 active={page,name,errors};return active;
}
async function waitPlayed(page,label,count=1){await page.waitForFunction(({label,count})=>window.__qa.events.filter(e=>e.type==='playing'&&e.label===label).length>=count,{label,count},{timeout:30000});}
async function waitEnded(page,label,count=1){await page.waitForFunction(({label,count})=>window.__qa.events.filter(e=>e.type==='ended'&&e.label===label).length>=count,{label,count},{timeout:30000});}
async function finish(ctx,verify){const data=await ctx.page.evaluate(()=>window.__qaStop());data.pageErrors=ctx.errors;fs.writeFileSync(path.join(out,ctx.name+'.json'),JSON.stringify(data,null,2));assert.deepEqual(ctx.errors,[]);assert.deepEqual(data.overlaps,[]);assert.ok(data.events.some(e=>e.type==='loadedmetadata'&&e.duration>0),'browser must decode real audio');verify?.(data);results.push({name:ctx.name,passed:true,clips:data.events.filter(e=>e.type==='playing').map(e=>e.label)});await ctx.page.close();console.log('PASS '+ctx.name);}
async function run(){await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,timeout:120000});
 const only=process.argv.find(a=>a.startsWith('--case='))?.slice(7);const wants=name=>!only||only===name;let ctx;
 if(wants('cold-first-counting')){ctx=await setup('cold-first-counting','counting',700);await waitEnded(ctx.page,'word:corn');await finish(ctx,d=>assert.equal(new Set(d.events.filter(e=>e.type==='playing'&&e.label==='instruction:inst_counting').map(e=>e.id)).size,1));}
 if(wants('wrong-answer-sequence')){ctx=await setup('wrong-answer-sequence');await waitPlayed(ctx.page,'word:corn');await ctx.page.locator('[role="button"][aria-label="Number 1"]').click();await waitPlayed(ctx.page,'instruction:fb_try_again_listen');await waitEnded(ctx.page,'instruction:fb_try_again_listen');await waitPlayed(ctx.page,'word:corn',2);await finish(ctx);}
 if(wants('rapid-correct-response')){ctx=await setup('rapid-correct-response');await waitEnded(ctx.page,'word:corn');await ctx.page.locator('[role="button"][aria-label="Number 3"]').dblclick({delay:25});await ctx.page.waitForFunction(()=>window.__qa.events.some(e=>e.type==='playing'&&e.label.startsWith('instruction:fb_')));await ctx.page.waitForTimeout(350);await finish(ctx,d=>assert.equal(new Set(d.events.filter(e=>e.type==='playing'&&e.label.startsWith('instruction:fb_')).map(e=>e.id)).size,1));}
 if(wants('syllable-native-sequence')){ctx=await setup('syllable-native-sequence','syllable_blending');await waitEnded(ctx.page,'word:set');await finish(ctx,d=>{assert.deepEqual([...new Map(d.events.filter(e=>e.type==='playing').map(e=>[e.id,e.label])).values()],['instruction:inst_syllable_blending','word:sun','word:set']);const sunEnd=d.events.find(e=>e.type==='ended'&&e.label==='word:sun');const setStart=d.events.find(e=>e.type==='playing'&&e.label==='word:set');assert.ok(setStart.at-sunEnd.at>=300);});}
 if(wants('minimize-cancels')){ctx=await setup('minimize-cancels');await waitPlayed(ctx.page,'word:corn');await ctx.page.getByRole('button',{name:'common.minimize_to_background',exact:true}).click();await ctx.page.waitForTimeout(350);assert.equal(await ctx.page.evaluate(()=>window.__qa.audios.filter(a=>!a.paused&&!a.ended).length),0);await finish(ctx);}
 if(wants('manual-replay')){ctx=await setup('manual-replay');await waitEnded(ctx.page,'word:corn');await ctx.page.getByRole('button',{name:/play_word|Play word/i}).click();await waitEnded(ctx.page,'word:corn',2);await finish(ctx,d=>{assert.equal(d.events.filter(e=>e.type==='ended'&&e.label==='word:corn').length,2);assert.equal(new Set(d.events.filter(e=>e.type==='playing'&&e.label==='instruction:inst_counting').map(e=>e.id)).size,1);});}
 if(wants('lesson-change-cancels')){ctx=await setup('lesson-change-cancels');await waitPlayed(ctx.page,'word:corn');await ctx.page.evaluate(()=>window.__qaLoadWord('tin'));await waitEnded(ctx.page,'word:tin');await finish(ctx,d=>{const tinStart=d.events.find(e=>e.type==='playing'&&e.label==='word:tin');assert.ok(tinStart);assert.ok(!d.events.some(e=>e.type==='playing'&&e.label==='word:corn'&&e.at>tinStart.at));});}
}
run().catch(async e=>{console.error(e.stack||e);results.push({passed:false,error:e.stack||String(e)});process.exitCode=1;if(active&&!active.page.isClosed()){const debug=await active.page.evaluate(()=>({events:window.__qa.events,overlaps:window.__qa.overlaps,synthesis:window.__qa.synthesis,peak:window.__qa.peak,audios:window.__qa.audios.map(a=>({paused:a.paused,ended:a.ended,currentTime:a.currentTime,duration:a.duration,error:a.error&&{code:a.error.code,message:a.error.message}})),text:document.body.innerText.slice(0,5000)}));debug.pageErrors=active.errors;fs.writeFileSync(path.join(out,active.name+'-failure.json'),JSON.stringify(debug,null,2));console.log(JSON.stringify(debug,null,2));await active.page.screenshot({path:path.join(out,active.name+'-failure.png'),fullPage:true});}}).finally(async()=>{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,(process.argv.find(a=>a.startsWith('--case='))?.slice(7)||'all')+'-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),moduleSha:crypto.createHash('sha256').update(fs.readFileSync(moduleFile)).digest('hex'),limits:'Native browser audio and bank recordings; unrelated host services stubbed; no subjective pronunciation judgment or live TTS synthesis.',results},null,2));});
