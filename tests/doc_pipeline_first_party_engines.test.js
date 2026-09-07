import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// (2026-09-06) Gemini Canvas's CSP refuses the third-party CDNs, and the cdnjs axe-core 4.12.1
// URL that sat third in the axe chain was a dead link (HTTP 404), so in Canvas axe-core never
// loaded and every audit was AI-only; pdf.js and pdf-lib were one blocked host away from the
// same fate. The engines are now vendored at the repo root (the temml/ precedent; Cloudflare
// Pages serves the root) and listed FIRST in every mirror chain, on the one origin Canvas
// already loads every module from. These pins keep the files, the order and the integrity.
const ROOT = process.cwd();
const pipeline = readFileSync(resolve(ROOT, 'doc_pipeline_module.js'), 'utf8');
const pipelineSource = readFileSync(resolve(ROOT, 'doc_pipeline_source.jsx'), 'utf8');

const ORIGIN = 'https://alloflow-cdn.pages.dev/';
const ENGINES = [
  { path: 'axe-core/4.12.1/axe.min.js', sha256: '66a8aaa95a8b044a7fd74a5435873bf04ff65a1ca75567c921b7509742085a14', list: '_AXE_CDN_URLS = [' },
  { path: 'accessibility-checker-engine/3.1.83/ace.js', sha256: '003f149831d9a33ca806ad78df6fac5575de3d5f79c7fc22511d65a6ab8cd5de', list: '_ACE_CDN_URLS = [' },
  { path: 'pdfjs-dist/3.11.174/pdf.min.js', sha256: '5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946', list: "_loadCdnScript('pdfjs', [" },
  { path: 'pdfjs-dist/3.11.174/pdf.worker.min.js', sha256: 'feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b', list: null },
  { path: 'pdf-lib/1.17.1/pdf-lib.min.js', sha256: '0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f', list: "_loadCdnScript('pdflib', [" },
];

const firstUrlAfter = (src, anchor) => {
  const at = src.indexOf(anchor);
  expect(at, anchor).toBeGreaterThanOrEqual(0);
  const m = /'(https:\/\/[^']+)'/.exec(src.slice(at));
  return m ? m[1] : null;
};

describe('first-party accessibility engines', () => {
  it('ships every engine at the repo root, byte-identical to the build both third-party mirrors serve', () => {
    for (const e of ENGINES) {
      const file = resolve(ROOT, e.path);
      expect(existsSync(file), e.path).toBe(true);
      expect(statSync(file).size, e.path).toBeGreaterThan(100000);
      const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
      expect(digest, e.path).toBe(e.sha256);
      // A CDN 404 page is what one of these mirrors actually returned; never vendor one.
      expect(readFileSync(file, 'utf8').slice(0, 200), e.path).not.toMatch(/404 Not Found/);
    }
    // The Equal Access banner points at its licence notice; it ships alongside.
    expect(existsSync(resolve(ROOT, 'accessibility-checker-engine/3.1.83/ace.js.LICENSE.txt'))).toBe(true);
  });

  it('lists the first-party copy first in every chain and drops the dead cdnjs axe URL', () => {
    for (const src of [pipeline, pipelineSource]) {
      for (const e of ENGINES) {
        if (!e.list) continue;
        expect(firstUrlAfter(src, e.list), e.list).toBe(ORIGIN + e.path);
      }
      expect(src).not.toContain('cdnjs.cloudflare.com/ajax/libs/axe-core');
      // Third-party mirrors stay behind the first-party copy for every other network.
      expect(src).toContain("'https://cdn.jsdelivr.net/npm/axe-core@4.12.1/axe.min.js'");
      expect(src).toContain("'https://cdn.jsdelivr.net/npm/accessibility-checker-engine@3.1.83/ace.js'");
      expect(src).toContain("'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'");
    }
  });

  it('takes the pdf.js worker from the mirror that actually loaded, and has no lone pdf.js loader left', () => {
    for (const src of [pipeline, pipelineSource]) {
      expect(src).toContain('const _pdfJsWorkerBesideLoadedScript = () => {');
      expect(src).toContain('workerSrc = _vendorWorker || _pdfJsWorkerBesideLoadedScript() ||');
      // The image-extraction path used to inject its own cdnjs tag with its own worker URL.
      expect(src).not.toContain("script.setAttribute('data-pdfjs', 'true')");
      expect(src).toContain('await _awaitImageWork(ensurePdfJsLoaded())');
    }
  });

  it('derives the worker URL beside the LAST pdf.js tag (the one that loaded), for any origin', () => {
    const start = pipeline.indexOf('const _pdfJsWorkerBesideLoadedScript = () => {');
    const end = pipeline.indexOf('const ensurePdfJsLoaded = async () => {', start);
    const fn = new Function('document', pipeline.slice(start, end) + '\nreturn _pdfJsWorkerBesideLoadedScript();');
    const doc = (srcs) => ({ querySelectorAll: () => srcs.map((src) => ({ src })) });
    expect(fn(doc([]))).toBe('');
    expect(fn(doc(['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'])))
      .toBe('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js');
    // A refused first mirror leaves its tag behind; the worker must follow the one that loaded.
    expect(fn(doc(['https://alloflow-cdn.pages.dev/pdfjs-dist/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'])))
      .toBe('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
    expect(fn(doc(['https://example.com/not-pdfjs.js']))).toBe('');
  });

  it('serves the engine directories with CORS and long caching (Cloudflare Pages _headers)', () => {
    const headers = readFileSync(resolve(ROOT, '_headers'), 'utf8');
    for (const dir of ['/axe-core/*', '/accessibility-checker-engine/*', '/pdfjs-dist/*', '/pdf-lib/*']) {
      const at = headers.indexOf(dir);
      expect(at, dir).toBeGreaterThanOrEqual(0);
      expect(headers.slice(at, at + 200)).toContain('Access-Control-Allow-Origin: *');
    }
    // Scoped: nothing in this file touches the app shell or the modules.
    expect(headers).not.toMatch(/^\/\*\s*$/m);
    expect(headers).not.toMatch(/^\/app\//m);
  });
});
