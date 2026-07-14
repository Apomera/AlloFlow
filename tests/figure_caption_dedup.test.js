// Figure caption de-duplication (audit 2026-06-16). The pipeline emits the image description into
// BOTH <img alt> and <figcaption>, so a screen reader announces it twice. The figcaption text is now
// wrapped in <span aria-hidden="true"> — it stays visible for sighted users but is removed from the
// accessibility tree (the alt still carries it for AT, satisfying WCAG 1.1.1 / the PDF/UA figure walk).
// Also pins the transform-prompt h1 anchoring (the single <h1> must BE the document title, not a div).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('figure captions do not double-announce the alt text', () => {
  it('the main image-render figcaption wraps the duplicated description in aria-hidden', () => {
    // Harness repair (2026-07-09): a later XSS hardening escapes ${desc} inline — the aria-hidden
    // wrap (the thing under test) is unchanged.
    expect(src).toContain('<figcaption style="font-size:0.9em;color:#475569;font-style:italic;margin-top:0.5em"><span aria-hidden="true">${desc.replace(');
    // the educational "Purpose:" line is NOT aria-hidden — it adds info beyond the alt
    expect(src).toMatch(/aria-hidden="true">\$\{desc\.replace\([\s\S]{0,120}?<\/span>\$\{purpose \?/);
  });

  it('the slide/media figcaption (_figFor) wraps the duplicated alt in aria-hidden', () => {
    expect(src).toContain("'<figcaption><span aria-hidden=\"true\">' + _escTxt(im.alt) + '</span></figcaption>'");
  });

  it('the raw (un-hidden) duplicate figcaption forms are gone', () => {
    expect(src).not.toContain("<figcaption style=\"font-size:0.9em;color:#475569;font-style:italic;margin-top:0.5em\">${desc}");
    expect(src).not.toContain("'<figcaption>' + _escTxt(im.alt) + '</figcaption>'");
  });

  it('keeps the alt itself (de-dup must not regress 1.1.1 / the figure leaf walk)', () => {
    expect(src).toContain('<img src="${srcToken}" alt="${desc.replace(/"/g, \'&quot;\')}"');
  });
});

describe('transform prompt anchors the single <h1> to the document title', () => {
  // Harness repair (2026-07-09): the prompts were rewritten (block-JSON transform + the
  // hints system) — repointed at the LIVE h1-anchoring mechanisms.
  it('the first fragment carries the title; later fragments must not repeat it', () => {
    expect(src).toContain("(i === 0 ? 'Include the document title as a \"banner\" or \"h1\" block. ' : 'Do NOT repeat the document title. Continue with h2/h3. ')");
  });

  it('markdown heading markers convert to real headings with exactly one <h1>', () => {
    expect(src).toContain('MARKDOWN HEADINGS detected (#, ##, ###) — convert every one to the matching real heading element (<h1>/<h2>/<h3>...) preserving the hierarchy, with exactly one <h1>; never leave literal # characters in the output');
  });
});
