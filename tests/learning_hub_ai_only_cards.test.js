// Learning Hub hides AI-only cards for a viewer whose runtime AI is blocked
// (2026-09-14): a QR student without a personal key, or an in-app student under
// the project's hide-AI setting. Tools that work without AI keep their cards.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, LearningHubModal, root, host;

const AI_ONLY = ['lumen-study', 'text-inquiry', 'lingua-practice', 'screen-coach', 'research-hub', 'learning-web-explorer'];
const KEEP = ['stem-lab', 'reading-library', 'sel-hub', 'timeline-studio', 'test-prep', 'open-groove', 'allohaven', 'litlab', 'storyforge', 'poettree'];

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_learning_hub_modal_module.js');
  LearningHubModal = window.AlloModules.LearningHubModal.LearningHubModal;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove(); host = null;
  delete window.__alloStudentAiDisabled; delete window.callGemini;
  window.__alloFocusTrapStack = [];
  localStorage.clear();
});

async function mount() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const setter = vi.fn();
  await act(async () => {
    root.render(React.createElement(LearningHubModal, {
      setIsAlloHavenOpen: setter, setIsLinguaPracticeOpen: setter, setIsOpenGrooveOpen: setter, setIsReadingLibraryOpen: setter,
      setIsTestPrepHubOpen: setter, setIsTimelineStudioOpen: setter, setSelHubTab: setter, setShowLearningHub: setter, setShowLitLab: setter,
      setShowLearningWebExplorer: setter, setShowPoetTree: setter, setShowResearchHub: setter, setShowSelHub: setter, setShowStemLab: setter,
      setShowStoryForge: setter, setStemLabTab: setter, setStemLabTool: setter, setLabToolData: setter, showLearningHub: true, t: () => null,
    }));
    await Promise.resolve();
  });
}
const shell = (id) => host.querySelector(`[data-hub-id="${id}"]`);
const visibleIds = () => Array.from(host.querySelectorAll('[data-hub-id]')).filter((el) => !el.hidden).map((el) => el.dataset.hubId);

describe('Learning Hub with runtime AI available', () => {
  it('shows every card and no notice', async () => {
    window.callGemini = async () => 'ok';
    await mount();
    for (const id of [...AI_ONLY, ...KEEP]) expect(shell(id)?.hidden, id).toBe(false);
    expect(host.querySelector('[data-hub-ai-hidden-note]')).toBeNull();
  });
});

describe('Learning Hub with runtime AI blocked', () => {
  it('hides exactly the AI-only cards on the blocked-function marker, keeps the rest, and says why', async () => {
    const blocked = async () => { throw new Error('off'); }; blocked._alloQrBlocked = true;
    window.callGemini = blocked;
    await mount();
    for (const id of AI_ONLY) { expect(shell(id).hidden, id).toBe(true); expect(shell(id).getAttribute('aria-hidden')).toBe('true'); }
    for (const id of KEEP) expect(shell(id).hidden, id).toBe(false);
    expect(host.querySelector('[data-hub-ai-hidden-note]').textContent).toContain('turned off for students');
    expect(visibleIds()).not.toEqual(expect.arrayContaining(AI_ONLY));
  });

  it('hides them on the host flag too, and keeps them out of Favourites and Recent', async () => {
    window.__alloStudentAiDisabled = true;
    localStorage.setItem('alloflow_hub_learning_favorites', JSON.stringify(['lumen-study', 'stem-lab']));
    localStorage.setItem('alloflow_hub_learning_recent', JSON.stringify(['research-hub', 'reading-library']));
    await mount();
    expect(shell('lumen-study').hidden).toBe(true);
    // Quick-access strips are built from the scanned card list, which excludes hidden AI-only cards.
    const quick = Array.from(host.querySelectorAll('[data-hub-quick-id]')).map((el) => el.dataset.hubQuickId);
    if (quick.length) {
      expect(quick).not.toContain('lumen-study');
      expect(quick).not.toContain('research-hub');
    }
    const text = host.textContent;
    const occurrences = (label) => (text.match(new RegExp(label, 'g')) || []).length;
    // Each hidden tool's label appears only inside its own (hidden) card, never in a strip.
    expect(occurrences('Lumen Study')).toBe(1);
    expect(occurrences('Research Hub')).toBe(1);
  });

  it('brings the cards back when the AI config changes to a working key', async () => {
    window.__alloStudentAiDisabled = true;
    await mount();
    expect(shell('lingua-practice').hidden).toBe(true);
    delete window.__alloStudentAiDisabled;
    window.callGemini = async () => 'ok';
    await act(async () => { window.dispatchEvent(new Event('alloflow:student-ai-config-changed')); await Promise.resolve(); });
    expect(shell('lingua-practice').hidden).toBe(false);
    expect(host.querySelector('[data-hub-ai-hidden-note]')).toBeNull();
  });

  it('pins the six AI-only ids in the source', () => {
    const src = require('node:fs').readFileSync(resolve(process.cwd(), 'view_learning_hub_modal_source.jsx'), 'utf8');
    const marked = Array.from(src.matchAll(/data-hub-ai-only="true" data-hub-id="([a-z0-9-]+)"/g)).map((m) => m[1]).sort();
    expect(marked).toEqual([...AI_ONLY].sort());
  });
});
