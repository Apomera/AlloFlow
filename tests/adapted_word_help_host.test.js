import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Host callbacks for word help on ADAPTED texts (2026-09-24), run from the real
// handler source in AlloFlowANTI.txt, as tests/novak_gloss_host_callbacks does.
// Mutation runs point this at a scratch copy so a mutant never reaches the shared source.
const ANTI = resolve(process.env.ADAPTED_HELP_ANTI || 'AlloFlowANTI.txt');
let api;
beforeAll(() => {
  if (process.env.ADAPTED_HELP_CONTRACT) new Function(readFileSync(process.env.ADAPTED_HELP_CONTRACT, 'utf8'))(); else loadAlloModule('instructional_context_module.js');
  api = window.AlloModules.InstructionalContext;
});
const PASSAGE = 'The heron walked slowly in the shallow water.';
function fixture() {
  const original = api.createSupportedReading(api.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron' });
  const adapted = { id: 'adapted-1', type: 'simplified', data: PASSAGE + '\n\n--- ENGLISH TRANSLATION ---\n\nEnglish.', instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', config: { language: 'English', grade: '3' } };
  return { original, adapted };
}
function harness(rows, generate = vi.fn(), teacher = true) {
  const stateRef = { current: { history: rows, generatedContent: rows[0], isTeacherMode: teacher } };
  const source = readFileSync(ANTI, 'utf8');
  const from = source.indexOf('  const handleUpdateReadingSupports =');
  const to = source.indexOf('  const getFilteredHistory =', from);
  const onUpdateResource = (id, updater) => {
    const current = stateRef.current.history.find(row => row.id === id);
    if (!current) return false;
    const updated = updater(current);
    if (!updated || updated === current) return false;
    stateRef.current.history = stateRef.current.history.map(row => row.id === id ? updated : row);
    return true;
  };
  window.AlloModules.GenDispatcher = { generateReadingSupports: generate };
  const callbacks = new Function('window', '_resourceMutationStateRef', 'onUpdateResource', 'callGemini', 'cleanJson', 'gradeLevel', 'leveledTextLanguage',
    source.slice(from, to) + '\nreturn { edit: handleUpdateReadingSupports, generate: handleGenerateReadingSupports };')(window, stateRef, onUpdateResource, vi.fn(), vi.fn(), '5', 'English');
  return { ...callbacks, stateRef, row: id => stateRef.current.history.find(row => row.id === id) };
}
const at = (quote, extra = {}) => { const start = PASSAGE.indexOf(quote); return { id: 'a-' + start, start, end: start + quote.length, quote, text: 'Meaning of ' + quote, ...extra }; };

describe('adapted word help host callbacks', () => {
  it('saves teacher word help on the adapted text only', () => {
    const { original, adapted } = fixture();
    const h = harness([adapted, original]);
    const saved = h.edit(adapted, { type: 'upsert', annotation: at('shallow', { text: 'Not deep.' }) });
    expect(saved).toMatchObject({ shown: false, annotations: [{ quote: 'shallow', text: 'Not deep.', origin: 'educator' }] });
    expect(h.row('adapted-1').adaptedReadingSupports).toEqual(saved);
    expect(h.row('adapted-1').readingSupports).toBeUndefined();
    expect(h.row('adapted-1').data).toBe(adapted.data);
    expect(h.row('orig')).toBe(original);
  });

  it('shows and hides word help for students', () => {
    const { adapted } = fixture();
    const h = harness([adapted]);
    h.edit(adapted, { type: 'upsert', annotation: at('heron') });
    expect(h.edit(h.row('adapted-1'), { type: 'show', shown: true }).shown).toBe(true);
    expect(h.row('adapted-1').adaptedReadingSupports.shown).toBe(true);
    expect(h.edit(h.row('adapted-1'), { type: 'show', shown: false }).shown).toBe(false);
  });

  it('starts over on the current passage after an edit left word help stale', () => {
    const { adapted } = fixture();
    const h = harness([adapted]);
    h.edit(adapted, { type: 'upsert', annotation: at('heron') });
    h.edit(h.row('adapted-1'), { type: 'show', shown: true });
    const edited = { ...h.row('adapted-1'), data: 'A heron stood in the pond.' };
    h.stateRef.current.history = [edited];
    expect(api.validateAdaptedReadingSupports(edited, edited.adaptedReadingSupports).status).toBe('stale');
    expect(() => h.edit(edited, { type: 'upsert', annotation: { id: 'p', start: 21, end: 25, quote: 'pond', text: 'Small lake.' } })).toThrow(/adapted text changed/);
    const cleared = h.edit(edited, { type: 'clear' });
    expect(cleared).toMatchObject({ shown: false, annotations: [], passageLength: edited.data.length });
    const saved = h.edit(h.row('adapted-1'), { type: 'upsert', annotation: { id: 'p', start: 21, end: 25, quote: 'pond', text: 'Small lake.' } });
    expect(saved.annotations.map(entry => entry.quote)).toEqual(['pond']);
  });

  it('keeps the explanations that still match after an edit', () => {
    const { adapted } = fixture();
    const h = harness([adapted]);
    h.edit(adapted, { type: 'upsert', annotation: at('heron') });
    h.edit(h.row('adapted-1'), { type: 'upsert', annotation: at('slowly') });
    const edited = { ...h.row('adapted-1'), data: 'The heron walked quickly in the shallow water.' };
    h.stateRef.current.history = [edited];
    const kept = h.edit(edited, { type: 'rebase' });
    expect(kept.annotations.map(entry => entry.quote)).toEqual(['heron']);
    expect(h.row('adapted-1').adaptedReadingSupports).toEqual(kept);
  });

  it('adds explanations from the original for words the adapted text kept', () => {
    const { adapted } = fixture();
    const h = harness([adapted]);
    const saved = h.edit(adapted, { type: 'import', annotations: [{ id: 'o', start: 0, end: 5, quote: 'heron', text: 'A wading bird.', origin: 'educator' }, { id: 'm', start: 9, end: 14, quote: 'marsh', text: 'Wet land.' }] });
    expect(saved.annotations.map(entry => [entry.quote, entry.text])).toEqual([['heron', 'A wading bird.']]);
    expect(h.row('adapted-1').adaptedReadingSupports).toEqual(saved);
  });

  it('is for teachers only', () => {
    const { adapted } = fixture();
    const h = harness([adapted], vi.fn(), false);
    expect(() => h.edit(adapted, { type: 'upsert', annotation: at('heron') })).toThrow(/teacher mode/);
    return expect(h.generate(adapted)).rejects.toThrow(/teacher mode/);
  });

  it('generates suggestions from the adapted passage and keeps teacher edits', async () => {
    const { adapted } = fixture();
    const generate = vi.fn(async (snapshot) => api.validateReadingSupports(snapshot, [
      { id: 'g1', start: PASSAGE.indexOf('heron'), end: PASSAGE.indexOf('heron') + 5, quote: 'heron', text: 'AI heron' },
      { id: 'g2', start: PASSAGE.indexOf('shallow'), end: PASSAGE.indexOf('shallow') + 7, quote: 'shallow', text: 'AI shallow' },
    ]));
    const h = harness([adapted], generate);
    h.edit(adapted, { type: 'upsert', annotation: at('heron', { text: 'Teacher heron' }) });
    const merged = await h.generate(h.row('adapted-1'));
    // Suggestions come from the ADAPTED passage - not the original, not the translation.
    expect(generate.mock.calls[0][0].text).toBe(PASSAGE);
    expect(generate.mock.calls[0][1]).toMatchObject({ gradeLevel: '3', language: 'English', purpose: 'adapted' });
    expect(merged.annotations.map(entry => [entry.quote, entry.text])).toEqual([['heron', 'Teacher heron'], ['shallow', 'AI shallow']]);
    expect(h.row('adapted-1').adaptedReadingSupports).toEqual(merged);
  });

  it('makes the first suggestions for an adapted text with no word help yet', async () => {
    const { adapted } = fixture();
    const h = harness([adapted], vi.fn(async (snapshot) => api.validateReadingSupports(snapshot, [
      { id: 'g1', start: PASSAGE.indexOf('heron'), end: PASSAGE.indexOf('heron') + 5, quote: 'heron', text: 'AI heron' }])));
    const first = await h.generate(adapted);
    expect(first).toMatchObject({ shown: false, annotations: [{ quote: 'heron', text: 'AI heron' }] });
    expect(h.row('adapted-1').adaptedReadingSupports).toEqual(first);
  });

  it('changes nothing if the passage is edited while suggestions are made', async () => {
    const { adapted } = fixture();
    let finish;
    const h = harness([adapted], (snapshot) => new Promise(resolve => { finish = () => resolve(api.validateReadingSupports(snapshot, [])); }));
    const pending = h.generate(adapted);
    h.stateRef.current.history = [{ ...adapted, data: 'A different passage entirely.' }];
    finish();
    await expect(pending).rejects.toThrow(/changed before word help finished/);
    expect(h.row('adapted-1').adaptedReadingSupports).toBeUndefined();
  });

  it('asks the AI for words a reader of the simplified text may still not know', async () => {
    // The real generator, from its source (a scratch copy in mutation runs).
    const { runInNewContext } = await import('node:vm');
    const source = readFileSync(process.env.ADAPTED_HELP_DISPATCHER || 'generate_dispatcher_source.jsx', 'utf8');
    const sandbox = { window: { AlloModules: { InstructionalContext: api } }, Intl, console, Date, setTimeout, clearTimeout };
    runInNewContext(source.slice(0, source.indexOf('const handleGenerate =')) + '\nglobalThis.generate = generateReadingSupports;', sandbox);
    const { adapted } = fixture();
    const snapshot = api.adaptedGenerationSnapshot(adapted, undefined);
    const prompts = [];
    const callGemini = async (prompt) => { prompts.push(prompt); return JSON.stringify({ sourceFingerprint: snapshot.fingerprint, annotations: [] }); };
    await sandbox.generate(snapshot, { callGemini, gradeLevel: '3', purpose: 'adapted' });
    await sandbox.generate(snapshot, { callGemini, gradeLevel: '3' });
    expect(prompts[0]).toContain('already rewritten (simplified) for this reader');
    expect(prompts[0]).toContain('Choose up to 8 occurrences');
    expect(prompts[0]).not.toContain('archaic usage');
    // Original texts keep their own prompt.
    expect(prompts[1]).toContain('Choose up to 12 useful unfamiliar occurrences, including archaic usage');
    expect(prompts[1]).not.toContain('already rewritten');
  });

  it('survives the offline autosave and a refresh', () => {
    loadAlloModule('firestore_sync_module.js');
    const { adapted } = fixture();
    const h = harness([adapted]);
    h.edit(adapted, { type: 'upsert', annotation: at('shallow', { text: 'Not deep.', image: { src: 'data:image/png;base64,QUJD', alt: 'Shallow water.' } }) });
    h.edit(h.row('adapted-1'), { type: 'show', shown: true });
    // The real serializer from the autosave effect; it copies an explicit list of fields.
    const source = readFileSync(ANTI, 'utf8');
    const from = source.indexOf('        const serializeItems = (items, stripImages) => {');
    const to = source.indexOf('\n        try {\n            const fullPayload', from);
    expect(from).toBeGreaterThan(0);
    const serializeItems = new Function('warnLog', source.slice(from, to) + '\nreturn serializeItems;')(() => {});
    for (const stripImages of [false, true]) {
      const saved = JSON.parse(JSON.stringify(serializeItems([h.row('adapted-1')], stripImages)));
      const restored = window.hydrateHistory(saved)[0];
      expect(restored.data).toBe(adapted.data);
      const help = api.validateAdaptedReadingSupports(restored, restored.adaptedReadingSupports);
      expect(help).toMatchObject({ shown: true, annotations: [{ quote: 'shallow', text: 'Not deep.' }] });
      // The retry for a full browser store drops pictures, never the written help.
      expect(!!help.annotations[0].image).toBe(!stripImages);
    }
  });
});
