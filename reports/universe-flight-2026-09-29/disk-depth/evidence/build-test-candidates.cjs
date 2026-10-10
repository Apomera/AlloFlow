'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const rendererHash='8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9';
assert.equal(sha(fs.readFileSync(path.join(stage,'candidate-renderer.js'))),rendererHash);
const rendererBaseline=fs.readFileSync(path.join(stage,'baseline-renderer.js'),'utf8');
assert.equal(sha(rendererBaseline),'c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7');
const window={};new Function('window',rendererBaseline.replace('  global.UniverseFlight =','  global.__testAtlas=galaxyPixels;\n  global.UniverseFlight ='))(window);
const atlas=window.__testAtlas(512),alphaHashes=[];
for(let tile=0;tile<3;tile++){
  const bytes=new Uint8Array(512*512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)bytes[y*512+x]=atlas[(y*2048+tile*512+x)*4+3];
  alphaHashes.push(sha(bytes));
}
const files=[];
function adapt(relative,baselineName,candidateName,transform){
  const sourcePath=path.join(repo,relative),before=fs.readFileSync(sourcePath),changes=[];
  fs.writeFileSync(path.join(stage,baselineName),before);
  let text=before.toString('utf8');
  function replace(oldValue,newValue,purpose){assert.equal(text.split(oldValue).length,2,purpose+' has one exact anchor');text=text.replace(oldValue,()=>newValue);changes.push({purpose,before:oldValue,after:newValue});}
  transform(replace);
  fs.writeFileSync(path.join(stage,candidateName),text);
  assert.equal(sha(fs.readFileSync(sourcePath)),sha(before),'Production test remains unchanged');
  files.push({sourcePath,baselinePath:path.join(stage,baselineName),candidatePath:path.join(stage,candidateName),baselineHash:sha(before),candidateHash:sha(text),changes});
}
adapt('tests/helpers/universe_galaxy_surfaces.js','baseline-test-helper.js','candidate-test-helper.js',replace=>{
  replace('// a sixth field and a projected bulge suffix; keep testing those original bytes.','// a sixth field and projected bulge/disk suffixes; keep testing those original bytes.','Keep historical five-field prefix pins');
  replace('// One rounded bulge per spiral; the cosmic region\'s 46 ellipticals retain\n// their existing projected grids. Nearby clouds remain eleven-field records.',
    '// One rounded bulge and one smooth disk per spiral; the cosmic region\'s\n// 46 ellipticals retain their existing grids. Nearby clouds stay eleven-field records.',
    'Document the two appended ranges without changing historical prefix extraction');
  replace("return originalFloats / 5 * 6 + ({ neighborhood: 0, galaxy: 1, cosmic: 88 }[region]) * (8 * 8 * 6 * 6);",
    "return originalFloats / 5 * 6 + 2 * ({ neighborhood: 0, galaxy: 1, cosmic: 88 }[region]) * (8 * 8 * 6 * 6);",
    'Count both appended bulge and disk tails');
});
adapt('tests/universe_flight_bulges.test.js','baseline-bulges.test.js','candidate-bulges.test.js',replace=>{
  replace('function axes(model = MODEL) {',
`const ORIGINAL_POINTS = {
  neighborhood: [19203, 'f0933322797366fbee8bbdc9ce8d2263700b1c07a71caa1bcfa1224d68edc2a3'],
  galaxy: [36400, 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab'],
  cosmic: [41470, '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85'],
};
const ORIGINAL_BULGE_ALPHA = ${JSON.stringify(alphaHashes)};

function diskProfileAt(x, y) {
  if (x < 8 || x >= 504 || y < 8 || y >= 504) return 0;
  const px = ((x - 8) / 495 * 2 - 1) * 1.22;
  const pz = ((y - 8) / 495 * 2 - 1) * 1.22;
  return helpers.diskLightProfile(Math.hypot(px, pz));
}

function axes(model = MODEL) {`, 'Pin original point and bulge-alpha bytes and define face-on reconstruction coordinates');
  replace('galaxyGeometry:galaxyGeometry, spiralBulgeView:spiralBulgeView, writeProjectedSurface:writeProjectedSurface',
    'galaxyGeometry:galaxyGeometry, spiralBulgeView:spiralBulgeView, writeProjectedSurface:writeProjectedSurface, spiralDiskView:spiralDiskView, diskLightProfile:diskLightProfile, diskLight:function(){return Array.from(galaxyDiskLight);}, diskAxisRatio:function(){return galaxyDiskAxisRatio;}',
    'Expose new private mathematics only in the isolated test evaluation');
  replace("it('keeps original disk xyz and UV bytes and appends one tessellated bulge per spiral', () => {",
    "it('keeps original disk xyz, UV, and point bytes and appends distinct bulge and disk ranges per spiral', () => {",
    'Keep historical geometry coverage and extend it to disk tails');
  replace('      const models = helpers.makeRegion(region).galaxies, geometry = helpers.galaxyGeometry(models);',
`      const data = helpers.makeRegion(region), models = data.galaxies, geometry = helpers.galaxyGeometry(models);
      expect(data.points).toHaveLength(ORIGINAL_POINTS[region][0] * 9);
      expect(hash(data.points)).toBe(ORIGINAL_POINTS[region][1]);`, 'Require exact c0 point populations');
  replace("      expect(geometry.bulges).toHaveLength(models.filter(model => !model.elliptical).length);",
`      const spirals = models.filter(model => !model.elliptical);
      expect(geometry.bulges).toHaveLength(spirals.length);
      expect(geometry.disks).toHaveLength(({ neighborhood: 0, galaxy: 1, cosmic: 88 }[region]));
      expect(geometry.disks).toHaveLength(spirals.length);`, 'Require one appended disk per generated spiral and exact region counts');
  replace(`        expect(validCenter).toBe(true); expect(validLayer).toBe(true);
      }
    }
  });`,
`        expect(validCenter).toBe(true); expect(validLayer).toBe(true);
      }
      const diskStart = oldFloats / 5 * 6 + geometry.bulges.length * 2304;
      for (const [index, range] of geometry.disks.entries()) {
        expect(range.offset).toBe(diskStart + index * 2304); expect(range.count).toBe(2304);
        expect(range.model).toBe(spirals[index]); expect(range.disk).toBe(true);
        const center = range.model.center.map(Math.fround);
        for (let i = range.offset; i < range.offset + range.count; i += 6) {
          expect(Array.from(geometry.points.subarray(i, i + 3))).toEqual(center);
          expect(geometry.points[i + 5]).toBe(-1);
        }
        const direction = axes(range.model)[0], position = range.model.center.map((value, axis) => value + direction[axis] * range.model.radius * 3);
        helpers.writeProjectedSurface(geometry.points, range, position);
      }
      let diskClassOnly = true;
      for (let i = 5; i < geometry.points.length; i += 6) {
        if ((geometry.points[i] < 0) !== (i >= diskStart)) diskClassOnly = false;
      }
      expect(diskClassOnly).toBe(true);
    }
  });`, 'Verify exact disk suffix offsets, initial centers, and exclusive negative presentation classes');
  replace('    const map = helpers.galaxyPixels(512), tint = [1, 0.8, 0.56], sums = Array.from({ length: 3 }, () => [0, 0, 0]);',
    '    const map = helpers.galaxyPixels(512), tint = [1, 0.8, 0.56], diskLight = helpers.diskLight(), sums = Array.from({ length: 3 }, () => [0, 0, 0]);',
    'Add the actual transferred smooth component to historical light reconstruction');
  replace('      for (let c = 0; c < 3; c++) expect(Math.abs(map[offset + c] + map[offset + 3] * tint[c] - rgb[c])).toBeLessThanOrEqual(1.5);',
`      // Keep the historical samples. Their existing bulge roundoff budget is
      // 1.5 bytes; the independently measured disk reconstruction adds at
      // most 1.86752 bytes. The combined 3.5-byte bound covers both transfers.
      for (let c = 0; c < 3; c++) expect(Math.abs(map[offset + c] + map[offset + 3] * tint[c] + 255 * diskProfileAt(x, y) * diskLight[tile * 3 + c] - rgb[c])).toBeLessThanOrEqual(3.5);`,
    'Reconstruct every accepted historical sample within the documented combined quantization bound');
  replace('      for (let c = 0; c < 3; c++) sums[tile][c] += map[offset + c] + map[offset + 3] * tint[c];',
    '      for (let c = 0; c < 3; c++) sums[tile][c] += map[offset + c] + map[offset + 3] * tint[c] + 255 * diskProfileAt(x, y) * diskLight[tile * 3 + c];',
    'Restore transferred light in the existing one-percent historical integral checks');
  replace('    expect(radialMismatches).toBe(0);',
`    expect(radialMismatches).toBe(0);
    for (let tile = 0; tile < 3; tile++) {
      const alpha = new Uint8Array(512 * 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) alpha[y * 512 + x] = map[(y * 2048 + tile * 512 + x) * 4 + 3];
      expect(hash(alpha)).toBe(ORIGINAL_BULGE_ALPHA[tile]);
    }`, 'Require exact c0 bulge-alpha planes alongside the existing radial, elliptical, and cloud checks');
  replace('    const changes = updates.slice(count); expect(changes.length).toBe(134);',
    '    const changes = updates.slice(count); expect(changes.length).toBe(222);\n    const kinds = { elliptical: 0, bulge: 0, disk: 0 };',
    'Count all 46 elliptical, 88 bulge, and 88 smooth disk projected updates');
  replace('      expect(update.buffer).toBe(created.Buffer[1]); expect(update.offset % 24).toBe(0); expect(update.data).toHaveLength(2304);',
`      expect(update.buffer).toBe(created.Buffer[1]); expect(update.offset % 24).toBe(0); expect(update.data).toHaveLength(2304);
      const first = update.offset / 4;
      if (before[first + 5] < 0) { kinds.disk++; expect(update.data[5]).toBeLessThan(0); }
      else if (before[first + 5] >= 1) { kinds.bulge++; expect(update.data[5]).toBeGreaterThanOrEqual(1); }
      else { kinds.elliptical++; expect(before[first + 3]).toBeGreaterThan(0.75); }`,
    'Check the projected update classes instead of permitting changes to the planar prefix');
  replace('        if (!(before[oldOffset + 3] > 0.75 || before[oldOffset + 5] >= 1)) projectedOnly = false;',
    '        if (!(before[oldOffset + 3] > 0.75 || before[oldOffset + 5] >= 1 || before[oldOffset + 5] < 0)) projectedOnly = false;',
    'Recognize only the newly appended disk class as an additional projected range');
  replace('    expect(projectedOnly).toBe(true); expect(stableUV).toBe(true);',
    '    expect(kinds).toEqual({ elliptical: 46, bulge: 88, disk: 88 });\n    expect(projectedOnly).toBe(true); expect(stableUV).toBe(true);',
    'Require the exact update-kind counts and retain stable UV checks');
  replace('// The original three spiral disk grids stay fixed. Both projected kinds',
    '// The original three primary spiral grids stay fixed. All projected kinds',
    'Keep the existing fixed-prefix and corner-suffix assertions');
  replace("  it('uses the same two buffers, textures, and programs through movement and releases each resource once', () => {",
`  it('matches the source vertical spread with a nonnegative decreasing smooth disk and balances its exterior projected area', () => {
    helpers.galaxyPixels(512);
    const q = helpers.diskAxisRatio(), light = helpers.diskLight();
    // An independent radial quadrature recovers the face-on variance. The
    // oblate source's vertical sigma must equal the existing point sigma .012 R.
    const steps = 16384, dr = 1.12 / steps; let radialWeight = 0, radialMoment = 0, previous = Infinity;
    for (let i = 0; i < steps; i++) {
      const r = (i + 0.5) * dr, p = helpers.diskLightProfile(r);
      expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(previous); previous = p;
      radialWeight += r * p * dr; radialMoment += r * r * r * p * dr;
    }
    expect(q * Math.sqrt(radialMoment / (2 * radialWeight))).toBeCloseTo(0.012, 6);
    expect(helpers.diskLightProfile(1.12)).toBe(0); expect(helpers.diskLightProfile(2)).toBe(0);
    for (const value of light) { expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThan(0); }
    const basis = axes();
    for (const direction of [...basis, unit([2, -3, 5]), unit([-4, 1, 2])]) {
      const shape = helpers.spiralDiskView(MODEL, observer(direction)), n = unit(subtract(MODEL.center, observer(direction)));
      expect(Math.abs(dot(shape.major, n)) / length(shape.major)).toBeLessThan(1e-12);
      expect(Math.abs(dot(shape.minor, n)) / length(shape.minor)).toBeLessThan(1e-12);
      expect(Math.abs(dot(shape.major, shape.minor)) / (length(shape.major) * length(shape.minor))).toBeLessThan(1e-12);
      expect(shape.gain * length(shape.major) * length(shape.minor) / MODEL.radius ** 2).toBeCloseTo(1, 11);
      expect(shape.gain).toBeGreaterThanOrEqual(1 - 1e-12); expect(shape.gain).toBeLessThanOrEqual(1 / q + 1e-10);
    }
    const face = helpers.spiralDiskView(MODEL, observer(basis[1])), side = helpers.spiralDiskView(MODEL, observer(basis[0]));
    expect(face.gain).toBeCloseTo(1, 12); expect(length(side.minor) / length(side.major)).toBeCloseTo(q, 12);
    expect(side.gain).toBeCloseTo(1 / q, 10);
    // Every transferred channel follows the same radial profile; no arm,
    // bar, or dark-lane texture is printed onto the projected ellipse.
    for (const value of light) {
      const radial = [0, 0.1, 0.3, 0.6, 0.9, 1.12].map(r => value * helpers.diskLightProfile(r));
      for (let i = 1; i < radial.length; i++) expect(radial[i]).toBeLessThanOrEqual(radial[i - 1]);
    }
  });

  it('fades the smooth exterior disk before entering the source and keeps its presentation class distinct at numerical zero', () => {
    helpers.galaxyPixels(512);
    const direction = axes()[0], far = helpers.spiralDiskView(MODEL, observer(direction));
    const gains = [0.6, 0.8, 1.3, 1.8, 2].map(r => helpers.spiralDiskView(MODEL, observer(direction, MODEL.radius * r)).gain);
    expect(gains[0]).toBeLessThanOrEqual(1e-20); expect(gains.at(-1)).toBeCloseTo(far.gain, 10);
    expect(gains[2]).toBeCloseTo(far.gain * 0.5, 10);
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeGreaterThan(gains[i - 1]);
    const model = { ...MODEL, center: [2100000, -800000, 4200000] }, geometry = helpers.galaxyGeometry([model]), range = geometry.disks[0];
    for (const distance of [0, 0.1, 0.6]) {
      const position = model.center.map((value, i) => value + direction[i] * model.radius * distance);
      const shape = helpers.spiralDiskView(model, position);
      // Coordinate subtraction can shift the exact .6 R boundary by ulps.
      // 1e-20 admits only numerical zero, far below one display-byte quantum.
      expect(shape.gain).toBeGreaterThanOrEqual(0); expect(shape.gain).toBeLessThanOrEqual(1e-20);
      helpers.writeProjectedSurface(geometry.points, range, position);
      for (let i = range.offset; i < range.offset + range.count; i += 6) {
        expect(Number.isFinite(geometry.points[i])).toBe(true); expect(geometry.points[i + 5]).toBe(-1);
      }
    }
    const coincident = helpers.spiralDiskView(model, model.center);
    expect(coincident.gain).toBe(0); expect(length(coincident.major)).toBe(0); expect(length(coincident.minor)).toBe(0);
  });

  it('uses the same two buffers, textures, and programs through movement and releases each resource once', () => {`,
    'Add independent source-moment, exterior flux, monotonic profile, and close-fade numerical checks');
});
assert.equal(sha(fs.readFileSync(path.join(stage,'candidate-renderer.js'))),rendererHash);
fs.writeFileSync(path.join(stage,'candidate-test-patch-manifest.json'),JSON.stringify({rendererHash,rendererBaselineHash:sha(rendererBaseline),files,alphaHashes,productionTestsUnchanged:true,validation:'Staged only; focused execution belongs to the parent after source/test installation.'},null,2));
console.log(JSON.stringify({staged:true,rendererHash,alphaHashes,files:files.map(({sourcePath,baselineHash,candidatePath,candidateHash,changes})=>({sourcePath,baselineHash,candidatePath,candidateHash,changes:changes.length}))}));
