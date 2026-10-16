// Draped road ribbons in local feet. Shared miter endpoints close normal bends;
// bounded bevel wedges cover sharper outer corners without extending a spike.
// The caller merges these upward-facing triangles into its existing road mesh.
function buildFlightCityRoadRibbon(points, halfWidth, options) {
  options = options || {};
  var result = { triangles: [], triangleCount: 0, segments: 0, joins: 0, omitted: 0, samples: 0, truncated: false };
  var surface = options.surface, isDry = options.isDry, append = options.appendTriangle;
  var triangleLimit = Number.isFinite(options.maxTriangles) ? Math.max(0, Math.min(8192, Math.floor(options.maxTriangles))) : 8192;
  var sampleLimit = Number.isFinite(options.maxSamples) ? Math.max(0, Math.min(24000, Math.floor(options.maxSamples))) : 24000;
  if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(halfWidth) || halfWidth <= 0 || halfWidth > 50 ||
      typeof surface !== 'function' || typeof isDry !== 'function') return result;
  if (points.length > 256) { points = points.slice(0, 256); result.truncated = true; }
  var clean = [], sampled = new Map(), stopped = false, segments = [], bevels = [];
  function distance(a, b) { return Math.hypot(b.x - a.x, b.z - a.z); }
  function lerp(a, b, f) { return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f }; }
  function shifted(p, nx, nz, sign) { return { x: p.x + nx * halfWidth * sign, z: p.z + nz * halfWidth * sign }; }
  function area(a, b, c) { return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x); }
  for (var point of points) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) || Math.abs(point.x) > 10000000 || Math.abs(point.z) > 10000000) return result;
    if (!clean.length || distance(clean[clean.length - 1], point) >= 0.1) clean.push({ x: point.x, z: point.z });
  }
  var closed = clean.length > 2 && distance(clean[0], clean[clean.length - 1]) < 0.1;
  if (closed) clean[clean.length - 1] = { x: clean[0].x, z: clean[0].z };
  function sample(point) {
    var key = point.x.toFixed(6) + ',' + point.z.toFixed(6);
    if (sampled.has(key)) return sampled.get(key);
    if (result.samples >= sampleLimit) { result.truncated = true; stopped = true; return null; }
    result.samples++;
    var height = isDry(point) === true ? surface(point) : null;
    var value = Number.isFinite(height) ? { x: point.x, z: point.z, y: height } : null;
    sampled.set(key, value); return value;
  }
  function grade(a, b, maximum) {
    var span = distance(a, b);
    return Math.abs(a.y - b.y) <= span * maximum + 0.00001;
  }
  function plane(point, a, b, c) {
    var cross = area(a, b, c);
    if (Math.abs(cross) < 0.000001) return null;
    var wb = area(a, point, c) / cross, wc = area(a, b, point) / cross, wa = 1 - wb - wc;
    return wa >= -0.000001 && wb >= -0.000001 && wc >= -0.000001 ? a.y * wa + b.y * wb + c.y * wc : null;
  }
  function emit(a, b, c) {
    var cross = area(a, b, c);
    if (Math.abs(cross) < 0.000001) return false;
    if (cross > 0) { var swap = b; b = c; c = swap; }
    var triangle = [[a.x, a.y + 3, a.z], [b.x, b.y + 3, b.z], [c.x, c.y + 3, c.z]];
    if (typeof append === 'function') append(triangle[0], triangle[1], triangle[2]); else result.triangles.push(triangle);
    result.triangleCount++; return true;
  }
  function room(count) {
    if (result.triangleCount + count <= triangleLimit) return true;
    result.truncated = true; stopped = true; return false;
  }
  for (var i = 1; i < clean.length; i++) {
    var a = clean[i - 1], b = clean[i], length = distance(a, b);
    if (length > 15000) { segments.push(null); result.omitted++; continue; }
    var dx = (b.x - a.x) / length, dz = (b.z - a.z) / length, nx = -dz, nz = dx;
    segments.push({ a: a, b: b, dx: dx, dz: dz, nx: nx, nz: nz, length: length,
      leftA: shifted(a, nx, nz, 1), rightA: shifted(a, nx, nz, -1),
      leftB: shifted(b, nx, nz, 1), rightB: shifted(b, nx, nz, -1), first: false, last: false });
  }
  for (var j = 1; j < segments.length + (closed ? 1 : 0); j++) {
    var previous = segments[j - 1], next = segments[j % segments.length];
    if (!previous || !next) continue;
    var dot = Math.max(-1, Math.min(1, previous.dx * next.dx + previous.dz * next.dz));
    var turn = previous.dx * next.dz - previous.dz * next.dx;
    // Reversals use independent square caps. Joining them would invent a long,
    // thin wedge through terrain on the opposite side of the road.
    if (dot < -0.98) continue;
    var mx = previous.nx + next.nx, mz = previous.nz + next.nz, magnitude = Math.hypot(mx, mz);
    mx /= magnitude; mz /= magnitude;
    var offset = halfWidth / (mx * next.nx + mz * next.nz);
    var extension = halfWidth * Math.abs(turn) / Math.max(0.000001, 1 + dot);
    if (offset <= halfWidth * 2.5 && extension <= Math.min(previous.length, next.length) * 0.45) {
      var left = { x: previous.b.x + mx * offset, z: previous.b.z + mz * offset };
      var right = { x: previous.b.x - mx * offset, z: previous.b.z - mz * offset };
      previous.leftB = next.leftA = left; previous.rightB = next.rightA = right;
    } else if (Math.abs(turn) > 0.000001) {
      // Leave both full-width caps intact. Their inner overlap is harmless in
      // one opaque material; only the missing outer wedge needs an extra face.
      bevels.push({ a: previous.b, b: turn > 0 ? previous.rightB : previous.leftB,
        c: turn > 0 ? next.rightA : next.leftA, previous: previous, next: next });
    }
  }
  function quad(a, b, c, d) {
    if (!room(2)) return false;
    // Three longitudinal rows include the interior midpoint. Extra cross-road
    // columns keep probes <=120ft apart even at a broad mitered intersection.
    var crossSteps = Math.max(2, Math.ceil(Math.max(distance(a, d), distance(b, c)) / 120));
    if (crossSteps % 2) crossSteps++;
    var grid = [];
    for (var row = 0; row <= 2; row++) {
      var left = lerp(a, b, row / 2), right = lerp(d, c, row / 2), samples = [];
      for (var col = 0; col <= crossSteps; col++) {
        var value = sample(lerp(left, right, col / crossSteps));
        if (!value) { result.omitted++; return false; }
        samples.push(value);
        if (col && !grade(samples[col - 1], value, 0.25) || row && !grade(grid[row - 1][col], value, 0.35)) { result.omitted++; return false; }
      }
      grid.push(samples);
    }
    var va = grid[0][0], vb = grid[2][0], vc = grid[2][crossSteps], vd = grid[0][crossSteps];
    // Refuse a ribbon that would bridge a hollow or cut through an interior
    // ridge, even when its four corners alone look safe.
    for (var sampleRow of grid) for (var value of sampleRow) {
      var predicted = plane(value, va, vb, vd);
      if (predicted === null) predicted = plane(value, vb, vc, vd);
      if (predicted === null || Math.abs(predicted - value.y) > 3) { result.omitted++; return false; }
    }
    if (Math.abs(area(va, vb, vd)) < 0.000001 || Math.abs(area(vb, vc, vd)) < 0.000001) { result.omitted++; return false; }
    emit(va, vb, vd); emit(vb, vc, vd); result.segments++; return true;
  }
  for (var segment of segments) {
    if (!segment || stopped) continue;
    var steps = Math.max(1, Math.ceil(Math.max(distance(segment.leftA, segment.leftB), distance(segment.rightA, segment.rightB)) / 120));
    for (var step = 0; step < steps && !stopped; step++) {
      var accepted = quad(lerp(segment.leftA, segment.leftB, step / steps), lerp(segment.leftA, segment.leftB, (step + 1) / steps),
        lerp(segment.rightA, segment.rightB, (step + 1) / steps), lerp(segment.rightA, segment.rightB, step / steps));
      if (step === 0) segment.first = accepted;
      if (step === steps - 1) segment.last = accepted;
    }
  }
  for (var bevel of bevels) {
    if (stopped) break;
    if (!bevel.previous.last || !bevel.next.first) continue;
    if (!room(1)) break;
    var va = sample(bevel.a), vb = sample(bevel.b), vc = sample(bevel.c);
    if (!va || !vb || !vc) { result.omitted++; continue; }
    var probes = [va, vb, vc], safe = true;
    for (var edge = 0; edge < 3; edge++) {
      var first = probes[edge], second = probes[(edge + 1) % 3];
      if (!grade(first, second, 0.35)) { safe = false; break; }
      var mid = sample(lerp(first, second, 0.5));
      if (!mid || !grade(first, mid, 0.35) || !grade(mid, second, 0.35) || Math.abs(mid.y - (first.y + second.y) / 2) > 3) { safe = false; break; }
    }
    var center = safe ? sample({ x: (va.x + vb.x + vc.x) / 3, z: (va.z + vb.z + vc.z) / 3 }) : null;
    if (!center || Math.abs(center.y - (va.y + vb.y + vc.y) / 3) > 3) safe = false;
    if (safe && emit(va, vb, vc)) result.joins++; else result.omitted++;
  }
  return result;
}
