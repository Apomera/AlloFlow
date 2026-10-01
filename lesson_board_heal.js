import { ICONS, THEMES, GOALS, validateBoard } from './lesson_board_engine.js';
// AI replies are read tolerantly and repaired deterministically before any
// second AI call. Repairs never invent lesson facts: excerpts are only ever
// replaced by real lesson text, and anything unfixable is left for validation.
const UNSAFE = new Set(['__proto__', 'constructor', 'prototype']);
const QUOTES = { '"': ['"'], "'": ["'"], '\u201c': ['\u201d', '"'], '\u201e': ['\u201d', '\u201c', '"'], '\u2018': ['\u2019', "'"], '`': ['`'] };
const CLOSERS = new Set([',', '}', ']', ':']);
const LITERALS = new Map([['true', true], ['false', false], ['null', null], ['True', true], ['False', false], ['None', null], ['undefined', null], ['NaN', null]]);
const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
const list = v => Array.isArray(v) ? v : [];
const jsonError = code => Object.assign(Error('The AI reply could not be read as a board.'), { code: 'board-json-' + code });

function lenient(s, start) {
  let i = start, orphans = 0; const notes = new Set(), MISSING = Symbol('missing');
  const end = () => i >= s.length;
  const space = () => { for (;;) { while (i < s.length && /[\s\u00a0\ufeff]/.test(s[i])) i++; if (s[i] === '/' && s[i + 1] === '/') { const next = s.indexOf('\n', i); i = next < 0 ? s.length : next + 1; notes.add('comments'); } else if (s[i] === '/' && s[i + 1] === '*') { const next = s.indexOf('*/', i + 2); i = next < 0 ? s.length : next + 2; notes.add('comments'); } else return; } };
  const sticky = (re) => { re.lastIndex = i; const m = re.exec(s); return m ? m[0] : ''; };
  function string(key) {
    const open = s[i], closes = QUOTES[open]; i++; if (open !== '"') notes.add('quotes');
    let out = '';
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        const n = s[i + 1]; if (n === undefined) { i++; break; }
        const hex = n === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6)), map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', "'": "'", '\\': '\\', '/': '/' };
        if (hex) { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16)); i += 6; } else if (map[n] !== undefined) { out += map[n]; i += 2; } else { out += '\\' + n; i += 2; notes.add('escapes'); }
        continue;
      }
      if (closes.includes(c)) {
        // A quote ends the string only when JSON structure continues after it.
        let j = i + 1; while (j < s.length && /[ \t\r\n]/.test(s[j])) j++;
        const next = s[j], newline = /[\r\n]/.test(s.slice(i + 1, j));
        if (j >= s.length || CLOSERS.has(next) && (next !== ':' || key) || newline && QUOTES[next]) { i++; return out; }
        notes.add('inner-quotes'); out += c; i++; continue;
      }
      if (c === '\n' || c === '\r' || c === '\t') notes.add('control');
      out += c; i++;
    }
    notes.add('truncated'); return out;
  }
  function value(depth) {
    if (depth > 64) throw jsonError('deep');
    space(); if (end()) { notes.add('truncated'); return MISSING; }
    const c = s[i];
    if (c === '{') return object(depth);
    if (c === '[') return array(depth);
    if (QUOTES[c]) return string(false);
    if (c === ',' || c === '}' || c === ']') { notes.add('values'); return MISSING; }
    const raw = sticky(/[^,}\]\r\n]*/y), word = raw.trim(); i += raw.length;
    if (!word) throw jsonError('unexpected');
    if (LITERALS.has(word)) { if (!['true', 'false', 'null'].includes(word)) notes.add('literals'); return LITERALS.get(word); }
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(word)) return Number(word);
    notes.add('bare'); return word;
  }
  function object(depth) {
    i++; const out = {};
    for (;;) {
      space(); if (end()) { notes.add('truncated'); return out; }
      if (s[i] === '}') { i++; return out; }
      if (s[i] === ',') { i++; notes.add('commas'); continue; }
      if (s[i] === ']') { i++; notes.add('brackets'); continue; }
      // A value where a key belongs (for example a stop after a stray bracket) is kept for recovery.
      if (s[i] === '{' || s[i] === '[') { const orphan = value(depth + 1); if (orphan !== MISSING) out['_orphan' + orphans++] = orphan; notes.add('orphans'); continue; }
      let name;
      if (QUOTES[s[i]]) name = string(true);
      else { name = sticky(/[A-Za-z_$][\w$-]{0,79}/y); if (!name) throw jsonError('unexpected'); i += name.length; notes.add('keys'); }
      space(); if (end()) { notes.add('truncated'); return out; }
      if (s[i] === ':' || s[i] === '=') i++; else { notes.add('colons'); if (s[i] === ',' || s[i] === '}') continue; }
      const item = value(depth + 1);
      if (item !== MISSING && !UNSAFE.has(name)) out[name] = item;
      space();
      if (s[i] === ',') { i++; space(); if (s[i] === '}') notes.add('commas'); continue; } if (s[i] === '}') { i++; return out; } if (end()) { notes.add('truncated'); return out; }
      notes.add('commas');
    }
  }
  function array(depth) {
    i++; const out = [];
    for (;;) {
      space(); if (end()) { notes.add('truncated'); return out; }
      if (s[i] === ']') { i++; return out; }
      if (s[i] === ',') { i++; notes.add('commas'); continue; }
      if (s[i] === '}') { i++; notes.add('brackets'); return out; }
      const before = i, item = value(depth + 1); if (i === before) throw jsonError('unexpected');
      if (item !== MISSING) out.push(item);
      space();
      if (s[i] === ',') { i++; space(); if (s[i] === ']') notes.add('commas'); continue; } if (s[i] === ']') { i++; return out; } if (end()) { notes.add('truncated'); return out; }
      notes.add('commas');
    }
  }
  return { value: value(0), notes };
}
const boardLike = value => (Array.isArray(value?.locations) ? 20 + value.locations.length : 0) + (Array.isArray(value?.projects) ? 5 : 0) + (typeof value?.title === 'string' ? 2 : 0) + Object.keys(value || {}).length / 100;
function unwrap(value, notes) {
  let result = value;
  if (Array.isArray(result) && isObject(result[0])) { result = result.find(item => isObject(item) && Array.isArray(item.locations)) || result[0]; notes.add('wrapper'); }
  if (isObject(result) && !Array.isArray(result.locations)) { const inner = Object.values(result).find(item => isObject(item) && Array.isArray(item.locations)); if (inner) { result = inner; notes.add('wrapper'); } }
  if (!isObject(result)) throw jsonError('no-object');
  return { value: result, notes: [...notes], truncated: notes.has('truncated') };
}
// Reads one JSON object from an AI reply: fences, prose, comments, trailing or
// missing commas, smart or single quotes, raw newlines and cut-off endings.
export function readBoardJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw jsonError('empty');
  const stripped = text.replace(/^\ufeff/, '').replace(/^\s*```[a-zA-Z]*[ \t]*\r?\n?/, '').replace(/\s*```\s*$/, '').trim();
  try { const strict = JSON.parse(stripped); if (isObject(strict) || Array.isArray(strict)) return unwrap(strict, new Set()); } catch (_) {}
  // Try each plausible start (plus a missing outer brace) and keep the most board-like result.
  const texts = [[stripped, stripped.indexOf('{')], [stripped, stripped.indexOf('[')], ...(/^\s*["']?\w+["']?\s*:/.test(stripped) ? [['{' + stripped, 0]] : [])].filter(([, at]) => at >= 0);
  let failure = jsonError('no-object'), best = null;
  for (const [text, start] of texts) { try { const parsed = lenient(text, start); parsed.notes.add('syntax'); if (text !== stripped) parsed.notes.add('braces'); const read = unwrap(parsed.value, parsed.notes), score = boardLike(read.value); if (!best || score > best.score) best = { ...read, score }; } catch (error) { failure = error; } }
  if (best) { delete best.score; return best; }
  throw failure;
}

const collapse = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const quoted = (quote, source, max) => typeof quote === 'string' && quote.trim() && quote.length <= max && collapse(source).includes(collapse(quote));
const FOLD = { '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'", '\u2032': "'", '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u2033': '"', '\u2013': '-', '\u2014': '-', '\u2012': '-', '\u2015': '-', '\u2212': '-', '\u00a0': ' ' };
const fold = text => [...text].map(c => { const f = FOLD[c] || c.toLowerCase(); return f.length === c.length ? f : c; }).join('');
const cjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
function tokens(text) { const lower = text.toLowerCase(); if (cjk.test(lower)) { const chars = [...lower.replace(/[^\p{L}\p{N}]/gu, '')]; return chars.slice(0, -1).map((c, i) => c + chars[i + 1]); } return lower.match(/[\p{L}\p{N}]+/gu) || []; }
// Returns an exact excerpt of the lesson that supports the quote, or ''.
export function groundQuote(quote, source, max = 650) {
  const text = collapse(source), q = collapse(typeof quote === 'string' ? quote : '');
  if (!text || !q) return '';
  if (q.length <= max && text.includes(q)) return q;
  const loose = fold(text);
  const variants = [q, q.replace(/^["'\u201c\u2018\u00ab]+|["'\u201d\u2019\u00bb]+$/g, ''), q.replace(/^["'\u201c\u2018\u00ab]+|["'\u201d\u2019\u00bb]+$/g, '').replace(/[.\u3002]$/, '')];
  for (const fragment of q.split(/\s*(?:\.\.\.|\u2026)\s*/)) if (fragment.length >= 24) variants.push(fragment);
  for (const variant of variants) { const at = variant.length >= 12 ? loose.indexOf(fold(variant)) : -1; if (at >= 0 && variant.length <= max) return text.slice(at, at + variant.length).trim(); }
  const wanted = tokens(q); if (wanted.length < 2) return '';
  const want = new Set(wanted), spans = [], sentence = /[^.!?\u3002\uff01\uff1f]+[.!?\u3002\uff01\uff1f]*["'\u201d\u2019)]*/g;
  let match; while ((match = sentence.exec(text))) { const start = match.index + (match[0].length - match[0].trimStart().length), part = match[0].trim(); if (part) spans.push([start, start + part.length]); }
  const candidates = [];
  spans.forEach(([a, b], index) => {
    if (b - a <= max) candidates.push([a, b]); else { const words = [...text.slice(a, b).matchAll(/\S+/g)]; for (let w = 0; w < words.length; w += 12) { const first = words[w], last = words[Math.min(words.length - 1, w + 59)]; candidates.push([a + first.index, Math.min(a + last.index + last[0].length, a + first.index + max)]); } }
    for (let extra = 1; extra <= 3 && spans[index + extra]; extra++) { const end = spans[index + extra][1]; if (end - a > max) break; candidates.push([a, end]); }
  });
  let best = null;
  for (const [a, b] of candidates) {
    const found = tokens(text.slice(a, b)); if (!found.length) continue;
    const have = new Set(found), hits = [...want].filter(token => have.has(token)).length, recall = hits / want.size, precision = hits / have.size, score = recall * .75 + precision * .25;
    if (hits >= Math.min(3, want.size) && recall >= .6 && (!best || score > best.score)) best = { score, a, b };
  }
  return best ? text.slice(best.a, best.b).trim() : '';
}

const clip = (value, max) => {
  const raw = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : isObject(value) ? [value.text, value.label, value.name, value.value].find(item => typeof item === 'string') || '' : '';
  if (raw.trim() && raw.length <= max) return raw;
  const plain = raw.replace(/\s+/g, ' ').trim(); if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1), gap = cut.lastIndexOf(' ');
  return (gap > max * .6 ? cut.slice(0, gap) : cut).trimEnd() + '\u2026';
};
const validId = v => typeof v === 'string' && /^[a-z][a-z0-9_-]{0,39}$/.test(v) && !UNSAFE.has(v);
function slug(value, fallback) {
  if (validId(value)) return value;
  const id = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[^a-z]+/, '').replace(/-+$/, '').slice(0, 40);
  return validId(id) ? id : fallback;
}
const unique = (id, used) => { let next = id, n = 2; while (used.has(next)) next = id.slice(0, 36) + '-' + n++; used.add(next); return next; };
const pairOf = (value, max) => {
  const raw = Array.isArray(value) ? value : typeof value === 'number' ? [value, 0] : isObject(value) ? [value[0] ?? value.a ?? value.first, value[1] ?? value.b ?? value.second] : [];
  const next = [0, 1].map(k => Math.max(0, Math.min(max, Math.round(Number(raw[k]) || 0))));
  if (next[0] + next[1] === 0) next[0] = 1;
  return next;
};
const KINDS = { choice: 'choice', 'multiple-choice': 'choice', multiple_choice: 'choice', multiplechoice: 'choice', mcq: 'choice', quiz: 'choice', order: 'order', ordering: 'order', sequence: 'order', sort: 'order', sorting: 'order', settings: 'settings', setting: 'settings', configure: 'settings', configuration: 'settings', controls: 'settings' };
const ICON_WORDS = [['water', /water|river|rain|ocean|sea|lake|wave|flood|ice|cloud/i], ['leaf', /leaf|plant|tree|garden|forest|seed|farm|flower|grow/i], ['book', /book|library|read|story|word|poem|letter|archive|history/i], ['gear', /gear|machine|engine|tool|factory|robot|mechan/i], ['star', /star|space|sky|planet|moon|sun|galax/i], ['home', /home|house|village|town|city|family|shelter/i], ['bridge', /bridge|road|path|route|trail|gate|crossing/i], ['flask', /lab|flask|experiment|chemi|test|measure|reaction/i]];
const iconFor = (value, text, index) => ICONS.includes(value) ? value : (ICON_WORDS.find(([, re]) => re.test(text)) || [ICONS[index % ICONS.length]])[0];
const THEME_WORDS = [['river', /river|ocean|sea|water|lake|coast|island/i], ['space', /space|star|planet|galax|orbit|moon/i], ['workshop', /workshop|lab|factory|machine|engineer|invent|city/i], ['archive', /archive|library|museum|history|ancient|castle|kingdom/i], ['garden', /garden|forest|farm|plant|park|nature|jungle/i]];
function answerIndex(answer, options, fallbacks = []) {
  for (const value of [answer, ...fallbacks]) {
    if (Number.isInteger(value) && value >= 0 && value < options.length) return value;
    if (typeof value === 'string') { const wanted = collapse(value).toLowerCase(), byText = options.findIndex(option => collapse(option).toLowerCase() === wanted); if (byText >= 0) return byText; if (/^\d+$/.test(wanted) && Number(wanted) < options.length) return Number(wanted); if (/^[a-e]$/.test(wanted) && wanted.charCodeAt(0) - 97 < options.length) return wanted.charCodeAt(0) - 97; }
  }
  return Number.isInteger(answer) ? answer : 0;
}
const optionTexts = (raw, max) => list(raw).map(option => clip(option, max));
const flagged = raw => list(raw).findIndex(option => isObject(option) && (option.correct === true || option.isCorrect === true));

// Canonical field names plus the synonyms AIs actually use. Unknown keys that are a
// near-miss spelling of exactly one field are mapped too; a present field always wins.
const FIELDS = {
  board: [['version', 'goal', 'title', 'mission', 'debrief', 'theme', 'resources', 'concepts', 'starts', 'edges', 'locations', 'projects', 'chance', 'discoveries'], { name: 'title', intro: 'mission', story: 'mission', objective: 'mission', reflection: 'debrief', conclusion: 'debrief', summary: 'debrief', setting: 'theme', tokens: 'resources', resourceNames: 'resources', ideas: 'concepts', topics: 'concepts', start: 'starts', startingLocations: 'starts', startLocations: 'starts', paths: 'edges', connections: 'edges', links: 'edges', places: 'locations', stops: 'locations', nodes: 'locations', spaces: 'locations', stations: 'locations', constructions: 'projects', buildings: 'projects', cards: 'discoveries', facts: 'discoveries' }],
  location: [['id', 'name', 'scene', 'instruction', 'explanation', 'sourceQuote', 'conceptId', 'icon', 'kind', 'reward', 'hints', 'options', 'answer', 'items', 'order', 'controls', 'symbol'], { title: 'name', place: 'name', description: 'scene', setting: 'scene', question: 'instruction', prompt: 'instruction', task: 'instruction', challenge: 'instruction', why: 'explanation', rationale: 'explanation', feedback: 'explanation', quote: 'sourceQuote', evidence: 'sourceQuote', excerpt: 'sourceQuote', concept: 'conceptId', type: 'kind', activity: 'kind', rewards: 'reward', tokens: 'reward', clues: 'hints', choices: 'options', correctAnswer: 'answer', correctIndex: 'answer', steps: 'items', sequence: 'items', correctOrder: 'order', settings: 'controls', keyword: 'symbol' }],
  project: [['id', 'name', 'description', 'icon', 'cost', 'effect', 'symbol'], { title: 'name', price: 'cost', costs: 'cost', benefit: 'effect', bonus: 'effect', keyword: 'symbol' }],
  control: [['label', 'options', 'answer'], { name: 'label', title: 'label', choices: 'options', correctAnswer: 'answer', correctIndex: 'answer' }],
  card: [['id', 'title', 'text', 'sourceQuote', 'reward'], { name: 'title', fact: 'text', description: 'text', body: 'text', quote: 'sourceQuote', evidence: 'sourceQuote', excerpt: 'sourceQuote', rewards: 'reward', bonus: 'reward' }],
  concept: [['id', 'name'], { title: 'name', label: 'name' }]
};
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const row = [i]; for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = row; }
  return prev[b.length];
}
function nearKey(key, keys) {
  if (key.length < 4) return '';
  const limit = key.length >= 8 ? 2 : 1, scored = keys.map(known => [known, distance(key.toLowerCase(), known.toLowerCase())]).filter(([, d]) => d <= limit).sort((a, b) => a[1] - b[1]);
  return scored.length && (scored.length === 1 || scored[0][1] < scored[1][1]) ? scored[0][0] : '';
}
function canonical(raw, kind, fixes) {
  const [keys, aliases] = FIELDS[kind], out = { ...raw };
  for (const [key, value] of Object.entries(raw)) {
    if (keys.includes(key) || key.startsWith('_orphan')) continue;
    const target = Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : nearKey(key, keys);
    if (target && out[target] === undefined) { out[target] = value; fixes.add('fields'); }
  }
  return out;
}
// Finds stops or projects stranded elsewhere in a damaged reply (for example after a stray bracket).
function scavenge(root, looksLike, known, limit) {
  const found = [], seen = new Set(known);
  const walk = (value, depth) => { if (depth > 6 || found.length >= limit || !value || typeof value !== 'object') return; if (!Array.isArray(value) && !seen.has(value) && looksLike(value)) { seen.add(value); found.push(value); return; } for (const item of Array.isArray(value) ? value : Object.values(value)) walk(item, depth + 1); };
  walk(root, 0);
  return found;
}
const locationLike = value => { const n = canonical(value, 'location', new Set()); return typeof n.instruction === 'string' && typeof n.sourceQuote === 'string' && (Array.isArray(n.options) || Array.isArray(n.items) || Array.isArray(n.controls)); };
const projectLike = value => { const p = canonical(value, 'project', new Set()); return typeof p.name === 'string' && p.cost !== undefined && isObject(p.effect); };
function healLocation(raw, index, context) {
  const fixes = context.fixes, n = canonical(isObject(raw) ? raw : {}, 'location', fixes), node = {};
  node.id = unique(slug(n.id, 'place-' + (index + 1)), context.used); if (node.id !== n.id) fixes.add('ids');
  for (const [name, max] of [['name', 80], ['scene', 450], ['instruction', 900], ['explanation', 1000]]) { node[name] = clip(n[name], max); if (node[name] && node[name] !== n[name]) fixes.add('text'); }
  const concept = context.conceptOf(n.conceptId ?? n.concept); node.conceptId = concept ?? (typeof n.conceptId === 'string' ? n.conceptId : ''); if (concept && concept !== n.conceptId) fixes.add('concepts');
  node.icon = iconFor(n.icon, [n.name, n.scene].join(' '), index); if (node.icon !== n.icon) fixes.add('icons');
  const kind = KINDS[String(n.kind || n.type || '').toLowerCase().trim()] || (Array.isArray(n.controls) ? 'settings' : Array.isArray(n.items) ? 'order' : Array.isArray(n.options) ? 'choice' : String(n.kind || 'choice'));
  node.kind = kind; if (kind !== n.kind) fixes.add('kinds');
  const quote = !context.source || quoted(n.sourceQuote, context.source, 650) ? n.sourceQuote : groundQuote(n.sourceQuote ?? n.quote ?? n.evidence, context.source);
  node.sourceQuote = typeof quote === 'string' && quote ? quote : clip(n.sourceQuote, 650); if (quote && quote !== n.sourceQuote) fixes.add('quotes');
  const hints = (typeof n.hints === 'string' ? [n.hints] : list(n.hints)).map(h => clip(h, 400)).filter(Boolean).slice(0, 2);
  while (hints.length < 2 && node.sourceQuote) hints.push(clip(node.sourceQuote, 400));
  node.hints = hints; if (JSON.stringify(hints) !== JSON.stringify(n.hints)) fixes.add('hints');
  node.reward = pairOf(n.reward, 3); if (JSON.stringify(node.reward) !== JSON.stringify(n.reward)) fixes.add('rewards');
  if (kind === 'choice') {
    let options = optionTexts(n.options, 220), answer = answerIndex(n.answer, options, [n.correctIndex, n.correctAnswer, n.correct, flagged(n.options)]);
    if (options.length > 5) { const keep = [answer, ...options.map((_, i) => i).filter(i => i !== answer)].slice(0, 5).sort((a, b) => a - b); answer = keep.indexOf(answer); options = keep.map(i => options[i]); fixes.add('options'); }
    node.options = options; node.answer = answer; if (answer !== n.answer || JSON.stringify(options) !== JSON.stringify(n.options)) fixes.add('answers');
  } else if (kind === 'order') {
    const items = optionTexts(n.items, 180); let order = list(n.order).map(value => typeof value === 'string' && !/^\d+$/.test(value) ? items.findIndex(item => collapse(item).toLowerCase() === collapse(value).toLowerCase()) : Number(value));
    if (order.length === items.length && !order.includes(0) && order.every(v => Number.isInteger(v) && v >= 1 && v <= items.length)) order = order.map(v => v - 1);
    order = order.map(v => Number.isInteger(v) ? v : -1);
    node.items = items; node.order = order; if (JSON.stringify(order) !== JSON.stringify(n.order) || JSON.stringify(items) !== JSON.stringify(n.items)) fixes.add('answers');
  } else if (kind === 'settings') {
    node.controls = list(n.controls).filter(isObject).map(raw => canonical(raw, 'control', fixes)).map(control => { const options = optionTexts(control.options, 160); return { label: clip(control.label ?? control.name, 100), options, answer: answerIndex(control.answer, options, [control.correctIndex, control.correct, flagged(control.options)]) }; });
    if (JSON.stringify(node.controls) !== JSON.stringify(list(n.controls).map(c => isObject(c) ? { label: c.label, options: c.options, answer: c.answer } : c))) fixes.add('answers');
  }
  if (typeof n.symbol === 'string' && n.symbol.trim()) node.symbol = clip(n.symbol, 40);
  return { node, rawId: n.id, rawName: n.name };
}
function healProject(raw, index, context, board) {
  const fixes = context.fixes, p = canonical(isObject(raw) ? raw : {}, 'project', fixes), project = { id: unique(slug(p.id, 'project-' + (index + 1)), context.used), name: clip(p.name, 100), description: clip(p.description, 700) };
  if (project.id !== p.id) fixes.add('ids');
  project.icon = iconFor(p.icon, [p.name, p.description].join(' '), index + 3); if (project.icon !== p.icon) fixes.add('icons');
  project.cost = pairOf(p.cost, 6); if (JSON.stringify(project.cost) !== JSON.stringify(p.cost)) fixes.add('costs');
  const effect = isObject(p.effect) ? p.effect : {}, kind = /yield|bonus|income|produc|extra/i.test(String(effect.kind || '')) ? 'yield' : /path|short|bridge|route|road|open/i.test(String(effect.kind || '')) ? 'path' : effect.targetId !== undefined ? 'path' : 'yield';
  if (kind === 'yield') { const named = typeof effect.resource === 'string' ? board.resources.findIndex(name => collapse(name).toLowerCase() === collapse(effect.resource).toLowerCase()) : -1; project.effect = { kind, resource: [0, 1].includes(effect.resource) ? effect.resource : named >= 0 ? named : 0 }; }
  else project.effect = { kind, targetId: context.locationRef(effect.targetId ?? effect.target) || '' };
  if (JSON.stringify(project.effect) !== JSON.stringify(p.effect)) fixes.add('effects');
  if (typeof p.symbol === 'string' && p.symbol.trim()) project.symbol = clip(p.symbol, 40);
  return project;
}
function components(ids, edges) {
  const parent = new Map(ids.map(id => [id, id])), find = id => { while (parent.get(id) !== id) { parent.set(id, parent.get(parent.get(id))); id = parent.get(id); } return id; };
  for (const [a, b] of edges) parent.set(find(a), find(b));
  return find;
}
function distances(board) {
  const far = new Map(board.starts.map(id => [id, 0])), queue = [...board.starts];
  while (queue.length) { const id = queue.shift(); for (const [a, b] of board.edges) { const other = a === id ? b : b === id ? a : null; if (other && !far.has(other)) { far.set(other, far.get(id) + 1); queue.push(other); } } }
  return far;
}
function healDiscoveries(raw, source, fixes) {
  const used = new Set(), cards = [];
  for (let [index, item] of list(raw).slice(0, 8).entries()) {
    if (!isObject(item)) { fixes.add('cards'); continue; }
    item = canonical(item, 'card', fixes);
    const quote = !source || quoted(item.sourceQuote, source, 300) ? clip(item.sourceQuote, 300) : groundQuote(item.sourceQuote ?? item.quote, source, 300), card = { id: unique(slug(item.id, 'card-' + (index + 1)), used), title: clip(item.title ?? item.name, 60), text: clip(item.text ?? item.fact ?? item.description, 240), sourceQuote: quote, reward: pairOf(item.reward, 2) };
    if (!card.title || !card.text || !card.sourceQuote) { fixes.add('cards'); continue; }
    if (JSON.stringify(card) !== JSON.stringify(item)) fixes.add('cards');
    cards.push(card);
  }
  return cards.slice(0, 5);
}
// Normalizes an AI board in place of a second AI call wherever the repair is
// mechanical. Valid boards pass through unchanged.
export function healBoard(raw, source, options = {}) {
  const fixes = new Set(), b = canonical(isObject(raw) ? raw : {}, 'board', fixes), used = new Set(), goal = GOALS.includes(options.goal) ? options.goal : GOALS.includes(b.goal) ? b.goal : undefined;
  const board = { version: 1, ...(goal ? { goal } : {}), title: clip(b.title ?? b.name, 120), mission: clip(b.mission, 1200), debrief: clip(b.debrief ?? b.reflection, 1200) };
  if (b.version !== 1) fixes.add('version');
  const themeText = [b.theme, b.title, b.mission].join(' ');
  board.theme = THEMES.includes(b.theme) ? b.theme : (THEME_WORDS.find(([, re]) => re.test(themeText)) || ['garden'])[0]; if (board.theme !== b.theme) fixes.add('theme');
  board.resources = [...new Map(list(b.resources).map(r => clip(r, 60)).filter(Boolean).map(r => [r.toLowerCase(), r])).values()].slice(0, 2);
  if (JSON.stringify(board.resources) !== JSON.stringify(b.resources)) fixes.add('resources');
  const conceptIds = new Map(), conceptUsed = new Set();
  const rawConcepts = list(b.concepts).filter(isObject).map(c => canonical(c, 'concept', fixes));
  let rawLocations = list(b.locations).filter(isObject), rawProjects = list(b.projects).filter(isObject);
  if (rawLocations.length < 8) { const extra = scavenge(b, locationLike, rawLocations, 12 - rawLocations.length).filter(item => !rawLocations.some(known => known.id !== undefined && known.id === item.id)); if (extra.length) { rawLocations = [...rawLocations, ...extra]; fixes.add('recovered'); } }
  if (rawProjects.length < 3) { const extra = scavenge(b, projectLike, [...rawProjects, ...rawLocations], 3 - rawProjects.length).filter(item => !rawProjects.some(known => known.id !== undefined && known.id === item.id)); if (extra.length) { rawProjects = [...rawProjects, ...extra]; fixes.add('recovered'); } }
  board.concepts = rawConcepts.map((c, index) => { const id = unique(slug(c.id ?? c.name, 'idea-' + (index + 1)), conceptUsed); if (id !== c.id) fixes.add('ids'); return { id, name: clip(c.name ?? c.id, 100) }; });
  // Exact ids win over names so one concept's name cannot capture another's id.
  for (const alias of ['name', 'id']) rawConcepts.forEach((c, index) => { if (typeof c[alias] === 'string') conceptIds.set(collapse(c[alias]).toLowerCase(), board.concepts[index].id); });
  board.concepts.forEach(c => conceptIds.set(c.id, c.id));
  const conceptOf = value => typeof value === 'string' ? conceptIds.get(value) || conceptIds.get(collapse(value).toLowerCase()) : undefined;
  // A damaged concept id is matched only when exactly one concept fits.
  const conceptNear = value => { if (typeof value !== 'string' || !value.trim()) return undefined; const text = collapse(value).toLowerCase(), ids = board.concepts.map(c => c.id), inside = ids.filter(id => text.includes(id)), near = ids.filter(id => distance(text, id) <= 2); return inside.length === 1 ? inside[0] : near.length === 1 ? near[0] : undefined; };
  const refs = new Map(), context = { fixes, used, source, conceptOf: value => conceptOf(value) ?? conceptNear(value), locationRef: value => typeof value === 'string' ? refs.get(value) || refs.get(collapse(value).toLowerCase()) : undefined };
  let healed = rawLocations.map((raw, index) => healLocation(raw, index, context));
  healed.forEach(({ node, rawId }) => { for (const alias of [rawId, node.id]) if (typeof alias === 'string' && !refs.has(alias)) refs.set(alias, node.id); });
  healed.forEach(({ node, rawName }) => { const name = typeof rawName === 'string' ? collapse(rawName).toLowerCase() : ''; if (name && !refs.has(name)) refs.set(name, node.id); });
  const pathTargets = new Set(rawProjects.map(p => context.locationRef(canonical(p, 'project', new Set()).effect?.targetId)).filter(Boolean));
  let starts = [...new Set(list(b.starts).map(context.locationRef).filter(Boolean))];
  if (healed.length > 12) {
    // Drop surplus locations that no start, shortcut or thin concept depends on.
    const keep = new Set([...starts, ...pathTargets]);
    for (let index = healed.length - 1; index >= 0 && healed.length > 12; index--) { const { node } = healed[index]; if (keep.has(node.id) || healed.filter(item => item.node.conceptId === node.conceptId).length <= 2) continue; healed.splice(index, 1); }
    if (healed.length > 12) healed = healed.slice(0, 12);
    fixes.add('trimmed');
  }
  board.locations = healed.map(item => item.node);
  const ids = board.locations.map(node => node.id), idSet = new Set(ids);
  starts = starts.filter(id => idSet.has(id)).slice(0, 2);
  for (const id of ids) if (starts.length < 2 && !starts.includes(id)) starts.push(id);
  board.starts = starts; if (JSON.stringify(starts) !== JSON.stringify(b.starts)) fixes.add('starts');
  const edges = [], seen = new Set();
  for (const edge of list(b.edges)) {
    const pair = Array.isArray(edge) ? edge : isObject(edge) ? [edge.from ?? edge.a ?? edge.source, edge.to ?? edge.b ?? edge.target] : [], [a, c] = pair.map(context.locationRef);
    const signature = [a, c].sort().join(':');
    if (!a || !c || a === c || !idSet.has(a) || !idSet.has(c) || seen.has(signature)) { fixes.add('paths'); continue; }
    if (!Array.isArray(edge) || edge.length !== 2 || edge[0] !== a || edge[1] !== c) fixes.add('paths');
    seen.add(signature); edges.push([a, c]);
  }
  if (ids.length) {
    let find = components(ids, edges);
    for (let index = 1; index < ids.length; index++) if (find(ids[index]) !== find(ids[0])) { edges.push([ids[index - 1], ids[index]]); find = components(ids, edges); fixes.add('paths'); }
    for (let index = edges.length - 1; index >= 0 && edges.length > 24; index--) { const without = edges.filter((_, i) => i !== index), check = components(ids, without); if (ids.every(id => check(id) === check(ids[0]))) { edges.splice(index, 1); fixes.add('paths'); } }
  }
  board.edges = edges;
  let projects = rawProjects;
  if (projects.length > 3) { const kindOf = p => /yield|bonus|income|produc|extra/i.test(String(p.effect?.kind)) ? 'yield' : 'path', first = kind => projects.find(p => kindOf(p) === kind); const picked = [...new Set([first('path'), first('yield'), ...projects].filter(Boolean))].slice(0, 3); projects = projects.filter(p => picked.includes(p)); fixes.add('projects'); }
  board.projects = projects.map((raw, index) => healProject(raw, index, context, board));
  const far = distances(board), targeted = new Set(board.projects.filter(p => p.effect.kind === 'path').map(p => p.effect.targetId));
  for (const project of board.projects) {
    if (project.effect.kind !== 'path') continue;
    const target = project.effect.targetId;
    if (idSet.has(target) && !board.starts.includes(target)) continue;
    // Shortcuts must reach somewhere distant; pick the farthest unclaimed place.
    const choice = ids.filter(id => !board.starts.includes(id) && !targeted.has(id)).sort((x, y) => (far.get(y) ?? 0) - (far.get(x) ?? 0))[0];
    if (choice) { project.effect.targetId = choice; targeted.add(choice); fixes.add('shortcut'); }
  }
  balance(board, fixes);
  if (b.chance === true && options.chance !== false || options.chance === true) board.chance = true;
  const cards = healDiscoveries(b.discoveries, source, fixes);
  if (cards.length) board.discoveries = cards;
  if (b.discoveries !== undefined && !cards.length) fixes.add('cards');
  while (board.discoveries?.length && JSON.stringify(board).length > 32000) { board.discoveries.pop(); if (!board.discoveries.length) delete board.discoveries; fixes.add('cards'); }
  return { board, fixes: [...fixes] };
}
// Lowers project costs (or raises thin rewards) until every required set of
// projects is fundable from base location rewards alone.
function balance(board, fixes) {
  if (board.projects.length !== 3 || board.locations.length < 1 || board.resources.length !== 2) return;
  const sets = board.goal === 'architect' ? [[0, 1, 2]] : [[0, 1], [0, 2], [1, 2]];
  for (let guard = 0; guard < 60; guard++) {
    const total = board.locations.reduce((sum, node) => sum.map((v, i) => v + node.reward[i]), [0, 0]);
    const short = sets.map(set => ({ set, need: [0, 1].map(i => set.reduce((sum, p) => sum + board.projects[p].cost[i], 0) - total[i]) })).filter(item => item.need.some(v => v > 0)).sort((a, b) => Math.max(...b.need) - Math.max(...a.need))[0];
    if (!short) return;
    const resource = short.need[0] >= short.need[1] ? 0 : 1, project = short.set.map(p => board.projects[p]).filter(p => p.cost[resource] > 0 && p.cost[0] + p.cost[1] > 1).sort((a, b) => b.cost[resource] - a.cost[resource])[0];
    if (project) project.cost[resource]--;
    else { const node = board.locations.filter(n => n.reward[resource] < 3).sort((a, b) => a.reward[0] + a.reward[1] - b.reward[0] - b.reward[1])[0]; if (!node) return; node.reward[resource]++; }
    fixes.add('balance');
  }
}
// Removes locations that still fail validation when the rest of the board can
// stand without them.
export function salvageBoard(board, source, options = {}) {
  const errors = validateBoard(board, source); if (!errors.length) return { board, removed: [] };
  if (!Array.isArray(board?.locations)) return null;
  const bad = new Set(errors.map(error => /: ([a-z][a-z0-9_-]{0,39})$/.exec(error)?.[1]).filter(id => board.locations.some(node => node.id === id)));
  if (!bad.size || board.locations.length - bad.size < 8) return null;
  const next = healBoard({ ...board, locations: board.locations.filter(node => !bad.has(node.id)), starts: list(board.starts).filter(id => !bad.has(id)), edges: list(board.edges).filter(edge => !list(edge).some(id => bad.has(id))), projects: list(board.projects).map(p => bad.has(p?.effect?.targetId) ? { ...p, effect: { kind: 'path', targetId: '' } } : p) }, source, options).board;
  return validateBoard(next, source).length ? null : { board: next, removed: board.locations.filter(node => bad.has(node.id)).map(node => node.name || node.id) };
}
// A draft can open in the editor only when every screen can render its shape.
export function editableDraft(board) {
  const strings = (value, names) => isObject(value) && names.every(name => typeof value[name] === 'string');
  const pair = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
  const texts = value => Array.isArray(value) && value.every(item => typeof item === 'string');
  return strings(board, ['title', 'mission', 'debrief', 'theme']) && Array.isArray(board.resources) && board.resources.length === 2 && texts(board.resources)
    && Array.isArray(board.concepts) && board.concepts.length > 0 && board.concepts.every(c => strings(c, ['id', 'name']))
    && Array.isArray(board.locations) && board.locations.length >= 2 && board.locations.every(n => strings(n, ['id', 'name', 'scene', 'instruction', 'explanation', 'sourceQuote', 'conceptId', 'icon']) && texts(n.hints) && pair(n.reward) && (n.kind === 'choice' ? texts(n.options) && Number.isInteger(n.answer) : n.kind === 'order' ? texts(n.items) && Array.isArray(n.order) && n.order.every(Number.isInteger) : n.kind === 'settings' && Array.isArray(n.controls) && n.controls.every(c => strings(c, ['label']) && texts(c.options) && Number.isInteger(c.answer))))
    && Array.isArray(board.projects) && board.projects.length > 0 && board.projects.every(p => strings(p, ['id', 'name', 'description', 'icon']) && pair(p.cost) && isObject(p.effect) && ['yield', 'path'].includes(p.effect.kind))
    && Array.isArray(board.starts) && texts(board.starts) && Array.isArray(board.edges) && board.edges.every(edge => Array.isArray(edge) && edge.length === 2 && texts(edge));
}
