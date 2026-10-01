// Lane N2 (2026-09-28, Katie Novak follow-up). Returning from a Lumen reflection
// to a passage in a preserved ORIGINAL must find the passage. The exact-text
// renderer draws one [data-reading-offset-start] element per line (no <p>, no
// [data-sentence-idx]) and puts word supports inside the line, so the old search
// always toasted "The passage may have changed". Verse (Macbeth) starts passages
// on short lines, and a play repeats speaker lines.
//
// Runs the REAL returnToReadingPassage from host_handlers_source.jsx and from the
// built host_handlers_module.js (and its public mirror).
// ALLO_N2_HOST_HANDLERS_MODULE_JS / ALLO_N2_HOST_HANDLERS_SOURCE_JSX can point at
// scratch copies for mutation runs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pick = (rel) => process.env['ALLO_N2_' + rel.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()] || resolve(root, rel);

// Brace-match one function out of source or compiled text (skips strings and comments).
const extractFunction = (text, file) => {
  const head = /function returnToReadingPassage\(citation\)\s*\{/.exec(text);
  if (!head) throw new Error('returnToReadingPassage not found in ' + file);
  let depth = 0, i = head.index + head[0].length - 1, mode = 'code';
  for (; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (mode === 'line') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i++; } continue; }
    if (mode === "'" || mode === '"' || mode === '`') { if (c === '\\') i++; else if (c === mode) mode = 'code'; continue; }
    if (c === '/' && n === '/') { mode = 'line'; i++; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { mode = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(head.index, i + 1);
  }
  throw new Error('returnToReadingPassage has no end in ' + file);
};
const COPIES = ['host_handlers_source.jsx', 'host_handlers_module.js', 'desktop/web-app/public/host_handlers_module.js'];

const MACBETH = [
  'FIRST WITCH.',
  'When shall we three meet again',
  'In thunder, lightning, or in rain?',
  'SECOND WITCH.',
  "When the hurlyburly's done,",
  "When the battle's lost and won.",
  'FIRST WITCH.',
  'That will be ere the set of sun.',
  'Where the place?',
  'Upon the heath.',
];
const GLOSSES = { "hurlyburly's": 'commotion, uproar', ere: 'before', heath: 'an area of open, wild land' };

// Mirrors the reader's exact-text markup: one line element per source line,
// gloss chips (with an Edit button) inside the line after the glossed word.
const renderOriginal = (lines, { continueSnippet = '' } = {}) => {
  document.body.innerHTML = '';
  const body = document.createElement('div');
  body.setAttribute('data-simplified-reading-body', 'true');
  if (continueSnippet) {
    const panel = document.createElement('div');
    panel.setAttribute('data-reading-continue', '');
    panel.innerHTML = '<p>Continue where you left off: ' + continueSnippet + '</p><button type="button">Continue</button>';
    body.appendChild(panel);
  }
  const passage = document.createElement('div');
  passage.setAttribute('data-reading-passage', 'true');
  passage.setAttribute('data-original-source', 'true');
  let offset = 0;
  const nodes = lines.map((line, index) => {
    const el = document.createElement('span');
    el.setAttribute('data-reading-offset-start', String(offset));
    el.setAttribute('data-reading-offset-end', String(offset + line.length));
    el.setAttribute('data-reading-paragraph', 'original-' + index);
    line.split(/(\s+)/).forEach(part => {
      const word = part.replace(/[.,?!]+$/, '');
      el.appendChild(document.createTextNode(part));
      if (GLOSSES[word]) {
        const chip = document.createElement('span');
        chip.setAttribute('data-reading-gloss', '');
        chip.setAttribute('role', 'group');
        chip.textContent = ' (' + GLOSSES[word] + ')';
        const edit = document.createElement('button');
        edit.textContent = 'Edit';
        chip.appendChild(edit);
        el.appendChild(chip);
      }
    });
    passage.appendChild(el);
    passage.appendChild(document.createTextNode('\n'));
    offset += line.length + 1;
    return el;
  });
  body.appendChild(passage);
  document.body.appendChild(body);
  return nodes;
};

const makeDeps = () => ({
  history: [{ id: 'original-1', type: 'simplified' }],
  handleRestoreView: vi.fn(),
  setShowStemLab: vi.fn(),
  setActiveView: vi.fn(),
  addToast: vi.fn(),
  generatedContent: { id: 'original-1' },
  sourceTopic: 'Macbeth',
});
const citation = (passage) => ({ passage, anchor: { kind: 'adapted', resourceId: 'original-1', section: 'body' } });

describe.each(COPIES)('returnToReadingPassage on a preserved original (%s)', (file) => {
  let returnToReadingPassage, deps;
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
    deps = makeDeps();
    const code = extractFunction(readFileSync(pick(file), 'utf8'), file);
    // eslint-disable-next-line no-new-func
    returnToReadingPassage = new Function('__d', code + '\nreturn returnToReadingPassage;')(deps);
  });
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
  const run = (passage) => { returnToReadingPassage(citation(passage)); vi.advanceTimersByTime(300); };

  it('focuses the line that holds a passage, even with word supports inside it', () => {
    const prose = 'The witches meet upon the heath in a storm and agree to find Macbeth once the fighting is over and done.';
    const [line] = renderOriginal([prose, 'A second, unrelated line of the original.']);
    run(prose);
    expect(deps.addToast).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(line);
    expect(line.getAttribute('tabindex')).toBe('-1');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(deps.setActiveView).toHaveBeenCalledWith('simplified');
  });

  it('finds a verse passage that starts on a short line and runs over several lines', () => {
    const lines = renderOriginal(MACBETH);
    run("When shall we three meet again\nIn thunder, lightning, or in rain?\nSECOND WITCH.\nWhen the hurlyburly's done,");
    expect(deps.addToast).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(lines[1]);
  });

  it('picks the right repeated speaker line (the one the passage continues from)', () => {
    const lines = renderOriginal(MACBETH);
    run('FIRST WITCH.\nThat will be ere the set of sun.\nWhere the place?\nUpon the heath.');
    expect(deps.addToast).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(lines[6]);
  });

  it('prefers the passage line over a panel that quotes the same words', () => {
    const lines = renderOriginal(MACBETH, { continueSnippet: 'Upon the heath.' });
    run('Upon the heath.');
    expect(document.activeElement).toBe(lines[9]);
  });

  it('still says the passage may have changed when it is not in the reading', () => {
    renderOriginal(MACBETH);
    run('Fair is foul, and foul is fair: hover through the fog and filthy air.');
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('The passage may have changed'), 'info');
  });

  it('keeps finding passages in adapted text paragraphs', () => {
    document.body.innerHTML = '<div data-simplified-reading-body="true"><p>First adapted paragraph.</p><p>The witches plan to meet Macbeth after the battle ends, out on the open land.</p></div>';
    run('The witches plan to meet Macbeth after the battle ends, out on the open land.');
    expect(deps.addToast).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelectorAll('p')[1]);
  });
});

describe('returnToReadingPassage copies', () => {
  it('the built module and its public mirror are byte-identical', () => {
    expect(readFileSync(pick(COPIES[2]), 'utf8')).toBe(readFileSync(pick(COPIES[1]), 'utf8'));
  });
});
