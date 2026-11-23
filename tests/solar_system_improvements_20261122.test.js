import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRRORS = [
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/build/stem_lab/stem_tool_solarsystem.js',
  'desktop/app-build/stem_lab/stem_tool_solarsystem.js',
];

describe('Solar System Explorer improvements (2026-11-22)', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('keeps canonical source and all three browser deliverable mirrors byte-identical', () => {
    const base = readFileSync(SOURCE, 'utf8');
    for (const mirror of MIRRORS) {
      expect(readFileSync(mirror, 'utf8'), `${mirror} drift`).toBe(base);
    }
  });

  it('formats red-dwarf star lifespans in Tyr instead of Gyr (fixes 1,000x unit bug)', () => {
    const lowMass = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 0.1 },
    });
    expect(lowMass).toContain('3.16 Tyr');
    expect(lowMass).not.toContain('>3 Gyr<');

    const sunMass = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 1 },
    });
    expect(sunMass).toContain('10.00 Gyr');

    const heavyMass = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 10 },
    });
    expect(heavyMass).toContain('32 Myr');
  });

  it('separates Planet Builder (showBuilder) and Custom Planet Builder (showCustomBuilder) and wires magnetic/core controls', () => {
    const onlyPhysicsBuilder = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showBuilder: true, showCustomBuilder: false,
        buildMass: 1, buildDist: 1, buildAtmo: true, buildWater: true, buildMag: true,
      },
    });
    expect(onlyPhysicsBuilder).toContain('Shielded — magnetosphere deflects solar-wind stripping');
    expect(onlyPhysicsBuilder).not.toContain('Your World · ');

    const unshieldedBuilder = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showBuilder: true, showCustomBuilder: false,
        buildMass: 1, buildDist: 1, buildAtmo: true, buildWater: true, buildMag: false,
      },
    });
    expect(unshieldedBuilder).toContain('Unshielded — atmosphere vulnerable to solar-wind erosion');

    const onlyCustomBuilder = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showBuilder: false, showCustomBuilder: true,
        builderPl: { core: 'ice', surface: 'water', atmo: 'methane', life: false },
      },
    });
    expect(onlyCustomBuilder).toContain('Volatile ice interior (lower density)');
    expect(onlyCustomBuilder).not.toContain('Shielded — magnetosphere deflects');
  });

  it('localizes Quick Focus buttons and resolves both localized and canonical planet keys', () => {
    const esNames = {
      'stem.solar_sys.mercury': 'Mercurio',
      'stem.solar_sys.venus': 'Venus',
      'stem.solar_sys.earth': 'Tierra',
      'stem.solar_sys.mars': 'Marte',
      'stem.solar_sys.jupiter': 'Júpiter',
      'stem.solar_sys.saturn': 'Saturno',
      'stem.solar_sys.uranus': 'Urano',
      'stem.solar_sys.neptune': 'Neptuno',
      'stem.solar_sys.pluto': 'Plutón',
    };
    const t = (key, fallback) => esNames[key] || fallback || key;
    const html = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars' },
    }, { t });
    expect(html).toContain('Focus Marte');
    expect(html).toContain('Focus Tierra');
    expect(html).toContain('data-solarsystem-planet-detail="Mars"');
  });

  it('renders deterministic Galaxy Spiral Map without Math.random jitter across renders', () => {
    const seed = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGalaxy: true, galType: 'spiral', galRot: 45 } };
    const first = renderTool('solarSystem', seed);
    const second = renderTool('solarSystem', seed);
    expect(first).toBe(second);
  });

  it('fixes Moon Phase Dial, Eclipse Theater, and coordinate-aligned Eclipse Path Maker', () => {
    const moonHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 135 },
    });
    expect(moonHtml).toContain('View from Earth');
    expect(moonHtml).not.toMatch(/A -[\d.]+ 9/);

    const solarEclipse = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseAlign: 50 },
    });
    expect(solarEclipse).toContain('TOTAL SOLAR ECLIPSE — corona visible');
    expect(solarEclipse).toContain('r="56"');

    const lunarEclipse = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'lunar', eclipseAlign: 50 },
    });
    expect(lunarEclipse).toContain('Umbra');
    expect(lunarEclipse).toContain('inside Earth&#x27;s umbra');

    const onPath = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2024', ePathLat: 46, ePathLon: -69 },
    });
    expect(onPath).toContain('IN PATH OF TOTALITY');

    const offPath = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2024', ePathLat: -20, ePathLon: 40 },
    });
    expect(offPath).toContain('Outside totality');
  });

  it('wires real-time Play/Pause controls in Asteroid Defender and Lunar Lander alongside UDL step/keyboard controls', () => {
    const html = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDefender: true, showLander: true },
    });
    expect(html).toContain('Launch Wave');
    expect(html).toContain('Destroy next asteroid');
    expect(html).toContain('Auto-Fall');
    expect(html).toContain('Fall (tick)');
    expect(html).toContain('Alt: 326 m');
  });

  it('includes all 10 worlds in Solar System Side-by-Side, dynamic eclipse badges, hemisphere sky guide, and Real Sky ephemeris mode', () => {
    const html = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showSQC: true, showECat: true, showMS2: true, skyHemi: 'south',
        ephemerisMode: true, ephemerisDate: '1977-09-05',
      },
    });
    for (const world of ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
      expect(html).toContain('>' + world + '<');
    }
    expect(html).toContain('>Past<');
    expect(html).toContain('>Upcoming<');
    expect(html).toContain('Southern Cross');
    expect(html).toContain('data-ephemeris-mode="true"');
    expect(html).toContain('data-ephemeris-date="1977-09-05"');
    expect(html).toContain('1977 Voyager Grand Tour');

    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("moonName: 'Charon'");
    expect(source).toContain('var SOLAR_EPHEMERIS_ELEMENTS =');
  });

  it('short-circuits all 28 heavy collapsed builders cleanly while keeping accessible toggle shells', () => {
    const html = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showRover: false, showLagrange: false, showSunPath: false, showTides: false,
        showCOrb: false, showAtmos: false, showScope: false, showRace: false,
        showTLock: false, showPhasesV: false,
        showCME: false, showGrav: false, showMag: false, showSunCycle: false,
        showRings: false, showSundial: false, showPulsar: false, showTrans: false,
        showISS: false, showSWind: false, showFouc: false, showStarWheel: false,
        showAlbedo: false, showDoppler: false, showSpectro: false, showGlobe: false,
        showEMS: false, showComet: false,
      },
    });
    for (const id of [
      'solar-rover-pathfinder', 'solar-lagrange', 'solar-sun-path', 'solar-tidal-forces',
      'solar-comet-orbit', 'solar-atmosphere', 'solar-telescope', 'solar-orbit-race',
      'solar-tidal-locking', 'solar-venus-phases',
      'solar-cme-lab', 'solar-gravity-well', 'solar-magnetosphere', 'solar-cycle-lab',
      'solar-saturn-rings', 'solar-sundial', 'solar-pulsar', 'solar-mercury-transit',
      'solar-orbit-shadow', 'solar-wind', 'solar-foucault', 'solar-stellar-spectrum',
      'solar-albedo', 'solar-doppler', 'solar-spectroscopy', 'solar-day-night',
      'solar-earth-moon-scale', 'solar-comet-tails',
    ]) {
      expect(html).toContain('id="' + id + '"');
    }
  });

  it('wires 3D scene layer toggles, Ceres & Eris ephemeris, clickable 3D moons, and Real Sky Mars launch-window readouts', () => {
    const html = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        ephemerisMode: true, ephemerisDate: '2026-11-15',
        show3dOrbits: false, show3dBelts: false, show3dLabels: false, show3dDwarfs: true,
      },
    });
    expect(html).toContain('data-show-orbits="false"');
    expect(html).toContain('data-show-belts="false"');
    expect(html).toContain('data-show-labels="false"');
    expect(html).toContain('data-show-dwarfs="true"');
    expect(html).toContain('Ceres &amp; Eris');
    expect(html).toContain('data-ephemeris-step="-12"');
    expect(html).toContain('data-ephemeris-step="1"');
    expect(html).toContain('Mars Hohmann Launch Window');

    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('Ceres:   { a: 2.7675');
    expect(source).toContain('Eris:    { a: 67.8640');
    expect(source).toContain('const moonMeshes = [];');
    expect(source).toContain('hitObj.userData.isMoon');
  });

  it('renders the Mini-Labs Shelf Control Bar with open-lab count, Collapse All button, and topic filtering', () => {
    const defaultHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, showBlackHole: true },
    });
    expect(defaultHtml).toContain('data-solarsystem-mini-shelf-bar="true"');
    expect(defaultHtml).toContain('2 currently open');
    expect(defaultHtml).toContain('Collapse all (2)');

    const filteredHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', miniShelfFilter: 'moons' },
    });
    expect(filteredHtml).toContain('data-solar-activity="moon-phase-dial"');
    expect(filteredHtml).toMatch(/data-solar-activity="black-hole-visualizer"[^>]*hidden=""|hidden=""[^>]*data-solar-activity="black-hole-visualizer"/);
  });

  it('fixes Habitable Moons colors, Mars Terraforming inverted polar ice & liquid water, and Black Hole mass/jet geometry', () => {
    // Habitable Moons: Titan must use Titan gold (#f59e0b), NOT Earth blue selectedAccent
    const titanHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'titan' },
    });
    expect(titanHtml).toContain('data-hab-moon-color="#f59e0b"');

    // Mars Terraforming: 0% melt -> full opaque ice cap (opacity="1"), frozen -> NO liquid river
    const frozenMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showTerraform: true, tfCO2: 10, tfIce: 0, tfTrees: 50 },
    });
    expect(frozenMars).toContain('data-tf-icecap="north"');
    expect(frozenMars).toMatch(/data-tf-icecap="north"[^>]*opacity="1"/);
    expect(frozenMars).not.toContain('data-tf-liquid-water="true"');

    // Mars Terraforming: 100% melt + high CO2 -> melted polar caps gone, liquid water appears
    const warmMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showTerraform: true, tfCO2: 95, tfIce: 100, tfTrees: 80 },
    });
    expect(warmMars).not.toContain('data-tf-icecap="north"');
    expect(warmMars).toContain('data-tf-liquid-water="true"');
    expect(warmMars).toContain('atm');

    // Black Hole Visualizer: Solar masses + Schwarzschild radius + outward polar jets at max mass
    const bhHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 100, bhSpin: 90 },
    });
    expect(bhHtml).toContain('M☉');
    expect(bhHtml).toContain('Event Horizon Rₛ:');
    const northJet = bhHtml.match(/data-bh-jet="north"[^>]*y1="([\d.]+)"[^>]*y2="([\d.]+)"/);
    expect(northJet).toBeTruthy();
    expect(Number(northJet[2])).toBeLessThan(Number(northJet[1]));
  });

  it('upgrades Aurora Tuner latitude physics, Trajectory Designer LEO Hohmann diagram, and Light-Year Walker accuracy', () => {
    const eqAurora = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 50, auroraLat: 0, auroraAlt: 150 },
    });
    const poleAurora = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 80, auroraLat: 70, auroraAlt: 150 },
    });
    const eqOp = Number(eqAurora.match(/data-aurora-curtain="0"[^>]*opacity="([\d.]+)"/)[1]);
    const poleOp = Number(poleAurora.match(/data-aurora-curtain="0"[^>]*opacity="([\d.]+)"/)[1]);
    expect(poleOp).toBeGreaterThan(eqOp * 2);
    expect(poleAurora).toContain('558 nm');
    expect(poleAurora).toContain('Kp ');

    const trajHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'mars' },
    });
    expect(trajHtml).toContain('From LEO — Δv: ~5.7 km/s');
    expect(trajHtml).toContain('data-traj-focus="sun"');
    expect(trajHtml).toContain('Full Transfer Planner');

    const lyHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 0 },
    });
    expect(lyHtml).toContain('1.28 seconds');
    expect(lyHtml).toContain('4.06e-8 ly');
    expect(lyHtml).toContain('data-ly-log-marker="true"');
  });

  it('wires 3D Ecliptic Grid layer and Real Sky Date live animation controls', () => {
    const html = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        ephemerisMode: true, ephemerisDate: '2026-11-15', ephemerisPlaying: true, ephemerisRate: 30,
        show3dGrid: true,
      },
    });
    expect(html).toContain('data-show-grid="true"');
    expect(html).toContain('Ecliptic Grid');
    expect(html).toContain('data-ephemeris-play="true"');
    expect(html).toContain('Pause Sky');
    expect(html).toContain('data-ephemeris-rate="30"');
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("eclipticGridGroup.name = 'solar-ecliptic-grid'");
  });

  it('fixes Big Bang Dark Ages stars, Cepheid curve bounds & Leavitt Law, and Time Zone UTC formatting + daylight band', () => {
    const darkAges = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 5 },
    });
    expect(darkAges).not.toContain('data-bb-star=');
    expect(darkAges).toContain('Cosmic Dark Ages');

    const cmbEpoch = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 4 },
    });
    expect(cmbEpoch).toContain('data-bb-cmb="true"');
    expect(cmbEpoch).toContain('~3,000 K');

    const todayCosmos = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 10 },
    });
    expect(todayCosmos).toContain('data-bb-star="0"');
    expect(todayCosmos).toContain('data-bb-solar-system="true"');
    expect(todayCosmos).toContain('2.725 K');

    // Cepheid Variable Star: dot stays inside [50, 350] box and Leavitt Law scales luminosity with period
    const shortCepheid = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 4, pvT: 3.9 },
    });
    const longCepheid = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 35.5, pvT: 35.0 },
    });
    const dotX = Number(shortCepheid.match(/data-cepheid-dot="true"[^>]*cx="([\d.]+)"/)[1]);
    expect(dotX).toBeGreaterThanOrEqual(50);
    expect(dotX).toBeLessThanOrEqual(350);
    const lumShort = Number(shortCepheid.match(/data-cepheid-lum="(\d+)"/)[1]);
    const lumLong = Number(longCepheid.match(/data-cepheid-lum="(\d+)"/)[1]);
    expect(lumLong).toBeGreaterThan(lumShort * 5);

    // Time Zone Visualizer: 12.5 -> 12:30 (never 12.5:00), plus moving daylight band & subsolar Sun
    const tzHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 12.5 },
    });
    expect(tzHtml).toContain('data-tz-utc="12:30"');
    expect(tzHtml).not.toContain('12.5:00');
    expect(tzHtml).toContain('data-tz-daylight=');
    expect(tzHtml).toContain('data-tz-noon-sun="true"');
    expect(tzHtml).toContain('Now UTC');
  });

  it('upgrades Cosmic Calendar 12-month strip, Drake Equation Milky Way spacing map, Asteroid Impact & Space Debris log controls', () => {
    const calHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCal: true, calIdx: 10 },
    });
    expect(calHtml).toContain('data-cal-marker="Dec 31 · 23:48:35"');
    expect(calHtml).toContain('Homo sapiens');

    const drakeHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDrake: true, drR: 1.5, drFp: 1.0, drNe: 0.4, drFl: 0.5, drFi: 0.1, drFc: 0.5, drL: 1000 },
    });
    expect(drakeHtml).toContain('data-drake-beacon="0"');
    expect(drakeHtml).toContain('Avg Milky Way spacing:');
    expect(drakeHtml).toContain('Drake 1961');

    const impactHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 370 },
    });
    expect(impactHtml).toContain('Apophis');
    expect(impactHtml).toContain('Avg frequency:');

    const issDebris = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 420 },
    });
    const geoDebris = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 35786 },
    });
    const issSpeed = Number(issDebris.match(/data-junk-speed="([\d.]+)"/)[1]);
    const geoSpeed = Number(geoDebris.match(/data-junk-speed="([\d.]+)"/)[1]);
    expect(issSpeed).toBeGreaterThan(7.5);
    expect(issSpeed).toBeLessThan(7.8);
    expect(geoSpeed).toBeGreaterThan(3.0);
    expect(geoSpeed).toBeLessThan(3.15);
    expect(issDebris).toContain('ISS (420 km)');
  });

  it('upgrades Constellation Hunter (6 global constellations, quiz mode, 3D depth) and Hubble/JWST Deep Field (true FOV zoom + high-z)', () => {
    const cruxHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'crux' },
    });
    expect(cruxHtml).toContain('Acrux');
    expect(cruxHtml).toContain('Gacrux');
    expect(cruxHtml).toContain('data-const-line="0"');

    const quizHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'orion', constHideLines: true },
    });
    expect(quizHtml).not.toContain('data-const-line=');

    const depthHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'orion', constDepthView: true },
    });
    expect(depthHtml).toContain('data-const-depth-star="betelgeuse"');
    expect(depthHtml).toContain('True 3D Distances from Earth');

    // Hubble Deep Field: true center-anchored FOV narrowing + JWST infrared mode
    const hubble1x = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'hubble', hdfZoom: 1 },
    });
    const jwst2x = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'jwst', hdfZoom: 2 },
    });
    expect(hubble1x).toContain('data-hdf-fov="2.60"');
    expect(hubble1x).not.toContain('data-hdf-highz="true"');
    expect(jwst2x).toContain('data-hdf-fov="1.30"');
    expect(jwst2x).toContain('data-hdf-highz="true"');
    expect(jwst2x).toContain('data-hdf-spike="jwst"');
  });

  it('upgrades CMB Planck palette & True Eye preset, Asteroid missions, Local Group selector, Atmospheric Window, and Star Forming dispersal', () => {
    const cmbTrueEye = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbContrast: 0 },
    });
    const cmbEnhanced = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbContrast: 100 },
    });
    expect(cmbTrueEye).toContain('uniform to 1 part in 100,000!');
    expect(cmbEnhanced).toContain('±300 μK');
    const cmbRects = (cmbEnhanced.match(/<rect /g) || []).length;
    expect(cmbRects).toBeGreaterThan(500);
    expect(cmbRects).toBeLessThan(1500);

    const astM = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'mType' },
    });
    const astC = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'cType' },
    });
    expect(astM).toContain('NASA Psyche');
    expect(astC).toContain('OSIRIS-REx');

    const lgHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgSel: 'lmc' },
    });
    expect(lgHtml).toContain('data-lg-detail="lmc"');
    expect(lgHtml).toContain('Tarantula Nebula');
    expect(lgHtml).toContain('← 110 km/s');

    const awIr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'ir' },
    });
    const awMicro = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'micro' },
    });
    expect(awIr).toContain('data-aw-detail="ir"');
    expect(awIr).toContain('JWST');
    expect(awMicro).toContain('ALMA');

    // Star Forming Region: Stage 3 bipolar jets + Stage 6 actual outward star cluster dispersal
    const sfrStage3 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 2 },
    });
    const sfrStage6 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 5 },
    });
    expect(sfrStage3).toContain('data-sfr-jets="true"');
    expect(sfrStage6).not.toContain('data-sfr-jets="true"');
    const star0Stage3 = Number(sfrStage3.match(/data-sfr-star="0"[^>]*data-x="(\d+)"/)[1]);
    const star0Stage6 = Number(sfrStage6.match(/data-sfr-star="0"[^>]*data-x="(\d+)"/)[1]);
    expect(Math.abs(200 - star0Stage6)).toBeGreaterThan(Math.abs(200 - star0Stage3) * 2);
  });

  it('fixes Auroras Across Solar System colors, Star Magnitude Scale Sun radius & Pogson calculator, and Big Numbers Hawking typo', () => {
    const earthAurora = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showAuSS: true, auPl: 'earth' },
    });
    const jupAurora = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'jupiter' },
    });
    const marsAurora = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'mars' },
    });
    expect(earthAurora).toContain('data-aurora-planet-color="#22c55e"');
    expect(jupAurora).toContain('data-aurora-planet-color="#a78bfa"');
    expect(jupAurora).toContain('Io footprint');
    expect(marsAurora).toContain('data-aurora-planet-color="#f87171"');
    expect(marsAurora).toContain('Crustal magnetic pockets');

    // Star Magnitude Scale: Sun radius bounded (was 53.7px!) + Pogson brightness calculator
    const smagHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSMag: true, smagA: 0, smagB: 11 },
    });
    const sunR = Number(smagHtml.match(/data-smag-row="0"[^>]*>.*?data-smag-r="([\d.]+)"/)[1]);
    expect(sunR).toBeGreaterThan(6);
    expect(sunR).toBeLessThanOrEqual(11);
    expect(smagHtml).toContain('data-smag-ratio="10^24.3×"');
    expect(smagHtml).toContain('Δm = 60.70');

    // Big Numbers: Hawking evaporation exponent typo fixed
    const bnHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBN: true },
    });
    expect(bnHtml).not.toContain('10¹⁰⁰⁰⁰⁰⁰⁰⁰⁰⁰⁰⁰⁰⁰');
    expect(bnHtml).toContain('10⁶⁷–10¹⁰⁰ yr');
  });

  it('adds interactive SVGs to Celestial Coordinates, Exoplanet Detection, Cosmic Speeds, Famous Nebulae, How Stars Die, and Day Length', () => {
    const coordHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordSys: 'galactic' },
    });
    expect(coordHtml).toContain('data-coord-svg="galactic"');
    expect(coordHtml).toContain('Sagittarius A*');
    expect(coordHtml).toContain('data-coord-detail="galactic"');

    const transitDip = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'transit', exPhase: 50 },
    });
    const transitBase = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'transit', exPhase: 10 },
    });
    const directImg = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'direct', exPhase: 25 },
    });
    expect(transitDip).toContain('data-exmth-flux="98.80"');
    expect(transitDip).toContain('TRANSIT DIP!');
    expect(transitBase).toContain('data-exmth-flux="100.00"');
    expect(directImg).toContain('Coronagraph');

    // Cosmic Speeds: ascending order (Voyager before Earth), Parker Solar Probe, unclipped light-speed bar
    const cspHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'parker' },
    });
    expect(cspHtml.indexOf('data-csp-row="voyager"')).toBeLessThan(cspHtml.indexOf('data-csp-row="earth"'));
    expect(cspHtml.indexOf('data-csp-row="wind"')).toBeLessThan(cspHtml.indexOf('data-csp-row="lg"'));
    const lightEnd = Number(cspHtml.match(/data-csp-row="light"[^>]*data-csp-xend="(\d+)"/)[1]);
    expect(lightEnd).toBeLessThanOrEqual(320);
    expect(cspHtml).toContain('Parker Solar Probe');
    expect(cspHtml).toContain('data-csp-travel="parker"');

    // Famous Nebulae distinct morphologies
    const eagleNeb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 3 },
    });
    const ringNeb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 2 },
    });
    expect(eagleNeb).toContain('data-neb-kind="pillars"');
    expect(ringNeb).toContain('data-neb-kind="ring"');

    // How Stars Die interactive mass slider
    const nsFate = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 15 },
    });
    const bhFate = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 35 },
    });
    expect(nsFate).toContain('data-death-stage="ns"');
    expect(nsFate).toContain('Neutron Star');
    expect(bhFate).toContain('data-death-stage="bh"');
    expect(bhFate).toContain('Black Hole');

    // Day Length Comparison retrograde marker + clean Mercury color
    const dlHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDL: true },
    });
    expect(dlHtml).toContain('Venus ↺');
    expect(dlHtml).toContain('Uranus ↺');
  });

  it('adds Habitable Zone preview to Planet Builder and synchronized H-R Diagram + T/L telemetry to Stellar Evolution Timeline', () => {
    const builderHtml = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showBuilder: true, buildMass: 1, buildDist: 1, buildAtmo: true, buildWater: true, buildMag: true,
      },
    });
    expect(builderHtml).toContain('data-builder-hz="true"');
    expect(builderHtml).toContain('data-builder-world="Terrestrial"');
    expect(builderHtml).toContain('data-builder-mag="true"');
    expect(builderHtml).toContain('Hot Jupiter');

    const sunMainSeq = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 15 },
    });
    const sunGiant = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 75 },
    });
    expect(sunMainSeq).toContain('data-hr-inset="true"');
    expect(sunMainSeq).toContain('data-hr-track="sun"');
    expect(sunMainSeq).toContain('data-hr-dot="true"');
    expect(sunMainSeq).toContain('data-stellar-temp="5772"');
    expect(sunGiant).toContain('data-stellar-temp="3500"');
    expect(sunGiant).toContain('1,200 L☉');
  });

  it('adds ZHR peak chart to Meteor Shower Calendar, mass chart to At a Glance, true-scale Moons chart, and interactive Bucket List', () => {
    const msHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS: true },
    });
    expect(msHtml).toContain('data-ms-bar="gem"');
    expect(msHtml).toContain('data-ms-bar="sda"');
    expect(msHtml).toContain('Southern Delta Aquariids');
    expect(msHtml).toMatch(/data-ms-next="[a-z]+"/);

    const sagHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true },
    });
    expect(sagHtml).toContain('data-sag-jupiter="70.6"');
    expect(sagHtml).toContain('Sun: 99.86%');

    const fmHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFM: true, fmSort: 'size' },
    });
    expect(fmHtml).toContain('data-moon-ref="pluto"');
    expect(fmHtml).toContain('data-moon-ref="mercury"');
    expect(fmHtml.indexOf('data-moon-bar="ganymede"')).toBeLessThan(fmHtml.indexOf('data-moon-bar="titan"'));
    expect(fmHtml.indexOf('data-moon-bar="titan"')).toBeLessThan(fmHtml.indexOf('data-moon-bar="luna"'));

    const blHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBL: true, bucketDone: [0, 2, 5] },
    });
    expect(blHtml).toContain('data-bucket-progress="3/15"');
    expect(blHtml).toContain('Stargazing progress: 3 / 15 (20%)');
    expect(blHtml).toContain('>Reset<');
  });

  it('adds scatter chart & filters to Exoplanet Comparison and era filters + decade chart to Space Exploration Timeline', () => {
    const exoHab = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExo: true, exoFilter: 'habitable' },
    });
    expect(exoHab).toContain('data-exo-hz="true"');
    expect(exoHab).toContain('data-exo-ref="Earth"');
    expect(exoHab).toContain('data-exo-dot="TRAPPIST-1e"');
    expect(exoHab).toContain('Proxima Centauri b');
    expect(exoHab).not.toContain('WASP-76b');

    const tlModern = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTimeline: true, timelineEra: 'modern' },
    });
    expect(tlModern).toContain('data-tl-decade="1960"');
    expect(tlModern).toContain('data-tl-decade="2020"');
    expect(tlModern).toContain('data-tl-era="modern"');
    expect(tlModern).toContain('Europa Clipper');
    expect(tlModern).not.toContain('Sputnik 1');
  });

  it('adds interactive Hubble Tuning Fork to Galaxy Types Gallery and equipment filters + checklist to Tonight Sky Guide', () => {
    const gtHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGT: true, gtSel: 'sb' },
    });
    expect(gtHtml).toContain('data-gt-node="sbb"');
    expect(gtHtml).toContain('data-gt-active="sb"');
    expect(gtHtml).toContain('Hubble Tuning Fork Classification');
    expect(gtHtml).toContain('Andromeda (M31)');

    const tntScope = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTNT: true, tntGear: 'scope', tntSpotted: ['polaris', 'jupiter'] },
    });
    expect(tntScope).toContain('data-tnt-spotted="2/10"');
    expect(tntScope).toContain('Find Saturn &amp; Its Rings');
    expect(tntScope).not.toContain('Catch an ISS Overhead Pass');
  });

  it('adds flux/Teq/tidal-lock telemetry to Habitable Zone, rung bootstrap to Distance Ladder, light-delay + milestones to Voyager, and wave modes + Earth scale to Saturn Hexagon', () => {
    const hzTrappist = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 0.0005, hzDist: 0.029 },
    });
    expect(hzTrappist).toContain('data-hz-flux=');
    expect(hzTrappist).toContain('data-hz-teq=');
    expect(hzTrappist).toContain('data-hz-tidal-lock="true"');

    const hzEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 1, hzDist: 1 },
    });
    expect(hzEarth).toContain('data-hz-flux="1.00"');
    expect(hzEarth).toContain('data-hz-teq="255"');
    expect(hzEarth).not.toContain('data-hz-tidal-lock');

    const ladderHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDistLadder: true, distStep: 4 },
    });
    expect(ladderHtml).toContain('data-ladder-rung="4"');
    expect(ladderHtml).toContain('data-ladder-detail="4"');
    expect(ladderHtml).toContain('ESA Gaia');
    expect(ladderHtml).toContain('4.24 ly (Proxima)');

    const voyHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVoy: true, voyYear: 2026 },
    });
    expect(voyHtml).toContain('data-voy-delay=');
    expect(voyHtml).toContain('One-way radio signal:');
    expect(voyHtml).toContain('V1 Heliopause 2012');

    const hexHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHex: true, hexSides: 5, hexEarth: true },
    });
    expect(hexHtml).toContain('data-hex-sides="5"');
    expect(hexHtml).toContain('Pentagon (m=5)');
    expect(hexHtml).toContain('data-hex-earth="true"');
  });

  it('fixes duplicate Hubble & adds mirror scale to World Telescopes, fixes chronology & adds pioneers to Hall of Fame, and adds log pressure + Venus/Titan to Atmosphere comparison', () => {
    const telAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'all' },
    });
    expect(telAll).toContain('Vera C. Rubin Observatory');
    expect(telAll).toContain('data-tel-mirror="ELT"');
    expect(telAll).toContain('ELT (39m)');
    expect(telAll).not.toContain('Hubble (in space)');

    const telSpace = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'space' },
    });
    expect(telSpace).toContain('James Webb (JWST)');
    expect(telSpace).not.toContain('Keck I + II');

    const astrAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'all' },
    });
    expect(astrAll.indexOf('Kepler')).toBeLessThan(astrAll.indexOf('Galileo'));
    expect(astrAll).toContain('Henrietta Swan Leavitt');
    expect(astrAll).toContain('Cecilia Payne-Gaposchkin');
    expect(astrAll).toContain('Jocelyn Bell Burnell');
    expect(astrAll).toContain('Vera Rubin &amp; Kent Ford');

    const astrAstro = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'astro' },
    });
    expect(astrAstro).toContain('data-astr-era="astro"');
    expect(astrAstro).not.toContain('Ptolemy');

    const maExtra = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMA: true, maExtra: true },
    });
    expect(maExtra).toContain('data-ma-press="mars"');
    expect(maExtra).toContain('data-ma-press="venus"');
    expect(maExtra).toContain('data-ma-card="venus"');
    expect(maExtra).toContain('data-ma-card="titan"');
    expect(maExtra).toContain('0.04%');
  });

  it('adds planetary terrains + age estimation to Crater Counter, Universe-age tick + fate/luminosity to Star Lifespan, anatomy diagram to Black Hole Vocab, and star maps + Emu in the Sky to Constellation Mythology', () => {
    const crEuropa = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'europa' },
    });
    expect(crEuropa).toContain('data-crater-terrain="europa"');
    expect(crEuropa).toContain('Found: 0 / 4');
    expect(crEuropa).toContain('Mark next crater');

    const crHighlands = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'highlands' },
    });
    expect(crHighlands).toContain('Found: 0 / 18');

    const sltRed = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 0.12 },
    });
    expect(sltRed).toContain('data-slt-universe-tick="true"');
    expect(sltRed).toContain('data-slt-fate="White Dwarf"');
    expect(sltRed).toContain('Outlives current universe!');

    const sltBH = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 25 },
    });
    expect(sltBH).toContain('data-slt-fate="Black Hole (Supernova)"');

    const bhgPhoton = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgSel: 'photon' },
    });
    expect(bhgPhoton).toContain('data-bhg-sel="photon"');
    expect(bhgPhoton).toContain('Photon sphere (r = 1.5 Rₛ)');
    expect(bhgPhoton).toContain('Schwarzschild radius');

    const cmEmu = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCM: true, cmIdx: 8 },
    });
    expect(cmEmu).toContain('data-cm-constellation="emu"');
    expect(cmEmu).toContain('Emu in the Sky');
    expect(cmEmu).toContain('Dark Dust Silhouette');
    expect(cmEmu).toContain('Kamilaroi');
  });

  it('adds countdown + totality chart + filters to Upcoming Eclipses, comparative chart + 7 rows to Side-by-Side, and 24-decade log ruler to Cosmic Distance Reference', () => {
    const ecatSolar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showECat: true, ecatFilter: 'solar' },
    });
    expect(ecatSolar).toContain('data-ecat-next=');
    expect(ecatSolar).toContain('data-ecat-chart="true"');
    expect(ecatSolar).toContain('data-ecat-filter="solar"');
    expect(ecatSolar).toContain('6m 23s');
    expect(ecatSolar).not.toContain('New Year’s Eve total blood moon');

    const sqcTemp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'temp', sqcSun: false },
    });
    expect(sqcTemp).toContain('data-sqc-metric="temp"');
    expect(sqcTemp).toContain('0°C Line Marked');
    expect(sqcTemp).toContain('data-sqc-bar="venus"');
    expect(sqcTemp).not.toContain('data-sqc-bar="sun"');
    expect(sqcTemp).toContain('Distance (AU)');

    const sqcWithSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'diameter', sqcSun: true },
    });
    expect(sqcWithSun).toContain('data-sqc-bar="sun"');

    const distProxima = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 8 },
    });
    expect(distProxima).toContain('data-dist-ruler="true"');
    expect(distProxima).toContain('data-dist-selected="8"');
    expect(distProxima).toContain('Proxima Centauri');
    expect(distProxima).toContain('4.24 years');
  });

  it('adds explorer rank & badges to Your Cosmic Journey, reach chart & filters to Famous Missions, cosmic budget to Big Questions, and horizon strip to Space News Timeline', () => {
    const journeyHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSummary: true, planetsVisited: ['Mercury', 'Venus', 'Earth', 'Mars'] },
    });
    expect(journeyHtml).toContain('data-journey-rank="Orbital Navigator"');
    expect(journeyHtml).toContain('data-journey-world="Earth"');
    expect(journeyHtml).toContain('data-journey-badge="inner"');
    expect(journeyHtml).toContain('data-earned="true"');

    const mpOuter = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMP: true, mpFilter: 'outer' },
    });
    expect(mpOuter).toContain('data-mp-chart="true"');
    expect(mpOuter).toContain('data-mp-filter="outer"');
    expect(mpOuter).toContain('Europa Clipper');
    expect(mpOuter).not.toContain('First crewed lunar landing');

    const cqDE = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCQ: true, cqIdx: 1 },
    });
    expect(cqDE).toContain('data-cq-visual="de"');
    expect(cqDE).toContain('data-cq-budget="true"');
    expect(cqDE).toContain('Dark Energy 68.3%');

    const cqAndr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCQ: true, cqIdx: 9 },
    });
    expect(cqAndr).toContain('data-cq-visual="andromeda"');
    expect(cqAndr).toContain('50/50 merger odds');

    const wnPlanets = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFilter: 'planets' },
    });
    expect(wnPlanets).toContain('data-wn-timeline="true"');
    expect(wnPlanets).toContain('data-wn-filter="planets"');
    expect(wnPlanets).toContain('Dragonfly');
    expect(wnPlanets).toContain('JUICE');
    expect(wnPlanets).not.toContain('SLIM (Japan)');
  });

  it('adds live UTC observatory clock converter to Why UTC Matters, Myth-vs-Reality quiz to Surprising Facts, and 3-artifact signal explorer to Messages to the Stars', () => {
    const utcHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 18, utcDst: true },
    });
    expect(utcHtml).toContain('data-utc-hour="18"');
    expect(utcHtml).toContain('data-utc-hub="maine"');
    expect(utcHtml).toContain('UTC-4');
    expect(utcHtml).toContain('03:00 (+1d)');
    expect(utcHtml).toContain('Summer DST: ON');

    const trQuiz = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTR: true, trMode: 'quiz', trAnswers: { q1: false, q2: true } },
    });
    expect(trQuiz).toContain('data-tr-mode="quiz"');
    expect(trQuiz).toContain('data-tr-score="2/6"');
    expect(trQuiz).toContain('✓ MYTH — Venus is hotter');

    const trMoons = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTR: true, trMode: 'explore', trCat: 'moons' },
    });
    expect(trMoons).toContain('Europa');
    expect(trMoons).not.toContain('Focus Mercury');

    const msgArecibo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMsg: true, msgSel: 'arecibo' },
    });
    expect(msgArecibo).toContain('data-msg-active="arecibo"');
    expect(msgArecibo).toContain('data-msg-arecibo-ly=');
    expect(msgArecibo).toContain('23 × 73 = 1,679 bits');
    expect(msgArecibo).toContain('Arecibo 305 m Radio Dish');
  });

  it('fixes Earth Trojan L4 science + adds scale SVG to Mind-Blowing Facts, adds themed attribution to Quotes, and 3-vantage Earth portrait to Pale Blue Dot', () => {
    const factTrojan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFacts: true, factIdx: 7 },
    });
    expect(factTrojan).toContain('data-fact-idx="7"');
    expect(factTrojan).toContain('both at L4');
    expect(factTrojan).toContain('2010 TK₇');
    expect(factTrojan).not.toContain('at the L4 + L5 Lagrange points');

    const fqDiscover = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFQ: true, fqTheme: 'discover', fqIdx: 0 },
    });
    expect(fqDiscover).toContain('data-fq-theme="discover"');
    expect(fqDiscover).toContain('Vera Rubin');
    expect(fqDiscover).not.toContain('Neil Armstrong');

    const fqApollo13 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFQ: true, fqTheme: 'all', fqIdx: 2 },
    });
    expect(fqApollo13).toContain('Okay, Houston, we’ve had a problem here.');

    const pbdVoyager = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'voyager' },
    });
    expect(pbdVoyager).toContain('data-pbd-view="voyager"');
    expect(pbdVoyager).toContain('0.44 arcsec');

    const pbdCassini = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'cassini' },
    });
    expect(pbdCassini).toContain('data-pbd-view="cassini"');
    expect(pbdCassini).toContain('The Day the Earth Smiled');
  });

  it('adds Bortle 1–9 dark-sky simulator + tier filter to Toolkit Guide and interactive all-sky seasonal dome to Night Sky by Season', () => {
    const toolsDark = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 1, toolsTier: 'free' },
    });
    expect(toolsDark).toContain('data-bortle-class="1"');
    expect(toolsDark).toContain('~4,500 stars');
    expect(toolsDark).toContain('data-tools-tier="free"');
    expect(toolsDark).toContain('Stellarium');
    expect(toolsDark).not.toContain('Dobsonian Telescope');

    const toolsCity = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 9 },
    });
    expect(toolsCity).toContain('data-bortle-class="9"');
    expect(toolsCity).toContain('~40–80 stars');

    const skySouth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'south', ms2Season: 2 },
    });
    expect(skySouth).toContain('data-ms2-hemi="south"');
    expect(skySouth).toContain('data-ms2-season="jun-aug"');
    expect(skySouth).toContain('Galactic Core (Zenith!)');
    expect(skySouth).toContain('35°S Dome');

    const skyNorth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'north', ms2Season: 0 },
    });
    expect(skyNorth).toContain('data-ms2-hemi="north"');
    expect(skyNorth).toContain('data-ms2-season="dec-feb"');
    expect(skyNorth).toContain('45°N Dome');
  });

  it('adds Moon Explorer diameter SVG, Night Sky solar flux/angular telemetry, and Atmosphere Descent vertical column + contrast fix', () => {
    const moonsJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', showMoons: true },
    });
    expect(moonsJup).toContain('data-moon-explorer-svg="Jupiter"');
    expect(moonsJup).toContain('data-moon-luna-ref="true"');

    const moonsMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showMoons: true },
    });
    expect(moonsMars).toContain('155× wider than Phobos');

    const skyMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showSky: true },
    });
    expect(skyMars).toContain('data-sky-sun-deg="0.35°"');
    expect(skyMars).toContain('data-sky-sun-flux="43.1% Earth"');

    const skyMerc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mercury', showSky: true },
    });
    expect(skyMerc).toContain('data-sky-sun-flux="6.68× Earth"');

    const descentLight = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDescent: true, descentAlt: 10 },
    });
    expect(descentLight).toContain('data-descent-world="Earth"');
    expect(descentLight).toContain('data-descent-layer=');
    expect(descentLight).toContain('Jump to ');
    expect(descentLight).toContain('text-slate-800 font-semibold');
  });

  it('adds Earth-volume mode to Scale Comparison, solar-wind SVG to Magnetosphere card, interactive DYK browser w/ Mars sunset fix, and live keyword search to Mini-Labs Shelf', () => {
    const scaleVol = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', showScale: true, scaleCompareMode: 'earths' },
    });
    expect(scaleVol).toContain('data-scale-compare-mode="earths"');
    expect(scaleVol).toContain('× Earth vol');

    const magUranus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Uranus' },
    });
    expect(magUranus).toContain('data-mag-card-world="Uranus"');
    expect(magUranus).toContain('data-mag-shield="true"');
    expect(magUranus).toContain('Dipole tilted 59°');

    const magMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', dykIdx: 10 },
    });
    expect(magMars).toContain('data-mag-card-world="Mars"');
    expect(magMars).toContain('data-mag-shield="false"');
    expect(magMars).toContain('data-dyk-idx="10"');
    expect(magMars).toContain('(11/20)');
    expect(magMars).toContain('forward-scatters blue light near the Sun');
    expect(magMars).not.toContain('scatters red light forward');

    const shelfSearch = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', miniShelfQuery: 'eclipse' },
    });
    expect(shelfSearch).toContain('data-mini-shelf-query="eclipse"');
    expect(shelfSearch).toMatch(/data-solar-activity="stellar-evolution-timeline"[^>]*data-mini-shelf-filtered="true"/);
    const eclipseTag = shelfSearch.match(/<div[^>]*data-solar-activity="eclipse-theater"[^>]*>/)?.[0] || '';
    expect(eclipseTag).toBeTruthy();
    expect(eclipseTag).not.toContain('data-mini-shelf-filtered="true"');
  });

  it('adds interactive You-on-Planet Overview calculator, fixes Surface heading & layer contrast bugs, and adds Pluto/Mercury composition bars', () => {
    const marsOverview = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', explorerAge: 12, explorerJumpCm: 40 },
    });
    expect(marsOverview).toContain('data-overview-explorer="Mars"');
    expect(marsOverview).toContain('data-overview-age="6.38"');
    expect(marsOverview).toContain('data-overview-jump="1.0');
    expect(marsOverview).toContain('data-overview-escape="5"');

    const jupOverview = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', explorerAge: 12, explorerJumpCm: 40 },
    });
    expect(jupOverview).toContain('At 1-bar ref (no ground)');
    expect(jupOverview).toContain('data-overview-escape="59.5"');

    const surfAtmo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', viewTab: 'surface', surfaceExplore: 'atmosphere' },
    });
    expect(surfAtmo).toContain('color:#ffffff');
    expect(surfAtmo).not.toContain('var(--allo-stem-text, #ffffff)');
    expect(surfAtmo).toContain('class="text-xs font-bold text-white">Thermosphere<');

    const surfPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Pluto', viewTab: 'surface', surfaceExplore: 'composition' },
    });
    expect(surfPluto).toContain('data-surface-comp-bars="Pluto"');
    expect(surfPluto).toContain('99%');

    const surfMerc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mercury', viewTab: 'surface', surfaceExplore: 'composition' },
    });
    expect(surfMerc).toContain('data-surface-comp-bars="Mercury"');
    expect(surfMerc).toContain('Trace surface-bounded exosphere');
  });

  it('fixes WCAG contrast & adds Listen to Concept Cards, enriches per-planet Missions with status pills, and adds Listen to Extra Fun Facts', () => {
    const conceptLight = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConcept_habitable_zone: true },
    });
    expect(conceptLight).toContain('text-slate-900');
    expect(conceptLight).toContain('Listen to The Habitable Zone');

    const marsMissions = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars' },
    });
    expect(marsMissions).toContain('data-planet-missions="Mars"');
    expect(marsMissions).toContain('InSight');
    expect(marsMissions).toContain('Read missions to Mars aloud');
    expect(marsMissions).toContain('data-extra-facts-world="Mars"');
    expect(marsMissions).toContain('Read Mars facts aloud');

    const jupMissions = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter' },
    });
    expect(jupMissions).toContain('ESA JUICE');
    expect(jupMissions).toContain('En Route / Active');

    const venusMissions = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Venus' },
    });
    expect(venusMissions).toContain('DAVINCI &amp; EnVision');
    expect(venusMissions).toContain('Planned');
  });

  it('adds Top-Down/Edge-On 3D camera presets, J2000 Earth–Planet distance & light-time + alignment presets, and fixes Scale Explanation Jupiter/Sun diameters', () => {
    const default3d = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth' },
    });
    expect(default3d).toContain('data-3d-camera-preset="topdown"');
    expect(default3d).toContain('Top-Down');
    expect(default3d).toContain('data-3d-camera-preset="edgeon"');
    expect(default3d).toContain('Edge-On');
    expect(default3d).toContain('1,392,700 km');
    expect(default3d).toContain('11.0× Earth');
    expect(default3d).not.toContain('11.2× Earth');

    const ephemConj = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', ephemerisMode: true, ephemerisDate: '2020-12-21' },
    });
    expect(ephemConj).toContain('data-ephemeris-target-dist=');
    expect(ephemConj).toContain('data-ephemeris-target-light=');
    expect(ephemConj).toContain('Earth–Jupiter on 2020-12-21:');
    expect(ephemConj).toContain('2020 Great Conjunction');
    expect(ephemConj).toContain('2030 Europa Clipper');
  });

  it('fixes Orbital Mechanics Kepler Lab physics (focus F1, 8-iter solver, equal areas, tangent v, real AU/km/s/periodYr), live toggles + Pause, and NASA orbital speeds', () => {
    const orbHtml = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Mercury',
        showOrbital: true,
        _keplerBody: 'custom',
        _keplerSemiA: 100,
        _keplerShow_equations: false,
        _keplerPaused: true,
      },
    });
    expect(orbHtml).toContain('data-kepler-solver="newton-8-focus-left"');
    expect(orbHtml).toContain('data-kepler-body="custom"');
    expect(orbHtml).toContain('data-show-eq="false"');
    expect(orbHtml).toContain('data-show-energy="true"');
    expect(orbHtml).toContain('data-show-calc="true"');
    expect(orbHtml).toContain('data-show-vec="true"');
    expect(orbHtml).toContain('data-kepler-paused="true"');
    expect(orbHtml).toContain('data-kepler-pause="true"');
    expect(orbHtml).toContain('data-kepler-a-au="2.00"');
    expect(orbHtml).toContain('2.00 AU');
    expect(orbHtml).not.toContain('>100 AU<');
    expect(orbHtml).toContain('data-orbital-speed-world="Mercury" data-orbital-speed-kms="47.4"');
    expect(orbHtml).toContain('47.4 km/s (1.59×)');
    expect(orbHtml).toContain('data-orbital-speed-world="Pluto" data-orbital-speed-kms="4.7"');
    expect(orbHtml).not.toContain('123.6 km/s');

    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('var sunX = centerX - focusOffset, sunY = centerY;');
    expect(source).toContain('var emptyFocusX = centerX + focusOffset;');
    expect(source).toContain('function solveKeplerE(Mraw, eVal)');
    expect(source).toContain('var REAL_ORBIT_YR =');
    expect(source).toContain('var REAL_ORBIT_AU =');
    expect(source).not.toContain('sectorSpan * 0.35');
  });

  it('adds interactive SVG Blueprint & destination feasibility to Spacecraft Designer and synced barred-core rotation + Sun marker to Galaxy Spiral Map', () => {
    const scRisk = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDesigner: true,
        scDest: 'pluto',
        spacecraft: { core: 'probe', power: 'solar', prop: 'ion', payload: ['camera'] },
      },
    });
    expect(scRisk).toContain('data-sc-blueprint="true"');
    expect(scRisk).toContain('data-sc-dest="pluto"');
    expect(scRisk).toContain('data-sc-status="risk"');
    expect(scRisk).toContain('0.06% Earth sunlight');

    const scReady = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDesigner: true,
        scDest: 'pluto',
        spacecraft: { core: 'probe', power: 'rtg', prop: 'ion', payload: ['camera', 'spec'] },
      },
    });
    expect(scReady).toContain('data-sc-status="ready"');
    expect(scReady).toContain('FLIGHT READY');
    expect(scReady).toContain('Voyager 1');

    const galBarred = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGalaxy: true, galType: 'barred', galRot: 75 },
    });
    expect(galBarred).toContain('data-gal-type="barred"');
    expect(galBarred).toContain('data-gal-core-rot="75"');
    expect(galBarred).toContain('data-gal-sun-marker="true"');
    expect(galBarred).toContain('Sgr A* (4.3M M☉)');
  });

  it('adds multi-world gravity & HUD gauges to Lunar Lander, spacecraft travel times to Light-Year Walker, and Titan ocean cutaway + scorecard to Habitable Moons', () => {
    const landerMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'mars' },
    });
    expect(landerMars).toContain('data-lander-world="mars"');
    expect(landerMars).toContain('Mars (3.72 m/s²)');
    expect(landerMars).toContain('data-lander-fuel-bar="100"');

    const lyProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 5 },
    });
    expect(lyProx).toContain('data-ly-dest="5"');
    expect(lyProx).toContain('data-ly-voyager=');
    expect(lyProx).toContain('data-ly-parker=');
    expect(lyProx).toContain('Lookback Time:');

    const habTitan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'titan', habView: 'cutaway' },
    });
    expect(habTitan).toContain('data-hab-moon="titan"');
    expect(habTitan).toContain('data-hab-cutaway="titan"');
    expect(habTitan).toContain('data-hab-moon-color="#f59e0b"');
    expect(habTitan).toContain('Water-ammonia ocean');
    expect(habTitan).toContain('Dragonfly (2028)');
  });

  it('uses Chen-Kipping Mass-Radius physics & bare-rock temperature in Planet Builder and adds Venus/Saturn + Tsiolkovsky propellant comparison to Trajectory Designer', () => {
    const pbJup = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showBuilder: true,
        buildMass: 300,
        buildDist: 0.1,
        buildAtmo: true,
        buildWater: false,
        buildMag: true,
      },
    });
    expect(pbJup).toContain('data-builder-analog="51 Pegasi b (Hot Jupiter)"');
    expect(pbJup).toMatch(/data-builder-grav="2\.[45]\d"/);
    expect(pbJup).toMatch(/data-builder-vesc="5[789]\.\d"/);
    expect(pbJup).toMatch(/data-builder-radius="11\.\d\d"/);
    expect(pbJup).not.toContain('17.32g');
    expect(pbJup).not.toContain('194.0 km/s');

    const pbAirlessEarth = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showBuilder: true,
        buildMass: 1,
        buildDist: 1,
        buildAtmo: false,
        buildWater: false,
        buildMag: false,
      },
    });
    expect(pbAirlessEarth).toContain('data-builder-grav="1.00"');
    expect(pbAirlessEarth).toContain('data-builder-vesc="11.2"');
    expect(pbAirlessEarth).toContain('~-18°C');
    expect(pbAirlessEarth).not.toContain('~-56°C');
    expect(pbAirlessEarth).toContain('Mars-like');

    const trajVenus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'venus' },
    });
    expect(trajVenus).toContain('Venus');
    expect(trajVenus).toContain('~3.5 km/s');
    expect(trajVenus).toContain('data-traj-mass-ratio=');
    expect(trajVenus).toContain('data-traj-prop-pct=');
    expect(trajVenus).toContain('Chemical Rocket (Isp 350 s)');
    expect(trajVenus).toContain('Xenon Ion Drive (Isp 3,200 s)');

    const trajSaturn = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'saturn' },
    });
    expect(trajSaturn).toContain('Saturn');
    expect(trajSaturn).toContain('~7.3 km/s');
  });

  it('adds scenario presets & water triple-point phase to Mars Terraforming, true-albedo silhouette & belt zone to Asteroid Composition, and presets & biosphere diagnostics to Custom Planet Builder', () => {
    const tfToday = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 0, tfIce: 0, tfTrees: 0 },
    });
    expect(tfToday).toContain('data-tf-water-phase="sublimate"');
    expect(tfToday).toContain('Mars Today');
    expect(tfToday).toContain('Full Biosphere');

    const tfWet = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 95, tfIce: 100, tfTrees: 80 },
    });
    expect(tfWet).toContain('data-tf-water-phase="liquid"');
    expect(tfWet).toContain('Liquid Rivers Stable!');

    const astMetal = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'mType' },
    });
    expect(astMetal).toContain('data-ast-type="mType"');
    expect(astMetal).toContain('data-ast-silhouette="mType"');
    expect(astMetal).toContain('data-ast-zone="Middle Belt (2.5–2.8 AU)"');
    expect(astMetal).toContain('of belt');

    const cpbAirlessLife = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showCustomBuilder: true,
        builderPl: { core: 'rock', surface: 'rock', atmo: 'none', life: true },
      },
    });
    expect(cpbAirlessLife).toContain('data-cpb-analog="Moon / Mercury"');
    expect(cpbAirlessLife).toContain('data-cpb-biosphere="Subsurface microbes only — surface unbreathable"');
    expect(cpbAirlessLife).toContain('Earth Twin');
    expect(cpbAirlessLife).toContain('Titan Twin');
  });

  it('adds synodic age, rise/transit/set times & tides to Moon Phase Dial and apogee annular Ring of Fire + Diamond Ring to Eclipse Theater', () => {
    const fqMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 90 },
    });
    expect(fqMoon).toContain('data-moon-age="7.4"');
    expect(fqMoon).toContain('data-moon-rise="12 PM"');
    expect(fqMoon).toContain('data-moon-tide="Neap Tide"');
    expect(fqMoon).toContain('↑ 12 PM · ★ 6 PM · ↓ 12 AM');
    expect(fqMoon).toContain('🌓 1st Qtr');

    const fullMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 180 },
    });
    expect(fullMoon).toContain('data-moon-age="14.8"');
    expect(fullMoon).toContain('data-moon-rise="6 PM"');
    expect(fullMoon).toContain('data-moon-tide="Spring Tide"');

    const annular = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseAlign: 50, eclipseDist: 405000 },
    });
    expect(annular).toContain('data-eclipse-kind="annular"');
    expect(annular).toContain('data-moon-arcmin="29.5"');
    expect(annular).toContain('ANNULAR SOLAR ECLIPSE — Ring of Fire');
    expect(annular).toContain('r="51"');

    const diamond = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseAlign: 57, eclipseDist: 363000 },
    });
    expect(diamond).toContain('data-eclipse-kind="diamond"');
    expect(diamond).toContain('data-eclipse-diamond="true"');
    expect(diamond).toContain('DIAMOND RING EFFECT');
  });

  it('adds NOAA G-scale & storm presets to Aurora Tuner, spaghettification/Hawking/Doppler beaming to Black Hole Visualizer, and cosmological redshift & photon stretch to Big Bang Stretch', () => {
    const g5Aurora = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 100, auroraLat: 43, auroraAlt: 280 },
    });
    expect(g5Aurora).toContain('data-aurora-kp="9"');
    expect(g5Aurora).toContain('data-aurora-gscale="G5 Extreme"');
    expect(g5Aurora).toContain('data-aurora-emission="O 630 nm (&lt;1 keV)"');
    expect(g5Aurora).toContain('May 2024 G5 Red (Kp 9)');

    const cygBH = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 9, bhSpin: 95 },
    });
    expect(cygBH).toContain('data-bh-spag="instant"');
    expect(cygBH).toContain('data-bh-beaming="true"');
    expect(cygBH).toContain('data-bh-kerr="0.95"');
    expect(cygBH).toContain('Cygnus X-1 (21 M☉)');

    const m87BH = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 98, bhSpin: 90 },
    });
    expect(m87BH).toContain('data-bh-spag="gentle"');
    expect(m87BH).toContain('safe crossing!');
    expect(m87BH).toContain('M87* (6.5B M☉)');

    const bbCmb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 4 },
    });
    expect(bbCmb).toContain('data-bb-z="1,090"');
    expect(bbCmb).toContain('data-bb-band="Visible Orange Glow"');
    expect(bbCmb).toContain('data-bb-wave="9"');

    const bbNow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 10 },
    });
    expect(bbNow).toContain('data-bb-z="0"');
    expect(bbNow).toContain('data-bb-band="Microwave (1.9 mm)"');
    expect(bbNow).toContain('data-bb-wave="2"');
  });

  it('adds Stefan-Boltzmann radius & core fuel to Stellar Evolution, DART deflection safe-miss arcs to Asteroid Defender, and cosmic depth inspector to Hubble Deep Field', () => {
    const sunMS = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 15 },
    });
    expect(sunMS).toContain('data-stellar-radius="1.00 R☉"');
    expect(sunMS).toContain('data-stellar-spec="G-type"');
    expect(sunMS).toContain('data-stellar-fuel="Core H → He (pp-chain)"');

    const sunRG = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 75 },
    });
    expect(sunRG).toContain('data-stellar-radius="94 R☉"');
    expect(sunRG).toContain('data-stellar-spec="M-type"');
    expect(sunRG).toContain('data-stellar-fuel="H shell + He → C/O core"');

    const dartDef = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDefender: true,
        defMode: 'deflect',
        defAsteroids: [
          { id: 1, x: 260, y: 90, vx: -0.6, vy: 0.2, r: 6, alive: false, deflected: true },
          { id: 2, x: 340, y: 130, vx: -0.7, vy: 0, r: 7, alive: true },
        ],
      },
    });
    expect(dartDef).toContain('data-def-mode="deflect"');
    expect(dartDef).toContain('data-def-deflected="1"');
    expect(dartDef).toContain('data-def-safe-arc="1"');
    expect(dartDef).toContain('DART Δv · Safe miss');
    expect(dartDef).toContain('Wave 1');

    const hdfEarly = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'jwst', hdfFocus: 'early', hdfZoom: 1 },
    });
    expect(hdfEarly).toContain('data-hdf-focus="early"');
    expect(hdfEarly).toContain('data-hdf-moon-frac="133"');
    expect(hdfEarly).toContain('JADES-GS-z14-0');
  });

  it('adds Planck acoustic power spectrum & spatial curvature explorer to CMB and live distance modulus standard-candle calculator to Cepheid Variable Star', () => {
    const cmbFlat = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbGeom: 'flat' },
    });
    expect(cmbFlat).toContain('data-cmb-geom="flat"');
    expect(cmbFlat).toContain('data-cmb-peak-l="220"');
    expect(cmbFlat).toContain('data-cmb-spectrum="flat"');
    expect(cmbFlat).toContain('Planck Measured Peak (ℓ=220 · 1.0°)');

    const cmbClosed = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbGeom: 'closed' },
    });
    expect(cmbClosed).toContain('data-cmb-geom="closed"');
    expect(cmbClosed).toContain('data-cmb-peak-l="125"');
    expect(cmbClosed).toContain('Space bends like a sphere');

    const m31 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 31.4, pvAppMag: 19.0 },
    });
    expect(m31).toContain('data-cepheid-realm="Local Group Galaxy"');
    expect(m31).toContain('data-cepheid-dist-ly="2.76 Mly"');
    expect(m31).toContain('Andromeda M31 V1');

    const m100 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 40.0, pvAppMag: 25.2 },
    });
    expect(m100).toContain('data-cepheid-realm="Distant Galaxy Cluster"');
    expect(m100).toContain('Virgo M100 (HST)');
  });

  it('adds future MW-Andromeda timeline scrubber to Local Group, sidereal vs solar day inspector to Day Length, and continent silhouettes + cities + duration to Eclipse Path Maker', () => {
    const lgMerge = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgGyr: 7 },
    });
    expect(lgMerge).toContain('data-lg-gyr="7.0"');
    expect(lgMerge).toContain('data-lg-phase="milkomeda"');
    expect(lgMerge).toContain('data-lg-tidal="true"');
    expect(lgMerge).toContain('Milkomeda Elliptical');
    expect(lgMerge).toContain('Fills entire night sky!');

    const dlMerc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDL: true, dlWorld: 'Mercury' },
    });
    expect(dlMerc).toContain('data-dl-world="Mercury"');
    expect(dlMerc).toContain('data-dl-solar-day="4,222 h (176 d)"');
    expect(dlMerc).toContain('data-dl-eq-speed="10.9 km/h"');
    expect(dlMerc).toContain('3:2 spin–orbit resonance');

    const epLuxor = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2027', ePathLat: 26, ePathLon: 33 },
    });
    expect(epLuxor).toContain('data-epath-land="af"');
    expect(epLuxor).toContain('data-epath-land="na"');
    expect(epLuxor).toContain('data-epath-obsc="100"');
    expect(epLuxor).toContain('data-epath-status="totality"');
    expect(epLuxor).toContain('Luxor, Egypt');
    expect(epLuxor).toContain('totality');
  });

  it('adds interactive Powers-of-10 ruler & category filters to Big Numbers and Mass/Volume/Angular Momentum Paradox switcher to Solar System At a Glance', () => {
    const bnHawk = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBN: true, bnCat: 'Time', bnSel: 'hawking' },
    });
    expect(bnHawk).toContain('data-bn-cat="Time"');
    expect(bnHawk).toContain('data-bn-exp="100"');
    expect(bnHawk).toContain('data-bn-analogy="hawking"');
    expect(bnHawk).toContain('Googol (10¹⁰⁰)');

    const sagMom = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagMode: 'momentum' },
    });
    expect(sagMom).toContain('data-sag-mode="momentum"');
    expect(sagMom).toContain('data-sag-jupiter="61.6"');
    expect(sagMom).toContain('Angular Momentum Paradox: Planets Hold ~98%');
    expect(sagMom).toContain('magnetic braking');

    const sagVol = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagMode: 'volume' },
    });
    expect(sagVol).toContain('data-sag-mode="volume"');
    expect(sagVol).toContain('data-sag-jupiter="57.1"');
    expect(sagVol).toContain('1.3 million Earths');
  });

  it('adds composition/airburst/Richter Mw to Asteroid Impact, two-city date-line comparator to Time Zone Visualizer, and custom cosmic-clock calculator to Cosmic Calendar', () => {
    const barringer = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 50, impComp: 'iron' },
    });
    expect(barringer).toContain('data-imp-comp="iron"');
    expect(barringer).toContain('data-imp-mode="crater"');
    expect(barringer).toContain('data-imp-mw="5.4"');
    expect(barringer).toContain('Surface crater impact');

    const stony50 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 50, impComp: 'stony' },
    });
    expect(stony50).toContain('data-imp-comp="stony"');
    expect(stony50).toContain('data-imp-mode="airburst"');
    expect(stony50).toContain('Atmospheric airburst');

    const tzCross = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 17, tzCityA: 2, tzCityB: 8 },
    });
    expect(tzCross).toContain('data-tz-diff="+14 h"');
    expect(tzCross).toContain('data-tz-date-diff="Tomorrow (+1 day)"');
    expect(tzCross).toContain('12:00');
    expect(tzCross).toContain('02:00');

    const calApollo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCal: true, calCustomYr: 57 },
    });
    expect(calApollo).toContain('data-cal-custom-date="Dec 31 · 23:59:59.87"');
    expect(calApollo).toContain('data-cal-before-midnight="0.13 sec before midnight"');
  });

  it('adds Fermi Paradox radio-bubble & Great Filter diagnostics to Drake Equation and 1 cm bolt impact energy & Kessler risk to Space Debris Tracker', () => {
    const drakeExo = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDrake: true,
        drR: 1.5,
        drFp: 1.0,
        drNe: 0.4,
        drFl: 0.5,
        drFi: 0.1,
        drFc: 0.5,
        drL: 1000,
      },
    });
    expect(drakeExo).toContain('data-drake-bottleneck="Biology / Intelligence (fₗ·fᵢ)"');
    expect(drakeExo).toContain('data-drake-radio-bubble=');
    expect(drakeExo).toContain('100 ly radio bubble');
    expect(drakeExo).toContain('data-drake-fermi=');

    const junkPeak = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 800 },
    });
    expect(junkPeak).toContain('data-junk-vrel=');
    expect(junkPeak).toContain('data-junk-ke-kj=');
    expect(junkPeak).toContain('data-junk-kessler="HIGH (Peak Debris Belt)"');

    const junkIss = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 420 },
    });
    expect(junkIss).toContain('data-junk-kessler="ELEVATED (Self-cleans in yrs)"');
    expect(junkIss).toContain('Compact car crash');
  });

  it('adds ESI & host-star sorting to Exoplanet Comparison, UDL Predict-First mode + baseline bar to What If? Scenarios, and Hot Jupiter / Super-Earth / Earth Twin signal strength to Exoplanet Detection Methods', () => {
    const exoEsi = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExo: true, exoSort: 'esi' },
    });
    expect(exoEsi).toContain('data-exo-sort="esi"');
    expect(exoEsi).toContain('data-exo-esi="0.93"');
    expect(exoEsi).toContain('M2V Quiet Red Dwarf');
    expect(exoEsi.indexOf('TOI-700 d')).toBeLessThan(exoEsi.indexOf('WASP-76b'));

    const whatIfQuiz = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showWhatIf: true, whatIfQuiz: true },
    });
    expect(whatIfQuiz).toContain('data-whatif-world="Mars"');
    expect(whatIfQuiz).toContain('data-whatif-quiz="true"');
    expect(whatIfQuiz).toContain('Predict-First: ON');
    expect(whatIfQuiz).toContain('Reveal Answer');
    expect(whatIfQuiz).toContain('Mars baseline: 0.38g');

    const exTransitEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'transit', exPhase: 50, exTarget: 'earthTwin' },
    });
    expect(exTransitEarth).toContain('data-exmth-target="earthTwin"');
    expect(exTransitEarth).toContain('data-exmth-flux="99.9916"');
    expect(exTransitEarth).toContain('data-exmth-depth="0.0084% (84 ppm)"');
    expect(exTransitEarth).toContain('±0.09 m/s (9 cm/s!)');

    const exDopplerEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'doppler', exPhase: 25, exTarget: 'earthTwin' },
    });
    expect(exDopplerEarth).toContain('+0.09 m/s (Redshift · away)');
  });

  it('adds Jeans density/force telemetry & real nursery comparator to Star Forming Region and ISS/DSN/Mars Sol off-Earth telemetry strip to Why UTC Matters', () => {
    const sfrTarantula = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 0, sfrNursery: 'tarantula' },
    });
    expect(sfrTarantula).toContain('data-sfr-density="~10² atoms/cm³"');
    expect(sfrTarantula).toContain('data-sfr-force="Jeans Gravity &gt; Gas Pressure"');
    expect(sfrTarantula).toContain('data-sfr-nursery="tarantula"');
    expect(sfrTarantula).toContain('Tarantula Nebula (30 Dor)');

    const utcNoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 12 },
    });
    expect(utcNoon).toContain('data-utc-iss="7.8"');
    expect(utcNoon).toContain('data-utc-dsn="Canberra (Australia · +10h)"');
    expect(utcNoon).toContain('data-utc-mars-sol="24h 39m 35s"');
  });

  it('adds greenhouse surface temp & orbital period to Habitable Zone, calibration ripple to Distance Ladder, and RTG/region/bitrate telemetry to Voyager Tracker', () => {
    const hzMarsThick = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 1, hzDist: 1.52, hzAtmo: 'thick' },
    });
    expect(hzMarsThick).toContain('data-hz-atmo="thick"');
    expect(hzMarsThick).toContain('data-hz-tsurf="14"');
    expect(hzMarsThick).toContain('data-hz-period="1.87 yr"');
    expect(hzMarsThick).toContain('data-hz-star-class="G-Type (Sun-like)"');
    expect(hzMarsThick).toContain('data-hz-opt-range="0.752–1.77 AU"');
    expect(hzMarsThick).toContain('Liquid H₂O');

    const hzTrappist = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 0.0005, hzDist: 0.029, hzAtmo: 'earth' },
    });
    expect(hzTrappist).toContain('data-hz-star-class="M-Dwarf (Red)"');
    expect(hzTrappist).toMatch(/data-hz-period="[0-9.]+ days"/);

    const ladderRipple = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDistLadder: true, distStep: 7, distErrRipple: true },
    });
    expect(ladderRipple).toContain('data-ladder-depends="Rung 7 (Type Ia SNe → H₀)"');
    expect(ladderRipple).toContain('data-ladder-precision="Hubble Tension (~8% gap!)"');
    expect(ladderRipple).toContain('data-ladder-ripple="true"');
    expect(ladderRipple).toContain('shifts +10% too!');

    const voy2026 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVoy: true, voyYear: 2026 },
    });
    expect(voy2026).toContain('data-voy-rtg-w="225"');
    expect(voy2026).toContain('data-voy-region="Interstellar Medium (&gt;120 AU)"');
    expect(voy2026).toContain('data-voy-bitrate="160 bps (70m DSN Dish)"');
    expect(voy2026).toContain('~74,000 years');
  });

  it('adds observatory altitude simulator & photon energy to Atmospheric Window and hemisphere filter + realistic sky-condition rates to Meteor Shower Calendar', () => {
    const awXrayGround = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'xray', awAlt: 0 },
    });
    expect(awXrayGround).toContain('data-aw-alt="0"');
    expect(awXrayGround).toContain('data-aw-reception="Blocked — Launch Higher!"');
    expect(awXrayGround).toContain('data-aw-photon-e="0.1–100 keV"');
    expect(awXrayGround).toContain('Black hole accretion disks');

    const awXraySpace = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'xray', awAlt: 550 },
    });
    expect(awXraySpace).toContain('data-aw-alt="550"');
    expect(awXraySpace).toContain('data-aw-reception="Clear Signal"');

    const awMicroAlma = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'micro', awAlt: 5 },
    });
    expect(awMicroAlma).toContain('data-aw-reception="Clear Signal"');

    const msSouthSub = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS: true, msHemi: 'south', msSky: 'suburban' },
    });
    expect(msSouthSub).toContain('data-ms-hemi="south"');
    expect(msSouthSub).toContain('data-ms-sky="suburban"');
    expect(msSouthSub).toContain('~34/hr visible');
    expect(msSouthSub).toContain('Asteroid');
    expect(msSouthSub).toContain('Southern Delta Aquariids');
    expect(msSouthSub).not.toContain('Comet Swift-Tuttle');
  });

  it('adds Star Inspector & Star-Hopping to Constellation Hunter, Wien peak & Milky Way share to OBAFGKM, and 10-parsec Absolute Fair Race to Star Magnitude Scale', () => {
    const constAlnilam = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'orion', constStar: 'alnilam' },
    });
    expect(constAlnilam).toContain('data-const-star="alnilam"');
    expect(constAlnilam).toContain('data-const-star-spec="B0 Blue Supergiant"');
    expect(constAlnilam).toContain('data-const-depth-span="1750"');
    expect(constAlnilam).toContain('2,000 ly ago (~26 CE)');
    expect(constAlnilam).toContain('Follow Orion’s 3-star Belt southeast to Sirius');

    const spsM = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpS: true, spsClass: 6 },
    });
    expect(spsM).toContain('data-sps-class="M"');
    expect(spsM).toContain('data-sps-wien-nm="950"');
    expect(spsM).toContain('data-sps-share="76.5% (3 in 4 stars!)"');
    expect(spsM).toContain('950 nm (Near-Infrared)');
    expect(spsM).toContain('TiO');

    const smagAbs = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSMag: true, smagMode: 'absolute' },
    });
    expect(smagAbs).toContain('data-smag-mode="absolute"');
    expect(smagAbs).toContain('data-smag-abs-table="true"');
    expect(smagAbs).toContain('Equal-Distance Lineup: Every Star Placed at 10 Parsecs (32.6 ly)');
    expect(smagAbs).toContain('M = -5.71');
    expect(smagAbs).toContain('M = +4.83');
  });

  it('adds 4-grid target translator & latitude visibility to Celestial Coordinates and multi-wavelength filter + chemistry telemetry to Famous Nebulae', () => {
    const coordSydneyPolaris = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'polaris', coordLat: -34 },
    });
    expect(coordSydneyPolaris).toContain('data-coord-target="polaris"');
    expect(coordSydneyPolaris).toContain('data-coord-lat="-34"');
    expect(coordSydneyPolaris).toContain('data-coord-visibility="Never Rises Here"');
    expect(coordSydneyPolaris).toContain('Polaris is below horizon');

    const coordSydneySgrA = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'sgrA', coordLat: -34 },
    });
    expect(coordSydneySgrA).toContain('data-coord-max-alt="85"');
    expect(coordSydneySgrA).toContain('Rises &amp; Sets (Max Alt 85°)');

    const nebEagleIr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 3, nebBand: 'infrared' },
    });
    expect(nebEagleIr).toContain('data-neb-kind="pillars"');
    expect(nebEagleIr).toContain('data-neb-band="infrared"');
    expect(nebEagleIr).toContain('data-neb-constel="Serpens"');
    expect(nebEagleIr).toContain('JWST NIRCam makes the opaque Pillars nearly transparent');

    const nebCrabXray = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 1, nebBand: 'xray' },
    });
    expect(nebCrabXray).toContain('data-neb-band="xray"');
    expect(nebCrabXray).toContain('Chandra X-ray captures a blistering polar jet');
  });

  it('adds Doppler velocity shift & Sun overlay to Star Spectra Comparison, power/eye-view toggle to Auroras Across Solar System, and %c + Earth-lap time to Cosmic Speeds', () => {
    const spcShift = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpc: true, spcEl: 'redgi', spcVel: 6000, spcRefSun: true },
    });
    expect(spcShift).toContain('data-spc-obj="redgi"');
    expect(spcShift).toContain('data-spc-vel="6000"');
    expect(spcShift).toContain('data-spc-halpha-nm="669.4"');
    expect(spcShift).toContain('data-spc-ref-sun="true"');
    expect(spcShift).toContain('+6,000 km/s Redshift');
    expect(spcShift).toContain('Sun Reference: ON');

    const auJupEye = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'jupiter', auEye: 'human' },
    });
    expect(auJupEye).toContain('data-aurora-power="~10,000–100,000 GW (~1,000× Earth!)"');
    expect(auJupEye).toContain('data-aurora-eye-mode="human"');
    expect(auJupEye).toContain('Mostly invisible UV/X-ray');

    const cspLight = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'light' },
    });
    expect(cspLight).toContain('data-csp-pct-c="100% c"');
    expect(cspLight).toContain('data-csp-earth-lap="0.13 sec (7.5 laps/s!)"');
  });

  it('adds remnant mass/size/density/nucleosynthesis physics to How Stars Die and Ocean Worlds filter + gravity & missions to 10 Most Famous Moons', () => {
    const deathNs = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 15 },
    });
    expect(deathNs).toContain('data-death-stage="ns"');
    expect(deathNs).toContain('data-death-rem-size="~20 km (city-sized!)"');
    expect(deathNs).toContain('~1 billion tons/tsp (Mt. Everest!)');
    expect(deathNs).toContain('Gold/Platinum (r-process)');

    const deathBh = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 35 },
    });
    expect(deathBh).toContain('data-death-stage="bh"');
    expect(deathBh).toContain('data-death-rem-mass="~13 M☉ (&gt;2.2 M☉ TOV limit)"');
    expect(deathBh).toContain('data-death-rem-size="~77 km Event Horizon"');

    const fmOcean = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFM: true, fmFilter: 'ocean' },
    });
    expect(fmOcean).toContain('data-fm-filter="ocean"');
    expect(fmOcean).toContain('data-fm-count="6"');
    expect(fmOcean).toContain('Europa Clipper (arrives 2030)');
    expect(fmOcean).toContain('0.134g');
    expect(fmOcean).not.toContain('data-moon-bar="luna"');
    expect(fmOcean).not.toContain('data-moon-bar="io"');
  });
});
