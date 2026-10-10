const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const integrated=process.argv.includes('--repo');
const repo=integrated ? process.cwd() : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const {JSDOM}=require(repo+'/node_modules/jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
global.window=dom.window;global.document=dom.window.document;Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require(repo+'/desktop/web-app/node_modules/react');
const {createRoot}=require(repo+'/desktop/web-app/node_modules/react-dom/client');
const act=React.act||require(repo+'/desktop/web-app/node_modules/react-dom/test-utils').act;
const ctx={module:{exports:{}},React,window:dom.window,navigator:dom.window.navigator,document:dom.window.document,console,Buffer,Uint8Array,Blob,Error,Number,Math,btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout:(fn,ms)=>setTimeout(fn,ms===350?0:ms),clearTimeout};
const played=[];
class Audio{constructor(src){this.src=src;this.ended=false;this.paused=true;}play(){this.paused=false;played.push(this);return Promise.resolve();}pause(){this.paused=true;this.onpause?.();}finish(){this.ended=true;this.paused=true;this.onpause?.();this.onended?.();}}
ctx.Audio=Audio;
class OfflineAudioContext{async decodeAudioData(){return{duration:.4,numberOfChannels:1,getChannelData:()=>new Float32Array([.1])};}}
dom.window.OfflineAudioContext=OfflineAudioContext;
vm.createContext(ctx);vm.runInContext(fs.readFileSync(repo+'/word_sounds_core.js','utf8')+'\nglobalThis.WS_CORE=createWordSoundsCore();',ctx);
let runtime=fs.readFileSync(repo+'/word_sounds_module.js','utf8');if(!integrated)runtime=require('./transport-transform.cjs').runtime(runtime);
const libraryStart=runtime.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY');
const editorStart=runtime.indexOf('// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR');
const editor=runtime.slice(libraryStart>=0?libraryStart:editorStart,runtime.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR'));
vm.runInContext(editor+'\nglobalThis.Editor=WordSoundsSyllableRecordingEditor;globalThis.stopForRuntime=()=>wordSoundsSyllableEditorPlayback?.stop();',ctx);
const pcm=Buffer.alloc(100);pcm.write('RIFF',0);pcm.write('WAVE',8);
const file={size:100,type:'audio/wav',arrayBuffer:async()=>pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.length)};
let root=createRoot(document.getElementById('root'));let saved=null;
const delay=()=>new Promise(resolve=>setTimeout(resolve,5));
const button=(text)=>[...document.querySelectorAll('button')].find(el=>el.textContent===text);
const reviewCheckbox=()=>[...document.querySelectorAll('label')].find(el=>el.textContent.includes('I listened to the sequence')).querySelector('input');
async function event(node,type){await act(async()=>{node.dispatchEvent(new dom.window.Event(type,{bubbles:true}));await delay();});}
async function changeValue(node,value){await act(async()=>{const prototype=node.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await delay();});}
async function run(){
 await act(async()=>root.render(React.createElement(ctx.Editor,{word:'banana',language:'en',onSave:task=>{saved=task;}})));
 await changeValue(document.querySelector('select'),'3');
 assert.equal(document.querySelectorAll('input[type=file][accept="audio/*"]').length,3);
 const labels=[...document.querySelectorAll('input:not([type])')];
 for(let i=0;i<3;i++){await changeValue(labels[i],['ba','na','na'][i]);const input=document.querySelectorAll('input[type=file][accept="audio/*"]')[i];Object.defineProperty(input,'files',{value:[file],configurable:true});await event(input,'change');}
 assert.equal(button('Save reviewed syllables').disabled,true);
 assert.equal(reviewCheckbox().disabled,true);
 assert.equal(button('Preview syllables in order').disabled,false);
 await event(button('Preview syllables in order'),'click');
 assert.equal(played.length,1);assert.equal(button('Save reviewed syllables').disabled,true);
 for(let i=0;i<3;i++){await act(async()=>{played[i].finish();await delay();});}
 assert.equal(played.length,3);assert.equal(reviewCheckbox().disabled,false);
 assert.equal(button('Save reviewed syllables').disabled,true);
 await act(async()=>{reviewCheckbox().click();await delay();});
 assert.equal(button('Save reviewed syllables').disabled,false);
 await event(button('Save reviewed syllables'),'click');
 assert.ok(saved);assert.equal(saved.audioUnits.length,3);assert.equal(ctx.WS_CORE.reviewedSyllableReady(saved),true);
 await changeValue(document.querySelector('input:not([type])'),'changed');
 assert.equal(button('Save reviewed syllables').disabled,true);assert.equal(reviewCheckbox().checked,false);
 await event(button('Preview syllables in order'),'click');
 assert.equal(played.length,4);
 await act(async()=>root.render(React.createElement(ctx.Editor,{word:'tomato',language:'en',onSave:()=>{throw Error('stale save');}})));
 assert.equal(played[3].paused,true);assert.equal(button('Save reviewed syllables').disabled,true);
 await act(async()=>root.unmount());
 console.log('PASS recording editor DOM: three uploads, ordered completion with native pause-before-ended, explicit review/save, edits revoke review, word change cancels');
 // Failure after microphone acquisition must release the device both when
 // MediaRecorder construction fails and when capture.start() fails.
 let stopped=0;
 Object.defineProperty(dom.window.navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})}});
 for(const failure of['construct','start']){
  ctx.MediaRecorder=class{constructor(){if(failure==='construct')throw Error('unsupported');}start(){throw Error('cannot start');}};
  root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(ctx.Editor,{word:'banana',language:'en',onSave(){}})));
  await event(button('Record syllable 1'),'click');
  assert.equal(stopped,failure==='construct'?1:2);assert.equal(button('Record syllable 1').disabled,false);
  await act(async()=>root.unmount());
 }
 console.log('PASS microphone construction/start failures release acquired tracks');
 delete ctx.MediaRecorder;
 const other=JSON.parse(JSON.stringify(saved));other.targetWord='tomato';
 const second=ctx.WS_CORE.createReviewedSyllableTask({targetWord:'tomato',language:'en',syllables:saved.syllables,assets:saved.audioUnits.map(unit=>unit.asset),revision:7,reviewed:true});
 root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement('div',null,React.createElement(ctx.Editor,{word:'banana',language:'en',board:saved,onSave(){}}),React.createElement(ctx.Editor,{word:'tomato',language:'en',board:second,onSave(){}}))));
 const previews=[...document.querySelectorAll('button')].filter(el=>el.textContent==='Preview syllables in order');
 await event(previews[0],'click');const first=played[played.length-1];assert.equal(first.paused,false);
 await event(previews[1],'click');const next=played[played.length-1];assert.equal(first.paused,true);assert.equal(next.paused,false);assert.equal(previews[0].disabled,false);
 await act(async()=>{ctx.stopForRuntime();await delay();});assert.equal(next.paused,true);assert.equal(previews[1].disabled,false);
 // Use the exact audible-start hook from production, including its enclosing
 // playImmediately guard, to verify silent preloads do not stop an editor.
 assert.match(runtime,/if \(playImmediately\) \{\s*if \(typeof wordSoundsSyllableEditorPlayback !== 'undefined'\) wordSoundsSyllableEditorPlayback\?\.stop\(\);\s*lastAudioRef/);
 await act(async()=>root.unmount());
 console.log('PASS two editors share playback ownership; runtime Hear stops preview; hook remains inside audible-only branch');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{dom.window.close();});
