const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const filenames=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(filenames.map(name=>[name,fs.readFileSync(path.join(work,name))]));
const pins=Object.fromEntries(Object.entries(bytes).map(([name,value])=>[name,sha(value)]));
assert.equal(pins['candidate.js'],'f551cf0c50073315effbf3fa5bcd9ce2dd3e1b806dbfcbd3f1434ba7e831af2c');
assert.equal(pins['before.js'],'546cbd2a4ebb7fd6c8930846ec754a8d329883b7ae820a5c1cfee61e836e4cb6');
const must=(source,token,message)=>assert.ok(source.includes(token),message);
function validate(fixture,runner,config){
  must(fixture,"const browNames=['fr-manikin-brow-left','fr-manikin-brow-right'].sort();",'two named brows required');
  must(fixture,"geometry:o.geometry&&!/^fr-manikin-brow-(?:left|right)$/.test(o.name)?exactGeometry(o.geometry):null",'only two brow geometries excluded from exact scene');
  must(fixture,"function isBrowMesh(o){return /^fr-manikin-brow-(?:left|right)$/.test(o.name);}",'brow descriptor scope stays exact');
  must(fixture,"Object.keys(g.attributes).sort().forEach(function(k)",'all preserved geometry attributes hashed');
  must(fixture,"index:g.index?bufferHash(g.index.array):null",'preserved geometry indices hashed');
  must(fixture,"parameters:geometryParameters(g.parameters||null)",'preserved geometry parameters hashed');
  must(fixture,"key==='uuid'&&this.type==='Shape'",'only generated Shape UUID normalized');
  must(fixture,"expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);",'full preserved-scene equality required');
  must(fixture,"['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','cheekContext','torsoMesh','contrast','headMaterial','noseMaterial']",'pose/state/contact context and skull preserved');
  must(fixture,"['geometries','calls','materials','programs']",'render resources all compared');
  must(fixture,"expect(value.draw.triangles).toBe(reference.draw.triangles);",'exact rendered triangle count');
  must(fixture,"expect(brow.vertices).toBe(old.vertices);expect(brow.triangles).toBe(old.triangles);expect(brow.index).toEqual(old.index);expect(brow.attributes.uv).toEqual(old.attributes.uv);",'brow count topology UV preserved');
  must(fixture,"expect(brow.attributes.position.array).not.toEqual(old.attributes.position.array);expect(brow.attributes.normal.array).not.toEqual(old.attributes.normal.array);",'both intended buffers must change');
  must(fixture,"expect(brow.name).toBe(old.name);expect(brow.material).toEqual(old.material);",'brow identity material preserved');
  must(fixture,"expect(repeat.preservedScene).toEqual(value.preservedScene);",'repeat camera preserves complete scene');
  must(fixture,"expect(await harness.leakedAfterUnmount(page)).toEqual([]);",'native context cleanup required');
  must(fixture,"__faceDraws.get(c).disposeCount)).toBe(1);",'renderer disposed exactly once');
  must(fixture,"test.describe.configure({retries:0,timeout:450000});",'bounded no-retry workflow');
  must(runner,"if(delta.afterSHA256!==finalSHA)throw Error('Candidate/delta pin mismatch');",'candidate pinned to source delta');
  must(runner,"for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",'four shared runtime inputs guarded');
  must(runner,"if(timedOut)throw Error('Native runner exceeded 900000ms bound');",'runner timeout rejects even passed late output');
  must(runner,"for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",'all input pins rechecked after browser');
  must(runner,"r.stats.unexpected || r.stats.skipped || r.stats.flaky",'failed skipped and flaky outcomes rejected');
  must(runner,"if(pair.length!==2 || pair.filter(e=>e.variant==='baseline').length!==1 || pair.filter(e=>e.variant==='candidate').length!==1)",'matching baseline/candidate evidence required');
  must(runner,"!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",'face crops proven from stage capture');
  must(runner,"if(!pair[0].contrast&&changedPixels===0)throw Error('Shaded brow refinement had no visible effect');",'normal view must change visible pixels');
  must(config,"testMatch:'firstresponse-face-preview.spec.ts'",'list target restricted to one fixture');
  must(config,'workers:1,retries:0','one worker zero retries');
  assert.ok(!fixture.includes('fr-manikin-(?:upper-lid|lower-lid)-'), 'no eyelid exclusion was carried into brow scope');
}
const fixture=bytes['firstresponse-face-preview.spec.ts'].toString(),runner=bytes['run-face-browser.cjs'].toString(),config=bytes['playwright-face.config.cjs'].toString();
validate(fixture,runner,config);
const negatives=[];
if(process.argv.includes('--selftest')){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'firstresponse-brow-fixture-audit-')),file=path.join(temp,'fixture.spec.ts.saved'),backup=path.join(temp,'fixture.before.saved');
  fs.writeFileSync(file,bytes['firstresponse-face-preview.spec.ts']);fs.writeFileSync(backup,bytes['firstresponse-face-preview.spec.ts']);
  try{
    const mutations=[
      ['broaden-geometry-scope',"geometry:o.geometry&&!/^fr-manikin-brow-(?:left|right)$/.test(o.name)?exactGeometry(o.geometry):null","geometry:o.geometry&&!/^fr-manikin-(?:brow|upper-lid)-(?:left|right)$/.test(o.name)?exactGeometry(o.geometry):null"],
      ['omit-preserved-scene',"expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);","void reference.preservedScene;"],
      ['permit-triangle-drift','expect(value.draw.triangles).toBe(reference.draw.triangles);','expect(value.draw.triangles).toBeGreaterThan(0);'],
      ['skip-brow-index','expect(brow.index).toEqual(old.index);',''],
      ['allow-unchanged-normal','expect(brow.attributes.normal.array).not.toEqual(old.attributes.normal.array);',''],
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
  for(const id of ['adult-support','adult-head','infant-head-contrast'])assert.ok(run.stdout.includes('brow finish '+id+' preview at matching native view'));
  listing={exitCode:run.status,args,stdout:run.stdout,stderr:run.stderr,browserLaunched:false};
}
for(const [name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin,'input unchanged '+name);
const output={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'Only position and normal brow geometry buffers differ. Native exact-scene comparison preserves every eyelid and eye geometry plus materials and transforms. CPU validation separately checks full brow topology and surface fit.',negativeTests:negatives,list:listing,inputsUnchanged:true,sharedFilesWritten:0};
fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negatives.length,listedTests:listing?3:0,browserLaunched:false,candidateSHA256:output.candidateSHA256,fixtureSHA256:pins['firstresponse-face-preview.spec.ts'],runnerSHA256:pins['run-face-browser.cjs']}));
