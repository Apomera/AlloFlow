const fs=require('node:fs');
const path=require('node:path');
const dir=__dirname;
const reports=['workspace-core-tests.json','rotated-placement-tests.json','workspace-geometry-tests.json','builder-dock-tests.json','workspace-resize-tests.json','workspace-visual-tests.json'];
const tests=new Map();
for(const file of reports){
  const r=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  if(!r.success||r.numFailedTests)throw Error('Unfinished tests: '+file);
  for(const suite of r.testResults)for(const test of suite.assertionResults)tests.set(path.basename(suite.name)+' / '+test.fullName,test.status);
}
if([...tests.values()].some(x=>x!=='passed'))throw Error('Nonpassing test');
const mirrors={};
for(const f of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']){
  const source=fs.readFileSync(path.join('stem_lab',f));
  mirrors[f]=source.equals(fs.readFileSync(path.join('desktop/web-app/public/stem_lab',f)));
  if(!mirrors[f])throw Error('Mirror mismatch: '+f);
  new Function(source.toString());
}
const workspace=JSON.parse(fs.readFileSync(path.join(dir,'workspace-pass-results.json'),'utf8'));
const builder=JSON.parse(fs.readFileSync(path.join(dir,'builder-dock-results.json'),'utf8'));
if(!workspace.pass||!builder.pass)throw Error('Browser checks incomplete');
const summary={pass:true,distinctTests:tests.size,testReports:reports,mirrors,workspaceBrowserPassed:true,printRoundTripPassed:true,viewports:workspace.frames.map(f=>({viewport:f.viewport,resizeContinuity:f.resizeContinuity,touchPalette:f.touchPalette})),scope:'Local actual React/Three.js host using software WebGL; no physical printer or deployment.'};
fs.writeFileSync(path.join(dir,'workspace-validation-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
