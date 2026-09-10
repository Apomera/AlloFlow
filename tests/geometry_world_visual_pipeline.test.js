// Geometry World — colour pipeline and ground tint.
//
// The renderer encodes its output as sRGB. Hex colours fed to materials raw are
// therefore gamma-encoded twice and reach the display lighter and greyer than
// the palette swatch the student picked; the world now converts them once
// (geometryWorldSrgbColor) and tags painted textures as sRGB. The grass floor
// also carries a deterministic per-cell tint so it reads as turf instead of one
// flat sheet. Both are pure and pinned here without WebGL; the look itself was
// checked by screenshot (scratch/geometry-world-visuals-2026-09-07/captures).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { readFileSync } from 'node:fs';

let tint;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  tint = window.StemLab && window.StemLab.GeometryWorldGroundTint;
  if (typeof tint !== 'function') throw new Error('GeometryWorldGroundTint not exposed on StemLab');
});

describe('geometryWorldGroundTint', () => {
  it('is deterministic: the same cell tints the same on every load', () => {
    for (const [x, z] of [[0, 0], [3, 7], [-4, 24], [50, -10], [12, 12]]) {
      expect(tint(x, z)).toBe(tint(x, z));
    }
  });

  it('stays inside a band narrow enough for the 8% measurement checkerboard to read on top', () => {
    let min = Infinity, max = -Infinity;
    for (let x = -10; x <= 60; x++) for (let z = -10; z <= 30; z++) {
      const v = tint(x, z);
      expect(Number.isFinite(v)).toBe(true);
      min = Math.min(min, v); max = Math.max(max, v);
    }
    expect(min).toBeGreaterThanOrEqual(0.965);
    expect(max).toBeLessThanOrEqual(1.035);
    // and it actually varies (a constant would satisfy the bounds trivially)
    expect(max - min).toBeGreaterThan(0.04);
  });

  it('does not stripe: neighbouring cells are not simply ascending or equal', () => {
    const row = [];
    for (let x = 0; x < 16; x++) row.push(tint(x, 5));
    const distinct = new Set(row.map((v) => v.toFixed(4)));
    expect(distinct.size).toBeGreaterThan(8);
    const ascending = row.every((v, i) => i === 0 || v >= row[i - 1]);
    expect(ascending).toBe(false);
  });
});

describe('geometryWorldVertexAo', () => {
  let ao;
  beforeAll(() => { ao = window.StemLab.GeometryWorldVertexAo; if (typeof ao !== 'function') throw new Error('GeometryWorldVertexAo not exposed'); });
  const cell = { x: 5, y: 0, z: 5 };
  const world = (filled) => (x, y, z) => filled.has(x + ',' + y + ',' + z);

  it('leaves an open corner at full brightness', () => {
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set()))).toBe(1);
  });

  it('darkens the top-face corner next to one neighbouring block', () => {
    // top face (+y) corner at +x,+z; a block standing on the floor at (6,1,5)
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,5'])))).toBe(0.82);
  });

  it('counts the diagonal neighbour on its own as one step', () => {
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,6'])))).toBe(0.82);
  });

  it('treats two edge neighbours as a fully occluded corner regardless of the diagonal', () => {
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,5', '5,1,6'])))).toBe(0.55);
    expect(ao(1, 1, 1, 0, 1, 0, cell, world(new Set(['6,1,5', '5,1,6', '6,1,6'])))).toBe(0.55);
  });

  it('reads the opposite corner from the opposite neighbours', () => {
    const filled = world(new Set(['6,1,5']));
    expect(ao(0, 1, 0, 0, 1, 0, cell, filled)).toBe(1);
    expect(ao(1, 1, 0, 0, 1, 0, cell, filled)).toBe(0.82);
  });

  it('follows the face normal: a side face looks sideways, not up', () => {
    // +x face, top-front corner. The across cell is (6,0,5); its edge neighbours
    // for this corner are (6,1,5) above and (6,0,6) in front, the diagonal (6,1,6).
    // A block at (5,1,5), on top of this cell, is not on the far side of the face.
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['5,1,5'])))).toBe(1);
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['6,1,5'])))).toBe(0.82);
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['6,1,5', '6,1,6'])))).toBe(0.68);
    expect(ao(1, 1, 1, 1, 0, 0, cell, world(new Set(['6,1,5', '6,0,6'])))).toBe(0.55);
  });

  it('gives mid-edge vertices (slab tops, wedge apexes) only the neighbours they actually touch', () => {
    // a vertex at cy = 0.5 on a +x face has no vertical tangent, so only z counts
    expect(ao(1, 0.5, 1, 1, 0, 0, cell, world(new Set(['6,1,5'])))).toBe(1);
    expect(ao(1, 0.5, 1, 1, 0, 0, cell, world(new Set(['6,0,6'])))).toBe(0.82);
  });
});

describe('geometryWorldSunVector', () => {
  let sunVec;
  beforeAll(() => { sunVec = window.StemLab.GeometryWorldSunVector; if (typeof sunVec !== 'function') throw new Error('GeometryWorldSunVector not exposed'); });

  it('always returns a unit vector', () => {
    for (const el of [-20, 0, 9, 45, 58, 90]) for (const az of [-180, -105, 0, 45, 100, 210, 359]) {
      const v = sunVec(el, az);
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 12);
    }
  });

  it('puts the sun overhead at 90 degrees and on the horizon at 0', () => {
    const up = sunVec(90, 137);
    expect(up.y).toBeCloseTo(1, 12);
    expect(Math.hypot(up.x, up.z)).toBeCloseTo(0, 12);
    expect(sunVec(0, 0).y).toBeCloseTo(0, 12);
  });

  it('measures azimuth clockwise from +z, so 0 looks along +z and 90 along +x', () => {
    const north = sunVec(0, 0), east = sunVec(0, 90);
    expect(north.z).toBeCloseTo(1, 12);
    expect(north.x).toBeCloseTo(0, 12);
    expect(east.x).toBeCloseTo(1, 12);
    expect(east.z).toBeCloseTo(0, 12);
  });

  it('keeps the day preset on the same bearing as the sun this world always had', () => {
    // The old fixed light sat at (20, 40, 20): due south-east, x === z.
    const day = sunVec(58, 45);
    expect(day.x).toBeCloseTo(day.z, 12);
    expect(day.x).toBeGreaterThan(0);
    expect(day.y).toBeGreaterThan(0.8); // high sun, short shadows
  });

  it('drops the sun toward the horizon for the raking presets', () => {
    // shadow length scales with 1/tan(elevation): sunset must rake far longer than noon
    const noon = sunVec(58, 45).y, dusk = sunVec(9, -105).y;
    expect(dusk).toBeLessThan(noon);
    expect(dusk).toBeGreaterThan(0); // still above the horizon, so shadows have a direction
    expect(dusk).toBeLessThan(0.2);
  });
});

describe('geometryWorldLerpAngle', () => {
  let lerpAngle;
  beforeAll(() => { lerpAngle = window.StemLab.GeometryWorldLerpAngle; if (typeof lerpAngle !== 'function') throw new Error('GeometryWorldLerpAngle not exposed'); });

  const wrap = (a) => ((a % 360) + 360) % 360;

  it('returns the endpoints unchanged', () => {
    expect(lerpAngle(100, -105, 0)).toBe(100);
    expect(wrap(lerpAngle(100, -105, 1))).toBeCloseTo(wrap(-105), 9);
  });

  it('crosses the 0/360 seam the short way', () => {
    expect(wrap(lerpAngle(350, 10, 0.5))).toBeCloseTo(0, 9);
    expect(wrap(lerpAngle(10, 350, 0.5))).toBeCloseTo(0, 9);
  });

  it('never travels more than 180 degrees', () => {
    for (const [a, b] of [[100, -105], [-150, 45], [0, 179], [0, 181], [45, 62]]) {
      const travelled = Math.abs(lerpAngle(a, b, 1) - a);
      expect(travelled).toBeLessThanOrEqual(180 + 1e-9);
    }
  });

  it('swings sunrise to sunset through the far side rather than back across noon', () => {
    // sunrise az 100 -> sunset az -105 is +155 the short way, not -205
    expect(lerpAngle(100, -105, 1)).toBeCloseTo(255, 9);
    expect(lerpAngle(100, -105, 0.5)).toBeCloseTo(177.5, 9);
  });
});

describe('geometryWorldBlinkScale', () => {
  let blink;
  beforeAll(() => { blink = window.StemLab.GeometryWorldBlinkScale; if (typeof blink !== 'function') throw new Error('GeometryWorldBlinkScale not exposed'); });

  const sample = (seed, step = 0.02, span = 14) => {
    const out = [];
    for (let t = 0; t < span; t += step) out.push(blink(t, seed));
    return out;
  };

  it('stays within the open-to-closed band and never inverts the eye', () => {
    for (const seed of [1, 2, 3, 4, 9]) for (const v of sample(seed)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is open almost all of the time', () => {
    const s = sample(1);
    const open = s.filter((v) => v === 1).length;
    expect(open / s.length).toBeGreaterThan(0.9);
  });

  it('actually closes the eye, more than once, in a fourteen-second window', () => {
    const s = sample(2);
    expect(Math.min(...s)).toBeLessThan(0.2);
    // count separate closures rather than frames below the threshold
    let closures = 0;
    for (let i = 1; i < s.length; i++) if (s[i] < 0.5 && s[i - 1] >= 0.5) closures++;
    expect(closures).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic, so a character blinks the same on every reload', () => {
    for (const t of [0, 1.37, 5, 9.81]) expect(blink(t, 3)).toBe(blink(t, 3));
  });

  it('gives different characters different rhythms, so a room never blinks in unison', () => {
    const first = (seed) => {
      for (let t = 0; t < 14; t += 0.02) if (blink(t, seed) < 0.5) return Math.round(t * 50);
      return -1;
    };
    const times = [1, 2, 3, 4].map(first);
    expect(times.every((v) => v >= 0)).toBe(true);
    expect(new Set(times).size).toBe(times.length);
  });
});

describe('character face geometry', () => {
  const src = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
  const num = (re) => { const m = src.match(re); expect(m, String(re)).not.toBeNull(); return Number(m[1]); };

  // Twice in this file's history the pupil ended up buried: first behind the eye
  // white, then INSIDE it (centres 0.015 apart with radii 0.032 and 0.055, so the
  // pupil never reached the surface and every character stared out of two blank
  // discs). Neither showed up in any test, because both spheres were present and
  // correct in the scene graph. Assert the arithmetic that decides visibility.
  const pupilR = num(/var eyeL = new THREE\.Mesh\(new THREE\.SphereGeometry\(([\d.]+)/);
  const pupilZ = num(/eyeL\.position\.set\(-0\.1, 0\.04, ([\d.]+)\)/);
  const whiteR = num(/var eyeWhiteL = new THREE\.Mesh\(new THREE\.SphereGeometry\(([\d.]+)/);
  const whiteZ = num(/eyeWhiteL\.position\.set\(-0\.1, 0\.04, ([\d.]+)\)/);
  const headR = num(/var head = new THREE\.Mesh\(new THREE\.SphereGeometry\(([\d.]+)/);

  it('stands the pupil proud of the eye white instead of inside it', () => {
    expect(pupilZ + pupilR).toBeGreaterThan(whiteZ + whiteR);
    // and not merely touching: it needs a visible cap
    expect(pupilZ + pupilR - (whiteZ + whiteR)).toBeGreaterThan(0.01);
  });

  it('keeps the pupil from being swallowed however the spheres are sized', () => {
    // the failure mode was containment: |centre gap| + pupilR < whiteR
    expect(Math.abs(pupilZ - whiteZ) + pupilR).toBeGreaterThan(whiteR);
  });

  it('keeps both eye spheres in front of the face rather than sunk into the skull', () => {
    expect(whiteZ + whiteR).toBeGreaterThan(headR);
    expect(pupilZ + pupilR).toBeGreaterThan(headR);
  });

  it('hangs each arm from a shoulder pivot so it swings from the top', () => {
    // rotating the arm mesh itself would pivot about the middle of the arm
    expect(src).toContain('pivot.add(arm);');
    expect(src).toContain('body.add(pivot);');
    expect(src).toMatch(/arm\.position\.y = -0\.\d+;/);
  });

  it('disposes character children, not just the body and head', () => {
    // eyes, mouth and arms are children; a flat dispose left them on the GPU
    expect(src).toContain('obj.traverse(function(part) {');
  });
});

describe('colour pipeline source contract', () => {
  const src = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
  const pub = readFileSync('desktop/web-app/public/stem_lab/stem_tool_geometryworld.js', 'utf8');

  it('keeps the desktop mirror byte-identical', () => {
    expect(pub).toBe(src);
  });

  it('routes block and character colours through the sRGB-to-linear conversion', () => {
    expect(src).toContain('var color = geometryWorldSrgbColor(THREE, getBlockColor(type));');
    expect(src).toContain('color: geometryWorldSrgbColor(THREE, npcColor)');
    expect(src).toContain('color: geometryWorldSrgbColor(THREE, 0xFFDBB4)');
  });

  it('tags every painted block texture as sRGB', () => {
    // one finishBlockTexture per painted generator: grass, grass atlas, brick,
    // wood, sand, stone. Normal maps are linear data and must NOT be tagged.
    expect(src.split('finishBlockTexture(tex);').length - 1).toBe(6);
    expect(src).toContain("_procTexCache[key] = tex;");
    expect(src).not.toMatch(/makeBumpNormalTexture[\s\S]{0,2400}finishBlockTexture\(tex\);[\s\S]{0,200}_procTexCache\[key\]/);
    expect(src).toContain('tex.encoding = THREE.sRGBEncoding');
  });

  it('gives the reflection map only to reflective block types, never the whole scene', () => {
    expect(src).toContain("if (type === 'glass' || type === 'diamond' || type === 'gold' || type === 'water' || type === 'ice') {");
    expect(src).toContain('mat.userData.gwReflective = true;');
    expect(src).not.toContain('engine.scene.environment = rt.texture');
  });

  it('gives every time-of-day preset its own sun position', () => {
    // A preset without sunEl/sunAz would silently fall back to noon, so the sky
    // would recolour while the shadows stayed put — the defect this pass fixed.
    const presets = src.slice(src.indexOf('var ENV_PRESETS = {'), src.indexOf('// Centralized display profiles'));
    for (const key of ['day', 'sunrise', 'sunset', 'night', 'golden']) {
      const line = presets.split('\n').find((l) => l.trim().startsWith(key + ':'));
      expect(line, key).toBeTruthy();
      expect(line, key).toMatch(/sunEl: -?[\d.]+/);
      expect(line, key).toMatch(/sunAz: -?[\d.]+/);
    }
  });

  it('lets the shadow volume travel with the player instead of sitting on the origin', () => {
    // The box is 60 wide but lessons lay ground out to x = 50, so a fixed box left
    // everything past x = 30 with no shadow at all.
    expect(src).toContain('sun.target = engine._sunTarget;');
    expect(src).toContain('engine.scene.add(engine._sunTarget);');
    expect(src).toContain('engine._sunTarget.position.set(stx, 0, stz)');
    // snapped to whole shadow-map texels, or the shadows crawl as the player walks
    expect(src).toContain('Math.round(engine.camera.position.x / texel) * texel');
    // and far enough that a 9-degree sun still clears the world
    expect(src).toMatch(/sun\.shadow\.camera\.near = 0\.5; sun\.shadow\.camera\.far = 2[0-9]{2};/);
  });

  it('previews the placement cell with an outline rather than a triangulated mesh', () => {
    // wireframe:true draws every triangle edge, so the cube preview carried a
    // diagonal across each face and read as a blob instead of the cell being filled.
    // strip line comments: the explanation of this very fix mentions wireframe
    const code = (t) => t.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const start = src.indexOf('// ── Placement ghost');
    const ghost = code(src.slice(start, src.indexOf('// Position based on shape type', start)));
    expect(ghost).not.toMatch(/wireframe:\s*true/);
    expect(ghost).toContain('new THREE.EdgesGeometry(gGeo)');
    expect(ghost).toContain('engine._ghostMesh.add(gEdges);');
    // and no wireframe material is left anywhere a student can see one
    expect(code(src)).not.toMatch(/wireframe:\s*true/);
  });

  it('disposes the ghost outline along with the ghost, at both call sites', () => {
    // the outline is a child, so a flat geometry+material dispose would leak it
    expect(src).toContain('function disposeGhost(mesh)');
    expect(src).toContain('engine.scene.remove(engine._ghostMesh); disposeGhost(engine._ghostMesh);');
    expect(src).toContain('engine._disposeGhost(engine._ghostMesh)');
    // and no call site still disposes the ghost the flat way
    expect(src).not.toMatch(/engine\._ghostMesh\.geometry\.dispose\(\)/);
  });

  it('tumbles break debris instead of sliding it through the air unrotated', () => {
    expect(src).toContain('p.userData._spin = new THREE.Vector3(');
    expect(src).toContain('part.rotation.x += part.userData._spin.x * dt;');
  });

  it('draws dimension labels colour-true without scene-lighting changes', () => {
    // the pill and coloured text were gamma-encoded twice and read as faded pastel,
    // the same defect the character labels had before they were tagged sRGB
    const label = src.slice(src.indexOf('function makeDimLabel'), src.indexOf('function showDimLines'));
    expect(label).toContain('dimTex.encoding = THREE.sRGBEncoding');
    expect(label).toContain('toneMapped:false');
    expect(label).toContain('cx.fillText(text,c.width/2,41,c.width-36)');
    expect(label).not.toContain('new THREE.CanvasTexture(c), transparent: true, depthTest: false');
  });

  // Placement/hover opacity during measurement is verified on real THREE
  // materials in geometry_world_placement_transaction.test.js.

  it('keeps hidden layers countable as outlines in the layer explorer', () => {
    // a hidden layer used to vanish outright, so revealing 'through layer 1' of a
    // 3x3x3 lost the other 18 cells and the prism's height
    expect(src).toContain('engine.addLayerGhost = function(mesh)');
    expect(src).toContain('new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), engine._layerGhostMat)');
    // both visibility branches (measured-structure targets and whole-world) outline what they hide
    expect(src.split('if (mesh.visible) visibleCount++; else engine.addLayerGhost(mesh);').length - 1).toBe(2);
    // outlines are rebuilt from scratch on every focus change and dropped with the block map
    expect(src).toContain('engine._layerFocus = next;\n          engine.clearLayerGhosts();');
    expect(src).toContain('if (engine.clearLayerGhosts) engine.clearLayerGhosts();');
    // and the hidden layers\' glow slabs soften so the outlines are what the eye reads
    expect(src).toContain('g.material.opacity = hidden ? 0.015 : 0.06;');
  });

  it('puts the lesson-complete card in front of the player, not at a fixed world point', () => {
    // the card sat at (10, 12, 10): visible for a lesson at the origin, off-screen
    // for one laid out at x = 40
    expect(src).not.toContain('congSprite.position.set(10, 12, 10);');
    expect(src).toContain('var cfwd = engine.camera.getWorldDirection(new THREE.Vector3());');
    expect(src).toContain('engine.camera.position.x + cfwd.x * 7,');
    expect(src).toContain('congTex.encoding = THREE.sRGBEncoding');
    expect(src).toContain("canvas2.width = 1024; canvas2.height = 512;");
  });

  it('spins the completion confetti so it flutters instead of sliding', () => {
    expect(src).toContain('cMesh.userData._spin = new THREE.Vector3(');
    expect(src).toContain('new THREE.BoxGeometry(0.14, 0.02, 0.09)');
  });

  it('draws L, W and H as bars that read at distance, not one-pixel lines', () => {
    // WebGL ignores linewidth, so the old LineSegments were a single pixel wide
    // at any distance and vanished under the layer glow
    const fn = src.slice(src.indexOf('function dimLine(ax, ay, az, bx, by, bz, color)'), src.indexOf('// ── Sequential formula buildup'));
    expect(fn).toContain('new THREE.BoxGeometry(Math.abs(bx - ax) + thick, Math.abs(by - ay) + thick, Math.abs(bz - az) + thick)');
    expect(fn).toContain('depthTest: false');
    expect(fn).not.toContain('LineSegments');
    expect(fn).toContain('engine._dimLines.push(bar);');
  });

  it('draws the character prompt and question marker at 2x, tagged sRGB', () => {
    expect(src).toContain('promptCanvas.width = 256; promptCanvas.height = 96;');
    expect(src).toContain('promptTex.encoding = THREE.sRGBEncoding');
    expect(src).toContain('qCanvas.width = 128; qCanvas.height = 128;');
    expect(src).toContain('qTex.encoding = THREE.sRGBEncoding');
    expect(src).toContain("qcx.strokeText('?', 64, 68);");
  });

  it('builds two cloud sheets that drift at different rates', () => {
    // one sheet of evenly scattered blobs reads as haze; parallax between two
    // sheets is what gives the sky depth
    expect(src).toContain('function makeCloudSheet(count, scale, alpha, size, height, opacity)');
    expect(src).toContain('var cloudPlane = makeCloudSheet(13, 1, 0.16, 200, 40, 0.5);');
    expect(src).toContain('var cloudPlaneHigh = makeCloudSheet(9, 1.7, 0.1, 320, 62, 0.3);');
    expect(src).toContain('engine._cloudTexHigh.offset.x += dt * 0.002;');
    // and both sheets follow the preset's cloud opacity
    expect(src).toContain('engine._cloudPlaneHigh.material.opacity = cloudOp * 0.6;');
  });

  it('tints the clouds with the sky while keeping them brighter than it', () => {
    // white clouds over an orange sunset read as a compositing mistake; clouds
    // tinted all the way to the fog colour disappear into it
    const m = src.match(/engine\._cloudPlane\.material\.color\.copy\(engine\.scene\.fog\.color\)\.lerp\(engine\._cloudWhite, ([\d.]+)\)/);
    expect(m).not.toBeNull();
    const keepWhite = Number(m[1]);
    expect(keepWhite).toBeGreaterThan(0.6);
    expect(keepWhite).toBeLessThan(0.95);
  });

  it('gives the star field two layers and a twinkle', () => {
    // PointsMaterial has one size for every point, so depth costs a second layer
    expect(src).toContain('bright.userData.isBrightStars = true;');
    expect(src).toContain('engine._manualStars.add(bright);');
    expect(src).toContain('Math.sin(engine._starPhase * 1.6)');
    // steady under reduced motion, like every other ambient motion in this tool
    expect(src).toContain("engine._ambientMotionEnabled === false ? 1 :");
  });

  it('disposes both cloud sheets and every star layer', () => {
    // the cloud plane was removed from the scene but never disposed
    expect(src).toContain('[engine._cloudPlane, engine._cloudPlaneHigh].forEach(function(sheet)');
    expect(src).toContain('if (sheet.material && sheet.material.map) sheet.material.map.dispose();');
    expect(src).toContain('engine._manualStars.traverse(function(part) {');
  });

  it('places the compass strip over the play area, measured not hard-coded', () => {
    // the strip is absolutely positioned inside the workspace, which starts at the
    // toolbar, so a plain top:12px drew it inside the dark header
    expect(src).toContain('function placeStrip()');
    expect(src).toContain("var wrapEl = document.getElementById('geoworld-fs-wrap');");
    expect(src).toContain("cv.style.top = Math.max(0, Math.round(wr.top - hr.top) + 12) + 'px';");
    // a hard-coded toolbar height would break when the toolbar wraps on narrow screens
    expect(src).not.toMatch(/cv\.style\.top = '\d+px'/);
    // and the observers come down with the canvas
    expect(src).toContain('function stopStrip()');
    expect(src).toContain('if (!cv.isConnected) { stopStrip(); return; }');
  });

  it('gives the compass a north tick so it orients with nobody in view', () => {
    // with every character behind the player the strip drew only edge arrows,
    // which is exactly when someone lost looks at it
    expect(src).toContain('var relNorth = -camYaw;');
    expect(src).toContain("ctx.fillText('N', northX, 12);");
  });

  it('redraws the minimap on its own loop instead of once when React attaches it', () => {
    // painted inside the ref, the map showed wherever the player stood when they
    // opened it: fourteen blocks of travel left the canvas pixel-identical
    expect(src).toContain('function drawMinimap()');
    expect(src).toContain('function miniLoop(now)');
    expect(src).toContain('requestAnimationFrame(miniLoop);');
    // the loop stops with the canvas and re-arms if the panel is reopened
    expect(src).toContain("if (!canvasNode.isConnected) { canvasNode._miniStarted = false; return; }");
    expect(src).toContain('if (canvasNode._miniStarted) return;');
  });

  it('reads live engine state in the minimap loop rather than a render closure', () => {
    // a loop that outlives a render would hold that render's engine and answered set
    const fn = src.slice(src.indexOf('function drawMinimap()'), src.indexOf('var scale = 3; // pixels per block'));
    expect(fn).toContain('var engine = window.__geoWorldEngine;');
    expect(fn).toContain('var answeredNpcs = engine._answeredRef || {};');
    // and a map does not need every frame
    expect(src).toContain('if (now - lastMiniDraw >= 100)');
  });

  it('shrink-wraps the action bar instead of stretching it across the world', () => {
    // pinned left AND right it was a glass panel nearly the width of the screen
    // holding three small buttons, which reads as an empty band over the play area
    const bar = src.slice(src.indexOf("el('div', { className: 'gw-action-bar',"), src.indexOf("// Fly mode toggle (always visible)"));
    expect(bar).not.toContain("left: '130px'");
    expect(bar).not.toContain("right: '120px'");
    expect(bar).toContain("left: '50%'");
    expect(bar).toContain("width: 'max-content'");
    // still allowed to wrap on a narrow screen rather than overflowing
    expect(bar).toContain("maxWidth: 'calc(100% - 24px)'");
    expect(bar).toContain("flexWrap: 'wrap'");
  });

  it('rings the crosshair so it reads over bright grass as well as night', () => {
    // 1px white arms at half alpha vanish over the green this world is mostly made of
    expect(src).toContain("var chRing = '0 0 0 1px rgba(2,6,23,0.6)';");
    expect(src).not.toContain("ct === 'block' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'");
    // every arm carries the ring, not just the centre dot
    expect(src.split('background: chColor, boxShadow: chRing').length - 1).toBe(4);
  });

  it('keeps bloom above what a lit surface or a white label can reach', () => {
    const m = src.match(/UnrealBloomPass\([^;]*?,\s*([\d.]+)\)\);/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(0.95);
  });
});
