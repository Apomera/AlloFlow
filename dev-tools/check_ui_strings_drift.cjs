#!/usr/bin/env node
// ui_strings.js OVERRIDES the fallback in t('key', 'fallback'), and the render harness used
// by the test suite supplies no ui_strings — it renders fallbacks. So a tool can be reworded
// in source, pass every assertion about that wording, and still ship the old text to
// students indefinitely. That is not hypothetical: on 2026-09-03 the Fire Ecology burn
// planner was still displaying "GO — Excellent conditions for cultural burning" months after
// a burn-safety rework removed exactly that framing from the source, and 135 stale values
// were found across 27 tool namespaces.
//
// This gate compares every fallback with the ui_strings value that overrides it. Divergence
// is allowed only when the key is listed in ui_strings_drift_baseline.json with a reason —
// ui_strings legitimately carries a few richer values (emoji markers, fuller aria text).
//
// Covers TWO sets of files (the second added 2026-09-21):
//   stem_lab/stem_tool_*.js  under ui_strings.stem.<tool>.*
//   ./*_module.js            under their own top-level namespace, e.g.
//                            symbol_studio.*, export_preview.*, allohaven.*
// Until then only the first was scanned, so every key the a11y-i18n pass added
// to a root module had NO coverage: the gate reported clean because it never
// looked. It also now matches __alloT(...) as well as t(...), which is what
// most converted tools actually call.
//
//   node dev-tools/check_ui_strings_drift.cjs            # report + exit 1 on new drift
//   node dev-tools/check_ui_strings_drift.cjs --update    # re-baseline deliberate cases
//   node dev-tools/check_ui_strings_drift.cjs --selftest  # prove both matchers still fire

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'ui_strings_drift_baseline.json');

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

function unescapeJs(raw) {
  return raw
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\');
}

// Compare on meaning, not typography: quote style, dash style and spacing vary freely
// between the two banks and are not what this gate is about.
function normalize(text, dropEmoji) {
  let out = String(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/ /g, ' ');
  if (dropEmoji) out = out.replace(EMOJI, '');
  return out.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[^a-z0-9 %$.,+/()-]/g, '');
}

// One source of truth for "a fallback this gate can see". Both the STEM tools
// (stem.<tool>.<key>) and the non-STEM CDN modules (<module>.<key>) use it.
// Note it matches SINGLE-quoted fallbacks only — that is deliberate and is why
// conversions must re-quote: a double-quoted fallback parses and runs fine and
// is invisible here, so the source can be reworded while ui_strings keeps
// shipping the old text forever.
function fallbackRe(prefix, ns) {
  const head = prefix ? prefix + "\\." + ns : ns;
  return new RegExp("(?:__alloT|t)\\(\\s*'" + head + "\\.([A-Za-z0-9_]+)'\\s*,\\s*'((?:[^'\\\\]|\\\\.)*)'\\s*\\)", 'g');
}

// Compare every fallback in `src` against the ui_strings bank that overrides it.
function compare(src, file, ns, bank, prefix, drift) {
  if (!bank || typeof bank !== 'object') return 0;
  let checked = 0;
  const seen = new Set();
  for (const m of src.matchAll(fallbackRe(prefix, ns))) {
    const key = m[1];
    if (seen.has(key) || !(key in bank)) continue;
    seen.add(key);
    checked += 1;
    const fallback = unescapeJs(m[2]);
    if (normalize(bank[key]) === normalize(fallback)) continue;
    drift.push({
      id: ns + '.' + key,
      tool: file,
      emojiOnly: normalize(bank[key], true) === normalize(fallback, true),
      shipped: bank[key],
      fallback
    });
  }
  return checked;
}

function scan() {
  const uiAll = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
  const ui = uiAll.stem || {};
  const tools = fs.readdirSync(path.join(ROOT, 'stem_lab'))
    .filter((f) => /^stem_tool_.*\.js$/.test(f));
  const drift = [];
  let checked = 0;

  for (const file of tools) {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab', file), 'utf8');
    const namespaces = new Set([...src.matchAll(/t\(\s*'stem\.([a-z0-9_]+)\./g)].map((m) => m[1]));
    for (const ns of namespaces) checked += compare(src, file, ns, ui[ns], 'stem', drift);
  }

  // Non-STEM CDN modules (2026-09-21). This gate only ever looked at
  // stem_lab/stem_tool_*.js under ui.stem. The a11y-i18n pass has since
  // converted root modules to their OWN top-level namespaces — symbol_studio.*,
  // export_preview.*, allohaven.* — and those keys had NO drift coverage at
  // all: the gate reported clean because it never looked at them. The premise
  // is the same, and matters more in these files, where an aria-label is often
  // the only way a student reaches the text at all.
  for (const file of fs.readdirSync(ROOT).filter((f) => /_module\.js$/.test(f))) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const namespaces = new Set(
      [...src.matchAll(/(?:__alloT|t)\(\s*'([a-z][a-z0-9_]*)\.[a-z0-9_]+'\s*,\s*'/g)]
        .map((m) => m[1])
        .filter((ns) => ns !== 'stem' && ns !== 'common')
    );
    for (const ns of namespaces) checked += compare(src, file, ns, uiAll[ns], null, drift);
  }

  return { checked, drift };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return {};
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8')).allowed || {};
}

// A gate that cannot fail is worse than none. This scan has two independent
// paths — stem_lab/stem_tool_*.js under ui.stem, and the root *_module.js files
// under their own namespaces — and a broken regex in either one fails SILENTLY:
// it just reports fewer keys and a clean tick. That is not hypothetical. The
// module path was added on 2026-09-21 and three separate attempts to write its
// regex through a shell arrived with the backslashes eaten (\bt became a
// backspace), each time compiling fine and matching nothing.
function selftest() {
  const probe = String.raw`x = { 'aria-label': __alloT('ns_probe.k','English text') };`;
  const bank = { k: 'DIFFERENT text' };
  const drift = [];
  const n = compare(probe, 'probe.js', 'ns_probe', bank, null, drift);
  const okModule = n === 1 && drift.length === 1 && drift[0].shipped === 'DIFFERENT text';

  const probeStem = String.raw`x = { title: t('stem.probe.k','English text') };`;
  const drift2 = [];
  const n2 = compare(probeStem, 'stem_tool_probe.js', 'probe', bank, 'stem', drift2);
  const okStem = n2 === 1 && drift2.length === 1;

  // And the live tree must actually be reaching both paths.
  const live = scan();
  const liveStem = live.drift.some((d) => d.tool.startsWith('stem_tool_'));
  const liveModule = live.drift.some((d) => /_module\.js$/.test(d.tool));

  console.log('  module-namespace matcher: ' + (okModule ? 'OK' : 'DEAD'));
  console.log('  stem-namespace matcher  : ' + (okStem ? 'OK' : 'DEAD'));
  console.log('  live scan reaches stem_lab tools : ' + (liveStem ? 'yes' : 'NO'));
  console.log('  live scan reaches root modules   : ' + (liveModule ? 'yes' : 'NO'));
  console.log('  fallbacks compared: ' + live.checked);
  const pass = okModule && okStem;
  console.log(pass ? '✓ selftest: both matchers fire.' : '✗ selftest: a matcher is dead.');
  process.exitCode = pass ? 0 : 1;
}

function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const update = process.argv.includes('--update');
  const { checked, drift } = scan();
  const allowed = loadBaseline();

  if (update) {
    const next = {};
    for (const d of drift) {
      next[d.id] = allowed[d.id] || (d.emojiOnly
        ? 'ui_strings carries the emoji variant'
        : 'reviewed: ui_strings value is intentional');
    }
    fs.writeFileSync(BASELINE, JSON.stringify({
      note: 'Keys where ui_strings intentionally differs from the source fallback. Everything else must match: ui_strings is what ships.',
      allowed: next
    }, null, 2) + '\n');
    console.log('check_ui_strings_drift: baselined ' + Object.keys(next).length + ' deliberate divergence(s).');
    return;
  }

  const unexpected = drift.filter((d) => !(d.id in allowed));
  const stale = Object.keys(allowed).filter((id) => !drift.some((d) => d.id === id));

  console.log('[check_ui_strings_drift] ' + checked + ' localized fallbacks compared against ui_strings.');
  if (stale.length) {
    console.log('  note: ' + stale.length + ' baselined key(s) no longer drift; run --update to prune.');
  }
  if (!unexpected.length) {
    console.log('✓ check_ui_strings_drift: shipped copy matches the reviewed fallbacks.');
    return;
  }
  console.log('✗ ' + unexpected.length + ' key(s) ship text that differs from the source fallback:');
  for (const d of unexpected.slice(0, 40)) {
    console.log('\n  ' + d.id + '  (' + d.tool + ')');
    console.log('    ships   : ' + String(d.shipped).slice(0, 150));
    console.log('    fallback: ' + String(d.fallback).slice(0, 150));
  }
  console.log('\nui_strings overrides the fallback, so the first line is what students read.');
  console.log('Fix the stale side, or record a deliberate divergence with --update.');
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { scan, loadBaseline, normalize };
