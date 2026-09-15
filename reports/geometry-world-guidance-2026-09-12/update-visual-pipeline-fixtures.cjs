const fs = require('node:fs');
const file = 'tests/geometry_world_visual_pipeline.test.js';
const raw = fs.readFileSync(file, 'utf8');
let source = raw.replace(/\r\n/g, '\n');
function replace(before, after) {
  if (source.split(before).length !== 2) throw Error('Expected one fixture anchor: ' + before);
  source = source.replace(before, after);
}
replace("    expect(src).toContain('promptCanvas.width = 256; promptCanvas.height = 96;');", `    const promptSize = src.match(/promptCanvas.width = (\\d+); promptCanvas.height = (\\d+);/);
    expect(Number(promptSize[1])).toBeGreaterThanOrEqual(256);
    expect(Number(promptSize[2])).toBeGreaterThanOrEqual(96);`);
replace(`    expect(src).toContain("qcx.strokeText('?', 64, 68);");`, `    expect(src).toContain('function geometryGuideSymbol(');
    expect(src).toContain("geometryGuideSymbol(ctx, w / 2, h / 2, 32, state.kind, p.ink);");`);
replace(`    expect(src).toContain('var relNorth = -camYaw;');
    expect(src).toContain("ctx.fillText('N', northX, 12);");`, `    const start = src.indexOf('  function geometryGuideState(');
    const end = src.indexOf('  // ── Non-visual wayfinding ──', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    const paint = new Function(src.slice(start, end) + '\\nreturn geometryPaintGuideCompass;')();
    const text = [];
    const ctx = new Proxy({ fillText: (...args) => text.push(args) }, { get: (target, key) => key in target ? target[key] : () => {} });
    const camera = { position: { x: 0, z: 0 }, updateWorldMatrix() {}, matrixWorld: { elements: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] } };
    expect(paint(ctx, 260, 32, { camera, npcs: [] }, false)).toBe('');
    expect(text).toContainEqual(['N', 130, 11]);`);
if (raw.includes('\r\n')) source = source.replace(/\n/g, '\r\n');
const fd = fs.openSync(file, 'r+');
try { fs.writeSync(fd, source, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(source)); }
finally { fs.closeSync(fd); }
console.log('Updated prompt-resolution and north-orientation fixtures.');
