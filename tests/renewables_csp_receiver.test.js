import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)'),roots=[];
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
function section(first,last){const start=source.indexOf(first),end=source.indexOf(last,start);if(start<0||end<0)throw Error('Missing model section '+first);return source.slice(start,end);}
const modelCode=section('function rnNumber(','function rnSettings(')+section('var RN_ENERGY_SPECS=','function rnEnergyPathway(');
const runCsp=vm.runInNewContext(`(function(){${modelCode};return function(settings){return rnEnergyRun('solarThermal',settings,0);};})()`);
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','shape','motion','cue','particles','deformTube','valve','cabinet','waveAnnulus','runner','runnerReference','generatorDetail','steamDrivetrain','steamElectricalConnections','cspOpticalConnections','cspThermalConnections','cspReceiverDetail','electricity','mechanismPoints','position','zoomLimit'].map(helper).join('\n');
const defaultView=source.match(/view=(\{name:'isometric',yaw:[^\n]+?\}),viewport=/)[1];
const opening="}else if(id==='solarThermal'){",branchStart=source.indexOf(opening,sceneStart),branchEnd=source.indexOf("}else if(id==='wave'){",branchStart),branch=source.slice(branchStart+opening.length,branchEnd);

// Exercise the complete production mirror field, receiver and steam power block
// with the real energy model; only WebGL rendering and canvas labels are omitted.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null,referencePower=2047.5,id='solarThermal',focusDetail=false,focusTarget=null,dirty=false;
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);function label(){}
    var groups={resource:A,converter:B,generator:C},context={visible:false},view=${defaultView},camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100),cameraState=[null,function(){}];
    ${branch}
    [A,B,C].forEach(function(group,index){group.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][index];});});
    function update(run,dt,animate,syncResponse,trace,selected){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,selected:selected||'converter',inspection:{trace:!!trace,cutaway:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);cspOptics.update();cspThermal.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);cspOptics.update();cspThermal.update();scene.updateMatrixWorld(true);}
    function cameraPoints(key){scene.updateMatrixWorld(true);return mechanismPoints(key);}
    function defaultCamera(target){view.target=target||[0,1.4,0];view.zoom=1;position();camera.updateMatrixWorld(true);return camera;}
    function cameraZoomLimit(target,detail){focusTarget=target;focusDetail=!!detail;return zoomLimit();}
    return {scene,A,B,C,update,layout,receiver,platform:receiverPlatform,ring:receiverRing,detail:cspReceiver,field,mirrors,optics:cspOptics,thermal:cspThermal,driver:solarRunner,drive:cspDrive,responses,cameraPoints,defaultCamera,cameraZoomLimit};
  })()`,{THREE});
  roots.push(f.scene);return f;
}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function parts(object){const result=[];object.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function poses(objects){return objects.map(o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray()}));}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function localBounds(object,relative){const result=new THREE.Box3();object.updateWorldMatrix(true,true);relative.updateWorldMatrix(true,false);for(const part of parts(object)){const positions=part.geometry.attributes.position;for(let i=0;i<positions.count;i++){const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld);relative.worldToLocal(point);result.expandByPoint(point);}}return result;}
function split(f){const {incident,useful,remainder}=f.detail.fills,track=f.detail.instrument.userData.trackLength;expect(incident.scale.x).toBeCloseTo(track,12);expect(useful.scale.x+remainder.scale.x).toBeCloseTo(track,12);expect(useful.position.x-useful.scale.x/2).toBeCloseTo(-track/2,12);expect(useful.position.x+useful.scale.x/2).toBeCloseTo(remainder.position.x-remainder.scale.x/2,12);expect(remainder.position.x+remainder.scale.x/2).toBeCloseTo(track/2,12);}
function heatTarget(run){return Math.min(1.5,.65*Math.sqrt(run.stages[1].value/5850));}
function contacts(f){for(const route of f.optics.routes){const start=route.group.localToWorld(route.curve.getPoint(0)),end=route.group.localToWorld(route.curve.getPoint(1)),face=f.receiver.worldToLocal(end.clone());expect(f.mirrors.includes(route.mirror)).toBe(true);expect(route.mirror.worldToLocal(start).distanceTo(new THREE.Vector3(route.offset,.065,0))).toBeLessThan(1e-12);expect(Math.max(Math.abs(face.x),Math.abs(face.y),Math.abs(face.z))).toBeCloseTo(.4,12);}for(const route of f.thermal.routes){expect(route.group.localToWorld(route.curve.getPointAt(0)).distanceTo(world(route.from))).toBeLessThan(1e-12);expect(route.group.localToWorld(route.curve.getPointAt(1)).distanceTo(world(route.to))).toBeLessThan(1e-12);}}

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('Concentrating-solar receiver surfaces and optical energy split',()=>{
  it('attaches two fixed absorber panels with seven vertical tubes and connected headers per face',()=>{
    const f=fixture();f.update(runCsp({}),0,false);expect(f.detail.group.parent).toBe(f.receiver);expect(f.detail.panels).toHaveLength(2);expect(f.detail.tubes).toHaveLength(14);expect(f.receiver.geometry.parameters.width).toBe(.8);expect(f.receiver.geometry.parameters.height).toBe(.8);expect(f.receiver.geometry.parameters.depth).toBe(.8);
    for(const panel of f.detail.panels){const tubes=panel.children.filter(o=>o.name.includes('-tube-')),headers=panel.children.filter(o=>o.name.includes('-header-'));expect(tubes).toHaveLength(7);expect(headers).toHaveLength(2);for(const tube of tubes){const axis=new THREE.Vector3(0,1,0).applyQuaternion(tube.getWorldQuaternion(new THREE.Quaternion()));expect(axis.distanceTo(new THREE.Vector3(0,1,0))).toBeLessThan(1e-12);for(const header of headers)expect(bounds(tube).intersectsBox(bounds(header))).toBe(true);}}
  });

  it('exposes tube surfaces in front of the original opaque body on both visible faces',()=>{
    const f=fixture();f.update(runCsp({}),0,false);
    for(const panel of f.detail.panels){const normal=panel.userData.face==='front'?new THREE.Vector3(0,0,1):new THREE.Vector3(-1,0,0);for(const tube of panel.children.filter(o=>o.name.includes('-tube-'))){const center=world(tube),ray=new THREE.Raycaster(center.clone().add(normal),normal.clone().negate()),hit=ray.intersectObject(f.receiver,true)[0];expect(hit.object).toBe(tube);const b=localBounds(tube,f.receiver);expect(b.min.y).toBeCloseTo(-.3,7);expect(b.max.y).toBeCloseTo(.3,7);if(panel.userData.face==='front'){expect(b.max.z).toBeGreaterThan(.44);expect(b.min.z).toBeLessThan(.4);}else{expect(b.min.x).toBeLessThan(-.44);expect(b.max.x).toBeGreaterThan(-.4);}}}
  });

  it('keeps the absorber headers and frames compact and away from the right-hand thermal ports',()=>{
    const f=fixture();f.update(runCsp({}),0,false);for(const panel of f.detail.panels){const b=localBounds(panel,f.receiver);for(const value of[...b.min.toArray(),...b.max.toArray()])expect(Math.abs(value)).toBeLessThan(.45);for(const key of['receiver-hot','receiver-return'])expect(bounds(panel).intersectsBox(bounds(f.thermal.ports[key]))).toBe(false);}
    expect(f.thermal.ports['receiver-hot'].position.toArray()).toEqual([.4,-.15,.20]);expect(f.thermal.ports['receiver-return'].position.toArray()).toEqual([.4,-.25,-.28]);
  });

  it('fits the fixed instrument below the receiver platform and above the top ladder rung',()=>{
    const f=fixture();f.update(runCsp({}),0,false);const instrument=f.detail.instrument,b=bounds(instrument);expect(instrument.parent).toBe(f.detail.group);expect(instrument.position.toArray()).toEqual([0,-.69,.68]);expect(b.max.y).toBeLessThan(4.065);expect(b.min.y).toBeGreaterThan(3.616);expect(b.min.z-.22).toBeGreaterThan(.4);expect(b.min.x).toBeGreaterThan(.1);expect(b.max.x).toBeLessThan(.9);
    const casing=instrument.getObjectByName(instrument.name+'-casing');expect(casing.geometry.parameters.width).toBe(.78);expect(casing.geometry.parameters.height).toBe(.28);
  });

  it('keeps the fill faces visible above their tracks with fixed heights and no shadows',()=>{
    const f=fixture();f.update(runCsp({}),0,false);for(const fill of Object.values(f.detail.fills)){expect(fill.position.z).toBe(.052);expect(fill.geometry.parameters.height).toBe(.026);expect(fill.geometry.parameters.depth).toBe(.008);expect(fill.castShadow).toBe(false);expect(fill.receiveShadow).toBe(false);expect(fill.scale.y).toBe(1);expect(fill.scale.z).toBe(1);expect(fill.geometry.parameters.width).toBe(1);}
    expect(f.detail.fills.incident.position.y).toBe(.055);expect(f.detail.fills.useful.position.y).toBe(-.055);expect(f.detail.fills.remainder.position.y).toBe(-.055);
  });

  it('exposes both instrument rows from the actual default isometric camera without platform occlusion',()=>{
    const f=fixture();
    function exposed(fill){const camera=f.defaultCamera(),opaque=parts(f.scene).filter(o=>visible(o)&&(!o.material.transparent||o.material.opacity>.98)),result=[];for(let i=1;i<=9;i++){const point=fill.localToWorld(new THREE.Vector3(-.5+i/10,0,.00401)),screen=point.clone().project(camera),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);result.push(ray.intersectObjects(opaque,false)[0]?.object===fill);}return result;}
    for(const optical of[30,90])for(const expanded of[false,true]){f.update(runCsp({optical}),0,false);f.layout(expanded,null);for(const fill of Object.values(f.detail.fills))expect(exposed(fill).every(Boolean),fill.name).toBe(true);}
    // The former recessed placement passes box-clearance tests but fails these camera rays.
    f.layout(false,null);f.detail.instrument.position.z=.36;f.scene.updateMatrixWorld(true);expect(exposed(f.detail.fills.incident).some(v=>!v)).toBe(true);
    f.detail.instrument.position.z=.68;f.scene.updateMatrixWorld(true);expect(exposed(f.detail.fills.incident).every(Boolean)).toBe(true);
  });

  it('anchors the projecting instrument to the tower with supports that reach its casing',()=>{
    const f=fixture();f.update(runCsp({}),0,false);const casing=f.detail.instrument.getObjectByName(f.detail.instrument.name+'-casing'),supports=f.detail.group.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry');expect(supports).toHaveLength(2);
    for(const support of supports){const b=localBounds(support,f.receiver);expect(b.min.z).toBeCloseTo(.15,7);expect(b.max.z).toBeCloseTo(.68,7);expect(bounds(support).intersectsBox(bounds(casing))).toBe(true);expect(b.min.y).toBeGreaterThan(-.83);expect(b.max.y).toBeLessThan(-.48);}
    expect(f.platform.parent).toBe(f.B);expect(f.ring.parent).toBe(f.B);expect(f.platform.position.toArray()).toEqual([.5,4.12,0]);expect(f.ring.position.toArray()).toEqual([.5,4.6,0]);
  });

  it('frames the receiver, platform and ring for converter inspection without including the tower or remote pipes',()=>{
    const f=fixture();f.update(runCsp({}),0,false);const focus=new THREE.Box3().setFromPoints(f.cameraPoints('converter')),whole=bounds(f.B),expected=new THREE.Box3();[f.receiver,f.platform,f.ring].forEach(o=>expected.union(bounds(o)));
    expect(focus.min.distanceTo(expected.min)).toBeLessThan(1e-12);expect(focus.max.distanceTo(expected.max)).toBeLessThan(1e-12);expect(focus.min.y).toBeGreaterThan(3.7);expect(focus.getSize(new THREE.Vector3()).y).toBeLessThan(1.6);expect(whole.min.y).toBeLessThan(.1);expect(whole.getSize(new THREE.Vector3()).y).toBeGreaterThan(5);
    const resource=new THREE.Box3().setFromPoints(f.cameraPoints('resource')),resourceBounds=bounds(f.A);expect(resource.min.distanceTo(resourceBounds.min)).toBeLessThan(1e-12);expect(resource.max.distanceTo(resourceBounds.max)).toBeLessThan(1e-12);expect(f.cameraZoomLimit('converter',false)).toBe(4);
  });

  it('keeps receiver focus bounds attached in exploded and isolated views and encloses every visible fill',()=>{
    const f=fixture();f.update(runCsp({}),0,false);const compact=new THREE.Box3().setFromPoints(f.cameraPoints('converter'));f.layout(true,1);const expanded=new THREE.Box3().setFromPoints(f.cameraPoints('converter'));
    expect(expanded.min.clone().sub(compact.min).distanceTo(new THREE.Vector3(0,.8,0))).toBeLessThan(1e-12);expect(expanded.max.clone().sub(compact.max).distanceTo(new THREE.Vector3(0,.8,0))).toBeLessThan(1e-12);for(const fill of Object.values(f.detail.fills))expect(expanded.containsBox(bounds(fill))).toBe(true);expect(f.cameraZoomLimit('converter',true)).toBe(4);
  });

  it.each([30,65,90])('shows the exact useful fraction at %s percent optical efficiency',optical=>{
    const f=fixture(),run=runCsp({optical});f.update(run,0,false);const d=f.detail.instrument.userData,{incident,useful,remainder}=f.detail.fills;split(f);
    expect(d.cueMode).toBe('optical-energy-split');expect(d.opticalFraction).toBeCloseTo(optical/100,12);expect(d.displayOpticalFraction).toBeCloseTo(optical/100,12);expect(useful.scale.x/.6).toBeCloseTo(optical/100,12);expect(remainder.scale.x/.6).toBeCloseTo(1-optical/100,12);expect(incident.userData.power).toBe(run.available);expect(useful.userData.power).toBe(run.stages[1].value);expect(remainder.userData.power).toBeCloseTo(run.available-run.stages[1].value,12);expect(useful.userData.power+remainder.userData.power).toBe(incident.userData.power);
  });

  it('keeps the lower segments complementary throughout both directions of optical response',()=>{
    const f=fixture(),low=runCsp({optical:30}),high=runCsp({optical:90});f.update(low,0,false);
    for(const run of[high,low]){let previous=f.detail.instrument.userData.displayOpticalFraction;for(let i=0;i<15;i++){f.update(run,.02,true);split(f);const next=f.detail.instrument.userData.displayOpticalFraction;expect(next).toBeGreaterThan(.3);expect(next).toBeLessThan(.9);expect(Math.sign(next-previous)).toBe(run===high?1:-1);previous=next;}}
  });

  it.each([['DNI',{dni:1100}],['mirror aperture',{area:30000}]])('uses %s to brighten incoming energy without changing the selected split',(_,settings)=>{
    const f=fixture(),base=runCsp({}),changed=runCsp(settings);f.update(base,0,false);const before=f.detail.instrument.userData.incidentStrength,widths=Object.values(f.detail.fills).map(o=>o.scale.x),heat=f.detail.group.userData.heatStrength;f.update(changed,0,false);
    expect(f.detail.instrument.userData.incidentStrength).toBeGreaterThan(before);expect(Object.values(f.detail.fills).map(o=>o.scale.x)).toEqual(widths);expect(f.detail.group.userData.heatStrength).toBeGreaterThan(heat);expect(f.detail.instrument.userData.incidentPower).toBe(changed.available);split(f);
  });

  it('changes useful heat and the split without changing incident brightness when optical efficiency changes',()=>{
    const f=fixture(),low=runCsp({optical:30}),high=runCsp({optical:90});f.update(low,0,false);const input=f.detail.instrument.userData.incidentPower,strength=f.detail.instrument.userData.incidentStrength,warmth=f.detail.group.userData.heatStrength;f.update(high,0,false);
    expect(f.detail.instrument.userData.incidentPower).toBe(input);expect(f.detail.instrument.userData.incidentStrength).toBe(strength);expect(f.detail.group.userData.heatStrength).toBeGreaterThan(warmth);expect(f.detail.instrument.userData.thermalPower).toBeGreaterThan(low.stages[1].value);expect(f.detail.instrument.userData.opticalLoss).toBeLessThan(low.available-low.stages[1].value);
  });

  it('leaves receiver heat and the entire instrument unchanged when only cycle efficiency changes',()=>{
    const f=fixture(),low=runCsp({cycle:15}),high=runCsp({cycle:45});f.update(low,0,false);const data={...f.detail.instrument.userData},pose=poses(parts(f.detail.group)),warmth=f.detail.group.userData.heatStrength,rate=f.driver.userData.motionRate;f.update(high,0,false);
    expect(f.detail.instrument.userData).toEqual(data);expect(poses(parts(f.detail.group))).toEqual(pose);expect(f.detail.group.userData.heatStrength).toBe(warmth);expect(f.driver.userData.motionRate).toBeGreaterThan(rate);expect(f.thermal.group.userData.thermalPower).toBe(low.stages[1].value);
  });

  it('gives identical receiver energy cues when half the sunlight is balanced by twice the aperture',()=>{
    const a=fixture(),b=fixture(),ra=runCsp({dni:1000,area:10000}),rb=runCsp({dni:500,area:20000});a.update(ra,.2,false);b.update(rb,.2,false);
    expect(ra.available).toBe(rb.available);expect(a.detail.instrument.userData).toEqual(b.detail.instrument.userData);expect(a.detail.group.userData).toEqual(b.detail.group.userData);expect(poses(parts(a.detail.group))).toEqual(poses(parts(b.detail.group)));expect(a.field.userData.displaySize).not.toBe(b.field.userData.displaySize);
  });

  it('updates exact powers immediately while the shared fraction and warmth retain their previous pose',()=>{
    const f=fixture(),low=runCsp({dni:100,optical:30}),high=runCsp({dni:1100,optical:90});f.update(low,0,false);const pose=poses(Object.values(f.detail.fills)),warmth=f.detail.group.userData.heatStrength,display=f.detail.instrument.userData.displayOpticalFraction;f.update(high,0,true);
    expect(f.detail.instrument.userData.incidentPower).toBe(high.available);expect(f.detail.instrument.userData.thermalPower).toBe(high.stages[1].value);expect(f.detail.instrument.userData.opticalFraction).toBe(.9);expect(f.detail.instrument.userData.displayOpticalFraction).toBe(display);expect(f.detail.group.userData.heatStrength).toBe(warmth);expect(poses(Object.values(f.detail.fills))).toEqual(pose);
  });

  it('uses the existing receiver heat cue directly with no additional warmth filter',()=>{
    const f=fixture(),low=runCsp({dni:100,optical:30}),high=runCsp({dni:1100,optical:90});f.update(low,0,false);const initial=f.detail.group.userData.heatStrength;f.update(high,.1,true);const expected=heatTarget(high)+(initial-heatTarget(high))*Math.exp(-.1/.26);
    expect(f.detail.group.userData.heatStrength).toBe(f.responses['csp-heat']);expect(f.detail.group.userData.heatStrength).toBeCloseTo(expected,12);for(const tube of f.detail.tubes){expect(tube.userData.heatStrength).toBe(f.responses['csp-heat']);expect(tube.material.emissiveIntensity).toBeCloseTo(expected,12);}expect(f.receiver.material.emissiveIntensity).toBeCloseTo(.18*expected,12);
  });

  it('preserves paused poses and snaps reduced-motion or synchronization changes together',()=>{
    const f=fixture(),low=runCsp({optical:30}),high=runCsp({optical:90});f.update(low,.2,true);const pose=poses(parts(f.detail.group));for(let i=0;i<4;i++)f.update(low,0,true);expect(poses(parts(f.detail.group))).toEqual(pose);
    f.update(high,0,false);expect(f.detail.instrument.userData.displayOpticalFraction).toBeCloseTo(.9,12);expect(f.detail.group.userData.heatStrength).toBeCloseTo(heatTarget(high),12);split(f);f.update(low,0,true,true);expect(f.detail.instrument.userData.displayOpticalFraction).toBeCloseTo(.3,12);expect(f.detail.group.userData.heatStrength).toBeCloseTo(heatTarget(low),12);split(f);
  });

  it('advances a manual illustration step without moving fixed receiver equipment',()=>{
    const f=fixture(),run=runCsp({});f.update(run,0,false);const pose=poses(f.detail.panels.concat([f.detail.instrument])),angle=f.driver.rotation.z;f.update(run,.08,false,true);expect(f.driver.rotation.z).toBeLessThan(angle);expect(poses(f.detail.panels.concat([f.detail.instrument]))).toEqual(pose);expect(f.detail.instrument.userData.displayOpticalFraction).toBeCloseTo(.65,12);split(f);
  });

  it('matches fraction, input brightness and warmth across frame rates and slow playback',()=>{
    const a=fixture(),b=fixture(),c=fixture(),low=runCsp({dni:100,optical:30}),high=runCsp({dni:1100,optical:90});for(const f of[a,b,c])f.update(low,0,false);a.update(high,.6,true);for(let i=0;i<30;i++)b.update(high,.02,true);for(let i=0;i<60;i++)c.update(high,.01,true);
    for(const f of[b,c]){for(const key of['displayOpticalFraction','incidentStrength'])expect(f.detail.instrument.userData[key]).toBeCloseTo(a.detail.instrument.userData[key],11);expect(f.detail.group.userData.heatStrength).toBeCloseTo(a.detail.group.userData.heatStrength,11);for(const key of['incident','useful','remainder']){expect(f.detail.fills[key].scale.x).toBeCloseTo(a.detail.fills[key].scale.x,11);expect(f.detail.fills[key].material.emissiveIntensity).toBeCloseTo(a.detail.fills[key].material.emissiveIntensity,11);}split(f);}
  });

  it('hides active fills and removes receiver warmth immediately at zero sunlight',()=>{
    const f=fixture();f.update(runCsp({}),.2,true);const geometry=poses(f.detail.panels),run=runCsp({dni:0});f.update(run,.05,true);
    expect(Object.values(f.detail.fills).every(o=>!o.visible&&o.material.emissiveIntensity===0&&o.userData.power===0)).toBe(true);expect(f.detail.instrument.userData.incidentStrength).toBe(0);expect(f.detail.group.userData.heatStrength).toBe(0);expect(f.receiver.material.emissiveIntensity).toBe(0);expect(f.detail.tubes.every(o=>o.material.emissiveIntensity===0)).toBe(true);expect(visible(f.detail.instrument)).toBe(true);expect(poses(f.detail.panels)).toEqual(geometry);
  });

  it('retains the selected optical fraction at zero light without presenting energy as active',()=>{
    const f=fixture();for(const optical of[30,90]){f.update(runCsp({dni:0,optical}),0,false);expect(f.detail.instrument.userData.opticalFraction).toBeCloseTo(optical/100,12);expect(f.detail.instrument.userData.displayOpticalFraction).toBeCloseTo(optical/100,12);expect(f.detail.instrument.userData.incidentPower).toBe(0);expect(f.detail.instrument.userData.thermalPower).toBe(0);expect(f.detail.instrument.userData.opticalLoss).toBe(0);expect(Object.values(f.detail.fills).every(o=>!o.visible)).toBe(true);split(f);}
  });

  it('restarts input brightness and shared warmth smoothly while retaining the selected split',()=>{
    const f=fixture(),run=runCsp({optical:80});f.update(run,0,false);f.update(runCsp({dni:0,optical:80}),.1,true);f.update(run,0,true);expect(f.detail.instrument.userData.incidentStrength).toBe(0);expect(f.detail.group.userData.heatStrength).toBe(0);expect(Object.values(f.detail.fills).every(o=>o.visible)).toBe(true);f.update(run,.1,true);
    expect(f.detail.instrument.userData.incidentStrength).toBeCloseTo(run.available/(run.available+9000)*(1-Math.exp(-.1/.26)),12);expect(f.detail.group.userData.heatStrength).toBeCloseTo(heatTarget(run)*(1-Math.exp(-.1/.26)),12);expect(f.detail.instrument.userData.displayOpticalFraction).toBeCloseTo(.8,12);split(f);
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('gates all receiver activity at %s even with retained positive stage values',status=>{
    const f=fixture(),run=runCsp({});f.update(run,.2,true);f.update({...run,status},.1,true);expect(f.detail.group.userData.incidentPower).toBe(0);expect(f.detail.group.userData.thermalPower).toBe(0);expect(f.detail.group.userData.heatStrength).toBe(0);expect(f.detail.instrument.userData.incidentPower).toBe(0);expect(f.detail.instrument.userData.thermalPower).toBe(0);expect(f.detail.instrument.userData.opticalLoss).toBe(0);expect(Object.values(f.detail.fills).every(o=>!o.visible&&o.userData.power===0)).toBe(true);expect(f.detail.tubes.every(o=>o.material.emissiveIntensity===0)).toBe(true);expect(f.receiver.material.emissiveIntensity).toBe(0);expect(f.receiver.userData.thermalPower).toBe(run.stages[1].value);
  });

  it('keeps optical rays and thermal routes attached through all control extrema and expanded layouts',()=>{
    const f=fixture();for(const settings of[{dni:0,area:1000,optical:30,cycle:15},{dni:1100,area:30000,optical:90,cycle:45}])for(const expanded of[false,true]){f.update(runCsp(settings),0,false);f.layout(expanded,null);contacts(f);expect(f.optics.routes).toHaveLength(20);expect(f.thermal.routes).toHaveLength(2);}
  });

  it('keeps panel and instrument geometry fixed while the receiver stage moves or is isolated',()=>{
    const f=fixture(),run=runCsp({});f.update(run,.2,true);const pose=poses(parts(f.detail.group)),position=world(f.detail.instrument),data={...f.detail.instrument.userData};
    for(const isolated of[0,1,2,null]){f.layout(true,isolated);f.update(run,0,true);expect(visible(f.detail.group)).toBe(isolated==null||isolated===1);expect(poses(parts(f.detail.group))).toEqual(pose);expect(f.detail.instrument.userData).toEqual(data);expect(world(f.detail.instrument).y).toBeCloseTo(position.y+.8,12);contacts(f);}
  });

  it('changes only color and brightness for trace emphasis without altering the energy split',()=>{
    const f=fixture(),run=runCsp({});f.update(run,.2,true);const pose=poses(parts(f.detail.group)),heat=f.detail.group.userData.heatStrength,normal=f.detail.tubes[0].material.emissiveIntensity,fill=f.detail.fills.incident.material.emissiveIntensity;
    f.update(run,0,true,false,true,'resource');expect(f.detail.group.userData.traceState).toBe('context');expect(f.detail.instrument.userData.traceState).toBe('context');expect(poses(parts(f.detail.group))).toEqual(pose);expect(f.detail.tubes[0].material.emissiveIntensity).toBeLessThan(normal);expect(f.detail.fills.incident.material.emissiveIntensity).toBeLessThan(fill);expect(f.detail.group.userData.heatStrength).toBe(heat);split(f);
    f.update(run,0,true,false,true,'converter');expect(f.detail.group.userData.traceState).toBe('selected');expect(poses(parts(f.detail.group))).toEqual(pose);expect(f.detail.tubes[0].material.emissiveIntensity).toBeGreaterThan(normal);expect(f.detail.fills.incident.material.emissiveIntensity).toBeGreaterThan(fill);expect(f.detail.group.userData.heatStrength).toBe(heat);split(f);
  });

  it('retains geometry buffers and fixed hardware poses through all four control changes',()=>{
    const f=fixture();f.update(runCsp({}),0,false);const saved=parts(f.detail.group).map(o=>({o,geometry:o.geometry,position:o.geometry.attributes.position,array:o.geometry.attributes.position.array,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material})),fixed=poses(f.detail.panels.concat([f.detail.instrument]));
    for(const settings of[{dni:1100},{area:30000},{optical:90},{cycle:45},{dni:0}]){f.update(runCsp(settings),.08,true);expect(poses(f.detail.panels.concat([f.detail.instrument]))).toEqual(fixed);for(const v of saved){expect(v.o.geometry).toBe(v.geometry);expect(v.geometry.attributes.position).toBe(v.position);expect(v.position.array).toBe(v.array);expect(v.geometry.attributes.normal).toBe(v.normal);expect(v.geometry.index).toBe(v.index);expect(v.o.material).toBe(v.material);}}
  });

  it('never mutates exact model readings while animating the receiver and changing inspection',()=>{
    const f=fixture(),run=immutable(runCsp({dni:750,area:17000,optical:75,cycle:40})),exact=JSON.stringify(run);f.update(run,0,false);for(let i=0;i<8;i++)f.update(run,.04,true,false,true,i%2?'converter':'generator');expect(JSON.stringify(run)).toBe(exact);expect(f.detail.instrument.userData.incidentPower).toBe(run.available);expect(f.detail.instrument.userData.thermalPower).toBe(run.stages[1].value);expect(f.detail.instrument.userData.opticalLoss).toBeCloseTo(run.available-run.stages[1].value,12);expect(f.driver.userData.outputPower).toBe(run.power);
  });
});
