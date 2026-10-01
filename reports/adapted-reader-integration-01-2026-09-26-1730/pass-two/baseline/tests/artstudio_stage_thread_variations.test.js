import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const originalMatchMedia = window.matchMedia;
const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
const originalToDataURL = window.HTMLCanvasElement.prototype.toDataURL;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

const THREAD_PALETTE = {
  sourceTab: 'colorWheel',
  harmony: 'triadic',
  colors: [
    { h: 30, s: 80, l: 45 },
    { h: 150, s: 80, l: 45 },
    { h: 270, s: 80, l: 45 },
  ],
};

function makeCanvasContext() {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    canvas: null,
    createImageData: vi.fn((width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
    putImageData: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    measureText: vi.fn(() => ({ width: 12 })),
  };
  return new Proxy(context, {
    get(target, property) {
      if (!(property in target)) target[property] = vi.fn();
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function accessibleName(node) {
  return String(node && (node.getAttribute('aria-label') || node.textContent) || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findButton(root, name) {
  return [...root.querySelectorAll('button')]
    .find((button) => name.test(accessibleName(button))) || null;
}

function findInspectorTab(root, name) {
  return [...root.querySelectorAll('[role="tab"]')]
    .find((tab) => name.test(accessibleName(tab))) || null;
}

async function click(node) {
  expect(node).not.toBeNull();
  await act(async () => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

function studySnapshot({
  id,
  label,
  timestamp,
  parentStudyId = null,
  branchDepth = 0,
  data = {},
}) {
  const studyLabel = label || id;
  return {
    id,
    tool: 'artStudio',
    label: 'Art Studio - Pixel Art',
    timestamp,
    data: {
      tab: 'pixel',
      pixelGrid: 16,
      pixelData: {},
      studioHome: false,
      studioStarted: true,
      ...data,
    },
    artStudioStudy: {
      schemaVersion: 1,
      payloadVersion: 2,
      sourceTab: 'pixel',
      runId: 'variation-run',
      threadId: '',
      stepIndex: null,
      stepLabel: studyLabel,
      previewSrc: 'data:image/webp;base64,' + id,
      previewAlt: studyLabel + ' preview',
      summary: studyLabel + ' saved study',
      reflection: 'keep',
      note: '',
      parentStudyId,
      branchDepth,
    },
  };
}

describe('Art Studio stage, Thread Kit, and branching variations', () => {
  let config;
  let host;
  let root;
  let latestToolData;
  let latestSnapshots;
  let latestSetToolData;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    const canvasContext = makeCanvasContext();
    window.HTMLCanvasElement.prototype.getContext = function () {
      canvasContext.canvas = this;
      return canvasContext;
    };
    window.HTMLCanvasElement.prototype.toDataURL = function () {
      return 'data:image/webp;base64,artstudio-stage-preview';
    };
    window.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = vi.fn();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    latestToolData = null;
    latestSnapshots = null;
    latestSetToolData = null;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  async function mount({ artStudio = {}, snapshots = [] } = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio });
      const [toolSnapshots, setToolSnapshots] = React.useState(snapshots);
      latestToolData = toolData;
      latestSnapshots = toolSnapshots;
      latestSetToolData = setToolData;
      return config.render(makeCtx({
        toolData,
        setToolData,
        toolSnapshots,
        setToolSnapshots,
      }));
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  }

  async function chooseInspector(name) {
    const tab = findInspectorTab(host, name);
    expect(tab, 'Expected a ' + name + ' tab in the Studio inspector').not.toBeNull();
    await click(tab);
    return host.querySelector('#' + tab.getAttribute('aria-controls'));
  }

  it('puts the active creative stage before a labelled Make, Guide, and Process inspector', async () => {
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        pixelData: {},
      },
    });

    const shell = host.querySelector('[data-artstudio-stage-shell="true"]');
    expect(shell).not.toBeNull();
    const stage = shell.querySelector('main[data-artstudio-stage="true"]');
    const inspector = shell.querySelector('aside[data-artstudio-inspector="true"]');
    expect(stage).not.toBeNull();
    expect(inspector).not.toBeNull();
    expect(stage.querySelector('#pixelCanvas')).not.toBeNull();
    expect(stage.compareDocumentPosition(inspector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const tablist = inspector.querySelector('[role="tablist"][aria-label="Studio inspector"]');
    expect(tablist).not.toBeNull();
    const tabs = [...tablist.querySelectorAll(':scope > [role="tab"]')];
    expect(tabs.map(accessibleName)).toEqual(['Make', 'Guide', 'Process']);
    expect(tabs.map((tab) => tab.getAttribute('aria-controls')).every((id) => !!inspector.querySelector('#' + id))).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(inspector.querySelector('#' + tabs[0].getAttribute('aria-controls')).hidden).toBe(false);
  });

  it('changes inspector context without unmounting or replacing the artwork stage', async () => {
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        pixelData: { '0,0': '#ff0000' },
      },
    });

    const canvas = host.querySelector('#pixelCanvas');
    const guidePanel = await chooseInspector(/^Guide$/i);
    expect(guidePanel).not.toBeNull();
    expect(guidePanel.hidden).toBe(false);
    expect(findInspectorTab(host, /^Guide$/i).getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#pixelCanvas')).toBe(canvas);

    const processPanel = await chooseInspector(/^Process$/i);
    expect(processPanel).not.toBeNull();
    expect(processPanel.hidden).toBe(false);
    expect(findInspectorTab(host, /^Process$/i).getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#pixelCanvas')).toBe(canvas);
  });

  it('moves keyboard focus to the Thread Kit when the header shortcut opens it', async () => {
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        pixelData: {},
      },
    });

    await click(findButton(host, /^Open Thread Kit$/i));
    const kitTitle = host.querySelector('#artstudio-thread-kit-title');
    expect(kitTitle).not.toBeNull();
    expect(kitTitle.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(kitTitle);
    expect(findInspectorTab(host, /^Make$/i).getAttribute('aria-selected')).toBe('true');

    const guideTab = findInspectorTab(host, /^Guide$/i);
    guideTab.focus();
    await click(guideTab);
    expect(document.activeElement).toBe(guideTab);
    expect(document.activeElement).not.toBe(kitTitle);
  });

  it('captures the current Color Wheel harmony as a reusable Thread Kit palette', async () => {
    await mount({
      artStudio: {
        tab: 'colorWheel',
        studioHome: false,
        studioStarted: true,
        hue: 30,
        sat: 80,
        lit: 45,
        harmony: 'triadic',
      },
    });

    const addPalette = findButton(host, /^Add palette to Thread Kit$/i);
    expect(addPalette, 'Color Wheel should offer an explicit Thread Kit transfer').not.toBeNull();
    await click(addPalette);

    expect(latestToolData.artStudio.studioThreadKit.schemaVersion).toBe(2);
    expect(latestToolData.artStudio.studioThreadKit.runs).toHaveLength(1);
    expect(latestToolData.artStudio.studioThreadKit.runs[0]).toMatchObject({
      schemaVersion: 1,
      palette: THREAD_PALETTE,
    });
    const kit = host.querySelector('[data-artstudio-thread-kit="true"]');
    expect(kit).not.toBeNull();
    expect(kit.getAttribute('role')).toBe('region');
    expect(kit.getAttribute('aria-labelledby')).toBeTruthy();
    expect(kit.querySelector('#' + kit.getAttribute('aria-labelledby'))).not.toBeNull();
  });

  it('applies the Thread Kit palette explicitly to Pixel Art', async () => {
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        pixelData: {},
        studioThreadKit: { schemaVersion: 1, palette: THREAD_PALETTE },
      },
    });

    const applyPalette = findButton(host, /^Use palette in Pixel Art$/i);
    expect(applyPalette).not.toBeNull();
    await click(applyPalette);

    expect(latestToolData.artStudio).toMatchObject({
      pixelActivePalette: 'threadKit',
      pixelCustomPalette: THREAD_PALETTE.colors,
      pixelHue: 30,
      pixelSat: 80,
      pixelLit: 45,
    });
  });

  it('applies a Thread Kit palette to Pixel Art without recoloring other labs', async () => {
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        hue: 210,
        sat: 35,
        lit: 60,
        symHue: 95,
        symSat: 70,
        symLit: 40,
        spinHue: 15,
        spinSat: 90,
        spinLit: 55,
        pixelData: {},
        studioThreadKit: { schemaVersion: 1, palette: THREAD_PALETTE },
      },
    });

    await click(findButton(host, /^Use palette in Pixel Art$/i));

    expect(latestToolData.artStudio).toMatchObject({
      hue: 210,
      sat: 35,
      lit: 60,
      symHue: 95,
      symSat: 70,
      symLit: 40,
      spinHue: 15,
      spinSat: 90,
      spinLit: 55,
      pixelHue: 30,
      pixelSat: 80,
      pixelLit: 45,
    });
  });

  it('offers isolated local HSL controls across the color-driven maker labs', async () => {
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const cases = [
      { tab: 'spirograph', prefix: 'spiro', canvasId: 'spiroCanvas', resetKey: 'spiroReset' },
      { tab: 'generative', prefix: 'gen', canvasId: 'genCanvas', resetKey: 'genReset' },
      { tab: 'spinArt', prefix: 'spin', canvasId: 'spinCanvas', resetKey: null },
      { tab: 'stringArt', prefix: 'str', canvasId: 'stringCanvas', resetKey: 'strReset' },
    ];

    for (const item of cases) {
      await mount({
        artStudio: {
          tab: item.tab,
          studioHome: false,
          studioStarted: true,
          hue: 9,
          spiroHue: 10,
          spiroSat: 70,
          spiroLit: 40,
          genHue: 20,
          genSat: 80,
          genLit: 50,
          spinHue: 30,
          spinSat: 90,
          spinLit: 60,
          strHue: 40,
          strSat: 60,
          strLit: 70,
        },
      });

      const originalCanvas = host.querySelector('#' + item.canvasId);
      const siblingHueKey = item.prefix === 'spiro' ? 'genHue' : 'spiroHue';
      const originalSiblingHue = latestToolData.artStudio[siblingHueKey];
      for (const [control, value] of [['hue', 222], ['saturation', 0], ['lightness', 0]]) {
        const input = host.querySelector('#artstudio-' + item.prefix + '-' + control);
        expect(input, item.tab + ' should expose ' + control).not.toBeNull();
        await act(async () => {
          nativeValueSetter.call(input, String(value));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await Promise.resolve();
        });
      }

      expect(latestToolData.artStudio).toMatchObject({
        [item.prefix + 'Hue']: 222,
        [item.prefix + 'Sat']: 0,
        [item.prefix + 'Lit']: 0,
        hue: 9,
      });
      expect(latestToolData.artStudio[siblingHueKey]).toBe(originalSiblingHue);
      const currentCanvas = host.querySelector('#' + item.canvasId);
      if (item.resetKey) {
        expect(currentCanvas).not.toBe(originalCanvas);
        expect(latestToolData.artStudio[item.resetKey]).toBeGreaterThan(0);
      } else {
        expect(currentCanvas).toBe(originalCanvas);
        expect(currentCanvas.dataset.hue).toBe('222');
        expect(currentCanvas.dataset.sat).toBe('0');
        expect(currentCanvas.dataset.lit).toBe('0');
      }
    }
  });

  it('applies the first two Thread Kit colors as explicit Contrast roles', async () => {
    await mount({
      artStudio: {
        tab: 'contrast',
        studioHome: false,
        studioStarted: true,
        studioThreadKit: { schemaVersion: 1, palette: THREAD_PALETTE },
      },
    });

    const applyPalette = findButton(host, /^Use palette \+ AA goal in Contrast$/i);
    expect(applyPalette).not.toBeNull();
    await click(applyPalette);

    expect(latestToolData.artStudio).toMatchObject({
      fgH: 30,
      fgS: 80,
      fgL: 45,
      bgH: 150,
      bgS: 80,
      bgL: 45,
      contrastAccessibilityTarget: 4.5,
    });
  });

  it('keeps independent Thread Kits when learners move from project A to B and back', async () => {
    await mount({
      artStudio: {
        tab: 'colorWheel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'run-a',
        studioFreeProjectId: 'run-a',
        hue: 30,
        sat: 80,
        lit: 45,
        harmony: 'triadic',
        pixelHue: 99,
        contrastAccessibilityTarget: 4.5,
      },
    });

    await click(findButton(host, /^AAA 7:1$/i));
    await click(findButton(host, /^Add palette to Thread Kit$/i));

    await act(async () => {
      latestSetToolData((previous) => ({
        ...previous,
        artStudio: {
          ...previous.artStudio,
          studioCurrentProjectRunId: 'run-b',
          hue: 200,
          harmony: 'complementary',
        },
      }));
      await Promise.resolve();
    });

    expect(host.textContent).toContain('No carried materials yet');
    expect(findButton(host, /^AA 4.5:1$/i).getAttribute('aria-pressed')).toBe('true');
    await click(findButton(host, /^Add palette to Thread Kit$/i));

    let runs = latestToolData.artStudio.studioThreadKit.runs;
    expect(runs.map((entry) => entry.runId)).toEqual(['run-a', 'run-b']);
    expect(runs.find((entry) => entry.runId === 'run-a')).toMatchObject({
      accessibilityTarget: 7,
      palette: THREAD_PALETTE,
    });
    expect(runs.find((entry) => entry.runId === 'run-b').palette.colors[0].h).toBe(200);

    await act(async () => {
      latestSetToolData((previous) => ({
        ...previous,
        artStudio: { ...previous.artStudio, studioCurrentProjectRunId: 'run-a' },
      }));
      await Promise.resolve();
    });

    expect(findButton(host, /^Update palette in Thread Kit$/i)).not.toBeNull();
    expect(findButton(host, /^AAA 7:1$/i).getAttribute('aria-pressed')).toBe('true');
    expect(latestToolData.artStudio.pixelHue).toBe(99);
    expect(latestToolData.artStudio.contrastAccessibilityTarget).toBe(4.5);
  });

  it('includes the Thread Kit in the existing durable workflow save and hydration paths', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toMatch(/var workflow = \{[\s\S]{0,1800}studioThreadKit\s*:/);
    expect(source).toMatch(/workflowPatch\.studioThreadKit\s*=/);
  });

  it('records a forked study as a child when that variation is next saved', async () => {
    const original = studySnapshot({ id: 'root-study', label: 'Original study', timestamp: 100 });
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'variation-run',
        studioFreeProjectId: 'variation-run',
        pixelData: {},
      },
      snapshots: [original],
    });

    const processPanel = await chooseInspector(/^Process$/i);
    await click(findButton(processPanel, /^Fork Original study as a new variation$/i));
    await chooseInspector(/^Make$/i);
    await click(findButton(host, /^Save current study$/i));

    expect(latestSnapshots).toHaveLength(2);
    const child = latestSnapshots.find((snapshot) => snapshot.id !== 'root-study');
    expect(child.artStudioStudy).toMatchObject({
      parentStudyId: 'root-study',
      branchDepth: 1,
    });
  });

  it('never replaces an existing Creative Thread checkpoint when saving a pending fork', async () => {
    const original = studySnapshot({ id: 'thread-root', label: 'Thread checkpoint', timestamp: 100 });
    original.artStudioStudy.threadId = 'tiny-night-world';
    original.artStudioStudy.stepIndex = 1;
    const sibling = studySnapshot({
      id: 'thread-sibling',
      label: 'Earlier branch',
      timestamp: 150,
      parentStudyId: 'thread-root',
      branchDepth: 1,
    });
    sibling.artStudioStudy.threadId = 'tiny-night-world';
    sibling.artStudioStudy.stepIndex = 1;
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'variation-run',
        studioThreadId: 'tiny-night-world',
        studioThreadRunId: 'variation-run',
        studioThreadStep: 1,
        studioThreadCompletedSteps: [0],
        pixelData: {},
      },
      snapshots: [original, sibling],
    });

    const processPanel = await chooseInspector(/^Process$/i);
    await click(findButton(processPanel, /^Fork Thread checkpoint as a new variation$/i));
    expect(findButton(host, /^Save current study$/i)).not.toBeNull();
    await click(findButton(host, /^Save current study$/i));

    expect(latestSnapshots).toHaveLength(3);
    const child = latestSnapshots.find((snapshot) => snapshot.id !== 'thread-root' && snapshot.id !== 'thread-sibling');
    expect(child.id).toMatch(/-variation-/);
    expect(child.artStudioStudy).toMatchObject({
      parentStudyId: 'thread-root',
      branchDepth: 1,
      threadId: 'tiny-night-world',
      stepIndex: 1,
    });

    const childId = child.id;
    await click(findButton(host, /^Replace saved study for this thread step$/i));

    expect(latestSnapshots).toHaveLength(3);
    expect(latestSnapshots.some((snapshot) => snapshot.id === 'thread-root')).toBe(true);
    expect(latestSnapshots.some((snapshot) => snapshot.id === 'thread-sibling')).toBe(true);
    const replacedChild = latestSnapshots.find((snapshot) => snapshot.id === childId);
    expect(replacedChild).toBeTruthy();
    expect(replacedChild.artStudioStudy).toMatchObject({
      parentStudyId: 'thread-root',
      branchDepth: 1,
      threadId: 'tiny-night-world',
      stepIndex: 1,
    });
  });

  it('continues a fork across later Creative Thread steps without replacing the original path', async () => {
    const stepOne = studySnapshot({ id: 'thread-step-one', label: 'Thread checkpoint', timestamp: 100 });
    stepOne.artStudioStudy.threadId = 'tiny-night-world';
    stepOne.artStudioStudy.stepIndex = 1;
    const stepTwo = studySnapshot({ id: 'thread-step-two', label: 'Contrast checkpoint', timestamp: 200 });
    stepTwo.data.tab = 'contrast';
    stepTwo.artStudioStudy.sourceTab = 'contrast';
    stepTwo.artStudioStudy.threadId = 'tiny-night-world';
    stepTwo.artStudioStudy.stepIndex = 2;

    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'variation-run',
        studioThreadId: 'tiny-night-world',
        studioThreadRunId: 'variation-run',
        studioThreadStep: 1,
        studioThreadCompletedSteps: [0],
        pixelData: {},
      },
      snapshots: [stepOne, stepTwo],
    });

    const processPanel = await chooseInspector(/^Process$/i);
    await click(findButton(processPanel, /^Fork Thread checkpoint as a new variation$/i));
    await click(findButton(host, /^Save branch & next/i));

    const stepOneBranch = latestSnapshots.find((snapshot) =>
      snapshot.id !== 'thread-step-one' &&
      snapshot.id !== 'thread-step-two' &&
      snapshot.artStudioStudy.stepIndex === 1);
    expect(stepOneBranch).toBeTruthy();
    expect(latestToolData.artStudio).toMatchObject({
      studioThreadStep: 2,
      studioVariationForkPending: true,
      studioVariationParentStudyId: stepOneBranch.id,
    });
    expect(findButton(host, /^Save branch & review/i)).not.toBeNull();

    await click(findButton(host, /^Save branch & review/i));
    expect(latestSnapshots).toHaveLength(4);
    expect(latestSnapshots.some((snapshot) => snapshot.id === 'thread-step-two')).toBe(true);
    const stepTwoBranch = latestSnapshots.find((snapshot) =>
      snapshot.id !== 'thread-step-two' &&
      snapshot.artStudioStudy.stepIndex === 2);
    expect(stepTwoBranch).toBeTruthy();
    expect(stepTwoBranch.artStudioStudy.parentStudyId).toBe(stepOneBranch.id);
  });

  it('saves off-step exploration without replacing or relabelling the waiting Creative Thread checkpoint', async () => {
    const checkpoint = studySnapshot({ id: 'waiting-thread-step', label: 'Waiting Pixel step', timestamp: 100 });
    checkpoint.artStudioStudy.threadId = 'tiny-night-world';
    checkpoint.artStudioStudy.stepIndex = 1;

    await mount({
      artStudio: {
        tab: 'gradient',
        studioHome: false,
        studioStarted: true,
        studioFreeProjectId: 'free-exploration',
        studioCurrentProjectRunId: 'variation-run',
        studioThreadId: 'tiny-night-world',
        studioThreadRunId: 'variation-run',
        studioThreadStep: 1,
        studioThreadCompletedSteps: [0],
        studioVariationParentStudyId: 'waiting-thread-step',
        studioVariationActiveStudyId: 'waiting-thread-step',
      },
      snapshots: [checkpoint],
    });

    expect(findButton(host, /^Replace saved study for this thread step$/i)).toBeNull();
    await click(findButton(host, /^Save current study$/i));

    expect(latestSnapshots).toHaveLength(2);
    expect(latestSnapshots.some((snapshot) => snapshot.id === 'waiting-thread-step')).toBe(true);
    const exploration = latestSnapshots.find((snapshot) => snapshot.id !== 'waiting-thread-step');
    expect(exploration.artStudioStudy).toMatchObject({
      runId: 'free-exploration',
      threadId: '',
      stepIndex: null,
      sourceTab: 'gradient',
      parentStudyId: null,
    });
    expect(latestToolData.artStudio).toMatchObject({
      studioThreadId: 'tiny-night-world',
      studioThreadRunId: 'variation-run',
      studioThreadStep: 1,
      studioVariationParentStudyId: 'waiting-thread-step',
      studioVariationActiveStudyId: 'waiting-thread-step',
    });
  });

  it('renders lineage as a labelled nested list whose structure explains each branch', async () => {
    const snapshots = [
      studySnapshot({ id: 'root-study', label: 'Original study', timestamp: 100 }),
      studySnapshot({ id: 'child-study', label: 'First variation', timestamp: 200, parentStudyId: 'root-study', branchDepth: 1 }),
      studySnapshot({ id: 'sibling-study', label: 'Second variation', timestamp: 300, parentStudyId: 'root-study', branchDepth: 1 }),
      studySnapshot({ id: 'grandchild-study', label: 'Variation of first', timestamp: 400, parentStudyId: 'child-study', branchDepth: 2 }),
    ];
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'variation-run',
        studioFreeProjectId: 'variation-run',
        pixelData: {},
      },
      snapshots,
    });

    const processPanel = await chooseInspector(/^Process$/i);
    const lineage = processPanel.querySelector('ol[data-artstudio-variation-lineage="true"]');
    expect(lineage).not.toBeNull();
    const labelledBy = lineage.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(processPanel.querySelector('#' + labelledBy)).not.toBeNull();

    const rootItem = lineage.querySelector(':scope > li[data-study-id="root-study"]');
    const childItem = rootItem && rootItem.querySelector(':scope > ol > li[data-study-id="child-study"]');
    const siblingItem = rootItem && rootItem.querySelector(':scope > ol > li[data-study-id="sibling-study"]');
    const grandchildItem = childItem && childItem.querySelector(':scope > ol > li[data-study-id="grandchild-study"]');
    expect(rootItem).not.toBeNull();
    expect(childItem).not.toBeNull();
    expect(siblingItem).not.toBeNull();
    expect(grandchildItem).not.toBeNull();
    expect(accessibleName(childItem)).toMatch(/First variation.*from Original study/i);
    expect(accessibleName(grandchildItem)).toMatch(/Variation of first.*from First variation/i);
  });

  it('keeps opaque artwork data out of readable variation differences', async () => {
    const hugeImage = 'data:image/png;base64,' + 'A'.repeat(5000);
    const parent = studySnapshot({
      id: 'watercolor-parent',
      label: 'Watercolor parent',
      timestamp: 100,
      data: {
        tab: 'watercolor',
        watercolorSnapshot: hugeImage,
        watercolorWater: 20,
      },
    });
    parent.artStudioStudy.sourceTab = 'watercolor';
    const child = studySnapshot({
      id: 'watercolor-child',
      label: 'Watercolor variation',
      timestamp: 200,
      parentStudyId: 'watercolor-parent',
      branchDepth: 1,
      data: {
        tab: 'watercolor',
        watercolorSnapshot: hugeImage.replace(/A$/, 'B'),
        watercolorWater: 40,
      },
    });
    child.artStudioStudy.sourceTab = 'watercolor';
    await mount({
      artStudio: {
        tab: 'watercolor',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'variation-run',
      },
      snapshots: [parent, child],
    });

    const processPanel = await chooseInspector(/^Process$/i);
    const lineageText = processPanel.querySelector('[data-artstudio-variation-lineage="true"]').textContent;
    expect(lineageText).toContain('watercolor water 20 \u2192 40');
    expect(lineageText).not.toContain('data:image');
    expect(lineageText.length).toBeLessThan(1500);
  });

  it('recovers every saved study in the Variation Garden when lineage data contains cycles', async () => {
    const selfCycle = studySnapshot({ id: 'self-cycle', label: 'Self cycle', timestamp: 100, parentStudyId: 'self-cycle', branchDepth: 1 });
    const cycleA = studySnapshot({ id: 'cycle-a', label: 'Cycle A', timestamp: 200, parentStudyId: 'cycle-b', branchDepth: 2 });
    const cycleB = studySnapshot({ id: 'cycle-b', label: 'Cycle B', timestamp: 300, parentStudyId: 'cycle-a', branchDepth: 2 });
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'variation-run',
        studioFreeProjectId: 'variation-run',
        pixelData: {},
      },
      snapshots: [selfCycle, cycleA, cycleB],
    });

    const processPanel = await chooseInspector(/^Process$/i);
    const renderedIds = [...processPanel.querySelectorAll('[data-artstudio-variation-lineage="true"] [data-study-id]')]
      .map((node) => node.getAttribute('data-study-id'));
    expect(new Set(renderedIds)).toEqual(new Set(['self-cycle', 'cycle-a', 'cycle-b']));
  });
});
