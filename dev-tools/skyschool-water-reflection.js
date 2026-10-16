// Sunglint follows reflection geometry: the viewing ray must align with
// sunlight reflected by the water surface. Wind broadens this stylized lobe;
// this is not a measured wave spectrum or a physical water BRDF.
// https://science.nasa.gov/earth/earth-observatory/the-science-of-sunglint-84333/
function getFlightWaterFrame(solarHour, weather, reducedMotion, qualityTier) {
  var celestial = getFlightCelestialFrame(solarHour, weather, 0);
  var lighting = getFlightLightingFrame(solarHour);
  var sun = celestial.sun;
  var clamp = function(value) { return Math.max(0, Math.min(1, value)); };
  var tier = qualityTier == null ? 0 : qualityTier;
  var validTier = Number.isFinite(tier) && tier >= 0;
  var validWeather = weather == null || (typeof weather === 'object' && !Array.isArray(weather));
  var conditions = validWeather && weather != null ? weather : {};
  var own = Object.prototype.hasOwnProperty;
  var visibility = own.call(conditions, 'visibility') ? conditions.visibility : 1;
  visibility = validWeather && Number.isFinite(visibility) ? clamp(visibility) : 0;
  var wind = Number.isFinite(conditions.wind) ? Math.min(45, Math.abs(conditions.wind)) : 0;
  var sunlight = clamp(sun.elevationRad / (6 * Math.PI / 180));
  sunlight = sunlight * sunlight * (3 - 2 * sunlight);
  var lowSun = 1 - Math.max(0, sun.direction.y);
  return {
    shimmerStrength: validTier && tier < 2 && !reducedMotion ? (0.2 + 0.8 * lighting.daylight) * visibility : 0,
    glintStrength: validTier && tier === 0 ? sunlight * sun.opacity * (0.15 + 0.85 * lowSun * lowSun) : 0,
    sunDirection: sun.direction,
    reflectionPower: 96 - 64 * wind / 45
  };
}

// dx/dy/dz point FROM the water sample TO the camera, in world feet. The
// reflection of the incoming ray across a horizontal surface is (-sx,sy,-sz).
// Scaling before normalizing keeps long travel and very small vectors finite.
function getFlightWaterGlint(frame, dx, dy, dz) {
  if (!frame || !Number.isFinite(frame.glintStrength) || frame.glintStrength <= 0 || frame.glintStrength > 1 ||
      !Number.isFinite(frame.reflectionPower) || frame.reflectionPower < 32 || frame.reflectionPower > 96 ||
      !Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz) || dy <= 0) return 0;
  var sun = frame.sunDirection;
  if (!sun || !Number.isFinite(sun.x) || !Number.isFinite(sun.y) || !Number.isFinite(sun.z) || sun.y <= 0) return 0;
  var viewScale = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  var vx = dx / viewScale, vy = dy / viewScale, vz = dz / viewScale;
  var viewLength = Math.sqrt(vx * vx + vy * vy + vz * vz);
  var sunScale = Math.max(Math.abs(sun.x), Math.abs(sun.y), Math.abs(sun.z));
  var sx = sun.x / sunScale, sy = sun.y / sunScale, sz = sun.z / sunScale;
  var sunLength = Math.sqrt(sx * sx + sy * sy + sz * sz);
  var alignment = Math.max(0, Math.min(1, (-vx * sx + vy * sy - vz * sz) / (viewLength * sunLength)));
  return frame.glintStrength * Math.pow(alignment, frame.reflectionPower);
}
