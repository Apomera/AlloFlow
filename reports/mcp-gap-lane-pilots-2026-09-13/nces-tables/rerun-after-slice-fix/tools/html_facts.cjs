// node html_facts.cjs <poll.json> — for every pending "HTML section N/M" audit request, extract the
// section HTML, save it as section-N.html, and print measured accessibility facts as JSON so the
// audit reply can be written from evidence rather than impression.
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/jsdom');
const here = __dirname;
const poll = JSON.parse(fs.readFileSync(path.join(here, process.argv[2]), 'utf8'));
const out = [];
for (const p of (poll.structuredContent || {}).pendingRequests || []) {
  const prompt = p.prompt || '';
  const m = prompt.match(/HTML section (\d+)\/(\d+):\s*\n"""/);
  if (!m) continue;
  const start = prompt.indexOf('"""', m.index) + 3;
  const end = prompt.lastIndexOf('"""');
  const html = prompt.slice(start, end);
  fs.writeFileSync(path.join(here, 'section-' + m[1] + '.html'), html);
  const dom = new JSDOM(html);
  const d = dom.window.document;
  const q = (s) => Array.from(d.querySelectorAll(s));
  const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const headings = q('h1,h2,h3,h4,h5,h6').map((h) => ({ tag: h.tagName.toLowerCase(), text: txt(h).slice(0, 90), id: h.id || null }));
  const skips = [];
  for (let i = 1; i < headings.length; i++) { const a = Number(headings[i - 1].tag[1]), b = Number(headings[i].tag[1]); if (b > a + 1) skips.push(headings[i - 1].text + ' -> ' + headings[i].text); }
  const imgs = q('img').map((im) => ({ alt: im.getAttribute('alt'), hasAlt: im.hasAttribute('alt'), inFigure: !!im.closest('figure'), figcaption: im.closest('figure') ? txt(im.closest('figure').querySelector('figcaption') || { textContent: '' }).slice(0, 80) : null, src: (im.getAttribute('src') || '').slice(0, 40) }));
  const tables = q('table').map((t) => ({ caption: t.querySelector('caption') ? txt(t.querySelector('caption')).slice(0, 80) : null, th: t.querySelectorAll('th').length, thScoped: t.querySelectorAll('th[scope]').length, rows: t.querySelectorAll('tr').length }));
  const links = q('a').map((a) => ({ text: txt(a).slice(0, 60), href: (a.getAttribute('href') || '').slice(0, 60), ariaLabel: a.getAttribute('aria-label') }));
  const badLinks = links.filter((l) => !l.ariaLabel && (/^(click here|here|link|read more|more|this)$/i.test(l.text) || !l.text));
  const inputs = q('input,select,textarea').map((el) => { const id = el.id; const labelled = (id && d.querySelector('label[for="' + id + '"]')) || el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'); return { type: el.getAttribute('type') || el.tagName.toLowerCase(), id: id || null, labelled: !!labelled }; });
  const buttons = q('button').map((b) => ({ text: txt(b).slice(0, 40), ariaLabel: b.getAttribute('aria-label'), labelled: !!(txt(b) || b.getAttribute('aria-label') || b.getAttribute('aria-labelledby') || b.getAttribute('title')) }));
  const bulletParas = q('p,div').filter((el) => /^[•·◦▪\-–]\s/.test(txt(el))).map((el) => txt(el).slice(0, 60));
  const inlineColors = Array.from(new Set(q('[style]').map((el) => el.getAttribute('style')).filter((s) => /color|background/i.test(s)))).slice(0, 12);
  const landmarks = { main: q('main,[role=main]').length, header: q('header,[role=banner]').length, nav: q('nav,[role=navigation]').length, footer: q('footer,[role=contentinfo]').length, aside: q('aside').length, region: q('section[aria-label],section[aria-labelledby],[role=region]').length };
  const skipLink = q('a[href^="#"]').filter((a) => /skip/i.test(txt(a))).map((a) => ({ text: txt(a), href: a.getAttribute('href'), targetExists: !!d.querySelector(a.getAttribute('href')) }));
  // Measured text contrast from inline styles (the generated document styles headings, notes and
  // controls inline; the page background is white). Large text = >=24px, or >=18.66px bold.
  const hex = (s) => { const m = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(s || ''); if (!m) return null; let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const styleProp = (style, prop) => { const m = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)', 'i').exec(style || ''); return m ? m[1].trim() : null; };
  const tagSize = { h1: 28, h2: 22.4, h3: 18.4, h4: 16, figcaption: 14 };
  const pxOf = (v, base) => { if (!v) return null; const m = /^([\d.]+)\s*(px|rem|em|pt)?/.exec(v); if (!m) return null; const n = Number(m[1]); const u = m[2] || 'px'; return u === 'px' ? n : u === 'pt' ? n * 4 / 3 : n * (u === 'rem' ? 16 : base); };
  const contrastFails = [];
  for (const el of q('[style]')) {
    const ownText = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (!ownText) continue;
    const style = el.getAttribute('style');
    const fg = hex(styleProp(style, 'color'));
    if (!fg) continue;
    // A section that starts mid-element leaves its first elements orphaned under <body>; their real
    // container (and its background) lives in the previous section, so a contrast reading is void.
    if (!/^\s*</.test(html) && el.parentElement && el.parentElement.tagName === 'BODY') continue;
    let bg = null;
    for (let a = el; a && a.getAttribute; a = a.parentElement) { const b = hex(styleProp(a.getAttribute('style'), 'background(?:-color)?')); if (b) { bg = b; break; } }
    if (!bg) bg = [255, 255, 255];
    const tag = el.tagName.toLowerCase();
    const size = pxOf(styleProp(style, 'font-size'), 16) || tagSize[tag] || 16;
    const weight = styleProp(style, 'font-weight');
    const bold = weight ? /bold|[6-9]00/.test(weight) : /^h[1-6]$|^strong$|^b$|^th$/.test(tag) || !!el.closest('strong,b,h1,h2,h3,h4');
    const large = size >= 24 || (size >= 18.66 && bold);
    const r = ratio(fg, bg);
    if (r < (large ? 3 : 4.5)) contrastFails.push({ tag, text: ownText.slice(0, 60), fg: styleProp(style, 'color').replace(/\s*!important/i, '').slice(0, 9), bg: '#' + bg.map((c) => c.toString(16).padStart(2, '0')).join(''), size: Math.round(size * 10) / 10, bold, ratio: Math.round(r * 100) / 100, needs: large ? 3 : 4.5 });
  }
  const startsMidTag = !/^\s*</.test(html);
  const lang = d.documentElement.getAttribute('lang');
  const title = d.querySelector('title') ? txt(d.querySelector('title')) : null;
  const langSpans = q('[lang]').filter((el) => el !== d.documentElement).length;
  out.push({
    requestId: p.requestId, section: Number(m[1]), of: Number(m[2]), htmlChars: html.length,
    isDocument: /<html[\s>]/i.test(html), lang, title, skipLink, landmarks,
    headings, headingSkips: skips, h1Count: headings.filter((h) => h.tag === 'h1').length,
    images: imgs, tables, linkCount: links.length, links: links.slice(0, 12), badLinks,
    lists: { ul: q('ul').length, ol: q('ol').length, li: q('li').length, dl: q('dl').length }, bulletParas,
    inputs, buttons, inlineColors, langSpans, contrastFails, startsMidTag,
    textHead: txt(d.body || d.documentElement).slice(0, 240), textChars: txt(d.body || d.documentElement).length,
  });
}
console.log(JSON.stringify(out, null, 1));
