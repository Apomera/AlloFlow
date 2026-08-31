// Auto Repair Shop - service-bay realism and viewer presentation contracts.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadTool,
  renderTool,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';

function sourceAt(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe.each([CANONICAL, MIRROR])('Auto Repair realism source: %s', (path) => {
  const source = sourceAt(path);

  it('builds a recognizable working service bay around the engine', () => {
    expect(source).toContain("serviceBay.name = 'service-bay-environment'");
    expect(source).toContain("shopFloor.name = 'epoxy-service-floor'");
    expect(source).toContain("toolCabinet.name = 'shop-tool-cabinet'");
    expect(source).toContain("floorDrain.name = 'service-bay-floor-drain'");
    expect(source).toContain("hoseReel.name = 'retractable-air-hose-reel'");
    expect(source).toContain("liftControl.name = 'two-post-lift-control'");
    expect(source).toContain("hood.name = 'raised-hood-underside'");
    expect(source).toContain('new THREE.PointLight(0xd7efff, 0.30, 5.2, 2)');
    expect(source).toContain('new THREE.BoxGeometry(5.18, 0.20, 0.30)');
  });

  it('layers believable floor wear, lift hardware, and hood task lighting', () => {
    expect(source).toContain("floorPatina.name = 'service-bay-floor-patina'");
    expect(source).toContain("floorSeams.name = 'epoxy-expansion-seam-grid'");
    expect(source).toContain("'service-tyre-scuff-' + scuffIndex");
    expect(source).toContain("liftCarriage.name = 'two-post-lift-carriage'");
    expect(source).toContain("liftPad.name = 'two-post-lift-rubber-pad'");
    expect(source).toContain("anchorBolt.name = 'lift-base-anchor-bolt'");
    expect(source).toContain("hoodInsulation.name = 'hood-insulation-pad'");
    expect(source).toContain("'hood-weather-seal-' + sealIndex");
    expect(source).toContain("hoodLatch.name = 'hood-latch-striker'");
    expect(source).toContain("hoodWorkLight.name = 'hood-mounted-task-light'");
    expect(source).toContain("hoodServiceDecal.name = 'hood-service-information-decal'");
  });

  it('makes the engine state visually meaningful without bypassing reduced motion', () => {
    expect(source).toContain("coolingFan.name = 'radiator-cooling-fan'");
    expect(source).toContain("alternatorPulley.name = 'alternator-pulley-rotor'");
    expect(source).toContain("pulleySpin.name = 'belt-pulley-' + pulleyIndex");
    expect(source).toContain("beltMarker.name = 'belt-witness-mark'");
    expect(source).toContain('frame: engineRunning && !api.reduced ? function (now)');
    expect(source).toContain('var idle = Math.sin(now * 0.034) * 0.0035');
    expect(source).toContain("sceneKey: 'repair-bay-' + kase.id + '-' + engine");
    expect(source).toContain("sceneProps: { engineRunning: engine === 'running', caseId: kase.id, openPart: openPart }");
  });

  it('turns authored repair-case evidence into faithful scene behavior', () => {
    expect(source).toContain("var repairCaseId = api.sceneProps && typeof api.sceneProps.caseId === 'string'");
    expect(source).toContain("coolingFan.userData.faultState = repairCaseId === 'overheat'");
    expect(source).toContain("if (coolingFan && repairCaseId !== 'overheat')");
    expect(source).toContain("glazedBeltSurface.name = 'glazed-belt-surface'");
    expect(source).toContain("'worn-belt-crack-' + beltCrackIndex");
    expect(source).toContain("'positive-terminal-corrosion-' + corrosionIndex");
    expect(source).toContain("fluid.name = lowCoolantEvidence ? 'coolant-below-min-level'");
    expect(source).toContain("capSludge.name = 'oil-cap-milky-sludge'");
  });

  it('builds a supported, serviceable cooling pack instead of floating parts', () => {
    expect(source).toContain("fanShroud.name = 'radiator-fan-shroud'");
    expect(source).toContain("fanMotor.name = 'radiator-fan-motor'");
    expect(source).toContain("fanConnector.name = 'radiator-fan-electrical-connector'");
    expect(source).toContain("'radiator-fan-shroud-mount-' + shroudMountIndex");
    expect(source).toContain("'radiator-side-tank-' +");
    expect(source).toContain("fillerNeck.name = 'radiator-filler-neck'");
    expect(source).toContain("drainCock.name = 'radiator-drain-cock'");
    expect(source).toContain("'radiator-mount-fastener-' + radiatorSupportIndex");
  });

  it('adds geometric service markings that remain visible without textures', () => {
    expect(source).toContain("oilCanMark.name = 'oil-cap-oil-can-symbol'");
    expect(source).toContain("positivePolarity.name = 'battery-positive-polarity-mark'");
    expect(source).toContain("negativePolarity.name = 'battery-negative-polarity-mark'");
    expect(source).toContain("coolantWarningCollar.name = 'coolant-cold-warning-collar'");
    expect(source).toContain("washerCapMark.name = 'washer-cap-spray-symbol'");
    expect(source).toContain("band.name = p.id + '-level-band-'");
  });

  it('adds component-level material and identification cues', () => {
    expect(source).toContain("var fluidHex = p.id === 'coolant'");
    expect(source).toContain("p.id === 'brake'");
    expect(source).toContain('var holdDown = new THREE.Mesh');
    expect(source).toContain('var batteryLabel = new THREE.Mesh');
    expect(source).toContain('for (var coilIndex = 0; coilIndex < 4; coilIndex++)');
    expect(source).toContain("coverGasket.name = 'valve-cover-gasket-seam'");
    expect(source).toContain('var hoseClampMat = new THREE.MeshPhongMaterial');
    expect(source).toContain("0x111827, 'corrugated-intake-duct', 8, true");
    expect(source).toContain("0x121923, 'ignition-wiring-loom', 7, false");
    expect(source).toContain("0xaab4c0, 'brake-hard-line-left', 0, false");
    expect(source).toContain('for (var relayRidge = 0; relayRidge < 4; relayRidge++)');
    expect(source).toContain("meniscus.name = p.id + '-fluid-meniscus'");
    expect(source).toContain("capGrip.name = p.id + '-cap-grip-ring'");
    expect(source).toContain("'valve-cover-fastener-' + engineBoltIndex");
    expect(source).toContain("'intake-manifold-runner-' + runnerIndex");
    expect(source).toContain("'heat-shield-fastener-' + shieldDimpleIndex");
  });

  it('models service inspections with semantic geometry and fault metadata', () => {
    expect(source).toContain("var openPart = api.sceneProps && typeof api.sceneProps.openPart === 'string'");
    expect(source).toContain("stickAssembly.name = 'dipstick-pull-assembly'");
    expect(source).toContain("stickAssembly.userData.inspectionState = dipstickPulled ? 'pulled' : 'seated'");
    expect(source).toContain("minMark.name = 'dipstick-min-mark'");
    expect(source).toContain("maxMark.name = 'dipstick-max-mark'");
    expect(source).toContain("oilFilm.name = 'dipstick-oil-film'");
    expect(source).toContain("oilFilm.userData.faultState = milkyOil ? 'milky'");
    expect(source).toContain("fuseLid.name = 'fusebox-lid-pivot'");
    expect(source).toContain("fuseMap.name = 'fusebox-lid-map'");
    expect(source).toContain("fuseTray.name = 'fusebox-fuse-tray'");
    expect(source).toContain("? 'fusebox-cooling-fan-fuse'");
    expect(source).toContain("fuseAssembly.userData.faultState = blownFuse ? 'blown' : 'intact'");
  });

  it('rebuilds inspection content from explicit under-hood and case state', () => {
    expect(source).toContain("sceneKey: 'underhood-inspection-' + (openPart || 'closed')");
    expect(source).toContain('sceneProps: { openPart: openPart }');
    expect(source).toContain("sceneKey: 'repair-bay-' + kase.id + '-' + engine + '-' + (openPart || 'closed')");
    expect(source).toContain("sceneProps: { engineRunning: engine === 'running', caseId: kase.id, openPart: openPart }");
    expect(source).toContain("var openPart = (d.uhOpenPart === 'fusebox' || d.uhOpenPart === 'dipstick')");
    expect(source).toContain("var openPart = (d.rbOpenPart === 'fusebox' || d.rbOpenPart === 'dipstick')");
  });

  it('replaces the blocky roadside car and wheels with layered assemblies', () => {
    expect(source).toContain("car.name = 'roadside-compact-car'");
    expect(source).toContain("contactShadow.name = 'vehicle-contact-shadow'");
    expect(source).toContain('new THREE.ExtrudeGeometry(bodyShape');
    expect(source).toContain('function glassPanel(points, z, name)');
    expect(source).toContain("frontWindshield.name = 'laminated-front-windshield'");
    expect(source).toContain('var wheelArch = new THREE.Mesh');
    expect(source).toContain('var brakeRotor = new THREE.Mesh');
    expect(source).toContain('for (var spokeIndex = 0; spokeIndex < 5; spokeIndex++)');
    expect(source).toContain('if (!flatOff && !stowed) flat.scale.y = 0.82');
    expect(source).toContain("g.name = 'realistic-wheel-assembly'");
    expect(source).toContain('var rimLip = new THREE.Mesh');
    expect(source).toContain('var scissorArm = new THREE.Mesh');
  });

  it('keeps responsive, reduced-motion, forced-color, and print treatments', () => {
    expect(source).toContain('@keyframes ar-bay-live-pulse');
    expect(source).toContain('@media(max-width:560px){.ar-bay-viewer-frame');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('.ar-bay-viewer-frame, .ar-bay-viewport, .ar-bay-controls');
    expect(source).toContain('@media print{.ar-bay-viewer-frame');
  });
});

describe('Auto Repair realism render contract', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(CANONICAL, ID);
  });

  it('renders a state-aware accessible frame in a live Repair Bay case', () => {
    const host = hostFor(renderTool(ID, {
      autoRepair: {
        view: 'repairbay',
        rbCase: 'charging',
        rbEngine: 'running'
      }
    }));
    const frame = host.querySelector('[data-ar-bay-frame="repair"]');
    const viewport = frame.querySelector('.ar-bay-viewport[data-ar-bay-state="running"]');

    expect(frame).toBeTruthy();
    expect(viewport.getAttribute('role')).toBe('group');
    expect(viewport.getAttribute('tabindex')).toBe('0');
    expect(viewport.getAttribute('aria-label')).toMatch(/Arrow keys rotate/);
    expect(viewport.querySelector('.ar-bay-viewport-hud').getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('.ar-repair-engine-state').dataset.arEngineState).toBe('running');
    expect(frame.querySelectorAll('.ar-bay-controls button').length).toBe(7);
  });

  it('uses the same visual frame for the tour and wheel procedure', () => {
    const tour = hostFor(renderTool(ID, {
      autoRepair: { view: 'underhood' }
    }));
    const tyre = hostFor(renderTool(ID, {
      autoRepair: { view: 'tyre' }
    }));

    expect(tour.querySelector('[data-ar-bay-frame="underhood"] .ar-bay-viewport').dataset.arBayState)
      .toBe('inspection');
    expect(tour.querySelector('.ar-bay-orientation')).toBeTruthy();
    expect(tyre.querySelector('[data-ar-bay-frame="wheel"] .ar-bay-viewport').dataset.arBayState)
      .toBe('procedure');
    expect(tyre.querySelector('[data-ar-bay-frame="wheel"] .ar-bay-hint')).toBeTruthy();
  });

  it('ships byte-identical canonical and desktop sources', () => {
    expect(sourceAt(MIRROR)).toBe(sourceAt(CANONICAL));
  });
});
