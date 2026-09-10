import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

let THREE, makeShape;
beforeAll(() => {
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
afterEach(() => { vi.restoreAllMocks();vi.useRealTimers();delete window.__geoWorldEngine; });

function fixture() {
  vi.useFakeTimers();window.THREE=THREE;
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(() => ({
    beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},drawImage(){},
    createRadialGradient(){return {addColorStop(){}};},
  }));
  const React={createElement(type,props,...children){return {type,props:{...props,children}};},useRef(value){return {current:value};},
    useState(value){return [value,()=>{}];},useEffect(){},isValidElement(node){return !!node?.props;},
    Children:{toArray(value){return Array.isArray(value)?value:[value];}},cloneElement(node,props,children){return {type:node.type,props:{...node.props,...props,children}};}};
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'});}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  const api=window.StemLab.geometryWorldBuilderPure;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xaabbcc);scene.fog=new THREE.Fog(0xaabbcc,20,100);
  const camera=new THREE.PerspectiveCamera(68,400/700,.1,200);camera.position.set(7,8,9);camera.lookAt(2,1,0);camera.updateMatrixWorld(true);
  const engine=window.__geoWorldEngine={scene,camera,blocks:{},_undoStack:[{type:'place'}],_redoStack:[],
    renderer:{domElement:{clientWidth:400,clientHeight:700},shadowMap:{enabled:true}},moveState:{},lookState:{},velocity:new THREE.Vector3(),
    measureStructure(_x,_y,_z,blocks){return {blocks:blocks.slice(),count:blocks.length,isComplete:true,L:3,W:1,H:2};}};
  function block(x,y,z,shape='cube',rotation=0){
    const mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshStandardMaterial({color:0xddccbb}));
    mesh.position.set(x+.5,y+(shape==='cube'?.5:shape==='halfB'?.25:0),z+.5);mesh.rotation.y=rotation*Math.PI/2;
    mesh.userData={gridPos:{x,y,z},blockType:'stone',shape,rotation,_measurementLayer:'student'};scene.add(mesh);mesh.updateMatrixWorld(true);engine.blocks[[x,y,z].join(',')]=mesh;return mesh;
  }
  const base=block(0,1,0,'halfB'),wedge=block(2,1,0,'quarter',1),raised=block(1,3,0);
  engine._builderSelection={blocks:[base.userData.gridPos,wedge.userData.gridPos,raised.userData.gridPos]};
  const unselected=block(10,1,0);unselected.visible=false;
  const environment=new THREE.Group();scene.add(environment);
  let state={worldActive:true,activeLesson:'builderSandbox',measureResult:engine.measureStructure(0,1,0,engine._builderSelection.blocks)};
  const ctx={React,toolData:{geometryWorld:state},updateMulti(_tool,patch){state={...state,...patch};ctx.toolData.geometryWorld=state;},addToast(){}};
  function findButton(node,label){if(!node)return null;if(Array.isArray(node)){for(const child of node){const found=findButton(child,label);if(found)return found;}return null;}
    if(node.type==='button' && node.props.children.some(child=>child===label))return node;
    return findButton(node.props?.children,label);
  }
  function enter(){const ui=window.StemLab._registry.geometryWorld.render(ctx);const button=findButton(ui,'Showcase creation');expect(button).toBeTruthy();button.props.onClick();}
  return {api,engine,scene,camera,base,wedge,raised,unselected,environment,enter,state:()=>state};
}
function area(polygon){return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p.x*q.z-q.x*p.z;},0))/2;}

describe('Studio presentation grounding and resource ownership', () => {
  it('uses actual lowest slab and rotated wedge footprints, excluding a raised span', () => {
    const f=fixture();const geometryBefore=[f.base,f.wedge,f.raised].map(mesh=>Array.from(mesh.geometry.attributes.position.array));
    const footprints=f.api.studioGroundFootprints([f.base,f.wedge,f.raised],1);
    expect(footprints).toHaveLength(2);
    // The quarter wedge slopes in height; its bottom face still fills one cell.
    expect(footprints.map(area).sort()).toEqual([1,1]);
    expect(footprints.flat().every(p=>p.x<1.01 || p.x>1.99)).toBe(true);
    expect([f.base,f.wedge,f.raised].map(mesh=>Array.from(mesh.geometry.attributes.position.array))).toEqual(geometryBefore);
  });

  it('keeps all Studio decorations outside STL and restores/disposes them on look changes and exit', () => {
    const f=fixture(),background=f.scene.background,fog=f.scene.fog;
    const positions=f.engine._builderSelection.blocks.slice();
    const bytes=Array.from(new Uint8Array(f.api.buildGeometryWorldStl(f.engine,positions).buffer));
    const original={position:f.camera.position.toArray(),quaternion:f.camera.quaternion.toArray(),up:f.camera.up.toArray(),fov:f.camera.fov,far:f.camera.far};
    const materials=Object.values(f.engine.blocks).map(mesh=>mesh.material);
    f.enter();f.engine.setShowcaseLook('studio');
    const studio=f.engine._showcase.studio;
    expect(studio.resources).toHaveLength(8);
    expect(studio.group.getObjectByName('gwe-studio-light-pool')).toBeTruthy();
    for(const name of ['gwe-studio-light-pool','gwe-studio-contact-shadow']){
      const map=studio.group.getObjectByName(name).material.map;
      expect(map.generateMipmaps).toBe(false);
      expect(map.minFilter).toBe(THREE.LinearFilter);
      expect(map.magFilter).toBe(THREE.LinearFilter);
    }
    expect(studio.contactFootprints).toHaveLength(2);
    expect(f.environment.visible).toBe(false);
    expect(Object.keys(f.engine.blocks)).toHaveLength(4);
    expect(Object.values(f.engine.blocks).map(mesh=>mesh.material)).toEqual(materials);
    expect(Array.from(new Uint8Array(f.api.buildGeometryWorldStl(f.engine,positions).buffer))).toEqual(bytes);
    const disposals=studio.resources.map(resource=>vi.spyOn(resource,'dispose'));
    const mapDispose=vi.fn();studio.lights[0].shadow.map={dispose:mapDispose};
    f.engine.setShowcaseLook('meadow');
    expect(f.scene.background).toBe(background);expect(f.scene.fog).toBe(fog);
    expect(f.environment.visible).toBe(true);expect(f.unselected.visible).toBe(false);
    expect(studio.group.parent).toBeNull();disposals.forEach(dispose=>expect(dispose).toHaveBeenCalledTimes(1));expect(mapDispose).toHaveBeenCalledTimes(1);
    f.engine.setShowcaseLook('studio');const next=f.engine._showcase.studio,secondDisposals=next.resources.map(resource=>vi.spyOn(resource,'dispose'));
    f.engine.setShowcaseView('top');f.engine.endShowcase();
    secondDisposals.forEach(dispose=>expect(dispose).toHaveBeenCalledTimes(1));
    expect({position:f.camera.position.toArray(),quaternion:f.camera.quaternion.toArray(),up:f.camera.up.toArray(),fov:f.camera.fov,far:f.camera.far}).toEqual(original);
    expect(f.engine._undoStack).toEqual([{type:'place'}]);expect(f.engine._redoStack).toEqual([]);
  });

  it('keeps contact restrained in Detailed and useful in Saver, including teardown without a live view', () => {
    const f=fixture();f.enter();f.engine.setShowcaseLook('studio');const studio=f.engine._showcase.studio;
    const contact=studio.group.getObjectByName('gwe-studio-contact-shadow');
    studio.floor.onBeforeRender();expect(contact.material.opacity).toBe(0.075);
    f.engine.renderer.shadowMap.enabled=false;studio.floor.onBeforeRender();expect(contact.material.opacity).toBe(0.22);
    const dispose=studio.resources.map(resource=>vi.spyOn(resource,'dispose'));
    f.engine._destroyed=true;f.engine.disposeShowcaseLook();f.engine.disposeShowcaseLook();
    dispose.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));expect(studio.group.parent).toBeNull();
  });
});
