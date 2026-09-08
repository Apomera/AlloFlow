const fs=require('node:fs'),path=require('node:path');
const p='stem_lab/stem_tool_geometryworld.js';let s=fs.readFileSync(p,'utf8');
fs.writeFileSync(path.join(__dirname,'before-source.js'),s);
function replace(a,b){if(!s.includes(a))throw new Error('Missing anchor: '+a.slice(0,80));s=s.replace(a,b);}
// Keep custom-shape vertex positions and normals unchanged; supply missing UVs.
replace("    switch (shapeId) {", `    function textureWedge(geometry) {
      var positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
      var values = new Float32Array(positions.count * 2);
      for (var i = 0; i < positions.count; i++) {
        var x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        var nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i);
        // Project each planar face using unit-length tangents. Slopes retain
        // their true surface distance, so wood grain does not stretch at the cut.
        values[i * 2] = Math.abs(nz) > 0.8 ? x + 0.5 : z + 0.5;
        values[i * 2 + 1] = Math.abs(nz) > 0.8 ? y : ny * x - nx * y;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(values, 2));
      return geometry;
    }
    switch (shapeId) {`);
const shapeStart=s.indexOf('  function createShapeGeometry('),shapeEnd=s.indexOf('  // ── STL geometry',shapeStart);
s=s.slice(0,shapeStart)+s.slice(shapeStart,shapeEnd).replaceAll('return geo;','return textureWedge(geo);')+s.slice(shapeEnd);
// A calmer ground palette makes the construction, not the floor, the focal point.
s=s.replaceAll("'#4CAF50'","'#63875b'").replaceAll("'#3f9a45'","'#506e48'").replaceAll('rgba(56,142,60,0.3)','rgba(46,72,38,0.22)');
replace('geometryWorldSrgbColor(THREE, 0x3b8a42)','geometryWorldSrgbColor(THREE, 0x496d46)');
replace("new THREE.HemisphereLight(0x9fd3f5, 0x3f6b3a, 0.4)","new THREE.HemisphereLight(0xb5d4ed, 0x485c48, 0.42)");
replace('new THREE.AmbientLight(0xffffff, 0.42)','new THREE.AmbientLight(0xffffff, 0.30)');
replace('sunIntensity: 1.05, ambientIntensity: 0.5, hemi: 0.4','sunIntensity: 1.05, ambientIntensity: 0.30, hemi: 0.42');
// Deterministic painted grain keeps the same material identity on every load.
replace('        function makeStoneTexture() {',`        function surfaceRandom(seed) {
          return function() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        }
        function makeStoneTexture() {`);
for(const [name,seed] of [['Stone',341],['Grass',587],['GrassAtlas',811],['Brick',1237],['Wood',1879],['Sand',2371]]){
 const start=s.indexOf('        function make'+name+'Texture() {'),end=s.indexOf('\n        }',start)+10;
 let chunk=s.slice(start,end).replaceAll('Math.random()','random()');
 chunk=chunk.replace('Texture() {','Texture() {\n          var random = surfaceRandom('+seed+');');
 if(['Stone','Brick','Wood','Sand'].includes(name))chunk=chunk.replace('c.width = 64; c.height = 64;','c.width = 128; c.height = 128;').replace("var ctx = c.getContext('2d');","var ctx = c.getContext('2d'); ctx.scale(2, 2);");
 s=s.slice(0,start)+chunk+s.slice(end);
}
s=s.replace("'#8a8d90'","'#909da6'").replace("'rgba(60,64,70,0.35)'","'rgba(55,67,80,0.18)'").replace("'rgba(210,214,218,0.30)'","'rgba(221,226,231,0.16)'");
s=s.replace("'#8D6E63'","'#b58650'").replace("'#B71C1C'","'#b86950'").replace("'rgba(100,50,30,0.6)'","'rgba(76,63,54,0.72)'").replace("'#F5DEB3'","'#dbc69d'");
replace('        // Block material cache — avoids creating duplicate materials per type',fs.readFileSync(path.join(__dirname,'surface-detail.txt'),'utf8')+'        // Block material cache — avoids creating duplicate materials per type');
replace("          if (type === 'glass' || type === 'diamond' || type === 'gold' || type === 'water' || type === 'ice') {",`          if (['stone','wood','brick','sand'].indexOf(type) >= 0 && mat.map) {
            var surfaceNormal = makeSurfaceNormalTexture(type, mat.map);
            mat.userData.gwSurfaceKey = type;
            mat.normalScale = new THREE.Vector2(0.55, 0.55);
            mat.normalMap = engine._renderProfile && engine._renderProfile.tier === 'saver' ? null : surfaceNormal;
          }
          if (type === 'glass' || type === 'diamond' || type === 'gold' || type === 'water' || type === 'ice') {`);
replace('          engine.renderer.shadowMap.enabled = profile.shadows;',`          engine.renderer.shadowMap.enabled = profile.shadows;
          function updateSurfaceDetail(material) {
            var key = material && material.userData && material.userData.gwSurfaceKey;
            if (!key || !engine._procTexCache) return;
            var next = profile.tier === 'saver' ? null : engine._procTexCache[key + 'SurfaceNormal'];
            if (material.normalMap !== next) { material.normalMap = next; material.needsUpdate = true; }
          }
          Object.keys(engine._matCache || {}).forEach(function(key){updateSurfaceDetail(engine._matCache[key]);});
          Object.keys(engine.blocks || {}).forEach(function(key){updateSurfaceDetail(engine.blocks[key].material);});`);
replace('function addBlockEdges(mesh, shapeId) {','function addBlockEdges(mesh, shapeId, isGround) {\n          shapeId += isGround ? "-ground" : "-build";');
replace('color: 0x000000, transparent: true, opacity: 0.08, linewidth: 1','color: 0x223044, transparent: true, opacity: isGround ? 0.045 : 0.20, depthWrite: false, linewidth: 1');
replace('addBlockEdges(mesh, shapeId);',"addBlockEdges(mesh, shapeId, engine._measurementLayer === 'ground');");
for(const file of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
// Correct the capture's profile names and record actual material detail state.
const cap=path.join(__dirname,'capture.cjs');let c=fs.readFileSync(cap,'utf8').replaceAll("'detailed'","'detail'").replaceAll("'battery'","'saver'");
c=c.replace("en.applyRenderQuality('saver');","__ctx.updateMulti('geometryWorld',{renderQuality:'saver'});en.applyRenderQuality('saver');");
c=c.replace("profile:__geoWorldEngine._renderProfile,errors:","profile:__geoWorldEngine._renderProfile,surfaceNormals:Object.values(__geoWorldEngine.blocks).filter(m=>m.material.userData.gwSurfaceKey && m.material.normalMap).length,errors:");
c=c.replace('profile:en._renderProfile,wedges:',"profile:en._renderProfile,surfaceNormals:Object.values(en.blocks).filter(m=>m.material.userData.gwSurfaceKey && m.material.normalMap).length,wedges:");
const fd=fs.openSync(cap,'r+');fs.writeFileSync(fd,c);fs.ftruncateSync(fd,Buffer.byteLength(c));fs.closeSync(fd);
console.log('Updated material detail, wedge UVs, lighting, natural ground and edge clarity.');
