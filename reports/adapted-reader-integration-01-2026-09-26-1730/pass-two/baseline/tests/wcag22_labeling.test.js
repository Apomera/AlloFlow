import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Batch W (2026-07-13): WCAG 2.2 truth-in-labeling (7/12 ledger B6 + C7 label items).
// Principle: every surface claims exactly what its layer checks —
//   engines (axe 4.12.1 wcag22 tags, EA WCAG_2_2 policy) = WCAG 2.2;
//   AI content rubric = 2.1-era item set, said out loud;
//   ADA Title II rule citations stay WCAG 2.1 AA (that is what the rule requires).

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');
const ui = read('ui_strings.js');
const help = read('help_strings.js');

describe('engine standard strings are normalized', () => {
  it('axe and Equal Access result objects both say WCAG 2.2 AA', () => {
    expect(pipe).not.toContain("standard: 'WCAG 2.2 A/AA'");
    expect((pipe.match(/standard: 'WCAG 2\.2 AA', \/\/ normalized across engines/g) || []).length).toBe(2);
  });
  it('the saved-result sniff prefix-matches so the next bump does not demote canonical saves', () => {
    expect(view).toContain("/^WCAG 2\\.\\d+ AA$/.test(String(value.verificationCoverage.standard || ''))");
    expect(view).not.toContain("verificationCoverage.standard === 'WCAG 2.2 AA'");
  });
});

describe('report claim is scoped per layer', () => {
  it('the formatted report names what engines vs AI rubric actually check', () => {
    expect(pipe).toContain('the automated engines evaluate WCAG 2.2 rules; the AI content review scores against a WCAG 2.1 AA-era item set');
  });
});

describe('view WCAG_LABELS covers the 2.2 success criteria', () => {
  it('all nine 2.2 SC names are present', () => {
    for (const [sc, name] of [
      ['2.4.11', 'Focus Not Obscured (Minimum)'],
      ['2.4.12', 'Focus Not Obscured (Enhanced)'],
      ['2.4.13', 'Focus Appearance'],
      ['2.5.7', 'Dragging Movements'],
      ['2.5.8', 'Target Size (Minimum)'],
      ['3.2.6', 'Consistent Help'],
      ['3.3.7', 'Redundant Entry'],
      ['3.3.8', 'Accessible Authentication (Minimum)'],
      ['3.3.9', 'Accessible Authentication (Enhanced)'],
    ]) {
      expect(view).toContain(`'${sc}': '${name}'`);
    }
  });
});

describe('English string sources', () => {
  it('pipeline/engine claims moved to 2.2; new i18n keys registered', () => {
    expect(ui).toContain('"subheading": "Audit a website URL or paste HTML for full WCAG 2.2 AA audit + remediation"');
    expect(ui).toContain('"static_scope_subheading"');
    expect(ui).toContain('"axe_desc": "Deque automated WCAG 2.2 AA checker"');
    expect(ui).toContain('"summary_title": "Batch Processing Complete"');
    expect(ui).toContain('"tile_fully_verified": "Fully verified"');
  });
  it('ADA Title II rule citations DELIBERATELY stay WCAG 2.1 (that is the cited standard)', () => {
    expect(ui).toContain('"heading": "ADA Title II & WCAG 2.1 AA"');
    expect(ui).toContain('"wcag_strong": "WCAG 2.1 Level AA"');
    expect(ui).toContain('which builds on the WCAG 2.1 Level AA standard this federal rule requires');
  });
  it('the values callout went version-neutral', () => {
    expect(ui).toContain('"italic_callout": "WCAG AA isn');
  });
  it('help_strings keeps exactly one 2.1 mention: the AI-rubric layer truth', () => {
    const mentions = help.match(/WCAG 2\.1/g) || [];
    expect(mentions.length).toBe(1);
    expect(help).toContain('score the document against a WCAG 2.1 AA-era rubric (the axe-core and Equal Access engines add WCAG 2.2 rule coverage)');
  });
});

describe('batch tiles are t()-wired', () => {
  it('all four tiles + title read pack keys with English fallback', () => {
    for (const key of ['pdf_audit.batch.summary_title', 'pdf_audit.batch.tile_processed', 'pdf_audit.batch.tile_fully_verified', 'pdf_audit.batch.tile_need_review', 'pdf_audit.batch.tile_verified_90']) {
      expect(view).toContain(`t('${key}')`);
    }
  });
});

describe('language packs follow their English sources', () => {
  it('sampled packs: engine/pipeline keys say 2.2, ADA citations keep 2.1', () => {
    for (const packName of ['arabic', 'yoruba', 'spanish_latin_america', 'vietnamese']) {
      const pack = read(`lang/${packName}.js`);
      const axeDescLine = pack.split('\n').find((l) => l.includes('"axe_desc"')) || '';
      if (axeDescLine.includes('WCAG')) expect(axeDescLine).toContain('WCAG 2.2');
      const adaHeading = pack.split('\n').find((l) => l.includes('"wcag_strong"')) || '';
      if (adaHeading.includes('WCAG')) expect(adaHeading).toContain('WCAG 2.1');
      // Mirror parity
      const mirror = read(`desktop/web-app/public/lang/${packName}.js`);
      expect(mirror).toBe(pack);
    }
  });
});
