// Calibration fixture for the LEFT half of `overflows-tool-column`.
//
// The detector measured only `r.right - sr.right` from the day it was written,
// so half of its own family was invisible to it. A left spill is the worse half:
// a right spill at least produces a horizontal scrollbar, while an LTR page has
// nothing to the left of its origin to scroll to — the content is simply gone.
//
// Six rows: ONE real defect, five patterns that must stay silent. If this
// fixture ever reports more than 1, the left rule has gone greedy and is about
// to flag every decorative bleed in the lab.
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/overflow_left_fixture.js
//
// must report exactly ONE overflows-tool-column finding, on the LEFT.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  window.StemLab.registerTool('overflowLeftFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      var card = {
        position: 'relative', background: '#fff', color: '#0f172a',
        padding: 16, marginBottom: 14, border: '1px solid #cbd5e1'
      };

      return h('div', { style: { background: '#fff', color: '#0f172a' } },
        // 1. REAL DEFECT: a labelled row dragged past the left edge of the
        //    column by a negative margin. Nothing clips it and nothing scrolls
        //    it, so in an LTR page the reader can never reach it.
        h('div', { style: card },
          h('div', { style: { marginLeft: -220, width: 420, background: '#fde68a', padding: 8 } },
            'Sediment core depth 0-40cm')),

        // 2. DECORATIVE BLEED: an empty ring hanging off the left edge inside a
        //    clipping card. Carries no letter or number, so it is a deliberate
        //    design bleed, not lost content. (sourcebook's ring, mirrored.)
        // (minHeight so the ring fits VERTICALLY: at 120px tall inside a 56px
        //  card it would be a genuine `clipped-text` finding, and a fixture must
        //  isolate the one rule it calibrates.)
        h('div', { style: Object.assign({}, card, { overflow: 'hidden', minHeight: 100 }) },
          h('div', { 'aria-hidden': 'true', style: {
            position: 'absolute', left: -48, top: -30, width: 120, height: 120,
            borderRadius: '50%', border: '10px solid #e2e8f0'
          } }),
          'Card with a decorative bleed'),

        // 3. SCROLLABLE: the reader can reach the overflowing part. The correct
        //    pattern, and silent regardless of which edge it spills past.
        h('div', { style: Object.assign({}, card, { overflowX: 'auto' }) },
          h('div', { style: { marginLeft: -180, width: 600, background: '#bbf7d0', padding: 8 } },
            'Scrollable ledger row')),

        // 4. PARKED OFF-CANVAS: the standard skip-link pattern. It sits far to
        //    the left until focus translates it back, so it is not a defect.
        h('a', { href: '#main', style: {
          position: 'absolute', left: 8, top: 8, transform: 'translateX(-400%)',
          background: '#1e293b', color: '#fff', padding: '6px 10px'
        } }, 'Skip to the lab'),

        // 5. PARKED BY DISTANCE: the other standard skip-link pattern, `left:
        //    -9999px` with no transform. The first 640px lab board reported three
        //    of these as "9999px past the left edge". Nothing overflows by more
        //    than the column is wide while sitting entirely outside it.
        h('a', { href: '#main', style: {
          position: 'absolute', left: -9999, top: 8,
          background: '#1e293b', color: '#fff', padding: '6px 10px'
        } }, 'Skip parked far left'),

        // 6. FITS: the same row, inside the column. Nothing to report.
        h('div', { style: card },
          h('div', { style: { width: 300, background: '#e0f2fe', padding: 8 } },
            'Sediment core depth 40-80cm'))
      );
    }
  });
})();
