// Behavior Lens messages with numbers in them.
//
// WHY: until 2026-09-23, 23 toasts and confirmations were written as
// `t('key') || \`Session: ${pct}% correct\``. Their keys ARE registered in
// ui_strings.js, with the numbers flattened to "N" ("Session: N% correct (N/N)",
// "Phase N evaluated! N", "Switched to N") or with the raw `${label}` left in. The
// host's t() returns that text, so the fallback carrying the real numbers never ran:
// teachers read "Integrity: N% (N/N)" and "Delete ${label}?". Every Behavior Lens test
// passed `t: () => undefined`, which forces the fallback, so none could see it.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const registered = key => key.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), strings);
// The host t(): registered text for a registered key, undefined otherwise.
const hostT = key => { const v = registered(key); return typeof v === 'string' ? v : undefined; };

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});

describe('the source', () => {
  it('no t() call uses a registered text with a flattened "N" or a raw ${...}', () => {
    const src = readFileSync('behavior_lens_module.js', 'utf8');
    const bad = [];
    for (const m of src.matchAll(/\bt\(\s*'((?:behavior_lens|toasts|bl)\.[a-z0-9_.]+)'/g)) {
      const v = registered(m[1]);
      if (typeof v === 'string' && (/\bN\b/.test(v) || v.includes('${'))) bad.push(m[1] + ' => ' + v);
    }
    expect(bad).toEqual([]);
  });
  it('the gate can see a bad one (it is not vacuous)', () => {
    // A registered key known to hold "N": the check above must flag it if it were used.
    expect(registered('behavior_lens.toast.integrity_n_nn')).toBe('Integrity: N% (N/N)');
  });
});

describe('with the host\'s real strings', () => {
  it('the treatment-integrity toast carries the numbers', () => {
    const toasts = [];
    const q = componentHarness('TreatmentIntegrityTracker', { studentName: 'Kestrel', t: hostT, addToast: m => toasts.push(m) }, { tt: (key, en, params) => { let s = en; Object.keys(params || {}).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); }); return hostT(key) || s; } });
    q.all(n => n.props['aria-label'] === 'Step 1 description')[0].props.onChange({ target: { value: 'Deliver token within 5s' } }); q.render();
    q.all(n => n.props['aria-label'] === 'Done')[0].props.onClick(); q.render();
    const save = q.all(n => n.type === 'button' && /Save/.test(q.text(n)))[0];
    save.props.onClick(); q.render();
    const msg = toasts.find(m => /Integrity/.test(m));
    expect(msg).toBeTruthy();
    expect(msg).not.toMatch(/\bN\b/);                  // old: "Integrity: N% (N/N)"
    expect(msg).toMatch(/Integrity: \d+% \(\d+\/\d+\)/);
  });
});
