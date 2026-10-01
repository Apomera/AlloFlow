import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let fixStructuralFoundations;
let structuralFoundations;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  fixStructuralFoundations = window.AlloModules.createDocPipeline.fixStructuralFoundations;
  structuralFoundations = window.AlloModules.createDocPipeline.structuralFoundations;
});

describe('safe structural-foundation action and batch helper', () => {
  it('repairs all corroborated foundations in one idempotent batch', () => {
    expect(typeof fixStructuralFoundations).toBe('function');
    const source = '<!doctype html><html><head></head><body>'
      + '<h3>Student Worksheet</h3><h4>Part One</h4><p>' + 'Structured content. '.repeat(35) + '</p>'
      + '<table><thead><tr><td>Student</td><td>Score</td></tr></thead><tbody><tr><td>A</td><td>9</td></tr></tbody></table>'
      + '<figure><img src="chart.png" alt=""><figcaption>Scores by student</figcaption></figure>'
      + '<input type="text" name="student_name"></body></html>';
    const requested = ['html-lang', 'page-title', 'h1', 'h2', 'main', 'table-headers', 'table-scope', 'image-alt', 'form-label', 'skip-link'];

    const result = fixStructuralFoundations(source, { foundationIds: requested, documentLanguage: 'es' });
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    const after = structuralFoundations(result.html);
    const byId = Object.fromEntries(after.items.map((item) => [item.id, item]));

    expect(result.changed).toBe(true);
    requested.forEach((id) => expect(byId[id].status, id).toBe('passed'));
    expect(doc.documentElement.lang).toBe('es');
    expect(doc.title).toBe('Student Worksheet');
    expect(doc.querySelector('h1').textContent).toBe('Student Worksheet');
    expect(doc.querySelector('h2').textContent).toBe('Part One');
    expect(doc.querySelectorAll('main')).toHaveLength(1);
    expect(doc.querySelector('a.skip-link').getAttribute('href')).toBe('#main-content');
    expect(doc.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);
    expect(doc.querySelector('figure img').alt).toBe('Scores by student');
    expect(doc.querySelector('label[for="alloflow-foundation-field-1"]').textContent).toBe('student name');

    const second = fixStructuralFoundations(result.html, { foundationIds: requested, documentLanguage: 'es' });
    expect(second.changed).toBe(false);
    expect(second.html).toBe(result.html);
  });

  it('does not invent ambiguous semantics just to improve the inventory', () => {
    const source = '<!doctype html><html><head></head><body><header>Site banner</header><p>'
      + 'Long document text. '.repeat(40)
      + '</p><a href="/records">click here</a><table><tr><td>Maybe a header</td></tr></table>'
      + '<img src="unknown.png"><input type="text"><footer>Footer</footer></body></html>';
    const requested = ['html-lang', 'main', 'links', 'table-headers', 'table-scope', 'image-alt', 'form-label'];
    const result = fixStructuralFoundations(source, { foundationIds: requested });

    expect(result.changed).toBe(false);
    expect(result.changedFoundationIds).toEqual([]);
    expect(result.remainingIds).toEqual(expect.arrayContaining(requested));
    expect(result.html).not.toContain('alt="Image"');
    expect(result.html).not.toContain('aria-label="Link"');
    expect(result.html).not.toContain('Field 1');
    expect(result.html).not.toContain('<main');
  });
});
