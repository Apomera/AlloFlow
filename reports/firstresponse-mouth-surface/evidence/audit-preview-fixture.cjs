const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const filenames=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(filenames.map(name=>[name,fs.readFileSync(path.join(work,name))]));
const pins=Object.fromEntries(Object.entries(bytes).map(([name,value])=>[name,sha(value)]));
assert.equal(pins['before.js'],'f551cf0c50073315effbf3fa5bcd9ce2dd3e1b806dbfcbd3f1434ba7e831af2c');
const delta=JSON.parse(bytes['delta.json']);assert.equal(delta.beforeSHA256,pins['before.js']);assert.equal(delta.afterSHA256,pins['candidate.js']);assert.notEqual(pins['candidate.js'],pins['before.js']);
const must=(source,token,message)=>assert.ok(source.includes(token),message);
function validate(fixture,runner,config){
  must(fixture,"const mouthNames=['fr-manikin-upper-lip','fr-manikin-lower-lip','fr-manikin-mouth'].sort();",'three named mouth meshes required');
  must(fixture,"geometry:o.geometry&&!/^fr-manikin-(?:upper-lip|lower-lip|mouth)$/.test(o.name)?exactGeometry(o.geometry):null",'only three mouth geometries excluded from exact scene');
  must(fixture,"function isMouthMesh(o){return /^fr-manikin-(?:upper-lip|lower-lip|mouth)$/.test(o.name);}",'mouth descriptor scope stays exact');
  must(fixture,"Object.keys(g.attributes).sort().forEach(function(k)",'all preserved geometry attributes hashed');
  must(fixture,"index:g.index?bufferHash(g.index.array):null",'preserved geometry indices hashed');
  must(fixture,"parameters:geometryParameters(g.parameters||null)",'preserved geometry parameters hashed');
  must(fixture,"key==='uuid'&&this.type==='Shape'",'only generated Shape UUID normalized');
  must(fixture,"expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);",'full preserved scene equality required');
  must(fixture,"['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','cheekContext','torsoMesh','contrast','headMaterial','noseMaterial']",'pose state contact context and skull preserved');
  must(fixture,"['geometries','calls','materials','programs']",'render resources all compared');
  must(fixture,"expect(value.draw.triangles).toBe(reference.draw.triangles+1960);",'exact rendered triangle increase');
  must(fixture,"expect(mesh.type).toBe(old.type);expect(mesh.parameters).toEqual(old.parameters);expect(mesh.vertices).toBe(1225);expect(mesh.vertices).toBe(old.vertices);expect(mesh.triangles).toBe(2208);expect(mesh.triangles).toBe(old.triangles);expect(mesh.indexCount).toBe(old.indexCount);expect(mesh.index).toEqual(old.index);expect(mesh.attributes.uv).toEqual(old.attributes.uv);",'lip count topology UV and sphere parameters preserved');
  must(fixture,"expect(mesh.attributes.position.array).not.toEqual(old.attributes.position.array);expect(mesh.attributes.normal.array).not.toEqual(old.attributes.normal.array);",'all intended position and normal buffers must change');
  must(fixture,"expect(mesh.name).toBe(old.name);expect(mesh.material).toEqual(old.material);expect(mesh.visible).toBe(old.visible);",'mouth identity material and visibility preserved');
  must(fixture,"expect(old.type).toBe('TubeGeometry');expect(old.vertices).toBe(189);expect(old.triangles).toBe(320);expect(old.indexCount).toBe(960);",'prior crease exact counts');
  must(fixture,"expect(mesh.type).toBe('BufferGeometry');expect(mesh.vertices).toBe(1237);expect(mesh.triangles).toBe(2280);expect(mesh.indexCount).toBe(6840);",'replacement crease exact counts');
  must(fixture,"expect(Object.keys(mesh.attributes).sort()).toEqual(['normal','position']);",'replacement crease exact attributes');
  must(fixture,"expect(mesh.parameters).toEqual({halfWidth:.0018,longitudinalSegments:96,transverseSamples:13});",'replacement crease exact topology parameters');
  must(fixture,"throw Error('Non-finite mouth/skull position '+o.name);",'finite mouth positions required');
  must(fixture,"throw Error('Non-finite mouth/skull normal '+o.name);",'finite mouth normals required');
  must(fixture,"expect(repeat.mouthMeshes).toEqual(value.mouthMeshes);",'repeat camera preserves mouth geometry');
  must(fixture,"expect(repeat.preservedScene).toEqual(value.preservedScene);",'repeat camera preserves complete scene');
  must(fixture,"expect(await harness.leakedAfterUnmount(page)).toEqual([]);",'native context cleanup required');
  must(fixture,"__faceDraws.get(c).disposeCount)).toBe(1);",'renderer disposed exactly once');
  must(fixture,"test.describe.configure({retries:0,timeout:450000});",'bounded no retry workflow');
  must(fixture,"context=hand.userData.inspection?hand.userData.inspection.context:[]",'resting head view handles absent hand inspection context');
  must(fixture,"if(!view.head)expect(value.cheekContext).toHaveLength(5);",'cheek context required in supporting hand view');
  must(runner,"if(delta.afterSHA256!==finalSHA)throw Error('Candidate/delta pin mismatch');",'candidate pinned to source delta');
  must(runner,"for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",'four shared runtime inputs guarded');
  must(runner,"if(timedOut)throw Error('Native runner exceeded 900000ms bound');",'runner timeout rejects late output');
  must(runner,"for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",'all input pins rechecked after browser');
  must(runner,"r.stats.unexpected || r.stats.skipped || r.stats.flaky",'failed skipped and flaky outcomes rejected');
  must(runner,"if(pair.length!==2 || pair.filter(e=>e.variant==='baseline').length!==1 || pair.filter(e=>e.variant==='candidate').length!==1)",'matched baseline and candidate required');
  must(runner,"!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",'face crops come from same captured frame');
  must(runner,"if(!pair[0].contrast&&changedPixels===0)throw Error('Shaded mouth refinement had no visible effect');",'normal view must change visible pixels');
  must(config,"testMatch:'firstresponse-face-preview.spec.ts'",'list target restricted to fixture');
  must(config,'workers:1,retries:0','one worker zero retries');
  assert.ok(!fixture.includes('isBrowMesh')&&!fixture.includes('browMeshes'),'previous brow exemption removed');
}
const fixture=bytes['firstresponse-face-preview.spec.ts'].toString(),runner=bytes['run-face-browser.cjs'].toString(),config=bytes['playwright-face.config.cjs'].toString();
validate(fixture,runner,config);
const negatives=[];
if(process.argv.includes('--selftest')){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'firstresponse-mouth-fixture-audit-')),file=path.join(temp,'fixture.spec.ts.saved'),backup=path.join(temp,'fixture.before.saved');
  fs.writeFileSync(file,bytes['firstresponse-face-preview.spec.ts']);fs.writeFileSync(backup,bytes['firstresponse-face-preview.spec.ts']);
  try{
    const mutations=[
      ['broaden-geometry-scope',"geometry:o.geometry&&!/^fr-manikin-(?:upper-lip|lower-lip|mouth)$/.test(o.name)?exactGeometry(o.geometry):null","geometry:o.geometry&&!/^fr-manikin-(?:upper-lip|lower-lip|mouth|nose)$/.test(o.name)?exactGeometry(o.geometry):null"],
      ['omit-preserved-scene',"expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);","void reference.preservedScene;"],
      ['permit-triangle-drift','expect(value.draw.triangles).toBe(reference.draw.triangles+1960);','expect(value.draw.triangles).toBeGreaterThan(0);'],
      ['skip-lip-index','expect(mesh.index).toEqual(old.index);',''],
      ['allow-unchanged-normal','expect(mesh.attributes.normal.array).not.toEqual(old.attributes.normal.array);',''],
      ['permit-crease-topology-drift','expect(mesh.triangles).toBe(2280);','expect(mesh.triangles).toBeGreaterThan(0);'],
    ];
    for(const [kind,old,next]of mutations){assert.equal(fixture.split(old).length,2,kind+' unique target');fs.writeFileSync(file,fixture.replace(old,next));let rejected=false;
      try{validate(fs.readFileSync(file,'utf8'),runner,config);}catch(error){rejected=true;negatives.push({kind,rejected:true,error:error.message});}
      finally{const saved=fs.readFileSync(backup);fs.writeFileSync(file,saved);assert.equal(sha(fs.readFileSync(file)),pins['firstresponse-face-preview.spec.ts']);validate(fs.readFileSync(file,'utf8'),runner,config);}
      assert.ok(rejected,kind+' mutation must fail');
    }
  }finally{fs.unlinkSync(file);fs.unlinkSync(backup);fs.rmdirSync(temp);}
}
let listing=null;
if(process.argv.includes('--list')){
  const args=[path.join(repo,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--config='+path.join(work,'playwright-face.config.cjs'),'--list'];
  const run=spawnSync(process.execPath,args,{cwd:repo,windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:path.join(work,'audit-list-only'),FIRST_RESPONSE_FACE_SOURCE_SHA:pins['candidate.js'],FIRST_RESPONSE_FACE_CANDIDATE:path.join(work,'candidate.js')}});
  assert.equal(run.status,0,'Playwright list failed: '+run.stdout+run.stderr);assert.match(run.stdout,/Total: 3 tests in 1 file/);
  for(const id of ['adult-support','adult-head','infant-head-contrast'])assert.ok(run.stdout.includes('mouth surface '+id+' preview at matching native view'));
  listing={exitCode:run.status,args,stdout:run.stdout,stderr:run.stderr,browserLaunched:false};
}
for(const [name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin,'input unchanged '+name);
const output={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'Only upper lip, lower lip and mouth crease geometry differs. All other geometry, materials, transforms, state, cameras and contact metadata are preserved exactly. Lip topology and UV data remain exact; the fitted mouth crease has 1,237 vertices and 2,280 triangles, adding exactly 1,960 rendered triangles. CPU validation separately checks geometry and surface fit.',negativeTests:negatives,list:listing,inputsUnchanged:true,sharedFilesWritten:0};
fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negatives.length,listedTests:listing?3:0,browserLaunched:false,candidateSHA256:output.candidateSHA256,fixtureSHA256:pins['firstresponse-face-preview.spec.ts'],runnerSHA256:pins['run-face-browser.cjs']}));
