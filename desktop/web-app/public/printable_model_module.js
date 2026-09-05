/**
 * AlloFlow PrintableModel — deterministic browser-side 3D print preflight.
 *
 * This module never decides that a model is safe to print. It validates the
 * supported handoff formats, calculates advisory geometry metrics, creates a
 * privacy-minimized submission package, and exports reviewed scene geometry as
 * binary STL. A trained staff member and the school's slicer remain authoritative.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  window.AlloModules = window.AlloModules || {};
  if (window.AlloModules.PrintableModel) return;

  var VERSION = 'printable/1';
  var JOB_TICKET_VERSION = 'alloflow-print-job/1';
  var GCODE_METADATA_VERSION = 'gcode-comment-metadata/1';
  var PRINTER_ADAPTER_CONTRACT = 'alloflow-printer-adapter/1';
  var SLICER_ADAPTER_CONTRACT = 'alloflow-slicer-adapter/1';
  var GEOMETRY_ADAPTER_CONTRACT = 'alloflow-geometry-adapter/1';
  var LIMITS = { maxBytes: 5 * 1024 * 1024, maxTriangles: 250000, maxMeshes: 128, maxDimensionMm: 300 };
  var REPAIR_LIMITS = { maxBytes: 8 * 1024 * 1024, maxTriangles: 150000 };
  var GCODE_LIMITS = { maxBytes: 25 * 1024 * 1024, maxCommentLines: 20000, maxCommentLength: 512 };
  var FORMATS = { RECIPE: 1, STL: 1, GLB: 1 };
  var SHAPES = { box: 1, sphere: 1, cylinder: 1, cone: 1, torus: 1, lathe: 1, extrude: 1 };
  // Prim3D's default profiles, used when a drawn part arrives without one.
  var DEFAULT_PROFILES = {
    lathe: [[0.42, 0], [0.7, 0.08], [0.82, 0.24], [0.62, 0.48], [0.5, 0.66], [0.66, 0.84], [0.56, 1]],
    extrude: [[0, 1], [0.28, 0.32], [0.95, 0.31], [0.45, -0.12], [0.59, -0.81], [0, -0.4], [-0.59, -0.81], [-0.45, -0.12], [-0.95, 0.31], [-0.28, 0.32]]
  };
  function usableProfile(shape, raw) {
    var pts = Array.isArray(raw) ? raw.filter(function (pt) { return Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number' && !isNaN(pt[0]) && !isNaN(pt[1]); }) : [];
    return pts.length >= 3 ? pts : DEFAULT_PROFILES[shape];
  }
  var REAL_PRINTER_ADAPTERS = ['OCTOPRINT', 'MOONRAKER', 'PRUSALINK', 'BAMBU_CONNECT'];
  var EXTERNAL_SLICER_ADAPTERS = ['CURAENGINE', 'PRUSASLICER', 'ORCASLICER'];
  var EXTERNAL_GEOMETRY_ADAPTERS = ['BOOLEAN_UNION', 'REMESH', 'WALL_THICKNESS', 'TEXT_TO_MESH'];

  function number(v, fallback) { var n = Number(v); return isFinite(n) ? n : (fallback == null ? 0 : fallback); }
  function clamp(v, lo, hi, fallback) { var n = number(v, fallback); return Math.max(lo, Math.min(hi, n)); }
  function text(v, max, fallback) { var out = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim(); return (out || String(fallback || '')).slice(0, max); }
  function round(v, places) { var p = Math.pow(10, places == null ? 2 : places); return Math.round(number(v) * p) / p; }
  function formatOf(v) { var out = String(v || '').trim().toUpperCase(); return FORMATS[out] ? out : ''; }
  function safeFilename(v) { var out = text(v, 120, 'model').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, ''); return out || 'model'; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function stableJson(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + stableJson(value[key]); }).join(',') + '}';
  }
  function bytesOf(input) {
    if (input instanceof Uint8Array) return input;
    if (input && input.buffer instanceof ArrayBuffer) return new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength == null ? input.length : input.byteLength);
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return null;
  }
  function decodeUtf8(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
    var out = '', chunk = 8192;
    for (var i = 0; i < bytes.length; i += chunk) out += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, i, Math.min(bytes.length, i + chunk)));
    try { return decodeURIComponent(escape(out)); } catch (_) { return out; }
  }
  function encodeUtf8(value) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(value));
    var encoded = unescape(encodeURIComponent(String(value))), out = new Uint8Array(encoded.length);
    for (var i = 0; i < encoded.length; i++) out[i] = encoded.charCodeAt(i);
    return out;
  }
  function hex(bytes) { var out = ''; for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0'); return out; }
  function sha256Hex(input) {
    var bytes = typeof input === 'string' ? encodeUtf8(input) : bytesOf(input);
    if (!bytes || !window.crypto || !window.crypto.subtle) return Promise.resolve('');
    return window.crypto.subtle.digest('SHA-256', bytes).then(function (digest) { return hex(new Uint8Array(digest)); });
  }

  function normalizeProfile(input) {
    input = input || {};
    return {
      name: text(input.name, 80, 'School printer'),
      bedWidthMm: clamp(input.bedWidthMm, 50, 1000, 220),
      bedDepthMm: clamp(input.bedDepthMm, 50, 1000, 220),
      bedHeightMm: clamp(input.bedHeightMm, 50, 1000, 250),
      nozzleMm: clamp(input.nozzleMm, 0.1, 2, 0.4),
      maxTriangles: Math.round(clamp(input.maxTriangles, 1000, 1000000, LIMITS.maxTriangles)),
      maxBytes: Math.round(clamp(input.maxBytes, 1024, 50 * 1024 * 1024, LIMITS.maxBytes))
    };
  }

  function issue(code, severity, message) { return { code: code, severity: severity, message: message }; }
  function finalizeMetrics(metrics, profile, extraIssues) {
    profile = normalizeProfile(profile);
    metrics = metrics || {};
    var dims = metrics.dimensionsMm || { width: 0, depth: 0, height: 0 }, issues = (extraIssues || []).slice();
    if (!metrics.triangleCount) issues.push(issue('NO_GEOMETRY', 'ERROR', 'No printable triangles were found.'));
    if (metrics.byteSize > profile.maxBytes) issues.push(issue('FILE_TOO_LARGE', 'ERROR', 'The file exceeds this school’s upload limit.'));
    if (metrics.triangleCount > profile.maxTriangles) issues.push(issue('TOO_MANY_TRIANGLES', 'ERROR', 'The mesh is too complex for this pilot. Simplify it before submitting.'));
    if (dims.width > profile.bedWidthMm || dims.depth > profile.bedDepthMm || dims.height > profile.bedHeightMm) issues.push(issue('BED_FIT', 'ERROR', 'The model does not fit the configured printer build area at this scale.'));
    if (metrics.degenerateTriangles > 0) issues.push(issue('DEGENERATE_TRIANGLES', 'WARNING', metrics.degenerateTriangles + ' zero-area or nearly zero-area triangle(s) need slicer review.'));
    if (metrics.openEdges > 0) issues.push(issue('OPEN_EDGES', 'WARNING', metrics.openEdges + ' boundary edge(s) suggest the mesh may not be watertight.'));
    if (metrics.nonManifoldEdges > 0) issues.push(issue('NON_MANIFOLD_EDGES', 'WARNING', metrics.nonManifoldEdges + ' edge(s) are shared by more than two triangles and require mesh or slicer review.'));
    if (metrics.windingInconsistencies > 0) issues.push(issue('INCONSISTENT_WINDING', 'WARNING', metrics.windingInconsistencies + ' shared edge(s) have same-direction triangle winding.'));
    if (metrics.windingOrientation === 'NEGATIVE' && metrics.openEdges === 0 && metrics.nonManifoldEdges === 0) issues.push(issue('INWARD_WINDING_ADVISORY', 'WARNING', 'The signed-volume orientation is negative. A mesh tool or slicer must confirm whether normals need reversing.'));
    if (metrics.meshCount > 1) issues.push(issue('MULTIPLE_SHELLS', 'WARNING', metrics.meshCount + ' separate mesh/shell component(s) require staff review.'));
    var status = issues.some(function (x) { return x.severity === 'ERROR'; }) ? 'FAIL' : issues.some(function (x) { return x.severity === 'WARNING'; }) ? 'WARN' : 'PASS';
    return Object.assign({}, metrics, { profile: profile, status: status, issues: issues });
  }

  function primitiveExtents(part, globalRotYDeg) {
    var s = part.size || [], shape = String(part.shape || '').toLowerCase(), hx, hy, hz, volume = 0, triangles = 0;
    if (shape === 'box') { hx = number(s[0], .4) / 2; hy = number(s[1], .4) / 2; hz = number(s[2], .4) / 2; volume = 8 * hx * hy * hz; triangles = 12; }
    else if (shape === 'sphere') { hx = hy = hz = number(s[0], .4); volume = 4 / 3 * Math.PI * hx * hx * hx; triangles = 612; }
    else if (shape === 'cylinder') { hx = hz = number(s[0], .4); hy = number(s[1], .4) / 2; volume = Math.PI * hx * hx * hy * 2; triangles = 80; }
    else if (shape === 'cone') { hx = hz = number(s[0], .4); hy = number(s[1], .4) / 2; volume = Math.PI * hx * hx * hy * 2 / 3; triangles = 40; }
    else if (shape === 'torus') { var r = number(s[0], .4), tube = number(s[1], .1); hx = hz = r + tube; hy = tube; volume = 2 * Math.PI * Math.PI * r * tube * tube; triangles = 672; }
    else if (shape === 'lathe') {
      // Prim3D: profile [radius 0..1, height 0..1] scaled by size[0]/size[1],
      // revolved in 28 segments, translated -size[1]/2. Bounds are conservative
      // (full height); volume sums the frustum between consecutive points.
      var prof = usableProfile('lathe', part.profile), R = number(s[0], .4), H = number(s[1], .4), maxR = 0;
      for (var li = 0; li < prof.length; li++) maxR = Math.max(maxR, Math.abs(prof[li][0]));
      hx = hz = maxR * R; hy = H / 2; volume = 0;
      for (var lj = 1; lj < prof.length; lj++) { var r1 = Math.abs(prof[lj - 1][0]) * R, r2 = Math.abs(prof[lj][0]) * R, lh = Math.abs(prof[lj][1] - prof[lj - 1][1]) * H; volume += Math.PI * lh * (r1 * r1 + r1 * r2 + r2 * r2) / 3; }
      triangles = 28 * (prof.length - 1) * 2;
    }
    else if (shape === 'extrude') {
      // Prim3D: outline [x, y] in -1..1 scaled by size[0]/2 and size[1]/2,
      // extruded size[2] deep and translated -size[2]/2. Bounds are conservative
      // about the part position; volume is shoelace area times depth.
      var outline = usableProfile('extrude', part.profile), W = number(s[0], .4) / 2, Hh = number(s[1], .4) / 2, D = number(s[2], .4), maxX = 0, maxY = 0, area = 0;
      for (var ei = 0; ei < outline.length; ei++) {
        var ex = outline[ei][0] * W, ey = outline[ei][1] * Hh, nx = outline[(ei + 1) % outline.length][0] * W, ny = outline[(ei + 1) % outline.length][1] * Hh;
        maxX = Math.max(maxX, Math.abs(ex)); maxY = Math.max(maxY, Math.abs(ey)); area += ex * ny - nx * ey;
      }
      hx = maxX; hy = maxY; hz = D / 2; volume = Math.abs(area) / 2 * D; triangles = (outline.length - 2) * 2 + outline.length * 2;
    }
    else return null;
    var rot = part.rotation || [], rx = number(rot[0]) * Math.PI / 180, ry = number(rot[1]) * Math.PI / 180, rz = number(rot[2]) * Math.PI / 180;
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // Three.js r128 Euler('XYZ') matrix. Keep this in lockstep with Prim3D's
    // preview/export convention so mixed-axis rotations receive correct bounds.
    var m00 = cy * cz, m01 = -cy * sz, m02 = sy;
    var m10 = cx * sz + sx * cz * sy, m11 = cx * cz - sx * sz * sy, m12 = -sx * cy;
    var m20 = sx * sz - cx * cz * sy, m21 = sx * cz + cx * sz * sy, m22 = cx * cy;
    // Prim3D applies recipe.rotY on the parent group after each part's local
    // XYZ Euler rotation. Compose that parent yaw here so preflight bounds
    // describe the same object that preview and STL export produce.
    var gy = number(globalRotYDeg) * Math.PI / 180, cg = Math.cos(gy), sg = Math.sin(gy);
    var n00 = cg * m00 + sg * m20, n01 = cg * m01 + sg * m21, n02 = cg * m02 + sg * m22;
    var n20 = -sg * m00 + cg * m20, n21 = -sg * m01 + cg * m21, n22 = -sg * m02 + cg * m22;
    return { x: Math.abs(n00) * hx + Math.abs(n01) * hy + Math.abs(n02) * hz, y: Math.abs(m10) * hx + Math.abs(m11) * hy + Math.abs(m12) * hz, z: Math.abs(n20) * hx + Math.abs(n21) * hy + Math.abs(n22) * hz, volume: volume, triangles: triangles };
  }

  function inspectRecipe(recipe, unitMm, profile) {
    unitMm = clamp(unitMm, .01, 1000, 20);
    var parts = recipe && Array.isArray(recipe.parts) ? recipe.parts.slice(0, 24) : [], scale = clamp(recipe && recipe.scale, .25, 5, 1), globalRotY = number(recipe && recipe.rotY);
    var globalYaw = globalRotY * Math.PI / 180, globalCos = Math.cos(globalYaw), globalSin = Math.sin(globalYaw);
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], volume = 0, triangles = 0, valid = 0;
    parts.forEach(function (part) {
      if (!part || !SHAPES[String(part.shape || '').toLowerCase()]) return;
      var ext = primitiveExtents(part, globalRotY); if (!ext) return;
      var p = part.position || [], localX = number(p[0]), localZ = number(p[2]);
      var center = [globalCos * localX + globalSin * localZ, number(p[1], .5), -globalSin * localX + globalCos * localZ], e = [ext.x, ext.y, ext.z];
      for (var a = 0; a < 3; a++) { min[a] = Math.min(min[a], (center[a] - e[a]) * scale); max[a] = Math.max(max[a], (center[a] + e[a]) * scale); }
      volume += ext.volume * scale * scale * scale; triangles += ext.triangles; valid++;
    });
    if (!valid) return finalizeMetrics({ sourceFormat: 'RECIPE', byteSize: encodeUtf8(JSON.stringify(recipe || {})).length, triangleCount: 0, meshCount: 0, dimensionsMm: { width: 0, depth: 0, height: 0 }, volumeMm3UpperBound: 0, degenerateTriangles: 0, openEdges: 0 }, profile, []);
    var metrics = { sourceFormat: 'RECIPE', byteSize: encodeUtf8(JSON.stringify(recipe)).length, triangleCount: triangles, meshCount: valid,
      dimensionsMm: { width: round((max[0] - min[0]) * unitMm), depth: round((max[2] - min[2]) * unitMm), height: round((max[1] - min[1]) * unitMm) },
      volumeMm3UpperBound: round(volume * unitMm * unitMm * unitMm), degenerateTriangles: 0, openEdges: 0, unitDeclaration: 'recipe-unit=' + unitMm + 'mm' };
    return finalizeMetrics(metrics, profile, [issue('ASSEMBLY_NOT_UNIONED', 'WARNING', 'Primitive parts are an assembly, not a guaranteed watertight union. Staff must inspect the sliced result.')]);
  }

  function createSpatialVertexIndex(tolerance) {
    return { tolerance: Math.max(1e-9, number(tolerance, 1e-5)), cells: Object.create(null), nextId: 0 };
  }
  function spatialCellKey(x, y, z) { return x + ',' + y + ',' + z; }
  function findOrAddSpatialVertex(index, vertex) {
    var step=index.tolerance,cx=Math.floor(vertex[0]/step),cy=Math.floor(vertex[1]/step),cz=Math.floor(vertex[2]/step),limit=step*step;
    var best=null,bestDistance=Infinity;
    for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++)for(var dz=-1;dz<=1;dz++){
      var entries=index.cells[spatialCellKey(cx+dx,cy+dy,cz+dz)]||[];
      for(var i=0;i<entries.length;i++){
        var point=entries[i].point,px=point[0]-vertex[0],py=point[1]-vertex[1],pz=point[2]-vertex[2],distance=px*px+py*py+pz*pz;
        if(distance<=limit&&(distance<bestDistance||(distance===bestDistance&&(!best||entries[i].id<best.id)))){best=entries[i];bestDistance=distance;}
      }
    }
    if(best)return {point:best.point,key:best.key,matched:true};
    var cellKey=spatialCellKey(cx,cy,cz),created={id:index.nextId++,key:'v'+index.nextId,point:vertex.slice()};
    if(!index.cells[cellKey])index.cells[cellKey]=[];
    index.cells[cellKey].push(created);
    return {point:created.point,key:created.key,matched:false};
  }
  function triangleAreaSquared(a, b, c) {
    var ab = [b[0]-a[0],b[1]-a[1],b[2]-a[2]], ac = [c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    var cross = [ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    return cross[0]*cross[0]+cross[1]*cross[1]+cross[2]*cross[2];
  }
  function signedTetraVolume(a, b, c) {
    return (a[0] * (b[1]*c[2]-b[2]*c[1]) - a[1] * (b[0]*c[2]-b[2]*c[0]) + a[2] * (b[0]*c[1]-b[1]*c[0])) / 6;
  }
  function findRoot(parents, index) {
    while (parents[index] !== index) { parents[index] = parents[parents[index]]; index = parents[index]; }
    return index;
  }
  function unionRoots(parents, a, b) {
    var ra = findRoot(parents, a), rb = findRoot(parents, b);
    if (ra !== rb) parents[Math.max(ra, rb)] = Math.min(ra, rb);
  }
  function addTriangle(stats, a, b, c) {
    var triangleIndex = stats.triangles, points = [a, b, c], vertexKeys=points.map(function(point){return findOrAddSpatialVertex(stats.vertexIndex,point).key;});
    stats.parents[triangleIndex] = triangleIndex;
    points.forEach(function (p) { for (var i = 0; i < 3; i++) { stats.min[i] = Math.min(stats.min[i], p[i]); stats.max[i] = Math.max(stats.max[i], p[i]); } });
    if (triangleAreaSquared(a, b, c) < 1e-18) stats.degenerate++;
    stats.signedVolume += signedTetraVolume(a, b, c);
    [[0,1],[1,2],[2,0]].forEach(function (edge) {
      var x = vertexKeys[edge[0]], y = vertexKeys[edge[1]];
      var forward = x < y, key = forward ? x + '|' + y : y + '|' + x;
      var record = stats.edges[key];
      if (!record) record = stats.edges[key] = { count: 0, forward: 0, reverse: 0, firstTriangle: triangleIndex };
      else unionRoots(stats.parents, triangleIndex, record.firstTriangle);
      record.count++; if (forward) record.forward++; else record.reverse++;
    });
    stats.triangles++;
  }
  function finishTriangleStats(stats, format, byteSize, unitMm, profile, extra) {
    var open = 0, nonManifold = 0, winding = 0;
    Object.keys(stats.edges).forEach(function (key) {
      var edge = stats.edges[key];
      if (edge.count === 1) open++;
      else if (edge.count > 2) nonManifold++;
      if (edge.count === 2 && (edge.forward !== 1 || edge.reverse !== 1)) winding++;
    });
    var roots = Object.create(null);
    for (var i = 0; i < stats.triangles; i++) roots[findRoot(stats.parents, i)] = true;
    var components = stats.triangles ? Object.keys(roots).length : 0;
    var dims = stats.triangles ? { width: round((stats.max[0]-stats.min[0])*unitMm), depth: round((stats.max[2]-stats.min[2])*unitMm), height: round((stats.max[1]-stats.min[1])*unitMm) } : { width: 0, depth: 0, height: 0 };
    var signedVolume = stats.signedVolume * unitMm * unitMm * unitMm;
    var closed = !!stats.triangles && open === 0 && nonManifold === 0 && winding === 0;
    return finalizeMetrics({
      sourceFormat: format, byteSize: byteSize, triangleCount: stats.triangles, meshCount: components,
      connectedComponents: components, dimensionsMm: dims, degenerateTriangles: stats.degenerate,
      openEdges: open, nonManifoldEdges: nonManifold, windingInconsistencies: winding,
      windingOrientation: Math.abs(signedVolume) < 1e-9 ? 'INDETERMINATE' : signedVolume < 0 ? 'NEGATIVE' : 'POSITIVE',
      signedVolumeMm3: round(signedVolume, 3), enclosedVolumeMm3: closed ? round(Math.abs(signedVolume), 3) : null,
      volumeAdvisory: closed ? 'Signed-volume estimate for a topologically closed mesh; the school slicer remains authoritative.' : 'Volume is not reported as enclosed because boundary, topology, or winding findings remain.',
      unitDeclaration: 'file-unit=' + unitMm + 'mm'
    }, profile, extra || []);
  }
  function newTriangleStats(tolerance) { var edgeTolerance=tolerance||1e-5;return { min: [Infinity,Infinity,Infinity], max: [-Infinity,-Infinity,-Infinity], triangles: 0, degenerate: 0, edges: Object.create(null), parents: [], signedVolume: 0, edgeTolerance: edgeTolerance, vertexIndex:createSpatialVertexIndex(edgeTolerance) }; }

  // STL/slicer coordinates are conventionally Z-up; AlloFlow/Three scenes are
  // Y-up. This is the exact inverse of exportBinaryStl's (x, -z, y) mapping.
  function stlToYUp(v) { return [v[0], v[2], -v[1]]; }

  function parseStlTriangles(input, maxTriangles) {
    var bytes = bytesOf(input), result = { bytes: bytes, triangles: [], kind: '', errors: [] };
    if (!bytes) { result.errors.push(issue('INVALID_FILE','ERROR','The STL data could not be read.')); return result; }
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), binaryCount = bytes.length >= 84 ? dv.getUint32(80, true) : 0;
    if (84 + binaryCount * 50 === bytes.length && bytes.length >= 84) {
      result.kind = 'BINARY';
      if (binaryCount > maxTriangles) { result.declaredTriangles = binaryCount; return result; }
      for (var i = 0, offset = 84; i < binaryCount; i++, offset += 50) {
        var verts = [], valid = true;
        for (var v = 0; v < 3; v++) {
          var o = offset + 12 + v * 12, vertex = [dv.getFloat32(o,true),dv.getFloat32(o+4,true),dv.getFloat32(o+8,true)];
          if (!isFinite(vertex[0]) || !isFinite(vertex[1]) || !isFinite(vertex[2])) valid = false;
          verts.push(vertex);
        }
        if (!valid) { result.errors.push(issue('NON_FINITE_VERTEX','ERROR','The STL contains a non-finite vertex value.')); break; }
        result.triangles.push(verts);
      }
      return result;
    }
    result.kind = 'ASCII';
    var ascii = decodeUtf8(bytes), match, vertices = [], re = /\bvertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)/gi;
    while ((match = re.exec(ascii)) && result.triangles.length <= maxTriangles) {
      var parsed = [Number(match[1]),Number(match[2]),Number(match[3])];
      if (!isFinite(parsed[0]) || !isFinite(parsed[1]) || !isFinite(parsed[2])) { result.errors.push(issue('NON_FINITE_VERTEX','ERROR','The STL contains a non-finite vertex value.')); break; }
      vertices.push(parsed); if (vertices.length === 3) { result.triangles.push(vertices); vertices = []; }
    }
    if (!result.triangles.length) result.errors.push(issue('INVALID_STL','ERROR','The file is not a supported binary or ASCII STL.'));
    if (vertices.length) result.errors.push(issue('INCOMPLETE_STL','ERROR','The ASCII STL contains an incomplete triangle.'));
    if (result.triangles.length > maxTriangles) result.declaredTriangles = result.triangles.length;
    return result;
  }

  function inspectStl(input, unitMm, profile) {
    var bytes = bytesOf(input), p = normalizeProfile(profile), stats = newTriangleStats(), issues = [];
    if (!bytes) return finalizeMetrics({ sourceFormat: 'STL', byteSize: 0, triangleCount: 0, meshCount: 0, dimensionsMm: {width:0,depth:0,height:0},degenerateTriangles:0,openEdges:0,nonManifoldEdges:0,windingInconsistencies:0 }, p, [issue('INVALID_FILE','ERROR','The STL data could not be read.')]);
    if (bytes.length > p.maxBytes) return finalizeMetrics({ sourceFormat: 'STL', byteSize: bytes.length, triangleCount: 0, meshCount: 0, dimensionsMm: {width:0,depth:0,height:0},degenerateTriangles:0,openEdges:0,nonManifoldEdges:0,windingInconsistencies:0 }, p, []);
    var parsed = parseStlTriangles(bytes, p.maxTriangles);
    if (parsed.declaredTriangles > p.maxTriangles) return finalizeMetrics({ sourceFormat:'STL',byteSize:bytes.length,triangleCount:parsed.declaredTriangles,meshCount:1,dimensionsMm:{width:0,depth:0,height:0},degenerateTriangles:0,openEdges:0,nonManifoldEdges:0,windingInconsistencies:0 }, p, parsed.errors);
    parsed.triangles.forEach(function (triangle) { addTriangle(stats, stlToYUp(triangle[0]), stlToYUp(triangle[1]), stlToYUp(triangle[2])); });
    issues = issues.concat(parsed.errors);
    return finishTriangleStats(stats, 'STL', bytes.length, clamp(unitMm,.01,1000,1), p, issues);
  }

  function trianglesToBinaryStl(triangles, headerText) {
    var buffer = new ArrayBuffer(84 + triangles.length * 50), view = new DataView(buffer), header = encodeUtf8(text(headerText, 79, 'AlloFlow conservative STL repair'));
    new Uint8Array(buffer, 0, Math.min(80, header.length)).set(header.slice(0, 80));
    view.setUint32(80, triangles.length, true);
    var offset = 84;
    triangles.forEach(function (triangle) {
      var a=triangle[0],b=triangle[1],c=triangle[2],ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      var normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],length=Math.hypot(normal[0],normal[1],normal[2])||1;
      normal=[normal[0]/length,normal[1]/length,normal[2]/length];
      [normal,a,b,c].forEach(function (vertex) { view.setFloat32(offset,vertex[0],true);view.setFloat32(offset+4,vertex[1],true);view.setFloat32(offset+8,vertex[2],true);offset+=12; });
      view.setUint16(offset,0,true);offset+=2;
    });
    return buffer;
  }

  function repairStl(input, options) {
    options=options||{};var profile=normalizeProfile(options.profile),bytes=bytesOf(input),tolerance=clamp(options.weldTolerance,1e-9,0.1,1e-5);
    if(!bytes)return {ok:false,errors:['The STL data could not be read.'],buffer:null};
    var maxRepairBytes=Math.min(profile.maxBytes,REPAIR_LIMITS.maxBytes),maxRepairTriangles=Math.min(profile.maxTriangles,REPAIR_LIMITS.maxTriangles);
    if(bytes.length>maxRepairBytes)return {ok:false,errors:['The STL exceeds the repair-specific local byte limit.'],buffer:null};
    var parsed=parseStlTriangles(bytes,maxRepairTriangles);
    if(parsed.declaredTriangles>maxRepairTriangles)return {ok:false,errors:['The STL exceeds the repair-specific local triangle limit.'],buffer:null};
    if(parsed.errors.some(function(x){return x.severity==='ERROR';}))return {ok:false,errors:parsed.errors.map(function(x){return x.message;}),buffer:null};
    var welded=createSpatialVertexIndex(tolerance),adjusted=0,removed=0,repaired=[];
    parsed.triangles.forEach(function(triangle){
      var next=triangle.map(function(vertex){var match=findOrAddSpatialVertex(welded,vertex),canonical=match.point;if(match.matched&&(canonical[0]!==vertex[0]||canonical[1]!==vertex[1]||canonical[2]!==vertex[2]))adjusted++;return canonical.slice();});
      if(triangleAreaSquared(next[0],next[1],next[2])<1e-18){removed++;return;}repaired.push(next);
    });
    if(!repaired.length)return {ok:false,errors:['Conservative repair removed every triangle; no repaired STL was created.'],buffer:null,removedDegenerateTriangles:removed,weldedVertexReferences:adjusted};
    var output=trianglesToBinaryStl(repaired,'AlloFlow local conservative repair; slicer review required');
    var report=inspectStl(output,clamp(options.unitMm,.01,1000,1),profile);
    report=finalizeMetrics(report,profile,[issue('CONSERVATIVE_REPAIR_ONLY','WARNING','Repair only welded near-identical vertices and removed degenerate triangles. It did not fill holes, union shells, remesh, check wall thickness, or certify printability.')]);
    return {ok:true,buffer:output,report:report,inputTriangleCount:parsed.triangles.length,outputTriangleCount:repaired.length,removedDegenerateTriangles:removed,weldedVertexReferences:adjusted,weldTolerance:tolerance,method:'conservative-stl-repair/1',advisory:'The repaired file is not claimed to be watertight, manifold, structurally safe, or ready to print.'};
  }

  function buildStlObject(THREE, input, unitMm, materialOptions) {
    var bytes=bytesOf(input);if(!THREE||!bytes||bytes.length<15)return null;var values=[],dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),count=bytes.length>=84?dv.getUint32(80,true):0;
    if(count&&84+count*50===bytes.length){for(var i=0,offset=84;i<count;i++,offset+=50){for(var v=0;v<3;v++){var o=offset+12+v*12;values.push(dv.getFloat32(o,true),dv.getFloat32(o+4,true),dv.getFloat32(o+8,true));}}}
    else{var ascii=decodeUtf8(bytes),match,re=/\bvertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)/gi;while((match=re.exec(ascii)))values.push(Number(match[1]),Number(match[2]),Number(match[3]));}
    if(values.length<9||values.length%9!==0)return null;var scale=clamp(unitMm,.01,1000,1),array=new Float32Array(values.length);for(var j=0;j<values.length;j+=3){array[j]=values[j]*scale;array[j+1]=values[j+2]*scale;array[j+2]=-values[j+1]*scale;}
    var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(array,3));if(geometry.computeVertexNormals)geometry.computeVertexNormals();if(geometry.computeBoundingBox)geometry.computeBoundingBox();
    var opts=Object.assign({color:0x60a5fa,roughness:.62,metalness:.04,side:THREE.DoubleSide},materialOptions||{});var mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial(opts));mesh.userData=mesh.userData||{};mesh.userData.printLabImported=true;return mesh;
  }

  function inspectGlb(input, unitMm, profile) {
    var bytes = bytesOf(input), p = normalizeProfile(profile), errors = [], metrics = { sourceFormat:'GLB',byteSize:bytes?bytes.length:0,triangleCount:0,meshCount:0,dimensionsMm:{width:0,depth:0,height:0},degenerateTriangles:0,openEdges:0,unitDeclaration:'glTF-meter' };
    if (!bytes || bytes.length < 20) return finalizeMetrics(metrics,p,[issue('INVALID_GLB','ERROR','The GLB file is incomplete.')]);
    if (bytes.length > p.maxBytes) return finalizeMetrics(metrics,p,[]);
    var dv = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if (dv.getUint32(0,true)!==0x46546c67 || dv.getUint32(4,true)!==2 || dv.getUint32(8,true)!==bytes.length) return finalizeMetrics(metrics,p,[issue('INVALID_GLB','ERROR','Only complete GLB version 2 files are supported.')]);
    var offset=12,json=null;
    while(offset+8<=bytes.length){var len=dv.getUint32(offset,true),type=dv.getUint32(offset+4,true),start=offset+8,end=start+len;if(end>bytes.length){errors.push(issue('INVALID_GLB','ERROR','A GLB chunk extends beyond the file.'));break}if(type===0x4e4f534a){try{json=JSON.parse(decodeUtf8(bytes.slice(start,end)).replace(/\u0000+$/,''));}catch(_){errors.push(issue('INVALID_GLB_JSON','ERROR','The GLB JSON chunk is invalid.'));}}offset=end;}
    if(!json)return finalizeMetrics(metrics,p,errors.concat([issue('GLB_JSON_MISSING','ERROR','The GLB has no readable JSON scene description.')]));
    var decoderExtensions={KHR_draco_mesh_compression:1,EXT_meshopt_compression:1,KHR_texture_basisu:1};
    (json.extensionsRequired||[]).forEach(function(name){if(decoderExtensions[name])errors.push(issue('DECODER_REQUIRED','ERROR','This GLB requires '+name+', which is outside the no-decoder school pilot. Export a standard embedded GLB.'));});
    var external=false; (json.buffers||[]).concat(json.images||[]).forEach(function(x){if(x&&x.uri&&!/^data:/i.test(x.uri))external=true;});
    if(external)errors.push(issue('EXTERNAL_RESOURCE','ERROR','GLB files must embed all geometry and images; external resource URLs are not allowed.'));
    var accessors=json.accessors||[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],triangles=0,meshes=0;
    (json.meshes||[]).forEach(function(mesh){(mesh.primitives||[]).forEach(function(primitive){meshes++;var mode=primitive.mode==null?4:primitive.mode;if(mode!==4){errors.push(issue('UNSUPPORTED_PRIMITIVE','ERROR','Only triangle primitives are supported.'));return}var count=0;if(primitive.indices!=null&&accessors[primitive.indices])count=number(accessors[primitive.indices].count);else if(primitive.attributes&&primitive.attributes.POSITION!=null&&accessors[primitive.attributes.POSITION])count=number(accessors[primitive.attributes.POSITION].count);triangles+=Math.floor(count/3);var pa=primitive.attributes&&accessors[primitive.attributes.POSITION];if(pa&&Array.isArray(pa.min)&&Array.isArray(pa.max)){for(var a=0;a<3;a++){min[a]=Math.min(min[a],number(pa.min[a]));max[a]=Math.max(max[a],number(pa.max[a]));}}});});
    metrics.triangleCount=triangles;metrics.meshCount=meshes;
    var scale=clamp(unitMm,.01,100000,1000);if(isFinite(min[0]))metrics.dimensionsMm={width:round((max[0]-min[0])*scale),depth:round((max[2]-min[2])*scale),height:round((max[1]-min[1])*scale)};
    errors.push(issue('GLB_TRANSFORMS_REQUIRE_REVIEW','WARNING','GLB node transforms and scene scale require visual staff review before quoting.'));
    return finalizeMetrics(metrics,p,errors);
  }

  function estimateMaterial(report, input) {
    input=input||{};var density=clamp(input.densityGPerCm3,.1,10,1.24),infill=clamp(input.infillPercent,0,100,20)/100,support=clamp(input.supportPercent,0,200,10)/100;
    var volume=number(report&&report.volumeMm3UpperBound);var effective=volume*(.22+.78*infill)*(1+support),grams=effective/1000*density;
    return { estimatedGrams:round(grams,1),infillPercent:round(infill*100),supportPercent:round(support*100),densityGPerCm3:density,method:'advisory-upper-bound-v1' };
  }
  function estimatePointQuote(material,input){
    input=input||{};
    var base=clamp(input.basePoints,0,100000,0),setup=clamp(input.setupPoints,0,100000,0),pointsPerGram=clamp(input.pointsPerGram,0,1000,2);
    var pointsPerHour=clamp(input.pointsPerHour,0,100000,0),minutes=clamp(input.estimatedMinutes,0,1000000,0),complexityMultiplier=clamp(input.complexityMultiplier,.25,10,1);
    var complexityPoints=clamp(input.complexityPoints,0,100000,0),minimum=Math.round(clamp(input.minimumPoints,0,100000,10)),increment=Math.max(1,Math.round(clamp(input.roundingIncrement,1,10000,1)));
    var materialPoints=number(material&&material.estimatedGrams)*pointsPerGram,timePoints=minutes/60*pointsPerHour;
    var subtotal=base+setup+materialPoints+timePoints,complexityAdjustment=subtotal*(complexityMultiplier-1)+complexityPoints,raw=Math.max(minimum,subtotal+complexityAdjustment);
    var total=Math.ceil(raw/increment)*increment;
    return {version:'point-quote/1',totalPoints:total,rawPoints:round(raw,3),roundingIncrement:increment,minimumPoints:minimum,estimatedMinutes:round(minutes,1),breakdown:{base:round(base,3),setup:round(setup,3),material:round(materialPoints,3),time:round(timePoints,3),complexity:round(complexityAdjustment,3)},inputs:{estimatedGrams:round(number(material&&material.estimatedGrams),2),pointsPerGram:pointsPerGram,pointsPerHour:pointsPerHour,complexityMultiplier:complexityMultiplier},advisory:'This configurable point estimate is not a charge. Staff must approve the final slicer-based quote.'};
  }
  function estimateQuote(material,input){return estimatePointQuote(material,input).totalPoints;}

  function parseDurationSeconds(value) {
    var raw=String(value||'').trim(),seconds=0,matched=false,match;
    var re=/(\d+(?:\.\d+)?)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?|s(?:ec(?:onds?)?)?)/gi;
    while((match=re.exec(raw))){matched=true;var amount=number(match[1]),unit=match[2].toLowerCase();seconds+=amount*(unit.charAt(0)==='d'?86400:unit.charAt(0)==='h'?3600:unit.charAt(0)==='m'?60:1);}
    if(!matched&&/^\d+(?:\.\d+)?$/.test(raw))seconds=number(raw);
    return Math.max(0,Math.round(seconds));
  }
  function parseLengthMm(value, unit) {
    var amount=number(value),u=String(unit||'mm').toLowerCase();
    return round(amount*(u==='m'?1000:u==='cm'?10:1),2);
  }
  function parseGcodeMetadata(input, options) {
    options=options||{};var bytes=typeof input==='string'?encodeUtf8(input):bytesOf(input),errors=[];
    if(!bytes)return {ok:false,errors:['The G-code metadata file could not be read.'],value:null};
    var limit=Math.round(clamp(options.maxBytes,1024,100*1024*1024,GCODE_LIMITS.maxBytes));
    if(bytes.length>limit)return {ok:false,errors:['The G-code file exceeds the local metadata-reading limit.'],value:null};
    var source=decodeUtf8(bytes),lines=source.split(/\r?\n/),comments=[],truncated=false;
    for(var i=0;i<lines.length;i++){
      var line=lines[i].trim();if(line.charAt(0)!==';')continue;
      if(comments.length>=GCODE_LIMITS.maxCommentLines){truncated=true;break;}
      comments.push(line.slice(1,GCODE_LIMITS.maxCommentLength+1).trim());
    }
    var out={version:GCODE_METADATA_VERSION,byteSize:bytes.length,commentLinesRead:comments.length,slicer:'',slicerVersion:'',flavor:'',estimatedTimeSeconds:0,filamentLengthMm:0,filamentGrams:0,layerHeightMm:0,layerCount:0,metadataOnly:true,truncated:truncated};
    comments.forEach(function(comment){var m;
      if(!out.slicer&&(m=comment.match(/(?:generated by|sliced by)\s+([A-Za-z][A-Za-z0-9 _.-]*?)(?:\s+v?(\d[\w.+-]*))?$/i))){out.slicer=text(m[1],80,'');out.slicerVersion=text(m[2],40,'');}
      if(!out.slicer&&(m=comment.match(/^(Cura|PrusaSlicer|SuperSlicer|OrcaSlicer|BambuStudio|Simplify3D)\b\s*v?([\w.+-]*)/i))){out.slicer=text(m[1],80,'');out.slicerVersion=text(m[2],40,'');}
      if(!out.flavor&&(m=comment.match(/^FLAVOR\s*:\s*([A-Za-z0-9_.-]+)/i)))out.flavor=text(m[1],40,'');
      if(!out.estimatedTimeSeconds&&(m=comment.match(/^TIME\s*:\s*(\d+(?:\.\d+)?)/i)))out.estimatedTimeSeconds=parseDurationSeconds(m[1]);
      if(!out.estimatedTimeSeconds&&(m=comment.match(/estimated printing time[^:=]*[:=]\s*(.+)$/i)))out.estimatedTimeSeconds=parseDurationSeconds(m[1]);
      if(!out.filamentGrams&&(m=comment.match(/(?:total\s+)?filament\s+weight\s*(?:\[g\]|\(g\))?\s*[:=]\s*(\d+(?:\.\d+)?)\s*g?\b/i)))out.filamentGrams=round(number(m[1]),2);
      if(!out.filamentGrams&&(m=comment.match(/(?:total\s+)?filament(?:\s+used)?\s*(?:\[g\]|\(g\))\s*[:=]\s*(\d+(?:\.\d+)?)/i)))out.filamentGrams=round(number(m[1]),2);
      if(!out.filamentGrams&&(m=comment.match(/(?:total\s+)?filament(?:\s+used)?\s*[:=]\s*(\d+(?:\.\d+)?)\s*g\b/i)))out.filamentGrams=round(number(m[1]),2);
      if(!out.filamentLengthMm&&(m=comment.match(/(?:total\s+)?filament(?:\s+used|\s+length)?\s*(?:\[(mm|cm|m)\]|\((mm|cm|m)\))?\s*[:=]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?\b/i)))out.filamentLengthMm=parseLengthMm(m[3],m[1]||m[2]||m[4]||'mm');
      if(!out.layerHeightMm&&(m=comment.match(/layer[_ ]height\s*[:=]\s*(\d+(?:\.\d+)?)/i)))out.layerHeightMm=round(number(m[1]),4);
      if(!out.layerCount&&(m=comment.match(/(?:total\s+)?layer(?:\s+number|\s+count)?\s*[:=]\s*(\d+)/i)))out.layerCount=Math.round(number(m[1]));
    });
    if(!comments.length)errors.push('No semicolon-prefixed slicer metadata comments were found. Toolpath commands were not interpreted.');
    return {ok:!errors.length,errors:errors,value:out};
  }
  function normalizeGcodeMetadata(input){input=input||{};return {version:GCODE_METADATA_VERSION,byteSize:Math.round(clamp(input.byteSize,0,GCODE_LIMITS.maxBytes,0)),commentLinesRead:Math.round(clamp(input.commentLinesRead,0,GCODE_LIMITS.maxCommentLines,0)),slicer:text(input.slicer,80,''),slicerVersion:text(input.slicerVersion,40,''),flavor:text(input.flavor,40,''),estimatedTimeSeconds:Math.round(clamp(input.estimatedTimeSeconds,0,10000000,0)),filamentLengthMm:round(clamp(input.filamentLengthMm,0,100000000,0),2),filamentGrams:round(clamp(input.filamentGrams,0,1000000,0),2),layerHeightMm:round(clamp(input.layerHeightMm,0,100,0),4),layerCount:Math.round(clamp(input.layerCount,0,10000000,0)),metadataOnly:true,truncated:!!input.truncated};}
  function hashGcodeMetadata(input){return sha256Hex(stableJson(normalizeGcodeMetadata(input)));}

  function sha256Value(value){var raw=String(value||'').trim().toLowerCase();return /^[0-9a-f]{64}$/.test(raw)?raw:'';}
  function normalizeMaterialReview(input){input=input||{};return {key:text(input.key||input.id,40,''),name:text(input.name,80,''),densityGPerCm3:round(clamp(input.densityGPerCm3,.1,10,1.24),3),reviewed:input.reviewed===true};}
  function normalizeProfileReview(input){input=input||{};var p=normalizeProfile(input);return {key:text(input.key||input.id,60,''),name:p.name,bedWidthMm:p.bedWidthMm,bedDepthMm:p.bedDepthMm,bedHeightMm:p.bedHeightMm,nozzleMm:p.nozzleMm,reviewed:input.reviewed===true};}
  function normalizePrintJobTicket(input){
    input=input||{};var model=input.model||{},review=input.review||{},estimate=input.advisoryEstimate||{},gcode=input.gcode||{},integrity=input.integrity||{};
    return {version:JOB_TICKET_VERSION,model:{sha256:sha256Value(model.sha256),sourceFormat:formatOf(model.sourceFormat),unitDeclaration:text(model.unitDeclaration,60,''),dimensionsMm:{width:round(clamp(model.dimensionsMm&&model.dimensionsMm.width,0,100000,0),2),depth:round(clamp(model.dimensionsMm&&model.dimensionsMm.depth,0,100000,0),2),height:round(clamp(model.dimensionsMm&&model.dimensionsMm.height,0,100000,0),2)}},review:{material:normalizeMaterialReview(review.material),printerProfile:normalizeProfileReview(review.printerProfile)},advisoryEstimate:{materialGrams:round(clamp(estimate.materialGrams,0,1000000,0),2),printMinutes:round(clamp(estimate.printMinutes,0,1000000,0),1),pointQuote:Math.round(clamp(estimate.pointQuote,0,10000000,0)),method:text(estimate.method,80,'staff-review-required')},gcode:{metadataSha256:sha256Value(gcode.metadataSha256),parserVersion:GCODE_METADATA_VERSION,metadataOnly:true},createdAt:text(input.createdAt,40,new Date().toISOString()),execution:{mode:'SIMULATION_OR_EXTERNAL_REVIEW_ONLY',commandsIncluded:false,credentialsIncluded:false},integrity:{algorithm:text(integrity.algorithm,20,''),payloadSha256:sha256Value(integrity.payloadSha256),scope:text(integrity.scope,40,'')}};
  }
  function printJobTicketPayload(input){var value=normalizePrintJobTicket(input),payload=clone(value);delete payload.integrity;return payload;}
  function validatePrintJobTicket(input,requireDigest){
    var value=normalizePrintJobTicket(input),errors=[];
    if(!value.model.sha256)errors.push('A verified SHA-256 model hash is required.');
    if(!value.model.sourceFormat)errors.push('The model format must be RECIPE, STL, or GLB.');
    if(!value.review.material.key||!value.review.material.reviewed)errors.push('A reviewed material selection is required.');
    if(!value.review.printerProfile.key||!value.review.printerProfile.reviewed)errors.push('A reviewed printer profile is required.');
    if(!(value.advisoryEstimate.materialGrams>0))errors.push('A positive slicer or reviewed material estimate in grams is required.');
    if(!value.gcode.metadataSha256)errors.push('A SHA-256 hash of locally parsed G-code comment metadata is required.');
    if(requireDigest!==false&&(value.integrity.algorithm!=='SHA-256'||!value.integrity.payloadSha256||value.integrity.scope!=='ticket-without-integrity'))errors.push('A complete SHA-256 print job ticket payload digest is required.');
    return {ok:!errors.length,errors:errors,value:value};
  }
  function createPrintJobTicket(input){
    input=input||{};var metadata=input.gcodeMetadata?normalizeGcodeMetadata(input.gcodeMetadata):null;
    var hashPromise=sha256Value(input.gcodeMetadataHash)?Promise.resolve(sha256Value(input.gcodeMetadataHash)):metadata?hashGcodeMetadata(metadata):Promise.resolve('');
    return hashPromise.then(function(metadataHash){
      var draft={model:{sha256:input.modelHash,sourceFormat:input.sourceFormat,unitDeclaration:input.unitDeclaration,dimensionsMm:input.dimensionsMm},review:{material:input.material,printerProfile:input.printerProfile},advisoryEstimate:input.advisoryEstimate,gcode:{metadataSha256:metadataHash},createdAt:input.createdAt};
      var checked=validatePrintJobTicket(draft,false);if(!checked.ok)throw new Error(checked.errors.join(' '));
      return sha256Hex(stableJson(printJobTicketPayload(checked.value))).then(function(payloadHash){
        if(!payloadHash)throw new Error('The print job ticket payload digest could not be calculated.');
        checked.value.integrity={algorithm:'SHA-256',payloadSha256:payloadHash,scope:'ticket-without-integrity'};
        return validatePrintJobTicket(checked.value).value;
      });
    });
  }
  function verifyPrintJobTicketIntegrity(input){
    var checked=validatePrintJobTicket(input);if(!checked.ok)return Promise.resolve(checked);
    return sha256Hex(stableJson(printJobTicketPayload(checked.value))).then(function(payloadHash){
      var errors=[];if(!payloadHash)errors.push('The print job ticket payload digest could not be calculated.');
      else if(payloadHash!==checked.value.integrity.payloadSha256)errors.push('Print job ticket payload digest does not match.');
      return {ok:!errors.length,errors:errors,value:checked.value};
    });
  }
  function serializePrintJobTicket(input){var checked=validatePrintJobTicket(input);if(!checked.ok)throw new Error(checked.errors.join(' '));return JSON.stringify(checked.value,null,2);}
  function parsePrintJobTicket(value){var parsed;try{parsed=JSON.parse(String(value||''));}catch(_){return {ok:false,errors:['The print job ticket is not valid JSON.'],value:null};}if(!parsed||parsed.version!==JOB_TICKET_VERSION)return {ok:false,errors:['Unsupported print job ticket version.'],value:null};return validatePrintJobTicket(parsed);}

  function disabledAdapter(contract,id,reason){
    return {contract:contract,id:id,enabled:false,executionEnabled:false,reason:reason,run:function(){return Promise.reject(new Error(reason));}};
  }
  function createSlicerAdapter(id){
    var key=String(id||'GCODE_METADATA_IMPORT').toUpperCase();
    if(key==='GCODE_METADATA_IMPORT')return {contract:SLICER_ADAPTER_CONTRACT,id:key,enabled:true,executionEnabled:false,capabilities:['COMMENT_METADATA_IMPORT'],parseMetadata:parseGcodeMetadata,reason:'This local adapter reads allowlisted slicer comments only; it does not slice geometry or interpret toolpath commands.'};
    return disabledAdapter(SLICER_ADAPTER_CONTRACT,key,'External slicer adapter '+key+' is disabled. Export the model, slice it in an approved school application, then import comment metadata.');
  }
  function createGeometryAdapter(id){
    var key=String(id||'CONSERVATIVE_STL_REPAIR').toUpperCase();
    if(key==='CONSERVATIVE_STL_REPAIR')return {contract:GEOMETRY_ADAPTER_CONTRACT,id:key,enabled:true,executionEnabled:true,capabilities:['REMOVE_DEGENERATES','WELD_NEAR_IDENTICAL_VERTICES'],repair:repairStl,reason:'Local conservative repair only; no watertightness or safety claim.'};
    return disabledAdapter(GEOMETRY_ADAPTER_CONTRACT,key,'Advanced geometry capability '+key+' is disabled until an approved local engine is installed and reviewed.');
  }
  function getEngineCapabilities(){
    return {slicer:{contract:SLICER_ADAPTER_CONTRACT,embeddedSlicing:false,enabled:['GCODE_METADATA_IMPORT'],disabled:EXTERNAL_SLICER_ADAPTERS.slice()},geometry:{contract:GEOMETRY_ADAPTER_CONTRACT,enabled:['CONSERVATIVE_STL_REPAIR'],disabled:EXTERNAL_GEOMETRY_ADAPTERS.slice(),claimsWatertight:false,checksWallThickness:false,generatesTextMesh:false},printer:{contract:PRINTER_ADAPTER_CONTRACT,enabled:['SIMULATOR'],disabled:REAL_PRINTER_ADAPTERS.slice(),networkExecution:false}};
  }

  function normalizeTelemetryState(input){
    input=input||{};return {version:'alloflow-printer-telemetry/1',sequence:Math.max(0,Math.round(number(input.sequence))),jobs:input.jobs&&typeof input.jobs==='object'?clone(input.jobs):{},printers:input.printers&&typeof input.printers==='object'?clone(input.printers):{},lastEvent:input.lastEvent&&typeof input.lastEvent==='object'?clone(input.lastEvent):null};
  }
  function reducePrinterTelemetry(previous,event){
    var state=normalizeTelemetryState(previous),raw=event||{},type=String(raw.type||'').toUpperCase();
    var allowed={PRINTER_REGISTERED:1,JOB_QUEUED:1,JOB_STARTED:1,JOB_PROGRESS:1,JOB_PAUSED:1,JOB_READY:1,JOB_FAILED:1,JOB_CANCELED:1};
    if(!allowed[type])return state;
    var printerKey=text(raw.printerKey,60,''),jobKey=text(raw.jobKey,60,''),atMinute=round(clamp(raw.atMinute,0,100000000,0),2),job,printer,nextState;
    if(type==='PRINTER_REGISTERED'){
      if(!printerKey||state.printers[printerKey])return state;
      state.printers[printerKey]={key:printerKey,state:'IDLE',activeJobKey:'',progressPercent:0,updatedAtMinute:atMinute};
    }else if(type==='JOB_QUEUED'){
      if(!jobKey||!printerKey||!state.printers[printerKey]||state.jobs[jobKey])return state;
      job={key:jobKey,printerKey:printerKey,state:'QUEUED',progressPercent:0,updatedAtMinute:atMinute};state.jobs[jobKey]=job;
      printer=state.printers[printerKey];printer.state='QUEUED';printer.activeJobKey=jobKey;printer.progressPercent=0;printer.updatedAtMinute=atMinute;
    }else{
      job=state.jobs[jobKey];
      if(!job||!printerKey||job.printerKey!==printerKey||!state.printers[printerKey])return state;
      var transitions={QUEUED:{JOB_STARTED:'PRINTING',JOB_FAILED:'FAILED',JOB_CANCELED:'CANCELED'},PRINTING:{JOB_PROGRESS:'PRINTING',JOB_PAUSED:'PAUSED',JOB_READY:'READY',JOB_FAILED:'FAILED',JOB_CANCELED:'CANCELED'},PAUSED:{JOB_STARTED:'PRINTING',JOB_FAILED:'FAILED',JOB_CANCELED:'CANCELED'}};
      nextState=transitions[job.state]&&transitions[job.state][type];if(!nextState)return state;
      job.state=nextState;
      if(type==='JOB_PROGRESS'||type==='JOB_READY')job.progressPercent=Math.max(number(job.progressPercent),type==='JOB_READY'?100:round(clamp(raw.progressPercent,0,100,0),1));
      job.updatedAtMinute=atMinute;printer=state.printers[printerKey];
      if(['READY','FAILED','CANCELED'].indexOf(job.state)>=0){if(printer.activeJobKey===jobKey){printer.state='IDLE';printer.activeJobKey='';printer.progressPercent=0;}}
      else{printer.state=job.state;printer.activeJobKey=jobKey;printer.progressPercent=job.progressPercent;}
      printer.updatedAtMinute=atMinute;
    }
    state.sequence++;state.lastEvent={sequence:state.sequence,type:type,printerKey:printerKey,jobKey:jobKey,atMinute:atMinute,progressPercent:type==='JOB_PROGRESS'?round(clamp(raw.progressPercent,0,100,0),1):undefined};
    return state;
  }

  function normalizeSimulatorPrinter(printer,index){
    printer=printer||{};return {key:text(printer.key,60,'simulator-'+(index+1)),materials:Array.isArray(printer.materials)?printer.materials.map(function(item){return text(item,40,'');}).filter(Boolean):[],bedWidthMm:clamp(printer.bedWidthMm,1,100000,220),bedDepthMm:clamp(printer.bedDepthMm,1,100000,220),bedHeightMm:clamp(printer.bedHeightMm,1,100000,250)};
  }

  function planPrintSchedule(jobs,printers,options){
    options=options||{};var normalizedPrinters=(Array.isArray(printers)?printers:[]).map(function(printer,index){return {key:text(printer&&printer.key,60,'simulator-'+(index+1)),availableAtMinute:round(clamp(printer&&printer.availableAtMinute,0,100000000,0),2),materials:Array.isArray(printer&&printer.materials)?printer.materials.map(function(x){return text(x,40,'');}):[],bedWidthMm:clamp(printer&&printer.bedWidthMm,1,100000,100000),bedDepthMm:clamp(printer&&printer.bedDepthMm,1,100000,100000),bedHeightMm:clamp(printer&&printer.bedHeightMm,1,100000,100000)};});
    if(!normalizedPrinters.length)normalizedPrinters=[{key:'simulator-1',availableAtMinute:0,materials:[],bedWidthMm:100000,bedDepthMm:100000,bedHeightMm:100000}];
    normalizedPrinters.sort(function(a,b){return a.key.localeCompare(b.key);});
    var queue=(Array.isArray(jobs)?jobs:[]).map(function(job,index){var ticket=job&&job.version===JOB_TICKET_VERSION?job:(job&&job.ticket)||{};var checked=validatePrintJobTicket(ticket),value=checked.value,minutes=clamp(job&&job.estimatedMinutes||value.advisoryEstimate.printMinutes,0.1,1000000,1);return {index:index,key:'job-'+(index+1),ticket:value,valid:checked.ok,minutes:minutes,priority:Math.round(clamp(job&&job.priority,0,100,0))};});
    queue.sort(function(a,b){return b.priority-a.priority||a.index-b.index;});var assignments=[],unscheduled=[];
    queue.forEach(function(job){if(!job.valid){unscheduled.push({jobKey:job.key,reason:'INVALID_TICKET'});return;}var material=job.ticket.review.material.key,dims=job.ticket.model.dimensionsMm||{};var compatible=normalizedPrinters.filter(function(p){return (!p.materials.length||p.materials.indexOf(material)>=0)&&dims.width<=p.bedWidthMm&&dims.depth<=p.bedDepthMm&&dims.height<=p.bedHeightMm;});if(!compatible.length){unscheduled.push({jobKey:job.key,reason:'NO_COMPATIBLE_SIMULATOR'});return;}compatible.sort(function(a,b){return a.availableAtMinute-b.availableAtMinute||a.key.localeCompare(b.key);});var selected=compatible[0],start=selected.availableAtMinute,end=round(start+job.minutes,2);assignments.push({jobKey:job.key,printerKey:selected.key,startMinute:start,endMinute:end,estimatedMinutes:round(job.minutes,2)});selected.availableAtMinute=end;});
    assignments.sort(function(a,b){return a.startMinute-b.startMinute||a.printerKey.localeCompare(b.printerKey)||a.jobKey.localeCompare(b.jobKey);});return {version:'alloflow-print-schedule/1',mode:'DETERMINISTIC_SIMULATION',assignments:assignments,unscheduled:unscheduled,printerAvailability:normalizedPrinters.map(function(p){return {printerKey:p.key,availableAtMinute:p.availableAtMinute};})};
  }

  function createPrinterAdapter(type,options){
    var key=String(type||'SIMULATOR').toUpperCase();options=options||{};
    if(key!=='SIMULATOR')return disabledAdapter(PRINTER_ADAPTER_CONTRACT,key,'Real printer adapter '+key+' is disabled by default. This build performs no printer network requests or machine commands.');
    var printerInputs=Array.isArray(options.printers)&&options.printers.length?options.printers:[{key:'simulator-1',materials:['PLA'],bedWidthMm:220,bedDepthMm:220,bedHeightMm:250}];
    var printers=printerInputs.map(normalizeSimulatorPrinter),state=normalizeTelemetryState(),counter=0;
    printers.forEach(function(printer,index){state=reducePrinterTelemetry(state,{type:'PRINTER_REGISTERED',printerKey:text(printer.key,60,'simulator-'+(index+1)),atMinute:0});});
    return {contract:PRINTER_ADAPTER_CONTRACT,id:'SIMULATOR',enabled:true,executionEnabled:false,networkEnabled:false,capabilities:['LOCAL_QUEUE_SIMULATION','DETERMINISTIC_CAPACITY_PLAN','SIMULATED_TELEMETRY'],submit:function(ticket,printerKey){var checked=validatePrintJobTicket(ticket);if(!checked.ok)throw new Error(checked.errors.join(' '));var selected=text(printerKey,60,''),configured=printers.filter(function(printer){return printer.key===selected;})[0];if(!configured)throw new Error('Choose a configured simulated printer.');var material=checked.value.review.material.key,dims=checked.value.model.dimensionsMm||{};if(configured.materials.indexOf(material)<0)throw new Error('The selected simulated printer is not configured for the reviewed material.');if(dims.width>configured.bedWidthMm||dims.depth>configured.bedDepthMm||dims.height>configured.bedHeightMm)throw new Error('The reviewed model does not fit the selected simulated printer build area.');counter++;var jobKey='sim-job-'+counter;state=reducePrinterTelemetry(state,{type:'JOB_QUEUED',jobKey:jobKey,printerKey:selected,atMinute:state.sequence});if(!state.jobs[jobKey])throw new Error('The simulated job could not be queued.');return {jobKey:jobKey,state:'QUEUED',printerKey:selected,simulationOnly:true};},emit:function(event){state=reducePrinterTelemetry(state,event);return clone(state.lastEvent);},advance:function(jobKey){var job=state.jobs[jobKey];if(!job)throw new Error('Unknown simulated job.');var type=job.state==='QUEUED'?'JOB_STARTED':job.state==='PRINTING'?'JOB_READY':job.state==='PAUSED'?'JOB_STARTED':'';if(!type)return clone(job);state=reducePrinterTelemetry(state,{type:type,jobKey:jobKey,printerKey:job.printerKey,progressPercent:type==='JOB_READY'?100:job.progressPercent,atMinute:state.sequence});return clone(state.jobs[jobKey]);},plan:function(tickets){return planPrintSchedule((tickets||[]).map(function(ticket){return {ticket:ticket};}),printers,options);},snapshot:function(){return clone(state);},reason:'Simulation only. No G-code commands, credentials, network requests, or physical-printer actions are available.'};
  }

  function normalizeSubmission(input) {
    input=input||{};var format=formatOf(input.sourceFormat),ai=String(input.aiUse||'NONE').toUpperCase();if(['NONE','ASSISTED','MOSTLY_AI'].indexOf(ai)<0)ai='NONE';
    var report=input.preflight&&typeof input.preflight==='object'?clone(input.preflight):null;
    return { version:VERSION,title:text(input.title,100,'Untitled model'),description:text(input.description,500,''),sourceFormat:format,originalFilename:format==='RECIPE'?'':safeFilename(input.originalFilename||'model'),contentHash:/^[0-9a-f]{64}$/i.test(String(input.contentHash||''))?String(input.contentHash).toLowerCase():'',unitDeclaration:text(input.unitDeclaration,60,''),aiUse:ai,aiDisclosure:text(input.aiDisclosure,300,''),studentNote:text(input.studentNote,300,''),recipe:format==='RECIPE'&&input.recipe?clone(input.recipe):null,preflight:report,createdAt:text(input.createdAt,40,new Date().toISOString())};
  }
  function validateSubmission(input) {
    var value=normalizeSubmission(input),errors=[];
    if(!value.sourceFormat)errors.push('Choose RECIPE, STL, or GLB.');
    if(!value.title)errors.push('A title is required.');
    if(value.sourceFormat==='RECIPE'&&(!value.recipe||!Array.isArray(value.recipe.parts)||!value.recipe.parts.length))errors.push('A printable recipe is required.');
    if(value.sourceFormat!=='RECIPE'&&!value.originalFilename)errors.push('The original file name is required.');
    if(!value.preflight||['PASS','WARN'].indexOf(String(value.preflight.status||''))<0)errors.push('Run preflight and resolve blocking errors before export.');
    if(value.aiUse!=='NONE'&&!value.aiDisclosure)errors.push('Explain how AI assisted this design.');
    return {ok:!errors.length,errors:errors,value:value};
  }
  function serializeSubmission(input){var checked=validateSubmission(input);if(!checked.ok)throw new Error(checked.errors.join(' '));return JSON.stringify(checked.value,null,2);}
  function parseSubmission(textValue){var parsed;try{parsed=JSON.parse(String(textValue||''));}catch(_){return {ok:false,errors:['The submission package is not valid JSON.'],value:null};}if(parsed&&parsed.version!==VERSION)return {ok:false,errors:['Unsupported Print Lab package version.'],value:null};return validateSubmission(parsed);}

  function exportBinaryStl(THREE, object) {
    if(!THREE||!object)return null;var triangles=[];
    if(object.updateMatrixWorld)object.updateMatrixWorld(true);
    if(object.traverse)object.traverse(function(mesh){if(!mesh||!mesh.isMesh||!mesh.geometry)return;var geometry=mesh.geometry.index&&mesh.geometry.toNonIndexed?mesh.geometry.toNonIndexed():mesh.geometry;var pos=geometry.attributes&&geometry.attributes.position;if(!pos)return;for(var i=0;i+2<pos.count;i+=3){var vs=[];for(var j=0;j<3;j++){var v=new THREE.Vector3(pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j));if(v.applyMatrix4)v.applyMatrix4(mesh.matrixWorld);vs.push(v);}triangles.push(vs);}});
    var buffer=new ArrayBuffer(84+triangles.length*50),view=new DataView(buffer);view.setUint32(80,triangles.length,true);var offset=84;
    triangles.forEach(function(vs){var converted=vs.map(function(v){return new THREE.Vector3(v.x,-v.z,v.y);});var ab=new THREE.Vector3().subVectors(converted[1],converted[0]),ac=new THREE.Vector3().subVectors(converted[2],converted[0]),normal=new THREE.Vector3().crossVectors(ab,ac).normalize();[normal,converted[0],converted[1],converted[2]].forEach(function(v){view.setFloat32(offset,v.x,true);view.setFloat32(offset+4,v.y,true);view.setFloat32(offset+8,v.z,true);offset+=12;});view.setUint16(offset,0,true);offset+=2;});
    return buffer;
  }

  window.AlloModules.PrintableModel = {
    version:VERSION,JOB_TICKET_VERSION:JOB_TICKET_VERSION,GCODE_METADATA_VERSION:GCODE_METADATA_VERSION,PRINTER_ADAPTER_CONTRACT:PRINTER_ADAPTER_CONTRACT,LIMITS:clone(LIMITS),REPAIR_LIMITS:clone(REPAIR_LIMITS),GCODE_LIMITS:clone(GCODE_LIMITS),FORMATS:Object.keys(FORMATS),
    normalizeProfile:normalizeProfile,inspectRecipe:inspectRecipe,inspectStl:inspectStl,inspectGlb:inspectGlb,repairStl:repairStl,buildStlObject:buildStlObject,finalizeMetrics:finalizeMetrics,
    estimateMaterial:estimateMaterial,estimatePointQuote:estimatePointQuote,estimateQuote:estimateQuote,
    parseGcodeMetadata:parseGcodeMetadata,normalizeGcodeMetadata:normalizeGcodeMetadata,hashGcodeMetadata:hashGcodeMetadata,
    createPrintJobTicket:createPrintJobTicket,normalizePrintJobTicket:normalizePrintJobTicket,validatePrintJobTicket:validatePrintJobTicket,printJobTicketPayload:printJobTicketPayload,verifyPrintJobTicketIntegrity:verifyPrintJobTicketIntegrity,serializePrintJobTicket:serializePrintJobTicket,parsePrintJobTicket:parsePrintJobTicket,
    createSlicerAdapter:createSlicerAdapter,createGeometryAdapter:createGeometryAdapter,getEngineCapabilities:getEngineCapabilities,createPrinterAdapter:createPrinterAdapter,reducePrinterTelemetry:reducePrinterTelemetry,planPrintSchedule:planPrintSchedule,
    normalizeSubmission:normalizeSubmission,validateSubmission:validateSubmission,serializeSubmission:serializeSubmission,parseSubmission:parseSubmission,sha256Hex:sha256Hex,safeFilename:safeFilename,exportBinaryStl:exportBinaryStl
  };
  console.log('[PrintableModel] Registered ('+VERSION+')');
})();
