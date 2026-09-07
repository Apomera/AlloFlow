// Calibration fixture for `collapsed-percent-height` read from the CLASS LIST.
//
// The detector read only the inline `style.height`, so Tailwind's `h-full`
// (364 uses in the lab) was invisible to it. Four boxes, ONE real defect:
//
//   1. h-full child of an AUTO-height block parent    -> collapses to 0   REPORT
//   2. h-full child of a fixed-height (h-40) parent   -> fills it         silent
//   3. h-full child of a flex parent                  -> stretched        silent
//   4. inline `height: 50%` in an auto parent         -> the ORIGINAL case, still reported
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/pct_height_class_fixture.js
//
// must report exactly TWO collapsed-percent-height findings (1 and 4).
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };
  window.StemLab.registerTool('pctHeightClassFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      var bar = { background: '#0ea5e9', width: 120 };
      return h('div', { style: { padding: 20 } },
        h('div', { style: { marginBottom: 12 } },
          h('p', null, 'Auto-height parent'),
          h('div', { className: 'h-full', style: bar })),
        h('div', { className: 'h-40', style: { marginBottom: 12, border: '1px solid #ccc' } },
          h('div', { className: 'h-full', style: bar })),
        h('div', { className: 'flex', style: { marginBottom: 12, minHeight: 40 } },
          h('div', { className: 'h-full', style: bar })),
        h('div', { style: { marginBottom: 12 } },
          h('p', null, 'Auto-height parent, inline %'),
          h('div', { style: Object.assign({ height: '50%' }, bar) }))
      );
    }
  });
})();
