const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const before=read('before-results.json'),after=read('after-results.json'),tests=read('stone-regression-tests.json');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{
  const source=fs.readFileSync(path.join(root,'stem_lab',name)),mirror=fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab',name));
  new vm.Script(source.toString(),{filename:name});new vm.Script(mirror.toString(),{filename:'desktop/'+name});
  return {name,sha256:hash(source),mirrorMatches:source.equals(mirror),syntax:true,browserSourceMatches:after.sources[name]===hash(source)};
});
const captures=after.captures.map((a,i)=>{const b=before.captures[i];return {file:a.file,cameraMatches:JSON.stringify(a.position)===JSON.stringify(b.position)&&JSON.stringify(a.quaternion)===JSON.stringify(b.quaternion),drawCalls:a.drawCalls,triangles:a.triangles,renderWorkUnchanged:a.drawCalls===b.drawCalls&&a.triangles===b.triangles};});
const summary={
  success:false,tests:{passed:tests.numPassedTests,total:tests.numTotalTests,files:tests.testResults.length,success:tests.success,failed:tests.numFailedTests},sources,
  browser:{beforePass:before.pass,afterPass:after.pass,errors:after.errors,consoleErrors:after.consoleErrors,failures:after.failures,captures,
    exactWorld:before.initial.world===after.initial.world,exactGeometry:before.initial.geometry===after.initial.geometry,exactStl:before.initial.stl===after.initial.stl,
    beforeTransitionsPreserveModel:JSON.stringify(before.initial)===JSON.stringify(before.final),afterTransitionsPreserveModel:JSON.stringify(after.initial)===JSON.stringify(after.final)},
  texture:{before:before.texture,after:after.texture,sameDimensions:before.texture.width===after.texture.width&&before.texture.height===after.texture.height}
};
summary.success=tests.success&&!tests.numFailedTests&&tests.numPassedTests===tests.numTotalTests&&sources.every(s=>s.mirrorMatches&&s.browserSourceMatches)&&before.pass&&after.pass&&captures.length===4&&captures.every(c=>c.cameraMatches&&c.renderWorkUnchanged)&&summary.browser.exactWorld&&summary.browser.exactGeometry&&summary.browser.exactStl&&summary.browser.beforeTransitionsPreserveModel&&summary.browser.afterTransitionsPreserveModel&&summary.texture.sameDimensions;
const output=path.join(__dirname,'stone-pass-summary.json'),text=JSON.stringify(summary,null,2)+'\n';
if(fs.existsSync(output)){const fd=fs.openSync(output,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}else fs.writeFileSync(output,text);
console.log(JSON.stringify(summary,null,2));process.exitCode=summary.success?0:1;
