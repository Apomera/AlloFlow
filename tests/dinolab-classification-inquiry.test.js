import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error('Missing bounded Dino Lab test section: ' + startMarker);
  return source.slice(start, end);
}
// Evaluate only the catalog, original clades, and pure classification section.
// No registration, rendering, WebGL, DOM, or event implementation is copied.
const api = new Function(
  section('  var DINOS = [', '  // ── Geologic periods') + '\n' +
  section('  var CLADES = [', '  // ── How we know:') + '\n' +
  section('var CLASSIFY_CASES = [', '  var NOTE_FIELDS = [') + '\n' +
  'return {DINOS,CLADES,CLASSIFY_CASES,CLASSIFICATION_BRANCHES,classificationBranch,classificationPath,classificationNodeForSpecies,classificationCase,classificationDraft,classificationReady,classificationEntry,classificationInquiryState,classificationHasWork,classificationNotebookText};'
)();
const tasks = api.CLASSIFY_CASES;
const bird = api.classificationCase('bird_branch');
const herbivore = api.classificationCase('herbivore_theropod');
const byId = id => api.DINOS.find(animal => animal.id === id);
const valid = (task, text = 'My explanation') => ({
  choice: task.answer, citations: [task.relevantEvidence[0]],
  explanation: text, limit: 'The simplified tree omits intermediate branches.', checked: true
});
const state = (task, entry) => api.classificationInquiryState({ caseId: task.id, cases: { [task.id]: entry } });
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('curated classification investigation integrity', () => {
  it('has six distinct cases with valid catalog species, answers, citations, target branches and sources', () => {
    expect(tasks).toHaveLength(6);
    expect(new Set(tasks.map(task => task.id)).size).toBe(6);
    const branchIds = new Set(api.CLASSIFICATION_BRANCHES.map(node => node.id));
    for (const task of tasks) {
      expect(branchIds.has(task.targetNode), task.id).toBe(true);
      expect(task.species.length, task.id).toBeGreaterThan(0);
      for (const id of task.species) expect(byId(id), task.id + ': ' + id).toBeDefined();
      expect(new Set(task.options.map(item => item.id)).size).toBe(task.options.length);
      expect(task.options.filter(item => item.id === task.answer)).toHaveLength(1);
      expect(new Set(task.evidence.map(item => item.id)).size).toBe(task.evidence.length);
      expect(task.relevantEvidence.length).toBeGreaterThan(0);
      for (const id of task.relevantEvidence) expect(task.evidence.some(item => item.id === id)).toBe(true);
      for (const item of task.evidence) expect(['classification', 'trait', 'limit']).toContain(item.kind);
      expect(task.evidence.some(item => !task.relevantEvidence.includes(item.id))).toBe(true);
      expect(task.limit.trim()).not.toBe('');
      const url = new URL(task.source.url);
      expect(url.protocol).toBe('https:');
      expect(['www.amnh.org', 'www.nhm.ac.uk']).toContain(url.hostname);
    }
  });

  it('keeps the browser source mirror identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n')).toBe(source);
  });
});

describe('classification eligibility and restored drafts', () => {
  it.each(tasks.map(task => [task.id, task]))('%s requires a checked supported choice, relevant citation and both writing fields', (_id, task) => {
    const good = valid(task);
    const normalize = raw => api.classificationEntry(raw, task);
    expect(api.classificationReady(normalize(good), task)).toBe(true);
    // One useful citation is sufficient; extra discussion is not mechanically graded.
    expect(api.classificationReady(normalize({ ...good, citations: [task.relevantEvidence[1]] }), task)).toBe(true);
    const wrong = task.options.find(item => item.id !== task.answer).id;
    const distractor = task.evidence.find(item => !task.relevantEvidence.includes(item.id)).id;
    for (const patch of [
      { choice: wrong }, { choice: '' }, { citations: [] }, { citations: [distractor] },
      { citations: ['forged'] }, { explanation: ' \n\t' }, { limit: ' \t' },
      { checked: false }, { checked: 'true' }
    ]) expect(api.classificationReady(normalize({ ...good, ...patch }), task), JSON.stringify(patch)).toBe(false);
  });

  it('recovers malformed roots and unknown case IDs without creating saved work', () => {
    for (const raw of [null, undefined, false, 42, 'bad', [], { caseId: 'missing', cases: [] }, { cases: { forged: valid(bird) } }]) {
      const restored = api.classificationInquiryState(raw);
      expect(restored.version).toBe(1);
      expect(restored.caseId).toBe(tasks[0].id);
      expect(Object.keys(restored.cases)).toEqual(tasks.map(task => task.id));
      for (const task of tasks) {
        expect(api.classificationHasWork(restored.cases[task.id])).toBe(false);
        expect(restored.cases[task.id]).toMatchObject({ choice: '', citations: [], checked: false, firstCheck: null, first: null, record: null });
      }
    }
    expect(api.classificationCase('__proto__')).toBe(tasks[0]);
  });

  it('bounds text, filters and deduplicates citations, and rejects forged records', () => {
    const raw = {
      choice: 'forged', citations: [bird.evidence[3].id, 'forged', bird.evidence[0].id, bird.evidence[0].id],
      explanation: 'x'.repeat(2000), limit: { text: 'not a string' }, checked: true,
      firstCheck: { choice: 'forged', citations: bird.relevantEvidence },
      first: { ...valid(bird), choice: 'forged' },
      record: { ...valid(bird), citations: ['feathered_wings'] }
    };
    const result = api.classificationEntry(raw, bird);
    expect(result.choice).toBe('');
    expect(result.checked).toBe(false);
    expect(result.citations).toEqual([bird.evidence[0].id, bird.evidence[3].id]);
    expect(result.explanation).toHaveLength(1500);
    expect(result.limit).toBe('');
    expect(result.firstCheck).toBeNull();
    expect(result.first).toBeNull();
    expect(result.record).toBeNull();
    expect(api.classificationDraft({ ...valid(bird), limit: 'z'.repeat(3000) }, bird).limit).toHaveLength(1500);
    for (const stage of ['first', 'record']) {
      for (const value of [null, [], 123, {}, { ...valid(bird), explanation: ' ' }, { ...valid(bird), limit: '' }]) {
        expect(api.classificationEntry({ [stage]: value }, bird)[stage]).toBeNull();
      }
    }
  });

  it('preserves first checked prediction, first explanation, latest record and a pending revision separately', () => {
    const wrong = bird.options.find(item => item.id !== bird.answer).id;
    const raw = deepFreeze({ caseId: bird.id, cases: { [bird.id]: {
      ...valid(bird, 'Pending revision'), checked: false,
      firstCheck: { choice: wrong, citations: ['feathered_wings'], explanation: 'Not part of the checked-choice snapshot' },
      first: valid(bird, 'First recorded wording'), record: valid(bird, 'Latest recorded wording')
    } } });
    const before = JSON.stringify(raw);
    const result = api.classificationInquiryState(raw).cases[bird.id];
    expect(result.firstCheck).toEqual({ choice: wrong, citations: ['feathered_wings'] });
    expect(result.first.explanation).toBe('First recorded wording');
    expect(result.record.explanation).toBe('Latest recorded wording');
    expect(result.explanation).toBe('Pending revision');
    expect(result.checked).toBe(false);
    expect(api.classificationReady(result, bird)).toBe(false);
    expect(result.first).not.toBe(result.record);
    expect(result.first.citations).not.toBe(result.record.citations);
    result.first.explanation = 'Changed normalized copy';
    result.record.citations.push('outside-data');
    result.firstCheck.citations.push('outside-data');
    expect(JSON.stringify(raw)).toBe(before);
    const reread = api.classificationInquiryState(raw).cases[bird.id];
    expect(reread.first.explanation).toBe('First recorded wording');
    expect(reread.record.citations).toEqual([bird.relevantEvidence[0]]);
  });

  it('retains independent known-case work across navigation and drops unknown saved cases', () => {
    const raw = { caseId: herbivore.id, cases: {
      [bird.id]: valid(bird, 'Bird reasoning'), [herbivore.id]: valid(herbivore, 'Diet reasoning'),
      invented: valid(bird, 'Forged task')
    } };
    const first = api.classificationInquiryState(raw);
    const switched = api.classificationInquiryState({ ...first, caseId: bird.id });
    expect(switched.caseId).toBe(bird.id);
    expect(switched.cases).toEqual(first.cases);
    expect(switched.cases.bird_branch.explanation).toBe('Bird reasoning');
    expect(switched.cases.herbivore_theropod.explanation).toBe('Diet reasoning');
    expect(switched.cases).not.toHaveProperty('invented');
    switched.cases.bird_branch.citations.length = 0;
    expect(switched.cases.herbivore_theropod.citations).toEqual([herbivore.relevantEvidence[0]]);
    expect(first.cases.bird_branch.citations).toEqual([bird.relevantEvidence[0]]);
  });
});

describe('classification notebook export', () => {
  it('exports each response stage, reference evidence and source without assessing learner writing', () => {
    const wrong = bird.options.find(item => item.id !== bird.answer);
    const text = api.classificationNotebookText({ cases: {
      [bird.id]: {
        ...valid(bird, 'Pending wording <not HTML>'), checked: false,
        firstCheck: { choice: wrong.id, citations: ['feathered_wings'] },
        first: valid(bird, 'First explanation'), record: valid(bird, 'Revised explanation')
      },
      [herbivore.id]: { ...valid(herbivore, 'Independent herbivore draft'), checked: false },
      unknown: { explanation: 'Do not export this task' }
    } });
    for (const phrase of [
      'First checked interpretation (not a mastery score):', 'First recorded explanation:',
      'Latest recorded explanation:', 'Current draft:', wrong.text,
      'First explanation', 'Revised explanation', 'Pending wording <not HTML>',
      bird.evidence.find(item => item.id === 'feathered_wings').text,
      bird.evidence.find(item => item.id === bird.relevantEvidence[0]).text,
      bird.question, bird.source.url, bird.limit, herbivore.source.url,
      'Independent herbivore draft', 'Writing is recorded without automatic assessment.'
    ]) expect(text).toContain(phrase);
    expect(text.match(/CLASSIFICATION INVESTIGATION \|/g)).toHaveLength(2);
    expect(text).not.toContain('Do not export this task');
  });

  it('exports meaningful partial work but no empty or forged-only activity', () => {
    for (const raw of [null, {}, { cases: { [bird.id]: { explanation: ' \n', limit: ' ' } } }, { cases: { unknown: valid(bird) } }]) {
      expect(api.classificationNotebookText(raw)).toBe('');
    }
    const partial = api.classificationNotebookText({ cases: { [bird.id]: { explanation: 'A question still to investigate' } } });
    expect(partial).toContain('Current draft:');
    expect(partial).toContain('Interpretation: Not selected');
    expect(partial).toContain('- None yet');
    expect(partial).not.toContain('First recorded explanation:');
    expect(api.classificationHasWork(state(bird, { firstCheck: { choice: 'bird_hipped', citations: [] } }).cases[bird.id])).toBe(true);
  });
});

describe('simplified tree membership', () => {
  it('contains twelve valid branches and keeps the outgroup outside Dinosauria', () => {
    expect(api.CLASSIFICATION_BRANCHES).toHaveLength(12);
    expect(api.CLADES).toHaveLength(8);
    const ids = new Set(api.CLASSIFICATION_BRANCHES.map(node => node.id));
    expect(ids.size).toBe(12);
    for (const node of api.CLASSIFICATION_BRANCHES) {
      if (node.parent) expect(ids.has(node.parent), node.id).toBe(true);
      const path = api.classificationPath(node.id);
      expect(new Set(path).size).toBe(path.length);
      expect(path.at(-1)).toBe(node.id);
      expect(path[0]).toBe(node.outside ? 'pterosauria' : 'dinosauria');
      for (const id of node.examples) expect(byId(id), node.id + ': ' + id).toBeDefined();
    }
    expect(api.classificationPath('birds')).toEqual(['dinosauria', 'saurischia', 'theropoda', 'maniraptora', 'birds']);
    expect(api.classificationPath('dromaeosauridae')).toEqual(['dinosauria', 'saurischia', 'theropoda', 'maniraptora', 'dromaeosauridae']);
    expect(api.classificationPath('pterosauria')).toEqual(['pterosauria']);
    expect(api.classificationBranch('pterosauria').outside).toBe(true);
    expect(api.classificationBranch('birds').examples).toEqual([]); // conceptual living-bird leaf
    expect(api.classificationPath('unknown')).toEqual(['dinosauria']);
    for (const node of api.CLADES) expect(api.classificationBranch(node.id).examples).not.toBe(node.examples);
  });

  it.each([
    ['archaeopteryx', 'theropoda'], ['therizinosaurus', 'maniraptora'],
    ['deinonychus', 'dromaeosauridae'], ['velociraptor', 'dromaeosauridae'],
    ['tyrannosaurus', 'theropoda'], ['brachiosaurus', 'sauropodomorpha'],
    ['apatosaurus', 'sauropodomorpha'], ['triceratops', 'marginocephalia'],
    ['stegosaurus', 'thyreophora'], ['ankylosaurus', 'thyreophora'],
    ['iguanodon', 'ornithopoda'], ['pteranodon', 'pterosauria']
  ])('%s links to the nearest depicted group %s', (id, node) => {
    expect(api.classificationNodeForSpecies(byId(id))).toBe(node);
  });
});

describe('classification English dynamic keys', () => {
  const required = new Map();
  for (const match of source.matchAll(/\bclt\('([^']+)',/g)) required.set('classify_' + match[1], null);
  for (const task of tasks) {
    const prefix = 'classify_case_' + task.id + '_';
    for (const field of ['title', 'question', 'limit']) required.set(prefix + field, task[field]);
    required.set(prefix + 'source', task.source.label);
    for (const item of task.options) {
      required.set(prefix + 'option_' + item.id + '_text', item.text);
      required.set(prefix + 'option_' + item.id + '_feedback', item.feedback);
    }
    for (const item of task.evidence) required.set(prefix + 'evidence_' + item.id, item.text);
  }
  for (const node of api.CLASSIFICATION_BRANCHES) {
    for (const field of ['name', 'meaning', 'blurb']) required.set('classify_' + node.id + '_' + field, node[field]);
  }
  it.each(['ui_strings.js', 'desktop/web-app/public/ui_strings.js'])('resolves current classification English keys in %s', path => {
    const strings = JSON.parse(readFileSync(path, 'utf8')).stem.dinolab;
    for (const [key, value] of required) {
      expect(typeof strings[key], key).toBe('string');
      expect(strings[key].trim(), key).not.toBe('');
      if (value !== null) expect(strings[key], key).toBe(value);
    }
  });
});
