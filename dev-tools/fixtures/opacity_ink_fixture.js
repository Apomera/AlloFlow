// Calibration fixture for opacity in the ink (light-ink-on-host-card).
//
// Until 2026-09-06 the contrast detector read `color` at full strength and never
// looked at `opacity`, so a dark label under `opacity: .3` scored ~10:1 while the
// painted pixel is ~2:1. Four labels on the host's white card, ONE real defect:
//
//   1. slate-700 at opacity .28  -> paints ~rgb(199,203,208), 1.6:1   REPORT
//   2. slate-700 at opacity .7   -> paints ~rgb(112,120,132), 4.4:1   silent
//   3. slate-700, disabled, at opacity .28                             silent (WCAG exempts inactive controls)
//   4. slate-700 full strength                                         silent
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/opacity_ink_fixture.js
//
// must report exactly ONE light-ink-on-host-card finding, and its detail must
// name the opacity it composited.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };
  window.StemLab.registerTool('opacityInkFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      var ink = '#334155';
      return h('div', { style: { padding: 20, fontSize: 14, fontWeight: 700 } },
        h('div', { style: { opacity: 0.28 } }, h('p', { style: { color: ink } }, 'Muted past legibility')),
        h('div', { style: { opacity: 0.7 } }, h('p', { style: { color: ink } }, 'Muted but readable')),
        h('button', { disabled: true, style: { opacity: 0.28, color: ink, background: 'transparent', border: 0, fontWeight: 700 } }, 'Inactive control'),
        h('p', { style: { color: ink } }, 'Full strength')
      );
    }
  });
})();
