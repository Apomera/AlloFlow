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
    engine._builderSelection = null;
    patchGeometryState(ctx, {
      builderPrintContext:null, builderPrintCheck:null, builderPanel:'build',
      sandboxDockCollapsed:typeof window.matchMedia === 'function' && window.matchMedia('(max-width:800px)').matches,
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
  function selectionMeasurement(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !Array.isArray(selected.blocks) || !engine.blocks || typeof engine.measureStructure !== 'function') return null;
    var seed = selected.blocks.find(function(p) { var mesh = engine.blocks[keyFor(p)]; return mesh && isStudentBlock(mesh.userData); });
    if (!seed) { engine._builderSelection = null; return null; }
    var measurement = engine.measureStructure(seed.x, seed.y, seed.z, selected.blocks);
    if (measurement && measurement.isComplete !== false) engine._builderSelection = {blocks:measurement.blocks.slice()};
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
    return {engine:engine,measure:engine.measureStructure,keys:keys,members:members,
      frontier:frontierKeys.map(function(key) { return blockMeasurementTuple(engine,key); })};
  }
  function selectionRefreshUnchanged(engine, saved) {
    var selected = engine && engine._builderSelection;
    if (!saved || saved.engine !== engine || saved.measure !== engine.measureStructure || !engine.blocks ||
      !selected || !Array.isArray(selected.blocks) || selected.blocks.length !== saved.keys.length) return false;
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
    var signature = selected.blocks.map(function(p) {
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
    var blocks = [];
    Object.keys(engine.blocks || {}).forEach(function(key) {
      var mesh = engine.blocks[key], p = gridPosition(mesh), u = mesh && mesh.userData;
      if (!p || !u || u._lessonBlock) return;
      blocks.push(Object.assign({}, p, { type:u.blockType, shape:u.shape || 'cube', rotation:u.rotation || 0 }));
    });
    return { id:id, blocks:blocks, lesson:copyLocal(engine._currentLesson || FREE_BUILD_LESSON),
      state:copyLocal(ctx.toolData && ctx.toolData.geometryWorld || {}),
      selection:engine._builderSelection && copyLocal(engine._builderSelection),
      undo:copyLocal(engine._undoStack || []), redo:copyLocal(engine._redoStack || []),
      blocksPlaced:engine.blocksPlaced || 0, sessionXP:engine._sessionXP || 0, milestones:copyLocal(engine._blockMilestones || {}),
      camera:engine.camera && engine.camera.position.toArray(), cameraQuaternion:engine.camera && engine.camera.quaternion.toArray(), yaw:engine.yaw, pitch:engine.pitch, flyMode:!!engine.flyMode };
  }
  function restoreProject(ctx, engine, pending) {
    var saved = window.__alloGeometryWorldReturnProject;
    if (!saved || !pending.projectId || saved.id !== pending.projectId) return false;
    engine.loadLesson(saved.lesson);
    saved.blocks.forEach(function(block) { engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation); });
    engine._undoStack = copyLocal(saved.undo); engine._redoStack = copyLocal(saved.redo);
    engine.blocksPlaced = saved.blocksPlaced; engine._sessionXP = saved.sessionXP; engine._blockMilestones = saved.milestones;
    engine._entryAnim = null; engine._builderSelection = saved.selection;
    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);
    if (saved.cameraQuaternion && engine.camera) { engine.camera.quaternion.fromArray(saved.cameraQuaternion); if(engine.euler) engine.euler.setFromQuaternion(engine.camera.quaternion); }
    if (isFinite(saved.yaw)) engine.yaw = saved.yaw;
    if (isFinite(saved.pitch)) engine.pitch = saved.pitch;
    engine.flyMode = saved.flyMode;
    if (engine.velocity) engine.velocity.set(0,0,0);
    var context = pending.printContext || {};
    var selected = selectionMeasurement(engine);
    patchGeometryState(ctx, Object.assign({}, saved.state, { worldActive:true, showLessonIntro:false,
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
  function studioGroundFootprints(meshes, baseY) {
    var THREE=window.THREE, footprints=[];
    if(!THREE || !isFinite(baseY))return footprints;
    function cross(a,b,c){return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);}
    (meshes || []).forEach(function(mesh){
      var positions=mesh && mesh.geometry && mesh.geometry.getAttribute('position');
      if(!positions)return;
      mesh.updateWorldMatrix(true,false);
      var points=[],seen={};
      for(var i=0;i<positions.count;i++){
        var point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
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
  function fitCreationCamera(box, camera, rect, minCameraY) {
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
    // Moving the frame upward on screen lowers the camera. Raise the bearing
    // enough that increasing fit distance still raises its physical height.
    // The remaining-angle cap also supports unusually wide effective FOVs.
    var requiredElevation=Math.atan(Math.max(0,cy)*tanY);
    var lift=Math.min(Math.PI/18,(Math.PI/2-requiredElevation)*0.5);
    var elevation=Math.max(baseElevation,requiredElevation+lift),cosElevation=Math.cos(elevation);
    var direction=new THREE.Vector3(1.25/horizontal*cosElevation,Math.sin(elevation),1.55/horizontal*cosElevation);
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
    if(root)root.querySelectorAll('.gw-hotbar,.gw-shape-tray,.gw-action-bar,.gw-touch-actions,.gw-touch-joystick,.gw-touch-look-panel,.gwe-builder-dock,.gwe-focus-return').forEach(function(node){
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
  function focusSelectedBuild(ctx) {
    var selected=selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx,false),THREE=window.THREE;
    if(!selected || !THREE)return false;
    var engine=selected.engine,camera=engine.camera;
    if(!camera || !camera.isPerspectiveCamera || engine._showcase || engine._destroyed)return false;
    var initialBox=creationGeometryBounds(engine,selected.measurement.blocks);if(initialBox.isEmpty())return false;
    if(engine._guidedTour && engine.stopGuidedTour)engine.stopGuidedTour(false);
    try{if(document.pointerLockElement && document.exitPointerLock)document.exitPointerLock();}catch(_){}
    if(engine.releaseInput)engine.releaseInput();if(engine.velocity)engine.velocity.set(0,0,0);engine.isLocked=false;engine._entryAnim=null;engine._viewPresetAnim=null;
    engine._builderSelection={blocks:selected.measurement.blocks.slice()};
    var state=engine._creationFocus;
    if(!state){
      state={position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),fov:camera.fov,far:camera.far,
        fog:engine.scene.fog, fogNear:engine.scene.fog && engine.scene.fog.near,fogFar:engine.scene.fog && engine.scene.fog.far,
        lesson:engine._currentLesson,collapsed:!!((ctx.toolData.geometryWorld || {}).sandboxDockCollapsed),frames:[],manual:false,transition:null,lastPosition:camera.position.clone(),lastQuaternion:camera.quaternion.clone()};
      engine._creationFocus=state;
    }
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
      var rect=creationFocusRect(engine),fit=fitCreationCamera(box,camera,rect,groundY+2.8);if(!fit)return false;
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
      focusWorldSurface(0);announce(ctx,'Creation framed. Keep building, or choose Previous view to return.','success');
    }));}));
    return true;
  }

  function showcaseBuild(ctx) {
    var selected = selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx, false);
    var THREE = window.THREE;
    if (!selected || !THREE) return;
    var engine = selected.engine, camera = engine.camera;
    if (!camera || engine._showcase) return;
    if(engine.disposeCreationFocus)engine.disposeCreationFocus();
    var box = new THREE.Box3();
    selected.measurement.blocks.forEach(function(p){box.expandByObject(engine.blocks[keyFor(p)]);});
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
      var floorGeometry=new THREE.PlaneGeometry(600,600);
      var floorMaterial=new THREE.MeshStandardMaterial({color:studioColor(0xc6c3c0),roughness:0.98,metalness:0});
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
      var footprints=studioGroundFootprints(selectedMeshes,box.min.y),contactMap=studioContactMap(footprints,box);
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
    var corners=[];
    [box.min.x,box.max.x].forEach(function(x){[box.min.y,box.max.y].forEach(function(y){[box.min.z,box.max.z].forEach(function(z){corners.push(new THREE.Vector3(x,y,z).sub(center));});});});
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
      camera.fov=42;camera.updateProjectionMatrix();
      camera.up.set(0,saved.view==='top'?0:1,saved.view==='top'?-1:0);
      var canvas=engine.renderer.domElement,width=canvas.clientWidth || canvas.width || 800,height=canvas.clientHeight || canvas.height || 600;
      // Fit every bounding corner, including perspective depth, inside the clear
      // area between the caption, view controls and orbit buttons.
      var tangent=Math.tan(camera.fov*Math.PI/360),safeX=Math.max(0.35,(width-128)/width),safeY=Math.max(0.25,(height-320)/height);
      var right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),viewUp=new THREE.Vector3().crossVectors(direction,right).normalize();
      var distance=radius*0.4+0.5;
      corners.forEach(function(point){var depth=point.dot(direction);distance=Math.max(distance,depth+Math.abs(point.dot(right))/(tangent*camera.aspect*safeX),depth+Math.abs(point.dot(viewUp))/(tangent*safeY));});
      distance*=1.08;
      camera.far=Math.max(saved.far,distance+radius*2+10);camera.updateProjectionMatrix();
      if(saved.fog && engine.scene.fog){engine.scene.fog.near=Math.max(saved.fog.near,distance+radius);engine.scene.fog.far=Math.max(saved.fog.far,engine.scene.fog.near+Math.max(80,radius));}
      if(saved.studio && saved.studio.floor){
        // Every visible point before full fog is at most this distance from the
        // camera. Add the camera-to-creation distance to bound both floor axes.
        // This keeps the perimeter beyond the fog at any aspect or view angle,
        // without adding triangles or changing any printable geometry.
        var fogDepth=engine.scene.fog && isFinite(engine.scene.fog.far)?engine.scene.fog.far:camera.far;
        var fogCornerDistance=fogDepth*Math.sqrt(1+tangent*tangent*(1+camera.aspect*camera.aspect));
        var floorHalf=Math.max(300,distance+fogCornerDistance+radius+10);
        saved.studio.floor.scale.set(floorHalf/300,floorHalf/300,1);
      }
      camera.position.copy(center).addScaledVector(direction,distance);
      camera.lookAt(center);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);camera.updateMatrixWorld(true);
    };
    engine.endShowcase=function(){
      var previous=engine._showcase;if(!previous)return;
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
      if(window[ENGINE_KEY]===engine && !engine._destroyed)patchGeometryState(ctx,{showcaseSaving:false});
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
  function openSelectedBuildInPrintLab(ctx) {
    var selected = selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx, false);
    if (!selected) return;
    var eng = selected.engine;
    var measurement = selected.measurement;
    if (!measurement || measurement.isComplete === false) { announce(ctx, 'The selected build could not be measured completely.', 'error'); return; }
    var bundle;
    try { bundle = buildGeometryWorldStl(eng, measurement.blocks, { title: 'Geometry World selected build' }); }
    catch (error) { announce(ctx, error && error.message ? error.message : 'The selected build could not be prepared.', 'error'); return; }
    eng._builderSelection = { blocks:measurement.blocks.slice() };
    var projectId = 'gw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    var context = printContext(ctx);
    window.__alloGeometryWorldReturnProject = captureProject(ctx, eng, projectId);
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
    if (ctx && typeof ctx.setStemLabTool === 'function') {
      announce(ctx, 'Selected build prepared locally. Opening Print Lab.', 'success');
      ctx.setStemLabTool('printLab');
    } else {
      // The Print Lab handoff carries block units plus an explicit scale. A
      // standalone STL has no unit metadata, so apply that scale to a copy of
      // its vertices before download. Keep the handoff and source unchanged.
      var unitMm=printUnit(context.unitMm),downloadBuffer=bundle.buffer.slice(0),downloadView=new DataView(downloadBuffer);
      var header='Geometry World; coordinates in mm; '+unitMm+' mm per block',headerBytes=new Uint8Array(downloadBuffer,0,80);
      headerBytes.fill(0);for(var hi=0;hi<Math.min(80,header.length);hi++)headerBytes[hi]=header.charCodeAt(hi);
      for(var triangle=0;triangle<downloadView.getUint32(80,true);triangle++){
        for(var coordinate=12;coordinate<48;coordinate+=4){var offset=84+triangle*50+coordinate;downloadView.setFloat32(offset,downloadView.getFloat32(offset,true)*unitMm,true);}
      }
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
    var returningContext = pending.printContext || {};
    engine._builderSelection = {blocks:clean.map(function(b){return {x:b.x+offsetX,y:b.y+offsetY,z:b.z+offsetZ};})};
    patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: '', builderPanel:'build', builderPrintContext:{unitMm:printUnit(returningContext.unitMm),aiUse:returningContext.aiUse || 'NONE',aiDisclosure:String(returningContext.aiDisclosure || '').slice(0,500)}, measureResult: null, measureHistory: [] });
    if (engine.logEvent) engine.logEvent('print_lab_return', { blocks: placedCount, requestedBlocks: requestedCount, truncated: requestedCount > placedCount });
    announce(ctx, 'Editable build returned from Print Lab with ' + placedCount + ' block' + (placedCount === 1 ? '' : 's') + '. It is centered one block above the sandbox floor.' + (requestedCount > placedCount ? ' The world safety limit prevented ' + (requestedCount - placedCount) + ' additional block' + (requestedCount - placedCount === 1 ? '' : 's') + ' from being restored.' : ''), requestedCount > placedCount ? 'info' : 'success');
    focusWorldSurface(50);
    return true;
  }

  window.StemLab = window.StemLab || {};
  window.StemLab.geometryWorldBuilderPure = {
    studioGroundFootprints:studioGroundFootprints, studioContactMap:studioContactMap,
    showcaseExportSize:showcaseExportSize, captureShowcaseImage:captureShowcaseImage, saveShowcaseImage:saveShowcaseImage,
    fitCreationCamera:fitCreationCamera, creationFocusRect:creationFocusRect, creationGeometryBounds:creationGeometryBounds, focusSelectedBuild:focusSelectedBuild,
    createSelectionFrame:createSelectionFrame, selectionNeedsReview:selectionNeedsReview,
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
      ".gwe-free-build-launch{position:absolute;top:118px;right:12px;z-index:44;display:inline-flex;min-height:48px;align-items:center;gap:9px;padding:10px 15px;border:1px solid #d4e8ca66;border-radius:15px;background:#173b35;color:#f5f0e5;box-shadow:0 8px 24px #112d2b33,inset 0 1px #ffffff12;font-size:13px;font-weight:750;cursor:pointer}.gwe-free-build-launch small{color:#d4e8ca;font-size:11px;font-weight:500}.gwe-free-build-launch:hover{background:#244c42}",
      ".gwe-builder-dock{position:absolute;top:118px;right:12px;z-index:43;display:flex;flex-direction:column;box-sizing:border-box;width:min(346px,calc(100% - 24px));max-height:calc(100% - 130px);overflow:hidden;border:1px solid #9ab4a65e;border-radius:20px;background:#112d2bf5;box-shadow:0 18px 48px #0b211f38,inset 0 1px #ffffff0d;color:#f5f0e5;backdrop-filter:blur(16px)}.gwe-builder-dock[data-collapsed=\"true\"]{width:auto}.gwe-builder-head{position:relative;z-index:2;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 15px 12px;background:#173b35;border-bottom:1px solid #c5d9cd22}.gwe-builder-title{display:flex;min-width:0;align-items:center;gap:11px}.gwe-builder-icon{display:grid;width:40px;height:40px;flex:0 0 auto;place-items:center;border:1px solid #d4e8ca42;border-radius:12px;background:#d4e8ca0c;color:#d4e8ca}.gwe-builder-eyebrow{color:#b8cdbf;font-size:10px;font-weight:650;letter-spacing:.1em;text-transform:uppercase}.gwe-builder-name{margin-top:3px;color:#f5f0e5;font-size:16px;font-weight:750;letter-spacing:-.025em}.gwe-collapse{display:grid;min-width:44px;min-height:44px;place-items:center;border:1px solid #a4bbaa55;border-radius:12px;background:#112d2b66;color:#f5f0e5;font-size:15px;font-weight:650;cursor:pointer}.gwe-collapse:hover{background:#2b5044}.gwe-builder-dock[data-collapsed=\"true\"] .gwe-builder-head{padding:6px}.gwe-builder-dock[data-collapsed=\"true\"] .gwe-builder-icon{border:0;background:transparent}",
      ".gwe-workflow{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:6px;list-style:none;margin:0;padding:11px 16px 0;color:#b8cdbf}.gwe-workflow li{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600}.gwe-workflow li+li:before{content:\"\";display:block;width:13px;height:1px;margin-right:3px;background:#9cb8a94d}.gwe-workflow span{display:grid;place-items:center;width:20px;height:20px;border:1px solid #9cb8a95e;border-radius:50%;font-size:10px}.gwe-workflow li[aria-current=\"step\"]{color:#f5f0e5}.gwe-workflow li[aria-current=\"step\"] span{border-color:#d4e8ca;background:#d4e8ca;color:#112d2b}",
      ".gwe-builder-body{display:flex;flex:1 1 auto;min-height:0;flex-direction:column;gap:15px;padding:15px;overflow:auto;overscroll-behavior:contain;scrollbar-color:#658576 #173b35;scrollbar-width:thin}.gwe-builder-intro{margin:0;color:#c5d6ca;font-size:12px;line-height:1.6}.gwe-section-title{margin:0 0 8px;color:#f5f0e5;font-size:13px;font-weight:700;letter-spacing:-.01em}.gwe-selection{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gwe-selection-card{min-width:0;padding:10px 11px;border:1px solid #aac4b329;border-radius:12px;background:#d4e8ca07}.gwe-selection-label{display:block;color:#b5cabb;font-size:11px;font-weight:500}.gwe-selection-value{display:block;margin-top:5px;overflow:hidden;color:#f5f0e5;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.gwe-measure-summary{display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:8px}.gwe-metric{min-width:0;padding:12px 6px;border:1px solid #b4cdb42b;border-radius:12px;background:#d4e8ca0a;text-align:center}.gwe-metric strong{display:block;color:#f5f0e5;font-size:20px;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.04em}.gwe-metric:last-child strong{font-size:17px;line-height:24px}.gwe-metric span{display:block;margin-top:4px;color:#b8cdbf;font-size:11px;font-weight:500}",
      ".gwe-focus-return{position:absolute;top:118px;left:12px;z-index:44;display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px);box-sizing:border-box;padding:6px 6px 6px 13px;border:1px solid #a9c4ad66;border-radius:16px;background:#173b35f5;box-shadow:0 8px 24px #112d2b33;color:#d4e8ca}.gwe-focus-return span{font-size:12px;font-weight:600}.gwe-focus-return button{min-height:44px;padding:8px 12px;border:1px solid #d4e8ca;border-radius:11px;background:#d4e8ca;color:#173b35;font-size:12px;font-weight:700;cursor:pointer}.gwe-focus-return button:hover{background:#f5f0e5}.gwe-focus-return button:focus-visible{outline:3px solid #f1d094;outline-offset:3px}.gwe-builder-actions .gwe-focus-action{grid-column:1/-1;min-height:48px;background:#d4e8ca;color:#173b35;border-color:#d4e8ca}.gwe-builder-actions .gwe-focus-action:hover{background:#e7f0de}@media(max-width:900px){.gwe-focus-return{top:106px;flex-direction:column;align-items:stretch;gap:4px;max-width:calc(50% - 18px);padding:7px 8px}.gwe-focus-return span{font-size:11px;text-align:center}.gwe-focus-return button{min-width:0;padding:8px 9px;font-size:11px}}",
      ".gwe-builder-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gwe-builder-actions button{min-width:0;min-height:44px;padding:9px 10px;border:1px solid #a1bea44f;border-radius:12px;background:#1c4037;color:#f5f0e5;font-size:12px;font-weight:650;line-height:1.3;cursor:pointer}.gwe-builder-actions button:hover{background:#2a5042;border-color:#c1d6b97d}.gwe-builder-actions button:disabled{opacity:.55;cursor:wait}.gwe-builder-actions .gwe-primary{border-color:#d4e8ca;background:#d4e8ca;color:#112d2b}.gwe-builder-actions .gwe-primary:hover{background:#e3efdc;border-color:#e3efdc}.gwe-builder-quick-actions{flex:0 0 auto;padding:11px 15px 14px;border-bottom:1px solid #b9d1bf26;background:#112d2b}.gwe-builder-quick-actions button{min-height:48px;font-size:12px}.gwe-builder-actions .gwe-showcase-action{background:#f5f0e5;color:#173b35;border-color:#f5f0e5}.gwe-builder-actions .gwe-showcase-action:hover{background:#fffaf0}.gwe-builder-actions .gwe-clear-selection{grid-column:1/-1;justify-self:start;min-height:44px;padding:4px 2px;border:0;background:transparent;color:#bacfc0;font-weight:500;text-decoration:underline;text-underline-offset:3px}.gwe-builder-actions .gwe-clear-selection:hover{color:#fff}.gwe-builder-note{margin:0;color:#bfd2c4;font-size:12px;line-height:1.6}.gwe-builder-note[data-gwe-not-student]{padding:10px;border:1px solid #d9b27588;border-radius:10px;background:#4d3d21;color:#fff0cc}",
      ".gwe-print-ready{padding:13px;border:1px solid #aecda447;border-radius:14px;background:#244c3b66}.gwe-print-ready[data-fit=\"false\"]{border-color:#d7ae6988;background:#4d3d21}.gwe-print-ready-heading{display:flex;gap:8px;justify-content:space-between;align-items:center}.gwe-print-ready-label{color:#c8dec0;font-size:11px;font-weight:600}.gwe-fit-badge{flex:0 0 auto;padding:4px 7px;border-radius:6px;background:#d4e8ca;color:#173b35;font-size:10px;font-weight:750}.gwe-print-ready[data-fit=\"false\"] .gwe-fit-badge{background:#f1d094;color:#3b2e19}.gwe-print-ready strong{display:block;margin-top:8px;color:#f5f0e5;font-size:19px;font-weight:650;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.gwe-print-ready p{margin:7px 0 0;color:#d3e1d0;font-size:12px;line-height:1.6}.gwe-print-ready[data-fit=\"false\"] p{color:#fae8c3}.gwe-print-ready .gwe-print-scale{font-size:11px;color:#b9ceb7}.gwe-print-ready[data-fit=\"false\"] .gwe-print-scale{color:#fae8c3}.gwe-details{border-top:1px solid #c2d7bb30}.gwe-print-ready .gwe-details{margin-top:11px}.gwe-details summary{display:flex;min-height:44px;align-items:center;justify-content:space-between;gap:8px;list-style:none;color:#e2ebdc;font-size:12px;font-weight:600;cursor:pointer}.gwe-details summary::-webkit-details-marker{display:none}.gwe-details summary:after{content:\"+\";font-size:19px;font-weight:400}.gwe-details[open]>summary:after{content:\"−\"}.gwe-details .gwe-print-ready-basis{margin:7px 0 0;color:#c4d8be;font-size:12px;line-height:1.6}.gwe-print-ready[data-fit=\"false\"] .gwe-details .gwe-print-ready-basis{color:#fae8c3}.gwe-details .gwe-builder-note{margin-top:8px}.gwe-connection-check{padding:12px 13px;border:1px solid #abc69b40;border-radius:12px;background:#d4e8ca08}.gwe-connection-check[data-connected=\"false\"]{border-color:#d9b27588;background:#4d3d21}.gwe-connection-check strong{color:#e5eddb;font-size:13px;font-weight:650}.gwe-connection-check p{margin:6px 0 0;color:#c6d7c6;font-size:12px;line-height:1.6}.gwe-connection-check[data-connected=\"false\"] p{color:#fae8c3}.gwe-workspace-options{padding-top:2px}.gwe-workspace-options>.gwe-builder-actions{padding:2px 0 8px}",
      ".gwe-recovery{padding:12px;border:1px solid #a9c7b069;border-radius:12px;background:#234b3c}.gwe-recovery[data-state=\"error\"]{border-color:#eab1a0;background:#552d29}.gwe-recovery strong{display:block;color:#fff5e6;font-size:13px}.gwe-recovery p{margin:6px 0 0;color:#deead7;font-size:12px;line-height:1.6}.gwe-recovery[data-state=\"error\"] p{color:#ffe4da}.gwe-recovery-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.gwe-recovery-actions button{min-height:44px;padding:8px;border:1px solid #c6d7b965;border-radius:10px;background:#173b35;color:#f5f0e5;font-size:12px;font-weight:650;cursor:pointer}.gwe-recovery-actions .gwe-replace{background:#f1d094;border-color:#f1d094;color:#3b2e19}",
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

  function studioCubeMark(h) {
    return h('svg', {viewBox:'0 0 32 32', width:'100%', height:'100%', fill:'none', 'aria-hidden':'true', focusable:'false'},
      h('path', {d:'M16 4 27 10.5v12L16 29 5 22.5v-12L16 4Z', stroke:'currentColor', strokeWidth:1.4, strokeLinejoin:'round'}),
      h('path', {d:'M5 10.5 16 17l11-6.5M16 17v12M10.5 7.25l11 6.5', stroke:'currentColor', strokeWidth:1.4, strokeLinejoin:'round'})
    );
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
      var retainedMeasurementRef = React.useRef(null);
      var editableInputRef = React.useRef(null);
      var editableReadTokenRef = React.useRef(0);
      var _editablePreview = React.useState(null), editablePreview = _editablePreview[0], setEditablePreview = _editablePreview[1];
      var _editableError = React.useState(''), editableError = _editableError[0], setEditableError = _editableError[1];
      var _editableBusy = React.useState(false), editableBusy = _editableBusy[0], setEditableBusy = _editableBusy[1];

      var liveBuilderCtx = React.useRef(ctx); liveBuilderCtx.current = ctx;
      React.useEffect(function () {
        var previousEngine=null, signature='', selectedBlockKeys='', outline=null, outlineOwner=null, selectionPollCache={current:null}, selectionPollResult=null;
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
          if(eng && !eng._showcase && (liveBuilderCtx.current.toolData.geometryWorld || {}).showcaseActive)patchGeometryState(liveBuilderCtx.current,{showcaseActive:false});
          if(!!(eng && eng._creationFocus)!==!!((liveBuilderCtx.current.toolData.geometryWorld || {}).creationFocusAvailable))patchGeometryState(liveBuilderCtx.current,{creationFocusAvailable:!!(eng && eng._creationFocus)});
          if(outline)outline.visible=!(eng && eng._showcase);
          if(eng!==previousEngine){if(previousEngine && previousEngine.disposeShowcaseLook)previousEngine.disposeShowcaseLook();if(previousEngine && previousEngine.disposeCreationFocus)previousEngine.disposeCreationFocus();clearOutline();signature='';selectedBlockKeys='';previousEngine=eng;}
          var selected=polledSelectionMeasurement(eng,selectionPollCache);
          if(selected && selected===selectionPollResult)return;
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
          if(next===signature)return;
          var previousBlockKeys=selectedBlockKeys;selectedBlockKeys=measurementKeys(m);
          signature=next;eng._builderSelection={blocks:m.blocks.slice()};
          var check=null;
          try{var bundle=buildGeometryWorldStl(eng,m.blocks);check={components:bundle.connectedComponents,triangles:bundle.triangleCount,nonManifoldEdges:bundle.topology.nonManifoldEdges,openEdges:bundle.topology.openEdges};}catch(error){check={error:error.message};}
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
        return function(){clearInterval(timer);if(previousEngine && previousEngine.disposeShowcaseLook)previousEngine.disposeShowcaseLook();if(previousEngine && previousEngine.disposeCreationFocus)previousEngine.disposeCreationFocus();clearOutline();};
      },[]);

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
          if (attempts < 1200) timer = setTimeout(restore, 100);
        }
        restore();
        return function () { cancelled = true; if (timer) clearTimeout(timer); };
      }, [isSandbox, hasPendingReturn]);

      if (!base || !React.isValidElement(base)) return base;
      var engine = window[ENGINE_KEY];
      var material = BLOCK_TYPES[Math.max(0, Math.min(BLOCK_TYPES.length - 1, Number(data.selectedBlock) || 0))];
      var shape = BLOCK_SHAPES[Math.max(0, Math.min(BLOCK_SHAPES.length - 1, Number(data.selectedShape) || 0))];
      var currentPrintUnit = printUnit(printContext(ctx).unitMm);
      // The dock describes the creation Send and Showcase will use; the core
      // inspector can independently display a ground or another measurement.
      var measured = retainedSelectionSummary(engine, retainedMeasurementRef) || (data.measureResult && data.measureResult.isComplete !== false ? data.measureResult : null);
      // M measures whatever the crosshair rests on, the ground included. The
      // sandbox floor is a 25 x 25 x 1 'structure' that would otherwise be quoted
      // as a 125 x 125 x 5 mm print that fits, when Send would refuse it.
      var measuredIsStudentBuild = !!(measured && measurementIsStudentBuild(engine, measured));
      var printEnvelope = measuredIsStudentBuild ? defaultPrintEnvelope(measured, storedPrinterProfile(ctx), currentPrintUnit) : null;
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

      if(isSandbox && data.worldActive && data.creationFocusAvailable && engine && engine._creationFocus && !engine._showcase)additions.push(h('div',{key:'gwe-focus-return',className:'gwe-focus-return','aria-label':'Creation camera'},
        h('span',null,'Creation framed'),h('button',{type:'button',onClick:function(){if(engine.restoreCreationView)engine.restoreCreationView();}},'Previous view')));

      if (isSandbox && data.worldActive) additions.push(h('aside', {
        key: 'gwe-dock', className: 'gwe-builder-dock', 'data-collapsed': collapsed ? 'true' : 'false',
        'aria-label': 'Free Build Studio'
      },
        h('div', { className: 'gwe-builder-head' },
          h('div', { className: 'gwe-builder-title' },
            h('span', { className: 'gwe-builder-icon', 'aria-hidden': 'true' }, studioCubeMark(h)),
            !collapsed && h('div', null, h('div', { className: 'gwe-builder-eyebrow' }, 'Sandbox mode'), h('div', { className: 'gwe-builder-name' }, 'Free Build Studio'))
          ),
          h('button', { type: 'button', className: 'gwe-collapse', onClick: function () { patchGeometryState(ctx, { sandboxDockCollapsed: !collapsed, builderPanel:'build' }); }, 'aria-expanded': collapsed ? 'false' : 'true', 'aria-label': collapsed ? 'Expand Free Build Studio' : 'Collapse Free Build Studio' }, collapsed ? 'Build' : '\u2212')
        ),
        !collapsed && h('ol', {className:'gwe-workflow', 'aria-label':'Creation workflow'},
          h('li', {'aria-current': measuredIsStudentBuild ? undefined : 'step'}, h('span', {'aria-hidden':'true'}, '1'), 'Select'),
          h('li', {'aria-current': measuredIsStudentBuild ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '2'), 'Inspect'),
          h('li', null, h('span', {'aria-hidden':'true'}, '3'), 'Print Lab')
        ),
        !collapsed && h('div', {className:'gwe-builder-actions gwe-builder-quick-actions'},
          h('button',{type:'button','aria-label':'Select and measure aimed build',onClick:function(){measureSelectedBuild(ctx);}},'Select build'),
          h('button',{type:'button',className:'gwe-primary','aria-label':'Send selected build to Print Lab',onClick:function(){openSelectedBuildInPrintLab(ctx);}},'Send to Print Lab')
        ),
        !collapsed && h('div', { className: 'gwe-builder-body' },
          h('p', { className: 'gwe-builder-intro' }, measuredIsStudentBuild
            ? 'Your outlined creation stays selected as you look around. Inspect it here, or continue in Print Lab.'
            : 'Aim at a block you placed, then choose Select build to inspect your creation.'),
          h('section', {'aria-label':'Your creation'},
            h('h3', {className:'gwe-section-title'}, 'Your creation'),
            h('div', { className: 'gwe-measure-summary', 'aria-label': 'Build summary' },
              h('div', { className: 'gwe-metric' }, h('strong', null, placed), h('span', null, 'Placed')),
              h('div', { className: 'gwe-metric' }, h('strong', null, measured ? measured.count : '\u2014'), h('span', null, 'Selected')),
              h('div', { className: 'gwe-metric' }, h('strong', null, measured ? measured.L + '\u00D7' + measured.W + '\u00D7' + measured.H : '\u2014'), h('span', null, 'Block bounds'))
            )
          ),
          measured && !measuredIsStudentBuild && h('p', { className: 'gwe-builder-note', 'data-gwe-not-student': 'true', role: 'status' },
            'That measurement was the ground or a lesson structure. Aim at a block you placed to size a print.'),
          measured && h('div', { className: 'gwe-builder-actions', 'aria-label':'Inspect selected creation' },
            measuredIsStudentBuild && h('button',{type:'button',className:'gwe-focus-action',onClick:function(){focusSelectedBuild(ctx);},title:'Frame your creation and keep editing'},'Focus creation'),
            h('button',{type:'button',className:'gwe-showcase-action',onClick:function(){showcaseBuild(ctx);}},'Showcase creation'),
            h('button', {type:'button', onClick:function(){patchGeometryState(ctx,{measureResult:measured,builderPanel:'measure',sandboxDockCollapsed:true,hudPanel:''});}}, 'Explore measurements'),
            engine && engine._builderSelection && h('button', {type:'button',className:'gwe-clear-selection', onClick:function(){engine._builderSelection=null;patchGeometryState(ctx,{measureResult:null,builderPanel:'build'});}}, 'Clear selection')
          ),
          printEnvelope && h('section', { className: 'gwe-print-ready', 'data-fit': printEnvelope.fits ? 'true' : 'false', 'aria-label':'Print Lab block envelope' },
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
            h('details', {className:'gwe-details', open:printEnvelope.fits ? undefined : true},
              h('summary', null, 'Printer profile & scale'),
              h('p', null, printEnvelope.fits
                ? 'Fits the ' + printEnvelope.profileLabel + ' printer profile at ' + currentPrintUnit + ' mm per block. Advisory preflight is still required.'
                : 'The ' + listDimensions(printEnvelope.over) + (printEnvelope.over.length === 1 ? ' dimension is' : ' dimensions are') + ' larger than the ' + printEnvelope.profileLabel + ' printer profile at ' + currentPrintUnit + ' mm per block. Reduce the build or choose a smaller scale in Print Lab.'),
              h('p', { className: 'gwe-print-ready-basis' }, printEnvelope.usingSavedProfile
                ? 'Measured from whole blocks against the printer profile saved in Print Lab. Print Lab measures the exported mesh, so a build made of wedges can report a slightly smaller envelope there.'
                : 'Measured from whole blocks against Print Lab\u2019s default printer profile. Set a school printer in Print Lab to check against the real bed.'),
              printVolumeSentence(measured, currentPrintUnit) && h('p', { className: 'gwe-print-ready-basis', 'data-gwe-print-volume': 'true' }, printVolumeSentence(measured, currentPrintUnit)),
              h('p', { className: 'gwe-builder-note' }, 'Print Lab scale: ' + currentPrintUnit + ' mm per block. Geometry World materials describe appearance only; choose the real filament separately after reviewing its science and tradeoffs.')
            )
          ),
          data.builderPrintCheck && h('div', {className:'gwe-connection-check', role:'status', 'data-connected':selectionNeedsReview(data.builderPrintCheck) ? 'false':'true'},
            h('strong',null,data.builderPrintCheck.error ? 'Check this selection' : data.builderPrintCheck.components>1 ? data.builderPrintCheck.components+' separate pieces' : data.builderPrintCheck.nonManifoldEdges ? 'Touching edges need review' : data.builderPrintCheck.openEdges ? 'Open surfaces need review' : selectionNeedsReview(data.builderPrintCheck) ? 'Review this selection' : 'One joined piece'),
            h('p',null,data.builderPrintCheck.error || (data.builderPrintCheck.components>1 ? 'Some shapes do not touch, even when their grid cells are next to each other. Join them with a base, move the shapes, or plan separate parts in Print Lab.' : data.builderPrintCheck.nonManifoldEdges ? 'Some surfaces meet only along an edge. Add a connecting block or review the highlighted creation in Print Lab.' : data.builderPrintCheck.openEdges ? 'The selected mesh has open edges. Review its surfaces in Print Lab before preparing a print.' : selectionNeedsReview(data.builderPrintCheck) ? 'The selection check is incomplete. Open Print Lab to inspect the exported mesh.' : 'The selected shapes share surfaces. Print Lab will check the exported mesh and physical scale.'))
          ),
          h('section', {'aria-label':'Current block choices'},
            h('h3', {className:'gwe-section-title'}, 'Building with'),
            h('div', { className: 'gwe-selection' },
              h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Material'), h('span', { className: 'gwe-selection-value' }, material.emoji + ' ' + material.name)),
              h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Shape / rotation'), h('span', { className: 'gwe-selection-value' }, shape.emoji + ' ' + shape.name + ' - ' + ((Number(data.blockRotation) || 0) * 90) + '\u00B0'))
            )
          ),
          h('section', {'aria-label':'Keep your work'},
            h('h3', {className:'gwe-section-title'}, 'Keep your work'),
            h('div', { className: 'gwe-builder-actions' },
              h('button', { type: 'button', onClick: function () { saveEditableWorld(ctx); } }, '\uD83D\uDCBE Save editable world'),
              h('button', { type: 'button', disabled: editableBusy, onClick: function () { if (editableInputRef.current) editableInputRef.current.click(); } }, editableBusy ? 'Checking file...' : '\uD83D\uDCC2 Open editable world'),
              h('input', { ref: editableInputRef, type: 'file', accept: '.json,application/json', onChange: chooseEditableWorld, style: { display: 'none' }, tabIndex: -1, 'aria-hidden': 'true' })
            )
          ),
          h('details', {className:'gwe-details gwe-workspace-options'},
            h('summary', null, 'Workspace options'),
            h('div', { className: 'gwe-builder-actions' },
              h('button', { type: 'button', onClick: returnToLessons }, '\uD83D\uDCD8 Choose guided lesson'),
              h('button', { type: 'button', onClick: openLauncher, 'aria-haspopup': 'dialog', 'aria-controls': 'gwe-sandbox-launcher', 'data-gwe-focus-return': 'sandbox-dock' }, '\u2728 Start a fresh sandbox')
            )
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
          )
        )
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

      if(data.showcaseActive) additions.push(h('section', {key:'gwe-showcase',className:'gwe-showcase','data-look':data.showcaseLook || 'meadow','data-view':data.showcaseView || 'perspective',role:'dialog','aria-modal':'true','aria-label':'Showcase creation',onKeyDown:function(event){if(event.key==='ArrowLeft' || event.key==='ArrowRight'){event.preventDefault();var eng=window[ENGINE_KEY];if(eng && eng.rotateShowcase)eng.rotateShowcase(event.key==='ArrowLeft' ? -1:1);}trapDialogKeys(event,function(){var eng=window[ENGINE_KEY];if(eng && eng.endShowcase)eng.endShowcase();});event.stopPropagation();}},
        h('div',{className:'gwe-showcase-caption'},h('span',null,'GEOMETRY WORLD / SHOWCASE'),h('strong',null,'Made by you.'),
          measured && h('p',{className:'gwe-showcase-meta','aria-label':'Creation dimensions'},measured.count+' blocks \u00B7 '+measured.L+' \u00D7 '+measured.W+' \u00D7 '+measured.H+' units'),
          h('div',{className:'gwe-showcase-looks',role:'group','aria-label':'Scene look'},
            ['meadow','studio'].map(function(look){return h('button',{key:look,type:'button','aria-pressed':(data.showcaseLook || 'meadow')===look,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.setShowcaseLook)eng.setShowcaseLook(look);}},look==='meadow'?'Meadow':'Studio');})
          )
        ),
        [-1,1].map(function(step){var label=step<0 ? 'Rotate view left':'Rotate view right';return h('button',{key:label,type:'button',className:'gwe-showcase-orbit gwe-showcase-orbit-'+(step<0 ? 'left':'right'),'aria-label':label,title:label,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.rotateShowcase)eng.rotateShowcase(step);}},h('svg',{viewBox:'0 0 24 24',width:24,height:24,fill:'none','aria-hidden':'true',focusable:'false'},h('path',{d:step<0?'M14 6 8 12l6 6':'M10 6l6 6-6 6',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round'})));}),
        h('div',{className:'gwe-showcase-tools'},
          h('div',{className:'gwe-showcase-views',role:'group','aria-label':'Camera view'},
            ['perspective','front','side','top'].map(function(view){return h('button',{key:view,type:'button','aria-pressed':(data.showcaseView || 'perspective')===view,onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.setShowcaseView)eng.setShowcaseView(view);}},view.charAt(0).toUpperCase()+view.slice(1));})
          ),
          h('div',{className:'gwe-showcase-actions'},
          h('button',{id:'gwe-showcase-close',type:'button',onClick:function(){var eng=window[ENGINE_KEY];if(eng && eng.endShowcase)eng.endShowcase();}},'Back to building'),
          h('button',{type:'button','aria-label':'Save image','aria-busy':!!data.showcaseSaving,'aria-disabled':!!data.showcaseSaving,title:'Save a high-resolution PNG',onClick:function(){saveShowcaseImage(ctx);}},data.showcaseSaving?'Saving image...':'Save image')
          )
        )
      ));
      var children = React.Children.toArray(base.props.children).concat(additions);
      return React.cloneElement(base, {
        className: (base.props.className || '') + ' gwe-enhanced',
        'data-builder-panel': data.builderPanel === 'measure' && data.measureResult ? 'measure' : 'build',
        'data-showcase-active': data.showcaseActive ? 'true':'false',
        'data-showcase-look': data.showcaseLook || 'meadow',
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
