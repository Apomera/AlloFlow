// Calibration fixture for `dark-ink-on-contrast-surface` with the host's
// contrast rules injected (the default under --contrast since 2026-09-05).
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/contrast_ink_fixture.js --contrast
//     must report exactly ONE finding: the !important-pinned paragraph.
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/contrast_ink_fixture.js --contrast --no-host-css
//     must report FOUR (the three the host rescues in production, plus the pin).
//
// The host's broad ink rule recolours p/span/div/li/label/h1-h6/summary/legend
// and friends to the theme ink; a tool that pins its ink with !important (or
// an inline style the cascade cannot beat) defeats it and is the real defect.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  window.StemLab.registerTool('contrastInkFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      return h('div', { 'data-contrast-ink-fixture': 'true', style: { padding: 12 } },
        h('style', null, '[data-contrast-ink-fixture] .pinned { color: #0f172a !important; }'),
        // Rescued by the host in production (p is in the broad rule).
        h('p', { className: 'text-slate-900' }, 'Paragraph with a dark utility class'),
        // Rescued since 2026-09-05 (summary joined the broad rule).
        h('details', null, h('summary', { className: 'text-slate-900' }, 'Summary with a dark utility class'), h('p', null, 'body')),
        // Rescued (headings were already in the broad rule).
        h('h2', { className: 'text-slate-900' }, 'Heading with a dark utility class'),
        // REAL DEFECT: an !important pin the host cannot override.
        h('p', { className: 'pinned' }, 'Paragraph pinned dark with !important')
      );
    }
  });
})();
