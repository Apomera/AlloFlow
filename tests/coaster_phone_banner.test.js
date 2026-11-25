// Coaster Lab 2026-11-23 round 3: on phones the short-lived banner sat at top:14px,
// under the view-button row (top:8px) and, in station view, under the Station
// Explorer (top:70px). The phone CSS now anchors it just above the instruments.
// COASTER_BANNER_SRC points at another copy (fail-first check against start_r3.js).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILE = process.env.COASTER_BANNER_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

// Every "@media (max-width:760px){...}" body, braces balanced.
function phoneBlocks(src) {
  const out = [];
  const re = /@media\s*\(max-width:\s*760px\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = m.index + m[0].length;
    const start = i;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    out.push(src.slice(start, i - 1));
  }
  return out;
}

function rulesFor(css, needle) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (sel.includes(needle)) rules.push({ sel, body: m[2] });
  }
  return rules;
}

describe('Coaster Lab phone banner placement', () => {
  const phone = phoneBlocks(SRC).join('\n');

  it('the phone view buttons and station explorer still own the top of the stage', () => {
    expect(rulesFor(phone, '#clab-viewTools').some(r => /top:8px/.test(r.body))).toBe(true);
    expect(rulesFor(phone, '#clab-stationViews').some(r => /top:70px/.test(r.body))).toBe(true);
  });

  it('on phones the banner is anchored above the instruments, not at the top, in every view', () => {
    const banner = rulesFor(phone, '#clab-banner').filter(r => !r.sel.includes(':has('));
    expect(banner.length).toBeGreaterThan(0);
    const rule = banner.find(r => /bottom:var\(--clab-view-bottom/.test(r.body));
    expect(rule, 'a phone #clab-banner rule bottom-anchored on --clab-view-bottom').toBeTruthy();
    expect(rule.body).toMatch(/top:auto/);
    // station view keeps a higher-specificity desktop rule (top:146px); the phone rule must override it too
    expect(rule.sel).toContain('[data-station-shot] #clab-banner');
    // full stage width so long messages stay short and never collide with the coach chip
    expect(rule.body).toMatch(/left:8px/);
    expect(rule.body).toMatch(/right:8px/);
    expect(rule.body).toMatch(/transform:none/);
  });

  it('with a ride question, ride summary or guide open, the phone banner drops onto the instrument strip', () => {
    const open = rulesFor(phone, '#clab-banner').find(r => r.sel.includes(':has(') && r.sel.includes('#clab-rideEnd'));
    expect(open).toBeTruthy();
    expect(open.sel).toContain('#clab-rideQ');
    expect(open.sel).toContain('#clab-guide');
    expect(open.body).toMatch(/bottom:8px/);
  });

  it('desktop placement and the spoken status are unchanged', () => {
    expect(SRC).toMatch(/\.clab-root #clab-banner\{position:absolute;top:14px;left:50%;transform:translateX\(-50%\)/);
    expect(SRC).toContain('.clab-root [data-station-shot] #clab-banner{top:146px}');
    expect(SRC).toContain('id=\\"clab-banner\\" role=\\"status\\" aria-live=\\"polite\\" aria-atomic=\\"true\\"');
    expect(SRC).toContain("bannerEl.setAttribute('aria-live', usesBridgeAnnouncer ? 'off' : 'polite')");
  });
});
