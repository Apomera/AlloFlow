import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// The Document Safety scanner used to refuse any PDF whose catalog carried
// /Outlines (bookmarks), /AcroForm, or a destination-only /OpenAction, which
// withheld original-layout tagged-PDF delivery from 14 of the 16 corpus
// documents. These cases pin the walk that replaced the refusal: benign
// bookmarks, empty and passive forms, and open-at-page destinations are
// examined and pass; actions inside them are disclosed through the shared
// classifiers; anything outside the documented shapes still fails closed.

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

function extractScanner(text) {
  const start = text.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
  const end = text.indexOf('// ── S7', start);
  if (start < 0 || end < 0) throw new Error('active-content scanner not found');
  return new Function(`${text.slice(start, end)}\nreturn _alloScanActiveContent;`)();
}

const scanActiveContent = extractScanner(source);
const findingTypes = (result) => result.findings.map((finding) => finding.type);

// ── Fake-object harness (same conventions as active_content_scan_completeness) ──
const PDFLibNS = { PDFName: { of: (name) => name } };
const dict = (values = {}) => ({
  get: (name) => values[name],
  keys: () => Object.keys(values),
});
const array = (values) => ({
  size: () => values.length,
  get: (index) => values[index],
});

function scan(catalogValues = {}, pages = []) {
  return scanActiveContent({
    context: { lookup: (value) => value },
    catalog: dict(catalogValues),
    getPages: () => pages,
  }, PDFLibNS);
}

const CLEAN = { complete: true, pageScanFailures: 0, unexaminedStructures: 0, any: false, findings: [] };

describe('bookmarks (/Outlines)', () => {
  it('passes an empty outline root and a nested destination-only tree', () => {
    expect(scan({ Outlines: dict({ Type: '/Outlines', Count: 0 }) })).toMatchObject(CLEAN);

    const child = dict({ Title: 'Child', Dest: array(['page', '/XYZ']), Count: 0 });
    const second = dict({ Title: 'Second', Dest: '/named', Prev: 'first' });
    const first = dict({ Title: 'First', Dest: array(['page', '/Fit']), Next: second, First: child, Last: child, Count: 1 });
    const result = scan({ Outlines: dict({ First: first, Last: second, Count: 3 }) });
    expect(result).toMatchObject(CLEAN);
  });

  it('discloses actions carried by outline items through the shared classifiers', () => {
    const items = dict({
      Title: 'Run',
      A: dict({ S: '/JavaScript' }),
      Next: dict({
        Title: 'Open',
        A: dict({ S: '/Launch' }),
        Next: dict({ Title: 'Attach', AF: array([dict({ Type: '/Filespec' })]) }),
      }),
    });
    const result = scan({ Outlines: dict({ First: items, Count: 3 }) });
    expect(result).toMatchObject({ complete: true, unexaminedStructures: 0, any: true });
    expect(findingTypes(result)).toEqual(['javascript', 'launch', 'embedded-files']);
  });

  it('classifies a URI bookmark as an ordinary external link', () => {
    const result = scan({ Outlines: dict({ First: dict({ Title: 'Site', A: dict({ S: '/URI' }) }), Count: 1 }) });
    expect(result).toMatchObject({ ...CLEAN, externalLinks: 1 });
  });

  it('fails closed on undocumented keys, a wrong root type, and an array-valued /A', () => {
    const extraKey = scan({ Outlines: dict({ First: dict({ Title: 'x', Dest: 'd', Payload: dict() }), Count: 1 }) });
    expect(extraKey).toMatchObject({ complete: false, unexaminedStructures: 1, any: false });

    const rootExtra = scan({ Outlines: dict({ Count: 0, Kids: array([]) }) });
    expect(rootExtra).toMatchObject({ complete: false, unexaminedStructures: 1 });

    const wrongType = scan({ Outlines: dict({ Type: '/Pages', Count: 0 }) });
    expect(wrongType).toMatchObject({ complete: false, unexaminedStructures: 1 });

    const arrayAction = scan({ Outlines: dict({ First: dict({ Title: 'x', A: array([dict({ S: '/JavaScript' })]) }), Count: 1 }) });
    expect(arrayAction).toMatchObject({ complete: false, unexaminedStructures: 1 });
  });

  it('survives a sibling cycle and fails closed beyond the nesting budget', () => {
    const itemValues = { Title: 'Loop', Dest: 'd' };
    const item = dict(itemValues);
    itemValues.Next = item;
    expect(scan({ Outlines: dict({ First: item, Count: 1 }) })).toMatchObject(CLEAN);

    let deep = dict({ Title: 'leaf', Dest: 'd' });
    for (let depth = 0; depth < 1100; depth++) deep = dict({ Title: 'level', Dest: 'd', First: deep, Count: 1 });
    expect(scan({ Outlines: dict({ First: deep, Count: 1 }) })).toMatchObject({ complete: false, unexaminedStructures: 1 });
  });

  it('fails closed when an outline item cannot be resolved', () => {
    class PDFRef {}
    const result = scanActiveContent({
      context: { lookup: () => { throw new Error('broken outline xref'); } },
      catalog: dict({ Outlines: dict({ First: new PDFRef(), Count: 1 }) }),
      getPages: () => [],
    }, PDFLibNS);
    expect(result).toMatchObject({ complete: false, unexaminedStructures: 1, any: false });
  });
});

describe('forms (/AcroForm)', () => {
  it('passes an empty form with default appearance, resources, and passive flags', () => {
    const result = scan({
      AcroForm: dict({
        Fields: array([]),
        DA: '/Helv 0 Tf 0 g',
        DR: dict({ Font: dict({ Helv: dict() }) }),
        Q: 0,
        NeedAppearances: false,
        SigFlags: 0,
        CO: array([]),
      }),
    });
    expect(result).toMatchObject(CLEAN);
  });

  it('walks a field tree with kids and passes when nothing carries an action', () => {
    const kid = dict({ T: 'first', FT: '/Tx' });
    const parent = dict({ T: 'group', Kids: array([kid, dict({ T: 'second', FT: '/Btn' })]) });
    const result = scan({ AcroForm: dict({ Fields: array([parent]) }) });
    expect(result).toMatchObject(CLEAN);
  });

  it('discloses field-level additional actions, actions, and associated files', () => {
    const result = scan({
      AcroForm: dict({
        Fields: array([
          dict({ T: 'calc', FT: '/Tx', AA: dict({ C: dict({ S: '/JavaScript' }) }) }),
          dict({ T: 'go', FT: '/Btn', A: dict({ S: '/JavaScript' }) }),
          dict({ T: 'file', FT: '/Tx', AF: array([dict({ Type: '/Filespec' })]) }),
        ]),
      }),
    });
    expect(result).toMatchObject({ complete: true, unexaminedStructures: 0, any: true });
    expect(findingTypes(result)).toEqual(['javascript', 'embedded-files', 'additional-actions']);
  });

  it('examines calculation-order fields that are absent from the field tree', () => {
    const hidden = dict({ T: 'hidden', AA: dict({ C: dict({ S: '/JavaScript' }) }) });
    const result = scan({ AcroForm: dict({ Fields: array([]), CO: array([hidden]) }) });
    expect(result).toMatchObject({ complete: true, any: true });
    expect(findingTypes(result)).toEqual(['additional-actions']);
  });

  it('classifies a widget that is both a page annotation and a field exactly once', () => {
    const widget = dict({ Subtype: '/Widget', T: 'button', A: dict({ S: '/JavaScript' }), AA: dict({ E: dict({ S: '/JavaScript' }) }) });
    const result = scan(
      { AcroForm: dict({ Fields: array([widget]) }) },
      [{ node: dict({ Annots: array([widget]) }) }],
    );
    expect(result).toMatchObject({ complete: true, any: true });
    expect(result.findings).toContainEqual(expect.objectContaining({ type: 'javascript', count: 1 }));
    expect(result.findings).toContainEqual(expect.objectContaining({ type: 'additional-actions', count: 1 }));
  });

  it('keeps XFA, undocumented keys, a missing /Fields, and a non-array /Fields unexamined', () => {
    expect(scan({ AcroForm: dict({ Fields: array([]), XFA: array([]) }) })).toMatchObject({ complete: false, unexaminedStructures: 1 });
    expect(scan({ AcroForm: dict({ Fields: array([]), Payload: dict() }) })).toMatchObject({ complete: false, unexaminedStructures: 1 });
    expect(scan({ AcroForm: dict({ DA: '/Helv 0 Tf 0 g' }) })).toMatchObject({ complete: false, unexaminedStructures: 1 });
    expect(scan({ AcroForm: dict({ Fields: dict() }) })).toMatchObject({ complete: false, unexaminedStructures: 1 });
    expect(scan({ AcroForm: dict({ Fields: array([{}]) }) })).toMatchObject({ complete: false, unexaminedStructures: 1 });
  });

  it('reports a malformed default-resource dictionary through the resource walk', () => {
    const result = scan({ AcroForm: dict({ Fields: array([]), DR: dict({ XObject: dict({ Bad: { dict: dict({ Subtype: '/Form', AF: {} }) } }) }) }) });
    expect(result).toMatchObject({ complete: false, pageScanFailures: 1, unexaminedStructures: 0 });
  });

  it('fails closed when a field cannot be resolved', () => {
    class PDFRef {}
    const result = scanActiveContent({
      context: { lookup: () => { throw new Error('broken field xref'); } },
      catalog: dict({ AcroForm: dict({ Fields: array([new PDFRef()]) }) }),
      getPages: () => [],
    }, PDFLibNS);
    expect(result).toMatchObject({ complete: false, unexaminedStructures: 1 });
  });
});

describe('open action (/OpenAction)', () => {
  it('treats explicit and named destinations and a bare /GoTo as navigation', () => {
    expect(scan({ OpenAction: array(['page', '/XYZ', null, null, null]) })).toMatchObject(CLEAN);
    expect(scan({ OpenAction: '/Chapter1' })).toMatchObject(CLEAN);
    expect(scan({ OpenAction: dict({ Type: '/Action', S: '/GoTo', D: array(['page', '/Fit']) }) })).toMatchObject(CLEAN);
  });

  it('discloses and classifies anything else', () => {
    const script = scan({ OpenAction: dict({ S: '/JavaScript' }) });
    expect(script).toMatchObject({ complete: true, any: true });
    expect(findingTypes(script)).toEqual(['open-action', 'javascript']);

    const chained = scan({ OpenAction: dict({ S: '/GoTo', D: array([]), Next: dict({ S: '/Launch' }) }) });
    expect(findingTypes(chained)).toEqual(['open-action', 'other-actions']);

    const extraKey = scan({ OpenAction: dict({ S: '/GoTo', D: array([]), Win: dict() }) });
    expect(findingTypes(extraKey)).toEqual(['open-action']);

    const remote = scan({ OpenAction: dict({ S: '/GoToR', F: 'other.pdf' }) });
    expect(findingTypes(remote)).toEqual(['open-action', 'other-actions']);
  });

  it('fails closed on an unreadable or unresolvable open action', () => {
    expect(scan({ OpenAction: 42 })).toMatchObject({ complete: false, unexaminedStructures: 1 });
    expect(findingTypes(scan({ OpenAction: 42 }))).toEqual(['open-action']);

    class PDFRef {}
    const unresolved = scanActiveContent({
      context: { lookup: () => { throw new Error('broken open action'); } },
      catalog: dict({ OpenAction: new PDFRef() }),
      getPages: () => [],
    }, PDFLibNS);
    expect(unresolved).toMatchObject({ complete: false, unexaminedStructures: 1, any: false });
  });
});

// ── Real pdf-lib objects, the same build the MCP driver and the app use ──
const require = createRequire(import.meta.url);
const PDF = require(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
const name = PDF.PDFName.of;

async function buildPdf(setup) {
  const doc = await PDF.PDFDocument.create();
  const page = doc.addPage([300, 300]);
  await setup(doc, page);
  return doc;
}

function snapshot(doc) {
  return doc.context.enumerateIndirectObjects().map(([ref, obj]) => `${ref.toString()} ${obj.toString()}`).join('\n');
}

function scanReal(doc) {
  const before = snapshot(doc);
  const result = scanActiveContent(doc, PDF);
  expect(snapshot(doc)).toBe(before);
  return result;
}

function addOutline(doc, page, items) {
  const outlines = doc.context.obj({ Type: 'Outlines', Count: items.length });
  const outlinesRef = doc.context.register(outlines);
  let previous = null;
  for (const item of items) {
    const entry = doc.context.obj({ Title: PDF.PDFString.of(item.title), Parent: outlinesRef, ...(item.action ? { A: item.action } : { Dest: [page.ref, 'XYZ', null, null, null] }) });
    const ref = doc.context.register(entry);
    if (previous) { previous.entry.set(name('Next'), ref); entry.set(name('Prev'), previous.ref); } else outlines.set(name('First'), ref);
    outlines.set(name('Last'), ref);
    previous = { entry, ref };
  }
  doc.catalog.set(name('Outlines'), outlinesRef);
}

describe('real pdf-lib documents', () => {
  it('passes a bookmarked document with an empty form and an open-at-page destination', async () => {
    const doc = await buildPdf((d, page) => {
      addOutline(d, page, [{ title: 'Introduction' }, { title: 'Chapter 1' }, { title: 'Chapter 2' }]);
      d.catalog.set(name('AcroForm'), d.context.register(d.context.obj({
        Fields: [],
        DA: PDF.PDFString.of('/Helv 0 Tf 0 g'),
        DR: { Font: { Helv: d.context.register(d.context.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica' })) } },
      })));
      d.catalog.set(name('OpenAction'), d.context.obj([page.ref, 'XYZ', null, null, null]));
    });
    expect(scanReal(doc)).toMatchObject({ ...CLEAN, externalLinks: 0 });

    const goTo = await buildPdf((d, page) => {
      d.catalog.set(name('OpenAction'), d.context.obj({ S: 'GoTo', D: [page.ref, 'Fit'] }));
    });
    expect(scanReal(goTo)).toMatchObject(CLEAN);
  });

  it('discloses a JavaScript bookmark and a JavaScript open action', async () => {
    const doc = await buildPdf((d, page) => {
      addOutline(d, page, [{ title: 'Plain' }, { title: 'Run', action: { S: 'JavaScript', JS: PDF.PDFString.of('app.alert("probe")') } }]);
      d.catalog.set(name('OpenAction'), d.context.register(d.context.obj({ S: 'JavaScript', JS: PDF.PDFString.of('app.alert("open")') })));
    });
    const result = scanReal(doc);
    expect(result).toMatchObject({ complete: true, unexaminedStructures: 0, any: true });
    expect(result.findings).toContainEqual(expect.objectContaining({ type: 'open-action', count: 1 }));
    expect(result.findings).toContainEqual(expect.objectContaining({ type: 'javascript', count: 2 }));
  });

  it('counts a widget shared by the page and the field tree once, and keeps XFA unexamined', async () => {
    const shared = await buildPdf((d, page) => {
      const widget = d.context.obj({
        Type: 'Annot', Subtype: 'Widget', FT: 'Btn', T: PDF.PDFString.of('go'), Rect: [0, 0, 10, 10],
        A: { S: 'JavaScript', JS: PDF.PDFString.of('app.alert("click")') },
      });
      const widgetRef = d.context.register(widget);
      page.node.set(name('Annots'), d.context.obj([widgetRef]));
      d.catalog.set(name('AcroForm'), d.context.register(d.context.obj({ Fields: [widgetRef] })));
    });
    const result = scanReal(shared);
    expect(result).toMatchObject({ complete: true, unexaminedStructures: 0, any: true });
    expect(result.findings).toEqual([expect.objectContaining({ type: 'javascript', count: 1 })]);

    const xfa = await buildPdf((d) => {
      d.catalog.set(name('AcroForm'), d.context.register(d.context.obj({
        Fields: [],
        XFA: d.context.register(d.context.stream('<xdp:xdp/>')),
      })));
    });
    expect(scanReal(xfa)).toMatchObject({ complete: false, unexaminedStructures: 1, any: false });
  });

  it('discloses a calculation script on a field that has no widget on any page', async () => {
    const doc = await buildPdf((d) => {
      const field = d.context.register(d.context.obj({
        FT: 'Tx', T: PDF.PDFString.of('total'),
        AA: { C: { S: 'JavaScript', JS: PDF.PDFString.of('event.value = 1') } },
      }));
      d.catalog.set(name('AcroForm'), d.context.register(d.context.obj({ Fields: [field], CO: [field] })));
    });
    const result = scanReal(doc);
    expect(result).toMatchObject({ complete: true, any: true });
    expect(result.findings).toEqual([expect.objectContaining({ type: 'additional-actions', count: 1 })]);
  });
});
