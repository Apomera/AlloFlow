/**
 * Thin browser/UI adapter for the headless Agent Core Blueprint service.
 * Keeps React state in the legacy Auto-Fill shape while every create, revise,
 * validate, and execute boundary passes through the versioned core contracts.
 */
(function () {
  'use strict';

  function resolveModules(injected) {
    var allo = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules : {};
    var Contracts = injected.contracts || allo.AgentCoreContracts;
    var BlueprintService = injected.blueprintService || allo.AgentCoreBlueprintService;
    if (typeof module !== 'undefined' && typeof require === 'function') {
      if (!Contracts) {
        try { Contracts = require('./agent_core_contracts_module.js'); } catch (_) {}
      }
      if (!BlueprintService) {
        try { BlueprintService = require('./agent_core_blueprint_service_module.js'); } catch (_) {}
      }
    }
    if (!Contracts) throw new Error('AgentCoreContracts module is required');
    if (!BlueprintService || typeof BlueprintService.createBlueprintService !== 'function') {
      throw new Error('AgentCoreBlueprintService module is required');
    }
    return { Contracts: Contracts, BlueprintService: BlueprintService };
  }

  function normalizeContext(context) {
    var ctx = context && typeof context === 'object' ? context : {};
    var interests = Array.isArray(ctx.interests) ? ctx.interests.join(', ') : (ctx.interests || '');
    return {
      blueprintId: ctx.blueprintId,
      gradeLevel: ctx.gradeLevel || '',
      language: ctx.language || '',
      standards: ctx.standards || '',
      interests: String(interests),
      sourcePolicy: ctx.sourcePolicy,
      provenance: ctx.provenance
    };
  }

  function createUIAdapter(deps) {
    var d = deps || {};
    var modules = resolveModules(d);
    var C = modules.Contracts;
    var S = modules.BlueprintService;
    var knownTools = Array.isArray(d.knownTools) && d.knownTools.length ? d.knownTools : C.FALLBACK_TOOL_IDS;

    function service(extra) {
      return S.createBlueprintService(Object.assign({ contracts: C, knownTools: knownTools }, extra || {}));
    }

    function toBlueprint(legacyConfig, context) {
      var ctx = normalizeContext(context);
      var draft = C.fromLegacyConfig(legacyConfig, ctx);
      if (ctx.sourcePolicy && typeof ctx.sourcePolicy === 'object') draft.sourcePolicy = ctx.sourcePolicy;
      var report = service().validate(draft);
      if (!report.ok) {
        var error = new Error('Legacy Auto-Fill config failed Agent Core validation');
        error.report = report;
        throw error;
      }
      return report.value;
    }

    function validateLegacy(legacyConfig, context) {
      try {
        var blueprint = toBlueprint(legacyConfig, context);
        return { ok: true, errors: [], warnings: blueprint.warnings || [], value: blueprint };
      } catch (error) {
        return error && error.report ? error.report : {
          ok: false,
          errors: [{ code: 'adapter-validation-failed', path: '', message: error && error.message ? error.message : 'Validation failed.' }],
          warnings: [],
          value: null
        };
      }
    }

    async function createDraft(request) {
      if (typeof d.autoConfigure !== 'function') throw new Error('autoConfigure dependency not configured');
      var normalizedRequest = Object.assign({}, request || {}, normalizeContext(request));
      var blueprint = await service({ autoConfigure: d.autoConfigure }).createDraft(normalizedRequest);
      return { blueprint: blueprint, legacyConfig: C.toLegacyConfig(blueprint) };
    }

    async function reviseLegacy(legacyConfig, instruction, context) {
      if (typeof d.modifyBlueprint !== 'function') throw new Error('modifyBlueprint dependency not configured');
      var blueprint = toBlueprint(legacyConfig, context);
      var revised = await service({ modifyBlueprint: d.modifyBlueprint }).reviseWithAI(blueprint, instruction);
      return { blueprint: revised, legacyConfig: C.toLegacyConfig(revised) };
    }

    function prepareExecution(legacyConfig, context, reviewer, manifest) {
      var reviewerName = typeof reviewer === 'string' ? reviewer.trim() : '';
      if (!reviewerName) {
        return {
          ok: false,
          errors: [{ code: 'reviewer-required', path: 'review.reviewer', message: 'Explicit UI approval requires a reviewer marker.' }],
          blueprint: null,
          legacyConfig: null
        };
      }
      var blueprint;
      try { blueprint = toBlueprint(legacyConfig, context); }
      catch (error) {
        return {
          ok: false,
          errors: error && error.report ? error.report.errors : [{ code: 'adapter-validation-failed', path: '', message: error.message }],
          blueprint: null,
          legacyConfig: null
        };
      }
      var core = service();
      var approved = core.approve(blueprint, reviewerName);
      if (!approved.ok) return { ok: false, errors: approved.errors, blueprint: null, legacyConfig: null };
      var planned = core.planExecution(approved.value, manifest);
      return {
        ok: planned.ok,
        errors: planned.errors || [],
        blueprint: planned.ok ? approved.value : null,
        legacyConfig: planned.ok ? planned.legacyConfig : null
      };
    }

    return {
      createDraft: createDraft,
      reviseLegacy: reviseLegacy,
      toBlueprint: toBlueprint,
      validateLegacy: validateLegacy,
      prepareExecution: prepareExecution
    };
  }

  var API = { createUIAdapter: createUIAdapter, normalizeContext: normalizeContext };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreUIAdapter = API;
  }
})();
