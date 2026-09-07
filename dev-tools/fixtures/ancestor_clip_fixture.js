// Calibration fixture for `clipped-text` cut by an ANCESTOR.
//
// The detector judged only an element whose own overflow:hidden clips its own
// text. Five cards, ONE real defect:
//
//   1. fixed-height overflow-hidden card, paragraph runs past its bottom   REPORT
//   2. same card, but overflow-y:auto                                      silent (scrollable)
//   3. same card, line-clamp-3                                             silent (announced)
//   4. overflow-hidden card tall enough for its paragraph                  silent (fits)
//   5. overflow-hidden card collapsed to 0 height (a closed panel)         silent (not prose)
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/ancestor_clip_fixture.js
//
// must report exactly ONE clipped-text finding (the original own-box fixture
// still reports its one as well; they are separate files on purpose).
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };
  var PROSE = 'Sedimentary rock forms when layers of sand, silt and the remains of living things settle in water and are pressed together over a very long time, one layer on top of the next, until the weight of what lies above turns loose grains into stone.';
  window.StemLab.registerTool('ancestorClipFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      var card = { width: 260, border: '1px solid #cbd5e1', padding: 8, marginBottom: 12, background: '#fff', color: '#0f172a', fontSize: 14 };
      return h('div', { style: { padding: 20 } },
        h('div', { style: Object.assign({}, card, { height: 60, overflow: 'hidden' }) }, h('p', null, PROSE)),
        h('div', { style: Object.assign({}, card, { height: 60, overflowY: 'auto' }) }, h('p', null, PROSE)),
        h('div', { style: Object.assign({}, card, { height: 60, overflow: 'hidden' }) },
          h('p', { style: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' } }, PROSE)),
        h('div', { style: Object.assign({}, card, { overflow: 'hidden' }) }, h('p', null, PROSE)),
        h('div', { style: Object.assign({}, card, { height: 0, padding: 0, border: 0, overflow: 'hidden' }) }, h('p', null, PROSE))
      );
    }
  });
})();
