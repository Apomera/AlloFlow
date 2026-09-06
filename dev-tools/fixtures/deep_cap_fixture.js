// Calibration fixture for the DEEP COVERAGE report.
//
// Every detector here has a fixture proving it can fail on demand; the coverage
// note needs one too, because it is what stands between a partly-probed sweep
// and a board that reads as clean. `DEEP_CAP` is `ALL ? 12 : 30`, so a lab-wide
// sweep sees less than half the depth of a single-file run — magnetism's two
// real findings sat past its twelfth view and were absent from all three sweep
// axes while reporting reliably on their own.
//
// This tool exposes 15 top-level views and nothing else. It must produce ZERO
// findings in every run, and:
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/deep_cap_fixture.js --deep --deep-cap=12
//     -> "12 of 15 matched controls (re-run with --deep-cap=15)"
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/deep_cap_fixture.js --deep --deep-cap=15
//     -> no coverage line at all
// If the first command stops printing a coverage line, the sweep has gone
// silently partial again and every green board is suspect.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  var VIEWS = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
    'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett',
    'Kilo', 'Lima', 'Mike', 'November', 'Oscar'
  ];

  window.StemLab.registerTool('deepCapFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      var active = (ctx.toolData && ctx.toolData.view) || VIEWS[0];

      return h('div', { style: { background: '#ffffff', color: '#0f172a', padding: 12 } },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
          VIEWS.map(function (name) {
            return h('button', {
              key: name,
              'data-view': name,
              'aria-pressed': active === name ? 'true' : 'false',
              onClick: function () { ctx.update('view', name); },
              style: {
                padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                // Deliberately high-contrast: this fixture measures COVERAGE,
                // so it must never contribute a finding of its own.
                border: '1px solid #334155',
                background: active === name ? '#0f172a' : '#ffffff',
                color: active === name ? '#ffffff' : '#0f172a'
              }
            }, name);
          })),
        h('p', { style: { fontSize: 13, color: '#0f172a', margin: 0 } },
          'Showing view ' + active + ' of ' + VIEWS.length + '.')
      );
    }
  });
})();
