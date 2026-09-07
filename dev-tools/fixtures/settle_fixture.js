// Calibration fixture for the "measured mid-animation" caveat.
//
// settle() waits for running CSS animations before measuring, capped so that an
// infinite animation cannot hang the sweep. When that cap expires the reading is
// a FRAME, not a settled layout — and the gate has to say so, because a rect
// captured mid-animation is exactly how archstudio's onboarding panel appeared
// to hang 56px out of its column when it was really centred.
//
// The real tools that trip this (solarsystem, beehive) do it NONDETERMINISTICALLY
// — they warned on one run and not the next — so they cannot serve as the guard.
// This fixture animates for 3s, which reliably outlasts the 1200ms default:
//
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/settle_fixture.js
//     -> 0 findings, AND the "measured while an animation was still running
//        (1200ms cap)" caveat
//   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/settle_fixture.js --settle-cap=5000
//     -> 0 findings, NO caveat (the animation finishes inside the cap)
//
// If the first command stops printing the caveat, mid-animation readings have
// gone silent again and every "clean" board is only as good as its timing.
(function () {
  window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.registerTool = window.StemLab.registerTool || function (id, def) {
    window.StemLab._registry[id] = def;
  };

  window.StemLab.registerTool('settleFixture', {
    render: function (ctx) {
      var h = ctx.React.createElement;
      return h('div', { style: { background: '#ffffff', color: '#0f172a', padding: 12 } },
        // 3s, finite (one iteration), so settle() waits on it rather than
        // skipping it the way it skips iterations:Infinity.
        h('style', null,
          '@keyframes settle-fixture-drift{from{transform:translateX(0)}to{transform:translateX(24px)}}' +
          '.settle-fixture-box{animation:settle-fixture-drift 3s linear 1;}'),
        // ★ width: 240, and it matters. Full-width, this box's 24px drift ended
        // 12px PAST the column edge; the sample lands ~1.65s into the 3s drift
        // (~13px, ~1px over, under the 2px slack) and under load a later frame
        // crossed it - one run in twenty reported an overflows-tool-column
        // finding, and three unchanged re-runs read 0. A fixture that sits at a
        // detector's threshold is a coin, not a calibration.
        h('div', { className: 'settle-fixture-box',
          style: { width: 240, padding: 8, border: '1px solid #334155', borderRadius: 8, color: '#0f172a' } },
          'This box drifts for three seconds after mount.'),
        h('p', { style: { fontSize: 12, color: '#0f172a', marginTop: 8 } },
          'Everything here is high-contrast and inside its column: the fixture measures the ' +
          'settle caveat, so it must never contribute a finding of its own.')
      );
    }
  });
})();
