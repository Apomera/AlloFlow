import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){
  const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);
  let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const helpers=['response','waveSurface'].map(helper).join('\n'),roots=[],TAU=2*Math.PI;
function fixture(settings={}){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false;${helpers}
    var scene=new THREE.Scene(),parent=new THREE.Group();scene.add(parent);
    var ocean=new THREE.Mesh(new THREE.PlaneGeometry(12,7.6,96,24),new THREE.MeshStandardMaterial());
    ocean.rotation.x=-Math.PI/2;ocean.position.y=1;parent.add(ocean);
    var surface=waveSurface(parent,ocean),current=Object.assign({height:2,period:8,width:10,efficiency:40},initial);
    function update(settings,dt,animate){current=Object.assign({},current,settings);var result=surface.update({run:{settings:current},dt:dt||0,animate:animate!==false});scene.updateMatrixWorld(true);return result;}
    update({},0,false);return {scene,parent,ocean,surface,update};
  })()`,{THREE,initial:settings});
  roots.push(f.scene);return f;
}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});
const visiblePositions=f=>f.surface.crests.filter(line=>line.visible).map(line=>line.userData.crestX);
const wrap=value=>((value%TAU)+TAU)%TAU;
function expectSameSurface(a,b){
  expect(a.ocean.userData.phase).toBeCloseTo(b.ocean.userData.phase,12);
  expect(a.ocean.userData.angularRate).toBeCloseTo(b.ocean.userData.angularRate,12);
  expect(a.ocean.userData.wavenumber).toBeCloseTo(b.ocean.userData.wavenumber,12);
  expect(a.ocean.userData.amplitude).toBeCloseTo(b.ocean.userData.amplitude,12);
  const pa=a.ocean.geometry.attributes.position,pb=b.ocean.geometry.attributes.position;
  for(let i=0;i<pa.count;i++)expect(pa.getZ(i)).toBeCloseTo(pb.getZ(i),6);
}

describe('Period-dependent schematic wave propagation',()=>{
  it('preserves the legacy eight-second surface and gives local displacements the correct world height',()=>{
    const f=fixture(),state=f.update({},0,false),positions=f.ocean.geometry.attributes.position;
    expect(f.surface.crests).toHaveLength(9);expect(positions.count).toBe(97*25);
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),expected=.26*Math.sin(.9*x);
      expect(positions.getZ(i)).toBeCloseTo(expected,7);
      const world=f.ocean.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,i));
      expect(world.y).toBeCloseTo(state.heightAt(x),7);
    }
  });

  // These ratios preserve deep-water dispersion under a fixed horizontal compression.
  // The energy-period control does not uniquely determine a real irregular-sea wavelength.
  it.each([4,8,16])('scales settled wavelength with period squared and crest speed with period at %i seconds',period=>{
    const baseline=fixture(),f=fixture({period}),data=f.ocean.userData,reference=baseline.ocean.userData;
    expect(data.wavelength/reference.wavelength).toBeCloseTo((period/8)**2,12);
    expect(data.phaseSpeed/reference.phaseSpeed).toBeCloseTo(period/8,12);
    expect(data.wavelength/data.phaseSpeed).toBeCloseTo(period,12);
    expect(data.angularRate).toBeCloseTo(TAU/period,12);
    expect(data.wavenumber).toBeCloseTo(data.targetWavenumber,12);
    const crests=f.surface.crests.map(line=>line.userData.crestX);
    for(let i=1;i<crests.length;i++)expect(crests[i]-crests[i-1]).toBeCloseTo(data.wavelength,11);
  });

  it('returns the full surface to the same pose after one selected period',()=>{
    for(const period of[4,8,16]){
      const f=fixture({period}),initial=Array.from(f.ocean.geometry.attributes.position.array);
      f.update({},period/4,true);expect(f.ocean.userData.phase).toBeCloseTo(Math.PI/2,12);
      f.update({},3*period/4,true);
      const after=f.ocean.geometry.attributes.position.array;
      for(let i=0;i<after.length;i++)expect(after[i]).toBeCloseTo(initial[i],6);
    }
  });

  it('uses an eased frequency and its exact time integral while the selected period changes',()=>{
    const f=fixture({period:4}),dt=.23,start=TAU/4,target=TAU/16;
    const state=f.update({period:16},dt,true),decay=Math.exp(-dt/.35);
    const expectedFrequency=target+(start-target)*decay,expectedPhase=target*dt+(start-target)*.35*(1-decay);
    expect(f.ocean.userData.angularRate).toBeCloseTo(expectedFrequency,12);
    expect(state.phase).toBeCloseTo(expectedPhase,12);
    expect(state.wavenumber).toBeCloseTo(.9*(expectedFrequency/(TAU/8))**2,12);
    expect(state.wavenumber).toBeGreaterThan(f.ocean.userData.targetWavenumber);
    expect(state.wavenumber).toBeLessThan(3.6);
  });

  it('produces the same surface for equal elapsed time divided into different frame sizes and retargets',()=>{
    const a=fixture({period:4,height:1}),b=fixture({period:4,height:1});
    for(const[settings,duration]of[[{period:16,height:6},.8],[{period:5,height:2},.45],[{period:12,height:4},.6]]){
      a.update(settings,duration,true);
      for(let i=0;i<30;i++)b.update(settings,duration/30,true);
      expectSameSurface(a,b);
    }
  });

  it('keeps the buoy anchor continuous through live period retargets without resetting local phase',()=>{
    const f=fixture();let state=f.update({},.4,true);
    for(const period of[4,16,6,12]){
      const beforePhase=state.phase,beforeHeight=state.heightAt(-1),beforeFrequency=f.ocean.userData.angularRate;
      state=f.update({period},0,true);
      expect(state.phase).toBe(beforePhase);expect(state.heightAt(-1)).toBe(beforeHeight);
      const dt=.03,target=TAU/period,delta=target*dt+(beforeFrequency-target)*.35*(1-Math.exp(-dt/.35));
      state=f.update({},dt,true);
      expect(state.phase).toBeCloseTo(wrap(beforePhase+delta),12);
      expect(state.heightAt(-1)).toBeCloseTo(1+.26*Math.sin(-.9-beforePhase-delta),12);
    }
  });

  it('stretches paused waves around the buoy without moving it, then advances the requested step',()=>{
    const f=fixture();let state=f.update({},.73,true),phase=state.phase,height=state.heightAt(-1);
    for(const period of[4,16,8]){
      state=f.update({period},0,false);
      expect(state.phase).toBe(phase);expect(state.heightAt(-1)).toBe(height);
      expect(f.ocean.userData.angularRate).toBeCloseTo(TAU/period,12);
      expect(state.wavenumber).toBeCloseTo(.9*(8/period)**2,12);
    }
    state=f.update({},.1,false);expect(state.phase).toBeCloseTo(phase+TAU/8*.1,12);
  });

  it('keeps period, wavelength and crest speed independent of amplitude and power settings',()=>{
    const a=fixture(),b=fixture();
    for(const settings of[{height:6,width:30,efficiency:90},{height:0,width:1,efficiency:0},{height:1,width:10,efficiency:40}]){
      a.update(settings,.1,true);b.update({},.1,true);
      for(const key of['phase','angularRate','wavenumber','wavelength','phaseSpeed'])expect(a.ocean.userData[key]).toBe(b.ocean.userData[key]);
      expect(a.surface.crests.map(line=>line.userData.crestX)).toEqual(b.surface.crests.map(line=>line.userData.crestX));
    }
  });

  it('flattens zero-height water immediately and hides every crest while retaining phase',()=>{
    const f=fixture({height:6});f.update({},.2,true);const before=f.ocean.userData.phase;
    const state=f.update({height:0},.05,true),positions=f.ocean.geometry.attributes.position,normals=f.ocean.geometry.attributes.normal;
    expect(state.amplitude).toBe(0);expect(state.phase).toBeGreaterThan(before);
    expect(f.surface.crests.every(line=>!line.visible&&line.material.opacity===0)).toBe(true);
    for(let i=0;i<positions.count;i++){expect(positions.getZ(i)).toBe(0);expect(Math.abs(normals.getX(i))).toBe(0);expect(normals.getY(i)).toBe(0);expect(normals.getZ(i)).toBe(1);}
    f.update({height:6},.01,true);expect(f.ocean.userData.amplitude).toBeGreaterThan(0);expect(f.ocean.userData.amplitude).toBeLessThan(.78);
  });

  it('places crest lines on actual maxima through period and height transitions',()=>{
    const f=fixture();
    for(const period of[4,8,16,4])for(const height of[1,6]){
      const state=f.update({period,height},.13,true);
      for(const line of f.surface.crests){
        const x=line.userData.crestX,vertices=line.geometry.attributes.position,peak=state.heightAt(x);
        expect(peak).toBeCloseTo(1+state.amplitude,12);
        expect(peak).toBeGreaterThan(state.heightAt(x-.01));expect(peak).toBeGreaterThan(state.heightAt(x+.01));
        for(let i=0;i<2;i++){expect(vertices.getX(i)).toBeCloseTo(x,5);expect(vertices.getY(i)).toBeCloseTo(peak+.018,6);}
        expect(vertices.getZ(0)).toBeCloseTo(-3.65,6);expect(vertices.getZ(1)).toBeCloseTo(3.65,6);
      }
    }
  });

  it('moves the visible crest set forward at the settled speed through phase wrap without a spatial jump',()=>{
    for(const period of[4,8,16]){
      const f=fixture({period});f.update({},period-.01,true);
      const before=visiblePositions(f),speed=f.ocean.userData.phaseSpeed,dt=.02;
      f.update({},dt,true);expect(f.ocean.userData.phase).toBeLessThan(.02);
      const after=visiblePositions(f),travel=speed*dt;
      for(const x of before.filter(x=>x+travel<6))expect(Math.min(...after.map(next=>Math.abs(next-x-travel)))).toBeLessThan(1e-11);
      for(const x of after.filter(x=>x-travel>-6))expect(Math.min(...before.map(previous=>Math.abs(x-previous-travel)))).toBeLessThan(1e-11);
    }
  });

  it('covers the full water width without dropping peaks near the incoming edge',()=>{
    for(const period of[4,8]){
      const f=fixture({period}),wavelength=f.ocean.userData.wavelength;
      for(let step=0;step<16;step++){
        f.update({},period/16,true);
        const positions=visiblePositions(f);
        expect(positions.length).toBeGreaterThan(0);
        expect(positions[0]+6).toBeLessThanOrEqual(wavelength+1e-11);
        expect(6-positions.at(-1)).toBeLessThanOrEqual(wavelength+1e-11);
        for(let i=1;i<positions.length;i++)expect(positions[i]-positions[i-1]).toBeCloseTo(wavelength,11);
      }
    }
  });

  it('fades crest marks at the water edge before removing them',()=>{
    const f=fixture({period:4,height:6}),data=f.ocean.userData,start=visiblePositions(f)[0];
    const distance=((5.64-start)%data.wavelength+data.wavelength)%data.wavelength;
    f.update({},distance/data.phaseSpeed,true);
    const at=x=>f.surface.crests.find(line=>Math.abs(line.userData.crestX-x)<1e-10);
    expect(at(5.64).visible).toBe(true);expect(at(5.64).material.opacity).toBeCloseTo(.68,12);
    f.update({},.185/data.phaseSpeed,true);
    expect(at(5.825).visible).toBe(true);expect(at(5.825).material.opacity).toBeCloseTo(.34,12);
    f.update({},.185/data.phaseSpeed,true);
    expect(at(6.01).visible).toBe(false);expect(at(6.01).material.opacity).toBe(0);
    for(const line of f.surface.crests)if(line.visible)expect(Math.abs(line.userData.crestX)).toBeLessThan(6);
  });

  it('keeps finite unit normals perpendicular to the displaced surface across the full control range',()=>{
    const f=fixture(),epsilon=1e-5;
    for(const period of[4,8,16])for(const height of[0,1,6]){
      const state=f.update({period,height},.17,false),positions=f.ocean.geometry.attributes.position,normals=f.ocean.geometry.attributes.normal;
      for(let i=0;i<positions.count;i++){
        const normal=new THREE.Vector3().fromBufferAttribute(normals,i),x=positions.getX(i);
        const derivative=(state.heightAt(x+epsilon)-state.heightAt(x-epsilon))/(2*epsilon);
        expect(normal.toArray().every(Number.isFinite)).toBe(true);expect(normal.length()).toBeCloseTo(1,6);
        expect(normal.dot(new THREE.Vector3(1,0,derivative))).toBeCloseTo(0,6);
        expect(normal.y).toBe(0);expect(normal.z).toBeGreaterThan(0);
      }
    }
  });

  it('reuses every geometry buffer and maintains enclosing bounds during animated and paused edits',()=>{
    const f=fixture(),objects=[f.ocean,...f.surface.crests];
    const saved=objects.map(o=>({geometry:o.geometry,position:o.geometry.attributes.position,normal:o.geometry.attributes.normal,index:o.geometry.index,array:o.geometry.attributes.position.array,version:o.geometry.attributes.position.version}));
    for(const animate of[true,false])for(const period of[4,16,8]){
      f.update({period,height:6},.11,animate);
      objects.forEach((o,index)=>{
        const original=saved[index],geometry=o.geometry,positions=geometry.attributes.position;
        expect(geometry).toBe(original.geometry);expect(positions).toBe(original.position);expect(positions.array).toBe(original.array);
        expect(geometry.attributes.normal).toBe(original.normal);expect(geometry.index).toBe(original.index);expect(positions.version).toBeGreaterThan(original.version);
        expect(Number.isFinite(geometry.boundingSphere.radius)).toBe(true);
        for(let i=0;i<positions.count;i++){
          const point=new THREE.Vector3().fromBufferAttribute(positions,i);
          expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius+1e-10);
          if(o===f.ocean)expect(geometry.boundingBox.containsPoint(point)).toBe(true);
        }
      });
      expect(f.ocean.geometry.boundingBox.min.z).toBeGreaterThanOrEqual(-.780001);expect(f.ocean.geometry.boundingBox.max.z).toBeLessThanOrEqual(.780001);
    }
  });

  it('leaves exact run readings and the selected settings untouched while presentation values ease',()=>{
    const f=fixture(),settings=Object.freeze({height:6,period:16,width:30,efficiency:70});
    const run=Object.freeze({settings,available:1234.56789,power:864.197523,status:'Generating'}),before=JSON.stringify(run);
    f.surface.update({run,dt:.1,animate:true});
    expect(JSON.stringify(run)).toBe(before);expect(f.ocean.userData.amplitude).toBeLessThan(settings.height*.13);
    expect(f.ocean.userData.angularRate).toBeGreaterThan(TAU/settings.period);
  });
});
