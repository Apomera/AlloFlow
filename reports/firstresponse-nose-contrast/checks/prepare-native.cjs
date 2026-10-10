const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const work=__dirname,old=path.resolve(work,'../firstresponse-face-detail-work'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baselineSHA=sha(fs.readFileSync(path.join(work,'before.js')));
function once(s,a,b){if(s.split(a).length!==2)throw Error('Anchor '+a.slice(0,80));return s.replace(a,b);}
for(const name of ['face-capture-png.cjs','face-mount-window.cjs','playwright-face.config.cjs'])fs.copyFileSync(path.join(old,name),path.join(work,name));
let fixture=fs.readFileSync(path.join(old,'firstresponse-face-preview.spec.ts'),'utf8');
fixture=once(fixture,"const baselineSHA='8c045e6d8056e834d795ed4bfecb0418758c6a5c3e9d2ce4f05d69ec14dca940';",`const baselineSHA='${baselineSHA}';`);
fixture=once(fixture,"var record={renderer:renderer,disposeCount:0,sequence:0};", "var record={renderer:renderer,disposeCount:0,sequence:0,materials:new Map()};");
fixture=once(fixture,"renderer.render=function(scene,camera){var result=render.apply(this,arguments);",`renderer.render=function(scene,camera){
        if(scene && scene.isScene && scene.getObjectByName('fr-training-manikin'))scene.traverse(function(o){if(!o.material)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){if(record.materials.has(m))return;var item={name:m.name,type:m.type,disposeCount:0};record.materials.set(m,item);m.addEventListener('dispose',function(){item.disposeCount++;});});});
        var result=render.apply(this,arguments);`);
const materialStart=fixture.indexOf('      var exactScene=[],lipMaterials=[];'),materialEnd=fixture.indexOf('      function isEyeMesh',materialStart);
if(materialStart<0||materialEnd<materialStart)throw Error('Scene anchors');
fixture=fixture.slice(0,materialStart)+`      function materialHooks(m){if(Array.isArray(m))return m.map(materialHooks);return {compile:String(m.onBeforeCompile),cacheKey:m.customProgramCacheKey()};}
      var exactScene=[],noseMaterial=null,headMaterial=model.getObjectByName('fr-manikin-head').material;
      function visitExact(o,key){var mat=o.material?exactMaterial(o.material):null,hooks=o.material?materialHooks(o.material):null;
        if(o.name==='fr-manikin-nose'){
          noseMaterial={name:o.name,material:JSON.parse(JSON.stringify(mat)),visible:visible(o),hooks:hooks,separateFromHead:o.material!==headMaterial,strength:o.material.userData.frNoseContourStrength?o.material.userData.frNoseContourStrength.value:null};
          if(window.__ctx.isContrast){mat=exactMaterial(headMaterial);hooks=materialHooks(headMaterial);}
        }
        exactScene.push({path:key,name:o.name,type:o.type,visible:o.visible,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),matrix:o.matrix.elements,renderOrder:o.renderOrder,layers:o.layers.mask,castShadow:o.castShadow,receiveShadow:o.receiveShadow,frustumCulled:o.frustumCulled,userData:o.userData,geometry:o.geometry?exactGeometry(o.geometry):null,material:mat,materialHooks:hooks});
        o.children.forEach(function(child,i){visitExact(child,key+'/'+i);});
      }
      visitExact(drawn.scene,'scene');
`+fixture.slice(materialEnd);
fixture=once(fixture,'preservedScene:digest(exactScene),lipMaterials:lipMaterials,','preservedScene:digest(exactScene),noseMaterial:noseMaterial,headMaterial:exactMaterial(headMaterial),');
fixture=once(fixture,'draw:{id:rec.id,','draw:{materials:drawn.materials.size,id:rec.id,');
const start=fixture.indexOf('function validLips('),end=fixture.indexOf('\nfor(const view of views)test(',start);
if(start<0||end<start)throw Error('Matcher anchors');
fixture=fixture.slice(0,start)+`function validNose(value:any,variant:string){
  const nose=value.noseMaterial;expect(nose.name).toBe('fr-manikin-nose');expect(nose.visible).toBe(true);
  expect(nose.material.type).toBe(value.contrast?'MeshBasicMaterial':'MeshPhongMaterial');
  if(value.contrast&&variant==='candidate'){
    expect(nose.separateFromHead).toBe(true);expect(nose.strength).toBe(1);
    expect(nose.material.name).toBe('fr-patient-nose-skin');expect(nose.material.userData).toEqual({...value.headMaterial.userData,frNoseContourStrength:{value:1}});
    expect(nose.hooks.cacheKey).toBe('fr-patient-nose-contrast-contours-v1');
    for(const fragment of ['shader.uniforms.frNoseContourStrength = noseContourStrength','frNoseSurfaceNormal = normalize(normalMatrix * normal)','frNoseViewPosition = -mvPosition.xyz','abs(dot(normalize(frNoseSurfaceNormal), normalize(frNoseViewPosition)))','mix(0.08, 1.0, smoothstep(0.20, 0.45, frNoseFacing))','diffuseColor.rgb *= mix(1.0, frNoseContour, frNoseContourStrength)'])expect(nose.hooks.compile).toContain(fragment);
    const clean=JSON.parse(JSON.stringify(nose.material));delete clean.name;delete clean.userData.frNoseContourStrength;if(!Object.keys(clean.userData).length)delete clean.userData;expect(clean).toEqual(value.headMaterial);
  }else{expect(nose.separateFromHead).toBe(false);expect(nose.strength).toBe(null);expect(nose.material).toEqual(value.headMaterial);}
}
function matching(value:any,reference:any){
  expect(value.preservedScene,'all geometry, metadata, transforms and other materials').toEqual(reference.preservedScene);
  for(const key of ['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','preservedFace','cheekContext','eyeMeshes','torsoMesh','faceProjection','head','contrast','headMaterial'])expect(value[key],key).toEqual(reference[key]);
  for(const key of ['geometries','calls','triangles'])expect(value.draw[key],'actual rendered '+key).toBe(reference.draw[key]);
  const extra=value.contrast?1:0;
  expect(value.draw.programs,'only the contrast nose adds a compiled program').toBe(reference.draw.programs+extra);
  expect(value.draw.materials,'only the contrast nose adds a material').toBe(reference.draw.materials+extra);
  if(!value.contrast)expect(value.noseMaterial,'normal nose finish exact').toEqual(reference.noseMaterial);
}
`+fixture.slice(end);
fixture=once(fixture,"test('mouth material '+view.id", "test('nose contrast '+view.id");
fixture=once(fixture,'validLips(value,variant);','validNose(value,variant);');
fixture=once(fixture,'expect(repeat.lipMaterials).toEqual(value.lipMaterials);','expect(repeat.noseMaterial).toEqual(value.noseMaterial);expect(repeat.draw.materials).toBe(value.draw.materials);');
fixture=once(fixture,"await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);",`const disposal=await handle!.evaluate((c:any)=>Array.from((window as any).__faceDraws.get(c).materials.values()) as any[]);attempt.materialDisposal=disposal;
      expect(disposal.length).toBe(value.draw.materials);for(const item of disposal)expect(item.disposeCount,'material disposed '+item.name).toBeGreaterThan(0);
      if(view.contrast&&variant==='candidate')expect(disposal.filter((item:any)=>item.name==='fr-patient-nose-skin').map((item:any)=>item.disposeCount)).toEqual([1]);
      await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);`);
fixture=once(fixture,"  {id:'adult-pose5',age:'adult',width:1280,height:1080,pose:5,contrast:false},", "  {id:'adult-pose5',age:'adult',width:1280,height:1080,pose:5,contrast:false},\n  {id:'adult-pose5-contrast',age:'adult',width:1280,height:1080,pose:5,contrast:true},");
fs.writeFileSync(path.join(work,'firstresponse-face-preview.spec.ts'),fixture);
let runner=fs.readFileSync(path.join(old,'run-face-browser.cjs'),'utf8');
runner=once(runner,"const baselineSHA='8c045e6d8056e834d795ed4bfecb0418758c6a5c3e9d2ce4f05d69ec14dca940',",`const baselineSHA='${baselineSHA}',`);
runner=once(runner,"const availableViews=['adult-pose5','infant-pose8-contrast']", "const availableViews=['adult-pose5','adult-pose5-contrast','infant-pose8-contrast']");
runner=once(runner,"const summary={baselineSHA,finalSHA,",`const {PNG}=require(path.join(root,'node_modules/playwright-core/lib/utilsBundle.js'));const pixelComparisons=[];
  for(const id of selectedViews){const pair=metrics.evidence.filter(e=>e.id===id),a=PNG.sync.read(fs.readFileSync(path.join(report,id+'-baseline-stage.png'))),b=PNG.sync.read(fs.readFileSync(path.join(report,id+'-candidate-stage.png')));if(a.width!==b.width||a.height!==b.height)throw Error('Image size changed '+id);let changedPixels=0;for(let i=0;i<a.data.length;i+=4)if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))changedPixels++;if(!pair[0].contrast&&changedPixels!==0)throw Error('Normal rendering changed '+changedPixels+' pixels');if(pair[0].contrast&&changedPixels===0)throw Error('Nose contrast had no visible effect');pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height});}
  const summary={pixelComparisons,baselineSHA,finalSHA,`);
fs.writeFileSync(path.join(work,'run-face-browser.cjs'),runner);
fs.writeFileSync(path.join(work,'browser-fixture-preparation.json'),JSON.stringify({baselineSHA,candidateSHA:sha(fs.readFileSync(path.join(work,'candidate.js'))),browserLaunched:false,scope:'contrast nose material only; every geometry, pose and other material exact',files:['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs']},null,2));
console.log('Prepared private nose contour native fixture');
