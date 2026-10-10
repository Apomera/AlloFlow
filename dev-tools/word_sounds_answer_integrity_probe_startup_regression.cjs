/* Extracted production probe startup effect: canceled timers must not consume
 * the one-shot startup guard. No React/browser/audio dependencies required. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=process.env.WORD_SOUNDS_REPO||process.argv[2]||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(repo,'word_sounds_module.js'),'utf8');
const start=source.indexOf('      React.useEffect(() => {\n        if (\n          firstWordReady &&');
const end=source.indexOf('      React.useEffect(() => {\n        if (showReviewPanel)',start);
assert.ok(start>=0&&end>start,'production probe startup effect markers must exist');
const effectSource=source.slice(start,end);
assert.ok(effectSource.includes('startActivity(wordSoundsActivity)'));
function harness(){
 let timerId=0;const timers=new Map(),callbacks=[],starts=[];
 const started={current:false},mounted={current:true};
 function render(overrides={}){
  let cleanup;
  const context={React:{useEffect(effect){cleanup=effect();}},firstWordReady:true,preloadedWords:[{word:'cat',phonemes:['k','a','t']}],currentWordSoundsWord:null,isLoadingPhonemes:false,isProbeMode:true,hasStartedFromReview:started,isMountedRef:mounted,wordSoundsActivity:'spelling_bee',showReviewPanel:false,mountPresetActivityRef:{current:true},setShowReviewPanel(){throw Error('Probe unexpectedly opened teacher review');},startActivity:activity=>starts.push(activity),setTimeout(callback,delay){assert.equal(delay,100);const id=++timerId;timers.set(id,callback);callbacks.push(callback);return id;},clearTimeout(id){timers.delete(id);},...overrides};
  vm.runInNewContext(effectSource,context,{filename:'extracted-production-probe-startup.js'});
  return typeof cleanup==='function'?cleanup:()=>{};
 }
 function flush(){const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());}
 return {render,flush,timers,callbacks,starts,started,mounted};
}
let groups=0;
function test(name,body){body();groups++;console.log('PASS '+name);}
test('ready probe owns startup only when its timer fires, then starts exactly once',()=>{
 const h=harness();h.render();assert.equal(h.timers.size,1);assert.equal(h.started.current,false,'scheduling must not prematurely consume startup');assert.equal(h.starts.length,0);
 h.flush();assert.equal(h.started.current,true);assert.equal(h.starts.join(','),'spelling_bee');h.callbacks[0]();h.render();h.flush();assert.equal(h.starts.length,1,'duplicate timer callbacks/effect rerenders cannot restart the probe');
});
test('effect cleanup and changed callback identity re-arm a canceled probe startup',()=>{
 const h=harness();const old=[];const cleanup=h.render({startActivity:activity=>old.push(activity)});cleanup();assert.equal(h.timers.size,0);assert.equal(h.started.current,false,'canceled scheduling cannot strand the probe behind its guard');
 const replacement=[];h.render({startActivity:activity=>replacement.push(activity)});assert.equal(h.timers.size,1);h.flush();assert.equal(old.length,0);assert.equal(replacement.join(','),'spelling_bee');assert.equal(h.started.current,true);
});
test('unmount cancels scheduled startup and a late callback cannot start the probe',()=>{
 const h=harness();const cleanup=h.render();h.mounted.current=false;cleanup();assert.equal(h.timers.size,0);h.flush();h.callbacks[0]();assert.equal(h.starts.length,0);assert.equal(h.started.current,false);
});
test('unready, already presented, loading, empty, or already started probes schedule no startup',()=>{
 for(const override of [{firstWordReady:false},{currentWordSoundsWord:'cat'},{isLoadingPhonemes:true},{preloadedWords:[]}]){const h=harness();h.render(override);assert.equal(h.timers.size,0);assert.equal(h.starts.length,0);}
 const h=harness();h.started.current=true;h.render();assert.equal(h.timers.size,0);assert.equal(h.starts.length,0);
});
assert.equal(groups,4);console.log('Passed '+groups+' probe startup integrity regression groups.');
