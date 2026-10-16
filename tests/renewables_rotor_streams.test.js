import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const helpers=['material','mesh','box','cylinder','strut','flange','ball','pipe','ring','glow','response','cue','shape','driveMotion','particles','deformTube','rotor','generatorDetail','rotorResourceStreams','rotorPowerConnections'].map(helper).join('\n');
const branchStart=source.indexOf("var marine=id==='tidal';",sceneStart),branch=source.slice(branchStart,source.indexOf("}else if(id==='hydro'){",branchStart)),roots=[];

// Execute the complete production rotor branch, including geometry, its real
// dimension response and marker updates. Only the WebGL renderer is omitted.
function fixture(id='wind'){
  const f=vm.runInNewContext(`(function(){
    var id=${JSON.stringify(id)},responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null;
    ${helpers}
    var scene=new THREE.Scene(),context=new THREE.Group(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group(),referencePower=1000;scene.add(context,A,B,C);
    var load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');load.name='energy-output-load';function label(){}
    ${branch}
    function update(settings,dt,animate,power,status,syncResponse){var s=Object.assign({radius:id==='tidal'?5:40,speed:id==='tidal'?2:8,rating:3000},settings),p={run:{settings:s,power:power==null?1000:power,status:status||'Generating'},dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,inspection:{trace:false,cutaway:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);rotorWiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);rotorWiring.update();scene.updateMatrixWorld(true);}
    update({},0,false);return {scene,A,B,C,hub,nacelle,blade,sweep,tower,wiring:rotorWiring,update,layout};
  })()`,{THREE});
  f.streams=f.scene.getObjectByName('energy-rotor-streams');
  f.routes=f.streams.children.filter(o=>o.name.startsWith('energy-rotor-resource-lane-')).map(group=>{const body=group.children.find(o=>o.name.startsWith('energy-rotor-resource-tube-'));return {group,body,curve:body.geometry.parameters.path,marks:group.children.filter(o=>/-marker-/.test(o.name)),arrow:group.children.find(o=>/-direction$/.test(o.name))};});
  roots.push(f.scene);return f;
}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});
function phaseDelta(a,b){return (a-b+1)%1;}
function dimensions(object){const size=new THREE.Vector3();new THREE.Box3().setFromObject(object).getSize(size);return size;}
function worldPoint(route,t){return route.group.localToWorld(route.curve.getPoint(t));}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function phaseSnapshot(f){return f.routes.map(r=>r.marks[0].userData.progress);}
function expectHeld(f,phases){f.routes.forEach((r,i)=>expect(r.marks[0].userData.progress).toBe(phases[i]));}

describe('Wind and tidal resource streams across the rotor disk',()=>{
  it.each([['wind',10,80],['tidal',2,12]])('%s distributes eight lanes around the disk while keeping the hub clear', (id,min,max)=>{
    const f=fixture(id);expect(f.routes).toHaveLength(8);expect(f.streams.parent).toBe(f.A);
    for(const radius of[min,max]){
      f.update({radius},0,false);const radiusOnScreen=f.blade.userData.displayRadius,angles=[];
      for(const route of f.routes){
        for(const cue of [route.body,route.arrow,...route.marks]){expect(cue.castShadow).toBe(false);expect(cue.receiveShadow).toBe(false);}
        const point=worldPoint(route,.5),dx=point.x-f.blade.position.x,dy=point.y-f.blade.position.y;
        expect(Math.hypot(dx,dy)).toBeGreaterThan(radiusOnScreen*.65);expect(Math.hypot(dx,dy)).toBeLessThan(radiusOnScreen*.8);
        expect(Math.abs(dx)>.54||Math.abs(dy)>.57).toBe(true);
        angles.push((Math.atan2(dy,dx)+2*Math.PI)%(2*Math.PI));
        expect(worldPoint(route,0).z).toBeCloseTo(3.5,12);expect(worldPoint(route,1).z).toBeCloseTo(-3.5,12);
      }
      angles.sort((a,b)=>a-b);angles.forEach((a,i)=>expect((angles[(i+1)%8]-a+2*Math.PI)%(2*Math.PI)).toBeCloseTo(Math.PI/4,12));
      expect(f.streams.position.x).toBe(-1.1);expect(f.streams.position.y).toBe(f.blade.position.y);expect(f.streams.scale.toArray()).toEqual([1,1,1]);
    }
  });

  it.each([['wind',10,80],['tidal',2,12]])('%s changes the footprint without stretching markers, tube bores or GPU buffers', (id,min,max)=>{
    const f=fixture(id);f.update({radius:min},.1,false);
    const before=f.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,index:r.body.geometry.index,uv:r.body.geometry.attributes.uv,marker:r.marks[0].geometry,markerSize:dimensions(r.marks[0]),bore:r.body.geometry.parameters.radius,phase:r.marks[0].userData.progress}));
    for(const radius of[max,min,max]){f.update({radius},0,false);f.routes.forEach((r,i)=>{const b=before[i];expect(r.body.geometry).toBe(b.geometry);for(const name of['position','normal','uv'])expect(r.body.geometry.attributes[name]).toBe(b[name]);expect(r.body.geometry.index).toBe(b.index);expect(r.marks[0].geometry).toBe(b.marker);expect(dimensions(r.marks[0]).distanceTo(b.markerSize)).toBeLessThan(1e-12);expect(r.body.geometry.parameters.radius).toBe(b.bore);expect(r.body.getWorldScale(new THREE.Vector3()).toArray()).toEqual([1,1,1]);expect(r.marks[0].userData.progress).toBe(b.phase);});}
  });

  it.each([['wind',10,80],['tidal',2,12]])('%s follows the same eased radius and hub height on every intermediate frame', (id,min,max)=>{
    const f=fixture(id);f.update({radius:min},0,false);const first=f.blade.userData.displayRadius;f.update({radius:max},.02,true);
    expect(f.blade.userData.displayRadius).toBeGreaterThan(first);expect(f.blade.userData.displayRadius).toBeLessThan(f.blade.userData.targetDisplayRadius);
    for(let frame=0;frame<70;frame++){f.update({radius:max},.04,true);expect(f.streams.position.y).toBe(f.blade.position.y);expect(f.nacelle.position.y).toBe(f.blade.position.y);for(const r of f.routes){const midpoint=worldPoint(r,.5);expect(Math.hypot(midpoint.x-f.blade.position.x,midpoint.y-f.blade.position.y)).toBeCloseTo(f.blade.userData.displayRadius*.72,12);expect(r.curve.getLength()).toBeCloseTo(7,12);}}
  });

  it.each([['wind',8,10,80],['tidal',2,2,12]])('%s preserves actual drawing travel through radius and layout changes', (id,speed,min,max)=>{
    const f=fixture(id),expectedRate=(id==='wind'?.14:.42)*speed;
    for(const radius of[min,max])for(const exploded of[false,true]){f.layout(exploded);f.update({speed,radius},0,false);const phases=phaseSnapshot(f);f.update({speed,radius},.1,true);f.routes.forEach((r,i)=>{const travelled=phaseDelta(r.marks[0].userData.progress,phases[i])*worldPoint(r,0).distanceTo(worldPoint(r,1));expect(travelled).toBeCloseTo(expectedRate*.1,12);expect(r.marks[0].userData.worldFlowRate).toBe(expectedRate);});}
  });

  it('continues accelerating the visible wind between 25 and 30 m/s instead of capping the resource cue',()=>{
    const f=fixture();f.update({speed:25},0,false,0,'Protective shutdown');const phase=phaseSnapshot(f);f.update({speed:30},.1,true,0,'Protective shutdown');
    f.routes.forEach((r,i)=>{const data=r.marks[0].userData,travel=phaseDelta(data.progress,phase[i])*7;expect(data.worldFlowRate).toBeGreaterThan(3.5);expect(data.worldFlowRate).toBeLessThan(4.2);expect(data.targetWorldFlowRate).toBeCloseTo(4.2,12);expect(travel).toBeGreaterThan(.35);expect(travel).toBeLessThan(.42);});
    f.update({speed:30},0,false,0,'Protective shutdown');const p=phaseSnapshot(f);f.update({speed:30},.1,true,0,'Protective shutdown');f.routes.forEach((r,i)=>expect(phaseDelta(r.marks[0].userData.progress,p[i])*7).toBeCloseTo(.42,12));
  });

  it('reverses the tidal stream arrow immediately without resetting phase while the mechanical rotor decelerates',()=>{
    const f=fixture('tidal');f.update({speed:2},.1,true);const phase=phaseSnapshot(f),initialRate=f.blade.userData.motionRate;
    f.update({speed:-2},0,true);expectHeld(f,phase);f.routes.forEach(r=>{const direction=new THREE.Vector3(0,1,0).applyQuaternion(r.arrow.quaternion);expect(direction.z).toBeCloseTo(1,12);expect(r.marks[0].userData.targetWorldFlowRate).toBe(-.84);});
    f.update({speed:-2},.02,true);expect(f.blade.userData.motionRate).toBeGreaterThan(0);expect(f.blade.userData.motionRate).toBeLessThan(initialRate);f.routes.forEach((r,i)=>expect(phaseDelta(phase[i],r.marks[0].userData.progress)*7).toBeCloseTo(.84*.02,12));
  });

  it.each([['wind',2,'Below cut-in'],['wind',30,'Protective shutdown'],['tidal',2,'No conversion']])('%s resource still travels at %i m/s during %s when no electricity is delivered', (id,speed,status)=>{
    const f=fixture(id);f.update({speed},0,false,0,status);const before=phaseSnapshot(f),angle=f.blade.rotation.z;f.update({speed},.1,true,0,status);
    f.routes.forEach((r,i)=>{expect(r.marks.every(m=>m.visible)).toBe(true);expect(phaseDelta(r.marks[0].userData.progress,before[i])).toBeGreaterThan(0);});expect(f.blade.rotation.z).toBe(angle);for(const r of f.wiring.routes)expect(r.group.children.filter(o=>/-marker-/.test(o.name)).every(m=>!m.visible)).toBe(true);
  });

  it('holds the last phase at slack water and resumes smoothly without changing the selected geometry',()=>{
    const f=fixture('tidal');f.update({speed:2},.1,true);const phases=phaseSnapshot(f),geometry=f.routes[0].body.geometry;f.update({speed:0},.1,true,0,'Slack water');expectHeld(f,phases);f.routes.forEach(r=>{expect(r.marks.every(m=>!m.visible)).toBe(true);expect(r.arrow.visible).toBe(false);expect(r.body.visible).toBe(true);});
    f.update({speed:-2},.02,true);expect(f.routes[0].body.geometry).toBe(geometry);f.routes.forEach((r,i)=>{expect(r.marks[0].visible).toBe(true);expect(r.marks[0].userData.worldFlowRate).toBeLessThan(0);expect(r.marks[0].userData.worldFlowRate).toBeGreaterThan(-.84);expect(phaseDelta(phases[i],r.marks[0].userData.progress)*7).toBeLessThan(.84*.02);});
  });

  it('allows paused adjustments and a deliberate motion step without moving other paused frames',()=>{
    const f=fixture();f.update({speed:8},.1,true);const phases=phaseSnapshot(f);f.update({radius:80,speed:30},0,false,0,'Protective shutdown');expectHeld(f,phases);f.update({radius:80,speed:30},.1,false,0,'Protective shutdown',true);f.routes.forEach((r,i)=>expect(phaseDelta(r.marks[0].userData.progress,phases[i])*7).toBeCloseTo(.42,12));const after=phaseSnapshot(f);f.update({radius:80,speed:30},0,false,0,'Protective shutdown');expectHeld(f,after);
  });

  it('integrates the same acceleration distance independently of animation frame partitioning',()=>{
    const one=fixture(),many=fixture();for(const f of[one,many])f.update({speed:3},0,false);one.update({speed:20},.4,true);for(let i=0;i<20;i++)many.update({speed:20},.02,true);
    one.routes.forEach((r,i)=>{expect(r.marks[0].userData.progress).toBeCloseTo(many.routes[i].marks[0].userData.progress,12);expect(r.marks[0].userData.worldFlowRate).toBeCloseTo(many.routes[i].marks[0].userData.worldFlowRate,12);});
  });

  it('does not rewrite settled geometry during speed-only changes and stays with the selected resource stage',()=>{
    const f=fixture();const versions=f.routes.map(r=>r.body.geometry.attributes.position.version);
    for(const speed of[3,20,30,0])f.update({speed},.02,true);f.routes.forEach((r,i)=>expect(r.body.geometry.attributes.position.version).toBe(versions[i]));
    for(const stage of[0,1,2]){f.layout(true,stage);f.routes.forEach(r=>expect(visible(r.body)).toBe(stage===0));}
  });
});
