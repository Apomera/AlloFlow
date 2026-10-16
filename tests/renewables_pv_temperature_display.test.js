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
const runPv=vm.runInNewContext(`(function(){${modelCode};return function(settings){return rnEnergyRun('solarPv',settings,0);};})()`);
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','cue','shape','particles','deformTube','pvSunlight','pvElectricalConnections','pvTemperatureDisplay'].map(helper).join('\n');
const opening="if(id==='solarPv'){",branchStart=source.indexOf(opening,sceneStart),branchEnd=source.indexOf("}else if(id==='wind'||id==='tidal'){",branchStart),branch=source.slice(branchStart+opening.length,branchEnd);

// Run the actual PV branch and exact electrical model; only WebGL and text labels
// are omitted. Array supports, light routes, cables, gauge and inverter are real.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],referencePower=${runPv({}).power},sun={intensity:1};
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);function label(){}
    ${branch}
    [A,B,C].forEach(function(group,index){group.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][index];});});
    function update(run,dt,animate,syncResponse,trace,selected){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,selected:selected||'converter',inspection:{trace:!!trace}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);pvOptics.update();pvWiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);pvOptics.update();pvWiring.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,array,cells:pvCells,inverter:pvInverter,inverterBody:pvInverterBody,lamp:pvInverterLamp,temperature:pvTemperature,optics:pvOptics,wiring:pvWiring,feet:panelFootings,posts:panelSupports,actuator:panelActuator};
  })()`,{THREE,rnEnergyRun:(_id,settings)=>runPv(settings)});
  roots.push(f.scene);return f;
}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function marks(route){return route.group.children.filter(o=>/-marker-/.test(o.name));}
function expectContacts(f){for(const route of f.wiring.routes){expect(route.group.localToWorld(route.curve.getPointAt(0)).distanceTo(world(route.from))).toBeLessThan(1e-12);expect(route.group.localToWorld(route.curve.getPointAt(1)).distanceTo(world(route.to))).toBeLessThan(1e-12);}}

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('PV temperature and reference-output display',()=>{
  it.each([-20,25,85])('places the temperature needle and common comparison scale exactly at %s°C',temperature=>{
    const f=fixture(),run=runPv({cellTemperature:temperature});f.update(run,0,false);const t=f.temperature,expectedAngle=(135-270*(temperature+20)/105)*Math.PI/180;
    expect(t.gauge.userData.temperature).toBe(temperature);expect(t.gauge.userData.displayTemperature).toBe(temperature);expect(t.gauge.userData.scaleMinimum).toBe(-20);expect(t.gauge.userData.scaleMaximum).toBe(85);expect(t.gauge.userData.referenceTemperature).toBe(25);expect(t.needle.rotation.z).toBeCloseTo(expectedAngle,12);
    expect(t.reference.userData.temperature).toBe(25);expect(t.reference.rotation.z).toBeCloseTo((135-270*45/105)*Math.PI/180,12);if(temperature===25)expect(t.needle.rotation.z).toBe(t.reference.rotation.z);
    expect(t.display.userData.actualPower).toBe(run.power);expect(t.display.userData.referencePower).toBe(run.extra.referenceDc*.96);expect(t.display.userData.scaleReference).toBe(1.2);
    expect(t.bars.actual.scale.x).toBeCloseTo(run.extra.temperatureFactor/1.2,12);expect(t.bars.reference.scale.x).toBeCloseTo(1/1.2,12);expect(t.bars.actual.scale.x/t.bars.reference.scale.x).toBeCloseTo(run.power/(run.extra.referenceDc*.96),12);
    for(const bar of Object.values(t.bars)){expect(bar.scale.x).toBeGreaterThan(0);expect(bar.scale.x).toBeLessThan(1);expect(bar.position.x-.35*bar.scale.x).toBeCloseTo(1.65,12);expect(bar.position.x+.35*bar.scale.x).toBeLessThan(2.35);}
  });

  it('shows cold-cell gain and hot-cell loss against an unchanged 25°C comparison',()=>{
    const f=fixture(),reference=[];for(const temperature of[-20,25,85]){const run=runPv({cellTemperature:temperature});f.update(run,0,false);const t=f.temperature;reference.push({power:t.display.userData.referencePower,width:t.bars.reference.scale.x,brightness:t.bars.reference.material.emissiveIntensity});expect(Math.sign(t.bars.actual.scale.x-t.bars.reference.scale.x)).toBe(Math.sign(25-temperature));}
    expect(reference[0]).toEqual(reference[1]);expect(reference[1]).toEqual(reference[2]);
  });

  it('moves the needle and actual comparison together while publishing exact readings immediately',()=>{
    const f=fixture(),low=runPv({cellTemperature:25}),high=runPv({cellTemperature:85});f.update(low,0,false);const t=f.temperature,initialAngle=t.needle.rotation.z,initialWidth=t.bars.actual.scale.x;f.update(high,0,true);
    expect(t.needle.rotation.z).toBe(initialAngle);expect(t.bars.actual.scale.x).toBe(initialWidth);expect(t.gauge.userData.temperature).toBe(85);expect(t.display.userData.actualPower).toBe(high.power);expect(t.bars.actual.userData.power).toBe(high.power);expect(t.bars.actual.userData.targetFraction).toBeCloseTo(high.extra.temperatureFactor/1.2,12);
    f.update(high,.3,true);const displayT=85+(25-85)*Math.exp(-1),factor=1-.0037*(displayT-25);expect(t.gauge.userData.displayTemperature).toBeCloseTo(displayT,12);expect(t.needle.rotation.z).toBeCloseTo((135-270*(displayT+20)/105)*Math.PI/180,12);expect(t.display.userData.displayTemperatureFactor).toBeCloseTo(factor,12);expect(t.bars.actual.scale.x/t.bars.reference.scale.x).toBeCloseTo(factor,12);
  });

  it.each([['irradiance',{irradiance:1100}],['area',{area:100}],['module efficiency',{efficiency:30}],['incidence',{incidence:0}]])('updates absolute comparison powers and brightness with %s while retaining relative lengths',(_name,settings)=>{
    const f=fixture(),low=runPv({cellTemperature:65}),high=runPv({...settings,cellTemperature:65});expect(high.power).toBeGreaterThan(low.power);f.update(low,0,false);const t=f.temperature,widths=[t.bars.actual.scale.x,t.bars.reference.scale.x],light=t.bars.actual.material.emissiveIntensity;f.update(high,0,false);
    expect([t.bars.actual.scale.x,t.bars.reference.scale.x]).toEqual(widths);expect(t.display.userData.actualPower).toBe(high.power);expect(t.display.userData.referencePower).toBe(high.extra.referenceDc*.96);expect(t.bars.actual.material.emissiveIntensity).toBeGreaterThan(light);expect(t.gauge.userData.temperature).toBe(65);
  });

  it.each([{irradiance:0},{incidence:90}])('collapses both bars immediately at zero input %j and restores them smoothly',settings=>{
    const f=fixture(),active=runPv({cellTemperature:65}),zero=runPv({...settings,cellTemperature:65});f.update(active,0,false);f.update(zero,.01,true);const t=f.temperature;
    expect(t.display.userData.referencePower).toBe(0);expect(t.display.userData.actualPower).toBe(0);for(const bar of Object.values(t.bars)){expect(bar.visible).toBe(false);expect(bar.scale.x).toBe(0);expect(bar.userData.displayFraction).toBe(0);expect(bar.userData.targetFraction).toBe(0);expect(bar.userData.power).toBe(0);}
    expect(t.gauge.userData.temperature).toBe(65);expect(t.gauge.userData.displayTemperature).toBe(65);f.update(active,.026,true);expect(t.bars.reference.scale.x).toBeCloseTo((1-Math.exp(-.1))/1.2,12);expect(t.bars.actual.scale.x/t.bars.reference.scale.x).toBeCloseTo(active.extra.temperatureFactor,12);expect(t.bars.actual.visible).toBe(true);
  });

  it('continues to show selected cell temperature when no sunlight reaches the array',()=>{
    const f=fixture();f.update(runPv({irradiance:0,cellTemperature:-20}),0,false);f.update(runPv({irradiance:0,cellTemperature:85}),.3,true);expect(f.temperature.gauge.userData.temperature).toBe(85);expect(f.temperature.gauge.userData.displayTemperature).toBeCloseTo(85-105*Math.exp(-1),12);expect(f.temperature.bars.actual.visible).toBe(false);expect(f.temperature.bars.reference.visible).toBe(false);
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('clears both output bars at %s even when the exact model extras retain available reference power',status=>{
    const f=fixture(),active=runPv({cellTemperature:65}),completed=immutable({...active,status,available:0,power:0,stages:active.stages.map(stage=>({...stage,value:0}))}),before=JSON.stringify(completed);expect(completed.extra.referenceDc).toBeGreaterThan(0);f.update(active,0,false);f.update(completed,.05,true);const t=f.temperature;
    expect(t.display.userData.actualPower).toBe(0);expect(t.display.userData.referencePower).toBe(0);for(const bar of Object.values(t.bars)){expect(bar.visible).toBe(false);expect(bar.scale.x).toBe(0);expect(bar.userData.power).toBe(0);expect(bar.userData.targetFraction).toBe(0);}
    expect(t.gauge.userData.temperature).toBe(65);expect(t.gauge.userData.displayTemperature).toBe(65);expect(t.needle.rotation.z).toBeCloseTo((135-270*85/105)*Math.PI/180,12);expect(JSON.stringify(completed)).toBe(before);
  });

  it('snaps selected values while paused and remains stable under explicit steps and synchronized edits',()=>{
    const f=fixture();f.update(runPv({cellTemperature:-20}),.1,true);const run=runPv({cellTemperature:85});f.update(run,0,false);const angle=f.temperature.needle.rotation.z,width=f.temperature.bars.actual.scale.x;expect(f.temperature.gauge.userData.displayTemperature).toBe(85);f.update(run,.1,false);expect(f.temperature.needle.rotation.z).toBe(angle);expect(f.temperature.bars.actual.scale.x).toBe(width);
    f.update(runPv({cellTemperature:25}),0,true,true);expect(f.temperature.gauge.userData.displayTemperature).toBe(25);expect(f.temperature.bars.actual.scale.x).toBe(f.temperature.bars.reference.scale.x);
  });

  it('gives equal needle and bar responses for equal elapsed time at different frame rates',()=>{
    const a=fixture(),b=fixture(),c=fixture(),low=runPv({cellTemperature:-20}),high=runPv({cellTemperature:85});for(const f of[a,b,c])f.update(low,0,false);a.update(high,.8,true);for(let i=0;i<24;i++)b.update(high,1/30,true);for(let i=0;i<96;i++)c.update(high,1/60*.5,true);
    for(const f of[b,c]){expect(f.temperature.needle.rotation.z).toBeCloseTo(a.temperature.needle.rotation.z,11);expect(f.temperature.gauge.userData.displayTemperature).toBeCloseTo(a.temperature.gauge.userData.displayTemperature,11);expect(f.temperature.bars.actual.scale.x).toBeCloseTo(a.temperature.bars.actual.scale.x,11);}
  });

  it('keeps the supported gauge beyond the displayed panel edge at all sizes and tilts',()=>{
    const f=fixture();for(const area of[5,20,100])for(const incidence of[0,45,90]){f.update(runPv({area,incidence}),0,false);const t=f.temperature,size=f.array.userData.displayScale,foot=t.group.getObjectByName('energy-pv-temperature-foot'),support=t.group.getObjectByName('energy-pv-temperature-support'),face=t.group.getObjectByName('energy-pv-temperature-face');
      expect(t.group.parent).toBe(f.B);expect(t.group.position.x).toBe(-1.5);expect(t.group.position.z).toBeCloseTo(1.345*size+.30,12);expect(bounds(t.group).min.z-bounds(f.array).max.z).toBeGreaterThan(.13);expect(bounds(foot).min.y).toBeCloseTo(0,7);expect(bounds(foot).intersectsBox(bounds(support))).toBe(true);expect(bounds(support).intersectsBox(bounds(face))).toBe(true);expectContacts(f);
    }
  });

  it('tracks the eased panel size during simultaneous area and temperature changes',()=>{
    const f=fixture();f.update(runPv({area:5,cellTemperature:-20}),0,false);const run=runPv({area:100,cellTemperature:85});for(let i=0;i<20;i++){f.update(run,.02,true);const size=f.array.userData.displayScale;expect(size).toBeLessThan(Math.sqrt(5)*.75);expect(f.temperature.group.position.z).toBeCloseTo(1.345*size+.3,12);expect(bounds(f.temperature.group).min.z-bounds(f.array).max.z).toBeGreaterThan(.13);expectContacts(f);}
  });

  it('places each comparison bar in front of its track and inside its attached display plate',()=>{
    const f=fixture();f.update(runPv({cellTemperature:-20}),0,false);const t=f.temperature,plate=t.display.children.find(o=>o.geometry?.type==='BoxGeometry'&&!o.name),body=bounds(f.inverterBody),screen=bounds(plate);expect(t.display.parent).toBe(f.inverter);expect(screen.min.z-body.max.z).toBeLessThan(.02);
    for(const key of['actual','reference']){const bar=bounds(t.bars[key]),track=bounds(t.display.getObjectByName('energy-pv-'+key+'-track'));expect(bar.min.x).toBeCloseTo(track.min.x,7);expect(bar.max.x).toBeLessThan(track.max.x);expect(bar.min.y).toBeGreaterThan(track.min.y);expect(bar.max.y).toBeLessThan(track.max.y);expect(bar.min.z).toBeGreaterThan(track.min.z);expect(bar.min.z).toBeGreaterThan(screen.max.z);}
  });

  it('emphasizes the inverter comparison without changing its readings, size or thermal response',()=>{
    const f=fixture(),run=runPv({cellTemperature:65});f.update(run,0,false);const t=f.temperature,bars=Object.values(t.bars),scales=bars.map(b=>b.scale.clone()),positions=bars.map(b=>b.position.clone()),colors=bars.map(b=>b.material.color.clone()),angle=t.needle.rotation.z;
    for(const [trace,selected,state]of[[true,'converter','context'],[true,'generator','selected'],[false,'generator','normal']]){f.update(run,0,true,false,trace,selected);expect(t.display.userData.traceState).toBe(state);expect(t.needle.rotation.z).toBe(angle);bars.forEach((bar,i)=>{expect(bar.scale.equals(scales[i])).toBe(true);expect(bar.position.equals(positions[i])).toBe(true);expect(bar.material.color.equals(colors[i].clone().multiplyScalar(state==='context'?.32:1))).toBe(true);});expect(t.display.userData.actualPower).toBe(run.power);}
  });

  it('keeps gauge and comparison with their own stages in exploded and isolated views',()=>{
    const f=fixture(),run=runPv({cellTemperature:65});f.update(run,0,false);const t=f.temperature,gauge=world(t.gauge),display=world(t.display),angle=t.needle.rotation.z,width=t.bars.actual.scale.x;
    for(const isolated of[0,1,2,null]){f.layout(true,isolated);f.update(run,0,true);expect(world(t.gauge).clone().sub(gauge).distanceTo(new THREE.Vector3(0,.8,0))).toBeLessThan(1e-12);expect(world(t.display).clone().sub(display).distanceTo(new THREE.Vector3(3.4,0,0))).toBeLessThan(1e-12);expect(visible(t.gauge)).toBe(isolated==null||isolated===1);expect(visible(t.display)).toBe(isolated==null||isolated===2);expect(t.needle.rotation.z).toBe(angle);expect(t.bars.actual.scale.x).toBe(width);expectContacts(f);}
  });

  it('keeps incoming sunlight and panel reflectivity unchanged when only cell temperature changes',()=>{
    const f=fixture(),cold=runPv({cellTemperature:-20}),hot=runPv({cellTemperature:85});f.update(cold,0,false);const scale=f.array.scale.clone(),pose=f.array.matrixWorld.clone(),roughness=f.cells.map(c=>c.material.roughness),rays=f.optics.routes.map(r=>({opacity:r.body.material.opacity,rate:marks(r)[0].userData.flowRate,power:f.optics.group.userData.interceptedPower})),initial=marks(f.wiring.routes[1])[0].userData.power;
    f.update(hot,0,false);expect(hot.available).toBe(cold.available);expect(f.array.scale.equals(scale)).toBe(true);expect(f.array.matrixWorld.equals(pose)).toBe(true);f.cells.forEach((cell,i)=>expect(cell.material.roughness).toBe(roughness[i]));f.optics.routes.forEach((r,i)=>{expect(r.body.material.opacity).toBe(rays[i].opacity);expect(marks(r)[0].userData.flowRate).toBe(rays[i].rate);expect(f.optics.group.userData.interceptedPower).toBe(rays[i].power);});expect(marks(f.wiring.routes[1])[0].userData.power).toBeLessThan(initial);
  });

  it('preserves exact DC and AC cable readings through temperature edits',()=>{
    const f=fixture();for(const temperature of[-20,0,25,50,85]){const run=immutable(runPv({cellTemperature:temperature})),exact=JSON.stringify(run);f.update(run,.05,true);for(const marker of marks(f.wiring.routes[0]))expect(marker.userData.power).toBe(run.stages[1].value);for(const marker of marks(f.wiring.routes[1]))expect(marker.userData.power).toBe(run.power);expect(run.power).toBeCloseTo(run.extra.referenceDc*run.extra.temperatureFactor*.96,12);expect(JSON.stringify(run)).toBe(exact);expectContacts(f);}
  });

  it('retains meshes, buffers and materials through repeated simultaneous edits',()=>{
    const f=fixture(),saved=[];f.update(runPv({}),0,false);f.scene.traverse(o=>{if(o.geometry)saved.push({o,geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,material:o.material});});
    for(let i=0;i<100;i++)f.update(runPv({cellTemperature:-20+i%106,area:5+i%96,incidence:i%91,irradiance:i%9===0?0:800}),1/60,true);
    for(const entry of saved){expect(entry.o.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.o.material).toBe(entry.material);}
  });
});
