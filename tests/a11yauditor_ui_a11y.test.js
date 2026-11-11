// Digital Accessibility Lab: the tool's OWN accessibility and its saved-state bugs, on the real component.
// An accessibility lab that a keyboard or screen-reader user cannot operate teaches the opposite of its lesson.
// A11Y_LAB_FILE points the suite at another copy for mutation checks.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.A11Y_LAB_FILE || 'stem_lab/stem_tool_a11yauditor.js';
let root = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'a11yAuditor'); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// Mount with a live store; returns a reader for what the tool saved.
async function mount(saved, overrides) {
  document.body.innerHTML = '<div id="root"></div>';
  const box = { state: { a11yAuditor: Object.assign({}, saved) } };
  function App() {
    const [state, setState] = React.useState(box.state);
    box.state = state;
    const update = (tk, k, v) => setState((p) => Object.assign({}, p, { [tk]: Object.assign({}, p[tk], { [k]: v }) }));
    const updateMulti = (tk, patch) => setState((p) => Object.assign({}, p, { [tk]: Object.assign({}, p[tk], patch) }));
    return window.StemLab._registry.a11yAuditor.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, update, updateMulti }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => box.state.a11yAuditor;
}
const act = (fn) => React.act(async () => { fn(); });
// Accessible-ish name: text that is not aria-hidden, unless aria-label overrides it.
function nameOf(el) {
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}
const buttonNamed = (name) => [...document.querySelectorAll('button')].find((b) => nameOf(b) === name);
function typeInto(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}
const pending = () => vi.fn(() => new Promise(() => {}));

describe('names and keyboard access', () => {
  it('the URL audit button is named "Audit URL" (its accessible name used to be "Try:")', async () => {
    await mount({ auditInputMode: 'url', auditUrl: 'https://example.com' }, { callGemini: pending() });
    const btn = buttonNamed('Audit URL');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBeNull();
  });

  it.each([['pdf', 'Upload PDF'], ['screenshot', 'Upload Screenshot']])('the %s upload is a real, focusable button that opens the file picker', async (mode, label) => {
    await mount({ auditInputMode: mode }, { callGemini: pending(), callGeminiVision: pending() });
    const btn = buttonNamed(label);
    expect(btn).toBeTruthy();
    expect(btn.tabIndex).toBe(0);
    const input = document.querySelector('input[type="file"]');
    expect(input.tabIndex).toBe(-1);
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    await act(() => btn.click());
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('tabs are a real tablist: one tab stop, controls a tabpanel, keep their visible names, and follow the arrow keys', async () => {
    await mount({ tab: 'audit' });
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => nameOf(t))).toEqual(['Audit', 'Learn', 'Knowbility', 'Take Action', 'History', 'Badges']);
    expect(tabs.filter((t) => t.tabIndex === 0)).toHaveLength(1);
    expect(tabs.every((t) => t.getAttribute('aria-controls') === 'a11yaud-panel' && !t.getAttribute('aria-label'))).toBe(true);
    const panel = document.getElementById('a11yaud-panel');
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('a11yaud-tab-audit');
    const key = (k) => act(() => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })));
    tabs[0].focus();
    await key('ArrowRight');
    expect(document.activeElement.id).toBe('a11yaud-tab-learn');
    expect(document.getElementById('a11yaud-tab-learn').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('a11yaud-panel').getAttribute('aria-labelledby')).toBe('a11yaud-tab-learn');
    await key('End');
    expect(document.activeElement.id).toBe('a11yaud-tab-badges');
    await key('Home');
    expect(document.activeElement.id).toBe('a11yaud-tab-audit');
    await key('ArrowLeft');
    expect(document.activeElement.id).toBe('a11yaud-tab-badges');
  });

  it('criterion accordions report aria-expanded and point at the panel they open', async () => {
    await mount({ tab: 'learn' });
    const btn = [...document.querySelectorAll('button[aria-expanded]')].find((b) => /2\.4\.1/.test(b.textContent));
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await act(() => btn.click());
    const open = [...document.querySelectorAll('button[aria-expanded]')].find((b) => /2\.4\.1/.test(b.textContent));
    expect(open.getAttribute('aria-expanded')).toBe('true');
    const region = document.getElementById(open.getAttribute('aria-controls'));
    expect(region.textContent).toMatch(/headings and page landmarks/);
  });
});

describe('saved state is input, not truth', () => {
  it('a loading flag saved by an older version does not leave the tool stuck on "Auditing…", and is removed', async () => {
    const saved = await mount({ auditInputMode: 'url', auditUrl: 'https://example.com', auditLoading: true, complaintLoading: true, socialRewriteLoading: true }, { callGemini: pending() });
    const btn = buttonNamed('Audit URL');
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(false);
    expect(saved().auditLoading).toBeUndefined();
    expect(saved().complaintLoading).toBeUndefined();
    expect(saved().socialRewriteLoading).toBeUndefined();
  });

  it('badly shaped saved AI answers render instead of crashing the tool', () => {
    const bad = {
      auditResult: { score: '85', grade: { g: 'A' }, summary: { text: 'Summary text' }, issues: 'none found', strengths: [{ s: 1 }, 'Good alt text'], score_breakdown: { structure: { v: 9 }, images: '7' }, recommendation: 7 },
      deterministicAudit: { ok: true },
      auditHistory: [{ input: { odd: true }, score: 'x', date: 'garbage' }, null, 'junk'],
      badges: 'none'
    };
    const ai = { callGemini: async () => '' };
    for (const tab of ['audit', 'history', 'badges', 'action']) {
      const html = renderTool('a11yAuditor', { a11yAuditor: Object.assign({ tab }, bad) }, ai);
      expect(html.length).toBeGreaterThan(500);
    }
    const audit = renderTool('a11yAuditor', { a11yAuditor: Object.assign({ tab: 'audit' }, bad) }, ai);
    expect(audit).toContain('Summary text');
    expect(audit).toContain('85');
  });

  it('a malformed AI answer is coerced before it is saved', async () => {
    const callGemini = vi.fn(async () => '{"score":"91","grade":"A","issues":"none found","strengths":"good","score_breakdown":{"structure":"9","images":{"x":1}}}');
    const saved = await mount({ auditInputMode: 'url', auditUrl: 'https://example.com' }, { callGemini });
    await act(() => buttonNamed('Audit URL').click());
    await React.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const r = saved().auditResult;
    expect(r.score).toBe(91);
    expect(Array.isArray(r.issues)).toBe(true);
    expect(Array.isArray(r.strengths)).toBe(true);
    expect(r.score_breakdown).toEqual({ structure: 9 });
  });
});

describe('progress counts real work once', () => {
  it('reopening one criterion does not count again or pay XP again', async () => {
    const awardXP = vi.fn();
    const saved = await mount({ tab: 'learn' }, { awardXP });
    const find = () => [...document.querySelectorAll('button[aria-expanded]')].find((b) => /1\.1\.1/.test(b.textContent));
    for (let i = 0; i < 6; i++) await act(() => find().click());
    expect(saved().criteriaExplored).toBe(1);
    expect(awardXP.mock.calls.filter((c) => c[0] === 3)).toHaveLength(1);
  });

  it('three different Knowbility cards earn the Knowbility Ally badge; clicking one card twice pays once', async () => {
    const awardXP = vi.fn();
    const saved = await mount({ tab: 'knowbility' }, { awardXP });
    const card = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent));
    await act(() => card(/John Slatin AccessU/).click());
    await act(() => card(/John Slatin AccessU/).click());
    expect(saved().knowbilityExplored).toBe(1);
    await act(() => card(/Accessibility Internet Rally/).click());
    await act(() => card(/Volunteer at AccessU/).click());
    expect(saved().knowbilityExplored).toBe(3);
    expect(saved().badges).toContain('knowbility_ally');
    expect(document.body.textContent).not.toMatch(/knowbility\.org\/programs/);
  });
});

describe('with AI off the measured check is a complete audit, and personal text stays out of the project', () => {
  it('counts the audit, records it, announces it, makes zero AI calls and saves no HTML', async () => {
    const announceToSR = vi.fn(), callGeminiVision = vi.fn();
    const saved = await mount({ auditInputMode: 'html' }, { announceToSR, callGeminiVision });
    await act(() => typeInto(document.querySelector('textarea'), '<html><body><img src="a.png"><a href="/x">click here</a></body></html>'));
    await act(() => buttonNamed('Audit HTML').click());
    const s = saved();
    expect(s.auditsCompleted).toBe(1);
    expect(s.auditHistory).toHaveLength(1);
    expect(s.auditHistory[0].measured).toBe(true);
    expect(s.deterministicAudit.findings.length).toBeGreaterThan(0);
    expect(s.auditHtml).toBeUndefined();
    expect(callGeminiVision).not.toHaveBeenCalled();
    expect(announceToSR.mock.calls.map((c) => c[0]).join(' ')).toMatch(/Measured check complete/);
    expect(document.body.textContent).toMatch(/Not checked automatically/);
    expect(document.body.textContent).not.toMatch(/The AI will check it/);
  });

  it('the report includes the measured findings and names the input; New Audit clears them', async () => {
    let blobText = null;
    const RealBlob = window.Blob;
    vi.spyOn(window, 'Blob').mockImplementation(function (parts, opts) { blobText = parts.join(''); return new RealBlob(parts, opts); });
    window.URL.createObjectURL = vi.fn(() => 'blob:x'); window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const saved = await mount({ auditInputMode: 'html' }, {});
    await act(() => typeInto(document.querySelector('textarea'), '<img src="a.png">'));
    await act(() => buttonNamed('Audit HTML').click());
    await act(() => buttonNamed('📥 Download Report').click());
    const report = JSON.parse(blobText);
    expect(report.input).toMatch(/^Pasted HTML/);
    expect(report.measuredChecks.findings.map((f) => f.wcag)).toContain('1.1.1');
    expect(report.standard).toMatch(/WCAG 2\.2 AA/);
    await act(() => buttonNamed('🔄 New Audit').click());
    expect(saved().deterministicAudit).toBeNull();
  });

  it('the complaint impact text is never saved, and old saved copies are removed', async () => {
    const saved = await mount({ tab: 'action', complaintImpact: 'My child uses a screen reader', complaintResult: 'Old letter' }, { callGemini: pending() });
    const box = document.querySelector('textarea[aria-label="Impact description"]');
    expect(box.value).toBe('My child uses a screen reader'); // still on screen this visit
    expect(saved().complaintImpact).toBeUndefined();
    expect(saved().complaintResult).toBeUndefined();
    await act(() => typeInto(box, 'My daughter is blind and cannot use the enrolment form'));
    expect(saved().complaintImpact).toBeUndefined();
    expect(JSON.stringify(saved())).not.toMatch(/daughter/);
  });
});
