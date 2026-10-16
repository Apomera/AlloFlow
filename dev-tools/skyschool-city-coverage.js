// Replacement coverage follows geometry that was actually emitted, rather
// than the requested map rectangle. Coordinates are district-local feet.
function createFlightCityCoverage() {
  return { version: 1, cellSize: 512, cells: Object.create(null), cellCount: 0,
    rectangles: [], large: [], references: 0, truncated: false };
}

function flightCityCoverageBounds(minX, minZ, maxX, maxZ) {
  return Number.isFinite(minX) && Number.isFinite(minZ) && Number.isFinite(maxX) && Number.isFinite(maxZ) &&
    minX <= maxX && minZ <= maxZ && Math.max(Math.abs(minX), Math.abs(minZ), Math.abs(maxX), Math.abs(maxZ)) <= 10000000;
}

function addFlightCityCoverage(coverage, minX, minZ, maxX, maxZ) {
  if (!coverage || coverage.version !== 1 || coverage.cellSize !== 512 || !coverage.cells ||
      !Array.isArray(coverage.rectangles) || !Array.isArray(coverage.large) ||
      !flightCityCoverageBounds(minX, minZ, maxX, maxZ)) return false;
  // Normal map packs stay well below these bounds. Malformed or unusually
  // fragmented input can never turn a large rectangle into an unbounded loop.
  if (coverage.rectangles.length >= 32768) { coverage.truncated = true; return false; }
  var left = Math.floor(minX / 512), right = Math.floor(maxX / 512);
  var top = Math.floor(minZ / 512), bottom = Math.floor(maxZ / 512);
  var span = (right - left + 1) * (bottom - top + 1);
  var index = coverage.rectangles.length;
  if (span > 64) {
    if (coverage.large.length >= 128) { coverage.truncated = true; return false; }
    coverage.rectangles.push([minX, minZ, maxX, maxZ]);
    coverage.large.push(index);
    return true;
  }
  if (coverage.references + span > 131072) { coverage.truncated = true; return false; }
  var keys = [], additions = 0;
  for (var x = left; x <= right; x++) {
    for (var z = top; z <= bottom; z++) {
      var key = x + ':' + z;
      keys.push(key);
      if (!coverage.cells[key]) additions++;
    }
  }
  if (coverage.cellCount + additions > 8192) { coverage.truncated = true; return false; }
  // Preflight all budgets before changing the index; a rejected shape must
  // not leave partial suppression behind in the cells visited first.
  coverage.rectangles.push([minX, minZ, maxX, maxZ]);
  keys.forEach(function(key) {
    if (!coverage.cells[key]) { coverage.cells[key] = []; coverage.cellCount++; }
    coverage.cells[key].push(index);
  });
  coverage.references += span;
  return true;
}

function flightCityCoverageOverlaps(coverage, minX, minZ, maxX, maxZ) {
  if (!coverage || coverage.version !== 1 || coverage.cellSize !== 512 || !coverage.cells ||
      !Array.isArray(coverage.rectangles) || !Array.isArray(coverage.large) ||
      !flightCityCoverageBounds(minX, minZ, maxX, maxZ)) return false;
  function intersects(rectangle) {
    return rectangle && maxX >= rectangle[0] && minX <= rectangle[2] &&
      maxZ >= rectangle[1] && minZ <= rectangle[3];
  }
  for (var large = 0; large < coverage.large.length; large++) {
    if (intersects(coverage.rectangles[coverage.large[large]])) return true;
  }
  var left = Math.floor(minX / 512), right = Math.floor(maxX / 512);
  var top = Math.floor(minZ / 512), bottom = Math.floor(maxZ / 512);
  // This path is normally only one to four cells for an illustrative block.
  // A broad diagnostic query instead scans the bounded rectangle list once.
  if ((right - left + 1) * (bottom - top + 1) > 256) {
    for (var rectangle = 0; rectangle < coverage.rectangles.length; rectangle++) {
      if (intersects(coverage.rectangles[rectangle])) return true;
    }
    return false;
  }
  for (var x = left; x <= right; x++) {
    for (var z = top; z <= bottom; z++) {
      var candidates = coverage.cells[x + ':' + z];
      if (!candidates) continue;
      for (var candidate = 0; candidate < candidates.length; candidate++) {
        if (intersects(coverage.rectangles[candidates[candidate]])) return true;
      }
    }
  }
  return false;
}
