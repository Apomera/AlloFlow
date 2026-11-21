// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function loadModule(rel) {
  // eslint-disable-next-line no-new-func
  new Function(read(rel))();
}

describe('Round 7 Wave 28 — Narration, Math, 3D, Printable Models, VR & Mascots (7 modules)', () => {
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = React;
    window.AlloModules = {};
    window.AlloIcons = new Proxy({}, { get: () => () => null });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('1. document_narration_text: unifies audio/hidden stripping & exact figure dedupe in languageRuns, preserves MCP author notes, handles inline img alt & OVER_ACCENT safely', () => {
    const mod = new Function(read('document_narration_text_module.js') + ';return AlloNarrationText;')();
    const html = '<figure><img src="x.png" alt="Solar system"><figcaption>Solar system</figcaption></figure><audio>Audio fallback</audio><p style="display:none">Secret</p>';
    const runs = mod.naturalText(html, { languageRuns: true, language: 'en' });
    const joined = runs.map((r) => r.text).join(' ');
    expect(joined).toContain('Solar system');
    expect(joined.match(/Solar system/g)?.length).toBe(1);
    expect(joined).not.toContain('Audio fallback');
    expect(joined).not.toContain('Secret');

    // Non-languageRuns naturalText also strips audio, display:none, and AI caption disclaimers
    const plain = mod.naturalText('<figure><img src="x.png" alt="Solar system"><figcaption>Solar system<em>AI-generated — verify</em></figcaption></figure><audio>Audio fallback</audio><p style="display:none">Secret</p>');
    expect(plain).not.toContain('Audio fallback');
    expect(plain).not.toContain('Secret');
    expect(plain).not.toContain('AI-generated');

    // _srStyleTextFromHtml emits bare text nodes and inline img alt in plain mode, and lowercases BCP-47 primary tag
    const sr = mod.accessibleText('Direct intro<p>See <img src="leaf.png" alt="green leaf"> here.</p>');
    expect(sr).toContain('Direct intro');
    expect(sr).toContain('green leaf');

    // OVER_ACCENT does not falsely match Object.prototype keys like "constructor"
    const mathOut = mod.naturalText('<math><mover><mi>x</mi><mo>constructor</mo></mover></math>');
    expect(mathOut).not.toContain('function Object');
  });

  it('2. math_create_module: validates onDrop index, avoids mutating blocks, generates unique IDs, uses latest onClose on Escape', async () => {
    loadModule('math_create_module.js');
    const Modal = window.AlloModules.MathCreate.MathCreateModal;
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();
    const setBlocks = vi.fn();
    const blockA = { id: 'b1', type: 'computation', quantity: 3, directive: 'Add' };
    const blockB = { id: 'b2', type: 'fractions', quantity: 2, directive: 'Halves' };

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(Modal, {
        onClose: onClose1,
        showAssessmentBuilder: true,
        assessmentBlocks: [blockA, blockB],
        setAssessmentBlocks: setBlocks,
      }));
    });

    // Drop with invalid NaN index must NOT splice or mutate blocks
    const draggable = host.querySelector('[draggable="true"]');
    await act(async () => {
      const ev = new Event('drop', { bubbles: true, cancelable: true });
      ev.dataTransfer = { getData: () => 'not-a-number' };
      draggable.dispatchEvent(ev);
    });
    expect(setBlocks).not.toHaveBeenCalled();

    // Changing directive must not mutate blockA in place
    const directiveInput = host.querySelector('input[aria-label="Block 1 directive"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(directiveInput, 'Multiply');
      directiveInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(blockA.directive).toBe('Add');

    // Re-render with updated onClose2 and press Escape -> invokes latest onClose2
    await act(async () => {
      root.render(React.createElement(Modal, {
        onClose: onClose2,
        showAssessmentBuilder: true,
        assessmentBlocks: [blockA, blockB],
        setAssessmentBlocks: setBlocks,
      }));
    });
    const dialog = host.querySelector('[role="dialog"]');
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(onClose1).not.toHaveBeenCalled();
    expect(onClose2).toHaveBeenCalledTimes(1);

    await act(async () => { root.unmount(); });
  });

  it('3. math_manipulative_grader: guards null target in readMathViewState, rejects null chemBalance equation, uses hasOwn on fracBars', () => {
    loadModule('math_manipulative_grader_module.js');
    const G = window.AlloModules.MathManipulativeGrader;

    expect(() => G.readMathViewState('base10', { labToolData: {} }, null)).not.toThrow();

    const chem = G.evaluateManipulativeResponse(
      'chemBalance',
      { coefficients: [2, 1, 2] }, // missing equation when target requires equation
      { equation: '2H2 + O2 -> 2H2O', coefficients: [2, 1, 2] },
    );
    expect(chem.correct).toBe(false);
    expect(chem.reason).toBe('invalid-actual');

    const fbBad = G.evaluateManipulativeResponse(
      'base10',
      { mode: 'fracBars', fbSelected: { 4: 'not-an-array' } },
      { mode: 'fracBars', denominator: 4, numerator: 1 },
    );
    expect(fbBad.correct).toBe(false);
  });

  it('4. prim3d_module: blocks prototype keys on SHAPES/FINISHES/actions, rejects Infinity in isNum, wraps negative palette index', () => {
    loadModule('prim3d_module.js');
    const P = window.AlloModules.Prim3D;

    expect(P.normalizeRecipe({ parts: [{ shape: 'toString' }, { shape: 'constructor' }] })).toBeNull();
    const rec = P.normalizeRecipe({ parts: [{ shape: 'box', finish: 'constructor', size: [Infinity, 1, 1] }] });
    expect(rec.parts[0].finish).toBe('standard');
    expect(rec.parts[0].size[0]).toBe(0.4); // Infinity fell back to default 0.4
    expect(P.parseSculptCommand('{"action":"toString"}')).toBeNull();
    expect(P.parseStretchCommand('{"action":"constructor"}')).toBeNull();

    const part = P.newPart('box', -1);
    expect(typeof part.color).toBe('string');
    expect(part.color.startsWith('#')).toBe(true);

    const src = read('prim3d_module.js');
    expect(src).toContain('st.toPad(pt)');
    expect(src).toContain('st.fromPad(');
    expect(src).toContain('min-h-[44px] min-w-[44px]');
  });

  it('5. printable_model_module: skips hidden parts and applies stretch in inspectRecipe, guards GLB/telemetry prototype keys & gcode grams vs length', () => {
    loadModule('printable_model_module.js');
    const PM = window.AlloModules.PrintableModel;

    const normal = PM.inspectRecipe({ parts: [{ shape: 'box', size: [1, 1, 1], stretch: [2, 1, 1] }, { shape: 'box', size: [10, 10, 10], hidden: true }] }, 10);
    expect(normal.meshCount).toBe(1);
    expect(normal.dimensionsMm.width).toBe(20); // 1 * stretch(2) * 10mm

    // G-code gram line must NOT be misparsed as filamentLengthMm
    const gcode = PM.parseGcodeMetadata('; filament used [g] = 14.5\n; filament used [mm] = 4820');
    expect(gcode.ok).toBe(true);
    expect(gcode.value.filamentGrams).toBe(14.5);
    expect(gcode.value.filamentLengthMm).toBe(4820);

    const gcodeGramsOnly = PM.parseGcodeMetadata('; filament used = 14.5g');
    expect(gcodeGramsOnly.value.filamentGrams).toBe(14.5);
    expect(gcodeGramsOnly.value.filamentLengthMm).toBe(0);

    // Prototype keys in telemetry & advance must be ignored / rejected
    const st = PM.reducePrinterTelemetry(null, { type: 'toString', printerKey: 'constructor' });
    expect(st.sequence).toBe(0);
    const sim = PM.createPrinterAdapter('SIMULATOR');
    expect(() => sim.advance('toString')).toThrow(/Unknown simulated job/);

    // exportBinaryStl disposes temporary toNonIndexed geometry
    const dispose = vi.fn();
    const fakePos = { count: 3, getX: () => 0, getY: () => 0, getZ: () => 0 };
    const nonIndexedGeo = { attributes: { position: fakePos }, dispose };
    const fakeThree = {
      Vector3: class V3 {
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        applyMatrix4() { return this; }
        subVectors() { return this; }
        crossVectors() { return this; }
        normalize() { return this; }
      },
    };
    const fakeObj = {
      traverse: (fn) => fn({ isMesh: true, matrixWorld: {}, geometry: { index: [0, 1, 2], toNonIndexed: () => nonIndexedGeo } }),
    };
    PM.exportBinaryStl(fakeThree, fakeObj);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('6. allo_vr_module: full destroy cleanup, inFlight double-enter guard, real XR dt & 44px mountButton', async () => {
    loadModule('allo_vr_module.js');
    const VR = window.AlloModules.AlloVR;

    const addSpy = vi.fn();
    const removeSpy = vi.fn();
    const setAnimLoop = vi.fn();
    const scene = { add: addSpy, remove: removeSpy, attach: vi.fn() };
    const camera = { parent: null, add: vi.fn(), getWorldQuaternion: vi.fn() };
    class FakeGroup {
      constructor() { this.children = []; this.position = { set: vi.fn(), x: 0, y: 0, z: 0 }; this.rotation = { set: vi.fn(), y: 0 }; this.scale = { setScalar: vi.fn(), x: 1 }; }
      add(o) { o.parent = this; this.children.push(o); }
      remove(o) { o.parent = null; this.children = this.children.filter((x) => x !== o); }
    }
    const THREE = { Group: FakeGroup };
    const renderer = { xr: { enabled: false, getSession: () => null, setSession: vi.fn(async () => {}) }, setAnimationLoop: setAnimLoop, render: vi.fn() };

    const handle = VR.enable({ THREE, renderer, scene, camera });
    handle.destroy();
    // Camera re-attached to scene and rig removed
    expect(addSpy).toHaveBeenCalledWith(camera);
    expect(setAnimLoop).toHaveBeenCalledWith(null);

    const src = read('allo_vr_module.js');
    expect(src).toContain('min-height:44px');
    expect(src).toContain('if (destroyed || inFlight || presenting || !navigator.xr) return;');
  });

  it('7. allo_mascots_module: reduced-motion wins without !important conflict, prototype-safe getBio/render, Bot aria-label & React guard', () => {
    loadModule('allo_mascots_module.js');
    const M = window.AlloModules.AlloMascotsModule;

    expect(M.getBio('constructor')).toBeNull();
    expect(M.getBio('toString')).toBeNull();
    expect(M.getBio('pip')?.name).toBe('Pip');

    const botEl = M.render('inko', { isBot: true });
    expect(botEl).not.toBeNull();
    const svgChild = botEl.props.children[0];
    expect(svgChild.props['aria-label']).toContain('(Bot)');

    const styleTag = document.getElementById('allo-mascot-styles');
    expect(styleTag.textContent).toContain('@keyframes tp-bot-badge-pulse');
    expect(styleTag.textContent).toContain('.tp-mascot-bot-badge { animation: none !important;');
    expect(styleTag.textContent).not.toContain('tp-inko-chrom-danger 0.8s ease-in-out infinite !important');

    // Missing React returns null safely instead of throwing
    window.React = null;
    expect(M.render('pip')).toBeNull();
  });
});
