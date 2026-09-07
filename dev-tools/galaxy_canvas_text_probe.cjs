// Canvas-drawn text is invisible to axe, to the prose sweeps and to the i18n scanners:
// it is neither DOM nor a string the extractors look at. This probe wraps fillText at
// DRAW TIME and records, for every text run the tool paints, the string, the font, the
// composited colour (fillStyle blended over the pixels already there) and the resulting
// contrast ratio. That measures what a learner actually sees, not what the source says.
//   node canvas_text_probe.cjs [mode]
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');
const OUT = path.join(__dirname, 'canvas_text_out');

const MODE = process.argv[2] || 'star';
const STATES = {
  star: ['main_sequence', 'protostar', 'red_giant', 'white_dwarf', 'planetary_nebula', 'black_dwarf'].map((st) => ({
    label: st + ' 1.0',
    state: { simMode: 'star', showLifecycle: true, lifecycleMass: 1, activeStage: st },
  })).concat(['main_sequence', 'red_supergiant', 'supernova', 'neutron_star'].map((st) => ({
    label: st + ' 20',
    state: { simMode: 'star', showLifecycle: true, lifecycleMass: 20, activeStage: st },
  }))).concat([
    { label: 'main_sequence 0.2', state: { simMode: 'star', showLifecycle: true, lifecycleMass: 0.2, activeStage: 'main_sequence' } },
    { label: 'main_sequence 1.5', state: { simMode: 'star', showLifecycle: true, lifecycleMass: 1.5, activeStage: 'main_sequence' } },
  ]),
  galaxy: [{ label: 'galaxy', state: { simMode: 'galaxy' } }],
};

const PATCH = `
  (function () {
    window.__textRuns = [];
    var proto = CanvasRenderingContext2D.prototype;
    function srgb(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function lum(rgb) { return 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]); }
    function parseColor(s) {
      if (typeof s !== 'string') return null;
      var m = /^#([0-9a-f]{6})$/i.exec(s.trim());
      if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
      m = /^#([0-9a-f]{3})$/i.exec(s.trim());
      if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16), 1];
      m = /^rgba?\\(([^)]+)\\)$/i.exec(s.trim());
      if (m) {
        var p = m[1].split(',').map(function (v) { return parseFloat(v); });
        return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
      }
      return null;
    }
    var orig = proto.fillText;
    proto.fillText = function (text, x, y) {
      var rec = null;
      try {
        if (typeof text === 'string' && text.trim() && this.canvas && this.canvas.width) {
          var tf = this.getTransform ? this.getTransform() : null;
          var px = tf ? tf.a * x + tf.c * y + tf.e : x;
          var py = tf ? tf.b * x + tf.d * y + tf.f : y;
          var scale = tf ? Math.abs(tf.a) : 1;
          // Sample the background a little ABOVE the baseline, where the glyph body sits.
          var sx = Math.max(0, Math.min(this.canvas.width - 3, Math.round(px - 1)));
          var sy = Math.max(0, Math.min(this.canvas.height - 3, Math.round(py - 3 * scale)));
          var d = this.getImageData(sx, sy, 3, 3).data;
          var bg = [0, 0, 0];
          for (var i = 0; i < 9; i++) { bg[0] += d[i * 4]; bg[1] += d[i * 4 + 1]; bg[2] += d[i * 4 + 2]; }
          bg = [bg[0] / 9, bg[1] / 9, bg[2] / 9];
          var fg = parseColor(this.fillStyle);
          rec = {
            text: text, font: this.font, alpha: this.globalAlpha,
            fillStyle: typeof this.fillStyle === 'string' ? this.fillStyle : '(gradient)',
            bg: bg.map(Math.round), fg: fg, canvas: this.canvas.width + 'x' + this.canvas.height,
            scale: scale,
          };
          if (fg) {
            var a = fg[3] * this.globalAlpha;
            var comp = [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
            var l1 = lum(comp), l2 = lum(bg);
            rec.composited = comp.map(Math.round);
            rec.ratio = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
          }
        }
      } catch (e) { /* getImageData can throw on a tainted canvas */ }
      var out = orig.apply(this, arguments);
      if (rec) window.__textRuns.push(rec);
      return out;
    };
  })();
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext();
  const pg = await ctx.newPage({ viewport: { width: 1180, height: 1400 } });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'c.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.addInitScript(PATCH);
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 160)));
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForTimeout(1800);

  const seen = new Map();
  for (const { label, state } of (STATES[MODE] || STATES.star)) {
    await pg.evaluate((s) => { window.__textRuns = []; window.__mount(s); }, state);
    await pg.waitForTimeout(2600);
    const runs = await pg.evaluate(() => window.__textRuns);
    for (const r of runs) {
      const key = label + '|' + r.text + '|' + r.font;
      if (!seen.has(key)) seen.set(key, { ...r, where: label });
    }
    const shot = path.join(OUT, MODE + '_' + label.replace(/[^a-z0-9]+/gi, '_') + '.png');
    const el = await pg.$('[data-galaxy-canvas], canvas');
    if (el) await el.screenshot({ path: shot });
  }

  const rows = [...seen.values()];
  console.log('text runs recorded: ' + rows.length + '\n');
  const fail = [];
  for (const r of rows) {
    const sizeM = /(\d+(?:\.\d+)?)px/.exec(r.font);
    const size = sizeM ? parseFloat(sizeM[1]) : 0;
    const bold = /bold/.test(r.font);
    // WCAG large text (18.66px bold / 24px) relaxes to 3:1; nothing here is that big.
    const need = 4.5;
    const bad = r.ratio != null && r.ratio < need;
    const tiny = size > 0 && size < 9;
    if (bad || tiny) fail.push({ ...r, size, bold, need });
    console.log(
      (bad || tiny ? 'FAIL ' : '  ok ') + JSON.stringify(r.text).padEnd(34)
      + ' ' + String(size).padStart(5) + 'px'
      + ' a=' + String(r.alpha).padEnd(5)
      + ' ratio=' + String(r.ratio == null ? 'n/a' : r.ratio).padStart(6)
      + '  ' + r.where + '  fill=' + r.fillStyle + ' bg=rgb(' + r.bg.join(',') + ')'
    );
  }
  console.log('\nfailures: ' + fail.length + ' of ' + rows.length);
  fs.writeFileSync(path.join(OUT, 'runs_' + MODE + '.json'), JSON.stringify(rows, null, 2), 'utf8');
  console.log('page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
  await b.close();
})().catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1); });
