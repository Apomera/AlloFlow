import { validateBoard } from './lesson_board_engine.js';
import { supportHash } from './lesson_board_support.js';
// Teacher-facing review checks. Validation problems block play; the rest are
// patterns learners could exploit or reading loads worth a second look.
const choicesOf = board => (Array.isArray(board?.locations) ? board.locations : []).filter(node => node.kind === 'choice' && Array.isArray(node.options) && Number.isInteger(node.answer) && node.answer >= 0 && node.answer < node.options.length);
export function boardQuality(board, source) {
  const items = validateBoard(board, source).map(message => ({ level: 'fix', code: 'validation', message, stopId: /: ([a-z][a-z0-9_-]{0,39})$/.exec(message)?.[1] || '' }));
  const choices = choicesOf(board);
  if (choices.length >= 3) {
    const counts = new Map(); choices.forEach(node => counts.set(node.answer, (counts.get(node.answer) || 0) + 1));
    const [position, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count / choices.length >= .6) items.push({ level: 'warn', code: 'position', position: position + 1, count, total: choices.length });
    const longest = choices.filter(node => { const lengths = node.options.map(option => String(option).length); return lengths.every((length, index) => index === node.answer || length < lengths[node.answer]); }).length;
    if (longest / choices.length >= .5) items.push({ level: 'warn', code: 'length', count: longest, total: choices.length });
  }
  const locations = Array.isArray(board?.locations) ? board.locations : [];
  const long = locations.filter(node => String(node.instruction || '').length + String(node.scene || '').length > 700);
  if (long.length) items.push({ level: 'info', code: 'reading', count: long.length, stops: long.map(node => node.id) });
  const seen = new Map(); for (const node of locations) { const key = String(node.instruction || '').trim().toLowerCase(); if (key) seen.set(key, [...(seen.get(key) || []), node.id]); }
  const repeated = [...seen.values()].filter(ids => ids.length > 1).flat();
  if (repeated.length) items.push({ level: 'warn', code: 'repeat', count: repeated.length, stops: repeated });
  return items;
}
// Spreads correct answers across positions in a fixed, board-specific order.
export function balanceAnswerPositions(board) {
  const choices = choicesOf(board), slots = choices.map((_, index) => index);
  let seed = parseInt(supportHash(board.title + ':' + choices.map(node => node.id).join(',')), 36) || 1;
  for (let index = slots.length - 1; index > 0; index--) { seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0; const other = seed % (index + 1); [slots[index], slots[other]] = [slots[other], slots[index]]; }
  const targets = new Map(choices.map((node, index) => [node.id, slots[index] % node.options.length]));
  return { ...board, locations: board.locations.map(node => {
    if (!targets.has(node.id)) return node;
    const target = targets.get(node.id), others = node.options.filter((_, index) => index !== node.answer);
    return { ...node, options: [...others.slice(0, target), node.options[node.answer], ...others.slice(target)], answer: target };
  }) };
}
export function boardChanges(before, after) {
  const old = new Map((before?.locations || []).map(node => [node.id, node])), next = new Map((after?.locations || []).map(node => [node.id, node]));
  return {
    changed: [...next.values()].filter(node => old.has(node.id) && JSON.stringify(old.get(node.id)) !== JSON.stringify(node)).map(node => node.name),
    added: [...next.values()].filter(node => !old.has(node.id)).map(node => node.name),
    removed: [...old.values()].filter(node => !next.has(node.id)).map(node => node.name),
    projects: JSON.stringify(before?.projects) !== JSON.stringify(after?.projects),
    story: ['title', 'mission', 'debrief'].some(key => before?.[key] !== after?.[key])
  };
}
// Groups the mechanical repair codes into a few teacher-readable categories.
export const FIX_GROUPS = { reply: ['json', 'truncated', 'recovered'], quotes: ['quotes'], activities: ['answers', 'options', 'kinds'], map: ['paths', 'starts', 'shortcut', 'trimmed'], economy: ['balance', 'rewards', 'costs', 'effects', 'projects'], details: ['ids', 'text', 'concepts', 'icons', 'hints', 'theme', 'version', 'resources', 'fields'], cards: ['cards'] };
export const fixGroups = fixes => Object.keys(FIX_GROUPS).filter(group => FIX_GROUPS[group].some(code => (fixes || []).includes(code)));
