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
    expect(source).toContain('One distance scale \u00b7 bodies enlarged');
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
    expect(source).toContain('Select a feature \\u2022 drag to rotate');
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
