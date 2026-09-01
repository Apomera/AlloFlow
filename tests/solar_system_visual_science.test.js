import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

const source = readFileSync(COPIES[0], 'utf8');

describe('solar system visual science model', () => {
  it('ships identical canonical and desktop assets', () => {
    expect(readFileSync(COPIES[1], 'utf8')).toBe(source);
  });

  it('uses measured eccentricity and inclination instead of random circular stand-ins', () => {
    const requiredElements = [
      ['Mercury', '0.20564', '7.005'],
      ['Venus', '0.00678', '3.395'],
      ['Earth', '0.01671', '0'],
      ['Mars', '0.09339', '1.850'],
      ['Jupiter', '0.04839', '1.304'],
      ['Saturn', '0.05386', '2.486'],
      ['Uranus', '0.04726', '0.773'],
      ['Neptune', '0.00859', '1.770'],
      ['Pluto', '0.2488', '17.16'],
    ];

    requiredElements.forEach(([body, eccentricity, inclination]) => {
      expect(source).toContain(`key: '${body}'`);
      expect(source).toContain(`orbitE: ${eccentricity}, orbitI: ${inclination}`);
    });
    expect(source).toContain('function solveSolarKepler(meanAnomaly, eccentricity)');
    expect(source).toContain('xPrime = semiMajor * (Math.cos(eccentricAnomaly) - eccentricity)');
    expect(source).toContain('new THREE.LineLoop(orbitGeo, orbitMat)');
    expect(source).toContain('solarOrbitPoint(mesh._orbitBody, mesh._meanAnomaly, mesh.position)');
    expect(source).not.toContain("eccentricity: p.name === 'Pluto'");
  });

  it('models Halley with Keplerian motion and an anti-solar ion-tail cue', () => {
    expect(source).toContain('orbitE: 0.96714, orbitI: 162.26, orbitNode: 58.42');
    expect(source).toContain('cometMesh._speedScale = 1 / 75.3;');
    expect(source).toContain('const awayX = mesh.position.x / cometDistance;');
    expect(source).toContain('mesh._tail.material.opacity = 0.18 + tailStrength * 0.62;');
    expect(source).not.toContain('shift old positions back');
  });

  it('shows every giant-planet ring system and both debris regions honestly', () => {
    ['Jupiter', 'Saturn', 'Uranus', 'Neptune'].forEach((planet) => {
      expect(source).toContain(`${planet}: {`);
    });
    expect(source).toContain("label: '13 narrow, dark rings'");
    expect(source).toContain("label: 'five main rings and four outer-ring arcs'");
    expect(source).toContain('function addSolarRingSystem(parent, planet)');
    expect(source).toContain('const asteroidCount = 360;');
    expect(source).toContain('const kuiperCount = 520;');
    expect(source).toContain("data-region-model': 'asteroid-2-to-4-au-kuiper-30-to-50-au'");
    expect(source).toContain('body sizes and debris density enlarged');
    expect(source).not.toContain('const ang = Math.random() * Math.PI * 2;');
    expect(source).toContain('scene.background = spaceBackdropTexture;');
    expect(source).toContain('spaceBackdropTexture.dispose();');
    expect(source).not.toContain('new THREE.SphereGeometry(260, 32, 20)');
  });

  it('labels compressed scale and applies the observatory treatment to every visual family', () => {
    expect(source).toContain('className: "solar-cosmos max-w-6xl');
    expect(source).toContain("'data-orbit-model': 'keplerian-j2000-compressed'");
    expect(source).toContain('Eccentricity + inclination shown');
    expect(source).toContain('.solar-cosmos svg[viewBox]');
    expect(source).toContain('.solar-cosmos canvas[role="img"]');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('keeps the full-system orrery legible with a scientifically disclosed inner inset', () => {
    expect(source).toContain('function drawOrreryInnerInset(ctx, currentTime)');
    expect(source).toContain('MAGNIFIED INNER SYSTEM');
    expect(source).toContain('One distance scale \u00b7 markers enlarged');
    expect(source).toContain('drawOrreryInnerInset(ctx, t)');
    expect(source).toContain('hideMainInnerLabel');
    expect(source).toContain('hideCompressedSmallBodyLabel');
    expect(source).toContain('one common orbital-distance scale for Mercury through Mars');
    expect(source).toContain('Magnified inner inset');
    expect(source).toContain('#aebdde');
    expect(source).toContain('Light mode keeps a restrained observatory star field');
  });

  it('makes world selection and surface interaction visually clear without implying false scale', () => {
    expect(source).toContain('var PLANET_PORTRAITS = {');
    expect(source).toContain('var PLANET_KINDS = {');
    expect(source).toContain('var RINGED_GIANTS = { Jupiter: true, Saturn: true, Uranus: true, Neptune: true }');
    expect(source).toContain('Illustrative portraits · not to scale');
    expect(source).toContain('Rings shown on all four giant planets');
    expect(source).toContain('className: "solar-world-thumb"');
    expect(source).toContain("ctx.roundRect(captionX, captionY, captionW, 56, 12)");
    expect(source).toContain('Drag to rotate \\u2022 evidence controls below');
  });

  it('keeps primary explorer labels readable and responsive without hiding long world names', () => {
    expect(source).toContain('data-solarsystem-canvas-world-picker');
    expect(source).toContain('.solar-cosmos .solar-canvas-world-picker{display:grid;grid-template-columns:repeat(9,minmax(0,1fr))');
    expect(source).toContain('@media(max-width:900px){.solar-cosmos .solar-canvas-world-picker{grid-template-columns:repeat(5,minmax(0,1fr))}}');
    expect(source).toContain('.solar-cosmos .solar-canvas-world-picker{grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(source).toContain('.solar-cosmos .solar-canvas-world-button,.solar-cosmos .solar-canvas-controls button,.solar-cosmos .solar-world-view-tab{min-height:44px}');
    expect(source).toContain('.solar-cosmos .solar-world-card-name{min-height:25px;line-height:1.2;overflow-wrap:anywhere}');
    expect(source).toContain('.solar-cosmos .solar-world-spotlight-stat-value{margin-top:3px;color:#f8fafc;font-size:12px');
    expect(source).toContain('.solar-cosmos .solar-model-note strong{display:block;font-size:10px');
    expect(source).toContain('.solar-cosmos .solar-model-note span{display:block;margin-top:3px;font-size:11px');
    expect(source).not.toContain('className: "mt-1 truncate text-[11px] font-black" }, p.name');
  });

  it('keeps the mobile 3D playback strip shrinkable with full-size touch targets', () => {
    expect(source).toContain('"data-solarsystem-speed-control": true');
    expect(source).toContain('className: "solar-canvas-speed-control flex min-w-0 items-center');
    expect(source).toContain('"data-solarsystem-speed-slider": true');
    expect(source).toContain('className: "solar-canvas-speed-input min-w-0 flex-1');
    expect(source).toContain('.solar-cosmos .solar-canvas-controls{gap:4px!important;padding:6px!important}');
    expect(source).toContain('.solar-cosmos .solar-canvas-speed-control input[type="range"]{min-width:0;height:44px!important}');
    expect(source).not.toContain('.solar-cosmos .solar-canvas-controls{overflow:hidden');
  });

  it('makes overview evidence and Earth comparisons explicit on compact screens', () => {
    const overviewStart = source.indexOf('React.createElement("dl", { "data-solarsystem-overview-metrics": sel.key');
    const overviewEnd = source.indexOf("(d.viewTab) === 'surface'", overviewStart);
    const overviewSource = source.slice(overviewStart, overviewEnd);

    expect(overviewStart).toBeGreaterThan(-1);
    expect(overviewEnd).toBeGreaterThan(overviewStart);
    expect(overviewSource).toContain('"data-solarsystem-overview-metrics": sel.key');
    expect(overviewSource).toContain('React.createElement("dl"');
    expect(overviewSource).toContain("['\\uD83D\\uDCCF', 'Diameter', sel.diameter]");
    expect(overviewSource).toContain("['\\u2696\\uFE0F', 'Surface gravity', sel.gravity || 'Unknown']");
    expect(overviewSource).toContain("['\\uD83C\\uDF2C', 'Atmosphere', sel.atmosphere || 'Unknown']");
    expect(overviewSource).toContain("['\\uD83D\\uDCA0', 'Type', PLANET_KINDS[sel.key] || 'Rocky']");
    expect(overviewSource).toContain('"data-solarsystem-earth-comparisons": sel.key');
    expect(overviewSource).toContain('className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3"');
    expect(overviewSource).toContain('"data-solar-comparison-meter": "gravity", role: "meter"');
    expect(overviewSource).toContain('"aria-valuemax": 3');
    expect(overviewSource).toContain('/ 3) * 100');
    expect(overviewSource).toContain('"data-solar-comparison-meter": "radius", role: "meter"');
    expect(overviewSource).toContain('"aria-valuemax": 12');
    expect(overviewSource).toContain('/ 12) * 100');
    expect(overviewSource).toContain('solar-earth-reference-marker');
    expect(overviewSource.match(/data-solarsystem-notable-features/g)).toHaveLength(1);
    expect(overviewSource).not.toContain('notable_features_2');
    expect(overviewSource).not.toContain('(GRAVITY_MAP[sel.key] || 1) * 42');
    expect(overviewSource).not.toContain('((PLANET_RADII[sel.key] || 6371) / 6371) * 9');
    expect(source).toContain('"data-solarsystem-surface-conditions": sel.key');
    expect(source).toContain('className: "grid grid-cols-3 gap-1.5 sm:gap-2 mb-2"');
  });

  it('fills the mission-control column with a responsive, scientifically disclosed world spotlight', () => {
    expect(source).toContain('var spotlightPlanet = sel || missionEarth;');
    expect(source).toContain('data-solarsystem-world-spotlight');
    expect(source).toContain('className: "solar-world-spotlight"');
    expect(source).toContain('role: "figure"');
    expect(source).toContain('PLANET_PORTRAITS[spotlightPlanet.key]');
    expect(source).toContain('RINGED_GIANTS[spotlightPlanet.key]');
    expect(source).toContain('spotlightPlanet.atmosphere');
    expect(source).toContain('spotlightPlanet.surface');
    expect(source).toContain('Illustrative portrait \\u00b7 not to scale');
    expect(source).toContain('.solar-cosmos .solar-command-primary{display:flex');
    expect(source).toContain('@media(max-width:640px){.solar-cosmos .solar-world-spotlight{min-height:0}');
  });

  it('keeps the selected 3D world locked to its label and declutters compact canvases', () => {
    expect(source).toContain('var compactLabelMode = W <= 640;');
    expect(source).toContain("var selectedLabelName = canvas.dataset.selected || '';");
    expect(source).toContain("var labelTelemetry = canvas.parentElement ? canvas.parentElement.querySelector('.solar-telemetry') : null;");
    expect(source).toContain('labelY - labelHeight < telemetryClearY');
    expect(source).toContain('var compactAnchor = compactBodyIndex === 2 || compactBodyIndex === 4 || compactBodyIndex === 7;');
    expect(source).toContain('if (compactLabelMode && !projectedSelected && !compactAnchor) return;');
    expect(source).toContain('if (projectedSelected) {');
    expect(source).toContain('entry.x = lx; entry.y = ly; entry.seeded = true;');
    expect(source).toContain("live.el.className = isSelected ? 'solar-orbit-label solar-orbit-label--selected'");
    expect(source).toContain('.solar-cosmos .solar-orbit-label--selected::before{content:"TARGET"');
    expect(source).toContain('var labelX = Math.max(labelHalfWidth + 6');
    expect(source).toContain('var labelBottomLimit = compactLabelMode ? H - 142 : H - 46;');
    expect(source).toContain('let W = canvas.clientWidth || 600;');
    expect(source).toContain('let H = canvas.clientHeight || 340;');
    expect(source).toContain('W = w; H = h;');
    expect(source).toContain('max-width:calc(100% - 12px);overflow:hidden;text-overflow:ellipsis');
  });

  it('turns Surface mode into a compact, canvas-safe observation console', () => {
    const surfaceStart = source.indexOf("(d.viewTab) === 'surface'");
    const surfaceEnd = source.indexOf("(d.viewTab) === 'interior'", surfaceStart);
    const surfaceSource = source.slice(surfaceStart, surfaceEnd);

    expect(surfaceStart).toBeGreaterThan(-1);
    expect(surfaceEnd).toBeGreaterThan(surfaceStart);
    expect(source).toContain('function getSolarPlanetAccent(planet)');
    expect(source).toContain('var selectedAccent = getSolarPlanetAccent(sel);');
    expect(surfaceSource).not.toContain('sel.color');
    expect(surfaceSource).toContain('"data-solar-surface-stage": sel.key');
    expect(surfaceSource).toContain("height: 'clamp(300px, 78vw, 350px)'");
    expect(surfaceSource).toContain('surfaceLayout = W < 520 ? \'compact\' : \'wide\';');
    expect(surfaceSource).toContain('surfacePixelRatio = Math.min(2');
    expect(surfaceSource).toContain('ctx.setTransform(surfacePixelRatio, 0, 0, surfacePixelRatio, 0, 0);');
    expect(surfaceSource).toContain("cvEl.addEventListener('pointerdown'");
    expect(surfaceSource).toContain("cvEl.addEventListener('pointermove'");
    expect(surfaceSource).not.toContain("cvEl.addEventListener('mousedown'");
    expect(surfaceSource).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(surfaceSource).toContain('if (!surfaceReducedMotion && surfacePageVisible)');
    expect(surfaceSource).toContain('if (cvEl._surfaceCleanup) cvEl._surfaceCleanup();');
    expect(surfaceSource).toContain('cvEl._surfaceCleanup = function()');
    expect(surfaceSource).toContain("ctx.fillText('Landmark note below'");
    expect(surfaceSource).not.toMatch(/ctx\.font = '(?:6|7|8)px/);
    expect(surfaceSource).toContain('var moonOrbitLimit = Math.max');
    expect(surfaceSource).toContain('"data-solar-surface-console": sel.key');
    expect(surfaceSource).toContain('"data-solar-surface-evidence-button": btn.key');
    expect(surfaceSource).toContain('"data-solar-surface-feature-button": featureIndex');
    expect(surfaceSource).toContain('"data-solar-surface-landmark-readout"');
    expect(surfaceSource).toContain('"aria-controls": panelId');
    expect(surfaceSource).toContain('min-h-[44px]');
    ['moons', 'atmosphere', 'magnetic', 'nightsky', 'composition'].forEach((panel) => {
      expect(surfaceSource).toContain('id: "solar-surface-panel-' + panel + '-"');
    });
    expect(surfaceSource).not.toContain('text-slate-600');
    expect(surfaceSource).toContain('they are not plotted on one linear scale');
  });

  it('keeps planet anatomy readable across compact and wide cutaways', () => {
    const interiorStart = source.indexOf("(d.viewTab) === 'interior'");
    const interiorEnd = source.indexOf("(d.viewTab) === 'descent'", interiorStart);
    const interiorSource = source.slice(interiorStart, interiorEnd);

    expect(interiorStart).toBeGreaterThan(-1);
    expect(interiorEnd).toBeGreaterThan(interiorStart);
    expect(interiorSource).toContain('"data-solar-interior-cutaway": sel.key');
    expect(interiorSource).toContain('"data-solar-interior-canvas": sel.key');
    expect(interiorSource).toContain('"data-solar-interior-model": "evidence-based-schematic"');
    expect(interiorSource).toContain('var compactInterior = cw < 760;');
    expect(interiorSource).toContain("'data-solar-interior-layout', compactInterior ? 'compact-key' : 'wide-callouts'");
    expect(interiorSource).toContain("'data-solar-interior-dpr', String(pixelRatio)");
    expect(interiorSource).toContain('ctx2.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);');
    expect(interiorSource).toContain('var legendTop = cy + maxR + 27;');
    expect(interiorSource).toContain("__alloT('stem.solarsystem.layer_key', 'LAYER KEY')");
    expect(interiorSource).toContain('var labelTop = cy - maxR * 0.70;');
    expect(interiorSource).toContain('var labelMaxWidth = Math.max(100, labelX - 18);');
    expect(interiorSource).toContain('Right hemisphere is the observable exterior; left is the modeled cutaway.');
    expect(interiorSource).toContain("__alloT('stem.solarsystem.modeled_cutaway', 'MODELED CUTAWAY')");
    expect(interiorSource).toContain("__alloT('stem.solarsystem.exterior', 'EXTERIOR')");
    expect(interiorSource).toContain('grid grid-cols-1 md:grid-cols-2 gap-2');
    expect(interiorSource).toContain('"data-solar-interior-layer": layer.label');
    expect(interiorSource).toContain('"data-solar-interior-model-tag": layer.modelTag || "observed-or-constrained"');
    expect(interiorSource).toContain('"aria-describedby": "solar-interior-layer-grid-" + sel.key.toLowerCase()');
    expect(interiorSource).toContain('100%),#0f172a');
    expect(interiorSource).not.toContain('Math.random()');
    expect(source).toContain('function getSolarInteriorLayers(planetKey)');
    expect(source).toContain('new ResizeObserver(requestInteriorDraw)');
    expect(source).toContain("label: __alloT('stem.solarsystem.solid_inner_core_mars', 'Solid Inner Core')");
    expect(source).toContain("thick: '~600 km radius'");
    expect(source).toContain("href: 'https://www.nature.com/articles/s41586-025-09361-9'");
  });

  it('turns atmospheric descent into a clamped instrument corridor', () => {
    const descentStart = source.indexOf("(d.viewTab) === 'descent'");
    const descentEnd = source.indexOf("(d.viewTab) === 'drone'", descentStart);
    const descentSource = source.slice(descentStart, descentEnd);

    expect(descentStart).toBeGreaterThan(-1);
    expect(descentEnd).toBeGreaterThan(descentStart);
    expect(source).toContain('function clampSolarDescentProbeValue(probeValue)');
    expect(source).toContain('function getSolarDescentLayerIndex(layers, probeValue)');
    expect(source).toContain('Math.min(layers.length - 1, Math.floor(clampedProbeValue * layers.length))');
    expect(descentSource).toContain('The band heights are schematic and show layer sequence, not proportional altitude.');
    expect(descentSource).toContain('"data-solar-descent-stage": sel.key');
    expect(descentSource).toContain('"data-solar-descent-canvas": sel.key');
    expect(descentSource).toContain('"data-solar-descent-controls": "true"');
    expect(descentSource).toContain('"data-solar-descent-readout": controlLayer ? controlLayer.name : ""');
    expect(descentSource).toContain('"data-solar-descent-slider": "true"');
    expect(descentSource).toContain('"aria-valuetext": (function()');
    expect(descentSource).toContain('"data-solar-descent-card": layer.name');
    expect(descentSource).toContain('var activeBandGlow = ctx2.createLinearGradient(0, y, cw, y);');
    expect(descentSource).toContain("'data-solar-descent-active-layer', activeDescentLayer ? activeDescentLayer.name : ''");
    expect(descentSource).toContain('var probeReadout = activeDescentLayer ? activeDescentLayer.name');
    expect(descentSource).toContain("upd('_descentProbeY', (li + 0.5) / descentLayerCount)");
    expect(descentSource).toContain('100%),#0f172a');
    expect(descentSource).not.toContain('absolute bottom-3 left-3 right-3');
  });

  it('separates Kepler I geometry callouts from live proof measurements', () => {
    expect(source).toContain('var k1Backdrop = ctx.createRadialGradient');
    expect(source).toContain('function drawK1Tag(text, x, y, color)');
    expect(source).toContain('F\\u2082 \\u00b7 empty focus');
    expect(source).toContain('Dedicated evidence footer');
    expect(source).toContain('sum " + fmt(r1 + r2, 1) + " = 2a');
  });

  it('compares worlds on a disclosed common scale without confusing mass and weight', () => {
    expect(source).toContain('function buildSolarPlanetComparison(p1, p2)');
    expect(source).toContain('data-solar-planet-comparison');
    expect(source).toContain('shown on one shared diameter scale');
    expect(source).toContain('Bodies below 3 px use a visibility floor');
    expect(source).toContain('Mass stays constant; weight force changes.');
    expect(source).toContain('70 kg mass: weight force');
    expect(source).toContain("Math.round(70 * g1 * 9.80665).toLocaleString() + ' N'");
    expect(source).not.toContain("['\\uD83E\\uDDD1 70kg on'");
    expect(source).toContain('PLANET_RADII[p.key]');
    expect(source).not.toContain('PLANET_RADII[p.name]');
    expect(source).toContain('All worlds on one linear diameter scale');
  });
});
