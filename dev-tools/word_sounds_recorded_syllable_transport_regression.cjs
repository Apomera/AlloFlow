const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const integrated=process.argv.includes('--repo');
const root=integrated?process.cwd():repo;
const babel=require(root+'/node_modules/@babel/core');
const follow=integrated?null:require('./transport-transform.cjs');
const read=name=>fs.readFileSync(root+'/'+name,'utf8');
const core=read('word_sounds_core.js');const C=new Function(core+'\nreturn createWordSoundsCore();')();
let contract=read('word_sounds_readiness_contract.js');if(follow)contract=follow.readiness(contract);
const mod={exports:{}};new Function('module','exports',contract)(mod,mod.exports);const R=mod.exports;
const win={AlloModules:{WordSoundsReadiness:R}};
new Function('window','console',read('firestore_sync_module.js'))(win,{log(){},warn(){},error(){}});
assert.equal(typeof win.sanitizeSessionValue,'function');
function variableNode(source,name){const ast=babel.parseSync(source,{configFile:false,babelrc:false,parserOpts:{plugins:['jsx']}});let found;babel.traverse(ast,{VariableDeclarator(p){if(p.node.id?.name===name)found=p.parentPath.node;}});assert.ok(found,'missing '+name);return found;}
let live=read('live_aac_source.jsx');if(follow)live=follow.liveAac(live);const serialNode=variableNode(live,'_alloSerializeResourceForStudentPack');
const serialize=new Function('window','console',live.slice(0,serialNode.end)+'\nreturn _alloSerializeResourceForStudentPack;')(win,{log(){},warn(){},error(){}});
let extra=read('module_scope_extras_source.jsx');if(follow)extra=follow.extras(extra);
const stripNode=variableNode(extra,'stripUnsafeLiveSessionFields');
const strip=new Function(extra.slice(stripNode.start,stripNode.end)+'\nreturn stripUnsafeLiveSessionFields;')();
const uploadStart=extra.indexOf('  const portableResources = resources.map((item) => {');
const uploadEnd=extra.indexOf('  const writeTasks = [];',uploadStart);
assert.ok(uploadStart>0&&uploadEnd>uploadStart);
const prepareLive=new Function('resources','window','stripUnsafeLiveSessionFields','structuredClone',extra.slice(uploadStart,uploadEnd)+'\nreturn safeResources;');
const pcm=Buffer.alloc(16044);pcm.write('RIFF',0);pcm.writeUInt32LE(16036,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(16000,24);pcm.writeUInt32LE(32000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(16000,40);for(let i=44;i<pcm.length;i+=2)pcm.writeInt16LE(Math.sin(i/10)*4000,i);
const asset={mime:'audio/wav',base64:pcm.toString('base64'),durationSeconds:.5,decoded:true,source:'teacher_recording'};
function resource(count,word='banana') {const board=C.createReviewedSyllableTask({targetWord:word,language:'en',syllables:Array.from({length:count},(_,i)=>'part'+i),assets:Array.from({length:count},()=>({...asset})),revision:1,reviewed:true});board.options=[word,'tomato','potato'];board.answer=word;return{id:'recorded-'+word,type:'word-sounds',wordSoundsLanguage:'en',lessonPlanSequence:['syllable_blending'],data:[{word,activityItems:{syllable_blending:board}}]};}
const boardOf=value=>value.data[0].activityItems.syllable_blending;
const deliver=value=>serialize(R.portable(value),{sanitizeHistoryForCloud:win.sanitizeHistoryForCloud,stripUndefined:win.stripUndefined});
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('candidate transport and editor followups parse',()=>{for(const source of[contract,live,extra])babel.parseSync(source,{configFile:false,babelrc:false,parserOpts:{plugins:['jsx']}});if(follow)for(const [name,fn]of[['word_sounds_module.js','runtime'],['word_sounds_setup_source.jsx','setup']])babel.parseSync(follow[fn](read(name)),{configFile:false,babelrc:false,parserOpts:{plugins:['jsx']}});});
test('shared sanitizer actually strips nested clip bytes',()=>{const raw=win.sanitizeSessionValue(R.portable(resource(3)),'resource');assert.ok(boardOf(raw).audioUnits[0].asset.base64==null);});
test('3 and4 recorded syllables survive actual cloud/session/pack delivery',()=>{for(const count of[3,4]){const output=JSON.parse(JSON.stringify(deliver(resource(count))));assert.equal(C.reviewedSyllableReady(boardOf(output)),true);assert.equal(boardOf(output).audioUnits.length,count);assert.equal(boardOf(output).audioUnits[0].asset.base64,asset.base64);assert.equal(R.requirements(output).contentIssues.length,0);}});
test('3 and4 recorded syllables survive live session upload preparation',()=>{for(const count of[3,4]){const output=prepareLive([resource(count)],win,strip,structuredClone)[0];assert.ok(C.reviewedSyllableReady(boardOf(output)));}});
test('wrong word, language, changed label, bytes and missing review never restored',()=>{
 for(const mutate of[value=>value.data[0].word='tomato',value=>value.wordSoundsLanguage='fr',value=>boardOf(value).syllables[0]='edited',value=>boardOf(value).audioUnits[0].asset.base64=asset.base64.slice(4),value=>boardOf(value).review.confirmed=false]){const input=resource(3);mutate(input);const output=deliver(input);assert.equal(C.reviewedSyllableReady(boardOf(output)),false);assert.ok(boardOf(output).audioUnits.every(unit=>!unit.asset));assert.ok(R.requirements(output).contentIssues.length);}
});
test('oversized embedded clip cannot bypass restoration',()=>{const input=resource(3);boardOf(input).audioUnits[0].asset.base64='a'.repeat(512004);const output=deliver(input);assert.ok(boardOf(output).audioUnits.every(unit=>!unit.asset));});
test('learner recordings stay excluded beside teacher instructional clips',()=>{const input=resource(3);input.karaokeStudentAudio={base64:'PRIVATE_LEARNER_AUDIO'};input.data[0].audioRecording={base64:'PRIVATE_LEARNER_AUDIO'};input.data[0].learner={recording:{base64:'PRIVATE_LEARNER_AUDIO'}};boardOf(input).audioUnits[0].asset.recording={base64:'PRIVATE_LEARNER_AUDIO'};const output=deliver(input);assert.ok(C.reviewedSyllableReady(boardOf(output)));assert.ok(!JSON.stringify(output).includes('PRIVATE_LEARNER_AUDIO'));assert.deepEqual(Object.keys(boardOf(output).audioUnits[0].asset).sort(),['base64','decoded','durationSeconds','mime','source']);});
test('restoration does not recreate removed or changed target metadata',()=>{const source=resource(3);for(const change of[value=>delete value.data[0].activityItems,value=>value.data[0].word='potato',value=>boardOf(value).review.signature='other-review']){const target=win.sanitizeSessionValue(source,'resource');change(target);R.restoreReviewedSyllables(source,target);assert.ok(!JSON.stringify(target).includes(asset.base64));}});
test('clip budget restores a complete sequence or none',()=>{const source=resource(4);const target=win.sanitizeSessionValue(source,'resource');R.restoreReviewedSyllables(source,target,{chars:asset.base64.length*4-1,items:4});assert.ok(boardOf(target).audioUnits.every(unit=>!unit.asset));const target2=win.sanitizeSessionValue(source,'resource');R.restoreReviewedSyllables(source,target2,{chars:asset.base64.length*4,items:4});assert.ok(C.reviewedSyllableReady(boardOf(target2)));});
test('restoration is limited to Word Sounds resource type',()=>{const source=resource(3);const target=win.sanitizeSessionValue(source,'resource');source.type='glossary';target.type='glossary';R.restoreReviewedSyllables(source,target);assert.ok(!JSON.stringify(target).includes(asset.base64));});
test('portable export does not mutate original reviewed clips',()=>{const source=resource(3);const before=JSON.stringify(source);R.portable(source);assert.equal(JSON.stringify(source),before);});
test('saving reviewed recordings preserves authored option order in lifted pack and current word',()=>{
 let runtime=read('word_sounds_module.js');if(follow)runtime=follow.runtime(runtime);
 const ast=babel.parseSync(runtime,{configFile:false,babelrc:false});let helperNode,saveNode;
 babel.traverse(ast,{FunctionDeclaration(p){if(p.node.id?.name==='buildSyllableOptions')helperNode=p.node;},ObjectProperty(p){if(p.node.key?.name==='onSave'&&p.node.value?.type==='ArrowFunctionExpression'&&runtime.slice(p.node.value.start,p.node.value.end).includes('sameCountWords'))saveNode=p.node.value;}});
 assert.ok(helperNode&&saveNode);
 const build=new Function(runtime.slice(helperNode.start,helperNode.end)+'\nreturn buildSyllableOptions;')();
 const authored=['raincoat','sunset','snowman'];
 const existing={word:'sunset',syllables:['sun','set'],activityItems:{syllable_blending:{...C.resolveSyllableTask('sunset',null,'en'),options:[...authored],answer:'sunset'}}};
 let lifted=[existing,{word:'snowman',syllables:['snow','man']}],current=existing,shuffles=0;
  const save=new Function('WS_CORE','target','preloadedWords','buildSyllableOptions','fisherYatesShuffle','isHomophone','preloadedWordCache','setWsPreloadedWords','setPreloadedWords','setWordSoundsPhonemes','wordSoundsLanguage','return '+runtime.slice(saveNode.start,saveNode.end))(C,'sunset',lifted,build,values=>{shuffles++;return [...values].reverse();},()=>false,{current:new Map([['sunset',existing]])},update=>{lifted=update(lifted);},()=>{throw Error('should use lifted setter');},update=>{current=update(current);},'en');
 const task=C.createReviewedSyllableTask({targetWord:'sunset',language:'en',syllables:['sun','set'],assets:[asset,asset],revision:9,reviewed:true});
 save(task);
 assert.deepEqual(lifted[0].activityItems.syllable_blending.options,authored);
 assert.deepEqual(current.activityItems.syllable_blending.options,authored);
 assert.equal(shuffles,0);assert.ok(C.validSyllableBoard(lifted[0].activityItems.syllable_blending));assert.equal(lifted[0].activityItems.syllable_blending.revision,9);
 assert.deepEqual(existing.activityItems.syllable_blending.options,authored);assert.equal(lifted[1].word,'snowman');
});
console.log('PASS '+passed+' full delivery regression groups');
