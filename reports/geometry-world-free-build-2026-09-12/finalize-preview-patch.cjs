const fs=require('node:fs');
function edit(file,pairs){
 const original=fs.readFileSync(file,'utf8'),nl=original.includes('\r\n')?'\r\n':'\n';let source=original.replace(/\r\n/g,'\n');
 for(const [before,after] of pairs){if(source.split(before).length!==2)throw Error('Expected one anchor in '+file+': '+before);source=source.replace(before,after);}
 const output=Buffer.from(source.replace(/\n/g,nl)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,output,0,output.length,0);fs.ftruncateSync(fd,output.length);}finally{fs.closeSync(fd);}console.log('Updated '+file);
}
edit('reports/geometry-world-free-build-2026-09-12/apply-preview-refinement.cjs',[
 ["            engine._ghostMesh.material.color.setHex(preview.allowed ? curTypeColor : 0xf16c58);\n            engine._ghostMesh.userData.placementMaterial", "            engine._ghostMesh.material.color.setHex(preview.allowed ? curTypeColor : 0xf16c58);\n            // Catalog values are sRGB; the renderer shades in linear color space.\n            if (preview.allowed) engine._ghostMesh.material.color.convertSRGBToLinear();\n            engine._ghostMesh.userData.placementMaterial"]
]);
edit('tests/geometry_world_preview_materials.test.js',[
 ["function blocks(engine){", "function renderedColor(hex){return new THREE.Color(hex).convertSRGBToLinear().getHex();}\nfunction blocks(engine){"],
 ["toBe(materials[index].color)", "toBe(renderedColor(materials[index].color))"],
 ["toBe(materials[0].color)", "toBe(renderedColor(materials[0].color))"],
 ["toBe(materials.find(m=>m.id==='gold').color)", "toBe(renderedColor(materials.find(m=>m.id==='gold').color))"],
 ["toBe(materials.find(m=>m.id==='wood').color)", "toBe(renderedColor(materials.find(m=>m.id==='wood').color))"]
]);
