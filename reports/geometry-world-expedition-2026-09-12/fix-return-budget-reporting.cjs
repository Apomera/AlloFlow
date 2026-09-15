const fs=require('node:fs'),assert=require('node:assert/strict');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n',b=Buffer.from(fn(raw.replace(/\r\n/g,'\n')).replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);}finally{fs.closeSync(fd);}}
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one anchor '+a.slice(0,80));return s.replace(a,b);}
edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{
  const a=s.indexOf('  function restorePendingEditableBuild(ctx, engine) {'),b=s.indexOf('  window.StemLab = window.StemLab || {};',a);assert(a>0&&b>a);let part=s.slice(a,b);
  part=once(part,'    var clean = [];','    var clean = [], requestedCount = 0;');
  part=once(part,'      if (!next || seen[key] || clean.length >= MAX_BLOCKS) return;\n      seen[key] = true;\n      clean.push(next);','      if (!next || seen[key]) return;\n      seen[key] = true;\n      requestedCount++;\n      if (clean.length < MAX_BLOCKS) clean.push(next);');
  part=once(part,'    var requestedCount = clean.length;\n','');
  return s.slice(0,a)+part+s.slice(b);
});
edit('tests/geometry_world_block_fidelity.test.js',s=>once(s,"expect(src).toContain('var count = Object.keys(engine.blocks).length;');","expect(src).toContain('var count = groundFill ? engine.getGroundBlockCount() : engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks).length;');\n      expect(src).toContain('var limit = groundFill ? engine._groundBlockLimit : MAX_BLOCKS;');"));
console.log('Return notices retain the original valid unique count when applying the construction cap.');
