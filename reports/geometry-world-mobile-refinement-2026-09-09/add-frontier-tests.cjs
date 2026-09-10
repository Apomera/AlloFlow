const fs=require('node:fs');
const file='tests/geometry_world_selection_poll_cache.test.js';
let source=fs.readFileSync(file,'utf8');
const anchor="  it('keeps deliberate selection validation fresh after a warm polling cache',()=>{";
if(!source.includes(anchor))throw new Error('Frontier test insertion anchor missing');
const tests=`  it('does not rewalk for unrelated remote additions, edits or removals',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null},first=poll(f,cache);
    f.addBlock(point(40));expect(poll(f,cache)).toBe(first);
    Object.assign(f.engine.blocks['40,1,0'].userData,{shape:'quarter',rotation:2,volume:0.25,blockType:'wood',_measurementLayer:'lesson',_lessonBlock:true});
    expect(poll(f,cache)).toBe(first);
    delete f.engine.blocks['40,1,0'];expect(poll(f,cache)).toBe(first);
    expect(f.stats.measurements).toBe(1);
  });

  it('watches the frontier of every disconnected retained part',()=>{
    const f=makeSelectionEngine([point(0),point(10)]),cache={current:null};
    poll(f,cache);f.addBlock(point(11));
    expect(poll(f,cache).measurement.blocks.map(p=>p.x).sort((a,b)=>a-b)).toEqual([0,10,11]);
    f.addBlock(point(-1));expect(poll(f,cache).measurement.count).toBe(4);
    poll(f,cache);expect(f.stats.measurements).toBe(3);
  });

  it('retries a real incomplete measurement instead of caching a truncated frontier',()=>{
    const f=makeSelectionEngine(Array.from({length:1501},(_,i)=>point(i))),cache={current:null};
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    expect(f.stats.measurements).toBe(2);
    delete f.engine.blocks['1500,1,0'];
    expect(poll(f,cache).measurement.count).toBe(1500);
    poll(f,cache);expect(f.stats.measurements).toBe(3);
  });

  it('retries a transient null measurement with otherwise identical occupancy',()=>{
    const f=makeSelectionEngine([point(0)]),cache={current:null},measure=f.engine.measureStructure;
    let ready=false;
    f.engine.measureStructure=(...args)=>ready?measure(...args):null;
    expect(poll(f,cache)).toBeNull();expect(cache.current).toBeNull();
    ready=true;expect(poll(f,cache).measurement.count).toBe(1);
    poll(f,cache);expect(f.stats.measurements).toBe(1);
  });

`;
source=source.replace(anchor,tests+anchor);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
const diagnostic='reports/geometry-world-mobile-refinement-2026-09-09/measure-selection-polling.cjs';
let diag=fs.readFileSync(diagnostic,'utf8').replace("fs.writeFileSync('reports/geometry-world-mobile-refinement-2026-09-09/selection-polling-diagnostic.json'", "fs.writeFileSync('reports/geometry-world-mobile-refinement-2026-09-09/selection-frontier-diagnostic.json'");
diag=diag.replace('Actual source core measureStructure and its measurement helpers.', 'Final complete-selection/frontier cache versus actual source core measureStructure and its measurement helpers.');
const dd=fs.openSync(diagnostic,'r+');try{fs.writeFileSync(dd,diag);fs.ftruncateSync(dd,Buffer.byteLength(diag));}finally{fs.closeSync(dd);}
console.log('Added frontier invariants and new final timing output');
