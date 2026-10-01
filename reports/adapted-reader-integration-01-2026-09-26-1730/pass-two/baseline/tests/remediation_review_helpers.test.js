import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Review = require('../remediation_review_helpers.js');
const options = { DOMParser, digest: value => createHash('sha256').update(value).digest('hex') };
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const TABLE = '<table><caption>Quiz scores</caption><tr><td>Student</td><td>Score</td></tr><tr><td>Ada</td><td>95</td></tr><tr><td>Lin</td><td>102</td></tr></table>';
const IMG = '<img src="source-diagram.png" srcset="source-diagram@2x.png 2x" alt="Diagram">';
const HTML = '<!DOCTYPE html><html lang="en"><body><main><h1>Class worksheet</h1>' + TABLE + IMG + '</main></body></html>';
const first = (model, kind) => model.references.find(ref => ref.kind === kind);
describe('remediation source references — runtime matching and persistence', () => {
  it('creates stable IDs that survive JSON save/import and match the same document', async () => {
    const model = await Review.createSourceModel(HTML, options);
    expect(model).toBeTruthy();
    expect(await Review.createSourceModel(HTML, options)).toEqual(model);
    const restored = Review.normalizeSourceModel(JSON.parse(JSON.stringify(model)));
    expect(restored).toEqual(model);
    const doc = parse(HTML);
    for (const ref of restored.references) {
      const resolved = await Review.resolveSourceReference(doc, restored, ref.id, options);
      expect(resolved.status).toBe('matched');
      expect(resolved.node.ownerDocument).toBe(doc);
    }
  });
  it('resolves table/cell references after header promotion, whitespace normalization, and inline formatting', async () => {
    const model = await Review.createSourceModel(HTML, options);
    const improved = HTML.replace('<td>Student</td><td>Score</td>', '<th scope="col">Student</th><th scope="col">Score</th>')
      .replace('<td>Ada</td>', '<td>  <strong>Ada</strong>\n </td>');
    const doc = parse(improved);
    for (const ref of model.references.filter(ref => ref.kind !== 'figure')) {
      expect((await Review.resolveSourceReference(doc, model, ref.id, options)).status).toBe('matched');
    }
    expect((await Review.resolveSourceReference(doc, model, first(model, 'cell').id, options)).node.tagName).toBe('TH');
  });
  it('resolves the original image after an alt-text improvement', async () => {
    const model = await Review.createSourceModel(HTML, options);
    const doc = parse(HTML.replace('alt="Diagram"', 'alt="A labeled water-cycle diagram showing evaporation and condensation"'));
    const result = await Review.resolveSourceReference(doc, model, first(model, 'figure').id, options);
    expect(result.status).toBe('matched'); expect(result.node.getAttribute('alt')).toContain('evaporation');
  });
  it('refuses table and cell matches after a same-length score transposition', async () => {
    const model = await Review.createSourceModel(HTML, options);
    const swapped = HTML.replace('<td>95</td>', '<td>TEMP</td>').replace('<td>102</td>', '<td>95</td>').replace('<td>TEMP</td>', '<td>102</td>');
    for (const ref of model.references.filter(ref => ref.kind !== 'figure')) {
      const result = await Review.resolveSourceReference(parse(swapped), model, ref.id, options);
      expect(result).toMatchObject({ status: 'changed', node: null });
    }
  });
  it.each(['src', 'srcset'])('refuses an image match when %s is replaced', async attr => {
    const model = await Review.createSourceModel(HTML, options); const doc = parse(HTML);
    doc.querySelector('img').setAttribute(attr, attr === 'src' ? 'replacement.png' : 'replacement@2x.png 2x');
    expect(await Review.resolveSourceReference(doc, model, first(model, 'figure').id, options)).toMatchObject({ status: 'changed', node: null });
  });
  it('does not infer identical asset identity from source order or matching document signatures', async () => {
    const html = '<p>Original text</p>' + IMG + IMG;
    const model = await Review.createSourceModel(html, options);
    for (const ref of model.references.filter(ref => ref.kind === 'figure')) {
      expect(await Review.resolveSourceReference(parse(html), model, ref.id, options)).toMatchObject({ status: 'ambiguous', node: null });
      expect(await Review.resolveSourceReference(parse(html.replace('Original text', 'Revised text')), model, ref.id, options)).toMatchObject({ status: 'ambiguous', node: null });
    }
  });
  it('does not guess which duplicate table owns a cell after the document changes', async () => {
    const html = '<p>Original text</p>' + TABLE + TABLE;
    const model = await Review.createSourceModel(html, options);
    const result = await Review.resolveSourceReference(parse(html.replace('Original text', 'Revised text')), model, first(model, 'cell').id, options);
    expect(result).toMatchObject({ status: 'ambiguous', node: null });
  });
  it('owns nested table rows and captions separately', async () => {
    const html = '<table><tr><td>Outer content<table><caption>Inner caption</caption><tr><td>Inner cell</td></tr></table></td></tr></table>';
    const model = await Review.createSourceModel(html, options);
    const tables = model.references.filter(ref => ref.kind === 'table');
    expect(tables[0].label).toBe('Table 1');
    expect(tables[1].label).toBe('Table 2: Inner caption');
    expect(model.references.filter(ref => ref.kind === 'cell' && ref.table === 0)).toHaveLength(1);
    expect(model.references.filter(ref => ref.kind === 'cell' && ref.table === 1)).toHaveLength(1);
  });
  it('never mutates source markup, parsed DOM, or the saved sidecar', async () => {
    let parsed;
    class RecordingParser { parseFromString(html, type) { parsed = new DOMParser().parseFromString(html, type); return parsed; } }
    const model = await Review.createSourceModel(HTML, { ...options, DOMParser: RecordingParser });
    expect(parsed.documentElement.outerHTML).toBe(parse(HTML).documentElement.outerHTML);
    expect(parsed.querySelector('[data-source-id], [data-review-id]')).toBeNull();
    const modelBytes = JSON.stringify(model), doc = parse(HTML), domBytes = doc.documentElement.outerHTML;
    await Review.resolveSourceReference(doc, model, first(model, 'table').id, options);
    expect(JSON.stringify(model)).toBe(modelBytes); expect(doc.documentElement.outerHTML).toBe(domBytes);
    expect(model.references.every(ref => !('node' in ref))).toBe(true);
  });
  it('bounds large inventories and clearly reports truncation', async () => {
    const html = '<table><tr>' + '<td>Repeated cell</td>'.repeat(720) + '</tr></table>';
    const model = await Review.createSourceModel(html, options);
    expect(model.references.length).toBeLessThanOrEqual(700); expect(model.truncated).toBe(true);
    const images = await Review.createSourceModel(IMG.repeat(205), options);
    expect(images.references.filter(ref => ref.kind === 'figure')).toHaveLength(200); expect(images.truncated).toBe(true);
  });
  it('refuses malformed IDs, duplicate IDs, and missing cryptographic fingerprints', async () => {
    const model = await Review.createSourceModel(HTML, options);
    for (const alter of [m => { m.references[0].id = 'not-a-source-id'; }, m => { m.references[1].id = m.references[0].id; }, m => { delete m.references[0].fingerprint; }]) {
      const copy = structuredClone(model); alter(copy); expect(Review.normalizeSourceModel(copy)).toBeNull();
    }
    expect(await Review.resolveSourceReference(parse(HTML), model, 'unknown', options)).toMatchObject({ status: 'unavailable', node: null });
  });
  it('fails closed when digest or parsing support fails', async () => {
    expect(await Review.createSourceModel(HTML, { ...options, digest: () => { throw new Error('Digest unavailable'); } })).toBeNull();
    class FailingParser { parseFromString() { throw new Error('Parser unavailable'); } }
    expect(await Review.createSourceModel(HTML, { ...options, DOMParser: FailingParser })).toBeNull();
    const model = await Review.createSourceModel(HTML, options);
    expect(await Review.resolveSourceReference(parse(HTML), model, first(model, 'table').id, { ...options, digest: () => { throw new Error('Digest unavailable'); } })).toMatchObject({ status: 'unavailable', node: null });
  });
});

describe('source and target reference identity cardinality', () => {
  it('does not map two source image IDs onto one remaining image', async () => {
    const model = await Review.createSourceModel(IMG + IMG, options);
    const target = parse(IMG);
    expect(model.references.filter(ref => ref.kind === 'figure')).toHaveLength(2);
    for (const ref of model.references) expect(await Review.resolveSourceReference(target, model, ref.id, options)).toMatchObject({ status: 'ambiguous', node: null });
  });
  it('does not map either duplicate table or its cells onto the single surviving table', async () => {
    const model = await Review.createSourceModel(TABLE + TABLE, options);
    const target = parse(TABLE);
    expect(model.references.filter(ref => ref.kind === 'table')).toHaveLength(2);
    for (const ref of model.references) expect(await Review.resolveSourceReference(target, model, ref.id, options)).toMatchObject({ status: 'ambiguous', node: null });
  });
  it('does not map remaining equal-valued cells after another cell is removed', async () => {
    const source = '<table><tr><td>Same value</td><td>Same value</td></tr></table>';
    const model = await Review.createSourceModel(source, options);
    const target = parse('<table><tr><td>Same value</td></tr></table>');
    for (const ref of model.references.filter(ref => ref.kind === 'cell')) {
      expect(await Review.resolveSourceReference(target, model, ref.id, options)).toMatchObject({ status: 'changed', node: null });
    }
  });
  it.each(['table', 'cell', 'figure'])('refuses a unique source %s when the target has two candidates', async kind => {
    const source = kind === 'figure' ? IMG : TABLE;
    const model = await Review.createSourceModel(source, options);
    const ref = first(model, kind);
    expect(await Review.resolveSourceReference(parse(source + source), model, ref.id, options)).toMatchObject({ status: 'ambiguous', node: null });
  });
  it.each(['table', 'cell', 'figure'])('does not guess reordered duplicate %s identities even when signatures match', async kind => {
    const source = kind === 'figure'
      ? IMG.replace('alt="Diagram"', 'alt="First image"') + IMG.replace('alt="Diagram"', 'alt="Second image"')
      : TABLE.replace('<table>', '<table id="first">') + TABLE.replace('<table>', '<table id="second">');
    const target = kind === 'figure'
      ? IMG.replace('alt="Diagram"', 'alt="Second image"') + IMG.replace('alt="Diagram"', 'alt="First image"')
      : TABLE.replace('<table>', '<table id="second">') + TABLE.replace('<table>', '<table id="first">');
    const model = await Review.createSourceModel(source, options);
    const changedModel = await Review.createSourceModel(target, options);
    expect(changedModel.signature).toBe(model.signature); // The old positional fallback guessed here.
    for (const ref of model.references.filter(ref => ref.kind === kind)) {
      expect(await Review.resolveSourceReference(parse(target), model, ref.id, options)).toMatchObject({ status: 'ambiguous', node: null });
    }
  });
  it('reports changed when no current candidate remains', async () => {
    const model = await Review.createSourceModel(IMG + IMG, options);
    expect(await Review.resolveSourceReference(parse('<p>Images removed.</p>'), model, first(model, 'figure').id, options)).toMatchObject({ status: 'changed', node: null });
  });
  it('still resolves an unrelated unique asset after duplicate assets disappear', async () => {
    const unique = '<img src="unique-diagram.png" alt="Unique">';
    const model = await Review.createSourceModel(IMG + IMG + unique, options);
    const ref = model.references.find(item => item.kind === 'figure' && item.index === 2);
    const target = parse(unique.replace('alt="Unique"', 'alt="Improved description"'));
    expect(await Review.resolveSourceReference(target, model, ref.id, options)).toMatchObject({ status: 'matched', node: target.querySelector('img') });
  });
});

describe('incomplete inventories cannot prove reference uniqueness', () => {
  const hiddenDuplicate = IMG + Array.from({ length: 199 }, (_, index) => '<img src="other-' + index + '.png" alt="Other">').join('') + IMG;
  it('declines a truncated source that hides another identical image', async () => {
    const model = await Review.createSourceModel(hiddenDuplicate, options);
    const ref = first(model, 'figure');
    expect(model.truncated).toBe(true);
    expect(model.references.filter(item => item.fingerprint === ref.fingerprint)).toHaveLength(1);
    expect(await Review.resolveSourceReference(parse(IMG), model, ref.id, options)).toEqual({ status: 'unavailable', node: null, reason: 'reference-inventory-truncated' });
  });
  it('declines a truncated target that hides another identical image', async () => {
    const model = await Review.createSourceModel(IMG, options);
    expect(await Review.resolveSourceReference(parse(hiddenDuplicate), model, first(model, 'figure').id, options)).toEqual({ status: 'unavailable', node: null, reason: 'reference-inventory-truncated' });
  });
  it('treats a sidecar at the total reference cap as incomplete even when its old flag is absent', async () => {
    const html = '<table><tr>' + '<td>Repeated cell</td>'.repeat(720) + '</tr></table>';
    const model = await Review.createSourceModel(html, options);
    expect(model.references).toHaveLength(700);
    delete model.truncated;
    expect(Review.normalizeSourceModel(model).truncated).toBe(true);
    expect(await Review.resolveSourceReference(parse(html), model, first(model, 'table').id, options)).toMatchObject({ status: 'unavailable', node: null, reason: 'reference-inventory-truncated' });
  });
  it('keeps version-1 sidecars with complete unique references backward compatible', async () => {
    const model = JSON.parse(JSON.stringify(await Review.createSourceModel(HTML, options)));
    delete model.truncated;
    const normalized = Review.normalizeSourceModel(model);
    expect(normalized.version).toBe(1); expect(normalized.truncated).toBe(false);
    const target = parse(HTML.replace('alt="Diagram"', 'alt="Updated description"'));
    expect((await Review.resolveSourceReference(target, normalized, first(normalized, 'figure').id, options)).status).toBe('matched');
  });
});
