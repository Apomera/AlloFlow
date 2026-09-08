const fs=require('node:fs'),p='tests/geometry_world_material_graphics.test.js';let s=fs.readFileSync(p,'utf8');
s+=String.raw`

describe('Geometry World finish compatibility',()=>{
  it('configures real r128 material clones without mutating the shared template',()=>{
    const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
    const start=source.indexOf('        engine.configureBlockFinish = function');
    const end=source.indexOf('        // Block edge wireframe',start);
    const engine={_renderProfile:{tier:'detail'}};
    new Function('engine','THREE',source.slice(start,end))(engine,THREE);
    const template=new THREE.MeshStandardMaterial(),originalHook=template.onBeforeCompile;
    const cube=template.clone(),slab=template.clone();
    // r128's standard materials do not initialize an extensions object. This
    // used to throw during lesson creation before the engine could be mounted.
    expect(()=>engine.configureBlockFinish(cube,'wood','cube',false)).not.toThrow();
    expect(()=>engine.configureBlockFinish(slab,'gold','halfB',false)).not.toThrow();
    const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
    const a=shader(),b=shader();cube.onBeforeCompile(a);slab.onBeforeCompile(b);
    expect(a.uniforms.gwBlockHalfSize.value.toArray()).toEqual([0.5,0.5,0.5]);
    expect(b.uniforms.gwBlockHalfSize.value.toArray()).toEqual([0.5,0.25,0.5]);
    expect(a.uniforms.gwBlockBevelStrength).not.toBe(b.uniforms.gwBlockBevelStrength);
    expect(cube.customProgramCacheKey()).toBe(slab.customProgramCacheKey());
    expect(template.onBeforeCompile).toBe(originalHook);
    expect(template._gwBlockFinish).toBeUndefined();
    cube.dispose();slab.dispose();template.dispose();
  });
});
`;
const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);console.log('r128 finish compatibility regression added.');
