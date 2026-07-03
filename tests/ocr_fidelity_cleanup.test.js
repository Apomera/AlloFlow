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
  it('drops an ISOLATED folio line (blank-surrounded) but leaves the surrounding prose', () => {
    const r = clean('end of this page.\n\n91\n\nStart of the next page');
    expect(r).not.toContain('91');
    expect(r).toContain('end of this page.');
    expect(r).toContain('Start of the next page');
  });
  it('R4: KEEPS a standalone number between two content lines (protects a WISC/WIAT score column)', () => {
    // A score table OCR'd one value per line must NOT lose its scores to the folio strip.
    const r = clean('Verbal Comprehension\n105\nWorking Memory\n98\nProcessing Speed\n112');
    expect(r).toContain('105');
    expect(r).toContain('98');
    expect(r).toContain('112');
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

describe('P2-d + R1/R2: integrity placement-awareness (present != missing; orphans only) — source-pins + mirrors', () => {
  it('still excludes the un-anchored "Preserved source content" sink from the DISPLAYED coverage numerator', () => {
    expect(pipe).toMatch(/_stripRecoveryAppendix = \(h\) =>[\s\S]*?data-content-recovery[\s\S]*?data-source-preserved-block/);
  });
  it('R1: gates the "missing" ERROR on chars present with the preserved box counted back (not the box-stripped number)', () => {
    expect(pipe).toContain('const _presentHtml = String(accessibleHtml).replace(');
    expect(pipe).toContain('const _presentChars = _srcRaw ? _normIntegrity(htmlToPlainText(_presentHtml)).length : textCharCount(_presentHtml);');
    expect(pipe).toContain('if (_presentChars < groundTruth * 0.97) {');
  });
  it('R1 mirror: sub-97% in-order coverage is NOT "missing" when the box holds the shortfall; genuine loss still is', () => {
    const groundTruth = 1000;
    expect(995 < groundTruth * 0.97).toBe(false); // box counted back → present → not missing (placement, not loss)
    expect(900 < groundTruth * 0.97).toBe(true);  // short even with the box → genuine loss
  });
  it('R2: the placement warning counts ONLY data-source-restored inside the preserved-block sink', () => {
    expect(pipe).toContain('const _sinkMatch = accessibleHtml.match(/<section');
    expect(pipe).toContain('const _orphanN = _sinkMatch ? (_sinkMatch[1].match(/data-source-restored');
    expect(pipe).toContain('could not be placed in');
    expect(pipe).toContain('its reading order needs review');
    expect(pipe).toContain("integrityWarning = integrityWarning ? (integrityWarning + ' ' + _placeWarn) : _placeWarn;");
  });
  it('R2 mirror: a confident inline insert (outside the box) is NOT counted; box orphans ARE', () => {
    const html = '<main><p data-source-restored="true">confident inline</p>'
      + '<section data-source-preserved-block="true"><p data-source-restored="true">orphan one</p><p data-source-restored="true">orphan two</p></section></main>';
    const sinkMatch = html.match(/<section\b[^>]*\bdata-source-preserved-block\s*=\s*["']true["'][^>]*>([\s\S]*?)<\/section>/i);
    const orphanN = sinkMatch ? (sinkMatch[1].match(/data-source-restored\s*=/gi) || []).length : 0;
    expect(orphanN).toBe(2);
  });
});

describe('R3: D-reframe names only engines that ran + honest throttle attribution — source-pins + mirrors', () => {
  it('builds the engine list from availability and the reason from the throttle flag', () => {
    expect(pipe).toContain("const _enginesRan = [axeScoreAvailable ? 'axe-core' : null, eaScoreAvailable ? 'IBM Equal Access' : null].filter(Boolean);");
    expect(pipe).toContain('const _reason = _finalAuditThrottled');
    expect(pipe).toContain('the rest could not be re-checked (the response was empty or malformed)');
    expect(pipe).toContain('let _finalAuditThrottled = false;');
  });
  it('mirror: an axe-only run does NOT claim IBM Equal Access', () => {
    const axeScoreAvailable = true, eaScoreAvailable = false;
    const enginesRan = [axeScoreAvailable ? 'axe-core' : null, eaScoreAvailable ? 'IBM Equal Access' : null].filter(Boolean);
    expect(enginesRan.join(' + ')).toBe('axe-core');
  });
  it('mirror: a non-throttle partial says "could not be re-checked", not "throttled"', () => {
    const _finalAuditThrottled = false;
    const reason = _finalAuditThrottled ? 'the rest were throttled by a temporary Canvas rate-limit' : 'the rest could not be re-checked (the response was empty or malformed)';
    expect(reason).toContain('could not be re-checked');
    expect(reason).not.toContain('throttled');
  });
});
