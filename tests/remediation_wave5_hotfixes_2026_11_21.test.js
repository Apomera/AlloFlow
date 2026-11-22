import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function readRepo(rel) {
  return fs.readFileSync(path.resolve(ROOT, rel), 'utf8');
}

function sha256File(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(ROOT, rel))).digest('hex');
}

describe('Wave 5 — W5-1 & W5-2: Core doc_pipeline_source.jsx hotfixes', () => {
  const docSrc = readRepo('doc_pipeline_source.jsx');

  it('W5-1: preserves DPUB-ARIA & ARIA 1.2 roles and never corrupts data-role attributes', () => {
    const start = docSrc.indexOf('const __validRoles = new Set([');
    expect(start).toBeGreaterThan(-1);
    const end = docSrc.indexOf('if (__roleFixCount > 0)', start);
    expect(end).toBeGreaterThan(start);
    const snippet = docSrc.slice(start, end);

    const runRolePass = new Function(
      'accessibleHtml',
      `${snippet}\nreturn { html: accessibleHtml, count: __roleFixCount };`,
    );

    const input =
      '<div data-role="custom-card" role="doc-footnote">' +
      '<a role="doc-noteref" href="#fn1">1</a>' +
      '<aside role="doc-endnote">Endnote</aside>' +
      '<figure role="graphics-document"><code role="code">x</code></figure>' +
      '<footer role="content-info">F</footer>' +
      '<div role="bogus-made-up">B</div>' +
      '</div>';

    const out = runRolePass(input);
    expect(out.html).toContain('data-role="custom-card"');
    expect(out.html).toContain('role="doc-footnote"');
    expect(out.html).toContain('role="doc-noteref"');
    expect(out.html).toContain('role="doc-endnote"');
    expect(out.html).toContain('role="graphics-document"');
    expect(out.html).toContain('role="code"');
    expect(out.html).toContain('role="contentinfo"');
    expect(out.html).not.toContain('role="bogus-made-up"');
    expect(out.count).toBe(2); // content-info corrected + bogus-made-up removed
  });

  it('W5-2: Step 4a uses depth-aware TOC nav wrapping, safe #anchor/mailto link labels, and DOM-based fixDuplicateIds', () => {
    const s4Start = docSrc.indexOf('// 8b. Ensure nav landmark (wrap TOC-like structures, depth-tracking nested lists)');
    expect(s4Start).toBeGreaterThan(-1);
    const s4End = docSrc.indexOf('if (aiFixCount > 0) {', s4Start);
    expect(s4End).toBeGreaterThan(s4Start);
    const block = docSrc.slice(s4Start, s4End);

    // Must no longer contain the unsafe unescaped RegExp duplicate-ID loop.
    expect(block).not.toContain('new RegExp(`id="${id}"`');
    expect(block).toContain('fixDuplicateIds(accessibleHtml)');

    // Execute the TOC wrapping slice directly on a nested TOC list.
    const tocEnd = block.indexOf('// 8c. Ensure footer landmark');
    const tocSnippet = block.slice(0, tocEnd);
    const runToc = new Function(
      'accessibleHtml',
      `let aiFixCount = 0;\n${tocSnippet}\nreturn { html: accessibleHtml, aiFixCount };`,
    );
    const nestedToc =
      '<main><h2>Table of Contents</h2><ul><li>Unit 1<ul><li>Lesson 1.1</li></ul></li><li>Unit 2</li></ul><p>Body</p></main>';
    const tocOut = runToc(nestedToc);
    expect(tocOut.aiFixCount).toBe(1);
    expect(tocOut.html).toBe(
      '<main><nav role="navigation" aria-label="Table of Contents"><h2>Table of Contents</h2><ul><li>Unit 1<ul><li>Lesson 1.1</li></ul></li><li>Unit 2</li></ul></nav><p>Body</p></main>',
    );

    // Execute the link rewriting slice directly on #anchor, mailto, and https links.
    const linkStart = block.indexOf('// 11. Fix "click here"');
    const linkEnd = block.indexOf('// 12. Ensure viewport meta tag');
    const linkSnippet = block.slice(linkStart, linkEnd);
    const runLinks = new Function(
      'accessibleHtml',
      `let aiFixCount = 0;\n${linkSnippet}\nreturn { html: accessibleHtml, aiFixCount };`,
    );
    const linksOut = runLinks(
      '<p><a href="#section-2">read more</a> <a href="mailto:help@school.edu">here</a> <a href="https://example.org/doc">click here</a></p>',
    );
    expect(linksOut.html).toContain('<a href="#section-2">Section 2</a>');
    expect(linksOut.html).toContain('<a href="mailto:help@school.edu">help@school.edu</a>');
    expect(linksOut.html).toContain('<a href="https://example.org/doc">example.org</a>');
  });
});

describe('Wave 5 — W5-3: verapdf/verapdf_validator.html honesty, final re-validation & byte transfer', () => {
  const veraHtml = readRepo('verapdf/verapdf_validator.html');
  const scriptMatch = veraHtml.match(/<script>([\s\S]*?)<\/script>/);
  expect(scriptMatch).toBeTruthy();

  it('withholds pdfuaid:part=1 when structural rules fail, honors opts.lang, and re-validates after final iteration', () => {
    expect(veraHtml).toContain('_safeToClaimPdfUa');
    expect(veraHtml).toContain('pdfuaid:part withheld while structural rules fail');
    expect(veraHtml).toContain('REVIEW: defaulted to en');
    expect(veraHtml).toContain('if (mutatedAfterLastValidate)');
    expect(veraHtml).toContain('preferBytes');
    expect(veraHtml).toContain('repairedBytes');
  });

  it('mirrors verapdf/verapdf_validator.html cleanly across all 3 desktop deploy directories', () => {
    const h = sha256File('verapdf/verapdf_validator.html');
    for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
      expect(sha256File(path.join(dir, 'verapdf/verapdf_validator.html'))).toBe(h);
    }
  });
});

describe('Wave 5 — W5-4, W5-5, W5-6: view_pdf_audit_source.jsx & view_pdf_validator_module.js', () => {
  const viewSrc = readRepo('view_pdf_audit_source.jsx');
  const valSrc = readRepo('view_pdf_validator_module.js');

  it('W5-4: hoists warm VeraPDF iframe to a module-level singleton and cleans up failed frames', () => {
    expect(viewSrc).toContain('let _sharedVeraIframeHandle = null;');
    expect(viewSrc).toContain('if (_sharedVeraIframeHandle && _sharedVeraIframeHandle.frame && _sharedVeraIframeHandle.frame.isConnected');
    expect(viewSrc).toContain('Remove failed/blocked iframe immediately');
    expect(viewSrc).toContain('preferBytes: true');
  });

  it('W5-5: _alloExecutableActiveContentFindings delegates to pipeline and includes other-actions & multimedia in fallback', () => {
    const start = viewSrc.indexOf('function _alloExecutableActiveContentFindings(result)');
    const end = viewSrc.indexOf('function _alloCreateRemediationOperationOwner', start);
    const fnCode = viewSrc.slice(start, end);
    const fn = new Function('window', `${fnCode}\nreturn _alloExecutableActiveContentFindings;`);

    const fallback = fn({});
    const findings = fallback({
      activeContent: {
        findings: [
          { type: 'javascript' },
          { type: 'other-actions' },
          { type: 'multimedia' },
          { type: 'benign-note' },
        ],
      },
    });
    expect(findings.map((f) => f.type)).toEqual(['javascript', 'other-actions', 'multimedia']);

    let delegated = false;
    const withShared = fn({
      AlloModules: {
        createDocPipeline: {
          executableActiveContentFindings: () => {
            delegated = true;
            return [{ type: 'multimedia' }];
          },
        },
      },
    });
    expect(withShared({})).toEqual([{ type: 'multimedia' }]);
    expect(delegated).toBe(true);
  });

  it('W5-6: fixes Hindi RTL, DOCX internal #anchor links, DAISY NCX lang, and _dlEpubMO cancellation + WAV fallback', () => {
    // Hindi must NOT be in the RTL language list.
    const rtlLine = viewSrc.match(/const isRtl = \[[^\]]+\]\.some\(/);
    expect(rtlLine).toBeTruthy();
    expect(rtlLine[0]).not.toContain('Hindi');
    expect(rtlLine[0]).toContain('Arabic');

    // DOCX ExternalHyperlink must be gated on external schemes.
    expect(viewSrc).toContain('const isExternalLink = !!(r.link && /^(?:https?:|mailto:|tel:)/i.test(String(r.link).trim()));');
    expect(viewSrc).toContain('return isExternalLink ? new d.ExternalHyperlink({ link: r.link, children: [tr] }) : tr;');

    // DAISY NCX receives and honors lang.
    expect(viewSrc).toContain('function _htmlToDaisyNcx(html, title, uid, lang)');
    expect(viewSrc).toContain("'navigation.ncx': _htmlToDaisyNcx(cleanHtml, title, uid, lang)");

    // _dlEpubMO uses operation ownership + signal and reads raw WAV duration before MP3 transcoding.
    const moStart = viewSrc.indexOf('const _dlEpubMO = async () => {');
    const moEnd = viewSrc.indexOf('const _audioBusy', moStart);
    const moBlock = viewSrc.slice(moStart, moEnd > moStart ? moEnd : moStart + 7000);
    expect(moBlock).toContain("_beginRemediationOperation('readalong-epub-mo'");
    expect(moBlock).toContain('signal: _moOperation.signal');
    const rawDurPos = moBlock.indexOf('rawWavDur = _wavDurationFromBytes');
    const transcodePos = moBlock.indexOf('const normalizedBlob = await _epubCoreAudioBlob(rawBlob)');
    expect(rawDurPos).toBeGreaterThan(-1);
    expect(transcodePos).toBeGreaterThan(rawDurPos);
  });

  it('W5-6 validator: uses pdfBytes in encryption fallback and warns (not passes) on compressed/unreadable XMP', () => {
    expect(valSrc).toContain('await PDFDocument.load(pdfBytes, { ignoreEncryption: false });');
    expect(valSrc).not.toContain('await PDFDocument.load(bytes, { ignoreEncryption: false });');
    expect(valSrc).toContain("if (xmpUnreadable) {\n      checks.push({ rule: 'XMP dc:title non-empty (PDF/UA 7.1)', status: 'warn'");
    expect(valSrc).toContain("checks.push({ rule: 'PDF/UA declaration is evidence-backed (XMP ↔ content linkage)', status: 'warn'");
  });

  it('keeps doc_pipeline_module.js, view_pdf_audit_module.js, and view_pdf_validator_module.js 4-way mirrored', () => {
    for (const file of ['doc_pipeline_module.js', 'view_pdf_audit_module.js', 'view_pdf_validator_module.js']) {
      const h = sha256File(file);
      for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        expect(sha256File(path.join(dir, file)), `${file} mismatch in ${dir}`).toBe(h);
      }
    }
  });
});

describe('Wave 5 — W5-7: Chromium PDF/UA post-processor (/ParentTree sync, stream-aware spans, /RoleMap merge, dedup)', () => {
  const mcpPdf = require(path.resolve(ROOT, 'desktop/mcp/remediation_chromium_pdf.cjs'));
  const portablePdf = require(path.resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs'));

  function buildSyntheticPdf() {
    const contentStream = zlib.deflateSync(Buffer.from('q\nBT /F1 12 Tf (Hello) Tj ET\nQ\n', 'latin1'));
    // Include literal "endobj" inside a binary stream object to verify stream-aware scanning.
    const trickPayload = Buffer.from('binary-prefix endobj binary-suffix', 'latin1');

    const objs = [
      `1 0 obj\n<</Type /Catalog /Pages 2 0 R /StructTreeRoot 7 0 R>>\nendobj\n`,
      `2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n`,
      `3 0 obj\n<</Type /Page /Parent 2 0 R /Contents 4 0 R /StructParents 0>>\nendobj\n`,
      Buffer.concat([
        Buffer.from(`4 0 obj\n<</Filter /FlateDecode /Length ${contentStream.length}>>\nstream\n`, 'latin1'),
        contentStream,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]),
      Buffer.concat([
        Buffer.from(`5 0 obj\n<</Length ${trickPayload.length}>>\nstream\n`, 'latin1'),
        trickPayload,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]),
      // Existing indirect ParentTree with page StructParents 0 mapping MCID 0 -> LI (obj 9) and MCID 1 -> Span (obj 11)
      `6 0 obj\n<</Nums [0 12 0 R]>>\nendobj\n`,
      // StructTreeRoot with an EXISTING partial RoleMap (must merge /Em instead of skipping!)
      `7 0 obj\n<</Type /StructTreeRoot /ParentTree 6 0 R /RoleMap <</Custom /P>> /K [8 0 R]>>\nendobj\n`,
      `8 0 obj\n<</Type /StructElem /S /L /P 7 0 R /K [9 0 R]>>\nendobj\n`,
      // LI containing Lbl (10 0 R), direct integer MCID 0, and inline Em (11 0 R)
      `9 0 obj\n<</Type /StructElem /S /LI /P 8 0 R /Pg 3 0 R /K [10 0 R 0 11 0 R]>>\nendobj\n`,
      `10 0 obj\n<</Type /StructElem /S /Lbl /P 9 0 R /Pg 3 0 R /K 2>>\nendobj\n`,
      `11 0 obj\n<</Type /StructElem /S /Em /P 9 0 R /Pg 3 0 R /K 1>>\nendobj\n`,
      `12 0 obj\n[9 0 R 11 0 R 10 0 R]\nendobj\n`,
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
    const trailer = `trailer\n<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${offset}\n%%EOF\n`;
    parts.push(Buffer.from(xref + trailer, 'latin1'));
    return Buffer.concat(parts);
  }

  for (const [label, runFinalize] of [
    ['desktop/mcp/remediation_chromium_pdf.cjs', (raw) => mcpPdf.finalizeTaggedPdfBytes(raw, { title: 'Synthetic Test', pdfuaPart: 1 }).bytes],
    ['agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs', (raw) => {
      const tmp = path.join(os.tmpdir(), `alloflow-w5-${process.pid}-${Date.now()}.pdf`);
      fs.writeFileSync(tmp, raw);
      try {
        portablePdf.finalizeTaggedPdf(tmp, 'Synthetic Test', 1, null);
        return fs.readFileSync(tmp);
      } finally {
        try { fs.unlinkSync(tmp); } catch (_) {}
      }
    }],
  ]) {
    it(`${label}: syncs /ParentTree on /LBody synthesis, merges existing /RoleMap, survives binary endobj, and deduplicates objects`, () => {
      const raw = buildSyntheticPdf();
      const bytes = runFinalize(raw);
      const appended = bytes.subarray(raw.length).toString('latin1');

      // 1. Existing /RoleMap must retain /Custom /P AND merge /Em /Span.
      expect(appended).toMatch(/\/RoleMap\s*<<[^>]*\/Custom\s+\/P[^>]*\/Em\s+\/Span/);

      // 2. Synthesized /LBody wraps MCID 0 and obj 11.
      const lbodyMatch = /(?:^|\n)(\d+)\s+0\s+obj\n(?:(?!endobj)[\s\S])*?\/S\s+\/LBody[\s\S]*?\/K\s*\[0\s+11\s+0\s+R\]/.exec(appended);
      expect(lbodyMatch).toBeTruthy();
      const lbodyNum = Number(lbodyMatch[1]);

      // 3. /ParentTree array (obj 12) must now point MCID 0 at the new /LBody ref instead of 9 0 R!
      const ptArrMatch = /12\s+0\s+obj\s*\[([^\]]+)\]/.exec(appended);
      expect(ptArrMatch).toBeTruthy();
      expect(ptArrMatch[1].trim()).toBe(`${lbodyNum} 0 R 11 0 R 10 0 R`);

      // 4. Every replaced object number appears at most once in the incremental update.
      const emittedNums = [...appended.matchAll(/(?:^|\n)(\d+)\s+0\s+obj\b/g)].map((m) => Number(m[1]));
      expect(new Set(emittedNums).size).toBe(emittedNums.length);
    });
  }

  it('keeps all 3 render_tagged_pdf.cjs skill copies byte-identical with bounded zlib inflation', () => {
    const h = sha256File('agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');
    expect(sha256File('platform_packages/claude-alloflow/skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs')).toBe(h);
    expect(sha256File('plugins/alloflow-pdf-remediation/skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs')).toBe(h);
    const src = readRepo('agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');
    expect(src).toContain('maxOutputLength: 64 * 1024 * 1024');
    expect(src).toContain('maxOutputLength: 16 * 1024 * 1024');
  });
});

describe('Wave 5 — W5-8: Remote MCP lease expiry, Retry-After forwarding & fallback model allowlist', () => {
  const containerSrc = readRepo('services/alloflow-remote-mcp/src/remediation-container.ts');

  it('enforces lease_expires_at in both storageOutbound and geminiOutbound, forwards sanitized Retry-After, and supports optional fallback model', () => {
    expect(containerSrc).toContain('function isRunningJobLeaseActive(');
    expect(containerSrc).toContain('job.lease_expires_at !== null && job.lease_expires_at <= nowSeconds()');
    const leaseCalls = containerSrc.match(/if \(!isRunningJobLeaseActive\(job, attemptId\)\)/g) || [];
    expect(leaseCalls.length).toBe(2);
    expect(containerSrc).toContain('function sanitizeRetryAfterHeader(');
    expect(containerSrc).toContain('headers.set("Retry-After", retryAfter);');
    expect(containerSrc).toContain('function resolvedFallbackModel(');
    expect(containerSrc).toContain('allowedPaths.has(incoming.pathname)');
  });
});
