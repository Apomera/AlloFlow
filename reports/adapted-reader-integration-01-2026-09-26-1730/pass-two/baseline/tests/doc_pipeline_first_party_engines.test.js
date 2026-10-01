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
  // The Office lane (DOCX/PPTX) used a lone cdnjs tag for each of these: one blocked host, no lane.
  { path: 'mammoth/1.6.0/mammoth.browser.min.js', sha256: '596ef52239e52d8ee3cee10b2ee4a72596abf900d0e4f468593f956e9f1809b0', list: "_loadCdnScript('mammoth', [" },
  { path: 'jszip/3.10.1/jszip.min.js', sha256: 'acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e', list: "_loadCdnScript('jszip', [" },
  // Raw-HTML sanitizer: without it Canvas fell back to the regex baseline (fail-closed, but weaker).
  { path: 'dompurify/3.1.7/purify.min.js', sha256: '6407576993a5aa1303eaf9fefb95e5cfc1c0c80645bd3717db671727e6b55b91', list: '_DOMPURIFY_CDN_URLS = [' },
];

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, 'start anchor: ' + start).toBeGreaterThanOrEqual(0);
  expect(to, 'end anchor: ' + end).toBeGreaterThan(from);
  return source.slice(from, to);
}

const firstUrlAfter = (src, anchor) => {
  const at = src.indexOf(anchor);
  expect(at, anchor).toBeGreaterThanOrEqual(0);
  const m = /'(https:\/\/[^']+)'/.exec(src.slice(at));
  return m ? m[1] : null;
};

describe('first-party accessibility engines', () => {
  // 3.7 MB of SHA-256 over OneDrive takes seconds on a loaded machine; 5s is not a budget for it.
  it('ships every engine at the repo root, byte-identical to the build both third-party mirrors serve', { timeout: 60000 }, () => {
    for (const e of ENGINES) {
      const file = resolve(ROOT, e.path);
      expect(existsSync(file), e.path).toBe(true);
      expect(statSync(file).size, e.path).toBeGreaterThan(10000); // DOMPurify is 21 KB; a 404 page is far smaller
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

  it('refuses a mirror that answers a missing path with an HTML page instead of the engine', () => {
    // Observed live: the AlloFlow CDN answers any unknown path with 200 + the app shell, and so
    // do captive portals and login-wall proxies. Script tags are protected by the browser's MIME
    // check; the axe source-text fetch was not, and cached the HTML as "axe-core" for the session.
    for (const src of [pipeline, pipelineSource]) {
      const fetchLoop = between(src, 'for (const u of _AXE_CDN_URLS) {', 'inline injection disabled, falling back to script tag per iframe');
      expect(fetchLoop).toContain("r.headers.get('content-type')");
      expect(fetchLoop).toMatch(/\/\^\\s\*</);
      expect(fetchLoop).toContain('answered with something that is not axe-core');
      // The valid-source assignment happens only after the check.
      expect(fetchLoop.indexOf('answered with something that is not axe-core')).toBeLessThan(fetchLoop.indexOf('_axeSourceCache = txt; return txt;'));
    }
  });

  it('gives the temml loader and the subtree axe injector the same 20s deadline as the whole-document loader', () => {
    for (const src of [pipeline, pipelineSource]) {
      const temml = between(src, 'const _ensureTemml = () => {', 'const _applyImageIntel = ');
      expect(temml).toContain('temml load timeout after 20s');
      expect(temml).toMatch(/s\.onload = \(\) => \{ if \(window\.temml\) \{ clearTimeout\(_deadline\); resolve\(\); \}/);
      const subtree = between(src, 'const auditSubtreeIsolated = async (subtreeHtml) => {', 'const iframeAxe = iframe.contentWindow.axe;');
      expect(subtree).toContain('axe inject timeout after 20s (subtree audit)');
      // Prefer the engine source runAxeAudit already fetched: no network per subtree.
      expect(subtree).toContain('if (_axeSourceCache) {');
      expect(subtree).toContain('inline.textContent = _axeSourceCache;');
    }
  });

  it('routes the Office lane loaders through the shared chain instead of one cdnjs tag each', () => {
    for (const src of [pipeline, pipelineSource]) {
      const office = between(src, 'const ensureMammothLoaded = async () => {', 'const _base64ToBytes = ');
      expect(office).toContain("_loadCdnScript('mammoth', [");
      expect(office).toContain("_loadCdnScript('jszip', [");
      expect(office).not.toContain("s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth");
      expect(office).not.toContain("s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip");
    }
  });

  it('treats a mirror that "loads" without defining its global as a failed mirror, not the end of the chain', () => {
    // Only Chrome refuses to execute a text/html script; Firefox and Safari fire load on the
    // HTML page a captive portal or SPA fallback returns. Every loader now checks the global
    // on load and moves on, instead of polling out its timeout or rejecting the whole chain.
    for (const src of [pipeline, pipelineSource]) {
      const cdn = between(src, 'const _loadCdnScript = (label, urls, isReady, opts) => {', 'const ensurePdfLibLoaded = async () => {');
      expect(cdn).toContain('s.onload = () => setTimeout(() => { if (!isReady()) resolve(false); }, 250);');
      const axe = between(src, 'const runAxeAudit = async (htmlContent) => {', '// Shorter settle delay when inlined');
      expect(axe).toContain('script.onload = () => { if (window.axe) { clearTimeout(_loadDeadline); resolve(); } else {');
      // (the early `if (_acePromise) return _acePromise;` sits BEFORE the chain, so slice to the next function)
      const ace = between(src, 'const _ensureAce = () => {', 'const runEqualAccessAudit = async (htmlContent) => {');
      expect(ace).not.toContain('ace.js loaded but window.ace.Checker missing');
      expect(ace).toMatch(/else \{ try \{ s\.remove\(\); \} catch \(_\) \{\} tryAt\(i \+ 1\); \}/);
      const temml = between(src, 'const _ensureTemml = () => {', 'const _applyImageIntel = ');
      expect(temml).not.toContain('temml loaded but missing');
      expect(temml).toMatch(/if \(window\.temml\) \{ clearTimeout\(_deadline\); resolve\(\); \} else \{ try \{ s\.remove\(\); \} catch \(_\) \{\} tryAt\(i \+ 1\); \}/);
    }
  });

  it('returns the result object from a successful single-file remediation, like batch mode always did', () => {
    // The success path fell off the end of its try and resolved undefined; the one-click wrapper
    // then polled a state ref and, on a miss, re-ran the whole remediation as a "no result" retry.
    for (const src of [pipeline, pipelineSource]) {
      const tail = between(src, 'if (_silentMode) return _result;', '} catch (err) {');
      const lastStatement = tail.trim().split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).pop();
      expect(lastStatement.trim()).toBe('return _result;');
    }
  });

  it('serves the engine directories with CORS and long caching (Cloudflare Pages _headers)', () => {
    const headers = readFileSync(resolve(ROOT, '_headers'), 'utf8');
    for (const dir of ['/axe-core/*', '/accessibility-checker-engine/*', '/pdfjs-dist/*', '/pdf-lib/*', '/mammoth/*', '/jszip/*', '/dompurify/*']) {
      const at = headers.indexOf(dir);
      expect(at, dir).toBeGreaterThanOrEqual(0);
      expect(headers.slice(at, at + 200)).toContain('Access-Control-Allow-Origin: *');
    }
    // Scoped: nothing in this file touches the app shell or the modules.
    expect(headers).not.toMatch(/^\/\*\s*$/m);
    expect(headers).not.toMatch(/^\/app\//m);
  });
});
