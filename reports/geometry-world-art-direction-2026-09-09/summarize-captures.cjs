const fs=require('node:fs'),path=require('node:path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const before=read('baseline-results.json'),after=read('after-results.json');
const comparison=after.captures.map(c=>{const b=before.captures.find(v=>v.file===c.file.replace(/^after-/,'before-'));return {file:c.file,cameraMatches:c.cameraMatchesBaseline,beforeDraws:b.draws,afterDraws:c.draws,beforeTriangles:b.triangles,afterTriangles:c.triangles,normalMaps:c.maps.normal,roughnessMaps:c.maps.roughness,stlBytes:c.stlBytes,stlTriangles:c.stlTriangles};});
const result={beforePassed:before.passed,afterPassed:after.passed,comparison,invariants:after.invariants};
const file=path.join(__dirname,'capture-comparison.json'),text=JSON.stringify(result,null,2);
if(fs.existsSync(file)){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}else fs.writeFileSync(file,text);
console.log(text);
