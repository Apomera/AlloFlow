'use strict';

// Apply only with --apply. Tests can use patchGeometryGeneration against a source
// string without touching production files. Keep this patch independent of terrain.
const fs = require('node:fs');
const path = require('node:path');

const helpers = String.raw`
  // ── Rich lesson generation helpers (pure except the injected AI request) ──
  var GEOMETRY_LESSON_DEPTHS = [
    { value: 1, id: 'quick', label: 'Quick', minutes: '10–15 min', activities: 2, budget: 450, calls: 2, repairs: 1, detail: 'Two connected activities and a small building challenge.' },
    { value: 2, id: 'guided', label: 'Guided', minutes: '25–35 min', activities: 4, budget: 700, calls: 3, repairs: 2, detail: 'Four activities with worked examples, hints, and a final design task.' },
    { value: 3, id: 'expedition', label: 'Expedition', minutes: '45–60 min', activities: 5, budget: 900, calls: 4, repairs: 2, detail: 'Five connected districts with scaffolded challenges, revision, and a showcase project.' }
  ];

  function geometryLessonDepth(value) {
    var index = Math.round(Number(value));
    return GEOMETRY_LESSON_DEPTHS[index >= 1 && index <= 3 ? index - 1 : 1];
  }

  function geometryGenerationBrief(options, profile) {
    return 'Design an original, connected Geometry World lesson for grade ' + options.grade + '. Topic: ' + options.topic + '.\n'
      + 'Depth: ' + profile.label + '; estimated student time ' + profile.minutes + '; exactly ' + profile.activities + ' linked activities. '
      + 'Depth changes the learning journey, not merely the number of questions. Teach, let the student construct or revise, measure, explain, and apply. '
      + 'Use a coherent setting, a recognizable arrival landmark, distinct activity landmarks, a walkable route, and an ending that uses earlier learning. '
      + 'Vary the structures: frames, terraces, open rooms, small bridges, patterned gardens, layered exhibits, or composite silhouettes. '
      + 'Use compact architecture, color-coded paths, sightlines and open building plots; avoid a row of unrelated solid boxes. '
      + 'The entire world shares one continuous ground plane. No teleport-only scenes, scripted gates, automatic building assessment, or unsupported mechanics. '
      + 'Ground bounds may expand within x/z -48..48; y is 0. All authored fills use integer coordinates, y 0..24, and at most ' + profile.budget + ' non-ground blocks total (inclusive fill volumes; ground does not count). '
      + 'Reserve open plots and at least 600 blocks of runtime capacity for student work. All measures refer to actually authored blocks. '
      + 'The world supports whole unit cubes; do not claim fractional cube dimensions. Fractions may use groups, ratios, colors or whole-block partitions. '
      + 'Each activity needs a measurable goal, a hands-on construction/revision task, success criteria the learner can check, a useful hint, and a reflection. '
      + 'The final activity should reuse earlier ideas in a design the student can showcase or send to Print Lab.\n';
  }

  function geometryPlanIssues(plan, profile) {
    var issues = [];
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return ['Return one plan object.'];
    if (typeof plan.title !== 'string' || !plan.title.trim()) issues.push('Add a meaningful title.');
    if (!Array.isArray(plan.activities) || plan.activities.length !== profile.activities) return issues.concat('Plan exactly ' + profile.activities + ' activities.');
    var ids = {};
    plan.activities.forEach(function(a, i) {
      if (!a || typeof a !== 'object') { issues.push('Activity ' + (i + 1) + ' must be an object.'); return; }
      ['id', 'title', 'challenge', 'hint', 'successCriteria', 'reflection'].forEach(function(k) {
        if (typeof a[k] !== 'string' || !a[k].trim()) issues.push('Activity ' + (i + 1) + ' needs ' + k + '.');
      });
      if (ids[a.id]) issues.push('Activity IDs must be unique.');
      ids[a.id] = true;
      if (!Number.isFinite(a.estimatedMinutes) || a.estimatedMinutes <= 0) issues.push('Each activity needs a positive estimatedMinutes number.');
    });
    return issues;
  }

  function geometryGeneratedLessonIssues(lesson, profile, plan) {
    var issues = [];
    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) return ['Return one complete lesson object.'];
    function text(value) { return typeof value === 'string' && value.trim().length > 0; }
    function integer(value) { return Number.isFinite(value) && Math.round(value) === value; }
    function point(value) { return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite); }
    var blocks = ['stone','grass','wood','diamond','gold','sand','glass','brick','ice','water','lava','torch'];
    var g = lesson.ground;
    var groundValid = g && ['xMin','xMax','zMin','zMax','y'].every(function(k) { return integer(g[k]); }) && g.y === 0
      && g.xMin >= -48 && g.xMax <= 48 && g.zMin >= -48 && g.zMax <= 48 && g.xMin <= g.xMax && g.zMin <= g.zMax && blocks.indexOf(g.type) >= 0;
    if (!groundValid) issues.push('Ground must be a valid rectangle at y=0, within -48..48, with a supported material.');
    function onGround(pos) { return groundValid && point(pos) && pos[0] >= g.xMin && pos[0] <= g.xMax && pos[2] >= g.zMin && pos[2] <= g.zMax && pos[1] >= 1 && pos[1] <= 24; }
    if (!text(lesson.title) || !text(lesson.description)) issues.push('Include title and student-facing description.');
    if (!Array.isArray(lesson.objectives) || lesson.objectives.length < profile.activities || !lesson.objectives.every(text)) issues.push('Include a clear objective for each activity.');
    if (!onGround(lesson.spawnPoint)) issues.push('Place the spawn point above the ground inside its bounds.');
    var structures = Array.isArray(lesson.structures) ? lesson.structures : [];
    if (structures.length < profile.activities || structures.length > 180) issues.push('Include ' + profile.activities + '..180 compact fill structures.');
    var byId = {}, cost = 0, goodStructures = [];
    structures.forEach(function(s, i) {
      if (!s || !text(s.id) || byId[s.id]) { issues.push('Every structure needs a unique id (structure ' + (i + 1) + ').'); return; }
      byId[s.id] = s;
      var valid = s.type === 'fill' && ['x1','x2','y1','y2','z1','z2'].every(function(k) { return integer(s[k]); })
        && s.x1 <= s.x2 && s.y1 <= s.y2 && s.z1 <= s.z2 && s.x1 >= -48 && s.x2 <= 48 && s.z1 >= -48 && s.z2 <= 48
        && s.y1 >= 0 && s.y2 <= 24 && blocks.indexOf(s.block) >= 0;
      if (!valid) { issues.push('Fix integer bounds/material for structure ' + s.id + '.'); return; }
      if (groundValid && (s.x1 < g.xMin || s.x2 > g.xMax || s.z1 < g.zMin || s.z2 > g.zMax)) issues.push('Structure ' + s.id + ' extends beyond the ground.');
      var groundOverlay = s.measurementLayer === 'ground' && s.y1 === 0 && s.y2 === 0;
      if (s.measurementLayer === 'ground' && !groundOverlay) issues.push('Ground overlays must be flat at y=0; fix ' + s.id + '.');
      if (!groundOverlay) {
        cost += (s.x2 - s.x1 + 1) * (s.y2 - s.y1 + 1) * (s.z2 - s.z1 + 1);
        goodStructures.push(s);
      }
    });
    if (cost > profile.budget) issues.push('Authored structures cost ' + cost + ' blocks; maximum ' + profile.budget + '. Redesign compactly and recalculate affected questions; do not drop learning activities.');
    function blocked(pos) { return point(pos) && goodStructures.some(function(s) { return pos[0] >= s.x1 - 0.4 && pos[0] <= s.x2 + 0.4 && pos[2] >= s.z1 - 0.4 && pos[2] <= s.z2 + 0.4 && pos[1] - 1.6 <= s.y2 + 0.5 && pos[1] >= s.y1 - 0.5; }); }
    if (blocked(lesson.spawnPoint)) issues.push('Spawn is inside a structure. Move it to a clear walking area.');
    function checkQuestion(q, label) {
      if (!q || !text(q.text) || !Array.isArray(q.choices) || q.choices.length !== 3 || !q.choices.every(function(c) { return text(c) || Number.isFinite(c); }) || !integer(q.correct) || q.correct < 0 || q.correct > 2) {
        issues.push(label + ' needs a question with three choices and a valid correct index.'); return;
      }
      if (q.measurement) {
        var m = q.measurement, s = byId[m.structureId], value = null;
        if (s && s.measurementLayer !== 'ground') {
          var x = s.x2 - s.x1 + 1, y = s.y2 - s.y1 + 1, z = s.z2 - s.z1 + 1;
          if (m.quantity === 'volume') value = x * y * z;
          if (m.quantity === 'footprint-area') value = x * z;
          if (m.quantity === 'footprint-perimeter') value = 2 * (x + z);
        }
        if (!Number.isFinite(value) || m.expected !== value || parseFloat(String(q.choices[q.correct])) !== value) issues.push(label + ' measurement/answer disagrees with the referenced inclusive block dimensions.');
      }
      if (q.followUp !== undefined) {
        if (!Array.isArray(q.followUp) || q.followUp.length > 3) issues.push(label + ' has invalid follow-up questions.');
        else q.followUp.forEach(function(f, i) { if (f && f.followUp) issues.push('Only one follow-up level is supported.'); else checkQuestion(f, label + ' step ' + (i + 1)); });
      }
    }
    var npcs = Array.isArray(lesson.npcs) ? lesson.npcs : [], npcNames = {};
    if (npcs.length < profile.activities + 1 || npcs.length > 12) issues.push('Include an arrival guide and one named mentor per activity (maximum 12 NPCs).');
    npcs.forEach(function(n, i) {
      if (!n || !text(n.name) || npcNames[n.name]) { issues.push('NPCs need unique names.'); return; }
      npcNames[n.name] = n;
      if (!onGround(n.position) || blocked([n.position && n.position[0], (n.position && n.position[1]) + 1, n.position && n.position[2]])) issues.push('Place NPC ' + n.name + ' at a clear accessible ground spot.');
      if (!text(n.dialogue)) issues.push('NPC ' + n.name + ' needs teaching dialogue.');
      if (n.question) checkQuestion(n.question, n.name);
    });
    var activities = Array.isArray(lesson.activities) ? lesson.activities : [];
    if (activities.length !== profile.activities) issues.push('Preserve all ' + profile.activities + ' planned activities.');
    var activityIds = {};
    activities.forEach(function(a, i) {
      if (!a || typeof a !== 'object') { issues.push('Invalid activity ' + (i + 1) + '.'); return; }
      ['id','title','npcName','challenge','hint','successCriteria','reflection'].forEach(function(k) { if (!text(a[k])) issues.push('Activity ' + (i + 1) + ' needs ' + k + '.'); });
      if (activityIds[a.id]) issues.push('Activity IDs must be unique.');
      activityIds[a.id] = true;
      if (plan && plan.activities[i] && a.id !== plan.activities[i].id) issues.push('Preserve the planned activity order and IDs.');
      if (!Number.isFinite(a.estimatedMinutes) || a.estimatedMinutes <= 0) issues.push('Each activity needs estimatedMinutes.');
      if (!onGround(a.position) || a.position[1] < 2 || blocked(a.position)) issues.push('Activity ' + a.id + ' needs a safe adjacent viewpoint at eye height (y=3).');
      if (!Array.isArray(a.structureIds) || !a.structureIds.length || a.structureIds.some(function(id) { return !byId[id] || byId[id].measurementLayer === 'ground'; })) issues.push('Activity ' + a.id + ' must reference its existing non-ground teaching structures by ID.');
      var mentor = npcNames[a.npcName];
      if (!mentor || !mentor.question) issues.push('Activity ' + a.id + ' needs its named mentor and a valid check-for-understanding question.');
      if (profile.value >= 2 && mentor && mentor.question && (!Array.isArray(mentor.question.followUp) || mentor.question.followUp.length < 1)) issues.push('Add scaffolded follow-up questions for ' + a.npcName + '.');
    });
    return issues.slice(0, 40);
  }

  async function runGeometryLessonGeneration(options) {
    var profile = geometryLessonDepth(options.depth), repairs = profile.repairs, calls = 0;
    var isCurrent = options.isCurrent || function() { return true; };
    function guard() { if (!isCurrent()) { var error = new Error('Generation canceled'); error.code = 'GW_GENERATION_CANCELLED'; throw error; } }
    function progress(label) { guard(); if (options.onProgress) options.onProgress({ label: label, call: calls + 1, planned: profile.calls, max: profile.calls + profile.repairs }); }
    async function request(prompt, label, check) {
      var nextPrompt = prompt;
      while (true) {
        progress(label); calls++;
        var raw = await options.callGemini(nextPrompt, true);
        guard();
        var parsed, problems;
        try { parsed = parseAiJson(raw); problems = check ? check(parsed) : []; }
        catch (error) { problems = ['Invalid JSON: ' + error.message]; }
        if (!problems.length) return parsed;
        if (repairs <= 0) throw new Error('The lesson still needs repair: ' + problems.slice(0, 3).join(' '));
        repairs--;
        nextPrompt = prompt + '\nREPAIR REQUIRED. Return the complete corrected JSON. Keep every required activity and mathematical target.\nIssues:\n- ' + problems.join('\n- ')
          + '\nPrevious response:\n' + (typeof raw === 'string' ? raw : JSON.stringify(raw));
        label = 'Repairing lesson checks';
      }
    }
    var brief = geometryGenerationBrief(options, profile);
    var plan = await request(brief + '\nFirst plan the expedition; do not generate blocks yet. Return ONLY JSON: '
      + '{"title":"...","setting":"...","route":"Walkable route and visual landmarks", "activities":[{"id":"market","title":"...","challenge":"Student builds/revises ...", "hint":"...", "successCriteria":"...", "reflection":"...", "estimatedMinutes":6}]}.'
      + (options.seedLesson ? '\nRefine this existing lesson to satisfy the teacher request: ' + options.refinement + '\n' + JSON.stringify(options.seedLesson) : ''),
      'Planning the learning journey', function(value) { return geometryPlanIssues(value, profile); });
    var worldPrompt = brief + '\nApproved learning plan:\n' + JSON.stringify(plan) + '\n' + AI_WORLD_PROMPT_BASE;
    var lesson = await request(worldPrompt, 'Building the world and activities', function(value) { return geometryGeneratedLessonIssues(value, profile, plan); });
    if (profile.value === 3) {
      lesson = await request(brief + '\n' + AI_FOLLOWUP_PROMPT.replace('{LESSON_JSON}', JSON.stringify(lesson))
        + '\nPreserve activities, IDs, geometry, correct answers, and measurement metadata. Enrich each mentor with a concise worked example, a misconception hint, and a reflection tied to their building task. '
        + 'Add one easier entry point and one optional extension within each activity challenge. Return the complete lesson JSON.',
        'Writing mentor hints and extensions', function(value) { return geometryGeneratedLessonIssues(value, profile, plan); });
    }
    if (profile.value >= 2) {
      lesson = await request(brief + '\n' + AI_REFINE_PROMPT.replace('{LESSON_JSON}', JSON.stringify(lesson)).replace('{REFINEMENT}',
        'Review the whole journey as a teacher and level designer. Recompute every mathematical answer from inclusive block dimensions. '
        + 'Check that each task has room to build, mentors are accessible, routes are connected, the arrival and ending are clear, and no topic was lost. '
        + 'Preserve the planned activities and IDs; repair the entire JSON if needed. Do not replace specific challenges with generic exploration. '
        + 'Keep every activity safe adjacent viewpoint at eye height y=3 and every referenced structure.\nApproved plan: ' + JSON.stringify(plan)),
        'Checking mathematics and the complete route', function(value) { return geometryGeneratedLessonIssues(value, profile, plan); });
    }
    guard();
    lesson.depth = profile.id;
    lesson.estimatedMinutes = profile.minutes;
    lesson.generation = { depth: profile.id, estimatedMinutes: profile.minutes, calls: calls, schemaVersion: 1 };
    lesson.activities.forEach(function(a) { a.depth = profile.id; });
    return lesson;
  }
  // ── End rich lesson generation helpers ──

`;

const worldPrompt = String.raw`  var AI_WORLD_PROMPT_BASE = 'Return ONLY one complete valid lesson JSON object, no markdown. Schema:\n'
    + '{"title":"...","description":"What students will do", "spawnPoint":[0,3,0], "objectives":["One measurable goal per activity"], '
    + '"ground":{"xMin":-24,"xMax":24,"zMin":-24,"zMax":24,"y":0,"type":"grass"}, '
    + '"structures":[{"id":"example","type":"fill","x1":4,"y1":1,"z1":4,"x2":6,"y2":2,"z2":5,"block":"brick"}], '
    + '"npcs":[{"name":"Arrival guide","position":[0,1,2],"color":8048861,"dialogue":"Welcome and route instructions","question":null}, '
    + '{"name":"Mentor","position":[2,1,4],"color":2461147,"dialogue":"Explain the model, the student building task, and a useful hint", '
    + '"question":{"text":"How many unit cubes in the brick prism?","choices":["12","10","6"],"correct":0,"measurement":{"structureId":"example","quantity":"volume","expected":12},'
    + '"followUp":[{"text":"How many cubes in one layer?","choices":["3","6","12"],"correct":1}]}}], '
    + '"activities":[{"id":"same-as-plan","title":"...","npcName":"Mentor","position":[0,3,4],"structureIds":["example"],'
    + '"challenge":"Precise hands-on task", "hint":"Scaffold", "successCriteria":"Learner checks their design using ...", "reflection":"Explain ...", "estimatedMinutes":6}]}\n'
    + 'Use the approved plan activities in order with unchanged IDs. Include a separate arrival guide and a named mentor/question for every activity. '
    + 'Each mentor teaches before questioning and explicitly gives the associated building challenge and hint. '
    + 'Guided and Expedition activities need followUp arrays with 1–3 progressively scaffolded three-choice questions. '
    + 'All main/follow-up questions have exactly 3 choices and a valid zero-based correct index. '
    + 'For numeric volume, footprint area, or footprint perimeter questions about one filled prism, include measurement metadata as shown; supported quantities are volume, footprint-area, footprint-perimeter. '
    + 'Use inclusive dimensions x2-x1+1, y2-y1+1, z2-z1+1. The correct choice starts with the numeric answer. Other questions may omit measurement. '
    + 'Give each compact fill a unique ID and each activity the IDs of all its teaching structures. Materials: stone, grass, wood, diamond, gold, sand, glass, brick, ice, water, torch. '
    + 'Ground supplies the floor; do not repeat a full floor in structures. Paths and plot markings may be narrow fills at y=0 with measurementLayer:"ground"; only flat y=0 fills can use this tag, and these do not count against the authored-block budget. All teaching structures start at y=1 or higher. Ground and decorations are not part of measured teaching shapes. '
    + 'Use separate clear ground spots for the spawn and activity viewpoints (eye height y=3) and for mentors (y=1). Never put them inside or above solid exhibits. '
    + 'Everything must fit within the ground bounds. Separate teaching structures so their measurements are unambiguous. Leave walking routes and empty student construction plots. '
    + 'Do not add unsupported structure types, arbitrary code, invented reward/gate mechanics, or multiple scenes.';

`;

const handler = String.raw`      var aiGenerationRef = React.useRef({ id: 0, running: false, mounted: true });
      React.useEffect(function() {
        aiGenerationRef.current.mounted = true;
        // A saved busy flag must not strand the controls after re-entry.
        if (d.aiGenerating && !aiGenerationRef.current.running) upd({ aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: '' });
        return function() { aiGenerationRef.current.mounted = false; aiGenerationRef.current.id++; aiGenerationRef.current.running = false; };
      }, []);

      function cancelWorldGeneration() {
        aiGenerationRef.current.id++;
        aiGenerationRef.current.running = false;
        upd({ aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: 'Generation canceled. Your current world is unchanged.' });
      }

      function beginWorldGeneration(seedLesson, refinement) {
        var state = aiGenerationRef.current;
        if (!callGemini || state.running || (!seedLesson && !aiPrompt.trim())) return Promise.resolve(null);
        var requestId = ++state.id;
        state.running = true;
        var originalEngine = window[engineKey];
        var originalLesson = originalEngine && originalEngine._currentLesson;
        function current() { return state.mounted && state.id === requestId; }
        function sameWorld() { return window[engineKey] === originalEngine && (!originalEngine || originalEngine._currentLesson === originalLesson); }
        upd({ aiGenerating: true, aiCurrentPass: 0, aiGenerationStatus: 'Planning the learning journey' });
        return runGeometryLessonGeneration({
          topic: seedLesson ? seedLesson.title : aiPrompt.trim(), grade: aiGradeLevel, depth: aiLessonDepth,
          seedLesson: seedLesson, refinement: refinement, callGemini: callGemini, isCurrent: function() { return current() && sameWorld(); },
          onProgress: function(progress) { upd({ aiCurrentPass: progress.call, aiGenerationStatus: progress.label }); }
        }).then(function(lesson) {
          if (!current()) return null;
          if (window[engineKey] !== originalEngine || (originalEngine && originalEngine._currentLesson !== originalLesson)) {
            upd({ aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: 'Generation stopped because you changed worlds. Generate again in this world.' });
            return null;
          }
          finishGeneration(lesson);
          return lesson;
        }).catch(function(error) {
          if (!current()) return null;
          if (error.code === 'GW_GENERATION_CANCELLED') {
            upd({ aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: 'Generation stopped because you changed worlds. Generate again in this world.' });
            return null;
          }
          var message = error.message || 'Unknown error';
          upd({ aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: 'Could not finish this lesson. ' + message });
          if (addToast) addToast('AI generation failed: ' + message + ' Your current world was kept.', 'error');
          return null;
        }).then(function(result) { if (current()) state.running = false; return result; });
      }

      var generateWorld = function() { return beginWorldGeneration(null, ''); };

`;

const controls = String.raw`            // Lesson depth changes the student journey and estimated lesson time.
            el('div', { style: { flexBasis: '100%', padding: '10px 0', display: 'grid', gap: '6px' } },
              el('label', { htmlFor: 'gw-lesson-depth', style: { fontSize: '12px', fontWeight: 700 } }, 'Lesson depth · ' + aiDepthProfile.label + ' · ' + aiDepthProfile.minutes),
              el('input', { id: 'gw-lesson-depth', type: 'range', min: 1, max: 3, step: 1, value: aiLessonDepth, disabled: aiGenerating,
                'aria-label': 'Lesson depth and estimated length', 'aria-valuetext': aiDepthProfile.label + ', ' + aiDepthProfile.minutes + ', ' + aiDepthProfile.activities + ' activities',
                'aria-describedby': 'gw-lesson-depth-help', onChange: function(ev) { upd('aiLessonDepth', Number(ev.target.value)); },
                style: { width: '100%', minHeight: '44px', accentColor: '#a78bfa', margin: 0 } }),
              el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                el('span', null, 'Quick'), el('span', null, 'Guided'), el('span', null, 'Expedition')),
              el('p', { id: 'gw-lesson-depth-help', style: { margin: 0, fontSize: '11px', lineHeight: 1.5, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                aiDepthProfile.detail + ' Longer lessons take more time to generate. Time estimates are for students; generation includes planning and checks.')
            ),
            el('button', {
              onClick: generateWorld, disabled: aiGenerating || !aiPrompt.trim(),
              title: 'Plan and generate a connected lesson with ' + aiDepthProfile.activities + ' activities',
              style: { background: aiGenerating ? '#334155' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, minHeight: '44px' }
            }, aiGenerating ? 'Creating lesson…' : 'Generate ' + aiDepthProfile.label.toLowerCase() + ' lesson'),
            aiGenerating && el('button', { type: 'button', onClick: cancelWorldGeneration,
              title: 'Keep your current world. A request already sent may finish, but its result will not be applied.',
              style: { minHeight: '44px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #64748b', color: 'var(--allo-stem-text, #e2e8f0)', background: 'var(--allo-stem-panel, #1e293b)', cursor: 'pointer' }
            }, 'Cancel generation'),
            d.aiGenerationStatus && el('p', { role: 'status', 'aria-live': 'polite', style: { flexBasis: '100%', fontSize: '11px', margin: '2px 0 6px', lineHeight: 1.5 } }, d.aiGenerationStatus),
`;

function patchGeometryGeneration(input) {
  const newline = input.includes('\r\n') ? '\r\n' : '\n';
  let source = input.replace(/\r\n/g, '\n');
  if (source.includes('// ── Rich lesson generation helpers')) throw new Error('Generation patch is already applied.');
  function replaceOnce(from, to) {
    const index = source.indexOf(from);
    if (index < 0 || source.indexOf(from, index + from.length) >= 0) throw new Error('Expected one patch anchor: ' + from.slice(0, 100));
    source = source.slice(0, index) + to + source.slice(index + from.length);
  }
  function replaceRegion(start, end, content) {
    const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
    if (first < 0 || last < 0) throw new Error('Missing patch region: ' + start);
    source = source.slice(0, first) + content + source.slice(last);
  }
  replaceRegion('  var AI_WORLD_PROMPT_BASE = ', '  var AI_REFINE_PROMPT = ', helpers + worldPrompt);
  replaceOnce("    + '- Ensure all coordinates are valid (between -4 and 24)\\n'", "    + '- Keep integer x/z coordinates within -48..48 and the ground rectangle, y within 0..24. Preserve every planned activity and referenced structure.\\n'");
  replaceOnce("    + '- Ensure NPCs are positioned above their structures\\n'", "    + '- Keep NPCs at accessible clear ground spots next to their teaching structures (y=1), with safe adjacent activity viewpoints at eye height y=3.\\n'");
  replaceOnce('      var aiPassCount = d.aiPassCount || 2; // 1=quick, 2=refine, 3=refine+followups',
    '      var aiLessonDepth = geometryLessonDepth(d.aiLessonDepth || d.aiPassCount || 2).value;\n      var aiDepthProfile = geometryLessonDepth(aiLessonDepth);');
  replaceRegion('      var generateWorld = function() {', '      // ── Validate & sanitize AI-generated lesson JSON ──', handler);
  replaceRegion('        // Budget the total block count.', '        // Validate NPCs', String.raw`        // Ground is terrain, not part of the interactive authored-block budget.
        // Reject the whole lesson rather than remove a structure still referenced by
        // a question. The staged generator repairs this before reaching the loader.
        var authoredCost = lesson.structures.reduce(function(total, s) {
          if (s.measurementLayer === 'ground') {
            if (s.y1 !== 0 || s.y2 !== 0) throw new Error('Ground overlays must be flat at y=0.');
            return total;
          }
          return total + (s.x2 - s.x1 + 1) * (s.y2 - s.y1 + 1) * (s.z2 - s.z1 + 1);
        }, 0);
        if (authoredCost > 900) throw new Error('Lesson uses ' + authoredCost + ' authored blocks; the limit is 900 so students have room to build. Reduce structure dimensions and update related questions.');
`);
  // This localized validation region is independently extractable by legacy tests.
  const vStart = source.indexOf('      function validateLesson(lesson) {');
  const vEnd = source.indexOf('      function finishGeneration(lesson) {', vStart);
  let validation = source.slice(vStart, vEnd);
  validation = validation.replace(/Math\.max\(-4, Math\.min\(30,/g, 'Math.max(-48, Math.min(48,')
    .replace(/Math\.min\(30, Math\.round\(s\./g, 'Math.min(48, Math.round(s.')
    .replace(/Math\.min\(20, Math\.round\(s\./g, 'Math.min(24, Math.round(s.');
  source = source.slice(0, vStart) + validation + source.slice(vEnd);
  replaceOnce("aiGenerating: false, aiCurrentPass: 0, activeLesson: 'ai_generated'", "aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: 'Lesson ready. Saved to My Lessons.', activeLesson: 'ai_generated'");
  replaceRegion('      var refineLesson = function() {', '      var engine = window[engineKey];', String.raw`      var refineLesson = function() {
        if (!aiRefinePrompt.trim() || !lastGeneratedLesson) return;
        return beginWorldGeneration(lastGeneratedLesson, aiRefinePrompt.trim());
      };

`);
  replaceRegion('            // Depth (API calls) selector', '            // Surprise Me (grade-aware topics)', controls);
  return source.replace(/\n/g, newline);
}

module.exports = { patchGeometryGeneration };
if (require.main === module) {
  if (!process.argv.includes('--apply')) throw new Error('Pass --apply to update the canonical source.');
  const target = path.resolve(__dirname, '../../stem_lab/stem_tool_geometryworld.js');
  const source = fs.readFileSync(target, 'utf8');
  const next = patchGeometryGeneration(source);
  const fd = fs.openSync(target, 'r+');
  try { fs.writeFileSync(fd, next, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(next)); }
  finally { fs.closeSync(fd); }
  console.log('Applied lesson generation patch to ' + target);
}
