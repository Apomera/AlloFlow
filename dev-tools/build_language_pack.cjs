#!/usr/bin/env node
// =============================================================================
// dev-tools/build_language_pack.cjs
//
// Pre-generates a language pack JSON file for one target locale.
// Mirrors the runtime translateChunk logic in AlloFlowANTI.txt so output
// matches what users would get if they generated live.
//
// Output: lang/<locale_slug>.js (and mirrored to prismflow-deploy/public/lang/)
// AlloFlow's runtime first checks GitHub /lang/<slug>.js — if a pack exists
// there, NO API call is made when a user picks that language. Result: faster
// load, zero per-user API cost, consistent translations across all users.
//
// Usage:
//   node dev-tools/build_language_pack.cjs --lang="Spanish (Latin America)"
//   node dev-tools/build_language_pack.cjs --lang=French --api-key=YOUR_KEY
//   GEMINI_API_KEY=... node dev-tools/build_language_pack.cjs --lang=Vietnamese
//   node dev-tools/build_language_pack.cjs --lang=Spanish --resume   # skip cached chunks
//   node dev-tools/build_language_pack.cjs --lang=Spanish --dry-run  # no API calls
//
// Concurrency, chunk size, and model match the runtime (200 keys / 3 parallel /
// gemini-3-flash-preview). Expect 30-90 seconds per language.
// =============================================================================

const fs = require('fs');
const path = require('path');

// ─── Args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const flag = '--' + name + '=';
  const found = argv.find(a => a.startsWith(flag));
  return found ? found.slice(flag.length) : (argv.includes('--' + name) ? true : fallback);
}
const TARGET_LANG = arg('lang', null);
const API_KEY = arg('api-key', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const MODEL = arg('model', 'gemini-3-flash-preview');
const CHUNK_SIZE = parseInt(arg('chunk-size', 200), 10);
const CONCURRENCY = parseInt(arg('concurrency', 3), 10);
const DRY_RUN = !!arg('dry-run', false);
const RESUME = !!arg('resume', false);
const VERBOSE = !!arg('verbose', false);

if (!TARGET_LANG) {
  console.error('ERROR: Missing --lang. Examples:');
  console.error('  node dev-tools/build_language_pack.cjs --lang="Spanish (Latin America)"');
  console.error('  node dev-tools/build_language_pack.cjs --lang=French');
  console.error('');
  console.error('Recommended languages to build first (covers ~95% of US ELL families):');
  console.error('  Spanish (Latin America), Spanish (Castilian),');
  console.error('  Chinese (Simplified), Vietnamese, Arabic, Tagalog, Russian,');
  console.error('  Portuguese (Brazil), Somali, Haitian Creole, French');
  process.exit(1);
}

if (!API_KEY && !DRY_RUN) {
  console.error('ERROR: No API key. Pass --api-key=... or set GEMINI_API_KEY env var.');
  console.error('Get a key at https://aistudio.google.com/app/apikey');
  process.exit(1);
}

// ─── Project paths ───────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const UI_STRINGS_PATH = path.join(ROOT, 'ui_strings.js');
const HELP_STRINGS_PATH = path.join(ROOT, 'help_strings.js');
const GLOSSARY_PATH = path.join(ROOT, 'translation_glossary.js');
const LANG_DIR = path.join(ROOT, 'lang');
const DEPLOY_LANG_DIR = path.join(ROOT, 'prismflow-deploy', 'public', 'lang');

if (!fs.existsSync(LANG_DIR)) fs.mkdirSync(LANG_DIR, { recursive: true });
if (!fs.existsSync(DEPLOY_LANG_DIR)) fs.mkdirSync(DEPLOY_LANG_DIR, { recursive: true });

// ─── Load source files ───────────────────────────────────────────────────────
function loadJsObject(filepath) {
  // Handles plain JSON + JS object literals with single-quoted keys + comment lines
  const raw = fs.readFileSync(filepath, 'utf8');
  const cleaned = raw.replace(/^\s*\/\/.*$/gm, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  try { return new Function('return ' + cleaned)(); } catch (e) {
    throw new Error('Failed to parse ' + filepath + ': ' + e.message);
  }
}
console.log('Loading source files...');
const UI_STRINGS = loadJsObject(UI_STRINGS_PATH);
const HELP_STRINGS = loadJsObject(HELP_STRINGS_PATH);
const GLOSSARY = loadJsObject(GLOSSARY_PATH);

// ─── Flatten / unflatten (mirror utils_pure_module.js) ──────────────────────
function flattenObject(obj, prefix) {
  prefix = prefix || '';
  return Object.keys(obj).reduce(function (acc, k) {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}
function unflattenObject(data) {
  const result = {};
  for (const i in data) {
    const keys = i.split('.');
    keys.reduce(function (acc, key, idx) {
      if (idx === keys.length - 1) { acc[key] = data[i]; return null; }
      if (typeof acc[key] !== 'object' || acc[key] === null) acc[key] = {};
      return acc[key];
    }, result);
  }
  return result;
}
function chunkObject(obj, maxKeys) {
  const keys = Object.keys(obj);
  const chunks = [];
  let cur = {};
  let count = 0;
  keys.forEach(function (key, i) {
    cur[key] = obj[key];
    count++;
    if (count >= maxKeys || i === keys.length - 1) {
      chunks.push(cur);
      cur = {};
      count = 0;
    }
  });
  return chunks;
}

// ─── DNT mask/unmask (mirrors AlloFlowANTI.txt _maskDNT / _unmaskDNT) ───────
const DNT_REGEX_PATTERNS = [
  /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,
  /\d+(\.\d+)?(MB|KB|GB|cm|mm|km|kg|°C|°F|fps|Hz|ms|nm|μm|AU|ly)\b/g,
  /v\d+(\.\d+)?/g,
  /#[A-Fa-f0-9]{3,8}\b/g,
  /https?:\/\/[^\s\)\]]+/g
];
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function maskDNT(strings, glossary) {
  const tokens = [];
  const dntTerms = (glossary && glossary.DO_NOT_TRANSLATE) || [];
  const sortedTerms = dntTerms.slice().sort(function (a, b) { return b.length - a.length; });
  function maskOne(str) {
    if (typeof str !== 'string') return str;
    let masked = str;
    DNT_REGEX_PATTERNS.forEach(function (re) {
      masked = masked.replace(re, function (m) {
        const id = tokens.length;
        tokens.push(m);
        return '‹dnt:' + id + '›';
      });
    });
    sortedTerms.forEach(function (term) {
      const re = new RegExp('\\b' + escapeRe(term) + '\\b', 'gi');
      masked = masked.replace(re, function (m) {
        const id = tokens.length;
        tokens.push(m);
        return '‹dnt:' + id + '›';
      });
    });
    return masked;
  }
  const result = {};
  for (const k in strings) result[k] = maskOne(strings[k]);
  return { masked: result, tokens: tokens };
}
function unmaskDNT(strings, tokens) {
  function unmaskOne(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/‹dnt:(\d+)›/g, function (m, id) {
      const tok = tokens[parseInt(id, 10)];
      return tok !== undefined ? tok : m;
    });
  }
  const result = {};
  for (const k in strings) result[k] = unmaskOne(strings[k]);
  return result;
}
function buildGlossaryPreamble(glossary, targetLanguage) {
  if (!glossary || !glossary.DOMAIN_GLOSSARY) return '';
  const entries = [];
  const groups = glossary.DOMAIN_GLOSSARY;
  for (const groupKey in groups) {
    for (const term in groups[groupKey]) {
      entries.push('  - "' + term + '" — ' + groups[groupKey][term]);
    }
  }
  if (entries.length === 0) return '';
  return [
    'DOMAIN GLOSSARY — translate these English terms consistently. Use the standard ' + targetLanguage + ' equivalent for K-12 special education. If a term is a proper noun, brand, or acronym, keep it verbatim.',
    entries.join('\n'),
    ''
  ].join('\n');
}

// ─── API call ────────────────────────────────────────────────────────────────
function safeJsonParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }

async function callGemini(prompt, attempt) {
  attempt = attempt || 1;
  if (DRY_RUN) {
    // In dry-run we don't call the API; we just echo the input back so the
    // pipeline structure can be verified end-to-end without spending tokens.
    const start = prompt.indexOf('INPUT JSON:\n');
    if (start < 0) return '{}';
    return prompt.slice(start + 'INPUT JSON:\n'.length);
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + API_KEY;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await resp.json();
  if (!resp.ok) {
    if ((resp.status === 429 || resp.status >= 500) && attempt < 5) {
      const wait = 2000 * Math.min(attempt, 5);
      console.log('  rate-limit/server error, retrying in ' + wait + 'ms...');
      await new Promise(r => setTimeout(r, wait));
      return callGemini(prompt, attempt + 1);
    }
    throw new Error('Gemini API error ' + resp.status + ': ' + JSON.stringify(body).slice(0, 300));
  }
  return body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts && body.candidates[0].content.parts[0] && body.candidates[0].content.parts[0].text;
}

async function translateChunk(chunkData, idx) {
  const { masked, tokens } = maskDNT(chunkData, GLOSSARY);
  const glossaryPreamble = buildGlossaryPreamble(GLOSSARY, TARGET_LANG);
  const prompt = [
    'You are a UI translator for AlloFlow, a K-12 special-education web app that supports Universal Design for Learning (UDL), social-emotional learning (SEL), Response to Intervention (RTI), and Individualized Education Programs (IEP). Your audience is teachers, school psychologists, and students.',
    '',
    'TRANSLATE the JSON values into ' + TARGET_LANG + '. Use the locale\'s standard special-education and pedagogical terminology. Keep a clear, professional, learner-friendly tone — short imperatives for buttons, full sentences for help text.',
    '',
    'RULES — these are strict, the output will be auto-validated:',
    '  1. Keep all JSON keys IDENTICAL. Do not translate keys.',
    '  2. Preserve every ‹dnt:N› token EXACTLY as you see it. Do not translate, reorder, or modify these tokens. They mark do-not-translate values that will be restored after translation.',
    '  3. Preserve all markdown syntax: **bold**, ### headings, * bullets, • bullets, line breaks (\\n), numbered lists, code in `backticks`. Translate the text inside the markdown, not the syntax itself.',
    '  4. Preserve all parameter placeholders like {name}, {count}, {grade} EXACTLY. Do not translate the word inside the braces, do not add or remove braces.',
    '  5. Preserve units (cm, °C, MB, fps) and version tags (v1, v2.3) and brand names verbatim.',
    '  6. For UI controls (buttons, labels, menu items), prefer the shortest natural ' + TARGET_LANG + ' equivalent. Translated text should not be more than ~30% longer than the source.',
    '  7. Return ONLY valid JSON. No prose, no markdown fences, no leading or trailing whitespace, no commentary.',
    '',
    glossaryPreamble,
    'INPUT JSON:',
    JSON.stringify(masked)
  ].filter(Boolean).join('\n');

  let text;
  try {
    text = await callGemini(prompt);
  } catch (e) {
    console.log('  chunk ' + idx + ': API failure: ' + e.message);
    return null;
  }
  let parsed = safeJsonParse(text);
  if (!parsed) {
    // Repair attempt
    console.log('  chunk ' + idx + ': JSON parse failed, attempting repair...');
    const repairPrompt = 'The following JSON is malformed. Fix syntax errors. Return ONLY valid JSON.\n\n' + text;
    const repaired = await callGemini(repairPrompt);
    parsed = safeJsonParse(repaired);
  }
  if (!parsed) {
    console.log('  chunk ' + idx + ': irrecoverable parse error');
    return null;
  }
  return unmaskDNT(parsed, tokens);
}

// ─── Main ────────────────────────────────────────────────────────────────────
function localeSlug(lang) {
  return lang.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Building language pack: ' + TARGET_LANG);
  console.log(' Model: ' + MODEL + (DRY_RUN ? ' (DRY RUN — no API calls)' : ''));
  console.log('═══════════════════════════════════════════════════════');

  // Build the flat set of strings to translate (UI + help)
  const helpFlat = {};
  Object.keys(HELP_STRINGS).forEach(function (k) { helpFlat['help_mode.' + k] = HELP_STRINGS[k]; });
  const flatStrings = Object.assign({}, flattenObject(UI_STRINGS), helpFlat);
  const totalKeys = Object.keys(flatStrings).length;
  console.log('Source strings: ' + totalKeys + ' keys');

  const chunks = chunkObject(flatStrings, CHUNK_SIZE);
  console.log('Chunks: ' + chunks.length + ' × ' + CHUNK_SIZE + ' keys (' + CONCURRENCY + ' parallel)');
  console.log('');

  const slug = localeSlug(TARGET_LANG);
  const outPath = path.join(LANG_DIR, slug + '.js');
  const deployOutPath = path.join(DEPLOY_LANG_DIR, slug + '.js');
  const checkpointPath = path.join(LANG_DIR, '.' + slug + '.checkpoint.json');

  // Load checkpoint if resuming
  let accumulated = {};
  let completedChunks = new Set();
  if (RESUME && fs.existsSync(checkpointPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      accumulated = cp.accumulated || {};
      completedChunks = new Set(cp.completedChunks || []);
      console.log('Resuming: ' + completedChunks.size + ' chunks already done');
    } catch (e) { console.log('Checkpoint corrupt, starting fresh: ' + e.message); }
  }

  const startTime = Date.now();
  let failedChunks = 0;
  for (let w = 0; w < chunks.length; w += CONCURRENCY) {
    const window = chunks.slice(w, w + CONCURRENCY).map(function (chunk, j) {
      return { chunk: chunk, idx: w + j };
    }).filter(function (it) { return !completedChunks.has(it.idx); });

    if (window.length === 0) continue;

    const pct = Math.round((w / chunks.length) * 100);
    console.log('[' + pct + '%] Translating chunks ' + (window[0].idx + 1) + '-' + (window[window.length - 1].idx + 1) + ' of ' + chunks.length);

    const results = await Promise.all(window.map(function (it) {
      return translateChunk(it.chunk, it.idx);
    }));

    for (let j = 0; j < window.length; j++) {
      const it = window[j];
      const res = results[j];
      if (res) {
        Object.assign(accumulated, res);
        completedChunks.add(it.idx);
      } else {
        failedChunks++;
        console.log('  chunk ' + (it.idx + 1) + ' failed; can re-run with --resume to retry just that chunk');
      }
    }

    // Save checkpoint every window
    fs.writeFileSync(checkpointPath, JSON.stringify({
      accumulated: accumulated,
      completedChunks: Array.from(completedChunks),
      total: chunks.length,
      lang: TARGET_LANG,
      ts: new Date().toISOString()
    }, null, 0));

    if (w + CONCURRENCY < chunks.length) await new Promise(r => setTimeout(r, 300));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('');
  console.log('Translation complete in ' + elapsed + 's');

  // Validate coverage
  const outKeys = Object.keys(accumulated).length;
  const coverage = totalKeys > 0 ? (outKeys / totalKeys * 100).toFixed(1) : 0;
  console.log('Coverage: ' + outKeys + ' / ' + totalKeys + ' keys (' + coverage + '%)');
  if (outKeys < totalKeys * 0.9) {
    console.log('');
    console.log('⚠️  Coverage below 90%. ' + failedChunks + ' chunks failed.');
    console.log('   Re-run with --resume to retry failed chunks:');
    console.log('     node dev-tools/build_language_pack.cjs --lang="' + TARGET_LANG + '" --resume');
    console.log('');
  }

  // Build final nested pack
  const pack = unflattenObject(accumulated);
  const json = JSON.stringify(pack, null, 2);

  // Write to lang/ + prismflow-deploy/public/lang/
  fs.writeFileSync(outPath, json);
  fs.writeFileSync(deployOutPath, json);

  console.log('Wrote:');
  console.log('  ' + path.relative(ROOT, outPath) + ' (' + (json.length / 1024).toFixed(1) + ' KB)');
  console.log('  ' + path.relative(ROOT, deployOutPath));

  // Clean up checkpoint if complete
  if (outKeys >= totalKeys * 0.9 && fs.existsSync(checkpointPath)) {
    fs.unlinkSync(checkpointPath);
  }

  // Spot-check: validate placeholders survived
  const placeholderRe = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;
  let placeholderDrift = 0;
  for (const k in flatStrings) {
    const src = flatStrings[k];
    const out = accumulated[k];
    if (typeof src !== 'string' || typeof out !== 'string') continue;
    const srcPh = (src.match(placeholderRe) || []).sort().join(',');
    const outPh = (out.match(placeholderRe) || []).sort().join(',');
    if (srcPh !== outPh) {
      placeholderDrift++;
      if (placeholderDrift <= 3 && VERBOSE) {
        console.log('  placeholder drift in key "' + k + '": src=[' + srcPh + '] out=[' + outPh + ']');
      }
    }
  }
  if (placeholderDrift > 0) {
    console.log('⚠️  Placeholder drift in ' + placeholderDrift + ' keys (rerun --verbose to see first 3)');
  } else {
    console.log('✓ All {placeholders} preserved');
  }

  console.log('');
  console.log('Next steps:');
  console.log('  1. Spot-check the output: head -50 ' + path.relative(ROOT, outPath));
  console.log('  2. Push to GitHub so runtime users get it without API calls:');
  console.log('     git add ' + path.relative(ROOT, outPath) + ' ' + path.relative(ROOT, deployOutPath));
  console.log('     git commit -m "lang: ' + TARGET_LANG + ' pack (' + outKeys + ' keys)"');
  console.log('     git push');
  console.log('  3. Or: run --dry-run first to verify the pipeline shape without API calls.');
  console.log('');
}

main().catch(function (e) {
  console.error('FATAL:', e);
  process.exit(1);
});
