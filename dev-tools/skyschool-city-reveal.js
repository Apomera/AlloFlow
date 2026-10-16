// Opaque arrival reveal for mapped city geometry. A fixed 4 × 4 coverage
// pattern avoids transparency sorting between merged walls, roofs, and roads.
function attachFlightCityReveal(material, three, sharedUniform) {
  if (!material || material.isMeshLambertMaterial !== true || !three) return material;
  if (!material.userData || typeof material.userData !== 'object') material.userData = {};
  if (material._flightCityRevealHook && material.onBeforeCompile === material._flightCityRevealHook) return material;
  var uniform = sharedUniform && typeof sharedUniform === 'object' ? sharedUniform : { value: 1 };
  uniform.value = Number.isFinite(uniform.value) ? Math.max(0, Math.min(1, uniform.value)) : 1;
  var diagnostic = { version: 1, attached: true, patched: false, reason: 'pending', uniform: uniform };
  material.userData.flightCityReveal = diagnostic;
  var previousCompile = typeof material.onBeforeCompile === 'function' ? material.onBeforeCompile : null;
  var previousCacheKey = typeof material.customProgramCacheKey === 'function' ? material.customProgramCacheKey : null;
  var defaultCacheKey = three.Material && three.Material.prototype &&
    previousCacheKey === three.Material.prototype.customProgramCacheKey;
  var previousHookKey = previousCompile ? previousCompile.toString() : '';
  material.customProgramCacheKey = function() {
    var prior = defaultCacheKey ? previousHookKey : (previousCacheKey ? String(previousCacheKey.call(this)) : previousHookKey);
    return prior + '|flight-city-reveal:v1';
  };
  material.onBeforeCompile = function(shader, renderer) {
    if (previousCompile) previousCompile.call(this, shader, renderer);
    // Unsupported shaders stay fully visible. Never remove their original
    // shader or make the entire district disappear when a chunk changes.
    if (!shader || typeof shader.fragmentShader !== 'string') {
      diagnostic.patched = false; diagnostic.reason = 'invalid-shader'; return;
    }
    var fragment = shader.fragmentShader;
    if (fragment.indexOf('flightCityRevealCoverage') !== -1) {
      diagnostic.patched = false; diagnostic.reason = 'uniform-already-defined'; return;
    }
    if (fragment.indexOf('#include <common>') === -1 || fragment.indexOf('#include <alphatest_fragment>') === -1) {
      diagnostic.patched = false; diagnostic.reason = 'unsupported-shader-chunks'; return;
    }
    var uniforms = shader.uniforms || {};
    if (Object.prototype.hasOwnProperty.call(uniforms, 'flightCityRevealCoverage')) {
      diagnostic.patched = false; diagnostic.reason = 'uniform-already-defined'; return;
    }
    fragment = fragment.replace('#include <common>', [
      '#include <common>',
      'uniform float flightCityRevealCoverage;',
      'float flightCityRevealBayer2(vec2 p) {',
      '  return 2.0 * p.x + 3.0 * p.y - 4.0 * p.x * p.y;',
      '}',
      'float flightCityRevealThreshold(vec2 pixel) {',
      '  vec2 low = mod(floor(pixel), 2.0);',
      '  vec2 high = mod(floor(pixel * 0.5), 2.0);',
      '  return (4.0 * flightCityRevealBayer2(low) + flightCityRevealBayer2(high) + 0.5) / 16.0;',
      '}'
    ].join('\n'));
    fragment = fragment.replace('#include <alphatest_fragment>', [
      '#include <alphatest_fragment>',
      'if (flightCityRevealCoverage < 1.0 && flightCityRevealCoverage <= flightCityRevealThreshold(gl_FragCoord.xy)) discard;'
    ].join('\n'));
    uniforms.flightCityRevealCoverage = uniform;
    shader.uniforms = uniforms;
    shader.fragmentShader = fragment;
    diagnostic.patched = true; diagnostic.reason = 'patched';
  };
  material._flightCityRevealHook = material.onBeforeCompile;
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.needsUpdate = true;
  return material;
}

function createFlightCityReveal(three, materials) {
  var reveal = { uniform: { value: 0 }, progress: 0, elapsed: 0, duration: 0.6, active: true };
  (materials || []).forEach(function(material) { attachFlightCityReveal(material, three, reveal.uniform); });
  return reveal;
}

function updateFlightCityReveal(group, deltaSeconds, immediate) {
  var reveal = group && group.userData && group.userData.cityReveal;
  if (!reveal || !reveal.uniform) return { progress: 1, active: false };
  var duration = Number.isFinite(reveal.duration) && reveal.duration > 0 ? reveal.duration : 0.6;
  var elapsed = Number.isFinite(reveal.elapsed) ? Math.max(0, Math.min(duration, reveal.elapsed)) : 0;
  if (immediate) elapsed = duration;
  else if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) elapsed = Math.min(duration, elapsed + deltaSeconds);
  var t = elapsed / duration;
  reveal.elapsed = elapsed;
  reveal.progress = t * t * (3 - 2 * t);
  reveal.uniform.value = reveal.progress;
  reveal.active = elapsed < duration;
  return reveal;
}
