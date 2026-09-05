/**
 * AlloFlow — Shared quest/goal contract (2026-07-27).
 *
 * WHY THIS EXISTS
 * ---------------
 * Four engines grew their own progress vocabulary independently:
 *
 *   1. Directions goals   (AlloFlowANTI.txt)      allo_directions_progress_v1
 *   2. STEAM Lab quests    (stem_lab_module.js)    alloflow_quest_progress
 *   3. SEL Hub quests     (sel_hub_module.js)     alloflow_sel_station_progress
 *   4. AlloHaven tokens   (allohaven_module.js)   its own state key
 *
 * They used overlapping NAMES for genuinely different MEASURES. The clearest
 * case: all three of (1)(2)(3) offer "spend N minutes", and until today all
 * three counted a different thing —
 *
 *   directions  engaged minutes (visible tab + interaction inside the timeout)
 *   STEAM Lab    wall clock since mount, banked on unmount
 *   SEL Hub     a 30s interval with no visibility or engagement check at all
 *
 * ...so "spend 5 minutes" was satisfiable by an abandoned background tab in one
 * place and not in another, in the same app, on the same screen.
 *
 * WHAT THIS IS (AND IS NOT)
 * -------------------------
 * This is a VOCABULARY, not an evaluator. Each engine keeps its own evaluation,
 * because their signals are genuinely different (tool state vs. student
 * responses vs. resource ledgers) and merging them would be a rewrite with no
 * user-visible payoff. What is shared here:
 *
 *   - ONE canonical kind registry, each with an explicit measure and unit
 *   - ONE progress formatter, so "4/10 min" reads the same everywhere
 *   - ONE completion rule per measure
 *   - ONE home for the engagement timeout
 *   - Adapters that map each engine's native quest onto a canonical descriptor
 *
 * The conformance battery (tests/quest_contract_conformance.test.js) is the
 * enforcement mechanism: every engine's native type list must map onto this
 * registry, or the suite fails.
 *
 * DELIBERATE NON-MERGES
 * ---------------------
 * Surveying the engines turned up pairs that SHARE A NAME but MEASURE
 * DIFFERENTLY. Collapsing them would be the same class of bug this contract
 * exists to prevent, so they stay distinct and the difference is named:
 *
 *   xpDelta  vs xpTotal   directions XP is a DELTA from a first-view baseline
 *                         ("earn 25 XP tonight"); STEM/SEL xpThreshold is an
 *                         ABSOLUTE lifetime threshold. Same word, different bar.
 *   answered vs written   directions 'responded' means every expected field is
 *                         filled; STEM/SEL 'freeResponse' means a minimum
 *                         CHARACTER count in one box. Fields vs characters.
 *
 * No dependencies. Safe to load standalone. Pure functions only.
 */
(function () {
  'use strict';

  // ── The one engagement timeout ───────────────────────────────────────────────
  // "Engaged" = tab visible AND interacted with inside this window. The host
  // publishes a live probe at window.__alloEngagement; this is the constant that
  // probe and every standalone fallback must agree on.
  var ENGAGEMENT_TIMEOUT_MS = 180000; // 3 minutes

  // ── Measures ────────────────────────────────────────────────────────────────
  // How a kind decides "done". Kept tiny on purpose — three shapes cover every
  // quest all four engines have.
  //   cumulative : a running total climbs toward a target  (time, xp, chars)
  //   threshold  : a single observed value meets a bar     (score)
  //   boolean    : it happened, or it did not              (visited, manual)
  var MEASURES = { CUMULATIVE: 'cumulative', THRESHOLD: 'threshold', BOOLEAN: 'boolean' };

  var KINDS = {
    time: {
      label: 'Time spent', unit: 'min', measure: MEASURES.CUMULATIVE,
      target: 'minutes', defaultTarget: 10, engagementGated: true,
      note: 'ENGAGED minutes only — a hidden or idle tab must not accrue.'
    },
    xpDelta: {
      label: 'XP earned', unit: 'XP', measure: MEASURES.CUMULATIVE,
      target: 'amount', defaultTarget: 25,
      note: 'Delta from a captured baseline. Lifetime XP must never auto-complete it.'
    },
    xpTotal: {
      label: 'XP total', unit: 'XP', measure: MEASURES.CUMULATIVE,
      target: 'threshold', defaultTarget: 50,
      note: 'Absolute running total, not a delta.'
    },
    written: {
      label: 'Written response', unit: 'chars', measure: MEASURES.CUMULATIVE,
      target: 'minLength', defaultTarget: 30,
      note: 'Character count in a single free-response box.'
    },
    answered: {
      label: 'Every part answered', unit: '', measure: MEASURES.CUMULATIVE,
      target: null, defaultTarget: null,
      note: 'Target is derived from the resource shape, never authored.'
    },
    score: {
      label: 'Score', unit: 'pts', measure: MEASURES.THRESHOLD,
      target: 'minScore', defaultTarget: 5
    },
    count: {
      label: 'Items found', unit: 'items', measure: MEASURES.CUMULATIVE,
      target: 'count', defaultTarget: 5
    },
    visited: {
      label: 'Opened', unit: '', measure: MEASURES.BOOLEAN, target: null, defaultTarget: null
    },
    completed: {
      label: 'Finished', unit: '', measure: MEASURES.BOOLEAN, target: null, defaultTarget: null
    },
    game: {
      label: 'Game finished', unit: '', measure: MEASURES.BOOLEAN, target: null, defaultTarget: null
    },
    toolQuest: {
      label: 'Tool challenge', unit: '', measure: MEASURES.BOOLEAN, target: null, defaultTarget: null
    },
    manual: {
      label: 'Self-check', unit: '', measure: MEASURES.BOOLEAN, target: null, defaultTarget: null,
      note: 'The learner\'s own word. Never counts as device-confirmed evidence.'
    }
  };

  // Kinds whose completion is the learner asserting it, not the device
  // observing it. The teacher-facing split ("recorded" vs "self-checked")
  // depends on this being the ONLY entry in the self-report set.
  function isSelfReported(kind) { return kind === 'manual'; }

  // ── Native → canonical maps ─────────────────────────────────────────────────
  // Each engine's own type ids. A native id missing from these maps is a
  // contract violation and the conformance battery fails on it.
  var DIRECTIONS_KIND_MAP = {
    time: 'time', xp: 'xpDelta', responded: 'answered', visited: 'visited',
    completed: 'completed', game: 'game', manual: 'manual'
  };
  var STEM_KIND_MAP = {
    timeSpent: 'time', xpThreshold: 'xpTotal', freeResponse: 'written',
    quizScore: 'score', discoveryCount: 'count', toolQuest: 'toolQuest'
  };
  var SEL_KIND_MAP = {
    timeSpent: 'time', xpThreshold: 'xpTotal', freeResponse: 'written',
    manualComplete: 'manual'
  };

  function _canonicalize(map, nativeType) {
    if (!nativeType || typeof nativeType !== 'string') return null;
    return Object.prototype.hasOwnProperty.call(map, nativeType) ? map[nativeType] : null;
  }

  // ── Descriptor ──────────────────────────────────────────────────────────────
  // The uniform shape every engine can be rendered/reported through:
  //   { kind, label, target, ref, engine, native }
  // `ref` is whatever the engine binds to (a resourceId, a toolId) — opaque here.
  // Returns null for anything unmappable, so callers can drop it rather than
  // render a quest nobody can ever satisfy.
  function _describe(engine, map, quest, refField) {
    if (!quest || typeof quest !== 'object') return null;
    var kind = _canonicalize(map, quest.type || quest.kind);
    if (!kind) return null;
    var spec = KINDS[kind];
    var params = (quest.params && typeof quest.params === 'object') ? quest.params : quest;
    var target = null;
    if (spec.target) {
      var raw = params[spec.target];
      target = (typeof raw === 'number' && isFinite(raw) && raw > 0) ? raw : spec.defaultTarget;
    }
    return {
      engine: engine,
      kind: kind,
      native: quest.type || quest.kind,
      label: typeof quest.label === 'string' ? quest.label : '',
      target: target,
      ref: quest[refField] || null,
      selfReported: isSelfReported(kind)
    };
  }

  function fromDirections(objective) { return _describe('directions', DIRECTIONS_KIND_MAP, objective, 'resourceRef'); }
  function fromStem(quest) { return _describe('stem', STEM_KIND_MAP, quest, 'toolId'); }
  function fromSel(quest) { return _describe('sel', SEL_KIND_MAP, quest, 'toolId'); }

  // ── Progress ────────────────────────────────────────────────────────────────
  // One formatter so a progress chip reads identically in every engine. Display
  // caps at the target: "14/10 min" reads as a bug to a kid.
  function formatProgress(kind, current, target) {
    var spec = KINDS[kind];
    if (!spec) return '';
    if (spec.measure === MEASURES.BOOLEAN) return '';
    var cur = Math.max(0, Number(current) || 0);
    var tgt = Number(target) || 0;
    if (tgt <= 0) return '';
    var shown = Math.min(cur, tgt);
    return shown + '/' + tgt + (spec.unit ? ' ' + spec.unit : '');
  }

  function isComplete(kind, current, target) {
    var spec = KINDS[kind];
    if (!spec) return false;
    if (spec.measure === MEASURES.BOOLEAN) return !!current;
    var tgt = Number(target) || 0;
    if (tgt <= 0) return false;
    return (Number(current) || 0) >= tgt;
  }

  var AlloQuestContract = {
    VERSION: 1,
    ENGAGEMENT_TIMEOUT_MS: ENGAGEMENT_TIMEOUT_MS,
    MEASURES: MEASURES,
    KINDS: KINDS,
    DIRECTIONS_KIND_MAP: DIRECTIONS_KIND_MAP,
    STEM_KIND_MAP: STEM_KIND_MAP,
    SEL_KIND_MAP: SEL_KIND_MAP,
    isSelfReported: isSelfReported,
    fromDirections: fromDirections,
    fromStem: fromStem,
    fromSel: fromSel,
    formatProgress: formatProgress,
    isComplete: isComplete
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AlloQuestContract;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AlloQuestContract = AlloQuestContract;
    window.AlloQuestContract = AlloQuestContract;
    if (typeof console !== 'undefined') console.log('[CDN] AlloQuestContract loaded');
  }
})();
