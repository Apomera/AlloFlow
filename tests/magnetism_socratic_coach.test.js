import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

const require = createRequire(import.meta.url);
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOOL_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js');
const physics = require(TOOL_PATH);

function coachSeed(extra = {}) {
  return Object.assign({
    tab: 'field', learningMode: 'guided', fieldView: '2d',
    askInput: '', askAnswer: '', askLoading: false,
    notebookOpen: false, notebookTrials: [], labFocus: false,
    missionId: 'power_path', missionStarted: false, missionPanelOpen: false,
    labShellPanel: 'coach', analyzerMysteryWins: {}, xfmrMissionWins: {},
  }, extra);
}

function withCoachHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const callGemini = vi.fn(() => Promise.resolve({ text: 'Unused static hint.' }));
  const html = renderTool('magnetism', { magnetism: coachSeed(seed) }, {
    aiHintsEnabled: true,
    callGemini,
  });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  let result;
  try {
    result = callback(host, html, callGemini);
  } catch (error) {
    host.remove();
    throw error;
  }
  if (result && typeof result.then === 'function') return result.finally(() => host.remove());
  host.remove();
  return result;
}

function mountInteractive(cfg, seed, callGemini, announceToSR = () => {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR, awardXP: () => {},
      callGemini, aiHintsEnabled: true, gradeLevel: '7th Grade',
      t: (key, fallback) => fallback || key,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    close() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

async function submitCoach(host) {
  await act(async () => {
    host.querySelector('.mag-coach-form').dispatchEvent(new Event('submit', {
      bubbles: true,
      cancelable: true,
    }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('magnetism station-aware Socratic coach', () => {
  it('provides three purposeful question starters for every expedition station', () => {
    const expectedTabs = ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'];
    expect(Object.keys(physics.SOCRATIC_COACH_DEFS)).toEqual(expectedTabs);
    const prompts = expectedTabs.flatMap((tab) =>
      physics.SOCRATIC_COACH_DEFS[tab].prompts.map((prompt) => ({ tab, ...prompt })));
    expect(prompts).toHaveLength(30);
    expect(new Set(prompts.map((prompt) => prompt.tab + ':' + prompt.id)).size).toBe(30);
    expectedTabs.forEach((tab) => {
      const definition = physics.SOCRATIC_COACH_DEFS[tab];
      expect(definition.focus).toBeTruthy();
      expect(definition.prompts).toHaveLength(3);
      expect(definition.prompts.map((prompt) => prompt.id)).toEqual(['predict', 'compare', 'explain']);
      expect(definition.prompts.every((prompt) => prompt.label && prompt.text)).toBe(true);
    });

    const initial = physics.socraticCoachState(coachSeed(), 'field');
    expect(initial).toMatchObject({
      focus: 'Read local field evidence',
      question: '', answer: '', loading: false,
      characterCount: 0, characterLimit: 180, remaining: 180,
      canSubmit: false, mode: 'guided', modeLabel: 'Guided questions',
      responseState: 'choose',
    });
    expect(initial.station).toMatchObject({ id: 'field', label: 'Field Explorer' });
    expect(initial.chapter).toMatchObject({ id: 'fields', accent: '#38bdf8' });
    expect(initial.suggestions.map((prompt) => prompt.label)).toEqual(['Predict', 'Compare', 'Explain']);
  });

  it('restores station context, caps legacy questions, and derives response states without new persistence', () => {
    const selectedQuestion = physics.SOCRATIC_COACH_DEFS.transformer.prompts[1].text;
    const restored = physics.socraticCoachState({
      magnetism: coachSeed({
        tab: 'transformer',
        learningMode: 'challenge',
        askInput: selectedQuestion,
      }),
    });
    expect(restored.station).toMatchObject({ id: 'transformer', chapterId: 'power' });
    expect(restored.chapter).toMatchObject({ id: 'power', accent: '#fbbf24' });
    expect(restored).toMatchObject({
      focus: 'Trace voltage and loss',
      mode: 'challenge', modeLabel: 'Challenge questions',
      canSubmit: true, responseState: 'ready',
    });
    expect(restored.suggestions.filter((prompt) => prompt.selected).map((prompt) => prompt.id)).toEqual(['compare']);

    const capped = physics.socraticCoachState(coachSeed({ askInput: 'x'.repeat(220) }));
    expect(capped.question).toHaveLength(180);
    expect(capped).toMatchObject({ characterCount: 180, remaining: 0, canSubmit: true });

    expect(physics.socraticCoachState(coachSeed({
      askInput: 'What should I compare?', askLoading: true,
    }))).toMatchObject({ responseState: 'loading', canSubmit: false });
    expect(physics.socraticCoachState(coachSeed({
      askInput: 'What should I compare?', askAnswer: 'Hold one variable fixed.',
    }))).toMatchObject({ responseState: 'answer', answer: 'Hold one variable fixed.' });
  });

  it('keeps the coach behind the explicit AI gate and renders a station-colored question lab', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const callGemini = vi.fn(() => Promise.resolve({ text: 'A hint.' }));
    const state = { magnetism: coachSeed({ tab: 'motor' }) };
    const gatedOff = renderTool('magnetism', state, { aiHintsEnabled: false, callGemini });
    const missingProvider = renderTool('magnetism', state, { aiHintsEnabled: true, callGemini: null });
    expect(gatedOff).not.toContain('data-magnetism-socratic-coach');
    expect(missingProvider).not.toContain('data-magnetism-socratic-coach');

    const enabled = renderTool('magnetism', state, { aiHintsEnabled: true, callGemini });
    const host = document.createElement('main');
    host.innerHTML = enabled;
    const coach = host.querySelector('[data-magnetism-socratic-coach="true"]');
    expect(coach).toBeTruthy();
    expect(coach.tagName).toBe('SECTION');
    expect(coach.getAttribute('data-station')).toBe('motor');
    expect(coach.getAttribute('data-response-state')).toBe('choose');
    expect(coach.style.getPropertyValue('--mag-coach-tone')).toBe('#f43f5e');
    expect(coach.querySelector('.mag-coach-signal svg')).toBeTruthy();
    expect(coach.querySelectorAll('.mag-coach-wave')).toHaveLength(2);
    expect(coach.querySelectorAll('.mag-coach-starter')).toHaveLength(3);
    expect(coach.querySelectorAll('.mag-coach-starter[aria-pressed="true"]')).toHaveLength(0);
    expect(coach.querySelector('#mag-tutor-question').maxLength).toBe(180);
    expect(coach.querySelector('#mag-tutor-question').getAttribute('aria-describedby')).toBe('mag-coach-context mag-coach-count');
    expect(coach.querySelector('.mag-coach-submit').disabled).toBe(true);
    expect(coach.textContent).toContain('Connect force to rotation');
    expect(coach.textContent).toContain('Nothing is sent to the tutor until you press Ask for a nudge.');
    expect(callGemini).not.toHaveBeenCalled();
  });

  it('selects a starter locally and calls the tutor only after explicit submit', async () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const callGemini = vi.fn(() => Promise.resolve({
      text: 'Reverse only the current, then compare the signed torque before and after.',
    }));
    const announcements = [];
    const live = mountInteractive(cfg, coachSeed({ tab: 'motor' }), callGemini,
      (message) => announcements.push(message));
    try {
      const starter = Array.from(live.host.querySelectorAll('.mag-coach-starter'))
        .find((button) => button.textContent.includes('Compare'));
      act(() => { starter.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

      const expectedQuestion = physics.SOCRATIC_COACH_DEFS.motor.prompts[1].text;
      expect(live.host.querySelector('#mag-tutor-question').value).toBe(expectedQuestion);
      expect(live.host.querySelector('[data-magnetism-socratic-coach]').getAttribute('data-response-state')).toBe('ready');
      expect(live.host.querySelectorAll('.mag-coach-starter[aria-pressed="true"]')).toHaveLength(1);
      expect(callGemini).not.toHaveBeenCalled();
      expect(announcements).toEqual(['Compare question starter selected for Motor.']);

      await submitCoach(live.host);
      expect(callGemini).toHaveBeenCalledTimes(1);
      expect(callGemini.mock.calls[0][1]).toBe(false);
      expect(callGemini.mock.calls[0][0]).toContain('Current station: Motor.');
      expect(callGemini.mock.calls[0][0]).toContain('Learning focus: Connect force to rotation.');
      expect(callGemini.mock.calls[0][0]).toContain('Support mode: guided.');
      expect(callGemini.mock.calls[0][0]).toContain(expectedQuestion);

      const coach = live.host.querySelector('[data-magnetism-socratic-coach]');
      expect(coach.getAttribute('data-response-state')).toBe('answer');
      expect(coach.querySelector('.mag-coach-response').getAttribute('role')).toBe('status');
      expect(coach.textContent).toContain('Reverse only the current');

      act(() => { coach.querySelector('.mag-coach-clear').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.querySelector('#mag-tutor-question').value).toBe('');
      expect(live.host.querySelector('[data-magnetism-socratic-coach]').getAttribute('data-response-state')).toBe('choose');
      expect(announcements.at(-1)).toBe('Question lab cleared.');
    } finally {
      live.close();
    }
  });

  it('shows a protected loading state and falls back to a station-specific prompt on tutor errors', async () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    let resolveHint;
    const pending = new Promise((resolvePromise) => { resolveHint = resolvePromise; });
    const live = mountInteractive(
      cfg,
      coachSeed({ tab: 'induce', askInput: 'What evidence shows that motion speed matters?' }),
      vi.fn(() => pending),
    );
    try {
      await submitCoach(live.host);
      let coach = live.host.querySelector('[data-magnetism-socratic-coach]');
      expect(coach.getAttribute('data-response-state')).toBe('loading');
      expect(coach.querySelector('.mag-coach-loading').getAttribute('role')).toBe('status');
      expect(coach.querySelector('.mag-coach-submit').getAttribute('aria-busy')).toBe('true');
      expect(coach.querySelector('#mag-tutor-question').disabled).toBe(true);
      expect(Array.from(coach.querySelectorAll('.mag-coach-starter')).every((button) => button.disabled)).toBe(true);

      await act(async () => {
        resolveHint({ text: 'Compare slow and fast motion along the same path.' });
        await pending;
      });
      coach = live.host.querySelector('[data-magnetism-socratic-coach]');
      expect(coach.getAttribute('data-response-state')).toBe('answer');
      expect(coach.textContent).toContain('Compare slow and fast motion');
    } finally {
      live.close();
    }

    const failed = mountInteractive(
      cfg,
      coachSeed({ tab: 'materials', askInput: 'How can I test magnetic memory?' }),
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    try {
      await submitCoach(failed.host);
      const fallback = 'Try this question in the lab: ' + physics.SOCRATIC_COACH_DEFS.materials.prompts[1].text;
      expect(failed.host.querySelector('[data-magnetism-socratic-coach]').getAttribute('data-response-state')).toBe('answer');
      expect(failed.host.querySelector('.mag-coach-response p').textContent).toBe(fallback);
    } finally {
      failed.close();
    }
  });

  it('adapts the coach on narrow screens with no automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:560px){.mag-root .mag-coach-head{grid-template-columns:42px minmax(0,1fr)');
    expect(source).toContain('@media(max-width:390px){.mag-root .mag-socratic{padding:10px}');
    expect(source).toContain('@keyframes mag-coach-wave');
    expect(source).toContain('@keyframes mag-coach-dot');
    expect(source).toContain('@media(forced-colors:active){.mag-root .mag-socratic');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    await withCoachHost({
      tab: 'transformer',
      learningMode: 'challenge',
      askInput: 'Why does AC matter here?',
      askAnswer: 'Compare changing flux with the steady-flux DC case.',
    }, async (host, _html, callGemini) => {
      const coach = host.querySelector('[data-magnetism-socratic-coach="true"]');
      expect(coach.getAttribute('data-response-state')).toBe('answer');
      expect(coach.querySelector('.mag-coach-mode').textContent).toBe('Challenge questions');
      const results = await runIsolatedAxe(coach.outerHTML);
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
      expect(callGemini).not.toHaveBeenCalled();
    });
  }, 15000);
});
