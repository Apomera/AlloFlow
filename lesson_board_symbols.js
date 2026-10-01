import { prepareSupport, safeBoardImage, supportHash, SYMBOL_CREDIT } from './lesson_board_support.js';
// Mulberry picture symbols (CC BY-SA 4.0, Steve Lee) come through the shared
// Global Symbols search in the alt-text module. Boards store the https link,
// which keeps a live session's shared payload small.
export const SYMBOL_LICENCE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';
const SKIP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'your', 'this', 'that', 'station', 'place', 'area', 'zone', 'room', 'lab', 'laboratory', 'center', 'centre', 'site', 'point', 'stop', 'corner', 'hall', 'project']);
export const symbolSearch = () => { const search = window.AlloModules?.AltText?.searchMulberrySymbols; return typeof search === 'function' ? search : null; };
export const symbolCredit = () => { const alt = window.AlloModules?.AltText; try { const line = alt?.openImageCreditLine?.(alt.MULBERRY_CREDIT); if (typeof line === 'string' && line.trim()) return line.trim().slice(0, 300); } catch (_) {} return SYMBOL_CREDIT; };
// The AI's English keyword first, then the longest words of the place name.
export function symbolQueries(item, language = 'English') {
  const words = String(item?.name || '').normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [], picks = words.filter(word => word.length > 2 && !SKIP.has(word)).sort((a, b) => b.length - a.length).slice(0, 2);
  const keyword = typeof item?.symbol === 'string' ? item.symbol.trim().toLowerCase() : '';
  return [...(keyword ? [{ query: keyword, language: 'English' }] : []), ...picks.map(query => ({ query, language }))].filter((entry, index, all) => all.findIndex(other => other.query === entry.query) === index).slice(0, 3);
}
export async function findSymbols(item, search, options = {}) {
  for (const { query, language } of symbolQueries(item, options.language)) {
    const result = await search(query, { language, signal: options.signal });
    if (result?.error === 'network') throw Object.assign(Error('symbol-network'), { code: 'symbol-network' });
    const symbols = (Array.isArray(result?.symbols) ? result.symbols : []).filter(symbol => safeBoardImage(symbol?.svgUrl)).slice(0, 12);
    if (symbols.length) return { query, symbols };
  }
  return { query: '', symbols: [] };
}
export async function findBoardSymbols(board, search, options = {}, onProgress = () => {}) {
  const items = [...board.locations, ...board.projects], queue = items.slice(), picks = {}, missing = [];
  let done = 0;
  const worker = async () => { while (queue.length) { const item = queue.shift(); if (options.signal?.aborted) throw Object.assign(Error('Cancelled'), { name: 'AbortError' }); const found = await findSymbols(item, search, options); if (found.symbols.length) picks[item.id] = { src: found.symbols[0].svgUrl, label: found.symbols[0].label || found.query }; else missing.push(item.id); onProgress(++done, items.length); } };
  await Promise.all([worker(), worker(), worker()]);
  return { picks, missing };
}
export function withSymbols(support, board, picks, credit = SYMBOL_CREDIT) {
  const next = structuredClone(support); next.art = { projects: {}, ...(next.art || {}) }; next.art.symbols = { ...(next.art.symbols || {}) };
  for (const [id, pick] of Object.entries(picks || {})) { const src = safeBoardImage(pick?.src); if (!src) continue; const assetId = 'symbol_' + supportHash(src); next.assets[assetId] = src; next.art.symbols[id] = assetId; }
  next.art.symbolCredit = credit;
  return prepareSupport(next, board);
}
export function withoutSymbols(support, board, ids) {
  const next = structuredClone(support), remove = ids === undefined ? null : new Set(ids);
  if (next.art?.symbols) for (const id of Object.keys(next.art.symbols)) if (!remove || remove.has(id)) delete next.art.symbols[id];
  return prepareSupport(next, board);
}
// Vocabulary words can use a symbol as their picture; the flag keeps the credit visible.
export function withTermSymbol(support, board, termId, pick, credit = SYMBOL_CREDIT) {
  const next = structuredClone(support), term = next.terms.find(item => item.id === termId), src = safeBoardImage(pick?.src);
  if (!term) throw Error('board-image-target');
  if (!src) throw Error('board-image-invalid');
  const assetId = 'symbol_' + supportHash(src); next.assets[assetId] = src; term.imageId = assetId; term.alt = String(pick.label || term.term).slice(0, 500); term.symbol = true;
  next.art = { projects: {}, ...(next.art || {}) }; next.art.symbolCredit = credit;
  return prepareSupport(next, board);
}
// Whole term first, then its longest words, then English, since Mulberry labels are mostly English.
export function termQueries(term, language = 'English') {
  const full = String(term || '').trim().toLowerCase(), words = symbolQueries({ name: term }, language).map(entry => entry.query), queries = [full, ...words].filter((query, index, all) => query && all.indexOf(query) === index).slice(0, 3).map(query => ({ query, language }));
  return language !== 'English' && full ? [...queries, { query: full, language: 'English' }] : queries;
}
export async function searchTerm(term, search, options = {}) {
  for (const { query, language } of termQueries(term, options.language)) {
    const result = await search(query, { language, signal: options.signal });
    if (result?.error === 'network') throw Object.assign(Error('symbol-network'), { code: 'symbol-network' });
    const symbols = (Array.isArray(result?.symbols) ? result.symbols : []).filter(symbol => safeBoardImage(symbol?.svgUrl)).slice(0, 12);
    if (symbols.length) return { query, symbols };
  }
  return { query: '', symbols: [] };
}
export async function findTermSymbols(support, search, options = {}) {
  const picks = {}, missing = [];
  for (const term of support.terms.filter(item => !item.imageId)) {
    if (options.signal?.aborted) throw Object.assign(Error('Cancelled'), { name: 'AbortError' });
    const found = await searchTerm(term.term, search, options);
    if (found.symbols.length) picks[term.id] = { src: found.symbols[0].svgUrl, label: term.term }; else missing.push(term.id);
  }
  return { picks, missing };
}
export const hasSymbols = support => Object.keys(support?.art?.symbols || {}).length > 0 || (support?.terms || []).some(term => term.symbol && term.imageId);
export const symbolOf = (support, id) => { const assetId = support?.art?.symbols?.[id]; return assetId ? support.assets?.[assetId] || '' : ''; };
