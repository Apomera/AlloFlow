#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ENGLISH_ADDITIONS, LANGUAGE_CODES, isMainUiKey, isAlloBotKey } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_PATH = path.join(ROOT, 'ui_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const PUBLIC_LANG_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const TRANSLATE = process.argv.includes('--translate');
const REGISTRY_ONLY = process.argv.includes('--registry-only');
const ALLOBOT_ONLY = process.argv.includes('--allobot-only');
const SIBLING_REUSE = process.argv.includes('--sibling-reuse');
const SUPPORTED_ONLY = process.argv.includes('--supported-only');
const requestedLanguage = (process.argv.find((arg) => arg.startsWith('--lang=')) || '').slice(7);
const reviewedFileArg = (process.argv.find((arg) => arg.startsWith('--reviewed-file=')) || '').slice(16);
const provider = ((process.argv.find((arg) => arg.startsWith('--provider=')) || '--provider=google').slice(11) || 'google').toLowerCase();
const nllbEndpoint = ((process.argv.find((arg) => arg.startsWith('--endpoint=')) || '--endpoint=https://winstxnhdw-nllb-api.hf.space').slice(11)).replace(/\/$/, '');
const translationApiKey = (process.argv.find((arg) => arg.startsWith('--api-key=')) || '--api-key=').slice(10)
  || process.env.GOOGLE_TRANSLATE_API_KEY
  || process.env.GOOGLE_API_KEY
  || '';
const concurrency = Math.max(1, Number((process.argv.find((arg) => arg.startsWith('--concurrency=')) || '--concurrency=1').slice(14)) || 1);
const batchDelayMs = Math.max(0, Number((process.argv.find((arg) => arg.startsWith('--batch-delay=')) || '--batch-delay=1200').slice(14)) || 0);
const rateRetries = Math.max(1, Number((process.argv.find((arg) => arg.startsWith('--rate-retries=')) || '--rate-retries=4').slice(15)) || 4);
const rateDelayMs = Math.max(1000, Number((process.argv.find((arg) => arg.startsWith('--rate-delay=')) || '--rate-delay=30000').slice(13)) || 30000);
const SUPPORTED_PROVIDERS = new Set(['google', 'google-cloud', 'mymemory', 'nllb-space']);
// Only exact FLORES-200 language matches belong here. Deliberately omit packs
// such as Hakha/Falam Chin, Hmong, S'gaw Karen, Latin, Maay Maay, and
// Marshallese instead of silently substituting a neighboring language.
const NLLB_LANGUAGE_CODES = {
  amharic: 'amh_Ethi', arabic: 'arb_Arab', bengali: 'ben_Beng', burmese: 'mya_Mymr',
  chinese_simplified: 'zho_Hans', chinese_traditional: 'zho_Hant', dari: 'prs_Arab',
  dutch: 'nld_Latn', esperanto: 'epo_Latn', farsi: 'pes_Arab', french: 'fra_Latn',
  french_canadian: 'fra_Latn', german: 'deu_Latn', greek: 'ell_Grek', gujarati: 'guj_Gujr',
  haitian_creole: 'hat_Latn', hausa: 'hau_Latn', hebrew: 'heb_Hebr', hindi: 'hin_Deva',
  igbo: 'ibo_Latn', indonesian: 'ind_Latn', italian: 'ita_Latn', japanese: 'jpn_Jpan',
  kannada: 'kan_Knda', khmer: 'khm_Khmr', kinyarwanda: 'kin_Latn', kirundi: 'run_Latn',
  korean: 'kor_Hang', lao: 'lao_Laoo', lingala: 'lin_Latn', malayalam: 'mal_Mlym',
  marathi: 'mar_Deva', nepali: 'npi_Deva', pashto: 'pbt_Arab', polish: 'pol_Latn',
  portuguese_angola: 'por_Latn', portuguese_brazil: 'por_Latn', portuguese_portugal: 'por_Latn',
  punjabi: 'pan_Guru', romanian: 'ron_Latn', russian: 'rus_Cyrl', somali: 'som_Latn',
  spanish_castilian: 'spa_Latn', spanish_latin_america: 'spa_Latn', swahili: 'swh_Latn',
  tagalog: 'tgl_Latn', tamil: 'tam_Taml', telugu: 'tel_Telu', thai: 'tha_Thai',
  tigrinya: 'tir_Ethi', turkish: 'tur_Latn', ukrainian: 'ukr_Cyrl', urdu: 'urd_Arab',
  vietnamese: 'vie_Latn', yoruba: 'yor_Latn',
};
const SIBLING_PACKS = {
  french: ['french_canadian'],
  french_canadian: ['french'],
  portuguese_angola: ['portuguese_portugal', 'portuguese_brazil'],
  portuguese_brazil: ['portuguese_portugal', 'portuguese_angola'],
  portuguese_portugal: ['portuguese_brazil', 'portuguese_angola'],
  spanish_castilian: ['spanish_latin_america'],
  spanish_latin_america: ['spanish_castilian'],
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value, space = 2) => {
  const temporary = `${file}.i18n-tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, space) + '\n', 'utf8');
  try {
    fs.renameSync(temporary, file);
  } catch (_) {
    // OneDrive can briefly deny a same-volume rename while indexing a large
    // pack. A direct copy still replaces the intended explicit file and lets
    // us remove the verified temporary artifact afterward.
    fs.copyFileSync(temporary, file);
    try { fs.unlinkSync(temporary); } catch (__) { /* best-effort cleanup */ }
  }
};

function mergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      mergeMissing(target[key], value);
    } else if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
}

function setPath(target, dotted, value) {
  const parts = dotted.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts.at(-1)] = value;
}

const placeholders = (value) => (String(value).match(/\{[^{}]+\}/g) || []).sort();

function buildTranslationMemory(englishFlat, packFlat) {
  const choices = new Map();
  for (const [key, translated] of Object.entries(packFlat)) {
    const english = englishFlat[key];
    if (typeof english !== 'string' || typeof translated !== 'string' || !translated.trim() || translated === english) continue;
    if (!choices.has(english)) choices.set(english, new Map());
    const counts = choices.get(english);
    counts.set(translated, (counts.get(translated) || 0) + 1);
  }
  const memory = new Map();
  for (const [english, counts] of choices) {
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) memory.set(english, ranked[0][0]);
  }
  return memory;
}

function maskProtected(text) {
  const values = [];
  const masked = text.replace(/\{[^{}]+\}|https?:\/\/[^\s)]+|\b(?:[\w-]+\.)+(?:com|org|net|ai|io)\b|·/gi, (match) => {
    const token = `XPH${String(values.length).padStart(3, '0')}X`;
    values.push(match);
    return token;
  });
  return { masked, restore: (translated) => values.reduce((result, value, index) => result.replaceAll(`XPH${String(index).padStart(3, '0')}X`, value), translated) };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function googleRequest(text, targetCode) {
  let lastError;
  for (let attempt = 0; attempt < rateRetries; attempt += 1) {
    try {
      const body = new URLSearchParams({ client: 'gtx', sl: 'en', tl: targetCode, dt: 't', q: text });
      const response = await fetch('https://translate.googleapis.com/translate_a/single', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429) {
        await delay(rateDelayMs);
        lastError = new Error('HTTP 429');
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const translated = Array.isArray(payload?.[0]) ? payload[0].map((part) => part?.[0] || '').join('') : '';
      if (!translated) throw new Error('empty translation');
      return translated;
    } catch (error) {
      lastError = error;
      await delay(300 * (2 ** attempt));
    }
  }
  throw lastError;
}

// Official Google Cloud Translation Basic API provider. This is opt-in so a
// normal coverage/report run never transmits source text. Set
// GOOGLE_TRANSLATE_API_KEY (or pass --api-key=) and use --provider=google-cloud.
async function googleCloudRequest(text, targetCode) {
  if (!translationApiKey) throw new Error('google-cloud provider requires GOOGLE_TRANSLATE_API_KEY or --api-key=');
  let lastError;
  for (let attempt = 0; attempt < rateRetries; attempt += 1) {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(translationApiKey)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'en', target: targetCode, format: 'text' }),
        signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429 || response.status >= 500) {
        await delay(rateDelayMs);
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
      const payload = await response.json();
      const translated = payload?.data?.translations?.[0]?.translatedText;
      if (typeof translated !== 'string' || !translated.trim()) throw new Error('empty translation');
      return translated;
    } catch (error) {
      lastError = error;
      await delay(300 * (2 ** attempt));
    }
  }
  throw lastError;
}

async function myMemoryRequest(text, targetCode) {
  let lastError;
  for (let attempt = 0; attempt < rateRetries; attempt += 1) {
    try {
      const query = new URLSearchParams({ q: text, langpair: `en|${targetCode}`, mt: '1' });
      const response = await fetch(`https://api.mymemory.translated.net/get?${query}`, {
        signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        await delay(rateDelayMs);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
      const payload = await response.json();
      const responseStatus = Number(payload?.responseStatus || 200);
      if (responseStatus >= 400) {
        throw new Error(`MyMemory ${responseStatus}: ${String(payload?.responseDetails || 'request failed').slice(0, 240)}`);
      }
      const translated = payload?.responseData?.translatedText;
      if (typeof translated !== 'string' || !translated.trim()) throw new Error('empty translation');
      return translated;
    } catch (error) {
      lastError = error;
      await delay(300 * (2 ** attempt));
    }
  }
  throw lastError;
}

async function nllbRequest(text, targetCode) {
  let lastError;
  for (let attempt = 0; attempt < rateRetries; attempt += 1) {
    try {
      const response = await fetch(`${nllbEndpoint}/v4/translator`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, source: 'eng_Latn', target: targetCode }),
        signal: AbortSignal.timeout(120000),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        await delay(rateDelayMs);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
      const translated = (await response.json())?.result;
      if (typeof translated !== 'string' || !translated.trim()) throw new Error('empty translation');
      return translated;
    } catch (error) {
      lastError = error;
      await delay(300 * (2 ** attempt));
    }
  }
  throw lastError;
}

async function translationRequest(text, targetCode) {
  if (provider === 'google-cloud') return googleCloudRequest(text, targetCode);
  if (provider === 'mymemory') return myMemoryRequest(text, targetCode);
  if (provider === 'nllb-space') return nllbRequest(text, targetCode);
  return googleRequest(text, targetCode);
}

function makeBatches(entries, maxBytes = provider === 'mymemory' ? 420 : provider === 'nllb-space' ? 3200 : 4200) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const entry of entries) {
    const cost = Buffer.byteLength(entry.masked, 'utf8') + 16;
    if (current.length && size + cost > maxBytes) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += cost;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateBatch(batch, targetCode) {
  const nllbMarkers = provider === 'nllb-space';
  const marked = batch.map((entry, index) => nllbMarkers
    ? `K${String(index).padStart(4, '0')}: ${entry.masked}`
    : `[[K${String(index).padStart(4, '0')}]] ${entry.masked}`).join('\n');
  const result = await translationRequest(marked, targetCode);
  const found = new Map();
  const marker = nllbMarkers
    ? /K(\d{4}):\s*([\s\S]*?)(?=\s+K\d{4}:|$)/g
    : /\[\[K(\d{4})\]\]\s*([\s\S]*?)(?=\r?\n?\[\[K\d{4}\]\]|$)/g;
  for (const match of result.matchAll(marker)) found.set(Number(match[1]), match[2].trim());
  if (found.size === batch.length) return batch.map((entry, index) => entry.restore(found.get(index)));
  const singles = [];
  for (const entry of batch) singles.push(entry.restore(await translationRequest(entry.masked, targetCode)));
  return singles;
}

async function mapLimit(items, limit, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported provider: ${provider}. Use google, google-cloud, mymemory, or nllb-space.`);
  }
  if (SUPPORTED_ONLY && provider !== 'nllb-space') {
    throw new Error('--supported-only currently applies only to --provider=nllb-space.');
  }
  const ui = readJson(UI_PATH);
  mergeMissing(ui, ENGLISH_ADDITIONS);
  if (APPLY) writeJson(UI_PATH, ui);
  const reviewedByLanguage = reviewedFileArg
    ? readJson(path.resolve(ROOT, reviewedFileArg))
    : {};

  const englishFlat = flatten(ui);
  const targetEntries = Object.entries(englishFlat).filter(([key, value]) => {
    if (typeof value !== 'string') return false;
    return ALLOBOT_ONLY ? isAlloBotKey(key) : isMainUiKey(key);
  });
  const knownLanguage = !requestedLanguage || Object.hasOwn(LANGUAGE_CODES, requestedLanguage);
  if (!knownLanguage) throw new Error(`Unknown language pack: ${requestedLanguage}`);
  const languages = Object.entries(LANGUAGE_CODES).filter(([slug]) => {
    if (requestedLanguage && slug !== requestedLanguage) return false;
    return !SUPPORTED_ONLY || Boolean(NLLB_LANGUAGE_CODES[slug]);
  });
  if (requestedLanguage && !languages.length) throw new Error(`No exact FLORES-200 mapping for language pack: ${requestedLanguage}`);

  console.log(`${targetEntries.length} ${ALLOBOT_ONLY ? 'AlloBot' : 'main-UI'} keys; ${languages.length} language packs; apply=${APPLY}; translate=${TRANSLATE}; provider=${provider}`);
  if (REGISTRY_ONLY) return;

  const failures = [];
  await mapLimit(languages, concurrency, async ([slug, targetCode]) => {
    try {
    if (TRANSLATE && provider === 'nllb-space') {
      if (!NLLB_LANGUAGE_CODES[slug]) throw new Error('no exact FLORES-200 language mapping');
      targetCode = NLLB_LANGUAGE_CODES[slug];
    }
    const rootFile = path.join(LANG_DIR, `${slug}.js`);
    const mirrorFile = path.join(PUBLIC_LANG_DIR, `${slug}.js`);
    const originalText = fs.readFileSync(rootFile, 'utf8');
    let mirrorText = fs.readFileSync(mirrorFile, 'utf8');
    if (originalText !== mirrorText) {
      const pendingMirror = `${mirrorFile}.i18n-tmp`;
      const recoverable = fs.existsSync(pendingMirror)
        && fs.readFileSync(pendingMirror, 'utf8') === originalText;
      if (!recoverable) throw new Error('root/public mirror drift must be resolved before syncing');
      fs.copyFileSync(pendingMirror, mirrorFile);
      try { fs.unlinkSync(pendingMirror); } catch (_) { /* best-effort cleanup */ }
      mirrorText = originalText;
    }
    const indent = originalText.match(/^\{\r?\n([ \t]+)"/)?.[1] || '  ';
    const pack = JSON.parse(originalText);
    const packFlat = flatten(pack);
    const memory = buildTranslationMemory(englishFlat, packFlat);
    const siblingFlats = SIBLING_REUSE
      ? (SIBLING_PACKS[slug] || []).map((sibling) => flatten(readJson(path.join(LANG_DIR, `${sibling}.js`))))
      : [];
    const missing = [];
    let reused = 0;
    let siblingReused = 0;
    let reviewed = 0;
    const reviewedForPack = reviewedByLanguage[slug] || {};

    for (const [key, english] of targetEntries) {
      const current = packFlat[key];
      // Existing values belong to the pack owner, even when a product name or
      // deliberate fallback happens to match English. Only fill absent/blank
      // keys so re-running this sync is idempotent and never churns reviewed text.
      if (typeof current === 'string' && current.trim()) continue;
      const reviewedValue = reviewedForPack[key];
      if (reviewedValue !== undefined) {
        if (typeof reviewedValue !== 'string' || !reviewedValue.trim()) {
          throw new Error(`invalid reviewed translation for ${key}`);
        }
        if (placeholders(reviewedValue).join('|') !== placeholders(english).join('|')) {
          throw new Error(`reviewed placeholder mismatch for ${key}`);
        }
        setPath(pack, key, reviewedValue);
        reviewed += 1;
        continue;
      }
      const siblingValue = siblingFlats
        .map((sibling) => sibling[key])
        .find((value) => typeof value === 'string'
          && value.trim()
          && value !== english
          && placeholders(value).join('|') === placeholders(english).join('|'));
      if (siblingValue) {
        setPath(pack, key, siblingValue);
        siblingReused += 1;
        continue;
      }
      const known = memory.get(english);
      if (known) {
        setPath(pack, key, known);
        reused += 1;
      } else {
        const protectedText = maskProtected(english);
        missing.push({ key, english, ...protectedText });
      }
    }

    if (missing.length && TRANSLATE) {
      const batches = makeBatches(missing);
      let offset = 0;
      for (const batch of batches) {
        const translated = await translateBatch(batch, targetCode);
        translated.forEach((value, index) => {
          if (typeof value !== 'string' || !value.trim()) throw new Error(`empty translation for ${batch[index].key}`);
          if (placeholders(value).join('|') !== placeholders(batch[index].english).join('|')) {
            throw new Error(`placeholder mismatch for ${batch[index].key}`);
          }
          setPath(pack, batch[index].key, value);
        });
        offset += batch.length;
        if (offset % 100 < batch.length) console.log(`${slug}: translated ${offset}/${missing.length}`);
        await delay(batchDelayMs);
      }
    }

    // Exact in-pack translation-memory matches are useful even when no
    // external provider is available. Persist those independently; a failed
    // provider request throws before reaching this write, so partial remote
    // batches are never committed.
    if (APPLY && (reviewed > 0 || reused > 0 || siblingReused > 0 || (TRANSLATE && missing.length > 0))) {
      writeJson(rootFile, pack, indent);
      writeJson(mirrorFile, pack, indent);
    }
      console.log(`${slug}: reviewed=${reviewed}, reused=${reused}, sibling=${siblingReused}, ${TRANSLATE ? 'translated' : 'missing'}=${missing.length}`);
    } catch (error) {
      failures.push({ slug, targetCode, error: error?.message || String(error) });
      console.error(`${slug}: FAILED (${targetCode}) ${error?.message || error}`);
    }
  });
  if (failures.length) {
    console.error(`Failed language packs: ${failures.map((item) => `${item.slug}:${item.targetCode}`).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
