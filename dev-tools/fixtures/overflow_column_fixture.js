// Calibration fixture for the `overflows-tool-column` detector.
// TWO real defects, and the three patterns that must NOT be reported.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  window.StemLab.registerTool('overflowFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;

      return h('div', { style: { background: '#fff', color: '#0f172a', padding: 12 } },
        // 1. REAL DEFECT: a rigid min-width pushes past the column with nothing
        //    to scroll it and nothing to clip it. On a narrow screen this is
        //    cut off, or forces a page-wide sideways scroll.
        h('div', { style: { minWidth: '1600px', border: '1px solid #b91c1c', padding: 8 } },
          'Rigid 1600px row'),

        // 2. CORRECT PATTERN: equally wide, but inside overflow-x:auto, so the
        //    reader can scroll to the rest. Must stay silent.
        h('div', { style: { overflowX: 'auto', border: '1px solid #15803d', marginTop: 8 } },
          h('div', { style: { minWidth: '1600px', padding: 8 } }, 'Scrollable 1600px row')),

        // 3. CORRECT PATTERN, and this detector's first false positive:
        //    a DECORATIVE element deliberately bled off the corner of an
        //    `overflow: hidden` box. Its rect really does extend past the
        //    column, but the parent clips it and nothing is lost — it carries
        //    no text and is aria-hidden. This is exactly sourcebook's ring at
        //    `-right-12` inside a `relative overflow-hidden` header. Silent.
        h('div', {
          style: {
            position: 'relative', overflow: 'hidden', height: 90, marginTop: 8,
            border: '1px solid #15803d', background: '#e8efe9'
          }
        },
          h('div', {
            'aria-hidden': 'true',
            style: {
              position: 'absolute', right: -48, top: -64, width: 256, height: 256,
              borderRadius: '9999px', border: '36px solid #c8ddd4', opacity: 0.7
            }
          }),
          h('div', { style: { position: 'relative', padding: 8 } }, 'Bled decoration, clipped by the parent')),

        // 4. ★★★ REAL DEFECT, and the false NEGATIVE that the first version of
        //    the clipping rule introduced: CONTENT clipped by an
        //    `overflow: hidden` ancestor. Tool cards are routinely rounded
        //    `overflow-hidden` containers, so treating every clip as harmless
        //    blinded the detector to real overflow across a whole tool. The
        //    columns past the edge here are unreachable — worse than a
        //    scrollbar, not better. Must be REPORTED.
        h('div', {
          style: {
            overflow: 'hidden', marginTop: 8, border: '1px solid #b91c1c',
            borderRadius: 12, background: '#fff'
          }
        },
          h('table', { style: { minWidth: '1600px', borderCollapse: 'collapse', fontSize: 12 } },
            h('tbody', null,
              h('tr', null,
                h('td', { style: { padding: 4 } }, 'Stage'),
                h('td', { style: { padding: 4, width: 1400 } }, 'Joules'),
                h('td', { style: { padding: 4 } }, 'Percent of input'))))),

        // 5. FITS: nothing to report.
        h('div', { style: { border: '1px solid #334155', marginTop: 8, padding: 8 } },
          'A row that fits its column')
      );
    }
  });
})();
