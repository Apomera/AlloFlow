// Calibration fixture for the `clipped-text` detector.
// Four boxes: ONE real defect, three affordances that must NOT be reported.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  window.StemLab.registerTool('clipFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      var box = { width: 90, height: 18, whiteSpace: 'nowrap', border: '1px solid #333' };

      return h('div', { style: { background: '#fff', color: '#0f172a', padding: 20 } },
        // 1. REAL DEFECT: cut off, no ellipsis, no scrollbar.
        h('div', { style: Object.assign({}, box, { overflow: 'hidden' }) },
          'Sedimentary layering rate'),

        // 2. AFFORDANCE: ellipsis announces the cut.
        h('div', { style: Object.assign({}, box, { overflow: 'hidden', textOverflow: 'ellipsis' }) },
          'Sedimentary layering rate'),

        // 3. AFFORDANCE: the reader can scroll to the rest.
        h('div', { style: Object.assign({}, box, { overflow: 'auto' }) },
          'Sedimentary layering rate'),

        // 4. NOT CLIPPED: the box fits its text.
        h('div', { style: { width: 400, overflow: 'hidden', border: '1px solid #333' } },
          'Sedimentary layering rate')
      );
    }
  });
})();
