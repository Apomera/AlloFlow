import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = fs.readFileSync(path.join(ROOT, 'view_export_preview_source.jsx'), 'utf8');
const VENDOR = path.join(ROOT, 'vendor', 'harper', '2.4.0');
const ASSET_PREFIX = 'https://alloflow-cdn.pages.dev/vendor/harper/2.4.0/';
const MIME = new Map<string, string>([
  ['index.js', 'application/javascript; charset=utf-8'],
  ['BinaryModule-DTTQwokQ.js', 'application/javascript; charset=utf-8'],
  ['harper_wasm_full_bg.wasm', 'application/wasm'],
]);

const cut = (startMarker: string, endMarker: string) => {
  const start = SRC.indexOf(startMarker);
  const end = SRC.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`extraction markers missing: ${startMarker}`);
  return SRC.slice(start, end);
};
const LOADER = cut('let _harperPromise = null;', '// end _ensureHarper');
const APPLY_HELPER = cut('function _applyHarperTextReplacement', '// end _applyHarperTextReplacement');

test.describe('Builder Writing Check in a Canvas-like nested iframe', () => {
  test('loads only AlloFlow-hosted assets and applies a spelling replacement to the editable preview', async ({ page }) => {
    test.setTimeout(120000);
    const vendorRequests: string[] = [];
    const externalHarperRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith(ASSET_PREFIX)) vendorRequests.push(url);
      if (url.includes('jsdelivr.net') && url.includes('harper')) externalHarperRequests.push(url);
    });
    await page.route(`${ASSET_PREFIX}**`, async (route) => {
      const name = path.posix.basename(new URL(route.request().url()).pathname);
      const contentType = MIME.get(name);
      if (!contentType) {
        await route.fulfill({ status: 404, body: `Unexpected Harper asset: ${name}` });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': contentType,
        },
        body: fs.readFileSync(path.join(VENDOR, name)),
      });
    });

    await page.setContent('<iframe id="canvas" sandbox="allow-scripts allow-same-origin" title="Canvas host"></iframe>');
    const canvas = page.frames().find((frame) => frame !== page.mainFrame());
    expect(canvas, 'Canvas-like outer iframe should exist').toBeTruthy();
    await canvas!.setContent('<button id="apply-correction" type="button" disabled>Apply</button><iframe id="preview" title="Editable document preview"></iframe>');

    const setup = await canvas!.evaluate(async ({ loader, applyHelper }) => {
      const preview = document.querySelector<HTMLIFrameElement>('#preview');
      if (!preview?.contentDocument) throw new Error('Nested editable preview iframe missing');
      const previewDocument = preview.contentDocument;
      previewDocument.open();
      previewDocument.write('<!doctype html><html lang="en"><body contenteditable="true"><p id="copy">This word is speling.</p></body></html>');
      previewDocument.close();

      const production = new Function(
        `${loader}\n${applyHelper}\nreturn { ensureHarper: _ensureHarper, applyReplacement: _applyHarperTextReplacement };`,
      )();
      const linter = await production.ensureHarper();
      const paragraph = previewDocument.querySelector<HTMLParagraphElement>('#copy');
      const before = paragraph?.textContent || '';
      const lints = await linter.lint(before, { language: 'plaintext' });
      const spelling = lints.find((lint: any) => {
        const span = lint.span();
        return before.slice(span.start, span.end).toLowerCase() === 'speling';
      });
      if (!spelling || !paragraph?.firstChild) throw new Error('Expected spelling lint missing');
      const span = spelling.span();
      const replacement = spelling.suggestions()
        .map((suggestion: any) => suggestion?.get_replacement_text?.())
        .find((value: unknown) => value === 'spelling');
      if (replacement !== 'spelling') throw new Error('Expected spelling replacement missing');

      const button = document.querySelector<HTMLButtonElement>('#apply-correction');
      if (!button) throw new Error('Apply button missing');
      button.disabled = false;
      button.textContent = `Apply ${replacement}`;
      button.addEventListener('click', () => {
        (window as any).__harperApplied = production.applyReplacement(
          previewDocument,
          paragraph.firstChild,
          span.start,
          span.end - span.start,
          replacement,
        );
      }, { once: true });
      return { before, bad: before.slice(span.start, span.end), replacement };
    }, { loader: LOADER, applyHelper: APPLY_HELPER });

    expect(setup).toEqual({
      before: 'This word is speling.',
      bad: 'speling',
      replacement: 'spelling',
    });
    await canvas!.locator('#apply-correction').click();

    const result = await canvas!.evaluate(() => {
      const preview = document.querySelector<HTMLIFrameElement>('#preview');
      return {
        applied: (window as any).__harperApplied === true,
        after: preview?.contentDocument?.querySelector('#copy')?.textContent || '',
        markedEdited: preview?.contentDocument?.body.getAttribute('data-allo-user-edited'),
      };
    });
    expect(result).toEqual({
      applied: true,
      after: 'This word is spelling.',
      markedEdited: '1',
    });
    expect(externalHarperRequests).toEqual([]);
    expect(vendorRequests.sort()).toEqual([
      `${ASSET_PREFIX}BinaryModule-DTTQwokQ.js`,
      `${ASSET_PREFIX}harper_wasm_full_bg.wasm`,
      `${ASSET_PREFIX}index.js`,
    ].sort());
  });
});
