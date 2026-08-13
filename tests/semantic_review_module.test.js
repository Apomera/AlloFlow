import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let review;

beforeAll(() => {
  loadAlloModule('semantic_review_module.js');
  review = window.AlloModules.SemanticReview;
});

function nodeByTag(tree, tag) {
  return tree.flat.find((node) => node.tag === tag);
}

describe('SemanticReview stable tree', () => {
  it('assigns persistent deterministic IDs and returns UI-ready nested nodes', () => {
    const source = '<html lang="en"><body><main><h1>Title</h1><section><p>Body</p></section></main></body></html>';
    const first = review.buildSemanticTree(source);
    const second = review.buildSemanticTree(first.html);

    expect(first.ok).toBe(true);
    expect(first.flat.map((node) => node.id)).toEqual(second.flat.map((node) => node.id));
    expect(first.document.language).toBe('en');
    expect(first.roots[0]).toMatchObject({ role: 'Sect', tag: 'main', text: 'TitleBody', warnings: [], attributes: {}, properties: { artifact: false, language: '', headingLevel: null } });
    expect(first.roots[0].children[0]).toMatchObject({ role: 'H1', tag: 'h1', text: 'Title', children: [] });
    expect(first.html).toContain('data-allo-semantic-id="sem-');
  });

  it('repairs duplicate or unsafe IDs rather than creating ambiguous selectors', () => {
    const result = review.ensureStableNodeIds('<body><p data-allo-semantic-id="sem-safe">One</p><p data-allo-semantic-id="sem-safe">Two</p><p data-allo-semantic-id="bad\u0022id">Three</p></body>');
    const ids = Array.from(new DOMParser().parseFromString(result.html, 'text/html').querySelectorAll('p')).map((node) => node.getAttribute('data-allo-semantic-id'));
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => /^sem-[a-z0-9][a-z0-9_-]{2,79}$/i.test(id))).toBe(true);
    expect(result.replaced).toBe(2);
  });

  it('reports heading, image, and table warnings with useful properties', () => {
    const tree = review.buildSemanticTree('<body><h1>Title</h1><h3>Skipped</h3><img src="x"><table><tr><th>Head</th><td>Value</td></tr></table></body>');
    expect(nodeByTag(tree, 'h3').warnings.join(' ')).toMatch(/Skipped heading/i);
    expect(nodeByTag(tree, 'img').warnings.join(' ')).toMatch(/alt/i);
    expect(nodeByTag(tree, 'table').warnings.join(' ')).toMatch(/scope/i);
    expect(nodeByTag(tree, 'table').properties.table).toMatchObject({ rowCount: 1, columnCount: 2, headerCellCount: 1, missingScopeCount: 1 });
  });
});

describe('SemanticReview typed commands', () => {
  it('preserves identity through retag and move commands', () => {
    const tree = review.buildSemanticTree('<body><p>First</p><p>Second</p></body>');
    const first = tree.flat[0];
    const second = tree.flat[1];
    const retagged = review.applySemanticCommand(tree.html, { type: 'retag', nodeId: second.id, tag: 'h2' });
    const moved = review.applySemanticCommand(retagged.html, { type: 'move', nodeId: second.id, direction: 'up' });
    const finalTree = review.buildSemanticTree(moved.html);

    expect(retagged).toMatchObject({ ok: true, changed: true, targetId: second.id, reason: 'content-modified-pending-reverification' });
    expect(retagged.entry).toMatchObject({ type: 'retag', targetId: second.id });
    expect(finalTree.flat.map((node) => node.id)).toEqual([second.id, first.id]);
    expect(finalTree.flat[0]).toMatchObject({ tag: 'h2', role: 'H2', text: 'Second' });
  });

  it('sets and clears artifact semantics and lets alt text restore content', () => {
    const tree = review.buildSemanticTree('<body><figure><img alt="Chart" src="chart.png"><figcaption>Results</figcaption></figure></body>');
    const figure = nodeByTag(tree, 'figure');
    const artifact = review.applySemanticCommand(tree.html, { type: 'set-artifact', nodeId: figure.id, artifact: true });
    let doc = new DOMParser().parseFromString(artifact.html, 'text/html');
    expect(doc.querySelector('img')).toMatchObject({ alt: '' });
    expect(doc.querySelector('img').getAttribute('role')).toBe('presentation');
    expect(doc.querySelector('img').getAttribute('aria-hidden')).toBe('true');

    const restored = review.applySemanticCommand(artifact.html, { type: 'set-alt', nodeId: figure.id, alt: 'Bar chart of results' });
    doc = new DOMParser().parseFromString(restored.html, 'text/html');
    expect(doc.querySelector('img').getAttribute('alt')).toBe('Bar chart of results');
    expect(doc.querySelector('img').hasAttribute('role')).toBe(false);
    expect(doc.querySelector('img').hasAttribute('aria-hidden')).toBe(false);
  });

  it('sets document or node language and rejects invalid language tags', () => {
    const tree = review.buildSemanticTree('<body><p>Bonjour</p></body>');
    const paragraph = nodeByTag(tree, 'p');
    const documentLanguage = review.applySemanticCommand(tree.html, { type: 'set-language', language: 'en-US' });
    const nodeLanguage = review.applySemanticCommand(documentLanguage.html, { type: 'set-language', nodeId: paragraph.id, language: 'fr-CA' });
    const doc = new DOMParser().parseFromString(nodeLanguage.html, 'text/html');

    expect(doc.documentElement.getAttribute('lang')).toBe('en-US');
    expect(doc.querySelector('p').getAttribute('lang')).toBe('fr-CA');
    expect(review.applySemanticCommand(nodeLanguage.html, { type: 'set-language', language: 'not valid!' })).toMatchObject({ ok: false, changed: false, error: 'invalid-language' });
  });

  it('promotes first-row and first-column cells with appropriate scopes', () => {
    const tree = review.buildSemanticTree('<body><table><tr><td>Kind</td><td>Q1</td></tr><tr><td>Sales</td><td>10</td></tr></table></body>');
    const table = nodeByTag(tree, 'table');
    const result = review.applySemanticCommand(tree.html, { type: 'set-table-headers', nodeId: table.id, mode: 'both' });
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const rows = doc.querySelectorAll('tr');

    expect(Array.from(rows[0].children).map((cell) => [cell.tagName, cell.getAttribute('scope')])).toEqual([['TH', 'col'], ['TH', 'col']]);
    expect(rows[1].children[0].tagName).toBe('TH');
    expect(rows[1].children[0].getAttribute('scope')).toBe('row');
  });

  it('fails closed for stale IDs and unsupported target/command combinations', () => {
    const tree = review.buildSemanticTree('<body><p>Text</p></body>');
    const paragraph = nodeByTag(tree, 'p');
    expect(review.applySemanticCommand(tree.html, { type: 'retag', nodeId: 'sem-missing', tag: 'h2' })).toMatchObject({ ok: false, changed: false, error: 'node-not-found' });
    expect(review.applySemanticCommand(tree.html, { type: 'set-alt', nodeId: paragraph.id, alt: 'No' })).toMatchObject({ ok: false, changed: false, error: 'target-is-not-an-image' });
    expect(review.applySemanticCommand(tree.html, { type: 'unknown', nodeId: paragraph.id })).toMatchObject({ ok: false, changed: false, error: 'unsupported-command' });
  });
});
