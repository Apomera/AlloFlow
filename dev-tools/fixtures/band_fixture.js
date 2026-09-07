// Calibration fixture for --widths: a defect that lives in a BAND.
//
// This reproduces the shape of the coding-lab header bug (2026-09-06), which
// was invisible at BOTH widths the gate habitually sweeps. The toolbar row is
// `flex-wrap: nowrap` with non-shrinking children totalling ~1176px, and the
// wrap rule is scoped to `@media (max-width: 960px)`:
//
//     768px  -> the media query wraps the row          CLEAN
//    1024px  -> nowrap, and 1176px > 1024px            SIX CONTROLS PUSHED OFF
//    1280px  -> nowrap, but 1176px fits                CLEAN
//
// So a sweep at 768 says clean, a sweep at 1280 says clean, and the tool is
// broken for every Chromebook in between. `--widths=768,1024,1280` must report
// it and must name 768 and 1280 as the widths where the same view was clean —
// that gap is what tells a reader the defect is banded rather than absent.
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/band_fixture.js --widths=768,1024,1280
//
// `flex-shrink: 0` is not decoration: with the default shrink the controls
// would compress instead of overflowing, and there would be no defect to find.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  var CSS = [
    '.band-row { display: flex; flex-wrap: nowrap; gap: 8px; align-items: center; }',
    '.band-row > .band-chip { flex: 0 0 140px; width: 140px; height: 30px; ' +
      'line-height: 30px; text-align: center; background: #e2e8f0; color: #0f172a; ' +
      'border-radius: 6px; font-size: 12px; }',
    '@media (max-width: 960px) { .band-row { flex-wrap: wrap; } }'
  ].join('');

  var LABELS = ['Pick', 'Music', 'Palette', 'Grid', 'Ruler', 'Export', 'Share', 'Help'];

  window.StemLab.registerTool('bandFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      return h('div', { style: { background: '#fff', color: '#0f172a', padding: 20 } },
        h('style', null, CSS),
        h('div', { className: 'band-row' },
          LABELS.map(function (label, i) {
            return h('div', { key: i, className: 'band-chip' }, label);
          })
        ),
        // A control row that DOES wrap, at every width. It must stay silent in
        // all three columns, so a band report cannot be read as "the fixture
        // overflows at 1024" when it is really "this one row overflows".
        h('div', { className: 'band-row', style: { flexWrap: 'wrap', marginTop: 12 } },
          LABELS.map(function (label, i) {
            return h('div', { key: i, className: 'band-chip' }, 'ok ' + label);
          })
        )
      );
    }
  });
})();
