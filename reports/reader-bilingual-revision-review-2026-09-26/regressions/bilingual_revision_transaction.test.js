import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from '../../../tests/setup.js';

const DELIMITER = '\n\n--- ENGLISH TRANSLATION ---\n\n';
const documentText = (source, translation) => source + DELIMITER + translation;
const pair = (original, replacement, otherOriginal, otherReplacement, paneId = 'src') => ({
  primaryRevision: replacement,
  replacements: [
    { paneId, original, new: replacement },
    { paneId: paneId === 'src' ? 'tgt' : 'src', original: otherOriginal, new: otherReplacement },
  ],
});

beforeAll(() => {
  window.__alloUtils = { cleanJson: value => value };
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_CE_CANDIDATE || 'content_engine_module.js');
  if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
});

function fixture(text, response) {
  const pending = [];
  const state = {
    generatedContent: { id: 'reading', type: 'simplified', data: text, config: { language: 'Spanish', grade: '4' } },
    revisionData: null, selectionMenu: null, interactionMode: 'revise', leveledTextLanguage: 'Spanish', gradeLevel: '4',
    setIsCustomReviseOpen: vi.fn(), setCustomReviseInstruction: vi.fn(),
    setSelectionMenu: value => { state.selectionMenu = value; },
    setRevisionData: value => { state.revisionData = typeof value === 'function' ? value(state.revisionData) : value; },
  };
  const history = [state.generatedContent];
  state.handleSimplifiedTextChange = vi.fn(value => {
    state.generatedContent = { ...state.generatedContent, data: value };
    history.push(state.generatedContent);
  });
  const callGemini = vi.fn(() => response === undefined
    ? new Promise((resolve, reject) => pending.push({ resolve, reject }))
    : Promise.resolve(typeof response === 'string' ? response : JSON.stringify(response)));
  const addToast = vi.fn();
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast, t: key => key });
  const select = (selection, paneId = 'src', occurrence = 0) => {
    state.selectionMenu = { text: selection, paneId, language: paneId === 'tgt' ? 'English' : 'Spanish', occurrence, x: 0, y: 0 };
  };
  return { state, history, pending, callGemini, addToast, engine, select };
}

function drag(f, id, selected, occurrence = 0) {
  const node = document.getElementById(id);
  const text = node.firstChild;
  let at = -1;
  for (let i = 0; i <= occurrence; i++) at = text.textContent.indexOf(selected, at + 1);
  const range = document.createRange();
  range.setStart(text, at); range.setEnd(text, at + selected.length);
  const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  f.engine.handleTextMouseUp({ currentTarget: node });
}

describe('atomic bilingual revision commits', () => {
  it.each(['src', 'tgt'])('changes the selected occurrence in %s and commits the pair once', async paneId => {
    const text = documentText('solar then solar.', 'solar then solar.');
    // The primary phrase is repeated. The counterpart is an unambiguous larger span.
    const response = pair('solar', 'sunlit', 'solar then solar.', 'solar then sunlit.', paneId);
    const f = fixture(text, response);
    f.select('solar', paneId, 1);
    await f.engine.handleReviseSelection('custom', 'Use sunlit.');
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.callGemini.mock.calls[0][0]).toContain(`Selected paneId: ${paneId}`);
    await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(documentText('solar then sunlit.', 'solar then sunlit.'));
    expect(f.state.handleSimplifiedTextChange).toHaveBeenCalledTimes(1);
    expect(f.history).toHaveLength(2);
    expect(f.callGemini).toHaveBeenCalledTimes(1);
    await f.engine.applyTextRevision();
    expect(f.state.handleSimplifiedTextChange).toHaveBeenCalledTimes(1);
  });

  it('does not use sentence positions or overwrite surrounding phrase content', async () => {
    const f = fixture(documentText('El agua corre y cae.', 'Water flows. Then it falls.'),
      pair('corre', 'fluye', 'Water flows.', 'The water moves.'));
    f.select('corre');
    await f.engine.handleReviseSelection('simplify');
    await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(documentText('El agua fluye y cae.', 'The water moves. Then it falls.'));
    expect(f.callGemini).toHaveBeenCalledTimes(1);
  });

  it('keeps replacement characters literal in both panes', async () => {
    const literal = "$& $$ $` $' $5";
    const f = fixture(documentText('Cinco.', 'Five.'), pair('Cinco', literal, 'Five', literal));
    f.select('Cinco');
    await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(documentText(literal + '.', literal + '.'));
  });

  const invalidResponses = [
    ['missing counterpart', pair('Agua.', 'Líquido.', 'Not in the text.', 'Liquid.')],
    ['ambiguous counterpart', pair('Agua.', 'Líquido.', 'Water.', 'Liquid.')],
    ['partial array', { primaryRevision: 'Líquido.', replacements: [{ paneId: 'src', original: 'Agua.', new: 'Líquido.' }] }],
    ['empty array', { primaryRevision: 'Líquido.', replacements: [] }],
    ['wrong primary original', pair('Otro.', 'Líquido.', 'Water. Water.', 'Liquid.')],
    ['wrong primary preview', { ...pair('Agua.', 'Líquido.', 'Water. Water.', 'Liquid.'), primaryRevision: 'Different.' }],
    ['same pane twice', { primaryRevision: 'Líquido.', replacements: [{ paneId: 'src', original: 'Agua.', new: 'Líquido.' }, { paneId: 'src', original: 'Agua.', new: 'Otra.' }] }],
    ['empty counterpart original', pair('Agua.', 'Líquido.', '', 'Liquid.')],
    ['empty replacement', pair('Agua.', '', 'Water. Water.', 'Liquid.')],
    ['extra replacement', { primaryRevision: 'Líquido.', replacements: [...pair('Agua.', 'Líquido.', 'Water. Water.', 'Liquid.').replacements, { paneId: 'tgt', original: 'Water.', new: 'Extra.' }] }],
    ['malformed JSON', '{broken'],
    ['unavailable mapping', { unavailable: true }],
  ];
  it.each(invalidResponses)('retains both panes for %s', async (_label, response) => {
    const text = documentText('Agua.', 'Water. Water.');
    const f = fixture(text, response); f.select('Agua.');
    await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(text);
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.history).toHaveLength(1);
    expect(f.callGemini).toHaveBeenCalledTimes(1); // no unilateral fallback or retranslation
    expect(f.addToast).toHaveBeenCalledWith(expect.stringMatching(/unchanged.*larger passage/i), 'warning');
  });

  it('does not trust replacement entries modified in public preview state', async () => {
    const f = fixture(documentText('Agua.', 'Water.'), pair('Agua.', 'Líquido.', 'Water.', 'Liquid.'));
    f.select('Agua.'); await f.engine.handleReviseSelection('simplify');
    f.state.revisionData.replacements[1].new = 'Injected.';
    await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(documentText('Líquido.', 'Liquid.'));
  });

  it.each([
    ['hidden URL', 'See [site](https://example.test/Water).', 'Water'],
    ['partial link label', 'See [Water source](https://example.test).', 'Water'],
    ['unbalanced emphasis range', '**Water source** remains.', '**Water'],
    ['reference trailer', 'Rain.\n\n## References\nWater.', 'Water.'],
    ['absent pane', '', 'Water.'],
  ])('rejects a counterpart found only in a %s', async (_label, other, original) => {
    const text = documentText('Agua.', other);
    const f = fixture(text, pair('Agua.', 'Líquido.', original, 'Liquid.'));
    f.select('Agua.'); await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.state.generatedContent.data).toBe(text);
  });

  it('rejects unprepared legacy replacement arrays at Apply', async () => {
    const f = fixture(documentText('Agua.', 'Water.'));
    f.state.revisionData = { result: 'Líquido.', ...pair('Agua.', 'Líquido.', 'Water.', 'Liquid.') };
    await f.engine.applyTextRevision();
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
  });

  it('does not infer a bilingual pane from a language label alone', async () => {
    const f = fixture(documentText('solar.', 'solar.'));
    f.state.selectionMenu = { text: 'solar', language: 'English', occurrence: 0 };
    await f.engine.handleReviseSelection('simplify');
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
  });
});

describe('rendered selection anchors', () => {
  it('anchors an interleaved second-pane paragraph independently of DOM-wide occurrence counts', async () => {
    const text = documentText('solar first.\n\nsolar later.', 'solar first.\n\nsolar later.');
    const f = fixture(text, pair('solar', 'sunlit', 'solar later.', 'sunlit later.', 'tgt'));
    document.body.innerHTML = '<div data-reading-passage><p data-reading-paragraph="src-0">solar first.</p><p data-reading-paragraph="tgt-0">solar first.</p><p data-reading-paragraph="src-1">solar later.</p><p id="selected" data-reading-paragraph="tgt-1" data-reading-language="English">solar later.</p></div>';
    drag(f, 'selected', 'solar');
    await f.engine.handleReviseSelection('simplify');
    expect(f.state.revisionData.anchor).toMatchObject({ paneId: 'tgt', original: 'solar', occurrence: 0 });
    await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(documentText('solar first.\n\nsunlit later.', 'solar first.\n\nsunlit later.'));
  });

  it('keeps URLs out of visible occurrence counting', async () => {
    const f = fixture('See [the site](https://example.test/cell). The cell grows.', 'organelle');
    f.select('cell', 'mono');
    await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe('See [the site](https://example.test/cell). The organelle grows.');
  });

  it('rejects a rendered/source mismatch without selecting a nearby match', async () => {
    const f = fixture('A cell grows.', 'organelle');
    document.body.innerHTML = '<div data-reading-passage><p id="selected" data-reading-paragraph="0">A cell shrinks.</p></div>';
    drag(f, 'selected', 'cell');
    await f.engine.handleReviseSelection('simplify');
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.addToast).toHaveBeenCalledWith(expect.stringMatching(/select.*again/i), 'warning');
  });

  it('rejects a selection crossing pane/paragraph boundaries', async () => {
    const f = fixture(documentText('solar.', 'solar.'), pair('solar.', 'sunlit.', 'solar.', 'sunlit.'));
    document.body.innerHTML = '<div data-reading-passage><p id="a" data-reading-paragraph="src-0">solar.</p><p id="b" data-reading-paragraph="tgt-0">solar.</p></div>';
    const range = document.createRange(); range.setStart(document.getElementById('a').firstChild, 0); range.setEnd(document.getElementById('b').firstChild, 6);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    f.engine.handleTextMouseUp({ currentTarget: document.getElementById('a') });
    await f.engine.handleReviseSelection('simplify');
    expect(f.callGemini).not.toHaveBeenCalled();
  });

  it('anchors a selection across inline emphasis without leaving unmatched markers', async () => {
    const f = fixture('A **cell** wall protects it.', 'outer layer');
    document.body.innerHTML = '<div data-reading-passage><p id="selected" data-reading-paragraph="0">A <strong>cell</strong> wall protects it.</p></div>';
    const paragraph = document.getElementById('selected');
    const range = document.createRange(); range.setStart(paragraph.querySelector('strong').firstChild, 0); range.setEnd(paragraph.lastChild, 5);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    f.engine.handleTextMouseUp({ currentTarget: paragraph });
    await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe('A outer layer protects it.');
  });
});

describe('citation conservation on both commit paths', () => {
  const c1 = '[⁽¹⁾](https://one.test/a_(b_(c)))';
  const c2 = '[⁽²⁾](https://two.test)';
  it.each([false, true])('preserves nested URLs, citation order and the reference trailer (bilingual=%s)', async bilingual => {
    const source = `Agua ${c1} ${c2}.`, translated = `Water ${c1} ${c2}.`;
    const revised = `Líquido ${c1} ${c2}.`, revisedTranslation = `Liquid ${c1} ${c2}.`;
    const trailer = '\n\n## References\nReference text.';
    const f = fixture((bilingual ? documentText(source, translated) : source) + trailer,
      bilingual ? pair(source, revised, translated, revisedTranslation) : revised);
    f.select(source, bilingual ? 'src' : 'mono');
    await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe((bilingual ? documentText(revised, revisedTranslation) : revised) + trailer);
    expect(f.state.handleSimplifiedTextChange).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('rejects missing, added, reordered or changed citations (bilingual=%s)', async bilingual => {
    const original = `Agua ${c1} ${c2}.`;
    for (const unsafe of [`Líquido ${c1}.`, `Líquido ${c1} ${c2} ${c2}.`, `Líquido ${c2} ${c1}.`, `Líquido ${c1.replace('one.test', 'other.test')} ${c2}.`, 'Líquido [⁽¹⁾](https://one.test']) {
      const text = bilingual ? documentText(original, original) : original;
      const f = fixture(text, bilingual ? pair(original, original, original, unsafe) : unsafe);
      f.select(original, bilingual ? 'src' : 'mono');
      await f.engine.handleReviseSelection('simplify'); await f.engine.applyTextRevision();
      expect(f.state.generatedContent.data).toBe(text);
      expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
      expect(f.addToast).toHaveBeenCalledWith(expect.stringMatching(/citation/i), 'warning');
    }
  });
});

describe('revision response and Apply ownership', () => {
  const text = documentText('Agua.', 'Water.');
  const response = pair('Agua.', 'Líquido.', 'Water.', 'Liquid.');
  it.each(['close', 'resource', 'edit', 'restore', 'same-text-new-version'])('ignores a late response after %s', async change => {
    const f = fixture(text); f.select('Agua.');
    const request = f.engine.handleReviseSelection('simplify');
    if (change === 'close') f.engine.closeRevision();
    else if (change === 'resource') f.state.generatedContent = { ...f.state.generatedContent, id: 'other' };
    else if (change === 'edit') f.state.generatedContent = { ...f.state.generatedContent, data: 'Changed.' };
    else {
      if (change === 'restore') f.state.generatedContent = { ...f.state.generatedContent, data: 'Changed.' };
      f.state.generatedContent = { ...f.state.generatedContent, data: text };
    }
    const current = f.state.generatedContent;
    f.pending[0].resolve(JSON.stringify(response)); await request; await f.engine.applyTextRevision();
    expect(f.state.generatedContent).toBe(current);
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.addToast).not.toHaveBeenCalled();
  });

  it.each([false, true])('ignores an older success/failure without erasing the newer pair (failure=%s)', async fail => {
    const f = fixture(text); f.select('Agua.');
    const older = f.engine.handleReviseSelection('simplify');
    f.select('Agua.'); const newer = f.engine.handleReviseSelection('simplify');
    f.pending[1].resolve(JSON.stringify(response)); await newer;
    if (fail) f.pending[0].reject(new Error('Old failure')); else f.pending[0].resolve('{bad old JSON');
    await older; await f.engine.applyTextRevision();
    expect(f.state.generatedContent.data).toBe(documentText('Líquido.', 'Liquid.'));
    expect(f.state.handleSimplifiedTextChange).toHaveBeenCalledTimes(1);
    expect(f.addToast.mock.calls.filter(call => call[1] !== 'success')).toHaveLength(0);
  });

  it.each(['edited', 'restored', 'protected', 'dismissed'])('rejects Apply after the preview is %s', async change => {
    const f = fixture(text, response); f.select('Agua.'); await f.engine.handleReviseSelection('simplify');
    if (change === 'dismissed') f.engine.closeRevision();
    else if (change === 'protected') f.state.generatedContent.instructionalText = { form: 'original' };
    else f.state.generatedContent = { ...f.state.generatedContent, data: change === 'edited' ? 'Changed.' : text };
    await f.engine.applyTextRevision();
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.history).toHaveLength(1);
  });

  it.each(['selection', 'custom-input'])('invalidates a pending response when a newer %s opens', async action => {
    const f = fixture(text); f.select('Agua.');
    const request = f.engine.handleReviseSelection('simplify');
    if (action === 'selection') {
      document.body.innerHTML = '<div data-reading-passage><p id="selected" data-reading-paragraph="src-0">Agua.</p></div>';
      drag(f, 'selected', 'Agua.');
    } else {
      f.select('Agua.'); await f.engine.handleReviseSelection('custom-input');
    }
    f.pending[0].resolve(JSON.stringify(response)); await request; await f.engine.applyTextRevision();
    expect(f.state.revisionData).toBeNull();
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.addToast).not.toHaveBeenCalled();
  });
});
