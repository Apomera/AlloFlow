
  // SPARC 2016 Table 2: radius, observed speed, quoted error, gas, unit-M/L disk and bulge.
  var ROTATION_GALAXIES = [{"id":"NGC3198","name":"NGC 3198","distanceMpc":13.8,"distanceErrorMpc":1.4,"inclinationDeg":73,"inclinationErrorDeg":3,"quality":1,"originalRefs":"Da06,Be91,Be87","points":[[0.32,24.4,35.9,0,63.28,0],[0.64,43.3,16.3,0,73.66,0],[0.96,45.5,16.1,0,78.98,0],[1.28,58.5,15.4,0.35,82.7,0],[1.61,68.8,7.61,0.15,84.22,0],[1.93,76.9,10.3,-0.05,83.17,0],[2.24,82,8.09,-0.47,87.04,0],[2.57,86.9,7.6,-0.95,88.91,0],[2.89,97.6,3.03,-1.43,88.98,0],[3.21,100,5.31,-1.14,93.81,0],[3.54,107,7.51,-0.39,101.22,0],[3.85,113,7.32,0.36,108.53,0],[4.17,117,5.21,1.52,115.51,0],[4.5,119,5.67,3.07,120.51,0],[4.82,127,5.39,4.63,125.42,0],[5.15,132,4.34,6.02,129.4,0],[5.46,134,2.36,7.16,133.15,0],[5.78,137,0.89,8.31,136.45,0],[6.1,140,2.84,9.46,139.41,0],[6.43,142,0.88,10.61,141.85,0],[6.74,144,1.23,11.77,142.32,0],[7.06,146,1.57,12.87,140.94,0],[8.04,147,3,16.39,135.68,0],[9.04,148,3,20.03,130.79,0],[10.04,152,2,23.68,128.1,0],[11.04,155,2,27.08,126.67,0],[12.05,156,2,30.11,124.98,0],[14.05,157,2,34.48,118.12,0],[16.07,153,2,36.43,108.22,0],[18.13,153,2,37.76,101.1,0],[20.05,154,2,39.83,96.4,0],[22.12,153,2,40.92,91.56,0],[24.03,150,2,41.77,87.03,0],[26.1,149,2,43.71,82.67,0],[28.16,148,2,45.41,79.06,0],[30.08,146,2,45.29,76.07,0],[32.14,147,2,44.56,73.27,0],[34.06,148,2,44.81,70.91,0],[36.12,148,2,45.9,68.62,0],[38.19,149,2,46.75,66.59,0],[40.1,150,2,47.48,64.84,0],[42.17,150,3,48.93,63.1,0],[44.08,149,3,47.84,61.63,0]]},{"id":"NGC6503","name":"NGC 6503","distanceMpc":6.26,"distanceErrorMpc":0.31,"inclinationDeg":74,"inclinationErrorDeg":2,"quality":1,"originalRefs":"Be91,Be87","points":[[0.76,77,10,4.04,70.72,0],[1.52,100,5,7.62,123.17,0],[2.28,110,2,9.72,142.64,0],[3.04,118,2,12.42,134.42,0],[3.79,121,2,13.35,121.97,0],[4.55,121,2,14.78,111.53,0],[5.31,117,2,17.55,103.23,0],[6.07,116,2,19.2,96.65,0],[6.83,116,2,20.33,91.96,0],[7.59,116,2,21.66,87.62,0],[8.35,115,1,22.79,83.25,0],[9.11,115,1,23.92,79.58,0],[9.86,116,1,24.84,76.81,0],[10.64,117,1,25.46,74.18,0],[11.38,117,1,26.38,71.5,0],[12.12,118,1,27.2,69.18,0],[12.86,117,1,28.13,67.04,0],[13.7,116,1,28.74,64.84,0],[14.44,115,1,28.64,63.05,0],[15.18,117,1,28.33,61.39,0],[15.91,116,1,28.13,59.88,0],[16.65,115,2,28.33,58.45,0],[17.49,115,2,28.23,56.93,0],[18.23,115,2,27.82,55.71,0],[18.97,114,2,27.2,54.55,0],[19.71,115,2,26.9,53.46,0],[20.45,114,2,26.69,52.44,0],[21.29,116,2,26.49,51.35,0],[22.03,115,3,26.18,50.44,0],[22.76,118,4,25.87,49.61,0],[23.5,115,10,25.46,48.79,0]]}];
  function galaxyRotationModel(saved) {
    var state = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    function bounded(raw, low, high, fallback) {
      var value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
    }
    var galaxy = ROTATION_GALAXIES.find(function(g) { return g.id === state.rotationGalaxy; }) || ROTATION_GALAXIES[0];
    var ml = Math.round(bounded(state.rotationML, 0.1, 1, 0.5) * 20) / 20;
    var index = Math.round(bounded(state.rotationPoint, 0, galaxy.points.length - 1, galaxy.points.length - 1));
    var points = galaxy.points.map(function(row, i) {
      // Signed squares retain the outward gas force in central depressions (SPARC equation 2).
      var gasSq = row[3] * Math.abs(row[3]), starSq = ml * (row[4] * Math.abs(row[4]) + row[5] * Math.abs(row[5]));
      var baryonSq = gasSq + starSq;
      var baryon = baryonSq >= 0 ? Math.sqrt(baryonSq) : null;
      return { index: i, radiusKpc: row[0], observedKms: row[1], errorKms: row[2], gasKms: row[3],
        unitDiskKms: row[4], unitBulgeKms: row[5], gasSq: gasSq, starSq: starSq, baryonSq: baryonSq,
        stellarKms: starSq >= 0 ? Math.sqrt(starSq) : null, baryonKms: baryon,
        differenceKms: baryon === null ? null : row[1] - baryon };
    });
    var selected = points[index], difference = selected.differenceKms;
    return { galaxy: galaxy.id, name: galaxy.name, distanceMpc: galaxy.distanceMpc, distanceErrorMpc: galaxy.distanceErrorMpc,
      inclinationDeg: galaxy.inclinationDeg, inclinationErrorDeg: galaxy.inclinationErrorDeg, originalRefs: galaxy.originalRefs,
      ml: ml, index: index, points: points, selected: selected, radiusMaxKpc: Math.ceil(points[points.length - 1].radiusKpc / 5) * 5,
      regime: difference === null ? 'undefined' : difference > selected.errorKms ? 'above' : difference < -selected.errorKms ? 'below' : 'overlap',
      examples: ROTATION_GALAXIES.map(function(g) { return { id: g.id, name: g.name, count: g.points.length }; }) };
  }

