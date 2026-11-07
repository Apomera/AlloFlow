// Offline Adventure (2026-11-04): a teacher-reviewed branching story students
// play with no AI. Stored as a history item { type: 'adventure', data: { offlineStory,
// offlineOnly } } so it rides every student egress path (file, pack, live session).
// Story: { version: 1, title, start, scenes: [{ id, text, sceneImage?, sceneImageAlt?,
// ending?, choices: [{ label, to }] }] }. Branches may rejoin: a graph, not a tree.
// Built into view_adventure_module.js by _build_view_adventure_module.js.
// Student author mode: a learner writes their own story (Panel studentMode), saved as
// { type: 'adventure', data: { kind: 'student-story', studentStory, selfCheck } }; it never
// carries offlineStory, so find/findDraft never treat it as the teacher's story.

var OFFLINE_LIMITS = { maxScenes: 60, maxChoices: 4, maxText: 2000, maxLabel: 200, maxTitle: 120, maxId: 40 };

function offlineText(t, key, fallback, params) {
  var full = 'adventure.offline.' + key;
  var value = '';
  try { value = typeof t === 'function' ? t(full, params) : ''; } catch (_) { value = ''; }
  var out = value && value !== full ? String(value) : fallback;
  if (params) Object.keys(params).forEach(function (name) { out = out.split('{' + name + '}').join(String(params[name])); });
  return out;
}

function _offlineStr(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : (typeof value === 'number' ? String(value).slice(0, max) : '');
}

// Coerce any candidate (AI output, saved data) into the story shape. Never throws.
// Accepts scenes as an array or an id-keyed map, and choice/ending synonyms.
function normalizeOfflineStory(raw) {
  var src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (src.story && typeof src.story === 'object' && !src.scenes) src = src.story;
  var list = Array.isArray(src.scenes) ? src.scenes
    : (src.scenes && typeof src.scenes === 'object' ? Object.keys(src.scenes).map(function (id) {
      var scene = src.scenes[id];
      return scene && typeof scene === 'object' ? Object.assign({ id: id }, scene) : null;
    }) : []);
  var scenes = list.filter(function (scene) { return scene && typeof scene === 'object' && !Array.isArray(scene); }).map(function (scene) {
    var choices = Array.isArray(scene.choices) ? scene.choices : (Array.isArray(scene.options) ? scene.options : []);
    var out = {
      id: _offlineStr(scene.id, OFFLINE_LIMITS.maxId),
      text: typeof scene.text === 'string' ? scene.text.trim() : _offlineStr(scene.narration, OFFLINE_LIMITS.maxText),
      ending: scene.ending === true || scene.isEnding === true || scene.end === true,
      choices: choices.filter(function (c) { return c && typeof c === 'object'; }).map(function (c) {
        return { label: _offlineStr(c.label != null ? c.label : c.text, OFFLINE_LIMITS.maxLabel), to: _offlineStr(c.to != null ? c.to : (c.next != null ? c.next : c.goto), OFFLINE_LIMITS.maxId) };
      })
    };
    if (typeof scene.sceneImage === 'string' && scene.sceneImage) {
      out.sceneImage = scene.sceneImage;
      if (typeof scene.sceneImageAlt === 'string') out.sceneImageAlt = scene.sceneImageAlt.slice(0, 300);
    }
    return out;
  });
  var start = _offlineStr(src.start != null ? src.start : src.startId, OFFLINE_LIMITS.maxId);
  return { version: 1, title: _offlineStr(src.title, OFFLINE_LIMITS.maxTitle), start: start || (scenes[0] ? scenes[0].id : ''), scenes: scenes };
}

// Reachability over the choice graph. forward: from start; back: scenes that can reach an ending.
function _offlineGraph(story) {
  var byId = {};
  story.scenes.forEach(function (scene) { if (scene.id && !byId[scene.id]) byId[scene.id] = scene; });
  var edges = function (scene) { return scene.ending ? [] : scene.choices.map(function (c) { return c.to; }).filter(function (to) { return byId[to]; }); };
  var reach = {}, depth = {};
  if (byId[story.start]) {
    var queue = [story.start]; reach[story.start] = true; depth[story.start] = 0;
    while (queue.length) {
      var id = queue.shift();
      edges(byId[id]).forEach(function (to) { if (!reach[to]) { reach[to] = true; depth[to] = depth[id] + 1; queue.push(to); } });
    }
  }
  var exits = {};
  Object.keys(byId).forEach(function (id) { if (byId[id].ending) exits[id] = true; });
  for (var changed = true; changed;) {
    changed = false;
    Object.keys(byId).forEach(function (id) {
      if (!exits[id] && edges(byId[id]).some(function (to) { return exits[to]; })) { exits[id] = true; changed = true; }
    });
  }
  return { byId: byId, reach: reach, depth: depth, exits: exits };
}

// Pure validator. errors block student play; warnings do not.
function validateOfflineStory(story) {
  var errors = [], warnings = [];
  var add = function (list, code, sceneId, choiceIndex) { list.push({ code: code, sceneId: sceneId || null, choiceIndex: choiceIndex == null ? null : choiceIndex }); };
  if (!story || !Array.isArray(story.scenes) || !story.scenes.length) {
    add(errors, 'no_scenes');
    return { ok: false, errors: errors, warnings: warnings, stats: { scenes: 0, endings: 0 } };
  }
  if (story.scenes.length > OFFLINE_LIMITS.maxScenes) add(errors, 'too_big');
  var seen = {};
  story.scenes.forEach(function (scene) {
    if (!scene.id) { add(errors, 'missing_id'); return; }
    if (seen[scene.id]) add(errors, 'duplicate_id', scene.id);
    seen[scene.id] = true;
  });
  var graph = _offlineGraph(story);
  if (!graph.byId[story.start]) add(errors, 'missing_start');
  var endings = 0;
  story.scenes.forEach(function (scene) {
    if (!scene.id) return;
    if (!String(scene.text || '').trim()) add(errors, 'empty_text', scene.id);
    else if (scene.text.length > OFFLINE_LIMITS.maxText) add(errors, 'too_big', scene.id);
    if (scene.ending) {
      endings++;
      if (scene.choices.length) add(warnings, 'ending_has_choices', scene.id);
      return;
    }
    if (!scene.choices.length) add(errors, 'dead_end', scene.id);
    if (scene.choices.length > OFFLINE_LIMITS.maxChoices) add(errors, 'too_big', scene.id);
    scene.choices.forEach(function (choice, index) {
      if (!choice.label) add(errors, 'empty_label', scene.id, index);
      if (!graph.byId[choice.to]) add(errors, 'broken_choice', scene.id, index);
    });
  });
  if (!endings) add(errors, 'no_ending');
  if (graph.byId[story.start]) {
    story.scenes.forEach(function (scene) {
      if (!scene.id || seen[scene.id] !== true) return;
      if (!graph.reach[scene.id]) add(errors, 'unreachable', scene.id);
      else if (endings && !graph.exits[scene.id]) add(errors, 'no_way_out', scene.id);
    });
  }
  return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: { scenes: story.scenes.length, endings: endings } };
}

// Repair the simple faults AI output tends to have. Returns { story, fixes: [code...] }.
// Cannot invent text: empty scenes stay errors (the caller re-asks).
function repairOfflineStory(input, options) {
  var opts = options || {};
  var continueLabel = _offlineStr(opts.continueLabel, OFFLINE_LIMITS.maxLabel) || 'Continue';
  var story = normalizeOfflineStory(input);
  var fixes = [];
  var seen = {};
  story.scenes = story.scenes.filter(function (scene) {
    if (!scene.id || seen[scene.id]) { fixes.push('dropped_scene'); return false; }
    seen[scene.id] = true; return true;
  });
  if (story.scenes.length > OFFLINE_LIMITS.maxScenes) { story.scenes = story.scenes.slice(0, OFFLINE_LIMITS.maxScenes); fixes.push('trimmed_scenes'); }
  if (!seen[story.start] && story.scenes[0]) { story.start = story.scenes[0].id; fixes.push('set_start'); }
  var ids = {};
  story.scenes.forEach(function (scene) { ids[scene.id] = true; });
  story.scenes.forEach(function (scene) {
    if (scene.text.length > OFFLINE_LIMITS.maxText) { scene.text = scene.text.slice(0, OFFLINE_LIMITS.maxText); fixes.push('trimmed_text'); }
    if (scene.ending) {
      if (scene.choices.length) { scene.choices = []; fixes.push('ending_choices'); }
      return;
    }
    var kept = scene.choices.filter(function (c) { return c.label && ids[c.to]; });
    if (kept.length !== scene.choices.length) fixes.push('dropped_choice');
    if (kept.length > OFFLINE_LIMITS.maxChoices) { kept = kept.slice(0, OFFLINE_LIMITS.maxChoices); fixes.push('dropped_choice'); }
    scene.choices = kept;
  });
  var hasEnding = story.scenes.some(function (scene) { return scene.ending; });
  // Dead ends: link to the shallowest ending; with no ending at all, the dead end becomes one.
  var nearestEnding = function () {
    var graph = _offlineGraph(story);
    var ends = story.scenes.filter(function (scene) { return scene.ending; });
    ends.sort(function (a, b) { return (graph.depth[a.id] == null ? 1e9 : graph.depth[a.id]) - (graph.depth[b.id] == null ? 1e9 : graph.depth[b.id]); });
    return ends[0] ? ends[0].id : '';
  };
  story.scenes.forEach(function (scene) {
    if (scene.ending || scene.choices.length) return;
    if (!hasEnding) { scene.ending = true; hasEnding = true; fixes.push('made_ending'); return; }
    scene.choices = [{ label: continueLabel, to: nearestEnding() }];
    fixes.push('linked_dead_end');
  });
  if (!hasEnding && story.scenes.length > 1) {
    var last = story.scenes[story.scenes.length - 1];
    last.ending = true; last.choices = []; fixes.push('made_ending');
  }
  // Loops with no way out: give the first trapped scene an exit, then re-check.
  for (var guard = 0; guard < OFFLINE_LIMITS.maxScenes; guard++) {
    var graph = _offlineGraph(story);
    var trapped = story.scenes.filter(function (scene) { return graph.reach[scene.id] && !graph.exits[scene.id]; })[0];
    if (!trapped) break;
    var target = nearestEnding();
    if (!target) break;
    if (trapped.choices.length >= OFFLINE_LIMITS.maxChoices) trapped.choices = trapped.choices.slice(0, OFFLINE_LIMITS.maxChoices - 1);
    trapped.choices.push({ label: continueLabel, to: target });
    fixes.push('linked_loop');
  }
  var finalGraph = _offlineGraph(story);
  if (finalGraph.byId[story.start]) {
    var before = story.scenes.length;
    story.scenes = story.scenes.filter(function (scene) { return finalGraph.reach[scene.id]; });
    if (story.scenes.length !== before) fixes.push('dropped_unreachable');
  }
  return { story: story, fixes: fixes };
}

// Newest adventure history item that carries a playable offline story, or null.
var _offlineFindCache = typeof WeakMap === 'function' ? new WeakMap() : null;
function findOfflineAdventure(history) {
  var items = Array.isArray(history) ? history : [];
  for (var i = items.length - 1; i >= 0; i--) {
    var item = items[i];
    if (!item || item.type !== 'adventure' || !item.data || typeof item.data !== 'object' || !item.data.offlineStory) continue;
    var cached = _offlineFindCache && _offlineFindCache.get(item.data);
    if (!cached) {
      var story = normalizeOfflineStory(item.data.offlineStory);
      cached = { item: item, story: story, offlineOnly: item.data.offlineOnly === true, ok: validateOfflineStory(story).ok };
      if (_offlineFindCache) _offlineFindCache.set(item.data, cached);
    }
    if (cached.ok) return cached;
  }
  return null;
}

// Newest offline item, playable or not (the teacher edits a draft too).
function findOfflineAdventureDraft(history) {
  var items = Array.isArray(history) ? history : [];
  for (var i = items.length - 1; i >= 0; i--) {
    var item = items[i];
    if (item && item.type === 'adventure' && item.data && item.data.offlineStory) return item;
  }
  return null;
}

// Newest story this learner wrote (student author mode), or null.
function findStudentStory(history) {
  var items = Array.isArray(history) ? history : [];
  for (var i = items.length - 1; i >= 0; i--) {
    var item = items[i];
    if (item && item.type === 'adventure' && item.data && item.data.kind === 'student-story' && item.data.studentStory && typeof item.data.studentStory === 'object') return item;
  }
  return null;
}

// Ending reflections (student, no AI): one item per offline story,
// { type: 'adventure', data: { kind: 'offline-reflection', storyId, storyTitle, reflections:
// [{ endingId, ending, text, at }] } }, one entry per ending. It rides the hand-in like
// student-story; the Submission Inbox shows it. find/findDraft/findStudentStory skip it.
var OFFLINE_REFLECT_MAX = 1000;
function findOfflineReflection(history, storyId) {
  var items = Array.isArray(history) ? history : [];
  var want = _offlineStr(storyId, 200) || 'story';
  for (var i = items.length - 1; i >= 0; i--) {
    var item = items[i];
    if (item && item.type === 'adventure' && item.data && item.data.kind === 'offline-reflection' && item.data.storyId === want && Array.isArray(item.data.reflections)) return item;
  }
  return null;
}

function saveOfflineReflection(setHistory, storyItem, story, scene, text, t) {
  var body = _offlineStr(text, OFFLINE_REFLECT_MAX);
  if (typeof setHistory !== 'function' || !storyItem || !scene || !body) return false;
  var storyId = _offlineStr(storyItem.id, 200) || 'story';
  var id = 'adventure-reflection-' + storyId;
  var storyTitle = _offlineStr(story && story.title, OFFLINE_LIMITS.maxTitle);
  var entry = { endingId: scene.id, ending: _offlineStr(scene.text, 300), text: body, at: new Date().toISOString() };
  setHistory(function (prev) {
    var list = Array.isArray(prev) ? prev : [];
    var old = null;
    list.forEach(function (h) { if (h && h.id === id) old = h; });
    var kept = old && old.data && Array.isArray(old.data.reflections) ? old.data.reflections.filter(function (e) { return e && e.endingId !== entry.endingId; }) : [];
    var item = {
      id: id, type: 'adventure',
      title: offlineText(t, 'reflect_title', 'Reflection: {title}', { title: storyTitle || offlineText(t, 'title', 'Offline adventure') }),
      timestamp: old && old.timestamp ? old.timestamp : new Date(),
      data: { kind: 'offline-reflection', storyId: storyId, storyTitle: storyTitle, reflections: kept.concat([entry]).slice(-OFFLINE_LIMITS.maxScenes) }
    };
    return old ? list.map(function (h) { return h && h.id === id ? Object.assign({}, h, item) : h; }) : list.concat([item]);
  });
  return true;
}

function buildOfflineStoryPrompt(settings) {
  var s = settings || {};
  var source = String(s.sourceText || '').slice(0, 8000);
  return [
    'Write a branching educational choose-your-path story that students will play WITHOUT any AI, so it must be complete.',
    'Topic: ' + (s.topic || 'the source text') + '. Grade level: ' + (s.gradeLevel || 'not given') + '. Write every scene and choice in ' + (s.language || 'English') + '.',
    s.mode ? 'Style: ' + s.mode + (s.difficulty ? ', difficulty ' + s.difficulty : '') + '.' : '',
    s.customInstructions ? 'Teacher instructions: ' + String(s.customInstructions).slice(0, 1500) : '',
    'Rules: 15 to 25 scenes. Each non-ending scene has 2 or 3 choices; each choice is a decision that shows understanding of the content. 3 to 5 endings, at least one where the learner applies the lesson well. Branches may rejoin. Every scene must be reachable from the start and every path must reach an ending. Each scene is 50 to 130 words, accurate to the source, age-appropriate.',
    'Return ONLY JSON: {"title":"...","start":"s1","scenes":[{"id":"s1","text":"...","choices":[{"label":"...","to":"s2"}]},{"id":"s9","text":"...","ending":true}]}',
    s.problems ? 'Your previous answer had these problems; fix them all: ' + s.problems : '',
    'SOURCE TEXT:\n' + source
  ].filter(Boolean).join('\n');
}

// Same source the live adventure would use (shared resolver), else the input box text.
function adventureOfflineSettings(props, language) {
  var text = '';
  try {
    var resolve = window.AlloModules && window.AlloModules.AdventureHandlers && window.AlloModules.AdventureHandlers.resolveAdventureReadingSource;
    var reading = typeof resolve === 'function' ? resolve({ history: props.history || [], inputText: props.inputText, adventureState: props.adventureState }, false) : null;
    if (reading && reading.status === 'resolved') text = String(reading.text || '');
  } catch (_) { text = ''; }
  return {
    sourceText: text || String(props.inputText || ''), topic: props.sourceTopic || '', gradeLevel: props.gradeLevel || '',
    language: language || 'English', mode: props.adventureInputMode || '', difficulty: props.adventureDifficulty || '',
    customInstructions: props.adventureCustomInstructions || ''
  };
}

function parseOfflineStoryResponse(text) {
  if (text && typeof text === 'object') return text;
  var raw = String(text || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(raw); } catch (_) {}
  var a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)); } catch (_) {} }
  return null;
}

// Ask, repair, validate; re-ask once with the remaining problems. Throws only if callGemini is unusable.
async function generateOfflineStory(settings) {
  var s = settings || {};
  if (!_aiUsable('text', s.callGemini)) throw new Error('offline-story-no-ai');
  var problems = '';
  var last = null;
  for (var attempt = 1; attempt <= 2; attempt++) {
    var reply = null;
    try { reply = await s.callGemini(buildOfflineStoryPrompt(Object.assign({}, s, { problems: problems })), true); } catch (error) { if (attempt === 2) throw error; continue; }
    var parsed = parseOfflineStoryResponse(reply);
    if (!parsed) { problems = 'the answer was not valid JSON'; continue; }
    var repaired = repairOfflineStory(parsed, { continueLabel: s.continueLabel });
    var check = validateOfflineStory(repaired.story);
    last = { story: repaired.story, fixes: repaired.fixes, validation: check, attempts: attempt };
    if (check.ok) return last;
    problems = check.errors.slice(0, 12).map(function (e) { return e.code + (e.sceneId ? ' at ' + e.sceneId : ''); }).join('; ');
  }
  return last || { story: null, fixes: [], validation: { ok: false, errors: [{ code: 'no_scenes' }], warnings: [] }, attempts: 2 };
}

// Scenes in breadth-first order from start with depth and inbound counts (for the map).
function outlineOfflineStory(story) {
  var graph = _offlineGraph(story);
  var inbound = {};
  story.scenes.forEach(function (scene) { if (!scene.ending) scene.choices.forEach(function (c) { inbound[c.to] = (inbound[c.to] || 0) + 1; }); });
  return story.scenes.map(function (scene, index) {
    return { id: scene.id, index: index, depth: graph.depth[scene.id] == null ? null : graph.depth[scene.id], ending: !!scene.ending, inbound: inbound[scene.id] || 0, to: scene.ending ? [] : scene.choices.map(function (c) { return c.to; }) };
  }).sort(function (a, b) { return (a.depth == null ? 1e9 : a.depth) - (b.depth == null ? 1e9 : b.depth) || a.index - b.index; });
}

function offlineIssueText(t, issue, sceneNumber) {
  var where = issue.sceneId ? offlineText(t, 'scene_n', 'Scene {n}', { n: sceneNumber(issue.sceneId) }) + ': ' : '';
  var fallback = {
    no_scenes: 'Add at least one scene.', too_big: 'Too long or too many scenes or choices.', missing_id: 'A scene has no name.',
    duplicate_id: 'Two scenes share a name.', missing_start: 'Choose the first scene.', empty_text: 'Write the scene text.',
    empty_label: 'A choice has no words.', broken_choice: 'A choice goes to a scene that does not exist.',
    dead_end: 'Add a choice, or mark it as an ending.', no_ending: 'Mark at least one scene as an ending.',
    unreachable: 'No choice leads here.', no_way_out: 'Players get stuck in a loop with no way to an ending.',
    ending_has_choices: 'Endings do not show choices.'
  }[issue.code] || issue.code;
  return where + offlineText(t, 'issue_' + issue.code, fallback);
}

var OFFLINE_BUTTON = 'min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed';
var OFFLINE_SECONDARY = OFFLINE_BUTTON + ' border-[var(--av-control)] bg-[var(--av-surface)] text-[var(--av-ink)] hover:bg-[var(--av-wash)]';
var OFFLINE_PRIMARY = OFFLINE_BUTTON + ' border-[var(--av-accent)] bg-[var(--av-accent)] text-[var(--av-surface)] hover:underline';
var OFFLINE_FIELD = 'w-full min-h-11 rounded-lg border border-[var(--av-control)] bg-[var(--av-surface)] px-3 py-2 text-sm text-[var(--av-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)]';

function _offlineReflectionText(reflections, endingId) {
  var found = '';
  (Array.isArray(reflections) ? reflections : []).forEach(function (e) { if (e && e.endingId === endingId && typeof e.text === 'string') found = e.text; });
  return found;
}

// Reflection box at an ending (only when the host passes onReflect).
function AdventureOfflineReflection(props) {
  var t = props.t;
  var [text, setText] = React.useState(props.initial || '');
  var [saved, setSaved] = React.useState(!!props.initial);
  var fieldId = 'adventure-offline-reflect-' + String(props.sceneId).replace(/[^A-Za-z0-9_-]/g, '_');
  var save = function () {
    if (!text.trim()) return;
    if (props.onSave(text) !== false) setSaved(true);
  };
  return <div data-offline-reflection className="mt-5 grid gap-2 rounded-2xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3">
    <label htmlFor={fieldId} className="text-sm font-bold">{offlineText(t, 'reflect_prompt', 'Think about this ending. What did you learn, and what would you choose differently?')}</label>
    <textarea id={fieldId} rows={3} maxLength={OFFLINE_REFLECT_MAX} value={text} onChange={function (e) { setText(e.target.value); setSaved(false); }} className={OFFLINE_FIELD} />
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" data-offline-reflection-save disabled={!text.trim() || saved} onClick={save} className={OFFLINE_SECONDARY}>
        <Flag size={14} aria-hidden="true" /> {offlineText(t, 'student_save', 'Save to my work')}
      </button>
      <p role="status" aria-live="polite" className="m-0 text-sm font-semibold">{saved ? offlineText(t, 'reflect_saved', 'Saved to your work.') : ''}</p>
    </div>
  </div>;
}

// Student/preview player. Pure UI: no AI, no network.
function AdventureOfflinePlayer(props) {
  var story = props.story;
  var t = props.t;
  var [path, setPath] = React.useState([story.start]);
  var headingRef = React.useRef(null);
  var firstRender = React.useRef(true);
  var byId = React.useMemo(function () { return _offlineGraph(story).byId; }, [story]);
  var scene = byId[path[path.length - 1]] || byId[story.start];
  React.useEffect(function () {
    if (firstRender.current) { firstRender.current = false; return; }
    try { headingRef.current && headingRef.current.focus({ preventScroll: false }); } catch (_) {}
  }, [path.length, scene && scene.id]);
  if (!scene) return null;
  var go = function (to) { if (byId[to]) setPath(function (prev) { return prev.concat([to]); }); };
  var stepLabel = offlineText(t, 'step_n', 'Step {n}', { n: path.length });
  return <section data-adventure-offline-player aria-label={story.title || offlineText(t, 'title', 'Offline adventure')} style={adventureVisualTokens(props.theme)}
    className="w-full max-w-3xl mx-auto my-auto rounded-3xl border border-[var(--av-line)] bg-[var(--av-surface)] p-4 sm:p-6 text-[var(--av-ink)] shadow-[var(--av-shadow)]">
    {story.title && <p className="m-0 mb-1 text-xs font-bold uppercase tracking-wide text-[var(--av-muted)]">{story.title}</p>}
    <h3 ref={headingRef} tabIndex={-1} data-offline-scene={scene.id} className="m-0 mb-3 text-lg font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] rounded">
      {scene.ending ? offlineText(t, 'the_end', 'The end') : stepLabel}
    </h3>
    {scene.sceneImage && <img src={scene.sceneImage} alt={scene.sceneImageAlt || ''} className="mb-4 w-full max-h-72 rounded-2xl object-contain bg-[var(--av-wash)]" />}
    <div data-offline-scene-text className="whitespace-pre-wrap text-base leading-relaxed">{scene.text}</div>
    {!scene.ending && <div role="group" aria-label={offlineText(t, 'choices', 'Choices')} className="mt-5 grid gap-2">
      {scene.choices.map(function (choice, index) {
        return <button key={index} type="button" data-offline-choice={choice.to} onClick={function () { go(choice.to); }}
          className={OFFLINE_SECONDARY + ' w-full justify-start text-left text-base border-2 rounded-2xl px-4 py-3'}>{choice.label}</button>;
      })}
    </div>}
    {scene.ending && typeof props.onReflect === 'function' && <AdventureOfflineReflection key={scene.id} sceneId={scene.id} t={t}
      initial={_offlineReflectionText(props.reflections, scene.id)} onSave={function (text) { return props.onReflect(scene, text); }} />}
    <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--av-line)] pt-4">
      <button type="button" data-offline-back disabled={path.length < 2} onClick={function () { setPath(function (prev) { return prev.length > 1 ? prev.slice(0, -1) : prev; }); }} className={OFFLINE_SECONDARY}>
        <ArrowDown size={14} className="rotate-90" aria-hidden="true" /> {offlineText(t, 'back', 'Back')}
      </button>
      <button type="button" data-offline-restart disabled={path.length < 2} onClick={function () { setPath([story.start]); }} className={scene.ending ? OFFLINE_PRIMARY : OFFLINE_SECONDARY}>
        <RefreshCw size={14} aria-hidden="true" /> {scene.ending ? offlineText(t, 'play_again', 'Play again') : offlineText(t, 'restart', 'Start over')}
      </button>
      {typeof props.onExit === 'function' && <button type="button" onClick={props.onExit} className={OFFLINE_SECONDARY}>{offlineText(t, 'edit', 'Edit')}</button>}
    </div>
  </section>;
}

function _offlineNewId(story) {
  var used = {};
  story.scenes.forEach(function (scene) { used[scene.id] = true; });
  for (var n = story.scenes.length + 1; ; n++) if (!used['s' + n]) return 's' + n;
}

// Manual authoring: works with no AI. Controlled by props.story / props.onChange.
function AdventureOfflineEditor(props) {
  var story = props.story;
  var t = props.t;
  var studentMode = props.studentMode === true;
  var check = React.useMemo(function () { return validateOfflineStory(story); }, [story]);
  var outline = React.useMemo(function () { return outlineOfflineStory(story); }, [story]);
  var numberOf = function (id) { var i = story.scenes.findIndex(function (scene) { return scene.id === id; }); return i < 0 ? '?' : i + 1; };
  var update = function (mutate) {
    var next = { version: 1, title: story.title, start: story.start, scenes: story.scenes.map(function (scene) { return Object.assign({}, scene, { choices: scene.choices.map(function (c) { return Object.assign({}, c); }) }); }) };
    mutate(next);
    props.onChange(next);
  };
  var sceneName = function (scene, index) { return offlineText(t, 'scene_n', 'Scene {n}', { n: index + 1 }) + (scene.text ? ': ' + scene.text.slice(0, 40) : ''); };
  var issues = check.errors.concat(check.warnings);
  return <div data-adventure-offline-editor className="grid gap-4">
    <div className={studentMode ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
      <label className="grid gap-1 text-sm font-bold">{offlineText(t, 'title_label', 'Story title')}
        <input type="text" value={story.title} maxLength={OFFLINE_LIMITS.maxTitle} onChange={function (e) { var v = e.target.value; update(function (s) { s.title = v; }); }} className={OFFLINE_FIELD} />
      </label>
      {!studentMode && <label className="grid gap-1 text-sm font-bold">{offlineText(t, 'start_label', 'First scene')}
        <select value={story.start} onChange={function (e) { var v = e.target.value; update(function (s) { s.start = v; }); }} className={OFFLINE_FIELD}>
          {story.scenes.map(function (scene, index) { return <option key={scene.id} value={scene.id}>{sceneName(scene, index)}</option>; })}
        </select>
      </label>}
    </div>
    <div data-offline-validation role="status" aria-live="polite" className={'rounded-xl border px-3 py-2 text-sm ' + (check.ok ? 'border-[var(--av-accent)]' : 'border-[var(--av-control)]')}>
      <p className="m-0 font-bold">{studentMode
        ? (check.ok ? offlineText(t, 'student_ready', 'Your story is ready to play!') : offlineText(t, 'student_problems', 'Story checklist:'))
        : (check.ok ? offlineText(t, 'ready', 'Ready: students can play this.') : offlineText(t, 'problems', 'Fix these before students can play:'))}</p>
      {issues.length > 0 && <ul className="m-0 mt-1 pl-5 list-disc">
        {issues.slice(0, 20).map(function (issue, index) { return <li key={index}>{offlineIssueText(t, issue, numberOf)}</li>; })}
      </ul>}
    </div>
    <details data-offline-map className="rounded-xl border border-[var(--av-line)] px-3 py-2">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">{offlineText(t, 'outline', 'Story map')}</summary>
      <ol className="m-0 grid gap-1 pl-0 list-none text-sm">
        {outline.map(function (row) {
          return <li key={row.id} style={{ paddingLeft: Math.min(row.depth == null ? 0 : row.depth, 8) * 12 }}>
            <span className="font-bold">{numberOf(row.id)}</span>{row.id === story.start ? ' ▶' : ''}{row.ending ? ' ■ ' + offlineText(t, 'ending', 'Ending') : ' → ' + row.to.map(numberOf).join(', ')}{row.depth == null ? ' ⚠' : ''}
          </li>;
        })}
      </ol>
    </details>
    <ol className="m-0 grid gap-3 pl-0 list-none">
      {story.scenes.map(function (scene, index) {
        var label = offlineText(t, 'scene_n', 'Scene {n}', { n: index + 1 });
        return <li key={scene.id} data-offline-scene-editor={scene.id} className="rounded-2xl border border-[var(--av-line)] bg-[var(--av-surface)] p-3">
          <fieldset className="m-0 grid gap-2 border-0 p-0 min-w-0">
            <legend className="text-sm font-black">{label}{scene.id === story.start ? ' ▶' : ''}</legend>
            <label className="grid gap-1 text-xs font-bold">{offlineText(t, 'scene_text', 'Scene text')}
              <textarea value={scene.text} rows={3} maxLength={OFFLINE_LIMITS.maxText} onChange={function (e) { var v = e.target.value; update(function (s) { s.scenes[index].text = v; }); }} className={OFFLINE_FIELD + ' text-sm leading-relaxed'} />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={!!scene.ending} onChange={function (e) { var v = e.target.checked; update(function (s) { s.scenes[index].ending = v; if (v) s.scenes[index].choices = []; }); }} className="h-5 w-5" />
              {offlineText(t, 'ending', 'Ending')}
            </label>
            {!scene.ending && scene.choices.map(function (choice, ci) {
              var choiceLabel = offlineText(t, 'choice_n', 'Choice {n}', { n: ci + 1 });
              return <div key={ci} className="grid gap-2 sm:grid-cols-[1fr_12rem_auto] items-end">
                <label className="grid gap-1 text-xs font-bold">{choiceLabel}
                  <input type="text" value={choice.label} maxLength={OFFLINE_LIMITS.maxLabel} onChange={function (e) { var v = e.target.value; update(function (s) { s.scenes[index].choices[ci].label = v; }); }} className={OFFLINE_FIELD} />
                </label>
                <label className="grid gap-1 text-xs font-bold">{offlineText(t, 'goes_to', 'Goes to')}
                  <select value={choice.to} onChange={function (e) { var v = e.target.value; update(function (s) { s.scenes[index].choices[ci].to = v; }); }} className={OFFLINE_FIELD}>
                    {!story.scenes.some(function (other) { return other.id === choice.to; }) && <option value={choice.to}>?</option>}
                    {story.scenes.map(function (other, oi) { return <option key={other.id} value={other.id}>{sceneName(other, oi)}</option>; })}
                  </select>
                </label>
                <button type="button" aria-label={offlineText(t, 'remove_choice', 'Remove choice') + ': ' + choiceLabel} onClick={function () { update(function (s) { s.scenes[index].choices.splice(ci, 1); }); }} className={OFFLINE_SECONDARY + ' min-w-11'}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>;
            })}
            <div className="flex flex-wrap gap-2">
              {!scene.ending && scene.choices.length < OFFLINE_LIMITS.maxChoices && <button type="button" data-offline-add-choice onClick={function () {
                update(function (s) {
                  // Student flow: each new choice gets its own new scene, so nothing dangles or hides.
                  if (studentMode && s.scenes.length < OFFLINE_LIMITS.maxScenes) {
                    var fresh = _offlineNewId(s);
                    s.scenes.push({ id: fresh, text: '', ending: false, choices: [] });
                    s.scenes[index].choices.push({ label: '', to: fresh });
                    return;
                  }
                  var other = s.scenes.find(function (o) { return o.id !== scene.id; }); s.scenes[index].choices.push({ label: '', to: other ? other.id : scene.id });
                });
              }} className={OFFLINE_SECONDARY}><Plus size={14} aria-hidden="true" /> {offlineText(t, 'add_choice', 'Add choice')}</button>}
              {story.scenes.length > 1 && <button type="button" data-offline-remove-scene aria-label={offlineText(t, 'remove_scene', 'Remove scene') + ': ' + label} onClick={function () {
                update(function (s) {
                  s.scenes.splice(index, 1);
                  s.scenes.forEach(function (o) { o.choices = o.choices.filter(function (c) { return c.to !== scene.id; }); });
                  if (s.start === scene.id) s.start = s.scenes[0].id;
                });
              }} className={OFFLINE_SECONDARY}><X size={14} aria-hidden="true" /> {offlineText(t, 'remove_scene', 'Remove scene')}</button>}
            </div>
          </fieldset>
        </li>;
      })}
    </ol>
    {story.scenes.length < OFFLINE_LIMITS.maxScenes && <button type="button" data-offline-add-scene onClick={function () { update(function (s) { s.scenes.push({ id: _offlineNewId(s), text: '', ending: false, choices: [] }); }); }} className={OFFLINE_SECONDARY + ' justify-self-start'}>
      <Plus size={14} aria-hidden="true" /> {offlineText(t, 'add_scene', 'Add scene')}
    </button>}
  </div>;
}

function _offlineBlankStory() {
  return { version: 1, title: '', start: 's1', scenes: [
    { id: 's1', text: '', ending: false, choices: [{ label: '', to: 's2' }, { label: '', to: 's3' }] },
    { id: 's2', text: '', ending: true, choices: [] },
    { id: 's3', text: '', ending: true, choices: [] }
  ] };
}

function _offlineStudentBlank() {
  return { version: 1, title: '', start: 's1', scenes: [{ id: 's1', text: '', ending: false, choices: [] }] };
}

var STUDENT_STORY_CHECKS = [
  ['clearProblem', 'student_check_problem', 'My story has a clear problem'],
  ['choicesMatter', 'student_check_choices', 'Every choice matters'],
  ['twoEndings', 'student_check_endings', 'It has at least two endings']
];

// Teacher dialog: make with AI (doorway when AI is not set up), edit by hand, preview, save.
// studentMode: a learner writes their own story. No AI, no offline-only toggle; saves to
// the learner's own work as a separate item (never the teacher's offline story).
function AdventureOfflinePanel(props) {
  var t = props.t;
  var studentMode = props.studentMode === true;
  var existing = studentMode ? findStudentStory(props.history) : findOfflineAdventureDraft(props.history);
  var [draft, setDraft] = React.useState(function () {
    if (studentMode) return existing ? normalizeOfflineStory(existing.data.studentStory) : _offlineStudentBlank();
    return existing ? normalizeOfflineStory(existing.data.offlineStory) : null;
  });
  var [selfCheck, setSelfCheck] = React.useState(function () {
    var saved = studentMode && existing && existing.data.selfCheck && typeof existing.data.selfCheck === 'object' ? existing.data.selfCheck : {};
    var out = {};
    STUDENT_STORY_CHECKS.forEach(function (row) { out[row[0]] = saved[row[0]] === true; });
    return out;
  });
  var [offlineOnly, setOfflineOnly] = React.useState(!!(!studentMode && existing && existing.data.offlineOnly === true));
  var [previewing, setPreviewing] = React.useState(false);
  var [busy, setBusy] = React.useState(false);
  var [notice, setNotice] = React.useState('');
  var [dirty, setDirty] = React.useState(false);
  var closeRef = React.useRef(null);
  var openerRef = React.useRef(typeof document !== 'undefined' ? document.activeElement : null);
  var aiReady = !studentMode && _aiUsable('text', props.callGemini);
  var door = null;
  if (!aiReady && !studentMode) { try { door = typeof window.__alloAiSetupDoorway === 'function' ? window.__alloAiSetupDoorway('text', t) : null; } catch (_) { door = null; } }
  var Notice = !studentMode && typeof window.AlloAiSetupNotice === 'function' ? window.AlloAiSetupNotice : null;
  var autosaveRef = React.useRef(null);
  var savedIdRef = React.useRef(null);
  var close = function () {
    // A learner's unsaved words are kept on close (Escape included) rather than lost.
    try { if (autosaveRef.current) autosaveRef.current(); } catch (_) {}
    props.onClose();
    try { openerRef.current && openerRef.current.focus && openerRef.current.focus({ preventScroll: true }); } catch (_) {}
  };
  React.useEffect(function () {
    try { closeRef.current && closeRef.current.focus({ preventScroll: true }); } catch (_) {}
    var onKey = function (event) { if (event.key === 'Escape') { event.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    return function () { document.removeEventListener('keydown', onKey, true); };
  }, []);
  var check = draft ? validateOfflineStory(draft) : null;
  var makeWithAi = async function () {
    if (!aiReady || busy) return;
    setBusy(true); setNotice(offlineText(t, 'making', 'Writing the story…'));
    try {
      var result = await generateOfflineStory(Object.assign({}, props.settings || {}, { callGemini: props.callGemini, continueLabel: (typeof t === 'function' && t('common.continue') !== 'common.continue' && t('common.continue')) || 'Continue' }));
      if (result && result.story && result.story.scenes.length) {
        setDraft(result.story); setDirty(true); setPreviewing(false);
        setNotice(result.validation.ok
          ? (result.fixes.length ? offlineText(t, 'fixed_n', '{count} small problems were fixed automatically. Review the story, then save.', { count: result.fixes.length }) : offlineText(t, 'review', 'Review the story, then save.'))
          : offlineText(t, 'ai_partial', 'The AI story still has problems. Fix them below, or try again.'));
      } else {
        setNotice(offlineText(t, 'ai_failed', 'The AI story could not be used. Try again or write your own.'));
      }
    } catch (_) {
      setNotice(offlineText(t, 'ai_failed', 'The AI story could not be used. Try again or write your own.'));
    } finally { setBusy(false); }
  };
  var save = function () {
    if (!draft || typeof props.setHistory !== 'function') return;
    var story = normalizeOfflineStory(draft);
    var ok = validateOfflineStory(story).ok;
    var id = existing ? existing.id : savedIdRef.current || (studentMode ? 'adventure-student-story-' : 'adventure-offline-') + Date.now().toString(36);
    savedIdRef.current = id;
    var item = {
      id: id, type: 'adventure', title: story.title || (studentMode ? offlineText(t, 'student_title', 'My adventure') : offlineText(t, 'title', 'Offline adventure')),
      meta: offlineText(t, 'meta', '{count} scenes · plays without AI', { count: story.scenes.length }),
      timestamp: existing && existing.timestamp ? existing.timestamp : new Date(),
      data: studentMode ? { kind: 'student-story', studentStory: story, selfCheck: Object.assign({}, selfCheck), ready: ok } : { offlineStory: story, offlineOnly: offlineOnly }
    };
    props.setHistory(function (prev) {
      var list = Array.isArray(prev) ? prev : [];
      return list.some(function (h) { return h && h.id === id; }) ? list.map(function (h) { return h && h.id === id ? Object.assign({}, h, item) : h; }) : list.concat([item]);
    });
    setDirty(false);
    if (studentMode) setNotice(ok ? offlineText(t, 'student_saved', 'Saved to your work. Hand it in when you are ready.') : offlineText(t, 'student_saved_draft', 'Saved. Finish the checklist so your story can be played.'));
    else setNotice(ok ? offlineText(t, 'saved', 'Saved. Students get it with this lesson.') : offlineText(t, 'saved_draft', 'Saved as a draft. Students cannot play it until the problems are fixed.'));
  };
  autosaveRef.current = studentMode && dirty && draft && (draft.title || draft.scenes.some(function (scene) { return String(scene.text || '').trim(); })) ? save : null;
  var remove = function () {
    if (!existing || typeof props.setHistory !== 'function') return;
    props.setHistory(function (prev) { return (Array.isArray(prev) ? prev : []).filter(function (h) { return !h || h.id !== existing.id; }); });
    setDraft(null); setDirty(false); setPreviewing(false); setNotice('');
  };
  var titleId = studentMode ? 'adventure-student-story-dialog-title' : 'adventure-offline-dialog-title';
  return <div role="presentation" style={{ zIndex: 10100 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={function (e) { if (e.target === e.currentTarget) close(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-adventure-offline-panel data-adventure-student-story={studentMode ? '' : undefined} style={adventureVisualTokens(props.theme)}
      className="relative w-full max-w-4xl max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl border border-[var(--av-line)] bg-[var(--av-wash)] p-4 sm:p-6 text-[var(--av-ink)] shadow-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="m-0 text-xl font-black flex items-center gap-2"><MapIcon size={20} aria-hidden="true" /> {studentMode ? offlineText(t, 'student_title', 'My adventure') : offlineText(t, 'title', 'Offline adventure')}</h2>
          <p className="m-0 mt-1 text-sm text-[var(--av-muted)]">{studentMode
            ? offlineText(t, 'student_intro', 'Write a scene, then add choices. Each choice leads to a new scene. Finish with at least one ending.')
            : offlineText(t, 'intro', 'A fixed branching story students can play without AI. Review it before students get it.')}</p>
        </div>
        <button ref={closeRef} type="button" aria-label={t('common.close')} onClick={close} className={OFFLINE_SECONDARY + ' min-w-11 shrink-0'}><X size={16} aria-hidden="true" /></button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {!studentMode && <button type="button" data-offline-make-ai onClick={makeWithAi} disabled={!aiReady || busy} aria-busy={busy} title={door && door.disabled ? door.title : undefined} className={OFFLINE_PRIMARY}>
          <Sparkles size={14} aria-hidden="true" /> {offlineText(t, 'make_ai', 'Make with AI')}
        </button>}
        {!draft && <button type="button" data-offline-blank onClick={function () { setDraft(_offlineBlankStory()); setDirty(true); }} className={OFFLINE_SECONDARY}>
          <Pencil size={14} aria-hidden="true" /> {offlineText(t, 'start_blank', 'Write my own')}
        </button>}
        {draft && <button type="button" data-offline-preview aria-pressed={previewing} disabled={!check || !check.ok} onClick={function () { setPreviewing(!previewing); }} className={OFFLINE_SECONDARY}>
          <Eye size={14} aria-hidden="true" /> {offlineText(t, 'preview', 'Preview')}
        </button>}
      </div>
      {!aiReady && Notice && <div className="mb-3" data-offline-ai-setup><Notice t={t} /></div>}
      {notice && <p role="status" aria-live="polite" className="m-0 mb-3 text-sm font-semibold">{notice}</p>}
      {draft && (previewing && check && check.ok
        ? <AdventureOfflinePlayer story={draft} t={t} theme={props.theme} onExit={function () { setPreviewing(false); }} />
        : <AdventureOfflineEditor story={draft} t={t} studentMode={studentMode} onChange={function (next) { setDraft(next); setDirty(true); }} />)}
      {draft && studentMode && <fieldset data-student-story-self-check className="m-0 mt-4 grid gap-1 rounded-xl border border-[var(--av-line)] px-3 py-2">
        <legend className="px-1 text-sm font-black">{offlineText(t, 'student_check_title', 'Check your story')}</legend>
        {STUDENT_STORY_CHECKS.map(function (row) {
          return <label key={row[0]} className="flex min-h-11 items-center gap-2 text-sm font-bold">
            <input type="checkbox" data-student-story-check={row[0]} checked={selfCheck[row[0]]} onChange={function (e) { var v = e.target.checked; setSelfCheck(function (prev) { var next = Object.assign({}, prev); next[row[0]] = v; return next; }); setDirty(true); }} className="h-5 w-5" />
            {offlineText(t, row[1], row[2])}
          </label>;
        })}
      </fieldset>}
      {draft && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--av-line)] pt-4">
        {!studentMode && <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={offlineOnly} onChange={function (e) { setOfflineOnly(e.target.checked); setDirty(true); }} className="h-5 w-5" />
          {offlineText(t, 'offline_only', 'Everyone plays this version (no AI story)')}
        </label>}
        <button type="button" data-offline-save onClick={save} disabled={!dirty || typeof props.setHistory !== 'function'} className={OFFLINE_PRIMARY + ' ml-auto'}>
          <Flag size={14} aria-hidden="true" /> {studentMode ? offlineText(t, 'student_save', 'Save to my work') : offlineText(t, 'save', 'Save to lesson')}
        </button>
        {existing && !studentMode && <button type="button" data-offline-remove onClick={remove} className={OFFLINE_SECONDARY}>{offlineText(t, 'delete', 'Remove offline version')}</button>}
      </div>}
    </div>
  </div>;
}

var AdventureOffline = {
  LIMITS: OFFLINE_LIMITS,
  normalize: normalizeOfflineStory,
  validate: validateOfflineStory,
  repair: repairOfflineStory,
  find: findOfflineAdventure,
  findDraft: findOfflineAdventureDraft,
  findStudentStory: findStudentStory,
  findReflection: findOfflineReflection,
  saveReflection: saveOfflineReflection,
  buildPrompt: buildOfflineStoryPrompt,
  parseResponse: parseOfflineStoryResponse,
  generate: generateOfflineStory,
  outline: outlineOfflineStory,
  Player: AdventureOfflinePlayer,
  Editor: AdventureOfflineEditor,
  Panel: AdventureOfflinePanel
};
