// Prefer the loaded destination in overlapping metros while preserving the
// wider exit radius that prevents scenery churn at a district boundary.
function isFlightCityDistrictPack(pack) {
  return pack && Number.isFinite(pack.lat) && Math.abs(pack.lat) <= 90 &&
    Number.isFinite(pack.lon) && Math.abs(pack.lon) <= 180 &&
    ((Array.isArray(pack.buildings) && pack.buildings.length > 0) ||
      (Array.isArray(pack.roads) && pack.roads.length > 0));
}
function chooseFlightCityDistrict(packs, currentPack, position, preferredPack, retainCurrent) {
  if (!Array.isArray(packs) || !position || !Number.isFinite(position.lat) || Math.abs(position.lat) > 90 ||
      !Number.isFinite(position.lon)) return null;
  // A new selected destination can load while the existing scene stays intact.
  // Only the live scene's pack can be retained; this never adds old packs back
  // to the available list or rebuilds them after the scene has released them.
  var current = (packs.indexOf(currentPack) >= 0 || retainCurrent === true) &&
    isFlightCityDistrictPack(currentPack) ? currentPack : null;
  var preferred = null;
  if (isFlightCityDistrictPack(preferredPack)) {
    if (packs.indexOf(preferredPack) >= 0) preferred = preferredPack;
    else if (typeof preferredPack.id === 'string' && preferredPack.id) {
      // Built-in provider hits are validated copies. Resolve the copy back to
      // the available object so selecting an alias does not rebuild meshes.
      for (var i = 0; i < packs.length; i++) {
        var candidate = packs[i];
        if (isFlightCityDistrictPack(candidate) && candidate.id === preferredPack.id &&
            candidate.lat === preferredPack.lat && candidate.lon === preferredPack.lon) {
          preferred = candidate;
          break;
        }
      }
    }
  }
  if (preferred && flightCityDistance(position, preferred) < (preferred === current ? 16 : 14)) return preferred;
  if (current && flightCityDistance(position, current) < 16) return current;
  var closest = null, closestDistance = 14;
  for (var j = 0; j < packs.length; j++) {
    var pack = packs[j];
    if (!isFlightCityDistrictPack(pack)) continue;
    var distance = flightCityDistance(position, pack);
    if (distance < closestDistance) { closest = pack; closestDistance = distance; }
  }
  return closest;
}
