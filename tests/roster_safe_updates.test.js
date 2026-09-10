import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const source = readFileSync('teacher_source.jsx', 'utf8');
const NEW_ID = 'LRN-11111111-1111-4111-8111-111111111111';
let api, React, createRoot, act, root, container, liveRoster, editRoster, queueEdit;
const clone = value => JSON.parse(JSON.stringify(value));

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('teacher_module.js');
  api = window.AlloModules.RosterIdentityInternals;
});

function baseRoster() {
  const roster = api.normalizeRosterImport({
    classId: 'CLS-fictional', className: 'Fictional class',
    groups: { blue: { name: 'Blue', color: '#4F46E5', profile: { readingLevel: 'Grade 3', dyslexiaFriendly: true } } },
    students: { 'Calm Otter': 'blue', 'Quiet Owl': '' },
    learnerIds: { 'Calm Otter': 'LRN-calm', 'Quiet Owl': 'LRN-quiet' },
    learnerPreferences: { 'LRN-calm': { readingTheme: 'warm' }, 'LRN-quiet': { readingTheme: 'blue' } },
    progressHistory: { 'Quiet Owl': [{ sessionId: 'fictional-session', groupId: 'blue', responseCount: 2 }] },
    sessionHistory: [{ id: 'fictional-session', participants: { 'Quiet Owl': { responseCount: 2 } } }],
    seating: {
      activeLayoutId: 'layout1', solveSeed: 2,
      layouts: { layout1: { id: 'layout1', name: 'Main room', seats: [{ id: 'seat1', x: 5, y: 6, w: 10, h: 7 }], furniture: [], assignments: { seat1: 'Quiet Owl' } } },
      constraints: [{ id: 'c1', type: 'front_row', students: ['Quiet Owl'] }],
      history: [{ at: '2026-08-01T10:00:00.000Z', layoutId: 'layout1', layoutName: 'Main room' }],
    },
    submissionKey: { classId: 'CLS-fictional', keyId: 'KEY-fictional', publicJwk: { kty: 'RSA', n: 'abcdefghijklmnop', e: 'AQAB', key_ops: ['encrypt'] } },
    classGoals: [{ id: 'goal-1', label: 'Ready', team: 'class' }],
    classGoalLog: [{ goalId: 'goal-1', label: 'Ready', delivered: 1, at: 1000 }],
  });
  roster.futurePublicSettings = { rubric: ['participation', 'reflection'], enabled: true };
  roster.groups.blue.futurePublicGroupSetting = { retained: true };
  return roster;
}

function updateFile(base = baseRoster()) {
  return {
    exportVersion: 4, classId: base.classId, className: 'Ignored incoming class title',
    groups: { blue: { name: 'Ignored incoming group', color: '#000000', profile: {} } },
    students: { 'Calm Otter': '', 'Brave Fox': 'blue' },
    learnerIds: { 'Calm Otter': 'LRN-calm', 'Brave Fox': NEW_ID },
    learnerPreferences: { 'LRN-calm': { readingTheme: 'dark' } },
    progressHistory: {}, sessionHistory: [], seating: {}, classGoals: [], classGoalLog: [],
    submissionKey: { classId: base.classId, publicJwk: { kty: 'RSA', n: 'differentfictionalkey', e: 'AQAB' } },
  };
}

describe('safe roster update planning in the shipped teacher module', () => {
  it('adds only explicit new identities and preserves every current field and withdrawn learner record', () => {
    const base = baseRoster(), before = clone(base), input = updateFile(base), originalInput = clone(input);
    const preview = api.planRosterUpdate(base, input);
    expect(preview.canApply).toBe(true);
    expect(preview.matches).toEqual([{ codename: 'Calm Otter', learnerId: 'LRN-calm' }]);
    expect(preview.additions).toEqual([{ codename: 'Brave Fox', learnerId: NEW_ID }]);
    expect(preview.retainedAbsences).toEqual([{ codename: 'Quiet Owl', learnerId: 'LRN-quiet' }]);
    const candidate = api.applyRosterUpdate(preview, base);
    const expected = clone(base);
    expected.students['Brave Fox'] = '';
    expected.learnerIds['Brave Fox'] = NEW_ID;
    expect(candidate).toEqual(expected);
    expect(base).toEqual(before);
    expect(input).toEqual(originalInput);
    expect(candidate.futurePublicSettings).not.toBe(base.futurePublicSettings);
    expect(candidate.progressHistory['Quiet Owl']).not.toHaveLength(0);
    expect(candidate.sessionHistory).not.toHaveLength(0);
    expect(candidate.seating.layouts.layout1.assignments.seat1).toBe('Quiet Owl');
    expect(candidate.classGoals).not.toHaveLength(0);
    expect(candidate.classGoalLog).not.toHaveLength(0);
    expect(JSON.stringify(candidate)).not.toContain('Ignored incoming');
  });

  it('is idempotent across repeated files and retains everyone for an empty membership snapshot', () => {
    const base = baseRoster(), input = updateFile(base);
    const candidate = api.applyRosterUpdate(api.planRosterUpdate(base, input), base);
    const repeat = api.planRosterUpdate(candidate, input);
    expect(repeat.additions).toEqual([]);
    expect(api.applyRosterUpdate(repeat, candidate)).toEqual(candidate);
    const empty = { ...input, students: {}, learnerIds: {} };
    const absent = api.planRosterUpdate(candidate, empty);
    expect(absent.retainedAbsences).toHaveLength(3);
    expect(api.applyRosterUpdate(absent, candidate)).toEqual(candidate);
  });

  it.each([
    ['different class', input => { input.classId = 'CLS-other'; }, 'CLASS_MISMATCH'],
    ['changed existing ID', input => { input.learnerIds['Calm Otter'] = 'LRN-different'; }, 'LEARNER_ID_CHANGED'],
    ['renamed existing learner', input => { input.students['Calm Bear'] = ''; input.learnerIds['Calm Bear'] = input.learnerIds['Calm Otter']; delete input.students['Calm Otter']; delete input.learnerIds['Calm Otter']; }, 'CODENAME_CHANGED'],
    ['equivalent codename with another ID', input => { delete input.students['Calm Otter']; delete input.learnerIds['Calm Otter']; input.students['CALM-otter'] = ''; input.learnerIds['CALM-otter'] = 'LRN-other'; }, 'LEARNER_ID_CHANGED'],
    ['raw source ID for a new learner', input => { input.learnerIds['Brave Fox'] = '123456789012345678'; }, 'NEW_ID_NOT_OPAQUE'],
  ])('blocks %s without changing current state', (_label, mutate, code) => {
    const base = baseRoster(), input = updateFile(base), before = clone(base);
    mutate(input);
    const preview = api.planRosterUpdate(base, input);
    expect(preview.conflicts.some(conflict => conflict.code === code)).toBe(true);
    expect(preview.canApply).toBe(false);
    expect(() => api.applyRosterUpdate(preview, base)).toThrow(/conflicts/);
    expect(base).toEqual(before);
  });

  it.each([
    ['missing ID', input => { delete input.learnerIds['Calm Otter']; }],
    ['duplicate ID', input => { input.learnerIds['Brave Fox'] = 'LRN-calm'; }],
    ['extra ID', input => { input.learnerIds['Unused Owl'] = 'LRN-unused'; }],
    ['equivalent spelling', input => { input.students['calm-otter'] = ''; input.learnerIds['calm-otter'] = 'LRN-other'; }],
    ['invalid group', input => { input.students['Brave Fox'] = 'missing'; }],
    ['missing version', input => { delete input.exportVersion; }],
    ['Google record', input => { input.courseId = 'fictional-google-course'; }],
    ['legacy identity map', input => { input.displayNames = { 'Calm Otter': 'Fictional Name' }; }],
    ['nested credential', input => { input.groups.blue.profile.access_token = 'fictional-token'; }],
    ['nested Google ID', input => { input.groups.blue.profile.userId = 'fictional-user'; }],
  ])('rejects %s instead of repairing identities silently', (_label, mutate) => {
    const base = baseRoster(), input = updateFile(base), before = clone(base);
    mutate(input);
    expect(() => api.planRosterUpdate(base, input)).toThrow();
    expect(base).toEqual(before);
  });

  it.each([
    ['history', base => { base.progressHistory['Quiet Owl'][0].responseCount++; }],
    ['preferences', base => { base.learnerPreferences['LRN-calm'].readingTheme = 'blue'; }],
    ['seating', base => { base.seating.solveSeed++; }],
    ['future public field', base => { base.futurePublicSettings.enabled = false; }],
    ['class name', base => { base.className = 'Edited class'; }],
  ])('rejects a stale preview after a %s edit', (_label, mutate) => {
    const base = baseRoster(), preview = api.planRosterUpdate(base, updateFile(base));
    mutate(base);
    const latest = clone(base);
    expect(() => api.applyRosterUpdate(preview, base)).toThrow(/changed after this preview/);
    expect(base).toEqual(latest);
    expect(base.students).not.toHaveProperty('Brave Fox');
  });

  it('uses a complete canonical base snapshot, ignores key order, and keeps private plan data out of previews', () => {
    const base = baseRoster(), input = updateFile(base), preview = api.planRosterUpdate(base, input);
    const reordered = Object.fromEntries(Object.entries(base).reverse());
    expect(api.applyRosterUpdate(preview, reordered).learnerIds['Brave Fox']).toBe(NEW_ID);
    input.learnerIds['Brave Fox'] = 'LRN-tampered';
    expect(api.applyRosterUpdate(preview, base).learnerIds['Brave Fox']).toBe(NEW_ID);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.additions[0])).toBe(true);
    expect(preview).not.toHaveProperty('candidateSnapshot');
    expect(preview).not.toHaveProperty('baseSnapshot');
    expect(() => api.applyRosterUpdate(clone(preview), base)).toThrow(/no longer available/);
  });

  it('cancels without changing the roster and rejects cancelled confirmation', () => {
    const base = baseRoster(), before = clone(base), preview = api.planRosterUpdate(base, updateFile(base));
    api.cancelRosterUpdate(preview);
    expect(() => api.applyRosterUpdate(preview, base)).toThrow(/no longer available/);
    expect(base).toEqual(before);
  });

  it('rejects cycles, unsupported values, oversize files and a total above 500 retained learners', () => {
    const base = baseRoster(), input = updateFile(base);
    const cyclic = updateFile(base); cyclic.groups.blue.profile.cycle = cyclic;
    expect(() => api.planRosterUpdate(base, cyclic)).toThrow(/complete JSON/);
    expect(() => api.planRosterUpdate({ ...base, unsupported: undefined }, input)).toThrow(/complete JSON/);
    expect(() => api.planRosterUpdate(base, { ...input, className: 'x'.repeat(2 * 1024 * 1024) })).toThrow(/2 MB/);
    const full = baseRoster();
    for (let index = 2; index < 500; index++) { full.students['Bright Bear ' + index] = ''; full.learnerIds['Bright Bear ' + index] = 'LRN-existing-' + index; }
    expect(api.planRosterUpdate(full, input).conflicts.some(item => item.code === 'CLASS_SIZE_LIMIT')).toBe(true);
  });

  it('survives actual identity normalization and preserves fields that replacement import drops', () => {
    const base = baseRoster(), candidate = api.applyRosterUpdate(api.planRosterUpdate(base, updateFile(base)), base);
    expect(api.ensureRosterIdentity(candidate)).toEqual(candidate);
    const normalizedImport = api.normalizeRosterImport(candidate);
    expect(normalizedImport.learnerIds).toEqual(candidate.learnerIds);
    expect(normalizedImport).not.toHaveProperty('futurePublicSettings');
    expect(candidate.futurePublicSettings).toEqual(base.futurePublicSettings);
  });
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  queueEdit = false;
  vi.stubGlobal('FileReader', class {
    readAsText(file) { this.onload({ target: { result: file.text } }); }
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
});

async function mountRoster() {
  function Host() {
    const [roster, setRoster] = React.useState(baseRoster);
    liveRoster = roster;
    editRoster = setRoster;
    const guardedSetter = React.useCallback(next => {
      if (queueEdit && typeof next === 'function') {
        queueEdit = false;
        setRoster(current => next({ ...current, className: 'Queued edit' }));
      } else setRoster(next);
    }, []);
    return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: true, onClose() {}, rosterKey: roster, setRosterKey: guardedSetter, t: key => key });
  }
  root = createRoot(container);
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Host))));
}
function button(text) { return [...container.querySelectorAll('button')].find(item => item.textContent.trim() === text); }
async function click(element) { await act(async () => element.click()); }
async function upload(input = updateFile(liveRoster), size) {
  const element = container.querySelector('input[aria-label="Choose same-class roster update JSON"]');
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  Object.defineProperty(element, 'files', { configurable: true, value: [{ text, size: size ?? new TextEncoder().encode(text).byteLength }] });
  await act(async () => element.dispatchEvent(new Event('change', { bubbles: true })));
}

describe('actual RosterKeyPanel safe update workflow', () => {
  it('renders the real entry point, explicit replacement path, and a no-data Classroom helper link', async () => {
    await mountRoster();
    expect(button('Update roster safely')).toBeTruthy();
    expect(button('Import / replace roster')).toBeTruthy();
    const link = [...container.querySelectorAll('a')].find(item => item.textContent === 'Google Classroom setup');
    expect(link.href).toBe('https://alloflow-cdn.pages.dev/classroom-import.html');
    expect(link.rel).toContain('noopener');
    expect(readFileSync('teacher_module.js', 'utf8')).toBe(readFileSync('desktop/web-app/public/teacher_module.js', 'utf8'));
  });

  it('previews concrete IDs, requires review, applies only additions and offers recovery', async () => {
    await mountRoster();
    const before = clone(liveRoster);
    await upload();
    const preview = container.querySelector('[aria-labelledby="roster-update-preview-title"]');
    expect(preview.textContent).toContain(NEW_ID);
    expect(preview.textContent).toContain('Quiet Owl');
    expect(document.activeElement).toBe(preview);
    expect(liveRoster).toEqual(before);
    expect(button('Confirm safe update').disabled).toBe(true);
    await click(preview.querySelector('input[type="checkbox"]'));
    await click(button('Confirm safe update'));
    expect(liveRoster.students['Brave Fox']).toBe('');
    expect(liveRoster.students['Quiet Owl']).toBe('');
    expect(liveRoster.progressHistory).toEqual(before.progressHistory);
    expect(liveRoster.futurePublicSettings).toEqual(before.futurePublicSettings);
    expect(container.textContent).toContain('Roster updated: 1 codenames added.');
    expect(button('Restore previous roster')).toBeTruthy();
    expect(container.querySelector('[aria-labelledby="roster-update-preview-title"]')).toBeNull();
  });

  it('cancel and identity conflicts make no roster changes', async () => {
    await mountRoster();
    const before = clone(liveRoster);
    await upload();
    await click(button('Cancel update'));
    expect(liveRoster).toEqual(before);
    expect(button('Restore previous roster')).toBeUndefined();
    const conflict = updateFile(liveRoster); conflict.classId = 'CLS-other';
    await upload(conflict);
    expect(button('Confirm safe update').disabled).toBe(true);
    expect(container.textContent).toContain('different class');
    expect(liveRoster).toEqual(before);
  });

  it('rejects a preview after a real roster edit', async () => {
    await mountRoster();
    await upload();
    await click(container.querySelector('[aria-labelledby="roster-update-preview-title"] input[type="checkbox"]'));
    await act(async () => editRoster(current => ({ ...current, className: 'Edited after preview' })));
    await click(button('Confirm safe update'));
    expect(liveRoster.className).toBe('Edited after preview');
    expect(liveRoster.students).not.toHaveProperty('Brave Fox');
    expect(container.textContent).toContain('changed after this preview');
    expect(button('Restore previous roster')).toBeUndefined();
  });

  it('rechecks queued React state and reports a refused commit instead of success', async () => {
    await mountRoster();
    await upload();
    await click(container.querySelector('[aria-labelledby="roster-update-preview-title"] input[type="checkbox"]'));
    queueEdit = true;
    await click(button('Confirm safe update'));
    expect(liveRoster.className).toBe('Queued edit');
    expect(liveRoster.students).not.toHaveProperty('Brave Fox');
    expect(container.textContent).toContain('changed before the update could be applied');
    expect(container.textContent).not.toContain('Roster updated:');
  });

  it('rejects malformed and oversized files before any preview or roster mutation', async () => {
    await mountRoster();
    const before = clone(liveRoster);
    await upload('{');
    expect(container.textContent).toContain('not valid roster JSON');
    await upload('{}', 2 * 1024 * 1024 + 1);
    expect(container.textContent).toContain('2 MB safety limit');
    expect(container.querySelector('[aria-labelledby="roster-update-preview-title"]')).toBeNull();
    expect(liveRoster).toEqual(before);
    expect(source).toContain('setRosterKey(current => {');
  });

  it('ignores an older file read when a later selection finishes first', async () => {
    const reads = [];
    vi.stubGlobal('FileReader', class {
      readAsText(file) { this.text = file.text; reads.push(this); }
    });
    await mountRoster();
    const before = clone(liveRoster), earlier = updateFile(liveRoster), later = updateFile(liveRoster);
    later.students = { 'Calm Otter': '', 'Bright Bear': '' };
    later.learnerIds = { 'Calm Otter': 'LRN-calm', 'Bright Bear': 'LRN-22222222-2222-4222-8222-222222222222' };
    await upload(earlier);
    await upload(later);
    await act(async () => reads[1].onload({ target: { result: reads[1].text } }));
    await act(async () => reads[0].onload({ target: { result: reads[0].text } }));
    const preview = container.querySelector('[aria-labelledby="roster-update-preview-title"]');
    expect(preview.textContent).toContain('Bright Bear');
    expect(preview.textContent).not.toContain('Brave Fox');
    expect(liveRoster).toEqual(before);
  });
});
