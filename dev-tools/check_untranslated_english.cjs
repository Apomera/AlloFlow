// Find English the learner can read that never goes through the translation layer.
// Marks every __alloT(...) / t(...) span first, then reports sentence-like string
// literals outside those spans, outside comments, and outside CSS/class/selector text.
//   node dev-tools/check_untranslated_english.cjs [file]
const fs = require('fs');
const FILE = process.argv[2] || 'stem_lab/stem_tool_galaxy.js';
const src = fs.readFileSync(FILE, 'utf8');

// ── 1. blank out comments so their prose is not reported ──
let code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
code = code.replace(/(^|[\n])([ \t]*\/\/[^\n]*)/g, (m, a, b) => a + ' '.repeat(b.length));

// ── 2. mark translated spans: everything inside __alloT( ... ) and t( ... ) ──
const translated = new Uint8Array(code.length);
for (const m of code.matchAll(/\b(?:__alloT|t|ctx\.t)\(/g)) {
  let i = m.index + m[0].length, depth = 1, quote = null;
  while (i < code.length && depth > 0) {
    const c = code[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; }
    else if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    i++;
  }
  translated.fill(1, m.index, i);
}

// ── 3. collect string literals ──
const LIT = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
const looksLikeCss = (s) => {
  const toks = s.trim().split(/\s+/);
  if (!toks.length) return false;
  const cssish = toks.filter((t) => /[-:]/.test(t) || /^\d/.test(t) || /^(flex|grid|absolute|relative|block|hidden|rounded|border|bg|text|font|p|m|w|h|gap|top|left|right|bottom|z|min|max|overflow|shadow|backdrop|transition|opacity|cursor|pointer|inline|items|justify|self|space|leading|tracking|whitespace|truncate)$/.test(t));
  return cssish.length / toks.length > 0.5;
};
const isEnglishPhrase = (s) => {
  // Three blind spots this replaces, all found by re-measuring the galaxy tool with a
  // different rule after it reported "done":
  //   * a 10-character floor hid "Big Bang" and " kpc field";
  //   * demanding TWO words of three-plus letters hid " lifetime", " survey", " percent";
  //   * excluding anything starting with "." (meant for CSS selectors) hid the
  //     narration fragment ". The flash marks a massive star exploding...".
  // A string that starts or ends with a space is usually the tail of a concatenation
  // joined onto a value, which is exactly the kind of text that gets missed, so those
  // are kept deliberately even when short.
  if (s.length < 4 || s.length > 400) return false;
  if (!/[A-Za-z]{3}/.test(s)) return false;
  if (/^[\s\W]*$/.test(s)) return false;
  const t = s.trim();
  if (/^(https?:|\/\/|#[0-9a-fA-F]{3,8}$|data:|var\(|linear-gradient|rgba?\()/.test(t)) return false;
  if (/^\.[A-Za-z][\w-]*$/.test(t)) return false;                 // a CSS selector
  if (/^[a-z][a-zA-Z0-9_]*$/.test(t)) return false;               // a bare identifier
  if (looksLikeCss(s)) return false;
  // GLSL source, console output and CSS values are not learner-facing text.
  if (/^\s*(attribute|varying|uniform|precision|void|vec[234]|float|int|bool|const|return|gl_|#|if |else|for )/.test(s)) return false;
  if (/[;{}]|gl_|vec[234]\(|mix\(|clamp\(|smoothstep\(|pow\(|exp\(/.test(s)) return false;
  if (/\[StemLab\]|\[Galaxy\]|use strict|rgba?\(|gradient|cubic-bezier|minmax\(|repeat\(|prefers-reduced-motion|forced-colors/.test(s)) return false;
  if (/^[\d.,+\-\u2013 ]*(px|em|rem|deg|%|s|ms)$/.test(t)) return false;   // a bare measurement
  // Machine identifiers that happen to contain English words. Relaxing the filters
  // above to catch joined fragments also let these in, so they are named explicitly.
  if (/^(CDS\/)?P\/[A-Za-z0-9]/.test(t)) return false;              // sky survey ids
  if (/^&|&[a-z]+=|=$/.test(t)) return false;                       // URL query pieces
  if (/\.(css|js|json|png|jpe?g|svg|webp|mjs|cjs)$/i.test(t)) return false;
  if (/^[a-z0-9.-]+\.(org|net|com|edu|io|fr|uk)$/i.test(t)) return false;   // hostnames
  if (/^[A-Za-z]+\[[a-z-]+\]$/.test(t)) return false;               // CSS attribute selector
  if (/^[\d.,+\-\u2013]+\s*(x Sun|Myr|Gyr|kpc|ly|K|AU|M\u2609|R\u2609|L\u2609)$/.test(t)) return false;
  const words = s.match(/\b[A-Za-z][a-z]{2,}\b/g) || [];
  if (!words.length) return false;
  // One word is enough when the string is a joined fragment or a real phrase.
  return words.length >= 2 || /^\s|\s$/.test(s) || t.length >= 8;
};

const findings = [];
let m;
while ((m = LIT.exec(code))) {
  const raw = m[1] !== undefined ? m[1] : m[2];
  if (translated[m.index]) continue;
  if (!isEnglishPhrase(raw)) continue;
  const line = code.slice(0, m.index).split('\n').length;
  findings.push({ line, text: raw });
}

// ── 4. group by the mode each line sits in, using the nearest mode marker ──
const lines = src.split('\n');
const modeAt = (ln) => {
  for (let i = ln - 1; i >= 0 && i > ln - 400; i--) {
    const t = lines[i];
    if (/simMode === 'star'|lifecycleStage|lifecycleMass/.test(t)) return 'starLife';
    if (/simMode === 'blackHole'|black-hole-/.test(t)) return 'blackHole';
    if (/simMode === 'metalHunt'|metalHunt/.test(t)) return 'metalHunt';
    if (/simMode === 'realSky'|realSky|aladin/i.test(t)) return 'realSky';
    if (/quizMode|QUIZ_BANK|ACTIVE_BANK/.test(t)) return 'quiz';
    if (/data-galaxy-canvas|galaxyControlPanel/.test(t)) return 'galaxy';
  }
  return 'shared';
};
const byMode = {};
for (const f of findings) {
  const mode = modeAt(f.line);
  (byMode[mode] = byMode[mode] || []).push(f);
}
console.log('un-translated English phrases: ' + findings.length + '\n');
for (const [mode, list] of Object.entries(byMode).sort((a, b) => b[1].length - a[1].length)) {
  console.log('── ' + mode + ' (' + list.length + ')');
  for (const f of list.slice(0, 200)) console.log('   ' + String(f.line).padStart(6) + '  ' + f.text.slice(0, 105));
  if (list.length > 200) console.log('   ... and ' + (list.length - 14) + ' more');
}
