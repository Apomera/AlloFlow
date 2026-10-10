const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const filenames=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(filenames.map(name=>[name,fs.readFileSync(path.join(work,name))]));
const pins=Object.fromEntries(Object.entries(bytes).map(([name,value])=>[name,sha(value)]));
assert.equal(pins['before.js'],'0af58d9afd30ed0de275caf53197320ddabed9308f08b191cce7bf4927d83f84');
const delta=JSON.parse(bytes['delta.json']);assert.equal(delta.beforeSHA256,pins['before.js']);assert.equal(delta.afterSHA256,pins['candidate.js']);assert.notEqual(pins['candidate.js'],pins['before.js']);
const must=(source,token,message)=>assert.ok(source.includes(token),message);
const requiredFixture=[
 ["var faceProjection=projected(head,function(o){return /^fr-manikin-(?:brow|upper-lid|lower-lid|eye)-(?:left|right)$/.test(o.name) || /^fr-manikin-(?:upper-lip|lower-lip|mouth)$/.test(o.name);});",'crop bounds use only unchanged facial landmarks'],
 ["const noseNames=['fr-manikin-nose','fr-manikin-nostril-left','fr-manikin-nostril-right'].sort();",'three named nose meshes required'],
 ["geometry:o.geometry&&!/^fr-manikin-(?:nose|nostril-(?:left|right))$/.test(o.name)?exactGeometry(o.geometry):null",'only three nose geometries excluded from exact scene'],
 ["function isNoseMesh(o){return /^fr-manikin-(?:nose|nostril-(?:left|right))$/.test(o.name);}",'descriptor scope stays exact'],
 ["Object.keys(g.attributes).sort().forEach(function(k)",'all preserved geometry attributes hashed'],
 ["index:g.index?bufferHash(g.index.array):null",'preserved geometry indices hashed'],
 ["parameters:geometryParameters(g.parameters||null)",'preserved geometry parameters hashed'],
 ["key==='uuid'&&this.type==='Shape'",'only generated Shape UUID normalized'],
 ["expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);",'full preserved scene equality required'],
 ["['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','cheekContext','torsoMesh','contrast','headMaterial','noseMaterial']",'pose state contact context and skull preserved'],
 ["['geometries','calls','materials','programs']",'render resources all compared'],
 ["expect(value.draw.triangles).toBe(reference.draw.triangles);",'exact rendered triangle count'],
 ["expect(mesh.type).toBe(old.type);expect(mesh.parameters).toEqual(old.parameters);expect(mesh.vertices).toBe(mesh.name==='fr-manikin-nose'?1617:825);expect(mesh.vertices).toBe(old.vertices);expect(mesh.triangles).toBe(mesh.name==='fr-manikin-nose'?2976:1472);expect(mesh.triangles).toBe(old.triangles);expect(mesh.indexCount).toBe(old.indexCount);expect(mesh.index).toEqual(old.index);expect(mesh.attributes.uv).toEqual(old.attributes.uv);",'nose topology UV and sphere parameters preserved'],
 ["expect(mesh.attributes.position.array).not.toEqual(old.attributes.position.array);expect(mesh.attributes.normal.array).not.toEqual(old.attributes.normal.array);",'both intended buffers must change'],
 ["expect(mesh.name).toBe(old.name);expect(mesh.material).toEqual(old.material);expect(mesh.visible).toBe(old.visible);",'mesh identity material and visibility preserved'],
 ["expect(Object.keys(mesh.attributes).sort()).toEqual(Object.keys(old.attributes).sort());",'attribute names exact'],
 ["for(const key of ['position','normal']){expect(mesh.attributes[key].count).toBe(old.attributes[key].count);expect(mesh.attributes[key].itemSize).toBe(old.attributes[key].itemSize);}",'mutable buffer shapes exact'],
 ["throw Error('Non-finite nose/skull position '+o.name);",'finite positions required'],
 ["throw Error('Non-finite nose/skull normal '+o.name);",'finite normals required'],
 ["expect(repeat.noseMeshes).toEqual(value.noseMeshes);",'repeat camera preserves geometry'],
 ["expect(repeat.preservedScene).toEqual(value.preservedScene);",'repeat camera preserves complete scene'],
 ["expect(await harness.leakedAfterUnmount(page)).toEqual([]);",'native context cleanup required'],
 ["__faceDraws.get(c).disposeCount)).toBe(1);",'renderer disposed exactly once'],
 ["test.describe.configure({retries:0,timeout:450000});",'bounded no retry workflow'],
 ["context=hand.userData.inspection?hand.userData.inspection.context:[]",'head view tolerates absent hand inspection context'],
 ["if(!view.head)expect(value.cheekContext).toHaveLength(5);",'supporting hand context required'],
 ["expect(value.faceProjection).toEqual(reference.faceProjection);",'unchanged facial projection'],
 ["p=value.faceProjection;",'fixed facial projection supplies detail crop'],
 ["file=prefix+'-face.png'",'face detail output'],
 ["await page.getByRole('button',{name:view.head?'Head close-up':'Supporting hand close-up',exact:true}).click();",'native camera controls used'],
];
function validate(fixture,runner,config){
 for(const [token,message]of requiredFixture)must(fixture,token,message);
 for(const [token,message]of [
  ["if(delta.afterSHA256!==finalSHA)throw Error('Candidate/delta pin mismatch');",'candidate source delta pin'],
  ["for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",'four runtime copies guarded'],
  ["if(timedOut)throw Error('Native runner exceeded 900000ms bound');",'bounded runner'],
  ["for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",'input pins rechecked'],
  ["r.stats.unexpected || r.stats.skipped || r.stats.flaky",'failed skipped flaky rejected'],
  ["if(pair.length!==2 || pair.filter(e=>e.variant==='baseline').length!==1 || pair.filter(e=>e.variant==='candidate').length!==1)",'matched variants required'],
  ["!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",'same captured frame crop'],
  ["if(!pair[0].contrast&&changedPixels===0)throw Error('Shaded nose refinement had no visible effect');",'normal view must change visible pixels'],
  ["if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Face comparison framing changed '+id);",'identical comparison framing'],
  ["images.filter(p=>p.endsWith('-face.png')).length!==expectedEvidence",'paired face crops required'],
 ])must(runner,token,message);
 must(config,"testMatch:'firstresponse-face-preview.spec.ts'",'restricted list target');must(config,'workers:1,retries:0','one worker zero retries');
 assert.ok(!fixture.includes('isMouthMesh')&&!fixture.includes('mouthMeshes')&&!fixture.includes('isBrowMesh'),'prior geometry exemptions removed');
}
const fixture=bytes['firstresponse-face-preview.spec.ts'].toString(),runner=bytes['run-face-browser.cjs'].toString(),config=bytes['playwright-face.config.cjs'].toString();validate(fixture,runner,config);
const negatives=[];
if(process.argv.includes('--selftest')){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'firstresponse-nose-fixture-audit-')),file=path.join(temp,'fixture.spec.ts.saved'),backup=path.join(temp,'fixture.before.saved');fs.writeFileSync(file,bytes['firstresponse-face-preview.spec.ts']);fs.writeFileSync(backup,bytes['firstresponse-face-preview.spec.ts']);
 try{
  const mutations=[
   ['broaden-geometry-scope',"geometry:o.geometry&&!/^fr-manikin-(?:nose|nostril-(?:left|right))$/.test(o.name)?exactGeometry(o.geometry):null","geometry:o.geometry&&!/^fr-manikin-(?:nose|nostril-(?:left|right)|mouth)$/.test(o.name)?exactGeometry(o.geometry):null"],
   ['omit-preserved-scene',"expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);","void reference.preservedScene;"],
   ['permit-triangle-drift','expect(value.draw.triangles).toBe(reference.draw.triangles);','expect(value.draw.triangles).toBeGreaterThan(0);'],
   ['skip-nose-index','expect(mesh.index).toEqual(old.index);',''],
   ['allow-unchanged-normal','expect(mesh.attributes.normal.array).not.toEqual(old.attributes.normal.array);',''],
   ['crop-changing-nose',"var faceProjection=projected(head,function(o){return /^fr-manikin-(?:brow|upper-lid|lower-lid|eye)-(?:left|right)$/.test(o.name) || /^fr-manikin-(?:upper-lip|lower-lip|mouth)$/.test(o.name);});","var faceProjection=projected(head,function(o){return isNoseMesh(o);});"],
  ];
  for(const[kind,old,next]of mutations){assert.equal(fixture.split(old).length,2,kind+' unique target');fs.writeFileSync(file,fixture.replace(old,next));let rejected=false;try{validate(fs.readFileSync(file,'utf8'),runner,config);}catch(error){rejected=true;negatives.push({kind,rejected:true,error:error.message});}finally{fs.writeFileSync(file,fs.readFileSync(backup));assert.equal(sha(fs.readFileSync(file)),pins['firstresponse-face-preview.spec.ts']);validate(fs.readFileSync(file,'utf8'),runner,config);}assert.ok(rejected,kind+' must fail');}
 }finally{fs.unlinkSync(file);fs.unlinkSync(backup);fs.rmdirSync(temp);}
}
let listing=null;
if(process.argv.includes('--list')){
 const args=[path.join(repo,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--config='+path.join(work,'playwright-face.config.cjs'),'--list'];
 const run=spawnSync(process.execPath,args,{cwd:repo,windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:path.join(work,'audit-list-only'),FIRST_RESPONSE_FACE_SOURCE_SHA:pins['candidate.js'],FIRST_RESPONSE_FACE_CANDIDATE:path.join(work,'candidate.js')}});
 assert.equal(run.status,0,'Playwright list failed: '+run.stdout+run.stderr);assert.match(run.stdout,/Total: 3 tests in 1 file/);for(const id of ['adult-support','adult-support-before','infant-support-contrast'])assert.ok(run.stdout.includes('nose contour '+id+' preview at matching native view'));listing={exitCode:run.status,args,stdout:run.stdout,stderr:run.stderr,browserLaunched:false};
}
for(const[name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin,'input unchanged '+name);
const output={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'Only the nose and paired nostril position and normal buffers may differ. All other geometry, topology, UV data, materials including the contrast nose shader, transforms, state, cameras, contact metadata and render/resource counts remain exact. Face detail crops use unchanged facial landmarks and match pixel framing across variants. CPU validation separately checks surface fit.',negativeTests:negatives,list:listing,inputsUnchanged:true,sharedFilesWritten:0};fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negatives.length,listedTests:listing?3:0,browserLaunched:false,candidateSHA256:output.candidateSHA256,fixtureSHA256:pins['firstresponse-face-preview.spec.ts'],runnerSHA256:pins['run-face-browser.cjs']}));
