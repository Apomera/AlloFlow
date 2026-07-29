// WCAG 2.2 AA regression gate for Lingua Practice.
//
// axe in jsdom covers the automatable structural criteria. Contrast is tested
// independently from the production palette, while keyboard containment and
// focus restoration are exercised against the live React component.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Lingua, root, host;

const AXE_OPTIONS = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  },
  rules: {
    'color-contrast': { enabled: false },
    'region': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'landmark-one-main': { enabled: false },
    'scrollable-region-focusable': { enabled: false },
  },
};

const lesson = {
  title: 'At school',
  goal: 'Ask for help in context.',
  scenario: 'You need a pencil during class.',
  vocabulary: [
    {
      term: 'lápiz',
      meaning: 'pencil',
      pronunciation: 'LAH-pees',
      example: 'Necesito un lápiz.',
      examplePronunciation: 'neh-seh-SEE-toh oon LAH-pees',
      translation: 'I need a pencil.',
    },
  ],
  phrases: [
    {
      target: 'Necesito un lápiz.',
      pronunciation: 'neh-seh-SEE-toh oon LAH-pees',
      translation: 'I need a pencil.',
    },
  ],
  conversation: [
    {
      coach: '¿Qué necesitas?',
      coachPronunciation: 'keh neh-seh-SEE-tahs',
      translation: 'What do you need?',
      sample: 'Necesito un lápiz.',
      samplePronunciation: 'neh-seh-SEE-toh oon LAH-pees',
    },
  ],
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  localStorage.clear();
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Lingua, {
      isOpen: true,
      onClose: () => {},
      callGemini: async () => JSON.stringify(lesson),
      ...props,
    }));
  });
}

function findButton(text) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}

async function click(text) {
  const target = findButton(text);
  expect(target, 'Missing button: ' + text).toBeTruthy();
  await act(async () => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function expectNoAxeViolations(state) {
  const results = await axe.run(host, AXE_OPTIONS);
  const summary = results.violations.map((violation) =>
    state + ': ' + violation.id + ' (' + violation.impact + ') ' +
    violation.nodes.slice(0, 3).map((node) => node.html.slice(0, 140)).join(' | '),
  );
  expect(summary).toEqual([]);
}

function luminance(hex) {
  const parts = hex.match(/[a-f\d]{2}/gi).map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('Lingua Practice WCAG 2.2 AA', () => {
  it('has no axe violations across setup and every lesson section', async () => {
    await mount();
    await expectNoAxeViolations('setup');

    await click('Build practice set');
    await expectNoAxeViolations('vocabulary');

    await click('Practice sets');
    await expectNoAxeViolations('practice-set library');

    await click('Edit');
    await expectNoAxeViolations('practice-set editor');
    await click('Cancel');

    await click('Listening');
    await expectNoAxeViolations('listening');

    await click('Speak');
    await expectNoAxeViolations('speaking');

    await click('Conversation');
    await expectNoAxeViolations('conversation');

    await click('Live chat');
    await click('Start the chat');
    await expectNoAxeViolations('chat opener');

    await click('Progress');
    await expectNoAxeViolations('progress');

    await click('Customize plan');
    await expectNoAxeViolations('learning-plan editor');
    await click('Cancel');

    await click('Review');
    await expectNoAxeViolations('empty review');

    await click('Saved words');
    await expectNoAxeViolations('empty saved words');

    await click('Add a word');
    const note = host.querySelector('#lingua-word-note');
    const tags = host.querySelector('#lingua-word-tags');
    expect(note.maxLength).toBe(500);
    expect(tags.maxLength).toBe(200);
    expect(tags.getAttribute('aria-describedby')).toBe('lingua-word-tags-help lingua-word-tags-count');
    expect(host.querySelector('#lingua-word-tags-help').textContent).toContain('Separate tags with commas');
    expect(note.getAttribute('aria-describedby')).toBe('lingua-word-note-help lingua-word-note-count');
    expect(host.querySelector('#lingua-word-note-help').textContent).toContain('unless you download');
    await expectNoAxeViolations('saved-word editor with personal note and tags');
    await click('Cancel');
  }, 30000); // 13 sequential axe sweeps — heavy under parallel CPU load

  it('has no axe violations in the upcoming-review forecast', async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [
      { id: 'Spanish::due', language: 'Spanish', term: 'due', meaning: 'due', nextReviewAt: 0 },
      { id: 'Spanish::day', language: 'Spanish', term: 'day', meaning: 'day', nextReviewAt: now + 12 * 60 * 60 * 1000 },
      { id: 'Spanish::week', language: 'Spanish', term: 'week', meaning: 'week', nextReviewAt: now + 3 * day },
      { id: 'Spanish::later', language: 'Spanish', term: 'later', meaning: 'later', nextReviewAt: now + 8 * day },
      { id: 'French::bonjour', language: 'French', term: 'bonjour', meaning: 'hello', nextReviewAt: 0 },
    ] }));
    await mount();
    await click('Progress');

    const forecast = host.querySelector('[aria-labelledby="lingua-review-forecast-title"]');
    expect(forecast).toBeTruthy();
    expect(Array.from(forecast.querySelectorAll('dd')).map((node) => node.textContent))
      .toEqual(['1', '1', '1', '1']);
    expect(forecast.textContent).toContain('not a deadline');
    await expectNoAxeViolations('upcoming review forecast');
  });

  it('has no axe violations in an expanded saved-word review history', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [{
      id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola.', nextReviewAt: 1000,
      reviewHistory: [
        { at: Date.UTC(2026, 0, 12), rating: 'know', interval: 259200000, stage: 2 },
        { at: Date.UTC(2026, 0, 11), rating: 'again', interval: 600000, stage: 0 },
      ],
    }] }));
    await mount();
    await click('Saved words');
    const details = host.querySelector('details');
    const summary = details.querySelector('summary');
    await act(async () => { summary.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(details.open).toBe(true);
    expect(details.querySelector('ol').getAttribute('aria-label')).toBe('Recent review choices for hola');
    expect(details.textContent).toContain('not a score');
    await expectNoAxeViolations('expanded saved-word review history');

    const reset = findButton('Reset review progress');
    reset.focus();
    await act(async () => { reset.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Overall activity records will not change');
    await expectNoAxeViolations('reset word review confirmation');
    const cancel = Array.from(dialog.querySelectorAll('button')).find((node) => node.textContent === 'Cancel');
    await act(async () => { cancel.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.activeElement).toBe(reset);
  });

  it('has no axe violations in the revealed spaced-review state', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 1,
      spokenAttempts: 0,
      saved: [{
        id: 'Spanish::hola',
        language: 'Spanish',
        term: 'hola',
        meaning: 'hello',
        example: 'Hola, me llamo Ana.',
        translation: 'Hello, my name is Ana.',
        pronunciation: 'OH-lah',
        tags: ['Greetings', 'Unit 1'],
        reviewStage: 0,
        nextReviewAt: 0,
        reviews: 0,
      }],
    }));
    await mount();
    await click('Review (1)');
    const reviewRegion = host.querySelector('main > div[tabindex="-1"]');
    const scope = host.querySelector('#lingua-review-tag');
    expect(host.querySelector('label[for="lingua-review-tag"]')).toBeTruthy();
    expect(scope.getAttribute('aria-describedby')).toBe('lingua-review-scope-help');
    expect(Array.from(scope.options).map((option) => option.textContent)).toEqual(['All due words', 'Greetings', 'Unit 1']);
    await expectNoAxeViolations('review prompt with tag focus');

    await click('Skip for now');
    expect(document.activeElement).toBe(reviewRegion);
    expect(reviewRegion.textContent).toContain('Cards set aside');
    expect(reviewRegion.textContent).toContain('review schedule did not change');
    await expectNoAxeViolations('review card set aside');

    await click('Review set-aside cards');
    expect(document.activeElement).toBe(reviewRegion);
    expect(reviewRegion.textContent).toContain('Returned 1 set-aside cards');
    await expectNoAxeViolations('set-aside card returned');
    await click('Reveal answer');
    const revealedTerm = Array.from(host.querySelectorAll('[lang="es-ES"]')).find(
      (node) => node.textContent === 'hola',
    );
    expect(document.activeElement).toBe(revealedTerm);
    const reviewAnnouncement = Array.from(host.querySelectorAll('[role="status"][aria-atomic="true"]')).find(
      (node) => node.textContent.includes('Answer revealed'),
    );
    expect(reviewAnnouncement).toBeTruthy();
    await expectNoAxeViolations('revealed review');

    await click('Know');
    expect(document.activeElement).toBe(reviewRegion);
    expect(reviewRegion.textContent).toContain('Review recorded as Know');
    expect(findButton('Undo last review')).toBeTruthy();
    const sessionSummary = host.querySelector('[aria-labelledby="lingua-review-session-title"]');
    expect(sessionSummary).toBeTruthy();
    expect(sessionSummary.querySelector('#lingua-review-session-title').textContent).toBe('Review session complete');
    expect(sessionSummary.textContent).toContain('not a score');
    expect(Array.from(sessionSummary.querySelectorAll('dd')).map((node) => node.textContent))
      .toEqual(['0', '0', '0', '1']);
    await expectNoAxeViolations('completed review with undo');

    await click('Undo last review');
    const restoredTerm = Array.from(host.querySelectorAll('[lang="es-ES"]')).find(
      (node) => node.textContent === 'hola',
    );
    expect(document.activeElement).toBe(restoredTerm);
    expect(reviewRegion.textContent).toContain('Review undone');
    expect(findButton('Undo last review')).toBeFalsy();
    expect(host.querySelector('[aria-labelledby="lingua-review-session-title"]')).toBeFalsy();
    await expectNoAxeViolations('restored review after undo');
  });

  it('moves focus to changed phrase and conversation prompts', async () => {
    const multiStepLesson = {
      ...lesson,
      phrases: [
        lesson.phrases[0],
        {
          target: '¿Me prestas un lápiz?',
          pronunciation: 'meh PREH-stahs oon LAH-pees',
          translation: 'Will you lend me a pencil?',
        },
      ],
      conversation: [
        lesson.conversation[0],
        {
          coach: 'Claro, aquí tienes.',
          coachPronunciation: 'KLAH-roh ah-KEE tee-EH-nehs',
          translation: 'Of course, here you are.',
          sample: 'Muchas gracias.',
          samplePronunciation: 'MOO-chahs GRAH-syahs',
        },
      ],
    };
    await mount({ callGemini: async () => JSON.stringify(multiStepLesson) });
    await click('Build practice set');
    await click('Practice speaking');
    await click('Next');

    const secondPhrase = Array.from(host.querySelectorAll('[lang="es-ES"]')).find(
      (node) => node.textContent === '¿Me prestas un lápiz?',
    );
    expect(document.activeElement).toBe(secondPhrase);

    await click('Conversation');
    await click('Next');
    const secondPrompt = Array.from(host.querySelectorAll('[lang="es-ES"]')).find(
      (node) => node.textContent === 'Claro, aquí tienes.',
    );
    expect(document.activeElement).toBe(secondPrompt);
    expect(findButton('Next').disabled).toBe(true);
    await expectNoAxeViolations('second conversation prompt');
  });

  it('traps keyboard focus, closes with Escape, and restores focus on unmount', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open Lingua';
    document.body.appendChild(opener);
    opener.focus();
    let closes = 0;

    await mount({ onClose: () => { closes += 1; } });

    const dialog = host.querySelector('[role="dialog"]');
    expect(document.activeElement).toBe(dialog);
    expect(document.body.style.overflow).toBe('hidden');

    const focusable = Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(closes).toBe(1);

    act(() => root.unmount());
    root = null;
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
    opener.remove();
  });

  it('meets text and focus-indicator contrast thresholds for the Lingua palette', () => {
    const textPairs = [
      ['047857', 'ffffff'],
      ['ffffff', '047857'],
      // teal-700 is the far stop of the badge / primary-button / "your" chat-bubble
      // gradient; white must stay legible across the whole gradient, not just the
      // emerald-700 near stop.
      ['ffffff', '0f766e'],
      ['64748b', 'ffffff'],
      ['065f46', 'ecfdf5'],
      // emerald-800 sits on the emerald-tinted panels/pills (emerald-50 → f0fdf4);
      // f0fdf4 is lighter than ecfdf5, so validating on ecfdf5 is the stricter case.
      ['065f46', 'f0fdf4'],
      ['78350f', 'fffbeb'],
      ['9f1239', 'fff1f2'],
      ['475569', 'ffffff'],
    ];
    for (const pair of textPairs) {
      expect(contrast(pair[0], pair[1]), pair.join(' on ')).toBeGreaterThanOrEqual(4.5);
    }

    expect(contrast('047857', 'ffffff'), 'emerald-700 focus ring on white').toBeGreaterThanOrEqual(3);
  });
});


describe('Lingua Practice describe-the-picture accessibility', () => {
  it('keeps the picture tab axe-clean with and without image generation', async () => {
    // Without an image surface: honest empty state.
    await mount();
    await click('Build practice set');
    await click('Describe');
    expect(host.textContent).toContain('AI images are unavailable right now.');
    await expectNoAxeViolations('picture tab unavailable');
    act(() => root.unmount());
    root = null;
    host.remove();
    host = null;

    // With images: generated scene, labeled description input, feedback region.
    window.callGeminiImageEdit = async () => 'data:image/png;base64,U0NFTkU=';
    try {
      await mount();
      await click('Build practice set');
      await click('Describe');
      await act(async () => {
        findButton('Create a picture').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => setTimeout(r, 0));
      });
      const img = host.querySelector('img[alt="AI-generated scene to describe"]');
      expect(img).toBeTruthy();
      const description = host.querySelector('#lingua-picture-desc');
      const label = host.querySelector('label[for="lingua-picture-desc"]');
      expect(label.control).toBe(description);
      expect(description.lang).toBe('es-ES');
      await expectNoAxeViolations('picture tab with scene');
    } finally {
      delete window.callGeminiImageEdit;
    }
  });
});

describe('Lingua Practice enhanced accessibility behavior', () => {
  it('moves focus to each section heading and marks language-specific content', async () => {
    await mount();
    await click('Build practice set');

    const vocabularyHeading = Array.from(host.querySelectorAll('h3')).find((node) => node.textContent === 'At school');
    expect(document.activeElement).toBe(vocabularyHeading);

    const term = Array.from(host.querySelectorAll('[lang="es-ES"]')).find((node) => node.textContent === 'lápiz');
    const meaning = Array.from(host.querySelectorAll('[lang="en-US"]')).find((node) => node.textContent === 'pencil');
    expect(term).toBeTruthy();
    expect(meaning).toBeTruthy();

    const listen = host.querySelector('button[aria-label="Listen to lápiz"]');
    const save = host.querySelector('button[aria-label="Save word"]');
    expect(listen).toBeTruthy();
    expect(save.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      save.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const remove = host.querySelector('button[aria-label="Remove saved word"]');
    expect(remove.getAttribute('aria-pressed')).toBe('true');

    await click('Conversation');
    const conversationHeading = Array.from(host.querySelectorAll('h3')).find(
      (node) => node.textContent === lesson.scenario,
    );
    expect(document.activeElement).toBe(conversationHeading);

    const response = host.querySelector('#lingua-conversation-response');
    const responseLabel = host.querySelector('label[for="lingua-conversation-response"]');
    const speechButton = host.querySelector('button[aria-label="Speak response"]');
    expect(response.lang).toBe('es-ES');
    expect(responseLabel.control).toBe(response);
    expect(response.parentElement.contains(speechButton)).toBe(true);
    expect(responseLabel.parentElement).not.toBe(response.parentElement);
  });

  it('announces speech-input fallback locally when capture is unavailable', async () => {
    const previousVoice = window.AlloFlowVoice;
    delete window.AlloFlowVoice;
    const toasts = [];

    try {
      await mount({ addToast: (message) => { toasts.push(message); } });
      await click('Build practice set');
      await click('Speak');

      const typedFallback = host.querySelector('#lingua-speak-response');
      expect(typedFallback).toBeTruthy();
      expect(host.querySelector('label[for="lingua-speak-response"]').control).toBe(typedFallback);
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      await act(async () => {
        inputSetter.call(typedFallback, 'Necesito un lapiz.');
        typedFallback.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(host.textContent).toContain('100% word match');
      await expectNoAxeViolations('typed speaking fallback');

      await click('Conversation');

      const speechButton = host.querySelector('button[aria-label="Speak response"]');
      await act(async () => {
        speechButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const status = host.querySelector('[role="status"][aria-atomic="true"]');
      expect(status.textContent).toContain('Speech input is unavailable');
      expect(toasts.some((message) => message.includes('Speech input is unavailable'))).toBe(true);
      expect(speechButton.getAttribute('aria-pressed')).toBe('false');
    } finally {
      if (previousVoice === undefined) delete window.AlloFlowVoice;
      else window.AlloFlowVoice = previousVoice;
    }
  });

  it('clears a generated lesson when the target language changes', async () => {
    await mount();
    await click('Build practice set');
    expect(findButton('Vocabulary').disabled).toBe(false);

    await click('Setup');
    const targetSelect = host.querySelector('select[aria-label="I am learning"]');
    await act(async () => {
      targetSelect.value = 'French';
      targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(targetSelect.value).toBe('French');
    expect(findButton('Vocabulary').disabled).toBe(true);
    expect(host.textContent).toContain('Practice language from what you are learning');
    expect(host.textContent).not.toContain('Ask for help in context.');
  });
});


describe('Lingua Practice accessible error recovery', () => {
  it('shows and audits an in-context alert when no lesson source is available', async () => {
    const toasts = [];
    await mount({
      callGemini: async () => 'not valid lesson JSON',
      addToast: (message, type) => { toasts.push({ message, type }); },
    });

    const source = host.querySelector('#lingua-source');
    expect(source.getAttribute('aria-describedby')).toBe('lingua-source-help');
    expect(host.querySelector('#lingua-source-help')).toBeTruthy();

    const targetSelect = host.querySelector('select[aria-label="I am learning"]');
    await act(async () => {
      targetSelect.value = 'Korean';
      targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Build practice set');

    const alert = host.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('could not be built for Korean');
    expect(toasts).toContainEqual(expect.objectContaining({ type: 'error' }));
    expect(findButton('Build practice set').disabled).toBe(false);
    expect(findButton('Vocabulary').disabled).toBe(true);
    await expectNoAxeViolations('lesson build failure');
  });

  it('opens safely when persisted profile and progress data have invalid shapes', async () => {
    // Free-typed custom languages are now valid, so "invalid" means wrong TYPES
    // (non-strings), which must still coerce to the safe defaults.
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({
      known: 42,
      target: { bad: true },
      level: 'Impossible',
    }));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      saved: { broken: true },
      sessions: -10,
      languageStats: [],
    }));
    localStorage.setItem('allo_lingua_recent_v1', JSON.stringify({
      Spanish: { title: 'Broken recent lesson', lesson: 'not a lesson' },
    }));

    await mount();

    expect(host.querySelector('select[aria-label="I know"]').value).toBe('English');
    expect(host.querySelector('select[aria-label="I am learning"]').value).toBe('Spanish');
    expect(host.querySelector('select[aria-label="My level"]').value).toBe('Beginner');
    expect(host.textContent).toContain('0 saved');
    expect(findButton('Continue recent practice')).toBeUndefined();
    await expectNoAxeViolations('normalized persisted state');
  });
});


describe('Lingua Practice speech capture lifecycle', () => {
  it('keeps successful capture status and reports character matching for Mandarin', async () => {
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({
      known: 'English',
      target: 'Mandarin Chinese',
      level: 'Beginner',
      topic: 'Introductions',
    }));
    const mandarinLesson = {
      title: 'Introductions',
      goal: 'Introduce yourself.',
      scenario: 'Meeting a classmate.',
      vocabulary: [{
        term: '你好',
        meaning: 'hello',
        pronunciation: 'ni hao',
        example: '你好，我叫小明。',
        examplePronunciation: 'ni hao, wo jiao Xiaoming',
        translation: 'Hello, my name is Xiaoming.',
      }],
      phrases: [{
        target: '你好，我叫小明。',
        pronunciation: 'ni hao, wo jiao Xiaoming',
        translation: 'Hello, my name is Xiaoming.',
      }],
      conversation: [{
        coach: '你叫什么名字？',
        coachPronunciation: 'ni jiao shenme mingzi',
        translation: 'What is your name?',
        sample: '我叫小明。',
        samplePronunciation: 'wo jiao Xiaoming',
      }],
    };

    const previousVoice = window.AlloFlowVoice;
    let captureOptions;
    let active = false;
    window.AlloFlowVoice = {
      initWebSpeechCapture: (options) => {
        captureOptions = options;
        return {
          start: () => { active = true; return true; },
          stop: () => { active = false; },
          isActive: () => active,
        };
      },
    };

    try {
      await mount({ callGemini: async () => JSON.stringify(mandarinLesson) });
      await click('Build practice set');
      await click('Practice speaking');
      expect(host.textContent).toContain('characters your browser heard');

      const speakButton = Array.from(host.querySelectorAll('button')).find(
        (node) => node.textContent.includes('● Speak'),
      );
      await act(async () => {
        speakButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(captureOptions.lang).toBe('zh-CN');
      expect(speakButton.getAttribute('aria-pressed')).toBe('true');

      await act(async () => {
        captureOptions.onTranscript('你好我叫小明', true);
      });
      active = false;
      await act(async () => {
        captureOptions.onEnd();
      });

      const renderedPhrase = Array.from(host.querySelectorAll('[lang="zh-CN"]')).find(
        (node) => node.textContent === mandarinLesson.phrases[0].target,
      );
      const renderedTranscript = Array.from(host.querySelectorAll('[lang="zh-CN"]')).find(
        (node) => node.textContent === '你好我叫小明',
      );
      expect(Lingua._similarity(renderedPhrase.textContent, renderedTranscript.textContent)).toBe(100);
      expect(host.textContent).toContain('100% character match');
      const capturedStatus = Array.from(host.querySelectorAll('[role="status"]')).find(
        (node) => node.textContent === 'Speech captured.',
      );
      expect(capturedStatus).toBeTruthy();
      expect(speakButton.getAttribute('aria-pressed')).toBe('false');
      expect(JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).spokenAttempts).toBe(1);
      await expectNoAxeViolations('completed Mandarin speech capture');
    } finally {
      if (previousVoice === undefined) delete window.AlloFlowVoice;
      else window.AlloFlowVoice = previousVoice;
    }
  });
});


describe('Lingua Practice stale AI request protection', () => {
  it('ignores a lesson response after the learner changes target language', async () => {
    let resolveLesson;
    const pendingLesson = new Promise((resolve) => { resolveLesson = resolve; });
    await mount({ callGemini: () => pendingLesson });

    const buildButton = findButton('Build practice set');
    act(() => {
      buildButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(buildButton.disabled).toBe(true);

    const targetSelect = host.querySelector('select[aria-label="I am learning"]');
    await act(async () => {
      targetSelect.value = 'French';
      targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(findButton('Build practice set').disabled).toBe(false);

    await act(async () => {
      resolveLesson(JSON.stringify(lesson));
      await pendingLesson;
      await Promise.resolve();
    });

    expect(targetSelect.value).toBe('French');
    expect(findButton('Vocabulary').disabled).toBe(true);
    expect(host.textContent).not.toContain(lesson.goal);
    expect(localStorage.getItem('allo_lingua_recent_v1')).toBe(null);
    await expectNoAxeViolations('stale lesson ignored');
  });

  it('ignores a lesson response after the learner changes level or source material', async () => {
    let resolveLesson;
    const pendingLesson = new Promise((resolve) => { resolveLesson = resolve; });
    await mount({ callGemini: () => pendingLesson });

    const buildButton = findButton('Build practice set');
    act(() => { buildButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(buildButton.disabled).toBe(true);

    const level = host.querySelector('select[aria-label="My level"]');
    await act(async () => {
      level.value = 'Advanced';
      level.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const source = host.querySelector('#lingua-source');
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      textareaSetter.call(source, 'A replacement reading passage.');
      source.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(findButton('Build practice set').disabled).toBe(false);

    await act(async () => {
      resolveLesson(JSON.stringify(lesson));
      await pendingLesson;
      await Promise.resolve();
    });

    expect(findButton('Vocabulary').disabled).toBe(true);
    expect(host.textContent).not.toContain(lesson.goal);
    expect(localStorage.getItem('allo_lingua_recent_v1')).toBe(null);
    await expectNoAxeViolations('stale setup-context lesson ignored');
  }, 15000);

  it('ignores coaching feedback after the learner advances turns', async () => {
    const multiTurnLesson = {
      ...lesson,
      conversation: [
        lesson.conversation[0],
        {
          coach: 'Aquí tienes.',
          coachPronunciation: 'ah-KEE tee-EH-nehs',
          translation: 'Here you are.',
          sample: 'Muchas gracias.',
          samplePronunciation: 'MOO-chahs GRAH-syahs',
        },
      ],
    };
    let resolveCoach;
    const pendingCoach = new Promise((resolve) => { resolveCoach = resolve; });
    let calls = 0;
    await mount({
      callGemini: () => {
        calls += 1;
        return calls === 1 ? Promise.resolve(JSON.stringify(multiTurnLesson)) : pendingCoach;
      },
    });
    await click('Build practice set');
    await click('Conversation');

    const response = host.querySelector('#lingua-conversation-response');
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    ).set;
    await act(async () => {
      valueSetter.call(response, 'Necesito un lápiz.');
      response.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(findButton('Get coaching').disabled).toBe(false);

    act(() => {
      findButton('Get coaching').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Coaching…');

    await click('Next');
    expect(host.textContent).toContain('Aquí tienes.');
    expect(host.textContent).not.toContain('Old-turn feedback');

    await act(async () => {
      resolveCoach(JSON.stringify({
        strength: 'Old-turn feedback',
        tip: 'This belongs to turn one.',
        suggested: 'Necesito ayuda.',
      }));
      await pendingCoach;
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Aquí tienes.');
    expect(host.textContent).not.toContain('Old-turn feedback');
    expect(findButton('Get coaching').disabled).toBe(true);
    await expectNoAxeViolations('stale coaching ignored');
  });
});


describe('Lingua Practice RTL conversation layout', () => {
  it('mirrors input controls and isolates mixed-direction coaching text for Arabic', async () => {
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({
      known: 'English',
      target: 'Arabic',
      level: 'Beginner',
      topic: 'Introductions',
    }));
    const arabicLesson = {
      title: 'Introductions',
      goal: 'Respond to a greeting.',
      scenario: 'You meet a classmate.',
      vocabulary: [{
        term: 'مرحباً',
        meaning: 'hello',
        pronunciation: 'marhaban',
        example: 'مرحباً، اسمي نور.',
        examplePronunciation: 'marhaban, ismi Nur',
        translation: 'Hello, my name is Noor.',
      }],
      phrases: [{
        target: 'مرحباً، اسمي نور.',
        pronunciation: 'marhaban, ismi Nur',
        translation: 'Hello, my name is Noor.',
      }],
      conversation: [{
        coach: 'كيف حالك؟',
        coachPronunciation: 'kayfa haluk',
        translation: 'How are you?',
        sample: 'أنا بخير، شكراً.',
        samplePronunciation: 'ana bikhayr, shukran',
      }],
    };
    const coaching = {
      strength: 'Your greeting is clear.',
      tip: 'Keep the response concise.',
      suggested: 'أنا بخير، شكراً.',
      suggestedPronunciation: 'ana bikhayr, shukran',
    };
    let calls = 0;
    await mount({
      callGemini: async () => {
        calls += 1;
        return JSON.stringify(calls === 1 ? arabicLesson : coaching);
      },
    });

    await click('Build practice set');
    await click('Conversation');

    const response = host.querySelector('#lingua-conversation-response');
    const speechButton = host.querySelector('button[aria-label="Speak response"]');
    const speechPositioner = speechButton.parentElement;
    expect(response.dir).toBe('rtl');
    expect(response.lang).toBe('ar-SA');
    expect(response.classList.contains('pl-14')).toBe(true);
    expect(response.classList.contains('pr-14')).toBe(false);
    expect(speechPositioner.classList.contains('left-2')).toBe(true);
    expect(speechPositioner.classList.contains('right-2')).toBe(false);

    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    ).set;
    await act(async () => {
      valueSetter.call(response, 'أنا بخير');
      response.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('Get coaching');

    const suggestion = host.querySelector('bdi[lang="ar-SA"]');
    expect(suggestion.textContent).toBe(coaching.suggested);
    expect(suggestion.dir).toBe('rtl');
    const tryLabel = suggestion.previousElementSibling;
    expect(tryLabel.textContent).toBe('Try: ');
    expect(tryLabel.lang).toBe('en-US');
    expect(tryLabel.dir).toBe('ltr');
    await expectNoAxeViolations('Arabic conversation coaching');
  });
});



describe('Lingua Practice destructive-action dialogs', () => {
  it('deletes a practice set through a contained alert dialog without native confirm', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await mount();
    await click('Build practice set');
    await click('Practice sets');

    const opener = findButton('Delete');
    expect(opener).toBeTruthy();
    opener.focus();
    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    let confirmation = host.querySelector('[role="alertdialog"]');
    expect(confirmation).toBeTruthy();
    expect(confirmation.getAttribute('aria-modal')).toBe('true');
    expect(confirmation.getAttribute('aria-labelledby')).toBe('lingua-confirm-title');
    expect(confirmation.getAttribute('aria-describedby')).toBe('lingua-confirm-message');
    expect(confirmation.querySelector('#lingua-confirm-title').textContent).toBe('Delete');
    expect(confirmation.querySelector('#lingua-confirm-message').textContent)
      .toContain('This cannot be undone');

    const background = host.querySelector('[role="dialog"]');
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(background.hasAttribute('inert')).toBe(true);

    let buttons = Array.from(confirmation.querySelectorAll('button'));
    const cancel = buttons.find((node) => node.textContent === 'Cancel');
    let confirmDelete = buttons.find((node) => node.textContent === 'Delete');
    expect(document.activeElement).toBe(cancel);
    await expectNoAxeViolations('practice-set delete confirmation');

    confirmDelete.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(cancel);
    cancel.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(confirmDelete);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(findButton('Use set')).toBeTruthy();

    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    confirmation = host.querySelector('[role="alertdialog"]');
    confirmDelete = Array.from(confirmation.querySelectorAll('button'))
      .find((node) => node.textContent === 'Delete');
    await act(async () => {
      confirmDelete.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(findButton('Use set')).toBeFalsy();
    expect(document.activeElement.textContent).toContain('Practice Set Studio');
    expect(nativeConfirm).not.toHaveBeenCalled();
  });

  it('keeps populated word-bank controls and removal confirmation accessible', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [
      { id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola.', nextReviewAt: 0, reviews: 2 },
      { id: 'French::bonjour', language: 'French', term: 'bonjour', meaning: 'hello', example: 'Bonjour.', nextReviewAt: 0, reviews: 1 },
    ] }));
    await mount();
    await click('Saved words');

    expect(host.querySelector('label[for="lingua-saved-search"]')).toBeTruthy();
    expect(host.querySelector('label[for="lingua-saved-language"]')).toBeTruthy();
    expect(host.querySelector('label[for="lingua-saved-tag"]')).toBeTruthy();
    expect(host.querySelector('label[for="lingua-saved-sort"]')).toBeTruthy();
    await expectNoAxeViolations('populated saved-word organizer');

    const addWord = findButton('Add a word');
    addWord.focus();
    await act(async () => { addWord.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(document.activeElement.id).toBe('lingua-word-editor-title');
    ['language', 'term', 'meaning', 'pronunciation', 'example', 'example-pronunciation', 'translation'].forEach((suffix) => {
      expect(host.querySelector('label[for="lingua-word-' + suffix + '"]'), 'Missing word-editor label: ' + suffix).toBeTruthy();
    });
    await expectNoAxeViolations('personal saved-word editor');
    await act(async () => { findButton('Cancel').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement).toBe(addWord);

    const opener = host.querySelector('button[aria-label="Remove saved word"]');
    expect(opener).toBeTruthy();
    opener.focus();
    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const confirmation = host.querySelector('[role="alertdialog"]');
    expect(confirmation.querySelector('#lingua-confirm-title').textContent).toBe('Remove saved word');
    expect(confirmation.querySelector('#lingua-confirm-message').textContent).toContain('review history');
    expect(document.activeElement.textContent).toBe('Cancel');
    await expectNoAxeViolations('saved-word removal confirmation');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  }, 30000);
  it('clears local Lingua data only after explicit alert-dialog confirmation', async () => {
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({
      known: 'English',
      target: 'Spanish',
      level: 'Beginner',
      topic: 'Saved topic',
    }));
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await mount();
    await click('Saved words');

    const opener = findButton('Clear Lingua data');
    expect(opener).toBeTruthy();
    opener.focus();
    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    let confirmation = host.querySelector('[role="alertdialog"]');
    expect(confirmation.querySelector('#lingua-confirm-title').textContent)
      .toBe('Clear Lingua data');
    expect(confirmation.querySelector('#lingua-confirm-message').textContent)
      .toContain('Clear all Lingua data on this device');
    let buttons = Array.from(confirmation.querySelectorAll('button'));
    const cancel = buttons.find((node) => node.textContent === 'Cancel');
    expect(document.activeElement).toBe(cancel);

    await act(async () => {
      cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(document.activeElement).toBe(opener);
    expect(localStorage.getItem('allo_lingua_profile_v1')).not.toBeNull();

    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    confirmation = host.querySelector('[role="alertdialog"]');
    buttons = Array.from(confirmation.querySelectorAll('button'));
    const confirmClear = buttons.find((node) => node.textContent === 'Clear Lingua data');
    await act(async () => {
      confirmClear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(localStorage.getItem('allo_lingua_profile_v1')).toBeNull();
    expect(document.activeElement.textContent).toContain('Practice language from');
    expect(nativeConfirm).not.toHaveBeenCalled();
  });
});


describe('Lingua Practice visible focus and forced colors', () => {
  it('styles programmatic focus targets and compact controls accessibly', async () => {
    await mount();

    const forcedColorsStyle = Array.from(host.querySelectorAll('style')).find(
      (node) => node.textContent.includes('forced-colors: active'),
    );
    expect(forcedColorsStyle).toBeTruthy();
    expect(forcedColorsStyle.textContent).toContain('Highlight');
    expect(forcedColorsStyle.textContent).toContain('CanvasText');
    expect(forcedColorsStyle.textContent).toContain('[aria-current="page"]');

    const setupHeading = Array.from(host.querySelectorAll('h3')).find(
      (node) => node.textContent.includes('Practice language from'),
    );
    expect(setupHeading.classList.contains('lingua-focus-target')).toBe(true);
    expect(setupHeading.classList.contains('focus:ring-2')).toBe(true);

    const sourceButton = findButton('Use current source text');
    expect(sourceButton.classList.contains('min-h-8')).toBe(true);

    await click('Build practice set');
    await click('Practice speaking');
    const phraseTarget = Array.from(host.querySelectorAll('.lingua-focus-target')).find(
      (node) => node.lang === 'es-ES' && node.textContent === lesson.phrases[0].target,
    );
    expect(phraseTarget).toBeTruthy();
    expect(document.activeElement.tagName).toBe('H3');

    await click('Conversation');
    const promptTarget = Array.from(host.querySelectorAll('.lingua-focus-target')).find(
      (node) => node.lang === 'es-ES' && node.textContent === lesson.conversation[0].coach,
    );
    expect(promptTarget).toBeTruthy();

    const compactListen = Array.from(host.querySelectorAll('button')).find(
      (node) => node.textContent === '▶ Listen',
    );
    expect(compactListen.classList.contains('min-h-8')).toBe(true);
    await expectNoAxeViolations('visible focus and forced colors hooks');
  });
});
