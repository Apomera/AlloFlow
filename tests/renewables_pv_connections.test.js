import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){
  const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);
  let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','glow','response','cue','shape','particles','deformTube','pvSunlight','pvElectricalConnections'].map(helper).join('\n');
function fixture(){return vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
  ${helpers}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group(),array=new THREE.Group(),inverter=new THREE.Group();scene.add(A,B,C);B.add(array);C.add(inverter);inverter.position.x=.85;
  var panel=box(array,0,-.002,0,3.88,.216,2.69,'#215da0'),cabinet=box(inverter,2,1,0,1.2,1.8,.8,'#dce9e3'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');
  var feet=[],posts=[];[-.8,.8].forEach(function(z){feet.push(box(B,-1.5,.04,z,1.25,.12,.42,'#92a5a5'));posts.push(strut(B,[-1.5,.1,z],[-1.5,1.1,z],.065,'#b9cbd0'));});var actuator=strut(B,[-2,.12,.8],[-2,1,.8],.075,'#89aab3');
  var optics=pvSunlight(A,B,array),wiring=pvElectricalConnections(B,C,array,inverter,3,3);
  function update(settings,dt,animate){var s=Object.assign({area:20,incidence:0,irradiance:900,efficiency:20,cellTemperature:25},settings),input=s.incidence===90?0:s.irradiance*s.area*Math.cos(s.incidence*Math.PI/180)/1000,dc=input*s.efficiency/100*(1-.0037*(s.cellTemperature-25)),p={run:{settings:s,stages:[{value:input},{value:dc},{value:dc*.96}],power:dc*.96,status:'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};
    var angle=shape('pv-angle',-s.incidence*Math.PI/180,p),size=shape('pv-size',Math.sqrt(s.area/20)*.75,p);array.rotation.z=angle;array.scale.set(size,1,size);array.position.set(-1.5,.65+Math.abs(Math.sin(angle))*1.94*size,0);
    function point(x,y,z){return [-1.5+Math.cos(angle)*x*size-Math.sin(angle)*y,array.position.y+Math.sin(angle)*x*size+Math.cos(angle)*y,z*size];}
    posts.forEach(function(post,i){var z=i?.8:-.8;post.userData.place([-1.5,.1,z*size],point(0,-.18,z));feet[i].position.z=z*size;feet[i].scale.x=Math.min(1,size/.75);});actuator.userData.place([-2,.12,.8*size],point(-1,-.18,.8));
    updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);optics.update();wiring.update();markerUpdaters.forEach(function(fn){fn(p);});return p.run;
  }
  function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);optics.update();wiring.update();}
  update({},0,false);return {scene,A,B,C,array,inverter,panel,cabinet,load,feet,posts,actuator,optics,wiring,update,layout};
})()`,{THREE});}
const marks=route=>route.group.children.filter(o=>/-marker-/.test(o.name));
const worldPoint=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
function contacts(f){
  f.scene.updateMatrixWorld(true);
  for(const r of f.optics.routes){
    const a=worldPoint(r,0),b=worldPoint(r,1),local=f.array.worldToLocal(b.clone());
    expect(local.distanceTo(new THREE.Vector3(r.x,.12,-.15))).toBeLessThan(1e-12);
    expect(a.clone().sub(b).distanceTo(new THREE.Vector3(0,2.7,0))).toBeLessThan(1e-12);
  }
  for(const r of f.wiring.routes)for(const [t,port]of[[0,r.from],[1,r.to]])expect(worldPoint(r,t).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);
}
function clearance(object,point){
  object.geometry.computeBoundingBox();const p=object.worldToLocal(point.clone()),nearest=p.clone().clamp(object.geometry.boundingBox.min,object.geometry.boundingBox.max);return object.localToWorld(nearest).distanceTo(point);
}

describe('PV attached rays and DC/AC paths',()=>{
  it.each([[2,0],[2,45],[2,90],[20,0],[20,45],[20,90],[100,0],[100,45],[100,90]])('keeps contacts and equipment clearance at area %i, incidence %i', (area,incidence)=>{
    const f=fixture();f.update({area,incidence},0,false);
    for(const exploded of [false,true]){
      f.layout(exploded);contacts(f);
      // Check actual transformed surfaces, not oversized axis-aligned world bounds around a tilted panel.
      const bodies=[f.panel,f.cabinet,f.load,...f.feet,...f.posts,f.actuator];
      for(const r of f.wiring.routes){const ends=[r.from,r.to].map(p=>p.getWorldPosition(new THREE.Vector3()));let distance=Infinity;
        for(let i=0;i<=200;i++){const p=worldPoint(r,i/200);if(ends.some(e=>e.distanceTo(p)<.16))continue;for(const body of bodies)distance=Math.min(distance,clearance(body,p));}
        expect(distance).toBeGreaterThan(.04);
      }
    }
    if(area===100&&incidence===0){const arrayBounds=new THREE.Box3().setFromObject(f.panel),inverterBounds=new THREE.Box3().setFromObject(f.cabinet);expect(inverterBounds.min.x-arrayBounds.max.x).toBeGreaterThan(.49);}
  });
  it('keeps all four beams over module interiors instead of the gaps',()=>{
    const f=fixture();expect(f.optics.routes).toHaveLength(4);for(const r of f.optics.routes)expect([-1.41,-.47,.47,1.41]).toContain(r.x);
  });
  it('follows intermediate tilted poses and retains every tube buffer and marker phase on paused layout changes',()=>{
    const f=fixture(),routes=[...f.optics.routes,...f.wiring.routes];f.update({area:2,incidence:0},.1,true);
    const before=routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal}));
    f.update({area:100,incidence:85},.02,true);expect(f.array.rotation.z).toBeLessThan(0);expect(f.array.rotation.z).toBeGreaterThan(-85*Math.PI/180);contacts(f);
    const phases=routes.map(r=>marks(r)[0].userData.progress);
    for(const exploded of [true,false,true]){f.layout(exploded);f.update({area:100,incidence:85},0,false);contacts(f);routes.forEach((r,i)=>{
      expect(r.body.geometry).toBe(before[i].geometry);expect(r.body.geometry.attributes.position).toBe(before[i].position);expect(r.body.geometry.attributes.normal).toBe(before[i].normal);expect(marks(r)[0].userData.progress).toBe(phases[i]);
      for(const [n,m]of marks(r).entries())expect(m.position.distanceTo(r.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);
    });}
    const versions=routes.map(r=>r.body.geometry.attributes.position.version);f.optics.update();f.wiring.update();routes.forEach((r,i)=>expect(r.body.geometry.attributes.position.version).toBe(versions[i]));
  });
  it('shows distinct exact DC and AC power on a shared density scale',()=>{
    const f=fixture(),run=f.update({area:50,irradiance:1000,efficiency:22,cellTemperature:45},0,false),dc=marks(f.wiring.routes[0])[0],ac=marks(f.wiring.routes[1])[0];
    expect(dc.userData.power).toBe(run.stages[1].value);expect(ac.userData.power).toBe(run.power);expect(ac.userData.power/dc.userData.power).toBeCloseTo(.96,12);expect(dc.userData.referencePower).toBe(ac.userData.referencePower);expect(dc.userData.flowStrength).toBeGreaterThan(ac.userData.flowStrength);
  });
  it('changes electrical response with cell temperature without changing incoming light or light-marker speed',()=>{
    const f=fixture();f.update({},0,false);const ray=f.optics.routes[0],rate=marks(ray)[0].userData.flowRate,brightness=ray.body.material.opacity,input=f.optics.group.userData.interceptedPower,dc=marks(f.wiring.routes[0])[0].userData.power;
    f.update({cellTemperature:65},.02,true);expect(marks(f.wiring.routes[0])[0].userData.power).toBeLessThan(dc);expect(ray.body.material.opacity).toBe(brightness);expect(f.optics.group.userData.interceptedPower).toBe(input);expect(marks(ray)[0].userData.flowRate).toBe(rate);
    f.update({irradiance:100},.02,true);expect(marks(ray)[0].userData.flowRate).toBe(rate);expect(ray.body.material.opacity).toBeLessThan(brightness);
  });
  it.each([{irradiance:0},{incidence:90}])('stops collected light and both electrical flows immediately at zero input %j',settings=>{
    const f=fixture();f.update({},.1,true);const routes=[...f.optics.routes,...f.wiring.routes],phases=routes.map(r=>marks(r)[0].userData.progress);f.update(settings,.02,true);
    expect(f.optics.group.visible).toBe(false);expect(f.wiring.routes.every(r=>r.group.visible)).toBe(true);routes.forEach((r,i)=>{expect(marks(r).every(m=>!m.visible&&m.userData.flowRate===0)).toBe(true);expect(marks(r)[0].userData.progress).toBe(phases[i]);});
  });
  it('hides only routes whose endpoints are absent in isolated views',()=>{
    const f=fixture();for(const selected of[0,1,2]){f.layout(true,selected);expect(f.optics.group.visible).toBe(false);expect(f.wiring.routes[0].group.visible).toBe(false);expect(f.wiring.routes[1].group.visible).toBe(selected===2);}
    f.layout(true);expect(f.optics.group.visible).toBe(true);expect(f.wiring.routes.every(r=>r.group.visible)).toBe(true);contacts(f);
  });
});
