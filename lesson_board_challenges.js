// Bounded, source-authored manipulative challenges. Values remain comma-separated
// indices so solo saves and the classroom action transport use the same contract.
export const SPATIAL_CHALLENGE_KINDS = ['classify', 'connect', 'place'];
export const isSpatialChallenge = node => SPATIAL_CHALLENGE_KINDS.includes(node?.kind);
export const challengeTargetField = node => node.kind === 'classify' ? 'categories' : node.kind === 'connect' ? 'matches' : 'slots';
export const challengeAnswerField = node => node.kind === 'connect' ? 'connections' : 'placements';
export const challengeTargets = node => node[challengeTargetField(node)] || [];
const strings = (value, min, max) => Array.isArray(value) && value.length >= min && value.length <= max && value.every(item => typeof item === 'string' && item.trim() && item.length <= 180) && new Set(value.map(item => item.trim().toLocaleLowerCase())).size === value.length;

export function validateChallenge(node) {
  if (!isSpatialChallenge(node)) return ['Unsupported manipulative activity: ' + node?.id];
  const errors = [], targets = challengeTargets(node), answer = node[challengeAnswerField(node)], fail = message => errors.push(message + ': ' + node.id);
  if (!strings(node.items, 3, 5)) fail('Use three to five distinct challenge items');
  if (!strings(targets, node.kind === 'classify' ? 2 : 3, node.kind === 'classify' ? 4 : 5)) fail('Invalid challenge destinations');
  if (node.kind !== 'classify' && targets.length !== node.items?.length) fail('Give each item one distinct destination');
  if (!Array.isArray(answer) || answer.length !== node.items?.length || answer.some(index => !Number.isInteger(index) || index < 0 || index >= targets.length)) fail('Invalid challenge answer key');
  else if (node.kind !== 'classify' && new Set(answer).size !== answer.length) fail('Connections and placements must use every destination once');
  else if (node.kind === 'classify' && new Set(answer).size < 2) fail('Classification must use at least two categories');
  return errors;
}
export function copyChallenge(node) { return { items: node.items.slice(), [challengeTargetField(node)]: challengeTargets(node).slice(), [challengeAnswerField(node)]: node[challengeAnswerField(node)].slice() }; }
export const challengeSolution = node => node[challengeAnswerField(node)].join(',');
export const challengeInitialDraft = node => node.items.map(() => '').join(',');
export function challengeValidDraft(node, value) {
  if (!isSpatialChallenge(node) || typeof value !== 'string' || value.length > 24 || !/^[0-9,]*$/.test(value)) return false;
  const parts = value.split(','), assigned = parts.filter(part => part !== '');
  return parts.length === node.items.length && parts.every(part => part === '' || /^[0-9]$/.test(part) && Number(part) < challengeTargets(node).length) && (node.kind === 'classify' || new Set(assigned).size === assigned.length);
}
export const challengeValidValue = (node, value) => challengeValidDraft(node, value) && value.split(',').every(part => part !== '');
export function challengeResponseText(node, value) { return challengeValidValue(node, value) ? value.split(',').map((part, index) => node.items[index] + ' → ' + challengeTargets(node)[Number(part)]).join('; ') : ''; }

// A destination has one occupant for connection/placement puzzles. Moving an
// item onto an occupied destination returns that occupant to the tray.
export function assignChallenge(node, value, item, destination) {
  if (!Number.isInteger(item) || item < 0 || item >= node.items.length || destination !== '' && (!Number.isInteger(destination) || destination < 0 || destination >= challengeTargets(node).length)) return value;
  const parts = challengeValidDraft(node, value) ? value.split(',') : node.items.map(() => '');
  if (node.kind !== 'classify' && destination !== '') parts.forEach((part, index) => { if (index !== item && part === String(destination)) parts[index] = ''; });
  parts[item] = String(destination);
  return parts.join(',');
}
export function challengeFeedback(node, value) {
  if (!challengeValidValue(node, value)) return null;
  const answer = node[challengeAnswerField(node)], entries = value.split(',').map((part, index) => ({ item: node.items[index], target: challengeTargets(node)[Number(part)], correct: Number(part) === answer[index] }));
  return { entries, correct: entries.filter(entry => entry.correct).length, total: entries.length };
}

// Used in authoring prompts, never interpreted as executable rules.
export const CHALLENGE_SCHEMA_PROMPT = `Additional activity formats: classify has items (3-5 distinct strings), categories (2-4 distinct strings), and placements (one zero-based category index per item, using at least two categories). connect has items (3-5 distinct strings), matches (the same number of distinct strings), and connections (one match index per item, using every match exactly once). place has items (3-5 distinct piece names), slots (the same number of distinct named spatial or functional destinations), and placements (one slot index per item, using every slot exactly once). Each string is at most 180 characters. Give every item one unambiguous destination supported by sourceQuote. Classification sorts examples by a stated rule; connections express meaningful relationships; placement uses named spatial or functional constraints stated in the instruction. Do not relabel a multiple-choice question as a placement task. Use at least four supported formats when the source supports them; avoid more than two consecutive locations using the same format. Do not invent experiment or physics results.`;
