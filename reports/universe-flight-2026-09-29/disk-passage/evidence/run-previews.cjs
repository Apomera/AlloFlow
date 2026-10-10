const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/disk-passage/previews');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha(path.join(repo,'stem_lab/universe_flight_scene.js')),sha(path.join(stage,'candidate-v2-renderer.js')));assert.equal(sha(path.join(repo,'dev-tools/build_universe_flight_previews.cjs')),sha(path.join(stage,'candidate-preview-builder.cjs')));
fs.mkdirSync(report,{recursive:true});assert.equal(fs.existsSync(path.join(report,'check.json')),false,'Preserve any earlier preview attempt before retrying');
const driverHash=sha(__filename),builderHash=sha(path.join(repo,'dev-tools/build_universe_flight_previews.cjs'));
function run(mode){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(repo,'dev-tools/build_universe_flight_previews.cjs'),mode],{cwd:repo,windowsHide:true,stdio:'inherit',env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',UNIVERSE_PREVIEW_REPORT:report}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(mode+' exit '+code)));});}
(async()=>{
 const before=JSON.parse(fs.readFileSync(path.join(repo,'reports/universe-flight-2026-09-29/disk-passage/preimages/preview-manifest.json')));
 await run('--build');await run('--check');
 const after=JSON.parse(fs.readFileSync(path.join(repo,'stem_lab/assets/universe-flight/highlights/manifest.json')));assert.equal(after.views.length,15);assert.equal(after.rendererHash,sha(path.join(stage,'candidate-v2-renderer.js')));
 const comparisons=before.views.map(old=>{const view=after.views.find(v=>v.file===old.file);assert.ok(view);assert.deepEqual(view.snapshot,old.snapshot);assert.equal(view.seconds,old.seconds);assert.equal(view.hash,old.hash);return{file:view.file,poseUnchanged:true,imageUnchanged:true,sha256:view.hash};});assert.equal(comparisons.length,12);
 const added=after.views.filter(v=>v.routeId==='disk');assert.deepEqual(added.map(v=>[v.highlightId,v.seconds,v.snapshot.targetId]),[['arms',10,'inner-arm'],['crossing',17,'inner-arm'],['panorama',40,'galactic-center']]);assert.ok(added.every(v=>v.snapshot.settings.fov===64&&v.snapshot.settings.mode==='explore'&&v.snapshot.settings.region==='galaxy'));
 assert.equal(sha(__filename),driverHash);assert.equal(sha(path.join(repo,'dev-tools/build_universe_flight_previews.cjs')),builderHash);
 const result={completed:true,driverHash,builderHash,rendererHash:after.rendererHash,unchangedViews:comparisons,newViews:added,totalViews:15};fs.writeFileSync(path.join(report,'check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({completed:true,oldImagesExact:12,newViews:3,totalViews:15}));
})().catch(error=>{fs.writeFileSync(path.join(report,'failure.json'),JSON.stringify({completed:false,driverHash,error:String(error)},null,2)+'\n');console.error(error);process.exitCode=1;});
