// Find provably-unreadable Tailwind class pairings, without a browser.
//
//   node dev-tools/scan_contrast_pairs.cjs [--verbose]
//   npm run verify:contrast-pairs
//
// RENAMED 2026-08-17 from static_contrast_pairs.cjs. The old name did not match
// the `check_*|scan_*` convention that tests/dev_tools_orphan_gates.test.js
// audits, so this scanner was invisible to the very check built to find gates
// nobody runs — it had zero callers in deploy.sh, package.json, tests/ and CI.
//
// WHY STATIC. The live axe sweep is at the mercy of the Tailwind CDN's
// on-demand compilation: the same tool measured four times gave light-theme
// counts of 5, 9, 11 and 11. Anything built on a single reading of that is
// noise. This reads source instead, so the same input always gives the same
// answer, and it can only report things that are true by construction.
//
// WHAT IT LOOKS AT. Only single STRING LITERALS that contain both a background
// and a text utility — e.g. 'bg-slate-100 text-slate-200'. That matters: a
// className built from a ternary has branches whose bg and text never actually
// co-occur, so scanning the whole expression invents pairings that never
// render. A literal is a pairing the author really did ship together.
//
// WHAT IT FLAGS. Same-family pairs whose shade numbers are close. Tailwind's
// shades are monotonic in lightness within a family, so bg-slate-100 with
// text-slate-200 is unreadable whatever the exact hex is — no palette table
// needed, and no judgement call. Real example this found in stem_tool_music.js:
// five toggle OFF-states at 1.13:1, the labels telling a student what is
// currently switched off.
//
// It deliberately does NOT flag cross-family pairs (bg-blue-100 text-amber-200
// may be fine) or anything needing a real palette. Under-reporting on purpose:
// every hit here is worth fixing, so the list stays actionable.
const fs = require('fs');
const path = require('path');
const VERBOSE = process.argv.includes('--verbose');
const DIR = 'stem_lab';

// A same-family pair this close in shade can never reach 4.5:1.
const TOO_CLOSE = 300;

const files = fs.readdirSync(DIR).filter((f) => /^stem_tool_.*\.js$/.test(f)).sort();
let totalHits = 0;
const byFile = [];

files.forEach((f) => {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const hits = [];
  // Every single- or double-quoted literal on one line.
  const lit = /(['"])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
  let m;
  while ((m = lit.exec(src))) {
    const s = m[2];
    if (s.indexOf('bg-') < 0 || s.indexOf('text-') < 0) continue;
    // Capture each utility WITH its variant prefix, and refuse anything
    // carrying an opacity modifier (bg-purple-500/30), whose real colour
    // depends on what is behind it.
    //
    // Pair only utilities sharing the SAME prefix. Cross-pairing states is how
    // the first version of this produced nonsense: it read
    // 'hover:bg-slate-100 ... dark:text-slate-200' as light-on-light when those
    // two never apply at the same moment, and reported 40 hits on one tool that
    // way. Same mistake the header warns about for ternaries, one level down.
    const grab = (kind) => {
      const out = [];
      const re = new RegExp('(?:^|\\s)((?:[a-z-]+:)*)' + kind + '-([a-z]+)-(\\d{2,3})(?![\\w/])', 'g');
      let g;
      while ((g = re.exec(s))) out.push({ prefix: g[1] || '', fam: g[2], shade: +g[3] });
      return out;
    };
    const bgs = grab('bg');
    const txts = grab('text');
    if (!bgs.length || !txts.length) continue;
    bgs.forEach((b) => {
      txts.forEach((t) => {
        if (b.prefix !== t.prefix) return;               // same state only
        if (b.fam !== t.fam) return;                     // same family only
        const gap = Math.abs(b.shade - t.shade);
        if (gap >= TOO_CLOSE) return;
        const line = src.slice(0, m.index).split('\n').length;
        // SC 1.4.3 exempts inactive components, and a greyed-out disabled
        // state is exactly what a lot of these are. Judging that from the
        // class string alone is impossible, so look at the surrounding lines
        // for a `disabled` prop or variant and report those separately rather
        // than either dropping them silently or crying wolf. Checked by hand
        // on the first run: music's faded quiz options are `disabled: !!fb`
        // and beehive's grey buttons are the `!enabled` branch of a button
        // with `disabled: btn.disabled` — all exempt. The ones that were NOT
        // exempt were active toggles rendering their OFF state, whose labels
        // a student needs in order to see what is currently switched off.
        const lines = src.split('\n');
        // 12 lines back, not 6: a React element commonly declares its disabled
        // prop well above the className it pairs with — music puts them 9 lines
        // apart, and a 6-line window called two exempt controls actionable.
        const near = lines.slice(Math.max(0, line - 13), line + 3).join(' ');
        const exempt = /\bdisabled\s*[:=]/.test(near) || /^disabled:/.test(b.prefix);
        hits.push({
          line, gap, exempt,
          bg: b.prefix + 'bg-' + b.fam + '-' + b.shade,
          text: t.prefix + 'text-' + t.fam + '-' + t.shade,
          s: s.slice(0, 90),
        });
      });
    });
  }
  if (hits.length) { byFile.push({ f, hits }); totalHits += hits.length; }
});

if (!byFile.length) {
  console.log('no same-family light-on-light class pairings found across ' + files.length + ' tools');
} else {
  const live = [], exempt = [];
  byFile.forEach((e) => {
    e.hits.forEach((h) => (h.exempt ? exempt : live).push({ f: e.f, h }));
  });

  const show = (rows, title) => {
    console.log('\n' + title + ' (' + rows.length + ')');
    if (!rows.length) { console.log('   none'); return; }
    rows.forEach(({ f, h }) => {
      console.log('   ' + f.replace('stem_tool_', '').replace('.js', '').padEnd(20)
        + 'line ' + String(h.line).padStart(5) + '  ' + h.bg + ' + ' + h.text + '  (gap ' + h.gap + ')');
      if (VERBOSE) console.log('        ' + h.s);
    });
  };

  show(live, 'ACTIONABLE — active controls whose label is unreadable');
  show(exempt, 'EXEMPT under SC 1.4.3 — disabled/inactive controls, listed for information');
  console.log('\n' + totalHits + ' pairing(s) across ' + byFile.length + ' of ' + files.length + ' tools; '
    + live.length + ' actionable.');
  console.log('Each is a background and a text colour shipped in the SAME string literal,');
  console.log('same Tailwind family, same variant state, too close in shade to be readable.');
}
