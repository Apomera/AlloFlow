// Calibration fixture for `svg-text-outside-viewbox`.
//
// The detector compares getBoundingClientRect() against the <svg>'s own rect,
// but a rect around TEXT is the em box: it includes the font's internal leading,
// which is empty. For a label rotated -90 the em box's extra height becomes
// horizontal, so a rotated y-axis title can report a 1-3px "clip" that contains
// no ink at all. magnetism's "y position" measured 17px wide at an 11px font and
// overhung its canvas by 2.6px — entirely above the tallest glyph.
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/svg_text_fixture.js
//     must report exactly ONE finding: the label that is genuinely cut.
//
// Getting this wrong in either direction is expensive: report the leading and
// every chart in the lab grows phantom findings; widen the slack by guesswork
// and a real clipped axis title goes unreported. Measure the ink instead.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  window.StemLab.registerTool('svgTextFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;

      return h('div', { style: { background: '#ffffff', color: '#0f172a', padding: 12 } },
        h('svg', {
          width: 320, height: 140, viewBox: '0 0 320 140',
          style: { overflow: 'hidden', border: '1px solid #334155', display: 'block' }
        },
          // 1. CORRECT: a rotated axis title whose EM box overhangs the left
          //    edge by a couple of px while its ink sits comfortably inside.
          //    This is magnetism's case. Must stay silent.
          h('text', {
            x: 7, y: 70, fill: '#0f172a', fontSize: 11, textAnchor: 'middle',
            transform: 'rotate(-90 7 70)'
          }, 'y position'),

          // 2. CORRECT: ordinary horizontal label well inside the canvas.
          h('text', { x: 60, y: 24, fill: '#0f172a', fontSize: 12 }, 'Inside the canvas'),

          // 3. REAL DEFECT: a label whose INK is genuinely cut by the right
          //    edge — it starts at x=250 and runs far past 320.
          h('text', { x: 250, y: 120, fill: '#0f172a', fontSize: 13 },
            'This label is genuinely cut off by the canvas edge')
        )
      );
    }
  });
})();
