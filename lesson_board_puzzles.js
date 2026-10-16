// Authored, bounded puzzles share the existing comma-digit response transport.
// Rules are lesson text, never executable model-generated code.
export const PUZZLE_KINDS = ['allocate', 'repair'];
export const isPuzzle = node => PUZZLE_KINDS.includes(node?.kind);
export const puzzleItems = node => node.kind === 'allocate' ? node.needs : node.items;
const texts = (value, min, max, limit) => Array.isArray(value) && value.length >= min && value.length <= max && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= limit) && new Set(value.map(item => item.trim().toLocaleLowerCase())).size === value.length;
const integers = (values, count, max) => Array.isArray(values) && values.length === count && values.every(value => Number.isInteger(value) && value >= 0 && value <= max);
export function validatePuzzle(node) {
  const errors = [], fail = message => errors.push(message + ': ' + node?.id);
  if (!isPuzzle(node)) return ['Unsupported puzzle: ' + node?.id];
  const items = puzzleItems(node);
  if (!texts(items, 3, 5, 180)) fail('Use three to five distinct puzzle items');
  if (node.kind === 'allocate') {
    if (!Number.isInteger(node.budget) || node.budget < 1 || node.budget > 12) fail('Allocation budget must be one to twelve tokens');
    if (!texts(node.constraints, 1, 5, 220)) fail('Give one to five visible allocation constraints');
    if (!integers(node.allocation, items?.length, 6) || node.allocation.reduce((sum, value) => sum + value, 0) !== node.budget) fail('Allocation answer must use the entire budget with zero to six tokens per need');
  } else {
    if (!integers(node.repairs, items?.length, 1) || !node.repairs.includes(0) || !node.repairs.includes(1)) fail('Repair key must identify at least one faulty and one sound item');
    if (!Array.isArray(node.corrections) || node.corrections.length !== items?.length || node.corrections.some((text, index) => typeof text !== 'string' || text.length > 400 || (node.repairs?.[index] === 1 ? !text.trim() : text !== ''))) fail('Give a correction only for each item that needs repair');
  }
  return errors;
}
export function copyPuzzle(node) {
  return node.kind === 'allocate' ? { needs: node.needs.slice(), budget: node.budget, constraints: node.constraints.slice(), allocation: node.allocation.slice() } : { items: node.items.slice(), repairs: node.repairs.slice(), corrections: node.corrections.slice() };
}
export const puzzleSolution = node => (node.kind === 'allocate' ? node.allocation : node.repairs).join(',');
export const puzzleInitialDraft = node => puzzleItems(node).map(() => node.kind === 'allocate' ? '0' : '').join(',');
export function puzzleValidDraft(node, value) {
  if (!isPuzzle(node) || typeof value !== 'string' || value.length > 24 || !/^[0-9,]*$/.test(value)) return false;
  const parts = value.split(',');
  if (parts.length !== puzzleItems(node)?.length) return false;
  if (node.kind === 'repair') return parts.every(part => part === '' || part === '0' || part === '1');
  return parts.every(part => /^[0-6]$/.test(part)) && parts.reduce((sum, part) => sum + Number(part), 0) <= node.budget;
}
export function puzzleValidValue(node, value) {
  return puzzleValidDraft(node, value) && (node.kind === 'allocate' ? value.split(',').reduce((sum, part) => sum + Number(part), 0) === node.budget : value.split(',').every(part => part !== ''));
}
export function updatePuzzle(node, value, index, next) {
  if (!Number.isInteger(index) || index < 0 || index >= puzzleItems(node).length) return value;
  const parts = (puzzleValidDraft(node, value) ? value : puzzleInitialDraft(node)).split(','); parts[index] = String(next);
  const result = parts.join(','); return puzzleValidDraft(node, result) ? result : value;
}
export function puzzleResponseText(node, value) {
  if (!puzzleValidValue(node, value)) return '';
  return value.split(',').map((part, index) => puzzleItems(node)[index] + ': ' + (node.kind === 'allocate' ? part + ' tokens' : part === '1' ? 'Needs repair' : 'Keep as is')).join('; ');
}
export function puzzleFeedback(node, value) {
  if (!puzzleValidValue(node, value)) return null;
  const key = node.kind === 'allocate' ? node.allocation : node.repairs;
  const entries = value.split(',').map((part, index) => ({ item: puzzleItems(node)[index], value: Number(part), expected: key[index], correct: Number(part) === key[index], ...(node.kind === 'repair' && key[index] === 1 ? { correction: node.corrections[index] } : {}) }));
  return { entries, correct: entries.filter(entry => entry.correct).length, total: entries.length };
}
// Shape-only gate for recovering an editable invalid draft, without guessing keys.
export function editablePuzzle(node) {
  const list = value => Array.isArray(value) && value.every(item => typeof item === 'string');
  return isPuzzle(node) && list(puzzleItems(node)) && (node.kind === 'allocate' ? Number.isInteger(node.budget) && list(node.constraints) && Array.isArray(node.allocation) && node.allocation.every(Number.isInteger) : Array.isArray(node.repairs) && node.repairs.every(Number.isInteger) && list(node.corrections));
}
export const PUZZLE_SCHEMA_PROMPT = `Two additional formats: allocate has needs (3-5 distinct names, each <=180 characters), budget (integer 1-12), constraints (1-5 visible rules, each <=220 characters), and allocation (one integer 0-6 per need, summing exactly to budget). State all information needed in the visible rules, with one unambiguous allocation supported by the source. Use allocation only when the lesson supplies the quantities or a clearly labelled fictional model consistent with it; never invent real scientific quantities. repair has items (3-5 distinct statements/components, each <=180 characters), repairs (one integer 0 or 1 per item, including at least one of each), and corrections (same-length array: a source-backed correction <=400 characters for each 1 and an empty string for each 0). Learners identify faulty items; sound items must be defensibly correct. Corrections are revealed only during review. Every puzzle still requires the exact sourceQuote, explanation and two hints. Do not hide a rule in the answer key or make a flawed statement look like a lesson fact.`;
