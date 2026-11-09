// Word Sounds worksheet -> Page Designer (2026-11-09). The builder turns the
// Word Sounds item list into ordinary editable objects: numbered items in a
// grid that paginates by whole rows, sound boxes as outlined rects, pictures
// as data: images only, and the answer key on its own last page.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let ST;
beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

const T0 = 1751477000000;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const NOTE = 'This key was made before your edits. Check it if you change the items.';

const textOf = (o) => (o && o.type === 'text' ? o.runs[0].text : '');
const DISPLAYS = [
  { kind: 'boxes', count: 3 },
  { kind: 'letters', count: 4 },
  { kind: 'word', text: 'ship' },
  { kind: 'blank_word', letters: ['c', 'a', 't'], hidden: 1 },
  { kind: 'tiles', tiles: ['sh', 'i', 'p'] },
  { kind: 'map', sounds: ['k', 'a', 't'] },
  { kind: 'text', parts: [{ text: 'The' }, { before: 'big', after: 'ran.' }] },
  { kind: 'sounds' },
];
function resource(count, extra = {}) {
  const items = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    prompt: 'Say each sound in the word number ' + (i + 1) + '.',
    display: DISPLAYS[i % DISPLAYS.length],
    choices: i % 3 === 0 ? [{ label: 'cat' }, { label: 'cap' }, { label: 'cut', image: PNG }] : [],
    image: i % 4 === 0 ? PNG : undefined,
    answerText: 'answer ' + (i + 1),
  }));
  return Object.assign({
    title: 'Short a sounds',
    lang: 'en',
    pageSize: 'letter-portrait',
    sections: [{ heading: 'Sound boxes', directions: 'Put one sound in each box.', items }],
    key: items.map((it) => ({ n: it.n, text: it.answerText })),
    wordsToSay: ['cat', 'map'],
  }, extra);
}
const build = (r, o = {}) => ST.stWordSoundsWorksheetDocFromItems(r, Object.assign({ now: T0 }, o));

// Split objects into items by their numbered heading (reading order = array order).
function itemGroups(doc) {
  const note = doc.objects.findIndex((o) => textOf(o) === NOTE);
  const keyStart = note < 0 ? doc.objects.length : note - 1;
  const groups = [];
  doc.objects.slice(0, keyStart).forEach((o) => {
    if (o.type === 'text' && o.role === 'heading2' && /^\d+\. /.test(textOf(o))) groups.push([o]);
    else if (groups.length && !(o.type === 'text' && o.role === 'heading2')) groups[groups.length - 1].push(o);
  });
  return groups;
}

describe('stWordSoundsWorksheetDocFromItems', () => {
  it('builds a valid multi-page document whose ledger replays', () => {
    const doc = build(resource(18));
    expect(ST.stValidateDoc(doc)).toEqual([]);
    expect(ST.stScenePageCount(doc)).toBeGreaterThan(2);
    expect(doc.canvas.preset).toBe('letter-portrait');
    expect(doc.ledger.ops[0]).toMatchObject({ type: 'doc.template', template: 'word-sounds-worksheet', actor: 'import' });
    expect(doc.ledger.ops.every((op) => op.actor === 'import')).toBe(true);
    expect(textOf(doc.objects[0])).toBe('Short a sounds');
    expect(doc.objects[0].role).toBe('heading1');
    expect(doc.objects.some((o) => textOf(o) === 'Name')).toBe(true);
    expect(doc.objects.some((o) => textOf(o) === 'Put one sound in each box.')).toBe(true);
    expect(doc.provenance).toMatchObject({ origin: 'word-sounds-worksheet', itemCount: 18 });
  });

  it('never splits an item across pages and keeps every object on its page', () => {
    for (const pageSize of ['letter-portrait', 'a4-portrait']) {
      const doc = build(resource(23, { pageSize }));
      const groups = itemGroups(doc);
      expect(groups.length).toBe(23);
      groups.forEach((g) => {
        const pages = new Set(g.map((o) => ST.stObjectPage(o)));
        expect(pages.size).toBe(1);
      });
      doc.objects.forEach((o) => {
        expect(o.frame.y + o.frame.h).toBeLessThanOrEqual(doc.canvas.h);
        expect(o.frame.x + o.frame.w).toBeLessThanOrEqual(doc.canvas.w);
      });
      expect(ST.stAnalyzeDoc(doc).issues.filter((i) => i.type === 'bounds')).toEqual([]);
    }
  });

  it('draws sound boxes as outlined rects and write-ins as rects', () => {
    const doc = build({ title: 'Boxes', sections: [{ items: [{ n: 1, prompt: 'Sounds in ship', display: { kind: 'boxes', count: 3 } }, { n: 2, prompt: 'Unscramble', display: { kind: 'tiles', tiles: ['p', 'i', 'sh'] } }] }] });
    const [first, second] = itemGroups(doc);
    const boxes = first.filter((o) => o.type === 'shape');
    expect(boxes.length).toBe(3);
    boxes.forEach((b) => {
      expect(b).toMatchObject({ shape: 'rect', fill: '#ffffff', decorative: true });
      expect(b.stroke).toMatchObject({ dash: 'solid', width: 2 });
      expect(b.frame.w).toBe(b.frame.h);
    });
    // three tile chips (rect + label each) and one write-in rect
    expect(second.filter((o) => o.type === 'shape').length).toBe(4);
    expect(second.filter((o) => o.type === 'text').map(textOf)).toEqual(['2. Unscramble', 'p', 'i', 'sh']);
  });

  it('lays out every display kind and choice chips as editable text in bordered rects', () => {
    const doc = build(resource(8));
    const texts = doc.objects.map(textOf);
    expect(texts).toContain('ship');
    expect(texts).toContain('c_t');
    expect(texts).toContain('/k/');
    expect(texts).toContain('The big ______ ran.');
    expect(texts).toContain('Listen.');
    const g = itemGroups(doc)[0];
    const chipLabels = g.filter((o) => ['cat', 'cap'].includes(textOf(o)));
    expect(chipLabels.length).toBe(2);
    chipLabels.forEach((label) => {
      const rect = g.find((o) => o.type === 'shape' && o.frame.x <= label.frame.x && o.frame.x + o.frame.w >= label.frame.x + label.frame.w && o.frame.y <= label.frame.y);
      expect(rect).toBeTruthy();
    });
    const choiceImage = g.find((o) => o.type === 'image' && o.alt === 'cut');
    expect(choiceImage && choiceImage.src).toBe(PNG);
  });

  it('turns non-data pictures into dashed empty frames', () => {
    const doc = build({
      title: 'Pictures',
      sections: [{ items: [
        { n: 1, prompt: 'Name it', image: 'https://example.com/cat.png', display: { kind: 'word', text: 'cat' } },
        { n: 2, prompt: 'Pick', choices: [{ label: 'dog', image: 'javascript:alert(1)' }] },
      ] }],
    });
    expect(doc.objects.filter((o) => o.type === 'image')).toEqual([]);
    const dashed = doc.objects.filter((o) => o.type === 'shape' && o.stroke && o.stroke.dash === 'dashed');
    expect(dashed.length).toBe(1);
    expect(dashed[0].frame).toMatchObject({ w: 88, h: 88 });
    expect(doc.objects.map(textOf)).toContain('dog');
    expect(JSON.stringify(doc)).not.toContain('example.com');
    expect(ST.stExportHtml(doc)).not.toContain('javascript:');
  });

  it('puts the answer key on its own last page with the edit note', () => {
    const doc = build(resource(10, { keyTitle: 'Short a: answer key' }));
    const last = ST.stScenePageCount(doc) - 1;
    const keyObjects = ST.stObjectsOnPage(doc.objects, last);
    expect(textOf(keyObjects[0])).toBe('Short a: answer key');
    expect(textOf(keyObjects[1])).toBe(NOTE);
    expect(keyObjects.map(textOf)).toContain('3. answer 3');
    expect(keyObjects.map(textOf)).toContain('Words to say');
    expect(keyObjects.map(textOf)).toContain('cat, map');
    // nothing from the student pages shares the key page
    expect(ST.stObjectsOnPage(doc.objects, last).some((o) => /^\d+\. Say each/.test(textOf(o)))).toBe(false);
    expect(build(resource(2, { keyTitle: '' })).objects.map(textOf)).toContain('Short a sounds: Answer key');
  });

  it('uses translated strings and sets doc lang/dir from the resource (RTL mirrors the layout)', () => {
    const r = resource(4, { lang: 'ar', dir: 'rtl', pageSize: 'a4-portrait', title: 'أصوات' });
    const doc = build(r, { strings: { name: 'الاسم', keyNote: 'ملاحظة', answerKey: 'الإجابات', listen: 'استمع', wordsToSay: 'كلمات' } });
    expect(doc.lang).toBe('ar');
    expect(doc.dir).toBe('rtl');
    expect(doc.canvas.preset).toBe('a4-portrait');
    expect(doc.objects.map(textOf)).toContain('الاسم');
    expect(doc.objects.map(textOf)).toContain('ملاحظة');
    const title = doc.objects[0];
    expect(title.runs[0].style.align).toBe('right');
    expect(title.frame.x + title.frame.w).toBe(doc.canvas.w - 48);
    const [one, two] = itemGroups(doc);
    expect(one[0].frame.x).toBeGreaterThan(two[0].frame.x); // item 1 sits in the right-hand column
    expect(ST.stExportHtml(doc)).toContain('<html lang="ar" dir="rtl">');
    expect(ST.stValidateDoc(doc)).toEqual([]);
  });

  it('survives hostile or empty input', () => {
    expect(ST.stValidateDoc(build(null))).toEqual([]);
    const doc = build({ title: '<b>x</b>', lang: 'en"><script>', dir: 'sideways', pageSize: 'tabloid', sections: [null, { items: [null, 5, { display: { kind: 'boxes', count: 1e9 } }] }], key: [null, { text: '' }] });
    expect(doc.lang).toBeUndefined();
    expect(doc.dir).toBeUndefined();
    expect(doc.canvas.preset).toBe('letter-portrait');
    expect(doc.objects.filter((o) => o.type === 'shape' && o.stroke && o.stroke.dash === 'solid').length).toBeLessThanOrEqual(13);
    expect(ST.stScenePageCount(doc)).toBe(1);
    expect(ST.stValidateDoc(doc)).toEqual([]);
  });
});
