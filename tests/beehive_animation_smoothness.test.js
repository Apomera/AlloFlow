// Frame-rate aliasing guard for the Beehive diagram views.
//
// All 18 canvas views share one requestAnimationFrame loop that advances `t2` by roughly 1.0 per
// frame (dt-normalised, clamped 0.25-2.5). So `Math.sin(t2 * k)` advances k RADIANS PER FRAME:
//
//     frequency      = k * 60 / (2*pi) Hz
//     samples/cycle  = 2*pi / k
//
// Below ~6 samples per cycle an oscillation stops reading as motion and starts reading as random
// jumping, and because the real frame delta varies, the jumps are irregular - a stutter. The
// thermoregulation view was reported as stuttering on 2026-07-29 and measured worst in the tool:
// its fanning-bee wings ran at k=1.5, i.e. 14.3 Hz at 4.2 samples per cycle.
//
// The underlying trap is that the REAL numbers are all unrenderable: a honeybee wingbeat is
// ~230 Hz and a waggle is ~13 Hz. Coding the true frequency produces garbage at 60 fps. Wings
// therefore became a static motion smear (which is what a person actually sees), and the waggle
// was slowed to a legible rate because it is the behaviour being taught.
//
// This test does not care which choice a future author makes. It cares that nobody reintroduces a
// coefficient the frame rate cannot represent.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_beehive.js'), 'utf8');
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_beehive.js';

// 0.55 rad/frame = 11.4 samples/cycle. Comfortably smooth, and loose enough not to fight a
// designer who wants a brisk shimmer.
const MAX_RAD_PER_FRAME = 0.55;

// Flame, lantern and candle FLICKER is exempt on purpose. Those terms modulate brightness, and a
// flame is meant to look irregular - aliasing is the intended effect there, not a defect. The
// guard is about POSITIONAL motion (wings, wag, drift), where irregularity reads as broken.
// Recognised by shape: a flicker term is a small deviation added to 1 (`1 + Math.sin(...) * 0.2`)
// and its variable is named *Flick*.
const FLICKER = /Flick|1 \+ Math\.sin/;

function phaseRates(text) {
  return text.split('\n').flatMap((line, i) => {
    if (line.trim().startsWith('//')) return [];   // comments quote the old code on purpose
    if (FLICKER.test(line)) return [];
    return [...line.matchAll(/Math\.(?:sin|cos)\s*\(\s*t2\s*\*\s*([\d.]+)/g)].map((m) => ({
      line: i + 1,
      k: parseFloat(m[1]),
      src: line.trim().slice(0, 110),
    }));
  });
}

describe('beehive canvas animation smoothness', () => {
  const rates = phaseRates(SRC);

  it('finds t2-driven oscillations to check (guards against the regex silently matching nothing)', () => {
    expect(rates.length).toBeGreaterThan(8);
  });

  it('has no oscillation the frame rate cannot represent', () => {
    const bad = rates.filter((r) => r.k > MAX_RAD_PER_FRAME).map(
      (r) => 'L' + r.line + '  k=' + r.k + ' (' + (r.k * 60 / (2 * Math.PI)).toFixed(1) + ' Hz, '
        + (2 * Math.PI / r.k).toFixed(1) + ' samples/cycle)  ' + r.src
    );
    expect(bad, 'aliased oscillation(s):\n  ' + bad.join('\n  ')).toEqual([]);
  });

  it('keeps the fanning-bee wings a smear rather than a fast oscillation', () => {
    // The specific regression: a +/-5px positional swing on the wing ovals.
    expect(SRC).not.toMatch(/var wBlur\s*=\s*Math\.sin\(t2 \* 1\.5/);
    expect(SRC).toMatch(/wShimmer/);
  });

  it('keeps the waggle dance legible without changing the taught tempo', () => {
    // The distance encoding is the straight-run duration (dnPhase), standardised at ~1 km/sec to
    // agree with the field guide and the worked math problems. It must survive any wag retiming.
    expect(SRC).toMatch(/dnPhase/);
    const wag = SRC.match(/dancerWag = inStraightRun \? Math\.sin\(t2 \* ([\d.]+)\)/);
    expect(wag, 'dancerWag site not found').toBeTruthy();
    expect(parseFloat(wag[1])).toBeLessThanOrEqual(MAX_RAD_PER_FRAME);
  });

  it('does not paint the simulator HUD over a teaching diagram', () => {
    // The 18 diagrams share the canvas with the beekeeper sim. The HUD (Season/Day, Colony%) is
    // game chrome; over a figure it is clutter, and it collided with the diagram's own title chip
    // at left:12px/top:12px.
    expect(SRC).toMatch(/beeView === 'scene' && h\('div', \{ 'data-beehive-scene-hud'/);
  });

  // Layout: chrome should cost corners, not edges. Before 2026-07-29 the scene carried a wrapping
  // HUD (up to 58% wide) top-left, a full-width action bar across the bottom, and display controls
  // top-right - three corners plus an entire edge, over a canvas whose whole job is to be looked
  // at. These pin the shape without dictating styling.
  describe('canvas chrome footprint', () => {
    it('has no full-width bar pinned across the bottom of the canvas', () => {
      // `inset-x-3 bottom-3` spans the canvas width. That is the pattern that ate the bottom edge.
      expect(SRC).not.toMatch(/data-beehive-scene-actions': 'true', className: '[^']*inset-x-\d+ bottom-/);
    });

    it('keeps the scene HUD to a single non-wrapping pill', () => {
      const hud = SRC.match(/'data-beehive-scene-hud': 'true', className: '([^']*)'/);
      expect(hud, 'scene HUD not found').toBeTruthy();
      expect(hud[1]).not.toContain('flex-wrap');
      expect(hud[1]).toContain('whitespace-nowrap');
      // And it must not be allowed to claim most of the width.
      const cap = hud[1].match(/max-w-\[(\d+)%\]/);
      expect(cap, 'HUD has no max-width cap').toBeTruthy();
      expect(Number(cap[1])).toBeLessThanOrEqual(52);
    });

    it('keeps the information the HUD is responsible for', () => {
      // Compaction must come from layout, not from dropping content. Each of these was removed
      // during the 2026-07-29 pass and had to be restored: the stage chip is the canvas identity
      // marker, and the paused text is the only paused state a screen reader can reach here
      // (the big MOTION PAUSED overlay is aria-hidden).
      const hudBlock = SRC.slice(SRC.indexOf("'data-beehive-scene-hud'"), SRC.indexOf("beeView !== 'scene' && h('div', { 'data-beehive-stage-chip'"));
      expect(hudBlock).toContain("'data-beehive-stage-chip': 'beekeeper'");
      expect(hudBlock).toContain('Motion paused');
      expect(hudBlock).toContain('Colony ');
    });

    it('gives every icon-only scene action an accessible name', () => {
      // The visible captions were dropped when the actions became icon buttons. aria-label and
      // title are what is left, so their absence would make the controls unusable rather than
      // merely terse.
      const actions = SRC.slice(SRC.indexOf("'data-beehive-scene-actions': 'true'"));
      const btn = actions.slice(0, actions.indexOf('})),'));
      expect(btn).toMatch(/'aria-label': hotspot\.label/);
      expect(btn).toMatch(/title: hotspot\.label/);
      // And they must stay a real touch target.
      expect(btn).toMatch(/min-h-\[44px\]/);
      expect(btn).toMatch(/min-w-\[44px\]/);
    });
  });

  it('stays byte-identical to the CDN mirror', () => {
    // stem_lab/ is CDN-live and desktop/web-app/public/stem_lab/ is desktop-live. A fix in one
    // copy only is a fix half the users get.
    expect(readFileSync(resolve(process.cwd(), MIRROR), 'utf8')).toBe(SRC);
  });
});
