#!/usr/bin/env node
'use strict';
// Native Z1 communications detail, relay study, camera ownership and resource checks.
// --source=<private candidate> is required (or ISS_COMMS_SOURCE). No live source writes.
// --selftest; --visual-only --widths=1440; --stop --out=<owned native directory>
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-comms-01a185d3/native-01'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = 1e-6) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const vectorNear = (a, b, tolerance) => { assert.equal(a.length, b.length); a.forEach((value, i) => near(value, b[i], tolerance)); };
const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules'].includes(key)));
const stableCamera = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'renderCount'));


function verifyFacility(v, fitted = false) {
  assert(v); assert.equal(v.name, 'iss-z1-comms'); assert.equal(v.parent, 'unity'); assert.equal(v.scienceId, 'comms'); assert.equal(v.moduleId, null);
  vectorNear(v.position,[0,.6,.2]); vectorNear(v.rotation.slice(0,3),[0,0,0]); assert(v.finite&&v.normalsUnit&&v.triangles>0);
  assert(v.vertexColors&&v.colorCount>=5&&!v.sharesMaterial&&!v.sharesGeometry); assert.equal(v.material.type,'MeshStandardMaterial');
  assert.equal(v.material.map,null); assert.equal(v.material.emissive,0); assert.equal(v.material.transparent,true); near(v.material.roughness,.48); near(v.material.metalness,.35);
  const m=v.metadata; assert.equal(m.kind,'z1-comms'); assert.equal(m.illustrative,true); assert.equal(m.cmgCount,4);
  let cursor=0; const names=new Set(); for(const c of m.components){assert(c.name&&!names.has(c.name));names.add(c.name);assert.equal(c.start,cursor);assert(Number.isInteger(c.count)&&c.count>0&&c.count%3===0);cursor+=c.count;} assert.equal(cursor,v.triangles*3);
  assert.deepEqual(m.cmgEnclosures.map(c=>c.name).sort(),[1,2,3,4].map(i=>'cmg-enclosure-'+i)); assert(m.cmgEnclosures.every(c=>names.has(c.name)));
  for(const name of ['unity-attachment','reflector-front','reflector-back','reflector-rim','feed','feed-strut-0','feed-strut-1','feed-strut-2'])assert(names.has(name));
  near(m.reflector.radius,.36); near(m.reflector.depth,.10); near(m.reflector.focalLength,.324); vectorNear(m.reflector.center,[.68,.88,.24]);
  const axis=[.65,.7,.3], length=Math.hypot(...axis); vectorNear(m.reflector.normal,axis.map(x=>x/length)); vectorNear(v.normal,[0,1,0]);
  assert(/fixed pointing/i.test(m.configuration)&&/schematic/i.test(m.configuration));
  // Deliberately loose outer bounds catch a displaced or exploded mesh; the exact
  // merged shape and analytic paraboloid are covered independently by unit tests.
  const lo=[-.5,.49,-.31],hi=[1.2,1.83,.91];v.modelBounds[0].forEach((n,i)=>assert(n>=lo[i]&&n<hi[i]));v.modelBounds[1].forEach((n,i)=>assert(n<=hi[i]&&n>lo[i]));
  assert(v.modelBounds[1][0]-v.modelBounds[0][0]>1.2&&v.modelBounds[1][1]-v.modelBounds[0][1]>.9);
  if(fitted){assert.equal(v.camera.fit,'comms');verifyManualFit({...v,camera:{...v.camera,fit:null}});assert(!v.camera.tweening);vectorNear(v.camera.fitCenter,v.center);near(v.camera.fitRadius,v.radius);assert(v.projected.every(p=>p.every(Number.isFinite)&&Math.abs(p[0])<.99&&Math.abs(p[1])<.99&&p[2]>-1&&p[2]<1));assert(v.pixels.width>65&&v.pixels.height>65);}
}
function verifyProtected(before, after) {
  assert.equal(after.meshCount, before.meshCount + 1); assert.equal(after.materialCount, before.materialCount + 1); assert.equal(after.geometryCount, before.geometryCount + 1); assert.equal(after.textureCount, before.textureCount);
  assert.deepEqual(after.protected, before.protected, 'Every existing mesh geometry, material, texture, pose and visibility remains exact');
  assert.deepEqual(after.physics, before.physics); assert.deepEqual(after.arm, before.arm); assert.deepEqual(after.data, before.data); assert.deepEqual(after.xp, before.xp);
}
function verifyManualFit(v){assert.equal(v.camera.fit,null);assert.equal(v.camera.focusId,'comms');near(v.camera.minDistance,1.6);near(v.camera.maxDistance,5);assert(v.camera.distance>=1.6-1e-6&&v.camera.distance<=5+1e-6);assert(v.camera.position[1]>=-3.8-1e-6);assert(v.camera.position[1]>=v.center[1]+.08*v.camera.distance-1e-6,'Communications inspection remains above the neighboring station hulls');assert(v.outwardDot>=.08*v.camera.distance-1e-6);vectorNear(v.camera.target,v.center);}
function verifyCutaway(v,selected,focused=false){near(v.material.opacity,focused||selected?1:.05);assert.equal(!!v.material.depthWrite,focused||selected);assert.equal(v.material.emissive,0);}
function verifyStudy(v,selected){assert.equal(v.selected,selected);assert.deepEqual(v.zones.map(z=>z.id).sort(),['ground','relay','station']);assert(v.zones.every(z=>z.visible));assert.deepEqual(v.zones.filter(z=>z.selected).map(z=>z.id),[selected]);assert.deepEqual(v.pressed,['station','relay','ground'].map(id=>id===selected));const active=v.zones.find(z=>z.selected);assert(active.fill&&v.zones.filter(z=>!z.selected).every(z=>z.fill!==active.fill&&z.stroke!==active.stroke));assert(v.description.trim().length>35&&v.descriptionVisible&&v.descriptionFont>=12);}
function verifyCleanup(mounts, candidate) {
  assert(mounts.length); for (const m of mounts) { assert(m.lost && m.frames > 0 && m.resources > 0); assert.deepEqual(m.bad, []); if (candidate) { assert.equal(m.commsResources.length, 2); assert(m.commsResources.every(r => r.owners.length === 1)); } }
  if (candidate) { const ids = mounts.flatMap(m => m.commsResources.map(r => r.id)); assert.equal(new Set(ids).size, ids.length); }
  if (mounts.length > 1) { assert.deepEqual(mounts[1].reused.map(r => r.kind).sort(), ['BufferGeometry', 'CylinderGeometry']); assert(mounts[1].reused.every(r => r.ownerTypes.includes('ArrowHelper'))); }
}
function verifyPrivateRuns(results) {
  const mounts = results.filter(r => r.kind === 'candidate').flatMap(r => r.finalCleanup || r.cleanup), ids = mounts.flatMap(m => m.commsResources.map(r => r.id));
  assert(mounts.length > 0 && ids.length === mounts.length * 2); assert.equal(new Set(ids).size, ids.length, 'Facility geometry/material are fresh across every viewport and remount'); return { mounts: mounts.length, resourceIds: ids };
}
function installObserver() {
  const Original = THREE.WebGLRenderer; window.__commsQA = { mounts: [], draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, frames: 0, scene: null, camera: null }; window.__commsQA.mounts.push(mount);
    function track(resource, owner, ownerType) {
      if (!resource) return; const existing = mount.resources[resource.uuid];
      if (existing) { if (owner && !existing.owners.includes(owner)) existing.owners.push(owner); if (ownerType && !existing.ownerTypes.includes(ownerType)) existing.ownerTypes.push(ownerType); return; }
      const entry = mount.resources[resource.uuid] = { name: resource.name || '', kind: resource.type, owners: owner ? [owner] : [], ownerTypes: ownerType ? [ownerType] : [], disposals: 0 };
      resource.addEventListener('dispose', () => { if (!mount.closed) entry.disposals++; });
    }
    renderer.render = function (scene, camera) {
      const answer = render.apply(this, arguments);
      scene.traverse(object => { const owner = object.name || object.parent?.name || ''; track(object.geometry, owner, object.parent?.type);
        for (const mat of (Array.isArray(object.material) ? object.material : [object.material])) { if (!mat) continue; track(mat, owner, object.parent?.type); for (const value of Object.values(mat)) if (value?.isTexture) track(value, owner, object.parent?.type); }
      });
      if (scene.name === 'iss-station-inspection') { mount.scene = scene; mount.camera = camera; mount.frames++; window.__commsQA.draw = mount; }
      return answer;
    }; return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}


function readScene() {
  const draw = window.__commsQA.draw, cv = document.querySelector('.iss-station-stage canvas'), scene = draw.scene, camera = draw.camera;
  const station = scene.getObjectByName('iss-inspected-station'), state = cv._issCameraState(), light = cv._issLightingState(), arm = cv._issArmState(), maps = new Map();
  station.updateWorldMatrix(true, true); camera.updateMatrixWorld(true);
  const fingerprint = array => { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261; for (const byte of bytes) value = Math.imul(value ^ byte, 16777619); return (value >>> 0).toString(16); };
  function texture(map) { if (!map) return null; if (maps.has(map.uuid)) return maps.get(map.uuid); const image = map.image, v = { name: map.name, size: [image?.width, image?.height], wrap: [map.wrapS, map.wrapT], repeat: map.repeat.toArray(), encoding: map.encoding, pixels: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null }; maps.set(map.uuid, v); return v; }
  const material = mat => ({ type: mat.type, color: mat.color?.getHex(), emissive: mat.emissive?.getHex(), emissiveIntensity: mat.emissiveIntensity, transparent: mat.transparent, roughness: mat.roughness, metalness: mat.metalness, opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, side: mat.side, map: texture(mat.map), emissiveMap: texture(mat.emissiveMap) });
  const records = [], materials = new Set(), geometries = new Set(), protectedMaterials = new Set(), protectedGeometries = new Set(); let meshCount = 0, facility;
  station.traverse(o => { if (!o.isMesh) return; meshCount++; const g = o.geometry, mats = Array.isArray(o.material) ? o.material : [o.material]; geometries.add(g.uuid); mats.forEach(m => { materials.add(m.uuid); material(m); });
    if (o.name === 'iss-z1-comms') { facility = o; return; } mats.forEach(m => protectedMaterials.add(m.uuid)); protectedGeometries.add(g.uuid);
    records.push({ name: o.name, parent: o._issParentId || null, id: o._issId || null, visitor: o._issVisitorId || null, scienceId: o._issScienceId || null,
      geometry: { type: g.type, parameters: g.parameters || null, attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, attr]) => [key, fingerprint(attr.array)])), index: g.index ? fingerprint(g.index.array) : null },
      position: o.position.toArray(), rotation: o.rotation.toArray(), scale: o.scale.toArray(), materials: mats.map(material), visible: o.visible });
  });
  const result = { meshCount, materialCount: materials.size, geometryCount: geometries.size, textureCount: maps.size, protected: records.map(r => JSON.stringify(r)).sort(),
    physics: { stationQuaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation', 'rate', 'tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse', 'playing', 'sun', 'wingNormal', 'sunIntensity'].map(k => [k, light[k]])) },
    arm: Object.fromEntries(['enabled', 'guides', 'actual', 'target', 'pose', 'base', 'elapsed', 'tipError'].map(k => [k, arm[k]])), data: structuredClone(window.__toolData.spaceStation), xp: window.__commsXP.slice(), camera: state, facility: null };
  if (!facility) return result;
  const g = facility.geometry, pos = g.getAttribute('position'), colors = g.getAttribute('color'), normals = g.getAttribute('normal'), unique = new Set(), points = []; let normalsUnit = true;
  for (let i = 0; i < pos.count; i++) { points.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(facility.matrixWorld).project(camera).toArray()); if (colors) unique.add([colors.getX(i), colors.getY(i), colors.getZ(i)].join(',')); if (!normals || Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) > 1e-5) normalsUnit = false; }
  const bounds = new THREE.Box3().setFromObject(facility), center = bounds.getCenter(new THREE.Vector3()), normal = new THREE.Vector3(0,1,0).applyQuaternion(facility.getWorldQuaternion(new THREE.Quaternion())); g.computeBoundingBox();
  result.facility = { name: facility.name, parent: facility._issParentId, scienceId: facility._issScienceId, moduleId: facility._issId || null, material: material(facility.material), materialId: facility.material.uuid, geometryId: g.uuid,
    sharesMaterial: protectedMaterials.has(facility.material.uuid), sharesGeometry: protectedGeometries.has(g.uuid), position: facility.position.toArray(), rotation: facility.rotation.toArray(), vertexColors: !!facility.material.vertexColors, colorCount: unique.size,
    finite: Array.from(pos.array).every(Number.isFinite), normalsUnit, triangles: (g.index?.count || pos.count) / 3, metadata: structuredClone(g.userData), modelBounds: [g.boundingBox.min.clone().add(facility.position).toArray(), g.boundingBox.max.clone().add(facility.position).toArray()],
    normal: normal.toArray(), center: center.toArray(), radius: bounds.getBoundingSphere(new THREE.Sphere()).radius,
    outwardDot: camera.position.clone().sub(center).dot(normal), projected: [0, 1, 2].flatMap(axis => [points.reduce((best, p) => p[axis] < best[axis] ? p : best), points.reduce((best, p) => p[axis] > best[axis] ? p : best)]),
    pixels: { width: (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) * cv.clientWidth / 2, height: (Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) * cv.clientHeight / 2 }, camera: state };
  return result;
}
function readStudy() {
  const root = document.querySelector('[data-iss-comms-study]'), desc = root.querySelector('[data-iss-comms-description]');
  const visible = n => !!n && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden' && n.getBoundingClientRect().width > 0;
  return { selected: root.getAttribute('data-iss-comms-study'), zones: Array.from(root.querySelectorAll('[data-iss-comms-zone]'), n => { const rect = n.querySelector('rect'); return { id: n.getAttribute('data-iss-comms-zone'), selected: n.getAttribute('data-selected') === 'true', visible: visible(n), fill: getComputedStyle(rect).fill, stroke: getComputedStyle(rect).stroke }; }),
    routes: Array.from(root.querySelectorAll('svg path'), n => ({ d: n.getAttribute('d'), dashed: n.getAttribute('stroke-dasharray') })),
    pressed: ['station', 'relay', 'ground'].map(id => root.querySelector('[data-iss-comms-hop="' + id + '"]').getAttribute('aria-pressed') === 'true'), description: desc.textContent, descriptionVisible: visible(desc), descriptionFont: parseFloat(getComputedStyle(desc).fontSize) };
}
function readCleanup() {
  window.__destroy(); window.__commsQA.mounts.forEach(m => { m.closed = true; });
  return window.__commsQA.mounts.map((m, i, all) => ({ frames: m.frames, lost: m.gl.isContextLost(), resources: Object.keys(m.resources).length,
    commsResources: Object.entries(m.resources).filter(([, r]) => r.owners.includes('iss-z1-comms')).map(([id, r]) => ({ id, ...r })),
    reused: Object.entries(m.resources).filter(([id]) => all.slice(0, i).some(previous => previous.resources[id])).map(([id, r]) => ({ id, ...r })), bad: Object.values(m.resources).filter(r => r.disposals !== 1) }));
}
function readPickPoint(science) {
  const draw = window.__commsQA.draw, cv = document.querySelector('.iss-station-stage canvas'), mesh = science ? draw.scene.getObjectByName('iss-z1-comms') : (() => { let found; draw.scene.traverse(o => { if (o.isMesh && o._issId === 'unity') found = o; }); return found; })();
  if (!mesh) return null; const pickers = []; draw.scene.traverse(o => { if (o.isMesh && (o._issId || o._issParentId || o._issVisitorId || o._issScienceId)) { let a = o; while (a && a.visible) a = a.parent; if (!a) pickers.push(o); } });
  const bounds = new THREE.Box3().setFromObject(mesh), candidates = [bounds.getCenter(new THREE.Vector3())], pos = mesh.geometry.getAttribute('position'), idx = mesh.geometry.index, count = idx?.count || pos.count;
  for (let i = 0; i < count; i += 3 * Math.max(1, Math.floor(count / 240))) { const p = new THREE.Vector3(); for (let j = 0; j < 3; j++) p.add(new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j)); candidates.push(p.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld)); }
  const box = cv.getBoundingClientRect(), ray = new THREE.Raycaster();
  for (const v of candidates) { const p = v.project(draw.camera); if (Math.abs(p.x) > .9 || Math.abs(p.y) > .7 || p.z < -1 || p.z > 1) continue; ray.setFromCamera(new THREE.Vector2(p.x, p.y), draw.camera); const hit = ray.intersectObjects(pickers, false)[0]; if (hit?.object !== mesh) continue; return { x: box.left + (p.x + 1) * box.width / 2, y: box.top + (1 - p.y) * box.height / 2, hit: hit.object.name, id: hit.object._issId || null, scienceId: hit.object._issScienceId || null }; }
  return null;
}

function verifyOwnership(v){assert.deepEqual(v.sentinelCalls,[],'The first unrelated map must not receive the camera action');assert.equal(v.after.focusId,'comms');assert(v.focusedActual);assert.deepEqual(v.afterData,v.beforeData);assert.deepEqual(v.afterXP,v.beforeXP);}

function ownershipMutant(source){
  const ranges=[['function IssCommsStudy(', 'function IssQuestStudy('], ["'data-iss-camera-fit': 'comms'", '\n']];let mutated=source,count=0;
  for(const [startKey,endKey]of ranges){const start=mutated.indexOf(startKey);assert(start>=0);const end=mutated.indexOf(endKey,start+startKey.length);assert(end>start);const block=mutated.slice(start,end),needle="event.currentTarget.closest('[data-iss-map]')";assert.equal(block.split(needle).length-1,1);mutated=mutated.slice(0,start)+block.replace(needle,'document')+mutated.slice(end);count++;}assert.equal(count,2);assert.notEqual(mutated,source);return mutated;
}
async function checkOwnership(page,activate,negative=false){
  const actual=page.locator('#wrap .iss-station-stage canvas'),out=[];
  await page.evaluate(()=>{const owner=document.createElement('div');owner.id='comms-owner-sentinel';owner.setAttribute('data-iss-map','');owner.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';owner.innerHTML='<div class="iss-station-stage"><canvas tabindex="0"></canvas></div>';const cv=owner.querySelector('canvas');window.__commsSentinelCalls=[];cv._issFitCamera=kind=>window.__commsSentinelCalls.push(kind);document.body.insertBefore(owner,document.body.firstChild);});
  try{for(const selector of ['[data-iss-camera-fit="comms"]','[data-iss-comms-inspect]']){
    await actual.evaluate(cv=>cv._issSetView('overview'));await page.waitForFunction(()=>!document.querySelector('#wrap .iss-station-stage canvas')._issCameraState().tweening);const before=await page.evaluate(()=>{window.__commsSentinelCalls=[];const cv=document.querySelector('#wrap .iss-station-stage canvas');return{camera:cv._issCameraState(),data:structuredClone(window.__toolData),xp:window.__commsXP.slice()};});
    await activate(page.locator('#wrap '+selector));await page.waitForFunction(()=>!document.querySelector('#wrap .iss-station-stage canvas')._issCameraState().tweening);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const v=await page.evaluate(()=>{const cv=document.querySelector('#wrap .iss-station-stage canvas');return{sentinelCalls:window.__commsSentinelCalls.slice(),after:cv._issCameraState(),focusedActual:document.activeElement===cv,afterData:structuredClone(window.__toolData),afterXP:window.__commsXP.slice()};});Object.assign(v,{selector,beforeData:before.data,beforeXP:before.xp});
    if(negative){assert.deepEqual(v.sentinelCalls,['comms']);assert.deepEqual(stableCamera(v.after),stableCamera(before.camera));assert.throws(()=>verifyOwnership(v));v.rejected=true;}else verifyOwnership(v);out.push(v);
  }}finally{await page.evaluate(()=>document.getElementById('comms-owner-sentinel')?.remove());}return out;
}


async function runMount(browser, base, source, width, baseline = null, negative = false) {
  const result={width,kind:negative?'ownership-negative':baseline?'candidate':'baseline',checks:{},screenshots:[],errors:[]},height=width<500?844:1080;
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500,deviceScaleFactor:1,reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>result.errors.push(e.stack||e.message));
  await page.addInitScript(()=>{window.__commsXP=[];});
  await page.route(base+'/?*',async route=>{const response=await route.fetch(),html=await response.text();assert.equal(html.split('awardXP: noop').length-1,1);await route.fulfill({response,body:html.replace('awardXP: noop','awardXP: function(value) { window.__commsXP.push(value); }')});});
  await page.route('**/stem_lab/stem_tool_spacestation.js',route=>route.fulfill({body:source,contentType:'text/javascript'}));
  await page.route('**/vendor/three-r128/three.min.js',async route=>{const response=await route.fetch();assert(response.ok());await route.fulfill({response,body:(await response.text())+'\n;('+installObserver.toString()+')();'});});
  const canvas=page.locator('.iss-station-stage canvas'),stage=page.locator('.iss-station-stage'),study=page.locator('[data-iss-comms-study]'),guide=page.locator('[data-iss-component-guide]'),fit=page.locator('[data-iss-camera-fit="comms"]'),caption=page.locator('[data-iss-comms-caption]');
  const activate=n=>width<500?n.tap():n.click(),wait=async()=>{await page.waitForFunction(()=>window.__commsQA?.draw?.frames>1&&document.querySelector('.iss-station-stage canvas')?._issCameraState&&!document.querySelector('.iss-station-stage canvas')._issCameraState().tweening);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));},read=()=>page.evaluate(readScene),choose=()=>page.locator('#iss-component-topic').selectOption('comms'),state=v=>({physics:v.physics,arm:v.arm,data:v.data,xp:v.xp});
  const select=async id=>{await activate(page.locator('.iss-module-picker').getByRole('button',{name:new RegExp('^'+id+'$','i')}));await page.waitForFunction(id=>window.__toolData.spaceStation.selModule===id,id);await wait();};
  const capture=async(n,label)=>{await n.scrollIntoViewIfNeeded();await wait();const name='comms-'+label+'-'+width+'.png',clip=await n.evaluate(n=>{const r=n.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};}),session=await page.context().newCDPSession(page);try{const shot=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true,clip:{...clip,scale:1}});await fs.writeFile(path.join(output,name),Buffer.from(shot.data,'base64'));result.screenshots.push(name);}finally{await session.detach();}};
  try {
    await page.goto(base+'/?tab=map');await wait();
    await page.evaluate(()=>{document.querySelector('.iss-station-stage canvas')._issSetLighting({playing:false});window.__setToolData(p=>({...p,spaceStation:{...p.spaceStation,opsOrbitMinute:37.12345,opsWaterDay:12.5,opsPressureMinute:7.25,opsPrediction:'Preserve prediction',opsLog:['Preserve notebook note'],opsTrials:[{id:71,label:'Saved trial',setup:{opsBattery:65},results:{batteryMin:42},prediction:'Saved prediction',reflection:'Saved explanation'}],cupolaTarget:'aurora',cupolaCaptured:true,cupolaShutters:false,cupolaObservation:'Preserve my observation',interiorNotes:{unity:'Preserve Unity interior note'}}}));});
    await page.waitForFunction(()=>window.__toolData.spaceStation.opsOrbitMinute===37.12345);await page.locator('#iss-component-topic').selectOption('unity');await activate(page.locator('[data-iss-lighting-preset="noon"]'));await wait();result.initial=await read();
    result.guideOptions=await page.locator('#iss-component-topic option').evaluateAll(ns=>ns.map(n=>({value:n.value,text:n.textContent})));
    if(!baseline){assert.equal(result.initial.facility,null);assert.equal(result.guideOptions.length,28);result.cleanup=await page.evaluate(readCleanup);verifyCleanup(result.cleanup,false);result.hostErrors=await page.evaluate(()=>window.__events.errors);assert.deepEqual(result.errors,[]);assert.deepEqual(result.hostErrors,[]);result.passed=true;console.log('Comms baseline '+width+'px captured');return result;}
    verifyProtected(baseline.initial,result.initial);verifyFacility(result.initial.facility);assert.equal(result.guideOptions.length,29);assert.deepEqual(result.guideOptions.filter(o=>o.value!=='comms'),baseline.guideOptions);
    result.checks.protected={beforeMeshes:baseline.initial.meshCount,afterMeshes:result.initial.meshCount,geometryDelta:result.initial.geometryCount-baseline.initial.geometryCount,materialDelta:result.initial.materialCount-baseline.initial.materialCount,textureDelta:result.initial.textureCount-baseline.initial.textureCount,protectedCount:result.initial.protected.length,hash:hash(JSON.stringify(result.initial.protected))};
    const beforeTopic=state(result.initial);await choose();await wait();assert.deepEqual(state(await read()),beforeTopic);
    if(negative){result.checks.ownership=await checkOwnership(page,activate,true);result.mutantSha256=hash(source);result.cleanup=await page.evaluate(readCleanup);verifyCleanup(result.cleanup,true);result.hostErrors=await page.evaluate(()=>window.__events.errors);assert.deepEqual(result.errors,[]);assert.deepEqual(result.hostErrors,[]);result.passed=true;console.log('Comms document-wide lookup mutant rejected by both native controls');return result;}
    const beforeFit=state(await read());await fit.focus();await page.keyboard.press('Enter');await wait();let scene=await read();verifyFacility(scene.facility,true);assert.deepEqual(state(scene),beforeFit);assert(await caption.isVisible());result.checks.fit=scene.facility;
    const targetStatus=page.locator('[data-iss-camera-target]');assert.equal(await targetStatus.getAttribute('role'),'status');result.checks.targetName=await targetStatus.innerText();assert(/Z1 communications/i.test(result.checks.targetName));
    await capture(guide,'study');await select('zarya');await activate(fit);await wait();verifyFacility((await read()).facility,true);await capture(stage,'day');await select('unity');await choose();await activate(fit);await wait();console.log('Comms '+width+'px first native close view ready');
    if(process.argv.includes('--visual-only')){result.visualOnly=true;result.cleanup=await page.evaluate(readCleanup);verifyCleanup(result.cleanup,true);result.passed=true;return result;}
    const studyBefore=await read();result.checks.hops=[];
    for(const hop of ['station','relay','ground']){const button=study.locator('[data-iss-comms-hop="'+hop+'"]');await button.focus();await page.keyboard.press(hop==='relay'?'Space':'Enter');const v=await page.evaluate(readStudy);verifyStudy(v,hop);result.checks.hops.push(v);const after=await read();assert.deepEqual(state(after),state(studyBefore));assert.deepEqual(after.protected,studyBefore.protected);assert.deepEqual(stableCamera(after.camera),stableCamera(studyBefore.camera));assert.equal(after.facility.geometryId,studyBefore.facility.geometryId);assert.deepEqual(after.facility.material,studyBefore.facility.material);}
    assert.equal(new Set(result.checks.hops.map(v=>v.description)).size,3);result.checks.hops.forEach(v=>assert.deepEqual(v.routes,result.checks.hops[0].routes,'Only the selected node changes; no real pointing or radio simulation'));
    const text=await study.innerText();for(const term of [/2000/,/2007/,/vacuum/i,/paraboloid/i,/both directions/i,/not.*calculate/i])assert(term.test(text));
    result.checks.links=await guide.locator('a').evaluateAll(ns=>ns.map(a=>({href:a.href,target:a.target,rel:a.rel})));assert(result.checks.links.length>=3);result.checks.links.forEach(a=>{const u=new URL(a.href);assert.equal(u.protocol,'https:');assert(/(^|\.)(nasa\.gov|jaxa\.jp)$/.test(u.hostname));assert.equal(a.target,'_blank');assert(a.rel.split(/\s+/).includes('noopener'));});
    await page.addScriptTag({path:path.join(ROOT,'desktop/web-app/node_modules/axe-core/axe.min.js')});result.checks.axe=await page.evaluate(async()=>{const r=await axe.run({include:['[data-iss-component-guide]','[data-iss-comms-caption]']},{rules:{region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};});assert.deepEqual(result.checks.axe.violations,[]);
    result.checks.layout=await guide.evaluate(n=>({document:document.documentElement.scrollWidth-innerWidth,panel:n.scrollWidth-n.clientWidth,overflow:Array.from(n.querySelectorAll('p,h3,h4,button')).filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent),fonts:Array.from(n.querySelectorAll('[data-iss-comms-study] p')).map(x=>parseFloat(getComputedStyle(x).fontSize))}));assert(result.checks.layout.document<=1&&result.checks.layout.panel<=1);assert.deepEqual(result.checks.layout.overflow,[]);assert(result.checks.layout.fonts.every(n=>n>=12));
    result.checks.ownership=await checkOwnership(page,activate);await wait();verifyFacility((await read()).facility,true);assert.deepEqual(state(await read()),state(studyBefore));
    await page.setViewportSize({width:width<500?320:960,height});await wait();verifyFacility((await read()).facility,true);await page.setViewportSize({width,height});await wait();result.checks.resize=true;await canvas.scrollIntoViewIfNeeded();await canvas.focus();
    const beforeOrbit=state(await read());
    // The original dish-normal guard admitted a radius1.8 eye inside Quest.
    // Reproduce those exact requested angles through the public pose actions.
    await canvas.evaluate(cv=>{cv._issCameraZoom(1.8/cv._issCameraState().distance);const s=cv._issCameraState(),d=s.position.map((v,i)=>v-s.target[i]),r=Math.hypot(...d);cv._issCameraOrbit(-2.792526803190927-Math.atan2(d[0],d[2]),2.8801531433504737-Math.acos(d[1]/r));});await wait();scene=await read();near(scene.camera.distance,1.8);verifyManualFit(scene.facility);assert.deepEqual(state(scene),beforeOrbit);result.checks.publicHookNeighborHullRegression={requestedAzimuth:-2.792526803190927,requestedPolar:2.8801531433504737,camera:scene.camera,center:scene.facility.center};
    for(let i=0;i<16;i++)await page.keyboard.press('-');await wait();near((await read()).camera.distance,5);
    // A deliberately combined public action is separate from the native arrow sequence.
    await canvas.evaluate(cv=>{const s=cv._issCameraState(),d=s.position.map((v,i)=>v-s.target[i]),r=Math.hypot(...d);cv._issCameraOrbit(Math.atan2(.65,.3)-Math.atan2(d[0],d[2]),Math.PI/2-Math.acos(d[1]/r));cv._issCameraOrbit(Math.PI,Math.PI/2);});await wait();scene=await read();verifyManualFit(scene.facility);assert.deepEqual(state(scene),beforeOrbit);result.checks.publicHookFloorReproduction=scene.camera;
    for(const [key,count]of [['ArrowUp',30],['ArrowDown',30],['ArrowLeft',26],['ArrowDown',18]]){for(let i=0;i<count;i++)await page.keyboard.press(key);await wait();scene=await read();verifyManualFit(scene.facility);assert.deepEqual(state(scene),beforeOrbit);}result.checks.outwardOrbitAtMaximum=(await read()).camera;
    await activate(fit);await wait();await canvas.focus();const beforeZoom=state(await read());await page.keyboard.press('-');await wait();scene=await read();verifyManualFit(scene.facility);assert(await caption.isVisible());assert.deepEqual(state(scene),beforeZoom);result.checks.zoomTargetName=await targetStatus.innerText();assert(/Z1 communications/i.test(result.checks.zoomTargetName));
    const manual=scene.camera;await page.setViewportSize({width:width<500?320:960,height});await wait();scene=await read();verifyManualFit(scene.facility);vectorNear(scene.camera.position,manual.position);vectorNear(scene.camera.target,manual.target);await page.setViewportSize({width,height});await wait();result.checks.manualZoomResize=true;
    result.checks.exits=[];for(const key of ['Shift+ArrowRight','Home','f']){await activate(fit);await wait();const before=state(await read());await canvas.focus();await page.keyboard.press(key);await wait();scene=await read();assert.notEqual(scene.camera.focusId,'comms');assert.equal(await caption.isVisible(),false);assert.deepEqual(state(scene),before);result.checks.exits.push(key);}
    await activate(fit);await wait();const beforeGeneric=state(await read());await activate(page.locator('[data-iss-focus-module="unity"]'));await wait();scene=await read();assert.equal(scene.camera.focusId,'unity');assert(scene.camera.minDistance>=1.6);assert.equal(await caption.isVisible(),false);assert.deepEqual(state(scene),beforeGeneric);result.checks.genericUnityFocus=true;
    // The pre-existing Unity hull retains normal module discovery and XP semantics.
    await select('destiny');await page.evaluate(()=>window.__setToolData(p=>{const seen={...p.spaceStation.seenModules};delete seen.unity;return{...p,spaceStation:{...p.spaceStation,seenModules:seen}};}));await page.waitForFunction(()=>!window.__toolData.spaceStation.seenModules.unity);await canvas.scrollIntoViewIfNeeded();await canvas.focus();
    let hullPoint;for(let i=0;i<20;i++){hullPoint=await page.evaluate(readPickPoint,false);if(hullPoint)break;await page.keyboard.press('ArrowLeft');await wait();}assert(hullPoint,'A visible original Unity hull triangle is available');const beforeHull=state(await read());if(width<500)await page.touchscreen.tap(hullPoint.x,hullPoint.y);else await page.mouse.click(hullPoint.x,hullPoint.y);await page.waitForFunction(()=>window.__toolData.spaceStation.selModule==='unity');await wait();scene=await read();assert(scene.data.seenModules.unity);assert.deepEqual(independent(scene.data),independent(beforeHull.data));assert.deepEqual(scene.physics,beforeHull.physics);assert.deepEqual(scene.arm,beforeHull.arm);assert.deepEqual(scene.xp,beforeHull.xp.concat(1));result.checks.nativeHullPick=hullPoint;
    // Clear focus before hover: focused science objects deliberately suppress hover labels.
    await select('destiny');await activate(fit);await wait();await canvas.scrollIntoViewIfNeeded();await canvas.focus();await page.keyboard.press('Shift+ArrowRight');await wait();assert.equal(await caption.isVisible(),false);let point=await page.evaluate(readPickPoint,true);assert(point&&point.scienceId==='comms');const beforePick=state(await read());
    if(width>=500){await page.mouse.move(point.x,point.y);await page.waitForFunction(()=>{const n=document.querySelector('[data-iss-hover-name]');return document.querySelector('.iss-station-stage canvas')._issHoverId==='comms'&&/Z1|communication|antenna/i.test(n?.textContent||'')&&Number(getComputedStyle(n).opacity)>.9;});result.checks.hover=await page.locator('[data-iss-hover-name]').innerText();}
    if(width<500)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);await wait();scene=await read();verifyFacility(scene.facility,true);assert.deepEqual(state(scene),beforePick);assert.equal(scene.data.selModule,'destiny');result.checks.nativeSciencePick=point;if(width>=500)assert.equal(await page.locator('[data-iss-hover-name]').evaluate(n=>Number(getComputedStyle(n).opacity)),0);
    await activate(page.locator('[data-iss-cutaway]'));await wait();scene=await read();verifyCutaway(scene.facility,false,true);const beforeExit=state(scene);await canvas.focus();await page.keyboard.press('Home');await wait();scene=await read();verifyCutaway(scene.facility,false);assert.deepEqual(state(scene),beforeExit);await select('unity');scene=await read();verifyCutaway(scene.facility,true);result.checks.cutaway=true;
    await activate(page.locator('[data-iss-cutaway]'));await choose();const beforeStudyFit=state(await read());await activate(study.locator('[data-iss-comms-inspect]'));await wait();verifyFacility((await read()).facility,true);assert.deepEqual(state(await read()),beforeStudyFit);result.checks.studyInspect=true;
    await select('zarya');await activate(fit);await activate(page.locator('[data-iss-lighting-preset="midnight"]'));await wait();scene=await read();verifyFacility(scene.facility,true);assert(scene.physics.eclipse);assert.equal(scene.facility.material.emissive,0);await capture(stage,'eclipse');result.checks.eclipse=scene.facility;
    const seed=scene.data;result.cleanup=await page.evaluate(readCleanup);verifyCleanup(result.cleanup,true);await page.evaluate(seed=>window.__mount(seed),seed);await wait();await activate(fit);await wait();verifyFacility((await read()).facility,true);result.finalCleanup=await page.evaluate(readCleanup);verifyCleanup(result.finalCleanup,true);result.hostErrors=await page.evaluate(()=>window.__events.errors);assert.deepEqual(result.errors,[]);assert.deepEqual(result.hostErrors,[]);result.passed=true;console.log('Comms '+width+'px native geometry, science picking, relay study, ownership, camera, cutaway, axe and cleanup passed');return result;
  }catch(error){result.passed=false;result.failure=error.stack||error.message;result.lastScene=await read().catch(()=>null);await capture(stage,'failure').catch(()=>{});error.qaResult=result;throw error;}finally{await page.evaluate(()=>window.__destroy?.()).catch(()=>{});await page.close().catch(()=>{});}
}

function ownedOutput(directory) { assert(path.resolve(directory).startsWith(path.join(ROOT, '.tmp/space-station-comms-01a185d3/native')), 'Only this QA owner’s native evidence directory is writable'); }
function verifyLaunch(record) {
  assert.equal(record.script, __filename); ownedOutput(record.output); assert(Number.isInteger(record.masterPid) && record.masterPid > 0);
  const base = new URL(record.base); assert.equal(base.protocol, 'http:'); assert.equal(base.hostname, '127.0.0.1'); assert(base.port);
  if (record.browserEndpoint) { const ws = new URL(record.browserEndpoint); assert.equal(ws.protocol, 'ws:'); assert(['127.0.0.1', 'localhost', '[::1]'].includes(ws.hostname)); assert(ws.port); }
}
function verifyOwnershipHelper(text) {
  assert.equal((text.match(/\brequestAnimationFrame\(/g)||[]).length,2,'Native owner helper must retain both real browser frame callbacks');
  assert(text.includes("document.querySelector('#wrap .iss-station-stage canvas')"));
}


function selftest(){
  const names=['unity-attachment','reflector-front','reflector-back','reflector-rim','feed','feed-strut-0','feed-strut-1','feed-strut-2',...Array.from({length:4},(_,i)=>'cmg-enclosure-'+(i+1))],axis=[.65,.7,.3],normal=axis.map(x=>x/Math.hypot(...axis));
  const facility={name:'iss-z1-comms',parent:'unity',scienceId:'comms',moduleId:null,position:[0,.6,.2],rotation:[0,0,0,'XYZ'],finite:true,normalsUnit:true,triangles:48,vertexColors:true,colorCount:5,sharesMaterial:false,sharesGeometry:false,material:{type:'MeshStandardMaterial',map:null,emissive:0,transparent:true,roughness:.48,metalness:.35,opacity:1,depthWrite:true},metadata:{kind:'z1-comms',illustrative:true,components:names.map((name,i)=>({name,start:i*12,count:12})),cmgCount:4,cmgEnclosures:[1,2,3,4].map(i=>({name:'cmg-enclosure-'+i})),reflector:{radius:.36,depth:.10,focalLength:.324,center:[.68,.88,.24],normal},configuration:'Schematic support; fixed pointing'},modelBounds:[[-.46,.50,-.30],[1.1,1.8,.85]],normal:[0,1,0]};
  verifyFacility(facility);let count=0;const reject=(sample,verify,mutations)=>{for(const mutate of mutations){const v=structuredClone(sample);mutate(v);assert.throws(()=>verify(v));count++;}};
  reject(facility,verifyFacility,[v=>v.parent='truss',v=>v.scienceId=null,v=>v.moduleId='unity',v=>v.material.emissive=1,v=>v.material.map='texture',v=>v.material.metalness=.7,v=>v.material.transparent=false,v=>v.position[1]=0,v=>v.normalsUnit=false,v=>v.metadata.illustrative=false,v=>v.metadata.components[1].start++,v=>v.metadata.cmgCount=3,v=>v.metadata.cmgEnclosures.pop(),v=>v.metadata.reflector.focalLength=.2,v=>v.metadata.reflector.normal[0]=-1,v=>v.sharesMaterial=true,v=>v.modelBounds[1][0]=2]);
  const fitted={...structuredClone(facility),camera:{fit:'comms',focusId:'comms',tweening:false,minDistance:1.6,maxDistance:5,distance:2,position:[0,2,0],target:[0,0,0],fitCenter:[0,0,0],fitRadius:.9},center:[0,0,0],radius:.9,outwardDot:2,projected:[[-.5,-.5,0],[.5,.5,0]],pixels:{width:100,height:100}};verifyFacility(fitted,true);reject(fitted,v=>verifyFacility(v,true),[v=>v.camera.target[0]=1,v=>v.outwardDot=-1,v=>v.projected[0][0]=2,v=>v.camera.position[1]=-4,v=>v.camera.distance=6,v=>v.camera.position[1]=.05]);const manual=structuredClone(fitted);manual.camera.fit=null;verifyManualFit(manual);reject(manual,verifyManualFit,[v=>v.camera.focusId='unity',v=>v.camera.minDistance=1]);
  const cut=structuredClone(facility);cut.material.opacity=.05;cut.material.depthWrite=false;verifyCutaway(cut,false);reject(cut,v=>verifyCutaway(v,false),[v=>v.material.opacity=1,v=>v.material.depthWrite=true]);verifyCutaway(facility,false,true);
  const before={meshCount:282,geometryCount:200,materialCount:100,textureCount:20,protected:['retained'],physics:{phase:0},arm:{seconds:0},data:{note:'keep'},xp:[]},after={...structuredClone(before),meshCount:283,geometryCount:201,materialCount:101};verifyProtected(before,after);reject(after,v=>verifyProtected(before,v),[v=>v.protected[0]='changed',v=>v.data.note='',v=>v.xp.push(1),v=>v.textureCount++,v=>v.geometryCount++,v=>v.materialCount++,v=>v.physics.phase++,v=>v.arm.seconds++]);
  const study={selected:'relay',zones:['station','relay','ground'].map(id=>({id,selected:id==='relay',visible:true,fill:id==='relay'?'active':'idle',stroke:id==='relay'?'gold':'gray'})),pressed:[false,true,false],description:'Relay satellites connect the station with distant Earth terminals.',descriptionVisible:true,descriptionFont:12};verifyStudy(study,'relay');reject(study,v=>verifyStudy(v,'relay'),[v=>v.zones.pop(),v=>v.zones[1].selected=false,v=>v.zones[1].fill='idle',v=>v.descriptionFont=8,v=>v.zones[0].visible=false]);
  const owner={sentinelCalls:[],after:{focusId:'comms'},focusedActual:true,beforeData:{note:'keep'},afterData:{note:'keep'},beforeXP:[],afterXP:[]};verifyOwnership(owner);reject(owner,verifyOwnership,[v=>v.sentinelCalls.push('comms'),v=>v.after.focusId=null,v=>v.afterData.note='',v=>v.focusedActual=false]);
  const discovery={selModule:'destiny',seenModules:{},mapCutaway:false,note:'keep'};assert.deepEqual(independent({...discovery,selModule:'unity',seenModules:{unity:true}}),independent(discovery));assert.throws(()=>assert.deepEqual(independent({...discovery,mapCutaway:true}),independent(discovery)));count++;
  const clean=[{lost:true,frames:3,resources:2,bad:[],commsResources:[1,2].map(id=>({id,owners:['own']}))}];verifyCleanup(clean,true);reject(clean,v=>verifyCleanup(v,true),[v=>v[0].bad.push({disposals:2}),v=>v[0].commsResources[0].owners.push('other'),v=>v[0].commsResources[1].id=1]);
  const launch={script:__filename,output,masterPid:1,base:'http://127.0.0.1:1234',browserEndpoint:'ws://localhost:2345/owned'};for(const host of ['127.0.0.1','localhost','[::1]'])verifyLaunch({...launch,browserEndpoint:'ws://'+host+':2345/owned'});reject(launch,verifyLaunch,[v=>v.script='other',v=>v.browserEndpoint='ws://example.com:2345/other',v=>v.output=ROOT]);for(const host of ['[::2]','192.168.1.1','127.0.0.2','localhost.example.com']){assert.throws(()=>verifyLaunch({...launch,browserEndpoint:'ws://'+host+':2345/other'}));count++;}
  const sample="function IssCommsStudy(){var owner=event.currentTarget.closest('[data-iss-map]');}\nfunction IssQuestStudy(){}\n'data-iss-camera-fit': 'comms', owner=event.currentTarget.closest('[data-iss-map]')\n";assert.equal((ownershipMutant(sample).match(/owner=document/g)||[]).length,2);
  verifyOwnershipHelper(checkOwnership.toString());assert.throws(()=>verifyOwnershipHelper(checkOwnership.toString().replace('requestAnimationFrame','brokenFrameCallback')));count++;
  console.log('Comms QA selftest: '+count+' geometry, finish, camera, cutaway, preservation, relay, ownership, cleanup and launch-ownership mutants rejected.');
}

async function workerMain() {
  ownedOutput(output); const base = argument('--base', ''); assert(base);
  const sourceArgument = argument('--source', process.env.ISS_COMMS_SOURCE || ''); assert(sourceArgument, 'Provide --source=<private candidate> or ISS_COMMS_SOURCE');
  const sourcePath = path.resolve(ROOT, sourceArgument), source = await fs.readFile(sourcePath, 'utf8');
  assert(source.includes('function issCommsGeometry(') && source.includes('data-iss-comms-study'), 'Wait for candidate readiness');
  const before = await fs.readFile(path.resolve(ROOT, argument('--baseline', '.tmp/space-station-comms-01a185d3/native-source-before.js')), 'utf8');
  assert.equal(hash(before), '18c375826bb3775ef42e28c12bd53f5a808dd92cbb2dd62575be81c7649f245e');
  const report = { sourcePath, sourceSha256: hash(source), baselineSha256: hash(before), driverSha256: hash(await fs.readFile(__filename)), workerPid: process.pid, started: new Date().toISOString(), results: [] };
  await fs.writeFile(path.join(output,'source-tested.js'),source);await fs.copyFile(__filename,path.join(output,'driver-tested.cjs'));
  let browserServer, browser, cancelled = false, closing, finished = false;
  async function closeBrowser() {
    if (!browserServer) return;
    if (!closing) closing = (async () => { await browserServer.close(); const child = browserServer.process(); report.browserExit = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode, closed: child.exitCode !== null || child.signalCode !== null }; process.send?.({ type: 'browser-closed', ...report.browserExit }); })();
    await closing;
  }
  function stop() { if (cancelled || finished) return; cancelled = true; report.cancelled = true; closeBrowser().catch(error => { report.closeError = error.message; }); }
  process.on('message', message => { if (message?.type === 'stop') stop(); }); process.on('SIGINT', stop); process.on('SIGTERM', stop); process.on('disconnect', () => { if (!finished) stop(); });
  const timer = setInterval(() => fs.access(path.join(output, 'cancel-request.json')).then(stop, () => {}), 1000); timer.unref();
  const priorPath = argument('--reuse-report', ''), prior = priorPath ? JSON.parse(await fs.readFile(path.resolve(ROOT, priorPath), 'utf8')) : null; if (prior) assert.equal(prior.baselineSha256, report.baselineSha256);
  try {
    if (cancelled) throw new Error('Cancelled before browser launch');
    browserServer = await chromium.launchServer({ headless: true, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const child = browserServer.process(); report.browserPid = child.pid; report.browserEndpoint = browserServer.wsEndpoint();
    const launch = { sourcePath, driverSha256: report.driverSha256, workerPid: process.pid, browserPid: child.pid, browserEndpoint: browserServer.wsEndpoint(), browserCommand: child.spawnargs, base, sourceSha256: report.sourceSha256, created: new Date().toISOString() };
    await fs.writeFile(path.join(output, 'worker-launch.json'), JSON.stringify(launch, null, 2)); console.log('Comms browser launch ' + JSON.stringify(launch)); process.send?.({ type: 'browser-started', ...launch });
    if (cancelled) throw new Error('Cancelled during browser launch');
    browser = await chromium.connect(browserServer.wsEndpoint());
    for (const width of widths) {
      if (cancelled) throw new Error('Cancelled before next viewport');
      try {
        const reused = prior?.results.find(r => r.kind === 'baseline' && r.width === width && r.passed), baseline = reused || await runMount(browser, base, before, width);
        if (reused) report.reusedBaseline = path.resolve(ROOT, priorPath); else report.results.push(baseline);
        report.results.push(await runMount(browser, base, source, width, baseline));
      } catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
    }
    report.privateResources = verifyPrivateRuns(report.results);
    if (!process.argv.includes('--visual-only')) { const baseline = report.results.find(r => r.kind === 'baseline' && r.width === 1440) || prior?.results.find(r => r.kind === 'baseline' && r.width === 1440); assert(baseline, 'Ownership negative control needs the desktop baseline'); const mutant = ownershipMutant(source); report.ownershipMutantSha256 = hash(mutant); report.results.push(await runMount(browser, base, mutant, 1440, baseline, true)); }
  } catch (error) { report.failure = error.stack || error.message; process.exitCode = cancelled ? 130 : 1; console.error(report.failure); }
  finally {
    clearInterval(timer); if (browser) await browser.close().catch(() => {}); await closeBrowser().catch(error => { report.closeError = error.stack || error.message; process.exitCode = 1; });
    report.finished = new Date().toISOString(); report.cancelled = cancelled; report.sourceUnchanged = hash(await fs.readFile(sourcePath, 'utf8')) === report.sourceSha256;
    if (!report.sourceUnchanged) process.exitCode = 1;
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    process.send?.({ type: 'worker-finished', cancelled, sourceUnchanged: report.sourceUnchanged, browserExit: report.browserExit });
    finished = true;
    if (process.connected) process.disconnect();
  }
}

async function supervise() {
  ownedOutput(output); assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320)); await fs.mkdir(output, { recursive: true });
  const launchPath = path.join(output, 'launch.json'); try { await fs.access(launchPath); throw new Error('Use a fresh native output directory; preserve earlier launch evidence'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const record = { script: __filename, output, masterPid: process.pid, started: new Date().toISOString(), phase: 'starting', childClosed: false, previewClosed: false };
  let preview, child, cancelled = false, saving = Promise.resolve(), timer;
  const save = () => { const text = JSON.stringify(record, null, 2); saving = saving.then(() => fs.writeFile(launchPath, text)); return saving; };
  const stop = () => { if (record.childClosed) return; if (!cancelled) { cancelled = true; record.cancelled = true; record.phase = 'stopping'; save(); } if (child?.connected) child.send({ type: 'stop' }); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop); await save(); console.log(`Comms supervisor PID ${process.pid}`);
  try {
    preview = await createPreview(); record.base = preview.base; await save(); console.log(`Comms owned preview ${preview.base}`);
    const args = process.argv.slice(2).filter(arg => arg !== '--worker' && !arg.startsWith('--base='));
    child = spawn(process.execPath, [__filename, '--worker', '--base=' + preview.base, ...args], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
    record.childPid = child.pid; record.childCommand = child.spawnargs; record.phase = 'running'; await save(); console.log(`Comms worker PID ${child.pid}`);
    const outputStream = require('node:fs').createWriteStream(path.join(output, 'stdout.txt')), errorStream = require('node:fs').createWriteStream(path.join(output, 'stderr.txt'));
    child.stdout.pipe(outputStream); child.stderr.pipe(errorStream); child.stdout.on('data', b => process.stdout.write(b)); child.stderr.on('data', b => process.stderr.write(b));
    child.on('message', message => {
      if (message.type === 'browser-started') { assert.equal(message.workerPid, child.pid); Object.assign(record, { browserPid: message.browserPid, browserEndpoint: message.browserEndpoint, sourceSha256: message.sourceSha256, sourcePath: message.sourcePath, driverSha256: message.driverSha256 }); }
      if (message.type === 'browser-closed') record.browserExit = message;
      if (message.type === 'worker-finished') record.workerFinished = message;
      save();
    });
    timer = setInterval(() => fs.access(path.join(output, 'cancel-request.json')).then(stop, () => {}), 1000); timer.unref(); if (cancelled) stop();
    const ended = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal })); });
    record.childExit = ended; record.childClosed = true; record.phase = cancelled ? 'cancelled' : ended.code === 0 ? 'complete' : 'failed';
    await Promise.all([new Promise(resolve => outputStream.end(resolve)), new Promise(resolve => errorStream.end(resolve))]); process.exitCode = ended.code === 0 && !cancelled ? 0 : ended.code || 1;
  } finally {
    if (timer) clearInterval(timer); if (preview) { await new Promise(resolve => preview.server.close(resolve)); record.previewClosed = true; }
    record.finished = new Date().toISOString(); await save(); await saving; console.log('Comms final ownership receipt ' + JSON.stringify(record));
  }
}

async function requestStop() {
  ownedOutput(output); const launchPath = path.join(output, 'launch.json'), record = JSON.parse(await fs.readFile(launchPath, 'utf8')); verifyLaunch(record);
  if (record.childClosed && record.previewClosed) { console.log('Owned Comms worker and preview were already closed.'); return; }
  await fs.writeFile(path.join(output, 'cancel-request.json'), JSON.stringify({ script: __filename, requested: new Date().toISOString(), masterPid: record.masterPid, childPid: record.childPid, browserPid: record.browserPid }, null, 2));
  console.log(`Requested graceful stop of recorded Comms worker ${record.childPid}, browser ${record.browserPid}, preview ${record.base}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); const latest = JSON.parse(await fs.readFile(launchPath, 'utf8'));
    if (latest.childClosed && latest.previewClosed) { console.log(JSON.stringify(latest)); return; }
  }
  throw new Error('Graceful stop requested but closure not yet confirmed; preserve receipt and do not infer cleanup');
}



if(require.main===module){if(process.argv.includes('--selftest'))selftest();else(process.argv.includes('--stop')?requestStop():process.argv.includes('--worker')?workerMain():supervise()).catch(error=>{console.error(error.stack||error);process.exitCode=1;});}
module.exports={verifyFacility,verifyProtected,verifyManualFit,verifyCutaway,verifyStudy,verifyOwnership,verifyCleanup,verifyPrivateRuns,verifyLaunch,ownershipMutant,selftest};
