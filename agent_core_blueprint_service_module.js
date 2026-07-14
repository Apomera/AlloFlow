/**
 * AlloFlow Agent Core — headless Blueprint service (Task 3 of
 * docs/CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md).
 *
 * Makes the Auto-Fill Blueprint workflow callable without UI clicking:
 * create → revise → validate → preview/dry-run → (approval) → planExecution.
 *
 * AI functions are INJECTED so the same service runs everywhere:
 *   - UI adapter passes the live phase_k autoConfigureSettings (bound to its
 *     deps bag) and the ANTI modifyBlueprintWithAI closure.
 *   - Headless/MCP callers and tests pass their own implementations or stubs.
 *
 * The service never executes anything. planExecution returns the ordered
 * legacy-shaped plan for the existing handleExecuteBlueprint path, and only
 * for a Blueprint whose review.state is "approved" — the review-before-
 * execution interaction from the UI is preserved as a contract rule, not a
 * UI accident. Destructive/terminal actions never appear here at all.
 *
 * Dual-mode export like allo_crypto_module.js. Depends on
 * AgentCoreContracts (window.AlloModules.AgentCoreContracts or require()).
 */
(function () {
  'use strict';

  function getContracts(injected) {
    if (injected) return injected;
    if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AgentCoreContracts) {
      return window.AlloModules.AgentCoreContracts;
    }
    if (typeof module !== 'undefined' && typeof require === 'function') {
      try { return require('./agent_core_contracts_module.js'); } catch (_) { return null; }
    }
    return null;
  }

  /**
   * deps:
   *   autoConfigure(request) → Promise<legacyConfig>   (AI create; optional)
   *   modifyBlueprint(legacyConfig, instruction) → Promise<legacyConfig>
   *                                                    (AI revise; optional)
   *   knownTools: string[]      canonical tool ids (ToolCatalog); optional
   *   getCommandContract(id)    AlloCommands contract lookup; optional —
   *                             when present, dry-run steps carry contract info
   *   contracts                 AgentCoreContracts override (tests); optional
   */
  function createBlueprintService(deps) {
    var d = deps || {};
    var C = getContracts(d.contracts);
    if (!C) throw new Error('AgentCoreContracts module is required');
    var knownTools = Array.isArray(d.knownTools) && d.knownTools.length ? d.knownTools : C.FALLBACK_TOOL_IDS;

    function validate(blueprint) {
      return C.validateBlueprint(blueprint, { knownTools: knownTools });
    }

    /**
     * Create a Blueprint draft. request:
     *   { sourceText, gradeLevel, standards, language, guidance, history,
     *     targetCount, blueprintId }
     * With deps.autoConfigure, delegates to it (live phase_k behavior) and
     * wraps the result. Without it, builds a deterministic minimal draft from
     * request.plan — no AI required (offline/dry contexts).
     */
    function createDraft(request) {
      var req = request || {};
      var ctx = {
        blueprintId: req.blueprintId,
        gradeLevel: req.gradeLevel || '',
        language: req.language || '',
        standards: req.standards || '',
        interests: req.interests || '',
        provenance: req.provenance
      };
      if (typeof d.autoConfigure === 'function') {
        return Promise.resolve(d.autoConfigure(req)).then(function (legacyConfig) {
          var bp = C.fromLegacyConfig(legacyConfig, ctx);
          var report = validate(bp);
          if (!report.ok) {
            var e = new Error('Generated Blueprint failed contract validation');
            e.report = report;
            throw e;
          }
          return report.value;
        });
      }
      var plan = Array.isArray(req.plan) && req.plan.length ? req.plan : ['analysis', 'lesson-plan'];
      var bp = C.fromLegacyConfig({ resourcePlan: plan, lessonDNA: req.lessonDNA || {}, globalSettings: { gradeLevel: ctx.gradeLevel } }, ctx);
      var report = validate(bp);
      if (!report.ok) {
        return Promise.reject(Object.assign(new Error('Draft failed contract validation'), { report: report }));
      }
      return Promise.resolve(report.value);
    }

    /**
     * Pure revision: applies ONLY the requested changes.
     * changes: { addTools, removeTools, setDirectives: {tool: directive},
     *            audience, standards, globalSettings, configs, lessonDNA }
     * Returns a NEW draft-state Blueprint (any approval is invalidated).
     */
    function revise(blueprint, changes) {
      var report = validate(blueprint);
      if (!report.ok) return { ok: false, errors: report.errors, value: null };
      var b = report.value;
      var ch = changes || {};
      var plan = b.plan.slice();
      if (Array.isArray(ch.removeTools) && ch.removeTools.length) {
        plan = plan.filter(function (r) { return ch.removeTools.indexOf(r.tool) === -1; });
      }
      if (Array.isArray(ch.addTools)) {
        ch.addTools.forEach(function (tool) {
          if (!plan.some(function (r) { return r.tool === tool; })) plan.push({ tool: tool, directive: '' });
        });
      }
      if (ch.setDirectives && typeof ch.setDirectives === 'object') {
        plan = plan.map(function (r) {
          return Object.prototype.hasOwnProperty.call(ch.setDirectives, r.tool)
            ? { tool: r.tool, directive: String(ch.setDirectives[r.tool] || '') }
            : r;
        });
      }
      var next = {
        schemaVersion: b.schemaVersion,
        blueprintId: b.blueprintId,
        audience: ch.audience ? Object.assign({}, b.audience, ch.audience) : b.audience,
        standards: typeof ch.standards === 'string' ? ch.standards : b.standards,
        sourcePolicy: b.sourcePolicy,
        lessonDNA: ch.lessonDNA ? Object.assign({}, b.lessonDNA, ch.lessonDNA) : b.lessonDNA,
        globalSettings: ch.globalSettings ? Object.assign({}, b.globalSettings, ch.globalSettings) : b.globalSettings,
        plan: plan,
        configs: ch.configs ? Object.assign({}, b.configs, ch.configs) : b.configs,
        warnings: b.warnings,
        review: { state: 'draft', reviewer: '' }, // edits always re-enter review
        provenance: b.provenance
      };
      return validate(next);
    }

    /**
     * AI revision via injected modifyBlueprint (the live ANTI closure or a
     * stub). Runs on the legacy shape (what the live function expects) and
     * re-validates the result. Approval is invalidated like revise().
     */
    function reviseWithAI(blueprint, instruction) {
      if (typeof d.modifyBlueprint !== 'function') {
        return Promise.reject(new Error('modifyBlueprint dependency not configured'));
      }
      var report = validate(blueprint);
      if (!report.ok) return Promise.reject(Object.assign(new Error('Invalid Blueprint'), { report: report }));
      var b = report.value;
      return Promise.resolve(d.modifyBlueprint(C.toLegacyConfig(b), String(instruction || ''))).then(function (legacyConfig) {
        var next = C.fromLegacyConfig(legacyConfig, {
          blueprintId: b.blueprintId,
          gradeLevel: b.audience.gradeLevel,
          language: b.audience.language,
          standards: b.standards,
          provenance: b.provenance
        });
        var out = validate(next);
        if (!out.ok) {
          var e = new Error('Revised Blueprint failed contract validation');
          e.report = out;
          throw e;
        }
        return out.value;
      });
    }

    /**
     * Capability check against a CapabilityManifest (validated or raw).
     * Returns { ok, missing } — missing lists required capability keys the
     * manifest does not provide.
     */
    function checkCapabilities(blueprint, manifest) {
      var report = validate(blueprint);
      if (!report.ok) return { ok: false, missing: [], errors: report.errors };
      var m = manifest && manifest.schemaVersion ? manifest : null;
      var missing = report.value.requiredCapabilities.filter(function (cap) {
        var block = m && m[cap];
        return !(block && block.available);
      });
      return { ok: missing.length === 0, missing: missing, errors: [] };
    }

    /**
     * Side-effect-free dry run. Returns the ordered steps, per-step command
     * contract info when getCommandContract is available, required
     * capabilities, and approvalRequired (always true — effectful execution
     * never happens implicitly).
     */
    function dryRun(blueprint, manifest) {
      var report = validate(blueprint);
      if (!report.ok) return { ok: false, errors: report.errors, steps: [], approvalRequired: true };
      var caps = checkCapabilities(report.value, manifest);
      var steps = report.value.plan.map(function (r, i) {
        var commandId = C.TOOL_TO_COMMAND[r.tool] || null;
        var contract = (commandId && typeof d.getCommandContract === 'function') ? d.getCommandContract(commandId) : null;
        return {
          index: i,
          tool: r.tool,
          directive: r.directive,
          commandId: commandId,
          contract: contract,
          status: (manifest && caps.missing.indexOf(cap(r.tool)) !== -1) ? 'blocked-missing-capability' : 'ready'
        };
      });
      function cap(tool) { return tool === 'image' ? 'imageGeneration' : 'text'; }
      return {
        ok: manifest ? caps.ok : true,
        errors: [],
        steps: steps,
        requiredCapabilities: report.value.requiredCapabilities,
        missingCapabilities: manifest ? caps.missing : [],
        approvalRequired: true
      };
    }

    /** Explicit human approval transition — the only path to executability. */
    function approve(blueprint, reviewer) {
      var report = validate(blueprint);
      if (!report.ok) return { ok: false, errors: report.errors, value: null };
      var b = report.value;
      b.review = { state: 'approved', reviewer: String(reviewer || 'teacher') };
      return { ok: true, errors: [], value: b };
    }

    /**
     * Gate + translate for the existing execution path. Succeeds ONLY for an
     * approved Blueprint; returns the legacy config handleExecuteBlueprint
     * consumes. Performs no execution itself.
     */
    function planExecution(blueprint, manifest) {
      var report = validate(blueprint);
      if (!report.ok) return { ok: false, errors: report.errors, legacyConfig: null };
      if (report.value.review.state !== 'approved') {
        return {
          ok: false,
          errors: [{ code: 'approval-required', path: 'review.state', message: 'A teacher must approve this Blueprint before execution.' }],
          legacyConfig: null
        };
      }
      var caps = checkCapabilities(report.value, manifest);
      if (manifest && !caps.ok) {
        return {
          ok: false,
          errors: caps.missing.map(function (capName) {
            return { code: 'missing-capability', path: 'requiredCapabilities', message: 'No available provider for "' + capName + '". Configure one in AI settings.' };
          }),
          legacyConfig: null
        };
      }
      return { ok: true, errors: [], legacyConfig: C.toLegacyConfig(report.value) };
    }

    return {
      createDraft: createDraft,
      revise: revise,
      reviseWithAI: reviseWithAI,
      validate: validate,
      checkCapabilities: checkCapabilities,
      dryRun: dryRun,
      approve: approve,
      planExecution: planExecution
    };
  }

  var API = { createBlueprintService: createBlueprintService };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreBlueprintService = API;
  }
})();
