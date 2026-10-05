/* Perception Lab: original SVG experiments; no external graphics or runtime dependencies. */
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  var own = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };
  var object = function (value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
  var text = function (value, max) { return typeof value === 'string' ? value.slice(0, max) : ''; };
  function number(value, fallback, min, max) {
    if (typeof value !== 'number' && typeof value !== 'string') return fallback;
    if (value === '' || (typeof value === 'string' && !value.trim())) return fallback;
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  var EXPERIMENTS = [
    { id: 'brightness', title: 'Brightness & context', family: 'Color and light',
      question: 'Which center square looks brighter?', choices: ['Left', 'Same', 'Right', 'Unsure'],
      description: 'Two gray squares on different backgrounds. Adjust the backgrounds, then compare without them.',
      explanation: 'Both center squares use the same RGB fill. Surrounding light and dark regions can change apparent brightness. The drawing values describe this image, not a calibrated measurement of your display.',
      result: 'Both squares: RGB {target}, {target}, {target}.',
      source: 'https://michaelbach.de/ot/lum-inducedBrightness/index.html',
      controls: [{ key: 'contrast', label: 'Background difference', min: 0, max: 100, value: 80, unit: '%' }, { key: 'target', label: 'Center gray value', min: 48, max: 208, value: 128, unit: ' RGB' }] },
    { id: 'ebbinghaus', title: 'Size & surroundings', family: 'Size and geometry',
      question: 'Which orange center circle looks larger?', choices: ['Left', 'Same', 'Right', 'Unsure'],
      description: 'Orange circles surrounded by different rings of blue circles. Change the surrounding circle size or gap.',
      explanation: 'The two orange circles keep the same diameter. Size judgments can change with the surrounding circles. Remove the surroundings and compare your impression with the outlines.',
      result: 'Both center diameters: 48 drawing units.', source: 'https://michaelbach.de/ot/cog-Ebbinghaus/index.html',
      controls: [{ key: 'surround', label: 'Large surrounding radius', min: 20, max: 50, value: 36, unit: ' units' }, { key: 'gap', label: 'Gap around center', min: 4, max: 28, value: 12, unit: ' units' }] },
    { id: 'mullerLyer', title: 'Lines & arrowheads', family: 'Size and geometry',
      question: 'Which horizontal shaft looks longer?', choices: ['Top', 'Same', 'Bottom', 'Unsure'],
      description: 'Two horizontal shafts with different arrowhead arrangements. Adjust the fins while observing the shafts.',
      explanation: 'The horizontal shafts have identical endpoints and lengths. Changing the surrounding fins can change apparent length. The guides measure the shafts, excluding their fins.',
      result: 'Both shafts: 400 drawing units.', source: 'https://michaelbach.de/ot/sze-muelue/index.html',
      controls: [{ key: 'angle', label: 'Fin angle', min: 15, max: 75, value: 30, unit: '°' }, { key: 'fin', label: 'Fin length', min: 12, max: 75, value: 42, unit: ' units' }] },
    { id: 'cafeWall', title: 'Café wall', family: 'Patterns and angles',
      question: 'How do the horizontal mortar bands look?', choices: ['Level', 'Tilted', 'Mixed', 'Unsure'],
      description: 'Alternating dark and light square tiles separated by gray mortar. Shift every second row.',
      explanation: 'All mortar bands are horizontal and parallel. Staggered tiles can make the bands look tilted. Try aligned rows or change the mortar width; the strength of the effect may change.',
      result: 'Every mortar guide has identical start and end height.', source: 'https://michaelbach.de/ot/ang-cafewall/index.html',
      controls: [{ key: 'offset', label: 'Alternate row offset', min: 0, max: 100, value: 50, unit: '% of tile' }, { key: 'mortar', label: 'Mortar width', min: 1, max: 14, value: 5, unit: ' units' }] },
    { id: 'necker', title: 'Ambiguous cube', family: 'Depth and interpretation',
      question: 'Which square face seems closest?', choices: ['Lower left', 'Upper right', 'It changes', 'Unsure'],
      description: 'A wireframe cube with two possible depth interpretations. Compare it with optional face cues.',
      explanation: 'A flat wireframe can support more than one depth interpretation. Face cues are hints added to this drawing; they do not establish a single correct interpretation of the original ambiguous figure.',
      result: 'The unshaded drawing has no unique front face.', source: 'https://michaelbach.de/ot/sze-Necker/index.html',
      controls: [{ key: 'depth', label: 'Projected depth offset', min: 45, max: 125, value: 95, unit: ' units' }], cue: true },
    { id: 'moire', title: 'Moiré interference', family: 'Patterns and angles',
      question: 'What structure do the overlapping lines suggest?', choices: ['Broad bands', 'Fine lines', 'Both', 'Unsure'],
      description: 'Two line grids overlap. Rotate the second grid or change their shared spacing.',
      explanation: 'Moiré bands emerge from overlapping repeated patterns. These larger structures are present in the combined image; they are not merely imagined motion. Hide the second grid to inspect the first.',
      result: 'Two grids share a spacing of {spacing} drawing units; their angle is {angle}°.', source: 'https://michaelbach.de/ot/lum-moire2/index.html',
      controls: [{ key: 'angle', label: 'Grid crossing angle', min: 0, max: 30, value: 5, unit: '°', step: 0.1 }, { key: 'spacing', label: 'Line spacing', min: 8, max: 24, value: 12, unit: ' units' }] }
  ];
  var MATCHING = { brightness: { min: 16, max: 240, value: 128, unit: 'RGB' }, ebbinghaus: { min: 32, max: 72, value: 48, unit: 'units' }, mullerLyer: { min: 250, max: 550, value: 400, unit: 'units' } };
  function experiment(id) { return EXPERIMENTS.find(function (item) { return item.id === id; }) || EXPERIMENTS[0]; }
  function normalizeModel(id, raw) {
    var meta = experiment(id), d = object(raw), model = { context: d.context !== false, reveal: d.reveal === true,
      prediction: meta.choices.indexOf(d.prediction) >= 0 ? d.prediction : '', note: text(d.note, 500) };
    meta.controls.forEach(function (control) {
      var value = number(d[control.key], control.value, control.min, control.max), step = control.step || 1;
      model[control.key] = Math.round(value / step) * step;
      if (step < 1) model[control.key] = Number(model[control.key].toFixed(1));
    });
    if (meta.cue) model.cue = ['none', 'front', 'back'].indexOf(d.cue) >= 0 ? d.cue : 'none';
    if (own(MATCHING, meta.id)) {
      var matching = MATCHING[meta.id];
      model.matching = d.matching === true; model.swap = d.swap === true;
      model.matchValue = Math.round(number(d.matchValue, meta.id === 'brightness' ? model.target : matching.value, matching.min, matching.max));
    }
    return model;
  }
  function repeatMetadata(id, model, raw) {
    var d = object(raw), group = text(d.id, 96).trim(), config = MATCHING[id];
    if (!config || !model.matching || !group || !Number.isInteger(d.trial) || d.trial < 1 || d.trial > 3 || typeof d.startValue !== 'number' || !Number.isFinite(d.startValue) || d.startValue < config.min || d.startValue > config.max) return null;
    return { id: group, trial: d.trial, startValue: Math.round(d.startValue) };
  }
  function normalize(raw) {
    var d = object(raw), models = object(d.models), out = { experiment: experiment(d.experiment).id, models: {}, expanded: d.expanded === true, studies: [], comparison: null };
    EXPERIMENTS.forEach(function (item) { out.models[item.id] = normalizeModel(item.id, own(models, item.id) ? models[item.id] : {}); });
    var usedIds = Object.create(null);
    if (Array.isArray(d.studies)) d.studies.slice(-24).forEach(function (item, index) {
      item = object(item);
      if (!EXPERIMENTS.some(function (meta) { return meta.id === item.experiment; })) return;
      var seed = text(item.id, 96).trim() || 'legacy-observation-' + (index + 1), id = seed, suffix = 1;
      while (own(usedIds, id)) { var tail = '-' + (++suffix); id = seed.slice(0, 96 - tail.length) + tail; }
      usedIds[id] = true;
      var record = { id: id, experiment: item.experiment, model: normalizeModel(item.experiment, item.model), date: text(item.date, 40) };
      var repeat = repeatMetadata(record.experiment, record.model, item.repeat);
      if (repeat) record.repeat = repeat;
      out.studies.push(record);
    });
    var ref = object(d.comparison);
    if (EXPERIMENTS.some(function (meta) { return meta.id === ref.experiment; })) out.comparison = { experiment: ref.experiment, model: normalizeModel(ref.experiment, ref.model) };
    return out;
  }
  function measurements(id, raw) {
    var meta = experiment(id), m = normalizeModel(meta.id, raw);
    if (!own(MATCHING, meta.id)) return null;
    var reference = meta.id === 'brightness' ? m.target : MATCHING[meta.id].value;
    var comparison = m.matching ? m.matchValue : reference, difference = comparison - reference;
    return { reference: reference, comparison: comparison, difference: difference, percent: meta.id === 'brightness' ? null : difference / reference * 100, unit: meta.id === 'brightness' ? 'RGB' : 'units' };
  }
  function deleteStudy(raw, id) {
    var state = normalize(raw), index = state.studies.findIndex(function (item) { return item.id === id; });
    if (index < 0) return { state: state, undo: null };
    var study = state.studies.splice(index, 1)[0];
    return { state: state, undo: { study: study, index: index } };
  }
  function notebookCapacity(raw) {
    var saved = normalize(raw).studies.length;
    return { limit: 24, saved: saved, free: 24 - saved };
  }
  function deleteSavedStudy(raw, groupId) {
    var state = normalize(raw), group = text(groupId, 96).trim(), records = [];
    state.studies.forEach(function (study, index) { if (group && study.repeat && study.repeat.id === group) records.push({ study: study, index: index }); });
    if (!records.length) return { state: state, undo: null };
    state.studies = state.studies.filter(function (study) { return !study.repeat || study.repeat.id !== group; });
    return { state: state, undo: { groupId: group, records: records } };
  }
  function restoreDeletedStudy(raw, value) {
    var state = normalize(raw), undo = object(value), entries = undo.records;
    if (typeof undo.groupId !== 'string' || !undo.groupId || undo.groupId.length > 96 || undo.groupId.trim() !== undo.groupId || !Array.isArray(entries) || !entries.length || entries.length > 24 || state.studies.length + entries.length > 24) return state;
    var records = notebookRecords(entries.map(function (entry) { return object(entry).study; }));
    if (!records || records.some(function (record) { return !record.repeat || record.repeat.id !== undo.groupId; }) || state.studies.some(function (record) { return record.repeat && record.repeat.id === undo.groupId || records.some(function (restored) { return restored.id === record.id; }); })) return state;
    var previous = -1;
    if (!entries.every(function (entry, offset) { var index = object(entry).index, valid = Number.isInteger(index) && index > previous && index <= state.studies.length + offset; previous = index; return valid; })) return state;
    entries.forEach(function (entry, index) { state.studies.splice(entry.index, 0, records[index]); });
    return state;
  }
  // Imported files must already contain valid exported observations. Do not
  // repair them with defaults or truncate an oversized notebook while reading.
  function notebookRecords(values) {
    if (!Array.isArray(values) || !values.length || values.length > 24) return null;
    var ids = new Set(), records = [], valid = true;
    values.forEach(function (value) {
      var item = object(value), id = item.id;
      if (typeof id !== 'string' || !id || id.length > 96 || id.trim() !== id || ids.has(id) || !EXPERIMENTS.some(function (meta) { return meta.id === item.experiment; }) || typeof item.date !== 'string' || item.date.length > 40 || !item.model || typeof item.model !== 'object' || Array.isArray(item.model)) { valid = false; return; }
      var model = normalizeModel(item.experiment, item.model);
      if (!Object.keys(model).every(function (key) { return own(item.model, key) && item.model[key] === model[key]; })) { valid = false; return; }
      var record = { id: id, experiment: item.experiment, model: model, date: item.date };
      if (own(item, 'repeat')) {
        var repeat = object(item.repeat), normalized = repeatMetadata(item.experiment, model, repeat);
        if (!normalized || repeat.id !== normalized.id || repeat.id.length > 96 || !Number.isInteger(repeat.startValue) || repeat.startValue !== normalized.startValue) { valid = false; return; }
        record.repeat = normalized;
      }
      ids.add(id); records.push(record);
    });
    return valid ? records : null;
  }
  function parseNotebook(value) {
    var result = { status: 'json', records: [] }, payload;
    if (typeof value !== 'string') return result;
    if (value.length > 524288) { result.status = 'large'; return result; }
    try { payload = JSON.parse(value); } catch (_) { return result; }
    payload = object(payload);
    if (payload.schema !== 'alloflow.perception.notebook' || payload.version !== 1 || !Array.isArray(payload.studies)) { result.status = 'schema'; return result; }
    if (!payload.studies.length) { result.status = 'empty'; return result; }
    var records = notebookRecords(payload.studies);
    result.status = records ? 'ready' : 'records'; result.records = records || [];
    return result;
  }
  function notebookUnits(records) {
    var groups = new Map(), singles = [];
    records.forEach(function (record) {
      if (record.repeat) { if (!groups.has(record.repeat.id)) groups.set(record.repeat.id, []); groups.get(record.repeat.id).push(record); }
      else singles.push([record]);
    });
    return singles.concat(Array.from(groups.values()));
  }
  function notebookUnitFingerprint(records) {
    return JSON.stringify(records.map(function (record) {
      return JSON.stringify({ experiment: record.experiment, model: record.model, date: record.date, repeat: record.repeat ? { trial: record.repeat.trial, startValue: record.repeat.startValue } : null });
    }).sort());
  }
  function planNotebookImport(raw, values) {
    var state = normalize(raw), records = notebookRecords(values);
    var result = { status: 'records', state: state, additions: [], added: 0, skipped: 0, free: 24 - state.studies.length, remappedRecords: 0, remappedGroups: 0, fingerprint: JSON.stringify(state.studies) };
    if (!records) return result;
    var known = new Map();
    notebookUnits(state.studies).forEach(function (unit) { var fingerprint = notebookUnitFingerprint(unit); known.set(fingerprint, (known.get(fingerprint) || 0) + 1); });
    var reservedIds = new Set(state.studies.concat(records).map(function (record) { return record.id; })), claimedIds = new Set(state.studies.map(function (record) { return record.id; }));
    var reservedGroups = new Set(), claimedGroups = new Set(), selected = new Set(), groupMap = new Map(), serial = { observation: 0, study: 0 };
    state.studies.concat(records).forEach(function (record) { if (record.repeat) reservedGroups.add(record.repeat.id); });
    state.studies.forEach(function (record) { if (record.repeat) claimedGroups.add(record.repeat.id); });
    function fresh(kind, reserved) { var id; do { id = 'import-' + kind + '-' + (++serial[kind]); } while (reserved.has(id)); reserved.add(id); return id; }
    notebookUnits(records).forEach(function (unit) {
      var fingerprint = notebookUnitFingerprint(unit);
      if (known.get(fingerprint) > 0) { known.set(fingerprint, known.get(fingerprint) - 1); result.skipped += unit.length; return; }
      unit.forEach(function (record) { selected.add(record.id); });
      if (unit[0].repeat) {
        var groupId = unit[0].repeat.id, mapped = claimedGroups.has(groupId) ? fresh('study', reservedGroups) : groupId;
        if (mapped !== groupId) result.remappedGroups++;
        groupMap.set(groupId, mapped); claimedGroups.add(mapped);
      }
    });
    records.forEach(function (record) {
      if (!selected.has(record.id)) return;
      if (claimedIds.has(record.id)) { record.id = fresh('observation', reservedIds); result.remappedRecords++; }
      claimedIds.add(record.id);
      if (record.repeat) record.repeat.id = groupMap.get(record.repeat.id);
      result.additions.push(record);
    });
    result.added = result.additions.length;
    result.status = !result.added ? 'unchanged' : result.added > result.free ? 'capacity' : 'ready';
    if (result.status === 'ready') result.state.studies = state.studies.concat(result.additions);
    return result;
  }
  function restoreDeleted(raw, value) {
    var state = normalize(raw), undo = object(value), record = normalize({ studies: [undo.study] }).studies[0];
    if (!record || state.studies.length >= 24 || state.studies.some(function (item) { return item.id === record.id; })) return state;
    var index = Math.round(number(undo.index, state.studies.length, 0, state.studies.length));
    state.studies.splice(index, 0, record);
    return state;
  }
  function comparisonChanges(raw) {
    var state = normalize(raw), reference = state.comparison;
    if (!reference || reference.experiment !== state.experiment) return [];
    var current = state.models[state.experiment], previous = reference.model, keys = experiment(state.experiment).controls.map(function (control) { return control.key; });
    keys.push('context', 'reveal');
    if (own(current, 'cue')) keys.push('cue');
    if (own(current, 'matching')) { keys.push('matching', 'swap'); if (current.matching || previous.matching) keys.push('matchValue'); }
    return keys.filter(function (key) { return current[key] !== previous[key]; }).map(function (key) { return { key: key, before: previous[key], after: current[key] }; });
  }
  function sameStudySettings(id, first, second) {
    if (!own(MATCHING, id)) return false;
    var a = normalizeModel(id, first), b = normalizeModel(id, second), keys = experiment(id).controls.map(function (control) { return control.key; });
    keys.push('context', 'matching', 'swap');
    return keys.every(function (key) { return a[key] === b[key]; });
  }
  function studyStart(id, base, trial) {
    var config = MATCHING[id], reference = measurements(id, base).reference;
    return Math.round(trial === 2 ? (reference + config.max) / 2 : trial === 3 ? (config.min + reference * 3) / 4 : (config.min + reference) / 2);
  }
  function createStudy(id, raw, groupId, starts) {
    if (!own(MATCHING, id)) return null;
    var base = normalizeModel(id, raw), group = text(groupId, 96).trim();
    if (!base.matching || !group) return null;
    var study = { id: group, experiment: id, base: base, trials: [], revealed: false };
    if (starts !== undefined) {
      var config = MATCHING[id];
      if (!Array.isArray(starts) || starts.length !== 3 || !starts.every(function (value) { return Number.isInteger(value) && value >= config.min && value <= config.max; })) return null;
      study.starts = starts.slice();
    }
    return study;
  }
  function normalizeStudy(raw) {
    var d = object(raw), study = createStudy(d.experiment, d.base, d.id, d.starts);
    if (!study || !Array.isArray(d.trials) || d.trials.length > 3) return null;
    var valid = true;
    d.trials.forEach(function (value, index) {
      var item = object(value), model = normalizeModel(study.experiment, item.model), repeat = repeatMetadata(study.experiment, model, { id: study.id, trial: item.trial, startValue: item.startValue });
      var id = text(item.id, 96).trim();
      if (!repeat || item.trial !== index + 1 || !id || study.trials.some(function (trial) { return trial.id === id; }) || !model.prediction || !sameStudySettings(study.experiment, study.base, model) || study.starts && repeat.startValue !== study.starts[index]) { valid = false; return; }
      study.trials.push({ id: id, trial: item.trial, startValue: repeat.startValue, model: model, date: text(item.date, 40) });
    });
    study.revealed = d.revealed === true && study.trials.length === 3;
    return valid ? study : null;
  }
  function studyModel(raw) {
    var study = normalizeStudy(raw);
    if (!study || study.trials.length === 3) return null;
    var model = normalizeModel(study.experiment, study.base);
    model.matchValue = study.starts ? study.starts[study.trials.length] : studyStart(study.experiment, study.base, study.trials.length + 1);
    model.reveal = false; model.prediction = ''; if (study.trials.length) model.note = '';
    return model;
  }
  function recordStudyTrial(raw, value, expectedTrial, recordId, date) {
    var state = normalize(raw), study = normalizeStudy(value), id = text(recordId, 96).trim();
    var result = { state: state, study: study, recorded: false };
    if (!study || study.revealed || !id || state.studies.length >= 24 || state.experiment !== study.experiment || study.trials.length >= 3 || expectedTrial !== study.trials.length + 1 || state.studies.some(function (item) { return item.id === id || item.repeat && item.repeat.id === study.id && item.repeat.trial === expectedTrial; })) return result;
    var model = state.models[study.experiment];
    if (!model.matching || model.reveal || !model.prediction || !sameStudySettings(study.experiment, study.base, model)) return result;
    var trial = { id: id, trial: expectedTrial, startValue: study.starts ? study.starts[expectedTrial - 1] : studyStart(study.experiment, study.base, expectedTrial), model: normalizeModel(study.experiment, model), date: text(date, 40) };
    study.trials.push(trial);
    state.studies.push({ id: id, experiment: study.experiment, model: trial.model, date: trial.date, repeat: { id: study.id, trial: trial.trial, startValue: trial.startValue } });
    if (study.trials.length < 3) state.models[study.experiment] = studyModel(study);
    result.study = study; result.recorded = true;
    return result;
  }
  function studySummary(raw) {
    var study = normalizeStudy(raw);
    if (!study || !study.revealed || study.trials.length !== 3) return null;
    var values = study.trials.map(function (trial) { return trial.model.matchValue; }), sorted = values.slice().sort(function (a, b) { return a - b; });
    var reference = measurements(study.experiment, study.base).reference, median = sorted[1], difference = median - reference;
    return { count: 3, reference: reference, values: values, starts: study.trials.map(function (trial) { return trial.startValue; }), median: median, min: sorted[0], max: sorted[2], range: sorted[2] - sorted[0], difference: difference, percent: study.experiment === 'brightness' ? null : difference / reference * 100, unit: MATCHING[study.experiment].unit };
  }
  function revealStudy(raw, value) {
    var state = normalize(raw), study = normalizeStudy(value);
    if (!study || study.trials.length !== 3 || state.experiment !== study.experiment || !sameStudySettings(study.experiment, study.base, state.models[study.experiment])) return { state: state, study: study, revealed: false };
    study.revealed = true;
    state.models[study.experiment].reveal = true;
    state.studies.forEach(function (item) { if (item.repeat && item.repeat.id === study.id && item.experiment === study.experiment && sameStudySettings(study.experiment, study.base, item.model) && study.trials.some(function (trial) { return trial.id === item.id && trial.trial === item.repeat.trial; })) item.model.reveal = true; });
    return { state: state, study: study, revealed: true };
  }
  function savedStudy(raw, groupId) {
    var state = normalize(raw), records = state.studies.filter(function (item) { return item.repeat && item.repeat.id === groupId; }).sort(function (a, b) { return a.repeat.trial - b.repeat.trial; });
    var result = { count: records.length, valid: false, complete: false, study: null };
    if (!records.length) return result;
    var first = records[0], seen = Object.create(null);
    result.valid = records.length <= 3 && records.every(function (item) { var unique = !seen[item.repeat.trial]; seen[item.repeat.trial] = true; return unique && !!item.model.prediction && item.experiment === first.experiment && sameStudySettings(first.experiment, first.model, item.model); });
    result.complete = result.valid && records.length === 3;
    if (result.complete) result.study = normalizeStudy({ id: groupId, experiment: first.experiment, base: first.model, revealed: records.every(function (item) { return item.model.reveal; }), trials: records.map(function (item) { return { id: item.id, trial: item.repeat.trial, startValue: item.repeat.startValue, model: item.model, date: item.date }; }) });
    return result;
  }
  function revealSavedStudy(raw, groupId) {
    var state = normalize(raw), group = savedStudy(state, groupId);
    if (group.complete && group.study) state.studies.forEach(function (item) { if (item.repeat && item.repeat.id === groupId) item.model.reveal = true; });
    return state;
  }
  function recordedTrial(raw, groupId, trial) {
    var group = savedStudy(raw, groupId);
    var result = { status: 'incomplete', count: group.count, experiment: null, trial: null, recordId: null, date: '', model: null, startValue: null };
    if (group.count && (!group.valid || group.count === 3 && !group.study)) { result.status = 'conflict'; return result; }
    if (!group.complete || !group.study) return result;
    if (!group.study.revealed) { result.status = 'hidden'; return result; }
    if (!Number.isInteger(trial) || trial < 1 || trial > 3) { result.status = 'trial'; return result; }
    var record = group.study.trials.find(function (item) { return item.trial === trial; });
    result.status = 'ready'; result.experiment = group.study.experiment; result.trial = record.trial;
    result.recordId = record.id; result.date = record.date; result.startValue = record.startValue;
    result.model = normalizeModel(result.experiment, record.model);
    return result;
  }
  function planStudyReport(raw, groupId, secondId) {
    var first = text(groupId, 96).trim(), second = text(secondId, 96).trim();
    var result = { status: 'incomplete', studies: [], comparison: null };
    if (second) {
      var pair = compareStudies(raw, first, second); result.status = pair.status;
      if (pair.status === 'ready') { result.studies = [first, second].map(function (id) { return { groupId: id, study: savedStudy(raw, id).study }; }); result.comparison = pair; }
      return result;
    }
    var group = savedStudy(raw, first);
    if (group.count && (!group.valid || group.count === 3 && !group.study)) { result.status = 'conflict'; return result; }
    if (!group.complete || !group.study) return result;
    if (!group.study.revealed) { result.status = 'hidden'; return result; }
    result.status = 'ready'; result.studies = [{ groupId: first, study: group.study }];
    return result;
  }
  function studyFingerprint(raw) {
    var study = normalizeStudy(raw);
    if (!study) return '';
    study.revealed = false; study.base.reveal = false;
    study.trials.forEach(function (trial) { trial.model.reveal = false; });
    return JSON.stringify(study);
  }
  function guidedSettings(raw, groupId) {
    var group = savedStudy(raw, groupId);
    if (!group.complete || !group.study) return [];
    var study = group.study, id = study.experiment, base = study.base;
    var choices = experiment(id).controls.filter(function (control) { return control.key !== 'target'; }).map(function (control) {
      return { key: control.key, value: base[control.key], type: 'range', min: control.min, max: control.max, step: control.step || 1, active: base.context, reason: base.context ? '' : 'context' };
    });
    choices.push({ key: 'context', value: base.context, type: 'toggle', active: true, reason: '' });
    var swappable = base.context && !(id === 'brightness' && base.contrast === 0);
    choices.push({ key: 'swap', value: base.swap, type: 'toggle', active: swappable, reason: !base.context ? 'context' : swappable ? '' : 'identical' });
    return choices;
  }
  function planRepeat(raw, groupId, key, value) {
    var state = normalize(raw), group = savedStudy(state, groupId);
    var result = { status: 'incomplete', experiment: null, setting: null, base: null, starts: [], fingerprint: '' };
    if (group.count && !group.valid) { result.status = 'conflict'; return result; }
    if (!group.complete || !group.study) return result;
    var study = group.study, setting = guidedSettings(state, groupId).find(function (choice) { return choice.key === key; });
    result.experiment = study.experiment; result.fingerprint = studyFingerprint(study);
    if (!setting) { result.status = 'setting'; return result; }
    result.setting = setting.key;
    if (!setting.active) { result.status = 'inactive'; return result; }
    if (setting.type === 'toggle' ? typeof value !== 'boolean' : typeof value !== 'number' || !Number.isFinite(value) || value < setting.min || value > setting.max) { result.status = 'value'; return result; }
    var change = {}; change[key] = value;
    var proposed = normalizeModel(study.experiment, Object.assign({}, study.base, change));
    if (proposed[key] !== value) { result.status = 'value'; return result; }
    if (proposed[key] === study.base[key]) { result.status = 'unchanged'; return result; }
    if (state.studies.length + 3 > 24) { result.status = 'capacity'; return result; }
    result.starts = study.trials.map(function (trial) { return trial.startValue; });
    proposed.matchValue = result.starts[0]; proposed.reveal = false; proposed.prediction = ''; proposed.note = '';
    result.status = 'ready'; result.base = proposed;
    return result;
  }
  function savedStudies(raw) {
    var state = normalize(raw), seen = new Set(), groups = [];
    state.studies.slice().reverse().forEach(function (record) {
      var id = record.repeat && record.repeat.id;
      if (!id || seen.has(id)) return;
      seen.add(id);
      var saved = savedStudy(state, id), study = saved.study;
      groups.push({ groupId: id, count: saved.count, valid: saved.valid, complete: saved.complete && !!study, experiment: study ? study.experiment : record.experiment, revealed: !!(study && study.revealed), study: study });
    });
    return groups;
  }
  function notebookView(raw, rawFilters, rawLabels) {
    var state = normalize(raw), options = object(rawFilters), labels = object(rawLabels);
    var filters = { view: options.view === 'studies' ? 'studies' : 'observations', experiment: EXPERIMENTS.some(function (meta) { return meta.id === options.experiment; }) ? options.experiment : 'all', status: ['complete', 'partial', 'conflict'].indexOf(options.status) >= 0 ? options.status : 'all', query: text(options.query, 120) };
    var query = filters.query.trim().toLowerCase(), records = state.studies.map(function (record, index) { return { record: record, number: index + 1 }; });
    function matches(entry) {
      var record = entry.record, meta = experiment(record.experiment), translated = object(labels[meta.id]), choice = meta.choices.indexOf(record.model.prediction);
      var title = typeof translated.title === 'string' ? translated.title : meta.title;
      var impression = choice < 0 ? '' : Array.isArray(translated.choices) && typeof translated.choices[choice] === 'string' ? translated.choices[choice] : meta.choices[choice];
      return (filters.experiment === 'all' || record.experiment === filters.experiment) && (!query || [title, impression, record.model.note].some(function (value) { return value.toLowerCase().indexOf(query) >= 0; }));
    }
    var allGroups = savedStudies(state), groups = allGroups.map(function (group, index) {
      var members = records.filter(function (entry) { return entry.record.repeat && entry.record.repeat.id === group.groupId; });
      var ids = Array.from(new Set(members.map(function (entry) { return entry.record.experiment; }))), revealed = members.filter(function (entry) { return entry.record.model.reveal; }).length;
      var date = '', latest = -Infinity;
      members.forEach(function (entry) { var time = new Date(entry.record.date).getTime(); if (Number.isFinite(time) && time >= latest) { latest = time; date = entry.record.date; } });
      return { groupId: group.groupId, number: allGroups.length - index, records: members, count: members.length, status: !group.valid || group.count === 3 && !group.study ? 'conflict' : group.complete ? 'complete' : 'partial', reveal: revealed === members.length ? 'revealed' : revealed ? 'mixed' : 'hidden', experiments: ids, date: date };
    }).filter(function (group) { return (filters.view !== 'studies' || filters.status === 'all' || filters.status === group.status) && group.records.some(matches); });
    var included = new Set(); groups.forEach(function (group) { group.records.forEach(function (entry) { included.add(entry.record.id); }); });
    return { filters: filters, total: records.length, groupTotal: allGroups.length, groups: groups, records: records.filter(function (entry) { return entry.record.repeat ? included.has(entry.record.id) : filters.view === 'observations' && matches(entry); }) };
  }
  function compareStudies(raw, idA, idB) {
    return compareSavedGroups(savedStudies(raw), idA, idB);
  }
  function compareSavedGroups(groups, idA, idB) {
    var firstId = text(idA, 96).trim(), secondId = text(idB, 96).trim();
    var first = groups.find(function (item) { return item.groupId === firstId; }), second = groups.find(function (item) { return item.groupId === secondId; });
    function descriptor(id, group) { return { groupId: id, count: group ? group.count : 0, valid: !!(group && group.valid), complete: !!(group && group.complete), experiment: group ? group.experiment : null, revealed: !!(group && group.revealed) }; }
    var result = { status: 'incomplete', a: descriptor(firstId, first), b: descriptor(secondId, second), experiment: null, reference: null, summaryA: null, summaryB: null, medianShift: null, percentShift: null, changes: [], startsDiffer: null };
    if (firstId && firstId === secondId) { result.status = 'same'; return result; }
    if (!first || !second) return result;
    if (!first.valid || !second.valid || first.count === 3 && !first.study || second.count === 3 && !second.study) { result.status = 'conflict'; return result; }
    if (!first.complete || !second.complete) return result;
    if (first.experiment !== second.experiment) { result.status = 'experiment'; return result; }
    var id = first.experiment;
    if (!own(MATCHING, id)) { result.status = 'conflict'; return result; }
    var reference = measurements(id, first.study.base).reference;
    if (reference !== measurements(id, second.study.base).reference) { result.status = 'reference'; return result; }
    if (!first.revealed || !second.revealed) { result.status = 'hidden'; return result; }
    var summaryA = studySummary(first.study), summaryB = studySummary(second.study);
    if (!summaryA || !summaryB) { result.status = 'conflict'; return result; }
    var keys = experiment(id).controls.map(function (control) { return control.key; }).filter(function (key) { return key !== 'target'; }); keys.push('context', 'swap');
    result.status = 'ready'; result.experiment = id; result.reference = reference; result.summaryA = summaryA; result.summaryB = summaryB;
    result.medianShift = summaryB.median - summaryA.median; result.percentShift = id === 'brightness' ? null : result.medianShift / reference * 100;
    result.startsDiffer = JSON.stringify(summaryA.starts) !== JSON.stringify(summaryB.starts);
    result.changes = keys.filter(function (key) { return first.study.base[key] !== second.study.base[key]; }).map(function (key) { return { key: key, before: first.study.base[key], after: second.study.base[key], active: key === 'context' || first.study.base.context || second.study.base.context }; });
    return result;
  }
  function studyRecordsPresent(state, study) {
    var records = state.studies.filter(function (item) { return item.repeat && item.repeat.id === study.id; });
    return records.length === study.trials.length && study.trials.every(function (trial) {
      return records.some(function (item) { return item.id === trial.id && item.experiment === study.experiment && item.repeat.trial === trial.trial && item.repeat.startValue === trial.startValue && sameStudySettings(study.experiment, study.base, item.model) && item.model.matchValue === trial.model.matchValue && item.model.prediction === trial.model.prediction && item.model.note === trial.model.note && item.date === trial.date; });
    });
  }
  function node(tag, props, children) { return { tag: tag, props: props || {}, children: children || [] }; }
  function line(x1, y1, x2, y2, props) { return node('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, props)); }
  function label(x, y, value) { return node('text', { x: x, y: y, fill: '#9a3412', fontSize: 20, textAnchor: 'middle', fontFamily: 'system-ui, sans-serif' }, [value]); }
  function scene(id, raw, translate) {
    var tr = typeof translate === 'function' ? translate : function (_, fallback) { return fallback; };
    var units = function (value) { return format(tr('drawing_units_label', '{value} units'), { value: value }); };
    var meta = experiment(id), m = normalizeModel(meta.id, raw), nodes = [node('rect', { width: 800, height: 480, fill: '#ffffff' })];
    var guide = { stroke: '#c2410c', strokeWidth: 3, strokeDasharray: '7 5', 'data-perception-guide': 'true' };
    var context = { 'data-perception-context': 'true' };
    if (meta.id === 'brightness') {
      var difference = m.contrast * 1.12, dark = Math.round(128 - difference), light = Math.round(128 + difference), measured = measurements(meta.id, m), values = [measured.reference, measured.comparison];
      var fills = values.map(function (value) { return 'rgb(' + value + ',' + value + ',' + value + ')'; });
      nodes.push(node('rect', { x: 40, y: 60, width: 720, height: 360, fill: m.context ? '#808080' : '#ffffff' }));
      if (m.context) {
        [m.swap ? light : dark, m.swap ? dark : light].forEach(function (value, i) { nodes.push(node('rect', Object.assign({ x: 40 + i * 360, y: 60, width: 360, height: 360, fill: 'rgb(' + value + ',' + value + ',' + value + ')' }, context))); });
      }
      [220, 580].forEach(function (x, index) {
        nodes.push(node('rect', { x: x - 48, y: 192, width: 96, height: 96, fill: fills[index], 'data-perception-target': index ? 'right' : 'left' }));
        if (m.reveal) nodes.push(node('rect', Object.assign({ x: x - 52, y: 188, width: 104, height: 104, fill: 'none' }, guide)));
      });
      if (m.reveal) { fills.forEach(function (fill, i) { nodes.push(node('rect', { x: 268 + i * 132, y: 222, width: 132, height: 36, fill: fill })); }); nodes.push(label(400, 453, m.matching ? tr('rgb_label', 'RGB') + ' ' + values[0] + ' / ' + values[1] : 'RGB ' + m.target + ' / ' + m.target + ' / ' + m.target)); }
    } else if (meta.id === 'ebbinghaus') {
      [220, 580].forEach(function (x, index) {
        var small = !!index !== !!m.swap, radius = small ? 10 : m.surround, orbit = (m.matching ? 36 : 24) + m.gap + radius;
        var count = small ? 8 : 4, centerRadius = index && m.matching ? m.matchValue / 2 : 24;
        if (m.context) for (var i = 0; i < count; i++) {
          var angle = i * Math.PI * 2 / count;
          nodes.push(node('circle', Object.assign({ cx: x + Math.cos(angle) * orbit, cy: 240 + Math.sin(angle) * orbit, r: radius, fill: '#2563a8' }, context)));
        }
        nodes.push(node('circle', { cx: x, cy: 240, r: centerRadius, fill: '#ed761c', 'data-perception-target': index ? 'right' : 'left' }));
        if (m.reveal) { nodes.push(node('circle', Object.assign({ cx: x, cy: 240, r: centerRadius, fill: 'none' }, guide))); nodes.push(line(x - centerRadius, 420, x + centerRadius, 420, guide)); nodes.push(label(x, 454, units(centerRadius * 2))); }
      });
    } else if (meta.id === 'mullerLyer') {
      [160, 320].forEach(function (y, index) {
        var length = index && m.matching ? m.matchValue : 400, left = 400 - length / 2, right = 400 + length / 2;
        nodes.push(line(left, y, right, y, { stroke: '#172e45', strokeWidth: 4, 'data-perception-target': index ? 'right' : 'left' }));
        if (m.context) [left, right].forEach(function (x, end) {
          var direction = (end ? -1 : 1) * (!!index !== !!m.swap ? -1 : 1), dx = Math.cos(m.angle * Math.PI / 180) * m.fin * direction, dy = Math.sin(m.angle * Math.PI / 180) * m.fin;
          nodes.push(line(x, y, x + dx, y + dy, Object.assign({ stroke: '#172e45', strokeWidth: 4 }, context)));
          nodes.push(line(x, y, x + dx, y - dy, Object.assign({ stroke: '#172e45', strokeWidth: 4 }, context)));
        });
        if (m.reveal) { nodes.push(line(left, y - 32, left, y + 32, guide)); nodes.push(line(right, y - 32, right, y + 32, guide)); nodes.push(label(400, y + 60, units(length))); }
      });
    } else if (meta.id === 'cafeWall') {
      var tile = 60, rowHeight = tile + m.mortar;
      nodes.push(node('rect', { x: 0, y: 20, width: 800, height: 440, fill: '#808080' }));
      for (var row = 0; row < 6; row++) {
        var y = 20 + row * rowHeight, shift = row % 2 ? tile * m.offset / 100 : 0;
        if (m.context) for (var col = -2; col < 15; col++) nodes.push(node('rect', Object.assign({ x: col * tile + shift, y: y, width: tile, height: tile, fill: col % 2 === 0 ? '#181818' : '#f5f5f5' }, context)));
        if (m.reveal) nodes.push(line(0, y + tile + m.mortar / 2, 800, y + tile + m.mortar / 2, guide));
      }
    } else if (meta.id === 'necker') {
      var dx = m.depth, dy = -m.depth * 0.64, front = [[245, 200], [465, 200], [465, 420], [245, 420]], back = front.map(function (p) { return [p[0] + dx, p[1] + dy]; });
      if (m.context && m.cue !== 'none') {
        var face = m.cue === 'front' ? front : back;
        nodes.push(node('polygon', Object.assign({ points: face.map(function (p) { return p.join(','); }).join(' '), fill: '#c6e3ed', stroke: '#14708a', strokeWidth: 6 }, context)));
      }
      [front, back].forEach(function (face, f) { face.forEach(function (p, i) { var q = face[(i + 1) % 4]; nodes.push(line(p[0], p[1], q[0], q[1], { stroke: '#173b52', strokeWidth: 4, 'data-perception-edge': f + '-' + i })); }); });
      front.forEach(function (p, i) { nodes.push(line(p[0], p[1], back[i][0], back[i][1], { stroke: '#173b52', strokeWidth: 4, 'data-perception-edge': 'join-' + i })); });
      if (m.reveal) nodes.push(label(400, 460, tr('two_depth_interpretations', 'Two depth interpretations')));
    } else {
      var lines = [];
      for (var x = -480; x <= 1280; x += m.spacing) lines.push(line(x, -500, x, 980, { stroke: '#173b52', strokeWidth: 2 }));
      nodes.push(node('g', { 'data-perception-grid': 'base' }, lines));
      if (m.context) nodes.push(node('g', Object.assign({ transform: 'rotate(' + m.angle + ' 400 240)', 'data-perception-grid': 'overlay' }, context), lines));
      if (m.reveal) { nodes.push(node('rect', { x: 260, y: 418, width: 280, height: 50, fill: '#fff' })); nodes.push(label(400, 450, units(m.spacing) + ' · ' + m.angle + '°')); }
    }
    return nodes;
  }
  function format(value, model) { return value.replace(/\{(\w+)\}/g, function (_, key) { return String(model[key]); }); }
  var CSS = [
    '.perception-drawing-viewer{width:min(1440px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:clamp(12px,2vw,24px);border:1px solid var(--pl-border);border-radius:14px;color:var(--pl-ink);background:var(--pl-panel);overflow:auto;overscroll-behavior:contain;font:inherit}.perception-drawing-viewer::backdrop{background:rgba(5,20,30,.72)}.perception-drawing-viewer header{display:flex;align-items:start;justify-content:space-between;gap:12px;flex-wrap:wrap}.perception-drawing-viewer h2{margin:0;font-size:1.25rem;line-height:1.4}.perception-drawing-viewer .perception-recorded-preview{padding:0;border:0;margin:16px 0 0}.perception-drawing-viewer .perception-field{max-width:320px}.perception-drawing-viewer .perception-recorded-preview svg{height:auto;max-height:65dvh;min-height:120px;object-fit:contain}.perception-drawing-viewer p{line-height:1.5;overflow-wrap:anywhere}.perception-drawing-viewer .perception-recorded-note{max-width:85ch}@media(forced-colors:active){.perception-drawing-viewer::backdrop{background:Canvas;opacity:.85}}',
    '[data-perception-lab]{--pl-ink:#163449;--pl-soft:#425c6c;--pl-panel:#fff;--pl-ground:#f1f7f9;--pl-border:#bccfd7;color:var(--pl-ink);background:var(--pl-ground);padding:clamp(12px,2vw,24px);border-radius:18px;font-family:inherit;max-width:100%;}',
    '[data-perception-lab] *{box-sizing:border-box;min-width:0}[data-perception-lab] button,[data-perception-lab] select{min-height:44px;min-width:44px;font:inherit;font-size:.875rem;border:1px solid var(--pl-border);border-radius:10px;padding:8px 12px;color:var(--pl-ink);background:var(--pl-panel);cursor:pointer;white-space:normal;overflow-wrap:anywhere}',
    '[data-perception-lab] button[aria-pressed=true]{background:#15566c;color:#fff;border-color:#15566c}[data-perception-lab] button:disabled{opacity:.55;cursor:default}[data-perception-lab] :focus-visible{outline:3px solid #b45309;outline-offset:3px}',
    '.perception-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.perception-heading h2{margin:0;font-size:1.65rem;line-height:1.2}.perception-heading p{margin:6px 0 0;color:var(--pl-soft);max-width:65ch;font-size:.9375rem;line-height:1.5}',
    '.perception-eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.12em;color:var(--pl-soft);margin:0 0 6px}.perception-actions{display:flex;gap:8px;flex-wrap:wrap}.perception-experiments{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:20px 0}.perception-experiments button{text-align:left}.perception-experiments small{display:block;font-size:.75rem;opacity:.85;margin-top:4px}.perception-mobile-picker{display:none}',
    '.perception-workspace{display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr);grid-template-areas:"controls scene";gap:16px;align-items:start}.perception-controls{grid-area:controls}.perception-scenes{grid-area:scene}.perception-card{background:var(--pl-panel);border:1px solid var(--pl-border);border-radius:14px;padding:16px}.perception-card h3{font-size:1.125rem;margin:0 0 8px}.perception-card p{font-size:.875rem;line-height:1.5;margin:8px 0;color:var(--pl-soft)}',
    '.perception-controls summary{cursor:pointer;font-weight:700;min-height:44px;display:list-item;padding:10px 0}.perception-field{display:block;font-size:.875rem;margin:16px 0}.perception-field span{display:flex;justify-content:space-between;gap:8px}.perception-field output{font-variant-numeric:tabular-nums;color:var(--pl-soft)}.perception-field input[type=range]{display:block;width:100%;height:44px;accent-color:#15566c}.perception-field select{width:100%;margin-top:8px}',
    '.perception-observation{border:0;padding:0;margin:14px 0}.perception-observation legend{font-size:.875rem;font-weight:700;margin-bottom:8px;line-height:1.5}.perception-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.perception-note{width:100%;min-height:80px;font:inherit;font-size:.875rem;line-height:1.5;border:1px solid var(--pl-border);border-radius:8px;padding:10px;color:var(--pl-ink);background:var(--pl-panel);resize:vertical}.perception-note::placeholder{color:var(--pl-soft);opacity:1}',
    '.perception-figure{margin:0}.perception-figure figcaption{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;font-size:.875rem;color:var(--pl-soft)}.perception-svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;border-radius:8px;overflow:hidden;forced-color-adjust:none}.perception-reading{margin-top:14px;border-left:4px solid #b45309;padding:6px 12px}.perception-reading strong{font-size:.9375rem}.perception-reading a{color:#15566c;text-decoration:underline}.perception-scenes{display:grid;gap:16px}.perception-journal{margin-top:20px}.perception-journal ol{padding-left:22px}.perception-journal li{padding:14px 0;border-bottom:1px solid var(--pl-border)}.perception-journal li p{white-space:pre-wrap;overflow-wrap:anywhere}.perception-empty{color:var(--pl-soft);font-size:.875rem}.perception-status{min-height:1.5em;font-size:.875rem;color:var(--pl-soft);margin-top:12px}',
    '.perception-matching{border:1px solid var(--pl-border);padding:12px;border-radius:10px;margin:16px 0}.perception-matching .perception-field{margin:12px 0}.perception-scene-actions{margin-bottom:14px;min-height:44px}.perception-deltas{grid-column:1/-1}.perception-deltas table{width:100%;border-collapse:collapse;font-size:.8125rem;table-layout:fixed}.perception-deltas th,.perception-deltas td{padding:8px 6px;text-align:left;vertical-align:top;overflow-wrap:anywhere;border-bottom:1px solid var(--pl-border)}.perception-deltas th:first-child{width:40%}.perception-notebook-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.perception-journal time{font-size:.8125rem;color:var(--pl-soft)}',
    '.perception-study{margin-top:16px;padding:12px;border:1px solid var(--pl-border);border-radius:10px}.perception-study h4{font-size:.9375rem;margin:0 0 8px}.perception-study-result{grid-column:1/-1}.perception-study-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.8125rem}.perception-study-table th,.perception-study-table td{padding:8px 4px;text-align:left;vertical-align:top;border-bottom:1px solid var(--pl-border);overflow-wrap:anywhere}.perception-study-table th:first-child{width:13%}.perception-study-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.perception-study-stats div{padding:10px;background:var(--pl-ground);border:1px solid var(--pl-border);border-radius:8px}.perception-study-stats dt{font-size:.8125rem;color:var(--pl-soft)}.perception-study-stats dd{margin:6px 0 0;font-weight:700;overflow-wrap:anywhere}.perception-review{margin:16px 0}.perception-study-badge{display:inline-block;margin:8px 0 0;font-size:.8125rem;color:var(--pl-soft)}@media(max-width:500px){.perception-study-stats{grid-template-columns:1fr}.perception-study-table{font-size:.75rem}}',
    '.perception-study-table,.perception-study-table caption,.perception-study-table th,.perception-study-table td{color:var(--pl-ink);background:var(--pl-panel)}.perception-study-badge{display:block}',
    '.perception-study-compare .perception-study-table th:first-child{width:36%}.perception-study-compare select{width:100%}.perception-pair-plot{margin:16px 0}.perception-pair-plot svg{display:block;width:100%;height:auto;max-height:260px;background:var(--pl-panel)}.perception-pair-plot figcaption{display:block;font-size:.8125rem;color:var(--pl-soft);line-height:1.5;margin-top:8px}.perception-pair-settings small{display:block;font-weight:400}.perception-pair-shift{padding:12px;border:1px solid var(--pl-border);border-radius:8px}',
    '.perception-recorded-preview{margin:16px 0;padding:12px;border:1px solid var(--pl-border);border-radius:10px}.perception-recorded-preview h5{font-size:.9375rem;margin:0 0 8px;line-height:1.5}.perception-recorded-preview .perception-field{margin:12px 0}.perception-recorded-preview figure{margin:12px 0 0}.perception-recorded-preview figcaption{font-size:.875rem;line-height:1.5;margin:8px 0;overflow-wrap:anywhere}.perception-recorded-preview svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;border-radius:8px;overflow:hidden;forced-color-adjust:none}.perception-recorded-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}.perception-recorded-pair .perception-recorded-preview{margin:0}.perception-recorded-note{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:900px){.perception-recorded-pair{grid-template-columns:1fr}}',
    '.perception-guide-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.perception-guide-fields small{display:block;font-size:.8125rem;color:var(--pl-soft);margin-top:8px}@media(max-width:580px){.perception-guide-fields{grid-template-columns:1fr}}',
    '.perception-import input[type=file]{display:block;width:100%;min-width:0;min-height:44px;margin-top:8px;font:inherit;color:var(--pl-ink)}.perception-import input[type=file]::file-selector-button{min-height:44px;font:inherit;color:var(--pl-ink);background:var(--pl-panel);border:1px solid var(--pl-border);border-radius:8px;margin-right:8px;padding:8px}.perception-import-filename{overflow-wrap:anywhere}',
    '.perception-finder-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}.perception-finder-fields select,.perception-finder-fields input{width:100%;min-width:0}.perception-finder input[type=search]{display:block;min-height:44px;margin-top:8px;padding:8px 10px;font:inherit;color:var(--pl-ink);background:var(--pl-panel);border:1px solid var(--pl-border);border-radius:8px}.perception-study-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;list-style:none;padding:0!important;margin:16px 0}.perception-journal .perception-study-card{min-width:0;padding:14px;border:1px solid var(--pl-border);border-radius:10px}.perception-study-card>strong{display:block;line-height:1.5;overflow-wrap:anywhere}.perception-study-card details{margin-top:10px}.perception-study-card summary{min-height:44px;padding:10px 0;cursor:pointer;font-size:.875rem;font-weight:700}.perception-study-card ol{padding-left:22px}.perception-study-card .perception-actions{margin-top:10px}@media(max-width:700px){.perception-study-cards{grid-template-columns:1fr}}@media(max-width:580px){.perception-finder-fields{grid-template-columns:1fr}}',
    '@media(min-width:1100px){.perception-scenes[data-comparing=true]{grid-template-columns:repeat(2,minmax(0,1fr))}.perception-scenes[data-comparing=true] figcaption{align-items:start;flex-direction:column;min-height:48px}}',
    '[data-perception-expanded=true] .perception-workspace{grid-template-columns:1fr;grid-template-areas:"scene" "controls"}[data-perception-expanded=true] .perception-controls details[open]>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}[data-perception-expanded=true] .perception-svg{max-height:76dvh}',
    '.theme-dark [data-perception-lab],[data-perception-theme=dark]{--pl-ink:#e7f3f8;--pl-soft:#b9d0dc;--pl-panel:#183447;--pl-ground:#102738;--pl-border:#557687}.theme-dark .perception-reading a,[data-perception-theme=dark] .perception-reading a{color:#9edcf2}[data-perception-theme=contrast]{--pl-ink:#fff;--pl-soft:#fff;--pl-panel:#000;--pl-ground:#000;--pl-border:#fff}[data-perception-theme=contrast] button[aria-pressed=true]{background:#ffff00;color:#000;border-color:#ffff00}[data-perception-theme=contrast] .perception-reading a{color:#ffff00}',
    '@media(max-width:1050px){.perception-experiments{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.perception-workspace{grid-template-columns:1fr;grid-template-areas:"scene" "controls"}.perception-experiments{display:none}.perception-mobile-picker{display:block;margin:16px 0;font-size:.875rem}.perception-mobile-picker select{display:block;width:100%;margin-top:6px}.perception-card{padding:12px}[data-perception-expanded=true] .perception-controls details[open]>div{display:block}.perception-heading h2{font-size:1.4rem}}',
    // Selected buttons use paired system colors; prevent text backplates from hiding HighlightText.
    '@media(forced-colors:active){[data-perception-lab],[data-perception-lab][data-perception-theme]{--pl-ink:CanvasText;--pl-soft:CanvasText;--pl-panel:Canvas;--pl-ground:Canvas;--pl-border:CanvasText}[data-perception-lab] button[aria-pressed=true]{background:Highlight;color:HighlightText;border-color:Highlight;forced-color-adjust:none}[data-perception-lab] .perception-reading a{color:LinkText}}'
  ].join('\n');
  var studySerial = 0;
  function PerceptionLab(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, state = normalize((ctx.toolData || {}).perceptionLab), meta = experiment(state.experiment), model = state.models[meta.id];
    function t(key, fallback) { var value; try { value = typeof ctx.t === 'function' ? ctx.t('stem.perception.' + key, fallback) : fallback; } catch (_) {} return typeof value === 'string' && value !== 'stem.perception.' + key ? value : fallback; }
    var uid = React.useId(), stageRef = React.useRef(null), statusPair = React.useState(''), status = statusPair[0], setStatus = statusPair[1];
    var deletedPair = React.useState(null), deleted = deletedPair[0], setDeleted = deletedPair[1];
    var groupDeletePair = React.useState(null), groupDelete = groupDeletePair[0], setGroupDelete = groupDeletePair[1], groupDeleteSelection = React.useRef(null), groupDeleteFocus = React.useRef(false), groupDeleteFocusWithin = React.useRef(false);
    var finderPair = React.useState({}), finderFilters = finderPair[0], setFinderFilters = finderPair[1];
    var previewPair = React.useState({}), previewOptions = previewPair[0], setPreviewOptions = previewPair[1];
    var viewerPair = React.useState(null), viewer = viewerPair[0], setViewer = viewerPair[1], viewerRef = React.useRef(null), viewerReturn = React.useRef(null);
    var notebookFingerprint = JSON.stringify(state.studies), expectedNotebook = React.useRef(notebookFingerprint), focusUndo = React.useRef(false);
    var notebookRevision = React.useRef(0), undoRevision = React.useRef(0), pendingNotebook = React.useRef(null);
    var controlsPair = React.useState(true), controlsOpen = controlsPair[0], setControlsOpen = controlsPair[1];
    var studyPair = React.useState(null), activeStudy = studyPair[0], setActiveStudy = studyPair[1];
    var studyBusyPair = React.useState(false), studyBusy = studyBusyPair[0], setStudyBusy = studyBusyPair[1];
    var studyBusyRef = React.useRef(false), pendingStudy = React.useRef(null), studyRevisions = React.useRef(null), focusTrial = React.useRef(false), studyAlive = React.useRef(true);
    var experimentFingerprint = JSON.stringify({ experiment: state.experiment, models: state.models }), expectedExperiment = React.useRef(experimentFingerprint), experimentRevision = React.useRef(0);
    var reviewPair = React.useState(''), reviewedGroup = reviewPair[0], setReviewedGroup = reviewPair[1], reviewRevision = React.useRef(0), reviewReturnFocus = React.useRef(null);
    var comparedPair = React.useState(''), comparedGroup = comparedPair[0], setComparedGroup = comparedPair[1];
    var selectionEpoch = React.useRef(0), studySelection = React.useRef({ first: '', second: '', epoch: 0 });
    var pendingSavedReveal = React.useRef(null), savedRevealFeedback = React.useRef(null);
    var guidePair = React.useState(null), guideDraft = guidePair[0], setGuideDraft = guidePair[1];
    var guideEpoch = React.useRef(0), guideSelection = React.useRef(null), guideFocus = React.useRef(false), guidedRun = React.useRef(null);
    var importPair = React.useState(null), importDraft = importPair[0], setImportDraft = importPair[1];
    var importUndoPair = React.useState(null), importUndo = importUndoPair[0], setImportUndo = importUndoPair[1];
    var importBusyPair = React.useState(false), importBusy = importBusyPair[0], setImportBusy = importBusyPair[1];
    var importRequest = React.useRef(null), pendingImport = React.useRef(null), importBusyRef = React.useRef(false), importFocus = React.useRef(false), importProfile = React.useRef(ctx.activeProfileId);
    importProfile.current = ctx.activeProfileId;
    var collecting = !!activeStudy && activeStudy.trials.length < 3, studyLocked = !!activeStudy, comparisonLocked = !!activeStudy && !collecting;
    var capacity = notebookCapacity(state), undoCount = deleted ? deleted.records ? deleted.records.length : 1 : 0;
    function previewIdentity(groupId, otherId) {
      if (!groupId || recordedTrial(state, groupId, 1).status !== 'ready' || otherId && compareStudies(state, groupId, otherId).status !== 'ready') return '';
      return JSON.stringify([groupId, savedStudy(state, groupId).study, otherId || '', otherId ? savedStudy(state, otherId).study : null]);
    }
    var previewIdentities = { active: activeStudy && activeStudy.revealed ? previewIdentity(activeStudy.id) : '', review: previewIdentity(reviewedGroup), a: comparedGroup ? previewIdentity(reviewedGroup, comparedGroup) : '', b: comparedGroup ? previewIdentity(comparedGroup, reviewedGroup) : '' };
    React.useEffect(function () {
      setPreviewOptions(function (previous) {
        var next = {};
        Object.keys(previous).forEach(function (slot) { if (previewIdentities[slot] && previous[slot].identity === previewIdentities[slot]) next[slot] = previous[slot]; });
        return Object.keys(next).length === Object.keys(previous).length ? previous : next;
      });
    }, [JSON.stringify(previewIdentities)]);
    React.useEffect(function () { setPreviewOptions({}); }, [ctx.activeProfileId]);
    React.useEffect(function () { studyAlive.current = true; return function () { studyAlive.current = false; pendingStudy.current = null; pendingSavedReveal.current = null; studyBusyRef.current = false; guideSelection.current = null; guidedRun.current = null; guideEpoch.current++; if (importRequest.current && importRequest.current.reader) importRequest.current.reader.abort(); importRequest.current = null; pendingImport.current = null; }; }, []);
    // Complete local undo and announcements after the latest parent state commits.
    // Functional updates can be batched; a rendered snapshot may have an old index.
    React.useEffect(function () {
      if (expectedNotebook.current !== notebookFingerprint) { notebookRevision.current++; expectedNotebook.current = notebookFingerprint; }
      if (expectedExperiment.current !== experimentFingerprint) { experimentRevision.current++; expectedExperiment.current = experimentFingerprint; }
      var importOperation = pendingImport.current;
      if (importOperation && importOperation.done) {
        pendingImport.current = null; importRequest.current = null; importBusyRef.current = false; setImportBusy(false); setImportDraft(null);
        var importValid = importOperation.success && importOperation.profile === importProfile.current && importOperation.after === notebookFingerprint;
        if (importValid && importOperation.kind === 'add') { setImportUndo({ before: importOperation.before, after: importOperation.after }); setDeleted(null); importFocus.current = 'undo'; announce(format(t('notebook_imported', 'Import complete. Added to your notebook: {count}. Undo import is available.'), { count: importOperation.count })); }
        else { setImportUndo(null); importFocus.current = 'notebook'; announce(importValid ? t('import_undone', 'Imported observations removed. The previous notebook is restored.') : t('import_expired', 'The notebook changed. Preview the file again before adding observations.')); }
      } else if (importRequest.current && importRequest.current.fingerprint !== notebookFingerprint) { clearImport(); announce(t('import_expired', 'The notebook changed. Preview the file again before adding observations.')); }
      if (importUndo && importUndo.after !== notebookFingerprint) setImportUndo(null);
      var operation = pendingNotebook.current;
      if (operation && operation.done) {
        pendingNotebook.current = null;
        var valid = operation.revision === notebookRevision.current;
        if (operation.kind === 'save') {
          if (deleted && undoRevision.current !== notebookRevision.current) setDeleted(null);
          announce(valid && operation.saved ? t('observation_saved', 'Observation saved in your notebook.') : operation.capacity ? capacityMessage(1) : t('notebook_action_expired', 'The notebook changed. That observation action is no longer available.'));
        } else if (operation.kind === 'delete' && valid && operation.undo) {
          undoRevision.current = notebookRevision.current; focusUndo.current = true; setDeleted(operation.undo);
          if (operation.undo.groupId === reviewedGroup) { clearGuidePlan(); setReviewedGroup(''); setComparedGroup(''); studySelection.current = { first: '', second: '', epoch: ++selectionEpoch.current }; }
          else if (operation.undo.groupId === comparedGroup) { setComparedGroup(''); studySelection.current = { first: reviewedGroup, second: '', epoch: ++selectionEpoch.current }; }
          announce(operation.undo.records ? format(t('saved_study_deleted', 'Saved study deleted: {count} observations. Undo deletion is available.'), { count: operation.undo.records.length }) : t('observation_deleted', 'Observation deleted. Undo deletion is available.'));
        } else if (operation.kind === 'restore' && valid && operation.capacity) {
          announce(format(t('notebook_undo_capacity', 'Undo needs {count} available spaces; {free} remain. No observations were changed.'), { count: operation.count, free: capacity.free }));
        } else {
          setDeleted(null);
          announce(operation.kind === 'restore' && valid && operation.restored ? t('deletion_undone', 'Deleted observation restored.') : t('notebook_action_expired', 'The notebook changed. That observation action is no longer available.'));
        }
      } else if (deleted && undoRevision.current !== notebookRevision.current) setDeleted(null);
      var repeatOperation = pendingStudy.current;
      if (repeatOperation && repeatOperation.done) {
        pendingStudy.current = null; studyBusyRef.current = false; setStudyBusy(false);
        var repeatValid = repeatOperation.revisions.notebook === notebookRevision.current && repeatOperation.revisions.experiment === experimentRevision.current && repeatOperation.study && repeatOperation.study.experiment === meta.id && sameStudySettings(meta.id, repeatOperation.study.base, model) && studyRecordsPresent(state, repeatOperation.study) && guidedSourcePresent(state, repeatOperation.guide);
        if (repeatValid && repeatOperation.success && repeatOperation.study) {
          studyRevisions.current = repeatOperation.revisions; setActiveStudy(repeatOperation.study);
          if (repeatOperation.kind === 'start') {
            guidedRun.current = repeatOperation.guide || null; setControlsOpen(true); clearGuidePlan();
            if (repeatOperation.guide) { pendingSavedReveal.current = null; savedRevealFeedback.current = null; setReviewedGroup(''); setComparedGroup(''); studySelection.current = { first: '', second: '', epoch: ++selectionEpoch.current }; }
          }
          if (repeatOperation.guide && repeatOperation.study.trials.length === 3) {
            guidedRun.current = null; setActiveStudy(null); studyRevisions.current = null; focusTrial.current = false;
            reviewRevision.current = notebookRevision.current; setReviewedGroup(repeatOperation.guide.sourceId); setComparedGroup(repeatOperation.study.id);
            studySelection.current = { first: repeatOperation.guide.sourceId, second: repeatOperation.study.id, epoch: ++selectionEpoch.current };
            announce(t('guided_complete', 'Three new matches recorded. The baseline and new study are selected for comparison. Reveal each study separately when you are ready.'));
          } else {
            focusTrial.current = repeatOperation.kind === 'reveal' ? 'results' : repeatOperation.study.trials.length < 3 ? 'match' : 'reveal';
            announce(repeatOperation.kind === 'reveal' ? t('study_results_revealed', 'All three study matches are revealed.') : repeatOperation.study.trials.length === 3 ? t('study_complete', 'Three matches recorded. Reveal the study results when you are ready.') : format(t('study_next_match', 'Match {trial} of 3. Adjust the comparison, choose your impression, then record it.'), { trial: repeatOperation.study.trials.length + 1 }));
          }
        } else { setActiveStudy(null); guidedRun.current = null; studyRevisions.current = null; focusTrial.current = 'current'; announce(repeatOperation.capacity ? capacityMessage(repeatOperation.kind === 'start' ? 3 : 1) : repeatOperation.guide ? t('guided_plan_expired', 'The baseline or plan changed. Review the saved study and plan the repeat again; recorded matches remain in the notebook.') : t('study_expired', 'The experiment or notebook changed. The repeated study ended; recorded matches remain in the notebook.')); }
      } else if (activeStudy && (!studyRevisions.current || studyRevisions.current.notebook !== notebookRevision.current || studyRevisions.current.experiment !== experimentRevision.current || activeStudy.experiment !== meta.id || !sameStudySettings(meta.id, activeStudy.base, model) || !studyRecordsPresent(state, activeStudy) || !guidedSourcePresent(state, guidedRun.current) || !activeStudy.revealed && model.reveal)) {
        setActiveStudy(null); guidedRun.current = null; studyRevisions.current = null; focusTrial.current = 'current'; announce(t('study_expired', 'The experiment or notebook changed. The repeated study ended; recorded matches remain in the notebook.'));
      }
      var savedReveal = pendingSavedReveal.current;
      if (savedReveal && savedReveal.done) {
        pendingSavedReveal.current = null;
        var committedGroup = savedStudy(state, savedReveal.groupId);
        var selected = studySelection.current, committedPair = savedReveal.comparison ? compareStudies(state, savedReveal.first, savedReveal.groupId) : null;
        var revealValid = savedReveal.success && savedReveal.revision === notebookRevision.current && savedReveal.epoch === selected.epoch && savedReveal.first === selected.first && (!savedReveal.comparison || selected.second === savedReveal.groupId && (committedPair.status === 'hidden' || committedPair.status === 'ready')) && committedGroup.complete && committedGroup.study && committedGroup.study.revealed;
        announce(revealValid ? savedReveal.comparison ? t('comparison_study_revealed', 'Comparison study drawing values revealed.') : t('saved_study_revealed', 'Saved study drawing values revealed.') : t('notebook_action_expired', 'The notebook changed. That observation action is no longer available.'));
        savedRevealFeedback.current = revealValid ? { groupId: savedReveal.groupId, fingerprint: JSON.stringify(committedGroup.study), first: savedReveal.comparison ? savedReveal.first : '', firstFingerprint: savedReveal.comparison ? JSON.stringify(savedStudy(state, savedReveal.first).study) : '' } : null;
        if (revealValid) { var reviewHeading = document.getElementById(uid + (savedReveal.comparison ? committedPair.status === 'ready' ? '-pair-results' : '-pair-heading' : '-review-heading')); if (reviewHeading) reviewHeading.focus(); }
      }
      if (savedRevealFeedback.current && (JSON.stringify(savedStudy(state, savedRevealFeedback.current.groupId).study) !== savedRevealFeedback.current.fingerprint || savedRevealFeedback.current.first && JSON.stringify(savedStudy(state, savedRevealFeedback.current.first).study) !== savedRevealFeedback.current.firstFingerprint)) {
        savedRevealFeedback.current = null;
        announce(t('notebook_action_expired', 'The notebook changed. That observation action is no longer available.'));
      }
      if (reviewedGroup && reviewRevision.current !== notebookRevision.current) { clearGuidePlan(); setReviewedGroup(''); setComparedGroup(''); studySelection.current = { first: '', second: '', epoch: ++selectionEpoch.current }; }
      if (groupDelete && (groupDelete.fingerprint !== notebookFingerprint || groupDelete.profile !== ctx.activeProfileId || studyLocked || importBusy)) { cancelGroupDelete(groupDeleteFocusWithin.current); }
    });
    React.useEffect(function () { setFinderFilters({}); clearImport(); setImportUndo(null); clearGuidePlan(); cancelGroupDelete(false); guidedRun.current = null; setStatus(''); setDeleted(null); pendingNotebook.current = null; setActiveStudy(null); pendingStudy.current = null; studyBusyRef.current = false; setStudyBusy(false); setReviewedGroup(''); setComparedGroup(''); studySelection.current = { first: '', second: '', epoch: ++selectionEpoch.current }; pendingSavedReveal.current = null; savedRevealFeedback.current = null; }, [ctx.activeProfileId]);
    React.useEffect(function () { if (deleted && focusUndo.current) { focusUndo.current = false; var control = document.getElementById(uid + '-undo'); if (control) control.focus(); } }, [deleted]);
    React.useEffect(function () { if (groupDelete && groupDeleteFocus.current) { groupDeleteFocus.current = false; var heading = document.getElementById(uid + '-delete-group-heading'); if (heading) heading.focus(); } }, [groupDelete]);
    React.useEffect(function () {
      if (focusTrial.current) {
        var target = document.getElementById(focusTrial.current === 'results' ? uid + '-study-results' : focusTrial.current === 'reveal' ? uid + '-reveal-study' : focusTrial.current === 'current' ? uid + '-current-view' : 'perception-match-value');
        if (target && !target.disabled) { focusTrial.current = false; target.focus(); }
      }
    }, [activeStudy, studyBusy, controlsOpen]);
    React.useEffect(function () { if (reviewedGroup) { var heading = document.getElementById(uid + '-review-heading'); if (heading) heading.focus(); } }, [reviewedGroup]);
    React.useEffect(function () { if (guideFocus.current) { var setting = document.getElementById(uid + (guideFocus.current === 'open' ? '-guide-open' : '-guide-setting')); if (setting) { guideFocus.current = false; setting.focus(); } } }, [guideDraft, studyBusy]);
    React.useEffect(function () { if (importFocus.current) { var target = document.getElementById(uid + (importFocus.current === 'file' ? '-import-file' : importFocus.current === 'preview' ? '-import-preview' : importFocus.current === 'undo' ? '-import-undo' : importFocus.current === 'open' ? '-import-open' : '-notebook')); if (target && !target.disabled) { importFocus.current = false; target.focus(); } } }, [importDraft, importUndo, importBusy]);
    var playPair = React.useState(false), playing = playPair[0], setPlaying = playPair[1];
    var phasePair = React.useState(null), animatedAngle = phasePair[0], setAnimatedAngle = phasePair[1];
    var activeModel = Object.assign({}, model, animatedAngle !== null && meta.id === 'moire' ? { angle: animatedAngle } : {});
    var visibleAngle = React.useRef(activeModel.angle); visibleAngle.current = activeModel.angle;
    var motionRun = React.useRef(null);
    var motionMedia = React.useMemo(function () { return typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null; }, []);
    var reducedPair = React.useState(function () { return !!(motionMedia && motionMedia.matches); }), reducedMotion = reducedPair[0], setReducedMotion = reducedPair[1];
    var stopCurrent = React.useRef(null);
    function announce(message) { setStatus(message); if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message); }
    function update(fn, editsNotebook) { if (typeof ctx.setToolData !== 'function') return;
      var appliedInputs = new WeakSet();
      ctx.setToolData(function (prev) {
      prev = object(prev); var current = normalize(prev.perceptionLab), fingerprint = JSON.stringify(current.studies);
      var currentExperiment = JSON.stringify({ experiment: current.experiment, models: current.models });
      // React may replay a functional updater with the same previous state.
      // A replay is not an external notebook replacement.
      if (!appliedInputs.has(prev)) {
        appliedInputs.add(prev);
        if (expectedNotebook.current !== fingerprint) { notebookRevision.current++; expectedNotebook.current = fingerprint; }
        if (expectedExperiment.current !== currentExperiment) { experimentRevision.current++; expectedExperiment.current = currentExperiment; }
      }
      var next = fn(current); if (editsNotebook) expectedNotebook.current = JSON.stringify(next.studies);
      expectedExperiment.current = JSON.stringify({ experiment: next.experiment, models: next.models });
      return Object.assign({}, prev, { perceptionLab: next });
    }); }
    function change(values) { update(function (next) { next.models[meta.id] = normalizeModel(meta.id, Object.assign({}, next.models[meta.id], values)); return next; }); }
    function stop() {
      var angle = visibleAngle.current, run = motionRun.current;
      if (run) { run.active = false; window.cancelAnimationFrame(run.frame); }
      setPlaying(false);
      if (animatedAngle !== null && meta.id === 'moire') change({ angle: angle });
      setAnimatedAngle(null);
    }
    stopCurrent.current = stop;
    React.useEffect(function () {
      function preference(event) { if (event.matches) stopCurrent.current(); setReducedMotion(!!event.matches); }
      if (motionMedia && motionMedia.addEventListener) motionMedia.addEventListener('change', preference);
      return function () { if (motionMedia && motionMedia.removeEventListener) motionMedia.removeEventListener('change', preference); };
    }, [motionMedia]);
    React.useEffect(function () { setPlaying(false); setAnimatedAngle(null); }, [meta.id, ctx.activeProfileId]);
    React.useEffect(function () {
      if (!playing || meta.id !== 'moire' || !model.context || reducedMotion) return;
      var start, last = -100, disposed = false, base = model.angle, run = { active: true, frame: null }; motionRun.current = run;
      function halt() { if (disposed || !run.active) return; var angle = visibleAngle.current; run.active = false; window.cancelAnimationFrame(run.frame); setPlaying(false); change({ angle: angle }); setAnimatedAngle(null); }
      function visibility() { if (document.hidden) halt(); }
      function tick(time) {
        if (disposed || !run.active) return;
        if (document.hidden) { halt(); return; }
        if (start === undefined) start = time;
        if (time - last >= 50) { setAnimatedAngle(Number(Math.max(0, Math.min(30, base + Math.sin((time - start) / 2000) * 3)).toFixed(1))); last = time; }
        run.frame = window.requestAnimationFrame(tick);
      }
      run.frame = window.requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', visibility);
      return function () { disposed = true; run.active = false; window.cancelAnimationFrame(run.frame); document.removeEventListener('visibilitychange', visibility); };
    }, [playing, meta.id, model.context, model.angle, reducedMotion]);
    function button(label, handler, attrs) { return h('button', Object.assign({ type: 'button', onClick: handler }, attrs), label); }
    function selectExperiment(id) { stop(); endStudy(true); setStatus(''); update(function (next) { next.experiment = experiment(id).id; return next; }); }
    function renderNode(item, key) { if (typeof item === 'string') return item; return h(item.tag, Object.assign({ key: key }, item.props), item.children.map(function (child, i) { return renderNode(child, key + '-' + i); })); }
    function signed(value) { var rounded = Number(value.toFixed(2)); return (rounded > 0 ? '+' : '') + rounded; }
    function resultText(id, settings) {
      var data = experiment(id), measured = measurements(id, settings);
      if (!settings.matching || !measured) return format(t(id + '_result', data.result), settings);
      if (id === 'brightness') return format(t('brightness_match_result', 'Left RGB {reference}; right RGB {comparison}. Difference: {difference} RGB-code steps.'), { reference: measured.reference, comparison: measured.comparison, difference: signed(measured.difference) });
      return format(t('geometry_match_result', 'Reference: {reference} units; comparison: {comparison} units. Difference: {difference} units ({percent}% of the reference).'), { reference: measured.reference, comparison: measured.comparison, difference: signed(measured.difference), percent: signed(measured.percent) });
    }
    function explanationText(id, settings) {
      if (!settings.matching) return t(id + '_explanation', experiment(id).explanation);
      return t('match_explanation', 'The difference records your visual match under these settings. Remove or swap the surroundings to see whether your impression changes. Different people, displays, and viewing conditions can give different matches.');
    }
    function descriptionText(id, settings) {
      var data = experiment(id), description = t(id + '_description', data.description);
      if (settings.matching) {
        if (id === 'brightness') description = t('brightness_match_description', 'A fixed gray square on the left and an adjustable gray square on the right. Match their apparent brightness by eye.');
        if (id === 'ebbinghaus') description = t('ebbinghaus_match_description', 'A fixed orange circle on the left and an adjustable orange circle on the right. Match their apparent size by eye.');
        if (id === 'mullerLyer') description = t('mullerLyer_match_description', 'A fixed horizontal shaft at the top and an adjustable shaft below. Match their apparent length by eye; exclude the fins.');
      }
      description += ' ' + (settings.context ? t('surroundings_visible', 'Surroundings visible.') : t('surroundings_removed', 'Surroundings removed; the target drawing is unchanged.'));
      if (settings.swap && settings.context) description += ' ' + t('surroundings_swapped', 'The two surroundings have traded places.');
      if (data.cue) description += ' ' + (settings.context && settings.cue !== 'none' ? (settings.cue === 'front' ? t('lower_left_cue_visible', 'Lower left face cue visible.') : t('upper_right_cue_visible', 'Upper right face cue visible.')) : t('no_face_cue', 'No face cue visible.'));
      if (settings.reveal) description += ' ' + resultText(id, settings);
      return description;
    }
    function figure(id, settings, reference) {
      var data = experiment(id), titleId = uid + (reference ? '-ref-title' : '-title'), descId = uid + (reference ? '-ref-desc' : '-desc');
      return h('figure', { className: 'perception-figure' },
        h('figcaption', null, h('strong', { id: reference ? undefined : uid + '-current-view', tabIndex: reference ? undefined : -1 }, reference ? t('pinned_reference', 'Pinned comparison') : t('current_experiment', 'Current experiment')), h('span', null, t(id + '_title', data.title))),
        h('svg', { ref: reference ? undefined : stageRef, className: 'perception-svg', id: reference ? 'perception-stage-reference' : 'perception-stage-current', viewBox: '0 0 800 480', xmlns: 'http://www.w3.org/2000/svg', role: 'img', 'aria-labelledby': titleId + ' ' + descId },
          h('title', { id: titleId }, t(id + '_title', data.title)), h('desc', { id: descId }, descriptionText(id, settings)), scene(id, settings, t).map(renderNode)));
    }
    function save() {
      if (studyLocked || studyBusyRef.current) return;
      if (!model.prediction) { announce(t('choose_observation_first', 'Choose an observation before saving.')); return; }
      if (notebookCapacity((ctx.toolData || {}).perceptionLab).free < 1) { announce(capacityMessage(1)); return; }
      stop();
      var saved = normalizeModel(meta.id, activeModel), operation = { kind: 'save', done: false, profile: ctx.activeProfileId }, recordId = Date.now().toString(36) + '-' + (++studySerial), date = new Date().toISOString(); pendingNotebook.current = operation;
      update(function (next) {
        var free = notebookCapacity(next).free, valid = studyAlive.current && operation.profile === importProfile.current && free > 0 && !next.studies.some(function (record) { return record.id === recordId; });
        if (valid) next.studies.push({ id: recordId, experiment: meta.id, model: saved, date: date });
        if (pendingNotebook.current === operation) { operation.done = true; operation.saved = valid; operation.capacity = free < 1; operation.revision = notebookRevision.current; }
        return next;
      }, true);
    }
    function download(blob, filename) {
      var url, anchor, clicked = false;
      try {
        url = URL.createObjectURL(blob); anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
        document.body.appendChild(anchor); anchor.click(); clicked = true;
      } finally {
        if (anchor) anchor.remove();
        if (url) { if (clicked) window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000); else URL.revokeObjectURL(url); }
      }
    }
    function exportSVG() {
      try {
        if (!stageRef.current) return;
        var svg = stageRef.current.cloneNode(true); svg.setAttribute('width', '800'); svg.setAttribute('height', '480'); svg.removeAttribute('class'); svg.setAttribute('style', 'background:#fff;overflow:hidden');
        var markup = new XMLSerializer().serializeToString(svg);
        download(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), 'perception-' + meta.id + '.svg');
        announce(t('svg_exported', 'Current experiment exported as SVG.'));
      } catch (_) { announce(t('export_unavailable', 'Export could not be created. Try again.')); }
    }
    function exportNotebook() {
      try {
        if (!state.studies.length) return;
        var payload = { schema: 'alloflow.perception.notebook', version: 1, studies: normalize(state).studies };
        download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), 'perception-notebook.json');
        announce(t('notebook_exported', 'Observation notebook exported as JSON.'));
      } catch (_) { announce(t('export_unavailable', 'Export could not be created. Try again.')); }
    }
    function studyReportDocument(plan) {
      var title = plan.comparison ? t('comparison_report_title', 'Perception Lab · study comparison report') : t('study_report_title', 'Perception Lab · study report');
      var report = document.implementation.createHTMLDocument(title), root = report.documentElement;
      root.lang = text(document.documentElement.lang, 64) || 'en';
      if (document.documentElement.dir === 'rtl') root.dir = 'rtl';
      function element(tag, parent, value, attrs) {
        var item = report.createElement(tag);
        if (value !== undefined && value !== null) item.textContent = String(value);
        Object.keys(attrs || {}).forEach(function (key) { item.setAttribute(key, String(attrs[key])); });
        parent.appendChild(item); return item;
      }
      var charset = element('meta', report.head, null, { charset: 'utf-8' }); report.head.insertBefore(charset, report.head.firstChild);
      element('meta', report.head, null, { name: 'viewport', content: 'width=device-width,initial-scale=1' });
      element('meta', report.head, null, { 'http-equiv': 'Content-Security-Policy', content: "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" });
      element('style', report.head, [
        'html{color-scheme:light}*{box-sizing:border-box}body{font-family:system-ui,sans-serif;color:#163449;background:#fff;margin:0 auto;padding:24px;max-width:1200px;line-height:1.5;overflow-wrap:anywhere}h1,h2,h3{line-height:1.3}h1{font-size:1.75rem}h2{font-size:1.35rem}h3{font-size:1rem}p{margin:8px 0}a{color:#15566c}header,footer{margin-bottom:24px}.report-study,.report-comparison{border-top:2px solid #627785;margin-top:24px;padding-top:16px}',
        'table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.875rem;margin:16px 0}caption{text-align:start;font-weight:700;margin-bottom:8px}th,td{padding:8px;border-bottom:1px solid #bccfd7;text-align:start;vertical-align:top;overflow-wrap:anywhere}thead{display:table-header-group}tbody th{width:35%}dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}dl div{padding:12px;border:1px solid #bccfd7;border-radius:8px}dd{margin:6px 0 0;font-weight:700}',
        '.report-drawings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.report-trial{min-width:0;border:1px solid #bccfd7;border-radius:8px;padding:12px;break-inside:avoid;page-break-inside:avoid}.report-trial figure{margin:12px 0}.report-trial figcaption{font-weight:700;font-size:.875rem;margin-bottom:8px}.report-trial svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;forced-color-adjust:none}.report-note{white-space:pre-wrap;overflow-wrap:anywhere}.report-warning{padding:8px 12px;border-left:3px solid #9a3412}.report-created{font-size:.875rem}',
        '@media(max-width:900px){.report-drawings{grid-template-columns:1fr}dl{grid-template-columns:1fr}body{padding:16px}}@media(forced-colors:active){body{color:CanvasText;background:Canvas}.report-study,.report-comparison,.report-trial,dl div,th,td,.report-warning{border-color:CanvasText}a{color:LinkText}}@page{margin:14mm}@media print{body{padding:0;max-width:none;font-size:10pt;color:#000;background:#fff;forced-color-adjust:none}h1{font-size:18pt}h2{font-size:14pt}h3{font-size:11pt}table{font-size:9pt}th,td{padding:5px}dl{grid-template-columns:repeat(3,minmax(0,1fr))}.report-drawings{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.report-trial{padding:8px;font-size:9pt}.report-comparison+.report-study,.report-study+.report-study{break-before:page}a{color:inherit}}'
      ].join('\n') + '\n@media print{.report-study,.report-comparison,.report-trial,dl div,th,td,.report-warning{border-color:#627785}}');
      var main = element('main', report.body), header = element('header', main);
      element('h1', header, title);
      var created = new Date(), createdLine = element('p', header, t('report_created', 'Report created') + ': ', { class: 'report-created' });
      element('time', createdLine, created.toLocaleString(), { datetime: created.toISOString() });
      element('p', header, t('report_print_hint', 'Open this file in a browser to read or print it. The report includes every recorded trial, independently of the preview selections.'));
      function table(parent, caption, headings, rows, attrs) {
        var table = element('table', parent, null, attrs); element('caption', table, caption);
        var head = element('tr', element('thead', table)); headings.forEach(function (heading) { element('th', head, heading, { scope: 'col' }); });
        var body = element('tbody', table);
        rows.forEach(function (values) { var row = element('tr', body); values.forEach(function (value, index) { element(index ? 'td' : 'th', row, value, index ? {} : { scope: 'row' }); }); });
        return table;
      }
      function unit(id) { return id === 'brightness' ? t('rgb_steps', 'RGB-code steps') : t('units_label', 'units'); }
      function stats(parent, id, summary) {
        var list = element('dl', parent, null, { 'data-perception-report-summary': 'true' });
        [[t('median_match', 'Median match'), summary.median + ' ' + (id === 'brightness' ? 'RGB' : unit(id))], [t('match_range', 'Match range'), summary.min + '–' + summary.max + ' (' + summary.range + ' ' + unit(id) + ')'], [t('median_difference', 'Median difference'), signed(summary.difference) + ' ' + unit(id) + (summary.percent === null ? '' : ' (' + signed(summary.percent) + '%)')]].forEach(function (value) { var item = element('div', list); element('dt', item, value[0]); element('dd', item, value[1]); });
      }
      var svgNames = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', textAnchor: 'text-anchor', fontSize: 'font-size', fontFamily: 'font-family' };
      function svgNode(item, parent) {
        if (typeof item === 'string') { parent.appendChild(report.createTextNode(item)); return; }
        var child = report.createElementNS('http://www.w3.org/2000/svg', item.tag);
        Object.keys(item.props).forEach(function (key) { child.setAttribute(svgNames[key] || key, String(item.props[key])); });
        parent.appendChild(child); item.children.forEach(function (entry) { svgNode(entry, child); });
      }
      var pair = plan.comparison;
      if (pair) {
        var matchUnit = pair.experiment === 'brightness' ? 'RGB' : unit(pair.experiment);
        var comparison = element('section', main, null, { class: 'report-comparison', 'data-perception-report-comparison': 'true' });
        element('h2', comparison, t('study_pair_results', 'Study comparison results'));
        element('p', comparison, format(t('pair_reference_value', 'Both studies use the same fixed reference: {value} {unit}.'), { value: pair.reference, unit: pair.experiment === 'brightness' ? 'RGB' : unit(pair.experiment) }));
        table(comparison, t('pair_table_caption', 'Separate results from each three-match study'), [t('measure_label', 'Measure'), t('report_study_a', 'Study A'), t('report_study_b', 'Study B')], [
          [t('recorded_matches', 'Recorded matches'), pair.summaryA.values.join(', '), pair.summaryB.values.join(', ')], [t('starting_positions', 'Starting positions'), pair.summaryA.starts.join(', '), pair.summaryB.starts.join(', ')], [t('median_match', 'Median match'), pair.summaryA.median + ' ' + matchUnit, pair.summaryB.median + ' ' + matchUnit], [t('match_range', 'Match range'), pair.summaryA.min + '–' + pair.summaryA.max, pair.summaryB.min + '–' + pair.summaryB.max], [t('median_difference', 'Median difference'), signed(pair.summaryA.difference) + ' ' + unit(pair.experiment), signed(pair.summaryB.difference) + ' ' + unit(pair.experiment)]
        ]);
        element('p', comparison, t('median_shift_direction', 'Median shift · B minus A') + ': ' + signed(pair.medianShift) + ' ' + unit(pair.experiment) + (pair.percentShift === null ? '' : ' (' + signed(pair.percentShift) + '% ' + t('of_fixed_reference', 'of the fixed reference') + ')'));
        if (pair.changes.length) table(comparison, t('study_settings_changes', 'Changed surrounding settings'), [t('setting_label', 'Setting'), t('report_study_a', 'Study A'), t('report_study_b', 'Study B')], pair.changes.map(function (change) { return [comparisonLabel(change.key, pair.experiment) + (change.active ? '' : ' · ' + t('inactive_setting', 'Inactive')), comparisonValue(change.key, change.before, {}, pair.experiment), comparisonValue(change.key, change.after, {}, pair.experiment)]; }));
        else element('p', comparison, t('pair_same_settings', 'The two studies used the same surrounding settings. Their matches can still vary.'));
        [[pair.changes.some(function (change) { return !change.active; }), 'inactive', t('pair_inactive_hint', 'Surroundings were removed in both studies. Settings marked Inactive did not change the displayed targets.')], [pair.changes.filter(function (change) { return change.active; }).length > 1, 'multiple', t('pair_multiple_changes', 'Several surrounding settings differ. This comparison does not isolate the effect of one variable.')], [pair.startsDiffer, 'starts', t('pair_start_changes', 'These studies used different starting positions. Keep that difference in mind when comparing their matches.')]].forEach(function (warning) { if (warning[0]) element('p', comparison, warning[2], { class: 'report-warning', 'data-perception-report-warning': warning[1] }); });
        element('p', comparison, t('pair_summary_hint', 'Compare the three matches and ranges as well as the medians. Two small studies describe your matches under these settings; they do not establish a general effect.'));
      }
      plan.studies.forEach(function (entry, index) {
        var study = entry.study, data = experiment(study.experiment), summary = studySummary(study), slot = pair ? index ? 'b' : 'a' : 'study';
        var section = element('section', main, null, { class: 'report-study', 'data-perception-report-section': slot });
        element('h2', section, (pair ? index ? t('report_study_b', 'Study B') : t('report_study_a', 'Study A') : t('report_saved_study', 'Saved study')) + ' · ' + t(data.id + '_title', data.title));
        element('p', section, format(t('study_reference_value', 'Fixed reference: {value} {unit}.'), { value: summary.reference, unit: study.experiment === 'brightness' ? 'RGB' : unit(study.experiment) }));
        stats(section, study.experiment, summary);
        table(section, t('three_recorded_matches', 'Three recorded matches'), [t('trial_label', 'Trial'), t('starting_value', 'Starting value'), t('recorded_match', 'Recorded match'), t('difference_from_reference', 'Difference from reference')], study.trials.map(function (trial) { return [trial.trial, trial.startValue, trial.model.matchValue, signed(trial.model.matchValue - summary.reference)]; }), { 'data-perception-report-matches': 'true' });
        var keys = data.controls.map(function (control) { return control.key; }).concat(['context', 'swap']);
        table(section, t('report_recorded_settings', 'Recorded settings'), [t('setting_label', 'Setting'), t('report_setting_value', 'Recorded value')], keys.map(function (key) { return [comparisonLabel(key, study.experiment), comparisonValue(key, study.base[key], study.base, study.experiment)]; }), { 'data-perception-report-settings': 'true' });
        element('p', section, t('study_summary_hint', 'The median is the middle of your three matches; the range spans their lowest and highest values. These describe this small set of drawing matches, not a score. Try another study with different surroundings to compare your impressions.'));
        var drawings = element('div', section, null, { class: 'report-drawings' });
        study.trials.forEach(function (trial) {
          var card = element('article', drawings, null, { class: 'report-trial', 'data-perception-report-trial': trial.trial });
          var trialTitle = format(t('recorded_trial_title', 'Recorded trial {trial} · {title}'), { trial: trial.trial, title: t(data.id + '_title', data.title) });
          element('h3', card, trialTitle);
          var date = new Date(trial.date); if (Number.isFinite(date.getTime())) element('time', card, date.toLocaleString(), { datetime: date.toISOString() });
          var figure = element('figure', card), prefix = 'report-' + slot + '-trial-' + trial.trial;
          element('figcaption', figure, t('recorded_drawing', 'Recorded drawing'));
          var svg = report.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 800 480'); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('role', 'img'); svg.setAttribute('data-perception-report-drawing', String(trial.trial)); svg.setAttribute('aria-labelledby', prefix + '-title ' + prefix + '-desc'); figure.appendChild(svg);
          svgNode(node('title', { id: prefix + '-title' }, [trialTitle]), svg); svgNode(node('desc', { id: prefix + '-desc' }, [descriptionText(study.experiment, trial.model)]), svg); scene(study.experiment, trial.model, t).forEach(function (item) { svgNode(item, svg); });
          element('p', card, resultText(study.experiment, trial.model), { 'data-perception-report-values': trial.trial });
          element('p', card, t('recorded_impression', 'Recorded impression') + ': ' + t(data.id + '_choice_' + data.choices.indexOf(trial.model.prediction), trial.model.prediction));
          if (trial.model.note) element('p', card, t('observation_note', 'Observation note') + ': ' + trial.model.note, { class: 'report-note', 'data-perception-report-note': trial.trial });
        });
      });
      var footer = element('footer', main);
      element('p', footer, t('match_explanation', 'The difference records your visual match under these settings. Remove or swap the surroundings to see whether your impression changes. Different people, displays, and viewing conditions can give different matches.'));
      element('a', footer, t('reference', 'Scientific reference: Michael Bach'), { href: experiment(plan.studies[0].study.experiment).source, target: '_blank', rel: 'noopener noreferrer' });
      return '<!doctype html>\n' + root.outerHTML;
    }
    function exportStudyReport(groupId, secondId) {
      var plan = planStudyReport((ctx.toolData || {}).perceptionLab, groupId, secondId);
      if (plan.status !== 'ready') { announce(t('report_not_ready', 'A report needs complete, consistent, revealed studies. Review the saved results before exporting.')); return; }
      try {
        var filename = 'perception-' + (plan.comparison ? 'comparison-' : 'study-') + plan.studies[0].study.experiment + '.html';
        download(new Blob([studyReportDocument(plan)], { type: 'text/html;charset=utf-8' }), filename);
        announce(t('study_report_exported', 'Study report exported as HTML. Open it in a browser to read or print.'));
      } catch (_) { announce(t('report_unavailable', 'The study report could not be created. Try again.')); }
    }
    function clearImport() {
      var request = importRequest.current; importRequest.current = null; pendingImport.current = null;
      if (request && request.reader) request.reader.abort();
      importBusyRef.current = false; setImportBusy(false); setImportDraft(null); importFocus.current = false;
    }
    function cancelImport() { clearImport(); importFocus.current = 'open'; announce(t('import_canceled', 'Notebook import canceled.')); }
    function openImport() {
      if (studyLocked || studyBusyRef.current || importBusyRef.current) return;
      clearImport(); importRequest.current = { fingerprint: notebookFingerprint, profile: importProfile.current };
      setImportDraft({ phase: 'choose' }); importFocus.current = 'file';
    }
    function importError(status) {
      if (status === 'large') return t('import_large', 'Choose a notebook file of 512 KiB or less.');
      if (status === 'schema') return t('import_schema', 'Choose a Perception Lab notebook exported as version 1 JSON.');
      if (status === 'empty') return t('import_empty', 'This notebook has no observations to add.');
      if (status === 'records') return t('import_records', 'This notebook contains invalid observations or more than 24 records. No observations were added.');
      if (status === 'read') return t('import_read', 'The file could not be read. Choose it again.');
      return t('import_json', 'This file is not valid JSON. Choose an exported Perception Lab notebook.');
    }
    function readNotebookFile(event) {
      var file = event.target.files && event.target.files[0]; event.target.value = '';
      if (!file || studyLocked || studyBusyRef.current || importBusyRef.current) return;
      var previous = importRequest.current; importRequest.current = null;
      if (previous && previous.reader) previous.reader.abort();
      var request = { fingerprint: notebookFingerprint, profile: importProfile.current }, name = text(file.name, 160); importRequest.current = request;
      function current() { return studyAlive.current && importRequest.current === request && request.profile === importProfile.current; }
      function fail(reason) { if (current()) { setImportDraft({ phase: 'error', name: name, error: reason }); importFocus.current = 'preview'; announce(importError(reason)); } }
      if (file.size > 524288) { fail('large'); return; }
      setImportDraft({ phase: 'reading', name: name });
      try {
        var reader = new FileReader(); request.reader = reader;
        reader.onerror = function () { fail('read'); };
        reader.onload = function () {
          if (!current()) return;
          var parsed = parseNotebook(reader.result);
          if (parsed.status !== 'ready') { fail(parsed.status); return; }
          setImportDraft({ phase: 'preview', name: name, records: parsed.records, fingerprint: request.fingerprint }); importFocus.current = 'preview';
          announce(t('import_preview_ready', 'Notebook preview ready. Review the counts before adding observations.'));
        };
        reader.readAsText(file);
      } catch (_) { fail('read'); }
    }
    function addImportedObservations() {
      var request = importRequest.current;
      if (!request || !importDraft || importDraft.phase !== 'preview' || studyLocked || studyBusyRef.current || importBusyRef.current || planNotebookImport(state, importDraft.records).status !== 'ready') return;
      var records = importDraft.records, operation = { kind: 'add', done: false, profile: importProfile.current }; pendingImport.current = operation;
      importBusyRef.current = true; setImportBusy(true); pendingSavedReveal.current = null; savedRevealFeedback.current = null;
      update(function (next) {
        if (!studyAlive.current || pendingImport.current !== operation || importRequest.current !== request || operation.profile !== importProfile.current) return next;
        var valid = JSON.stringify(next.studies) === request.fingerprint && !pendingStudy.current;
        var plan = valid ? planNotebookImport(next, records) : null;
        operation.before = next.studies; operation.success = !!plan && plan.status === 'ready'; operation.count = plan ? plan.added : 0;
        var result = operation.success ? plan.state : next;
        operation.after = JSON.stringify(result.studies); operation.done = true;
        return result;
      }, true);
    }
    function undoImport() {
      if (!importUndo || studyLocked || studyBusyRef.current || importBusyRef.current) return;
      var undo = importUndo; clearImport();
      var operation = { kind: 'undo', done: false, profile: importProfile.current }; pendingImport.current = operation;
      importBusyRef.current = true; setImportBusy(true);
      update(function (next) {
        if (!studyAlive.current || pendingImport.current !== operation || operation.profile !== importProfile.current) return next;
        operation.success = JSON.stringify(next.studies) === undo.after && !pendingStudy.current;
        if (operation.success) next.studies = normalize({ studies: undo.before }).studies;
        operation.after = JSON.stringify(next.studies); operation.done = true;
        return next;
      }, true);
    }
    function importView() {
      if (!importDraft) return null;
      var plan = importDraft.phase === 'preview' ? planNotebookImport(state, importDraft.records) : null;
      return h('section', { className: 'perception-study perception-import', 'data-perception-import-preview': importDraft.phase, 'aria-label': t('import_preview', 'Notebook import preview') },
        h('h4', { id: uid + '-import-preview', tabIndex: -1 }, t('import_preview', 'Notebook import preview')),
        h('p', null, t('import_hint', 'Preview an exported notebook before adding its observations. Existing observations stay saved; the current drawing and pinned view are kept.')),
        h('label', { className: 'perception-field', htmlFor: uid + '-import-file' }, t('choose_notebook_file', 'Choose notebook JSON file'), h('input', { id: uid + '-import-file', type: 'file', accept: '.json,application/json', 'data-perception-import-file': true, disabled: importBusy, onChange: readNotebookFile })),
        importDraft.name && h('p', { className: 'perception-import-filename' }, importDraft.name),
        importDraft.phase === 'reading' && h('p', null, t('reading_notebook', 'Reading notebook…')),
        importDraft.phase === 'error' && h('p', null, importError(importDraft.error)),
        plan && h('div', { 'data-perception-import-counts': true },
          h('dl', { className: 'perception-study-stats' },
            h('div', null, h('dt', null, t('import_new_count', 'New observations')), h('dd', { 'data-perception-import-added': true }, plan.added)),
            h('div', null, h('dt', null, t('import_existing_count', 'Already saved')), h('dd', { 'data-perception-import-skipped': true }, plan.skipped)),
            h('div', null, h('dt', null, t('import_free_count', 'Available spaces')), h('dd', { 'data-perception-import-free': true }, plan.free))),
          plan.remappedGroups > 0 && h('p', null, t('import_group_copies', 'Overlapping repeated studies will be added as separate copies, keeping their matches together.')),
          plan.status === 'capacity' && h('p', null, format(t('import_capacity', 'This import needs {count} spaces; {available} are available. Delete observations you no longer need, then preview the file again.'), { count: plan.added, available: plan.free })),
          plan.status === 'unchanged' && h('p', null, t('import_unchanged', 'All observations in this file are already saved.')),
          h('p', null, t('import_hidden_hint', 'Saved reveal states are preserved. Hidden drawing values stay hidden.'))),
        h('div', { className: 'perception-actions' }, plan && button(t('add_imported_observations', 'Add observations'), addImportedObservations, { disabled: plan.status !== 'ready' || importBusy || studyLocked || studyBusy }), button(t('cancel_import', 'Cancel import'), cancelImport)));
    }
    function removeStudy(id) {
      pendingSavedReveal.current = null; savedRevealFeedback.current = null;
      var operation = { kind: 'delete', done: false, profile: ctx.activeProfileId }; pendingNotebook.current = operation;
      update(function (next) {
        if (!studyAlive.current || operation.profile !== importProfile.current) return next;
        var result = deleteStudy(next, id);
        if (pendingNotebook.current === operation) { operation.done = true; operation.undo = result.undo; operation.revision = notebookRevision.current; }
        return result.state;
      }, true);
    }
    function capacityMessage(required) {
      return format(t('notebook_spaces_needed', 'This action needs {required} available spaces; {free} remain. Export your notebook or delete observations you no longer need to make room.'), { required: required, free: notebookCapacity((ctx.toolData || {}).perceptionLab).free });
    }
    function focusNotebook() { setControlsOpen(true); var heading = document.getElementById(uid + '-notebook'); if (heading) heading.focus(); }
    function openGroupDelete(groupId, event) {
      if (studyLocked || studyBusyRef.current || importBusyRef.current) return;
      var current = normalize((ctx.toolData || {}).perceptionLab), plan = deleteSavedStudy(current, groupId);
      if (!plan.undo) { announce(t('notebook_action_expired', 'The notebook changed. That observation action is no longer available.')); return; }
      var ids = Array.from(new Set(plan.undo.records.map(function (entry) { return entry.study.experiment; })));
      var draft = { groupId: plan.undo.groupId, count: plan.undo.records.length, experiments: ids, fingerprint: JSON.stringify(current.studies), profile: ctx.activeProfileId, returnFocus: event && event.currentTarget };
      groupDeleteSelection.current = draft; groupDeleteFocus.current = true; setGroupDelete(draft);
    }
    function cancelGroupDelete(restoreFocus) {
      var draft = groupDeleteSelection.current; groupDeleteSelection.current = null; groupDeleteFocus.current = false; groupDeleteFocusWithin.current = false; setGroupDelete(null);
      if (restoreFocus) { var target = draft && draft.returnFocus; if (target && target.isConnected && !target.disabled && !target.closest('details:not([open]),[hidden]')) target.focus(); else focusNotebook(); }
    }
    function confirmGroupDelete() {
      var draft = groupDelete;
      if (!draft || groupDeleteSelection.current !== draft || studyLocked || studyBusyRef.current || importBusyRef.current) return;
      pendingSavedReveal.current = null; savedRevealFeedback.current = null;
      var operation = { kind: 'delete', done: false }; pendingNotebook.current = operation;
      update(function (next) {
        var valid = studyAlive.current && pendingNotebook.current === operation && draft.profile === importProfile.current && draft.fingerprint === JSON.stringify(next.studies) && !studyBusyRef.current && !importBusyRef.current;
        var result = valid ? deleteSavedStudy(next, draft.groupId) : { state: next, undo: null };
        if (pendingNotebook.current === operation) { operation.done = true; operation.undo = result.undo; operation.revision = notebookRevision.current; }
        return result.state;
      }, true); cancelGroupDelete(false);
    }
    function groupDeleteView() {
      if (!groupDelete || groupDelete.fingerprint !== notebookFingerprint || groupDelete.profile !== ctx.activeProfileId || maskStudyViews || importBusy) return null;
      var title = groupDelete.experiments.length === 1 ? t(groupDelete.experiments[0] + '_title', experiment(groupDelete.experiments[0]).title) : t('mixed_experiments', 'Mixed experiments');
      return h('section', { className: 'perception-study', 'data-perception-group-delete-preview': groupDelete.groupId, 'aria-labelledby': uid + '-delete-group-heading', onFocusCapture: function () { groupDeleteFocusWithin.current = true; }, onBlurCapture: function (event) { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) groupDeleteFocusWithin.current = false; }, onKeyDown: function (event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelGroupDelete(true); } } },
        h('h4', { id: uid + '-delete-group-heading', tabIndex: -1 }, t('delete_saved_study', 'Delete saved study') + ' · ' + title),
        h('p', { id: uid + '-delete-group-hint' }, format(t('delete_saved_study_hint', 'This removes all {count} retained observations in this saved study. Other observations stay in place. One Undo is available after deleting.'), { count: groupDelete.count })),
        h('div', { className: 'perception-actions' }, button(format(t('delete_study_observations', 'Delete {count} observations'), { count: groupDelete.count }), confirmGroupDelete, { 'data-perception-confirm-group-delete': true, 'aria-describedby': uid + '-delete-group-hint' }), button(t('cancel_study_deletion', 'Cancel deletion'), function () { cancelGroupDelete(true); }, { 'data-perception-cancel-group-delete': true })));
    }
    function undoDeletion() {
      if (!deleted) return;
      var operation = { kind: 'restore', done: false, count: undoCount, profile: ctx.activeProfileId }; pendingNotebook.current = operation;
      update(function (next) {
        if (!studyAlive.current || pendingNotebook.current !== operation || operation.profile !== importProfile.current) return next;
        var valid = undoRevision.current === notebookRevision.current, room = notebookCapacity(next).free >= operation.count;
        var restored = valid && room ? deleted.records ? restoreDeletedStudy(next, deleted) : restoreDeleted(next, deleted) : next;
        if (pendingNotebook.current === operation) { operation.done = true; operation.capacity = valid && !room; operation.restored = valid && restored.studies.length === next.studies.length + operation.count; operation.revision = notebookRevision.current; }
        return restored;
      }, true);
      var heading = document.getElementById(uid + '-notebook'); if (heading) heading.focus();
    }
    function setMatching(value) {
      if (studyLocked || studyBusyRef.current) return;
      if (model.matching === value) return;
      stop();
      var changes = { matching: value, reveal: false };
      if (value) { changes.matchValue = measurements(meta.id, Object.assign({}, model, { matching: false })).reference; changes.prediction = ''; }
      change(changes);
    }
    function endStudy(quiet) {
      pendingStudy.current = null; guidedRun.current = null; studyBusyRef.current = false; setStudyBusy(false); setActiveStudy(null); studyRevisions.current = null;
      if (!quiet) { setControlsOpen(true); focusTrial.current = 'match'; announce(t('study_ended', 'Repeated study ended. Recorded matches remain in your notebook.')); }
    }
    function startStudyFrom(recordId) {
      if (studyBusyRef.current || studyLocked || importBusyRef.current) return;
      if (notebookCapacity((ctx.toolData || {}).perceptionLab).free < 3) { announce(capacityMessage(3)); return; }
      clearImport();
      clearGuidePlan(); guidedRun.current = null;
      stop(); studyBusyRef.current = true; setStudyBusy(true);
      var operation = { kind: 'start', done: false }, groupId = 'matches-' + Date.now().toString(36) + '-' + (++studySerial); pendingStudy.current = operation;
      update(function (next) {
        if (!studyAlive.current || pendingStudy.current !== operation) return next;
        var record = recordId ? next.studies.find(function (item) { return item.id === recordId; }) : null;
        var id = recordId ? record && record.experiment : next.experiment, base = recordId ? record && Object.assign({}, record.model, { note: '' }) : next.models[id];
        var room = notebookCapacity(next).free >= 3, study = room ? createStudy(id, base, groupId) : null;
        if (study) { next.experiment = id; next.models[id] = studyModel(study); }
        operation.done = true; operation.success = !!study; operation.capacity = !room; operation.study = study; operation.revisions = { notebook: notebookRevision.current, experiment: experimentRevision.current };
        return next;
      });
    }
    function recordMatch() {
      if (!activeStudy || !collecting || !model.prediction || studyBusyRef.current) return;
      studyBusyRef.current = true; setStudyBusy(true);
      var operation = { kind: 'record', done: false, guide: guidedRun.current }, study = activeStudy, trial = study.trials.length + 1, recordId = Date.now().toString(36) + '-' + (++studySerial), date = new Date().toISOString(); pendingStudy.current = operation;
      update(function (next) {
        if (!studyAlive.current || pendingStudy.current !== operation) return next;
        var valid = studyRevisions.current && studyRevisions.current.notebook === notebookRevision.current && studyRevisions.current.experiment === experimentRevision.current && guidedSourcePresent(next, operation.guide);
        var result = valid ? recordStudyTrial(next, study, trial, recordId, date) : { state: next, study: study, recorded: false };
        operation.done = true; operation.success = result.recorded; operation.capacity = notebookCapacity(next).free < 1 && !result.recorded; operation.study = result.study; operation.revisions = { notebook: notebookRevision.current, experiment: experimentRevision.current };
        return result.state;
      }, true);
    }
    function revealMatches() {
      if (!activeStudy || collecting || studyBusyRef.current) return;
      studyBusyRef.current = true; setStudyBusy(true);
      var operation = { kind: 'reveal', done: false }, study = activeStudy; pendingStudy.current = operation;
      update(function (next) {
        if (!studyAlive.current || pendingStudy.current !== operation) return next;
        var valid = studyRevisions.current && studyRevisions.current.notebook === notebookRevision.current && studyRevisions.current.experiment === experimentRevision.current;
        var result = valid ? revealStudy(next, study) : { state: next, study: study, revealed: false };
        operation.done = true; operation.success = result.revealed; operation.study = result.study; operation.revisions = { notebook: notebookRevision.current, experiment: experimentRevision.current };
        return result.state;
      }, true);
    }
    function openRecordedViewer(groupId, slot, heading, event) {
      if (!previewIdentities[slot] || studyBusyRef.current || importBusyRef.current) return;
      viewerReturn.current = event.currentTarget;
      setViewer({ groupId: groupId, slot: slot, heading: heading, identity: previewIdentities[slot], profile: ctx.activeProfileId });
    }
    function closeRecordedViewer() { setViewer(null); }
    function returnFromViewer() {
      var target = viewerReturn.current; viewerReturn.current = null;
      if (!target || !target.isConnected || target.disabled || target.closest('details:not([open]),[hidden]')) target = document.getElementById(uid + '-notebook');
      if (target) target.focus();
    }
    function recordedPreview(groupId, slot, heading, enlarged) {
      var identity = previewIdentities[slot], saved = object(previewOptions[slot]);
      var options = identity && saved.identity === identity ? saved : { identity: identity, trial: 1, guides: true };
      var recorded = identity ? recordedTrial(state, groupId, options.trial) : null;
      if (!recorded || recorded.status !== 'ready') return null;
      var data = experiment(recorded.experiment), drawing = Object.assign({}, recorded.model, { reveal: options.guides });
      var displaySlot = enlarged ? 'viewer' : slot, prefix = uid + '-recorded-' + displaySlot, date = new Date(recorded.date), validDate = Number.isFinite(date.getTime());
      var label = heading || t('recorded_drawing', 'Recorded drawing');
      var trialTitle = format(t('recorded_trial_title', 'Recorded trial {trial} · {title}'), { trial: recorded.trial, title: t(data.id + '_title', data.title) });
      function selectPreview(values) { setPreviewOptions(function (previous) { var next = Object.assign({}, previous); next[slot] = Object.assign({}, options, values); return next; }); }
      return h('section', { className: 'perception-recorded-preview', 'data-perception-recorded-preview': displaySlot, 'data-perception-recorded-trial': recorded.trial, 'aria-labelledby': prefix + '-heading' },
        h(enlarged ? 'h3' : 'h5', { id: prefix + '-heading' }, label),
        h('p', null, t('recorded_drawing_hint', 'Inspect an actual saved match. Trial selections and guides apply only to these previews.')),
        h('label', { className: 'perception-field', htmlFor: prefix + '-trial' }, t('recorded_trial_label', 'Recorded trial'),
          h('select', { id: prefix + '-trial', value: options.trial, 'data-perception-preview-trial': displaySlot, 'aria-describedby': prefix + '-heading', onChange: function (event) { selectPreview({ trial: Number(event.target.value) }); } },
            [1, 2, 3].map(function (trial) { return h('option', { key: trial, value: trial }, format(t('recorded_trial_option', 'Trial {trial}'), { trial: trial })); }))),
        h('div', { className: 'perception-actions' }, button(t('show_measurement_guides', 'Show measurement guides'), function () { selectPreview({ guides: !options.guides }); }, { 'data-perception-preview-guides': displaySlot, 'aria-pressed': options.guides, 'aria-describedby': prefix + '-heading' }),
          !enlarged && button(t('enlarge_recorded_drawing', 'Enlarge drawing'), function (event) { openRecordedViewer(groupId, slot, heading, event); }, { 'data-perception-enlarge': slot, 'aria-haspopup': 'dialog', 'aria-describedby': prefix + '-heading', disabled: studyBusy || importBusy })),
        h('figure', null,
          h('figcaption', null, trialTitle),
          h('svg', { viewBox: '0 0 800 480', xmlns: 'http://www.w3.org/2000/svg', role: 'img', 'data-perception-recorded-scene': displaySlot, 'aria-labelledby': prefix + '-title ' + prefix + '-desc' },
            h('title', { id: prefix + '-title' }, label + ' · ' + trialTitle), h('desc', { id: prefix + '-desc' }, descriptionText(recorded.experiment, drawing)), scene(recorded.experiment, drawing, t).map(renderNode))),
        h('p', { 'data-perception-recorded-values': displaySlot }, resultText(recorded.experiment, recorded.model)),
        h('p', null, t('recorded_impression', 'Recorded impression') + ': ' + t(data.id + '_choice_' + data.choices.indexOf(recorded.model.prediction), recorded.model.prediction)),
        validDate && h('p', null, h('time', { dateTime: date.toISOString() }, date.toLocaleString())),
        recorded.model.note && h('p', { className: 'perception-recorded-note' }, t('observation_note', 'Observation note') + ': ' + recorded.model.note));
    }
    function summaryView(study, slot) {
      var summary = studySummary(study); if (!summary) return null;
      var unit = study.experiment === 'brightness' ? t('rgb_steps', 'RGB-code steps') : t('units_label', 'units');
      return h('div', { 'data-perception-study-summary': study.id },
        h('p', null, format(t('study_reference_value', 'Fixed reference: {value} {unit}.'), { value: summary.reference, unit: study.experiment === 'brightness' ? 'RGB' : unit })),
        h('table', { className: 'perception-study-table' }, h('caption', null, t('three_recorded_matches', 'Three recorded matches')),
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('trial_label', 'Trial')), h('th', { scope: 'col' }, t('starting_value', 'Starting value')), h('th', { scope: 'col' }, t('recorded_match', 'Recorded match')), h('th', { scope: 'col' }, t('difference_from_reference', 'Difference from reference')))),
          h('tbody', null, summary.values.map(function (value, index) { return h('tr', { key: index }, h('th', { scope: 'row' }, index + 1), h('td', null, summary.starts[index]), h('td', null, value), h('td', null, signed(value - summary.reference))); }))),
        h('dl', { className: 'perception-study-stats' },
          h('div', null, h('dt', null, t('median_match', 'Median match')), h('dd', null, summary.median + ' ' + (study.experiment === 'brightness' ? 'RGB' : unit))),
          h('div', null, h('dt', null, t('match_range', 'Match range')), h('dd', null, summary.min + '–' + summary.max + ' (' + summary.range + ' ' + unit + ')')),
          h('div', null, h('dt', null, t('median_difference', 'Median difference')), h('dd', null, signed(summary.difference) + ' ' + unit + (summary.percent === null ? '' : ' (' + signed(summary.percent) + '%)')))),
        h('p', null, t('study_summary_hint', 'The median is the middle of your three matches; the range spans their lowest and highest values. These describe this small set of drawing matches, not a score. Try another study with different surroundings to compare your impressions.')),
        recordedPreview(study.id, slot),
        h('div', { className: 'perception-actions' }, button(t('export_study_report', 'Export study report'), function () { exportStudyReport(study.id); }, { 'data-perception-report-study': study.id, 'data-perception-report-slot': slot, disabled: studyBusy || importBusy })),
        h('p', null, t('study_report_hint', 'The report includes all three recorded drawings and notes. Open the exported HTML file in a browser to read or print it.')));
    }
    function guidedSourcePresent(current, guide) {
      if (!guide) return true;
      var source = savedStudy(current, guide.sourceId);
      return !!source.study && studyFingerprint(source.study) === guide.fingerprint;
    }
    function clearGuidePlan() {
      guideSelection.current = null; guideEpoch.current++; guideFocus.current = false; setGuideDraft(null);
      if (pendingStudy.current && pendingStudy.current.kind === 'start' && pendingStudy.current.guide) { pendingStudy.current = null; studyBusyRef.current = false; setStudyBusy(false); }
    }
    function cancelGuidePlan() { clearGuidePlan(); guideFocus.current = 'open'; announce(t('guided_canceled', 'Study plan canceled.')); }
    function openGuidePlan() {
      if (studyLocked || studyBusyRef.current) return;
      var source = savedStudy(state, reviewedGroup), choices = guidedSettings(state, reviewedGroup), first = choices.find(function (choice) { return choice.active; });
      if (!source.study || !first) return;
      var draft = { groupId: reviewedGroup, key: first.key, value: first.value, fingerprint: studyFingerprint(source.study), epoch: ++guideEpoch.current };
      guideSelection.current = draft; setGuideDraft(draft); guideFocus.current = true;
    }
    function editGuidePlan(key, value) {
      if (!guideDraft) return;
      var pending = pendingStudy.current;
      if (pending && pending.kind === 'start' && pending.guide) { pendingStudy.current = null; studyBusyRef.current = false; setStudyBusy(false); }
      var draft = Object.assign({}, guideDraft, { key: key, value: value, epoch: ++guideEpoch.current });
      guideSelection.current = draft; setGuideDraft(draft);
    }
    function startGuidedStudy() {
      if (studyLocked || studyBusyRef.current || importBusyRef.current || !guideDraft || !guideSelection.current || guideSelection.current.epoch !== guideDraft.epoch) return;
      var renderedPlan = planRepeat(state, guideDraft.groupId, guideDraft.key, guideDraft.value);
      if (renderedPlan.status !== 'ready' || renderedPlan.fingerprint !== guideDraft.fingerprint) return;
      clearImport(); stop(); studyBusyRef.current = true; setStudyBusy(true);
      var draft = guideDraft, revision = notebookRevision.current, groupId = 'matches-' + Date.now().toString(36) + '-' + (++studySerial);
      var operation = { kind: 'start', done: false, guide: { sourceId: draft.groupId, fingerprint: draft.fingerprint } }; pendingStudy.current = operation;
      update(function (next) {
        if (!studyAlive.current || pendingStudy.current !== operation) return next;
        var selected = guideSelection.current, plan = planRepeat(next, draft.groupId, draft.key, draft.value);
        var valid = revision === notebookRevision.current && selected && selected.epoch === draft.epoch && selected.groupId === draft.groupId && studySelection.current.first === draft.groupId && plan.status === 'ready' && plan.fingerprint === draft.fingerprint && !next.studies.some(function (record) { return record.repeat && record.repeat.id === groupId; });
        var study = valid ? createStudy(plan.experiment, plan.base, groupId, plan.starts) : null;
        if (study) { next.experiment = study.experiment; next.models[study.experiment] = studyModel(study); }
        operation.done = true; operation.success = !!study; operation.capacity = plan.status === 'capacity'; operation.study = study; operation.revisions = { notebook: notebookRevision.current, experiment: experimentRevision.current };
        return next;
      });
    }
    function guidedPlanReason(status) {
      if (status === 'ready') return t('guided_ready', 'The new study changes only this setting. The reference and three starting positions stay fixed.');
      if (status === 'unchanged') return t('guided_unchanged', 'Choose a different value or state before starting.');
      if (status === 'capacity') return t('guided_capacity', 'Make room for three new matches by deleting observations you no longer need. Existing observations are kept until you delete them.');
      if (status === 'inactive') return t('guided_inactive', 'Choose a setting that changes the visible surroundings.');
      if (status === 'value') return t('guided_invalid_value', 'Choose a value within the setting range.');
      return t('guided_plan_expired', 'The baseline or plan changed. Review the saved study and plan the repeat again; recorded matches remain in the notebook.');
    }
    function guidedPlanView(group) {
      if (!group.complete || !group.study) return null;
      var draft = guideDraft && guideDraft.groupId === reviewedGroup ? guideDraft : null;
      if (!draft) return button(t('plan_one_setting_repeat', 'Plan one-setting repeat'), openGuidePlan, { id: uid + '-guide-open', disabled: studyLocked || studyBusy });
      var choices = guidedSettings(state, draft.groupId), selected = choices.find(function (choice) { return choice.key === draft.key; }), plan = planRepeat(state, draft.groupId, draft.key, draft.value);
      var status = plan.fingerprint === draft.fingerprint ? plan.status : 'source', id = group.study.experiment;
      return h('section', { className: 'perception-study perception-guided-plan', 'data-perception-guided-plan': 'true', 'data-perception-guided-status': status, 'aria-labelledby': uid + '-guide-heading' },
        h('h4', { id: uid + '-guide-heading' }, t('guided_title', 'Repeat with one change')),
        h('p', { id: uid + '-guide-hint' }, t('guided_hint', 'Use this saved study as the baseline. Choose one surrounding setting to change. The reference and three starting positions stay the same.')),
        !group.study.base.context && h('p', null, t('guided_hidden_context', 'Surroundings are removed in this baseline. Make them visible to compare their effect.')),
        h('div', { className: 'perception-guide-fields' },
          h('label', { className: 'perception-field', htmlFor: uid + '-guide-setting' }, t('guided_setting', 'Setting to change'),
            h('select', { id: uid + '-guide-setting', value: draft.key, 'data-perception-guided-setting': 'true', 'aria-describedby': uid + '-guide-hint', disabled: studyBusy, onChange: function (event) { var choice = choices.find(function (option) { return option.key === event.target.value; }); if (choice && choice.active) editGuidePlan(choice.key, choice.value); } },
              choices.map(function (choice) { return h('option', { key: choice.key, value: choice.key, disabled: !choice.active }, comparisonLabel(choice.key, id) + (!choice.active ? ' · ' + (choice.reason === 'identical' ? t('guided_identical_backgrounds', 'Identical backgrounds') : t('guided_inactive_context', 'Surroundings hidden')) : '')); }))),
          selected && h('label', { className: 'perception-field', htmlFor: uid + '-guide-value' },
            h('span', null, t('guided_value', 'New setting'), h('output', { htmlFor: uid + '-guide-value', 'aria-hidden': 'true' }, comparisonValue(selected.key, draft.value, group.study.base, id))),
            selected.type === 'range' ? h('input', { type: 'range', id: uid + '-guide-value', 'data-perception-guided-value': 'true', min: selected.min, max: selected.max, step: selected.step, value: draft.value, disabled: studyBusy, 'aria-label': t('guided_value', 'New setting'), 'aria-valuetext': comparisonValue(selected.key, draft.value, group.study.base, id), onChange: function (event) { editGuidePlan(selected.key, Number(event.target.value)); } }) : h('select', { id: uid + '-guide-value', 'data-perception-guided-value': 'true', value: String(draft.value), disabled: studyBusy, onChange: function (event) { editGuidePlan(selected.key, event.target.value === 'true'); } },
              h('option', { value: 'false' }, selected.key === 'context' ? t('guided_context_removed', 'Surroundings removed') : t('guided_order_original', 'Original arrangement')),
              h('option', { value: 'true' }, selected.key === 'context' ? t('guided_context_visible', 'Surroundings visible') : t('guided_order_swapped', 'Swapped arrangement'))),
            h('small', null, format(t('guided_baseline_value', 'Baseline setting: {value}.'), { value: comparisonValue(selected.key, selected.value, group.study.base, id) })))),
        h('p', { id: uid + '-guide-status' }, guidedPlanReason(status)),
        h('p', null, t('guided_start_hint', 'Starting opens this experiment and locks its surroundings for three new matches. Your pinned drawing is kept.')),
        h('div', { className: 'perception-actions' }, button(t('start_planned_study', 'Start planned study'), startGuidedStudy, { disabled: status !== 'ready' || studyLocked || studyBusy || importBusy, 'aria-describedby': uid + '-guide-status' }), button(t('cancel_study_plan', 'Cancel study plan'), cancelGuidePlan)));
    }
    function reviewStudy(id, event) {
      clearGuidePlan();
      pendingSavedReveal.current = null; savedRevealFeedback.current = null;
      reviewRevision.current = notebookRevision.current; reviewReturnFocus.current = event && event.currentTarget; setReviewedGroup(id); setComparedGroup(''); studySelection.current = { first: id, second: '', epoch: ++selectionEpoch.current };
      announce(t('study_review_opened', 'Saved study opened for review.'));
    }
    function closeReview() { clearGuidePlan(); pendingSavedReveal.current = null; savedRevealFeedback.current = null; setReviewedGroup(''); setComparedGroup(''); studySelection.current = { first: '', second: '', epoch: ++selectionEpoch.current }; var target = reviewReturnFocus.current; if (!target || !target.isConnected || target.disabled || target.closest('details:not([open]),[hidden]')) target = document.getElementById(uid + '-notebook'); if (target) target.focus(); }
    function selectComparedStudy(id) {
      pendingSavedReveal.current = null; savedRevealFeedback.current = null;
      setComparedGroup(id); studySelection.current = { first: reviewedGroup, second: id, epoch: ++selectionEpoch.current };
      announce(id ? t('study_comparison_selected', 'Comparison study selected. Each study keeps its own reveal state.') : t('study_comparison_cleared', 'Study comparison cleared.'));
    }
    function revealReviewedStudy(comparison) {
      comparison = comparison === true;
      var groupId = comparison ? comparedGroup : reviewedGroup, revision = reviewRevision.current, selected = studySelection.current, operation = { done: false, groupId: groupId, first: reviewedGroup, epoch: selected.epoch, comparison: comparison }; pendingSavedReveal.current = operation;
      update(function (next) {
        if (!studyAlive.current || pendingSavedReveal.current !== operation) return next;
        var group = savedStudy(next, groupId), selection = studySelection.current, pair = comparison ? compareStudies(next, operation.first, groupId) : null;
        var canReveal = revision === notebookRevision.current && selection.epoch === operation.epoch && selection.first === operation.first && (!comparison || selection.second === groupId && (pair.status === 'hidden' || pair.status === 'ready')) && group.complete && !!group.study;
        operation.done = true; operation.success = canReveal; operation.revision = notebookRevision.current;
        return canReveal ? revealSavedStudy(next, groupId) : next;
      }, true);
    }
    function studyComparisonReason(status) {
      if (status === 'same') return t('pair_same', 'Choose a different study.');
      if (status === 'conflict') return t('pair_conflict', 'One study has conflicting settings or duplicate trials. Review its observations individually.');
      if (status === 'experiment') return t('pair_experiment', 'Choose studies from the same experiment.');
      if (status === 'reference') return t('pair_reference', 'These studies use different fixed references. Repeat the settings with the same reference to compare them.');
      if (status === 'hidden') return t('pair_hidden', 'Reveal each study separately to see the comparison. Selecting a study does not reveal its drawing values.');
      return t('pair_incomplete', 'Both studies need three retained matches before they can be compared.');
    }
    function studyComparisonPlot(pair) {
      var values = pair.summaryA.values.concat(pair.summaryB.values, [pair.reference]), low = Math.min.apply(null, values), high = Math.max.apply(null, values), padding = Math.max((high - low) * 0.2, pair.experiment === 'brightness' ? 4 : pair.reference * 0.02);
      var config = MATCHING[pair.experiment], min = Math.max(config.min, Math.floor(low - padding)), max = Math.min(config.max, Math.ceil(high + padding));
      function x(value) { return 60 + (value - min) / (max - min) * 290; }
      var stroke = 'var(--pl-ink)', titleId = uid + '-pair-plot-title';
      return h('figure', { className: 'perception-pair-plot' },
        h('svg', { viewBox: '0 0 400 225', role: 'img', 'aria-labelledby': titleId, 'data-perception-study-plot': 'true' },
          h('title', { id: titleId }, t('pair_plot_title', 'Three matches and the median of each study, on one shared drawing-value scale.')),
          h('line', { x1: x(pair.reference), x2: x(pair.reference), y1: 35, y2: 180, stroke: stroke, strokeDasharray: '6 5', 'data-perception-pair-reference': pair.reference }),
          h('text', { x: x(pair.reference), y: 23, textAnchor: 'middle', fill: stroke, fontSize: 16 }, format(t('pair_plot_reference', 'Reference {value}'), { value: pair.reference })),
          [pair.summaryA, pair.summaryB].map(function (summary, index) { var y = 75 + index * 70; return h('g', { key: index, 'data-perception-pair-series': index ? 'b' : 'a' },
            h('text', { x: 12, y: y + 6, fill: stroke, fontSize: 18, fontWeight: 700 }, index ? t('study_b_short', 'B') : t('study_a_short', 'A')),
            h('line', { x1: x(summary.min), x2: x(summary.max), y1: y, y2: y, stroke: stroke, strokeWidth: 2 }),
            summary.values.map(function (value, trial) { return h('circle', { key: trial, cx: x(value), cy: y + (trial - 1) * 12, r: 6, fill: stroke, 'data-perception-pair-value': value }); }),
            h('line', { x1: x(summary.median), x2: x(summary.median), y1: y - 25, y2: y + 25, stroke: stroke, strokeWidth: 3, 'data-perception-pair-median': summary.median })); }),
          h('line', { x1: 60, x2: 350, y1: 193, y2: 193, stroke: stroke }),
          [min, max].map(function (value) { return h('g', { key: value }, h('line', { x1: x(value), x2: x(value), y1: 187, y2: 199, stroke: stroke }), h('text', { x: x(value), y: 219, textAnchor: 'middle', fill: stroke, fontSize: 16 }, value)); })),
        h('figcaption', null, t('pair_plot_hint', 'Dots are individual matches; solid vertical marks are medians. The dashed line is the fixed reference. Both rows use the same scale; its bounds are shown below.')));
    }
    function studyComparisonView() {
      var groups = savedStudies(state), candidates = groups.filter(function (group) { return group.groupId !== reviewedGroup; }), pair = comparedGroup ? compareSavedGroups(groups, reviewedGroup, comparedGroup) : null;
      var candidatePairs = candidates.map(function (group) { return { group: group, comparison: compareSavedGroups(groups, reviewedGroup, group.groupId) }; });
      var eligible = candidatePairs.filter(function (entry) { return entry.comparison.status === 'ready' || entry.comparison.status === 'hidden'; });
      var selectedExists = candidates.some(function (group) { return group.groupId === comparedGroup; }), ready = pair && pair.status === 'ready';
      var firstLabel = t('study_a_label', 'Study A · reviewed'), secondLabel = t('study_b_label', 'Study B · selected');
      var unit = ready && pair.experiment === 'brightness' ? t('rgb_steps', 'RGB-code steps') : t('units_label', 'units');
      function valueLabel(summary) { return summary.median + ' ' + (pair.experiment === 'brightness' ? 'RGB' : unit); }
      function rangeLabel(summary) { return summary.min + '–' + summary.max + ' (' + summary.range + ' ' + unit + ')'; }
      return h('section', { className: 'perception-study perception-study-compare', 'data-perception-study-comparison': 'true', 'aria-labelledby': uid + '-pair-heading' },
        h('h4', { id: uid + '-pair-heading', tabIndex: -1 }, t('compare_saved_studies', 'Compare saved studies')),
        h('p', { id: uid + '-pair-instructions' }, t('pair_instructions', 'Study A is the study reviewed above. Select a second study with the same experiment and fixed reference. Their drawing values stay hidden until each study is revealed.')),
        h('label', { className: 'perception-field', htmlFor: uid + '-pair-selector' }, t('compare_another_study', 'Compare with another study'),
          h('select', { id: uid + '-pair-selector', value: comparedGroup, 'data-perception-study-selector': 'true', 'aria-describedby': uid + '-pair-instructions', onChange: function (event) { selectComparedStudy(event.target.value); } },
            h('option', { value: '' }, t('choose_saved_study', 'Choose a saved study')),
            comparedGroup && !selectedExists && h('option', { value: comparedGroup, disabled: true }, t('pair_missing_option', 'Selected study is no longer in the notebook')),
            candidatePairs.map(function (entry) { var group = entry.group, status = entry.comparison.status, canCompare = status === 'ready' || status === 'hidden', number = groups.length - groups.indexOf(group), data = experiment(group.experiment);
              var label = format(t('saved_study_option', 'Study {number} · {title} · {state}'), { number: number, title: t(data.id + '_title', data.title), state: canCompare ? group.revealed ? t('revealed', 'Revealed') : t('hidden', 'Hidden') : studyComparisonReason(status) });
              return h('option', { key: group.groupId, value: group.groupId, disabled: !canCompare }, label); }))),
        !eligible.length && h('p', null, t('pair_no_compatible', 'There is no compatible pair available yet. Both studies need three consistent matches with the same experiment and reference.')),
        pair && !ready && h('p', { 'data-perception-study-pair-unavailable': pair.status }, studyComparisonReason(pair.status)),
        pair && pair.status === 'hidden' && !pair.b.revealed && button(t('reveal_comparison_study', 'Reveal comparison study'), function () { revealReviewedStudy(true); }),
        ready && h('div', { 'data-perception-study-pair-results': 'true' },
          h('h4', { id: uid + '-pair-results', tabIndex: -1 }, t('study_pair_results', 'Study comparison results')),
          h('p', null, format(t('pair_reference_value', 'Both studies use the same fixed reference: {value} {unit}.'), { value: pair.reference, unit: pair.experiment === 'brightness' ? 'RGB' : unit })),
          studyComparisonPlot(pair),
          h('table', { className: 'perception-study-table' }, h('caption', null, t('pair_table_caption', 'Separate results from each three-match study')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('measure_label', 'Measure')), h('th', { scope: 'col' }, firstLabel), h('th', { scope: 'col' }, secondLabel))),
            h('tbody', null,
              [[t('recorded_matches', 'Recorded matches'), pair.summaryA.values.join(', '), pair.summaryB.values.join(', ')], [t('starting_positions', 'Starting positions'), pair.summaryA.starts.join(', '), pair.summaryB.starts.join(', ')], [t('median_match', 'Median match'), valueLabel(pair.summaryA), valueLabel(pair.summaryB)], [t('match_range', 'Match range'), rangeLabel(pair.summaryA), rangeLabel(pair.summaryB)], [t('median_difference', 'Median difference'), signed(pair.summaryA.difference) + ' ' + unit, signed(pair.summaryB.difference) + ' ' + unit]].map(function (row, index) { return h('tr', { key: index }, h('th', { scope: 'row' }, row[0]), h('td', null, row[1]), h('td', null, row[2])); }))),
          h('p', { className: 'perception-pair-shift', 'data-perception-median-shift': 'true' }, h('strong', null, t('median_shift_direction', 'Median shift · B minus A') + ': ' + signed(pair.medianShift) + ' ' + unit + (pair.percentShift === null ? '' : ' (' + signed(pair.percentShift) + '% ' + t('of_fixed_reference', 'of the fixed reference') + ')'))),
          pair.changes.length ? h('table', { className: 'perception-study-table perception-pair-settings' }, h('caption', null, t('study_settings_changes', 'Changed surrounding settings')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('setting_label', 'Setting')), h('th', { scope: 'col' }, firstLabel), h('th', { scope: 'col' }, secondLabel))),
            h('tbody', null, pair.changes.map(function (change) { return h('tr', { key: change.key, 'data-perception-pair-setting': change.key }, h('th', { scope: 'row' }, comparisonLabel(change.key, pair.experiment), !change.active && h('small', null, ' · ' + t('inactive_setting', 'Inactive'))), h('td', null, comparisonValue(change.key, change.before, {}, pair.experiment)), h('td', null, comparisonValue(change.key, change.after, {}, pair.experiment))); }))) : h('p', null, t('pair_same_settings', 'The two studies used the same surrounding settings. Their matches can still vary.')),
          pair.changes.some(function (change) { return !change.active; }) && h('p', null, t('pair_inactive_hint', 'Surroundings were removed in both studies. Settings marked Inactive did not change the displayed targets.')),
          pair.changes.filter(function (change) { return change.active; }).length > 1 && h('p', null, t('pair_multiple_changes', 'Several surrounding settings differ. This comparison does not isolate the effect of one variable.')),
          pair.startsDiffer && h('p', null, t('pair_start_changes', 'These studies used different starting positions. Keep that difference in mind when comparing their matches.')),
          h('p', null, t('recorded_pair_hint', 'Inspect trials from each study independently. Both drawings use the same scale; each preview shows its selected recorded match.')),
          h('div', { className: 'perception-recorded-pair' }, recordedPreview(pair.a.groupId, 'a', firstLabel), recordedPreview(pair.b.groupId, 'b', secondLabel)),
          h('div', { className: 'perception-actions' }, button(t('export_comparison_report', 'Export comparison report'), function () { exportStudyReport(pair.a.groupId, pair.b.groupId); }, { 'data-perception-report-comparison': true, disabled: studyBusy || importBusy })),
          h('p', null, t('pair_summary_hint', 'Compare the three matches and ranges as well as the medians. Two small studies describe your matches under these settings; they do not establish a general effect.'))),
        comparedGroup && button(t('clear_study_comparison', 'Clear study comparison'), function () { selectComparedStudy(''); var selector = document.getElementById(uid + '-pair-selector'); if (selector) selector.focus(); }));
    }
    function comparisonValue(key, value, settings, id) {
      var data = experiment(id || meta.id);
      if (key === 'target' && settings.matching && !settings.reveal) return t('hidden_until_reveal', 'Hidden until reveal');
      if (key === 'matchValue') {
        if (!settings.matching) return t('observe', 'Observe');
        if (!settings.reveal) return t('hidden_until_reveal', 'Hidden until reveal');
        return value + (data.id === 'brightness' ? ' RGB' : ' ' + t('units_label', 'units'));
      }
      if (key === 'matching') return value ? t('match_by_eye', 'Match by eye') : t('observe', 'Observe');
      if (key === 'context') return value ? t('visible', 'Visible') : t('removed', 'Removed');
      if (key === 'reveal') return value ? t('revealed', 'Revealed') : t('hidden', 'Hidden');
      if (key === 'swap') return value ? t('swapped', 'Swapped') : t('original', 'Original');
      if (key === 'cue') return value === 'front' ? t('lower_left_face', 'Lower left face') : value === 'back' ? t('upper_right_face', 'Upper right face') : t('no_cue', 'No cue');
      var control = data.controls.find(function (item) { return item.key === key; });
      return String(value) + (control ? control.unit : '');
    }
    function comparisonLabel(key, id) {
      var data = experiment(id || meta.id), control = data.controls.find(function (item) { return item.key === key; });
      if (control) return t(data.id + '_' + key, control.label);
      if (key === 'context') return t('surroundings', 'Surroundings');
      if (key === 'reveal') return t('measurements_label', 'Measurements');
      if (key === 'cue') return t('depth_cue', 'Face cue');
      if (key === 'matching') return t('mode_label', 'Mode');
      if (key === 'swap') return t('surrounding_order', 'Surrounding order');
      return t('comparison_target', 'Comparison target');
    }
    function notebookObservation(entry) {
      var study = entry.record, data = experiment(study.experiment), titleId = uid + '-study-' + entry.number, date = new Date(study.date), validDate = Number.isFinite(date.getTime());
      return h('li', { key: study.id, value: entry.number, 'data-perception-study': study.id },
        h('strong', { id: titleId }, format(t('observation_number', 'Observation {number}'), { number: entry.number }) + ' · ' + t(study.experiment + '_title', data.title) + ' · ' + (study.model.matching ? t('match_by_eye', 'Match by eye') : t('observe', 'Observe'))),
        study.repeat && h('div', { className: 'perception-study-badge' }, format(t('saved_trial_number', 'Repeated study · trial {trial} of 3'), { trial: study.repeat.trial })),
        validDate && h('div', null, h('time', { dateTime: date.toISOString() }, date.toLocaleString())),
        h('p', null, t('recorded_impression', 'Recorded impression') + ': ' + (study.model.prediction ? t(study.experiment + '_choice_' + data.choices.indexOf(study.model.prediction), study.model.prediction) : t('not_recorded', 'Not recorded'))),
        study.model.reveal && h('p', null, resultText(study.experiment, study.model)),
        study.model.note && h('p', null, study.model.note),
        h('div', { className: 'perception-actions' },
          button(t('restore_observation', 'Restore observation'), function () { stop(); endStudy(true); update(function (next) { next.experiment = study.experiment; next.models[study.experiment] = normalizeModel(study.experiment, study.model); return next; }); announce(t('observation_restored', 'Observation settings restored.')); }, { 'aria-describedby': titleId }),
          button(t('pin_observation', 'Pin observation'), function () { stop(); update(function (next) { next.comparison = { experiment: study.experiment, model: normalizeModel(study.experiment, study.model) }; return next; }); announce(t('saved_observation_pinned', 'Saved observation pinned for comparison.')); }, { 'aria-describedby': titleId }),
          study.repeat && button(t('review_study', 'Review study'), function (event) { reviewStudy(study.repeat.id, event); }, { 'aria-describedby': titleId }),
          study.model.matching && button(t('repeat_saved_settings', 'Repeat these settings'), function () { startStudyFrom(study.id); }, { 'aria-describedby': titleId, disabled: studyBusy || importBusy || capacity.free < 3 }),
          button(t('delete_observation', 'Delete observation'), function () { removeStudy(study.id); }, { 'aria-describedby': titleId })));
    }
    var notebookLabels = {};
    EXPERIMENTS.forEach(function (data) { notebookLabels[data.id] = { title: t(data.id + '_title', data.title), choices: data.choices.map(function (choice, index) { return t(data.id + '_choice_' + index, choice); }) }; });
    var notebook = notebookView(state, finderFilters, notebookLabels), filters = notebook.filters;
    function changeFinder(values) { setFinderFilters(function (previous) { return Object.assign({}, previous, values); }); }
    function clearFinder() { setFinderFilters({ view: filters.view }); var search = document.getElementById(uid + '-notebook-search'); if (search) search.focus(); announce(t('notebook_filters_cleared', 'Notebook filters cleared.')); }
    function notebookFinder() {
      return h('section', { className: 'perception-study perception-finder', 'data-perception-notebook-finder': true, 'aria-labelledby': uid + '-finder-heading' },
        h('h4', { id: uid + '-finder-heading' }, t('find_observations', 'Find saved observations')),
        h('div', { className: 'perception-finder-fields' },
          h('label', { className: 'perception-field', htmlFor: uid + '-notebook-view' }, t('notebook_view_label', 'Notebook view'), h('select', { id: uid + '-notebook-view', 'data-perception-notebook-view': true, value: filters.view, onChange: function (event) { changeFinder({ view: event.target.value, status: 'all' }); } }, h('option', { value: 'observations' }, t('all_observations', 'All observations')), h('option', { value: 'studies' }, t('saved_studies_view', 'Saved studies')))),
          h('label', { className: 'perception-field', htmlFor: uid + '-notebook-experiment' }, t('notebook_experiment_label', 'Filter by experiment'), h('select', { id: uid + '-notebook-experiment', 'data-perception-notebook-experiment': true, value: filters.experiment, onChange: function (event) { changeFinder({ experiment: event.target.value }); } }, h('option', { value: 'all' }, t('all_experiments', 'All experiments')), EXPERIMENTS.map(function (data) { return h('option', { key: data.id, value: data.id }, notebookLabels[data.id].title); }))),
          h('label', { className: 'perception-field', htmlFor: uid + '-notebook-status' }, t('notebook_status_label', 'Study status'), h('select', { id: uid + '-notebook-status', 'data-perception-notebook-status': true, value: filters.status, disabled: filters.view !== 'studies', onChange: function (event) { changeFinder({ status: event.target.value }); } }, h('option', { value: 'all' }, t('all_study_statuses', 'All study statuses')), h('option', { value: 'complete' }, t('complete_study', 'Complete')), h('option', { value: 'partial' }, t('partial_study', 'Partial')), h('option', { value: 'conflict' }, t('conflicting_study', 'Conflicting')))),
          h('label', { className: 'perception-field', htmlFor: uid + '-notebook-search' }, t('notebook_search_label', 'Search notes or impressions'), h('input', { id: uid + '-notebook-search', type: 'search', 'data-perception-notebook-search': true, maxLength: 120, value: filters.query, 'aria-describedby': uid + '-finder-hint', onChange: function (event) { changeFinder({ query: event.target.value }); } }))),
        h('p', { id: uid + '-finder-hint' }, t('notebook_search_hint', 'Search visible experiment titles, impressions, and notes. Repeated-study observations stay together when any retained match fits the filters. Hidden drawing values are not searched.')),
        h('p', { 'data-perception-notebook-counts': true, 'aria-live': 'polite', 'aria-atomic': 'true' }, filters.view === 'studies' ? format(t('notebook_group_counts', 'Studies shown: {shown} of {total}. Retained observations shown: {records}.'), { shown: notebook.groups.length, total: notebook.groupTotal, records: notebook.records.length }) : format(t('notebook_record_counts', 'Observations shown: {shown} of {total}.'), { shown: notebook.records.length, total: notebook.total })),
        button(t('clear_notebook_filters', 'Clear notebook filters'), clearFinder, { disabled: filters.experiment === 'all' && filters.status === 'all' && !filters.query }));
    }
    function notebookResults() {
      if (!notebook.total) return h('p', { className: 'perception-empty' }, t('notebook_empty', 'Choose an impression and save your first observation.'));
      if (filters.view === 'observations') return notebook.records.length ? h('ol', { className: 'perception-notebook-results', 'data-perception-notebook-results': 'observations' }, notebook.records.slice().reverse().map(notebookObservation)) : h('p', { 'data-perception-notebook-empty': true }, t('notebook_no_matches', 'No saved observations match these filters. Clear or change the filters to see your notebook.'));
      if (!notebook.groups.length) return h('p', { 'data-perception-notebook-empty': true }, notebook.groupTotal ? t('notebook_no_study_matches', 'No saved studies match these filters. Clear or change the filters to see your studies.') : t('notebook_no_studies', 'No repeated studies are saved yet. Use All observations to review individual observations, or start three matches in a matching experiment.'));
      return h('ol', { className: 'perception-study-cards', 'data-perception-notebook-results': 'studies' }, notebook.groups.map(function (group) {
        var titleId = uid + '-group-' + group.number, date = new Date(group.date), query = filters.query.trim().toLowerCase();
        var notes = group.records.filter(function (entry) { return entry.record.model.note.trim(); });
        var preview = notes.find(function (entry) { return query && entry.record.model.note.toLowerCase().indexOf(query) >= 0; }) || notes[0];
        var status = group.status === 'complete' ? t('complete_study', 'Complete') : group.status === 'partial' ? t('partial_study', 'Partial') : t('conflicting_study', 'Conflicting');
        var reveal = group.reveal === 'revealed' ? t('revealed', 'Revealed') : group.reveal === 'mixed' ? t('partly_revealed', 'Partly revealed') : t('hidden', 'Hidden');
        return h('li', { key: group.groupId, value: group.number, className: 'perception-study-card', 'data-perception-notebook-group': group.groupId },
          h('strong', { id: titleId }, format(t('notebook_study_number', 'Study {number}'), { number: group.number }) + ' · ' + (group.experiments.length === 1 ? notebookLabels[group.experiments[0]].title : t('mixed_experiments', 'Mixed experiments'))),
          h('p', { 'data-perception-group-status': group.status }, status + ' · ' + reveal),
          h('p', null, group.status === 'conflict' ? format(t('retained_observation_count', 'Retained observations: {count}.'), { count: group.count }) : format(t('retained_match_count', 'Retained matches: {count} of 3.'), { count: group.count })),
          group.date && h('p', null, t('latest_retained_observation', 'Latest retained observation') + ': ', h('time', { dateTime: date.toISOString() }, date.toLocaleString())),
          preview && h('p', { className: 'perception-group-note' }, t('observation_note', 'Observation note') + ': ' + preview.record.model.note.slice(0, 160) + (preview.record.model.note.length > 160 ? '…' : '')),
          button(t('review_study', 'Review study'), function (event) { reviewStudy(group.groupId, event); }, { 'aria-describedby': titleId }),
          button(t('delete_saved_study', 'Delete saved study'), function (event) { openGroupDelete(group.groupId, event); }, { 'data-perception-delete-group': group.groupId, 'aria-describedby': titleId, disabled: studyLocked || studyBusy || importBusy }),
          h('details', null, h('summary', null, t('recorded_observations', 'Recorded observations')), h('ol', null, group.records.slice().reverse().map(notebookObservation))));
      }));
    }
    function openTool(id) {
      stop(); endStudy(true);
      if (id === 'artStudio' && typeof ctx.setToolData === 'function') ctx.setToolData(function (prev) {
        prev = object(prev); var art = Object.assign({}, object(prev.artStudio), { studioStarted: true, studioHome: false });
        if (meta.id === 'cafeWall' || meta.id === 'brightness' || meta.id === 'moire') art.tab = 'opArt';
        if (meta.id === 'cafeWall') Object.assign(art, { opStyle: 'cafeWall', opPaused: true, opCafeOffset: model.offset, opCafeMortar: Math.round(model.mortar / (60 + model.mortar) * 100), opCafeMortarLit: 50, opDensity: Math.round(512 / (60 + model.mortar)), opRotation: 0, opReveal: model.reveal, opColorMode: 'mono' });
        if (meta.id === 'brightness') Object.assign(art, { opStyle: 'colorContrast', opPaused: true, opRotation: 0, opReveal: !model.context || model.reveal, opColorMode: 'custom', opHueA: 0, opHueB: 0, opSatA: 0, opSatB: 0, opLitA: Math.round(128 + (model.swap ? 1 : -1) * model.contrast * 1.12) / 255 * 100, opLitB: Math.round(128 + (model.swap ? -1 : 1) * model.contrast * 1.12) / 255 * 100, opCenterHue: 0, opCenterSat: 0, opCenterLit: model.target / 255 * 100, opCenterSize: 96 / 360 * 100 });
        if (meta.id === 'moire') Object.assign(art, { opStyle: 'moire', opPaused: true, opAngle: activeModel.angle, opDensity: Math.round(512 / model.spacing), opRotation: 0 });
        return Object.assign({}, prev, { artStudio: art });
      });
      if (id && typeof window.__alloEnsureStemPluginLoaded === 'function') { try { Promise.resolve(window.__alloEnsureStemPluginLoaded(id)).catch(function () {}); } catch (_) {} }
      if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(id);
    }
    var comparisonModels = Object.assign({}, state.models); comparisonModels[meta.id] = activeModel;
    var changedSettings = comparisonChanges(Object.assign({}, state, { models: comparisonModels }));
    var maskStudyViews = collecting || studyBusy && pendingStudy.current && pendingStudy.current.kind === 'start';
    var savedReview = reviewedGroup ? savedStudy(state, reviewedGroup) : null;
    var viewerValid = !!viewer && viewer.profile === ctx.activeProfileId && !maskStudyViews && !studyBusy && !importBusy && viewer.identity === previewIdentities[viewer.slot];
    React.useEffect(function () {
      var dialog = viewerRef.current;
      if (!dialog) return;
      if (viewerValid) {
        if (!dialog.open) {
          try { dialog.showModal(); var heading = document.getElementById(uid + '-viewer-heading'); if (heading) heading.focus(); }
          catch (_) { setViewer(null); announce(t('drawing_viewer_unavailable', 'The enlarged drawing could not open. You can still inspect it in the recorded drawing panel.')); }
        }
      } else {
        if (dialog.open) dialog.close();
        if (viewer) setViewer(null);
        if (viewerReturn.current) returnFromViewer();
      }
    }, [viewer, viewerValid]);
    var controls = h('aside', { className: 'perception-controls perception-card', 'aria-label': t('experiment_controls', 'Experiment controls') },
      studyBusy && pendingStudy.current && pendingStudy.current.kind === 'start' && pendingStudy.current.guide && button(t('cancel_study_plan', 'Cancel study plan'), cancelGuidePlan),
      h('details', { open: controlsOpen, onToggle: function (event) { setControlsOpen(event.currentTarget.open); } },
        h('summary', null, t('adjust_experiment', 'Adjust experiment')),
        h('div', null,
          h('div', null,
            own(MATCHING, meta.id) && h('div', { className: 'perception-actions', role: 'group', 'aria-label': t('experiment_mode', 'Experiment mode') },
              button(t('observe', 'Observe'), function () { setMatching(false); }, { 'aria-pressed': !model.matching, disabled: studyLocked || studyBusy }),
              button(t('match_by_eye', 'Match by eye'), function () { setMatching(true); }, { 'aria-pressed': model.matching, disabled: studyLocked || studyBusy })),
            model.matching && h('div', { className: 'perception-matching' },
              h('p', null, t('match_hint', 'Keep the reference fixed. Adjust the right or bottom target until it looks like the reference, then reveal the drawing values.')),
              h('label', { className: 'perception-field', htmlFor: 'perception-match-value' },
                h('span', null, t('comparison_target', 'Comparison target'), model.reveal && h('output', { htmlFor: 'perception-match-value', 'aria-hidden': 'true' }, model.matchValue + ' ' + (meta.id === 'brightness' ? 'RGB' : t('units_label', 'units')))),
                h('input', { id: 'perception-match-value', type: 'range', min: MATCHING[meta.id].min, max: MATCHING[meta.id].max, step: 1, value: model.matchValue, disabled: comparisonLocked || studyBusy, 'aria-label': t('comparison_target', 'Comparison target'), 'aria-describedby': activeStudy ? uid + '-study-instructions' : undefined, 'aria-valuetext': model.reveal ? model.matchValue + ' ' + (meta.id === 'brightness' ? 'RGB' : t('units_label', 'units')) : format(t('hidden_match_value', '{position} percent of adjustment range; drawing values hidden until reveal.'), { position: Math.round((model.matchValue - MATCHING[meta.id].min) / (MATCHING[meta.id].max - MATCHING[meta.id].min) * 100) }), onChange: function (event) { change({ matchValue: Number(event.target.value) }); } })),
              h('div', { className: 'perception-actions' },
                button(t('decrease_comparison', 'Decrease comparison'), function () { change({ matchValue: model.matchValue - 1 }); }, { disabled: comparisonLocked || studyBusy || model.matchValue <= MATCHING[meta.id].min }),
                button(t('increase_comparison', 'Increase comparison'), function () { change({ matchValue: model.matchValue + 1 }); }, { disabled: comparisonLocked || studyBusy || model.matchValue >= MATCHING[meta.id].max }),
                button(t('reset_comparison', 'Reset comparison'), function () { change({ matchValue: measurements(meta.id, Object.assign({}, model, { matching: false })).reference, reveal: false }); }, { disabled: studyLocked || studyBusy })),
              meta.id === 'ebbinghaus' && h('p', null, t('matching_circle_gap_hint', 'Ring positions stay fixed while you match. The gap setting leaves room for the largest comparison circle.')),
              h('div', { className: 'perception-study', 'data-perception-repeat-active': activeStudy ? activeStudy.id : undefined },
                h('h4', null, t('repeated_study', 'Repeated matching study')),
                h('p', { id: uid + '-study-instructions' }, activeStudy ? collecting ? format(t('study_trial_progress', 'Match {trial} of 3. Adjust the comparison and choose an impression below. Your note is saved with this match; the next match starts with a blank note.'), { trial: activeStudy.trials.length + 1 }) : t('study_all_recorded', 'All three matches are recorded. Reveal the results, or end the study to return to free matching.') : t('study_start_hint', 'Try three separate matches with the reference and surroundings held fixed. Starting positions vary; numbers stay hidden until all three are recorded.')),
                activeStudy && h('p', null, t('study_frozen_hint', 'Surrounding settings stay fixed during this study. The notebook and pinned view return after recording or ending the study.')),
                activeStudy && guidedRun.current && h('p', null, t('guided_collecting', 'One-setting repeat: the baseline reference and starting positions are preserved. The two studies will be selected for comparison after the third match.')),
                !activeStudy && capacity.free < 3 && h('p', { 'data-perception-capacity-reason': 'study' }, capacityMessage(3)),
                h('div', { className: 'perception-actions' },
                  !activeStudy && button(t('start_three_matches', 'Start three matches'), function () { startStudyFrom(); }, { disabled: studyBusy || importBusy || capacity.free < 3 }),
                  !activeStudy && capacity.free < 3 && button(t('review_notebook_capacity', 'Review notebook'), focusNotebook),
                  collecting && button(t('record_match', 'Record match'), recordMatch, { disabled: !model.prediction || studyBusy }),
                  activeStudy && !collecting && !activeStudy.revealed && button(t('reveal_study_results', 'Reveal study results'), revealMatches, { disabled: studyBusy, id: uid + '-reveal-study' }),
                  activeStudy && button(t('end_repeated_study', 'End repeated study'), function () { endStudy(false); }, { disabled: studyBusy })))),
            h('fieldset', { className: 'perception-observation' }, h('legend', null, t(meta.id + '_question', meta.question)),
              h('div', { className: 'perception-choices' }, meta.choices.map(function (choice, i) { return button(t(meta.id + '_choice_' + i, choice), function () { change({ prediction: choice }); }, { key: choice, 'aria-pressed': model.prediction === choice, 'data-perception-choice': choice, disabled: comparisonLocked || studyBusy }); }))),
            h('p', null, t('observation_hint', 'Record your impression. You can revise it; this is an observation, not a scored test.')),
            meta.controls.filter(function (control) { return !(model.matching && meta.id === 'brightness' && control.key === 'target'); }).map(function (control) { var id = 'perception-' + control.key, name = model.matching && meta.id === 'ebbinghaus' && control.key === 'gap' ? t('minimum_surround_gap', 'Minimum surround gap') : t(meta.id + '_' + control.key, control.label); return h('label', { className: 'perception-field', htmlFor: id, key: control.key },
              h('span', null, name, h('output', { htmlFor: id, 'aria-hidden': 'true' }, activeModel[control.key] + control.unit)),
              h('input', { id: id, type: 'range', min: control.min, max: control.max, step: control.step || 1, value: activeModel[control.key], disabled: studyLocked || studyBusy, 'aria-label': name, 'aria-valuetext': activeModel[control.key] + control.unit, onChange: function (event) { stop(); var changeSet = {}; changeSet[control.key] = Number(event.target.value); change(changeSet); } })); }),
            meta.cue && h('label', { className: 'perception-field', htmlFor: 'perception-cue' }, t('depth_cue', 'Face cue'), h('select', { id: 'perception-cue', value: model.cue, onChange: function (event) { change({ cue: event.target.value }); } }, h('option', { value: 'none' }, t('no_cue', 'No cue')), h('option', { value: 'front' }, t('lower_left_face', 'Lower left face')), h('option', { value: 'back' }, t('upper_right_face', 'Upper right face')))),
            h('div', { className: 'perception-actions' }, button(t('remove_surroundings', 'Remove surroundings'), function () { stop(); change({ context: !model.context }); }, { 'aria-pressed': !model.context, disabled: studyLocked || studyBusy }), button(t('reveal_measurements', 'Reveal measurements'), function () { stop(); change({ reveal: !model.reveal }); }, { 'aria-pressed': model.reveal, disabled: studyLocked || studyBusy })),
            own(MATCHING, meta.id) && button(t('swap_surroundings', 'Swap surroundings'), function () { change({ swap: !model.swap }); }, { 'aria-pressed': model.swap, disabled: studyLocked || studyBusy || !model.context }),
            meta.id === 'moire' && button(playing ? t('pause_rotation', 'Pause rotation') : t('play_rotation', 'Play slow rotation'), function () { if (playing || (motionMedia && motionMedia.matches)) stop(); else setPlaying(true); }, { disabled: !model.context || reducedMotion, 'aria-pressed': playing }),
            meta.id === 'moire' && reducedMotion && h('p', null, t('reduced_motion_hint', 'Reduced motion is enabled. Use the crossing-angle slider to compare still frames.')),
            button(t('reset_experiment', 'Reset this experiment'), function () { stop(); change(normalizeModel(meta.id, {})); announce(t('experiment_reset', 'This experiment was reset.')); }, { disabled: studyLocked || studyBusy })),
          h('div', null,
            h('label', { className: 'perception-field', htmlFor: 'perception-note' }, t('observation_note', 'Observation note'), h('textarea', { id: 'perception-note', className: 'perception-note', maxLength: 500, value: model.note, disabled: comparisonLocked || studyBusy, placeholder: t('note_placeholder', 'What changed when you adjusted the surroundings?'), onChange: function (event) { change({ note: event.target.value }); } })),
            !studyLocked && capacity.free < 1 && h('p', { 'data-perception-capacity-reason': 'save' }, capacityMessage(1)),
            h('div', { className: 'perception-actions' }, button(t('save_observation', 'Save observation'), save, { disabled: studyLocked || studyBusy || !model.prediction || capacity.free < 1 }), button(t('pin_comparison', 'Pin comparison'), function () { stop(); update(function (next) { next.comparison = { experiment: meta.id, model: normalizeModel(meta.id, activeModel) }; return next; }); announce(t('comparison_pinned', 'Current settings pinned. Adjust the experiment to compare.')); }, { disabled: maskStudyViews }), button(t('export_svg', 'Export SVG'), exportSVG, { disabled: studyBusy || activeStudy && !activeStudy.revealed })),
            h('p', null, t('viewing_hint', 'The viewing area uses a fixed white background to keep comparisons consistent. Different people may notice different effects.')),
            h('p', null, model.matching && meta.id === 'brightness' ? t('matching_art_handoff_hint', 'Art Studio uses the reference gray for both center squares. Your unequal visual match is kept in Perception Lab.') : t('art_handoff_hint', 'Art Studio adapts shared pattern settings for composition. Your experiments and observations stay here.'))))));
    return h('section', { 'data-perception-lab': 'true', 'data-perception-theme': ctx.isContrast || ctx.theme === 'contrast' ? 'contrast' : ctx.isDark || ctx.theme === 'dark' ? 'dark' : 'light', 'data-perception-expanded': String(state.expanded), onKeyDown: function (event) { if (event.key === 'Escape') { stop(); if (state.expanded) { update(function (next) { next.expanded = false; return next; }); setControlsOpen(true); } } } },
      h('style', null, CSS),
      h('header', { className: 'perception-heading' }, h('div', null, h('div', { className: 'perception-eyebrow' }, t('eyebrow', 'Observe · adjust · compare')), h('h2', null, t('title', 'Perception Lab')), h('p', null, t('intro', 'Explore how an image and its surroundings shape what you see. Make a prediction, change one variable, then reveal the drawing.'))),
        h('div', { className: 'perception-actions' }, button(t('all_tools', 'All tools'), function () { openTool(null); }), button(t('open_art', 'Open Art Studio'), function () { openTool('artStudio'); }), button(t('open_optics', 'Open Optics Lab'), function () { openTool('opticsLab'); }))),
      h('nav', { className: 'perception-experiments', 'aria-label': t('choose_experiment', 'Choose an experiment') }, EXPERIMENTS.map(function (item) { return button(h(React.Fragment, null, h('strong', null, t(item.id + '_title', item.title)), h('small', null, t(item.id + '_family', item.family))), function () { selectExperiment(item.id); }, { key: item.id, 'aria-pressed': item.id === meta.id, 'data-perception-experiment': item.id }); })),
      h('label', { className: 'perception-mobile-picker', htmlFor: 'perception-experiment-picker' }, t('choose_experiment', 'Choose an experiment'), h('select', { id: 'perception-experiment-picker', value: meta.id, onChange: function (event) { selectExperiment(event.target.value); } }, EXPERIMENTS.map(function (item) { return h('option', { key: item.id, value: item.id }, t(item.id + '_title', item.title)); }))),
      h('div', { className: 'perception-workspace' }, controls,
        h('div', { className: 'perception-scenes', 'data-comparing': String(!!state.comparison && !maskStudyViews) },
          activeStudy && h('section', { className: 'perception-card perception-study-result', 'aria-label': t('repeated_study', 'Repeated matching study') },
            h('h3', { id: uid + '-study-results', tabIndex: -1 }, t('repeated_study', 'Repeated matching study')),
            collecting ? h('p', null, format(t('study_scene_progress', '{count} of 3 matches recorded. Make each match by eye with the same surroundings.'), { count: activeStudy.trials.length })) : activeStudy.revealed ? summaryView(activeStudy, 'active') : h('p', null, t('study_results_hidden', 'Three matches recorded. Use Reveal study results in the controls to see their drawing values, median, and range.'))),
          state.comparison && !maskStudyViews && state.comparison.experiment === meta.id && h('section', { className: 'perception-card perception-deltas', 'aria-label': t('changes_from_pinned', 'Changes from pinned view') },
            h('h3', null, t('changes_from_pinned', 'Changes from pinned view')),
            h('p', null, t('equal_scale_hint', 'Both drawings use the same scale. Matching target values stay hidden in each view until that view is revealed.')),
            changedSettings.length ? h('table', null,
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('setting_label', 'Setting')), h('th', { scope: 'col' }, t('pinned_label', 'Pinned')), h('th', { scope: 'col' }, t('current_label', 'Current')))),
              h('tbody', null, changedSettings.map(function (item) { return h('tr', { key: item.key, 'data-perception-change': item.key }, h('th', { scope: 'row' }, comparisonLabel(item.key)), h('td', null, comparisonValue(item.key, item.before, state.comparison.model)), h('td', null, comparisonValue(item.key, item.after, activeModel))); }))) : h('p', null, t('no_settings_changed', 'No drawing settings have changed.'))),
          h('div', { className: 'perception-card' },
          h('div', { className: 'perception-actions perception-scene-actions' }, button(state.expanded ? t('compact_view', 'Compact viewing area') : t('expand_view', 'Expand viewing area'), function () { update(function (next) { next.expanded = !next.expanded; return next; }); setControlsOpen(state.expanded); }, { 'aria-pressed': state.expanded })),
          figure(meta.id, activeModel, false),
          model.reveal && h('div', { className: 'perception-reading', 'data-perception-result': 'true' }, h('strong', null, resultText(meta.id, activeModel)), h('p', null, explanationText(meta.id, model)), h('a', { href: meta.source, target: '_blank', rel: 'noopener noreferrer' }, t('reference', 'Scientific reference: Michael Bach')))),
          state.comparison && !maskStudyViews && h('div', { className: 'perception-card perception-comparison' },
            h('div', { className: 'perception-actions perception-scene-actions' }, button(t('clear_comparison', 'Clear comparison'), function () { update(function (next) { next.comparison = null; return next; }); var current = document.getElementById(uid + '-current-view'); if (current) current.focus(); })),
            figure(state.comparison.experiment, state.comparison.model, true),
            state.comparison.model.reveal && h('p', null, resultText(state.comparison.experiment, state.comparison.model))))),
      h('div', { className: 'perception-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, status),
      h('section', { className: 'perception-card perception-journal', 'aria-label': t('notebook', 'Observation notebook') },
        h('div', { className: 'perception-notebook-heading' }, h('h3', { id: uid + '-notebook', tabIndex: -1 }, t('notebook', 'Observation notebook')),
          h('div', { className: 'perception-actions' }, deleted && button(t('undo_deletion', 'Undo deletion'), undoDeletion, { id: uid + '-undo', disabled: maskStudyViews || importBusy || capacity.free < undoCount }), importUndo && button(t('undo_import', 'Undo import'), undoImport, { id: uid + '-import-undo', disabled: studyLocked || studyBusy || importBusy }), button(t('import_notebook', 'Import notebook'), openImport, { id: uid + '-import-open', disabled: studyLocked || studyBusy || importBusy }), button(t('export_notebook', 'Export notebook'), exportNotebook, { disabled: maskStudyViews || importBusy || !state.studies.length }))),
        h('p', { 'data-perception-notebook-capacity': true, 'aria-live': 'polite', 'aria-atomic': 'true' }, format(t('notebook_capacity', 'Saved observations: {saved} of {limit}. Available spaces: {free}.'), capacity)),
        h('p', null, t('notebook_hint', 'This notebook holds up to 24 observations. New observations need one available space; new three-match studies need three. Existing observations stay until you delete them.')),
        deleted && capacity.free < undoCount && h('p', { 'data-perception-undo-capacity': true }, format(t('notebook_undo_capacity', 'Undo needs {count} available spaces; {free} remain. No observations were changed.'), { count: undoCount, free: capacity.free })),
        h('p', null, t('notebook_actions_hint', 'Pin a saved observation to compare it with your current drawing. Deleting an observation offers one undo; export saves your notebook as JSON.')),
        importView(),
        groupDeleteView(),
        !maskStudyViews && notebookFinder(),
        !maskStudyViews && savedReview && h('section', { className: 'perception-study perception-review', 'aria-label': t('saved_study_review', 'Saved study review'), 'data-perception-study-review': reviewedGroup },
          h('h4', { id: uid + '-review-heading', tabIndex: -1 }, t('saved_study_review', 'Saved study review')),
          !savedReview.valid ? h('p', null, t('study_group_conflict', 'These matches have different settings or duplicate trial numbers. Review them individually or repeat the settings; they cannot form one study summary.')) : !savedReview.complete ? h('p', null, format(t('study_incomplete_group', '{count} of 3 matches remain in this notebook. Review individual observations or repeat their settings to make a new study.'), { count: savedReview.count })) : savedReview.study && savedReview.study.revealed ? summaryView(savedReview.study, 'review') : h('div', null,
            h('p', null, t('saved_study_hidden', 'Three matches are saved. Reveal this study to review its drawing values together.')),
            button(t('reveal_saved_study', 'Reveal saved study'), revealReviewedStudy)),
          guidedPlanView(savedReview),
          studyComparisonView(),
          button(t('delete_saved_study', 'Delete saved study'), function (event) { openGroupDelete(reviewedGroup, event); }, { 'data-perception-delete-group': reviewedGroup, disabled: studyLocked || studyBusy || importBusy }),
          button(t('close_study_review', 'Close study review'), closeReview)),
        maskStudyViews ? h('p', null, t('study_notebook_paused', 'Notebook observations are hidden while you make these matches. They return after recording all three matches or ending the study.')) : notebookResults()),
      h('dialog', { ref: viewerRef, className: 'perception-drawing-viewer', 'data-perception-drawing-viewer': true, 'aria-labelledby': uid + '-viewer-heading', 'aria-describedby': uid + '-viewer-hint', onCancel: function (event) { event.preventDefault(); event.stopPropagation(); closeRecordedViewer(); }, onClose: function () { setViewer(null); }, onKeyDown: function (event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRecordedViewer(); } } },
        viewerValid && h(React.Fragment, null,
          h('header', null, h('h2', { id: uid + '-viewer-heading', tabIndex: -1 }, t('enlarged_recorded_drawing', 'Enlarged recorded drawing')), button(t('close_drawing_viewer', 'Close enlarged drawing'), closeRecordedViewer, { 'data-perception-close-viewer': true })),
          h('p', { id: uid + '-viewer-hint' }, t('drawing_viewer_hint', 'Inspect all three recorded trials at a larger size. Trial and guide choices stay with this preview; your notebook and current drawing are unchanged.')),
          recordedPreview(viewer.groupId, viewer.slot, viewer.heading, true))));
  }
  window.StemLab.PerceptionEngine = { normalize: normalize, normalizeModel: normalizeModel, scene: scene, experiments: EXPERIMENTS, matching: MATCHING, measurements: measurements, notebookCapacity: notebookCapacity, deleteSavedStudy: deleteSavedStudy, restoreDeletedStudy: restoreDeletedStudy, deleteStudy: deleteStudy, restoreDeleted: restoreDeleted, parseNotebook: parseNotebook, planNotebookImport: planNotebookImport, notebookView: notebookView, comparisonChanges: comparisonChanges, createStudy: createStudy, normalizeStudy: normalizeStudy, studyModel: studyModel, sameStudySettings: sameStudySettings, recordStudyTrial: recordStudyTrial, studySummary: studySummary, revealStudy: revealStudy, savedStudy: savedStudy, revealSavedStudy: revealSavedStudy, recordedTrial: recordedTrial, planStudyReport: planStudyReport, guidedSettings: guidedSettings, planRepeat: planRepeat, savedStudies: savedStudies, compareStudies: compareStudies, defaults: function () { return normalize({}); } };
  window.StemLab.registerTool('perceptionLab', { icon: '👁', label: 'Perception Lab', desc: 'Six adjustable visual experiments with predictions, comparisons, measurements, and saved observations.', color: 'cyan', category: 'science', render: function (ctx) { return ctx.React.createElement(PerceptionLab, { ctx: ctx, key: ctx.activeProfileId || 'default' }); } });
})();
