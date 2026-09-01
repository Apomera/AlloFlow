import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_archstudio.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'),
];

const earnedBadges = {
  first_block: 1, hundred_club: 1, all_shapes: 1, all_mats: 1,
  sky_high: 1, rock_solid: 1, perfect_sym: 1, quake_proof: 1,
  five_saves: 1, challenger: 1, mega_build: 1, minimalist: 1,
};

function asDom(markup) {
  const host = document.createElement('div');
  host.innerHTML = markup;
  return host;
}

function buttonWithText(host, text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === text) || null;
}

function ownReadableText(element) {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' ');
}

async function mountStudio(file, initialState, options = {}) {
  resetStemLab();
  const cfg = loadTool(file, 'archStudio');
  const originalIsReady = window.__alloArchGL && window.__alloArchGL.isReady;
  if (options.rendererReady) window.__alloArchGL.isReady = () => true;

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let latest = initialState;

  function Harness() {
    const state = React.useState({ archStudio: initialState });
    const toolData = state[0];
    const setToolData = state[1];
    latest = toolData.archStudio;
    return cfg.render({
      React,
      toolData,
      setToolData,
      update(bucket, key, value) {
        setToolData((prev) => Object.assign({}, prev, {
          [bucket]: Object.assign({}, prev[bucket] || {}, { [key]: value }),
        }));
      },
      updateMulti(bucket, patch) {
        setToolData((prev) => Object.assign({}, prev, {
          [bucket]: Object.assign({}, prev[bucket] || {}, patch || {}),
        }));
      },
      setStemLabTool() {},
      addToast() {},
      awardXP() {},
      celebrate() {},
      beep() {},
      announceToSR() {},
      getXP() { return 0; },
      callGemini: options.callGemini || null,
      gradeLevel: '5th Grade',
      toolSnapshots: [],
      props: {},
      t(key, fallback) { return fallback || key; },
      icons: new Proxy({}, { get() { return function Icon() { return React.createElement('span'); }; } }),
      a11yClick(fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {},
    });
  }

  await React.act(async () => { root.render(React.createElement(Harness)); });

  return {
    host,
    latest() { return latest; },
    async cleanup() {
      await React.act(async () => { root.unmount(); });
      if (window.__alloArchGL && originalIsReady) window.__alloArchGL.isReady = originalIsReady;
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    },
  };
}

for (const file of files) {
  const relativeFile = path.relative(process.cwd(), file);

  describe(`Architecture Studio visual hierarchy in ${relativeFile}`, () => {
    it('renders a two-tier header with a scrollable feature toolbar', () => {
      resetStemLab();
      loadTool(file, 'archStudio');
      const host = asDom(renderTool('archStudio', { archStudio: { blocks: [], editorView: 'grid' } }));
      const header = host.querySelector('.arch-studio-header');
      const titleRow = host.querySelector('.arch-studio-title-row');
      const featureStrip = host.querySelector('.arch-studio-feature-strip');

      expect(header).not.toBeNull();
      expect(titleRow?.parentElement).toBe(header);
      expect(featureStrip?.parentElement).toBe(header);
      expect(titleRow?.style.overflowX).toBe('auto');
      expect(featureStrip?.style.overflowX).toBe('auto');
      expect(featureStrip?.getAttribute('role')).toBe('toolbar');
      expect(featureStrip?.getAttribute('aria-label')).toBe('Architecture Studio features and actions');
      expect(Array.from(titleRow.querySelectorAll('button')).some((button) => button.textContent.includes('Save'))).toBe(true);
    });

    it('keeps stage and metrics as distinct named visual surfaces', () => {
      resetStemLab();
      loadTool(file, 'archStudio');
      const host = asDom(renderTool('archStudio', { archStudio: { blocks: [], editorView: 'grid' } }));
      const viewport = host.querySelector('.arch-studio-viewport');
      const stage = host.querySelector('[data-arch-stage="true"]');
      const stats = host.querySelector('[data-arch-stats="true"]');

      expect(viewport).not.toBeNull();
      expect(stage).not.toBeNull();
      expect(stats).not.toBeNull();
      expect(stage).not.toBe(stats);
      expect(stage?.classList.contains('arch-studio-stage')).toBe(true);
      expect(stats?.classList.contains('arch-studio-stats')).toBe(true);
      expect(viewport?.contains(stage)).toBe(true);
      expect(viewport?.contains(stats)).toBe(true);
      expect(stats?.querySelectorAll('.arch-studio-stat').length).toBeGreaterThanOrEqual(7);
    });

    it('uses an exclusive Editor style selector and switches its selected option', async () => {
      const mounted = await mountStudio(file, {
        blocks: [], editorView: 'grid', styleMode: 'architect', earnedBadges,
      });
      try {
        let group = mounted.host.querySelector('[role="group"][aria-label="Editor style"]');
        let buttons = Array.from(group?.querySelectorAll('button') || []);
        expect(buttons).toHaveLength(2);
        expect(buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
        expect(buttons.find((button) => button.textContent.includes('Architect'))?.getAttribute('aria-pressed')).toBe('true');

        const bricks = buttons.find((button) => button.textContent.includes('Bricks'));
        await React.act(async () => { bricks.click(); });

        group = mounted.host.querySelector('[role="group"][aria-label="Editor style"]');
        buttons = Array.from(group?.querySelectorAll('button') || []);
        expect(mounted.latest().styleMode).toBe('bricks');
        expect(buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
        expect(buttons.find((button) => button.textContent.includes('Bricks'))?.getAttribute('aria-pressed')).toBe('true');
        expect(mounted.host.textContent).toContain('Brick Builder');
      } finally {
        await mounted.cleanup();
      }
    });

    it('offers actionable guidance for an empty Pick-mode build', async () => {
      const mounted = await mountStudio(file, {
        blocks: [], editorView: '3d', mode: 'pick', earnedBadges,
      }, { rendererReady: true });
      try {
        expect(mounted.host.querySelector('[data-arch-empty-state="true"]')?.textContent).toContain('Nothing to pick yet');
        const switchMode = buttonWithText(mounted.host, 'Switch to Place');
        expect(switchMode).not.toBeNull();
        await React.act(async () => { switchMode.click(); });
        expect(mounted.latest().mode).toBe('place');

        const openGrid = buttonWithText(mounted.host, 'Open Floor Grid');
        expect(openGrid).not.toBeNull();
        await React.act(async () => {
          openGrid.click();
          await new Promise((resolve) => setTimeout(resolve, 5));
        });
        expect(mounted.latest().editorView).toBe('grid');
        expect(mounted.host.querySelector('[data-arch-grid="true"]')).not.toBeNull();
      } finally {
        await mounted.cleanup();
      }
    });

    it('restores an existing build hidden by view filters', async () => {
      const mounted = await mountStudio(file, {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        editorView: '3d', viewLayer: 3,
        showSlice: true, sliceZSelected: true, sliceZ: 5,
        filterMaterial: 'wood', filterShape: 'arch', earnedBadges,
      }, { rendererReady: true });
      try {
        expect(mounted.host.querySelector('[data-arch-empty-state="true"]')?.textContent).toContain('Nothing matches this view');
        const showAll = buttonWithText(mounted.host, 'Show Entire Build');
        expect(showAll).not.toBeNull();
        await React.act(async () => { showAll.click(); });
        expect(mounted.latest()).toMatchObject({
          viewLayer: -1,
          showSlice: false,
          sliceZSelected: false,
          filterMaterial: '',
          filterShape: '',
        });
        expect(mounted.host.querySelector('[data-arch-empty-state="true"]')).toBeNull();
      } finally {
        await mounted.cleanup();
      }
    });

    it('summarizes every active view setting and lets students clear one or reset all', async () => {
      const mounted = await mountStudio(file, {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        editorView: 'grid', viewLayer: 0,
        showSlice: true, sliceZSelected: true, sliceZ: 0,
        filterMaterial: 'stone', filterShape: 'block',
        showHeatmap: true, blueprintView: true, earnedBadges,
      });
      try {
        let hud = mounted.host.querySelector('[data-arch-view-hud="true"]');
        expect(hud).not.toBeNull();
        expect(hud?.getAttribute('role')).toBe('group');
        expect(hud?.getAttribute('aria-label')).toBe('Three-dimensional view settings');
        expect(hud?.textContent).toContain('3D View Settings');
        expect(hud?.textContent).not.toContain('visible');
        expect(mounted.host.querySelector('.arch-studio-viewport')?.classList.contains('arch-studio-has-view-hud')).toBe(true);

        const chipIds = Array.from(hud.querySelectorAll('[data-arch-view-chip]'))
          .map((chip) => chip.getAttribute('data-arch-view-chip'));
        expect(chipIds).toEqual(['layer', 'slice', 'material', 'shape', 'heatmap', 'blueprint']);
        expect(hud.querySelector('[data-arch-view-chip="layer"]')?.textContent).toContain('Layer Y=0');
        expect(hud.querySelector('[data-arch-view-chip="slice"]')?.textContent).toContain('Slice Z=0');
        expect(hud.querySelector('[data-arch-view-chip="material"]')?.getAttribute('aria-label')).toBe('Clear material filter');

        await React.act(async () => { hud.querySelector('[data-arch-view-chip="material"]').click(); });
        expect(mounted.latest().filterMaterial).toBe('');
        expect(mounted.host.querySelector('[data-arch-view-chip="material"]')).toBeNull();

        hud = mounted.host.querySelector('[data-arch-view-hud="true"]');
        const reset = hud.querySelector('[data-arch-reset-view="true"]');
        expect(reset?.textContent).toContain('Reset View');
        expect(reset?.getAttribute('aria-label')).toContain('Reset layer, slice, filters, heatmap, replay, and blueprint');
        await React.act(async () => { reset.click(); });
        expect(mounted.latest()).toMatchObject({
          viewLayer: -1,
          showSlice: false,
          sliceZ: -1,
          sliceZSelected: false,
          filterMaterial: '',
          filterShape: '',
          showHeatmap: false,
          showReplay: false,
          replayStep: -1,
          blueprintView: false,
        });
        expect(mounted.host.querySelector('[data-arch-view-hud="true"]')).toBeNull();
        expect(mounted.host.querySelector('.arch-studio-viewport')?.classList.contains('arch-studio-has-view-hud')).toBe(false);
      } finally {
        await mounted.cleanup();
      }
    });

    it('discards malformed restored view settings instead of showing phantom restrictions', () => {
      resetStemLab();
      loadTool(file, 'archStudio');
      const host = asDom(renderTool('archStudio', { archStudio: {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        editorView: 'grid',
        viewLayer: 'not-a-layer',
        showSlice: 'yes', sliceZSelected: true, sliceZ: 'not-a-slice',
        filterMaterial: 'unknown-material', filterShape: 'unknown-shape',
        showHeatmap: 'yes', showReplay: true, replayStep: 999, undoStack: [],
        earnedBadges,
      } }));

      expect(host.querySelector('[data-arch-view-hud="true"]')).toBeNull();
      expect(host.querySelector('.arch-studio-viewport')?.classList.contains('arch-studio-has-view-hud')).toBe(false);
      expect(host.textContent).not.toContain('3D View Settings');
    });

    it('clears restrictive view state when deleting the final selected object', async () => {
      const mounted = await mountStudio(file, {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        selectedBlockKey: '0,0,0', editorView: 'grid',
        viewLayer: 0, showSlice: true, sliceZSelected: true, sliceZ: 0,
        filterMaterial: 'stone', filterShape: 'block', earnedBadges,
      });
      try {
        const remove = mounted.host.querySelector('button[aria-label="Delete selected block"]');
        expect(remove).not.toBeNull();
        await React.act(async () => { remove.click(); });

        expect(mounted.latest().blocks).toEqual([]);
        expect(mounted.latest()).toMatchObject({
          selectedBlockKey: '',
          viewLayer: -1,
          showSlice: false,
          sliceZSelected: false,
          filterMaterial: '',
          filterShape: '',
        });
        expect(mounted.host.querySelector('[data-arch-view-hud="true"]')).toBeNull();
      } finally {
        await mounted.cleanup();
      }
    });

    it('organizes the selected-object inspector and authoring palettes into named visual groups', () => {
      resetStemLab();
      loadTool(file, 'archStudio');
      const host = asDom(renderTool('archStudio', { archStudio: {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        selectedBlockKey: '0,0,0', editorView: 'grid',
        activeShape: 'arch', activeMaterial: 'wood', activeColor: '#ef4444', activeRotation: 90,
        earnedBadges,
      } }));

      const inspector = host.querySelector('section.arch-studio-inspector[data-arch-inspector="true"]');
      expect(inspector).not.toBeNull();
      expect(inspector?.getAttribute('data-arch-selected-key')).toBe('0,0,0');
      expect(inspector?.getAttribute('aria-labelledby')).toBe('arch-selected-heading');
      expect(inspector?.querySelector('#arch-selected-heading')?.textContent).toBe('Selected Object');
      expect(inspector?.querySelector('[data-arch-inspector-identity="true"]')?.textContent).toContain('Block');

      const coordinates = inspector.querySelector('[data-arch-inspector-coordinates="true"]');
      const moves = inspector.querySelector('[data-arch-inspector-moves="true"]');
      const actions = inspector.querySelector('[data-arch-inspector-actions="true"]');
      expect(coordinates?.getAttribute('aria-label')).toBe('Selected object coordinates');
      expect(coordinates?.children).toHaveLength(3);
      expect(moves?.getAttribute('aria-label')).toBe('Move selected object one cell');
      expect(moves?.querySelectorAll('button').length).toBeGreaterThanOrEqual(6);
      expect(actions?.getAttribute('aria-label')).toBe('Selected object actions');
      expect(actions?.querySelectorAll('button')).toHaveLength(4);

      for (const headingId of ['arch-shapes-heading', 'arch-rotation-heading', 'arch-materials-heading', 'arch-colors-heading']) {
        const heading = host.querySelector(`#${headingId}`);
        const group = host.querySelector(`[role="group"][aria-labelledby="${headingId}"]`);
        expect(heading?.textContent.trim()).not.toBe('');
        expect(group).not.toBeNull();
        expect(group?.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
      }
    });

    it('keeps user-facing inline text at a readable 10px minimum across dense panels', () => {
      resetStemLab();
      loadTool(file, 'archStudio');
      const host = asDom(renderTool('archStudio', { archStudio: {
        blocks: [
          { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
          { x: 0, y: 1, z: 0, shape: 'arch', material: 'wood', color: '#a16207', rotation: 90 },
        ],
        selectedBlockKey: '0,0,0', editorView: 'grid',
        showChallenges: true, showGallery: true, showTemplates: true,
        showBadges: true, showFloorPlans: true, showFilter: true,
        showSlice: true, sliceZSelected: true, sliceZ: 0, showHeatmap: true,
        showShare: true, showBOM: true, showStats: true, showStyleGuide: true,
        showPhases: true, showRandomGen: true, showColorPicker: true,
        budgetEnabled: true, earnedBadges,
      } }));
      const studio = host.querySelector('#arch-studio-region');
      expect(studio?.textContent).toContain('Challenges');
      expect(studio?.textContent).toContain('Templates');
      expect(studio?.textContent).toContain('Badges');
      expect(studio?.textContent).toContain('Floor Plans');

      const undersized = Array.from(studio.querySelectorAll('[style]')).filter((element) => {
        const size = Number.parseFloat(element.style.fontSize);
        return ownReadableText(element)
          && element.getAttribute('aria-hidden') !== 'true'
          && Number.isFinite(size)
          && size < 10;
      }).map((element) => `${element.tagName.toLowerCase()}: ${ownReadableText(element)} (${element.style.fontSize})`);

      expect(undersized).toEqual([]);
    });

    it('marks refreshing AI advice busy while retaining the previous guidance', () => {
      resetStemLab();
      loadTool(file, 'archStudio');
      const block = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 };
      const signature = window.__alloArchBuildSignature([block]);
      const retainedAdvice = 'RETAINED VISUAL ADVICE';
      window.__archAiPendingReqId = 77;
      const host = asDom(renderTool('archStudio', { archStudio: {
        blocks: [block], editorView: 'grid', showAI: true,
        aiLoading: true, aiRequestId: 77, aiRequestBuildSignature: signature,
        aiAdvice: retainedAdvice, aiAdviceBuildSignature: signature,
        earnedBadges,
      } }));
      const panel = host.querySelector('[role="region"][aria-label="AI Architect advice"]');
      const progress = panel?.querySelector('[role="status"][aria-live="polite"]');

      expect(panel).not.toBeNull();
      expect(panel?.getAttribute('aria-busy')).toBe('true');
      expect(progress?.textContent).toContain('Refreshing advice for this build');
      expect(panel?.textContent).toContain(retainedAdvice);
      const workingButton = Array.from(panel.querySelectorAll('button')).find((button) => button.textContent.includes('Working'));
      expect(workingButton?.disabled).toBe(true);
      delete window.__archAiPendingReqId;
    });
  });
}
