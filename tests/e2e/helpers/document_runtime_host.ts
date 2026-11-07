/**
 * The host a tagged-PDF spec has to boot (2026-11-03). The pipeline loads the pdf.js worker (and
 * DOMPurify, Tesseract) only through the host's verified-runtime hooks (__alloGetVerifiedRuntimeAsset,
 * __alloConfigureTrustedScript). A page that just adds vendor <script> tags has no hooks, so
 * createTaggedPdf logs "Stage 4 pdf.js/pako load failed, using Stage 3" and links nothing; specs
 * about per-leaf linking then measure the fallback (7 failed that way, unnoticed, after the hooks landed).
 *
 * This installs the same host the MCP driver does: the reviewed manifest and hash-checked files
 * (read by the driver's own readDocumentRuntime) served from disk under http://127.0.0.1/app/, which
 * puts the runtime policy in its desktop mode (no remote code). The libraries come from the same
 * records as their workers, so pdf.js and its worker are always one version.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';

const ROOT = path.resolve(__dirname, '../../..');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readDocumentRuntime } = require(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'));
const VENDOR = path.join(ROOT, 'desktop/mcp/vendor');
const BOOT_URL = 'http://127.0.0.1/app/__alloflow_e2e_boot__';
/** Files in desktop/mcp/vendor, for the specs' own use of pdf.js (e.g. reading the result back). */
export const VENDOR_URL = 'http://127.0.0.1/app/__alloflow_e2e_vendor__/';
const LIBRARY_RECORD: Record<string, string> = {
  'pdfjs.min.js': 'pdfjs.main', 'pdf-lib.min.js': 'pdf-lib', 'pako.min.js': 'pako', 'fontkit.umd.min.js': 'fontkit',
  'tesseract.min.js': 'tesseract.main', 'axe.min.js': 'axe-core',
};

let runtime: any = null;
const loadRuntime = () => (runtime = runtime || readDocumentRuntime());

/** Navigate to the boot page, install the verified-runtime host, then add `libraries` (vendor file names). */
export async function bootDocumentRuntime(page: Page, libraries: string[] = ['pdfjs.min.js', 'pdf-lib.min.js', 'pako.min.js', 'fontkit.umd.min.js']) {
  const rt = loadRuntime();
  await page.route('http://127.0.0.1/**', (route) => {
    const u = new URL(route.request().url());
    if (u.href === BOOT_URL) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
    const file = !u.search && rt.files.get(u.pathname);
    if (file) return route.fulfill({ contentType: file.kind === 'wasm' ? 'application/wasm' : 'text/javascript; charset=utf-8', body: file.body });
    const vendorPath = new URL(VENDOR_URL).pathname;
    if (u.pathname.startsWith(vendorPath)) {
      const name = decodeURIComponent(u.pathname.slice(vendorPath.length));
      const abs = path.resolve(VENDOR, name);
      if (abs.startsWith(VENDOR + path.sep) && fs.existsSync(abs)) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(abs) });
    }
    return route.fulfill({ status: 404, body: 'not found' });
  });
  await page.goto(BOOT_URL);
  for (const name of libraries) {
    const record = rt.manifest.assets[LIBRARY_RECORD[name]];
    if (record) await page.addScriptTag({ url: 'http://127.0.0.1/app/' + record.path });
    else await page.addScriptTag({ path: path.join(VENDOR, name) });
  }
  await page.addScriptTag({ content: rt.source });
  // The specs' own pdf.js calls (reading a result back) use the worker from the same record.
  const worker = 'http://127.0.0.1/app/' + rt.manifest.assets['pdfjs.worker'].path;
  await page.evaluate(({ manifest, worker }) => {
    const W = window as any;
    const policy = W._alloInstallRuntimeGraphHost(manifest, window);
    Object.defineProperty(window, '__alloConfigureTrustedScript', { writable: false, configurable: true,
      value: (script: any, url: string, key: string) => policy.configureScript(script, url, key) });
    if (W.pdfjsLib) W.pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
  }, { manifest: rt.manifest, worker });
}
