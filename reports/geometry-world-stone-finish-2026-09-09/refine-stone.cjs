const fs = require('node:fs'), path = require('node:path');
const file = 'stem_lab/stem_tool_geometryworld.js';
fs.mkdirSync(path.join(__dirname, 'before-source'), { recursive: true });
for (const name of ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js', 'stem_tool_printlab.js']) {
  const output = path.join(__dirname, 'before-source', name);
  if (!fs.existsSync(output)) fs.copyFileSync('stem_lab/' + name, output);
}
let source = fs.readFileSync(file, 'utf8');
const nl = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
const start = source.indexOf('        function makeStoneTexture() {');
const end = source.indexOf('        function makeGrassTexture() {', start);
if (start < 0 || end < start) throw Error('Missing stone texture boundary');
const replacement = `        function makeStoneTexture() {
          if (_procTexCache.stone) return _procTexCache.stone;
          var random = surfaceRandom(341), size = 256;
          var c = document.createElement('canvas'); c.width = c.height = size;
          var ctx = c.getContext('2d'), image = ctx.createImageData(size, size), pixels = image.data;
          // A honed mineral surface: restrained broad variation with finer grains.
          // Periodic fields tile on every face without painted border seams, and
          // keep their character when mipmaps simplify the texture at a distance.
          var fields = [4, 16, 64].map(function(count) {
            var values = new Float32Array(count * count);
            for (var i = 0; i < values.length; i++) values[i] = random() * 2 - 1;
            return { count:count, values:values };
          });
          function mineral(field, x, y) {
            var count = field.count, u = x * count / size, v = y * count / size;
            var ix = Math.floor(u), iy = Math.floor(v), tx = u - ix, ty = v - iy;
            tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
            var a = field.values[iy * count + ix], b = field.values[iy * count + (ix + 1) % count];
            var d = field.values[((iy + 1) % count) * count + ix], e = field.values[((iy + 1) % count) * count + (ix + 1) % count];
            return (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
          }
          for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
            var broad = mineral(fields[0], x, y), grain = mineral(fields[1], x, y), fine = mineral(fields[2], x, y);
            var fleck = random(), variation = broad * 3 + grain * 4 + fine * 2 + (random() - 0.5) * 3;
            // Sparse pale quartz and darker mineral pinpoints, never large stains.
            variation += fleck > 0.987 ? 11 : fleck < 0.013 ? -9 : 0;
            var offset = (y * size + x) * 4;
            pixels[offset] = Math.round(159 + variation + broad);
            pixels[offset + 1] = Math.round(166 + variation);
            pixels[offset + 2] = Math.round(164 + variation - broad);
            pixels[offset + 3] = 255;
          }
          ctx.putImageData(image, 0, 0);
          var tex = new THREE.CanvasTexture(c);
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          finishBlockTexture(tex);
          _procTexCache.stone = tex;
          return tex;
        }
`;
source = source.slice(0, start) + replacement + source.slice(end);
source = source.replace("stone:['#b4bec5','#909da6','#6e7e89']", "stone:['#c0c9c3','#9fa6a4','#7d8c86']");
source = source.replace("if(type==='stone') details.push(path('vein','M5 17L8 15L12 18M19 24L22 20L26 21','#dce6e8',0.4));",
  "if(type==='stone') [[7,16],[11,22],[20,20],[25,16],[14,7]].forEach(function(v,i){details.push(el('circle',{key:'mineral'+i,cx:v[0],cy:v[1],r:0.6,fill:i%2?'#657b71':'#e5ede5',opacity:0.5}));});");
source = source.replace(/\n/g, nl);
for (const output of [file, 'desktop/web-app/public/' + file]) {
  const fd = fs.openSync(output, 'r+'); fs.writeFileSync(fd, source); fs.ftruncateSync(fd, Buffer.byteLength(source)); fs.closeSync(fd);
}
console.log('Refined stone texture and matching palette swatch; mirrors written.');
