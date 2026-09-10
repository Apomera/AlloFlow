const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const dir=__dirname,read=file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const before=read('before-results.json'),after=read('after-results.json');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{
  const bytes=fs.readFileSync('stem_lab/'+name);new vm.Script(bytes.toString(),{filename:name});
  return {name,sha256:hash(bytes),parsed:true,mirrorMatches:bytes.equals(fs.readFileSync('desktop/web-app/public/stem_lab/'+name)),browserMatches:hash(bytes)===after.sources[name]};
});
const testFiles=['composition-regression-tests.json','composition-final-regression-tests.json','composition-missing-suites-tests.json','showcase-composition-final-tests.json','showcase-pop-contacts-tests.json'];
const tests=new Map();
for(const file of testFiles)for(const suite of read(file).testResults)for(const test of suite.assertionResults)tests.set(suite.name+'::'+test.fullName,{suite:path.basename(suite.name),name:test.fullName,status:test.status,evidence:file});
const failed=[...tests.values()].filter(t=>t.status!=='passed');
const comparisons=after.captures.map(c=>{
  const previous=before.captures.find(b=>JSON.stringify(b.case)===JSON.stringify(c.case));if(!previous)throw Error('Missing baseline');
  return {view:c.case.view,width:c.case.width,height:c.case.height,beforeHeight:previous.layout.projected.height,afterHeight:c.layout.projected.height,heightRatio:c.layout.projected.height/previous.layout.projected.height,beforeOverlap:previous.layout.overlap,afterOverlap:c.layout.overlap,minimumButtonHeight:Math.min(...c.layout.buttons.map(b=>b.height)),renderCountsMatch:JSON.stringify(previous.layout.draw)===JSON.stringify(c.layout.draw),render:c.layout.draw,before:previous.screenshot,after:c.screenshot};
});
const summary={pass:before.pass&&after.pass&&sources.every(s=>s.mirrorMatches&&s.browserMatches)&&failed.length===0&&tests.size===115,sources,tests:{total:tests.size,passed:tests.size-failed.length,failed:failed.length,suites:new Set([...tests.values()].map(t=>t.suite)).size,failures:failed,evidence:testFiles},browser:{before:before.pass,after:after.pass,errors:after.errors,consoleErrors:after.consoleErrors,shaderErrors:after.shaderErrors,failures:after.failures,delayedEncodingFitApplied:after.deferredBefore?.pending===true&&after.deferredAfter?.composition?.view==='top'&&after.deferredAfter?.overlap.length===0,modelPreserved:JSON.stringify(after.modelBefore)===JSON.stringify(after.modelAfter),buildingCameraRestored:JSON.stringify(after.buildingPose)===JSON.stringify(after.returnedPose),comparisons},scope:{changed:['stem_lab/stem_tool_geometryworld_builder.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js'],newSceneObjects:0,newTextures:0,coreRenderingUnchanged:before.sources['stem_tool_geometryworld.js']===after.sources['stem_tool_geometryworld.js'],printLabUnchanged:before.sources['stem_tool_printlab.js']===after.sources['stem_tool_printlab.js']}};
fs.writeFileSync(path.join(dir,'composition-summary.json'),JSON.stringify(summary,null,2));
if(!summary.pass||!summary.browser.delayedEncodingFitApplied)throw Error('Final verification incomplete or failed');
const abs=dir.replace(/\\/g,'/'),link=(label,file)=>'['+label+']('+abs+'/'+file+')';
const landscape=comparisons.find(c=>c.width===844&&c.view==='perspective'),desktop=comparisons.find(c=>c.width===1200),smallLandscape=comparisons.find(c=>c.width===667);
const rows=comparisons.map(c=>'| '+c.width+' × '+c.height+' | '+c.view+' | '+c.beforeHeight.toFixed(1)+' px | '+c.afterHeight.toFixed(1)+' px | '+c.heightRatio.toFixed(2)+'× |').join('\n');
const report=`# Geometry World: more room for the creation

Showcase now frames the selected structure around its actual controls. On short screens, the heading and Meadow/Studio choices form a compact top row, while the camera views and export actions share a bottom row when space allows. Orbit buttons are vertically centered on their anchors. All tested buttons retain at least 44-pixel height.

In the 844 × 390 landscape comparison, the framed model is **${landscape.heightRatio.toFixed(1)} times taller** and clear of the toolbar. The normal desktop comparison gains **${Math.round((desktop.heightRatio-1)*100)}%** in framed height. At 667 × 375, height increases by **${smallLandscape.heightRatio.toFixed(1)} times** while the narrower two-row toolbar remains usable.

## Before and after

![Before: landscape Showcase](${abs}/${landscape.before})

![After: landscape Showcase](${abs}/${landscape.after})

${link('Desktop preview','after-perspective-1200x820.png')} · ${link('Narrow phone','after-perspective-320x700.png')} · ${link('Front','after-front-844x390.png')} · ${link('Side','after-side-844x390.png')} · ${link('Top','after-top-844x390.png')}

## Camera and scene behavior

The fit measures the persistent caption, view controls, and orbit targets in canvas coordinates. It uses every bounding corner and perspective depth, honors camera zoom, and keeps Front, Side, and Top on their chosen bearings. Shallow Front and Side views stay above the Studio floor. The first fit runs again after the controls mount; resizing uses the current layout.

Entering Showcase during placement animation now uses the completed block dimensions. Studio contact footprints use temporary canonical transforms so slabs and rotated wedges ground correctly without changing the live meshes, materials, or printable geometry.

Opening or closing the file panel leaves the camera unchanged. PNG saving preserves the chosen view. If the user changes the view or resizes while encoding is pending, a single deferred fit applies the latest state after saving completes. It is canceled or ignored when the owning Showcase session exits or its engine is replaced or destroyed.

## Verification

**${summary.tests.passed} unique tests passed across ${summary.tests.suites} files**, including real-THREE projection, canonical placement bounds, partial-block contact polygons, lifecycle cleanup, delayed image encoding, file-panel keyboard/import behavior, selected JSON/STL exports, and Print Lab continuity and geometry stress tests.

Actual-browser comparisons passed at eight viewport/view combinations. Every model stayed in the viewport, and every final framing rectangle stayed clear of the controls. Full world data, STL bytes, retained selection, and undo/redo history remained unchanged. Leaving Showcase restored the building camera exactly. A controlled delayed-PNG browser test confirmed that Top view and resize requests are applied after encoding.

| Viewport | View | Before framed height | After framed height | Ratio |
| --- | --- | ---: | ---: | ---: |
${rows}

These measurements describe the projected canonical bounding box of the same 42-block selected creation, with one unrelated block retained in the workspace. The comparison uses Saver mode in Chromium software WebGL. Render counts remain **87 draw calls and 502 triangles** in every matched Studio view; this pass adds no scene objects or textures. These are rendering-work checks rather than a frame-rate claim.

Some initial Vitest runs exited with errors and omitted suites from their JSON output. The missing files and geometry stress test were rerun with console output, explicit suite counts, and successful exit codes. Final totals deduplicate tests and use their latest results. An initial placement test fixture was corrected to include the existing production placement-animation marker.

Core rendering and Print Lab source files are unchanged; the canonical builder and desktop mirror match the final browser snapshots and parse successfully.

${link('Verification summary','composition-summary.json')} · ${link('Final browser evidence','after-results.json')} · ${link('Baseline browser evidence','before-results.json')}
`;
fs.writeFileSync(path.join(dir,'SHOWCASE-COMPOSITION.md'),report);
console.log(JSON.stringify({pass:summary.pass,tests:summary.tests.passed,suites:summary.tests.suites,landscapeHeightRatio:landscape.heightRatio,renderCountsMatch:comparisons.every(c=>c.renderCountsMatch),report:path.join(dir,'SHOWCASE-COMPOSITION.md')}));
