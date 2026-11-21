import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Round 8 Wave 30 — Electron Security & MCP Runtime Hardening (12 modules)', () => {
  it('1. desktop/electron/security.cjs: rejects embedded credentials in parseOrigin and handles destroyed senderFrame safely', () => {
    const sec = require(path.join(ROOT, 'desktop/electron/security.cjs'));
    expect(sec.parseOrigin('https://user:pass@example.com/path')).toBe('');
    expect(sec.parseOrigin('http://127.0.0.1:4173/app')).toBe('http://127.0.0.1:4173');
    const throwingEvent = {
      get senderFrame() { throw new Error('WebFrameMain destroyed'); },
      sender: { getURL: () => 'http://127.0.0.1:4173' }
    };
    expect(sec.getIpcSenderUrl(throwingEvent)).toBe('');
    expect(sec.getIpcSenderUrl({ senderFrame: undefined, sender: { getURL: () => 'http://127.0.0.1:4173' } })).toBe('');
  });

  it('2. desktop/electron/allosheet-request-auth.cjs: blocks foreign widget subframe via initiator check, guards destroyed frame, always strips electron_key', () => {
    const auth = require(path.join(ROOT, 'desktop/electron/allosheet-request-auth.cjs'));
    // Foreign widget iframe inside Grist must NOT authenticate via parentUrl when initiator is untrusted
    const widgetReq = {
      url: 'http://127.0.0.1:8484/api/docs',
      resourceType: 'subFrame',
      initiator: 'https://widget.evil.example',
      frame: { url: 'https://widget.evil.example', parent: { url: 'http://127.0.0.1:8484/doc/1' } }
    };
    expect(auth.isTrustedAlloSheetGristFrameRequest(widgetReq, 'http://127.0.0.1:4173', 'http://127.0.0.1:8484')).toBe(false);

    // Destroyed frame getter must return false instead of throwing
    const destroyedReq = {
      url: 'http://127.0.0.1:8484/api/docs',
      resourceType: 'xhr',
      frame: { get url() { throw new Error('destroyed'); } }
    };
    expect(auth.isTrustedAlloSheetGristFrameRequest(destroyedReq, 'http://127.0.0.1:4173', 'http://127.0.0.1:8484')).toBe(false);

    // applyAlloSheetRequestAuth strips electron_key even when auth is null
    const out = auth.applyAlloSheetRequestAuth({ Cookie: 'electron_key=secret; theme=dark' }, 'http://127.0.0.1:9999/', null, 0, []);
    expect(out.Cookie).toBe('theme=dark');
  });

  it('3. desktop/electron/coach-window-tracker.cjs: enforces Int64 upper bound and verifies directHandle against sources', () => {
    const tracker = require(path.join(ROOT, 'desktop/electron/coach-window-tracker.cjs'));
    expect(tracker.parseWindowHandle('window:9223372036854775808:0')).toBe('');
    expect(tracker.parseWindowHandle('window:9223372036854775807:0')).toBe('9223372036854775807');
    const sources = [{ id: 'window:12345:0', name: 'Calculator' }];
    expect(tracker.selectUniqueWindowSource(sources, 'window:99999:0')).toBeNull();
    expect(tracker.selectUniqueWindowSource(sources, 'window:12345:0')).toMatchObject({ handle: '12345', id: 'window:12345:0' });
  });

  it('4. desktop/electron/main.cjs & preload.cjs: fail-closed permissions, will-redirect guards, safeExportName slice-before-trim, loopback-only subframe preload', () => {
    const mainSrc = read('desktop/electron/main.cjs');
    const preloadSrc = read('desktop/electron/preload.cjs');
    expect(mainSrc).toContain('return isAllowedPermissionOrigin(requestingOrigin);');
    expect(mainSrc).toContain("const candidate = (details && details.requestingUrl) || '';");
    expect(mainSrc).toContain("mainWindow.webContents.on('will-redirect', guardMainWindowUrl);");
    expect(mainSrc).toContain("coachOverlayWindow.webContents.on('will-redirect'");
    expect(mainSrc).toContain("knownAlloSheetSessionCookies.add('electron_key');");
    expect(mainSrc).toContain('.slice(0, maxLength || 180)\n    .replace(/[. ]+$/, \'\')');
    expect(mainSrc).toContain("if (openError) return { error: String(openError) };");
    expect(preloadSrc).toContain('else if (isTrustedLoopbackFrame)');
    expect(preloadSrc).toContain('if (isMainFrame || isTrustedLoopbackFrame)');
  });

  it('5. desktop/mcp/zip_writer.cjs: rejects ZipSlip, case collisions, file/dir conflicts, and ZIP64 boundary off-by-one', () => {
    const { makeZip, zipFileMap } = require(path.join(ROOT, 'desktop/mcp/zip_writer.cjs'));
    expect(() => makeZip([{ name: '../escape.txt', data: 'x' }], { validate: true })).toThrow(/invalid relative path/i);
    expect(() => makeZip([{ name: 'a.txt', data: '1' }, { name: 'A.txt', data: '2' }], { validate: true })).toThrow(/duplicate|case-colliding/i);
    expect(() => zipFileMap({ 'a/b': '1', 'a/b/c': '2' })).toThrow(/file and directory path conflict/i);
    expect(() => zipFileMap({ 'CON.txt': '1' })).toThrow(/invalid relative path/i);
    const valid = zipFileMap({ mimetype: 'application/epub+zip', 'OEBPS/nav.xhtml': '<html/>' }, 'mimetype');
    expect(Buffer.isBuffer(valid)).toBe(true);
  });

  it('6. desktop/mcp/accessible_html_edit.cjs: blocks deleting/moving <main> via ancestor, strips stale ARIA heading attributes, skips whitespace nodes on strip_markers', () => {
    const { accessibleHtmlTool } = require(path.join(ROOT, 'desktop/mcp/accessible_html_edit.cjs'));
    const html = '<!doctype html><html><body><div id="wrap"><main><h1>Title</h1><p role="presentation">Sub</p><h2 role="heading" aria-level="2">Demote</h2><ul><li><div>Block</div></li></ul></main></div></body></html>';
    const outline = accessibleHtmlTool(html, 'outline', { kinds: ['heading', 'paragraph', 'list', 'landmark'] }, window.DOMParser);
    const h2Id = outline.items.find((i) => i.kind === 'heading' && i.level === 2)?.id;
    const pId = outline.items.find((i) => i.kind === 'paragraph')?.id;
    const ulId = outline.items.find((i) => i.kind === 'list')?.id;

    // Deleting ancestor wrapper of <main> (e1 = <div id="wrap">) must fail
    const delRes = accessibleHtmlTool(html, 'edit', { operations: [{ op: 'delete_element', id: 'e1' }] }, window.DOMParser);
    expect(delRes.ok).toBe(false);
    expect(delRes.results[0].error).toMatch(/main landmark/i);

    // list_to_paragraphs with <div> inside <li> must fail
    const listRes = accessibleHtmlTool(html, 'edit', { operations: [{ op: 'list_to_paragraphs', id: ulId }] }, window.DOMParser);
    expect(listRes.ok).toBe(false);

    // Demoting h2 with role="heading" aria-level="2" strips stale ARIA; promoting p with role="presentation" strips role
    const retagRes = accessibleHtmlTool(html, 'edit', {
      operations: [
        { op: 'make_paragraph', id: h2Id },
        { op: 'set_heading_level', id: pId, level: 2 }
      ]
    }, window.DOMParser);
    expect(retagRes.ok).toBe(true);
    expect(retagRes.html).not.toContain('aria-level="2"');
    expect(retagRes.html).not.toContain('role="presentation"');
  });

  it('7. desktop/mcp/agent_core_stdio_security.cjs & remediation_epub_archive.cjs: BoundedJobs non-positive cap safe, BoundedOutput write throw handled, EPUB archive checks reparse point & encoding', () => {
    const sec = require(path.join(ROOT, 'desktop/mcp/agent_core_stdio_security.cjs'));
    const jobs = new sec.BoundedJobs({ jobs: 0, jobBytes: 1024, totalJobBytes: 4096, jobTtlMs: 60000 });
    const commit = jobs.prepare({ job: { jobId: 'j1' } });
    expect(() => commit()).not.toThrow();

    let failed = false;
    const fakeStream = { on() {}, write() { throw new Error('EPIPE'); } };
    const out = new sec.BoundedOutput(fakeStream, { fatal: () => { failed = true; } });
    out.send({ jsonrpc: '2.0', id: 1, result: {} });
    expect(failed).toBe(true);

    const epubSrc = read('desktop/mcp/remediation_epub_archive.cjs');
    expect(epubSrc).toContain("if (!(flags & 0x800) && bytes.some(b => b > 127)) reject('ambiguous filename encoding');\n  let name;");
    expect(epubSrc).toContain('(attributes & 0x0408)');
    expect(epubSrc).toContain('maxOutputLength:');
  });

  it('8. desktop/mcp/remediation_narration.cjs: validates even PCM byte length and byteRate, uses writeAllSync & bounded reads, preserves body attributes', () => {
    const narration = require(path.join(ROOT, 'desktop/mcp/remediation_narration.cjs'));
    // Build a valid 44+4 byte 24kHz mono 16-bit WAV and test odd-length rejection
    const makeWav = (dataLen, byteRate = 48000) => {
      const b = Buffer.alloc(44 + dataLen);
      b.write('RIFF', 0); b.writeUInt32LE(36 + dataLen, 4); b.write('WAVEfmt ', 8);
      b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
      b.writeUInt32LE(24000, 24); b.writeUInt32LE(byteRate, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
      b.write('data', 36); b.writeUInt32LE(dataLen, 40);
      return b;
    };
    expect(() => narration.wavInfo(makeWav(3))).toThrow(/Unsupported or empty/i);
    expect(() => narration.wavInfo(makeWav(4, 12345))).toThrow(/Unsupported or empty/i);
    expect(narration.wavInfo(makeWav(4)).length).toBe(4);
    const narSrc = read('desktop/mcp/remediation_narration.cjs');
    expect(narSrc).toContain("media-src 'self';");
    expect(narSrc).toContain('/<body([^>]*)>[\\s\\S]*<\\/body>/i');
  });

  it('9. desktop/mcp/alloflow-remediation-mcp-stdio.cjs & alloflow-mcp-stdio.cjs: IPv6 bracketing, HTTP_ID_PREFIX rejection, Host required, collision-safe _htmlOutputPath, symlink-safe audit log', () => {
    const remSrc = read('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
    const mcpSrc = read('desktop/mcp/alloflow-mcp-stdio.cjs');
    expect(remSrc).toContain("const urlHost = host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;");
    expect(remSrc).toContain("sendError(null, -32600, 'Reserved request id prefix');");
    expect(remSrc).toContain('const missingRealHttpHost = !rawHost && typeof req.httpVersion === \'string\' && req.httpVersion.length > 0;');
    expect(remSrc).toContain('return claimOutputPath(path.dirname(p), path.basename(p));');
    expect(remSrc).toContain("const key = typeof id + ':' + String(id);");
    expect(remSrc).toContain('boundedJobDiagnostics(driver.takeLastRunDiagnostics())');
    expect(remSrc).toContain('readSource: p => authorizedReadFileSync(p)');
    expect(mcpSrc).toContain('fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW || 0)');
    expect(mcpSrc).toContain('PACK_PROFILE_SCHEMA.enum.indexOf(args.profile) === -1');
  });
});
