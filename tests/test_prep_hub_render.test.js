import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Hub, Component, root, host, originalFetch;

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: {
    'color-contrast': { enabled: false },
    'region': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'landmark-one-main': { enabled: false },
    'scrollable-region-focusable': { enabled: false },
  },
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  Component = Hub.TestPrepHub;
  originalFetch = global.fetch;
  const auditFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_audit.json'), 'utf8'));
  const inventoryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_inventory.json'), 'utf8'));
  const libraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_learning_library.json'), 'utf8'));
  const paraProLibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/parapro_learning_library.json'), 'utf8'));
  const specialEducation5355LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/special_education_5355_learning_library.json'), 'utf8'));
  const schoolCounselor5422LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/school_counselor_5422_learning_library.json'), 'utf8'));
  const schoolPsychologist5403LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/school_psychologist_5403_learning_library.json'), 'utf8'));
  const speechLanguagePathology5331LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/speech_language_pathology_5331_learning_library.json'), 'utf8'));
  const audiology5343LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/audiology_5343_learning_library.json'), 'utf8'));
  const readingSpecialist5302LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/reading_specialist_5302_learning_library.json'), 'utf8'));
  const educationalLeadership5412LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/educational_leadership_5412_learning_library.json'), 'utf8'));
  const pltK65622LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/plt_k6_5622_learning_library.json'), 'utf8'));
  const praxisCore5752LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/praxis_core_5752_learning_library.json'), 'utf8'));
  const esol5362LibraryFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/esol_5362_learning_library.json'), 'utf8'));
  const reportFetch = async (url) => {
    if (String(url).includes('content_audit.json')) return { ok: true, json: async () => auditFixture };
    if (String(url).includes('content_inventory.json')) return { ok: true, json: async () => inventoryFixture };
    if (String(url).includes('eppp_learning_library.json')) return { ok: true, json: async () => libraryFixture };
    if (String(url).includes('parapro_learning_library.json')) return { ok: true, json: async () => paraProLibraryFixture };
    if (String(url).includes('special_education_5355_learning_library.json')) return { ok: true, json: async () => specialEducation5355LibraryFixture };
    if (String(url).includes('school_counselor_5422_learning_library.json')) return { ok: true, json: async () => schoolCounselor5422LibraryFixture };
    if (String(url).includes('school_psychologist_5403_learning_library.json')) return { ok: true, json: async () => schoolPsychologist5403LibraryFixture };
    if (String(url).includes('speech_language_pathology_5331_learning_library.json')) return { ok: true, json: async () => speechLanguagePathology5331LibraryFixture };
    if (String(url).includes('audiology_5343_learning_library.json')) return { ok: true, json: async () => audiology5343LibraryFixture };
    if (String(url).includes('reading_specialist_5302_learning_library.json')) return { ok: true, json: async () => readingSpecialist5302LibraryFixture };
    if (String(url).includes('educational_leadership_5412_learning_library.json')) return { ok: true, json: async () => educationalLeadership5412LibraryFixture };
    if (String(url).includes('plt_k6_5622_learning_library.json')) return { ok: true, json: async () => pltK65622LibraryFixture };
    if (String(url).includes('praxis_core_5752_learning_library.json')) return { ok: true, json: async () => praxisCore5752LibraryFixture };
    if (String(url).includes('esol_5362_learning_library.json')) return { ok: true, json: async () => esol5362LibraryFixture };
    return { ok: false, json: async () => ({}) };
  };
  global.fetch = window.fetch = reportFetch;
}, 30_000);

afterAll(() => {
  global.fetch = originalFetch;
  window.fetch = originalFetch;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  document.body.style.overflow = '';
});

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, { isOpen: true, onClose: () => {}, ...props }));
  });
}

function findButton(text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

async function waitForText(text, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!host.textContent.includes(text) && Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  }
  expect(host.textContent).toContain(text);
}

async function clickButton(text) {
  const button = findButton(text);
  expect(button, 'Missing button: ' + text).toBeTruthy();
  await act(async () => { button.click(); });
}

function expectIndependentTargetedSession(pack) {
  const session = JSON.parse(localStorage.getItem('alloflow_test_prep_session_v1'));
  expect(session).toMatchObject({ packId: pack.id, mode: 'targeted' });
  expect(session.itemIds.length).toBeGreaterThan(0);
  expect(session.itemIds.length).toBeLessThanOrEqual(20);
  const byId = new Map(pack.items.map((item) => [item.id, item]));
  expect(session.itemIds.every((id) => {
    const item = byId.get(id);
    return item && item.examItemStatus !== 'not-approved-as-independent-exam-item';
  })).toBe(true);
  expect(host.textContent).toContain('Question 1 of ' + session.itemIds.length);
  return session;
}

function replaceWindowProperty(name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(window, name);
  Object.defineProperty(window, name, { configurable: true, writable: true, value });
  return () => {
    if (descriptor) Object.defineProperty(window, name, descriptor);
    else delete window[name];
  };
}

async function expectNoAxeViolations(label) {
  const results = await axe.run(host, AXE_OPTIONS);
  const summary = results.violations.map((violation) =>
    label + ': ' + violation.id + ' - ' + violation.nodes.slice(0, 2).map((node) => node.html).join(' | '),
  );
  expect(summary).toEqual([]);
}

describe('Test Prep Hub render flow', () => {
  it('renders the pack catalog and an accessible practice screen', async () => {
    await mount();

    expect(host.textContent).toContain('Test Prep Hub');
    expect(host.textContent).toContain('Workplace Safety Foundations');
    expect(host.textContent).toContain('EPPP Part 1 — Source-Reviewed Practice Bank');
    expect(host.textContent).toContain('Vocational research lanes');
    await expectNoAxeViolations('catalog');

    await clickButton('Open practice pack');
    expect(host.textContent).toContain('Question 1 of 5');
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(4);
    expect(findButton('Check answer').disabled).toBe(true);
    await expectNoAxeViolations('practice question');
  }, 30_000);

  it('scales every Hub typography tier with an explicit full-surface mode', async () => {
    await mount();

    const dialog = host.querySelector('[role="dialog"]');
    const style = host.querySelector('style[data-test-prep-accessibility-styles="true"]');
    const toggle = findButton('Larger text');
    expect(dialog.getAttribute('data-test-prep-text-size')).toBe('standard');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(style).toBeTruthy();
    for (const tier of ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl']) {
      expect(style.textContent).toContain('.' + tier);
    }

    await clickButton('Larger text');
    expect(dialog.getAttribute('data-test-prep-text-size')).toBe('large');
    expect(findButton('Standard text').getAttribute('aria-pressed')).toBe('true');

    await clickButton('Standard text');
    expect(dialog.getAttribute('data-test-prep-text-size')).toBe('standard');
    expect(findButton('Larger text').getAttribute('aria-pressed')).toBe('false');
  });

  it('plays the shared TTS URL and lets the learner stop question audio', async () => {
    const audio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onplay: null,
      onended: null,
      onerror: null,
    };
    const AudioMock = vi.fn(function MockAudio(url) {
      audio.src = url;
      return audio;
    });
    const restoreAudio = replaceWindowProperty('Audio', AudioMock);
    const callTTS = vi.fn().mockResolvedValue('blob:question-audio');
    const addToast = vi.fn();

    try {
      await mount({ callTTS, addToast });
      await clickButton('Open practice pack');
      const pack = Hub.listPacks().find((candidate) => candidate.id === 'workplace-safety-foundations-demo');
      const expectedText = Hub.questionSpeechText(pack.items[0], 0, pack.items.length);

      expect(findButton('Read question').getAttribute('aria-pressed')).toBe('false');
      await clickButton('Read question');
      await waitForText('Stop reading', 2_000);

      expect(callTTS).toHaveBeenCalledTimes(1);
      expect(callTTS.mock.calls[0][0]).toBe(expectedText);
      expect(callTTS.mock.calls[0][3]).toMatchObject({ maxRetries: 2 });
      expect(callTTS.mock.calls[0][3].signal).toBeTruthy();
      expect(AudioMock).toHaveBeenCalledWith('blob:question-audio');
      expect(audio.play).toHaveBeenCalledTimes(1);
      expect(findButton('Stop reading').getAttribute('aria-pressed')).toBe('true');

      await clickButton('Stop reading');
      expect(audio.pause).toHaveBeenCalledTimes(1);
      expect(findButton('Read question').getAttribute('aria-pressed')).toBe('false');
      expect(addToast).toHaveBeenCalledWith('Read-aloud stopped.', 'info');
    } finally {
      restoreAudio();
    }
  });

  it('prewarms three questions and accepts a spoken answer without microphone and narration overlap', async () => {
    const audioInstances = [];
    const AudioMock = vi.fn(function MockAudio(url) {
      const audio = { src: url, play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onplay: null, onended: null, onerror: null };
      audioInstances.push(audio);
      return audio;
    });
    const recognitionInstances = [];
    function MockRecognition() {
      this.start = vi.fn(() => { if (this.onstart) this.onstart(); });
      this.abort = vi.fn();
      this.stop = vi.fn();
      recognitionInstances.push(this);
    }
    const restoreAudio = replaceWindowProperty('Audio', AudioMock);
    const restoreRecognition = replaceWindowProperty('SpeechRecognition', MockRecognition);
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 30));

    try {
      await mount({ callTTS, selectedVoice: 'Kore' });
      await clickButton('Open practice pack');
      await clickButton('Hands-free mode');
      const deadline = Date.now() + 3_000;
      while ((callTTS.mock.calls.length < 4 || audioInstances.length < 1) && Date.now() < deadline) {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      }
      expect(callTTS).toHaveBeenCalledTimes(4);
      const prewarmCalls = callTTS.mock.calls.filter((call) => call[3] && call[3].reason === 'test-prep-prewarm');
      expect(prewarmCalls).toHaveLength(3);
      expect(prewarmCalls.every((call) => call[1] === 'Kore' && call[3].priority === 'low' && call[3].maxRetries === 0)).toBe(true);
      const foregroundCall = callTTS.mock.calls.find((call) => call[3] && call[3].reason === 'test-prep-playback');
      expect(foregroundCall[3].signal).toBeTruthy();
      expect(recognitionInstances).toHaveLength(0);
      expect(host.textContent).toContain('Audio for the next three questions is prepared quietly');

      await act(async () => { audioInstances[0].onended(); await new Promise((resolve) => setTimeout(resolve, 150)); });
      expect(recognitionInstances).toHaveLength(1);
      expect(recognitionInstances[0].start).toHaveBeenCalledTimes(1);
      await act(async () => {
        recognitionInstances[0].onresult({ results: [[{ transcript: 'choose option B' }]] });
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(host.querySelectorAll('input[type="radio"]')[1].checked).toBe(true);
      expect(callTTS.mock.calls.at(-1)[0]).toContain('Selected B');
      expect(recognitionInstances[0].abort).toHaveBeenCalledTimes(1);
    } finally {
      restoreRecognition();
      restoreAudio();
    }
  });

  it('routes a spoken clarification through the pre-answer guard and records assisted use', async () => {
    const audioInstances = [];
    const AudioMock = vi.fn(function MockAudio(url) {
      const audio = { src: url, play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onplay: null, onended: null, onerror: null };
      audioInstances.push(audio);
      return audio;
    });
    const recognitionInstances = [];
    function MockRecognition() {
      this.start = vi.fn(() => { if (this.onstart) this.onstart(); });
      this.abort = vi.fn();
      this.stop = vi.fn();
      recognitionInstances.push(this);
    }
    const restoreAudio = replaceWindowProperty('Audio', AudioMock);
    const restoreRecognition = replaceWindowProperty('SpeechRecognition', MockRecognition);
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 30));
    const callGemini = vi.fn().mockResolvedValue('Approved means the procedure has been reviewed and authorized for this setting.');

    try {
      await mount({ callTTS, callGemini });
      await clickButton('Open practice pack');
      await clickButton('Hands-free mode');
      const audioDeadline = Date.now() + 3_000;
      while (audioInstances.length < 1 && Date.now() < audioDeadline) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      await act(async () => { audioInstances[0].onended(); await new Promise((resolve) => setTimeout(resolve, 150)); });
      await act(async () => {
        recognitionInstances[0].onresult({ results: [[{ transcript: 'ask what does approved mean' }]] });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      await waitForText('Approved means the procedure has been reviewed', 2_000);
      expect(callGemini).toHaveBeenCalledTimes(1);
      expect(callGemini.mock.calls[0][0]).toContain('Clarify wording, vocabulary, or task directions only.');
      expect(callGemini.mock.calls[0][0]).not.toContain('Complete the required training before operating unfamiliar equipment');
      const session = JSON.parse(localStorage.getItem('alloflow_test_prep_session_v1'));
      const pack = Hub.listPacks().find((candidate) => candidate.id === 'workplace-safety-foundations-demo');
      expect(session.assistedItemIds).toEqual([pack.items[0].id]);
      expect(host.textContent).toContain('AI clarification - assisted item');
    } finally {
      restoreRecognition();
      restoreAudio();
    }
  });

  it('falls back to browser speech when generated audio fails after playback starts', async () => {
    const audio = { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onplay: null, onended: null, onerror: null };
    const AudioMock = vi.fn(function MockAudio() { return audio; });
    const restoreAudio = replaceWindowProperty('Audio', AudioMock);
    const utterances = [];
    function MockSpeechSynthesisUtterance(text) { this.text = text; utterances.push(this); }
    const speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    const restoreSpeech = replaceWindowProperty('speechSynthesis', speechSynthesis);
    const restoreUtterance = replaceWindowProperty('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
    const callTTS = vi.fn().mockResolvedValue('blob:question-audio');

    try {
      await mount({ callTTS });
      await clickButton('Open practice pack');
      await clickButton('Read question');
      await waitForText('Stop reading', 2_000);
      expect(typeof audio.onerror).toBe('function');

      await act(async () => { audio.onerror(); });
      expect(utterances).toHaveLength(1);
      expect(speechSynthesis.speak).toHaveBeenCalledWith(utterances[0]);
      expect(utterances[0].text).toBe(callTTS.mock.calls[0][0]);
      expect(findButton('Stop reading').getAttribute('aria-pressed')).toBe('true');
    } finally {
      restoreUtterance();
      restoreSpeech();
      restoreAudio();
    }
  });

  it.each([
    ['returns no audio URL', () => Promise.resolve(null)],
    ['rejects', () => Promise.reject(new Error('TTS unavailable'))],
  ])('falls back to browser speech when shared TTS %s and surfaces speech errors', async (_label, ttsImplementation) => {
    const utterances = [];
    function MockSpeechSynthesisUtterance(text) {
      this.text = text;
      utterances.push(this);
    }
    const speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    const restoreSpeech = replaceWindowProperty('speechSynthesis', speechSynthesis);
    const restoreUtterance = replaceWindowProperty('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
    const callTTS = vi.fn(ttsImplementation);
    const addToast = vi.fn();

    try {
      await mount({ callTTS, addToast });
      await clickButton('Open practice pack');
      await clickButton('Read question');
      await waitForText('Stop reading', 2_000);

      expect(callTTS).toHaveBeenCalledTimes(1);
      expect(utterances).toHaveLength(1);
      expect(speechSynthesis.speak).toHaveBeenCalledWith(utterances[0]);
      expect(utterances[0].text).toBe(callTTS.mock.calls[0][0]);

      await act(async () => { utterances[0].onerror({ error: 'synthesis-failed' }); });
      await waitForText('Read-aloud is unavailable in this environment.', 2_000);
      const status = host.querySelector('p[role="status"]');
      expect(status.className).not.toContain('sr-only');
      expect(addToast).toHaveBeenCalledWith('Read-aloud is unavailable in this environment.', 'warning');
    } finally {
      restoreUtterance();
      restoreSpeech();
    }
  });

  it('opens contextual notes and a non-predictive weekly activity plan', async () => {
    await mount();
    const firstOpen = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { firstOpen.click(); });
    await waitForText('Question 1 of 5');

    expect(findButton('Notes & highlights')).toBeTruthy();
    await clickButton('Add note or highlight');
    expect(host.textContent).toContain('Portable study workspace');
    expect(host.textContent).toContain('Attached to question');
    expect(host.querySelector('textarea[aria-label="Study annotation text"]')).toBeTruthy();
    expect(findButton('Save annotation').disabled).toBe(true);
    await expectNoAxeViolations('notes and highlights workspace');

    await clickButton('Progress');
    expect(host.textContent).toContain('Weekly study plan');
    expect(host.textContent).toContain('Activity goals only');
    expect(host.querySelector('input[aria-label="Weekly question goal"]')).toBeTruthy();
    expect(host.querySelector('input[aria-label="Weekly completed-set goal"]')).toBeTruthy();
    expect(host.querySelector('input[aria-label="Weekly active-day goal"]')).toBeTruthy();
    expect(host.textContent).toContain('do not estimate ability, readiness');
    await expectNoAxeViolations('weekly study plan');
  }, 30_000);
  it('persists saved questions and starts a focused review set', async () => {
    await mount();
    await clickButton('Open practice pack');
    const pack = Hub.listPacks().find((candidate) => candidate.id === 'workplace-safety-foundations-demo');

    expect(findButton('Save for review')).toBeTruthy();
    await clickButton('Save for review');
    expect(findButton('Remove from review')).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem('alloflow_test_prep_review_items_v1'));
    expect(stored[pack.id]).toEqual([pack.items[0].id]);

    await clickButton('Practice options');
    expect(host.textContent).toContain('1 question saved');
    await clickButton('Review 1 saved question');
    expect(host.textContent).toContain('Saved-question review');
    expect(host.textContent).toContain('Question 1 of 1');
    expect(host.textContent).toContain(pack.items[0].prompt);
    await expectNoAxeViolations('saved-question review');
  }, 30_000);

  it('completes the demo, records progress, and avoids official-score claims', async () => {
    await mount();
    await clickButton('Open practice pack');
    const pack = Hub.listPacks().find((candidate) => candidate.id === 'workplace-safety-foundations-demo');

    for (let index = 0; index < pack.items.length; index += 1) {
      const item = pack.items[index];
      const radios = Array.from(host.querySelectorAll('input[type="radio"]'));
      await act(async () => { radios[item.answerIndex].click(); });
      await clickButton('Check answer');
      expect(host.textContent).toContain('Correct');
      await clickButton(index === pack.items.length - 1 ? 'Finish practice' : 'Next question');
    }

    expect(host.textContent).toContain('5/5');
    expect(host.textContent).toContain('not an official score');
    expect(host.textContent).not.toContain('You passed');
    const saved = JSON.parse(localStorage.getItem('alloflow_test_prep_progress_v1'));
    expect(saved.attempts).toHaveLength(1);
    expect(saved.attempts[0]).toMatchObject({ correct: 5, total: 5, percent: 100 });
    await expectNoAxeViolations('practice result');
  }, 30_000);

  it('offers fifteen directly selectable EPPP practice banks with global ranges', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { openButtons[1].click(); });
    await waitForText('Choose a 100-question practice bank');

    const bankButtons = Array.from(host.querySelectorAll('button')).filter((button) => /^Start Practice Bank [0-9]+$/.test(button.textContent.trim()));
    expect(bankButtons).toHaveLength(15);
    expect(host.textContent).toContain('Questions 1–100');
    expect(host.textContent).toContain('Questions 1401–1500');
    expect(host.textContent).toContain('15 banks');
    expect(host.textContent).toContain('1,500 questions total');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'eppp-part-one');
    await clickButton('Start Practice Bank 15');
    expect(host.textContent).toContain('Practice Bank 15 of 15');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain('Question bank item 1401 of 1500');
    expect(host.textContent).toContain(pack.items[1400].prompt);
    expect(findButton('Practice options')).toBeTruthy();
    await expectNoAxeViolations('EPPP bank 15');
  }, 30_000);
  it('builds a balanced custom quiz through the shared pack UI', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { openButtons[1].click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Custom quiz builder');
    expect(host.textContent).toContain('reproducible variation');
    expect(host.querySelector('input[aria-label="Custom quiz question count"]')).toBeTruthy();
    expect(host.querySelector('select[aria-label="Custom quiz variation"]')).toBeTruthy();
    await clickButton('Start custom quiz');
    expect(host.textContent).toContain('Custom quiz · 20 questions · variation 1');
    expect(host.textContent).toContain('Question 1 of 20');
    await expectNoAxeViolations('custom quiz practice');
  }, 30_000);
  it('starts an accessible EPPP Domain focus set without a skills catalog and saves its targeting metadata', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { openButtons[1].click(); });
    await waitForText('Choose a study mode');

    const domainSelect = host.querySelector('select[aria-label="Domain focus domain"]');
    const difficultySelect = host.querySelector('select[aria-label="Domain focus difficulty"]');
    expect(domainSelect).toBeTruthy();
    expect(difficultySelect).toBeTruthy();
    expect(host.querySelector('select[aria-label="Target practice skill"]')).toBeNull();
    expect(Array.from(domainSelect.options).map((option) => option.textContent)).toContain('Assessment and diagnosis');

    await act(async () => {
      domainSelect.value = 'assessment';
      domainSelect.dispatchEvent(new Event('change', { bubbles: true }));
      difficultySelect.value = 'higher-challenge';
      difficultySelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.textContent).toMatch(/20 of \d+ matching questions ready\./);
    await clickButton('Start Domain focus');
    expect(host.textContent).toContain('Domain focus: Assessment and diagnosis');
    expect(host.textContent).toContain('intermediate and advanced');
    expect(host.textContent).toContain('Question 1 of 20');

    const session = JSON.parse(localStorage.getItem('alloflow_test_prep_session_v1'));
    expect(session).toMatchObject({
      packId: 'eppp-part-one',
      mode: 'targeted',
      targetDomainId: 'assessment',
      targetDifficulties: ['intermediate', 'advanced'],
    });
    expect(session.itemIds).toHaveLength(20);
    await expectNoAxeViolations('EPPP Domain focus practice');
  }, 30_000);

  it('opens the future EPPP preview at study options and targets any future domain without skill tags', async () => {
    await mount();
    const previewCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('2027 Blueprint Preview'));
    expect(previewCard).toBeTruthy();
    const openButton = Array.from(previewCard.querySelectorAll('button')).find((button) => button.textContent.includes('Open preview pack'));
    expect(openButton).toBeTruthy();
    await act(async () => { openButton.click(); });
    await waitForText('Choose a study mode');

    const domainSelect = host.querySelector('select[aria-label="Domain focus domain"]');
    const difficultySelect = host.querySelector('select[aria-label="Domain focus difficulty"]');
    expect(Array.from(domainSelect.options).map((option) => option.value).filter(Boolean)).toEqual([
      'scientific-orientation',
      'assessment',
      'intervention',
      'consultation-supervision',
      'interpersonal-relationships',
      'ethical-professional-practice',
    ]);
    expect(host.querySelector('select[aria-label="Target practice skill"]')).toBeNull();
    await act(async () => {
      domainSelect.value = 'ethical-professional-practice';
      domainSelect.dispatchEvent(new Event('change', { bubbles: true }));
      difficultySelect.value = 'advanced';
      difficultySelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.textContent).toContain('4 of 4 matching questions ready.');
    await clickButton('Start Domain focus');
    expect(host.textContent).toContain('Domain focus: Ethical and Professional Practice');
    expect(host.textContent).toContain('Question 1 of 4');
    expect(host.textContent).toContain('Unofficial integrated 2027 blueprint practice');
    const session = JSON.parse(localStorage.getItem('alloflow_test_prep_session_v1'));
    expect(session).toMatchObject({ packId: 'eppp-integrated-2027-preview', targetDomainId: 'ethical-professional-practice', targetDifficulties: ['advanced'] });
    await expectNoAxeViolations('future EPPP Domain focus');
  }, 30_000);

  it('browses, filters, and opens the native EPPP learning catalog', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { openButtons[1].click(); });
    await clickButton('Learning library');
    await waitForText('Showing 49 of 49 chapters');

    expect(host.textContent).toContain('Native learning catalog');
    expect(host.textContent).toContain('Showing 49 of 49 chapters');
    expect(host.textContent).toContain('415');
    expect(host.textContent).toContain('255');
    expect(host.querySelector('input[type="search"]')).toBeTruthy();
    expect(host.querySelector('select')).toBeTruthy();
    expect(findButton('Search all')).toBeTruthy();
    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Behavioral Assessment & Functional Analysis'));
    expect(chapterCard).toBeTruthy();
    await expectNoAxeViolations('learning library catalog');
    await act(async () => { chapterCard.querySelector('button').click(); });
    const frame = host.querySelector('iframe[title="Selected EPPP chapter"]');
    expect(frame).toBeTruthy();
    expect(frame.getAttribute('src')).toContain('page=textbook#ch-4');
  }, 30_000);

  it('studies flashcards and memory aids with persistent accessible controls', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { openButtons[1].click(); });
    await clickButton('Learning library');
    await waitForText('Showing 49 of 49 chapters');

    await clickButton('Flashcards');
    expect(host.textContent).toContain('Flashcard study');
    expect(host.textContent).toContain('Show due cards only');
    expect(host.textContent).toContain('336 due now');
    expect(host.textContent).toContain('1 of 336 matching cards');
    await clickButton('Reveal answer');
    expect(host.textContent).toContain('Answer:');
    await clickButton('Know it');
    const saved = JSON.parse(localStorage.getItem('alloflow_test_prep_flashcards_eppp-part-one_v1'));
    expect(Object.values(saved).some((entry) => entry.rating === 'know' && entry.intervalDays === 1 && entry.dueAt > entry.lastReviewedAt)).toBe(true);
    await expectNoAxeViolations('flashcard study mode');

    await clickButton('Memory aids');
    expect(host.textContent).toContain('Memory-aid library');
    expect(host.textContent).toContain('Showing 56 of 56 released memory aids');
    await clickButton('Show aid');
    expect(findButton('Hide aid')).toBeTruthy();
    expect(host.textContent).toContain('Why this source is reputable:');
  }, 30_000);

  it('uses ParaPro batch selection, timed simulation, and native chapter learning', async () => {
    await mount();
    const paraProCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('ParaPro Assessment'));
    expect(paraProCard).toBeTruthy();
    await act(async () => { paraProCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('Start Practice Bank 3');
    expect(host.textContent).toContain('Start Practice Bank 4');
    expect(host.textContent).toContain('Start Practice Bank 5');
    expect(host.textContent).not.toContain('Start Guided Review');
    expect(host.textContent).toContain('Choose any of the 5 practice banks');
    expect(host.textContent).toContain('Each bank includes 100 questions');
    expect(host.textContent).toContain('90 questions');
    expect(host.textContent).toContain('150 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'parapro-1755-practice-1');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start Practice Bank 3');
    expect(host.textContent).toContain('Practice Bank 3 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[200].prompt);
    expect(host.textContent).toContain('Independent-practice bank item 201 of 500');

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start Practice Bank 4');
    expect(host.textContent).toContain('Practice Bank 4 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[300].prompt);
    expect(host.textContent).toContain('Independent-practice bank item 301 of 500');

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start Practice Bank 5');
    expect(host.textContent).toContain('Practice Bank 5 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[400].prompt);
    expect(host.textContent).toContain('Independent-practice bank item 401 of 500');

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('Optional timed simulation');
    expect(host.textContent).toContain('Question 1 of 90');
    expect(host.textContent).toContain('Time remaining 150:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('ParaPro learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Main Ideas, Details, and Evidence'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Learning objectives');
    expect(host.textContent).toContain('Chapter lessons');
    expect(host.textContent).toContain('Knowledge checks');
    expect(host.textContent).toContain('From topic to main idea');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('Which statement best distinguishes a topic from a main idea?'));
    expect(firstCheck).toBeTruthy();
    const firstChoice = firstCheck.querySelector('input[type="radio"]');
    await act(async () => { firstChoice.click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('Topic and main idea operate at different levels');
    await expectNoAxeViolations('ParaPro native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Main Ideas, Details, and Evidence');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5355 diagnostics, timed simulation, and native special-education learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Special Education: Foundational Knowledge'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('120 questions');
    expect(host.textContent).toContain('120 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-special-education-5355');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('Optional timed simulation');
    expect(host.textContent).toContain('Question 1 of 120');
    expect(host.textContent).toContain('Time remaining 120:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis Special Education: Foundational Knowledge (5355) learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Development, Context, and Learner Variability'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Learning objectives');
    expect(host.textContent).toContain('Chapter lessons');
    expect(host.textContent).toContain('Knowledge checks');
    expect(host.textContent).toContain('Milestones are reference points, not verdicts');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('A kindergarten teacher notices'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('Milestones provide useful reference points');
    await expectNoAxeViolations('5355 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Development, Context, and Learner Variability');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5422 diagnostics, timed simulation, and native school-counselor learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('School Counselor (5422)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('120 questions');
    expect(host.textContent).toContain('120 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-school-counselor-5422');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('Optional timed simulation');
    expect(host.textContent).toContain('Question 1 of 120');
    expect(host.textContent).toContain('Time remaining 120:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis School Counselor (5422) learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('School Counselor Role and Program Foundations'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Learning objectives');
    expect(host.textContent).toContain('Chapter lessons');
    expect(host.textContent).toContain('Knowledge checks');
    expect(host.textContent).toContain('A comprehensive program for every student');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('A principal asks the school counselor'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('comprehensive program is preventive');
    await expectNoAxeViolations('5422 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: School Counselor Role, Identity, and Program Foundations');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5403 diagnostics, timed simulation, and native school-psychologist learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('School Psychologist (5403)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('125 questions');
    expect(host.textContent).toContain('125 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-school-psychologist-5403');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('Optional timed simulation');
    expect(host.textContent).toContain('Question 1 of 125');
    expect(host.textContent).toContain('Time remaining 125:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis School Psychologist (5403) learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Problem Solving and Multimethod Data Integration'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Learning objectives');
    expect(host.textContent).toContain('Chapter lessons');
    expect(host.textContent).toContain('Knowledge checks');
    expect(host.textContent).toContain('From referral label to measurable problem');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('A teacher says a student'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('observable performance');
    await expectNoAxeViolations('5403 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Problem Solving, Multimethod Assessment, and Data Integration');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5331 diagnostics, timed simulation, and native SLP learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Speech-Language Pathology (5331)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('132 questions');
    expect(host.textContent).toContain('150 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-speech-language-pathology-5331');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('Optional timed simulation');
    expect(host.textContent).toContain('Question 1 of 132');
    expect(host.textContent).toContain('Time remaining 150:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis Speech-Language Pathology (5331) learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Anatomy, Physiology, Development, and Scientific Foundations'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Learning objectives');
    expect(host.textContent).toContain('Chapter lessons');
    expect(host.textContent).toContain('Knowledge checks');
    expect(host.textContent).toContain('Respiration, phonation, and resonance');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('Which cranial nerve is most directly responsible for tongue movement'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('Cranial nerve XII supplies');
    await expectNoAxeViolations('5331 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Anatomy, Physiology, Development, and Scientific Foundations');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5343 diagnostics, timed simulation, and native audiology learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Audiology (5343)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('120 questions');
    expect(host.textContent).toContain('120 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-audiology-5343');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('Optional timed simulation');
    expect(host.textContent).toContain('Question 1 of 120');
    expect(host.textContent).toContain('Time remaining 120:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis Audiology (5343) learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Auditory Anatomy, Physiology, Acoustics, and Instrumentation'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Learning objectives');
    expect(host.textContent).toContain('Chapter lessons');
    expect(host.textContent).toContain('Knowledge checks');
    expect(host.textContent).toContain('Outer, middle, and inner-ear systems');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('What is the primary function of the ossicular chain'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('middle-ear system transfers energy');
    await expectNoAxeViolations('5343 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Auditory Anatomy, Physiology, Acoustics, and Instrumentation');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5302 diagnostics, mixed-format guidance, response workshops, and native reading-specialist learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Reading Specialist (5302)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('95 questions');
    expect(host.textContent).toContain('150 minutes');
    expect(host.textContent).toContain('selected-response items only');
    expect(host.textContent).toContain('does not score constructed responses');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-reading-specialist-5302');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain(pack.items[100].prompt);
    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('95-question selected-response timed segment');
    expect(host.textContent).toContain('Question 1 of 95');
    expect(host.textContent).toContain('Time remaining 150:00');
    expect(findButton('Check answer')).toBeFalsy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis Reading Specialist (5302) learning library');
    expect(host.textContent).toContain('Response workshops');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');
    await clickButton('Written-response workshops');
    expect(host.textContent).toContain('Professional Learning Plan From Schoolwide Evidence');
    expect(host.textContent).toContain('Individual student case study');
    expect(host.textContent).toContain('AlloFlow does not score written responses');
    await expectNoAxeViolations('5302 written-response workshops');

    await clickButton('Chapters');
    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Literacy Foundations, Development, and Learner Profiles'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Interacting models of literacy development');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('How should a reading specialist use a developmental literacy continuum'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('Literacy components develop');
    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Literacy Foundations, Development, and Learner Profiles');
    expectIndependentTargetedSession(pack);
  }, 30_000);

  it('uses 5412 diagnostics, timed simulation, and native educational-leadership learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Praxis Educational Leadership: Administration and Supervision (5412)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('120 questions');
    expect(host.textContent).toContain('165 minutes');
    expect(host.textContent).toContain('original independent practice items');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-educational-leadership-5412');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('120-question timed simulation');
    expect(host.textContent).toContain('Question 1 of 120');
    expect(host.textContent).toContain('Time remaining 165:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis Educational Leadership: Administration and Supervision (5412) learning library');
    expect(host.textContent).toContain('12');
    expect(host.textContent).toContain('60');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');

    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Mission, Vision, Goals, and Core Values'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Mission, vision, and values as distinct tools');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('What should precede revision of a school mission'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('actual school context');
    await expectNoAxeViolations('5412 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Mission, Vision, Goals, and Core Values');
    expectIndependentTargetedSession(pack);
  }, 30_000);


  it('uses 5622 diagnostics, selected-response pacing, case workshops, and native K-6 learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Principles of Learning and Teaching: Grades') && article.textContent.includes('(5622)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('70 questions');
    expect(host.textContent).toContain('70 minutes');
    expect(host.textContent).toContain('four constructed-response questions');
    expect(host.textContent).toContain('120-minute session');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-plt-k6-5622');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('70-question selected-response pacing simulation');
    expect(host.textContent).toContain('Question 1 of 70');
    expect(host.textContent).toContain('Time remaining 70:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Principles of Learning and Teaching: Grades');
    await waitForText('(5622) learning library');
    expect(host.textContent).toContain('Response workshops');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');
    await clickButton('Written-response workshops');
    expect(host.textContent).toContain('(5622) application practice');
    expect(host.textContent).toContain('Case A1: Analyze Learner Development and Motivation');
    expect(host.textContent).toContain('Case D2: Apply Ethical, Legal, and Safety Boundaries');
    expect(host.textContent).toContain('AlloFlow does not score written responses');
    await expectNoAxeViolations('5622 case-analysis workshops');

    await clickButton('Chapters');
    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Learning Theory, Cognition, and Transfer'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Knowledge construction, schema, and information processing');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('A fourth-grade class holds persistent misconceptions before a science unit'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('Schema influences');
    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Learning Theory, Cognition, and Transfer');
    expectIndependentTargetedSession(pack);
  }, 30_000);


  it('uses 5752 combined diagnostics, full selected-response pacing, essay workshops, and native learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Core Academic Skills for Educators: Combined') && article.textContent.includes('(5752)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('152 questions');
    expect(host.textContent).toContain('215 minutes');
    expect(host.textContent).toContain('two essay sections');
    expect(host.textContent).toContain('total 275 minutes');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-core-5752');
    expect(pack.officialSubtests).toHaveLength(3);
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('152-question combined selected-response pacing simulation');
    expect(host.textContent).toContain('Question 1 of 152');
    expect(host.textContent).toContain('Time remaining 215:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis Core Academic Skills for Educators: Combined (5752) learning library');
    expect(host.textContent).toContain('Response workshops');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');
    await clickButton('Written-response workshops');
    expect(host.textContent).toContain('Praxis Core (5752) application practice');
    expect(host.textContent).toContain('Access and flexibility in public services');
    expect(host.textContent).toContain('Reading averages with context');
    expect(host.textContent).toContain('AlloFlow does not score written responses');
    await expectNoAxeViolations('5752 essay workshops');

    await clickButton('Chapters');
    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Main Ideas, Supporting Details, and Inferences'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Main idea and primary purpose');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('After the town converted an unused rail corridor'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    expect(firstCheck.textContent).toContain('best main idea');
    await expectNoAxeViolations('5752 native chapter');

    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Main Ideas, Details, and Inferences');
    expectIndependentTargetedSession(pack);
  }, 30_000);


  it('uses 5362 diagnostics, exact pacing, applied transcript workshops, and native learning', async () => {
    await mount();
    const suiteCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('English to Speakers of Other Languages') && article.textContent.includes('(5362)'));
    expect(suiteCard).toBeTruthy();
    await act(async () => { suiteCard.querySelector('button').click(); });
    await waitForText('Choose a study mode');

    expect(host.textContent).toContain('Start Practice Bank 1');
    expect(host.textContent).toContain('Start Practice Bank 2');
    expect(host.textContent).toContain('120 questions');
    expect(host.textContent).toContain('120 minutes');
    expect(host.textContent).toContain('may include audio');

    const pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-esol-5362');
    await clickButton('Start Practice Bank 2');
    expect(host.textContent).toContain('Practice Bank 2 of 5');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain(pack.items[100].prompt);

    await clickButton('Practice options');
    await waitForText('Resume saved practice');
    await clickButton('Start timed simulation');
    expect(host.textContent).toContain('120-question ESOL pacing simulation');
    expect(host.textContent).toContain('Question 1 of 120');
    expect(host.textContent).toContain('Time remaining 120:00');
    expect(findButton('Check answer')).toBeFalsy();
    expect(findButton('Save answer and continue')).toBeTruthy();

    await clickButton('Practice options');
    await clickButton('Learning library');
    await waitForText('Praxis English to Speakers of Other Languages (5362) learning library');
    expect(host.textContent).toContain('Response workshops');
    expect(host.textContent).toContain('75');
    expect(host.textContent).toContain('20');
    await clickButton('Audio and classroom-analysis workshops');
    expect(host.textContent).toContain('Praxis ESOL (5362) application practice');
    expect(host.textContent).toContain('Reduced speech in a classroom announcement');
    expect(host.textContent).toContain('Evaluating access beyond language-growth scores');
    expect(host.textContent).toContain('do not reproduce ETS recordings');
    await expectNoAxeViolations('5362 applied workshops');

    await clickButton('Chapters');
    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Phonology, Morphology, Syntax, and Language Structure'));
    expect(chapterCard).toBeTruthy();
    await act(async () => { chapterCard.querySelector('button').click(); });
    expect(host.textContent).toContain('Phonetics, phonology, and intelligibility');
    const firstCheck = Array.from(host.querySelectorAll('fieldset')).find((field) => field.textContent.includes('A learner says "sip" for "ship"'));
    expect(firstCheck).toBeTruthy();
    await act(async () => { firstCheck.querySelector('input[type="radio"]').click(); });
    await act(async () => { firstCheck.querySelector('button').click(); });
    expect(firstCheck.textContent).toContain('Correct');
    await clickButton('Practice this skill');
    expect(host.textContent).toContain('Targeted practice: Phonology, Morphology, Syntax, and Language Structure');
    expectIndependentTargetedSession(pack);
  }, 30_000);


  it('keeps internal migration records out of the EPPP learner experience', async () => {

    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    expect(openButtons.length).toBeGreaterThanOrEqual(3);
    const epppButton = openButtons.find((button) => button.parentElement?.textContent.includes('EPPP Part 1'));
    expect(epppButton).toBeTruthy();
    await act(async () => { epppButton.click(); });

    expect(host.textContent).toContain('Choose a 100-question practice bank');
    await clickButton('Start Practice Bank 1');
    expect(host.textContent).toContain('Question 1 of 100');
    expect(host.textContent).toContain('Question bank item 1 of 1500');
    expect(host.textContent).toContain('1,500 source-reviewed practice items');
    expect(host.textContent).toContain('Source review recorded');
    expect(host.textContent).toContain('Independent professional and psychometric validation is separate');
    expect(host.querySelector('a[href*="eppp_native_qa.md"]')).toBeTruthy();
    expect(host.textContent.toLowerCase()).not.toContain('legacy');
    expect(host.textContent).not.toContain('Migration provenance');
    expect(host.querySelector('iframe[title*="legacy"]')).toBeNull();
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(4);

    const eppp = Hub.listPacks().find((candidate) => candidate.id === 'eppp-part-one');
    for (let index = 0; index < 8; index += 1) {
      const radios = Array.from(host.querySelectorAll('input[type="radio"]'));
      await act(async () => { radios[eppp.items[index].answerIndex].click(); });
      await clickButton('Check answer');
      if (index === 0) {
        expect(host.textContent).toContain('Why the other options do not fit');
        expect(host.textContent).toContain('Schwann cells myelinate axons in the peripheral nervous system');
        expect(host.textContent).toContain('Myelin in the Central Nervous System: Structure, Function, and Pathology');
        expect(host.textContent).toContain('PubMed, U.S. National Library of Medicine');
        expect(host.textContent).toContain('Why this source is credible:');
        expect(host.textContent).not.toContain('Source 1');
        expect(host.textContent).not.toContain('Content QA passed');
      }
      await clickButton('Next question');
    }
    expect(host.textContent).toContain('Question 9 of 100');
    const migratedRadios = Array.from(host.querySelectorAll('input[type="radio"]'));
    const migratedWrongAnswer = (eppp.items[8].answerIndex + 1) % eppp.items[8].choices.length;
    await act(async () => { migratedRadios[migratedWrongAnswer].click(); });
    await clickButton('Check answer');
    expect(host.textContent).not.toContain('Migration provenance');
    expect(host.textContent).not.toContain('legacy-313b8d365ea7d566');
    expect(host.textContent).not.toContain('Content QA passed.');
    expect(host.textContent).toContain('Your answer:');
    expect(host.textContent).toContain('Supported answer:');
    expect(host.textContent).toContain('Why the other options do not fit');
    await expectNoAxeViolations('EPPP migrated item');
  }, 30_000);

  it('pauses a selected practice bank for accessible diagnostic feedback before its summary', async () => {
    Hub.registerPack({
      id: 'batch-checkpoint-render', title: 'Batch Checkpoint Render', shortTitle: 'Batch checkpoint', status: 'ready', batchSize: 2,
      disclaimer: 'Independent practice result, not an official score.',
      domains: [{ id: 'one', label: 'Domain one' }, { id: 'two', label: 'Domain two' }],
      items: [
        { id: 'render-q1', domainId: 'one', prompt: 'First checkpoint item?', choices: ['Correct', 'Other'], answerIndex: 0, rationale: 'First rationale.' },
        { id: 'render-q2', domainId: 'two', prompt: 'Second checkpoint item?', choices: ['Incorrect', 'Correct'], answerIndex: 1, rationale: 'Second rationale.' },
        { id: 'render-q3', domainId: 'one', prompt: 'Third checkpoint item?', choices: ['Correct', 'Other'], answerIndex: 0, rationale: 'Third rationale.' },
        { id: 'render-q4', domainId: 'two', prompt: 'Fourth checkpoint item?', choices: ['Incorrect', 'Correct'], answerIndex: 1, rationale: 'Fourth rationale.' },
      ],
    });
    await mount();
    const card = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Batch Checkpoint Render'));
    expect(card).toBeTruthy();
    await act(async () => { card.querySelector('button').click(); });
    await clickButton('Start Practice Bank 1');

    expect(host.textContent).toContain('Practice Bank 1 of 2');
    expect(host.textContent).toContain('Question 1 of 2');
    expect(host.textContent).toContain('Question bank item 1 of 4');
    let radios = Array.from(host.querySelectorAll('input[type="radio"]'));
    await act(async () => { radios[0].click(); });
    await clickButton('Check answer');
    await clickButton('I knew it');
    await clickButton('Next question');

    expect(host.textContent).toContain('Question bank item 2 of 4');
    radios = Array.from(host.querySelectorAll('input[type="radio"]'));
    await act(async () => { radios[0].click(); });
    await clickButton('Check answer');
    await clickButton('I knew it');
    await clickButton('View diagnostic feedback');

    expect(host.textContent).toContain('Practice Bank 1 of 2 checkpoint');
    expect(host.textContent).toContain('Questions 1–2');
    expect(host.textContent).toContain('1/2');
    expect(host.textContent).toContain('50%');
    expect(host.textContent).toContain('Domain diagnostic for this batch');
    expect(host.textContent).toContain('Confidence calibration');
    expect(host.textContent).toContain('Review confident misses first: question 2');
    expect(host.textContent).toContain('not an official score');
    await expectNoAxeViolations('batch checkpoint');

    const saved = JSON.parse(localStorage.getItem('alloflow_test_prep_progress_v1'));
    expect(saved.attempts[0]).toMatchObject({ packId: 'batch-checkpoint-render', batchNumber: 1, batchCount: 2, firstQuestion: 1, lastQuestion: 2, correct: 1, total: 2 });
    await clickButton('View overall summary');
    expect(host.textContent).toContain('Practice Bank 1 of 2');
    expect(host.textContent).toContain('1/2');
  }, 30_000);

  it('shows a checkpoint after a single complete batch before the overall summary', async () => {
    Hub.registerPack({
      id: 'single-batch-checkpoint-render', title: 'Single Batch Checkpoint', shortTitle: 'Single batch', status: 'ready', batchSize: 2,
      disclaimer: 'Independent practice result, not an official score.',
      domains: [{ id: 'one', label: 'Domain one' }, { id: 'two', label: 'Domain two' }],
      items: [
        { id: 'single-render-q1', domainId: 'one', prompt: 'First single-batch item?', choices: ['Correct', 'Other'], answerIndex: 0, rationale: 'First rationale.' },
        { id: 'single-render-q2', domainId: 'two', prompt: 'Second single-batch item?', choices: ['Incorrect', 'Correct'], answerIndex: 1, rationale: 'Second rationale.' },
      ],
    });
    await mount();
    const card = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Single Batch Checkpoint'));
    expect(card).toBeTruthy();
    await act(async () => { card.querySelector('button').click(); });

    let radios = Array.from(host.querySelectorAll('input[type="radio"]'));
    await act(async () => { radios[0].click(); });
    await clickButton('Check answer');
    await clickButton('I knew it');
    await clickButton('Next question');

    radios = Array.from(host.querySelectorAll('input[type="radio"]'));
    await act(async () => { radios[0].click(); });
    await clickButton('Check answer');
    await clickButton('I knew it');
    await clickButton('View diagnostic feedback');

    expect(host.textContent).toContain('Batch 1 of 1 checkpoint');
    expect(host.textContent).toContain('1/2');
    expect(host.textContent).toContain('Domain diagnostic for this batch');
    expect(host.textContent).toContain('Review confident misses first: question 2');
    const saved = JSON.parse(localStorage.getItem('alloflow_test_prep_progress_v1'));
    expect(saved.attempts[0]).toMatchObject({ packId: 'single-batch-checkpoint-render', batchNumber: 1, batchCount: 1, correct: 1, total: 2 });
    await clickButton('View overall summary');
    expect(host.textContent).toContain('Practice complete');
    expect(host.textContent).toContain('1/2');
    await expectNoAxeViolations('single-batch summary');
  }, 30_000);

});

