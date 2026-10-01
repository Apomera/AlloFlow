// Regression: the `blendedInitial is not defined` fatal crash (2026-06-21). The weakest-layer scoring
// redesign renamed `const blendedInitial` → `governingInitial`, but ONE reference inside a
// setPdfAuditResult callback still read `blendedInitial`. esbuild parsed it (valid identifier), the
// render-ref gate didn't scan it (free var in a callback, not a hook dep array), and the string-anti-
// drift tests didn't execute it — so it shipped and crashed the whole app on every baseline audit via
// the ErrorBoundary. This pins the fixed crash site + bans the renamed-away names, and asserts the new
// free-variable gate's baseline doesn't whitelist the dangler.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('no dangling references from the mean→min rename', () => {
  it('the crash site now reads the declared variable (score: governingInitial)', () => {
    expect(pipe).toMatch(/setPdfAuditResult\(prev => \(\{[\s\S]{0,80}score: governingInitial,/);
  });
  it('the renamed-away identifiers appear NOWHERE (they were the danglers)', () => {
    for (const dead of ['blendedInitial', 'blendedFinal', '_reBlended']) {
      expect(pipe.includes(dead), `${dead} still present in doc_pipeline`).toBe(false);
      expect(view.includes(dead), `${dead} still present in view`).toBe(false);
    }
  });
  it('every governing var that is USED is also DECLARED (declared >= referenced, no free refs)', () => {
    for (const name of ['governingInitial', 'governingFinal', '_reGoverning', '_consolidatedContentScore']) {
      const uses = (pipe.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
      const decls = (pipe.match(new RegExp('const ' + name + '\\b', 'g')) || []).length;
      expect(uses, `${name} is referenced but never declared`).toBeGreaterThan(0);
      expect(decls, `${name} has no const declaration`).toBeGreaterThan(0);
    }
  });
});

describe('the free-variable gate baseline does not whitelist the dangler', () => {
  it('free_vars_baseline.json exists and contains no blendedInitial/blendedFinal/_reBlended', () => {
    const p = resolve(process.cwd(), 'dev-tools/free_vars_baseline.json');
    expect(existsSync(p)).toBe(true);
    const raw = readFileSync(p, 'utf8');
    expect(raw.includes('blendedInitial')).toBe(false);
    expect(raw.includes('blendedFinal')).toBe(false);
    expect(raw.includes('_reBlended')).toBe(false);
  });
});
