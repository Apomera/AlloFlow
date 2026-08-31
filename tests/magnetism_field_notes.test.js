import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOOL_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js');
const physics = require(TOOL_PATH);

function notesSeed(extra = {}) {
  return Object.assign({
    tab: 'field', factIdx: 0, learningMode: 'guided', fieldView: '2d',
    notebookOpen: false, notebookTrials: [], missionId: 'power_path',
    missionStarted: false, missionPanelOpen: false, labFocus: false, labShellPanel: 'notes',
  }, extra);
}

function withNotesHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: notesSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  let result;
  try {
    result = callback(host, html);
  } catch (error) {
    host.remove();
    throw error;
  }
  if (result && typeof result.then === 'function') return result.finally(() => host.remove());
  host.remove();
  return result;
}

function mountInteractive(cfg, seed, announceToSR = () => {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR, awardXP: () => {},
      callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
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

describe('magnetism station-aware Field Notes', () => {
  it('provides Notice, Try It, and Connect cards for every station', () => {
    const expectedTabs = ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'];
    expect(Object.keys(physics.FIELD_NOTE_DEFS)).toEqual(expectedTabs);
    const notes = expectedTabs.flatMap((tab) => physics.FIELD_NOTE_DEFS[tab]);
    expect(notes).toHaveLength(30);
    expect(new Set(notes.map((note) => note.id)).size).toBe(30);
    expectedTabs.forEach((tab) => {
      expect(physics.FIELD_NOTE_DEFS[tab].map((note) => note.kind)).toEqual(['Notice', 'Try it', 'Connect']);
      expect(physics.FIELD_NOTE_DEFS[tab].every((note) => note.title && note.body && note.prompt)).toBe(true);
      expect(physics.FIELD_NOTE_DEFS[tab][2].targetTab).toBeTruthy();
    });
    const stationIds = new Set(physics.STATION_PASSPORT_DEFS.map((station) => station.id));
    notes.filter((note) => note.targetTab).forEach((note) => expect(stationIds.has(note.targetTab)).toBe(true));
  });

  it('restores and safely wraps legacy card indices without new state', () => {
    const first = physics.fieldNotesState(notesSeed({ factIdx: 0 }));
    expect(first).toMatchObject({ index: 0, number: 1, total: 3, previousIndex: 2, nextIndex: 1, progressPercent: 33 });
    expect(first.active).toMatchObject({ id: 'field_notice', kind: 'Notice' });
    expect(first.station).toMatchObject({ id: 'field', chapterId: 'fields' });

    expect(physics.fieldNotesState(notesSeed({ factIdx: 4 })).active.id).toBe('field_try');
    expect(physics.fieldNotesState(notesSeed({ factIdx: -1 })).active.id).toBe('field_connect');
    expect(physics.fieldNotesState(notesSeed({ factIdx: Number.NaN })).active.id).toBe('field_notice');

    const connection = physics.fieldNotesState(notesSeed({ factIdx: 2 }));
    expect(connection).toMatchObject({ index: 2, number: 3, progressPercent: 100 });
    expect(connection.targetStation).toMatchObject({ id: 'electro', label: 'Electromagnet' });
    expect(physics.fieldNotesState({ magnetism: notesSeed({ tab: 'earth', factIdx: 2 }) }).targetStation.id).toBe('maze');
  });

  it('renders a chapter-colored visual deck with direct card controls', () => {
    withNotesHost({}, (host, html) => {
      const deck = host.querySelector('[data-magnetism-field-notes="true"]');
      expect(deck).toBeTruthy();
      expect(deck.tagName).toBe('ASIDE');
      expect(deck.getAttribute('data-note-kind')).toBe('notice');
      expect(deck.querySelector('.mag-note-orbit svg')).toBeTruthy();
      expect(deck.querySelectorAll('.mag-note-dot')).toHaveLength(3);
      expect(deck.querySelectorAll('.mag-note-dot[aria-pressed="true"]')).toHaveLength(1);
      expect(deck.querySelectorAll('button[aria-label="Previous field note"]')).toHaveLength(1);
      expect(deck.querySelectorAll('button[aria-label="Next field note"]')).toHaveLength(1);
      expect(deck.querySelector('.mag-note-transfer')).toBeNull();
      expect(deck.querySelector('.mag-note-track span').style.width).toBe('33%');
      expect(deck.textContent).toContain('Field Notes · Field Explorer');
      expect(deck.textContent).toContain('The compass reads one point');
      expect(deck.textContent).toContain('Look closely:');
      expect(deck.textContent).toContain('1/3');
      expect(html.indexOf('Magnetism Expedition')).toBeLessThan(html.indexOf('data-magnetism-field-notes="true"'));
    });
  });

  it('supports next, direct-select, wrap, and cross-station transfer actions', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, notesSeed(), (message) => announcements.push(message));
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    try {
      let deck = live.host.querySelector('[data-magnetism-field-notes="true"]');
      click(deck.querySelector('button[aria-label="Next field note"]'));
      deck = live.host.querySelector('[data-magnetism-field-notes="true"]');
      expect(deck.getAttribute('data-note-kind')).toBe('try-it');
      expect(deck.textContent).toContain('Hold two controls still');
      expect(deck.textContent).toContain('2/3');

      click(deck.querySelector('button[aria-label^="Field note 3:"]'));
      deck = live.host.querySelector('[data-magnetism-field-notes="true"]');
      expect(deck.getAttribute('data-note-kind')).toBe('connect');
      expect(deck.textContent).toContain('Build the field with current');
      expect(deck.querySelector('.mag-note-transfer').textContent).toBe('Connect → Electromagnet');

      click(deck.querySelector('button[aria-label="Next field note"]'));
      deck = live.host.querySelector('[data-magnetism-field-notes="true"]');
      expect(deck.textContent).toContain('The compass reads one point');
      click(deck.querySelector('button[aria-label^="Field note 3:"]'));
      click(live.host.querySelector('.mag-note-transfer'));

      expect(live.host.querySelector('#mag-tab-electro').getAttribute('aria-selected')).toBe('true');
      deck = live.host.querySelector('[data-magnetism-field-notes="true"]');
      expect(deck.textContent).toContain('Field Notes · Electromagnet');
      expect(deck.textContent).toContain('Turns and current act together');
      expect(deck.textContent).toContain('1/3');
      expect(announcements).toEqual([
        'Field note 2 of 3: Hold two controls still.',
        'Field note 3 of 3: Build the field with current.',
        'Field note 1 of 3: The compass reads one point.',
        'Field note 3 of 3: Build the field with current.',
        'Connection opened: Electromagnet station.',
      ]);
    } finally {
      live.close();
    }
  });

  it('adapts the orbit and controls on narrow screens with no automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:560px){.mag-root .mag-field-notes{grid-template-columns:64px minmax(0,1fr)');
    expect(source).toContain('@media(max-width:390px){.mag-root .mag-field-notes{grid-template-columns:1fr}');
    expect(source).toContain('.mag-root .mag-note-orbit{display:none}');
    expect(source).toContain('@keyframes mag-note-arrive');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    await withNotesHost({ tab: 'earth', factIdx: 2, earthSeen: true }, async (host) => {
      const deck = host.querySelector('[data-magnetism-field-notes="true"]');
      expect(deck.getAttribute('data-note-kind')).toBe('connect');
      expect(deck.querySelector('.mag-note-transfer').textContent).toBe('Connect → Field Walk');
      const results = await axe.run(deck, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
