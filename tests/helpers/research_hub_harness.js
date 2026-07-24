// Research Hub substrate golden-master harness.
//
// PURPOSE: Pin the canonical shape of `emptyJournal()` and the v:1/2/3 → v:4
// migration ladder in `loadJournal()`, so substrate changes (the riskiest kind
// — they silently affect saved state) surface as snapshot diffs. The Hub has
// had three substrate version bumps in 36 hours (v:1 → v:2 → v:3 → v:4); the
// pre-existing `parsed.v !== 1` strict-equal bug at Tier 2 silently dropped v:2
// sessions and went undetected because there was no test. This harness exists
// so that cannot happen again.
//
// HOW IT WORKS (zero changes to the live module — read-only):
//   * load research_hub_module.js into the vitest+jsdom window via
//     new Function(src)() with a stubbed minimal React.
//   * splice ONE read-only capture line right before the trailing
//     console.log('[CDN] ResearchHub loaded (Tier 4)') so all closure-private
//     functions (emptyJournal, loadJournal, stripPedagogicalFootguns,
//     PER_TOUCHPOINT_CAP, FOOTGUN_KEY_PATTERNS) are reachable from the test.
//   * the file on disk is never modified.
//
// SCOPE: This harness exercises the PURE substrate functions, not the UI.
// React render, hook behavior, and AI-call wiring are out of scope (and
// covered by the smoke-test checklists at docs/research_lane_*_smoke_test.md).

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

// Real React is required because the IIFE early-returns when window.React is
// missing. We don't render anything; we just need the typeof check to pass.
const React = require(resolve(MODULES_DIR, 'react'));

let _loaded = false;

/**
 * Load research_hub_module.js into the jsdom window with React stubbed and
 * a one-line internals capture splice. Idempotent.
 */
export function setupHub() {
  if (_loaded) return;
  _loaded = true;

  // jsdom should have window/localStorage/etc already; expose React.
  globalThis.window.React = React;

  let src = readFileSync(
    resolve(process.cwd(), 'research_hub_module.js'),
    'utf8',
  );

  // Splice the internals capture right before the closing console.log so the
  // closure variables are all defined and the module is fully wired.
  const SENTINEL = '"[CDN] ResearchHub loaded';
  if (src.indexOf(SENTINEL) === -1) {
    throw new Error(
      'Could not find the [CDN] ResearchHub load console.log to splice before. ' +
      'Did the hub source rename it? Update the harness sentinel.',
    );
  }
  const capture = `
    globalThis.__hubInternals = {
      emptyJournal: emptyJournal,
      loadJournal: loadJournal,
      saveJournal: saveJournal,
      matchMethodPackForQuestion: matchMethodPackForQuestion,
      normalizeResearchCapture: normalizeResearchCapture,
      queueResearchCapture: queueResearchCapture,
      registerCaptureSanitizer: registerCaptureSanitizer,
      enforceCapturePrivacy: enforceCapturePrivacy,
      captureFingerprint: captureFingerprint,
      researchStorageHealth: researchStorageHealth,
      validateToolIntegrationContract: validateToolIntegrationContract,
      normalizeReproducibilityReceipt: normalizeReproducibilityReceipt,
      assessResearchArtifactIntegration: assessResearchArtifactIntegration,
      summarizeIntegrationHealth: summarizeIntegrationHealth,
      buildInquiryAudit: buildInquiryAudit,
      buildEvidenceGraph: buildEvidenceGraph,
      buildW3CWebAnnotations: buildW3CWebAnnotations,
      buildCslJson: buildCslJson,
      buildRoCrate: buildRoCrate,
      buildInteroperabilityBundle: buildInteroperabilityBundle,
      stampNewInquiryArtifacts: stampNewInquiryArtifacts,
      applyMethodPackSelection: applyMethodPackSelection,
      stripPedagogicalFootguns: stripPedagogicalFootguns,
      enforceQuestionFormat: enforceQuestionFormat,
      FOOTGUN_KEY_PATTERNS: FOOTGUN_KEY_PATTERNS,
      STORAGE_KEY: STORAGE_KEY,
      RECOVERY_STORAGE_KEY: RECOVERY_STORAGE_KEY,
      CAPTURE_INBOX_KEY: CAPTURE_INBOX_KEY,
      TOOL_INTEGRATION_CONTRACT_VERSION: TOOL_INTEGRATION_CONTRACT_VERSION,
      MAX_CAPTURE_INBOX_ITEMS: MAX_CAPTURE_INBOX_ITEMS,
      MAX_CAPTURES_PER_TOOL_PER_MINUTE: MAX_CAPTURES_PER_TOOL_PER_MINUTE,
      RESEARCH_STORAGE_SOFT_LIMIT_BYTES: RESEARCH_STORAGE_SOFT_LIMIT_BYTES,
      MAX_AI_CALLS_PER_SESSION: MAX_AI_CALLS_PER_SESSION,
      // PER_TOUCHPOINT_CAP is defined inside makeAskResearchCoach (deeper
      // closure). We re-construct an instance to capture it.
      _makeAskResearchCoach: makeAskResearchCoach,
    };
    // Also capture PER_TOUCHPOINT_CAP by instantiating an ask wrapper with
    // a noop journal and reaching into its scope via a probe call.
    var _probeJournal = emptyJournal();
    var _probeSetJournal = function () {};
    var _probeWrapper = makeAskResearchCoach({ ai: null, onCallGemini: null, addToast: function(){} }, _probeJournal, _probeSetJournal);
    // The wrapper is a closure; we can't reach PER_TOUCHPOINT_CAP from outside.
    // Instead, expose it directly by adding a sibling capture inside the source.
    // (We do this via a separate splice below.)
    console.log("[harness] research-hub internals captured");
  `;
  src = src.replace(
    `console.log(${SENTINEL}`,
    capture + `\n    console.log(${SENTINEL}`,
  );

  // Second splice: expose PER_TOUCHPOINT_CAP from inside makeAskResearchCoach.
  // The variable is declared as `var PER_TOUCHPOINT_CAP = { ... };` inside the
  // wrapper factory. We splice a capture right after the declaration ends.
  const CAP_SENTINEL = 'stakeholder_translator: 2,';
  if (src.indexOf(CAP_SENTINEL) === -1) {
    throw new Error(
      'Could not find PER_TOUCHPOINT_CAP sentinel to splice after. ' +
      'Did the hub source rename stakeholder_translator? Update the harness.',
    );
  }
  // Find the closing brace of PER_TOUCHPOINT_CAP and splice after it.
  src = src.replace(
    /(var PER_TOUCHPOINT_CAP = \{[\s\S]*?\};)/,
    `$1\n      if (typeof globalThis !== "undefined") { globalThis.__hubPerTouchpointCap = PER_TOUCHPOINT_CAP; }`,
  );

  // Execute the spliced module against window.
  // The module is an IIFE that registers globals on window.
  // eslint-disable-next-line no-new-func
  new Function(src).call(globalThis.window);

  if (!globalThis.__hubInternals) {
    throw new Error('Internals capture failed — module did not execute to the splice point.');
  }
  // Attach the captured PER_TOUCHPOINT_CAP to the internals object.
  if (globalThis.__hubPerTouchpointCap) {
    globalThis.__hubInternals.PER_TOUCHPOINT_CAP = globalThis.__hubPerTouchpointCap;
  }
}

export function internals() {
  if (!globalThis.__hubInternals) {
    throw new Error('Call setupHub() first.');
  }
  return globalThis.__hubInternals;
}
