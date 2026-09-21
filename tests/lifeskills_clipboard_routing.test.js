import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

function bodyOf(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

/** The execCommand fallback, run against a jsdom document. */
function loadExecFallback(file, win) {
  const body = bodyOf(read(file), 'lifeSkillsCopyViaExecCommand');
  if (!body) throw new Error('lifeSkillsCopyViaExecCommand not found in ' + file);
  // eslint-disable-next-line no-new-func
  return new Function('window', 'document', body + '; return lifeSkillsCopyViaExecCommand;')(
    win, win.document);
}

describe('Life Skills Lab — copying the interview packet', () => {
  it('does not give up when the Clipboard API is simply absent', () => {
    // THE BUG. The guard was `if (navigator.clipboard && navigator.clipboard.writeText)`,
    // which tests the WRONG thing. On an http: origin, an older browser or some
    // webviews the API does not exist at all, and the tool reported "Clipboard
    // unavailable" without ever trying execCommand — losing a student's whole
    // written interview packet. Presence also proves nothing the other way:
    // Gemini Canvas exposes the API and then refuses it by permissions policy.
    const src = read(SOURCE);
    // The house helper must be reached without first asking about navigator.clipboard.
    // Compare the CODE, not the comments, which mention the API by name.
    const fn = bodyOf(src, 'copyInterviewPrepPacket')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    const helperAt = fn.indexOf('window.StemLab.writeClipboard');
    const apiAt = fn.indexOf('navigator.clipboard');
    expect(helperAt, 'writeClipboard not used').toBeGreaterThan(-1);
    expect(apiAt, 'no Clipboard API path at all').toBeGreaterThan(-1);
    expect(helperAt, 'the Clipboard API is still consulted first').toBeLessThan(apiAt);
    // And the helper call must not be nested inside a navigator.clipboard test.
    expect(fn).not.toMatch(/if \(window\.navigator && window\.navigator\.clipboard[^)]*\)\s*\{\s*\(window\.StemLab/);
  });

  it('keeps an execCommand fallback for a host with no StemLab helper', () => {
    const fn = bodyOf(read(SOURCE), 'copyInterviewPrepPacket');
    expect(fn).toContain('lifeSkillsCopyViaExecCommand');
  });

  it('actually copies through execCommand when it is the only route', () => {
    // Run the fallback for real rather than pinning its spelling.
    const dom = new JSDOM('<!doctype html><html><body><button id="b">x</button></body></html>');
    let called = 0, selected = '';
    dom.window.document.execCommand = () => {
      called += 1;
      selected = dom.window.document.activeElement && dom.window.document.activeElement.value;
      return true;
    };
    const copy = loadExecFallback(SOURCE, dom.window);
    expect(copy('PACKET TEXT')).toBe(true);
    expect(called).toBe(1);
    expect(selected, 'the textarea did not carry the packet').toBe('PACKET TEXT');
  });

  it('cleans up the scratch textarea and restores focus', () => {
    // A leaked off-screen textarea is a focus trap for keyboard and screen-reader
    // users, and stealing focus without giving it back loses the user's place.
    const dom = new JSDOM('<!doctype html><html><body><button id="b">x</button></body></html>');
    dom.window.document.execCommand = () => true;
    const btn = dom.window.document.getElementById('b');
    btn.focus();
    const copy = loadExecFallback(SOURCE, dom.window);
    copy('X');
    expect(dom.window.document.querySelectorAll('textarea').length).toBe(0);
    expect(dom.window.document.activeElement).toBe(btn);
  });

  it('reports failure rather than throwing when every route fails', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    dom.window.document.execCommand = () => { throw new Error('nope'); };
    const copy = loadExecFallback(SOURCE, dom.window);
    expect(copy('X')).toBe(false);
    expect(dom.window.document.querySelectorAll('textarea').length).toBe(0);
  });

  it('escapes the packet before writing it into the print window', () => {
    // openInterviewPacketPrintView builds HTML with document.write, and the packet
    // contains text the student typed.
    const src = read(SOURCE);
    const esc = bodyOf(src, 'escapeInterviewPacketHtml');
    expect(esc).toBeTruthy();
    for (const ch of ['&', '<', '>', '"', "'"]) expect(esc).toContain(ch);
    expect(src).toContain('escapeInterviewPacketHtml(packet)');
    // eslint-disable-next-line no-new-func
    const fn = new Function(esc + '; return escapeInterviewPacketHtml;')();
    const dom = new JSDOM('<!doctype html><html><body><pre>'
      + fn('</pre><script>alert(1)</script><img src=x onerror=alert(1)>')
      + '</pre></body></html>');
    expect(dom.window.document.querySelectorAll('script,img').length).toBe(0);
  });

  it('ships the same clipboard routing in the desktop mirror', () => {
    for (const n of ['copyInterviewPrepPacket', 'lifeSkillsCopyViaExecCommand', 'escapeInterviewPacketHtml']) {
      expect(bodyOf(read(MIRROR), n), n + ' missing from mirror').toBe(bodyOf(read(SOURCE), n));
    }
  });
});
