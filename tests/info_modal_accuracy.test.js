import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = readFileSync('view_info_modal_source.jsx', 'utf8');
const strings = readFileSync('ui_strings.js', 'utf8');
const licenses = readFileSync('THIRD_PARTY_LICENSES.md', 'utf8');

describe('Info modal accuracy contracts', () => {
  it('uses live in-app onboarding instead of missing media assets', () => {
    expect(source).not.toContain('/alloflow_intro_teacher.mp4');
    expect(source).not.toContain('/alloflow_intro_family.mp4');
    expect(source).not.toContain('activeVideo');
    expect(source).toContain('aria-labelledby="about-start-heading"');
    expect(source).toContain('Map the platform');
    expect(source).toContain('Browse guided workflows');
    expect(source).toContain("openCommandPaletteFromInfo('', 'about')");
  });

  it('describes every implemented storage, session, and AI data path', () => {
    for (const fact of [
      'Desktop LAN and local preview',
      'Firebase demo or bring-your-own Firebase',
      'Class Mailbox',
      'teacher-owned Google Drive',
      'Gemini, OpenAI, Claude',
      'custom OpenAI-compatible endpoint',
      'provider age/use restrictions',
    ]) expect(source).toContain(fact);

    expect(source).not.toContain('When you use online AI: Google');
    expect(source).not.toContain('the request goes to <strong>Google');
    expect(source).not.toContain('Two features are the exception');
    expect(source).not.toContain('Fully on-device: the School Box');
  });

  it('states accessibility targets and validation limits without certifying output', () => {
    expect(source).toContain('designed toward WCAG 2.2 AA (a target, not a certification)');
    expect(source).toContain('withholds a conformance claim unless the available checks support it');
    expect(source).toContain('PDF/UA-1 (ISO 14289-1)');
    expect(source).not.toContain('designed toward WCAG 2.1 AA');
    expect(source).not.toContain('Text-to-speech and read-aloud throughout');
  });

  it('removes stale hard counts and overclaims from feature guidance', () => {
    for (const stale of [
      'details for all 24 AlloFlow tools',
      '32-tool registry',
      'Tool selection from 32 options',
      '115+ individual tool configurations',
      'IOA calculator with 5 reliability methods',
      'WCAG-AA remediated HTML',
      'Shared visual space',
      'Infinite collaborative whiteboard',
    ]) {
      expect(source + strings).not.toContain(stale);
    }

    expect(source).toContain('stemCatalogCount');
    expect(source).toContain('selCatalogCount');
    expect(strings).toContain('IOA calculator (6 methods)');
    expect(strings).toContain('Private, device-local infinite whiteboard');
  });

  it('keeps hosted-provider attribution provider-neutral', () => {
    expect(strings).toContain('Gemini, OpenAI, Claude, or an OpenAI-compatible endpoint');
    expect(licenses).toContain('OpenAI, Claude, or an OpenAI-compatible endpoint');
    expect(strings).not.toContain('AI features also use Google’s Gemini API');
  });

  it('OSS attribution is complete: the credits guard passes', () => {
    // Every library credited in the in-app tab must carry its own copyright
    // notice in THIRD_PARTY_LICENSES.md, and every bundled license text it
    // points at must exist. A drift here is a license violation, so it blocks.
    const result = spawnSync(process.execPath, ['dev-tools/check_oss_credits.cjs'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toMatch(/credited libraries all present with copyright notices/);
  });

  it('the NOTICES file carries real copyright notices, not placeholders', () => {
    // The old file shipped "Copyright (c) <year> <copyright holders>" templates
    // and told the reader to substitute them — which does not satisfy the
    // notice-retention condition of MIT/BSD/ISC. Real holders must be present.
    expect(licenses).toContain('Copyright (c) Meta Platforms, Inc. and affiliates.');
    expect(licenses).toContain('Copyright (c) 2010-present three.js authors');
    expect(licenses).toContain('Copyright (c) 2012 Lea Verou');
    // no un-substituted placeholder rows remain in the inventory tables
    expect(licenses).not.toMatch(/\|\s*Copyright \(c\) <year> <copyright holders>\s*\|/);
  });

  it('the offline license-text bundle is wired up (School Box carries attribution offline)', () => {
    // full verbatim texts bundled, referenced, and packaged into the desktop app
    for (const f of ['Apache-2.0.txt', 'MPL-2.0.txt', 'OFL-1.1.txt', 'GPL-3.0.txt', 'CC-BY-SA-4.0.txt']) {
      expect(readFileSync('licenses/' + f, 'utf8').length, f).toBeGreaterThan(1000);
    }
    const builder = readFileSync('desktop/electron-builder.json', 'utf8');
    expect(builder).toContain('"from": "../licenses"');
    expect(builder).toContain('"from": "../THIRD_PARTY_LICENSES.md"');
  });

  it('the Apache PDFBox NOTICE and copyleft posture are documented', () => {
    expect(licenses).toContain('Apache PDFBox\nCopyright 2014 The Apache Software Foundation');
    expect(licenses).toMatch(/elects the \*{0,2}MPL-2\.0/); // veraPDF dual-license election
    expect(licenses).toMatch(/CircuitJS1[\s\S]{0,400}iframe/i); // GPLv2 aggregation posture
  });

  it('fails when the generated Atlas directory is stale', () => {
    // 2026-07-20: count-agnostic — pinning the exact entry count made this
    // test stale every time any session registered a tool.
    const result = spawnSync(process.execPath, ['dev-tools/harvest_atlas.cjs', '--check'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toMatch(/5 hubs, \d+ catalog entries/);
    expect(source).toContain('Generated from the STEM Lab registry');
    expect(source).toContain('Command palette plus curated top-level launchers');
    expect(source).toContain('not unique-tool totals');
  });
});
