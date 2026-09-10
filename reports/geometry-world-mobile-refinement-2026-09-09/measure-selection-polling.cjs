const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
const {makeSelectionEngine}=require('../../tests/helpers/geometry_world_selection_poll_fixture.cjs');
const window={StemLab:{_registry:{geometryWorld:{render(){}}}}};
new Function('window','document',fs.readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))(window,{getElementById(){return {};}});
const api=window.StemLab.geometryWorldBuilderPure;
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
function fixture(count){
  const positions=Array.from({length:count},(_,i)=>({x:i%25,y:1,z:Math.floor(i/25)}));
  const f=makeSelectionEngine(positions);
  for(let x=-12;x<=12;x++)for(let z=-12;z<=12;z++)f.addBlock({x,y:0,z},{blockType:'grass',_measurementLayer:'lesson',_lessonBlock:true});
  return f;
}
function timed(fn,repeats){
  for(let i=0;i<20;i++)fn();
  const samples=[];
  for(let sample=0;sample<7;sample++){
    const start=performance.now();for(let i=0;i<repeats;i++)fn();
    samples.push((performance.now()-start)/repeats);
  }
  return {medianMs:median(samples),samplesMs:samples};
}
const results=[];
for(const [count,repeats] of [[1,150],[45,60],[875,15]]){
  const cached=fixture(count),uncached=fixture(count),cache={current:null};
  api.polledSelectionMeasurement(cached.engine,cache);
  const before={...cached.stats};
  for(let i=0;i<40;i++)api.polledSelectionMeasurement(cached.engine,cache);
  const idle={polls:40,measurements:cached.stats.measurements-before.measurements,acceptedBlockVisits:cached.stats.acceptedBlockVisits-before.acceptedBlockVisits};
  const cachedTiming=timed(()=>api.polledSelectionMeasurement(cached.engine,cache),repeats);
  const uncachedTiming=timed(()=>api.selectionMeasurement(uncached.engine),repeats);
  const fortyOld=fixture(count);for(let i=0;i<40;i++)api.selectionMeasurement(fortyOld.engine);
  results.push({selectedBlocks:count,groundBlocks:625,worldBlocks:Object.keys(cached.engine.blocks).length,repeatsPerSample:repeats,samples:7,idleCached:idle,idleUncached:{polls:40,...fortyOld.stats},cachedTiming,uncachedTiming,cachedToUncachedRatio:cachedTiming.medianMs/uncachedTiming.medianMs,frontierCells:cache.current.frontier.length});
}
const report={success:results.every(r=>r.idleCached.measurements===0&&r.idleCached.acceptedBlockVisits===0),environment:{node:process.version,platform:process.platform,arch:process.arch},method:'Final saved selection/frontier field-tuple cache versus actual source core measureStructure and its measurement helpers. 625 protected floor cells; retained student selections. 20 warm-up calls, 7 samples, median milliseconds per synchronous invocation. Measures polling helper versus fresh selectionMeasurement only, not browser frames or downstream STL/render work.',results};
fs.writeFileSync('reports/geometry-world-mobile-refinement-2026-09-09/selection-tuple-diagnostic.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({success:report.success,results:results.map(r=>({selected:r.selectedBlocks,cachedMs:r.cachedTiming.medianMs,freshMs:r.uncachedTiming.medianMs,ratio:r.cachedToUncachedRatio,skipped:r.idleUncached.measurements-r.idleCached.measurements,acceptedVisitsAvoided:r.idleUncached.acceptedBlockVisits}))}));
