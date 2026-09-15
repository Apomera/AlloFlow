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
  var MAX_EDITABLE_BLOCKS = 1500;
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
  // The millimetres one Geometry World block becomes when Print Lab opens the
  // hand-off. Declared once so the dock's envelope and the hand-off payload
  // can never describe different scales.
  var HANDOFF_UNIT_MM = 5;

  function printUnit(value) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? Math.max(0.01, Math.min(1000, n)) : HANDOFF_UNIT_MM;
  }
  function printContext(ctx) {
    var data = ctx && ctx.toolData && ctx.toolData.geometryWorld;
    return data && data.builderPrintContext || {};
  }
  function setBuilderPrintScale(ctx, value) {
    // Form input is deliberately stricter than legacy scale normalization: an
    // unfinished or invalid draft must never silently change a saved scale.
    var numeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    var unitMm = numeric ? Number(value) : NaN;
    if (!isFinite(unitMm) || unitMm < 0.01 || unitMm > 1000) {
      return {ok:false,error:'Enter a scale from 0.01 to 1,000 millimeters per block.'};
    }
    patchGeometryState(ctx, {builderPrintContext:Object.assign({},printContext(ctx),{unitMm:unitMm})});
    return {ok:true,value:unitMm};
  }
  function compareBlocks(a, b) {
    return a.y - b.y || a.x - b.x || a.z - b.z || a.shape.localeCompare(b.shape) || a.type.localeCompare(b.type) || a.rotation - b.rotation;
  }

  // Print Lab owns the printer profile and the fit rule. The dock reads the
  // school's saved profile so a small printer is not told it has a big bed, and
  // falls back to Print Lab's own defaults when nothing has been saved yet. A
  // gate in tests/geometry_world_printlab_bridge.test.js holds both the
  // fallback and the verdict to Print Lab's DEFAULT_PRINTER_PROFILE and
  // geometryWorldPrinterFit, so the two tools cannot drift apart.
  var FALLBACK_BED_MM = { width: 220, depth: 220, height: 250 };
  function storedPrinterProfile(ctx) {
    var stored = ctx && ctx.toolData && ctx.toolData.printLab && ctx.toolData.printLab.profile;
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : null;
  }
  function builderBedLimits(profile) {
    // Print Lab's clamp: a finite value is pulled into the supported bed range,
    // and only a non-numeric one falls back to the default. Matching it exactly
    // is what keeps the two tools from disagreeing about an odd profile.
    function pick(value, fallback) {
      var size = Number(value);
      if (!isFinite(size)) size = fallback;
      return Math.max(50, Math.min(1000, size));
    }
    return {
      width: pick(profile ? profile.bedWidthMm : undefined, FALLBACK_BED_MM.width),
      depth: pick(profile ? profile.bedDepthMm : undefined, FALLBACK_BED_MM.depth),
      height: pick(profile ? profile.bedHeightMm : undefined, FALLBACK_BED_MM.height)
    };
  }
  // 'width and depth' reads better than 'width, depth' in the card sentence.
  function listDimensions(names) {
    names = Array.isArray(names) ? names : [];
    if (names.length < 2) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }
  // True when the measured component is the student's own work. The result
  // carries the cells it covered; the first one's mesh says which layer it is.
  function measurementIsStudentBuild(engine, measurement) {
    var first = measurement && Array.isArray(measurement.blocks) && measurement.blocks[0];
    var mesh = first && engine && engine.blocks && engine.blocks[keyFor(first)];
    return !!(mesh && isStudentBlock(mesh.userData));
  }
  // What the printer will actually make solid, in the units the lesson counts and
  // in millimetres at the hand-off scale, with the shape breakdown. Ties the
  // print to V = L x W x H rather than to the bounding box alone.
  function printVolumeSentence(measurement, unitMm) {
    unitMm = printUnit(unitMm);
    if (!measurement || typeof measurement.totalVolume !== 'number' || !isFinite(measurement.totalVolume)) return null;
    var counts = measurement.shapeCounts || {};
    var parts = BLOCK_SHAPES.filter(function (shape) { return counts[shape.id] > 0; }).map(function (shape) {
      var n = counts[shape.id], name = shape.name.toLowerCase();
      return n + ' ' + (n === 1 ? name : (/half$/.test(name) ? name.replace(/half$/, 'halves') : name + 's'));
    });
    var units = measurement.totalVolume;
    var mm3 = Math.round(units * Math.pow(unitMm, 3) * 100) / 100;
    return 'Prints solid at ' + (measurement.formattedVolume || units) + ' cubic unit' + (units === 1 ? '' : 's')
      + ' = ' + mm3.toLocaleString('en-US') + ' mm\u00B3 at ' + unitMm + ' mm per block'
      + (parts.length ? ' (' + parts.join(', ') + ')' : '') + '.';
  }
  function defaultPrintEnvelope(measurement, profile, unitMm) {
    unitMm = printUnit(unitMm);
    if (!measurement || ![measurement.L, measurement.W, measurement.H].every(function (value) { return typeof value === 'number' && isFinite(value) && value > 0; })) return null;
    function millimetres(blocks) { return Math.round(blocks * unitMm * 100) / 100; }
    var bed = builderBedLimits(profile);
    var envelope = {
      widthMm: millimetres(measurement.L),
      depthMm: millimetres(measurement.W),
      heightMm: millimetres(measurement.H)
    };
    envelope.label = envelope.widthMm + ' × ' + envelope.depthMm + ' × ' + envelope.heightMm + ' mm';
    envelope.profileLabel = bed.width + ' × ' + bed.depth + ' × ' + bed.height + ' mm';
    envelope.usingSavedProfile = !!(profile && (profile.bedWidthMm || profile.bedDepthMm || profile.bedHeightMm));
    envelope.over = [];
    if (envelope.widthMm > bed.width) envelope.over.push('width');
    if (envelope.depthMm > bed.depth) envelope.over.push('depth');
    if (envelope.heightMm > bed.height) envelope.over.push('height');
    envelope.fits = envelope.over.length === 0;
    return envelope;
  }

  function keyFor(pos) { return pos.x + ',' + pos.y + ',' + pos.z; }
  function measurementLayerFor(data) {
    if (data && data._measurementLayer) return data._measurementLayer;
    return data && data._lessonBlock ? 'lesson' : 'student';
  }
  function isStudentBlock(data) {
    return !!data && !data._lessonBlock && data.blockType !== 'grass' && measurementLayerFor(data) === 'student';
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
    // Placement pop is a display effect, never a change in printable dimensions.
    if (mesh.userData && mesh.userData._popT != null && mesh.scale) {
      elements = Array.prototype.slice.call(elements);
      ['x','y','z'].forEach(function(axis,column){var scale=mesh.scale[axis];if(scale && isFinite(scale)){for(var row=0;row<4;row++)elements[column*4+row]/=scale;}});
    }
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
  // Join the actual boundary polygons of adjacent blocks.
  function axisPlane(triangle) {
    var n = triangle.n, axis = -1;
    for (var k = 0; k < 3; k++) if (Math.abs(n[k]) >= 0.99) axis = k;
    if (axis < 0) return null;
    var coordinate = triangle.v[0][axis];
    for (var i = 1; i < 3; i++) if (Math.abs(triangle.v[i][axis] - coordinate) > 0.000001) return null;
    var cell = Math.round(coordinate);
    if (Math.abs(cell - coordinate) > 0.000001) return null;   // not on a cell boundary
    return { axis: axis, sign: n[axis] > 0 ? 1 : -1, coordinate: cell };
  }
  function triangleArea(triangle) {
    var a = triangle.v[0], b = triangle.v[1], c = triangle.v[2];
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    return Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }
  function faceSignature(list) {
    var points = {}, area = 0;
    list.forEach(function (triangle) {
      area += triangleArea(triangle);
      triangle.v.forEach(function (vertex) { points[vertex.map(function (value) { return value.toFixed(4); }).join(',')] = true; });
    });
    return Object.keys(points).sort().join(';') + '#' + area.toFixed(4);
  }
  // Cells never overlap in volume. Only polygons on their common boundary need
  // subtraction; general scene booleans or voxel remeshing would lose shape fidelity.
  function clipFace(poly, a, b, axis, orientation, inside) {
    var axes = [0,1,2].filter(function(k){return k !== axis;});
    function distance(p) { return orientation * ((b[axes[0]]-a[axes[0]])*(p[axes[1]]-a[axes[1]])-(b[axes[1]]-a[axes[1]])*(p[axes[0]]-a[axes[0]])); }
    var out = [];
    for (var i=0;i<poly.length;i++) {
      var p=poly[i], q=poly[(i+1)%poly.length], dp=distance(p), dq=distance(q);
      var pin=inside ? dp>=-1e-9 : dp<=1e-9, qin=inside ? dq>=-1e-9 : dq<=1e-9;
      if(pin) out.push(p);
      if(pin!==qin && Math.abs(dp-dq)>1e-12) { var t=dp/(dp-dq); out.push(p.map(function(v,k){return v+(q[k]-v)*t;})); }
    }
    return out.filter(function(p,i){var prev=out[(i+out.length-1)%out.length];return p.some(function(v,k){return Math.abs(v-prev[k])>1e-8;});});
  }
  function polygonArea(poly) {
    var area=0;
    for(var i=1;i+1<poly.length;i++) area+=triangleArea({v:[poly[0],poly[i],poly[i+1]]});
    return area;
  }
  function subtractFace(poly, cutter, axis) {
    var axes=[0,1,2].filter(function(k){return k!==axis;}), a=cutter[0],b=cutter[1],c=cutter[2];
    var orientation=((b[axes[0]]-a[axes[0]])*(c[axes[1]]-a[axes[1]])-(b[axes[1]]-a[axes[1]])*(c[axes[0]]-a[axes[0]]))>=0 ? 1 : -1;
    var overlap=poly;
    for(var i=0;i<3 && overlap.length;i++) overlap=clipFace(overlap,cutter[i],cutter[(i+1)%3],axis,orientation,true);
    if(polygonArea(overlap)<1e-9) return {polygons:[poly],touching:false};
    var remaining=poly, pieces=[];
    for(var j=0;j<3 && remaining.length;j++) {
      var outside=clipFace(remaining,cutter[j],cutter[(j+1)%3],axis,orientation,false);
      if(polygonArea(outside)>1e-9) pieces.push(outside);
      remaining=clipFace(remaining,cutter[j],cutter[(j+1)%3],axis,orientation,true);
    }
    return {polygons:pieces,touching:true};
  }
  // Partial face subtraction creates vertices halfway along adjoining edges.
  // Split those edges too, otherwise an apparently closed surface has T-junctions.
  function stitchSurface(triangles) {
    var unique={}, buckets={};
    triangles=triangles.map(function(t){return {n:t.n.slice(),v:t.v.map(function(p){
      var v=p.map(function(x){return Math.round(x*1e6)/1e6;}), key=v.join(',');
      if(!unique[key]) {unique[key]=v; var cell=v.map(Math.floor).join(',');(buckets[cell]=buckets[cell]||[]).push(v);}
      return unique[key];
    })};});
    var out=[];
    triangles.forEach(function(t){
      var polygon=[], split=false;
      for(var i=0;i<3;i++) {
        var a=t.v[i], b=t.v[(i+1)%3], delta=b.map(function(v,k){return v-a[k];});
        var length2=delta.reduce(function(n,v){return n+v*v;},0), found=[];
        if(length2<1e-14) continue;
        var lo=a.map(function(v,k){return Math.floor(Math.min(v,b[k])-1e-7);}),hi=a.map(function(v,k){return Math.floor(Math.max(v,b[k])+1e-7);});
        for(var x=lo[0];x<=hi[0];x++)for(var y=lo[1];y<=hi[1];y++)for(var z=lo[2];z<=hi[2];z++) {
          (buckets[x+','+y+','+z]||[]).forEach(function(p){
            var u=p.reduce(function(n,v,k){return n+(v-a[k])*delta[k];},0)/length2;
            if(u<=1e-7 || u>=1-1e-7)return;
            var error=p.reduce(function(n,v,k){return n+Math.pow(v-a[k]-u*delta[k],2);},0);
            if(error<1e-12)found.push({u:u,p:p});
          });
        }
        polygon.push(a);found.sort(function(p,q){return p.u-q.u;});found.forEach(function(p){polygon.push(p.p);});
        if(found.length)split=true;
      }
      if(!split){if(triangleArea(t)>1e-9)out.push(t);return;}
      var center=[0,0,0];polygon.forEach(function(p){p.forEach(function(v,k){center[k]+=v/polygon.length;});});
      for(var j=0;j<polygon.length;j++) {var v=[center,polygon[j],polygon[(j+1)%polygon.length]];var next={n:triangleNormal(v[0],v[1],v[2]),v:v};if(triangleArea(next)>1e-9)out.push(next);}
    });
    return out;
  }
  function unionSurface(blocks, selected) {
    var byKey={}, faces=[], parents=blocks.map(function(_,i){return i;});
    function root(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;}
    blocks.forEach(function(block,index){
      byKey[keyFor(block.position)]=index;var dirs={};
      block.triangles.forEach(function(t){var p=axisPlane(t);if(p)(dirs[p.axis+':'+p.sign]=dirs[p.axis+':'+p.sign]||[]).push(t);});faces.push(dirs);
    });
    var out=[];
    blocks.forEach(function(block,index){
      block.triangles.forEach(function(t){
        var plane=axisPlane(t), pieces=[t.v];
        if(plane){
          var p=Object.assign({},block.position);p[['x','y','z'][plane.axis]]+=plane.sign;
          var key=keyFor(p), neighbor=byKey[key];
          if(selected[key] && neighbor!==undefined){
            (faces[neighbor][plane.axis+':'+(-plane.sign)]||[]).forEach(function(cutter){
              if(axisPlane(cutter).coordinate!==plane.coordinate)return;
              var next=[];
              pieces.forEach(function(poly){var cut=subtractFace(poly,cutter.v,plane.axis);if(cut.touching)parents[root(index)]=root(neighbor);next=next.concat(cut.polygons);});pieces=next;
            });
          }
        }
        pieces.forEach(function(poly){for(var i=1;i+1<poly.length;i++){var v=[poly[0],poly[i],poly[i+1]];if(triangleArea({v:v})>1e-9)out.push({n:t.n.slice(),v:v});}});
      });
    });
    out=stitchSurface(out);
    var groups={};blocks.forEach(function(block,i){var id=root(i);(groups[id]=groups[id]||[]).push(block.position);});
    out.contactGroups=Object.keys(groups).map(function(key){return groups[key];});
    return out;
  }

  // World and editable source stay Y-up; STL uses Z-up, with a proper rotation
  // (not a reflection) so triangle winding and physical volume are preserved.
  function worldToStl(v) { return [v[0], -v[2], v[1]]; }
  function surfaceTopology(triangles) {
    var edges={};triangles.forEach(function(t){for(var i=0;i<3;i++){var a=t.v[i].map(function(v){return Math.round(v*1e5);}).join(','),b=t.v[(i+1)%3].map(function(v){return Math.round(v*1e5);}).join(',');var key=a<b?a+'|'+b:b+'|'+a;edges[key]=(edges[key]||0)+1;}});
    var open=0,nonManifold=0;Object.keys(edges).forEach(function(key){if(edges[key]===1)open++;else if(edges[key]>2)nonManifold++;});
    return {openEdges:open,nonManifoldEdges:nonManifold};
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
      var values = worldToStl(triangle.n).concat(worldToStl(triangle.v[0]), worldToStl(triangle.v[1]), worldToStl(triangle.v[2]));
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
    var perBlock = [];
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
      perBlock.push({ position: position, triangles: trianglesFromMesh(mesh) });
    });
    triangles = unionSurface(perBlock, selected);
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
      topology:surfaceTopology(triangles),
      contactGroups: triangles.contactGroups || [],
      connectedComponents: (triangles.contactGroups || []).length,
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
    try { document.body.appendChild(link); link.click(); }
    finally {
      if (link.parentNode) link.parentNode.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
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
  // A portable creation contains the fresh retained selection, including any
  // disconnected parts the student kept selected. Centering changes the file
  // coordinates only; the live world, materials and rotations stay untouched.
  function selectedEditableWorld(engine) {
    if (!engine) return { ok:false, error:'Open the 3D world before saving a creation.' };
    if (engine._showcaseExporting) return { ok:false, error:'Wait for the Showcase image to finish saving.' };
    var selected = selectionMeasurement(engine);
    if (!selected || !selected.measurement || !Array.isArray(selected.measurement.blocks) || !selected.measurement.blocks.length) return { ok:false, error:'Select a creation before saving an editable file.' };
    var blocks = [], minX=Infinity, maxX=-Infinity, minY=Infinity, minZ=Infinity, maxZ=-Infinity;
    for (var i=0; i<selected.measurement.blocks.length; i++) {
      var mesh=engine.blocks[keyFor(selected.measurement.blocks[i])], p=gridPosition(mesh), data=mesh && mesh.userData;
      if (!p || !isStudentBlock(data)) return { ok:false, error:'The selected creation changed. Select it again before saving.' };
      blocks.push({x:p.x,y:p.y,z:p.z,type:data.blockType || 'stone',shape:data.shape || 'cube',rotation:data.rotation == null ? 0 : data.rotation});
      minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
    }
    var offsetX=-Math.floor((minX+maxX)/2), offsetZ=-Math.floor((minZ+maxZ)/2), offsetY=1-minY;
    blocks.forEach(function(block){block.x+=offsetX;block.y+=offsetY;block.z+=offsetZ;});
    return normalizeEditableWorld({schema:EDITABLE_WORLD_SCHEMA,title:'Geometry World selected creation',coordinateSystem:'x-right,y-up,z-depth',blocks:blocks});
  }
  function saveSelectedEditableWorld(ctx) {
    var checked;
    try {
      checked=selectedEditableWorld(window[ENGINE_KEY]);
      if (!checked.ok) { announce(ctx,checked.error,'error');return false; }
      downloadBlob(new Blob([JSON.stringify(checked.value,null,2)],{type:'application/json'}),'geometry-world-selected-creation-editable.json');
    } catch (error) { announce(ctx,error && error.message ? error.message : 'The editable creation could not be saved.','error');return false; }
    announce(ctx,'Saved '+checked.summary.blockCount+' selected block'+(checked.summary.blockCount===1?'':'s')+' as an editable AlloFlow creation, centered above the sandbox floor.','success');
    return true;
  }
  function saveEditableWorld(ctx) {
    var engine = window[ENGINE_KEY];
    if (!engine) { announce(ctx, 'Open the 3D world before saving.', 'info'); return; }
    var checked = normalizeEditableWorld(editableWorld(engine));
    if (!checked.ok) { announce(ctx, checked.error, 'error'); return; }
    downloadBlob(new Blob([JSON.stringify(checked.value, null, 2)], { type: 'application/json' }), safeFilePart((engine._currentLesson && engine._currentLesson.title) || 'geometry-world') + '-editable.json');
    announce(ctx, 'Saved ' + checked.summary.blockCount + ' editable student block' + (checked.summary.blockCount === 1 ? '' : 's') + ' with shapes and rotations.', 'success');
  }
  var WORKSHOP_TOOLS=[
    {id:'palette',title:'Shapes & materials',group:'Build',description:'Choose a block, its material, and rotation.',keywords:'cube slab wedge quarter stone wood brick glass color colour paint hotbar Q R',selector:'.gwe-current-tools'},
    {id:'draw',title:'Lines, floors & walls',group:'Build',description:'Place many blocks with a single drawing gesture.',keywords:'fast draw room wall height floor line',selector:'.gwe-drawing-tools'},
    {id:'starters',title:'Architectural starters',group:'Build',description:'Customize an arch, bridge, roof, pavilion, or other starter.',keywords:'kit staircase stairs bench garden building library house',selector:'.gwe-starter-library'},
    {id:'select',title:'Select blocks & camera',group:'Edit',description:'Select individual blocks, drag a selection, or orbit the camera.',keywords:'cursor mouse touch rectangle marquee orbit pan zoom move handles',selector:'.gwe-direct-controls'},
    {id:'transform',title:'Move, copy & reshape',group:'Edit',description:'Move, repeat, align, or reshape a selected creation with a preview.',keywords:'repeat pattern array align alignment grid spacing duplicate rotate mirror recolor recolour material offset position',selector:'.gwe-creation-editor',selection:true},
    {id:'stamps',title:'Reusable building stamps',group:'Build',description:'Save a reusable part or place one from your collection.',keywords:'recipe window arch reusable library saved pattern',selector:'.gwe-stamp-library'},
    {id:'showcase',title:'Views & showcase',group:'Share',description:'Frame your selection or create a presentation image.',keywords:'camera photo picture screenshot png beautiful front side top',selector:'[aria-label="Inspect selected creation"]',selection:true},
    {id:'print',title:'Inspect & prepare a print',group:'Print',description:'Check separate pieces, printer fit, and connecting bases.',keywords:'3d printing stl print lab oversized support plate thickness margin',selector:'.gwe-print-guide-options',selection:true},
    {id:'scale',title:'Adjust print size',group:'Print',description:'Set millimeters per block for STL and Print Lab.',keywords:'scale bed dimensions width height depth size mm printer',selector:'.gwe-scale-editor',selection:true},
    {id:'save',title:'Save, open & duplicate projects',group:'Keep',description:'Name your project, save a variation, or open an editable file.',keywords:'json export import backup download autosave worlds copy recover',selector:'[aria-label="Keep your work"]'},
    {id:'workspace',title:'Workspace & scenery',group:'Explore',description:'Choose the garden or meadow, or start another world.',keywords:'environment lesson fresh sandbox landscape settings',selector:'.gwe-workspace-options'}
  ];
  function findWorkshopTools(query,hasSelection) {
    var words=String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    return WORKSHOP_TOOLS.map(function(tool,index){var title=tool.title.toLowerCase(),text=(tool.title+' '+tool.description+' '+tool.keywords+' '+tool.group).toLowerCase();return {tool:tool,index:index,matches:words.every(function(word){return text.indexOf(word)!==-1;}),score:words.reduce(function(score,word){return score+(title.indexOf(word)===0?6:title.indexOf(word)!==-1?3:0);},0)};}).filter(function(entry){return entry.matches;}).sort(function(a,b){return b.score-a.score || a.index-b.index;}).map(function(entry){var tool=entry.tool;return Object.assign({},tool,{available:!tool.selection || !!hasSelection});});
  }
  function previewChangeFacts(plan) {
    var additions=plan && plan.additions,blocks=plan && (plan.frameBlocks || plan.additions);if(!Array.isArray(additions) || !additions.length || additions.length>MAX_BLOCKS || !Array.isArray(blocks) || !blocks.length || blocks.length>MAX_BLOCKS)return null;
    var min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
    for(var i=0;i<blocks.length;i++){var b=blocks[i];if(!b || !['x','y','z'].every(function(axis){return Number.isInteger(b[axis]) && Math.abs(b[axis])<=128;}))return null;['x','y','z'].forEach(function(axis){min[axis]=Math.min(min[axis],b[axis]);max[axis]=Math.max(max[axis],b[axis]+1);});}
    return {count:additions.length,net:additions.length-(Array.isArray(plan.removals)?plan.removals.length:0),width:max.x-min.x,depth:max.z-min.z,height:max.y-min.y,min:min,max:max};
  }
  function suspendPreviewScenery(engine) {
    var scenery=engine && engine._landscape;if(!scenery)return function(){};
    var visible=scenery.visible;scenery.visible=false;
    return function(){
      scenery.visible=visible;
      var current=engine._landscape;if(current){
        var studio=engine._showcase && engine._showcase.studio;
        if(studio){(studio.hidden || []).forEach(function(entry){if(entry[0]===current)entry[1]=visible;});current.visible=false;}
        else current.visible=visible;
      }
    };
  }
  function frameBuildPreview(ctx,plan,owner) {
    var engine=window[ENGINE_KEY],facts=previewChangeFacts(plan),overlay=engine && engine._buildBatchPreview;
    if(!facts || !engine || engine._destroyed || engine._showcase || plan.engine!==engine || plan.lesson!==engine._currentLesson || !engine._currentLesson.sandbox || !engine.camera || !engine.setViewPreset)return {ok:false,reason:'Create a current Free Build preview first.'};
    if(!overlay || overlay.owner!==owner)return {ok:false,reason:'This outline was replaced. Create the preview again before reviewing it.'};
    var camera=engine.camera,vertical=(camera.fov || 60)*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*Math.max(.1,camera.aspect || 1));
    var sphere=Math.max(.8,Math.sqrt(facts.width*facts.width+facts.depth*facts.depth+facts.height*facts.height)/2),radius=sphere/Math.sin(Math.min(vertical,horizontal))*.78;
    engine.setViewPreset(facts.width>=facts.depth?'side':'front',{x:(facts.min.x+facts.max.x)/2,y:(facts.min.y+facts.max.y)/2,z:(facts.min.z+facts.max.z)/2,radius:radius});
    patchGeometryState(ctx,{sandboxDockCollapsed:true,hudPanel:'',builderPrintFocus:null,builderPrintGuide:false});
    return {ok:true,facts:facts};
  }
  function capturePreviewCamera(engine) {
    var camera=engine && engine.camera;if(!camera || !camera.position || !camera.quaternion)return null;
    return {engine:engine,lesson:engine._currentLesson,camera:camera,position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),fov:camera.fov,far:camera.far,preset:engine._viewPreset || 'free',presetReturn:engine._viewPresetReturn,lighting:engine._viewPresetLighting,fog:engine.scene && engine.scene.fog,fogNear:engine.scene && engine.scene.fog && engine.scene.fog.near,fogFar:engine.scene && engine.scene.fog && engine.scene.fog.far};
  }
  // Review owns camera gestures, not blocks. Fit to the space left by its card,
  // and release every listener/capture before giving input back to the world.
  function installPreviewCamera(engine,plan,owner,origin,onViewChange) {
    var THREE=window.THREE,canvas=engine && engine.renderer && engine.renderer.domElement,camera=engine && engine.camera,facts=previewChangeFacts(plan);
    if(!THREE || !canvas || !camera || !camera.isPerspectiveCamera || !facts || !origin || origin.engine!==engine || origin.camera!==camera || origin.lesson!==engine._currentLesson || plan.engine!==engine || plan.lesson!==engine._currentLesson || !engine._buildBatchPreview || engine._buildBatchPreview.owner!==owner)return null;
    if(engine._previewReviewCamera)engine._previewReviewCamera.dispose(false);
    var box=new THREE.Box3(new THREE.Vector3(facts.min.x,facts.min.y,facts.min.z),new THREE.Vector3(facts.max.x,facts.max.y,facts.max.z)),center=box.getCenter(new THREE.Vector3());
    var oldTouch=canvas.style.touchAction,oldCursor=canvas.style.cursor,pointers=new Map(),disposed=false,frame=0,observer=null,view={azimuth:facts.width>=facts.depth?0:Math.PI/2,elevation:.24,zoom:1.05},name=facts.width>=facts.depth?'side':'front';
    function active(){return !disposed && !engine._destroyed && !engine._showcase && engine._currentLesson===origin.lesson && engine._previewReviewCamera===controller && engine._buildBatchPreview && engine._buildBatchPreview.owner===owner;}
    function stop(event){event.preventDefault();event.stopImmediatePropagation();}
    function publish(next){name=next;if(onViewChange)onViewChange(next);}
    function fit(){
      frame=0;if(!active()){controller.dispose(false);return false;}
      var area=canvas.getBoundingClientRect();if(!area.width || !area.height)return false;
      camera.aspect=area.width/area.height;camera.updateProjectionMatrix();
      var ground=engine._currentLesson.ground,groundY=ground && Number.isFinite(ground.y)?ground.y:0;
      var result=fitCreationCamera(box,camera,creationFocusRect(engine),groundY+.2,{azimuth:view.azimuth,elevation:view.elevation});if(!result)return false;
      // Scale the screen-space offset with zoom so the model stays in the clear area.
      var distance=result.position.distanceTo(result.target),target=center.clone().add(result.target.clone().sub(center).multiplyScalar(view.zoom));
      var offset=result.position.clone().sub(result.target).multiplyScalar(view.zoom),depthFar=result.depthFar+distance*(view.zoom-1);
      camera.position.copy(target).add(offset);camera.up.set(0,1,0);camera.lookAt(target);
      // Derive clipping from the current model, never multiply the previous far plane.
      camera.far=Math.max(origin.far,depthFar+Math.max(10,box.min.distanceTo(box.max)*.05));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
      if(engine.scene.fog===origin.fog && origin.fog){origin.fog.near=Math.max(origin.fogNear,depthFar+2);origin.fog.far=Math.max(origin.fogFar,origin.fog.near+80);}
      return true;
    }
    function schedule(){if(!disposed && !frame)frame=window.requestAnimationFrame(fit);}
    function clearPointers(){pointers.forEach(function(_,id){if(canvas.hasPointerCapture && canvas.hasPointerCapture(id))try{canvas.releasePointerCapture(id);}catch(_){}});pointers.clear();canvas.style.cursor='grab';}
    function down(event){if(!active() || (event.button!==0 && event.button!==2))return;stop(event);if(pointers.size>=2)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(canvas.setPointerCapture)try{canvas.setPointerCapture(event.pointerId);}catch(_){}canvas.style.cursor='grabbing';}
    function move(event){if(!active() || !pointers.has(event.pointerId))return;stop(event);var previous=pointers.get(event.pointerId),dx=event.clientX-previous.x,dy=event.clientY-previous.y;
      if(pointers.size===2){var other; pointers.forEach(function(p,id){if(id!==event.pointerId)other=p;});var before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(event.clientX-other.x,event.clientY-other.y);if(before>8 && after>8)view.zoom=Math.max(.65,Math.min(3,view.zoom*before/after));}
      else{view.azimuth-=dx*.008;view.elevation=Math.max(.10,Math.min(Math.PI/2-.04,view.elevation+dy*.006));publish('orbit');}
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});schedule();
    }
    function up(event){if(!pointers.has(event.pointerId))return;stop(event);pointers.delete(event.pointerId);if(canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId))try{canvas.releasePointerCapture(event.pointerId);}catch(_){}if(!pointers.size)canvas.style.cursor='grab';}
    function wheel(event){if(!active())return;stop(event);controller.zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.002));}
    function block(event){if(active())stop(event);}
    var handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,mousedown:block,click:block,dblclick:block,contextmenu:block,wheel:wheel,touchstart:block,touchmove:block,touchend:block,touchcancel:block};
    var controller={focus:center,view:function(next){
      if(!active())return false;var presets={front:[Math.PI/2,.15],side:[0,.15],top:[0,Math.PI/2-.04],perspective:[Math.PI/4,.42]};if(!presets[next])return false;clearPointers();view.azimuth=presets[next][0];view.elevation=presets[next][1];view.zoom=1.05;publish(next);schedule();return true;
    },zoom:function(factor){if(!active() || !Number.isFinite(factor) || factor<=0)return false;view.zoom=Math.max(.65,Math.min(3,view.zoom*factor));schedule();return true;},fit:function(){if(!active())return false;view.zoom=1.05;schedule();return true;},scheduleFit:schedule,dispose:function(restore){
      if(disposed)return;disposed=true;if(frame)window.cancelAnimationFrame(frame);frame=0;if(observer)observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('blur',clearPointers);document.removeEventListener('visibilitychange',clearPointers);
      Object.keys(handlers).forEach(function(key){canvas.removeEventListener(key,handlers[key],true);});clearPointers();canvas.style.touchAction=oldTouch;canvas.style.cursor=oldCursor;
      if(engine._previewReviewCamera!==controller)return;delete engine._previewReviewCamera;
      if(restore!==false && !engine._destroyed && !engine._showcase && !engine._guidedTour && engine._currentLesson===origin.lesson && engine.camera===origin.camera){
        camera.position.copy(origin.position);camera.quaternion.copy(origin.quaternion);camera.up.copy(origin.up);camera.fov=origin.fov;camera.far=origin.far;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
        engine._viewPreset=origin.preset;engine._viewPresetReturn=origin.presetReturn;engine._viewPresetLighting=origin.lighting;if(engine._setViewPreset)engine._setViewPreset(origin.preset);
        if(engine.scene.fog===origin.fog && origin.fog){origin.fog.near=origin.fogNear;origin.fog.far=origin.fogFar;}
      }
      if(engine.releaseInput)engine.releaseInput();
    }};
    engine._previewReviewCamera=controller;engine._viewPresetAnim=null;engine._entryAnim=null;if(engine.releaseInput)engine.releaseInput();if(engine.velocity)engine.velocity.set(0,0,0);
    canvas.style.touchAction='none';canvas.style.cursor='grab';Object.keys(handlers).forEach(function(key){canvas.addEventListener(key,handlers[key],{capture:true,passive:false});});
    window.addEventListener('resize',schedule);window.addEventListener('blur',clearPointers);document.addEventListener('visibilitychange',clearPointers);
    if(typeof ResizeObserver==='function'){observer=new ResizeObserver(schedule);observer.observe(canvas);var root=canvas.closest('#geoworld-fs-workspace'),card=root && root.querySelector('.gwe-preview-review');if(card)observer.observe(card);}
    publish(name);schedule();return controller;
  }
  function firstBlockGuidance(touchActive) {
    return 'Aim at the ground and ' + (touchActive ? 'tap Place' : 'press B') + ' to add your first block.';
  }
  function startSandboxMode(ctx, options) {
    var engine = window[ENGINE_KEY];
    if (!engine || typeof engine.loadLesson !== 'function') { announce(ctx, 'The 3D world is still getting ready. Try Free Build again in a moment.', 'info'); return false; }
    engine.loadLesson(FREE_BUILD_LESSON);
    engine._builderSelection = null;
    patchGeometryState(ctx, {
      builderPrintContext:null, builderPrintCheck:null, builderPanel:'build',
      sandboxDockCollapsed:typeof window.matchMedia === 'function' && window.matchMedia('(max-width:800px)').matches,
      activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false,
      showGeometryHome:false,_geometryHomeInitial:false,showSandboxLauncher: false, creatorMode: false, tutorialDismissed: true,
      hudPreset: 'builder', hudPanel: 'inventory', objectivesOpen: false,
      showGameSettings: false, showPredictionPanel: false, measureResult: null,
      measureHistory: [], score: 0, totalQ: 0, answeredNpcs: {}
    });
    if (engine.logEvent) engine.logEvent('sandbox_open', { source: 'geometry_world_builder' });
    var workspace = typeof document !== 'undefined' && document.getElementById('geoworld-fs-workspace');
    announce(ctx, 'Free Build Sandbox opened. ' + firstBlockGuidance(!!(workspace && workspace.getAttribute('data-touch-active') === 'true')), 'success');
    if(!options || options.focus!==false)focusWorldSurface(50);
    return true;
  }
  // Keep the entire workspace before the confirmed replacement. A lesson's
  // definitions do not describe every live block, so record the actual roles too.
  function captureEditableImportRecovery(ctx, engine) {
    var saved = captureProject(ctx || {}, engine, 'editable-import-recovery');
    saved.state = copyLocal(ctx && ctx.toolData && ctx.toolData.geometryWorld || {});
    saved.blocks = Object.keys(engine.blocks || {}).map(function(key) {
      var mesh=engine.blocks[key], p=gridPosition(mesh), u=mesh && mesh.userData;
      if (!p || !u) throw new Error('The current workspace could not be backed up.');
      return Object.assign({},p,{type:u.blockType,shape:u.shape || 'cube',rotation:u.rotation || 0,
        lessonBlock:!!u._lessonBlock,measurementLayer:u._measurementLayer});
    });
    saved.engineState = {};
    ['completionTriggered','completionProgress','_predictionState','_progressKey','_historyRevision',
      '_placingLessonBlocks','_measurementLayer','_replayingHistory','_entryAnim','_viewPreset',
      '_fillTruncated','_playerBlockCount'].forEach(function(key) {
      saved.engineState[key] = {present:Object.prototype.hasOwnProperty.call(engine,key),
        value:engine[key] === undefined ? undefined : copyLocal(engine[key])};
    });
    saved.cameraProjection = engine.camera ? {fov:engine.camera.fov,near:engine.camera.near,far:engine.camera.far,
      zoom:engine.camera.zoom,up:engine.camera.up && engine.camera.up.toArray()} : null;
    saved.velocity = engine.velocity && engine.velocity.toArray ? engine.velocity.toArray() : null;
    saved.sessionLog = Array.isArray(engine.sessionLog) ? copyLocal(engine.sessionLog) : null;
    var editable = normalizeEditableWorld(editableWorld(engine));
    saved.editableWorld = editable.ok && editableWorldByteLength(JSON.stringify(editable.value)) <= MAX_EDITABLE_WORLD_BYTES ? editable.value : null;
    saved.schema = 'alloflow-geometry-world-recovery/1';
    return saved;
  }
  function restoredBlockMatches(engine, block, studentOnly) {
    var mesh=engine.blocks && engine.blocks[keyFor(block)], u=mesh && mesh.userData, p=gridPosition(mesh);
    return !!(p && u && p.x===block.x && p.y===block.y && p.z===block.z &&
      u.blockType===block.type && (u.shape || 'cube')===block.shape && (u.rotation || 0)===block.rotation &&
      (studentOnly ? isStudentBlock(u) : !!u._lessonBlock===block.lessonBlock && u._measurementLayer===block.measurementLayer));
  }
  function restoreEditableImportRecovery(ctx, engine, saved) {
    // Rebuild the actual saved cells instead of recreating lesson fills and then
    // colliding with them. loadLesson still owns NPC/environment lifecycle.
    engine.loadLesson(Object.assign({},saved.lesson,{ground:null,structures:[]}));
    if (Object.keys(engine.blocks || {}).length) throw new Error('The recovery workspace was not empty.');
    engine._currentLesson = saved.lesson;
    engine._replayingHistory = true;
    try { saved.blocks.forEach(function(block) {
      engine._placingLessonBlocks=block.lessonBlock;
      engine._measurementLayer=block.measurementLayer;
      var placed=engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation);
      var mesh=engine.blocks && engine.blocks[keyFor(block)];
      if (placed===null || !mesh || !mesh.userData) throw new Error('A previous block could not be recovered.');
      // Older workspace blocks may predate explicit measurement-layer tagging.
      if (block.measurementLayer===undefined) delete mesh.userData._measurementLayer;
      if (!restoredBlockMatches(engine,block,false)) throw new Error('A previous block was not recovered exactly.');
    }); } finally {
      ['_placingLessonBlocks','_measurementLayer','_replayingHistory'].forEach(function(key) {
        var field=saved.engineState[key];
        if (field.present) engine[key]=field.value; else delete engine[key];
      });
    }
    if (Object.keys(engine.blocks).length!==saved.blocks.length) throw new Error('The recovered block count did not match.');
    if (engine.refreshAllAO) engine.refreshAllAO();
    if (engine.refreshLandscape) engine.refreshLandscape(saved.lesson.ground);
    engine._undoStack=copyLocal(saved.undo); engine._redoStack=copyLocal(saved.redo);
    engine.blocksPlaced=saved.blocksPlaced; engine._sessionXP=saved.sessionXP; engine._blockMilestones=copyLocal(saved.milestones);
    engine._builderSelection=copyLocal(saved.selection || null);
    restoreWorkshopDraftIdentity(engine,saved.workshopDraft);
    Object.keys(saved.engineState).forEach(function(key) {
      var field=saved.engineState[key];
      if (field.present) engine[key]=field.value===undefined ? undefined : copyLocal(field.value); else delete engine[key];
    });
    if (saved.cameraProjection && engine.camera) {
      ['fov','near','far','zoom'].forEach(function(key){engine.camera[key]=saved.cameraProjection[key];});
      if (saved.cameraProjection.up && engine.camera.up) engine.camera.up.fromArray(saved.cameraProjection.up);
      if (engine.camera.updateProjectionMatrix) engine.camera.updateProjectionMatrix();
    }
    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);
    if (saved.cameraQuaternion && engine.camera) {
      engine.camera.quaternion.fromArray(saved.cameraQuaternion);
      if(engine.euler) engine.euler.setFromQuaternion(engine.camera.quaternion);
    }
    if (isFinite(saved.yaw)) engine.yaw=saved.yaw;
    if (isFinite(saved.pitch)) engine.pitch=saved.pitch;
    engine.flyMode=saved.flyMode;
    if (saved.velocity && engine.velocity && engine.velocity.fromArray) engine.velocity.fromArray(saved.velocity);
    if (saved.sessionLog && Array.isArray(engine.sessionLog)) {
      engine.sessionLog.length=0;
      saved.sessionLog.forEach(function(event){engine.sessionLog.push(copyLocal(event));});
    }
    // Restore Geometry World state only, including print scale/check and lesson
    // progress. Keys added by loadLesson must not survive an unsuccessful import.
    var state={};
    ['totalQ','score','answeredNpcs','npcFollowUpStep','npcChatHistory','worldActive','blocksPlaced',
      'measureResult','measureHistory','volumePrediction','volumeEstimateCommitment','volumeEstimateObservedTargets',
      'volumeEstimateCommitError','predictionStrategy','predictionReason','predictionResult','predictionRevision',
      'predictionRevisionResult','predictionReflection','viewPreset','layerFocus','placementPreview'].forEach(function(key){state[key]=saved.state[key];});
    patchGeometryState(ctx,Object.assign(state,saved.state));
  }
  function restoreEditableWorld(engine, candidate, ctx) {
    if (!engine || typeof engine.loadLesson !== 'function' || typeof engine.placeBlock !== 'function') return { ok: false, error: 'The Geometry World engine is not ready.' };
    var checked=normalizeEditableWorld(candidate);
    if (!checked.ok) return checked;
    if (engine._showcaseExporting) return {ok:false,error:'Wait for the Showcase image to finish saving.'};
    var saved, presentation=engine._showcase;
    // End Showcase before capturing the building camera. Its event handler may
    // still hold React state from the old overlay until the next render.
    if (presentation) {
      try {
        if (typeof engine.endShowcase!=='function') throw new Error('Showcase cannot return to building yet.');
        engine.endShowcase();
        if (engine._showcase) throw new Error('Showcase did not return to building.');
      } catch (_) { return {ok:false,error:'Return to building before opening an editable world. No blocks were changed.'}; }
      patchGeometryState(ctx,{showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:!!presentation.collapsed});
    }
    try {
      saved=captureEditableImportRecovery(ctx,engine);
      if (presentation) {
        saved.state.showcaseActive=false;saved.state.showcaseSaving=false;
        saved.state.sandboxDockCollapsed=!!presentation.collapsed;
      }
    } catch (_) { return {ok:false,error:'The current workspace could not be backed up. No blocks were changed.'}; }
    var restoringDraft=engine._workshopRestoreInProgress;engine._workshopRestoreInProgress=true;
    try {
      engine.loadLesson(FREE_BUILD_LESSON);
      var available=Math.max(0,MAX_BLOCKS-(engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks || {}).length));
      if (checked.value.blocks.length>available) throw new Error('The sandbox does not have enough safe block capacity for this file.');
      checked.value.blocks.forEach(function(block) {
        var placed=engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation);
        if (placed===null || !restoredBlockMatches(engine,block,true)) throw new Error('Geometry World could not restore every validated block.');
      });
      engine.blocksPlaced=checked.value.blocks.length;
      engine._undoStack=[]; engine._redoStack=[];
      return {ok:true,value:checked.value,summary:checked.summary,placedCount:checked.value.blocks.length};
    } catch (error) {
      var message=error && error.message ? error.message : 'The editable world could not be opened.';
      try {
        restoreEditableImportRecovery(ctx,engine,saved);
        return {ok:false,restored:true,error:message+' Your previous workspace was restored.'};
      } catch (recoveryError) {
        ['_placingLessonBlocks','_measurementLayer','_replayingHistory'].forEach(function(key) {
          var field=saved.engineState[key];
          if (field.present) engine[key]=field.value; else delete engine[key];
        });
        // Keep the earliest complete backup even if another import is attempted.
        if (!engine._editableImportRecovery) engine._editableImportRecovery=saved;
        return {ok:false,restored:false,recovery:engine._editableImportRecovery,
          error:message+' The previous workspace could not be fully restored. Download its backup below before continuing.'};
      }
    } finally {if(restoringDraft===undefined)delete engine._workshopRestoreInProgress;else engine._workshopRestoreInProgress=restoringDraft;}
  }
  // Recipes are rebuilt on the integer grid, so changing size never stretches blocks.
  var STARTER_SPECS = [
    ['arch','Garden arch','Architecture','A stone gateway with a timber lintel and slab cap.',{width:[5,3,11],height:[5,4,12]}],
    ['stairs','Timber stairs','Architecture','Supported steps for a terrace or doorway.',{height:[4,2,10],depth:[3,2,7]}],
    ['window','Framed window','Architecture','A brick surround, glass center, and projecting sill.',{width:[5,3,11],height:[5,3,11]}],
    ['roof','Gabled roof','Architecture','A solid roof with wedge edges. Lower rises create a stepped pitch.',{width:[6,4,12,2],depth:[4,2,12],rise:[3,1,6]}],
    ['bridge','Footbridge','Landscape','A supported span with a solid deck and railings.',{width:[7,5,15],depth:[3,3,7],height:[4,3,8]}],
    ['bench','Garden bench','Landscape','Stone legs, a timber seat, and a comfortable back.',{width:[5,3,11]}],
    ['pavilion','Market pavilion','Buildings','An open shelter with columns, a raised floor, and a slab roof.',{width:[7,4,12],depth:[5,4,12],height:[6,4,12]}],
    ['tower','Lookout tower','Buildings','A hollow lookout with a doorway and crenellated top.',{width:[5,5,11,2],depth:[5,5,11,2],height:[7,5,14]}]
  ];
  function configureArchitecturalStarter(id,options) {
    var spec=STARTER_SPECS.find(function(s){return 'starter_'+s[0]===id;}),o=options||{},v={};
    if(!spec)return {ok:false,reason:'Choose an architectural starter.'};
    var fields=Object.keys(spec[4]),invalid=fields.find(function(k){var f=spec[4][k],n=o[k]===undefined?f[0]:Number(o[k]);v[k]=n;return o[k]==='' || !Number.isInteger(n) || n<f[1] || n>f[2] || (n-f[1])%(f[3]||1)!==0;});
    if(invalid){var range=spec[4][invalid];return {ok:false,reason:'Choose '+invalid+' from '+range[1]+' to '+range[2]+' in steps of '+(range[3]||1)+'.'};}
    var rotation=o.rotation===undefined?0:Number(o.rotation),palette=o.palette||'original';
    if(!Number.isInteger(rotation) || rotation<0 || rotation>3)return {ok:false,reason:'Choose a quarter-turn rotation.'};
    if(['original','timber','stone','brick'].indexOf(palette)===-1)return {ok:false,reason:'Choose a starter material palette.'};
    if(spec[0]==='roof' && v.rise>v.width/2)return {ok:false,reason:'Roof rise can be at most half the roof width.'};
    var cells=Object.create(null),w=v.width,h=v.height,d=v.depth;
    function p(x,y,z,type,shape,turn){type=type||'stone';if(palette!=='original' && type!=='glass')type=palette==='timber'?'wood':palette;cells[x+','+y+','+z]={x:x,y:y,z:z,type:type,shape:shape||'cube',rotation:turn||0};}
    switch(spec[0]){
      case 'arch':for(var y=1;y<=h-2;y++){p(0,y,0);p(w-1,y,0);}for(var x=0;x<w;x++){p(x,h-1,0,'wood');p(x,h,0,'stone','halfB');}break;
      case 'stairs':for(var x=0;x<h;x++)for(var z=0;z<d;z++)for(var y=1;y<=x+1;y++)p(x,y,z,'wood');break;
      case 'window':for(var x=0;x<w;x++)for(var y=1;y<=h;y++)p(x,y,0,x===0||x===w-1||y===1||y===h?'brick':'glass');for(var x=0;x<w;x++)p(x,1,1,'stone','halfB');break;
      case 'roof':for(var z=0;z<d;z++)for(var x=0;x<w;x++){var height=Math.floor(Math.min(x,w-1-x)*v.rise/(w/2))+(v.rise<w/2?1:0);for(var y=1;y<=height;y++)p(x,y,z,'wood');var column=Math.min(x,w-1-x),riser=column===0 || Math.floor(column*v.rise/(w/2))>Math.floor((column-1)*v.rise/(w/2));p(x,height+1,z,'wood',riser?'halfA':'cube',x<w/2?0:2);}break;
      case 'bridge':for(var x=0;x<w;x++)for(var z=0;z<d;z++){p(x,h-1,z,'wood');if(x===0||x===w-1)for(var y=1;y<h-1;y++)p(x,y,z);if(z===0||z===d-1)p(x,h,z,'wood');}break;
      case 'bench':for(var x=0;x<w;x++){p(x,2,0,'wood');p(x,2,1,'wood');p(x,3,0,'wood');if(x===0||x===w-1){p(x,1,0);p(x,1,1);}}break;
      case 'pavilion':for(var x=0;x<w;x++)for(var z=0;z<d;z++){p(x,1,z);p(x,h,z,'wood','halfB');if((x===0||x===w-1)&&(z===0||z===d-1))for(var y=2;y<h;y++)p(x,y,z,'wood');}break;
      case 'tower':for(var x=0;x<w;x++)for(var z=0;z<d;z++){p(x,1,z);if(x===0||x===w-1||z===0||z===d-1){for(var y=2;y<h;y++)if(!(z===d-1&&x===Math.floor(w/2)&&y<5+Math.floor((h-7)/3)))p(x,y,z);if((x+z)%2===0)p(x,h,z);}}break;
    }
    var blocks=Object.keys(cells).map(function(k){return cells[k];});
    for(var r=0;r<rotation;r++){var maxX=Math.max.apply(null,blocks.map(function(b){return b.x;}));blocks=blocks.map(function(b){return Object.assign({},b,{x:b.z,z:maxX-b.x,rotation:(b.rotation+1)%4});});}
    var stamp={id:id,name:spec[1],category:spec[2],description:spec[3],fields:spec[4],blocks:blocks.sort(compareBlocks)};
    var checked=normalizeBuildStamp(stamp);if(!checked.ok)return checked;
    return {ok:true,stamp:stamp,settings:Object.assign({},v,{rotation:rotation,palette:palette})};
  }
  function architecturalStarters(){return STARTER_SPECS.map(function(s){return configureArchitecturalStarter('starter_'+s[0]).stamp;});}

  var WORLD_SHELF_KEY='alloflow.geometry-world.projects.v1', WORLD_SHELF_BYTES=1536*1024;
  function readWorldShelf(storage) {
    try {
      var raw=(storage||window.localStorage).getItem(WORLD_SHELF_KEY);
      if(raw==null)return {ok:true,projects:[]};
      if(raw.length>WORLD_SHELF_BYTES || editableWorldByteLength(raw)>WORLD_SHELF_BYTES)throw Error('Project storage exceeds its safe limit.');
      var parsed=JSON.parse(raw),seen=Object.create(null),total=0;
      if(!parsed || parsed.schema!=='alloflow-geometry-projects/1' || !Array.isArray(parsed.projects) || parsed.projects.length>8)throw Error('The project shelf could not be read.');
      var projects=parsed.projects.map(function(p){
        if(!p || typeof p.id!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(p.id) || seen[p.id] || typeof p.version!=='string' || p.version.length>100 || !Number.isFinite(p.savedAt) || !p.world || !Array.isArray(p.world.blocks))throw Error('A saved project is invalid.');
        seen[p.id]=true;
        var checked=p.world.blocks.length?normalizeEditableWorld(p.world):{ok:p.world.schema===EDITABLE_WORLD_SCHEMA,value:{schema:EDITABLE_WORLD_SCHEMA,title:editableTitle(p.world.title),coordinateSystem:'x-right,y-up,z-depth',blocks:[]}};
        if(!checked.ok)throw Error(checked.error || 'A saved project is invalid.');
        total+=checked.value.blocks.length;
        return {id:p.id,version:p.version,savedAt:p.savedAt,world:checked.value,garden:p.garden!==false};
      });
      if(total>10000)throw Error('The project shelf contains too many blocks.');
      return {ok:true,projects:projects.sort(function(a,b){return b.savedAt-a.savedAt;})};
    }catch(error){return {ok:false,projects:[],reason:(error.message||'Browser storage is unavailable.')+' Download editable JSON to keep your work.'};}
  }
  function writeWorldShelf(projects,storage) {
    try {
      var raw=JSON.stringify({schema:'alloflow-geometry-projects/1',projects:projects}),checked=readWorldShelf({getItem:function(){return raw;}});
      if(!checked.ok)return checked;
      (storage||window.localStorage).setItem(WORLD_SHELF_KEY,raw);return checked;
    }catch(_){return {ok:false,reason:'Autosave could not write to this browser. Download editable JSON to keep your work.'};}
  }
  function saveWorldDraft(engine,title,storage) {
    if(!engine || engine._destroyed || !engine._currentLesson || !engine._currentLesson.sandbox)return {ok:false,reason:'Local drafts are available in Free Build.'};
    var shelf=readWorldShelf(storage);if(!shelf.ok)return shelf;
    var world=editableWorld(engine),id=engine._workshopProjectId,previous=shelf.projects.find(function(p){return p.id===id;});
    if(previous && previous.version!==engine._workshopProjectVersion)return {ok:false,reason:'This project changed in another tab. Download your current build, then reopen the saved project.'};
    if(id && !previous)return {ok:false,reason:'This project was removed in another tab. Download your current build before starting another project.'};
    if(!id && !world.blocks.length)return {ok:true,projects:shelf.projects,empty:true};
    world.title=editableTitle(title || (previous && previous.world.title) || 'Untitled build');
    if(world.blocks.length){var checked=normalizeEditableWorld(world);if(!checked.ok)return {ok:false,reason:checked.error+' Download your build before leaving.'};world=checked.value;}
    var signature=JSON.stringify([world,engine._currentLesson.builderGarden!==false]);
    if(previous && signature===engine._workshopSavedSignature)return {ok:true,projects:shelf.projects,project:previous,unchanged:true};
    if(!id && shelf.projects.length>=8)return {ok:false,reason:'My Worlds holds 8 projects. Download and remove a saved project to make room. Your current build is unchanged.'};
    var now=Date.now(),project={id:id||'world_'+now.toString(36)+'_'+Math.random().toString(36).slice(2,9),savedAt:now,version:now.toString(36)+'_'+Math.random().toString(36).slice(2,10),world:world,garden:engine._currentLesson.builderGarden!==false};
    var result=writeWorldShelf(shelf.projects.filter(function(p){return p.id!==project.id;}).concat([project]),storage);
    if(result.ok){engine._workshopProjectId=project.id;engine._workshopProjectVersion=project.version;engine._workshopSavedSignature=signature;result.project=project;}
    return result;
  }
  function newWorldVariation(shelf,world,garden,storage) {
    if(shelf.projects.length>=8)return {ok:false,reason:'My Worlds holds 8 projects. Download and remove a saved project to make room. Your current build is unchanged.'};
    var checked=normalizeEditableWorld(world);if(!checked.ok)return {ok:false,reason:checked.error};
    var names=shelf.projects.map(function(p){return p.world.title.toLowerCase();}),title=checked.value.title,base=title.replace(/ · variation \d+$/i,''),number=2;
    while(names.indexOf(title.toLowerCase())!==-1){var suffix=' · variation '+number++;title=base.slice(0,80-suffix.length)+suffix;}
    checked.value.title=title;
    var now=Date.now(),seed='world_'+now.toString(36)+'_'+Math.random().toString(36).slice(2,9),id=seed,index=2;
    while(shelf.projects.some(function(p){return p.id===id;}))id=seed+'_'+index++;
    var project={id:id,version:now.toString(36)+'_'+Math.random().toString(36).slice(2,10),savedAt:now,world:checked.value,garden:garden!==false};
    var result=writeWorldShelf(shelf.projects.concat([project]),storage);if(result.ok)result.project=project;return result;
  }
  function saveWorldCopy(engine,title,storage) {
    if(!engine || engine._destroyed || !engine._currentLesson || !engine._currentLesson.sandbox)return {ok:false,reason:'Open Free Build to save a variation.'};
    var shelf=readWorldShelf(storage);if(!shelf.ok)return shelf;
    var world=editableWorld(engine),previous=shelf.projects.find(function(p){return p.id===engine._workshopProjectId;});
    if(!world.blocks.length)return {ok:false,reason:'Place a block before saving a new variation.'};
    world.title=editableTitle(title || (previous && previous.world.title) || 'Untitled build');
    // Fork the current geometry without writing over the earlier saved draft.
    // A new identity is also a safe recovery path for a stale tab's unsaved work.
    var result=newWorldVariation(shelf,world,engine._currentLesson.builderGarden,storage);
    if(result.ok){engine._workshopProjectId=result.project.id;engine._workshopProjectVersion=result.project.version;engine._workshopSavedSignature=JSON.stringify([result.project.world,result.project.garden]);}
    return result;
  }
  function duplicateWorldProject(id,storage) {
    var shelf=readWorldShelf(storage);if(!shelf.ok)return shelf;
    var project=shelf.projects.find(function(p){return p.id===id;});
    if(!project)return {ok:false,reason:'This project is no longer saved. Refresh My Worlds to see your current projects.'};
    return newWorldVariation(shelf,project.world,project.garden,storage);
  }
  function removeWorldProject(id,storage) {
    var shelf=readWorldShelf(storage);return shelf.ok?writeWorldShelf(shelf.projects.filter(function(p){return p.id!==id;}),storage):shelf;
  }
  function installWorldAutosave(engine,onSave,storage) {
    var lastPoll=0;
    function save(){if(engine._workshopRestoreInProgress)return {ok:true,skipped:true};if(engine._currentLesson && engine._currentLesson.sandbox){var result=saveWorldDraft(engine,null,storage);if(onSave)onSave(result);return result;}return {ok:true};}
    function poll(){var now=Date.now();if(now-lastPoll>=2500){lastPoll=now;save();}}
    engine.flushWorkshopDraft=save;engine.pollWorkshopDraft=poll;
    function hidden(){if(document.visibilityState==='hidden')save();}
    window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',hidden);
    return function(){if(!engine._destroyed)save();if(engine.flushWorkshopDraft===save)delete engine.flushWorkshopDraft;if(engine.pollWorkshopDraft===poll)delete engine.pollWorkshopDraft;window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',hidden);};
  }

  function updateWorkshopSelection(engine,cells,operation) {
    if(!engine || engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox)return {ok:false,reason:'Open Free Build to edit a selection.'};
    var selected=Object.create(null);
    if(operation==='add' || operation==='remove')(engine._builderSelection && engine._builderSelection.blocks || []).forEach(function(p){if(engine.blocks[keyFor(p)] && isStudentBlock(engine.blocks[keyFor(p)].userData))selected[keyFor(p)]=p;});
    (cells||[]).forEach(function(p){var mesh=p && engine.blocks[keyFor(p)];if(!mesh || !isStudentBlock(mesh.userData))return;if(operation==='remove')delete selected[keyFor(p)];else selected[keyFor(p)]={x:p.x,y:p.y,z:p.z};});
    var blocks=Object.keys(selected).map(function(k){return selected[k];});
    if(blocks.length>MAX_BLOCKS)return {ok:false,reason:'Select at most '+MAX_BLOCKS+' blocks.'};
    engine._builderSelection=blocks.length?{blocks:blocks,exact:true}:null;
    return {ok:true,count:blocks.length};
  }
  function workshopScreenSelection(engine,rect,viewport,depth) {
    var THREE=window.THREE;if(!THREE || !engine || !engine.camera || !viewport.width || !viewport.height)return [];
    engine.camera.updateMatrixWorld(true);
    var ray=depth==='visible'?new THREE.Raycaster():null,targets=ray?(engine.getRaycastTargets?engine.getRaycastTargets():Object.values(engine.blocks)):null;
    if(ray && engine.scene)engine.scene.updateMatrixWorld(true);
    function visible(mesh){if(!ray)return true;mesh.geometry.computeBoundingBox();var center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),ndc=center.project(engine.camera);ray.setFromCamera(new THREE.Vector2(ndc.x,ndc.y),engine.camera);var hits=ray.intersectObjects(targets);return !!hits.length && hits[0].object===mesh;}
    return Object.keys(engine.blocks||{}).filter(function(k){var m=engine.blocks[k];if(!isStudentBlock(m.userData) || m.visible===false)return false;var p=m.userData.gridPos,q=new THREE.Vector3(p.x+.5,p.y+.5,p.z+.5).project(engine.camera),x=viewport.left+(q.x+1)*viewport.width/2,y=viewport.top+(1-q.y)*viewport.height/2;return q.z>=-1 && q.z<=1 && x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom && visible(m);}).map(function(k){var p=engine.blocks[k].userData.gridPos;return {x:p.x,y:p.y,z:p.z};});
  }
  function installWorkshopPointer(engine,canvas,mode,operation,onSelection,onExit,depth) {
    var THREE=window.THREE;if(!THREE || !canvas || !engine.camera)return function(){};
    var start=null,marquee=null,oldTouch=canvas.style.touchAction,oldCursor=canvas.style.cursor;
    var target=new THREE.Vector3(0,2,0),records=selectionEditSnapshot(engine);
    if(records.ok){var box=new THREE.Box3();records.blocks.forEach(function(b){box.expandByPoint(new THREE.Vector3(b.x+.5,b.y+.5,b.z+.5));});box.getCenter(target);}
    engine.releaseInput && engine.releaseInput();try{if(document.pointerLockElement)document.exitPointerLock();}catch(_){}
    engine._entryAnim=null;engine._viewPresetAnim=null;if(engine._creationFocus){engine._creationFocus.manual=true;engine._creationFocus.transition=null;}engine.flyMode=true;engine.velocity && engine.velocity.set(0,0,0);
    canvas.style.touchAction='none';canvas.style.cursor=mode==='select'?'crosshair':'grab';
    function allowed(){var m=engine._modalState||{};return !engine._destroyed && !engine._showcase && engine._currentLesson && engine._currentLesson.sandbox && !Object.keys(m).some(function(k){return /^show/.test(k)&&m[k];});}
    function stop(e){e.preventDefault();e.stopImmediatePropagation();}
    function clear(){if(marquee){marquee.remove();marquee=null;}if(start && canvas.hasPointerCapture && canvas.hasPointerCapture(start.id))canvas.releasePointerCapture(start.id);start=null;}
    function down(e){if(!allowed() || (e.button!==0 && e.button!==2))return;stop(e);start={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,id:e.pointerId,pan:e.button===2||e.shiftKey};canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);if(mode==='select'){marquee=document.createElement('div');marquee.className='gwe-selection-marquee';document.body.appendChild(marquee);}}
    function look(){engine.camera.lookAt(target);engine.euler && engine.euler.setFromQuaternion(engine.camera.quaternion);engine.camera.updateMatrixWorld(true);}
    function move(e){if(!start || start.id!==e.pointerId)return;stop(e);if(!allowed()){clear();return;}var dx=e.clientX-start.lastX,dy=e.clientY-start.lastY;start.lastX=e.clientX;start.lastY=e.clientY;
      if(mode==='select'){Object.assign(marquee.style,{left:Math.min(start.x,e.clientX)+'px',top:Math.min(start.y,e.clientY)+'px',width:Math.abs(e.clientX-start.x)+'px',height:Math.abs(e.clientY-start.y)+'px'});}
      else if(start.pan){var distance=engine.camera.position.distanceTo(target),scale=distance/Math.max(1,canvas.getBoundingClientRect().height),shift=new THREE.Vector3(-dx*scale,dy*scale,0).applyQuaternion(engine.camera.quaternion);target.add(shift);engine.camera.position.add(shift);look();}
      else{var s=new THREE.Spherical().setFromVector3(engine.camera.position.clone().sub(target));s.theta-=dx*.008;s.phi=Math.max(.12,Math.min(Math.PI*.49,s.phi-dy*.008));engine.camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(s));look();}
    }
    function up(e){if(!start || start.id!==e.pointerId)return;stop(e);if(mode==='select' && allowed()){
      var cells=[],v=canvas.getBoundingClientRect();
      if(Math.hypot(e.clientX-start.x,e.clientY-start.y)<6){var ray=new THREE.Raycaster();ray.far=160;engine.camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2((e.clientX-v.left)/v.width*2-1,1-(e.clientY-v.top)/v.height*2),engine.camera);var hits=ray.intersectObjects(engine.getRaycastTargets?engine.getRaycastTargets():Object.values(engine.blocks));if(hits.length && isStudentBlock(hits[0].object.userData))cells=[hits[0].object.userData.gridPos];}
      else cells=workshopScreenSelection(engine,{left:Math.min(start.x,e.clientX),right:Math.max(start.x,e.clientX),top:Math.min(start.y,e.clientY),bottom:Math.max(start.y,e.clientY)},v,depth);
      onSelection(updateWorkshopSelection(engine,cells,e.altKey?'remove':e.shiftKey?'add':operation));
    }clear();}
    var cameraActions={
      zoom:function(factor){var offset=engine.camera.position.clone().sub(target);offset.setLength(Math.max(2,Math.min(140,offset.length()*factor)));engine.camera.position.copy(target).add(offset);look();},
      pan:function(dx,dy){var shift=new THREE.Vector3(dx,dy,0).applyQuaternion(engine.camera.quaternion);target.add(shift);engine.camera.position.add(shift);look();}
    };
    engine._workshopCameraActions=cameraActions;
    function wheel(e){if(mode!=='orbit' || !allowed())return;stop(e);var offset=engine.camera.position.clone().sub(target),length=offset.length();offset.setLength(Math.max(2,Math.min(140,length*Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.002))));engine.camera.position.copy(target).add(offset);look();}
    function key(e){if(e.code==='Escape'){clear();onExit();}}
    function block(e){if(allowed())stop(e);}
    var handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:clear,mousedown:block,click:block,dblclick:block,contextmenu:block,wheel:wheel,touchstart:block,touchmove:block,touchend:block};
    Object.keys(handlers).forEach(function(k){canvas.addEventListener(k,handlers[k],{capture:true,passive:false});});window.addEventListener('keydown',key,true);
    return function(){clear();Object.keys(handlers).forEach(function(k){canvas.removeEventListener(k,handlers[k],true);});window.removeEventListener('keydown',key,true);canvas.style.touchAction=oldTouch;canvas.style.cursor=oldCursor;if(engine._workshopCameraActions===cameraActions)delete engine._workshopCameraActions;};
  }

  function workshopDragOffset(axis,dx,dy,screenAxis) {
    var length=screenAxis.x*screenAxis.x+screenAxis.y*screenAxis.y;
    if(['x','y','z'].indexOf(axis)===-1 || !Number.isFinite(length) || length<4)return null;
    var steps=Math.max(-128,Math.min(128,Math.round((dx*screenAxis.x+dy*screenAxis.y)/length))),offset={x:0,y:0,z:0};offset[axis]=steps;return offset;
  }
  // A projected overlay provides large, keyboard-accessible handles without
  // modifying the selected meshes. All drags still use the atomic preview path.
  function installWorkshopTransform(engine,canvas,onPreview,onExit) {
    var THREE=window.THREE,snapshot=selectionEditSnapshot(engine);
    if(!THREE || !snapshot.ok || !canvas)return function(){};
    var bounds=new THREE.Box3();snapshot.blocks.forEach(function(b){bounds.expandByPoint(new THREE.Vector3(b.x,b.y,b.z));bounds.expandByPoint(new THREE.Vector3(b.x+1,b.y+1,b.z+1));});
    var center=bounds.getCenter(new THREE.Vector3()),root=document.createElement('div'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),axes={},drag=null,frame=0,disposed=false;
    root.className='gwe-transform-handles';root.setAttribute('role','group');root.setAttribute('aria-label','Move selected blocks on the grid');root.appendChild(svg);function attach(){(document.fullscreenElement||document.body).appendChild(root);}attach();document.addEventListener('fullscreenchange',attach);
    var keyboardSteps={x:0,y:0,z:0},keyboardAxis=null;var oldCursor=canvas.style.cursor,oldTouch=canvas.style.touchAction;canvas.style.cursor='default';canvas.style.touchAction='none';
    engine.releaseInput && engine.releaseInput();try{if(document.pointerLockElement)document.exitPointerLock();}catch(_){}
    engine._entryAnim=null;engine._viewPresetAnim=null;if(engine._creationFocus){engine._creationFocus.manual=true;engine._creationFocus.transition=null;}engine.flyMode=true;engine.velocity && engine.velocity.set(0,0,0);
    function allowed(){var m=engine._modalState||{};return !engine._destroyed && !engine._showcase && engine._currentLesson && engine._currentLesson.sandbox && !Object.keys(m).some(function(k){return /^show/.test(k)&&m[k];});}
    function stop(e){e.preventDefault();e.stopImmediatePropagation();}
    function project(p,rect){var q=p.clone().project(engine.camera);return {x:rect.left+(q.x+1)*rect.width/2,y:rect.top+(1-q.y)*rect.height/2,z:q.z};}
    function preview(axis,steps){if(keyboardAxis!==axis){keyboardSteps={x:0,y:0,z:0};keyboardAxis=axis;}keyboardSteps[axis]=Math.max(-128,Math.min(128,keyboardSteps[axis]+steps));var offset={x:0,y:0,z:0};offset[axis]=keyboardSteps[axis];if(!offset[axis])onPreview(null);else onPreview(previewSelectionEdit(engine,'move',offset),offset);}
    function release(){if(drag && drag.button.hasPointerCapture && drag.button.hasPointerCapture(drag.id))drag.button.releasePointerCapture(drag.id);drag=null;}
    ['x','y','z'].forEach(function(axis){
      var button=document.createElement('button'),line=document.createElementNS('http://www.w3.org/2000/svg','line');button.type='button';button.textContent=axis.toUpperCase()+' ↗';button.dataset.axis=axis;button.setAttribute('aria-label','Drag '+axis.toUpperCase()+' axis; arrow keys move one block');button.title='Drag to preview a grid move. Arrow keys move one block; Shift moves five.';
      line.dataset.axis=axis;svg.appendChild(line);root.appendChild(button);axes[axis]={button:button,line:line,vector:{x:0,y:0}};
      button.addEventListener('pointerdown',function(e){if(e.button!==0||!allowed())return;stop(e);button.focus();drag={axis:axis,id:e.pointerId,x:e.clientX,y:e.clientY,vector:Object.assign({},axes[axis].vector),button:button,last:null};button.setPointerCapture(e.pointerId);});
      button.addEventListener('pointermove',function(e){if(!drag||drag.id!==e.pointerId)return;stop(e);if(!allowed()){release();onPreview(null);return;}var offset=workshopDragOffset(axis,e.clientX-drag.x,e.clientY-drag.y,drag.vector);if(!offset){onPreview({ok:false,reason:'This axis points toward the camera. Orbit the camera or use the arrow keys.'});return;}if(offset[axis]!==drag.last){drag.last=offset[axis];keyboardAxis=axis;keyboardSteps={x:0,y:0,z:0};keyboardSteps[axis]=offset[axis];if(offset[axis]===0)onPreview(null);else onPreview(previewSelectionEdit(engine,'move',offset),offset);}});
      button.addEventListener('pointerup',function(e){if(drag&&drag.id===e.pointerId){stop(e);release();}});
      button.addEventListener('pointercancel',function(){release();onPreview(null);});
      button.addEventListener('keydown',function(e){if(!allowed())return;var step=['ArrowRight','ArrowUp'].indexOf(e.key)!==-1?1:['ArrowLeft','ArrowDown'].indexOf(e.key)!==-1?-1:0;if(step){stop(e);preview(axis,step*(e.shiftKey?5:1));}else if(e.key==='Enter'||e.key===' '){stop(e);preview(axis,1);}});
      button.addEventListener('click',function(e){stop(e);if(e.detail===0 && allowed())preview(axis,1);});
    });
    var transformActions={reset:function(){release();keyboardSteps={x:0,y:0,z:0};keyboardAxis=null;}};engine._workshopTransformActions=transformActions;
    var rotate=document.createElement('button');rotate.type='button';rotate.className='gwe-transform-rotate';rotate.textContent='↻ 90°';rotate.setAttribute('aria-label','Preview rotation of selected blocks by 90 degrees');root.appendChild(rotate);rotate.addEventListener('click',function(e){stop(e);if(allowed())onPreview(previewSelectionEdit(engine,'rotate',{}));});
    function draw(){
      if(disposed)return;if(engine._destroyed){root.hidden=true;return;}var rect=canvas.getBoundingClientRect();engine.camera.updateMatrixWorld(true);var p=project(center,rect),visible=allowed() && p.z>=-1&&p.z<=1 && p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom;
      root.hidden=!visible;svg.setAttribute('width',String(window.innerWidth));svg.setAttribute('height',String(window.innerHeight));
      if(visible){Object.keys(axes).forEach(function(axis){var a=axes[axis],point=center.clone();point[axis]+=1;var q=project(point,rect),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);a.vector={x:dx,y:dy};if(len<2){dx=axis==='x'?1:axis==='z'?-1:0;dy=axis==='y'?-1:.6;len=Math.hypot(dx,dy);}var x=Math.max(rect.left+26,Math.min(rect.right-26,p.x+dx/len*88)),y=Math.max(rect.top+26,Math.min(rect.bottom-26,p.y+dy/len*88));a.button.style.left=x+'px';a.button.style.top=y+'px';a.line.setAttribute('x1',p.x);a.line.setAttribute('y1',p.y);a.line.setAttribute('x2',x);a.line.setAttribute('y2',y);});rotate.style.left=Math.max(rect.left+38,Math.min(rect.right-38,p.x))+'px';rotate.style.top=Math.max(rect.top+26,Math.min(rect.bottom-26,p.y+60))+'px';}
      frame=window.requestAnimationFrame(draw);
    }
    function key(e){if(e.key==='Escape'){stop(e);release();onPreview(null);onExit();}}
    function block(e){if(allowed())stop(e);}
    var events=['pointerdown','mousedown','click','dblclick','contextmenu','touchstart'];events.forEach(function(k){canvas.addEventListener(k,block,{capture:true,passive:false});});window.addEventListener('keydown',key,true);draw();
    return function(){disposed=true;window.cancelAnimationFrame(frame);release();root.remove();if(engine._workshopTransformActions===transformActions)delete engine._workshopTransformActions;document.removeEventListener('fullscreenchange',attach);events.forEach(function(k){canvas.removeEventListener(k,block,true);});window.removeEventListener('keydown',key,true);canvas.style.cursor=oldCursor;canvas.style.touchAction=oldTouch;};
  }

  function previewPrintPreparation(engine,kind,options) {
    var snapshot=selectionEditSnapshot(engine);if(!snapshot.ok)return snapshot;
    if(!engine._currentLesson || !engine._currentLesson.sandbox || engine._showcase || typeof engine.previewBuildBatch!=='function')return {ok:false,reason:'Open Free Build to prepare a print.'};
    var min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
    snapshot.blocks.forEach(function(b){['x','y','z'].forEach(function(a){min[a]=Math.min(min[a],b[a]);max[a]=Math.max(max[a],b[a]);});});
    if(kind==='lower'){if(min.y===1)return {ok:false,reason:'The selection already reaches the ground layer.'};return previewSelectionEdit(engine,'move',{x:0,y:1-min.y,z:0});}
    if(kind!=='base')return {ok:false,reason:'Choose a print preparation action.'};
    options=options || {};
    var padding=options.padding==null?1:Number(options.padding),thickness=options.thickness==null?1:Number(options.thickness),material=options.material==null?'stone':options.material;
    if(options.padding==='' || !Number.isInteger(padding) || padding<0 || padding>4)return {ok:false,reason:'Enter a whole-number base margin from 0 to 4 blocks.'};
    if(options.thickness==='' || !Number.isInteger(thickness) || thickness<1 || thickness>4)return {ok:false,reason:'Enter a whole-number base thickness from 1 to 4 blocks.'};
    if(['stone','wood','brick'].indexOf(material)===-1)return {ok:false,reason:'Choose stone, wood, or brick for the base appearance.'};
    var width=max.x-min.x+1+padding*2,depth=max.z-min.z+1+padding*2;
    if(width*depth*thickness+snapshot.blocks.length>MAX_BLOCKS)return {ok:false,reason:'The padded base would exceed the build limit. Reduce its margin or thickness, or select a smaller creation.'};
    // Lift the complete selection above the requested solid plate.
    // Supports reach the lowest block of every occupied X/Z column, so raised
    // components make face contact even when their first block is a wedge.
    var additions=snapshot.blocks.map(function(b){return Object.assign({},b,{y:b.y+thickness+1-min.y});}),columns=Object.create(null);
    additions.forEach(function(b){var k=b.x+','+b.z;columns[k]=Math.min(columns[k]||Infinity,b.y);});
    for(var x=min.x-padding;x<=max.x+padding;x++)for(var z=min.z-padding;z<=max.z+padding;z++){
      var top=columns[x+','+z]||thickness+1;
      for(var y=1;y<top;y++){if(additions.length>=MAX_BLOCKS)return {ok:false,reason:'The base and support columns exceed the build limit. Select a smaller or lower creation.'};additions.push({x:x,y:y,z:z,type:material,shape:'cube',rotation:0});}
    }
    var removals=snapshot.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};}),label='Add connecting print base';
    return Object.assign({},engine.previewBuildBatch(additions,removals,{label:label}),{engine:engine,lesson:engine._currentLesson,sourceSignature:snapshot.signature,additions:additions,removals:removals,label:label,beforeSelection:copyLocal(engine._builderSelection),afterSelection:{blocks:additions.map(function(b){return {x:b.x,y:b.y,z:b.z};}),exact:true}});
  }

  function activityMilestones(guide,journal,npcs) {
    if(!guide)return [];
    return guide.activities.map(function(a,i){var npc=(npcs||[]).find(function(n){return n.data && n.data.name===a.npcName;}),p=a.position || (npc && npc.data.position),e=(journal.evidence||{})[a.id] || {},reviewed=!!(journal.reviewed||{})[a.id],met=e.check && e.check.status==='met';return {id:a.id,title:a.title,position:p,index:i,lit:reviewed||!!met,basis:met?'Numeric goal checked':reviewed?'Self-review recorded':'Ready to explore'};}).filter(function(a){return a.position && a.position.every(Number.isFinite);});
  }
  function createActivityMilestones(engine,milestones) {
    var THREE=window.THREE;if(!THREE || !engine || !engine.scene || !milestones.length)return null;
    var group=new THREE.Group();group.name='gw-activity-milestones';group.userData.gwDecorative=true;
    var designs=[{geometry:new THREE.CylinderGeometry(.09,.13,1.8,6),color:0x70654f,y:.9},{geometry:new THREE.BoxGeometry(.7,.42,.06),color:0xb7c6af,y:1.65},{geometry:new THREE.OctahedronGeometry(.25,0),color:0xf2c96a,y:2.15}];
    designs.forEach(function(d,index){var mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8}),mesh=new THREE.InstancedMesh(d.geometry,mat,milestones.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1);
      milestones.forEach(function(m,i){var ground=engine._currentLesson.ground||{},p=m.position,base=Number.isFinite(ground.y)?ground.y+1:p[1];matrix.compose(new THREE.Vector3(p[0]+1.8,base+d.y,p[2]+1.8),q,scale);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(index===0?d.color:m.lit?(index===1?0x39775b:0xffce64):index===1?0x91a599:0x73877d));});mesh.userData.gwDecorative=true;group.add(mesh);});
    engine.scene.add(group);return group;
  }
  function disposeActivityMilestones(group){if(!group)return;if(group.parent)group.parent.remove(group);group.children.forEach(function(m){m.geometry.dispose();m.material.dispose();});}


  var BUILD_STAMP_KEY = 'alloflow.geometry-world.build-stamps.v1';
  var BUILD_STAMP_LIMIT = 12, BUILD_STAMP_TOTAL = 6000, BUILD_STAMP_BYTES = 768 * 1024;
  function selectionEditSnapshot(engine) {
    var selection=engine && engine._builderSelection, records=[],seen=Object.create(null);
    if(!selection || !Array.isArray(selection.blocks) || !selection.blocks.length || selection.blocks.length>MAX_BLOCKS || !engine.blocks)return {ok:false,reason:'Select a creation before editing it.'};
    for(var i=0;i<selection.blocks.length;i++){
      var p=selection.blocks[i],mesh=p && engine.blocks[keyFor(p)],u=mesh && mesh.userData;
      if(!p || ![p.x,p.y,p.z].every(function(v){return typeof v==='number' && isFinite(v) && Math.floor(v)===v;}) || seen[keyFor(p)] || !isStudentBlock(u) || !u.gridPos || keyFor(u.gridPos)!==keyFor(p))return {ok:false,reason:'The selected creation changed. Select it again before editing.'};
      if(!BLOCK_TYPES.some(function(t){return t.id===u.blockType && t.id!=='grass';}) || !BLOCK_SHAPES.some(function(s){return s.id===u.shape;}) || !Number.isInteger(u.rotation) || u.rotation<0 || u.rotation>3)return {ok:false,reason:'A selected block has an unsupported shape or material.'};
      seen[keyFor(p)]=true;records.push({x:p.x,y:p.y,z:p.z,type:u.blockType,shape:u.shape,rotation:u.rotation});
    }
    records.sort(compareBlocks);
    return {ok:true,blocks:records,signature:JSON.stringify(records)};
  }
  function suggestCreationDuplicate(engine, axis) {
    var snapshot=selectionEditSnapshot(engine);if(!snapshot.ok)return snapshot;
    if(engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox || typeof engine.previewBuildBatch!=='function')return {ok:false,reason:'Open Free Build before duplicating a creation.'};
    if(axis && ['x','y','z'].indexOf(axis)===-1)return {ok:false,reason:'Choose X, Z, or a stack above.'};
    var min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
    snapshot.blocks.forEach(function(b){['x','y','z'].forEach(function(a){min[a]=Math.min(min[a],b[a]);max[a]=Math.max(max[a],b[a]);});});
    var choices=axis?[axis]:['x','z','y'];
    for(var i=0;i<choices.length;i++){
      var a=choices[i],distance=max[a]-min[a]+(a==='y'?1:2),signs=a==='y'?[1]:[1,-1];
      for(var j=0;j<signs.length;j++){
        var offset={x:0,y:0,z:0};offset[a]=distance*signs[j];
        var plan=previewSelectionEdit(engine,'duplicate',offset);
        if(plan.ok)return Object.assign({},plan,{suggestedOffset:offset});
        if(plan.code==='block_limit')return plan;
      }
    }
    return {ok:false,reason:'No clear adjacent position was found'+(axis?' along '+axis.toUpperCase():'')+'. Choose another direction or enter an offset, then preview.'};
  }
  // Rotate about the selection's grid-aligned footprint and keep its minimum
  // corner fixed. Odd/even footprints remain integral without rounding cells.
  function transformCreationBlocks(blocks, operation, values) {
    values=values || {};
    if(!Array.isArray(blocks) || !blocks.length)return {ok:false,reason:'Select a creation first.'};
    var min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
    blocks.forEach(function(b){['x','y','z'].forEach(function(a){min[a]=Math.min(min[a],b[a]);max[a]=Math.max(max[a],b[a]);});});
    var minX=min.x,maxX=max.x,minZ=min.z,maxZ=max.z,offset={x:0,y:0,z:0};
    if(operation==='repeat'){
      if(['x','y','z'].indexOf(values.axis)===-1 || (values.direction!==1 && values.direction!==-1))return {ok:false,reason:'Choose a pattern axis and direction.'};
      if(!Number.isInteger(values.total) || values.total<2 || values.total>12)return {ok:false,reason:'Choose 2 to 12 instances, including the original.'};
      if(!Number.isInteger(values.gap) || values.gap<0 || values.gap>8)return {ok:false,reason:'Choose a whole-number gap from 0 to 8 blocks.'};
      if(blocks.length*values.total>MAX_BLOCKS)return {ok:false,reason:'This pattern exceeds the '+MAX_BLOCKS+'-block limit. Use fewer instances or a smaller selection.'};
      var step=(max[values.axis]-min[values.axis]+1+values.gap)*values.direction,copies=[];
      for(var instance=1;instance<values.total;instance++)blocks.forEach(function(source){var b=Object.assign({},source);b[values.axis]+=step*instance;copies.push(b);});
      return {ok:true,additions:copies,removals:[],selection:blocks.concat(copies).map(function(b){return {x:b.x,y:b.y,z:b.z};}),label:'Repeat creation · '+values.total+' total'};
    }
    if(operation==='align'){
      if(['x','y','z'].indexOf(values.axis)===-1 || ['start','end'].indexOf(values.edge)===-1)return {ok:false,reason:'Choose an axis and an edge to align.'};
      if(!Number.isInteger(values.coordinate) || Math.abs(values.coordinate)>128)return {ok:false,reason:'Choose a whole-number grid line from -128 to 128.'};
      offset[values.axis]=values.coordinate-(values.edge==='start'?min[values.axis]:max[values.axis]+1);
      if(!offset[values.axis])return {ok:false,reason:'This grid edge is already aligned with that line.'};
    }else if(operation==='move' || operation==='duplicate'){
      for(var axis of ['x','y','z']){
        var value=values[axis];
        if(typeof value!=='number' || !isFinite(value) || Math.floor(value)!==value || Math.abs(value)>128)return {ok:false,reason:'Use whole-number offsets from -128 to 128.'};
        offset[axis]=value;
      }
      if(!offset.x && !offset.y && !offset.z)return {ok:false,reason:'Choose an offset of at least one block.'};
    }else if(operation==='recolor'){
      if(!BLOCK_TYPES.some(function(t){return t.id===values.type && t.id!=='grass';}))return {ok:false,reason:'Choose a building material.'};
    }else if(['rotate','mirrorX','mirrorZ'].indexOf(operation)===-1)return {ok:false,reason:'Choose an editing action.'};
    var additions=blocks.map(function(source){
      var b=Object.assign({},source);
      if(operation==='move' || operation==='duplicate' || operation==='align'){b.x+=offset.x;b.y+=offset.y;b.z+=offset.z;}
      if(operation==='rotate'){b.x=minX+(source.z-minZ);b.z=minZ+(maxX-source.x);b.rotation=(source.rotation+1)%4;}
      // A halfA slopes toward local +X. Reflection changes that direction;
      // quarter wedges are symmetric but obey the same equivalent orientation.
      if(operation==='mirrorX'){b.x=minX+maxX-source.x;b.rotation=(6-source.rotation)%4;}
      if(operation==='mirrorZ'){b.z=minZ+maxZ-source.z;b.rotation=(4-source.rotation)%4;}
      if(operation==='recolor')b.type=values.type;
      return b;
    });
    return {ok:true,additions:additions,removals:operation==='duplicate'?[]:blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};}),label:{align:'Align creation',move:'Move creation',duplicate:'Duplicate creation',rotate:'Rotate creation',mirrorX:'Mirror creation across X',mirrorZ:'Mirror creation across Z',recolor:'Recolor creation'}[operation]};
  }
  function previewSelectionEdit(engine,operation,values) {
    var snapshot=selectionEditSnapshot(engine);
    if(!snapshot.ok)return snapshot;
    if(engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox || typeof engine.previewBuildBatch!=='function')return {ok:false,reason:'Open Free Build before editing a creation.'};
    var plan=transformCreationBlocks(snapshot.blocks,operation,values);if(!plan.ok)return plan;
    var result=engine.previewBuildBatch(plan.additions,plan.removals,{label:plan.label});
    return Object.assign({},result,{engine:engine,lesson:engine._currentLesson,sourceSignature:snapshot.signature,additions:plan.additions,removals:plan.removals,frameBlocks:plan.selection,label:plan.label,beforeSelection:copyLocal(engine._builderSelection),afterSelection:Object.assign({blocks:plan.selection || plan.additions.map(function(b){return {x:b.x,y:b.y,z:b.z};})},plan.selection || engine._builderSelection.exact?{exact:true}:{})});
  }
  function commitSelectionEdit(engine,plan) {
    if(!plan || !plan.ok || plan.engine!==engine || engine._destroyed || engine._showcase || engine._currentLesson!==plan.lesson || typeof engine.commitBuildBatch!=='function')return {ok:false,reason:'Preview this change again before applying it.'};
    if(plan.sourceSignature){var current=selectionEditSnapshot(engine);if(!current.ok || current.signature!==plan.sourceSignature)return {ok:false,reason:'The selected creation changed after this preview. Preview it again.'};}
    return engine.commitBuildBatch(plan.additions,plan.removals,{label:plan.label,beforeSelection:plan.sourceSignature?plan.beforeSelection:copyLocal(engine._builderSelection || null),afterSelection:plan.afterSelection});
  }
  function normalizeBuildStamp(candidate) {
    if(!candidate || typeof candidate!=='object' || typeof candidate.id!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(candidate.id) || typeof candidate.name!=='string' || !candidate.name.trim() || candidate.name.length>48)return {ok:false,reason:'A saved stamp is not a valid named recipe.'};
    var checked=normalizeEditableWorld({schema:EDITABLE_WORLD_SCHEMA,title:candidate.name,blocks:candidate.blocks});
    if(!checked.ok)return {ok:false,reason:checked.error};
    return {ok:true,value:{id:candidate.id,name:candidate.name.replace(/[\u0000-\u001f\u007f]/g,' ').trim(),blocks:checked.value.blocks},summary:checked.summary};
  }
  function readBuildStamps(storage) {
    try{
      storage=storage || window.localStorage;
      var raw=storage.getItem(BUILD_STAMP_KEY);if(raw==null)return {ok:true,stamps:[]};
      if(raw.length>BUILD_STAMP_BYTES || editableWorldByteLength(raw)>BUILD_STAMP_BYTES)throw new Error('The stamp library is larger than its safe limit.');
      var parsed=JSON.parse(raw),stamps=[],seen=Object.create(null),total=0;
      if(!parsed || parsed.schema!=='alloflow-build-stamps/1' || !Array.isArray(parsed.stamps) || parsed.stamps.length>BUILD_STAMP_LIMIT)throw new Error('The saved stamp library could not be read.');
      for(var rawStamp of parsed.stamps){var checked=normalizeBuildStamp(rawStamp);if(!checked.ok || seen[rawStamp.id])throw new Error('The saved stamp library contains an invalid recipe.');seen[rawStamp.id]=true;total+=checked.value.blocks.length;stamps.push(checked.value);}
      if(total>BUILD_STAMP_TOTAL)throw new Error('The stamp library is larger than its safe limit.');
      return {ok:true,stamps:stamps};
    }catch(error){return {ok:false,stamps:[],reason:(error && error.message || 'Browser storage is unavailable.')+' Your world is unchanged; save an editable world to keep your work.'};}
  }
  function writeBuildStamps(stamps,storage) {
    try{
      var text=JSON.stringify({schema:'alloflow-build-stamps/1',stamps:stamps}),checked=readBuildStamps({getItem:function(){return text;}});
      if(!checked.ok)return checked;
      (storage || window.localStorage).setItem(BUILD_STAMP_KEY,text);return checked;
    }catch(_){return {ok:false,reason:'This browser could not save the stamp library. Save an editable world to keep your work.'};}
  }
  function saveSelectionStamp(engine,name,storage) {
    var library=readBuildStamps(storage);if(!library.ok)return library;
    if(library.stamps.length>=BUILD_STAMP_LIMIT)return {ok:false,reason:'Your library holds 12 stamps. Remove one before saving another.'};
    name=typeof name==='string'?name.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,48):'';
    if(!name)return {ok:false,reason:'Give this stamp a short name.'};
    var snapshot=selectionEditSnapshot(engine);if(!snapshot.ok)return snapshot;
    var xs=snapshot.blocks.map(function(b){return b.x;}),zs=snapshot.blocks.map(function(b){return b.z;}),ys=snapshot.blocks.map(function(b){return b.y;});
    var ox=Math.floor((Math.min.apply(null,xs)+Math.max.apply(null,xs))/2),oz=Math.floor((Math.min.apply(null,zs)+Math.max.apply(null,zs))/2),oy=Math.min.apply(null,ys)-1;
    var candidate={id:'stamp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9),name:name,blocks:snapshot.blocks.map(function(b){return Object.assign({},b,{x:b.x-ox,y:b.y-oy,z:b.z-oz});})};
    var checked=normalizeBuildStamp(candidate);if(!checked.ok)return checked;
    if(library.stamps.some(function(stamp){return stamp.name.toLocaleLowerCase()===name.toLocaleLowerCase();}))return {ok:false,reason:'A stamp already uses that name. Choose a different name.'};
    return writeBuildStamps(library.stamps.concat([checked.value]),storage);
  }
  function removeBuildStamp(id,storage) {
    var library=readBuildStamps(storage);if(!library.ok)return library;
    return writeBuildStamps(library.stamps.filter(function(stamp){return stamp.id!==id;}),storage);
  }
  function previewBuildStamp(engine,stamp,origin) {
    var checked=normalizeBuildStamp(stamp);if(!checked.ok)return checked;
    if(!engine || engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox || typeof engine.previewBuildBatch!=='function')return {ok:false,reason:'Open Free Build before placing a stamp.'};
    if(!origin || ![origin.x,origin.y,origin.z].every(function(v){return typeof v==='number' && isFinite(v) && Math.floor(v)===v;}))return {ok:false,reason:'Choose a whole-number grid corner for this stamp.'};
    var min=checked.summary.min,additions=checked.value.blocks.map(function(b){return Object.assign({},b,{x:b.x+origin.x-min.x,y:b.y+origin.y-min.y,z:b.z+origin.z-min.z});}),label='Place '+checked.value.name;
    var result=engine.previewBuildBatch(additions,[],{label:label});
    return Object.assign({},result,{engine:engine,lesson:engine._currentLesson,additions:additions,removals:[],label:label,beforeSelection:copyLocal(engine._builderSelection || null),afterSelection:{blocks:additions.map(function(b){return {x:b.x,y:b.y,z:b.z};}),exact:true}});
  }
  function selectionMeasurement(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks || typeof engine.measureStructure !== 'function') return null;
    var seed = selected.blocks.find(function(p) { var mesh = engine.blocks[keyFor(p)]; return mesh && isStudentBlock(mesh.userData); });
    if (!seed) { engine._builderSelection = null; return null; }
    var measurement = engine.measureStructure(seed.x, seed.y, seed.z, selected.blocks, !!selected.exact);
    if (measurement && measurement.isComplete !== false) engine._builderSelection = Object.assign({blocks:measurement.blocks.slice()},selected.exact?{exact:true}:{});
    return measurement && measurement.isComplete !== false ? { engine: engine, gp: seed, measurement: measurement } : null;
  }
  // A complete component can change only through a retained cell or its frontier.
  // Save field tuples after measuring; idle polls compare primitives without
  // rebuilding/sorting a world snapshot or walking the connected component.
  function blockMeasurementTuple(engine, key) {
    var mesh = engine.blocks[key], u = mesh && mesh.userData, p = u && u.gridPos;
    return [key, !!mesh, !!u, p && p.x, p && p.y, p && p.z,
      u && u.shape, u && u.rotation, u && u.blockType, u && u.volume,
      u && u._measurementLayer, u && u._lessonBlock];
  }
  function blockMeasurementSignature(engine, keys) {
    return JSON.stringify(keys.slice().sort().map(function(key) { return blockMeasurementTuple(engine,key); }));
  }
  function selectionRefreshSnapshot(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks) return null;
    var frontier = Object.create(null), members = Object.create(null);
    var directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    var keys = selected.blocks.map(keyFor).sort();
    keys.forEach(function(key) { members[key] = true; });
    selected.blocks.forEach(function(p) {
      frontier[keyFor(p)] = true;
      directions.forEach(function(d) { frontier[(p.x+d[0])+','+(p.y+d[1])+','+(p.z+d[2])] = true; });
    });
    // Missing cells matter: filling one can attach an entire remote build.
    // Each disconnected retained part contributes its own six-face frontier.
    var frontierKeys = Object.keys(frontier).sort();
    return {engine:engine,measure:engine.measureStructure,exact:!!selected.exact,keys:keys,members:members,
      frontier:frontierKeys.map(function(key) { return blockMeasurementTuple(engine,key); })};
  }
  function selectionRefreshUnchanged(engine, saved) {
    var selected = engine && engine._builderSelection;
    if (!saved || saved.engine !== engine || saved.measure !== engine.measureStructure || !engine.blocks ||
      !selected || !Array.isArray(selected.blocks) || !!selected.exact!==saved.exact || selected.blocks.length !== saved.keys.length) return false;
    var seen = Object.create(null);
    for (var i=0;i<selected.blocks.length;i++) {
      var key = keyFor(selected.blocks[i]);
      if (!saved.members[key] || seen[key]) return false;
      seen[key] = true;
    }
    for (var j=0;j<saved.frontier.length;j++) {
      var row = saved.frontier[j], mesh = engine.blocks[row[0]], u = mesh && mesh.userData, p = u && u.gridPos;
      if (row[1] !== !!mesh || row[2] !== !!u || row[3] !== (p && p.x) || row[4] !== (p && p.y) || row[5] !== (p && p.z) ||
        row[6] !== (u && u.shape) || row[7] !== (u && u.rotation) || row[8] !== (u && u.blockType) || row[9] !== (u && u.volume) ||
        row[10] !== (u && u._measurementLayer) || row[11] !== (u && u._lessonBlock)) return false;
    }
    return true;
  }
  function polledSelectionMeasurement(engine, cache) {
    if (selectionRefreshUnchanged(engine,cache.current)) return cache.current.result;
    var result = selectionMeasurement(engine);
    // A truncated/null measurement has no proven complete frontier; retry it.
    if (!result) { cache.current = null; return null; }
    // The fresh measurement normalizes removals and expands connected cells.
    cache.current = selectionRefreshSnapshot(engine);
    cache.current.result = result;
    return result;
  }
  // Closing the inspector hides its result, not the outlined selection. Cache
  // this render-only fallback; the existing selection refresh still discovers
  // newly connected blocks. Live block metadata invalidates edits/removals.
  function retainedSelectionSummary(engine, cache) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks) { cache.current = null; return null; }
    var signature = (selected.exact?'exact:':'connected:')+selected.blocks.map(function(p) {
      var mesh = engine.blocks[keyFor(p)], u = mesh && mesh.userData;
      return keyFor(p) + ':' + (u ? [u.shape,u.rotation,u.blockType,u.volume,u._measurementLayer,u._lessonBlock].join(':') : 'missing');
    }).join('|');
    var saved = cache.current;
    if (saved && saved.engine === engine && saved.signature === signature) return saved.measurement;
    var result = selectionMeasurement(engine);
    var measurement = result ? result.measurement : null;
    cache.current = { engine:engine, signature:signature, measurement:measurement };
    return measurement;
  }
  function copyLocal(value) { return JSON.parse(JSON.stringify(value)); }
  // The complete project stays in this browser only, outside exported model metadata.
  // A matching handoff ID prevents a stale or unrelated source from replacing it.
  function captureProject(ctx, engine, id) {
    if(engine.flushWorkshopDraft)engine.flushWorkshopDraft();
    var blocks = [];
    Object.keys(engine.blocks || {}).forEach(function(key) {
      var mesh = engine.blocks[key], p = gridPosition(mesh), u = mesh && mesh.userData;
      if (!p || !u || u._lessonBlock) return;
      blocks.push(Object.assign({}, p, { type:u.blockType, shape:u.shape || 'cube', rotation:u.rotation || 0 }));
    });
    return { id:id, blocks:blocks, lesson:copyLocal(engine._currentLesson || FREE_BUILD_LESSON),
      workshopDraft:{id:engine._workshopProjectId||null,version:engine._workshopProjectVersion||null,signature:engine._workshopSavedSignature||null},
      state:Object.assign(copyLocal(ctx.toolData && ctx.toolData.geometryWorld || {}), { actionFeedback:'' }),
      selection:engine._builderSelection && copyLocal(engine._builderSelection),
      undo:copyLocal(engine._undoStack || []), redo:copyLocal(engine._redoStack || []),
      blocksPlaced:engine.blocksPlaced || 0, sessionXP:engine._sessionXP || 0, milestones:copyLocal(engine._blockMilestones || {}),
      camera:engine.camera && engine.camera.position.toArray(), cameraQuaternion:engine.camera && engine.camera.quaternion.toArray(), yaw:engine.yaw, pitch:engine.pitch, flyMode:!!engine.flyMode };
  }
  function restoreWorkshopDraftIdentity(engine,saved){engine._workshopProjectId=saved && saved.id || null;engine._workshopProjectVersion=saved && saved.version || null;engine._workshopSavedSignature=saved && saved.signature || null;}
  function restoreProject(ctx, engine, pending) {
    var saved = window.__alloGeometryWorldReturnProject;
    if (!saved || !pending.projectId || saved.id !== pending.projectId) return false;
    engine.loadLesson(saved.lesson);
    saved.blocks.forEach(function(block) { engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation); });
    engine._undoStack = copyLocal(saved.undo); engine._redoStack = copyLocal(saved.redo);
    engine.blocksPlaced = saved.blocksPlaced; engine._sessionXP = saved.sessionXP; engine._blockMilestones = saved.milestones;
    engine._entryAnim = null; engine._builderSelection = saved.selection;
    restoreWorkshopDraftIdentity(engine,saved.workshopDraft);
    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);
    if (saved.cameraQuaternion && engine.camera) { engine.camera.quaternion.fromArray(saved.cameraQuaternion); if(engine.euler) engine.euler.setFromQuaternion(engine.camera.quaternion); }
    if (isFinite(saved.yaw)) engine.yaw = saved.yaw;
    if (isFinite(saved.pitch)) engine.pitch = saved.pitch;
    engine.flyMode = saved.flyMode;
    if (engine.velocity) engine.velocity.set(0,0,0);
    var context = pending.printContext || {};
    var selected = selectionMeasurement(engine);
    patchGeometryState(ctx, Object.assign({}, saved.state, { worldActive:true, showGeometryHome:false, _geometryHomeInitial:false, showLessonIntro:false, actionFeedback:'',
      showGameSettings:false, builderPanel:'build', measureResult:selected ? selected.measurement : null,
      builderPrintContext:{unitMm:printUnit(context.unitMm), aiUse:context.aiUse || 'NONE', aiDisclosure:String(context.aiDisclosure || '').slice(0,500)} }));
    delete window.__alloGeometryWorldReturnProject;
    announce(ctx, 'Returned to your complete workspace with selection, undo history, and print scale preserved. Check the revised model before printing.', 'success');
    focusWorldSurface(50);
    return true;
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
  // Use only the lowest world-space vertices: raised spans should not paint a
  // false contact beneath an arch. These polygons are presentation data only.
  function studioGroundFootprints(meshes, baseY, poppingMeshes) {
    var THREE=window.THREE, footprints=[];
    if(!THREE || !isFinite(baseY))return footprints;
    function cross(a,b,c){return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);}
    (meshes || []).forEach(function(mesh){
      var positions=mesh && mesh.geometry && mesh.geometry.getAttribute('position');
      if(!positions)return;
      mesh.updateWorldMatrix(true,false);
      var matrix=mesh.matrixWorld;
      // Placement animation changes display scale only. Grounding follows the
      // finished block using a temporary matrix, without touching the live mesh.
      if(poppingMeshes && poppingMeshes.indexOf(mesh)!==-1){
        matrix=new THREE.Matrix4().compose(mesh.position,mesh.quaternion,new THREE.Vector3(1,1,1));
        if(mesh.parent)matrix.premultiply(mesh.parent.matrixWorld);
      }
      var points=[],seen={};
      for(var i=0;i<positions.count;i++){
        var point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(matrix);
        if(Math.abs(point.y-baseY)>0.025)continue;
        var key=Math.round(point.x*100000)+','+Math.round(point.z*100000);
        if(!seen[key]){seen[key]=true;points.push({x:point.x,z:point.z});}
      }
      if(points.length<3)return;
      points.sort(function(a,b){return a.x-b.x || a.z-b.z;});
      var lower=[],upper=[];
      points.forEach(function(point){while(lower.length>1 && cross(lower[lower.length-2],lower[lower.length-1],point)<=0)lower.pop();lower.push(point);});
      points.slice().reverse().forEach(function(point){while(upper.length>1 && cross(upper[upper.length-2],upper[upper.length-1],point)<=0)upper.pop();upper.push(point);});
      lower.pop();upper.pop();var hull=lower.concat(upper);
      if(hull.length>2)footprints.push(hull);
    });
    return footprints;
  }
  function studioContactMap(footprints, box) {
    var width=Math.max(1.8,box.max.x-box.min.x+0.9),depth=Math.max(1.8,box.max.z-box.min.z+0.9),size=384;
    var canvas=document.createElement('canvas'),mask=document.createElement('canvas');
    canvas.width=canvas.height=mask.width=mask.height=size;
    var context=canvas.getContext('2d'),ink=mask.getContext('2d');
    var centerX=(box.min.x+box.max.x)/2,centerZ=(box.min.z+box.max.z)/2;
    ink.fillStyle='rgb(49,55,45)';
    footprints.forEach(function(points){
      ink.beginPath();points.forEach(function(point,i){var x=((point.x-centerX)/width+0.5)*size,y=((point.z-centerZ)/depth+0.5)*size;if(i)ink.lineTo(x,y);else ink.moveTo(x,y);});ink.closePath();ink.fill();
    });
    // Two soft scales retain the support silhouette without a hard decal edge.
    context.filter='blur(10px)';context.globalAlpha=0.55;context.drawImage(mask,0,0);
    context.filter='blur(2px)';context.globalAlpha=0.28;context.drawImage(mask,0,0);
    context.filter='none';context.globalAlpha=1;
    return {canvas:canvas,width:width,depth:depth};
  }

  // Fit an exact transformed Box3 into an asymmetric clear screen rectangle.
  // The returned pose uses world-up (0,1,0); the caller retains a normal
  // perspective projection and applies camera.lookAt(result.target).
  // No camera, box, rect, construction mesh or selection state is mutated.
  function fitCreationCamera(box, camera, rect, minCameraY, viewOptions) {
    var THREE = window.THREE;
    if (!THREE || !box || !box.min || !box.max || !camera) return null;
    var bounds = [box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z];
    if (!bounds.every(function(value){return typeof value === 'number' && isFinite(value);}) || box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z) return null;
    var aspect = Number(camera.aspect);
    var fov = typeof camera.getEffectiveFOV === 'function' ? Number(camera.getEffectiveFOV()) : Number(camera.fov);
    if (!isFinite(aspect) || aspect <= 0 || !isFinite(fov) || fov <= 0 || fov >= 179.9) return null;
    var tanY = Math.tan(fov * Math.PI / 360), tanX = tanY * aspect;
    if (!isFinite(tanX) || !isFinite(tanY) || tanX <= 0 || tanY <= 0) return null;
    var input = rect || {left:-0.9,right:0.9,bottom:-0.85,top:0.85};
    var values = [input.left,input.right,input.bottom,input.top];
    if (!values.every(function(value){return typeof value === 'number' && isFinite(value);})) return null;
    var left=Math.max(-1,input.left),right=Math.min(1,input.right),bottom=Math.max(-1,input.bottom),top=Math.min(1,input.top);
    if (right <= left || top <= bottom) return null;
    var cx=(left+right)/2,cy=(bottom+top)/2,hx=(right-left)*0.48,hy=(top-bottom)*0.48;
    var safe={left:cx-hx,right:cx+hx,bottom:cy-hy,top:cy+hy};
    var center=new THREE.Vector3((box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,(box.min.z+box.max.z)/2);
    var horizontal=Math.sqrt(1.25*1.25+1.55*1.55),baseElevation=Math.atan2(0.72,horizontal);
    var view=viewOptions || {},azimuth=typeof view.azimuth==='number' && isFinite(view.azimuth)?view.azimuth:Math.atan2(1.25,1.55);
    if(typeof view.elevation==='number' && isFinite(view.elevation))baseElevation=Math.max(.10,Math.min(Math.PI/2-.04,view.elevation));
    // Moving the frame upward on screen lowers the camera. Raise the bearing
    // enough that increasing fit distance still raises its physical height.
    // The remaining-angle cap also supports unusually wide effective FOVs.
    var requiredElevation=Math.atan(Math.max(0,cy)*tanY);
    var lift=Math.min(Math.PI/18,(Math.PI/2-requiredElevation)*0.5);
    var elevation=Math.max(baseElevation,requiredElevation+lift),cosElevation=Math.cos(elevation);
    var direction=new THREE.Vector3(Math.sin(azimuth)*cosElevation,Math.sin(elevation),Math.cos(azimuth)*cosElevation);
    var rightAxis=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    var upAxis=new THREE.Vector3().crossVectors(direction,rightAxis).normalize();
    var near=Number(camera.near);if(!isFinite(near) || near<=0)near=0.1;
    var nearClearance=Math.max(0.05,near*0.5),distance=near+nearClearance,corners=[];
    [box.min.x,box.max.x].forEach(function(x){[box.min.y,box.max.y].forEach(function(y){[box.min.z,box.max.z].forEach(function(z){
      var relative=new THREE.Vector3(x,y,z).sub(center),px=relative.dot(rightAxis),py=relative.dot(upAxis),pz=relative.dot(direction);
      corners.push(pz);
      distance=Math.max(distance,pz+near+nearClearance,pz+Math.abs(px+cx*pz*tanX)/(hx*tanX),pz+Math.abs(py+cy*pz*tanY)/(hy*tanY));
    });});});
    var floor=typeof minCameraY === 'number' && isFinite(minCameraY) ? minCameraY : 2.8;
    var heightSlope=direction.y-cx*tanX*rightAxis.y-cy*tanY*upAxis.y;
    if (!isFinite(heightSlope) || heightSlope<=0) return null;
    distance=Math.max(distance,(floor-center.y)/heightSlope);
    distance*=typeof view.zoom==='number' && isFinite(view.zoom)?Math.max(1,Math.min(3,view.zoom)):1;
    distance+=Math.max(0.00001,distance*0.0000001);
    if (!isFinite(distance)) return null;
    var shift=rightAxis.clone().multiplyScalar(-cx*distance*tanX).addScaledVector(upAxis,-cy*distance*tanY);
    var target=center.clone().add(shift),position=target.clone().addScaledVector(direction,distance);
    var depthNear=Infinity,depthFar=-Infinity;
    corners.forEach(function(depth){depthNear=Math.min(depthNear,distance-depth);depthFar=Math.max(depthFar,distance-depth);});
    var diagonal=new THREE.Vector3().subVectors(box.max,box.min).length(),oldFar=Number(camera.far);
    var far=Math.max(isFinite(oldFar) && oldFar>near ? oldFar : 200,depthFar+Math.max(10,diagonal*0.05));
    if (![position.x,position.y,position.z,target.x,target.y,target.z,far,depthNear,depthFar].every(isFinite)) return null;
    return {position:position,target:target,far:far,depthNear:depthNear,depthFar:depthFar,rect:safe};
  }
  function creationFocusRect(engine) {
    var canvas=engine.renderer && engine.renderer.domElement,area=canvas && canvas.getBoundingClientRect();
    if(!area || !area.width || !area.height)return {left:-0.72,right:0.72,bottom:-0.65,top:0.65};
    var margin=14,w=area.width,h=area.height,obstacles=[],xs=[margin,w-margin],ys=[margin,h-margin];
    var root=canvas.closest && canvas.closest('#geoworld-fs-workspace');
    if(root)root.querySelectorAll('.gw-hotbar,.gw-shape-tray,.gw-action-bar,.gw-touch-actions,.gw-touch-joystick,.gw-touch-look-panel,.gwe-builder-dock,.gwe-focus-return,.gwe-preview-review').forEach(function(node){
      var style=window.getComputedStyle(node),r=node.getBoundingClientRect();
      if(style.display==='none' || style.visibility==='hidden' || !r.width || !r.height)return;
      var box={left:Math.max(margin,r.left-area.left-10),right:Math.min(w-margin,r.right-area.left+10),top:Math.max(margin,r.top-area.top-10),bottom:Math.min(h-margin,r.bottom-area.top+10)};
      if(box.left>=box.right || box.top>=box.bottom)return;
      obstacles.push(box);xs.push(box.left,box.right);ys.push(box.top,box.bottom);
    });
    xs=xs.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
    ys=ys.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
    var best=null,score=-1;
    for(var l=0;l<xs.length-1;l++)for(var r=l+1;r<xs.length;r++){
      if(xs[r]-xs[l]<Math.min(40,w*0.12))continue;
      for(var t=0;t<ys.length-1;t++)for(var b=t+1;b<ys.length;b++){
        var rw=xs[r]-xs[l],rh=ys[b]-ys[t];if(rh<Math.min(40,h*0.12))continue;
        if(obstacles.some(function(o){return xs[l]<o.right && xs[r]>o.left && ys[t]<o.bottom && ys[b]>o.top;}))continue;
        var offset=Math.abs((xs[l]+xs[r])/2-w/2)/w+Math.abs((ys[t]+ys[b])/2-h/2)/h;
        var candidate=rw*rh*(1-offset*0.15);
        if(candidate>score){score=candidate;best={left:xs[l],right:xs[r],top:ys[t],bottom:ys[b]};}
      }
    }
    if(!best)best={left:w*0.25,right:w*0.75,top:h*0.3,bottom:h*0.65};
    return {left:best.left/w*2-1,right:best.right/w*2-1,bottom:1-best.bottom/h*2,top:1-best.top/h*2};
  }
  function creationGeometryBounds(engine, blocks) {
    var THREE=window.THREE,box=new THREE.Box3();
    (blocks || []).forEach(function(p){
      var mesh=engine.blocks[keyFor(p)];if(!mesh || !isStudentBlock(mesh.userData) || !mesh.geometry)return;
      mesh.updateMatrixWorld(true);if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
      if(mesh.geometry.boundingBox){
        var matrix=mesh.matrixWorld;
        if(engine._popBlocks && engine._popBlocks.indexOf(mesh)!==-1){
          matrix=new THREE.Matrix4().compose(mesh.position,mesh.quaternion,new THREE.Vector3(1,1,1));
          if(mesh.parent)matrix.premultiply(mesh.parent.matrixWorld);
        }
        box.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));
      }
    });
    return box;
  }
  function selectionNeedsReview(check) {
    return !check || !!check.error || check.components !== 1 || check.openEdges !== 0 || check.nonManifoldEdges !== 0;
  }
  function createSelectionFrame(box, check) {
    var THREE=window.THREE;
    if(!THREE || !box || box.isEmpty())return null;
    var size=box.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);
    if(!isFinite(extent) || extent<=0)return null;
    var low=[box.min.x,box.min.y,box.min.z],high=[box.max.x,box.max.y,box.max.z];
    if(!low.concat(high).every(function(n){return isFinite(n);}))return null;
    var lengths=[size.x,size.y,size.z].map(function(n){return Math.min(n*0.2,extent*0.06);}),vertices=[];
    for(var corner=0;corner<8;corner++){
      var point=[corner&1?high[0]:low[0],corner&2?high[1]:low[1],corner&4?high[2]:low[2]];
      for(var axis=0;axis<3;axis++){
        var end=point.slice();end[axis]+=(corner&(1<<axis)?-1:1)*lengths[axis];
        vertices.push(point[0],point[1],point[2],end[0],end[1],end[2]);
      }
    }
    var geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    var review=selectionNeedsReview(check),color=new THREE.Color(review?0xf1c67d:0xd4e8ca).convertSRGBToLinear();
    var material=new THREE.LineBasicMaterial({color:color,transparent:true,opacity:0.82,depthTest:false,depthWrite:false,toneMapped:false});
    var frame=new THREE.LineSegments(geometry,material);
    frame.name='gwe-selection-frame';frame.renderOrder=998;
    frame.userData.gwDecorative=true;frame.userData.gwSelectionFrame=true;frame.userData.needsReview=review;
    frame.raycast=function(){};
    return frame;
  }
  function selectedCreationPresetFocus(engine) {
    var snapshot=selectionEditSnapshot(engine),THREE=window.THREE;
    if(!snapshot.ok || !THREE || !engine.camera)return null;
    var box=creationGeometryBounds(engine,snapshot.blocks);if(box.isEmpty())return null;
    var center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    var fov=engine.camera.getEffectiveFOV?engine.camera.getEffectiveFOV():engine.camera.fov,aspect=Number(engine.camera.aspect),tanY=Math.tan(fov*Math.PI/360),tanX=tanY*aspect;
    if(!isFinite(tanX) || tanX<=0 || !isFinite(tanY) || tanY<=0)return null;
    var radius=Math.max(2,size.length()*(1+1/Math.min(tanX,tanY))/1.65);
    return {x:center.x,y:center.y,z:center.z,radius:radius};
  }
  function selectedCreationView(ctx,preset) {
    var engine=window[ENGINE_KEY];
    if(!engine || engine._destroyed || engine._showcase)return false;
    if(preset==='free')return engine.restoreCreationView?engine.restoreCreationView():engine.setViewPreset?engine.setViewPreset('free'):false;
    var directions={front:{azimuth:Math.PI/2,elevation:0.12},side:{azimuth:0,elevation:0.12},top:{azimuth:0,elevation:Math.PI/2-0.04}};
    if(!directions[preset])return false;
    return focusSelectedBuild(ctx,Object.assign({name:preset,zoom:1},directions[preset]));
  }
  function orbitSelectedCreation(ctx,azimuthDelta,elevationDelta,zoomFactor) {
    var engine=window[ENGINE_KEY];
    if(!engine || engine._destroyed || engine._showcase)return false;
    var state=engine._creationFocus,view=state && state.view || {azimuth:Math.atan2(1.25,1.55),elevation:Math.atan2(0.72,Math.sqrt(1.25*1.25+1.55*1.55)),zoom:1};
    var next={name:'orbit',azimuth:view.azimuth+(Number(azimuthDelta)||0),elevation:Math.max(.10,Math.min(Math.PI/2-.04,view.elevation+(Number(elevationDelta)||0))),zoom:Math.max(1,Math.min(3,(view.zoom || 1)*(Number(zoomFactor)||1)))};
    return focusSelectedBuild(ctx,next);
  }
  function focusSelectedBuild(ctx, requestedView) {
    var selected=selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx,false),THREE=window.THREE;
    if(!selected || !THREE)return false;
    var engine=selected.engine,camera=engine.camera;
    if(!camera || !camera.isPerspectiveCamera || engine._showcase || engine._destroyed)return false;
    var initialBox=creationGeometryBounds(engine,selected.measurement.blocks);if(initialBox.isEmpty())return false;
    if(engine._guidedTour && engine.stopGuidedTour)engine.stopGuidedTour(false);
    try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
    if(engine.releaseInput)engine.releaseInput();if(engine.velocity)engine.velocity.set(0,0,0);engine.isLocked=false;engine._entryAnim=null;engine._viewPresetAnim=null;
    engine._builderSelection=Object.assign({blocks:selected.measurement.blocks.slice()},engine._builderSelection && engine._builderSelection.exact?{exact:true}:{});
    var state=engine._creationFocus;
    if(!state){
      state={position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),fov:camera.fov,far:camera.far,
        fog:engine.scene.fog, fogNear:engine.scene.fog && engine.scene.fog.near,fogFar:engine.scene.fog && engine.scene.fog.far,
        lesson:engine._currentLesson,collapsed:!!((ctx.toolData.geometryWorld || {}).sandboxDockCollapsed),frames:[],manual:false,transition:null,lastPosition:camera.position.clone(),lastQuaternion:camera.quaternion.clone()};
      engine._creationFocus=state;
    }
    state.view=requestedView || null;
    state.manual=false;state.returning=false;state.lastPosition.copy(camera.position);state.lastQuaternion.copy(camera.quaternion);
    state.frames.forEach(function(id){window.cancelAnimationFrame(id);});state.frames=[];
    function syncCamera(){state.lastPosition.copy(camera.position);state.lastQuaternion.copy(camera.quaternion);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);camera.updateMatrixWorld(true);}
    function restoreProjection(){camera.fov=state.fov;camera.far=state.far;camera.up.copy(state.up);camera.updateProjectionMatrix();if(engine.scene.fog===state.fog && state.fog){state.fog.near=state.fogNear;state.fog.far=state.fogFar;}}
    engine.disposeCreationFocus=function(){
      if(engine._creationFocus!==state)return;
      state.frames.forEach(function(id){window.cancelAnimationFrame(id);});state.frames=[];
      restoreProjection();engine._creationFocus=null;engine.updateCreationFocus=null;engine.fitCreationFocus=null;engine.restoreCreationView=null;engine.disposeCreationFocus=null;
      patchGeometryState(ctx,{creationFocusAvailable:false});
    };
    function transitionTo(position,quaternion,returning,animate){
      var reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      state.returning=!!returning;state.manual=false;
      state.transition={from:camera.position.clone(),to:position.clone(),fromQuaternion:camera.quaternion.clone(),toQuaternion:quaternion.clone(),elapsed:0,duration:animate && !reduced?0.5:0};
      if(!state.transition.duration)engine.updateCreationFocus(0);
    }
    engine.updateCreationFocus=function(dt){
      if(engine._creationFocus!==state)return;
      if(engine._destroyed || engine._guidedTour || engine._entryAnim || engine._viewPresetAnim){engine.disposeCreationFocus();return;}
      var held=Object.keys(engine.moveState || {}).some(function(key){return engine.moveState[key];}) || Object.keys(engine.lookState || {}).some(function(key){return engine.lookState[key];});
      var touch=engine._touchMoveVec || {},poseChanged=state.lastPosition.distanceToSquared(camera.position)>0.00000001 || Math.abs(state.lastQuaternion.dot(camera.quaternion))<0.99999999;
      if(held || Math.abs(touch.x || 0)+Math.abs(touch.z || 0)>0.001 || poseChanged){
        state.manual=true;state.transition=null;state.lastPosition.copy(camera.position);state.lastQuaternion.copy(camera.quaternion);
        if(state.returning)engine.disposeCreationFocus();
        return;
      }
      var animation=state.transition;if(!animation)return;
      animation.elapsed+=dt;var t=animation.duration?Math.min(1,animation.elapsed/animation.duration):1,ease=1-Math.pow(1-t,3);
      camera.position.copy(animation.from).lerp(animation.to,ease);camera.quaternion.copy(animation.fromQuaternion).slerp(animation.toQuaternion,ease);syncCamera();
      if(t===1){state.transition=null;if(state.returning){
        engine.disposeCreationFocus();patchGeometryState(ctx,{sandboxDockCollapsed:state.collapsed});
        window.requestAnimationFrame(function(){
          if(engine._destroyed || window[ENGINE_KEY]!==engine || engine._currentLesson!==state.lesson)return;
          var control=document.querySelector(state.collapsed?'.gwe-collapse':'.gwe-focus-action');
          if(control)control.focus({preventScroll:true});
        });
      }}
    };
    engine.fitCreationFocus=function(animate){
      if(engine._creationFocus!==state || state.manual || state.returning || engine._showcase)return false;
      var live=engine._builderSelection,box=creationGeometryBounds(engine,live && live.blocks);if(box.isEmpty())return false;
      var ground=engine._currentLesson && engine._currentLesson.ground,groundY=ground && typeof ground.y==='number' && isFinite(ground.y)?ground.y:0;
      var rect=creationFocusRect(engine),fit=fitCreationCamera(box,camera,rect,groundY+2.8,state.view);if(!fit)return false;
      state.rect=rect;state.bounds=box.clone();state.frame=fit;
      camera.far=Math.max(state.far,fit.far);camera.updateProjectionMatrix();
      if(engine.scene.fog===state.fog && state.fog){state.fog.near=Math.max(state.fogNear,fit.depthFar+2);state.fog.far=Math.max(state.fogFar,state.fog.near+80);}
      camera.up.set(0,1,0);var view=camera.clone();view.position.copy(fit.position);view.lookAt(fit.target);
      transitionTo(fit.position,view.quaternion,false,!!animate);return true;
    };
    engine.restoreCreationView=function(){
      if(engine._creationFocus!==state || state.returning)return false;
      try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
      if(engine.releaseInput)engine.releaseInput();if(engine.velocity)engine.velocity.set(0,0,0);engine.isLocked=false;
      state.frames.forEach(function(id){window.cancelAnimationFrame(id);});state.frames=[];
      transitionTo(state.position,state.quaternion,true,true);
      announce(ctx,'Returning to your previous view.','info');return true;
    };
    if(engine.clearDimensionAnnotations)engine.clearDimensionAnnotations();
    if(engine.clearSelectionAnnotations)engine.clearSelectionAnnotations();
    patchGeometryState(ctx,{creationFocusAvailable:true,sandboxDockCollapsed:true,measureResult:null,builderPanel:'build',hudPanel:'',showGameSettings:false});
    state.frames.push(window.requestAnimationFrame(function(){state.frames.push(window.requestAnimationFrame(function(){
      if(engine._creationFocus!==state || engine._destroyed)return;
      if(!engine.fitCreationFocus(true)){engine.disposeCreationFocus();return;}
      if(!requestedView)focusWorldSurface(0);announce(ctx,'Creation framed'+(state.view?' · '+state.view.name+' view':'')+'. Keep building, or choose Previous view to return.','success');
    }));}));
    return true;
  }

  // r128 clears a Color background directly and applies fog after its material
  // encoding chunk. Keep both in the active render target's output space.
  // Own only this Studio callback and these two environment Color objects.
  function installStudioBackdropColorSync(scene, displayHex) {
    var THREE=window.THREE;
    if(!THREE || !scene)return function(){};
    var display=new THREE.Color(displayHex===undefined?0xf1eee8:displayHex),linear=display.clone().convertSRGBToLinear();
    var background=scene.background,fog=scene.fog,previous=scene.onBeforeRender,active=true;
    function syncStudioBackdrop(renderer,renderScene,camera,renderTarget) {
      var result=typeof previous==='function'?previous.apply(this,arguments):undefined;
      if(!active)return result;
      var target=arguments.length>3?renderTarget:renderer && renderer.getRenderTarget?renderer.getRenderTarget():null;
      var encoding=target?(target.texture && target.texture.encoding):renderer && renderer.outputEncoding;
      var color=encoding===THREE.sRGBEncoding?display:linear;
      if(scene.background===background && background && background.isColor)background.copy(color);
      if(scene.fog===fog && fog && fog.color && fog.color.isColor)fog.color.copy(color);
      return result;
    }
    scene.onBeforeRender=syncStudioBackdrop;
    return function() {
      if(!active)return;
      active=false;
      if(scene.onBeforeRender===syncStudioBackdrop)scene.onBeforeRender=previous;
    };
  }

  // Keep the Studio floor's projected shadow soft in world units. This local
  // r128 replacement changes only PCFSoft sampling; construction materials,
  // other shadow modes and the shared shader library remain untouched.
  function configureStudioFloorShadow(material, shadowCamera, worldRadius) {
    var shadowRadius=worldRadius===undefined?0.14:worldRadius;
    if(typeof shadowRadius!=='number' || !isFinite(shadowRadius) || shadowRadius<=0)return false;
    var THREE=window.THREE;
    if(!THREE || !material || material.isMeshStandardMaterial!==true || !shadowCamera)return false;
    var extents=[shadowCamera.left,shadowCamera.right,shadowCamera.bottom,shadowCamera.top];
    if(!extents.every(function(value){return typeof value==='number' && isFinite(value);}))return false;
    var width=shadowCamera.right-shadowCamera.left,height=shadowCamera.top-shadowCamera.bottom;
    if(!isFinite(width) || !isFinite(height) || width<=0 || height<=0)return false;
    var include='#include <shadowmap_pars_fragment>',soft='#elif defined( SHADOWMAP_TYPE_PCF_SOFT )',vsm='#elif defined( SHADOWMAP_TYPE_VSM )';
    var chunk=THREE.ShaderChunk && THREE.ShaderChunk.shadowmap_pars_fragment;
    var standard=THREE.ShaderLib && THREE.ShaderLib.standard && THREE.ShaderLib.standard.fragmentShader;
    if(typeof chunk!=='string' || typeof standard!=='string' || standard.indexOf(include)<0)return false;
    var begin=chunk.indexOf(soft),end=chunk.indexOf(vsm,begin+soft.length);
    if(begin<0 || end<0 || chunk.indexOf(soft,begin+soft.length)>=0)return false;
    var taps=[];
    for(var i=0;i<16;i++){
      var angle=i*Math.PI*(3-Math.sqrt(5)),radius=Math.sqrt((i+0.5)/16);
      taps.push('texture2DCompare( shadowMap, shadowCoord.xy + gweStudioShadowSpread * vec2('+(Math.cos(angle)*radius).toFixed(6)+', '+(Math.sin(angle)*radius).toFixed(6)+'), shadowCoord.z )');
    }
    var body='\n shadow = (\n'+taps.join(' +\n')+'\n ) * 0.0625;\n';
    var replacement='uniform vec2 gweStudioShadowSpread;\n'+chunk.slice(0,begin)+soft+body+chunk.slice(end);
    var spread={value:new THREE.Vector2(shadowRadius/width,shadowRadius/height)};
    material.onBeforeCompile=function(shader){
      if(!shader || typeof shader.fragmentShader!=='string' || shader.fragmentShader.indexOf(include)<0 || !shader.uniforms)return;
      shader.uniforms.gweStudioShadowSpread=spread;
      shader.fragmentShader=shader.fragmentShader.replace(include,replacement);
    };
    material.customProgramCacheKey=function(){return 'gwe-studio-floor-vogel16-v1';};
    material.needsUpdate=true;
    return true;
  }

  // Measure only the persistent presentation controls. File panels, PNG buffer
  // sizes and the hidden building HUD do not change the model composition.
  function showcaseCompositionRect(engine) {
    var canvas=engine && engine.renderer && engine.renderer.domElement,area=null;
    if(canvas && typeof canvas.getBoundingClientRect==='function')area=canvas.getBoundingClientRect();
    var measured=!!(area && area.width>0 && area.height>0);
    var width=measured?area.width:Number(canvas && (canvas.clientWidth || canvas.width)) || 800;
    var height=measured?area.height:Number(canvas && (canvas.clientHeight || canvas.height)) || 600;
    if(!isFinite(width) || width<=0)width=800;if(!isFinite(height) || height<=0)height=600;
    var origin={left:measured?area.left:0,top:measured?area.top:0,width:width,height:height};
    var margin=Math.min(12,width*0.04,height*0.04),gap=10;
    var pixels={left:margin,right:width-margin,top:margin,bottom:height-margin},observed=false;
    var workspace=canvas && canvas.closest && canvas.closest('#geoworld-fs-workspace');
    var overlay=workspace && workspace.querySelector && workspace.querySelector('.gwe-showcase');
    if(measured && overlay && overlay.querySelectorAll)overlay.querySelectorAll('.gwe-showcase-caption,.gwe-showcase-tools,.gwe-showcase-orbit').forEach(function(node){
      var style=window.getComputedStyle?window.getComputedStyle(node):null,r=node.getBoundingClientRect();
      if(style && (style.display==='none' || style.visibility==='hidden') || !r.width || !r.height)return;
      var left=r.left-origin.left,right=r.right-origin.left,top=r.top-origin.top,bottom=r.bottom-origin.top;
      if(right<=0 || left>=width || bottom<=0 || top>=height)return;
      observed=true;
      if(node.classList.contains('gwe-showcase-caption'))pixels.top=Math.max(pixels.top,bottom+gap);
      else if(node.classList.contains('gwe-showcase-tools'))pixels.bottom=Math.min(pixels.bottom,top-gap);
      else if((left+right)/2<width/2)pixels.left=Math.max(pixels.left,right+gap);
      else pixels.right=Math.min(pixels.right,left-gap);
    });
    // A first/no-DOM fit stays usable until the committed controls are measured.
    if(!observed || pixels.right<=pixels.left || pixels.bottom<=pixels.top){
      pixels={left:width*0.12,right:width*0.88,top:height*0.2,bottom:height*0.78};observed=false;
    }
    pixels.left=Math.max(0,pixels.left);pixels.right=Math.min(width,pixels.right);pixels.top=Math.max(0,pixels.top);pixels.bottom=Math.min(height,pixels.bottom);
    return {rect:{left:pixels.left/width*2-1,right:pixels.right/width*2-1,bottom:1-pixels.bottom/height*2,top:1-pixels.top/height*2},pixelRect:pixels,canvasRect:origin,fallback:!observed};
  }
  // Fit perspective depth into an offset rectangle without changing the chosen
  // bearing. A ground constraint raises the parallel view only when necessary.
  function fitShowcaseCamera(box,camera,rect,bearing,screenUp,minCameraY) {
    var THREE=window.THREE;
    if(!THREE || !box || !box.min || !box.max || !camera || !bearing || !screenUp)return null;
    var coordinates=[box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z];
    if(!coordinates.every(function(n){return typeof n==='number' && isFinite(n);}) || box.min.x>box.max.x || box.min.y>box.max.y || box.min.z>box.max.z)return null;
    var aspect=Number(camera.aspect),fov=Number(camera.getEffectiveFOV?camera.getEffectiveFOV():camera.fov);
    if(!isFinite(aspect) || aspect<=0 || !isFinite(fov) || fov<=0 || fov>=179.9)return null;
    var direction=bearing.clone().normalize(),right=new THREE.Vector3().crossVectors(screenUp,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
    if(![direction.x,direction.y,direction.z,right.x,right.y,right.z,up.x,up.y,up.z].every(isFinite) || direction.lengthSq()<0.99 || right.lengthSq()<0.99)return null;
    rect=rect || {left:-0.8,right:0.8,bottom:-0.6,top:0.7};
    if(![rect.left,rect.right,rect.bottom,rect.top].every(function(n){return typeof n==='number' && isFinite(n);}))return null;
    var left=Math.max(-1,rect.left),rightEdge=Math.min(1,rect.right),bottom=Math.max(-1,rect.bottom),top=Math.min(1,rect.top);
    if(rightEdge<=left || top<=bottom)return null;
    var cx=(left+rightEdge)/2,cy=(bottom+top)/2,hx=(rightEdge-left)*0.48,hy=(top-bottom)*0.48;
    var safe={left:cx-hx,right:cx+hx,bottom:cy-hy,top:cy+hy},tanY=Math.tan(fov*Math.PI/360),tanX=tanY*aspect;
    var near=Number(camera.near);if(!isFinite(near) || near<=0)near=0.1;
    var clearance=Math.max(0.05,near*0.5),distance=near+clearance,upperDistance=Infinity,corners=[];
    var center=box.getCenter(new THREE.Vector3());
    [box.min.x,box.max.x].forEach(function(x){[box.min.y,box.max.y].forEach(function(y){[box.min.z,box.max.z].forEach(function(z){
      var point=new THREE.Vector3(x,y,z).sub(center),px=point.dot(right),py=point.dot(up),pz=point.dot(direction);
      corners.push({x:px,y:py,z:pz});
      distance=Math.max(distance,pz+near+clearance,pz+Math.abs(px+cx*pz*tanX)/(hx*tanX),pz+Math.abs(py+cy*pz*tanY)/(hy*tanY));
    });});});
    function constrain(slope,amount){
      if(Math.abs(slope)<1e-10){if(amount>1e-8)upperDistance=-Infinity;}
      else if(slope>0)distance=Math.max(distance,amount/slope);
      else upperDistance=Math.min(upperDistance,amount/slope);
    }
    var floor=typeof minCameraY==='number' && isFinite(minCameraY)?minCameraY:-Infinity;
    var heightSlope=direction.y-cx*tanX*right.y;
    if(isFinite(floor)){
      if(Math.abs(up.y)>1e-10){
        var groundConstant=(floor-center.y)/up.y,groundSlope=-heightSlope/up.y;
        corners.forEach(function(point){
          if(up.y>0)constrain(-groundSlope-safe.bottom*tanY,groundConstant-point.y-safe.bottom*tanY*point.z);
          else constrain(groundSlope+safe.top*tanY,point.y+safe.top*tanY*point.z-groundConstant);
        });
      }else constrain(heightSlope,floor-center.y);
    }
    distance+=Math.max(0.00001,distance*1e-7);
    if(!isFinite(distance) || distance>upperDistance+1e-7)return null;
    var sx=-cx*distance*tanX,sy=-cy*distance*tanY;
    if(isFinite(floor) && Math.abs(up.y)>1e-10){
      var groundShift=(floor-center.y-distance*direction.y-sx*right.y)/up.y;
      sy=up.y>0?Math.max(sy,groundShift):Math.min(sy,groundShift);
    }
    var shift=right.clone().multiplyScalar(sx).addScaledVector(up,sy),target=center.clone().add(shift),position=target.clone().addScaledVector(direction,distance);
    var depthNear=Infinity,depthFar=-Infinity;corners.forEach(function(point){depthNear=Math.min(depthNear,distance-point.z);depthFar=Math.max(depthFar,distance-point.z);});
    var diagonal=box.getSize(new THREE.Vector3()).length(),oldFar=Number(camera.far),far=Math.max(isFinite(oldFar)?oldFar:200,depthFar+Math.max(10,diagonal*0.05));
    if(![position.x,position.y,position.z,target.x,target.y,target.z,depthNear,depthFar,far].every(isFinite))return null;
    return {position:position,target:target,distance:distance,far:far,depthNear:depthNear,depthFar:depthFar,rect:safe};
  }
  function scheduleShowcaseLayoutFit(engine) {
    var session=engine && engine._showcase;
    if(!session || !engine.fitShowcase)return;
    if(session.fitFrame!=null && window.cancelAnimationFrame)window.cancelAnimationFrame(session.fitFrame);
    if(!window.requestAnimationFrame){engine.fitShowcase();return;}
    session.fitFrame=window.requestAnimationFrame(function(){session.fitFrame=null;if(engine._showcase===session && !engine._destroyed && engine.fitShowcase)engine.fitShowcase();});
    return function(){if(session.fitFrame!=null && window.cancelAnimationFrame)window.cancelAnimationFrame(session.fitFrame);session.fitFrame=null;};
  }
  function showcaseBuild(ctx) {
    var selected = selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx, false);
    var THREE = window.THREE;
    if (!selected || !THREE) return;
    var engine = selected.engine, camera = engine.camera;
    if (!camera || engine._showcase) return;
    if(engine.disposeCreationFocus)engine.disposeCreationFocus();
    var box = creationGeometryBounds(engine,selected.measurement.blocks);
    if (box.isEmpty()) return;
    if (engine._guidedTour && engine.stopGuidedTour) engine.stopGuidedTour(false);
    try { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); } catch (_) {}
    var saved = {position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),fov:camera.fov,far:camera.far,view:'perspective',
      fog:engine.scene.fog ? {near:engine.scene.fog.near,far:engine.scene.fog.far}:null,
      collapsed:!!(ctx.toolData.geometryWorld || {}).sandboxDockCollapsed, hidden:[]};
    selected.measurement.blocks.forEach(function(p){var mesh=engine.blocks[keyFor(p)];saved.hidden.push([mesh,mesh.visible]);mesh.visible=true;});
    [engine._dimLines,engine._selectionGlows,engine._layerGhosts,engine._angleHelpers,engine._netHelpers,[engine._rulerLine,engine._rulerLabel,engine._ghostMesh,engine._highlightMesh,engine._hoverGlowMesh].filter(Boolean)].forEach(function(list){(list || []).forEach(function(o){saved.hidden.push([o,o.visible]);o.visible=false;});});
    if(engine._builderSelectionFrame)engine._builderSelectionFrame.visible=false;
    engine._showcase = saved; engine.isLocked=false;engine._touchActive=false;engine._entryAnim=null;engine._viewPresetAnim=null;
    engine._touchLookId=null;engine._touchLookStart=null;engine._touchMoveId=null;engine._touchMoveStart=null;engine._touchMoveVec={x:0,z:0};
    if(engine.velocity)engine.velocity.set(0,0,0);
    Object.keys(engine.moveState || {}).forEach(function(key){engine.moveState[key]=false;});
    Object.keys(engine.lookState || {}).forEach(function(key){engine.lookState[key]=false;});
    var center=box.getCenter(new THREE.Vector3()),radius=Math.max(0.8,box.getSize(new THREE.Vector3()).length()/2);
    // Presentation objects belong to this session only. They never become blocks,
    // material overrides, pick targets, or printable geometry.
    function disposeStudioLook() {
      var studio=saved.studio;if(!studio)return;
      saved.studio=null;
      if(studio.releaseBackdropColorSync)studio.releaseBackdropColorSync();
      engine.scene.background=studio.background;engine.scene.fog=studio.fog;
      studio.hidden.forEach(function(entry){entry[0].visible=entry[1];});
      studio.effects.forEach(function(entry){entry[0].enabled=entry[1];});
      if(studio.group.parent)studio.group.parent.remove(studio.group);
      studio.resources.forEach(function(resource){if(resource && resource.dispose)resource.dispose();});
      studio.lights.forEach(function(light){if(light.shadow){if(light.shadow.map)light.shadow.map.dispose();if(light.shadow.mapPass)light.shadow.mapPass.dispose();}});
      saved.look='meadow';
    }
    function studioColor(hex){return new THREE.Color(hex).convertSRGBToLinear();}
    function suspendStudioBloom(studio){
      var passes=engine.composer && engine.composer.passes;if(!passes || !THREE.UnrealBloomPass)return;
      for(var i=0;i<passes.length;i++){
        var pass=passes[i];if(!(pass instanceof THREE.UnrealBloomPass))continue;
        var known=false;for(var j=0;j<studio.effects.length;j++)if(studio.effects[j][0]===pass){known=true;break;}
        if(!known)studio.effects.push([pass,pass.enabled]);pass.enabled=false;
      }
    }
    function createStudioLook() {
      var studio={background:engine.scene.background,fog:engine.scene.fog,hidden:[],resources:[],lights:[],effects:[],group:new THREE.Group()};
      studio.group.name='gwe-studio-stage';studio.group.userData.gwDecorative=true;
      var selectedMeshes=selected.measurement.blocks.map(function(p){return engine.blocks[keyFor(p)];});
      var selectedIds={};selectedMeshes.forEach(function(mesh){selectedIds[mesh.id]=true;});
      // Isolate the creation while retaining each exact visibility for Meadow.
      engine.scene.children.slice().forEach(function(object){
        if(selectedIds[object.id] || object===camera)return;
        // The current selection frame has its own lifecycle; never restore a stale one.
        if(object===engine._builderSelectionFrame){object.visible=false;return;}
        studio.hidden.push([object,object.visible]);object.visible=false;
      });
      saved.studio=studio;suspendStudioBloom(studio);
      var ivory=studioColor(0xf1eee8),floorY=box.min.y-0.015;
      engine.scene.background=ivory;
      engine.scene.fog=new THREE.Fog(ivory,55,145);
      studio.releaseBackdropColorSync=installStudioBackdropColorSync(engine.scene,0xf1eee8);
      var floorGeometry=new THREE.PlaneGeometry(600,600);
      var floorMaterial=new THREE.MeshStandardMaterial({color:studioColor(0xb8b8b7),roughness:0.98,metalness:0});
      var floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.name='gwe-studio-floor';
      floor.rotation.x=-Math.PI/2;floor.position.set(center.x,floorY,center.z);floor.receiveShadow=true;
      floor.raycast=function(){};studio.floor=floor;studio.group.add(floor);studio.resources.push(floorGeometry,floorMaterial);
      // A broad, almost imperceptible pool of light gives the seamless stage
      // depth. It is a two-triangle decoration, never a presentation pedestal.
      var poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=128;
      var poolContext=poolCanvas.getContext('2d'),poolGradient=poolContext.createRadialGradient(64,64,0,64,64,64);
      poolGradient.addColorStop(0,'rgba(255,250,237,0.48)');poolGradient.addColorStop(0.45,'rgba(255,250,237,0.22)');poolGradient.addColorStop(1,'rgba(255,250,237,0)');
      poolContext.fillStyle=poolGradient;poolContext.fillRect(0,0,128,128);
      var poolTexture=new THREE.CanvasTexture(poolCanvas);poolTexture.encoding=THREE.sRGBEncoding;poolTexture.generateMipmaps=false;poolTexture.minFilter=poolTexture.magFilter=THREE.LinearFilter;
      var poolGeometry=new THREE.PlaneGeometry(Math.max(8,(box.max.x-box.min.x)*3.2),Math.max(8,(box.max.z-box.min.z)*3.2));
      var poolMaterial=new THREE.MeshBasicMaterial({map:poolTexture,transparent:true,opacity:0.22,depthWrite:false,toneMapped:false});
      var pool=new THREE.Mesh(poolGeometry,poolMaterial);pool.name='gwe-studio-light-pool';pool.rotation.x=-Math.PI/2;pool.position.set(center.x,floorY+0.002,center.z);pool.raycast=function(){};
      studio.group.add(pool);studio.resources.push(poolGeometry,poolMaterial,poolTexture);
      var footprints=studioGroundFootprints(selectedMeshes,box.min.y,engine._popBlocks),contactMap=studioContactMap(footprints,box);
      var contactTexture=new THREE.CanvasTexture(contactMap.canvas);contactTexture.encoding=THREE.sRGBEncoding;contactTexture.generateMipmaps=false;contactTexture.minFilter=contactTexture.magFilter=THREE.LinearFilter;
      var contactGeometry=new THREE.PlaneGeometry(contactMap.width,contactMap.depth);
      var contactMaterial=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:0.075,depthWrite:false,toneMapped:false});
      var contact=new THREE.Mesh(contactGeometry,contactMaterial);contact.name='gwe-studio-contact-shadow';contact.rotation.x=-Math.PI/2;
      contact.position.set(center.x,floorY+0.004,center.z);contact.raycast=function(){};studio.group.add(contact);
      studio.contactFootprints=footprints;studio.resources.push(contactGeometry,contactMaterial,contactTexture);
      floor.onBeforeRender=function(){suspendStudioBloom(studio);contactMaterial.opacity=engine.renderer.shadowMap.enabled?0.075:0.22;};
      var studioRadius=Math.max(2,radius),target=new THREE.Object3D();target.position.copy(center);studio.group.add(target);
      var key=new THREE.DirectionalLight(0xfff1df,1.0);key.name='gwe-studio-key';
      key.position.set(center.x-studioRadius*0.95,center.y+studioRadius*3.4,center.z+studioRadius*1.2);key.target=target;key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=key.shadow.camera.bottom=-studioRadius*1.4;key.shadow.camera.right=key.shadow.camera.top=studioRadius*1.4;
      key.shadow.camera.near=0.1;key.shadow.camera.far=studioRadius*6+10;key.shadow.bias=-0.00035;key.shadow.normalBias=0.025;
      configureStudioFloorShadow(floorMaterial,key.shadow.camera,Math.min(0.14,radius*0.03));
      var fill=new THREE.DirectionalLight(0xe8efff,0.3);fill.name='gwe-studio-fill';fill.position.set(center.x+studioRadius*2,center.y+studioRadius,center.z-studioRadius);fill.target=target;
      var rim=new THREE.DirectionalLight(0xffffff,0.25);rim.name='gwe-studio-rim';rim.position.set(center.x-studioRadius,center.y+studioRadius,center.z-studioRadius*2);rim.target=target;
      var hemi=new THREE.HemisphereLight(0xfffaef,0x9b907c,0.64);hemi.name='gwe-studio-ambient';
      studio.lights=[key,fill,rim,hemi];studio.lights.forEach(function(light){studio.group.add(light);});
      engine.scene.add(studio.group);saved.look='studio';
    }
    engine.disposeShowcaseLook=disposeStudioLook;
    engine.setShowcaseLook=function(look){
      if(!engine._showcase || (look!=='meadow' && look!=='studio'))return;
      if((saved.look || 'meadow')===look)return;
      try{if(look==='studio')createStudioLook();else disposeStudioLook();}
      catch(error){disposeStudioLook();engine.fitShowcase();patchGeometryState(ctx,{showcaseLook:'meadow'});announce(ctx,'Studio could not open. Your creation is still available in Meadow.','error');return;}
      engine.fitShowcase();patchGeometryState(ctx,{showcaseLook:look});
    };

    var perspectiveDirection=new THREE.Vector3(1.25,0.72,1.55).normalize(),direction=perspectiveDirection.clone();
    engine.setShowcaseView=function(view){
      if(!engine._showcase || ['perspective','front','side','top'].indexOf(view)===-1)return;
      saved.view=view;
      if(view==='front')direction.set(0,0,1);
      else if(view==='side')direction.set(1,0,0);
      else if(view==='top')direction.set(0,1,0);
      else direction.copy(perspectiveDirection);
      engine.fitShowcase();patchGeometryState(ctx,{showcaseView:view});
    };
    engine.rotateShowcase=function(step){
      if(!engine._showcase || !isFinite(step))return;
      if(saved.view!=='perspective')direction.copy(perspectiveDirection);
      saved.view='perspective';direction.applyAxisAngle(new THREE.Vector3(0,1,0),step*Math.PI/6);
      engine.fitShowcase();patchGeometryState(ctx,{showcaseView:'perspective'});
    };
    engine.fitShowcase=function(){
      if(engine._showcase!==saved || engine._destroyed)return false;
      if(engine._showcaseExporting){saved.fitPending=true;return false;}
      saved.fitPending=false;
      camera.fov=42;camera.updateProjectionMatrix();
      var viewUp=new THREE.Vector3(0,saved.view==='top'?0:1,saved.view==='top'?-1:0);
      var composition=showcaseCompositionRect(engine),ground=engine._currentLesson && engine._currentLesson.ground;
      var groundY=ground && typeof ground.y==='number' && isFinite(ground.y)?ground.y:0;
      var minCameraY=Math.max(groundY+0.15,box.min.y+0.03);
      var fit=fitShowcaseCamera(box,camera,composition.rect,direction,viewUp,minCameraY);if(!fit)return false;
      camera.up.copy(viewUp);camera.far=Math.max(saved.far,fit.far);camera.updateProjectionMatrix();
      camera.position.copy(fit.position);camera.lookAt(fit.target);
      if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);camera.updateMatrixWorld(true);
      if(saved.fog && engine.scene.fog){engine.scene.fog.near=Math.max(saved.fog.near,fit.depthFar+2);engine.scene.fog.far=Math.max(saved.fog.far,engine.scene.fog.near+Math.max(80,radius));}
      if(saved.studio && saved.studio.floor){
        var tangent=Math.tan(camera.getEffectiveFOV()*Math.PI/360);
        var fogDepth=engine.scene.fog && isFinite(engine.scene.fog.far)?engine.scene.fog.far:camera.far;
        var fogCornerDistance=fogDepth*Math.sqrt(1+tangent*tangent*(1+camera.aspect*camera.aspect));
        // The stage remains centered on the creation, including an offset view.
        var floorHalf=Math.max(300,camera.position.distanceTo(center)+fogCornerDistance+radius+10);
        saved.studio.floor.scale.set(floorHalf/300,floorHalf/300,1);
      }
      var area=composition.canvasRect,rect=fit.rect;
      saved.composition={rect:rect,pixelRect:{left:(rect.left+1)*area.width/2,right:(rect.right+1)*area.width/2,top:(1-rect.top)*area.height/2,bottom:(1-rect.bottom)*area.height/2},canvasRect:area,fallback:composition.fallback,position:fit.position.clone(),target:fit.target.clone(),depthNear:fit.depthNear,depthFar:fit.depthFar,bounds:box.clone(),minCameraY:minCameraY,view:saved.view};
      return true;
    };
    engine.endShowcase=function(){
      var previous=engine._showcase;if(!previous)return;
      if(previous.fitFrame!=null && window.cancelAnimationFrame)window.cancelAnimationFrame(previous.fitFrame);previous.fitFrame=null;
      disposeStudioLook();
      camera.position.copy(previous.position);camera.quaternion.copy(previous.quaternion);camera.up.copy(previous.up);camera.fov=previous.fov;camera.far=previous.far;camera.updateProjectionMatrix();
      if(previous.fog && engine.scene.fog){engine.scene.fog.near=previous.fog.near;engine.scene.fog.far=previous.fog.far;}
      if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
      previous.hidden.forEach(function(entry){entry[0].visible=entry[1];});
      engine._showcase=null;engine.fitShowcase=null;engine.rotateShowcase=null;engine.endShowcase=null;engine.setShowcaseLook=null;engine.setShowcaseView=null;engine.disposeShowcaseLook=null;
      if(engine._builderSelectionFrame && engine._builderSelectionFrame.parent && !engine._destroyed)engine._builderSelectionFrame.visible=true;
      patchGeometryState(ctx,{showcaseActive:false,sandboxDockCollapsed:previous.collapsed});focusWorldSurface(30);
    };
    engine.fitShowcase();
    patchGeometryState(ctx,{showcaseActive:true,showcaseLook:'meadow',showcaseView:'perspective',showcaseSaving:!!engine._showcaseExporting,sandboxDockCollapsed:true});
    setTimeout(function(){var button=document.getElementById('gwe-showcase-close');if(button)button.focus();},30);
    announce(ctx,'Showcase view. Your creation is framed for viewing. Press Escape to return to building.','success');
  }
  function showcaseExportSize(width, height, limit) {
    width=Number(width);height=Number(height);
    if(!isFinite(width) || !isFinite(height) || width<=0 || height<=0)throw new Error('The scene has no visible size.');
    var edge=Math.max(1,Math.min(2048,Math.floor(Number(limit) || 2048)));
    return width>=height ? {width:edge,height:Math.max(1,Math.round(edge*height/width))} : {width:Math.max(1,Math.round(edge*width/height)),height:edge};
  }
  function captureShowcaseImage(engine) {
    return new Promise(function(resolve,reject){
      var THREE=window.THREE,renderer=engine && engine.renderer,composer=engine && engine.composer;
      var snapshot=null,size=null,failure=null,settled=false;
      var timer=null;
      function finish(blob,error){
        // Native toBlob snapshots before returning, then encodes asynchronously.
        // Wait a microtask as well so even synchronous test/host callbacks observe
        // the restored live renderer, and restoration errors cannot be lost.
        Promise.resolve().then(function(){
          if(settled)return;settled=true;clearTimeout(timer);
          if(failure || error || !blob){reject(failure || error || new Error('The image could not be encoded.'));return;}
          resolve({blob:blob,width:size.width,height:size.height});
        });
      }
      function restore(action){try{action();}catch(error){failure=failure || error;}}
      try {
        if(!THREE || !renderer || !renderer.domElement || !renderer.domElement.toBlob)throw new Error('The scene is not ready for an image.');
        var liveSize=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio();
        var limit=2048,cap=renderer.capabilities && renderer.capabilities.maxTextureSize;
        if(isFinite(cap) && cap>0)limit=Math.min(limit,cap);
        try {
          var gl=renderer.getContext(),renderLimit=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),viewportLimit=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
          if(isFinite(renderLimit) && renderLimit>0)limit=Math.min(limit,renderLimit);
          if(viewportLimit && viewportLimit.length===2)limit=Math.min(limit,viewportLimit[0],viewportLimit[1]);
        }catch(_){}
        size=showcaseExportSize(liveSize.x,liveSize.y,limit);
        var useComposer=!!(composer && engine._postFxEnabled!==false && typeof composer.render==='function');
        snapshot={width:liveSize.x,height:liveSize.y,ratio:ratio,
          target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),
          autoClear:renderer.autoClear,clearColor:renderer.getClearColor(new THREE.Color()).clone(),clearAlpha:renderer.getClearAlpha(),xr:renderer.xr && renderer.xr.enabled,
          composer:useComposer ? {width:composer._width,height:composer._height,ratio:composer._pixelRatio,read:composer.readBuffer,write:composer.writeBuffer,renderToScreen:composer.renderToScreen,
            passes:(composer.passes || []).map(function(pass){return {pass:pass,renderToScreen:pass.renderToScreen};})}:null};
        // Keep the CSS viewport and camera unchanged. Re-render the actual scene
        // at up to 2048 on the long edge (at most 4.2 MP), never upscale pixels.
        renderer.setPixelRatio(1);renderer.setSize(size.width,size.height,false);
        renderer.setRenderTarget(null);renderer.setScissorTest(false);
        if(renderer.xr)renderer.xr.enabled=false;
        if(useComposer){if(composer.setPixelRatio)composer.setPixelRatio(1);composer.setSize(size.width,size.height);composer.render();}
        else renderer.render(engine.scene,engine.camera);
        renderer.domElement.toBlob(function(blob){finish(blob);},'image/png');
      } catch(error) {failure=error;finish(null,error);}
      finally {
        if(snapshot){
          // Restore logical dimensions before DPR to avoid a temporary oversized
          // buffer on high-DPR displays. Attempt every restore even if one fails.
          restore(function(){renderer.setSize(snapshot.width,snapshot.height,false);});
          restore(function(){renderer.setPixelRatio(snapshot.ratio);});
          if(snapshot.composer){
            restore(function(){composer.setSize(snapshot.composer.width,snapshot.composer.height);});
            restore(function(){if(composer.setPixelRatio)composer.setPixelRatio(snapshot.composer.ratio);});
            restore(function(){composer.readBuffer=snapshot.composer.read;composer.writeBuffer=snapshot.composer.write;composer.renderToScreen=snapshot.composer.renderToScreen;
              snapshot.composer.passes.forEach(function(entry){entry.pass.renderToScreen=entry.renderToScreen;});});
          }
          restore(function(){renderer.setRenderTarget(snapshot.target);});
          restore(function(){renderer.setViewport(snapshot.viewport);});
          restore(function(){renderer.setScissor(snapshot.scissor);renderer.setScissorTest(snapshot.scissorTest);});
          restore(function(){renderer.autoClear=snapshot.autoClear;renderer.setClearColor(snapshot.clearColor,snapshot.clearAlpha);if(renderer.xr)renderer.xr.enabled=snapshot.xr;});
          if(failure)finish(null,failure);
        }
        // Bound encoding after GPU rendering and restoration have completed.
        timer=setTimeout(function(){if(!settled){settled=true;reject(new Error('Image encoding took too long.'));}},20000);
      }
    });
  }
  function saveShowcaseImage(ctx) {
    var engine=window[ENGINE_KEY];if(!engine || !engine.renderer || engine._showcaseExporting)return Promise.resolve(false);
    engine._showcaseExporting=true;patchGeometryState(ctx,{showcaseSaving:true});
    announce(ctx,'Rendering a high-resolution image.','info');
    return captureShowcaseImage(engine).then(function(result){
      downloadBlob(result.blob,'geometry-world-creation.png');
      announce(ctx,'Image saved at '+result.width+' by '+result.height+' pixels.','success');return true;
    }).catch(function(){announce(ctx,'The image could not be saved. Your view is unchanged; try again.','error');return false;}).finally(function(){
      engine._showcaseExporting=false;
      if(window[ENGINE_KEY]===engine && !engine._destroyed){
        patchGeometryState(ctx,{showcaseSaving:false});
        if(engine._showcase && engine._showcase.fitPending)scheduleShowcaseLayoutFit(engine);
      }
    });
  }

  function measureSelectedBuild(ctx) {
    var selected = aimedStudentMeasurement(ctx, true);
    if (!selected) return;
    selected.engine._builderSelection = { blocks: selected.measurement.blocks.slice() };
    patchGeometryState(ctx, { measureResult:selected.measurement, builderPanel:'build', hudPanel:'' });
    var dockBody = typeof document !== 'undefined' && document.querySelector('.gwe-builder-body');
    if (dockBody) dockBody.scrollTop = 0;
    announce(ctx, 'Measured ' + selected.measurement.count + ' connected student block' + (selected.measurement.count === 1 ? '' : 's') + '.', 'success');
  }
  // STL does not carry units. Convert a copy to millimetres, retaining face
  // normals, triangle attributes and the original block-unit handoff bytes.
  function scaleStlForDownload(buffer, unitMm) {
    if (!buffer || buffer.byteLength < 84) throw new Error('The selected STL is incomplete.');
    var sourceView=new DataView(buffer), count=sourceView.getUint32(80,true);
    if (84+count*50 !== buffer.byteLength) throw new Error('The selected STL triangle data is incomplete.');
    unitMm=printUnit(unitMm);
    var copy=buffer.slice(0), view=new DataView(copy), header='Geometry World; coordinates in mm; '+unitMm+' mm per block', headerBytes=new Uint8Array(copy,0,80);
    headerBytes.fill(0);for(var hi=0;hi<Math.min(80,header.length);hi++)headerBytes[hi]=header.charCodeAt(hi);
    for(var triangle=0;triangle<count;triangle++){
      for(var coordinate=12;coordinate<48;coordinate+=4){var offset=84+triangle*50+coordinate;view.setFloat32(offset,view.getFloat32(offset,true)*unitMm,true);}
    }
    return copy;
  }
  function selectedBuildStlDownload(ctx) {
    var engine=window[ENGINE_KEY];
    if (engine && engine._showcaseExporting) { announce(ctx,'Wait for the Showcase image to finish saving.','info');return false; }
    var bundle, unitMm=printUnit(printContext(ctx).unitMm);
    try {
      var selected=selectionMeasurement(engine);
      if (!selected) { announce(ctx,'Select a creation before downloading its STL.','info');return false; }
      bundle=buildGeometryWorldStl(engine,selected.measurement.blocks,{title:'Geometry World selected build'});
      downloadBlob(new Blob([scaleStlForDownload(bundle.buffer,unitMm)],{type:'model/stl'}),'geometry-world-selected-build-mm.stl');
    } catch(error) { announce(ctx,error && error.message ? error.message : 'The selected STL could not be saved.','error');return false; }
    announce(ctx,'Downloaded '+bundle.blockCount+' selected block'+(bundle.blockCount===1?'':'s')+' in millimeters at '+unitMm+' mm per block. Import the STL at 100% scale.','success');
    return true;
  }
  function openSelectedBuildInPrintLab(ctx) {
    var engine=window[ENGINE_KEY];
    if (engine && engine._showcaseExporting) { announce(ctx,'Wait for the Showcase image to finish saving.','info');return false; }
    var selected = selectionMeasurement(engine) || (!(engine && engine._showcase) && aimedStudentMeasurement(ctx, false));
    if (!selected) { if(engine && engine._showcase)announce(ctx,'Select a creation before opening Print Lab.','info');return false; }
    var eng = selected.engine;
    var measurement = selected.measurement;
    if (!measurement || measurement.isComplete === false) { announce(ctx, 'The selected build could not be measured completely.', 'error'); return; }
    var bundle;
    try { bundle = buildGeometryWorldStl(eng, measurement.blocks, { title: 'Geometry World selected build' }); }
    catch (error) { announce(ctx, error && error.message ? error.message : 'The selected build could not be prepared.', 'error'); return; }
    eng._builderSelection = Object.assign({blocks:measurement.blocks.slice()},eng._builderSelection && eng._builderSelection.exact?{exact:true}:{});
    var projectId = 'gw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    var context = printContext(ctx);
    var navigating=ctx && typeof ctx.setStemLabTool === 'function', presentation=eng._showcase;
    // Finish presentation synchronously before capturing the editable return
    // project. React state may still describe Showcase in this event handler.
    if (navigating && presentation) {
      try {
        if (typeof eng.endShowcase !== 'function') throw new Error('Return to building before opening Print Lab.');
        eng.endShowcase();
        if (eng._showcase) throw new Error('Showcase could not return to the building view.');
      } catch(error) { announce(ctx,error && error.message ? error.message : 'The building view could not be restored.','error');return false; }
    }
    var project=captureProject(ctx,eng,projectId);
    if (navigating) {
      project.state.showcaseActive=false;project.state.showcaseSaving=false;
      if (presentation) project.state.sandboxDockCollapsed=!!presentation.collapsed;
    }
    window.__alloGeometryWorldReturnProject = project;
    window.__alloPrintLabPendingHandoff = {
      schema: 'alloflow-print-source/1',
      id: projectId, projectId: projectId, coordinateSystem: 'z-up',
      sourceTool: 'geometryWorld', format: 'STL',
      bytes: new Uint8Array(bundle.buffer),
      sourceName: 'geometry-world-selected-build.stl',
      title: 'Geometry World build - ' + bundle.blockCount + ' blocks',
      description: 'Created from the selected Geometry World student blocks. Virtual block materials are appearance labels; choose the physical filament in Print Lab.',
      unitMm: printUnit(context.unitMm), aiUse:context.aiUse || 'NONE', aiDisclosure:context.aiDisclosure || '',
      sourceModel: bundle.sourceModel,
      summary: { blockCount: bundle.blockCount, triangleCount: bundle.triangleCount, shapedCount: bundle.shapedCount, dimensions: bundle.dimensions }
    };
    if (eng.logEvent) eng.logEvent('print_lab_handoff', { blocks: bundle.blockCount, triangles: bundle.triangleCount, shapedBlocks: bundle.shapedCount });
    if (navigating) {
      announce(ctx, 'Selected build prepared locally. Opening Print Lab.', 'success');
      ctx.setStemLabTool('printLab');
    } else {
      // The Print Lab handoff carries block units plus an explicit scale. A
      // standalone STL has no unit metadata, so apply that scale to a copy of
      // its vertices before download. Keep the handoff and source unchanged.
      var unitMm=printUnit(context.unitMm),downloadBuffer=scaleStlForDownload(bundle.buffer,unitMm);
      downloadBlob(new Blob([downloadBuffer], { type: 'model/stl' }), 'geometry-world-selected-build-mm.stl');
      announce(ctx, 'Print Lab navigation is unavailable here. The STL was downloaded in millimeters at '+unitMm+' mm per block. Import it at 100% scale.', 'info');
    }
  }

  function restorePendingEditableBuild(ctx, engine) {
    var pending = window.__alloGeometryWorldPendingBuild;
    if (!pending) return false;
    if (restoreProject(ctx, engine, pending)) { delete window.__alloGeometryWorldPendingBuild; return true; }
    var source = pending.sourceModel;
    var blocks = source && source.schema === 'alloflow-geometry-world-build/1' && Array.isArray(source.blocks) ? source.blocks : null;
    delete window.__alloGeometryWorldPendingBuild;
    if (!blocks || !blocks.length) { announce(ctx, 'The returning Geometry World source was invalid and was not opened.', 'error'); return true; }
    var clean = [], requestedCount = 0;
    var seen = {};
    blocks.forEach(function (block) {
      var next = sanitizeSourceBlock(block, false);
      var key = next && keyFor(next);
      if (!next || seen[key]) return;
      seen[key] = true;
      requestedCount++;
      if (clean.length < MAX_BLOCKS) clean.push(next);
    });
    if (!clean.length) { announce(ctx, 'The returning Geometry World source had no usable blocks.', 'error'); return true; }
    clean.sort(compareBlocks);
    engine.loadLesson(FREE_BUILD_LESSON);
    var available = Math.max(0, MAX_BLOCKS - (engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks || {}).length));
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
    var returningContext = pending.printContext || {};
    engine._builderSelection = {blocks:clean.map(function(b){return {x:b.x+offsetX,y:b.y+offsetY,z:b.z+offsetZ};})};
    patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showGeometryHome:false,_geometryHomeInitial:false, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: '', builderPanel:'build', builderPrintContext:{unitMm:printUnit(returningContext.unitMm),aiUse:returningContext.aiUse || 'NONE',aiDisclosure:String(returningContext.aiDisclosure || '').slice(0,500)}, measureResult: null, measureHistory: [] });
    if (engine.logEvent) engine.logEvent('print_lab_return', { blocks: placedCount, requestedBlocks: requestedCount, truncated: requestedCount > placedCount });
    announce(ctx, 'Editable build returned from Print Lab with ' + placedCount + ' block' + (placedCount === 1 ? '' : 's') + '. It is centered one block above the sandbox floor.' + (requestedCount > placedCount ? ' The world safety limit prevented ' + (requestedCount - placedCount) + ' additional block' + (requestedCount - placedCount === 1 ? '' : 's') + ' from being restored.' : ''), requestedCount > placedCount ? 'info' : 'success');
    focusWorldSurface(50);
    return true;
  }

  window.StemLab = window.StemLab || {};
  // The print guide reads the same selected mesh and printer profile as export.
  // It adds disposable lines only; source geometry and physical scale stay intact.
  function geometryPrintGuideData(engine, positions, profile, unitMm, check) {
    var THREE=window.THREE;if(!THREE || !engine || !Array.isArray(positions) || !positions.length)return null;
    var bounds=creationGeometryBounds(engine,positions);if(!bounds || bounds.isEmpty())return null;
    var bed=builderBedLimits(profile),unit=printUnit(unitMm),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    var frame={min:{x:center.x-bed.width/unit/2,y:bounds.min.y,z:center.z-bed.depth/unit/2},max:{x:center.x+bed.width/unit/2,y:bounds.min.y+bed.height/unit,z:center.z+bed.depth/unit/2}};
    var dimensions={width:size.x*unit,depth:size.z*unit,height:size.y*unit},over=[];
    ['width','depth','height'].forEach(function(axis){if(dimensions[axis]>bed[axis]+1e-6)over.push(axis);});
    var validKeys={},outside=[];
    positions.forEach(function(p){var mesh=engine.blocks[keyFor(p)];if(!mesh || !isStudentBlock(mesh.userData))return;validKeys[keyFor(p)]=true;var box=creationGeometryBounds(engine,[p]);if(!box || box.isEmpty())return;
      if(box.min.x<frame.min.x-1e-6 || box.max.x>frame.max.x+1e-6 || box.min.z<frame.min.z-1e-6 || box.max.z>frame.max.z+1e-6 || box.max.y>frame.max.y+1e-6)outside.push({x:p.x,y:p.y,z:p.z});
    });
    var parts=[];
    if(check && Array.isArray(check.contactGroups))check.contactGroups.forEach(function(cells,index){
      if(!Array.isArray(cells) || !cells.length || cells.some(function(p){return !validKeys[keyFor(p)];}))return;
      var box=creationGeometryBounds(engine,cells);if(!box || box.isEmpty())return;
      parts.push({index:index+1,blocks:cells.length,cells:cells.map(function(p){return {x:p.x,y:p.y,z:p.z};}),raised:box.min.y>bounds.min.y+1e-5,
        min:{x:box.min.x,y:box.min.y,z:box.min.z},max:{x:box.max.x,y:box.max.y,z:box.max.z}});
    });
    return {unitMm:unit,bed:bed,frame:frame,dimensions:dimensions,over:over,fits:!over.length,outside:outside,parts:parts,
      raisedParts:parts.filter(function(part){return part.raised;}).length,topologyChecked:!!check,
      openEdges:check && check.openEdges || 0,nonManifoldEdges:check && check.nonManifoldEdges || 0};
  }
  function printIssueTarget(guide,kind,index) {
    if(!guide)return null;
    if(kind==='overflow')return guide.outside.length?{cells:guide.outside,label:'Oversized region'}:null;
    if(kind!=='part')return null;
    var part=guide.parts.find(function(p){return p.index===index;});
    return part?{cells:part.cells,label:'Piece '+part.index,raised:part.raised}:null;
  }
  function focusGeometryPrintIssue(ctx,kind,index) {
    var engine=window[ENGINE_KEY],data=ctx && ctx.toolData && ctx.toolData.geometryWorld || {},positions=engine && engine._builderSelection && engine._builderSelection.blocks;
    if(!engine || engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox || !positions || !positions.length || !engine.camera || !engine.setViewPreset)return {ok:false,reason:'Select a creation in Free Build first.'};
    var signature=blockMeasurementSignature(engine,positions.map(keyFor)),check=data.builderPrintCheck && data.builderPrintCheck.selectionSignature===signature?data.builderPrintCheck:null;
    if(kind==='part' && !check)return {ok:false,reason:'The selection changed. Wait for the current piece check, then inspect again.'};
    var guide=geometryPrintGuideData(engine,positions,storedPrinterProfile(ctx),printContext(ctx).unitMm,check),target=printIssueTarget(guide,kind,index);
    if(!target)return {ok:false,reason:kind==='overflow'?'The current selection fits at this print scale.':'This piece is no longer in the current selection.'};
    var THREE=window.THREE,box=creationGeometryBounds(engine,target.cells),center=box.getCenter(new THREE.Vector3()),sphere=Math.max(.8,box.getSize(new THREE.Vector3()).length()/2),camera=engine.camera;
    var vertical=(camera.fov || 60)*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*Math.max(.1,camera.aspect || 1));
    var radius=sphere/Math.sin(Math.min(vertical,horizontal))*.78;
    engine.setViewPreset('front',{x:center.x,y:center.y,z:center.z,radius:radius});
    engine._builderPrintFocusLesson=engine._currentLesson;
    patchGeometryState(ctx,{builderPrintGuide:true,builderPrintFocus:{kind:kind,index:index,selectionSignature:signature,label:target.label,blocks:target.cells.length},sandboxDockCollapsed:true,hudPanel:''});
    focusPrintCameraControl(engine,'.gwe-print-focus-return');
    announce(ctx,target.label+' highlighted. All '+positions.length+' selected blocks are still included in exports.');
    return {ok:true,label:target.label,blocks:target.cells.length};
  }
  function createGeometryPrintGuide(engine,data) {
    var THREE=window.THREE;if(!THREE || !data)return null;
    var group=new THREE.Group();group.name='gwe-print-guide';group.userData.gwDecorative=true;group.userData.gwPrintGuide=true;
    var positions=[],colors=[],palette=[0x86d5c2,0xe4bc7e,0xb1b4e6,0xd9a9bb,0x94c7dd,0xc4d28e];
    function boxLines(box,hex,floorOnly){var a=box.min,b=box.max,corners=[[a.x,a.y,a.z],[b.x,a.y,a.z],[b.x,a.y,b.z],[a.x,a.y,b.z],[a.x,b.y,a.z],[b.x,b.y,a.z],[b.x,b.y,b.z],[a.x,b.y,b.z]],tint=new THREE.Color(hex).convertSRGBToLinear();
      var edges=floorOnly?[[0,1],[1,2],[2,3],[3,0]]:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(function(edge){edge.forEach(function(i){positions.push.apply(positions,corners[i]);colors.push(tint.r,tint.g,tint.b);});});
    }
    // Full bed cage gives both the footprint and permitted model height.
    boxLines(data.frame,data.fits?0x86d5c2:0xf1ad81,false);
    data.parts.forEach(function(part,index){if(data.parts.length>1)boxLines(part,part.raised?0xe4bc7e:palette[index%palette.length],false);});
    data.outside.forEach(function(p){var box=creationGeometryBounds(engine,[p]);if(box && !box.isEmpty())boxLines(box,0xf48675,false);});
    var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    var material=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:data.focus?.36:.76,depthTest:false,depthWrite:false,toneMapped:false});
    var lines=new THREE.LineSegments(geometry,material);lines.raycast=function(){};lines.renderOrder=996;lines.userData.gwDecorative=true;group.add(lines);
    if(data.focus){var box=creationGeometryBounds(engine,data.focus.cells),focus=createSelectionFrame(box,{components:2});if(focus){focus.name='gwe-print-issue-focus';focus.material.opacity=1;focus.renderOrder=999;group.add(focus);}}
    group.raycast=function(){};return group;
  }
  function disposeGeometryPrintGuide(engine) {
    if(!engine)return;var group=engine._builderPrintGuide;if(!group)return;
    var show=engine._showcase;
    if(show){show.hidden=(show.hidden || []).filter(function(entry){return entry[0]!==group;});if(show.studio)show.studio.hidden=(show.studio.hidden || []).filter(function(entry){return entry[0]!==group;});}
    if(group.parent)group.parent.remove(group);
    group.traverse(function(part){if(part.geometry)part.geometry.dispose();if(part.material)part.material.dispose();});
    engine._builderPrintGuide=null;engine._builderPrintGuideKey='';
  }
  function syncGeometryPrintGuide(engine,ctx) {
    var data=ctx && ctx.toolData && ctx.toolData.geometryWorld || {};
    var selected=engine && engine._builderSelection,positions=selected && selected.blocks;
    if(!engine || engine._destroyed || !data.builderPrintGuide || !data.worldActive || !positions || !positions.length){disposeGeometryPrintGuide(engine);if(data.builderPrintFocus || data.builderPrintGuideSummary)patchGeometryState(ctx,{builderPrintFocus:null,builderPrintGuideSummary:null});return;}
    if(engine._builderPrintGuide)engine._builderPrintGuide.visible=!engine._showcase && !data.showGeometryHome;
    if(engine._showcase || data.showGeometryHome)return;
    var profile=storedPrinterProfile(ctx),unit=printUnit(printContext(ctx).unitMm),signature=blockMeasurementSignature(engine,positions.map(keyFor));
    var check=data.builderPrintCheck && data.builderPrintCheck.selectionSignature===signature?data.builderPrintCheck:null;
    var requested=data.builderPrintFocus,focus=requested && requested.selectionSignature===signature && engine._builderPrintFocusLesson===engine._currentLesson?requested:null;
    if(requested && !focus)patchGeometryState(ctx,{builderPrintFocus:null});
    if(engine._builderSelectionFrame)engine._builderSelectionFrame.visible=!focus;
    var next=signature+'|'+unit+'|'+JSON.stringify(builderBedLimits(profile))+'|'+(check?'checked':'pending')+'|'+(focus?focus.kind+':'+focus.index:'');
    if(engine._builderPrintGuide && engine._builderPrintGuideKey===next)return;
    disposeGeometryPrintGuide(engine);var guide=geometryPrintGuideData(engine,positions,profile,unit,check);if(!guide)return;
    if(focus){guide.focus=printIssueTarget(guide,focus.kind,focus.index);if(!guide.focus)patchGeometryState(ctx,{builderPrintFocus:null});}
    var group=createGeometryPrintGuide(engine,guide);if(!group)return;
    engine._builderPrintGuide=group;engine._builderPrintGuideKey=next;engine.scene.add(group);
    patchGeometryState(ctx,{builderPrintGuideSummary:{selectionSignature:signature,fits:guide.fits,dimensions:guide.dimensions,over:guide.over,outside:guide.outside.length,parts:guide.parts.map(function(p){return {index:p.index,blocks:p.blocks,raised:p.raised};}),raisedParts:guide.raisedParts,openEdges:guide.openEdges,nonManifoldEdges:guide.nonManifoldEdges,topologyChecked:guide.topologyChecked}});
  }
  function focusPrintCameraControl(engine, selector) {
    window.requestAnimationFrame(function(){
      if(window[ENGINE_KEY]!==engine || engine._destroyed || engine._showcase)return;
      var control=document.querySelector(selector);if(control)control.focus({preventScroll:true});
    });
  }
  function frameGeometryPrintGuide(ctx) {
    var engine=window[ENGINE_KEY],selected=engine && engine._builderSelection;
    if(!engine || !selected || !engine.setViewPreset)return false;
    var guide=geometryPrintGuideData(engine,selected.blocks,storedPrinterProfile(ctx),printContext(ctx).unitMm,null);if(!guide)return false;
    var a=guide.frame.min,b=guide.frame.max;
    engine.setViewPreset('top',{x:(a.x+b.x)/2,y:a.y,z:(a.z+b.z)/2,radius:Math.max(b.x-a.x,b.z-a.z)*.65});
    patchGeometryState(ctx,{sandboxDockCollapsed:true,hudPanel:''});focusPrintCameraControl(engine,'.gwe-collapse');return true;
  }

  window.StemLab.geometryWorldBuilderPure = {
    suspendPreviewScenery:suspendPreviewScenery,findWorkshopTools:findWorkshopTools,previewChangeFacts:previewChangeFacts,frameBuildPreview:frameBuildPreview,
    capturePreviewCamera:capturePreviewCamera, installPreviewCamera:installPreviewCamera,
    printIssueTarget:printIssueTarget,focusGeometryPrintIssue:focusGeometryPrintIssue,geometryPrintGuideData:geometryPrintGuideData,createGeometryPrintGuide:createGeometryPrintGuide,disposeGeometryPrintGuide:disposeGeometryPrintGuide,syncGeometryPrintGuide:syncGeometryPrintGuide,
    studioGroundFootprints:studioGroundFootprints, studioContactMap:studioContactMap,
    installStudioBackdropColorSync:installStudioBackdropColorSync,
    configureStudioFloorShadow:configureStudioFloorShadow,
    showcaseCompositionRect:showcaseCompositionRect, fitShowcaseCamera:fitShowcaseCamera,
    showcaseExportSize:showcaseExportSize, captureShowcaseImage:captureShowcaseImage, saveShowcaseImage:saveShowcaseImage,
    fitCreationCamera:fitCreationCamera, creationFocusRect:creationFocusRect, creationGeometryBounds:creationGeometryBounds, focusSelectedBuild:focusSelectedBuild,
    architecturalStarters:architecturalStarters, configureArchitecturalStarter:configureArchitecturalStarter, workshopDragOffset:workshopDragOffset, installWorkshopTransform:installWorkshopTransform,readWorldShelf:readWorldShelf,saveWorldDraft:saveWorldDraft,saveWorldCopy:saveWorldCopy,duplicateWorldProject:duplicateWorldProject,removeWorldProject:removeWorldProject,installWorldAutosave:installWorldAutosave,WORLD_SHELF_KEY:WORLD_SHELF_KEY,
    updateWorkshopSelection:updateWorkshopSelection,workshopScreenSelection:workshopScreenSelection,installWorkshopPointer:installWorkshopPointer,previewPrintPreparation:previewPrintPreparation,activityMilestones:activityMilestones,createActivityMilestones:createActivityMilestones,disposeActivityMilestones:disposeActivityMilestones,
    suggestCreationDuplicate:suggestCreationDuplicate,
    selectionEditSnapshot:selectionEditSnapshot, transformCreationBlocks:transformCreationBlocks, previewSelectionEdit:previewSelectionEdit, commitSelectionEdit:commitSelectionEdit,
    normalizeBuildStamp:normalizeBuildStamp, readBuildStamps:readBuildStamps, saveSelectionStamp:saveSelectionStamp, removeBuildStamp:removeBuildStamp, previewBuildStamp:previewBuildStamp, BUILD_STAMP_KEY:BUILD_STAMP_KEY,
    selectedCreationPresetFocus:selectedCreationPresetFocus, selectedCreationView:selectedCreationView, orbitSelectedCreation:orbitSelectedCreation,
    createSelectionFrame:createSelectionFrame, selectionNeedsReview:selectionNeedsReview,
    setBuilderPrintScale:setBuilderPrintScale,
    MAX_BLOCKS: MAX_BLOCKS,
    MAX_EDITABLE_WORLD_BYTES: MAX_EDITABLE_WORLD_BYTES,
    MAX_EDITABLE_BLOCKS: MAX_EDITABLE_BLOCKS,
    EDITABLE_WORLD_SCHEMA: EDITABLE_WORLD_SCHEMA,
    FREE_BUILD_LESSON: FREE_BUILD_LESSON,
    measurementLayerFor: measurementLayerFor,
    buildGeometryWorldStl: buildGeometryWorldStl,
    unionSurface: unionSurface,
    axisPlane: axisPlane,
    faceSignature: faceSignature,
    editableWorld: editableWorld,
    selectedEditableWorld:selectedEditableWorld, saveSelectedEditableWorld:saveSelectedEditableWorld,
    selectedBuildStlDownload:selectedBuildStlDownload, scaleStlForDownload:scaleStlForDownload,
    normalizeEditableWorld: normalizeEditableWorld,
    parseEditableWorldText: parseEditableWorldText,
    restoreEditableWorld: restoreEditableWorld,
    HANDOFF_UNIT_MM: HANDOFF_UNIT_MM,
    FALLBACK_BED_MM: Object.assign({}, FALLBACK_BED_MM),
    builderBedLimits: builderBedLimits,
    storedPrinterProfile: storedPrinterProfile,
    measurementIsStudentBuild: measurementIsStudentBuild,
    printVolumeSentence: printVolumeSentence,
    defaultPrintEnvelope: defaultPrintEnvelope,
    sanitizeSourceBlock: sanitizeSourceBlock,
    restorePendingEditableBuild: restorePendingEditableBuild,
    lessonOverviewModel:lessonOverviewModel,
    activityWaypointFor:activityWaypointFor,
    activityGuideModel:activityGuideModel,travelToActivity:travelToActivity,
    activityBuildFacts:activityBuildFacts,evaluateActivityBuildGoal:evaluateActivityBuildGoal,activityGoalDescription:activityGoalDescription,
    captureActivityBuild:captureActivityBuild,updateActivityEvidence:updateActivityEvidence,activitySnapshotSvg:activitySnapshotSvg,
    activityJournalExport:activityJournalExport,activityPortfolioHtml:activityPortfolioHtml,
    captureProject:captureProject, restoreProject:restoreProject, selectionMeasurement:selectionMeasurement, polledSelectionMeasurement:polledSelectionMeasurement,
    openSelectedBuildInPrintLab:openSelectedBuildInPrintLab, worldToStl:worldToStl, printUnit:printUnit
  };

  // Placement note (2026-09-06): the launcher and the dock start below the
  // viewport's own controls. Both used to sit at the same height as the
  // fullscreen button, which is positioned against the viewport below the
  // toolbar, and covered it completely at every screen size, so fullscreen could
  // not be reached with a pointer once this file loaded. The numbers come from
  // measuring the rendered controls (desktop 71-107px, phone 63-97px).
  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('allo-geometryworld-builder-css')) return;
    var style = document.createElement('style');
    style.id = 'allo-geometryworld-builder-css';
    style.textContent = [
      ".gwe-stamp-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}:is(.gwe-stamp-library,.gwe-starter-library) .gwe-stamp-card{display:flex;flex-direction:column;min-width:0;padding:0;overflow:hidden;text-align:left;border:1px solid #789786;border-radius:13px;background:#f6f5e9;color:#284d3c;font:inherit;cursor:pointer;box-shadow:0 3px 8px #061f1a12}:is(.gwe-stamp-library,.gwe-starter-library) .gwe-stamp-card[aria-pressed=true]{border:2px solid #e0c68e;box-shadow:0 0 0 2px #e0c68e26}.gwe-stamp-art{display:block;position:relative;width:100%;height:114px;background:linear-gradient(145deg,#e3ebd9,#f4f3e5)}.gwe-stamp-art img{display:block;object-fit:contain;width:100%;height:100%}.gwe-stamp-selection{position:absolute;top:6px;left:6px;max-width:calc(100% - 12px);box-sizing:border-box;border:1px solid #476d5733;border-radius:999px;background:#fdfbf0ed;padding:3px 7px;color:#355c44;font-size:10px;line-height:1.3}.gwe-stamp-card[aria-pressed=true] .gwe-stamp-selection{background:#294f3c;color:#fff4d8}.gwe-stamp-card-name{display:block;padding:9px 10px 0;font-size:12px;line-height:1.4;font-weight:750;overflow-wrap:anywhere}.gwe-stamp-card-facts{display:flex;flex-direction:column;gap:4px;padding:5px 10px 11px;font-size:10px;line-height:1.4;overflow-wrap:anywhere}.gwe-stamp-card-facts>span{color:#506d58}.gwe-stamp-card:focus-visible{outline:3px solid #f2d394;outline-offset:3px}.gwe-copy-directions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:10px 0}.gwe-copy-directions button{min-width:0;min-height:44px;padding:7px 3px;font-size:11px}.theme-contrast .gwe-stamp-card,[data-stem-theme=contrast] .gwe-stamp-card{background:#000;color:#fff;border-color:#0ff}.theme-contrast .gwe-stamp-card-facts>span,[data-stem-theme=contrast] .gwe-stamp-card-facts>span{color:#fff}.theme-contrast .gwe-stamp-card[aria-pressed=true],[data-stem-theme=contrast] .gwe-stamp-card[aria-pressed=true]{border-color:#ff0;outline:2px solid #ff0}.theme-contrast .gwe-stamp-selection,[data-stem-theme=contrast] .gwe-stamp-selection{background:#000;color:#fff;border-color:#ff0}.gwe-stamp-card:hover{filter:brightness(1.025)}@media(prefers-reduced-motion:no-preference){.gwe-stamp-card{transition:border-color 140ms ease,box-shadow 140ms ease}}",
      ".gwe-creation-editor,.gwe-stamp-library{display:block}.gwe-precision-numbers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gwe-precision-numbers label{min-width:0}.gwe-pattern-options select,.gwe-alignment-options select,.gwe-pattern-options input,.gwe-alignment-options input{display:block;margin-top:5px}.gwe-edit-label{display:block;margin:12px 0 5px;color:#d4e8ca;font-size:12px;font-weight:650}.gwe-creation-editor select,.gwe-creation-editor input,.gwe-stamp-library select,.gwe-stamp-library input,.gwe-edit-coordinates input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;border:1px solid #adc4ad66;border-radius:10px;padding:8px 10px;background:#173b35;color:#f5f0e5;font:inherit;font-size:12px}.gwe-creation-editor select,.gwe-stamp-library select{margin-bottom:10px}.gwe-edit-coordinates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0;padding:0;border:0;min-width:0}.gwe-edit-coordinates legend{padding:0 0 7px;color:#bfd2c4;font-size:11px;line-height:1.5}.gwe-edit-coordinates label{display:block;color:#d4e8ca;font-size:11px;font-weight:650}.gwe-edit-coordinates input{display:block;margin-top:4px;font-variant-numeric:tabular-nums}.gwe-stamp-save .gwe-builder-actions{margin:8px 0 12px}.gwe-edit-notice{margin:0;color:#e6eddd;font-size:12px;line-height:1.6;overflow-wrap:anywhere}.gwe-edit-preview{padding:12px;border:1px solid #e7bc8666;border-radius:12px;background:#493d252e}.gwe-edit-preview[data-ready=true]{border-color:#c5dfae80;background:#d4e8ca0c}.gwe-edit-preview .gwe-builder-actions{margin-top:10px}.gwe-stamp-manage{margin-top:10px}.gwe-stamp-manage>summary{min-height:44px;align-content:center;color:#bfd2c4;font-size:11px;cursor:pointer}.gwe-stamp-manage .gwe-builder-actions{margin-top:8px}.gwe-camera-presets{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.gwe-camera-presets button{padding:8px 4px;font-size:11px}.gwe-camera-orbit-tools{min-width:0;max-width:260px}.gwe-camera-orbit-tools>summary{min-height:44px;align-content:center;font-size:12px;font-weight:650;cursor:pointer}.gwe-camera-orbit-tools .gwe-builder-actions{grid-template-columns:repeat(2,minmax(0,1fr));margin:6px 0}.gwe-focus-return:has(.gwe-camera-orbit-tools[open]){flex-wrap:wrap}.gwe-focus-return .gwe-camera-orbit-tools[open]{flex:1 0 100%}.gwe-focus-return .gwe-camera-orbit-tools button{min-width:44px;min-height:44px}.gwe-creation-editor :is(input,select):focus-visible,.gwe-stamp-library :is(input,select):focus-visible,.gwe-camera-orbit-tools summary:focus-visible{outline:3px solid #f1d094;outline-offset:3px}.theme-contrast .gwe-edit-preview,[data-stem-theme=contrast] .gwe-edit-preview,.theme-contrast .gwe-edit-coordinates input,[data-stem-theme=contrast] .gwe-edit-coordinates input{background:#000;border-color:#0ff;color:#fff}@media(max-width:420px){.gwe-focus-return .gwe-camera-orbit-tools{max-width:100%}.gwe-focus-return .gwe-camera-orbit-tools button{font-size:10px;padding:8px 3px}.gwe-edit-coordinates{gap:5px}}",
      ".gwe-free-build-launch{position:absolute;top:118px;right:12px;z-index:44;display:inline-flex;min-height:48px;align-items:center;gap:9px;padding:10px 15px;border:1px solid #d4e8ca66;border-radius:15px;background:#173b35;color:#f5f0e5;box-shadow:0 8px 24px #112d2b33,inset 0 1px #ffffff12;font-size:13px;font-weight:750;cursor:pointer}.gwe-free-build-launch small{color:#d4e8ca;font-size:11px;font-weight:500}.gwe-free-build-launch:hover{background:#244c42}",
      ".gwe-builder-dock{position:absolute;top:118px;right:12px;z-index:43;display:flex;flex-direction:column;box-sizing:border-box;width:min(346px,calc(100% - 24px));max-height:calc(100% - 130px);overflow:hidden;border:1px solid #9ab4a65e;border-radius:20px;background:#112d2bf5;box-shadow:0 18px 48px #0b211f38,inset 0 1px #ffffff0d;color:#f5f0e5;backdrop-filter:blur(16px)}.gwe-builder-dock[data-collapsed=\"true\"]{width:auto}.gwe-builder-head{position:relative;z-index:2;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 15px 12px;background:#173b35;border-bottom:1px solid #c5d9cd22}.gwe-builder-title{display:flex;min-width:0;align-items:center;gap:11px}.gwe-builder-icon{display:grid;width:40px;height:40px;flex:0 0 auto;place-items:center;border:1px solid #d4e8ca42;border-radius:12px;background:#d4e8ca0c;color:#d4e8ca}.gwe-builder-eyebrow{color:#b8cdbf;font-size:10px;font-weight:650;letter-spacing:.1em;text-transform:uppercase}.gwe-builder-name{margin-top:3px;color:#f5f0e5;font-size:16px;font-weight:750;letter-spacing:-.025em}.gwe-collapse{display:grid;min-width:44px;min-height:44px;place-items:center;border:1px solid #a4bbaa55;border-radius:12px;background:#112d2b66;color:#f5f0e5;font-size:15px;font-weight:650;cursor:pointer}.gwe-collapse:hover{background:#2b5044}.gwe-builder-dock[data-collapsed=\"true\"] .gwe-builder-head{padding:6px}.gwe-builder-dock[data-collapsed=\"true\"] .gwe-builder-icon{border:0;background:transparent}",
      ".gwe-workflow{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:6px;list-style:none;margin:0;padding:11px 16px 0;color:#b8cdbf}.gwe-workflow li{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600}.gwe-workflow li+li:before{content:\"\";display:block;width:13px;height:1px;margin-right:3px;background:#9cb8a94d}.gwe-workflow span{display:grid;place-items:center;width:20px;height:20px;border:1px solid #9cb8a95e;border-radius:50%;font-size:10px}.gwe-workflow li[aria-current=\"step\"]{color:#f5f0e5}.gwe-workflow li[aria-current=\"step\"] span{border-color:#d4e8ca;background:#d4e8ca;color:#112d2b}",
      ".gwe-builder-body{display:flex;flex:1 1 auto;min-height:0;flex-direction:column;gap:15px;padding:15px;overflow:auto;overscroll-behavior:contain;scrollbar-color:#658576 #173b35;scrollbar-width:thin}.gwe-builder-intro{margin:0;color:#c5d6ca;font-size:12px;line-height:1.6}.gwe-section-title{margin:0 0 8px;color:#f5f0e5;font-size:13px;font-weight:700;letter-spacing:-.01em}.gwe-selection{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gwe-selection-card{min-width:0;padding:10px 11px;border:1px solid #aac4b329;border-radius:12px;background:#d4e8ca07}.gwe-selection-label{display:block;color:#b5cabb;font-size:11px;font-weight:500}.gwe-selection-value{display:block;margin-top:5px;overflow:hidden;color:#f5f0e5;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.gwe-measure-summary{display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:8px}.gwe-metric{min-width:0;padding:12px 6px;border:1px solid #b4cdb42b;border-radius:12px;background:#d4e8ca0a;text-align:center}.gwe-metric strong{display:block;color:#f5f0e5;font-size:20px;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.04em}.gwe-metric:last-child strong{font-size:17px;line-height:24px}.gwe-metric span{display:block;margin-top:4px;color:#b8cdbf;font-size:11px;font-weight:500}",
      ".gwe-current-tools .gwe-selection-card{padding:9px 10px}.gwe-current-tools .gwe-selection-value{white-space:normal;overflow-wrap:anywhere;line-height:1.4}.gwe-tool-rotation{display:block;margin-top:4px;color:#bfd3c3;font-size:11px;font-variant-numeric:tabular-nums}.gwe-match-actions{margin-top:9px}.gwe-match-actions .gwe-match-block{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:9px;min-height:44px}.gwe-match-block svg{flex:0 0 auto}.gwe-match-block kbd{margin-left:auto;display:grid;place-items:center;min-width:22px;height:22px;border:1px solid #bad0bd55;border-radius:5px;font:600 11px system-ui;background:#d4e8ca0a;color:inherit}.gwe-match-block span{flex:1;text-align:left}.gwe-match-note{margin:7px 0 0;color:#bfd2c4;font-size:11px;line-height:1.5}.theme-contrast .gwe-tool-rotation,[data-stem-theme=\"contrast\"] .gwe-tool-rotation,.theme-contrast .gwe-match-note,[data-stem-theme=\"contrast\"] .gwe-match-note{color:#fff}.theme-contrast .gwe-match-block kbd,[data-stem-theme=\"contrast\"] .gwe-match-block kbd{background:#000;border-color:#00ff00}",
      ".gwe-focus-return{position:absolute;top:118px;left:12px;z-index:44;display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px);box-sizing:border-box;padding:6px 6px 6px 13px;border:1px solid #a9c4ad66;border-radius:16px;background:#173b35f5;box-shadow:0 8px 24px #112d2b33;color:#d4e8ca}.gwe-focus-return span{font-size:12px;font-weight:600}.gwe-focus-return button{min-height:44px;padding:8px 12px;border:1px solid #d4e8ca;border-radius:11px;background:#d4e8ca;color:#173b35;font-size:12px;font-weight:700;cursor:pointer}.gwe-focus-return button:hover{background:#f5f0e5}.gwe-focus-return button:focus-visible{outline:3px solid #f1d094;outline-offset:3px}.gwe-builder-actions .gwe-focus-action{grid-column:1/-1;min-height:48px;background:#d4e8ca;color:#173b35;border-color:#d4e8ca}.gwe-builder-actions .gwe-focus-action:hover{background:#e7f0de}@media(max-width:900px){.gwe-focus-return{top:106px;flex-direction:column;align-items:stretch;gap:4px;max-width:calc(50% - 18px);padding:7px 8px}.gwe-focus-return span{font-size:11px;text-align:center}.gwe-focus-return button{min-width:0;padding:8px 9px;font-size:11px}}",
      ".gwe-builder-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gwe-builder-actions button{min-width:0;min-height:44px;padding:9px 10px;border:1px solid #a1bea44f;border-radius:12px;background:#1c4037;color:#f5f0e5;font-size:12px;font-weight:650;line-height:1.3;cursor:pointer}.gwe-builder-actions button:hover{background:#2a5042;border-color:#c1d6b97d}.gwe-builder-actions button:disabled{opacity:.55;cursor:wait}.gwe-builder-actions .gwe-primary{border-color:#d4e8ca;background:#d4e8ca;color:#112d2b}.gwe-builder-actions .gwe-primary:hover{background:#e3efdc;border-color:#e3efdc}.gwe-builder-quick-actions{flex:0 0 auto;padding:11px 15px 14px;border-bottom:1px solid #b9d1bf26;background:#112d2b}.gwe-builder-quick-actions button{min-height:48px;font-size:12px}.gwe-builder-actions .gwe-showcase-action{background:#f5f0e5;color:#173b35;border-color:#f5f0e5}.gwe-builder-actions .gwe-showcase-action:hover{background:#fffaf0}.gwe-builder-actions .gwe-clear-selection{grid-column:1/-1;justify-self:start;min-height:44px;padding:4px 2px;border:0;background:transparent;color:#bacfc0;font-weight:500;text-decoration:underline;text-underline-offset:3px}.gwe-builder-actions .gwe-clear-selection:hover{color:#fff}.gwe-builder-note{margin:0;color:#bfd2c4;font-size:12px;line-height:1.6}.gwe-builder-note[data-gwe-not-student]{padding:10px;border:1px solid #d9b27588;border-radius:10px;background:#4d3d21;color:#fff0cc}",
      ".gwe-print-ready{padding:13px;border:1px solid #aecda447;border-radius:14px;background:#244c3b66}.gwe-print-ready[data-fit=\"false\"]{border-color:#d7ae6988;background:#4d3d21}.gwe-print-ready-heading{display:flex;gap:8px;justify-content:space-between;align-items:center}.gwe-print-ready-label{color:#c8dec0;font-size:11px;font-weight:600}.gwe-fit-badge{flex:0 0 auto;padding:4px 7px;border-radius:6px;background:#d4e8ca;color:#173b35;font-size:10px;font-weight:750}.gwe-print-ready[data-fit=\"false\"] .gwe-fit-badge{background:#f1d094;color:#3b2e19}.gwe-print-ready strong{display:block;margin-top:8px;color:#f5f0e5;font-size:19px;font-weight:650;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.gwe-print-ready p{margin:7px 0 0;color:#d3e1d0;font-size:12px;line-height:1.6}.gwe-print-ready[data-fit=\"false\"] p{color:#fae8c3}.gwe-print-ready .gwe-print-scale{font-size:11px;color:#b9ceb7}.gwe-print-ready[data-fit=\"false\"] .gwe-print-scale{color:#fae8c3}.gwe-details{border-top:1px solid #c2d7bb30}.gwe-print-ready .gwe-details{margin-top:11px}.gwe-details summary{display:flex;min-height:44px;align-items:center;justify-content:space-between;gap:8px;list-style:none;color:#e2ebdc;font-size:12px;font-weight:600;cursor:pointer}.gwe-details summary::-webkit-details-marker{display:none}.gwe-details summary:after{content:\"+\";font-size:19px;font-weight:400}.gwe-details[open]>summary:after{content:\"−\"}.gwe-details .gwe-print-ready-basis{margin:7px 0 0;color:#c4d8be;font-size:12px;line-height:1.6}.gwe-print-ready[data-fit=\"false\"] .gwe-details .gwe-print-ready-basis{color:#fae8c3}.gwe-details .gwe-builder-note{margin-top:8px}.gwe-connection-check{padding:12px 13px;border:1px solid #abc69b40;border-radius:12px;background:#d4e8ca08}.gwe-connection-check[data-connected=\"false\"]{border-color:#d9b27588;background:#4d3d21}.gwe-connection-check strong{color:#e5eddb;font-size:13px;font-weight:650}.gwe-connection-check p{margin:6px 0 0;color:#c6d7c6;font-size:12px;line-height:1.6}.gwe-connection-check[data-connected=\"false\"] p{color:#fae8c3}.gwe-workspace-options{padding-top:2px}.gwe-workspace-options>.gwe-builder-actions{padding:2px 0 8px}",
      ".gwe-scale-editor{margin:12px 0 14px;padding:12px;border:1px solid #9eb99d55;border-radius:13px;background:#123b31}.gwe-scale-editor-title{display:block;color:#e8f0dd;font-size:12px;font-weight:700;margin-bottom:8px}.gwe-scale-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}.gwe-scale-editor button{box-sizing:border-box;min-width:0;min-height:44px;padding:8px;border:1px solid #abc3a76b;border-radius:9px;background:#244b3e;color:#f3f4e9;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.gwe-scale-editor button:hover{background:#355f4b}.gwe-scale-presets button[aria-pressed=\"true\"]{background:#d7e7bf;color:#143b2c;border-color:#d7e7bf;box-shadow:inset 0 0 0 1px #a4c17d}.gwe-scale-editor label{display:block;margin-bottom:6px;color:#e8f0dd;font-size:11px;font-weight:650}.gwe-scale-custom{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.gwe-scale-custom input{box-sizing:border-box;min-width:0;width:100%;min-height:44px;padding:8px 10px;border:1px solid #b3c9ab;border-radius:9px;background:#fbfcf4;color:#183d2f;font:inherit;font-size:16px;font-variant-numeric:tabular-nums}.gwe-scale-custom input[aria-invalid=\"true\"]{border:2px solid #f4b49c}.gwe-scale-custom button{background:#d7e7bf;color:#143b2c;border-color:#d7e7bf}.gwe-scale-custom button:hover{background:#e7f0d5;color:#143b2c}.gwe-scale-editor .gwe-scale-help{margin:9px 0 0;font-size:11px;line-height:1.5;color:#c7d9c2}.gwe-scale-editor .gwe-scale-error{margin:8px 0 0;font-size:12px;color:#ffd3c2}.gwe-scale-editor :is(input,button):focus-visible{outline:3px solid #f1d094;outline-offset:2px}.theme-contrast .gwe-scale-editor,[data-stem-theme=\"contrast\"] .gwe-scale-editor{background:#000;border:2px solid #0ff}.theme-contrast .gwe-scale-editor :is(span,label,p),[data-stem-theme=\"contrast\"] .gwe-scale-editor :is(span,label,p){color:#fff}.theme-contrast .gwe-scale-editor :is(input,button),[data-stem-theme=\"contrast\"] .gwe-scale-editor :is(input,button){background:#000;color:#0f0;border:2px solid #0f0}.theme-contrast .gwe-scale-presets button[aria-pressed=\"true\"],[data-stem-theme=\"contrast\"] .gwe-scale-presets button[aria-pressed=\"true\"]{background:#0f0;color:#000}.theme-contrast .gwe-scale-custom input[aria-invalid=\"true\"],[data-stem-theme=\"contrast\"] .gwe-scale-custom input[aria-invalid=\"true\"]{border-color:#ff0}",
      ".gwe-creation-summary[data-selected=\"true\"]{padding:15px;border:1px solid #d8e5c9;border-radius:16px;background:linear-gradient(145deg,#eef3e6,#dce8d1);color:#173b35;box-shadow:0 8px 26px #061c1612}.gwe-selected-heading{display:flex;align-items:center;gap:10px}.gwe-selected-emblem{width:32px;height:32px;flex:0 0 32px;color:#56784b}.gwe-selected-eyebrow{display:block;font-size:9px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:#59734f}.gwe-selected-heading h3{margin:3px 0 0;font-size:18px;line-height:1.2;font-weight:750;letter-spacing:-.025em;color:#173b35}.gwe-selected-metrics{display:grid;grid-template-columns:1fr 1.3fr;gap:8px;margin-top:13px}.gwe-selected-metrics .gwe-metric{min-width:0;padding:11px 7px;border:1px solid #8fa78240;border-radius:11px;background:#fffef570}.gwe-selected-metrics .gwe-metric strong{font-size:22px;line-height:1.2;font-variant-numeric:tabular-nums;letter-spacing:-.035em;color:#173b35;overflow-wrap:anywhere}.gwe-selected-metrics .gwe-metric span{color:#526b4d}.gwe-creation-summary .gwe-selection-scope{margin:10px 0 0;font-size:11px;line-height:1.5;color:#526b4d}@media(max-width:420px){.gwe-creation-summary[data-selected=\"true\"]{padding:12px}}.theme-contrast .gwe-creation-summary[data-selected=\"true\"],[data-stem-theme=\"contrast\"] .gwe-creation-summary[data-selected=\"true\"]{background:#000;border:2px solid #0ff;color:#fff}.theme-contrast .gwe-selected-metrics .gwe-metric,[data-stem-theme=\"contrast\"] .gwe-selected-metrics .gwe-metric{background:#000;border-color:#0ff}.theme-contrast .gwe-creation-summary :is(h3,span,strong,p),[data-stem-theme=\"contrast\"] .gwe-creation-summary :is(h3,span,strong,p){color:#fff}",
".gwe-activity-evidence{margin:18px 0;padding:16px;border:1px solid #a9bea0;border-radius:14px;background:#edf1e1}.gwe-activity-evidence h4{margin:0}.gwe-journal-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.gwe-activity-goal{padding:13px;border:1px solid #a2b993;border-radius:11px;background:#fcfdf3}.gwe-activity-goal>strong{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#526b43}.gwe-activity-goal p{margin:6px 0 12px}.gwe-activity-guide .gwe-activity-check-build{background:#254c3a;color:#fffef3}.gwe-journal-snapshots{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.gwe-journal-snapshot{margin:0;min-width:0;border:1px solid #b6c8aa;border-radius:12px;background:#fffef7;overflow:hidden}.gwe-journal-snapshot figcaption{padding:11px 12px;display:flex;flex-direction:column;gap:4px}.gwe-journal-snapshot figcaption span{font-size:11px;color:#4e684d}.gwe-journal-snapshot img{display:block;width:100%;height:154px;object-fit:contain;background:#edf0df}.gwe-journal-snapshot>button{box-sizing:border-box;margin:10px;width:calc(100% - 20px);font-size:12px;padding:8px}.gwe-journal-snapshot>.gwe-activity-note{margin:9px 12px;font-size:10px}.gwe-journal-empty{height:154px;display:grid;place-items:center;box-sizing:border-box;padding:18px;margin:0;text-align:center;color:#5b7157;font-size:13px;background:linear-gradient(145deg,#e9efdc,#f6f6e8)}.gwe-journal-saved-check,.gwe-journal-notice{padding:12px;border:1px solid #b5caa8;border-radius:10px;background:#f9f9ed;overflow-wrap:anywhere;font-size:13px}.gwe-journal-saved-check{margin-top:12px}.gwe-journal-saved-check p{margin:6px 0}.gwe-journal-saved-check[data-build-check=revise]{border-color:#c5ac6f;background:#f7efd8}.gwe-activity-guide .gwe-journal-clear{background:transparent;font-size:12px;text-decoration:underline}.gwe-activity-guide footer{flex-wrap:wrap}.theme-contrast .gwe-activity-evidence,.theme-contrast .gwe-activity-goal,.theme-contrast .gwe-journal-snapshot,.theme-contrast .gwe-journal-saved-check,.theme-contrast .gwe-journal-notice,[data-stem-theme=contrast] :is(.gwe-activity-evidence,.gwe-activity-goal,.gwe-journal-snapshot,.gwe-journal-saved-check,.gwe-journal-notice){background:#000;color:#fff;border:2px solid #0ff}.theme-contrast .gwe-journal-snapshot span,.theme-contrast .gwe-activity-goal strong,[data-stem-theme=contrast] :is(.gwe-journal-snapshot span,.gwe-activity-goal strong){color:#fff}@media(max-width:520px){.gwe-activity-evidence{padding:12px}.gwe-journal-snapshots{grid-template-columns:1fr}.gwe-journal-actions>button{flex:1;min-width:120px}.gwe-activity-goal>button{width:100%}.gwe-journal-snapshot img,.gwe-journal-empty{height:180px}}",
".gwe-activity-backdrop{position:absolute;inset:0;z-index:239;display:flex;align-items:center;justify-content:center;padding:16px;background:#0b241ebd;box-sizing:border-box}.gwe-activity-guide{width:min(620px,100%);max-height:100%;overflow:auto;box-sizing:border-box;padding:24px;border:1px solid #bbccb7;border-radius:22px;background:#f6f5e9;color:#213c33;box-shadow:0 24px 80px #09251d55;font-size:14px;line-height:1.55}.gwe-activity-guide header,.gwe-activity-guide footer{display:flex;gap:16px;align-items:center;justify-content:space-between}.gwe-activity-guide h2{font-size:25px;line-height:1.2;margin:6px 0}.gwe-activity-eyebrow{font-size:10px;letter-spacing:.12em;font-weight:800;color:#496b55;margin:0}.gwe-activity-intro{color:#496052}.gwe-activity-guide button,.gwe-activity-guide select,.gwe-activity-guide summary{min-height:44px;border:1px solid #aabc9e;border-radius:10px;padding:10px 14px;background:#e8eddb;color:#213c33;font:inherit;cursor:pointer}.gwe-activity-guide select{width:100%;margin-top:7px}.gwe-activity-progress{font-size:12px;margin:10px 0;color:#496052}.gwe-activity-card{border:1px solid #ced8c3;border-radius:15px;background:#fffef7;padding:18px;margin:12px 0 18px}.gwe-activity-card h3{font-size:20px;margin:0}.gwe-activity-card h4{margin:0;font-size:14px}.gwe-activity-card details{margin:16px 0}.gwe-activity-check{padding:12px;border-left:3px solid #779a72;background:#f0f3e7;margin:16px 0}.gwe-activity-guide textarea{box-sizing:border-box;width:100%;padding:12px;margin:8px 0;background:#fffef7;color:#213c33;border:1px solid #aabc9e;border-radius:10px;font:inherit;resize:vertical}.gwe-activity-review{display:flex;align-items:center;gap:10px;min-height:44px}.gwe-activity-review input{width:20px;height:20px}.gwe-activity-note{font-size:12px;color:#536757}.gwe-activity-guide :focus-visible{outline:3px solid #8a5a16;outline-offset:3px}.gwe-activity-guide .gwe-activity-travel{background:#254c3a;color:#fffef3}.theme-contrast .gwe-activity-guide,.theme-contrast .gwe-activity-card{background:#000;color:#fff;border:2px solid #0ff}.theme-contrast .gwe-activity-guide :is(p,label,h2,h3,h4){color:#fff}.theme-contrast .gwe-activity-guide :is(button,select,summary,textarea){background:#000;color:#0f0;border-color:#0f0}.theme-contrast .gwe-activity-check{background:#000;border-color:#0ff}@media(max-width:520px){.gwe-activity-backdrop{padding:8px}.gwe-activity-guide{padding:16px;border-radius:16px}.gwe-activity-guide h2{font-size:21px}.gwe-activity-card{padding:13px}.gwe-activity-guide header{align-items:flex-start;gap:8px}.gwe-activity-guide footer{gap:8px;flex-wrap:wrap}.gwe-activity-guide footer button{flex:1}}",
".gwe-home-preview.gwe-home-preview--route{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(180px,.85fr);align-items:center;gap:24px;background:linear-gradient(135deg,#edf1df,#e0eadb);padding:24px}.gwe-home-lesson-copy{min-width:0}.gwe-home .gwe-lesson-facts{display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none;margin:14px 0}.gwe-home .gwe-lesson-facts li{padding:5px 9px;border:1px solid #92a78777;border-radius:999px;background:#fffdf187;color:#36543e;font-size:11px;font-weight:650;line-height:1.4}.gwe-lesson-map{margin:0;min-width:0}.gwe-lesson-map svg{width:100%;height:auto;display:block;border:1px solid #92a78777;border-radius:16px;box-sizing:border-box}.gwe-lesson-map figcaption{text-align:center;font-size:11px;line-height:1.5;color:#47654f;margin-top:8px}.gwe-home .gwe-home-goals{font-size:12px;padding-left:18px;margin-top:12px}.gwe-activity-route{margin:14px 0}.gwe-activity-route .gwe-lesson-map{max-width:380px;margin:12px auto}.gwe-activity-position{font-size:10px;letter-spacing:.09em;font-weight:800;color:#587357;margin:0 0 8px}.gwe-activity-pager{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:14px;align-items:center;margin:0 0 18px}.gwe-activity-pager>span{font-size:12px;font-variant-numeric:tabular-nums;color:#4d654f}.gwe-activity-pager button:disabled{opacity:.45;cursor:default}.gwe-activity-pager button:last-child{background:#254c3a;color:#fffef3}.theme-contrast .gwe-lesson-facts li,[data-stem-theme=contrast] .gwe-lesson-facts li{background:#000!important;color:#fff!important;border-color:#0ff!important}.theme-contrast .gwe-lesson-map figcaption,[data-stem-theme=contrast] .gwe-lesson-map figcaption{color:#fff}.theme-contrast .gwe-lesson-map svg,[data-stem-theme=contrast] .gwe-lesson-map svg{border:2px solid #0ff}.theme-contrast .gwe-activity-pager>span,[data-stem-theme=contrast] .gwe-activity-pager>span{color:#fff}@media(max-width:600px){.gwe-home-preview.gwe-home-preview--route{grid-template-columns:1fr;padding:18px;gap:18px}.gwe-home-preview--route .gwe-lesson-map{width:100%;max-width:340px;justify-self:center}}@media(max-width:360px){.gwe-activity-pager{gap:8px}.gwe-activity-pager button{padding:10px 8px;font-size:12px}}",
".gwe-activity-tracking-state{display:flex;gap:12px;align-items:center;justify-content:space-between;margin:14px 0;padding:12px;border:1px solid #bba469;border-radius:12px;background:#f4ead1;color:#3e513b}.gwe-activity-tracking-state strong{display:block;font-size:11px;letter-spacing:.02em}.gwe-activity-tracking-state span{display:block;font-size:13px;line-height:1.5;margin-top:3px}.gwe-activity-tracking-state button{flex-shrink:0}.gwe-activity-guide .gwe-activity-track{background:#efe4c4;border-color:#aa9156;color:#394936;margin:0 7px 8px 0}.gwe-activity-guide .gwe-activity-track[aria-pressed=true]{background:#dbe7c9;color:#294c36;border-color:#92aa78;opacity:1}.gwe-activity-track:disabled{cursor:default;opacity:.6}.gwe-activity-track-help{font-size:12px;color:#536757;line-height:1.55;margin:4px 0 12px}.theme-contrast .gwe-activity-tracking-state,[data-stem-theme=contrast] .gwe-activity-tracking-state{background:#000;color:#fff;border:2px solid #ff0}.theme-contrast .gwe-activity-guide .gwe-activity-track,[data-stem-theme=contrast] .gwe-activity-guide .gwe-activity-track{background:#000;color:#0f0;border-color:#ff0}.theme-contrast .gwe-activity-track-help,[data-stem-theme=contrast] .gwe-activity-track-help{color:#fff}@media(max-width:420px){.gwe-activity-tracking-state{align-items:flex-start;flex-direction:column}.gwe-activity-tracking-state button{width:100%}.gwe-activity-guide .gwe-activity-track,.gwe-activity-guide .gwe-activity-travel{width:100%;margin:0 0 8px}}",
      ".gwe-home-backdrop{position:absolute;inset:0;z-index:240;display:flex;align-items:center;justify-content:center;padding:22px;box-sizing:border-box;background:radial-gradient(ellipse at 90% 0%,#cedfcb 0,transparent 55%),radial-gradient(ellipse at 5% 100%,#d9dcbf 0,transparent 50%),#eef0e6;color:#173b35}\n.gwe-home{box-sizing:border-box;width:min(980px,100%);max-height:100%;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#78917a transparent;padding:24px 30px 28px;border:1px solid #fffaf0bd;border-radius:28px;background:#fcfcf2c9;box-shadow:0 24px 80px #234c3620;font-family:ui-sans-serif,system-ui,sans-serif;outline:none}\n.gwe-home *{box-sizing:border-box}.gwe-home-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.gwe-home-brand{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:750;letter-spacing:-.025em}.gwe-home-brand>span{display:block;width:31px;height:34px;color:#527751}.gwe-home button{font:inherit;cursor:pointer;min-height:44px;border:1px solid #8ba38b;border-radius:12px;padding:11px 16px;font-size:13px;font-weight:650;background:#fafbf3;color:#173b35}.gwe-home button:disabled{opacity:.55;cursor:wait}.gwe-home button:focus-visible,.gwe-home select:focus-visible{outline:3px solid #8b5821;outline-offset:3px}.gwe-home button:hover{background:#e5eddc;border-color:#507d5b}.gwe-home .gwe-home-continue{background:#e0eacf;border-color:#a3b895;font-size:12px}.gwe-home-heading{margin:30px 0 24px;max-width:760px}.gwe-home-eyebrow{font-size:10px!important;font-weight:750;letter-spacing:.16em;color:#59765c!important}.gwe-home h1{font-size:clamp(28px,3.4vw,42px);line-height:1.12;letter-spacing:-.045em;margin:10px 0 12px;color:#173b35;font-weight:750}.gwe-home-heading>p:last-child{font-size:14px;line-height:1.65;color:#526b5b;margin:0;max-width:660px}.gwe-home .gwe-home-back{border:0;padding:0 0 6px;min-height:36px;border-radius:3px;background:transparent;font-size:12px;text-decoration:underline;text-underline-offset:4px}.gwe-home-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(max-width:768px){.gwe-home nav.gwe-home-grid{overflow:visible;scroll-snap-type:none;flex-wrap:wrap}.gwe-home nav.gwe-home-grid>button.gwe-home-card{white-space:normal;min-width:0;flex-shrink:1;scroll-snap-align:none}}.gwe-home .gwe-home-card{display:flex;align-items:center;gap:17px;position:relative;min-width:0;min-height:160px;padding:22px;text-align:left;border-radius:20px;border:1px solid #92a58555;background:#e8edde;transition:background .15s,border-color .15s}.gwe-home .gwe-home-card[data-path=learn]{background:#f2ead1;border-color:#b9a76f55}.gwe-home .gwe-home-card[data-path=explore]{background:#e0eced;border-color:#829fa055}.gwe-home .gwe-home-card[data-path=create]{background:#f1e4d9;border-color:#c29b8255}.gwe-home .gwe-home-card:hover{background:#f9fcf0;border-color:#527751}.gwe-home-art{display:grid;place-items:center;flex:0 0 58px;width:58px;height:72px;color:#5c774f}.gwe-home-card[data-path=learn] .gwe-home-art{color:#927031}.gwe-home-card[data-path=explore] .gwe-home-art{color:#457c76}.gwe-home-card[data-path=create] .gwe-home-art{color:#a27452}.gwe-home-art svg{width:100%;height:100%}.gwe-home-card-copy{display:block;min-width:0;flex:1}.gwe-home-card-kicker{display:block;font-size:10px;letter-spacing:.06em;color:#546c59}.gwe-home-card strong{display:block;margin:5px 0 8px;font-size:25px;font-weight:750;letter-spacing:-.035em;line-height:1.15}.gwe-home-card-description{display:block;font-size:12px;line-height:1.65;font-weight:450;color:#486153}.gwe-home-arrow{align-self:flex-start;font-size:21px;color:#5c775d}.gwe-home-footer{margin-top:18px;padding:18px 4px 0;border-top:1px solid #98ac922f;display:flex;align-items:center;justify-content:space-between;gap:16px}.gwe-home-footer strong{font-size:13px}.gwe-home-footer p{font-size:12px;color:#5a705f;line-height:1.5;margin:5px 0 0}.gwe-home-footer button{flex-shrink:0}.gwe-home-detail{max-width:820px}.gwe-home-detail h2{font-size:20px;line-height:1.3;letter-spacing:-.025em;margin:0 0 8px}.gwe-home-detail p,.gwe-home-detail li{font-size:13px;line-height:1.65;color:#526b5b}.gwe-home-detail ul{padding-left:20px;margin-bottom:0}.gwe-home-lesson-picker{display:flex;flex-direction:column;gap:8px;margin:0 0 20px}.gwe-home-lesson-picker label{font-size:12px;font-weight:700}.gwe-home-lesson-picker select{min-height:46px;border:1px solid #92a589;border-radius:10px;padding:10px;font:inherit;font-size:14px;background:#fffdf6;color:#173b35;max-width:100%}.gwe-home-preview{display:flex;gap:22px;padding:24px;border:1px solid #9cb18e55;border-radius:18px;background:#e7eedf;margin:0 0 20px}.gwe-home-detail-art{width:64px;flex:0 0 64px;color:#65845b}.gwe-home-journey{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:22px}.gwe-home-journey article{padding:20px;border-radius:16px;background:#e7eedf;border:1px solid #9cb18e44}.gwe-home-journey article>span{display:block;font-size:11px;color:#5d7853;margin-bottom:16px}.gwe-home-journey h2{font-size:17px}.gwe-home-journey p{font-size:12px;margin-bottom:0}.gwe-home .gwe-home-primary{background:#244f3e;color:#fafbef;border-color:#244f3e}.gwe-home .gwe-home-primary:hover{background:#35634a}.gwe-home-secondary{margin-left:8px}.gwe-home-save{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 16px;border:1px solid #b4a37755;border-radius:12px;background:#f5eddc;margin:16px 0}.gwe-home-save p{margin:0;font-size:12px;max-width:530px}.gwe-home-save button{flex-shrink:0;font-size:11px;padding:9px}.gwe-home-create-option{padding:20px;border-radius:16px;background:#e7eedf88;border:1px solid #9cb18e44;margin-bottom:14px}.gwe-home-create-option .gwe-home-secondary{margin-left:0}.gwe-home-file{padding:26px;text-align:center;border:1px dashed #8aa081;border-radius:18px;background:#e7eedf66}.gwe-home-file>svg{width:40px;height:40px;margin:0 auto 12px}.gwe-home .gwe-recovery{margin-top:15px}.gw-home-brand-button{all:unset;cursor:pointer;border-radius:4px;display:block}.gw-home-brand-button:focus-visible{outline:3px solid #e8c884;outline-offset:4px}.gwe-home-shortcut{position:absolute;z-index:155;top:8px;left:156px;min-height:40px;border:1px solid #9bb89e66;border-radius:10px;background:#173b35;color:#f5f0e5;padding:7px 12px;cursor:pointer;font-size:12px}@media(max-width:800px){#geoworld-fs-workspace>.gwe-home-shortcut{top:56px;left:auto;right:8px;min-height:44px}#geoworld-fs-workspace[data-toolbar-collapsed=true]:not([data-fullscreen=true])>.gw-toolbar-reveal{min-height:44px}}\n@media(max-width:600px){.gwe-home-backdrop{padding:10px}.gwe-home{padding:20px 18px;border-radius:20px}.gwe-home-top{align-items:flex-start;flex-wrap:wrap}.gwe-home-heading{margin:24px 0 20px}.gwe-home h1{font-size:30px}.gwe-home-grid{grid-template-columns:1fr;gap:10px}.gwe-home .gwe-home-card{min-height:124px;padding:16px;gap:14px}.gwe-home-art{flex-basis:44px;width:44px;height:58px}.gwe-home-card strong{font-size:23px}.gwe-home-card-description{font-size:12px}.gwe-home-footer{align-items:stretch;flex-direction:column;gap:12px}.gwe-home-footer button{width:100%}.gwe-home-journey{grid-template-columns:1fr;gap:10px}.gwe-home-journey article{padding:15px}.gwe-home-journey article>span{margin-bottom:8px}.gwe-home-save{flex-direction:column;align-items:stretch;gap:10px}.gwe-home-detail-art{display:none}.gwe-home-preview{padding:18px}.gwe-home-secondary{margin:8px 0 0}.gwe-home-detail>.gwe-home-primary,.gwe-home-detail>.gwe-home-secondary{width:100%}.gwe-home-file{padding:20px 16px}}\n@media(max-height:520px){.gwe-home-backdrop{padding:8px}.gwe-home{padding:16px 22px}.gwe-home-heading{margin:16px 0}.gwe-home h1{font-size:29px}.gwe-home .gwe-home-card{min-height:125px;padding:16px}.gwe-home-card strong{font-size:22px}}\n.theme-contrast .gwe-home-backdrop,[data-stem-theme=contrast] .gwe-home-backdrop{background:#000}.theme-contrast .gwe-home,[data-stem-theme=contrast] .gwe-home{background:#000;border:2px solid #0ff;color:#fff}.theme-contrast .gwe-home :is(h1,h2,p,span,strong,label,li),[data-stem-theme=contrast] .gwe-home :is(h1,h2,p,span,strong,label,li){color:#fff}.theme-contrast .gwe-home :is(button,select),[data-stem-theme=contrast] .gwe-home :is(button,select){background:#000!important;color:#0f0!important;border:2px solid #0ff!important}.theme-contrast .gwe-home :is(article,section,.gwe-home-save,.gwe-home-file),[data-stem-theme=contrast] .gwe-home :is(article,section,.gwe-home-save,.gwe-home-file){background:#000;border-color:#0ff}@media(prefers-reduced-motion:reduce){.gwe-home-card{transition:none!important}}",
      ".gwe-recovery{padding:12px;border:1px solid #a9c7b069;border-radius:12px;background:#234b3c}.gwe-recovery[data-state=\"error\"]{border-color:#eab1a0;background:#552d29}.gwe-recovery strong{display:block;color:#fff5e6;font-size:13px}.gwe-recovery p{margin:6px 0 0;color:#deead7;font-size:12px;line-height:1.6}.gwe-recovery[data-state=\"error\"] p{color:#ffe4da}.gwe-recovery-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.gwe-recovery-actions button{min-height:44px;padding:8px;border:1px solid #c6d7b965;border-radius:10px;background:#173b35;color:#f5f0e5;font-size:12px;font-weight:650;cursor:pointer}.gwe-recovery[data-state=\"backup\"] .gwe-recovery-actions{grid-template-columns:1fr}.gwe-recovery-actions .gwe-recovery-download{width:100%;box-sizing:border-box;min-height:44px;white-space:normal;background:#d4e8ca;border-color:#d4e8ca;color:#173b35;font-size:13px;line-height:1.35}.gwe-recovery-actions .gwe-replace{background:#f1d094;border-color:#f1d094;color:#3b2e19}",
      ".gwe-backdrop{position:absolute;inset:0;z-index:210;display:flex;box-sizing:border-box;align-items:center;justify-content:center;padding:20px;background:#0b231ec4;backdrop-filter:blur(8px)}.gwe-launcher{box-sizing:border-box;width:min(760px,100%);max-height:calc(100% - 8px);overflow:auto;border:1px solid #fff9ebad;border-radius:26px;background:#f5f0e5;box-shadow:0 28px 90px #0b211f70;color:#173b35}.gwe-launcher-hero{position:relative;overflow:hidden;padding:30px 28px 24px;border-bottom:1px solid #173b351c;background:linear-gradient(115deg,#f5f0e5 60%,#e4e9d7)}.gwe-launcher-kicker{position:relative;margin:0;color:#526a52;font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}.gwe-launcher h2{position:relative;max-width:540px;margin:10px 0 0;color:#173b35;font-size:30px;font-weight:750;letter-spacing:-.04em;line-height:1.15}.gwe-launcher-subtitle{position:relative;max-width:575px;margin:13px 0 0;color:#526458;font-size:14px;line-height:1.65}.gwe-launcher-art{position:absolute;top:-10px;right:-20px;width:200px;height:200px;color:#73876d;opacity:.15;transform:rotate(-8deg);pointer-events:none}.gwe-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:22px 28px}.gwe-feature{padding:16px 14px;border:1px solid #58724b26;border-radius:15px;background:#fffaf044}.gwe-feature-icon{display:grid;width:30px;height:30px;place-items:center;border:1px solid #5b785144;border-radius:50%;color:#526a43;font-size:12px;font-weight:700}.gwe-feature strong{display:block;margin-top:13px;color:#173b35;font-size:14px;font-weight:750;letter-spacing:-.015em}.gwe-feature p{margin:8px 0 0;color:#576458;font-size:12px;line-height:1.65}.gwe-reset-note{margin:0 28px;padding:13px 14px;border:1px solid #a886503b;border-radius:12px;background:#eae0c666;color:#66552f;font-size:12px;line-height:1.6}.gwe-launcher-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:9px;padding:22px 28px 26px}.gwe-launcher-actions button{min-height:46px;padding:10px 15px;border:1px solid #173b3544;border-radius:12px;background:#fffaf066;color:#173b35;font-size:12px;font-weight:650;cursor:pointer}.gwe-launcher-actions button:hover{background:#e5e9d7}.gwe-launcher-actions .gwe-open{border-color:#173b35;background:#173b35;color:#f5f0e5}.gwe-launcher-actions .gwe-open:hover{background:#2a5042}.gwe-builder-dock :is(button,summary):focus-visible,.gwe-launcher button:focus-visible,.gwe-free-build-launch:focus-visible{outline:3px solid #e8c884;outline-offset:2px}.gwe-launcher button:focus-visible{outline-color:#406647}",
      "#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-inventory-panel{display:none!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-builder-panel=\"build\"] .gw-measure-card{display:none!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-measure-card{right:calc(12px + min(346px,calc(100% - 24px)) + 10px)!important;width:min(430px,calc(100% - 24px - min(346px,calc(100% - 24px)) - 22px))!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-builder-panel=\"measure\"] .gwe-builder-dock{top:auto;bottom:184px;max-height:64px;z-index:152}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-builder-panel=\"measure\"] .gwe-builder-icon{display:none}",
      "@media(max-width:800px){.gwe-free-build-launch{top:108px;right:7px}.gwe-builder-dock{top:auto;bottom:16px;right:7px;max-height:42%}.gwe-builder-dock[data-collapsed=\"true\"]{bottom:184px;left:auto;max-height:64px}.gwe-builder-dock[data-collapsed=\"true\"] .gwe-builder-icon{display:none}.gwe-builder-head{padding:10px 13px}.gwe-builder-quick-actions{padding:9px 13px 11px}.gwe-workflow{padding:9px 14px 0}.gwe-builder-body{padding:13px;gap:13px}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"]:has(.gwe-builder-dock[data-collapsed=\"false\"]) :is(.gw-hotbar,.gw-shape-tray,.gw-action-bar,.gw-touch-controls){visibility:hidden}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-measure-card{right:6px!important;width:calc(100% - 12px)!important;max-height:calc(100% - 270px)!important;overflow:auto!important;top:8px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-coordinate-hud{top:8px;bottom:auto!important;left:8px;max-width:calc(100% - 90px);z-index:21}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-coordinate-hud summary{min-height:32px;display:flex;align-items:center;cursor:pointer;font-size:12px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-action-bar{left:8px!important;right:8px!important;width:auto!important;transform:none!important;flex-wrap:nowrap!important;justify-content:flex-start!important;overflow-x:auto;max-width:none!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"] .gw-action-bar button{min-height:44px;flex-shrink:0;font-size:12px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"] .gwe-builder-dock[data-collapsed=\"true\"]{left:50%;right:auto;transform:translateX(-50%);bottom:197px;width:auto}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"] .gw-action-bar{left:8px!important;right:auto!important;width:140px!important;bottom:262px!important;flex-wrap:wrap!important;justify-content:flex-start!important;gap:4px!important}.gwe-backdrop{padding:12px}.gwe-launcher{border-radius:20px}.gwe-launcher-hero{padding:23px 20px 20px}.gwe-launcher h2{font-size:26px}.gwe-feature-grid{padding:17px 20px}.gwe-reset-note{margin:0 20px}.gwe-launcher-actions{padding:18px 20px 20px}}",
      "@media(max-width:800px) and (min-height:620px) and (orientation:portrait){#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"][data-builder-panel=\"build\"] .gw-action-bar.gw-action-bar{left:8px!important;right:8px!important;bottom:132px!important;width:auto!important;max-width:none!important;flex-wrap:nowrap!important;gap:3px!important;padding:3px!important;overflow-x:auto;overflow-y:hidden;border-radius:13px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"][data-builder-panel=\"build\"] .gw-action-bar button{flex:1 0 auto;min-width:44px;min-height:44px;padding:6px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"][data-builder-panel=\"build\"] .gw-utility-content{gap:4px}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"][data-builder-panel=\"build\"] .gw-touch-actions.gw-touch-actions{bottom:190px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"][data-builder-panel=\"build\"] .gw-touch-joystick{bottom:198px!important}#geoworld-fs-workspace[data-geometry-mode=\"sandbox\"][data-touch-active=\"true\"][data-builder-panel=\"build\"] .gwe-builder-dock[data-collapsed=\"true\"]{bottom:204px}}",
      "@media(max-width:520px){.gwe-builder-dock{left:7px;right:7px;width:auto}.gwe-builder-dock[data-collapsed=\"true\"]{left:auto}.gwe-builder-name{font-size:16px}.gwe-workflow{justify-content:space-around}.gwe-feature-grid{grid-template-columns:1fr;gap:9px}.gwe-feature{display:grid;grid-template-columns:30px 1fr;column-gap:12px;padding:12px}.gwe-feature-icon{grid-row:1/3}.gwe-feature strong{margin:0;font-size:13px}.gwe-feature p{margin:5px 0 0;font-size:12px}.gwe-launcher h2{font-size:25px}.gwe-launcher-subtitle{font-size:13px}.gwe-launcher-actions{display:grid;grid-template-columns:1fr 1fr}.gwe-launcher-actions button:first-child{grid-column:1/-1}.gwe-launcher-actions .gwe-open{grid-column:2}.gwe-reset-note{font-size:12px}}",
      ".theme-contrast .gwe-builder-dock,[data-stem-theme=\"contrast\"] .gwe-builder-dock,.theme-contrast .gwe-launcher,[data-stem-theme=\"contrast\"] .gwe-launcher{border:2px solid #00ffff;background:#000;color:#fff}.theme-contrast :is(.gwe-builder-head,.gwe-builder-quick-actions,.gwe-launcher-hero,.gwe-selection-card,.gwe-metric,.gwe-print-ready,.gwe-connection-check,.gwe-feature,.gwe-reset-note),[data-stem-theme=\"contrast\"] :is(.gwe-builder-head,.gwe-builder-quick-actions,.gwe-launcher-hero,.gwe-selection-card,.gwe-metric,.gwe-print-ready,.gwe-connection-check,.gwe-feature,.gwe-reset-note){background:#000;border-color:#00ffff}.theme-contrast :is(.gwe-builder-dock,.gwe-launcher) :is(p,span,strong,h2,summary,.gwe-section-title,.gwe-builder-name,.gwe-builder-eyebrow),[data-stem-theme=\"contrast\"] :is(.gwe-builder-dock,.gwe-launcher) :is(p,span,strong,h2,summary,.gwe-section-title,.gwe-builder-name,.gwe-builder-eyebrow){color:#fff}.theme-contrast :is(.gwe-builder-dock,.gwe-launcher) button,[data-stem-theme=\"contrast\"] :is(.gwe-builder-dock,.gwe-launcher) button{border:2px solid #00ff00;background:#000;color:#00ff00}.theme-contrast .gwe-fit-badge,[data-stem-theme=\"contrast\"] .gwe-fit-badge{background:#000;border:1px solid #00ffff}.theme-contrast .gwe-workflow li[aria-current=\"step\"] span,[data-stem-theme=\"contrast\"] .gwe-workflow li[aria-current=\"step\"] span{background:#000;border-color:#00ffff}.theme-contrast .gwe-launcher-art,[data-stem-theme=\"contrast\"] .gwe-launcher-art{display:none}@media(prefers-reduced-motion:reduce){.gwe-free-build-launch,.gwe-builder-dock,.gwe-launcher,.gwe-builder-dock button,.gwe-launcher button{transition:none!important;animation:none!important}}"
      ,'.gw-root .gwe-showcase[role="dialog"]{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;z-index:205!important}.gwe-showcase{position:absolute;inset:0;z-index:205;background:linear-gradient(180deg,rgba(4,18,27,.18),transparent 22%,transparent 74%,rgba(4,18,27,.24));display:flex;align-items:flex-end;justify-content:center;padding:24px;box-sizing:border-box}.gwe-showcase-orbit{position:absolute;top:50%;width:44px;height:44px;border:1px solid #d3e5df99;border-radius:50%;background:#0c2438dd;color:#fff;font-size:25px;cursor:pointer;box-shadow:0 6px 20px #06192733}.gwe-showcase-orbit-left{left:20px}.gwe-showcase-orbit-right{right:20px}.gwe-showcase-orbit:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.gwe-showcase-caption{position:absolute;top:26px;left:28px;color:#fff;text-shadow:0 2px 16px #102b40}.gwe-showcase-caption span{font-size:10px;letter-spacing:.22em;font-weight:800}.gwe-showcase-caption strong{display:block;margin-top:6px;font-size:28px;font-weight:800;letter-spacing:-.03em}.gwe-showcase-tools{display:flex;gap:8px;padding:7px;border:1px solid #ffffff55;border-radius:16px;background:#0c2438e8;box-shadow:0 12px 36px #06192755;backdrop-filter:blur(12px)}.gwe-showcase-tools button{min-height:44px;padding:10px 18px;border:1px solid #a5cad055;border-radius:10px;background:transparent;color:#fff;font-size:13px;font-weight:800;cursor:pointer}.gwe-showcase-actions button:last-child{background:#d4e8ca;color:#173b35}.gwe-showcase-tools button:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}#geoworld-fs-workspace[data-showcase-active="true"] .gw-toolbar{visibility:hidden}#geoworld-fs-workspace[data-showcase-active="true"] .gwe-builder-dock,#geoworld-fs-workspace[data-showcase-active="true"] .gw-hotbar,#geoworld-fs-workspace[data-showcase-active="true"] .gw-action-bar,#geoworld-fs-workspace[data-showcase-active="true"] .gw-shape-tray,#geoworld-fs-workspace[data-showcase-active="true"] .gw-coordinate-hud,#geoworld-fs-workspace[data-showcase-active="true"] .gw-touch-controls,#geoworld-fs-workspace[data-showcase-active="true"] .gw-crosshair,#geoworld-fs-workspace[data-showcase-active="true"] .gw-measure-card,#geoworld-fs-workspace[data-showcase-active="true"] .gw-viewport-control{visibility:hidden!important}@media(max-width:520px){.gwe-showcase{padding:16px}.gwe-showcase-caption{top:20px;left:20px}.gwe-showcase-caption strong{font-size:24px}}'
      ,".gwe-showcase-looks{display:inline-flex;gap:3px;margin-top:14px;padding:4px;border:1px solid #c8ded466;border-radius:999px;background:#0c2438dc;box-shadow:0 6px 18px #102b4022;text-shadow:none}.gwe-showcase-looks button{min-height:44px;min-width:92px;padding:8px 18px;border:0;border-radius:999px;background:transparent;color:#e5f0ec;font-size:12px;font-weight:800;cursor:pointer}.gwe-showcase-looks button[aria-pressed=\"true\"]{background:#d5f2e8;color:#123c39}.gwe-showcase-looks button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}.gw-root[data-showcase-active=\"true\"][data-showcase-look=\"studio\"]{background:#f1eee8!important}.gwe-showcase[data-look=\"studio\"]{background:linear-gradient(180deg,rgba(241,238,232,.15),transparent 24%,transparent 78%,rgba(86,68,44,.08))}.gwe-showcase[data-look=\"studio\"] button:focus-visible{outline-color:#245049}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-caption{color:#3d372e;text-shadow:none}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-looks{border-color:#8e7c5e44;background:#faf7f1ed;box-shadow:0 5px 16px #69523714}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-looks button{color:#665c4d}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-looks button[aria-pressed=\"true\"]{background:#245049;color:#f5fbf7}@media(max-width:520px){.gwe-showcase-looks{margin-top:12px}.gwe-showcase-looks button{min-width:88px;padding:8px 16px}}"
      ,".gwe-showcase-tools{flex-direction:column;gap:6px;max-width:100%;background:#112d2bef;border-color:#c6d7bd55}.gwe-showcase-actions{display:flex;gap:8px}.gwe-showcase-actions button{flex:1 1 auto;white-space:nowrap}.gwe-showcase-views{display:grid;grid-template-columns:1.65fr 1fr 1fr 1fr;gap:3px;padding:3px;border-radius:11px;background:#f5f0e509}.gwe-showcase-views button{min-width:0;min-height:44px;padding:7px 8px;border:0;border-radius:8px;color:#cfddc8;font-size:11px;font-weight:650;white-space:nowrap}.gwe-showcase-views button[aria-pressed=\"true\"]{background:#d4e8ca;color:#173b35}.gwe-showcase-views button:hover{box-shadow:inset 0 0 0 1px #bfd2b555}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-tools{background:#faf7f1ed;border-color:#8e7c5e44;box-shadow:0 10px 32px #69523721}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-tools button{color:#245049;border-color:#8e7c5e44}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-views{background:#2450490a}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-views button[aria-pressed=\"true\"],.gwe-showcase[data-look=\"studio\"] .gwe-showcase-actions button:last-child{background:#245049;color:#f5fbf7}@media(max-width:520px){.gwe-showcase-tools{width:min(296px,100%);box-sizing:border-box;padding:6px}.gwe-showcase-actions button{padding:9px 10px;font-size:12px}.gwe-showcase-views button{padding:6px 4px}}.theme-contrast .gwe-showcase-tools,[data-stem-theme=\"contrast\"] .gwe-showcase-tools{background:#000!important;border:2px solid #00ffff!important}.theme-contrast .gwe-showcase-tools button,[data-stem-theme=\"contrast\"] .gwe-showcase-tools button{color:#00ff00!important;border:1px solid #00ff00!important;background:#000!important}.theme-contrast .gwe-showcase-views button[aria-pressed=\"true\"],[data-stem-theme=\"contrast\"] .gwe-showcase-views button[aria-pressed=\"true\"]{background:#00ff00!important;color:#000!important}"
      ,".gwe-showcase-caption{top:24px;left:28px}.gwe-showcase-caption>span{font-size:9px;letter-spacing:.2em;color:#e0eddb}.gwe-showcase-caption strong{font-size:30px;font-weight:700;letter-spacing:-.035em}.gwe-showcase-meta{margin:6px 0 0;color:#e0eddb;font-size:12px;line-height:1.35;font-variant-numeric:tabular-nums}.gwe-showcase-looks{margin-top:10px;background:#173b35e8;border-color:#d4e8ca55;box-shadow:0 4px 16px #112d2b1a}.gwe-showcase-looks button{font-weight:650}.gwe-showcase-looks button[aria-pressed=\"true\"]{background:#d4e8ca;color:#112d2b}.gwe-showcase-orbit{display:grid;place-items:center;background:#173b35dc;color:#f5f0e5;border-color:#d4e8ca66;box-shadow:0 4px 18px #112d2b1f;transition:background .16s,border-color .16s}.gwe-showcase-orbit:hover{background:#2a5042;border-color:#f5f0e5}.gwe-showcase-tools{border-radius:18px;padding:8px;box-shadow:0 12px 32px #112d2b24}.gwe-showcase-actions button{font-weight:650}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-caption>span{color:#686b58}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-caption strong{color:#243c32}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-meta{color:#55624f}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-orbit{background:#faf7f1de;color:#245049;border-color:#6b80694d;box-shadow:0 4px 16px #34453312}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-orbit:hover{background:#fffdf7;border-color:#2450498c}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-tools{background:#faf8f0ef;border-color:#73866a40;box-shadow:0 8px 28px #34453314}.gwe-showcase[data-look=\"studio\"] .gwe-showcase-looks{border-color:#73866a40;background:#faf8f0ed}.theme-contrast .gwe-showcase-caption>span,.theme-contrast .gwe-showcase-meta,[data-stem-theme=\"contrast\"] .gwe-showcase-caption>span,[data-stem-theme=\"contrast\"] .gwe-showcase-meta{color:#00ff00!important;background:#000}.theme-contrast .gwe-showcase-orbit,[data-stem-theme=\"contrast\"] .gwe-showcase-orbit{color:#00ff00!important;background:#000!important;border:2px solid #00ffff!important}@media(max-width:520px){.gwe-showcase-caption{top:20px;left:20px}.gwe-showcase-caption strong{font-size:25px}.gwe-showcase-meta{display:none}.gwe-showcase-tools{padding:6px}.gwe-showcase-orbit-left{left:16px}.gwe-showcase-orbit-right{right:16px}}@media(prefers-reduced-motion:reduce){.gwe-showcase-orbit{transition:none}}"
      ,".gwe-showcase[data-look=\"meadow\"] .gwe-showcase-caption{isolation:isolate;text-shadow:none}.gwe-showcase[data-look=\"meadow\"] .gwe-showcase-caption:before{content:\"\";position:absolute;inset:-8px -10px;z-index:-1;border:1px solid #c5d9c133;border-radius:18px;background:#173b35;box-shadow:0 8px 24px #112d2b24}.theme-contrast .gwe-showcase[data-look=\"meadow\"] .gwe-showcase-caption:before,[data-stem-theme=\"contrast\"] .gwe-showcase[data-look=\"meadow\"] .gwe-showcase-caption:before{background:#000;border-color:#00ffff}"
      ,".gwe-showcase-tools button:disabled,.gwe-showcase-tools button[aria-disabled=\"true\"]{opacity:.65;cursor:progress}"
      ,".gwe-print-dimensions{margin-top:11px}.gwe-print-axes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.gwe-print-axis{min-width:0;padding:9px 7px;border:1px solid #bdd0b52e;border-radius:9px;background:#112d2b38}.gwe-print-axis-label{display:block;color:#cfddc8;font-size:10px;font-weight:550}.gwe-print-ready .gwe-print-axis strong{margin-top:4px;font-size:18px;line-height:1.2;letter-spacing:-.02em;overflow-wrap:anywhere}.gwe-print-axis small{display:block;margin-top:2px;color:#bdcfb8;font-size:10px}.gwe-print-axis[data-over=\"true\"]{border-color:#f1c67d99;background:#f1c67d12}.gwe-print-ready .gwe-print-axis[data-over=\"true\"] strong{color:#f4d69f}.gwe-print-axis-note{display:block;margin-top:5px;color:#f4d69f;font-size:9px;font-weight:650}.gwe-assistive-copy{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap}.theme-contrast .gwe-print-axis,[data-stem-theme=\"contrast\"] .gwe-print-axis{background:#000;border-color:#fff}.theme-contrast .gwe-print-axis[data-over=\"true\"],[data-stem-theme=\"contrast\"] .gwe-print-axis[data-over=\"true\"]{border:2px dashed #ffff00}.theme-contrast .gwe-print-axis small,[data-stem-theme=\"contrast\"] .gwe-print-axis small{color:#fff}"
      ,"#geoworld-fs-workspace[data-builder-panel=\"measure\"][data-measurement-expanded=\"true\"] .gwe-builder-dock[data-collapsed=\"true\"]{visibility:hidden;pointer-events:none}"
      ,".gwe-showcase-tools{width:min(430px,100%);box-sizing:border-box}.gwe-showcase-actions{display:grid;grid-template-columns:1.2fr .85fr 1fr}.gwe-showcase-actions button{min-width:0;padding:9px 8px;white-space:normal;font-size:12px}.gwe-showcase-files-backdrop{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:flex-end;padding:20px;box-sizing:border-box;background:#08251d55}.gwe-showcase-files{display:flex;flex-direction:column;width:408px;max-width:100%;max-height:100%;box-sizing:border-box;border:1px solid #a5b9a7;border-radius:22px;background:#f8f6ee;color:#173b35;box-shadow:0 24px 70px #09251d55;text-shadow:none}.gwe-showcase-files:focus{outline:none}.gwe-files-header{flex-shrink:0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 18px 15px;border-bottom:1px solid #2b534323}.gwe-files-eyebrow{font-size:9px;font-weight:750;letter-spacing:.18em;color:#536c58}.gwe-files-header h2{margin:5px 0 4px;font-size:25px;line-height:1.15;letter-spacing:-.035em;font-weight:750}.gwe-files-header p{margin:0;color:#566c5d;font-size:12px}.gwe-showcase-files button{box-sizing:border-box;min-height:44px;padding:9px 12px;border:1px solid #9ab09d;border-radius:10px;background:#fffdf7;color:#1c4a3b;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.gwe-showcase-files button:hover{background:#e5ecdd;border-color:#477858}.gwe-showcase-files button:focus-visible,.gwe-showcase-files .gwe-recovery:focus{outline:3px solid #8e6229;outline-offset:2px}.gwe-showcase-files button:disabled{opacity:.6;cursor:wait}.gwe-showcase-files .gwe-files-close{flex:0 0 44px;width:44px;padding:0;font-size:24px}.gwe-files-body{display:flex;flex-direction:column;gap:12px;min-height:0;padding:15px 18px 18px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#92a58e #f8f6ee}.gwe-file-card{padding:15px;border:1px solid #9db09d66;border-radius:15px;background:#fffef9}.gwe-file-heading{display:flex;align-items:center;gap:10px}.gwe-file-icon{width:27px;height:27px;flex:0 0 27px;color:#537856}.gwe-file-card h3{margin:0;font-size:15px;line-height:1.3;letter-spacing:-.015em}.gwe-file-card p{margin:9px 0 12px;color:#506858;font-size:12px;line-height:1.55}.gwe-file-card>button{width:100%}.gwe-file-actions{display:grid;grid-template-columns:1fr 1.2fr;gap:7px}.gwe-showcase-files .gwe-file-primary{background:#24533e;color:#f8f6ee;border-color:#24533e}.gwe-showcase-files .gwe-file-primary:hover{background:#33654b}.gwe-file-card .gwe-file-note{margin:9px 0 0;font-size:11px;line-height:1.5}.gwe-file-import{border-style:dashed;background:#eef1e7}.gwe-file-photo{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px}.gwe-file-photo strong,.gwe-file-photo span{display:block;font-size:12px}.gwe-file-photo span{margin-top:4px;font-size:11px;color:#566c5d}.gwe-file-status{margin:0;padding:10px;border-radius:10px;background:#dde9d5;font-size:12px;line-height:1.5}.gwe-showcase-files .gwe-recovery{margin-top:12px;background:#f8f6ee;border-color:#9ab09d;color:#173b35}.gwe-showcase-files .gwe-recovery p,.gwe-showcase-files .gwe-recovery strong{color:#173b35}.gwe-showcase-files .gwe-recovery[data-state=\"error\"]{background:#fff0df;border-color:#ac703c}.gwe-showcase-files .gwe-recovery-actions{display:flex;flex-wrap:wrap;gap:7px}.gwe-showcase-files .gwe-replace{background:#6a422e;color:#fff9ee;border-color:#6a422e}@media(max-width:520px){.gwe-showcase-tools{width:min(320px,100%)}.gwe-showcase-actions button{padding:8px 5px;font-size:11px}.gwe-showcase-files-backdrop{padding:10px;justify-content:center}.gwe-files-header{padding:16px 14px 12px}.gwe-files-header h2{font-size:23px}.gwe-files-body{padding:12px 14px 14px}.gwe-file-card{padding:12px}}@media(max-height:500px){.gwe-showcase-files-backdrop{padding:8px}.gwe-files-header{padding:10px 14px}.gwe-files-header h2{font-size:21px}.gwe-files-body{padding:10px 14px}}.theme-contrast .gwe-showcase-files,[data-stem-theme=\"contrast\"] .gwe-showcase-files{background:#000;color:#fff;border:2px solid #0ff}.theme-contrast .gwe-showcase-files :is(.gwe-files-header,.gwe-files-body,.gwe-file-card,.gwe-recovery,.gwe-file-status),[data-stem-theme=\"contrast\"] .gwe-showcase-files :is(.gwe-files-header,.gwe-files-body,.gwe-file-card,.gwe-recovery,.gwe-file-status){background:#000;color:#fff;border-color:#0ff}.theme-contrast .gwe-showcase-files :is(p,span,strong,h2,h3,svg),[data-stem-theme=\"contrast\"] .gwe-showcase-files :is(p,span,strong,h2,h3,svg){color:#fff}.theme-contrast .gwe-showcase-files button,[data-stem-theme=\"contrast\"] .gwe-showcase-files button{background:#000;color:#0f0;border:2px solid #0f0}"
      ,".gwe-showcase-orbit{transform:translateY(-50%)}@media(max-height:500px){.gwe-showcase{padding:12px 16px}.gwe-showcase-caption{top:12px;left:20px;right:20px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px}.gwe-showcase-caption>span,.gwe-showcase-meta{display:none}.gwe-showcase-caption strong{margin:0;font-size:23px;line-height:1.2}.gwe-showcase-looks{margin:0;padding:3px}.gwe-showcase-looks button{min-width:80px;padding:8px 12px;font-size:11px}.gwe-showcase-tools{padding:6px}.gwe-showcase-views button{padding:6px 5px}.gwe-showcase-actions button{padding:8px 7px;font-size:11px}}@media(max-height:500px) and (min-width:740px){.gwe-showcase-tools{flex-direction:row;gap:10px;width:min(780px,100%);padding:7px 9px;border-radius:16px}.gwe-showcase-views{flex:1.05 1 0;min-width:0}.gwe-showcase-actions{flex:1.2 1 0;min-width:0;gap:6px}.gwe-showcase-actions button{font-size:12px}}"
      ,".gwe-builder-dock .gwe-choice-card{appearance:none;min-height:76px;text-align:left;color:inherit;font:inherit;cursor:pointer}.gwe-choice-card .gwe-selection-label{display:flex;justify-content:space-between;gap:6px}.gwe-choice-change{font-size:10px;font-weight:650;color:#d4e8ca;text-decoration:underline;text-underline-offset:3px}.gwe-builder-dock .gwe-choice-card:hover{background:#315446;border-color:#bad0b886}.gwe-builder-dock .gwe-choice-card:focus-visible,.gwe-builder-dock .gwe-resume-building:focus-visible{outline:3px solid #f1d094;outline-offset:2px}.gwe-builder-footer{flex:0 0 auto;padding:10px 15px 12px;border-top:1px solid #b9d1bf26;background:#173b35}.gwe-resume-building{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;padding:9px 12px;border:1px solid #acc9af66;border-radius:11px;background:#244c40;color:#f5f0e5;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.gwe-resume-building svg{order:1}.gwe-resume-building:hover{background:#315b49;border-color:#d4e8ca}.gwe-builder-quick-actions button:disabled{cursor:default}.gwe-builder-dock[data-collapsed=\"true\"] .gwe-collapse{padding:8px 12px;white-space:nowrap}@media(max-width:800px){.gwe-builder-dock[data-collapsed=\"false\"]{max-height:min(62%,calc(100% - 118px))}.gwe-builder-footer{padding:8px 13px 10px}.gwe-builder-head{padding-top:8px;padding-bottom:8px}.gwe-builder-quick-actions{padding-top:8px;padding-bottom:9px}.gwe-workflow{padding-top:7px}}@media(max-height:500px){.gwe-builder-dock[data-collapsed=\"false\"]{max-height:calc(100% - 118px)}.gwe-builder-dock[data-collapsed=\"false\"] .gwe-builder-icon,.gwe-builder-dock[data-collapsed=\"false\"] .gwe-builder-eyebrow{display:none}.gwe-builder-head{padding:6px 12px}.gwe-workflow{padding-top:5px}.gwe-builder-quick-actions{padding:6px 12px 8px}.gwe-builder-footer{padding:6px 12px 8px}}.theme-contrast .gwe-choice-change,[data-stem-theme=\"contrast\"] .gwe-choice-change{color:#0f0}.theme-contrast .gwe-builder-footer,[data-stem-theme=\"contrast\"] .gwe-builder-footer{background:#000;border-color:#0ff}"
    ].join('');
    document.head.appendChild(style);
  }

  function trapDialogKeys(event, close) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    var controls = Array.prototype.slice.call(event.currentTarget.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
    if (!controls.length) return;
    var first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function studioCubeMark(h) {
    return h('svg', {viewBox:'0 0 32 32', width:'100%', height:'100%', fill:'none', 'aria-hidden':'true', focusable:'false'},
      h('path', {d:'M16 4 27 10.5v12L16 29 5 22.5v-12L16 4Z', stroke:'currentColor', strokeWidth:1.4, strokeLinejoin:'round'}),
      h('path', {d:'M5 10.5 16 17l11-6.5M16 17v12M10.5 7.25l11 6.5', stroke:'currentColor', strokeWidth:1.4, strokeLinejoin:'round'})
    );
  }

  // Optional expedition data; old lessons retain their familiar objectives.
  function lessonOverviewModel(lesson) {
    if (!lesson || typeof lesson !== 'object') return null;
    var activities=Array.isArray(lesson.activities)?lesson.activities.filter(function(a){return a&&typeof a.title==='string';}).slice(0,12):[];
    var npcs=Array.isArray(lesson.npcs)?lesson.npcs.filter(function(n){return n&&typeof n==='object';}).slice(0,20):[];
    var questionCount=npcs.reduce(function(total,n){return total+(n.question?1+(Array.isArray(n.question.followUp)?n.question.followUp.slice(0,3).length:0):0);},0);
    var minutes=lesson.estimatedMinutes;
    if(typeof minutes==='number')minutes=isFinite(minutes)&&minutes>0&&minutes<=300?String(Math.round(minutes)):'';
    minutes=typeof minutes==='string'?minutes.trim():'';
    if(!/^\d{1,3}(?:\s*[–-]\s*\d{1,3})?(?:\s*min(?:utes)?)?$/i.test(minutes))minutes='';
    if(minutes)minutes=minutes.replace(/\s*min(?:utes)?$/i,'')+' min';
    var g=lesson.ground;
    var validGround=g&&['xMin','xMax','zMin','zMax'].every(function(k){return typeof g[k]==='number'&&isFinite(g[k])&&Math.abs(g[k])<=2048;})&&g.xMax>=g.xMin&&g.zMax>=g.zMin;
    var model={activityCount:activities.length,questionCount:questionCount,minutes:minutes,depth:lesson.depth==='quick'?'Quick':lesson.depth==='guided'?'Guided':lesson.depth==='expedition'?'Expedition':'',coastal:lesson.landscapeTheme==='coastal',map:null};
    if(!validGround)return model;
    var width=g.xMax-g.xMin+1,depth=g.zMax-g.zMin+1,scale=Math.min(288/width,160/depth),ox=(320-width*scale)/2,oz=(200-depth*scale)/2;
    function inside(x,z){return isFinite(x)&&isFinite(z)&&x>=g.xMin&&x<=g.xMax+1&&z>=g.zMin&&z<=g.zMax+1;}
    function project(x,z){return [ox+(x-g.xMin)*scale,oz+(z-g.zMin)*scale];}
    var footprints=(Array.isArray(lesson.structures)?lesson.structures:[]).slice(0,180).filter(function(s){return s&&s.type==='fill'&&['x1','x2','y1','y2','z1','z2'].every(function(k){return typeof s[k]==='number'&&isFinite(s[k]);})&&s.x2>=s.x1&&s.z2>=s.z1&&inside(s.x1,s.z1)&&inside(s.x2+1,s.z2+1);}).map(function(s,i){var p=project(s.x1,s.z1);return {id:i,x:p[0],y:p[1],width:(s.x2-s.x1+1)*scale,height:(s.z2-s.z1+1)*scale,block:s.block,ground:s.y1===s.y2&&s.y1===(g.y||0)};});
    var stops=(activities.length?activities:npcs.map(function(n){return {title:n.name,position:n.position};})).map(function(a,i){var p=a.position;return Array.isArray(p)&&p.length===3&&p.every(function(v){return typeof v==='number'&&isFinite(v);})&&inside(p[0],p[2])?{index:i,title:String(a.title||'Guide').slice(0,120),point:project(p[0],p[2])}:null;}).filter(Boolean);
    model.map={x:ox,y:oz,width:width*scale,height:depth*scale,footprints:footprints,stops:stops,activities:activities.length>0};return model;
  }

  function renderLessonMap(h,overview,trackedIndex) {
    if(!overview||!overview.map)return null;
    var map=overview.map,colors={diamond:'#65c7d2',gold:'#e2ba65',wood:'#a68562',sand:'#e7d3a3',stone:'#a8b5ac',glass:'#bfd9cf',brick:'#b88773',grass:'#91aa75',water:'#73baca',ice:'#b6e0e3',torch:'#e3b65c'};
    return h('figure',{className:'gwe-lesson-map','data-coastal':overview.coastal?'true':'false'},
      h('svg',{viewBox:'0 0 320 200',role:'img','aria-label':map.activities?'Lesson route with numbered activity stops and structure footprints':'Lesson overview with guide locations and structure footprints',preserveAspectRatio:'xMidYMid meet'},
        h('title',null,map.activities?'Explore the lesson route':'Preview the world'),
        h('desc',null,'Overhead view. '+map.stops.length+(map.activities?' numbered stops follow the activity guide; dotted lines show their order.':' guide locations are marked.')+' The top of this map is north.'),
        h('rect',{x:0,y:0,width:320,height:200,rx:16,fill:overview.coastal?'#d3e9e4':'#e5ebdc'}),
        h('rect',{x:map.x,y:map.y,width:map.width,height:map.height,rx:3,fill:'#b6c69a',stroke:'#65816a',strokeWidth:1}),
        map.footprints.map(function(f){return h('rect',{key:'structure-'+f.id,'data-map-structure':f.id,x:f.x,y:f.y,width:f.width,height:f.height,fill:Object.prototype.hasOwnProperty.call(colors,f.block)?colors[f.block]:'#a0aca2',stroke:f.ground?'none':'#425e554f',strokeWidth:.7});}),
        map.activities&&map.stops.length>1&&h('polyline',{points:map.stops.map(function(s){return s.point.join(',');}).join(' '),fill:'none',stroke:'#365d49',strokeWidth:1.4,strokeDasharray:'3 4',opacity:.75}),
        map.stops.map(function(s){return h('g',{key:'stop-'+s.index,'data-map-activity':s.index,'data-map-tracked':s.index===trackedIndex?'true':undefined},s.index===trackedIndex&&h('circle',{cx:s.point[0],cy:s.point[1],r:13,fill:'none',stroke:'#94702f',strokeWidth:2}),h('circle',{cx:s.point[0],cy:s.point[1],r:map.activities?9:4,fill:'#254c3a',stroke:'#fbfaef',strokeWidth:2}),map.activities&&h('text',{x:s.point[0],y:s.point[1]+.4,textAnchor:'middle',dominantBaseline:'central',fill:'#fffef2',fontSize:10,fontFamily:'system-ui,sans-serif',fontWeight:800},s.index+1));}),
        h('text',{x:307,y:16,textAnchor:'end',fill:'#355348',fontSize:9,fontFamily:'system-ui,sans-serif',fontWeight:800},'N ↑')
      ),h('figcaption',null,map.activities?'Activity locations · '+map.stops.length+' stops':'Guide locations and building areas')
    );
  }

  function renderLessonFacts(h,overview) {
    if(!overview)return null;
    var facts=[];if(overview.activityCount)facts.push(overview.activityCount+' activities');if(overview.minutes)facts.push(overview.minutes);if(overview.depth)facts.push(overview.depth);
    facts.push(overview.questionCount?overview.questionCount+' question steps':'Self-paced exploration');
    return h('ul',{className:'gwe-lesson-facts','aria-label':'Lesson at a glance',role:'list'},facts.map(function(f){return h('li',{key:f},f);}));
  }

  var ACTIVITY_SNAPSHOT_LIMIT = 1500;
  var ACTIVITY_JOURNAL_BLOCK_LIMIT = 6000;
  function normalizeActivityBuildGoal(value) {
    var api=window.StemLab && window.StemLab.geometryWorldLessonChecks;
    return api && api.normalizeBuildGoal ? api.normalizeBuildGoal(value) : null;
  }
  function activityBuildFacts(blocks) {
    if(!Array.isArray(blocks) || !blocks.length || blocks.length>ACTIVITY_SNAPSHOT_LIMIT)return null;
    var volumes={cube:1,halfA:.5,halfB:.5,quarter:.25},seen=Object.create(null),footprint=Object.create(null);
    var minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity,volume=0,partial=false;
    for(var i=0;i<blocks.length;i++){
      var b=blocks[i];
      if(!b || ![b.x,b.y,b.z].every(function(n){return typeof n==='number' && isFinite(n) && Math.round(n)===n && Math.abs(n)<=1500;}) || !Object.prototype.hasOwnProperty.call(volumes,b.shape) || seen[keyFor(b)])return null;
      seen[keyFor(b)]=true;footprint[b.x+','+b.z]=true;volume+=volumes[b.shape];partial=partial || b.shape!=='cube';
      minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);minZ=Math.min(minZ,b.z);
      maxX=Math.max(maxX,b.x+1);maxZ=Math.max(maxZ,b.z+1);maxY=Math.max(maxY,b.y+(b.shape==='halfB'||b.shape==='quarter'?.5:1));
    }
    // Every supported shape has a complete square X/Z base, including wedges.
    // Count the union of these projected cells, not the enclosing rectangle.
    return {blockCount:blocks.length,occupiedVolume:volume,footprintArea:Object.keys(footprint).length,width:maxX-minX,depth:maxZ-minZ,height:maxY-minY,unitCubesOnly:!partial};
  }
  function activityGoalDescription(goal) {
    goal=normalizeActivityBuildGoal(goal);if(!goal)return '';
    var labels={blockCount:'blocks',occupiedVolume:'cubic units of occupied volume',footprintArea:'square units of footprint',width:'units wide (X)',depth:'units deep (Z)',height:'units high'};
    return (goal.comparator==='gte'?'At least ':goal.comparator==='lte'?'At most ':'Exactly ')+goal.target+' '+labels[goal.metric]+(goal.unitCubesOnly?' using full cubes':'');
  }
  function evaluateActivityBuildGoal(goal,blocks) {
    goal=normalizeActivityBuildGoal(goal);var facts=activityBuildFacts(blocks);
    if(!goal)return {status:'unavailable',message:'This is an open-ended design task. Use the success criteria and your explanation to review it.'};
    if(!facts)return {status:'unavailable',message:'Select a complete student build before checking. No result was recorded.'};
    var actual=facts[goal.metric],matched=goal.comparator==='eq'?Math.abs(actual-goal.target)<1e-8:goal.comparator==='gte'?actual>=goal.target:actual<=goal.target;
    if(goal.unitCubesOnly && !facts.unitCubesOnly)matched=false;
    var units={blockCount:'blocks',occupiedVolume:'cubic units',footprintArea:'square units',width:'units wide',depth:'units deep',height:'units high'};
    return {status:matched?'met':'revise',actual:actual,goal:goal,facts:facts,message:'Selected build: '+actual+' '+units[goal.metric]+'. Goal: '+activityGoalDescription(goal)+'. '+(goal.unitCubesOnly&&!facts.unitCubesOnly?'This task asks for full cubes; the selection includes fractional pieces.':matched?'This numeric target is met.':'Keep revising this measurement.')+' Review the other design criteria yourself.'};
  }
  function captureActivityBuild(engine,now) {
    var selected=engine && engine._builderSelection;
    if(!selected || !Array.isArray(selected.blocks) || !selected.blocks.length)return {ok:false,error:'Select your activity build first. Aim at your own blocks and choose Select aimed build.'};
    var refreshed=selectionMeasurement(engine);
    if(!refreshed)return {ok:false,error:'The selected build is missing or cannot be measured completely. Select your activity build again.'};
    selected=engine._builderSelection;
    if(selected.blocks.length>ACTIVITY_SNAPSHOT_LIMIT)return {ok:false,error:'Snapshots support complete selections up to '+ACTIVITY_SNAPSHOT_LIMIT+' blocks. Select a smaller activity build.'};
    var blocks=[],seen=Object.create(null);
    for(var i=0;i<selected.blocks.length;i++){
      var p=selected.blocks[i],mesh=engine.blocks && engine.blocks[keyFor(p)],u=mesh && mesh.userData;
      if(!u || !isStudentBlock(u) || u._lessonBlock)return {ok:false,error:'The selection changed or contains protected lesson blocks. Select your student build again.'};
      if(seen[keyFor(p)])continue;seen[keyFor(p)]=true;
      if(BLOCK_SHAPES.every(function(shape){return shape.id!==(u.shape || 'cube');}))return {ok:false,error:'The selection contains an unsupported shape and cannot be checked exactly.'};
      blocks.push({x:p.x,y:p.y,z:p.z,type:validBlockType(u.blockType,false),shape:u.shape || 'cube',rotation:normalizedRotation(u.rotation)});
    }
    blocks.sort(compareBlocks);var facts=activityBuildFacts(blocks);
    if(!facts)return {ok:false,error:'The complete selection could not be checked. Select your activity build again.'};
    return {ok:true,snapshot:{capturedAt:typeof now==='string'?now:new Date().toISOString(),blocks:blocks,facts:facts}};
  }
  function updateActivityEvidence(all,lessonKey,activityId,patch) {
    var next=Object.assign({},all || {}),journal=Object.assign({},next[lessonKey] || {}),evidence=Object.assign({},journal.evidence || {});
    evidence[activityId]=Object.assign({},evidence[activityId] || {},patch);journal.evidence=evidence;next[lessonKey]=journal;
    var keys=Object.keys(next).filter(function(key){return key!==lessonKey;});while(Object.keys(next).length>30)delete next[keys.shift()];
    var total=0;
    Object.keys(next).forEach(function(key){var entries=next[key] && next[key].evidence || {};Object.keys(entries).forEach(function(id){['before','after'].forEach(function(stage){var snapshot=entries[id] && entries[id][stage];if(snapshot && Array.isArray(snapshot.blocks))total+=snapshot.blocks.length;});});});
    if(total>ACTIVITY_JOURNAL_BLOCK_LIMIT)return {ok:false,error:'The local journal holds up to '+ACTIVITY_JOURNAL_BLOCK_LIMIT+' saved blocks. Download your portfolio, then clear older snapshots before saving another.'};
    return {ok:true,value:next};
  }
  function activityEscape(value) { return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function activitySnapshotSvg(snapshot) {
    var blocks=snapshot && snapshot.blocks;if(!activityBuildFacts(blocks))return '';
    var palette={stone:'#9aa99d',wood:'#ad8860',diamond:'#6bbcc6',gold:'#d8b45e',sand:'#dfcba0',glass:'#b6d4cb',water:'#7bb5c7',brick:'#bb8570',ice:'#c4dedb',lava:'#d58c61',torch:'#deb670'};
    var projected=[],minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    function point(x,y,z){var p=[(x-z)*.866,(x+z)*.5-y];minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);return p;}
    blocks.slice().sort(function(a,b){return (a.x+a.z)-(b.x+b.z)||a.y-b.y;}).forEach(function(b){
      var height=b.shape==='halfB'||b.shape==='quarter'?.5:1;
      // Include every face before rotation. Choosing visible faces afterwards
      // prevents a rotated roof's hidden end cap painting over its sloping top.
      var faces=b.shape==='halfA'?[
        [[0,0,0],[1,1,0],[1,1,1],[0,0,1]],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]],[[0,0,1],[1,0,1],[1,1,1]],[[0,0,0],[1,1,0],[1,0,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]
      ]:b.shape==='quarter'?[
        [[0,0,0],[.5,.5,0],[.5,.5,1],[0,0,1]],[[.5,.5,0],[1,0,0],[1,0,1],[.5,.5,1]],[[0,0,1],[1,0,1],[.5,.5,1]],[[0,0,0],[.5,.5,0],[1,0,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]
      ]:[[[0,height,0],[1,height,0],[1,height,1],[0,height,1]],[[1,0,0],[1,0,1],[1,height,1],[1,height,0]],[[0,0,1],[1,0,1],[1,height,1],[0,height,1]],[[0,0,0],[0,height,0],[0,height,1],[0,0,1]],[[0,0,0],[1,0,0],[1,height,0],[0,height,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]];
      function rotate(v){var x=v[0]-.5,z=v[2]-.5;for(var turn=0;turn<normalizedRotation(b.rotation);turn++){var old=x;x=z;z=-old;}return [x+.5,v[1],z+.5];}
      var center=rotate([b.shape==='halfA'?2/3:.5,b.shape==='halfA'?1/3:b.shape==='quarter'?1/6:height/2,.5]);
      faces.forEach(function(face){
        var vertices=face.map(rotate),u=vertices[1].map(function(v,i){return v-vertices[0][i];}),v=vertices[2].map(function(v,i){return v-vertices[0][i];}),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],mid=[0,0,0];
        vertices.forEach(function(p){p.forEach(function(n,i){mid[i]+=n/vertices.length;});});
        if(normal.reduce(function(sum,n,i){return sum+n*(mid[i]-center[i]);},0)<0)normal=normal.map(function(n){return -n;});
        if(normal[0]+normal[1]+normal[2]<=.000001)return;
        projected.push({color:Object.prototype.hasOwnProperty.call(palette,b.type)?palette[b.type]:palette.stone,shade:normal[1]>0?0:normal[0]>0?1:2,points:vertices.map(function(v){return point(b.x+v[0],b.y+v[1],b.z+v[2]);})});
      });
    });
    var pad=.8,width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[minX-pad,minY-pad,width+pad*2,height+pad*2].join(' ')+'" role="img" aria-label="Saved geometry snapshot"><rect x="'+(minX-pad)+'" y="'+(minY-pad)+'" width="'+(width+pad*2)+'" height="'+(height+pad*2)+'" fill="#edf0df"/>'+projected.map(function(face){var points=face.points.map(function(p){return p.map(function(n){return Math.round(n*1000)/1000;}).join(',');}).join(' ');return '<polygon points="'+points+'" fill="'+face.color+'" stroke="#435d4e" stroke-width=".018"/>'+(face.shade?'<polygon points="'+points+'" fill="#17382c" opacity="'+(face.shade===1?.18:.08)+'"/>':'');}).join('')+'</svg>';
  }
  function cleanActivitySnapshot(snapshot) {
    if(!snapshot || !activityBuildFacts(snapshot.blocks))return null;
    var blocks=snapshot.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z,type:validBlockType(b.type,false),shape:b.shape,rotation:normalizedRotation(b.rotation)};});
    return {capturedAt:String(snapshot.capturedAt || '').slice(0,80),blocks:blocks,facts:activityBuildFacts(blocks)};
  }
  function cleanActivityCheck(check) {
    if(!check || ['met','revise'].indexOf(check.status)<0 || typeof check.actual!=='number' || !isFinite(check.actual))return null;
    return {status:check.status,actual:check.actual,goal:normalizeActivityBuildGoal(check.goal),checkedAt:String(check.checkedAt || '').slice(0,80),message:String(check.message || '').slice(0,2000)};
  }
  function activityJournalExport(guide,journal) {
    journal=journal || {};return {schema:'alloflow-geometry-journal/2',lesson:guide.title,lessonKey:guide.key,scope:'Explicitly selected student geometry. Numeric checks are advisory and do not grade design quality.',activities:guide.activities.map(function(a){var evidence=(journal.evidence || {})[a.id] || {};return {id:a.id,title:a.title,challenge:a.challenge,buildGoal:a.buildGoal || null,successCriteria:a.successCriteria,reflection:(journal.notes || {})[a.id] || '',reviewed:!!(journal.reviewed || {})[a.id],before:cleanActivitySnapshot(evidence.before),after:cleanActivitySnapshot(evidence.after),check:cleanActivityCheck(evidence.check)};})};
  }
  function activityPortfolioHtml(guide,journal) {
    var exportData=activityJournalExport(guide,journal);
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+activityEscape(guide.title)+' — Learning portfolio</title><style>body{margin:0;background:#edf0e6;color:#213c33;font:16px/1.6 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:32px 20px}article{background:#fffef6;padding:24px;border:1px solid #b9c9af;border-radius:18px;margin:24px 0}h1,h2,h3{line-height:1.2}p{white-space:pre-wrap;overflow-wrap:anywhere}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}svg{width:100%;max-height:360px;border-radius:12px}figcaption,.muted{font-size:14px;color:#526b51}.check{padding:12px;border-left:3px solid #6a875a;background:#edf0df}@media(max-width:560px){.pair{grid-template-columns:1fr}}@media print{body{background:white}article{break-inside:avoid}}</style><main><p class="muted">GEOMETRY WORLD · LEARNING PORTFOLIO</p><h1>'+activityEscape(guide.title)+'</h1><p>'+activityEscape(exportData.scope)+'</p>'+exportData.activities.map(function(a){var images=['before','after'].map(function(stage){var snapshot=a[stage];return '<figure><h3>'+ (stage==='before'?'Before':'After')+'</h3>'+(snapshot?activitySnapshotSvg(snapshot)+'<figcaption>'+activityEscape(snapshot.capturedAt)+' · '+snapshot.facts.blockCount+' blocks · '+snapshot.facts.occupiedVolume+' cubic units</figcaption>':'<p class="muted">No snapshot saved.</p>')+'</figure>';}).join('');return '<article><h2>'+activityEscape(a.title)+'</h2><p>'+activityEscape(a.challenge)+'</p>'+(a.buildGoal?'<p><strong>Numeric target:</strong> '+activityEscape(activityGoalDescription(a.buildGoal))+'</p>':'')+'<div class="pair">'+images+'</div>'+(a.check?'<p class="check">Saved check · '+activityEscape(a.check.checkedAt)+'<br>'+activityEscape(a.check.message)+'</p>':'')+'<h3>My reflection</h3><p>'+activityEscape(a.reflection || 'No reflection recorded yet.')+'</p><p class="muted">'+(a.reviewed?'Learner marked this activity reviewed.':'Not marked reviewed.')+'</p></article>';}).join('')+'<p class="muted">This file works offline. The separate JSON journal preserves full block geometry for each saved snapshot.</p></main></html>';
  }

  function activityGuideModel(lesson) {
    if (!lesson || !Array.isArray(lesson.activities)) return null;
    var activities=lesson.activities.slice(0,12).filter(function(a){return a && typeof a==='object' && typeof a.title==='string';}).map(function(a,i){
      function text(v){return typeof v==='string'?v.slice(0,2000):Array.isArray(v)?v.filter(function(s){return typeof s==='string';}).join(' ').slice(0,2000):'';}
      return {id:String(a.id || 'activity-'+i).slice(0,80)+'-'+i,title:text(a.title),challenge:text(a.challenge),hint:text(a.hint),successCriteria:text(a.successCriteria),reflection:text(a.reflection),buildGoal:normalizeActivityBuildGoal(a.buildGoal),buildGoalInvalid:a.buildGoal != null && !normalizeActivityBuildGoal(a.buildGoal),npcName:text(a.npcName),position:Array.isArray(a.position)&&a.position.length===3&&a.position.every(function(n){return typeof n==='number'&&isFinite(n);})?a.position:null};
    });
    if(!activities.length)return null;
    // Preserve existing journal identities when optional numeric checks are added.
    var identityActivities=activities.map(function(a){var value=Object.assign({},a);delete value.buildGoal;delete value.buildGoalInvalid;return value;});
    var signature=JSON.stringify([lesson.title,lesson.structures,identityActivities]),hash=2166136261;
    for(var i=0;i<signature.length;i++)hash=Math.imul(hash^signature.charCodeAt(i),16777619);
    return {key:'lesson-'+(hash>>>0).toString(36),title:lesson.title || 'Activity guide',activities:activities};
  }
  function activityWaypointFor(guide,journal,npcs) {
    if(!guide || !journal || !journal.trackedId || !Array.isArray(npcs))return null;
    var activity=guide.activities.find(function(a){return a.id===journal.trackedId;});
    if(!activity || !activity.npcName || !npcs.some(function(n){return n && n.data && n.data.name===activity.npcName;}))return null;
    return {id:activity.id,lessonKey:guide.key,npcName:activity.npcName,title:activity.title,index:guide.activities.indexOf(activity),count:guide.activities.length};
  }
  function travelToActivity(engine,activity) {
    if(!engine || !engine.camera || !activity)return false;
    var npc=(engine.npcs || []).find(function(n){return n.data && n.data.name===activity.npcName;});
    var target=npc && npc.data.position,point=activity.position || (target && [target[0]-2,target[1]+2.6,target[2]-2]);
    if(!point)return false;
    var lesson=engine._currentLesson || {},g=lesson.ground;
    if(!g || !point.every(function(n){return typeof n==='number'&&isFinite(n);}))return false;
    var x=point[0],z=point[2],y=Math.max(Number(g.y)+2.6,point[1]);
    if(x<g.xMin+.3 || x>g.xMax+.7 || z<g.zMin+.3 || z>g.zMax+.7 || y>128)return false;
    // Find a clear body column. A stored waypoint must not place the learner in a wall.
    function blocked(eyeY){return [[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]].some(function(o){for(var h=Math.floor(eyeY-1.6);h<=Math.floor(eyeY+.2);h++)if(engine.blocks[Math.floor(x+o[0])+','+h+','+Math.floor(z+o[1])])return true;return false;});}
    while(y<=128 && blocked(y))y+=1;
    if(y>128)return false;
    if(engine.stopGuidedTour && engine._guidedTour)engine.stopGuidedTour(false);
    if(engine.releaseInput)engine.releaseInput();
    engine._entryAnim=null;engine._viewPresetAnim=null;
    if(engine.velocity)engine.velocity.set(0,0,0);
    engine.camera.position.set(x,y,z);
    if(target)engine.camera.lookAt(target[0]+.5,target[1]+1.5,target[2]+.5);
    if(engine.euler)engine.euler.setFromQuaternion(engine.camera.quaternion);
    engine.camera.updateMatrixWorld(true);
    return true;
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
      var currentPrintUnit = printUnit(printContext(ctx).unitMm);
      var base = originalRender(ctx);
      var launcherFocusRef = React.useRef('');
      var retainedMeasurementRef = React.useRef(null);
      var editableInputRef = React.useRef(null);
      var editableReadTokenRef = React.useRef(0), editableApplyFailedRef = React.useRef(false), editableErrorRef = React.useRef(null);
      var showcaseFilesRef = React.useRef(null), showcaseFilesTriggerRef = React.useRef(null), showcaseFilesWasOpen = React.useRef(false);
      var editableRecoveryRef = React.useRef(null), editableOpenRef = React.useRef(null), showcaseFileChooseRef = React.useRef(null);
      var _showcaseFilesOpen = React.useState(false), showcaseFilesOpen = _showcaseFilesOpen[0], setShowcaseFilesOpen = _showcaseFilesOpen[1];
      var _showcaseFileNotice = React.useState(''), showcaseFileNotice = _showcaseFileNotice[0], setShowcaseFileNotice = _showcaseFileNotice[1];
      var _editablePreview = React.useState(null), editablePreview = _editablePreview[0], setEditablePreview = _editablePreview[1];
      var _editableError = React.useState(''), editableError = _editableError[0], setEditableError = _editableError[1];
      var _editableBusy = React.useState(false), editableBusy = _editableBusy[0], setEditableBusy = _editableBusy[1];
      var homeOpen = !!data.showGeometryHome && !hasPendingReturn && !window[ENGINE_KEY + '_failed'];
      var homePage = ['start','learn','build','explore','create','open'].indexOf(data.geometryHomePage)>=0 ? data.geometryHomePage : 'start';
      var homeRef = React.useRef(null);
      var homePreviousPageRef = React.useRef('start');
      React.useEffect(function () {
        if (!homeOpen) return;
        var eng=window[ENGINE_KEY];
        if(eng){Object.keys(eng.moveState || {}).forEach(function(k){eng.moveState[k]=false;});Object.keys(eng.lookState || {}).forEach(function(k){eng.lookState[k]=false;});if(eng.velocity)eng.velocity.set(0,0,0);}
        try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
        if(homeRef.current){
          homeRef.current.scrollTop=0;
          var previous=homePreviousPageRef.current;
          var target=homePage==='start' && previous!=='start' ? homeRef.current.querySelector('[data-path="'+previous+'"]') : null;
          (target || homeRef.current).focus();
        }
        homePreviousPageRef.current=homePage;
      },[homeOpen,homePage]);
      React.useEffect(function(){if(homeOpen && editablePreview && editableRecoveryRef.current)editableRecoveryRef.current.focus();},[homeOpen,editablePreview]);
      function homeNavigate(page){cancelEditablePreview();patchGeometryState(ctx,{geometryHomePage:page});}
      function continueWorkspace(){
        if(!data.worldActive || data._geometryHomeInitial)return;
        cancelEditablePreview();patchGeometryState(ctx,{showGeometryHome:false});focusWorldSurface(30);
      }
      function closeHome(){if(homePage!=='start')homeNavigate('start');else continueWorkspace();}
      function homeLesson(key){var eng=window[ENGINE_KEY];if(eng && eng.startHomeLesson)eng.startHomeLesson(key);}
      function homeCreator(blank){
        if(blank && !startSandboxMode(ctx,{focus:false}))return;
        patchGeometryState(ctx,{showGeometryHome:false,_geometryHomeInitial:false,creatorMode:true,showSandboxLauncher:false});
      }
      function homeAi(){
        patchGeometryState(ctx,{showGeometryHome:false,_geometryHomeInitial:false,showGameSettings:true});
        setTimeout(function(){var input=document.querySelector('[aria-label="Describe a geometry lesson topic for AI generation"]');if(input){input.scrollIntoView({block:'center'});input.focus();}},50);
      }
      function homeArt(kind){
        var paths={learn:'M8 10h18v28H8ZM26 10h18v28H26M13 17h8M13 23h8M31 17h8M31 23h8M7 42h38',build:'M26 5 45 16v22L26 49 7 38V16ZM7 16l19 11 19-11M26 27v22M16 11l19 11',explore:'M26 46V22M26 31C7 33 7 13 10 8c12 0 22 10 16 23ZM26 38c-2-14 9-22 19-22 2 14-5 24-19 22M10 47h34',create:'m9 39 3-11L34 6l10 10-22 22-13 1ZM28 12l10 10M12 28l10 10M8 46h37'};
        return h('svg',{viewBox:'0 0 52 52',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:paths[kind]}));
      }
      function homeSaveNotice(){return data.worldActive && !data._geometryHomeInitial && h('div',{className:'gwe-home-save',role:'note'},h('p',null,'Starting a different world replaces the workspace shown. You can save its student-built blocks first.'),h('button',{type:'button',onClick:function(){saveEditableWorld(ctx);}},'Save current build JSON'));}
      function homeStartSandbox(){if(startSandboxMode(ctx))patchGeometryState(ctx,{showGeometryHome:false,_geometryHomeInitial:false});}
      function changeBuilderGarden(enabled){var live=window[ENGINE_KEY];if(!live || !live._currentLesson || !live._currentLesson.sandbox)return;live._currentLesson=Object.assign({},live._currentLesson,{builderGarden:enabled});if(live.refreshLandscape)live.refreshLandscape(live._currentLesson.ground);patchGeometryState(ctx,{builderGardenEnabled:enabled});announce(ctx,enabled?'Garden workshop scenery shown.':'Open meadow scenery shown.','info');}
      function renderLessonPreview(lesson){
        var overview=lessonOverviewModel(lesson);
        return h('article',{className:'gwe-home-preview gwe-home-preview--route'},
          h('div',{className:'gwe-home-lesson-copy'},h('h2',null,lesson.title),h('p',null,lesson.description),renderLessonFacts(h,overview),
            lesson.objectives && h('ul',{className:'gwe-home-goals'},lesson.objectives.slice(0,3).map(function(o,i){return h('li',{key:i},o);}))),
          renderLessonMap(h,overview));
      }
      function renderHome(){
        var live=window[ENGINE_KEY],lessons=live && live.geometryHomeLessons || [],canContinue=!!data.worldActive && !data._geometryHomeInitial;
        var chosen=homePage==='explore'?'geometryGarden':data.geometryHomeLesson || 'volumeExplorer';
        var availableLessons=lessons.filter(function(l){return homePage==='explore' ? l.id==='geometryGarden' : l.id!=='geometryGarden';});
        var lesson=availableLessons.filter(function(l){return l.id===chosen;})[0] || availableLessons[0];
        var titles={start:'What would you like to do?',learn:'Find your next discovery.',build:'Make something your own.',explore:'A little room to wonder.',create:'Create a lesson worth exploring.',open:'Pick up where you left off.'};
        return h('div',{key:'gwe-home',className:'gwe-home-backdrop'},h('section',{className:'gwe-home',ref:homeRef,tabIndex:-1,role:'dialog','aria-modal':'true','aria-labelledby':'gwe-home-title','aria-describedby':'gwe-home-description',onKeyDown:function(event){trapDialogKeys(event,closeHome);event.stopPropagation();}},
          h('header',{className:'gwe-home-top'},h('span',{className:'gwe-home-brand'},h('span',{'aria-hidden':'true'},studioCubeMark(h)),'Geometry World'),canContinue && h('button',{type:'button',className:'gwe-home-continue',onClick:continueWorkspace},'Continue your workspace',h('span',{'aria-hidden':'true'},' →'))),
          h('div',{className:'gwe-home-heading'},homePage!=='start' && h('button',{type:'button',className:'gwe-home-back',onClick:function(){homeNavigate('start');}},'← All ways to explore'),h('p',{className:'gwe-home-eyebrow'},homePage==='start'?'LEARN · MAKE · DISCOVER':'GEOMETRY WORLD / '+homePage.toUpperCase()),h('h1',{id:'gwe-home-title'},titles[homePage] || titles.start),h('p',{id:'gwe-home-description'},homePage==='start'?'Choose a mode below. Return here anytime with the Geometry World Home button.':homePage==='build'?'Start with blocks. Finish with something you can share, revisit, or hold in your hands.':homePage==='learn'?'Choose a guided world, meet its guides, and practise geometry through discovery.':homePage==='explore'?'Wander through the Geometry Garden. Measure what catches your eye. No questions. No score.':homePage==='create'?'Build a world, add characters and questions, and turn your idea into a learning experience.':'Return to a local project, or open an editable Geometry World JSON file.')),
          homePage==='start' && h('nav',{className:'gwe-home-grid','aria-label':'Geometry World modes'},[
            ['learn','Learn','Guided lessons','Meet your guides, solve challenges, and make geometry click.'],
            ['build','Build','Free Build Studio','Build freely, showcase your creation, and prepare a 3D print.'],
            ['explore','Explore','Geometry Garden','A quiet place to wander, notice patterns, and measure.'],
            ['create','Create a lesson','Lesson Creator','Design a learning world with characters and questions.']
          ].map(function(card){return h('button',{key:card[0],type:'button',className:'gwe-home-card','data-path':card[0],onClick:function(){homeNavigate(card[0]);}},h('span',{className:'gwe-home-art'},homeArt(card[0])),h('span',{className:'gwe-home-card-copy'},h('span',{className:'gwe-home-card-kicker'},card[2]),h('strong',null,card[1]),h('span',{className:'gwe-home-card-description'},card[3])),h('span',{className:'gwe-home-arrow','aria-hidden':'true'},'↗'));})),
          (homePage==='start'||homePage==='open') && renderWorldShelf(),
          homePage==='start' && h('footer',{className:'gwe-home-footer'},h('div',null,h('strong',null,'Already have a creation?'),h('p',null,'Bring an editable build back into Geometry World.')),h('button',{type:'button',onClick:function(){homeNavigate('open');}},'Open a saved build',h('span',{'aria-hidden':'true'},' →'))),
          (homePage==='learn'||homePage==='explore') && h('div',{className:'gwe-home-detail'},homePage==='learn' && h('div',{className:'gwe-home-lesson-picker'},h('label',{htmlFor:'gwe-home-lesson'},'Choose a lesson'),h('select',{id:'gwe-home-lesson',value:lesson?lesson.id:chosen,onChange:function(event){patchGeometryState(ctx,{geometryHomeLesson:event.target.value});}},availableLessons.map(function(l){return h('option',{key:l.id,value:l.id},l.title); }))),lesson && renderLessonPreview(lesson),homeSaveNotice(),h('button',{type:'button',className:'gwe-home-primary',disabled:!live || !live.startHomeLesson || !lesson,onClick:function(){homeLesson(lesson.id);}},homePage==='explore'?'Enter Geometry Garden':'Start this lesson')),
          homePage==='build' && h('div',{className:'gwe-home-detail'},h('div',{className:'gwe-home-journey'},[['01','Build freely','Cubes, slabs, wedges, materials, and room to experiment.'],['02','Showcase & save','Frame your creation beautifully. Save a picture or an editable build.'],['03','Prepare a 3D print','Set the scale, download STL, or continue in Print Lab.']].map(function(step){return h('article',{key:step[0]},h('span',null,step[0]),h('h2',null,step[1]),h('p',null,step[2]));})),homeSaveNotice(),h('button',{type:'button',className:'gwe-home-primary',disabled:!live,onClick:homeStartSandbox},'Open blank sandbox'),h('button',{type:'button',className:'gwe-home-secondary',onClick:function(){homeNavigate('open');}},'Open a saved build')),
          homePage==='create' && h('div',{className:'gwe-home-detail'},canContinue && h('section',{className:'gwe-home-create-option'},h('h2',null,'Build on this workspace'),h('p',null,'Keep your current structures and add characters, dialogue, and questions.'),h('button',{type:'button',className:'gwe-home-primary',onClick:function(){homeCreator(false);}},'Create in this workspace')),h('section',{className:'gwe-home-create-option'},h('h2',null,'Start with a blank canvas'),h('p',null,'Build a new lesson from the ground up.'),homeSaveNotice(),h('button',{type:'button',className:canContinue?'gwe-home-secondary':'gwe-home-primary',disabled:!live,onClick:function(){homeCreator(true);}},'Start a blank lesson')),ctx.callGemini && h('section',{className:'gwe-home-create-option'},h('h2',null,'Develop an idea with AI'),h('p',null,'Choose your topic and grade level in the AI lesson builder.'),h('button',{type:'button',className:'gwe-home-secondary',onClick:homeAi},'Open AI lesson builder'))),
          homePage==='open' && h('div',{className:'gwe-home-detail'},h('div',{className:'gwe-home-file'},fileIcon('open'),h('h2',null,'Your blocks. Your next idea.'),h('p',null,'Editable JSON keeps block shapes, materials, and rotations. STL print files belong in Print Lab.'),h('button',{type:'button',ref:editableOpenRef,className:'gwe-home-primary',disabled:editableBusy || !live,onClick:chooseShowcaseFile},editableBusy?'Checking file…':'Choose editable JSON')),homeSaveNotice(),renderEditableRecovery(true))
        ));
      }

      var _shelf=React.useState(function(){return readWorldShelf();}),worldShelf=_shelf[0],setWorldShelf=_shelf[1];
      var _projectName=React.useState(''),projectName=_projectName[0],setProjectName=_projectName[1];
      var _projectNotice=React.useState('Your first block starts a local draft.'),projectNotice=_projectNotice[0],setProjectNotice=_projectNotice[1];
      var projectNoticeRef=React.useRef(projectNotice);
      function publishProjectNotice(message){if(projectNoticeRef.current!==message){projectNoticeRef.current=message;setProjectNotice(message);}}
      var _projectChoice=React.useState(''),projectChoice=_projectChoice[0],setProjectChoice=_projectChoice[1];
      var _removeProject=React.useState(''),removeProject=_removeProject[0],setRemoveProject=_removeProject[1];
      var _baseOptions=React.useState({padding:1,thickness:1,material:'stone'}),baseOptions=_baseOptions[0],setBaseOptions=_baseOptions[1];
      var _printPartPage=React.useState(0),printPartPage=_printPartPage[0],setPrintPartPage=_printPartPage[1];
      React.useEffect(function(){setPrintPartPage(0);},[data.builderPrintGuideSummary && data.builderPrintGuideSummary.selectionSignature]);
      function updateBaseOption(key,value){setBaseOptions(function(previous){var next=Object.assign({},previous);next[key]=value;return next;});cancelSelectionPreview();}
      function inspectPrintIssue(kind,index){changePointerMode('build');var result=focusGeometryPrintIssue(ctx,kind,index);if(!result.ok)announce(ctx,result.reason,'error');}
      function saveVariation(){var result=saveWorldCopy(window[ENGINE_KEY],projectName);savedDraft(result);if(result.ok){setProjectName(result.project.world.title);announce(ctx,'Now editing '+result.project.world.title+'. Your earlier saved project is kept in My Worlds.');}}
      function duplicateShelfProject(project){var result=duplicateWorldProject(project.id);if(!result.ok){publishProjectNotice(result.reason);return;}setWorldShelf(result);setProjectChoice(result.project.id);setRemoveProject('');publishProjectNotice('Created '+result.project.world.title+' from the saved project. Open it to begin editing.');window.requestAnimationFrame(function(){var card=document.querySelector('.gwe-project-pick[aria-pressed=true]');if(card)card.focus();});}
      function renderPrintPieces(){
        var summary=data.builderPrintGuideSummary;if(!data.builderPrintGuide || !summary)return null;
        var parts=summary.parts || [],page=Math.min(printPartPage,Math.max(0,Math.ceil(parts.length/8)-1));
        return h('section',{className:'gwe-print-pieces','aria-label':'Inspect print regions'},
          summary.outside>0 && h('button',{type:'button',className:'gwe-overflow-inspect',onClick:function(){inspectPrintIssue('overflow');}},'Inspect oversized blocks'),
          parts.length>1 && h('p',null,'Inspect a piece without changing which blocks will be exported.'),
          parts.length>1 && h('div',{className:'gwe-print-piece-grid'},parts.slice(page*8,page*8+8).map(function(part){return h('button',{key:part.index,type:'button','aria-label':'Inspect piece '+part.index,'aria-pressed':!!(data.builderPrintFocus && data.builderPrintFocus.kind==='part' && data.builderPrintFocus.index===part.index),onClick:function(){inspectPrintIssue('part',part.index);}},h('span',{className:'gwe-piece-index','aria-hidden':'true'},String(part.index).padStart(2,'0')),h('span',null,h('strong',null,'Piece '+part.index),h('small',null,part.blocks+' block'+(part.blocks===1?'':'s')+' · '+(part.raised?'Raised':'At base'))));})),
          parts.length>8 && h('div',{className:'gwe-piece-pages'},h('button',{type:'button',disabled:page===0,onClick:function(){setPrintPartPage(page-1);}},'Previous pieces'),h('span',{role:'status'},(page*8+1)+'–'+Math.min(parts.length,page*8+8)+' of '+parts.length),h('button',{type:'button',disabled:(page+1)*8>=parts.length,onClick:function(){setPrintPartPage(page+1);}},'More pieces')));
      }
      var _starterOpen=React.useState(false),starterOpen=_starterOpen[0],setStarterOpen=_starterOpen[1];
      var _starterCategory=React.useState('Architecture'),starterCategory=_starterCategory[0],setStarterCategory=_starterCategory[1];
      var _starterId=React.useState('starter_arch'),starterId=_starterId[0],setStarterId=_starterId[1];
      var _starterOptions=React.useState({}),starterOptions=_starterOptions[0],setStarterOptions=_starterOptions[1];
      var _selectionDepth=React.useState('visible'),selectionDepth=_selectionDepth[0],setSelectionDepth=_selectionDepth[1];
      var _pointerMode=React.useState('build'),pointerMode=_pointerMode[0],setPointerMode=_pointerMode[1];
      var _selectionOperation=React.useState('replace'),selectionOperation=_selectionOperation[0],setSelectionOperation=_selectionOperation[1];
      var starters=React.useMemo(architecturalStarters,[]);
      var starterCards=React.useMemo(function(){return starterOpen?starters.filter(function(s){return s.category===starterCategory;}).map(function(s){return {stamp:s,image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(activitySnapshotSvg({blocks:s.blocks}))};}):[];},[starterOpen,starterCategory,starters]);
      var configuredStarter=React.useMemo(function(){return configureArchitecturalStarter(starterId,starterOptions);},[starterId,starterOptions]);
      var configuredStarterImage=React.useMemo(function(){return starterOpen && configuredStarter.ok?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(activitySnapshotSvg({blocks:configuredStarter.stamp.blocks})):'';},[starterOpen,configuredStarter]);
      function setStarterOption(key,value){setStarterOptions(function(previous){var next=Object.assign({},previous);next[key]=value;return next;});cancelSelectionPreview();}
      var projectCards=React.useMemo(function(){return homeOpen?worldShelf.projects.map(function(p){return {project:p,image:p.world.blocks.length?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(activitySnapshotSvg({blocks:p.world.blocks})):''};}):[];},[homeOpen,worldShelf]);
      function savedDraft(result){
        if(!result.ok){publishProjectNotice(result.reason);return;}
        if(result.empty){publishProjectNotice('Your first block starts a local draft.');return;}
        if(result.project)publishProjectNotice('Saved in this browser · '+new Date(result.project.savedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
        if(!result.unchanged)setWorldShelf(result);
      }
      function openShelfProject(project){
        var live=window[ENGINE_KEY];if(!live || live._showcaseExporting)return;
        var fresh=readWorldShelf(),chosen=fresh.projects.find(function(p){return p.id===project.id;});
        if(!fresh.ok || !chosen){publishProjectNotice(fresh.reason || 'This project is no longer saved.');setWorldShelf(fresh);return;}
        if(live._currentLesson && live._currentLesson.sandbox){var backup=saveWorldDraft(live);savedDraft(backup);if(!backup.ok)return;if(backup.project && chosen.id===backup.project.id)chosen=backup.project;}
        var result;
        if(chosen.world.blocks.length)result=restoreEditableWorld(live,chosen.world,ctx);
        else {live.loadLesson(FREE_BUILD_LESSON);result={ok:true};}
        if(!result.ok){publishProjectNotice(result.error);return;}
        live._currentLesson=Object.assign({},live._currentLesson,{builderGarden:chosen.garden});if(live.refreshLandscape)live.refreshLandscape(live._currentLesson.ground);
        live._workshopProjectId=chosen.id;live._workshopProjectVersion=chosen.version;live._workshopSavedSignature=JSON.stringify([chosen.world,chosen.garden]);
        setProjectName(chosen.world.title);setProjectChoice('');setRemoveProject('');setPointerMode('build');if(chosen.world.blocks.length)live._builderSelection={blocks:chosen.world.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};}),exact:true};
        patchGeometryState(ctx,{activeLesson:'builderSandbox',worldActive:true,blocksPlaced:chosen.world.blocks.length,tutorialDismissed:true,showGeometryHome:false,_geometryHomeInitial:false,showLessonIntro:false,showSandboxLauncher:false,creatorMode:false,builderPanel:'build',sandboxDockCollapsed:false,hudPreset:'builder',hudPanel:'',builderPrintContext:null,builderPrintCheck:null,measureResult:null});
        savedDraft({ok:true,projects:readWorldShelf().projects,project:chosen});announce(ctx,'Opened '+chosen.world.title+'. Continue editing your saved blocks.','success');if(chosen.world.blocks.length)window.requestAnimationFrame(function(){if(window[ENGINE_KEY]===live && live._workshopProjectId===chosen.id)focusSelectedBuild(liveBuilderCtx.current);});else focusWorldSurface(50);
      }
      function renderWorldShelf(){
        return h('section',{className:'gwe-world-shelf','aria-label':'My Worlds'},h('div',{className:'gwe-shelf-heading'},h('h2',null,'My Worlds'),h('span',null,worldShelf.projects.length+' / 8 projects')),
          h('p',null,'Free Build drafts saved on this browser. Blocks, shapes, materials, and garden choice are kept. Download JSON for a portable copy.'),
          !worldShelf.ok && h('p',{role:'status'},worldShelf.reason),
          !worldShelf.projects.length && h('p',{className:'gwe-shelf-empty'},'Your next creation belongs here. Start building and a draft will appear automatically.'),
          h('div',{className:'gwe-project-grid'},projectCards.map(function(card){var p=card.project;return h('article',{className:'gwe-project-card',key:p.id},
            h('button',{type:'button',className:'gwe-project-pick','aria-pressed':projectChoice===p.id,onClick:function(){setProjectChoice(p.id);setRemoveProject('');}},card.image?h('img',{src:card.image,alt:'',loading:'lazy'}):h('span',{className:'gwe-project-empty-art','aria-hidden':'true'},'◇'),h('strong',null,p.world.title),h('span',null,p.world.blocks.length+' blocks · '+new Date(p.savedAt).toLocaleDateString()),window[ENGINE_KEY] && window[ENGINE_KEY]._workshopProjectId===p.id && h('span',{className:'gwe-project-current'},'Current project')),
            projectChoice===p.id && h('div',{className:'gwe-project-actions'},h('p',null,'Open these editable blocks in Free Build. Your current Free Build draft is saved first.'),h('button',{type:'button',className:'gwe-primary',onClick:function(){openShelfProject(p);}},'Open this project'),
              h('button',{type:'button',disabled:!p.world.blocks.length,onClick:function(){duplicateShelfProject(p);}},'Duplicate project'),
              h('button',{type:'button',disabled:!p.world.blocks.length,onClick:function(){downloadBlob(new Blob([JSON.stringify(p.world,null,2)],{type:'application/json'}),safeFilePart(p.world.title)+'.json');}},'Download project JSON'),
              h('button',{type:'button',disabled:!!(window[ENGINE_KEY] && window[ENGINE_KEY]._workshopProjectId===p.id),onClick:function(){setRemoveProject(p.id);}},'Remove from shelf'),
              removeProject===p.id && h('div',{className:'gwe-project-remove'},h('p',null,'Remove this saved project from this browser? Download a copy first if you want to keep it.'),h('button',{type:'button',onClick:function(){var result=removeWorldProject(p.id);if(result.ok){setWorldShelf(result);setProjectChoice('');setRemoveProject('');}else publishProjectNotice(result.reason);}},'Confirm removal'),h('button',{type:'button',onClick:function(){setRemoveProject('');}},'Keep project'))));})),
          h('p',{className:'gwe-project-status',role:'status'},projectNotice));
      }
      function renderStarterLibrary(){
        return h('details',{className:'gwe-details gwe-starter-library',onToggle:function(e){var panel=e.currentTarget;setStarterOpen(panel.open);if(panel.open)window.requestAnimationFrame(function(){if(panel.isConnected && panel.scrollIntoView)panel.scrollIntoView({block:'start'});});}},h('summary',null,'Architectural starter kit'),
          h('p',{className:'gwe-builder-note'},'Start with a complete structure, then make every block your own.'),
          h('div',{className:'gwe-starter-categories',role:'group','aria-label':'Starter category'},['Architecture','Landscape','Buildings'].map(function(c){return h('button',{key:c,type:'button','aria-pressed':starterCategory===c,onClick:function(){setStarterCategory(c);setStarterOptions({});setStarterId(starters.find(function(s){return s.category===c;}).id);cancelSelectionPreview();}},c);})),
          h('div',{className:'gwe-stamp-gallery','aria-label':'Architectural starters'},starterCards.map(function(card){var s=card.stamp;return h('button',{key:s.id,type:'button',className:'gwe-stamp-card gwe-starter-card','aria-label':'Choose starter '+s.name,'aria-pressed':starterId===s.id,onClick:function(){setStarterId(s.id);setStarterOptions({});cancelSelectionPreview();}},h('span',{className:'gwe-stamp-art'},h('img',{src:card.image,alt:'',loading:'lazy'}),h('span',{className:'gwe-stamp-selection'},starterId===s.id?'✓ Selected':'Choose')),h('span',{className:'gwe-stamp-card-name'},s.name),h('span',{className:'gwe-stamp-card-facts'},s.blocks.length+' editable blocks'));})),
          h('p',{className:'gwe-builder-note'},(starters.find(function(s){return s.id===starterId;})||starters[0]).description),
          h('div',{className:'gwe-starter-custom'},h('h4',null,'Make it yours'),
            configuredStarterImage && h('img',{className:'gwe-configured-preview',src:configuredStarterImage,alt:'Preview of your customized starter'}),
            h('div',{className:'gwe-starter-dimensions'},Object.keys((starters.find(function(s){return s.id===starterId;})||starters[0]).fields).map(function(key){var field=(starters.find(function(s){return s.id===starterId;})||starters[0]).fields[key];return h('label',{key:key},key==='rise'?'Roof rise':key.charAt(0).toUpperCase()+key.slice(1),h('input',{type:'number',inputMode:'numeric','aria-label':'Starter '+key,min:field[1],max:field[2],step:field[3]||1,value:starterOptions[key]===undefined?field[0]:starterOptions[key],onChange:function(e){setStarterOption(key,e.target.value);}}));})),
            h('p',{className:'gwe-builder-note'},'Dimensions are in blocks. Each block stays editable.'),
            h('label',{className:'gwe-edit-label'},'Materials',h('select',{'aria-label':'Starter materials',value:starterOptions.palette||'original',onChange:function(e){setStarterOption('palette',e.target.value);}},[['original','Original palette'],['timber','Warm timber'],['stone','All stone'],['brick','All brick']].map(function(a){return h('option',{value:a[0],key:a[0]},a[1]);}))),
            h('label',{className:'gwe-edit-label'},'Rotation',h('select',{'aria-label':'Starter rotation',value:starterOptions.rotation||0,onChange:function(e){setStarterOption('rotation',e.target.value);}},[0,1,2,3].map(function(turn){return h('option',{key:turn,value:turn},turn*90+'°');}))),
            h('p',{role:'status',className:'gwe-builder-note'},configuredStarter.ok?configuredStarter.stamp.blocks.length+' editable blocks ready to preview.':configuredStarter.reason),
            h('button',{type:'button',onClick:function(){setStarterOptions({});cancelSelectionPreview();}},'Reset starter options')),
          renderCoordinateInputs('gwe-starter-corner',stampOrigin,setStampOrigin,'Place the starter corner at'),
          h('div',{className:'gwe-builder-actions'},h('button',{type:'button',onClick:function(){var live=window[ENGINE_KEY],cell=live && live._placementPreview && live._placementPreview.cell;if(cell){setStampOrigin({x:String(cell.x),y:String(cell.y),z:String(cell.z)});cancelSelectionPreview();}else setSelectionEditNotice('Aim at nearby ground or a block face first.');}},'Use aim for starter'),
            h('button',{type:'button',disabled:!configuredStarter.ok,onClick:function(){if(!configuredStarter.ok)return;var s=configuredStarter.stamp,result=previewBuildStamp(window[ENGINE_KEY],s,stampCoordinates());setSelectionEditPreview(result);setSelectionEditNotice(result.ok?s.name+': '+s.blocks.length+' editable blocks. Review the outline, then apply.':result.reason);}},'Preview starter')));
      }
      function changePointerMode(mode){var live=window[ENGINE_KEY];cancelSelectionPreview();if(live && live.cancelDrawing)live.cancelDrawing(true);if(live && live.setDrawMode)live.setDrawMode('single');setPointerMode(mode);}
      function renderDirectControls(){
        return h('details',{className:'gwe-details gwe-direct-controls'},h('summary',null,'Select blocks & move the camera'),
          h('div',{className:'gwe-pointer-modes',role:'group','aria-label':'World pointer tool'},[['build','Build'],['select','Select blocks'],['transform','Move handles'],['orbit','Orbit camera']].map(function(m){return h('button',{type:'button',key:m[0],'aria-pressed':pointerMode===m[0],disabled:m[0]==='transform' && !hasRetainedSelection,onClick:function(){changePointerMode(m[0]);}},m[1]);})),
          h('p',{className:'gwe-builder-note'},pointerMode==='select'?'Click a block or drag a rectangle. Choose visible block centers or include hidden blocks below. Shift adds; Alt removes. Escape returns to building.':pointerMode==='transform'?'Drag an axis to preview a grid move. Arrow keys move one block; Shift moves five. The circular arrow previews a 90° rotation around the footprint corner. Apply commits; Escape cancels.':pointerMode==='orbit'?'Drag to orbit. Shift-drag or right-drag to pan. Scroll to zoom. Touch users can drag and use the camera buttons. Escape returns to building.':'Use Select blocks to choose parts of a structure. Orbit camera gives you a cursor-controlled construction view.'),
          pointerMode==='select' && h('label',{className:'gwe-edit-label'},'Selection depth',h('select',{'aria-label':'Selection depth',value:selectionDepth,onChange:function(e){setSelectionDepth(e.target.value);}},h('option',{value:'visible'},'Visible block centers'),h('option',{value:'all'},'Include hidden blocks'))),
          pointerMode==='select' && h('label',{className:'gwe-edit-label'},'Selection action',h('select',{'aria-label':'Selection action',value:selectionOperation,onChange:function(e){setSelectionOperation(e.target.value);}},[['replace','Replace selection'],['add','Add blocks'],['remove','Remove blocks']].map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);}))),
          pointerMode==='select' && h('button',{type:'button',onClick:function(){var live=window[ENGINE_KEY],hit=live && live.blockUnderCrosshair && live.blockUnderCrosshair(),p=hit && hit.object && hit.object.userData.gridPos,result=updateWorkshopSelection(live,p?[p]:[],selectionOperation);cancelSelectionPreview();setSelectionEditNotice(result.ok?result.count+' blocks selected.':result.reason);var selected=selectionMeasurement(live);patchGeometryState(ctx,{measureResult:selected?selected.measurement:null});}},'Use aimed block for selection'),
          hasRetainedSelection && h('div',{className:'gwe-nudge-controls',role:'group','aria-label':'Preview a one-block move'},[['− X',-1,0,0],['+ X',1,0,0],['Down',0,-1,0],['Up',0,1,0],['− Z',0,0,-1],['+ Z',0,0,1]].map(function(a){return h('button',{type:'button',key:a[0],onClick:function(){var offset={x:a[1],y:a[2],z:a[3]},result=previewSelectionEdit(window[ENGINE_KEY],'move',offset);setSelectionEditMode('move');setSelectionOffset({x:String(a[1]),y:String(a[2]),z:String(a[3])});setSelectionEditPreview(result);setSelectionEditNotice(result.ok?'Move one block '+a[0]+'. Review the outline, then apply.':result.reason);}},a[0]);})),
          hasRetainedSelection && h('p',{className:'gwe-builder-note'},'X moves left/right; Z moves in depth. Buttons preview one grid step. Apply preview commits the whole selection.'),
          pointerMode!=='build' && h('button',{type:'button',onClick:function(){patchGeometryState(ctx,{sandboxDockCollapsed:true});focusWorldSurface(0);}},'Open canvas controls'));
      }

      var _selectionEditMode=React.useState('move'), selectionEditMode=_selectionEditMode[0], setSelectionEditMode=_selectionEditMode[1];
      var _selectionOffset=React.useState({x:'1',y:'0',z:'0'}), selectionOffset=_selectionOffset[0], setSelectionOffset=_selectionOffset[1];
      var _patternOptions=React.useState({axis:'x',direction:'1',total:'4',gap:'1'}),patternOptions=_patternOptions[0],setPatternOptions=_patternOptions[1];
      var _alignOptions=React.useState({axis:'x',edge:'start',coordinate:'0'}),alignOptions=_alignOptions[0],setAlignOptions=_alignOptions[1];
      var _selectionEditMaterial=React.useState('stone'), selectionEditMaterial=_selectionEditMaterial[0], setSelectionEditMaterial=_selectionEditMaterial[1];
      var _selectionEditPreview=React.useState(null), selectionEditPreview=_selectionEditPreview[0], setSelectionEditPreview=_selectionEditPreview[1];
      var _selectionEditNotice=React.useState(''), selectionEditNotice=_selectionEditNotice[0], setSelectionEditNotice=_selectionEditNotice[1];
      var selectionPreviewOwner=React.useRef({kind:'selection-editor'});
      var _toolFinderOpen=React.useState(false),toolFinderOpen=_toolFinderOpen[0],setToolFinderOpen=_toolFinderOpen[1];
      var _toolQuery=React.useState(''),toolQuery=_toolQuery[0],setToolQuery=_toolQuery[1];
      var toolFinderButton=React.useRef(null),toolFinderInput=React.useRef(null);
      var _previewReview=React.useState(false),previewReview=_previewReview[0],setPreviewReview=_previewReview[1];
      var _previewSurroundings=React.useState(false),previewSurroundings=_previewSurroundings[0],setPreviewSurroundings=_previewSurroundings[1];
      var previewCameraOrigin=React.useRef(null),_previewCameraView=React.useState('perspective'),previewCameraView=_previewCameraView[0],setPreviewCameraView=_previewCameraView[1];
      React.useEffect(function(){if(previewReview && !previewSurroundings)return suspendPreviewScenery(engine);},[previewReview,previewSurroundings,engine]);
      React.useEffect(function(){if(toolFinderOpen && toolFinderInput.current)toolFinderInput.current.focus();},[toolFinderOpen]);
      React.useEffect(function(){if(!isSandbox || !data.worldActive || homeOpen || data.showcaseActive || data.showSandboxLauncher){setToolFinderOpen(false);setPreviewReview(false);}},[isSandbox,data.worldActive,homeOpen,data.showcaseActive,data.showSandboxLauncher]);
      React.useEffect(function(){if(!selectionEditPreview || !data.sandboxDockCollapsed)setPreviewReview(false);},[selectionEditPreview,data.sandboxDockCollapsed]);
      React.useEffect(function(){
        if(!previewReview)return undefined;
        function escape(event){if(event.key!=='Escape' || document.pointerLockElement)return;event.preventDefault();event.stopPropagation();cancelSelectionPreview();finishPreviewReview();}
        window.addEventListener('keydown',escape,true);return function(){window.removeEventListener('keydown',escape,true);};
      },[previewReview]);
      function closeToolFinder(){setToolFinderOpen(false);window.requestAnimationFrame(function(){if(toolFinderButton.current)toolFinderButton.current.focus();});}
      function navigateWorkshopTool(tool){
        if(!tool || !tool.available)return;
        setToolFinderOpen(false);patchGeometryState(ctx,{sandboxDockCollapsed:false,builderPanel:'build'});
        var current=window[ENGINE_KEY];
        window.requestAnimationFrame(function(){
          if(window[ENGINE_KEY]!==current || !current || current._destroyed)return;
          var dock=document.querySelector('.gwe-builder-dock'),target=dock && dock.querySelector(tool.selector);if(!target)return;
          for(var node=target;node && node!==dock;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
          window.requestAnimationFrame(function(){
            if(!target.isConnected)return;var body=dock.querySelector('.gwe-builder-body');
            var control=target.matches('details')?target.querySelector('summary'):target.querySelector('h3,h4,legend,label,button,input,select');control=control || target;
            if(!control.matches('button,input,select,summary'))control.tabIndex=-1;control.focus({preventScroll:true});
            if(body)body.scrollTop+=target.getBoundingClientRect().top-body.getBoundingClientRect().top-8;
          });
        });
      }
      function renderToolFinder(){
        var tools=findWorkshopTools(toolQuery,hasRetainedSelection),first=tools.find(function(tool){return tool.available;});
        return h('section',{id:'gwe-tool-finder',className:'gwe-tool-finder','aria-label':'Find a Free Build tool',onKeyDown:function(event){event.stopPropagation();if(event.key==='Escape'){event.preventDefault();closeToolFinder();}}},
          h('form',{role:'search',onSubmit:function(event){event.preventDefault();if(first)navigateWorkshopTool(first);}},h('label',{htmlFor:'gwe-tool-query'},'What would you like to do?'),h('input',{ref:toolFinderInput,id:'gwe-tool-query',type:'search',value:toolQuery,placeholder:'Try roof, rotate, save, or print…',autoComplete:'off',onChange:function(event){setToolQuery(event.target.value);}})),
          h('p',{className:'gwe-tool-count',role:'status'},tools.length?tools.length+' tool'+(tools.length===1?'':'s')+' · Enter opens the first available result':'No matching tools. Try a shorter word, such as “build” or “save”.'),
          h('div',{className:'gwe-tool-results'},tools.map(function(tool){return h('button',{type:'button',key:tool.id,className:'gwe-tool-result','data-tool':tool.id,disabled:!tool.available,onClick:function(){navigateWorkshopTool(tool);}},h('span',{className:'gwe-tool-group'},tool.group),h('strong',null,tool.title),h('span',null,tool.available?tool.description:'Select a creation first to use this tool.'),h('span',{className:'gwe-tool-arrow','aria-hidden':'true'},'↗'));})),
          !hasRetainedSelection && tools.some(function(tool){return !tool.available;}) && h('button',{type:'button',className:'gwe-finder-select',onClick:function(){navigateWorkshopTool(findWorkshopTools('',false).find(function(tool){return tool.id==='select';}));}},'Show selection controls'));
      }
      function beginPreviewReview(){previewCameraOrigin.current=capturePreviewCamera(window[ENGINE_KEY]);var result=frameBuildPreview(ctx,selectionEditPreview,selectionPreviewOwner.current);if(!result.ok){setSelectionEditNotice(result.reason);return;}setToolFinderOpen(false);setPreviewReview(true);window.requestAnimationFrame(function(){var review=document.querySelector('.gwe-preview-review');if(review)review.focus({preventScroll:true});});}
      function finishPreviewReview(){setPreviewReview(false);patchGeometryState(ctx,{sandboxDockCollapsed:false});window.requestAnimationFrame(function(){var target=document.querySelector('.gwe-edit-preview') || toolFinderButton.current;if(target){target.tabIndex=-1;target.focus({preventScroll:true});}});}
      function renderPreviewCameraControls(){
        function action(name,value){var live=window[ENGINE_KEY],camera=live && live._previewReviewCamera;if(camera && camera[name])camera[name](value);}
        return h('details',{className:'gwe-preview-camera-tools',onToggle:function(){action('scheduleFit');}},h('summary',null,'Rotate & zoom preview'),
          h('span',{className:'gwe-preview-gesture-hint'},'Drag to orbit. Pinch or scroll to zoom. Fit shows the whole model.'),
          h('div',{className:'gwe-preview-view-buttons',role:'group','aria-label':'Preview camera views'},[['perspective','Angle'],['front','Front'],['side','Side'],['top','Top']].map(function(option){return h('button',{key:option[0],type:'button','aria-label':'View preview from '+option[0],'aria-pressed':previewCameraView===option[0],onClick:function(){action('view',option[0]);}},option[1]);})),
          h('div',{className:'gwe-preview-zoom-buttons',role:'group','aria-label':'Preview camera zoom'},h('button',{type:'button',onClick:function(){action('zoom',1/1.18);}},'Closer'),h('button',{type:'button',onClick:function(){action('fit');}},'Fit model'),h('button',{type:'button',onClick:function(){action('zoom',1.18);}},'Farther')));
      }
      function renderPreviewFacts(){var facts=previewChangeFacts(selectionEditPreview);return facts && h('div',{className:'gwe-preview-facts'},h('span',null,h('strong',null,facts.count),' preview blocks'),h('span',null,h('strong',null,facts.width+' × '+facts.depth+' × '+facts.height),' block bounds'),h('small',null,facts.net===0?'Block count stays the same.':(facts.net>0?'+':'')+facts.net+' blocks overall.'));}
      function renderPreviewButtons(inWorld){return h('div',{className:'gwe-preview-buttons'},h('button',{type:'button',className:selectionEditPreview.ok?'gwe-primary':'',disabled:!selectionEditPreview.ok,onClick:function(){applyCreationChange();if(inWorld)finishPreviewReview();}},'Apply preview'),h('button',{type:'button',disabled:!inWorld && !previewChangeFacts(selectionEditPreview),onClick:inWorld?finishPreviewReview:beginPreviewReview},inWorld?'Back to tools':'Review in world'),h('button',{type:'button',onClick:function(){cancelSelectionPreview();if(inWorld)finishPreviewReview();}},'Cancel preview'));}
      var _stampLibrary=React.useState(function(){return readBuildStamps();}), stampLibrary=_stampLibrary[0], setStampLibrary=_stampLibrary[1];
      var _stampName=React.useState(''), stampName=_stampName[0], setStampName=_stampName[1];
      var _stampId=React.useState(''), stampId=_stampId[0], setStampId=_stampId[1];
      var _stampOrigin=React.useState({x:'0',y:'1',z:'0'}), stampOrigin=_stampOrigin[0], setStampOrigin=_stampOrigin[1];
      var _stampNotice=React.useState(''), stampNotice=_stampNotice[0], setStampNotice=_stampNotice[1];
      var _stampGalleryOpen=React.useState(false), stampGalleryOpen=_stampGalleryOpen[0], setStampGalleryOpen=_stampGalleryOpen[1];
      var stampCards=React.useMemo(function(){
        if(!stampGalleryOpen)return [];
        return stampLibrary.stamps.map(function(stamp){var facts=activityBuildFacts(stamp.blocks),svg=activitySnapshotSvg({blocks:stamp.blocks});return {stamp:stamp,facts:facts,image:svg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg):''};});
      },[stampGalleryOpen,stampLibrary]);
      React.useEffect(function(){if(data.drawMode && data.drawMode!=='single'){setSelectionEditPreview(null);setSelectionEditNotice('');}},[data.drawMode]);
      React.useEffect(function(){
        var plan=selectionEditPreview,owner=selectionPreviewOwner.current;
        if(!plan || !plan.engine)return undefined;
        if(plan.additions && plan.engine.cancelDrawing)plan.engine.cancelDrawing(true);
        if(plan.additions && plan.engine._drawMode && plan.engine._drawMode!=='single' && plan.engine.setDrawMode)plan.engine.setDrawMode('single');
        if(plan.engine.showBuildBatchPreview && plan.additions)plan.engine.showBuildBatchPreview(plan,owner);
        return function(){if(plan.engine.clearBuildBatchPreview)plan.engine.clearBuildBatchPreview(owner);};
      },[selectionEditPreview]);
      React.useEffect(function(){
        var live=selectionEditPreview && selectionEditPreview.engine,owner=selectionPreviewOwner.current;
        if(!live || !live.setBuildPreviewSurface)return;
        live.setBuildPreviewSurface(!!previewReview,owner);
        return function(){live.setBuildPreviewSurface(false,owner);};
      },[previewReview,selectionEditPreview]);
      React.useEffect(function(){
        if(!previewReview || !selectionEditPreview)return;var live=selectionEditPreview.engine;
        var camera=installPreviewCamera(live,selectionEditPreview,selectionPreviewOwner.current,previewCameraOrigin.current,setPreviewCameraView);
        return function(){if(camera)camera.dispose(true);};
      },[previewReview,selectionEditPreview]);
      React.useEffect(function(){if(data.showGameSettings || data.showLessonIntro)setPreviewReview(false);},[data.showGameSettings,data.showLessonIntro]);
      React.useEffect(function(){setPreviewReview(false);setSelectionEditPreview(null);},[data.activeLesson]);
      React.useEffect(function(){
        if(!isSandbox || !data.worldActive || homeOpen || data.showcaseActive || data.showSandboxLauncher){setSelectionEditPreview(null);setSelectionEditNotice('');}
      },[isSandbox,data.worldActive,homeOpen,data.showcaseActive,data.showSandboxLauncher]);
      var _hasStudentBuild = React.useState(null), hasStudentBuild = _hasStudentBuild[0], setHasStudentBuild = _hasStudentBuild[1];
      var buildResumeTimerRef = React.useRef(null);
      React.useEffect(function () { return function () { if (buildResumeTimerRef.current) clearTimeout(buildResumeTimerRef.current); }; }, []);

      var _scaleDraft=React.useState(String(currentPrintUnit)), scaleDraft=_scaleDraft[0], setScaleDraft=_scaleDraft[1];
      var _scaleError=React.useState(''), scaleError=_scaleError[0], setScaleError=_scaleError[1];
      var _printScaleExpanded=React.useState(null), printScaleExpanded=_printScaleExpanded[0], setPrintScaleExpanded=_printScaleExpanded[1];
      var scaleInputRef=React.useRef(null);
      React.useEffect(function(){setScaleDraft(String(currentPrintUnit));setScaleError('');},[currentPrintUnit]);
      var liveBuilderCtx = React.useRef(ctx); liveBuilderCtx.current = ctx;
      React.useEffect(function () {
        var previousEngine=null, signature='', selectedBlockKeys='', outline=null, outlineOwner=null, selectionPollCache={current:null}, selectionPollResult=null;
        var previousStudentPresence = null;
        function measurementKeys(measurement){return measurement && Array.isArray(measurement.blocks)?measurement.blocks.map(keyFor).sort().join('|'):'';}
        function clearOutline(){
          if(!outline)return;
          if(outlineOwner){
            if(outlineOwner._builderSelectionFrame===outline)delete outlineOwner._builderSelectionFrame;
            var showcase=outlineOwner._showcase;
            if(showcase){
              showcase.hidden=(showcase.hidden || []).filter(function(entry){return entry[0]!==outline;});
              if(showcase.studio)showcase.studio.hidden=(showcase.studio.hidden || []).filter(function(entry){return entry[0]!==outline;});
            }
          }
          if(outline.parent)outline.parent.remove(outline);
          outline.geometry.dispose();outline.material.dispose();outline=null;outlineOwner=null;
        }
        function refresh(){
          var eng=window[ENGINE_KEY];
          if(eng && eng.pollWorkshopDraft)eng.pollWorkshopDraft();
          // Reuse this refresh and the engine's cached array. Lifetime placement
          // totals cannot identify an empty build after Undo, Break or Clear.
          var guidanceData = (liveBuilderCtx.current.toolData || {}).geometryWorld || {};
          var studentPresence = guidanceData.activeLesson === 'builderSandbox' && guidanceData.worldActive && eng && typeof eng.getBlocksArr === 'function'
            ? eng.getBlocksArr().some(function(mesh) { return isStudentBlock(mesh && mesh.userData); }) : null;
          if (studentPresence !== previousStudentPresence) {
            previousStudentPresence = studentPresence;
            setHasStudentBuild(studentPresence);
          }
          if(eng && !eng._showcase && (liveBuilderCtx.current.toolData.geometryWorld || {}).showcaseActive)patchGeometryState(liveBuilderCtx.current,{showcaseActive:false});
          if(!!(eng && eng._creationFocus)!==!!((liveBuilderCtx.current.toolData.geometryWorld || {}).creationFocusAvailable))patchGeometryState(liveBuilderCtx.current,{creationFocusAvailable:!!(eng && eng._creationFocus)});
          if(outline)outline.visible=!(eng && eng._showcase);
          syncGeometryPrintGuide(eng,liveBuilderCtx.current);
          if(eng!==previousEngine){disposeGeometryPrintGuide(previousEngine);if(previousEngine && previousEngine.disposeShowcaseLook)previousEngine.disposeShowcaseLook();if(previousEngine && previousEngine.disposeCreationFocus)previousEngine.disposeCreationFocus();clearOutline();signature='';selectedBlockKeys='';previousEngine=eng;}
          var selected=polledSelectionMeasurement(eng,selectionPollCache);
          var visibleCheck=guidanceData.builderPrintCheck;
          if(selected && selected===selectionPollResult && visibleCheck && visibleCheck.selectionSignature===signature)return;
          selectionPollResult=selected;
          if(!selected){
            clearOutline();
            if(signature){
              var visibleData=(liveBuilderCtx.current.toolData || {}).geometryWorld || {},invalidPatch={builderPrintCheck:null};
              // Only dismiss the vanished selection's own inspector. An M-key
              // measurement of a different build or the ground remains valid.
              if(selectedBlockKeys && measurementKeys(visibleData.measureResult)===selectedBlockKeys){invalidPatch.measureResult=null;invalidPatch.builderPanel='build';}
              signature='';selectedBlockKeys='';patchGeometryState(liveBuilderCtx.current,invalidPatch);
            }
            return;
          }
          var m=selected.measurement;
          var next=blockMeasurementSignature(eng,m.blocks.map(keyFor));
          if(next===signature && visibleCheck && visibleCheck.selectionSignature===next)return;
          var previousBlockKeys=selectedBlockKeys;selectedBlockKeys=measurementKeys(m);
          signature=next;eng._builderSelection=Object.assign({blocks:m.blocks.slice()},eng._builderSelection && eng._builderSelection.exact?{exact:true}:{});
          var check=null;
          try{var bundle=buildGeometryWorldStl(eng,m.blocks);check={components:bundle.connectedComponents,triangles:bundle.triangleCount,nonManifoldEdges:bundle.topology.nonManifoldEdges,openEdges:bundle.topology.openEdges,contactGroups:bundle.contactGroups,selectionSignature:next};}catch(error){check={error:error.message,selectionSignature:next};}
          if(window.THREE && eng.scene){
            clearOutline();
            // Ignore temporary placement-pop scale and decorative mesh children.
            outline=createSelectionFrame(creationGeometryBounds(eng,m.blocks),check);
            if(outline){outlineOwner=eng;eng._builderSelectionFrame=outline;outline.visible=!eng._showcase;eng.scene.add(outline);}
          }
          var currentData=(liveBuilderCtx.current.toolData || {}).geometryWorld || {};
          var refreshPatch={builderPrintCheck:check};
          // Refresh this selection's visible inspector. Keep closed and unrelated
          // measurements intact as the selected creation changes underneath them.
          var visibleKeys=measurementKeys(currentData.measureResult);
          if(visibleKeys && (visibleKeys===previousBlockKeys || visibleKeys===selectedBlockKeys))refreshPatch.measureResult=m;
          patchGeometryState(liveBuilderCtx.current,refreshPatch);
        }
        var timer=setInterval(refresh,250);refresh();
        return function(){clearInterval(timer);disposeGeometryPrintGuide(previousEngine);if(previousEngine && previousEngine.disposeShowcaseLook)previousEngine.disposeShowcaseLook();if(previousEngine && previousEngine.disposeCreationFocus)previousEngine.disposeCreationFocus();clearOutline();};
      },[]);

      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);
      React.useEffect(function () {
        if(data.showcaseActive)return scheduleShowcaseLayoutFit(window[ENGINE_KEY]);
      },[data.showcaseActive]);
      React.useEffect(function () {
        if (!data.showcaseActive) {
          if (showcaseFilesWasOpen.current) { editableReadTokenRef.current += 1; setEditablePreview(null); if(!editableApplyFailedRef.current)setEditableError(''); setEditableBusy(false); }
          showcaseFilesWasOpen.current = false; setShowcaseFilesOpen(false); return;
        }
        var target = showcaseFilesOpen ? showcaseFilesRef.current : showcaseFilesWasOpen.current ? showcaseFilesTriggerRef.current : null;
        if (target && target.focus) target.focus();
        showcaseFilesWasOpen.current = showcaseFilesOpen;
      }, [data.showcaseActive, showcaseFilesOpen]);
      React.useEffect(function () {
        if (showcaseFilesOpen && editablePreview && editableRecoveryRef.current) editableRecoveryRef.current.focus();
      }, [showcaseFilesOpen, editablePreview]);
      React.useEffect(function () {
        if (editableError && !data.showcaseActive && editableErrorRef.current) editableErrorRef.current.focus();
      }, [editableError, data.showcaseActive]);

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
          if (attempts < 1200) timer = setTimeout(restore, 100);
        }
        restore();
        return function () { cancelled = true; if (timer) clearTimeout(timer); };
      }, [isSandbox, hasPendingReturn]);

      if (!base || !React.isValidElement(base)) return base;
      var engine = window[ENGINE_KEY];
      var material = BLOCK_TYPES[Math.max(0, Math.min(BLOCK_TYPES.length - 1, Number(data.selectedBlock) || 0))];
      var shape = BLOCK_SHAPES[Math.max(0, Math.min(BLOCK_SHAPES.length - 1, Number(data.selectedShape) || 0))];
      // The dock describes the creation Send and Showcase will use; the core
      // inspector can independently display a ground or another measurement.
      var retainedMeasured = retainedSelectionSummary(engine, retainedMeasurementRef);
      var hasRetainedSelection = !!(retainedMeasured && retainedMeasured.isComplete !== false && Array.isArray(retainedMeasured.blocks) && retainedMeasured.blocks.length && measurementIsStudentBuild(engine,retainedMeasured));
      var measured = retainedMeasured || (data.measureResult && data.measureResult.isComplete !== false ? data.measureResult : null);
      // M measures whatever the crosshair rests on, the ground included. The
      // sandbox floor is a 25 x 25 x 1 'structure' that would otherwise be quoted
      // as a 125 x 125 x 5 mm print that fits, when Send would refuse it.
      var measuredIsStudentBuild = !!(measured && measurementIsStudentBuild(engine, measured));
      var printEnvelope = measuredIsStudentBuild ? defaultPrintEnvelope(measured, storedPrinterProfile(ctx), currentPrintUnit) : null;
      var placed = engine && isFinite(engine.blocksPlaced) ? engine.blocksPlaced : (Number(data.blocksPlaced) || 0);
      var launcherOpen = !!data.showSandboxLauncher;
      var collapsed = !!data.sandboxDockCollapsed;
      function resumeBuilding(choice) {
        setToolFinderOpen(false);
        if(pointerMode!=='build'){setPointerMode('build');cancelSelectionPreview();}
        var owner = window[ENGINE_KEY];
        if (owner && owner.releaseInput) owner.releaseInput();
        patchGeometryState(ctx, { sandboxDockCollapsed:true, builderPanel:'build', hudPanel:'' });
        if (buildResumeTimerRef.current) clearTimeout(buildResumeTimerRef.current);
        buildResumeTimerRef.current = setTimeout(function () {
          buildResumeTimerRef.current = null;
          var liveData = (liveBuilderCtx.current.toolData || {}).geometryWorld || {};
          if (window[ENGINE_KEY] !== owner || liveData.activeLesson !== 'builderSandbox' || !liveData.worldActive || !liveData.sandboxDockCollapsed || liveData.showGeometryHome || liveData.showcaseActive) return;
          var workspace = document.getElementById('geoworld-fs-workspace');
          if (workspace && workspace.querySelector('[role="dialog"][aria-modal="true"]')) return;
          var selector = choice === 'material' ? '.gw-hotbar-item[aria-pressed="true"]' : choice === 'shape' ? '.gw-shape-item[aria-pressed="true"]' : '';
          var target = (selector && workspace && workspace.querySelector(selector)) || document.getElementById('geoworld-fs-wrap');
          if (target && typeof target.focus === 'function') {
            try { target.focus({preventScroll:true}); } catch (_) { target.focus(); }
            if (selector && target.scrollIntoView) target.scrollIntoView({block:'nearest',inline:'nearest'});
          }
          if (choice) announce(liveBuilderCtx.current, choice === 'material' ? 'Material choices are open in the bottom row. Shape choices are just above them.' : 'Shape choices are open above the material row. Choose a shape, then use Rotate for its direction.', 'info');
        }, 40);
      }
      function cancelSelectionPreview(){setPreviewReview(false);var live=window[ENGINE_KEY];if(live && live._workshopTransformActions)live._workshopTransformActions.reset();setSelectionEditPreview(null);setSelectionEditNotice('');}
      function chooseDuplicatePosition(axis,preview){
        cancelSelectionPreview();
        var plan=suggestCreationDuplicate(window[ENGINE_KEY],axis);
        if(!plan.ok){setSelectionEditNotice(plan.reason);return;}
        var offset=plan.suggestedOffset;setSelectionOffset({x:String(offset.x),y:String(offset.y),z:String(offset.z)});
        if(preview){setSelectionEditPreview(plan);setSelectionEditNotice('Duplicate creation: '+plan.additions.length+' blocks. Review the outline, then apply.');}
        else setSelectionEditNotice('A clear position is suggested. Choose Preview change to review the copy.');
      }
      function previewCreationChange(){
        var offset={};['x','y','z'].forEach(function(axis){offset[axis]=selectionOffset[axis].trim()===''?NaN:Number(selectionOffset[axis]);});offset.type=selectionEditMaterial;
        var values=offset;
        if(selectionEditMode==='repeat')values={axis:patternOptions.axis,direction:Number(patternOptions.direction),total:patternOptions.total.trim()===''?NaN:Number(patternOptions.total),gap:patternOptions.gap.trim()===''?NaN:Number(patternOptions.gap)};
        if(selectionEditMode==='align')values={axis:alignOptions.axis,edge:alignOptions.edge,coordinate:alignOptions.coordinate.trim()===''?NaN:Number(alignOptions.coordinate)};
        var result=previewSelectionEdit(window[ENGINE_KEY],selectionEditMode,values);
        setSelectionEditPreview(result);setSelectionEditNotice(result.ok?result.label+': '+result.additions.length+' blocks. Review the outline, then apply.':result.reason);
      }
      function applyCreationChange(){
        var live=window[ENGINE_KEY],overlay=live && live._buildBatchPreview;
        if(overlay && overlay.owner!==selectionPreviewOwner.current){setSelectionEditNotice('Another building preview replaced this one. Preview your creation change again.');setSelectionEditPreview(null);return;}
        var result=commitSelectionEdit(live,selectionEditPreview);
        if(!result.ok){setSelectionEditNotice(result.reason);setSelectionEditPreview(null);return;}
        var label=selectionEditPreview.label;if(live._workshopTransformActions)live._workshopTransformActions.reset();setSelectionEditPreview(null);setSelectionEditNotice(label+' applied. Undo reverses the whole change.');
        var selected=selectionMeasurement(window[ENGINE_KEY]);patchGeometryState(ctx,{measureResult:selected?selected.measurement:null,builderPanel:'build'});
        announce(ctx,label+' applied. Undo reverses the whole change.','success');
      }
      function stampCoordinates(){var result={};['x','y','z'].forEach(function(axis){result[axis]=stampOrigin[axis].trim()===''?NaN:Number(stampOrigin[axis]);});return result;}
      function previewStoredStamp(){
        var selected=stampLibrary.stamps.find(function(stamp){return stamp.id===stampId;}) || stampLibrary.stamps[0];
        if(!selected){setStampNotice('Save a selection as a stamp first.');return;}
        var result=previewBuildStamp(window[ENGINE_KEY],selected,stampCoordinates());setSelectionEditPreview(result);
        setSelectionEditNotice(result.ok?result.label+': '+result.additions.length+' blocks. Review the outline, then apply.':result.reason);
      }
      function renderCoordinateInputs(prefix,values,setValues,label){
        return h('fieldset',{className:'gwe-edit-coordinates'},h('legend',null,label),['x','y','z'].map(function(axis){return h('label',{key:axis,htmlFor:prefix+'-'+axis},axis.toUpperCase(),h('input',{id:prefix+'-'+axis,type:'number',inputMode:'numeric',step:1,min:axis==='y' && prefix==='gwe-stamp-corner'?1:-128,max:128,value:values[axis],onChange:function(event){var next=Object.assign({},values);next[axis]=event.target.value;setValues(next);cancelSelectionPreview();}}));}));
      }
      function renderPrecisionSelect(id,label,values,setValues,key,options){
        return h('label',{className:'gwe-edit-label',htmlFor:id},label,h('select',{id:id,value:values[key],onChange:function(event){var next=Object.assign({},values);next[key]=event.target.value;setValues(next);cancelSelectionPreview();}},options.map(function(option){return h('option',{key:option[0],value:option[0]},option[1]);})));
      }
      function renderPrecisionNumber(id,label,values,setValues,key,min,max){
        return h('label',{className:'gwe-edit-label',htmlFor:id},label,h('input',{id:id,type:'number',inputMode:'numeric',min:min,max:max,step:1,value:values[key],onChange:function(event){var next=Object.assign({},values);next[key]=event.target.value;setValues(next);cancelSelectionPreview();}}));
      }
      function renderCreationEditing(){
        return h(React.Fragment,null,
          renderDirectControls(),
          renderStarterLibrary(),
          hasRetainedSelection && h('details',{className:'gwe-details gwe-creation-editor'},
            h('summary',null,'Edit whole creation'),
            h('p',{className:'gwe-builder-note'},'Change every outlined block together, including separate pieces. Preview each change before applying it.'),
            h('label',{className:'gwe-edit-label',htmlFor:'gwe-creation-edit-action'},'Action'),
            h('select',{id:'gwe-creation-edit-action',value:selectionEditMode,onChange:function(event){var mode=event.target.value;setSelectionEditMode(mode);cancelSelectionPreview();if(mode==='duplicate')chooseDuplicatePosition(null,false);}},[['move','Move'],['duplicate','Duplicate'],['repeat','Repeat a pattern'],['align','Align to grid'],['rotate','Rotate 90°'],['mirrorX','Mirror left / right (X)'],['mirrorZ','Mirror front / back (Z)'],['recolor','Change material']].map(function(option){return h('option',{key:option[0],value:option[0]},option[1]);})),
            selectionEditMode==='duplicate' && h('div',{className:'gwe-copy-placement'},
              h('p',{className:'gwe-builder-note'},'Place a copy beside this creation or stack it above. Side copies leave a one-cell gap; stacked copies start on the next grid layer.'),
              h('div',{className:'gwe-copy-directions','aria-label':'Preview a duplicate position'},[['x','Beside X'],['z','Beside Z'],['y','Stack above']].map(function(option){return h('button',{type:'button',key:option[0],onClick:function(){chooseDuplicatePosition(option[0],true);}},option[1]);}))),
            (selectionEditMode==='move' || selectionEditMode==='duplicate') && renderCoordinateInputs('gwe-creation-offset',selectionOffset,setSelectionOffset,'Offset in blocks · X right, Y up, Z depth'),
            selectionEditMode==='repeat' && h('div',{className:'gwe-pattern-options'},
              h('p',{className:'gwe-builder-note'},'Repeat the selected blocks at equal intervals. Total includes the original. Zero gap makes copies meet at their grid edges; one gap leaves an empty cell.'),
              renderPrecisionSelect('gwe-pattern-axis','Pattern axis',patternOptions,setPatternOptions,'axis',[['x','X · across'],['z','Z · in depth'],['y','Y · stack']]),
              renderPrecisionSelect('gwe-pattern-direction','Direction',patternOptions,setPatternOptions,'direction',[['1','Positive direction (+)'],['-1','Negative direction (−)']]),
              h('div',{className:'gwe-precision-numbers'},renderPrecisionNumber('gwe-pattern-total','Total instances',patternOptions,setPatternOptions,'total',2,12),renderPrecisionNumber('gwe-pattern-gap','Gap in blocks',patternOptions,setPatternOptions,'gap',0,8)),
              h('p',{className:'gwe-builder-note'},'Apply selects the entire pattern. One Undo removes all new copies.')),
            selectionEditMode==='align' && h('div',{className:'gwe-alignment-options'},
              h('p',{className:'gwe-builder-note'},'Place one edge of the selected grid footprint on an exact grid line. Every block keeps its shape and spacing.'),
              renderPrecisionSelect('gwe-align-axis','Alignment axis',alignOptions,setAlignOptions,'axis',[['x','X · across'],['z','Z · in depth'],['y','Y · height']]),
              renderPrecisionSelect('gwe-align-edge','Grid edge',alignOptions,setAlignOptions,'edge',[['start','Start · lower coordinate'],['end','End · higher coordinate']]),
              renderPrecisionNumber('gwe-align-coordinate','Target grid line',alignOptions,setAlignOptions,'coordinate',-128,128),
              h('p',{className:'gwe-builder-note'},'For example, a cube in X = 3 starts at line 3 and ends at line 4. Aligning Y start to line 1 rests the lowest grid layer on the ground.'),
              h('button',{type:'button',onClick:function(){setAlignOptions({axis:'y',edge:'start',coordinate:'1'});cancelSelectionPreview();}},'Use ground level')),
            selectionEditMode==='rotate' && h('p',{className:'gwe-builder-note'},'Turns around the vertical axis. The footprint starts at the same grid corner.'),
            selectionEditMode==='recolor' && h(React.Fragment,null,h('label',{className:'gwe-edit-label',htmlFor:'gwe-creation-material'},'New material'),h('select',{id:'gwe-creation-material',value:selectionEditMaterial,onChange:function(event){setSelectionEditMaterial(event.target.value);cancelSelectionPreview();}},BLOCK_TYPES.filter(function(type){return type.id!=='grass';}).map(function(type){return h('option',{key:type.id,value:type.id},type.name);}))),
            h('div',{className:'gwe-builder-actions'},h('button',{type:'button',onClick:previewCreationChange},'Preview change'))
          ),
          h('details',{className:'gwe-details gwe-stamp-library',onToggle:function(event){setStampGalleryOpen(event.currentTarget.open);}},
            h('summary',null,'Reusable building stamps'+(stampLibrary.stamps.length?' · '+stampLibrary.stamps.length:'')),
            h('p',{className:'gwe-builder-note'},'Keep an arch, window, or staircase as editable blocks. Up to 12 named stamps stay in this browser.'),
            !stampLibrary.ok && h('p',{className:'gwe-edit-notice',role:'status'},stampLibrary.reason),
            hasRetainedSelection && h('form',{className:'gwe-stamp-save',onSubmit:function(event){event.preventDefault();var result=saveSelectionStamp(window[ENGINE_KEY],stampName);if(result.ok){cancelSelectionPreview();setStampLibrary(result);setStampId(result.stamps[result.stamps.length-1].id);setStampName('');setStampNotice('Stamp saved in this browser.');}else setStampNotice(result.reason);}},
              h('label',{className:'gwe-edit-label',htmlFor:'gwe-stamp-name'},'Name this selection'),h('input',{id:'gwe-stamp-name',type:'text',maxLength:48,value:stampName,placeholder:'For example, garden arch',onChange:function(event){setStampName(event.target.value);}}),
              h('div',{className:'gwe-builder-actions'},h('button',{type:'submit',disabled:!stampLibrary.ok},'Save selection as stamp'))),
            stampLibrary.stamps.length>0 && h(React.Fragment,null,
              h('div',{className:'gwe-stamp-gallery',role:'group','aria-label':'Choose a building stamp'},stampCards.map(function(card){
                var stamp=card.stamp,facts=card.facts,selected=stamp.id===(stampId || stampLibrary.stamps[0].id);
                return h('button',{type:'button',className:'gwe-stamp-card',key:stamp.id,'aria-pressed':selected,'aria-label':'Use stamp '+stamp.name,onClick:function(){setStampId(stamp.id);cancelSelectionPreview();setStampNotice('Selected '+stamp.name+'. Choose its grid corner, then preview.');}},
                  h('span',{className:'gwe-stamp-art'},card.image && h('img',{src:card.image,alt:'',decoding:'async',loading:'lazy'}),h('span',{className:'gwe-stamp-selection','aria-hidden':'true'},selected?'✓ Selected':'Choose')),
                  h('span',{className:'gwe-stamp-card-name'},stamp.name),
                  h('span',{className:'gwe-stamp-card-facts'},stamp.blocks.length+' blocks',facts && h('span',null,facts.width+' wide · '+facts.depth+' deep · '+facts.height+' high')));
              })),
              h('p',{className:'gwe-builder-note'},'Choose a card, then preview its position in the world.'),
              renderCoordinateInputs('gwe-stamp-corner',stampOrigin,setStampOrigin,'Place the nearest grid corner at'),
              h('div',{className:'gwe-builder-actions'},
                h('button',{type:'button',onClick:function(){var live=window[ENGINE_KEY],cell=live && live._placementPreview && live._placementPreview.cell;if(cell){setStampOrigin({x:String(cell.x),y:String(cell.y),z:String(cell.z)});cancelSelectionPreview();setStampNotice('Grid corner updated from your current aim.');}else setStampNotice('Aim at nearby ground or a block face first.');}},'Use aimed cell'),
                h('button',{type:'button',onClick:previewStoredStamp},'Preview stamp')),
              h('details',{className:'gwe-stamp-manage'},h('summary',null,'Manage saved stamps'),h('p',{className:'gwe-builder-note'},'Removing a recipe leaves all placed blocks in your world.'),h('div',{className:'gwe-builder-actions'},h('button',{type:'button',onClick:function(){var id=stampId || stampLibrary.stamps[0].id,result=removeBuildStamp(id);if(result.ok){setStampLibrary(result);setStampId('');cancelSelectionPreview();setStampNotice('Saved stamp removed. Placed blocks are unchanged.');}else setStampNotice(result.reason);}},'Remove saved stamp')))
            ),
            stampNotice && h('p',{className:'gwe-edit-notice',role:'status'},stampNotice)
          ),
          (selectionEditNotice || selectionEditPreview) && h('section',{className:'gwe-edit-preview','data-ready':selectionEditPreview && selectionEditPreview.ok?'true':'false','aria-label':'Creation change preview',tabIndex:-1},
            h('p',{className:'gwe-edit-notice',role:'status','aria-live':'polite'},selectionEditNotice),
            selectionEditPreview && renderPreviewFacts())
        );
      }
      function renderCreationCameraTools(){
        return h('details',{className:'gwe-camera-orbit-tools'},h('summary',null,'Orbit & views'),
          h('div',{className:'gwe-builder-actions','aria-label':'Orbit selected creation'},
            [['Orbit left',-Math.PI/12,0,1],['Orbit right',Math.PI/12,0,1],['Tilt up',0,Math.PI/18,1],['Tilt down',0,-Math.PI/18,1],['Closer',0,0,1/1.18],['Farther',0,0,1.18]].map(function(action){return h('button',{key:action[0],type:'button',onClick:function(){orbitSelectedCreation(ctx,action[1],action[2],action[3]);}},action[0]);})),
          h('div',{className:'gwe-builder-actions','aria-label':'Selected creation views'},['front','side','top','free'].map(function(preset){return h('button',{key:preset,type:'button',onClick:function(){selectedCreationView(ctx,preset);}},preset==='free'?'Free view':preset[0].toUpperCase()+preset.slice(1));}))
        );
      }
      function applyPrintScale(value) {
        var result=setBuilderPrintScale(liveBuilderCtx.current,value);
        if (!result.ok) {setScaleError(result.error);if(scaleInputRef.current)scaleInputRef.current.focus();return;}
        setScaleDraft(String(result.value));setScaleError('');
      }
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
        if (window[ENGINE_KEY] && window[ENGINE_KEY]._showcaseExporting) { event.target.value = ''; return; }
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
        editableApplyFailedRef.current = false;
        editableReadTokenRef.current += 1;
        setEditableBusy(false); setEditablePreview(null); setEditableError('');
      }
      function cancelEditableImport() {
        cancelEditablePreview();
        var target = homeOpen && homeRef.current ? homeRef.current.querySelector('.gwe-home-file button') : showcaseFilesOpen ? showcaseFileChooseRef.current : editableOpenRef.current;
        if (target && target.focus) target.focus();
      }
      function confirmEditableRestore() {
        if (!editablePreview || !editablePreview.value) return;
        var liveEngine = window[ENGINE_KEY];
        if (liveEngine && liveEngine._showcaseExporting) return;
        var result = restoreEditableWorld(liveEngine, editablePreview.value, ctx);
        if (!result.ok) {
          editableApplyFailedRef.current=true;setEditablePreview(null);setEditableError(result.error);
          if (!liveEngine || !liveEngine._showcase) patchGeometryState(ctx,{sandboxDockCollapsed:false,builderPanel:'build',hudPanel:'inventory'});
          announce(ctx,result.error,'error');return;
        }
        patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory', builderPanel:'build', showGeometryHome:false,_geometryHomeInitial:false, showcaseActive:false, showcaseSaving:false, actionFeedback:'', sandboxDockCollapsed:false, builderPrintContext:null, builderPrintCheck:null, measureResult: null, measureHistory: [], blocksPlaced: result.placedCount });
        if (liveEngine.logEvent) liveEngine.logEvent('editable_world_open', { blocks: result.placedCount, schema: EDITABLE_WORLD_SCHEMA });
        cancelEditablePreview();
        announce(ctx, 'Opened ' + result.value.title + ' with ' + result.placedCount + ' student block' + (result.placedCount === 1 ? '' : 's') + '. The previous sandbox was replaced only after confirmation.', 'success');
        focusWorldSurface(50);
      }

      function downloadEditableRecovery() {
        var eng=window[ENGINE_KEY], backup=eng && eng._editableImportRecovery;
        if (!backup) return;
        var editable=backup.editableWorld;
        downloadBlob(new Blob([JSON.stringify(editable || backup)],{type:'application/json'}),editable ? 'geometry-world-previous-build-editable.json' : 'geometry-world-workspace-recovery.json');
        announce(ctx,editable ? 'Saved the previous student build as an editable AlloFlow file.' : 'Saved the complete workspace recovery details. This recovery file is not an editable-world import.','success');
      }
      function renderEditableRecovery(inHome) {
        if(homeOpen && !inHome)return null;
        var backupEngine=window[ENGINE_KEY], backup=backupEngine && backupEngine._editableImportRecovery;
        return h(React.Fragment, null,
          backup && h('section', {className:'gwe-recovery','data-state':'backup','aria-label':'Previous workspace backup'},
            h('strong',null,'Previous workspace backup'),
            h('p',null,backup.editableWorld ? 'Your previous student build is still available as an editable AlloFlow file. Download it before leaving Geometry World.' : 'The previous workspace is outside the editable-file limits. Save its full recovery details before leaving Geometry World; this file cannot be opened by the editable-world importer.'),
            h('div',{className:'gwe-recovery-actions'},
              h('button',{type:'button',className:'gwe-recovery-download',onClick:downloadEditableRecovery},backup.editableWorld ? 'Download previous build' : 'Download recovery details')
            )
          ),
          editableError && h('div', { className: 'gwe-recovery', 'data-state': 'error', role: 'alert', ref:editableErrorRef, tabIndex:-1 }, h('strong', null, 'File not opened'), h('p', null, editableError)),
          editablePreview && h('section', { className: 'gwe-recovery', 'data-state': 'preview', 'aria-labelledby': 'gwe-recovery-title', ref:editableRecoveryRef, tabIndex:-1 },
            h('strong', { id: 'gwe-recovery-title' }, 'Ready to open: ' + editablePreview.value.title),
            h('p', null, editablePreview.summary.blockCount + ' student block' + (editablePreview.summary.blockCount === 1 ? '' : 's') + ' - bounds ' + editablePreview.summary.bounds.width + ' x ' + editablePreview.summary.bounds.depth + ' x ' + editablePreview.summary.bounds.height + '. Current world is unchanged.'),
            h('p', null, 'Replacing starts from the blank sandbox floor and treats the loaded blocks as a new baseline. This cannot be undone inside Geometry World.'),
            h('div', { className: 'gwe-recovery-actions' },
              h('button', { type: 'button', onClick: cancelEditableImport }, 'Cancel'),
              h('button', { type: 'button', className: 'gwe-replace', disabled:!!data.showcaseSaving, onClick: confirmEditableRestore }, 'Replace current sandbox')
            )
          )
        );
      }
      function closeShowcaseFiles() {
        cancelEditablePreview(); setShowcaseFilesOpen(false); setShowcaseFileNotice('');
      }
      function openShowcaseFiles() {
        var eng = window[ENGINE_KEY]; if (!eng || eng._showcaseExporting) return;
        cancelEditablePreview(); setShowcaseFileNotice(''); setShowcaseFilesOpen(true);
      }
      function chooseShowcaseFile() {
        var eng = window[ENGINE_KEY]; if (!eng || eng._showcaseExporting || editableBusy) return;
        if (editableInputRef.current) editableInputRef.current.click();
      }
      function fileIcon(kind) {
        var paths = { edit:'M5 3h10l4 4v14H5ZM14 3v5h5M9 12l-2 3 2 3M15 12l2 3-2 3', print:'M4 8l8-5 8 5v9l-8 5-8-5ZM4 8l8 5 8-5M12 13v9', open:'M3 7h7l2 3h9l-3 10H3ZM3 7V4h7l2 3h7v3' };
        return h('svg',{className:'gwe-file-icon',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:paths[kind]}));
      }
      function renderCurrentTools() {
        return h('section', {key:'gwe-current-tools',className:'gwe-current-tools','aria-label':'Current block choices'},
            h('h3', {className:'gwe-section-title'}, 'Building with'),
            h('div', { className: 'gwe-selection' },
              h('button', { type:'button',className:'gwe-selection-card gwe-choice-card','aria-label':'Change material. Current material: '+material.name,onClick:function(){resumeBuilding('material');} }, h('span', { className: 'gwe-selection-label' }, 'Material',h('span',{className:'gwe-choice-change','aria-hidden':'true'},'Change')), h('span', { className: 'gwe-selection-value' }, material.emoji + ' ' + material.name)),
              h('button', { type:'button',className:'gwe-selection-card gwe-choice-card','aria-label':'Change shape. Current shape: '+shape.name+'. Rotation: '+((Number(data.blockRotation)||0)*90)+' degrees',onClick:function(){resumeBuilding('shape');} }, h('span', { className: 'gwe-selection-label' }, 'Shape',h('span',{className:'gwe-choice-change','aria-hidden':'true'},'Change')), h('span', { className: 'gwe-selection-value' }, shape.emoji + ' ' + shape.name), h('span', {className:'gwe-tool-rotation'}, ((Number(data.blockRotation) || 0) * 90) + '\u00B0 rotation'))
            ),
            h('div', {className:'gwe-builder-actions gwe-match-actions'},
              h('button', {type:'button',className:'gwe-match-block','aria-label':'Match aimed block','aria-keyshortcuts':'I',title:'Aim at a block to reuse its material, shape, and rotation (I)',onClick:function(){var live=window[ENGINE_KEY];if(live && live.matchAimedBlock)live.matchAimedBlock();}},
                h('svg',{viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:'M14 5l5 5M12 7l5 5M3 21l4-1 12-12a3 3 0 0 0-4-4L3 16v5ZM3 16l5 5'})),
                h('span',null,'Match aimed block'),h('kbd',{'aria-hidden':'true'},'I'))
            ),
            h('p',{className:'gwe-match-note'},'Aim at a block to reuse its material, shape, and rotation.')
          );
      }
      var guide=activityGuideModel(engine && engine._currentLesson);
      var guideOpen=!!(guide && data.objectivesOpen && !homeOpen && !data.showGameSettings && !data.showcaseActive);
      var guideRef=React.useRef(null);
      var guideWasOpenRef=React.useRef(false);
      var journal=((data.lessonActivityProgress || {})[guide && guide.key]) || {};
      var activeActivity=guide && (guide.activities.find(function(a){return a.id===journal.selectedId;}) || guide.activities[0]);
      var trackedWaypoint=activityWaypointFor(guide,journal,engine && engine.npcs);
      if(engine)engine._activityWaypoint=trackedWaypoint;
      React.useEffect(function(){
        if(guideOpen){
          if(engine && engine.releaseInput)engine.releaseInput();
          try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
          if(guideRef.current)guideRef.current.focus();
        }else if(guideWasOpenRef.current && !homeOpen)focusWorldSurface(30);
        guideWasOpenRef.current=guideOpen;
      },[guideOpen,guide && guide.key]);
      function updateJournal(patch){
        var all=Object.assign({},data.lessonActivityProgress || {});
        all[guide.key]=Object.assign({},journal,patch);
        var keys=Object.keys(all);while(keys.length>30){var key=keys.shift();if(key!==guide.key)delete all[key];}
        patchGeometryState(ctx,{lessonActivityProgress:all});
      }
      function closeGuide(){patchGeometryState(ctx,{objectivesOpen:false});}
      function trackActivity(){
        if(!guide || !activeActivity || !activityWaypointFor(guide,{trackedId:activeActivity.id},engine && engine.npcs))return;
        updateJournal({trackedId:activeActivity.id});closeGuide();
        announce(ctx,'Tracking '+activeActivity.title+'. Follow the highlighted guide on the compass. Press L for directions.','success');
      }
      function stopTrackingActivity(){
        updateJournal({trackedId:null});
        announce(ctx,'Activity tracking stopped. Your notes and review marks are unchanged.','info');
        window.requestAnimationFrame(function(){var button=document.querySelector('.gwe-activity-track');if(button)button.focus();});
      }
      function browseActivity(offset){
        if(!guide || !activeActivity)return;
        var index=guide.activities.indexOf(activeActivity)+offset;
        if(index<0 || index>=guide.activities.length)return;
        updateJournal({selectedId:guide.activities[index].id});
        window.requestAnimationFrame(function(){var title=document.getElementById('gwe-active-activity-title');if(title)title.focus();});
      }
      var _activityNotice=React.useState(''),activityNotice=_activityNotice[0],setActivityNotice=_activityNotice[1];
      var activeEvidence=((journal.evidence || {})[activeActivity && activeActivity.id]) || {};
      var beforePreview=React.useMemo(function(){return activitySnapshotSvg(activeEvidence.before);},[activeEvidence.before]);
      var afterPreview=React.useMemo(function(){return activitySnapshotSvg(activeEvidence.after);},[activeEvidence.after]);
      React.useEffect(function(){setActivityNotice('');},[guide && guide.key,activeActivity && activeActivity.id,engine && engine._currentLesson]);
      function currentActivityEngine(){
        var live=window[ENGINE_KEY],liveGuide=activityGuideModel(live && live._currentLesson);
        return live===engine && liveGuide && guide && liveGuide.key===guide.key && data.worldActive && !homeOpen ? live : null;
      }
      function saveActivityEvidence(patch){
        if(!guide || !activeActivity || !currentActivityEngine())return false;
        var result=updateActivityEvidence(data.lessonActivityProgress,guide.key,activeActivity.id,patch);
        if(!result.ok){setActivityNotice(result.error);return false;}
        patchGeometryState(ctx,{lessonActivityProgress:result.value});return true;
      }
      function captureActivityStage(stage){
        var live=currentActivityEngine();if(!live)return;
        var capture=captureActivityBuild(live);
        if(!capture.ok){setActivityNotice(capture.error);return;}
        var patch={};patch[stage]=capture.snapshot;
        if(saveActivityEvidence(patch))setActivityNotice((stage==='before'?'Before':'After')+' snapshot saved: '+capture.snapshot.facts.blockCount+' selected blocks. No world blocks were changed.');
      }
      function checkActivityBuild(){
        var live=currentActivityEngine();if(!live)return;
        var capture=captureActivityBuild(live);
        if(!capture.ok){setActivityNotice(capture.error);return;}
        var result=evaluateActivityBuildGoal(activeActivity.buildGoal,capture.snapshot.blocks);
        if(result.status==='unavailable'){setActivityNotice(result.message);return;}
        result.checkedAt=capture.snapshot.capturedAt;
        if(saveActivityEvidence({check:result}))setActivityNotice(result.message);
      }
      function selectActivityBuild(){
        var live=currentActivityEngine();if(!live)return;
        var selected=aimedStudentMeasurement(ctx,false);
        if(!selected || selected.engine!==live){setActivityNotice('Return to the world and aim at your own activity build, then reopen Activities and select it. Protected teaching models are not checked.');return;}
        live._builderSelection={blocks:selected.measurement.blocks.slice()};
        patchGeometryState(ctx,{measureResult:selected.measurement});
        setActivityNotice('Selected '+selected.measurement.count+' student blocks. Checks and snapshots will use this outlined selection.');
      }
      function renderActivitySnapshot(stage,snapshot,preview){
        var title=stage==='before'?'Before':'After';
        return h('figure',{className:'gwe-journal-snapshot','data-snapshot-stage':stage},
          h('figcaption',null,h('strong',null,title),snapshot && h('span',null,snapshot.facts.blockCount+' blocks · '+snapshot.facts.occupiedVolume+' cubic units')),
          preview?h('img',{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(preview),alt:title+' saved activity build. '+snapshot.facts.width+' units wide, '+snapshot.facts.depth+' deep, '+snapshot.facts.height+' high.'}):h('p',{className:'gwe-journal-empty'},stage==='before'?'Save your first design.':'Revise it, then save the result.'),
          snapshot && h('p',{className:'gwe-activity-note'},'Saved '+new Date(snapshot.capturedAt).toLocaleString()),
          h('button',{type:'button',onClick:function(){captureActivityStage(stage);}},snapshot?'Replace '+title.toLowerCase()+' snapshot':'Save '+title.toLowerCase()+' snapshot'));
      }
      function renderActivityEvidence(){
        var goal=activeActivity.buildGoal,saved=activeEvidence.check;
        return h('section',{className:'gwe-activity-evidence','aria-labelledby':'gwe-activity-evidence-title'},
          h('h4',{id:'gwe-activity-evidence-title'},'Test, revise, and keep the evidence'),
          h('p',{className:'gwe-activity-note'},'Use your outlined selection for this activity. Ground, protected lesson models, and other creations are excluded. Re-select after building a separate version.'),
          h('div',{className:'gwe-journal-actions'},h('button',{type:'button',onClick:selectActivityBuild},'Select aimed build'),h('button',{type:'button',onClick:closeGuide},'Return to building')),
          goal ? h('div',{className:'gwe-activity-goal'},h('strong',null,'Numeric target'),h('p',null,activityGoalDescription(goal)),h('button',{type:'button',className:'gwe-activity-check-build',onClick:checkActivityBuild},'Check my build')) : h('p',{className:'gwe-activity-note'},activeActivity.buildGoalInvalid?'This activity’s numeric goal is unsupported. Review its written criteria; no automatic result will be recorded.':'An open-ended task: review the written design criteria and explain your choices.'),
          saved && h('div',{className:'gwe-journal-saved-check','data-build-check':saved.status},h('strong',null,'Saved numeric check'),h('p',null,saved.message),h('p',{className:'gwe-activity-note'},'Checked '+new Date(saved.checkedAt).toLocaleString()+'. Run Check my build after making changes. This does not change your question score.')),
          h('div',{className:'gwe-journal-snapshots'},renderActivitySnapshot('before',activeEvidence.before,beforePreview),renderActivitySnapshot('after',activeEvidence.after,afterPreview)),
          (activeEvidence.before || activeEvidence.after) && h('button',{type:'button',className:'gwe-journal-clear',onClick:function(){if(saveActivityEvidence({before:null,after:null}))setActivityNotice('This activity’s snapshots were cleared. Your reflection and saved numeric check are unchanged.');}},'Clear this activity’s snapshots'),
          activityNotice && h('p',{className:'gwe-journal-notice',role:'status','aria-live':'polite'},activityNotice),
          h('p',{className:'gwe-activity-note'},'Snapshots save the selected geometry locally. Up to 1,500 blocks per snapshot and 6,000 saved blocks across your journals. Download your portfolio to keep a separate copy.')
        );
      }
      function renderActivityGuide(){
        var activity=activeActivity,notes=journal.notes || {},reviewed=journal.reviewed || {},activityIndex=guide.activities.indexOf(activity);
        var count=guide.activities.filter(function(a){return reviewed[a.id];}).length;
        return h('div',{key:'gwe-activity-guide',className:'gwe-activity-backdrop'},h('section',{id:'gw-objective-panel',className:'gwe-activity-guide',ref:guideRef,role:'dialog','aria-modal':'true','aria-labelledby':'gwe-activity-title',tabIndex:-1,onKeyDown:function(event){trapDialogKeys(event,closeGuide);event.stopPropagation();}},
          h('header',null,h('div',null,h('p',{className:'gwe-activity-eyebrow'},'YOUR EXPLORATION JOURNAL'),h('h2',{id:'gwe-activity-title'},guide.title)),h('button',{type:'button','aria-label':'Close activity guide',onClick:closeGuide},'Close')),
          h('p',{className:'gwe-activity-intro'},'Explore, build, test your idea, and explain what you discovered. Your notes and review marks stay with this lesson in AlloFlow.'),
          h('details',{className:'gwe-activity-route'},h('summary',null,'See the lesson route'),renderLessonMap(h,lessonOverviewModel(engine && engine._currentLesson),trackedWaypoint?trackedWaypoint.index:null)),
          trackedWaypoint && h('div',{className:'gwe-activity-tracking-state',role:'status'},h('div',null,h('strong',null,'Tracking activity '+(trackedWaypoint.index+1)),h('span',null,trackedWaypoint.title)),h('button',{type:'button','aria-label':'Stop tracking activity',onClick:stopTrackingActivity},'Stop tracking')),
          h('label',{htmlFor:'gwe-activity-select'},'Choose an activity'),
          h('select',{id:'gwe-activity-select',value:activity.id,onChange:function(event){updateJournal({selectedId:event.target.value});}},guide.activities.map(function(a,i){return h('option',{key:a.id,value:a.id},(i+1)+'. '+a.title+(reviewed[a.id]?' · reviewed':''));})),
          h('div',{className:'gwe-activity-progress',role:'status'},count+' of '+guide.activities.length+' activities reviewed'),
          h('article',{key:activity.id,className:'gwe-activity-card'},h('p',{className:'gwe-activity-position'},'ACTIVITY '+(activityIndex+1)+' OF '+guide.activities.length),h('h3',{id:'gwe-active-activity-title',tabIndex:-1},activity.title),h('p',null,activity.challenge),
            activity.npcName && h('p',{className:'gwe-activity-guide-name'},'Your guide: '+activity.npcName),
            h('button',{type:'button',className:'gwe-activity-track','aria-label':'Track this activity','aria-pressed':!!(trackedWaypoint&&trackedWaypoint.id===activity.id),disabled:!!(trackedWaypoint&&trackedWaypoint.id===activity.id)||!activityWaypointFor(guide,{trackedId:activity.id},engine&&engine.npcs),onClick:trackActivity},trackedWaypoint&&trackedWaypoint.id===activity.id?'Tracking this activity':'Track this activity'),
            h('button',{type:'button',className:'gwe-activity-travel',disabled:!activity.position&&!activity.npcName,onClick:function(){if(travelToActivity(engine,activity)){closeGuide();announce(ctx,'Moved to '+activity.title+'. Your structures and history are unchanged.','success');}else announce(ctx,'A clear arrival point is not available. Use the scene map to find your guide.','info');}},'Go to this activity'),
            h('p',{className:'gwe-activity-track-help'},'Tracking highlights your guide while you explore. Go to this activity moves you there. Press L in the world for spoken directions.'),
            activity.hint && h('details',null,h('summary',null,'Show a hint'),h('p',null,activity.hint)),
            activity.successCriteria && h('div',{className:'gwe-activity-check'},h('h4',null,'Check your work'),h('p',null,activity.successCriteria)),
            renderActivityEvidence(),
            h('label',{htmlFor:'gwe-activity-note'},activity.reflection || 'What did you discover? Explain your reasoning.'),
            h('textarea',{id:'gwe-activity-note',rows:3,maxLength:2000,value:notes[activity.id] || '',placeholder:'Record a measurement, explain a revision, or describe your result.',onChange:function(event){var next=Object.assign({},notes);next[activity.id]=event.target.value;updateJournal({notes:next});}}),
            h('label',{className:'gwe-activity-review'},h('input',{type:'checkbox',checked:!!reviewed[activity.id],onChange:function(event){var next=Object.assign({},reviewed);next[activity.id]=event.target.checked;updateJournal({reviewed:next});}}),'I have reviewed my work'),
            h('p',{className:'gwe-activity-note'},'This is your self-check. It does not change your question score.'),
            h('div',{className:'gwe-milestone-note',role:'status'},h('strong',null,'Bring this stop to life'),h('p',null,'Meeting a numeric target or recording your self-review turns this activity’s marker green and gold in the world. Each marker records progress; it does not grade your design.'),h('span',null,milestones.filter(function(m){return m.lit;}).length+' of '+milestones.length+' activity markers lit'),activityIndex<guide.activities.length-1 && h('p',null,'Next connection: take one measurement or design decision from this activity into '+guide.activities[activityIndex+1].title+'.'))
          ),
          h('nav',{className:'gwe-activity-pager','aria-label':'Activity navigation'},
            h('button',{type:'button','aria-label':'Previous activity',disabled:activityIndex===0,onClick:function(){browseActivity(-1);}},'← Previous'),
            h('span',{role:'status','aria-live':'polite'},(activityIndex+1)+' / '+guide.activities.length),
            h('button',{type:'button','aria-label':'Next activity',disabled:activityIndex===guide.activities.length-1,onClick:function(){browseActivity(1);}},'Next →')),
          h('footer',null,h('button',{type:'button',onClick:function(){downloadBlob(new Blob([JSON.stringify(activityJournalExport(guide,journal),null,2)],{type:'application/json'}),'geometry-world-learning-journal.json');}},'Download journal'),h('button',{type:'button',onClick:function(){downloadBlob(new Blob([activityPortfolioHtml(guide,journal)],{type:'text/html;charset=utf-8'}),'geometry-world-learning-portfolio.html');}},'Download portfolio'),h('button',{type:'button',onClick:closeGuide},'Back to exploring'))
        ));
      }

      React.useEffect(function(){
        var live=window[ENGINE_KEY];if(!live || typeof live.loadLesson!=='function')return undefined;
        return installWorldAutosave(live,savedDraft);
      },[engine]);
      React.useEffect(function(){if(pointerMode==='transform' && !hasRetainedSelection){setPointerMode('select');cancelSelectionPreview();}},[pointerMode,hasRetainedSelection]);
      var transformSelectionKey=pointerMode==='transform' && engine && engine._builderSelection?(engine._builderSelection.exact?'exact:':'connected:')+engine._builderSelection.blocks.map(keyFor).sort().join(';'):'';
      React.useEffect(function(){
        if(pointerMode==='build' || previewReview || !isSandbox || !data.worldActive || homeOpen || guideOpen || data.showcaseActive || data.showSandboxLauncher)return undefined;
        var live=window[ENGINE_KEY],canvas=live && live.renderer && live.renderer.domElement;
        if(pointerMode==='transform')return live && canvas?installWorkshopTransform(live,canvas,function(result,offset){setSelectionEditPreview(result);setSelectionEditNotice(result?(result.ok?(offset?'Move '+['X','Y','Z'].map(function(a){return a+' '+offset[a.toLowerCase()];}).join(' · '):'Rotate 90°')+'. Review the outline, then apply.':result.reason):'');},function(){setPointerMode('build');}):undefined;
        return live && canvas?installWorkshopPointer(live,canvas,pointerMode,selectionOperation,function(result){cancelSelectionPreview();setSelectionEditNotice(result.ok?result.count+' blocks selected.':result.reason);var selected=selectionMeasurement(live);patchGeometryState(liveBuilderCtx.current,{measureResult:selected?selected.measurement:null});},function(){setPointerMode('build');},selectionDepth):undefined;
      },[engine,pointerMode,previewReview,selectionOperation,selectionDepth,transformSelectionKey,isSandbox,data.worldActive,homeOpen,guideOpen,data.showcaseActive,data.showSandboxLauncher]);
      React.useEffect(function(){if(!isSandbox || homeOpen || data.showcaseActive || (data.drawMode && data.drawMode!=='single'))setPointerMode('build');},[isSandbox,homeOpen,data.showcaseActive,data.drawMode]);
      var milestones=activityMilestones(guide,journal,engine && engine.npcs),milestoneSignature=JSON.stringify(milestones);
      React.useEffect(function(){var group=createActivityMilestones(engine,milestones);return function(){disposeActivityMilestones(group);};},[engine,engine && engine._currentLesson,milestoneSignature]);
      function renderDrawingTools() {
        var mode=data.drawMode || 'single',preview=data.drawPreview || {};
        return h('section',{className:'gwe-drawing-tools','aria-label':'Fast building'},
          h('h3',{className:'gwe-section-title'},'Build faster'),
          h('div',{className:'gwe-draw-modes',role:'group','aria-label':'Drawing tool'},
            [['single','Block'],['line','Line'],['floor','Floor'],['wall','Wall']].map(function(item){return h('button',{key:item[0],type:'button','aria-pressed':mode===item[0],onClick:function(){setPointerMode('build');if(engine && engine.setDrawMode)engine.setDrawMode(item[0]);}},item[1]);})),
          mode==='wall' && h('label',{className:'gwe-draw-height'},'Wall height',h('input',{type:'number',min:1,max:32,step:1,value:data.drawWallHeight || 3,'aria-label':'Wall height in blocks',onChange:function(event){if(engine && engine.setDrawHeight)engine.setDrawHeight(Number(event.target.value));}}),h('span',null,'blocks')),
          mode!=='single' && h('p',{className:'gwe-builder-note'},'Drag on the world to preview, then Place. Or aim and press B / tap Place to choose each endpoint. Escape cancels.'),
          mode!=='single' && h('button',{type:'button',className:'gwe-draw-resume',onClick:function(){resumeBuilding();}},'Open drawing view')
        );
      }
      var drawingCss='.gwe-drawing-tools{padding:12px 0;border-top:1px solid rgba(56,85,70,.14)}.gwe-draw-modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.gwe-draw-modes button{min-height:44px;padding:6px 3px!important}.gwe-draw-modes button[aria-pressed="true"]{background:#315f4c!important;color:#fff!important;border-color:#315f4c!important}.gwe-draw-height{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:9px}.gwe-draw-height input{min-width:0;width:62px;min-height:44px;border:1px solid #8fa799;border-radius:9px;background:#fffdf5;color:#29473a;padding:5px}.gwe-draw-resume{width:100%;min-height:44px}.gwe-draw-hud{position:absolute;z-index:34;top:108px;left:50%;transform:translateX(-50%);width:350px;max-width:calc(100% - 28px);padding:10px 12px;border:1px solid #acbeaf;border-radius:14px;background:rgba(249,246,233,.97);color:#29473a;box-shadow:0 8px 28px rgba(24,48,39,.14);font-size:12px;pointer-events:auto}.gwe-draw-caption{display:flex;flex-direction:column;gap:3px}.gwe-draw-caption strong{font-size:13px}.gwe-draw-hud-actions{display:flex;gap:6px;margin-top:8px}.gwe-draw-hud-actions button{flex:1;min-width:0;min-height:44px;border:1px solid #94ad9d;border-radius:9px;background:#eef3e8;color:#29473a;font-weight:700;cursor:pointer}.gwe-draw-hud-actions button:first-child{background:#315f4c;color:#fff}.gwe-draw-hud-actions button:disabled{opacity:.55;cursor:default}.gwe-draw-hud button:focus-visible,.gwe-drawing-tools button:focus-visible,.gwe-draw-height input:focus-visible{outline:3px solid #2f765b;outline-offset:3px}@media(max-width:800px){.gwe-draw-hud{top:128px;width:300px;padding:8px 10px}}@media(max-width:800px) and (min-height:520px) and (orientation:portrait){#geoworld-fs-workspace:has(>.gw-coordinate-hud[open]) .gwe-draw-hud{top:calc(50% - 108px)}#geoworld-fs-workspace.gw-root[data-geometry-mode="sandbox"][data-touch-active="true"]>.gw-coordinate-hud{top:68px!important;bottom:auto!important;box-sizing:border-box;max-width:min(146px,calc(100% - 174px));max-height:calc(50% - 188px);overflow:auto;overscroll-behavior:contain}#geoworld-fs-workspace.gw-root[data-geometry-mode="sandbox"][data-touch-active="true"]>.gw-coordinate-hud>summary{min-height:44px!important;margin-bottom:0!important}#geoworld-fs-workspace[data-touch-active="true"]:has(.gwe-draw-hud) .gw-touch-look-panel{top:68px!important}}@media(max-width:800px) and (max-height:520px) and (orientation:landscape){#geoworld-fs-workspace[data-touch-active="false"] .gwe-draw-hud{top:68px;left:auto;right:12px;transform:none;width:min(300px,calc(100% - 232px))}}';
      var additions = [h('style',{key:'gwe-tool-review-css'},".gwe-tool-finder-bar{flex:none;padding:9px 14px;border-bottom:1px solid #ffffff16}.gwe-tool-finder-toggle{display:flex;align-items:center;gap:9px;width:100%;min-height:44px;padding:9px 12px;border:1px solid #628474;border-radius:10px;background:#ffffff09;color:inherit;font:600 13px system-ui;cursor:pointer}.gwe-tool-finder-toggle>span{margin-left:auto;font-size:18px}.gwe-tool-finder{display:flex;flex:1;flex-direction:column;min-height:0;padding:14px;gap:9px;color:inherit;overflow:hidden}.gwe-tool-finder form{display:grid;gap:8px;flex:none}.gwe-tool-finder label{font-size:13px;font-weight:600}.gwe-tool-finder input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:10px 12px;border:1px solid #a1b68e;border-radius:10px;background:#fffdf3;color:#254637;font:14px system-ui}.gwe-tool-count{flex:none;font-size:11px;line-height:1.45;margin:0;opacity:.85}.gwe-tool-results{display:flex;flex-direction:column;min-height:0;overflow:auto;gap:8px;overscroll-behavior:contain;padding:3px}.gwe-tool-result{position:relative;display:flex;flex-direction:column;gap:5px;width:100%;text-align:left;padding:12px 30px 12px 12px;border:1px solid #6a8878;border-radius:12px;background:linear-gradient(135deg,#ffffff0d,#ffffff03);color:inherit;font:12px system-ui;line-height:1.45;cursor:pointer;flex:none}.gwe-tool-result strong{font-size:14px}.gwe-tool-group{text-transform:uppercase;letter-spacing:.1em;font-size:9px;font-weight:700;color:#cae1b9}.gwe-tool-arrow{position:absolute;right:12px;top:12px;font-size:18px;color:#d5c495}.gwe-tool-result:hover:not(:disabled){background:#d5e9c51c;border-color:#d0dfb5}.gwe-tool-result:disabled{opacity:.52;cursor:default}.gwe-finder-select{flex:none;min-height:44px;border:1px solid #89a68d;border-radius:9px;background:#e0ebcf;color:#274c3b;font:600 12px system-ui}.gwe-builder-body[hidden]{display:none!important}.gwe-preview-facts{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:12px;line-height:1.6;margin:9px 0}.gwe-preview-facts strong{font-size:14px}.gwe-preview-facts small{width:100%;font-size:11px;opacity:.85}.gwe-preview-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}.gwe-preview-buttons button{min-width:0;min-height:44px;padding:8px 7px!important;border:1px solid #6d8c78;border-radius:9px;background:#f5f5e9;color:#234a38;font:600 12px system-ui;cursor:pointer}.gwe-preview-buttons button:last-child{grid-column:1/-1;background:transparent;color:inherit;min-height:44px;border-color:transparent;text-decoration:underline;text-underline-offset:3px}.gwe-preview-buttons button:disabled{opacity:.5;cursor:default}.gwe-preview-footer{width:100%}.gwe-preview-footer-heading{display:flex;justify-content:space-between;gap:8px;margin-bottom:9px;font-size:12px}.gwe-preview-footer-heading span{font-size:11px;font-variant-numeric:tabular-nums}.gwe-preview-review{position:absolute;z-index:42;top:128px;left:16px;width:300px;max-width:calc(100% - 32px);box-sizing:border-box;padding:15px;border:1px solid #adcba1;border-radius:16px;background:#153a30fa;color:#f0f2df;box-shadow:0 10px 30px #09281d33}.gwe-preview-review[data-ready=false]{border-color:#dd9a7a}.gwe-preview-eyebrow{font-size:9px;font-weight:700;letter-spacing:.12em;color:#d5d4ad}.gwe-preview-review h3{font-weight:700;font-size:17px;line-height:1.35;margin:7px 0}.gwe-preview-review p{font-size:12px;line-height:1.5;margin:9px 0}.gwe-enhanced[data-preview-review=true] :is(.gw-placement-hint,.gw-touch-controls,.gw-shape-tray,.gw-hotbar,.gw-action-bar,.gw-crosshair,.gw-coordinate-hud){display:none!important}.gwe-preview-camera-tools{margin-top:8px;border-top:1px solid #c6d6b733}.gwe-preview-camera-tools summary{min-height:44px;align-content:center;cursor:pointer;font-size:12px;font-weight:600}.gwe-preview-gesture-hint{display:block;font-size:11px;line-height:1.5;color:#d5e3cb;margin-bottom:8px}.gwe-preview-view-buttons,.gwe-preview-zoom-buttons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:7px}.gwe-preview-zoom-buttons{grid-template-columns:repeat(3,minmax(0,1fr))}.gwe-preview-camera-tools button{min-width:0;min-height:44px;border:1px solid #8baa8b;border-radius:9px;background:#ffffff08;color:inherit;font:600 11px system-ui;cursor:pointer}.gwe-preview-camera-tools button[aria-pressed=true]{background:#d5e7be;color:#284c37}.gwe-preview-camera-tools :focus-visible{outline:3px solid #e3ba66;outline-offset:2px}.gwe-preview-surroundings{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;font-size:11px;margin-top:4px;cursor:pointer}.gwe-preview-surroundings input{width:17px;height:17px;accent-color:#8dbb92}.gwe-preview-escape{display:block;text-align:center;font-size:10px;opacity:.7;margin-top:7px}.gwe-preview-review .gwe-primary{background:#d5e7be;color:#284c37}.gwe-tool-finder-toggle:focus-visible,.gwe-tool-finder :focus-visible,.gwe-preview-buttons button:focus-visible,.gwe-preview-review:focus-visible{outline:3px solid #e3ba66;outline-offset:2px}.theme-contrast .gwe-tool-finder,.theme-contrast .gwe-preview-review,[data-stem-theme=contrast] .gwe-tool-finder,[data-stem-theme=contrast] .gwe-preview-review{background:#000;color:#fff;border-color:#fff}@media(max-width:380px){.gwe-tool-finder{padding:10px}.gwe-tool-finder-bar{padding:7px 12px}.gwe-preview-review{top:118px;left:12px;max-width:calc(100% - 24px);padding:12px}}@media(max-height:520px){.gwe-builder-dock[data-collapsed=false]{position:fixed;top:8px;bottom:8px;right:12px;height:auto;max-height:calc(100dvh - 16px)}.gwe-builder-dock[data-collapsed=false] .gwe-builder-head{padding:8px 12px;min-height:0}.gwe-builder-dock[data-collapsed=false] .gwe-workflow,.gwe-builder-dock[data-collapsed=false] .gwe-builder-quick-actions{display:none}.gwe-builder-dock[data-finder=true] .gwe-builder-head,.gwe-builder-dock[data-finder=true] .gwe-builder-footer{display:none}.gwe-preview-review{top:70px;left:12px;max-height:calc(100dvh - 82px);overflow:auto}}@media(max-width:520px){.gwe-preview-review h3{font-size:15px;margin:4px 0}.gwe-preview-review .gwe-preview-facts{gap:3px 10px;margin:6px 0;font-size:11px}.gwe-preview-review .gwe-preview-facts strong{font-size:12px}.gwe-preview-review .gwe-preview-buttons{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.gwe-preview-review .gwe-preview-buttons button{font-size:11px}.gwe-preview-review .gwe-preview-buttons button:last-child{grid-column:auto;border-color:#6d8c78;text-decoration:none}.gwe-preview-review[data-ready=true] p,.gwe-preview-review .gwe-preview-facts small,.gwe-preview-review .gwe-preview-escape{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;margin:0;padding:0;border:0}.gwe-preview-review .gwe-preview-surroundings{margin-top:3px}}"),h('style',{key:'gwe-variations-css'},".gwe-base-settings{min-width:0;margin:12px 0;padding:12px;border:1px solid #769482;border-radius:12px;background:#ffffff08}.gwe-base-settings legend{padding:0 6px;font-size:13px;font-weight:700}.gwe-base-dimensions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.gwe-base-settings label{display:flex;flex-direction:column;gap:5px;font-size:12px;margin-bottom:9px}.gwe-base-settings input,.gwe-base-settings select{min-width:0;width:100%;box-sizing:border-box;min-height:44px;border:1px solid #8fa799;border-radius:8px;background:#fffdf5;color:#29473a;padding:8px;font:inherit}.gwe-base-settings small{font-size:11px}.gwe-base-settings p{margin-bottom:0}.gwe-print-piece-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gwe-print-piece-grid button{display:flex;align-items:center;gap:8px;min-height:64px;text-align:left;padding:9px!important;min-width:0}.gwe-print-piece-grid strong,.gwe-print-piece-grid small{display:block;overflow-wrap:anywhere}.gwe-print-piece-grid small{font-size:11px;font-weight:400;margin-top:4px}.gwe-piece-index{font-size:20px;opacity:.65;font-variant-numeric:tabular-nums}.gwe-print-piece-grid button[aria-pressed=true]{box-shadow:inset 0 0 0 2px #cbae70}.gwe-piece-pages{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:10px 0}.gwe-piece-pages span{font-size:12px}.gwe-overflow-inspect{width:100%;min-height:44px;border-color:#c88469!important}.gwe-print-focus-hud{position:absolute;z-index:40;top:128px;left:16px;width:280px;max-width:calc(100% - 32px);box-sizing:border-box;padding:12px 14px;border:1px solid #d9bd80;border-radius:14px;background:#183d32f5;color:#fff5d6;box-shadow:0 7px 22px #09271d33}.gwe-print-focus-hud strong{font-size:14px}.gwe-print-focus-hud p{font-size:12px;line-height:1.5;margin:5px 0 9px}.gwe-print-focus-hud>div{display:flex;flex-wrap:wrap;gap:8px}.gwe-print-focus-hud button{font:600 12px system-ui;min-height:44px;padding:8px 10px;border:1px solid #d5c79d;border-radius:9px;background:#f9f5e6;color:#264a39;cursor:pointer}.gwe-print-focus-hud button:focus-visible,.gwe-base-settings :focus-visible,.gwe-print-pieces button:focus-visible,.gwe-save-variation:focus-visible{outline:3px solid #d6a33b;outline-offset:3px}.gwe-project-grid{align-items:start}.gwe-project-pick>.gwe-project-current{align-self:flex-start;margin:7px 12px 0;padding:3px 8px;border:1px solid #b8c9a7;border-radius:20px;background:#e8efdc;color:#355a3f;font-size:11px}.gwe-save-variation{width:100%;min-height:44px}.theme-contrast .gwe-print-focus-hud,[data-stem-theme=contrast] .gwe-print-focus-hud{background:#000;color:#fff;border-color:#fff}@media(max-width:380px){.gwe-print-piece-grid{grid-template-columns:1fr}.gwe-print-focus-hud{top:118px;left:12px;max-width:calc(100% - 24px)}}"),h('style',{key:'gwe-design-css'},".gwe-starter-custom{padding:12px;margin:10px 0;border:1px solid #6f8d7c;border-radius:14px;background:#ffffff08}.gwe-starter-custom h4{font-size:15px;margin:0 0 10px}.gwe-configured-preview{width:100%;height:146px;object-fit:contain;background:linear-gradient(150deg,#eff2e4,#dbe5d3);border-radius:10px}.gwe-starter-dimensions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.gwe-starter-dimensions label{display:flex;flex-direction:column;gap:5px;font-size:12px}.gwe-starter-dimensions input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;border:1px solid #8fa799;border-radius:8px;padding:6px;background:#fffdf5;color:#29473a;font:inherit}.gwe-starter-custom select{width:100%;min-height:44px}.gwe-transform-handles{position:fixed;inset:0;z-index:36;pointer-events:none}.gwe-transform-handles[hidden]{display:none}.gwe-transform-handles svg{position:absolute;inset:0;overflow:visible}.gwe-transform-handles line{stroke-width:3;stroke:#f5d7a6;filter:drop-shadow(0 1px 2px #102c29)}.gwe-transform-handles line[data-axis=x]{stroke:#f4ad95}.gwe-transform-handles line[data-axis=y]{stroke:#b7e6b6}.gwe-transform-handles line[data-axis=z]{stroke:#a7d9ef}.gwe-transform-handles button{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;min-width:46px;min-height:46px;border:2px solid #fff3d3;border-radius:50%;background:#254438;color:#fff8e7;font:700 13px system-ui;box-shadow:0 3px 12px #102a2955;cursor:grab}.gwe-transform-handles button[data-axis=x]{background:#854536}.gwe-transform-handles button[data-axis=y]{background:#315e3b}.gwe-transform-handles button[data-axis=z]{background:#285a76}.gwe-transform-handles button:active{cursor:grabbing}.gwe-transform-handles button:focus-visible{outline:3px solid #ffd46b;outline-offset:4px}.gwe-transform-handles .gwe-transform-rotate{border-radius:24px;padding:0 10px;background:#514965;cursor:pointer}.gwe-direct-controls .gwe-pointer-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.gwe-pointer-hud>span{max-width:460px}.theme-contrast .gwe-transform-handles button{background:#000;color:#fff;border-color:#ffdf00}.theme-contrast .gwe-starter-custom{background:#000;border-color:#fff}.theme-contrast .gwe-starter-dimensions input{background:#000;color:#fff;border-color:#fff}\n"),h('style',{key:'gwe-drawing-css'},drawingCss),h('style',{key:'gwe-workshop-css'},".gwe-world-shelf{margin:26px 0;padding:22px;border:1px solid #bbc8b1;border-radius:20px;background:#f2f3e9;color:#254638}.gwe-shelf-heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.gwe-shelf-heading h2{margin:0;font-size:24px}.gwe-shelf-heading span,.gwe-world-shelf p{font-size:13px;line-height:1.6}.gwe-project-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.gwe-project-card{min-width:0;border:1px solid #b8c9b4;border-radius:14px;overflow:hidden;background:#fffef6}.gwe-project-pick{font:inherit;display:flex;flex-direction:column;width:100%;min-width:0;padding:0 0 12px;border:0;border-radius:0;background:transparent;color:#244c3b;text-align:left;cursor:pointer}.gwe-project-pick img,.gwe-project-empty-art{display:block;width:100%;height:130px;object-fit:contain;background:#e4ecda;margin-bottom:12px}.gwe-project-empty-art{font-size:74px;text-align:center}.gwe-project-pick strong,.gwe-project-pick>span{padding:0 12px;overflow-wrap:anywhere}.gwe-project-pick strong{font-size:15px}.gwe-project-pick>span{font-size:12px;line-height:1.6}.gwe-project-pick[aria-pressed=true]{box-shadow:inset 0 0 0 3px #487457}.gwe-project-actions{display:grid;gap:8px;padding:12px;border-top:1px solid #c0cdb5}.gwe-project-actions button,.gwe-project-save button,.gwe-pointer-hud button{min-height:44px;padding:8px 12px;border:1px solid #819b83;border-radius:9px;background:#fffdf2;color:#264a39;font:600 13px system-ui;cursor:pointer}.gwe-project-status{font-size:12px;line-height:1.5;overflow-wrap:anywhere}.gwe-project-save{display:grid;gap:7px;margin:12px 0}.gwe-project-save input{width:100%;min-width:0;box-sizing:border-box;min-height:44px;border:1px solid #91a58c;border-radius:9px;padding:8px;background:#fffef6;color:#264a39}.gwe-starter-categories,.gwe-pointer-modes{display:flex;flex-wrap:wrap;gap:6px}.gwe-starter-categories button,.gwe-pointer-modes button{flex:1;min-height:44px}.gwe-starter-categories button[aria-pressed=true],.gwe-pointer-modes button[aria-pressed=true]{background:#315f4c!important;color:#fffef1!important}.gwe-nudge-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:12px}.gwe-nudge-controls button{min-height:44px}.gwe-selection-marquee{position:fixed;z-index:9999;pointer-events:none;border:2px solid #f6d371;background:#62b4a02e;box-shadow:0 0 0 1px #183e34}.gwe-pointer-hud{position:absolute;z-index:39;left:50%;bottom:170px;transform:translateX(-50%);display:flex;align-items:center;flex-wrap:wrap;gap:8px;max-width:calc(100% - 28px);padding:10px 14px;border:1px solid #a5b995;border-radius:14px;background:#f8f9ecf5;color:#214637;box-shadow:0 5px 20px #173d3420;font-size:12px}.gwe-pointer-hud span{flex:1;min-width:120px}.gwe-pointer-zoom{display:flex;gap:4px;flex-wrap:wrap}.gwe-milestone-note{background:#e6eedc;border:1px solid #a8bd9b;padding:14px;border-radius:12px;margin-top:15px;color:#254836}.gwe-world-shelf button:focus-visible,.gwe-direct-controls button:focus-visible,.gwe-starter-library button:focus-visible,.gwe-pointer-hud button:focus-visible{outline:3px solid #cf9c2c;outline-offset:3px}.gwe-project-actions button:disabled{opacity:.5;cursor:default}@media(max-width:700px){.gwe-project-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gwe-world-shelf{padding:14px}.gwe-pointer-hud{left:14px;right:14px;transform:none;max-width:none;bottom:220px}.gwe-project-pick img{height:110px}}@media(max-width:380px){.gwe-project-grid{grid-template-columns:1fr}.gwe-shelf-heading{align-items:flex-start;flex-direction:column}.gwe-pointer-hud{font-size:11px}}.theme-contrast .gwe-world-shelf,.theme-contrast .gwe-project-card,.theme-contrast .gwe-pointer-hud,.theme-contrast .gwe-milestone-note,[data-stem-theme=contrast] .gwe-world-shelf,[data-stem-theme=contrast] .gwe-project-card,[data-stem-theme=contrast] .gwe-pointer-hud,[data-stem-theme=contrast] .gwe-milestone-note{background:#111;color:#fff;border-color:#fff}.theme-contrast .gwe-project-pick,[data-stem-theme=contrast] .gwe-project-pick{color:#fff}.theme-contrast .gwe-project-status,[data-stem-theme=contrast] .gwe-project-status{color:#fff}\n")];
      // Back to tools already lives in the review card; reclaim the phone canvas.
      if(previewReview)additions.push(h('style',{key:'gwe-preview-phone-space'},'@media(max-width:600px){#geoworld-fs-workspace .gwe-builder-dock{display:none!important}}'));
      if(isSandbox && data.worldActive && previewReview && collapsed && selectionEditPreview && !homeOpen && !data.showcaseActive)additions.push(h('section',{key:'gwe-preview-review',className:'gwe-preview-review',tabIndex:-1,'data-ready':selectionEditPreview.ok?'true':'false','aria-label':'Review proposed building change'},h('span',{className:'gwe-preview-eyebrow'},selectionEditPreview.ok?'PREVIEW · NOT YET APPLIED':'PREVIEW · NEEDS ADJUSTMENT'),h('h3',null,selectionEditPreview.label || 'Proposed change'),renderPreviewFacts(),h('p',{role:'status'},selectionEditPreview.ok?'Inspect the materials and shape, then apply. One Undo restores your previous build.':selectionEditNotice),renderPreviewButtons(true),renderPreviewCameraControls(),h('label',{className:'gwe-preview-surroundings'},h('input',{type:'checkbox',checked:previewSurroundings,onChange:function(event){setPreviewSurroundings(event.target.checked);}}),'Show surroundings'),h('small',{className:'gwe-preview-escape'},'Esc cancels this preview.')));
      if(isSandbox && data.worldActive && data.builderPrintGuide && data.builderPrintFocus && !homeOpen && !data.showcaseActive)additions.push(h('section',{key:'gwe-print-focus',className:'gwe-print-focus-hud','aria-label':'Highlighted print region'},h('strong',null,data.builderPrintFocus.label+' · '+data.builderPrintFocus.blocks+' blocks'),h('p',null,'Gold corners mark this region. Your full selection is still included in exports.'),h('div',null,h('button',{type:'button',className:'gwe-print-focus-return',onClick:function(){if(engine && engine.setViewPreset)engine.setViewPreset('free');patchGeometryState(ctx,{builderPrintFocus:null,sandboxDockCollapsed:false});focusPrintCameraControl(engine,'.gwe-print-guide-options > summary');}},'Return camera'),h('button',{type:'button',onClick:function(){patchGeometryState(ctx,{builderPrintFocus:null,sandboxDockCollapsed:false});focusPrintCameraControl(engine,'.gwe-print-guide-options > summary');}},'Clear highlight'))));
      if(isSandbox && data.worldActive && pointerMode!=='build' && !previewReview && !homeOpen && !data.showcaseActive)additions.push(h('section',{key:'gwe-pointer-hud',className:'gwe-pointer-hud','aria-label':'Canvas controls'},h('strong',null,pointerMode==='select'?'Select blocks':pointerMode==='transform'?'Move & rotate':'Orbit camera'),h('span',null,pointerMode==='select'?'Click or drag · '+selectionOperation+' · '+(selectionDepth==='visible'?'visible centers':'through depth'):pointerMode==='transform'?(selectionEditNotice || 'Drag an axis · Review · Apply'):'Drag to orbit · Shift-drag to pan'),pointerMode==='transform' && !selectionEditPreview && h('button',{type:'button',onClick:function(){focusSelectedBuild(ctx);}},'Frame selection'),pointerMode==='transform' && selectionEditPreview && h('div',{className:'gwe-pointer-zoom'},h('button',{type:'button',disabled:!selectionEditPreview.ok,onClick:applyCreationChange},'Apply move or rotation'),h('button',{type:'button',onClick:cancelSelectionPreview},'Cancel move or rotation')),pointerMode==='orbit' && h('div',{className:'gwe-pointer-zoom'},[['Closer',-.2],['Farther',.2],['Pan left',-.8],['Pan right',.8]].map(function(a){return h('button',{type:'button',key:a[0],onClick:function(){var actions=engine._workshopCameraActions;if(actions){if(a[0].indexOf('Pan')===0)actions.pan(a[1],0);else actions.zoom(Math.exp(a[1]));}}},a[0]);})),h('button',{type:'button',onClick:function(){setPointerMode('build');focusWorldSurface(0);}},'Done · Esc')));

      if(isSandbox && data.worldActive && !homeOpen && !guideOpen && engine && !engine._showcase && data.drawMode && data.drawMode!=='single' && engine.isDrawingAllowed && engine.isDrawingAllowed()) {
        var drawInfo=data.drawPreview || {},drawStarted=!!drawInfo.started;
        additions.push(h('section',{key:'gwe-draw-hud',className:'gwe-draw-hud','data-ok':drawInfo.ok?'true':'false','aria-label':'Drawing preview'},
          h('div',{className:'gwe-draw-caption'},h('strong',null,data.drawMode.charAt(0).toUpperCase()+data.drawMode.slice(1)+' tool'),h('span',{role:'status','aria-live':'polite','aria-atomic':'true'},drawInfo.reason || 'Aim at a block face and set the start point.')),
          h('div',{className:'gwe-draw-hud-actions'},
            h('button',{type:'button',disabled:drawStarted && !drawInfo.ok,onClick:function(){if(engine.drawAtCrosshair)engine.drawAtCrosshair();focusWorldSurface(0);}},drawStarted?'Place '+(drawInfo.count || 0)+' blocks':'Set start'),
            h('button',{type:'button',onClick:function(){if(drawStarted)engine.cancelDrawing();else engine.setDrawMode('single');focusWorldSurface(0);}},drawStarted?'Cancel':'Block tool'))));
      }
      if(guideOpen)additions.push(renderActivityGuide());
      if(engine)engine.closeGeometryHome=closeHome;
      if(homeOpen)additions.push(renderHome());
      if(data.toolbarCollapsed && base.props['data-fullscreen']!=='true' && !homeOpen)additions.push(h('button',{key:'gwe-home-shortcut',type:'button',className:'gwe-home-shortcut','aria-label':'Geometry World home','aria-haspopup':'dialog',onClick:function(){if(engine && engine.openGeometryHome)engine.openGeometryHome();}},'World home'));
      if ((isSandbox && data.worldActive) || homeOpen) additions.push(h('input', {key:'gwe-editable-file',ref:editableInputRef,type:'file',accept:'.json,application/json',onChange:chooseEditableWorld,style:{display:'none'},tabIndex:-1,'aria-hidden':'true'}));
      if (!isSandbox && !launcherOpen && !homeOpen) additions.push(h('button', {
        key: 'gwe-launch', type: 'button', className: 'gwe-free-build-launch', onClick: openLauncher,
        'aria-haspopup': 'dialog', 'aria-controls': 'gwe-sandbox-launcher', 'aria-expanded': 'false', 'data-gwe-focus-return': 'lesson-launcher'
      }, h('span', { 'aria-hidden': 'true' }, '\u2728'), h('span', null, 'Open Free Build', h('small', { style: { display: 'block' } }, 'Create in a sandbox'))));

      if(isSandbox && data.worldActive && data.creationFocusAvailable && engine && engine._creationFocus && !engine._showcase)additions.push(h('div',{key:'gwe-focus-return',className:'gwe-focus-return','aria-label':'Creation camera'},
        h('span',null,'Creation framed'),h('button',{type:'button',onClick:function(){if(engine.restoreCreationView)engine.restoreCreationView();}},'Previous view'),renderCreationCameraTools()));

      if (isSandbox && data.worldActive) additions.push(h('aside', {
        key: 'gwe-dock', className: 'gwe-builder-dock', 'data-collapsed': collapsed ? 'true' : 'false',
        'aria-label': 'Free Build Studio', 'data-finder':toolFinderOpen?'true':'false'
      },
        h('div', { className: 'gwe-builder-head' },
          h('div', { className: 'gwe-builder-title' },
            h('span', { className: 'gwe-builder-icon', 'aria-hidden': 'true' }, studioCubeMark(h)),
            !collapsed && h('div', null, h('div', { className: 'gwe-builder-eyebrow' }, 'Sandbox mode'), h('div', { className: 'gwe-builder-name' }, 'Free Build Studio'))
          ),
          h('button', { type: 'button', className: 'gwe-collapse', onClick: function () { if (!collapsed) resumeBuilding(); else patchGeometryState(ctx, { sandboxDockCollapsed:false, builderPanel:'build' }); }, 'aria-expanded': collapsed ? 'false' : 'true', 'aria-label': collapsed ? 'Expand Free Build Studio' : 'Collapse Free Build Studio' }, collapsed ? 'Build tools' : '\u2212')
        ),
        !collapsed && h('div',{className:'gwe-tool-finder-bar'},h('button',{ref:toolFinderButton,type:'button',className:'gwe-tool-finder-toggle','aria-expanded':toolFinderOpen,'aria-controls':'gwe-tool-finder',onClick:function(){if(toolFinderOpen)closeToolFinder();else {setToolQuery('');setToolFinderOpen(true);}}},h('svg',{viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.8,'aria-hidden':'true'},h('circle',{cx:10,cy:10,r:6}),h('path',{d:'m15 15 5 5'})),toolFinderOpen?'Close tool finder':'Find a tool',h('span',{'aria-hidden':'true'},toolFinderOpen?'×':'→'))),
        !collapsed && !toolFinderOpen && h('ol', {className:'gwe-workflow', 'aria-label':'Creation workflow'},
          h('li', {'aria-current': hasStudentBuild === false ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '1'), 'Build'),
          h('li', {'aria-current': hasStudentBuild !== false && !hasRetainedSelection ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '2'), 'Select'),
          h('li', {'aria-current': hasRetainedSelection ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '3'), 'Print Lab')
        ),
        !collapsed && !toolFinderOpen && h('div', {className:'gwe-builder-actions gwe-builder-quick-actions'},
          hasStudentBuild === false
            ? h('button',{type:'button',className:'gwe-primary','aria-label':'Start building',onClick:function(){resumeBuilding();}},'Start building')
            : h('button',{type:'button',className:measuredIsStudentBuild ? '' : 'gwe-primary','aria-label':'Select and measure aimed build',onClick:function(){measureSelectedBuild(ctx);}},hasRetainedSelection ? 'Select another build' : 'Select build'),
          h('button',{type:'button',className:measuredIsStudentBuild ? 'gwe-primary' : '',disabled:hasStudentBuild === false,'aria-label':'Send selected build to Print Lab','aria-describedby':hasStudentBuild === false ? 'gwe-build-guidance' : undefined,title:hasStudentBuild === false ? 'Place blocks before selecting a creation for Print Lab' : undefined,onClick:function(){openSelectedBuildInPrintLab(ctx);}},'Send to Print Lab')
        ),
        !collapsed && toolFinderOpen && renderToolFinder(),
        !collapsed && h('div', { className: 'gwe-builder-body',hidden:toolFinderOpen },
          h('p', { id:'gwe-build-guidance',className: 'gwe-builder-intro' + (hasRetainedSelection ? ' gwe-assistive-copy' : ''), 'data-gwe-build-guidance': hasRetainedSelection ? 'selected' : hasStudentBuild === false ? 'empty' : 'select' }, hasRetainedSelection
            ? 'Your selection stays outlined as you look around.'
            : hasStudentBuild === false
              ? firstBlockGuidance(base.props['data-touch-active'] === 'true') + ' Then choose Select build to inspect your creation.'
              : 'Aim at a block you placed, then choose Select build to inspect your creation.'),
          !hasRetainedSelection && renderCurrentTools(),
          renderDrawingTools(),
          hasRetainedSelection ? h('section',{key:'gwe-creation-summary',className:'gwe-creation-summary','data-selected':'true','aria-label':'Selected creation'},
            h('div',{className:'gwe-selected-heading'},
              h('span',{className:'gwe-selected-emblem','aria-hidden':'true'},studioCubeMark(h)),
              h('div',null,h('span',{className:'gwe-selected-eyebrow'},'Outlined selection'),h('h3',null,'Selected creation'))
            ),
            h('div',{className:'gwe-selected-metrics','aria-label':'Selected build summary'},
              h('div',{className:'gwe-metric'},h('strong',null,measured.count),h('span',null,'Blocks selected')),
              h('div',{className:'gwe-metric'},h('strong',null,measured.L+'×'+measured.W+'×'+measured.H),h('span',null,'Block bounds'))
            ),
            h('p',{className:'gwe-selection-scope'},'Showcase and Print Lab use these blocks.')
          ) : h('section', {key:'gwe-creation-summary',className:'gwe-creation-summary','data-selected':'false','aria-label':'Your creation'},
            h('h3', {className:'gwe-section-title'}, 'Your creation'),
            h('div', { className: 'gwe-measure-summary', 'aria-label': 'Build summary' },
              h('div', { className: 'gwe-metric' }, h('strong', null, placed), h('span', null, 'Placed')),
              h('div', { className: 'gwe-metric' }, h('strong', null, measured ? measured.count : '\u2014'), h('span', null, 'Selected')),
              h('div', { className: 'gwe-metric' }, h('strong', null, measured ? measured.L + '\u00D7' + measured.W + '\u00D7' + measured.H : '\u2014'), h('span', null, 'Block bounds'))
            )
          ),
          measured && !measuredIsStudentBuild && h('p', { className: 'gwe-builder-note', 'data-gwe-not-student': 'true', role: 'status' },
            'That measurement was the ground or a lesson structure. Aim at a block you placed to size a print.'),
          measured && h('div', { key:'gwe-inspect-actions',className: 'gwe-builder-actions', 'aria-label':'Inspect selected creation' },
            measuredIsStudentBuild && h('button',{type:'button',className:'gwe-focus-action',onClick:function(){focusSelectedBuild(ctx);},title:'Frame your creation and keep editing'},'Focus creation'),
            hasRetainedSelection && h('div',{className:'gwe-camera-presets','aria-label':'Frame selected creation'},['front','side','top','free'].map(function(preset){return h('button',{key:preset,type:'button',onClick:function(){selectedCreationView(ctx,preset);}},preset==='free'?'Free view':preset[0].toUpperCase()+preset.slice(1));})),
            h('button',{type:'button',className:'gwe-showcase-action',onClick:function(){showcaseBuild(ctx);}},'Showcase creation'),
            h('button', {type:'button', onClick:function(){patchGeometryState(ctx,{measureResult:measured,builderPanel:'measure',sandboxDockCollapsed:true,hudPanel:''});}}, 'Explore measurements'),
            engine && engine._builderSelection && h('button', {type:'button',className:'gwe-clear-selection', onClick:function(){engine._builderSelection=null;patchGeometryState(ctx,{measureResult:null,builderPanel:'build'});}}, 'Clear selection')
          ),
          renderCreationEditing(),
          printEnvelope && h('section', { key:'gwe-print-ready',className: 'gwe-print-ready', 'data-fit': printEnvelope.fits ? 'true' : 'false', 'aria-label':'Print Lab block envelope' },
            h('div', {className:'gwe-print-ready-heading'},
              h('span', { className: 'gwe-print-ready-label' }, 'Print Lab block envelope'),
              h('span', {className:'gwe-fit-badge'}, printEnvelope.fits ? 'Fits profile' : 'Review size')
            ),
            h('div', {className:'gwe-print-dimensions',role:'status'},
              h('span',{className:'gwe-assistive-copy'},'Width, depth, height: '+printEnvelope.label+'.'+(printEnvelope.over.length?' '+listDimensions(printEnvelope.over)+(printEnvelope.over.length===1?' exceeds':' exceed')+' the printer bed.':'')),
              h('div',{className:'gwe-print-axes','aria-hidden':'true'},
                [['width','Width'],['depth','Depth'],['height','Height']].map(function(axis){
                  var over=printEnvelope.over.indexOf(axis[0])!==-1;
                  return h('div',{key:axis[0],className:'gwe-print-axis','data-axis':axis[0],'data-over':over?'true':'false'},
                    h('span',{className:'gwe-print-axis-label'},axis[1]),h('strong',null,printEnvelope[axis[0]+'Mm']),h('small',null,'mm'),
                    over && h('span',{className:'gwe-print-axis-note'},'Over limit'));
                })
              )
            ),
            h('p', {className:'gwe-print-scale'}, currentPrintUnit + ' mm per block \u00B7 Bed ' + printEnvelope.profileLabel),
            h('details',{className:'gwe-details gwe-print-guide-options'},
              h('summary',null,'Inspect print fit'),
              h('p',{className:'gwe-builder-note'},'Prepare editable geometry before exporting. A connecting base adds a solid plate and columns under raised parts. Internal gaps still need review in Print Lab.'),
              h('fieldset',{className:'gwe-base-settings'},h('legend',null,'Connecting base'),
                h('div',{className:'gwe-base-dimensions'},[['padding','Base margin',0,4],['thickness','Base thickness',1,4]].map(function(field){return h('label',{key:field[0]},field[1],h('input',{type:'number',inputMode:'numeric',min:field[2],max:field[3],step:1,value:baseOptions[field[0]],'aria-label':field[1]+' in blocks',onChange:function(event){updateBaseOption(field[0],event.target.value);}}),h('small',null,'blocks'));})),
                h('label',null,'Base appearance',h('select',{value:baseOptions.material,onChange:function(event){updateBaseOption('material',event.target.value);}},['stone','wood','brick'].map(function(material){return h('option',{key:material,value:material},material.charAt(0).toUpperCase()+material.slice(1));}))),
                h('p',{className:'gwe-builder-note'},'Margin extends on every side. Appearance stays editable; choose physical filament in Print Lab.')),
              h('div',{className:'gwe-builder-actions'},[['base','Preview connecting base'],['lower','Preview lower to ground']].map(function(a){return h('button',{type:'button',key:a[0],onClick:function(){var result=previewPrintPreparation(window[ENGINE_KEY],a[0],baseOptions);setSelectionEditPreview(result);setSelectionEditNotice(result.ok?result.label+': review the new geometry, then apply. Undo reverses the entire preparation.':result.reason);}},a[1]);})),
              h('p',null,'See the printer volume and separate pieces around your selected creation.'),
              h('div',{className:'gwe-builder-actions'},
                h('button',{type:'button','aria-pressed':!!data.builderPrintGuide,onClick:function(){patchGeometryState(ctx,{builderPrintGuide:!data.builderPrintGuide,builderPrintFocus:null});}},data.builderPrintGuide?'Hide print guide':'Show print guide'),
                data.builderPrintGuide && h('button',{type:'button',onClick:function(){changePointerMode('build');patchGeometryState(ctx,{builderPrintFocus:null});frameGeometryPrintGuide(ctx);}},'View printer bed'),
                engine && engine._viewPreset && engine._viewPreset!=='free' && h('button',{type:'button',onClick:function(){engine.setViewPreset('free');focusPrintCameraControl(engine,'.gwe-print-guide-options > summary');}},'Return camera')),
              renderPrintPieces(),
              data.builderPrintGuide && data.builderPrintGuideSummary && h('div',{className:'gwe-print-guide-summary',role:'status'},
                h('p',null,data.builderPrintGuideSummary.fits?'The selected mesh fits in this orientation.':'Coral outlines mark '+data.builderPrintGuideSummary.outside+' blocks extending beyond the printer volume.'),
                data.builderPrintGuideSummary.parts.length>1 && h('p',null,data.builderPrintGuideSummary.parts.length+' separate pieces are outlined. '+(data.builderPrintGuideSummary.raisedParts?data.builderPrintGuideSummary.raisedParts+' pieces sit above the lowest surface; review supports or join them with a base.':'Each piece reaches the lowest surface.')),
                (data.builderPrintGuideSummary.openEdges>0 || data.builderPrintGuideSummary.nonManifoldEdges>0) && h('p',null,'Surface connections need review in Print Lab.'),
                h('p',{className:'gwe-print-ready-basis'},'Centered on the printer bed at the current scale. Check exported mesh surfaces and supports in Print Lab.'))),
            h('details', {className:'gwe-details', open:printScaleExpanded===null ? !printEnvelope.fits : printScaleExpanded,onToggle:function(event){setPrintScaleExpanded(event.currentTarget.open);}},
              h('summary', null, 'Adjust print size'),
              h('form',{className:'gwe-scale-editor',noValidate:true,'aria-label':'Print scale',onSubmit:function(event){event.preventDefault();applyPrintScale(scaleDraft);}},
                h('span',{className:'gwe-scale-editor-title'},'Choose a block size'),
                h('div',{className:'gwe-scale-presets',role:'group','aria-label':'Quick print scales'},
                  [5,10,20].map(function(unit){return h('button',{key:unit,type:'button','aria-label':'Use '+unit+' millimeters per block','aria-pressed':currentPrintUnit===unit,onClick:function(){applyPrintScale(unit);}},unit+' mm');})
                ),
                h('label',{htmlFor:'gwe-print-scale-value'},'Millimeters per block'),
                h('div',{className:'gwe-scale-custom'},
                  h('input',{ref:scaleInputRef,id:'gwe-print-scale-value',type:'number',inputMode:'decimal',min:0.01,max:1000,step:'any',value:scaleDraft,'aria-invalid':scaleError?'true':undefined,'aria-describedby':'gwe-print-scale-help'+(scaleError?' gwe-print-scale-error':''),onChange:function(event){setScaleDraft(event.target.value);setScaleError('');}}),
                  h('button',{type:'submit'},'Apply scale')
                ),
                h('p',{id:'gwe-print-scale-help',className:'gwe-scale-help'},'Sets the physical size of STL exports and the model sent to Print Lab.'),
                scaleError && h('p',{id:'gwe-print-scale-error',className:'gwe-scale-error',role:'alert'},scaleError)
              ),
              h('p', null, printEnvelope.fits
                ? 'Fits the ' + printEnvelope.profileLabel + ' printer profile at ' + currentPrintUnit + ' mm per block. Advisory preflight is still required.'
                : 'The ' + listDimensions(printEnvelope.over) + (printEnvelope.over.length === 1 ? ' dimension is' : ' dimensions are') + ' larger than the ' + printEnvelope.profileLabel + ' printer profile at ' + currentPrintUnit + ' mm per block. Choose a smaller block size above, or reduce the build.'),
              h('p', { className: 'gwe-print-ready-basis' }, printEnvelope.usingSavedProfile
                ? 'Measured from whole blocks against the printer profile saved in Print Lab. Print Lab measures the exported mesh, so a build made of wedges can report a slightly smaller envelope there.'
                : 'Measured from whole blocks against Print Lab\u2019s default printer profile. Set a school printer in Print Lab to check against the real bed.'),
              printVolumeSentence(measured, currentPrintUnit) && h('p', { className: 'gwe-print-ready-basis', 'data-gwe-print-volume': 'true' }, printVolumeSentence(measured, currentPrintUnit)),
              h('p', { className: 'gwe-builder-note' }, 'Print Lab scale: ' + currentPrintUnit + ' mm per block. Geometry World materials describe appearance only; choose the real filament separately after reviewing its science and tradeoffs.')
            )
          ),
          data.builderPrintCheck && h('div', {key:'gwe-connection-check',className:'gwe-connection-check', role:'status', 'data-connected':selectionNeedsReview(data.builderPrintCheck) ? 'false':'true'},
            h('strong',null,data.builderPrintCheck.error ? 'Check this selection' : data.builderPrintCheck.components>1 ? data.builderPrintCheck.components+' separate pieces' : data.builderPrintCheck.nonManifoldEdges ? 'Touching edges need review' : data.builderPrintCheck.openEdges ? 'Open surfaces need review' : selectionNeedsReview(data.builderPrintCheck) ? 'Review this selection' : 'One joined piece'),
            h('p',null,data.builderPrintCheck.error || (data.builderPrintCheck.components>1 ? 'Some shapes do not touch, even when their grid cells are next to each other. Join them with a base, move the shapes, or plan separate parts in Print Lab.' : data.builderPrintCheck.nonManifoldEdges ? 'Some surfaces meet only along an edge. Add a connecting block or review the highlighted creation in Print Lab.' : data.builderPrintCheck.openEdges ? 'The selected mesh has open edges. Review its surfaces in Print Lab before preparing a print.' : selectionNeedsReview(data.builderPrintCheck) ? 'The selection check is incomplete. Open Print Lab to inspect the exported mesh.' : 'The selected shapes share surfaces. Print Lab will check the exported mesh and physical scale.'))
          ),
          hasRetainedSelection && renderCurrentTools(),
          h('section', {'aria-label':'Keep your work'},
            h('h3', {className:'gwe-section-title'}, 'Keep your work'),
            h('p',{className:'gwe-project-status',role:'status','aria-live':'polite'},projectNotice),
            h('form',{className:'gwe-project-save',onSubmit:function(e){e.preventDefault();savedDraft(saveWorldDraft(window[ENGINE_KEY],projectName));}},h('label',{htmlFor:'gwe-project-name'},'Project name'),h('input',{id:'gwe-project-name',maxLength:80,value:projectName,placeholder:'Name your creation',onChange:function(e){setProjectName(e.target.value);}}),h('button',{type:'submit'},'Save project name')),
            h('button',{type:'button',className:'gwe-save-variation',onClick:saveVariation},'Save as new variation'),
            h('p',{className:'gwe-builder-note'},'Keep the earlier saved project and continue editing a new copy.'),
            h('button',{type:'button',onClick:function(){var live=window[ENGINE_KEY];if(live && live.openGeometryHome)live.openGeometryHome();patchGeometryState(ctx,{showGeometryHome:true,_geometryHomeInitial:false,geometryHomePage:'open'});setWorldShelf(readWorldShelf());}},'My Worlds'),
            h('div', { className: 'gwe-builder-actions' },
              h('button', { type: 'button', onClick: function () { saveEditableWorld(ctx); } }, '\uD83D\uDCBE Save editable world'),
              h('button', { ref:editableOpenRef, type: 'button', disabled: editableBusy, onClick: function () { if (editableInputRef.current) editableInputRef.current.click(); } }, editableBusy ? 'Checking file...' : '\uD83D\uDCC2 Open editable world')
            )
          ),
          h('details', {className:'gwe-details gwe-workspace-options'},
            h('summary', null, 'Workspace options'),
            h('div',{className:'gwe-builder-actions','aria-label':'Free Build environment'},
              h('button',{type:'button','aria-pressed':!!(engine && engine._currentLesson && engine._currentLesson.builderGarden!==false),onClick:function(){changeBuilderGarden(true);}},'Garden workshop'),
              h('button',{type:'button','aria-pressed':!!(engine && engine._currentLesson && engine._currentLesson.builderGarden===false),onClick:function(){changeBuilderGarden(false);}},'Open meadow')),
            h('div', { className: 'gwe-builder-actions' },
              h('button', { type: 'button', onClick: returnToLessons }, '\uD83D\uDCD8 Choose guided lesson'),
              h('button', { type: 'button', onClick: openLauncher, 'aria-haspopup': 'dialog', 'aria-controls': 'gwe-sandbox-launcher', 'data-gwe-focus-return': 'sandbox-dock' }, '\u2728 Start a fresh sandbox')
            )
          ),
          renderEditableRecovery()
        ),
        !collapsed && h('div',{className:'gwe-builder-footer'},
          selectionEditPreview && !toolFinderOpen ? h('div',{className:'gwe-preview-footer','aria-label':'Pending preview actions'},h('div',{className:'gwe-preview-footer-heading'},h('strong',null,selectionEditPreview.ok?'Ready to apply':'Adjust the preview'),h('span',null,(previewChangeFacts(selectionEditPreview) || {}).count || 0,' blocks')),renderPreviewButtons(false)) : h('button',{type:'button',className:'gwe-resume-building',onClick:function(){resumeBuilding();}},
            h('svg',{viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:'M14 5l7 7-7 7M21 12H3'})),
            'Back to building'))
      ));

      if (launcherOpen) additions.push(h('div', { key: 'gwe-modal', className: 'gwe-backdrop', role: 'presentation' },
        h('section', {
          id: 'gwe-sandbox-launcher', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gwe-launcher-title', 'aria-describedby': 'gwe-launcher-desc',
          className: 'gwe-launcher', tabIndex: -1, onKeyDown: function (event) { trapDialogKeys(event, closeLauncher); }
        },
          h('div', { className: 'gwe-launcher-hero' },
            h('div', {className:'gwe-launcher-art', 'aria-hidden':'true'}, studioCubeMark(h)),
            h('p', { className: 'gwe-launcher-kicker' }, 'Geometry World / Free Build Studio'),
            h('h2', { id: 'gwe-launcher-title' }, 'Open a blank Free Build Sandbox'),
            h('p', { id: 'gwe-launcher-desc', className: 'gwe-launcher-subtitle' }, 'A clear 25 x 25 workspace for your next idea. Build with familiar shapes and materials, refine every detail, then bring one creation into Print Lab.')
          ),
          h('div', { className: 'gwe-feature-grid' },
            h('article', { className: 'gwe-feature' }, h('span', { className: 'gwe-feature-icon', 'aria-hidden': 'true' }, '01'), h('strong', null, 'Build your way'), h('p', null, 'Combine cubes, slabs, and wedges. Rotate pieces and revise freely with undo and redo.')),
            h('article', { className: 'gwe-feature' }, h('span', { className: 'gwe-feature-icon', 'aria-hidden': 'true' }, '02'), h('strong', null, 'Inspect your creation'), h('p', null, 'Select one connected build, explore its measurements, or frame it beautifully in Showcase.')),
            h('article', { className: 'gwe-feature' }, h('span', { className: 'gwe-feature-icon', 'aria-hidden': 'true' }, '03'), h('strong', null, 'Continue in Print Lab'), h('p', null, 'Preview the selected geometry, choose its physical scale and material, then run advisory preflight.'))
          ),
          h('p', { className: 'gwe-reset-note', role: 'note' }, 'Opening the blank sandbox replaces the world currently shown. Save an editable JSON copy first if you want to return to it later.'),
          h('div', { className: 'gwe-launcher-actions' },
            h('button', { type: 'button', onClick: function () { saveEditableWorld(ctx); } }, 'Save current world JSON'),
            h('button', { type: 'button', onClick: closeLauncher }, 'Cancel'),
            h('button', { type: 'button', className: 'gwe-open', autoFocus: true, onClick: function () { startSandboxMode(ctx); } }, 'Open blank sandbox')
          )
        )
      ));

      if(data.showcaseActive) additions.push(h('section', {key:'gwe-showcase',className:'gwe-showcase','data-files-open':showcaseFilesOpen?'true':'false','data-look':data.showcaseLook || 'meadow','data-view':data.showcaseView || 'perspective',role:'dialog','aria-modal':'true','aria-label':'Showcase creation',onKeyDown:function(event){if(event.key==='ArrowLeft' || event.key==='ArrowRight'){event.preventDefault();var eng=window[ENGINE_KEY];if(eng && eng.rotateShowcase)eng.rotateShowcase(event.key==='ArrowLeft' ? -1:1);}trapDialogKeys(event,function(){var eng=window[ENGINE_KEY];if(eng && eng.endShowcase)eng.endShowcase();});event.stopPropagation();}},
        h('div',{className:'gwe-showcase-caption',inert:showcaseFilesOpen?'':undefined,'aria-hidden':showcaseFilesOpen?'true':undefined},h('span',null,'GEOMETRY WORLD / SHOWCASE'),h('strong',null,'Made by you.'),
          measured && h('p',{className:'gwe-showcase-meta','aria-label':'Creation dimensions'},measured.count+' block'+(measured.count===1?'':'s')+' \u00B7 '+measured.L+' \u00D7 '+measured.W+' \u00D7 '+measured.H+' units'),
          h('div',{className:'gwe-showcase-looks',role:'group','aria-label':'Scene look'},
            ['meadow','studio'].map(function(look){return h('button',{key:look,type:'button','aria-pressed':(data.showcaseLook || 'meadow')===look,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.setShowcaseLook)eng.setShowcaseLook(look);}},look==='meadow'?'Meadow':'Studio');})
          )
        ),
        [-1,1].map(function(step){var label=step<0 ? 'Rotate view left':'Rotate view right';return h('button',{key:label,type:'button',inert:showcaseFilesOpen?'':undefined,'aria-hidden':showcaseFilesOpen?'true':undefined,className:'gwe-showcase-orbit gwe-showcase-orbit-'+(step<0 ? 'left':'right'),'aria-label':label,title:label,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.rotateShowcase)eng.rotateShowcase(step);}},h('svg',{viewBox:'0 0 24 24',width:24,height:24,fill:'none','aria-hidden':'true',focusable:'false'},h('path',{d:step<0?'M14 6 8 12l6 6':'M10 6l6 6-6 6',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round'})));}),
        h('div',{className:'gwe-showcase-tools',inert:showcaseFilesOpen?'':undefined,'aria-hidden':showcaseFilesOpen?'true':undefined},
          h('div',{className:'gwe-showcase-views',role:'group','aria-label':'Camera view'},
            ['perspective','front','side','top'].map(function(view){return h('button',{key:view,type:'button','aria-pressed':(data.showcaseView || 'perspective')===view,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.setShowcaseView)eng.setShowcaseView(view);}},view.charAt(0).toUpperCase()+view.slice(1));})
          ),
          h('div',{className:'gwe-showcase-actions'},
          h('button',{id:'gwe-showcase-close',type:'button',onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.endShowcase)eng.endShowcase();}},'Back to building'),
          h('button',{type:'button','aria-label':'Save image','aria-busy':!!data.showcaseSaving,'aria-disabled':!!data.showcaseSaving,title:'Save a high-resolution PNG',onClick:function(){saveShowcaseImage(ctx);}},data.showcaseSaving?'Saving image...':'Save image'),
          h('button',{ref:showcaseFilesTriggerRef,id:'gwe-showcase-files-trigger',type:'button','aria-expanded':showcaseFilesOpen,'aria-controls':'gwe-showcase-files',disabled:!!data.showcaseSaving,onClick:openShowcaseFiles},'Use & export')
          )
        ),
        showcaseFilesOpen && h('div',{className:'gwe-showcase-files-backdrop',onClick:function(event){if(event.target===event.currentTarget)closeShowcaseFiles();}},
          h('section',{id:'gwe-showcase-files',className:'gwe-showcase-files',ref:showcaseFilesRef,tabIndex:-1,role:'region','aria-labelledby':'gwe-showcase-files-title',onKeyDown:function(event){event.stopPropagation();trapDialogKeys(event,closeShowcaseFiles);}},
            h('header',{className:'gwe-files-header'},
              h('div',null,h('span',{className:'gwe-files-eyebrow'},'KEEP CREATING'),h('h2',{id:'gwe-showcase-files-title'},'Use your creation'),h('p',null,(measured ? measured.count+' block'+(measured.count===1?'':'s')+' · ' : '')+'Selected creation')),
              h('button',{type:'button',className:'gwe-files-close','aria-label':'Close import and export',onClick:closeShowcaseFiles},'×')
            ),
            h('div',{className:'gwe-files-body'},
              h('section',{className:'gwe-file-card'},
                h('div',{className:'gwe-file-heading'},fileIcon('edit'),h('h3',null,'Edit in AlloFlow')),
                h('p',null,'Keep this creation’s blocks, materials, shapes, and rotations in an editable Geometry World file.'),
                h('button',{type:'button',disabled:!!data.showcaseSaving,onClick:function(){if(saveSelectedEditableWorld(ctx))setShowcaseFileNotice('Editable creation downloaded. Open this JSON in Geometry World to build on it.');}},'Download editable JSON')
              ),
              h('section',{className:'gwe-file-card'},
                h('div',{className:'gwe-file-heading'},fileIcon('print'),h('h3',null,'Prepare a 3D print')),
                h('p',null,'STL in millimeters · '+currentPrintUnit+' mm per block. Open Print Lab to review size and printability.'),
                h('div',{className:'gwe-file-actions'},
                  h('button',{type:'button',disabled:!!data.showcaseSaving,onClick:function(){if(selectedBuildStlDownload(ctx))setShowcaseFileNotice('STL downloaded in millimeters. Import it into your slicer at 100% scale.');}},'Download STL'),
                  h('button',{type:'button',className:'gwe-file-primary',disabled:!!data.showcaseSaving,onClick:function(){openSelectedBuildInPrintLab(ctx);}},'Open in Print Lab')
                ),
                h('p',{className:'gwe-file-note'},'STL contains geometry. Choose the physical filament in Print Lab or your slicer.')
              ),
              h('section',{className:'gwe-file-card gwe-file-import'},
                h('div',{className:'gwe-file-heading'},fileIcon('open'),h('h3',null,'Open an editable model')),
                h('p',null,'Choose an AlloFlow Geometry World JSON file. Review it before replacing the current sandbox.'),
                h('button',{ref:showcaseFileChooseRef,type:'button',disabled:editableBusy || !!data.showcaseSaving,onClick:chooseShowcaseFile},editableBusy?'Checking file...':'Choose editable JSON'),
                renderEditableRecovery()
              ),
              h('div',{className:'gwe-file-photo'},h('div',null,h('strong',null,'Keep a picture'),h('span',null,'High-resolution PNG')),
                h('button',{type:'button',disabled:!!data.showcaseSaving,'aria-busy':!!data.showcaseSaving,onClick:function(){saveShowcaseImage(ctx);}},data.showcaseSaving?'Saving image...':'Save image')
              ),
              showcaseFileNotice && h('p',{className:'gwe-file-status',role:'status','aria-live':'polite'},showcaseFileNotice)
            )
          )
        )
      ));
      var children = React.Children.toArray(base.props.children).concat(additions).map(function(child){
        if(!React.isValidElement(child) || child.type==='style' || child.type==='input' || child.props.className==='gwe-home-backdrop' || child.props.className==='gwe-activity-backdrop')return child;
        return React.cloneElement(child,{inert:(homeOpen||guideOpen)?'':undefined,'aria-hidden':(homeOpen||guideOpen)?'true':child.props['aria-hidden']});
      });
      return React.cloneElement(base, {
        className: (base.props.className || '') + ' gwe-enhanced',
        'data-builder-panel': data.builderPanel === 'measure' && data.measureResult ? 'measure' : 'build',
        'data-showcase-active': data.showcaseActive ? 'true':'false',
        'data-showcase-look': data.showcaseLook || 'meadow',
        'data-preview-review':previewReview?'true':'false',
        'data-geometry-mode': isSandbox ? 'sandbox' : 'lesson'
      }, children);
    };
    return true;
  }

  installStyles();
  if (!installBuilderEnhancement()) {
    // The shell loads this file BEFORE the core (it is the core's declared dependency), and mounts the
    // core the moment it registers. Wrap inside registerTool itself so the first render is already the
    // enhanced one: a render whose hook count grows on a later re-render throws in React.
    var lab = window.StemLab;
    if (lab && typeof lab.registerTool === 'function' && !lab.__alloflowGeometryBuilderHook) {
      var originalRegisterTool = lab.registerTool;
      lab.__alloflowGeometryBuilderHook = true;
      lab.registerTool = function (id) {
        var result = originalRegisterTool.apply(this, arguments);
        if (id === 'geometryWorld') { try { installBuilderEnhancement(); } catch (installError) {} }
        return result;
      };
    }
    var attempts = 0;
    (function retry() {
      attempts += 1;
      if (installBuilderEnhancement() || attempts >= 600) return;
      setTimeout(retry, 100);
    })();
  }
})();
