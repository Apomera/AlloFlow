// Contrast sweep over every tab, both themes, grading PAINTED pixels.
//
// Same method as pt_contrast_probe.cjs (clip the element's own box, hand the
// small PNG back to the page, drop pixels near the ink, take the mode), applied
// to a sample of each tab's text rather than to a hand-listed set of controls.
// A sweep only grades what it can see, so this takes the ink of the biggest text
// nodes on each tab — headings and body copy — which is where a theme mistake
// shows first.
//
//   node dev-tools/pt_contrast_sweep.cjs <out-dir> [perTab] [tab,tab,...]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const PER_TAB = parseInt(process.argv[3] || '10', 10);
const ALL = ['sim', 'earthquake', 'timeline', 'quiz', 'boundaryHunt', 'encyclopedia', 'plateProfiles',
  'boundaries', 'faults', 'volcanoes', 'mountains', 'tsunamis', 'hotspots', 'seafloor', 'rocks',
  'minerals', 'fossils', 'dinosaurs', 'extinctions', 'periods', 'paleo', 'hominids', 'cascadia',
  'preparedness', 'quakeStories', 'eruptions', 'impacts', 'events', 'parks', 'us_states', 'landforms',
  'caves', 'outcrops', 'geothermal', 'critical_minerals', 'methods', 'expeditions', 'submersibles',
  'projects', 'women', 'indigenous', 'climate', 'insights', 'history', 'biographies', 'maine',
  'careers', 'glossary', 'lessons', 'concepts', 'review', 'faq', 'resources', 'about'];
const TABS = (process.argv[4] ? process.argv[4].split(',') : ALL);

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

  // Most leaf nodes on any tab belong to the hub strip and the always-on
  // reference shelf, so a spread sample re-measures the same shared furniture 54
  // times and rarely touches the tab's own content. Take a baseline of that
  // furniture once and sample only what a tab adds — without this the sweep
  // missed an injected 1.2:1 ink outright.
  await pg.evaluate(() => window.__mount(false, 'about'));
  await pg.waitForTimeout(700);
  const BASELINE = new Set(await pg.evaluate(() => {
    const out = [];
    document.querySelectorAll('p,h3,h4,span,div,li,td,th').forEach((el) => {
      if (el.children.length) return;
      const t = (el.textContent || '').trim();
      if (t.length >= 12) out.push(t.slice(0, 30));
    });
    return out;
  }));

  const fails = [];
  let measured = 0;
  for (const dark of [false, true]) {
    for (const tab of TABS) {
      await pg.evaluate(([d, t]) => window.__mount(d, t), [dark, tab]);
      await pg.waitForTimeout(650);
      // Pick leaf text nodes spread through the tab's own panel.
      const picks = await pg.evaluate(([n, base]) => {
        const out = [];
        const seen = new Set();
        document.querySelectorAll('p,h3,h4,span,div,li,td,th').forEach((el) => {
          if (el.children.length) return;
          const t = (el.textContent || '').trim();
          if (t.length < 12 || t.length > 220) return;
          const r = el.getBoundingClientRect();
          if (r.width < 40 || r.height < 8) return;
          // emoji-only nodes paint in colour whatever the theme says
          if (!/[A-Za-z]{3}/.test(t)) return;
          const key = t.slice(0, 30);
          if (seen.has(key) || base.indexOf(key) !== -1) return;
          seen.add(key);
          const cs = getComputedStyle(el);
          const m = (cs.color.match(/[\d.]+/g) || []).map(Number);
          out.push({ x: r.x, y: r.y, w: r.width, h: r.height, ink: [m[0], m[1], m[2]], size: parseFloat(cs.fontSize), weight: cs.fontWeight, text: t.slice(0, 40) });
        });
        // spread the sample through the page rather than taking the first n
        const step = Math.max(1, Math.floor(out.length / n));
        return out.filter((_, i) => i % step === 0).slice(0, n);
      }, [PER_TAB, Array.from(BASELINE)]);

      if (process.env.PT_DEBUG) console.log('  picks[' + tab + ']: ' + JSON.stringify(picks.map(function (x) { return x.text.slice(0, 28) + ' @' + x.ink.join(','); })));
      for (const p of picks) {
        // Centre the element and re-read its rect: scrolling by a remembered y
        // and then demanding the element be fully in view threw most samples
        // away, and a sweep that measures a handful of nodes is not evidence.
        const box = await pg.evaluate((t) => {
          const el = Array.from(document.querySelectorAll('p,h3,h4,span,div,li,td,th'))
            .find((e) => !e.children.length && (e.textContent || '').trim().slice(0, 40) === t);
          if (!el) return null;
          try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
          const r = el.getBoundingClientRect();
          if (r.width < 10 || r.height < 6) return null;
          const y = Math.max(0, Math.min(r.y, window.innerHeight - 8));
          const h = Math.min(r.height, window.innerHeight - y, 60);
          if (h < 6) return null;
          return { x: Math.max(0, r.x), y: y, width: Math.min(r.width, 700), height: h };
        }, p.text);
        await pg.waitForTimeout(40);
        if (!box) continue;
        const shot = await pg.screenshot({ clip: box });
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
            if (Math.abs(r - ink[0]) + Math.abs(g - ink[1]) + Math.abs(bl - ink[2]) < 90) continue;
            kept++;
            const k = (r >> 2) + ',' + (g >> 2) + ',' + (bl >> 2);
            const cur = counts.get(k) || { n: 0, r: 0, g: 0, b: 0 };
            cur.n++; cur.r += r; cur.g += g; cur.b += bl; counts.set(k, cur);
          }
          // If almost nothing survives, the background is ITSELF within
          // manhattan-90 of the ink -- which is the failing case, not an
          // unmeasurable one. Skipping it made the probe blind exactly where it
          // mattered: an injected 1.2:1 ink was dropped as "no background".
          if (kept / Math.max(1, total) < 0.02) return { indistinct: true };
          let best = null;
          counts.forEach((v) => { if (!best || v.n > best.n) best = v; });
          return best ? [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)] : { indistinct: true };
        }, [shot.toString('base64'), p.ink]);
        if (!bg) continue;
        measured++;
        // An indistinct result is a FAILURE, not a missing measurement. Passing
        // the object on to ratio() produced NaN, and `NaN < 4.5` is false, so
        // the worst possible contrast slipped through as a pass.
        if (bg.indistinct) {
          fails.push({ tab, dark, cr: 1, need: 4.5, ink: p.ink, bg: p.ink, size: p.size, text: p.text + '  [ink indistinguishable from its background]' });
          continue;
        }
        const cr = ratio(p.ink, bg);
        const large = p.size >= 24 || (p.size >= 18.66 && parseInt(p.weight, 10) >= 700);
        const need = large ? 3 : 4.5;
        if (cr < need) fails.push({ tab, dark, cr: +cr.toFixed(2), need, ink: p.ink, bg, size: p.size, text: p.text });
      }
    }
    console.log((dark ? 'dark' : 'light') + ' sweep done, ' + measured + ' samples so far, ' + fails.length + ' failing');
  }
  console.log('\n' + measured + ' samples measured, ' + fails.length + ' below AA');
  fails.slice(0, 40).forEach((f) => console.log('  [' + f.tab + '/' + (f.dark ? 'dark' : 'light') + '] ' + f.cr + ':1 need ' + f.need +
    '  rgb(' + f.ink.join(',') + ') on rgb(' + f.bg.join(',') + ')  ' + f.size + 'px  "' + f.text + '"'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
