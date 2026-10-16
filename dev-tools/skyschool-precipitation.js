// Illustrative precipitation envelopes follow the game's low cloud deck and
// taller distant storm cells. These MSL feet are visual layer boundaries, not
// measured weather ceilings or a meteorological/icing safety model.
function getFlightPrecipitationFrame(weather, state, thirdPerson, reducedMotion) {
  var conditions = weather && typeof weather === 'object' && !Array.isArray(weather) ? weather : {};
  var flight = state && typeof state === 'object' ? state : {};
  var altitude = Number.isFinite(flight.altitude) ? flight.altitude : 0;
  var speed = Number.isFinite(flight.speed) ? Math.max(0, flight.speed) : 0;
  var storm = conditions.type === 'stormy';
  var raining = storm || conditions.type === 'overcast';
  function smooth(low, high, value) {
    var t = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
  }
  var intensity = raining ? 1 - smooth(storm ? 12000 : 6000, storm ? 25000 : 12000, altitude) : 0;
  // Internal speed is feet per second, not indicated airspeed in knots.
  var droplets = storm && !thirdPerson && !reducedMotion ? intensity * smooth(40, 80, speed) : 0;
  return {
    intensity: intensity,
    rain: reducedMotion ? 0 : intensity,
    curtain: intensity,
    droplets: droplets,
    frost: thirdPerson ? 0 : intensity * Math.max(0, Math.min(0.15, (altitude - 10000) / 50000)),
    lightning: storm && !reducedMotion ? intensity : 0,
    hazeMultiplier: 1.3 - 0.3 * smooth(4000, 6000, altitude)
  };
}

// Project falling rain and wind into the actual camera frame. World axes are
// east/up/south; wind direction is where the wind comes FROM. Foreground rain
// moves faster but obeys the same projection, including a banked chase camera.
function getFlightRainVelocity(weather, heading, view, foreground) {
  var conditions = weather && typeof weather === 'object' && !Array.isArray(weather) ? weather : {};
  var wind = Number.isFinite(conditions.wind) ? Math.max(0, Math.min(200, conditions.wind)) : 0;
  var direction = Number.isFinite(conditions.windDir) ? conditions.windDir % 360 : 0;
  var radians = direction * Math.PI / 180;
  var scale = (conditions.type === 'stormy' ? 5 : 3) * (foreground ? 1.8 : 1);
  var wx = -Math.sin(radians) * wind * scale;
  var wy = -(foreground ? 1300 : 900);
  var wz = Math.cos(radians) * wind * scale;
  function normalize(vector) {
    if (!vector || !Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) return null;
    var largest = Math.max(Math.abs(vector.x), Math.abs(vector.y), Math.abs(vector.z));
    if (!(largest > 0)) return null;
    var x = vector.x / largest, y = vector.y / largest, z = vector.z / largest;
    var length = Math.sqrt(x * x + y * y + z * z);
    return { x: x / length, y: y / length, z: z / length };
  }
  var right = normalize(view && view.right), up = normalize(view && view.up);
  if (!right || !up || Math.abs(right.x * up.x + right.y * up.y + right.z * up.z) > 0.001) {
    var headingRad = (Number.isFinite(heading) ? heading % 360 : 0) * Math.PI / 180;
    right = { x: Math.cos(headingRad), y: 0, z: Math.sin(headingRad) };
    up = { x: 0, y: 1, z: 0 };
  }
  return { x: wx * right.x + wy * right.y + wz * right.z, y: -(wx * up.x + wy * up.y + wz * up.z) };
}

// One occasional 0.35-second pulse in each 18-second period. Seeded centers
// keep the timing deterministic while avoiding the old once-a-second flash.
// The pulse and its slope reach zero before either end of a period.
function getFlightLightningPulse(time) {
  if (!Number.isFinite(time) || time < 0) return 0;
  var cycle = Math.floor(time / 18), phase = time % 18;
  var seed = ((cycle % 104729) * 9301 + 49297) % 233280;
  var center = 2 + 14 * seed / 233280;
  var t = (phase - center + 0.175) / 0.35;
  if (t <= 0 || t >= 1) return 0;
  var wave = Math.sin(Math.PI * t);
  return wave * wave;
}
