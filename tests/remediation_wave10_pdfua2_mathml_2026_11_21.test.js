import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

const mcpPdf = require(path.resolve(ROOT, 'desktop/mcp/remediation_chromium_pdf.cjs'));
const portablePdf = require(path.resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs'));
const PDFLib = require(path.resolve(ROOT, 'desktop/mcp/vendor/pdf-lib.min.js'));

const PORTABLE_ENGINE = path.resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const PORTABLE_RENDER_SCRIPT = path.resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-w10-mathml-'));

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
});

function sha256File(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(ROOT, relPath))).digest('hex');
}

function runVeraPdfUa1(pdfPath) {
  const py = [
    'import importlib.util, json, pathlib, sys',
    'spec = importlib.util.spec_from_file_location("ap", sys.argv[1])',
    'mod = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(mod)',
    'cap = mod.verapdf_capability()',
    'if not cap.get("available"):',
    '  print(json.dumps({"available": False, "detail": cap.get("reason") or "unavailable"}))',
    'else:',
    '  v = mod.validate_pdf_ua(pathlib.Path(sys.argv[2]))',
    '  print(json.dumps({"available": True, **v}))',
  ].join('\n');
  const res = spawnSync(PYTHON, ['-c', py, PORTABLE_ENGINE, pdfPath], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180_000,
  });
  if (res.error || res.status !== 0) {
    throw new Error(`veraPDF probe failed: ${res.stderr || (res.error && res.error.message)}`);
  }
  return JSON.parse(res.stdout);
}

const MATHML_FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Wave 10B MathML Associated Files Reference</title>
</head>
<body>
  <main>
    <h1>Quadratic Formula and Mass-Energy Equivalence</h1>
    <p>Inline equation: <math aria-label="E equals m c squared"><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math></p>
    <p>Block quadratic solution:</p>
    <math display="block" alttext="f(x) = (-b ± √(b² - 4ac)) / (2a)" xmlns="http://www.w3.org/1998/Math/MathML">
      <mi>x</mi><mo>=</mo>
      <mfrac>
        <mrow><mo>-</mo><mi>b</mi><mo>&#x00B1;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow>
        <mrow><mn>2</mn><mi>a</mi></mrow>
      </mfrac>
    </math>
    <figure>
      <math><mi>A</mi><mo>=</mo><mi>&#x03C0;</mi><msup><mi>r</mi><mn>2</mn></msup></math>
      <figcaption>Area of a circle of radius r</figcaption>
    </figure>
  </main>
</body>
</html>`;

describe('Wave 10B — PDF/UA-2 MathML Associated Files (/AF) & PDF/UA-1 Compliance', () => {
  it('(a) extractMathMlFragmentsFromHtml extracts ordered <math> blocks, normalizes xmlns, and rejects unsafe markup', () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<body>
  <!-- <math><mi>commented_out</mi></math> -->
  <style>/* <math><mi>in_style</mi></math> */</style>
  <p>First without xmlns: <MATH><mi>a</mi><mo>+</mo><mi>b</mi></MATH></p>
  <p>With mtext prose "one = 1" and nested math inside semantics:
    <math xmlns="http://example.invalid/bad" display="block">
      <semantics>
        <mrow><mtext>one = 1</mtext><mo>,</mo><mi>x</mi></mrow>
        <annotation-xml encoding="MathML-Content"><math><apply><eq/><ci>x</ci><cn>1</cn></apply></math></annotation-xml>
      </semantics>
    </math>
  </p>
  <p>Unsafe script inside math: <math><mi>bad</mi><script>alert(1)</script></math></p>
  <p>Unsafe iframe inside math: <math><mtext><iframe src="https://evil.example"></iframe></mtext></math></p>
  <p>Unsafe event handler: <math onclick="evil()"><mi>x</mi></math></p>
  <p>Unsafe javascript href: <math><mi href="javascript:alert(1)">x</mi></math></p>
  <p>Unsafe DOCTYPE/ENTITY: <math><!DOCTYPE foo><mi>x</mi></math></p>
  <p>Empty math ignored: <math>   </math></p>
  <p>Third valid: <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math></p>
</body>
</html>`;

    for (const mod of [mcpPdf, portablePdf]) {
      const frags = mod.extractMathMlFragmentsFromHtml(html);
      expect(frags).toHaveLength(3);
      expect(frags[0]).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo><mi>b</mi></math>');
      expect(frags[1]).toContain('xmlns="http://www.w3.org/1998/Math/MathML"');
      expect(frags[1]).not.toContain('example.invalid');
      expect(frags[1]).toContain('<mtext>one = 1</mtext>');
      expect(frags[1]).toContain('<annotation-xml encoding="MathML-Content">');
      expect(frags[2]).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math>');

      // Oversized single fragment (> 128 KiB) is rejected; fragment count is capped at 128.
      const hugeMath = `<math><mtext>${'x'.repeat(140 * 1024)}</mtext></math>`;
      expect(mod.extractMathMlFragmentsFromHtml(hugeMath)).toEqual([]);

      const manyHtml = Array.from({ length: 140 }, (_, i) => `<math><mn>${i + 1}</mn></math>`).join('\n');
      const capped = mod.extractMathMlFragmentsFromHtml(manyHtml);
      expect(capped).toHaveLength(mod.MAX_MATHML_FRAGMENTS);
      expect(capped[0]).toContain('<mn>1</mn>');
      expect(capped[capped.length - 1]).toContain(`<mn>${mod.MAX_MATHML_FRAGMENTS}</mn>`);
    }
  });

  it('(a2) finalizeTaggedPdfBytes binds direct opts.mathMlFragments onto existing /S /Formula StructElems cleanly', async () => {
    const contentStream = zlib.deflateSync(Buffer.from('BT /F1 12 Tf (x = 1) Tj ET\n', 'latin1'));
    const objs = [
      '1 0 obj\n<</Type /Catalog /Pages 2 0 R /StructTreeRoot 5 0 R /MarkInfo <</Marked true>>>>\nendobj\n',
      '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n',
      '3 0 obj\n<</Type /Page /Parent 2 0 R /Contents 4 0 R>>\nendobj\n',
      Buffer.concat([
        Buffer.from(`4 0 obj\n<</Filter /FlateDecode /Length ${contentStream.length}>>\nstream\n`, 'latin1'),
        contentStream,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]),
      '5 0 obj\n<</Type /StructTreeRoot /K [6 0 R]>>\nendobj\n',
      '6 0 obj\n<</Type /StructElem /S /Document /P 5 0 R /K [7 0 R]>>\nendobj\n',
      '7 0 obj\n<</Type /StructElem /S /Formula /P 6 0 R /Pg 3 0 R /K 0>>\nendobj\n',
    ];
    const parts = [Buffer.from('%PDF-1.7\n', 'latin1')];
    let offset = parts[0].length;
    const offsets = [0];
    for (const o of objs) {
      const buf = Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1');
      offsets.push(offset);
      parts.push(buf);
      offset += buf.length;
    }
    let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objs.length; i += 1) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    parts.push(Buffer.from(`${xref}trailer\n<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${offset}\n%%EOF\n`, 'latin1'));
    const rawPdf = Buffer.concat(parts);

    const mathXml = '<math><mi>x</mi><mo>=</mo><mn>1</mn></math>';
    const finalized = mcpPdf.finalizeTaggedPdfBytes(rawPdf, {
      title: 'Direct Formula Test',
      pdfuaPart: 1,
      mathMlFragments: [mathXml],
    });
    expect(finalized.summary.mathMlAfAttached).toBe(1);

    const doc = await PDFLib.PDFDocument.load(finalized.bytes.toString('base64'));
    const formulaObj = doc.context.lookup(PDFLib.PDFRef.of(7, 0));
    expect(formulaObj.get(PDFLib.PDFName.of('S')).toString()).toBe('/Formula');
    expect(formulaObj.get(PDFLib.PDFName.of('AF'))).toBeTruthy();
    expect(formulaObj.get(PDFLib.PDFName.of('Alt'))).toBeTruthy();

    // Opt-out attachMathMlAf: false skips /AF attachment cleanly.
    const optedOut = mcpPdf.finalizeTaggedPdfBytes(rawPdf, {
      title: 'Direct Formula Opt Out',
      pdfuaPart: 1,
      mathMlFragments: [mathXml],
      attachMathMlAf: false,
    });
    expect(optedOut.summary.mathMlAfAttached).toBe(0);
    expect(optedOut.bytes.toString('latin1')).not.toContain('/application#2Fmathml+xml');
  });

  it('(b)+(c) Real Chromium + finalizeTaggedPdfBytes attaches valid MathML /AF streams and passes real veraPDF PDF/UA-1 (0 failed rules)', async () => {
    const playwright = require('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const rendered = await mcpPdf.renderHtmlToTaggedPdf(browser, MATHML_FIXTURE_HTML, {
        title: 'Wave 10B MathML Associated Files Reference',
        lang: 'en',
        pdfuaId: 1,
      });

      expect(rendered.pdfUaFinalization.mathMlAfAttached).toBe(3);
      expect(rendered.pdfUaFinalization.figureWrappersNormalized).toBe(1);

      // Parse active PDF objects via pdf-lib and verify exact MathML stream bytes, Filespec, /S /Formula + /AF, and zero sentinel leakage.
      const doc = await PDFLib.PDFDocument.load(rendered.bytes.toString('base64'));
      const expectedFragments = mcpPdf.extractMathMlFragmentsFromHtml(MATHML_FIXTURE_HTML);
      expect(expectedFragments).toHaveLength(3);

      const activeEmbeddedMath = [];
      const activeFilespecs = [];
      const activeFormulas = [];
      let activeSentinelLeaks = 0;

      for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj.toString().includes('__ALLOFLOW_MATHML_AF_')) activeSentinelLeaks += 1;
        if (obj instanceof PDFLib.PDFRawStream) {
          const tp = obj.dict.get(PDFLib.PDFName.of('Type'));
          const st = obj.dict.get(PDFLib.PDFName.of('Subtype'));
          if (tp && tp.toString() === '/EmbeddedFile' && st && st.toString() === '/application#2Fmathml+xml') {
            const payload = Buffer.from(obj.getContents()).toString('utf8');
            activeEmbeddedMath.push(payload);
            const params = obj.dict.get(PDFLib.PDFName.of('Params'));
            expect(params).toBeTruthy();
            expect(Number(params.get(PDFLib.PDFName.of('Size')).toString())).toBe(Buffer.byteLength(payload, 'utf8'));
          }
        } else if (obj instanceof PDFLib.PDFDict) {
          const tp = obj.get(PDFLib.PDFName.of('Type'));
          if (tp && tp.toString() === '/Filespec') {
            activeFilespecs.push({
              f: obj.get(PDFLib.PDFName.of('F')).decodeText(),
              uf: obj.get(PDFLib.PDFName.of('UF')).decodeText(),
              desc: obj.get(PDFLib.PDFName.of('Desc')).decodeText(),
              rel: obj.get(PDFLib.PDFName.of('AFRelationship')).toString(),
              hasEf: Boolean(obj.get(PDFLib.PDFName.of('EF'))),
            });
          } else if (tp && tp.toString() === '/StructElem') {
            const sv = obj.get(PDFLib.PDFName.of('S'));
            if (sv && sv.toString() === '/Formula') {
              activeFormulas.push({
                hasAf: Boolean(obj.get(PDFLib.PDFName.of('AF'))),
                alt: obj.get(PDFLib.PDFName.of('Alt')).decodeText(),
              });
            }
          }
        }
      }

      expect(activeSentinelLeaks).toBe(0);
      expect(activeEmbeddedMath).toEqual(expectedFragments);
      expect(activeFilespecs).toEqual([
        { f: 'formula-1.mml', uf: 'formula-1.mml', desc: 'MathML representation of formula 1', rel: '/Supplement', hasEf: true },
        { f: 'formula-2.mml', uf: 'formula-2.mml', desc: 'MathML representation of formula 2', rel: '/Supplement', hasEf: true },
        { f: 'formula-3.mml', uf: 'formula-3.mml', desc: 'MathML representation of formula 3', rel: '/Supplement', hasEf: true },
      ]);
      expect(activeFormulas).toHaveLength(3);
      expect(activeFormulas.every((f) => f.hasAf)).toBe(true);
      expect(activeFormulas[0].alt).toBe('E equals m c squared');
      expect(activeFormulas[1].alt).toBe('f(x) = (-b ± √(b² - 4ac)) / (2a)');
      expect(activeFormulas[2].alt).toContain('A');

      // Catalog must register /Names /EmbeddedFiles.
      expect(doc.catalog.get(PDFLib.PDFName.of('Names'))).toBeTruthy();

      // Verify real veraPDF PDF/UA-1 compliance (0 failed rules).
      const outPdf = path.join(tmpDir, 'mcp-mathml-af.pdf');
      fs.writeFileSync(outPdf, rendered.bytes);
      const vera = runVeraPdfUa1(outPdf);
      if (vera.available) {
        expect(vera.status).toBe('completed');
        expect(vera.compliant).toBe(true);
        expect(vera.failedRuleCount).toBe(0);
        expect(vera.failedRules).toEqual([]);
        expect(vera.passedRules).toBeGreaterThanOrEqual(100);
      }

      // Also verify portable render_tagged_pdf.cjs CLI produces identical MathML /AF + 0 failed PDF/UA-1 rules.
      const cliHtmlPath = path.join(tmpDir, 'portable-mathml.html');
      const cliPdfPath = path.join(tmpDir, 'portable-mathml.pdf');
      fs.writeFileSync(cliHtmlPath, MATHML_FIXTURE_HTML, 'utf8');
      const cliRun = spawnSync(
        process.execPath,
        [PORTABLE_RENDER_SCRIPT, '--html', cliHtmlPath, '--pdf', cliPdfPath, '--pdfua-id', '1'],
        { cwd: ROOT, encoding: 'utf8', timeout: 60_000 },
      );
      expect(cliRun.status, cliRun.stderr || cliRun.stdout).toBe(0);
      const cliJson = JSON.parse(cliRun.stdout);
      expect(cliJson.ok).toBe(true);
      expect(cliJson.pdfUaFinalization.mathMlAfAttached).toBe(3);

      const cliVera = runVeraPdfUa1(cliPdfPath);
      if (cliVera.available) {
        expect(cliVera.status).toBe('completed');
        expect(cliVera.compliant).toBe(true);
        expect(cliVera.failedRuleCount).toBe(0);
        expect(cliVera.failedRules).toEqual([]);
      }
    } finally {
      await browser.close();
    }
  }, 180_000);

  it('(d) keeps all 3 render_tagged_pdf.cjs skill copies byte-identical', () => {
    const canonicalHash = sha256File('agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');
    expect(sha256File('platform_packages/claude-alloflow/skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs')).toBe(canonicalHash);
    expect(sha256File('plugins/alloflow-pdf-remediation/skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs')).toBe(canonicalHash);
  });
});
