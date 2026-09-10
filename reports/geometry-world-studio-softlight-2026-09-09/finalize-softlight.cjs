const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const dir=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=read('before-results.json'),after=read('after-results.json'),edge=read('edge-build-results.json'),pixels=read('shadow-pixels.json'),pngExports=read('export-pixels.json');
const sources=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name=>{const bytes=fs.readFileSync('stem_lab/'+name);new vm.Script(bytes.toString(),{filename:name});const sha256=hash(bytes);return {name,sha256,syntaxValid:true,mirrorsMatch:bytes.equals(fs.readFileSync('desktop/web-app/public/stem_lab/'+name)),browserMatches:sha256===after.sources[name]&&sha256===edge.sources[name],changed:sha256!==before.sources[name]};});
const tests=new Map();for(const file of ['softlight-tests.json','softlight-regression-tests.json'])for(const suite of read(file).testResults)for(const t of suite.assertionResults)tests.set(suite.name+'::'+t.fullName,{file:path.basename(suite.name),name:t.fullName,status:t.status});
const captures=after.captures.map(c=>{const b=before.captures.find(b=>JSON.stringify(b.case)===JSON.stringify(c.case));if(!b)throw Error('Missing matched capture');return {case:c.case,before:b.screenshot,after:c.screenshot,poseUnchanged:JSON.stringify([b.data.camera,b.data.quaternion,b.data.rect])===JSON.stringify([c.data.camera,c.data.quaternion,c.data.rect]),drawUnchanged:JSON.stringify(b.data.draw)===JSON.stringify(c.data.draw),resourcesUnchanged:b.data.resources===c.data.resources,shadowMapUnchanged:JSON.stringify([b.data.shadowType,b.data.shadowMap])===JSON.stringify([c.data.shadowType,c.data.shadowMap]),render:c.data.draw};});
const summary={pass:before.pass&&after.pass&&edge.pass&&pixels.pass&&pngExports.pass&&tests.size>=75&&new Set([...tests.values()].map(t=>t.file)).size===5&&[...tests.values()].every(t=>t.status==='passed')&&sources.every(s=>s.mirrorsMatch&&s.browserMatches&&s.changed===(s.name==='stem_tool_geometryworld_builder.js'))&&captures.length===12&&captures.every(c=>c.poseUnchanged&&c.drawUnchanged&&c.resourcesUnchanged&&c.shadowMapUnchanged),sources,tests:{total:tests.size,passed:[...tests.values()].filter(t=>t.status==='passed').length,suites:new Set([...tests.values()].map(t=>t.file)).size},browser:{before:before.pass,after:after.pass,actualComposer:after.composerLoaded,captures,edgeBuilds:edge},pixels,exports:pngExports,scope:{floorOnly:true,maxWorldSpaceSoftness:.14,depthComparisonsBefore:16,depthComparisonsAfter:16,addedShadowMaps:0,addedPasses:0,addedLights:0}};
fs.writeFileSync(path.join(dir,'softlight-summary.json'),JSON.stringify(summary,null,2));if(!summary.pass)throw Error('Softlight verification incomplete');
const abs=dir.replace(/\\/g,'/'),link=(label,file)=>'['+label+']('+abs+'/'+file+')',img=(label,file)=>'!'+link(label,file);
const p=captures.find(c=>c.case.q==='detail'&&c.case.v==='perspective'&&c.case.w===1200);
const rows=captures.map(c=>'| '+c.case.q+' | '+c.case.v+' | '+c.case.w+' × '+c.case.h+' | '+c.render.calls+' | '+c.render.triangles+' |').join('\n');
const report=`# Geometry World: softer Studio shadows

Studio now gives structures a softer projected floor shadow in Balanced and Detailed modes. The edge fades gently into the ivory stage while the block surfaces and contact shading remain crisp.

## Before and after

${img('Previous Studio shadow',p.before)}

${img('Refined Studio shadow',p.after)}

${link('Phone preview','after-detail-perspective-390x844.png')} · ${link('Top view','after-detail-top-1200x820.png')} · ${link('Landscape preview','after-detail-perspective-844x390.png')} · ${link('2048px PNG export','after-detail-perspective-export.png')}

## Implementation

The Studio floor receives a material-local shadow filter using 16 fixed disk samples. The filter replaces only the pinned THREE r128 PCFSoft branch on that floor. Its radius scales with the creation’s bounds up to 0.14 world units, so single-block close-ups retain clean edges. The radius stays consistent across live and exported views of each build. Fixed sample positions avoid animated grain; the existing contact texture anchors the creation.

The original lighting, backdrop calibration, construction materials, and render-wide shaders remain intact. The floor and its shader belong to the Studio session and are disposed with it. Unsupported shader layouts fall back to the original material behavior. This is a constant artistic softness, rather than a physical area-light simulation.

## Verification

**${summary.tests.passed} tests passed across five suites.** They cover the pinned shader branches, world-space scaling, invalid-input fallback, material ownership, Studio resource cleanup, camera composition, and high-resolution image capture.

**12 matched browser views passed** across Saver, Balanced, and Detailed modes, including desktop, phone, short landscape, front, side, top, and perspective. The Detailed checks use the application's actual r128 composer and output pass. Six additional browser views cover a single rotated quarter wedge, a tall tower, and a wide span in desktop Balanced and phone Detailed modes. Every edge fixture preserves exact world data, STL bytes, history, and the returning camera.

In the sampled clear region of the perspective floor shadow, the largest adjacent-pixel RGB step falls from **${pixels.shadowEdge[0].maxAdjacentStep} to ${pixels.shadowEdge[1].maxAdjacentStep}**, and steps over 20 levels fall from **${pixels.shadowEdge[0].stepsOver20} to ${pixels.shadowEdge[1].stepsOver20}**. The complete final views were visually reviewed. All three matched Saver screenshots and the Saver PNG are pixel-identical to the baseline.

Saver and Detailed PNGs retain their 2048-pixel long edge and calibrated ivory backdrop. The perspective PNG also retains the new shadow appearance. Block material identities, geometry attributes, transforms, selected-world data, STL, selection, and undo/redo remain exact through the main review. Scene environment and camera restoration pass after switching looks and leaving Showcase. No page, console, or shader errors were reported.

The filter uses the same 16 depth comparisons as the original r128 PCFSoft branch. It adds no shadow maps, render passes, lights, textures, or scene objects. All matched views retain their draw-call, triangle, and resource counts:

| Quality | View | Viewport | Draw calls | Triangles |
| --- | --- | --- | ---: | ---: |
${rows}

These are Chromium software-WebGL checks with emulated phone dimensions; render-count parity is not a hardware frame-rate measurement.

Only the builder module and its desktop mirror changed in production. Both match the tested browser snapshots and parse successfully. Geometry World's core and Print Lab source hashes match the baseline.

${link('Verification summary','softlight-summary.json')} · ${link('Browser evidence','after-results.json')} · ${link('Edge-build evidence','edge-build-results.json')} · ${link('Shadow pixel comparison','shadow-pixels.json')} · ${link('Focused tests','softlight-tests.json')} · ${link('Regression tests','softlight-regression-tests.json')}
`;
fs.writeFileSync(path.join(dir,'STUDIO-SOFTLIGHT.md'),report);console.log(JSON.stringify({pass:true,tests:summary.tests,captures:captures.length,edgeCaptures:edge.captures.length,report:path.join(dir,'STUDIO-SOFTLIGHT.md')}));
