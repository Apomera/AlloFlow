// Singular English for count strings whose {count} can be 1. Translations register key_one and,
// where a language needs them, key_zero/_two/_few/_many; the page language's plural rules pick one.
const ONE = {
  assignment_moves: '{count} move', assignment_segments: '{count} route segment', challenge_bin_count: '{count} card',
  delivery_route_waypoint: '{count} route segment · travel to {name} first, then continue to the delivery station.',
  field_lead_route_far: 'Current open route: {count} segment · beyond this turn’s range.',
  field_lead_route_distance: 'Current open route: {count} segment · within this turn’s range.',
  decision_options: '{count} option to compare',
  guide_gather_help: 'One possible route needs {count} more successful exploration to afford {project}. Inspect {name} to see its reward. You can choose another route.',
  investment_yield: 'Each later successful investigation earns +1 {resource}. Up to {count} investigation remains within the move limit.',
  investment_recover: 'After {count} investigation, that income matches the {cost} {resource} portion of this payment.',
  plan_review_missing_projects: 'Build {count} more construction.', plan_review_missing_locations: 'Explore {count} remaining location: {names}',
  plan_review_bridge_crossings: 'Connects {from} and {to}; crossed in {count} later planned move.',
  plan_tradeoffs_more_moves: 'Plan A uses {count} more move.', plan_tradeoffs_fewer_moves: 'Plan A uses {count} fewer move.',
  planner_opens: 'Opens {count} location',
  quality_reading: '{count} stop has a lot of reading. Try "Less reading" for younger learners.',
  quality_giveaway: '{count} stop names part of the answer in its own instructions, so learners can answer from the wording.',
  draft_help: 'The AI draft still has {count} problem. Your current board is unchanged. Open the draft to fix it by hand, or ask the AI to fix only this problem.',
  relay_open_distance: 'Current open route: {count} segment across both handoffs. Intermediate travel stops may be needed.',
  relay_route_ready: '{count} route segment · reach this handoff in one travel move.',
  relay_route_waypoint: '{count} route segment · travel to {name} first, then continue toward the handoff.',
  proposal_option: '{name}: {count} proposal', route_choice_segments: '{count} route segment', sandbox_route_segment_count: '{count} route segment',
  sandbox_remaining: '{count} move slot would remain.', sandbox_step_count: '{plan}: {count} move planned.',
  blueprint_contracts: '{count} optional expedition contract', plan_move_count: '{count} successful exploration, then 1 construction.',
  support_omitted: 'Vocabulary added. {count} picture could not be included; its text is available.',
  tabletop_shortcut_saves: 'Compared with the current explored route: {count} fewer space.', tabletop_event_milestone: '{count} discovery',
  shared_picture_omissions: '{count} picture could not be included in this shared board. Vocabulary and activities remain available as text.',
  early_notice: '{count} learner has not confirmed a response. Continue with the responses already received?',
  puzzle_tokens_count: '{count} token',
  coverage_compact: 'This report lists the first {count} linked item. Open board setup with the original assessment for the full item list.',
  live_room_short: 'This board and its picture or vocabulary support leave too little room in the live session for a full game with {count} learner (about {chars} characters short). Turn off picture or vocabulary support, or use a board with fewer stops, then launch again.',
  assisted_count: '{count} activity was answered correctly only after the answer was shown.',
  concept_thin_evidence: '{count} learner has only one answered activity for this concept, so the evidence is thin. Use the suggested practice to confirm.'
};
export const SINGULAR_FALLBACKS = ONE;
const page = () => (typeof document !== 'undefined' && document.documentElement) || null;
const isRtl = () => page()?.dir === 'rtl';
const LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
// On right-to-left pages arrows point the reading way and a sign stays in front of its number.
const orient = text => isRtl() ? text.replace(/→/g, '←').replace(/([+−])\{([a-zA-Z]+)\}/g, LRI + '$1{$2}' + PDI) : text;
export const arrow = () => isRtl() ? '←' : '→';
export const signedAmount = (value, sign = '+') => isRtl() ? LRI + sign + value + PDI : sign + value;
const lookup = (t, full, params) => { const value = typeof t === 'function' ? t(full, params) : ''; return typeof value === 'string' && value && value !== full ? value : ''; };
const countOf = params => typeof params.count === 'number' ? params.count : typeof params.count === 'string' && /^\d+$/.test(params.count) ? Number(params.count) : null;
const rules = new Map();
const category = count => { const lang = page()?.lang || 'en'; try { if (!rules.has(lang)) rules.set(lang, new Intl.PluralRules(lang)); return rules.get(lang).select(count); } catch (_) { return count === 1 ? 'one' : 'other'; } };
export const tr = (t, key, fallback, params = {}) => {
  const full = 'lesson_board.' + key, count = ONE[key] ? countOf(params) : null;
  let text = '';
  if (count !== null) { const kind = category(count); if (kind !== 'other') text = lookup(t, full + '_' + kind, params) || (kind === 'one' && /^en\b/i.test(page()?.lang || 'en') ? ONE[key] : ''); }
  text = text || lookup(t, full, params) || fallback;
  return Object.entries(params).reduce((result, [name, replacement]) => result.replaceAll('{' + name + '}', String(replacement)), orient(text));
};
