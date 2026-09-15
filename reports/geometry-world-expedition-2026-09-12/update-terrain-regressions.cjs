const fs=require('node:fs'),assert=require('node:assert/strict');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n',data=Buffer.from(fn(raw.replace(/\r\n/g,'\n')).replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}}
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one anchor '+a.slice(0,90));return s.replace(a,b);}
edit('tests/geometry_world_block_fidelity.test.js',s=>once(s,'if (count >= MAX_BLOCKS) { engine._fillTruncated = true; return; }','if (count >= limit) { engine._fillTruncated = true; return; }'));
edit('tests/geometry_world_keyboard_access.test.js',s=>once(s,'var hits = engine.raycaster.intersectObjects(engine.getBlocksArr());','var hits = engine.raycaster.intersectObjects(engine.getRaycastTargets ? engine.getRaycastTargets() : engine.getBlocksArr());'));
edit('tests/geometry_world_printlab_bridge.test.js',s=>{
  const start=s.indexOf("  it('deduplicates and capacity-limits a returning build after the sandbox floor loads'"),end=s.indexOf("  it('returns focus to the launcher trigger",start);assert(start>0&&end>start);
  let test=s.slice(start,end);
  test=once(test,"it('deduplicates and capacity-limits a returning build after the sandbox floor loads', () => {","it.each([false, true])('deduplicates and capacity-limits a returning build (independent terrain: %s)', (independentTerrain) => {");
  test=once(test,'    const blocks = Array.from({ length: 900 }',"    if (independentTerrain) engine.getConstructionBlockCount = function () { return Object.values(this.blocks).filter(m => !m.userData._lessonBlock).length; };\n    const capacity = independentTerrain ? 1500 : 875;\n    const blocks = Array.from({ length: 1600 }");
  test=once(test,'expect(placed).toHaveLength(875);','expect(placed).toHaveLength(capacity);');
  test=once(test,'expect(Object.keys(engine.blocks)).toHaveLength(1500);','expect(Object.keys(engine.blocks)).toHaveLength(625 + capacity);');
  test=once(test,'.size).toBe(875);','.size).toBe(capacity);');
  test=once(test,'{ blocks: 875, requestedBlocks: 900, truncated: true }','{ blocks: capacity, requestedBlocks: 1600, truncated: true }');
  test=once(test,".toContain('prevented 25 additional blocks');",".toContain('prevented ' + (1600 - capacity) + ' additional blocks');");
  return s.slice(0,start)+test+s.slice(end);
});
console.log('Terrain regressions updated; legacy and independent-budget Print Lab returns covered.');
