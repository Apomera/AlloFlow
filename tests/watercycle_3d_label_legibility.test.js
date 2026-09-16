import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

// Every 3D process label is drawn on the SAME 512x128 canvas and then shown as
// a sprite, so on-screen text size is proportional to SPRITE WIDTH. A label
// narrowed to 1.45 renders its text at 52% of a standard 2.8-wide label's.
//
// Fifteen labels had been narrowed over successive passes to stop banners
// overlapping, and every one silently shrank its own text. The worst were in
// the Storm Lab, where the densest science labels came out smallest:
//
//   Lower - graupel        1.45 -> 52%
//   Upper + ice crystals   1.55 -> 55%
//   Thunder pressure wave  1.65 -> 59%
//
// The fix is wcSetLabelWidth3d: it sets the scale AND redraws the text at a
// font raised in inverse proportion, capped so a very narrow sprite cannot
// overflow its plate. Sprite widths are load-bearing (they are what stops the
// banners overlapping), so the font moves, not the width.
//
// These tests pin the MECHANISM and the resulting on-screen size, computed from
// the shipped numbers -- not a list of magic font values.

const PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

const BASE_FONT_PX = 31;
const BASE_SCALE_X = 2.8;
const LIMIT_PX = 476;
// Mean advance for 600-weight system-ui; the shipped helper also measures for real.
const MEAN_ADVANCE_EM = 0.54;

function labelRegion(source) {
  return sliceBetween(
    source,
    'function wcDrawLabelText3d(',
    'function updateSnowStorageLabel3d(',
    { label: '3D process label construction' },
  );
}

/** Every `wcSetLabelWidth3d(fooLabel3d, x, y)` call in the region. */
function parseWidthCalls(region) {
  const calls = [];
  const pattern = /wcSetLabelWidth3d\((\w+Label3d), ([\d.]+), ([\d.]+)\)/g;
  let match = pattern.exec(region);
  while (match !== null) {
    calls.push({ name: match[1], scaleX: Number(match[2]) });
    match = pattern.exec(region);
  }
  return calls;
}

/**
 * The text each label variable was constructed with.
 *
 * Decode \uXXXX escapes. The source spells 'Lower − graupel' -- 20 source
 * characters for a 16-character string -- so measuring the raw source
 * overcounts its width by a quarter, picks a font that is too small, and then
 * reports the label as undersized. The renderer sees the decoded string, so
 * this check has to as well.
 */
function parseLabelTexts(region) {
  const texts = Object.create(null);
  const pattern = /var (\w+Label3d) = makeProcessLabel3d\(\s*(?:\/\/[^\n]*\n\s*)*'[^']+',\s*'([^']+)'/g;
  let match = pattern.exec(region);
  while (match !== null) {
    texts[match[1]] = match[2].replace(
      /\\u([0-9a-fA-F]{4})/g,
      (whole, hex) => String.fromCharCode(parseInt(hex, 16)),
    );
    match = pattern.exec(region);
  }
  return texts;
}

/**
 * Builds a runnable copy of the SHIPPED wcSetLabelWidth3d.
 *
 * ★ This must exercise the tool's own arithmetic, not a restatement of it. An
 * earlier draft recomputed the font here in JS and asserted on that; deleting
 * the inverse-proportion line from the tool left every test green, because the
 * test was only ever checking itself. See the mutation note at the bottom.
 */
function shippedFontChooser(source) {
  const helper = sliceBetween(
    source,
    'function wcSetLabelWidth3d(',
    '\n            function makeProcessLabel3d(',
    { label: 'wcSetLabelWidth3d' },
  );
  const factory = new Function(
    'WC_LABEL_BASE_FONT_PX_3D',
    'WC_LABEL_BASE_SCALE_X_3D',
    'WC_LABEL_LIMIT_PX_3D',
    'wcDrawLabelText3d',
    `${helper}; return wcSetLabelWidth3d;`,
  );

  return function chooseFont(scaleX, text) {
    let drawnWith = null;
    const setWidth = factory(
      BASE_FONT_PX,
      BASE_SCALE_X,
      LIMIT_PX,
      (context, labelText, fontPx) => { drawnWith = fontPx; },
    );
    // A stub sprite carrying just what the helper touches. measureText stands
    // in for the canvas one; a real browser measures slightly differently, so
    // the mean-advance estimate is the same approximation the helper uses.
    const sprite = {
      scale: { set() {} },
      _wcLabelText: text,
      _wcLabelTexture: { needsUpdate: false },
      _wcLabelContext: {
        font: '',
        measureText: (value) => {
          const size = Number(/(\d+)px/.exec(sprite._wcLabelContext.font)?.[1] || BASE_FONT_PX);
          return { width: value.length * MEAN_ADVANCE_EM * size };
        },
      },
    };
    setWidth(sprite, scaleX, scaleX * 0.25);
    return drawnWith;
  };
}

describe('water cycle 3D process labels stay legible', () => {
  PATHS.forEach((filePath) => {
    describe(filePath, () => {
      const source = readFileSync(filePath, 'utf8');
      const region = labelRegion(source);
      const compensatedFont = shippedFontChooser(source);

      it('declares the standard geometry as named constants', () => {
        expect(source).toContain(`var WC_LABEL_BASE_FONT_PX_3D = ${BASE_FONT_PX};`);
        expect(source).toContain(`var WC_LABEL_BASE_SCALE_X_3D = ${BASE_SCALE_X};`);
        expect(source).toContain(`var WC_LABEL_LIMIT_PX_3D = ${LIMIT_PX};`);
        // The standard sprite must USE the constant, or the two can drift apart.
        expect(region).toContain('labelSprite3d.scale.set(WC_LABEL_BASE_SCALE_X_3D,');
      });

      it('routes every label resize through the compensating helper', () => {
        // A direct `.scale.set` on a label sprite bypasses the font
        // compensation and silently shrinks that label's text again.
        // snowStorageLabel3d is excluded on purpose: it is not a
        // makeProcessLabel3d product (own 512x160 canvas, own two-line redraw),
        // so it owns its scale. Anything ELSE resizing directly would bypass the
        // font compensation and silently shrink its own text again.
        const direct = (region.match(/(\w+)Label3d\.scale\.set\(/g) || [])
          .filter((hit) => !hit.startsWith('snowStorage'));
        expect(direct, 'label sprites must resize via wcSetLabelWidth3d').toEqual([]);

        const calls = parseWidthCalls(region);
        // A parser that matched nothing would make the rest of this vacuous.
        expect(calls.length).toBeGreaterThanOrEqual(14);
      });

      it('holds on-screen text size near the standard for every narrowed label', () => {
        const calls = parseWidthCalls(region);
        const texts = parseLabelTexts(region);
        const undersized = [];

        calls.forEach(({ name, scaleX }) => {
          const text = texts[name];
          expect(text, `${name} should be built by makeProcessLabel3d`).toBeTruthy();

          const fontPx = compensatedFont(scaleX, text);
          const effective = fontPx * (scaleX / BASE_SCALE_X);
          const ratio = effective / BASE_FONT_PX;

          // Nothing may render below 75% of the standard label's text size.
          // Before the fix seven labels sat between 52% and 73%.
          if (ratio < 0.75) undersized.push(`${name} ${(ratio * 100).toFixed(0)}%`);
          // And nothing may render oversized either.
          expect(ratio, `${name} renders too large`).toBeLessThan(1.1);
        });

        expect(undersized, `labels below 75% of standard text size`).toEqual([]);
      });

      it('never lets a compensated font overflow the label plate', () => {
        const calls = parseWidthCalls(region);
        const texts = parseLabelTexts(region);
        calls.forEach(({ name, scaleX }) => {
          const text = texts[name];
          const fontPx = compensatedFont(scaleX, text);
          const estimated = text.length * MEAN_ADVANCE_EM * fontPx;
          expect(
            estimated,
            `"${text}" at ${fontPx}px needs ~${Math.round(estimated)}px of ${LIMIT_PX}`,
          ).toBeLessThanOrEqual(LIMIT_PX);
        });
      });

      it('measures the real text before trusting the estimate', () => {
        // The character-count estimate picks the font; measureText is what
        // proves it fits, because a wide string can bust the estimate.
        expect(region).toContain('measureText(labelSprite._wcLabelText)');
        expect(region).toContain('WC_LABEL_LIMIT_PX_3D');
        // A redraw is pointless unless the texture is re-uploaded.
        expect(region).toContain('needsUpdate = true');
      });

      it('redraws text without destroying the plate or its accent border', () => {
        // The border is stroked once at construction. If the redraw cleared the
        // whole canvas the accent ring would vanish on every narrowed label.
        expect(region).toContain('labelContext.clearRect(14, 18, 484, 92)');
        expect(region).not.toContain('labelContext.clearRect(0, 0, 512, 128)');
      });
    });
  });
});
