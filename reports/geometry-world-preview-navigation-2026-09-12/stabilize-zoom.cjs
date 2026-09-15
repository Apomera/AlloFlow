const fs=require('node:fs'),vm=require('node:vm');
function edit(file,from,to,check){const raw=fs.readFileSync(file,'utf8'),s=raw.replace(/\r\n/g,'\n');if(s.split(from).length!==2)throw Error('Expected one match in '+file);const updated=s.replace(from,to);if(check)new vm.Script(updated);const bytes=Buffer.from(raw.includes('\r\n')?updated.replace(/\n/g,'\r\n'):updated);const fd=fs.openSync(file,'r+');fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',
`      var offset=result.position.clone().sub(result.target).multiplyScalar(view.zoom);camera.position.copy(result.target).add(offset);camera.up.set(0,1,0);camera.lookAt(result.target);
      camera.far=Math.max(origin.far,result.far*view.zoom);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
      if(engine.scene.fog===origin.fog && origin.fog){origin.fog.near=Math.max(origin.fogNear,result.depthFar*view.zoom+2);origin.fog.far=Math.max(origin.fogFar,origin.fog.near+80);}`,
`      // Scale the screen-space offset with zoom so the model stays in the clear area.
      var distance=result.position.distanceTo(result.target),target=center.clone().add(result.target.clone().sub(center).multiplyScalar(view.zoom));
      var offset=result.position.clone().sub(result.target).multiplyScalar(view.zoom),depthFar=result.depthFar+distance*(view.zoom-1);
      camera.position.copy(target).add(offset);camera.up.set(0,1,0);camera.lookAt(target);
      // Derive clipping from the current model, never multiply the previous far plane.
      camera.far=Math.max(origin.far,depthFar+Math.max(10,box.min.distanceTo(box.max)*.05));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
      if(engine.scene.fog===origin.fog && origin.fog){origin.fog.near=Math.max(origin.fogNear,depthFar+2);origin.fog.far=Math.max(origin.fogFar,origin.fog.near+80);}`,true);
edit('tests/geometry_world_preview_navigation.test.js',
`  it('refits after a viewport change and preserves the current aspect on return',`,
`  it('keeps repeated zoom/refit operations stable and anchors the model in the clear area',()=>{const s=setup(),center=s.controller.focus.clone(),project=()=>center.clone().project(s.e.camera),start=project();s.controller.zoom(2);tick();const distant=project(),far=s.e.camera.far,position=s.e.camera.position.clone();expect(distant.x).toBeCloseTo(start.x,6);expect(distant.y).toBeCloseTo(start.y,6);for(let i=0;i<80;i++){s.controller.scheduleFit();tick();}expect(s.e.camera.far).toBeCloseTo(far,6);expect(s.e.camera.position.distanceTo(position)).toBeLessThan(1e-6);expect(Number.isFinite(s.e.camera.projectionMatrix.determinant())).toBe(true);s.controller.fit();tick();expect(s.e.camera.far).toBeLessThanOrEqual(far);expect(project().x).toBeCloseTo(start.x,6);expect(project().y).toBeCloseTo(start.y,6);});
  it('refits after a viewport change and preserves the current aspect on return',`,false);
console.log('Preview zoom and clipping stabilized; regression added.');
