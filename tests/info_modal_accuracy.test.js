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

  it('fails when the generated Atlas directory is stale', () => {
    const result = spawnSync(process.execPath, ['dev-tools/harvest_atlas.cjs', '--check'], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('5 hubs, 240 catalog entries');
    expect(source).toContain('Generated from the STEM Lab registry');
    expect(source).toContain('Command palette plus curated top-level launchers');
    expect(source).toContain('not unique-tool totals');
  });
});
