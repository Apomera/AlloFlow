const fs=require('fs'),file='tests/geometry_world_visual_pipeline.test.js',raw=fs.readFileSync(file,'utf8');let s=raw.replace(/\r\n/g,'\n');const start=s.indexOf("  it('lets the shadow volume travel with the player"),end=s.indexOf("  it('previews the placement cell",start);if(start<0||end<start)throw Error('Missing shadow contract');
s=s.slice(0,start)+`  it('moves and snaps the shadow volume around exploration or an inspected subject', () => {
    const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});const T=exports;
    const a=src.indexOf('  function geometryWorldShadowAnchor('),b=src.indexOf('  // Interpolate two bearings',a);
    const anchor=new Function(src.slice(a,b)+'return geometryWorldShadowAnchor;')();
    const c=src.lastIndexOf('            var sdir = geometryWorldSunVector('),d=src.indexOf('            if(engine._skyDome)',c);
    const update=new Function('engine','geometryWorldSunVector','geometryWorldShadowAnchor',src.slice(c,d));
    const engine={camera:new T.PerspectiveCamera(),sun:new T.DirectionalLight(),_sunTarget:new T.Object3D(),_sunAngles:{el:48,az:45},_sunDistance:120,_currentLesson:{ground:{y:4}},_viewPreset:'free'};
    engine.sun.shadow.camera.left=-30;engine.sun.shadow.camera.right=30;engine.sun.shadow.mapSize.set(1024,1024);engine.camera.position.set(50.04,12,-31.02);
    const texel=60/1024,snap=v=>Math.round(v/texel)*texel,vector=()=>({x:.5,y:Math.SQRT1_2,z:.5});
    update(engine,vector,anchor);expect(engine._sunTarget.position.toArray()).toEqual([snap(50.04),snap(4),snap(-31.02)]);
    engine._viewPreset='front';engine._viewPresetLighting={lesson:engine._currentLesson,position:engine.camera.position.clone(),quaternion:engine.camera.quaternion.clone(),target:new T.Vector3(8.03,65.02,-9.04)};
    update(engine,vector,anchor);expect(engine._sunTarget.position.toArray()).toEqual([snap(8.03),snap(65.02),snap(-9.04)]);
    expect(engine.sun.position.clone().sub(engine._sunTarget.position).distanceTo(new T.Vector3(60,Math.SQRT1_2*120,60))).toBeLessThan(1e-10);
    expect(src).toContain('sun.target = engine._sunTarget;');expect(src).toContain('engine.scene.add(engine._sunTarget);');
    expect(src).toMatch(/sun\\.shadow\\.camera\\.near = 0\\.5; sun\\.shadow\\.camera\\.far = 2[0-9]{2};/);
  });

`+s.slice(end);const data=Buffer.from(raw.includes('\r\n')?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}console.log('Replaced obsolete shadow string contract with executed behavior');
