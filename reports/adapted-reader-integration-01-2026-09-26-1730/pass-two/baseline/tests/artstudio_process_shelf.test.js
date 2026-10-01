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

const originalMatchMedia = window.matchMedia;
const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
const originalToDataURL = window.HTMLCanvasElement.prototype.toDataURL;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

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

function studySnapshot({
  id,
  tab,
  timestamp,
  runId = '',
  threadId = '',
  stepIndex = null,
  data = {},
}) {
  const label = 'Art Studio - ' + (tab === 'pixel' ? 'Pixel Art' : tab === 'watercolor' ? 'Watercolor' : 'Stereogram');
  return {
    id,
    tool: 'artStudio',
    label,
    timestamp,
    data: {
      tab,
      studioHome: false,
      studioStarted: true,
      ...data,
    },
    artStudioStudy: {
      schemaVersion: 1,
      sourceTab: tab,
      runId,
      threadId,
      stepIndex,
      stepLabel: stepIndex == null ? '' : 'Step ' + (stepIndex + 1),
      previewSrc: 'data:image/webp;base64,' + id,
      previewAlt: label + ' preview',
      summary: label + ' saved study',
      reflection: '',
      note: '',
    },
  };
}

function accessibleName(node) {
  return String(node && (node.getAttribute('aria-label') || node.textContent) || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findButton(root, name) {
  return [...root.querySelectorAll('button')].find((button) => name.test(accessibleName(button))) || null;
}

async function click(node) {
  expect(node).not.toBeNull();
  await act(async () => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

describe('Art Studio Process Shelf', () => {
  let config;
  let host;
  let root;
  let latestToolData;
  let latestSnapshots;

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
      return 'data:image/webp;base64,artstudio-process-shelf-preview';
    };
    window.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = vi.fn();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    latestToolData = null;
    latestSnapshots = null;
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

  function processShelfButton() {
    return findButton(host, /Process shelf/i);
  }

  async function openProcessShelf() {
    const trigger = processShelfButton();
    await click(trigger);
    const controlledId = trigger.getAttribute('aria-controls');
    return host.querySelector('#' + controlledId);
  }

  it('exposes a header Process shelf button with a valid aria-controls target', async () => {
    await mount({
      artStudio: { tab: 'pixel', studioHome: false, studioStarted: true, pixelData: {} },
    });

    const trigger = processShelfButton();
    expect(trigger).not.toBeNull();
    expect(trigger.type).toBe('button');
    const controlledId = trigger.getAttribute('aria-controls');
    expect(controlledId).toBeTruthy();
    expect(host.querySelector('#' + controlledId)).not.toBeNull();
  });

  it('saves an ordinary study with Art Studio metadata and a bounded visual preview', async () => {
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        pixelGrid: 16,
        pixelData: { '0-0': '#112233', '1-0': '#445566' },
      },
    });

    await click(findButton(host, /^Save (?:current )?study$/i));

    expect(latestSnapshots).toHaveLength(1);
    const snapshot = latestSnapshots[0];
    expect(snapshot).toMatchObject({ tool: 'artStudio' });
    expect(snapshot.data).toMatchObject({ tab: 'pixel', pixelGrid: 16 });
    expect(snapshot.artStudioStudy).toMatchObject({
      schemaVersion: 1,
      sourceTab: 'pixel',
    });
    expect(snapshot.artStudioStudy.previewSrc).toMatch(/^data:image\//);
    expect(snapshot.artStudioStudy.previewAlt.trim().length).toBeGreaterThan(0);
  });

  it('creates a fresh Creative Thread run ID every time the same brief starts', async () => {
    await mount();

    await click(findButton(host, /^Start Tiny night world\./i));
    const firstRunId = latestToolData.artStudio.studioThreadRunId;
    expect(firstRunId).toEqual(expect.any(String));
    expect(firstRunId.length).toBeGreaterThan(0);

    await click(findButton(host, /^Leave brief$/i));
    await click(findButton(host, /^(?:Open Studio home|Home)$/i));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await click(findButton(host, /^Start Tiny night world\./i));

    const secondRunId = latestToolData.artStudio.studioThreadRunId;
    expect(secondRunId).toEqual(expect.any(String));
    expect(secondRunId).not.toBe(firstRunId);
  });

  it('saves the current Thread step before advancing and replaces that run-step study', async () => {
    await mount();
    await click(findButton(host, /^Start Tiny night world\./i));
    const runId = latestToolData.artStudio.studioThreadRunId;

    let primary = findButton(host, /^Save study & next(?:\s|$)/i);
    expect(primary).not.toBeNull();
    await click(primary);

    expect(latestToolData.artStudio.studioThreadStep).toBe(1);
    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].artStudioStudy).toMatchObject({
      runId,
      threadId: 'tiny-night-world',
      stepIndex: 0,
    });

    await click(findButton(host, /^Go to step 1:/i));
    expect(latestToolData.artStudio.studioThreadStep).toBe(0);
    primary = findButton(host, /^Save study & next(?:\s|$)/i);
    await click(primary);

    expect(latestToolData.artStudio.studioThreadStep).toBe(1);
    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].artStudioStudy).toMatchObject({
      runId,
      threadId: 'tiny-night-world',
      stepIndex: 0,
    });
  });

  it('renders saved studies as an inline labelled section with an ordered list', async () => {
    const snapshots = [
      studySnapshot({ id: 'study-one', tab: 'pixel', timestamp: 100 }),
      studySnapshot({ id: 'study-two', tab: 'watercolor', timestamp: 200 }),
    ];
    await mount({
      artStudio: { tab: 'pixel', studioHome: false, studioStarted: true, pixelData: {} },
      snapshots,
    });

    const shelf = await openProcessShelf();
    expect(shelf).not.toBeNull();
    expect(shelf.tagName).toBe('SECTION');
    expect(shelf.closest('[role="dialog"]')).toBeNull();
    const labelledBy = shelf.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(shelf.querySelector('#' + labelledBy)).not.toBeNull();
    const timeline = shelf.querySelector('ol');
    expect(timeline).not.toBeNull();
    expect(timeline.querySelectorAll(':scope > li')).toHaveLength(2);
  });

  it('presents a two-study comparison as accessible A then B content in DOM order', async () => {
    const snapshots = [
      studySnapshot({ id: 'study-a', tab: 'pixel', timestamp: 100 }),
      studySnapshot({ id: 'study-b', tab: 'watercolor', timestamp: 200 }),
    ];
    await mount({
      artStudio: { tab: 'pixel', studioHome: false, studioStarted: true, pixelData: {} },
      snapshots,
    });
    const shelf = await openProcessShelf();

    const compareControls = [...shelf.querySelectorAll('button[aria-pressed], input[type="checkbox"]')]
      .filter((control) => /compar/i.test(accessibleName(control)));
    expect(compareControls).toHaveLength(2);
    await click(compareControls[0]);
    await click(compareControls[1]);

    const slots = [...shelf.querySelectorAll('[aria-label]')]
      .filter((node) => /^(?:Study|Comparison) [AB](?::|\b)/.test(node.getAttribute('aria-label')));
    expect(slots.map((node) => node.getAttribute('aria-label').match(/^(?:Study|Comparison) ([AB])/)[1])).toEqual(['A', 'B']);
    expect(slots[0].compareDocumentPosition(slots[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('forks only the saved lab setup, preserves workflow state, and clears transient playback', async () => {
    const saved = studySnapshot({
      id: 'stereo-study',
      tab: 'stereogram',
      timestamp: 300,
      runId: 'current-run',
      threadId: 'tiny-night-world',
      stepIndex: 2,
      data: {
        stereoAnimMode: 'animate',
        stereoAnimPlaying: true,
        stereoAnimRendering: true,
        stereoAnimHasFrames: true,
        stereoAnimProgress: 72,
        stereoAnimIndex: 4,
        stereoAnimAiGenerating: true,
        stereoAnimAiMotionStatus: 'Generating',
        savedOnlySetting: 'restored',
        studioThreadId: 'old-thread',
        studioThreadRunId: 'old-run',
        studioThreadStep: 0,
      },
    });
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        pixelData: {},
        currentOnlySetting: 'preserved',
        studioThreadId: 'tiny-night-world',
        studioThreadRunId: 'current-run',
        studioThreadStep: 2,
        studioCurrentProjectRunId: 'current-run',
      },
      snapshots: [saved],
    });
    const shelf = await openProcessShelf();

    await click(findButton(shelf, /^Fork /i));

    expect(latestToolData.artStudio).toMatchObject({
      tab: 'stereogram',
      currentOnlySetting: 'preserved',
      studioThreadId: 'tiny-night-world',
      studioThreadRunId: 'current-run',
      studioThreadStep: 2,
      studioCurrentProjectRunId: 'current-run',
      stereoAnimPlaying: false,
      stereoAnimRendering: false,
      stereoAnimHasFrames: false,
      stereoAnimProgress: 0,
      stereoAnimIndex: 0,
      stereoAnimAiGenerating: false,
      stereoAnimAiMotionStatus: '',
    });
    expect(latestToolData.artStudio.savedOnlySetting).toBeUndefined();
    expect(latestToolData.artStudio.stereoAnimDepthTouchMode).toBe('scroll');
  });

  it('does not change unrelated stereogram playback when forking a non-stereogram study', async () => {
    const saved = studySnapshot({
      id: 'pixel-study',
      tab: 'pixel',
      timestamp: 350,
      data: { pixelGrid: 8, pixelData: { '0,0': '#ff0000' }, activePalette: 'nature', hue: 75, sat: 65, lit: 35 },
    });
    await mount({
      artStudio: {
        tab: 'colorWheel',
        studioHome: false,
        studioStarted: true,
        hue: 10,
        sat: 20,
        lit: 30,
        pixelActivePalette: 'warm',
        stereoAnimPlaying: true,
        stereoAnimRendering: true,
        stereoAnimHasFrames: true,
        stereoAnimProgress: 72,
        stereoAnimIndex: 4,
        stereoAnimAiGenerating: true,
        stereoAnimAiMotionStatus: 'Generating',
      },
      snapshots: [saved],
    });
    const shelf = await openProcessShelf();
    await click(findButton(shelf, /^Fork /i));

    expect(latestToolData.artStudio).toMatchObject({
      tab: 'pixel',
      pixelActivePalette: 'nature',
      pixelHue: 75,
      pixelSat: 65,
      pixelLit: 35,
      hue: 10,
      sat: 20,
      lit: 30,
      stereoAnimPlaying: true,
      stereoAnimRendering: true,
      stereoAnimHasFrames: true,
      stereoAnimProgress: 72,
      stereoAnimIndex: 4,
      stereoAnimAiGenerating: true,
      stereoAnimAiMotionStatus: 'Generating',
    });
  });

  it('uses one stable free-project ID for successive ordinary studies', async () => {
    await mount({
      artStudio: { tab: 'pixel', studioHome: false, studioStarted: true, pixelData: {} },
    });

    await click(findButton(host, /^Save (?:current )?study$/i));
    await click(findButton(host, /^Save (?:current )?study$/i));

    expect(latestSnapshots).toHaveLength(2);
    expect(latestSnapshots[0].artStudioStudy.runId).toBeTruthy();
    expect(latestSnapshots[1].artStudioStudy.runId).toBe(latestSnapshots[0].artStudioStudy.runId);
    expect(latestToolData.artStudio.studioCurrentProjectRunId).toBe(latestSnapshots[0].artStudioStudy.runId);
  });

  it('lets learners reveal current, free, recent, and all saved-work views', async () => {
    const snapshots = [
      studySnapshot({ id: 'thread-a', tab: 'pixel', timestamp: 100, runId: 'run-a', threadId: 'tiny-night-world', stepIndex: 0 }),
      studySnapshot({ id: 'thread-b', tab: 'watercolor', timestamp: 200, runId: 'run-b', threadId: 'pattern-with-a-pulse', stepIndex: 0 }),
      studySnapshot({ id: 'free-a', tab: 'pixel', timestamp: 300, runId: 'free-run' }),
    ];
    await mount({
      artStudio: { tab: 'pixel', studioHome: false, studioStarted: true, studioCurrentProjectRunId: 'run-b', pixelData: {} },
      snapshots,
    });
    const shelf = await openProcessShelf();

    expect(shelf.querySelectorAll('ol[data-artstudio-study-cards=\"true\"] > li')).toHaveLength(1);
    await click(findButton(shelf, /^Free studies/i));
    expect(shelf.querySelectorAll('ol[data-artstudio-study-cards=\"true\"] > li')).toHaveLength(1);
    await click(findButton(shelf, /^All studies/i));
    expect(shelf.querySelectorAll('ol[data-artstudio-study-cards=\"true\"] > li')).toHaveLength(3);
    expect(shelf.textContent).toContain('Showing 3 of 3 active saved studies');
  });

  it('reviews the last completed project instead of a newer unrelated run', async () => {
    const completed = studySnapshot({
      id: 'completed-a',
      tab: 'pixel',
      timestamp: 100,
      runId: 'run-a',
      threadId: 'tiny-night-world',
      stepIndex: 0,
    });
    const unrelated = studySnapshot({
      id: 'unrelated-b',
      tab: 'watercolor',
      timestamp: 200,
      runId: 'run-b',
    });
    await mount({
      artStudio: {
        tab: 'colorWheel',
        studioHome: true,
        studioStarted: false,
        studioCurrentProjectRunId: 'run-b',
        studioLastCompletedThreadRunId: 'run-a',
        studioLastCompletedThreadId: 'tiny-night-world',
      },
      snapshots: [completed, unrelated],
    });

    await click(findButton(host, /^Review your last Art Studio project/i));

    const shelf = host.querySelector('#artstudio-process-shelf');
    expect(latestToolData.artStudio.studioCurrentProjectRunId).toBe('run-a');
    expect(shelf.querySelectorAll('[data-artstudio-study-cards] > li')).toHaveLength(1);
    expect(shelf.textContent).toContain('Pixel Art');
    expect(shelf.textContent).not.toContain('Watercolor saved study');
  });

  it('archives and restores studies without deleting branches, with focus-safe recovery', async () => {
    const rootStudy = studySnapshot({ id: 'archive-root', tab: 'pixel', timestamp: 100, runId: 'archive-run' });
    const childStudy = studySnapshot({ id: 'archive-child', tab: 'pixel', timestamp: 200, runId: 'archive-run' });
    childStudy.artStudioStudy.parentStudyId = 'archive-root';
    childStudy.artStudioStudy.branchDepth = 1;
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioCurrentProjectRunId: 'archive-run',
        pixelData: {},
      },
      snapshots: [rootStudy, childStudy],
    });

    const shelf = await openProcessShelf();
    const rootCard = shelf.querySelector('[data-artstudio-study-cards] > li');
    await click(findButton(rootCard, /^Select .* for comparison$/i));
    const refreshedRootCard = shelf.querySelector('[data-artstudio-study-cards] > li');
    await click(findButton(refreshedRootCard, /^Archive /i));

    expect(shelf.querySelectorAll('[data-artstudio-study-cards] > li')).toHaveLength(1);
    expect(latestSnapshots).toHaveLength(2);
    expect(latestSnapshots.find((study) => study.id === 'archive-root').artStudioStudy.archivedAt).toBeTruthy();
    expect(latestSnapshots.find((study) => study.id === 'archive-child').artStudioStudy.archivedAt).toBeUndefined();
    expect(document.activeElement?.id).toBe('artstudio-archive-undo-button');

    await click(findButton(shelf, /^Archived \(1\)$/i));
    expect(shelf.querySelectorAll('[data-artstudio-study-cards] > li')).toHaveLength(1);
    expect(findButton(shelf, /^Fork /i)).toBeNull();
    expect(findButton(shelf, /^Select .* for comparison$/i)).toBeNull();
    await click(findButton(shelf, /^Restore .* to the Process Shelf$/i));

    expect(latestSnapshots.find((study) => study.id === 'archive-root').artStudioStudy.archivedAt).toBeUndefined();
    expect(document.activeElement?.id).toBe('artstudio-process-title');
    await click(findButton(shelf, /^All studies \(2\)$/i));
    expect(shelf.querySelectorAll('[data-artstudio-study-cards] > li')).toHaveLength(2);
  });

  it('clears newer settings owned by a lab when forking a sparse saved setup', async () => {
    const savedDefault = studySnapshot({
      id: 'default-color-wheel',
      tab: 'colorWheel',
      timestamp: 100,
      data: {},
    });
    await mount({
      artStudio: {
        tab: 'colorWheel',
        studioHome: false,
        studioStarted: true,
        harmony: 'triadic',
        pixelGrid: 32,
      },
      snapshots: [savedDefault],
    });

    const shelf = await openProcessShelf();
    await click(findButton(shelf, /^Fork /i));

    expect(latestToolData.artStudio.harmony).toBeUndefined();
    expect(latestToolData.artStudio.pixelGrid).toBe(32);
  });

  it('keeps an archived deterministic Thread checkpoint when a new checkpoint uses that step', async () => {
    const archived = studySnapshot({
      id: 'art-study-variation-run-1',
      tab: 'pixel',
      timestamp: 100,
      runId: 'variation-run',
      threadId: 'tiny-night-world',
      stepIndex: 1,
    });
    archived.artStudioStudy.archivedAt = 123;
    await mount({
      artStudio: {
        tab: 'pixel',
        studioHome: false,
        studioStarted: true,
        studioThreadId: 'tiny-night-world',
        studioThreadRunId: 'variation-run',
        studioCurrentProjectRunId: 'variation-run',
        studioThreadStep: 1,
        studioThreadCompletedSteps: [0],
        pixelData: {},
      },
      snapshots: [archived],
    });

    await click(findButton(host, /^Save current study$/i));

    expect(latestSnapshots).toHaveLength(2);
    expect(new Set(latestSnapshots.map((study) => study.id)).size).toBe(2);
    expect(latestSnapshots.some((study) => study.id === 'art-study-variation-run-1' && study.artStudioStudy.archivedAt === 123)).toBe(true);
    expect(latestSnapshots.some((study) => study.id.startsWith('art-study-variation-run-1-copy-'))).toBe(true);
  });

  it('rehydrates a saved reflection when a learner revisits that Thread step', async () => {
    const saved = studySnapshot({ id: 'reflected-step', tab: 'colorWheel', timestamp: 100, runId: 'thread-run', threadId: 'tiny-night-world', stepIndex: 0 });
    saved.artStudioStudy.reflection = 'wonder';
    saved.artStudioStudy.note = 'Could the accent become the horizon?';
    await mount({
      artStudio: {
        tab: 'pixel', studioHome: false, studioStarted: true,
        studioThreadId: 'tiny-night-world', studioThreadRunId: 'thread-run', studioThreadStep: 1,
        studioCurrentProjectRunId: 'thread-run', studioThreadCompletedSteps: [0], pixelData: {},
      },
      snapshots: [saved],
    });

    await click(findButton(host, /^Go to step 1:/i));
    expect(host.querySelector('input[type="radio"][value="wonder"]').checked).toBe(true);
    expect(host.querySelector('#artstudio-thread-reflection-note').value).toBe('Could the accent become the horizon?');
  });
});
