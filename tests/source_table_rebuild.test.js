// (2026-11-06) A real data table the AI wrote as a list comes back from the original page's own cells, with no AI call.
// What must NOT happen matters more: a label-and-blank form, a list laid out with a table, or a passage that only shares words with a
// table must be left exactly as it is, because replacing good text with a wrong table is worse than the caution that stays behind.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve('doc_pipeline_source.jsx'), 'utf8');
const fnOf = (name) => { const i = SRC.indexOf('function ' + name + '('); return SRC.slice(i, SRC.indexOf('\n}\n', i) + 3); };
const measure = sliceBetween(SRC, 'function _alloRuledTablesOnPage(', '// _computeStructuralFidelityNotes: compares the SOURCE text');
const { ruled, tagged, byId, dataGrid, rebuild } = new Function(
  [fnOf('_alloJoinOrderedTextItems'), fnOf('_validateTableGrid'), fnOf('_emitAccessibleTableHtml'), measure].join('\n')
  + '\nreturn { ruled: _alloRuledTablesOnPage, tagged: _alloTaggedTablesOnPage, byId: _alloTextByMarkedId, dataGrid: _alloDataTableGrid, rebuild: _alloRebuildFlattenedTables };',
)();

const OPS = { save: 1, restore: 2, transform: 3, constructPath: 4, rectangle: 5, moveTo: 6, lineTo: 7, curveTo: 8, curveTo2: 9, curveTo3: 10, stroke: 11, closeStroke: 12, fill: 13, eoFill: 14, fillStroke: 15, eoFillStroke: 16, closeFillStroke: 17, closeEOFillStroke: 18, endPath: 19, paintFormXObjectBegin: 20, paintFormXObjectEnd: 21 };
const line = (x0, y0, x1, y1) => [[OPS.constructPath, [[OPS.moveTo, OPS.lineTo], [x0, y0, x1, y1], [0, 0, 0, 0]]], [OPS.stroke]];
const X0 = 70, Y0 = 500, CW = 150, RH = 20;
const grid = (rows, cols, { skipV = () => false, skipH = () => false } = {}) => {
  const ops = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) if (!skipH(r, c)) ops.push(...line(X0 + c * CW, Y0 + r * RH, X0 + (c + 1) * CW, Y0 + r * RH));
  for (let c = 0; c <= cols; c++) for (let r = 0; r < rows; r++) if (!skipV(c, r)) ops.push(...line(X0 + c * CW, Y0 + r * RH, X0 + c * CW, Y0 + (r + 1) * RH));
  return ops;
};
const at = (row, col, str, rows, width = 40, dx = 5) => ({ str, transform: [10, 0, 0, 10, X0 + col * CW + dx, Y0 + (rows - 1 - row) * RH + 5], width, height: 10 });
const run = (ops, items) => ruled(ops.map((o) => o[0]), ops.map((o) => o[1] || []), OPS, items, 612, true);
const texts = (g) => g.map((r) => r.cells.map((c) => c.text));

const R = (...cells) => ({ cells: cells.map((text) => ({ text, isHeader: false, colspan: 1 })) });
const H = (...cells) => ({ cells: cells.map((text) => ({ text, isHeader: true, colspan: 1 })) });
const ELEMENTS = [R('Element', 'Percent by weight'), R('Oxygen', '46.6'), R('Silicon', '27.7'), R('Iron', '5.0')];
const elements = () => ({ page: 9, grid: dataGrid(ELEMENTS) });
const page = (body) => '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><main><h1>Doc</h1><p>Before the table.</p>' + body + '<p>After the table.</p></main></body></html>';
const FLAT = '<ul><li>Element, Percent by weight</li><li>Oxygen, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0</li></ul>';
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

describe('reading the original page\'s cells from its rules', () => {
  it('reads rows top down, left to right', () => {
    const [t] = run(grid(3, 2), [at(0, 0, 'Name', 3), at(0, 1, 'Value', 3), at(1, 0, 'Oxygen', 3), at(1, 1, '46.6', 3), at(2, 0, 'Iron', 3), at(2, 1, '5.0', 3)]);
    expect(texts(t.grid)).toEqual([['Name', 'Value'], ['Oxygen', '46.6'], ['Iron', '5.0']]);
  });
  it('keeps two lines of one cell in order, and a kerned word whole', () => {
    const wrapped = [at(0, 0, 'Name', 3), at(0, 1, 'Value', 3), at(1, 0, 'Oxygen', 3), { str: 'first', transform: [10, 0, 0, 10, X0 + CW + 5, Y0 + RH + 11], width: 20, height: 10 }, { str: 'second', transform: [10, 0, 0, 10, X0 + CW + 5, Y0 + RH + 2], width: 20, height: 10 }, at(2, 0, 'Iron', 3), at(2, 1, '5.0', 3)];
    expect(run(grid(3, 2), wrapped)[0].grid[1].cells[1].text).toBe('first second');
    const kerned = [at(0, 0, 'Oxy', 3, 20), { ...at(0, 0, 'gen', 3, 20), transform: [10, 0, 0, 10, X0 + 25, Y0 + 2 * RH + 5] }, at(0, 1, 'Value', 3), at(1, 0, 'A', 3), at(1, 1, 'B', 3), at(2, 0, 'C', 3), at(2, 1, 'D', 3)];
    expect(run(grid(3, 2), kerned)[0].grid[0].cells[0].text).toBe('Oxygen');
  });
  it('keeps a raised footnote mark after its word, not on a line above it (FDA letter)', () => {
    const y = Y0 + RH + 5;
    const word = { str: 'Submission', transform: [10, 0, 0, 10, X0 + CW + 5, y], width: 50, height: 10 };
    const mark = { str: '*', transform: [6.6, 0, 0, 6.6, X0 + CW + 55.3, y + 4], width: 3, height: 6.6 };
    const items = [at(0, 0, 'Name', 3), at(0, 1, 'Value', 3), at(1, 0, 'Oxygen', 3), word, mark, at(2, 0, 'Iron', 3), at(2, 1, '5.0', 3)];
    expect(run(grid(3, 2), items)[0].grid[1].cells[1].text).toBe('Submission*');
  });
  it('leaves small text that has no line beside it where it is', () => {
    const small = { str: 'note', transform: [6, 0, 0, 6, X0 + CW + 5, Y0 + RH + 14], width: 15, height: 6 };
    const big = { str: 'Total', transform: [14, 0, 0, 14, X0 + CW + 5, Y0 + RH + 2], width: 30, height: 14 };
    const items = [at(0, 0, 'Name', 3), at(0, 1, 'Value', 3), at(1, 0, 'Oxygen', 3), small, big, at(2, 0, 'Iron', 3), at(2, 1, '5.0', 3)];
    expect(run(grid(3, 2), items)[0].grid[1].cells[1].text).toBe('note Total');
  });
  it('turns a missing rule between columns into a colspan', () => {
    const ops = grid(3, 3, { skipV: (c, r) => c === 1 && r === 2 }); // top row: first two cells merged
    const [t] = run(ops, [at(0, 0, 'Group', 3), at(0, 2, 'Total', 3), at(1, 0, 'a', 3), at(1, 1, 'b', 3), at(1, 2, 'c', 3), at(2, 0, 'd', 3), at(2, 1, 'e', 3), at(2, 2, 'f', 3)]);
    expect(t.grid[0].cells.map((c) => [c.text, c.colspan])).toEqual([['Group', 2], ['Total', 1]]);
  });
  it('gives up when a missing rule between rows makes a merged cell', () => {
    const ops = grid(3, 2, { skipH: (r, c) => r === 1 && c === 0 });
    const [t] = run(ops, [at(0, 0, 'Name', 3), at(0, 1, 'Value', 3), at(1, 0, 'Oxygen', 3), at(1, 1, '46.6', 3), at(2, 1, '5.0', 3)]);
    expect(t.rows).toBe(3); // still counted as a table
    expect(t.grid).toBeNull();
  });
  it('gives up when a piece of text runs across a rule', () => {
    const [t] = run(grid(3, 2), [at(0, 0, 'Name', 3), at(0, 1, 'Value', 3), at(1, 0, 'Oxygen', 3, 200), at(1, 1, '46.6', 3), at(2, 0, 'Iron', 3), at(2, 1, '5.0', 3)]);
    expect(t.grid).toBeNull();
  });
  it('adds no grid unless asked, so the count stays as it was', () => {
    const ops = grid(3, 2);
    const t = ruled(ops.map((o) => o[0]), ops.map((o) => o[1] || []), OPS, [at(0, 0, 'A', 3), at(1, 0, 'B', 3), at(2, 0, 'C', 3)], 612);
    expect(t).toEqual([{ rows: 3, cols: 2, cells: 6 }]);
  });
});

describe('reading the author\'s tagged cells', () => {
  const td = (id, role = 'TD') => ({ role, children: [{ role: 'P', children: [{ type: 'content', id }] }] });
  const tree = { role: 'Root', children: [{ role: 'Table', children: [{ role: 'THead', children: [{ role: 'TR', children: [td('a', 'TH'), td('b', 'TH')] }] }, { role: 'TR', children: [td('c'), td('d')] }] }] };
  const items = [
    { type: 'beginMarkedContentProps', id: 'a' }, { str: 'Name' }, { type: 'endMarkedContent' },
    { type: 'beginMarkedContentProps', id: 'b' }, { str: 'Va' }, { str: 'lue' }, { type: 'endMarkedContent' },
    { type: 'beginMarkedContent', tag: 'Artifact' }, { str: 'page 3' }, { type: 'endMarkedContent' },
    { type: 'beginMarkedContentProps', id: 'c' }, { str: 'two', hasEOL: true }, { str: 'lines' }, { type: 'endMarkedContent' },
    { type: 'beginMarkedContentProps', id: 'd' }, { str: '5' }, { type: 'endMarkedContent' },
  ];
  it('takes each cell\'s own text and whether it is a header', () => {
    const [t] = tagged(tree, byId(items));
    expect(t.grid[0].cells).toEqual([{ text: 'Name', isHeader: true, colspan: 1 }, { text: 'Value', isHeader: true, colspan: 1 }]);
    expect(texts(t.grid)[1]).toEqual(['two lines', '5']);
  });
  it('leaves text outside any tag out of every cell', () => {
    expect(JSON.stringify(tagged(tree, byId(items)))).not.toContain('page 3');
  });
  it('adds no grid unless given the text', () => {
    expect(tagged(tree)).toEqual([{ rows: 2, cols: 2, cells: 4 }]);
  });
});

describe('what counts as a data table', () => {
  it('accepts labels and values', () => {
    expect(dataGrid(ELEMENTS)).toBeTruthy();
  });
  it('refuses label-and-blank, the state complaint form', () => {
    expect(dataGrid([R('Name', ''), R('Address', ''), R('City', ''), R('Phone', '')])).toBeNull();
  });
  it('refuses a column that is mostly blank, even when the table overall is well filled', () => {
    expect(dataGrid([R('a', 'b', 'c', 'd', ''), R('e', 'f', 'g', 'h', ''), R('i', 'j', 'k', 'l', ''), R('m', 'n', 'o', 'p', 'q'), R('r', 's', 't', 'u', '')])).toBeNull();
  });
  it('refuses a table a third blank, even when no one column is mostly blank', () => {
    expect(dataGrid([R('a', '', 'c', 'd'), R('', 'f', '', 'h'), R('i', '', 'k', ''), R('m', 'n', '', 'p'), R('', 's', 't', '')])).toBeNull();
  });
  it('refuses rows of different widths: tags like this usually hold page layout', () => {
    expect(dataGrid([R('a', 'b', 'c'), R('d', 'e'), R('f', 'g', 'h')])).toBeNull();
  });
  it('refuses values stacked in one cell, which hide rows the source never separated', () => {
    expect(dataGrid([R('Status', 'Number', 'Amount'), R('Single', '1 2', '$17,750 19,750'), R('Joint', '1 2 3', '$33,100 34,700 36,300')])).toBeNull();
    expect(dataGrid([R('Status', 'Number'), R('Single', '1 2'), R('Joint', '1')])).toBeTruthy(); // one stacked cell is only a cell
  });
  it('refuses a numbered list laid out with a table', () => {
    expect(dataGrid([R('1.', 'You owe special taxes'), R('2.', 'You received advance payments'), R('3.', 'You had net earnings')])).toBeNull();
    expect(dataGrid([R('a)', 'first'), R('b)', 'second'), R('c)', 'third')])).toBeNull();
    expect(dataGrid([R('•', 'first'), R('•', 'second')])).toBeNull();
  });
  it('still accepts a real table with a numbered first column, once it has more columns', () => {
    expect(dataGrid([R('No.', 'Study', 'Date'), R('1.', 'Protocol', 'Jul 31'), R('2.', 'Start', 'Nov 30'), R('3.', 'Report', 'Dec 15'), R('4.', 'Close', 'Dec 31')])).toBeTruthy();
  });
  it('refuses two columns of passages', () => {
    const long = 'word '.repeat(30).trim();
    expect(dataGrid([R('Question one', long), R('Question two', long), R('Question three', long)])).toBeNull();
  });
  it('ignores an empty row and drops nothing else', () => {
    expect(dataGrid([R('Element', 'Percent'), R('', ''), R('Oxygen', '46.6'), R('Iron', '5.0')]).rows).toHaveLength(3);
  });
  it('needs two real rows', () => {
    expect(dataGrid([R('only', 'one')])).toBeNull();
    expect(dataGrid([R('Title'), R('a', 'b')])).toBeNull();
    expect(dataGrid(null)).toBeNull();
  });
  it('moves a short title row to the caption, and spans a section row across the table', () => {
    const g = dataGrid([R('Elements in the crust'), R('Element', 'Percent'), R('Oxygen', '46.6'), R('Metals'), R('Iron', '5.0')]);
    expect(g.caption).toBe('Elements in the crust');
    expect(g.rows.map((r) => r.cells.length)).toEqual([2, 2, 1, 2]);
    expect(g.rows[2].cells[0].colspan).toBe(2);
  });
  it('keeps a long first row as a row, since a caption that long is not a title', () => {
    const g = dataGrid([R('word '.repeat(30).trim()), R('Element', 'Percent'), R('Oxygen', '46.6'), R('Iron', '5.0')]);
    expect(g.caption).toBeUndefined();
    expect(g.rows).toHaveLength(4);
  });
});

describe('finding the headers', () => {
  const heads = (g) => g.rows.map((r) => r.cells.map((c) => (c.isHeader ? c.scope : '-')));
  it('trusts the author\'s tags: a full row is column headers, a first cell is a row header', () => {
    const g = dataGrid([H('Item', 'Cost'), { cells: [{ text: 'Paper', isHeader: true, colspan: 1 }, { text: '5', isHeader: false, colspan: 1 }] }]);
    expect(heads(g)).toEqual([['col', 'col'], ['row', '-']]);
  });
  it('does not guess when the author tagged any headers', () => {
    const g = dataGrid([R('Element', 'Percent'), { cells: [{ text: 'Oxygen', isHeader: true, colspan: 1 }, { text: '46.6', isHeader: false, colspan: 1 }] }, R('Iron', '5.0')]);
    expect(heads(g)[0]).toEqual(['-', '-']);
  });
  it('without tags, marks a word row above a column of values', () => {
    expect(heads(dataGrid(ELEMENTS))[0]).toEqual(['col', 'col']);
  });
  it('without tags, marks nothing when the top row holds a value', () => {
    expect(heads(dataGrid([R('Oxygen', '46.6'), R('Silicon', '27.7'), R('Iron', '5.0')])).flat().every((h) => h === '-')).toBe(true);
  });
  it('without tags, marks nothing when no column holds values, since words above words prove nothing', () => {
    expect(heads(dataGrid([R('Name', 'Smith'), R('School', 'Lincoln'), R('City', 'Portland')])).flat().every((h) => h === '-')).toBe(true);
  });
});

describe('putting a flattened table back', () => {
  it('rebuilds it from one list item per row, in place', () => {
    const r = rebuild(page(FLAT), [elements()]);
    expect(r.rebuilt).toEqual([{ page: 9, rows: 4, cols: 2 }]);
    const d = parse(r.html);
    expect(d.querySelector('ul')).toBeNull();
    const t = d.querySelector('table');
    expect(Array.from(t.querySelectorAll('th')).map((x) => x.textContent)).toEqual(['Element', 'Percent by weight']);
    expect(Array.from(t.querySelectorAll('tbody tr')).map((x) => Array.from(x.children).map((c) => c.textContent))).toEqual([['Oxygen', '46.6'], ['Silicon', '27.7'], ['Iron', '5.0']]);
    expect(t.previousElementSibling.textContent).toBe('Before the table.');
    expect(t.nextElementSibling.textContent).toBe('After the table.');
    expect(r.html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
  it('rebuilds it from paragraphs, and from one block per cell', () => {
    expect(rebuild(page('<p>Element Percent by weight</p><p>Oxygen 46.6</p><p>Silicon 27.7</p><p>Iron 5.0</p>'), [elements()]).rebuilt).toHaveLength(1);
    expect(rebuild(page(['Element', 'Percent by weight', 'Oxygen', '46.6', 'Silicon', '27.7', 'Iron', '5.0'].map((c) => '<p>' + c + '</p>').join('')), [elements()]).rebuilt).toHaveLength(1);
    expect(rebuild(page('<p>Element Percent by weight Oxygen 46.6 Silicon 27.7 Iron 5.0</p>'), [elements()]).rebuilt).toHaveLength(1);
  });
  it('accepts a list that repeats the column label in every row', () => {
    expect(rebuild(page('<ul><li><strong>Element:</strong> Oxygen, <strong>Percent by weight:</strong> 46.6</li><li>Element: Silicon, Percent by weight: 27.7</li><li>Element: Iron, Percent by weight: 5.0</li></ul>'), [elements()]).rebuilt).toHaveLength(1);
  });
  it('tolerates a block wrapped in a section', () => {
    const r = rebuild('<!DOCTYPE html><html><body><main><section><p>Intro words.</p>' + FLAT + '<p>Outro words.</p></section></main></body></html>', [elements()]);
    expect(parse(r.html).querySelector('section > table')).toBeTruthy();
  });
  it('escapes cell text, so a source cell cannot become markup', () => {
    const g = dataGrid([R('Item', 'Cost'), R('<b>x</b> & y', '5'), R('z', '6'), R('w', '7')]);
    const r = rebuild(page('<ul><li>Item Cost</li><li>&lt;b&gt;x&lt;/b&gt; &amp; y 5</li><li>z 6</li><li>w 7</li></ul>'), [{ page: 1, grid: g }]);
    const d = parse(r.html);
    expect(d.querySelector('table b')).toBeNull();
    expect(d.querySelector('tbody td').textContent).toBe('<b>x</b> & y');
  });
  it('splits a list that holds more than the table, keeping the rest and its numbering', () => {
    const r = rebuild(page('<ol start="3"><li>Keep me first</li><li>Element, Percent by weight</li><li>Oxygen, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0</li><li>Keep me last</li></ol>'), [elements()]);
    const d = parse(r.html), lists = d.querySelectorAll('ol');
    expect(lists).toHaveLength(2);
    expect(lists[0].textContent).toBe('Keep me first');
    expect(lists[0].nextElementSibling.tagName).toBe('TABLE');
    expect(lists[1].textContent).toBe('Keep me last');
    expect(lists[1].getAttribute('start')).toBe('8');
  });
  it('does not copy a list\'s id onto its second half', () => {
    const r = rebuild(page('<ul id="only"><li>Keep me first</li><li>Element, Percent by weight</li><li>Oxygen, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0</li><li>Keep me</li></ul>'), [elements()]);
    expect(r.rebuilt).toHaveLength(1);
    expect(parse(r.html).querySelectorAll('ul')).toHaveLength(2);
    expect(parse(r.html).querySelectorAll('[id="only"]')).toHaveLength(1);
  });
  it('rebuilds two tables in one document', () => {
    const other = { page: 10, grid: dataGrid([R('Metal', 'Grams'), R('Copper', '12.5'), R('Gold', '0.2'), R('Lead', '3.1')]) };
    const r = rebuild(page(FLAT + '<p>Between the two.</p><ul><li>Metal Grams</li><li>Copper 12.5</li><li>Gold 0.2</li><li>Lead 3.1</li></ul>'), [elements(), other]);
    expect(r.rebuilt.map((x) => x.page)).toEqual([9, 10]);
    expect(parse(r.html).querySelectorAll('table')).toHaveLength(2);
    expect(parse(r.html).body.textContent).toContain('Between the two.');
  });
  it('restores a word the AI dropped, since the source is right', () => {
    const names = ['Oxygen', 'Silicon', 'Iron', 'Copper', 'Gold', 'Lead', 'Zinc', 'Tin', 'Nickel', 'Cobalt'];
    const g = dataGrid([R('Element', 'Percent'), ...names.map((n, i) => R(n, String(i + 10)))]);
    const r = rebuild(page('<ul><li>Element, Percent</li>' + names.map((n, i) => '<li>' + n + (i === 9 ? '' : ', ' + (i + 10)) + '</li>').join('') + '</ul>'), [{ page: 1, grid: g }]);
    expect(r.rebuilt).toHaveLength(1); // 21 of 22 words
    expect(parse(r.html).querySelector('table').textContent).toContain('19');
  });
});

describe('leaving the output alone', () => {
  const same = (body, tables = [elements()]) => { const html = page(body); const r = rebuild(html, tables); expect(r.rebuilt).toEqual([]); expect(r.html).toBe(html); };
  it('when the table is already a table', () => {
    same('<table><tr><th>Element</th><th>Percent by weight</th></tr><tr><td>Oxygen</td><td>46.6</td></tr><tr><td>Silicon</td><td>27.7</td></tr><tr><td>Iron</td><td>5.0</td></tr></table>');
  });
  it('when the AI kept the table and also listed the same values', () => {
    same('<table><tr><td>Element</td><td>Percent by weight</td></tr><tr><td>Oxygen</td><td>46.6</td></tr><tr><td>Silicon</td><td>27.7</td></tr><tr><td>Iron</td><td>5.0</td></tr></table>' + FLAT);
  });
  it('when part of a table across two pages is already inside one output table', () => {
    same('<table><tr><td>Element</td><td>Percent by weight</td></tr><tr><td>Oxygen</td><td>46.6</td></tr><tr><td>Silicon</td><td>27.7</td></tr><tr><td>Iron</td><td>5.0</td></tr><tr><td>Lead</td><td>1.0</td></tr></table>');
  });
  it('when the blocks hold a word the table does not', () => {
    same('<ul><li>Element, Percent by weight</li><li>Oxygen is common, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0</li></ul>');
  });
  it('when a number differs: a changed value is not this table', () => {
    same('<ul><li>Element, Percent by weight</li><li>Oxygen, 46.7</li><li>Silicon, 27.7</li><li>Iron, 5.0</li></ul>');
  });
  it('when a number appears more often than the table has it', () => {
    same('<ul><li>Element, Percent by weight</li><li>Oxygen, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0, 5.0</li></ul>');
  });
  it('when under 90% of the table is there', () => {
    same('<ul><li>Oxygen, 46.6</li><li>Silicon, 27.7</li></ul>');
  });
  it('when a heading sits among the rows, which would be lost', () => {
    same('<ul><li>Element, Percent by weight</li><li>Oxygen, 46.6</li></ul><h2>Silicon</h2><ul><li>27.7</li><li>Iron, 5.0</li></ul>');
  });
  it('when a block holds a link, which a cell would lose', () => {
    same('<ul><li>Element, Percent by weight</li><li><a href="https://x.test/">Oxygen</a>, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0</li></ul>');
  });
  it('when a figure or image sits among the rows', () => {
    same('<ul><li>Element, Percent by weight</li><li>Oxygen, 46.6</li></ul><figure><img src="a.png" alt="x"></figure><ul><li>Silicon, 27.7</li><li>Iron, 5.0</li></ul>');
    same('<ul><li>Element, Percent by weight</li><li>Oxygen <img src="a.png" alt="x">, 46.6</li><li>Silicon, 27.7</li><li>Iron, 5.0</li></ul>');
  });
  it('when the words sit in the preserved content box', () => {
    same('<section aria-label="Preserved source content">' + FLAT + '</section>');
    same('<div data-source-restored="1">' + FLAT + '</div>');
  });
  it('when the table is too small to tell', () => {
    same('<ul><li>a 1</li><li>b 2</li></ul>', [{ page: 1, grid: { rows: [R('a', '1'), R('b', '2')] } }]);
  });
  it('when the grid would not validate', () => {
    same(FLAT, [{ page: 1, grid: { rows: [R('Element', 'Percent', 'by', 'weight'), R('Oxygen', '46.6'), R('Silicon', '27.7'), R('Iron', '5.0')] } }]);
  });
  it('when there is nothing to work with', () => {
    expect(rebuild('', [elements()]).rebuilt).toEqual([]);
    expect(rebuild(page(FLAT), null).html).toBe(page(FLAT));
    expect(rebuild(page(FLAT), [{ page: 1 }, null]).rebuilt).toEqual([]);
  });
});

describe('wiring into a run', () => {
  const stripped = SRC.replace(/\s+/g, ' ');
  it('runs before the checkers and the tagged PDF, then repeats the deterministic fixes on the result', () => {
    const at = SRC.indexOf('const _rb = _alloRebuildFlattenedTables(accessibleHtml, _grids);');
    expect(at).toBeGreaterThan(0);
    expect(SRC.indexOf('accessibleHtml = runDeterministicWcagFixes(_rb.html);')).toBeGreaterThan(at);
    expect(at).toBeLessThan(SRC.indexOf('// ── Engine consensus (2026-06-10)'));
  });
  it('starts each run with no cells from the last document', () => {
    expect(stripped.includes('window.__alloSourceTableGrids = null; // and for the cells')).toBe(true);
  });
  it('never collects cells from a form page or a rotated page', () => {
    expect(stripped.includes('if (t.grid && !_pageWidgets && !page.rotate && _srcTableGridCells < 50000)')).toBe(true);
  });
  it('says what it did, as a caution', () => {
    expect(stripped.includes("kind: 'tablesRebuilt', caution: true")).toBe(true);
    expect(stripped.includes("if (kinds.tablesRebuilt) cautions.push(")).toBe(true);
  });
  it('keeps the note through a re-fix: it describes what this run did and cannot be recomputed from the HTML', () => {
    const lists = SRC.match(/_RE(?:COMPUTABLE|FIX_LANE_RECOMPUTED)_FIDELITY_KINDS = \{[^}]*\}/g) || [];
    expect(lists.length).toBeGreaterThanOrEqual(1);
    lists.forEach((l) => expect(l).not.toContain('tablesRebuilt'));
  });
});
