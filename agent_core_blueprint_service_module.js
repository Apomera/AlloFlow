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
      var requestedGlobalSettings = req.globalSettings && typeof req.globalSettings === 'object' && !Array.isArray(req.globalSettings)
        ? req.globalSettings : {};
      var globalSettings = Object.assign({}, requestedGlobalSettings);
      if (ctx.gradeLevel) globalSettings.gradeLevel = ctx.gradeLevel;
      var bp = C.fromLegacyConfig({ resourcePlan: plan, lessonDNA: req.lessonDNA || {}, globalSettings: globalSettings }, ctx);
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
          interests: b.audience.interests,
          standards: b.standards,
          provenance: b.provenance
        });
        // The legacy shape cannot represent every Blueprint field. Preserve
        // contract context that the AI revision never received rather than
        // silently resetting it during the round-trip.
        next.audience = Object.assign({}, b.audience, next.audience);
        next.sourcePolicy = b.sourcePolicy;
        next.warnings = b.warnings;
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



  /**
   * Versioned command-workflow lifecycle. Reuses the Blueprint service's
   * draft/revise/dry-run/approve pattern while delegating command semantics to
   * AlloCommands through injected functions.
   */
  var COMMAND_WORKFLOW_LIBRARY_KEY = 'alloflow_command_blueprints_v1';

  function createCommandWorkflowService(deps) {
    var d = deps || {};
    var C = getContracts(d.contracts);
    if (!C || typeof C.validateCommandWorkflow !== 'function') throw new Error('CommandWorkflow contracts are required');

    function commandList(ctx) {
      if (typeof d.getCommands !== 'function') return [];
      try { return d.getCommands(ctx || {}, { includeGated: true }) || []; } catch (_) { return []; }
    }
    function knownIds(ctx) { return commandList(ctx).map(function (command) { return command && command.id; }).filter(Boolean); }
    function commandById(ctx, id) { return commandList(ctx).find(function (command) { return command && command.id === id; }) || { id: id }; }
    function sanitizeSteps(steps, ctx) {
      return (Array.isArray(steps) ? steps : []).slice(0, 8).map(function (raw, index) {
        var command = commandById(ctx, raw && raw.commandId);
        var params = raw && raw.params || {};
        if (typeof d.sanitizeCommandParams === 'function') {
          try { params = d.sanitizeCommandParams(command, params); } catch (_) { params = {}; }
        }
        return {
          stepId: String(raw && raw.stepId || 'step-' + (index + 1)),
          commandId: String(raw && raw.commandId || ''),
          params: params,
          why: String(raw && raw.why || '').slice(0, 120),
          onFailure: raw && raw.onFailure === 'stop' ? 'stop' : 'pause'
        };
      });
    }
    function validate(workflow, ctx) {
      return C.validateCommandWorkflow(workflow, { knownCommandIds: knownIds(ctx) });
    }
    function createDraft(request, ctx) {
      var req = request || {};
      return validate({
        schemaVersion: C.SCHEMA_VERSION,
        workflowId: String(req.workflowId || 'cw-' + Date.now().toString(36)),
        kind: 'command-workflow',
        audience: req.audience || 'teacher',
        steps: sanitizeSteps(req.steps, ctx),
        warnings: [],
        review: { state: 'draft', reviewer: '' },
        provenance: req.provenance || {}
      }, ctx);
    }
    function revise(workflow, changes, ctx) {
      var report = validate(workflow, ctx);
      if (!report.ok) return report;
      var next = report.value;
      var ch = changes || {};
      var steps = next.steps.map(function (step) { return Object.assign({}, step, { params: Object.assign({}, step.params) }); });
      if (Array.isArray(ch.replaceSteps)) steps = sanitizeSteps(ch.replaceSteps, ctx);
      if (ch.removeStepId) steps = steps.filter(function (step) { return step.stepId !== ch.removeStepId; });
      if (ch.moveStep && ch.moveStep.stepId) {
        var from = steps.findIndex(function (step) { return step.stepId === ch.moveStep.stepId; });
        if (from >= 0) {
          var moved = steps.splice(from, 1)[0];
          var to = Math.max(0, Math.min(steps.length, Number(ch.moveStep.toIndex) || 0));
          steps.splice(to, 0, moved);
        }
      }
      if (ch.setParam && ch.setParam.stepId) {
        steps = steps.map(function (step) {
          if (step.stepId !== ch.setParam.stepId) return step;
          var params = Object.assign({}, step.params);
          params[ch.setParam.key] = ch.setParam.value;
          var command = commandById(ctx, step.commandId);
          if (typeof d.sanitizeCommandParams === 'function') {
            try { params = d.sanitizeCommandParams(command, params); } catch (_) { params = {}; }
          }
          return Object.assign({}, step, { params: params });
        });
      }
      return validate(Object.assign({}, next, { steps: steps, review: { state: 'draft', reviewer: '' } }), ctx);
    }
    function reviseFromText(workflow, instruction, ctx) {
      var report = validate(workflow, ctx);
      if (!report.ok) return Object.assign({}, report, { summary: '' });
      var text = String(instruction || '').trim();
      var steps = report.value.steps;
      var match = text.match(/^(?:remove|delete)\s+(?:step\s+)?(\d+)\s*[.!]?$/i);
      if (match) {
        var removeIndex = Number(match[1]) - 1;
        if (!steps[removeIndex]) return { ok: false, errors: [{ code: 'unknown-step', path: 'steps', message: 'That step number is not in the workflow.' }], value: null, summary: '' };
        var removed = steps[removeIndex];
        var removedReport = revise(report.value, { removeStepId: removed.stepId }, ctx);
        return Object.assign({}, removedReport, { summary: 'Removed step ' + (removeIndex + 1) + '.' });
      }
      match = text.match(/^move\s+(?:step\s+)?(\d+)\s+(first|last|up|down|before\s+(?:step\s+)?\d+|after\s+(?:step\s+)?\d+)\s*[.!]?$/i);
      if (match) {
        var fromIndex = Number(match[1]) - 1;
        if (!steps[fromIndex]) return { ok: false, errors: [{ code: 'unknown-step', path: 'steps', message: 'That step number is not in the workflow.' }], value: null, summary: '' };
        var target = match[2].toLowerCase();
        var toIndex = fromIndex;
        if (target === 'first') toIndex = 0;
        else if (target === 'last') toIndex = steps.length - 1;
        else if (target === 'up') toIndex = Math.max(0, fromIndex - 1);
        else if (target === 'down') toIndex = Math.min(steps.length - 1, fromIndex + 1);
        else {
          var targetNumber = Number((target.match(/\d+/) || [0])[0]) - 1;
          if (!steps[targetNumber]) return { ok: false, errors: [{ code: 'unknown-target-step', path: 'steps', message: 'The destination step number is not in the workflow.' }], value: null, summary: '' };
          toIndex = /^after/.test(target) ? targetNumber + 1 : targetNumber;
          if (fromIndex < toIndex) toIndex -= 1;
        }
        var moveReport = revise(report.value, { moveStep: { stepId: steps[fromIndex].stepId, toIndex: toIndex } }, ctx);
        return Object.assign({}, moveReport, { summary: 'Moved step ' + (fromIndex + 1) + '.' });
      }
      match = text.match(/^(?:set|change)\s+(?:step\s+)?(\d+)\s+([a-zA-Z][a-zA-Z0-9_-]*)\s+(?:to|=)\s+(.+?)\s*[.!]?$/i);
      if (match) {
        var setIndex = Number(match[1]) - 1;
        if (!steps[setIndex]) return { ok: false, errors: [{ code: 'unknown-step', path: 'steps', message: 'That step number is not in the workflow.' }], value: null, summary: '' };
        var rawValue = match[3].trim();
        var value = /^(true|false)$/i.test(rawValue) ? /^true$/i.test(rawValue) : (/^-?\d+(?:\.\d+)?$/.test(rawValue) ? Number(rawValue) : rawValue);
        var setReport = revise(report.value, { setParam: { stepId: steps[setIndex].stepId, key: match[2], value: value } }, ctx);
        if (setReport.ok && !Object.prototype.hasOwnProperty.call(setReport.value.steps[setIndex].params, match[2])) {
          return { ok: false, errors: [{ code: 'unsupported-param', path: 'steps[' + setIndex + '].params.' + match[2], message: 'That command does not accept the requested parameter.' }], value: null, summary: '' };
        }
        return Object.assign({}, setReport, { summary: 'Updated step ' + (setIndex + 1) + '.' });
      }
      return { ok: false, errors: [{ code: 'edit-not-understood', path: '', message: 'Try “remove step 2”, “move step 3 first”, or “set step 1 grade to 4”.' }], value: null, summary: '' };
    }
    function dryRun(workflow, ctx, opts) {
      var report = validate(workflow, ctx);
      if (!report.ok) return { ok: false, errors: report.errors, steps: [], approvalRequired: true };
      var rawSteps = report.value.steps.map(function (step) { return { commandId: step.commandId, params: step.params, why: step.why }; });
      var readiness = typeof d.validatePlan === 'function' ? d.validatePlan(ctx || {}, rawSteps, opts || {}) : { ok: true, items: rawSteps.map(function (step, index) { return { index: index, commandId: step.commandId, status: 'ready', detail: '' }; }) };
      return {
        ok: !!readiness.ok,
        errors: readiness.ok ? [] : [{ code: 'workflow-blocked', path: 'steps', message: 'One or more workflow steps are blocked.' }],
        steps: report.value.steps.map(function (step, index) { return Object.assign({}, step, { readiness: readiness.items && readiness.items[index] || { status: 'ready', detail: '' } }); }),
        approvalRequired: true
      };
    }
    function approve(workflow, reviewer, ctx) {
      var report = validate(workflow, ctx);
      if (!report.ok) return report;
      return validate(Object.assign({}, report.value, { review: { state: 'approved', reviewer: String(reviewer || 'teacher').slice(0, 200) } }), ctx);
    }
    function planExecution(workflow, ctx, opts) {
      var report = validate(workflow, ctx);
      if (!report.ok) return { ok: false, errors: report.errors, steps: [], dryRun: null };
      if (report.value.review.state !== 'approved') return { ok: false, errors: [{ code: 'approval-required', path: 'review.state', message: 'A teacher must approve this command workflow before execution.' }], steps: [], dryRun: null };
      var preview = dryRun(report.value, ctx, opts);
      if (!preview.ok) return { ok: false, errors: preview.errors, steps: [], dryRun: preview };
      return { ok: true, errors: [], steps: report.value.steps.map(function (step) { return { commandId: step.commandId, params: step.params, why: step.why }; }), dryRun: preview };
    }

    function libraryError(code, message) {
      return { ok: false, errors: [{ code: code, path: 'library', message: message }], warnings: [], items: [], value: null };
    }
    function currentAudience(ctx) {
      if (typeof d.getAudience === 'function') {
        try { return d.getAudience(ctx || {}); } catch (_) {}
      }
      return ctx && ctx.commandAudience || '';
    }
    function storageBackend() {
      return d.storage && typeof d.storage.getItem === 'function' && typeof d.storage.setItem === 'function' ? d.storage : null;
    }
    function parseLibrary() {
      var storage = storageBackend();
      if (!storage) return libraryError('storage-unavailable', 'Saved Command Blueprints are unavailable in this environment.');
      try {
        var raw = storage.getItem(COMMAND_WORKFLOW_LIBRARY_KEY);
        if (!raw) return { ok: true, errors: [], warnings: [], items: [] };
        var parsed = JSON.parse(raw);
        var items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : null);
        if (!items) return libraryError('library-corrupt', 'The saved Command Blueprint library could not be read.');
        if (!Array.isArray(parsed) && parsed.schemaVersion !== C.SCHEMA_VERSION) return libraryError('library-version-unsupported', 'This saved Command Blueprint library uses an unsupported version.');
        return { ok: true, errors: [], warnings: [], items: items.slice(0, 24) };
      } catch (_) {
        return libraryError('library-corrupt', 'The saved Command Blueprint library could not be read.');
      }
    }
    function writeLibrary(items) {
      var storage = storageBackend();
      if (!storage) return libraryError('storage-unavailable', 'Saved Command Blueprints are unavailable in this environment.');
      try {
        storage.setItem(COMMAND_WORKFLOW_LIBRARY_KEY, JSON.stringify({ schemaVersion: C.SCHEMA_VERSION, items: items.slice(0, 24) }));
        return { ok: true, errors: [], warnings: [], items: items.slice(0, 24) };
      } catch (_) {
        return libraryError('storage-write-failed', 'The Command Blueprint could not be saved on this device.');
      }
    }
    function normalizeTemplateName(name, fallback) {
      var clean = String(name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
      return clean || fallback || 'Command Blueprint';
    }
    function listSaved(ctx) {
      var parsed = parseLibrary();
      if (!parsed.ok) return parsed;
      var audience = currentAudience(ctx);
      var warnings = [];
      var items = [];
      parsed.items.forEach(function (raw, index) {
        if (!raw || typeof raw !== 'object' || !raw.workflow) {
          warnings.push({ code: 'invalid-saved-workflow', path: 'library[' + index + ']', message: 'An invalid saved workflow was ignored.' });
          return;
        }
        if (audience && raw.workflow.audience !== audience) return;
        var report = validate(raw.workflow, ctx);
        if (!report.ok) {
          warnings.push({ code: 'invalid-saved-workflow', path: 'library[' + index + ']', message: 'A saved workflow is no longer valid in this command catalog.' });
          return;
        }
        if (audience && report.value.audience !== audience) return;
        items.push({
          workflowId: report.value.workflowId,
          name: normalizeTemplateName(raw.name, 'Command Blueprint ' + (index + 1)),
          workflow: report.value,
          createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
          updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
        });
      });
      items.sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
      return { ok: true, errors: [], warnings: warnings, items: items };
    }
    function saveSaved(workflow, name, ctx) {
      var report = validate(workflow, ctx);
      if (!report.ok) return Object.assign({}, report, { items: [] });
      var audience = currentAudience(ctx);
      if (audience && report.value.audience !== audience) return libraryError('audience-mismatch', 'This Command Blueprint belongs to a different view.');
      var draftReport = validate(Object.assign({}, report.value, { review: { state: 'draft', reviewer: '' } }), ctx);
      if (!draftReport.ok) return Object.assign({}, draftReport, { items: [] });
      var parsed = parseLibrary();
      if (!parsed.ok) return parsed;
      var existing = parsed.items.find(function (item) { return item && item.workflow && item.workflow.workflowId === draftReport.value.workflowId && item.workflow.audience === draftReport.value.audience; });
      var now = typeof d.now === 'function' ? String(d.now()) : new Date().toISOString();
      var record = {
        workflowId: draftReport.value.workflowId,
        name: normalizeTemplateName(name, existing && existing.name),
        workflow: draftReport.value,
        createdAt: existing && typeof existing.createdAt === 'string' ? existing.createdAt : now,
        updatedAt: now
      };
      var next = [record].concat(parsed.items.filter(function (item) { return !(item && item.workflow && item.workflow.workflowId === record.workflowId && item.workflow.audience === record.workflow.audience); }));
      var written = writeLibrary(next);
      return written.ok ? { ok: true, errors: [], warnings: [], value: record, items: listSaved(ctx).items } : written;
    }
    function loadSaved(workflowId, ctx) {
      var listed = listSaved(ctx);
      if (!listed.ok) return Object.assign({}, listed, { value: null });
      var found = listed.items.find(function (item) { return item.workflowId === String(workflowId || ''); });
      if (!found) return libraryError('saved-workflow-not-found', 'That saved Command Blueprint is not available in this view.');
      var report = validate(Object.assign({}, found.workflow, { review: { state: 'draft', reviewer: '' } }), ctx);
      if (!report.ok) return Object.assign({}, report, { items: listed.items });
      return { ok: true, errors: [], warnings: listed.warnings, value: report.value, template: found, items: listed.items };
    }
    function deleteSaved(workflowId, ctx) {
      var listed = listSaved(ctx);
      if (!listed.ok) return listed;
      var allowed = listed.items.some(function (item) { return item.workflowId === String(workflowId || ''); });
      if (!allowed) return libraryError('saved-workflow-not-found', 'That saved Command Blueprint is not available in this view.');
      var parsed = parseLibrary();
      if (!parsed.ok) return parsed;
      var audience = currentAudience(ctx);
      var next = parsed.items.filter(function (item) { return !(item && item.workflow && item.workflow.workflowId === String(workflowId || '') && (!audience || item.workflow.audience === audience)); });
      var written = writeLibrary(next);
      return written.ok ? { ok: true, errors: [], warnings: [], items: listSaved(ctx).items } : written;
    }
    return {
      createDraft: createDraft,
      revise: revise,
      reviseFromText: reviseFromText,
      validate: validate,
      dryRun: dryRun,
      approve: approve,
      planExecution: planExecution,
      listSaved: listSaved,
      saveSaved: saveSaved,
      loadSaved: loadSaved,
      deleteSaved: deleteSaved
    };
  }


  var API = { createBlueprintService: createBlueprintService, createCommandWorkflowService: createCommandWorkflowService, COMMAND_WORKFLOW_LIBRARY_KEY: COMMAND_WORKFLOW_LIBRARY_KEY };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreBlueprintService = API;
  }
})();
