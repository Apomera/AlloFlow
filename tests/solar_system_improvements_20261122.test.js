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

  it('adds Cassini seasonal color & Rossby side length to Saturn Hexagon, band filter + Hubble light power to World Telescopes, and 2,300-yr timeline + paradigm shift to Hall of Fame', () => {
    const hexWinter = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHex: true, hexSides: 6, hexSeason: 'winter' },
    });
    expect(hexWinter).toContain('data-hex-season="winter"');
    expect(hexWinter).toContain('data-hex-side-km="14500"');
    expect(hexWinter).toContain('#0284c7');
    expect(hexWinter).toContain('Winter Blue (low UV)');

    const telIr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telBand: 'ir' },
    });
    expect(telIr).toContain('data-tel-band="ir"');
    expect(telIr).toContain('data-tel-count="2"');
    expect(telIr).toContain('James Webb (JWST)');
    expect(telIr).toContain('7.3× Hubble area');
    expect(telIr).toContain('Spitzer Space Telescope');
    expect(telIr).not.toContain('Hubble Space Telescope');

    const astrPayne = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'astro', astrSel: 1925 },
    });
    expect(astrPayne).toContain('data-astr-count="6"');
    expect(astrPayne).toContain('data-astr-selected="1925"');
    expect(astrPayne).toContain('Astronomy Hall of Fame — 2,300-year discovery relay timeline');
    expect(astrPayne).toContain('Overturned the belief that stars had Earth-like rocky chemistry');
  });

  it('adds boiling point, sound speed & flight physics to Mars vs Earth Atmosphere and star-count/gas/SFR astrophysics strip to Galaxy Types Gallery', () => {
    const maAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMA: true, maExtra: true },
    });
    expect(maAll).toContain('data-ma-boil="~0°C (instant boil!)"');
    expect(maAll).toContain('data-ma-sound="240 m/s"');
    expect(maAll).toContain('Ingenuity: 2,500 RPM rotors!');
    expect(maAll).toContain('Dense air + 0.14g: easy flight (Dragonfly!)');
    expect(maAll).toContain('Cloud-deck balloons at 55 km');

    const gtStarburst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGT: true, gtSel: 'sbx' },
    });
    expect(gtStarburst).toContain('data-gt-active="sbx"');
    expect(gtStarburst).toContain('data-gt-stars="30B–200B stars"');
    expect(gtStarburst).toContain('data-gt-gas="30%+ dense gas"');
    expect(gtStarburst).toContain('data-gt-sfr="10–100 M☉/yr!"');
    expect(gtStarburst).toContain('data-gt-pop="Super-clusters + superwinds"');
  });

  it('adds Mars Jezero terrain & CSFD to Crater Counter, burn-rate/Teff/life-window to Star Lifespan, and 4-mass real-scale anatomy to Black Hole Vocabulary', () => {
    const crMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'mars' },
    });
    expect(crMars).toContain('data-crater-terrain="mars"');
    expect(crMars).toContain('data-crater-resurface="Ancient river delta &amp; wind erosion"');
    expect(crMars).toContain('Found: 0 / 10');
    expect(crMars).toContain('Mark next crater');

    const sltSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 1 },
    });
    expect(sltSun).toContain('data-slt-burn="1.00× Sun"');
    expect(sltSun).toContain('data-slt-temp-k="5778"');
    expect(sltSun).toContain('data-slt-life-window="Plenty (&gt;4 Gyr for complex life)"');

    const sltRigel = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 21 },
    });
    expect(sltRigel).toContain('data-slt-burn="42,439× Sun"');
    expect(sltRigel).toContain('data-slt-life-window="Too brief (&lt;1 Gyr!)"');

    const bhgM87 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgScale: 'm87' },
    });
    expect(bhgM87).toContain('data-bhg-scale="m87"');
    expect(bhgM87).toContain('data-bhg-rs="128 AU (&gt;4× Neptune!)"');
    expect(bhgM87).toContain('data-bhg-photon="192 AU"');
    expect(bhgM87).toContain('data-bhg-isco="385 AU"');

    const bhgEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgScale: 'earth' },
    });
    expect(bhgEarth).toContain('data-bhg-rs="8.9 mm (marble!)"');
  });

  it('adds sky use, science bridge & audio Listen to Constellation Mythology and region matcher, Saros cycle tags & eye-safety to Upcoming Eclipses', () => {
    const cmPleiades = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCM: true, cmIdx: 6 },
    });
    expect(cmPleiades).toContain('data-cm-use="Global Planting &amp; New-Year Calendar"');
    expect(cmPleiades).toContain('Read Pleiades (M45) stories aloud');
    expect(cmPleiades).toContain('open cluster of 1,000+ hot blue stars');

    const ecatAmer = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showECat: true, ecatFilter: 'solar', ecatReg: 'americas' },
    });
    expect(ecatAmer).toContain('data-ecat-region="americas"');
    expect(ecatAmer).toContain('data-ecat-count="5"');
    expect(ecatAmer).toContain('Saros 136');
    expect(ecatAmer).toContain('Saros 149');
    expect(ecatAmer).toContain('ISO 12312-2 glasses required');
    expect(ecatAmer).not.toContain('Passes directly over Sydney harbor');
  });

  it('adds next-rank & unvisited world CTA to Cosmic Journey, active filter & radio delay to Famous Missions, and active investigators + Listen to Big Questions', () => {
    const journey = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSummary: true, planetsVisited: ['Mercury', 'Venus', 'Earth', 'Mars'] },
    });
    expect(journey).toContain('data-journey-score="40"');
    expect(journey).toContain('data-journey-next-rank="Deep Space Astronomer"');
    expect(journey).toContain('data-journey-next-world="Jupiter"');
    expect(journey).toContain('Next unvisited: Jupiter →');
    expect(journey).toContain('data-journey-badge="outer"');

    const mpOuterAct = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMP: true, mpFilter: 'outer', mpActiveOnly: true },
    });
    expect(mpOuterAct).toContain('data-mp-active-only="true"');
    expect(mpOuterAct).toContain('data-mp-count="3"');
    expect(mpOuterAct).toContain('📡 1-way signal: 22.7 hr (24.5B km)');
    expect(mpOuterAct).toContain('NASA / JPL');
    expect(mpOuterAct).not.toContain('Cassini-Huygens');

    const cqLife = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCQ: true, cqIdx: 2 },
    });
    expect(cqLife).toContain('6,300+ exoplanets confirmed');
    expect(cqLife).toContain('data-cq-tools="JWST, Europa Clipper, Dragonfly &amp; Habitable Worlds Observatory"');
    expect(cqLife).toContain('Read Are we alone? aloud');
  });

  it('adds record-holders & Earth ratio strip to Side-by-Side and baseline ratio + Jet/Voyager travel-time comparator to Cosmic Distance Reference', () => {
    const sqcTemp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'temp', sqcSun: false },
    });
    expect(sqcTemp).toContain('data-sqc-max-world="venus"');
    expect(sqcTemp).toContain('data-sqc-min-world="pluto"');
    expect(sqcTemp).toContain('data-sqc-spread="689°C span"');
    expect(sqcTemp).toContain('449°C cooler than Venus');

    const distProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 8, distBaseIdx: 5 },
    });
    expect(distProx).toContain('data-dist-base="5"');
    expect(distProx).toContain('data-dist-ratio="10^5.4× farther"');
    expect(distProx).toContain('data-dist-voyager="74.7 kyr"');
    expect(distProx).toContain('data-dist-jet="5.1 Myr"');
  });

  it('adds City-Friendly filter to Tonight Sky Guide, upcoming-only & agency pills to Space News Timeline, and stargazer tier + category filter to Bucket List', () => {
    const tntCity = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTNT: true, tntSky: 'city' },
    });
    expect(tntCity).toContain('data-tnt-sky="city"');
    expect(tntCity).toContain('data-tnt-count="7"');
    expect(tntCity).toContain('City OK');
    expect(tntCity).toContain('Find Saturn &amp; Its Rings');
    expect(tntCity).not.toContain('See the Andromeda Galaxy (M31)');

    const wnFut = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFuture: true },
    });
    expect(wnFut).toContain('data-wn-future="true"');
    expect(wnFut).toContain('data-wn-next=');
    expect(wnFut).toContain('Next on the horizon');
    expect(wnFut).toContain('NASA / APL');
    expect(wnFut).not.toContain('SLIM (Japan)');

    const blRare = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBL: true, bucketDone: [0, 1, 2, 3, 4], blCat: 'rare' },
    });
    expect(blRare).toContain('data-bucket-tier="Night Sky Hunter"');
    expect(blRare).toContain('data-bucket-cat="rare"');
    expect(blRare).toContain('data-bucket-progress="5/15"');
    expect(blRare).toContain('Travel / Rare');
    expect(blRare).toContain('Watch a total solar eclipse');
    expect(blRare).not.toContain('Catch the ISS sail across the sky');
  });

  it('adds physical mechanism pills & Listen to Surprising Planet Facts and Speed/ETA/Durability + Arecibo semiprime width demo to Messages to the Stars', () => {
    const trInner = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTR: true, trMode: 'explore', trCat: 'inner' },
    });
    expect(trInner).toContain('data-tr-mech="3:2 Spin–Orbit Resonance"');
    expect(trInner).toContain('data-tr-mech="Runaway CO₂ Greenhouse"');
    expect(trInner).toContain('Read Mercury fact aloud');

    const msgWrong = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMsg: true, msgSel: 'arecibo', msgGrid: 'wrong' },
    });
    expect(msgWrong).toContain('data-msg-speed="299,792 km/s (100% c!)"');
    expect(msgWrong).toContain('data-msg-grid="wrong"');
    expect(msgWrong).toContain('Wrong width (25 cols → 67 rows + 4 leftover)');
  });

  it('adds physics takeaways & Listen to Mind-Blowing Facts, historical milestones to Famous Quotes, and Curiosity Mars portrait + optical telemetry to Pale Blue Dot', () => {
    const factVenus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFacts: true, factIdx: 0 },
    });
    expect(factVenus).toContain('data-fact-cat="Planetary Spin"');
    expect(factVenus).toContain('data-fact-takeaway=');
    expect(factVenus).toContain('Read fact 1 aloud');
    expect(factVenus).toContain('Focus Venus');

    const fqPayne = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFQ: true, fqTheme: 'discover', fqIdx: 1 },
    });
    expect(fqPayne).toContain('data-fq-who="Cecilia Payne-Gaposchkin"');
    expect(fqPayne).toContain('data-fq-milestone="1925 Harvard PhD thesis: proved stellar atmospheres are ~98% hydrogen &amp; helium"');
    expect(fqPayne).toContain('Read quote by Cecilia Payne-Gaposchkin aloud');

    const pbdMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'curiosity' },
    });
    expect(pbdMars).toContain('data-pbd-view="curiosity"');
    expect(pbdMars).toContain('data-pbd-dist="160 million km (1.07 AU)"');
    expect(pbdMars).toContain('data-pbd-delay="8m 54s light-time"');
    expect(pbdMars).toContain('data-pbd-ang="16.5 arcsec (bright evening star!)"');
    expect(pbdMars).toContain('Read Carl Sagan Pale Blue Dot reflection aloud');
  });

  it('adds live Bortle Milky Way/DSO diagnostics to Toolkit Guide and interactive target spotlight + seasonal night-length to Night Sky by Season', () => {
    const toolsB1 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 1, toolsTier: 'free' },
    });
    expect(toolsB1).toContain('data-bortle-mw="Casts faint ground shadows!"');
    expect(toolsB1).toContain('data-bortle-dso="Zodiacal light, M33 naked eye &amp; faint galaxies"');
    expect(toolsB1).toContain('data-bortle-tip=');

    const toolsB9 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 9 },
    });
    expect(toolsB9).toContain('data-bortle-mw="Invisible"');
    expect(toolsB9).toContain('data-bortle-dso="Moon, Venus, Jupiter, Saturn &amp; Pleiades core"');

    const skyWinter = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'north', ms2Season: 0, ms2Target: 2 },
    });
    expect(skyWinter).toContain('data-ms2-target="Pleiades"');
    expect(skyWinter).toContain('data-ms2-dark-hours="~15 hr night (prime stargazing!)"');
    expect(skyWinter).toContain('Target Spotlight: Pleiades (Naked Eye / Bino)');

    const skySouth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'south', ms2Season: 2, ms2Target: 0 },
    });
    expect(skySouth).toContain('data-ms2-target="Galactic Core (Zenith!)"');
    expect(skySouth).toContain('data-ms2-dark-hours="~14 hr night (Galactic Core high!)"');
  });

  it('adds terminator & workday-overlap telemetry to Time Zone Visualizer, Dec 31 final-hour zoom to Cosmic Calendar, and Measured-vs-Unknown + 2-way radio check to Drake Equation', () => {
    const tzOverlap = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 12, tzCityA: 2, tzCityB: 4 },
    });
    expect(tzOverlap).toContain('data-tz-sunrise-lon="90° W"');
    expect(tzOverlap).toContain('data-tz-sunset-lon="90° E"');
    expect(tzOverlap).toContain('data-tz-day-count=');
    expect(tzOverlap).toContain('data-tz-overlap="5 hr shared (08:00–18:00 local)"');

    const calZoomed = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCal: true, calIdx: 10, calZoom: 'dec31' },
    });
    expect(calZoomed).toContain('data-cal-zoom="dec31"');
    expect(calZoomed).toContain('data-cal-pct-elapsed="99.9978%"');
    expect(calZoomed).toContain('data-cal-human-life="0.18 sec"');
    expect(calZoomed).toContain('Final 1.58 Million Years');
    expect(calZoomed).toContain('Read cosmic calendar milestone aloud');

    const drakeOpt = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDrake: true,
        drR: 3.0,
        drFp: 1.0,
        drNe: 1.0,
        drFl: 0.8,
        drFi: 0.5,
        drFc: 0.5,
        drL: 100000,
      },
    });
    expect(drakeOpt).toContain('data-drake-astro-rate="3.00 habitable worlds/yr"');
    expect(drakeOpt).toContain('data-drake-bio-factor="20,000"');
    expect(drakeOpt).toContain('data-drake-two-way="2-way dialogue possible (L ≥ 2d/c)!"');
  });

  it('adds order-of-magnitude baseline comparator & counting time to Big Numbers and fragment-size impact / radar & graveyard-orbit rules to Space Debris Tracker', () => {
    const bnCmp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBN: true, bnSel: 'allstars', bnBase: 'mwstars' },
    });
    expect(bnCmp).toContain('data-bn-base="mwstars"');
    expect(bnCmp).toContain('data-bn-oom-diff="10^12× larger"');
    expect(bnCmp).toContain('data-bn-count-time=');
    expect(bnCmp).toContain('Read Stars in the observable universe aloud');

    const junkGeoFrag = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 35786, junkSize: 'frag' },
    });
    expect(junkGeoFrag).toContain('data-junk-size="frag"');
    expect(junkGeoFrag).toContain('data-junk-track="Tracked by Space Fence (~40,000+)"');
    expect(junkGeoFrag).toContain('GEO Graveyard Orbit (+300 km above 35,786 km)');

    const junkFleck = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 420, junkSize: 'fleck' },
    });
    expect(junkFleck).toContain('data-junk-size="fleck"');
    expect(junkFleck).toContain('data-junk-track="Untracked (~130M in orbit!)"');
    expect(junkFleck).toContain('Pits spacecraft windows / suits');
  });

  it('adds 30 M☉ Black Hole track & elements forged to Stellar Evolution, Southern Hemisphere flip & daytime visibility to Moon Phase Dial, and safety/Danjon metrics to Eclipse Theater', () => {
    const hyperBH = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'hypergiant', stellarPhase: 100 },
    });
    expect(hyperBH).toContain('data-stellar-bh="true"');
    expect(hyperBH).toContain('Hypermassive (30 M☉)');
    expect(hyperBH).toContain('data-stellar-hz="No starlight — cold black hole"');
    expect(hyperBH).toContain('Read current stellar stage aloud');

    const snRproc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'massive', stellarPhase: 88 },
    });
    expect(snRproc).toContain('data-stellar-elements="Gold, Platinum &amp; Uranium (r-process)"');

    const moonNorth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 90, moonHemi: 'north' },
    });
    const moonSouth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 90, moonHemi: 'south' },
    });
    expect(moonSouth).toContain('data-moon-hemi="south"');
    expect(moonSouth).toContain('data-moon-daytime="Visible in afternoon daylight &amp; evening!"');
    expect(moonSouth).toContain('data-moon-crater-tip="Prime crater shadows along the terminator!"');
    expect(moonNorth).toContain('A 26 26 0 0 1 334 158');
    expect(moonSouth).toContain('A 26 26 0 0 0 334 158');

    const ecAnn = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseAlign: 50, eclipseDist: 405000 },
    });
    expect(ecAnn).toContain('data-eclipse-safety="NEVER REMOVE GLASSES — Ring of Fire still causes eye damage!"');
    expect(ecAnn).toContain('data-eclipse-metric="Antumbra Ring of Fire (umbra stops short of Earth)"');
    expect(ecAnn).toContain('data-eclipse-tilt="5.1° Moon orbit tilt"');

    const ecLun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'lunar', eclipseAlign: 50 },
    });
    expect(ecLun).toContain('data-eclipse-safety="100% NAKED-EYE SAFE — no solar filter needed!"');
    expect(ecLun).toContain('Danjon L1–L2');
  });

  it('adds Aurora Australis toggle & CME transit telemetry to Aurora Tuner and gravitational time-dilation probe + EHT shadow & fall time to Black Hole Visualizer', () => {
    const aurSouth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 100, auroraLat: 45, auroraAlt: 280, auroraHemi: 'south' },
    });
    expect(aurSouth).toContain('data-aurora-hemi="south"');
    expect(aurSouth).toContain('data-aurora-speed="1000 km/s"');
    expect(aurSouth).toContain('data-aurora-transit="42 hr"');
    expect(aurSouth).toContain('Dunedin / Invercargill NZ');
    expect(aurSouth).toContain('data-aurora-eye-tip=');

    const bhProbe = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 98, bhSpin: 90, bhProbeR: 1.01 },
    });
    expect(bhProbe).toContain('data-bh-probe-r="1.01"');
    expect(bhProbe).toContain('data-bh-dilation="1 hr probe = 10.05 hr on Earth (10.05×)"');
    expect(bhProbe).toContain('data-bh-shadow=');
    expect(bhProbe).toContain('data-bh-fall-time="27.7 hr"');
  });

  it('adds Mercury Δv paradox & phase angles to Trajectory Designer, cosmic energy budget to Big Bang Stretch, and L1 magnetic shield + survival checklist to Mars Terraforming', () => {
    const trajMerc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'mercury' },
    });
    expect(trajMerc).toContain('~11.8 km/s');
    expect(trajMerc).toContain('data-traj-phase="−252° (trails Earth)"');
    expect(trajMerc).toContain('data-traj-mission="MESSENGER &amp; BepiColombo"');
    expect(trajMerc).toContain('data-traj-total-dv="21.2 km/s"');

    const bbRad = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 3 },
    });
    const bbNow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 10 },
    });
    expect(bbRad).toContain('data-bb-era="Radiation-Dominated"');
    expect(bbRad).toContain('data-bb-de-pct="0"');
    expect(bbNow).toContain('data-bb-era="Dark Energy-Dominated (Accelerating)"');
    expect(bbNow).toContain('data-bb-de-pct="68.5"');
    expect(bbNow).toContain('Read cosmic epoch aloud');

    const tfShield = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showTerraform: true, tfCO2: 100, tfIce: 85, tfTrees: 95, tfMagShield: true },
    });
    expect(tfShield).toContain('data-tf-shield="on"');
    expect(tfShield).toContain('data-tf-mag-arc="true"');
    expect(tfShield).toContain('data-tf-suit="Shirt-Sleeve Breathable Air!"');
    expect(tfShield).toContain('data-tf-rad="Low (~15 mSv/yr · shielded!)"');
    expect(tfShield).toContain('data-tf-loss="L1 Magnetic Shield blocks solar wind (~10× slower loss!)"');
  });

  it('adds whole-sky tiling & observatory optics to Hubble Deep Field and COBE/WMAP/Planck angular-resolution switcher + photon/dipole metrics to CMB', () => {
    const hdfJwst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'jwst', hdfZoom: 1 },
    });
    expect(hdfJwst).toContain('data-hdf-tiles="22.0M frames"');
    expect(hdfJwst).toContain('data-hdf-mirror="6.5 m gold hex mirror · L2 (1.5M km)"');
    expect(hdfJwst).toContain('data-hdf-optics="6 primary spikes (hex segments + 3 struts)"');

    const cmbCobe = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbMission: 'cobe', cmbContrast: 100 },
    });
    expect(cmbCobe).toContain('data-cmb-mission="cobe"');
    expect(cmbCobe).toContain('data-cmb-beam="7° (~14 Full Moons wide)"');
    expect(cmbCobe).toContain('data-cmb-photons="411 photons/cm³"');
    expect(cmbCobe).toContain('data-cmb-dipole="370 km/s toward Leo"');
    const cobeRects = (cmbCobe.match(/<rect /g) || []).length;
    expect(cobeRects).toBeLessThan(200);
  });

  it('adds V-type Vesta class & meteorite twins to Asteroid Composition, JWST spectrum & habitability score to Custom Planet Builder, and star-collision odds to Local Group Map', () => {
    const astVesta = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'vType' },
    });
    expect(astVesta).toContain('data-ast-type="vType"');
    expect(astVesta).toContain('V-type (Basaltic / Vesta)');
    expect(astVesta).toContain('data-ast-meteorite="HED Achondrites (fragments of giant 4 Vesta)"');
    expect(astVesta).toContain('data-ast-structure="Differentiated ancient volcanic lava crust"');

    const cpbEarth = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showCustomBuilder: true,
        builderPl: { core: 'iron', surface: 'water', atmo: 'oxygen', life: true },
      },
    });
    expect(cpbEarth).toContain('data-cpb-hab-score="100"');
    expect(cpbEarth).toContain('data-cpb-jwst="O₂ + O₃ + H₂O + CH₄ disequilibrium (Biosignature!)"');
    expect(cpbEarth).toContain('Read custom planet summary aloud');

    const lgMerge = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgGyr: 7 },
    });
    expect(lgMerge).toContain('data-lg-collision-odds="Virtually 0% (~1 in 10¹² per star — vast empty space!)"');
    expect(lgMerge).toContain('data-lg-dark-matter="~85% Dark Matter (~3 trillion M☉ beats local expansion)"');
    expect(lgMerge).toContain('data-lg-supercluster="Local Group → Virgo Supercluster → Laniakea (520 Mly)"');
  });

  it('adds Land/Ocean tsunami & DART deflection plan to Asteroid Impact and Eddington kappa-mechanism phase & supergiant size to Cepheid Variable Star', () => {
    const impOcean = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 370, impTarget: 'ocean' },
    });
    expect(impOcean).toContain('data-imp-target="ocean"');
    expect(impOcean).toContain('data-imp-hazard="~30–100 m basin-wide mega-tsunami!"');
    expect(impOcean).toContain('data-imp-defense="Kinetic Impactor (NASA DART-proven!) — needs 5–10+ yr notice"');

    const cepM31 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 31.4, pvT: 8.0, pvAppMag: 19.0 },
    });
    expect(cepM31).toContain('data-cepheid-phase-state="Compressed &amp; Hot (~6,600 K) — He⁺⁺ clears, heat bursts out!"');
    expect(cepM31).toContain('data-cepheid-radius="~167 R☉ supergiant"');
    expect(cepM31).toContain('data-cepheid-epoch="Left before modern humans (~2.8 Myr ago)"');
    expect(cepM31).toContain('Read Cepheid standard-candle readout aloud');
  });

  it('adds inverse-square power budget & DSN radio delay to Spacecraft Designer and Titan dense-air world + TWR/guidance to Lunar Lander', () => {
    const scRtg = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDesigner: true,
        scDest: 'pluto',
        spacecraft: { core: 'probe', power: 'rtg', prop: 'ion', payload: ['camera', 'spec'] },
      },
    });
    expect(scRtg).toContain('data-sc-power-w="420W/175W"');
    expect(scRtg).toContain('data-sc-margin-w="+245 W"');
    expect(scRtg).toContain('data-sc-radio="~5.5 hr (1-way)"');
    expect(scRtg).toContain('data-sc-science="46"');

    const scSolarPluto = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDesigner: true,
        scDest: 'pluto',
        spacecraft: { core: 'probe', power: 'solar', prop: 'ion', payload: ['camera'] },
      },
    });
    expect(scSolarPluto).toContain('data-sc-power-w="2W/140W"');
    expect(scSolarPluto).toContain('data-sc-margin-w="-138 W"');

    const landerTitan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'titan' },
    });
    expect(landerTitan).toContain('data-lander-world="titan"');
    expect(landerTitan).toContain('Titan (1.35 m/s² · Haze)');
    expect(landerTitan).toContain('data-lander-twr="6.0×"');
    expect(landerTitan).toContain('data-lander-burns="20"');
    expect(landerTitan).toContain('data-lander-guidance="Dense air drag helping slow descent!"');
  });

  it('adds local-year days & sunset-chasing speed to Day Length, Saros/local-sky to Eclipse Path Maker, and How Many Earths Fit comparator to At a Glance', () => {
    const dlVenus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDL: true, dlWorld: 'Venus' },
    });
    expect(dlVenus).toContain('data-dl-days-yr="1.92 solar days/yr"');
    expect(dlVenus).toContain('data-dl-chase="Brisk walk (6.5 km/h — walk with sunset!)"');
    expect(dlVenus).toContain('Read Venus rotation facts aloud');

    const ep2027 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2027', ePathLat: 26, ePathLon: 33 },
    });
    expect(ep2027).toContain('data-epath-saros="Saros 136"');
    expect(ep2027).toContain('data-epath-width="258 km"');
    expect(ep2027).toContain('data-epath-sky="360° sunset glow · Venus &amp; Jupiter appear · Temp drops 5–8°C!"');

    const sagJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagCompare: 'jupiter' },
    });
    expect(sagJup).toContain('data-sag-compare="jupiter"');
    expect(sagJup).toContain('data-sag-earths-mass="317.8 Earths"');
    expect(sagJup).toContain('data-sag-earths-vol="1,321 Earths"');
    expect(sagJup).toContain('Read Solar System scale summary aloud');
  });

  it('adds mission/Trojan notes to Lagrange Points Lab, live PDCO Δv alert to Asteroid Defender, and Hubble class + dark-matter halo to Galaxy Spiral Map', () => {
    const lgL4 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLagrange: true, lagrangeSystem: 'sun-earth', lagrangePoint: 'L4' },
    });
    expect(lgL4).toContain('data-lg-point-missions="Natural visitors: Earth Trojan asteroids 2010 TK₇ &amp; 2020 XL₅ co-orbit 60° ahead (~8.3 min light delay)."');

    const lgEM = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLagrange: true, lagrangeSystem: 'earth-moon', lagrangePoint: 'L2' },
    });
    expect(lgEM).toContain('Queqiao &amp; Queqiao-2 relay satellites');

    const defUrgent = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDefender: true,
        defAsteroids: [{ id: 1, x: 95, y: 130, vx: -0.6, vy: 0, r: 6, alive: true }],
      },
    });
    expect(defUrgent).toContain('data-def-alert="RED ALERT — Urgent Deflection!"');
    expect(defUrgent).toContain('data-def-lead-yr="0.5 yr"');
    expect(defUrgent).toContain('data-def-dv-cms="40.4 cm/s"');

    const galBar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGalaxy: true, galType: 'barred' },
    });
    expect(galBar).toContain('data-gal-hubble="SBbc Barred Spiral (Milky Way)"');
    expect(galBar).toContain('data-gal-orbit="~230 km/s (225 Myr orbit)"');
    expect(galBar).toContain('data-gal-dm="~85% Dark Matter Halo"');
    expect(galBar).toContain('Read galaxy morphology summary aloud');
  });

  it('adds AU/parsec + 0.2c Starshot + 2-way radio wait to Light-Year Walker and ice-crust depth + life-search strategy to Habitable Moons', () => {
    const lyProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 5 },
    });
    expect(lyProx).toContain('data-ly-au="268,142 AU"');
    expect(lyProx).toContain('data-ly-pc="1.30 pc"');
    expect(lyProx).toContain('data-ly-starshot="21.2 yr"');
    expect(lyProx).toContain('data-ly-roundtrip="8.5 yr"');
    expect(lyProx).toContain('Read light-year destination summary aloud');

    const habEnc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'enceladus' },
    });
    expect(habEnc).toContain('data-hab-ice-depth="~5 km at South Pole vents!"');
    expect(habEnc).toContain('data-hab-water-ratio="~0.01× Earth (easy plumes)"');
    expect(habEnc).toContain('data-hab-detect="Fly straight through geyser plumes — no drilling!"');
    expect(habEnc).toContain('Read habitable moon profile aloud');
  });

  it('adds Dawes/eye-gain seeing benchmarks to Telescope Aperture Lab, band shift & relativistic offset to Doppler Shift Lab, and photon eV/line identity to Spectroscopy Lab', () => {
    const scopeHubble = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showScope: true, scopeAp: 240, scopeMag: 200, scopeSeparation: 0.1 },
    });
    expect(scopeHubble).toContain('data-ts-dawes="0.048″"');
    expect(scopeHubble).toContain('data-ts-eye-gain="117,551× eye area"');
    expect(scopeHubble).toContain('Hubble-class 2.4 m space telescope');
    expect(scopeHubble).toContain('Seeing-limited on Earth');
    expect(scopeHubble).toContain('Read optical bench summary aloud');

    const dpFast = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDoppler: true, dopplerRestNm: 650, dopplerVel: 50000 },
    });
    expect(dpFast).toContain('data-dp-band="Red (650 nm) → Near-Infrared (NIR) (769.2 nm)"');
    expect(dpFast).toContain('data-dp-rel-diff="10.773 nm"');
    expect(dpFast).toContain('Relativistic recession speed');
    expect(dpFast).toContain('Read Doppler shift summary aloud');

    const spHa = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpectro: true, spectroElem: 'hydrogen', spectroLineIndex: 3 },
    });
    expect(spHa).toContain('data-sp-energy-ev="1.89 eV"');
    expect(spHa).toContain('data-sp-line-name="H-α (Balmer n=3→2 — glowing pink star-forming nebulae)"');
    expect(spHa).toContain('Orion Nebula (M42)');
    expect(spHa).toContain('Read spectral line summary aloud');
  });

  it('adds subsolar point, twilight stage, and spin speed to Day/Night Globe and orbital epoch + Roche margin to Tidal Forces Visualizer', () => {
    const dnEq = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGlobe: true, dayNightSeason: 90, dayNightLatitude: 0, dayNightRot: 90 },
    });
    expect(dnEq).toContain('data-dn-subsolar="23.4° N (Tropic of Cancer)"');
    expect(dnEq).toContain('data-dn-spin-speed="1,670 km/h eastward"');
    expect(dnEq).toContain('data-dn-twilight="Golden Hour / Low Sun (0° to 10°)"');
    expect(dnEq).toContain('Read day and night observer summary aloud');

    const tidesEarly = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTides: true, tideDist: 30, tideAng: 0 },
    });
    expect(tidesEarly).toContain('data-tides-epoch="Early Earth (~3.8 Gyr ago, ~191,130 km) — mega-tides &amp; faster ~10–14 h Earth spin"');
    expect(tidesEarly).toContain('data-tides-roche="10.4× fluid Roche limit (intact; breakup &lt; 2.89 R⊕)"');
    expect(tidesEarly).toContain('0.06× this lunar tide');
    expect(tidesEarly).toContain('Read tidal forces summary aloud');
  });

  it('adds real-world albedo & Wien thermal peak to Planetary Albedo Lab, vis-viva km/s & flux swing to Comet Orbit Drawer, and sublimation/meteor context to Comet Tail Builder', () => {
    const abDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAlbedo: true, albIce: 30, albCloud: 60, albDistanceAU: 1 },
    });
    expect(abDef).toContain('data-ab-analog="Cloudy / icy world (near Jupiter 0.50)"');
    expect(abDef).toContain('data-ab-wien-um="11.8 µm (thermal infrared)"');
    expect(abDef).toContain('-10.0 K vs. Earth’s 255 K radiative equilibrium');
    expect(abDef).toContain('Read planetary albedo summary aloud');

    const cobPeri = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCOrb: true, cobEcc: 0.85, cobAxisAU: 3, cobMeanAnomaly: 0 },
    });
    expect(cobPeri).toContain('data-corb-speed-kms="60.4 km/s"');
    expect(cobPeri).toContain('data-corb-swing="12.3× faster at perihelion than aphelion"');
    expect(cobPeri).toContain('data-corb-flux-swing="152× brighter sunlight at perihelion"');
    expect(cobPeri).toContain('compare Encke e = 0.85');
    expect(cobPeri).toContain('Read comet orbit summary aloud');

    const ct1AU = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showComet: true, cometDist: 20, cometAngle: 90 },
    });
    expect(ct1AU).toContain('data-comet-volatile="Inner Solar System (≤ 1 AU) — strong water-ice outgassing &amp; bright CO⁺ blue ion glow"');
    expect(ct1AU).toContain('data-comet-temp-k="278 K (~5 °C)"');
    expect(ct1AU).toContain('Perseids from 109P/Swift–Tuttle');
    expect(ct1AU).toContain('Read comet tail summary aloud');
  });

  it('adds km/s speed & synodic launch cycle to Orbital Speed Race and spin-orbit resonance + dark-side myth check to Tidal Locking Lab', () => {
    const raceMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showRace: true, raceFocus: 'Mars', raceTime: 1 },
    });
    expect(raceMars).toContain('data-race-speed-kms="24.1 km/s"');
    expect(raceMars).toContain('data-race-synodic="2.13 yr (~780 days) between Earth–Mars launch alignments"');
    expect(raceMars).toContain('data-race-travel-au="5.09 AU traveled"');
    expect(raceMars).toContain('Read orbital race summary aloud');

    const tlHalf = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTLock: true, tlOrbitAngle: 180 },
    });
    expect(tlHalf).toContain('data-tidal-checkpoint="At 180°: synchronous moon spun 180° (0° Earth offset); non-rotating moon spun 0° (180° offset)."');
    expect(tlHalf).toContain('Far side ≠ dark side');
    expect(tlHalf).toContain('3:2 resonance: Mercury');
    expect(tlHalf).toContain('Read tidal locking summary aloud');
  });

  it('adds altitude landmarks & scale height to Atmospheric Layers, OBAFGKM class & HZ scale to Star Color + Temperature, and all-planets gap + laser bounce to Earth-Moon True Scale', () => {
    const atm10 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAtmos: true, atmAlt: 10 },
    });
    expect(atm10).toContain('data-am-landmark="Commercial airliners cruise (~10–12 km) near the tropopause"');
    expect(atm10).toContain('data-am-air-below="73.85% of air mass below"');
    expect(atm10).toContain('data-am-scale-height="6.53 km (1/e pressure drop)"');
    expect(atm10).toContain('Read atmospheric layer summary aloud');

    const starB = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStarWheel: true, starTemp: 10000, starRadiusSolar: 2 },
    });
    expect(starB).toContain('data-st-class="Class B (Blue-white hot — compare Rigel / Spica)"');
    expect(starB).toContain('data-st-peak-ev="4.28 eV peak photon (ultraviolet)"');
    expect(starB).toContain('data-st-hz-au="6.00 AU (Earth-equivalent insolation √L)"');
    expect(starB).toContain('Read stellar spectrum summary aloud');

    const emsApogee = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEMS: true, emDistanceKm: 405500 },
    });
    expect(emsApogee).toContain('data-ems-planets-fit="YES! All 7 other planets (380,010 km combined) fit inside this 397,392 km gap with 17,382 km to spare!"');
    expect(emsApogee).toContain('data-ems-laser-rt="2.651 s round-trip Apollo laser bounce (+3.8 cm/yr lunar drift)"');
    expect(emsApogee).toContain('Read Earth-Moon scale summary aloud');
  });

  it('adds shadow ratio, beam flux & panel tilt to Sun Path Across Latitudes and Galileo 1610 proof & size ratio to Phases of Venus', () => {
    const spNoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSunPath: true, sunLat: 45, sunDoy: 172, sunHour: 12 },
    });
    expect(spNoon).toContain('data-sunpath-shadow="0.39× object height (1 m pole casts a 0.39 m shadow)"');
    expect(spNoon).toContain('93% of overhead beam per m²');
    expect(spNoon).toContain('Year-round fixed tilt ≈ 45.0° facing south');
    expect(spNoon).toContain('Read sun path summary aloud');

    const vpCres = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPhasesV: true, phVAng: 165 },
    });
    expect(vpCres).toContain('data-venus-size-ratio="4.85× wider than Full phase (full range 9.9″ → 60.4″ = 6.1×)"');
    expect(vpCres).toContain('data-venus-sky-side="Elongation 31.8° from Sun (max 46.3° — visible near dawn or dusk, never at midnight)"');
    expect(vpCres).toContain('Why this disproved Ptolemy (1610)');
    expect(vpCres).toContain('Read Venus phases summary aloud');
  });

  it('adds Cassini ring science to Saturn Ring Explorer, noon/gnomon/EoT context to Sundial Lab, and interpulse benchmarks to Pulsar Beam Explorer', () => {
    const rgDiv = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showRings: true, ringOpening: 60, ringBand: 'division' },
    });
    expect(rgDiv).toContain('data-rg-earth-view="Spacecraft-only view (60° exceeds Saturn’s 26.7° tilt — only high-orbit probes like Cassini see this!)"');
    expect(rgDiv).toContain('data-rg-earth-scale="21.5 Earths wide (273,560 km), yet only ~10–30 m thick!"');
    expect(rgDiv).toContain('data-rg-region-science="4,833 km wide gap sculpted by a 2:1 orbital resonance with moon Mimas (wide enough to fit Earth’s Moon!)."');
    expect(rgDiv).toContain('Read Saturn ring summary aloud');

    const sdEq = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSundial: true, sdLatitude: 45, sdDeclination: 0, sdHour: 9, sdHeight: 1 },
    });
    expect(sdEq).toContain('data-sd-noon-ref="Shortest shadow today (12:00 noon): 1.00 m at 45.0° altitude (1.00× post height)."');
    expect(sdEq).toContain('data-sd-gnomon-angle="Year-round horizontal sundial gnomon angle: 45° tilted toward the North Celestial Pole."');
    expect(sdEq).toContain('Equation of Time');
    expect(sdEq).toContain('Read sundial shadow summary aloud');

    const psInter = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPulsar: true, pulsarTilt: 90, pulsarView: 90, pulsarCone: 10, pulsarSpin: 0 },
    });
    expect(psInter).toContain('data-ps-pattern="Double-pole interpulse! Both magnetic poles sweep past Earth each rotation (180° apart, like the Crab Pulsar!)."');
    expect(psInter).toContain('716 spins/s');
    expect(psInter).toContain('Read pulsar beam summary aloud');
  });

  it('adds chord scale & exoplanet photometry to Mercury Transit Lab and 1851 Panthéon proof + half-turn cycle to Foucault Pendulum', () => {
    const mtOff = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTrans: true, transImpact: 0.5, transPhase: 50 },
    });
    expect(mtOff).toContain('data-mt-chord="87% of central chord length (b = 0.50 R☉ · full transit)"');
    expect(mtOff).toContain('Nov 13, 2032');
    expect(mtOff).toContain('Earth across the Sun blocks ~84 ppm');
    expect(mtOff).toContain('Read Mercury transit summary aloud');

    const fc45 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFouc: true, foucLat: 45, foucTime: 12 },
    });
    expect(fc45).toContain('data-fc-half-period="Visually repeats (180°): 16.92 h · Full 360° turn: 33.85 h (0.35 turns in 12.0 h)"');
    expect(fc45).toContain('1851 Paris Panthéon proof');
    expect(fc45).toContain('Coriolis deflection');
    expect(fc45).toContain('Read Foucault pendulum summary aloud');
  });

  it('adds L1 warning lead & Earth motion to CME Lab, circular speed & bulk density to Gravity Well Lab, and 6.6 R geostationary check to Magnetosphere Lab', () => {
    const cmeFast = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCME: true, cmeSpeedKmS: 1000, cmeElapsedHours: 36, cmeDirectionDeg: 0, cmeHalfWidthDeg: 30 },
    });
    expect(cmeFast).toContain('data-cp-l1-lead="~25 min upstream notice from Sun–Earth L1 monitors (SOHO / DSCOVR at 1.5 million km)"');
    expect(cmeFast).toContain('data-cp-earth-travel="+1.54° (~4.0 million km along Earth’s orbit during crossing)"');
    expect(cmeFast).toContain('1859 Carrington Event');
    expect(cmeFast).toContain('Read CME propagation summary aloud');

    const gwEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGrav: true, gravWellMass: 1, gravWellRadius: 1, gravWellDistance: 1 },
    });
    expect(gwEarth).toContain('data-gw-orbit-speed="7.91 km/s circular speed (escape speed is always √2 ≈ 1.414× circular speed)"');
    expect(gwEarth).toContain('data-gw-density="5.51 g/cm³ (compare Earth 5.51, Mars 3.93, Moon 3.34, water 1.00 g/cm³)"');
    expect(gwEarth).toContain('1.00× Earth surface pull');
    expect(gwEarth).toContain('Read gravity well summary aloud');

    const mgComp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMag: true, magStr: 10, magSolar: 100 },
    });
    expect(mgComp).toContain('Inside 6.6 R!');
    expect(mgComp).toContain('Sixth-root stiffness');
    expect(mgComp).toContain('Read magnetosphere pressure summary aloud');
  });

  it('adds Spörer’s law & differential spin to Solar Cycle Explorer and Parker spiral angle + proton keV to Solar Wind Lab', () => {
    const cyPeak = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSunCycle: true, sunCycleYear: 5.5, sunCycleLongitude: 0 },
    });
    expect(cyPeak).toContain('data-cy-sporer="Spörer’s Law: emergence zones migrate from ±30° toward ±5° — currently at ±17.5° (50% through the 11-year cycle)."');
    expect(cyPeak).toContain('Solar sidereal rotation at ±17.5°: ~24.9 days');
    expect(cyPeak).toContain('Hale’s 22-year magnetic cycle');
    expect(cyPeak).toContain('Read solar cycle summary aloud');

    const swFast = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSWind: true, swSpeed: 800, swDens: 5 },
    });
    expect(swFast).toContain('data-sw-parker="~28.2° from radial at 1 AU (ideal Parker garden-hose magnetic spiral)"');
    expect(swFast).toContain('data-sw-proton-kev="3.34 keV per bulk proton (½ mₚ v²)"');
    expect(swFast).toContain('Parker Solar Probe');
    expect(swFast).toContain('Read solar wind summary aloud');
  });

  it('adds orbital cadence & beta margin to ISS Orbit Lab, ½v² energy & rocket scaling to Escape Comparison, and hemisphere contrast + myth check to Seasons Lab', () => {
    const issLow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showISS: true, issAltitudeKm: 400, issBetaDeg: 0, issOrbit: 0 },
    });
    expect(issLow).toContain('data-io-orbits-day="15.58"');
    expect(issLow).toContain('data-io-sunlight-pct="61.0%"');
    expect(issLow).toContain('data-io-beta-margin="-70.2° below β_crit (70.2°)"');
    expect(issLow).toContain('Read ISS orbit and sunlight summary aloud');

    const issSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showISS: true, issAltitudeKm: 400, issBetaDeg: 75, issOrbit: 180 },
    });
    expect(issSun).toContain('data-io-sunlight-pct="100.0%"');
    expect(issSun).toContain('Continuous sun (+4.8° above 70.2°)');

    const escJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', showEscape: true },
    });
    expect(escJup).toContain('data-escape-energy="1770.1 MJ/kg"');
    expect(escJup).toContain('data-escape-circ="42.07 km/s"');
    expect(escJup).toContain('data-escape-rel-energy="28.22× Earth"');
    expect(escJup).toContain('Read escape velocity summary aloud');

    const seaEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSeasonsLab: true, seasonsWorld: 'Earth', seasonsPhase: 25 },
    });
    expect(seaEarth).toContain('data-seasons-day-diff="6.9 h"');
    expect(seaEarth).toContain('data-seasons-noon-diff="46.9°"');
    expect(seaEarth).toContain('data-seasons-polar-circle="66.6°"');
    expect(seaEarth).toContain('Distance myth check: Earth reaches perihelion');
    expect(seaEarth).toContain('Read seasons geometry summary aloud');

    const seaUranus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Uranus', showSeasonsLab: true, seasonsWorld: 'Uranus', seasonsPhase: 25 },
    });
    expect(seaUranus).toContain('data-seasons-polar-circle="7.8°"');
  });

  it('adds 1/r² radio attenuation & DSN autonomy context to Signal Delay Lab and synodic/sidereal, sky-window & Saros context to Moon Lab without leaking eclipse outcome', () => {
    const sigMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showSignalLab: true, signalTarget: 'Mars', signalAngle: 90 },
    });
    expect(sigMars).toContain('data-signal-power-drop="3.32× weaker"');
    expect(sigMars).toContain('data-signal-light-au="1.823 AU · 15.2 min"');
    expect(sigMars).toContain('data-signal-autonomy="Onboard autonomy required"');
    expect(sigMars).toContain('Deep Space Network');
    expect(sigMars).toContain('Read signal delay summary aloud');

    const moonHidden = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonLab: true, moonPhaseAngle: 180, moonNodeOffset: 0 },
    });
    expect(moonHidden).toContain('data-moon-month-gap="29.53 d vs 27.32 d (+2.21 d)"');
    expect(moonHidden).toContain('data-moon-sky-window="All night (rises ~sunset, sets ~sunrise)"');
    expect(moonHidden).toContain('data-moon-saros="~173.3 d seasons · 18 yr 11 d Saros"');
    expect(moonHidden).toContain('Read lunar cycle and sky-window summary aloud');
    expect(moonHidden).toContain('data-moon-alignment-result="hidden"');
    expect(moonHidden).not.toContain('Lunar-eclipse alignment');
  });

  it('adds Dijkstra efficiency & AutoNav context to Rover Pathfinder, Hill sphere & light delay to Lagrange Lab, and transfer ellipse + phase lead to Hohmann Preview', () => {
    const rpStart = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showRover: true },
    });
    expect(rpStart).toContain('data-rp-efficiency="Optimal (11 vs 11 min)"');
    expect(rpStart).toContain('data-rp-manhattan="9 steps min · 9 guide steps"');
    expect(rpStart).toContain('data-rp-tile-context="A6 · Open ground"');
    expect(rpStart).toContain('AutoNav');
    expect(rpStart).toContain('Read Mars rover pathfinder summary aloud');

    const lgSE = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLagrange: true, lagrangeSystem: 'sun-earth', lagrangePoint: 'L2' },
    });
    expect(lgSE).toContain('data-lg-hill-radius="≈ 1,496,557 km (1.00% sep)"');
    expect(lgSE).toContain('data-lg-light-delay="5.01 s one-way from Earth"');
    expect(lgSE).toContain('data-lg-station-keeping="Unstable saddle · ~few m/s/yr halo station-keeping"');
    expect(lgSE).toContain('Read Lagrange point summary aloud');

    const lgL4 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLagrange: true, lagrangeSystem: 'custom', lagrangeMass: 0.03, lagrangePoint: 'L4' },
    });
    expect(lgL4).toContain('Coriolis-stabilized tadpole');

    const hmMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showHohmann: true },
    });
    expect(hmMars).toContain('data-mission-transfer-a="a = 1.262 AU · e = 0.208"');
    expect(hmMars).toContain('data-mission-phase-angle="+44.4° ahead of Earth"');
    expect(hmMars).toContain('data-mission-synodic-days="780 d (259 d ideal coast)"');
    expect(hmMars).toContain('Read Hohmann mission preview summary aloud');

    const hmVenus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Venus', showHohmann: true },
    });
    expect(hmVenus).toContain('data-mission-phase-angle="54.1° behind Earth"');
  });

  it('adds r³ volume, 1/a² sunlight, escape & g/R density contrasts to Planet Comparison and scale ratio, light crawl & Proxima Centauri distance to Scale Walk', () => {
    const cmpEJ = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVisualCompare: true, compare1: 'Earth', compare2: 'Jupiter' },
    });
    expect(cmpEJ).toContain('data-compare-volume-ratio="1,321× (Jupiter / Earth)"');
    expect(cmpEJ).toContain('data-compare-sunlight="27.1× brighter at Earth"');
    expect(cmpEJ).toContain('data-compare-escape="11.2 vs 59.5 km/s"');
    expect(cmpEJ).toContain('data-compare-density="5.51 vs 1.27 g/cm³ (g/R)"');
    expect(cmpEJ).toContain('Read planet comparison physics summary aloud');

    const cmpUN = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Uranus', showVisualCompare: true, compare1: 'Uranus', compare2: 'Neptune' },
    });
    expect(cmpUN).toContain('data-compare-density="1.23 vs 1.63 g/cm³ (g/R)"');

    const sw100 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showScaleWalk: true, scaleWalkLength: 100, scaleWalkStop: 'Earth' },
    });
    expect(sw100).toContain('data-scale-walk-ratio="1 : 44.98 billion"');
    expect(sw100).toContain('data-scale-walk-light-speed="6.66 mm/s"');
    expect(sw100).toContain('data-scale-walk-proxima="893 km"');
    expect(sw100).toContain('data-scale-walk-object="Earth (0.283 mm) ≈ finer than a grain of sand"');
    expect(sw100).toContain('Read scale walk perspective summary aloud');

    const sw1000 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showScaleWalk: true, scaleWalkLength: 1000, scaleWalkStop: 'Sun' },
    });
    expect(sw1000).toContain('data-scale-walk-ratio="1 : 4.50 billion"');
    expect(sw1000).toContain('data-scale-walk-light-speed="66.64 mm/s"');
    expect(sw1000).toContain('data-scale-walk-proxima="8,931 km"');
  });

  it('adds UDL audio & progress bar to Quiz, orbital energy & b/c geometry to Kepler Inquiry, and hidden-safe mgh/impact speed to Gravity Drop Lab', () => {
    const qz = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth' },
    });
    expect(qz).toContain('data-quiz-remaining="15 unseen in round · 0% explored"');
    expect(qz).toContain('Read current quiz question aloud');

    const ki = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 8, keplerInquiry: { a: 2, e: 0.6, mass: 1 } },
    });
    expect(ki).toContain('data-kepler-energy="-0.500× Earth"');
    expect(ki).toContain('data-kepler-geometry="b = 1.600 AU · c = 1.200 AU"');
    expect(ki).toContain('data-kepler-harmonic="a³/(M·T²) = 1.000 · Asteroid / exoplanet orbit"');
    expect(ki).toContain('Read Kepler inquiry orbit summary aloud');

    const gdPre = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showGravityLab: true, gravMass: 70, gravHeight: 10 },
    });
    expect(gdPre).toContain('data-gravity-spec-energy="98.1 vs 37.3 J/kg"');
    expect(gdPre).toContain('data-gravity-total-energy="6,865 vs 2,609 J"');
    expect(gdPre).toContain('data-gravity-impact-speed="Hidden until drop runs"');
    expect(gdPre).toContain('Apollo 15 proof (1971)');
    expect(gdPre).toContain('Read gravity drop physics summary aloud');

    const gdPost = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Mars', showGravityLab: true, gravMass: 70, gravHeight: 10,
        gravityPrediction: { target: 'Mars', choice: 'earth' }, gravityDropNonce: 1,
      },
    });
    expect(gdPost).toContain('data-gravity-impact-speed="14.00 vs 8.63 m/s"');
  });

  it('adds core volume share & geophysical evidence to Interior Cutaway and scale height & probe milestones to Atmospheric Descent', () => {
    const intMerc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mercury', viewTab: 'interior' },
    });
    expect(intMerc).toContain('data-interior-core-frac="76% radius (44% volume · ~1,854 km)"');
    expect(intMerc).toContain('data-interior-pressure="~40 GPa · ~1,800 °C"');
    expect(intMerc).toContain('MESSENGER gravity');
    expect(intMerc).toContain('Read planetary interior summary aloud');

    const intPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Pluto', viewTab: 'interior' },
    });
    expect(intPluto).toContain('data-interior-core-frac="72% radius (37% volume · ~850 km)"');

    const descVenus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Venus', viewTab: 'descent' },
    });
    expect(descVenus).toContain('data-descent-scale-height="15.9 km (CO₂ 96.5%)"');
    expect(descVenus).toContain('data-descent-surface-ratio="90–92× Earth surface pressure"');
    expect(descVenus).toContain('Venera 13 survived 127 min');
    expect(descVenus).toContain('Read atmospheric descent summary aloud');

    const descJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', viewTab: 'descent' },
    });
    expect(descJup).toContain('data-descent-scale-height="27.0 km (H₂ 89%, He 10%)"');
    expect(descJup).toContain('Galileo Probe descended 156 km');
  });

  it('adds flattening & flux swing to Kepler I, areal sweep & KE swing to Kepler II, and speed drop-off + stellar mass scaling to Kepler III', () => {
    const k1Halley = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 1, orr_k1e: 0.967 },
    });
    expect(k1Halley).toContain('data-k1-flattening="74.52%"');
    expect(k1Halley).toContain('data-k1-flux-swing="3,553× brighter at perihelion"');
    expect(k1Halley).toContain('data-k1-focal-span="2c = 1.934a · Cometary bound ellipse (e &lt; 1)"');
    expect(k1Halley).toContain('Read Kepler I ellipse summary aloud');

    const k2 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 2, orr_k2e: 0.5, orr_k2s: 6 },
    });
    expect(k2).toContain('data-k2-areal-rate="2.721 a²/T (16.7% per interval)"');
    expect(k2).toContain('data-k2-speed-ke-ratio="3.00× speed · 9.00× kinetic energy"');
    expect(k2).toContain('Read Kepler II equal-areas summary aloud');

    const k3Jup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 3, orr_k3hover: 'jupiter' },
    });
    expect(k3Jup).toContain('data-k3-mean-speed="13.06 km/s (0.44× Earth)"');
    expect(k3Jup).toContain('data-k3-log-slope="Slope = 3/2 (1.500) · 10× distance → 31.6× longer year"');
    expect(k3Jup).toContain('51 Pegasi b');
    expect(k3Jup).toContain('Read Kepler III harmonic law summary aloud');
  });

  it('adds escape margin & orbit-averaged flux to Orbit Workshop and Oberth burn split + real mission benchmarks to Hohmann Transfers', () => {
    const ws = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 4, orr_wsb: 'earth', orr_wsa: 1, orr_wse: 0.3 },
    });
    expect(ws).toContain('data-ws-escape-margin="9.76 km/s below escape (80.6% of v_esc)"');
    expect(ws).toContain('data-ws-flux-swing="3.45× brighter at perihelion"');
    expect(ws).toContain('data-ws-mean-flux="1.05× Earth (1,427 W/m²)"');
    expect(ws).toContain('Read Orbit Workshop physics summary aloud');

    const trMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 5, orr_trf: 'earth', orr_trt: 'mars' },
    });
    expect(trMars).toContain('data-transfer-eccentricity="e = 0.208 · Outward ellipse"');
    expect(trMars).toContain('data-transfer-burn-split="52.6% depart · 47.4% arrive"');
    expect(trMars).toContain('Perseverance flew a ~203 d fast transfer');
    expect(trMars).toContain('Read Hohmann transfer summary aloud');

    const trSame = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 5, orr_trf: 'earth', orr_trt: 'earth' },
    });
    expect(trSame).toContain('data-transfer-eccentricity="e = 0.000 (same circular orbit)"');
    expect(trSame).toContain('data-transfer-burn-split="0.0% / 0.0% (no burn)"');
  });

  it('adds UDL briefing bar to Mission Dashboard and orbital span & live telemetry card to Full Orrery tab', () => {
    const dash = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: true, selectedPlanet: 'Earth' },
    });
    expect(dash).toContain('data-dashboard-progress-pct="0% complete (0/6 journeys · 0 journal records)"');
    expect(dash).toContain('Read mission dashboard briefing aloud');

    const orr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 0, orr_sel: 'earth', orr_time: 0 },
    });
    expect(orr).toContain('data-orrery-span="0.387 AU (Mercury) → 39.48 AU (Pluto) · 102× radius"');
    expect(orr).toContain('data-orrery-period-ratio="0.241 yr → 247.9 yr · 1,029× slower year"');
    expect(orr).toContain('data-orrery-focus-telemetry="Earth:');
    expect(orr).toContain('Read full orrery overview aloud');
  });

  it('adds UDL audio readback to Orrery Challenges, hidden-safe True/False Misconceptions, and Field Journal entries', () => {
    const ch = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 6 },
    });
    expect(ch).toContain('data-challenge-precision="±0.15 yr · 0/10 solved"');
    expect(ch).toContain('data-challenge-audio="true"');
    expect(ch).toContain('Read calculation problem aloud');

    const tfPre = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 7 },
    });
    expect(tfPre).toContain('data-tf-audio-state="prompt-only"');
    expect(tfPre).toContain('Read orbital intuition statement aloud');

    const tfPost = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 7, orr_tfa: { 0: false } },
    });
    expect(tfPost).toContain('data-tf-audio-state="with-explanation"');

    const jrn = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Mars', showJournal: true,
        journalEntries: [{ planet: 'Mars', observation: 'Mars has 0.38g surface gravity.', timestamp: Date.UTC(2026, 10, 24) }],
      },
    });
    expect(jrn).toContain('data-journal-entry-audio="0"');
    expect(jrn).toContain('Read Mars journal entry aloud');
  });

  it('adds apparent solar magnitude & Full Moon brightness ratio to Night Sky and Jeans thermal retention + radiative/greenhouse delta to Planet Builder', () => {
    const skyPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Pluto', showSky: true },
    });
    expect(skyPluto).toContain('data-sky-sun-mag="m = −18.76"');
    expect(skyPluto).toContain('data-sky-fullmoon-x="255× Earth Full Moon"');
    expect(skyPluto).toContain('Read night sky from Pluto summary aloud');

    const skyEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSky: true },
    });
    expect(skyEarth).toContain('data-sky-sun-mag="m = −26.74"');
    expect(skyEarth).toContain('data-sky-fullmoon-x="398,107× Earth Full Moon"');

    const pbEarth = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth', showBuilder: true,
        buildMass: 1, buildDist: 1, buildAtmo: true, buildWater: true, buildMag: true,
      },
    });
    expect(pbEarth).toContain('data-builder-greenhouse="Bare rock -18°C + 33°C greenhouse → 15°C"');
    expect(pbEarth).toContain('data-builder-retention="Retains H₂O/N₂/CO₂ (loses H₂/He)"');
    expect(pbEarth).toContain('Read custom planet summary aloud');

    const pbMars = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth', showBuilder: true,
        buildMass: 0.1, buildDist: 1.5, buildAtmo: false, buildWater: false, buildMag: false,
      },
    });
    expect(pbMars).toContain('data-builder-greenhouse="Bare rock -65°C (no greenhouse warming)"');
    expect(pbMars).toContain('data-builder-retention="Heavy gases only (CO₂/N₂; loses H₂O/H₂)"');

    const pbIce = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth', showBuilder: true,
        buildMass: 15, buildDist: 20, buildAtmo: true, buildWater: false, buildMag: true,
      },
    });
    expect(pbIce).toContain('data-builder-retention="Retains primordial H₂/He envelope"');
  });

  it('adds interstellar Voyager-1 scale & discovery method spotlight to Exoplanet Comparison, magnetopause standoff/aurora telemetry to Magnetosphere card, and era span/crewed-robotic summary to Space Exploration Timeline', () => {
    const exoDefault = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExo: true },
    });
    expect(exoDefault).toContain('data-exo-spotlight="Proxima Centauri b"');
    expect(exoDefault).toContain('data-exo-light-time="4.24 yr one-way"');
    expect(exoDefault).toContain('data-exo-voyager-time="~74,800 yr"');
    expect(exoDefault).toContain('data-exo-method="Radial Velocity"');
    expect(exoDefault).toContain('Read exoplanet comparison summary aloud');

    const exoKepler = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExo: true, exoSel: 'Kepler-452b' },
    });
    expect(exoKepler).toContain('data-exo-spotlight="Kepler-452b"');
    expect(exoKepler).toContain('data-exo-light-time="1,400 yr one-way"');
    expect(exoKepler).toContain('data-exo-voyager-time="~24.69M yr"');
    expect(exoKepler).toContain('data-exo-method="Transit"');

    const magJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter' },
    });
    expect(magJup).toContain('data-mag-standoff="~50–100 R_J (largest Solar System structure)"');
    expect(magJup).toContain('data-mag-aurora="Permanent UV/X-ray ovals + Io flux tube"');
    expect(magJup).toContain('Read Jupiter magnetosphere summary aloud');

    const magEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth' },
    });
    expect(magEarth).toContain('data-mag-standoff="~10–11 R_E (~65,000 km)"');
    expect(magEarth).toContain('data-mag-aurora="Green/red O &amp; N₂ polar ovals"');

    const tlAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTimeline: true, timelineEra: 'all' },
    });
    expect(tlAll).toContain('data-tl-span="1957–2024 (67 yr) · 20 milestones (2 crewed, 18 robotic)"');
    expect(tlAll).toContain('Read space exploration timeline era aloud');

    const tlModern = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTimeline: true, timelineEra: 'modern' },
    });
    expect(tlModern).toContain('data-tl-span="2021–2024 (3 yr) · 3 milestones (0 crewed, 3 robotic)"');
  });

  it('adds hidden-safe statement audio to Misconception Checkpoint, checklist audio + pct to Learning Paths, and cross-assignment overall progress + audio to Assignments', () => {
    const chk = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth' },
    });
    expect(chk).toContain('data-checkpoint-audio="statement"');
    expect(chk).toContain('aria-label="Read misconception statement aloud"');
    expect(chk).toContain('data-checkpoint-pct="0%"');

    const lp = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        learningPath: 'tour_guide',
        learningPathChecks: { tour_guide: [true, true, false, false, false] },
      },
    });
    expect(lp).toContain('data-path-pct="40%"');
    expect(lp).toContain('data-path-audio="tour_guide"');
    expect(lp).toContain('aria-label="Read Tour Guide checklist aloud"');

    const asn = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showAssignments: true, activeAssignment: 'inner_planets',
        asn_done_inner_planets: [0, 2], asn_done_full_survey: [4],
      },
    });
    expect(asn).toContain('data-assignment-overall="3 of 17 tasks checked across 4 assignments"');
    expect(asn).toContain('data-assignment-audio="inner_planets"');
    expect(asn).toContain('aria-label="Read Inner Planets Study checklist aloud"');
  });

  it('adds RP reward pool breakdown + briefing audio to Research Challenge Board and world coverage + log audio to Mission Log Workspace', () => {
    const chProgress = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showChallengeBoard: true, completedChallenges: ['first_planet', 'quiz_ace'],
      },
    });
    expect(chProgress).toContain('data-challenge-rp-pool="60 of 430 RP earned (370 RP remaining)"');
    expect(chProgress).toContain('data-challenge-audio="all"');
    expect(chProgress).toContain('aria-label="Read research challenge summary aloud"');

    const chFresh = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showChallengeBoard: true },
    });
    expect(chFresh).toContain('data-challenge-rp-pool="0 of 430 RP earned (430 RP remaining)"');

    const logPop = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth', showLog: true,
        missionLog: [
          { text: 'Deployed rover on Mars', kind: 'deployment', world: 'Mars', time: '10:00 AM' },
          { text: 'Scanned cloud deck', kind: 'scan', world: 'Venus', time: '10:05 AM' },
          { text: 'Recorded rock sample', kind: 'observation', world: 'Mars', time: '10:10 AM' },
        ],
      },
    });
    expect(logPop).toContain('data-log-worlds="2 worlds logged (Mars, Venus)"');
    expect(logPop).toContain('data-log-audio="true"');
    expect(logPop).toContain('aria-label="Read visible mission log entries aloud"');

    const logEmpty = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLog: true, missionLog: [] },
    });
    expect(logEmpty).toContain('data-log-worlds="0 worlds logged"');
  });

  it('adds host-ratio & R_p tidal physics to Moon Explorer, Armstrong-limit & ocean/Mariana pressure equivalents to Atmosphere Descent, and Earth/Sun ratios to Planet Size Comparison', () => {
    const moonsPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Pluto', showMoons: true },
    });
    expect(moonsPluto).toContain('data-moon-size-ratio="Charon = 51.0% of Pluto width"');
    expect(moonsPluto).toContain('data-moon-orbit-radii="Charon at 16.5 R_p"');
    expect(moonsPluto).toContain('Read Pluto moon system summary aloud');

    const moonsMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showMoons: true },
    });
    expect(moonsMars).toContain('data-moon-size-ratio="Phobos = 0.33% of Mars width"');
    expect(moonsMars).toContain('data-moon-orbit-radii="Phobos at 2.8 R_p"');

    const descVenus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Venus', showDescent: true, descentAlt: 0 },
    });
    expect(descVenus).toContain('data-descent-pressure-eq="Crushing 90 atm (≈ 890 m ocean depth)"');
    expect(descVenus).toContain('Read Venus atmospheric layer summary aloud');

    const descMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Mars', showDescent: true, descentAlt: 0 },
    });
    expect(descMars).toContain('data-descent-pressure-eq="Below Armstrong limit (0.062 atm) — full pressure suit required"');

    const descJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', showDescent: true, descentAlt: 0 },
    });
    expect(descJup).toContain('data-descent-pressure-eq="Extreme 2,000,000 atm (≈ 1,842× Mariana Trench)"');

    const scaleJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Jupiter', showScale: true },
    });
    expect(scaleJup).toContain('data-scale-selected-vs-earth="Jupiter: 10.97× Earth width · 1,321× Earth vol"');
    expect(scaleJup).toContain('data-scale-vs-sun="Sun is 10.0× wider than Jupiter"');
    expect(scaleJup).toContain('Read planet size comparison summary aloud');

    const scalePluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Pluto', showScale: true },
    });
    expect(scalePluto).toContain('data-scale-selected-vs-earth="Pluto: 0.19× Earth width · 0.006× Earth vol"');
    expect(scalePluto).toContain('data-scale-vs-sun="Sun is 586× wider than Pluto"');
  });

  it('adds read-only glossary quest tracker + summary audio to Vocabulary Glossary and catalog/saved/recent summary + audio to Activity Finder', () => {
    const vocab = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showVocab: true, vocabLookedUp: ['albedo', 'regolith'],
      },
    });
    expect(vocab).toContain('data-vocab-pct="12%"');
    expect(vocab).toContain('data-vocab-quest="Glossary quest: 2/10 terms (8 to go)"');
    expect(vocab).toContain('data-vocab-summary-audio="true"');
    expect(vocab).toContain('aria-label="Read vocabulary glossary summary aloud"');

    const finder = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        showActivityFinder: true, solarSavedActivities: ['moons', 'night-sky'],
      },
    });
    expect(finder).toMatch(/data-finder-summary="\d+ total · 2 saved · 0 recent"/);
    expect(finder).toContain('data-finder-audio="true"');
    expect(finder).toContain('aria-label="Read matching activities summary aloud"');
  });

  it('adds hidden-safe Step 1 & Step 3 UDL audio to POE Inquiry and synced accessible orbital telemetry to Orbital Mechanics Mini-Lesson', () => {
    const poeStep1 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth' },
    });
    expect(poeStep1).toContain('data-poe-audio="prompt"');
    expect(poeStep1).toContain('aria-label="Read Earth inquiry prompt aloud"');
    expect(poeStep1).not.toContain('data-poe-audio="explanation"');

    const poeStep3 = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth',
        poe_seen_Earth: 'predicted', poe_revealed_Earth: true,
        poe_prediction_Earth: 'Earth has liquid water.',
      },
    });
    expect(poeStep3).toContain('data-poe-audio="explanation"');
    expect(poeStep3).toContain('aria-label="Read Earth model explanation aloud"');

    const orbCustom = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showOrbital: true },
    });
    expect(orbCustom).toContain('data-orbital-body-summary="Custom Orbit: r = 1.00–3.00 AU (e = 0.500)"');
    expect(orbCustom).toContain('data-orbital-vp-va="v_p = 36.5 / v_a = 12.2 km/s (3.00×)"');
    expect(orbCustom).toContain('data-orbital-period-yr="T = 2.83 yr (a = 2.00 AU)"');
    expect(orbCustom).toContain('aria-label="Read orbital mechanics summary aloud"');

    const orbHalley = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showOrbital: true, _keplerBody: 'halley' },
    });
    expect(orbHalley).toContain('data-orbital-body-summary="Halley&#x27;s Comet: r = 0.59–35.07 AU (e = 0.967)"');
    expect(orbHalley).toContain('data-orbital-vp-va="v_p = 54.4 / v_a = 0.9 km/s (59.6×)"');
    expect(orbHalley).toContain('data-orbital-period-yr="T = 75.30 yr (a = 17.83 AU)"');
  });

  it('adds geometric magnitude & Saros cycle + UDL audio to Eclipse Theater, oval-edge + audio to Aurora Tuner, and UDL audio to Black Hole Visualizer & Trajectory Designer', () => {
    const eclTotal = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseDist: 363000, eclipseAlign: 50 },
    });
    expect(eclTotal).toContain('data-eclipse-mag="Solar mag 1.02 (Total)"');
    expect(eclTotal).toContain('data-eclipse-saros="Saros cycle: 18 yr 11 d 8 h (223 synodic months)"');
    expect(eclTotal).toContain('aria-label="Read eclipse theater summary aloud"');

    const eclAnnular = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseDist: 405000, eclipseAlign: 50 },
    });
    expect(eclAnnular).toContain('data-eclipse-mag="Solar mag 0.96 (Annular)"');

    const eclLunar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'lunar', eclipseAlign: 50 },
    });
    expect(eclLunar).toContain('data-eclipse-mag="Umbral mag 1.35 (Total)"');

    const aurG5 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 100, auroraLat: 43, auroraAlt: 280, auroraHemi: 'north' },
    });
    expect(aurG5).toContain('data-aurora-oval-edge="43° N"');
    expect(aurG5).toContain('data-aurora-audio="true"');
    expect(aurG5).toContain('aria-label="Read aurora tuner summary aloud"');

    const bh = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true },
    });
    expect(bh).toContain('data-bh-audio="true"');
    expect(bh).toContain('aria-label="Read black hole visualizer summary aloud"');

    const traj = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'mars' },
    });
    expect(traj).toContain('data-traj-ion-prop-pct="16.6"');
    expect(traj).toContain('data-traj-audio="true"');
    expect(traj).toContain('aria-label="Read trajectory designer summary aloud"');
  });

  it('adds lunar elongation + audio to Moon Phase Dial and payload mass fraction + audio to Spacecraft Designer', () => {
    const mpFirst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 90 },
    });
    expect(mpFirst).toContain('data-moon-elongation="90° East of Sun (evening sky)"');
    expect(mpFirst).toContain('data-moon-phase-audio="true"');
    expect(mpFirst).toContain('aria-label="Read moon phase dial summary aloud"');

    const mpFull = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 180 },
    });
    expect(mpFull).toContain('data-moon-elongation="180° (Opposition — rises at sunset)"');

    const mpLast = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 270 },
    });
    expect(mpLast).toContain('data-moon-elongation="90° West of Sun (morning sky)"');

    const scDefault = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDesigner: true },
    });
    expect(scDefault).toContain('data-sc-payload-pct="5.4% payload"');
    expect(scDefault).toContain('data-sc-launch-class="Rideshare / Smallsat"');
    expect(scDefault).toContain('data-sc-audio="true"');
    expect(scDefault).toContain('aria-label="Read spacecraft design summary aloud"');

    const scVoyager = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true, selectedPlanet: 'Earth', showDesigner: true, scDest: 'pluto',
        spacecraft: { core: 'probe', power: 'rtg', prop: 'chem', payload: ['camera', 'spec'] },
      },
    });
    expect(scVoyager).toContain('data-sc-payload-pct="4.9% payload"');
    expect(scVoyager).toContain('data-sc-launch-class="Medium-Lift (Falcon 9 / Vulcan)"');
  });

  it('adds frost line + stellar lifespan & audio to Habitable Zone Calculator, 3D depth ratio + audio to Constellation Hunter, and Earth-diameter scale multiplier + audio to Cosmic Distance Ladder', () => {
    const hzEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 1.0, hzDist: 1.0 },
    });
    expect(hzEarth).toContain('data-hz-snow-line="2.70 AU"');
    expect(hzEarth).toContain('data-hz-star-life="10 Gyr"');
    expect(hzEarth).toContain('data-hz-audio="true"');
    expect(hzEarth).toContain('aria-label="Read habitable zone summary aloud"');

    const hzTrap = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 0.0005, hzDist: 0.029 },
    });
    expect(hzTrap).toContain('data-hz-snow-line="0.060 AU"');
    expect(hzTrap).toContain('data-hz-star-life="1.4 Tyr"');

    const cOrion = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'orion' },
    });
    expect(cOrion).toContain('data-const-depth-ratio="8.0× farther (250 to 2,000 ly)"');
    expect(cOrion).toContain('data-const-audio="true"');
    expect(cOrion).toContain('aria-label="Read constellation hunter summary aloud"');

    const cCygnus = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'cygnus' },
    });
    expect(cCygnus).toContain('data-const-depth-ratio="35.6× farther (73 to 2,600 ly)"');

    const ladAU = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDistLadder: true, distStep: 2 },
    });
    expect(ladAU).toContain('data-ladder-earth-mult="11,741× Earth diameter"');
    expect(ladAU).toContain('data-ladder-audio="true"');
    expect(ladAU).toContain('aria-label="Read cosmic distance ladder rung aloud"');

    const ladObs = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDistLadder: true, distStep: 8 },
    });
    expect(ladObs).toContain('data-ladder-earth-mult="10^19.5× Earth diameter"');
  });

  it('adds engineering timescale + audio to Mars Terraforming Lab, light-gathering area ratio + audio to Hubble/JWST Deep Field, and relative crust age + audio to Crater Counter', () => {
    const tfToday = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 0, tfIce: 0, tfTrees: 0 },
    });
    expect(tfToday).toContain('data-tf-timescale="Baseline Mars Today (0 yr elapsed)"');
    expect(tfToday).toContain('data-tf-audio="true"');
    expect(tfToday).toContain('aria-label="Read Mars terraforming lab summary aloud"');

    const tfBio = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 100, tfIce: 85, tfTrees: 95 },
    });
    expect(tfBio).toContain('data-tf-timescale="~10,000–100,000 yr (photosynthetic O₂ buildup)"');

    const hdfHubble = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'hubble' },
    });
    expect(hdfHubble).toContain('data-hdf-area-ratio="Hubble 4.5 m² (0.18× JWST’s 25.4 m²)"');
    expect(hdfHubble).toContain('data-hdf-audio="true"');
    expect(hdfHubble).toContain('aria-label="Read deep field summary aloud"');

    const hdfJwst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'jwst' },
    });
    expect(hdfJwst).toContain('data-hdf-area-ratio="JWST 25.4 m² (5.6× Hubble’s 4.5 m²)"');

    const crHigh = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'highlands' },
    });
    expect(crHigh).toContain('data-crater-age-ratio="82× older than Europa ice"');
    expect(crHigh).toContain('data-crater-audio="true"');
    expect(crHigh).toContain('aria-label="Read crater counter summary aloud"');

    const crEur = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'europa' },
    });
    expect(crEur).toContain('data-crater-age-ratio="1× baseline (youngest icy crust)"');
  });

  it('adds Wien blackbody peak + audio to CMB Explorer and billion-km odometer + 2-way command delay + audio to Voyager Position Tracker', () => {
    const cmb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true },
    });
    expect(cmb).toContain('data-cmb-peak="160.2 GHz · 1.9 mm (microwave)"');
    expect(cmb).toContain('data-cmb-audio="true"');
    expect(cmb).toContain('aria-label="Read cosmic microwave background summary aloud"');

    const voy26 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVoy: true, voyYear: 2026 },
    });
    expect(voy26).toContain('data-voy-v1-bkm="26.4 billion km"');
    expect(voy26).toContain('data-voy-roundtrip="48h 55m round-trip"');
    expect(voy26).toContain('data-voy-audio="true"');
    expect(voy26).toContain('aria-label="Read Voyager tracker summary aloud"');

    const voy50 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVoy: true, voyYear: 2050 },
    });
    expect(voy50).toContain('data-voy-v1-bkm="39.3 billion km"');
    expect(voy50).toContain('data-voy-roundtrip="72h 52m round-trip"');
  });

  it('adds jet circuit telemetry + audio to Saturn Hexagon, blueshift/lookback + audio to Local Group Map, and impactor mass/natural benchmark + audio to Asteroid Impact Outcomes', () => {
    const hex6 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Saturn', showHex: true, hexSides: 6 },
    });
    expect(hex6).toContain('data-hex-earths-across="2.28× Earth"');
    expect(hex6).toContain('data-hex-lap-days="11.3 Earth days"');
    expect(hex6).toContain('data-hex-audio="true"');
    expect(hex6).toContain('aria-label="Read Saturn hexagon summary aloud"');

    const hex4 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Saturn', showHex: true, hexSides: 4 },
    });
    expect(hex4).toContain('data-hex-earths-across="2.41× Earth"');

    const lgNow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgGyr: 0 },
    });
    expect(lgNow).toContain('data-lg-blueshift="−110 km/s (z = −0.00037 blueshift)"');
    expect(lgNow).toContain('data-lg-lookback="2.54 Myr light-travel time"');
    expect(lgNow).toContain('data-lg-audio="true"');
    expect(lgNow).toContain('aria-label="Read Local Group map summary aloud"');

    const lgMerged = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgGyr: 7 },
    });
    expect(lgMerged).toContain('data-lg-blueshift="0 km/s (Bound Milkomeda)"');
    expect(lgMerged).toContain('data-lg-lookback="Merged (&lt;0.1 Myr crossing)"');

    const impChely = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 20, impComp: 'stony' },
    });
    expect(impChely).toContain('data-imp-mass="12,566 tonnes"');
    expect(impChely).toContain('data-imp-benchmark="1.0× Chelyabinsk 2013 (0.43 Mt)"');
    expect(impChely).toContain('data-imp-audio="true"');
    expect(impChely).toContain('aria-label="Read asteroid impact outcome summary aloud"');

    const impChicx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 10000, impComp: 'stony' },
    });
    expect(impChicx).toContain('data-imp-mass="1.57 T tonnes"');
    expect(impChicx).toContain('data-imp-benchmark="1.00× Chicxulub 66 Ma"');
  });

  it('adds Wien peak/redshift z + audio to Star Spectra Comparison and Milky Way star odds + audio to Drake Equation Calculator', () => {
    const spcSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpc: true, spcEl: 'sun', spcVel: 0 },
    });
    expect(spcSun).toContain('data-spc-wien="502 nm (Wien peak)"');
    expect(spcSun).toContain('data-spc-z="z = 0.0000 (rest)"');
    expect(spcSun).toContain('data-spc-audio="true"');
    expect(spcSun).toContain('aria-label="Read star spectrum summary aloud"');

    const spcNeb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpc: true, spcEl: 'neb', spcVel: 6000 },
    });
    expect(spcNeb).toContain('data-spc-wien="Line-dominated ([O III] 500.7 nm)"');
    expect(spcNeb).toContain('data-spc-z="z = +0.0200"');

    const spcRG = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpc: true, spcEl: 'redgi', spcVel: -6000 },
    });
    expect(spcRG).toContain('data-spc-wien="724 nm (Wien peak)"');
    expect(spcRG).toContain('data-spc-z="z = -0.0200"');

    const drakeExo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDrake: true },
    });
    expect(drakeExo).toContain('data-drake-stars-per-civ="1 in 16.7B stars"');
    expect(drakeExo).toContain('data-drake-audio="true"');
    expect(drakeExo).toContain('aria-label="Read Drake equation summary aloud"');

    const drakeRare = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDrake: true, drR: 1.5, drFp: 0.9, drNe: 0.1, drFl: 0.05, drFi: 0.01, drFc: 0.1, drL: 300 },
    });
    expect(drakeRare).toContain('data-drake-stars-per-civ="&gt;250B stars (likely alone now)"');

    const drakeOpt = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDrake: true, drR: 3.0, drFp: 1.0, drNe: 1.0, drFl: 0.8, drFi: 0.5, drFc: 0.5, drL: 100000 },
    });
    expect(drakeOpt).toContain('data-drake-stars-per-civ="1 in 4.2M stars"');
  });

  it('adds EM frequency + audio to Atmospheric Window, subsolar noon/spin + audio to Time Zone Visualizer, and Haversine ground distance + audio to Eclipse Path Maker', () => {
    const awVis = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'vis' },
    });
    expect(awVis).toContain('data-aw-freq="400–790 THz"');
    expect(awVis).toContain('data-aw-audio="true"');
    expect(awVis).toContain('aria-label="Read atmospheric window summary aloud"');

    const awGamma = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'gamma' },
    });
    expect(awGamma).toContain('data-aw-freq="&gt; 30 EHz"');

    const tzNoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 12 },
    });
    expect(tzNoon).toContain('data-tz-subsolar="0° Prime Meridian"');
    expect(tzNoon).toContain('data-tz-spin-deg="180°"');
    expect(tzNoon).toContain('data-tz-audio="true"');
    expect(tzNoon).toContain('aria-label="Read time zone summary aloud"');

    const tzMaineNoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 17 },
    });
    expect(tzMaineNoon).toContain('data-tz-subsolar="75° W"');
    expect(tzMaineNoon).toContain('data-tz-spin-deg="255°"');

    const epMaine = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2024', ePathLat: 46, ePathLon: -69 },
    });
    expect(epMaine).toContain('data-epath-dist-km="~19 km from centerline (inside 185 km path)"');
    expect(epMaine).toContain('data-epath-audio="true"');
    expect(epMaine).toContain('aria-label="Read eclipse path summary aloud"');

    const epLondon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2024', ePathLat: 51.5, ePathLon: -0.1 },
    });
    expect(epLondon).toContain('data-epath-dist-km="~3,821 km from centerline"');
  });

  it('adds Rayleigh diffraction limit + audio to World Telescopes Catalog and spectral class/universe-age ratio + audio to Star Lifespan Calculator', () => {
    const telAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'all', telBand: 'all' },
    });
    expect(telAll).toContain('data-tel-largest="Extremely Large Telescope (ELT) (39.0 m)"');
    expect(telAll).toContain('data-tel-diffraction="0.0032&quot; @ 500 nm (16× sharper than Hubble)"');
    expect(telAll).toContain('data-tel-audio="true"');
    expect(telAll).toContain('aria-label="Read world telescopes summary aloud"');

    const telSpace = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'space', telBand: 'all' },
    });
    expect(telSpace).toContain('data-tel-largest="James Webb (JWST) (6.5 m)"');
    expect(telSpace).toContain('data-tel-diffraction="0.077&quot; @ 2 μm"');

    const telEmpty = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'space', telBand: 'radio' },
    });
    expect(telEmpty).toContain('data-tel-largest="None matching filter"');
    expect(telEmpty).toContain('data-tel-diffraction="N/A"');

    const sltSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 1 },
    });
    expect(sltSun).toContain('data-slt-class="G-type Yellow Dwarf"');
    expect(sltSun).toContain('data-slt-univ-ratio="0.72× universe age"');
    expect(sltSun).toContain('data-slt-audio="true"');
    expect(sltSun).toContain('aria-label="Read star lifespan summary aloud"');

    const sltProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 0.12 },
    });
    expect(sltProx).toContain('data-slt-class="M-type Red Dwarf"');
    expect(sltProx).toContain('data-slt-univ-ratio="145× universe age"');

    const sltHeavy = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 50 },
    });
    expect(sltHeavy).toContain('data-slt-class="O-type Blue Supergiant"');
    expect(sltHeavy).toContain('data-slt-univ-ratio="0.0041% of universe age"');
  });

  it('adds surface flux + audio to OBAFGKM Classes, inverse-square distance + audio to Star Magnitude Scale, and diurnal arc hours + audio to Celestial Coordinates', () => {
    const spsG = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpS: true, spsClass: 4 },
    });
    expect(spsG).toContain('data-sps-flux-ratio="1.00× Sun flux/m²"');
    expect(spsG).toContain('data-sps-audio="true"');
    expect(spsG).toContain('aria-label="Read spectral class summary aloud"');

    const spsO = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpS: true, spsClass: 0 },
    });
    expect(spsO).toContain('data-sps-flux-ratio="2,297× Sun flux/m²"');

    const spsM = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpS: true, spsClass: 6 },
    });
    expect(spsM).toContain('data-sps-flux-ratio="0.078× Sun flux/m²"');

    const smagDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSMag: true },
    });
    expect(smagDef).toContain('data-smag-dmag="7.46"');
    expect(smagDef).toContain('data-smag-dist-mult="31.0× farther"');
    expect(smagDef).toContain('data-smag-audio="true"');
    expect(smagDef).toContain('aria-label="Read star magnitude comparison aloud"');

    const smagSunMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSMag: true, smagA: 0, smagB: 1 },
    });
    expect(smagSunMoon).toContain('data-smag-dmag="14.10"');
    expect(smagSunMoon).toContain('data-smag-dist-mult="661× farther"');

    const coordVega = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'vega', coordLat: 45 },
    });
    expect(coordVega).toContain('data-coord-up-hours="19.1 hr/day"');
    expect(coordVega).toContain('data-coord-audio="true"');
    expect(coordVega).toContain('aria-label="Read celestial coordinates summary aloud"');

    const coordPol = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'polaris', coordLat: 45 },
    });
    expect(coordPol).toContain('data-coord-up-hours="24.0 hr/day (circumpolar)"');

    const coordSgrNorth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'sgrA', coordLat: 65 },
    });
    expect(coordSgrNorth).toContain('data-coord-up-hours="0.0 hr/day (never rises)"');
  });

  it('adds orbits/day & Mach equivalent + audio to Space Debris Tracker and contrast/measured quantity + audio to Exoplanet Detection Methods', () => {
    const junkLeo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 600 },
    });
    expect(junkLeo).toContain('data-junk-orbits-day="14.9 orbits/day"');
    expect(junkLeo).toContain('data-junk-mach="Mach 22"');
    expect(junkLeo).toContain('data-junk-audio="true"');
    expect(junkLeo).toContain('aria-label="Read space debris tracker summary aloud"');

    const junkGeo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 35786 },
    });
    expect(junkGeo).toContain('data-junk-orbits-day="1.00 orbit/day (geostationary!)"');
    expect(junkGeo).toContain('data-junk-mach="Mach 9"');

    const exTr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'transit', exTarget: 'hotJup' },
    });
    expect(exTr).toContain('data-exmth-contrast="10⁻⁶"');
    expect(exTr).toContain('data-exmth-measures="Planet radius (Rₚ) &amp; atmosphere spectra"');
    expect(exTr).toContain('data-exmth-audio="true"');
    expect(exTr).toContain('aria-label="Read exoplanet detection method summary aloud"');

    const exRv = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exMth: 'doppler', exTarget: 'earthTwin' },
    });
    expect(exRv).toContain('data-exmth-contrast="10⁻¹⁰"');
    expect(exRv).toContain('data-exmth-measures="Minimum mass (Mₚ sin i) &amp; orbit shape"');
  });

  it('adds pressure ratio/scale height + audio to Mars vs Earth Atmosphere, emission altitude + audio to Auroras Across Solar System, and Einstein time dilation + audio to Cosmic Speeds', () => {
    const maDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMA: true },
    });
    expect(maDef).toContain('data-ma-press-ratio="Earth is 159× denser than Mars"');
    expect(maDef).toContain('data-ma-scale-h="11.1 km"');
    expect(maDef).toContain('data-ma-scale-h="8.5 km"');
    expect(maDef).toContain('data-ma-audio="true"');
    expect(maDef).toContain('aria-label="Read planetary atmospheres comparison aloud"');

    const maExtra = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMA: true, maExtra: true },
    });
    expect(maExtra).toContain('data-ma-press-ratio="Venus is 14,465× denser than Mars (91× Earth)"');
    expect(maExtra).toContain('data-ma-scale-h="21 km (puffy!)"');

    const auJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'jupiter' },
    });
    expect(auJup).toContain('data-aurora-alt="250–1,000 km above 1-bar cloud tops (H₂)"');
    expect(auJup).toContain('data-aurora-audio="true"');
    expect(auJup).toContain('aria-label="Read planetary aurora summary aloud"');

    const auEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'earth' },
    });
    expect(auEarth).toContain('data-aurora-alt="100–300 km (thermosphere · O &amp; N₂)"');

    const cspParker = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'parker' },
    });
    expect(cspParker).toContain('data-csp-relativity="6.5 sec/yr slower"');
    expect(cspParker).toContain('data-csp-walk-mult="137,143× walking"');
    expect(cspParker).toContain('data-csp-audio="true"');
    expect(cspParker).toContain('aria-label="Read cosmic speed summary aloud"');

    const cspIss = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'iss' },
    });
    expect(cspIss).toContain('data-csp-relativity="10.3 ms/yr slower"');

    const cspLight = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'light' },
    });
    expect(cspLight).toContain('data-csp-relativity="Infinite (photons experience 0 proper time!)"');
    expect(cspLight).toContain('data-csp-walk-mult="214M× walking"');
  });

  it('adds observing wavelength band + audio to Star Forming Region and galactic mass-return recycling + audio to How Stars Die', () => {
    const sfr0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 0 },
    });
    expect(sfr0).toContain('data-sfr-band="Radio / Sub-mm (ALMA · dust blocks visible)"');
    expect(sfr0).toContain('data-sfr-stage-pct="17%"');
    expect(sfr0).toContain('data-sfr-audio="true"');
    expect(sfr0).toContain('aria-label="Read star forming region stage aloud"');

    const sfr2 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 2 },
    });
    expect(sfr2).toContain('data-sfr-band="Near/Mid-Infrared (JWST pierces dust!)"');
    expect(sfr2).toContain('data-sfr-stage-pct="50%"');

    const dSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 1 },
    });
    expect(dSun).toContain('data-death-returned-pct="40% returned to galaxy (60% in white dwarf)"');
    expect(dSun).toContain('data-death-audio="true"');
    expect(dSun).toContain('aria-label="Read stellar death fate summary aloud"');

    const dNs = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 15 },
    });
    expect(dNs).toContain('data-death-returned-pct="89% returned to galaxy (11% in neutron star)"');

    const dBh = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 35 },
    });
    expect(dBh).toContain('data-death-returned-pct="63% returned to galaxy (37% in black hole)"');
  });

  it('adds EHT shadow/Hawking T + audio to Black Hole Vocabulary, solar/lunar split + audio to Upcoming Eclipses, and orbital dynamics + audio to Galaxy Types', () => {
    const bhSgr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgScale: 'sgra' },
    });
    expect(bhSgr).toContain('data-bhg-shadow="~66M km (0.44 AU)"');
    expect(bhSgr).toContain('data-bhg-hawking="1.4×10⁻¹⁴ K"');
    expect(bhSgr).toContain('data-bhg-audio="true"');
    expect(bhSgr).toContain('aria-label="Read black hole term aloud"');

    const bhEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgScale: 'earth' },
    });
    expect(bhEarth).toContain('data-bhg-shadow="~46 mm (golf ball!)"');
    expect(bhEarth).toContain('data-bhg-hawking="0.021 K (colder than CMB)"');

    const ecAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showECat: true },
    });
    expect(ecAll).toContain('data-ecat-split="9 solar / 5 lunar"');
    expect(ecAll).toContain('data-ecat-saros-period="18 yr 11 d 8 h (6,585.3 d)"');
    expect(ecAll).toContain('data-ecat-audio="true"');
    expect(ecAll).toContain('aria-label="Read upcoming eclipses summary aloud"');

    const ecAm = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showECat: true, ecatReg: 'americas' },
    });
    expect(ecAm).toContain('data-ecat-split="5 solar / 3 lunar"');

    const gtMw = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGT: true, gtSel: 'sbb' },
    });
    expect(gtMw).toContain('data-gt-motion="Rotating disk (~220 km/s) + tumbling bar"');
    expect(gtMw).toContain('data-gt-audio="true"');
    expect(gtMw).toContain('aria-label="Read galaxy type summary aloud"');

    const gtE0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGT: true, gtSel: 'e0' },
    });
    expect(gtE0).toContain('data-gt-motion="3D random stellar orbits (pressure-supported)"');
  });

  it('adds strongest/fastest shower telemetry + audio to Meteor Shower Calendar and 2-way radio/log scale + audio to Cosmic Distance Reference', () => {
    const msDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS: true },
    });
    expect(msDef).toContain('data-ms-count="10 showers (8 comet · 2 asteroid)"');
    expect(msDef).toContain('data-ms-strongest="Geminids (ZHR 120 · ~84/hr)"');
    expect(msDef).toContain('data-ms-fastest="Leonids (71 km/s · head-on retrograde)"');
    expect(msDef).toContain('data-ms-audio="true"');
    expect(msDef).toContain('aria-label="Read meteor shower calendar summary aloud"');

    const msSouth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS: true, msHemi: 'south', msSky: 'suburban' },
    });
    expect(msSouth).toContain('data-ms-count="5 showers (4 comet · 1 asteroid)"');
    expect(msSouth).toContain('data-ms-strongest="Geminids (ZHR 120 · ~34/hr)"');

    const distAu = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 5 },
    });
    expect(distAu).toContain('data-dist-log-km="10^8.17 km"');
    expect(distAu).toContain('data-dist-radio-rt="16.6 min round-trip"');
    expect(distAu).toContain('data-dist-audio="true"');
    expect(distAu).toContain('aria-label="Read cosmic distance scale aloud"');

    const distMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 4 },
    });
    expect(distMoon).toContain('data-dist-radio-rt="2.6 s round-trip"');

    const distProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 8 },
    });
    expect(distProx).toContain('data-dist-radio-rt="8.5 yr round-trip"');
  });

  it('adds farthest mission/active count + audio to Famous Space Missions, sky width/lookback + audio to Famous Nebulae, and Mercury scale/ocean share + audio to Famous Moons', () => {
    const mpAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMP: true },
    });
    expect(mpAll).toContain('data-mp-farthest="Voyager 1+2 (24.5B km · 22.7 hr 1-way)"');
    expect(mpAll).toContain('data-mp-active-count="8/12"');
    expect(mpAll).toContain('data-mp-audio="true"');
    expect(mpAll).toContain('aria-label="Read space missions summary aloud"');

    const mpEmpty = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMP: true, mpFilter: 'moon', mpActiveOnly: true },
    });
    expect(mpEmpty).toContain('data-mp-farthest="None matching filter"');
    expect(mpEmpty).toContain('data-mp-active-count="0/0"');

    const nebOrion = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 0 },
    });
    expect(nebOrion).toContain('data-neb-ang-size="~65′ (&gt;2× Full Moon!)"');
    expect(nebOrion).toContain('data-neb-lookback="~680 CE (early Middle Ages)"');
    expect(nebOrion).toContain('data-neb-audio="true"');
    expect(nebOrion).toContain('aria-label="Read nebula details aloud"');

    const nebVeil = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 7 },
    });
    expect(nebVeil).toContain('data-neb-ang-size="~180′ (6× Full Moon wide!)"');
    expect(nebVeil).toContain('data-neb-lookback="~380 BCE (classical antiquity)"');

    const fmAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFM: true },
    });
    expect(fmAll).toContain('data-fm-largest="Ganymede (5,268 km · 108% of Mercury)"');
    expect(fmAll).toContain('data-fm-ocean-count="6/10"');
    expect(fmAll).toContain('data-fm-audio="true"');
    expect(fmAll).toContain('aria-label="Read famous moons summary aloud"');

    const fmPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFM: true, fmFilter: 'pluto' },
    });
    expect(fmPluto).toContain('data-fm-ocean-count="5/7"');
  });

  it('adds dark observatory count/date split + audio to Why UTC Matters and Rosetta physics key/payload + audio to Messages to the Stars', () => {
    const utc18 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 18, utcDst: false },
    });
    expect(utc18).toContain('data-utc-dark-hubs="1/5 dark (Tokyo)"');
    expect(utc18).toContain('data-utc-date-split="2 calendar dates active (+1d in Tokyo)"');
    expect(utc18).toContain('data-utc-audio="true"');
    expect(utc18).toContain('aria-label="Read UTC global observatory clocks aloud"');

    const utc6 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 6, utcDst: false },
    });
    expect(utc6).toContain('data-utc-dark-hubs="3/5 dark (Mauna Kea, Maine, Paranal)"');
    expect(utc6).toContain('data-utc-date-split="2 calendar dates active (−1d in Mauna Kea)"');

    const utc12 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 12, utcDst: false },
    });
    expect(utc12).toContain('data-utc-date-split="Single UTC calendar date across all 5 hubs"');

    const msgVoy = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMsg: true, msgSel: 'voyager' },
    });
    expect(msgVoy).toContain('data-msg-anchor="H 21-cm spin-flip clock (0.70 ns · 1420 MHz) + 14 pulsars"');
    expect(msgVoy).toContain('data-msg-payload="115 images + 90 min audio + 55 languages"');
    expect(msgVoy).toContain('data-msg-audio="true"');
    expect(msgVoy).toContain('aria-label="Read interstellar message summary aloud"');

    const msgAr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMsg: true, msgSel: 'arecibo' },
    });
    expect(msgAr).toContain('data-msg-anchor="Semiprime 1,679 = 23 × 73 binary bitmap @ 2,380 MHz"');
    expect(msgAr).toContain('data-msg-payload="1,679 bits (~210 bytes — smaller than a tweet!)"');
  });

  it('adds badge count + audio to Your Cosmic Journey, era span + audio to Astronomy Hall of Fame, and Earth rank + audio to Solar System Side-by-Side', () => {
    const j4 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSummary: true, planetsVisited: ['Mercury', 'Venus', 'Earth', 'Mars'], researchPoints: 100 },
    });
    expect(j4).toContain('data-journey-badges="2/5"');
    expect(j4).toContain('data-journey-audio="true"');
    expect(j4).toContain('aria-label="Read cosmic journey summary aloud"');

    const j0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSummary: true, planetsVisited: [] },
    });
    expect(j0).toContain('data-journey-badges="0/5"');

    const astrAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'all' },
    });
    expect(astrAll).toContain('data-astr-span="2,291 yr span"');
    expect(astrAll).toContain('data-astr-audio="true"');
    expect(astrAll).toContain('aria-label="Read astronomy pioneer milestone aloud"');

    const astrAstro = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'astro' },
    });
    expect(astrAstro).toContain('data-astr-span="62 yr span"');

    const sqcDiam = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'diameter', sqcSun: false },
    });
    expect(sqcDiam).toContain('data-sqc-earth-rank="#5 of 9"');
    expect(sqcDiam).toContain('data-sqc-audio="true"');
    expect(sqcDiam).toContain('aria-label="Read solar system comparison summary aloud"');

    const sqcSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'diameter', sqcSun: true },
    });
    expect(sqcSun).toContain('data-sqc-earth-rank="#6 of 10"');

    const sqcGrav = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'gravity', sqcSun: false },
    });
    expect(sqcGrav).toContain('data-sqc-earth-rank="#4 of 9"');
  });

  it('adds city-visible count + audio to Tonight Sky Observing Guide and celestial pole altitude/gear + audio to Maine Night Sky by Season', () => {
    const tntAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTNT: true },
    });
    expect(tntAll).toContain('data-tnt-city-count="7/10 city-visible"');
    expect(tntAll).toContain('data-tnt-audio="true"');
    expect(tntAll).toContain('aria-label="Read tonight sky observing guide aloud"');

    const tntEye = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTNT: true, tntGear: 'eye' },
    });
    expect(tntEye).toContain('data-tnt-city-count="3/5 city-visible"');

    const ms2North = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'north', ms2Season: 0, ms2Target: 0 },
    });
    expect(ms2North).toContain('data-ms2-pole-alt="45° N (Polaris altitude)"');
    expect(ms2North).toContain('data-ms2-target-gear="Naked Eye / Bino"');
    expect(ms2North).toContain('data-ms2-audio="true"');
    expect(ms2North).toContain('aria-label="Read seasonal night sky spotlight aloud"');

    const ms2South = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'south', ms2Season: 2, ms2Target: 0 },
    });
    expect(ms2South).toContain('data-ms2-pole-alt="35° S (South Celestial Pole)"');
    expect(ms2South).toContain('data-ms2-target-gear="Dark Sky / Bino"');
  });

  it('adds Earth-relative gravity/Δv budget + audio to Lunar Lander, 1 km mass/v_esc + audio to Asteroid Composition, and SQM/star-loss + audio to Astronomy Toolkit Guide', () => {
    const landerMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'moon' },
    });
    expect(landerMoon).toContain('data-lander-g-earth="0.17g (1/6 Earth)"');
    expect(landerMoon).toContain('data-lander-dv="30.0 m/s Δv"');
    expect(landerMoon).toContain('data-lander-audio="true"');
    expect(landerMoon).toContain('aria-label="Read lunar lander flight telemetry aloud"');

    const landerTitanLow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'titan', lander: { y: 90, vy: 1.2, fuel: 50, landed: false, crashed: false } },
    });
    expect(landerTitanLow).toContain('data-lander-g-earth="0.14g (1/7 Earth)"');
    expect(landerTitanLow).toContain('data-lander-dv="15.0 m/s Δv"');

    const astC = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'cType' },
    });
    expect(astC).toContain('data-ast-mass-1km="0.68 Gt"');
    expect(astC).toContain('data-ast-vesc-1km="0.43 m/s"');
    expect(astC).toContain('data-ast-audio="true"');
    expect(astC).toContain('aria-label="Read asteroid composition summary aloud"');

    const astM = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'mType' },
    });
    expect(astM).toContain('data-ast-mass-1km="2.30 Gt"');
    expect(astM).toContain('data-ast-vesc-1km="0.78 m/s"');

    const toolsB1 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 1 },
    });
    expect(toolsB1).toContain('data-bortle-sqm="21.99–22.00 mag/arcsec²"');
    expect(toolsB1).toContain('data-bortle-loss-pct="0% lost (100% visible)"');
    expect(toolsB1).toContain('data-tools-audio="true"');
    expect(toolsB1).toContain('aria-label="Read astronomy toolkit and Bortle sky guide aloud"');

    const toolsB9 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 9 },
    });
    expect(toolsB9).toContain('data-bortle-sqm="&lt;17.80 mag/arcsec²"');
    expect(toolsB9).toContain('data-bortle-loss-pct="99% lost (1% visible)"');
  });

  it('adds filtered horizon span/agencies + audio to Space News Timeline and category progress/next goal + audio to Astronomy Bucket List', () => {
    const wnAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFilter: 'all', wnFuture: false },
    });
    expect(wnAll).toContain('data-wn-span="2024–2031 (8-yr window)"');
    expect(wnAll).toContain('data-wn-agencies="10 agencies/sources"');
    expect(wnAll).toContain('data-wn-audio="true"');
    expect(wnAll).toContain('aria-label="Read space news timeline summary aloud"');

    const wnLunar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFilter: 'lunar', wnFuture: false },
    });
    expect(wnLunar).toContain('data-wn-span="2024 (1-yr window)"');
    expect(wnLunar).toContain('data-wn-agencies="2 agencies/sources"');

    const blDefault = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBL: true, blCat: 'all', bucketDone: [] },
    });
    expect(blDefault).toContain('data-bucket-shown="0/15 in view"');
    expect(blDefault).toContain('data-bucket-next="Watch a total solar eclipse from inside the path of totality"');
    expect(blDefault).toContain('data-bucket-audio="true"');
    expect(blDefault).toContain('aria-label="Read astronomy bucket list summary aloud"');

    const blRareDone = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBL: true, blCat: 'rare', bucketDone: [0, 1, 10] },
    });
    expect(blRareDone).toContain('data-bucket-shown="3/3 in view"');
    expect(blRareDone).toContain('data-bucket-next="All complete in this category!"');
  });

  it('adds DART momentum factor β/NEO class + audio to Asteroid Defender and explorer scope + audio to About This Tool', () => {
    const defDart = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDefender: true, defMode: 'deflect' },
    });
    expect(defDart).toContain('data-def-beta="β ≈ 3.6× (DART ejecta recoil)"');
    expect(defDart).toContain('data-def-nearest-m="132 m (Chelyabinsk–Tunguska class)"');
    expect(defDart).toContain('data-def-audio="true"');
    expect(defDart).toContain('aria-label="Read planetary defense telemetry aloud"');

    const defVapPha = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showDefender: true,
        defMode: 'vaporize',
        defAsteroids: [{ id: 9, x: 200, y: 130, vx: -0.8, vy: 0, r: 8, alive: true }],
      },
    });
    expect(defVapPha).toContain('data-def-beta="Fragmentation risk (multi-impact cloud)"');
    expect(defVapPha).toContain('data-def-nearest-m="176 m (PHA ≥140 m)"');

    const aboutHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAbout: true, planetsVisited: ['Mercury', 'Venus', 'Earth'] },
    });
    expect(aboutHtml).toContain('data-about-scope="105+ labs • 3D Orrery • UDL Audio"');
    expect(aboutHtml).toContain('data-about-agencies="NASA, ESA, JAXA, USGS, IAU"');
    expect(aboutHtml).toContain('data-about-visited="3 worlds explored"');
    expect(aboutHtml).toContain('data-about-audio="true"');
    expect(aboutHtml).toContain('aria-label="Read about Solar System Explorer aloud"');
  });

  it('adds starstuff elemental origins + audio to Final Inspiration, scientific reference metadata + audio to Credits, and Open Frontiers mystery switcher + audio to Keep Wondering', () => {
    const inspHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showIns: true },
    });
    expect(inspHtml).toContain('data-insp-origins="Big Bang H (10%) • Supernova O (65%) • Dying-Star C/N (21%) • Type Ia Ca/Fe"');
    expect(inspHtml).toContain('data-insp-starstuff-pct="90% star-forged by mass"');
    expect(inspHtml).toContain('data-insp-audio="true"');
    expect(inspHtml).toContain('aria-label="Read final cosmic inspiration and starstuff origins aloud"');

    const credHtml = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFin: true },
    });
    expect(credHtml).toContain('data-credits-sources="7 primary scientific sources"');
    expect(credHtml).toContain('data-credits-stack="Three.js 3D + SVG + React"');
    expect(credHtml).toContain('data-credits-audio="true"');
    expect(credHtml).toContain('aria-label="Read credits and scientific data sources aloud"');

    const w0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDn: true, wonderIdx: 0 },
    });
    expect(w0).toContain('data-wonder-idx="1/5"');
    expect(w0).toContain('data-wonder-topic="Dark Matter (~27% of universe)"');
    expect(w0).toContain('data-wonder-audio="true"');
    expect(w0).toContain('aria-label="Read open astronomy mystery aloud"');

    const w2 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDn: true, wonderIdx: 2 },
    });
    expect(w2).toContain('data-wonder-idx="3/5"');
    expect(w2).toContain('data-wonder-topic="Ocean Worlds &amp; Alien Life"');
    expect(w2).toContain('data-wonder-mission="NASA Europa Clipper (2030) &amp; ESA JUICE (2031)"');
  });

  it('adds quantitative scale ratios to Mind-Blowing Facts, evidence tiers/anchors to Big Cosmic Questions, and historical span/era to Famous Astronomy Quotes', () => {
    const f0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFacts: true, factIdx: 0 },
    });
    expect(f0).toContain('data-fact-ratio="1.08× longer spin than orbit (243 d vs 225 d)"');
    expect(f0).toContain('data-fact-topics="11 topics"');
    expect(f0).toContain('data-fact-audio="true"');

    const f9 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFacts: true, factIdx: 9 },
    });
    expect(f9).toContain('data-fact-ratio="14× wavelength stretch (1 + z = 14)"');

    const cqMeas = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCQ: true, cqTier: 'measured', cqIdx: 0 },
    });
    expect(cqMeas).toContain('data-cq-tier="measured"');
    expect(cqMeas).toContain('data-cq-shown="4/10"');
    expect(cqMeas).toContain('data-cq-evidence="Flat galaxy rotation curves, Bullet Cluster lensing &amp; Planck CMB"');
    expect(cqMeas).toContain('data-cq-audio="true"');

    const fqDisc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFQ: true, fqTheme: 'discover', fqIdx: 1 },
    });
    expect(fqDisc).toContain('data-fq-span="1925–1996 (71-yr span)"');
    expect(fqDisc).toContain('data-fq-era="Early 20th Century"');
    expect(fqDisc).toContain('data-fq-count="2 quotes"');
    expect(fqDisc).toContain('data-fq-audio="true"');
  });

  it('adds Sun/planet split + weighted bulk density to Solar System At a Glance and per-question quiz audio + accuracy summary to Surprising Planet Facts', () => {
    const sagAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagMode: 'momentum', sagCompare: 'allPlanets' },
    });
    expect(sagAll).toContain('data-sag-sun-share="~2% Sun / ~98% Planets"');
    expect(sagAll).toContain('data-sag-density="1.12 g/cm³ (weighted avg)"');
    expect(sagAll).toContain('data-sag-audio="true"');

    const sagSat = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagMode: 'mass', sagCompare: 'saturn' },
    });
    expect(sagSat).toContain('data-sag-sun-share="99.86% Sun / 0.14% Planets"');
    expect(sagSat).toContain('data-sag-density="0.69 g/cm³ (&lt; water!)"');

    const trPerfect = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'Earth',
        showTR: true,
        trMode: 'quiz',
        trAnswers: { q1: false, q2: true, q3: false, q4: true, q5: false, q6: true },
      },
    });
    expect(trPerfect).toContain('data-tr-shown="6/6 answered"');
    expect(trPerfect).toContain('data-tr-accuracy="100% (6/6 — Myth Buster!)"');
    expect(trPerfect).toContain('data-tr-audio="true"');
    expect(trPerfect).toContain('aria-label="Read quiz statement q1 aloud"');
    expect(trPerfect).toContain('aria-label="Read surprising planet facts summary aloud"');
  });

  it('adds Wien peak + Chandrasekhar/TOV bounds to Stellar Evolution, angular/umbral ratio to Eclipse Theater, and lookback/CMB wavelength to Big Bang Stretch', () => {
    const sunMS = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 15 },
    });
    expect(sunMS).toContain('data-stellar-wien="502 nm (Visible)"');
    expect(sunMS).toContain('data-stellar-limit="Below 1.44 M☉ Chandrasekhar limit (C/O White Dwarf)"');
    expect(sunMS).toContain('data-stellar-audio="true"');

    const hyperBH = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'hypergiant', stellarPhase: 100 },
    });
    expect(hyperBH).toContain('data-stellar-wien="No photosphere (Event horizon)"');
    expect(hyperBH).toContain('data-stellar-limit="Core &gt; ~2.2 M☉ TOV limit → Black Hole"');

    const eclPerigee = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseDist: 363000, eclipseAlign: 50 },
    });
    expect(eclPerigee).toContain('data-eclipse-ratio="1.032× Sun width (Total capable)"');
    expect(eclPerigee).toContain('data-eclipse-audio="true"');

    const eclLunar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'lunar', eclipseDist: 384000, eclipseAlign: 50 },
    });
    expect(eclLunar).toContain('data-eclipse-ratio="2.65× Moon width (9,200 km umbra)"');

    const bbNow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 10 },
    });
    expect(bbNow).toContain('data-bb-lookback="0.00 Gyr (Today)"');
    expect(bbNow).toContain('data-bb-peak-wl="1.06 mm peak (1.9 mm avg)"');
    expect(bbNow).toContain('data-bb-audio="true"');

    const bbCmb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 4 },
    });
    expect(bbCmb).toContain('data-bb-lookback="13.80 Gyr ago"');
    expect(bbCmb).toContain('data-bb-peak-wl="~970 nm peak (3,000 K glow)"');
  });

  it('adds seafloor hydrostatic pressure/contact to Habitable Moons and Cepheid mass/Hubble-flow recession speed to Cepheid Variable Star', () => {
    const habEur = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'europa' },
    });
    expect(habEur).toContain('data-hab-pressure="~130–200 MPa (~1.5× Mariana Trench)"');
    expect(habEur).toContain('data-hab-seafloor="Direct rock seafloor (vents!)"');
    expect(habEur).toContain('data-hab-audio="true"');

    const habGan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'ganymede' },
    });
    expect(habGan).toContain('data-hab-pressure="~800–1,200 MPa (High-P Ice VI floor)"');
    expect(habGan).toContain('data-hab-seafloor="High-P ice sandwich layers"');

    const cepM100 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 40.0, pvAppMag: 25.2 },
    });
    expect(cepM100).toContain('data-cepheid-mass="~9.9 M☉ supergiant"');
    expect(cepM100).toContain('data-cepheid-hubble="~1,179 km/s (H₀ = 70)"');
    expect(cepM100).toContain('data-cepheid-audio="true"');

    const cepLocal = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 5.4, pvAppMag: 3.9 },
    });
    expect(cepLocal).toContain('data-cepheid-mass="~4.8 M☉ supergiant"');
    expect(cepLocal).toContain('data-cepheid-hubble="Bound locally (gravity &gt; Hubble flow)"');
  });

  it('adds virial mass/orbit cycle to Galaxy Spiral Map, parallax/distance-ladder rung to Light-Year Walker, and 1 R⊕ gravity/v_esc/retention to Custom Planet Builder', () => {
    const galBar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGalaxy: true, galType: 'barred' },
    });
    expect(galBar).toContain('data-gal-mass="~1.2 × 10¹² M☉ (incl. dark halo)"');
    expect(galBar).toContain('data-gal-period="~225 Myr (~20 orbits since Earth formed)"');
    expect(galBar).toContain('data-gal-audio="true"');

    const lyProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 5 },
    });
    expect(lyProx).toContain('data-ly-parallax="p = 0.769″ (769.2 mas)"');
    expect(lyProx).toContain('data-ly-rung="Rung 2: Trigonometric Parallax (Gaia)"');
    expect(lyProx).toContain('data-ly-audio="true"');

    const lyAndr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 8 },
    });
    expect(lyAndr).toContain('data-ly-parallax="~1.28 µas (beyond Gaia — Cepheids!)"');
    expect(lyAndr).toContain('data-ly-rung="Rung 3: Cepheid Standard Candles"');

    const cpbEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCustomBuilder: true, builderPl: { core: 'iron', surface: 'water', atmo: 'oxygen', life: true } },
    });
    expect(cpbEarth).toContain('data-cpb-gravity="9.8 m/s² (1.00g)"');
    expect(cpbEarth).toContain('data-cpb-vesc="11.2 km/s"');
    expect(cpbEarth).toContain('data-cpb-retention="Strong gravity + dipole retains air long-term"');
    expect(cpbEarth).toContain('data-cpb-audio="true"');

    const cpbIce = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCustomBuilder: true, builderPl: { core: 'ice', surface: 'ice', atmo: 'helium', life: false } },
    });
    expect(cpbIce).toContain('data-cpb-gravity="3.7 m/s² (0.38g)"');
    expect(cpbIce).toContain('data-cpb-vesc="6.9 km/s"');
    expect(cpbIce).toContain('data-cpb-retention="Needs &gt;2 R⊕ mass to retain light He/H₂"');
  });

  it('adds equatorial centrifugal relief/oblateness to Day Length Comparison and geological eon/scale rate to Cosmic Calendar', () => {
    const dlSat = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDL: true, dlWorld: 'Saturn' },
    });
    expect(dlSat).toContain('data-dl-centrifugal="−15.5% weight (1.61 m/s²)"');
    expect(dlSat).toContain('data-dl-oblate="9.8% polar flattening"');
    expect(dlSat).toContain('data-dl-audio="true"');

    const dlVen = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDL: true, dlWorld: 'Venus' },
    });
    expect(dlVen).toContain('data-dl-centrifugal="&lt;0.001% (negligible spin)"');
    expect(dlVen).toContain('data-dl-oblate="~0.00% (near-perfect sphere)"');

    const calDino = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCal: true, calIdx: 7 },
    });
    expect(calDino).toContain('data-cal-eon="Mesozoic Era (Triassic)"');
    expect(calDino).toContain('data-cal-rate="1 sec = 437.6 yr (1 day = 37.8 Myr)"');
    expect(calDino).toContain('data-cal-audio="true"');
  });

  it('adds opposition-surge magnitude/flux to Moon Phase Dial and atmospheric mass/boiling point to Mars Terraforming Lab', () => {
    const moonQtr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 90 },
    });
    expect(moonQtr).toContain('data-moon-mag="mᵥ −10.1"');
    expect(moonQtr).toContain('data-moon-flux-pct="9.1% of Full Moon"');
    expect(moonQtr).toContain('data-moon-phase-audio="true"');

    const moonFull = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 180 },
    });
    expect(moonFull).toContain('data-moon-mag="mᵥ −12.7"');
    expect(moonFull).toContain('data-moon-flux-pct="100.0% of Full Moon"');

    const tfToday = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 0, tfIce: 0, tfTrees: 0 },
    });
    expect(tfToday).toContain('data-tf-atmo-mass="~24 trillion t (163 kg/m²)"');
    expect(tfToday).toContain('data-tf-boil="Sublimates (&lt;0.006 atm triple pt)"');

    const tfBio = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 100, tfIce: 85, tfTrees: 95 },
    });
    expect(tfBio).toContain('data-tf-atmo-mass="~2,268 trillion t (15,662 kg/m²)"');
    expect(tfBio).toContain('data-tf-boil="85°C boiling point"');
  });

  it('adds digit/bit-width to Big Numbers, star distance/hemisphere to Constellation Mythology, and Earth magnitude/sunlight dimming to Pale Blue Dot', () => {
    const bnStars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBN: true, bnSel: 'allstars' },
    });
    expect(bnStars).toContain('data-bn-digits="24 digits"');
    expect(bnStars).toContain('data-bn-bits="77 bits (&gt;64-bit!)"');
    expect(bnStars).toContain('data-bn-audio="true"');

    const cmCyg = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCM: true, cmIdx: 5 },
    });
    expect(cmCyg).toContain('data-cm-star-dist="Deneb ~2,600 ly (mag 1.25 — supergiant!)"');
    expect(cmCyg).toContain('data-cm-hemi="Northern summer Milky Way"');
    expect(cmCyg).toContain('data-cm-audio="true"');

    const pbdVoy = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'voyager' },
    });
    expect(pbdVoy).toContain('data-pbd-earth-mag="mᵥ ~+1.0 (faint 1st-mag dot)"');
    expect(pbdVoy).toContain('data-pbd-sun-dim="~1,608× dimmer Sun (40.1 AU)"');
    expect(pbdVoy).toContain('data-pbd-audio="true"');

    const pbdMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'curiosity' },
    });
    expect(pbdMars).toContain('data-pbd-earth-mag="mᵥ ~−2.5 (bright as Jupiter from Earth)"');
    expect(pbdMars).toContain('data-pbd-sun-dim="~2.3× dimmer Sun (1.52 AU)"');
  });

  it('adds photon eV/metastable lifetime to Aurora Tuner, Novikov-Thorne efficiency/evaporation to Black Hole Visualizer, and Tsiolkovsky mass ratio to Spacecraft Designer', () => {
    const aurRed = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraAlt: 280 },
    });
    expect(aurRed).toContain('data-aurora-photon-ev="1.97 eV (630.0 nm)"');
    expect(aurRed).toContain('data-aurora-lifetime="~110 s (needs thin air &gt;240 km)"');

    const aurViol = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraAlt: 90 },
    });
    expect(aurViol).toContain('data-aurora-photon-ev="2.90 eV (427.8 nm)"');
    expect(aurViol).toContain('data-aurora-lifetime="~60 ns (allowed N₂⁺)"');

    const bhM87 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 98, bhSpin: 90 },
    });
    expect(bhM87).toContain('data-bh-eff="25.5% mc² (36× fusion)"');
    expect(bhM87).toContain('data-bh-evap="10^96.8 yr"');

    const bhSchw = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 50, bhSpin: 0 },
    });
    expect(bhSchw).toContain('data-bh-eff="5.7% mc² (8× fusion)"');

    const scIonMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDesigner: true, scDest: 'mars', spacecraft: { core: 'orbiter', power: 'solar', prop: 'ion', payload: ['camera'] } },
    });
    expect(scIonMars).toContain('data-sc-mass-ratio="1.62×"');
    expect(scIonMars).toContain('data-sc-prop-pct="38.2% propellant (R = 1.62×)"');

    const scChemMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDesigner: true, scDest: 'mars', spacecraft: { core: 'orbiter', power: 'solar', prop: 'chem', payload: ['camera'] } },
    });
    expect(scChemMars).toContain('data-sc-mass-ratio="123×"');
    expect(scChemMars).toContain('data-sc-prop-pct="99.2% propellant (R = 123×)"');
  });

  it('adds apparent star width/orbital velocity to Habitable Zone Calculator and Rayleigh limit/limiting magnitude to Hubble Deep Field', () => {
    const hzTrap = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 0.0005, hzDist: 0.029 },
    });
    expect(hzTrap).toContain('data-hz-star-ang="2.18° (4.1× Sun)"');
    expect(hzTrap).toContain('data-hz-orb-speed="46.1 km/s"');

    const hzEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 1.0, hzDist: 1.0 },
    });
    expect(hzEarth).toContain('data-hz-star-ang="0.53° (1.0× Sun)"');
    expect(hzEarth).toContain('data-hz-orb-speed="29.8 km/s"');

    const hdfJwst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'jwst' },
    });
    expect(hdfJwst).toContain('data-hdf-rayleigh="0.077″ @ 2.0 µm (NIRCam)"');
    expect(hdfJwst).toContain('data-hdf-mag-limit="m_AB ~31.5 (z=14.3 → 15.3× λ stretch)"');

    const hdfHub = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'hubble' },
    });
    expect(hdfHub).toContain('data-hdf-rayleigh="0.058″ @ 550 nm (optical)"');
    expect(hdfHub).toContain('data-hdf-mag-limit="m_AB ~31.0 (~10B× fainter than eye)"');
  });

  it('adds IAU sky area/Gaia parallax to Constellation Hunter, Hohmann eccentricity/C3 launch energy to Trajectory Designer, and step jump/Hubble-tension role to Cosmic Distance Ladder', () => {
    const constOrion = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'orion', constStar: 'alnilam' },
    });
    expect(constOrion).toContain('data-const-area="594 deg² (#26 of 88)"');
    expect(constOrion).toContain('data-const-parallax="1.63 mas (μ = 8.9 mag)"');

    const constCrux = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showConst: true, constPicked: 'crux' },
    });
    expect(constCrux).toContain('data-const-area="68 deg² (#88 — smallest!)"');
    expect(constCrux).toContain('data-const-parallax="36.6 mas (μ = 2.2 mag)"');

    const trajMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'mars' },
    });
    expect(trajMars).toContain('data-traj-ecc="e = 0.208 (a = 1.26 AU)"');
    expect(trajMars).toContain('data-traj-c3="C₃ = 8.7 km²/s² (v∞ = 2.95 km/s)"');

    const trajMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'moon' },
    });
    expect(trajMoon).toContain('data-traj-ecc="e = 0.966 (a = 195,500 km geocentric)"');
    expect(trajMoon).toContain('data-traj-c3="C₃ ≈ −2.0 km²/s² (bound Earth ellipse)"');

    const trajVoy = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTraj: true, trajDest: 'voyager' },
    });
    expect(trajVoy).toContain('data-traj-ecc="e ≥ 1.000 (Solar escape)"');
    expect(trajVoy).toContain('data-traj-c3="C₃ ≥ 152.2 km²/s² (v∞ ≥ 12.34 km/s)"');

    const ladProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDistLadder: true, distStep: 4 },
    });
    expect(ladProx).toContain('data-ladder-jump="8,914× Rung 4"');
    expect(ladProx).toContain('data-ladder-h0="Geometric / Cepheid Anchor (feeds local H₀ ≈ 73.0 km/s/Mpc)"');

    const ladCmb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDistLadder: true, distStep: 8 },
    });
    expect(ladCmb).toContain('data-ladder-jump="4.6× Rung 8"');
    expect(ladCmb).toContain('data-ladder-h0="Planck CMB Early Universe: H₀ ≈ 67.4 ± 0.5 km/s/Mpc (5σ tension)"');
  });

  it('adds simple-to-complex transition diameter/impact speed to Crater Counter and inverse-square sunlight dimming/heliopause plasma density to Voyager Position Tracker', () => {
    const crMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'mars' },
    });
    expect(crMars).toContain('data-crater-dt="D_t ≈ 7 km (g = 3.72 m/s² rock)"');
    expect(crMars).toContain('data-crater-vimp="~10 km/s (main-belt encounter)"');

    const crEur = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'europa' },
    });
    expect(crEur).toContain('data-crater-dt="D_t ≈ 3.5 km (g = 1.31 m/s² weak ice)"');
    expect(crEur).toContain('data-crater-vimp="~26 km/s (Jupiter gravity boost)"');

    const crMar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCrater: true, craterTerrain: 'maria' },
    });
    expect(crMar).toContain('data-crater-dt="D_t ≈ 15 km (g = 1.62 m/s² rock)"');
    expect(crMar).toContain('data-crater-vimp="~18 km/s (Earth–Moon zone)"');

    const voy26 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVoy: true, voyYear: 2026 },
    });
    expect(voy26).toContain('data-voy-sun-dim="1/31,137× Earth Sun (m_V = -15.5)"');
    expect(voy26).toContain('data-voy-plasma="~0.08–0.12 cm⁻³ (~40× denser cold ISM!)"');

    const voy89 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showVoy: true, voyYear: 1989 },
    });
    expect(voy89).toContain('data-voy-sun-dim="1/1,871× Earth Sun (m_V = -18.6)"');
    expect(voy89).toContain('data-voy-plasma="~0.001 cm⁻³ (supersonic outer wind)"');
  });

  it('adds multipole reach/recombination physics to CMB, Rossby number/surface area to Saturn Hexagon, and barycenter/zero-velocity surface to Local Group Map', () => {
    const cmbPlanck = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbMission: 'planck' },
    });
    expect(cmbPlanck).toContain('data-cmb-lmax="ℓ_max ≈ 2,250 (resolves 7 acoustic peaks)"');
    expect(cmbPlanck).toContain('data-cmb-zrec="z ≈ 1,089 (r_s ≈ 480 Mly · 0.261 eV/cm³)"');

    const cmbCobe = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCMB: true, cmbMission: 'cobe' },
    });
    expect(cmbCobe).toContain('data-cmb-lmax="ℓ_max ≈ 26 (cannot resolve ℓ=220 peak)"');

    const hex6 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHex: true, hexSides: 6 },
    });
    expect(hex6).toContain('data-hex-rossby="Ro = 0.019 (geostrophic · f = 3.2×10⁻⁴ s⁻¹)"');
    expect(hex6).toContain('data-hex-area-earths="1.07× Earth surface (546M km²)"');

    const hex4 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHex: true, hexSides: 4 },
    });
    expect(hex4).toContain('data-hex-rossby="Ro = 0.013 (geostrophic · f = 3.2×10⁻⁴ s⁻¹)"');
    expect(hex4).toContain('data-hex-area-earths="0.93× Earth surface (473M km²)"');

    const lgNow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgGyr: 0 },
    });
    expect(lgNow).toContain('data-lg-barycenter="1.42 Mly toward M31 (M_LG ≈ 3×10¹² M☉)"');
    expect(lgNow).toContain('data-lg-zero-vel="R₀ ≈ 3.1 Mly (beats +55 km/s Hubble flow)"');

    const lgMerged = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLG: true, lgGyr: 7 },
    });
    expect(lgMerged).toContain('data-lg-barycenter="0.00 Mly (Merged Milkomeda core)"');
    expect(lgMerged).toContain('data-lg-zero-vel="R₀ ≈ 3.1 Mly (gravitationally bound system)"');
  });

  it('adds crater depth/fireball radius to Asteroid Impact Outcomes and excitation regime/H-alpha photon resolving power to Star Spectra Comparison', () => {
    const impChel = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 20, impComp: 'stony' },
    });
    expect(impChel).toContain('data-imp-depth="Airburst only (no ground crater)"');
    expect(impChel).toContain('data-imp-fireball="~244 m fireball radius"');

    const impBar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 50, impComp: 'iron' },
    });
    expect(impBar).toContain('data-imp-depth="353 m deep (simple bowl, d/D ≈ 0.20)"');
    expect(impBar).toContain('data-imp-fireball="~839 m fireball radius"');

    const impChic = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showImpact: true, impSize: 10000, impComp: 'stony' },
    });
    expect(impChic).toContain('data-imp-depth="1.21 km deep (complex peak-ring)"');
    expect(impChic).toContain('data-imp-fireball="~122 km fireball radius"');

    const spcNeb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpc: true, spcEl: 'neb', spcVel: 0 },
    });
    expect(spcNeb).toContain('data-spc-regime="Forbidden collisional lines ([O III] 500.7 nm · low density)"');
    expect(spcNeb).toContain('data-spc-photon="Rest H-α: 1.889 eV (Earth-reflex RV needs R ≥ 100,000)"');

    const spcRed = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpc: true, spcEl: 'redgi', spcVel: 6000 },
    });
    expect(spcRed).toContain('data-spc-regime="Molecular survival zone (TiO, CH stable below 4,500 K)"');
    expect(spcRed).toContain('data-spc-photon="Shifted H-α: 1.852 eV (detectable at R ≥ 50)"');
  });

  it('adds Wien source temperature/air overburden to Atmospheric Window, midnight date-split/solar offset to Time Zone Visualizer, and umbra kinematics/next Saros twin to Eclipse Path Maker', () => {
    const awIr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'ir', awAlt: 14 },
    });
    expect(awIr).toContain('data-aw-wien-temp="10–3,800 K (warm planets, cool stars + dust)"');
    expect(awIr).toContain('data-aw-air-col="~19% air column (above 99% of water vapor)"');

    const awXray = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAW: true, awBand: 'xray', awAlt: 550 },
    });
    expect(awXray).toContain('data-aw-wien-temp="10⁶–10⁸ K (accretion disks + cluster plasma)"');
    expect(awXray).toContain('data-aw-air-col="0% air column (vacuum — zero distortion)"');

    const tzNoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 12, tzCityA: 2 },
    });
    expect(tzNoon).toContain('data-tz-midnight-lon="180° IDL (100% of globe on 1 date!)"');
    expect(tzNoon).toContain('data-tz-solar-offset="Maine: +20 min ahead of -75° zone meridian"');

    const tz17 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTZ: true, tzHour: 17, tzCityA: 6 },
    });
    expect(tz17).toContain('data-tz-midnight-lon="105° E (21% newer date / 79% prior)"');
    expect(tz17).toContain('data-tz-solar-offset="Mumbai: −38 min behind +82.5° zone meridian"');

    const ep24 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2024', ePathLat: 46, ePathLon: -69 },
    });
    expect(ep24).toContain('data-epath-shadow-rel="Earth spin 1,160 km/h vs Moon 3,680 km/h (net ~2,520 km/h E)"');
    expect(ep24).toContain('data-epath-next-saros="2042 Apr 20 (W. Pacific · +18y 11d 8h, ~120° W)"');

    const ep27 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEPath: true, ePathTrack: '2027', ePathLat: 26, ePathLon: 33 },
    });
    expect(ep27).toContain('data-epath-shadow-rel="Earth spin 1,501 km/h vs Moon 3,680 km/h (net ~2,179 km/h E)"');
    expect(ep27).toContain('data-epath-next-saros="2045 Aug 12 (US coast-to-coast · +18y 11d 8h, ~120° W)"');
  });

  it('adds civilization birth rate/0.01c probe transit to Drake Equation Calculator and TNT specific impact/deorbit delta-v to Space Debris Tracker', () => {
    const drExo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDrake: true },
    });
    expect(drExo).toContain('data-drake-birth-rate="1 new civ / 66.7 yr (~150.0M ever in 10 Gyr)"');
    expect(drExo).toContain('data-drake-probe-time="~2.58 Myr at 0.01c (nearest neighbor)"');

    const drOpt = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDrake: true, drR: 3.0, drFp: 1.0, drNe: 1.0, drFl: 0.8, drFi: 0.5, drFc: 0.5, drL: 100000 },
    });
    expect(drOpt).toContain('data-drake-birth-rate="1 new civ / 1.7 yr (~6.0B ever in 10 Gyr)"');
    expect(drOpt).toContain('data-drake-probe-time="~40,800 yr at 0.01c (nearest neighbor)"');

    const junkIss = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 420 },
    });
    expect(junkIss).toContain('data-junk-tnt-ratio="14.0× its own mass in TNT (58.7 MJ/kg)"');
    expect(junkIss).toContain('data-junk-deorbit-dv="93 m/s retro-burn to 100 km reentry"');

    const junkGeo = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showJunk: true, junkAlt: 35786 },
    });
    expect(junkGeo).toContain('data-junk-tnt-ratio="2.3× its own mass in TNT (9.5 MJ/kg)"');
    expect(junkGeo).toContain('data-junk-deorbit-dv="1.49 km/s to 100 km reentry (vs ~11 m/s to GEO graveyard)"');
  });

  it('adds pupil light gain/magnitude depth to World Telescopes, convective mixing/fusion rate to Star Lifespan, and Stefan-Boltzmann flux/B-V color index to OBAFGKM', () => {
    const telAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'all', telBand: 'all' },
    });
    expect(telAll).toContain('data-tel-eye-gain="31.0M× human eye (7 mm pupil)"');
    expect(telAll).toContain('data-tel-mag-gain="+18.7 mag aperture gain (m_vis ~24.7)"');

    const telSpaceIr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTelCat: true, telLoc: 'space', telBand: 'ir' },
    });
    expect(telSpaceIr).toContain('data-tel-eye-gain="862k× human eye (7 mm pupil)"');
    expect(telSpaceIr).toContain('data-tel-mag-gain="+14.8 mag aperture gain (m_vis ~20.8)"');

    const sltSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 1 },
    });
    expect(sltSun).toContain('data-slt-convection="Radiative core + convective envelope (~10% core H burned)"');
    expect(sltSun).toContain('data-slt-fusion-rate="600M tonnes H/s (4.26M t/s → E=mc²)"');

    const sltProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSLT: true, sltMass: 0.12 },
    });
    expect(sltProx).toContain('data-slt-convection="Fully convective (~100% H fuel usable!)"');
    expect(sltProx).toContain('data-slt-fusion-rate="359k tonnes H/s (2.55k t/s → E=mc²)"');

    const spsG = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpS: true, spsClass: 4 },
    });
    expect(spsG).toContain('data-sps-sb-mw="63.2 MW/m² (σT⁴)"');
    expect(spsG).toContain('data-sps-bv="B−V ≈ +0.65 (Solar G2 V · strong Ca II H+K)"');

    const spsO = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSpS: true, spsClass: 0 },
    });
    expect(spsO).toContain('data-sps-sb-mw="145.2 GW/m² (σT⁴)"');
    expect(spsO).toContain('data-sps-bv="B−V ≈ −0.32 (He II ionization peak)"');
  });

  it('adds V-band photon/retina arrival rate to Star Magnitude Scale and circumpolar cutoff/peak airmass to Celestial Coordinates', () => {
    const magDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSMag: true, smagA: 4, smagB: 9 },
    });
    expect(magDef).toContain('data-smag-photons="Faintest naked-eye: 39.8M photons/s/m²"');
    expect(magDef).toContain('data-smag-eye-flux="1.5k photons/s into 7 mm eye"');

    const magJwst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSMag: true, smagA: 0, smagB: 11 },
    });
    expect(magJwst).toContain('data-smag-photons="JWST limit: 10^-3.6 photons/s/m²"');
    expect(magJwst).toContain('data-smag-eye-flux="10^-8.0 photons/s into 7 mm eye"');

    const coordMe = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'sgrA', coordLat: 45 },
    });
    expect(coordMe).toContain('data-coord-sky-zone="Circumpolar Dec ≥ +45° · Never rises Dec ≤ −45°"');
    expect(coordMe).toContain('data-coord-airmass="X = 3.63 airmass (peak Alt 16° · thick horizon air)"');

    const coordSyd = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCoords: true, coordTarget: 'sgrA', coordLat: -34 },
    });
    expect(coordSyd).toContain('data-coord-sky-zone="Circumpolar Dec ≤ −56° · Never rises Dec ≥ +56°"');
    expect(coordSyd).toContain('data-coord-airmass="X = 1.00 airmass (peak Alt 85° · near zenith!)"');
  });

  it('adds air density/column mass to Mars vs Earth Atmosphere, electron keV/magnetopause to Auroras Across Solar System, and transit odds/sky separation to Exoplanet Detection', () => {
    const maFull = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMA: true, maExtra: true },
    });
    expect(maFull).toContain('data-ma-density="0.016 kg/m³ (0.013× Earth)"');
    expect(maFull).toContain('data-ma-column-mass="171 kg/m² (0.017× Earth)"');
    expect(maFull).toContain('data-ma-density="5.37 kg/m³ (4.38× Earth)"');
    expect(maFull).toContain('data-ma-column-mass="108,506 kg/m² (10.5× Earth!)"');
    expect(maFull).toContain('data-ma-column-mass="1,037,204 kg/m² (100× Earth!)"');

    const auJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'jupiter' },
    });
    expect(auJup).toContain('data-aurora-electron-kev="~100–1,000+ keV (relativistic!)"');
    expect(auJup).toContain('data-aurora-magnetosphere="~60–100 R_J (~6M km — largest in Solar System!)"');

    const auMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAuSS: true, auPl: 'mars' },
    });
    expect(auMars).toContain('data-aurora-electron-kev="~0.1–2 keV (solar energetic particles)"');
    expect(auMars).toContain('data-aurora-magnetosphere="Induced ionosphere (~1.3 R_M · no global shield)"');

    const exEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exTarget: 'earthTwin' },
    });
    expect(exEarth).toContain('data-exmth-transit-prob="~0.47% (~1 in 215 systems @ 1.0 AU!)"');
    expect(exEarth).toContain('data-exmth-ang-sep="0.100″ at 10 pc (100 mas — HWO target!)"');

    const exJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showExMth: true, exTarget: 'hotJup' },
    });
    expect(exJup).toContain('data-exmth-transit-prob="~9.3% (~1 in 11 systems @ 0.05 AU)"');
  });

  it('adds specific kinetic energy/Mach equivalent to Cosmic Speeds Chart and spatial collapse scale/milestone to Star Forming Region', () => {
    const cspPsp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'parker' },
    });
    expect(cspPsp).toContain('data-csp-spec-ke="18.4 GJ/kg (~4,405× TNT)"');
    expect(cspPsp).toContain('data-csp-mach="Mach 560 in air"');

    const cspLight = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCSp: true, cspSel: 'light' },
    });
    expect(cspLight).toContain('data-csp-spec-ke="Infinite for mass (photons: E = hf, rest mass = 0)"');
    expect(cspLight).toContain('data-csp-mach="Mach 874,029 (ultimate cosmic speed limit)"');

    const sfr0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 0 },
    });
    expect(sfr0).toContain('data-sfr-scale="~10–50 ly (~10⁶ AU · t_ff ~3 Myr)"');
    expect(sfr0).toContain('data-sfr-milestone="Jeans mass M_J ~10–100 M☉ triggers collapse"');

    const sfr3 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSFR: true, sfrStage: 3 },
    });
    expect(sfr3).toContain('data-sfr-scale="~1 R☉ (1.4M km star) inside ~5–20 ly H II nebula"');
    expect(sfr3).toContain('data-sfr-milestone="Core passes 10⁷ K → pp-chain H → He fusion!"');
  });

  it('adds horizon tidal pull/light-crossing time to Black Hole Vocabulary, SMBH/dark-matter halo to Galaxy Types Gallery, and expansion dynamics/engine to Famous Nebulae', () => {
    const bhgM87 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgScale: 'm87' },
    });
    expect(bhgM87).toContain('data-bhg-horizon-tide="~5×10⁻¹¹ g (imperceptible at horizon!)"');
    expect(bhgM87).toContain('data-bhg-light-cross="35.6 hr (~1.48 days!)"');

    const bhgStel = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBHG: true, bhgScale: 'stellar' },
    });
    expect(bhgStel).toContain('data-bhg-horizon-tide="~21M g (fatal far outside horizon!)"');
    expect(bhgStel).toContain('data-bhg-light-cross="0.20 ms (197 µs)"');

    const gtDw = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGT: true, gtSel: 'dw' },
    });
    expect(gtDw).toContain('data-gt-smbh="Rare / none (tiny gravity well)"');
    expect(gtDw).toContain('data-gt-dm-halo="~90–99% dark matter (highest M/L!)"');

    const gtE0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGT: true, gtSel: 'e0' },
    });
    expect(gtE0).toContain('data-gt-smbh="10⁸–10¹⁰ M☉ (M87*: 6.5B M☉!)"');

    const nebCrab = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showNeb: true, nebIdx: 1 },
    });
    expect(nebCrab).toContain('data-neb-dynamics="~1,500 km/s blast wave (~972 yr since 1054 CE!)"');
    expect(nebCrab).toContain('data-neb-engine="30 Hz Crab Pulsar wind (synchrotron glow)"');
  });

  it('adds degeneracy support/remnant escape speed to How Stars Die and escape-velocity range/atmosphere paradox to 10 Most Famous Moons', () => {
    const deathSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 1 },
    });
    expect(deathSun).toContain('data-death-pressure="Electron degeneracy pressure (Pauli exclusion)"');
    expect(deathSun).toContain('data-death-vesc="5,148 km/s (1.7% c)"');

    const deathNs = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 15 },
    });
    expect(deathNs).toContain('data-death-pressure="Neutron degeneracy + strong nuclear repulsion"');
    expect(deathNs).toContain('data-death-vesc="~70% c (~209,000 km/s!)"');

    const deathBh = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDeath: true, deathMass: 35 },
    });
    expect(deathBh).toContain('data-death-vesc="100% c at event horizon (299,792 km/s)"');

    const fmAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFM: true, fmFilter: 'all' },
    });
    expect(fmAll).toContain('data-fm-vesc-range="0.23 km/s (Enceladus) to 2.75 km/s (Ganymede)"');
    expect(fmAll).toContain('data-fm-atmo-paradox="Titan (2.64 km/s @ 94 K) keeps 1.45 atm N₂; warmer Ganymede (2.75 km/s) cannot"');
    expect(fmAll).toContain('data-moon-vesc="2.64 km/s"');

    const fmPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFM: true, fmFilter: 'pluto' },
    });
    expect(fmPluto).toContain('data-fm-vesc-range="1.45 km/s (Triton) to 2.75 km/s (Ganymede)"');
  });

  it('adds 1/r^2 radio loss/fleet span to Famous Space Missions, longest totality/eclipse season to Upcoming Eclipses, and 1g grain KE/speed apex to Meteor Shower Calendar', () => {
    const mpAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMP: true, mpFilter: 'all' },
    });
    expect(mpAll).toContain('data-mp-signal-loss="4.07B× fainter (−96.1 dB vs Moon)"');
    expect(mpAll).toContain('data-mp-era-span="1969–2024 (55 yr span · 12 missions)"');

    const mpMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMP: true, mpFilter: 'mars' },
    });
    expect(mpMars).toContain('data-mp-signal-loss="343k× fainter (−55.4 dB vs Moon)"');
    expect(mpMars).toContain('data-mp-era-span="1976–2021 (45 yr span · 3 missions)"');

    const ecAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showECat: true, ecatFilter: 'all', ecatReg: 'all' },
    });
    expect(ecAll).toContain('data-ecat-longest="Solar max: 2027 Aug 2 (6m 23s) · Lunar max: 2029 Jun 26 (102 min)"');
    expect(ecAll).toContain('data-ecat-season="Eclipse season every 173.3 d (½ eclipse yr) · 3 Saros = 54y 34d Exeligmos"');

    const ecAmSol = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showECat: true, ecatFilter: 'solar', ecatReg: 'americas' },
    });
    expect(ecAmSol).toContain('data-ecat-longest="Solar max: 2045 Aug 12 (6m 06s)"');

    const msAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS: true, msHemi: 'all' },
    });
    expect(msAll).toContain('data-ms-peak-ke="Leonids: 2.52 MJ per 1 g grain (~0.60 kg TNT)"');
    expect(msAll).toContain('data-ms-apex="20–71 km/s (Earth’s 29.8 km/s orbit boosts post-midnight apex!)"');

    const msSouth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS: true, msHemi: 'south' },
    });
    expect(msSouth).toContain('data-ms-apex="35–71 km/s (Earth’s 29.8 km/s orbit boosts post-midnight apex!)"');
  });

  it('adds parallax/ruler method and human-height power-of-10 to Cosmic Distance Reference and speed-vs-light/footprint to Messages to the Stars', () => {
    const distProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 8 },
    });
    expect(distProx).toContain('data-dist-parallax="1.30 pc (parallax p = 769 mas — Gaia exact!)"');
    expect(distProx).toContain('data-dist-human-pow="10^16.4× human height (1.7 m)"');

    const distUniv = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDist: true, distRefSel: 12 },
    });
    expect(distUniv).toContain('data-dist-parallax="Cosmological Hubble flow (redshift z + Planck CMB)"');
    expect(distUniv).toContain('data-dist-human-pow="10^26.7× human height (1.7 m)"');

    const msgVoy = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMsg: true, msgSel: 'voyager' },
    });
    expect(msgVoy).toContain('data-msg-speed-vs-c="17,635× slower than Arecibo radio beam"');
    expect(msgVoy).toContain('data-msg-footprint="~0.0027 ly (~166 AU · ~17,635 yr per light-year)"');

    const msgAre = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMsg: true, msgSel: 'arecibo' },
    });
    const expAreLy = Math.max(50, new Date().getFullYear() - 1974);
    expect(msgAre).toContain('data-msg-speed-vs-c="1× speed of light (17,635× faster than Voyager 1!)"');
    expect(msgAre).toContain(`data-msg-footprint="~${expAreLy} ly out (1/r² beam dims to ~10⁻²³ W/m² at M13)"`);
  });

  it('adds observational tool era and cohort split to Astronomy Hall of Fame, median and skew to Solar System Side-by-Side, and limiting magnitude and gear split to Tonight Sky Observing Guide', () => {
    const astrAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'all', astrSel: -270 },
    });
    expect(astrAll).toContain('data-astr-tool-era="Naked-eye geometry + astrometry (pre-telescope)"');
    expect(astrAll).toContain('data-astr-split="8 classical · 6 astrophysics · 6 space (4 pre-telescope / 16 telescope+space)"');

    const astrJwst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstr: true, astrEra: 'space', astrSel: 2021 },
    });
    expect(astrJwst).toContain('data-astr-tool-era="Space observatories + interstellar exploration"');
    expect(astrJwst).toContain('data-astr-split="6 space-age milestones (0 pre-telescope / 6 telescope+space)"');

    const sqcDiam = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'diameter', sqcSun: false },
    });
    expect(sqcDiam).toContain('data-sqc-median="12,742 km (Earth)"');
    expect(sqcDiam).toContain('data-sqc-mean-skew="Mean 43,903 km (Jupiter = 3.2× mean)"');

    const sqcSunMoons = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'diameter', sqcSun: true },
    });
    expect(sqcSunMoons).toContain('data-sqc-median="30,993 km (Earth–Neptune)"');
    expect(sqcSunMoons).toContain('data-sqc-mean-skew="Mean 178,783 km (Sun = 7.8× mean)"');

    const sqcTemp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSQC: true, sqcMetric: 'temp', sqcSun: false },
    });
    expect(sqcTemp).toContain('data-sqc-median="-110°C (Jupiter)"');
    expect(sqcTemp).toContain('data-sqc-mean-skew="Mean -32.1°C (Earth +47°C vs mean)"');

    const tntAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTNT: true, tntGear: 'all', tntSky: 'all' },
    });
    expect(tntAll).toContain('data-tnt-mag-limit="m_V ~+6.0 eye / +9.5 binos / +11.5 small scope"');
    expect(tntAll).toContain('data-tnt-gear-split="5 naked-eye · 3 binocular · 2 small-scope"');

    const tntCityScope = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTNT: true, tntGear: 'scope', tntSky: 'city' },
    });
    expect(tntCityScope).toContain('data-tnt-mag-limit="m_V ~+9.5 urban (60–80 mm scope cuts skyglow)"');
    expect(tntCityScope).toContain('data-tnt-gear-split="0 naked-eye · 0 binocular · 2 small-scope"');
  });

  it('adds seasonal noon Sun altitude and galactic viewing geometry to Maine Night Sky by Season and sidereal day rate and solar midnight meridian to Why UTC Matters', () => {
    const ms2NorthWinter = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'north', ms2Season: 0 },
    });
    expect(ms2NorthWinter).toContain('data-ms2-sun-noon-alt="21.6° noon Sun (45°N winter · ~8.7 h daylight)"');
    expect(ms2NorthWinter).toContain('data-ms2-galactic-view="Outward toward Perseus Arm (winter Milky Way anti-center)"');

    const ms2SouthWinter = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMS2: true, skyHemi: 'south', ms2Season: 2 },
    });
    expect(ms2SouthWinter).toContain('data-ms2-sun-noon-alt="31.6° noon Sun (35°S winter · ~9.8 h daylight)"');
    expect(ms2SouthWinter).toContain('data-ms2-galactic-view="Directly into Galactic Core (26,000 ly to Sgr A* at zenith!)"');

    const utc06 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 6 },
    });
    expect(utc06).toContain('data-utc-sidereal="23h 56m 04s sidereal day (stars rise 3m 56s earlier daily)"');
    expect(utc06).toContain('data-utc-midnight-lon="90° W (Americas / Chile + US dark)"');

    const utc12 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 12 },
    });
    expect(utc12).toContain('data-utc-midnight-lon="180° Date Line (Pacific / Mauna Kea dark)"');

    const utc18 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showUTC: true, utcHour: 18 },
    });
    expect(utc18).toContain('data-utc-midnight-lon="90° E (Asia / Australia dark)"');
  });

  it('adds unbraked free-fall speed and real orbit-to-surface delta-v to Lunar Lander, spin barrier and microgravity to Asteroid Composition, and Earth-Moon separation and camera optics to Pale Blue Dot', () => {
    const landerMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'moon' },
    });
    expect(landerMoon).toContain('data-lander-freefall="32.5 m/s free-fall (~117 km/h if engines cut)"');
    expect(landerMoon).toContain('data-lander-orbit-dv="~1.87 km/s orbit-to-surface (100% rocket braking)"');

    const landerTitan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'titan' },
    });
    expect(landerTitan).toContain('data-lander-freefall="~4.5 m/s chute terminal (29.7 m/s vacuum)"');
    expect(landerTitan).toContain('data-lander-orbit-dv="~0.05 km/s retro (99% aerobraked by 1.45 atm N₂!)"');

    const landerMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLander: true, landerWorld: 'mars' },
    });
    expect(landerMars).toContain('data-lander-freefall="49.2 m/s free-fall (~177 km/h if engines cut)"');
    expect(landerMars).toContain('data-lander-orbit-dv="~0.6–0.8 km/s retro (heat shield + chutes shed ~90%)"');

    const astC = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'cType' },
    });
    expect(astC).toContain('data-ast-spin-barrier="2.90 hr rubble-pile limit (faster flings loose regolith!)"');
    expect(astC).toContain('data-ast-microg="19 µg (70 kg astronaut weighs 1.3 g!)"');

    const astM = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAstComp: true, astType: 'mType' },
    });
    expect(astM).toContain('data-ast-spin-barrier="1.57 hr rubble-pile limit (solid rock/metal can spin faster)"');
    expect(astM).toContain('data-ast-microg="63 µg (70 kg astronaut weighs 4.4 g!)"');

    const pbdVoy = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'voyager' },
    });
    expect(pbdVoy).toContain('data-pbd-em-sep="~13.2″ max Earth–Moon gap (far below 60″ eye limit)"');
    expect(pbdVoy).toContain('data-pbd-camera="Voyager ISS Narrow-Angle (1,500 mm f/8.5 · 0.12 px Earth)"');

    const pbdCur = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showClose: true, pbdView: 'curiosity' },
    });
    expect(pbdCur).toContain('data-pbd-em-sep="~8.3′ max Earth–Moon gap (~quarter Full Moon — split by eye!)"');
    expect(pbdCur).toContain('data-pbd-camera="Curiosity Mastcam-100 (100 mm telephoto · Martian twilight)"');
  });

  it('adds skyglow multiplier and Dawes aperture optics to Astronomy Toolkit Guide and live status split and cosmic reach to Space News Timeline', () => {
    const toolsB3 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 3, toolsTier: 'all' },
    });
    expect(toolsB3).toContain('data-bortle-skyglow-x="1.2× natural sky (rural horizon domes only)"');
    expect(toolsB3).toContain('data-tools-optics="7 mm eye → 203 mm 8-inch scope (1× to 841× light · Dawes down to 0.57″)"');

    const toolsB9Adv = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTools: true, bortle: 9, toolsTier: 'advanced' },
    });
    expect(toolsB9Adv).toContain('data-bortle-skyglow-x="69× brighter sky (urban glow buries Milky Way!)"');
    expect(toolsB9Adv).toContain('data-tools-optics="203 mm 8-inch reflector (841× eye light · Dawes 0.57″ · mag +14.2!)"');

    const wnAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFilter: 'all', wnFuture: false },
    });
    const nowIso = new Date().toISOString().slice(0, 10);
    const wnIsos = ['2024-01-19', '2024-02-22', '2024-04-08', '2024-10-14', '2026-08-12', '2026-11-30', '2027-05-01', '2027-08-02', '2028-07-01', '2030-04-11', '2031-07-01'];
    const expComp = wnIsos.filter((iso) => iso < nowIso).length;
    const expUp = wnIsos.filter((iso) => iso >= nowIso).length;
    expect(wnAll).toContain(`data-wn-status-split="${expComp} completed · 1 active · ${expUp} upcoming"`);
    expect(wnAll).toContain('data-wn-reach="384,400 km Moon → 9.5 AU Titan → 13.5+ Bly cosmic dawn"');

    const wnPlan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFilter: 'planets', wnFuture: false },
    });
    expect(wnPlan).toContain('data-wn-reach="0.39–9.5 AU (Mercury to Saturn’s moon Titan · 1.4B km)"');

    const wnTele = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showWN: true, wnFilter: 'telescopes', wnFuture: false },
    });
    expect(wnTele).toContain('data-wn-reach="13.5+ billion ly lookback (cosmic dawn + dark energy)"');
  });

  it('adds Sun apparent magnitude and radio path loss to Light-Year Walker, radiation and tidal resonance to Habitable Moons, and scale height and MAVEN CO2 cap to Mars Terraforming Lab', () => {
    const lyMoon = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 0 },
    });
    expect(lyMoon).toContain('data-ly-sun-mag="Sun m_V −26.7 (1.00 AU · full Earth daylight!)"');
    expect(lyMoon).toContain('data-ly-fsl-db="0.0 dB baseline (384,400 km radio link)"');

    const lyProx = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 5 },
    });
    expect(lyProx).toContain('data-ly-sun-mag="Sun shines at m_V +0.4 (bright 1st-mag star!)"');
    expect(lyProx).toContain('data-ly-fsl-db="−160.4 dB vs Moon (1.1e+16× fainter!)"');

    const lyAnd = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLY: true, lyDist: 8 },
    });
    expect(lyAnd).toContain('data-ly-sun-mag="Sun drops to m_V +29.3 (faint even for JWST!)"');
    expect(lyAnd).toContain('data-ly-fsl-db="−275.9 dB vs Moon (3.9e+27× fainter!)"');

    const habEur = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'europa' },
    });
    expect(habEur).toContain('data-hab-rad="~5.4 Sv/day (lethal surface — creates O₂ oxidants; ocean shielded!)"');
    expect(habEur).toContain('data-hab-tidal="1:2:4 Laplace resonance with Io + Ganymede (e = 0.009 → ~10 TW tide)"');

    const habEnc = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHabMoons: true, habMoon: 'enceladus' },
    });
    expect(habEnc).toContain('data-hab-rad="~0.0001 Sv/day (benign — Saturn rings sweep radiation belts!)"');
    expect(habEnc).toContain('data-hab-tidal="2:1 resonance with Dione (e = 0.0047 → ~15 GW south-pole vents)"');

    const tfToday = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 0, tfIce: 0, tfTrees: 0 },
    });
    expect(tfToday).toContain('data-tf-scale-h="10.7 km scale height (1.3× Earth’s 8.5 km — lower 0.38g!)"');
    expect(tfToday).toContain('data-tf-maven-gap="Within Mars native CO₂ budget (≤0.02 atm MAVEN cap)"');

    const tfBio = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTerraform: true, tfCO2: 100, tfIce: 85, tfTrees: 95 },
    });
    expect(tfBio).toContain('data-tf-scale-h="15.5 km scale height (1.8× Earth’s 8.5 km — lower 0.38g!)"');
    expect(tfBio).toContain('data-tf-maven-gap="29× native Mars CO₂ (needs comet/asteroid volatile import!)"');
  });

  it('adds mean stellar density and telescope class to Cepheid Variable Star and system barycenter offset and gravity-well escape velocity to Solar System At a Glance', () => {
    const cepDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 5.4, pvAppMag: 3.9 },
    });
    expect(cepDef).toContain('data-cepheid-density="0.075 kg/m³ (~16× thinner than Earth air!)"');
    expect(cepDef).toContain('data-cepheid-telescope="Naked eye visible (m_V 3.9 — e.g. δ Cephei!)"');

    const cepM31 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 31.4, pvAppMag: 19.0 },
    });
    expect(cepM31).toContain('data-cepheid-density="0.0028 kg/m³ (~445× thinner than Earth air!)"');
    expect(cepM31).toContain('data-cepheid-telescope="2–8 m research observatory (Hubble 1923 Hooker 2.5 m!)"');

    const cepM100 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPVar: true, pvPer: 40.0, pvAppMag: 25.2 },
    });
    expect(cepM100).toContain('data-cepheid-telescope="Space telescope required (Hubble / JWST · m_V 25.2)"');

    const sagJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagCompare: 'jupiter' },
    });
    expect(sagJup).toContain('data-sag-barycenter="Sun–Jupiter barycenter sits at 1.07 R☉ (47,000 km outside Sun!)"');
    expect(sagJup).toContain('data-sag-vesc="59.5 km/s escape speed (2.53g cloud tops · 5.3× Earth v_esc)"');

    const sagSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSAG: true, sagCompare: 'sun' },
    });
    expect(sagSun).toContain('data-sag-barycenter="Wobbles 0.0–2.17 R☉ around Sun center (often outside Sun!)"');
    expect(sagSun).toContain('data-sag-vesc="617.5 km/s escape speed (28.0g surface · 55× Earth v_esc)"');
  });

  it('adds umbral cone length and disk obscuration to Eclipse Theater, impact energy and kinetic impactor fleet to Asteroid Defender, and faint-galaxy photon rate and cosmic scale factor to Hubble Deep Field', () => {
    const eclTot = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseAlign: 50, eclipseDist: 368000 },
    });
    expect(eclTot).toContain('data-eclipse-umbra-len="Umbra 374,200 km (+12,571 km past Earth surface — Total!)"');
    expect(eclTot).toContain('data-eclipse-obscuration="100.0% Sun covered (corona 10⁶× fainter glows!)"');

    const eclAnn = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'solar', eclipseAlign: 50, eclipseDist: 405000 },
    });
    expect(eclAnn).toContain('data-eclipse-umbra-len="Umbra 374,200 km (24,429 km short of Earth — Annular!)"');
    expect(eclAnn).toContain('data-eclipse-obscuration="85.5% Sun covered (14.5% blinding ring left!)"');

    const eclLun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showEclipse: true, eclipseType: 'lunar', eclipseAlign: 50 },
    });
    expect(eclLun).toContain('data-eclipse-umbra-len="Earth umbra 1,384,000 km (3.6× Moon orbit — never annular!)"');
    expect(eclLun).toContain('data-eclipse-obscuration="Moon crosses umbra at ~1.02 km/s (~3,680 km/h)"');

    const defWave1 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDefender: true },
    });
    expect(defWave1).toContain('data-def-energy-mt="~155 Mt TNT (regional hazard · 20 km/s impact)"');
    expect(defWave1).toContain('data-def-impactor="~3.0 t impactor (~5× DART 570 kg @ 6.6 km/s, β = 3.6)"');

    const hdfHub = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'hubble', hdfFocus: 'all' },
    });
    expect(hdfHub).toContain('data-hdf-photon-rate="~1 photon every 100 s @ m_AB 31 (4.5 m² · 10-day HUDF!)"');
    expect(hdfHub).toContain('data-hdf-scale-factor="a = 1.00 → 0.065 (Universe 1× to 15.3× smaller across frame)"');

    const hdfJwst = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHDF: true, hdfMode: 'jwst', hdfFocus: 'early' },
    });
    expect(hdfJwst).toContain('data-hdf-photon-rate="~1 photon every 14 s @ m_AB 31 (25.4 m² · 5.6× faster!)"');
    expect(hdfJwst).toContain('data-hdf-scale-factor="a ≈ 0.065 at z = 14.3 (Universe 15.3× smaller · 290 Myr old!)"');
  });

  it('adds Solar System zone split and farthest orbital frontier to Your Cosmic Journey and category split and observing window to Astronomy Bucket List', () => {
    const jnyMars = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSummary: true, planetsVisited: ['Earth', 'Mars'] },
    });
    expect(jnyMars).toContain('data-journey-zones="2/4 rocky · 0/4 giants · 0/1 Kuiper"');
    expect(jnyMars).toContain('data-journey-farthest-au="1.52 AU — Mars (12.6 min light-time from Sun)"');

    const jnyGrand = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSummary: true, planetsVisited: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] },
    });
    expect(jnyGrand).toContain('data-journey-zones="4/4 rocky · 4/4 giants · 1/1 Kuiper"');
    expect(jnyGrand).toContain('data-journey-farthest-au="39.50 AU — Pluto (5.5 hr light-time from Sun!)"');

    const blDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBL: true, bucketDone: [], blCat: 'all' },
    });
    expect(blDef).toContain('data-bucket-cat-split="0/8 free · 0/4 optics · 0/3 rare"');
    expect(blDef).toContain('data-bucket-window="Rare travel event (~18 mo globally · Aug 2026 / Aug 2027)"');

    const blFree = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBL: true, bucketDone: [0, 2, 3], blCat: 'free' },
    });
    expect(blFree).toContain('data-bucket-cat-split="1/8 free · 1/4 optics · 1/3 rare"');
    expect(blFree).toContain('data-bucket-window="Mid-August (Perseids) or mid-December (Geminids) post-midnight"');
  });

  it('adds magnetopause standoff and hemispheric power to Aurora Tuner, horizon density and Kerr ISCO period to Black Hole Visualizer, and galactic escape speed and gas share to Galaxy Spiral Map', () => {
    const aurDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 50, auroraLat: 65, auroraAlt: 120 },
    });
    expect(aurDef).toContain('data-aurora-mpause="8.1 R⊕ (outside 6.6 R⊕ GEO satellites)"');
    expect(aurDef).toContain('data-aurora-power-gw="~75 GW hemispheric power (Kp 5 · substorm!)"');

    const aurG5 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAurora: true, auroraWind: 100, auroraLat: 43, auroraAlt: 280 },
    });
    expect(aurG5).toContain('data-aurora-mpause="5.9 R⊕ (INSIDE 6.6 R⊕ GEO satellite orbit!)"');
    expect(aurG5).toContain('data-aurora-power-gw="~704 GW hemispheric power (Kp 9 · grid-scale!)"');

    const bhCyg = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 9, bhSpin: 95 },
    });
    expect(bhCyg).toContain('data-bh-density="10^16.6 kg/m³ (ultra-dense!)"');
    expect(bhCyg).toContain('data-bh-isco-period="1.59 ms / orbit (~68% c at ISCO)"');

    const bhM87 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBlackHole: true, bhMass: 98, bhSpin: 90 },
    });
    expect(bhM87).toContain('data-bh-density="0.44 kg/m³ (thinner than air!)"');
    expect(bhM87).toContain('data-bh-isco-period="6.8 d / orbit (~63% c at ISCO)"');

    const galBar = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGalaxy: true, galType: 'barred' },
    });
    expect(galBar).toContain('data-gal-vesc="~550 km/s at Sun (Milky Way Gaia DR3 · ~2.4× circular speed)"');
    expect(galBar).toContain('data-gal-gas-share="~8–12% cool gas funneled by bar (~50% of bright spirals are barred!)"');

    const galEll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showGalaxy: true, galType: 'elliptical' },
    });
    expect(galEll).toContain('data-gal-vesc="~1,200–1,800 km/s (massive Virgo halo traps hot X-ray gas!)"');
    expect(galEll).toContain('data-gal-gas-share="≤1% cool gas + hot 10⁷ K X-ray halo (~15% of bright galaxies)"');
  });

  it('adds human atom count and kilonova r-process origins to Final Inspiration and realm split and physics mechanism focus to Surprising Planet Facts', () => {
    const insp = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showIns: true },
    });
    expect(insp).toContain('data-insp-atom-count="~7×10²⁷ atoms in 70 kg (~63% H atoms by count = 13.8 Gyr old!)"');
    expect(insp).toContain('data-insp-rprocess="Trace iodine, gold + platinum forged in kilonova neutron-star mergers!"');

    const trAll = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTR: true, trMode: 'explore', trCat: 'all' },
    });
    expect(trAll).toContain('data-tr-cat-split="3 inner rocky · 5 outer/Kuiper · 4 ocean/volcanic moons"');
    expect(trAll).toContain('data-tr-mech-focus="12 counterintuitive mechanisms spanning resonance, climate, waves + tides"');

    const trMoons = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTR: true, trMode: 'explore', trCat: 'moons' },
    });
    expect(trMoons).toContain('data-tr-cat-split="0 inner rocky · 0 outer/Kuiper · 4 ocean/volcanic moons"');
    expect(trMoons).toContain('data-tr-mech-focus="Tidal flexing + subsurface oceans + cryogenic methane cycle"');

    const trQuiz = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTR: true, trMode: 'quiz' },
    });
    expect(trQuiz).toContain('data-tr-mech-focus="6 classic astronomy misconceptions (greenhouse, scattering, rings, oceans, tilt, methane)"');
  });

  it('adds spectroscopic log g and bolometric magnitude to Stellar Evolution Timeline, synodic-sidereal lag and Earth phase from Moon to Moon Phase Dial, and exhaust velocity and DSN downlink to Spacecraft Designer', () => {
    const stSunMs = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 15 },
    });
    expect(stSunMs).toContain('data-stellar-logg="log g = 4.44 (dwarf surface)"');
    expect(stSunMs).toContain('data-stellar-mbol="M_bol = +4.74 (Sun-class luminosity)"');

    const stSunRg = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 75 },
    });
    expect(stSunRg).toContain('data-stellar-logg="log g = 0.49 (puffy giant envelope!)"');
    expect(stSunRg).toContain('data-stellar-mbol="M_bol = −2.96 (luminous giant!)"');

    const stSunWd = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showStellarEvo: true, stellarMass: 'sun', stellarPhase: 100 },
    });
    expect(stSunWd).toContain('data-stellar-logg="log g = 8.37 (crushing degenerate crust!)"');
    expect(stSunWd).toContain('data-stellar-mbol="M_bol = +9.74 (dim cooling ember)"');

    const mpFirstQtr = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 90 },
    });
    expect(mpFirstQtr).toContain('data-moon-synodic-lag="~97° inertial orbit (29.53 d synodic vs 27.32 d sidereal · +50 min/d rise)"');
    expect(mpFirstQtr).toContain('data-moon-earth-phase="Last Quarter Earth (50% lit — half-lit Earth over lunar horizon)"');

    const mpNew = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showMoonPhase: true, moonPhasePos: 0 },
    });
    expect(mpNew).toContain('data-moon-earth-phase="Full Earth (100% lit — bright Earthshine lights lunar night!)"');

    const scIonJup = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDesigner: true, scDest: 'jupiter', spacecraft: { core: 'orbiter', power: 'solar', prop: 'ion', payload: ['camera', 'spec'] } },
    });
    expect(scIonJup).toContain('data-sc-exhaust-v="31.38 km/s exhaust (Single-stage feasible!)"');
    expect(scIonJup).toContain('data-sc-downlink="~10–100 kbps X-band (70 m DSN dishes)"');

    const scChemPluto = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showDesigner: true, scDest: 'pluto', spacecraft: { core: 'probe', power: 'rtg', prop: 'chem', payload: ['camera'] } },
    });
    expect(scChemPluto).toContain('data-sc-exhaust-v="3.14 km/s exhaust (Needs multi-stage + gravity assist!)"');
    expect(scChemPluto).toContain('data-sc-downlink="~1–2 kbps X-band (~16 mo to downlink New Horizons!)"');
  });

  it('adds thermal photon energy and Hubble rate to Big Bang Stretch and Bond albedo equilibrium temperature and planet mass to Custom Planet Builder', () => {
    const bbCmb = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 4 },
    });
    expect(bbCmb).toContain('data-bb-photon-ev="~0.26 eV (below H 13.6 eV tail → neutral atoms!)"');
    expect(bbCmb).toContain('data-bb-hubble-rate="~1.5×10⁶ km/s/Mpc (~22,000× faster than today!)"');

    const bbNow = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showBigBang: true, bbTime: 10 },
    });
    expect(bbNow).toContain('data-bb-photon-ev="0.00023 eV (2.725 K · 411 CMB photons per cm³!)"');
    expect(bbNow).toContain('data-bb-hubble-rate="67.4 km/s/Mpc (Planck H₀ · accelerating!)"');

    const cpbEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCustomBuilder: true, builderPl: { core: 'iron', surface: 'water', atmo: 'oxygen', life: true } },
    });
    expect(cpbEarth).toContain('data-cpb-albedo-teq="A = 0.30 · T_eq 255 K (−18°C + 33 K greenhouse → +15°C!)"');
    expect(cpbEarth).toContain('data-cpb-mass-e="1.00 M⊕ (~32% iron core · Mercury reaches ~70%!)"');

    const cpbTitan = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCustomBuilder: true, builderPl: { core: 'ice', surface: 'ice', atmo: 'methane', life: false } },
    });
    expect(cpbTitan).toContain('data-cpb-albedo-teq="A = 0.65 · T_eq 214 K (−59°C @ 1 AU · ice-albedo / CH₄ haze)"');
    expect(cpbTitan).toContain('data-cpb-mass-e="0.38 M⊕ (~50% H₂O ice mantle — icy ocean world!)"');
  });

  it('adds impact angle and beaming fraction to Pulsar Beam Explorer, dipole standoff and mass loss to Solar Wind Lab, and Routh margin and co-rotating period to Lagrange Points Lab', () => {
    const psDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPulsar: true, pulsarTilt: 30, pulsarView: 30, pulsarCone: 10 },
    });
    expect(psDef).toContain('data-ps-impact-beta="β = 0° (direct pole core cut!)"');
    expect(psDef).toContain('data-ps-beaming-frac="17.4% of sky swept (82.6% of random observers never see it)"');

    const psWide = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPulsar: true, pulsarTilt: 60, pulsarView: 60, pulsarCone: 10 },
    });
    expect(psWide).toContain('data-ps-beaming-frac="30.1% of sky swept (69.9% of random observers never see it)"');

    const psMiss = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showPulsar: true, pulsarTilt: 30, pulsarView: 90, pulsarCone: 10 },
    });
    expect(psMiss).toContain('data-ps-impact-beta="β = +60° (misses cone rim by 50°)"');

    const swDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSWind: true, swSpeed: 400, swDens: 5 },
    });
    expect(swDef).toContain('data-sw-mpause="~10.9 R⊕ ideal dipole standoff (well outside 6.6 R⊕ GEO belt)"');
    expect(swDef).toContain('data-sw-mass-loss="0.94 million metric tons/s isotropic (if uniform over 4π at 1 AU)"');

    const swMax = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showSWind: true, swSpeed: 900, swDens: 15 },
    });
    expect(swMax).toContain('data-sw-mpause="~6.9 R⊕ ideal dipole standoff (compressed near 6.6 R⊕ GEO belt)"');
    expect(swMax).toContain('data-sw-mass-loss="6.35 million metric tons/s isotropic (if uniform over 4π at 1 AU)"');

    const lgSun = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLagrange: true, lagrangeSystem: 'sun-earth', lagrangePoint: 'L2' },
    });
    expect(lgSun).toContain('data-lg-routh-margin="0.0078% of Routh limit (stable L4/L5 · 12,825× below cap)"');
    expect(lgSun).toContain('data-lg-synodic-period="365.25 d (1.00 yr co-rotating) · 1.0100 sep from COM"');

    const lgCustom = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showLagrange: true, lagrangeSystem: 'custom', lagrangeMass: 0.04, lagrangePoint: 'L4' },
    });
    expect(lgCustom).toContain('data-lg-routh-margin="103.8% of Routh limit (exceeds 3.852% cap — L4/L5 unstable)"');
    expect(lgCustom).toContain('data-lg-synodic-period="1.00 orbital period (co-rotating) · 0.9806 sep from COM"');
  });

  it('adds peak tidal acceleration and near-far bulge asymmetry to Tidal Forces Visualizer and host star effective temperature and irradiance to Habitable Zone Calculator', () => {
    const tide60 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTides: true, tideDist: 60 },
    });
    expect(tide60).toContain('data-tides-accel="1.12 × 10⁻⁶ m/s² (1.14 × 10⁻⁷ g₀)"');
    expect(tide60).toContain('data-tides-asym="Near bulge +5.1% stronger than far bulge (higher-order 1/d⁴ term)"');

    const tide30 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTides: true, tideDist: 30 },
    });
    expect(tide30).toContain('data-tides-accel="8.95 × 10⁻⁶ m/s² (9.12 × 10⁻⁷ g₀)"');
    expect(tide30).toContain('data-tides-asym="Near bulge +10.5% stronger than far bulge (higher-order 1/d⁴ term)"');

    const hzEarth = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 1.0, hzDist: 1.0 },
    });
    expect(hzEarth).toContain('data-hz-star-teff="5,772 K (peak 502 nm visible)"');
    expect(hzEarth).toContain('data-hz-flux-wm2="1,361 W/m² (Earth = 1,361 W/m²)"');

    const hzTrappist = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showHZ: true, hzLum: 0.0005, hzDist: 0.029 },
    });
    expect(hzTrappist).toContain('data-hz-star-teff="2,507 K (peak 1156 nm near-IR)"');
    expect(hzTrappist).toContain('data-hz-flux-wm2="809 W/m² (Earth = 1,361 W/m²)"');
  });

  it('adds ingress shape and radius recovery to Mercury Transit Lab, horizon view and local gravity to ISS Orbit & Sunlight, and Coriolis parameter and ground spin speed to Foucault Pendulum', () => {
    const mtCentral = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTrans: true, transPhase: 50, transImpact: 0 },
    });
    expect(mtCentral).toContain('data-mt-ingress-frac="0.63% of transit in each edge crossing (boxy flat-bottom curve)"');
    expect(mtCentral).toContain('data-mt-radius-recovery="R_p / R_★ = √(δ_max) = 0.00631 (1/158.5 Sun width · now at 100.0% of peak dip)"');

    const mtGraze = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showTrans: true, transPhase: 50, transImpact: 1.0 },
    });
    expect(mtGraze).toContain('data-mt-ingress-frac="100% partial (V-shaped grazing dip — never reaches full flat bottom)"');
    expect(mtGraze).toContain('data-mt-radius-recovery="R_p / R_★ = √(δ_max) = 0.00631 (1/158.5 Sun width · now at 49.9% of peak dip)"');

    const io400 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showISS: true, issAltitudeKm: 400, issBetaDeg: 0 },
    });
    expect(io400).toContain('data-io-horizon="2,293 km horizon · Earth spans 140.4°"');
    expect(io400).toContain('data-io-local-g="88.5% of surface g (free-fall weightlessness, not zero g)"');

    const io1200 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showISS: true, issAltitudeKm: 1200, issBetaDeg: 0 },
    });
    expect(io1200).toContain('data-io-horizon="4,090 km horizon · Earth spans 114.6°"');
    expect(io1200).toContain('data-io-local-g="70.8% of surface g (free-fall weightlessness, not zero g)"');

    const fc45 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFouc: true, foucLat: 45, foucTime: 6 },
    });
    expect(fc45).toContain('data-fc-coriolis-f="f = +1.031 × 10⁻⁴ s⁻¹ (70.7% of polar max)"');
    expect(fc45).toContain('data-fc-surface-speed="1,184 km/h (329 m/s eastward · cos φ)"');

    const fcEq = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showFouc: true, foucLat: 0, foucTime: 6 },
    });
    expect(fcEq).toContain('data-fc-coriolis-f="f = 0.000 × 10⁻⁴ s⁻¹ (0.0% of polar max)"');
    expect(fcEq).toContain('data-fc-surface-speed="1,674 km/h (465 m/s eastward · cos φ)"');
  });

  it('adds speed of sound and Armstrong boiling check to Atmospheric Layers and true anomaly and sublimation temperature to Comet Orbit Drawer', () => {
    const am0 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAtmos: true, atmAlt: 0 },
    });
    expect(am0).toContain('data-am-sound-speed="340.3 m/s (1,225 km/h · √(γRT))"');
    expect(am0).toContain('data-am-boil-check="Water boils at 100.0°C (sea-level standard)"');

    const am50 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAtmos: true, atmAlt: 50 },
    });
    expect(am50).toContain('data-am-sound-speed="329.8 m/s (1,187 km/h · √(γRT))"');
    expect(am50).toContain('data-am-boil-check="Below 62.5 hPa Armstrong limit — water boils below 37°C (pressure suit required)"');

    const am400 = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showAtmos: true, atmAlt: 400 },
    });
    expect(am400).toContain('data-am-sound-speed="Not calculated above 80 km (sparse gas — continuum sound fades)"');
    expect(am400).toContain('data-am-boil-check="Far above 19 km Armstrong limit — full vacuum spacesuit required"');

    const cobDef = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCOrb: true, cobEcc: 0.85, cobAxisAU: 3, cobMeanAnomaly: 90 },
    });
    expect(cobDef).toContain('data-corb-true-anom="ν = 164.3° (+74.3° vs uniform M = 90°)"');
    expect(cobDef).toContain('data-corb-subl-temp="130 K (−143°C) · Beyond H₂O snow line (CO₂ / CO outgassing)"');

    const cobPeri = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, selectedPlanet: 'Earth', showCOrb: true, cobEcc: 0.85, cobAxisAU: 3, cobMeanAnomaly: 0 },
    });
    expect(cobPeri).toContain('data-corb-true-anom="ν = 0.0° (0.0° offset · matches uniform clock)"');
    expect(cobPeri).toContain('data-corb-subl-temp="414 K (+141°C) · Active H₂O ice sublimation (coma + tail)"');
  });
});
