import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The tool ADVERTISES its shortcuts twice — in the region's accessible name ("1 through 6 select a
// stage, G starts or stops the Guided Walkthrough, J toggles Journey mode, R U P choose your
// journey path, Escape exits Focus Canvas mode") and in `aria-keyshortcuts`. A screen-reader user
// is told those keys exist and will try them.
//
// What existed before was a source pin: the Escape branch is present, and the aria-keyshortcuts
// string equals a literal. That catches an edited string. It cannot catch the failure that matters
// — a key ANNOUNCED but not HANDLED, or handled but no longer announced — because the announcement
// and the handler are pinned separately and never compared. This repo has shipped that class
// before: three Migration controls that took focus and did nothing.
//
// So this suite RUNS the shipped handler. It reads the announced list out of `aria-keyshortcuts`,
// slices the real `onWcKey` out of the source, and fires every announced key at it with stub
// collaborators, asserting each one actually did something. Nothing here restates the key list: if
// a seventh shortcut is announced tomorrow, this suite demands it work.
const PATHS = [
  resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'),
  resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'),
];
const src = readFileSync(PATHS[0], 'utf8');

// The announcement is the contract; read it rather than repeat it.
function announcedKeys(text) {
  const m = /"aria-keyshortcuts": "([^"]+)"/.exec(text);
  expect(m, 'aria-keyshortcuts must be present — it is what tells a user the keys exist').toBeTruthy();
  return m[1].trim().split(/\s+/);
}

function buildHandler(overrides) {
  const start = src.indexOf('          function onWcKey(e) {');
  const end = src.indexOf('\n          }', start) + '\n          }'.length;
  expect(start, 'onWcKey present').toBeGreaterThan(-1);
  const calls = [];
  const record = (name) => (...args) => { calls.push({ name, args }); };
  const env = {
    STAGES: [
      { id: 'evaporation', label: 'Evaporation' }, { id: 'condensation', label: 'Condensation' },
      { id: 'precipitation', label: 'Precipitation' }, { id: 'collection', label: 'Collection' },
      { id: 'transpiration', label: 'Transpiration' }, { id: 'infiltration', label: 'Infiltration' },
    ],
    announceToSR: record('announce'),
    chooseJourneyPath: record('chooseJourneyPath'),
    selectStage: record('selectStage'),
    toggleWcFocusMode: record('toggleWcFocusMode'),
    toggleWcWalkthrough: record('toggleWcWalkthrough'),
    upd: record('upd'),
    // Journey running AND at the ground fork, so R/U/P are live; focus mode on so Escape is live.
    d: { journeyActive: true, journeyState: 'ground_choice', journeyLoops: 0, journeyPaths: {} },
    wcFocusMode: true,
    document: { getElementById: () => null },
    ...overrides,
  };
  const names = Object.keys(env);
  // eslint-disable-next-line no-new-func
  const factory = new Function(...names, src.slice(start, end) + '\nreturn onWcKey;');
  return { handler: factory(...names.map((n) => env[n])), calls, env };
}

function press(key, overrides) {
  const { handler, calls } = buildHandler(overrides);
  let prevented = false;
  handler({ key, target: {}, preventDefault: () => { prevented = true; } });
  return { prevented, calls };
}

describe('Water Cycle keyboard shortcuts', () => {
  it('handles every key it announces in aria-keyshortcuts', () => {
    const keys = announcedKeys(src);
    expect(keys.length, 'expected a real shortcut list').toBeGreaterThan(5);
    const unhandled = [];
    for (const key of keys) {
      // A digit is announced as itself; letters are announced uppercase but must work either case.
      const variants = /^[A-Z]$/.test(key) ? [key, key.toLowerCase()] : [key];
      for (const variant of variants) {
        const { prevented, calls } = press(variant);
        if (!prevented || calls.length === 0) unhandled.push(variant);
      }
    }
    expect(unhandled, 'announced but not handled: ' + unhandled.join(', ')).toEqual([]);
  });

  it('selects the matching stage for each announced digit', () => {
    for (const [digit, id] of [['1', 'evaporation'], ['3', 'precipitation'], ['6', 'infiltration']]) {
      const { calls } = press(digit);
      const selected = calls.find((c) => c.name === 'selectStage');
      expect(selected, 'digit ' + digit + ' selected no stage').toBeTruthy();
      expect(selected.args[0]).toBe(id);
    }
  });

  it('maps R, U and P to the three journey paths', () => {
    for (const [key, path] of [['r', 'runoff'], ['u', 'infiltrate'], ['p', 'plant']]) {
      const { calls } = press(key);
      const chose = calls.find((c) => c.name === 'chooseJourneyPath');
      expect(chose, key + ' chose no path').toBeTruthy();
      expect(chose.args[0]).toBe(path);
    }
  });

  it('leaves typing alone', () => {
    // Every one of these keys is a plain character, so a shortcut that fires while someone is
    // typing into a field would eat their input.
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      const { handler } = buildHandler();
      let prevented = false;
      handler({ key: 'j', target: { tagName }, preventDefault: () => { prevented = true; } });
      expect(prevented, tagName + ' swallowed a keystroke meant for the field').toBe(false);
    }
    const { handler } = buildHandler();
    let prevented = false;
    handler({ key: 'g', target: { isContentEditable: true }, preventDefault: () => { prevented = true; } });
    expect(prevented, 'contenteditable swallowed a keystroke').toBe(false);
  });

  it('offers the path keys only at the fork, so they cannot fire meaninglessly', () => {
    const idle = press('r', { d: { journeyActive: false, journeyState: 'idle' } });
    expect(idle.calls.find((c) => c.name === 'chooseJourneyPath')).toBeFalsy();
    const midJourney = press('r', { d: { journeyActive: true, journeyState: 'ocean' } });
    expect(midJourney.calls.find((c) => c.name === 'chooseJourneyPath')).toBeFalsy();
  });

  it('ships the same handler and the same announcement in both copies', () => {
    expect(readFileSync(PATHS[0], 'utf8')).toBe(readFileSync(PATHS[1], 'utf8'));
    // The prose the user hears and the machine-readable list must name the same keys.
    const spoken = /Keyboard shortcuts: ([^"']+)/.exec(src);
    expect(spoken, 'the spoken shortcut sentence must exist').toBeTruthy();
    // Digits are spoken as a RANGE ("1 through 6"), which is better prose than reciting six
    // numbers, so a digit counts as named when the range covers it.
    const range = /(\d)\s*through\s*(\d)/.exec(spoken[1]);
    for (const key of announcedKeys(src)) {
      if (key === 'Escape') { expect(spoken[1]).toContain('Escape'); continue; }
      if (/^\d$/.test(key) && range && Number(key) >= Number(range[1]) && Number(key) <= Number(range[2])) continue;
      expect(spoken[1], 'aria-keyshortcuts lists ' + key + ' but the spoken name never mentions it')
        .toMatch(new RegExp('(^|[^A-Za-z])' + key + '([^A-Za-z]|$)'));
    }
  });
});
