// Two "newly introduced by remediation" issues from a maintainer Canvas test (2026-06-23):
//  1. the deterministic contrast fixer darkened `.sr-only:focus { background:#2563eb; color:white }` → a gray
//     against the (wrong) body background, dropping the focused skip link to 1.48:1. The _hasLocalBg guard now
//     leaves a color alone when its OWN rule/inline-style declares a background.
//  2. remediation emitting "• item<br>• item" inside a <td> instead of a semantic <ul><li> (WCAG 1.3.1) —
//     listifyTableCellBullets converts those cells, self-gated so it can only ever help.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── extract fixContrastViolations (self-contained factory closure) ──
const _cs = dp.indexOf('const fixContrastViolations = (htmlContent) => {');
const _ce = dp.indexOf('\n  };', _cs) + 4;
const fixContrastViolations = new Function(dp.slice(_cs, _ce) + '\nreturn fixContrastViolations;')();

// ── extract listifyTableCellBullets with its deps (guard + restyle span) ──
const span = dp.slice(dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {'), dp.indexOf('\n// Convert an INTERACTIVE image-placeholder'));
const listifyTableCellBullets = new Function(span + '\nreturn listifyTableCellBullets;')();

describe('skip-link contrast: a color inside a rule with its OWN background is not darkened against the body bg', () => {
  const doc = '<html><head><style>body{background:#ffffff}\n.sr-only:focus{position:static;background:#2563eb;color:white;padding:0.5rem 1rem}</style></head><body><a class="sr-only" href="#main">Skip to main content</a><main id="main">x</main></body></html>';
  it('keeps .sr-only:focus { color: white } (the focus bg is blue, not the body white)', () => {
    const out = fixContrastViolations(doc).html;
    expect(out).toMatch(/\.sr-only:focus\{[^}]*color:\s*white/);   // unchanged
    expect(out).not.toMatch(/\.sr-only:focus\{[^}]*color:\s*#737373/);
    expect(out).not.toMatch(/\.sr-only:focus\{[^}]*color:\s*#[0-9a-f]{6}/i); // not darkened to any hex gray
  });
  it('STILL fixes a genuinely-failing color with no local background (no regression)', () => {
    const bad = '<html><head><style>body{background:#ffffff}</style></head><body><p style="color:#bbbbbb">faint gray on white</p></body></html>';
    const r = fixContrastViolations(bad);
    expect(r.fixCount).toBeGreaterThan(0);            // #bbbbbb on white fails 4.5:1 → darkened
    expect(r.html).not.toMatch(/color:#bbbbbb/);
  });
});

describe('contrast fixer leaves <script> content alone (does not darken JS-built element colors)', () => {
  // The "Apply Crop" / Cancel regression (maintainer Canvas test, 2026-06-24): a document's embedded
  // <script> set a button's colors via element.style.cssText='...background:#2563eb;color:white...'. The
  // contrast fixer matched color:white inside the JS STRING, couldn't see the sibling background (it's not
  // an HTML style="" attr nor a CSS {} rule), and darkened white → #737373 ≈ 1.2:1 gray-on-blue. The fixer
  // now stashes <script> blocks before its passes and restores them verbatim.
  it('does NOT darken color:white inside a <script> cssText string (the #737373-on-blue regression)', () => {
    const doc = '<html><head><style>body{background:#ffffff}</style></head><body>'
      + '<script>var applyBtn = document.createElement("button"); applyBtn.textContent = " Apply Crop ";'
      + ' applyBtn.style.cssText = "padding:8px 20px;background:#2563eb;color:white;border:none";</script>'
      + '</body></html>';
    const out = fixContrastViolations(doc).html;
    expect(out).not.toMatch(/#737373/);                  // not darkened to the fixer's gray anywhere
    // the button's cssText is byte-identical — BOTH background:#2563eb AND color:white survive
    // (note: the fixer still injects its <head> safety-net CSS, which legitimately has hex colors —
    //  so we assert on the SCRIPT's exact text, not "no hex anywhere in the document")
    expect(out).toMatch(/cssText = "padding:8px 20px;background:#2563eb;color:white;border:none"/);
  });
  it('fixes a real failing color OUTSIDE the script while leaving the script intact (no over-reach)', () => {
    const doc = '<html><head><style>body{background:#ffffff}</style></head><body>'
      + '<p style="color:white">invisible white text on white</p>'
      + '<script>el.style.cssText="color:white";</script>'
      + '</body></html>';
    const r = fixContrastViolations(doc);
    expect(r.fixCount).toBeGreaterThan(0);               // the <p> white-on-white IS still fixed
    expect(r.html).toMatch(/<p style="color:#[0-9a-f]{6}/i); // ...the paragraph got darkened
    expect(r.html).toMatch(/cssText="color:white"/);     // ...but the script string is byte-identical
  });
  it('restores multiple scripts verbatim (placeholder indexing is correct) + leaves no placeholder', () => {
    const doc = '<body><script>a.style.cssText="color:white"</script>'
      + '<p style="color:#cccccc">gray</p>'
      + '<script>b.style.cssText="color:#ffffff"</script></body>';
    const out = fixContrastViolations(doc).html;
    expect(out).toMatch(/a\.style\.cssText="color:white"/);   // script 0 intact
    expect(out).toMatch(/b\.style\.cssText="color:#ffffff"/); // script 1 intact (no #hex darkening)
    expect(out).not.toMatch(/alloflow:script-stash/);         // no placeholder left behind
  });
});

describe('listifyTableCellBullets: bullet-glyph cells → semantic <ul><li> (WCAG 1.3.1)', () => {
  const has = (s) => new DOMParser().parseFromString(s, 'text/html');
  it('converts a <td> of "• a<br>• b<br>• c" into a <ul> with 3 <li>', () => {
    const out = listifyTableCellBullets('<body><table><tr><td>• Does this apply?<br>• What are the consequences?<br>• Has it been tried?</td></tr></table></body>');
    const td = has(out).querySelector('td');
    expect(td.querySelectorAll('ul > li').length).toBe(3);
    expect(td.textContent).not.toContain('•');
    expect(td.textContent).toMatch(/Does this apply\?/);
    expect(td.textContent).toMatch(/Has it been tried\?/);
  });
  it('keeps non-bullet lead text above the list', () => {
    const out = listifyTableCellBullets('<body><table><tr><td>Questions:<br>• one<br>• two</td></tr></table></body>');
    const td = has(out).querySelector('td');
    expect(td.textContent).toMatch(/^Questions:/);
    expect(td.querySelectorAll('li').length).toBe(2);
  });
  it('leaves a cell that already has a <ul> unchanged', () => {
    const src = '<body><table><tr><td><ul><li>a</li><li>b</li></ul></td></tr></table></body>';
    expect(listifyTableCellBullets(src)).toBe(src);
  });
  it('does not fire on a single stray bullet (needs a real list)', () => {
    const src = '<body><table><tr><td>see • note below</td></tr></table></body>';
    expect(listifyTableCellBullets(src)).toBe(src);
  });
  it('is a byte-for-byte no-op when there are no bullet glyphs at all', () => {
    const src = '<body><table><tr><td>plain cell</td><td>another</td></tr></table></body>';
    expect(listifyTableCellBullets(src)).toBe(src);
  });
  it('preserves all item text (reading-order gate) — nothing dropped', () => {
    const out = listifyTableCellBullets('<body><table><tr><td>• alpha beta<br>• gamma delta<br>• epsilon zeta</td></tr></table></body>');
    const txt = has(out).querySelector('td').textContent.toLowerCase();
    for (const w of ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']) expect(txt).toContain(w);
  });
});

describe('anti-drift: listify is exported + wired into the cleanup', () => {
  it('listifyTableCellBullets is on the factory API + runs in Step 4b', () => {
    expect(dp).toMatch(/listifyTableCellBullets: listifyTableCellBullets,/);
    expect(dp).toMatch(/const _listified = listifyTableCellBullets\(accessibleHtml\)/);
  });
  it('the contrast fixer guards passes 1–3 with _hasLocalBg', () => {
    // 3 call sites (hex / rgb / named-color passes); the 4th occurrence is the helper definition signature
    expect((dp.match(/if \(_hasLocalBg\(fullStr, offset\)\) return match/g) || []).length).toBeGreaterThanOrEqual(3);
  });
  it('the contrast fixer stashes <script> blocks so it never rewrites JS color literals', () => {
    expect(dp).toMatch(/_scriptStash\.push\(m\)/);
    expect(dp).toMatch(/<!--alloflow:script-stash:/);
    expect(dp).toMatch(/Restore the stashed <script> blocks verbatim/);
    // the sibling AAA pass in sanitizeStyleForWCAG carries the same guard
    expect(dp).toMatch(/Same JS-safety as fixContrastViolations: never darken a color:#hex inside <script> source/);
  });
});
