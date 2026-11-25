import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import { setupLane, laneConfig } from './helpers/research_lane_harness.js';
import { internals as hubInternals } from './helpers/research_hub_harness.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES_DIR = path.resolve(ROOT, 'desktop/web-app/node_modules');
const React = require(path.resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(path.resolve(MODULES_DIR, 'react-dom/client'));
const { act } = React;
const acorn = require(path.resolve(MODULES_DIR, 'acorn'));
const axe = require(path.resolve(MODULES_DIR, 'axe-core'));

const MIRROR_DIRS = ['.', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFourWayParity(relPath) {
  const rootHash = sha256(path.resolve(ROOT, relPath));
  for (const dir of MIRROR_DIRS.slice(1)) {
    const mirrorPath = path.resolve(ROOT, dir, relPath);
    expect(fs.existsSync(mirrorPath), `${mirrorPath} must exist`).toBe(true);
    expect(sha256(mirrorPath), `${mirrorPath} must match root ${relPath}`).toBe(rootHash);
  }
}

function auditModuleAst(relPath) {
  const src = fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  let totalReactBtn = 0;
  let untypedNonForm = 0;
  let dupType = 0;
  let rangesMissingVt = 0;
  let domBtnTotal = 0;
  let domBtnTyped = 0;
  const walk = (n, inForm) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, inForm)); return; }
    let nf = inForm;
    if (n.type === 'CallExpression' && n.arguments[0] && n.arguments[0].type === 'Literal') {
      const isDom = n.callee.type === 'MemberExpression' && n.callee.object && n.callee.object.name === 'document';
      const cname = n.callee.type === 'Identifier'
        ? n.callee.name
        : (n.callee.type === 'MemberExpression' && n.callee.property ? n.callee.property.name : '');
      const tag = n.arguments[0].value;
      if (!isDom && ['ce', 'h', 'createElement'].includes(cname)) {
        if (tag === 'form') nf = true;
        if (tag === 'button') {
          totalReactBtn++;
          const props = n.arguments[1];
          if (props && props.type === 'ObjectExpression') {
            const types = props.properties.filter((p) => p.type === 'Property' && (
              (p.key.type === 'Identifier' && p.key.name === 'type') ||
              (p.key.type === 'Literal' && p.key.value === 'type')
            ));
            if (types.length > 1) dupType++;
            if (types.length === 0 && !inForm) untypedNonForm++;
          } else if (!inForm && (!props || props.type === 'Literal')) {
            untypedNonForm++;
          }
        }
        if (tag === 'input' && n.arguments[1] && n.arguments[1].type === 'ObjectExpression') {
          const isRange = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'type' || p.key.value === 'type') && p.value && p.value.value === 'range');
          if (isRange) {
            const hasVt = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'aria-valuetext' || p.key.value === 'aria-valuetext'));
            if (!hasVt) rangesMissingVt++;
          }
        }
      }
    }
    for (const k of Object.keys(n)) if (k !== 'start' && k !== 'end') walk(n[k], nf);
  };
  walk(ast, false);
  for (const m of src.matchAll(/document\.createElement\(\s*['"]button['"]\s*\)/g)) {
    domBtnTotal++;
    const slice = src.slice(m.index, m.index + 240);
    if (/\.type\s*=\s*['"]button['"]/.test(slice)) domBtnTyped++;
  }
  return { src, totalReactBtn, untypedNonForm, dupType, rangesMissingVt, domBtnTotal, domBtnTyped };
}

async function runAxe(el) {
  const res = await axe.run(el, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  return res.violations;
}

describe('Other Resources Polish — Wave 82 (ConceptGraph3D, ResearchLaneScientific, SharedActivity, LivePolling)', () => {
  let mountEl = null;
  let root = null;
  let errorSpy = null;

  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (mountEl) {
      mountEl.remove();
      mountEl = null;
    }
    if (errorSpy) {
      errorSpy.mockRestore();
      errorSpy = null;
    }
    localStorage.clear();
    delete window.__alloSharedActivityMailboxCallWithRetry;
    window.__alloFocusTrapStack = [];
    vi.restoreAllMocks();
  });

  it('1. concept_graph_3d_module.js: 4-way mirror, 11/11 DOM buttons typed, scoped WCAG CSS, keyboard guards, and 0 axe violations', async () => {
    assertFourWayParity('concept_graph_3d_module.js');
    const audit = auditModuleAst('concept_graph_3d_module.js');
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.rangesMissingVt).toBe(0);
    expect(audit.domBtnTotal).toBe(11);
    expect(audit.domBtnTyped).toBe(11);
    expect(audit.src).toContain('cg3d-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');
    expect(audit.src).toContain('e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey');
    expect(audit.src).toContain('e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || e.altKey || e.ctrlKey || e.metaKey');

    // Verify all 6 offscreen canvases carry aria-hidden="true"
    const canvasMatches = [...audit.src.matchAll(/document\.createElement\(\s*['"]canvas['"]\s*\)/g)];
    expect(canvasMatches.length).toBeGreaterThanOrEqual(6);
    for (const m of canvasMatches) {
      const slice = audit.src.slice(m.index, m.index + 240);
      expect(slice).toContain("setAttribute('aria-hidden', 'true')");
    }

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    delete window.AlloModules?.ConceptGraphEngine;
    delete window.AlloModules?.ConceptGraph3D;
    document.getElementById('cg3d-a11y-css')?.remove();
    loadAlloModule('concept_graph_engine_module.js');
    loadAlloModule('concept_graph_3d_module.js');
    const CG3D = window.AlloModules.ConceptGraph3D;
    expect(CG3D).toBeTruthy();

    const graph = {
      version: 'acg/v1',
      axes: { z: { kind: 'categorical', categories: ['Biology', 'Chemistry'] } },
      nodes: [
        { id: 'n1', category: 'Biology', x: 0, y: 0, z: 0, label: 'Cell Membrane', summary: 'Selective barrier' },
        { id: 'n2', category: 'Chemistry', x: 120, y: 80, z: 0, label: 'Lipid Bilayer', summary: 'Phospholipid structure' },
      ],
      edges: [{ fromId: 'n1', toId: 'n2', type: 'prerequisite' }],
      layers: [],
    };

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(CG3D.View, { graph, t: () => '' }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('cg3d-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const rootWrap = mountEl.querySelector('[data-cg3d-root="true"]');
    expect(rootWrap).not.toBeNull();
    const buttons = [...mountEl.querySelectorAll('button')];
    for (const btn of buttons) expect(btn.getAttribute('type')).toBe('button');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('2. research_lane_scientific_module.js: 4-way mirror, AST button safety, scoped WCAG CSS, IME/modifier Enter guard, and 0 axe violations', async () => {
    assertFourWayParity('research_lane_scientific_module.js');
    const audit = auditModuleAst('research_lane_scientific_module.js');
    expect(audit.totalReactBtn).toBe(26);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.rangesMissingVt).toBe(0);
    expect(audit.src).toContain('rls-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('rls-a11y-css')?.remove();
    setupLane('scientific');
    const lane = laneConfig('scientific');

    const StubPrimitive = (props) => React.createElement('div', { 'data-stub-primitive': 'true' }, props && props.children);
    const setJournal = vi.fn();
    const journal = Object.assign(hubInternals().emptyJournal(), { activeLane: 'scientific', activeStage: 'notice_wonder' });
    const ctx = {
      t: () => '',
      lane,
      journal,
      setJournal,
      ask: async () => ({}),
      addToast: () => {},
      primitives: {
        SuggestionBadge: StubPrimitive,
        ExemplarPair: StubPrimitive,
        VoiceNoteBlock: StubPrimitive,
        CostMeter: StubPrimitive,
      },
      constants: { MAX_AI_CALLS_PER_SESSION: 8, ANSWER_HARD_CAP: 1200, VOICE_NOTE_MAX_SECONDS: 60 },
      onExitLane: () => {},
    };

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(lane.render(ctx));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('rls-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-research-lane="scientific"]')).not.toBeNull();

    const buttons = [...mountEl.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) expect(btn.getAttribute('type')).toBe('button');

    // Exercise wondering input keyboard IME/modifier guards
    const wonderInput = mountEl.querySelector('input[aria-label="Add a wondering question"]');
    expect(wonderInput).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      setter.call(wonderInput, 'Why do roots grow downward?');
      wonderInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    setJournal.mockClear();

    await act(async () => {
      wonderInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      wonderInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
    });
    expect(setJournal).not.toHaveBeenCalled();

    await act(async () => {
      wonderInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(setJournal).toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('3. shared_activity_module.js: 4-way mirror, AST button safety, scoped WCAG CSS, IME/modifier Escape guard, and 0 axe violations', async () => {
    assertFourWayParity('shared_activity_module.js');
    const audit = auditModuleAst('shared_activity_module.js');
    expect(audit.totalReactBtn).toBe(20);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.rangesMissingVt).toBe(0);
    expect(audit.src).toContain('allo-shared-activity-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-shared-activity-a11y-css')?.remove();
    delete window.AlloModules?.SharedActivity;
    loadAlloModule('shared_activity_module.js');
    const API = window.AlloModules.SharedActivity;
    expect(API).toBeTruthy();

    window.__alloSharedActivityMailboxCallWithRetry = vi.fn(async (_url, payload) => {
      if (payload.a === 'joinactivity') return { uid: 'u-w82', pt: 'tok-w82' };
      return {
        ok: true,
        version: 1,
        type: 'survey',
        identityMode: 'real_name',
        items: [{ id: 'q1', type: 'likert', text: 'Confidence', required: true, steps: 3, labels: ['Low', 'Mid', 'High'] }],
        closed: false,
        own: { name: 'Jordan', answers: { q1: 2 } },
      };
    });

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(API.SharedAssignmentActivityPanel, {
        activity: { activityId: 'act-w82', type: 'survey', prompt: 'Quick check-in' },
        mailbox: { id: 'pack-w82', url: 'https://mailbox.example/exec', secret: 'sec' },
      }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('allo-shared-activity-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-shared-activity="true"]')).not.toBeNull();

    // Arm "Start fresh" and test Ctrl+Escape / IME Escape vs plain Escape
    const startFreshBtn = [...mountEl.querySelectorAll('button')].find((b) => b.textContent.includes('Start fresh'));
    expect(startFreshBtn).toBeTruthy();
    await act(async () => startFreshBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const confirmBtn = [...mountEl.querySelectorAll('button')].find((b) => b.textContent.includes('Confirm start fresh'));
    expect(confirmBtn).toBeTruthy();

    await act(async () => {
      confirmBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      confirmBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect([...mountEl.querySelectorAll('button')].some((b) => b.textContent.includes('Confirm start fresh'))).toBe(true);

    await act(async () => {
      confirmBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect([...mountEl.querySelectorAll('button')].some((b) => b.textContent.includes('Confirm start fresh'))).toBe(false);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('4. live_polling_module.js: 4-way mirror, 112/112 buttons typed, scoped WCAG CSS, IME/modifier focus-trap guard, and 0 axe violations', async () => {
    assertFourWayParity('live_polling_module.js');
    const audit = auditModuleAst('live_polling_module.js');
    expect(audit.totalReactBtn).toBe(112);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.rangesMissingVt).toBe(0);
    expect(audit.src).toContain('live-polling-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('live-polling-a11y-css')?.remove();
    delete window.AlloModules?.LivePolling;
    loadAlloModule('live_polling_module.js');
    const LivePolling = window.AlloModules.LivePolling;
    expect(LivePolling).toBeTruthy();

    const onClose = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, {
        sessionCode: 'W82L',
        isOpen: true,
        onClose,
        roster: { u1: { name: 'Sam', resourceId: 'r1', resourceAt: 100 } },
        resources: [{ id: 'r1', title: 'Cell Model' }],
        sessionGroups: {},
      }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('live-polling-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-live-polling-root="true"]')).not.toBeNull();

    const buttons = [...mountEl.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) expect(btn.getAttribute('type')).toBe('button');

    // Ctrl+Escape and IME keyCode 229 Escape must NOT close dialog
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();

    // Ctrl+Tab must NOT hijack focus inside the focus trap
    const beforeFocus = document.activeElement;
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(beforeFocus);

    // Plain Escape invokes onClose
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });
});
