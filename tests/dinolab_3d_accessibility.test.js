import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import axe from 'axe-core';
import { setupDinoLab, renderTab, baseData } from './helpers/dino_lab_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));

// Full WCAG axe scans over the larger DinoLab panels are CPU-heavy. They pass
// in well under this budget in isolation, but need headroom under full-suite
// parallel load so a slow worker does not turn a clean audit into a timeout.
const AXE_AUDIT_TIMEOUT_MS = 60000;

describe('Dino Lab 3D Field Station accessibility contract', () => {
  it('supports focused keyboard rotation with live status and cleanup', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D dinosaur reconstruction'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown A D Home'");
    expect(source).toContain("key === 'ArrowLeft'");
    expect(source).toContain("key === 'ArrowRight'");
    expect(source).toContain("key === 'ArrowUp'");
    expect(source).toContain("key === 'ArrowDown'");
    expect(source).toContain("key === 'PageUp'");
    expect(source).toContain("key === 'PageDown'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("canvas.addEventListener('keydown', keyDown)");
    expect(source).toContain("canvas.addEventListener('wheel', wheelZoom, { passive: false })");
    expect(source).toContain("canvas.removeEventListener('wheel', wheelZoom)");
    expect(source).toContain("canvas.removeEventListener('keydown', keyDown)");
    expect(source).toContain('try { canvas.focus(); }');
    expect(source).toContain("outline: canvasFocused ? '3px solid #5eead4' : 'none'");
    expect(source).toContain('Reconstruction returned to its starting view.');
    expect(source).toContain("ref: statusRef, className: 'dinolab-3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(source).toContain("'aria-describedby': viewerDescId + ' ' + statusId");
    expect(source).toContain("var viewerSummary = props.species.common + ' 3D model summary.");
    expect(source).toContain("Visible layers: ' + layerSummary");
    expect(source).toContain("Keyboard controls: Left and Right Arrow or A and D rotate; Up and Down Arrow raise or lower the camera; Page Up and Page Down zoom; Home resets the view.");
    expect(source).toContain("if (!reducedMotion && scanPulse)");
    expect(source).toContain("if (!reducedMotion && assemblyPulse)");
    expect(source).toContain("if (!reducedMotion && claimEvidencePulse)");
    expect(source).toContain("if (!reducedMotion) loggedRings.forEach");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Fossil assembly progress'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Claim strength'");
    expect(source).toContain("role: 'progressbar', 'aria-label': 'Reconstruction challenge progress'");
    expect(source).toContain("scanStatusText = 'Evidence log '");
    expect(source).toContain("assemblyProgressText = 'Assembly '");
    expect(source).toContain("claimReadinessText = 'Claim strength '");
    expect(source).toContain("'aria-label': target.label + ' scan anchor");
    expect(source).toContain("'aria-label': piece.label + ' fossil");
    expect(source).toContain('var DinoFieldStation3DStable = null;');
    expect(source).toContain('if (!DinoFieldStation3DStable) DinoFieldStation3DStable = DinoFieldStation3D;');
    expect(source).toContain('el(DinoFieldStation3DStable, { species: dn,');
    expect(source).toContain('var yawRef = React.useRef({ speciesId: props.species.id, value: -0.35, pitch: 0.18, zoom: 1 });');
    expect(source).toContain('var autoRotateRef = React.useRef(props.autoRotate);');
    expect(source).toContain('var readySpeciesRef = React.useRef(null);');
    expect(source).toContain('autoRotateRef.current = props.autoRotate;');
    expect(source).toContain('yawRef.current.value = yaw;');
    expect(source).toContain('yawRef.current.pitch = pitch;');
    expect(source).toContain('yawRef.current.zoom = zoom;');
    expect(source).toContain('function updateCameraView()');
    expect(source).toContain('var cameraReadoutRef = React.useRef(null);');
    expect(source).toContain('var sceneRef = React.useRef(null);');
    expect(source).toContain('var cameraRef = React.useRef(null);');
    expect(source).toContain('var rendererRef = React.useRef(null);');
    expect(source).toContain('var cameraControlRef = React.useRef(null);');
    expect(source).toContain('var visualMaterialsRef = React.useRef(null);');
    expect(source).toContain('var bodyOpacityRef = React.useRef(28);');
    expect(source).toContain('activeCameraControl = function (nextYaw, nextPitch, nextZoom, message)');
    expect(source).toContain('cameraControlRef.current(view.yaw, view.pitch, view.zoom, view.message);');
    expect(source).toContain('materials.body.opacity = alpha;');
    expect(source).toContain("'aria-label': 'Body inference opacity'");
    expect(source).toContain("className: 'dinolab-3d-view-controls'");
    expect(source).toContain('var previousSceneChildren = scene.children.slice();');
    expect(source).toContain('renderer = rendererRef.current;');
    expect(source).toContain('rendererRef.current = renderer;');
    expect(source).toContain('var mountedScene = sceneRef.current;');
    expect(source).toContain('var measurementIntervalLabels = [];');
    expect(source).toContain('label.visible = w >= 560');
    expect(source).toContain("className: 'dinolab-3d-canvas'");
    expect(source).toContain('function reconstructionProfileFor(dn)');
    expect(source).toContain("profile.coverage = 'limited'");
    expect(source).toContain('function updateCameraReadout()');
    expect(source).toContain("'aria-label': 'Current 3D camera view'");
    expect(source).toContain('new THREE.CanvasTexture(skyCanvas)');
    expect(source).toContain('renderer.outputEncoding = THREE.sRGBEncoding;');
    expect(source).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping;');
    expect(source).toContain('sun.shadow.mapSize.width = 1024;');
    expect(source).toContain('scene.background.dispose();');
    expect(source).toContain("var contactShadowCanvas = document.createElement('canvas');");
    expect(source).toContain('contactShadowContext.createRadialGradient(64, 64, 8, 64, 64, 62)');
    expect(source).toContain('function addAnatomyCallout(label, anchor, offset)');
    expect(source).toContain("addAnatomyCallout('Skull', head");
    expect(source).toContain("addAnatomyCallout('Tail', tailCalloutPoint");
    expect(source).toContain('function addSoftTissueCylinder(a, b, startRadius, endRadius)');
    expect(source).toContain('function addBodyContour(mesh)');
    expect(source).toContain('wireframe: true, depthWrite: false');
    expect(source).toContain('var neckShell = addSoftTissueCylinder(shoulder, head');
    expect(source).toContain('addSoftTissueCylinder(armStartL, armEndL');
    expect(source).toContain('function addTextLabel(text, pos, color, scaleFactor, parent)');
    expect(source).toContain('(parent || model).add(sprite);');
    expect(source).toContain("addTextLabel(rt + ' m'");
    expect(source).toContain('addTextLabel(fmtLength(dn.lengthM)');
    expect(source).toContain('addTextLabel(fmtLength(dn.heightM)');
    expect(source).toContain('3D evidence view updated. Camera view preserved.');
    expect(source).toContain("touchAction: 'none'");
    expect(source).toContain("'Species anatomy cues'");
    expect(source).toContain('They are diagram cues, not specimen scans.');
    expect(source).not.toContain('props.dietColor, props.autoRotate, props.scanTarget');
    expect(source).toContain('new THREE.HemisphereLight(0x9ddcff, 0x3a2418, 0.42)');
    expect(source).toContain('var surveyCorners = [');
    expect(source).toContain('var compassCenter = vec(');
    expect(source).toContain('var compassRing = new THREE.Mesh(new THREE.TorusGeometry');
    expect(source).toContain("'Survey compass'");
    expect(source).toContain('var heightGuideMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });');
    expect(source).toContain("'Height guide'");
    expect(source).toContain('one-meter ticks');
    expect(source).toContain('var intersectionObserver = null;');
    expect(source).toContain("document.addEventListener('visibilitychange', visibilityChanged)");
    expect(source).toContain('new window.IntersectionObserver(function (entries)');
    expect(source).toContain('if (inViewport && pageVisible)');
    expect(source).toContain('intersectionObserver.disconnect()');
    expect(source).toContain("if (/Ceratops/i.test(cladeName))");
    expect(source).toContain("else if (/Stegosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Spinosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Ankylosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Pachycephalosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Therizinosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Dromaeosaur|Troodont/i.test(cladeName))");
    expect(source).toContain("else if (/Tyrannosaur/i.test(cladeName))");
    expect(source).toContain("else if (/Abelisaur/i.test(cladeName))");
    expect(source).toContain("else if (/Oviraptor/i.test(cladeName))");
    expect(source).toContain("else if (/Iguanodont/i.test(cladeName))");
    expect(source).toContain('var tyrantSnout = new THREE.Vector3().copy(head).lerp(snout, 0.60);');
    expect(source).toContain('var oviraptorCrest = addAccentCone');
    expect(source).toContain('var thumbBase = vec(');
    expect(source).toContain('var ribCount = 6;');
    expect(source).toContain('var pelvisHalf = Math.max(');
    expect(source).toContain('var tailJointIndex = 1; tailJointIndex < 7;');
    expect(source).toContain('var interactionPauseUntil = 0;');
    expect(source).toContain('function pauseAutoRotate(ms)');
    expect(source).toContain('pauseAutoRotate(2400);');
    expect(source).toContain('performance.now() >= interactionPauseUntil');
  });

  it('keeps the Dig Site cells and guesses screen-reader reviewable', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("digStatusText = 'Site #'");
    expect(source).toContain("digGridDesc = 'Dig grid with '");
    expect(source).toContain("'aria-disabled': isDug ? 'true' : 'false'");
    expect(source).toContain("var cellLabel = 'Cell ' + (cellIdx + 1)");
    expect(source).toContain("'aria-label': 'Identify the find choices'");
    expect(source).toContain("'aria-pressed': (picked || isAnswer) ? 'true' : 'false'");
    expect(source).not.toContain("disabled: isDug");
  });

  it('exposes visual chart scale semantics outside the 3D lab', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("periodSummary = p.name + ' lasted about '");
    expect(source).toContain("'aria-label': p.name + ' duration on the Mesozoic timeline'");
    expect(source).toContain("deepTimeSummary = 'Compressed Earth history timeline");
    expect(source).toContain("role: 'img', 'aria-label': deepTimeSummary");
    expect(source).toContain("'aria-label': label + ' comparison value'");
    expect(source).toContain("'aria-valuetext': valueText");
    expect(source).toContain("if (scale === 'log') ratio = max > 0 ? Math.log10");
    expect(source).toContain('Time ranges overlap around');
    expect(source).toContain("className: 'dinolab-world-map', role: 'group'");
    expect(source).toContain('Counts describe this curated catalog, not global abundance or biodiversity.');
  });
  it('provides roving keyboard tabs, visible focus, and labeled filter groups', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain("if (!TABS.some(function (tb) { return tb.id === tab; })) tab = 'explore';");
    expect(source).toContain('function handleTabKeyDown(event, index)');
    expect(source).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(source).toContain("event.key === 'ArrowLeft' || event.key === 'ArrowUp'");
    expect(source).toContain("else if (event.key === 'Home') nextIndex = 0;");
    expect(source).toContain("else if (event.key === 'End') nextIndex = TABS.length - 1;");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain("'aria-orientation': 'horizontal'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End'");
    expect(source).toContain('.dinolab-root button:focus-visible');
    expect(source).toContain('outline:3px solid #f8fafc!important');
    expect(source).toContain("'aria-label': 'Filter by geological period'");
    expect(source).toContain("'aria-label': 'Filter by diet'");
    expect(source).toContain("'aria-label': 'Filter by location'");
    expect(source).toContain("'aria-label': 'Sort dinosaurs'");
    expect(source).toContain("className: 'dinolab-explore-layout'");
    expect(source).toContain('function tabGroupFor(id)');
    expect(source).toContain("'data-tab-group': tabGroupFor(tb.id)");
    expect(source).toContain("'aria-label': 'Dino Lab section navigation'");
    expect(source).toContain("className: 'dinolab-section-cue'");
    expect(source).toContain('overflow-x:auto!important');
  });
  it('keeps Quiz and Classify completed choices keyboard-reviewable', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dinolab.js'), 'utf8');
    expect(source).toContain('function pickGroup(g) { if (sAnswered) return;');
    expect(source).toContain("var groupState = isCorrect ? 'correct answer'");
    expect(source).toContain("'aria-disabled': sAnswered ? 'true' : 'false'");
    expect(source).toContain("'aria-pressed': sPicked === g.id ? 'true' : 'false'");
    expect(source).toContain("'aria-label': g.label + ', ' + groupState");
    expect(source).toContain('function pick(i) { if (answered) return;');
    expect(source).toContain("var optionState = isCorrect ? 'correct answer'");
    expect(source).toContain("'aria-disabled': answered ? 'true' : 'false'");
    expect(source).toContain("'aria-pressed': picked === i ? 'true' : 'false'");
    expect(source).toContain("'aria-label': opt + ', ' + optionState");
    expect(source).not.toContain('disabled: sAnswered');
    expect(source).not.toContain('disabled: answered');
  });

  it('moves focus and activates sections with tab-list arrow keys', async () => {
    const api = setupDinoLab();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let data = baseData('explore');
    const render = () => root.render(api.tool.cfg.render({
      React: api.React,
      toolData: { dinoLab: data },
      update: (_toolId, key, value) => {
        data = { ...data, [key]: value };
        render();
      },
      updateMulti: (_toolId, values) => {
        data = { ...data, ...values };
        render();
      },
      announceToSR: () => {},
    }));

    await api.React.act(async () => { render(); });
    const exploreTab = document.getElementById('dinotab-explore');
    expect(exploreTab).not.toBeNull();
    exploreTab.focus();
    await api.React.act(async () => {
      exploreTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(data.tab).toBe('timeline');
    expect(document.activeElement?.id).toBe('dinotab-timeline');
    expect(document.getElementById('dinotab-timeline')?.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('dinotab-explore')?.getAttribute('tabindex')).toBe('-1');

    await api.React.act(async () => { root.unmount(); });
    host.remove();
  });
  it('keeps the same 3D canvas mounted across unrelated Field Station updates', async () => {
    const api = setupDinoLab();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let data = baseData('field3d');
    const render = () => root.render(api.tool.cfg.render({
      React: api.React,
      toolData: { dinoLab: data },
      update: () => {},
      updateMulti: () => {},
      announceToSR: () => {},
    }));

    await api.React.act(async () => { render(); });
    const firstCanvas = host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]');
    expect(firstCanvas).not.toBeNull();

    data = { ...data, field3dChallengeIdx: 1 };
    await api.React.act(async () => { render(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);

    const opacity = host.querySelector('input[aria-label="Body inference opacity"]');
    expect(opacity).not.toBeNull();
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await api.React.act(async () => {
      nativeValueSetter?.call(opacity, '52');
      opacity.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('input[aria-label="Body inference opacity"]')?.value).toBe('52');
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);

    const sideViewButton = [...host.querySelectorAll('.dinolab-3d-view-controls button')].find(button => button.textContent === 'Side');
    expect(sideViewButton).not.toBeNull();
    await api.React.act(async () => { sideViewButton.click(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);

    data = { ...data, field3dShowBody: false, field3dScanTargetIdx: 2, field3dScanLogged: { skull: true }, field3dAssemblyPlaced: { skull: true } };
    await api.React.act(async () => { render(); });
    expect(host.querySelector('canvas[aria-roledescription="Interactive 3D dinosaur reconstruction"]')).toBe(firstCanvas);
    expect(host.querySelector('input[aria-label="Body inference opacity"]')?.disabled).toBe(true);

    await api.React.act(async () => { root.unmount(); });
    host.remove();
  });

  it('renders the Field Station without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    document.body.innerHTML = renderTab('field3d');
    const panel = document.getElementById('dinopanel') || document.body;
    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  }, AXE_AUDIT_TIMEOUT_MS);

  it('renders the Dig Site without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    document.body.innerHTML = renderTab('dig');
    const panel = document.getElementById('dinopanel') || document.body;
    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  }, AXE_AUDIT_TIMEOUT_MS);
  it('renders Quiz, Classify, Map, and Compare without automated structural WCAG A/AA axe violations', async () => {
    setupDinoLab();
    for (const tab of ['quiz', 'classify', 'map', 'compare']) {
      document.body.innerHTML = renderTab(tab);
      const panel = document.getElementById('dinopanel') || document.body;
      const results = await axe.run(panel, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations, tab).toEqual([]);
    }
  }, AXE_AUDIT_TIMEOUT_MS);
});
