// Render the documents GIS Studio exports, in a real browser.
//
//   node dev-tools/gisstudio_report_qa.cjs [out-dir]
//
// The evidence report, map package, quality review and investigation packet are
// what a learner actually hands in. They are built as standalone HTML strings
// and opened in a new window, so no unit test and no screenshot of the app has
// ever seen one laid out. This renders each, checks it for text that fails WCAG
// contrast against its own background, checks it for horizontal overflow on a
// phone, and screenshots it.
//
// The same contrast pass runs over the studio's own workspaces, because a panel
// added to a dark surface is exactly where low-contrast text hides.
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || path.join('dev-tools', '.cache', 'gisstudio-reports'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const scripts = [
  read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
  read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
  read('stem_lab/stem_lab_module.js'),
  read('stem_lab/stem_tool_gisstudio.js')
];

// Text that fails this against its own background is unreadable for someone
// with low vision, and this repo has shipped that more than once.
const CONTRAST_PROBE = `
window.__contrastReport = function () {
  function parse(color) {
    var match = String(color || '').match(/rgba?\\(([^)]+)\\)/);
    if (!match) return null;
    var parts = match[1].split(',').map(function (value) { return parseFloat(value.trim()); });
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  function channel(value) {
    var c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance(rgb) {
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }
  function blend(top, bottom) {
    var alpha = top.a;
    return { r: top.r * alpha + bottom.r * (1 - alpha), g: top.g * alpha + bottom.g * (1 - alpha), b: top.b * alpha + bottom.b * (1 - alpha), a: 1 };
  }
  function gradientStops(image) {
    var stops = [];
    var index = 0;
    while (true) {
      index = image.indexOf('rgb', index);
      if (index < 0) break;
      var close = image.indexOf(')', index);
      if (close < 0) break;
      var stop = parse(image.slice(index, close + 1));
      if (stop) stops.push(stop);
      index = close + 1;
    }
    return stops;
  }
  // Every colour a gradient background can put behind this text.
  function backgroundsOf(element) {
    var node = element;
    var stack = [];
    while (node && node.nodeType === 1) {
      var style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage.indexOf('gradient') >= 0) {
        var stops = gradientStops(style.backgroundImage);
        if (stops.length) {
          return stops.map(function (stop) {
            var layered = { r: 255, g: 255, b: 255, a: 1 };
            for (var j = stack.length - 1; j >= 0; j--) layered = blend(stack[j], layered);
            return stop.a === 1 ? stop : blend(stop, layered);
          });
        }
      }
      var background = parse(style.backgroundColor);
      if (background && background.a > 0) {
        stack.push(background);
        if (background.a === 1) break;
      }
      node = node.parentElement;
    }
    var result = { r: 255, g: 255, b: 255, a: 1 };
    for (var i = stack.length - 1; i >= 0; i--) result = blend(stack[i], result);
    return [result];
  }

  function backgroundOf(element) { return backgroundsOf(element)[0]; }
  var failures = [];
  var unresolved = 0;
  document.querySelectorAll('*').forEach(function (element) {
    // SVG text is painted with fill, not color, and usually sits on a sibling
    // shape rather than a CSS background, so neither value here describes what
    // a reader sees. Counted and reported, never failed: checking the map
    // labels means looking at the screenshot.
    if (element.ownerSVGElement || element.tagName.toLowerCase() === 'svg') { unresolved += 1; return; }
    var text = Array.from(element.childNodes)
      .filter(function (node) { return node.nodeType === 3; })
      .map(function (node) { return node.textContent.trim(); })
      .join(' ')
      .trim();
    if (!text) return;
    var rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    var style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.15) return;
    var color = parse(style.color);
    if (!color) return;
    var backgrounds = backgroundsOf(element);
    var foreground = color.a < 1 ? blend(color, backgrounds[0]) : color;
    var ratio = Math.min.apply(null, backgrounds.map(function (background) {
      var lighter = Math.max(luminance(foreground), luminance(background));
      var darker = Math.min(luminance(foreground), luminance(background));
      return (lighter + 0.05) / (darker + 0.05);
    }));
    var size = parseFloat(style.fontSize) || 16;
    var bold = Number(style.fontWeight) >= 700;
    var large = size >= 24 || (bold && size >= 18.66);
    var required = large ? 3 : 4.5;
    if (ratio < required) {
      failures.push({
        ratio: Math.round(ratio * 100) / 100, required: required,
        size: Math.round(size * 10) / 10, weight: style.fontWeight,
        color: style.color, backgrounds: backgrounds.length, text: text.slice(0, 70)
      });
    }
  });
  failures.sort(function (a, b) { return a.ratio - b.ratio; });
  return { failures: failures, unresolvedSvgText: unresolved };
};
`;

const shell = `
window.__mountGIS = function (toolData) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  function Host() {
    var pair = React.useState(toolData || {});
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      update: function () {}, isDark: true, isContrast: false,
      gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function () {}, setStemLabTab: function () {}, setToolSnapshots: function () {},
      addToast: function () {}, announceToSR: function () {}, awardXP: function () {},
      beep: function () {}, celebrate: function () {}, canvasNarrate: function () {},
      canvasA11yDesc: function () {}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: 'gisStudio',
      toolSnapshots: [], props: {}, srOnly: {}, icons: Icons,
      a11yClick: function (f) { return { onClick: f }; },
      t: function (k, fallback) { return fallback != null ? fallback : k; },
      getXP: function () { return 0; },
      locale: 'en-US', language: 'English', dir: 'ltr'
    };
    return window.StemLab._registry.gisStudio.render(ctx);
  }
  var slot = document.getElementById('slot');
  ReactDOM.unmountComponentAtNode(slot);
  ReactDOM.render(React.createElement(Host), slot);
};
window.__buildReports = function () {
  var api = window.StemLab._registry.gisStudio.testing;
  var rows = [
    { name: 'West End', lat: 43.6525, lon: -70.2712, value: 2400, geometry: 'Point' },
    { name: 'Deering Center', lat: 43.6797, lon: -70.2884, value: 3100, geometry: 'Point' },
    { name: 'Riverton', lat: 43.7051, lon: -70.3128, value: 2200, geometry: 'Point' }
  ];
  var provenance = { datasetTitle: 'Portland households', source: 'City open data', collected: '2024', units: 'homes', method: 'Counted from parcels', license: 'CC BY 4.0', limitations: 'Illustrative values.' };
  var story = { title: 'Where households cluster', subtitle: 'A neighbourhood study', slides: [{ title: 'Peninsula density', narrative: 'Households cluster on the peninsula.' }] };
  return {
    'evidence': api.buildEvidenceReport({ left: { label: 'Households', rows: rows }, right: { label: 'Tree cover', rows: rows }, provenance: provenance }),
    'evidence-de': api.buildEvidenceReport({ left: { label: 'Haushalte', rows: rows }, right: { label: 'Baumbestand', rows: rows }, provenance: provenance }, { locale: 'de-DE' }),
    'map-package': api.buildMapComposerReport({ rows: rows, title: 'Portland households by neighbourhood', altText: 'A map of six Portland neighbourhoods shaded by household count, highest on the peninsula.', annotations: [{ label: 'Densest block', lat: 43.6641, lon: -70.2585 }], provenance: provenance, unit: 'homes', metricLabel: 'Households' }),
    'quality-review': api.buildDataQualityReport({ importedRows: rows, provenance: provenance }),
    'packet': api.buildInvestigationPacketReport({ rows: rows, storyMap: story, provenance: provenance }),
    'story-map': api.buildStoryMapReport({ rows: rows, story: story })
  };
};
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  page.on('pageerror', (error) => problems.push('pageerror: ' + String((error && error.stack) || error).slice(0, 400)));
  await page.route('**/*', (route) => (/tile\.openstreetmap|arcgisonline|unpkg\.com/.test(route.request().url()) ? route.abort() : route.continue()));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#06131f}#slot{min-height:100vh}</style></head><body><div id="slot"></div></body></html>');
  for (const code of scripts.concat(shell, CONTRAST_PROBE)) await page.addScriptTag({ content: code });

  // 1. Contrast across the studio's own workspaces.
  const workspaces = [
    'map', 'import', 'compare', 'missions', 'timeline', 'project', 'composer',
    'remote', 'story', 'quality', 'planner', 'review', 'packet', 'projection'
  ];
  for (const workspace of workspaces) {
    await page.evaluate((tab) => window.__mountGIS({ gisTab: tab, gisBasemap: 'none' }), workspace);
    await page.waitForTimeout(400);
    const report = await page.evaluate(() => window.__contrastReport());
    const failures = report.failures;
    console.log('workspace ' + workspace + ': ' + failures.length + ' contrast failure(s), ' + report.unresolvedSvgText + ' svg text node(s) not machine-checkable');
    failures.slice(0, 6).forEach((failure) => console.log('   ' + JSON.stringify(failure)));
    if (failures.length) problems.push('contrast in ' + workspace + ': ' + JSON.stringify(failures.slice(0, 4)));
  }

  // 2. Every exported document, rendered and measured.
  const reports = await page.evaluate(() => window.__buildReports());
  const reportPage = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  reportPage.on('pageerror', (error) => problems.push('report pageerror: ' + String((error && error.stack) || error).slice(0, 400)));
  for (const [name, html] of Object.entries(reports)) {
    fs.writeFileSync(path.join(OUT, name + '.html'), html, 'utf8');
    await reportPage.setContent(html, { waitUntil: 'domcontentloaded' });
    await reportPage.addScriptTag({ content: CONTRAST_PROBE });
    const report = await reportPage.evaluate(() => window.__contrastReport());
    const failures = report.failures;
    const overflow = await reportPage.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
    await reportPage.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true, animations: 'disabled' });
    console.log('report ' + name + ': ' + failures.length + ' contrast failure(s), ' + report.unresolvedSvgText + ' svg text node(s) not machine-checkable, width ' + JSON.stringify(overflow));
    failures.slice(0, 6).forEach((failure) => console.log('   ' + JSON.stringify(failure)));
    if (failures.length) problems.push('contrast in report ' + name + ': ' + JSON.stringify(failures.slice(0, 4)));

    await reportPage.setViewportSize({ width: 390, height: 844 });
    const phone = await reportPage.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
    if (phone.documentWidth > phone.viewportWidth + 1) {
      problems.push('report ' + name + ' overflows a phone: ' + JSON.stringify(phone));
    }
    await reportPage.setViewportSize({ width: 1100, height: 1400 });
  }

  await browser.close();
  console.log('\nwritten to ' + OUT);
  if (problems.length) {
    console.error('\nPROBLEMS:\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log('no contrast failures, no overflow, no page errors');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
