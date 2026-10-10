const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['firstresponse-arm-preview.spec.ts','run-arm-browser.cjs','prepare-arm-native-fixture.cjs','check-arm-fixture.cjs','check-arm-fixture-contract.cjs','browser-fixture-preparation.json','fixture-list-check.json','fixture-contract-check.json','arm-mount-window.cjs','mount-window-check.json','native-mount-repair.json'];
const saved=path.join(work,'native-draw-repair-before');if(fs.existsSync(saved))throw Error('Original snapshot exists; do not overwrite');fs.mkdirSync(saved);const originalInputs={};
for(const name of names){const bytes=fs.readFileSync(path.join(work,name));originalInputs[name]=sha(bytes);fs.writeFileSync(path.join(saved,name+'.saved'),bytes);}
const failed=JSON.parse(fs.readFileSync(path.join(work,'native-adult-recovered/inputs.json'),'utf8'));
for(const name of ['firstresponse-arm-preview.spec.ts','run-arm-browser.cjs','arm-mount-window.cjs']){const entry=Object.entries(failed.inputs).find(([p])=>path.basename(p)===name);if(!entry||entry[1]!==originalInputs[name])throw Error('Failed recovered input drift '+name);}
const changes=[];function patch(s,old,replacement){if(s.split(old).length!==2)throw Error('Missing unique draw anchor '+old.slice(0,120));changes.push({old,new:replacement});return s.replace(old,replacement);}
let fixture=fs.readFileSync(path.join(work,'firstresponse-arm-preview.spec.ts'),'utf8');
fixture=patch(fixture,"const {runMountWithWaitWindow}=require('./arm-mount-window.cjs');","const {runMountWithWaitWindow}=require('./arm-mount-window.cjs');\nconst {renderWithArmSubmissions}=require('./arm-render-submissions.cjs');");
fixture=patch(fixture,'  var WristMount=window.__mount;','  var captureArmSubmissions=${renderWithArmSubmissions.toString()};\n  var WristMount=window.__mount;');
fixture=patch(fixture,'renderer.render=function(scene,camera){var result=render.apply(this,arguments);','renderer.render=function(scene,camera){var captured=captureArmSubmissions(render,this,arguments),result=captured.result;');
fixture=patch(fixture,'record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;','record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;record.armSubmissions=captured.submissions;');
fixture=patch(fixture,'draw:{id:rec.id,createdBy:rec.createdBy,','draw:{armSubmissions:drawn.armSubmissions,id:rec.id,createdBy:rec.createdBy,');
const oldTriangle="  expect(removedTriangles).toBe(144);\n  expect(value.draw.triangles).toBe(reference.draw.triangles-removedTriangles);";
const newTriangle=`  expect(removedTriangles).toBe(144);
  const submissions=value.draw.armSubmissions,priorSubmissions=reference.draw.armSubmissions;
  expect(submissions.length).toBeGreaterThan(0);
  expect(submissions.map((draw:any)=>({name:draw.name,group:draw.group}))).toEqual(priorSubmissions.map((draw:any)=>({name:draw.name,group:draw.group})));
  let submittedReduction=0;
  for(let i=0;i<submissions.length;i++){
    const draw=submissions[i],prior=priorSubmissions[i],arm=value.arms.find((item:any)=>item.name===draw.name),oldArm=reference.arms.find((item:any)=>item.name===prior.name);
    expect(arm).toBeTruthy();expect(oldArm).toBeTruthy();
    for(const pair of [[draw,arm],[prior,oldArm]]){
      const submitted=pair[0],geometry=pair[1].geometry,range=geometry.drawRange,group=submitted.group;
      expect(submitted.indexCount).toBe(geometry.indexCount);expect(submitted.drawRange).toEqual(range);
      const start=Math.max(0,range.start,group?group.start:0),end=Math.min(geometry.indexCount,range.count==='Infinity'?Infinity:range.start+range.count,group?group.start+group.count:Infinity);
      expect(submitted.submittedStart).toBe(start);expect(submitted.submittedCount).toBe(Math.max(0,end-start));expect(submitted.triangles).toBe(submitted.submittedCount/3);
    }
    submittedReduction+=prior.triangles-draw.triangles;
  }
  expect(value.draw.triangles).toBe(reference.draw.triangles-submittedReduction);`;
fixture=patch(fixture,oldTriangle,newTriangle);
const fixtureBefore=fs.readFileSync(path.join(saved,'firstresponse-arm-preview.spec.ts.saved'),'utf8');let reversed=fixture;for(const change of changes.slice().reverse()){if(reversed.split(change.new).length!==2)throw Error('Repair reverse anchor');reversed=reversed.replace(change.new,change.old);}if(reversed!==fixtureBefore)throw Error('Draw repair reverses incorrectly');
fs.writeFileSync(path.join(work,'firstresponse-arm-preview.spec.ts'),fixture);
let runner=fs.readFileSync(path.join(work,'run-arm-browser.cjs'),'utf8');const runnerOld="path.join(work,'arm-mount-window.cjs'),",runnerNew=runnerOld+"path.join(work,'arm-render-submissions.cjs'),";if(runner.split(runnerOld).length!==2)throw Error('Runner guard anchor');runner=runner.replace(runnerOld,runnerNew);fs.writeFileSync(path.join(work,'run-arm-browser.cjs'),runner);
let author=fs.readFileSync(path.join(work,'prepare-arm-native-fixture.cjs'),'utf8');const anchor='const files={';const additions=changes.map(change=>'spec=replace(spec,'+JSON.stringify(change.old)+','+JSON.stringify(change.new)+');').join('\n')+'\nrunner=replace(runner,'+JSON.stringify(runnerOld)+','+JSON.stringify(runnerNew)+');\n';if(author.split(anchor).length!==2)throw Error('Author insertion anchor');author=author.replace(anchor,additions+anchor+"\n  'arm-render-submissions.cjs':fs.readFileSync(path.join(work,'arm-render-submissions.cjs'),'utf8'),");
author=author.replace("'arm-capture-png.cjs','arm-mount-window.cjs'","'arm-capture-png.cjs','arm-mount-window.cjs','arm-render-submissions.cjs'");fs.writeFileSync(path.join(work,'prepare-arm-native-fixture.cjs'),author);
const result=spawnSync(process.execPath,[path.join(work,'prepare-arm-native-fixture.cjs')],{windowsHide:true,encoding:'utf8'});if(result.status!==0)throw Error(result.stdout+result.stderr);
if(fs.readFileSync(path.join(work,'firstresponse-arm-preview.spec.ts'),'utf8')!==fixture||fs.readFileSync(path.join(work,'run-arm-browser.cjs'),'utf8')!==runner)throw Error('Generator does not reproduce patched fixture/runner');
const candidateSHA256=sha(fs.readFileSync(path.join(work,'candidate.js')));if(candidateSHA256!=='8c045e6d8056e834d795ed4bfecb0418758c6a5c3e9d2ce4f05d69ec14dca940')throw Error('Candidate drift');
const updatedInputs={};for(const name of ['firstresponse-arm-preview.spec.ts','run-arm-browser.cjs','prepare-arm-native-fixture.cjs','check-arm-fixture.cjs','browser-fixture-preparation.json','arm-mount-window.cjs','arm-render-submissions.cjs'])updatedInputs[name]=sha(fs.readFileSync(path.join(work,name)));
fs.writeFileSync(path.join(work,'native-draw-repair.json'),JSON.stringify({passed:true,candidateSHA256,fixtureSHA256:updatedInputs['firstresponse-arm-preview.spec.ts'],originalInputs,updatedInputs,failedRun:'native-adult-recovered',originalDirectory:'native-draw-repair-before',changes,fixtureReverseExact:true,constructedTriangleReduction:144,actualRenderedDelta:'Derived exactly from matched onBeforeRender submissions after geometry/group/drawRange clipping',existingScopeAssertionsPreserved:true,callbacksRestoredInFinally:true,mountWindowUnchanged:true,perWorkflowTimeoutMs:450000,runnerTimeoutMs:900000,browserLaunched:false},null,2));
console.log('Actual submitted-arm accounting prepared; original inputs saved and exact repair reversal passed.');
