const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function runHostPersistenceRegressions(source) {
 const marker=source.indexOf('  const wordSoundsPersistenceRef = React.useRef(');
 const start=source.indexOf('      const resourceId = generatedContent?.id ?? null;',marker);
 const end=source.indexOf('  }, [wsPreloadedWords, generatedContent]);',start);
 assert.ok(marker>=0&&start>marker&&end>start);
 const effect=new Function('generatedContent','wsPreloadedWords','wordSoundsPersistenceRef','setHistory','setGeneratedContent',source.slice(start,end));
 const serialStart=source.indexOf('        const serializeItems = (items, stripImages) => {');
 const serialEnd=source.indexOf('        const publishMediaReceipt = ',serialStart);
 assert.ok(serialStart>=0&&serialEnd>serialStart);
 const serialize=new Function('window','warnLog','structuredClone',source.slice(serialStart,serialEnd)+'\nreturn serializeItems;')({},()=>{},structuredClone);
 const original=[{word:'sunset',activityItems:{syllable_blending:{targetWord:'sunset',options:['sunset','cat']}},_ttsAssets:{sun:{mime:'audio/wav',base64:'AAAA',provenance:{provider:'kokoro',voice:'af_heart',source:'generated'}}}}];
 const repaired=[{...original[0],activityItems:{syllable_blending:{targetWord:'sunset',options:['sunset','dog'],teacherEdited:true,audioUnits:[{key:'reviewed_sunset_1',text:'sun'}]}},_ttsAssets:{reviewed_sunset_1:{mime:'audio/wav',base64:'AQID',provenance:{source:'teacher-recording'}}}}];
 const resource=(id,words=original)=>({id,type:'word-sounds',data:words,lessonPlanSequence:['syllable_blending'],lessonPlanConfig:{mode:'custom'},sessionConfig:{version:1,language:'en',resourceId:id,sessionGoal:10,fixedForm:false,learnerId:'temporary',sessionId:'temporary',apiKey:'never-copy'},isProbeMode:false,probeActivity:null,probeGradeLevel:'K',probeForm:'A',unrelatedSecret:'never-copy'});
 function harness(gc=resource('one')) {
  const state={gc,history:[gc,{id:'unrelated',type:'text',data:'keep'}],ref:{current:{resourceId:null,words:null,bound:false}},writes:0};
  state.flush=(words,gc=state.gc)=>{state.gc=gc;effect(gc,words,state.ref,fn=>{const next=fn(state.history);if(next!==state.history)state.writes++;state.history=next;},fn=>{const next=fn(state.gc);if(next!==state.gc)state.writes++;state.gc=next;});};
  return state;
 }
 const groups=[];function test(name,fn){fn();groups.push(name);}
 test('runtime repair updates both open preview resource and saved history, preserving nested board/audio metadata',()=>{
  const h=harness();h.flush(original);h.flush(repaired);
  assert.equal(h.gc.data,repaired);assert.equal(h.gc.wsPreloadedWords,repaired);assert.equal(h.history[0].data,repaired);assert.equal(h.history[0].wsPreloadedWords,repaired);
  assert.deepEqual(h.gc.data[0]._ttsAssets.reviewed_sunset_1.provenance,{source:'teacher-recording'});assert.equal(h.history[1].data,'keep');
  const writes=h.writes;h.flush(repaired);h.flush(repaired,{...h.gc,title:'metadata update'});assert.equal(h.writes,writes);
 });
 test('navigation and delayed previous-word hydration cannot overwrite the destination before its own words load',()=>{
  const h=harness();h.flush(original);
  const otherWords=[{word:'dog'}],other=resource('two',otherWords);h.history.push(other);
  h.flush(original,other);assert.equal(h.gc,other);assert.equal(h.history[2],other);
  h.flush([...original]);assert.equal(h.gc,other);assert.equal(h.history[2],other);
  h.flush(otherWords);assert.equal(h.gc.data,otherWords);
  const edited=[{word:'cat'}];h.flush(edited);assert.equal(h.gc.data,edited);assert.equal(h.history[2].data,edited);
 });
 test('generated-content-only replacement with the same id waits for corresponding hydration',()=>{
  const h=harness();h.flush(original);
  const updated=resource('one',[{word:'dog'}]);h.flush(original,updated);h.flush([...original]);assert.equal(h.gc,updated);
  h.flush(updated.data);assert.equal(h.gc.data[0].word,'dog');
 });
 test('glossary term data is preserved while its attached Word Sounds words update',()=>{
  const terms=[{term:'sunset',definition:'keep definition',image:'keep image'}];const h=harness({id:'g',type:'glossary',data:terms});h.flush(original);h.flush(repaired);
  assert.equal(h.gc.data,terms);assert.equal(h.history[0].data,terms);assert.equal(h.history[0].wsPreloadedWords,repaired);
 });
 test('offline reload retains repaired words, reviewed syllable assets, source labels and lesson/probe settings',()=>{
  const h=harness();h.flush(original);h.flush(repaired);
  h.history[0].sessionConfig.instructionalProfile={taughtPatterns:['s','u','n'],knownWords:['sun']};
  h.history[0].sessionConfig.studentLocked=true;
  const packed=serialize(h.history,false)[0],reloaded=JSON.parse(JSON.stringify(packed));
  assert.deepEqual(JSON.parse(reloaded.data),repaired);assert.deepEqual(reloaded.wsPreloadedWords,repaired);
  for(const key of ['lessonPlanSequence','lessonPlanConfig','isProbeMode','probeActivity','probeGradeLevel','probeForm'])assert.deepEqual(reloaded[key],h.gc[key]);
  assert.equal(reloaded.sessionConfig.language,'en');assert.equal(reloaded.sessionConfig.sessionGoal,10);
  assert.deepEqual(reloaded.sessionConfig.instructionalProfile,h.gc.sessionConfig.instructionalProfile);assert.equal(reloaded.sessionConfig.studentLocked,true);
  assert.ok(!('learnerId' in reloaded.sessionConfig));assert.ok(!('sessionId' in reloaded.sessionConfig));assert.ok(!('apiKey' in reloaded.sessionConfig));assert.ok(!('unrelatedSecret' in reloaded));
 });
 test('offline serialization prefers edited wsPreloadedWords over legacy stale data and preserves non-Word-Sounds behavior',()=>{
  const input={...resource('one'),wsPreloadedWords:repaired};const packed=serialize([input,{id:'g',type:'glossary',data:original,sessionConfig:{apiKey:'no'},wsPreloadedWords:repaired}],false);
  assert.deepEqual(JSON.parse(packed[0].data),repaired);assert.deepEqual(JSON.parse(packed[1].data),original);assert.ok(!('sessionConfig' in packed[1]));assert.ok(!('wsPreloadedWords' in packed[1]));
 });
 test('late functional current-resource update cannot clobber navigation',()=>{
  const ref={current:{resourceId:'one',words:original,sourceWords:original,bound:true}};let updater;
  effect(resource('one'),repaired,ref,()=>{},fn=>{updater=fn;});
  const other=resource('two',[{word:'dog'}]);assert.equal(updater(other),other);
 });
 return groups;
}
module.exports={runHostPersistenceRegressions};
if(require.main===module){const file=process.argv[2]||path.join(__dirname,'AlloFlowANTI.txt');console.log(JSON.stringify({passed:runHostPersistenceRegressions(fs.readFileSync(file,'utf8'))},null,2));}
