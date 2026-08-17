import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Vendored third-party artwork is the one thing in this tool that carries legal
// obligations. These tests are the standing guard on that: they fail if anything
// that is not public domain or CC0 ever enters the manifest, if a file goes
// missing, or if an image ships without recorded provenance.
//
// Attribution is not legally required for public-domain works. It is recorded
// and checked anyway, because naming the illustrator is decent and because
// provenance is what makes the licence claim auditable later.

const ROOT = process.cwd();
const ASSET_DIR = path.join(ROOT, 'stem_lab', 'assets', 'fisherlab');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'stem_lab', 'assets', 'fisherlab');
const MANIFEST = path.join(ASSET_DIR, 'asset-manifest.json');

// Public domain and CC0 only. CC-BY and CC-BY-SA are deliberately excluded:
// they carry ongoing obligations, and share-alike can propagate into the work
// it is embedded in.
const CLEAN = /^(public domain|cc0|no restrictions)/i;
const manifest = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

describe('Fisher Lab species artwork licensing', () => {
  it('★ ships nothing that is not public domain or CC0', () => {
    const m = manifest();
    expect(m.images.length).toBeGreaterThan(0);
    m.images.forEach((img) => {
      expect(img.licence, img.file).toMatch(CLEAN);
      // A CC-BY-SA slipping in is the specific failure this exists to catch.
      expect(img.licence, img.file).not.toMatch(/\bBY\b|share.?alike/i);
    });
  });

  it('records provenance for every image', () => {
    manifest().images.forEach((img) => {
      expect(img.source, img.file).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(img.artist, img.file).toBeTruthy();
      expect(img.verified, img.file).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(img.sourceTitle, img.file).toBeTruthy();
    });
  });

  it('has every manifest file on disk at the recorded size', () => {
    manifest().images.forEach((img) => {
      const p = path.join(ASSET_DIR, 'species', img.file);
      expect(fs.existsSync(p), img.file).toBe(true);
      expect(fs.statSync(p).size, img.file).toBe(img.bytes);
    });
  });

  it('has no orphan files that the manifest does not account for', () => {
    // An unrecorded image is an unlicensed image as far as anyone auditing this
    // is concerned.
    const onDisk = fs.readdirSync(path.join(ASSET_DIR, 'species'));
    const named = manifest().images.map((i) => i.file);
    onDisk.forEach((f) => expect(named, 'unrecorded file: ' + f).toContain(f));
    expect(onDisk.length).toBe(named.length);
  });

  it('keeps every file well under the 25 MiB Cloudflare per-file cap', () => {
    // One oversized file failed an entire deploy and froze the CDN in July 2026.
    manifest().images.forEach((img) => {
      expect(img.bytes, img.file).toBeLessThan(2 * 1024 * 1024);
    });
  });

  it('credits every image in ATTRIBUTION.md', () => {
    const doc = fs.readFileSync(path.join(ASSET_DIR, 'ATTRIBUTION.md'), 'utf8');
    manifest().images.forEach((img) => {
      expect(doc, img.file).toContain(img.file);
    });
    // And the gaps are explained rather than silently absent.
    Object.keys(manifest().noImage).forEach((id) => expect(doc).toContain(id));
  });

  it('mirrors the assets into the desktop bundle', () => {
    // The desktop app is served from its own copy; an un-mirrored asset shows
    // as a missing plate there and nowhere else.
    manifest().images.forEach((img) => {
      expect(fs.existsSync(path.join(MIRROR_DIR, 'species', img.file)), img.file).toBe(true);
    });
    expect(fs.existsSync(path.join(MIRROR_DIR, 'ATTRIBUTION.md'))).toBe(true);
  });

  it('resolves an art URL for every manifest entry and nothing else', () => {
    const { getCoreSpeciesArt } = window.__FisherLabCore;
    manifest().images.forEach((img) => {
      const art = getCoreSpeciesArt(img.id);
      expect(art, img.id).toBeTruthy();
      expect(art.url).toContain('assets/fisherlab/species/' + img.file);
      expect(art.licence).toMatch(CLEAN);
    });
    // Species the fetcher deliberately skipped must stay unillustrated, so the
    // card falls back to the drawn key instead of pointing at a missing file.
    Object.keys(manifest().noImage).forEach((id) => {
      expect(getCoreSpeciesArt(id), id).toBeNull();
    });
    expect(getCoreSpeciesArt('not-a-species')).toBeNull();
  });

  it('hides the figure rather than showing a broken image', () => {
    // Offline, or in a bundle shipped without assets, a card with no plate is
    // correct; a broken-image icon is not.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('onError:');
    expect(src).toMatch(/onError:[^\n]*display = 'none'/);
  });
});
