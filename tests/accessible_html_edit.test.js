// accessible_html_edit (2026-11-08): the structure-only edits a person asks for by conversation ("make that an H3",
// "that picture is decorative", "move this up"). The module is one function that runs in the headless page in production;
// here it runs against jsdom's DOMParser so every operation and every refusal is checked fast, with no browser.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const requireCjs = createRequire(import.meta.url);
const { accessibleHtmlTool, OPERATION_NAMES, OPERATION_KEYS } = requireCjs('../desktop/mcp/accessible_html_edit.cjs');
const DP = new JSDOM('').window.DOMParser;
const run = (html, mode, payload) => accessibleHtmlTool(html, mode, payload, DP);
const outline = (html, payload) => run(html, 'outline', payload || {});
const edit = (html, operations) => run(html, 'edit', { operations });
const parse = (html) => new DP().parseFromString(html, 'text/html');
// per text node, like the tool: this fixture is minified, so textContent would glue neighbouring blocks into one word
const words = (html) => { const d = parse(html); const w = d.createTreeWalker(d.body, 4); let n = 0; while (w.nextNode()) n += (w.currentNode.nodeValue.match(/\S+/g) || []).length; return n; };

const DOC = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Water Cycle Guide</title></head><body>'
  + '<header><p>Skip</p></header><main id="main-content"><h1>Water Cycle Guide</h1>'
  + '<h2>Evaporation</h2><p>Heat from the sun turns liquid water into vapor.</p>'
  + '<h2>Condensation</h2><p>Cooling vapor forms tiny droplets.</p>'
  + '<h2>Precipitation</h2><p>Heavy droplets fall as rain.</p>'
  + '<figure><img src="data:image/png;base64,AAAA"><figcaption>Rain over hills</figcaption></figure>'
  + '<img src="img/sun.png" alt="">'
  + '<table><tr><td>Stage</td><td>Where</td></tr><tr><td>Rain</td><td>Sky</td></tr><tr><td>Snow</td><td>Hills</td></tr></table>'
  + '<p lang="es">El agua sube.</p><p>3</p></main></body></html>';
// element ids for DOC, found by what they are rather than hard-coded
const idOf = (html, text, kind) => { const o = outline(html, { kinds: ['heading', 'paragraph', 'list-item', 'image', 'table', 'landmark'] }); const hit = o.items.find((i) => (!kind || i.kind === kind) && (i.text === text || i.firstRow === text || i.caption === text || i.source === text)); if (!hit) throw new Error('no item ' + text + ' in ' + JSON.stringify(o.items.map((i) => i.text || i.source))); return hit.id; };

describe('outline', () => {
  it('numbers headings, images, tables and landmarks, and reports what is missing', () => {
    const o = outline(DOC);
    expect(o.document).toMatchObject({ title: 'Water Cycle Guide', lang: 'en', counts: { heading: 4, image: 2, table: 1, landmark: 2, paragraph: 6 } });
    const headings = o.items.filter((i) => i.kind === 'heading').map((h) => [h.level, h.text]);
    expect(headings).toEqual([[1, 'Water Cycle Guide'], [2, 'Evaporation'], [2, 'Condensation'], [2, 'Precipitation']]);
    const [figureImg, sunImg] = o.items.filter((i) => i.kind === 'image');
    expect(figureImg).toMatchObject({ alt: null, decorative: false, source: 'embedded image', caption: 'Rain over hills' }); // no alt at all = missing
    expect(sunImg).toMatchObject({ alt: '', decorative: true, source: 'sun.png' });
    expect(o.items.find((i) => i.kind === 'table')).toMatchObject({ rows: 3, columns: 2, headerRow: false, headerColumn: false, headerCells: 0, firstRow: 'Stage | Where' });
    expect(o.items.filter((i) => i.kind === 'landmark').map((l) => l.tag)).toEqual(['header', 'main']);
    expect(o.items.every((i) => /^e\d+$/.test(i.id))).toBe(true);
  });
  it('flags a skipped heading level in the document and on the heading that skips', () => {
    const o = outline('<body><h1>A</h1><h3>B</h3></body>');
    expect(o.document.headingSkips).toEqual([expect.objectContaining({ text: 'B', from: 1, to: 3 })]);
    expect(o.items.find((i) => i.text === 'B').skipsFrom).toBe(1);
  });
  it('finds a paragraph by its words, so "that page number" can be addressed', () => {
    const o = outline(DOC, { textContains: 'sky' });
    expect(o.items).toEqual([]); // "Sky" is in a table cell, which is not an addressable kind
    const rain = outline(DOC, { textContains: 'droplets' });
    expect(rain.items.map((i) => [i.kind, i.text])).toEqual([['paragraph', 'Cooling vapor forms tiny droplets.'], ['paragraph', 'Heavy droplets fall as rain.']]);
    expect(outline(DOC, { textContains: 'HEAVY' }).matching).toBe(1); // case-insensitive
  });
  it('lists language changes when asked, and caps the list', () => {
    const lang = outline(DOC, { kinds: ['language'] });
    expect(lang.items).toEqual([expect.objectContaining({ kind: 'paragraph', lang: 'es', text: 'El agua sube.' })]);
    const capped = outline(DOC, { kinds: ['paragraph'], maxItems: 2 });
    expect(capped.items).toHaveLength(2);
    expect(capped).toMatchObject({ matching: 6, truncated: true });
  });
  it('gives the same ids every time for the same file', () => {
    expect(outline(DOC).items.map((i) => i.id)).toEqual(outline(DOC).items.map((i) => i.id));
  });
});

describe('edit operations', () => {
  it('changes a heading level and turns a paragraph into a heading, keeping the words and attributes', () => {
    const html = '<body><h1>T</h1><h2 id="keep" class="x">Part</h2><p>Details</p></body>';
    const id2 = idOf(html, 'Part'); const idP = idOf(html, 'Details');
    const out = edit(html, [{ op: 'set_heading_level', id: id2, level: 3 }, { op: 'set_heading_level', id: idP, level: 4 }]);
    expect(out.ok).toBe(true);
    const d = parse(out.html);
    expect(d.querySelector('h3#keep.x').textContent).toBe('Part');
    expect(d.querySelector('h4').textContent).toBe('Details');
    expect(d.querySelector('p')).toBeNull();
    expect(out.results.map((r) => r.summary)).toEqual(['Changed the level 2 heading "Part" to a level 3 heading', 'Changed the paragraph "Details" to a level 4 heading']);
    expect(out.words).toEqual({ before: 3, after: 3, removed: 0 });
    expect(out.headingSkips).toEqual([expect.objectContaining({ text: 'Part', from: 1, to: 3 })]); // 1, 3, 4: one skip
  });
  it('reports a skipped level the edit creates', () => {
    const html = '<body><h1>T</h1><h2>Part</h2></body>';
    const out = edit(html, [{ op: 'set_heading_level', id: idOf(html, 'Part'), level: 4 }]);
    expect(out.headingSkips).toEqual([expect.objectContaining({ text: 'Part', from: 1, to: 4 })]);
  });
  it('a no-change request says so and counts as no change', () => {
    const html = '<body><h2>Part</h2></body>';
    const out = edit(html, [{ op: 'set_heading_level', id: idOf(html, 'Part'), level: 2 }]);
    expect(out).toMatchObject({ ok: true, applied: 0 });
    expect(out.results[0]).toMatchObject({ changed: false });
    expect(out.results[0].summary).toMatch(/already level 2/);
  });
  it('keeps using an id after the element was replaced by an earlier operation', () => {
    const html = '<body><h2>Part</h2></body>';
    const id = idOf(html, 'Part');
    const out = edit(html, [{ op: 'set_heading_level', id, level: 3 }, { op: 'set_heading_level', id, level: 4 }]);
    expect(out.ok).toBe(true);
    expect(parse(out.html).querySelector('h4').textContent).toBe('Part');
  });
  it('turns a heading back into a paragraph', () => {
    const html = '<body><h2>Not really a heading</h2></body>';
    const out = edit(html, [{ op: 'make_paragraph', id: idOf(html, 'Not really a heading') }]);
    expect(parse(out.html).querySelector('p').textContent).toBe('Not really a heading');
    expect(parse(out.html).querySelector('h2')).toBeNull();
  });
  it('writes alternative text, or marks an image decorative, and refuses the ambiguous requests', () => {
    const id = idOf(DOC, 'embedded image', 'image');
    const sunId = idOf(DOC, 'sun.png', 'image');
    const out = edit(DOC, [{ op: 'set_alt_text', id, alt: 'Rain falling over green hills' }, { op: 'set_alt_text', id: sunId, alt: 'The sun' }]);
    expect(out.ok).toBe(true);
    const imgs = parse(out.html).querySelectorAll('img');
    expect(imgs[0].getAttribute('alt')).toBe('Rain falling over green hills');
    expect(imgs[1].getAttribute('alt')).toBe('The sun');
    const dec = edit(DOC, [{ op: 'set_alt_text', id, decorative: true }]);
    expect(parse(dec.html).querySelectorAll('img')[0].getAttribute('alt')).toBe('');
    expect(dec.results[0].summary).toMatch(/decorative/);
    for (const bad of [{ id }, { id, alt: 'x', decorative: true }, { id, alt: '   ' }, { id, alt: 'x'.repeat(501) }]) {
      const r = edit(DOC, [{ op: 'set_alt_text', ...bad }]);
      expect(r.ok, JSON.stringify(Object.keys(bad))).toBe(false);
    }
    expect(edit(DOC, [{ op: 'set_alt_text', id: idOf(DOC, 'Evaporation'), alt: 'x' }]).results[0].error).toMatch(/not an image/);
  });
  it('labels an svg that has role="img", and warns about a very long description', () => {
    const html = '<body><svg role="img" viewBox="0 0 1 1"><rect width="1" height="1"/></svg></body>';
    const id = outline(html).items.find((i) => i.kind === 'image').id;
    const out = edit(html, [{ op: 'set_alt_text', id, alt: 'A'.repeat(200) }]);
    expect(out.ok).toBe(true);
    expect(parse(out.html).querySelector('svg').getAttribute('aria-label')).toBe('A'.repeat(200));
    expect(out.warnings.join(' ')).toMatch(/200 characters/);
    expect(edit(html, [{ op: 'set_alt_text', id, decorative: true }]).results[0].error).toMatch(/only works on an <img>/);
  });
  it('marks the first row and first column of a table as headers with scope, and takes them back', () => {
    const id = idOf(DOC, 'Stage | Where');
    const out = edit(DOC, [{ op: 'set_table_header', id, first_row: true, first_column: true }]);
    expect(out.ok).toBe(true);
    const t = parse(out.html).querySelector('table');
    const row0 = Array.from(t.rows[0].cells); const row1 = Array.from(t.rows[1].cells);
    expect(row0.map((c) => [c.tagName, c.getAttribute('scope')])).toEqual([['TH', 'col'], ['TH', 'col']]);
    expect(row1.map((c) => [c.tagName, c.getAttribute('scope')])).toEqual([['TH', 'row'], ['TD', null]]);
    expect(Array.from(t.rows[2].cells)[0].tagName).toBe('TH');
    expect(out.words.after).toBe(out.words.before);
    // the outline now sees them
    expect(outline(out.html).items.find((i) => i.kind === 'table')).toMatchObject({ headerRow: true, headerColumn: true });
    const back = edit(out.html, [{ op: 'set_table_header', id: outline(out.html).items.find((i) => i.kind === 'table').id, first_row: false, first_column: false }]);
    expect(outline(back.html).items.find((i) => i.kind === 'table')).toMatchObject({ headerRow: false, headerColumn: false, headerCells: 0 });
    expect(edit(DOC, [{ op: 'set_table_header', id }]).results[0].error).toMatch(/first_row/);
  });
  it('keeps colspan on a cell that becomes a header and warns about merged cells', () => {
    const html = '<body><table><tr><td colspan="2">Group</td></tr><tr><td>a</td><td>b</td></tr></table></body>';
    const out = edit(html, [{ op: 'set_table_header', id: outline(html).items.find((i) => i.kind === 'table').id, first_row: true }]);
    expect(parse(out.html).querySelector('th').getAttribute('colspan')).toBe('2');
    expect(out.warnings.join(' ')).toMatch(/merged cells/);
  });
  it('sets the language of the document or of one element, and refuses a bad code', () => {
    const doc = edit(DOC, [{ op: 'set_language', lang: 'pt-BR' }]);
    expect(parse(doc.html).documentElement.getAttribute('lang')).toBe('pt-BR');
    const el = edit(DOC, [{ op: 'set_language', id: idOf(DOC, 'Heavy droplets fall as rain.'), lang: 'fr' }]);
    expect(parse(el.html).querySelector('p[lang="fr"]').textContent).toBe('Heavy droplets fall as rain.');
    for (const lang of ['english', 'e', '', 'en_US', undefined]) expect(edit(DOC, [{ op: 'set_language', lang }]).ok, String(lang)).toBe(false);
  });
  it('moves a block before or after another, and the words stay exactly the same', () => {
    const html = '<body><h2>One</h2><p>First para</p><h2>Two</h2><p>Second para</p></body>';
    const two = idOf(html, 'Two'); const sec = idOf(html, 'Second para'); const one = idOf(html, 'One');
    const out = edit(html, [{ op: 'move_element', id: two, before_id: one }, { op: 'move_element', id: sec, after_id: two }]);
    expect(out.ok).toBe(true);
    expect(Array.from(parse(out.html).body.children).map((e) => e.textContent)).toEqual(['Two', 'Second para', 'One', 'First para']);
    expect(out.results[1].summary).toBe('Moved the paragraph "Second para" to just after the level 2 heading "Two"');
    expect(out.words.removed).toBe(0);
  });
  it('moves list items only next to list items, and refuses moving something into itself', () => {
    const html = '<body><ul><li>a</li><li>b</li></ul><p>para</p></body>';
    const o = outline(html, { kinds: ['list-item', 'paragraph'] });
    const [a, b, para] = o.items.map((i) => i.id);
    const ok = edit(html, [{ op: 'move_element', id: b, before_id: a }]);
    expect(Array.from(parse(ok.html).querySelectorAll('li')).map((l) => l.textContent)).toEqual(['b', 'a']);
    expect(edit(html, [{ op: 'move_element', id: a, after_id: para }]).results[0].error).toMatch(/only whole blocks/);
    // e1 is the div, e2 the paragraph inside it
    expect(edit('<body><div><p>inner</p></div></body>', [{ op: 'move_element', id: 'e1', after_id: 'e2' }]).results[0].error).toMatch(/itself or into its own contents/);
    expect(edit(html, [{ op: 'move_element', id: a, before_id: b, after_id: b }]).results[0].error).toMatch(/exactly one of/);
  });
  it('deletes a leftover page number and says how many words left; a huge element needs a second look', () => {
    const id = idOf(DOC, '3');
    const out = edit(DOC, [{ op: 'delete_element', id }]);
    expect(out.ok).toBe(true);
    expect(out.results[0].summary).toBe('Removed the paragraph "3" (1 word)');
    expect(out.words).toEqual({ before: words(DOC), after: words(DOC) - 1, removed: 1 });
    expect(parse(out.html).body.textContent).not.toMatch(/\b3\b/);
    const big = '<body><main><section><p>' + 'word '.repeat(450) + '</p></section></main></body>';
    // e1 is main, e2 the section, e3 the paragraph
    const refused = edit(big, [{ op: 'delete_element', id: 'e2' }]);
    expect(refused.ok).toBe(false);
    expect(refused.results[0].error).toMatch(/450 words.*allow_large/);
    expect(edit(big, [{ op: 'delete_element', id: 'e2', allow_large: true }]).words.removed).toBe(450);
    expect(edit(big, [{ op: 'delete_element', id: 'e1' }]).results[0].error).toMatch(/main landmark/);
  });
  it('is all-or-nothing: one bad operation means no HTML is produced and the others are not applied', () => {
    const html = '<body><h2>Part</h2><p>x</p></body>';
    const out = edit(html, [{ op: 'set_heading_level', id: idOf(html, 'Part'), level: 3 }, { op: 'set_heading_level', id: 'e99', level: 3 }, { op: 'frobnicate', id: 'e1' }]);
    expect(out).toMatchObject({ ok: false, applied: 0, failed: 2 });
    expect(out.html).toBeUndefined();
    expect(out.results.map((r) => r.ok)).toEqual([true, false, false]);
    expect(out.results[1].error).toMatch(/no element e99/);
    expect(out.results[2].error).toMatch(/unknown operation "frobnicate"/);
  });
  it('refuses to touch an element an earlier operation removed', () => {
    const html = '<body><p>gone</p></body>';
    const id = idOf(html, 'gone');
    const out = edit(html, [{ op: 'delete_element', id }, { op: 'set_heading_level', id, level: 2 }]);
    expect(out.ok).toBe(false);
    expect(out.results[1].error).toMatch(/already removed or replaced/);
  });
  it('rejects a heading level that is not 1 to 6, and a heading made of an image or list', () => {
    const html = '<body><p>a</p><ul><li>b</li></ul></body>';
    const p = idOf(html, 'a');
    for (const level of [0, 7, 2.5, '3', undefined]) expect(edit(html, [{ op: 'set_heading_level', id: p, level }]).ok, String(level)).toBe(false);
    expect(edit(html, [{ op: 'set_heading_level', id: 'e2', level: 2 }]).results[0].error).toMatch(/not a heading or a paragraph/);
    expect(edit('<body><p> </p></body>', [{ op: 'set_heading_level', id: 'e1', level: 2 }]).results[0].error).toMatch(/no text/);
  });
  it('has no operation that can change words: every operation preserves the word count except delete_element', () => {
    expect(OPERATION_NAMES).toEqual(Object.keys(OPERATION_KEYS));
    expect(OPERATION_NAMES).not.toContain('set_text');
    const before = words(DOC);
    const out = edit(DOC, [
      { op: 'set_heading_level', id: idOf(DOC, 'Evaporation'), level: 3 },
      { op: 'set_alt_text', id: idOf(DOC, 'embedded image', 'image'), alt: 'Rain' },
      { op: 'set_table_header', id: idOf(DOC, 'Stage | Where'), first_row: true },
      { op: 'move_element', id: idOf(DOC, 'Heavy droplets fall as rain.'), before_id: idOf(DOC, 'Evaporation') },
    ]);
    expect(out.ok).toBe(true);
    expect(out.words).toMatchObject({ before: before, after: before, removed: 0 });
  });
  it('counts words per text node, so minified markup does not change the count when blocks move', () => {
    const html = '<body><p>alpha</p><p>beta</p><p>gamma</p></body>';
    const out = edit(html, [{ op: 'move_element', id: 'e3', before_id: 'e1' }]);
    expect(out.words).toEqual({ before: 3, after: 3, removed: 0 });
    expect(Array.from(parse(out.html).body.children).map((e) => e.textContent)).toEqual(['gamma', 'alpha', 'beta']);
  });
  it('produces a complete document with a doctype and the original head', () => {
    const out = edit(DOC, [{ op: 'set_language', lang: 'en-GB' }]);
    expect(out.html.startsWith('<!DOCTYPE html>\n<html lang="en-GB">')).toBe(true);
    expect(out.html).toContain('<title>Water Cycle Guide</title>');
    expect(out.html).toContain('<main id="main-content">');
  });
});
