import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { inspectHtml, runAcceptance } = require('../dev-tools/document_export_at_acceptance.cjs');
const html = '<!doctype html><html lang="en"><title>Inspection</title><main>Read this.</main></html>';
const expected = { title: 'Inspection', language: 'en', headings: [], readingOrder: ['Read this.'], tables: [] };

describe('export operational inspection failures', () => {
  it('closes the created context if route setup fails before a page exists', async () => {
    const context = { route: vi.fn(async () => { throw Error('route setup failed'); }), newPage: vi.fn(), close: vi.fn(async () => {}) };
    const browser = { newContext: vi.fn(async () => context) };
    await expect(inspectHtml(browser, 'unused.html', expected, Buffer.from(html))).rejects.toThrow('route setup failed');
    expect(context.newPage).not.toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it('records an unavailable inspection and closes its context when page creation fails', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-export-inspection-'));
    const artifact = path.join(directory, 'artifact.html'), manifest = path.join(directory, 'manifest.json');
    const context = { route: vi.fn(async () => {}), newPage: vi.fn(async () => { throw Error('page creation failed'); }), close: vi.fn(async () => {}) };
    const browser = { newContext: vi.fn(async () => context), version: () => 'mock-browser' };
    try {
      fs.writeFileSync(artifact, html);
      fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'reading', kind: 'html', path: artifact, expected }] }));
      const report = await runAcceptance(manifest, { browser });
      expect(context.close).toHaveBeenCalledTimes(1);
      expect(report.artifacts[0].checks).toContainEqual({ id: 'inspection-executed', status: 'unavailable', observed: 'page creation failed' });
      expect(report.artifacts[0].checks.filter(check => check.status === 'failed')).toEqual([]);
      expect(report.artifacts[0].coverage).toEqual({ complete: false, wholeDocument: false, reasons: ['inspection-failed'] });
      expect(report.artifacts[0].checks.find(check => check.id === 'artifact.byte-stability').status).toBe('passed');
      expect(report.artifacts[0].automatedStatus).toBe('failed');
      expect(report.automatedStatus).toBe('failed');
      expect(report.humanAcceptance.status).toBe('not-run');
    } finally {
      if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
      if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
      fs.rmdirSync(directory);
    }
  });
});
