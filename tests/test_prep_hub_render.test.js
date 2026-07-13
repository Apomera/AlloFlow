import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'prismflow-deploy/node_modules');
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
  const reportFetch = async (url) => {
    if (String(url).includes('content_audit.json')) return { ok: true, json: async () => auditFixture };
    if (String(url).includes('content_inventory.json')) return { ok: true, json: async () => inventoryFixture };
    if (String(url).includes('eppp_learning_library.json')) return { ok: true, json: async () => libraryFixture };
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
    expect(host.textContent).toContain('EPPP Part 1 — Source-Reviewed Pilot');
    expect(host.textContent).toContain('Vocational research lanes');
    await expectNoAxeViolations('catalog');

    await clickButton('Open practice pack');
    expect(host.textContent).toContain('Question 1 of 5');
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(4);
    expect(findButton('Check answer').disabled).toBe(true);
    await expectNoAxeViolations('practice question');
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

  it('browses, filters, and opens the native EPPP learning catalog', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    await act(async () => { openButtons[1].click(); });
    await clickButton('Learning library');
    await waitForText('Showing 49 of 49 chapters');

    expect(host.textContent).toContain('EPPP learning library');
    expect(host.textContent).toContain('Showing 49 of 49 chapters');
    expect(host.textContent).toContain('415');
    expect(host.textContent).toContain('255');
    expect(host.querySelector('input[type="search"]')).toBeTruthy();
    expect(host.querySelector('select')).toBeTruthy();
    const chapterCard = Array.from(host.querySelectorAll('article')).find((article) => article.textContent.includes('Behavioral Assessment & Functional Analysis'));
    expect(chapterCard).toBeTruthy();
    await expectNoAxeViolations('learning library catalog');
    await act(async () => { chapterCard.querySelector('button').click(); });
    const frame = host.querySelector('iframe[title="Selected EPPP chapter workspace"]');
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
    expect(host.textContent).toContain('1 of 415 matching cards');
    await clickButton('Reveal answer');
    expect(host.textContent).toContain('Answer:');
    await clickButton('Know it');
    const saved = JSON.parse(localStorage.getItem('alloflow_eppp_flashcard_progress_v1'));
    expect(Object.values(saved)).toContain('know');
    await expectNoAxeViolations('flashcard study mode');

    await clickButton('Memory aids');
    expect(host.textContent).toContain('Memory-aid library');
    expect(host.textContent).toContain('Showing 255 of 255 memory aids');
    await clickButton('Show aid');
    expect(findButton('Hide aid')).toBeTruthy();
  }, 30_000);

  it('opens the native EPPP pilot and the complete guarded legacy workspace', async () => {
    await mount();
    const openButtons = Array.from(host.querySelectorAll('button')).filter((button) => button.textContent.includes('Open practice pack'));
    expect(openButtons).toHaveLength(2);
    await act(async () => { openButtons[1].click(); });

    expect(host.textContent).toContain('Question 1 of 500');
    expect(host.textContent).toContain('500/500 native items passed content QA');
    expect(host.textContent).toContain('Legacy source item');
    expect(host.textContent).toContain('QA passed');
    expect(host.textContent).toContain('Expert validated');
    expect(host.querySelector('a[href*="eppp_native_qa.md"]')).toBeTruthy();
    expect(host.textContent).toContain('Open complete legacy workspace');
    await waitForText('2,933');
    expect(host.textContent).toContain('Legacy-bank migration audit');
    expect(host.textContent).toContain('2,933');
    expect(host.textContent).toContain('28.2%');
    expect(host.textContent).toContain('B · 86.3%');
    expect(host.textContent).toContain('Legacy learning-library inventory');
    expect(host.textContent).toContain('415');
    expect(host.textContent).toContain('255');
    expect(host.textContent).toContain('1,583');
    expect(host.textContent).toContain('492 / 2,933 legacy items');
    expect(host.textContent).toContain('All 2,933 legacy questions are in the review universe');
    expect(host.querySelector('a[href*="content_inventory.md"]')).toBeTruthy();
    expect(host.querySelector('a[href*="review_ledger.md"]')).toBeTruthy();
    expect(host.querySelector('a[href*="curation_500.md"]')).toBeTruthy();
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(4);

    await clickButton('Open complete legacy workspace');
    const frame = host.querySelector('iframe[title="Pass the EPPP legacy workspace"]');
    expect(frame).toBeTruthy();
    expect(frame.getAttribute('src')).toContain('test_prep/eppp_legacy/index.html');
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(0);

    await clickButton('Return to native pilot');
    expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(4);

    const eppp = Hub.listPacks().find((candidate) => candidate.id === 'eppp-part-one');
    for (let index = 0; index < 8; index += 1) {
      const radios = Array.from(host.querySelectorAll('input[type="radio"]'));
      await act(async () => { radios[eppp.items[index].answerIndex].click(); });
      await clickButton('Check answer');
      await clickButton('Next question');
    }
    expect(host.textContent).toContain('Question 9 of 500');
    const migratedRadios = Array.from(host.querySelectorAll('input[type="radio"]'));
    await act(async () => { migratedRadios[eppp.items[8].answerIndex].click(); });
    await clickButton('Check answer');
    expect(host.textContent).toContain('Migration provenance');
    expect(host.textContent).toContain('legacy-313b8d365ea7d566');
    expect(host.textContent).toContain('Content QA passed.');
    await expectNoAxeViolations('EPPP migrated item');
  }, 30_000);
});

