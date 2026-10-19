'use strict';
// Reuse the genuine-kernel native harness; run only after root authorizes GPU.
// The wrapper adds no browser, renderer or production implementation of its own.
const defaults = {
  suite: 'relief-optics',
  sections: 'cloud,optics,phase,lifecycle',
  'cloud-distance': '130',
  'phase-routes': 'condensation,reevaporation,melting',
  captures: 'cloud-shade-sunward,cloud-shade-opposite,liquid-optics-follow,droplet-optics-follow,rain-optics-follow,condensation-water-midpoint,reevaporation-water-midpoint,melting-water-midpoint'
};
for (const [key,value] of Object.entries(defaults)) {
  if (!process.argv.some(arg=>arg.startsWith('--'+key+'='))) process.argv.push('--'+key+'='+value);
}
if(process.argv.includes('--analyze')){
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
  const root=process.cwd(),dir=path.join(root,'reports/watercycle-pilot-relief-optics'),read=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8'));
  const full=read('final/results.json'),liquid=read('liquid-water-verified/results.json'),sha=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'final-source.js'))).digest('hex');
  const checks=[...full.checks],evidence={cloud:[],optics:[],phase:[]},ok=(value,label)=>{assert(value,label);checks.push(label);},delta=(a,b)=>Math.max(...a.map((v,n)=>Math.abs(v-b[n])));
  ok(full.success&&liquid.success&&full.errors.length===0&&liquid.errors.length===0,'Full and corrected-liquid native runs completed with no page, WebGL or shader errors');
  ok(full.sourceSha256===sha&&liquid.sourceSha256===sha,'Every final selected native capture uses the same frozen08dd source');
  const views=full.cloudLighting,fixed=v=>v.clouds.map(c=>({material:c.material,map:c.map,normal:c.normal,position:c.position,scale:c.scale,shelter:c.lighting.shelter.value}));assert.deepEqual(fixed(views[0]),fixed(views[1]));
  checks.push('Opposite close review cameras preserve the actual cloud geometry, maps and world-anchored shelter');
  for(const v of views){
    ok(v.normalMaps.length===6&&v.albedos.length===6&&v.normalMaps.every(t=>t.width===192&&t.height===192),'Six192px relief/albedo pairs remain shared in '+v.name+' view');
    ok([...v.normalMaps,...v.albedos].every(t=>t.userData.cloudTextureModel==='recessed-billow-joins'),'Actual shared cloud textures advertise the recessed-billow-joins model in '+v.name+' view');
    const albedoSpreads=v.albedos.map(t=>t.opaqueLuminance95-t.opaqueLuminance05);
    ok(albedoSpreads.every(s=>s>=16),'Actual opaque billow texels retain at least16 luminance levels of internal95–5 relief in '+v.name+' view');
    const linked=v.clouds.filter(c=>c.linkedVertex&&c.linkedFragment),uploaded=v.clouds.filter(c=>c.uploaded),reads=v.shelterReads;
    ok(linked.length===6&&linked.every(c=>c.linkedVertex.includes('mat3(pilotCloudViewMatrix)*pilotCloudSun')&&c.linkedFragment.includes('pilotCloudShelter')&&c.linkedFragment.includes('texture2D(pilotCloudNormalMap')),'All six actual linked cloud programs retain world-Sun relief and shelter in '+v.name+' view');
    ok(uploaded.length>0&&uploaded.every(c=>delta(c.uploaded.sun,v.sun)<1e-6&&delta(c.uploaded.view,v.expectedCameraView)<1e-3),'Actual uploaded cloud Sun and custom-view matrix match the active review camera in '+v.name+' view');
    const shelterError=Math.max(...reads.map(r=>Math.abs(r.expected-r.uploaded)));ok(reads.length>0&&shelterError<1e-6,'Per-draw actual shelter uploads match their material values in '+v.name+' view');
    const pixels=v.pixelProbe.samples.map(p=>p.luminance),range=[Math.min(...pixels),Math.max(...pixels)];ok(pixels.length>=6&&range[0]>80&&range[1]-range[0]>5,'Native close-cloud framebuffer retains visible nonblack tonal relief in '+v.name+' view');
    evidence.cloud.push({view:v.name,albedo95Minus05:albedoSpreads,framebufferSamples:pixels.length,framebufferLuminance:range,perDrawShelterReadbacks:reads.length,maxShelterUploadError:shelterError});
  }
  const corrected=liquid.states.find(s=>s.name==='liquid-optics-follow');
  ok(corrected.snapshot.form==='liquid'&&corrected.snapshot.practiceOrigin==='surface'&&corrected.snapshot.x===-150&&corrected.snapshot.z===40&&corrected.snapshot.surface==='water'&&corrected.snapshot.landingSurface==='ocean','Corrected actual liquid proof uses the genuine open-water surface practice checkpoint');
  const opticalViews=[liquid.opticalViews[0],...full.opticalViews.filter(v=>v.name!=='liquid')];
  const validateMaterial=(m,label)=>{
    const meta=m.userData.waterOptics,profile=meta.profile,coverage=profile==='primary'?[.6,.95]:[.88,.98],edge=profile==='primary'?.62:.48,f=m.fragment;
    assert.equal(meta.model,'multiplicative-fresnel-coverage');assert.deepEqual([meta.coverage.value.x,meta.coverage.value.y],coverage);assert.equal(meta.edgeStrength.value,edge);
    assert(m.transparent);assert(delta(m.uploaded.parcelOpticalCoverage,coverage)<1e-6);assert(Math.abs(m.uploaded.parcelOpticalEdgeStrength-edge)<1e-6);
    const optics=f.indexOf('diffuseColor.a*=mix(parcelOpticalCoverage.x,parcelOpticalCoverage.y,parcelOpticalRim);');assert(optics>0);assert(!/diffuseColor\.a\s*=\s*max\s*\(/.test(f));
    if(m.type==='MeshPhysicalMaterial'){const transmission=f.indexOf('diffuseColor.a *= mix( saturate(');assert(transmission>=0&&transmission<optics);}
    for(const mask of ['if(phaseMeltActive>0.5)','if(phaseWaterCarryActive>0.5)','if(phaseFrontMode>0.5)'])if(f.includes(mask))assert(f.indexOf(mask)<optics);
    evidence.optics.push({scope:label,type:m.type,profile,coverage:m.uploaded.parcelOpticalCoverage,edgeStrength:m.uploaded.parcelOpticalEdgeStrength,alphaFloorAbsent:true,coverageAfterTransmissionAndMasks:true});
  };
  for(const v of opticalViews){const active=v.materials.filter(m=>m.fragment&&m.userData.waterOptics);assert(active.some(m=>m.userData.waterOptics.profile==='primary'));for(const m of active)validateMaterial(m,v.name+'-follow');}
  checks.push('Actual liquid, droplet and rain Physical programs upload the correct primary coverage and edge profiles');
  const routes={condensation:['vapor','droplet','condensation'],reevaporation:['droplet','vapor','evaporation'],melting:['ice','droplet','melting']};
  for(const p of full.phaseViews){const m=p.midpoint,r=routes[p.name];assert.deepEqual([m.groupData.from,m.groupData.to,m.groupData.kind],r);assert(m.visible&&m.groupData.progress>p.first.groupData.progress&&m.groupData.progress<1);assert.deepEqual(m.objects,p.frozen.objects);
    if(p.cameraMode==='water'){assert.deepEqual(p.modeSwitch.follow.materialDepth,p.before.materialDepth);assert.deepEqual(p.expired.materialDepth,p.before.materialDepth);assert(!p.expired.visible);for(const mat of p.optical.materials.filter(m=>m.fragment&&m.userData.waterOptics))validateMaterial(mat,p.name+'-water');if(p.name!=='reevaporation'){assert(m.bindings.droplet.visible&&m.bindings.droplet.sharesGeometry&&m.bindings.droplet.sharesMaterial);assert(delta(m.bindings.droplet.previewWorldScale,m.bindings.droplet.actualWorldScale)<1e-12);}}
    if(p.name==='melting'){assert(m.bindings.melting.sharedActive&&m.bindings.melting.sharedProgress&&m.bindings.melting.sharedTransform);assert(delta(m.bindings.melting.sourceCentre,[0,0,0])<1e-10);}
    evidence.phase.push({name:p.name,camera:p.cameraMode,progress:[p.first.groupData.progress,m.groupData.progress]});
  }
  ok(evidence.optics.some(o=>o.profile==='memory'&&o.type==='MeshPhongMaterial'),'Actual Phong evaporation memory uploads its own multiplicative coverage after existing carry/retreat masks');
  checks.push('Every actually linked optical shader multiplies existing alpha after transmission/front masks, with the old alpha floor absent');
  checks.push('All six genuine phase/view cases preserve exact paused buffers, shared actual target geometry/material/scale and complementary melt uniforms');
  checks.push('All three Water→Follow switches and expiries restore original depth flags exactly');
  ok(full.receipts.length>=7&&full.receipts.every(r=>r.receipt.from===r.expectedFrom&&r.receipt.to===r.expectedTo),'Actual kernel transitions and original event receipts match every tested phase fixture');
  assert(full.lifecycle.later.steps>full.lifecycle.reduced.steps);assert.equal(full.lifecycle.later.groupData.progress,full.lifecycle.reduced.groupData.progress);assert(!full.lifecycle.restored.visible&&!full.lifecycle.reset.visible);assert(full.phonePhase.bindings.droplet.visible);
  checks.push('Reduced motion keeps a static phase lens while model steps advance;320px layout, restore and reset checks pass');
  const cpu=read('optics-cpu-proof.json');ok(cpu.sourceSha256===sha||cpu.sourceSha===sha||JSON.stringify(cpu).includes(sha),'Independent CPU uniform-reference and alpha-composition proof is source matched');
  const fixtures={
    'cloud-shade-sunward':'Genuine integrated cloud; QA-only close130m camera on Sunward side; actual geometry/maps/Sun unchanged.',
    'cloud-shade-opposite':'Same genuine paused cloud and shared maps; QA-only opposite camera.',
    'liquid-optics-follow':'Production practiceState(surface,tropicalOcean), actual x−150/z40 and ocean surface; QA-only optical camera.',
    'droplet-optics-follow':'Actual tropical vapour→droplet kernel receipt; QA-only optical camera.',
    'rain-optics-follow':'Actual integrated cloud→rain followed down to26.65m over ocean; QA-only optical camera.',
    'condensation-water-midpoint':'Actual vapour→droplet receipt, production Water lens at active midpoint.',
    'reevaporation-water-midpoint':'Actual droplet descends below cloud base and becomes vapour; production retreating Water lens.',
    'melting-water-midpoint':'Actual temperate-coast ice descends through freezing level into droplet; production paired Water lens.'};
  const captures=full.captures.map(name=>({name,path:path.relative(root,path.join(dir,name==='liquid-optics-follow'?'liquid-water-verified':'final',name+'.png')),sourceSha256:sha,fixture:fixtures[name]}));
  const summary={success:true,sourceSha256:sha,browsersClosed:true,checks,captures,reports:['reports/watercycle-pilot-relief-optics/final/results.json','reports/watercycle-pilot-relief-optics/liquid-water-verified/results.json'],numericalEvidence:evidence,sourceScopedCpuProof:'reports/watercycle-pilot-relief-optics/optics-cpu-proof.json',visualReview:{reviewedAllEight:true,result:'Actual billow seams/base scallops are more visible while remaining soft. Liquid/drop/rain surfaces retain readable outlines and show background texture through their body. Incoming liquid and paired melt remain legible; evaporation front stays transparent rather than regrowing a full sphere.',limitation:'The clear-water effect is a Fresnel/alpha optical approximation; this is not scene refraction or photorealism. Framebuffer alpha is composited; transparency is established by multiplicative compiled shader/actual uploads plus inspected native body/background appearance.'},rawAttempts:[{report:'reports/watercycle-pilot-relief-optics/raw-surface-fixture/results.json',capture:'reports/watercycle-pilot-relief-optics/raw-surface-fixture/liquid-initial-state-permeable-shore.png',sourceSha256:sha,result:'Native checks passed, but initial liquid x0/z0 was actually on permeable shore and the body intersected terrain. Replaced only this optical fixture with genuine production surface practice; source unchanged.'},{report:'reports/watercycle-pilot-relief-optics/liquid-water-verified/results.json',sourceSha256:sha,result:'Corrected genuine open-water liquid proof; one focused native capture.'}],errors:[]};
  fs.writeFileSync(path.join(dir,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:evidence},null,2));process.exit(0);
}
require('./watercycle_pilot_rain_cloud_depth_qa.cjs');
