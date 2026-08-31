/**
 * Geometry World Builder enhancement
 *
 * Adds a focused free-build mode and a local Geometry World -> Print Lab bridge
 * without forking Geometry World's rendering, movement, measurement, or block tools.
 */
(function () {
  'use strict';

  var ENGINE_KEY = '__geoWorldEngine';
  var MAX_BLOCKS = 1500;
  var MAX_EDITABLE_WORLD_BYTES = 512 * 1024;
  var MAX_EDITABLE_BLOCKS = 875;
  var EDITABLE_WORLD_SCHEMA = 'alloflow-geometry-world/2';
  var EDITABLE_XZ_LIMIT = 64;
  var EDITABLE_Y_MAX = 128;
  var FREE_BUILD_LESSON = {
    title: 'Free Build Sandbox',
    description: 'A calm, open block-building world for designing, measuring, revising, and preparing a selected creation for Print Lab.',
    spawnPoint: [0, 3, 6],
    objectives: [
      'Build an original connected structure',
      'Use cubes, halves, slabs, wedges, or quarter pieces',
      'Measure and revise the structure before sending it to Print Lab'
    ],
    ground: { xMin: -12, xMax: 12, zMin: -12, zMax: 12, y: 0, type: 'grass' },
    structures: [],
    npcs: [],
    sandbox: true
  };
  var BLOCK_TYPES = [
    { id: 'stone', name: 'Stone', emoji: '\uD83E\uDEA8' },
    { id: 'grass', name: 'Grass', emoji: '\uD83C\uDF3F' },
    { id: 'wood', name: 'Wood', emoji: '\uD83E\uDEB5' },
    { id: 'diamond', name: 'Diamond', emoji: '\uD83D\uDC8E' },
    { id: 'gold', name: 'Gold', emoji: '\uD83E\uDD47' },
    { id: 'sand', name: 'Sand', emoji: '\uD83C\uDFD6\uFE0F' },
    { id: 'glass', name: 'Glass', emoji: '\uD83D\uDD32' },
    { id: 'water', name: 'Water', emoji: '\uD83D\uDCA7' },
    { id: 'brick', name: 'Brick', emoji: '\uD83E\uDDF1' },
    { id: 'ice', name: 'Ice', emoji: '\u2744\uFE0F' },
    { id: 'lava', name: 'Lava', emoji: '\uD83C\uDF0B' },
    { id: 'torch', name: 'Torch', emoji: '\uD83D\uDD25' }
  ];
  var BLOCK_SHAPES = [
    { id: 'cube', name: 'Cube', emoji: '\u2B1C', fraction: '1' },
    { id: 'halfA', name: 'Diagonal half', emoji: '\u25E2', fraction: '\u00BD' },
    { id: 'halfB', name: 'Half slab', emoji: '\u25AD', fraction: '\u00BD' },
    { id: 'quarter', name: 'Quarter wedge', emoji: '\u25E3', fraction: '\u00BC' }
  ];

  function validBlockType(value, allowGrass) {
    var id = typeof value === 'string' ? value : '';
    var known = BLOCK_TYPES.some(function (item) { return item.id === id; });
    return known && (allowGrass || id !== 'grass') ? id : 'stone';
  }
  function validBlockShape(value) {
    var id = typeof value === 'string' ? value : '';
    return BLOCK_SHAPES.some(function (item) { return item.id === id; }) ? id : 'cube';
  }
  function normalizedRotation(value) {
    return ((Math.round(Number(value) || 0) % 4) + 4) % 4;
  }
  function normalizedGridPosition(position) {
    if (!position || ![position.x, position.y, position.z].every(function (value) {
      return typeof value === 'number' && isFinite(value) && Math.abs(value) <= MAX_BLOCKS;
    })) return null;
    return { x: Math.round(position.x), y: Math.round(position.y), z: Math.round(position.z) };
  }
  function sanitizeSourceBlock(block, allowGrass) {
    var position = normalizedGridPosition(block);
    if (!position) return null;
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      type: validBlockType(block.type, !!allowGrass),
      shape: validBlockShape(block.shape),
      rotation: normalizedRotation(block.rotation)
    };
  }

  function editableWorldByteLength(text) {
    text = String(text == null ? '' : text);
    try { return new TextEncoder().encode(text).byteLength; }
    catch (_) { try { return unescape(encodeURIComponent(text)).length; } catch (__) { return text.length * 2; } }
  }
  function editableTitle(value) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80) || 'Geometry World editable build';
  }
  function normalizeEditableWorld(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || candidate.schema !== EDITABLE_WORLD_SCHEMA) return { ok: false, error: 'Choose an AlloFlow Geometry World editable file (schema alloflow-geometry-world/2).' };
    if (!Array.isArray(candidate.blocks) || !candidate.blocks.length) return { ok: false, error: 'The editable world does not contain any student blocks.' };
    if (candidate.blocks.length > MAX_EDITABLE_BLOCKS) return { ok: false, error: 'This editable world has more than ' + MAX_EDITABLE_BLOCKS + ' student blocks, the safe sandbox capacity.' };
    var blocks = [], seen = {};
    for (var i = 0; i < candidate.blocks.length; i++) {
      var raw = candidate.blocks[i];
      var knownType = raw && BLOCK_TYPES.some(function (item) { return item.id === raw.type && item.id !== 'grass'; });
      var knownShape = raw && BLOCK_SHAPES.some(function (item) { return item.id === raw.shape; });
      var integerPosition = raw && [raw.x, raw.y, raw.z].every(function (value) { return typeof value === 'number' && isFinite(value) && Math.round(value) === value; });
      var validRotation = raw && typeof raw.rotation === 'number' && isFinite(raw.rotation) && Math.round(raw.rotation) === raw.rotation && raw.rotation >= 0 && raw.rotation <= 3;
      if (!knownType || !knownShape || !integerPosition || !validRotation || Math.abs(raw.x) > EDITABLE_XZ_LIMIT || Math.abs(raw.z) > EDITABLE_XZ_LIMIT || raw.y < 1 || raw.y > EDITABLE_Y_MAX) {
        return { ok: false, error: 'Block ' + (i + 1) + ' is outside the editable sandbox schema or allowed coordinate range.' };
      }
      var clean = sanitizeSourceBlock(raw, false), key = keyFor(clean);
      if (seen[key]) return { ok: false, error: 'The editable world contains two blocks at ' + key + '.' };
      seen[key] = true; blocks.push(clean);
    }
    blocks.sort(compareBlocks);
    var min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    blocks.forEach(function (block) {
      min.x = Math.min(min.x, block.x); min.y = Math.min(min.y, block.y); min.z = Math.min(min.z, block.z);
      max.x = Math.max(max.x, block.x); max.y = Math.max(max.y, block.y); max.z = Math.max(max.z, block.z);
    });
    return {
      ok: true,
      value: { schema: EDITABLE_WORLD_SCHEMA, title: editableTitle(candidate.title), coordinateSystem: 'x-right,y-up,z-depth', blocks: blocks },
      summary: { blockCount: blocks.length, bounds: { width: max.x - min.x + 1, depth: max.z - min.z + 1, height: max.y - min.y + 1 }, min: min, max: max }
    };
  }
  function parseEditableWorldText(text, declaredBytes) {
    text = String(text == null ? '' : text);
    var byteLength = Math.max(0, Math.round(Number(declaredBytes) || editableWorldByteLength(text)));
    if (byteLength > MAX_EDITABLE_WORLD_BYTES || text.length > MAX_EDITABLE_WORLD_BYTES) return { ok: false, error: 'Editable Geometry World files are limited to 512 KiB.' };
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (_) { return { ok: false, error: 'The selected file is not valid JSON.' }; }
    var normalized = normalizeEditableWorld(parsed);
    if (normalized.ok) normalized.byteLength = byteLength;
    return normalized;
  }
  function readEditableWorldFile(file) {
    if (!file) return Promise.reject(new Error('Choose an editable Geometry World JSON file.'));
    if (Number(file.size) > MAX_EDITABLE_WORLD_BYTES) return Promise.reject(new Error('Editable Geometry World files are limited to 512 KiB.'));
    if (typeof file.text === 'function') return file.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('The editable world file could not be read.')); };
      reader.readAsText(file);
    });
  }
  function compareBlocks(a, b) {
    return a.y - b.y || a.x - b.x || a.z - b.z || a.shape.localeCompare(b.shape) || a.type.localeCompare(b.type) || a.rotation - b.rotation;
  }

  function defaultPrintEnvelope(measurement) {
    if (!measurement || ![measurement.L, measurement.W, measurement.H].every(function (value) { return typeof value === 'number' && isFinite(value) && value > 0; })) return null;
    var envelope = {
      widthMm: Math.round(measurement.L * 500) / 100,
      depthMm: Math.round(measurement.W * 500) / 100,
      heightMm: Math.round(measurement.H * 500) / 100
    };
    envelope.label = envelope.widthMm + ' × ' + envelope.depthMm + ' × ' + envelope.heightMm + ' mm';
    envelope.fitsDefaultProfile = envelope.widthMm <= 220 && envelope.depthMm <= 220 && envelope.heightMm <= 250;
    return envelope;
  }

  function keyFor(pos) { return pos.x + ',' + pos.y + ',' + pos.z; }
  function measurementLayerFor(data) {
    if (data && data._measurementLayer) return data._measurementLayer;
    return data && data._lessonBlock ? 'lesson' : 'student';
  }
  function isStudentBlock(data) {
    return !!data && data.blockType !== 'grass' && measurementLayerFor(data) === 'student';
  }
  function gridPosition(mesh) {
    var p = mesh && mesh.userData && mesh.userData.gridPos;
    return p && isFinite(p.x) && isFinite(p.y) && isFinite(p.z) ? { x: Number(p.x), y: Number(p.y), z: Number(p.z) } : null;
  }
  function applyMatrix4(elements, point) {
    var x = point[0], y = point[1], z = point[2];
    var w = elements[3] * x + elements[7] * y + elements[11] * z + elements[15];
    var iw = w ? 1 / w : 1;
    return [
      (elements[0] * x + elements[4] * y + elements[8] * z + elements[12]) * iw,
      (elements[1] * x + elements[5] * y + elements[9] * z + elements[13]) * iw,
      (elements[2] * x + elements[6] * y + elements[10] * z + elements[14]) * iw
    ];
  }
  function triangleNormal(a, b, c) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return length ? [nx / length, ny / length, nz / length] : [0, 0, 0];
  }
  function trianglesFromMesh(mesh) {
    if (!mesh || !mesh.geometry || !mesh.matrixWorld) return [];
    if (typeof mesh.updateMatrixWorld === 'function') mesh.updateMatrixWorld(true);
    var position = mesh.geometry.attributes && mesh.geometry.attributes.position;
    if (!position) return [];
    var index = mesh.geometry.index ? mesh.geometry.index.array : null;
    var count = index ? index.length : position.count;
    var elements = mesh.matrixWorld.elements;
    var triangles = [];
    for (var i = 0; i + 2 < count; i += 3) {
      var i0 = index ? index[i] : i;
      var i1 = index ? index[i + 1] : i + 1;
      var i2 = index ? index[i + 2] : i + 2;
      var a = applyMatrix4(elements, [position.getX(i0), position.getY(i0), position.getZ(i0)]);
      var b = applyMatrix4(elements, [position.getX(i1), position.getY(i1), position.getZ(i1)]);
      var c = applyMatrix4(elements, [position.getX(i2), position.getY(i2), position.getZ(i2)]);
      var normal = triangleNormal(a, b, c);
      if (!a.concat(b, c, normal).every(function (value) { return typeof value === 'number' && isFinite(value); })) continue;
      if (Math.abs(normal[0]) + Math.abs(normal[1]) + Math.abs(normal[2]) < 0.000001) continue;
      triangles.push({ n: normal, v: [a, b, c] });
    }
    return triangles;
  }
  function neighborForNormal(pos, normal) {
    var ax = Math.abs(normal[0]), ay = Math.abs(normal[1]), az = Math.abs(normal[2]);
    if (ax < 0.99 && ay < 0.99 && az < 0.99) return null;
    if (ax >= ay && ax >= az) return { x: pos.x + (normal[0] > 0 ? 1 : -1), y: pos.y, z: pos.z };
    if (ay >= ax && ay >= az) return { x: pos.x, y: pos.y + (normal[1] > 0 ? 1 : -1), z: pos.z };
    return { x: pos.x, y: pos.y, z: pos.z + (normal[2] > 0 ? 1 : -1) };
  }
  function writeBinaryStl(triangles) {
    var buffer = new ArrayBuffer(84 + triangles.length * 50);
    var header = new Uint8Array(buffer, 0, 80);
    var label = 'AlloFlow Geometry World selected build';
    for (var i = 0; i < label.length && i < 80; i++) header[i] = label.charCodeAt(i);
    var view = new DataView(buffer);
    view.setUint32(80, triangles.length, true);
    var offset = 84;
    triangles.forEach(function (triangle) {
      var values = triangle.n.concat(triangle.v[0], triangle.v[1], triangle.v[2]);
      values.forEach(function (value) { view.setFloat32(offset, Number(value) || 0, true); offset += 4; });
      view.setUint16(offset, 0, true); offset += 2;
    });
    return buffer;
  }

  function buildGeometryWorldStl(engine, positions, options) {
    options = options || {};
    if (!engine || !engine.blocks || !Array.isArray(positions) || !positions.length) throw new Error('Aim at a connected student build first.');
    var uniquePositions = [];
    var requested = {};
    positions.forEach(function (position) {
      var cleanPosition = normalizedGridPosition(position);
      var key = cleanPosition && keyFor(cleanPosition);
      if (!cleanPosition || requested[key]) return;
      requested[key] = true;
      uniquePositions.push(cleanPosition);
    });
    var selected = {};
    uniquePositions.forEach(function (position) {
      var mesh = engine.blocks[keyFor(position)];
      if (mesh && isStudentBlock(mesh.userData)) selected[keyFor(position)] = true;
    });
    var sourceBlocks = [];
    var triangles = [];
    var shapeCounts = {};
    var materialCounts = {};
    var minGrid = { x: Infinity, y: Infinity, z: Infinity };
    var maxGrid = { x: -Infinity, y: -Infinity, z: -Infinity };
    uniquePositions.forEach(function (position) {
      var mesh = engine.blocks[keyFor(position)];
      if (!mesh || !isStudentBlock(mesh.userData)) return;
      var shape = validBlockShape(mesh.userData.shape);
      var material = validBlockType(mesh.userData.blockType, false);
      var rotation = normalizedRotation(mesh.userData.rotation);
      shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
      materialCounts[material] = (materialCounts[material] || 0) + 1;
      minGrid.x = Math.min(minGrid.x, position.x); minGrid.y = Math.min(minGrid.y, position.y); minGrid.z = Math.min(minGrid.z, position.z);
      maxGrid.x = Math.max(maxGrid.x, position.x); maxGrid.y = Math.max(maxGrid.y, position.y); maxGrid.z = Math.max(maxGrid.z, position.z);
      sourceBlocks.push({ x: position.x, y: position.y, z: position.z, type: material, shape: shape, rotation: rotation });
      trianglesFromMesh(mesh).forEach(function (triangle) {
        if (shape === 'cube') {
          var neighborPos = neighborForNormal(position, triangle.n);
          var neighbor = neighborPos && selected[keyFor(neighborPos)] ? engine.blocks[keyFor(neighborPos)] : null;
          if (neighbor && (neighbor.userData.shape || 'cube') === 'cube') return;
        }
        triangles.push(triangle);
      });
    });
    if (!sourceBlocks.length || !triangles.length) throw new Error('The selected build did not contain printable student geometry.');

    var minVertex = [Infinity, Infinity, Infinity];
    triangles.forEach(function (triangle) { triangle.v.forEach(function (vertex) {
      minVertex[0] = Math.min(minVertex[0], vertex[0]); minVertex[1] = Math.min(minVertex[1], vertex[1]); minVertex[2] = Math.min(minVertex[2], vertex[2]);
    }); });
    triangles.forEach(function (triangle) { triangle.v = triangle.v.map(function (vertex) {
      return [vertex[0] - minVertex[0], vertex[1] - minVertex[1], vertex[2] - minVertex[2]];
    }); });
    sourceBlocks = sourceBlocks.map(function (block) {
      return Object.assign({}, block, { x: block.x - minGrid.x, y: block.y - minGrid.y, z: block.z - minGrid.z });
    }).sort(compareBlocks);
    var shapedCount = sourceBlocks.filter(function (block) { return block.shape !== 'cube'; }).length;
    var dimensions = { L: maxGrid.x - minGrid.x + 1, W: maxGrid.z - minGrid.z + 1, H: maxGrid.y - minGrid.y + 1 };
    return {
      buffer: writeBinaryStl(triangles),
      blockCount: sourceBlocks.length,
      triangleCount: triangles.length,
      shapedCount: shapedCount,
      shapeCounts: shapeCounts,
      materialCounts: materialCounts,
      dimensions: dimensions,
      sourceModel: {
        schema: 'alloflow-geometry-world-build/1',
        title: options.title || 'Geometry World selected build',
        coordinateSystem: 'x-right,y-up,z-depth',
        blocks: sourceBlocks
      }
    };
  }

  function announce(ctx, message, kind) {
    if (ctx && typeof ctx.addToast === 'function') ctx.addToast(message, kind || 'info');
    if (ctx && typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
    try {
      var region = document.getElementById('allo-live-geometryworld');
      if (region) { region.textContent = ''; setTimeout(function () { region.textContent = message; }, 30); }
    } catch (_) {}
  }
  function patchGeometryState(ctx, patch) {
    if (ctx && typeof ctx.updateMulti === 'function') { ctx.updateMulti('geometryWorld', patch); return; }
    if (ctx && typeof ctx.update === 'function') Object.keys(patch).forEach(function (key) { ctx.update('geometryWorld', key, patch[key]); });
  }
  function safeFilePart(value) {
    return String(value || 'geometry-world').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'geometry-world';
  }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function focusWorldSurface(delay) {
    if (typeof document === 'undefined') return;
    setTimeout(function () {
      var surface = document.getElementById('geoworld-fs-wrap');
      if (!surface || typeof surface.focus !== 'function') return;
      try { surface.focus({ preventScroll: true }); } catch (_) { surface.focus(); }
    }, typeof delay === 'number' ? delay : 40);
  }
  function editableWorld(engine) {
    var blocks = [];
    Object.keys((engine && engine.blocks) || {}).forEach(function (key) {
      var mesh = engine.blocks[key], position = gridPosition(mesh);
      if (!position || !mesh.userData || !isStudentBlock(mesh.userData)) return;
      var clean = sanitizeSourceBlock({
        x: position.x, y: position.y, z: position.z,
        type: mesh.userData.blockType || 'stone',
        shape: mesh.userData.shape || 'cube',
        rotation: mesh.userData.rotation || 0
      }, false);
      if (clean) blocks.push(clean);
    });
    blocks.sort(compareBlocks);
    return { schema: EDITABLE_WORLD_SCHEMA, title: 'Geometry World editable build', coordinateSystem: 'x-right,y-up,z-depth', blocks: blocks };
  }
  function saveEditableWorld(ctx) {
    var engine = window[ENGINE_KEY];
    if (!engine) { announce(ctx, 'Open the 3D world before saving.', 'info'); return; }
    var checked = normalizeEditableWorld(editableWorld(engine));
    if (!checked.ok) { announce(ctx, checked.error, 'error'); return; }
    downloadBlob(new Blob([JSON.stringify(checked.value, null, 2)], { type: 'application/json' }), safeFilePart((engine._currentLesson && engine._currentLesson.title) || 'geometry-world') + '-editable.json');
    announce(ctx, 'Saved ' + checked.summary.blockCount + ' editable student block' + (checked.summary.blockCount === 1 ? '' : 's') + ' with shapes and rotations.', 'success');
  }
  function startSandboxMode(ctx) {
    var engine = window[ENGINE_KEY];
    if (!engine || typeof engine.loadLesson !== 'function') { announce(ctx, 'The 3D world is still getting ready. Try Free Build again in a moment.', 'info'); return false; }
    engine.loadLesson(FREE_BUILD_LESSON);
    patchGeometryState(ctx, {
      activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false,
      showSandboxLauncher: false, creatorMode: false, tutorialDismissed: true,
      hudPreset: 'builder', hudPanel: 'inventory', objectivesOpen: false,
      showGameSettings: false, showPredictionPanel: false, measureResult: null,
      measureHistory: [], score: 0, totalQ: 0, answeredNpcs: {}
    });
    if (engine.logEvent) engine.logEvent('sandbox_open', { source: 'geometry_world_builder' });
    announce(ctx, 'Free Build Sandbox opened. Aim at the ground and place blocks to begin.', 'success');
    focusWorldSurface(50);
    return true;
  }
  function restoreEditableWorld(engine, candidate) {
    if (!engine || typeof engine.loadLesson !== 'function' || typeof engine.placeBlock !== 'function') return { ok: false, error: 'The Geometry World engine is not ready.' };
    var checked = normalizeEditableWorld(candidate);
    if (!checked.ok) return checked;
    engine.loadLesson(FREE_BUILD_LESSON);
    var available = Math.max(0, MAX_BLOCKS - Object.keys(engine.blocks || {}).length);
    if (checked.value.blocks.length > available) return { ok: false, error: 'The sandbox does not have enough safe block capacity for this file.' };
    var placedCount = 0;
    checked.value.blocks.forEach(function (block) {
      var key = keyFor(block);
      engine.placeBlock(block.x, block.y, block.z, block.type, block.shape, block.rotation);
      if (engine.blocks[key] && isStudentBlock(engine.blocks[key].userData)) placedCount += 1;
    });
    if (placedCount !== checked.value.blocks.length) return { ok: false, error: 'Geometry World could not restore every validated block.' };
    engine.blocksPlaced = placedCount;
    engine._undoStack = [];
    engine._redoStack = [];
    return { ok: true, value: checked.value, summary: checked.summary, placedCount: placedCount };
  }
  function aimedStudentMeasurement(ctx, updateDisplay) {
    var engine = window[ENGINE_KEY];
    var hit = engine && engine.blockUnderCrosshair ? engine.blockUnderCrosshair() : null;
    var data = hit && hit.object && hit.object.userData;
    var gp = data && data.gridPos;
    if (!engine || !gp || measurementLayerFor(data) !== 'student' || data.blockType === 'grass') {
      announce(ctx, 'Aim the crosshair at a block you placed. Ground and lesson blocks are not included.', 'info');
      return null;
    }
    var measurement = updateDisplay && engine.performMeasurement
      ? engine.performMeasurement('builder_studio')
      : engine.measureStructure(gp.x, gp.y, gp.z);
    if (!measurement || measurement.isComplete === false) {
      announce(ctx, 'That connected build is too large or incomplete to prepare safely.', 'error');
      return null;
    }
    return { engine: engine, measurement: measurement, gp: gp };
  }
  function measureSelectedBuild(ctx) {
    var selected = aimedStudentMeasurement(ctx, true);
    if (!selected) return;
    announce(ctx, 'Measured ' + selected.measurement.count + ' connected student block' + (selected.measurement.count === 1 ? '' : 's') + '.', 'success');
  }
  function openSelectedBuildInPrintLab(ctx) {
    var selected = aimedStudentMeasurement(ctx, false);
    if (!selected) return;
    var eng = selected.engine;
    var measurement = eng.measureStructure(selected.gp.x, selected.gp.y, selected.gp.z);
    if (!measurement || measurement.isComplete === false) { announce(ctx, 'The selected build could not be measured completely.', 'error'); return; }
    var bundle;
    try { bundle = buildGeometryWorldStl(eng, measurement.blocks, { title: 'Geometry World selected build' }); }
    catch (error) { announce(ctx, error && error.message ? error.message : 'The selected build could not be prepared.', 'error'); return; }
    window.__alloPrintLabPendingHandoff = {
      schema: 'alloflow-print-source/1',
      id: 'gw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      sourceTool: 'geometryWorld', format: 'STL',
      bytes: new Uint8Array(bundle.buffer),
      sourceName: 'geometry-world-selected-build.stl',
      title: 'Geometry World build - ' + bundle.blockCount + ' blocks',
      description: 'Created from one connected Geometry World student build. Virtual block materials are appearance labels; choose the physical filament in Print Lab.',
      unitMm: 5,
      sourceModel: bundle.sourceModel,
      summary: { blockCount: bundle.blockCount, triangleCount: bundle.triangleCount, shapedCount: bundle.shapedCount, dimensions: bundle.dimensions }
    };
    if (eng.logEvent) eng.logEvent('print_lab_handoff', { blocks: bundle.blockCount, triangles: bundle.triangleCount, shapedBlocks: bundle.shapedCount });
    if (ctx && typeof ctx.setStemLabTool === 'function') {
      announce(ctx, 'Selected build prepared locally. Opening Print Lab.', 'success');
      ctx.setStemLabTool('printLab');
    } else {
      downloadBlob(new Blob([bundle.buffer], { type: 'model/stl' }), 'geometry-world-selected-build.stl');
      announce(ctx, 'Print Lab navigation is unavailable here, so the selected STL was downloaded instead.', 'info');
    }
  }

  function restorePendingEditableBuild(ctx, engine) {
    var pending = window.__alloGeometryWorldPendingBuild;
    if (!pending) return false;
    var source = pending.sourceModel;
    var blocks = source && source.schema === 'alloflow-geometry-world-build/1' && Array.isArray(source.blocks) ? source.blocks : null;
    delete window.__alloGeometryWorldPendingBuild;
    if (!blocks || !blocks.length) { announce(ctx, 'The returning Geometry World source was invalid and was not opened.', 'error'); return true; }
    var clean = [];
    var seen = {};
    blocks.forEach(function (block) {
      var next = sanitizeSourceBlock(block, false);
      var key = next && keyFor(next);
      if (!next || seen[key] || clean.length >= MAX_BLOCKS) return;
      seen[key] = true;
      clean.push(next);
    });
    if (!clean.length) { announce(ctx, 'The returning Geometry World source had no usable blocks.', 'error'); return true; }
    clean.sort(compareBlocks);
    engine.loadLesson(FREE_BUILD_LESSON);
    var available = Math.max(0, MAX_BLOCKS - Object.keys(engine.blocks || {}).length);
    var requestedCount = clean.length;
    clean = clean.slice(0, available);
    if (!clean.length) { announce(ctx, 'The sandbox has no remaining block capacity for this returning build.', 'error'); return true; }
    var minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
    clean.forEach(function (block) {
      minX = Math.min(minX, block.x); maxX = Math.max(maxX, block.x);
      minY = Math.min(minY, block.y);
      minZ = Math.min(minZ, block.z); maxZ = Math.max(maxZ, block.z);
    });
    var offsetX = -Math.floor((minX + maxX) / 2);
    var offsetZ = -Math.floor((minZ + maxZ) / 2);
    var offsetY = 1 - minY;
    var placedCount = 0;
    clean.forEach(function (block) {
      var x = block.x + offsetX, y = block.y + offsetY, z = block.z + offsetZ;
      var targetKey = x + ',' + y + ',' + z;
      var existed = !!engine.blocks[targetKey];
      engine.placeBlock(x, y, z, block.type, block.shape, block.rotation);
      if (!existed && engine.blocks[targetKey]) placedCount += 1;
    });
    if (!placedCount) { announce(ctx, 'The returning build could not be placed in the sandbox.', 'error'); return true; }
    patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory', measureResult: null, measureHistory: [] });
    if (engine.logEvent) engine.logEvent('print_lab_return', { blocks: placedCount, requestedBlocks: requestedCount, truncated: requestedCount > placedCount });
    announce(ctx, 'Editable build returned from Print Lab with ' + placedCount + ' block' + (placedCount === 1 ? '' : 's') + '. It is centered one block above the sandbox floor.' + (requestedCount > placedCount ? ' The world safety limit prevented ' + (requestedCount - placedCount) + ' additional block' + (requestedCount - placedCount === 1 ? '' : 's') + ' from being restored.' : ''), requestedCount > placedCount ? 'info' : 'success');
    focusWorldSurface(50);
    return true;
  }

  window.StemLab = window.StemLab || {};
  window.StemLab.geometryWorldBuilderPure = {
    MAX_BLOCKS: MAX_BLOCKS,
    MAX_EDITABLE_WORLD_BYTES: MAX_EDITABLE_WORLD_BYTES,
    MAX_EDITABLE_BLOCKS: MAX_EDITABLE_BLOCKS,
    EDITABLE_WORLD_SCHEMA: EDITABLE_WORLD_SCHEMA,
    FREE_BUILD_LESSON: FREE_BUILD_LESSON,
    measurementLayerFor: measurementLayerFor,
    buildGeometryWorldStl: buildGeometryWorldStl,
    editableWorld: editableWorld,
    normalizeEditableWorld: normalizeEditableWorld,
    parseEditableWorldText: parseEditableWorldText,
    restoreEditableWorld: restoreEditableWorld,
    defaultPrintEnvelope: defaultPrintEnvelope,
    sanitizeSourceBlock: sanitizeSourceBlock,
    restorePendingEditableBuild: restorePendingEditableBuild
  };

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('allo-geometryworld-builder-css')) return;
    var style = document.createElement('style');
    style.id = 'allo-geometryworld-builder-css';
    style.textContent = [
      '.gwe-free-build-launch{position:absolute;top:68px;right:12px;z-index:44;display:inline-flex;min-height:44px;align-items:center;gap:8px;padding:9px 14px;border:1px solid rgba(103,232,249,.7);border-radius:14px;background:linear-gradient(135deg,rgba(8,145,178,.96),rgba(79,70,229,.96));box-shadow:0 14px 38px rgba(2,6,23,.48),inset 0 1px 0 rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:900;cursor:pointer;backdrop-filter:blur(12px)}',
      '.gwe-free-build-launch small{font-size:9px;font-weight:700;opacity:.82}.gwe-free-build-launch:hover{transform:translateY(-1px);box-shadow:0 18px 42px rgba(8,145,178,.24)}',
      '.gwe-builder-dock{position:absolute;top:68px;right:12px;z-index:43;box-sizing:border-box;width:min(326px,calc(100% - 24px));overflow:hidden;border:1px solid rgba(103,232,249,.48);border-radius:18px;background:linear-gradient(155deg,rgba(8,47,73,.96),rgba(15,23,42,.96) 55%,rgba(49,46,129,.94));box-shadow:0 22px 60px rgba(2,6,23,.58),inset 0 1px 0 rgba(255,255,255,.08);color:#f8fafc;backdrop-filter:blur(16px) saturate(125%)}',
      '.gwe-builder-dock[data-collapsed="true"]{width:auto}.gwe-builder-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border-bottom:1px solid rgba(103,232,249,.18)}.gwe-builder-title{display:flex;min-width:0;align-items:center;gap:9px}.gwe-builder-icon{display:grid;width:34px;height:34px;flex:0 0 auto;place-items:center;border:1px solid rgba(103,232,249,.45);border-radius:11px;background:rgba(14,116,144,.34);font-size:18px}.gwe-builder-eyebrow{color:#67e8f9;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.gwe-builder-name{margin-top:1px;color:#fff;font-size:13px;font-weight:900}.gwe-collapse{display:grid;min-width:38px;min-height:38px;place-items:center;border:1px solid rgba(148,163,184,.35);border-radius:10px;background:rgba(15,23,42,.64);color:#e2e8f0;font-size:15px;cursor:pointer}',
      '.gwe-builder-body{display:flex;flex-direction:column;gap:11px;padding:12px 13px 13px}.gwe-builder-intro{margin:0;color:#cbd5e1;font-size:10px;line-height:1.5}.gwe-selection{display:grid;grid-template-columns:1fr 1fr;gap:7px}.gwe-selection-card{min-width:0;padding:8px 9px;border:1px solid rgba(148,163,184,.2);border-radius:11px;background:rgba(15,23,42,.54)}.gwe-selection-label{display:block;color:#94a3b8;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.gwe-selection-value{display:block;margin-top:3px;overflow:hidden;color:#f8fafc;font-size:10px;font-weight:850;text-overflow:ellipsis;white-space:nowrap}',
      '.gwe-measure-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.gwe-metric{padding:7px 5px;border:1px solid rgba(103,232,249,.18);border-radius:10px;background:rgba(8,47,73,.35);text-align:center}.gwe-metric strong{display:block;color:#fff;font-size:12px}.gwe-metric span{color:#a5f3fc;font-size:8px;font-weight:800;text-transform:uppercase}.gwe-builder-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.gwe-builder-actions button{min-height:44px;padding:8px 9px;border:1px solid rgba(148,163,184,.34);border-radius:11px;background:rgba(15,23,42,.72);color:#f8fafc;font-size:10px;font-weight:900;cursor:pointer}.gwe-builder-actions .gwe-primary{grid-column:1/-1;border-color:#67e8f9;background:linear-gradient(135deg,#0891b2,#4f46e5);font-size:11px}.gwe-builder-actions button:hover{filter:brightness(1.12)}.gwe-builder-note{margin:0;padding-top:8px;border-top:1px solid rgba(148,163,184,.15);color:#bae6fd;font-size:9px;line-height:1.45}',
      '.gwe-recovery{padding:10px;border:1px solid rgba(103,232,249,.36);border-radius:12px;background:rgba(8,47,73,.34)}.gwe-recovery[data-state="error"]{border-color:rgba(251,113,133,.55);background:rgba(76,5,25,.34)}.gwe-recovery strong{display:block;color:#fff;font-size:11px}.gwe-recovery p{margin:4px 0 0;color:#cffafe;font-size:9px;line-height:1.5}.gwe-recovery[data-state="error"] p{color:#ffe4e6}.gwe-recovery-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.gwe-recovery-actions button{min-height:40px;padding:7px;border:1px solid rgba(148,163,184,.42);border-radius:10px;background:rgba(15,23,42,.82);color:#fff;font-size:9px;font-weight:900;cursor:pointer}.gwe-recovery-actions .gwe-replace{border-color:#fbbf24;background:#92400e}',
      '.gwe-print-ready{padding:9px 10px;border:1px solid rgba(52,211,153,.38);border-radius:11px;background:rgba(6,78,59,.3)}.gwe-print-ready[data-fit="false"]{border-color:rgba(251,191,36,.48);background:rgba(120,53,15,.28)}.gwe-print-ready-label{display:block;color:#6ee7b7;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.gwe-print-ready[data-fit="false"] .gwe-print-ready-label{color:#fde68a}.gwe-print-ready strong{display:block;margin-top:3px;color:#fff;font-size:13px}.gwe-print-ready p{margin:4px 0 0;color:#d1fae5;font-size:9px;line-height:1.45}.gwe-print-ready[data-fit="false"] p{color:#fef3c7}',
      '.gwe-backdrop{position:absolute;inset:0;z-index:210;display:flex;box-sizing:border-box;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,.78);backdrop-filter:blur(10px)}.gwe-launcher{box-sizing:border-box;width:min(760px,100%);max-height:calc(100% - 8px);overflow:auto;border:1px solid rgba(103,232,249,.52);border-radius:24px;background:radial-gradient(circle at 15% 0,rgba(8,145,178,.25),transparent 38%),linear-gradient(150deg,#0f172a,#1e1b4b);box-shadow:0 30px 100px rgba(2,6,23,.82);color:#f8fafc}.gwe-launcher-hero{padding:24px 24px 17px;border-bottom:1px solid rgba(148,163,184,.17)}.gwe-launcher-kicker{margin:0;color:#67e8f9;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.gwe-launcher h2{margin:6px 0 0;color:#fff;font-size:25px;line-height:1.12}.gwe-launcher-subtitle{max-width:620px;margin:9px 0 0;color:#cbd5e1;font-size:12px;line-height:1.55}.gwe-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px 24px}.gwe-feature{padding:14px;border:1px solid rgba(148,163,184,.2);border-radius:15px;background:rgba(15,23,42,.58)}.gwe-feature-icon{font-size:22px}.gwe-feature strong{display:block;margin-top:7px;color:#fff;font-size:12px}.gwe-feature p{margin:5px 0 0;color:#cbd5e1;font-size:10px;line-height:1.45}.gwe-reset-note{margin:0 24px;padding:11px 12px;border:1px solid rgba(251,191,36,.36);border-radius:12px;background:rgba(120,53,15,.22);color:#fde68a;font-size:10px;line-height:1.5}.gwe-launcher-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:16px 24px 22px}.gwe-launcher-actions button{min-height:44px;padding:9px 14px;border:1px solid rgba(148,163,184,.4);border-radius:12px;background:#1e293b;color:#f8fafc;font-size:11px;font-weight:900;cursor:pointer}.gwe-launcher-actions .gwe-open{border-color:#67e8f9;background:linear-gradient(135deg,#0891b2,#4f46e5)}',
      '#geoworld-fs-workspace[data-geometry-mode="sandbox"] .gw-toolbar{border-bottom-color:rgba(103,232,249,.34)!important;box-shadow:0 10px 38px rgba(8,145,178,.12)}#geoworld-fs-workspace[data-geometry-mode="sandbox"] .gw-brand-mark{border-color:rgba(103,232,249,.55);background:linear-gradient(135deg,rgba(8,145,178,.48),rgba(79,70,229,.34))}',
      '.theme-contrast .gwe-builder-dock,[data-stem-theme="contrast"] .gwe-builder-dock,.theme-contrast .gwe-launcher,[data-stem-theme="contrast"] .gwe-launcher{border:2px solid #00ffff;background:#000;color:#fff}.theme-contrast .gwe-builder-dock button,[data-stem-theme="contrast"] .gwe-builder-dock button,.theme-contrast .gwe-launcher button,[data-stem-theme="contrast"] .gwe-launcher button{border:2px solid #00ff00;background:#000;color:#00ff00}',
      '@media(max-width:800px){.gwe-free-build-launch{top:62px;right:7px}.gwe-builder-dock{top:62px;right:7px}.gwe-launcher{border-radius:18px}.gwe-feature-grid{grid-template-columns:1fr;padding:13px 16px}.gwe-launcher-hero{padding:19px 16px 14px}.gwe-reset-note{margin:0 16px}.gwe-launcher-actions{padding:14px 16px 18px}}@media(max-width:520px){.gwe-builder-dock{left:7px;right:7px;width:auto}.gwe-builder-dock[data-collapsed="true"]{left:auto}.gwe-builder-actions{grid-template-columns:1fr}.gwe-builder-actions .gwe-primary{grid-column:auto}.gwe-launcher h2{font-size:21px}.gwe-launcher-actions{align-items:stretch;flex-direction:column}.gwe-launcher-actions button{width:100%}}',
      '@media(prefers-reduced-motion:reduce){.gwe-free-build-launch,.gwe-builder-dock,.gwe-launcher,.gwe-builder-dock button,.gwe-launcher button{transition:none!important;animation:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function trapDialogKeys(event, close) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    var controls = Array.prototype.slice.call(event.currentTarget.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
    if (!controls.length) return;
    var first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function installBuilderEnhancement() {
    var lab = window.StemLab;
    var tool = lab && lab._registry && lab._registry.geometryWorld;
    if (!tool || typeof tool.render !== 'function') return false;
    if (tool.__alloflowBuilderEnhanced) return true;
    tool.__alloflowBuilderEnhanced = true;
    tool.desc = 'Explore guided geometry lessons or open a free-build sandbox, measure connected creations, and continue selected builds in Print Lab.';
    tool.aliases = (tool.aliases || []).concat(['free build', 'geometry sandbox', '3D print blocks', 'block builder']);
    var originalRender = tool.render;

    tool.render = function (ctx) {
      var React = ctx.React, h = React.createElement;
      var data = (ctx.toolData && ctx.toolData.geometryWorld) || {};
      var isSandbox = data.activeLesson === 'builderSandbox';
      var hasPendingReturn = !!window.__alloGeometryWorldPendingBuild;
      var base = originalRender(ctx);
      var launcherFocusRef = React.useRef('');
      var editableInputRef = React.useRef(null);
      var editableReadTokenRef = React.useRef(0);
      var _editablePreview = React.useState(null), editablePreview = _editablePreview[0], setEditablePreview = _editablePreview[1];
      var _editableError = React.useState(''), editableError = _editableError[0], setEditableError = _editableError[1];
      var _editableBusy = React.useState(false), editableBusy = _editableBusy[0], setEditableBusy = _editableBusy[1];

      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);

      React.useEffect(function () {
        if (!isSandbox && !hasPendingReturn) return undefined;
        var cancelled = false, attempts = 0, timer = null;
        function restore() {
          if (cancelled) return;
          var engine = window[ENGINE_KEY];
          if (engine && typeof engine.loadLesson === 'function') {
            if (restorePendingEditableBuild(ctx, engine)) return;
            if (!engine._currentLesson || engine._currentLesson.sandbox !== true) engine.loadLesson(FREE_BUILD_LESSON);
            return;
          }
          attempts += 1;
          if (attempts < 30) timer = setTimeout(restore, 100);
        }
        restore();
        return function () { cancelled = true; if (timer) clearTimeout(timer); };
      }, [isSandbox, hasPendingReturn]);

      if (!base || !React.isValidElement(base)) return base;
      var engine = window[ENGINE_KEY];
      var material = BLOCK_TYPES[Math.max(0, Math.min(BLOCK_TYPES.length - 1, Number(data.selectedBlock) || 0))];
      var shape = BLOCK_SHAPES[Math.max(0, Math.min(BLOCK_SHAPES.length - 1, Number(data.selectedShape) || 0))];
      var measured = data.measureResult && data.measureResult.isComplete !== false ? data.measureResult : null;
      var printEnvelope = defaultPrintEnvelope(measured);
      var placed = engine && isFinite(engine.blocksPlaced) ? engine.blocksPlaced : (Number(data.blocksPlaced) || 0);
      var launcherOpen = !!data.showSandboxLauncher;
      var collapsed = !!data.sandboxDockCollapsed;
      function returnLauncherFocus() {
        if (typeof document === 'undefined') return;
        var key = launcherFocusRef.current;
        setTimeout(function () {
          var target = key ? document.querySelector('[data-gwe-focus-return="' + key + '"]') : null;
          target = target || document.querySelector('.gwe-free-build-launch') || document.getElementById('geoworld-fs-wrap');
          if (!target || typeof target.focus !== 'function') return;
          try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
        }, 30);
      }
      function closeLauncher() { patchGeometryState(ctx, { showSandboxLauncher: false }); returnLauncherFocus(); }
      function openLauncher(event) {
        var trigger = event && event.currentTarget;
        launcherFocusRef.current = trigger && trigger.getAttribute ? (trigger.getAttribute('data-gwe-focus-return') || '') : '';
        patchGeometryState(ctx, { showSandboxLauncher: true, showGameSettings: false, showPredictionPanel: false, objectivesOpen: false, hudPanel: '' });
      }
      function returnToLessons() {
        patchGeometryState(ctx, { activeLesson: 'volumeExplorer', worldActive: false, showLessonIntro: true, sandboxDockCollapsed: false, measureResult: null, measureHistory: [], hudPanel: '' });
        announce(ctx, 'Guided lesson picker ready. Choose a lesson and start when you are ready.', 'info');
      }
      function chooseEditableWorld(event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        var token = editableReadTokenRef.current + 1;
        editableReadTokenRef.current = token;
        setEditableBusy(true); setEditablePreview(null); setEditableError('');
        readEditableWorldFile(file).then(function (text) {
          if (editableReadTokenRef.current !== token) return;
          var checked = parseEditableWorldText(text, file.size);
          if (!checked.ok) throw new Error(checked.error);
          setEditablePreview(checked); setEditableError('');
          announce(ctx, 'Editable world checked locally. Review the preview before replacing the current sandbox.', 'info');
        }).catch(function (error) {
          if (editableReadTokenRef.current !== token) return;
          var message = error && error.message ? error.message : 'The editable world file could not be checked.';
          setEditablePreview(null); setEditableError(message); announce(ctx, message, 'error');
        }).then(function () { if (editableReadTokenRef.current === token) setEditableBusy(false); });
      }
      function cancelEditablePreview() {
        editableReadTokenRef.current += 1;
        setEditableBusy(false); setEditablePreview(null); setEditableError('');
      }
      function confirmEditableRestore() {
        if (!editablePreview || !editablePreview.value) return;
        var liveEngine = window[ENGINE_KEY];
        var result = restoreEditableWorld(liveEngine, editablePreview.value);
        if (!result.ok) { setEditableError(result.error); announce(ctx, result.error, 'error'); return; }
        patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory', measureResult: null, measureHistory: [], blocksPlaced: result.placedCount });
        if (liveEngine.logEvent) liveEngine.logEvent('editable_world_open', { blocks: result.placedCount, schema: EDITABLE_WORLD_SCHEMA });
        cancelEditablePreview();
        announce(ctx, 'Opened ' + result.value.title + ' with ' + result.placedCount + ' student block' + (result.placedCount === 1 ? '' : 's') + '. The previous sandbox was replaced only after confirmation.', 'success');
        focusWorldSurface(50);
      }

      var additions = [];
      if (!isSandbox && !launcherOpen) additions.push(h('button', {
        key: 'gwe-launch', type: 'button', className: 'gwe-free-build-launch', onClick: openLauncher,
        'aria-haspopup': 'dialog', 'aria-controls': 'gwe-sandbox-launcher', 'aria-expanded': 'false', 'data-gwe-focus-return': 'lesson-launcher'
      }, h('span', { 'aria-hidden': 'true' }, '\u2728'), h('span', null, 'Free Build', h('small', { style: { display: 'block' } }, 'Sandbox studio'))));

      if (isSandbox && data.worldActive) additions.push(h('aside', {
        key: 'gwe-dock', className: 'gwe-builder-dock', 'data-collapsed': collapsed ? 'true' : 'false',
        'aria-label': 'Free Build Studio'
      },
        h('div', { className: 'gwe-builder-head' },
          h('div', { className: 'gwe-builder-title' },
            h('span', { className: 'gwe-builder-icon', 'aria-hidden': 'true' }, '\uD83E\uDDF1'),
            !collapsed && h('div', null, h('div', { className: 'gwe-builder-eyebrow' }, 'Sandbox mode'), h('div', { className: 'gwe-builder-name' }, 'Free Build Studio'))
          ),
          h('button', { type: 'button', className: 'gwe-collapse', onClick: function () { patchGeometryState(ctx, { sandboxDockCollapsed: !collapsed }); }, 'aria-expanded': collapsed ? 'false' : 'true', 'aria-label': collapsed ? 'Expand Free Build Studio' : 'Collapse Free Build Studio' }, collapsed ? '\u25C0' : '\u25B6')
        ),
        !collapsed && h('div', { className: 'gwe-builder-body' },
          h('p', { className: 'gwe-builder-intro' }, 'Build freely, then aim the crosshair at one connected creation to measure it or continue in Print Lab.'),
          h('div', { className: 'gwe-selection', 'aria-label': 'Current block choices' },
            h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Material'), h('span', { className: 'gwe-selection-value' }, material.emoji + ' ' + material.name)),
            h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Shape / rotation'), h('span', { className: 'gwe-selection-value' }, shape.emoji + ' ' + shape.name + ' - ' + ((Number(data.blockRotation) || 0) * 90) + '\u00B0'))
          ),
          h('div', { className: 'gwe-measure-summary', 'aria-label': 'Build summary' },
            h('div', { className: 'gwe-metric' }, h('strong', null, placed), h('span', null, 'Placed')),
            h('div', { className: 'gwe-metric' }, h('strong', null, measured ? measured.count : '-'), h('span', null, 'Selected')),
            h('div', { className: 'gwe-metric' }, h('strong', null, measured ? measured.L + '\u00D7' + measured.W + '\u00D7' + measured.H : '-'), h('span', null, 'Bounds'))
          ),
          printEnvelope && h('div', { className: 'gwe-print-ready', 'data-fit': printEnvelope.fitsDefaultProfile ? 'true' : 'false', role: 'status' },
            h('span', { className: 'gwe-print-ready-label' }, 'Default Print Lab block envelope'),
            h('strong', null, printEnvelope.label),
            h('p', null, printEnvelope.fitsDefaultProfile
              ? 'Within the default 220 × 220 × 250 mm printer profile at 5 mm per block. Advisory preflight is still required.'
              : 'Larger than the default 220 × 220 × 250 mm profile at 5 mm per block. Reduce the build or choose a smaller scale in Print Lab.')
          ),
          h('div', { className: 'gwe-builder-actions' },
            h('button', { type: 'button', onClick: function () { measureSelectedBuild(ctx); } }, '\uD83D\uDCCF Measure aimed build'),
            h('button', { type: 'button', onClick: function () { saveEditableWorld(ctx); } }, '\uD83D\uDCBE Save editable world'),
            h('button', { type: 'button', disabled: editableBusy, onClick: function () { if (editableInputRef.current) editableInputRef.current.click(); } }, editableBusy ? 'Checking file...' : '\uD83D\uDCC2 Open editable world'),
            h('input', { ref: editableInputRef, type: 'file', accept: '.json,application/json', onChange: chooseEditableWorld, style: { display: 'none' }, tabIndex: -1, 'aria-hidden': 'true' }),
            h('button', { type: 'button', className: 'gwe-primary', onClick: function () { openSelectedBuildInPrintLab(ctx); } }, '\uD83D\uDDA8\uFE0F Send selected build to Print Lab'),
            h('button', { type: 'button', onClick: returnToLessons }, '\uD83D\uDCD8 Choose guided lesson'),
            h('button', { type: 'button', onClick: openLauncher, 'aria-haspopup': 'dialog', 'aria-controls': 'gwe-sandbox-launcher', 'data-gwe-focus-return': 'sandbox-dock' }, '\u2728 Start a fresh sandbox')
          ),
          editableError && h('div', { className: 'gwe-recovery', 'data-state': 'error', role: 'alert' }, h('strong', null, 'File not opened'), h('p', null, editableError)),
          editablePreview && h('section', { className: 'gwe-recovery', 'data-state': 'preview', 'aria-labelledby': 'gwe-recovery-title' },
            h('strong', { id: 'gwe-recovery-title' }, 'Ready to open: ' + editablePreview.value.title),
            h('p', null, editablePreview.summary.blockCount + ' student block' + (editablePreview.summary.blockCount === 1 ? '' : 's') + ' - bounds ' + editablePreview.summary.bounds.width + ' x ' + editablePreview.summary.bounds.depth + ' x ' + editablePreview.summary.bounds.height + '. Current world is unchanged.'),
            h('p', null, 'Replacing starts from the blank sandbox floor and treats the loaded blocks as a new baseline. This cannot be undone inside Geometry World.'),
            h('div', { className: 'gwe-recovery-actions' },
              h('button', { type: 'button', onClick: cancelEditablePreview }, 'Cancel'),
              h('button', { type: 'button', className: 'gwe-replace', onClick: confirmEditableRestore }, 'Replace current sandbox')
            )
          ),
          h('p', { className: 'gwe-builder-note' }, 'Print Lab starts at 5 mm per block. Geometry World materials describe appearance only; choose the real filament separately after reviewing its science and tradeoffs.')
        )
      ));

      if (launcherOpen) additions.push(h('div', { key: 'gwe-modal', className: 'gwe-backdrop', role: 'presentation' },
        h('section', {
          id: 'gwe-sandbox-launcher', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gwe-launcher-title', 'aria-describedby': 'gwe-launcher-desc',
          className: 'gwe-launcher', tabIndex: -1, onKeyDown: function (event) { trapDialogKeys(event, closeLauncher); }
        },
          h('div', { className: 'gwe-launcher-hero' },
            h('p', { className: 'gwe-launcher-kicker' }, 'Geometry World - Build & Create'),
            h('h2', { id: 'gwe-launcher-title' }, 'Open a blank Free Build Sandbox'),
            h('p', { id: 'gwe-launcher-desc', className: 'gwe-launcher-subtitle' }, 'Use the same Geometry World controls in an uncluttered 25 x 25 workspace. Your cubes, slabs, diagonal halves, quarter wedges, rotations, measurements, undo/redo, and camera tools all carry over.')
          ),
          h('div', { className: 'gwe-feature-grid' },
            h('article', { className: 'gwe-feature' }, h('span', { className: 'gwe-feature-icon', 'aria-hidden': 'true' }, '\uD83E\uDDF1'), h('strong', null, 'Build your way'), h('p', null, 'Mix block shapes and visual materials, rotate pieces, and revise with undo and redo.')),
            h('article', { className: 'gwe-feature' }, h('span', { className: 'gwe-feature-icon', 'aria-hidden': 'true' }, '\uD83D\uDCCF'), h('strong', null, 'Measure connected work'), h('p', null, 'Aim at one creation to see its block count and bounding dimensions without selecting the whole world.')),
            h('article', { className: 'gwe-feature' }, h('span', { className: 'gwe-feature-icon', 'aria-hidden': 'true' }, '\uD83D\uDDA8\uFE0F'), h('strong', null, 'Continue in Print Lab'), h('p', null, 'Send only the selected build locally, preview its real geometry, set scale, study materials, and run advisory preflight.'))
          ),
          h('p', { className: 'gwe-reset-note', role: 'note' }, '\u26A0\uFE0F Opening the blank sandbox replaces the world currently shown. Save an editable JSON copy first if you want to return to it later.'),
          h('div', { className: 'gwe-launcher-actions' },
            h('button', { type: 'button', onClick: function () { saveEditableWorld(ctx); } }, 'Save current world JSON'),
            h('button', { type: 'button', onClick: closeLauncher }, 'Cancel'),
            h('button', { type: 'button', className: 'gwe-open', autoFocus: true, onClick: function () { startSandboxMode(ctx); } }, 'Open blank sandbox')
          )
        )
      ));

      var children = React.Children.toArray(base.props.children).concat(additions);
      return React.cloneElement(base, {
        className: (base.props.className || '') + ' gwe-enhanced',
        'data-geometry-mode': isSandbox ? 'sandbox' : 'lesson'
      }, children);
    };
    return true;
  }

  installStyles();
  if (!installBuilderEnhancement()) {
    var attempts = 0;
    (function retry() {
      attempts += 1;
      if (installBuilderEnhancement() || attempts >= 600) return;
      setTimeout(retry, 100);
    })();
  }
})();
