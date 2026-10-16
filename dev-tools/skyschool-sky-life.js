// Decorative scenery choices, not operating limits or a weather safety model.
// Keep one policy for Canvas and WebGL; lesson traffic is handled separately.
function getFlightSkyActivity(weather, reducedMotion, qualityTier) {
  var inactive = { balloons: false, birds: false, aircraft: false };
  var tier = qualityTier == null ? 0 : qualityTier;
  if (reducedMotion || !Number.isFinite(tier) || tier >= 2) return inactive;
  if (weather == null) weather = {};
  if (typeof weather !== 'object' || Array.isArray(weather)) return inactive;
  var own = Object.prototype.hasOwnProperty;
  var type = own.call(weather, 'type') ? weather.type : 'clear';
  var wind = own.call(weather, 'wind') ? weather.wind : 0;
  var visibility = own.call(weather, 'visibility') ? weather.visibility : 1;
  if (['clear', 'breezy', 'gusty', 'overcast', 'stormy', 'foggy', 'partly_cloudy'].indexOf(type) === -1 ||
      !Number.isFinite(wind) || !Number.isFinite(visibility) || visibility < 0 || visibility > 1) return inactive;
  var speed = Math.abs(wind);
  return {
    balloons: (type === 'clear' || type === 'breezy') && visibility >= 0.75 && speed <= 12,
    birds: (type === 'clear' || type === 'breezy' || type === 'gusty') && visibility >= 0.55 && speed <= 25,
    aircraft: type !== 'stormy' && type !== 'foggy' && visibility >= 0.55
  };
}

// Three illustrative straight routes in local feet. The camera only selects a
// periodic copy of an independent world path; it never tows the aircraft.
// Caller-owned output avoids per-frame objects in the renderer's three-jet loop.
function getFlightAmbientJetPose(index, time, cameraX, cameraZ, out) {
  var slot = Number.isFinite(index) ? Math.max(0, Math.min(2, Math.floor(index))) : 0;
  var elapsed = Number.isFinite(time) ? Math.max(0, Math.min(1000000000, time)) : 0;
  var cx = Number.isFinite(cameraX) ? cameraX : 0;
  var cz = Number.isFinite(cameraZ) ? cameraZ : 0;
  var x = slot === 0 ? 42000 : slot === 1 ? -34000 : 14000;
  var z = slot === 0 ? -12000 : slot === 1 ? -52000 : 58000;
  var heading = slot === 0 ? Math.PI / 2 : slot === 1 ? 0.35 : -2.1;
  var speed = slot === 0 ? 720 : slot === 1 ? 780 : 750;
  var vx = Math.sin(heading) * speed, vz = Math.cos(heading) * speed;
  x = wrapFlightCloudCoordinate(x + vx * elapsed, cx, 100000);
  z = wrapFlightCloudCoordinate(z + vz * elapsed, cz, 100000);
  var result = out && typeof out === 'object' ? out : {};
  result.x = x; result.y = 30000 + slot * 4000; result.z = z;
  result.heading = Math.atan2(vx, vz);
  result.fade = getFlightCloudEdgeFade(x - cx, z - cz, 100000);
  return result;
}
