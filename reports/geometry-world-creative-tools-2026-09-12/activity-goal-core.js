  // A build goal checks an explicitly selected student creation, never a whole
  // lesson or an inferred design intention. Unknown metrics cannot be scored.
  function normalizeGeometryBuildGoal(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var metrics = ['blockCount','occupiedVolume','footprintArea','width','depth','height'];
    var allowed = ['metric','comparator','target','unitCubesOnly'];
    if (Object.keys(value).some(function(k) { return allowed.indexOf(k) < 0; }) || metrics.indexOf(value.metric) < 0 || ['eq','gte','lte'].indexOf(value.comparator) < 0) return null;
    var target = value.target;
    if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0 || target > 1500) return null;
    var step = value.metric === 'occupiedVolume' ? .25 : value.metric === 'height' ? .5 : 1;
    if (Math.abs(target / step - Math.round(target / step)) > 1e-8) return null;
    if (value.unitCubesOnly !== undefined && typeof value.unitCubesOnly !== 'boolean') return null;
    return {metric:value.metric, comparator:value.comparator, target:target, unitCubesOnly:value.unitCubesOnly === true};
  }

