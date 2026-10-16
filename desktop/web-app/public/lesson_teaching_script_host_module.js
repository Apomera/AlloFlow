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
    // These are unfinished drafts, never history resources. Storage is optional:
    // private browsing and quota failures still allow recovery in this controller.
    const checkpoints = new Map();
    const durableCheckpoints = new Map();
    const unconfirmedStoredKeys = new Set();
    const STORAGE_KEY = 'allo.lessonTeachingScript.pending.v1', MAX_AGE = 24 * 60 * 60 * 1000;
    const MAX_RECORD_SIZE = 300000, MAX_STORAGE_SIZE = 1500000;
    let storage;
    try { storage = Object.prototype.hasOwnProperty.call(deps, 'storage') ? deps.storage : root.sessionStorage; } catch (_) { storage = null; }
    const copy = value => JSON.parse(JSON.stringify(value));
    const keyFor = (actorKey, id) => JSON.stringify([actorKey, String(id)]);
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (typeof raw === 'string' && raw.length <= MAX_STORAGE_SIZE) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length <= 5) parsed.forEach(entry => {
          if (entry && entry.schema === 1 && typeof entry.actor === 'string' && typeof entry.planId === 'string' && JSON.stringify(entry).length <= MAX_RECORD_SIZE && Number.isFinite(entry.updatedAt) && Date.now() - entry.updatedAt >= 0 && Date.now() - entry.updatedAt <= MAX_AGE) {
            const key = keyFor(entry.actor, entry.planId);
            checkpoints.set(key, entry); durableCheckpoints.set(key, JSON.stringify(entry));
          }
        });
      }
    } catch (_) { /* Malformed or inaccessible temporary storage is disposable. */ }
    function persist() {
      const now = Date.now();
      for (const [key, entry] of checkpoints) if (now - entry.updatedAt > MAX_AGE || now < entry.updatedAt) checkpoints.delete(key);
      const entries = [...checkpoints.entries()].sort((a, b) => b[1].updatedAt - a[1].updatedAt);
      entries.slice(5).forEach(([key]) => checkpoints.delete(key));
      // Include JSON array punctuation in the aggregate limit so every written
      // collection can be read back after a reload.
      const storable = [];
      for (const [, entry] of entries.slice(0, 5)) {
        if (JSON.stringify(entry).length <= MAX_RECORD_SIZE && JSON.stringify([...storable, entry]).length <= MAX_STORAGE_SIZE) storable.push(entry);
      }
      try {
        if (storable.length) {
          if (typeof storage?.setItem === 'function') {
            storage.setItem(STORAGE_KEY, JSON.stringify(storable));
            // A returned collection write may have persisted even when readback
            // becomes unavailable. Track at most its five possible records.
            unconfirmedStoredKeys.clear();
            storable.forEach(entry => unconfirmedStoredKeys.add(keyFor(entry.actor, entry.planId)));
          }
        }
        else storage?.removeItem?.(STORAGE_KEY);
      } catch (_) { /* Keep the in-memory checkpoint when session storage is full. */ }
      // Read back, rather than treating a missing/no-op setter as persistence.
      // A failed write can leave an older durable record: only an exact match
      // with the current checkpoint is safe to describe as reloadable.
      try {
        if (typeof storage?.getItem !== 'function') return;
        const raw = storage.getItem(STORAGE_KEY);
        const stored = typeof raw === 'string' && raw.length <= MAX_STORAGE_SIZE ? JSON.parse(raw) : [];
        durableCheckpoints.clear(); unconfirmedStoredKeys.clear();
        if (Array.isArray(stored) && stored.length <= 5) stored.forEach(entry => {
          if (entry && typeof entry.actor === 'string' && typeof entry.planId === 'string' && JSON.stringify(entry).length <= MAX_RECORD_SIZE) durableCheckpoints.set(keyFor(entry.actor, entry.planId), JSON.stringify(entry));
        });
      } catch (_) { /* Preserve the last confirmed durable records if reads also fail. */ }
    }
    let disposed = false;
    const core = () => typeof deps.core === 'function' ? deps.core() : deps.core;
    const research = () => typeof deps.research === 'function' ? deps.research() : deps.research;
    const allowed = state => state.isTeacherMode === true && !state.isParentMode && !state.isIndependentMode;
    const actor = state => String(state.actorKey ?? 'teacher');
    const report = (id, patch) => deps.onStatus?.({ planId: String(id), busy: false, stage: '', error: '', ...patch });
    const errorText = error => error?.name === 'AbortError' ? 'Script generation cancelled.' : (error?.message || 'The teaching script could not be created. Please try again.');
    const outputFailure = error => {
      const status = Number(error?.status || error?.statusCode || error?.response?.status), message = String(error?.message || '');
      if (error?.name === 'AbortError' || [401, 402, 403, 404, 408, 429].includes(status) || status >= 500 || /\b(?:unauthorized|forbidden|api.?key|quota|billing|rate.?limit)\b/i.test(message)) return false;
      return error?.name === 'SyntaxError' || /^(?:MAX_TOKENS|LENGTH|JSON_PARSE_ERROR)$/i.test(String(error?.code || '')) || /(?:invalid|malformed|incomplete|truncated)\s+json|json\s+(?:parse|parsing)|parse\s+json|unexpected (?:end|token).*(?:json|input)|(?:maximum|max|output)\s+tokens|response.{0,25}truncat/i.test(message);
    };
    function requestSignature(snapshot, infer, materialIds) {
      const settings = { ...snapshot.settings };
      // AI-selected fields may have changed from the initial heuristic to the
      // resolved value shown in the form. Teacher overrides change infer flags.
      if (infer.subject) delete settings.subject;
      if (infer.topic) delete settings.topic;
      return JSON.stringify({ settings, infer, materialIds });
    }
    function summary(entry) {
      return entry ? { completedChunks: entry.stage === 'ready' ? entry.totalChunks : entry.steps.length, totalChunks: entry.totalChunks, stage: entry.stage, updatedAt: entry.updatedAt, persistence: durableCheckpoints.get(keyFor(entry.actor, entry.planId)) === JSON.stringify(entry) ? 'session' : 'memory' } : null;
    }
    function validatedCompleteVersion(entry, snapshot) {
      const version = entry.completeVersion;
      if (!version || typeof version.id !== 'string' || !version.id.startsWith('script-') || version.id.length > 160 || typeof version.createdAt !== 'string' || !Number.isFinite(Date.parse(version.createdAt))) throw new Error('Invalid completed script identity');
      const result = core().normalizeScript(version, snapshot, entry.evidence);
      if (!result.ok) throw new Error('Invalid completed script');
      // Rebuild every content, input and research field, preserving only the
      // identity of the already-completed version so save retries are stable.
      const validated = { ...result.version, id: version.id, createdAt: version.createdAt };
      if (JSON.stringify(validated) !== JSON.stringify(version)) throw new Error('Changed completed script');
      return copy(version);
    }
    function readRecovery(planId, settings) {
      const state = deps.getState(), id = String(planId), key = keyFor(actor(state), id), entry = checkpoints.get(key);
      if (disposed || !allowed(state) || !entry) return null;
      try {
        if (Date.now() < entry.updatedAt || Date.now() - entry.updatedAt > MAX_AGE || !['research', 'generating', 'chunking', 'ready'].includes(entry.stage) || !Array.isArray(entry.steps) || entry.steps.length > 8 || !entry.infer || typeof entry.infer.subject !== 'boolean' || typeof entry.infer.topic !== 'boolean') throw new Error('Invalid checkpoint');
        const plan = canonicalPlan(state, id);
        if (!plan) throw new Error('Missing plan');
        const materials = selected(plan, state, entry.materialIds);
        const snapshot = core().captureInputs(plan, entry.settings, materials);
        if (snapshot.fingerprint !== entry.fingerprint || !core().validateInputs(snapshot).ok || requestSignature(snapshot, entry.infer, entry.materialIds) !== entry.requestSignature) throw new Error('Changed inputs');
        const chunks = core().scriptChunks(snapshot);
        if (entry.totalChunks !== chunks.length || entry.steps.length > chunks.length || (entry.stage !== 'chunking' && entry.steps.length)) throw new Error('Invalid chunks');
        if (entry.stage !== 'research') {
          if ((snapshot.settings.researchEnabled && entry.evidence?.status !== 'retrieved') || (!snapshot.settings.researchEnabled && entry.evidence?.status !== 'disabled')) throw new Error('Invalid research');
          core().buildScriptPrompt(snapshot, entry.evidence); // validates stored source and recommendation records
          entry.steps = entry.steps.map((step, index) => {
            const part = core().normalizeScriptChunk({ step }, snapshot, entry.evidence, chunks[index], entry.evidence.status === 'retrieved' && index === 0);
            if (!part.ok || JSON.stringify(part.step) !== JSON.stringify(step)) throw new Error('Invalid saved step');
            return part.step;
          });
        } else if (entry.evidence != null || entry.steps.length) throw new Error('Unexpected research data');
        if (entry.stage === 'ready') validatedCompleteVersion(entry, snapshot);
        else if (entry.completeVersion != null) throw new Error('Unexpected completed script');
        // A render-time settings probe must not discard valid progress. Teachers
        // can compare settings and return to the original request before retrying.
        if (settings) {
          const infer = { subject: settings.inferContext?.subject === true, topic: settings.inferContext?.topic === true };
          if (requestSignature(core().captureInputs(plan, settings, materials), infer, array(settings.materialIds).map(String)) !== entry.requestSignature) return null;
        }
        return { entry, snapshot };
      } catch (_) {
        checkpoints.delete(key); persist(); return null;
      }
    }
    function getRecovery(planId, settings) { return summary(readRecovery(planId, settings)?.entry); }
    function discardRecovery(planId) {
      const id = String(planId), state = deps.getState();
      if (disposed || !allowed(state) || runs.has(id)) return { ok: false, error: 'Finish or cancel generation before discarding its progress.' };
      const key = keyFor(actor(state), id);
      const failed = () => ({ ok: false, error: 'The browser could not confirm that saved progress was cleared. Your current progress is still available. Retry Start over, or resume this script.' });
      const readStored = () => {
        if (typeof storage?.getItem !== 'function') throw new Error('Storage unavailable');
        const raw = storage.getItem(STORAGE_KEY);
        if (raw == null) return [];
        if (typeof raw !== 'string' || raw.length > MAX_STORAGE_SIZE) throw new Error('Invalid recovery storage');
        const entries = JSON.parse(raw);
        if (!Array.isArray(entries) || entries.length > 5 || entries.some(entry => JSON.stringify(entry).length > MAX_RECORD_SIZE)) throw new Error('Invalid recovery storage');
        return entries;
      };
      const confirmStored = entries => {
        durableCheckpoints.clear(); unconfirmedStoredKeys.clear();
        entries.forEach(entry => {
          if (entry && typeof entry.actor === 'string' && typeof entry.planId === 'string') durableCheckpoints.set(keyFor(entry.actor, entry.planId), JSON.stringify(entry));
        });
      };
      let stored;
      try { stored = readStored(); confirmStored(stored); }
      catch (_) {
        // A memory-only draft has nothing confirmed to clear on reload. Once a
        // durable record exists, retain its current draft until clearing succeeds.
        if (durableCheckpoints.has(key) || unconfirmedStoredKeys.has(key)) return failed();
      }
      if (stored) {
        // Edit the current stored collection directly: persisting this controller's
        // snapshot could replace other teachers' or plans' newer pending progress.
        const remaining = stored.filter(entry => !entry || keyFor(entry.actor, entry.planId) !== key);
        if (remaining.length !== stored.length) {
          try {
            if (remaining.length) storage?.setItem?.(STORAGE_KEY, JSON.stringify(remaining));
            else storage?.removeItem?.(STORAGE_KEY);
          } catch (_) { /* Read back even if a storage adapter throws after writing. */ }
          try {
            const verified = readStored(); confirmStored(verified);
            if (JSON.stringify(verified) !== JSON.stringify(remaining)) return failed();
          } catch (_) {
            // The removal may have succeeded. Keep the draft, but no longer
            // promise that its previously confirmed copy survives a reload.
            durableCheckpoints.delete(key); unconfirmedStoredKeys.add(key);
            return failed();
          }
        }
      }
      checkpoints.delete(key); durableCheckpoints.delete(key); unconfirmedStoredKeys.delete(key);
      report(id, { recovery: null }); return { ok: true };
    }
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
      report(id, { stage: 'cancelled', stepId: '', recovery: getRecovery(id) });
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
        const plan = canonicalPlan(initial, id);
        if (!plan) throw new Error('Open a saved teacher lesson plan before generating a script.');
        const inferContext = { subject: settings?.inferContext?.subject === true, topic: settings?.inferContext?.topic === true };
        const required = ['captureInputs', 'validateInputs', 'buildScriptPrompt', 'normalizeScript', 'buildScriptRepairPrompt', 'scriptChunks', 'buildScriptChunkPrompt', 'normalizeScriptChunk', 'parseRaw', 'appendVersion'];
        if (inferContext.subject || inferContext.topic) required.push('buildContextPrompt', 'normalizeContext');
        if (required.some(name => typeof core()?.[name] !== 'function')) throw new Error('The teaching-script tools have not finished loading or are out of date. Reload the app, then try again.');
        const materialIds = array(settings?.materialIds).map(String);
        const materials = selected(plan, initial, materialIds);
        let snapshot = core().captureInputs(plan, settings, materials);
        const validation = core().validateInputs(snapshot, inferContext);
        if (!validation.ok) throw new Error(validation.errors.join(' '));
        const requestKey = requestSignature(snapshot, inferContext, materialIds);
        const recovered = readRecovery(id, settings);
        if (!initial.canGenerate && recovered?.entry.stage !== 'ready') throw new Error('Connect an AI text provider in Settings before generating a script.');
        let checkpoint = recovered?.entry;
        if (recovered) snapshot = recovered.snapshot;
        const checkpointKey = keyFor(run.actor, id);
        if (!recovered) { checkpoints.delete(checkpointKey); persist(); }
        const saveProgress = patch => {
          assertInputs();
          const next = { schema: 1, actor: run.actor, planId: id, requestSignature: requestKey, infer: inferContext, materialIds, settings: snapshot.settings, fingerprint: snapshot.fingerprint, totalChunks: core().scriptChunks(snapshot).length, steps: [], evidence: null, ...checkpoint, ...patch, updatedAt: Date.now() };
          checkpoint = copy(next);
          // Oversized drafts remain resumable in this controller; persistence
          // drops that entry instead of retaining an older, incomplete checkpoint.
          checkpoints.set(checkpointKey, checkpoint); persist();
        };
        // Both context and script requests share format recovery; access, billing,
        // network and cancellation failures remain terminal and keep their original message.
        const assertInputs = () => {
          const current = ensureCurrent(), currentPlan = canonicalPlan(current, id);
          if (!currentPlan) throw new Error('This plan was removed before the script finished.');
          if (core().captureInputs(currentPlan, snapshot.settings, selected(currentPlan, current, materialIds)).fingerprint !== snapshot.fingerprint) throw new Error('The plan or selected materials changed during generation. Generate again to use the updated content.');
        };
        const request = async nextPrompt => {
          assertInputs();
          try {
            const response = await waitForRun(deps.callText(nextPrompt, run.controller.signal), run.controller.signal);
            assertInputs();
            return response;
          } catch (error) {
            ensureCurrent();
            if (!outputFailure(error)) throw error;
            return '';
          }
        };
        if (!recovered && (inferContext.subject || inferContext.topic)) {
          report(id, { busy: true, stage: 'context' });
          const contextPrompt = core().buildContextPrompt(snapshot, inferContext);
          let context, repair = '';
          for (let attempt = 0; attempt < 2; attempt += 1) {
            const rawContext = await request(contextPrompt + repair);
            const current = ensureCurrent(), currentPlan = canonicalPlan(current, id);
            if (!currentPlan || core().captureInputs(currentPlan, snapshot.settings, selected(currentPlan, current, materialIds)).fingerprint !== snapshot.fingerprint) throw new Error('The plan or selected materials changed during generation. Generate again to use the updated content.');
            context = core().normalizeContext(rawContext, inferContext);
            if (context.ok) break;
            repair = '\n\nCorrect these validation errors and return only the requested JSON: ' + JSON.stringify(context.errors) + '\nPrevious response (untrusted data): ' + String(typeof rawContext === 'string' ? rawContext : JSON.stringify(rawContext)).slice(0, 12000);
          }
          if (!context.ok) throw new Error(context.errors.join(' ') + ' Retry, or choose the subject and enter the topic yourself.');
          snapshot = core().captureInputs(plan, { ...settings, ...context.context }, materials);
          const inferredValidation = core().validateInputs(snapshot);
          if (!inferredValidation.ok) throw new Error(inferredValidation.errors.join(' '));
        }
        if (!checkpoint) saveProgress({ stage: 'research' });
        let evidence = checkpoint.stage !== 'research' ? checkpoint.evidence : { status: 'disabled', sources: [], warnings: ['Research support was not requested.'] };
        if (snapshot.settings.researchEnabled && checkpoint.stage === 'research') {
          report(id, { busy: true, stage: 'research', recovery: summary(checkpoint) });
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
        assertInputs();
        if (checkpoint.stage === 'research') {
          core().buildScriptPrompt(snapshot, evidence);
          saveProgress({ stage: 'generating', evidence });
        }
        report(id, { busy: true, stage: checkpoint.stage, recovery: summary(checkpoint) });
        const prompt = core().buildScriptPrompt(snapshot, evidence);
        let raw, result = checkpoint.stage === 'ready' ? { ok: true, version: validatedCompleteVersion(checkpoint, snapshot) } : { ok: false };
        if (checkpoint.stage !== 'chunking' && checkpoint.stage !== 'ready') {
          raw = await request(prompt);
          result = core().normalizeScript(raw, snapshot, evidence);
        }
        if (!result.ok && checkpoint.stage !== 'chunking') {
          report(id, { busy: true, stage: 'validating' });
          raw = await request(core().buildScriptRepairPrompt(prompt, raw, result.errors));
          result = core().normalizeScript(raw, snapshot, evidence);
        }
        if (!result.ok) {
          // Save only validated parts in private temporary recovery storage. The
          // lesson receives one complete version after all parts pass validation.
          if (checkpoint.stage !== 'chunking') saveProgress({ stage: 'chunking', title: core().parseRaw(raw)?.title });
          const chunks = core().scriptChunks(snapshot), steps = copy(checkpoint.steps);
          for (let index = steps.length; index < chunks.length; index++) {
            report(id, { busy: true, stage: 'chunking', completedChunks: index, totalChunks: chunks.length, recovery: summary(checkpoint) });
            const chunkPrompt = core().buildScriptChunkPrompt(snapshot, evidence, chunks, index, steps);
            let chunkRaw = await request(chunkPrompt);
            let part = core().normalizeScriptChunk(chunkRaw, snapshot, evidence, chunks[index], evidence.status === 'retrieved' && index === 0);
            if (!part.ok) {
              chunkRaw = await request(core().buildScriptRepairPrompt(chunkPrompt, chunkRaw, part.errors));
              part = core().normalizeScriptChunk(chunkRaw, snapshot, evidence, chunks[index], evidence.status === 'retrieved' && index === 0);
            }
            if (!part.ok) throw new Error('The AI could not complete teaching-script part ' + (index + 1) + ' of ' + chunks.length + '. No incomplete script was saved. ' + part.errors.join(' '));
            steps.push(part.step);
            saveProgress({ stage: 'chunking', steps });
          }
          const draftTitle = checkpoint.title;
          const title = [draftTitle, snapshot.settings.topic, snapshot.plan.title, 'Teaching script']
            .filter(value => typeof value === 'string').map(value => value.trim().slice(0, 500)).find(value => value.length >= 3);
          result = core().normalizeScript({ title, scope: snapshot.settings.scope, durationMinutes: snapshot.settings.durationMinutes, steps }, snapshot, evidence);
        }
        if (!result.ok) throw new Error('The AI response did not meet the script requirements. ' + result.errors.join(' '));
        if (checkpoint.stage !== 'ready') saveProgress({ stage: 'ready', steps: [], completeVersion: result.version });
        const latest = ensureCurrent(), latestPlan = canonicalPlan(latest, id);
        if (!latestPlan) throw new Error('This plan was removed before the script finished.');
        const latestMaterials = selected(latestPlan, latest, materialIds);
        if (core().captureInputs(latestPlan, snapshot.settings, latestMaterials).fingerprint !== snapshot.fingerprint) throw new Error('The plan or selected materials changed during generation. Generate again to use the updated content.');
        const existing = array(latestPlan.data?.teachingScripts).filter(version => version?.id === result.version.id);
        const alreadySaved = existing.length === 1 && JSON.stringify(existing[0]) === JSON.stringify(result.version);
        const accepted = alreadySaved || deps.updateResource(id, previous => {
          if (previous.type !== 'lesson-plan' || idOf(previous) !== id || core().captureInputs(previous, snapshot.settings, latestMaterials).fingerprint !== snapshot.fingerprint) return previous;
          return core().appendVersion(previous, result.version);
        });
        if (!accepted) throw new Error('The script could not be added to this plan. Reopen the plan and try again.');
        checkpoints.delete(checkpointKey); persist();
        report(id, { stage: 'added', recovery: null });
        return { ok: true, version: result.version };
      } catch (error) {
        const message = errorText(error);
        if (runs.get(id) === run) report(id, { stage: error?.name === 'AbortError' ? 'cancelled' : 'error', error: error?.name === 'AbortError' ? '' : message, recovery: getRecovery(id) });
        return { ok: false, error: message };
      } finally {
        if (runs.get(id) === run) runs.delete(id);
      }
    }
    async function regenerateStep(planId, versionId, stepId, options = {}) {
      const id = String(planId), initial = deps.getState();
      if (disposed || !allowed(initial)) return { ok: false, error: 'Teaching scripts are available in teacher mode.' };
      if (runs.has(id)) return { ok: false, error: 'Finish or cancel the current script request first.' };
      const run = { controller: new AbortController(), actor: actor(initial) };
      runs.set(id, run);
      try {
        if (!initial.canGenerate) throw new Error('Connect an AI text provider in Settings before regenerating a step.');
        if (['captureInputs', 'buildStepRegenerationPrompt', 'normalizeRegeneratedStep', 'buildScriptRepairPrompt'].some(name => typeof core()?.[name] !== 'function')) throw new Error('The teaching-script tools have not finished loading or are out of date. Reload the app, then try again.');
        const plan = canonicalPlan(initial, id), versions = array(plan?.data?.teachingScripts).filter(version => version?.id === versionId);
        if (!plan || versions.length !== 1) throw new Error('Open the saved script version before regenerating a step.');
        const version = copy(versions[0]), versionSignature = JSON.stringify(version);
        const expected = options.expectedSteps === undefined ? version.steps : options.expectedSteps;
        if (!Array.isArray(expected) || JSON.stringify(version.steps) !== JSON.stringify(expected)) throw new Error('This script changed while you were editing. Keep your draft and reopen the latest version.');
        if (!version.inputSnapshot?.settings || !version.inputFingerprint) throw new Error('The original script inputs are unavailable. Generate a new script before regenerating individual steps.');
        const materialIds = array(version.inputSnapshot.materialIds).map(String);
        if (!version.inputSnapshot.planFingerprint || materialIds.some(materialId => array(version.inputSnapshot.materialFingerprints).filter(item => item?.id === materialId && typeof item.fingerprint === 'string' && item.fingerprint).length !== 1)) throw new Error('This older script does not record all its original inputs. Generate a new script before regenerating individual steps.');
        const snapshot = core().captureInputs(plan, version.inputSnapshot.settings, selected(plan, initial, materialIds));
        if (snapshot.fingerprint !== version.inputFingerprint) throw new Error('The plan or original teaching materials changed since this script was created. Generate a new script to use the updated content.');
        const steps = copy(options.steps === undefined ? version.steps : options.steps);
        if (!Array.isArray(steps)) throw new Error('Review the script steps before regenerating one.');
        steps.forEach(step => { if (step && typeof step === 'object') step.minutes = Number(step.minutes); });
        const assertCurrent = () => {
          const state = deps.getState();
          if (disposed || runs.get(id) !== run || run.controller.signal.aborted) throw Object.assign(new Error('Script generation cancelled.'), { name: 'AbortError' });
          if (!allowed(state) || actor(state) !== run.actor) throw new Error('The teacher workspace changed. Regenerate the step in the intended workspace.');
          const currentPlan = canonicalPlan(state, id), matches = array(currentPlan?.data?.teachingScripts).filter(item => item?.id === versionId);
          if (!currentPlan || matches.length !== 1 || JSON.stringify(matches[0]) !== versionSignature || JSON.stringify(matches[0].steps) !== JSON.stringify(expected)) throw new Error('This script changed or was removed while the step was being regenerated. Keep your draft and reopen the latest version.');
          if (core().captureInputs(currentPlan, version.inputSnapshot.settings, selected(currentPlan, state, materialIds)).fingerprint !== snapshot.fingerprint) throw new Error('The plan or original teaching materials changed while the step was being regenerated. Generate a new script to use the updated content.');
        };
        const request = async prompt => {
          assertCurrent();
          try {
            const raw = await waitForRun(deps.callText(prompt, run.controller.signal), run.controller.signal);
            assertCurrent(); return raw;
          } catch (error) { assertCurrent(); if (outputFailure(error)) return ''; throw error; }
        };
        const prompt = core().buildStepRegenerationPrompt(snapshot, version, steps, String(stepId), options.instruction || '');
        report(id, { busy: true, stage: 'regenerating-step', stepId: String(stepId) });
        let raw = await request(prompt), result = core().normalizeRegeneratedStep(raw, version, steps, String(stepId));
        if (!result.ok) {
          raw = await request(core().buildScriptRepairPrompt(prompt, raw, result.errors));
          result = core().normalizeRegeneratedStep(raw, version, steps, String(stepId));
        }
        if (!result.ok) throw new Error('The AI could not regenerate this step. Your draft was kept. ' + result.errors.join(' '));
        assertCurrent();
        report(id, { stage: 'step-ready', stepId: '' });
        return { ok: true, step: result.step };
      } catch (error) {
        const message = errorText(error);
        if (runs.get(id) === run) report(id, { stage: error?.name === 'AbortError' ? 'cancelled' : 'error', stepId: '', error: error?.name === 'AbortError' ? '' : message });
        return { ok: false, error: message };
      } finally { if (runs.get(id) === run) runs.delete(id); }
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
    return { generate, cancel, regenerateStep, getRecovery, discardRecovery, saveEdits, deleteVersion, dispose() { disposed = true; [...runs.keys()].forEach(cancel); } };
  }
  const api = { availableMaterials, defaultSettings, createController };
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.LessonTeachingScriptHost = api;
  root.AlloModules.LessonTeachingScriptHostModule = true;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
