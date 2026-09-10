const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'stem_lab/stem_tool_geometryworld.js');
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replaceOnce(a, b) {
  if (source.split(a).length !== 2) throw Error('Expected one occurrence: ' + a.slice(0, 100));
  source = source.replace(a, b);
}
function replaceFunction(name, next, body) {
  const start = source.indexOf('        function ' + name + '(');
  const end = source.indexOf('        function ' + next + '(', start);
  if (start < 0 || end < start) throw Error('Missing texture boundary ' + name);
  source = source.slice(0, start) + body.trimEnd() + '\n\n' + source.slice(end);
}
replaceFunction('makeBrickTexture', 'makeWoodTexture', `
        function makeBrickTexture() {
          if (_procTexCache.brick) return _procTexCache.brick;
          var random = surfaceRandom(1237);
          var c = document.createElement('canvas'); c.width = c.height = 256;
          var ctx = c.getContext('2d'); ctx.scale(4, 4);
          // Fine warm mortar separates individually fired clay faces. The slim
          // raised lip belongs to the painted material, never the printable mesh.
          ctx.fillStyle = '#867d6b'; ctx.fillRect(0, 0, 64, 64);
          for (var row = 0; row < 4; row++) {
            for (var brick = -1; brick < 3; brick++) {
              var x = brick * 32 + (row % 2 ? 16 : 0), y = row * 16;
              var warmth = random(), light = 46 + random() * 8;
              ctx.fillStyle = 'hsl(' + (14 + warmth * 5) + ', ' + (39 + warmth * 8) + '%, ' + light + '%)';
              ctx.fillRect(x + 0.65, y + 0.65, 30.7, 14.7);
              var wash = ctx.createLinearGradient(x, y, x + 12, y + 16);
              wash.addColorStop(0, 'rgba(255,224,181,0.13)');
              wash.addColorStop(0.42, 'rgba(255,224,181,0)');
              wash.addColorStop(1, 'rgba(68,38,27,0.13)');
              ctx.fillStyle = wash; ctx.fillRect(x + 0.65, y + 0.65, 30.7, 14.7);
              ctx.fillStyle = 'rgba(249,211,171,0.28)'; ctx.fillRect(x + 1, y + 1, 30, 0.5);
              ctx.fillStyle = 'rgba(64,43,31,0.19)'; ctx.fillRect(x + 1, y + 14.75, 30, 0.55);
              for (var pore = 0; pore < 38; pore++) {
                ctx.fillStyle = random() > 0.55 ? 'rgba(66,36,24,0.12)' : 'rgba(255,226,184,0.12)';
                ctx.fillRect(x + 1.2 + random() * 29, y + 1.5 + random() * 12.8, 0.25 + random() * 0.65, 0.2 + random() * 0.45);
              }
            }
          }
          var tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          finishBlockTexture(tex); _procTexCache.brick = tex; return tex;
        }`);
replaceFunction('makeWoodTexture', 'makeSandTexture', `
        function makeWoodTexture() {
          if (_procTexCache.wood) return _procTexCache.wood;
          var random = surfaceRandom(1879);
          var c = document.createElement('canvas'); c.width = c.height = 256;
          var ctx = c.getContext('2d'); ctx.scale(4, 4);
          ctx.fillStyle = '#b88d59'; ctx.fillRect(0, 0, 64, 64);
          // Broad growth bands remain visible at a distance; finer fibres resolve
          // as the camera approaches. Periodic paths join at the texture edge.
          for (var band = -2; band < 18; band++) {
            var base = band * 4.6, bend = 0.6 + random() * 1.5, phase = random() * Math.PI * 2;
            ctx.strokeStyle = band % 3 === 0 ? 'rgba(90,52,27,0.13)' : 'rgba(236,194,132,0.12)';
            ctx.lineWidth = 1.1 + random() * 1.4; ctx.beginPath();
            for (var x = 0; x <= 64; x += 2) {
              var y = base + Math.sin(x / 64 * Math.PI * 2 + phase) * bend;
              if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          for (var grain = -3; grain < 70; grain++) {
            var gy = grain * 1.02, phase2 = random() * Math.PI * 2;
            ctx.strokeStyle = grain % 4 === 0 ? 'rgba(255,215,155,0.20)' : 'rgba(94,54,28,0.16)';
            ctx.lineWidth = 0.13 + random() * 0.25; ctx.beginPath();
            for (var xx = 0; xx <= 64; xx += 2) {
              var yy = gy + Math.sin(xx / 64 * Math.PI * 2 + phase2) * 0.8 + Math.sin(xx / 64 * Math.PI * 4) * 0.25;
              if (!xx) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
          }
          // A quiet spindle knot with growth rings reads as timber, not a stamp.
          for (var ring = 4; ring > 0; ring--) {
            ctx.strokeStyle = 'rgba(100,60,31,' + (0.045 + (4 - ring) * 0.014) + ')'; ctx.lineWidth = 0.3;
            ctx.beginPath(); ctx.ellipse(42, 27, ring * 1.8, ring * 0.48, 0, 0, Math.PI * 2); ctx.stroke();
          }
          for (var n = 0; n < 220; n++) {
            ctx.fillStyle = random() > 0.5 ? 'rgba(60,38,22,0.055)' : 'rgba(255,220,160,0.06)';
            ctx.fillRect(random() * 64, random() * 64, 0.3 + random() * 1.4, 0.15 + random() * 0.3);
          }
          var tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          finishBlockTexture(tex); _procTexCache.wood = tex; return tex;
        }`);
// Retain the cool stone palette, but replace coarse pixel flecks with mineral
// speckles and a narrow, softly highlighted vein at a higher painted resolution.
replaceOnce("var c = document.createElement('canvas'); c.width = 128; c.height = 128;\n          var ctx = c.getContext('2d'); ctx.scale(2, 2);\n          ctx.fillStyle = '#909da6';", "var c = document.createElement('canvas'); c.width = 256; c.height = 256;\n          var ctx = c.getContext('2d'); ctx.scale(4, 4);\n          ctx.fillStyle = '#909da6';");
replaceOnce("ctx.strokeStyle = 'rgba(50,54,60,0.28)'; ctx.lineWidth = 1;", "ctx.strokeStyle = 'rgba(50,61,66,0.18)'; ctx.lineWidth = 0.35;");
source = source.replace("ctx.fillRect(random() * 64, random() * 64, 1 + random(), 1 + random());", "ctx.fillRect(random() * 64, random() * 64, 0.25 + random() * 0.6, 0.25 + random() * 0.6);");
const roughness = `        // Roughness is linear data, shared by every block of that material.
        // Slight grain variation catches the sun without adding any geometry.
        function makeSurfaceRoughnessTexture(kind, texture) {
          var key = kind + 'SurfaceRoughness';
          if (_procTexCache[key]) return _procTexCache[key];
          var size = 128, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
          var context = canvas.getContext('2d'); context.drawImage(texture.image, 0, 0, size, size);
          var image = context.getImageData(0, 0, size, size), pixels = image.data;
          var base = kind === 'wood' ? 0.79 : kind === 'stone' ? 0.87 : 0.91;
          for (var i = 0; i < pixels.length; i += 4) {
            var luminance = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
            var value = Math.round(255 * Math.min(1, base + (1 - luminance) * (1 - base)));
            pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
          }
          context.putImageData(image, 0, 0);
          var result = new THREE.CanvasTexture(canvas); result.wrapS = result.wrapT = THREE.RepeatWrapping;
          _procTexCache[key] = result; return result;
        }

`;
replaceOnce('        // Block material cache — avoids creating duplicate materials per type', roughness + '        // Block material cache — avoids creating duplicate materials per type');
replaceOnce("var surfaceNormal = makeSurfaceNormalTexture(type, mat.map);", "var surfaceNormal = makeSurfaceNormalTexture(type, mat.map);\n            var surfaceRoughness = makeSurfaceRoughnessTexture(type, mat.map);");
replaceOnce("mat.normalMap = engine._renderProfile && engine._renderProfile.tier === 'saver' ? null : surfaceNormal;", "mat.normalMap = engine._renderProfile && engine._renderProfile.tier === 'saver' ? null : surfaceNormal;\n            mat.roughnessMap = engine._renderProfile && engine._renderProfile.tier === 'saver' ? null : surfaceRoughness;");
replaceOnce("if (material.normalMap !== next) { material.normalMap = next; material.needsUpdate = true; }", "if (material.normalMap !== next) { material.normalMap = next; material.needsUpdate = true; }\n            var roughness = profile.tier === 'saver' ? null : engine._procTexCache[key + 'SurfaceRoughness'];\n            if (material.roughnessMap !== roughness) { material.roughnessMap = roughness; material.needsUpdate = true; }");
replaceOnce("if (type === 'grass' && mat.color) mat.color.multiplyScalar(geometryWorldGroundTint(x, z));", "if (type === 'grass' && mat.color) mat.color.multiplyScalar(geometryWorldGroundTint(x, z));\n          if (/^(stone|wood|brick|sand)$/.test(type) && mat.color) mat.color.multiplyScalar(geometryWorldGroundTint(x + type.length * 31, z - y * 17));");
// Both direct history-removal paths need the same shading refresh as removeBlock.
const historyA = '            delete engine.blocks[key];\n            engine._blocksDirty = true;';
const hs = source.indexOf('        var MAX_UNDO = 200;'), he = source.indexOf('        // ── Ambient occlusion', hs);
const history = source.slice(hs, he);
if (history.split(historyA).length !== 3) throw Error('Expected two history-removal branches');
source = source.slice(0, hs) + history.split(historyA).join(historyA + '\n            engine.refreshAONeighbourhood(a.x, a.y, a.z);') + source.slice(he);
new Function(source);
for (const target of [file, path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js')]) {
  const fd = fs.openSync(target, 'r+'); fs.writeFileSync(fd, source); fs.ftruncateSync(fd, Buffer.byteLength(source)); fs.closeSync(fd);
}
console.log('Tactile material painting, shared roughness, and history shading refresh applied and mirrored.');
