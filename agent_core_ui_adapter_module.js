/**
 * Thin browser/UI adapter for the headless Agent Core Blueprint service.
 * Keeps React state in the legacy Auto-Fill shape while every create, revise,
 * validate, and execute boundary passes through the versioned core contracts.
 */
(function () {
  'use strict';

  function isUnsafeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }
  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function safeAssign(target, source) {
    if (!isPlainObject(source)) return target;
    Object.keys(source).forEach(function (key) {
      if (!isUnsafeKey(key)) target[key] = source[key];
    });
    return target;
  }
  function isBrowserAiBlocked(fn) {
    if (fn && fn._alloQrBlocked === true) return true;
    if (typeof window === 'undefined' || !window) return false;
    if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window._alloQrBlocked === true) return true;
    if (window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false) return true;
    if (window.__alloQrStudentMode) {
      if (typeof window.__alloAiUsable === 'function') {
        try { return !window.__alloAiUsable('text', fn); } catch (_) { return true; }
      }
      return true;
    }
    if (typeof window.__alloAiUsable === 'function') {
      try { return !window.__alloAiUsable('text', fn); } catch (_) { return true; }
    }
    return false;
  }

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
      appLanguage: ctx.appLanguage || ctx.currentUiLanguage || '',
      nativeLanguageDefaultsVersion: Number(ctx.nativeLanguageDefaultsVersion) || 0,
      effectiveLanguageList: Array.isArray(ctx.effectiveLanguageList) ? ctx.effectiveLanguageList.slice() : undefined,
      outputLanguagePreference: isPlainObject(ctx.outputLanguagePreference) ? safeAssign({}, ctx.outputLanguagePreference) : undefined,
      standards: ctx.standards || '',
      standardsContext: ctx.standardsContext || null,
      instructionalContext: ctx.instructionalContext || null,
      interests: String(interests),
      studentInterests: Array.isArray(ctx.studentInterests)
        ? ctx.studentInterests.slice()
        : (Array.isArray(ctx.interests) ? ctx.interests.slice() : ctx.studentInterests),
      selectedLanguages: Array.isArray(ctx.selectedLanguages) ? ctx.selectedLanguages.slice() : undefined,
      translationMode: ctx.translationMode,
      currentUiLanguage: ctx.currentUiLanguage,
      translationTargetChoices: Array.isArray(ctx.translationTargetChoices) ? ctx.translationTargetChoices.slice() : undefined,
      resolvedTranslationTarget: ctx.resolvedTranslationTarget,
      differentiationRange: ctx.differentiationRange,
      differentiationTypes: Array.isArray(ctx.differentiationTypes) ? ctx.differentiationTypes.slice() : undefined,
      differentiationCustomGrades: Array.isArray(ctx.differentiationCustomGrades) ? ctx.differentiationCustomGrades.slice() : undefined,
      dokLevel: ctx.dokLevel,
      useEmojis: ctx.useEmojis,
      textFormat: ctx.textFormat,
      imageGenerationStyle: ctx.imageGenerationStyle,
      imageAspectRatio: ctx.imageAspectRatio,
      targetStandards: Array.isArray(ctx.targetStandards) ? ctx.targetStandards.slice() : undefined,
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
      return S.createBlueprintService(safeAssign({ contracts: C, knownTools: knownTools, generationMatrix: d.generationMatrix }, extra));
    }

    function toBlueprint(legacyConfig, context) {
      var ctx = normalizeContext(context);
      var draft = C.fromLegacyConfig(legacyConfig, ctx);
      var svc = service();
      if (typeof svc.applyTextAccessDefaults === 'function') {
        draft = svc.applyTextAccessDefaults(draft, { ensureAnalysis: true, ensureAdapted: true });
      }
      var matrix = d.generationMatrix || (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.GenerationMatrix);
      if (!matrix && Array.isArray(draft.plan)) {
        draft.plan = draft.plan.map(function (row) {
          return row && row.generationMatrixUnavailable === true ? row : safeAssign(safeAssign({}, row), { generationMatrixUnavailable: true });
        });
      }
      if (isPlainObject(ctx.sourcePolicy)) draft.sourcePolicy = safeAssign({}, ctx.sourcePolicy);
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
      if (isBrowserAiBlocked(d.autoConfigure)) throw new Error('AI generation is disabled in this session');
      var normalizedRequest = safeAssign(safeAssign({}, request), normalizeContext(request));
      var blueprint = await service({ autoConfigure: d.autoConfigure }).createDraft(normalizedRequest);
      return { blueprint: blueprint, legacyConfig: C.toLegacyConfig(blueprint) };
    }

    async function reviseLegacy(legacyConfig, instruction, context) {
      if (typeof d.modifyBlueprint !== 'function') throw new Error('modifyBlueprint dependency not configured');
      if (isBrowserAiBlocked(d.modifyBlueprint)) throw new Error('AI generation is disabled in this session');
      var blueprint = toBlueprint(legacyConfig, context);
      var revised = await service({ modifyBlueprint: d.modifyBlueprint }).reviseWithAI(blueprint, instruction);
      return { blueprint: revised, legacyConfig: C.toLegacyConfig(revised) };
    }

    function prepareExecution(legacyConfig, context, reviewer, manifest) {
      var reviewerName = typeof reviewer === 'string'
        ? reviewer.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200)
        : '';
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
          errors: error && error.report ? error.report.errors : [{ code: 'adapter-validation-failed', path: '', message: (error && error.message) ? error.message : 'Validation failed.' }],
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
