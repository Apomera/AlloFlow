const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const installed = fs.existsSync(path.join(__dirname, '..', 'word_sounds_core.js'));
const root = installed ? path.resolve(__dirname, '..') : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const integrated = installed || process.argv.includes('--repo');
const transform = integrated ? null : require('./transform.cjs');
const read = (file, fn) => { const source = fs.readFileSync(path.join(root, file), 'utf8'); return integrated || !fn ? source : transform[fn](source); };
const coreSource = read('word_sounds_core.js', 'core'), runtime = read('word_sounds_module.js', 'runtime');
const core = vm.runInNewContext(coreSource + '\ncreateWordSoundsCore()', { atob, btoa, Buffer, Intl });
const plain = value => JSON.parse(JSON.stringify(value));
const wav = Buffer.alloc(4844); wav.write('RIFF'); wav.writeUInt32LE(4836, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4800, 40); for(let i=44;i<wav.length;i+=2) wav.writeInt16LE(Math.round(Math.sin(i/10)*3000),i);
const clip = {mime:'audio/wav',base64:wav.toString('base64')}, url='data:audio/wav;base64,'+clip.base64;
const asset=(language,voice='af_heart')=>({...clip,provenance:{provider:'kokoro',resolvedVoice:voice,language,source:'synthesized'}});
const fixture=()=>[{targetWord:'sunset',_ttsAssets:{sunset:asset('Spanish'),moonlight:asset('English','af_bella'),backpack:asset('en-US'),unknown:{...clip}},activityItems:{syllable_blending:{contentStatus:'teacher_recorded',targetWord:'sunset',audioUnits:[{key:'syllable:sunset:1:0',text:'sun',asset:clip}],options:['sunset','moonlight']}}}];
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
function actionHarness(words,tts,teacher=true){
 const state={words,applied:[],notices:[],refs:[]};
 state.render=(voice='af_heart',language='French (Canadian)')=>{
  let index=0;
  const context={WS_CORE:core,React:{useState:initial=>[initial,value=>state.notices.push(value)],useRef:initial=>state.refs[index++]||={current:initial},useEffect:()=>{}},wordSoundsPackInventory:(words,voice,language)=>core.packAudioInventory(words,voice,language),preloadedWords:state.words,selectedVoice:voice,wordSoundsLanguage:language,activitySequence:[],isTeacherMode:teacher,showReviewPanel:true,runtimeAiAllowed:true,callTTS:tts,isMountedRef:{current:true},packAudioInvalidatedRef:{current:new Set()},audioCache:{current:new Map()},audioInstances:{current:new Map()},ttsInflight:{current:new Map()},setPreloadedWords:next=>{state.words=typeof next==='function'?next(state.words):next;state.applied.push(state.words);},setWsPreloadedWords:()=>{},AbortController,setTimeout,clearTimeout,fetch,atob,Uint8Array,window:{OfflineAudioContext:class{async decodeAudioData(){return{duration:1,numberOfChannels:1,getChannelData:()=>new Float32Array([0,.05,-.04])};}}}};
  const start=runtime.indexOf('    const resolveWordSoundsReplacement ='),end=runtime.indexOf('    const WordSoundsReviewPanel =',start);
  const actionStart=runtime.indexOf('      const [packRepairState,'),actionEnd=runtime.indexOf('      const handleRegenerateWord =',actionStart);
  vm.runInNewContext(runtime.slice(start,end)+'\n'+runtime.slice(actionStart,actionEnd)+'\nthis.actions={run:handlePackAudioUpdate,cancel:cancelPackAudioUpdate};',context);state.actions=context.actions;
 };state.render();return state;
}
async function main(){
 await test('English aliases compare equally and explicit locales remain distinct',()=>{
  for(const language of ['English',' english ','en','EN_us','en-US'])assert.equal(core.packAudioLanguageKey(language),'en-us');
  assert.equal(core.packAudioLanguageKey('en_GB'),'en-gb');assert.notEqual(core.packAudioLanguageKey('en-GB'),core.packAudioLanguageKey('English'));
  for(const value of [undefined,null,42,{},[],true,'','  '])assert.equal(core.packAudioLanguageKey(value),'');
  assert.notEqual(core.packAudioLanguageKey('Navajo'),core.packAudioLanguageKey('English'));
 });
 await test('app friendly aliases and locale/dialect TTS provenance share identities',()=>{
  const extras=fs.readFileSync(path.join(root,'module_scope_extras_source.jsx'),'utf8'),start=extras.indexOf('    const map = {',extras.indexOf('const getSpeechLangCode =')),end=extras.indexOf('\n    };',start);
  const aliases=Function('return ('+extras.slice(start+'    const map = '.length,end)+'\n})')();
  for(const [name,locale]of Object.entries(aliases))assert.equal(core.packAudioLanguageKey(name),core.packAudioLanguageKey(locale),name);
  assert.equal(core.packAudioLanguageKey('french\u241ffr-ca\u241fcanadian'),'fr-ca');
  assert.equal(core.packAudioLanguageKey('French (Canadian)'),'fr-ca');
  assert.equal(core.packAudioLanguageKey('english\u241fen-us\u241f'),core.packAudioLanguageKey('English'));
  assert.notEqual(core.packAudioLanguageKey('english\u241fen-us\u241fsouthern'),core.packAudioLanguageKey('English'));
  assert.notEqual(core.packAudioLanguageKey('French (Canada)'),core.packAudioLanguageKey('French (France)'));
 });
 await test('language mismatch is independent of voice and unknown metadata stays unknown',()=>{
  const rows=core.packAudioInventory(fixture(),'af_heart','English'),get=key=>rows.find(row=>row.key===key);
  assert.equal(get('sunset').languageMismatch,true);assert.equal(get('sunset').voiceMismatch,false);assert.equal(get('sunset').mismatch,true);assert.match(get('sunset').label,/Language: Spanish.*different language/);
  assert.equal(get('moonlight').voiceMismatch,true);assert.equal(get('moonlight').languageMismatch,false);
  assert.equal(get('backpack').mismatch,false);assert.equal(get('backpack').unknown,false);
  assert.equal(get('unknown').unknownVoice,true);assert.equal(get('unknown').unknownLanguage,true);assert.equal(get('unknown').mismatch,false);
  assert.match(get('unknown').label,/voice\/source unknown.*language unknown/);
  assert.equal(get('syllable:sunset:1:0').regeneratable,false);
  const legacy=fixture();delete legacy[0]._ttsAssets.backpack.provenance.language;
  const row=core.packAudioInventory(legacy,'af_heart','English').find(row=>row.key==='backpack');assert.equal(row.unknownVoice,false);assert.equal(row.unknownLanguage,true);assert.equal(row.mismatch,false);
 });
 await test('language comparison does not invent a target when none is selected',()=>{
  const row=core.packAudioInventory(fixture(),'af_heart').find(row=>row.key==='sunset');assert.equal(row.languageMismatch,false);assert.equal(row.unknownLanguage,false);
 });
 await test('targeted replacement passes selected language and strict voice while preserving other audio',async()=>{
  let opts;const state=actionHarness(fixture(),async(text,voice,speed,options)=>{opts=options;options.onResolvedProfile({provider:'kokoro',resolvedVoice:voice,language:options.language});return url;});
  const old=state.words[0]._ttsAssets.moonlight;await state.actions.run('replace',['sunset']);
  assert.equal(opts.language,'French (Canadian)');assert.equal(opts.allowProviderFallback,false);assert.equal(opts.force,true);
  assert.equal(state.words[0]._ttsAssets.sunset.provenance.language,'French (Canadian)');assert.equal(state.words[0]._ttsAssets.moonlight,old);
 });
 await test('changing language during regeneration prevents stale replacement',async()=>{
  let finish;const state=actionHarness(fixture(),()=>new Promise(resolve=>{finish=resolve;}));
  const pending=state.actions.run('replace',['sunset']);state.render('af_heart','German');finish(url);await pending;assert.equal(state.applied.length,0);
 });
 await test('student and teacher-recording keys cannot invoke replacement synthesis',async()=>{
  let calls=0;const state=actionHarness(fixture(),async()=>{calls++;return url;},false);await state.actions.run('replace',['sunset']);assert.equal(calls,0);
  const teacher=actionHarness(fixture(),async()=>{calls++;return url;});await teacher.actions.run('replace',['syllable:sunset:1:0']);assert.equal(calls,0);
 });
 await test('real React review panel labels, shortcut and retained selection use actual inventory',async()=>{
  const {JSDOM}=require(path.join(root,'node_modules/jsdom'));const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
  const React=require(path.join(root,'desktop/web-app/node_modules/react')),ReactDOM=require(path.join(root,'desktop/web-app/node_modules/react-dom/client')), {act}=require(path.join(root,'desktop/web-app/node_modules/react-dom/test-utils'));
  const start=runtime.indexOf('    const WordSoundsPackMaintenance ='),end=runtime.indexOf('\n    // Force refresh',start);
  const Panel=vm.runInNewContext(runtime.slice(start,end)+'\nWordSoundsPackMaintenance',{React,WS_CORE:core,wordSoundsPackInventory:(words,voice,language)=>core.packAudioInventory(words,voice,language)});
  const host=document.getElementById('root'),view=ReactDOM.createRoot(host),calls=[];
  let props={words:fixture(),voice:'af_heart',language:'English',activities:[],busy:false,onAction:(...args)=>calls.push(args),onReviewSyllables:()=>{},onPlayAudio:()=>{}};
  const render=()=>act(()=>view.render(React.createElement(Panel,props)));
  const button=text=>Array.from(host.querySelectorAll('button')).find(node=>node.textContent===text);
  const click=node=>act(()=>node.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
  try{
   render();assert.match(host.textContent,/Selected language: English/);assert.match(host.textContent,/1 clips use another voice; 1 use another language/);assert.match(host.textContent,/no saved language information/);
   click(button('Select clips with another voice or language'));assert.ok(button('Regenerate selected (2)'));click(button('Regenerate selected (2)'));assert.deepEqual(plain(calls.pop()),['replace',['sunset','moonlight']]);
   props={...props,words:props.words.map(word=>({...word,teacherNote:'Updated'}))};render();assert.ok(button('Regenerate selected (2)'));
   props={...props,language:'Spanish'};render();assert.ok(button('Regenerate selected (0)').disabled);
   assert.equal(host.querySelector('input[aria-label="Select audio for sunset · syllable 1"]'),null); // valid recording is outside attention, never selected by shortcut
   const select=host.querySelector('select');act(()=>{select.value='all';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});assert.ok(host.querySelector('input[aria-label="Select audio for sunset · syllable 1"]').disabled);
  }finally{act(()=>view.unmount());dom.window.close();delete global.window;delete global.document;delete global.IS_REACT_ACT_ENVIRONMENT;}
 });
 await test('core and runtime staged changes parse',()=>{const parser=require(path.join(root,'node_modules/@babel/parser'));for(const source of [coreSource,runtime])parser.parse(source,{sourceType:'unambiguous',plugins:['jsx']});});
 console.log(JSON.stringify({passed,failed:0}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
