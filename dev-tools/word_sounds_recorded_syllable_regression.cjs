const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const integrated=process.argv.includes('--repo');
const repo=integrated ? process.cwd() : 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const babel=require(repo+'/node_modules/@babel/core');
const transform=integrated ? null : require('./transform.cjs');
const files={core:'word_sounds_core.js',runtime:'word_sounds_module.js',setup:'word_sounds_setup_source.jsx',readiness:'word_sounds_readiness_contract.js',misc:'misc_components_source.jsx'};
const sources={};let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
for(const [key,file]of Object.entries(files)){
 sources[key]=integrated ? fs.readFileSync(repo+'/'+file,'utf8') : transform[key](fs.readFileSync(repo+'/'+file,'utf8'));
 test(file+' parses',()=>babel.parseSync(sources[key],{configFile:false,babelrc:false,parserOpts:{plugins:['jsx']}}));
}
const context={module:{exports:{}},exports:{},console,Buffer,atob: value=>Buffer.from(value,'base64').toString('binary'),btoa:value=>Buffer.from(value,'binary').toString('base64')};
vm.createContext(context);vm.runInContext(sources.core+'\nglobalThis.C=createWordSoundsCore();',context);const C=context.C;
const pcm=Buffer.alloc(16044);pcm.write('RIFF',0);pcm.writeUInt32LE(16036,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(16000,24);pcm.writeUInt32LE(32000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(16000,40);for(let i=44;i<pcm.length;i+=2)pcm.writeInt16LE(Math.sin(i/10)*4000,i);
const asset={mime:'audio/wav',base64:pcm.toString('base64'),durationSeconds:0.5,decoded:true,source:'teacher_recording'};
function task(count=3,word='banana'){return C.createReviewedSyllableTask({targetWord:word,language:'en-US',syllables:Array.from({length:count},(_,i)=>'part'+i),assets:Array.from({length:count},()=>({...asset})),revision:42,reviewed:true});}
const banana=task();banana.options=['banana','tomato','potato'];banana.answer='banana';
test('2, 3, and 4 reviewed clips accepted',()=>{for(const count of[2,3,4])assert.ok(C.reviewedSyllableReady(task(count)));});
test('reviewed task resolves with embedded clips',()=>{assert.equal(C.resolveSyllableTask('banana',banana,'English').supported,true);assert.ok(C.validSyllableBoard(banana));assert.equal(C.syllableReady(banana),true);});
test('curated bank remains usable',()=>assert.equal(C.resolveSyllableTask('sunset',null,'en').contentStatus,'curated_compound'));
test('unreviewed arbitrary fragments rejected',()=>{assert.equal(C.resolveSyllableTask('banana',{syllables:['ba','na','na']},'en').supported,false);assert.equal(C.createReviewedSyllableTask({targetWord:'banana',language:'en',syllables:['ba','na','na'],assets:[asset,asset,asset],revision:1,reviewed:false}),null);});
test('review binds word, language, clip order, label and exact bytes',()=>{
 for(const mutate of[b=>b.targetWord='tomato',b=>b.language='fr',b=>b.audioUnits.reverse(),b=>b.syllables[0]='changed',b=>b.audioUnits[0].asset.base64=Buffer.concat([pcm,Buffer.from([1,2])]).toString('base64'),b=>b.review.confirmed=false,b=>b.revision++]){const b=JSON.parse(JSON.stringify(banana));mutate(b);assert.equal(C.reviewedSyllableReady(b),false);}
 assert.equal(C.resolveSyllableTask('tomato',banana,'en').supported,false);assert.equal(C.resolveSyllableTask('banana',banana,'fr').supported,false);
});
test('invalid recorded override does not fall back to a compound',()=>{const b=task(2,'sunset');b.review.confirmed=false;assert.equal(C.resolveSyllableTask('sunset',b,'en').supported,false);});
test('recording caps and malformed source rejected',()=>{
 for(const broken of[{...asset,base64:'a'.repeat(512004)},{...asset,base64:'not audio!!!'},{...asset,mime:'text/html'},{...asset,base64:Buffer.alloc(120).toString('base64')}])assert.equal(C.syllableAssetSource(broken),null);
 assert.equal(task(1),null);assert.equal(task(5),null);
});
test('portable JSON retains exact reviewed audio and order',()=>{const loaded=JSON.parse(JSON.stringify(banana));assert.ok(C.validSyllableBoard(loaded));assert.equal(C.syllableAssetSource(loaded.audioUnits[0].asset),'data:audio/wav;base64,'+asset.base64);});
// Embed candidate canonical core into the contract exactly as the normal sync does.
const coreNode=babel.parseSync(sources.core,{configFile:false,babelrc:false}).program.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='createWordSoundsCore');
let readiness=sources.readiness;let replacementNode;
babel.traverse(babel.parseSync(readiness,{configFile:false,babelrc:false}),{FunctionDeclaration(p){if(p.node.id?.name==='createWordSoundsCore')replacementNode=p.node;}});
assert.ok(replacementNode);readiness=readiness.slice(0,replacementNode.start)+sources.core.slice(coreNode.start,coreNode.end)+readiness.slice(replacementNode.end);
const rc={module:{exports:{}},console,Buffer,atob:context.atob,btoa:context.btoa};vm.createContext(rc);vm.runInContext(readiness,rc);const R=rc.module.exports;
test('readiness does not demand synthesis of recorded fragments',()=>{const req=R.requirements({type:'word-sounds',data:[{word:'banana',activityItems:{syllable_blending:banana}}],lessonPlanSequence:['syllable_blending'],wordSoundsLanguage:'en'});assert.equal(req.contentIssues.length,0);assert.ok(!req.entries.some(e=>e.key.startsWith('syllable:')));});
test('contract portable roundtrip retains reviewed syllables',()=>{const packed=R.portable({type:'word-sounds',data:[{word:'banana',activityItems:{syllable_blending:banana}}]});assert.ok(C.validSyllableBoard(JSON.parse(JSON.stringify(packed)).data[0].activityItems.syllable_blending));});
test('readiness refuses another target or language',()=>{for(const resource of[{type:'word-sounds',data:[{word:'tomato',activityItems:{syllable_blending:banana}}],lessonPlanSequence:['syllable_blending']},{type:'word-sounds',data:[{word:'banana',activityItems:{syllable_blending:banana}}],lessonPlanSequence:['syllable_blending'],wordSoundsLanguage:'fr'}])assert.ok(R.requirements(resource).contentIssues.length);});
const editor=integrated ? sources.runtime.slice(sources.runtime.indexOf('// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR'), sources.runtime.indexOf('// END WORD SOUNDS SYLLABLE RECORDING EDITOR')) : fs.readFileSync(__dirname+'/editor.js','utf8');const ec={window:{},React:{},Blob,Uint8Array,Math,Number,Error,btoa:context.btoa};vm.createContext(ec);vm.runInContext(editor,ec);
async function run(){
 const mockFile={type:'audio/wav',size:pcm.length,arrayBuffer:async()=>pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.length)};
 let closed=0;class GoodContext{async decodeAudioData(){return{duration:0.5,numberOfChannels:1,getChannelData:()=>new Float32Array([0,0.1])};}async close(){closed++;}}
 const decoded=await ec.readWordSoundsSyllableRecording(mockFile,GoodContext);assert.equal(decoded.source,'teacher_recording');assert.equal(decoded.base64,asset.base64);assert.equal(closed,1);passed++;console.log('PASS browser decoder preserves checked bytes');
 class BadContext extends GoodContext{async decodeAudioData(){throw Error('bad');}}
 await assert.rejects(ec.readWordSoundsSyllableRecording(mockFile,BadContext),/could not be decoded/);passed++;console.log('PASS corrupt recording cannot reach review');
 class SilentContext extends GoodContext{async decodeAudioData(){return{duration:.5,numberOfChannels:1,getChannelData:()=>new Float32Array([0,0])};}}
 await assert.rejects(ec.readWordSoundsSyllableRecording(mockFile,SilentContext),/silent/);passed++;console.log('PASS silent recording rejected');
 await assert.rejects(ec.readWordSoundsSyllableRecording({...mockFile,size:384001},GoodContext),/384 KB/);passed++;console.log('PASS oversized upload rejected before decoding');
 console.log('PASS '+passed+' recording checks');
 if(!integrated)fs.writeFileSync(__dirname+'/test-results.json',JSON.stringify({passed,at:new Date().toISOString()},null,2));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
