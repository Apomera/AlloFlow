import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const harnessSource = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path',
  harnessSource.slice(harnessSource.indexOf('const SRC ='), harnessSource.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const generatedRule = 'label:has(input[type="file"]) { display: none !important; }';
const instruction = '<p>Read the source instructions and record every observation in your notebook.</p>';
const picker = '<label>Upload diagram<input type="file" name="diagram"></label>';
const doc = (css = generatedRule, body = picker + instruction) =>
  '<!DOCTYPE html><html lang="en"><head><style>@media print { ' + css
  + ' }</style></head><body><main><h1 style="color:#777777">Study</h1>' + body + '</main></body></html>';
const improveContrast = html => html.replace('color:#777777', 'color:#333333');

describe('generated print selector content-preservation recovery', () => {
  it('accepts a harmless repair when unchanged generated print CSS contains the static file-picker selector', async () => {
    const input = doc(), h = make(improveContrast);
    expect(await h.run(input)).toBe(improveContrast(input));
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });

  it('still rejects moving source prose into the generated hidden print control', async () => {
    const input = doc();
    const h = make(html => html.replace('</label>' + instruction, instruction + '</label>'));
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'source-visibility-changed' }));
  });

  it('uses the static selector specificity when a later simpler selector would otherwise reveal the control', async () => {
    const input = doc(generatedRule + ' label { display: block !important; }');
    const h = make(html => html.replace('</label>' + instruction, instruction + '</label>'));
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'source-visibility-changed' }));
  });

  it('continues protecting control names after the generated selector is understood', async () => {
    const input = doc();
    const h = make(html => html.replace('name="diagram"', 'name="diagram" aria-label="Replace different diagram"'));
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'form-state-changed' }));
  });

  it.each(['p:hover', 'p:has(.unexpected)', 'label:has(input[type="password"])'])(
    'keeps unsupported visibility selector %s fail-closed instead of silently allowing hidden source content', async selector => {
      const input = doc(selector + ' { display: none !important; }');
      const h = make(improveContrast);
      expect(await h.run(input)).toBe(input);
      expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'source-contract-uncheckable' }));
    },
  );
});

it('surfaces the content-preservation rejection reason through default MCP logging', () => {
  const source = fs.readFileSync('desktop/mcp/remediation_headless_driver.cjs', 'utf8');
  const start = source.indexOf("    page.on('console', (msg) => {");
  const end = source.indexOf('    // Web Crypto is unavailable', start);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  let handler;
  const logs = [];
  new Function('page', 'rlog', 'process', source.slice(start, end))(
    { on: (event, callback) => { expect(event).toBe('console'); handler = callback; } },
    text => logs.push(text), { env: {} },
  );
  const rejection = '[aiFixChunked:pdf-pass-1] rejected chunk candidate for chunk 1: source-contract-uncheckable; preserving the input';
  handler({ text: () => rejection });
  expect(logs).toEqual([rejection]);
});
