// Illustrative neighborhoods, not inferred streets or real building footprints.
// A bounded, seeded cell layout keeps the existing box budget close enough to
// read as a skyline. Terrain support and real-map coverage remain renderer gates.
function getFlightCityLayout(city) {
  if (!city || !Number.isFinite(city.lat) || Math.abs(city.lat) > 90 ||
      !Number.isFinite(city.lon)) return [];
  var longitude = ((city.lon % 360 + 540) % 360) - 180;
  var population = Number.isFinite(city.popK) ? Math.max(0, Math.min(50000, city.popK)) : 100;
  var populationRoot = Math.sqrt(population);
  var count = Math.min(64, 8 + Math.round(populationRoot * 1.4));
  var spacing = Math.min(250, 150 + populationRoot * 1.5);
  var coreHeight = Math.min(950, 60 + populationRoot * 9);
  var seed = Math.abs(Math.sin(city.lat * 12.9898 + longitude * 78.233) * 43758.5453);
  function hash(index, channel) {
    var value = Math.sin(seed + index * 127.1 + channel * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }
  var cells = [];
  for (var row = 0; row < 8; row++) {
    for (var column = 0; column < 8; column++) {
      var x = column - 3.5, z = row - 3.5, index = row * 8 + column;
      cells.push({ x: x, z: z, index: index, distanceSquared: x * x + z * z,
        tieBreak: hash(index, 0) });
    }
  }
  cells.sort(function(a, b) {
    return a.distanceSquared - b.distanceSquared || a.tieBreak - b.tieBreak || a.index - b.index;
  });
  cells.length = count;
  var outerRadius = Math.sqrt(cells[count - 1].distanceSquared) + 0.75;
  return cells.map(function(cell) {
    var edge = 1 - Math.sqrt(cell.distanceSquared) / outerRadius;
    // Adjacent centers remain >=88% of a cell apart, while the combined
    // half-widths/depths are <=78%: boxes cannot overlap, even with jitter.
    return {
      x: (cell.x + (hash(cell.index, 1) - 0.5) * 0.12) * spacing,
      z: (cell.z + (hash(cell.index, 2) - 0.5) * 0.12) * spacing,
      width: (0.52 + hash(cell.index, 3) * 0.26) * spacing,
      depth: (0.52 + hash(cell.index, 4) * 0.26) * spacing,
      height: 18 + coreHeight * (0.45 + hash(cell.index, 5) * 0.55) * (0.04 + edge * edge * edge * 0.96)
    };
  });
}
