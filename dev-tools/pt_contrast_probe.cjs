// Contrast probe for the controls this session added, both themes.
//
// Measures PAINTED pixels, not declared CSS. Declared colour lies here in two
// ways this project has been bitten by: a translucent fill takes its colour from
// whatever is behind it, and CSS compositing cannot see an ancestor gradient.
//
// Method (the one that survived four wrong versions):
//   clip-screenshot the element's OWN box -> hand that small PNG to the page as a
//   data: URL (a multi-MB base64 through evaluate tears down the execution
//   context; one element's box is a few KB) -> decode on a canvas -> drop every
//   pixel within manhattan-90 of the ink colour, so glyph pixels and their
//   antialiasing cannot be mistaken for the background -> take the MODE of what
//   is left. Averaging instead of the mode over-reports on a gradient.
//
//   node dev-tools/pt_contrast_probe.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];

// [tab, selector, how to reach it]
// [tab, selector, reach, viewport width] — the stacked phone layouts are
// display:none on a wide screen, so they must be measured at the width that
// actually shows them.
const TARGETS = [
  ['glossary', '[data-pt-no-matches]', 'search-miss', 1100],
  ['encyclopedia', '[data-pt-no-matches]', 'search-miss-plate', 1100],
  ['review', '[data-pt-review-reveal="1"]', null, 1100],
  ['review', '[data-pt-review-reveal-all]', null, 1100],
  ['sim', '[data-pt-plate-key="pacific"]', null, 1100],
  ['cascadia', '.pt-casc-key li', null, 400],
  ['sim', '.pt-tect-swipe', null, 400],
  ['boundaryHunt', '[data-pt-stress-log] tbody td', 'log-a-trial', 1100],
  ['boundaryHunt', '[data-pt-stress-log] th', 'log-a-trial', 1100],
  // States that only exist after work: a resting sweep never reaches them, so
  // they are exactly where a theme mistake survives.
  // The verdict CARD has no colour of its own, so grading it measured the
  // inherited black and reported a score no student sees. Grade the leaves that
  // actually carry ink.
  ['quiz', '[data-pt-quiz-verdict] > div:nth-child(1)', 'answer-one', 1100],
  ['quiz', '[data-pt-quiz-verdict] > div:nth-child(2)', 'answer-one', 1100],
  ['quiz', '[data-pt-quiz-verdict] > div:nth-child(3)', 'answer-one', 1100],
  ['quiz', '[data-pt-quiz-results] .text-2xl', 'finish-quiz', 1100],
  ['quiz', '[data-pt-quiz-results] .text-xs', 'finish-quiz', 1100],
  ['quiz', '[data-pt-quiz-results] li', 'finish-quiz', 1100],
  ['quiz', '[data-pt-quiz-restart]', 'finish-quiz', 1100],
  ['sim', '[data-pt-sim-readout]', null, 1100],
  // The boundary detail cards live behind a disclosure, so a resting sweep
  // never paints them. Grade the leaves: the name, the one-line description,
  // the field label and the field text.
  ['quiz', '[data-pt-boundary-detail] li > div:nth-child(1)', 'open-edu', 1100],
  ['quiz', '[data-pt-boundary-detail] li > div:nth-child(2)', 'open-edu', 1100],
  ['quiz', '[data-pt-boundary-detail] li > div:nth-child(3) span', 'open-edu', 1100],
  ['quiz', '[data-pt-boundary-detail] li > div:nth-child(3)', 'open-edu', 1100]
];

function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));

  const rows = [];
  for (const dark of [false, true]) {
    for (const [tab, sel, reach, vw] of TARGETS) {
      await pg.setViewportSize({ width: vw, height: 900 });
      await pg.evaluate(([d, t]) => window.__mount(d, t), [dark, tab]);
      await pg.waitForTimeout(900);
      if (reach === 'search-miss') {
        await pg.fill('input[placeholder^="Search glossary"]', 'zzqx');
        await pg.waitForTimeout(400);
      }
      if (reach === 'log-a-trial') {
        await pg.evaluate(() => {
          const el = Array.from(document.querySelectorAll('button')).find((x) => /Log/.test(x.textContent || ''));
          el && el.click();
        });
        await pg.waitForTimeout(400);
      }
      if (reach === 'answer-one' || reach === 'finish-quiz') {
        // Answer the way a student does. 'finish-quiz' walks the whole bank so
        // the results card exists at all.
        const rounds = reach === 'finish-quiz' ? 9 : 1;
        for (let i = 0; i < rounds; i++) {
          const opt = await pg.$('[data-pt-quiz-opt="0"]');
          if (!opt) break;
          await opt.click();
          await pg.waitForTimeout(160);
          if (reach === 'answer-one') break;
          const nx = await pg.$('[data-pt-quiz-next]');
          if (!nx) break;
          await nx.click();
          await pg.waitForTimeout(160);
        }
        await pg.waitForTimeout(300);
      }
      if (reach === 'open-edu') {
        // The wrapper div carries the same text as the button inside it, and
        // clicking the wrapper opens nothing. Take the button.
        await pg.evaluate(() => {
          const el = [...document.querySelectorAll('button')].find((x) => /Earth's Layers/.test(x.textContent || ''));
          el && el.click();
        });
        await pg.waitForTimeout(500);
      }
      if (reach === 'search-miss-plate') {
        await pg.fill('input[placeholder^="Search plates"]', 'zzqx');
        await pg.waitForTimeout(400);
      }
      const el = await pg.$(sel);
      if (!el) { rows.push({ dark, sel, err: 'not found' }); continue; }
      // A hidden element has no painted pixels; scrollIntoViewIfNeeded would
      // just spin on it until the step timed out and the whole run died.
      const vis = await pg.evaluate((q) => { const e = document.querySelector(q); const r = e.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
      if (!vis) { rows.push({ dark, sel, err: 'not visible at ' + vw + 'px' }); continue; }
      await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}); await pg.waitForTimeout(250);
      const info = await pg.evaluate((q) => {
        const e = document.querySelector(q); const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const m = (cs.color.match(/[\d.]+/g) || []).map(Number);
        return { x: r.x, y: r.y, w: r.width, h: r.height, ink: [m[0], m[1], m[2]], text: (e.textContent || '').trim().slice(0, 40), size: parseFloat(cs.fontSize), weight: cs.fontWeight };
      }, sel);
      if (info.w < 2 || info.h < 2) { rows.push({ dark, sel, err: 'zero box' }); continue; }
      // A clip below the fold is "empty or outside the resulting image", which
      // THROWS and takes the whole run with it - every earlier measurement lost
      // to one unreachable target. Clamp to the viewport and report the miss.
      const vp = pg.viewportSize();
      const cy = Math.max(0, info.y);
      const ch = Math.min(info.h, 300, vp.height - cy);
      const cw = Math.min(info.w, 900, vp.width - Math.max(0, info.x));
      if (ch < 2 || cw < 2) { rows.push({ dark, sel, err: 'below the fold at ' + vw + 'px' }); continue; }
      const shot = await pg.screenshot({ clip: { x: Math.max(0, info.x), y: cy, width: cw, height: ch } });
      const b64 = shot.toString('base64');
      const bg = await pg.evaluate(async ([data, ink]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + data; });
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const c2 = cv.getContext('2d'); c2.drawImage(img, 0, 0);
        const px = c2.getImageData(0, 0, cv.width, cv.height).data;
        const counts = new Map();
        let kept = 0, total = 0;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], bl = px[i + 2];
          total++;
          // Drop the ink and everything close to it: on a tightly-fitting label
          // the GLYPHS are the most common colour, and grading ink against ink
          // reports a perfect score for an unreadable control.
          if (Math.abs(r - ink[0]) + Math.abs(g - ink[1]) + Math.abs(bl - ink[2]) < 90) continue;
          kept++;
          const k = (r >> 2) + ',' + (g >> 2) + ',' + (bl >> 2);
          const cur = counts.get(k) || { n: 0, r: 0, g: 0, b: 0 };
          cur.n++; cur.r += r; cur.g += g; cur.b += bl; counts.set(k, cur);
        }
        // If almost nothing survives that filter, the BACKGROUND is itself
        // within manhattan-90 of the ink — which is the failing case, not an
        // unmeasurable one. Returning null here made the probe blind exactly
        // where it mattered: an injected 1.2:1 ink was skipped as "no
        // background pixels" and reported as clean.
        if (kept / Math.max(1, total) < 0.02) return { indistinct: true };
        let best = null;
        counts.forEach((v) => { if (!best || v.n > best.n) best = v; });
        if (!best) return { indistinct: true };
        return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
      }, [b64, info.ink]);
      if (!bg) { rows.push({ dark, sel, err: 'no background pixels' }); continue; }
      if (bg.indistinct) {
        rows.push({ dark, sel, tab, text: info.text, ink: info.ink, bg: info.ink, cr: 1, need: 4.5, pass: false });
        continue;
      }
      const cr = ratio(info.ink, bg);
      // WCAG AA: 3:1 for text at 18.66px bold or 24px+, else 4.5:1.
      const large = info.size >= 24 || (info.size >= 18.66 && parseInt(info.weight, 10) >= 700);
      rows.push({ dark, sel, tab, text: info.text, ink: info.ink, bg, cr: +cr.toFixed(2), need: large ? 3 : 4.5, pass: cr >= (large ? 3 : 4.5) });
    }
  }
  rows.forEach((r) => {
    if (r.err) { console.log((r.dark ? 'dark ' : 'light') + ' ' + r.sel.padEnd(34) + ' -- ' + r.err); return; }
    console.log((r.dark ? 'dark ' : 'light') + ' ' + r.sel.padEnd(34) +
      ' ink rgb(' + r.ink.join(',') + ') on rgb(' + r.bg.join(',') + ')  ' +
      String(r.cr).padStart(6) + ':1  need ' + r.need + '  ' + (r.pass ? 'ok' : '*** FAIL') + '   "' + r.text + '"');
  });
  const fails = rows.filter((r) => r.pass === false);
  console.log('\n' + fails.length + ' failing, ' + rows.filter((r) => r.err).length + ' unmeasured');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
