// Scanned-OCR content-fidelity fixes (Phase 2, 2026-07-03). A scanned PDF remediated to accessible
// HTML shipped four content defects; these deterministic fixes address them:
//   P2-a — folio-line strip + cross-page hyphen rejoin on the OCR ground text (extractedText).
//   P2-b — strip markdown ATX headings from restored fragments (raw OCR injected as textContent).
//   P2-c — anchor a restored sentence whose FOLLOWING neighbor is a heading BEFORE that heading (end
//          of the prior section) instead of after it, so a dropped section body lands under its own
//          heading rather than after the next section.
//   P2-d — make the integrity metric placement-aware: exclude the un-anchored "Preserved source
//          content" sink from coverage, and warn when restore passages exist (present != in-place).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
let clean, stripMd;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  clean = window.AlloModules.createDocPipeline.cleanScannedOcrText;
  stripMd = window.AlloModules.createDocPipeline.stripRestoreMarkdown;
  expect(typeof clean).toBe('function');
  expect(typeof stripMd).toBe('function');
});

describe('P2-a: cleanScannedOcrText (folio strip + hyphen rejoin) — LIVE', () => {
  it('rejoins a word hyphenated across a line break', () => {
    expect(clean('family history of learning, developmen-\ntal, or psychiatric'))
      .toBe('family history of learning, developmental, or psychiatric');
  });
  it('drops a standalone folio line', () => {
    expect(clean('end of this page.\n91\nStart of the next page')).toBe('end of this page.\nStart of the next page');
  });
  it('removes a folio interposed between the two halves of a page-split word (the reevalu- case)', () => {
    expect(clean('is reevalu-\n92\nated in fact')).toBe('is reevaluated in fact');
  });
  it('NEVER strips a number that sits inline with other words (safe)', () => {
    expect(clean('he scored 42 points on the test')).toBe('he scored 42 points on the test');
    expect(clean('page 90 of the manual')).toBe('page 90 of the manual');
  });
  it('leaves clean prose unchanged', () => {
    const s = 'A normal paragraph with no folios and no hyphenation at all.';
    expect(clean(s)).toBe(s);
  });
  it('null/non-string -> empty string (fail-soft)', () => {
    expect(clean(null)).toBe('');
    expect(clean(undefined)).toBe('');
  });
});

describe('P2-b: stripRestoreMarkdown — LIVE', () => {
  it('strips a trailing ATX heading marker ("## 9.")', () => {
    expect(stripMd('habits Sleep and eating ## 9.')).toBe('habits Sleep and eating 9.');
  });
  it('strips a leading ATX heading marker', () => {
    expect(stripMd('## 9. Summary of Prior Evaluations')).toBe('9. Summary of Prior Evaluations');
  });
  it('does NOT touch legit content with # not used as a heading marker', () => {
    expect(stripMd('The C# language and A+ grade')).toBe('The C# language and A+ grade');
  });
  it('leaves ordinary prose unchanged', () => {
    expect(stripMd('An ordinary restored sentence.')).toBe('An ordinary restored sentence.');
  });
});

describe('P2-c: restored-sentence insert direction — source-pins + mirror', () => {
  it('pickBest tracks whether the winning anchor was the FOLLOWING source sentence', () => {
    expect(pipe).toContain('const _followingAnchor = (sentIdx + 1 < sourceSentences.length)');
    expect(pipe).toMatch(/anchorIsFollowing:\s*\(bestAnchor != null && bestAnchor === _followingAnchor\)/);
  });
  it('inserts BEFORE the heading when anchor was following AND the block is a heading', () => {
    expect(pipe).toMatch(/const _anchorIsHeading = \/\^H\[1-6\]\$\/\.test/);
    expect(pipe).toMatch(/if \(matched\.anchorIsFollowing && _anchorIsHeading\) \{\s*\n\s*bestBlock\.el\.parentNode\.insertBefore\(newP, bestBlock\.el\);/);
    expect(pipe).toContain('bestBlock.el.parentNode.insertBefore(newP, bestBlock.el.nextSibling);');
  });
  it('mirror: a body whose following neighbor is the next heading lands under its own heading', () => {
    const doc = new DOMParser().parseFromString(
      '<main><h3 id="s8">8. Medical History</h3><h3 id="s9">9. Summary of Prior Evaluations</h3>' +
      '<p>Summarize key points.</p></main>', 'text/html');
    const h9 = doc.getElementById('s9');
    const anchorIsFollowing = true;
    const anchorIsHeading = /^H[1-6]$/.test(h9.tagName.toUpperCase());
    const newP = doc.createElement('p');
    newP.setAttribute('data-source-restored', 'true');
    newP.textContent = 'Current health status; history of seizure; sleep and eating habits.';
    if (anchorIsFollowing && anchorIsHeading) h9.parentNode.insertBefore(newP, h9);
    else h9.parentNode.insertBefore(newP, h9.nextSibling);
    const h8 = doc.getElementById('s8');
    expect(h8.nextElementSibling).toBe(newP);   // under section 8
    expect(newP.nextElementSibling).toBe(h9);   // before section 9 (not after it)
  });
  it('mirror: a NON-heading anchor keeps the original after-the-block placement (no regression)', () => {
    const doc = new DOMParser().parseFromString('<main><p id="a">Anchor paragraph.</p><p id="b">Next.</p></main>', 'text/html');
    const a = doc.getElementById('a');
    const anchorIsHeading = /^H[1-6]$/.test(a.tagName.toUpperCase()); // false — it is a <p>
    const newP = doc.createElement('p');
    newP.textContent = 'restored';
    if (true && anchorIsHeading) a.parentNode.insertBefore(newP, a);
    else a.parentNode.insertBefore(newP, a.nextSibling);
    expect(a.nextElementSibling).toBe(newP); // inserted AFTER, unchanged behavior
  });
});

describe('P2-d: integrity placement-awareness — source-pins', () => {
  it('excludes the un-anchored "Preserved source content" sink from the coverage numerator', () => {
    expect(pipe).toMatch(/_stripRecoveryAppendix = \(h\) =>[\s\S]*?data-content-recovery[\s\S]*?data-source-preserved-block/);
  });
  it('warns explicitly when restore passages exist (present != correctly placed)', () => {
    expect(pipe).toMatch(/const _restoredN = \(accessibleHtml\.match\(\/data-source-restored/);
    expect(pipe).toContain('could not be confidently placed in');
    expect(pipe).toContain('the reading order may be wrong');
    expect(pipe).toContain("integrityWarning = integrityWarning ? (integrityWarning + ' ' + _placeWarn) : _placeWarn;");
  });
});
