import { createRequire } from 'node:module';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_allobotsage.js');
const mirrorPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_allobotsage.js');
const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
const mounted = [];

function SageHost({ tool, initialToolData }) {
  const [toolData, setToolData] = React.useState(initialToolData);
  const ctx = {
    toolData,
    update(toolId, key, value) {
      setToolData((previous) => {
        const bucket = previous[toolId] || {};
        const nextValue = typeof value === 'function' ? value(bucket[key]) : value;
        return { ...previous, [toolId]: { ...bucket, [key]: nextValue } };
      });
    },
    updateMulti(toolId, patch) {
      setToolData((previous) => {
        const bucket = previous[toolId] || {};
        const nextPatch = typeof patch === 'function' ? patch(bucket) : patch;
        return { ...previous, [toolId]: { ...bucket, ...(nextPatch || {}) } };
      });
    },
    addToast: vi.fn(),
    announceToSR: vi.fn(),
    awardXP: vi.fn(),
    setStemLabTool: vi.fn(),
    icons: {},
    t: (_key, fallback) => fallback,
  };
  return tool.render(ctx);
}

describe('AlloBot Sage dialog accessibility', () => {
  beforeEach(() => resetStemLab());
  afterEach(() => {
    while (mounted.length) {
      const { root, host } = mounted.pop();
      act(() => root.unmount());
      host.remove();
    }
  });

  it('keeps mirrored deploy files identical and removes native dialogs', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const mirror = readFileSync(mirrorPath, 'utf8');
    expect(mirror).toBe(source);
    expect(source).not.toContain("typeof prompt === 'function'");
    expect(source).not.toContain('AlloBot is watching your progress everywhere.');
    expect(source).toContain('Your practice across AlloFlow counts here.');
    expect(source).not.toContain('allobot_is_watching_your_progress_ever');
    expect(source).toContain('practice_across_alloflow_counts_here');
    expect(source).not.toContain("typeof confirm === 'function'");
    expect(source).not.toContain('window.prompt(');
    expect(source).not.toContain('window.confirm(');
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('maxLength: 24');
  });

  it('renders the preset controls in the loadout phase', () => {
    loadTool('stem_lab/stem_tool_allobotsage.js', 'alloBotSage');
    const html = renderTool('alloBotSage', {
      spaceExplorer: { completedMissions: 3, totalScience: 150 },
      alloBotSage: { phase: 'loadout', equippedLoadout: ['quantum_leap'], loadoutPresets: [] },
    });
    expect(html).toContain('Loadout Presets');
    expect(html).toContain('Save current');
  });

  it('focuses and contains the spell preview, closes by keyboard or backdrop, and restores its opener', () => {
    const tool = loadTool('stem_lab/stem_tool_allobotsage.js', 'alloBotSage');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    mounted.push({ root, host });

    act(() => {
      root.render(React.createElement(SageHost, {
        tool,
        initialToolData: {
          spaceExplorer: { completedMissions: 1 },
          alloBotSage: {
            phase: 'hub',
            seenSpells: ['quantum_leap'],
            lastVisit: Date.now(),
          },
        },
      }));
    });

    const opener = host.querySelector('button[aria-label^="Quantum Leap (unlocked)"]');
    expect(opener).not.toBeNull();
    expect(opener.type).toBe('button');
    opener.focus();
    act(() => opener.click());

    let dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('abs-preview-title');
    const closePreview = dialog.querySelector('button[aria-label="Close preview"]');
    expect(document.activeElement).toBe(closePreview);

    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons).toHaveLength(3);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
    expect(dialog.querySelector('.text-slate-400')).toBeNull();

    const first = buttons[0];
    const last = buttons.at(-1);
    last.focus();
    act(() => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);

    act(() => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);

    opener.focus();
    act(() => opener.click());
    dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).not.toBeNull();
    act(() => dialog.firstElementChild.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
    act(() => dialog.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
