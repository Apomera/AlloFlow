/* Saved-plan orchestration for optional, lesson-aware teaching scripts. */
(function (root) {
  'use strict';
  const array = value => Array.isArray(value) ? value : [];
  const idOf = value => value?.id == null ? '' : String(value.id);
  const TYPES = new Set(['analysis', 'source', 'simplified', 'glossary', 'quiz', 'math', 'sentence-frames', 'anchor-chart', 'note-taking', 'timeline', 'concept-sort', 'image', 'outline']);
  function coreModule() {
    if (root.AlloModules?.LessonTeachingScript) return root.AlloModules.LessonTeachingScript;
    if (typeof require === 'function') { try { return require('./lesson_teaching_script_module.js'); } catch (_) { return null; } }
    return null;
  }
  function availableMaterials(plan, history) {
    const scopeKeys = ['unitId', 'lessonId', 'sourceArtifactId', 'sourceFingerprint', 'sourceId'];
    const scopeValue = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    const scope = item => Object.fromEntries(scopeKeys.map(key => [key, [item?.[key], item?.config?.[key], key === 'sourceArtifactId' && ['analysis', 'source'].includes(item?.type) ? idOf(item) : null].map(scopeValue).find(Boolean) || '']));
    const planScope = scope(plan);
    const hasTeachingText = coreModule()?.hasTeachingMaterialText;
    return array(history).filter(item => {
      if (!item || !idOf(item) || !TYPES.has(item.type) || idOf(item) === idOf(plan) || item.isStudentWork || item.config?.isStudentWork || item.studentId || item.submissionId) return false;
      if (typeof hasTeachingText === 'function' && !hasTeachingText(item)) return false;
      const itemScope = scope(item);
      for (const key of scopeKeys) {
        if (planScope[key] && itemScope[key] && planScope[key] !== itemScope[key]) return false;
      }
      // Unit folders can be assigned after generation and need not be present on
      // the original source. Any shared scope is sufficient if none conflicts.
      const known = scopeKeys.filter(key => planScope[key]);
      return !known.length || known.some(key => itemScope[key] === planScope[key]);
    });
  }
  function canonicalPlan(state, planId) {
    // A deleted history entry must not be resurrected from a stale active view.
    const matches = array(state.history).filter(item => idOf(item) === String(planId));
    return matches.length === 1 && matches[0].type === 'lesson-plan' ? matches[0] : null;
  }
  /* Reviewable defaults come from the saved plan itself (its recorded grade, language, standard, title, objectives
   * and phases) plus its scoped materials. The current workspace only supplies a language fallback, never a grade
   * or standard, so an older plan is not silently described with today's settings. */
  function defaultSettings(plan, ambient = {}, materials = []) {
    const core = coreModule();
    if (!core?.detectContext) {
      const config = plan?.config || {};
      return { grade: '', subject: 'other', subjectDetected: false, topic: '', language: config.leveledTextLanguage || config.language || ambient.language || 'English', standard: '', phases: [], objectives: [], suggestedDuration: { segment: 15, lesson: 45 }, gradeOptions: [], subjectOptions: [], scopes: {} };
    }
    const context = core.detectContext(plan, materials, { language: ambient.language });
    return {
      grade: context.grade, gradeRecognized: context.gradeRecognized, gradeSource: context.gradeSource,
      subject: context.subject, subjectDetected: context.subjectDetected, topic: context.topic,
      language: context.language, languageSource: context.languageSource,
      standard: context.standard, standardSource: context.standardSource,
      phases: context.phases.slice(), objectives: context.objectives.slice(), materialCount: context.materialCount,
      suggestedDuration: { ...context.suggestedDuration },
      gradeOptions: core.GRADES.slice(), subjectOptions: core.SUBJECTS.map(id => ({ id, label: core.SUBJECT_LABELS[id] || id })), scopes: JSON.parse(JSON.stringify(core.SCOPES)),
    };
  }
  // Settle cancellation even when a loader or provider ignores AbortSignal.
  function waitForRun(promise, signal) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true; signal.removeEventListener('abort', onAbort); callback(value);
      };
      const onAbort = () => finish(reject, Object.assign(new Error('Script generation cancelled.'), { name: 'AbortError' }));
      // Attach both handlers before checking cancellation, including late failures.
      Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
  }
  function createController(deps) {
    const runs = new Map();
    let disposed = false;
    const core = () => typeof deps.core === 'function' ? deps.core() : deps.core;
    const research = () => typeof deps.research === 'function' ? deps.research() : deps.research;
    const allowed = state => state.isTeacherMode === true && !state.isParentMode && !state.isIndependentMode;
    const actor = state => String(state.actorKey ?? 'teacher');
    const report = (id, patch) => deps.onStatus?.({ planId: String(id), busy: false, stage: '', error: '', ...patch });
    const errorText = error => error?.name === 'AbortError' ? 'Script generation cancelled.' : (error?.message || 'The teaching script could not be created. Please try again.');
    function selected(plan, state, ids) {
      if (!Array.isArray(ids) || !ids.length || new Set(ids.map(String)).size !== ids.length) throw new Error('Select at least one unique teaching material.');
      const available = availableMaterials(plan, state.history);
      return ids.map(id => {
        const matches = available.filter(item => idOf(item) === String(id));
        if (matches.length !== 1) throw new Error('A selected material is missing or belongs to another lesson. Choose materials again.');
        return matches[0];
      });
    }
    function cancel(planId) {
      const id = String(planId), run = runs.get(id);
      if (!run) return false;
      runs.delete(id); run.controller.abort();
      report(id, { stage: 'cancelled' });
      return true;
    }
    async function generate(planId, settings) {
      const id = String(planId), initial = deps.getState();
      if (disposed || !allowed(initial)) return { ok: false, error: 'Teaching scripts are available in teacher mode.' };
      if (runs.has(id)) return { ok: false, error: 'A script is already being created for this plan.' };
      const run = { controller: new AbortController(), actor: actor(initial) };
      runs.set(id, run);
      const ensureCurrent = () => {
        const current = deps.getState();
        if (disposed || runs.get(id) !== run || run.controller.signal.aborted) throw Object.assign(new Error('Script generation cancelled.'), { name: 'AbortError' });
        if (!allowed(current) || actor(current) !== run.actor) throw new Error('The teacher workspace changed. Generate the script again in the intended workspace.');
        return current;
      };
      try {
        if (!initial.canGenerate) throw new Error('Connect an AI text provider in Settings before generating a script.');
        const plan = canonicalPlan(initial, id);
        if (!plan) throw new Error('Open a saved teacher lesson plan before generating a script.');
        if (!core()?.captureInputs) throw new Error('The teaching-script tools are still loading. Try again.');
        const materialIds = array(settings?.materialIds).map(String);
        const snapshot = core().captureInputs(plan, settings, selected(plan, initial, materialIds));
        const validation = core().validateInputs(snapshot);
        if (!validation.ok) throw new Error(validation.errors.join(' '));
        let evidence = { status: 'disabled', sources: [], warnings: ['Research support was not requested.'] };
        if (snapshot.settings.researchEnabled) {
          report(id, { busy: true, stage: 'research' });
          if (typeof deps.ensureResearch === 'function') {
            try { await waitForRun(deps.ensureResearch(), run.controller.signal); }
            catch (_) { ensureCurrent(); throw new Error('Research tools could not be loaded. Retry, or turn off research to create an unresearched script.'); }
            ensureCurrent();
          }
          if (!research()?.collect || typeof deps.read !== 'function') throw new Error('Research is unavailable. Retry, or explicitly turn off research to create an unresearched script.');
          // Only the reviewed lesson context reaches the research adapter; materials and learner data never do.
          evidence = await waitForRun(research().collect({ grade: snapshot.settings.grade, subject: snapshot.settings.subject, topic: snapshot.settings.topic, goal: snapshot.settings.goal, standard: snapshot.settings.standard, signal: run.controller.signal }, { search: deps.search, read: deps.read }), run.controller.signal);
          ensureCurrent();
          if (evidence?.status !== 'retrieved' || !array(evidence.sources).some(source => array(source.recommendations).length)) {
            const why = array(evidence?.warnings).filter(value => typeof value === 'string').join(' ');
            throw new Error('Applicable research could not be verified for this lesson. ' + (why ? why + ' ' : '') + 'Retry, or turn off research to create an unresearched script.');
          }
        }
        ensureCurrent();
        report(id, { busy: true, stage: 'generating' });
        const prompt = core().buildScriptPrompt(snapshot, evidence);
        let raw = await waitForRun(deps.callText(prompt, run.controller.signal), run.controller.signal);
        ensureCurrent();
        let result = core().normalizeScript(raw, snapshot, evidence);
        if (!result.ok) {
          report(id, { busy: true, stage: 'validating' });
          raw = await waitForRun(deps.callText(prompt + '\n\nThe previous attempt failed validation. Return a fresh complete JSON object addressing these checks: ' + JSON.stringify(result.errors), run.controller.signal), run.controller.signal);
          ensureCurrent();
          result = core().normalizeScript(raw, snapshot, evidence);
        }
        if (!result.ok) throw new Error('The AI response did not meet the script requirements. ' + result.errors.join(' '));
        const latest = ensureCurrent(), latestPlan = canonicalPlan(latest, id);
        if (!latestPlan) throw new Error('This plan was removed before the script finished.');
        const latestMaterials = selected(latestPlan, latest, materialIds);
        if (core().captureInputs(latestPlan, snapshot.settings, latestMaterials).fingerprint !== snapshot.fingerprint) throw new Error('The plan or selected materials changed during generation. Generate again to use the updated content.');
        const accepted = deps.updateResource(id, previous => {
          if (previous.type !== 'lesson-plan' || idOf(previous) !== id || core().captureInputs(previous, snapshot.settings, latestMaterials).fingerprint !== snapshot.fingerprint) return previous;
          return core().appendVersion(previous, result.version);
        });
        if (!accepted) throw new Error('The script could not be added to this plan. Reopen the plan and try again.');
        report(id, { stage: 'added' });
        return { ok: true, version: result.version };
      } catch (error) {
        const message = errorText(error);
        if (runs.get(id) === run) report(id, { stage: error?.name === 'AbortError' ? 'cancelled' : 'error', error: error?.name === 'AbortError' ? '' : message });
        return { ok: false, error: message };
      } finally {
        if (runs.get(id) === run) runs.delete(id);
      }
    }
    function saveEdits(planId, versionId, steps, expectedSteps) {
      const state = deps.getState(), plan = canonicalPlan(state, planId);
      if (disposed || !allowed(state) || !plan) return { ok: false, error: 'Open the saved plan in teacher mode to save edits.' };
      const matchesExpected = previous => expectedSteps === undefined || (Array.isArray(expectedSteps) && JSON.stringify(array(previous.data?.teachingScripts).find(version => version?.id === versionId)?.steps) === JSON.stringify(expectedSteps));
      if (!matchesExpected(plan)) return { ok: false, error: 'This script changed while you were editing. Keep your draft and reopen the latest version before saving.' };
      if (!core()?.updateVersion || core().updateVersion(plan, versionId, steps) === plan) return { ok: false, error: 'Check every step, its references, and the total duration before saving.' };
      const accepted = deps.updateResource(String(planId), previous => matchesExpected(previous) ? core().updateVersion(previous, versionId, steps) : previous);
      return accepted ? { ok: true } : { ok: false, error: 'These edits could not be added to the plan. Keep your draft and try again.' };
    }
    function deleteVersion(planId, versionId, expectedVersion) {
      const state = deps.getState(), plan = canonicalPlan(state, planId);
      if (disposed || !allowed(state) || !plan || runs.has(String(planId))) return { ok: false, error: 'Open the saved plan in teacher mode and finish generation before deleting a version.' };
      const actor = state.actorKey;
      if (!core()?.removeVersion || core().removeVersion(plan, versionId, expectedVersion) === plan) return { ok: false, error: 'This version changed. Review it before deleting.' };
      const accepted = deps.updateResource(String(planId), previous => {
        const current = deps.getState();
        return allowed(current) && current.actorKey === actor ? core().removeVersion(previous, versionId, expectedVersion) : previous;
      });
      return accepted ? { ok: true } : { ok: false, error: 'The version could not be deleted. Try again.' };
    }
    return { generate, cancel, saveEdits, deleteVersion, dispose() { disposed = true; [...runs.keys()].forEach(cancel); } };
  }
  const api = { availableMaterials, defaultSettings, createController };
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.LessonTeachingScriptHost = api;
  root.AlloModules.LessonTeachingScriptHostModule = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
