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

  function getGenerationMatrix(injected) {
    if (injected) return injected;
    if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.GenerationMatrix) {
      return window.AlloModules.GenerationMatrix;
    }
    if (typeof module !== 'undefined' && typeof require === 'function') {
      try { return require('./generation_matrix_module.js'); } catch (_) { return null; }
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
    var GenerationMatrix = getGenerationMatrix(d.generationMatrix);
    var knownTools = Array.isArray(d.knownTools) && d.knownTools.length ? d.knownTools : C.FALLBACK_TOOL_IDS;

    function list(value) {
      return Array.isArray(value) ? value.slice() : [];
    }

    // Freeze every Universal modifier at creation time. GenerationMatrix owns
    // multiplicity and reuse policy; this service only captures the reviewed
    // inputs so execution never consults whatever the controls contain later.
    function frozenSettings(request, legacySettings) {
      var req = request || {};
      var prior = legacySettings && typeof legacySettings === 'object' && !Array.isArray(legacySettings) ? legacySettings : {};
      var primaryLanguage = req.primaryLanguage || req.language || prior.primaryLanguage || prior.language || prior.leveledTextLanguage || '';
      var reviewedImageStyle = req.universalImageStyle !== undefined ? req.universalImageStyle
        : (req.imageGenerationStyle !== undefined ? req.imageGenerationStyle
          : (prior.universalImageStyle !== undefined ? prior.universalImageStyle : prior.imageGenerationStyle));
      var raw = Object.assign({}, prior, {
        gradeLevel: req.gradeLevel || prior.gradeLevel || '',
        tone: req.tone !== undefined ? req.tone : prior.tone,
        primaryLanguage: primaryLanguage,
        language: primaryLanguage,
        leveledTextLanguage: primaryLanguage,
        selectedLanguages: list(req.selectedLanguages !== undefined ? req.selectedLanguages : prior.selectedLanguages),
        translationMode: req.translationMode !== undefined ? req.translationMode : prior.translationMode,
        currentUiLanguage: req.currentUiLanguage !== undefined ? req.currentUiLanguage : prior.currentUiLanguage,
        translationTargetChoices: list(req.translationTargetChoices !== undefined ? req.translationTargetChoices : prior.translationTargetChoices),
        resolvedTranslationTarget: req.resolvedTranslationTarget !== undefined ? req.resolvedTranslationTarget : prior.resolvedTranslationTarget,
        translationTarget: req.resolvedTranslationTarget !== undefined ? req.resolvedTranslationTarget
          : (req.translationTarget !== undefined ? req.translationTarget : (prior.translationTarget || prior.resolvedTranslationTarget)),
        differentiationRange: req.differentiationRange !== undefined ? req.differentiationRange : prior.differentiationRange,
        differentiationTypes: list(req.differentiationTypes !== undefined ? req.differentiationTypes : prior.differentiationTypes),
        differentiationCustomGrades: list(req.differentiationCustomGrades !== undefined ? req.differentiationCustomGrades : prior.differentiationCustomGrades),
        studentInterests: Array.isArray(req.studentInterests)
          ? req.studentInterests.slice()
          : (req.studentInterests !== undefined ? req.studentInterests
            : (Array.isArray(req.interests) ? req.interests.slice()
              : (req.interests !== undefined ? req.interests : prior.studentInterests))),
        dokLevel: req.dokLevel !== undefined ? req.dokLevel : prior.dokLevel,
        useEmojis: req.useEmojis !== undefined ? req.useEmojis : prior.useEmojis,
        textFormat: req.textFormat !== undefined ? req.textFormat : prior.textFormat,
        imageGenerationStyle: reviewedImageStyle,
        universalImageStyle: reviewedImageStyle,
        imageAspectRatio: req.imageAspectRatio !== undefined ? req.imageAspectRatio : prior.imageAspectRatio,
        generationContext: req.generationContext !== undefined ? req.generationContext : prior.generationContext,
        generationOptions: req.generationOptions !== undefined ? req.generationOptions : prior.generationOptions,
        toolOverrides: req.toolOverrides !== undefined ? req.toolOverrides : prior.toolOverrides,
        backend: req.backend !== undefined ? req.backend : (req.aiBackend !== undefined ? req.aiBackend : prior.backend),
        provider: req.provider !== undefined ? req.provider : (req.aiProvider !== undefined ? req.aiProvider : prior.provider),
        model: req.model !== undefined ? req.model : (req.modelId !== undefined ? req.modelId : prior.model),
        fallbackModel: req.fallbackModel !== undefined ? req.fallbackModel : prior.fallbackModel,
        imageProvider: req.imageProvider !== undefined ? req.imageProvider : prior.imageProvider,
        imageModel: req.imageModel !== undefined ? req.imageModel : prior.imageModel,
        visionModel: req.visionModel !== undefined ? req.visionModel : prior.visionModel,
        targetStandards: list(req.targetStandards !== undefined ? req.targetStandards : prior.targetStandards),
        standardsFingerprint: req.standardsFingerprint
          || (req.instructionalContext && req.instructionalContext.standardsFingerprint)
          || prior.standardsFingerprint || '',
        contextFingerprint: req.contextFingerprint || prior.contextFingerprint || '',
        sourceArtifactId: req.sourceArtifactId || req.primaryArtifactId || prior.sourceArtifactId || ''
      });
      if (GenerationMatrix && typeof GenerationMatrix.buildFrozenGenerationSettings === 'function') {
        try {
          var canonical = GenerationMatrix.buildFrozenGenerationSettings(Object.assign({}, raw, {
            sourceText: req.sourceText || '',
            sourceFingerprint: req.sourceFingerprint || prior.sourceFingerprint || ''
          }));
          // The matrix normalizer intentionally retains only policy inputs.
          // Blueprint review also needs the translation inputs themselves, so
          // retain the complete Universal snapshot alongside its canonical
          // derived fields.
          return Object.freeze(Object.assign({}, raw, canonical));
        } catch (_) {}
      }
      return Object.freeze(raw);
    }

    function generationOptions(request, settings) {
      var req = request || {};
      var artifacts = Array.isArray(req.existingArtifacts) ? req.existingArtifacts
        : (Array.isArray(req.history) ? req.history : []);
      return Object.assign({}, settings || {}, {
        existingArtifacts: artifacts,
        sourceText: req.sourceText || '',
        sourceFingerprint: req.sourceFingerprint || settings.sourceFingerprint || ''
      });
    }

    function resolveRows(rows, request, settings) {
      var input = Array.isArray(rows) ? rows : [];
      if (!GenerationMatrix || typeof GenerationMatrix.resolvePlanRows !== 'function') {
        return input.map(function (row) {
          return row && row.generationMatrixUnavailable === true
            ? row : Object.assign({}, row, { generationMatrixUnavailable: true });
        });
      }
      try {
        var resolved = GenerationMatrix.resolvePlanRows(input, generationOptions(request, settings));
        return resolved && Array.isArray(resolved.rows) ? resolved.rows : input;
      } catch (_) {
        return input.map(function (row) { return Object.assign({}, row, { generationMatrixUnavailable: true }); });
      }
    }

    function generationFields(row) {
      var out = {};
      if (!row || typeof row !== 'object') return out;
      ['generationAction', 'generationIdentity', 'generationVariants', 'existingArtifactId', 'variantKey', 'explicitVariantKey', 'variantKeyDerived',
        'sourceFingerprint', 'sourceArtifactId', 'contextFingerprint', 'contextInputsFingerprint', 'contextFingerprintDerived',
        'generationConfig', 'generationConfigFingerprint', 'generationPolicy', 'novelResource', 'suppressedGenerationVariants',
        'generationMatrix', 'generationMatrixUnavailable'].forEach(function (key) {
        if (row[key] !== undefined) out[key] = row[key];
      });
      return out;
    }

    function generationInputsChanged(before, after) {
      if (!before || !after) return true;
      var beforeActivity = before.activityConfig && typeof before.activityConfig === 'object' ? before.activityConfig : null;
      var afterActivity = after.activityConfig && typeof after.activityConfig === 'object' ? after.activityConfig : null;
      return String(before.tool || '') !== String(after.tool || '')
        || String(before.directive || '') !== String(after.directive || '')
        || String(before.activityMode || '') !== String(after.activityMode || '')
        || JSON.stringify(beforeActivity) !== JSON.stringify(afterActivity);
    }

    function generationSettingsChanged(before, after) {
      var keys = ['gradeLevel', 'tone', 'primaryLanguage', 'language', 'leveledTextLanguage', 'selectedLanguages',
        'translationMode', 'currentUiLanguage', 'translationTarget', 'resolvedTranslationTarget',
        'differentiationRange', 'differentiationGrades', 'differentiationTypes', 'differentiationCustomGrades',
        'studentInterests', 'dokLevel', 'useEmojis', 'textFormat', 'imageGenerationStyle', 'universalImageStyle', 'imageAspectRatio',
        'backend', 'provider', 'model', 'fallbackModel', 'imageProvider', 'imageModel', 'visionModel', 'toolOverrides', 'generationOptions', 'generationContext',
        'standardsFingerprint', 'contextFingerprint', 'contextInputsFingerprint', 'generationConfigFingerprint',
        'sourceFingerprint', 'sourceArtifactId', 'groupId'];
      var left = {};
      var right = {};
      keys.forEach(function (key) {
        left[key] = before && before[key] !== undefined ? before[key] : null;
        right[key] = after && after[key] !== undefined ? after[key] : null;
      });
      return JSON.stringify(left) !== JSON.stringify(right);
    }

    function priorArtifactDescriptors(blueprint, row) {
      if (!row || !Array.isArray(row.generationVariants)) return [];
      return row.generationVariants.map(function (variant) {
        if (!variant || !variant.existingArtifactId) return null;
        return {
          id: variant.existingArtifactId,
          type: row.tool,
          generationIdentity: variant.generationIdentity,
          sourceFingerprint: variant.sourceFingerprint || (blueprint.globalSettings && blueprint.globalSettings.sourceFingerprint),
          sourceArtifactId: variant.sourceArtifactId || (blueprint.globalSettings && blueprint.globalSettings.sourceArtifactId),
          contextFingerprint: variant.contextFingerprint || (blueprint.globalSettings && blueprint.globalSettings.contextFingerprint),
          contextInputsFingerprint: variant.contextInputsFingerprint || (blueprint.globalSettings && blueprint.globalSettings.contextInputsFingerprint),
          contextFingerprintDerived: variant.contextFingerprintDerived === true,
          generationConfig: variant.generationConfig || row.generationConfig || null,
          generationConfigFingerprint: variant.generationConfigFingerprint || row.generationConfigFingerprint || null,
          grade: variant.grade,
          language: variant.language,
          variantKey: variant.variantKey,
          explicitVariantKey: row.explicitVariantKey,
          variantKeyDerived: row.variantKeyDerived === true,
          directive: row.directive || '',
          activityMode: row.activityMode || '',
          activityConfig: row.activityConfig || null
        };
      }).filter(Boolean);
    }

    function refreshChangedGenerationRows(next, priorBlueprint, forceAll) {
      if (!next || !Array.isArray(next.plan) || !priorBlueprint || !Array.isArray(priorBlueprint.plan)) return next;
      var byId = {};
      priorBlueprint.plan.forEach(function (row) { if (row && row.uiId) byId[row.uiId] = row; });
      next.plan = next.plan.map(function (row, index) {
        var prior = byId[row && row.uiId] || priorBlueprint.plan[index];
        if (!prior || (!forceAll && !generationInputsChanged(prior, row))) return row;
        var cleanRow = Object.assign({}, row);
        ['generationAction', 'generationIdentity', 'generationVariants', 'existingArtifactId', 'variantKey', 'explicitVariantKey', 'variantKeyDerived',
          'sourceFingerprint', 'sourceArtifactId', 'contextFingerprint', 'contextInputsFingerprint', 'contextFingerprintDerived',
          'generationConfig', 'generationConfigFingerprint', 'generationPolicy', 'novelResource', 'suppressedGenerationVariants',
          'generationMatrix', 'generationMatrixUnavailable'].forEach(function (key) { delete cleanRow[key]; });
        var resolved = resolveRows([cleanRow], {
          existingArtifacts: priorArtifactDescriptors(priorBlueprint, prior),
          sourceFingerprint: priorBlueprint.globalSettings && priorBlueprint.globalSettings.sourceFingerprint
        }, next.globalSettings);
        return resolved[0] || cleanRow;
      });
      return next;
    }

    function validate(blueprint) {
      return C.validateBlueprint(blueprint, { knownTools: knownTools });
    }

    function applyDraftInstructionalTextDefaults(blueprint) {
      if (!blueprint || !Array.isArray(blueprint.plan) || typeof C.normalizeInstructionalText !== 'function') return blueprint;
      blueprint.plan = blueprint.plan.map(function (row) {
        if (!row || (row.tool !== 'simplified' && row.tool !== 'analysis')) return row;
        var defaults = row.tool === 'simplified'
          ? { role: 'supplemental', form: 'adapted' }
          : { role: 'primary', form: 'original' };
        var current = row.instructionalText || {};
        var educatorDesignated = current.designationSource === 'educator';
        return Object.assign({}, row, {
          instructionalText: C.normalizeInstructionalText(Object.assign({}, defaults, current, educatorDesignated ? {} : {
            role: defaults.role,
            form: defaults.form,
            designationSource: 'workflow-default'
          }), row.tool)
        });
      });
      return blueprint;
    }

    function applyDraftTextAccessDefaults(blueprint, options) {
      if (!blueprint || !Array.isArray(blueprint.plan)) return blueprint;
      var opts = options && typeof options === 'object' ? options : {};
      var context = typeof C.normalizeInstructionalContext === 'function'
        ? C.normalizeInstructionalContext(blueprint.instructionalContext, {
            instructionalGrade: blueprint.audience && blueprint.audience.gradeLevel,
            standardsContext: blueprint.standardsContext,
            standards: blueprint.standards
          })
        : (blueprint.instructionalContext || { adaptedTextPolicy: 'include' });
      blueprint.instructionalContext = context;
      var plan = blueprint.plan.slice();
      var adaptedPolicy = context.adaptedTextPolicy || 'include';
      if (adaptedPolicy === 'include') {
        if (opts.ensureAnalysis === true && !plan.some(function (row) { return row && row.tool === 'analysis'; })) {
          plan.unshift({
            tool: 'analysis', uiId: 'analysis-access',
            directive: 'Analyze and retain the source as the primary reference text.'
          });
        }
        if (opts.ensureAdapted === true && !plan.some(function (row) { return row && row.tool === 'simplified'; })) {
          var analysisIndex = plan.findIndex(function (row) { return row && row.tool === 'analysis'; });
          plan.splice(Math.max(0, analysisIndex + 1), 0, {
            tool: 'simplified', uiId: 'simplified-access',
            directive: 'Create a supplemental Adapted Text while keeping the analyzed primary text available.'
          });
        }
      } else {
        plan = plan.filter(function (row) { return !row || row.tool !== 'simplified'; });
      }
      blueprint.plan = plan;
      return applyDraftInstructionalTextDefaults(blueprint);
    }

    function withReviewedAdaptedPolicy(context, policy) {
      return Object.assign({}, context || {}, {
        adaptedTextPolicy: policy,
        adaptedTextPolicySource: 'educator',
        textAccessReason: 'educator-choice'
      });
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
        standardsContext: req.standardsContext || null,
        instructionalContext: req.instructionalContext || null,
        interests: req.interests || '',
        sourcePolicy: req.sourcePolicy,
        provenance: req.provenance
      };
      if (typeof d.autoConfigure === 'function') {
        return Promise.resolve(d.autoConfigure(req)).then(function (legacyConfig) {
          legacyConfig = legacyConfig && typeof legacyConfig === 'object' ? legacyConfig : {};
          legacyConfig.globalSettings = frozenSettings(req, legacyConfig.globalSettings);
          var bp = applyDraftTextAccessDefaults(C.fromLegacyConfig(legacyConfig, ctx), {
            ensureAnalysis: true, ensureAdapted: true
          });
          bp.plan = resolveRows(bp.plan, req, bp.globalSettings);
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
      var globalSettings = frozenSettings(req, requestedGlobalSettings);
      var bp = applyDraftTextAccessDefaults(C.fromLegacyConfig({ resourcePlan: plan, lessonDNA: req.lessonDNA || {}, globalSettings: globalSettings }, ctx), {
        ensureAnalysis: true, ensureAdapted: true
      });
      bp.plan = resolveRows(bp.plan, req, bp.globalSettings);
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
          if (!plan.some(function (r) { return r.tool === tool; })) {
            var row = { tool: tool, directive: '' };
            if (typeof C.normalizeInstructionalText === 'function' && (tool === 'simplified' || tool === 'analysis')) {
              row.instructionalText = C.normalizeInstructionalText({
                role: tool === 'simplified' ? 'supplemental' : 'primary',
                form: tool === 'simplified' ? 'adapted' : 'original',
                designationSource: 'workflow-default'
              }, tool);
            }
            plan.push(row);
          }
        });
      }
      if (ch.setDirectives && typeof ch.setDirectives === 'object') {
        plan = plan.map(function (r) {
          return Object.prototype.hasOwnProperty.call(ch.setDirectives, r.tool)
            ? Object.assign({}, r, { directive: String(ch.setDirectives[r.tool] || '') })
            : r;
        });
      }
      var standardsTextChanged = typeof ch.standards === 'string' && ch.standards !== b.standards;
      var nextStandardsContext = ch.standardsContext !== undefined ? ch.standardsContext : b.standardsContext;
      if (standardsTextChanged && ch.standardsContext === undefined) {
        nextStandardsContext = {
          version: 'standards-context/v1',
          inputText: ch.standards,
          promptText: ch.standards,
          provider: 'user-input',
          resolutionStatus: 'unresolved',
          standards: []
        };
      }
      var nextInstructionalContext = ch.instructionalContext !== undefined
        ? ch.instructionalContext
        : b.instructionalContext;
      if (ch.instructionalContext === undefined && Array.isArray(ch.removeTools) && ch.removeTools.indexOf('simplified') !== -1) {
        nextInstructionalContext = withReviewedAdaptedPolicy(nextInstructionalContext, 'omit');
      } else if (ch.instructionalContext === undefined && Array.isArray(ch.addTools) && ch.addTools.indexOf('simplified') !== -1) {
        nextInstructionalContext = withReviewedAdaptedPolicy(nextInstructionalContext, 'include');
      }
      // A standards edit invalidates the old fingerprint even when the caller
      // does not explicitly rebuild instructionalContext. The contract will
      // normalize and fingerprint this new reviewed snapshot.
      if ((ch.standardsContext !== undefined || standardsTextChanged) && ch.instructionalContext === undefined) {
        nextInstructionalContext = Object.assign({}, b.instructionalContext || {}, {
          standardsContext: nextStandardsContext,
          standardsFingerprint: ''
        });
        if (b.instructionalContext && b.instructionalContext.adaptedTextPolicySource === 'standard') {
          delete nextInstructionalContext.adaptedTextPolicy;
          delete nextInstructionalContext.adaptedTextPolicySource;
          delete nextInstructionalContext.textAccessReason;
        }
      }
      var next = {
        schemaVersion: b.schemaVersion,
        blueprintId: b.blueprintId,
        audience: ch.audience ? Object.assign({}, b.audience, ch.audience) : b.audience,
        standards: typeof ch.standards === 'string' ? ch.standards : b.standards,
        standardsContext: nextStandardsContext,
        instructionalContext: nextInstructionalContext,
        sourcePolicy: b.sourcePolicy,
        lessonDNA: ch.lessonDNA ? Object.assign({}, b.lessonDNA, ch.lessonDNA) : b.lessonDNA,
        globalSettings: ch.globalSettings ? Object.assign({}, b.globalSettings, ch.globalSettings) : b.globalSettings,
        plan: plan,
        configs: ch.configs ? Object.assign({}, b.configs, ch.configs) : b.configs,
        warnings: b.warnings,
        review: { state: 'draft', reviewer: '' }, // edits always re-enter review
        provenance: b.provenance
      };
      next = applyDraftTextAccessDefaults(next, {
        ensureAdapted: (ch.standardsContext !== undefined || standardsTextChanged)
          && b.instructionalContext && b.instructionalContext.adaptedTextPolicySource === 'standard'
      });
      next = refreshChangedGenerationRows(next, b, generationSettingsChanged(b.globalSettings, next.globalSettings));
      // A new row needs a matrix, but reviewed rows must retain their exact
      // action/variant snapshot. Resolve only rows that do not already carry
      // one; doing the whole plan here could turn a reviewed reuse into a
      // generate merely because current workspace artifacts were not supplied.
      var unresolvedIndexes = [];
      var unresolvedRows = [];
      next.plan.forEach(function (row, index) {
        if (!row || (!Array.isArray(row.generationVariants) && !row.generationAction)) {
          unresolvedIndexes.push(index);
          unresolvedRows.push(row);
        }
      });
      if (unresolvedRows.length) {
        var resolvedNewRows = resolveRows(unresolvedRows, {}, next.globalSettings);
        unresolvedIndexes.forEach(function (index, offset) { next.plan[index] = resolvedNewRows[offset] || next.plan[index]; });
      }
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
        var rawPlan = legacyConfig && Array.isArray(legacyConfig.resourcePlan) ? legacyConfig.resourcePlan : [];
        var next = C.fromLegacyConfig(legacyConfig, {
          blueprintId: b.blueprintId,
          gradeLevel: b.audience.gradeLevel,
          language: b.audience.language,
          interests: b.audience.interests,
          standards: b.standards,
          standardsContext: b.standardsContext,
          instructionalContext: b.instructionalContext,
          sourcePolicy: b.sourcePolicy,
          provenance: b.provenance
        });
        // AI revision output is not an educator-authorization surface. Keep
        // existing row metadata when the model omits it, and never let model
        // output mint an educator designation or replacement permission.
        var priorById = {};
        var priorByTool = {};
        b.plan.forEach(function (row) {
          if (row.uiId) priorById[row.uiId] = row;
          priorByTool[row.tool] = priorByTool[row.tool] || [];
          priorByTool[row.tool].push(row);
        });
        var rawById = {};
        var rawByTool = {};
        rawPlan.forEach(function (row) {
          if (!row || typeof row !== 'object') return;
          var rawTool = row.tool || row.type || row.id;
          if (row.uiId) rawById[row.uiId] = row;
          rawByTool[rawTool] = rawByTool[rawTool] || [];
          rawByTool[rawTool].push(row);
        });
        next.plan = next.plan.map(function (row, index) {
          var prior = priorById[row.uiId]
            || (priorByTool[row.tool] && priorByTool[row.tool].length === 1 ? priorByTool[row.tool][0] : null)
            || (b.plan[index] && b.plan[index].tool === row.tool ? b.plan[index] : null);
          var rawRow = rawById[row.uiId]
            || (rawByTool[row.tool] && rawByTool[row.tool].length === 1 ? rawByTool[row.tool][0] : null)
            || (rawPlan[index] && typeof rawPlan[index] === 'object' ? rawPlan[index] : null);
          var rawText = rawRow && rawRow.instructionalText;
          var priorText = prior && prior.instructionalText;
          var priorEducator = priorText && priorText.designationSource === 'educator';
          var modelClaimsEducator = rawText && (rawText.designationSource === 'educator'
            || (rawText.replacementAuthorization && rawText.replacementAuthorization.authorized === true));
          var safeText = row.instructionalText;
          if (priorEducator || (!rawText && priorText)) safeText = priorText;
          else if (modelClaimsEducator && typeof C.normalizeInstructionalText === 'function') {
            safeText = C.normalizeInstructionalText({
              role: row.tool === 'simplified' ? 'supplemental' : (row.tool === 'analysis' ? 'primary' : 'unspecified'),
              form: row.tool === 'simplified' ? 'adapted' : 'original',
              designationSource: 'workflow-default',
              replacementAuthorization: { authorized: false, source: 'none' },
              complexity: safeText && safeText.complexity
            }, row.tool);
          }
          return Object.assign({}, row, generationFields(prior), { instructionalText: safeText });
        });
        // The legacy shape cannot represent every Blueprint field. Preserve
        // contract context that the AI revision never received rather than
        // silently resetting it during the round-trip.
        next.audience = Object.assign({}, b.audience, next.audience);
        next.sourcePolicy = b.sourcePolicy;
        var revisionText = String(instruction || '');
        var removeAdapted = /\b(?:remove|omit|exclude|without)\b[^.\n]{0,80}\b(?:adapted|simplified)\b/i.test(revisionText)
          || /\b(?:adapted|simplified)\b[^.\n]{0,80}\b(?:remove|omit|exclude)\b/i.test(revisionText);
        var includeAdapted = /\b(?:add|include|create|restore)\b[^.\n]{0,80}\b(?:adapted|simplified)\b/i.test(revisionText)
          || /\b(?:adapted|simplified)\b[^.\n]{0,80}\b(?:add|include|create|restore)\b/i.test(revisionText);
        next.instructionalContext = removeAdapted
          ? withReviewedAdaptedPolicy(b.instructionalContext, 'omit')
          : (includeAdapted ? withReviewedAdaptedPolicy(b.instructionalContext, 'include') : b.instructionalContext);
        next.globalSettings = Object.assign({}, b.globalSettings, next.globalSettings);
        next.warnings = b.warnings;
        next = applyDraftTextAccessDefaults(next, {
          ensureAnalysis: b.plan.some(function (row) { return row && row.tool === 'analysis'; }),
          ensureAdapted: !removeAdapted && b.plan.some(function (row) { return row && row.tool === 'simplified'; })
        });
        next = refreshChangedGenerationRows(next, b, generationSettingsChanged(b.globalSettings, next.globalSettings));
        var unresolvedIndexes = [];
        var unresolvedRows = [];
        next.plan.forEach(function (row, index) {
          if (!row || (!Array.isArray(row.generationVariants) && !row.generationAction)) {
            unresolvedIndexes.push(index);
            unresolvedRows.push(row);
          }
        });
        if (unresolvedRows.length) {
          var resolvedNewRows = resolveRows(unresolvedRows, {}, next.globalSettings);
          unresolvedIndexes.forEach(function (index, offset) { next.plan[index] = resolvedNewRows[offset] || next.plan[index]; });
        }
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
          instructionalText: r.instructionalText,
          generationAction: r.generationAction,
          generationIdentity: r.generationIdentity,
          generationVariants: Array.isArray(r.generationVariants) ? r.generationVariants.slice() : [],
          existingArtifactId: r.existingArtifactId,
          variantKey: r.variantKey,
          explicitVariantKey: r.explicitVariantKey,
          variantKeyDerived: r.variantKeyDerived === true,
          sourceFingerprint: r.sourceFingerprint,
          contextFingerprint: r.contextFingerprint,
          contextInputsFingerprint: r.contextInputsFingerprint,
          contextFingerprintDerived: r.contextFingerprintDerived === true,
          generationConfig: r.generationConfig,
          generationConfigFingerprint: r.generationConfigFingerprint,
          expectedCalls: Array.isArray(r.generationVariants)
            ? r.generationVariants.filter(function (variant) { return variant && variant.action !== 'reuse'; }).length
            : (r.generationAction === 'reuse' ? 0 : 1),
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
        standardsContext: report.value.standardsContext,
        instructionalContext: report.value.instructionalContext,
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
      var maxSteps = Math.max(8, Number(C.COMMAND_WORKFLOW_MAX_STEPS) || 24);
      // Retain one overflow item so the contract can reject an overlong draft
      // instead of silently dropping work the teacher thought was reviewed.
      return (Array.isArray(steps) ? steps : []).slice(0, maxSteps + 1).map(function (raw, index) {
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


  // ── Lesson template library ───────────────────────────────────────────
  //
  // A template is NOT a second artifact type. It is a saved lesson blueprint
  // with the CONTENT removed:
  //   keep   resourcePlan (tools + directives) — the pattern
  //          globalSettings (grade, tone)      — defaults, editable on apply
  //   strip  lessonDNA (goldenThread / keyTerms / essentialQuestion)
  //          and any source binding             — this lesson's content
  //
  // Templates are starting points. The primary path stays conversational: a
  // teacher builds a plan with the agent, refines it, and saves THAT. Shipped
  // templates are seeds, not the product.
  //
  // Why stripping matters: a template that silently carries the previous
  // lesson's DNA produces a Civil War pack quietly talking about photosynthesis
  // — the same shape of defect as the DA isolation leak, one severity down.
  var LESSON_TEMPLATE_LIBRARY_KEY = 'alloflow_lesson_templates_v1';
  var LESSON_TEMPLATE_VERSION = 1;

  function _templateSafeString(value, max) {
    return String(value == null ? '' : value).slice(0, max || 120);
  }

  // opts.directives: { [uiId]: 'keep' | 'blank' } — the save-time review.
  // Anything unlisted defaults to 'keep', so the simple path needs no opts.
  function toLessonTemplate(legacyConfig, opts) {
    var cfg = (legacyConfig && typeof legacyConfig === 'object') ? legacyConfig : {};
    var o = opts || {};
    var policy = (o.directives && typeof o.directives === 'object') ? o.directives : {};
    var rawPlan = Array.isArray(cfg.resourcePlan) ? cfg.resourcePlan : [];
    var plan = rawPlan.map(function (row, i) {
      var tool = row && (row.tool || row.type);
      if (!tool) return null;
      var uiId = (row && (row.uiId || row.stepId)) || (String(tool) + '-' + i);
      var keep = policy[uiId] !== 'blank';
      return {
        tool: String(tool),
        uiId: String(uiId),
        directive: keep ? _templateSafeString(row && row.directive, 600) : ''
      };
    }).filter(Boolean);
    var gs = (cfg.globalSettings && typeof cfg.globalSettings === 'object') ? cfg.globalSettings : {};
    return {
      v: LESSON_TEMPLATE_VERSION,
      id: _templateSafeString(o.id || ('tpl-' + Math.random().toString(36).slice(2, 10)), 64),
      name: _templateSafeString(o.name || 'Untitled template', 80),
      note: _templateSafeString(o.note, 240),
      createdAt: _templateSafeString(o.createdAt || '', 40),
      resourcePlan: plan,
      // Defaults only. Never lessonDNA, never source text.
      globalSettings: { gradeLevel: _templateSafeString(gs.gradeLevel, 40), tone: _templateSafeString(gs.tone, 40) }
    };
  }

  // Returns a legacy config ready to become activeBlueprint. Callers must also
  // clear any existing run record: the new plan reuses uiIds, so a stale run
  // would otherwise appear to describe it.
  function applyLessonTemplate(template) {
    var t = (template && typeof template === 'object') ? template : {};
    var plan = Array.isArray(t.resourcePlan) ? t.resourcePlan : [];
    var rows = plan.map(function (row, i) {
      var tool = row && (row.tool || row.type);
      if (!tool) return null;
      return {
        tool: String(tool),
        uiId: String((row && (row.uiId || row.stepId)) || (String(tool) + '-' + i)),
        directive: _templateSafeString(row && row.directive, 600)
      };
    }).filter(Boolean);
    var gs = (t.globalSettings && typeof t.globalSettings === 'object') ? t.globalSettings : {};
    var out = {
      resourcePlan: rows,
      recommendedResources: rows.map(function (r) { return r.tool; }),
      toolDirectives: rows.reduce(function (acc, r) { if (!acc[r.tool]) acc[r.tool] = r.directive || ''; return acc; }, {}),
      globalSettings: {}
    };
    if (gs.gradeLevel) out.globalSettings.gradeLevel = gs.gradeLevel;
    if (gs.tone) out.globalSettings.tone = gs.tone;
    // NOTE: no lessonDNA key at all. An empty object would still read as "this
    // template has a golden thread", and downstream code checks presence.
    return out;
  }

  function createLessonTemplateLibrary(storage) {
    var store = storage || (function () { try { return window.localStorage; } catch (_) { return null; } })();
    function readAll() {
      if (!store) return [];
      try {
        var raw = store.getItem(LESSON_TEMPLATE_LIBRARY_KEY);
        if (!raw) return [];
        var env = JSON.parse(raw);
        if (!env || env.v !== LESSON_TEMPLATE_VERSION || !Array.isArray(env.templates)) return [];
        return env.templates;
      } catch (_) { return []; }
    }
    function writeAll(list) {
      if (!store) return false;
      try {
        store.setItem(LESSON_TEMPLATE_LIBRARY_KEY, JSON.stringify({
          v: LESSON_TEMPLATE_VERSION, savedAt: new Date().toISOString(), templates: list.slice(0, 100)
        }));
        return true;
      } catch (_) { return false; }
    }
    return {
      list: function () { return readAll(); },
      get: function (id) { return readAll().filter(function (t) { return t && t.id === id; })[0] || null; },
      save: function (template) {
        if (!template || !template.id) return null;
        var list = readAll().filter(function (t) { return t && t.id !== template.id; });
        list.unshift(template);
        return writeAll(list) ? template : null;
      },
      remove: function (id) {
        var before = readAll();
        var after = before.filter(function (t) { return t && t.id !== id; });
        if (after.length === before.length) return false;
        return writeAll(after);
      }
    };
  }

  // ── Blueprint archive (singleton + archive, 2026-07-29) ────────────────
  //
  // ONE plan stays live (activeBlueprint, untouched); FINISHED plans are filed
  // here and can be restored. This is deliberately NOT a multi-plan store:
  //   - Its OWN key. Never a version bump on 'alloflow-blueprint-run-v1' — the
  //     shipped build early-returns on env.v !== 1 and then clears the key in
  //     the same effect flush, so a bump there is silent total loss on
  //     downgrade. A new key is invisible to old builds.
  //   - run.rows stays NESTED inside each record, never merged into a shared
  //     map: uiIds are minted per-plan from a row index (contracts :264), so
  //     'analysis-0' COLLIDES across plans by construction.
  //   - Identity (id) lives on the RECORD, never on the plan object —
  //     toLegacyConfig builds a fresh literal and would drop it on the chat's
  //     revise round-trip, the same reason the run record is its own atom.
  // A template is a plan's PATTERN (content stripped); an archive record is a
  // plan's HISTORY (what ran, what landed, what was audited).
  var BLUEPRINT_ARCHIVE_KEY = 'alloflow_blueprint_archive_v1';
  var BLUEPRINT_ARCHIVE_VERSION = 1;
  var BLUEPRINT_ARCHIVE_MAX = 12;

  // Snapshot the live pair into an archive record. JSON round-trip on purpose:
  // both values already live in a JSON envelope, and the copy means later state
  // updates can never mutate an archived record through a shared reference.
  function toArchivedPlan(plan, run, opts) {
    var o = opts || {};
    var rows = (run && run.rows && typeof run.rows === 'object') ? run.rows : {};
    var keys = Object.keys(rows);
    var landed = 0, failed = 0;
    keys.forEach(function (k) {
      var s = rows[k] && rows[k].status;
      if (s === 'landed') landed++;
      else if (s === 'failed' || s === 'interrupted') failed++;
    });
    var copy;
    try { copy = JSON.parse(JSON.stringify({ plan: plan || null, run: run || null })); }
    catch (_) { return null; } // a non-serializable pair must not poison the cabinet
    return {
      v: BLUEPRINT_ARCHIVE_VERSION,
      id: _templateSafeString(o.id || ('arc-' + Math.random().toString(36).slice(2, 10)), 64),
      name: _templateSafeString(o.name || 'Lesson plan', 80),
      savedAt: _templateSafeString(o.savedAt || '', 40),
      unitId: _templateSafeString(o.unitId, 64) || null,
      unitName: _templateSafeString(o.unitName, 80) || null,
      plan: copy.plan,
      run: copy.run,
      stats: { total: keys.length, landed: landed, failed: failed }
    };
  }

  function createBlueprintArchive(storage) {
    var store = storage || (function () { try { return window.localStorage; } catch (_) { return null; } })();
    var frozen = false;
    function readAll() {
      if (!store) return [];
      try {
        var raw = store.getItem(BLUEPRINT_ARCHIVE_KEY);
        if (!raw) { frozen = false; return []; }
        var env = JSON.parse(raw);
        if (env && typeof env.v === 'number' && env.v > BLUEPRINT_ARCHIVE_VERSION) {
          // A NEWER build wrote this. Refuse to read or overwrite it — same
          // stance as the workspace-recovery payload check. Downgrades lose
          // access temporarily; they never lose data.
          frozen = true;
          return [];
        }
        frozen = false;
        if (!env || env.v !== BLUEPRINT_ARCHIVE_VERSION || !Array.isArray(env.plans)) return [];
        return env.plans;
      } catch (_) { frozen = false; return []; }
    }
    function writeAll(list) {
      if (!store || frozen) return false;
      try {
        // Raw setItem, NOT the host's safeSetItem: safeSetItem swallows
        // QuotaExceededError with no return value, and the caller here needs
        // the boolean to tell the teacher the cabinet is full.
        store.setItem(BLUEPRINT_ARCHIVE_KEY, JSON.stringify({
          v: BLUEPRINT_ARCHIVE_VERSION, savedAt: new Date().toISOString(),
          plans: list.slice(0, BLUEPRINT_ARCHIVE_MAX) // newest first; oldest falls off
        }));
        return true;
      } catch (_) { return false; }
    }
    return {
      list: function () { return readAll(); },
      isFrozen: function () { readAll(); return frozen; },
      get: function (id) { return readAll().filter(function (p) { return p && p.id === id; })[0] || null; },
      add: function (record) {
        if (!record || !record.id) return false;
        var list = readAll().filter(function (p) { return p && p.id !== record.id; });
        list.unshift(record);
        return writeAll(list);
      },
      remove: function (id) {
        var before = readAll();
        var after = before.filter(function (p) { return p && p.id !== id; });
        if (after.length === before.length) return false;
        return writeAll(after);
      }
    };
  }

  var API = { createBlueprintService: createBlueprintService, createCommandWorkflowService: createCommandWorkflowService, COMMAND_WORKFLOW_LIBRARY_KEY: COMMAND_WORKFLOW_LIBRARY_KEY,
              toLessonTemplate: toLessonTemplate, applyLessonTemplate: applyLessonTemplate,
              createLessonTemplateLibrary: createLessonTemplateLibrary, LESSON_TEMPLATE_LIBRARY_KEY: LESSON_TEMPLATE_LIBRARY_KEY,
              toArchivedPlan: toArchivedPlan, createBlueprintArchive: createBlueprintArchive,
              BLUEPRINT_ARCHIVE_KEY: BLUEPRINT_ARCHIVE_KEY, BLUEPRINT_ARCHIVE_MAX: BLUEPRINT_ARCHIVE_MAX };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreBlueprintService = API;
  }
})();
