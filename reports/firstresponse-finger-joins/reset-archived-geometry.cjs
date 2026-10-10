const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const work=path.resolve(__dirname),archive=path.join(work,'candidate-rejected-initial-geometry');
for(const name of ['geometry.log','geometry-result.json','geometry-launch.json','geometry-exit.json']){
  const current=path.resolve(work,name),saved=path.resolve(archive,name);
  assert.equal(path.dirname(current),work,'Exact private output target');
  const bytes=fs.readFileSync(current);assert.deepEqual(fs.readFileSync(saved),bytes,'Failed output archived exactly');
  fs.unlinkSync(current);assert.ok(!fs.existsSync(current),'Only archived private output removed');assert.deepEqual(fs.readFileSync(saved),bytes,'Saved evidence remains exact');
}
console.log('Archived geometry outputs verified; cleared four exact private output files for final rerun.');
