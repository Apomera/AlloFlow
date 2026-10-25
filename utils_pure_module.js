(function() {
'use strict';
if (window.AlloModules && window.AlloModules.UtilsPureModule) { console.log('[CDN] UtilsPureModule already loaded, skipping'); return; }
// utils_pure_source.jsx — pure utility functions (JSON, storage, network, image).
// Extracted from AlloFlowANTI.txt on 2026-04-21.
// utils_pure_source.jsx — Pure-utility CDN module for AlloFlow
// Extracted from AlloFlowANTI.txt 2026-04-21 (v3 audit — Module A, after
// RIME dead-code dedup).
//
// Contents (~546 lines of pure functions, no React, no JSX, no component state):
//   JSON/data: safeJsonParse, cleanJson, calculateTextEntropy, validateDraftQuality,
//              chunkObject, flattenObject, unflattenObject
//   Text: getAssetManifest
//   Storage: storageDB (IndexedDB + LZString wrapper)
//   Network: fetchWithExponentialBackoff, isGoogleRedirect, isYouTubeUrl, fetchAndCleanUrl
//   Image: optimizeImage (canvas-based base64 optimizer)
//
// fetchAndCleanUrl closes over apiKey / _isCanvasEnv / GEMINI_MODELS — we alias
// them via window at the top of this module. The monolith mirrors these onto
// window near the AIBackend shim so they're available when this CDN loads.
//
// storageDB uses window.idbKeyval + window.LZString (both already loaded as
// external scripts in AlloFlowANTI.txt's preamble). safeJsonParse uses
// window.jsonrepair (lazy-loaded on demand).
//
// Logging: warnLog/debugLog aliased from window; fall back to console.

// ─── Globals aliased from window ──────────────────────────────────────────
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn;
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var apiKey = (typeof window !== 'undefined') ? window.apiKey : undefined;
var _isCanvasEnv = (typeof window !== 'undefined') ? Boolean(window._isCanvasEnv) : false;
var GEMINI_MODELS = (typeof window !== 'undefined' && window.GEMINI_MODELS) || { default: 'gemini-3-flash-preview', fallback: 'gemini-3-flash-preview' };

// Retired Gemini Canvas versions. Older Canvas shares keep loading this CDN
// module, so this is the one place that can reach them. Only Canvas pages are
// checked; Desktop, the hosted app and local development are never touched.
//   1.11+ defines the trusted script dispatcher        -> current, nothing shown
//   1.10 defines window.__alloModuleLoadDiagnostics    -> notice until the grace date, then retired
//   1.9 and older define neither                       -> retired
var ALLO_RETIRED_VERSION_GATE = {
  launcherUrl: 'https://apomera.github.io/AlloFlow/launch.html',
  previousGraceEnds: '2026-11-08T23:59:59Z'
};
function _alloCanvasGeneration(win) {
  if (typeof win.__alloConfigureTrustedScript === 'function') return 'current';
  if (win.__alloModuleLoadDiagnostics) return 'previous';
  return 'retired';
}
function _alloIsCanvasPage(win) {
  var stamp = win.__alloBuildStamp;
  if (stamp && stamp.surface) return stamp.surface === 'canvas';
  var loc = win.location || {};
  return loc.protocol === 'blob:' || /(\.|^)(usercontent\.goog|googleusercontent\.com)$/i.test(String(loc.hostname || ''));
}
function _alloRetiredVersionState(win, now) {
  if (!_alloIsCanvasPage(win)) return 'not-canvas';
  var generation = _alloCanvasGeneration(win);
  if (generation === 'previous' && now >= Date.parse(ALLO_RETIRED_VERSION_GATE.previousGraceEnds)) return 'retired';
  return generation;
}
function _alloShowRetiredVersionNotice(win, doc, state) {
  if (state !== 'retired' && state !== 'previous') return null;
  if (doc.getElementById('allo-retired-version-notice')) return null;
  var blocking = state === 'retired';
  var box = doc.createElement('div');
  box.id = 'allo-retired-version-notice';
  box.setAttribute('role', blocking ? 'alertdialog' : 'region');
  box.setAttribute('aria-label', blocking ? 'This version of AlloFlow has been retired' : 'A newer version of AlloFlow is available');
  if (blocking) box.setAttribute('aria-modal', 'true');
  box.style.cssText = blocking
    ? 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font:16px/1.5 system-ui,sans-serif;padding:24px;'
    : 'position:fixed;left:0;right:0;top:0;z-index:2147483647;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;background:#fef3c7;color:#422006;font:15px/1.4 system-ui,sans-serif;padding:10px 16px;border-bottom:2px solid #b45309;';
  var text = doc.createElement(blocking ? 'div' : 'span');
  text.style.cssText = blocking ? 'max-width:520px;text-align:center;' : '';
  var title = doc.createElement(blocking ? 'h1' : 'strong');
  title.textContent = blocking ? 'This version of AlloFlow has been retired' : 'A newer version of AlloFlow is available.';
  if (blocking) title.style.cssText = 'font-size:24px;margin:0 0 12px;';
  var body = doc.createElement(blocking ? 'p' : 'span');
  body.textContent = blocking
    ? 'Older copies no longer receive security fixes, so this one has been switched off. Your saved work stays on this device. Open the current version to keep going.'
    : ' This version stops working on November 8, 2026. Switch now to keep receiving fixes.';
  if (blocking) body.style.cssText = 'margin:0 0 20px;';
  text.appendChild(title); text.appendChild(body);
  var link = doc.createElement('a');
  link.href = ALLO_RETIRED_VERSION_GATE.launcherUrl;
  link.target = '_blank'; link.rel = 'noopener';
  link.textContent = 'Open the current AlloFlow';
  link.style.cssText = blocking
    ? 'display:inline-block;background:#f8fafc;color:#0f172a;font-weight:700;padding:12px 20px;border-radius:8px;text-decoration:none;'
    : 'color:#422006;font-weight:700;text-decoration:underline;';
  if (blocking) text.appendChild(link); else box.appendChild(text);
  if (blocking) box.appendChild(text); else box.appendChild(link);
  if (!blocking) {
    var close = doc.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.setAttribute('aria-label', 'Dismiss the new version notice');
    close.style.cssText = 'background:transparent;border:1px solid #92400e;color:#422006;border-radius:6px;padding:4px 10px;cursor:pointer;';
    close.addEventListener('click', function () { box.remove(); });
    box.appendChild(close);
  }
  (doc.body || doc.documentElement).appendChild(box);
  if (blocking) { try { link.focus(); } catch (_) {} }
  return box;
}
(function installRetiredVersionGate() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    var state = _alloRetiredVersionState(window, Date.now());
    if (state !== 'retired' && state !== 'previous') return;
    var show = function () { _alloShowRetiredVersionNotice(window, document, state); };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show, { once: true });
  } catch (_) {}
})();

const safeJsonParse = (text) => {
  if (!text || typeof text !== 'string') return null;
  try {
    const cleaned = cleanJson(text);
    if (!cleaned || cleaned.trim().length === 0 || cleaned === "{}") {
        return null;
    }
    if (typeof window !== 'undefined' && window.jsonrepair) {
      try {
        const repaired = window.jsonrepair(cleaned);
        return JSON.parse(repaired);
      } catch (e) {
        warnLog("safeJsonParse: jsonrepair failed, attempting standard parse...");
      }
    }
    return JSON.parse(cleaned);
  } catch (e) {
    warnLog("safeJsonParse: Parsing failed", e);
    return null;
  }
};
const cleanJson = (text) => {
    if (!text) return "{}";
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Sanitize invalid backslash escapes inside JSON strings (keep valid: \" \\ \/ \b \f \n \r \t \u)
    cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;
    if (firstBrace === -1 && firstBracket === -1) return "{}";
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = cleaned.lastIndexOf('}');
    } else {
        startIdx = firstBracket;
        endIdx = cleaned.lastIndexOf(']');
    }
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return "{}";
    }
    cleaned = cleaned.substring(startIdx, endIdx + 1);
    cleaned = cleaned.replace(/}\s*{/g, '}, {');
    cleaned = cleaned.replace(/]\s*{/g, '], {');
    cleaned = cleaned.replace(/}\s*\[/g, '}, [');
    cleaned = cleaned.replace(/,\s*]/g, ']');
    cleaned = cleaned.replace(/,\s*}/g, '}');
    cleaned = cleaned.replace(/\.\.\.\s*]/g, ']');
    cleaned = cleaned.replace(/\.\.\.\s*}/g, '}');
    cleaned = cleaned.replace(/("|\d)\s*\n\s*"/g, '$1,\n"');
    cleaned = cleaned.replace(/(true|false|null)\s*\n\s*"/g, '$1,\n"');
    cleaned = cleaned.replace(/"\s*\n\s*"/g, '",\n"');
    cleaned = cleaned.replace(/}\s*\n\s*{/g, '},\n{');
    cleaned = cleaned.replace(/]\s*\n\s*\[/g, '],\n[');
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    return cleaned;
};
const calculateTextEntropy = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tokens = cleanText.split(" ");
  if (tokens.length === 0 || (tokens.length === 1 && !tokens[0])) return 0;
  const uniqueTokens = new Set(tokens);
  return uniqueTokens.size / tokens.length;
};
const validateDraftQuality = (text) => {
  if (!text || text.trim().length < 20) {
      return { isValid: false, error: "Submission is too short." };
  }
  const entropy = calculateTextEntropy(text);
  if (entropy < 0.4) {
      return { isValid: false, error: "Text appears too repetitive or spammy." };
  }
  return { isValid: true, error: null };
};
// --- Success criteria -------------------------------------------------------
// A lesson plan's success criteria are keyed by the SAME ids the class results
// roll up by: the exit ticket's concept labels. The quiz is generated first and
// the plan last, so the plan derives its criteria from the quiz that already
// exists; only when no quiz exists do the objectives supply them. Ids are never
// invented where the data could not match them.
const getQuizConceptLabels = (item) => {
    const questions = item && item.data && Array.isArray(item.data.questions) ? item.data.questions : [];
    const out = [];
    questions.forEach(q => {
        const label = q && typeof q.conceptLabel === 'string' ? q.conceptLabel.replace(/\s+/g, ' ').trim() : '';
        if (label && !out.includes(label)) out.push(label);
    });
    return out;
};
const _alloCriterionSlug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
// The one key criteria are saved and looked up by. It must equal the quiz's
// normalizeConceptId (quiz_live_aggregators.js), which the dispatcher applies to
// every conceptLabel, or plan-first criteria like "SC1" never find their results.
const successCriterionKey = (value) => {
    const qla = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (qla && typeof qla.normalizeConceptId === 'function') return qla.normalizeConceptId(value);
    if (value == null) return '';
    let s = String(value).trim().toLowerCase();
    if (!s) return '';
    s = s.replace(/^["'`(\[]+|["'`)\]]+$/g, '');
    while (/^(the |a |an )/.test(s)) s = s.replace(/^(the |a |an )/, '');
    return s.replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '').trim();
};
// Which live results belong on this plan. Pre-check results never count as
// meeting a criterion; a plan that recorded its quiz only takes that quiz's.
const resolvePlanCriterionRollup = (planData, rollup) => {
    const r = rollup && typeof rollup === 'object' && rollup.byConcept && typeof rollup.byConcept === 'object' ? rollup : null;
    if (!r) return { status: 'none', byKey: {} };
    const quizMode = String(r.quizMode || 'exit-ticket');
    const info = { quizId: r.quizId == null ? null : String(r.quizId), quizTitle: typeof r.quizTitle === 'string' ? r.quizTitle.trim() : '', quizMode, sessionLabel: typeof r.sessionLabel === 'string' ? r.sessionLabel : '', sessionCode: typeof r.sessionCode === 'string' ? r.sessionCode : '' };
    if (quizMode === 'pre-check') return { status: 'pre-check', byKey: {}, ...info };
    const savedQuizId = planData && planData.successCriteriaQuizId != null && planData.successCriteriaQuizId !== '' ? String(planData.successCriteriaQuizId) : '';
    if (savedQuizId && info.quizId !== savedQuizId) return { status: 'other-quiz', byKey: {}, ...info };
    const byKey = {};
    Object.keys(r.byConcept).forEach(label => {
        const key = successCriterionKey(label);
        const s = r.byConcept[label];
        if (!key || !s || typeof s !== 'object') return;
        const bucket = byKey[key] || (byKey[key] = { met: 0, partial: 0, total: 0 });
        ['met', 'partial', 'total'].forEach(field => { bucket[field] += Number.isFinite(Number(s[field])) ? Number(s[field]) : 0; });
    });
    return { status: 'match', byKey, ...info };
};
const criterionRollupStat = (resolved, id) => {
    const key = successCriterionKey(id);
    return key && resolved && resolved.byKey && resolved.byKey[key] ? resolved.byKey[key] : null;
};
const normalizeSuccessCriteria = (raw, options = {}) => {
    const concepts = (Array.isArray(options.concepts) ? options.concepts : []).map(c => String(c || '').trim()).filter(Boolean);
    const objectives = Array.isArray(options.objectives) ? options.objectives : [];
    const text = (v) => (typeof v === 'string' ? v : (v && typeof v === 'object' ? String(v.statement || v.text || v.criterion || '') : '')).replace(/\s+/g, ' ').trim();
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const out = [];
    const seen = new Set();
    list.forEach((entry, i) => {
        const statement = text(entry);
        if (!statement) return;
        let id = entry && typeof entry === 'object' && typeof entry.id === 'string' ? entry.id.trim() : '';
        // Snap to the real concept label when the model paraphrased or slugged it.
        const lower = id.toLowerCase();
        const match = concepts.find(c => c === id)
            || concepts.find(c => c.toLowerCase() === lower)
            || concepts.find(c => _alloCriterionSlug(c) === _alloCriterionSlug(id) && id)
            || concepts.find(c => statement.toLowerCase().includes(c.toLowerCase()));
        if (match) id = match;
        id = successCriterionKey(id);
        if (!id) id = _alloCriterionSlug(statement) || ('criterion-' + (i + 1));
        if (seen.has(id)) return;
        seen.add(id);
        out.push({ id, statement, source: match ? 'quiz' : 'objective' });
    });
    // Every quiz concept must be represented, or its results would have nowhere to land.
    concepts.forEach(c => {
        const id = successCriterionKey(c) || c;
        if (seen.has(id)) return;
        seen.add(id);
        out.push({ id, statement: 'I can ' + c.replace(/^I can\s+/i, '').replace(/\.$/, '') + '.', source: 'quiz' });
    });
    if (!out.length) {
        objectives.forEach((o, i) => {
            const s = text(o);
            if (!s) return;
            const id = successCriterionKey(_alloCriterionSlug(s)) || ('objective-' + (i + 1));
            if (seen.has(id)) return;
            seen.add(id);
            out.push({ id, statement: /^I can\b/i.test(s) ? s : 'I can ' + s.charAt(0).toLowerCase() + s.slice(1), source: 'objective' });
        });
    }
    return out.slice(0, 8);
};

// --- Plan output language ---------------------------------------------------
// "All Selected Languages" is a UI pseudo-value meaning "generate one copy per
// selected language". The dispatcher implements that as a fan-out; a single
// sidebar plan cannot, so it must resolve the pseudo-value to a real language
// rather than forward it. Forwarding put "Language: All Selected Languages"
// into the prompt and asked the model to write in a language that does not
// exist. English is the same fallback content_engine already uses for this
// case (phonics, word analysis).
const ALLO_ALL_SELECTED_LANGUAGES = 'All Selected Languages';
const resolvePlanOutputLanguage = (outputLanguage, uiLanguage) => {
  const out = String(outputLanguage == null ? '' : outputLanguage).trim();
  if (out && out !== ALLO_ALL_SELECTED_LANGUAGES) return out;
  const ui = String(uiLanguage == null ? '' : uiLanguage).trim();
  if (ui && ui !== ALLO_ALL_SELECTED_LANGUAGES) return ui;
  return 'English';
};

// --- Unit Path context ------------------------------------------------------
// Where a lesson sits on the teacher's Unit Path (Learning Web), read from the
// registry's registered unit-path graphs (acg/v1). A plan is "on the path" when
// a node's exact resourceId is the plan id, or the plan was generated for a
// node (data.unitPath). Nothing is inferred from titles or positions.
const resolveUnitPathContext = (entries, plan) => {
    const list = Array.isArray(entries) ? entries : [];
    const planId = plan && plan.id != null ? String(plan.id) : '';
    const stamped = plan && plan.data && plan.data.unitPath && typeof plan.data.unitPath === 'object' ? plan.data.unitPath : null;
    const text = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n || 400);
    for (let e = 0; e < list.length; e++) {
        const entry = list[e];
        const graph = entry && entry.graph;
        if (!entry || !/^unit-path:/.test(String(entry.id || '')) || !graph || !Array.isArray(graph.nodes)) continue;
        const nodes = graph.nodes.filter(n => n && typeof n.id === 'string' && n.id);
        const byId = {};
        nodes.forEach(n => { byId[n.id] = n; });
        const outgoing = {};
        const incoming = {};
        (Array.isArray(graph.edges) ? graph.edges : []).forEach(edge => {
            if (!edge) return;
            const from = String(edge.source || edge.from || edge.fromId || '');
            const to = String(edge.target || edge.to || edge.toId || '');
            if (!byId[from] || !byId[to] || from === to) return;
            (outgoing[from] = outgoing[from] || []).push(to);
            (incoming[to] = incoming[to] || []).push(from);
        });
        let current = null;
        if (planId) current = nodes.find(n => String(n.resourceId || '') === planId) || null;
        if (!current && stamped && String(stamped.graphId || '') === String(entry.id) && byId[String(stamped.nodeId || '')]) current = byId[String(stamped.nodeId)];
        if (!current) continue;
        // Linear order: depth-first from the roots in edge order; index is 1-based.
        const roots = nodes.filter(n => !incoming[n.id] || !incoming[n.id].length);
        const order = [];
        const seen = {};
        const walk = (id) => { if (seen[id]) return; seen[id] = true; order.push(id); (outgoing[id] || []).forEach(walk); };
        (roots.length ? roots : [current]).forEach(n => walk(n.id));
        nodes.forEach(n => walk(n.id));
        const index = order.indexOf(current.id);
        const nextId = (outgoing[current.id] || [])[0] || (index >= 0 ? order[index + 1] : null) || null;
        const priorId = (incoming[current.id] || [])[0] || (index > 0 ? order[index - 1] : null) || null;
        const brief = (n) => n ? {
            id: n.id,
            label: text(n.label || n.resourceTitle || n.description || 'Planned lesson', 400),
            resourceId: n.resourceId ? String(n.resourceId) : '',
            planned: !n.resourceId,
        } : null;
        return {
            graphId: String(entry.id),
            title: text(entry.title || (graph.metadata && graph.metadata.title) || '', 300),
            current: brief(current),
            prior: brief(priorId ? byId[priorId] : null),
            next: brief(nextId ? byId[nextId] : null),
            index: index >= 0 ? index + 1 : null,
            count: order.length,
        };
    }
    return null;
};

const getAssetManifest = (historyItems, options = {}) => {
    const assets = (Array.isArray(historyItems) ? historyItems : []).filter(h =>
        h && typeof h.type === 'string' && h.type.trim() && !['lesson-plan', 'udl-advice', 'alignment-report', 'gemini-bridge'].includes(h.type)
    );
    if (assets.length === 0) return "No specific assets generated yet. Suggest general activities.";
    let manifest = "--- AVAILABLE ASSET INVENTORY (THE KIT) ---\n";
    assets.forEach(item => {
        const traceStart = manifest.length;
        const title = typeof item.title === "string" && item.title ? item.title : "Untitled Resource";
        let usage = "";
        switch(item.type) {
            case 'image': usage = "(Visual Anchor / Hook)"; break;
            case 'adventure': usage = "(Engagement / Hook / Application)"; break;
            case 'simplified': usage = "(Core Text / Direct Instruction)"; break;
            case 'glossary': usage = "(Vocabulary Support)"; break;
            case 'timeline': usage = "(Sequence Activity / Guided Practice)"; break;
            case 'concept-sort': usage = "(Categorization Activity / Guided Practice)"; break;
            case 'sentence-frames': usage = "(Writing Support / Independent Practice)"; break;
            case 'dbq': usage = "(Document Analysis / Critical Thinking)"; break;
            case 'storyforge-config': usage = "(Creative Writing Assignment)"; break;
            case 'storyforge-submission': usage = "(Student Story Submission)"; break;
            case 'quiz': usage = "(Assessment / Closure)"; break;
            case 'math': usage = "(STEM Problem Solving)"; break;
            case 'persona': usage = "(Historical Interview Activity)"; break;
            default: usage = "(Supplementary Resource)";
        }
        manifest += `- [${item.type.toUpperCase()}] "${title}" (ID: ${item.id}): ${usage}\n`;
        // The exit ticket is generated BEFORE the plan; its concept labels are
        // the ids the plan's success criteria must use, so class results roll up.
        if (item.type === 'quiz') {
            const concepts = getQuizConceptLabels(item);
            if (concepts.length) manifest += `    concepts: ${concepts.join('; ')}\n`;
        }
        if (typeof options.trace === 'function') options.trace({ id:item.id, title, type:item.type, text:manifest.slice(traceStart) });
    });
    manifest += "-------------------------------------------\n";
    return manifest;
};
const chunkObject = (obj, maxKeys) => {
  const keys = Object.keys(obj);
  const chunks = [];
  let currentChunk = {};
  let currentCount = 0;
  keys.forEach((key, index) => {
    currentChunk[key] = obj[key];
    currentCount++;
    if (currentCount >= maxKeys || index === keys.length - 1) {
      chunks.push(currentChunk);
      currentChunk = {};
      currentCount = 0;
    }
  });
  return chunks;
};
const flattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};
const unflattenObject = (data) => {
    const result = {};
    for (const i in data) {
        const keys = i.split('.');
        keys.reduce((acc, key, idx) => {
            if (idx === keys.length - 1) {
                acc[key] = data[i];
            } else {
                if (!acc[key]) acc[key] = {};
            }
            return acc[key];
        }, result);
    }
    return result;
};
// ── Device-storage bridge mirror (2026-07-14) ──────────────────────────
// In Canvas the app origin is EPHEMERAL: idbKeyval's IndexedDB vanishes
// between sessions, so the automatic autosave/restore that quietly works on
// stable origins loses everything there. When the surface looks like Canvas,
// storageDB writes through to the device-storage bridge (silent partitioned-
// iframe channel on alloflow-cdn.pages.dev — probe-verified 2026-07-14 to
// persist across Canvas sessions) and falls back to it on read misses,
// backfilling the fast local IDB. Values cross the bridge in their stored
// form (LZString-compressed strings), so both sides stay byte-compatible.
// Stable origins never load the bridge — zero behavior change outside Canvas.
const _dsBridgeWanted = (() => {
  try {
    const host = window.location.hostname || '';
    if ((window.location.href || '').startsWith('blob:')) return true;
    return host.includes('googleusercontent') || host.includes('scf.usercontent') ||
           host.includes('code-server') || host.includes('idx.google') || host.includes('run.app');
  } catch (_) { return false; }
})();
const _dsBridge = () => {
  if (!window.__alloDeviceStoragePromise) {
    window.__alloDeviceStoragePromise = window.alloDeviceStorage
      ? Promise.resolve(window.alloDeviceStorage)
      : new Promise((resolve, reject) => {
          const s = document.createElement('script');
          if (typeof window.__alloConfigureTrustedScript !== 'function') throw new Error('Trusted script delivery is unavailable.');
          window.__alloConfigureTrustedScript(s, 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds6-media-removal-intent');
          s.onload = () => {
            // Pages answers missing files with its SPA index as HTML 200 —
            // verify the global actually appeared (lame.min.js lesson).
            if (window.alloDeviceStorage) resolve(window.alloDeviceStorage);
            else reject(new Error('device storage module missing after load'));
          };
          s.onerror = () => reject(new Error('device storage module failed to load'));
          document.head.appendChild(s);
        });
  }
  return window.__alloDeviceStoragePromise.then((ds) => ds.ready().then(() => ds));
};
const _dsMirrorSet = (key, storedValue) => {
  if (!_dsBridgeWanted) return;
  _dsBridge().then((ds) => ds.set('app_kv', key, storedValue))
    .catch((e) => warnLog(`storageDB bridge mirror failed [${key}]:`, e?.code || e?.message || e));
};
// ── Canvas localStorage continuity (2026-07-14) ────────────────────────
// Settings and toggles all over the app (theme, voice, a11y, per-tool
// preferences) live in plain localStorage, which resets every Canvas
// session with the throwaway origin. On Canvas surfaces: hydrate
// localStorage from the bridge at load (only keys the session hasn't
// already written — never clobber fresher values), then snapshot ordinary
// preferences periodically and on hide/unload. Clinical records have their
// own encrypted workspace; older bridge copies stay untouched until that
// workspace verifies their encrypted migration. window.__alloPrefsHydrated +
// the allo-prefs-hydrated event let the monolith's mount gate hold first
// paint briefly so boot-time reads (theme, a11y) see restored values.
const _isPrivateClassroomStorageKey = (key) => key === 'alloflow_classroom_roster_state_v1' || key === 'alloflow_classroom_sync_keys';
const _isProtectedClinicalStorageKey = (key) => typeof key === 'string' && [
  'behaviorLens_', 'bl_', 'allo_behaviorlens_',
  'alloflow_dynamic_assessment_', 'alloflow_da_', 'allo_rw_'
].some((prefix) => key.startsWith(prefix));
if (_dsBridgeWanted && typeof window !== 'undefined') {
  let _prefsHydrationPromise = null;
  let _lsSnapshotPromise = null;
  let _lsSnapshotRequested = false;
  const _finishPrefsHydration = (applied, available, skippedExisting = 0, replacedExisting = false) => {
    window.__alloPrefsHydrated = true;
    window.__alloPrefsHydrationStatus = available ? 'ready' : 'unavailable';
    try { window.dispatchEvent(new CustomEvent('allo-prefs-hydrated', { detail: { applied, available: !!available, skippedExisting, replacedExisting } })); } catch (_) {}
  };
  const _hydratePrefs = (options = {}) => {
    if (_prefsHydrationPromise) return _prefsHydrationPromise;
    const replaceExisting = options?.replaceExisting === true;
    window.__alloPrefsHydrationStatus = 'pending';
    _prefsHydrationPromise = Promise.resolve(_lsSnapshotPromise).then(() => _dsBridge()).then((ds) => ds.get('ls_prefs', 'all')).then((snap) => {
      let applied = 0;
      let skippedExisting = 0;
      let writeFailed = false;
      if (snap && typeof snap === 'object') {
        Object.keys(snap).forEach((k) => {
          try {
            if (_isPrivateClassroomStorageKey(k) || _isProtectedClinicalStorageKey(k)) return;
            if (typeof snap[k] !== 'string') return;
            const currentValue = localStorage.getItem(k);
            if (currentValue === snap[k]) return;
            if (currentValue === null || replaceExisting) {
              localStorage.setItem(k, snap[k]);
              applied++;
            } else {
              skippedExisting++;
            }
          } catch (_) { writeFailed = true; }
        });
      }
      _finishPrefsHydration(applied, !writeFailed, skippedExisting, replaceExisting);
      return { applied, available: !writeFailed, skippedExisting, replacedExisting: replaceExisting };
    }).catch(() => {
      _finishPrefsHydration(0, false, 0, replaceExisting);
      return { applied: 0, available: false, skippedExisting: 0, replacedExisting: replaceExisting };
    }).finally(() => { _prefsHydrationPromise = null; });
    return _prefsHydrationPromise;
  };
  window.__alloRetryPrefsHydration = _hydratePrefs;
  _hydratePrefs();
  // Dirty-check before sending: whole-store payloads can be MBs (AlloHaven
  // keeps its entire world in alloflow_allohaven_v1), so only cross the
  // bridge when something actually changed since the last snapshot.
  let _lsLastSnapshotSig = null;
  const _prefsStorageDurable = (ds) => {
    if (typeof ds?.status !== 'function' || typeof ds.compareAndSwap !== 'function') return false;
    const status = ds.status();
    return status?.connected === true && ['direct', 'bridge-iframe', 'bridge-popup'].includes(status.backend);
  };
  const _lsSnapshot = () => {
    if (_prefsHydrationPromise || window.__alloPrefsHydrationStatus !== 'ready') return;
    _lsSnapshotRequested = true;
    if (_lsSnapshotPromise) return _lsSnapshotPromise;
    _lsSnapshotPromise = (async () => {
      while (_lsSnapshotRequested && !_prefsHydrationPromise && window.__alloPrefsHydrationStatus === 'ready') {
        _lsSnapshotRequested = false;
        const ds = await _dsBridge();
        if (_prefsHydrationPromise || window.__alloPrefsHydrationStatus !== 'ready') return;
        if (!_prefsStorageDurable(ds)) return;
        const dump = Object.create(null);
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && !_isPrivateClassroomStorageKey(k) && !_isProtectedClinicalStorageKey(k)) dump[k] = localStorage.getItem(k);
        }
        const sig = JSON.stringify(dump);
        if (sig === _lsLastSnapshotSig) continue;
        // Preserve sole legacy clinical copies without introducing new ones.
        // Re-read on every CAS retry: a concurrent verified migration can
        // remove an old copy, and a stale preference write must not revive it.
        for (let attempt = 0; attempt < 5; attempt++) {
          if (!_prefsStorageDurable(ds)) break;
          const current = await ds.get('ls_prefs', 'all');
          if (!_prefsStorageDurable(ds)) break;
          if (current != null && (typeof current !== 'object' || Array.isArray(current))) break;
          const next = Object.assign(Object.create(null), dump);
          if (current) Object.keys(current).forEach((k) => {
            if (_isProtectedClinicalStorageKey(k)) next[k] = current[k];
          });
          const expected = current == null ? { mode: 'absent' }
            : Number.isSafeInteger(current.revision) && current.revision > 0
              ? current.revision : { mode: 'value', value: current };
          const result = await ds.compareAndSwap('ls_prefs', 'all', expected, next, { queue: false });
          if (result?.applied === true && _prefsStorageDurable(ds)) { _lsLastSnapshotSig = sig; break; }
        }
      }
    })().catch(() => {}).finally(() => { _lsSnapshotPromise = null; });
    return _lsSnapshotPromise;
  };
  setInterval(_lsSnapshot, 30000);
  window.addEventListener('pagehide', _lsSnapshot);
  window.addEventListener('alloflow:educator-access-code-changed', _lsSnapshot);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _lsSnapshot();
  });
}
const storageDB = {
  get: async (key, options) => {
    const strict = !!(options && options.throwOnError);
    try {
      if (typeof window === 'undefined' || !window.idbKeyval) {
        if (strict) throw new Error('Device storage is not ready yet.');
        warnLog('storageDB.get: IDB not yet loaded, returning null for', key); return null;
      }
      let val = await window.idbKeyval.get(key);
      if ((val === undefined || val === null) && _dsBridgeWanted && !(options && options.localOnly)) {
        // Fresh Canvas session: local IDB is empty but the bridge may hold
        // the previous session's autosave. Backfill local so later reads hit
        // the fast path.
        try {
          val = await _dsBridge().then((ds) => ds.get('app_kv', key));
          if (val !== undefined && val !== null) {
            try { await window.idbKeyval.set(key, val); } catch (_) {}
          }
        } catch (e) {
          warnLog(`storageDB bridge read failed [${key}]:`, e?.code || e?.message || e);
          if (strict) throw e;
          val = null;
        }
      }
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return val;
      if (window.LZString) {
        let decompressed = window.LZString.decompressFromUTF16(val);
        if (!decompressed) {
            decompressed = window.LZString.decompress(val);
        }
        return decompressed ? JSON.parse(decompressed) : JSON.parse(val);
      }
      return JSON.parse(val);
    } catch (e) {
      warnLog(`storageDB Read Error [${key}]:`, e);
      if (strict) throw e;
      return null;
    }
  },
  set: async (key, value, options) => {
    const strict = !!(options && options.throwOnError);
    // Reports success as a boolean (2026-07-13): true when the write LANDED,
    // false when it was skipped or failed (quota, IDB unavailable). Durability-
    // sensitive callers (batch checkpoints) check the report; legacy callers
    // that ignore the return keep non-throwing semantics. Strict recovery
    // writers opt in to the original error for accurate quota classification.
    if (typeof window === 'undefined' || !window.idbKeyval) {
      if (strict) {
        const error = new Error('Device storage is not ready yet.');
        error.code = 'storage-unavailable';
        throw error;
      }
      warnLog('storageDB.set: IDB not yet loaded, skipping write for', key);
      return false;
    }
    try {
      const stringified = JSON.stringify(value);
      const valToStore = window.LZString ? window.LZString.compressToUTF16(stringified) : stringified;
      await window.idbKeyval.set(key, valToStore);
      _dsMirrorSet(key, valToStore);
      return true;
    } catch (e) {
      warnLog(`storageDB Write Error [${key}]:`, e);
      // Local quota blew but the bridge bucket has its own (usually larger)
      // quota — still try to land the durable copy there.
      try {
        const stringified = JSON.stringify(value);
        _dsMirrorSet(key, window.LZString ? window.LZString.compressToUTF16(stringified) : stringified);
      } catch (_) {}
      if (strict) throw e;
      return false;
    }
  },
  del: async (key) => {
    try {
      if (typeof window !== 'undefined' && window.idbKeyval) await window.idbKeyval.del(key);
    } catch (e) { warnLog(`storageDB Del Error [${key}]:`, e); }
    if (_dsBridgeWanted) {
      _dsBridge().then((ds) => ds.remove('app_kv', key))
        .catch((e) => warnLog(`storageDB bridge del failed [${key}]:`, e?.code || e?.message || e));
    }
  },
  clear: async () => {
    try {
      if (typeof window !== 'undefined' && window.idbKeyval) await window.idbKeyval.clear();
    } catch (e) { warnLog("storageDB Clear Error:", e); }
    if (_dsBridgeWanted) {
      _dsBridge().then((ds) => ds.clearNamespace('app_kv'))
        .catch((e) => warnLog('storageDB bridge clear failed:', e?.code || e?.message || e));
    }
  }
};
const PROVIDER_RETRY_AFTER_MAX_MS = 120000;

// A successful state update or a fulfilled legacy set() promise is not a
// durability receipt. Recovery callers require an acknowledged write and a
// matching strict read. The caller owns sequencing and quota fallback.
const writeVerifiedStorageSnapshot = async (storage, key, snapshot, isCurrent = () => true) => {
  const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
  if (!isCurrent()) return { status: 'superseded', verified: false };
  const expected = JSON.stringify(snapshot);
  const written = await storage.set(key, snapshot, { throwOnError: true });
  if (written !== true) fail('storage-write-unacknowledged', 'Device storage did not acknowledge this save.');
  if (!isCurrent()) return { status: 'superseded', verified: false };
  const saved = await storage.get(key, { throwOnError: true, localOnly: true });
  if (!isCurrent()) return { status: 'superseded', verified: false };
  if (JSON.stringify(saved) !== expected) fail('storage-readback-mismatch', 'The saved snapshot could not be verified.');
  return { status: 'saved', verified: true, verifiedAt: new Date().toISOString(), snapshot: saved };
};

 // A baseline belongs to one tab. Merge only edits made since that baseline;
// another tab's untouched fields (and independently edited rows) stay current.
const _learnerWorkRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const _learnerWorkEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const _learnerWorkCopy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const mergeLearnerWorkSnapshots = (baseline, local, saved, conflictChoice = 'local') => {
  const conflicts = [];
  const rows = value => Array.isArray(value) && value.every(row => _learnerWorkRecord(row) && typeof row.id === 'string' && row.id)
    && new Set(value.map(row => row.id)).size === value.length;
  const merge = (base, mine, theirs, path) => {
    if (_learnerWorkEqual(mine, base) || _learnerWorkEqual(mine, theirs)) return { value: theirs, base: theirs };
    if (_learnerWorkEqual(theirs, base)) return { value: mine, base: theirs };
    if (_learnerWorkRecord(mine) && _learnerWorkRecord(theirs) && (base === undefined || _learnerWorkRecord(base))) {
      const value = {}, nextBase = {};
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(mine), ...Object.keys(theirs)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        const child = merge(base?.[key], mine[key], theirs[key], path.concat(key));
        if (child.value !== undefined) value[key] = child.value;
        if (child.base !== undefined) nextBase[key] = child.base;
      }
      return { value, base: nextBase };
    }
    if (rows(mine) && rows(theirs) && (base === undefined || rows(base))) {
      const byId = list => Object.fromEntries((list || []).map(row => [row.id, row]));
      const child = merge(byId(base), byId(mine), byId(theirs), path.concat('$rows'));
      const order = list => (list || []).map(row => row.id);
      const desired = _learnerWorkEqual(order(mine), order(base)) ? order(theirs) : order(mine);
      const arrange = map => [...new Set([...desired, ...order(theirs), ...Object.keys(map)])].filter(id => map[id] !== undefined).map(id => map[id]);
      return { value: arrange(child.value), base: arrange(child.base) };
    }
    conflicts.push({ path, mine: _learnerWorkCopy(mine), saved: _learnerWorkCopy(theirs), deleted: theirs === undefined });
    return conflictChoice === 'saved' ? { value: theirs, base: theirs } : { value: mine, base };
  };
  const result = merge(baseline || {}, local || {}, saved || {}, []);
  return { snapshot: _learnerWorkCopy(result.value), baseline: _learnerWorkCopy(result.base), conflicts };
};
const withLearnerWorkLock = async (key, operation) => {
  const locks = typeof navigator !== 'undefined' && navigator.locks;
  if (!locks || typeof locks.request !== 'function') throw new Error('Coordinated device saving is unavailable. Keep this page open and download your work.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await locks.request('alloflow:learner-work:' + key, { mode: 'exclusive', signal: controller.signal }, async () => {
      clearTimeout(timeout);
      return operation();
    });
  } finally { clearTimeout(timeout); }
};
const createLearnerWorkSession = ({ storage, key = 'allo_student_work', withLock = withLearnerWorkLock, onChange = () => {}, onSaved = () => {} }) => {
  let baseline = {}, current = {}, initialized = false, conflicts = [], compared = null, queue = Promise.resolve();
  const read = async () => {
    const saved = await storage.get(key, { throwOnError: true, localOnly: true });
    if (saved !== null && saved !== undefined && !_learnerWorkRecord(saved)) throw new Error('Saved student work is not a response map.');
    return saved || {};
  };
  const publish = (previous, status, reason = '') => {
    const state = { previous, snapshot: _learnerWorkCopy(current), status, conflicts: _learnerWorkCopy(conflicts), reason };
    onChange(state); return state;
  };
  const advance = (saved, previous = current, choice = 'local') => {
    const merged = mergeLearnerWorkSnapshots(baseline, current, saved, choice);
    baseline = merged.baseline; current = merged.snapshot; conflicts = merged.conflicts;
    compared = conflicts.length ? _learnerWorkCopy(saved) : null;
    return { previous, merged };
  };
  const atPath = (value, path) => path.reduce((node, part) => part === '$rows' && Array.isArray(node)
    ? Object.fromEntries(node.map(row => [row.id, row])) : node?.[part], value);
  const replacePath = (value, path, replacement) => {
    if (!path.length) return _learnerWorkCopy(replacement);
    if (path[0] === '$rows') {
      const list = Array.isArray(value) ? _learnerWorkCopy(value) : [], id = path[1];
      const index = list.findIndex(row => row.id === id);
      const row = replacePath(index < 0 ? { id } : list[index], path.slice(2), replacement);
      if (row === undefined) return list.filter(item => item.id !== id);
      if (index < 0) list.push(row); else list[index] = row;
      return list;
    }
    const result = _learnerWorkRecord(value) ? _learnerWorkCopy(value) : {};
    const child = replacePath(result[path[0]], path.slice(1), replacement);
    if (child === undefined) delete result[path[0]]; else result[path[0]] = child;
    return result;
  };
  const run = (write, isCurrent, resolution) => {
    // A queued refresh may update the displayed comparison after the click.
    // Only the comparison actually approved at invocation authorizes a choice.
    const decisionComparison = resolution ? _learnerWorkCopy(compared) : null;
    const decisionLocal = resolution ? _learnerWorkCopy(current) : null;
    const decisionPaths = new Set(resolution ? conflicts.map(conflict => JSON.stringify(conflict.path)) : []);
    const operation = async () => {
      if (!initialized || !isCurrent()) return { status: 'superseded' };
      try {
        return await withLock(key, async () => {
          if (!isCurrent()) return { status: 'superseded' };
          const saved = await read();
          if (!isCurrent()) return { status: 'superseded' };
          const previous = _learnerWorkCopy(current);
          const merged = mergeLearnerWorkSnapshots(baseline, current, saved, resolution === 'saved' ? 'saved' : 'local');
          const changedAgain = !!resolution && merged.conflicts.some(conflict => !decisionComparison || !decisionPaths.has(JSON.stringify(conflict.path))
            || !_learnerWorkEqual(atPath(decisionComparison, conflict.path), atPath(saved, conflict.path))
            || !_learnerWorkEqual(atPath(decisionLocal, conflict.path), atPath(current, conflict.path)));
          if (merged.conflicts.length && (!write || !resolution || changedAgain)) {
            advance(saved, previous);
            return publish(previous, 'conflict', changedAgain ? 'changed-again' : '');
          }
          if (!write) {
            advance(saved, previous);
            return publish(previous, _learnerWorkEqual(current, baseline) ? 'saved' : 'saving');
          }
          if (!isCurrent()) return { status: 'superseded' };
          // A started write cannot be cancelled. Verify its receipt even if a
          // workspace reset retires the UI owner while storage is awaiting.
          const receipt = await writeVerifiedStorageSnapshot(storage, key, merged.snapshot);
          if (receipt.status !== 'saved') return { status: 'superseded' };
          // Typing while the write is pending is a new edit, never part of its receipt.
          const afterWrite = mergeLearnerWorkSnapshots(previous, current, receipt.snapshot);
          baseline = afterWrite.baseline; current = afterWrite.snapshot; conflicts = afterWrite.conflicts;
          compared = conflicts.length ? _learnerWorkCopy(receipt.snapshot) : null;
          onSaved();
          if (!isCurrent()) return { status: 'superseded' };
          return publish(previous, conflicts.length ? 'conflict' : _learnerWorkEqual(current, baseline) ? 'saved' : 'saving');
        });
      } catch (error) {
        if (!isCurrent()) return { status: 'superseded' };
        publish(_learnerWorkCopy(current), 'error');
        throw error;
      }
    };
    const pending = queue.catch(() => {}).then(operation); queue = pending; return pending;
  };
  return {
    hydrate(saved, local = {}) {
      baseline = {}; current = _learnerWorkCopy(local); initialized = true;
      advance(saved || {});
      return publish(local, conflicts.length ? 'conflict' : _learnerWorkEqual(current, baseline) ? 'saved' : 'saving');
    },
    stage(snapshot) {
      const next = _learnerWorkCopy(snapshot || {});
      // Once a conflict is visible, clearing back to the old baseline is an
      // explicit new edit, not permission to replace it with the remote value.
      for (const conflict of conflicts) {
        const before = atPath(current, conflict.path), after = atPath(next, conflict.path);
        if (!_learnerWorkEqual(before, after)) baseline = replacePath(baseline, conflict.path, before);
      }
      current = next;
    },
    state() { return { snapshot: _learnerWorkCopy(current), baseline: _learnerWorkCopy(baseline), conflicts: _learnerWorkCopy(conflicts), initialized }; },
    refresh: (isCurrent = () => true) => run(false, isCurrent),
    save: (isCurrent = () => true, resolution) => run(true, isCurrent, resolution),
  };
};


// RFC 9110 Retry-After accepts either delta-seconds or an HTTP date. Keep the
// raw header out of every return value: callers get numeric, bounded metadata.
const parseProviderRetryAfter = (value, nowMs = Date.now(), maxDelayMs = PROVIDER_RETRY_AFTER_MAX_MS) => {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  const numeric = /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
  const rawDelayMs = Number.isFinite(numeric) ? numeric * 1000 : Date.parse(text) - Number(nowMs);
  if (!Number.isFinite(rawDelayMs)) return null;
  const normalizedRawMs = Math.max(0, Math.ceil(rawDelayMs));
  const capMs = Math.max(0, Number.isFinite(Number(maxDelayMs)) ? Number(maxDelayMs) : PROVIDER_RETRY_AFTER_MAX_MS);
  const delayMs = Math.min(normalizedRawMs, capMs);
  return {
    delayMs,
    retryAfterSec: Math.ceil(delayMs / 1000),
    exceedsRetryWindow: normalizedRawMs > capMs,
  };
};

// Shared workflow policy. The returned object is safe to persist or emit as
// telemetry: it never includes Error.message, response bodies, URLs, prompts,
// keys, filenames, or arbitrary provider codes.
const classifyProviderError = (error) => {
  const err = error && typeof error === 'object' ? error : {};
  const message = String(err.message || error || '').toLowerCase();
  const nested = err.classification && typeof err.classification === 'object' ? err.classification : {};
  const rawStatus = err.httpStatus != null ? err.httpStatus : (err.status != null ? err.status : err.statusCode);
  const httpStatus = Number.isFinite(Number(rawStatus))
    ? Math.max(0, Math.min(999, Math.round(Number(rawStatus)))) : null;
  const rawRetryMs = err.retryAfterMs != null
    ? Number(err.retryAfterMs)
    : (err.retryAfterSec != null ? Number(err.retryAfterSec) * 1000 : NaN);
  const retryAfterMs = Number.isFinite(rawRetryMs)
    ? Math.max(0, Math.min(PROVIDER_RETRY_AFTER_MAX_MS, Math.ceil(rawRetryMs))) : null;
  const isAbort = err.name === 'AbortError' || err.code === 'ABORT_ERR'
    || /\babort(?:ed)?\b|\bcancel(?:led|ed)?\b/.test(message);
  const perDay = nested.perDay === true || err.quotaScope === 'daily'
    || /per[ -]?day|daily (?:quota|limit)|\brpd\b|requests? per day|day limit|monthly (?:quota|limit)|billing|credit balance|hard limit|insufficient[_ -]?quota/.test(message);
  const perMinute = nested.perMinute === true || err.quotaScope === 'minute'
    || /per[ -]?minute|\brpm\b|\btpm\b|requests? per minute|tokens? per minute/.test(message)
    || ((httpStatus === 429 || err.isQuota === true || err.isRateLimited === true) && retryAfterMs != null);
  const quotaSignal = nested.kind === 'quota' || err.isQuota === true || err.isRateLimited === true
    || httpStatus === 429
    || /api_quota_exhausted|resource_exhausted|quota exceeded|quota exhausted|\b429\b|rate[ _-]?limit/.test(message);
  const authSignal = nested.kind === 'auth' || err.isAuth === true || httpStatus === 401 || httpStatus === 403
    || /api_auth_failed|unauthenticated|unauthorized|forbidden|api[ _-]?key|permission denied|credential/.test(message);
  const configSignal = nested.kind === 'config' || err.isConfig === true || err.isConfigState === true
    || /api_model_not_found|not configured|configuration|unknown resource type|\bunsupported\b|model not found|invalid_argument|not loaded|no source/.test(message);
  const outputSignal = /unusable|malformed|invalid output|invalid json|parse failure|schema validation/.test(message);
  const policySignal = nested.kind === 'refusal'
    || /safety|content blocked|generation blocked|policy block|model refusal/.test(message);
  const timeoutSignal = /timeout|timed out|etimedout|408/.test(message);
  const transientSignal = timeoutSignal || httpStatus === 502 || httpStatus === 503 || httpStatus === 504
    || /temporar|network|failed to fetch|connection|overload|service unavailable/.test(message);

  let kind = 'unknown';
  let category = 'unknown';
  let quotaScope = 'none';
  let retryable = true;
  let delayMs = 800;
  if (isAbort) {
    kind = 'abort'; category = 'configuration'; retryable = false; delayMs = 0;
  } else if (quotaSignal && perDay) {
    kind = 'quota-daily'; category = 'configuration'; quotaScope = 'daily'; retryable = false; delayMs = 0;
  } else if (quotaSignal && perMinute) {
    kind = 'rate-limit'; category = 'transient'; quotaScope = 'minute'; retryable = true;
    delayMs = retryAfterMs != null ? retryAfterMs : 60000;
  } else if (quotaSignal && /rate[ _-]?limit/.test(message)) {
    kind = 'rate-limit'; category = 'transient'; quotaScope = 'minute'; retryable = true;
    delayMs = retryAfterMs != null ? retryAfterMs : 60000;
  } else if (quotaSignal) {
    // RESOURCE_EXHAUSTED without scope can mean either a minute bucket or a
    // daily budget. The transport already made its bounded inner attempts.
    kind = 'quota-unknown'; category = 'configuration'; quotaScope = 'unknown'; retryable = false; delayMs = 0;
  } else if (authSignal) {
    kind = 'auth'; category = 'configuration'; retryable = false; delayMs = 0;
  } else if (policySignal) {
    kind = 'policy'; category = 'configuration'; retryable = false; delayMs = 0;
  } else if (configSignal || outputSignal || err.isFatal === true) {
    kind = outputSignal ? 'invalid-output' : 'configuration';
    category = 'configuration'; retryable = false; delayMs = 0;
  } else if (transientSignal) {
    kind = timeoutSignal ? 'timeout' : (httpStatus && httpStatus >= 500 ? 'service-unavailable' : 'network');
    category = 'transient'; retryable = true; delayMs = retryAfterMs != null ? retryAfterMs : 1500;
  }
  return Object.freeze({
    schemaVersion: 1,
    kind,
    category,
    retryable,
    delayMs: Math.max(0, Math.min(PROVIDER_RETRY_AFTER_MAX_MS, Math.round(delayMs))),
    quotaScope,
    httpStatus,
    retryAfterMs,
  });
};

const getProviderErrorSafeFields = (error) => {
  const policy = error && error.schemaVersion === 1 && typeof error.kind === 'string'
    ? error : classifyProviderError(error);
  return {
    schemaVersion: 1,
    kind: policy.kind,
    category: policy.category,
    retryable: policy.retryable === true,
    quotaScope: policy.quotaScope,
    httpStatus: policy.httpStatus == null ? null : policy.httpStatus,
    retryAfterMs: policy.retryAfterMs == null ? null : policy.retryAfterMs,
  };
};

const fetchWithExponentialBackoff = async (url, options = {}, maxRetries = 5, perRequestTimeoutMs = 120000, telemetry = null) => {
  // Per-request timeout (2026-06-16). The retry cap below only fires when a request FAILS.
  // A request the server accepts but never answers (no response, no error) would otherwise
  // hang this await FOREVER — which silently wedged whole remediation sections ("stuck
  // Fixing…", spinner never clears, no error toast) whenever one AI call never settled. Bound
  // every attempt with an AbortController so a dead request rejects → retries → and ultimately
  // throws, letting callers fail-soft (e.g. the per-section deterministic-only fallback) instead
  // of hanging. The timeout is generous (no legitimate call takes this long) — it only breaks
  // true hangs. We compose with the caller's signal so an explicit Stop still cancels instantly
  // and is NOT retried (a caller abort is final; our own timeout is transient).
  const callerSignal = options.signal || null;
  // Authorization is checked at actual dispatch, including retries. Capture
  // the guard so a later options mutation cannot remove it, and never forward
  // this application-only callback to native fetch.
  const beforeRequest = options.beforeRequest;
  const nativeOptions = { ...options };
  delete nativeOptions.beforeRequest;
  const _managedRequestBlocked = () => {
    const error = new Error('Managed AI policy blocked this request.');
    error.code = 'managed-ai-blocked'; error.isFatal = true; return error;
  };
  const _safeUrl = String(url).split('?')[0]; // redact ?key=… from error messages (own-key/self-hosted users land in error reports)
  const _notify = (name, info) => {
    try { if (telemetry && typeof telemetry[name] === 'function') telemetry[name](info); } catch (_) {}
  };
  const _abortError = () => {
    const error = new Error('Request aborted by caller');
    error.name = 'AbortError';
    error.isFatal = true;
    return error;
  };
  const _waitAbortably = (delayMs) => new Promise((resolve, reject) => {
    let timer = null;
    const cleanup = () => {
      if (callerSignal) { try { callerSignal.removeEventListener('abort', onAbort); } catch (_) {} }
    };
    const onAbort = () => {
      if (timer) clearTimeout(timer);
      cleanup();
      reject(_abortError());
    };
    if (callerSignal && callerSignal.aborted) return onAbort();
    if (callerSignal) { try { callerSignal.addEventListener('abort', onAbort, { once: true }); } catch (_) {} }
    timer = setTimeout(() => { cleanup(); resolve(); }, Math.max(0, delayMs));
  });
  for (let i = 0; i < maxRetries; i++) {
    _notify('onInnerAttempt', { attempt: i + 1, maxRetries, url: _safeUrl });
    const _timeoutCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    let _timedOut = false;
    let _timer = null;
    let _retryAfter = null;
    let _guardRejected = false;
    const _onCallerAbort = () => { if (_timeoutCtrl) { try { _timeoutCtrl.abort(); } catch (_) {} } };
    if (_timeoutCtrl) {
      _timer = setTimeout(() => { _timedOut = true; try { _timeoutCtrl.abort(); } catch (_) {} }, perRequestTimeoutMs);
      if (callerSignal) {
        if (callerSignal.aborted) { try { _timeoutCtrl.abort(); } catch (_) {} }
        else { try { callerSignal.addEventListener('abort', _onCallerAbort); } catch (_) {} }
      }
    }
    try {
      const init = _timeoutCtrl ? { ...nativeOptions, signal: _timeoutCtrl.signal } : { ...nativeOptions };
      if (beforeRequest !== undefined) {
        try {
          if (typeof beforeRequest !== 'function') throw _managedRequestBlocked();
          const result = beforeRequest();
          if (result && typeof result.then === 'function') {
            Promise.resolve(result).catch(() => {});
            throw _managedRequestBlocked();
          }
          if (result !== undefined && result !== true) throw _managedRequestBlocked();
        } catch (error) { _guardRejected = true; throw error; }
      }
      const response = await fetch(url, init);
      // Retry-After (2026-08-15): when a rate limiter says HOW LONG, that number is the single most
      // valuable diagnostic in the log — it separates "server-directed backoff" from guessing, and
      // the 2026-08-14 investigation had to infer the refill rate from success timestamps because
      // nothing captured this header. Delta-seconds or HTTP-date per RFC 9110; normalized to whole
      // seconds-from-now. A number, never text — safe for the pasteable log.
      try {
        const _ra = (!response.ok && response.headers && typeof response.headers.get === 'function') ? response.headers.get('retry-after') : null;
        _retryAfter = parseProviderRetryAfter(_ra);
      } catch (_) {}
      _notify('onInnerResponse', {
        attempt: i + 1,
        maxRetries,
        status: response.status,
        ok: response.ok,
        retryAfterSec: _retryAfter ? _retryAfter.retryAfterSec : null,
        retryAfterCapped: !!(_retryAfter && _retryAfter.exceedsRetryWindow),
        url: _safeUrl,
      });
      if (response.ok) {
        return response;
      }
      if (response.status !== 429 && response.status !== 503) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        if (response.status === 403) {
          errorMessage = `${response.status} Forbidden: API access denied. Check your API key and permissions.`;
        } else if (response.status === 401) {
          // 401 = bad/expired/missing credentials. Retrying with the identical key cannot
          // succeed; the old code lumped 401 in with 429/503 and retried it through the full
          // exponential backoff (~31s of dead-wait per call) before finally failing — the
          // "freezes then fails" symptom of a misconfigured key. Fail fast so the caller can
          // surface an honest auth error immediately.
          errorMessage = `401 Unauthorized: API authentication failed. Check your API key.`;
        }
        const error = new Error(errorMessage);
        error.isFatal = true;
        if (response.status === 401) error.isAuth = true;
        // Numeric evidence for the layers above: the classifier re-wraps this error and its
        // message alone cannot distinguish 401 from 403, nor carry the server's Retry-After.
        error.httpStatus = response.status;
        if (_retryAfter) {
          error.retryAfterSec = _retryAfter.retryAfterSec;
          error.retryAfterMs = _retryAfter.delayMs;
        }
        throw error;
      }
      if (response.status === 429 || response.status === 503) {
        if (i < maxRetries - 1) _notify('onInnerRetry', { attempt: i + 1, nextAttempt: i + 2, status: response.status });
        warnLog(`⚠️ Transient API error ${response.status}, retrying (${i+1}/${maxRetries})...`);
        if (i === maxRetries - 1) {
          const _exhausted = new Error(`HTTP ${response.status} — Failed to fetch ${_safeUrl} after ${maxRetries} retries.`);
          _exhausted.httpStatus = response.status;
          _exhausted.isRateLimited = response.status === 429;
          _exhausted.providerErrorKind = response.status === 429 ? 'rate-limit' : 'service-unavailable';
          if (_retryAfter) {
            _exhausted.retryAfterSec = _retryAfter.retryAfterSec;
            _exhausted.retryAfterMs = _retryAfter.delayMs;
          }
          throw _exhausted;
        }
      }
    } catch (error) {
      if (_guardRejected) {
        if (error && error.name === 'AbortError') throw _abortError();
        throw _managedRequestBlocked();
      }
      if (error && error.code === 'managed-ai-blocked') throw _managedRequestBlocked();
      const _errorPolicy = classifyProviderError(error);
      _notify('onInnerError', {
        attempt: i + 1,
        errorClass: _timedOut ? 'timeout' : _errorPolicy.kind,
        ...getProviderErrorSafeFields(_errorPolicy),
      });
      // Caller-initiated abort (e.g. the user pressed Stop): propagate immediately and NEVER
      // retry — re-issuing a request the caller explicitly cancelled is wrong (and would burn
      // another quota slice). Surfaced as a named AbortError so callGemini stops cleanly.
      if (callerSignal && callerSignal.aborted) {
        throw _abortError();
      }
      // Our own per-request timeout: the request hung. Treat as transient (a retry may settle);
      // on the final attempt, surface an honest timeout error instead of hanging forever.
      if (_timedOut || (error && error.name === 'AbortError')) {
        if (i < maxRetries - 1) _notify('onInnerRetry', { attempt: i + 1, nextAttempt: i + 2, status: null });
        warnLog(`⚠️ Request timed out after ~${Math.round(perRequestTimeoutMs/1000)}s, retrying (${i+1}/${maxRetries})...`);
        if (i === maxRetries - 1) {
          throw new Error(`Timed out after ${maxRetries} attempt(s) (~${Math.round(perRequestTimeoutMs/1000)}s each) — ${_safeUrl}`);
        }
      } else {
        if (error.isFatal) throw error;
        if (i === maxRetries - 1) {
          throw error;
        }
      }
    } finally {
      if (_timer) clearTimeout(_timer);
      if (callerSignal) { try { callerSignal.removeEventListener('abort', _onCallerAbort); } catch (_) {} }
    }
    // Exponential backoff with jitter to prevent thundering herd on parallel requests
    const baseDelay = Math.pow(2, i) * 1000;
    const jitter = Math.random() * baseDelay * 0.5; // 0-50% random jitter
    const delay = Math.min(PROVIDER_RETRY_AFTER_MAX_MS, Math.max(
      baseDelay + jitter,
      _retryAfter ? _retryAfter.delayMs : 0
    ));
    _notify('onInnerBackoff', {
      attempt: i + 1,
      nextAttempt: i + 2,
      delayMs: Math.round(delay),
      retryAfterSec: _retryAfter ? _retryAfter.retryAfterSec : null,
      retryAfterCapped: !!(_retryAfter && _retryAfter.exceedsRetryWindow),
    });
    warnLog(`[API] Backing off ${Math.round(delay)}ms before retry ${i + 1}...`);
    await _waitAbortably(delay);
  }
  throw new Error(`Failed to fetch ${_safeUrl} after ${maxRetries} retries.`);
};

const isGoogleRedirect = (url) => {
    if (!url) return false;
    return url.includes('google.com/url') || url.includes('google.com/search');
};
const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/)/i.test(url);
};
const fetchAndCleanUrl = async (url, geminiCaller, toastCallback) => {
    if (!url || !url.trim()) return null;
    const blockedImport = () => {
        const error = new Error('External source import is disabled by this managed deployment. Paste approved text or use a school-approved import route.');
        error.code = 'managed-ai-blocked'; error.isFatal = true; return error;
    };
    const assertLegacyImportAllowed = () => {
        try { if (typeof window === 'undefined' || window.ALLOFLOW_MANAGED_AI_POLICY == null) return; } catch (_) {}
        // Version 1 approves selected text inference, not URL disclosure to
        // public relays, URL Context, or video processing. Search permission
        // cannot authorize a different source-import processor.
        throw blockedImport();
    };
    const isManagedImportBlocked = error => error && error.code === 'managed-ai-blocked';
    const statusCode = value => typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : 0;
    const failureCategory = error => error && error.code === 'source-no-transcript' ? 'no-readable-transcript'
        : error && statusCode(error.httpStatus) ? 'http-' + statusCode(error.httpStatus)
        : error && error.name === 'AbortError' ? 'timeout-or-cancelled' : 'source-request-failed';
    const sourceFetch = async (endpoint, options = {}, timeoutMs = 20000) => {
        const init = { ...options, redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
        const controller = timeoutMs > 0 ? new AbortController() : null;
        let timeoutId = null;
        try {
            if (controller) { init.signal = controller.signal; timeoutId = setTimeout(() => controller.abort(), timeoutMs); }
            assertLegacyImportAllowed();
            return await fetch(endpoint, init);
        } finally { if (timeoutId != null) clearTimeout(timeoutId); }
    };
    assertLegacyImportAllowed();
    let targetUrl = url.trim();
    // ─────────────────────────────────────────────────────────────
    // Tier-2 fallback: Gemini URL Context tool
    // Called when Jina + raw-HTML extraction all fail or return garbage.
    // Uses Gemini 3 Flash (or current default) with urlContext enabled.
    // Different IP reputation than Jina — often succeeds where Jina 403s.
    // ─────────────────────────────────────────────────────────────
    const tryGeminiUrlContext = async () => {
        if (!apiKey && !_isCanvasEnv) {
            console.log('[URL Fetch] ⏭️ Gemini URL Context skipped — no API key');
            return null;
        }
        console.log('[URL Fetch] Attempting cloud URL Context fallback');
        const urlCtxEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent`;
        const urlCtxPayload = {
            contents: [{
                parts: [{
                    text: `Read the web page at this URL: ${targetUrl}\n\nTask:\n1. Extract the main body text of the article, lesson, or educational content.\n2. PRESERVE the original wording exactly — do not paraphrase or summarize.\n3. Remove navigational elements, footers, sidebars, ads, cookie banners, and metadata.\n4. If the page is empty, a login screen, or completely inaccessible, return exactly "ERROR: NO_ARTICLE_FOUND".\n5. Return ONLY the cleaned main text (no preamble, no commentary).`
                }]
            }],
            tools: [{ urlContext: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
        };
        try {
            const resp = await sourceFetch(urlCtxEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-goog-api-key': apiKey } : {}) },
                body: JSON.stringify(urlCtxPayload)
            }, 45000);
            if (!resp.ok) {
                console.warn('[URL Fetch] URL Context request rejected', { httpStatus: statusCode(resp.status) });
                return null;
            }
            const data = await resp.json();
            // Check URL retrieval metadata — Gemini tells us whether the URL was actually fetched
            const urlMeta = data?.candidates?.[0]?.urlContextMetadata?.urlMetadata;
            if (Array.isArray(urlMeta) && urlMeta.length > 0) {
                const status = urlMeta[0]?.urlRetrievalStatus;
                console.log('[URL Fetch] URL retrieval result:', status === 'URL_RETRIEVAL_STATUS_SUCCESS' ? 'success' : 'unavailable');
                if (status && status !== 'URL_RETRIEVAL_STATUS_SUCCESS') {
                    console.warn('[URL Fetch] URL retrieval unavailable');
                    return null;
                }
            }
            const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!extracted || extracted.includes('ERROR: NO_ARTICLE_FOUND')) {
                console.warn('[URL Fetch] ❌ Gemini URL Context returned no article');
                return null;
            }
            if (extracted.trim().length < 50) {
                console.warn(`[URL Fetch] ❌ Gemini URL Context returned ${extracted.trim().length} chars — too short`);
                return null;
            }
            console.log(`[URL Fetch] ✅ Gemini URL Context success: ${extracted.length} chars extracted`);
            return extracted.trim();
        } catch (e) {
            if (isManagedImportBlocked(e)) throw e;
            console.warn('[URL Fetch] URL Context failed:', failureCategory(e));
            return null;
        }
    };
    if (isYouTubeUrl(targetUrl)) {
        if (toastCallback) toastCallback("🎬 YouTube detected — extracting transcript via Gemini...", "info");
        try {
            if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
            const ytUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent`;
            const ytPayload = {
                contents: [{
                    parts: [
                        { fileData: { mimeType: "video/*", fileUri: targetUrl } },
                        { text: "Extract the complete spoken transcript from this YouTube video. Return ONLY the transcript text, preserving paragraph breaks. Do not add commentary, timestamps, or section headers — just the spoken words. If the video has no speech, describe the visual content instead." }
                    ]
                }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
            };
            const ytResponse = await sourceFetch(ytUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-goog-api-key': apiKey } : {}) },
                body: JSON.stringify(ytPayload)
            }, 0);
            if (!ytResponse.ok) {
                const error = new Error('Cloud transcript request was rejected.');
                error.code = 'source-transcript-http'; error.httpStatus = statusCode(ytResponse.status); throw error;
            }
            const ytData = await ytResponse.json();
            const transcript = ytData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (transcript && transcript.trim().length > 50) {
                if (toastCallback) toastCallback("✅ YouTube transcript extracted successfully!", "success");
                return `Source: ${targetUrl}\n(YouTube transcript extracted via Gemini AI)\n\n${transcript.trim()}`;
            } else {
                const error = new Error('Transcript too short or empty.'); error.code = 'source-no-transcript'; throw error;
            }
        } catch (ytErr) {
            if (isManagedImportBlocked(ytErr)) throw ytErr;
            warnLog('[YouTube Transcript] Cloud extraction failed; trying standard source import:', failureCategory(ytErr));
            if (toastCallback) toastCallback('YouTube transcript unavailable (' + failureCategory(ytErr) + '). Trying standard source import...', 'warning');
        }
    }
    try {
        if (isGoogleRedirect(targetUrl)) {
            throw new Error("Cannot fetch Google Redirects directly. Please open the link, copy the final URL from the address bar, and paste it here.");
        }
        new URL(targetUrl);
    } catch (e) {
        if (e.message.startsWith("Cannot fetch")) throw e;
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
            try { new URL(targetUrl); } catch (e) {
                throw new Error("Invalid URL format.");
            }
        } else {
            throw new Error("Invalid URL format.");
        }
    }
    try {
        const jinaUrl = `https://r.jina.ai/${targetUrl}`;
        let response;
        let usedRawSource = false;
        // Jina-specific error/rate-limit patterns that indicate we should force raw fallback
        const isJinaGarbage = (t) => {
            if (!t) return true;
            const trimmed = t.trim();
            if (trimmed.length < 500) return true; // short Jina responses are almost always errors or empty shells
            const lower = trimmed.toLowerCase();
            return lower.includes("rate limit") ||
                   lower.includes("too many requests") ||
                   lower.includes("quota exceeded") ||
                   lower.startsWith("warning") ||
                   lower.startsWith("error:") ||
                   (lower.includes("jina") && lower.includes("error"));
        };
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(jinaUrl)}`;
            response = await sourceFetch(proxyUrl);
        } catch (e) {
            if (isManagedImportBlocked(e)) throw e;
            warnLog('Primary source relay failed; trying fallback:', failureCategory(e));
        }
        if (!response || !response.ok) {
            try {
                const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jinaUrl)}&t=${Date.now()}`;
                response = await sourceFetch(fallbackUrl);
            } catch(e) { if (isManagedImportBlocked(e)) throw e; warnLog('Source relay fallback failed:', failureCategory(e)); }
        }
        let text = "";
        if (response && response.ok) {
            text = await response.text();
        }
        debugLog('[URL Fetch] Source relay characters:', text.length);
        const lowerText = text.toLowerCase();
        const isBlocked = lowerText.includes("access denied") ||
                          lowerText.includes("security check") ||
                          lowerText.includes("cloudflare") ||
                          lowerText.includes("captcha") ||
                          lowerText.includes("403 forbidden") ||
                          lowerText.includes("verify you are human");
        // Use the new Jina-garbage detector AND the 500-char raw threshold (was 50 — too permissive)
        if (!response || !response.ok || isBlocked || isJinaGarbage(text)) {
             debugLog(`[URL Fetch] Jina result inadequate (${text.length} chars). Attempting direct raw HTML fetch...`);
             const savedJinaText = text; // preserve in case raw fallback also fails
             let rawOk = false;
             // Try corsproxy.io first
             try {
                 const rawProxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
                 const rawResponse = await sourceFetch(rawProxyUrl);
                 if (rawResponse.ok) {
                     const rawText = await rawResponse.text();
                     if (rawText && rawText.trim().length > 200) {
                         text = rawText;
                         usedRawSource = true;
                         rawOk = true;
                         debugLog(`[URL Fetch] corsproxy raw HTML: ${rawText.length} chars`);
                     }
                 }
             } catch (directErr) {
                 if (isManagedImportBlocked(directErr)) throw directErr;
                 warnLog('[URL Fetch] Raw source relay failed:', failureCategory(directErr));
             }
             // Second raw fallback via allorigins
             if (!rawOk) {
                 try {
                     const rawFallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&t=${Date.now()}`;
                     const rawResponse2 = await sourceFetch(rawFallbackUrl);
                     if (rawResponse2.ok) {
                         const rawText2 = await rawResponse2.text();
                         if (rawText2 && rawText2.trim().length > 200) {
                             text = rawText2;
                             usedRawSource = true;
                             rawOk = true;
                             debugLog(`[URL Fetch] allorigins raw HTML: ${rawText2.length} chars`);
                         }
                     }
                 } catch (e) {
                     if (isManagedImportBlocked(e)) throw e;
                     warnLog('[URL Fetch] Second raw source relay failed:', failureCategory(e));
                 }
             }
             // If both raw fallbacks failed but we had usable-ish Jina text, fall back to it
             if (!rawOk && savedJinaText && savedJinaText.trim().length >= 50) {
                 text = savedJinaText;
                 debugLog(`[URL Fetch] Raw fallbacks failed, reverting to original Jina text (${savedJinaText.length} chars)`);
             }
             if (!rawOk && (!savedJinaText || savedJinaText.trim().length < 50)) {
                 if (isBlocked) throw new Error("URL blocked by security check (CAPTCHA/403). Please paste text manually.");
                 throw new Error('Failed to fetch readable content. The site may require manual text import.');
             }
        }
        const finalLower = text.toLowerCase();
        if (finalLower.includes("access denied") ||
            finalLower.includes("security check") ||
            finalLower.includes("cloudflare") ||
            finalLower.includes("captcha") ||
            finalLower.includes("403 forbidden") ||
            (finalLower.includes("verify") && finalLower.includes("human"))) {
            throw new Error("URL blocked by security check. Please paste text manually.");
        }
        if (!text || text.trim().length < 50) {
            throw new Error('Content too short or empty. Try pasting approved text manually.');
        }
        text = text.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
        text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        text = text.replace(/\[\d+\]/g, '');
        text = text.replace(/^\[.+\]:\s*http.+$/gm, '');
        if (geminiCaller) {
            assertLegacyImportAllowed();
            const cleanPrompt = `
                You are an expert content extractor.
                Analyze the following ${usedRawSource ? 'raw HTML source code' : 'raw text'} extracted from a webpage:
                """
                ${text.substring(0, 50000)}
                """
                Task:
                1. Identify and extract the main body text, list content, or educational summary.
                2. Remove all navigational elements, footers, sidebars, advertisements, and metadata.
                3. PRESERVE the original wording exactly.
                4. Only return "ERROR: NO_ARTICLE_FOUND" if the page is completely empty or a Login Screen.
                Return ONLY the cleaned main text.
            `;
            const cleanedText = await geminiCaller(cleanPrompt);
            if (cleanedText && !cleanedText.includes("ERROR: NO_ARTICLE_FOUND")) {
                text = cleanedText;
            }
        }
        console.log(`[URL Fetch] ✅ Jina path success: ${text.trim().length} chars returned (usedRawSource=${usedRawSource})`);
        return `Source: ${targetUrl}\n\n${text.trim()}`;
    } catch (err) {
        if (isManagedImportBlocked(err)) throw err;
        // ── Tier-2 fallback: Gemini URL Context before giving up ──
        console.warn('[URL Fetch] Standard source import failed; trying URL Context:', failureCategory(err));
        if (toastCallback) toastCallback("Jina failed — trying Gemini URL Context...", "info");
        const geminiExtracted = await tryGeminiUrlContext();
        if (geminiExtracted) {
            if (toastCallback) toastCallback("✅ Content extracted via Gemini URL Context!", "success");
            return `Source: ${targetUrl}\n(Extracted via Gemini URL Context)\n\n${geminiExtracted}`;
        }
        console.error('[URL Fetch] All source import methods failed');
        const error = new Error('Failed to fetch readable content. Paste approved text or use a school-approved import route.');
        error.code = 'source-import-failed';
        if (toastCallback) toastCallback(error.message, 'error');
        throw error;
    }
};

const optimizeImage = (base64Str, maxWidth = 800, quality = 0.9) => {
    return new Promise((resolve) => {
        if (!base64Str || typeof base64Str !== 'string') {
            resolve(base64Str);
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.setAttribute('aria-hidden', 'true');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(optimizedUrl);
            } catch (e) {
                warnLog("Image optimization error:", e);
                resolve(base64Str);
            }
        };
        img.onerror = (e) => {
             warnLog("Image load error during optimization:", e);
             resolve(base64Str);
        };
    });
};

// ─── Inline parametric diagram renderer (shared by MathView + QuizView; roadmap step 2/3) ──
// Pure: {tool,state} → ACCESSIBLE SVG string (role=img + <title>/<desc>, escaped labels) for the
// common quantitative manipulative types. ONE canonical copy here so math + quiz + future surfaces
// never drift. Returns null for unsupported tools / missing state (caller falls back).
function _renderDiagramSvg(tool, state, titleText) {
  if (!tool || !state) return null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var num = function (v, d) { var n = Number(v); return isFinite(n) ? n : d; };
  var unavailable = function(label) {
    var text = esc(label + '. Interactive preview unavailable for this representation.');
    return '<svg viewBox="0 0 420 80" role="img" aria-label="' + text + '" width="100%" style="max-width:460px"><title>' + esc(titleText || label) + '</title><desc>' + text + '</desc><text x="10" y="25" font-size="14">' + esc(label) + '</text><text x="10" y="52" font-size="12">Preview unavailable for this representation.</text></svg>';
  };
  if (tool === 'base10' && state.mode && state.mode !== 'blocks') {
    if (state.mode === 'fracBars') return _renderDiagramSvg('fractions', state, titleText);
    if (state.mode === 'tenFrame' || state.mode === 'counters') {
      var count = state.mode === 'tenFrame' ? Number(state.count) : Math.abs(Number(state.value));
      if (!Number.isInteger(count) || count < 0 || count > 20) return unavailable('Model value ' + (state.count ?? state.value));
      var frame = state.mode === 'tenFrame', slots = frame ? (count > 10 ? 20 : 10) : count, parts = '';
      for (var cell = 0; cell < slots; cell++) {
        var x = 14 + (cell % 5) * 44, y = 14 + Math.floor(cell / 5) * 44;
        if (frame) parts += '<rect x="' + x + '" y="' + y + '" width="44" height="44" fill="white" stroke="#475569"/>';
        if (cell < count) parts += '<circle cx="' + (x+22) + '" cy="' + (y+22) + '" r="15" fill="' + (!frame && state.value < 0 ? '#dc2626' : frame ? '#4f46e5' : '#facc15') + '" stroke="#334155"/>';
        if (!frame && cell < count) parts += '<text x="' + (x+22) + '" y="' + (y+27) + '" text-anchor="middle" fill="' + (state.value < 0 ? 'white' : '#111827') + '">' + (state.value < 0 ? '−' : '+') + '</text>';
      }
      var label = frame ? 'Ten-frame: ' + count : 'Counters: ' + state.value + '. Yellow is positive; red is negative';
      var vh = Math.max(110, Math.ceil(slots / 5) * 44 + 46);
      return '<svg viewBox="0 0 260 ' + vh + '" role="img" aria-label="' + esc(label) + '" width="100%" style="max-width:320px"><title>' + esc(titleText || label) + '</title><desc>' + esc(label) + '</desc>' + parts + '<text x="14" y="' + (vh-12) + '" font-size="14">' + esc(frame ? String(count) : String(state.value)) + '</text></svg>';
    }
    return unavailable('Unsupported manipulative mode');
  }
  if (tool === 'numberline') {
    var range = state.range || {};
    var min = num(range.min, 0), max = num(range.max, 10);
    if (max <= min) max = min + 10;
    var W = 380, padX = 24, axisY = 46;
    var sx = function (v) { return padX + ((num(v, min) - min) / (max - min)) * (W - 2 * padX); };
    var span = max - min;
    var step = span <= 10 ? 1 : span <= 20 ? 2 : span <= 50 ? 5 : Math.ceil(span / 10);
    var ticks = '';
    for (var tv = Math.ceil(min); tv <= max; tv += step) {
      var tx = sx(tv);
      ticks += '<line x1="' + tx + '" y1="' + (axisY - 5) + '" x2="' + tx + '" y2="' + (axisY + 5) + '" stroke="#475569" stroke-width="1.5"/>'
        + '<text x="' + tx + '" y="' + (axisY + 20) + '" font-size="11" fill="#475569" text-anchor="middle">' + esc(tv) + '</text>';
    }
    var markers = '', descParts = [];
    (Array.isArray(state.markers) ? state.markers : []).forEach(function (m) {
      var mv = num(m && m.value, null);
      if (mv == null) return;
      var mx = sx(mv);
      var lbl = (m && m.label) ? String(m.label) : String(mv);
      markers += '<circle cx="' + mx + '" cy="' + axisY + '" r="6" fill="#4f46e5"/>'
        + '<text x="' + mx + '" y="' + (axisY - 12) + '" font-size="11" font-weight="bold" fill="#4f46e5" text-anchor="middle">' + esc(lbl) + '</text>';
      descParts.push(lbl + ' at ' + mv);
    });
    var nlTitle = esc(titleText || 'Number line');
    var nlDesc = esc('Number line from ' + min + ' to ' + max + (descParts.length ? '. Marked: ' + descParts.join(', ') + '.' : '.'));
    return '<svg viewBox="0 0 ' + W + ' 84" role="img" aria-label="' + nlTitle + ': ' + nlDesc + '" width="100%" style="max-width:420px"><title>' + nlTitle + '</title><desc>' + nlDesc + '</desc>'
      + '<line x1="' + padX + '" y1="' + axisY + '" x2="' + (W - padX) + '" y2="' + axisY + '" stroke="#475569" stroke-width="2"/>'
      + ticks + markers + '</svg>';
  }
  if (tool === 'coordinate') {
    var pts = Array.isArray(state.points) ? state.points.filter(function (p) { return p && isFinite(Number(p.x)) && isFinite(Number(p.y)); }) : [];
    var coords = pts.map(function (p) { return Math.abs(Number(p.x)); }).concat(pts.map(function (p) { return Math.abs(Number(p.y)); }));
    var R = coords.length ? Math.max(5, Math.ceil(Math.max.apply(null, coords))) : 10;
    if (R > 20) return unavailable('Coordinates: ' + pts.map(function(p) { return '(' + p.x + ', ' + p.y + ')'; }).join('; '));
    var S = 240, pad = 16, origin = S / 2, unit = (S / 2 - pad) / R;
    var cx = function (x) { return origin + num(x, 0) * unit; };
    var cy = function (y) { return origin - num(y, 0) * unit; };
    var grid = '';
    for (var g = -R; g <= R; g++) {
      grid += '<line x1="' + cx(g) + '" y1="' + pad + '" x2="' + cx(g) + '" y2="' + (S - pad) + '" stroke="#e2e8f0" stroke-width="1"/>'
        + '<line x1="' + pad + '" y1="' + cy(g) + '" x2="' + (S - pad) + '" y2="' + cy(g) + '" stroke="#e2e8f0" stroke-width="1"/>';
    }
    var axes = '<line x1="' + pad + '" y1="' + origin + '" x2="' + (S - pad) + '" y2="' + origin + '" stroke="#475569" stroke-width="1.5"/>'
      + '<line x1="' + origin + '" y1="' + pad + '" x2="' + origin + '" y2="' + (S - pad) + '" stroke="#475569" stroke-width="1.5"/>';
    var plotted = '', cDesc = [];
    pts.forEach(function (p) {
      var px = cx(p.x), py = cy(p.y);
      var plbl = (p.label ? String(p.label) + ' ' : '') + '(' + Number(p.x) + ', ' + Number(p.y) + ')';
      plotted += '<circle cx="' + px + '" cy="' + py + '" r="5" fill="#4f46e5"/>'
        + '<text x="' + (px + 7) + '" y="' + (py - 7) + '" font-size="10" font-weight="bold" fill="#4f46e5">' + esc(plbl) + '</text>';
      cDesc.push(plbl);
    });
    var cTitle = esc(titleText || 'Coordinate grid');
    var cDescStr = esc('Coordinate plane, axes from -' + R + ' to ' + R + (cDesc.length ? '. Points: ' + cDesc.join('; ') + '.' : '.'));
    return '<svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' + cTitle + ': ' + cDescStr + '" width="100%" style="max-width:300px"><title>' + cTitle + '</title><desc>' + cDescStr + '</desc>'
      + grid + axes + plotted + '</svg>';
  }
  if (tool === 'fractions') {
    var fDen = num(state.denominator, 1), fNum = num(state.numerator, 0);
    var fLabel = fNum + '/' + fDen;
    if (!Number.isSafeInteger(fDen) || fDen < 1 || !Number.isSafeInteger(fNum) || fNum < 0 || fNum / fDen > 8) return unavailable('Fraction ' + fLabel);
    var wholes = Math.max(1, Math.ceil(fNum / fDen));
    var fW = 320, fPadX = 10, fBarW = 300, fpw = fBarW / fDen, fCells = '';
    for (var whole = 0; whole < wholes; whole++) {
      var shaded = Math.min(fDen, Math.max(0, fNum - whole * fDen)), y = 12 + whole * 50;
      if (fDen <= 64) {
        for (var fi = 0; fi < fDen; fi++) fCells += '<rect x="' + (fPadX + fi * fpw) + '" y="' + y + '" width="' + fpw + '" height="38" fill="' + (fi < shaded ? '#4f46e5' : '#ffffff') + '" stroke="#475569" stroke-width="1.5"/>';
      } else {
        fCells += '<rect x="10" y="' + y + '" width="300" height="38" fill="#ffffff" stroke="#475569"/>'
          + (shaded > 0 ? '<rect x="10" y="' + y + '" width="' + (fBarW * shaded / fDen) + '" height="38" fill="#4f46e5"/>' : '');
      }
    }
    var frTitle = esc(titleText || ('Fraction ' + fLabel));
    var frDesc = esc(fNum + ' parts shaded, with ' + fDen + ' equal parts per whole (' + fLabel + ').');
    var height = wholes * 50 + 28;
    return '<svg viewBox="0 0 320 ' + height + '" role="img" aria-label="' + frTitle + ': ' + frDesc + '" width="100%" style="max-width:360px"><title>' + frTitle + '</title><desc>' + frDesc + '</desc>' + fCells
      + '<text x="160" y="' + (height - 8) + '" font-size="14" font-weight="bold" fill="#4f46e5" text-anchor="middle">' + esc(fLabel) + '</text></svg>';
  }
  if (tool === 'base10') {
    var bH = Math.max(0, Math.round(num(state.hundreds, 0))), bT = Math.max(0, Math.round(num(state.tens, 0))), bO = Math.max(0, Math.round(num(state.ones, 0)));
    var bK = num(state.thousands, 0);
    if (!['thousands', 'hundreds', 'tens', 'ones'].every(function(key) { var count = num(state[key], 0); return Number.isSafeInteger(count) && count >= 0 && count <= 20; })) return unavailable('Base ten: ' + ['thousands', 'hundreds', 'tens', 'ones'].map(function(key) { return num(state[key], 0) + ' ' + key; }).join(', '));
    var bu = 10, bx = 8, by0 = 8, bParts = '';
    for (var bki = 0; bki < bK; bki++) {
      bParts += '<rect x="' + bx + '" y="8" width="50" height="50" fill="#fbcfe8" stroke="#9d174d" stroke-width="2"/><text x="' + (bx + 25) + '" y="38" font-size="12" text-anchor="middle">1000</text>';
      bx += 60;
    }
    for (var bhi = 0; bhi < bH; bhi++) {
      bParts += '<rect x="' + bx + '" y="' + by0 + '" width="' + (bu * 10) + '" height="' + (bu * 10) + '" fill="#c7d2fe" stroke="#4f46e5" stroke-width="1.5"/>';
      for (var bk = 1; bk < 10; bk++) bParts += '<line x1="' + (bx + bk * bu) + '" y1="' + by0 + '" x2="' + (bx + bk * bu) + '" y2="' + (by0 + bu * 10) + '" stroke="#4f46e5" stroke-width="0.4"/><line x1="' + bx + '" y1="' + (by0 + bk * bu) + '" x2="' + (bx + bu * 10) + '" y2="' + (by0 + bk * bu) + '" stroke="#4f46e5" stroke-width="0.4"/>';
      bx += bu * 10 + 10;
    }
    for (var bti = 0; bti < bT; bti++) {
      bParts += '<rect x="' + bx + '" y="' + by0 + '" width="' + bu + '" height="' + (bu * 10) + '" fill="#a5b4fc" stroke="#4f46e5" stroke-width="1"/>';
      for (var bk2 = 1; bk2 < 10; bk2++) bParts += '<line x1="' + bx + '" y1="' + (by0 + bk2 * bu) + '" x2="' + (bx + bu) + '" y2="' + (by0 + bk2 * bu) + '" stroke="#4f46e5" stroke-width="0.4"/>';
      bx += bu + 4;
    }
    bx += 8;
    for (var boi = 0; boi < bO; boi++) { bParts += '<rect x="' + bx + '" y="' + by0 + '" width="' + bu + '" height="' + bu + '" fill="#818cf8" stroke="#4f46e5" stroke-width="1"/>'; bx += bu + 3; }
    var bTotal = bK * 1000 + bH * 100 + bT * 10 + bO, bVW = Math.max(bx + 8, 80);
    var bTitle = esc(titleText || ('Base-ten blocks showing ' + bTotal));
    var bDesc = esc(bK + ' thousands, ' + bH + ' hundreds, ' + bT + ' tens, ' + bO + ' ones = ' + bTotal + '.');
    return '<svg viewBox="0 0 ' + bVW + ' 120" role="img" aria-label="' + bTitle + ': ' + bDesc + '" width="100%" style="max-width:' + Math.min(bVW, 460) + 'px"><title>' + bTitle + '</title><desc>' + bDesc + '</desc>' + bParts + '<text x="8" y="118" font-size="12">' + esc(bTotal) + '</text></svg>';
  }
  if (tool === 'protractor') {
    var pAng = num(state.angle, 45);
    if (pAng < 0 || pAng > 360) return unavailable('Angle ' + pAng + ' degrees');
    var pRad = pAng * Math.PI / 180, pvx = 100, pvy = 110, pLen = 84;
    var pex = (pvx + pLen * Math.cos(pRad)).toFixed(1), pey = (pvy - pLen * Math.sin(pRad)).toFixed(1);
    var prTitle = esc(titleText || (pAng + ' degree angle'));
    var prDesc = esc('An angle of ' + pAng + ' degrees between a horizontal ray and a second ray.');
    return '<svg viewBox="0 0 220 220" role="img" aria-label="' + prTitle + ': ' + prDesc + '" width="100%" style="max-width:240px"><title>' + prTitle + '</title><desc>' + prDesc + '</desc>'
      + '<line x1="' + pvx + '" y1="' + pvy + '" x2="' + (pvx + pLen) + '" y2="' + pvy + '" stroke="#475569" stroke-width="2"/>'
      + '<line x1="' + pvx + '" y1="' + pvy + '" x2="' + pex + '" y2="' + pey + '" stroke="#4f46e5" stroke-width="2"/>'
      + (pAng === 360 ? '<circle cx="' + pvx + '" cy="' + pvy + '" r="32" fill="none" stroke="#4f46e5"/>' : pAng > 0 ? '<path d="M ' + (pvx + 32) + ' ' + pvy + ' A 32 32 0 ' + (pAng > 180 ? 1 : 0) + ' 0 ' + (pvx + 32 * Math.cos(pRad)) + ' ' + (pvy - 32 * Math.sin(pRad)) + '" fill="none" stroke="#4f46e5"/>' : '')
      + '<circle cx="' + pvx + '" cy="' + pvy + '" r="3" fill="#475569"/>'
      + '<text x="' + (pvx + 30) + '" y="' + (pvy - 14) + '" font-size="14" font-weight="bold" fill="#4f46e5">' + esc(pAng + '°') + '</text></svg>';
  }
  return null;
}


// Persist only source identities and fingerprints; never a second copy of lesson text.
// A Unit Path follow-up stamps window.__alloPendingUnitPathNode and then hands
// the user back to source input; it does not generate anything itself. BOTH
// lesson-plan buttons must therefore consume that stamp: the dispatcher (Full
// Pack / guided) and the sidebar button. The sidebar route previously ignored
// it, so the plan the user actually asked for went unstamped AND the global
// survived to attach itself to a later, unrelated plan.
//
// The setter records `since` and `priorPlanId` so staleness is judgeable;
// neither was ever read. A stamp older than this window is dropped rather than
// applied -- an abandoned follow-up must not relabel a plan made days later.
const _ALLO_UNIT_PATH_STAMP_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Returns the normalized unitPath record to write onto a plan, or null. Always
// clears the global when a stamp is present -- including a stale one, which is
// consumed and discarded so it cannot linger for the next plan.
const consumePendingUnitPathNode = (now = Date.now()) => {
  let pending = null;
  try {
    pending = typeof window !== 'undefined' ? window.__alloPendingUnitPathNode : null;
  } catch (_) { return null; }
  if (!pending || typeof pending !== 'object' || !pending.nodeId) return null;
  try { delete window.__alloPendingUnitPathNode; } catch (_) {}
  const since = Number(pending.since);
  if (Number.isFinite(since) && (now - since) > _ALLO_UNIT_PATH_STAMP_MAX_AGE_MS) return null;
  return {
    graphId: String(pending.graphId || ''),
    nodeId: String(pending.nodeId),
    label: String(pending.label || '').slice(0, 400),
    title: String(pending.title || '').slice(0, 300),
    index: Number.isFinite(Number(pending.index)) ? Number(pending.index) : null,
    count: Number.isFinite(Number(pending.count)) ? Number(pending.count) : null
  };
};

const capturePlanningInputs = (options = {}) => {
  const { context = '', segments = [], suppliedContext = context, mode = 'teacher', route = 'sidebar',
    local = false, inventoryText = '', inventory = [], inventorySupplied = false, inventoryTraced = true } = options;
  const api = window.AlloModules && window.AlloModules.ResourceContentFingerprint;
  const fingerprint = value => api && typeof api.fingerprint === 'function' ? api.fingerprint(value) : null;
  // Match localExcerpt's current projection exactly, including its existing escape semantics.
  const normalize = text => local ? String(text || '').replace(/\\s+\\n/g, '\\n').trim() : String(text || '');
  const projected = normalize(context);
  const consumed = local ? projected.slice(0, 6500).trim() : projected;
  let cursor = 0;
  const summaries = [];
  for (const segment of segments) {
    const text = normalize(segment.text).trim();
    if (!text) continue;
    const start = projected.indexOf(text, cursor);
    if (start < 0) continue;
    cursor = start + text.length;
    const part = consumed.slice(start, Math.min(cursor, consumed.length));
    if (!part) continue;
    summaries.push({
      id: segment.id == null ? null : String(segment.id),
      title: String(segment.title || segment.kind || 'Planning input'),
      type: String(segment.type || 'source-input'), kind: String(segment.kind || 'context'),
      characters: part.length, partial: part.length < text.length, fingerprint: fingerprint(part)
    });
  }
  return {
    version: 1, mode, route, projection: local ? 'local-excerpt-v1' : 'context-v1',
    capturedAt: new Date().toISOString(), contextCharacters: String(suppliedContext).length,
    contextFingerprint: fingerprint(String(suppliedContext)), summaries,
    traceComplete: segments.length > 0 || !String(context).trim(),
    inventoryStatus: !inventorySupplied ? 'not-supplied' : inventoryTraced ? 'recorded' : 'untraced',
    inventoryFingerprint: inventorySupplied ? fingerprint(String(inventoryText)) : null,
    inventory: inventorySupplied && inventoryTraced ? inventory.map(item => ({
      id: item.id == null ? null : String(item.id), title: String(item.title || 'Untitled Resource'),
      type: String(item.type || 'resource'), fingerprint: fingerprint(String(item.text || ''))
    })) : []
  };
};


// Compare each recorded contribution against that same resource, never today's latest
// resource of a type. Reading selection depends on origin/role settings not in v1.
const getPlanningInputStatus = (record, history) => {
  const unavailable = () => ({ status: 'unavailable', summaries: [], inventory: [] });
  if (!record || record.version !== 1 || !['teacher', 'study', 'family'].includes(record.mode)
      || !['context-v1', 'local-excerpt-v1'].includes(record.projection)
      || !Array.isArray(record.summaries) || !Array.isArray(record.inventory)) return unavailable();
  const modules = window.AlloModules || {};
  const hash = modules.ResourceContentFingerprint?.fingerprint;
  const byId = new Map();
  const idOf = value => typeof value === 'string' && value.trim() ? value
    : typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
  if (Array.isArray(history)) history.forEach(item => {
    const id = idOf(item?.id);
    if (id !== null) byId.set(id, [...(byId.get(id) || []), item]);
  });
  const kinds = {
    'Analysis summary': 'analysis', 'Target standards': 'alignment-report',
    'Vocabulary terms': 'glossary', 'Visual support summary': 'image',
    'Assessment summary': 'quiz', 'Writing scaffold summary': 'sentence-frames',
    'Sequence summary': 'timeline', 'Concept sort summary': 'concept-sort',
    'Adventure availability': 'adventure'
  };
  const traces = new Map();
  const check = (entry, inventory) => {
    const id = idOf(entry?.id);
    if (!entry || id === null || id === '__input__' || !Array.isArray(history)) return { status: 'unavailable' };
    const matches = byId.get(id) || [];
    if (!matches.length) return { status: 'missing' };
    if (matches.length > 1) return { status: 'ambiguous' };
    const resource = matches[0];
    if (typeof entry.type !== 'string' || resource.type !== entry.type) return { status: 'unavailable' };
    if (typeof hash !== 'function' || typeof entry.fingerprint !== 'string'
        || !/^af1:[a-f0-9]{16}$/.test(entry.fingerprint)) return { status: 'unavailable' };
    try {
      let text;
      if (inventory) {
        if (record.inventoryStatus !== 'recorded' || record.projection === 'local-excerpt-v1') return { status: 'unavailable' };
        const entries = [];
        getAssetManifest([resource], { trace: item => entries.push(item) });
        if (entries.length !== 1) return { status: 'unavailable' };
        text = entries[0].text;
      } else {
        if (!Object.prototype.hasOwnProperty.call(kinds, entry.kind) || kinds[entry.kind] !== resource.type
            || !Number.isInteger(entry.characters) || entry.characters <= 0
            || typeof entry.partial !== 'boolean') return { status: 'unavailable' };
        if (!traces.has(id)) {
          const context = modules.ExportHandlers?.getLessonContext;
          if (typeof context !== 'function') return { status: 'unavailable' };
          const entries = [];
          context([resource], { inputText: '', targetStandards: [], trace: item => entries.push(item) });
          traces.set(id, entries);
        }
        const entries = traces.get(id).filter(item => idOf(item.id) === id && item.kind === entry.kind);
        if (entries.length !== 1) return { status: 'unavailable' };
        text = String(entries[0].text || '');
        // Same normalization and recorded contribution boundary as capturePlanningInputs.
        if (record.projection === 'local-excerpt-v1') text = text.replace(/\\s+\\n/g, '\\n');
        text = text.trim();
        if (entry.partial) text = text.slice(0, entry.characters);
      }
      return { status: hash(text) === entry.fingerprint ? 'same' : 'changed' };
    } catch (_) {
      // Imported/malformed resources must not break the saved plan view.
      return { status: 'unavailable' };
    }
  };
  const summaries = record.summaries.map(entry => check(entry, false));
  const inventory = record.inventory.map(entry => check(entry, true));
  const all = summaries.concat(inventory);
  const incomplete = record.traceComplete !== true || record.inventoryStatus === 'untraced'
    || !['recorded', 'not-supplied', 'untraced'].includes(record.inventoryStatus);
  const status = all.some(item => ['changed', 'missing', 'ambiguous'].includes(item.status)) ? 'attention'
    : incomplete || !all.length || all.some(item => item.status === 'unavailable') ? 'unavailable' : 'same';
  return { status, summaries, inventory };
};

// One branch classification for the static organizer, the interactive map and saved blueprints:
// the generated role wins; English title words are only a fallback for legacy data.
const organizerBranchRoles = (structureType, branches) => {
  const list = Array.isArray(branches) ? branches : [];
  const role = b => String(b && (b.role || b.semanticRole) || '').trim().toLowerCase();
  const words = b => (String(b && b.title || '') + ' ' + String(b && b.title_en || '')).toLowerCase();
  if (structureType === 'Problem Solution') {
    let outcome = list.findIndex(b => ['outcome', 'result', 'evaluation'].includes(role(b)));
    if (outcome < 0) outcome = list.findIndex(b => !role(b) && /outcome|result|evaluation/.test(words(b)));
    return list.map((_, i) => i === outcome ? 'outcome' : 'solution');
  }
  if (structureType !== 'Cause and Effect') return list.map(() => null);
  return list.map((b, i) => {
    const r = role(b), w = words(b);
    if (r === 'cause' || r === 'causes') return 'cause';
    if (['effect', 'effects', 'consequence', 'consequences'].includes(r)) return 'effect';
    if (r === 'chain' || r === 'sequence') return 'chain';
    if (w.includes('cause')) return 'cause';
    if (/effect|consequence/.test(w)) return 'effect';
    if (/chain|sequence/.test(w)) return 'chain';
    return i === 0 ? 'cause' : i === 1 ? 'effect' : 'chain';
  });
};

// Logical source positions let saved diagrams retain their layout across static edits.
const outlineNodeBlueprints = (data = {}) => {
  const nodes = [], links = [];
  const branches = Array.isArray(data.branches) ? data.branches : [];
  const kind = data.structureType || '';
  const flow = kind === 'Flow Chart' || kind === 'Process Flow / Sequence';
  const venn = kind === 'Venn Diagram', ce = kind === 'Cause and Effect', ps = kind === 'Problem Solution';
  const add = (id, ref, text, translation, type, x, y, parent) => {
    nodes.push({ id, outlineSource: ref, text, translation: translation || null, type, x, y });
    if (parent) links.push({ id: id === 'node-main' ? 'e-start-main' : 'e-' + parent + '-' + id, fromId: parent, toId: id, ...(type === 'flow-note' ? {style:'dashed'} : {}) });
  };
  if (flow) {
    add('node-start', 'start', 'Start', null, 'flow-start', 400, 50);
    add('node-main', 'main', data.main, data.main_en, 'flow-process', 400, 150, 'node-start');
  } else if (!venn) add('root', 'main', data.main, data.main_en, ce ? 'ce-main' : ps ? 'ps-problem' : kind === 'Structured Outline' ? 'outline-main' : 'main', 350, 50);
  const roles = organizerBranchRoles(kind, branches);
  const outcomeIndex = ps ? roles.indexOf('outcome') : -1;
  let solutionIndex = 0;
  branches.forEach((branch, b) => {
    if (!branch || typeof branch !== 'object') return;
    const items = Array.isArray(branch.items) ? branch.items : [];
    let branchId = 'b-' + b, prefix = 'i-' + b + '-', type = 'item', parent = branchId;
    if (flow) { branchId = 'node-b-' + b; prefix = 'node-i-' + b + '-'; type = 'flow-note'; parent = branchId; }
    if (venn) { prefix = 'venn-' + b + '-'; type = 'venn-token'; parent = null; }
    if (ce) {
      const role = roles[b];
      prefix = role + '-' + b + '-'; type = role + '-node'; parent = role === 'cause' ? 'root' : null;
    }
    if (ps) {
      branchId = b === outcomeIndex ? 'outcome' : 'sol-' + solutionIndex++;
      prefix = b === outcomeIndex ? 'outcome-item-' : 'sol-item-' + (solutionIndex - 1) + '-';
      parent = branchId; type = b === outcomeIndex ? 'ps-outcome-item' : 'ps-solution-item';
    }
    const x = 80 + (b % 4) * 180, y = 200 + Math.floor(b / 4) * 180;
    if (!venn && !ce) add(branchId, 'b:' + b, branch.title, branch.title_en,
      flow ? (String(branch.title).includes('?') || branch.connectsTo?.length > 1 ? 'flow-decision' : 'flow-process')
        : ps ? b === outcomeIndex ? 'ps-outcome' : 'ps-solution' : kind === 'Structured Outline' ? 'outline-branch' : 'branch',
      flow ? 400 : x, flow ? 270 + b * 120 : y, flow || (ps && b === outcomeIndex) ? null : 'root');
    items.forEach((text, i) => add(prefix + i, 'i:' + b + ':' + i, text, branch.items_en?.[i], type,
      venn ? 80 + i * 100 : flow ? 650 : x, venn ? 540 : y + 120 + i * 70, parent));
  });
  if (ps && outcomeIndex < 0) add('outcome', 'outcome', 'Outcome', null, 'ps-outcome', 350, 550);
  if (flow) {
    add('node-end', 'end', 'End', null, 'flow-end', 400, 320 + branches.length * 120);
    const branching = branches.some(b => Array.isArray(b?.connectsTo) && b.connectsTo.length);
    if (branching) {
      if (branches.length) links.push({id:'e-main-b0',fromId:'node-main',toId:'node-b-0'});
      branches.forEach((b,i) => {
        const targets = Array.isArray(b?.connectsTo) ? b.connectsTo : [];
        targets.forEach(target => {
          if (!Number.isInteger(Number(target)) || Number(target) < 0 || Number(target) >= branches.length) return;
          links.push({id:'e-node-b-'+i+'-node-b-'+target,fromId:'node-b-'+i,toId:'node-b-'+target,label:b.connections?.find(c=>Number(c.target)===Number(target))?.label || ''});
        });
        if (!targets.length) links.push({id:'e-b'+i+'-end',fromId:'node-b-'+i,toId:'node-end'});
      });
    } else {
      let previousId = 'node-main';
      branches.forEach((b,i) => {
        const id = 'node-b-'+i;
        links.push({id:'e-'+previousId+'-'+id,fromId:previousId,toId:id});
        previousId = id;
      });
      links.push({id:'e-'+previousId+'-end',fromId:previousId,toId:'node-end'});
    }
  }
  if (ps) nodes.filter(n=>n.type==='ps-solution').forEach(node=>links.push({id:'e-'+node.id+'-outcome',fromId:node.id,toId:'outcome'}));
  if (ce) {
    const causes=nodes.filter(n=>n.type==='cause-node'),effects=nodes.filter(n=>n.type==='effect-node');
    causes.forEach(cause=>effects.forEach(effect=>links.push({id:'e-'+cause.id+'-'+effect.id,fromId:cause.id,toId:effect.id,style:'dashed'})));
    nodes.filter(n=>n.type==='chain-node').forEach(node=>{
      const parts=node.outlineSource.split(':'), index=Number(parts[2]);
      if(index>0) {
        const previous=nodes.find(n=>n.outlineSource==='i:'+parts[1]+':'+(index-1));
        if(previous) links.push({id:'e-chain-'+parts[1]+'-'+(index-1)+'-'+index,fromId:previous.id,toId:node.id});
      }
    });
  }
  return { nodes, links };
};

const synchronizeSavedOutline = (previous = {}, next = {}, change = {}) => {
  if (!Array.isArray(previous.nodes)) return next;
  const oldGraph = outlineNodeBlueprints(previous), newGraph = outlineNodeBlueprints(next);
  const oldById = new Map(oldGraph.nodes.map(n=>[n.id,n]));
  const oldByRef = new Map(oldGraph.nodes.map(n=>[n.outlineSource,n]));
  const newByRef = new Map(newGraph.nodes.map(n=>[n.outlineSource,n]));
  const remapRef = ref => {
    if (change.type !== 'remove-branch' || !/^([bi]):\d+/.test(ref)) return ref;
    const parts = ref.split(':'), index = Number(parts[1]);
    if (index === change.index) return null;
    if (index > change.index) parts[1] = String(index - 1);
    return parts.join(':');
  };
  const mappedOldRefs = new Set(oldGraph.nodes.map(n=>remapRef(n.outlineSource)).filter(Boolean));
  const idMap = new Map(), nodes = [];
  for (const node of previous.nodes) {
    if (!node || typeof node !== 'object') continue;
    const old = oldByRef.get(node.outlineSource) || oldById.get(node.id);
    if (!old) { nodes.push(node); idMap.set(node.id,node.id); continue; }
    const ref = remapRef(old.outlineSource), target = newByRef.get(ref);
    if (!target) { idMap.set(node.id,null); continue; }
    const updated = { ...node, id:target.id, outlineSource:ref };
    if (old.text !== target.text) updated.text = target.text;
    if (old.translation !== target.translation) updated.translation = target.translation;
    if (node.type === old.type) updated.type = target.type;
    nodes.push(updated); idMap.set(node.id,target.id);
  }
  const added = new Set();
  for (const node of newGraph.nodes) {
    if (!mappedOldRefs.has(node.outlineSource) && !nodes.some(n=>n.id===node.id)) { nodes.push(node); added.add(node.id); }
  }
  const ids = new Set(nodes.map(n=>n.id));
  const flowChanged = /^(Flow Chart|Process Flow \/ Sequence)$/.test(next.structureType || '') && (change.field === 'connections' || change.type === 'add-branch' || change.type === 'remove-branch');
  const canonicalOldEdges = new Set(oldGraph.links.map(edge=>edge.id));
  const remapEdges = edges => {
    const templates = new Map();
    const result = (Array.isArray(edges) ? edges : []).flatMap(edge => {
      if (!edge || typeof edge !== 'object') return [];
      const fromId = idMap.has(edge.fromId) ? idMap.get(edge.fromId) : edge.fromId;
      const toId = idMap.has(edge.toId) ? idMap.get(edge.toId) : edge.toId;
      if (!ids.has(fromId) || !ids.has(toId)) return [];
      if (flowChanged && canonicalOldEdges.has(edge.id)) { templates.set(fromId + "|" + toId, edge); return []; }
      return [{ ...edge, fromId, toId }];
    });
    for (const edge of newGraph.links) {
      if (!ids.has(edge.fromId) || !ids.has(edge.toId)) continue;
      if (!added.has(edge.fromId) && !added.has(edge.toId) && !flowChanged) continue;
      if (!result.some(e=>e.fromId===edge.fromId && e.toId===edge.toId)) {
        const template = templates.get(edge.fromId + "|" + edge.toId);
        result.push({ ...edge, ...template, id:edge.id, fromId:edge.fromId, toId:edge.toId, ...(change.field === 'connections' ? {label:edge.label || ''} : {}) });
      }
    }
    return result;
  };
  return { ...next, nodes, edges: previous.challenge ? [] : remapEdges(previous.edges),
    ...(previous.challenge ? {challenge:{...previous.challenge,targetEdges:remapEdges(previous.challenge.targetEdges)}} : {}) };
};

// ─── Registration ───────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.UtilsPure = {
  safeJsonParse,
  cleanJson,
  calculateTextEntropy,
  validateDraftQuality,
  getAssetManifest,
  getQuizConceptLabels,
  normalizeSuccessCriteria,
  successCriterionKey,
  resolvePlanCriterionRollup,
  criterionRollupStat,
  resolveUnitPathContext,
  capturePlanningInputs,
  consumePendingUnitPathNode,
  resolvePlanOutputLanguage,
  ALLO_ALL_SELECTED_LANGUAGES,
  _ALLO_UNIT_PATH_STAMP_MAX_AGE_MS,
  getPlanningInputStatus,
  organizerBranchRoles,
  outlineNodeBlueprints,
  synchronizeSavedOutline,
  chunkObject,
  flattenObject,
  unflattenObject,
  storageDB,
  writeVerifiedStorageSnapshot,
  mergeLearnerWorkSnapshots,
  withLearnerWorkLock,
  createLearnerWorkSession,
  parseProviderRetryAfter,
  classifyProviderError,
  getProviderErrorSafeFields,
  fetchWithExponentialBackoff,
  isGoogleRedirect,
  isYouTubeUrl,
  fetchAndCleanUrl,
  optimizeImage,
  _renderDiagramSvg,
};
if (typeof window._upgradeUtilsPure === 'function') {
  window._upgradeUtilsPure();
}
console.log('[UtilsPureModule] 17 utilities registered; monolith shim upgraded.');

window.AlloModules.UtilsPureModule = true;
})();
