// Shared apparent sky objects for the simulator's simplified solar clock,
// not a date/latitude ephemeris or a measured star catalog. The Sun and Moon
// are both about half a degree across; use a fixed 0.53-degree visual mean.
// NASA: https://eclipse2017.nasa.gov/exploring-angular-diameter
function getFlightCelestialFrame(solarHour, weather, altitudeFt) {
  var solar = getFlightSolarFrame(solarHour);
  var lighting = getFlightLightingFrame(solar.solarHour);
  var clamp = function(value) { return Math.max(0, Math.min(1, value)); };
  var smooth = function(low, high, value) {
    var t = clamp((value - low) / (high - low));
    return t * t * (3 - 2 * t);
  };
  var own = Object.prototype.hasOwnProperty;
  var validWeather = weather == null || (typeof weather === 'object' && !Array.isArray(weather));
  var conditions = validWeather && weather != null ? weather : {};
  var type = validWeather ? (own.call(conditions, 'type') ? conditions.type : 'clear') : '';
  var visibility = own.call(conditions, 'visibility') ? conditions.visibility : 1;
  // Explicit malformed visibility is conservative; absent visibility is clear.
  visibility = Number.isFinite(visibility) ? smooth(0.15, 0.9, clamp(visibility)) : 0;
  var sunCover = 0, moonCover = 0, starCover = 0;
  if (type === 'clear') { sunCover = 1; moonCover = 1; starCover = 1; }
  else if (type === 'breezy') { sunCover = 0.92; moonCover = 0.92; starCover = 0.95; }
  else if (type === 'gusty') { sunCover = 0.8; moonCover = 0.8; starCover = 0.85; }
  else if (type === 'partly_cloudy') { sunCover = 0.65; moonCover = 0.65; starCover = 0.65; }
  else if (type === 'overcast') { sunCover = 0.08; }
  // Storm, fog and unrecognized weather keep the sky objects obscured.
  var diameter = 0.53 * Math.PI / 180;
  var horizonLow = -diameter / 2, horizonHigh = 1.5 * Math.PI / 180;
  var sunOpacity = smooth(horizonLow, horizonHigh, solar.sun.elevationRad) *
    (0.85 + 0.15 * Math.max(0, Math.sin(solar.sun.elevationRad))) * visibility * sunCover;
  var moonOpacity = smooth(horizonLow, horizonHigh, solar.moon.elevationRad) *
    0.9 * lighting.nightFactor * visibility * moonCover;
  var starDusk = clamp(-solar.sun.elevationRad / (6 * Math.PI / 180));
  var altitude = Number.isFinite(altitudeFt) ? altitudeFt : 0;
  var altitudeBoost = clamp((altitude - 20000) / 20000) * 0.7;
  var starOpacity = Math.max(Math.pow(starDusk, 1.6), altitudeBoost * starDusk) * visibility * starCover;
  return {
    sun: {
      direction: solar.sun.direction, elevationRad: solar.sun.elevationRad,
      opacity: sunOpacity, angularDiameterRad: diameter,
      haloScale: 12, haloOpacity: 0.25 * sunOpacity,
      color: [1, 1 - lighting.warmth * 0.25, 1 - lighting.warmth * 0.5]
    },
    moon: {
      direction: solar.moon.direction, elevationRad: solar.moon.elevationRad,
      opacity: moonOpacity, angularDiameterRad: diameter,
      haloScale: 5, haloOpacity: 0.12 * moonOpacity, color: [0.88, 0.92, 1]
    },
    starOpacity: starOpacity
  };
}

// One deterministic 600-star upper hemisphere for both renderers. Keep the
// original golden-angle directions while fading the dense horizon band and
// varying brightness independently of position. No animation or allocations
// beyond the returned record; callers may cache this catalog when initializing.
function getFlightStar(index) {
  var slot = Number.isFinite(index) ? Math.max(0, Math.min(599, Math.floor(index))) : 0;
  var azimuth = slot * 137.508 * Math.PI / 180;
  var unit = ((Math.sin(slot * 78.233 + 12.9898) * 43758.5453) % 1 + 1) % 1;
  var polar = Math.acos(1 - unit);
  var direction = { x: Math.cos(azimuth) * Math.sin(polar), y: Math.cos(polar), z: Math.sin(azimuth) * Math.sin(polar) };
  var brightnessSeed = ((Math.sin(slot * 39.346 + 93.9898) * 43758.5453) % 1 + 1) % 1;
  var horizon = Math.max(0, Math.min(1, (direction.y - 0.02) / 0.16));
  return { direction: direction, brightness: (0.55 + 0.45 * brightnessSeed) * horizon * horizon * (3 - 2 * horizon) };
}
