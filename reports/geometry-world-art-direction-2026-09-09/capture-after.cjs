const fs = require('node:fs');
const path = require('node:path');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline-results.json'), 'utf8'));
const baselineViews = new Map(baseline.captures.map(c => [c.file.replace(/^before-/, 'after-'), c]));
let source = fs.readFileSync(path.join(__dirname, 'capture-baseline.cjs'), 'utf8');
source = source.replaceAll('before-', 'after-').replaceAll('baseline-results.json', 'after-results.json').replace('baseline-source-loaded', 'after-source-loaded');
source = source.replace('Frozen baseline sources, actual WebGL pavilion and material gallery, balanced and saver', 'Matched current-source WebGL pavilion and material gallery, balanced and saver, with exact STL and mesh invariants');
source = source.replace("async function capture(name){\n    await page.waitForTimeout(180);", `async function capture(name){
    const view = baselineViews.get('after-'+name+'.png');
    if(!view) throw Error('Missing baseline camera for '+name);
    await page.evaluate(view=>{const e=__geoWorldEngine;e.camera.position.fromArray(view.position);e.camera.quaternion.fromArray(view.quaternion);e.camera.fov=view.fov;e.camera.updateProjectionMatrix();e.camera.updateMatrixWorld(true);},view);
    await page.waitForTimeout(180);`);
// The source is CRLF on Windows; match its capture boundary independently of newlines.
if (!source.includes('Missing baseline camera')) {
  source = source.replace(/async function capture\(name\)\{\r?\n    await page.waitForTimeout\(180\);/, `async function capture(name){
    const view = baselineViews.get('after-'+name+'.png');
    if(!view) throw Error('Missing baseline camera for '+name);
    await page.evaluate(view=>{const e=__geoWorldEngine;e.camera.position.fromArray(view.position);e.camera.quaternion.fromArray(view.quaternion);e.camera.fov=view.fov;e.camera.updateProjectionMatrix();e.camera.updateMatrixWorld(true);},view);
    await page.waitForTimeout(180);`);
}
source = source.replace("    console.log(JSON.stringify({stage:'captured',file}));", `    const invariant=await page.evaluate(async()=>{
      const e=__geoWorldEngine,b=StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks,{title:'Matched visual invariant'});
      const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
      const blocks=Object.keys(e.blocks).sort().map(k=>{const m=e.blocks[k],g=m.geometry;return [k,m.userData.blockType,m.userData.shape,m.userData.rotation,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),Array.from(g.attributes.position.array),g.index?Array.from(g.index.array):null];});
      const mats=Object.values(e.blocks).filter(m=>!m.userData._lessonBlock).map(m=>m.material);
      return {stlHash:await digest(b.buffer),stlBytes:b.buffer.byteLength,stlTriangles:b.triangleCount,meshHash:await digest(new TextEncoder().encode(JSON.stringify(blocks))),selected:e._builderSelection.blocks.length,history:JSON.stringify([e._undoStack,e._redoStack]),maps:{normal:mats.filter(m=>m.normalMap).length,roughness:mats.filter(m=>m.roughnessMap).length,bevel:mats.filter(m=>m._gwBlockFinish?.gwBlockBevelStrength?.value>0).length}};
    });
    Object.assign(results.captures.at(-1),invariant);
    const observed=results.captures.at(-1);
    const cameraMatch=observed.fov===view.fov && observed.position.every((v,i)=>Math.abs(v-view.position[i])<1e-7) && observed.quaternion.every((v,i)=>Math.abs(v-view.quaternion[i])<1e-7);
    observed.cameraMatchesBaseline=cameraMatch;
    if(!cameraMatch) throw Error('Camera drifted from frozen baseline: '+file);
    console.log(JSON.stringify({stage:'captured',file,stlHash:invariant.stlHash,maps:invariant.maps}));`);
source = source.replace("    results.passed=!results.errors.length && results.captures.every(c=>!c.shaderErrors.length);", `    results.invariants=['pavilion','materials'].map(kind=>{const rows=results.captures.filter(c=>c.file.includes('-'+kind+'-'));const base=rows[0];return {kind,profiles:rows.length,stlIdentical:rows.every(c=>c.stlHash===base.stlHash),meshIdentical:rows.every(c=>c.meshHash===base.meshHash),historyIdentical:rows.every(c=>c.history===base.history)};});
    results.passed=!results.errors.length && !results.consoleErrors.length && results.captures.every(c=>!c.shaderErrors.length&&c.cameraMatchesBaseline) && results.invariants.every(c=>c.stlIdentical&&c.meshIdentical&&c.historyIdentical);
    for(const c of results.captures)delete c.history;
    if(!results.passed)process.exitCode=1;`);
if (!source.includes('results.invariants=') || !source.includes('Missing baseline camera')) throw Error('Capture harness adaptation did not match');
eval(source);
