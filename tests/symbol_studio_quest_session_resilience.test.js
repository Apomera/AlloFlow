import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio;
let root;
let host;

beforeAll(() => {
  SymbolStudio = setupSymbolStudio().SymbolStudio;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  localStorage.clear();
  vi.useRealTimers();
});

function seed(categories = ['noun', 'verb', 'adjective']) {
  const profile = { id: 'quest-profile', name: 'Learner', codename: 'Sky Fox' };
  localStorage.setItem('alloStudentProfiles', JSON.stringify([profile]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify(profile.id));
  localStorage.setItem('alloSymbolGallery__quest-profile', JSON.stringify(categories.map((category, i) => ({
    id: 'symbol-' + i, label: ['ball', 'run', 'happy'][i], category,
    image: 'data:image/png;base64,AA==',
  }))));
}

async function mount(overrides = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'quest', ...overrides }))));
}

function click(label) {
  const control = host.querySelector('button[aria-label="' + label + '"]');
  expect(control, label).toBeTruthy();
  act(() => control.click());
}

describe('Symbol Studio Quest lifecycle resilience', () => {
  it('enters memory, reveals accessible cards, and returns to other modes without changing hook order', async () => {
    seed();
    await mount();
    click('Symbol Memory game mode');
    const cards = host.querySelectorAll('button[aria-label^="Memory card"]');
    expect(cards).toHaveLength(6);
    expect(cards[0].getAttribute('aria-label')).toContain('face down');
    act(() => cards[0].click());
    expect(cards[0].getAttribute('aria-label')).toMatch(/: (ball|run|happy), (text|image)/);
    click('Back');
    click('See Image → Pick Label game mode');
    expect(host.querySelectorAll('button[aria-label^="Answer:"]')).toHaveLength(3);
  });

  it('supports closing and reopening a mounted studio without changing hook order', async () => {
    seed();
    await mount({ isOpen: false });
    expect(host.textContent).toBe('');
    await act(async () => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'quest' }))));
    click('Symbol Memory game mode');
    await act(async () => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'quest', isOpen: false }))));
    expect(host.textContent).toBe('');
    await act(async () => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'quest' }))));
    expect(host.querySelector('button[aria-label="Symbol Memory game mode"]')).toBeTruthy();
  });

  it('disables an impossible category quiz and explains how to enable it', async () => {
    seed(['noun', 'noun', 'noun']);
    await mount();
    const category = host.querySelector('button[aria-label="Category Quiz game mode"]');
    expect(category.disabled).toBe(true);
    expect(document.getElementById(category.getAttribute('aria-describedby')).textContent).toContain('at least two different categories');
  });

  it('cancels the old answer timer before starting a different game', async () => {
    vi.useFakeTimers();
    seed();
    await mount();
    click('See Image → Pick Label game mode');
    act(() => host.querySelector('button[aria-label^="Answer:"]').click());
    click('Back');
    click('Category Quiz game mode');
    const before = host.querySelector('[aria-label^="Score:"]').getAttribute('aria-label');
    const choicesBefore = Array.from(host.querySelectorAll('button[aria-label^="Choose:"]'), (el) => el.textContent);
    await act(async () => { await vi.advanceTimersByTimeAsync(2600); });
    expect(host.querySelector('[aria-label^="Score:"]').getAttribute('aria-label')).toBe(before);
    expect(Array.from(host.querySelectorAll('button[aria-label^="Choose:"]'), (el) => el.textContent)).toEqual(choicesBefore);
  });

  it('offers only one answer and memory pair per normalized word across visual variants', async () => {
    seed();
    const assets = JSON.parse(localStorage.getItem('alloSymbolGallery__quest-profile'));
    assets.unshift({ ...assets[0], id: 'ball-variant', label: '  BALL  ', conceptId: 'ball' });
    localStorage.setItem('alloSymbolGallery__quest-profile', JSON.stringify(assets));
    await mount();
    click('See Image → Pick Label game mode');
    const answers = Array.from(host.querySelectorAll('button[aria-label^="Answer:"]'), (el) => el.textContent.trim().toLowerCase());
    expect(answers).toHaveLength(3);
    expect(new Set(answers).size).toBe(answers.length);
    click('Back');
    click('Symbol Memory game mode');
    expect(host.querySelectorAll('button[aria-label^="Memory card"]')).toHaveLength(6);
  });

  it('uses the actual Symbol Bank category names in quiz prompts', async () => {
    seed(['food', 'actions', 'emotions']);
    await mount();
    click('Category Quiz game mode');
    expect(host.querySelector('h4').textContent).toMatch(/Which of these is (a food word|an action word|an emotion word)\?/);
    expect(host.querySelector('h4').textContent).not.toContain('is a word?');
  });

  it('ignores an empty spelling submission', async () => {
    seed();
    await mount();
    click('Spell It game mode');
    const input = host.querySelector('input[aria-label="Spell the symbol label"]');
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(input.disabled).toBe(false);
    expect(host.querySelector('[aria-label^="Score:"]').getAttribute('aria-label')).toContain('Score: 0, Round: 1');
  });
});


function seedTextBoard() {
  seed();
  localStorage.setItem('alloAACTapBehavior', JSON.stringify('compose-only'));
  localStorage.setItem('alloSymbolBoards__quest-profile', JSON.stringify([{
    id: 'text-board', title: 'Words without pictures', cols: 2,
    words: [
      { id: 'help', label: 'Help', image: null, category: 'verb' },
      { id: 'more', label: 'More', image: null, category: 'other' },
    ],
  }]));
}

describe('Symbol Studio AAC session resilience', () => {
  it('uses label-only words and keeps a new session from duplicating previous communication', async () => {
    vi.useFakeTimers();
    seedTextBoard();
    await mount({ initialTab: 'board' });
    click('Toggle saved boards gallery');
    click('Use board in AAC mode');
    const cells = host.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toContain('Help');
    expect(cells[0].querySelector('img')).toBeNull();
    act(() => cells[0].click());
    expect(host.querySelector('[aria-label^="Sentence strip"]').getAttribute('aria-label')).toContain('Help');
    click('Exit AAC mode');
    let usage = JSON.parse(localStorage.getItem('alloAACUsage__quest-profile'));
    expect(usage['quest-profile'].sessions).toHaveLength(1);
    expect(usage['quest-profile'].sessions[0].entries).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    click('Use board in AAC mode');
    expect(host.querySelector('[aria-label^="Sentence strip"]').getAttribute('aria-label')).toContain('empty');
    click('Exit AAC mode');
    usage = JSON.parse(localStorage.getItem('alloAACUsage__quest-profile'));
    expect(usage['quest-profile'].sessions).toHaveLength(1);
  });

  it('includes label-only words in automatic switch scanning', async () => {
    vi.useFakeTimers();
    seedTextBoard();
    await mount({ initialTab: 'board' });
    click('Toggle saved boards gallery');
    click('Start scanning mode');
    const dialog = host.querySelector('[aria-labelledby="ss-scan-title"]');
    expect(dialog.querySelector('[role="status"]').textContent).toContain('Help, Words without pictures (1 of 2)');
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(dialog.querySelector('[role="status"]').textContent).toContain('More, Words without pictures (2 of 2)');
  });
});
