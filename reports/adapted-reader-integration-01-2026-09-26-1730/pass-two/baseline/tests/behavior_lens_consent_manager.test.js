// Behavior Lens consent form.
//
// WHY: until 2026-09-23 "AI Customize Language" rewrote EVERY section of the family
// consent form, the FERPA rights list included, straight into the saved form: no undo,
// and nothing on the form said a model had changed legal text. "Reset to Default"
// wiped every edit without asking, an imported template was not checked (a file whose
// sections were not objects broke the form), and a blocked pop-up crashed Print.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let CM;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  CM = window.AlloModules.BehaviorLensConsent;
  if (!CM) throw new Error('BehaviorLensConsent did not register');
});

const REWRITE = JSON.stringify({ sections: [
  { id: 'purpose', content: 'We would love to share notes with you!' },
  { id: 'rights', content: 'You have rights.' },          // a model dropping four rights to one line
] });

describe('the AI rewrite', () => {
  const mount = (confirm = true) => {
    let sent = '';
    const toasts = [];
    const q = componentHarness('ConsentManager', { studentName: 'Brave Otter', studentKey: k => k, t: () => undefined, addToast: m => toasts.push(m), callGemini: async p => { sent = p; return REWRITE; } },
      { askBehaviorLensConfirmation: async () => confirm });
    return { q, sent: () => sent, toasts };
  };
  const sectionText = (q, needle) => q.text().includes(needle);
  const aiButton = q => q.all(n => n.type === 'button' && /AI Customize Language/.test(q.text(n)))[0];

  it('never rewrites the FERPA rights, and does not send them', async () => {
    const { q, sent } = mount();
    await aiButton(q).props.onClick(); q.render();
    expect(sent()).not.toContain('Inspect and review your child');
    expect(sectionText(q, 'File a complaint with the U.S. Department of Education')).toBe(true);   // old: "You have rights."
    expect(sectionText(q, 'We would love to share notes with you!')).toBe(true);
  });
  it('says the text was AI-rewritten, and can undo it', async () => {
    const { q } = mount();
    await aiButton(q).props.onClick(); q.render();
    expect(q.text(q.byAttr('data-consent-ai', 'true')[0])).toContain('have your school or district approve it before families sign');
    q.all(n => n.type === 'button' && q.text(n) === 'Undo AI rewrite')[0].props.onClick(); q.render();
    expect(sectionText(q, 'We would love to share notes with you!')).toBe(false);
    expect(sectionText(q, 'The goal is to build a shared, holistic understanding')).toBe(true);
    expect(q.byAttr('data-consent-ai', 'true')).toHaveLength(0);
  });
  it('Reset to Default asks first', async () => {
    const { q } = mount(false);
    await aiButton(q).props.onClick(); q.render();
    await q.all(n => n.props['aria-label'] === 'Reset to Default')[0].props.onClick(); q.render();
    expect(sectionText(q, 'We would love to share notes with you!')).toBe(true);     // declined: kept
  });
});

describe('templates', () => {
  it('an import must have well-formed sections', () => {
    expect(CM.validConsentSections([{ id: 'a', title: 'A', content: 'x' }])).toBe(true);
    expect(CM.validConsentSections('not a list')).toBe(false);
    expect(CM.validConsentSections([{ id: 'a', title: 'A' }])).toBe(false);
    expect(CM.validConsentSections([])).toBe(false);
  });
  it('applyConsentRewrite ignores blank and locked sections', () => {
    const out = CM.applyConsentRewrite([{ id: 'purpose', content: 'old' }, { id: 'rights', content: 'keep' }, { id: 'storage', content: 'store' }],
      [{ id: 'purpose', content: 'new' }, { id: 'rights', content: 'changed' }, { id: 'storage', content: '   ' }]);
    expect(out.map(s => s.content)).toEqual(['new', 'keep', 'store']);
  });
});
