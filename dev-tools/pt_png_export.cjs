// What does the epicentre widget's "PNG" button actually save? Intercepts the
// download, then identifies the captured image by comparing it against every
// canvas on the page, and reports whether it is blank.
//   node dev-tools/pt_png_export.cjs <out-dir> [tab]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2]; const TAB = process.argv[3] || 'sim';
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(([t]) => window.__mount(false, t), [TAB]);
  await pg.waitForTimeout(2500);

  const report = await pg.evaluate(() => {
    // Capture the href instead of letting the browser download it.
    let grabbed = null;
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { grabbed = { href: this.href, name: this.download }; };

    const btn = Array.from(document.querySelectorAll('button')).find((e) => /PNG/.test(e.textContent || ''));
    if (!btn) { HTMLAnchorElement.prototype.click = realClick; return { error: 'no PNG button' }; }
    btn.click();
    HTMLAnchorElement.prototype.click = realClick;
    if (!grabbed) return { error: 'button produced no download' };

    // Which canvas did it pick? Ask each one for its own PNG and compare.
    const cvs = Array.from(document.querySelectorAll('canvas'));
    let matched = -1;
    const list = cvs.map((c, i) => {
      let url = null;
      try { url = c.toDataURL('image/png'); } catch (e) { url = 'ERR:' + e.message; }
      if (url === grabbed.href) matched = i;
      return { i, w: c.width, h: c.height, px: c.width * c.height, webgl: !!(c.__isWebGL || null), bytes: url ? url.length : 0 };
    });
    // Flag WebGL contexts: getContext('2d') throws or returns null on one.
    cvs.forEach((c, i) => {
      let is2d = false;
      try { is2d = !!c.getContext('2d'); } catch (e) { is2d = false; }
      list[i].webgl = !is2d;
    });
    const widget = document.querySelector('[data-pt-epicenter-canvas]');
    return {
      name: grabbed.name, bytes: grabbed.href.length,
      canvases: cvs.length,
      matchedIndex: matched,
      matched: matched >= 0 ? list[matched] : null,
      biggest: list.slice().sort((a, b) => b.px - a.px)[0],
      widgetIndex: widget ? cvs.indexOf(widget) : null,
      all: list
    };
  });
  console.log(JSON.stringify(report, null, 1));

  // Decode the captured image and check it is not a flat/blank frame.
  if (!report.error) {
    const stat = await pg.evaluate(async () => {
      let grabbed = null;
      const realClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { grabbed = this.href; };
      Array.from(document.querySelectorAll('button')).find((e) => /PNG/.test(e.textContent || '')).click();
      HTMLAnchorElement.prototype.click = realClick;
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = grabbed; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const seen = new Set(); let clear = 0;
      for (let i = 0; i < d.length; i += 4 * 97) {
        if (d[i + 3] === 0) clear++;
        seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      }
      return { w: img.width, h: img.height, distinctColours: seen.size, fullyTransparentSamples: clear };
    });
    console.log('decoded        ', JSON.stringify(stat));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
