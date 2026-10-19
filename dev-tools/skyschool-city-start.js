// Deterministic introductory city flight, using the simulator's own units/model.
// Terrain is sampled along the short approach; this is not obstacle navigation.
function getFlightCityStart(target, aircraft, groundElevationCallback, thrustModel) {
  if (!target || !aircraft || typeof groundElevationCallback !== 'function' ||
      !Number.isFinite(target.lat) || Math.abs(target.lat) > 85 ||
      !Number.isFinite(target.lon) || Math.abs(target.lon) > 180 ||
      !Number.isFinite(aircraft.ceiling) || aircraft.ceiling <= 0 ||
      !Number.isFinite(aircraft.maxSpeed) || aircraft.maxSpeed <= 0 ||
      !Number.isFinite(aircraft.maxThrust) || aircraft.maxThrust < 0) return null;
  var drone = !!aircraft.isDrone, helicopter = !drone && !!aircraft.isHelicopter;
  var rotor = drone || helicopter;
  var glider = !rotor && (aircraft.maxThrust === 0 || aircraft.engine === 'none');
  var distanceNm = drone ? 0.15 : helicopter ? 0.3 : 2;
  var clearance = drone ? 150 : helicopter ? 700 : glider ? 3000 : 2000;
  var angularDegrees = distanceNm / 3440.065 * 180 / Math.PI;
  var latitude = target.lat - angularDegrees;
  if (latitude < -85) return null; // no southbound approach outside the supported band
  var longitude = target.lon === 180 ? -180 : target.lon;
  var highestGround = -Infinity, lowestGround = Infinity, startGround = null;
  var corridorNm = drone ? 0.025 : helicopter ? 0.05 : 0.15;
  function wrappedLongitude(value) { return ((value + 180) % 360 + 360) % 360 - 180; }
  function sample(lat, lon) {
    var height;
    try { height = groundElevationCallback(lat, lon); } catch (error) { return false; }
    if (!Number.isFinite(height)) return false;
    highestGround = Math.max(highestGround, height);
    lowestGround = Math.min(lowestGround, height);
    return height;
  }
  // Include the centre and launch point, then sample the approach every quarter
  // nautical mile or less. Side probes account for an initial shallow turn.
  for (var i = 0; i <= 8; i++) {
    var probeLatitude = latitude + (target.lat - latitude) * i / 8;
    var ground = sample(probeLatitude, longitude);
    if (ground === false) return null;
    if (i === 0) startGround = ground;
    if (i === 0 || i === 4 || i === 8) {
      var sideDegrees = corridorNm / 3440.065 * 180 / Math.PI / Math.cos(probeLatitude * Math.PI / 180);
      if (sample(probeLatitude, wrappedLongitude(longitude - sideDegrees)) === false ||
          sample(probeLatitude, wrappedLongitude(longitude + sideDegrees)) === false) return null;
    }
  }
  var altitude = highestGround + clearance;
  // Drone ceiling is AGL, unlike every crewed aircraft's MSL ceiling. Leave
  // headroom below its actual 400 ft physics clamp across the sampled corridor.
  var maximumAltitude = drone ? lowestGround + Math.min(400, aircraft.ceiling) - 25 :
    aircraft.ceiling - (helicopter ? 100 : 250);
  if (!Number.isFinite(altitude) || altitude > maximumAltitude || altitude <= startGround) return null;
  var speedKts = 0, pitch = 0, throttle = 0;
  if (!Number.isFinite(aircraft.weight) || aircraft.weight <= 0) return null;
  if (rotor) {
    if (!(aircraft.maxThrust > aircraft.weight)) return null;
    throttle = aircraft.weight / aircraft.maxThrust;
  } else {
    if (!Number.isFinite(aircraft.wingArea) || aircraft.wingArea <= 0 ||
        !Number.isFinite(aircraft.cl0) || !Number.isFinite(aircraft.clPerAoa) || aircraft.clPerAoa <= 0 ||
        !Number.isFinite(aircraft.cd0) || aircraft.cd0 < 0 ||
        !Number.isFinite(aircraft.cdK) || aircraft.cdK < 0) return null;
    // Physics.stallSpeed is clean-wing TAS in ft/s, not indicated knots. Use
    // the passed aircraft rather than the mutable currently selected Physics.
    var rho = 0.002377 * Math.pow(Math.max(0, 1 - 0.0000068756 * altitude), 4.2561);
    var peakCl = aircraft.cl0 + 15 * aircraft.clPerAoa;
    if (!(rho > 0) || !(peakCl > 0)) return null;
    var stallKts = Math.sqrt(2 * aircraft.weight / (rho * aircraft.wingArea * peakCl)) * 0.5924838;
    speedKts = Math.max(glider ? 55 : 0, stallKts * 1.5);
    if (!Number.isFinite(speedKts) || speedKts > aircraft.maxSpeed * 0.8) return null;
    var speedFps = speedKts / 0.5924838;
    var qS = 0.5 * rho * speedFps * speedFps * aircraft.wingArea;
    function supportedWeight(angle) {
      var cl = aircraft.cl0 + aircraft.clPerAoa * angle;
      var drag = qS * (aircraft.cd0 + aircraft.cdK * cl * cl);
      return qS * cl + (glider ? 0 : drag * Math.tan(angle * Math.PI / 180));
    }
    // Trim within the attached-flow band. This also balances the vertical
    // component of thrust; starting every airframe at zero pitch made it sink.
    var lowPitch = -10, highPitch = 10;
    if (supportedWeight(lowPitch) > aircraft.weight || supportedWeight(highPitch) < aircraft.weight) return null;
    for (var step = 0; step < 28; step++) {
      var middlePitch = (lowPitch + highPitch) / 2;
      if (supportedWeight(middlePitch) < aircraft.weight) lowPitch = middlePitch;
      else highPitch = middlePitch;
    }
    pitch = (lowPitch + highPitch) / 2;
    var cl = aircraft.cl0 + aircraft.clPerAoa * pitch;
    var drag = qS * (aircraft.cd0 + aircraft.cdK * cl * cl);
    var neededThrust = drag / Math.cos(pitch * Math.PI / 180);
    if (glider) throttle = 0;
    else if (typeof thrustModel === 'function') {
      // Real engine thrust changes with airspeed and altitude, so find the
      // lever setting whose thrust balances drag at this speed and height.
      if (!(thrustModel(0.95, speedFps, altitude) >= neededThrust)) return null;
      var lowLever = 0, highLever = 0.95;
      for (var leverStep = 0; leverStep < 30; leverStep++) {
        var middleLever = (lowLever + highLever) / 2;
        if (thrustModel(middleLever, speedFps, altitude) < neededThrust) lowLever = middleLever;
        else highLever = middleLever;
      }
      throttle = (lowLever + highLever) / 2;
    } else throttle = neededThrust / aircraft.maxThrust;
    if (!Number.isFinite(throttle) || throttle < 0 || throttle > 0.95) return null;
  }
  return { lat: latitude, lon: longitude, heading: 0, altitude: altitude,
    speedKts: speedKts, throttle: throttle, pitch: pitch, fieldElev: startGround };
}
