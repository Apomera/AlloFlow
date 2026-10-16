// A bounded visual atmosphere for the simulator's simplified solar clock.
// These are illustrative scattering colors, not a weather/date ephemeris.
function getFlightWeatherAppearance(weather) {
  var own = Object.prototype.hasOwnProperty;
  var validWeather = weather == null || (typeof weather === 'object' && !Array.isArray(weather));
  var conditions = validWeather && weather != null ? weather : {};
  var type = validWeather ? (own.call(conditions, 'type') ? conditions.type : 'clear') : '';
  var rawVisibility = own.call(conditions, 'visibility') ? conditions.visibility : 1;
  var validVisibility = validWeather && Number.isFinite(rawVisibility);
  var visibility = validVisibility ? Math.max(0.25, Math.min(1, rawVisibility)) : 0.25;
  // The direct-light envelope matches the visible celestial bodies. Fog has
  // a minimum usable range, but that floor must not reveal an obscured sun.
  var directVisibility = validVisibility ? Math.max(0, Math.min(1, rawVisibility)) : 0;
  var transmission = Math.max(0, Math.min(1, (directVisibility - 0.15) / 0.75));
  transmission = transmission * transmission * (3 - 2 * transmission);
  var coverTransmission = type === 'clear' ? 1 : type === 'breezy' ? 0.92 : type === 'gusty' ? 0.8
    : type === 'partly_cloudy' ? 0.65 : type === 'overcast' ? 0.08 : 0;
  var cloudCover = 1 - coverTransmission;
  return {
    cloudCover: cloudCover,
    directTransmission: coverTransmission * transmission,
    ambientTransmission: type === 'foggy' ? 0.92 : 1 - 0.28 * cloudCover,
    visibility: visibility
  };
}

function getFlightFogFrame(solarHour, weather, environment) {
  var lighting = getFlightLightingFrame(solarHour);
  var appearance = getFlightWeatherAppearance(weather);
  var region = environment && Number.isFinite(environment.visibilityFactor)
    ? Math.max(0.25, Math.min(1, environment.visibilityFactor)) : 1;
  // Cap the clear range first, then apply weather. Capping after multiplying
  // visibility made overcast and clear skies share the same noon fog range.
  var base = Math.min(95000, 240000 * (0.35 + 0.65 * lighting.brightness) * region);
  var far = base * appearance.visibility;
  return { near: far * 0.25, far: far };
}

function getFlightSkyPalette(solarHour, environment, altitudeFt, visibility, weather) {
  var lighting = getFlightLightingFrame(solarHour);
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function smooth(low, high, value) {
    var t = clamp((value - low) / (high - low), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function mix(a, b, amount) {
    return a.map(function(channel, index) { return channel + (b[index] - channel) * amount; });
  }
  var height = Number.isFinite(altitudeFt) ? clamp(altitudeFt, 0, 65000) : 0;
  var clarity = Number.isFinite(visibility) ? clamp(visibility, 0.25, 1) : 1;
  var region = environment && Number.isFinite(environment.visibilityFactor)
    ? clamp(environment.visibilityFactor, 0.25, 1) : 1;
  var defaultHaze = [160, 187, 205];
  var regionalHaze = defaultHaze.map(function(channel, index) {
    var supplied = environment && Array.isArray(environment.haze) ? environment.haze[index] : null;
    return (Number.isFinite(supplied) ? clamp(supplied, 0, 255) : channel) / 255;
  });
  var elevation = lighting.sunElevationRad;
  var degrees = elevation * 180 / Math.PI;
  var skyDay = smooth(-12, 12, degrees);
  var twilight = smooth(-12, -4, degrees) * (1 - smooth(0, 20, degrees));
  var nightHorizon = [0.008, 0.014, 0.030];
  var horizon = mix(nightHorizon, [0.62, 0.74, 0.86], skyDay);
  var zenith = mix([0.002, 0.004, 0.012], [0.18, 0.36, 0.65], lighting.daylight);
  // Warmth belongs near the horizon, with only a restrained violet shift
  // overhead. Both blends reach zero continuously outside twilight.
  horizon = mix(horizon, [0.88, 0.43, 0.22], twilight * 0.62);
  zenith = mix(zenith, [0.20, 0.12, 0.28], twilight * 0.16);
  var weatherHaze = (1 - clarity) / 0.75;
  var regionHaze = (1 - region) / 0.75;
  var hazeTarget = mix(nightHorizon, regionalHaze, skyDay);
  horizon = mix(horizon, hazeTarget, weatherHaze * 0.40 + regionHaze * 0.12);
  // Low visibility flattens the sky's contrast instead of painting an opaque
  // overlay over the flight instruments or changing the scene's lighting.
  zenith = mix(zenith, horizon, weatherHaze * 0.28 + regionHaze * 0.08);
  var appearance = getFlightWeatherAppearance(weather);
  if (appearance.cloudCover > 0) {
    var foggy = weather && weather.type === 'foggy';
    var cloudHorizon = mix([0.010, 0.014, 0.021], foggy ? [0.52, 0.57, 0.61] : [0.34, 0.39, 0.45], skyDay);
    var cloudZenith = mix([0.008, 0.012, 0.019], foggy ? [0.46, 0.51, 0.55] : [0.16, 0.20, 0.26], skyDay);
    horizon = mix(horizon, cloudHorizon, appearance.cloudCover);
    zenith = mix(zenith, cloudZenith, appearance.cloudCover);
  }
  var thinAir = smooth(5000, 65000, height) * lighting.daylight;
  horizon = horizon.map(function(channel) { return clamp(channel * (1 - thinAir * 0.16), 0, 1); });
  zenith = zenith.map(function(channel) { return clamp(channel * (1 - thinAir * 0.60), 0, 1); });
  return { horizon: horizon, zenith: zenith };
}

// One existing opaque MeshBasic sky dome; no texture, pass, or geometry change.
// The material's normal diffuse color remains the exact horizon/fog color.
function attachFlightSkyGradient(material, THREE) {
  if (!material || material.isMeshBasicMaterial !== true || !THREE || typeof THREE.Color !== 'function') return material;
  if (material._flightSkyGradientHook && material.onBeforeCompile === material._flightSkyGradientHook) return material;
  if (!material.userData || typeof material.userData !== 'object') material.userData = {};
  var zenith = { value: new THREE.Color().copy(material.color) };
  var diagnostic = { version: 1, attached: true, patched: false, reason: 'pending', uniforms: { zenith: zenith } };
  material.userData.flightSkyGradient = diagnostic;
  var previousCompile = typeof material.onBeforeCompile === 'function' ? material.onBeforeCompile : null;
  var previousCacheKey = typeof material.customProgramCacheKey === 'function' ? material.customProgramCacheKey : null;
  var defaultCacheKey = THREE.Material && THREE.Material.prototype &&
    previousCacheKey === THREE.Material.prototype.customProgramCacheKey;
  var previousHookKey = previousCompile ? previousCompile.toString() : '';
  material.customProgramCacheKey = function() {
    var prior = defaultCacheKey ? previousHookKey : (previousCacheKey ? String(previousCacheKey.call(this)) : previousHookKey);
    return prior + '|flight-sky-gradient:v1';
  };
  material.onBeforeCompile = function(shader, renderer) {
    if (previousCompile) previousCompile.call(this, shader, renderer);
    if (!shader || typeof shader.vertexShader !== 'string' || typeof shader.fragmentShader !== 'string') {
      diagnostic.patched = false; diagnostic.reason = 'invalid-shader'; return;
    }
    var vertex = shader.vertexShader, fragment = shader.fragmentShader;
    if (vertex.indexOf('vFlightSkyDirection') !== -1 || fragment.indexOf('vFlightSkyDirection') !== -1 ||
        fragment.indexOf('flightSkyZenith') !== -1 || shader.uniforms && Object.prototype.hasOwnProperty.call(shader.uniforms, 'flightSkyZenith')) {
      diagnostic.patched = false; diagnostic.reason = 'uniform-already-defined'; return;
    }
    if (vertex.indexOf('#include <common>') === -1 || vertex.indexOf('#include <worldpos_vertex>') === -1 ||
        fragment.indexOf('#include <common>') === -1 || fragment.indexOf('#include <color_fragment>') === -1) {
      diagnostic.patched = false; diagnostic.reason = 'unsupported-shader-chunks'; return;
    }
    vertex = vertex.replace('#include <common>', '#include <common>\nvarying vec3 vFlightSkyDirection;');
    vertex = vertex.replace('#include <worldpos_vertex>', [
      '#include <worldpos_vertex>',
      // Translation must not tilt the gradient as the dome follows the camera.
      'vFlightSkyDirection = (modelMatrix * vec4(transformed, 0.0)).xyz;'
    ].join('\n'));
    fragment = fragment.replace('#include <common>', [
      '#include <common>',
      'varying vec3 vFlightSkyDirection;',
      'uniform vec3 flightSkyZenith;'
    ].join('\n'));
    fragment = fragment.replace('#include <color_fragment>', [
      '#include <color_fragment>',
      'float flightSkyHeight = clamp(normalize(vFlightSkyDirection).y, 0.0, 1.0);',
      'float flightSkyBlend = smoothstep(0.0, 0.65, flightSkyHeight);',
      'diffuseColor.rgb = mix(diffuseColor.rgb, flightSkyZenith, flightSkyBlend);'
    ].join('\n'));
    shader.uniforms = shader.uniforms || {};
    shader.uniforms.flightSkyZenith = zenith;
    shader.vertexShader = vertex;
    shader.fragmentShader = fragment;
    diagnostic.patched = true; diagnostic.reason = 'patched';
  };
  material._flightSkyGradientHook = material.onBeforeCompile;
  material.fog = false;
  material.needsUpdate = true;
  return material;
}

function updateFlightSkyGradient(material, palette) {
  function validColor(color) {
    return Array.isArray(color) && color.length === 3 && color.every(function(channel) {
      return Number.isFinite(channel) && channel >= 0 && channel <= 1;
    });
  }
  var diagnostic = material && material.userData && material.userData.flightSkyGradient;
  if (!material || !material.color || typeof material.color.setRGB !== 'function' || !palette ||
      !validColor(palette.horizon) || !validColor(palette.zenith)) return material;
  material.color.setRGB(palette.horizon[0], palette.horizon[1], palette.horizon[2]);
  var uniform = diagnostic && diagnostic.uniforms && diagnostic.uniforms.zenith;
  if (uniform && uniform.value && typeof uniform.value.setRGB === 'function') {
    uniform.value.setRGB(palette.zenith[0], palette.zenith[1], palette.zenith[2]);
  }
  return material;
}
