'use strict';
// Actual WebGL review of rain cores, cloud shade and genuine phase transitions. All transitions and
// checkpoints are produced by the unchanged production kernel. The renderer
// gates redundant GPU draws only; normal RAF, model clocks and UI keep running.
// Run only after source lock and GPU ownership are confirmed by the root agent.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const report = arg('report') || 'final';
assert(/^[a-z0-9-]+$/.test(report), 'Plain report folder name');
const suite = arg('suite') || 'rain-cloud-depth';
assert(['rain-cloud-depth','relief-optics','spatial-weather','cloud-evolution','rain-emission','rain-collection','rain-onset','cloud-exit','cloud-shadow-memory','rain-contact-memory','cloud-snow-onset','snow-melt-preview','cloud-assembly-source','cloud-assembly-flow','rain-landing-motion','splash-motion','cloud-formation-settle','cloud-immersion','rain-evaporation','cloud-source-thinning','refreezing-continuity','rain-landing-shower','cloud-interior-density','cloud-shadow-retirement','phase-motion-continuity'].includes(suite), 'Known isolated native QA suite');
const ownedProfileSuite = ['rain-onset', 'cloud-exit', 'cloud-shadow-memory', 'rain-contact-memory', 'cloud-snow-onset','snow-melt-preview','cloud-assembly-source','cloud-assembly-flow','rain-landing-motion','splash-motion','cloud-formation-settle','cloud-immersion','rain-evaporation','cloud-source-thinning','refreezing-continuity','rain-landing-shower','cloud-interior-density','cloud-shadow-retirement','phase-motion-continuity'].includes(suite);
const earlyClean = suite === 'cloud-evolution' && arg('early-clean') === 'true';
const reportRoot = path.join(root, 'reports/watercycle-pilot-' + suite);
const out = path.join(reportRoot, report);
// Re-check the saved native evidence without starting another GPU/browser.
// This also makes the stronger source/ref/shader assertions reproducible.
if (process.argv.includes('--analyze')) {
  const d = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
  const checks = [...d.checks], evidence = {};
  const ok = (value, label) => { assert(value, label); checks.push(label); };
  const delta = (a, b) => Math.max(...a.map((v, n) => Math.abs(v - b[n])));
  const obj = (snapshot, name) => snapshot.objects.find(o => o.name === name);
  const xyz = v => [v.x, v.y, v.z];
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  ok(d.success && d.errors.length === 0, d.provenance ? 'Completed source-bound native checks consolidate without page, shader or WebGL errors' : 'Saved native run succeeded without page, shader or WebGL errors');
  ok(d.sourceSha256 === hash(path.join(reportRoot, 'final-source.js')), 'Every final native capture matches the exact frozen source SHA');
  if(suite==='rain-landing-shower'){
    require('./watercycle_pilot_rain_landing_shower_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='refreezing-continuity'){
    require('./watercycle_pilot_refreezing_continuity_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-source-thinning'){
    require('./watercycle_pilot_cloud_source_thinning_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='rain-evaporation'){
    require('./watercycle_pilot_rain_evaporation_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='phase-motion-continuity'){
    require('./watercycle_pilot_phase_motion_continuity_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-shadow-retirement'){
    require('./watercycle_pilot_cloud_shadow_retirement_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-interior-density'){
    require('./watercycle_pilot_cloud_interior_density_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-immersion'){
    require('./watercycle_pilot_cloud_immersion_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-formation-settle'){
    require('./watercycle_pilot_cloud_formation_settle_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='splash-motion'){
    require('./watercycle_pilot_splash_motion_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='rain-landing-motion'){
    require('./watercycle_pilot_rain_landing_motion_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-assembly-flow'){
    require('./watercycle_pilot_cloud_assembly_flow_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='cloud-assembly-source'){
    require('./watercycle_pilot_cloud_assembly_source_checks.cjs').analyze({d,checks,ok,root,out,reportRoot,fs,path,assert});
    process.exit(0);
  }
  if(suite==='snow-melt-preview'){
    const r=d.snowMeltPreview,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    ok(!!r,'The requested isolated snow-melt-preview native section executed');
    const visual=state=>{const c=structuredClone(state);for(const key of ['group','preview','incoming','crystal','beads']){delete c[key].gpu;delete c[key].draws;}return c;};
    const clear=state=>!state.group.visible&&!state.preview.visible&&state.preview.matrixAutoUpdate&&same(state.preview.matrix,identity);
    const states=[r.first,r.middle,r.waterAgain,r.reduced,r.reducedLater];
    const proofs=[r.firstProof,r.middleProof,r.waterProof,r.reducedProof,r.reducedLaterProof];
    const gaps=r.journey.hits.slice(1).map((h,n)=>h.elapsed-r.journey.hits[n].elapsed);
    ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only its verified owned temporary profile was removed');
    ok(r.journey.release.before.form==='cloud'&&r.journey.release.after.form==='snow'&&r.journey.melting.before.form==='snow'&&r.journey.melting.after.form==='rain'&&r.journey.descent.length===1&&Math.min(...gaps)>=.6&&r.journey.hits.every(h=>h.cooldown===0),'Original-kernel fixture uses cooldown-respecting warm formation, no-hit loft, cold cloud growth and ordinary falling-snow descent to rain');
    const receipt=d.receipts.find(item=>item.name==='snowMeltRain'),saved=r.journey.melting;
    ok(receipt&&receipt.receipt.from==='snow'&&receipt.receipt.to==='rain'&&receipt.receipt.elapsed===saved.after.elapsed&&receipt.actual.some(a=>a.from==='snow'&&a.to==='rain'&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>a.input[k]===saved.input[k])),'Native melt replays its saved genuine pre-boundary checkpoint and exact original-kernel input receipt');
    ok(states.every(s=>s.shared.geometry&&s.shared.material&&s.preview.effective&&!s.preview.matrixAutoUpdate&&s.preview.draws>0&&s.preview.gpu.geometry===s.preview.geometry&&s.preview.gpu.material===s.preview.material)&&proofs.every(p=>p.linearError<1e-8&&p.centerError<1e-8&&p.uploadError<.00005),'Every sampled Water preview uses the complete actual rain world linear transform at its intentional bounded lens center and uploads its actual model-view matrix');
    ok(proofs.every(p=>p.beadError<.000001)&&same(r.first.group.data.sourceQuaternion,r.middle.group.data.sourceQuaternion)&&same(r.first.group.data.sourceScale,r.middle.group.data.sourceScale)&&r.middle.front<r.first.front&&r.middle.crystal.scale[0]<r.first.crystal.scale[0],'Captured crystal orientation and scale remain intact while its front retreats and all six beads remain attached to shrinking arms');
    ok(same(r.first.geometry,r.middle.geometry)&&same(r.first.materials,r.middle.materials)&&same(r.middle.geometry,r.follow.geometry)&&same(r.middle.materials,r.follow.materials),'Progress and supported camera switches retain the exact geometry and material pools');
    ok(same(visual(r.first),visual(r.paused)),'Paused native visual state is exact except append-only GPU draw telemetry');
    ok(r.follow.camera==='follow'&&!r.follow.preview.visible&&!r.follow.preview.effective&&r.follow.incoming.effective&&r.follow.incoming.gpu.geometry===r.follow.incoming.geometry&&delta(r.follow.incoming.gpu.modelView,r.follow.incoming.gpu.expected)<.00005&&delta(r.waterAgain.preview.world,r.middle.preview.world)<1e-7&&same(r.waterAgain.beads.instances,r.middle.beads.instances),'Follow draws the actual rain and Water restores the same centered preview without changing its captured crystal or beads');
    ok(same(r.follow.depth,r.before.depth)&&same(r.expired.depth,r.before.depth),'Follow and cue expiry restore every original scene material depth flag');
    ok(r.reduced.group.data.progress===.48&&r.reducedLater.group.data.progress===.48&&r.reducedLater.steps>r.reduced.steps&&same(r.reduced.preview.matrix,r.reducedLater.preview.matrix)&&same(r.reduced.beads.instances,r.reducedLater.beads.instances)&&r.reduced.rainShapeTime===r.reducedLater.rainShapeTime,'Reduced motion holds its representative full preview transform and beads while genuine model steps advance');
    ok(clear(r.expired)&&clear(r.reset)&&r.reset.form==='liquid'&&clear(r.restored)&&r.restored.form==='rain','Expiry, active reset and restored rain clear the preview matrix and restore automatic transform updates');
    const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),bytes=fs.readFileSync(file);assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return{name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};});
    ok(captures.length===3&&captures.every(c=>c.name.startsWith('snow-melt-preview-')&&c.height===520),'All three source-bound production-camera native PNGs retain the declared520px canvas height');
    const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,checks,captures,report:path.relative(root,path.join(out,'results.json')),
      numericalEvidence:{...r.evidence,minimumHitGap:Math.min(...gaps),captureDimensions:captures.map(({name,width,height})=>({name,width,height}))},
      validationScope:{native:r.journey.scope,transforms:'The full native matrix is compared through its nine world linear coefficients; actual drawn model-view uniforms verify the GPU upload. The preview center is intentionally the bounded teaching lens center.',limits:r.evidence.limits,framing:r.evidence.framing},errors:[]};
    fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:summary.numericalEvidence},null,2));process.exit(0);
  }
  if(suite==='cloud-snow-onset'){
    const r=d.cloudSnowOnset,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),visual=s=>{const c=structuredClone(s);delete c.field.draws;return c;};
    const states=[r.first,r.growing,r.water,r.developed,r.follow,r.reduced,r.reducedLater,r.restored],validGPU=s=>s.field.gpu&&s.field.gpu.location>=0&&s.field.gpu.offset===0&&s.field.gpu.stride===0&&s.field.gpu.size===1&&same(s.field.gpu.alpha,s.field.alpha)&&s.field.gpu.vertex.includes('snowAlpha')&&s.field.gpu.fragment.includes('vSnowVisibility')&&Math.abs(s.field.gpu.opacity-s.field.gpu.expectedOpacity)<1e-6;
    const clear=s=>!s.emission.active&&s.emission.age===0&&s.emission.ceilingY===0&&s.emission.originY===0&&s.emission.startedAt===0&&!s.field.visible;
    const gaps=r.journey.hits.slice(1).map((h,n)=>h.elapsed-r.journey.hits[n].elapsed);
    ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only its verified owned temporary profile was removed');
    ok(r.journey.checkpoint.form==='cloud'&&r.journey.release.after.form==='snow'&&r.journey.checkpoint.altitudeM>r.journey.coldAltitude&&Math.min(...gaps)>=.6&&r.journey.hits.every(h=>h.cooldown===0),'Original-kernel fixture reaches a genuinely cold cloud-to-snow release after cooldown-respecting warm formation, no-hit loft and cold growth');
    const receipt=d.receipts.find(item=>item.name==='cloudSnowRelease');
    ok(receipt&&receipt.receipt.from==='cloud'&&receipt.receipt.to==='snow'&&receipt.receipt.elapsed===r.journey.release.after.elapsed&&receipt.actual.some(a=>a.from==='cloud'&&a.to==='snow'&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>a.input[k]===r.journey.release.input[k])),'Native release replays the saved genuine pre-release checkpoint and original-kernel transition input receipt');
    ok(r.first.emission.active&&r.first.emission.age===0&&r.first.field.alpha.every(a=>a===0)&&r.first.primary.effective&&r.first.memoryVisible,'The first normal paused release shows the tagged crystal and captured cloud while every environmental snow-alpha value is zero');
    ok(r.first.source.from==='cloud'&&r.first.source.to==='snow'&&r.first.emission.ceilingY===r.first.source.position[1]&&[r.growing,r.water,r.developed,r.follow].every(s=>s.emission.active&&s.emission.ceilingY===r.first.emission.ceilingY),'The actual rendered source shelf is captured once and stays fixed through both camera modes and source-memory expiry');
    ok(r.growing.emission.age>=.7&&r.developed.emission.age>=2&&r.developed.emission.age>r.growing.emission.age&&r.growingProof.visible>0&&r.developedProof.visible>0,'Genuine snow develops from empty onset into nonzero growing and later curtains without requiring monotonic seeded-flake counts');
    ok([r.firstProof,r.growingProof,r.developedProof].every(p=>p.ceilingError<.00005&&p.frontError<.00005)&&states.every(validGPU),'Every active sampled flake obeys source ceiling and its speed-dependent birth front, and actual WebGL2 alpha attribute readback matches the native CPU buffer');
    ok(same(visual(r.first),visual(r.paused)),'Paused native visual state is exact except append-only draw-count telemetry');
    ok(r.water.camera==='water'&&r.follow.camera==='follow'&&same(r.water.field.local,r.growing.field.local)&&same(r.water.field.alpha,r.growing.field.alpha)&&same(r.follow.field.local,r.developed.field.local)&&same(r.follow.field.alpha,r.developed.field.alpha),'Water and Follow camera switches preserve snow geometry, reveal coverage and emitter age');
    ok(states.every(s=>s.field.count===76&&s.field.alphaCount===76&&s.field.alphaItemSize===1&&s.field.pooled)&&[r.growing,r.water,r.developed,r.follow].every(s=>same(s.geometry,r.first.geometry)&&same(s.materials,r.first.materials)),'All76 existing flakes reuse their original geometry, material and position/alpha arrays');
    ok(r.reduced.emission.age===2&&r.reducedLater.emission.age===2&&r.reducedLater.steps>r.reduced.steps&&same(r.reduced.field.local,r.reducedLater.field.local)&&r.reduced.preview.effective,'Reduced motion retains its static two-second onset age and local flake positions while genuine model steps continue');
    ok(clear(r.reset)&&!r.restored.emission.active&&r.restored.emission.age===0&&r.restored.field.visible&&r.restored.field.alpha.some(a=>a>0),'Reset clears the active snow source and a restored snow checkpoint supplies its representative weather volume without inventing a past cloud');
    const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),b=fs.readFileSync(file);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return{name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});
    ok(captures.length===3&&captures.every(c=>c.height===520),'Three source-bound native production-camera captures retain the declared520px canvas height');
    const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,checks,captures,report:path.relative(root,path.join(out,'results.json')),numericalEvidence:{...r.evidence,minimumHitGap:Math.min(...gaps),captureDimensions:captures.map(({name,width,height})=>({name,width,height}))},validationScope:{native:r.journey.scope,rendering:'Actual rendered source position,76 pooled point positions/alpha values, linked visibility shader and WebGL2 attribute-buffer readbacks are sampled through real native model advancement and official camera/pause/reset controls.',limits:'These illustrative flakes create no modeled water, collision receipts or notebook credit. Seeded glyph wrapping may change active counts; monotonic counts are not claimed. Reduced-motion source caps may change as the real parcel moves, while its local onset age and glyph positions remain fixed. The initial long pause card is compressed by the imposed QA-only520px canvas height; this check makes no UI layout claim.'},rawAttempts:['dispatch-preflight','source-scope-preflight'].filter(name=>fs.existsSync(path.join(reportRoot,name,'results.json'))).map(name=>{const old=JSON.parse(fs.readFileSync(path.join(reportRoot,name,'results.json'),'utf8'));return{report:path.relative(root,path.join(reportRoot,name,'results.json')),sourceSha256:old.sourceSha256,success:old.success,nativeSnowOnsetCoverage:false,captures:old.captures,pageErrors:[...new Set(old.errors)],scope:name==='dispatch-preflight'?'Only generic checks executed because a draft harness edit did not persist the new section. Runtime case/capture-count guards were added before rerun.':'Actual native release found an out-of-scope py reference in the previous source. Root changed the cap to the actual snow-field anchor, refroze the source and reran source-bound CPU/unit/native checks.'};}),errors:[]};
    fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:summary.numericalEvidence},null,2));process.exit(0);
  }
  if (suite === 'rain-contact-memory') {
    const r=d.rainContactMemory,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),visual=s=>{const copy=structuredClone(s);delete copy.impacts.draws;return copy;};
    const clear=s=>s.memory.active.every(v=>v===0)&&s.memory.worldXZ.every(v=>v===0)&&s.memory.age.every(v=>v===0)&&s.memory.captures===0&&s.memory.bornTime.every(v=>v===null)&&s.memory.cycle.every(v=>v===null)&&s.memory.lastClock.every(v=>v===null);
    ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only the verified owned temporary profile was removed');
    const gaps=r.journey.hits.slice(1).map((hit,n)=>hit.elapsed-r.journey.hits[n].elapsed);
    ok(r.journey.checkpoint.form==='rain'&&r.journey.checkpoint.altitudeM>=150&&r.journey.checkpoint.altitudeM<=160&&r.journey.start.x===-150&&r.journey.start.z===40&&Math.min(...gaps)>=.6,
      'Native descent resumes a saved original-kernel rain checkpoint from a declared starting placement and cooldown-respecting upstream journey');
    ok(r.beforeProof.active>0&&r.afterProof.active>0&&r.retainedProof.retained>0&&r.retainedProof.exactWorldXZ&&r.retainedProof.exactBirthTime&&r.retainedProof.maximumAgeDelta>0,
      'Same-cycle contacts retain exact Float64 world centers and birth times as their real age advances');
    ok(Math.abs(r.after.parcel[2]-r.before.parcel[2])>.1&&r.after.parcel[1]<r.before.parcel[1]&&same(r.before.overview,r.after.overview)&&r.navigation.keys.some(k=>k.key==='ArrowRight'&&k.target==='wcPilotCanvas'&&k.trusted&&k.defaultPrevented&&!k.paused),
      'Actual keyboard steering changes parcel XZ and original-kernel descent changes height while the QA overview remains fixed');
    ok([r.beforeProof,r.afterProof].every(p=>p.centerError<.00005&&p.receiverError<.00005)&&[r.before,r.after,r.water,r.follow,r.reduced,r.reducedLater].every(s=>s.impacts.linked&&s.impacts.draws>0),
      'Native drawn ring centers match their retained source and raycast ocean triangle clearances stay within float32 tolerance');
    ok(same(visual(r.paused),visual(r.after))&&r.water.camera==='water'&&r.follow.camera==='follow'&&same(r.before.geometry,r.after.geometry)&&same(r.before.materials,r.after.materials),
      'Paused visual state is exact except append-only draw telemetry, both cameras retain the contacts, and existing geometry/material pools are reused');
    ok(r.collection.before.form==='rain'&&r.collection.after.form==='liquid'&&clear(r.landed)&&r.landed.impacts.tailActive&&r.tailProof.tailVertices>0&&r.tailProof.tailXZError<.00005&&!r.expired.impacts.tailActive&&!r.expired.impacts.visible,
      'Actual rain-to-liquid collection clears the live memory, preserves the last drawn ring XZ in the existing tail and then expires');
    ok(r.reducedLater.steps>r.reduced.steps&&r.reducedLater.time===r.reduced.time&&r.reducedProof.retained>0&&r.reducedProof.maximumAgeDelta===0,
      'Reduced motion retains contact age and center while genuine model steps continue');
    ok(clear(r.reset)&&!r.reset.impacts.visible&&!r.reset.impacts.tailActive&&clear(r.restored)&&!r.restored.impacts.visible&&!r.restored.impacts.tailActive,
      'Active reset and non-rain checkpoint restore clear every retained contact and landing tail');
    const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),bytes=fs.readFileSync(file);assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return {name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};});
    ok(captures.length===2&&captures[0].width===captures[1].width&&captures[0].height===captures[1].height,'Both actual source-bound native PNGs retain equal canvas dimensions');
    const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,checks,captures,report:path.relative(root,path.join(out,'results.json')),numericalEvidence:{...r.evidence,minimumHitGap:Math.min(...gaps),captureDimensions:captures.map(({name,width,height})=>({name,width,height}))},
      validationScope:{native:r.journey.scope,contacts:'Actual pooled receiving-water geometry and metadata are sampled before and after genuine keyboard steering and original-kernel descent. Raycasts measure ring clearance over the actual triangulated ocean; rendered material links and actual draw callbacks verify native drawing.',framing:r.evidence.framing,limits:'The upstream journey uses saved original-kernel hit opportunities with real cooldowns; every rendered mote pickup and geometric collision acceptance is not native-tested. These contact memories remain visual cues and create no water, collision credit or notebook receipt.'},rawAttempts:report==='verification-steering'?[{report:'reports/watercycle-pilot-rain-contact-memory/final/results.json',sourceSha256:d.sourceSha256,keyboardSteeringEstablished:false,scope:'The initial run establishes native wind drift/descent and lifecycle behavior. Its ArrowRight event lacked canvas focus, so its steering label was corrected. The final verification explicitly records a trusted consumed canvas keydown and non-wind Z movement.'}]:[],errors:[]};
    fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:summary.numericalEvidence},null,2));process.exit(0);
  }
  if (suite === 'cloud-shadow-memory') {
    const r = d.cloudShadowMemory, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const visual = ({ reads, ...rest }) => rest;
    const uploadsValid = state => state.receivers.length === 12 && state.receivers.every(receiver => receiver.shared) && state.reads.length > 0 && state.reads.every(read =>
      read.opacity !== null && Math.abs(read.opacity - read.expectedOpacity) < 1e-7 && read.source && delta(read.source, read.expectedSource) < .0001 && read.footprint && delta(read.footprint, read.expectedFootprint) < .0001);
    const memories = [r.first, r.middle, r.water, r.follow, r.reduced, r.reducedLater];
    const memoryValid = state => { const source = state.proof.snapshot; return state.memory.active && state.memory.copiedVectors && state.sourceForm === 'cloud-memory' &&
      same(state.memory.source, source.source) && same(state.memory.footprint, source.footprint) && state.memory.opacity === source.opacity &&
      delta(state.source, source.source) < 1e-10 && delta(state.footprint, source.footprint) < 1e-10 && Math.abs(state.opacity - source.opacity * state.coverage) < 1e-12 &&
      state.opacity >= 0 && state.opacity <= source.opacity + 1e-12; };
    const clear = state => !state.memory.active && !state.visible && state.opacity === 0 && state.memory.opacity === 0 && same(state.memory.source, [0, 0, 0]) && same(state.memory.footprint, [1, 1]);
    ok(d.browsersClosed && d.browserTempCleaned, 'Native browser closed and only this run\'s verified owned temporary profile was removed');
    const hitGaps = r.journey.hits.slice(1).map((hit, n) => hit.elapsed - r.journey.hits[n].elapsed);
    ok(r.journey.declaredStart.x === 180 && r.journey.declaredStart.z === 40 && r.journey.iceHits === 14 && r.journey.warmHits === 1 && r.journey.hits.length === 15 &&
      r.journey.hits.every(hit => hit.cooldown === 0) && Math.min(...hitGaps) >= .6, 'Saved original-kernel fixture uses declared starting X/Z and respects all 15 collection cooldowns');
    const replay = [['shadowThaw', 'ice', 'droplet'], ['shadowWarmCloud', 'droplet', 'cloud'], ['shadowRainRelease', 'cloud', 'rain']];
    ok(replay.every(([name, from, to]) => { const receipt = d.receipts.find(item => item.name === name), fixture = r.journey.receipts.find(item => item.from === from && item.to === to), actual = receipt?.actual.find(item => item.from === from && item.to === to);
      return receipt?.receipt.from === from && receipt.receipt.to === to && receipt.receipt.elapsed === fixture?.elapsed[1] && actual && ['dt', 'thrust', 'sunlit', 'surface', 'nucleusHit', 'dropletHit'].every(key => actual.input[key] === fixture.input[key]); }),
    'Native thaw, warm-hit cloud and immediate rain replay the saved original-kernel input receipts from a genuine checkpoint');
    ok(r.pre.form === 'cloud' && r.pre.phase.kind === 'cloud-assembly' && r.pre.assemblyProgress < .2 && r.pre.live.some(lobe => lobe.density < 1) && !r.pre.memory.active,
      'Native pre-release cloud is partially assembled and has no previous shadow memory');
    ok(r.first.form === 'rain' && r.first.coverage === 1 && r.first.opacity === r.pre.opacity && !r.first.proof.input.dropletHit && Math.abs(r.first.proof.elapsed[1] - r.first.proof.elapsed[0] - .016) < 1e-10,
      'The next no-hit rain frame preserves actual partial-cloud shadow strength exactly');
    ok(memories.every(memoryValid), 'Captured source, footprint and opacity are copied exactly and fade with the shared exit coverage in both views and reduced motion');
    ok(r.middle.coverage > 0 && r.middle.coverage < 1 && r.middle.opacity < r.first.opacity && r.water.opacity === r.middle.opacity && r.follow.opacity === r.middle.opacity,
      'Mid-exit shadow strength decreases continuously and remains identical between Water and Follow');
    ok([r.pre, ...memories, r.paused, r.expired, r.normal, r.reset, r.restored].every(uploadsValid), 'Actually drawn receiver uniform uploads match their shared native opacity, source and footprint values at every checkpoint');
    ok(same(visual(r.paused), visual(r.first)), 'Paused visual state is exact; only append-only native uniform-read telemetry is excluded');
    ok(same(r.pre.overview, r.first.overview) && same(r.pre.overview, r.middle.overview) && r.pre.overview.receiver === 'pilot-ocean-surface',
      'Pre-release, first rain and midpoint retain the same camera matrices over the ray-verified ocean receiver');
    ok(memories.every(state => same(state.geometryIds, state.proof.snapshot.geometryIds) && same(state.materialIds, state.proof.snapshot.materialIds) && state.ghost.every((lobe, n) => {
      const source = state.proof.snapshot.live[n]; return lobe.density === source.density && same(lobe.position, source.position) && same(lobe.scale, source.scale); })),
      'Captured lobe poses and optical densities remain exact while the original geometry and material pools are reused');
    ok(clear(r.expired) && uploadsValid(r.expired), 'Cue expiry clears the complete shadow memory and uploads zero receiver strength');
    ok(r.normal.assemblyProgress === 1 && r.reduced.coverage === .5 && r.reducedLater.coverage === .5 && r.reducedLater.steps > r.reduced.steps,
      'Full-cloud reduced motion retains its representative source fade while real kernel steps advance');
    ok(r.beforeReset.memory.active && clear(r.reset) && r.reset.form === 'liquid', 'Reset starts with active source memory and clears its captured values and receiver strength');
    ok(r.restored.form === 'rain' && clear(r.restored), 'Restored rain invents no cloud source or retained receiver shadow');
    const captures = d.captures.map(name => { const file = path.join(out, name + '.png'), bytes = fs.readFileSync(file); assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
      return { name, path: path.relative(root, file), sourceSha256: d.sourceSha256, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; });
    ok(captures.length === 3 && captures.every(capture => capture.width > 0 && capture.height > 0), 'All three source-bound native PNGs exist with their actual image dimensions recorded');
    const nativeScope = 'The full cooldown-respecting journey is generated by original-kernel stepping. Native rendering resumes its genuine heavy-ice thaw checkpoint and replays the saved original-kernel input receipts for thaw, warm-hit cloud and immediate no-hit rain. The 14 rendered-mote pickups and geometric collision acceptance are not native-tested.';
    const framing = 'Camera world and projection matrices remain exact across the three checkpoints. Responsive HUD/canvas layout changes the midpoint PNG height; the stills are qualitative continuity evidence, not pixel-identical framing or a pixel-difference test.';
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, browserTempCleaned: true, checks, captures,
      report: path.relative(root, path.join(out, 'results.json')), numericalEvidence: { ...r.evidence, nativeScope, minimumHitGap: Math.min(...hitGaps), captureDimensions: captures.map(({ name, width, height }) => ({ name, width, height })), framing },
      validationScope: { native: nativeScope, framing, source: 'The actual current source shadow is captured before cloud exit and multiplied by the shared retained-cloud fade. No extra weather physics, particles or receiver shader changes are introduced.' }, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: captures.length, report: summary.report, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  if (suite === 'cloud-exit') {
    const r = d.cloudExit;
    ok(d.browsersClosed && d.browserTempCleaned, 'Native browser closed and only this run\'s verified owned temporary profile was removed');
    ok(d.receipts.length >= 3 && d.receipts.every(receipt => receipt.receipt.from === receipt.expectedFrom && receipt.receipt.to === receipt.expectedTo && receipt.actual.some(step => step.from === receipt.expectedFrom && step.to === receipt.expectedTo)), 'Every cloud exit is driven by the genuine production kernel and its recorded transition receipt');
    ok(r.pre.form === 'cloud' && r.pre.visible && r.pre.lobes.length === 18 && r.first.form === 'rain' && r.first.exit.active && r.first.exit.coverage === 1, 'Actual Water-view cloud interior survives the genuine first paused rain release at full captured coverage');
    ok(r.firstProof.poseError < 1e-7 && r.firstProof.opacityError < 1e-10 && r.middleProof.poseError < 1e-7 && r.middleProof.opacityError < 1e-10 && r.middle.exit.coverage > 0 && r.middle.exit.coverage < 1, 'All retained cloud lobes remain source anchored and fade from their captured opacity without accumulated darkening');
    ok(r.middleProof.uploadedSprites > 0 && r.firstProof.sameResources && r.middleProof.sameResources, 'Native drawn cloud sprites upload their real retained opacity and reuse the actual geometry, materials and paired maps');
    ok(!r.follow.visible && r.follow.exit.active && r.waterAgain.visible && r.waterAgain.exit.coverage === r.middle.exit.coverage && r.evidence.pauseExact, 'Pause and Water/Follow/Water preserve the captured source while Follow clears the interior');
    ok(!r.expired.exit.active && !r.expired.visible && !r.restored.exit.active && !r.restored.visible, 'Cue expiry and restored rain clear the interior without inventing a cloud exit source');
    ok(r.reduced.exit.coverage === .5 && r.reducedLater.exit.coverage === .5 && r.reducedLater.steps > r.reduced.steps, 'Reduced motion retains the representative cloud-exit coverage while genuine kernel steps advance');
    ok(r.beforeReset.exit.active && !r.reset.exit.active && !r.reset.visible && r.reset.fog.near === 620 && r.reset.fog.far === 2300, 'Reset begins with an active retained cloud and clears its interior and fog');
    ok(r.snowFirst.form === 'snow' && r.snowFirst.exit.active && r.snowFirst.exit.coverage === 1 && !r.snowExpired.exit.active && !r.snowExpired.visible, 'Genuine cold-cloud snow release retains and then clears the same bounded interior exit');
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, browserTempCleaned: d.browserTempCleaned, checks,
      captures: d.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: d.sourceSha256 })),
      report: path.relative(root, path.join(out, 'results.json')), numericalEvidence: r.evidence,
      validationScope: { source: 'The existing 18 interior sprites retain the actual cloud source transform, current lobe poses, paired maps and captured opacities. No additional water parcel or cloud geometry is introduced.',
        routes: 'Rain and snow exits are genuine unchanged-kernel transitions. Native screenshots cover Water-view cloud, first paused rain release and mid-exit; snow and lifecycle endpoints are numerical native checks.' }, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: summary.captures.length, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  if (suite === 'rain-onset') {
    const r = d.rainOnset;
    ok(d.browsersClosed && d.browserTempCleaned, 'Native browser closed and only this run\'s verified owned temporary profile was removed');
    ok(r && r.first.emission.active && r.first.emission.age === 0 && r.first.emission.startedAt === r.first.source.elapsed[1], 'First genuine learning pause captures the release clock before any decorative rain ages');
    ok(r.firstProof.activeThreads === 0 && r.firstProof.activeRibbons === 0 && r.first.impacts.alpha.every(alpha => alpha === 0) && r.first.primary.effectiveVisible && r.first.memoryVisible, 'First release keeps the actual primary drop and cloud source visible without filling the slab or pre-aging contacts');
    ok(r.growingProof.activeThreads > 0 && r.growingProof.activeRibbons > 0 && r.growingProof.maxBelowFront <= 3e-5 && r.arrivalProof.maxBelowFront <= 3e-5, 'Every native active rain vertex stays between its trajectory-relative front and fixed cloud shelf');
    ok(r.contacts.activeProfiles > 0 && r.contacts.maxBirthExcess < .00003 && r.contacts.samples > 0 && r.contacts.minGap > .04 && r.contacts.maxGap < .12, 'Solved native contact event ages respect the source-born front and actual receiver clearance');
    ok(r.evidence.pauseExact && r.evidence.lookFixedThreads && r.evidence.modeFixedThreads && r.evidence.sameResourcePool, 'Pause, Look and both camera views preserve the same source envelope and pooled native rain resources');
    ok(r.reduced.emission.age === .6 && r.reducedLater.emission.age === r.reduced.emission.age && r.reducedLater.steps > r.reduced.steps && r.reducedLater.time === r.reduced.time, 'Initial reduced-motion rain uses its representative front and holds that front while genuine model steps advance');
    ok(!r.restored.emission.active && r.restored.emission.startedAt === 0 && r.restored.emission.age === 0 && r.restored.emission.originY === 0 && r.inactiveProof.maxPositionError < .00004 && r.inactiveProof.maxAlphaError < .000003, 'Restored rain invents no missing source and retains the original full-volume trajectories and alpha');
    ok(r.beforeReset.emission.active && !r.reset.emission.active && r.reset.emission.startedAt === 0 && r.reset.emission.age === 0 && r.reset.emission.originY === 0 && !r.reset.field.effectiveVisible && !r.reset.ribbons.effectiveVisible && !r.reset.impacts.effectiveVisible, 'Reset of a genuine active source clears every onset value and hides the complete precipitation hierarchy');
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, browserTempCleaned: d.browserTempCleaned, checks,
      captures: d.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: d.sourceSha256 })),
      report: path.relative(root, path.join(out, 'results.json')), numericalEvidence: r.evidence,
      validationScope: { front: 'The onset envelope follows each existing local fall trajectory inside the parcel-following field. Its lower world boundary includes the current field anchor; its upper cloud shelf stays fixed in world space. This is illustrative onset continuity, not calibrated weather physics.',
        contacts: 'Eligibility uses elapsed source age at the solved contact event, rather than admitting an already aged ripple when the front first reaches water.',
        inactive: 'Native restored high rain is checked against the unchanged deterministic seed/profile/advection and original slab-edge alpha equations; baseline bitwise parity is a separate CPU source proof.' }, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: summary.captures.length, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  if (suite === 'rain-collection') {
    const r = d.rainCollection;
    ok(r && r.routes.length === 3 && r.routes.every(route => ['ocean', 'lake', 'stream'].includes(route.body)), 'Native evidence covers genuine collection on all three receiving-water bodies');
    ok(r.routes.every(route => route.first.source.from === 'rain' && route.first.source.to === 'liquid' && route.first.memory.geometry === route.first.source.geometry), 'Actual pre-transition rain geometry and source pose were retained for collection');
    ok(r.routes.every(route => route.first.liquid.coverage > 0 && route.middle.liquid.coverage > route.first.liquid.coverage && route.expired.liquid.coverage === 1), 'Native incoming liquid coverage advances and restores full coverage on expiry');
    ok(r.routes.every(route => route.switched.preview.sharesGeometry && route.switched.preview.sharesMaterial && route.expired.liquid.position[0] === 0 && route.expired.liquid.position[2] === 0 && route.expired.liquid.position[1] === route.expired.liquid.surfaceFloat.restY), 'Water view reuses the actual liquid surface and collection expiry restores the current receiving-water placement');
    ok(r.routes.every(route => route.expired.bodyFloat.samples === 1 && Math.abs(route.expired.bodyFloat.clearance - .13) < 1e-5), 'Post-cue liquid body bottoms retain the intended clearance above each actual receiving mesh');
    ok(r.routes.every(route => route.first.landing.gaps.samples > 20 && route.middle.landing.gaps.samples > 20 && route.expired.landing.gaps.samples > 20), 'Moving collection rings are checked against actual receiver geometry throughout the merge');
    ok(r.routes[0].terminalProof.maxOpacityError < 1e-8 && !r.routes[0].landingExpired.landing.visible, 'Actual rain rings taper through their terminal interval before being hidden');
    ok(r.beforeReset.phase.visible && r.beforeReset.liquid.coverage < 1 && !r.reset.phase.visible && r.reset.liquid.coverage === 1 && !r.reset.preview.effectiveVisible && !r.reset.memory.effectiveVisible && !r.reset.landing.visible && r.reset.liquid.position[0] === 0 && r.reset.liquid.position[2] === 0 && r.reset.liquid.position[1] === r.reset.liquid.surfaceFloat.restY, 'Reset of an active collection clears coverage, memory, preview and landing effects and restores current receiving-water placement');
    ok(r.routes.every(route => JSON.stringify(route.expired.materialDepth) === JSON.stringify(route.before.materialDepth) && JSON.stringify(route.expired.geometryIds) === JSON.stringify(route.before.geometryIds) && JSON.stringify(route.expired.materialIds) === JSON.stringify(route.before.materialIds)), 'Collection expiry restores every original material depth flag and retains the original geometry/material pool');
    ok(r.reducedLater.steps > r.reduced.steps && r.reducedLater.liquid.coverage === r.reduced.liquid.coverage && r.restored.liquid.coverage === 1 && !r.restored.phase.visible, 'Reduced motion holds the representative front with genuine kernel steps and restored liquid creates no arrival cue');
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, checks,
      captures: d.captureEvidence || d.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: d.sourceSha256 })),
      report: path.relative(root, path.join(out, 'results.json')), numericalEvidence: r.evidence,
      validationScope: { journeys: 'Only declared QA starting x/z locations differ. Every phase, altitude, mass and elapsed value is produced by a complete original-kernel surface-to-rain-to-liquid journey.',
        rapidEvaporation: r.evidence.rapidEvaporation.scope, provenance: d.provenance || null }, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: summary.captures.length, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  if (suite === 'rain-emission') {
    const r = d.rainEmission;
    ok(r && r.early.emission.active && r.afterExpiry.emission.active, 'Captured cloud emission survives the genuine rain release and source-memory expiry');
    ok(Math.abs(r.early.emission.ceilingY - r.source.rootPosition[1]) < 1e-6 && r.afterExpiry.emission.ceilingY === r.early.emission.ceilingY, 'Actual source-cloud world height remains the fixed precipitation ceiling');
    ok(r.evidence.pauseExact && r.evidence.lookFixedWorldThreads && r.evidence.modeFixedWorldThreads, 'Pause, Look and camera mode preserve world-space rain paths and the cloud emission boundary');
    ok(r.evidence.restoredSourceInactive && r.evidence.resetSourceInactive && r.evidence.reducedClockFrozen, 'Restored rain invents no cloud source and reset/reduced motion retain their intended presentation');
    ok(!r.reset.field.visible && !r.reset.field.effectiveVisible && !r.reset.ribbons.effectiveVisible && !r.reset.impacts.effectiveVisible && r.reset.ribbons.parentUuid === r.reset.field.uuid, 'Actual reset metadata hides threads, pooled ribbons and receiving-water impacts through their effective scene visibility');
    ok(r.contacts.samples > 0 && r.contacts.minGap > .04 && r.contacts.maxGap < .12, 'Actual low-water ripple endpoints and midpoints retain receiving-mesh clearance');
    const frozenSource = fs.readFileSync(path.join(reportRoot, 'final-source.js'), 'utf8');
    const fadeStart = frozenSource.indexOf('function rainBoundaryFade('), fadeEnd = frozenSource.indexOf('\n            }', fadeStart);
    assert(fadeStart >= 0 && fadeEnd > fadeStart);
    const boundaryFade = new Function(frozenSource.slice(fadeStart, fadeEnd + '\n            }'.length) + '\nreturn rainBoundaryFade;')();
    let wrappedGlyphVertices = 0;
    for (let rf = 0; rf < 84; rf++) for (const along of [0, .55, 1, 0, .32, .9, 1]) {
      const y = -60 + r.early.profiles[rf * 4 + 1] * (1 - along);
      assert.equal(boundaryFade(y, 60, -60), 0, 'Actual frozen helper clears every part of the glyph at its head wrap boundary'); wrappedGlyphVertices++;
    }
    checks.push('CPU replay of the exact frozen boundary helper and all84 native fall profiles clears whole thread/ribbon glyphs at head wrap');
    const numericalEvidence = { ...r.evidence, wrapEndpointReplay: { profiles: 84, glyphSamples: wrappedGlyphVertices, allZero: true, scope: 'Exact frozen production helper evaluated against actual native profiles; no browser clock was replaced.' } };
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, checks, captures: d.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: d.sourceSha256 })), renderedCheckpoints: d.renderOnlyCaptures || [], report: path.relative(root, path.join(out, 'results.json')), numericalEvidence, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: summary.captures.length, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  if (suite === 'cloud-evolution') {
    ok(d.cloudEvolution && d.cloudEvolution.assembly.length === 4, 'Saved evidence covers early, middle and late genuine cloud assembly in both views');
    ok(d.cloudEvolution.release.source.lobes.some(lobe => lobe.density < 1), 'Actual rapid cloud-to-rain release retained a partial cloud optical depth');
    ok(d.cloudEvolution.motion.maxVerticalVelocity - d.cloudEvolution.motion.minVerticalVelocity > .05, 'Actual native cloud lobes have distinct convective velocities');
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, checks, captures: d.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: d.sourceSha256 })), report: path.relative(root, path.join(out, 'results.json')), numericalEvidence: d.cloudEvolution.evidence, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: summary.captures.length, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  const [a, b] = d.cloudLighting;
  const fixedClouds = v => v.clouds.map(c => ({material:c.material,map:c.map,normal:c.normal,position:c.position,scale:c.scale,shelter:c.lighting.shelter.value}));
  assert.deepEqual(fixedClouds(a), fixedClouds(b));
  checks.push('Opposite actual review cameras preserve all187 cloud sprite poses, relief maps, materials and camera-independent shelter');
  evidence.cloud = {spriteCount:a.clouds.length,normalMaps:a.normalMaps.length,readbacks:[],luminance:[]};
  for (const view of d.cloudLighting) {
    ok(view.normalMaps.length === 6 && view.normalMaps.every(t=>t.width===192&&t.height===192), 'All six192px paired cloud normal maps remain shared in '+view.name+' view');
    ok(view.albedos.length === 6 && view.albedos.every(t=>t.width===192&&t.height===192&&t.opaque>0&&t.minR>100&&t.maxR<=255), 'All six shared192px billow albedos contain healthy nonblack texels in '+view.name+' view');
    ok(view.clouds.every(c=>c.sharesNormal&&c.sharedSunKeys.includes('sun')&&c.lighting.model==='world-sun-billow-relief'), 'Every cloud sprite uses the actual paired relief map and shared world Sun in '+view.name+' view');
    for (const c of view.clouds.filter(c=>Number.isInteger(c.tier))) {
      // Unrendered pooled memories retain zero until their first actual draw.
      const expectedBase=[.12,.055,0][c.tier], base=c.lighting.shelterBase, extra=[.05,.05,.0175][c.tier];
      assert(base===0||Math.abs(base-expectedBase)<1e-12);
      assert(c.lighting.shelter.value>=base-1e-12&&c.lighting.shelter.value<=base+extra+1e-12);
    }
    const linked=view.clouds.filter(c=>c.linkedVertex&&c.linkedFragment);
    ok(linked.length===6&&linked.every(c=>c.linkedVertex.includes('mat3(pilotCloudViewMatrix)*pilotCloudSun')&&c.linkedFragment.includes('pilotCloudShelter')&&c.linkedFragment.includes('texture2D(pilotCloudNormalMap')), 'All six actual linked cloud programs include camera-correct Sun, relief and tier/leeward shelter in '+view.name+' view');
    const uploaded=view.clouds.filter(c=>c.uploaded);
    ok(uploaded.length>0&&uploaded.every(c=>delta(c.uploaded.sun,view.sun)<1e-6&&delta(c.uploaded.view,view.expectedCameraView)<1e-3&&c.uploaded.solar===1), 'Actual uploaded cloud Sun/custom-view uniforms match the active native camera in '+view.name+' view');
    const reads=view.shelterReads,maxShelterError=Math.max(...reads.map(r=>Math.abs(r.expected-r.uploaded)));
    ok(reads.length>0&&maxShelterError<1e-6, 'Per-sprite shelter uniform is read back after its actual native draw in '+view.name+' view');
    const luminance=view.pixelProbe.samples.map(p=>p.luminance),range=[Math.min(...luminance),Math.max(...luminance)];
    ok(luminance.length===26&&range[0]>100&&range[1]<255&&range[1]-range[0]>5, 'Actual cloud framebuffer samples retain nonblack relief contrast in '+view.name+' view');
    evidence.cloud.readbacks.push({view:view.name,count:reads.length,maxShelterError});
    evidence.cloud.luminance.push({view:view.name,samples:luminance.length,range});
  }
  const ribbons=d.rain.objects.find(o=>o.name==='pilot-rain-ribbons'),threads=d.rain.objects.find(o=>o.name==='pilot-rain-field'),impacts=d.rain.objects.find(o=>o.name==='pilot-rain-water-impacts');
  const along=ribbons.attributes.rainAlong;
  ok(along.count===672&&along.itemSize===1&&along.values.every((v,n)=>Math.abs(v-[0,0,.32,.32,.9,.9,1,1][n%8])<1e-6), 'Actual rain buffer has84 pooled eight-vertex ribbons with the full0/.32/.9/1 longitudinal profile');
  ok(['rainBodyMask','rainCore','rainEdgeGlint','rainHeadGlint','vRainAlong','vRainAcross'].every(t=>ribbons.fragment.includes(t)), 'Actual linked rain ribbon shader includes translucent core and edge/head glints');
  ok(ribbons.userData.ribbonSurface.model==='translucent-core-edge-glint'&&ribbons.materialUserData.ribbonSurface.coreStrength===.5&&ribbons.materialUserData.ribbonSurface.edgeStrength===.16&&ribbons.materialUserData.ribbonSurface.headStrength===.26, 'Rain ribbon surface metadata agrees with the implemented core/glint strengths');
  ok([threads,ribbons].every(o=>o.vertex.includes('vPilotRainDepth')&&o.fragment.includes('pilotRainNear')&&o.fragment.includes('pilotRainFar'))&&!impacts.fragment.includes('vPilotRainDepth')&&!impacts.fragment.includes('rainCore'), 'Actual linked thread/ribbon depth envelope preserves unattenuated receiving-water impacts');
  ok(ribbons.opacity>=.66&&ribbons.opacity<=.76&&Number(d.rain.dataset.rainOnset)===1, 'Native settled ribbon opacity stays within the new.66–.76 optical envelope');
  evidence.rain={ribbonVertices:along.count,ribbonCount:along.count/8,opacity:ribbons.opacity,renderProbeSamples:d.rain.pixels.samples.length};
  const routes={condensation:['vapor','droplet','condensation'],reevaporation:['droplet','vapor','evaporation'],melting:['ice','droplet','melting'],snowRelease:['cloud','snow','precipitation-release']};
  evidence.phase=[];
  for (const p of d.phaseViews) {
    const m=p.midpoint,route=routes[p.name],water=p.cameraMode==='water';
    assert.equal(m.groupData.from,route[0]);assert.equal(m.groupData.to,route[1]);assert.equal(m.groupData.kind,route[2]);
    assert(m.visible&&p.first.groupData.progress<m.groupData.progress&&m.groupData.progress<1);
    assert.deepEqual(m.objects,p.frozen.objects);
    assert.equal(m.groupData.foregroundLens,water);
    assert.equal(m.bindings.rainVisible,false);
    const dropExpected=water&&['condensation','melting'].includes(p.name);
    assert.equal(m.bindings.droplet.visible,dropExpected);
    if(dropExpected){assert(m.bindings.droplet.sharesGeometry&&m.bindings.droplet.sharesMaterial);assert(delta(m.bindings.droplet.previewWorldScale,m.bindings.droplet.actualWorldScale)<1e-12);}
    assert.equal(m.bindings.snow.visible,water&&p.name==='snowRelease');
    if(water&&p.name==='snowRelease'){assert(m.bindings.snow.bodyGeometry&&m.bindings.snow.bodyMaterial&&m.bindings.snow.edgeGeometry&&m.bindings.snow.edgeMaterial);assert(delta(m.bindings.snow.previewScale,m.bindings.snow.actualScale)<1e-12);}
    if(p.name==='melting'){const f=m.bindings.melting;assert(f.sharedActive&&f.sharedProgress&&f.sharedTransform&&!f.sourceIsIncoming&&f.targetIsIncoming);assert(delta(f.sourceCentre,[0,0,0])<1e-10);assert.equal(m.groupData.front,'ice-to-liquid');}
    const memoryName={reevaporation:'pilot-phase-liquid-memory',melting:'pilot-phase-ice-memory',snowRelease:'pilot-phase-cloud-memory'}[p.name];
    if(memoryName){const first=obj(p.first,memoryName),memory=obj(m,memoryName);assert(memory.userData.sourceSnapshot);assert.deepEqual(memory.userData.sourcePosition,first.userData.sourcePosition);assert.deepEqual(memory.userData.sourceScale,first.userData.sourceScale);assert.deepEqual(memory.userData.sourceQuaternion,first.userData.sourceQuaternion);assert.equal(memory.userData.placement,water?'bounded-water-lens':'captured-world-source');if(!water)assert(delta(memory.worldPosition,xyz(memory.userData.sourcePosition))<1e-10);}
    if(p.name==='snowRelease'){assert.equal(m.shadow.userData.sourceForm,'cloud-memory');assert.deepEqual(m.shadow.userData.sourcePosition,obj(m,memoryName).userData.sourcePosition);assert.deepEqual(p.first.shadow.userData.sourcePosition,m.shadow.userData.sourcePosition);assert(m.shadow.userData.opacity.value>0&&m.shadow.userData.opacity.value<p.first.shadow.userData.opacity.value);assert(m.cameraDistance>2&&m.cameraDistance<200);}
    if(water){assert.deepEqual(p.modeSwitch.follow.materialDepth,p.before.materialDepth);assert.deepEqual(p.expired.materialDepth,p.before.materialDepth);assert(!p.expired.visible);assert.equal(p.modeSwitch.waterAgain.groupData.foregroundLens,true);}
    evidence.phase.push({name:p.name,camera:p.cameraMode,progress:[p.first.groupData.progress,m.groupData.progress],cameraDistance:m.cameraDistance});
  }
  checks.push('All eight genuine phase/view cases have advancing fronts, exact paused buffers, proper target-only previews and original primary geometry/material/scale');
  checks.push('Liquid, ice and cloud outgoing memories retain captured source transforms; Follow remains world anchored and Water uses a bounded lens');
  checks.push('Ice/liquid melt masks share actual complementary uniforms; snow release keeps captured cloud shadow source while opacity fades');
  checks.push('All four Water→Follow→Water switches and cue expiries restore every original scene material depth flag exactly');
  ok(d.receipts.length>=13&&d.receipts.every(r=>r.receipt.from===r.expectedFrom&&r.receipt.to===r.expectedTo&&r.actual.some(a=>a.from===r.expectedFrom&&a.to===r.expectedTo)), 'All native route fixtures produce the genuine expected kernel transitions and recorded receipts');
  evidence.consecutive=[];
  for(const c of d.consecutive){const liquid=c.kind==='melting-to-evaporation',name=liquid?'pilot-phase-liquid-memory':'pilot-phase-ice-memory',carry=obj(c.after,name).userData[liquid?'carriedMeltingFront':'carriedFreezingFront'];assert.equal(carry.active.value,1);assert(carry.progress.value>0&&carry.progress.value<1);if(liquid){const expected=c.cameraMode==='water'?c.before.bindings.melting.previewLocalToSource:c.before.bindings.melting.actualLocalToSource;assert(delta(carry.localToSource.value.elements,expected)<1e-8);}evidence.consecutive.push({kind:c.kind,camera:c.cameraMode,carriedProgress:carry.progress.value});}
  checks.push('All four genuine interrupted handoffs retain the previous partial reveal; liquid preserves the actual visible source-to-front mapping');
  const life=d.lifecycle;
  assert(life.later.steps>life.reduced.steps);assert.equal(life.reduced.groupData.progress,life.later.groupData.progress);
  for(const state of [life.restored,life.reset]){assert(!state.visible);for(const o of state.objects){for(const key of ['carriedMeltingFront','carriedFreezingFront'])if(o.userData[key]){assert.equal(o.userData[key].active.value,0);assert.equal(o.userData[key].progress.value,0);}}}
  evidence.lifecycle={reducedModelSteps:[life.reduced.steps,life.later.steps],staticReducedProgress:life.reduced.groupData.progress,phoneWidth:320,phoneIncomingVisible:d.phonePhase.bindings.droplet.visible};
  checks.push('Reduced motion holds the midpoint while real kernel steps advance; restore/reset clear both carried-front memories');
  const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,report:path.relative(root,path.join(out,'results.json')),checks,captures:d.captures.map(name=>({name,path:path.relative(root,path.join(out,name+'.png')),sourceSha256:d.sourceSha256})),transitions:d.phaseViews.map(p=>({name:p.name,cameraMode:p.cameraMode,from:p.midpoint.groupData.from,to:p.midpoint.groupData.to})),numericalEvidence:evidence,fixtureNotes:['Every phase checkpoint is reached by unchanged kernel stepping; fixture controls provide actual thrust and collection opportunities, never synthetic forms.','Temperate-coast melting is used because the tropical cloud droplet buoyancy prevents the intended descent; the cold cloud/snow fixture is lofted above the freezing level so the source cue survives its real duration.','The rapid recross is reached with a bounded genuine thrust controller near the freezing boundary.','Two cloud captures use an explicitly labelled QA-only camera orbit around unchanged actual geometry, light and materials.'],visualReview:{reviewedAllTen:true,rootReview:'reports/watercycle-pilot-rain-cloud-depth/visual-review.json',result:'Cloud bases and upper billows retain soft relief. Fine rain streaks remain readable against water/shore. Actual incoming liquid, paired ice melt and snow previews are centered and clear;320px rain controls fit.',limitation:'Rain center eligibility framebuffer probe yielded zero samples; rain visibility is supported by its actual compiled shader/buffer and inspected native desktop/phone PNGs. This pass makes no pixel contrast claim for that empty probe.'},rawAttempts:[{sourceSha256:d.sourceSha256,report:path.relative(root,path.join(out,'results.json')),success:true},{stage:'preflight',result:'Initial final-source path was missing before browser launch; production source hash verified exact6af and immutable source used. Root subsequently copied the identical frozen final-source.js.'}],errors:[]};
  fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({success:true,checks:checks.length,captures:summary.captures.length,numericalEvidence:evidence},null,2));
  process.exit(0);
}
fs.mkdirSync(out, { recursive: true });
const temp = ownedProfileSuite ? fs.mkdtempSync(path.join(out, 'browser-temp-')) : path.join(root, 'scratch/watercycle-pilot-' + suite + '-temp');
fs.mkdirSync(temp, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const sourcePath = path.resolve(root, arg('source') || 'stem_lab/stem_tool_watercycle.js');
assert(sourcePath.startsWith(root + path.sep), 'Fixture source stays within workspace');
const source = fs.readFileSync(sourcePath, 'utf8');
const captures = arg('captures')?.split(',');
const sections = arg('sections')?.split(',');
const phaseRoutes = (arg('phase-routes') || 'condensation,reevaporation,melting,snowRelease').split(',');
const opticalForms = (arg('optical-forms') || 'liquid,droplet,rain').split(',');
const cloudDistance = Number(arg('cloud-distance') || 260);
assert(Number.isFinite(cloudDistance)&&cloudDistance>=80&&cloudDistance<=400);
const enabled = section => !sections || sections.includes(section);
const cachedBrowsers = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cachedBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = cachedBrowsers;
const { chromium } = require('playwright');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};',
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,window.reviewCameraOverride||camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;if(window.rainCloudDepthCloudProbe)window.rainCloudDepthCloudProbe(scene,window.reviewCameraOverride||camera,renderer);return result;}};');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(data); });
});
const result = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], transitions: [], states: [], errors: [] };
const pass = name => { result.checks.push(name); console.log('PASS ' + name); };
const maxDelta = (a, b) => Math.max(...a.map((v, n) => Math.abs(v - b[n])));
function assertPaused(actual, expected, label) {
  const a = structuredClone(actual), b = structuredClone(expected);
  // The damped Water lens can converge by floating roundoff even with its
  // phase clock paused. Local visual buffers and shared uniforms must be exact.
  if (a.cameraMode === 'water') {
    for (const key of ['position']) {
      const delta = maxDelta(a[key], b[key]);
      (result.pauseTranslationSamples ||= []).push({ label, delta, actual: a[key], expected: b[key] });
      assert(delta < 1e-7, label + ' camera-relative placement, delta=' + delta);
      a[key] = null; b[key] = null;
    }
    for (let n = 0; n < a.meshes.length; n++) for (const key of ['position', 'worldPosition', 'quaternion']) {
      assert(maxDelta(a.meshes[n][key], b.meshes[n][key]) < (key === 'quaternion' ? 1e-12 : 1e-7), label + ' negligible transform roundoff');
      a.meshes[n][key] = null; b.meshes[n][key] = null;
    }
  }
  assert.deepEqual(a, b, label);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browserArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  if (ownedProfileSuite) browserArgs.push('--disk-cache-size=1', '--media-cache-size=1', '--disable-gpu-shader-disk-cache', '--disable-component-update', '--disable-background-networking');
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) result.errors.push(message.text()); });
  const canvas = page.locator('#wcPilotCanvas');
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const resume = async () => {
    if (!['cloud-exit', 'cloud-shadow-memory', 'rain-contact-memory', 'cloud-snow-onset','snow-melt-preview','cloud-assembly-source','cloud-assembly-flow','rain-landing-motion','splash-motion','cloud-formation-settle','cloud-immersion','rain-evaporation','cloud-source-thinning','refreezing-continuity','rain-landing-shower','cloud-interior-density','cloud-shadow-retirement','phase-motion-continuity'].includes(suite)) return page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
    const action = { before: await page.evaluate(() => ({ paused: waterReviewData.pilot.paused, scene: window.cloudShadowSnapshot ? cloudShadowSnapshot() : window.cloudExitSnapshot ? cloudExitSnapshot() : null })) };
    (result.resumeActions ||= []).push(action);
    await page.evaluate(() => {
      const button = document.querySelector('[data-control="pause"]');
      if (!button || !waterReviewData.pilot.paused) throw Error('Official Resume requires the current paused simulation control');
      button.click();
    });
    action.after = await page.evaluate(() => ({ paused: waterReviewData.pilot.paused, scene: window.cloudShadowSnapshot ? cloudShadowSnapshot() : window.cloudExitSnapshot ? cloudExitSnapshot() : null }));
  };
  async function pause() { await page.evaluate(() => { if (!waterReviewData.pilot.paused) document.querySelector('[data-control="pause"]').click(); }); await settle(); }
  async function capture(name) {
    const saveImage = !captures || captures.includes(name);
    const renderOnly = !saveImage && ['rain-emission', 'rain-collection', 'rain-onset', 'cloud-exit', 'cloud-shadow-memory', 'rain-contact-memory', 'cloud-snow-onset','snow-melt-preview','cloud-assembly-source','cloud-assembly-flow','rain-landing-motion','splash-motion','cloud-formation-settle','cloud-immersion'].includes(suite) && arg('captures') === 'none';
    if (!saveImage && !renderOnly) return;
    await canvas.scrollIntoViewIfNeeded(); await settle();
    const before = await page.evaluate(() => { window.spatialWeatherDrawOrder=[]; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
    await page.waitForFunction(before => window.reviewRenderCount > before, before);
    await page.evaluate(() => { window.reviewRenderActive = false; });
    if (renderOnly) {
      const frame = await page.evaluate(() => window.reviewRenderCount);
      (result.renderOnlyCaptures ||= []).push({ name, before, frame }); console.log('RENDER ' + name); return;
    }
    const box = await canvas.boundingBox(); assert(box && box.width >= 250 && box.height >= 180);
    try { await page.screenshot({ path: path.join(out, name + '.png'), clip: box, animations: 'disabled', timeout: 45000 }); }
    catch (error) { (result.captureRetries ||= []).push({ name, error: String(error) }); await page.screenshot({ path: path.join(out, name + '.png'), clip: box, timeout: 30000 }); }
    result.captures.push(name); console.log('CAPTURE ' + name);
  }
  async function restore(name, { cameraMode = 'follow', pauseAtChanges = true } = {}) {
    await page.evaluate(({ name, cameraMode, pauseAtChanges }) => {
      window.reviewRenderActive = false; window.reviewCameraOverride = null; window.rainCloudDepthDriveInput = null; window.rainCloudDepthSteadyInput = null; window.rainCloudDepthLiveSteps = []; window.rainCloudDepthTotalSteps = 0;
      const checkpoint = rainCloudDepthStates[name];
      window.contactLiveState = { ...checkpoint }; window.snowOnsetLiveState = { ...checkpoint }; window.snowOnsetSourceProof = null; window.snowOnsetGPU = null; window.snowOnsetPool = null;
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, snowTempC: checkpoint.snowTempC, snowHumidity: checkpoint.snowHumidity, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'rainCloudDepth-' + name + '-' + Date.now() } }, 'light');
    }, { name, cameraMode, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => { const c = document.querySelector('#wcPilotCanvas'); return window.pilotReview && c && c.dataset.parcelForm === rainCloudDepthStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === rainCloudDepthStates[name].form; }, { name, cameraMode });
    await settle();
    if(suite==='spatial-weather')await page.evaluate(()=>{
      window.spatialWeatherDrawOrder=[];window.spatialWeatherDrawHooks||=new WeakSet();
      pilotReview.scene.traverse(o=>{
        const water=['pilot-ocean-surface','pilot-coastal-shallows','pilot-lake-water','pilot-stream-water','pilot-stream-riffles','pilot-stream-cascades','pilot-stream-ice','pilot-water-surface-glints','pilot-stream-flow-streaks'].includes(o.name),cloud=o.isSprite&&o.material?.pilotBillowNormalMap;
        if((!water&&!cloud)||!o.material||spatialWeatherDrawHooks.has(o))return;spatialWeatherDrawHooks.add(o);const previous=o.onBeforeRender;
        o.onBeforeRender=function(){if(previous)previous.apply(this,arguments);const groups=[];for(let p=this.parent;p;p=p.parent)if(p.isGroup)groups.push({name:p.name,renderOrder:p.renderOrder});window.spatialWeatherDrawOrder.push({frame:window.reviewRenderCount||0,kind:cloud?'cloud':'water',name:this.name,parent:this.parent?.name,renderOrder:this.renderOrder,groups});};
      });
    });
  }
  const handoff = () => page.evaluate(() => {
    const c = document.querySelector('#wcPilotCanvas'), scene = pilotReview.scene, group = scene.getObjectByName('pilot-phase-handoff');
    const geometryIds = new Set(), materialIds = new Set(), allMaterialDepth=new Map();
    const sample = o => {
      if (o.geometry) geometryIds.add(o.geometry.uuid);
      const materials = (o.material ? Array.isArray(o.material) ? o.material : [o.material] : []).map(m => { materialIds.add(m.uuid); return { uuid: m.uuid, opacity: m.opacity, depthTest:m.depthTest,depthWrite:m.depthWrite,userData: rainCloudDepthClean(m.userData) }; });
      return { name: o.name, visible: o.visible, geometry: o.geometry?.uuid, position: o.position.toArray(), worldPosition: o.getWorldPosition(new THREE.Vector3()).toArray(), scale: o.scale.toArray(), worldScale: o.getWorldScale(new THREE.Vector3()).toArray(), quaternion: o.quaternion.toArray(), worldQuaternion:o.getWorldQuaternion(new THREE.Quaternion()).toArray(), materials, userData: rainCloudDepthClean(o.userData), count: o.count, instanceMatrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null };
    };
    const meshes = []; group.traverse(o => { if (o !== group) meshes.push(sample(o)); });
    const parcel = scene.getObjectByName('pilot-water-parcel');
    // A memory switches between already-pooled liquid and rain geometries;
    // inspect the whole scene pool rather than only currently assigned memory.
    scene.traverse(o => { if (o.geometry) geometryIds.add(o.geometry.uuid); for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {materialIds.add(m.uuid);allMaterialDepth.set(m.uuid,{uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite});} });
    return { visible: group.visible, cameraMode: c.dataset.pilotCamera, position: group.position.toArray(), data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront }, userData: rainCloudDepthClean(group.userData), geometryIds: [...geometryIds].sort(), materialIds: [...materialIds].sort(), materialDepth:[...allMaterialDepth.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid)), meshes, parcel: { position: parcel.position.toArray(), worldPosition: parcel.getWorldPosition(new THREE.Vector3()).toArray(), children: parcel.children.map(sample) } };
  });
  async function inspect(name) {
    const info = await page.evaluate(() => {
      let finite = true; const named = {};
      pilotReview.scene.traverse(o => {
        if (/^pilot-/.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, children: o.children.length, userData: rainCloudDepthClean(o.userData) };
        finite = finite && [...o.position.toArray(), ...o.scale.toArray(), ...o.quaternion.toArray()].every(Number.isFinite);
        if (o.instanceMatrix) finite = finite && Array.from(o.instanceMatrix.array).every(Number.isFinite);
        if (o.geometry) for (const a of Object.values(o.geometry.attributes || {})) finite = finite && Array.from(a.array).every(Number.isFinite);
        for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) { if (m.opacity !== undefined) finite = finite && Number.isFinite(m.opacity); }
      });
      const c = document.querySelector('#wcPilotCanvas');
      return { finite, dataset: { ...c.dataset }, named, resources: JSON.parse(JSON.stringify(pilotReview.renderer.info.memory)), programs: pilotReview.renderer.info.programs.length, snapshot: JSON.parse(JSON.stringify(waterReviewData.pilot.snapshot)) };
    });
    assert(info.finite, 'Actual rendered scene buffers and transforms stay finite'); result.states.push({ name, ...info }); return info;
  }
  async function trigger(name, options) {
    await restore('before-' + name, options); const before = await handoff(); assert.equal(before.data.active, 'hidden', 'Restore clears stale handoff');
    await driveTransition(name); return before;
  }
  async function driveTransition(name) {
    await page.evaluate(name => { window.rainCloudDepthDriveInput = { ...rainCloudDepthTransitions[name].input }; }, name); await resume();
    try { await page.waitForFunction(name => { if(window.nativeQAPageError)throw Error(window.nativeQAPageError);const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === rainCloudDepthTransitions[name].after.form && waterReviewData.pilot.paused; }, name); } catch(error) { (result.transitionFailures ||= []).push(await page.evaluate(name => ({name,dataset:{...document.querySelector('#wcPilotCanvas').dataset},paused:waterReviewData.pilot.paused,live:snowOnsetLiveState,steps:rainCloudDepthLiveSteps,pageError:window.nativeQAPageError||null}),name));throw error; }
    await settle();
    const receipt = await page.evaluate(name => ({ name, expectedFrom: rainCloudDepthTransitions[name].before.form, expectedTo: rainCloudDepthTransitions[name].after.form, actual: rainCloudDepthLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
    assert(receipt.actual.some(step => step.from === receipt.expectedFrom && step.to === receipt.expectedTo), 'Real kernel performs the scene transition');
    assert(receipt.receipt?.from === receipt.expectedFrom && receipt.receipt?.to === receipt.expectedTo, 'Scene retains genuine form-change receipt');
    (result.receipts ||= []).push(receipt);
  }

  const cloudSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);
    const clouds=[],normalMaps=new Map(),albedos=new Map(),shaderNormals=new Set(),sun=pilotReview.scene.getObjectByName('pilot-cloud-shadow').userData.sunDirection;
    const textureInfo=texture=>{const image=texture?.image;if(!image?.getContext)return null;const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0,maxRGBSpread=0,opaque=0,checksum=0;const luminances=[];for(let n=0;n<pixels.length;n+=4){if(pixels[n+3]>16){opaque++;minR=Math.min(minR,pixels[n]);maxR=Math.max(maxR,pixels[n]);minG=Math.min(minG,pixels[n+1]);maxG=Math.max(maxG,pixels[n+1]);minB=Math.min(minB,pixels[n+2]);maxB=Math.max(maxB,pixels[n+2]);maxRGBSpread=Math.max(maxRGBSpread,Math.max(pixels[n],pixels[n+1],pixels[n+2])-Math.min(pixels[n],pixels[n+1],pixels[n+2]));if(pixels[n+3]>240)luminances.push((pixels[n]+pixels[n+1]+pixels[n+2])/3);}checksum=(checksum+pixels[n]*(n+1)+pixels[n+1]*3+pixels[n+2]*7) % 1000000007;}luminances.sort((a,b)=>a-b);return {uuid:texture.uuid,name:texture.name,width:image.width,height:image.height,opaque,minR,maxR,minG,maxG,minB,maxB,maxRGBSpread,checksum,userData:rainCloudDepthClean(texture.userData),opaqueLuminance05:luminances[Math.floor(luminances.length*.05)],opaqueLuminance95:luminances[Math.floor(luminances.length*.95)]};};
    pilotReview.scene.traverse(o=>{const m=o.material;if(!o.isSprite||!m?.pilotBillowNormalMap)return;const normal=m.pilotBillowNormalMap,newNormal=!normalMaps.has(normal.uuid),lighting=m.userData.cloudLighting||{};normalMaps.set(normal.uuid,textureInfo(normal));if(m.map)albedos.set(m.map.uuid,textureInfo(m.map));const properties=pilotReview.renderer.properties.get(m),program=properties.currentProgram||properties.program,gl=pilotReview.renderer.getContext(),fragment=program?.fragmentShader?gl.getShaderSource(program.fragmentShader):'',vertex=program?.vertexShader?gl.getShaderSource(program.vertexShader):'',keepShader=!!fragment&&!shaderNormals.has(normal.uuid),readUniform=name=>{if(!program?.program)return null;const location=gl.getUniformLocation(program.program,name);if(!location)return null;const value=gl.getUniform(program.program,location);return ArrayBuffer.isView(value)?Array.from(value):value;};if(keepShader)shaderNormals.add(normal.uuid);clouds.push({name:o.name,parent:o.parent?.name,tier:o.userData.cloudTier,shelterCaptured:o.userData.cloudShelterCaptured,map:m.map?.uuid,normal:normal.uuid,material:m.uuid,color:m.color.toArray(),position:o.position.toArray(),scale:o.scale.toArray(),lighting:rainCloudDepthClean(lighting),sharedSunKeys:Object.entries(lighting).filter(([,v])=>v===sun||v?.value===sun).map(([k])=>k),sharesNormal:lighting.normalMap===normal||lighting.normalMap?.value===normal,compile:String(m.onBeforeCompile),linkedFragment:keepShader?fragment:null,linkedVertex:keepShader?vertex:null,linkedShader:!!fragment,uploaded:fragment?{sun:readUniform('pilotCloudSun'),solar:readUniform('pilotCloudSolar'),normalUnit:readUniform('pilotCloudNormalMap'),shelter:readUniform('pilotCloudShelter'),view:readUniform('pilotCloudViewMatrix')}:null,cacheKey:m.customProgramCacheKey()});});
    const camera=window.reviewCameraOverride||pilotReview.camera,cameraSun=sun.clone().transformDirection(camera.matrixWorldInverse);
    return {sun:sun.toArray(),cameraSun:cameraSun.toArray(),expectedCameraView:camera.matrixWorldInverse.toArray(),pixelProbe:window.rainCloudDepthCloudPixels,shelterReads:Object.values(window.rainCloudDepthShelterReads||{}),clouds,normalMaps:[...normalMaps.values()],albedos:[...albedos.values()],drawOrder:(window.spatialWeatherDrawOrder||[]).slice()};
  });

  const phaseDetail = () => page.evaluate(() => {
    const s=pilotReview.scene;s.updateMatrixWorld(true);const group=s.getObjectByName('pilot-phase-handoff'),parcel=s.getObjectByName('pilot-water-parcel'),c=document.querySelector('#wcPilotCanvas'),objects=[];
    group.traverse(o=>{const materials=o.material?Array.isArray(o.material)?o.material:[o.material]:[];objects.push({name:o.name,type:o.type,visible:o.visible,renderOrder:o.renderOrder,position:o.position.toArray(),worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),scale:o.scale.toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),quaternion:o.quaternion.toArray(),geometry:o.geometry?.uuid,count:o.count,instanceMatrix:o.instanceMatrix?Array.from(o.instanceMatrix.array):null,userData:rainCloudDepthClean(o.userData),materials:materials.map(m=>({uuid:m.uuid,opacity:m.opacity,depthTest:m.depthTest,depthWrite:m.depthWrite,userData:rainCloudDepthClean(m.userData)}))});});
    const primaryDroplet=s.getObjectByName('pilot-phase-incoming-droplet'),primarySnow=s.getObjectByName('pilot-snow-parcel'),snowPreview=s.getObjectByName('pilot-phase-incoming-snow'),rainPreview=s.getObjectByName('pilot-phase-incoming-rain');
    const actualDrop=primaryDroplet&&parcel.children.find(o=>o.geometry===primaryDroplet.geometry&&o.material===primaryDroplet.material),snowBody=primarySnow.children.find(o=>o.isMesh),snowEdge=primarySnow.children.find(o=>o.isLineSegments),previewBody=snowPreview?.children.find(o=>o.isMesh),previewEdge=snowPreview?.children.find(o=>o.isLineSegments),iceMemory=s.getObjectByName('pilot-phase-ice-memory'),iceFront=iceMemory?.material?.userData.meltingFront,dropFront=actualDrop?.material.userData.meltingFront;
    const bindings={droplet:primaryDroplet&&actualDrop?{visible:primaryDroplet.visible,sharesGeometry:primaryDroplet.geometry===actualDrop.geometry,sharesMaterial:primaryDroplet.material===actualDrop.material,previewWorldScale:primaryDroplet.getWorldScale(new THREE.Vector3()).toArray(),actualWorldScale:actualDrop.getWorldScale(new THREE.Vector3()).toArray()}:null,snow:snowPreview?{visible:snowPreview.visible,bodyGeometry:previewBody?.geometry===snowBody.geometry,bodyMaterial:previewBody?.material===snowBody.material,edgeGeometry:previewEdge?.geometry===snowEdge.geometry,edgeMaterial:previewEdge?.material===snowEdge.material,previewScale:snowPreview.getWorldScale(new THREE.Vector3()).toArray(),actualScale:primarySnow.getWorldScale(new THREE.Vector3()).toArray()}:null,rainVisible:rainPreview?.visible,melting:iceFront&&dropFront?{sharedActive:iceFront.active===dropFront.active,sharedProgress:iceFront.progress===dropFront.progress,sharedTransform:iceFront.worldToSource===dropFront.worldToSource,sourceIsIncoming:iceFront.incoming,targetIsIncoming:dropFront.incoming,sourceCentre:iceMemory.getWorldPosition(new THREE.Vector3()).applyMatrix4(iceFront.worldToSource.value).toArray(),previewLocalToSource:iceFront.worldToSource.value.clone().multiply(primaryDroplet.matrixWorld).toArray(),actualLocalToSource:iceFront.worldToSource.value.clone().multiply(actualDrop.matrixWorld).toArray()}:null};
    const materialDepth=new Map();s.traverse(o=>{for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])materialDepth.set(m.uuid,{uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite});});
    const shadow=s.getObjectByName('pilot-cloud-shadow'),cameraDistance=pilotReview.camera.position.distanceTo(parcel.getWorldPosition(new THREE.Vector3()));
    return {visible:group.visible,groupData:rainCloudDepthClean(group.userData),data:{...c.dataset},objects,bindings,materialDepth:[...materialDepth.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid)),parcelPosition:parcel.getWorldPosition(new THREE.Vector3()).toArray(),cameraDistance,primary:parcel.children.map(o=>({name:o.name,visible:o.visible,geometry:o.geometry?.uuid,scale:o.scale.toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),position:o.position.toArray(),worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:o.quaternion.toArray(),materials:(o.material?Array.isArray(o.material)?o.material:[o.material]:[]).map(m=>({uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite}))})),shadow:{visible:shadow.visible,userData:rainCloudDepthClean(shadow.userData)},steps:window.rainCloudDepthTotalSteps};
  });
  const rainSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);const out=[];
    for(const name of ['pilot-rain-field','pilot-rain-ribbons','pilot-rain-water-impacts']){const o=pilotReview.scene.getObjectByName(name),m=o.material,p=pilotReview.renderer.properties.get(m),program=p.currentProgram||p.program,gl=pilotReview.renderer.getContext();out.push({name,visible:o.visible,opacity:m.opacity,userData:rainCloudDepthClean(o.userData),materialUserData:rainCloudDepthClean(m.userData),compile:String(m.onBeforeCompile),vertex:program?.vertexShader?gl.getShaderSource(program.vertexShader):'',fragment:program?.fragmentShader?gl.getShaderSource(program.fragmentShader):'',attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{count:a.count,itemSize:a.itemSize,values:Array.from(a.array)}]))});}
    return {objects:out,pixels:window.rainCloudDepthRainPixels,dataset:{...document.querySelector('#wcPilotCanvas').dataset}};
  });
  const opticalSample = () => page.evaluate(() => {
    const s=pilotReview.scene,renderer=pilotReview.renderer,gl=renderer.getContext(),seen=new Set(),materials=[],objects=[];s.updateMatrixWorld(true);
    for(const groupName of ['pilot-water-parcel','pilot-phase-handoff'])s.getObjectByName(groupName)?.traverse(o=>{
      if(!o.material)return;objects.push({name:o.name,type:o.type,visible:o.visible,parentVisible:o.parent?.visible,worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),geometry:o.geometry?.uuid});
      for(const m of Array.isArray(o.material)?o.material:[o.material]){if(seen.has(m.uuid))continue;seen.add(m.uuid);const properties=renderer.properties.get(m),program=properties.currentProgram||properties.program,uniforms={};if(program?.program){for(let i=0,n=gl.getProgramParameter(program.program,gl.ACTIVE_UNIFORMS);i<n;i++){const active=gl.getActiveUniform(program.program,i);if(!/^pilot|^parcelOptical|^opacity$|^diffuse$|^roughness$|^metalness$/.test(active.name))continue;const value=gl.getUniform(program.program,gl.getUniformLocation(program.program,active.name));uniforms[active.name]=ArrayBuffer.isView(value)?Array.from(value):value;}}
      materials.push({uuid:m.uuid,name:m.name,type:m.type,color:m.color?.toArray(),opacity:m.opacity,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,blending:m.blending,premultipliedAlpha:m.premultipliedAlpha,toneMapped:m.toneMapped,userData:rainCloudDepthClean(m.userData),compile:String(m.onBeforeCompile),cacheKey:m.customProgramCacheKey(),vertex:program?.vertexShader?gl.getShaderSource(program.vertexShader):null,fragment:program?.fragmentShader?gl.getShaderSource(program.fragmentShader):null,uploaded:uniforms});}
    });return {objects,materials,camera:(window.reviewCameraOverride||pilotReview.camera).matrixWorldInverse.toArray(),dataset:{...document.querySelector('#wcPilotCanvas').dataset}};
  });
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.pilotReview&&window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl');return !!gl&&!gl.isContextLost();}));
    await page.evaluate(({ rainEmissionFixtureRequested, rainCollectionFixtureRequested, shadowMemoryFixtureRequested, rainContactFixtureRequested, cloudSnowFixtureRequested, snowMeltFixtureRequested,cloudAssemblyFixtureRequested })=>{
      window.rainEmissionFixtureRequested=rainEmissionFixtureRequested;
      window.rainCollectionFixtureRequested=rainCollectionFixtureRequested;
      window.shadowMemoryFixtureRequested=shadowMemoryFixtureRequested;
      window.cloudAssemblyFixtureRequested=cloudAssemblyFixtureRequested;
      window.rainContactFixtureRequested=rainContactFixtureRequested; window.cloudSnowFixtureRequested=cloudSnowFixtureRequested; window.snowMeltFixtureRequested=snowMeltFixtureRequested;
      window.reviewRenderActive=false;
      window.rainCloudDepthClean=function(value){const seen=new WeakSet();const clean=v=>{if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;if(v.isTexture)return {uuid:v.uuid,name:v.name,width:v.image?.width,height:v.image?.height};if(seen.has(v))return '[shared reference]';seen.add(v);if(Array.isArray(v)||ArrayBuffer.isView(v))return Array.from(v,clean);return Object.fromEntries(Object.entries(v).filter(([key])=>!['surfaceShader','meltShader','cloudShader'].includes(key)).map(([key,item])=>[key,clean(item)]));};return clean(value);};
      window.rainCloudDepthCloudProbe=function(scene,camera,renderer){const gl=renderer.getContext(),cloud=scene.getObjectByName('pilot-self-cloud'),read=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(Math.max(0,Math.min(gl.drawingBufferWidth-1,x)),Math.max(0,Math.min(gl.drawingBufferHeight-1,y)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);};if(cloud?.visible){const samples=[];for(const child of cloud.children){const point=child.getWorldPosition(new THREE.Vector3()).project(camera);if(Math.abs(point.x)>.98||Math.abs(point.y)>.98||point.z< -1||point.z>1)continue;const x=Math.round((point.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((point.y+1)*.5*(gl.drawingBufferHeight-1)),rgba=read(x,y);samples.push({ndc:point.toArray(),rgba,luminance:(rgba[0]+rgba[1]+rgba[2])/3});}window.rainCloudDepthCloudPixels={samples,renderCamera:camera.matrixWorldInverse.toArray()};}
        const rain=scene.getObjectByName('pilot-rain-ribbons');if(rain?.visible){const positions=rain.geometry.attributes.position,alpha=rain.geometry.attributes.rainAlpha,along=rain.geometry.attributes.rainAlong,samples=[];let stride=6;if(along)for(let i=2;i<along.count;i++)if(along.getX(i)===0&&along.getX(i-1)!==0){stride=i;break;}for(let n=0;n<positions.count&&samples.length<20;n+=stride){if(alpha&&alpha.getX(n)<=.03)continue;const world=new THREE.Vector3();for(let v=0;v<stride;v++)world.add(new THREE.Vector3().fromBufferAttribute(positions,n+v));world.multiplyScalar(1/stride).applyMatrix4(rain.matrixWorld);const eye=world.clone().applyMatrix4(camera.matrixWorldInverse),point=world.clone().project(camera),depth=-eye.z;if(depth<3||depth>100||Math.abs(point.x)>.95||Math.abs(point.y)>.95||point.z< -1||point.z>1)continue;const x=Math.round((point.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((point.y+1)*.5*(gl.drawingBufferHeight-1)),centre=read(x,y),left=read(x-3,y),right=read(x+3,y),contrast=Math.max(...centre.slice(0,3).map((v,i)=>Math.max(Math.abs(v-left[i]),Math.abs(v-right[i]))));samples.push({depth,ndc:point.toArray(),centre,left,right,contrast});}window.rainCloudDepthRainPixels={samples};}
      };
      const k=WaterCyclePilotKernel,original=k.step,states={},transitions={},env=k.environment('tropicalOcean');
      const advance=(start,input,limit,desired)=>{let s=start;for(let n=0;n<limit;n++){const next=original(s,input);if(next.form!==s.form&&next.form===desired)return {before:s,after:next,input};s=next;}throw Error('Production kernel did not reach '+desired);};
      states.liquid=k.practiceState('surface','tropicalOcean');states.vapor=k.practiceState('cloud','tropicalOcean');transitions.condensation=advance(states.vapor,{dt:.12,nucleusHit:true},100,'droplet');states.droplet=transitions.condensation.after;
      transitions.reevaporation=advance(states.droplet,{dt:.12,thrust:-1,nucleusHit:false,dropletHit:false},12000,'vapor');
      const temperateDroplet=advance(k.practiceState('cloud','temperateCoast'),{dt:.12,nucleusHit:true},100,'droplet').after;transitions.freezing=advance(temperateDroplet,{dt:.12,thrust:1,dropletHit:false},12000,'ice');states.ice=transitions.freezing.after;
      transitions.melting=advance(states.ice,{dt:.12,thrust:-1,nucleusHit:false,dropletHit:false},12000,'droplet');
      transitions.cloudAssembly=advance(states.droplet,{dt:.12,dropletHit:true},100,'cloud');states.cloud=transitions.cloudAssembly.after;transitions.rainRelease=advance(states.cloud,{dt:.12,dropletHit:true},100,'rain');states.rain=transitions.rainRelease.after;
      if (window.rainEmissionFixtureRequested) {
        let highCloud = states.cloud;
        for (let n = 0; n < 12000 && highCloud.altitudeM < 1600; n++) highCloud = original(highCloud, { dt: .12, thrust: 1, dropletHit: false, nucleusHit: false });
        if (highCloud.form !== 'cloud' || highCloud.altitudeM < 1600) throw Error('Genuine cloud did not reach high-rain fixture altitude');
        states.rainHigh = advance(highCloud, { dt: .12, dropletHit: true, thrust: 1 }, 100, 'rain').after;
      }
      if (window.rainCollectionFixtureRequested) {
        window.rainCollectionJourneys = [];
        for (const [body, x, z] of [['ocean', -150, 40], ['lake', 268, -104], ['stream', 205, -50]]) {
          // Only the declared starting location changes. Every phase, mass,
          // altitude and clock value comes from a complete production journey.
          let state = { ...k.practiceState('surface', 'tropicalOcean'), x, z, yaw: -.75, pitch: .2 };
          const input = { dt: .05, sunlit: true, thrust: 1, nucleusHit: true, dropletHit: true, surface: 'water' }, route = [];
          let arrival = null;
          for (let n = 0; n < 40000; n++) {
            const next = original(state, input);
            if (next.form !== state.form) route.push({ from: state.form, to: next.form, altitudeM: next.altitudeM, elapsed: next.elapsed, mass: next.mass });
            if (state.form === 'rain' && next.form === 'liquid') { arrival = { before: state, after: next, input }; break; }
            state = next;
          }
          if (!arrival) throw Error('No genuine rain-to-' + body + ' collection route');
          transitions['collection-' + body] = arrival; states['collected-' + body] = arrival.after;
          window.rainCollectionJourneys.push({ body, start: { x, z, form: 'liquid' }, route });
        }
      }
      {let s=states.rain;for(let n=0;n<10000&&s.altitudeM>28;n++)s=original(s,{dt:.12,surface:'water'});if(s.form!=='rain'||s.altitudeM<=0)throw Error('Real rain did not reach low ocean');states.rainLow=s;}
      {let s=states.cloud;for(let n=0;n<12000&&s.altitudeM<Math.min(env.ceilingM-40,env.freezingM+240);n++)s=original(s,{dt:.12,thrust:1,dropletHit:false,nucleusHit:false});if(s.form!=='cloud'||s.altitudeM<env.freezingM)throw Error('Actual cloud could not be lofted through freezing');states.coldCloud=s;transitions.snowRelease=advance(s,{dt:.12,thrust:1,dropletHit:true},100,'snow');}
      const mountainVapor=k.practiceState('cloud','mountainWinter'),mountainIce=advance(mountainVapor,{dt:.12,nucleusHit:true},100,'ice').after;transitions.mountainMelting=advance(mountainIce,{dt:.12,thrust:-1,dropletHit:false,nucleusHit:false},12000,'droplet');transitions.mountainReevaporation=advance(transitions.mountainMelting.after,{dt:.12,thrust:-1,dropletHit:false,nucleusHit:false},10,'vapor');
      {const e=k.environment('temperateCoast');let state=temperateDroplet;for(let n=0;n<12000;n++){const dt=.12,base=k.verticalAccel(state,e,0),gain=k.verticalAccel(state,e,1)-base,desired=Math.max(-.1,Math.min(1.5,(e.freezingM+.05-state.altitudeM)/(k.UNIT_M*2.5))),thrust=Math.max(-1,Math.min(1,((desired/(1-.9*dt)-state.vy)/dt-base)/gain)),input={dt,thrust,dropletHit:false,nucleusHit:false},next=original(state,input);if(state.form==='droplet'&&next.form==='ice'){transitions.recrossFreezing={before:state,after:next,input};break;}state=next;}if(!transitions.recrossFreezing)throw Error('Genuine controlled freezing recross missing');transitions.recrossMelting=advance(transitions.recrossFreezing.after,{dt:.12,thrust:-1,dropletHit:false,nucleusHit:false},8,'droplet');}
      if (window.rainContactFixtureRequested) {
        const e = k.environment('tropicalOcean'), dt = .016, start = { ...k.practiceState('cloud', 'tropicalOcean'), x: -150, z: 40 };
        let state = start, cooldown = 0, released = false, complete = false;
        const route = [], hits = [];
        for (let n = 0; n < 20000; n++) {
          cooldown = Math.max(0, cooldown - dt);
          const thrust = released ? 0 : k.assistControls(state, e, {x:state.x,z:state.z,altitudeM:state.altitudeM},
            {x:state.x,z:state.z,altitudeM:e.lclM+130}, 0, {enabled:true,paused:false,manual:false}).thrust;
          const hit = !released && (state.form === 'droplet' || state.form === 'cloud') && cooldown === 0;
          const input = {dt,thrust,nucleusHit:state.form==='vapor'&&state.altitudeM>=e.lclM,dropletHit:hit,surface:'water',sunlit:true};
          if(hit){hits.push({elapsed:state.elapsed,form:state.form,cooldown});cooldown=.6;}
          const next = original(state,input);
          if(next.form!==state.form){route.push({from:state.form,to:next.form,elapsed:next.elapsed,altitudeM:next.altitudeM,mass:next.mass,input});if(next.form==='rain')released=true;}
          state=next;
          if(released&&state.form==='rain'&&state.altitudeM<=160){states.rainContactStart=state;complete=true;break;}
        }
        if(!complete||state.form!=='rain'||state.altitudeM<150)throw Error('Production rain did not reach genuine160m contact checkpoint');
        window.rainContactJourney={start,checkpoint:state,route,hits,scope:'Original kernel and assist controls generate the complete vapor-to-rain descent with .6s collection cooldowns. Native rendering resumes the genuine rain checkpoint; the upstream geometric mote pickups are not native-tested.'};
      }
      if (window.cloudSnowFixtureRequested) {
        const e=k.environment('tropicalOcean'),dt=.016,start=k.practiceState('cloud','tropicalOcean');
        let state=start,cooldown=0,stage='warm',done=false; const hits=[],route=[];
        const coldAltitude=Math.min(e.ceilingM-40,e.freezingM+240);
        for(let n=0;n<20000;n++){
          cooldown=Math.max(0,cooldown-dt);
          if(stage==='warm'&&state.form==='cloud')stage='loft';
          if(stage==='loft'&&state.altitudeM>=coldAltitude)stage='cold';
          const thrust=k.assistControls(state,e,{x:state.x,z:state.z,altitudeM:state.altitudeM},
            {x:state.x,z:state.z,altitudeM:stage==='warm'?e.lclM+130:coldAltitude+20},0,{enabled:true,paused:false,manual:false}).thrust;
          const hit=cooldown===0&&((stage==='warm'&&state.form==='droplet')||(stage==='cold'&&state.form==='cloud'));
          const input={dt,thrust,sunlit:true,surface:'water',nucleusHit:state.form==='vapor'&&state.altitudeM>=e.lclM,dropletHit:hit};
          if(hit){hits.push({elapsed:state.elapsed,form:state.form,stage,cooldown});cooldown=.6;}
          const next=original(state,input);
          if(next.form!==state.form)route.push({from:state.form,to:next.form,elapsed:[state.elapsed,next.elapsed],altitudeM:next.altitudeM,mass:next.mass,input:{...input}});
          if(state.form==='cloud'&&next.form==='snow'){
            transitions.cloudSnowRelease={before:state,after:next,input};states.cloudSnowRestored=next;done=true;break;
          }
          if(next.form==='rain'||(stage!=='warm'&&next.form!=='cloud'))throw Error('Snow fixture unexpectedly left its genuine cloud route');
          state=next;
        }
        if(!done)throw Error('Original kernel did not release cloud snow with real collection cooldowns');
        window.cloudSnowJourney={start,coldAltitude,scenario:'tropicalOcean',dt,hits,route,
          checkpoint:transitions.cloudSnowRelease.before,release:transitions.cloudSnowRelease,
          scope:'Original kernel and assist controls generate a visible-band nucleus, cooldown-respecting warm cloud formation, no-hit loft and cold cloud growth to snow. Native rendering resumes the genuine pre-release checkpoint and replays its saved release input; upstream rendered mote collision acceptance is not native-tested.'};
      }
      if (window.snowMeltFixtureRequested) {
        let state=transitions.cloudSnowRelease.after,done=false;const descent=[];
        const input={dt:.016,thrust:0,sunlit:true,surface:'water',dropletHit:false,nucleusHit:false};
        for(let n=0;n<20000;n++){
          const next=original(state,input);
          if(next.form!==state.form)descent.push({from:state.form,to:next.form,elapsed:[state.elapsed,next.elapsed],altitudeM:next.altitudeM,mass:next.mass,input:{...input}});
          if(state.form==='snow'&&next.form==='rain'){
            transitions.snowMeltRain={before:state,after:next,input:{...input}};states.snowMeltRestoredRain=next;done=true;break;
          }
          if(next.form!=='snow')throw Error('Genuine snow left its falling route before rain');
          state=next;
        }
        if(!done)throw Error('Original kernel did not reach actual falling-snow melt');
        window.snowMeltJourney={...cloudSnowJourney,descent,melting:transitions.snowMeltRain,
          scope:'The unchanged kernel and assist controls generate cooldown-respecting warm cloud formation, no-hit loft, cold growth and falling snow. Ordinary no-hit descent reaches the saved snow-to-rain checkpoint. Native rendering resumes that genuine checkpoint and replays its original input; upstream rendered mote collision acceptance is not native-tested.'};
      }
      if(window.cloudAssemblyFixtureRequested){
        const env=k.environment('temperateCoast'),dt=.016,declaredStart={x:-150,z:40};
        let state={...k.practiceState('cloud','temperateCoast'),...declaredStart},cooldown=0,iceHits=0,warmHits=0,complete=false;
        const receipts=[],hits=[];
        for(let n=0;n<20000;n++){
          cooldown=Math.max(0,cooldown-dt);
          const targetAltitude=iceHits>=13?env.freezingM-80:env.freezingM+160;
          const thrust=k.assistControls(state,env,{x:state.x,z:state.z,altitudeM:state.altitudeM},
            {x:state.x,z:state.z,altitudeM:targetAltitude},0,{enabled:true,paused:false,manual:false}).thrust;
          const iceHit=state.form==='ice'&&iceHits<13&&cooldown===0;
          const warmHit=state.form==='droplet'&&iceHits===13&&warmHits===0&&cooldown===0;
          const input={dt,thrust,sunlit:true,surface:'water',nucleusHit:state.form==='vapor'&&state.altitudeM>=env.lclM,dropletHit:iceHit||warmHit};
          if(input.dropletHit){hits.push({form:state.form,elapsed:state.elapsed,cooldown,input:{...input}});cooldown=.6;if(iceHit)iceHits++;else warmHits++;}
          const next=original(state,input);
          if(next.form!==state.form){
            receipts.push({from:state.form,to:next.form,elapsed:[state.elapsed,next.elapsed],altitudeM:next.altitudeM,mass:next.mass,droplets:next.droplets,input:{...input}});
            if(state.form==='ice'&&next.form==='droplet'&&iceHits===13)transitions.assemblyThaw={before:state,after:next,input:{...input}};
            if(state.form==='droplet'&&next.form==='cloud'&&warmHits===1){transitions.assemblyWarmCloud={before:state,after:next,input:{...input}};states.assemblyRestoredCloud=next;state=next;complete=true;break;}
          }
          state=next;
        }
        if(!complete||!transitions.assemblyThaw||iceHits!==13||warmHits!==1||state.mass>=2.4)throw Error('Genuine cooldown-respecting13-hit assembly route did not complete below rain threshold');
        window.cloudAssemblyJourney={declaredStart,scenario:'temperateCoast',dt,iceHits,warmHits,receipts,hits,thaw:transitions.assemblyThaw,formation:transitions.assemblyWarmCloud,
          scope:'Original cloud practice, near-LCL nucleus, no-hit climb,13 cooldown-respecting cold collection hits, original assist-controlled descent and one warm hit generate every form, mass, altitude and elapsed value. Native rendering resumes the genuine pre-thaw checkpoint and replays its saved thaw and warm-hit inputs without restoring between them. Upstream rendered-mote collision acceptance is not native-tested.'};
      }
      if (window.shadowMemoryFixtureRequested) {
        const shadowEnv = k.environment('temperateCoast'), dt = .016, declaredStart = { x: 180, z: 40 };
        let state = { ...k.practiceState('cloud', 'temperateCoast'), ...declaredStart }, cooldown = 0, iceHits = 0, warmHits = 0, complete = false;
        const receipts = [], hits = [];
        for (let n = 0; n < 20000; n++) {
          cooldown = Math.max(0, cooldown - dt);
          const targetAltitude = iceHits >= 14 ? shadowEnv.freezingM - 80 : shadowEnv.freezingM + 160;
          const thrust = k.assistControls(state, shadowEnv, { x: state.x, z: state.z, altitudeM: state.altitudeM },
            { x: state.x, z: state.z, altitudeM: targetAltitude }, 0, { enabled: true, paused: false, manual: false }).thrust;
          const iceHit = state.form === 'ice' && iceHits < 14 && cooldown === 0;
          const warmHit = state.form === 'droplet' && iceHits === 14 && warmHits === 0 && cooldown === 0;
          const input = { dt, thrust, sunlit: true, surface: 'water', nucleusHit: state.form === 'vapor' && state.altitudeM >= shadowEnv.lclM, dropletHit: iceHit || warmHit };
          if (input.dropletHit) { hits.push({ form: state.form, elapsed: state.elapsed, cooldown, input: { ...input } }); cooldown = .6; if (iceHit) iceHits++; else warmHits++; }
          const next = original(state, input);
          if (next.form !== state.form) {
            receipts.push({ from: state.form, to: next.form, elapsed: [state.elapsed, next.elapsed], altitudeM: next.altitudeM, mass: next.mass, droplets: next.droplets, input: { ...input } });
            if (state.form === 'ice' && next.form === 'droplet' && iceHits === 14) transitions.shadowThaw = { before: state, after: next, input };
            if (state.form === 'droplet' && next.form === 'cloud' && warmHits === 1) transitions.shadowWarmCloud = { before: state, after: next, input };
            if (state.form === 'cloud' && next.form === 'rain') { transitions.shadowRainRelease = { before: state, after: next, input }; complete = true; state = next; break; }
          }
          state = next;
        }
        if (!complete || !transitions.shadowThaw || !transitions.shadowWarmCloud || iceHits !== 14 || warmHits !== 1) throw Error('Genuine cooldown-respecting heavy-ice warm-cloud fixture did not complete');
        window.shadowMemoryJourney = { declaredStart, scenario: 'temperateCoast', dt, iceHits, warmHits, receipts, hits,
          origin: 'Supported cloud practice at its unchanged LCL+80 altitude; only declared starting X/Z differs. Original assist controls and original kernel stepping generate every form, mass, altitude and elapsed value.' };
      }
      for(const[name,t]of Object.entries(transitions))states['before-'+name]=t.before;
      window.rainCloudDepthStates=states;window.rainCloudDepthTransitions=transitions;window.rainCloudDepthLiveSteps=[];window.rainCloudDepthTotalSteps=0;
      k.step=function(state,input){window.rainCloudDepthTotalSteps++;const drive=window.rainCloudDepthDriveInput;if(drive)window.rainCloudDepthDriveInput=null;const actualInput={...input,...(window.rainCloudDepthSteadyInput||{}),...(drive||{})},next=original(state,actualInput);if(window.cloudEvolutionReleaseProbe&&state.form==='cloud'&&(next.form==='rain'||next.form==='snow'))window.cloudEvolutionReleaseProof=window.cloudEvolutionReleaseProbe(state,next);if(window.snowOnsetSourceProbe&&state.form==='cloud'&&next.form==='snow')window.snowOnsetSourceProof=window.snowOnsetSourceProbe(state,next,actualInput);if(window.rainEmissionSourceProbe&&state.form==='cloud'&&next.form==='rain')window.rainEmissionSourceProof=window.rainEmissionSourceProbe(state,next);if(window.rainCollectionSourceProbe&&state.form==='rain'&&next.form==='liquid')window.rainCollectionSourceProof=window.rainCollectionSourceProbe(state,next);if(drive||next.form!==state.form)rainCloudDepthLiveSteps.push({from:state.form,to:next.form,elapsed:next.elapsed,input:actualInput});return next;};
    }, { rainEmissionFixtureRequested: suite === 'rain-emission' || suite === 'rain-onset', rainCollectionFixtureRequested: suite === 'rain-collection', shadowMemoryFixtureRequested: suite === 'cloud-shadow-memory'||suite==='cloud-source-thinning'||suite==='cloud-shadow-retirement', rainContactFixtureRequested: suite === 'rain-contact-memory'||suite==='rain-landing-motion'||suite==='splash-motion', cloudSnowFixtureRequested: suite === 'cloud-snow-onset'||suite==='snow-melt-preview'||suite==='cloud-source-thinning'||suite==='cloud-shadow-retirement', snowMeltFixtureRequested:suite==='snow-melt-preview',cloudAssemblyFixtureRequested:suite==='cloud-assembly-source'||suite==='cloud-assembly-flow'||suite==='cloud-formation-settle' });
    pass('Condensation, cloud-droplet re-evaporation, ice melting and cloud-to-snow fixtures come from genuine unchanged kernel integration');
    if(suite==='splash-motion'&&enabled('splash-motion'))await require('./watercycle_pilot_splash_motion_checks.cjs').run({page,result,assert,pass,maxDelta,restore,resume,pause,settle,capture});
    if(suite==='rain-landing-motion'&&enabled('rain-landing-motion'))await require('./watercycle_pilot_rain_landing_motion_checks.cjs').run({page,result,assert,pass,maxDelta,restore,resume,pause,settle,capture});
    if(suite==='rain-landing-shower'&&enabled('rain-landing-shower'))await require('./watercycle_pilot_rain_landing_shower_checks.cjs').run({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture});
    if(suite==='refreezing-continuity'&&enabled('refreezing-continuity'))await require('./watercycle_pilot_refreezing_continuity_checks.cjs').run({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-source-thinning'&&enabled('cloud-source-thinning'))await require('./watercycle_pilot_cloud_source_thinning_checks.cjs').run({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture});
    if(suite==='rain-evaporation'&&enabled('rain-evaporation'))await require('./watercycle_pilot_rain_evaporation_checks.cjs').run({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture});
    if(suite==='phase-motion-continuity'&&enabled('phase-motion-continuity'))await require('./watercycle_pilot_phase_motion_continuity_checks.cjs').run({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-shadow-retirement'&&enabled('cloud-shadow-retirement'))await require('./watercycle_pilot_cloud_shadow_retirement_checks.cjs').run({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-interior-density'&&enabled('cloud-interior-density'))await require('./watercycle_pilot_cloud_interior_density_checks.cjs').run({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-immersion'&&enabled('cloud-immersion'))await require('./watercycle_pilot_cloud_immersion_checks.cjs').run({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-formation-settle'&&enabled('cloud-formation-settle'))await require('./watercycle_pilot_cloud_formation_settle_checks.cjs').run({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-assembly-flow'&&enabled('cloud-assembly-flow'))await require('./watercycle_pilot_cloud_assembly_flow_checks.cjs').run({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture});
    if(suite==='cloud-assembly-source'&&enabled('cloud-assembly-source'))await require('./watercycle_pilot_cloud_assembly_source_checks.cjs').run({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture});
    if(suite==='snow-melt-preview'&&enabled('snow-melt-preview')){
      assert.equal(suite,'snow-melt-preview','The bounded melt review uses its isolated suite');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
      await page.evaluate(()=>{
        window.meltPreviewHooked=new WeakSet();window.meltPreviewGPU={};window.meltPreviewDraws={};
        window.addEventListener('error',event=>{window.nativeQAPageError=event.error?.stack||event.message;});
        const original=WaterCyclePilotKernel.step;
        WaterCyclePilotKernel.step=function(state,input){const next=original(state,input);window.meltPreviewLiveState=next;return next;};
        window.meltPreviewSnapshot=()=>{
          const s=pilotReview.scene;s.updateMatrixWorld(true);const group=s.getObjectByName('pilot-melting-snow'),preview=s.getObjectByName('pilot-melt-drop-preview'),incoming=s.getObjectByName('pilot-rain-parcel'),beads=s.getObjectByName('pilot-melt-beads'),crystal=group.children[0];
          const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
          const sample=o=>({name:o.name,visible:o.visible,effective:effective(o),geometry:o.geometry?.uuid,material:o.material?.uuid,position:o.position.toArray(),scale:o.scale.toArray(),quaternion:o.quaternion.toArray(),matrixAutoUpdate:o.matrixAutoUpdate,matrix:o.matrix.toArray(),world:o.matrixWorld.toArray(),depth:{test:o.material?.depthTest,write:o.material?.depthWrite},gpu:window.meltPreviewGPU[o.name]||null,draws:window.meltPreviewDraws[o.name]||0});
          const geometry=new Set(),materials=new Set(),depth=[];s.traverse(o=>{if(o.geometry)geometry.add(o.geometry.uuid);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){if(!materials.has(m.uuid))depth.push({uuid:m.uuid,test:m.depthTest,write:m.depthWrite});materials.add(m.uuid);}});
          const front=crystal.material.userData.frontRadius?.value??crystal.material.userData.meltShader?.uniforms.meltFrontRadius.value;
          return {form:document.querySelector('#wcPilotCanvas').dataset.parcelForm,camera:document.querySelector('#wcPilotCanvas').dataset.pilotCamera,cue:document.querySelector('#wcPilotCanvas').dataset.snowMeltCue,
            elapsed:waterReviewData.pilot.snapshot.elapsed,steps:rainCloudDepthTotalSteps,group:{...sample(group),data:rainCloudDepthClean(group.userData)},preview:sample(preview),incoming:sample(incoming),crystal:sample(crystal),
            beads:{...sample(beads),instances:Array.from(beads.instanceMatrix.array)},front,shared:{geometry:preview.geometry===incoming.geometry,material:preview.material===incoming.material},
            geometry:[...geometry].sort(),materials:[...materials].sort(),depth:depth.sort((a,b)=>a.uuid.localeCompare(b.uuid)),rainShapeTime:incoming.userData.shapeTime};
        };
      });
      const meltDraw=async()=>{
        await page.evaluate(()=>{
          const s=pilotReview.scene,group=s.getObjectByName('pilot-melting-snow');
          for(const o of [s.getObjectByName('pilot-melt-drop-preview'),s.getObjectByName('pilot-rain-parcel'),group.children[0]]){
            if(meltPreviewHooked.has(o))continue;meltPreviewHooked.add(o);const previous=o.onAfterRender;
            o.onAfterRender=function(renderer,scene,camera,geometry,material){
              if(previous)previous.apply(this,arguments);const gl=renderer.getContext(),p=renderer.properties.get(material),program=p.currentProgram||p.program,location=gl.getUniformLocation(program.program,'modelViewMatrix');
              if(!location)throw Error('Drawn melt preview must expose its linked modelViewMatrix');
              const expected=new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,this.matrixWorld).toArray();
              window.meltPreviewGPU[this.name]={geometry:geometry.uuid,material:material.uuid,modelView:Array.from(gl.getUniform(program.program,location)),expected,
                vertex:gl.getShaderSource(program.vertexShader),fragment:gl.getShaderSource(program.fragmentShader)};
              window.meltPreviewDraws[this.name]=(window.meltPreviewDraws[this.name]||0)+1;
            };
          }
        });
        for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});
          await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
      };
      const sampleMelt=()=>page.evaluate(()=>meltPreviewSnapshot());
      const clickMelt=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();};
      const continueMelt=async()=>{if(await page.getByRole('button',{name:'Continue journey',exact:true}).count())await clickMelt('Continue journey');else await resume();};
      const linear=[0,1,2,4,5,6,8,9,10],identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
      const difference=(a,b)=>Math.max(...a.map((v,n)=>Math.abs(v-b[n])));
      const cleanVisual=s=>{const c=structuredClone(s);for(const key of ['group','preview','incoming','crystal','beads']){delete c[key].gpu;delete c[key].draws;}return c;};
      const proofMelt=(state,label)=>{
        const linearError=Math.max(...linear.map(n=>Math.abs(state.preview.world[n]-state.incoming.world[n]))),centerError=Math.max(...[12,13,14].map(n=>Math.abs(state.preview.world[n]-state.group.world[n])));
        assert(state.shared.geometry&&state.shared.material,label+' reuses actual rain geometry and material');
        assert(state.group.visible&&state.group.data.target==='rain'&&state.group.data.sourceSnapshot&&state.group.data.visibleBeadCount===6,label+' retains its actual captured crystal and all six pooled beads');
        assert(linearError<1e-8&&centerError<1e-8,label+' has the actual rain world linear transform at the bounded lens center');
        const g=state.preview.gpu;assert(state.camera==='water'&&state.preview.effective&&state.preview.draws>0&&g&&g.geometry===state.preview.geometry&&g.material===state.preview.material,label+' actually draws its pooled Water preview');
        const uploadError=difference(g.modelView,g.expected);assert(uploadError<.00005,label+' actual model-view uniform matches its full matrix');
        let beadError=0;for(let i=0;i<6;i++){const radius=(state.front-.15)*state.crystal.scale[0],angle=i*Math.PI/3;
          beadError=Math.max(beadError,Math.abs(state.beads.instances[i*16+12]-Math.cos(angle)*radius),Math.abs(state.beads.instances[i*16+13]-.16*state.crystal.scale[0]),Math.abs(state.beads.instances[i*16+14]+Math.sin(angle)*radius));}
        assert(beadError<.000001,label+' keeps beads attached to the retreating crystal arms');
        return {linearError,centerError,uploadError,beadError,previewDraws:state.preview.draws,progress:state.group.data.progress,sourceScale:state.group.data.sourceScale};
      };
      result.snowMeltPreview={journey:await page.evaluate(()=>snowMeltJourney)};
      const r=result.snowMeltPreview;
      await restore('before-snowMeltRain',{cameraMode:'water'});r.before=await sampleMelt();await driveTransition('snowMeltRain');await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await meltDraw();
      r.first=await sampleMelt();await capture('snow-melt-preview-first-water');r.firstProof=proofMelt(r.first,'First paused melt');
      assert.equal(r.first.form,'rain');assert(r.first.group.data.progress>0&&r.first.group.data.progress<.3);assert.equal(r.first.preview.matrixAutoUpdate,false);
      await page.waitForTimeout(180);r.paused=await sampleMelt();assert.deepEqual(cleanVisual(r.paused),cleanVisual(r.first),'Paused preview, crystal, beads and rain shape stay exact');
      await continueMelt();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-melting-snow').userData.progress>=.48);await pause();await meltDraw();
      r.middle=await sampleMelt();await capture('snow-melt-preview-middle-water');r.middleProof=proofMelt(r.middle,'Middle Water melt');
      assert(r.middle.group.data.progress>=.48&&r.middle.group.data.progress<.85);assert(r.middle.front<r.first.front&&r.middle.crystal.scale[0]<r.first.crystal.scale[0]);
      assert.deepEqual(r.middle.geometry,r.first.geometry);assert.deepEqual(r.middle.materials,r.first.materials);
      assert.deepEqual(r.middle.group.data.sourceQuaternion,r.first.group.data.sourceQuaternion);assert.deepEqual(r.middle.group.data.sourceScale,r.first.group.data.sourceScale);
      await clickMelt('Follow view');await meltDraw();r.follow=await sampleMelt();await capture('snow-melt-preview-middle-follow');
      assert(!r.follow.preview.visible&&!r.follow.preview.effective&&r.follow.incoming.effective&&r.follow.group.visible);
      assert(r.follow.incoming.gpu&&r.follow.incoming.gpu.geometry===r.follow.incoming.geometry&&difference(r.follow.incoming.gpu.modelView,r.follow.incoming.gpu.expected)<.00005);
      assert.deepEqual(r.follow.geometry,r.middle.geometry);assert.deepEqual(r.follow.materials,r.middle.materials);assert.equal(r.follow.group.data.progress,r.middle.group.data.progress);
      assert.deepEqual(r.follow.depth,r.before.depth,'Follow restores all exact original material depth flags');
      await clickMelt('Water view');await meltDraw();r.waterAgain=await sampleMelt();r.waterProof=proofMelt(r.waterAgain,'Returned Water melt');
      assert(difference(r.waterAgain.preview.world,r.middle.preview.world)<1e-7);assert.deepEqual(r.waterAgain.beads.instances,r.middle.beads.instances);
      pass('Genuine snow-to-rain first and midpoint previews match the full actual rain world transform, native uploaded model-view matrices and original pooled resources');
      pass('Captured crystal orientation, shrinking arms and attached beads survive exact pause and supported Water/Follow/Water view changes');
      await resume();await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-melting-snow').visible);await pause();await meltDraw();r.expired=await sampleMelt();
      assert(!r.expired.group.visible&&!r.expired.preview.visible&&r.expired.preview.matrixAutoUpdate&&difference(r.expired.preview.matrix,identity)===0&&r.expired.cue==='hidden');
      assert.deepEqual(r.expired.depth,r.before.depth,'Melt expiry restores all original material depth flags');
      await page.emulateMedia({reducedMotion:'reduce'});await trigger('snowMeltRain',{cameraMode:'water'});await meltDraw();r.reduced=await sampleMelt();r.reducedProof=proofMelt(r.reduced,'Reduced melt');assert.equal(r.reduced.group.data.progress,.48);
      await continueMelt();await page.waitForFunction(steps=>rainCloudDepthTotalSteps>steps+5,r.reduced.steps);await pause();await meltDraw();r.reducedLater=await sampleMelt();r.reducedLaterProof=proofMelt(r.reducedLater,'Held reduced melt');
      assert(r.reducedLater.steps>r.reduced.steps&&r.reducedLater.group.data.progress===.48);assert.deepEqual(r.reducedLater.preview.matrix,r.reduced.preview.matrix);assert.deepEqual(r.reducedLater.beads.instances,r.reduced.beads.instances);assert.equal(r.reducedLater.rainShapeTime,r.reduced.rainShapeTime);
      await clickMelt('Reset this run and start again as liquid water');await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');await pause();r.reset=await sampleMelt();
      assert(!r.reset.group.visible&&!r.reset.preview.visible&&r.reset.preview.matrixAutoUpdate&&difference(r.reset.preview.matrix,identity)===0);
      await restore('snowMeltRestoredRain',{cameraMode:'water',pauseAtChanges:false});await meltDraw();r.restored=await sampleMelt();
      assert(r.restored.form==='rain'&&!r.restored.group.visible&&!r.restored.preview.visible&&r.restored.preview.matrixAutoUpdate&&difference(r.restored.preview.matrix,identity)===0);
      r.evidence={first:r.firstProof,middle:r.middleProof,waterAgain:r.waterProof,reduced:r.reducedProof,reducedLater:r.reducedLaterProof,
        normalProgress:[r.first.group.data.progress,r.middle.group.data.progress],reducedProgress:[r.reduced.group.data.progress,r.reducedLater.group.data.progress],reducedSteps:[r.reduced.steps,r.reducedLater.steps],
        framing:'Three production-camera native captures use a declared fixed520px canvas height. No phase, mass, altitude, source pose, preview opacity or physical model parameter is changed for imagery.',nativeScope:r.journey.scope,
        limits:'The existing liquid-target branch is preserved and covered by source-bound CPU checks; this native suite concentrates on the genuine falling-snow-to-rain branch.'};
      pass('Reduced motion holds its representative preview and beads while real kernel steps advance; expiry, active reset and restored rain clear the lens matrix and automatic-update override');
      assert(result.captures.length===3&&result.captures.every(n=>n.startsWith('snow-melt-preview-')),'The requested isolated melt section executes all three native captures');
    }
    if(enabled('cloud-snow-onset')){
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
      await page.evaluate(()=>{
        window.snowOnsetDraws=0;window.snowOnsetGPU=null;window.snowOnsetHooked=new WeakSet();
        window.addEventListener('error',event=>{window.nativeQAPageError=event.error?.stack||event.message;});
        window.snowOnsetSourceProbe=(before,after,input)=>{
          const cloud=pilotReview.scene.getObjectByName('pilot-self-cloud');cloud.updateWorldMatrix(true,false);
          return {from:before.form,to:after.form,elapsed:[before.elapsed,after.elapsed],input:{...input},position:cloud.getWorldPosition(new THREE.Vector3()).toArray()};
        };
        const previous=WaterCyclePilotKernel.step;
        WaterCyclePilotKernel.step=function(state,input){const next=previous(state,input);window.snowOnsetLiveState=next;return next;};
        window.snowOnsetSnapshot=()=>{
          const s=pilotReview.scene;s.updateMatrixWorld(true);const f=s.getObjectByName('pilot-snow-field'),alpha=f.geometry.attributes.snowAlpha,positions=f.geometry.attributes.position;
          const cloud=s.getObjectByName('pilot-phase-cloud-memory'),phase=s.getObjectByName('pilot-phase-handoff'),primary=s.getObjectByName('pilot-snow-parcel'),preview=s.getObjectByName('pilot-phase-incoming-snow');
          const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;},world=[],point=new THREE.Vector3(),geometry=new Set(),materials=new Set();
          for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(f.matrixWorld);world.push(...point.toArray());}
          s.traverse(o=>{if(o.geometry)geometry.add(o.geometry.uuid);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])materials.add(m.uuid);});
          const pool=window.snowOnsetPool;
          return {form:document.querySelector('#wcPilotCanvas').dataset.parcelForm,camera:document.querySelector('#wcPilotCanvas').dataset.pilotCamera,
            elapsed:snowOnsetLiveState.elapsed,steps:rainCloudDepthTotalSteps,emission:{...f.userData.emission},source:window.snowOnsetSourceProof||null,
            field:{visible:f.visible,effective:effective(f),position:f.position.toArray(),local:Array.from(positions.array),world,alpha:Array.from(alpha.array),count:positions.count,
              geometry:f.geometry.uuid,material:f.material.uuid,alphaCount:alpha.count,alphaItemSize:alpha.itemSize,draws:snowOnsetDraws,gpu:window.snowOnsetGPU,
              pooled:!!pool&&pool.geometry===f.geometry&&pool.material===f.material&&pool.positions===positions.array&&pool.alpha===alpha.array},
            primary:{visible:primary.visible,effective:effective(primary)},preview:{visible:preview.visible,effective:effective(preview)},
            phase:{visible:phase.visible,kind:phase.userData.kind,progress:phase.userData.progress},memoryVisible:cloud.visible,
            geometry:[...geometry].sort(),materials:[...materials].sort()};
        };
      });
      const snowDraw=async()=>{
        await page.evaluate(()=>{
          const f=pilotReview.scene.getObjectByName('pilot-snow-field');if(snowOnsetHooked.has(f))return;snowOnsetHooked.add(f);
          const a=f.geometry.attributes;window.snowOnsetPool={geometry:f.geometry,material:f.material,positions:a.position.array,alpha:a.snowAlpha.array};
          const previous=f.onAfterRender;f.onAfterRender=function(renderer,scene,camera,geometry,material){
            if(previous)previous.apply(this,arguments);const gl=renderer.getContext(),p=renderer.properties.get(material),program=p.currentProgram||p.program;
            const location=gl.getAttribLocation(program.program,'snowAlpha'),old=gl.getParameter(gl.ARRAY_BUFFER_BINDING),buffer=location>=0?gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING):null;
            if(!buffer||!gl.getBufferSubData)throw Error('Native snow alpha must be read from its actual WebGL2 attribute buffer');
            const offset=gl.getVertexAttribOffset(location,gl.VERTEX_ATTRIB_ARRAY_POINTER),stride=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_STRIDE),size=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_SIZE);
            if(offset!==0||stride!==0||size!==1)throw Error('Expected the production standalone scalar snowAlpha buffer');
            const values=new Float32Array(geometry.attributes.snowAlpha.count);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
            try{gl.getBufferSubData(gl.ARRAY_BUFFER,offset,values);}finally{gl.bindBuffer(gl.ARRAY_BUFFER,old);}
            const opacityLocation=gl.getUniformLocation(program.program,'opacity');
            window.snowOnsetGPU={location,offset,stride,size,alpha:Array.from(values),opacity:gl.getUniform(program.program,opacityLocation),expectedOpacity:material.opacity,
              vertex:gl.getShaderSource(program.vertexShader),fragment:gl.getShaderSource(program.fragmentShader)};window.snowOnsetDraws++;
          };
        });
        for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});
          await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
      };
      const snowSample=()=>page.evaluate(()=>snowOnsetSnapshot());
      const clickSnow=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();};
      const continueSnow=async()=>{const button=page.getByRole('button',{name:'Continue journey',exact:true});if(await button.count())await clickSnow('Continue journey');else await resume();};
      const validateSnow=(state,label)=>{
        const f=state.field,e=state.emission;assert(f.visible&&f.effective&&f.count===76&&f.alphaCount===76&&f.alphaItemSize===1&&f.pooled,label+' keeps its existing pooled field');
        assert(f.local.every(Number.isFinite)&&f.world.every(Number.isFinite)&&f.alpha.every(a=>Number.isFinite(a)&&a>=0&&a<=1));
        assert(f.gpu&&f.gpu.location>=0&&f.draws>0&&f.gpu.vertex.includes('snowAlpha')&&f.gpu.fragment.includes('vSnowVisibility'));
        assert.deepEqual(f.gpu.alpha,f.alpha,label+' actual uploaded alpha buffer matches CPU source');assert(Math.abs(f.gpu.opacity-f.gpu.expectedOpacity)<1e-6);
        let visible=0,ceilingError=0,frontError=0;
        for(let i=0;i<f.count;i++)if(f.alpha[i]>1e-7){visible++;if(e.active){const y=f.world[i*3+1],front=e.ceilingY-e.originY-(9+(i%7)*1.3)*e.age;
          ceilingError=Math.max(ceilingError,y-e.ceilingY);frontError=Math.max(frontError,front-f.local[i*3+1]);}}
        assert(ceilingError<.00005&&frontError<.00005,label+' visible flakes obey source ceiling and falling birth front');
        return {visible,ceilingError,frontError,uploadedCount:f.gpu.alpha.length,draws:f.draws};
      };
      const clearSnow=state=>{assert(!state.emission.active&&state.emission.age===0&&state.emission.ceilingY===0&&state.emission.originY===0&&state.emission.startedAt===0);assert(!state.field.visible);};
      result.cloudSnowOnset={journey:await page.evaluate(()=>cloudSnowJourney)};
      await trigger('cloudSnowRelease',{cameraMode:'follow'});await snowDraw();
      const first=await snowSample();result.cloudSnowOnset.first=first;await capture('cloud-snow-onset-first-pause');
      result.cloudSnowOnset.firstProof=validateSnow(first,'First paused snow release');
      assert.equal(first.emission.age,0);assert(first.field.alpha.every(a=>a===0)&&first.primary.effective&&first.memoryVisible);
      assert(first.source&&first.source.from==='cloud'&&first.source.to==='snow'&&first.emission.ceilingY===first.source.position[1]);
      await page.waitForTimeout(180);const paused=await snowSample();result.cloudSnowOnset.paused=paused;
      const visual=state=>{const copy=structuredClone(state);delete copy.field.draws;return copy;};assert.deepEqual(visual(paused),visual(first));
      await continueSnow();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-snow-field').userData.emission.age>=.7&&pilotReview.scene.getObjectByName('pilot-snow-field').geometry.attributes.snowAlpha.array.some(a=>a>1e-7));await pause();await snowDraw();
      const growing=await snowSample();result.cloudSnowOnset.growing=growing;await capture('cloud-snow-onset-growing-follow');
      result.cloudSnowOnset.growingProof=validateSnow(growing,'Growing source-born snow curtain');assert(growing.emission.age>=.7&&growing.emission.age<1.9&&result.cloudSnowOnset.growingProof.visible>0);
      assert.deepEqual(growing.geometry,first.geometry);assert.deepEqual(growing.materials,first.materials);assert.equal(growing.emission.ceilingY,first.emission.ceilingY);
      await clickSnow('Water view');await snowDraw();const water=await snowSample();result.cloudSnowOnset.water=water;validateSnow(water,'Water view curtain');
      assert.equal(water.emission.age,growing.emission.age);assert.deepEqual(water.field.local,growing.field.local);assert.deepEqual(water.field.alpha,growing.field.alpha);
      await resume();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-snow-field').userData.emission.age>=2);await pause();await snowDraw();
      const developed=await snowSample();result.cloudSnowOnset.developed=developed;await capture('cloud-snow-onset-water');result.cloudSnowOnset.developedProof=validateSnow(developed,'Developed Water-view curtain');
      assert(developed.emission.age>=2&&developed.emission.age<2.8&&result.cloudSnowOnset.developedProof.visible>0);
      assert(developed.emission.active&&developed.emission.ceilingY===first.emission.ceilingY&&!developed.phase.visible);
      await clickSnow('Follow view');await snowDraw();const follow=await snowSample();result.cloudSnowOnset.follow=follow;validateSnow(follow,'Follow after source-memory expiry');
      assert.equal(follow.emission.age,developed.emission.age);assert.deepEqual(follow.field.local,developed.field.local);assert.deepEqual(follow.field.alpha,developed.field.alpha);
      pass('Genuine cooldown-respecting cold cloud releases an empty first snow field with a visible tagged crystal; its real fixed shelf and speed-dependent front reveal only born flakes');
      pass('Actual native snow-alpha attribute readbacks, linked visibility shader, paused state, both cameras and stable geometry/material pools verify growing curtains through source-memory expiry');
      await page.emulateMedia({reducedMotion:'reduce'});await trigger('cloudSnowRelease',{cameraMode:'water'});await snowDraw();
      const reduced=await snowSample();result.cloudSnowOnset.reduced=reduced;validateSnow(reduced,'Reduced representative snow curtain');assert.equal(reduced.emission.age,2);assert(reduced.preview.effective);
      await continueSnow();await page.waitForFunction(steps=>rainCloudDepthTotalSteps>steps+5,reduced.steps);await pause();await snowDraw();
      const later=await snowSample();result.cloudSnowOnset.reducedLater=later;validateSnow(later,'Held reduced snow curtain');assert(later.steps>reduced.steps&&later.emission.age===2);assert.deepEqual(later.field.local,reduced.field.local);
      await clickSnow('Reset this run and start again as liquid water');await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');await pause();
      const reset=await snowSample();result.cloudSnowOnset.reset=reset;clearSnow(reset);
      await restore('cloudSnowRestored',{cameraMode:'follow',pauseAtChanges:false});await snowDraw();const restored=await snowSample();result.cloudSnowOnset.restored=restored;validateSnow(restored,'Restored representative snow field');
      assert(!restored.emission.active&&restored.emission.age===0&&restored.field.alpha.some(a=>a>0));
      result.cloudSnowOnset.evidence={first:result.cloudSnowOnset.firstProof,growing:result.cloudSnowOnset.growingProof,developed:result.cloudSnowOnset.developedProof,
        sourceCeiling:first.emission.ceilingY,normalAges:[first.emission.age,growing.emission.age,developed.emission.age],reducedAge:2,reducedSteps:[reduced.steps,later.steps],
        nativeScope:result.cloudSnowOnset.journey.scope,framing:'Three production-camera Follow/Water captures use the same fixed520px canvas height. No source/phase/mass or opacity is changed for imagery.'};
      pass('Reduced motion holds its representative snow age while real model steps advance; active reset clears the emitter and restored snow invents no source cloud');
    }
    if (enabled('rain-contact-memory')) {
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
      await page.evaluate(() => {
        window.contactNativeDraws=0;
        window.contactNativeSample=()=>{
          const scene=pilotReview.scene;scene.updateMatrixWorld(true);
          const impacts=scene.getObjectByName('pilot-rain-water-impacts'),field=scene.getObjectByName('pilot-rain-field'),ribbons=scene.getObjectByName('pilot-rain-ribbons');
          const parcel=scene.getObjectByName('pilot-water-parcel'),ocean=scene.getObjectByName('pilot-ocean-surface'),m=impacts.userData.contacts;
          const p=impacts.geometry.attributes.position,a=impacts.geometry.attributes.rainAlpha,point=new THREE.Vector3(),world=[],rings=[],ray=new THREE.Raycaster(),live=window.contactLiveState||waterReviewData.pilot.snapshot;
          for(let v=0;v<p.count;v++){point.fromBufferAttribute(p,v).applyMatrix4(impacts.matrixWorld);world.push(point.x,point.y,point.z);}
          for(let rf=0;rf<84;rf++){
            if(!m.active[rf])continue;
            const starts=[],receiver=[];
            for(let seg=0;seg<14;seg++){
              const v=(rf*29+seg)*2;if(a.getX(v)<=0)continue;
              const x=world[v*3],y=world[v*3+1],z=world[v*3+2];starts.push([x,y,z]);
              if(seg%4===0){ray.set(new THREE.Vector3(x,1000,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(ocean,false)[0];if(hit)receiver.push({x,y,z,receiverY:hit.point.y,gap:y-hit.point.y});}
            }
            const center=starts.length?starts.reduce((s,p)=>[s[0]+p[0]/starts.length,s[1]+p[2]/starts.length],[0,0]):null;
            const responses=[];for(let seg=14;seg<29;seg++)for(let end=0;end<2;end++){const v=(rf*29+seg)*2+end;if(a.getX(v)>0)responses.push({segment:seg,alpha:a.getX(v),world:world.slice(v*3,v*3+3)});}
            rings.push({index:rf,age:m.age[rf],bornTime:m.bornTime[rf],cycle:m.cycle[rf],memory:[m.worldXZ[rf*2],m.worldXZ[rf*2+1]],center,starts,receiver,responses});
          }
          const properties=pilotReview.renderer.properties.get(impacts.material),program=properties.currentProgram||properties.program;
          return {form:live.form,elapsed:live.elapsed,steps:rainCloudDepthTotalSteps,paused:waterReviewData.pilot.paused,
            time:ocean.userData.surfaceShader.uniforms.pilotRippleTime.value,camera:document.querySelector('#wcPilotCanvas').dataset.pilotCamera,parcel:parcel.position.toArray(),anchor:impacts.position.toArray(),
            memory:{model:m.model,duration:m.duration,worldXZ:Array.from(m.worldXZ),bornTime:Array.from(m.bornTime),cycle:Array.from(m.cycle),lastClock:Array.from(m.lastClock),age:Array.from(m.age),active:Array.from(m.active),captures:m.captures,
              typed:m.worldXZ instanceof Float64Array&&m.bornTime instanceof Float64Array&&m.cycle instanceof Float64Array&&m.age instanceof Float64Array&&m.lastClock instanceof Float64Array&&m.active instanceof Uint8Array},
            geometry:[field.geometry.uuid,ribbons.geometry.uuid,impacts.geometry.uuid],materials:[field.material.uuid,ribbons.material.uuid,impacts.material.uuid],rings,
            impacts:{visible:impacts.visible,opacity:impacts.material.opacity,world,alpha:Array.from(a.array),tailActive:!!impacts.userData.tailActive,tailAge:impacts.userData.tailAge,
              linked:!!program?.program,draws:window.contactNativeDraws},
            overview:window.reviewCameraOverride?{matrix:window.reviewCameraOverride.matrixWorld.toArray(),projection:window.reviewCameraOverride.projectionMatrix.toArray(),...window.contactOverview}:null};
        };
        const previous=WaterCyclePilotKernel.step;
        WaterCyclePilotKernel.step=function(state,input){window.contactLiveState=state;const next=previous(state,input);if(state.form==='rain'&&next.form==='liquid')window.contactCollectionProof={input:{...input},before:state,after:next,scene:contactNativeSample()};window.contactLiveState=next;return next;};
      });
      const contactSample=()=>page.evaluate(()=>contactNativeSample());
      const contactDraw=async()=>{
        await page.evaluate(()=>{const o=pilotReview.scene.getObjectByName('pilot-rain-water-impacts');if(!o.userData.contactQAAfterRender){const previous=o.onAfterRender;o.onAfterRender=function(){if(previous)previous.apply(this,arguments);window.contactNativeDraws++;};o.userData.contactQAAfterRender=true;}});
        for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
      };
      const contactAdvance=async(delta,steer=false)=>{
        if(steer){await canvas.focus();await page.evaluate(()=>{window.contactSteeringKeys=[];document.querySelector('#wcPilotCanvas').addEventListener('keydown',e=>{window.contactSteeringKeys.push({key:e.key,target:e.target.id,trusted:e.isTrusted,defaultPrevented:e.defaultPrevented,paused:waterReviewData.pilot.paused,elapsed:window.contactLiveState.elapsed});},{once:true});});}
        try{
          await page.evaluate(delta=>{
            const target=window.contactLiveState.elapsed+delta;
            const stop=()=>{if(window.contactLiveState.elapsed>=target){if(!waterReviewData.pilot.paused)document.querySelector('[data-control="pause"]').click();window.contactAdvanceDone=true;}else requestAnimationFrame(stop);};
            window.contactAdvanceDone=false;
            const notice=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Continue journey');
            (notice||document.querySelector('[data-control="pause"]')).click();requestAnimationFrame(stop);
          },delta);
          if(steer)await page.keyboard.down('ArrowRight');
          await page.waitForFunction(()=>window.contactAdvanceDone&&waterReviewData.pilot.paused,{},{timeout:30000});await settle();
        }finally{if(steer)await page.keyboard.up('ArrowRight');}
        await contactDraw();
      };
      const contactValidate=(state,label)=>{
        assert(state.memory.typed&&state.memory.model==='world-anchored-water-contacts'&&state.memory.duration===.48,label+' exposes pooled Float64 contact memory');
        assert(state.rings.length>0&&state.impacts.visible&&state.impacts.linked&&state.impacts.draws>0,label+' actually draws receiving-water contacts');
        let centerError=0,receiverError=0,responseSamples=0;
        for(const ring of state.rings){assert(ring.age>=0&&ring.age<.48);assert(ring.starts.length===14&&ring.center&&ring.receiver.length>0);centerError=Math.max(centerError,maxDelta(ring.center,ring.memory));
          assert(Math.abs(ring.age-(state.time-ring.bornTime))<1e-9);for(const r of ring.receiver)receiverError=Math.max(receiverError,Math.abs(r.gap-.075));
          for(const r of ring.responses){responseSamples++;assert(Math.hypot(r.world[0]-ring.memory[0],r.world[2]-ring.memory[1])<2.2);}
        }
        assert(centerError<.00005&&receiverError<.00005,label+' ring centers stay at memory and endpoints follow actual ocean triangles');
        return {active:state.rings.length,centerError,receiverError,responseSamples};
      };
      const contactCompare=(before,after,label,{frozen=false}={})=>{
        const pairs=after.rings.map(r=>({a:before.rings.find(a=>a.index===r.index&&a.cycle===r.cycle&&a.bornTime===r.bornTime),b:r})).filter(p=>p.a);
        assert(pairs.length>0,label+' retains at least one actual same-cycle contact');
        let maximumAgeDelta=0;
        for(const {a,b}of pairs){assert.deepEqual(b.memory,a.memory);assert.equal(b.bornTime,a.bornTime);maximumAgeDelta=Math.max(maximumAgeDelta,Math.abs(b.age-a.age));if(frozen)assert.equal(b.age,a.age);else assert(b.age>a.age);}
        assert.deepEqual(after.geometry,before.geometry);assert.deepEqual(after.materials,before.materials);
        return {retained:pairs.length,maximumAgeDelta,exactWorldXZ:true,exactBirthTime:true};
      };
      const contactClear=state=>{assert(state.memory.active.every(v=>v===0)&&state.memory.worldXZ.every(v=>v===0)&&state.memory.age.every(v=>v===0)&&state.memory.captures===0&&state.memory.bornTime.every(Number.isNaN)&&state.memory.cycle.every(Number.isNaN)&&state.memory.lastClock.every(Number.isNaN));};
      result.rainContactMemory={journey:await page.evaluate(()=>rainContactJourney)};
      await restore('rainContactStart',{cameraMode:'follow',pauseAtChanges:true});await contactDraw();
      await page.evaluate(()=>{
        const state=contactNativeSample(),fresh=state.rings.filter(r=>r.age<.20&&r.center);if(!fresh.length)throw Error('Native checkpoint needs a fresh visible water contact');
        const chosen=fresh.find(r=>r.responses.length>0)||fresh[0],target=new THREE.Vector3(chosen.memory[0],0,chosen.memory[1]),camera=pilotReview.camera.clone();camera.fov=42;camera.position.copy(target).add(new THREE.Vector3(0,32,30));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
        window.reviewCameraOverride=camera;window.contactOverview={target:target.toArray(),label:'QA-only fixed ocean receiver overview; source and simulation unchanged'};
      });
      await contactDraw();const before=await contactSample();result.rainContactMemory.before=before;await capture('rain-contact-memory-before-steering');result.rainContactMemory.beforeProof=contactValidate(before,'Before native steering');
      await contactAdvance(.12,true);const after=await contactSample();result.rainContactMemory.after=after;await capture('rain-contact-memory-after-steering');result.rainContactMemory.afterProof=contactValidate(after,'After genuine steering/descent');
      assert(result.rainContactMemory.beforeProof.responseSamples+result.rainContactMemory.afterProof.responseSamples>0,'Native checkpoints include actual crown/rebound segments');result.rainContactMemory.navigation=await page.evaluate(()=>({keys:window.contactSteeringKeys,movementStyle:document.querySelector('#wcPilotCanvas').dataset.pilotMovementStyle}));assert(result.rainContactMemory.navigation.keys.some(k=>k.key==='ArrowRight'&&k.target==='wcPilotCanvas'&&k.trusted&&k.defaultPrevented&&!k.paused),'Actual focused native keydown is consumed by the canvas');result.rainContactMemory.retainedProof=contactCompare(before,after,'Steering/descent');assert(Math.abs(after.parcel[2]-before.parcel[2])>.1&&after.parcel[1]<before.parcel[1],'Real steering adds non-wind Z motion while the parcel descends');assert.deepEqual(after.overview,before.overview);
      await page.waitForTimeout(180);const paused=await contactSample();result.rainContactMemory.paused=paused;const frozenContact=state=>{const copy=structuredClone(state);delete copy.impacts.draws;return copy;};assert.deepEqual(frozenContact(paused),frozenContact(after));
      const contactClick=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();await contactDraw();};
      await contactClick('Water view');const water=await contactSample();result.rainContactMemory.water=water;contactCompare(after,water,'Paused Water view',{frozen:true});contactValidate(water,'Water view');
      await contactClick('Follow view');const follow=await contactSample();result.rainContactMemory.follow=follow;contactCompare(after,follow,'Paused Follow view',{frozen:true});contactValidate(follow,'Follow view');
      pass('Actual rain descent and keyboard steering preserve same-cycle world contact centers and birth times while rings expand on current receiving-water triangles');
      pass('Two source-bound fixed-overview frames, exact pause, both cameras, native drawn material and stable pooled geometry verify contact continuity');
      await resume();await page.waitForFunction(()=>waterReviewData.pilot.snapshot.form==='liquid'&&waterReviewData.pilot.paused,{},{timeout:60000});await settle();await contactDraw();
      const landed=await contactSample(),collection=await page.evaluate(()=>contactCollectionProof);result.rainContactMemory.landed=landed;result.rainContactMemory.collection=collection;contactClear(landed);
      assert(collection&&collection.before.form==='rain'&&collection.after.form==='liquid'&&landed.impacts.tailActive&&landed.impacts.visible);
      let tailXZError=0,tailVertices=0;for(let rf=0;rf<84;rf++)for(let seg=0;seg<29;seg++)for(let end=0;end<2;end++){const v=(rf*29+seg)*2+end;if(seg>=14){assert.equal(landed.impacts.alpha[v],0);continue;}if(landed.impacts.alpha[v]<=0)continue;tailVertices++;tailXZError=Math.max(tailXZError,Math.abs(landed.impacts.world[v*3]-collection.scene.impacts.world[v*3]),Math.abs(landed.impacts.world[v*3+2]-collection.scene.impacts.world[v*3+2]));}
      assert(tailVertices>0&&tailXZError<.00005);result.rainContactMemory.tailProof={tailVertices,tailXZError};
      await contactAdvance(.46);const expired=await contactSample();result.rainContactMemory.expired=expired;contactClear(expired);assert(!expired.impacts.tailActive&&!expired.impacts.visible);
      pass('Genuine kernel rain collection clears live contact memory while retaining exact outgoing ring XZ in the short existing landing tail, then expires');
      await page.emulateMedia({reducedMotion:'reduce'});await restore('rainContactStart',{cameraMode:'follow',pauseAtChanges:false});await contactDraw();const reduced=await contactSample();result.rainContactMemory.reduced=reduced;contactValidate(reduced,'Reduced contact frame');
      await contactAdvance(.14);const reducedLater=await contactSample();result.rainContactMemory.reducedLater=reducedLater;result.rainContactMemory.reducedProof=contactCompare(reduced,reducedLater,'Reduced real descent',{frozen:true});assert(reducedLater.steps>reduced.steps&&reducedLater.time===reduced.time);contactValidate(reducedLater,'Held reduced contacts');
      await page.getByRole('button',{name:'Reset this run and start again as liquid water',exact:true}).evaluate(button=>button.click());await page.waitForFunction(()=>waterReviewData.pilot.snapshot.form==='liquid');await pause();await contactDraw();const reset=await contactSample();result.rainContactMemory.reset=reset;contactClear(reset);assert(!reset.impacts.visible&&!reset.impacts.tailActive);
      await restore('cloud',{cameraMode:'follow'});await contactDraw();const restored=await contactSample();result.rainContactMemory.restored=restored;contactClear(restored);assert(!restored.impacts.visible&&!restored.impacts.tailActive);
      pass('Reduced motion holds contact age and position while real model steps advance; active reset and non-rain checkpoint restore clear the complete memory and tail');
      result.rainContactMemory.evidence={...result.rainContactMemory.retainedProof,before:result.rainContactMemory.beforeProof,after:result.rainContactMemory.afterProof,tail:result.rainContactMemory.tailProof,reduced:result.rainContactMemory.reducedProof,
        parcelBefore:before.parcel,parcelAfter:after.parcel,navigation:result.rainContactMemory.navigation,pauseExact:true,cameraModes:['follow','water','follow'],samePool:true,nativeScope:result.rainContactMemory.journey.scope,
        framing:'Both PNGs use the same camera world/projection matrices and a fixed520px QA canvas height. They are qualitative views of actual native receiver geometry; numeric contact centers and receiver ray intersections establish anchoring.'};
    }
    if (enabled('cloud-shadow-memory')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        window.shadowReads = []; window.shadowHooked = new WeakSet();
        window.cloudShadowSnapshot = () => {
          const s = pilotReview.scene; s.updateMatrixWorld(true); const sh = s.getObjectByName('pilot-cloud-shadow'), m = sh.userData.sourceMemory;
          const live = s.getObjectByName('pilot-self-cloud'), ghost = s.getObjectByName('pilot-phase-cloud-memory'), exit = s.getObjectByName('pilot-cloud-interior').userData.exit;
          const phase = s.getObjectByName('pilot-phase-handoff'), geometry = new Set(), materials = new Set(), receivers = [];
          s.traverse(o => { if (o.geometry) geometry.add(o.geometry.uuid); for (const mat of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {
            materials.add(mat.uuid); const u = mat.userData.cloudShadow;
            if (u) receivers.push({ name: o.name, material: mat.uuid, shared: u.opacity === sh.userData.opacity && u.source.value === sh.userData.sourcePosition && u.footprint.value === sh.userData.footprint });
          } });
          const lobes = g => g.children.map(o => ({ position: o.position.toArray(), scale: o.scale.toArray(), density: o.material.userData.cloudLighting.density.value,
            geometry: o.geometry?.uuid, material: o.material.uuid, map: o.material.map?.uuid, normal: o.material.pilotBillowNormalMap?.uuid }));
          return { form: waterReviewData.pilot.snapshot.form, elapsed: waterReviewData.pilot.snapshot.elapsed, mass: waterReviewData.pilot.snapshot.mass, steps: rainCloudDepthTotalSteps,
            camera: document.querySelector('#wcPilotCanvas').dataset.pilotCamera, visible: sh.visible, sourceForm: sh.userData.sourceForm,
            opacity: sh.userData.opacity.value, source: sh.userData.sourcePosition.toArray(), footprint: sh.userData.footprint.toArray(), sun: sh.userData.sunDirection.toArray(),
            memory: { active: m.active, opacity: m.opacity, source: m.source.toArray(), footprint: m.footprint.toArray(), copiedVectors: m.source !== sh.userData.sourcePosition && m.footprint !== sh.userData.footprint },
            coverage: exit.coverage, exitActive: exit.active, assemblyProgress: live.userData.assemblyProgress, live: lobes(live), ghost: lobes(ghost),
            phase: { visible: phase.visible, kind: phase.userData.kind, progress: phase.userData.progress },
            geometryIds: [...geometry].sort(), materialIds: [...materials].sort(), receivers, reads: shadowReads.slice(),
            overview: window.reviewCameraOverride ? { matrix: window.reviewCameraOverride.matrixWorld.toArray(), projection: window.reviewCameraOverride.projectionMatrix.toArray(), ...window.shadowOverview } : null };
        };
        const previous = WaterCyclePilotKernel.step;
        WaterCyclePilotKernel.step = function(state, input) {
          const next = previous(state, input);
          if (state.form === 'cloud' && (next.form === 'rain' || next.form === 'snow')) window.shadowReleaseProof = { from: state.form, to: next.form, elapsed: [state.elapsed, next.elapsed], input: { ...input }, snapshot: cloudShadowSnapshot() };
          return next;
        };
      });
      const shadowDraw = async () => {
        await page.evaluate(() => {
          pilotReview.scene.traverse(o => { if (!o.material?.userData.cloudShadow || shadowHooked.has(o)) return; shadowHooked.add(o); const previous = o.onAfterRender;
            o.onAfterRender = function(renderer, scene, camera, geometry, material) {
              if (previous) previous.apply(this, arguments); const u = material.userData.cloudShadow, p = renderer.properties.get(material), program = p.currentProgram || p.program, gl = renderer.getContext();
              const read = name => { const location = program?.program ? gl.getUniformLocation(program.program, name) : null; if (location === null) return null; const v = gl.getUniform(program.program, location); return ArrayBuffer.isView(v) ? Array.from(v) : v; };
              shadowReads.push({ receiver: this.name, material: material.uuid, opacity: read('pilotCloudShadowOpacity'), source: read('pilotCloudShadowSource'), footprint: read('pilotCloudShadowFootprint'),
                expectedOpacity: u.opacity.value, expectedSource: u.source.value.toArray(), expectedFootprint: u.footprint.value.toArray() });
            };
          });
        });
        for (let n = 0; n < 2; n++) { const before = await page.evaluate(() => { shadowReads = []; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
          await page.waitForFunction(before => window.reviewRenderCount > before, before, { timeout: 90000 }); await page.evaluate(() => { window.reviewRenderActive = false; }); }
      };
      const shadowSample = () => page.evaluate(() => ({ ...cloudShadowSnapshot(), proof: window.shadowReleaseProof || null }));
      const clickShadow = async name => { const a = { name, before: await shadowSample() }; (result.shadowActions ||= []).push(a); await page.getByRole('button', { name, exact: true }).evaluate(button => button.click()); a.after = await shadowSample(); };
      const continueShadow = async () => { const button = page.getByRole('button', { name: 'Continue journey', exact: true }); if (await button.count()) await clickShadow('Continue journey'); else if (await page.evaluate(() => waterReviewData.pilot.paused)) await resume(); };
      const setOverview = () => page.evaluate(() => {
        const s = pilotReview.scene; s.updateMatrixWorld(true); const sh = s.getObjectByName('pilot-cloud-shadow'), source = sh.userData.sourcePosition, sun = sh.userData.sunDirection;
        const travel = Math.min(Math.max(0, source.y) / Math.max(.18, sun.y), 560), target = new THREE.Vector3(source.x - sun.x * travel, 0, source.z - sun.z * travel);
        const ocean = s.getObjectByName('pilot-ocean-surface'), ray = new THREE.Raycaster(new THREE.Vector3(target.x, 1000, target.z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(ocean, false)[0]; if (!hit) throw Error('The declared source footprint must target an actual ocean receiver'); target.y = hit.point.y;
        const camera = pilotReview.camera.clone(); camera.fov = 22; camera.position.set(target.x - 65, target.y + 350, target.z + 200); camera.lookAt(target.x - 65, target.y, target.z); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
        window.reviewCameraOverride = camera; window.shadowOverview = { label: 'QA-only fixed receiving-ocean overview; source and simulation unchanged', target: target.toArray(), receiver: ocean.name, travel };
      });
      const uploads = state => {
        assert(state.receivers.length === 12 && state.receivers.every(r => r.shared)); assert(state.reads.length > 0, 'At least one actual receiver is drawn');
        for (const read of state.reads) { assert(read.opacity !== null && Math.abs(read.opacity - read.expectedOpacity) < 1e-7); assert(read.source && maxDelta(read.source, read.expectedSource) < .0001); assert(read.footprint && maxDelta(read.footprint, read.expectedFootprint) < .0001); }
        return { samples: state.reads.length, receivers: [...new Set(state.reads.map(r => r.receiver))] };
      };
      const validateMemory = (state, label) => {
        assert(state.memory.active && state.memory.copiedVectors && state.sourceForm === 'cloud-memory'); const source = state.proof.snapshot;
        const sourceError = maxDelta(state.source, source.source), footprintError = maxDelta(state.footprint, source.footprint), opacityError = Math.abs(state.opacity - source.opacity * state.coverage);
        assert(sourceError < 1e-10 && footprintError < 1e-10 && opacityError < 1e-12, label + ' retains actual shadow values');
        assert.equal(state.memory.opacity, source.opacity); assert.deepEqual(state.memory.source, source.source); assert.deepEqual(state.memory.footprint, source.footprint);
        assert(state.opacity >= 0 && state.opacity <= source.opacity + 1e-12); assert.deepEqual(state.geometryIds, source.geometryIds); assert.deepEqual(state.materialIds, source.materialIds);
        for (let n = 0; n < source.live.length; n++) { assert.equal(state.ghost[n].density, source.live[n].density); assert.deepEqual(state.ghost[n].position, source.live[n].position); assert.deepEqual(state.ghost[n].scale, source.live[n].scale); }
        return { sourceError, footprintError, opacityError, coverage: state.coverage, opacity: state.opacity, sourceOpacity: source.opacity, uploaded: uploads(state) };
      };
      const clearShadow = state => { assert(!state.memory.active && !state.visible && state.opacity === 0 && state.memory.opacity === 0); assert.deepEqual(state.memory.source, [0, 0, 0]); assert.deepEqual(state.memory.footprint, [1, 1]); uploads(state); };
      result.cloudShadowMemory = { journey: await page.evaluate(() => shadowMemoryJourney) };
      await trigger('shadowThaw', { cameraMode: 'follow' }); await driveTransition('shadowWarmCloud'); await setOverview(); await shadowDraw();
      const pre = await shadowSample(); result.cloudShadowMemory.pre = pre; result.cloudShadowMemory.preUploads = uploads(pre);
      assert(pre.form === 'cloud' && pre.phase.kind === 'cloud-assembly' && pre.assemblyProgress < .2 && pre.live.some(lobe => lobe.density < 1));
      assert(!pre.memory.active && Number.isFinite(pre.opacity) && pre.opacity >= 0); await capture('cloud-shadow-memory-cloud-overview');
      await driveTransition('shadowRainRelease'); await shadowDraw(); const first = await shadowSample(); result.cloudShadowMemory.first = first;
      result.cloudShadowMemory.firstProof = validateMemory(first, 'First immediate rain release'); assert.equal(first.coverage, 1); assert.equal(first.opacity, pre.opacity);
      assert.equal(first.proof.input.dropletHit, false); assert(Math.abs(first.proof.elapsed[1] - first.proof.elapsed[0] - .016) < 1e-10); assert.deepEqual(first.overview, pre.overview);
      await capture('cloud-shadow-memory-first-rain-overview'); await page.waitForTimeout(160); const paused = await shadowSample(); result.cloudShadowMemory.paused = paused;
      const visual = ({ reads, ...rest }) => rest; assert.deepEqual(visual(paused), visual(first)); uploads(paused);
      await continueShadow(); await page.waitForFunction(() => { const e = pilotReview.scene.getObjectByName('pilot-cloud-interior').userData.exit; return e.active && e.coverage <= .55; }); await pause(); await shadowDraw();
      const middle = await shadowSample(); result.cloudShadowMemory.middle = middle; result.cloudShadowMemory.middleProof = validateMemory(middle, 'Fading source shadow'); assert(middle.coverage > 0 && middle.coverage < first.coverage); assert.deepEqual(middle.overview, pre.overview);
      await capture('cloud-shadow-memory-middle-overview'); await clickShadow('Water view'); await settle(); await shadowDraw();
      const water = await shadowSample(); result.cloudShadowMemory.water = water; validateMemory(water, 'Water source shadow'); assert.equal(water.opacity, middle.opacity);
      await clickShadow('Follow view'); await settle(); await shadowDraw(); const follow = await shadowSample(); result.cloudShadowMemory.follow = follow; validateMemory(follow, 'Follow source shadow'); assert.equal(follow.opacity, middle.opacity);
      await resume(); await page.waitForFunction(() => !pilotReview.scene.getObjectByName('pilot-cloud-shadow').userData.sourceMemory.active); await pause(); await shadowDraw();
      const expired = await shadowSample(); result.cloudShadowMemory.expired = expired; clearShadow(expired);
      pass('Genuine cooldown-respecting heavy ice thaws, forms a partial cloud, then releases rain one no-hit frame later with exact captured shadow source, footprint and strength');
      pass('Actual drawn receiver uniforms, frozen overview/pause, both camera modes and all captured lobe densities/resources preserve source-shadow continuity through fade and expiry');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await restore('before-rainRelease', { cameraMode: 'follow' }); await setOverview(); await shadowDraw();
      const normal = await shadowSample(); result.cloudShadowMemory.normal = normal; uploads(normal); assert.equal(normal.assemblyProgress, 1);
      await driveTransition('rainRelease'); await shadowDraw(); const reduced = await shadowSample(); result.cloudShadowMemory.reduced = reduced; validateMemory(reduced, 'Reduced full-cloud source'); assert.equal(reduced.coverage, .5);
      await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 4, reduced.steps); await pause(); await shadowDraw(); const later = await shadowSample(); result.cloudShadowMemory.reducedLater = later; validateMemory(later, 'Held reduced source'); assert.equal(later.coverage, .5); assert(later.steps > reduced.steps);
      result.cloudShadowMemory.beforeReset = later; await clickShadow('Reset this run and start again as liquid water'); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); await pause(); await shadowDraw();
      const reset = await shadowSample(); result.cloudShadowMemory.reset = reset; clearShadow(reset);
      await restore('rain', { cameraMode: 'follow', pauseAtChanges: false }); await shadowDraw(); const restored = await shadowSample(); result.cloudShadowMemory.restored = restored; clearShadow(restored);
      result.cloudShadowMemory.evidence = { initialPlacement: result.cloudShadowMemory.journey.declaredStart, origin: result.cloudShadowMemory.journey.origin,
        nativeScope: 'The full cooldown-respecting journey is generated by original-kernel stepping. Native rendering resumes its genuine heavy-ice thaw checkpoint and replays the saved original-kernel input receipts for thaw, warm-hit cloud and immediate no-hit rain; only the three receiver overview checkpoints are imaged. Rendered-mote pickup collision acceptance is not native-tested.',
        first: result.cloudShadowMemory.firstProof, middle: result.cloudShadowMemory.middleProof, pauseExact: true, fixedOverview: pre.overview, sharedReceivers: pre.receivers.length,
        unchangedResourcePool: true, reducedSteps: [reduced.steps, later.steps], reducedCoverage: reduced.coverage, activeReset: true, restoredRainClear: true };
      pass('Full-cloud reduced source strength uses its static representative fade; active reset and restored rain clear every pooled source-shadow value');
    }
    if (enabled('cloud-exit')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        window.cloudExitReads = []; window.cloudExitHooked = new WeakSet();
        window.cloudExitSnapshot = () => {
          const scene = pilotReview.scene; scene.updateMatrixWorld(true);
          const group = scene.getObjectByName('pilot-cloud-interior'), exit = group.userData.exit, phase = scene.getObjectByName('pilot-phase-handoff');
          const vector = value => value?.toArray ? value.toArray() : null;
          const ancestors = []; for (let p = group; p; p = p.parent) ancestors.push({ name: p.name, visible: p.visible });
          return { form: waterReviewData.pilot.snapshot.form, elapsed: waterReviewData.pilot.snapshot.elapsed, steps: rainCloudDepthTotalSteps,
            camera: document.querySelector('#wcPilotCanvas').dataset.pilotCamera, visible: group.visible, effectiveVisible: ancestors.every(p => p.visible),
            position: group.position.toArray(), worldPosition: group.getWorldPosition(new THREE.Vector3()).toArray(),
            worldQuaternion: group.getWorldQuaternion(new THREE.Quaternion()).toArray(), worldScale: group.getWorldScale(new THREE.Vector3()).toArray(),
            exit: exit ? { active: exit.active, coverage: exit.coverage, startedAt: exit.startedAt, duration: exit.duration,
              sourcePosition: vector(exit.sourcePosition), sourceQuaternion: vector(exit.sourceQuaternion), sourceScale: vector(exit.sourceScale),
              sourceFogNear: exit.sourceFogNear, sourceFogFar: exit.sourceFogFar } : null,
            phase: { visible: phase.visible, kind: phase.userData.kind, progress: phase.userData.progress, duration: phase.userData.duration },
            fog: { near: scene.fog.near, far: scene.fog.far, color: scene.fog.color.toArray() },
            lobes: group.children.map(lobe => ({ uuid: lobe.uuid, geometry: lobe.geometry?.uuid, material: lobe.material.uuid,
              map: lobe.material.map?.uuid, normal: lobe.material.pilotBillowNormalMap?.uuid, position: lobe.position.toArray(),
              quaternion: lobe.quaternion.toArray(), scale: lobe.scale.toArray(), opacity: lobe.material.opacity, color: lobe.material.color.toArray(),
              depthTest: lobe.material.depthTest, depthWrite: lobe.material.depthWrite })), reads: cloudExitReads.slice() };
        };
        window.cloudExitReleaseProbe = (before, after) => ({ from: before.form, to: after.form, elapsed: [before.elapsed, after.elapsed], veil: cloudExitSnapshot() });
        const priorStep = WaterCyclePilotKernel.step;
        WaterCyclePilotKernel.step = function(state, input) {
          const next = priorStep(state, input);
          if (state.form === 'cloud' && (next.form === 'rain' || next.form === 'snow')) window.cloudExitReleaseProof = cloudExitReleaseProbe(state, next);
          return next;
        };
      });
      const exitDraw = async () => {
        await page.evaluate(() => {
          for (const sprite of pilotReview.scene.getObjectByName('pilot-cloud-interior').children) {
            if (cloudExitHooked.has(sprite)) continue; cloudExitHooked.add(sprite); const previous = sprite.onAfterRender;
            sprite.onAfterRender = function(renderer, scene, camera, geometry, material) {
              if (previous) previous.apply(this, arguments);
              const properties = renderer.properties.get(material), program = properties.currentProgram || properties.program, gl = renderer.getContext();
              const location = program?.program ? gl.getUniformLocation(program.program, 'opacity') : null;
              cloudExitReads.push({ material: material.uuid, expected: material.opacity, uploaded: location === null ? null : gl.getUniform(program.program, location) });
            };
          }
        });
        for (let draw = 0; draw < 2; draw++) {
          const before = await page.evaluate(() => { cloudExitReads = []; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
          await page.waitForFunction(before => window.reviewRenderCount > before, before, { timeout: 90000 }); await page.evaluate(() => { window.reviewRenderActive = false; });
        }
      };
      const exitSample = () => page.evaluate(() => ({ ...cloudExitSnapshot(), source: window.cloudExitReleaseProof || null }));
      const resources = state => state.lobes.map(lobe => [lobe.uuid, lobe.geometry, lobe.material, lobe.map, lobe.normal, lobe.depthTest, lobe.depthWrite]);
      const validateExit = (state, label) => {
        assert(state.exit?.active && state.exit.coverage > 0 && state.exit.coverage <= 1 && state.lobes.length === 18, label + ' retains the bounded actual interior');
        assert(state.source && state.source.from === 'cloud' && ['rain', 'snow'].includes(state.source.to));
        const source = state.source.veil; let poseError = 0, opacityError = 0;
        for (const [actual, expected] of [[state.worldPosition, source.worldPosition], [state.worldQuaternion, source.worldQuaternion], [state.worldScale, source.worldScale],
          [state.exit.sourcePosition, source.worldPosition], [state.exit.sourceQuaternion, source.worldQuaternion], [state.exit.sourceScale, source.worldScale]]) poseError = Math.max(poseError, maxDelta(actual, expected));
        for (let n = 0; n < 18; n++) {
          for (const key of ['position', 'quaternion', 'scale']) poseError = Math.max(poseError, maxDelta(state.lobes[n][key], source.lobes[n][key]));
          opacityError = Math.max(opacityError, Math.abs(state.lobes[n].opacity - source.lobes[n].opacity * state.exit.coverage));
        }
        assert(poseError < 1e-7 && opacityError < 1e-10, JSON.stringify({ label, poseError, opacityError }));
        const sameResources = JSON.stringify(resources(state)) === JSON.stringify(resources(source)); assert(sameResources, label + ' reuses actual sprites, paired maps and materials');
        assert.equal(state.visible, state.camera === 'water');
        const expectedNear = state.camera === 'water' ? 620 + (state.exit.sourceFogNear - 620) * state.exit.coverage : 620;
        const expectedFar = state.camera === 'water' ? 2300 + (state.exit.sourceFogFar - 2300) * state.exit.coverage : 2300;
        assert(Math.abs(state.fog.near - expectedNear) < 1e-9 && Math.abs(state.fog.far - expectedFar) < 1e-9, label + ' fog uses the same captured-source coverage');
        if (state.visible) assert(state.reads.length > 0 && state.reads.every(read => read.uploaded !== null && Math.abs(read.uploaded - read.expected) < 1e-6), label + ' uploads actual native sprite opacity');
        return { coverage: state.exit.coverage, poseError, opacityError, sameResources, uploadedSprites: state.reads.length, fog: state.fog };
      };
      const clearCheck = state => {
        assert(!state.exit.active && !state.visible); assert.equal(state.exit.coverage, 0); assert.equal(state.exit.startedAt, 0); assert.equal(state.exit.duration, 0);
        assert.deepEqual(state.exit.sourcePosition, [0, 0, 0]); assert.deepEqual(state.exit.sourceQuaternion, [0, 0, 0, 1]); assert.deepEqual(state.exit.sourceScale, [1, 1, 1]);
        assert.equal(state.fog.near, 620); assert.equal(state.fog.far, 2300); assert(state.lobes.every((lobe, n) => lobe.opacity === .075 + (n % 3) * .0475));
      };
      result.cloudExit = {};
      await restore('before-rainRelease', { cameraMode: 'water' }); await exitDraw(); const initialCloud = await exitSample();
      await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false, thrust: 0 }; });
      await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 5, initialCloud.steps); await pause(); await exitDraw();
      const pre = await exitSample(); result.cloudExit.pre = pre;
      result.cloudExit.preMotion = { steps: [initialCloud.steps, pre.steps], maxLobeDisplacement: Math.max(...pre.lobes.map((lobe, n) => maxDelta(lobe.position, initialCloud.lobes[n].position))) };
      assert.equal(pre.form, 'cloud'); assert(pre.visible && !pre.exit.active && pre.lobes.length === 18);
      assert(pre.lobes.some((lobe, n) => maxDelta(lobe.position, initialCloud.lobes[n].position) > 1e-5), 'Pre-release cloud uses its actual moving parallax pose');
      assert(pre.lobes.every((lobe, n) => lobe.opacity === .075 + (n % 3) * .0475)); await capture('cloud-exit-before-water');
      await driveTransition('rainRelease'); await exitDraw(); const first = await exitSample(); result.cloudExit.first = first;
      result.cloudExit.firstProof = validateExit(first, 'First paused rain exit'); assert.equal(first.exit.coverage, 1);
      assert.equal(first.exit.startedAt, first.source.elapsed[1]); assert.deepEqual(resources(first), resources(pre));
      assert(maxDelta(first.worldPosition, pre.worldPosition) < 1e-7); assert.equal(first.fog.near, first.source.veil.fog.near); assert.equal(first.fog.far, first.source.veil.fog.far);
      assert(Math.abs(first.exit.duration - first.phase.duration * (1 - first.phase.progress)) < 1e-10, 'Exit lifetime is exactly the remaining genuine release cue');
      await capture('cloud-exit-first-rain-water'); await page.waitForTimeout(160);
      const pausedFirst = await exitSample(); result.cloudExit.pausedFirst = pausedFirst;
      const pauseVisualState = ({ reads, ...state }) => state;
      assert.deepEqual(pauseVisualState(pausedFirst), pauseVisualState(first), 'Pause freezes captured root, lobes, opacity, fog and exit clock; append-only render telemetry is checked separately');
      result.cloudExit.pauseProof = validateExit(pausedFirst, 'Paused rain exit after native draw checkpoint');
      await page.getByRole('button', { name: 'Continue journey', exact: true }).click();
      await page.waitForFunction(() => { const e = pilotReview.scene.getObjectByName('pilot-cloud-interior').userData.exit; return e.active && e.coverage <= .55; }); await pause(); await exitDraw();
      const middle = await exitSample(); result.cloudExit.middle = middle; result.cloudExit.middleProof = validateExit(middle, 'Mid rain exit'); assert(middle.exit.coverage < first.exit.coverage);
      await capture('cloud-exit-middle-rain-water');
      await page.getByRole('button', { name: 'Follow view', exact: true }).click(); await settle(); await exitDraw();
      const follow = await exitSample(); result.cloudExit.follow = follow; validateExit(follow, 'Paused Follow exit'); assert.equal(follow.exit.coverage, middle.exit.coverage);
      await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await exitDraw();
      const waterAgain = await exitSample(); result.cloudExit.waterAgain = waterAgain; validateExit(waterAgain, 'Restored Water exit'); assert.equal(waterAgain.exit.coverage, middle.exit.coverage);
      await resume(); await page.waitForFunction(() => !pilotReview.scene.getObjectByName('pilot-cloud-interior').userData.exit.active); await pause(); await exitDraw();
      const expired = await exitSample(); result.cloudExit.expired = expired; clearCheck(expired);
      pass('Actual moving Water-view cloud sprites remain source anchored at the first genuine rain pause and thin smoothly through the remaining release cue');
      pass('All18 retained billows preserve their actual resources and frozen poses, native opacity uploads, paused coverage and matching Water/Follow fog');

      await page.emulateMedia({ reducedMotion: 'reduce' }); await trigger('rainRelease', { cameraMode: 'water' }); await exitDraw();
      const reduced = await exitSample(); result.cloudExit.reduced = reduced; validateExit(reduced, 'Initial reduced cloud exit'); assert.equal(reduced.exit.coverage, .5);
      await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 4, reduced.steps); await pause(); await exitDraw();
      const reducedLater = await exitSample(); result.cloudExit.reducedLater = reducedLater; validateExit(reducedLater, 'Held reduced cloud exit');
      assert(reducedLater.steps > reduced.steps && reducedLater.exit.coverage === .5); result.cloudExit.beforeReset = reducedLater;
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); await pause(); await exitDraw();
      const reset = await exitSample(); result.cloudExit.reset = reset; clearCheck(reset);
      await restore('rain', { cameraMode: 'water', pauseAtChanges: false }); await exitDraw(); const restored = await exitSample(); result.cloudExit.restored = restored; clearCheck(restored);
      pass('Reduced motion holds representative exit coverage during genuine kernel steps; active reset and restored rain clear the interior and fog');

      await page.emulateMedia({ reducedMotion: 'no-preference' }); await trigger('snowRelease', { cameraMode: 'water' }); await exitDraw();
      const snowFirst = await exitSample(); result.cloudExit.snowFirst = snowFirst; result.cloudExit.snowProof = validateExit(snowFirst, 'First paused snow exit'); assert.equal(snowFirst.exit.coverage, 1);
      await page.getByRole('button', { name: 'Continue journey', exact: true }).click(); await page.waitForFunction(() => !pilotReview.scene.getObjectByName('pilot-cloud-interior').userData.exit.active); await pause(); await exitDraw();
      const snowExpired = await exitSample(); result.cloudExit.snowExpired = snowExpired; clearCheck(snowExpired);
      result.cloudExit.evidence = { lobeCount: 18, firstCoverage: first.exit.coverage, middleCoverage: middle.exit.coverage,
        first: result.cloudExit.firstProof, middle: result.cloudExit.middleProof, snow: result.cloudExit.snowProof,
        pauseExact: true, capturedMovingPose: result.cloudExit.preMotion, sourceAnchoredAcrossViews: true, noNewResources: true,
        reducedSteps: [reduced.steps, reducedLater.steps], reducedCoverage: reduced.exit.coverage, activeReset: true, restoredRainClear: true, snowClears: true,
        sourceFog: [first.exit.sourceFogNear, first.exit.sourceFogFar], remainingCueDuration: first.exit.duration };
      pass('Genuine cold-cloud snow release retains the same bounded source interior and clears it at cue expiry');
    }
    if (enabled('cloud-evolution')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        window.cloudEvolutionLobes = group => group.children.map((o, index) => ({
          index, tier: o.userData.cloudTier, position: o.position.toArray(), scale: o.scale.toArray(),
          opacity: o.material.opacity, density: o.material.userData.cloudLighting.density.value,
          densityModel: o.material.userData.cloudLighting.densityModel,
          basePosition: [o.userData.motionBaseX, o.userData.motionBaseY, o.userData.motionBaseZ],
          baseScale: [o.userData.motionBaseScaleX, o.userData.motionBaseScaleY, 1],
          baseOpacity: o.userData.motionBaseOpacity, material: o.material.uuid,
          map: o.material.map.uuid, normal: o.material.pilotBillowNormalMap.uuid
        }));
        window.cloudEvolutionReleaseProbe = (before, after) => ({
          from: before.form, to: after.form, elapsed: [before.elapsed, after.elapsed],
          phaseProgress: Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress),
          lobes: cloudEvolutionLobes(pilotReview.scene.getObjectByName('pilot-self-cloud'))
        });
        window.cloudEvolutionHooked = new WeakSet();
        window.cloudEvolutionDensityReads = [];
      });
      async function evolutionDraw() {
        await page.evaluate(() => {
          for (const groupName of ['pilot-self-cloud', 'pilot-phase-cloud-memory']) {
            const group = pilotReview.scene.getObjectByName(groupName);
            for (const o of group.children) {
              if (cloudEvolutionHooked.has(o)) continue;
              cloudEvolutionHooked.add(o); const previous = o.onAfterRender;
              o.onAfterRender = function(renderer, scene, camera, geometry, material) {
                if (previous) previous.apply(this, arguments);
                const properties = renderer.properties.get(material), program = properties.currentProgram || properties.program;
                const gl = renderer.getContext(), location = program?.program && gl.getUniformLocation(program.program, 'pilotCloudDensity');
                cloudEvolutionDensityReads.push({ parent: this.parent.name, index: this.parent.children.indexOf(this),
                  expected: material.userData.cloudLighting.density.value,
                  uploaded: location === null || !program ? null : gl.getUniform(program.program, location) });
              };
            }
          }
        });
        // Scene restores create fresh materials. Warm them through the native
        // renderer before reading the actual per-sprite uploaded uniforms.
        for (let draw = 0; draw < 2; draw++) {
          const before = await page.evaluate(() => { cloudEvolutionDensityReads = []; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
          await page.waitForFunction(before => window.reviewRenderCount > before, before, { timeout: 90000 });
          await page.evaluate(() => { window.reviewRenderActive = false; });
        }
      }
      const evolutionSample = (linked = false) => page.evaluate(linked => {
        const s = pilotReview.scene, live = s.getObjectByName('pilot-self-cloud'), memory = s.getObjectByName('pilot-phase-cloud-memory');
        const group = s.getObjectByName('pilot-phase-handoff'), programs = new Map(), textures = new Set();
        if (linked) for (const o of [...live.children, ...memory.children]) {
          const material = o.material, properties = pilotReview.renderer.properties.get(material), program = properties.currentProgram || properties.program;
          textures.add(material.map.uuid); textures.add(material.pilotBillowNormalMap.uuid);
          if (program?.fragmentShader && !programs.has(program.id)) {
            const gl = pilotReview.renderer.getContext(); programs.set(program.id, { id: program.id, fragment: gl.getShaderSource(program.fragmentShader) });
          }
        }
        return { camera: document.querySelector('#wcPilotCanvas').dataset.pilotCamera,
          phaseKind: group.userData.kind, phaseVisible: group.visible, phaseProgress: group.userData.progress,
          motionTime: live.userData.motionTime, live: { visible: live.visible, lobes: cloudEvolutionLobes(live) },
          memory: { visible: memory.visible, placement: memory.userData.placement, lobes: cloudEvolutionLobes(memory) },
          reads: cloudEvolutionDensityReads.slice(), programs: [...programs.values()], sharedTextureCount: textures.size,
          resources: JSON.parse(JSON.stringify(pilotReview.renderer.info.memory)), steps: rainCloudDepthTotalSteps,
          releaseProof: window.cloudEvolutionReleaseProof || null };
      }, linked);
      const verifyAssembly = snapshot => {
        assert.equal(snapshot.phaseKind, 'cloud-assembly'); assert(snapshot.phaseVisible);
        const p = snapshot.phaseProgress, eased = p * p * (3 - 2 * p);
        for (const lobe of snapshot.live.lobes) {
          const tier = Math.max(0, Math.min(1, (eased - lobe.tier * .17) / .62));
          assert(Math.abs(lobe.density - tier * tier * (3 - 2 * tier)) < 1e-10);
          assert.equal(lobe.opacity, lobe.baseOpacity, 'Formation changes optical depth inside each map, preserving base material opacity');
          assert.equal(lobe.densityModel, 'optical-depth-assembly');
          if (snapshot.camera === 'water') assert.equal(snapshot.memory.lobes[lobe.index].density, lobe.density, 'Water lens copies the actual forming lobe density');
        }
        const expectedParent = snapshot.camera === 'water' ? 'pilot-phase-cloud-memory' : 'pilot-self-cloud';
        const reads = snapshot.reads.filter(read => read.parent === expectedParent);
        assert(reads.length > 0 && reads.every(read => Number.isFinite(read.uploaded) && Math.abs(read.uploaded - read.expected) < 1e-6), 'Actual native per-sprite cloud density matches the uploaded uniform');
      };
      const immutableLobes = snapshot => snapshot.live.lobes.map(({ position, scale, opacity, density }) => ({ position, scale, opacity, density }));
      const assembly = [];
      await trigger('cloudAssembly', { cameraMode: 'follow' });
      await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false }; });
      await evolutionDraw(); let sample = await evolutionSample(true); verifyAssembly(sample);
      assert(sample.programs.length > 0 && sample.programs.every(program => ['uniform float pilotCloudDensity', 'cloudTransmission', 'cloudDensityCoverage', 'pow(cloudTransmission,cloudDensity)'].every(token => program.fragment.includes(token))), 'Actual linked cloud shader contains the normalized optical-depth formation');
      assert(sample.sharedTextureCount <= 12, 'Cloud formation reuses the six paired albedo and relief maps');
      if (earlyClean) {
        const before = sample;
        // Dismiss the genuine receipt using its own UI, then pause immediately.
        // No form, mass, phase progress or simulation clock is written by QA.
        await page.getByRole('button', { name: 'Continue journey', exact: true }).click();
        await pause(); await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample);
        assert(sample.phaseProgress < .4, 'Receipt dismissal retains the early formation stage');
        assert.equal(await page.locator('.wc-pilot-notice').count(), 0, 'Journey receipt is dismissed through the supported Continue journey action');
        await capture('cloud-assembly-early-clean-follow'); await inspect('cloud-assembly-early-clean-follow');
        result.cloudEvolutionClean = { before, clean: sample, receiptDismissed: true, scope: 'Actual Continue journey UI followed immediately by Pause; all clocks and forms remain production controlled.' };
        assert.deepEqual(result.errors, []); pass('Unobscured early cloud formation retains genuine partial optical depth after supported receipt dismissal without synthetic model or phase edits');
        if(suite==='cloud-snow-onset')assert(result.cloudSnowOnset&&result.captures.length===3,'The requested native snow section and all3captures must execute');
    pass('No page, WebGL or shader errors'); result.success = true; return;
      }
      assembly.push({ name: 'early-follow', ...sample }); await capture('cloud-assembly-early-follow');
      await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .48); await pause();
      await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample); assembly.push({ name: 'middle-follow', ...sample }); await capture('cloud-assembly-middle-follow');
      await page.waitForTimeout(180); const frozen = await evolutionSample(); assert.deepEqual(immutableLobes(frozen), immutableLobes(sample), 'Paused formation keeps every cloud pose, density and opacity exact');
      await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample);
      assembly.push({ name: 'middle-water', ...sample }); await capture('cloud-assembly-middle-water');
      assert.deepEqual(immutableLobes(sample), immutableLobes(assembly[1]), 'Water/Follow switch does not change the forming real cloud');
      await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .82); await pause();
      await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample); assembly.push({ name: 'late-water', ...sample }); await capture('cloud-assembly-late-water');
      await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden'); await pause();
      const expired = await evolutionSample(); assert(expired.live.lobes.every(lobe => lobe.density === 1) && expired.memory.lobes.every(lobe => lobe.density === 1), 'Formation expiry restores all live and pooled memory optical depths');
      pass('Genuine early, middle and late cloud assembly grows per-tier optical depth; actual uploaded uniforms, paused poses and Water/Follow density remain consistent');

      await trigger('cloudAssembly', { cameraMode: 'follow' });
      await page.evaluate(() => { window.cloudEvolutionReleaseProof = null; window.rainCloudDepthSteadyInput = { dropletHit: true, nucleusHit: false }; });
      await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'rain' && waterReviewData.pilot.paused);
      await settle(); await evolutionDraw(); const released = await evolutionSample(), source = released.releaseProof;
      assert(source && source.from === 'cloud' && source.to === 'rain' && source.lobes.some(lobe => lobe.density < 1), 'Genuine rapid coalescence interrupts partial cloud assembly');
      for (const lobe of source.lobes) {
        const memory = released.memory.lobes[lobe.index];
        assert.equal(memory.density, lobe.density, 'Outgoing source retains each actually visible partial optical depth');
        assert.deepEqual(memory.position, lobe.position); assert.deepEqual(memory.scale, lobe.scale);
      }
      assert(released.live.lobes.every(lobe => lobe.density === 1));
      await capture('cloud-assembly-rapid-rain-follow');
      await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await evolutionDraw(); const releaseWater = await evolutionSample();
      assert.deepEqual(releaseWater.memory.lobes.map(lobe => lobe.density), source.lobes.map(lobe => lobe.density), 'Source density survives the bounded Water teaching lens');
      await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden'); await pause();
      const releaseExpired = await evolutionSample(); assert(releaseExpired.memory.lobes.every(lobe => lobe.density === 1));
      pass('A genuine partial-assembly cloud-to-rain transition captures every source lobe density and pose before clearing, preserves it in both views and clears it at expiry');

      await restore('cloud', { pauseAtChanges: false }); await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false }; });
      const zero = await evolutionSample(); assert.equal(zero.motionTime, 0);
      for (const lobe of zero.live.lobes) { assert.deepEqual(lobe.position, lobe.basePosition); assert.deepEqual(lobe.scale, lobe.baseScale); assert.equal(lobe.density, 1); }
      await resume(); await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-self-cloud').userData.motionTime >= .25); await pause(); const firstMotion = await evolutionSample();
      await resume(); await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-self-cloud').userData.motionTime >= .55); await pause(); const secondMotion = await evolutionSample();
      const verticalVelocities = [];
      for (const lobe of secondMotion.live.lobes) {
        const tier = lobe.tier, delta = lobe.position.map((value, i) => value - lobe.basePosition[i]);
        assert(Math.abs(delta[0]) <= 2.2 * tier + 1e-10 && Math.abs(delta[1]) <= 2 * tier * (.4 + tier * .1) + 1e-10 && Math.abs(delta[2]) <= .56 * tier + 1e-10);
        const width = lobe.scale[0] / lobe.baseScale[0], height = lobe.scale[1] / lobe.baseScale[1];
        assert(width >= .982 - 1e-10 && width <= 1.018 + 1e-10 && height >= .972 - 1e-10 && height <= 1.028 + 1e-10);
        if (tier === 0) { assert.deepEqual(lobe.position, lobe.basePosition); assert.equal(lobe.scale[1], lobe.baseScale[1]); }
        else verticalVelocities.push((lobe.position[1] - firstMotion.live.lobes[lobe.index].position[1]) / (secondMotion.motionTime - firstMotion.motionTime));
      }
      const minVerticalVelocity = Math.min(...verticalVelocities), maxVerticalVelocity = Math.max(...verticalVelocities);
      assert(maxVerticalVelocity - minVerticalVelocity > .05 && minVerticalVelocity < 0 && maxVerticalVelocity > 0, 'Actual cloud lobes have different signed convective velocities');
      await page.waitForTimeout(180); const pausedMotion = await evolutionSample(); assert.deepEqual(immutableLobes(pausedMotion), immutableLobes(secondMotion)); assert.equal(pausedMotion.motionTime, secondMotion.motionTime);
      pass('Native lobe motion starts at the original geometry, has distinct bounded rising/falling velocities and breathing, keeps the shelf anchored and freezes exactly at pause');

      await page.emulateMedia({ reducedMotion: 'reduce' }); await trigger('cloudAssembly', { cameraMode: 'water' });
      await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false }; }); await evolutionDraw(); const reduced = await evolutionSample();
      await resume(); await page.waitForTimeout(180); const reducedLater = await evolutionSample(); await pause();
      assert(reducedLater.steps > reduced.steps); assert.equal(reducedLater.phaseProgress, reduced.phaseProgress); assert.equal(reducedLater.motionTime, reduced.motionTime);
      assert.deepEqual(immutableLobes(reducedLater), immutableLobes(reduced), 'Reduced motion keeps optical depth and cloud poses static while the genuine kernel advances');
      await restore('cloud'); const restored = await evolutionSample(); assert(!restored.phaseVisible && restored.live.lobes.every(lobe => lobe.density === 1) && restored.memory.lobes.every(lobe => lobe.density === 1));
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid');
      const reset = await evolutionSample(); assert.equal(reset.motionTime, 0); assert(reset.live.lobes.every(lobe => lobe.density === 1) && reset.memory.lobes.every(lobe => lobe.density === 1));
      pass('Reduced motion holds a representative cloud formation while real model steps advance; restore and reset clear optical-depth memories and motion');
      result.cloudEvolution = { assembly, frozen, expired, release: { source, released, water: releaseWater, expired: releaseExpired }, motion: { zero, first: firstMotion, second: secondMotion, paused: pausedMotion, minVerticalVelocity, maxVerticalVelocity }, lifecycle: { reduced, reducedLater, restored, reset }, evidence: { lobes: zero.live.lobes.length, sharedPairedTextures: assembly[0].sharedTextureCount, assemblyProgress: assembly.map(item => ({ name: item.name, progress: item.phaseProgress, densityRange: [Math.min(...item.live.lobes.map(lobe => lobe.density)), Math.max(...item.live.lobes.map(lobe => lobe.density))] })), sourceDensityRange: [Math.min(...source.lobes.map(lobe => lobe.density)), Math.max(...source.lobes.map(lobe => lobe.density))], sourceProgress: source.phaseProgress, minVerticalVelocity, maxVerticalVelocity, reducedModelSteps: [reduced.steps, reducedLater.steps] } };
    }
    if(enabled('cloud')){
      await restore('cloud');result.cloudLighting=[];await page.evaluate(()=>{window.rainCloudDepthShelterReads={};pilotReview.scene.traverse(o=>{if(!o.isSprite||!o.material?.userData.cloudLighting?.shelter)return;const previous=o.onAfterRender;o.onAfterRender=function(renderer,scene,camera,geometry,material){if(previous)previous.apply(this,arguments);const properties=renderer.properties.get(material),program=properties.currentProgram||properties.program,gl=renderer.getContext(),location=program?.program&&gl.getUniformLocation(program.program,'pilotCloudShelter');window.rainCloudDepthShelterReads[material.uuid]={uuid:material.uuid,tier:this.userData.cloudTier,expected:material.userData.cloudLighting.shelter.value,uploaded:location?gl.getUniform(program.program,location):null};};});});
      for(const[name,sign]of[['sunward',1],['opposite',-1]]){await page.evaluate(()=>{window.rainCloudDepthShelterReads={};window.spatialWeatherDrawOrder=[];});const camera=await page.evaluate(({sign,distance})=>{const s=pilotReview.scene,sun=s.getObjectByName('pilot-cloud-shadow').userData.sunDirection,target=s.getObjectByName('pilot-water-parcel').getWorldPosition(new THREE.Vector3()),horizontal=new THREE.Vector3(sun.x,0,sun.z).normalize(),view=new THREE.PerspectiveCamera(48,pilotReview.camera.aspect,.1,3000);view.position.copy(target).addScaledVector(horizontal,sign*distance).add(new THREE.Vector3(0,distance*45/260,0));view.lookAt(target);view.updateMatrixWorld(true);window.reviewCameraOverride=view;return {scope:'Fixture-only review camera; actual production Sun, geometry, materials and kernel checkpoint are unchanged.',position:view.position.toArray(),target:target.toArray()};},{sign,distance:cloudDistance});await capture('cloud-shade-'+name);result.cloudLighting.push({name,camera,...await cloudSample()});}
      if(suite==='spatial-weather'){
        const backdrop=()=>page.evaluate(()=>{
          const s=pilotReview.scene,camera=window.reviewCameraOverride||pilotReview.camera,cloud=s.getObjectByName('pilot-self-cloud'),ocean=s.getObjectByName('pilot-ocean-surface');s.updateMatrixWorld(true);const ray=new THREE.Raycaster(),samples=[];
          for(const child of cloud.children){const world=child.getWorldPosition(new THREE.Vector3()),point=world.clone().project(camera);if(Math.abs(point.x)>.98||Math.abs(point.y)>.98||point.z< -1||point.z>1)continue;ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);const hit=ray.intersectObject(ocean,false)[0],distance=world.distanceTo(camera.position);if(!hit||hit.distance<=distance+1)continue;const pixel=rainCloudDepthCloudPixels.samples.find(p=>Math.abs(p.ndc[0]-point.x)<1e-9&&Math.abs(p.ndc[1]-point.y)<1e-9);if(pixel)samples.push({ndc:point.toArray(),cloudDistance:distance,waterDistance:hit.distance,rgba:pixel.rgba});}
          return {samples,drawOrder:spatialWeatherDrawOrder.slice()};
        });
        const production=await backdrop();
        const orders=await page.evaluate(()=>{
          const s=pilotReview.scene,objects=[],buffers=[],materials=new Map(),geometries=new Set();
          s.traverse(o=>{objects.push({object:o,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible});if(o.instanceMatrix)buffers.push({name:o.name,buffer:o.instanceMatrix.array,bytes:new Uint8Array(o.instanceMatrix.array.buffer,o.instanceMatrix.array.byteOffset,o.instanceMatrix.array.byteLength).slice()});if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);for(const[name,a]of Object.entries(o.geometry.attributes))buffers.push({name:o.name+':'+name,buffer:a.array,bytes:new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).slice()});}for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])if(!materials.has(m))materials.set(m,{opacity:m.opacity,depthTest:m.depthTest,depthWrite:m.depthWrite});});
          window.spatialWeatherDiagnosticState={objects,buffers,materials};const backdrop=s.getObjectByName('pilot-water-backdrop');if(!backdrop?.isGroup)throw Error('Missing production water backdrop group');const orders=[];backdrop.traverse(o=>{if(o.isGroup){orders.push({name:o.name,uuid:o.uuid,production:o.renderOrder,legacy:0});o.renderOrder=0;}});window.spatialWeatherDrawOrder=[];return orders;
        });
        let legacy;
        try{await capture('cloud-opposite-legacy-order');legacy=await backdrop();}
        finally{await page.evaluate(orders=>{for(const {uuid,production}of orders)pilotReview.scene.getObjectByProperty('uuid',uuid).renderOrder=production;},orders);}
        const unchanged=await page.evaluate(()=>{
          const state=spatialWeatherDiagnosticState,changed=[];
          for(const p of state.objects)for(const key of ['position','quaternion','scale'])if(!p[key].every((v,i)=>v===p.object[key].toArray()[i]))changed.push(p.object.name+':'+key);
          for(const p of state.objects)if(p.object.visible!==p.visible)changed.push(p.object.name+':visible');
          for(const p of state.buffers){const bytes=new Uint8Array(p.buffer.buffer,p.buffer.byteOffset,p.buffer.byteLength);if(bytes.length!==p.bytes.length||!bytes.every((v,i)=>v===p.bytes[i]))changed.push(p.name+':buffer');}
          for(const[m,p]of state.materials)for(const key of ['opacity','depthTest','depthWrite'])if(m[key]!==p[key])changed.push(m.uuid+':'+key);
          window.spatialWeatherDiagnosticState=null;return {changed,objectCount:state.objects.length,bufferCount:state.buffers.length,materialCount:state.materials.size};
        });assert.deepEqual(unchanged.changed,[],'Legacy-order diagnostic restores every actual transform, buffer and material flag');
        assert.deepEqual(production.samples.map(p=>p.ndc),legacy.samples.map(p=>p.ndc),'Same cloud pixels are sampled over geometrically farther water');
        const differences=production.samples.map((p,i)=>({ndc:p.ndc,production:p.rgba,legacy:legacy.samples[i].rgba,maxRgbDelta:Math.max(...p.rgba.slice(0,3).map((v,n)=>Math.abs(v-legacy.samples[i].rgba[n])))}));
        assert(production.samples.length>0,'Actual cloud review contains cloud centres in front of geometrically farther ocean');
        const lastFrame=Math.max(...production.drawOrder.map(o=>o.frame)),draws=production.drawOrder.filter(o=>o.frame===lastFrame),firstCloud=draws.findIndex(o=>o.kind==='cloud'),waterIndices=draws.map((o,i)=>o.kind==='water'?i:-1).filter(i=>i>=0);
        assert(firstCloud>=0&&waterIndices.length>0&&Math.max(...waterIndices)<firstCloud,'Actual native receiver draws finish before translucent cloud draws');
        result.waterBackdrop={scope:'QA-only same paused opposite camera; only receiver backdrop Group render orders temporarily restored to legacy zero. Legacy PNG is diagnostic, not a final deliverable.',orders,production,legacy,unchanged,differences};
        pass('Paired native cloud-over-water diagnostic logs actual draw order and restores all production transforms, buffers, materials and render orders');
      }
      await page.evaluate(()=>{window.reviewCameraOverride=null;});await inspect('cloud-shade');
      // Tier/shelter shader and uploaded-uniform checks are finalized against
      // the production interfaces only after the root explicitly freezes them.
      pass('Opposite native review views render fixed cloud geometry with actual world Sun and shared relief maps');
    }
    if(enabled('optics')){
      result.opticalViews=[];
      for(const[name,state]of [['liquid','liquid'],['droplet','droplet'],['rain','rainLow']]){
        if(!opticalForms.includes(name))continue;
        await restore(state);const camera=await page.evaluate(()=>{const s=pilotReview.scene;s.updateMatrixWorld(true);const target=s.getObjectByName('pilot-water-parcel').getWorldPosition(new THREE.Vector3()),view=new THREE.PerspectiveCamera(42,pilotReview.camera.aspect,.1,3000);view.position.copy(target).add(new THREE.Vector3(8,5,12));view.lookAt(target);view.updateMatrixWorld(true);window.reviewCameraOverride=view;return {scope:'Fixture-only optical review camera around unchanged actual parcel geometry/materials and genuine kernel checkpoint.',position:view.position.toArray(),target:target.toArray()};});
        await capture(name+'-optics-follow');result.opticalViews.push({name,camera,...await opticalSample()});await inspect(name+'-optics-follow');
      }
      await page.evaluate(()=>{window.reviewCameraOverride=null;});pass('Actual liquid, droplet and rain parcel optical materials render at genuine paused checkpoints');
    }
    if(enabled('rain')){
      await restore('rainLow');await capture('rain-core-glints-ocean');result.rain=await rainSample();const paused=await rainSample();await page.waitForTimeout(180);assert.deepEqual((await rainSample()).objects,paused.objects,'Rain material uniforms and geometry freeze exactly at pause');await inspect('rain-core-glints-ocean');
      await page.setViewportSize({width:320,height:940});await restore('rainLow');await capture('rain-core-phone-320');await inspect('rain-core-phone-320');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1280,height:1000});pass('Actual rain core/glint view remains finite, paused and readable at desktop and320px');
    }
    if (enabled('rain-collection')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        window.rainCollectionSourceProbe = (before, after) => {
          const rain = pilotReview.scene.getObjectByName('pilot-rain-parcel'); rain.updateWorldMatrix(true, false);
          return { from: before.form, to: after.form, geometry: rain.geometry.uuid, material: rain.material.uuid,
            position: rain.getWorldPosition(new THREE.Vector3()).toArray(), scale: rain.getWorldScale(new THREE.Vector3()).toArray(),
            quaternion: rain.getWorldQuaternion(new THREE.Quaternion()).toArray(), elapsed: [before.elapsed, after.elapsed], mass: [before.mass, after.mass] };
        };
        window.rainCollectionHooked = new WeakSet(); window.rainCollectionReads = [];
      });
      const collectionDraw = async () => {
        await page.evaluate(() => {
          for (const name of ['pilot-liquid-parcel', 'pilot-phase-incoming-liquid', 'pilot-phase-liquid-memory']) {
            const object = pilotReview.scene.getObjectByName(name); if (!object || rainCollectionHooked.has(object)) continue;
            rainCollectionHooked.add(object); const previous = object.onAfterRender;
            object.onAfterRender = function(renderer, scene, camera, geometry, material) {
              if (previous) previous.apply(this, arguments);
              const uniform = material.userData.collectionCoverage; if (!uniform) return;
              const properties = renderer.properties.get(material), program = properties.currentProgram || properties.program, gl = renderer.getContext();
              const location = program?.program && gl.getUniformLocation(program.program, 'pilotCollectionCoverage');
              rainCollectionReads.push({ name: this.name, expected: uniform.value, uploaded: location === null || !program ? null : gl.getUniform(program.program, location) });
            };
          }
        });
        for (let draw = 0; draw < 2; draw++) {
          const before = await page.evaluate(() => { rainCollectionReads = []; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
          await page.waitForFunction(before => window.reviewRenderCount > before, before, { timeout: 90000 }); await page.evaluate(() => { window.reviewRenderActive = false; });
        }
      };
      const collectionSample = (linked = false) => page.evaluate(linked => {
        const scene = pilotReview.scene; scene.updateMatrixWorld(true);
        const phase = scene.getObjectByName('pilot-phase-handoff'), liquid = scene.getObjectByName('pilot-liquid-parcel');
        const memory = scene.getObjectByName('pilot-phase-liquid-memory'), preview = scene.getObjectByName('pilot-phase-incoming-liquid');
        const landing = scene.getObjectByName('pilot-ocean-landing'), ocean = scene.getObjectByName('pilot-ocean-surface');
        const vector = value => value?.toArray ? value.toArray() : null;
        const sample = object => {
          const ancestors = []; for (let p = object; p; p = p.parent) ancestors.push({ name: p.name, visible: p.visible });
          return { name: object.name, visible: object.visible, effectiveVisible: ancestors.every(p => p.visible), ancestors,
            position: object.position.toArray(), worldPosition: object.getWorldPosition(new THREE.Vector3()).toArray(), scale: object.scale.toArray(),
            worldScale: object.getWorldScale(new THREE.Vector3()).toArray(), quaternion: object.quaternion.toArray(),
            geometry: object.geometry?.uuid, material: object.material?.uuid, opacity: object.material?.opacity,
            coverage: object.material?.userData.collectionCoverage?.value, sourceCoverage: object.userData.sourceCoverage?.value,
            sourceSnapshot: object.userData.sourceSnapshot, sourcePosition: vector(object.userData.sourcePosition),
            sourceScale: vector(object.userData.sourceScale), sourceQuaternion: vector(object.userData.sourceQuaternion), placement: object.userData.placement,
            surfaceFloat: object.userData.surfaceFloat ? { ...object.userData.surfaceFloat } : null };
        };
        const rings = landing.children.filter(o => o.isMesh).map(o => ({ name: o.name, geometry: o.geometry.uuid, position: o.position.toArray(),
          scale: o.scale.toArray(), opacity: o.material.opacity, points: Array.from(o.geometry.attributes.position.array),
          wet: Array.from(o.geometry.attributes.landingWet.array) }));
        const materialDepth = new Map(), geometryIds = new Set(), materialIds = new Set(), programs = [];
        scene.traverse(o => { if (o.geometry) geometryIds.add(o.geometry.uuid); for (const material of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {
          materialIds.add(material.uuid); materialDepth.set(material.uuid, { uuid: material.uuid, depthTest: material.depthTest, depthWrite: material.depthWrite });
        } });
        if (linked) for (const object of [liquid, memory]) {
          const properties = pilotReview.renderer.properties.get(object.material), program = properties.currentProgram || properties.program;
          if (program?.fragmentShader) programs.push({ name: object.name, fragment: pilotReview.renderer.getContext().getShaderSource(program.fragmentShader) });
        }
        const snapshot = waterReviewData.pilot.snapshot;
        const receiver = scene.getObjectByName({ ocean: 'pilot-ocean-surface', lake: 'pilot-lake-water', stream: 'pilot-stream-water' }[landing.userData.surface || snapshot.landingSurface]);
        const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), point = new THREE.Vector3(), gaps = [];
        if (landing.visible && receiver) for (const ring of landing.children.filter(o => o.isMesh)) {
          const positions = ring.geometry.attributes.position, wet = ring.geometry.attributes.landingWet;
          for (let n = 1; n < positions.count; n += 7) {
            if (wet.getX(n) <= .5) continue; point.fromBufferAttribute(positions, n).applyMatrix4(ring.matrixWorld);
            ray.set(new THREE.Vector3(point.x, 500, point.z), down); const hit = ray.intersectObject(receiver, false)[0];
            if (hit) gaps.push(point.y - hit.point.y);
          }
        }
        const bodyPosition = liquid.getWorldPosition(new THREE.Vector3()), bodyScale = liquid.getWorldScale(new THREE.Vector3());
        let bodyFloat = { samples: 0, clearance: null, bottomY: bodyPosition.y - 3.1 * bodyScale.y };
        if (receiver) {
          ray.set(new THREE.Vector3(bodyPosition.x, 500, bodyPosition.z), down); const hit = ray.intersectObject(receiver, false)[0];
          if (hit) bodyFloat = { ...bodyFloat, samples: 1, clearance: bodyFloat.bottomY - hit.point.y, receivingY: hit.point.y };
        }
        const source = window.rainCollectionSourceProof || null;
        return { camera: document.querySelector('#wcPilotCanvas').dataset.pilotCamera, form: snapshot.form, elapsed: snapshot.elapsed, steps: rainCloudDepthTotalSteps,
          time: ocean.userData.surfaceShader?.uniforms.pilotRippleTime.value, phase: { visible: phase.visible, kind: phase.userData.kind,
            from: phase.userData.from, to: phase.userData.to, progress: phase.userData.progress, duration: phase.userData.duration, receiver: vector(phase.userData.collectionReceiver) },
          source, liquid: sample(liquid), memory: sample(memory), preview: preview ? { ...sample(preview), sharesGeometry: preview.geometry === liquid.geometry, sharesMaterial: preview.material === liquid.material } : null,
          landing: { visible: landing.visible, source: landing.userData.source, surface: landing.userData.surface, position: landing.position.toArray(), rotation: landing.rotation.toArray(), rings,
            gaps: { samples: gaps.length, min: gaps.length ? Math.min(...gaps) : null, max: gaps.length ? Math.max(...gaps) : null } },
          materialDepth: [...materialDepth.values()].sort((a, b) => a.uuid.localeCompare(b.uuid)), geometryIds: [...geometryIds].sort(), materialIds: [...materialIds].sort(),
          bodyFloat, reads: rainCollectionReads.slice(), programs, receipt: waterReviewData.pilot.lastChange };
      }, linked);
      const checkCollection = (state, body) => {
        assert.equal(state.form, 'liquid'); assert.equal(state.phase.kind, 'collection'); assert(state.phase.visible);
        assert.equal(state.phase.from, 'rain'); assert.equal(state.phase.to, 'liquid'); assert.equal(state.landing.surface, body); assert(state.landing.visible);
        assert(state.liquid.coverage > 0 && state.liquid.coverage < 1); assert(Math.abs(state.phase.duration - .85) < 1e-12);
        assert(state.source && state.source.from === 'rain' && state.source.to === 'liquid');
        assert.equal(state.memory.geometry, state.source.geometry); assert(state.memory.sourceSnapshot);
        assert(maxDelta(state.memory.sourcePosition, state.source.position) < 1e-7); assert(maxDelta(state.memory.sourceScale, state.source.scale) < 1e-7);
        assert(maxDelta(state.memory.sourceQuaternion, state.source.quaternion) < 1e-10);
        assert(state.preview && state.preview.sharesGeometry && state.preview.sharesMaterial);
        assert.equal(state.preview.effectiveVisible, state.camera === 'water');
        const target = state.camera === 'water' ? 'pilot-phase-incoming-liquid' : 'pilot-liquid-parcel';
        const reads = state.reads.filter(read => read.name === target); assert(reads.length > 0 && reads.every(read => read.uploaded !== null && Math.abs(read.uploaded - read.expected) < 1e-6));
        assert(state.landing.gaps.samples > 20 && state.landing.gaps.min > .02 && state.landing.gaps.max < .25, JSON.stringify(state.landing.gaps));
        return { coverage: state.liquid.coverage, progress: state.phase.progress, uploadedSamples: reads.length, receiverGaps: state.landing.gaps };
      };
      const immutable = state => ({ phase: state.phase, liquid: state.liquid, memory: state.memory, preview: state.preview, landing: state.landing, time: state.time });
      const assertCollectionPaused = (actual, expected) => {
        const a = structuredClone(immutable(actual)), b = structuredClone(immutable(expected));
        for (const name of ['liquid', 'memory', 'preview']) for (const key of ['worldPosition', 'worldScale', 'quaternion']) {
          assert(maxDelta(a[name][key], b[name][key]) < (key === 'worldPosition' ? 1e-7 : 1e-12), 'Paused camera-relative lens only retains negligible matrix roundoff');
          a[name][key] = null; b[name][key] = null;
        }
        assert.deepEqual(a, b, 'Pause freezes local collection poses, coverage, masks, ripple buffers and clocks');
      };
      const collectionScope = arg('collection-checks') || 'all';
      const selectedCollectionBodies = collectionScope === 'reset' ? [] : collectionScope === 'stream-reset' ? ['stream'] : ['ocean', 'lake', 'stream'];
      const dismissCycleComplete = async () => { const keepFlying = page.getByRole('button', { name: 'Keep flying', exact: true }); if (await keepFlying.count()) await keepFlying.click(); };
      const routes = []; result.rainCollection = { scope: collectionScope, routes, journeys: await page.evaluate(() => rainCollectionJourneys) };
      for (const body of selectedCollectionBodies) {
        const mode = body === 'lake' ? 'water' : 'follow';
        const before = await trigger('collection-' + body, { cameraMode: mode });
        await page.evaluate(() => { window.rainCloudDepthSteadyInput = { sunlit: false, dropletHit: false, nucleusHit: false, thrust: 0 }; });
        await collectionDraw(); const first = await collectionSample(true), route = { body, before, first }; routes.push(route);
        route.firstProof = checkCollection(first, body);
        assert(first.programs.some(program => program.name === 'pilot-liquid-parcel' && program.fragment.includes('pilotCollectionCoverage')), 'Actual incoming liquid program contains collection coverage');
        assert.deepEqual(first.geometryIds, before.geometryIds); assert.deepEqual(first.materialIds, before.materialIds);
        await page.getByRole('button', { name: 'Continue journey', exact: true }).click(); await dismissCycleComplete(); await pause(); await collectionDraw();
        const clean = await collectionSample(); route.clean = clean; checkCollection(clean, body);
        if (body === 'ocean') await capture('rain-collection-ocean-follow');
        await page.waitForTimeout(150); const frozen = await collectionSample(); assertCollectionPaused(frozen, clean);
        await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .48); await pause(); await collectionDraw();
        const middle = await collectionSample(); route.middle = middle; route.middleProof = checkCollection(middle, body);
        assert(middle.liquid.coverage > first.liquid.coverage && middle.memory.opacity < first.memory.opacity);
        if (body === 'lake') await capture('rain-collection-lake-water'); if (body === 'stream') await capture('rain-collection-stream-follow');
        const opposite = mode === 'water' ? 'Follow view' : 'Water view'; await page.getByRole('button', { name: opposite, exact: true }).click(); await settle(); await collectionDraw();
        const switched = await collectionSample(); route.switched = switched; checkCollection(switched, body); assert.equal(switched.liquid.coverage, middle.liquid.coverage);
        assert.deepEqual(switched.memory.sourcePosition, middle.memory.sourcePosition); assert.deepEqual(switched.memory.sourceScale, middle.memory.sourceScale);
        if (switched.camera === 'follow') assert.deepEqual(switched.materialDepth, before.materialDepth.map(material => material.uuid === switched.liquid.material ? { ...material, depthWrite: false } : material));
        await page.getByRole('button', { name: mode === 'water' ? 'Water view' : 'Follow view', exact: true }).click(); await settle();
        await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden'); await pause(); await collectionDraw();
        const expired = await collectionSample(); route.expired = expired;
        assert.equal(expired.liquid.coverage, 1); assert.deepEqual(expired.liquid.position, [0, expired.liquid.surfaceFloat.restY, 0]); assert(!expired.memory.effectiveVisible && !expired.preview.effectiveVisible);
        assert.equal(expired.liquid.surfaceFloat.model, 'receiving-water-parcel'); assert.equal(expired.liquid.surfaceFloat.clearance, .1);
        assert.equal(expired.bodyFloat.samples, 1); assert(Math.abs(expired.bodyFloat.clearance - .13) < 1e-5, JSON.stringify(expired.bodyFloat));
        assert.deepEqual(expired.materialDepth, before.materialDepth); assert.deepEqual(expired.geometryIds, before.geometryIds); assert.deepEqual(expired.materialIds, before.materialIds);
        assert(expired.landing.gaps.samples > 20 && expired.landing.gaps.min > .02 && expired.landing.gaps.max < .25);
        if (body === 'ocean') {
          const arrivedAt = first.time;
          await resume(); await page.waitForFunction(arrivedAt => pilotReview.scene.getObjectByName('pilot-ocean-surface').userData.surfaceShader.uniforms.pilotRippleTime.value >= arrivedAt + 1.53, arrivedAt); await pause(); await collectionDraw();
          const terminal = await collectionSample(); route.terminal = terminal; const age = terminal.time - arrivedAt;
          assert(age >= 1.53 && age < 1.8 && terminal.landing.visible, 'Actual rain ripple enters its terminal fade before hiding');
          const terminalFade = Math.max(0, Math.min(1, (1.8 - age) / .35));
          let maxOpacityError = 0;
          terminal.landing.rings.forEach((ring, index) => {
            const ringAge = Math.max(0, age + .1 - index * .16), expected = ringAge > 0 ? Math.max(0, .68 * (1 - ringAge / 1.8)) * terminalFade : 0;
            maxOpacityError = Math.max(maxOpacityError, Math.abs(ring.opacity - expected));
          });
          route.terminalProof = { age, terminalFade, maxOpacityError }; assert(maxOpacityError < 1e-8, JSON.stringify(route.terminalProof));
          await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.waterLanding === 'hidden'); await pause();
          route.landingExpired = await collectionSample(); assert(!route.landingExpired.landing.visible);
        }
      }
      if (routes.length) {
        pass('Genuine collection routes (' + routes.map(route => route.body).join(', ') + ') preserve captured actual rain poses, native incoming coverage and shared liquid previews');
        pass('Pause and both camera views retain collection source/coverage; expiry restores primary placement, original depth flags and the unchanged resource pool');
        pass('Collection ripples follow the actual receiving meshes before and after the merge');
      }

      await page.emulateMedia({ reducedMotion: 'reduce' }); const reducedBefore = await trigger('collection-ocean', { cameraMode: 'water' }); await collectionDraw();
      const reduced = await collectionSample(); result.rainCollection.reduced = reduced; checkCollection(reduced, 'ocean');
      await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 3, reduced.steps); await pause(); await collectionDraw();
      const reducedLater = await collectionSample(); result.rainCollection.reducedLater = reducedLater;
      assert(reducedLater.steps > reduced.steps && reducedLater.phase.visible); assert.equal(reducedLater.phase.progress, reduced.phase.progress); assert.equal(reducedLater.liquid.coverage, reduced.liquid.coverage); assert.equal(reducedLater.time, reduced.time);
      await dismissCycleComplete(); await pause(); await collectionDraw();
      const beforeReset = await collectionSample(); result.rainCollection.beforeReset = beforeReset; assert(beforeReset.phase.visible && beforeReset.liquid.coverage < 1);
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); await pause(); await collectionDraw();
      const reset = await collectionSample(); result.rainCollection.reset = reset;
      assert(!reset.phase.visible && !reset.memory.effectiveVisible && !reset.preview.effectiveVisible && !reset.landing.visible);
      assert.equal(reset.liquid.coverage, 1); assert.deepEqual(reset.liquid.position, [0, reset.liquid.surfaceFloat.restY, 0]); assert.deepEqual(reset.materialDepth, reducedBefore.materialDepth);
      await restore('collected-lake', { cameraMode: 'water' }); await collectionDraw(); const restored = await collectionSample(); result.rainCollection.restored = restored;
      assert(!restored.phase.visible && !restored.memory.effectiveVisible && !restored.preview.effectiveVisible && !restored.landing.visible && restored.liquid.coverage === 1);
      pass('Reduced motion holds representative collection coverage while kernel steps advance; resetting an active Water-view collection and restoring collected liquid clear all cues');
      result.rainCollection.evidence = { scope: collectionScope, routeBodies: routes.map(route => route.body), sourcePoseExact: routes.length > 0, coverageAdvances: routes.length > 0, sharedPreviews: routes.length > 0,
        receiverRanges: routes.map(route => ({ body: route.body, early: route.first.landing.gaps, middle: route.middle.landing.gaps, expired: route.expired.landing.gaps, postCueBody: route.expired.bodyFloat })),
        reducedSteps: [reduced.steps, reducedLater.steps], activeResetTested: true, restoreClears: true,
        rapidEvaporation: { naturallyReachableDuringCollection: false, firstEvaporationSeconds: result.rainCollection.journeys[0].route[0].elapsed, cueDuration: .85,
          scope: 'Original tropical evaporation from zero energy requires7.3seconds; no artificial energy or mismatched kernel/phase clocks force an overlap. Coverage-carry guard is reviewed separately.' } };
    }
    if (enabled('rain-emission') || enabled('rain-onset')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        window.rainEmissionSourceProbe = (before, after) => {
          const cloud = pilotReview.scene.getObjectByName('pilot-self-cloud');
          cloud.updateWorldMatrix(true, false);
          return { from: before.form, to: after.form, elapsed: [before.elapsed, after.elapsed],
            rootPosition: cloud.getWorldPosition(new THREE.Vector3()).toArray() };
        };
      });
      const emissionDraw = async () => {
        for (let draw = 0; draw < 2; draw++) {
          const before = await page.evaluate(() => { window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
          await page.waitForFunction(before => window.reviewRenderCount > before, before, { timeout: 90000 });
          await page.evaluate(() => { window.reviewRenderActive = false; });
        }
      };
      const emissionSample = () => page.evaluate(() => {
        const scene = pilotReview.scene; scene.updateMatrixWorld(true);
        const field = scene.getObjectByName('pilot-rain-field'), ribbons = scene.getObjectByName('pilot-rain-ribbons');
        const impacts = scene.getObjectByName('pilot-rain-water-impacts'), memory = scene.getObjectByName('pilot-phase-cloud-memory');
        const phase = scene.getObjectByName('pilot-phase-handoff'), ocean = scene.getObjectByName('pilot-ocean-surface');
        const sample = object => {
          const positions = object.geometry.attributes.position, world = [], vector = new THREE.Vector3();
          for (let n = 0; n < positions.count; n++) { vector.fromBufferAttribute(positions, n).applyMatrix4(object.matrixWorld); world.push(...vector.toArray()); }
          const ancestors = []; for (let p = object; p; p = p.parent) ancestors.push({ uuid: p.uuid, name: p.name, visible: p.visible });
          return { uuid: object.uuid, parentUuid: object.parent?.uuid, parentName: object.parent?.name,
            position: object.position.toArray(), geometry: object.geometry.uuid, visible: object.visible, effectiveVisible: ancestors.every(p => p.visible), ancestors,
            local: Array.from(positions.array), world, alpha: Array.from(object.geometry.attributes.rainAlpha.array) };
        };
        const primary = scene.getObjectByName('pilot-rain-parcel'), primaryAncestors = []; for (let p = primary; p; p = p.parent) primaryAncestors.push({ name: p.name, visible: p.visible });
        return { emission: { ...field.userData.emission }, sharedEmission: field.userData.emission === ribbons.userData.emission && field.userData.emission === impacts.userData.emission,
          advection: { ...field.userData.advection }, sharedAdvection: field.userData.advection === ribbons.userData.advection,
          profiles: Array.from(field.userData.dropProfile), sharedProfiles: field.userData.dropProfile === ribbons.userData.dropProfile,
          source: window.rainEmissionSourceProof || null, time: ocean.userData.surfaceShader.uniforms.pilotRippleTime.value,
          steps: rainCloudDepthTotalSteps, elapsed: waterReviewData.pilot.snapshot.elapsed, form: waterReviewData.pilot.snapshot.form, camera: document.querySelector('#wcPilotCanvas').dataset.pilotCamera,
          primary: { geometry: primary.geometry.uuid, material: primary.material.uuid, visible: primary.visible, effectiveVisible: primaryAncestors.every(p => p.visible), ancestors: primaryAncestors },
          phase: { visible: phase.visible, kind: phase.userData.kind, progress: phase.userData.progress }, memoryVisible: memory.visible,
          field: sample(field), ribbons: sample(ribbons), impacts: sample(impacts) };
      });
      const validateEmission = (snapshot, label) => {
        assert(snapshot.sharedEmission && snapshot.sharedAdvection && snapshot.sharedProfiles, label + ' uses shared stable rain metadata');
        assert.equal(snapshot.emission.model, 'captured-cloud-shelf'); assert.equal(snapshot.profiles.length, 84 * 4);
        const worldTop = Math.min(snapshot.field.position[1] + 60, snapshot.emission.active ? snapshot.emission.ceilingY : Infinity);
        const localTop = worldTop - snapshot.field.position[1];
        let activeThreads = 0, activeRibbons = 0, maxAboveCeiling = -Infinity, maxPathError = 0, fadeSamples = 0;
        for (const [name, object] of [['threads', snapshot.field], ['ribbons', snapshot.ribbons]]) {
          assert(object.local.every(Number.isFinite) && object.world.every(Number.isFinite) && object.alpha.every(Number.isFinite));
          for (let vertex = 0; vertex < object.alpha.length; vertex++) {
            if (object.alpha[vertex] <= 1e-7) continue;
            const y = object.world[vertex * 3 + 1], gap = worldTop - y;
            assert(gap >= -3e-5, label + ' ' + name + ' must not appear above the actual source/slab plane');
            maxAboveCeiling = Math.max(maxAboveCeiling, -gap);
            if (name === 'threads') activeThreads++; else activeRibbons++;
          }
        }
        for (let vertex = 0; vertex < snapshot.field.alpha.length; vertex++) {
          const rf = Math.floor(vertex / 4), i = vertex * 3, alpha = snapshot.field.alpha[vertex];
          if (alpha <= 1e-7) continue;
          const slope = snapshot.advection.horizontalSpeed / snapshot.profiles[rf * 4], y = snapshot.field.local[i + 1];
          const expectedX = -48 + ((rf * 37) % 97) + slope * (60 - y);
          maxPathError = Math.max(maxPathError, Math.abs(snapshot.field.local[i] - expectedX));
          const topDistance = localTop - y, baseAlpha = [0.025, 0.25, 0.25, 0.76][vertex % 4] * snapshot.profiles[rf * 4 + 3];
          const headY = 60 - ((((rf * 53) % 120) + snapshot.time * snapshot.profiles[rf * 4]) % 120);
          const headU = Math.max(0, Math.min(1, (headY + 60) / 4)), headGate = headU * headU * (3 - 2 * headU);
          assert(alpha <= baseAlpha * headGate + .000003, label + ' whole streak fades with its head before wrap, including the bright tail');
          if (topDistance > .01 && topDistance < 3.99) { assert(alpha < baseAlpha + 1e-6, label + ' upper boundary softens each visible thread'); fadeSamples++; }
        }
        assert(activeThreads > 0 && activeRibbons > 0, label + ' keeps actual rain visible');
        assert(maxPathError < .00004, label + ' clipped rain stays on its existing wind-slanted trajectory');
        return { activeThreads, activeRibbons, worldTop, maxAboveCeiling, maxPathError, fadeSamples };
      };
      if (enabled('rain-onset')) {
        const compactOnset = state => ({ emission: state.emission, time: state.time, steps: state.steps, elapsed: state.elapsed, form: state.form, camera: state.camera, phase: state.phase });
        const validateOnset = (state, label) => {
          assert(state.sharedEmission && state.sharedAdvection && state.sharedProfiles, label + ' shares source, profiles and advection');
          assert.equal(state.emission.frontModel, 'source-born-fall-front'); assert.equal(state.profiles.length, 84 * 4);
          assert(Number.isFinite(state.emission.age) && state.emission.age >= 0);
          const worldTop = Math.min(state.field.position[1] + 60, state.emission.active ? state.emission.ceilingY : Infinity);
          let activeThreads = 0, activeRibbons = 0, maxBelowFront = -Infinity, maxAboveCap = -Infinity, maxPathError = 0, frontFadeSamples = 0;
          for (const [name, object, stride] of [['threads', state.field, 4], ['ribbons', state.ribbons, 8]]) {
            assert(object.local.every(Number.isFinite) && object.world.every(Number.isFinite) && object.alpha.every(Number.isFinite));
            for (let vertex = 0; vertex < object.alpha.length; vertex++) {
              if (object.alpha[vertex] <= 1e-7) continue;
              const rf = Math.floor(vertex / stride), y = object.world[vertex * 3 + 1];
              const front = state.field.position[1] + state.emission.ceilingY - state.emission.originY - state.profiles[rf * 4] * state.emission.age;
              const lowerExcess = state.emission.active ? front - y : -Infinity;
              maxBelowFront = Math.max(maxBelowFront, lowerExcess); maxAboveCap = Math.max(maxAboveCap, y - worldTop);
              assert(lowerExcess <= .00003 && y <= worldTop + .00003, label + ' ' + name + ' stays inside its source-born envelope');
              if (name === 'threads') {
                activeThreads++;
                const localY = object.local[vertex * 3 + 1], slope = state.advection.horizontalSpeed / state.profiles[rf * 4];
                maxPathError = Math.max(maxPathError, Math.abs(object.local[vertex * 3] - (-48 + ((rf * 37) % 97) + slope * (60 - localY))));
                const frontDistance = y - front;
                if (state.emission.active && frontDistance > .01 && frontDistance < 3.99) {
                  const base = [0.025, .25, .25, .76][vertex % 4] * state.profiles[rf * 4 + 3];
                  assert(object.alpha[vertex] < base + 1e-6); frontFadeSamples++;
                }
              } else activeRibbons++;
            }
          }
          assert(maxPathError < .00004, label + ' retains original wind-slanted centreline');
          return { activeThreads, activeRibbons, maxBelowFront: Number.isFinite(maxBelowFront) ? maxBelowFront : 0,
            maxAboveCap: Number.isFinite(maxAboveCap) ? maxAboveCap : 0, maxPathError, frontFadeSamples, worldTop };
        };
        const sourcePool = state => [state.field.geometry, state.ribbons.geometry, state.impacts.geometry, state.primary.geometry, state.primary.material];
        const contactProof = () => page.evaluate(() => {
          const scene = pilotReview.scene; scene.updateMatrixWorld(true);
          const field = scene.getObjectByName('pilot-rain-field'), pool = scene.getObjectByName('pilot-rain-water-impacts');
          const emission = field.userData.emission, profiles = field.userData.dropProfile, positions = pool.geometry.attributes.position, alpha = pool.geometry.attributes.rainAlpha;
          const water = ['pilot-ocean-surface', 'pilot-lake-water', 'pilot-stream-water'].map(name => scene.getObjectByName(name)).filter(object => { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; });
          const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), point = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
          const sampleWater = (x, z) => { ray.set(new THREE.Vector3(x, 500, z), down); const hit = ray.intersectObjects(water, false)[0]; return hit ? hit.point.y + .03 : -Infinity; };
          const time = scene.getObjectByName('pilot-ocean-surface').userData.surfaceShader.uniforms.pilotRippleTime.value;
          const events = [], gaps = []; let maxBirthExcess = -Infinity;
          for (let rf = 0; rf < 84; rf++) {
            let active = false; for (let v = rf * 29 * 2; v < (rf + 1) * 29 * 2; v++) if (alpha.getX(v) > 0) { active = true; break; }
            if (!active) continue;
            const speed = profiles[rf * 4], phase = (((rf * 53) % 120) + time * speed) % 120;
            const slope = field.userData.advection.horizontalSpeed / speed, seedX = -48 + ((rf * 37) % 97), localZ = -42 + ((rf * 61) % 89);
            let surface = sampleWater(field.position.x + seedX + slope * phase, field.position.z + localZ), impactPhase = 60 + field.position.y - surface;
            for (let n = 0; n < 2 && Number.isFinite(surface); n++) { surface = sampleWater(field.position.x + seedX + slope * impactPhase, field.position.z + localZ); impactPhase = 60 + field.position.y - surface; }
            const impactAge = (phase - impactPhase) / speed, travelTime = Math.max(0, (emission.ceilingY - emission.originY + field.position.y - surface) / speed);
            const birthExcess = travelTime - (emission.age - impactAge); maxBirthExcess = Math.max(maxBirthExcess, birthExcess);
            events.push({ rf, speed, surface, impactAge, travelTime, sourceAge: emission.age, birthExcess });
            for (let segment = 0; segment < 14; segment++) {
              const vertex = (rf * 29 + segment) * 2; if (alpha.getX(vertex) <= 0) continue;
              a.fromBufferAttribute(positions, vertex).applyMatrix4(pool.matrixWorld); b.fromBufferAttribute(positions, vertex + 1).applyMatrix4(pool.matrixWorld);
              for (const fraction of [0, .5, 1]) { point.copy(a).lerp(b, fraction); const height = sampleWater(point.x, point.z); if (Number.isFinite(height)) gaps.push(point.y - (height - .03)); }
            }
          }
          return { activeProfiles: events.length, events, maxBirthExcess, samples: gaps.length, minGap: Math.min(...gaps), maxGap: Math.max(...gaps) };
        });
        result.rainOnset = {};
        await trigger('rainRelease', { cameraMode: 'follow' }); await emissionDraw();
        const first = await emissionSample(); result.rainOnset.first = first;
        assert(first.source && first.source.from === 'cloud' && first.source.to === 'rain');
        assert(first.emission.active && Math.abs(first.emission.ceilingY - first.source.rootPosition[1]) < 1e-6);
        assert.equal(first.emission.startedAt, first.source.elapsed[1]); assert.equal(first.emission.originY, first.field.position[1]); assert.equal(first.emission.age, 0);
        const firstProof = validateOnset(first, 'First paused release'); result.rainOnset.firstProof = firstProof;
        assert.equal(firstProof.activeThreads, 0); assert.equal(firstProof.activeRibbons, 0); assert(first.impacts.alpha.every(value => value === 0));
        assert(first.primary.effectiveVisible && first.memoryVisible); await capture('rain-onset-first-pause');
        await page.waitForTimeout(160); const paused = await emissionSample(); assert.deepEqual(paused, first);
        await page.getByRole('button', { name: 'Continue journey', exact: true }).click();
        await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-rain-field').userData.emission.age >= .4); await pause(); await emissionDraw();
        const growing = await emissionSample(); result.rainOnset.growing = growing;
        const growingProof = validateOnset(growing, 'Growing curtain'); result.rainOnset.growingProof = growingProof;
        assert(growingProof.activeThreads > 0 && growingProof.activeRibbons > 0); assert(growing.emission.age > first.emission.age);
        assert.deepEqual(sourcePool(growing), sourcePool(first)); await capture('rain-onset-growing-follow');
        await page.waitForTimeout(150); assert.deepEqual(await emissionSample(), growing);
        await page.getByRole('button', { name: 'Look', exact: true }).click(); await page.getByRole('button', { name: 'Look left', exact: true }).click(); await settle(); await emissionDraw();
        const looked = await emissionSample(); assert.deepEqual(looked.field, growing.field); assert.deepEqual(looked.impacts, growing.impacts); assert.deepEqual(looked.emission, growing.emission); validateOnset(looked, 'Paused Look');
        await page.getByRole('button', { name: 'Look', exact: true }).click(); await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await emissionDraw();
        const water = await emissionSample(); assert.deepEqual(water.field, growing.field); assert.deepEqual(water.impacts, growing.impacts); assert.deepEqual(water.emission, growing.emission); validateOnset(water, 'Paused Water view');
        await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'rain' && Number(document.querySelector('#wcPilotCanvas').dataset.rainWaterImpactCount) > 0, null, { timeout: 90000 }); await pause(); await emissionDraw();
        const arrival = await emissionSample(); result.rainOnset.arrival = arrival;
        const arrivalProof = validateOnset(arrival, 'Source-born water arrival'); result.rainOnset.arrivalProof = arrivalProof;
        const contacts = await contactProof(); result.rainOnset.contacts = contacts;
        assert(contacts.activeProfiles > 0 && contacts.maxBirthExcess < .00003, JSON.stringify(contacts));
        assert(contacts.samples > 0 && contacts.minGap > .04 && contacts.maxGap < .12, JSON.stringify(contacts));
        assert.deepEqual(sourcePool(arrival), sourcePool(first)); await capture('rain-onset-water-arrival');
        pass('First genuine rain pause retains its actual drop/cloud source while the pooled curtain emerges through source-born trajectory fronts');
        pass('Native clipped rain retains wind paths, fixed cloud cap, pause/Look/view continuity and the same pooled geometry/materials');
        pass('Actual solved water-contact events begin only after their source-born travel interval and retain receiving-mesh clearance');

        await page.emulateMedia({ reducedMotion: 'reduce' }); await trigger('rainRelease', { cameraMode: 'follow' }); await emissionDraw();
        const reduced = await emissionSample(); result.rainOnset.reduced = compactOnset(reduced); validateOnset(reduced, 'Initial reduced-motion source'); assert.equal(reduced.emission.age, .6);
        await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 4, reduced.steps); await pause(); await emissionDraw();
        const reducedLater = await emissionSample(); result.rainOnset.reducedLater = compactOnset(reducedLater); validateOnset(reducedLater, 'Held reduced-motion source');
        assert(reducedLater.steps > reduced.steps); assert.equal(reducedLater.emission.age, reduced.emission.age); assert.equal(reducedLater.time, reduced.time);
        result.rainOnset.beforeReset = compactOnset(reducedLater); assert(reducedLater.emission.active);
        await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); await pause(); await emissionDraw();
        const reset = await emissionSample(), visibility = object => ({ uuid: object.uuid, parentUuid: object.parentUuid, visible: object.visible, effectiveVisible: object.effectiveVisible, ancestors: object.ancestors });
        result.rainOnset.reset = { ...compactOnset(reset), field: visibility(reset.field), ribbons: visibility(reset.ribbons), impacts: visibility(reset.impacts) };
        assert(!reset.emission.active && reset.emission.ceilingY === 0 && reset.emission.originY === 0 && reset.emission.startedAt === 0 && reset.emission.age === 0);
        assert(!reset.field.effectiveVisible && !reset.ribbons.effectiveVisible && !reset.impacts.effectiveVisible);
        await restore('rainHigh', { pauseAtChanges: false }); await emissionDraw(); const restored = await emissionSample(); result.rainOnset.restored = compactOnset(restored);
        assert(!restored.emission.active && restored.emission.startedAt === 0 && restored.emission.age === 0 && restored.emission.originY === 0);
        assert(restored.field.position[1] > 100);
        const smooth = distance => { const u = Math.max(0, Math.min(1, distance / 4)); return u * u * (3 - 2 * u); };
        let maxPositionError = 0, maxAlphaError = 0, upperFadeSamples = 0, lowerFadeSamples = 0;
        for (let vertex = 0; vertex < restored.field.alpha.length; vertex++) {
          const rf = Math.floor(vertex / 4), speed = restored.profiles[rf * 4], length = restored.profiles[rf * 4 + 1];
          const head = 60 - ((((rf * 53) % 120) + restored.time * speed) % 120), tail = head + length;
          const along = [0, .55, .55, 1][vertex % 4], y = Math.min(60, tail - length * along), slope = restored.advection.horizontalSpeed / speed;
          const expected = [-48 + ((rf * 37) % 97) + slope * (60 - y), y, -42 + ((rf * 61) % 89)];
          for (let axis = 0; axis < 3; axis++) maxPositionError = Math.max(maxPositionError, Math.abs(restored.field.local[vertex * 3 + axis] - expected[axis]));
          const base = [.025, .25, .25, .76][vertex % 4] * restored.profiles[rf * 4 + 3], expectedAlpha = head >= 60 ? 0 : base * smooth(60 - y) * smooth(head + 60);
          maxAlphaError = Math.max(maxAlphaError, Math.abs(restored.field.alpha[vertex] - expectedAlpha));
          if (head > -60 && head < -56 && restored.field.alpha[vertex] > 0) lowerFadeSamples++; if (y > 56 && y < 60 && restored.field.alpha[vertex] > 0) upperFadeSamples++;
        }
        result.rainOnset.inactiveProof = { maxPositionError, maxAlphaError, upperFadeSamples, lowerFadeSamples };
        assert(maxPositionError < .00004 && maxAlphaError < .000003 && upperFadeSamples > 0 && lowerFadeSamples > 0, JSON.stringify(result.rainOnset.inactiveProof));
        result.rainOnset.evidence = { firstAge: first.emission.age, firstSourceY: first.emission.ceilingY, originY: first.emission.originY,
          first: firstProof, growingAge: growing.emission.age, growing: growingProof, arrivalAge: arrival.emission.age, arrival: arrivalProof, contacts,
          pauseExact: true, lookFixedThreads: true, modeFixedThreads: true, sameResourcePool: true, activeSourceReset: true,
          reducedSteps: [reduced.steps, reducedLater.steps], reducedAge: reduced.emission.age, inactiveFullVolume: result.rainOnset.inactiveProof,
          frontModel: 'trajectory-relative onset envelope inside the parcel-following rain field, bounded above by the fixed genuine cloud shelf' };
        pass('Reduced motion holds its representative onset front while kernel steps advance; active reset clears the source and restored high rain retains the original full-volume equations');
      }
      if (enabled('rain-emission')) {
      const compact = snapshot => ({ emission: snapshot.emission, time: snapshot.time, steps: snapshot.steps, form: snapshot.form, phase: snapshot.phase });
      await trigger('rainRelease', { cameraMode: 'follow' }); await emissionDraw();
      const first = await emissionSample(), source = first.source;
      assert(source && source.from === 'cloud' && source.to === 'rain');
      assert(first.emission.active && Math.abs(first.emission.ceilingY - source.rootPosition[1]) < 1e-6, 'Rain emission captures the actual pre-render cloud shelf world height');
      const firstProof = validateEmission(first, 'First genuine release');
      result.rainEmission = { source, first: compact(first), firstProof };
      await page.getByRole('button', { name: 'Continue journey', exact: true }).click(); await pause(); await emissionDraw();
      const early = await emissionSample(), earlyProof = validateEmission(early, 'Unobscured early release');
      Object.assign(result.rainEmission, { early, earlyProof });
      assert(early.phase.visible && early.phase.kind === 'precipitation-release' && early.phase.progress < .6);
      assert.equal(await page.locator('.wc-pilot-notice').count(), 0); await capture('rain-emission-early-follow');
      await page.waitForTimeout(160); const paused = await emissionSample(); assert.deepEqual(paused, early, 'Pause freezes world rain paths, cap, contacts and shared clock exactly');
      await page.getByRole('button', { name: 'Look', exact: true }).click(); await page.getByRole('button', { name: 'Look left', exact: true }).click(); await settle(); await emissionDraw();
      const looked = await emissionSample(); assert.deepEqual(looked.field, early.field); assert.deepEqual(looked.impacts, early.impacts); assert.deepEqual(looked.emission, early.emission);
      validateEmission(looked, 'Paused Look'); await page.getByRole('button', { name: 'Look', exact: true }).click();
      await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await emissionDraw();
      const water = await emissionSample(); assert.deepEqual(water.field, early.field); assert.deepEqual(water.impacts, early.impacts); assert.deepEqual(water.emission, early.emission); validateEmission(water, 'Paused Water view');
      await page.getByRole('button', { name: 'Follow view', exact: true }).click(); await settle(); await resume();
      await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden' && document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'rain');
      await pause(); await emissionDraw(); const afterExpiry = await emissionSample(), afterProof = validateEmission(afterExpiry, 'After source-memory expiry');
      Object.assign(result.rainEmission, { afterExpiry, afterProof });
      assert(!afterExpiry.memoryVisible && afterExpiry.emission.active); assert.equal(afterExpiry.emission.ceilingY, early.emission.ceilingY);
      assert(afterExpiry.steps > early.steps && afterExpiry.time > early.time); await capture('rain-emission-after-memory-follow');
      pass('Genuine rain captures the actual cloud shelf, keeps world vertices below its fixed cap, and retains that cap after source-memory expiry');
      pass('Clipped threads retain their original wind trajectories, while pause, Look and Water/Follow preserve fixed world source boundaries and paths');

      await page.emulateMedia({ reducedMotion: 'reduce' }); await emissionDraw(); const reducedActive = await emissionSample();
      await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 4, reducedActive.steps); await pause(); await emissionDraw();
      const reducedActiveLater = await emissionSample(); assert(reducedActiveLater.steps > reducedActive.steps); assert.equal(reducedActiveLater.time, reducedActive.time);
      assert.equal(reducedActiveLater.emission.ceilingY, early.emission.ceilingY); validateEmission(reducedActiveLater, 'Reduced-motion source cap');
      await restore('rainHigh', { pauseAtChanges: false }); await emissionDraw(); const restored = await emissionSample();
      assert.equal(restored.emission.active, false, 'A restored rain checkpoint invents no missing cloud source');
      assert(restored.field.position[1] > 100, 'Genuine high rain keeps all receiving water far below the decorative slab for an isolated edge-fade check');
      let lowerFadeSamples = 0, upperFadeSamples = 0, maxFadeError = 0;
      const edgeEase = distance => { const u = Math.max(0, Math.min(1, distance / 4)); return u * u * (3 - 2 * u); };
      for (let vertex = 0; vertex < restored.field.alpha.length; vertex++) {
        const rf = Math.floor(vertex / 4), y = restored.field.local[vertex * 3 + 1];
        const baseAlpha = [0.025, 0.25, 0.25, 0.76][vertex % 4] * restored.profiles[rf * 4 + 3];
        const headY = 60 - ((((rf * 53) % 120) + restored.time * restored.profiles[rf * 4]) % 120);
        const expected = baseAlpha * edgeEase(60 - y) * edgeEase(headY + 60);
        maxFadeError = Math.max(maxFadeError, Math.abs(restored.field.alpha[vertex] - expected));
        if (headY > -60 && headY < -56 && restored.field.alpha[vertex] > 0) lowerFadeSamples++;
        if (y < 60 && y > 56 && restored.field.alpha[vertex] > 0) upperFadeSamples++;
      }
      assert(lowerFadeSamples > 0 && upperFadeSamples > 0 && maxFadeError < .000003, JSON.stringify({ lowerFadeSamples, upperFadeSamples, maxFadeError }));
      await resume(); await page.waitForFunction(steps => rainCloudDepthTotalSteps > steps + 4, restored.steps); await pause(); await emissionDraw();
      const restoredLater = await emissionSample(); assert(restoredLater.steps > restored.steps); assert.equal(restoredLater.time, restored.time);
      assert.deepEqual(restoredLater.field.local, restored.field.local, 'Reduced-motion restored rain keeps exact decorative trajectories while the genuine parcel descends');
      result.rainEmission.lifecycle = { reduced: compact(reducedActive), reducedLater: compact(reducedActiveLater), restored: compact(restored), restoredLater: compact(restoredLater) };
      result.rainEmission.isolatedBoundaryFades = { lowerFadeSamples, upperFadeSamples, maxFadeError };
      pass('Reduced motion freezes the decorative clock while active source clipping respects the fixed world cap; restored rain has no fabricated source');

      await restore('rainLow', { cameraMode: 'water', pauseAtChanges: false }); await emissionDraw();
      const nearWater = await emissionSample(), nearProof = validateEmission(nearWater, 'Low receiving-water rain'); assert.equal(nearWater.emission.active, false);
      Object.assign(result.rainEmission, { nearWater, nearProof });
      const contacts = await page.evaluate(() => {
        const s = pilotReview.scene; s.updateMatrixWorld(true);
        const pool = s.getObjectByName('pilot-rain-water-impacts'), positions = pool.geometry.attributes.position, alpha = pool.geometry.attributes.rainAlpha;
        const receivers = ['pilot-ocean-surface', 'pilot-lake-water', 'pilot-stream-water'].map(name => s.getObjectByName(name)).filter(object => { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; });
        const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), point = new THREE.Vector3(), start = new THREE.Vector3(), end = new THREE.Vector3(), gaps = [];
        for (let rf = 0; rf < 84; rf++) for (let segment = 0; segment < 14; segment++) {
          const index = (rf * 29 + segment) * 2; if (alpha.getX(index) <= 0) continue;
          start.fromBufferAttribute(positions, index).applyMatrix4(pool.matrixWorld); end.fromBufferAttribute(positions, index + 1).applyMatrix4(pool.matrixWorld);
          for (const fraction of [0, .5, 1]) {
            point.copy(start).lerp(end, fraction); ray.set(new THREE.Vector3(point.x, 500, point.z), down);
            const hit = ray.intersectObjects(receivers, false)[0]; if (!hit) throw Error('Missing actual receiving water under active rain ripple'); gaps.push(point.y - hit.point.y);
          }
        }
        let nearThreadChecks = 0, nearRibbonChecks = 0, minRainGap = Infinity;
        for (const name of ['pilot-rain-field', 'pilot-rain-ribbons']) {
          const object = s.getObjectByName(name), p = object.geometry.attributes.position, a = object.geometry.attributes.rainAlpha;
          for (let n = 0; n < p.count; n++) {
            if (a.getX(n) <= 1e-7) continue; point.fromBufferAttribute(p, n).applyMatrix4(object.matrixWorld); ray.set(new THREE.Vector3(point.x, 500, point.z), down);
            const hit = ray.intersectObjects(receivers, false)[0]; if (!hit || point.y - hit.point.y > 2) continue;
            minRainGap = Math.min(minRainGap, point.y - hit.point.y); if (name === 'pilot-rain-field') nearThreadChecks++; else nearRibbonChecks++;
          }
        }
        return { samples: gaps.length, minGap: Math.min(...gaps), maxGap: Math.max(...gaps), nearThreadChecks, nearRibbonChecks, minRainGap };
      });
      result.rainEmission.contacts = contacts;
      assert(contacts.samples > 0 && contacts.minGap > .04 && contacts.maxGap < .12, JSON.stringify(contacts));
      assert(contacts.nearThreadChecks > 0 && contacts.nearRibbonChecks > 0 && contacts.minRainGap >= -.001, JSON.stringify(contacts));
      await capture('rain-emission-water-contacts');
      pass('Dual-boundary rain stays above actual receiving water and ripple endpoints/midpoints retain their native water-mesh clearance');
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); await settle();
      const reset = await emissionSample();
      const visibility = object => ({ uuid: object.uuid, parentUuid: object.parentUuid, parentName: object.parentName, visible: object.visible, effectiveVisible: object.effectiveVisible, ancestors: object.ancestors });
      result.rainEmission.reset = { ...compact(reset), field: visibility(reset.field), ribbons: visibility(reset.ribbons), impacts: visibility(reset.impacts) };
      assert.equal(reset.emission.active, false); assert.equal(reset.emission.ceilingY, 0);
      assert(!reset.field.visible && !reset.field.effectiveVisible && !reset.ribbons.effectiveVisible, 'Reset hides the complete rain hierarchy through its actual field parent');
      assert.equal(reset.ribbons.parentUuid, reset.field.uuid, 'Pooled ribbons remain attached to the hidden rain field');
      const evidence = { sourceY: source.rootPosition[1], emissionY: early.emission.ceilingY, earlyProgress: early.phase.progress,
        early: earlyProof, afterExpiry: afterProof, nearWater: nearProof, pauseExact: true, lookFixedWorldThreads: true, modeFixedWorldThreads: true,
        reducedClockFrozen: true, reducedSteps: [reducedActive.steps, reducedActiveLater.steps], restoredSourceInactive: true, resetSourceInactive: true,
        isolatedBoundaryFades: { lowerFadeSamples, upperFadeSamples, maxFadeError }, contacts };
      Object.assign(result.rainEmission, { evidence });
      result.rainEmission.lifecycle.reset = compact(reset);
      pass('Scenario reset clears the shared captured emission source and hides precipitation without changing genuine model receipts');
      }
    }
    if(enabled('rain-advection')){
      // A restored fixture creates a fresh gated renderer. Compile its actual
      // receiving-water program before reading the shared production clock.
      const warm=async()=>{const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before);await page.evaluate(()=>{window.reviewRenderActive=false;});};
      const sample=()=>page.evaluate(()=>{
        const s=pilotReview.scene;s.updateMatrixWorld(true);
        const field=s.getObjectByName('pilot-rain-field'),ribbons=s.getObjectByName('pilot-rain-ribbons'),impacts=s.getObjectByName('pilot-rain-water-impacts'),ocean=s.getObjectByName('pilot-ocean-surface');
        return {time:ocean.userData.surfaceShader.uniforms.pilotRippleTime.value,steps:rainCloudDepthTotalSteps,
          advection:{...field.userData.advection},sameAdvection:field.userData.advection===ribbons.userData.advection,
          sameProfiles:field.userData.dropProfile===ribbons.userData.dropProfile,profiles:Array.from(field.userData.dropProfile),
          field:{position:field.position.toArray(),geometry:field.geometry.uuid,points:Array.from(field.geometry.attributes.position.array),alpha:Array.from(field.geometry.attributes.rainAlpha.array)},
          ribbons:{geometry:ribbons.geometry.uuid,points:Array.from(ribbons.geometry.attributes.position.array)},
          impacts:{position:impacts.position.toArray(),geometry:impacts.geometry.uuid,points:Array.from(impacts.geometry.attributes.position.array),alpha:Array.from(impacts.geometry.attributes.rainAlpha.array)}};
      });
      const validate=snapshot=>{
        assert.equal(snapshot.advection.model,'shared-wind-size-dependent-slant');assert.equal(snapshot.advection.referenceFallSpeed,55);assert(snapshot.sameAdvection&&snapshot.sameProfiles);assert.equal(snapshot.profiles.length,84*4);
        let maxSlopeError=0,maxTrajectoryError=0,valid=0;const slopes=[];
        for(let rf=0;rf<84;rf++){
          const p=snapshot.field.points,offset=rf*12,dy=p[offset+1]-p[offset+10];
          if(snapshot.field.alpha[rf*4]===0||dy<.001)continue;
          const expected=snapshot.advection.horizontalSpeed/snapshot.profiles[rf*4],measured=(p[offset+9]-p[offset])/dy;
          maxSlopeError=Math.max(maxSlopeError,Math.abs(expected-measured));slopes.push({rf,fallSpeed:snapshot.profiles[rf*4],slope:measured});valid++;
          for(let vertex=0;vertex<4;vertex++){
            const i=offset+vertex*3,phase=60-p[i+1],expectedX=-48+((rf*37)%97)+expected*phase;
            maxTrajectoryError=Math.max(maxTrajectoryError,Math.abs(p[i]-expectedX));
          }
        }
        assert(valid>20&&maxSlopeError<.00002&&maxTrajectoryError<.00003,JSON.stringify({valid,maxSlopeError,maxTrajectoryError}));
        return {valid,maxSlopeError,maxTrajectoryError,slopes};
      };
      await page.emulateMedia({reducedMotion:'no-preference'});await restore('rain',{pauseAtChanges:false});await warm();
      const first=await sample(),firstProof=validate(first);await page.waitForTimeout(150);const paused=await sample();assert.deepEqual(paused,first,'Paused rain clock, buffers, profiles and metadata remain exact');
      await page.getByRole('button',{name:'Look',exact:true}).click();await page.getByRole('button',{name:'Look left',exact:true}).click();await settle();
      const looked=await sample();assert.deepEqual(looked.field,first.field,'Paused Look keeps the exact same world rain centerlines');assert.deepEqual(looked.impacts,first.impacts,'Paused Look keeps solved contacts fixed');assert.equal(looked.time,first.time);assert.notDeepEqual(looked.ribbons.points,first.ribbons.points,'Ribbon widths face the changed camera');
      await page.getByRole('button',{name:'Look',exact:true}).click();await resume();await page.waitForFunction(()=>rainCloudDepthTotalSteps>3);await pause();
      const moving=await sample(),movingProof=validate(moving);assert(moving.time>first.time);
      let compared=0,maxWindSpeedError=0;
      for(let rf=0;rf<84;rf++){
        const offset=rf*12,p=first.field.points,q=moving.field.points,fall=first.profiles[rf*4],dt=moving.time-first.time;
        if(first.field.alpha[rf*4]===0||moving.field.alpha[rf*4]===0||Math.abs((p[offset+1]-p[offset+10])-first.profiles[rf*4+1])>.0001||Math.abs((q[offset+1]-q[offset+10])-first.profiles[rf*4+1])>.0001)continue;
        if(Math.abs((p[offset+10]-q[offset+10])-fall*dt)>.0001)continue; // Exclude deterministic wrap frames.
        maxWindSpeedError=Math.max(maxWindSpeedError,Math.abs((q[offset+9]-p[offset+9])/dt-first.advection.horizontalSpeed));compared++;
      }
      assert(compared>20&&maxWindSpeedError<.0002,JSON.stringify({compared,maxWindSpeedError}));
      await page.emulateMedia({reducedMotion:'reduce'});await restore('rain',{pauseAtChanges:false});await warm();const reduced=await sample();await resume();await page.waitForFunction(()=>rainCloudDepthTotalSteps>3);await pause();const reducedLater=await sample();assert(reducedLater.steps>reduced.steps);assert.equal(reducedLater.time,reduced.time);assert.deepEqual(reducedLater.field.points,reduced.field.points,'Reduced motion retains static local rain trajectories while genuine model steps advance');
      await restore('rainLow',{cameraMode:'water'});await capture('rain-size-slants-water');await inspect('rain-size-slants-water');
      const contacts=await page.evaluate(()=>{
        const s=pilotReview.scene;s.updateMatrixWorld(true);const pool=s.getObjectByName('pilot-rain-water-impacts'),p=pool.geometry.attributes.position,a=pool.geometry.attributes.rainAlpha;
        const receivers=['pilot-ocean-surface','pilot-lake-water','pilot-stream-water'].map(n=>s.getObjectByName(n)).filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});
        const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),v=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3(),gaps=[];
        for(let rf=0;rf<84;rf++)for(let segment=0;segment<14;segment++){
          const index=(rf*29+segment)*2;if(a.getX(index)<=0)continue;
          start.fromBufferAttribute(p,index).applyMatrix4(pool.matrixWorld);end.fromBufferAttribute(p,index+1).applyMatrix4(pool.matrixWorld);
          for(const fraction of [0,.5,1]){v.copy(start).lerp(end,fraction);ray.set(new THREE.Vector3(v.x,500,v.z),down);const hit=ray.intersectObjects(receivers,false)[0];if(!hit)throw Error('Missing actual receiving water under active ripple');gaps.push(v.y-hit.point.y);}
        }
        return {samples:gaps.length,minGap:Math.min(...gaps),maxGap:Math.max(...gaps)};
      });assert(contacts.samples>0&&contacts.minGap>.04&&contacts.maxGap<.12,JSON.stringify(contacts));
      result.rainAdvection={first,firstProof,paused,looked,moving,movingProof,compared,maxWindSpeedError,reduced,reducedLater,contacts};
      pass('Actual pooled rain shares wind speed with size-dependent slopes, fixed paused Look contacts, static reduced-motion trajectories and ray-verified receiving-water ripples');
    }
    if(enabled('phase')){
      await page.emulateMedia({reducedMotion:'no-preference'});result.phaseViews=[];
      for(const name of phaseRoutes)for(const cameraMode of ['follow','water']){
        const before=await trigger(name,{cameraMode}),first=await phaseDetail();await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await resume();await page.waitForFunction(()=>Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress)>=.48);await pause();const midpoint=await phaseDetail();await page.waitForTimeout(180);const frozen=await phaseDetail();
        assert.deepEqual(frozen.objects,midpoint.objects,'Paused outgoing/incoming fronts and pooled transforms stay exact');
        if(cameraMode==='water'||name==='snowRelease'||captures?.includes(name+'-'+cameraMode+'-midpoint'))await capture(name+'-'+cameraMode+'-midpoint');await inspect(name+'-'+cameraMode+'-midpoint');const optical=suite==='relief-optics'?await opticalSample():null;let modeSwitch=null,expired=null;if(cameraMode==='water'){await page.getByRole('button',{name:'Follow view',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCamera==='follow');await settle();const follow=await phaseDetail();assert.deepEqual(follow.materialDepth,before.materialDepth,'Water to Follow restores exact original scene material depth flags');await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCamera==='water');await settle();const waterAgain=await phaseDetail();modeSwitch={follow,waterAgain};await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='hidden');await pause();expired=await phaseDetail();assert.deepEqual(expired.materialDepth,before.materialDepth,'Phase expiry restores exact original material depth flags');}result.phaseViews.push({name,cameraMode,before,first,midpoint,frozen,optical,modeSwitch,expired,nativeDrawOrder:suite==='spatial-weather'?await page.evaluate(()=>spatialWeatherDrawOrder.slice()):null});
      }
      pass('Actual new phase routes produce their original kernel receipts and fixed paused outgoing/incoming illustrations');
      if(suite==='spatial-weather')for(const p of result.phaseViews.filter(p=>p.name==='rainRelease'&&p.cameraMode==='follow')){
        const lastFrame=Math.max(...p.nativeDrawOrder.map(o=>o.frame)),draws=p.nativeDrawOrder.filter(o=>o.frame===lastFrame),source=draws.map((o,i)=>o.kind==='cloud'&&o.parent==='pilot-phase-cloud-memory'?i:-1).filter(i=>i>=0),water=draws.map((o,i)=>o.kind==='water'?i:-1).filter(i=>i>=0);
        assert(source.length>0&&water.length>0&&Math.max(...water)<Math.min(...source),'Actual source-cloud memory draws after receivers during genuine cloud-to-rain Follow handoff');
      }
    }
    if(enabled('consecutive')){result.consecutive=[];await page.emulateMedia({reducedMotion:'no-preference'});for(const cameraMode of ['follow','water']){await trigger('mountainMelting',{cameraMode});const before=await phaseDetail();await page.evaluate(()=>{window.rainCloudDepthDriveInput={...rainCloudDepthTransitions.mountainReevaporation.input};window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor'&&waterReviewData.pilot.paused);await settle();const after=await phaseDetail(),memory=after.objects.find(o=>o.name==='pilot-phase-liquid-memory'),prior=before.objects.find(o=>o.name==='pilot-phase-incoming-droplet').materials[0].userData.meltingFront,carry=memory.userData.carriedMeltingFront;assert.equal(carry.active.value,1);assert.equal(carry.progress.value,prior.progress.value,'Interrupted incoming liquid mask remains exactly on outgoing evaporation memory');const mapping=cameraMode==='water'?before.bindings.melting.previewLocalToSource:before.bindings.melting.actualLocalToSource;assert(maxDelta(carry.localToSource.value.elements,mapping)<1e-8,'Interrupted liquid mask keeps the actual previously visible source mapping');if(cameraMode==='water')await capture('mountain-consecutive-water');result.consecutive.push({kind:'melting-to-evaporation',cameraMode,before,after});}
      for(const cameraMode of ['follow','water']){await trigger('recrossFreezing',{cameraMode});const before=await phaseDetail();await page.evaluate(()=>{window.rainCloudDepthDriveInput={...rainCloudDepthTransitions.recrossMelting.input};window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='droplet'&&waterReviewData.pilot.paused);await settle();const after=await phaseDetail(),carry=after.objects.find(o=>o.name==='pilot-phase-ice-memory').userData.carriedFreezingFront,prior=before.objects.find(o=>o.name==='pilot-phase-incoming-ice').materials[0].userData.phaseReveal;assert.equal(carry.active.value,1);assert.equal(carry.progress.value,prior.progress.value,'Rapid actual freezing-boundary recross retains the visible partial solid front');result.consecutive.push({kind:'freezing-to-melting',cameraMode,before,after});}pass('Genuine Mountainwinter and low-velocity freezing-boundary recrosses preserve interrupted liquid and solid masks in both camera views');}
    if(enabled('lifecycle')){
      await page.setViewportSize({width:320,height:940});await trigger('condensation',{cameraMode:'water'});await resume();await page.waitForTimeout(350);await pause();result.phonePhase=await phaseDetail();await capture('condensation-water-phone-320');await inspect('condensation-water-phone-320');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1280,height:1000});
      await page.emulateMedia({reducedMotion:'reduce'});await restore('before-melting',{cameraMode:'water',pauseAtChanges:false});await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};window.rainCloudDepthDriveInput={...rainCloudDepthTransitions.melting.input};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='active');const reduced=await phaseDetail();await page.waitForTimeout(250);const later=await phaseDetail();assert(later.steps>reduced.steps);assert.equal(later.data.phaseHandoffProgress,reduced.data.phaseHandoffProgress);await pause();
      await restore('cloud');const restored=await phaseDetail();assert(!restored.visible);await page.getByRole('button',{name:'Reset this run and start again as liquid water',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');const reset=await phaseDetail();assert(!reset.visible);result.lifecycle={reduced,later,restored,reset};pass('New phase routes fit320px, retain static reduced-motion progress while genuine model steps advance, and clear on restore/reset');
    }
    if(suite==='rain-landing-shower')assert(result.rainLandingShower&&result.captures.length===3&&result.captures.every(n=>n.startsWith('rain-landing-shower-')),'Requested landing shower section and all three captures must execute');
    if(suite==='refreezing-continuity')assert(result.refreezingContinuity&&result.captures.length===3&&result.captures.every(n=>n.startsWith('refreezing-continuity-')),'Requested refreezing continuity section and all three captures must execute');
    if(suite==='cloud-source-thinning')assert(result.cloudSourceThinning&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-source-thinning-')),'Requested cloud source thinning section and all three native captures must execute before success');
    if(suite==='rain-evaporation')assert(result.rainEvaporation&&result.captures.length===3&&result.captures.every(n=>n.startsWith('rain-evaporation-')),'Requested rain-evaporation section and all three native captures must execute before success');
    if(suite==='phase-motion-continuity')assert(result.phaseMotionContinuity&&result.captures.length===3&&result.captures.every(n=>n.startsWith('phase-motion-continuity-')),'Requested phase-motion continuity section and all3source-bound captures must execute');
    if(suite==='cloud-shadow-retirement')assert(result.cloudShadowRetirement&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-shadow-retirement-')),'Requested shadow retirement section and all3source-bound captures must execute');
    if(suite==='cloud-interior-density')assert(result.cloudInteriorDensity&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-interior-density-')),'Requested interior density section and all three source-bound captures must execute');
    if(suite==='cloud-immersion')assert(result.cloudImmersion&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-immersion-')),'Requested cloud-immersion section and all three native captures must execute before success');
    if(suite==='cloud-formation-settle')assert(result.cloudFormationSettle&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-formation-settle-')),'Requested cloud-formation-settle section and all three native captures must execute before success');
    if(suite==='snow-melt-preview')assert(result.snowMeltPreview&&result.captures.length===3,'The requested snow-melt-preview section and three captures must execute before success');
    if(suite==='splash-motion')assert(result.splashMotion&&result.captures.length===3&&result.captures.every(n=>n.startsWith('splash-motion-')),'The requested splash-motion section and three native captures must execute before success');
    if(suite==='rain-landing-motion')assert(result.rainLandingMotion&&result.captures.length===3&&result.captures.every(n=>n.startsWith('rain-landing-motion-')),'The requested rain-landing-motion section and three native captures must execute before success');
    if(suite==='cloud-assembly-flow')assert(result.cloudAssemblyFlow&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-assembly-flow-')),'The requested cloud-assembly-flow section and three captures must execute before success');
    if(suite==='cloud-assembly-source')assert(result.cloudAssemblySource&&result.captures.length===3&&result.captures.every(n=>n.startsWith('cloud-assembly-source-')),'The requested cloud-assembly-source section and three captures must execute before success');
    assert.deepEqual(result.errors,[]);pass('No page, WebGL or shader errors');result.success=true;
  } catch (error) { result.success = false; result.harnessError = String(error); console.error(error); process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(reportRoot, earlyClean ? 'qa-summary-early-clean.json' : 'qa-summary.json'), JSON.stringify({ success: result.success, sourceSha256: result.sourceSha256, checks: result.checks, captures: result.captures, transitions: result.transitions.map(({ name, cameraMode }) => ({ name, cameraMode })), errors: result.errors, harnessError: result.harnessError, report: path.relative(root, path.join(out, 'results.json')) }, null, 2));
    await browser.close();
    await new Promise(resolve => { server.close(resolve); if(['rain-landing-shower','cloud-interior-density','cloud-shadow-retirement','phase-motion-continuity'].includes(suite)&&server.closeAllConnections)server.closeAllConnections(); });
    if (ownedProfileSuite) {
      const ownedTemp = fs.realpathSync(temp), reportFolder = fs.realpathSync(out);
      assert(ownedTemp.startsWith(reportFolder + path.sep) && path.basename(ownedTemp).startsWith('browser-temp-'), 'Only this run\'s resolved owned browser temporary folder may be removed');
      fs.rmSync(ownedTemp, { recursive: true, force: true }); result.browserTempCleaned = true;
    }
    if (suite === 'rain-collection' || ownedProfileSuite) { result.browsersClosed = true; fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); }
    if (suite === 'cloud-evolution' || suite === 'rain-emission' || suite === 'rain-collection' || ownedProfileSuite) {
      const summaryPath = path.join(reportRoot, earlyClean ? 'qa-summary-early-clean.json' : 'qa-summary.json'), summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      summary.browsersClosed = true;
      summary.numericalEvidence = result.cloudEvolution?.evidence || result.rainEmission?.evidence || result.rainCollection?.evidence || result.rainOnset?.evidence || result.cloudExit?.evidence || result.cloudShadowMemory?.evidence || result.rainContactMemory?.evidence || result.rainLandingShower?.evidence || result.cloudInteriorDensity?.evidence || result.cloudShadowRetirement?.evidence || result.phaseMotionContinuity?.evidence || result.rainLandingMotion?.evidence || result.cloudAssemblySource?.evidence;
      summary.captureFiles = result.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: result.sourceSha256 }));
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
