import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const report = process.env.FIRST_RESPONSE_PATIENT_CONTRAST_REPORT || 'reports/firstresponse-patient-contrast';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__patientContrastDraws=new WeakMap();
    window.__patientContrastIds=new WeakMap();window.__patientContrastNextId=0;
    function patientResourceId(value){
      if(!value)return null;var id=window.__patientContrastIds.get(value);
      if(!id){id=++window.__patientContrastNextId;window.__patientContrastIds.set(value,id);}return id;
    }
    var PatientContrastRenderer=THREE.WebGLRenderer;
    THREE.WebGLRenderer=new Proxy(PatientContrastRenderer,{construct:function(target,args,newTarget){
      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;
      renderer.render=function(scene,camera){
        var result=render.apply(this,arguments);
        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
          var previous=window.__patientContrastDraws.get(this.domElement);
          window.__patientContrastDraws.set(this.domElement,{scene:scene,camera:camera,renderer:renderer,
            calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
            sequence:(previous?previous.sequence:0)+1});
        }return result;
      };return renderer;
    }});
    window.__patientContrastMaterials=function(){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__patientContrastDraws.get(canvas),found=[];
      if(!drawn)return found;
      drawn.scene.getObjectByName('fr-patient-arms').traverse(function(mesh){
        if(mesh.isMesh && mesh.material.name==='fr-patient-arm-skin' && found.indexOf(mesh.material)<0)found.push(mesh.material);
      });return found;
    };
    window.__setPatientContour=function(value){
      var materials=window.__patientContrastMaterials();
      if(materials.length!==1 || !materials[0].userData.frPatientContourStrength)throw new Error('Compiled patient contour control is unavailable');
      materials[0].userData.frPatientContourStrength.value=value;return materials.length;
    };
    window.__patientContrast=function(){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__patientContrastDraws.get(canvas),record=canvas && window.__glRecorder.forCanvas(canvas);
      if(!drawn || !record)return null;
      var scene=drawn.scene,camera=drawn.camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      function visible(object){for(var p=object;p;p=p.parent)if(!p.visible)return false;return true;}
      function summary(mesh){
        var geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal,index=geometry.index;
        var total=index?index.count:position.count,start=geometry.drawRange.start,end=Math.min(total,start+geometry.drawRange.count);
        var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],seen=new Set(),invalid=0,hash=2166136261;
        for(var offset=start;offset<end;offset++){
          var i=index?index.getX(offset):offset;if(seen.has(i))continue;seen.add(i);
          var world=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld),p=world.clone().project(camera).toArray();
          if(!world.toArray().concat(p).every(Number.isFinite))invalid++;
          for(var axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],p[axis]);max[axis]=Math.max(max[axis],p[axis]);}
        }
        [position.array,normal && normal.array,index && index.array].filter(Boolean).forEach(function(array){
          var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(var i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);
        });
        var material=mesh.material;
        return {name:mesh.name,min:min,max:max,invalid:invalid,matrix:mesh.matrixWorld.elements.slice(),
          fingerprint:('00000000'+(hash>>>0).toString(16)).slice(-8),drawRange:[start,end-start],
          resources:[patientResourceId(mesh),patientResourceId(geometry),patientResourceId(position),patientResourceId(position.array),
            patientResourceId(normal),patientResourceId(normal && normal.array),patientResourceId(index),patientResourceId(index && index.array),patientResourceId(material)],
          material:{name:material.name,type:material.type,color:material.color.toArray(),depthTest:material.depthTest,depthWrite:material.depthWrite,
            opacity:material.opacity,transparent:material.transparent,patientContour:material.userData.frPatientContourStrength?material.userData.frPatientContourStrength.value:null,
            rescuerContour:material.userData.frContourStrength?material.userData.frContourStrength.value:null}};
      }
      var arms=scene.getObjectByName('fr-patient-arms'),parts=[],skin=[],hands={left:[],right:[]},head=[],clothing=[],protectedParts=[];
      arms.traverse(function(mesh){
        if(!mesh.isMesh || !visible(mesh))return;var data=summary(mesh);parts.push(data);
        if(mesh.material.name==='fr-patient-arm-skin')skin.push(data);
        if(/-sleeve$/.test(mesh.name))clothing.push(data);
        if(mesh.material.name!=='fr-patient-arm-skin')protectedParts.push(data);
      });
      ['left','right'].forEach(function(side){scene.getObjectByName('fr-patient-'+side+'-hand').traverse(function(mesh){
        if(mesh.isMesh && visible(mesh))hands[side].push(summary(mesh));
      });});
      scene.getObjectByName('fr-manikin-head-pivot').traverse(function(mesh){
        if(mesh.isMesh && visible(mesh)){var data=summary(mesh);head.push(data);protectedParts.push(data);}
      });
      ['fr-manikin-torso','fr-manikin-pelvis'].forEach(function(name){var mesh=scene.getObjectByName(name);if(mesh && mesh.isMesh && visible(mesh)){var data=summary(mesh);clothing.push(data);protectedParts.push(data);}});
      var rescuer=scene.getObjectByName('fr-depth-hands');if(rescuer)rescuer.traverse(function(mesh){
        if(mesh.isMesh)protectedParts.push(summary(mesh));
      });
      var material=window.__patientContrastMaterials()[0],skull=scene.getObjectByName('fr-manikin-head');
      var near=scene.getObjectByName('fr-patient-left-hand'),bounds=scene.getObjectByName('fr-palm-bounds'),normalDot=null;
      if(bounds){var normal=new THREE.Vector3(0,1,0).applyQuaternion(near.getWorldQuaternion(new THREE.Quaternion()));
        normalDot=camera.getWorldPosition(new THREE.Vector3()).sub(bounds.getWorldPosition(new THREE.Vector3())).normalize().dot(normal);}
      return {parts:parts,skin:skin,hands:hands,head:head,clothing:clothing,protectedParts:protectedParts,
        materials:window.__patientContrastMaterials().map(function(m){return{id:patientResourceId(m),userdata:patientResourceId(m.userData),uniform:patientResourceId(m.userData.frPatientContourStrength),
          name:m.name,type:m.type,color:m.color.toArray(),strength:m.userData.frPatientContourStrength?m.userData.frPatientContourStrength.value:null,
          depthTest:m.depthTest,depthWrite:m.depthWrite,transparent:m.transparent,opacity:m.opacity};}),
        isolated:!material || material!==skull.material && material.userData!==skull.material.userData,
        normalDot:normalDot,camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),
          quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy,calls:drawn.calls,triangles:drawn.triangles,
          geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length},
        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
    };
    window.__patientContrastMasks=function(width,height,view){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__patientContrastDraws.get(canvas);
      if(!drawn)throw new Error('A real drawn patient scene is required for projection masks');
      var scene=drawn.scene,camera=drawn.camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      var masks={skin:new Uint8Array(width*height),hand:new Uint8Array(width*height),head:new Uint8Array(width*height),clothing:new Uint8Array(width*height)};
      var counts={meshes:0,sourceTriangles:0,clippedPolygons:0};
      var planes=[function(p){return p.w+p.x;},function(p){return p.w-p.x;},function(p){return p.w+p.y;},
        function(p){return p.w-p.y;},function(p){return p.w+p.z;},function(p){return p.w-p.z;}];
      function visible(mesh){for(var p=mesh;p;p=p.parent)if(!p.visible)return false;return true;}
      function clip(poly){
        planes.forEach(function(plane){
          if(!poly.length)return;var next=[],previous=poly[poly.length-1],before=plane(previous);
          poly.forEach(function(current){
            var after=plane(current);
            if((before>=0)!==(after>=0))next.push(previous.clone().lerp(current,before/(before-after)));
            if(after>=0)next.push(current);previous=current;before=after;
          });poly=next;
        });return poly;
      }
      function raster(poly,target){
        // Project only homogeneous vertices clipped to all six real camera
        // planes. Raw off-camera vertices can otherwise mask the whole image.
        var points=poly.filter(function(p){return p.w>1e-9;}).map(function(p){return{x:(p.x/p.w+1)*width/2,y:(1-p.y/p.w)*height/2};});
        if(points.length<3)return;
        var minY=Infinity,maxY=-Infinity;points.forEach(function(p){minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
        var first=Math.max(0,Math.floor(minY-2.5)),last=Math.min(height-1,Math.ceil(maxY+2.5));
        for(var y=first;y<=last;y++){
          // A 2px conservative dilation covers antialiasing without treating
          // the empty corners of a long mesh bounding box as patient skin.
          var top=y-2,bottom=y+3,left=Infinity,right=-Infinity;
          function include(x){left=Math.min(left,x);right=Math.max(right,x);}
          points.forEach(function(a,index){
            var b=points[(index+1)%points.length];if(a.y>=top && a.y<=bottom)include(a.x);
            if(Math.abs(a.y-b.y)<1e-12)return;
            [top,bottom].forEach(function(cut){if(cut>=Math.min(a.y,b.y) && cut<=Math.max(a.y,b.y))include(a.x+(b.x-a.x)*(cut-a.y)/(b.y-a.y));});
          });
          if(!Number.isFinite(left))continue;
          var from=Math.max(0,Math.floor(left-2)),to=Math.min(width-1,Math.ceil(right+2));
          if(from<=to)target.fill(1,y*width+from,y*width+to+1);
        }
      }
      function meshMask(mesh,targets){
        if(!mesh.isMesh || !visible(mesh))return;counts.meshes++;
        var geometry=mesh.geometry,position=geometry.attributes.position,index=geometry.index;
        var total=index?index.count:position.count,start=geometry.drawRange.start,end=Math.min(total,start+geometry.drawRange.count);
        var matrix=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(mesh.matrixWorld);
        for(var offset=start;offset+2<end;offset+=3){
          counts.sourceTriangles++;var poly=[];
          for(var corner=0;corner<3;corner++){var i=index?index.getX(offset+corner):offset+corner;
            poly.push(new THREE.Vector4(position.getX(i),position.getY(i),position.getZ(i),1).applyMatrix4(matrix));}
          poly=clip(poly);if(poly.length<3)continue;counts.clippedPolygons++;
          targets.forEach(function(target){raster(poly,target);});
        }
      }
      var targetHand=scene.getObjectByName('fr-patient-'+(view==='palm'?'left':'right')+'-hand');
      scene.getObjectByName('fr-patient-arms').traverse(function(mesh){
        if(!mesh.isMesh)return;
        if(mesh.material.name==='fr-patient-arm-skin'){
          var targets=[masks.skin];for(var p=mesh;p;p=p.parent)if(p===targetHand){targets.push(masks.hand);break;}meshMask(mesh,targets);
        }else if(/-sleeve$/.test(mesh.name))meshMask(mesh,[masks.clothing]);
      });
      scene.getObjectByName('fr-manikin-head-pivot').traverse(function(mesh){meshMask(mesh,[masks.head]);});
      ['fr-manikin-torso','fr-manikin-pelvis'].forEach(function(name){var mesh=scene.getObjectByName(name);if(mesh)meshMask(mesh,[masks.clothing]);});
      var encoded={};Object.keys(masks).forEach(function(name){
        var bytes=masks[name],parts=[];for(var offset=0;offset<bytes.length;offset+=8192)parts.push(String.fromCharCode.apply(null,bytes.subarray(offset,offset+8192)));
        encoded[name]=btoa(parts.join(''));
      });return{width:width,height:height,masks:encoded,projection:counts,dilationPixels:2};
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/patient-contrast-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__patientContrastDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__patientContrastDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function mount(page: Page, age: string, width: number) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
    b3dRec: completed, b3dRecView: 5, b3dRecoveryGuides: false, b3dChildHands: 'two', b3dPlaced: 'correct',
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'patient-contrast-observation', explanation: 'Retain this saved observation.' } } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' }); await settle(page);
}
async function probe(page: Page): Promise<any> {
  const handle = await page.waitForFunction(() => (window as any).__patientContrast());
  try { return await handle.jsonValue(); } finally { await handle.dispose(); }
}
const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, reference: state.b3dDepthReference,
  inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands, placed: state.b3dPlaced });
const geometry = (pose: any) => pose.parts.concat(pose.head).map((part: any) => [part.name, part.fingerprint, part.matrix, part.drawRange]);
const resources = (pose: any) => ({ arms: pose.parts.map((part: any) => part.resources), head: pose.head.map((part: any) => part.resources),
  protected: pose.protectedParts.map((part: any) => part.resources), materials: pose.materials.map((m: any) => [m.id, m.userdata, m.uniform]),
  canvas: pose.draw.id });
async function control(page: Page, name: string, keyboard = false) {
  const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  else await button.click();
  await settle(page); const after = await probe(page);
  expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before)); expect(resources(after)).toEqual(resources(before));
  return after;
}
function framed(parts: any[]) {
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts) for (const axis of [0, 1]) {
    expect(part.min[axis], part.name).toBeGreaterThan(-.995); expect(part.max[axis], part.name).toBeLessThan(.995);
  }
}
function valid(pose: any, contrast: boolean) {
  expect(pose.parts).toHaveLength(36); expect(pose.isolated).toBe(true);
  for (const part of pose.parts.concat(pose.head)) { expect(part.invalid, part.name).toBe(0); expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/); }
  if (contrast) {
    expect(pose.skin).toHaveLength(20); expect(pose.materials).toHaveLength(1);
    expect(pose.materials[0]).toMatchObject({ name: 'fr-patient-arm-skin', type: 'MeshBasicMaterial', color: [1, 1, 1], strength: 1,
      depthTest: true, depthWrite: true, transparent: false, opacity: 1 });
    for (const part of pose.skin) expect(part.material).toMatchObject({ name: 'fr-patient-arm-skin', patientContour: 1, rescuerContour: null });
  } else {
    expect(pose.skin).toEqual([]); expect(pose.materials).toEqual([]);
    for (const part of pose.parts) expect(part.material.patientContour).toBeNull();
  }
  for (const part of pose.protectedParts) expect(part.material.patientContour, part.name + ' retains its original material').toBeNull();
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.calls).toBeGreaterThan(0);
  expect(pose.draw.triangles).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2); expect(pose.errors).toEqual([]);
}
function viewValid(pose: any, view: string, contrast: boolean) {
  valid(pose, contrast);
  if (view === 'palm') { framed(pose.hands.left); expect(pose.normalDot).toBeGreaterThan(.92); }
  else framed(pose.hands.right.filter((part: any) => /-(palm|wrist)$/.test(part.name)));
}
async function photograph(page: Page, name?: string) {
  const shot = await harness.glPixels(page, '#wrap'); expect(shot).toBeTruthy();
  if (name) writeFileSync(report + '/' + name + '.png', shot!.png); return shot!.png;
}
async function captureStage(page: Page, name: string) {
  await settle(page); const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '-stage.png', clip: clip!, timeout: 60000 });
}
function pixelEvidence(onBuffer: Buffer, offBuffer: Buffer, restoredBuffer: Buffer, pose: any, view: string, projection: any) {
  const on = readPng(onBuffer), off = readPng(offBuffer), restored = readPng(restoredBuffer);
  expect([on.width, on.height]).toEqual([off.width, off.height]); expect([on.width, on.height]).toEqual([restored.width, restored.height]);
  const pixelScale = on.width / pose.canvasSize[0], areaScale = pixelScale * pixelScale;
  expect([projection.width, projection.height]).toEqual([on.width, on.height]);
  const masks: Record<string, Buffer> = {};
  for (const name of ['skin', 'hand', 'head', 'clothing']) {
    masks[name] = Buffer.from(projection.masks[name], 'base64'); expect(masks[name]).toHaveLength(on.width * on.height);
  }
  const inside = (name: string, x: number, y: number) => masks[name][y * on.width + x] !== 0;
  const difference = (a: number[], b: number[]) => Math.max(...a.map((channel, i) => Math.abs(channel - b[i])));
  let changed = 0, noise = 0, exteriorSamples = 0, exteriorChanged = 0, exteriorNoise = 0;
  let headSamples = 0, headChanged = 0, headNoise = 0, whiteHead = 0, clothingSamples = 0, clothingChanged = 0, clothingNoise = 0;
  let whiteHand = 0, darkHand = 0, whiteInterior = 0, cheekDark = 0;
  const contour = new Uint8Array(on.width * on.height);
  for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
    const a = on.at(x, y), b = off.at(x, y), c = restored.at(x, y);
    const effect = difference(a, b) > 32, repeatNoise = difference(a, c) > 32;
    if (inside('skin', x, y)) { if (effect) changed++; if (repeatNoise) noise++; }
    else {
      exteriorSamples++; if (effect) exteriorChanged++; if (repeatNoise) exteriorNoise++;
      if (inside('head', x, y)) { headSamples++; if (effect) headChanged++; if (repeatNoise) headNoise++;
        if (Math.min(...a) >= 240 && Math.min(...b) >= 240 && Math.min(...c) >= 240) whiteHead++; }
      if (inside('clothing', x, y)) { clothingSamples++; if (effect) clothingChanged++; if (repeatNoise) clothingNoise++; }
    }
    // Count only pixels which are white with this single uniform disabled.
    // Dark pixels present in both inputs (background, crease or face features)
    // cannot pass as a newly visible hand contour.
    if (inside('hand', x, y) && Math.min(...b) >= 240) {
      whiteHand++;
      if (Math.min(...a) >= 240 && Math.min(...c) >= 240) whiteInterior++;
      if (Math.max(...a) < 100 && Math.max(...c) < 100) {
        darkHand++; contour[y * on.width + x] = 1; if (inside('head', x, y)) cheekDark++;
      }
    }
  }
  let largestComponent = 0;
  for (let start = 0; start < contour.length; start++) {
    if (!contour[start]) continue; const queue = [start]; contour[start] = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor], x = index % on.width, y = Math.floor(index / on.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * on.width + nx;
        if (nx >= 0 && nx < on.width && ny >= 0 && ny < on.height && contour[next]) { contour[next] = 0; queue.push(next); }
      }
    } largestComponent = Math.max(largestComponent, queue.length);
  }
  const evidence = { width: on.width, height: on.height, pixelScale, changed, noise, exteriorSamples, exteriorChanged, exteriorNoise,
    headSamples, headChanged, headNoise, whiteHead, clothingSamples, clothingChanged, clothingNoise,
    whiteHand, darkHand, whiteInterior, cheekDark, largestComponent, projection: projection.projection, maskDilationPixels: projection.dilationPixels };
  const condition = 'pixel-evidence-' + pose.state.b3dAge + '-pose-' + pose.state.b3dRecView + '-' + view;
  const diagnostic = { condition, pixels: evidence, pose };
  // Persist before assertions so a failing worker cannot erase this view's
  // measured evidence when Playwright starts the next workflow in a new worker.
  writeFileSync(report + '/' + condition + '.json', JSON.stringify(diagnostic, null, 2));
  metrics.push({ condition, pixels: evidence });
  expect(changed, 'patient contour exceeds repeat raster noise').toBeGreaterThan(Math.max(30 * areaScale, noise * 5));
  expect(whiteHand / areaScale, 'white patient hand pixels participate').toBeGreaterThan(100);
  expect(darkHand / areaScale, 'patient hand has visible dark contour pixels').toBeGreaterThan(12);
  expect(largestComponent / areaScale, 'contour forms a connected feature').toBeGreaterThan(4);
  expect(whiteInterior / whiteHand, 'patient hands retain clear white interior surfaces').toBeGreaterThan(.45);
  expect(darkHand / whiteHand).toBeLessThan(.55);
  expect(exteriorSamples).toBeGreaterThan(on.width * on.height * .01);
  expect(exteriorChanged, 'background and all surfaces outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(10, exteriorNoise * 3 + 5));
  expect(headChanged, 'visible head pixels outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(5, headNoise * 3 + 2));
  expect(clothingChanged, 'clothing outside patient skin projections remains unchanged').toBeLessThanOrEqual(Math.max(5, clothingNoise * 3 + 2));
  if (view === 'head') {
    expect(headSamples / areaScale, 'visible head pixels participate in the comparison').toBeGreaterThan(100);
    expect(whiteHead / areaScale, 'the head remains a white contrast surface').toBeGreaterThan(50);
    expect(cheekDark / areaScale, 'a new hand contour separates the hand near the projected cheek').toBeGreaterThan(8);
  }
  return evidence;
}
async function pairedContours(page: Page, name: string, view: string) {
  const before = await probe(page); viewValid(before, view, true);
  const on = await photograph(page, name); let off: Buffer;
  try {
    expect(await page.evaluate(() => (window as any).__setPatientContour(0))).toBe(1);
    await settle(page); const disabled = await probe(page);
    expect(disabled.materials[0].strength).toBe(0); expect(disabled.camera).toEqual(before.camera);
    expect(disabled.state).toEqual(before.state); expect(resources(disabled)).toEqual(resources(before)); expect(geometry(disabled)).toEqual(geometry(before));
    expect(disabled.protectedParts).toEqual(before.protectedParts);
    expect(disabled.draw.calls, 'uniform changes add no draw calls').toBe(before.draw.calls); expect(disabled.draw.triangles).toBe(before.draw.triangles);
    expect(disabled.draw.geometries, 'uniform changes upload no new geometry').toBe(before.draw.geometries);
    expect(disabled.draw.programs, 'uniform changes compile no new programs').toBe(before.draw.programs);
    off = await photograph(page, name + '-contour-off');
  } finally { await page.evaluate(() => (window as any).__setPatientContour(1)); await settle(page); }
  const restored = await photograph(page), after = await probe(page); viewValid(after, view, true);
  expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state);
  expect(resources(after)).toEqual(resources(before)); expect(geometry(after)).toEqual(geometry(before));
  expect(after.protectedParts).toEqual(before.protectedParts); expect(after.draw.calls).toBe(before.draw.calls);
  expect(after.draw.programs, 'the same compiled material is reused').toBe(before.draw.programs);
  expect(after.draw.geometries).toBe(before.draw.geometries);
  const image = readPng(on);
  const projection = await page.evaluate(({ width, height, view }) => (window as any).__patientContrastMasks(width, height, view), { width: image.width, height: image.height, view });
  const pixels = pixelEvidence(on, off!, restored, after, view, projection);
  metrics.push({ condition: name, pixels, pose: after }); await captureStage(page, name); return after;
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(browserErrors.get(page)).toEqual([]);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}
async function workflow(page: Page, age: string, width: number, keyboard: boolean) {
  await mount(page, age, width); const saved = preserved((await probe(page)).state);
  const prefix = age === 'infant' ? 'phone-infant' : age, standard: Record<string, any> = {};
  for (const pose of [5, 8]) {
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
    for (const [label, view] of [['Palm detail view', 'palm'], ['Head close-up', 'head']] as const) {
      const drawn = await control(page, label, keyboard); viewValid(drawn, view, false); expect(preserved(drawn.state)).toEqual(saved);
      standard[pose + '-' + view] = drawn;
      if (pose === 5) await captureStage(page, prefix + '-standard-pose-' + pose + '-' + view);
    }
  }
  const originalCanvas = await page.locator('#wrap canvas').elementHandle();
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  await expect.poll(async () => originalCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  for (const pose of [5, 8]) {
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
    for (const [label, view] of [['Palm detail view', 'palm'], ['Head close-up', 'head']] as const) {
      const before = await control(page, label, keyboard); viewValid(before, view, true);
      expect(geometry(before)).toEqual(geometry(standard[pose + '-' + view])); expect(preserved(before.state)).toEqual(saved);
      expect(before.draw.calls, 'patient contour clone adds no calls compared with the same standard view').toBe(standard[pose + '-' + view].draw.calls);
      expect(before.draw.triangles).toBe(standard[pose + '-' + view].draw.triangles);
      const drawn = await pairedContours(page, prefix + '-contrast-pose-' + pose + '-' + view, view);
      expect(preserved(drawn.state)).toEqual(saved);
    }
  }
  if (keyboard) {
    const narrow = await control(page, 'Palm detail view', true), bufferIds = resources(narrow);
    await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
    const wide = await probe(page); viewValid(wide, 'palm', true); expect(resources(wide)).toEqual(bufferIds); expect(geometry(wide)).toEqual(geometry(narrow));
    expect(preserved(wide.state)).toEqual(saved);
    await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
    const restored = await probe(page); viewValid(restored, 'palm', true); expect(resources(restored)).toEqual(bufferIds); expect(preserved(restored.state)).toEqual(saved);
    for (let axis = 0; axis < 3; axis++) expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis], 6);
    await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Palm detail view', true); await audit(page);
    const forced = await probe(page); viewValid(forced, 'palm', true); expect(resources(forced)).toEqual(bufferIds); expect(preserved(forced.state)).toEqual(saved);
    await captureStage(page, prefix + '-contrast-forced-colors-palm'); await page.emulateMedia({ forcedColors: 'none' });
    // A real key handler rotates the camera after canvas-only readback has restored DOM visibility.
    await settle(page); const stage = page.locator('.fr-body3d-stage'); await stage.focus(); await expect(stage).toBeFocused();
    const beforeRotate = await probe(page); await page.keyboard.press('ArrowLeft'); await settle(page);
    const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(beforeRotate.camera.position);
    expect(resources(rotated)).toEqual(bufferIds); expect(preserved(rotated.state)).toEqual(saved);
    await control(page, 'Palm detail view', true);
  }
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await audit(page); await release(page);
}
for (const age of ['adult', 'child']) test(age + ' patient contrast contours clarify palms and cheek support without changing geometry or learning state', async ({ page }) => {
  await workflow(page, age, 1280, false);
});
test('320px infant patient contours remain readable through keyboard cameras resize forced colors and renderer cleanup', async ({ page }) => {
  await workflow(page, 'infant', 320, true);
});
