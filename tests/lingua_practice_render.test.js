import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Lingua, BookReader, root, host, originalFetch, originalMatcher;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalFetch = window.fetch;
  originalMatcher = window.AlloLangMatcher;
  loadAlloModule('lingua_practice_module.js');
  loadAlloModule('reading_library_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  BookReader = window.AlloModules.ReadingLibrary.BookReader;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  if (originalFetch === undefined) delete window.fetch; else window.fetch = originalFetch;
  if (originalMatcher === undefined) delete window.AlloLangMatcher; else window.AlloLangMatcher = originalMatcher;
});

function button(text) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}

async function mount(component) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(component); });
}

describe('Lingua Practice render flow', () => {
  it('moves from setup into vocabulary and speaking practice', async () => {
    const lesson = {
      title: 'At school',
      goal: 'Ask for help in context.',
      scenario: 'You need a pencil during class.',
      vocabulary: [
        { term: 'lápiz', meaning: 'pencil', pronunciation: 'LAH-pees', example: 'Necesito un lápiz.', examplePronunciation: 'neh-seh-SEE-toh oon LAH-pees', translation: 'I need a pencil.' },
        { term: 'ayuda', meaning: 'help', example: 'Necesito ayuda.', translation: 'I need help.' },
      ],
      phrases: [{ target: 'Necesito un lápiz.', pronunciation: 'neh-seh-SEE-toh oon LAH-pees', translation: 'I need a pencil.' }],
      conversation: [{ coach: '¿Qué necesitas?', coachPronunciation: 'keh neh-seh-SEE-tahs', translation: 'What do you need?', sample: 'Necesito un lápiz.', samplePronunciation: 'neh-seh-SEE-toh oon LAH-pees' }],
    };
    const callGemini = async () => JSON.stringify(lesson);
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    expect(host.textContent).toContain('Practice language from what you are learning');
    await act(async () => {
      button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(host.textContent).toContain('At school');
    expect(JSON.parse(localStorage.getItem('allo_lingua_recent_v1')).Spanish.title).toBe('At school');
    expect(host.textContent).toContain('lápiz');
    expect(host.textContent).toContain('LAH-pees');
    expect(button('Practice speaking')).toBeTruthy();

    await act(async () => {
      button('Practice speaking').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Make the phrase your own');
    expect(host.textContent).toContain('Necesito un lápiz.');
    expect(host.textContent).toContain('not your accent');
    expect(host.textContent).toContain('neh-seh-SEE-toh oon LAH-pees');
  });

  it('continues the most recent practice set for the selected language', async () => {
    localStorage.setItem('allo_lingua_recent_v1', JSON.stringify({
      Spanish: {
        title: 'Travel basics',
        topic: 'At the station',
        level: 'Developing',
        createdAt: Date.now(),
        lesson: {
          title: 'Travel basics',
          goal: 'Ask where the train leaves.',
          scenario: 'At a train station.',
          vocabulary: [{ term: 'andén', meaning: 'platform', pronunciation: 'ahn-DEN', example: '¿Dónde está el andén?', examplePronunciation: 'DON-deh es-TAH el ahn-DEN', translation: 'Where is the platform?' }],
          phrases: [{ target: '¿Dónde está el andén?', pronunciation: 'DON-deh es-TAH el ahn-DEN', translation: 'Where is the platform?' }],
          conversation: [{ coach: '¿Adónde va?', translation: 'Where are you going?', sample: 'Voy a Madrid.' }],
        },
      },
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));

    expect(host.textContent).toContain('Recent Spanish practice');
    expect(host.textContent).toContain('Travel basics');
    expect(button('Continue recent practice')).toBeTruthy();
    expect(host.querySelector('#lingua-source').value).toBe('');

    await act(async () => {
      button('Continue recent practice').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.textContent).toContain('Ask where the train leaves.');
    expect(host.textContent).toContain('andén');
    expect(host.textContent).toContain('ahn-DEN');
  });
  it('preloads a Reading Library selection and detects its target language', async () => {
    let consumed = 0;
    await mount(React.createElement(Lingua, {
      isOpen: true,
      onClose: () => {},
      initialSource: {
        text: 'El agua cambia de estado cuando la temperatura cambia.',
        title: 'El ciclo del agua',
        selectionLabel: 'Pages 2-3',
        language: 'Spanish',
      },
      onInitialSourceConsumed: () => { consumed += 1; },
    }));

    expect(host.textContent).toContain('Imported from Reading Library');
    expect(host.textContent).toContain('El ciclo del agua · Pages 2-3');
    expect(host.querySelector('#lingua-source').value).toContain('El agua cambia');
    expect(host.querySelector('select[aria-label="I am learning"]').value).toBe('Spanish');
    expect(host.querySelector('#lingua-topic').value).toBe('Discussing El ciclo del agua');
    expect(consumed).toBe(1);
  });
  it('renders an honest per-language progress summary', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 2,
      spokenAttempts: 3,
      activityLog: [{ language: 'Spanish', kind: 'reviews', count: 2, at: Date.now() }],
      languageStats: {
        Spanish: {
          practiceSets: 2,
          spokenAttempts: 3,
          reviews: 4,
          lastPracticedAt: Date.now(),
        },
      },
      saved: [
        { id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', tags: ['Unit 1'], reviewStage: 0, nextReviewAt: 0 },
        { id: 'Spanish::gracias', language: 'Spanish', term: 'gracias', meaning: 'thank you', tags: ['Unit 2'], reviewStage: 3, nextReviewAt: Date.now() + 86400000 },
      ],
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => {
      button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.textContent).toContain('Spanish progress');
    expect(host.textContent).toContain('not a grade or proficiency score');
    expect(host.textContent).toContain('Practiced today');
    expect(host.textContent).toContain('1 learning');
    expect(host.textContent).toContain('1 well-practiced');
    expect(button('Review 1 due')).toBeTruthy();
    const forecast = host.querySelector('[aria-labelledby="lingua-review-forecast-title"]');
    expect(forecast).toBeTruthy();
    expect(forecast.querySelector('#lingua-review-forecast-title').textContent).toBe('Upcoming review load');
    expect(forecast.textContent).toContain('A planning view, not a deadline');
    expect(Array.from(forecast.querySelectorAll('dt')).map((node) => node.textContent))
      .toEqual(['Due now', 'Next 24 hours', 'Days 2-7', 'Later']);
    expect(Array.from(forecast.querySelectorAll('dd')).map((node) => node.textContent))
      .toEqual(['1', '1', '0', '0']);
    expect(host.textContent).toContain('Your learning path');
    expect(host.textContent).toContain('2 of 6 milestones complete');
    expect(host.textContent).toContain('Save useful words');
    expect(host.textContent).toContain('A suggested sequence');
    const momentum = host.querySelector('[aria-labelledby="lingua-review-momentum-title"]');
    expect(momentum).toBeTruthy();
    expect(momentum.textContent).toContain('Review activity logged: 2 cards');
    expect(momentum.textContent).toContain('1 active days');
    expect(momentum.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('1');
    expect(momentum.textContent).toContain('Last review: Practiced today');    const tagProgress = host.querySelector('[aria-labelledby="lingua-tag-progress-title"]');
    expect(tagProgress).toBeTruthy();
    expect(tagProgress.textContent).toContain('Unit 1');
    expect(tagProgress.textContent).toContain('1 words');
    expect(tagProgress.textContent).toContain('1 due now');
    expect(tagProgress.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
    const pathProgress = host.querySelector('[role="progressbar"][aria-valuemax="6"]');
    expect(pathProgress.getAttribute('aria-valuenow')).toBe('2');
    expect(button('Build a practice set')).toBeTruthy();

    const labels = Array.from(host.querySelectorAll('p'));
    const practiceSets = labels.find((node) => node.textContent === 'Practice sets');
    const reviews = labels.find((node) => node.textContent === 'Reviews completed');
    expect(practiceSets.previousSibling.textContent).toBe('2');
    expect(reviews.previousSibling.textContent).toBe('4');

    expect(button('Review Unit 1')).toBeTruthy();
    await act(async () => { button('Review Unit 1').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#lingua-review-tag').value).toBe('Unit 1');
    expect(host.textContent).toContain('hello');
  });
  it('renders a seven-day journal and persists learner reflections with confirmation', async () => {
    const now = Date.now();
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      languageStats: { Spanish: { practiceSets: 2, reviews: 1, lastPracticedAt: now } },
      activityLog: [
        { id: 'activity-now-practice', language: 'Spanish', kind: 'practiceSets', count: 2, at: now },
        { id: 'activity-yesterday-review', language: 'Spanish', kind: 'reviews', count: 1, at: now - 86400000 },
        { id: 'activity-french', language: 'French', kind: 'chatTurns', count: 8, at: now },
      ],
      reflections: [{ id: 'reflection-existing', language: 'Spanish', text: 'Revisit question forms.', at: now - 1000 }],
      saved: [],
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(host.textContent).toContain('Recent learning activity');
    expect(host.textContent).toContain('3 activities in this window');
    expect(host.textContent).toContain('Practice sets built: 2');
    expect(host.textContent).not.toContain('Conversation turns: 8');
    expect(host.textContent).toContain('Revisit question forms.');
    const days = host.querySelectorAll('ol[aria-label="Last 7 days"] > li');
    expect(days).toHaveLength(7);

    const textarea = host.querySelector('#lingua-journal-reflection');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => { setter.call(textarea, 'Listening felt clearer today.'); textarea.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(button('Save reflection').disabled).toBe(false);
    await act(async () => { button('Save reflection').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    let stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.reflections[0].text).toBe('Listening felt clearer today.');

    await act(async () => { button('Delete reflection').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog.textContent).toContain('This cannot be undone');
    const confirm = Array.from(dialog.querySelectorAll('button')).find((item) => item.textContent.includes('Delete reflection'));
    await act(async () => { confirm.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.reflections).toHaveLength(1);
  });
  it('reviews a due saved word and persists its next interval', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0,
      spokenAttempts: 0,
      saved: [{
        id: 'Spanish::hola',
        language: 'Spanish',
        term: 'hola',
        meaning: 'hello',
        example: 'Hola, me llamo Ana.',
        translation: 'Hello, my name is Ana.',
        pronunciation: 'OH-lah',
        examplePronunciation: 'OH-lah, meh YAH-moh AH-nah',
        reviewStage: 0,
        nextReviewAt: 0,
        reviews: 0,
      }],
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));

    expect(button('Review (1)')).toBeTruthy();
    await act(async () => {
      button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Recall the Spanish word');
    expect(host.textContent).toContain('English → Spanish');
    expect(host.textContent).toContain('hello');
    const recall = host.querySelector('#lingua-review-recall');
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { inputSetter.call(recall, 'hola'); recall.dispatchEvent(new Event('input', { bubbles: true })); });

    await act(async () => {
      button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Hola, me llamo Ana.');
    expect(host.textContent).toContain('OH-lah, meh YAH-moh AH-nah');
    expect(host.textContent).toContain('Your answer: hola');
    expect(button('Hard')).toBeTruthy();
    expect(button('Know').textContent).toContain('Next in 3 days');

    await act(async () => {
      button('Know').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('You are caught up for now');
    const sessionSummary = host.querySelector('[aria-labelledby="lingua-review-session-title"]');
    expect(sessionSummary).toBeTruthy();
    expect(sessionSummary.querySelector('#lingua-review-session-title').textContent).toBe('Review session complete');
    expect(sessionSummary.textContent).toContain('1 reviewed');
    expect(sessionSummary.textContent).toContain('0 due now');
    expect(sessionSummary.textContent).toContain('This is an activity summary, not a score.');
    expect(Array.from(sessionSummary.querySelectorAll('dd')).map((node) => node.textContent))
      .toEqual(['0', '0', '0', '1']);

    const saved = JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved[0];
    expect(saved.reviewStage).toBe(2);
    expect(saved.reviews).toBe(1);
    expect(saved.nextReviewAt).toBeGreaterThan(Date.now());
    const stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.languageStats.Spanish.reviews).toBe(1);
    expect(stored.activityLog.filter((item) => item.kind === 'reviews')).toHaveLength(1);
    expect(host.textContent).toContain('Recorded Know for "hola"');
    expect(button('Undo last review')).toBeTruthy();

    await act(async () => { button('Undo last review').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const restored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(restored.saved[0]).toMatchObject({ reviewStage: 0, reviews: 0, nextReviewAt: 0 });
    expect(restored.languageStats.Spanish.reviews).toBe(0);
    expect(restored.activityLog.some((item) => item.kind === 'reviews')).toBe(false);
    expect(host.textContent).toContain('Review undone');
    expect(host.textContent).toContain('Your answer: hola');
    expect(button('Undo last review')).toBeFalsy();
    expect(button('Know')).toBeTruthy();
    expect(host.querySelector('[aria-labelledby="lingua-review-session-title"]')).toBeFalsy();

    await act(async () => { button('Know').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('[aria-labelledby="lingua-review-session-title"]')).toBeTruthy();
    await act(async () => { button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { button('Review').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('[aria-labelledby="lingua-review-session-title"]')).toBeFalsy();
  });

  it('sets due cards aside without changing progress and returns them on request', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [
      { id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola.', translation: 'Hello.', reviewStage: 0, nextReviewAt: 0, reviews: 0 },
      { id: 'Spanish::adios', language: 'Spanish', term: 'adios', meaning: 'goodbye', example: 'Adios.', translation: 'Goodbye.', reviewStage: 0, nextReviewAt: 1, reviews: 0 },
    ] }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (2)').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(host.textContent).toContain('hello');
    expect(button('Skip for now').title).toContain('without changing its review schedule');
    await act(async () => { button('Skip for now').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('goodbye');
    expect(host.textContent).toContain('Skipped "hola" for this session');

    await act(async () => { button('Skip for now').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Cards set aside');
    expect(host.textContent).toContain('2 due cards are set aside');
    expect(button('Review set-aside cards')).toBeTruthy();
    expect(host.textContent).not.toContain('You are caught up for now');

    const stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.saved.map((word) => ({ id: word.id, reviews: word.reviews, nextReviewAt: word.nextReviewAt })))
      .toEqual([
        { id: 'Spanish::hola', reviews: 0, nextReviewAt: 0 },
        { id: 'Spanish::adios', reviews: 0, nextReviewAt: 1 },
      ]);
    expect(stored.languageStats?.Spanish?.reviews || 0).toBe(0);
    expect((stored.activityLog || []).some((item) => item.kind === 'reviews')).toBe(false);

    await act(async () => { button('Review set-aside cards').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Returned 2 set-aside cards');
    expect(host.textContent).toContain('hello');
    expect(button('Skip for now')).toBeTruthy();
  });

  it('focuses review by tag without changing other schedules or the all-due navigation count', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [
      { id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', tags: ['School'], nextReviewAt: 0, reviews: 4 },
      { id: 'Spanish::adios', language: 'Spanish', term: 'adios', meaning: 'goodbye', tags: ['Travel'], nextReviewAt: 1, reviews: 2 },
      { id: 'Spanish::libro', language: 'Spanish', term: 'libro', meaning: 'book', tags: ['School'], nextReviewAt: 2, reviews: 0 },
    ] }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (3)').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const scope = host.querySelector('#lingua-review-tag');
    expect(scope).toBeTruthy();
    expect(scope.closest('.lingua-review-scope')).toBeTruthy();
    expect(scope.getAttribute('aria-describedby')).toBe('lingua-review-scope-help');
    expect(Array.from(scope.options).map((option) => option.textContent)).toEqual(['All due words', 'School', 'Travel']);
    expect(host.textContent).toContain('3 due now \u00b7 3 saved in Spanish');
    const queue = host.querySelector('[aria-labelledby="lingua-review-queue-title"]');
    expect(queue).toBeTruthy();
    expect(queue.textContent).toContain('3 due now · 3 ready to review');
    const order = queue.querySelector('#lingua-review-order');
    expect(order).toBeTruthy();
    expect(order.getAttribute('aria-describedby')).toBe('review-order-help');
    expect(Array.from(order.options).map((option) => option.textContent)).toEqual(['Due time', 'Least reviewed', 'A to Z']);
    const preview = queue.querySelector('ol[aria-label]');
    expect(preview).toBeTruthy();
    expect(preview.getAttribute('aria-label')).toBe('Queue preview');
    expect(preview.querySelector('li').textContent).toContain('hola');
    await act(async () => { order.value = 'reviews'; order.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Review order set to Least reviewed.');
    expect(queue.querySelector('ol[aria-label] li').textContent).toContain('libro');
    await act(async () => { order.value = 'due'; order.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(order.value).toBe('due');
    await act(async () => { scope.value = 'School'; scope.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Review focus changed to School');
    expect(host.textContent).toContain('2 due now \u00b7 2 saved in Spanish with School');
    expect(queue.textContent).toContain('2 due now · 2 ready to review');
    expect(host.textContent).toContain('hello');
    expect(button('Review (3)')).toBeTruthy();

    await act(async () => { button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { button('Know').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('book');
    expect(button('Undo last review')).toBeTruthy();
    expect(host.querySelector('[aria-labelledby="lingua-review-session-title"]')).toBeTruthy();

    await act(async () => { scope.value = 'Travel'; scope.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('goodbye');
    expect(button('Undo last review')).toBeFalsy();
    expect(host.querySelector('[aria-labelledby="lingua-review-session-title"]')).toBeFalsy();
    expect(host.textContent).toContain('1 due now \u00b7 1 saved in Spanish with Travel');

    await act(async () => { scope.value = 'School'; scope.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('book');
    expect(host.textContent).not.toContain('hello');
    const stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.saved.find((word) => word.id === 'Spanish::hola').reviews).toBe(5);
    expect(stored.saved.find((word) => word.id === 'Spanish::adios').reviews).toBe(2);
  });

  it('bounds review sessions without changing later due cards', async () => {
    const terms = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: terms.map((term, index) => ({
      id: 'Spanish::' + term, language: 'Spanish', term, meaning: term, example: term + '.', translation: term, nextReviewAt: index, reviews: 0,
    })) }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (6)').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const queue = host.querySelector('#lingua-review-queue-title').parentNode;
    const size = queue.querySelector('#lingua-review-size');
    expect(size).toBeTruthy();
    expect(Array.from(size.options).map((option) => option.textContent)).toEqual(['All due cards', '5 cards', '10 cards', '20 cards']);
    await act(async () => { size.value = '5'; size.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(size.value).toBe('5');
    expect(host.textContent).toContain('Session size set to 5 cards.');
    expect(host.textContent).toContain('5 cards left in this session');
    expect(host.textContent).toContain('6 due now overall');
    expect(queue.querySelectorAll('ol[aria-label] li')).toHaveLength(5);

    for (let index = 0; index < 5; index += 1) {
      await act(async () => { button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await act(async () => { button('Know').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    expect(host.textContent).toContain('Session goal reached.');
    expect(host.textContent).toContain('1 due cards remain for another session.');
    expect(button('Start another session')).toBeTruthy();
    await act(async () => { button('Start another session').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('New review session started.');
    expect(button('Reveal answer')).toBeTruthy();
  });

  it('reverses an established card to target-to-known recall and schedules Hard', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [{
      id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola.', translation: 'Hello.', reviewStage: 1, nextReviewAt: 0, reviews: 1,
    }] }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Recall the meaning in English');
    expect(host.textContent).toContain('Spanish → English');
    expect(host.textContent).toContain('hola');
    expect(host.querySelector('#lingua-review-recall').lang).toBe('en-US');
    await act(async () => { button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.activeElement.textContent).toBe('hello');
    expect(button('Hard').textContent).toContain('Next in 1 day');
    await act(async () => { button('Hard').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const saved = JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved[0];
    expect(saved.reviewStage).toBe(1);
    expect(saved.lastRating).toBe('hard');
    expect(saved.reviews).toBe(2);
  });
});

describe('Lingua Practice Listening Lab', () => {
  it('keeps the text audio-first, reveals progressive hints, supports dictation, and tracks attempts', async () => {
    const spoken = [];
    const oldPlayer = window.AlloSpeechPlayer;
    window.AlloSpeechPlayer = { speak: (text, opts) => { spoken.push({ text, opts }); }, stop: () => {} };
    const lesson = {
      title: 'At school',
      goal: 'Understand a request for a pencil.',
      scenario: 'In class.',
      vocabulary: [
        { term: 'lápiz', meaning: 'pencil', pronunciation: 'LAH-pees', example: 'Necesito un lápiz.', translation: 'I need a pencil.' },
        { term: 'ayuda', meaning: 'help', example: 'Necesito ayuda.', translation: 'I need help.' },
      ],
      phrases: [{ target: 'Necesito un lápiz.', pronunciation: 'neh-seh-SEE-toh oon LAH-pees', translation: 'I need a pencil.' }],
      conversation: [{ coach: '¿Qué necesitas?', translation: 'What do you need?', sample: 'Necesito un lápiz.' }],
    };
    try {
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => JSON.stringify(lesson) }));
      await act(async () => {
        button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve(); await Promise.resolve();
      });
      await act(async () => { button('Open Listening Lab').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

      expect(host.textContent).toContain('Listen before revealing the text.');
      expect(host.textContent).not.toContain('Necesito un lápiz.');
      await act(async () => { button('Play audio').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await act(async () => { button('Play slowly').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(spoken.map((entry) => entry.text)).toEqual(['Necesito un lápiz.', 'Necesito un lápiz.']);
      expect(spoken[0].opts.rate).toBe(1);
      expect(spoken[1].opts.rate).toBeLessThan(1);

      await act(async () => { button('Show a hint').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(host.textContent).toContain('neh-seh-SEE-toh oon LAH-pees');
      expect(host.textContent).not.toContain('Necesito un lápiz.');
      await act(async () => { button('Show a hint').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(host.textContent).toContain('Necesito un lápiz.');

      await act(async () => { button('Type what you hear').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(host.textContent).not.toContain('Necesito un lápiz.');
      const answer = host.querySelector('#lingua-listening-answer');
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      await act(async () => { inputSetter.call(answer, 'Necesito un lápiz.'); answer.dispatchEvent(new Event('input', { bubbles: true })); });
      await act(async () => { button('Check answer').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

      expect(host.textContent).toContain('100% match');
      expect(host.textContent).toContain('That matches.');
      const savedProgress = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
      expect(savedProgress.languageStats.Spanish.listeningAttempts).toBe(1);
    } finally {
      if (oldPlayer === undefined) delete window.AlloSpeechPlayer; else window.AlloSpeechPlayer = oldPlayer;
    }
  });
});

describe('Lingua Practice Set Studio', () => {
  it('edits, refreshes, saves, reuses, duplicates, archives, and restores a generated set', async () => {
    const lesson = {
      title: 'School help', goal: 'Ask for help.', scenario: 'In class.',
      vocabulary: [{ term: 'lápiz', meaning: 'pencil', pronunciation: 'LAH-pees', example: 'Necesito un lápiz.', translation: 'I need a pencil.' }],
      phrases: [{ target: 'Necesito un lápiz.', translation: 'I need a pencil.' }],
      conversation: [{ coach: '¿Qué necesitas?', translation: 'What do you need?', sample: 'Necesito un lápiz.' }],
    };
    let calls = 0;
    const callGemini = async () => {
      calls += 1;
      return calls === 1 ? JSON.stringify(lesson) : JSON.stringify({
        term: 'cuaderno', meaning: 'notebook', pronunciation: 'kwah-DEHR-noh',
        example: 'Necesito un cuaderno.', examplePronunciation: '', translation: 'I need a notebook.',
      });
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini, addToast: () => {} }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    expect(JSON.parse(localStorage.getItem('allo_lingua_sets_v1'))).toHaveLength(1);

    await act(async () => { button('Practice sets').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Practice Set Studio');
    expect(host.textContent).toContain('School help');
    await act(async () => { button('Edit').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#lingua-studio-title')).toBeTruthy();

    await act(async () => { button('Add word').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelectorAll('[id^="lingua-studio-vocabulary-"][id$="-term"]')).toHaveLength(2);
    await act(async () => { button('Undo changes').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelectorAll('[id^="lingua-studio-vocabulary-"][id$="-term"]')).toHaveLength(1);

    await act(async () => { button('Refresh with AI').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    expect(host.querySelector('#lingua-studio-vocabulary-0-term').value).toBe('cuaderno');

    const title = host.querySelector('#lingua-studio-title');
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { inputSetter.call(title, 'Custom school set'); title.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { button('Save changes').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    let sets = JSON.parse(localStorage.getItem('allo_lingua_sets_v1'));
    expect(sets[0].lesson).toMatchObject({ title: 'Custom school set', vocabulary: [{ term: 'cuaderno' }] });

    await act(async () => { button('Use set').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('cuaderno');
    await act(async () => { button('Practice sets').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { button('Duplicate').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    sets = JSON.parse(localStorage.getItem('allo_lingua_sets_v1'));
    expect(sets).toHaveLength(2);
    expect(host.textContent).toContain('Custom school set copy');

    const archive = button('Archive');
    expect(archive).toBeTruthy();
    await act(async () => { archive.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Archived');
    await act(async () => { button('Restore').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(JSON.parse(localStorage.getItem('allo_lingua_sets_v1')).filter((entry) => !entry.archived)).toHaveLength(2);
  });
});

describe('Lingua Practice Set Studio portability', () => {
  it('exports a set and imports a validated set from another language', async () => {
    const spanishLesson = {
      title: 'Greetings', goal: 'Greet someone.', scenario: 'Meeting a friend.',
      vocabulary: [{ term: 'hola', meaning: 'hello' }],
      phrases: [{ target: 'Hola.', translation: 'Hello.' }],
      conversation: [{ coach: 'Hola.', translation: 'Hello.', sample: 'Hola.' }],
    };
    const frenchLesson = {
      title: 'Au café', goal: 'Order politely.', scenario: 'At a café.',
      vocabulary: [{ term: 'bonjour', meaning: 'hello' }],
      phrases: [{ target: 'Bonjour.', translation: 'Hello.' }],
      conversation: [{ coach: 'Bonjour.', translation: 'Hello.', sample: 'Bonjour.' }],
    };
    const spanish = Lingua._savePracticeSet([], 'Spanish', spanishLesson, { level: 'Beginner' }, 100, 'spanish-set')[0];
    const french = Lingua._savePracticeSet([], 'French', frenchLesson, { level: 'Beginner' }, 200, 'french-set')[0];
    localStorage.setItem('allo_lingua_sets_v1', JSON.stringify([spanish]));

    const clicks = [];
    const originalClick = window.HTMLAnchorElement.prototype.click;
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.HTMLAnchorElement.prototype.click = function () { clicks.push(this.getAttribute('download')); };
    window.URL.createObjectURL = () => 'blob:practice-set';
    window.URL.revokeObjectURL = () => {};
    try {
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {} }));
      await act(async () => { button('Practice sets').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await act(async () => { button('Export set').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(clicks).toContain('lingua-practice-set.json');

      const input = host.querySelector('#lingua-set-import');
      const portable = Lingua._createPracticeSetExport(french, 300);
      Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => JSON.stringify(portable) }] });
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
      expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1')).target).toBe('French');
      expect(host.textContent).toContain('Au café');
      expect(JSON.parse(localStorage.getItem('allo_lingua_sets_v1'))).toHaveLength(2);
    } finally {
      window.HTMLAnchorElement.prototype.click = originalClick;
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
    }
  });
});

describe('Reading Library handoff', () => {
  it('emits the displayed text and language through the Lingua command', async () => {
    let selection = null;
    const book = {
      title: 'Hola, escuela',
      language: 'Spanish',
      isRtl: false,
      level: 2,
      authors: ['Test Author'],
      illustrators: [],
      pages: [{ n: 1, text: 'Hola clase. Necesito un lápiz.' }],
      source: { name: 'Test collection', url: 'https://example.test/book' },
    };

    await mount(React.createElement(BookReader, {
      book,
      onExit: () => {},
      addToast: () => {},
      onPracticeLanguage: (value) => { selection = value; },
    }));

    expect(button('Lingua Practice')).toBeTruthy();
    await act(async () => {
      button('Lingua Practice').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(selection).toMatchObject({
      title: 'Hola, escuela',
      language: 'Spanish',
      selectionLabel: 'Whole text',
    });
    expect(selection.text).toContain('Hola clase. Necesito un lápiz.');
    expect(selection.wholeText).toContain('Hola clase. Necesito un lápiz.');
  });
});

describe('Lingua Practice speech preferences', () => {
  it('persists dialect and communication style and sends them to lesson generation', async () => {
    let prompt = '';
    const callGemini = async (value) => {
      prompt = value;
      return JSON.stringify({ title: 'Quebec weather', goal: 'Discuss weather politely.', scenario: 'A forecast.', vocabulary: [{ term: 'bonjour', meaning: 'hello' }], phrases: [{ target: 'Bonjour.', translation: 'Hello.' }], conversation: [{ coach: 'Quel temps fait-il?', translation: 'What is the weather?', sample: 'Il fait froid.' }] });
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));
    const target = host.querySelector('select[aria-label="I am learning"]');
    await act(async () => { target.value = 'French'; target.dispatchEvent(new Event('change', { bubbles: true })); });
    const dialect = host.querySelector('#lingua-dialect');
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { inputSetter.call(dialect, 'Canada / Quebec'); dialect.dispatchEvent(new Event('input', { bubbles: true })); });
    const register = host.querySelector('select[aria-label="Communication style"]');
    await act(async () => { register.value = 'Polite'; register.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Speech locale: fr-CA');
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    expect(prompt).toContain('Dialect or regional variety: Canada / Quebec');
    expect(prompt).toContain('Communication style: Polite');
    expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1'))).toMatchObject({ target: 'French', dialect: 'Canada / Quebec', register: 'Polite' });
  });

  it('explains speech fallbacks and disables unavailable speech controls', async () => {
    const oldVoice = window.AlloFlowVoice; const oldPlayer = window.AlloSpeechPlayer;
    const oldSynthesis = window.speechSynthesis; const oldUtterance = window.SpeechSynthesisUtterance;
    try {
      delete window.AlloFlowVoice; delete window.AlloSpeechPlayer; delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
      expect(host.textContent).toContain('Speech features');
      expect(host.textContent).toContain('Typing remains available in every activity');
      expect(host.textContent).toContain('Audio playback is not available in this browser');
      expect(button('Slow').disabled).toBe(true);
      await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
      await act(async () => { button('Practice speaking').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const speakButton = Array.from(host.querySelectorAll('main button')).find((node) => node.textContent.includes('Speak'));
      expect(speakButton.disabled).toBe(false);
      expect(host.querySelector('#lingua-speak-response')).toBeTruthy();
    } finally {
      if (oldVoice === undefined) delete window.AlloFlowVoice; else window.AlloFlowVoice = oldVoice;
      if (oldPlayer === undefined) delete window.AlloSpeechPlayer; else window.AlloSpeechPlayer = oldPlayer;
      if (oldSynthesis === undefined) delete window.speechSynthesis; else window.speechSynthesis = oldSynthesis;
      if (oldUtterance === undefined) delete window.SpeechSynthesisUtterance; else window.SpeechSynthesisUtterance = oldUtterance;
    }
  });
});

describe('Lingua Practice custom language', () => {
  it('preserves a custom Reading Library language and lets the learner switch source scope', async () => {
    await mount(React.createElement(Lingua, {
      isOpen: true, onClose: () => {},
      initialSource: {
        text: 'Boozhoo. This is the selected page.',
        wholeText: 'Boozhoo. This is the selected page. Aaniin. This is the rest of the reading.',
        title: 'An Ojibwe reading', selectionLabel: 'Page 1', wholeLabel: 'Whole text', language: 'Ojibwe',
      },
    }));

    expect(host.querySelector('select[aria-label="I am learning"]').value).toBe('__other__');
    expect(host.querySelector('input[aria-label="I am learning: type a language"]').value).toBe('Ojibwe');
    expect(host.textContent).toContain('An Ojibwe reading');
    expect(button('Use whole reading')).toBeTruthy();

    await act(async () => { button('Use whole reading').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#lingua-source').value).toContain('rest of the reading');
    expect(host.textContent).toContain('Whole text');
    await act(async () => { button('Use selection').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#lingua-source').value).toBe('Boozhoo. This is the selected page.');

    const source = host.querySelector('#lingua-source');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => { setter.call(source, 'My replacement notes.'); source.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.textContent).not.toContain('Imported from Reading Library');
  });

  it('accepts a free-typed target language and uses it when building a set', async () => {
    let prompt = '';
    const callGemini = async (p) => {
      prompt = p;
      return JSON.stringify({
        title: 't', goal: 'g', scenario: 's',
        vocabulary: [{ term: 'a', meaning: 'b' }],
        phrases: [{ target: 'a', translation: 'b' }],
        conversation: [{ coach: 'a', translation: 'b', sample: 'c' }],
      });
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    const targetSelect = host.querySelector('select[aria-label="I am learning"]');
    await act(async () => { targetSelect.value = '__other__'; targetSelect.dispatchEvent(new Event('change', { bubbles: true })); });
    const input = host.querySelector('input[aria-label="I am learning: type a language"]');
    expect(input).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(input, 'Chuukese'); input.dispatchEvent(new Event('input', { bubbles: true })); });

    await act(async () => {
      button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(prompt).toContain('Target language: Chuukese');
    expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1')).target).toBe('Chuukese');
  });
});

describe('Lingua Practice UI localization', () => {
  it("renders its own chrome in the learner's known language", async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => '{}' }));
    // default chrome is English
    expect(button('Setup')).toBeTruthy();
    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Spanish'; known.dispatchEvent(new Event('change', { bubbles: true })); });
    const navText = Array.from(host.querySelectorAll('nav button')).map((n) => n.textContent).join('|');
    expect(navText).toContain('Configuración');
    expect(navText).toContain('Vocabulario');
    expect(navText).toContain('Palabras guardadas');
    // known-language select's own label is now localized too
    expect(host.querySelector('select[aria-label="Yo sé"]')).toBeTruthy();
  });
});

describe('Lingua Practice runtime auto-localization', () => {
  it('prefers and caches a reviewed static language pack before calling the AI', async () => {
    const previousFetch = window.fetch;
    const previousMatcher = window.AlloLangMatcher;
    const staticPack = {};
    Object.keys(Lingua._uiStrings.English).forEach((key) => { staticPack[key] = 'STATIC:' + Lingua._uiStrings.English[key]; });
    const fetched = [];
    let aiCalls = 0;

    try {
      window.AlloLangMatcher = { match: async () => ({ slug: 'vietnamese' }) };
      window.fetch = async (url) => {
        fetched.push(String(url));
        return { ok: true, json: async () => ({ lingua: staticPack }) };
      };
      await mount(React.createElement(Lingua, {
        isOpen: true,
        onClose: () => {},
        callGemini: async () => { aiCalls += 1; return '{}'; },
      }));

      const known = host.querySelector('select[aria-label="I know"]');
      await act(async () => { known.value = 'Vietnamese'; known.dispatchEvent(new Event('change', { bubbles: true })); });
      await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 900)); });

      expect(fetched[0]).toContain('/vietnamese.js');
      expect(aiCalls).toBe(0);
      expect(Array.from(host.querySelectorAll('nav button')).map((node) => node.textContent).join('|')).toContain('STATIC:Setup');
      expect(JSON.parse(localStorage.getItem('allo_lingua_pack_i18n_v1')).Vietnamese.nav_vocabulary).toBe('STATIC:Vocabulary');
      expect(host.querySelector('[role="dialog"]').getAttribute('lang')).toBe('vi-VN');
    } finally {
      if (previousFetch === undefined) delete window.fetch; else window.fetch = previousFetch;
      if (previousMatcher === undefined) delete window.AlloLangMatcher; else window.AlloLangMatcher = previousMatcher;
    }
  });

  it('auto-translates the UI for an unbundled known language via the AI and caches it', async () => {
    window.fetch = async () => ({ ok: false });
    let uiCalls = 0;
    const callGemini = async (prompt) => {
      if (typeof prompt === 'string' && prompt.includes('Localize the user-interface labels')) {
        uiCalls += 1;
        const en = JSON.parse(prompt.slice(prompt.indexOf('{"'))); // English map starts at {" (not the {token} braces)
        const out = {};
        Object.keys(en).forEach((k) => { out[k] = 'VI·' + en[k]; }); // keep {tokens}, mark distinctly
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Vietnamese'; known.dispatchEvent(new Event('change', { bubbles: true })); });
    // 700ms debounce + async translate
    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });

    expect(uiCalls).toBe(1);
    const navText = Array.from(host.querySelectorAll('nav button')).map((n) => n.textContent).join('|');
    expect(navText).toContain('VI·Setup'); // nav_setup value auto-translated
    const cached = JSON.parse(localStorage.getItem('allo_lingua_ui_i18n_v1'));
    expect(cached.Vietnamese.nav_vocabulary).toBe('VI·Vocabulary');

    // token preservation survived the round-trip
    expect(cached.Vietnamese.due_saved).toContain('{due}');
    expect(cached.Vietnamese.due_saved).toContain('{saved}');
  });
});

describe('Lingua Practice localized chrome details', () => {
  it('shows level labels in the known language while storing canonical values', async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => '{}' }));
    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Spanish'; known.dispatchEvent(new Event('change', { bubbles: true })); });

    const level = host.querySelector('select[aria-label="Mi nivel"]');
    expect(level).toBeTruthy();
    expect(level.value).toBe('Beginner'); // stored value stays canonical
    const labels = Array.from(level.options).map((o) => o.textContent);
    expect(labels).toContain('Principiante');
    expect(labels).toContain('Intermedio');
    // Wave-2 strings: long setup paragraph and topic chips are localized too.
    expect(host.textContent).toContain('Elige tus idiomas y un tema.');
    expect(button('Presentaciones')).toBeTruthy();
  });

  it('flips the dialog to RTL once translated chrome exists for an RTL known language', async () => {
    window.fetch = async () => ({ ok: false });
    const callGemini = async (prompt) => {
      if (typeof prompt === 'string' && prompt.includes('Localize the user-interface labels')) {
        const en = JSON.parse(prompt.slice(prompt.indexOf('{"')));
        const out = {};
        Object.keys(en).forEach((k) => { out[k] = 'AR·' + en[k]; });
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('dir')).toBe(null); // English chrome stays LTR

    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Arabic'; known.dispatchEvent(new Event('change', { bubbles: true })); });
    // Still LTR while the auto-translation is pending (English labels).
    expect(dialog.getAttribute('dir')).toBe(null);

    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });
    expect(dialog.getAttribute('dir')).toBe('rtl');
    expect(dialog.getAttribute('lang')).toBe('ar-SA');
  });
});

describe('Lingua Practice customizable learning plan', () => {
  it('persists selected activities and targets and immediately reshapes the roadmap', async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {} }));
    await act(async () => { button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { button('Customize plan').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const saveGoal = host.querySelector('#lingua-plan-goal-save');
    const numberSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { numberSetter.call(saveGoal, '7'); saveGoal.dispatchEvent(new Event('input', { bubbles: true })); });
    for (const index of [2, 3, 4, 5]) {
      const checkbox = host.querySelectorAll('#lingua-plan-editor input[type="checkbox"]')[index];
      await act(async () => { checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    await act(async () => { button('Save plan').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const stored = JSON.parse(localStorage.getItem('allo_lingua_plans_v1'));
    expect(stored.Spanish.steps.save).toEqual({ enabled: true, goal: 7 });
    expect(Object.values(stored.Spanish.steps).filter((step) => step.enabled)).toHaveLength(2);
    expect(host.querySelector('[role="progressbar"][aria-valuemax="2"]')).toBeTruthy();
    expect(host.textContent).toContain('Build practice sets');
    expect(host.textContent).toContain('Save useful words');
    expect(host.textContent).not.toContain('Complete spaced reviews');

    await act(async () => { button('Customize plan').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('not a grade or proficiency measure');
    await act(async () => { button('Use recommended targets').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { button('Save plan').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('[role="progressbar"][aria-valuemax="6"]')).toBeTruthy();
  });
});

describe('Lingua Practice progress quick-switch', () => {
  it('lists other practiced languages and switches the target from the Progress tab', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 2,
      spokenAttempts: 0,
      languageStats: {
        Spanish: { practiceSets: 2, lastPracticedAt: Date.now() },
        French: { practiceSets: 1, lastPracticedAt: Date.now() },
      },
      saved: [{ id: 'French::bonjour', language: 'French', term: 'bonjour', meaning: 'hello', reviewStage: 0, nextReviewAt: 0 }],
    }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(host.textContent).toContain('Other languages you have practiced');
    const chip = host.querySelector('button[aria-label="Practice French"]');
    expect(chip.textContent).toBe('French · 1');
    await act(async () => { chip.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    // Still on Progress, now for French; French no longer offered as "other".
    expect(host.textContent).toContain('French progress');
    expect(host.querySelector('button[aria-label="Practice French"]')).toBe(null);
    expect(host.querySelector('button[aria-label="Practice Spanish"]')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1')).target).toBe('French');
  });
});

describe('Lingua Practice storage safety', () => {
  it('enforces the word-bank limit before another word is saved', async () => {
    const saved = Array.from({ length: Lingua._maxSavedWords }, (_, index) => ({ language: 'Spanish', term: 'saved-' + index, meaning: 'meaning' }));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved }));
    const lesson = {
      title: 'One more word', goal: 'Practice one word.', scenario: 'A greeting.',
      vocabulary: [{ term: 'hola', meaning: 'hello', example: 'Hola.', translation: 'Hello.' }],
      phrases: [{ target: 'Hola.', translation: 'Hello.' }], conversation: [{ coach: 'Hola.', translation: 'Hello.', sample: 'Hola.' }],
    };
    const toasts = [];
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => JSON.stringify(lesson), addToast: (m, t) => toasts.push({ m, t }) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    const save = host.querySelector('button[aria-label="Save word"]');
    await act(async () => { save.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved).toHaveLength(Lingua._maxSavedWords);
    expect(toasts.some((item) => item.m.includes('full at 500 words') && item.t === 'error')).toBe(true);
  });

  it('warns once when learner data cannot be written to browser storage', async () => {
    const toasts = []; const originalSetItem = window.Storage.prototype.setItem;
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: (m, t) => toasts.push({ m, t }) }));
    try {
      window.Storage.prototype.setItem = function () { throw new Error('quota'); };
      const level = host.querySelector('select[aria-label="My level"]');
      await act(async () => { level.value = 'Advanced'; level.dispatchEvent(new Event('change', { bubbles: true })); });
      await act(async () => { level.value = 'Intermediate'; level.dispatchEvent(new Event('change', { bubbles: true })); });
      expect(toasts.filter((item) => item.m.includes('could not save')).length).toBe(1);
    } finally { window.Storage.prototype.setItem = originalSetItem; }
  });
});

describe('Lingua Practice word-bank download', () => {
  it('shows bounded review history without presenting it as a score', async () => {
    const now = Date.UTC(2026, 0, 12);
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      languageStats: { Spanish: { reviews: 7, practiceSets: 2, lastPracticedAt: now } },
      activityLog: [{ id: 'activity-review-history', language: 'Spanish', kind: 'reviews', count: 7, at: now }],
      saved: [
      {
        id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola.', note: 'Use this when greeting a neighbor.', tags: ['Greeting'], reviewStage: 2, reviews: 2, lapses: 1, lastReviewedAt: now, lastRating: 'know', nextReviewAt: now + 3 * 86400000,
        reviewHistory: [
          { at: now, rating: 'know', interval: 3 * 86400000, stage: 2 },
          { at: now - 86400000, rating: 'again', interval: 600000, stage: 0 },
        ],
      },
      { id: 'Spanish::adios', language: 'Spanish', term: 'adios', meaning: 'goodbye', nextReviewAt: 0 },
    ] }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const details = host.querySelector('details');
    const summary = details.querySelector('summary');
    expect(summary.textContent).toBe('Review history (2)');
    expect(details.open).toBe(false);
    await act(async () => { summary.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(details.open).toBe(true);
    expect(details.textContent).toContain('not a score');
    expect(details.textContent).toContain('Know');
    expect(details.textContent).toContain('Next in 3 days');
    expect(details.textContent).toContain('Again');
    expect(details.textContent).toContain('Next in 10 minutes');
    expect(details.querySelector('ol').getAttribute('aria-label')).toBe('Recent review choices for hola');
    expect(details.querySelectorAll('time')).toHaveLength(2);
    expect(host.textContent).toContain('No recent review details are stored for this word.');

    const reset = button('Reset review progress');
    expect(reset.title).toContain('clears its schedule and per-word history');
    reset.focus();
    await act(async () => { reset.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    let dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog.textContent).toContain('The word stays saved and becomes due now');
    expect(dialog.textContent).toContain('Overall activity records will not change');
    const cancel = Array.from(dialog.querySelectorAll('button')).find((item) => item.textContent === 'Cancel');
    expect(document.activeElement).toBe(cancel);
    await act(async () => { cancel.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement).toBe(reset);

    await act(async () => { reset.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    dialog = host.querySelector('[role="alertdialog"]');
    const confirm = Array.from(dialog.querySelectorAll('button')).find((item) => item.textContent === 'Reset review progress');
    await act(async () => { confirm.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });

    const stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.saved[0]).toMatchObject({
      id: 'Spanish::hola', term: 'hola', meaning: 'hello', example: 'Hola.', note: 'Use this when greeting a neighbor.', tags: ['Greeting'],
      reviewStage: 0, nextReviewAt: 0, reviews: 0, lapses: 0, lastReviewedAt: 0, lastRating: '', reviewHistory: [],
    });
    expect(stored.saved[1].term).toBe('adios');
    expect(stored.languageStats.Spanish).toMatchObject({ reviews: 7, practiceSets: 2, lastPracticedAt: now });
    expect(stored.activityLog).toEqual([{ id: 'activity-review-history', language: 'Spanish', kind: 'reviews', count: 7, at: now }]);
    expect(button('Reset review progress')).toBeFalsy();
    expect(host.textContent).toContain('No recent review details are stored for this word.');
    expect(document.activeElement.textContent).toContain('Saved words');
  });

  it('adds and edits personal vocabulary with predictable focus behavior', async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const add = button('Add a word');
    add.focus();
    await act(async () => { add.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.activeElement.id).toBe('lingua-word-editor-title');
    expect(host.textContent).toContain('Add your own vocabulary or correct an entry');

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const term = host.querySelector('#lingua-word-term');
    const meaning = host.querySelector('#lingua-word-meaning');
    const note = host.querySelector('#lingua-word-note');
    const tags = host.querySelector('#lingua-word-tags');
    const noteText = 'Remember the library sign.';
    const tagText = 'School, Unit 2, school';
    const textSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    expect(note.maxLength).toBe(500);
    expect(tags.maxLength).toBe(200);
    expect(tags.getAttribute('aria-describedby')).toBe('lingua-word-tags-help lingua-word-tags-count');
    expect(note.getAttribute('aria-describedby')).toBe('lingua-word-note-help lingua-word-note-count');
    await act(async () => {
      setter.call(term, 'biblioteca'); term.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(meaning, 'library'); meaning.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(tags, tagText); tags.dispatchEvent(new Event('input', { bubbles: true }));
      textSetter.call(note, noteText); note.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('#lingua-word-note-count').textContent).toBe(noteText.length + ' / 500 characters');
    expect(host.querySelector('#lingua-word-tags-count').textContent).toBe('2 / 5 tags');
    await act(async () => { button('Save word').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    let stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.saved[0]).toMatchObject({ id: 'Spanish::biblioteca', term: 'biblioteca', meaning: 'library', note: noteText, tags: ['School', 'Unit 2'] });
    expect(host.textContent).toContain('biblioteca');
    expect(host.textContent).toContain('Personal note');
    expect(host.textContent).toContain(noteText);
    expect(host.querySelector('ul[aria-label="Tags for biblioteca"]')).toBeTruthy();
    expect(host.textContent).toContain('Unit 2');

    let edit = button('Edit');
    edit.focus();
    await act(async () => { edit.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.activeElement.id).toBe('lingua-word-editor-title');
    await act(async () => { button('Cancel').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement).toBe(edit);

    await act(async () => { edit.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const editedTerm = host.querySelector('#lingua-word-term');
    await act(async () => { setter.call(editedTerm, 'libreria'); editedTerm.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { button('Save word').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.saved).toHaveLength(1);
    expect(stored.saved[0]).toMatchObject({ id: 'Spanish::libreria', term: 'libreria', meaning: 'library', note: noteText, tags: ['School', 'Unit 2'], reviewStage: 0 });
    expect(document.activeElement.textContent).toContain('Saved words');
  });

  it('searches, filters, sorts, clears, and safely removes saved words', async () => {
    const now = Date.now();
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [
      { id: 'Spanish::lapiz', language: 'Spanish', term: 'l\u00e1piz', meaning: 'pencil', example: 'Necesito un l\u00e1piz.', tags: ['School'], nextReviewAt: now + 86400000, reviews: 1 },
      { id: 'French::bonjour', language: 'French', term: 'bonjour', meaning: 'hello', example: 'Bonjour Marie.', tags: ['Travel'], reviewStage: 3, nextReviewAt: 0, reviews: 8 },
      { id: 'Spanish::agua', language: 'Spanish', term: 'agua', meaning: 'water', example: 'Necesito agua.', note: 'Hydration reminder', tags: ['Health', 'Priority'], nextReviewAt: 0, reviews: 3 },
    ] }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(host.textContent).toContain('Showing 3 of 3 saved words');
    const statusBadges = Array.from(host.querySelectorAll('.lingua-status-badge')).map((node) => node.textContent);
    expect(statusBadges).toEqual(expect.arrayContaining(['Due now', 'Learning', 'Established']));
    const statusSummary = host.querySelector('[aria-labelledby="lingua-saved-status-summary-title"]');
    expect(statusSummary).toBeTruthy();
    expect(statusSummary.textContent).toContain('Review status at a glance');
    expect(statusSummary.querySelector('[data-saved-status="due"]').textContent).toContain('2');
    expect(statusSummary.querySelector('[data-saved-status="established"]').textContent).toContain('1');
    await act(async () => { host.querySelector('[data-saved-status="established"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    await act(async () => { host.querySelector('[data-saved-status="established"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const selectVisible = button('Select visible');
    expect(selectVisible).toBeTruthy();
    await act(async () => { selectVisible.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('3 selected');
    const bulkTag = host.querySelector('#lingua-saved-bulk-tag');
    const bulkInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { bulkInputSetter.call(bulkTag, 'Priority'); bulkTag.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { button('Apply tags').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('#lingua-saved-bulk-tag').value).toBe('');
    const bulkStored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(bulkStored.saved.find((item) => item.id === 'French::bonjour').tags).toEqual(['Travel', 'Priority']);
    expect(bulkStored.saved.find((item) => item.id === 'Spanish::agua').tags).toEqual(['Health', 'Priority']);
    const directReview = host.querySelector('[data-saved-review-id="French::bonjour"]');
    expect(directReview).toBeTruthy();
    expect(directReview.getAttribute('aria-label')).toBe('Review bonjour now');
    await act(async () => { directReview.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.querySelector('button[aria-current="page"]').textContent).toContain('Review');
    await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const search = host.querySelector('#lingua-saved-search');
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { inputSetter.call(search, 'lapiz'); search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    expect(host.textContent).toContain('l\u00e1piz');
    expect(host.textContent).not.toContain('Bonjour Marie.');

    await act(async () => { button('Clear filters').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { inputSetter.call(search, 'hydration'); search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    expect(host.textContent).toContain('agua');
    expect(host.textContent).toContain('Hydration reminder');

    await act(async () => { button('Clear filters').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { inputSetter.call(search, 'school'); search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    expect(host.textContent).toContain('l\u00e1piz');

    await act(async () => { button('Clear filters').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const tag = host.querySelector('#lingua-saved-tag');
    expect(Array.from(tag.options).map((option) => option.textContent)).toEqual(['All tags', 'Health', 'Priority', 'School', 'Travel']);
    await act(async () => { tag.value = 'Travel'; tag.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    expect(host.textContent).toContain('bonjour');

    await act(async () => { button('Clear filters').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const status = host.querySelector('#lingua-saved-status');
    expect(Array.from(status.options).map((option) => option.textContent)).toEqual(['All review statuses', 'Due now', 'Learning', 'Established']);
    await act(async () => { status.value = 'established'; status.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    expect(host.textContent).toContain('bonjour');
    await act(async () => { button('Clear filters').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { status.value = 'due'; status.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 2 of 3 saved words');
    const language = host.querySelector('#lingua-saved-language');
    await act(async () => { language.value = 'French'; language.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.textContent).toContain('Showing 1 of 3 saved words');
    expect(host.textContent).toContain('bonjour');

    const remove = host.querySelector('button[aria-label="Remove saved word"]');
    await act(async () => { remove.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved).toHaveLength(3);
    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog.textContent).toContain('bonjour');
    expect(dialog.textContent).toContain('review history');
    const confirm = Array.from(dialog.querySelectorAll('button')).find((item) => item.textContent === 'Remove saved word');
    await act(async () => { confirm.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved).toHaveLength(2);
    expect(host.textContent).toContain('Showing 0 of 2 saved words');

    await act(async () => { button('Clear filters').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const sort = host.querySelector('#lingua-saved-sort');
    await act(async () => { sort.value = 'review'; sort.dispatchEvent(new Event('change', { bubbles: true })); });
    const visibleTerms = Array.from(host.querySelectorAll('ul.space-y-2 strong')).map((item) => item.textContent);
    expect(visibleTerms).toEqual(['agua', 'l\u00e1piz']);
  });

  it('downloads the saved words as a local CSV file', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0,
      spokenAttempts: 0,
      saved: [{ id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', reviewStage: 0, nextReviewAt: 0 }],
    }));
    const toasts = [];
    const clicks = [];
    const originalClick = window.HTMLAnchorElement.prototype.click;
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.HTMLAnchorElement.prototype.click = function () { clicks.push(this.getAttribute('download')); };
    window.URL.createObjectURL = () => 'blob:lingua-test';
    window.URL.revokeObjectURL = () => {};
    try {
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: (m, t) => toasts.push({ m, t }) }));
      await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const download = button('Download CSV');
      expect(download).toBeTruthy();
      await act(async () => { download.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(clicks).toEqual(['lingua-word-bank.csv']);
      expect(toasts.some((x) => x.t === 'success')).toBe(true);
    } finally {
      window.HTMLAnchorElement.prototype.click = originalClick;
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
    }
  });
  it('downloads a complete backup and clears Lingua data after confirmation', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [{ language: 'Spanish', term: 'hola', meaning: 'hello' }] }));
    const clicks = []; const toasts = [];
    const originalClick = window.HTMLAnchorElement.prototype.click; const originalCreate = window.URL.createObjectURL; const originalRevoke = window.URL.revokeObjectURL;
    window.HTMLAnchorElement.prototype.click = function () { clicks.push(this.getAttribute('download')); };
    window.URL.createObjectURL = () => 'blob:lingua-backup'; window.URL.revokeObjectURL = () => {};
    try {
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: (m, t) => toasts.push({ m, t }) }));
      await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await act(async () => { button('Download backup').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(clicks).toContain('lingua-backup.json');
      await act(async () => { button('Clear Lingua data').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(localStorage.getItem('allo_lingua_progress_v1')).not.toBe(null);
      const confirmation = host.querySelector('[role="alertdialog"]');
      expect(confirmation).toBeTruthy();
      const confirmClear = Array.from(confirmation.querySelectorAll('button'))
        .find((node) => node.textContent === 'Clear Lingua data');
      expect(confirmClear).toBeTruthy();
      await act(async () => { confirmClear.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(localStorage.getItem('allo_lingua_progress_v1')).toBe(null);
      expect(host.textContent).not.toContain('hola');
      expect(toasts.some((item) => item.m.includes('cleared') && item.t === 'success')).toBe(true);
    } finally {
      window.HTMLAnchorElement.prototype.click = originalClick; window.URL.createObjectURL = originalCreate; window.URL.revokeObjectURL = originalRevoke;
    }
  });

  it('restores a validated Lingua backup through the data controls', async () => {
    const backup = Lingua._createBackup(
      { known: 'English', target: 'French', level: 'Beginner', topic: 'Introductions' },
      { saved: [{ language: 'French', term: 'bonjour', meaning: 'hello', reviewStage: 2, nextReviewAt: 10 }] }, {}, {},
      { audioSlow: true, pictureOnlyReview: false }, Date.now(),
    );
    const toasts = [];
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: (m, t) => toasts.push({ m, t }) }));
    await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const input = host.querySelector('#lingua-backup-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => JSON.stringify(backup) }] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('bonjour');
    expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1')).target).toBe('French');
    expect(localStorage.getItem('allo_lingua_slow_v1')).toBe('1');
    expect(toasts.some((item) => item.m.includes('restored') && item.t === 'success')).toBe(true);
  });
});

describe('Lingua Practice AI illustrations', () => {
  const lesson = {
    title: 'At school', goal: 'Ask for help.', scenario: 'You need a pencil during class.',
    vocabulary: [
      { term: 'lápiz', meaning: 'pencil', example: 'Necesito un lápiz.', translation: 'I need a pencil.' },
      { term: 'ayuda', meaning: 'help', example: 'Necesito ayuda.', translation: 'I need help.' },
    ],
    phrases: [{ target: 'Necesito un lápiz.', translation: 'I need a pencil.' }],
    conversation: [{ coach: '¿Qué necesitas?', translation: 'What do you need?', sample: 'Necesito un lápiz.' }],
  };

  afterEach(() => { delete window.callGeminiImageEdit; delete window.callGeminiVision; });

  it('illustrates the vocabulary set on demand with text-free icon prompts', async () => {
    const imageCalls = [];
    window.callGeminiImageEdit = async (prompt, base64, w, q, ref) => {
      imageCalls.push({ prompt, base64, ref });
      return 'data:image/png;base64,IMG' + imageCalls.length;
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {}, callGemini: async () => JSON.stringify(lesson) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => {
      button('Add pictures').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(imageCalls).toHaveLength(2);
    expect(imageCalls[0].base64).toBe(null); // text-to-image mode
    expect(imageCalls[0].prompt).toContain('lápiz');
    expect(imageCalls[0].prompt).toContain('pencil');
    expect(imageCalls[0].prompt).toContain('NO TEXT');
    // Style consistency: the first image has no reference; every later call
    // attaches the first image's base64 and asks to match its style.
    expect(imageCalls[0].ref).toBe(null);
    expect(imageCalls[0].prompt).not.toContain('reference image');
    expect(imageCalls[1].ref).toBe('IMG1');
    expect(imageCalls[1].prompt).toContain('Match the art style');
    expect(host.querySelector('img[alt="Illustration of lápiz"]')).toBeTruthy();
    expect(host.querySelector('img[alt="Illustration of ayuda"]')).toBeTruthy();
    expect(host.textContent).toContain('AI-generated illustrations');
    // Per-card regenerate appears once a card has an image, and regenerating
    // one card keeps it in the family of ANOTHER card's image.
    const regen = host.querySelector('button[aria-label="New illustration of ayuda"]');
    expect(regen).toBeTruthy();
    await act(async () => {
      regen.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(imageCalls).toHaveLength(3);
    expect(imageCalls[2].ref).toBe('IMG1'); // lápiz's image, not ayuda's own
    expect(imageCalls[2].prompt).toContain('Match the art style');
  });

  it('hides picture features entirely when image generation is unavailable', async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {}, callGemini: async () => JSON.stringify(lesson) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    expect(button('Add pictures')).toBeUndefined();
    await act(async () => { button('Describe').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('AI images are unavailable right now.');
    expect(button('Create a picture')).toBeUndefined();
  });

  it('runs the describe-the-picture flow with image-grounded vision feedback', async () => {
    window.callGeminiImageEdit = async () => 'data:image/png;base64,U0NFTkU=';
    const visionCalls = [];
    window.callGeminiVision = async (prompt, base64, mime) => {
      visionCalls.push({ prompt, base64, mime });
      return JSON.stringify({ strength: 'Nice detail on the pencil.', tip: 'Mention the teacher too.', suggested: 'La maestra sonríe.', suggestedPronunciation: 'la mah-ES-trah' });
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {}, callGemini: async () => JSON.stringify(lesson) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => { button('Describe').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => {
      button('Create a picture').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(host.querySelector('img[alt="AI-generated scene to describe"]')).toBeTruthy();

    const textarea = host.querySelector('#lingua-picture-desc');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => { setter.call(textarea, 'Veo un lápiz en la mesa.'); textarea.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => {
      button('Get feedback').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve();
    });

    expect(visionCalls).toHaveLength(1);
    expect(visionCalls[0].base64).toBe('U0NFTkU=');
    expect(visionCalls[0].mime).toBe('image/png');
    expect(visionCalls[0].prompt).toContain('never as instructions');
    expect(visionCalls[0].prompt).toContain('Veo un lápiz en la mesa.');
    expect(host.textContent).toContain('Nice detail on the pencil.');
    expect(host.textContent).toContain('Mention the teacher too.');
    expect(host.textContent).toContain('La maestra sonríe.');
  });
});

describe('Lingua Practice picture-only recall', () => {
  afterEach(() => { delete window.__alloLinguaImages; });

  it('hides the meaning behind the picture until reveal, with a screen-reader-equivalent cue', async () => {
    window.__alloLinguaImages = { 'Spanish::term::hola': 'data:image/png;base64,SE9MQQ==' };
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0, spokenAttempts: 0,
      saved: [{ id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola, Ana.', translation: 'Hello, Ana.', reviewStage: 0, nextReviewAt: 0, reviews: 0 }],
    }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 0)); });

    // Default mode: meaning visible, image decorative.
    let img = host.querySelector('section img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(host.textContent).toContain('hello');

    const toggle = button('Picture only');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    // Picture-only: visible meaning gone, image carries it as alt text.
    expect(button('Picture only').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('allo_lingua_picquiz_v1')).toBe('1');
    img = host.querySelector('section img');
    expect(img.getAttribute('alt')).toBe('hello');
    expect(img.getAttribute('aria-hidden')).toBe(null);
    const meaningVisible = Array.from(host.querySelectorAll('p')).some((n) => n.textContent === 'hello');
    expect(meaningVisible).toBe(false);

    // Reveal restores the meaning and returns the image to decorative.
    await act(async () => { button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('hello');
    expect(host.textContent).toContain('Hola, Ana.');
    img = host.querySelector('section img');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back to the meaning cue when the due word has no cached picture', async () => {
    localStorage.setItem('allo_lingua_picquiz_v1', '1'); // mode persisted ON
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0, spokenAttempts: 0,
      saved: [{ id: 'Spanish::adiós', language: 'Spanish', term: 'adiós', meaning: 'goodbye', reviewStage: 0, nextReviewAt: 0, reviews: 0 }],
    }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 0)); });

    expect(host.querySelector('section img')).toBe(null);
    expect(button('Picture only')).toBeUndefined(); // toggle only offered with a picture
    expect(host.textContent).toContain('goodbye'); // meaning cue still shown
  });
});

describe('Lingua Practice slow audio', () => {
  it('toggles slow playback, persists it, and passes a slower rate to the player', async () => {
    const spoken = [];
    window.AlloSpeechPlayer = { speak: (text, opts) => { spoken.push({ text, opts }); }, stop: () => {} };
    try {
      const lesson = {
        title: 'At school', goal: 'g', scenario: 's',
        vocabulary: [{ term: 'lápiz', meaning: 'pencil', example: 'Necesito un lápiz.', translation: 'I need a pencil.' }],
        phrases: [{ target: 'Necesito un lápiz.', translation: 'x' }],
        conversation: [{ coach: '¿Qué?', translation: 'What?', sample: 'x' }],
      };
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => JSON.stringify(lesson) }));

      const slow = button('Slow');
      expect(slow.getAttribute('aria-pressed')).toBe('false');
      await act(async () => { slow.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(button('Slow').getAttribute('aria-pressed')).toBe('true');
      expect(localStorage.getItem('allo_lingua_slow_v1')).toBe('1');

      await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
      const listen = host.querySelector('button[title="Listen to lápiz"]');
      await act(async () => { listen.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(spoken.length).toBe(1);
      expect(spoken[0].opts.rate).toBeGreaterThan(0);
      expect(spoken[0].opts.rate).toBeLessThan(1);
    } finally {
      delete window.AlloSpeechPlayer;
    }
  });
});

describe('Lingua Practice chat persistence and save-from-chat', () => {
  it('persists a conversation, saves a phrase, and restores it after remount', async () => {
    const callGemini = async () => JSON.stringify({
      reply: 'Hola, ¿qué tal?', translation: 'Hi, how are you?', pronunciation: 'OH-lah keh tahl', tip: 'good',
    });
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini, addToast: () => {} }));

    await act(async () => { button('Live chat').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => {
      button('Start the chat').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });
    expect(host.textContent).toContain('Hola, ¿qué tal?');
    const stored = JSON.parse(localStorage.getItem('allo_lingua_chat_v1'));
    expect(stored.Spanish.messages.some((m) => m.target === 'Hola, ¿qué tal?')).toBe(true);

    await act(async () => { button('Save phrase').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const saved = JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved;
    expect(saved.some((s) => s.term === 'Hola, ¿qué tal?' && s.language === 'Spanish')).toBe(true);

    act(() => root.unmount());
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini, addToast: () => {} }));
    await act(async () => { button('Live chat').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Hola, ¿qué tal?');
  });
});
