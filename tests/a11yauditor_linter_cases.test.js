// Digital Accessibility Lab: the measured (code-only) checker against cases a student will actually paste.
// Each case was wrong before 2026-11: correct pages flagged as failures, real failures missed, and an empty
// findings list shown as "No problems". A11Y_LAB_FILE points the suite at another copy for mutation checks.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.A11Y_LAB_FILE || 'stem_lab/stem_tool_a11yauditor.js';
beforeEach(() => { resetStemLab(); loadTool(FILE, 'a11yAuditor'); });
const audit = (html) => window.__alloA11yPure.deterministicAudit(html);
const fails = (html) => audit(html).findings.map((f) => f.wcag);
const warns = (html) => audit(html).warnings.map((f) => f.wcag);

describe('correct markup is not reported as a WCAG failure', () => {
  it('a button whose only content is an image with alt text has a name', () => {
    expect(fails('<h1>T</h1><button><img src="s.png" alt="Search"></button>')).toEqual([]);
  });
  it('an image named with aria-label passes 1.1.1', () => {
    expect(fails('<h1>T</h1><img src="c.png" aria-label="A cat">')).not.toContain('1.1.1');
  });
  it('decorative images (alt="" or role="presentation") pass 1.1.1', () => {
    expect(fails('<h1>T</h1><img src="a.png" alt=""><img src="b.png" role="presentation">')).not.toContain('1.1.1');
  });
  it('large text (32px) only needs 3:1, so 3.03:1 passes', () => {
    expect(fails('<h1 style="font-size:32px;color:#949494;background:#ffffff">Big</h1>')).not.toContain('1.4.3');
  });
  it('the same 3.03:1 at normal size still fails, and 18.66px bold counts as large', () => {
    expect(fails('<p style="color:#949494;background:#ffffff">small</p>')).toContain('1.4.3');
    expect(fails('<p style="font-size:19px;font-weight:700;color:#949494;background:#ffffff">bold</p>')).not.toContain('1.4.3');
  });
  it('no h1 and several h1s are best-practice notes, not 1.3.1 failures', () => {
    const none = audit('<h2>Section</h2><p>x</p>'), many = audit('<h1>A</h1><h1>B</h1>');
    expect(none.findings.map((f) => f.wcag)).not.toContain('1.3.1');
    expect(none.bestPractice.map((f) => f.key)).toContain('lint_bp_no_h1');
    expect(many.findings.map((f) => f.wcag)).not.toContain('1.3.1');
    expect(many.bestPractice.map((f) => f.key)).toContain('lint_bp_multi_h1');
  });
  it('aria-labelledby that resolves, and title, name a button or link', () => {
    expect(fails('<span id="l">Save</span><button aria-labelledby="l"></button>')).toEqual([]);
    expect(fails('<button title="Close"></button><a href="/x" title="Home"></a>')).toEqual([]);
  });
  it('hidden inputs and <a name> anchors are not form fields or links', () => {
    expect(fails('<input type="hidden" name="a"><input hidden><a name="top"></a>')).toEqual([]);
  });
});

describe('real failures that used to pass silently', () => {
  it('two "click here" links are flagged under 2.4.4', () => {
    expect(fails('<h1>T</h1><p><a href="/a">click here</a> <a href="/b">click here</a></p>')).toContain('2.4.4');
  });
  it('nearly transparent text is composited over its background and fails 1.4.3', () => {
    expect(fails('<h1>T</h1><p style="color:rgba(0,0,0,0.15);background:#ffffff">faint</p>')).toContain('1.4.3');
  });
  it('hsl(), 8-digit hex, named colours and !important are read', () => {
    expect(fails('<p style="color:hsl(0,0%,70%)">x</p>')).toContain('1.4.3');
    expect(fails('<p style="color:#00000026">x</p>')).toContain('1.4.3');
    expect(fails('<p style="color:lightblue;background:white">x</p>')).toContain('1.4.3');
    expect(fails('<p style="color:#aaaaaa !important;background:#fff">x</p>')).toContain('1.4.3');
  });
  it('a dark background inherited from a parent is used, with default black text', () => {
    expect(fails('<div style="background:#000"><p>dark</p></div>')).toContain('1.4.3');
  });
  it('blank aria-label and aria-labelledby to a missing id are no name', () => {
    expect(fails('<button aria-label="  "></button>')).toContain('4.1.2');
    const r = audit('<button aria-labelledby="nope"></button>');
    expect(r.findings.map((f) => f.wcag)).toContain('4.1.2');
    expect(r.warnings.map((f) => f.key)).toContain('lint_labelledby_missing');
  });
  it('an empty <label for> does not label its field', () => {
    expect(fails('<label for="e"></label><input id="e">')).toContain('3.3.2');
  });
  it('flags input type=image without alt, untitled iframes, positive tabindex and click-only divs', () => {
    expect(fails('<input type="image" src="go.png">')).toContain('1.1.1');
    expect(fails('<iframe src="x"></iframe>')).toContain('4.1.2');
    expect(fails('<a href="/x" tabindex="5">x</a>')).toContain('2.4.3');
    expect(fails('<div onclick="go()">Go</div>')).toContain('2.1.1');
    expect(fails('<div onclick="go()" role="button" tabindex="0">Go</div>')).not.toContain('2.1.1');
  });
  it('a full document with no <title> fails 2.4.2; a fragment is not judged on it', () => {
    expect(fails('<html lang="en"><head></head><body><p>x</p></body></html>')).toContain('2.4.2');
    expect(fails('<p>fragment</p>')).not.toContain('2.4.2');
  });
  it('a viewport that blocks zoom fails 1.4.4', () => {
    expect(fails('<html lang="en"><head><title>t</title><meta name="viewport" content="width=device-width, user-scalable=no"></head><body></body></html>')).toContain('1.4.4');
    expect(fails('<html lang="en"><head><title>t</title><meta name="viewport" content="width=device-width, maximum-scale=1"></head><body></body></html>')).toContain('1.4.4');
  });
  it('outline:none and unmuted autoplay are warnings to check by hand, not proven failures', () => {
    expect(warns('<a href="/x" style="outline:none">x</a>')).toContain('2.4.7');
    expect(fails('<a href="/x" style="outline:none">x</a>')).not.toContain('2.4.7');
    expect(warns('<video autoplay src="v.mp4"></video>')).toContain('1.4.2');
    expect(warns('<video autoplay muted src="v.mp4"></video>')).not.toContain('1.4.2');
  });
  it('a field named only by aria-label is a 3.3.2 warning (no visible label), not a pass', () => {
    expect(fails('<input aria-label="Name">')).not.toContain('3.3.2');
    expect(warns('<input aria-label="Name">')).toContain('3.3.2');
  });
});

describe('"no findings" is never presented as passing WCAG', () => {
  it('every result lists what code cannot check', () => {
    const r = audit('<main><h1>Title</h1><p>ok</p></main>');
    expect(r.findings).toEqual([]);
    const ids = r.notChecked.map((n) => n.id);
    for (const id of ['keyboard', 'focus', 'alt_quality', 'media', 'css_contrast', 'wcag22']) expect(ids).toContain(id);
  });
  it('colours the checker cannot read are listed as not checked instead of passing', () => {
    const r = audit('<p style="color:var(--brand)">x</p><p style="background:linear-gradient(red,blue)">y</p>');
    expect(r.findings.map((f) => f.wcag)).not.toContain('1.4.3');
    const row = r.notChecked.find((n) => n.id === 'contrast_unreadable');
    expect(row).toBeTruthy();
    expect(row.text).toMatch(/^2 element/);
  });
});
