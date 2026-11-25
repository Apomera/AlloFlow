import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = readFileSync('view_info_modal_source.jsx', 'utf8');
const strings = readFileSync('ui_strings.js', 'utf8');
const licenses = readFileSync('THIRD_PARTY_LICENSES.md', 'utf8');
const catalogItems = (file) => {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : (parsed.books || parsed.items || parsed.cards || []);
};
const readingIndex = catalogItems('reading_library/index.json');
const readingCards = catalogItems('reading_library/index_cards.json');

describe('Info modal accuracy contracts', () => {
  it('uses live in-app onboarding instead of missing media assets', () => {
    expect(source).not.toContain('/alloflow_intro_teacher.mp4');
    expect(source).not.toContain('/alloflow_intro_family.mp4');
    expect(source).not.toContain('activeVideo');
    expect(source).toContain('aria-labelledby="about-start-heading"');
    expect(source).toContain('Explore the Atlas');
    expect(source).toContain('Open the Feature Guide');
    expect(source).toContain("openCommandPaletteFromInfo('', 'about')");
    // Internal reassurance is not user-facing copy.
    expect(source).not.toContain('nothing here can drift into a broken walkthrough');
  });

  it('describes every implemented storage, session, AI, speech, and report data path', () => {
    for (const fact of [
      'Desktop LAN and local preview',
      'Bring-your-own Firebase uses your school’s or district’s own Firebase project',
      'Class Mailbox',
      'teacher-owned Google Drive',
      'In Gemini Canvas, sessions use the storage Google provides to Canvas apps',
      'Gemini, OpenAI, Claude',
      'custom OpenAI-compatible endpoint',
      'Gemini API terms require users to be 18 or older',
      'The browser’s speech service may send your voice to the browser maker (in Chrome, Google)',
      'are deleted after 30 days',
      'provider age/use restrictions',
      'AlloFlow does not run a cloud service of its own for class sessions',
    ]) expect(source).toContain(fact);
    // There is no AlloFlow-run demo cloud (owner decision 2026-11-05; mode removed 2026-11-23).
    expect(source).not.toMatch(/Firebase demo|demo cloud/i);

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
      // Retired 2026-11-23: each was checked against the code and found wrong.
      '5 vocabulary games',
      '8 activity types',
      '17 assessment presets',
      '17 standardized assessment scores',
      'PCS symbols',
      'PCS-style symbol generation',
      'Full AAC platform',
      'Team leaderboard',
      'Auto-routing of safety flags to staff',
      'filters out accent hesitations',
      'saving 5–10 minutes',
      'Hundreds of leveled picture books',
      'Select from preset characters',
      'Exportable annotated PDF',
      'RSVP speed (200–600 wpm)',
      'axe-core 4.10',
      'Agentic tool-and-resource builder',
    ]) {
      expect(source + strings).not.toContain(stale);
    }

    expect(source).toContain('stemCatalogCount');
    expect(source).toContain('selCatalogCount');
    // Counts that were re-derived from the code that implements each tool.
    expect(source).toContain('20 activity types');
    expect(source).toContain('Scores from 16 common instruments, or a custom one');
  });

  it('keeps the Feature Guide keyed by stable ids, with every string registered', () => {
    const ui = JSON.parse(strings).about;
    const start = source.indexOf('const FEATURE_GUIDE = ');
    const items = JSON.parse(source.slice(start + 'const FEATURE_GUIDE = '.length, source.indexOf(';\n/* FEATURE_GUIDE_DATA_END */', start)));
    expect(items.length).toBeGreaterThan(40);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    for (const item of items) {
      const key = item.id.replace(/[^A-Za-z0-9]+/g, '_');
      const registered = ui.fg[key];
      expect(registered, item.id).toBeTruthy();
      expect(registered.title, item.id).toBe(item.title);
      expect(registered.desc, item.id).toBe(item.desc);
      for (const field of ['inputs', 'steps', 'outputs', 'options']) {
        item[field].forEach((text, i) => expect(registered[field + '_' + (i + 1)], item.id + '.' + field).toBe(text));
      }
    }
    expect(ui.features_list).toBeUndefined();
  });

  it('uses plain-language image editing labels instead of an internal model nickname', () => {
    expect(strings).toContain('"refiner_title": "Image Editor"');
    expect(source + strings).not.toContain('Nano Banana');
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

  it('recognizes every active reading-catalog provider without relicensing its works', () => {
    const creditStart = source.indexOf('const READING_SOURCE_CREDITS = [');
    const creditEnd = source.indexOf('\n];', creditStart);
    expect(creditStart).toBeGreaterThan(-1);
    expect(creditEnd).toBeGreaterThan(creditStart);

    const creditedSourceIds = [...source.slice(creditStart, creditEnd).matchAll(/\bsourceId:\s*'([^']+)'/g)]
      .map((match) => match[1])
      .sort();
    const catalogSourceIds = [...new Set([...readingIndex, ...readingCards]
      .map((item) => item?.source?.id)
      .filter(Boolean))]
      .sort();

    expect(creditedSourceIds).toEqual(catalogSourceIds);
    expect(source).toContain('Reading works and catalog records are not covered by AlloFlow’s AGPL license');
    expect(source).toContain('Collections with mixed or unclear rights stay link-only');
    expect(source).toContain('generative and extract-to-text handoffs are blocked');
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

  it('modification posture is documented and vendored files keep their notice banner', () => {
    // The NOTICES file must state whether third-party source was modified, and
    // spell out the per-license modification-notice policy.
    expect(licenses).toContain('## Modifications to third-party components');
    expect(licenses).toMatch(/Whiteboard[\s\S]{0,200}unmodified[\s\S]{0,80}Excalidraw/);
    expect(licenses).toContain('Apache-2.0 §4(b)'); // modification-notice rule spelled out
    // qrcode was an uncredited MIT dependency — now credited
    expect(source).toContain("name: 'QR Code Generator (Kazuhiko Arase)'");
    expect(licenses).toContain('Copyright (c) 2009 Kazuhiko Arase');
    // the vendored minified copies carry a restored copyright banner
    const banner = (f) => readFileSync(f, 'utf8').slice(0, 800);
    expect(banner('lame.min.js')).toMatch(/Copyright[\s\S]*LGPL-3\.0/i);
    expect(banner('data_lab/vendor/iframe-phone.js')).toMatch(/Copyright \(c\) 2014 Concord Consortium/);
    expect(banner('immersive_geometry/vendor/aframe.min.js')).toMatch(/Copyright \(c\) 2015-present A-Frame authors/);
    expect(banner('temml/temml.min.js')).toMatch(/Copyright \(c\) 2020 Ron Kok/);
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
    expect(source).toContain('Generated from the STEAM Lab registry');
    expect(source).toContain('Command palette plus curated top-level launchers');
    expect(source).toContain('a few tools appear in more than one hub');
  });

  it('lists each studio once and keeps other hubs and actions out of Studios & Surfaces', () => {
    const start = source.indexOf('const ATLAS_HUBS = ');
    const hubs = JSON.parse(source.slice(start + 'const ATLAS_HUBS = '.length, source.indexOf(';\nconst ATLAS_STEAM_DIRECT_LINKS', start)));
    const studios = hubs.find((hub) => hub.id === 'studios').categories[0].tools;
    const letters = studios.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    expect(new Set(letters).size).toBe(letters.length);
    for (const notASurface of ['STEAM Lab', 'SEL Hub', 'Research Hub', 'export menu', 'a specific STEM tool', 'Go to the dashboard', 'Read this page to me', 'Find the right book']) {
      expect(studios).not.toContain(notASurface);
    }
  });

  it('shows the real build instead of a hard-coded version number', () => {
    expect(source).toContain('window.__alloBuildStamp');
    expect(source).toContain("fmtInfo(t('about.version_build') || 'Build {build}', { build: buildHash })");
    expect(JSON.parse(strings).about.title).toBe('About AlloFlow');
    expect(source + strings).not.toMatch(/AlloFlow v1\.0/);
  });
});
