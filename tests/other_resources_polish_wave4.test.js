import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const { act } = React;

let host, root;
let createUrlDescriptor, revokeUrlDescriptor;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  ['MonitorPlay', 'ExternalLink', 'BookOpen', 'Search', 'Volume2', 'Printer', 'Plus', 'Trash2', 'Edit3', 'Check', 'X', 'RefreshCw', 'Languages', 'Sparkles', 'Layers'].forEach(name => {
    window[name] = Stub;
  });
  window.AlloModules = window.AlloModules || {};
  createUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  revokeUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

  for (const file of [
    'view_glossary_module.js',
    'view_lesson_teaching_script_module.js',
    'memory_aid_module.js',
    'view_video_ref_player_module.js',
  ]) {
    new Function(readFileSync(resolve(file), 'utf8'))();
  }
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  delete window.AlloSpeechPlayer;
  window.__alloFocusTrapStack = [];
  try { window.localStorage.clear(); } catch (_) {}
  try { window.sessionStorage.clear(); } catch (_) {}
  vi.restoreAllMocks();
});

afterAll(() => {
  if (createUrlDescriptor) Object.defineProperty(URL, 'createObjectURL', createUrlDescriptor);
  else delete URL.createObjectURL;
  if (revokeUrlDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeUrlDescriptor);
  else delete URL.revokeObjectURL;
});

function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
  return host;
}

describe('Other resources polish — Wave 4 (Glossary, Teaching Script, Memory Aid, Video Ref)', () => {
  it('GlossaryView provides inline Self-Test masking, Got-it/Review-again tagging, filtering, and localStorage persistence', () => {
    const GlossaryView = window.AlloModules.GlossaryView;
    const entries = [
      { entryId: 'g-mito', term: 'Mitochondria', def: 'Organelle that generates ATP energy', context: 'Cells need mitochondria to power respiration.', _originalIdx: 0 },
      { entryId: 'g-osmo', term: 'Osmosis', def: 'Movement of water across a semipermeable membrane', context: 'Roots absorb water through osmosis.', _originalIdx: 1 },
      { entryId: 'g-chlo', term: 'Chloroplast', def: 'Site of photosynthesis in plant cells', context: 'Leaves look green because of chloroplasts.', _originalIdx: 2 },
    ];
    const props = glossaryMediaProps({
      ErrorBoundary: ({ children }) => children,
      setGlossarySort: vi.fn(),
      glossarySort: 'lesson',
      generatedContent: {
        id: 'gloss-wave4-1',
        type: 'glossary',
        title: 'Cell Biology Vocabulary',
        data: entries,
      },
      glossaryItems: entries,
      filteredGlossaryData: entries,
      isEditingGlossary: false,
      isTeacherMode: false,
    });

    mount(React.createElement(GlossaryView, props));

    const toggleBtn = host.querySelector('[data-glossary-inline-study]');
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-glossary-study-bar]')).toBeNull();
    // Normal view displays full definitions immediately
    expect(host.textContent).toContain('Organelle that generates ATP energy');

    // Enter inline self-test mode
    act(() => toggleBtn.click());
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-glossary-study-bar]')).toBeTruthy();
    expect(host.textContent).not.toContain('Organelle that generates ATP energy');

    // Reveal first term and mark Got it
    const revealBtns = host.querySelectorAll('[data-glossary-reveal-term]');
    expect(revealBtns.length).toBe(3);
    act(() => revealBtns[0].click());
    expect(host.textContent).toContain('Organelle that generates ATP energy');

    const gotItBtn = host.querySelector('[data-glossary-mark-got-it]');
    expect(gotItBtn).toBeTruthy();
    act(() => gotItBtn.click());
    expect(gotItBtn.getAttribute('aria-pressed')).toBe('true');

    // Reveal all, mark second term Review again
    const revealAllBtn = host.querySelector('[data-glossary-reveal-all]');
    act(() => revealAllBtn.click());
    expect(host.textContent).toContain('Movement of water across a semipermeable membrane');
    const reviewBtns = host.querySelectorAll('[data-glossary-mark-review]');
    act(() => reviewBtns[1].click());

    // Filter to "Review again" — only Osmosis should remain visible
    const reviewFilter = host.querySelector('[data-glossary-study-filter="review"]');
    act(() => reviewFilter.click());
    expect(host.textContent).toContain('Osmosis');
    expect(host.textContent).not.toContain('Mitochondria');

    // Verify persistence across remount
    act(() => root.unmount());
    root = null;
    host.remove();
    mount(React.createElement(GlossaryView, props));
    act(() => host.querySelector('[data-glossary-inline-study]').click());
    const gotItFilter = host.querySelector('[data-glossary-study-filter="got-it"]');
    expect(gotItFilter.textContent).toContain('1');
    act(() => gotItFilter.click());
    expect(host.textContent).toContain('Mitochondria');
    expect(host.textContent).not.toContain('Osmosis');
  });

  it('LessonTeachingScriptView provides live delivery pacing checklist, localStorage persistence, and per-step Rehearse read-aloud', async () => {
    const LessonTeachingScriptView = window.AlloModules.LessonTeachingScriptView;
    const speakCalls = [];
    let resolveSpeech = null;
    let stopCount = 0;
    window.AlloSpeechPlayer = {
      speak: vi.fn((text, opts) => {
        speakCalls.push({ text, opts });
        return new Promise(res => { resolveSpeech = res; });
      }),
      stop: vi.fn(() => {
        stopCount += 1;
        window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { state: 'stopped' } }));
      }),
    };

    const plan = {
      id: 'plan-wave4-1',
      type: 'lesson-plan',
      config: { language: 'English' },
      data: {
        title: 'Fractions on a Number Line',
        teachingScripts: [
          {
            id: 'ver-1',
            title: 'Direct instruction on halves',
            scope: 'segment',
            durationMinutes: 15,
            researchStatus: 'curated',
            steps: [
              {
                id: 'st-1',
                title: 'Hook with a chocolate bar',
                phase: 'hook',
                minutes: 5,
                teacherSays: 'Today we will split one whole number line into two equal parts called halves.',
                studentDoes: 'Point to the midpoint on their mini number line.',
                checkQuestion: 'How many equal parts make halves?',
                possibleResponse: 'Two equal parts.',
                ifStruggling: 'Fold a paper strip once in half.',
                ifReady: 'Predict where fourths would land.',
              },
              {
                id: 'st-2',
                title: 'Model placing one half',
                phase: 'directInstruction',
                minutes: 10,
                teacherSays: 'Watch as I start at zero, count two equal jumps to one, and label one half.',
                studentDoes: 'Label 0, 1/2, and 1 on their whiteboard.',
                checkQuestion: 'Why does one half sit halfway between zero and one?',
                possibleResponse: 'Because one of two equal parts is halfway.',
                ifStruggling: 'Count the spaces instead of tick marks.',
                ifReady: 'Place three halves on a 0 to 2 line.',
              },
            ],
          },
        ],
      },
    };

    const props = {
      generatedContent: plan,
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      t: () => '',
    };

    mount(React.createElement(LessonTeachingScriptView, props));
    // Expand the teaching script panel
    const togglePanel = host.querySelector('h3 button');
    act(() => togglePanel.click());

    const pacing = host.querySelector('[data-script-pacing-status]');
    expect(pacing).toBeTruthy();
    expect(pacing.textContent).toContain('0/2');
    expect(pacing.textContent).toContain('15');

    // Mark step 1 done -> 1/2 steps, 10 min remaining
    const done0 = host.querySelector('[data-script-step-done="0"]');
    act(() => done0.click());
    expect(done0.getAttribute('aria-pressed')).toBe('true');
    expect(pacing.textContent).toContain('1/2');
    expect(pacing.textContent).toContain('10');

    // Rehearse step 1 aloud -> calls AlloSpeechPlayer.speak with teacherSays + checkQuestion
    const rehearse0 = host.querySelector('[data-script-step-listen="0"]');
    expect(rehearse0).toBeTruthy();
    act(() => rehearse0.click());
    expect(rehearse0.getAttribute('aria-pressed')).toBe('true');
    expect(speakCalls).toHaveLength(1);
    expect(speakCalls[0].text).toContain('two equal parts called halves');
    expect(speakCalls[0].text).toContain('How many equal parts make halves?');

    // Clicking again stops rehearsal
    act(() => rehearse0.click());
    expect(stopCount).toBeGreaterThanOrEqual(1);
    expect(rehearse0.getAttribute('aria-pressed')).toBe('false');

    // Resolve any pending promise safely
    if (resolveSpeech) await act(async () => resolveSpeech());

    // Persistence across remount + Reset pacing clears storage
    act(() => root.unmount());
    root = null;
    host.remove();
    mount(React.createElement(LessonTeachingScriptView, props));
    act(() => host.querySelector('h3 button').click());
    expect(host.querySelector('[data-script-pacing-status]').textContent).toContain('1/2');
    const resetBtn = host.querySelector('[data-script-delivery-reset]');
    expect(resetBtn).toBeTruthy();
    act(() => resetBtn.click());
    expect(host.querySelector('[data-script-pacing-status]').textContent).toContain('0/2');
    expect(host.querySelector('[data-script-delivery-reset]')).toBeNull();
  });

  it('MemoryAidView provides quick target stepper pills & filter while preserving unsupported recall isolation', async () => {
    const MemoryAidView = window.AlloModules.MemoryAidView;
    const makeCard = (id, target, fact, extra = {}) => ({
      id,
      target,
      type: 'keyword-association',
      mode: 'generated',
      factLocked: true,
      factVerified: true,
      essentialFacts: [fact],
      aiExample: 'Cue for ' + target,
      mapping: 'Connection for ' + target,
      studentDraft: '',
      studentReasoning: '',
      visualStatus: 'on-demand',
      ...extra,
    });

    const resource = {
      id: 'ma-wave4-1',
      type: 'memory-aid',
      title: 'States of Matter',
      data: {
        schemaVersion: 2,
        title: 'States of Matter',
        instructions: 'Review each target.',
        authorshipMode: 'generated',
        reflectionLevel: 'none',
        reasoningRequired: false,
        cards: [
          makeCard('c1', 'Solid', 'Fixed shape and fixed volume', { studentDraft: 'Frozen brick stays firm' }),
          makeCard('c2', 'Liquid', 'Fixed volume and takes container shape'),
          makeCard('c3', 'Gas', 'Fills container shape and volume'),
          makeCard('c4', 'Plasma', 'Ionized high-energy gas'),
        ],
      },
    };

    mount(React.createElement(MemoryAidView, {
      generatedContent: resource,
      isTeacherMode: false,
      isProcessing: false,
      activeProfileId: 'wave4-learner',
      handleNoteUpdate: () => {},
      addToast: () => {},
      t: () => '',
    }));

    // Stepper chips render for all 4 cards; personalized card 1 displays ✓
    const chips = host.querySelectorAll('[data-memory-aid-target-chip]');
    expect(chips).toHaveLength(4);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(chips[0].textContent).toContain('✓');

    // Click chip 3 ("3. Gas") jumps directly to Gas card
    act(() => chips[2].click());
    expect(host.querySelector('[data-memory-aid-target-chip="2"]').getAttribute('aria-pressed')).toBe('true');
    const visibleArticle = Array.from(host.querySelectorAll('article')).find(el => !el.hidden);
    expect(visibleArticle.querySelector('h2').textContent).toBe('Gas');

    // Filter input appears for 4+ targets and matches essential facts ("Ionized")
    const filterInput = host.querySelector('[data-memory-aid-target-filter]');
    expect(filterInput).toBeTruthy();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => {
      nativeSetter.call(filterInput, 'Ionized');
      filterInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const filteredChips = host.querySelectorAll('[data-memory-aid-target-chip]');
    expect(filteredChips).toHaveLength(1);
    expect(filteredChips[0].textContent).toContain('Plasma');

    // Clear filter restores all 4 chips
    act(() => host.querySelector('[data-memory-aid-target-filter-clear]').click());
    expect(host.querySelectorAll('[data-memory-aid-target-chip]')).toHaveLength(4);

    // Start unsupported recall practice -> stepper pills & filter MUST disappear (zero target leakage)
    const tryRecallBtn = Array.from(host.querySelectorAll('button')).find(b => !b.closest('[hidden]') && b.textContent === 'Try recall');
    expect(tryRecallBtn).toBeTruthy();
    act(() => tryRecallBtn.click());
    const withoutHintsRadio = Array.from(host.querySelectorAll('input[type="radio"]')).find(i => !i.closest('[hidden]') && i.parentElement.textContent === 'Without hints');
    expect(withoutHintsRadio).toBeTruthy();
    act(() => withoutHintsRadio.click());
    const startRecallBtn = Array.from(host.querySelectorAll('button')).find(b => !b.closest('[hidden]') && b.textContent === 'Start recall practice');
    expect(startRecallBtn).toBeTruthy();
    act(() => startRecallBtn.click());
    expect(host.querySelector('[data-memory-aid-target-pills]')).toBeNull();
    expect(host.querySelector('[data-memory-aid-target-filter]')).toBeNull();
  });

  it('VideoRefPlayerOverlay exposes UDL playback speed pills and 10s rewind/forward controls', async () => {
    const VideoRefPlayerOverlay = window.AlloModules.VideoRefPlayer.VideoRefPlayerOverlay;
    let urlCounter = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:wave4-vid-' + (++urlCounter)),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    window.AlloModules.VideoStudio = {
      vsReadZip: () => [
        { name: 'lesson.webm', data: new Uint8Array([1, 2, 3, 4]) },
      ],
    };

    mount(React.createElement(VideoRefPlayerOverlay, {
      item: { title: 'Water Cycle Lab', data: { title: 'Water Cycle Lab', durationSec: 60 } },
      onClose: () => {},
      addToast: () => {},
      t: () => '',
    }));

    // Controls do not appear before a video file is loaded
    expect(host.querySelector('[data-video-ref-controls]')).toBeNull();

    // Attach pack to load video
    const input = host.querySelector('input[type="file"]');
    const fakePack = {
      name: 'water-cycle.allopack',
      arrayBuffer: async () => new Uint8Array([80, 75, 3, 4]).buffer,
    };
    Object.defineProperty(input, 'files', { configurable: true, value: [fakePack] });
    await act(async () => {
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
      await Promise.resolve();
      await new Promise(r => window.setTimeout(r, 0));
    });

    const video = host.querySelector('video');
    expect(video).toBeTruthy();
    expect(host.querySelector('[data-video-ref-controls]')).toBeTruthy();
    expect(host.querySelector('[data-video-ref-speed="1"]').getAttribute('aria-pressed')).toBe('true');

    // Change speed to 0.75x and 1.5x
    act(() => host.querySelector('[data-video-ref-speed="0.75"]').click());
    expect(video.playbackRate).toBe(0.75);
    expect(host.querySelector('[data-video-ref-speed="0.75"]').getAttribute('aria-pressed')).toBe('true');

    act(() => host.querySelector('[data-video-ref-speed="1.5"]').click());
    expect(video.playbackRate).toBe(1.5);

    // Jump forward 10s, then rewind 10s (and clamp at 0)
    video.currentTime = 14;
    act(() => host.querySelector('[data-video-ref-forward]').click());
    expect(video.currentTime).toBe(24);

    act(() => host.querySelector('[data-video-ref-rewind]').click());
    expect(video.currentTime).toBe(14);

    video.currentTime = 4;
    act(() => host.querySelector('[data-video-ref-rewind]').click());
    expect(video.currentTime).toBe(0);
  });
});
