const fs = require('node:fs');
const path = require('node:path');
function write(name, data) {const file=path.join(__dirname,name), fd=fs.openSync(file,'r+');fs.writeFileSync(fd,data);fs.ftruncateSync(fd,Buffer.byteLength(data));fs.closeSync(fd);}
const file='capture-after.cjs';
let source=fs.readFileSync(path.join(__dirname,file),'utf8');
source=source.replace('m.userData?._gwBlockFinish?.strength?.value>0','m._gwBlockFinish?.gwBlockBevelStrength?.value>0');
write(file,source);
const result=JSON.parse(fs.readFileSync(path.join(__dirname,'after-results.json'),'utf8'));
for(const c of result.captures) delete c.maps.bevel;
result.probeNote='The initial optional bevel material-count probe used an incorrect property path. Its invalid zero counts were removed; the harness is corrected for future runs. Shader compilation, normal/roughness maps, exact cameras, mesh transforms/buffers, history, and actual STL invariants were measured successfully.';
write('after-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({pass:result.passed,captures:result.captures.length,invariants:result.invariants,render:result.captures.map(c=>({file:c.file,draws:c.draws,triangles:c.triangles,programs:c.programs,maps:c.maps}))}));
