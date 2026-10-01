// Tool icon uniqueness gate (2026-08-23).
//
// Every tool a user can pick from a grid identifies itself by one emoji. When two
// tools share one, the grid stops being scannable — Page Designer and Symbol Studio
// both shipped as a palette, Data Lab / Data Plotter / Data Studio / Stats Lab /
// Ratios / Assessment Literacy all shipped as a bar chart, and nothing caught it
// because no gate ever compared them.
//
// This gate compares the icon of every tool across the three surfaces a learner or
// educator actually browses:
//   1. STEM Lab tools           — registerTool(id, { icon }) in stem_lab/stem_tool_*.js
//   2. the Educator Hub grid    — view_educator_hub_modal_source.jsx
//   3. the Learner Hub grid     — view_learning_hub_modal_source.jsx
//   4. the CDN loading splashes — <CDNModuleGate icon=… displayName=…> in ANTI
//
// Icons are compared by their DECODED code points, so '📊' and a literal
// bar chart count as the same icon — the two spellings are why the earlier count of
// "distinct icons" looked healthy.
//
// SHARED_ICONS below is the allow-list: the same product surfaced in more than one
// grid SHOULD wear the same icon. Anything else sharing an icon is the bug.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

// id-sets that are one product shown on more than one surface, so they may match.
const SHARED_ICONS = [
  ['stem:lumen', 'educator:lumen', 'learner:lumen-study'],
  ['stem:timelineStudio', 'learner:timeline-studio'],
  ['stem:fractionViz', 'stem:fractions'], // one plugin object registered under two ids
];

const decode = (s) => s
  .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));

const codePoints = (s) => Array.from(s).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ');

function stemIcons() {
  const dir = resolve(ROOT, 'stem_lab');
  const out = [];
  for (const f of readdirSync(dir).filter((f) => /^stem_tool_.*\.js$/.test(f))) {
    const src = readFileSync(resolve(dir, f), 'utf8');
    const re = /registerTool\(\s*'([^']+)'\s*,\s*\{/g;
    let m;
    while ((m = re.exec(src))) {
      // A tool may document its own call in a header comment; that match is not code.
      const lineStart = src.lastIndexOf('\n', m.index) + 1;
      const before = src.slice(lineStart, m.index);
      if (/(^|[^:])\/\//.test(before) || /^\s*\*/.test(before)) continue;
      let head = src.slice(m.index, m.index + 6000);
      const r = head.indexOf('render:');
      if (r > 0) head = head.slice(0, r);
      const im = head.match(/[\s{,]icon:\s*(['"])((?:\\.|(?!\1).)*)\1/);
      if (!im) continue;
      out.push({ key: 'stem:' + m[1], icon: decode(im[2]), where: 'stem_lab/' + f });
    }
  }
  return out;
}

function hubIcons(file, surface) {
  const src = readFileSync(resolve(ROOT, file), 'utf8');
  const cards = [];
  const re = /data-hub-id="([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) cards.push({ id: m[1], at: m.index });
  const out = [];
  for (let i = 0; i < cards.length; i++) {
    const end = i + 1 < cards.length ? cards[i + 1].at : src.length;
    const seg = src.slice(cards[i].at, end);
    const im = seg.match(/<span[^>]*aria-hidden="true"[^>]*>\s*(?:\{\s*'([^']*)'\s*\}|([^<{][^<]*?))\s*<\/span>/);
    if (!im) continue;
    out.push({ key: surface + ':' + cards[i].id, icon: decode(im[1] != null ? im[1] : im[2]), where: file });
  }
  return out;
}

function gateIcons() {
  const src = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const out = [];
  const re = /<CDNModuleGate[^>]*?moduleKey="[^"]+"[\s\S]{0,400}?icon="([^"]*)"[\s\S]{0,200}?displayName="([^"]*)"/g;
  let m;
  while ((m = re.exec(src))) out.push({ key: 'gate:' + m[2], icon: decode(m[1]), where: 'AlloFlowANTI.txt' });
  return out;
}

function collisions(entries) {
  const shared = SHARED_ICONS.map((g) => new Set(g));
  const by = new Map();
  for (const e of entries) {
    if (!e.icon) continue;
    if (!by.has(e.icon)) by.set(e.icon, []);
    by.get(e.icon).push(e);
  }
  const bad = [];
  for (const [icon, group] of by) {
    if (group.length < 2) continue;
    const allowed = shared.some((set) => group.every((g) => set.has(g.key)));
    if (allowed) continue;
    bad.push(`${icon} (${codePoints(icon)}) shared by: ` + group.map((g) => `${g.key} [${g.where}]`).join(', '));
  }
  return bad;
}

describe('tool icon uniqueness', () => {
  const stem = stemIcons();
  const educator = hubIcons('view_educator_hub_modal_source.jsx', 'educator');
  const learner = hubIcons('view_learning_hub_modal_source.jsx', 'learner');

  it('finds every surface (a silent zero here would make this gate always pass)', () => {
    expect(stem.length).toBeGreaterThan(120);
    expect(educator.length).toBeGreaterThan(12);
    expect(learner.length).toBeGreaterThan(12);
    expect(gateIcons().length).toBeGreaterThan(30);
  });

  it('gives every STEM Lab tool, Educator Hub card and Learner Hub card its own icon', () => {
    expect(collisions([...stem, ...educator, ...learner])).toEqual([]);
  });

  it('gives every CDN module loading splash its own icon', () => {
    expect(collisions(gateIcons())).toEqual([]);
  });

  it('keeps the desktop stem_lab mirror in step with the CDN copy', () => {
    const mirrorDir = resolve(ROOT, 'desktop/web-app/public/stem_lab');
    if (!existsSync(mirrorDir)) return; // mirror is only present in a full checkout
    const drift = [];
    for (const e of stem) {
      const file = e.where.replace(/^stem_lab\//, '');
      const p = resolve(mirrorDir, file);
      if (!existsSync(p)) { drift.push(`${e.key}: no mirror copy of ${file}`); continue; }
      const src = readFileSync(p, 'utf8');
      const id = e.key.slice('stem:'.length);
      const re = new RegExp("registerTool\\(\\s*'" + id + "'\\s*,\\s*\\{", 'g');
      let at = -1, m;
      while ((m = re.exec(src))) {
        // skip the header comment several tools use to document their own call
        const lineStart = src.lastIndexOf('\n', m.index) + 1;
        const before = src.slice(lineStart, m.index);
        if (/(^|[^:])\/\//.test(before) || /^\s*\*/.test(before)) continue;
        at = m.index;
        break;
      }
      if (at < 0) { drift.push(`${e.key}: mirror has no registerTool block`); continue; }
      let head = src.slice(at, at + 6000);
      const r = head.indexOf('render:');
      if (r > 0) head = head.slice(0, r);
      const im = head.match(/[\s{,]icon:\s*(['"])((?:\\.|(?!\1).)*)\1/);
      const mirrorIcon = im ? decode(im[2]) : null;
      if (mirrorIcon !== e.icon) drift.push(`${e.key}: CDN copy has ${e.icon} but the desktop mirror has ${mirrorIcon}`);
    }
    expect(drift).toEqual([]);
  });
});
