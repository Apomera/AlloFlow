// Regression tests for the 2026-10-27 review backlog trust fixes (docs/review-backlog-2026-10-27.md).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('timeline_revision_module.js');
  loadAlloModule('note_taking_templates_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  loadAlloModule('view_renderers_module.js');
  loadAlloModule('view_dbq_module.js');
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
});

describe('Timeline verification requires a verdict for every item', () => {
  const ITEMS = [{ date: '1776', event: 'A' }, { date: '1787', event: 'B' }, { date: '1791', event: 'C' }];
  const ok = i => ({ index: i, isFactuallyAccurate: true, isPositionCorrect: true, concern: '', rationale: 'checked' });

  async function verify(response, items = ITEMS) {
    const resource = { id: 'tl-' + Math.random(), type: 'timeline', data: { items } };
    const state = { active: resource, history: [resource] };
    const addToast = vi.fn();
    const ctx = {
      generatedContent: resource, t: () => '', cleanJson: s => s, addToast,
      setIsVerifyingTimeline: vi.fn(),
      setGeneratedContent: u => { state.active = typeof u === 'function' ? u(state.active) : u; },
      setHistory: u => { state.history = u(state.history); }
    };
    const api = window.AlloModules.createTimelineRevision({ callGemini: async () => JSON.stringify(response) });
    await api.handleVerifyTimelineAccuracy(ctx);
    const [message, kind] = addToast.mock.calls.at(-1);
    return { items: state.history[0].data.items, message, kind };
  }
  const checkedCount = items => items.filter(it => it.verification).length;

  it('reports clean only when every item has a valid verdict', async () => {
    const r = await verify([ok(0), ok(1), ok(2)]);
    expect(r.kind).toBe('success');
    expect(checkedCount(r.items)).toBe(3);
  });
  it('reports concerns when every item is covered and one is flagged', async () => {
    const r = await verify([ok(0), { ...ok(1), isPositionCorrect: false, concern: 'too late' }, ok(2)]);
    expect(r.kind).toBe('warning');
    expect(r.message).toMatch(/1 item\(s\) flagged/);
    expect(r.items[1].verification.position).toBe(false);
  });
  it('treats an empty array as a failed check and changes nothing', async () => {
    const r = await verify([]);
    expect(r.kind).toBe('error');
    expect(checkedCount(r.items)).toBe(0);
  });
  it('leaves a missing item unchecked and does not say all items look accurate', async () => {
    const r = await verify([ok(0), ok(2)]);
    expect(r.kind).toBe('warning');
    expect(r.message).toMatch(/Checked 2 of 3/);
    expect(r.items[1].verification).toBeUndefined();
  });
  it('discards both verdicts of a duplicated index', async () => {
    const r = await verify([ok(0), ok(1), { ...ok(1), isFactuallyAccurate: false }, ok(2)]);
    expect(r.message).toMatch(/Checked 2 of 3/);
    expect(r.items[1].verification).toBeUndefined();
  });
  it('ignores out-of-range, fractional and string indices', async () => {
    const r = await verify([ok(0), ok(1), ok(3), { ...ok(2), index: 1.5 }, { ...ok(2), index: '2' }, { ...ok(2), index: -1 }]);
    expect(r.message).toMatch(/Checked 2 of 3/);
    expect(r.items[2].verification).toBeUndefined();
  });
  it('does not count an omitted boolean as accurate', async () => {
    const { isPositionCorrect, ...noPosition } = ok(2);
    const r = await verify([ok(0), ok(1), noPosition]);
    expect(r.message).toMatch(/Checked 2 of 3/);
    expect(r.items[2].verification).toBeUndefined();
  });
  it('does not read a string "false" as accurate', async () => {
    const r = await verify([ok(0), ok(1), { ...ok(2), isFactuallyAccurate: 'false' }]);
    expect(r.kind).toBe('warning');
    expect(r.message).not.toMatch(/look accurate/);
    expect(r.items[2].verification).toBeUndefined();
  });
  it('clears an earlier verdict on an item the new check did not cover', async () => {
    const stale = ITEMS.map((it, i) => (i === 1 ? { ...it, verification: { factual: true, position: true } } : it));
    const r = await verify([ok(0), ok(2)], stale);
    expect(r.items[1].verification).toBeUndefined();
    expect(r.items[1].event).toBe('B');
  });
});

describe('Note-Taking feedback sees the source it is asked to check', () => {
  const notes = { id: 'notes-1', type: 'note-taking', data: { title: 'Notes', templateType: 'cornell-notes', cues: [{ id: 'c1', text: 'Why?' }, { id: 'c2', text: 'How?' }], notes: [{ id: 'n1', text: 'Quote: "the last line of the chapter"' }, { id: 'n2', text: 'Leaves hold chlorophyll' }], summary: '' } };
  const reply = JSON.stringify({ strength: 'Clear', growthNudge: 'Add an example.', sourceAlignment: { found: true, message: '' }, rubric: { completion: 3, quality: 10, alignment: 4 } });

  async function promptFor(inputText) {
    const callGemini = vi.fn(async () => reply);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(window.AlloModules.NoteTakingView, {
      generatedContent: notes, isTeacherMode: false, allowRuntimeAi: true, callGemini, inputText,
      t: () => '', addToast: () => {}, handleNoteUpdate: () => {}, handleScoreUpdate: () => {}
    })));
    await act(async () => { host.querySelector('[data-help-key="notes_feedback_button"]').click(); await Promise.resolve(); });
    expect(callGemini).toHaveBeenCalledTimes(1);
    return callGemini.mock.calls[0][0];
  }

  it('sends a long classroom source whole, including a quote past character 3000', async () => {
    const source = 'Opening words. ' + 'Filler sentence about plants. '.repeat(400) + 'the last line of the chapter';
    expect(source.length).toBeGreaterThan(10000);
    const prompt = await promptFor(source);
    expect(prompt.includes('the last line of the chapter"""') || prompt.includes('the last line of the chapter\n"""'), 'quote beyond 3000 chars reached the model').toBe(true);
    expect(prompt).toMatch(/the complete text/);
    expect(prompt).not.toMatch(/left out/);
  });
  it('discloses a cut source and asks for "could not check" instead of "not in the text"', async () => {
    const source = 'x'.repeat(60000) + ' TAIL-MARKER';
    const prompt = await promptFor(source);
    expect(prompt.includes('TAIL-MARKER'), 'the cut part is not sent').toBe(false);
    expect(prompt).toMatch(/only the first 50000 of 60012 characters/);
    expect(prompt).toMatch(/set "found" to null/);
  });
  it('keeps the rubric-only path when there is no source', async () => {
    const prompt = await promptFor('');
    expect(prompt).not.toMatch(/SOURCE TEXT/);
    expect(prompt).toMatch(/null \(no source text provided\)/);
  });
});

describe('Writing Supports mastery grading validates the score and sees the previous draft', () => {
  const DRAFT = 'Plants turn sunlight, water and carbon dioxide into sugar and oxygen.';
  function grade(grading, draftCount) {
    const prompts = [];
    const callGemini = vi.fn(async prompt => {
      prompts.push(prompt);
      return prompts.length === 1 ? JSON.stringify({ isRelevant: true }) : (typeof grading === 'string' ? grading : JSON.stringify(grading));
    });
    const deps = {
      callGemini, cleanJson: s => s, t: key => key, warnLog: () => {},
      validateDraftQuality: () => ({ isValid: true }), RELEVANCE_GATE_PROMPT: 'GATE'
    };
    const run = window.AlloModules.PhaseNHelpers.handleMasteryGrading(DRAFT, 'Explain photosynthesis.', 'Plants', draftCount, deps);
    return { run, prompts };
  }
  const reply = rawScore => ({ rawScore, breakdown: [], feedback: { strength: 'Clear', improvement: 'Add detail' } });

  it.each([
    ['missing', { breakdown: [], feedback: {} }],
    ['a string', reply('90')],
    ['above 100', reply(150)],
    ['negative', reply(-5)],
    ['null', reply(null)],
    ['not an object', '[90]']
  ])('treats a %s score as a grading error, not a result', async (_label, grading) => {
    await expect(grade(grading, 1).run).rejects.toThrow('process.grading_error');
  });
  it('awards mastery only from a valid score above 85', async () => {
    expect(await grade(reply(90), 1).run).toMatchObject({ status: 'mastery', rawScore: 90 });
    expect(await grade(reply(85), 1).run).toMatchObject({ status: 'revision', rawScore: 85 });
    expect(await grade(reply(0), 1).run).toMatchObject({ status: 'revision', rawScore: 0, score: 40 });
  });
  it('grades a revision beside the previous draft', async () => {
    const g = grade(reply(70), { draftCount: 2, previousDraft: 'Plants eat dirt.' });
    expect(await g.run).toMatchObject({ draftCount: 2 });
    expect(g.prompts[1]).toContain('Attempt #2');
    expect(g.prompts[1]).toContain('Previous Draft');
    expect(g.prompts[1]).toContain('Plants eat dirt.');
    expect(g.prompts[1]).toMatch(/Never claim an improvement/);
  });
  it('a first draft, or an older host passing a number, gets no comparison and no improvement claim', async () => {
    const g = grade(reply(70), 1);
    expect(await g.run).toMatchObject({ draftCount: 1 });
    expect(g.prompts[1]).toContain('Attempt #1');
    expect(g.prompts[1]).not.toContain('Previous Draft');
    expect(g.prompts[1]).toMatch(/do not describe the work as improved/);
  });
});

describe('Standards Alignment and Check Level see the whole text, or say what they skipped', () => {
  const LONG = 'Opening paragraph about the water cycle. ' + 'Evaporation and condensation explained in detail. '.repeat(120) + 'CITE-EVIDENCE-MARKER: students cite two sources.';
  const HUGE = 'y'.repeat(60000) + ' TAIL-MARKER';

  async function alignment(text) {
    const prompts = [];
    const saved = [];
    await window.AlloModules.SimplifiedView.checkAlignment({
      generatedContent: { id: 'adapted-1', type: 'simplified', data: text },
      gradeLevel: '6th Grade', standardsInput: 'CCSS.ELA-LITERACY.RI.6.1',
      callGemini: async p => { prompts.push(p); return JSON.stringify({ evidence: 'x', status: 'Aligned', rigorReport: 'ok', missingElements: 'None', improvement: 'none' }); },
      cleanJson: s => s, t: k => k, addToast: () => {}, setIsCheckingAlignment: () => {}, speak: () => {}, warnLog: () => {}, setError: () => {},
      setGeneratedContent: c => saved.push(c), setHistory: () => {}, alloBotRef: { current: null }
    });
    expect(prompts).toHaveLength(1);
    return { prompt: prompts[0], check: saved.at(-1).alignmentCheck };
  }
  async function level(text) {
    const prompts = [];
    const saved = [];
    await window.AlloModules.PhaseNHelpers.handleCheckLevel({
      generatedContent: { id: 'adapted-1', type: 'simplified', data: text },
      gradeLevel: '6th Grade', leveledTextLanguage: 'English',
      callGemini: async p => { prompts.push(p); return prompts.length === 1 ? JSON.stringify({ estimatedLevel: '6th Grade', alignment: 'Aligned', feedback: 'ok' }) : JSON.stringify({ confirmedLevel: '6th Grade', rubric: {}, nuanceSummary: 'ok' }); },
      cleanJson: s => s, calculateReadability: () => ({ score: 6 }), t: k => k, addToast: () => {}, warnLog: () => {}, setError: () => {},
      setIsCheckingLevel: () => {}, setGeneratedContent: c => saved.push(c), setHistory: () => {}, alloBotRef: { current: null }
    });
    expect(prompts).toHaveLength(2);
    return { prompts, check: saved.at(-1).levelCheck };
  }

  it('Standards Alignment reads a text well past 3,000 characters to the end', async () => {
    expect(LONG.length).toBeGreaterThan(5000);
    const r = await alignment(LONG);
    expect(r.prompt.includes('CITE-EVIDENCE-MARKER'), 'the end of the text reached the model').toBe(true);
    expect(r.prompt).not.toMatch(/left out/);
    expect(r.check).toMatchObject({ checkedChars: LONG.length, totalChars: LONG.length });
  });
  it('Standards Alignment discloses a cut text and forbids calling skipped requirements missing', async () => {
    const r = await alignment(HUGE);
    expect(r.prompt.includes('TAIL-MARKER')).toBe(false);
    expect(r.prompt).toMatch(/only the first 50000 of 60012 characters/);
    expect(r.prompt).toMatch(/Do not list a requirement as missing/);
    expect(r.check).toMatchObject({ checkedChars: 50000, totalChars: 60012 });
  });
  it('Check Level reads the whole text in both passes', async () => {
    const r = await level(LONG);
    expect(r.prompts.every(p => p.includes('CITE-EVIDENCE-MARKER')), 'both passes saw the end').toBe(true);
    expect(r.check).toMatchObject({ checkedChars: LONG.length, totalChars: LONG.length });
  });
  it('Check Level says when it judged only the opening of a very long text', async () => {
    const r = await level(HUGE);
    expect(r.prompts.every(p => /only the first 50000 of 60012 characters/.test(p))).toBe(true);
    expect(r.check).toMatchObject({ checkedChars: 50000, totalChars: 60012 });
  });
});

describe('Shared renderer tables: header scope, row headers and captions', () => {
  function renderTable(text) {
    const deps = {
      sanitizeTruncatedCitations: s => s, normalizeResourceLinks: s => s, formatInlineText: s => s,
      warnLog: () => {}, t: () => null, SimpleBarChart: () => null, SimpleDonutChart: () => null
    };
    const elements = window.AlloModules.ViewRenderers.renderFormattedText(text, false, false, deps);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement('div', null, elements)));
    return host;
  }

  it('column headers carry scope="col"', () => {
    const el = renderTable('| Planet | Moons |\n|---|---|\n| Earth | 1 |\n| Mars | 2 |');
    const ths = [...el.querySelectorAll('thead th')];
    expect(ths.map(th => th.getAttribute('scope'))).toEqual(['col', 'col']);
    expect(el.querySelectorAll('tbody th')).toHaveLength(0);
    expect(el.querySelector('caption')).toBeNull();
  });
  it('an empty top-left header makes the first column row headers', () => {
    const el = renderTable('| | Mon | Tue |\n|---|---|---|\n| Rain (mm) | 4 | 0 |\n| Sun (h) | 6 | 9 |');
    expect([...el.querySelectorAll('thead th')].map(th => [th.getAttribute('scope'), th.textContent])).toEqual([['col', 'Mon'], ['col', 'Tue']]);
    const rowHeads = [...el.querySelectorAll('tbody th')];
    expect(rowHeads.map(th => [th.getAttribute('scope'), th.textContent])).toEqual([['row', 'Rain (mm)'], ['row', 'Sun (h)']]);
    expect(el.querySelectorAll('tbody td')).toHaveLength(4);
  });
  it('a "Table:" line just above the table becomes its caption and is not repeated as text', () => {
    const el = renderTable('Intro line.\nTable: Moons of the inner planets\n| Planet | Moons |\n|---|---|\n| Earth | 1 |\nAfter the table.');
    expect(el.querySelector('table caption')?.textContent).toBe('Moons of the inner planets');
    expect(el.textContent.includes('Table: Moons')).toBe(false);
    expect(el.textContent).toContain('After the table.');
  });
  it('a "Table:" line just below the table also works, including at the end of the text', () => {
    const below = renderTable('| Planet | Moons |\n|---|---|\n| Earth | 1 |\nTable: Moons by planet\nNext paragraph.');
    expect(below.querySelector('table caption')?.textContent).toBe('Moons by planet');
    expect(below.textContent).toContain('Next paragraph.');
    act(() => root.unmount()); root = null; host.remove(); host = null;
    const ending = renderTable('Table: Last table\n| A | B |\n|---|---|\n| 1 | 2 |');
    expect(ending.querySelector('table caption')?.textContent).toBe('Last table');
  });
  it('a "Table:" line that is not next to a table stays ordinary text', () => {
    const el = renderTable('Table: this is just a sentence about furniture.\n\nNo table here.');
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).toContain('Table: this is just a sentence about furniture.');
  });
});

describe('DBQ essay feedback is grounded in the excerpts and the displayed rubric', () => {
  const RUBRIC = [{ criteria: 'Thesis', 1: 'None', 2: 'Vague', 3: 'Clear', 4: 'Nuanced' }, { criteria: 'Evidence', 1: 'None', 2: 'Listed', 3: 'Used', 4: 'Analyzed' }];
  function essay(response, data = {}) {
    const state = {
      responses: { _dbqTab: 'essay', _essayText: 'Document A says the mill closed in 1850, so the town shrank.' },
      callGemini: vi.fn(async () => JSON.stringify(response))
    };
    const generatedContent = { id: 'dbq-g', type: 'dbq', data: { title: 'Mill town', synthesisPrompt: 'Why did the town shrink?', rubric: RUBRIC, documents: [
      { id: 'A', title: 'Mill ledger', excerptKind: 'verbatim', excerpt: 'The mill shut its doors in the spring of 1850.', source: 'Town archive' },
      { id: 'B', title: 'Letter home', excerpt: 'Families left for the railroad jobs out west.' }
    ], ...data } };
    const onInput = vi.fn((id, key, value) => { state.responses = { ...state.responses, [key]: value }; refresh(); });
    const refresh = () => act(() => root.render(React.createElement(window.AlloModules.DbqView, { generatedContent, studentResponses: { [generatedContent.id]: state.responses }, handleStudentInput: onInput, handleScoreUpdate: vi.fn(), callGemini: state.callGemini, cleanJson: v => v, t: () => '', gradeLevel: '8th Grade', addToast: vi.fn(), feedbackScopeKey: 'learner' })));
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    refresh();
    return { state, click: async () => { const b = [...host.querySelectorAll('button')].find(n => n.textContent.includes('Get AI Feedback')); await act(async () => { b.click(); }); } };
  }
  it('the prompt carries every excerpt, its kind, and the teacher rubric', async () => {
    const f = essay({ overallScore: 3 });
    await f.click();
    const prompt = f.state.callGemini.mock.calls[0][0];
    expect(prompt.includes('The mill shut its doors in the spring of 1850.'), 'excerpt A').toBe(true);
    expect(prompt.includes('Families left for the railroad jobs out west.'), 'excerpt B').toBe(true);
    expect(prompt.includes('"kind":"verbatim"'), 'kind A').toBe(true);
    expect(prompt.includes('"kind":"adapted"'), 'kind B').toBe(true);
    expect(prompt.includes('TEACHER RUBRIC'), 'rubric header').toBe(true);
    expect(prompt.includes('"criteria":"Evidence"'), 'rubric row').toBe(true);
    expect(prompt.includes('"rubricScores"'), 'rubric schema').toBe(true);
    expect(prompt.includes('EVIDENCE CHECK'), 'evidence task').toBe(true);
  });
  it('without a rubric the prompt falls back to the grade-level guide only', async () => {
    const f = essay({ overallScore: 3 }, { rubric: [] });
    await f.click();
    const prompt = f.state.callGemini.mock.calls[0][0];
    expect(prompt.includes('TEACHER RUBRIC')).toBe(false);
    expect(prompt.includes('"rubricScores"')).toBe(false);
    expect(prompt.includes('GRADE-LEVEL SCORING (Middle School)')).toBe(true);
  });
  it('a long excerpt is cut with a marker and a disclosure', async () => {
    const long = 'word '.repeat(3000);
    const f = essay({ overallScore: 2 }, { documents: [{ id: 'A', title: 'Long', excerpt: long }] });
    await f.click();
    const prompt = f.state.callGemini.mock.calls[0][0];
    expect(prompt.includes(long), 'whole excerpt should not be sent').toBe(false);
    expect(prompt.includes('[...]'), 'cut marker').toBe(true);
    expect(prompt.includes('Do not mark evidence as wrong if it could come from the part left out.'), 'disclosure').toBe(true);
  });
  it('evidence checks, rubric levels and missing docs keep only real documents and criteria', async () => {
    const f = essay({ overallScore: 3, missingDocs: ['Doc B', 'Z'],
      evidenceChecks: [{ doc: 'Document A', status: 'misread', note: 'The ledger gives spring 1850.' }, { doc: 'A', status: 'accurate', note: 'dup' }, { doc: 'Q', status: 'accurate' }, { doc: 'B', status: 'great' }],
      rubricScores: { Thesis: 3, Evidence: '2', Style: 4, Extra: 9 } });
    await f.click();
    const saved = f.state.responses._aiFeedback;
    expect(saved.missingDocs).toEqual(['B']);
    expect(saved.evidenceChecks).toEqual([{ doc: 'A', status: 'misread', note: 'The ledger gives spring 1850.' }]);
    expect(saved.rubricScores).toEqual({ Thesis: 3, Evidence: 2 });
    const checks = host.querySelector('[data-dbq-evidence-checks]');
    expect(checks.textContent).toContain('Misreads the document');
    expect(checks.textContent).toContain('The ledger gives spring 1850.');
    expect(host.querySelector('[data-dbq-rubric-scores]').textContent).toContain('Evidence: 2/4');
  });
  it('the Evidence Tracker says it only detects mentions', () => {
    essay({ overallScore: 3 });
    expect(host.textContent).toContain('It does not check how you used them.');
  });
});

describe('Charts: written description and data table', () => {
  function renderText(text) {
    const deps = { sanitizeTruncatedCitations: s => s, normalizeResourceLinks: s => s, formatInlineText: s => s, warnLog: () => {}, t: () => null,
      SimpleBarChart: () => React.createElement('svg', { role: 'img', 'aria-label': 'bars' }), SimpleDonutChart: () => React.createElement('div', { role: 'progressbar' }) };
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    act(() => root.render(React.createElement('div', null, window.AlloModules.ViewRenderers.renderFormattedText(text, false, false, deps))));
    return host;
  }
  it('a bar chart is a figure with its description as the figcaption and every value in a data table', () => {
    const el = renderText('[[CHART: {"type":"bar","title":"Moons","data":[{"label":"Earth","value":1},{"label":"Mars","value":2}],"description":"Mars has twice as many moons as Earth."}]]');
    const figure = el.querySelector('figure[data-chart="bar"]');
    expect(figure).toBeTruthy();
    expect(figure.querySelector('figcaption').textContent).toBe('Mars has twice as many moons as Earth.');
    const rows = [...figure.querySelectorAll('[data-chart-data] tbody tr')].map(tr => [tr.querySelector('th').textContent, tr.querySelector('td').textContent]);
    expect(rows).toEqual([['Earth', '1'], ['Mars', '2']]);
    expect(figure.querySelector('[data-chart-data] summary').textContent).toBe('Show the data as a table');
  });
  it('a donut chart carries its description; a chart without one has no empty caption', () => {
    const el = renderText('[[CHART: {"type":"donut","title":"Recycled","percentage":40,"label":"40%","description":"Two fifths of the waste was recycled."}]]\n\n[[CHART: {"type":"bar","title":"Plain","data":[{"label":"A","value":3}]}]]');
    expect(el.querySelector('figure[data-chart="donut"] figcaption').textContent).toBe('Two fifths of the waste was recycled.');
    expect(el.querySelectorAll('figure[data-chart="bar"] figcaption')).toHaveLength(0);
  });
  it('a row of blank cells keeps every cell (inserted tables start blank)', () => {
    const el = renderText('| A | B | C |\n|---|---|---|\n| x |  |  |');
    expect(el.querySelectorAll('tbody tr td')).toHaveLength(3);
  });
});

describe('Table and chart authoring helpers', () => {
  const VR = () => window.AlloModules.ViewRenderers;
  const labels = { column: n => 'Column ' + n, row: n => 'Row ' + n };
  it('buildMarkdownTable writes a caption line, headers and blank rows (row labels leave the corner empty)', () => {
    expect(VR().buildMarkdownTable({ caption: 'Weather', columns: 3, rows: 2, rowHeaders: true }, labels)).toBe(
      'Table: Weather\n|   | Column 2 | Column 3 |\n|---|---|---|\n| Row 1 |   |   |\n| Row 2 |   |   |');
    expect(VR().buildMarkdownTable({ caption: 'a | b', columns: 99, rows: 0 }, labels).split('\n')[0]).toBe('Table: a / b');
  });
  it('findTableAt finds the table and caption from any line, and editMarkdownTable adds rows, columns and captions', () => {
    const text = 'Intro.\n\nTable: Old\n| A | B |\n|---|---|\n| 1 | 2 |\n\nAfter.';
    const table = VR().findTableAt(text, text.indexOf('| 1'));
    expect(table.caption).toBe('Old');
    expect(text.slice(table.start, table.end)).toBe('Table: Old\n| A | B |\n|---|---|\n| 1 | 2 |');
    expect(VR().findTableAt(text, text.indexOf('Table: Old'))).toEqual(table);
    expect(VR().findTableAt(text, 2)).toBeNull();
    expect(VR().editMarkdownTable(table, { addRow: true }, labels)).toBe('Table: Old\n| A | B |\n|---|---|\n| 1 | 2 |\n|   |   |');
    expect(VR().editMarkdownTable(table, { addColumn: true }, labels)).toBe('Table: Old\n| A | B | Column 3 |\n|---|---|---|\n| 1 | 2 |   |');
    expect(VR().editMarkdownTable(table, { caption: 'New' }, labels).split('\n')[0]).toBe('Table: New');
  });
  it('chart rows parse "Label: value" lines and report the rest; chart lines round-trip', () => {
    expect(VR().parseChartRows('Apples: 12\nPears, 7.5\n\nbad line\nPlums: lots')).toEqual({ data: [{ label: 'Apples', value: 12 }, { label: 'Pears', value: 7.5 }], bad: ['bad line', 'Plums: lots'] });
    const line = VR().buildChartLine({ type: 'bar', title: 'Fruit', data: [{ label: 'A', value: 1 }], description: 'Only\nA.' });
    expect(line.startsWith('[[CHART: ') && !line.includes('\n')).toBe(true);
    expect(VR().parseChartLine(line)).toEqual({ type: 'bar', title: 'Fruit', data: [{ label: 'A', value: 1 }], description: 'Only A.' });
    expect(VR().parseChartLine(VR().buildChartLine({ type: 'donut', title: '', percentage: 30, description: 'x' })).label).toBe('30%');
    expect(VR().parseChartLine('[[CHART: {"type":"pie"}]]')).toBeNull();
  });
  it('insertMarkdownBlock puts the block on its own lines', () => {
    expect(VR().insertMarkdownBlock('one two', 3, 3, 'B')).toEqual({ text: 'one\n\nB\n\n two', caret: 6 });
    expect(VR().insertMarkdownBlock('', 0, 0, 'B')).toEqual({ text: 'B', caret: 1 });
    expect(VR().insertMarkdownBlock('a\n\nb', 3, 3, 'B').text).toBe('a\n\nB\n\nb');
  });
});

describe('Table and chart editor tools', () => {
  const setValue = (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
  };
  function mount(initial) {
    const changes = [];
    function Harness() {
      const [text, setText] = React.useState(initial);
      const ref = React.useRef(null);
      return React.createElement('div', null,
        React.createElement(window.AlloModules.ViewRenderers.TableChartTools, { t: () => '', textareaRef: ref, getText: () => text, onChange: v => { changes.push(v); setText(v); } }),
        React.createElement('textarea', { ref, value: text, onChange: e => setText(e.target.value), 'data-editor': '' }));
    }
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    act(() => root.render(React.createElement(Harness)));
    const editor = host.querySelector('[data-editor]');
    return { changes, editor, caret: pos => editor.setSelectionRange(pos, pos), q: sel => host.querySelector(sel), click: sel => act(() => host.querySelector(sel).click()) };
  }
  it('inserts a captioned table at the cursor and requires the caption', () => {
    const f = mount('First paragraph.\n\nSecond paragraph.');
    f.caret('First paragraph.'.length);
    f.click('[data-tc-open="table"]');
    expect(f.q('[data-tc-open="table"]').getAttribute('aria-expanded')).toBe('true');
    f.click('[data-tc-insert-table]');
    expect(f.q('[data-tc-error]').textContent).toContain('Add a caption');
    expect(f.changes).toHaveLength(0);
    setValue(f.q('[data-tc-panel] input'), 'Rainfall by month');
    f.click('[data-tc-insert-table]');
    expect(f.changes).toHaveLength(1);
    expect(f.changes[0]).toBe('First paragraph.\n\nTable: Rainfall by month\n| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n|   |   |   |\n|   |   |   |\n|   |   |   |\n\nSecond paragraph.');
    expect(f.q('[data-tc-panel]')).toBeNull();
    expect(f.q('[data-tc-status]').textContent).toContain('Table inserted');
  });
  it('with the cursor in a table it offers add row, add column and caption edits', () => {
    const f = mount('| A | B |\n|---|---|\n| 1 | 2 |');
    f.caret(3);
    f.click('[data-tc-open="table"]');
    expect(f.q('[data-tc-panel] h5').textContent).toBe('Edit this table');
    f.click('[data-tc-add-row]');
    expect(f.changes.at(-1)).toBe('| A | B |\n|---|---|\n| 1 | 2 |\n|   |   |');
    f.caret(3);
    f.click('[data-tc-open="table"]');
    setValue(f.q('[data-tc-panel] input'), 'Scores');
    f.click('[data-tc-save-caption]');
    expect(f.changes.at(-1).split('\n')[0]).toBe('Table: Scores');
  });
  it('a chart needs valid data and a description; editing a chart line replaces it', () => {
    const f = mount('Text.');
    f.caret(5);
    f.click('[data-tc-open="chart"]');
    setValue(f.q('[data-tc-rows]'), 'Apples: 12\nPears 7');
    f.click('[data-tc-apply-chart]');
    expect(f.q('[data-tc-error]').textContent).toContain('Pears 7');
    setValue(f.q('[data-tc-rows]'), 'Apples: 12\nPears: 7');
    f.click('[data-tc-apply-chart]');
    expect(f.q('[data-tc-error]').textContent).toContain('Add a description');
    setValue(f.q('[data-tc-description]'), 'Apples outnumber pears.');
    f.click('[data-tc-apply-chart]');
    const inserted = f.changes.at(-1);
    expect(inserted).toBe('Text.\n\n[[CHART: {"type":"bar","title":"","data":[{"label":"Apples","value":12},{"label":"Pears","value":7}],"description":"Apples outnumber pears."}]]');
    f.caret(inserted.length - 3);
    f.click('[data-tc-open="chart"]');
    expect(f.q('[data-tc-panel] h5').textContent).toBe('Edit this chart');
    expect(f.q('[data-tc-description]').value).toBe('Apples outnumber pears.');
    setValue(f.q('[data-tc-description]'), 'More apples than pears.');
    f.click('[data-tc-apply-chart]');
    expect(f.changes.at(-1)).toBe(inserted.replace('Apples outnumber pears.', 'More apples than pears.'));
  });
  it('Escape closes the panel and returns focus to its button', () => {
    const f = mount('Text.');
    f.click('[data-tc-open="chart"]');
    act(() => { f.q('[data-tc-panel]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(f.q('[data-tc-panel]')).toBeNull();
    expect(document.activeElement).toBe(f.q('[data-tc-open="chart"]'));
  });
});

describe('Table and chart wiring and generator captions', () => {
  const { readFileSync } = require('node:fs');
  it('both editors mount the tools on their own textarea and change handler', () => {
    const simplified = readFileSync('view_simplified_module.js', 'utf8');
    const analysis = readFileSync('view_analysis_module.js', 'utf8');
    expect(/TableChartTools,\s*\{\s*t:\s*t,\s*textareaRef:\s*textEditorRef,\s*getText:\s*\(\)\s*=>\s*generatedContent\?\.data,\s*onChange:\s*handleSimplifiedTextChange/.test(simplified), 'Adapted Text wiring').toBe(true);
    expect(/TableChartTools,\s*\{\s*t:\s*t,\s*textareaRef:\s*analysisEditorRef,\s*getText:\s*\(\)\s*=>\s*generatedContent\?\.data\.originalText,\s*onChange:\s*handleAnalysisTextChange/.test(analysis), 'Analyze Source wiring').toBe(true);
  });
  it('the Adapted Text generator asks for "Table:" captions and chart descriptions', () => {
    const dispatcher = readFileSync('generate_dispatcher_module.js', 'utf8');
    expect(dispatcher.includes('Put a caption on the line directly above it, written as "Table: "'), 'table caption').toBe(true);
    expect(dispatcher.includes('Always write the prefix "Table: " in English'), 'english prefix').toBe(true);
    expect(dispatcher.includes('Every chart needs a "description"'), 'chart description').toBe(true);
  });
});
