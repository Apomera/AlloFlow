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
const helpers=['material','mesh','box','cylinder','ball','pipe','glow','response','cue','particles','cabinet','deformTube','cspThermalConnections'].map(helper).join('\n');
function fixture(){
  return vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
    ${helpers}
    var scene=new THREE.Scene(),B=new THREE.Group(),C=new THREE.Group();scene.add(B,C);
    var tower=cylinder(B,.5,2.2,0,.22,4.4,'#b6c7ba'),receiver=box(B,.5,4.6,0,.8,.8,.8,'#e99c46'),platform=box(B,.5,4.12,0,1.1,.11,1.1,'#a3b7ad'),block=cabinet(C,2.6,.9,-.3,1.4,1.7,1.2,'#d6e3d8');
    var plumbing=cspThermalConnections(B,C,receiver);
    function layout(exploded,isolated){B.position.set(0,exploded?.8:0,0);C.position.set(exploded?3.4:0,0,0);B.visible=isolated==null||isolated==='converter';C.visible=isolated==null||isolated==='generator';scene.updateMatrixWorld(true);plumbing.update();scene.updateMatrixWorld(true);}
    layout(false);
    return {scene:scene,B:B,C:C,tower:tower,receiver:receiver,platform:platform,block:block,plumbing:plumbing,layout:layout,
      update:function(heat,power,dt,animate){var p={run:{stages:[{value:9000},{value:heat},{value:power}],power:power,status:'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};updaters.forEach(function(fn){fn(p);});markerUpdaters.forEach(function(fn){fn(p);});}};
  })()`,{THREE});
}
function markers(route){return route.group.children.filter(object=>/-marker-/.test(object.name));}
function ownBounds(mesh){mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);}
function samples(route,count=180){return Array.from({length:count+1},(_,i)=>route.curve.getPoint(i/count).applyMatrix4(route.group.matrixWorld));}
function checkEndpoints(f){
  f.scene.updateMatrixWorld(true);
  for(const route of f.plumbing.routes)for(const [u,port] of [[0,route.from],[1,route.to]]){
    const actual=route.curve.getPoint(u).applyMatrix4(route.group.matrixWorld),expected=port.getWorldPosition(new THREE.Vector3());
    expect(actual.distanceTo(expected)).toBeLessThan(1e-12);
  }
}

describe('CSP attached heat-transfer plumbing',()=>{
  it('takes hot fluid from the receiver to the block and returns on separate visible surface ports',()=>{
    const f=fixture(),p=f.plumbing.ports,[hot,returned]=f.plumbing.routes;
    expect(hot.from).toBe(p['receiver-hot']);expect(hot.to).toBe(p['block-hot']);
    expect(returned.from).toBe(p['block-return']);expect(returned.to).toBe(p['receiver-return']);
    for(const [key,body,face] of [['receiver-hot',f.receiver,'max'],['receiver-return',f.receiver,'max'],['block-hot',f.block,'min'],['block-return',f.block,'min']]){
      const point=p[key].getWorldPosition(new THREE.Vector3()),bounds=ownBounds(body);
      expect(point.x).toBeCloseTo(bounds[face].x,7);expect(point.y).toBeGreaterThan(bounds.min.y);expect(point.y).toBeLessThan(bounds.max.y);expect(point.z).toBeGreaterThan(bounds.min.z);expect(point.z).toBeLessThan(bounds.max.z);
    }
    expect(p['receiver-hot'].parent).toBe(f.receiver);expect(p['receiver-return'].parent).toBe(f.receiver);checkEndpoints(f);
  });

  it('keeps both pipe spans outside the tower, platform, receiver and power-block bodies',()=>{
    const f=fixture();
    for(const exploded of [false,true]){
      f.layout(exploded);const bounds=[f.tower,f.platform,f.receiver,f.block].map(ownBounds);
      for(const route of f.plumbing.routes){
        const ends=[route.from,route.to].map(port=>port.getWorldPosition(new THREE.Vector3())),radius=route.body.geometry.parameters.radius;
        let clearance=Infinity;
        for(const point of samples(route,300)){
          if(ends.some(end=>point.distanceTo(end)<.20))continue;
          for(const body of bounds)clearance=Math.min(clearance,body.distanceToPoint(point));
        }
        expect(clearance).toBeGreaterThan(radius+.005);
      }
    }
  });

  it('keeps the hot and cooler return tubes separated through both layouts',()=>{
    const f=fixture();
    for(const exploded of [false,true]){
      f.layout(exploded);const [hot,returned]=f.plumbing.routes;let distance=Infinity;
      for(const a of samples(hot))for(const b of samples(returned))distance=Math.min(distance,a.distanceTo(b));
      expect(distance).toBeGreaterThan(hot.body.geometry.parameters.radius+returned.body.geometry.parameters.radius+.025);
    }
  });

  it('holds the vertical legs beside the tower and the last elbows beside the power block when exploded',()=>{
    const f=fixture(),[hot,returned]=f.plumbing.routes;
    const anchors=[[hot,1,f.B],[hot,2,f.B],[hot,3,f.C],[returned,1,f.C],[returned,2,f.B],[returned,3,f.B]];
    function relative([route,index,parent]){return parent.worldToLocal(route.curve.points[index].clone().applyMatrix4(route.group.matrixWorld));}
    const initial=anchors.map(relative);f.layout(true);checkEndpoints(f);
    anchors.forEach((anchor,index)=>expect(relative(anchor).distanceTo(initial[index])).toBeLessThan(1e-12));
    f.layout(false);checkEndpoints(f);
  });

  it('updates actual receiver-child ports without replacing tube buffers or restarting marker phase',()=>{
    const f=fixture();f.update(5850,2047.5,.1);
    const before=f.plumbing.routes.map(route=>({geometry:route.body.geometry,position:route.body.geometry.attributes.position,normal:route.body.geometry.attributes.normal,phase:markers(route)[0].userData.progress}));
    for(const exploded of [true,false,true,false]){
      f.layout(exploded);f.update(5850,2047.5,0,false);checkEndpoints(f);
      f.plumbing.routes.forEach((route,index)=>{expect(route.body.geometry).toBe(before[index].geometry);expect(route.body.geometry.attributes.position).toBe(before[index].position);expect(route.body.geometry.attributes.normal).toBe(before[index].normal);expect(markers(route)[0].userData.progress).toBe(before[index].phase);});
    }
    f.receiver.position.y+=.15;f.scene.updateMatrixWorld(true);f.plumbing.update();checkEndpoints(f);
    const versions=f.plumbing.routes.map(route=>route.body.geometry.attributes.position.version);f.plumbing.update();
    f.plumbing.routes.forEach((route,index)=>expect(route.body.geometry.attributes.position.version).toBe(versions[index]));
  });

  it('hides cross-stage spans in isolated views and restores their attachments afterward',()=>{
    const f=fixture();
    for(const selected of ['resource','converter','generator']){f.layout(true,selected);expect(f.plumbing.routes.every(route=>!route.group.visible)).toBe(true);}
    f.layout(true);expect(f.plumbing.routes.every(route=>route.group.visible)).toBe(true);checkEndpoints(f);
  });
});

describe('CSP thermal flow follows delivered heat',()=>{
  it('keeps heat motion and pipe brightness independent of heat-to-electricity efficiency',()=>{
    const low=fixture(),high=fixture();low.update(5850,877.5,.1);high.update(5850,2632.5,.1);
    low.plumbing.routes.forEach((route,index)=>{
      const a=markers(route)[0],b=markers(high.plumbing.routes[index])[0];
      expect(a.userData.progress).toBe(b.userData.progress);expect(a.userData.flowRate).toBe(b.userData.flowRate);expect(a.userData.flowStrength).toBe(b.userData.flowStrength);expect(route.body.material.emissiveIntensity).toBe(high.plumbing.routes[index].body.material.emissiveIntensity);expect(route.group.userData.thermalPower).toBe(5850);
    });
  });

  it('smoothly strengthens positive heat changes while preserving paused phase and exact heat metadata',()=>{
    const f=fixture();f.update(5850/16,100,.1);const [hot,returned]=f.plumbing.routes,marker=markers(hot)[0],before=marker.userData.flowRate;
    f.update(5850,2047.5,.02);expect(marker.userData.flowRate).toBeGreaterThan(before);expect(marker.userData.flowRate).toBeLessThan(marker.userData.targetFlowRate);expect(marker.userData.targetWorldFlowRate).toBeCloseTo(.75,12);expect(marker.userData.targetFlowRate*5*hot.curve.getLength()).toBeCloseTo(.75,12);expect(f.plumbing.group.userData.thermalPower).toBe(5850);
    expect(markers(returned)[0].userData.worldFlowRate).toBe(marker.userData.worldFlowRate);
    const phase=marker.userData.progress;f.update(5850*4,8190,0,false);expect(marker.userData.progress).toBe(phase);expect(marker.userData.worldFlowRate).toBeCloseTo(1.5,12);
    f.update(5850*4,8190,.1,false);expect((marker.userData.progress-phase)*hot.curve.getLength()).toBeCloseTo(.15,12);
    for(const route of f.plumbing.routes){const dot=markers(route)[0];expect(dot.position.distanceTo(route.curve.getPointAt(dot.userData.progress))).toBeLessThan(1e-12);}
  });

  it('stops heat cues immediately at zero without removing the physical plumbing or losing phase',()=>{
    const f=fixture();f.update(5850,2047.5,.1);const phases=f.plumbing.routes.map(route=>markers(route)[0].userData.progress);
    f.update(0,0,.1);
    f.plumbing.routes.forEach((route,index)=>{
      expect(route.group.visible).toBe(true);expect(route.body.visible).toBe(true);expect(route.body.material.emissiveIntensity).toBe(0);expect(route.group.userData.thermalPower).toBe(0);
      expect(markers(route).every(marker=>!marker.visible&&marker.userData.flowRate===0&&marker.userData.flowStrength===0&&marker.userData.progress===phases[index])).toBe(true);
    });
    f.update(5850,2047.5,0);f.plumbing.routes.forEach((route,index)=>expect(markers(route)[0].userData.progress).toBe(phases[index]));
  });
});
