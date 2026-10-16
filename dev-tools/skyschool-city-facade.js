function attachFlightCityFacade(material, THREE) {
  // Geometry and scene coordinates are feet. No textures, extra draw calls,
  // shader-time animation, or per-frame allocations are needed for windows.
  if (!material || material.isMeshLambertMaterial !== true || !THREE) return material;
  if (!material.userData || typeof material.userData !== 'object') material.userData = {};
  if (material._flightCityFacadeHook && material.onBeforeCompile === material._flightCityFacadeHook) return material;
  var diagnostic = { version: 3, attached: true, patched: false, reason: 'pending' };
  material.userData.flightCityFacade = diagnostic;
  var previousCompile = typeof material.onBeforeCompile === 'function' ? material.onBeforeCompile : null;
  var previousCacheKey = typeof material.customProgramCacheKey === 'function' ? material.customProgramCacheKey : null;
  var defaultCacheKey = THREE.Material && THREE.Material.prototype &&
    previousCacheKey === THREE.Material.prototype.customProgramCacheKey;
  var previousHookKey = previousCompile ? previousCompile.toString() : '';
  material.extensions = Object.assign({}, material.extensions || {}, { derivatives: true });
  material.customProgramCacheKey = function() {
    var prior = defaultCacheKey ? previousHookKey : (previousCacheKey ? String(previousCacheKey.call(this)) : previousHookKey);
    return prior + '|flight-city-facade:v3';
  };
  material.onBeforeCompile = function(shader, renderer) {
    if (previousCompile) previousCompile.call(this, shader, renderer);
    if (!shader || typeof shader.vertexShader !== 'string' || typeof shader.fragmentShader !== 'string') {
      diagnostic.patched = false; diagnostic.reason = 'invalid-shader'; return;
    }
    var vertex = shader.vertexShader, fragment = shader.fragmentShader;
    if (vertex.indexOf('vFlightFacadePosition') !== -1 || fragment.indexOf('vFlightFacadePosition') !== -1) {
      diagnostic.patched = false; diagnostic.reason = 'varying-already-defined'; return;
    }
    if (vertex.indexOf('#include <common>') === -1 || vertex.indexOf('#include <worldpos_vertex>') === -1 ||
        fragment.indexOf('#include <common>') === -1 || fragment.indexOf('#include <emissivemap_fragment>') === -1 ||
        fragment.indexOf('#include <aomap_fragment>') === -1) {
      diagnostic.patched = false; diagnostic.reason = 'unsupported-shader-chunks'; return;
    }
    var varyings = '\nvarying vec3 vFlightFacadePosition;\nvarying vec3 vFlightFacadeNormal;\nvarying float vFlightFacadeDepth;\n' +
      '#ifdef FLIGHT_FACADE_BOUNDS\nvarying vec2 vFlightFacadeBounds;\n#endif\n';
    vertex = vertex.replace('#include <common>', '#include <common>' + varyings +
      '#ifdef FLIGHT_FACADE_BOUNDS\nattribute vec2 flightFacadeBounds;\n#endif\n');
    vertex = vertex.replace('#include <worldpos_vertex>', [
      '#include <worldpos_vertex>',
      'vec4 flightFacadeLocal = vec4(transformed, 1.0);',
      '#ifdef USE_INSTANCING',
      '  flightFacadeLocal = instanceMatrix * flightFacadeLocal;',
      '#endif',
      // w=0 retains world-foot scale and orientation, but omits floating-origin
      // translation. Both a scaled unit box and a merged footprint mesh work.
      'vFlightFacadePosition = (modelMatrix * vec4(flightFacadeLocal.xyz, 0.0)).xyz;',
      'vFlightFacadeNormal = inverseTransformDirection(transformedNormal, viewMatrix);',
      'vFlightFacadeDepth = max(0.0, -mvPosition.z);',
      '#ifdef FLIGHT_FACADE_BOUNDS',
      // Mapped walls use unscaled local feet with a ground/roof pair constant
      // across each building. Generic boxes do not need this attribute.
      '  vFlightFacadeBounds = flightFacadeBounds;',
      '#endif'
    ].join('\n'));
    fragment = fragment.replace('#include <common>', '#include <common>' + varyings + [
      'float flightFacadeHash(vec2 p) {',
      '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
      '}',
      ''
    ].join('\n'));
    fragment = fragment.replace('#include <emissivemap_fragment>', [
      '#include <emissivemap_fragment>',
      'vec3 flightFacadeNormal = normalize(vFlightFacadeNormal);',
      // Roofs and sloping roof faces receive no window light.
      'float flightFacadeWall = 1.0 - smoothstep(0.15, 0.5, abs(flightFacadeNormal.y));',
      'vec2 flightFacadeTangent = vec2(-flightFacadeNormal.z, flightFacadeNormal.x);',
      'flightFacadeTangent *= inversesqrt(max(0.0001, dot(flightFacadeTangent, flightFacadeTangent)));',
      // Twelve-foot bays and storeys; flat-shaded facade normals give a stable
      // tangent on each wall, including non-axis-aligned real footprints.
      'vec2 flightFacadeUV = vec2(dot(vFlightFacadePosition.xz, flightFacadeTangent), vFlightFacadePosition.y) / 12.0;',
      'float flightFacadeWindowZone = 1.0;',
      'float flightFacadeAboveBase = vFlightFacadePosition.y;',
      '#ifdef FLIGHT_FACADE_BOUNDS',
      '  flightFacadeAboveBase = vFlightFacadePosition.y - vFlightFacadeBounds.x;',
      '  float flightFacadeBuildingHeight = max(0.0, vFlightFacadeBounds.y - vFlightFacadeBounds.x);',
      '  flightFacadeUV.y = flightFacadeAboveBase / 12.0;',
      // Two solid feet at the occupied base and roof prevent glass from
      // entering downhill foundations or ending abruptly at a flat roof.
      // Inward AA keeps those surfaces solid even when they are subpixel.
      '  float flightFacadeTrimAA = clamp(fwidth(vFlightFacadePosition.y), 0.05, 1.0);',
      '  flightFacadeWindowZone = smoothstep(2.0, 2.0 + flightFacadeTrimAA, flightFacadeAboveBase)',
      '    * smoothstep(2.0, 2.0 + flightFacadeTrimAA, flightFacadeBuildingHeight - flightFacadeAboveBase)',
      '    * step(6.0, flightFacadeBuildingHeight);',
      '#endif',
      'vec2 flightFacadeFootprint = max(fwidth(flightFacadeUV), vec2(0.0001));',
      'vec2 flightFacadeAA = min(flightFacadeFootprint, vec2(0.45));',
      'vec2 flightFacadeOpening = 1.0 - smoothstep(vec2(0.29, 0.31) - flightFacadeAA, vec2(0.29, 0.31) + flightFacadeAA, abs(fract(flightFacadeUV) - 0.5));',
      'float flightFacadeWindow = flightFacadeOpening.x * flightFacadeOpening.y;',
      // Remove high-frequency detail before the windows become subpixel. The
      // far value is their area/occupancy average, never a glowing roof/box.
      'float flightFacadeDetail = (1.0 - smoothstep(0.18, 0.68, max(flightFacadeFootprint.x, flightFacadeFootprint.y))) * (1.0 - smoothstep(6000.0, 24000.0, vFlightFacadeDepth));',
      'float flightFacadeGlass = mix(0.3596, flightFacadeWindow, flightFacadeDetail) * flightFacadeWall * flightFacadeWindowZone;',
      'diffuseColor.rgb *= mix(vec3(1.0), vec3(0.32, 0.44, 0.57), flightFacadeGlass);',
      'float flightFacadeOccupied = step(0.55, flightFacadeHash(floor(flightFacadeUV)));',
      'float flightFacadeBrightness = 0.65 + 0.35 * flightFacadeHash(floor(flightFacadeUV) + vec2(19.0, 47.0));',
      'float flightFacadeLight = mix(0.1335, flightFacadeWindow * flightFacadeOccupied * flightFacadeBrightness, flightFacadeDetail);',
      // The existing day/night material.emissive controls when lights turn on.
      'totalEmissiveRadiance *= flightFacadeLight * flightFacadeWall;',
      'totalEmissiveRadiance *= flightFacadeWindowZone;'
    ].join('\n'));
    // Approximate the reduced ambient light at a wall's base. This is not a
    // cast shadow: direct sunlight, roof faces, and window emission are intact.
    // Height is in physical feet for scaled boxes and measured-map walls alike.
    fragment = fragment.replace('#include <aomap_fragment>', [
      '#include <aomap_fragment>',
      'float flightFacadeBaseAmbient = 1.0 - 0.25 * flightFacadeWall * (1.0 - smoothstep(0.0, 12.0, flightFacadeAboveBase));',
      'reflectedLight.indirectDiffuse *= flightFacadeBaseAmbient;'
    ].join('\n'));
    shader.vertexShader = vertex;
    shader.fragmentShader = fragment;
    diagnostic.patched = true; diagnostic.reason = 'patched';
  };
  material._flightCityFacadeHook = material.onBeforeCompile;
  material.needsUpdate = true;
  return material;
}
