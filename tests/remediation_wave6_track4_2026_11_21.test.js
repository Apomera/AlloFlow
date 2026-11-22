import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

const PORTABLE_MAIN = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const PORTABLE_MIRRORS = [
  resolve(ROOT, 'platform_packages/claude-alloflow/skills/alloflow-portable-remediation/scripts/alloflow_portable.py'),
  resolve(ROOT, 'plugins/alloflow-pdf-remediation/skills/alloflow-portable-remediation/scripts/alloflow_portable.py'),
];
const SOURCE_ENGINE = resolve(ROOT, 'agent_skills/alloflow-source-remediation/scripts/alloflow_source.py');
const SOURCE_AUDITOR = resolve(ROOT, 'agent_skills/alloflow-source-remediation/scripts/audit_page.cjs');

const scratch = mkdtempSync(join(tmpdir(), 'alloflow-w6-t4-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('Wave 6 — Track 4: Portable/Source Skills & Local MCP Hardening', () => {
  it('T4-1: alloflow_portable.py keeps all 3 skill mirrors byte-identical and preserves print table borders', () => {
    const mainBuf = readFileSync(PORTABLE_MAIN);
    const mainHash = createHash('sha256').update(mainBuf).digest('hex');
    for (const mirror of PORTABLE_MIRRORS) {
      const h = createHash('sha256').update(readFileSync(mirror)).digest('hex');
      expect(h).toBe(mainHash);
    }
    const src = mainBuf.toString('utf8');
    expect(src).toContain('th, td {{ border: 1px solid #9ca3af; }}');
    expect(src).toContain('can_validate_pdfua = args.verapdf != "never" and verapdf_capability().get("available") is True');
    expect(src).toContain('source_is_encrypted = bool(');
  });

  it('T4-2: alloflow_portable.py orders pages via /Catalog->/Pages->/Kids, slices /Length-first streams, and unescapes Indexed literal palettes', () => {
    const pyCode = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("ap", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# 1. Out-of-order /Page objects (obj 20 is Page 1, obj 5 is Page 2)
s1 = b"BT /F1 12 Tf (FIRST_PAGE) Tj ET"
s2 = b"BT /F1 12 Tf (SECOND_PAGE) Tj ET"
pdf = (
    b"%PDF-1.4\\n"
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\\n"
    b"2 0 obj << /Type /Pages /Kids [20 0 R 5 0 R] /Count 2 >> endobj\\n"
    b"5 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R >> endobj\\n"
    + f"6 0 obj << /Length {len(s2)} >> stream\\n".encode() + s2 + b"\\nendstream endobj\\n"
    + b"20 0 obj << /Type /Page /Parent 2 0 R /Contents 21 0 R >> endobj\\n"
    + f"21 0 obj << /Length {len(s1)} >> stream\\n".encode() + s1 + b"\\nendstream endobj\\n"
)
extracted = mod._pdf_extract_text(pdf)

# 2. Stream containing literal b"endstream" inside /Length payload
payload = b"ABCDendstreamXYZ!"
pdf_stream = (
    b"%PDF-1.4\\n"
    + f"10 0 obj << /Length {len(payload)} >> stream\\n".encode()
    + payload
    + b"\\nendstream endobj\\n"
)
objs = list(mod._pdf_iter_stream_objects(pdf_stream))

# 3. Indexed palette with escaped ')' and octal '\\051' (2 RGB triplets = 6 bytes)
# Triplet 0: (41, 41, 10) -> '\\)\\051\\n'; Triplet 1: (65, 66, 67) -> 'ABC'
cs_dict = b"<< /ColorSpace [/Indexed /DeviceRGB 1 (\\\\)\\\\051\\\\nABC)] >>"
ct, label, pal, tf = mod._resolve_color_space(cs_dict, {})

print(json.dumps({
    "page_count": extracted["pages"],
    "text": extracted["text"],
    "stream_len": len(objs[0][2]),
    "stream_ok": objs[0][2] == payload,
    "palette": list(pal) if pal is not None else None,
    "color_type": ct,
}))
`;
    const out = execFileSync(PYTHON, ['-c', pyCode, PORTABLE_MAIN], { encoding: 'utf8', timeout: 30_000 });
    const res = JSON.parse(out);
    expect(res.page_count).toBe(2);
    expect(res.text.indexOf('FIRST_PAGE')).toBeGreaterThanOrEqual(0);
    expect(res.text.indexOf('SECOND_PAGE')).toBeGreaterThan(res.text.indexOf('FIRST_PAGE'));
    expect(res.stream_ok).toBe(true);
    expect(res.palette).toEqual([41, 41, 10, 65, 66, 67]);
    expect(res.color_type).toBe(3);
  });

  it('T4-3: alloflow_source.py rejects non-boolean changes_rendered_text and catches outline/incomplete regressions', () => {
    const htmlFile = join(scratch, 'page.html');
    writeFileSync(htmlFile, '<html lang="en"><body><p>Hello</p></body></html>');
    const sha = createHash('sha256').update(readFileSync(htmlFile)).digest('hex');

    const badPlan = join(scratch, 'bad-bool-plan.json');
    writeFileSync(badPlan, JSON.stringify({
      schema_version: '0.1',
      target: { files: [{ path: 'page.html', sha256: sha }] },
      patches: [{
        file: 'page.html',
        find: '<p>Hello</p>',
        replace: '<p>Hi</p>',
        rationale: 'Testing strict boolean enforcement on changes_rendered_text.',
        changes_rendered_text: 'false',
      }],
      review_notes: [],
    }));
    let errBody = null;
    try {
      execFileSync(PYTHON, [SOURCE_ENGINE, 'validate-plan', '--plan', badPlan, '--root', scratch], { encoding: 'utf8' });
    } catch (e) {
      errBody = JSON.parse(e.stdout);
    }
    expect(errBody).not.toBeNull();
    expect(errBody.ok).toBe(false);
    expect(errBody.errors.join('\n')).toContain('changes_rendered_text must be a boolean');

    // Outline & axe.incomplete regression detection in compare
    const beforePath = join(scratch, 'cmp-before.json');
    const afterPath = join(scratch, 'cmp-after.json');
    const makeAudit = ({ imagesWithoutAlt = 0, unlabeledControls = 0, lang = 'en', incomplete = 0 }) => ({
      ok: true,
      audit: {
        axe: { available: true, violations: [], incomplete },
        keyboard: { interactiveElements: 0, reached: 0, unreachable: [], suspectedTrap: false },
        outline: { title: 'T', lang, headings: [], landmarks: [], imagesWithoutAlt, unlabeledControls },
        text: { sha256: 'a'.repeat(64), chars: 5 },
      },
    });
    writeFileSync(beforePath, JSON.stringify(makeAudit({ imagesWithoutAlt: 0, unlabeledControls: 0, lang: 'en', incomplete: 1 })));
    writeFileSync(afterPath, JSON.stringify(makeAudit({ imagesWithoutAlt: 2, unlabeledControls: 1, lang: '', incomplete: 3 })));
    const cmpOut = JSON.parse(execFileSync(PYTHON, [SOURCE_ENGINE, 'compare', '--before', beforePath, '--after', afterPath], { encoding: 'utf8' }));
    expect(cmpOut.verdict).toBe('regressed');
    const joined = cmpOut.problems.join('\n');
    expect(joined).toContain('axe incomplete/needs-review items increased (1->3)');
    expect(joined).toContain('visible images without alt increased (0->2)');
    expect(joined).toContain('unlabeled form controls increased (0->1)');
    expect(joined).toContain("document lang 'en' was removed");
  });

  it('T4-4: audit_page.cjs handles <summary> focus stops and ARIA roving-tabindex tablists without false trap/unreachable', () => {
    const htmlPath = join(scratch, 'roving.html');
    const outPath = join(scratch, 'roving-audit.json');
    writeFileSync(htmlPath, `<!DOCTYPE html>
<html lang="en"><head><title>Roving Test</title></head><body>
  <main>
    <h1>Demo</h1>
    <button type="button">Before</button>
    <details><summary>Toggle details</summary><p>Hidden details</p></details>
    <div role="tablist" aria-label="Tabs">
      <button role="tab" tabindex="0" aria-selected="true">Tab 1</button>
      <button role="tab" tabindex="-1" aria-selected="false">Tab 2</button>
      <button role="tab" tabindex="-1" aria-selected="false">Tab 3</button>
    </div>
    <button type="button">After</button>
  </main>
</body></html>`);
    const report = JSON.parse(execFileSync('node', [SOURCE_AUDITOR, '--html', htmlPath, '--out', outPath, '--root', scratch], { encoding: 'utf8', timeout: 120_000 }));
    expect(report.ok).toBe(true);
    expect(report.audit.keyboard.unreachable).toEqual([]);
    expect(report.audit.keyboard.suspectedTrap).toBe(false);
  }, 120_000);

  it('T4-5: local MCP narration downmixes stereo clips, optimizes all-cached runs, and EPUB validation probes Java asynchronously', async () => {
    const narrationMod = require(resolve(ROOT, 'desktop/mcp/remediation_narration.cjs'));
    const narrationSrc = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_narration.cjs'), 'utf8');
    const epubValMod = require(resolve(ROOT, 'desktop/mcp/remediation_epub_validation.cjs'));
    const epubValSrc = readFileSync(resolve(ROOT, 'desktop/mcp/remediation_epub_validation.cjs'), 'utf8');

    // Stereo downmix check via mocked Web Audio / AudioHelpers
    const origOffline = globalThis.OfflineAudioContext;
    const origWin = globalThis.window;
    let capturedPcm = null;
    try {
      globalThis.OfflineAudioContext = class {
        async decodeAudioData() {
          return {
            numberOfChannels: 2,
            length: 2,
            getChannelData: (c) => (c === 0 ? new Float32Array([0.5, -0.5]) : new Float32Array([0.5, 0.5])),
          };
        }
      };
      globalThis.window = {
        AlloModules: {
          AudioHelpers: {
            pcmToWav: (bytes) => {
              capturedPcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
              return new Uint8Array([82, 73, 70, 70]);
            },
          },
        },
      };
      const outB64 = await narrationMod.normalizeClip(Buffer.from('dummy').toString('base64'));
      expect(outB64).toBe(Buffer.from('RIFF').toString('base64'));
      expect(Array.from(capturedPcm)).toEqual([16384, 0]);
    } finally {
      globalThis.OfflineAudioContext = origOffline;
      globalThis.window = origWin;
    }

    expect(narrationSrc).toContain('const needsSynthesis=plan.segments.some(');
    expect(narrationSrc).toContain('if(!needsSynthesis) return route.abort();');
    expect(typeof epubValMod.javaRuntimeAsync).toBe('function');
    expect(epubValSrc).toContain('const r=await runtimeAsync({signal});');
  });
});
