const fs = require('node:fs');
const vm = require('node:vm');
function edit(file, changes) {
  const original=fs.readFileSync(file,'utf8'), newline=original.includes('\r\n')?'\r\n':'\n';
  let source=original.replace(/\r\n/g,'\n');
  for(const [before,after] of changes) {
    const count=source.split(before).length-1;
    if(count!==1)throw Error(file+': expected one anchor, got '+count+' for '+before.slice(0,120));
    source=source.replace(before,after);
  }
  if(file.endsWith('stem_tool_geometryworld.js'))new vm.Script(source,{filename:file});
  const output=Buffer.from(source.replace(/\n/g,newline));
  if(process.argv.includes('--apply')){
    const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,output,0,output.length,0);fs.ftruncateSync(fd,output.length);}finally{fs.closeSync(fd);}
  }
  console.log((process.argv.includes('--apply')?'Applied ':'Validated ')+file);
}
edit('stem_lab/stem_tool_geometryworld.js',[
  [`            engine._highlightMesh.material.color.setHex(isProtected?0xff4444:0xffffff);
            engine._highlightMesh.material.opacity=isProtected?0.3:stillHover?0.4:0.4+Math.sin(pulseT*6)*0.2;
            engine._hoverGlowMesh.material.color.setHex(isProtected?0xff4444:0xffffff);
            engine._hoverGlowMesh.material.opacity=(isProtected?0.08:stillHover?0.1:0.09+Math.sin(pulseT*6)*0.05)*(engine._dimLines && engine._dimLines.length>0?0.35:1);`,
   `            // A protected floor is a useful building surface, not a placement
            // error. Keep its hover warm and steady; coral is reserved for the
            // invalid destination shown by the placement ghost below.
            engine._highlightMesh.material.color.setHex(isProtected?0xe6cf9e:0xf3eee0);
            engine._highlightMesh.material.opacity=isProtected?0.48:stillHover?0.44:0.44+Math.sin(pulseT*2.5)*0.08;
            engine._hoverGlowMesh.material.color.setHex(isProtected?0xe6cf9e:0xf3eee0);
            engine._hoverGlowMesh.material.opacity=(isProtected?0.055:stillHover?0.08:0.08+Math.sin(pulseT*2.5)*0.025)*(engine._dimLines && engine._dimLines.length>0?0.35:1);`],
  [`            var curShapeId = BLOCK_SHAPES[_ps.selectedShape] ? BLOCK_SHAPES[_ps.selectedShape].id : 'cube';
            var curRot = _ps.blockRotation || 0;`,
   `            var curShapeId = BLOCK_SHAPES[_ps.selectedShape] ? BLOCK_SHAPES[_ps.selectedShape].id : 'cube';
            var curRot = _ps.blockRotation || 0;
            var curType = BLOCK_TYPES[_ps.selectedBlock] || BLOCK_TYPES[0];
            var curTypeColor = curType && typeof curType.color === 'number' ? curType.color : 0x808080;`],
  [`            engine._ghostMesh.material.color.setHex(preview.allowed ? 0x9dddb5 : 0xf16c58);`,
   `            // The fill previews the selected material color; the outline alone
            // carries readiness. Change color in place so cycling the palette
            // never allocates meshes, textures, or geometries.
            engine._ghostMesh.material.color.setHex(preview.allowed ? curTypeColor : 0xf16c58);
            // Catalog values are sRGB; the renderer shades in linear color space.
            if (preview.allowed) engine._ghostMesh.material.color.convertSRGBToLinear();
            engine._ghostMesh.userData.placementMaterial = curType ? curType.id : 'stone';`]
]);
edit('tests/geometry_world_building_preview.test.js',[
  [`    f.target.userData._lessonBlock=true;e.updateGhostPreview();expect(e._highlightMesh.material.color.getHex()).toBe(0xff4444);expect(e._hoverGlowMesh.material.color.getHex()).toBe(0xff4444);`,
   `    f.target.userData._lessonBlock=true;e.updateGhostPreview();expect(e._highlightMesh.material.color.getHex()).toBe(0xe6cf9e);expect(e._hoverGlowMesh.material.color.getHex()).toBe(0xe6cf9e);`]
]);
