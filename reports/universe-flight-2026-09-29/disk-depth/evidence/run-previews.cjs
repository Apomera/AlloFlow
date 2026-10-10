const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/previews');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha(path.join(repo,'stem_lab/universe_flight_scene.js')),sha(path.join(stage,'candidate-renderer.js')));
fs.mkdirSync(report,{recursive:true});
const inputHash=sha(path.join(repo,'dev-tools/build_universe_flight_previews.cjs'));
function run(mode){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[path.join(repo,'dev-tools/build_universe_flight_previews.cjs'),mode],{cwd:repo,windowsHide:true,stdio:'inherit',env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',UNIVERSE_PREVIEW_REPORT:report}});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(mode+' exit '+code)));
});}
(async()=>{
 const before=JSON.parse(fs.readFileSync(path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/preimages/preview-manifest.json')));
 await run('--build');await run('--check');
 const after=JSON.parse(fs.readFileSync(path.join(repo,'stem_lab/assets/universe-flight/highlights/manifest.json')));
 assert.equal(after.rendererHash,sha(path.join(stage,'candidate-renderer.js')));assert.equal(after.views.length,12);
 const comparisons=after.views.map(view=>{
  const old=before.views.find(v=>v.file===view.file);assert.ok(old);assert.deepEqual(view.snapshot,old.snapshot);assert.equal(view.seconds,old.seconds);
  return{file:view.file,poseUnchanged:true,baselineHash:old.hash,candidateHash:view.hash,imageUnchanged:old.hash===view.hash};
 });
 assert.equal(sha(path.join(repo,'dev-tools/build_universe_flight_previews.cjs')),inputHash);
 const result={completed:true,builderHash:inputHash,rendererHash:after.rendererHash,views:comparisons};fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
