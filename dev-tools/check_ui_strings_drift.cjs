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
//   node dev-tools/check_ui_strings_drift.cjs            # report + exit 1 on new drift
//   node dev-tools/check_ui_strings_drift.cjs --update    # re-baseline deliberate cases

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

function scan() {
  const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')).stem || {};
  const tools = fs.readdirSync(path.join(ROOT, 'stem_lab'))
    .filter((f) => /^stem_tool_.*\.js$/.test(f));
  const drift = [];
  let checked = 0;

  for (const file of tools) {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab', file), 'utf8');
    const namespaces = new Set([...src.matchAll(/t\(\s*'stem\.([a-z0-9_]+)\./g)].map((m) => m[1]));
    for (const ns of namespaces) {
      const bank = ui[ns];
      if (!bank || typeof bank !== 'object') continue;
      const re = new RegExp("t\\(\\s*'stem\\." + ns + "\\.([A-Za-z0-9_]+)'\\s*,\\s*'((?:[^'\\\\]|\\\\.)*)'\\s*\\)", 'g');
      const seen = new Set();
      for (const m of src.matchAll(re)) {
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
    }
  }
  return { checked, drift };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return {};
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8')).allowed || {};
}

function main() {
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
