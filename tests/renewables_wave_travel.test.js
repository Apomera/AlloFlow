import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
function sourceFunction(name){
  const start=source.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`Missing production helper ${name}`);
  let cursor=source.indexOf('{',start),depth=1;
  while(depth&&++cursor<source.length){if(source[cursor]==='{')depth++;if(source[cursor]==='}')depth--;}
  return source.slice(start,cursor+1);
}
const guideCode=sourceFunction('waveTravelGuide'),strutCode=sourceFunction('strut'),responseCode=sourceFunction('response');
const constructionStart=source.indexOf('var mooring=strut(B,'),constructionEnd=source.indexOf('var waveTravel=waveTravelGuide(B);',constructionStart)+'var waveTravel=waveTravelGuide(B);'.length;
const updateStart=source.indexOf('mooringCleat.position.y=buoy.position.y-.30;'),updateEnd=source.indexOf('waveTravel.place(buoy.position.y,amplitude);',updateStart)+'waveTravel.place(buoy.position.y,amplitude);'.length;
if(constructionStart<0||updateStart<0)throw new Error('Missing production wave instrumentation');

function fixture(){
  function mesh(parent,geometry,color,x=0,y=0,z=0){const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color}));object.position.set(x,y,z);parent.add(object);return object;}
  function cylinder(parent,x,y,z,radius,height,color){return mesh(parent,new THREE.CylinderGeometry(radius,radius,height,24),color,x,y,z);}
  function box(parent,x,y,z,width,height,depth,color){return mesh(parent,new THREE.BoxGeometry(width,height,depth),color,x,y,z);}
  function ball(parent,x,y,z,radius,color){return mesh(parent,new THREE.SphereGeometry(radius,16,10),color,x,y,z);}
  return vm.runInNewContext(`(function(){
    ${strutCode}
    ${guideCode}
    var B=new THREE.Group(),buoy={position:{y:1.25}},responses={},responseSettling=false;
    ${responseCode}
    ${source.slice(constructionStart,constructionEnd)}
    return {parent:B,guide:waveTravel,cleat:mooringCleat,tether:mooring,response:response,
      update:function(y,amplitude){buoy.position.y=y;${source.slice(updateStart,updateEnd)}}};
  })()`,{THREE,mesh,cylinder,box,ball});
}
function vertices(object){
  object.updateWorldMatrix(true,false);const result=[],attribute=object.geometry.attributes.position;
  for(let i=0;i<attribute.count;i++)result.push(new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(object.matrixWorld));
  return result;
}
function meshes(group){const result=[];group.traverse(object=>{if(object.isMesh)result.push(object);});return result;}

describe('Renewables schematic wave travel reference',()=>{
  it('keeps the entire guide clear of the maximum buoy rim and its rear tether attachment',()=>{
    const {guide}=fixture();guide.place(1.25,.78);
    for(const object of meshes(guide.group)){
      for(const vertex of vertices(object))expect(Math.hypot(vertex.x+1,vertex.z)).toBeGreaterThan(.845);
    }
    expect(guide.group.children.every(object=>object.position.z>1)).toBe(true);
  });

  it('uses one fixed neutral height and a rail spanning every displayed buoy position',()=>{
    const {guide}=fixture(),ys=vertices(guide.rail).map(point=>point.y);
    expect(Math.min(...ys)).toBeCloseTo(.04,7);expect(Math.max(...ys)).toBeCloseTo(2.08,7);
    const footingYs=vertices(guide.foot).map(point=>point.y);
    expect(Math.min(...footingYs)).toBeCloseTo(-.07,7);expect(Math.max(...footingYs)).toBeCloseTo(.07,7);
    expect(Math.max(...footingYs)).toBeGreaterThan(Math.min(...ys));
    expect(guide.neutral.position.y).toBe(1.25);
    for(const amplitude of [0,.13,.39,.78])for(let phase=0;phase<Math.PI*2;phase+=.2){
      const y=1.25+Math.sin(phase)*amplitude;guide.place(y,amplitude);
      expect(guide.pointer.position.y).toBe(y);
      expect(y).toBeGreaterThan(Math.min(...ys));expect(y).toBeLessThan(Math.max(...ys));
      expect(guide.neutral.position.y).toBe(1.25);
    }
  });

  it('uses the same displayed amplitude for both range endpoints while the pointer follows the buoy',()=>{
    const {guide,update}=fixture();
    for(const amplitude of [0,.13,.39,.78])for(let phase=0;phase<Math.PI*2;phase+=.3){
      const surface=1+Math.sin(phase)*amplitude,y=surface+.25;update(y,amplitude);
      expect(guide.low.position.y).toBe(1.25-amplitude);expect(guide.high.position.y).toBe(1.25+amplitude);
      expect(guide.range.scale.y).toBe(amplitude*2);expect(guide.pointer.position.y-surface).toBeCloseTo(.25,14);
      expect(guide.group.userData.displayAmplitude).toBe(amplitude);
      expect(guide.pointer.userData.displacement).toBeCloseTo(y-1.25,14);
    }
  });

  it('follows the real smoothed amplitude instead of jumping to a height control target',()=>{
    const {guide,update,response}=fixture();
    const playing=dt=>({dt,animate:true,syncResponse:false});response('amplitude',.13,playing(0),.28,true);
    let previous=.13;
    for(let i=0;i<60;i++){
      const amplitude=response('amplitude',.78,playing(1/60),.28,true).value;
      update(1.25+Math.sin(i/15)*amplitude,amplitude);
      expect(amplitude).toBeGreaterThan(previous);expect(amplitude).toBeLessThan(.78);
      expect(guide.high.position.y).toBe(1.25+amplitude);expect(guide.low.position.y).toBe(1.25-amplitude);
      previous=amplitude;
    }
    expect(guide.group.userData.displayAmplitude).toBeLessThan(.78);
  });

  it('clears the full range at zero without a minimum-length ghost',()=>{
    const {guide,update}=fixture();update(2.03,.78);update(1.25,0);
    expect(guide.range.visible).toBe(false);expect(guide.low.visible).toBe(false);expect(guide.high.visible).toBe(false);
    expect(guide.range.scale.y).toBe(0);expect(guide.pointer.position.y).toBe(1.25);
    expect(guide.neutral.visible).toBe(true);expect(guide.rail.visible).toBe(true);
    update(1.3,.13);expect(guide.range.visible&&guide.low.visible&&guide.high.visible).toBe(true);
  });

  it('retains all geometry and vertex buffers throughout changing waves',()=>{
    const {guide,update}=fixture();
    const initial=meshes(guide.group).map(object=>({object,geometry:object.geometry,positions:object.geometry.attributes.position,normals:object.geometry.attributes.normal,version:object.geometry.attributes.position.version}));
    for(let i=0;i<300;i++){const amplitude=.39+.39*Math.sin(i/31);update(1.25+Math.sin(i/13)*amplitude,amplitude);}
    for(const item of initial){expect(item.object.geometry).toBe(item.geometry);expect(item.geometry.attributes.position).toBe(item.positions);expect(item.geometry.attributes.normal).toBe(item.normals);expect(item.positions.version).toBe(item.version);}
  });

  it('anchors the tether to a buoy-side cleat and keeps it outside the central guide for the full heave',()=>{
    const {cleat,tether,update}=fixture();
    for(let i=0;i<=60;i++){
      const y=.47+1.56*i/60;update(y,.78);tether.updateWorldMatrix(true,false);
      const a=new THREE.Vector3(0,-.5,0).applyMatrix4(tether.matrixWorld),b=new THREE.Vector3(0,.5,0).applyMatrix4(tether.matrixWorld);
      expect(a.distanceTo(new THREE.Vector3(-3,.03,-1.6))).toBeLessThan(1e-12);
      expect(b.distanceTo(cleat.position)).toBeLessThan(1e-12);expect(cleat.position.y).toBeCloseTo(y-.30,14);
      expect(cleat.position.y-.065).toBeGreaterThanOrEqual(y-.375);
      for(let t=0;t<=1;t+=.1){const point=a.clone().lerp(b,t);expect(Math.hypot(point.x+1,point.z)).toBeGreaterThan(.79);expect(point.y).toBeGreaterThanOrEqual(.03-1e-12);}
      const cleatRadius=Math.hypot(cleat.position.x+1,cleat.position.z);
      expect(cleatRadius-.065).toBeLessThan(.75);expect(cleatRadius).toBeGreaterThan(.75);
    }
  });
});
