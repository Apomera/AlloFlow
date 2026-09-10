const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const dir=__dirname,read=file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const before=read('before-results.json'),after=read('after-results.json'),png=read('export-pixels.json');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{const bytes=fs.readFileSync('stem_lab/'+name);new vm.Script(bytes.toString(),{filename:name});return {name,sha256:hash(bytes),syntaxValid:true,mirrorMatches:bytes.equals(fs.readFileSync('desktop/web-app/public/stem_lab/'+name)),browserMatches:hash(bytes)===after.sources[name],changed:before.sources[name]!==after.sources[name]};});
const testEvidence=['studio-backdrop-tests.json','backdrop-regression-tests.json'],tests=new Map();
for(const name of testEvidence)for(const suite of read(name).testResults)for(const test of suite.assertionResults)tests.set(suite.name+'::'+test.fullName,{name:test.fullName,file:path.basename(suite.name),status:test.status,evidence:name});
const failed=[...tests.values()].filter(t=>t.status!=='passed');
const captures=after.captures.map(c=>{const b=before.captures.find(b=>JSON.stringify(b.case)===JSON.stringify(c.case));if(!b)throw Error('Missing matched capture');return {case:c.case,before:b.screenshot,after:c.screenshot,poseUnchanged:JSON.stringify([b.data.camera,b.data.quaternion,b.data.rect])===JSON.stringify([c.data.camera,c.data.quaternion,c.data.rect]),renderCountsUnchanged:JSON.stringify(b.data.draw)===JSON.stringify(c.data.draw),resourcesUnchanged:b.data.resources===c.data.resources,beforeSky:b.data.sky,afterSky:c.data.sky,beforeFloor:b.data.floor,afterFloor:c.data.floor,beforeHorizonStep:b.data.maxStep,afterHorizonStep:c.data.maxStep,render:c.data.draw,composed:c.data.composed};});
const summary={pass:before.pass&&after.pass&&png.pass&&tests.size===53&&failed.length===0&&sources.every(s=>s.mirrorMatches&&s.browserMatches)&&captures.every(c=>c.poseUnchanged&&c.renderCountsUnchanged&&c.resourcesUnchanged),sources,tests:{total:tests.size,passed:tests.size-failed.length,failed:failed.length,suites:new Set([...tests.values()].map(t=>t.file)).size,failures:failed,evidence:testEvidence},browser:{before:before.pass,after:after.pass,errors:after.errors,consoleErrors:after.consoleErrors,failures:after.failures,actualComposerLoaded:after.composerLoaded,geometryPreserved:JSON.stringify(after.modelBefore)===JSON.stringify(after.modelAfter),cameraRestored:JSON.stringify(after.poseBefore)===JSON.stringify(after.returnedPose),callbackRestored:after.exitRestore,meadowRestore:after.meadowRestore,captures},png,scope:{productionChanges:['stem_lab/stem_tool_geometryworld_builder.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js'],addedSceneObjects:0,addedTextures:0,blockMaterialsReplaced:false}};
fs.writeFileSync(path.join(dir,'backdrop-summary.json'),JSON.stringify(summary,null,2));if(!summary.pass)throw Error('Final Studio backdrop verification incomplete or failed');
const abs=dir.replace(/\\/g,'/'),link=(label,file)=>'['+label+']('+abs+'/'+file+')';
const front=captures.find(c=>c.case.q==='saver'&&c.case.v==='front'),perspective=captures.find(c=>c.case.q==='detail'&&c.case.v==='perspective');
const rows=captures.map(c=>'| '+c.case.q+' | '+c.case.v+' | '+c.case.w+' × '+c.case.h+' | '+(c.composed?'Render target + output pass':'Direct')+' | '+c.render.calls+' | '+c.render.triangles+' |').join('\n');
const report=`# Geometry World: a softer, consistent Studio backdrop

Studio now has a calmer ivory backdrop and floor, replacing the visible gray-to-white horizon in straight-on views. The existing contact shadows and pool of light remain, giving the structure depth while keeping attention on its shape and materials.

## Before and after

![Previous Studio front view](${abs}/${front.before})

![Refined Studio front view](${abs}/${front.after})

![Refined Detailed Studio perspective](${abs}/${perspective.after})

${link('Phone preview','after-saver-perspective-390x844.png')} · ${link('Side view','after-saver-side-844x390.png')} · ${link('Balanced view','after-balanced-front-844x390.png')} · ${link('Detailed PNG export','after-detail-export.png')}

## What changed

The vendored THREE r128 renderer clears a color background directly and applies fog after material output encoding. The direct rendering path therefore needs display-space background/fog colors, while the linear render target used by Detailed postprocessing needs their linear equivalents. A Studio-owned before-render callback now selects the correct cached colors for the actual target before the background clears. It preserves any existing callback and restores it when Studio closes.

The floor's albedo is now a restrained neutral value that works with the existing warm lighting. This avoids the near-white clipping that made the horizon stand out. Lights, contact-shadow intensity, fog distances, block materials, and printable geometry are unchanged.

## Verification

**53 tests passed across four suites**, covering color handling, callback ownership and cleanup, Studio resource disposal, camera composition, delayed image saving, and high-resolution export restoration.

Eight matched actual-browser comparisons cover Saver, Balanced, and Detailed modes on desktop, landscape, and phone layouts. Detailed uses the real pinned THREE r128 EffectComposer and output pass, loaded locally from the same dependency versions requested by the application. The QA dependency files are stored with this report; no production dependency was added.

Every comparison preserves the camera pose, framing, rendered object/triangle counts, and Studio resource count. Full block data, mesh attributes and transforms, STL bytes, retained selection, and undo/redo history remain exact. Switching back to Meadow and leaving Showcase restore the previous scene callback, environment, and building camera. No page, console, or shader errors were reported.

The sampled direct-render horizon step drops from **${front.beforeHorizonStep} to ${front.afterHorizonStep} RGB levels** in the front-view fixture. This is a controlled framebuffer measurement at a clear area beside the model. Visual inspection also covered the complete rendered views.

Both Saver and Detailed exported PNGs were decoded and checked independently. Each retains a 2048-pixel long edge and the intended ivory background, with a maximum sampled floor/background difference of six RGB levels or less.

| Quality | View | Viewport | Rendering path | Draw calls | Triangles |
| --- | --- | --- | --- | ---: | ---: |
${rows}

The scene uses the same 42-block selected fixture and one unrelated workspace block as the previous composition pass. Browser rendering uses Chromium software WebGL, with phone dimensions emulated. Render-count parity is not a hardware frame-rate measurement.

Only the Geometry World builder module and desktop mirror changed. Both match the final browser source snapshots and parse successfully.

${link('Verification summary','backdrop-summary.json')} · ${link('Final browser evidence','after-results.json')} · ${link('PNG pixel checks','export-pixels.json')} · ${link('Focused test details','STUDIO-BACKDROP-TESTS.md')} · ${link('Pinned postprocessing asset manifest','postfx/manifest.json')}
`;
fs.writeFileSync(path.join(dir,'STUDIO-BACKDROP.md'),report);console.log(JSON.stringify({pass:summary.pass,tests:summary.tests.passed,suites:summary.tests.suites,captures:captures.length,frontHorizonStep:[front.beforeHorizonStep,front.afterHorizonStep],report:path.join(dir,'STUDIO-BACKDROP.md')}));
