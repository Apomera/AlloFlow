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
      controls: [{ key: 'angle', label: 'Grid crossing angle', min: 0, max: 30, value: 5, unit: '°', step: 0.1 }, { key: 'spacing', label: 'Line spacing', min: 8, max: 24, value: 12, unit: ' units' }] },
    { id: 'ponzo', title: 'Ponzo perspective', family: 'Perspective and size',
      question: 'Which horizontal bar looks longer?', choices: ['Upper', 'Lower', 'Same', 'Unsure'],
      description: 'Two orange horizontal bars between perspective rails. Adjust the rails or upper bar position, then compare their apparent lengths.',
      explanation: 'Both bars have the same drawn length. Converging rails provide a perspective context that can change apparent length. Remove the rails and reveal endpoint guides to compare the drawing. Different people and viewing conditions can give different impressions.',
      result: 'Both horizontal bars: 240 drawing units. Their horizontal endpoints align.', source: 'https://michaelbach.de/ot/sze-sizeConstancy/',
      controls: [{ key: 'convergence', label: 'Rail convergence', min: 0, max: 100, value: 90, unit: '%' }, { key: 'upperY', label: 'Upper bar position', min: 150, max: 260, value: 175, unit: ' units' }] }
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
  function newMatchStart(id, raw, seed) {
    if (!own(MATCHING, id)) return null;
    var model = normalizeModel(id, raw), config = MATCHING[id], reference = measurements(id, model).reference;
    var fraction = typeof seed === 'number' && Number.isFinite(seed) ? Math.max(0, Math.min(0.9999999999999999, seed)) : 0.5;
    var count = config.max - config.min + 1, value = config.min + Math.floor(fraction * count);
    while (value === model.matchValue || value === reference) value = config.min + (value - config.min + 1) % count;
    return normalizeModel(id, Object.assign({}, model, { matching: true, matchValue: value, reveal: false, prediction: '' }));
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
  function inquiryChanges(id, baseline, current, selectedKey) {
    if (['cafeWall', 'necker', 'moire', 'ponzo'].indexOf(id) < 0) return null;
    var data = experiment(id), before = normalizeModel(id, baseline), after = normalizeModel(id, current), keys = data.controls.map(function (control) { return control.key; });
    keys.push('context'); if (data.cue) keys.push('cue');
    var selected = keys.indexOf(selectedKey) >= 0 ? selectedKey : keys[0];
    var changes = keys.filter(function (key) { return before[key] !== after[key]; }).map(function (key) { return { key: key, before: before[key], after: after[key] }; });
    var selectedChanged = changes.some(function (item) { return item.key === selected; });
    return { changes: changes, selected: selected, selectedChanged: selectedChanged, otherChanges: changes.filter(function (item) { return item.key !== selected; }), status: changes.length > 1 ? 'multiple' : !changes.length ? 'unchanged' : selectedChanged ? 'selected' : 'other' };
  }
  function planInquiryRestore(id, baseline, current, selectedKey, scope) {
    var comparison = inquiryChanges(id, baseline, current, selectedKey);
    if (!comparison || ['selected', 'others'].indexOf(scope) < 0) return null;
    var model = normalizeModel(id, current), changes = scope === 'selected' ? comparison.changes.filter(function (item) { return item.key === comparison.selected; }) : comparison.otherChanges;
    changes.forEach(function (item) { model[item.key] = item.before; });
    return { model: normalizeModel(id, model), selected: comparison.selected, changes: changes };
  }
  function planInquiryReport(id, baseline, current, selectedKey) {
    if (['cafeWall', 'necker', 'moire', 'ponzo'].indexOf(id) < 0 || object(baseline) !== baseline || object(current) !== current) return { status: 'unavailable' };
    var before = normalizeModel(id, baseline), after = normalizeModel(id, current), data = inquiryChanges(id, before, after, selectedKey);
    return { status: 'ready', experiment: id, selected: data.selected, baseline: before, current: after, changes: data.changes, otherChanges: data.otherChanges, selectedChanged: data.selectedChanged, inquiryStatus: data.status };
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
  function planObservationReview(raw, recordId) {
    if (typeof recordId !== 'string' || !recordId) return { status: 'missing' };
    var record = normalize(raw).studies.find(function (item) { return item.id === recordId; });
    if (!record) return { status: 'missing' };
    if (record.repeat) return { status: 'repeat' };
    return { status: 'ready', record: record, identity: JSON.stringify(record) };
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
    } else if (meta.id === 'moire') {
      var lines = [];
      for (var x = -480; x <= 1280; x += m.spacing) lines.push(line(x, -500, x, 980, { stroke: '#173b52', strokeWidth: 2 }));
      nodes.push(node('g', { 'data-perception-grid': 'base' }, lines));
      if (m.context) nodes.push(node('g', Object.assign({ transform: 'rotate(' + m.angle + ' 400 240)', 'data-perception-grid': 'overlay' }, context), lines));
      if (m.reveal) { nodes.push(node('rect', { x: 260, y: 418, width: 280, height: 50, fill: '#fff' })); nodes.push(label(400, 450, units(m.spacing) + ' · ' + m.angle + '°')); }
    } else if (meta.id === 'ponzo') {
      var topGap = 600 - 4.6 * m.convergence;
      if (m.context) {
        nodes.push(line(400 - topGap / 2, 40, 100, 440, Object.assign({ stroke: '#173b52', strokeWidth: 5, 'data-perception-rail': 'left' }, context)));
        nodes.push(line(400 + topGap / 2, 40, 700, 440, Object.assign({ stroke: '#173b52', strokeWidth: 5, 'data-perception-rail': 'right' }, context)));
      }
      [m.upperY, 350].forEach(function (y, index) { nodes.push(node('rect', { x: 280, y: y - 6, width: 240, height: 12, fill: '#ed761c', 'data-perception-target': index ? 'lower' : 'upper' })); });
      if (m.reveal) {
        [280, 520].forEach(function (x) { nodes.push(line(x, m.upperY - 22, x, 372, guide)); });
        nodes.push(label(400, m.upperY - 30, units(240))); nodes.push(label(400, 392, units(240)));
      }
    }
    return nodes;
  }
  function format(value, model) { return value.replace(/\{(\w+)\}/g, function (_, key) { return String(model[key]); }); }
  var CSS = [
    '.perception-precision-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.perception-precision-value{display:flex;align-items:center;gap:8px;flex:1 1 12em}.perception-precision-value input[type=number]{width:100%;min-width:64px;min-height:44px;padding:8px 10px;border:1px solid var(--pl-control);border-radius:8px;font:inherit;font-variant-numeric:tabular-nums;color:var(--pl-ink);background:var(--pl-panel)}.perception-precision-value input:disabled{opacity:.55;cursor:default}.perception-precision-value input[aria-invalid=true]{border:2px solid var(--pl-accent)}.perception-precision-unit{flex:none;max-width:7em;overflow-wrap:anywhere;color:var(--pl-soft);font-size:.8125rem}.perception-precision-hint{display:block;color:var(--pl-soft);font-size:.75rem;line-height:1.5;margin-top:6px}.perception-adjustment .perception-precision-error{color:var(--pl-ink);border-left:3px solid var(--pl-accent);padding-left:8px;margin:8px 0 0}.perception-adjustment>label{display:block}.perception-adjustment .perception-precision-row button{flex:none}',
    '.perception-drawing-viewer .perception-viewer-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));gap:24px;align-items:start;margin-top:16px}.perception-drawing-viewer .perception-viewer-pair[data-stacked=true]{grid-template-columns:1fr}.perception-drawing-viewer .perception-viewer-pair .perception-recorded-preview{margin:0;padding:12px;border:1px solid var(--pl-border)}.perception-drawing-viewer .perception-viewer-pair h3{font-size:1rem;line-height:1.5;margin:0 0 8px}.perception-drawing-viewer .perception-viewer-pair svg{min-height:0}.perception-viewer-layout{margin:12px 0}',
    '.perception-drawing-viewer{width:min(1440px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:clamp(12px,2vw,24px);border:1px solid var(--pl-border);border-radius:14px;color:var(--pl-ink);background:var(--pl-panel);overflow:auto;overscroll-behavior:contain;font:inherit}.perception-drawing-viewer::backdrop{background:rgba(5,20,30,.72)}.perception-drawing-viewer header{display:flex;align-items:start;justify-content:space-between;gap:12px;flex-wrap:wrap}.perception-drawing-viewer h2{margin:0;font-size:1.25rem;line-height:1.4}.perception-drawing-viewer .perception-recorded-preview{padding:0;border:0;margin:16px 0 0}.perception-drawing-viewer .perception-field{max-width:320px}.perception-drawing-viewer .perception-recorded-preview svg{height:auto;max-height:65dvh;min-height:120px;object-fit:contain}.perception-drawing-viewer p{line-height:1.5;overflow-wrap:anywhere}.perception-drawing-viewer .perception-recorded-note{max-width:85ch}@media(forced-colors:active){.perception-drawing-viewer::backdrop{background:Canvas;opacity:.85}}',
    '[data-perception-lab]{--pl-ink:#163449;--pl-soft:#425c6c;--pl-panel:#fff;--pl-ground:#f1f7f9;--pl-border:#bccfd7;color:var(--pl-ink);background:var(--pl-ground);padding:clamp(12px,2vw,24px);border-radius:18px;font-family:inherit;max-width:100%;}',
    '[data-perception-lab] *{box-sizing:border-box;min-width:0}[data-perception-lab] button,[data-perception-lab] select{min-height:44px;min-width:44px;font:inherit;font-size:.875rem;border:1px solid var(--pl-border);border-radius:10px;padding:8px 12px;color:var(--pl-ink);background:var(--pl-panel);cursor:pointer;white-space:normal;overflow-wrap:anywhere}',
    '[data-perception-lab] button[aria-pressed=true]{background:#15566c;color:#fff;border-color:#15566c}[data-perception-lab] button:disabled{opacity:.55;cursor:default}[data-perception-lab] :focus-visible{outline:3px solid #b45309;outline-offset:3px}',
    '.perception-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.perception-heading h2{margin:0;font-size:1.65rem;line-height:1.2}.perception-heading p{margin:6px 0 0;color:var(--pl-soft);max-width:65ch;font-size:.9375rem;line-height:1.5}',
    '.perception-eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.12em;color:var(--pl-soft);margin:0 0 6px}.perception-actions{display:flex;gap:8px;flex-wrap:wrap}.perception-experiments{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:8px;margin:20px 0}.perception-experiments button{text-align:left}.perception-experiments small{display:block;font-size:.75rem;opacity:.85;margin-top:4px}.perception-mobile-picker{display:none}',
    '.perception-workspace{display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr);grid-template-areas:"controls scene";gap:16px;align-items:start}.perception-controls{grid-area:controls}.perception-scenes{grid-area:scene}.perception-card{background:var(--pl-panel);border:1px solid var(--pl-border);border-radius:14px;padding:16px}.perception-card h3{font-size:1.125rem;margin:0 0 8px}.perception-card p{font-size:.875rem;line-height:1.5;margin:8px 0;color:var(--pl-soft)}',
    '.perception-controls summary{cursor:pointer;font-weight:700;min-height:44px;display:list-item;padding:10px 0}.perception-field{display:block;font-size:.875rem;margin:16px 0}.perception-field span{display:flex;justify-content:space-between;gap:8px}.perception-field output{font-variant-numeric:tabular-nums;color:var(--pl-soft)}.perception-field input[type=range]{display:block;width:100%;height:44px;accent-color:#15566c}.perception-field select{width:100%;margin-top:8px}',
    '.perception-drawing-viewer [data-perception-observation-note]{white-space:pre-wrap}.perception-observation-settings{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.875rem;margin:20px 0}.perception-observation-settings caption{text-align:start;font-weight:700;margin-bottom:8px}.perception-observation-settings th,.perception-observation-settings td{padding:10px 8px;text-align:start;vertical-align:top;border-bottom:1px solid var(--pl-border);overflow-wrap:anywhere}.perception-observation-settings th:first-child{width:45%}.perception-observation-settings thead{background:var(--pl-ground)}',
    '.perception-observation{border:0;padding:0;margin:14px 0}.perception-observation legend{font-size:.875rem;font-weight:700;margin-bottom:8px;line-height:1.5}.perception-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.perception-note{width:100%;min-height:80px;font:inherit;font-size:.875rem;line-height:1.5;border:1px solid var(--pl-border);border-radius:8px;padding:10px;color:var(--pl-ink);background:var(--pl-panel);resize:vertical}.perception-note::placeholder{color:var(--pl-soft);opacity:1}',
    '.perception-figure{margin:0}.perception-figure figcaption{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;font-size:.875rem;color:var(--pl-soft)}.perception-svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;border-radius:8px;overflow:hidden;forced-color-adjust:none}.perception-reading{margin-top:14px;border-left:4px solid #b45309;padding:6px 12px}.perception-reading strong{font-size:.9375rem}.perception-reading a{color:#15566c;text-decoration:underline}.perception-scenes{display:grid;gap:16px}.perception-journal{margin-top:20px}.perception-journal ol{padding-left:22px}.perception-journal li{padding:14px 0;border-bottom:1px solid var(--pl-border)}.perception-journal li p{white-space:pre-wrap;overflow-wrap:anywhere}.perception-empty{color:var(--pl-soft);font-size:.875rem}.perception-status{min-height:1.5em;font-size:.875rem;color:var(--pl-soft);margin-top:12px}',
    '.perception-matching{border:1px solid var(--pl-border);padding:12px;border-radius:10px;margin:16px 0}.perception-matching .perception-field{margin:12px 0}.perception-scene-actions{margin-bottom:14px;min-height:44px}.perception-deltas{grid-column:1/-1}.perception-deltas table{width:100%;border-collapse:collapse;font-size:.8125rem;table-layout:fixed}.perception-deltas th,.perception-deltas td{padding:8px 6px;text-align:left;vertical-align:top;overflow-wrap:anywhere;border-bottom:1px solid var(--pl-border)}.perception-deltas th:first-child{width:40%}.perception-notebook-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.perception-journal time{font-size:.8125rem;color:var(--pl-soft)}',
    '.perception-inquiry-values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0;font-size:.875rem}.perception-inquiry-values>div{padding:10px;border:1px solid var(--pl-border);border-radius:8px;background:var(--pl-ground)}.perception-inquiry-values dt{color:var(--pl-soft);line-height:1.5}.perception-inquiry-values dd{margin:4px 0 0;font-weight:700;line-height:1.5;overflow-wrap:anywhere}@media(max-width:500px){.perception-inquiry-values{grid-template-columns:1fr}}',
    '.perception-study{margin-top:16px;padding:12px;border:1px solid var(--pl-border);border-radius:10px}.perception-study h4{font-size:.9375rem;margin:0 0 8px}.perception-study-result{grid-column:1/-1}.perception-study-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.8125rem}.perception-study-table th,.perception-study-table td{padding:8px 4px;text-align:left;vertical-align:top;border-bottom:1px solid var(--pl-border);overflow-wrap:anywhere}.perception-study-table th:first-child{width:13%}.perception-study-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.perception-study-stats div{padding:10px;background:var(--pl-ground);border:1px solid var(--pl-border);border-radius:8px}.perception-study-stats dt{font-size:.8125rem;color:var(--pl-soft)}.perception-study-stats dd{margin:6px 0 0;font-weight:700;overflow-wrap:anywhere}.perception-review{margin:16px 0}.perception-study-badge{display:inline-block;margin:8px 0 0;font-size:.8125rem;color:var(--pl-soft)}@media(max-width:500px){.perception-study-stats{grid-template-columns:1fr}.perception-study-table{font-size:.75rem}}',
    '.perception-study-table,.perception-study-table caption,.perception-study-table th,.perception-study-table td,.perception-deltas table,.perception-deltas th,.perception-deltas td{color:var(--pl-ink);background:var(--pl-panel)}.perception-study-badge{display:block}',
    '.perception-study-compare .perception-study-table th:first-child{width:36%}.perception-study-compare select{width:100%}.perception-pair-plot{margin:16px 0}.perception-pair-plot figcaption{display:block;font-size:.8125rem;color:var(--pl-soft);line-height:1.5;margin-top:8px}.perception-pair-settings small{display:block;font-weight:400}.perception-pair-shift{padding:12px;border:1px solid var(--pl-border);border-radius:8px}',
    '.perception-recorded-preview{margin:16px 0;padding:12px;border:1px solid var(--pl-border);border-radius:10px}.perception-recorded-preview h5{font-size:.9375rem;margin:0 0 8px;line-height:1.5}.perception-recorded-preview .perception-field{margin:12px 0}.perception-recorded-preview figure{margin:12px 0 0}.perception-recorded-preview figcaption{font-size:.875rem;line-height:1.5;margin:8px 0;overflow-wrap:anywhere}.perception-recorded-preview svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;border-radius:8px;overflow:hidden;forced-color-adjust:none}.perception-recorded-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}.perception-recorded-pair .perception-recorded-preview{margin:0}.perception-recorded-note{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:900px){.perception-recorded-pair{grid-template-columns:1fr}}',
    '.perception-guide-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.perception-guide-fields small{display:block;font-size:.8125rem;color:var(--pl-soft);margin-top:8px}@media(max-width:580px){.perception-guide-fields{grid-template-columns:1fr}}',
    '.perception-import input[type=file]{display:block;width:100%;min-width:0;min-height:44px;margin-top:8px;font:inherit;color:var(--pl-ink)}.perception-import input[type=file]::file-selector-button{min-height:44px;font:inherit;color:var(--pl-ink);background:var(--pl-panel);border:1px solid var(--pl-border);border-radius:8px;margin-right:8px;padding:8px}.perception-import-filename{overflow-wrap:anywhere}',
    '.perception-finder-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}.perception-finder-fields select,.perception-finder-fields input{width:100%;min-width:0}.perception-finder input[type=search]{display:block;min-height:44px;margin-top:8px;padding:8px 10px;font:inherit;color:var(--pl-ink);background:var(--pl-panel);border:1px solid var(--pl-border);border-radius:8px}.perception-study-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;list-style:none;padding:0!important;margin:16px 0}.perception-journal .perception-study-card{min-width:0;padding:14px;border:1px solid var(--pl-border);border-radius:10px}.perception-study-card>strong{display:block;line-height:1.5;overflow-wrap:anywhere}.perception-study-card details{margin-top:10px}.perception-study-card summary{min-height:44px;padding:10px 0;cursor:pointer;font-size:.875rem;font-weight:700}.perception-study-card ol{padding-left:22px}.perception-study-card .perception-actions{margin-top:10px}@media(max-width:700px){.perception-study-cards{grid-template-columns:1fr}}@media(max-width:580px){.perception-finder-fields{grid-template-columns:1fr}}',
    '.perception-live-pair{display:grid;grid-template-columns:1fr;gap:16px;align-items:start}.perception-live-pair[data-comparing=true][data-layout=auto]{grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))}.perception-live-pair[data-comparing=true] figcaption{align-items:start;flex-direction:column;min-height:48px}.perception-live-pair[data-layout=switch]{isolation:isolate}.perception-live-pair[data-layout=switch]>.perception-card{grid-area:1/1;align-self:stretch}.perception-live-pair[data-layout=switch] figcaption{display:none}.perception-live-pair [data-comparison-inactive=true]{visibility:hidden;pointer-events:none}.perception-comparison-tools{grid-column:1/-1}.perception-comparison-tools .perception-field{margin:0;max-width:24rem}[data-perception-lab] .perception-comparison-tools .perception-scene-actions{margin:0}.perception-comparison-toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}.perception-switch-views{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px}.perception-switch-views button{text-align:left}.perception-switch-views strong,.perception-switch-views span{display:block}.perception-switch-views span{font-size:.8125rem;margin-top:4px}.perception-comparison-tools p{margin:12px 0 0}',
    '[data-perception-expanded=true] .perception-workspace{grid-template-columns:1fr;grid-template-areas:"scene" "controls"}[data-perception-expanded=true] .perception-controls details[open]>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}[data-perception-expanded=true] .perception-svg{max-height:76dvh}',
    '.theme-dark [data-perception-lab],[data-perception-theme=dark]{--pl-ink:#e7f3f8;--pl-soft:#b9d0dc;--pl-panel:#183447;--pl-ground:#102738;--pl-border:#557687}.theme-dark .perception-reading a,[data-perception-theme=dark] .perception-reading a{color:#9edcf2}[data-perception-theme=contrast]{--pl-ink:#fff;--pl-soft:#fff;--pl-panel:#000;--pl-ground:#000;--pl-border:#fff}[data-perception-theme=contrast] button[aria-pressed=true]{background:#ffff00;color:#000;border-color:#ffff00}[data-perception-theme=contrast] .perception-reading a{color:#ffff00}',
    '@media(max-width:1050px){.perception-experiments{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.perception-workspace{grid-template-columns:1fr;grid-template-areas:"scene" "controls"}.perception-experiments{display:none}.perception-mobile-picker{display:block;margin:16px 0;font-size:.875rem}.perception-mobile-picker select{display:block;width:100%;margin-top:6px}.perception-card{padding:12px}[data-perception-expanded=true] .perception-controls details[open]>div{display:block}.perception-heading h2{font-size:1.4rem}}',
    '[data-perception-lab]{--pl-control:#6a8190;--pl-accent:#15566c;--pl-active:#e7f2f5;--pl-active-ink:#163449;--pl-shadow:0 6px 22px rgba(22,52,73,.06)}[data-perception-lab] button,[data-perception-lab] select{border-color:var(--pl-control)}[data-perception-lab] button{font-weight:600}[data-perception-lab] .perception-heading{padding:4px 0 20px;border-bottom:1px solid var(--pl-border);gap:20px}[data-perception-lab] .perception-heading h2{font-size:clamp(1.65rem,2.7vw,2.25rem);font-weight:750;letter-spacing:-.035em}[data-perception-lab] .perception-eyebrow{color:var(--pl-accent);font-weight:700;letter-spacing:.13em;margin-bottom:8px}[data-perception-lab] .perception-heading>.perception-actions{align-self:flex-start}[data-perception-lab] .perception-card{box-shadow:var(--pl-shadow)}[data-perception-lab] .perception-card h3{font-weight:700;line-height:1.4}',
    '[data-perception-lab] .perception-experiments{gap:10px;margin:20px 0 24px}[data-perception-lab] .perception-experiments button{display:flex;align-items:center;gap:10px;padding:12px;text-align:left;border-color:var(--pl-border);min-height:100px}[data-perception-lab] .perception-experiments button[aria-pressed=true]{background:var(--pl-active);color:var(--pl-active-ink);border-color:var(--pl-accent);box-shadow:inset 0 -3px var(--pl-accent)}.perception-experiment-thumbnail{display:block;flex:0 0 64px;width:64px;height:48px;background:#fff;border:1px solid #bccfd7;border-radius:6px;forced-color-adjust:none}.perception-experiment-copy{display:block;min-width:0}.perception-experiment-copy strong{display:block;font-size:.875rem;line-height:1.35;font-weight:700}[data-perception-lab] .perception-experiments small{font-size:.6875rem;line-height:1.4;margin-top:5px;opacity:1}[data-perception-lab] .perception-mobile-picker{font-weight:650}.perception-mobile-picker select{font-weight:400}',
    '[data-perception-lab] .perception-workspace{gap:20px}[data-perception-lab] .perception-controls{border-top:4px solid var(--pl-accent)}[data-perception-lab] .perception-controls summary{font-weight:700;border-bottom:1px solid var(--pl-border);margin-bottom:12px}[data-perception-lab] .perception-field>span{gap:12px;align-items:baseline}[data-perception-lab] .perception-field output{padding:2px 7px;background:var(--pl-ground);border-radius:5px;font-weight:650;line-height:1.5;text-align:right}[data-perception-lab] .perception-observation{padding-top:14px;border-top:1px solid var(--pl-border)}[data-perception-lab] .perception-choices{gap:8px}[data-perception-lab] .perception-live-stage,[data-perception-lab] .perception-comparison{padding:clamp(12px,1.4vw,20px)}[data-perception-lab] .perception-scene-actions{justify-content:flex-end;margin-bottom:16px}[data-perception-lab] .perception-figure figcaption{align-items:baseline;line-height:1.5;margin-bottom:14px}[data-perception-lab] .perception-figure figcaption strong{font-weight:700;color:var(--pl-accent)}[data-perception-lab] .perception-svg{border:1px solid var(--pl-border)}[data-perception-lab] .perception-reading{padding:14px 16px;border-radius:0 10px 10px 0;background:var(--pl-ground)}[data-perception-lab] .perception-reading strong{font-size:1rem;line-height:1.5}[data-perception-lab] .perception-reading p{margin:8px 0 12px}',
    '.perception-preview-toolbar{display:flex;align-items:flex-end;flex-wrap:wrap;gap:12px;margin:12px 0}.perception-preview-toolbar>.perception-field{flex:1 1 12rem;max-width:20rem;margin:0}.perception-preview-toolbar>.perception-actions{flex:0 1 auto}.perception-recorded-preview h3,.perception-recorded-preview h5{font-weight:700}.perception-recorded-details{border-top:1px solid var(--pl-border);padding-top:12px;margin-top:12px}.perception-recorded-details>[data-perception-recorded-values]{font-weight:650;padding:12px;border-radius:8px;background:var(--pl-ground);margin:0;line-height:1.6}.perception-recorded-meta{display:flex;align-items:baseline;gap:6px 20px;flex-wrap:wrap;margin:10px 0}.perception-recorded-meta p{margin:0;font-size:.875rem;line-height:1.5}.perception-recorded-meta time{font-size:.8125rem;color:var(--pl-soft);font-variant-numeric:tabular-nums}.perception-recorded-details>.perception-recorded-note{border-left:3px solid var(--pl-border);padding:8px 12px;margin:10px 0 0;line-height:1.6}.perception-drawing-viewer .perception-preview-toolbar>.perception-field{margin:0}.perception-drawing-viewer header{padding-bottom:14px;border-bottom:1px solid var(--pl-border)}.perception-drawing-viewer h2{font-weight:750;letter-spacing:-.02em}.perception-drawing-viewer .perception-viewer-pair .perception-recorded-preview{padding:16px}.perception-drawing-viewer .perception-recorded-preview figure{margin-top:16px}.perception-drawing-viewer .perception-recorded-preview figcaption{color:var(--pl-soft)}',
    '[data-perception-lab] .perception-journal{margin-top:28px;padding:clamp(12px,1.8vw,24px)}[data-perception-lab] .perception-notebook-heading{padding-bottom:12px;border-bottom:1px solid var(--pl-border);margin-bottom:12px}[data-perception-lab] .perception-study-table caption{font-weight:700;text-align:left;padding:12px 0 8px;line-height:1.5}[data-perception-lab] .perception-study-table th,[data-perception-lab] .perception-study-table td{padding:10px 6px;font-variant-numeric:tabular-nums}[data-perception-lab] .perception-study-table thead th{background:var(--pl-ground)}[data-perception-lab] .perception-study-stats dd{font-size:1.125rem}[data-perception-lab] .perception-study-card{background:var(--pl-panel)}[data-perception-lab] .perception-study-card>strong{font-weight:700}[data-perception-lab] .perception-pair-shift{background:var(--pl-ground);border-left:4px solid var(--pl-accent)}',
    '.theme-dark [data-perception-lab],[data-perception-theme=dark]{--pl-control:#91aabd;--pl-accent:#9bd5e6;--pl-active:#234b61;--pl-active-ink:#eff8fc;--pl-shadow:none}[data-perception-theme=contrast]{--pl-control:#fff;--pl-accent:#ffff00;--pl-active:#ffff00;--pl-active-ink:#000;--pl-shadow:none}@media(max-width:700px){[data-perception-lab] .perception-heading{padding-bottom:16px;gap:16px}[data-perception-lab] .perception-heading>.perception-actions{gap:6px}[data-perception-lab] .perception-heading>.perception-actions button{padding:8px 10px}[data-perception-lab] .perception-workspace{gap:16px}.perception-drawing-viewer .perception-viewer-pair .perception-recorded-preview{padding:12px}.perception-preview-toolbar{gap:10px}}@media(forced-colors:active){[data-perception-lab],[data-perception-lab][data-perception-theme]{--pl-control:CanvasText;--pl-accent:Highlight;--pl-active:Highlight;--pl-active-ink:HighlightText;--pl-shadow:none}.perception-experiment-thumbnail{border-color:CanvasText}}',
    ".perception-drawing-viewer[data-observation-review=true]>header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:16px;padding-bottom:16px}.perception-drawing-viewer .perception-observation-eyebrow{margin:0 0 4px;color:var(--pl-soft);font-size:.75rem;font-weight:700;letter-spacing:.04em}.perception-drawing-viewer[data-observation-review=true] h2{font-size:clamp(1.25rem,2vw,1.75rem);line-height:1.25}.perception-drawing-viewer .perception-observation-review{container:perception-observation / inline-size}.perception-observation-layout{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}.perception-observation-stage{flex:3 1 40rem}.perception-observation-sidebar{flex:1 1 20rem;display:grid;gap:16px}.perception-observation-layout[data-full-width=true]{display:block}.perception-observation-layout[data-full-width=true] .perception-observation-sidebar{margin-top:24px;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:start}.perception-observation-layout[data-full-width=true] .perception-observation-reference{grid-column:1/-1}",
    ".perception-drawing-viewer .perception-observation-stage figure{margin:0;border:1px solid var(--pl-border);border-radius:12px;overflow:hidden;background:var(--pl-ground)}.perception-drawing-viewer .perception-observation-stage figcaption{margin:0;padding:10px 14px;font-weight:650;font-size:.8125rem;line-height:1.4;color:var(--pl-soft)}.perception-drawing-viewer .perception-observation-stage svg{border-radius:0;min-height:0;max-height:70dvh}.perception-observation-badges{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.perception-observation-badges span{border:1px solid var(--pl-border);background:var(--pl-ground);border-radius:6px;padding:4px 8px;font-size:.75rem;line-height:1.5;color:var(--pl-soft);font-weight:650}.perception-observation-toolbar{gap:8px;margin:12px 0}.perception-observation-toolbar [data-perception-export-observation-report]{background:var(--pl-active);color:var(--pl-active-ink);border-color:var(--pl-control);font-weight:650}.perception-drawing-viewer .perception-observation-hint{font-size:.8125rem;color:var(--pl-soft);margin:12px 0}.perception-drawing-viewer .perception-observation-result{border-inline-start:3px solid var(--pl-accent);background:var(--pl-ground);padding:12px 16px;margin:16px 0 0;border-radius:0 8px 8px 0;font-size:.875rem}",
    ".perception-observation-card{padding:16px;border:1px solid var(--pl-border);border-radius:12px;background:var(--pl-ground)}.perception-observation-card h3{font-size:.8125rem;line-height:1.5;margin:0 0 8px;color:var(--pl-soft)}.perception-observation-card p{margin:0;font-size:.875rem}.perception-observation-card .perception-observation-impression{font-size:1.25rem;font-weight:700;line-height:1.35;color:var(--pl-ink)}.perception-observation-card .perception-observation-date{margin-top:12px;font-size:.75rem;color:var(--pl-soft)}.perception-observation-date time{font-variant-numeric:tabular-nums}.perception-observation-settings-card{background:var(--pl-panel)}.perception-observation-settings-card .perception-observation-settings,.perception-observation-settings-card caption,.perception-observation-settings-card th,.perception-observation-settings-card td{color:var(--pl-ink)}.perception-observation-settings-card .perception-observation-settings{margin:0;font-size:.8125rem}.perception-observation-settings-card caption{margin-bottom:12px;font-size:.875rem}.perception-observation-settings-card th,.perception-observation-settings-card td{padding:9px 6px}.perception-observation-settings-card tr:last-child th,.perception-observation-settings-card tr:last-child td{border-bottom:0}.perception-observation-reference{font-size:.8125rem;line-height:1.5;justify-self:start;padding:4px 0;overflow-wrap:anywhere}",
    "@container perception-observation (max-width:62rem){[data-perception-observation-full-width]{display:none}}@media(max-width:700px){.perception-drawing-viewer[data-observation-review=true]{width:calc(100vw - 12px);max-height:calc(100dvh - 12px);padding:12px;border-radius:10px}.perception-drawing-viewer[data-observation-review=true]>header{gap:10px;padding-bottom:12px}.perception-drawing-viewer .perception-observation-review{margin-top:12px}.perception-observation-layout{gap:20px}.perception-observation-card{padding:14px}}@media(forced-colors:active){.perception-observation-stage figure,.perception-observation-card,.perception-observation-badges span,.perception-observation-result{border-color:CanvasText}}",
    '.perception-focus-dialog{width:calc(100vw - 24px);max-width:none;height:calc(100dvh - 24px);max-height:none;margin:auto;padding:clamp(12px,1.5vw,24px);border:1px solid var(--pl-border);border-radius:16px;color:var(--pl-ink);background:var(--pl-ground);font:inherit;overflow:hidden}.perception-focus-dialog[open]{display:flex;flex-direction:column;gap:16px}.perception-focus-dialog::backdrop{background:rgba(5,20,30,.78)}.perception-focus-heading{display:flex;align-items:start;justify-content:space-between;gap:16px;flex-wrap:wrap;flex:none}.perception-focus-heading h2{margin:0;font-size:1.25rem;line-height:1.4;font-weight:750;letter-spacing:-.02em}.perception-focus-heading p{margin:6px 0 0;font-size:.875rem;line-height:1.5;color:var(--pl-soft);max-width:75ch}.perception-focus-body{overflow:auto;overscroll-behavior:contain;min-height:0;flex:1;padding:4px;scroll-padding:8px}.perception-focus-dialog .perception-svg{max-height:76dvh}.perception-focus-dialog .perception-controls{box-shadow:none}.perception-focus-dialog .perception-controls .perception-actions{margin-bottom:8px}@media(max-width:700px){.perception-focus-dialog{width:calc(100vw - 12px);height:calc(100dvh - 12px);padding:12px;border-radius:10px}.perception-focus-heading{gap:10px}.perception-focus-heading h2{font-size:1.125rem}}@media(forced-colors:active){.perception-focus-dialog::backdrop{background:Canvas;opacity:.85}}',
    '.perception-controls details>div>div>button{margin:0 8px 8px 0}@media(max-height:600px){.perception-focus-dialog[open]{display:block;overflow:auto}.perception-focus-heading{margin-bottom:16px}.perception-focus-body{overflow:visible}}',
    '.perception-focus-browser{display:flex;align-items:end;flex-wrap:wrap;gap:12px;flex:none;padding-bottom:12px;border-bottom:1px solid var(--pl-border)}.perception-focus-browser .perception-field{margin:0;flex:1 1 20rem;max-width:32rem}.perception-focus-browser>p{flex-basis:100%;margin:0;font-size:.8125rem;line-height:1.5;color:var(--pl-soft)}.perception-focus-description{font-weight:500}.perception-focus-browser .perception-actions{flex:none}@media(max-width:700px){.perception-focus-browser{margin-bottom:16px}.perception-focus-browser .perception-field{max-width:none}.perception-focus-browser .perception-actions{width:100%}.perception-focus-browser .perception-actions button{flex:1}}',
    '.perception-context-explanation{margin-top:16px;padding:12px 14px;border-left:3px solid var(--pl-accent);background:var(--pl-ground);border-radius:0 8px 8px 0}.perception-context-explanation h3{margin:0;font-size:1rem;line-height:1.5}.perception-context-explanation details{margin-top:12px}.perception-context-explanation summary{min-height:44px;display:list-item;cursor:pointer;line-height:1.5;padding:10px 0}.perception-scene-actions>[data-perception-context-unavailable]{flex-basis:100%;margin:0;font-size:.875rem;line-height:1.5;color:var(--pl-soft)}',
    // Size the focus panes from the space left below the heading, including enlarged text.
    '.perception-focus-dialog[open]{overflow:auto}.perception-focus-body{min-height:10em}',
    '@media(max-height:600px){.perception-focus-dialog[open] .perception-svg{max-height:max(6rem,calc(100svh - 7rem))}}',
    '.perception-focus-body .perception-workspace{grid-template-columns:1fr;grid-template-areas:"scene" "controls"}.perception-focus-body .perception-svg{max-height:max(6rem,calc(100cqh - 5rem))}',
    '.perception-focus-navigation{display:flex;gap:8px;flex-wrap:wrap;align-items:start}.perception-focus-dialog>.perception-status{flex:none;margin:0;padding:0 4px}.perception-focus-body .perception-live-pair{scroll-margin:8px}.perception-focus-body{container-name:perception-focus;container-type:size}@media(max-height:600px){.perception-focus-body{container-type:normal}}@container perception-focus (min-width:56em) and (min-height:25em){[data-perception-expanded=false] .perception-focus-body .perception-workspace{height:100%;min-height:0;grid-template-columns:minmax(18em,21em) minmax(0,1fr);grid-template-rows:minmax(0,1fr);align-items:stretch}[data-perception-expanded=false] .perception-focus-body .perception-controls,[data-perception-expanded=false] .perception-focus-body .perception-scenes{height:100%;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;scroll-padding:12px}[data-perception-expanded=false] .perception-focus-body .perception-scenes{align-content:start;padding:4px}[data-perception-expanded=false] .perception-focus-body .perception-svg{max-height:calc(100cqh - 11rem)}}',
    '@container perception-focus (min-width:56em) and (min-height:25em){[data-perception-expanded=false] .perception-focus-body .perception-workspace{grid-template-areas:"controls scene"}[data-perception-expanded=false] .perception-focus-body .perception-live-pair[data-layout=switch] .perception-svg{max-height:max(12rem,calc(100cqh - 20rem))}}',
    '.perception-focus-dialog{scroll-padding:16px}@media(max-width:700px){.perception-focus-dialog[open]{display:block;overflow:auto}.perception-focus-heading{margin-bottom:16px}.perception-focus-body{overflow:visible;container-type:normal}.perception-focus-dialog>.perception-status{margin-top:12px}}',
    ".perception-slide-figure{margin:0;container-type:inline-size;container-name:perception-slide}.perception-slide-labels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px;line-height:1.5}.perception-slide-labels>div{border-inline-start:3px solid var(--pl-accent);padding-inline-start:10px;min-width:0}.perception-slide-labels>div:last-child{border-color:var(--pl-control)}.perception-slide-labels strong,.perception-slide-labels span{display:block;overflow-wrap:anywhere}.perception-slide-labels strong{font-size:.875rem}.perception-slide-labels span{font-size:.75rem;color:var(--pl-soft);margin-top:3px}.perception-slide-stage{position:relative;isolation:isolate;width:100%;aspect-ratio:5/3;max-height:70dvh;overflow:hidden;background:#fff;border:1px solid var(--pl-border);border-radius:10px}.perception-slide-layer{position:absolute;inset:0;overflow:hidden}[data-perception-lab] .perception-slide-stage .perception-svg{display:block;position:absolute;inset:0;width:100%;height:100%;max-height:none;aspect-ratio:auto;border:0;border-radius:0;object-fit:contain}.perception-slide-layer[data-perception-slide-layer=current]{z-index:1}",
    ".perception-slide-divider{position:absolute;z-index:2;top:0;bottom:0;left:var(--perception-slide-position);width:3px;transform:translateX(-50%);background:#163449;box-shadow:0 0 0 1px #fff;pointer-events:none;forced-color-adjust:none}.perception-slide-divider:after{content:\"\";position:absolute;top:8px;left:50%;transform:translateX(-50%);width:9px;height:28px;border:2px solid #fff;border-radius:4px;background:#163449}.perception-slide-divider[data-endpoint=true]{display:none}.perception-slide-drag{position:absolute;z-index:3;top:0;bottom:0;left:clamp(0px,calc(var(--perception-slide-position) - 22px),calc(100% - 44px));width:44px;cursor:ew-resize;touch-action:pan-y}.perception-slide-range{margin:16px 0 10px!important;max-width:none!important}.perception-slide-range input[type=range]{accent-color:var(--pl-accent)}.perception-slide-range output{display:block;padding:0!important;background:none!important;text-align:start!important;white-space:normal;font-size:.8125rem;color:var(--pl-soft);line-height:1.5}.perception-slide-actions{gap:8px;margin-top:12px}.perception-slide-readings{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));gap:16px;margin-top:20px}.perception-slide-readings .perception-reading{margin:0}.perception-slide-readings h4{font-size:.8125rem;color:var(--pl-soft);margin:0 0 8px}.perception-slide-range:focus-within{border-radius:8px;outline:2px solid var(--pl-control);outline-offset:5px}",
    ".perception-focus-body .perception-slide-stage{max-height:max(6rem,calc(100cqh - 10rem))}@media(max-height:600px){.perception-focus-dialog .perception-slide-stage{max-height:max(6rem,calc(100svh - 10rem))}}@media(max-width:700px){.perception-slide-stage{max-height:none}.perception-slide-labels{gap:10px}.perception-slide-actions button{flex:1 1 8rem}.perception-slide-readings{gap:12px}}@container perception-slide (max-width:12rem){.perception-slide-labels{grid-template-columns:minmax(0,1fr);gap:10px}.perception-slide-labels>div{border-inline-start:0;padding-inline-start:0;border-left:3px solid var(--pl-accent);padding-left:10px;text-align:left}.perception-slide-labels>div:last-child{border-left:0;padding-left:0;border-right:3px solid var(--pl-control);padding-right:10px;text-align:right}}@media(forced-colors:active){.perception-slide-range:focus-within{outline-color:Highlight}.perception-slide-labels>div{border-color:CanvasText}}",
    '.perception-inspector[hidden]{display:none!important}.perception-inspector{margin:16px 0;padding:14px;border:1px solid var(--pl-border);border-inline-start:3px solid var(--pl-accent);border-radius:10px;background:var(--pl-ground)}.perception-inspector-controls{display:flex;flex-wrap:wrap;align-items:end;gap:10px}.perception-inspector-controls .perception-field{margin:0;flex:1 1 10rem;max-width:18rem}.perception-inspector-controls select{width:100%}.perception-inspector p{margin:12px 0 0!important;font-size:.8125rem!important;line-height:1.5!important}.perception-camera-linked{font-weight:650}.perception-camera-badge{display:block;width:fit-content;margin:0 0 10px;padding:3px 8px;font-size:.75rem;line-height:1.5;border:1px solid var(--pl-border);border-radius:6px;color:var(--pl-soft);background:var(--pl-ground)}.perception-scene-actions .perception-camera-badge{display:inline-block;margin:0 0 0 8px;font-size:.75em;color:inherit;background:none;border-color:currentColor}.perception-scene-actions>[data-perception-camera-study-locked]{flex-basis:100%;margin:0!important}.perception-camera-navigation{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-areas:". up ." "left center right" ". down .";gap:6px;max-width:15rem;margin-top:14px}.perception-camera-navigation button{display:flex;align-items:center;justify-content:center}.perception-camera-navigation svg{width:1.125rem;height:1.125rem;flex:none}.perception-camera-navigation [data-perception-camera-move=up]{grid-area:up}.perception-camera-navigation [data-perception-camera-move=left]{grid-area:left}.perception-camera-navigation [data-perception-camera-move=center]{grid-area:center}.perception-camera-navigation [data-perception-camera-move=right]{grid-area:right}.perception-camera-navigation [data-perception-camera-move=down]{grid-area:down}',
    '.perception-camera-navigation-row{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:16px}.perception-camera-overview{flex:1 1 15rem;min-width:0;max-width:18rem;margin:0}.perception-camera-overview figcaption{font-size:.875rem;font-weight:650;line-height:1.5;margin-bottom:8px}.perception-camera-navigation-row .perception-camera-navigation{flex:1 1 12rem;margin-top:0}.perception-camera-overview .perception-camera-overview-map{display:block;box-sizing:border-box;width:100%;height:auto;min-height:0;aspect-ratio:5/3;margin:0;padding:0;border:0;border-radius:6px;background:#fff;overflow:hidden;outline:1px solid var(--pl-border);outline-offset:-1px;touch-action:pinch-zoom;cursor:crosshair;forced-color-adjust:none}.perception-camera-overview-map svg{display:block;width:100%;height:100%;aspect-ratio:5/3;pointer-events:none;forced-color-adjust:none}.perception-camera-overview .perception-camera-overview-map:focus-visible{outline:3px solid var(--pl-accent);outline-offset:3px}.perception-camera-overview .perception-camera-overview-position{font-weight:650;font-variant-numeric:tabular-nums}.perception-camera-overview p{overflow-wrap:anywhere}@media(forced-colors:active){.perception-camera-overview .perception-camera-overview-map:focus-visible{outline-color:Highlight}}',
    '.perception-camera-viewport{--perception-view-height:70dvh;position:relative;width:min(100%,calc(var(--perception-view-height) * 5 / 3));aspect-ratio:5/3;margin-inline:auto;overflow:hidden;border:0;outline:1px solid var(--pl-border);outline-offset:-1px;border-radius:10px;background:#fff}.perception-camera-viewport.perception-slide-stage{max-height:none}.perception-camera-layer{position:absolute;inset:0;overflow:hidden;transform-origin:0 0}[data-perception-lab] .perception-camera-viewport .perception-svg{display:block;position:absolute;inset:0;width:100%;height:100%;max-height:none;aspect-ratio:auto;border:0;border-radius:0}.perception-camera-viewport[data-pan-mode=true]{touch-action:pinch-zoom;cursor:grab}.perception-camera-viewport[data-pan-mode=true]:active{cursor:grabbing}.perception-camera-viewport:focus-visible{outline:3px solid var(--pl-accent);outline-offset:3px}.perception-focus-body .perception-camera-viewport{--perception-view-height:max(6rem,calc(100cqh - 5rem))}@container perception-focus (min-width:56em) and (min-height:25em){[data-perception-expanded=false] .perception-focus-body .perception-camera-viewport{--perception-view-height:max(6rem,calc(100cqh - 11rem))}[data-perception-expanded=false] .perception-focus-body .perception-live-pair[data-layout=switch] .perception-camera-viewport{--perception-view-height:max(6rem,calc(100cqh - 20rem))}}@media(max-width:700px){.perception-camera-viewport{width:100%}.perception-inspector-controls .perception-field{max-width:none;flex-basis:100%}.perception-inspector-controls>button{flex:1 1 8rem}}@media(max-height:600px){.perception-focus-dialog .perception-camera-viewport{--perception-view-height:max(6rem,calc(100svh - 7rem))}}@media(forced-colors:active){.perception-camera-viewport:focus-visible{outline-color:Highlight}}',
    '.perception-drawing-viewer .perception-viewer-pair[data-layout=switch]{grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(5,auto);gap:0;isolation:isolate}.perception-drawing-viewer .perception-viewer-pair[data-layout=switch]>.perception-recorded-preview{display:grid;grid-template-rows:subgrid;grid-column:1;grid-row:1 / span 5;align-self:stretch;row-gap:0;min-width:0}.perception-viewer-pair[data-layout=switch]>.perception-recorded-preview>h3{grid-row:1}.perception-viewer-pair[data-layout=switch]>.perception-recorded-preview>.perception-preview-toolbar{grid-row:2}.perception-drawing-viewer .perception-viewer-pair[data-layout=switch]>.perception-recorded-preview>figure{display:grid;grid-template-rows:subgrid;grid-row:3 / span 2;row-gap:0;min-width:0}.perception-viewer-pair[data-layout=switch]>section>figure>figcaption{grid-row:1;align-self:end}.perception-viewer-pair[data-layout=switch]>section>figure>.perception-recorded-stage{grid-row:2;align-self:start}.perception-viewer-pair[data-layout=switch]>.perception-recorded-preview>.perception-recorded-details{grid-row:5;min-width:0}.perception-viewer-pair [data-viewer-inactive=true]{visibility:hidden;pointer-events:none}.perception-recorded-switch-hint{font-size:.875rem;margin:12px 0}.perception-drawing-viewer>.perception-recorded-switch{grid-template-columns:repeat(auto-fit,minmax(min(100%,8rem),1fr));position:sticky;top:0;z-index:2;margin:10px 0 0;padding:8px 0;border-block:1px solid var(--pl-border);background:var(--pl-panel);box-shadow:0 2px 0 var(--pl-border)}.perception-recorded-switch button{min-width:0;overflow-wrap:anywhere;text-align:start}',
    '.perception-recorded-viewport{position:relative;width:min(100%,calc(65dvh * 5 / 3));aspect-ratio:5/3;margin-inline:auto;overflow:hidden;border-radius:8px;background:#fff;outline:1px solid var(--pl-border);outline-offset:-1px}.perception-recorded-layer{position:absolute;inset:0;transform-origin:0 0}.perception-drawing-viewer .perception-recorded-preview .perception-recorded-viewport svg{position:absolute;inset:0;width:100%;height:100%;max-height:none;min-height:0;aspect-ratio:auto;border-radius:0}.perception-recorded-viewport[data-pan-mode=true]{touch-action:pinch-zoom;cursor:grab}.perception-recorded-viewport[data-pan-mode=true]:active{cursor:grabbing}.perception-recorded-viewport:focus-visible{outline:3px solid var(--pl-accent);outline-offset:3px}.perception-recorded-inspect-toggle{margin:12px 0}.perception-recorded-inspect-toggle .perception-camera-badge{display:inline-block;margin:0 0 0 8px;font-size:.75em;color:inherit;background:none;border-color:currentColor}.perception-drawing-viewer .perception-recorded-inspector .perception-inspector-controls .perception-field{margin:0}@media(forced-colors:active){.perception-recorded-viewport:focus-visible{outline-color:Highlight}}',
    '.perception-recorded-stage{width:min(100%,calc(65dvh * 5 / 3));min-width:0;margin-inline:auto}.perception-recorded-stage>.perception-recorded-viewport{width:100%}.perception-recorded-frame{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;padding:10px 0 12px;line-height:1.5;font-size:.8125rem}.perception-recorded-frame-status{min-width:0;overflow-wrap:anywhere;font-weight:650;font-variant-numeric:tabular-nums;color:var(--pl-soft)}.perception-recorded-frame[data-magnified=true] .perception-recorded-frame-status{color:var(--pl-accent)}.perception-recorded-frame button{max-width:100%;min-width:44px;white-space:normal;overflow-wrap:anywhere;font-size:inherit}',
    '.perception-pair-plot{position:relative;padding:clamp(12px,2vw,20px);border:1px solid var(--pl-border);border-radius:12px;background:var(--pl-panel)}.perception-pair-plot .perception-pair-plot-heading{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;margin:0 0 16px;color:var(--pl-ink)}.perception-pair-plot-heading h5{margin:0;font-size:1rem;line-height:1.5;font-weight:700;overflow-wrap:anywhere}.perception-pair-plot .perception-pair-reference-label{margin:0;font-size:.875rem;color:var(--pl-soft);font-variant-numeric:tabular-nums}.perception-pair-plot-description{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}.perception-pair-chart{display:grid;gap:12px}.perception-pair-series{padding:12px;background:var(--pl-ground);border:1px solid var(--pl-border);border-radius:8px}.perception-pair-series-heading{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px 16px;font-size:.875rem;line-height:1.5;overflow-wrap:anywhere}.perception-pair-series-heading strong{font-weight:700;color:var(--pl-ink)}.perception-pair-median-label{color:var(--pl-accent);font-weight:650;font-variant-numeric:tabular-nums}.perception-pair-track{position:relative;height:6rem;margin:12px .5rem 8px;direction:ltr;isolation:isolate}.perception-pair-reference-mark{position:absolute;top:0;bottom:0;border-left:2px dashed var(--pl-soft);transform:translateX(-50%)}.perception-pair-range-mark{position:absolute;top:50%;height:0;border-top:2px solid var(--pl-ink);transform:translateY(-50%)}.perception-pair-range-mark:before,.perception-pair-range-mark:after{content:"";position:absolute;top:-.25rem;height:.5rem;border-left:2px solid var(--pl-ink);transform:translateX(-50%)}.perception-pair-range-mark:before{left:0}.perception-pair-range-mark:after{left:100%}.perception-pair-median-mark{position:absolute;top:12%;height:76%;border-left:3px solid var(--pl-accent);transform:translateX(-50%)}.perception-pair-dot{position:absolute;width:.75rem;height:.75rem;border:2px solid var(--pl-accent);border-radius:50%;background:var(--pl-accent);transform:translate(-50%,-50%)}.perception-pair-plot .perception-pair-values{margin:0;font-size:.8125rem;line-height:1.5;font-variant-numeric:tabular-nums;color:var(--pl-soft)}.perception-pair-axis-wrap{padding-inline:13px}.perception-pair-axis{display:flex;justify-content:space-between;gap:8px;margin-inline:.5rem;padding-top:8px;border-top:2px solid var(--pl-control);font-size:.875rem;line-height:1.5;font-variant-numeric:tabular-nums;color:var(--pl-ink);direction:ltr}.perception-pair-axis>span{position:relative}.perception-pair-axis>span:before{content:"";position:absolute;top:-10px;height:6px;border-left:2px solid var(--pl-control);left:0}.perception-pair-axis>span:last-child:before{left:auto;right:0}.perception-pair-plot .perception-pair-axis-label{margin:6px 0 0;text-align:center;font-size:.8125rem;line-height:1.5;color:var(--pl-soft)}.perception-pair-legend{display:flex;gap:10px 20px;flex-wrap:wrap;list-style:none;margin:16px 0 0;padding:0!important;font-size:.8125rem;line-height:1.5;color:var(--pl-ink)}.perception-journal .perception-pair-legend li{display:flex;align-items:center;gap:8px;min-width:0;padding:0;border:0;overflow-wrap:anywhere}.perception-pair-key{display:inline-block;position:relative;flex:none;width:1.5rem;height:1rem}.perception-pair-key:after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}.perception-pair-key-dot:after{width:.75rem;height:.75rem;border:2px solid var(--pl-accent);border-radius:50%;background:var(--pl-accent)}.perception-pair-key-range:after{width:1.5rem;border-top:2px solid var(--pl-ink)}.perception-pair-key-median:after{height:1rem;border-left:3px solid var(--pl-accent)}.perception-pair-key-reference:after{height:1rem;border-left:2px dashed var(--pl-soft)}.perception-pair-plot .perception-pair-plot-hint{margin:12px 0 0;font-size:.8125rem;line-height:1.6;color:var(--pl-soft)}@media(forced-colors:active){.perception-pair-dot,.perception-pair-key-dot:after{background:CanvasText;border-color:CanvasText;forced-color-adjust:none}.perception-pair-median-mark,.perception-pair-key-median:after{border-color:CanvasText}}',
    '.perception-trial-ledger{width:100%;min-width:0;container-type:inline-size;container-name:perception-trials}.perception-trial-ledger .perception-trial-table{font-size:.875rem;line-height:1.6;border-collapse:separate;border-spacing:0;color:var(--pl-ink)}.perception-trial-table caption{text-align:start;margin-bottom:12px;font-size:1rem;line-height:1.5;font-weight:700;color:var(--pl-ink)}.perception-trial-table caption>span{display:block;margin-top:4px;font-size:.8125rem;font-weight:400;color:var(--pl-soft)}.perception-trial-ledger .perception-trial-table th,.perception-trial-ledger .perception-trial-table td{padding:12px 10px;text-align:start;vertical-align:middle}.perception-trial-ledger .perception-trial-table thead th{background:var(--pl-ground);font-weight:650}.perception-trial-ledger .perception-trial-table th:first-child{width:17%}.perception-trial-name{display:inline-block;padding:3px 8px;border:1px solid var(--pl-border);border-radius:6px;background:var(--pl-ground);font-weight:700}.perception-trial-cell-label{display:none}.perception-trial-value{font-variant-numeric:tabular-nums;font-weight:600}.perception-trial-value[data-perception-trial-value=match]{font-weight:750;color:var(--pl-accent)}@container perception-trials (max-width:38rem){ .perception-trial-ledger .perception-trial-table{display:block} .perception-trial-table caption{display:block} .perception-trial-table thead{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0} .perception-trial-table tbody{display:grid;gap:12px} .perception-trial-table tbody tr{display:block;min-width:0;padding:12px;border:1px solid var(--pl-border);border-radius:10px;background:var(--pl-ground)} .perception-trial-ledger .perception-trial-table tbody th:first-child{display:block;width:auto;margin:0 0 6px;padding:0 0 10px;border-bottom:1px solid var(--pl-border);background:transparent} .perception-trial-name{background:var(--pl-panel)} .perception-trial-ledger .perception-trial-table tbody td{display:grid;grid-template-columns:minmax(0,1fr) minmax(4ch,auto);align-items:baseline;gap:12px;padding:8px 0;border:0;background:transparent} .perception-trial-cell-label{display:block;color:var(--pl-soft);font-weight:400;overflow-wrap:anywhere} .perception-trial-value{text-align:end;overflow-wrap:anywhere}}',
    '.perception-study-progress{position:relative;container-type:inline-size;container-name:perception-progress;margin:16px 0}[data-perception-lab] .perception-figure figcaption{flex-wrap:wrap}[data-perception-lab] .perception-figure figcaption>*{min-width:0;overflow-wrap:anywhere}.perception-study-progress .perception-study-progress-heading{margin:0 0 12px;font-size:1rem;line-height:1.5;color:var(--pl-ink);overflow-wrap:anywhere}.perception-study-progress-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;list-style:none;margin:0;padding:0}.perception-study-progress-steps>li{display:flex;align-items:center;gap:10px;min-width:0;padding:12px;border:1px dashed var(--pl-control);border-radius:10px;background:var(--pl-ground);color:var(--pl-ink);font-size:.875rem;line-height:1.5}.perception-study-progress-steps>li[data-perception-progress-state=recorded]{border-style:solid}.perception-study-progress-steps>li[aria-current=step]{padding:11px;border:2px solid var(--pl-accent);background:var(--pl-panel);font-weight:700}.perception-study-progress-number{display:grid;place-items:center;flex:0 0 2em;width:2em;height:2em;border:1px solid var(--pl-control);border-radius:50%;font-weight:700;font-variant-numeric:tabular-nums;background:var(--pl-panel);color:var(--pl-ink)}.perception-study-progress-steps>li[aria-current=step] .perception-study-progress-number{border:2px solid var(--pl-accent)}.perception-study-progress-copy{min-width:0;overflow-wrap:anywhere}.perception-study-progress-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}@container perception-progress (max-width:32rem){.perception-study-progress-steps{grid-template-columns:minmax(0,1fr)}}',
    '.perception-pair-details{width:100%;min-width:0;container-type:inline-size;container-name:perception-pair-details;margin:20px 0}.perception-pair-details .perception-pair-detail-table{font-size:.9375rem;line-height:1.6;border-collapse:separate;border-spacing:0;color:var(--pl-ink)}.perception-pair-detail-table caption{margin-bottom:12px;text-align:start;font-size:1rem;line-height:1.5;font-weight:700;color:var(--pl-ink);overflow-wrap:anywhere}.perception-pair-details .perception-pair-detail-table th,.perception-pair-details .perception-pair-detail-table td{padding:14px 12px;text-align:start;vertical-align:top;overflow-wrap:anywhere}.perception-pair-details .perception-pair-detail-table th:first-child{width:32%}.perception-pair-details .perception-pair-detail-table thead th{background:var(--pl-ground);font-weight:700;color:var(--pl-ink)}.perception-pair-details .perception-pair-detail-table tbody th{font-weight:650}.perception-pair-detail-value{font-variant-numeric:tabular-nums;font-weight:600;overflow-wrap:anywhere}.perception-pair-cell-label{display:none}@container perception-pair-details (max-width:44rem){ .perception-pair-details .perception-pair-detail-table{display:block} .perception-pair-detail-table caption{display:block} .perception-pair-detail-table thead{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0} .perception-pair-detail-table tbody{display:grid;gap:14px} .perception-pair-detail-table tbody tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));min-width:0;border:1px solid var(--pl-border);border-radius:10px;background:var(--pl-panel);overflow:hidden} .perception-pair-details .perception-pair-detail-table tbody th:first-child{display:block;grid-column:1/-1;width:auto;min-width:0;padding:12px 14px;border-bottom:1px solid var(--pl-border);background:var(--pl-ground)} .perception-pair-details .perception-pair-detail-table tbody td{display:block;min-width:0;padding:12px 14px;border:0;background:transparent} .perception-pair-details .perception-pair-detail-table tbody td+td{border-inline-start:1px solid var(--pl-border)} .perception-pair-cell-label{display:block;margin-bottom:4px;font-size:.8125rem;font-weight:400;color:var(--pl-soft);overflow-wrap:anywhere}}@container perception-pair-details (max-width:24rem){ .perception-pair-detail-table tbody tr{grid-template-columns:minmax(0,1fr)} .perception-pair-details .perception-pair-detail-table tbody td+td{border-inline-start:0;border-block-start:1px solid var(--pl-border)}}',
    // Selected buttons use paired system colors; prevent text backplates from hiding HighlightText.
    '@media(forced-colors:active){[data-perception-lab],[data-perception-lab][data-perception-theme]{--pl-ink:CanvasText;--pl-soft:CanvasText;--pl-panel:Canvas;--pl-ground:Canvas;--pl-border:CanvasText}[data-perception-lab] button[aria-pressed=true]{background:Highlight;color:HighlightText;border-color:Highlight;forced-color-adjust:none}[data-perception-lab] .perception-reading a{color:LinkText}}'
  ].join('\n');
  var studySerial = 0;
  function PerceptionAdjustment(props) {
    var React = props.React, h = React.createElement, control = props.control, value = props.value, id = props.id, t = props.t;
    var draftPair = React.useState(null), draft = draftPair[0], setDraft = draftPair[1], exactRef = React.useRef(null), resetFocus = React.useRef(false);
    var edited = !props.disabled && draft && draft.base === value ? draft : null;
    React.useEffect(function () { setDraft(null); }, [value, props.disabled]);
    React.useEffect(function () { if (resetFocus.current && exactRef.current) { resetFocus.current = false; exactRef.current.focus(); } });
    var step = control.step || 1;
    var bounds = { min: control.min, max: control.max, step: step, unit: control.unit };
    function commit() {
      if (!edited || props.disabled) return;
      var raw = edited.text.trim(), numeric = Number(raw), ticks = (numeric - control.min) / step;
      if (!raw || !Number.isFinite(numeric) || numeric < control.min || numeric > control.max || Math.abs(ticks - Math.round(ticks)) > 0.0000001) {
        setDraft({ base: value, text: edited.text, invalid: true }); return;
      }
      setDraft(null);
      if (numeric !== value) props.onAdjust(numeric);
    }
    return h('div', { className: 'perception-field perception-adjustment', 'data-perception-adjustment': control.key },
      h('label', { htmlFor: id }, h('span', null, props.name, h('output', { htmlFor: id, 'aria-hidden': true }, value + control.unit))),
      h('input', { id: id, type: 'range', min: control.min, max: control.max, step: step, value: value, disabled: props.disabled, 'aria-label': props.name, 'aria-valuetext': value + control.unit,
        onChange: function (event) { setDraft(null); props.onAdjust(Number(event.target.value)); } }),
      h('div', { className: 'perception-precision-row' },
        h('div', { className: 'perception-precision-value' },
          h('input', { ref: exactRef, id: id + '-exact', type: 'number', inputMode: step < 1 ? 'decimal' : 'numeric', min: control.min, max: control.max, step: step, value: edited ? edited.text : value, disabled: props.disabled,
            'data-perception-exact': control.key, 'aria-label': format(t('exact_setting', '{setting}: exact value'), { setting: props.name }),
            'aria-describedby': props.hintId + ' ' + id + '-bounds' + (edited && edited.invalid ? ' ' + id + '-error' : ''), 'aria-invalid': edited && edited.invalid ? true : undefined,
            onFocus: props.onBegin, onChange: function (event) { setDraft({ base: value, text: event.target.value, invalid: false }); },
            onBlur: commit,
            onKeyDown: function (event) {
              if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commit(); }
              else if (event.key === 'Escape' && edited) { event.preventDefault(); event.stopPropagation(); setDraft(null); }
            } }),
          h('small', { className: 'perception-precision-unit', 'aria-hidden': true }, control.unit.trim())),
        h('button', { type: 'button', 'data-perception-reset-setting': control.key, disabled: props.disabled || value === control.value && !edited,
          'aria-label': format(t('reset_setting', 'Reset {setting}'), { setting: props.name }),
          onPointerDown: function (event) { if (event.button === 0) event.preventDefault(); },
          onClick: function () { resetFocus.current = true; setDraft(null); props.onReset(); } }, t('reset_setting_short', 'Reset'))),
      h('small', { id: id + '-bounds', className: 'perception-precision-hint' }, format(t('setting_range', 'Range: {min} to {max}{unit}. Step: {step}.'), bounds)),
      edited && edited.invalid && h('p', { id: id + '-error', className: 'perception-precision-error', role: 'alert' }, format(t('setting_invalid', 'Use a number from {min} to {max}, in steps of {step}. The drawing has not changed.'), bounds)));
  }
  function PerceptionLab(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, state = normalize((ctx.toolData || {}).perceptionLab), meta = experiment(state.experiment), model = state.models[meta.id];
    var experimentThumbnails = React.useMemo(function () {
      function miniature(item, key) { if (typeof item === 'string') return item; var attrs = { key: key }; Object.keys(item.props).forEach(function (name) { if (name.indexOf('data-') !== 0) attrs[name] = item.props[name]; }); return h(item.tag, attrs, item.children.map(function (child, index) { return miniature(child, key + '-' + index); })); }
      return EXPERIMENTS.map(function (item) { return h('svg', { key: item.id, className: 'perception-experiment-thumbnail', viewBox: '0 0 800 480', 'aria-hidden': true, focusable: 'false', 'data-perception-thumbnail': item.id }, scene(item.id, normalizeModel(item.id, {})).map(miniature)); });
    }, []);
    function t(key, fallback) { var value; try { value = typeof ctx.t === 'function' ? ctx.t('stem.perception.' + key, fallback) : fallback; } catch (_) {} return typeof value === 'string' && value !== 'stem.perception.' + key ? value : fallback; }
    var uid = React.useId(), stageRef = React.useRef(null), statusPair = React.useState(''), status = statusPair[0], setStatus = statusPair[1];
    var deletedPair = React.useState(null), deleted = deletedPair[0], setDeleted = deletedPair[1];
    var groupDeletePair = React.useState(null), groupDelete = groupDeletePair[0], setGroupDelete = groupDeletePair[1], groupDeleteSelection = React.useRef(null), groupDeleteFocus = React.useRef(false), groupDeleteFocusWithin = React.useRef(false);
    var finderPair = React.useState({}), finderFilters = finderPair[0], setFinderFilters = finderPair[1];
    var previewPair = React.useState({}), previewOptions = previewPair[0], setPreviewOptions = previewPair[1];
    var viewerPair = React.useState(null), viewer = viewerPair[0], setViewer = viewerPair[1], viewerRef = React.useRef(null), viewerReturn = React.useRef(null), pairedViewerLatest = React.useRef(null), recordedCameraLatest = React.useRef(null), recordedCameraDrag = React.useRef(null), recordedInspectFocus = React.useRef(null);
    var observationSource = React.useRef(ctx), observationSession = React.useRef(null); observationSource.current = ctx;
    var focusPair = React.useState(null), focusSession = focusPair[0], setFocusSession = focusPair[1], focusRef = React.useRef(null), focusReturn = React.useRef(false);
    var focusBrowse = React.useRef(null), focusBrowseReturn = React.useRef(''), focusBrowsePair = React.useState(false), focusBrowseBusy = focusBrowsePair[0], setFocusBrowseBusy = focusBrowsePair[1];
    var layoutPair = React.useState('auto'), comparisonLayout = layoutPair[0], setComparisonLayout = layoutPair[1];
    var slidePair = React.useState({ identity: '', position: 50 }), slideSession = slidePair[0], setSlideSession = slidePair[1], slideStageRef = React.useRef(null), slideDrag = React.useRef(null);
    var cameraPair = React.useState({ identity: '', zoom: 1, x: .5, y: .5, pan: false, open: false }), cameraSession = cameraPair[0], setCameraSession = cameraPair[1], cameraDrag = React.useRef(null), cameraLatest = React.useRef(null);
    var switchPair = React.useState(''), pinnedViewIdentity = switchPair[0], setPinnedViewIdentity = switchPair[1];
    var contextPair = React.useState(null), contextSession = contextPair[0], setContextSession = contextPair[1], contextReturn = React.useRef(false);
    var inquiryPair = React.useState(null), inquirySession = inquiryPair[0], setInquirySession = inquiryPair[1];
    var inquirySettingPair = React.useState(''), inquirySetting = inquirySettingPair[0], setInquirySetting = inquirySettingPair[1];
    var inquiryOpenPair = React.useState(false), inquiryOpen = inquiryOpenPair[0], setInquiryOpen = inquiryOpenPair[1];
    var inquiryBusyPair = React.useState(false), inquiryBusy = inquiryBusyPair[0], setInquiryBusy = inquiryBusyPair[1], inquiryRequest = React.useRef(null), inquiryReturn = React.useRef(false), inquiryFocus = React.useRef(false);
    var inquiryReportSession = React.useRef(null);
    var inquiryNavigationPair = React.useState(null), inquiryNavigation = inquiryNavigationPair[0], setInquiryNavigation = inquiryNavigationPair[1];
    var matchStartPair = React.useState(false), matchStartBusy = matchStartPair[0], setMatchStartBusy = matchStartPair[1], matchStart = React.useRef(null), matchStartFocus = React.useRef(null);
    var pngPair = React.useState(false), pngBusy = pngPair[0], setPNGBusy = pngPair[1], pngTask = React.useRef(null);
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
    function change(values) { if (focusBrowse.current || matchStart.current || inquiryRequest.current) return; update(function (next) { next.models[meta.id] = normalizeModel(meta.id, Object.assign({}, next.models[meta.id], values)); return next; }); }
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
    function selectExperiment(id) { if (experiment(id).id !== meta.id) { inquiryReportSession.current = null; setInquirySession(null); } cancelMatchStart(); stop(); endStudy(true); setStatus(''); update(function (next) { next.experiment = experiment(id).id; return next; }); }
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
    function cameraReady() {
      var latest = cameraLatest.current;
      return studyAlive.current && latest && latest.identity === cameraIdentity && latest.profile === ctx.activeProfileId && latest.enabled && !studyBusyRef.current && !importBusyRef.current && !focusBrowse.current && !matchStart.current && !inquiryRequest.current;
    }
    function setCameraView(patch) {
      if (!cameraReady()) return;
      setCameraSession(function (previous) {
        if (!cameraReady()) return previous;
        var base = previous.identity === cameraIdentity ? previous : { zoom: 1, x: .5, y: .5, pan: false, open: false }, next = Object.assign({}, base, patch), zoom = [1, 1.5, 2, 3].indexOf(next.zoom) >= 0 ? next.zoom : 1, edge = .5 / zoom;
        return { identity: cameraIdentity, zoom: zoom, x: zoom === 1 ? .5 : Math.max(edge, Math.min(1 - edge, Number.isFinite(next.x) ? next.x : .5)), y: zoom === 1 ? .5 : Math.max(edge, Math.min(1 - edge, Number.isFinite(next.y) ? next.y : .5)), pan: zoom > 1 && !!next.pan, open: !!next.open };
      });
    }
    function cancelCameraDrag() {
      var drag = cameraDrag.current; cameraDrag.current = null;
      if (drag && drag.target && typeof drag.target.hasPointerCapture === 'function' && drag.target.hasPointerCapture(drag.pointer)) { try { drag.target.releasePointerCapture(drag.pointer); } catch (_) {} }
    }
    function fitCamera() { cancelCameraDrag(); setCameraView({ zoom: 1, x: .5, y: .5, pan: false }); }
    function nudgeCamera(direction, faster) {
      if (camera.zoom <= 1 || !cameraReady()) return;
      cancelCameraDrag();
      var step = (faster ? .3 : .1) / camera.zoom;
      if (direction === 'center') setCameraView({ x: .5, y: .5 });
      else setCameraView({ x: camera.x + (direction === 'left' ? -step : direction === 'right' ? step : 0), y: camera.y + (direction === 'up' ? -step : direction === 'down' ? step : 0) });
    }
    function moveCameraPointer(event) {
      var drag = cameraDrag.current;
      if (!drag || drag.pointer !== event.pointerId) return;
      if (!drag.target.isConnected || drag.identity !== cameraIdentity || drag.zoom !== camera.zoom || drag.kind !== 'overview' && !camera.pan || !cameraReady()) { cancelCameraDrag(); return; }
      var rect = drag.target.getBoundingClientRect();
      // A changed viewport invalidates the pointer's starting coordinate frame.
      if (['left', 'top', 'width', 'height'].some(function (key) { return Math.abs(rect[key] - drag.rect[key]) > 1; })) { cancelCameraDrag(); return; }
      if (drag.kind === 'overview') setCameraView({ x: (event.clientX - drag.rect.left) / drag.rect.width - drag.offsetX, y: (event.clientY - drag.rect.top) / drag.rect.height - drag.offsetY });
      else setCameraView({ x: drag.x - (event.clientX - drag.clientX) / (drag.rect.width * drag.zoom), y: drag.y - (event.clientY - drag.clientY) / (drag.rect.height * drag.zoom) });
    }
    function startCameraDrag(event) {
      if (!cameraReady() || camera.zoom <= 1 || !camera.pan || event.button !== 0 || event.isPrimary === false || cameraDrag.current || slideDrag.current || event.target.closest && event.target.closest('[data-perception-slide-drag]')) return;
      var rect = event.currentTarget.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return;
      event.preventDefault();
      cameraDrag.current = { pointer: event.pointerId, target: event.currentTarget, identity: cameraIdentity, zoom: camera.zoom, x: camera.x, y: camera.y, clientX: event.clientX, clientY: event.clientY, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
      if (typeof event.currentTarget.setPointerCapture === 'function') { try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {} }
      event.currentTarget.focus({ preventScroll: true });
    }
    function cancelCameraPointer(event) { if (cameraDrag.current && cameraDrag.current.pointer === event.pointerId) cancelCameraDrag(); }
    function finishCameraPointer(event) { if (cameraDrag.current && cameraDrag.current.pointer === event.pointerId) { moveCameraPointer(event); cancelCameraDrag(); } }
    function cameraKeyDown(event) {
      if (event.target !== event.currentTarget || event.ctrlKey || event.altKey || event.metaKey || camera.zoom <= 1 || !cameraReady()) return;
      var direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
      if (direction) { event.preventDefault(); event.stopPropagation(); nudgeCamera(direction, event.shiftKey); }
      else if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); fitCamera(); }
      else if (event.key === 'Escape' && (camera.pan || cameraDrag.current)) { event.preventDefault(); event.stopPropagation(); cancelCameraDrag(); setCameraView({ pan: false }); }
    }
    function startCameraOverview(event) {
      if (!cameraReady() || camera.zoom <= 1 || !camera.open || event.button !== 0 || event.isPrimary === false || cameraDrag.current || slideDrag.current) return;
      var rect = event.currentTarget.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return;
      var x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height, edge = .5 / camera.zoom;
      var inside = Math.abs(x - camera.x) <= edge && Math.abs(y - camera.y) <= edge;
      event.preventDefault();
      cameraDrag.current = { kind: 'overview', pointer: event.pointerId, target: event.currentTarget, identity: cameraIdentity, zoom: camera.zoom, offsetX: inside ? x - camera.x : 0, offsetY: inside ? y - camera.y : 0, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
      if (typeof event.currentTarget.setPointerCapture === 'function') { try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {} }
      event.currentTarget.focus({ preventScroll: true });
      if (!inside) setCameraView({ x: x, y: y });
    }
    function cameraOverviewKeyDown(event) {
      if (event.key === 'Home' && !event.ctrlKey && !event.altKey && !event.metaKey && cameraReady()) {
        event.preventDefault(); event.stopPropagation(); fitCamera();
        var target = document.getElementById(uid + '-camera-zoom'); if (target) target.focus({ preventScroll: true });
      } else cameraKeyDown(event);
    }
    function drawingOverview() {
      if (!camera.open || camera.zoom <= 1) return null;
      var windowRect = { x: (camera.x - .5 / camera.zoom) * 800, y: (camera.y - .5 / camera.zoom) * 480, width: 800 / camera.zoom, height: 480 / camera.zoom, fill: 'none', vectorEffect: 'non-scaling-stroke' };
      return h('figure', { className: 'perception-camera-overview' },
        h('figcaption', null, t('camera_overview_title', 'Current drawing overview')),
        button(h('svg', { 'data-perception-camera-overview-svg': true, viewBox: '0 0 800 480', 'aria-hidden': true, focusable: 'false' },
          h('g', { 'data-perception-camera-overview-scene': true }, scene(meta.id, activeModel, t).map(renderNode)),
          h('rect', Object.assign({}, windowRect, { 'data-perception-camera-window': true, stroke: '#102a3a', strokeWidth: 4 })),
          h('rect', Object.assign({}, windowRect, { stroke: '#fff', strokeWidth: 2 }))), function (event) { if (event.detail === 0) nudgeCamera('center'); },
          { className: 'perception-camera-overview-map', 'data-perception-camera-overview': true, 'aria-label': t('camera_overview_label', 'Navigate current drawing overview'), 'aria-describedby': uid + '-camera-overview-hint ' + uid + '-camera-overview-position', disabled: !cameraEnabled, onPointerDown: startCameraOverview, onPointerMove: moveCameraPointer, onPointerUp: finishCameraPointer, onPointerCancel: cancelCameraPointer, onLostPointerCapture: cancelCameraPointer, onKeyDown: cameraOverviewKeyDown }),
        h('p', { id: uid + '-camera-overview-position', className: 'perception-camera-overview-position', 'data-perception-camera-overview-position': true }, format(t('camera_overview_position', 'View center: {horizontal}% across · {vertical}% down'), { horizontal: Math.round(camera.x * 100), vertical: Math.round(camera.y * 100) })),
        h('p', { id: uid + '-camera-overview-hint' }, t('camera_overview_hint', 'Select a spot or drag the outlined window. Arrow keys move it; Enter centers; Home fits.')));
    }
    function cameraViewportProps(key, label) {
      return { className: 'perception-camera-viewport', 'data-perception-camera-viewport': key, 'data-camera-zoom': camera.zoom, 'data-camera-x': camera.x, 'data-camera-y': camera.y, 'data-pan-mode': camera.pan, tabIndex: camera.zoom > 1 && cameraEnabled ? 0 : undefined, role: camera.zoom > 1 ? 'region' : undefined,
        'aria-label': camera.zoom > 1 ? format(t('camera_viewport', '{view}, {percent}% drawing inspection'), { view: label, percent: camera.zoom * 100 }) : undefined, 'aria-describedby': camera.zoom > 1 ? uid + '-camera-pan-hint ' + uid + '-camera-crop-hint' : undefined,
        onPointerDown: startCameraDrag, onPointerMove: moveCameraPointer, onPointerUp: finishCameraPointer, onPointerCancel: cancelCameraPointer, onLostPointerCapture: cancelCameraPointer, onKeyDown: cameraKeyDown };
    }
    function cameraLayer(id, settings, reference) {
      return h('div', { className: 'perception-camera-layer', 'data-perception-camera-layer': reference ? 'reference' : 'current', style: { transform: 'translate(' + ((.5 - camera.zoom * camera.x) * 100).toFixed(5) + '%, ' + ((.5 - camera.zoom * camera.y) * 100).toFixed(5) + '%) scale(' + camera.zoom + ')' } }, drawingSVG(id, settings, reference));
    }
    function cameraBadge() { return camera.zoom > 1 && h('small', { className: 'perception-camera-badge', 'aria-hidden': true }, format(t('camera_magnified_label', '{percent}% inspection'), { percent: camera.zoom * 100 })); }
    function cameraIcon(direction) {
      var paths = { left: 'M19 12H5m7-7-7 7 7 7', right: 'M5 12h14m-7-7 7 7-7 7', up: 'M12 19V5m-7 7 7-7 7 7', down: 'M12 5v14m-7-7 7 7 7-7', center: 'M12 2v4m0 12v4M2 12h4m12 0h4' };
      return h('svg', { viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true, focusable: 'false', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: paths[direction] }), direction === 'center' && h('circle', { cx: 12, cy: 12, r: 3 }));
    }
    function drawingInspectionTools() {
      var edge = .5 / camera.zoom;
      return h('section', { className: 'perception-inspector', id: uid + '-drawing-inspector', 'data-perception-inspector': true, hidden: !camera.open, 'aria-label': t('camera_controls', 'Drawing inspection') },
        h('div', { className: 'perception-inspector-controls' },
          h('label', { className: 'perception-field', htmlFor: uid + '-camera-zoom' }, h('span', null, t('camera_zoom', 'Drawing zoom')), h('select', { id: uid + '-camera-zoom', 'data-perception-camera-zoom': true, value: camera.zoom, disabled: !cameraEnabled, onChange: function (event) { cancelCameraDrag(); setCameraView({ zoom: Number(event.target.value) }); } }, [1, 1.5, 2, 3].map(function (zoom) { return h('option', { key: zoom, value: zoom }, zoom === 1 ? t('camera_fit_short', 'Fit') : zoom * 100 + '%'); }))),
          button(t('camera_fit', 'Fit whole drawing'), fitCamera, { 'data-perception-camera-fit': true, disabled: !cameraEnabled || camera.zoom === 1 }),
          button(t('camera_pan', 'Pan drawing'), function () { cancelCameraDrag(); setCameraView({ pan: !camera.pan }); }, { 'data-perception-camera-pan': true, 'aria-pressed': camera.pan, disabled: !cameraEnabled || camera.zoom <= 1, 'aria-describedby': uid + '-camera-pan-hint' })),
        camera.zoom > 1 && h('div', { className: 'perception-camera-navigation-row' }, drawingOverview(), h('div', { className: 'perception-camera-navigation', role: 'group', 'aria-label': t('camera_navigation', 'Move viewing window'), dir: 'ltr' }, ['up', 'left', 'center', 'right', 'down'].map(function (direction) {
          var labels = { left: t('camera_look_left', 'Look left'), right: t('camera_look_right', 'Look right'), up: t('camera_look_up', 'Look up'), down: t('camera_look_down', 'Look down'), center: t('camera_center', 'Center view') };
          var atEdge = direction === 'left' ? camera.x <= edge + 1e-8 : direction === 'right' ? camera.x >= 1 - edge - 1e-8 : direction === 'up' ? camera.y <= edge + 1e-8 : direction === 'down' ? camera.y >= 1 - edge - 1e-8 : false;
          return button(cameraIcon(direction), function () { nudgeCamera(direction); }, { key: direction, 'data-perception-camera-move': direction, 'aria-label': labels[direction], title: labels[direction], disabled: !cameraEnabled || atEdge });
        }))),
        h('p', { id: uid + '-camera-pan-hint' }, t('camera_pan_hint', 'Turn on Pan drawing to drag. You can also focus a magnified drawing and use Arrow keys; Home fits the whole drawing. Escape turns panning off.')),
        h('p', { id: uid + '-camera-crop-hint' }, t('camera_hint', 'Magnification crops the visible surroundings. Return to Fit whole drawing before comparing your impression. Drawing exports keep the complete current image.')),
        hasComparison && h('p', { className: 'perception-camera-linked' }, t('camera_linked_hint', 'Both drawings use the same magnification and viewing position.')));
    }
    function drawingSVG(id, settings, reference) {
      var data = experiment(id), titleId = uid + (reference ? '-ref-title' : '-title'), descId = uid + (reference ? '-ref-desc' : '-desc');
      return h('svg', { ref: reference ? undefined : stageRef, className: 'perception-svg', id: reference ? 'perception-stage-reference' : 'perception-stage-current', viewBox: '0 0 800 480', xmlns: 'http://www.w3.org/2000/svg', role: 'img', 'aria-labelledby': titleId + ' ' + descId },
        h('title', { id: titleId }, t(id + '_title', data.title)), h('desc', { id: descId }, descriptionText(id, settings)), scene(id, settings, t).map(renderNode));
    }
    function figure(id, settings, reference, heading) {
      var data = experiment(id);
      return h('figure', { className: 'perception-figure' },
        h('figcaption', null, h('strong', { id: reference ? undefined : uid + '-current-view', tabIndex: reference ? undefined : -1 }, heading || (reference ? t('pinned_reference', 'Pinned comparison') : t('current_experiment', 'Current experiment'))), h('span', null, heading ? (reference ? t('live_comparison', 'Live comparison') : t('current_experiment', 'Current experiment')) + ' · ' : '', t(id + '_title', data.title))),
        cameraBadge(), h('div', cameraViewportProps(reference ? 'reference' : 'current', heading || (reference ? t('pinned_reference', 'Pinned comparison') : t('current_experiment', 'Current experiment'))), cameraLayer(id, settings, reference)));
    }
    function save() {
      if (studyLocked || studyBusyRef.current || matchStart.current || inquiryRequest.current) return;
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
    function download(blob, filename, valid) {
      var url, anchor, clicked = false;
      try {
        if (valid && !valid()) return false;
        url = URL.createObjectURL(blob); if (valid && !valid()) return false;
        anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
        document.body.appendChild(anchor); if (valid && !valid()) return false;
        anchor.click(); clicked = true;
      } finally {
        if (anchor) anchor.remove();
        if (url) { if (clicked) window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000); else URL.revokeObjectURL(url); }
      }
      return clicked;
    }
    function exportDrawingMarkup() {
      if (!stageRef.current) return null;
      var svg = stageRef.current.cloneNode(true); svg.setAttribute('width', '800'); svg.setAttribute('height', '480'); svg.removeAttribute('class'); svg.removeAttribute('xmlns'); svg.setAttribute('style', 'background:#fff;overflow:hidden');
      return new XMLSerializer().serializeToString(svg);
    }
    function disposePNG(run) {
      if (run.timeout !== null) window.clearTimeout(run.timeout);
      if (run.image) { run.image.onload = null; run.image.onerror = null; run.image.removeAttribute('src'); }
      if (run.url) URL.revokeObjectURL(run.url);
      if (run.canvas) { run.canvas.width = 0; run.canvas.height = 0; }
    }
    function cancelPNG() { var run = pngTask.current; pngTask.current = null; if (run) disposePNG(run); }
    function finishPNG(run, message) {
      if (pngTask.current !== run) return;
      cancelPNG(); setPNGBusy(false); announce(message);
    }
    function exportPNG() {
      if (pngTask.current || studyBusyRef.current || matchStart.current || inquiryRequest.current || activeStudy && !activeStudy.revealed || !stageRef.current) return;
      var run = { profile: ctx.activeProfileId, experiment: meta.id, image: null, canvas: null, url: null, timeout: null };
      pngTask.current = run; setPNGBusy(true);
      function failed() { finishPNG(run, t('export_unavailable', 'Export could not be created. Try again.')); }
      try {
        var markup = exportDrawingMarkup();
        run.url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
        run.image = new window.Image();
        run.image.onerror = failed;
        run.image.onload = function () {
          if (pngTask.current !== run) return;
          try {
            var canvas = document.createElement('canvas'); run.canvas = canvas; canvas.width = 2400; canvas.height = 1440;
            var context = canvas.getContext('2d'); if (!context) { failed(); return; }
            context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(run.image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(function (blob) {
              if (pngTask.current !== run) return;
              if (!blob || blob.type !== 'image/png') { failed(); return; }
              try { download(blob, 'perception-' + run.experiment + '.png'); finishPNG(run, t('png_exported', 'Current experiment exported as a 2400 × 1440 PNG.')); }
              catch (_) { failed(); }
            }, 'image/png');
          } catch (_) { failed(); }
        };
        run.timeout = window.setTimeout(failed, 15000);
        run.image.src = run.url;
      } catch (_) { failed(); }
    }
    React.useEffect(function () { return cancelPNG; }, []);
    React.useEffect(function () {
      var run = pngTask.current;
      if (run && (run.profile !== ctx.activeProfileId || run.experiment !== meta.id || studyBusy || activeStudy && !activeStudy.revealed)) { cancelPNG(); setPNGBusy(false); }
    }, [ctx.activeProfileId, meta.id, studyBusy, activeStudy && activeStudy.revealed]);
    function exportSVG() {
      if (matchStart.current || inquiryRequest.current) return;
      try {
        var markup = exportDrawingMarkup(); if (!markup) return;
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
    function observationImpression(record) {
      var data = experiment(record.experiment), settings = record.model;
      return settings.prediction ? t(data.id + '_choice_' + data.choices.indexOf(settings.prediction), settings.prediction) : t('not_recorded', 'Not recorded');
    }
    function observationSettings(record) {
      var data = experiment(record.experiment), settings = record.model, keys = data.controls.map(function (control) { return control.key; }).concat(['matching', 'context']);
      if (data.cue) keys.push('cue'); if (settings.matching) keys.push('swap', 'matchValue'); keys.push('reveal');
      return keys.map(function (key) { return { key: key, label: comparisonLabel(key, data.id), value: comparisonValue(key, settings[key], settings, data.id) }; });
    }
    function observationResult(record) {
      return record.model.reveal ? resultText(record.experiment, record.model) : t('saved_values_hidden', 'Measurement guides and drawing values were hidden when this observation was saved.');
    }
    function observationReportDocument(plan) {
      var record = plan.record, data = experiment(record.experiment), title = t('observation_report_title', 'Perception Lab · observation report') + ' · ' + t(data.id + '_title', data.title);
      var report = document.implementation.createHTMLDocument(title), root = report.documentElement;
      root.lang = text(document.documentElement.lang, 64) || 'en'; if (document.documentElement.dir === 'rtl') root.dir = 'rtl';
      function element(tag, parent, value, attrs) {
        var item = report.createElement(tag); if (value !== undefined && value !== null) item.textContent = String(value);
        Object.keys(attrs || {}).forEach(function (key) { item.setAttribute(key, String(attrs[key])); }); parent.appendChild(item); return item;
      }
      var charset = element('meta', report.head, null, { charset: 'utf-8' }); report.head.insertBefore(charset, report.head.firstChild);
      element('meta', report.head, null, { name: 'viewport', content: 'width=device-width,initial-scale=1' });
      element('meta', report.head, null, { 'http-equiv': 'Content-Security-Policy', content: "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" });
      element('style', report.head, [
        'html{color-scheme:light;background:#edf3f5}*{box-sizing:border-box}body{font-family:system-ui,sans-serif;color:#163449;background:#fff;margin:32px auto;padding:clamp(20px,4vw,48px);max-width:1120px;line-height:1.55;overflow-wrap:anywhere;border:1px solid #bccfd7;border-radius:16px}h1,h2{line-height:1.25}h1{font-size:2rem;letter-spacing:-.025em;margin:8px 0 16px}h2{font-size:1.125rem;margin:0 0 12px}p{margin:10px 0}a{color:#15566c}header{padding-bottom:20px;border-bottom:3px solid #15566c}.observation-report-eyebrow{font-size:.75rem;font-weight:750;letter-spacing:.06em;color:#425c6c;margin:0}.observation-report-section{margin-top:24px}.observation-report-date{font-size:.8125rem;color:#425c6c}.observation-report-mode{display:inline-block;margin:0 0 12px;padding:4px 10px;border:1px solid #bccfd7;border-radius:6px;background:#f1f7f9;font-size:.8125rem;font-weight:650}.observation-report-help{font-size:.8125rem;color:#425c6c}.observation-report-result{border-inline-start:3px solid #15566c;background:#f1f7f9;padding:12px 16px;font-size:.875rem}',
        'figure{margin:0;border:1px solid #bccfd7;border-radius:10px;overflow:hidden}figcaption{font-weight:650;font-size:.8125rem;color:#425c6c;padding:10px 14px;background:#f1f7f9}svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;overflow:hidden;forced-color-adjust:none}.observation-report-details{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:16px;margin-top:24px}.observation-report-card{padding:20px;border:1px solid #bccfd7;border-radius:10px;background:#f8fafb;min-width:0}.observation-report-card h2{font-size:.8125rem;color:#425c6c}.observation-report-impression{font-size:1.25rem;font-weight:700;line-height:1.35}.observation-report-note{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.9375rem}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.875rem;margin:0}caption{text-align:start;font-weight:700;font-size:1.125rem;line-height:1.25;margin-bottom:16px}th,td{padding:10px 12px;text-align:start;vertical-align:top;border-bottom:1px solid #bccfd7;overflow-wrap:anywhere}th:first-child{width:45%}thead{display:table-header-group;background:#edf3f5}tbody tr:nth-child(even){background:#f8fafb}footer{border-top:1px solid #bccfd7;padding-top:16px;font-size:.8125rem;color:#425c6c}',
        '@media(max-width:700px){html{background:#fff}body{padding:20px 16px;margin:0;border:0;border-radius:0}h1{font-size:1.5rem}.observation-report-details{grid-template-columns:1fr}.observation-report-card{padding:16px}th,td{padding:10px 6px}}@media(forced-colors:active){html,body{color:CanvasText;background:Canvas}body,header,figure,.observation-report-card,.observation-report-mode,.observation-report-result,footer,th,td{border-color:CanvasText}a{color:LinkText}}@page{margin:14mm}@media print{html{background:#fff}body{padding:0;margin:0;max-width:none;border:0;border-radius:0;font-size:10pt;color:#000;background:#fff;forced-color-adjust:none}header{padding-bottom:12px}h1{font-size:20pt;margin:6px 0 10px}h2,caption{font-size:12pt}figure{break-inside:avoid;page-break-inside:avoid}svg{max-height:95mm}.observation-report-section{margin-top:18px}.observation-report-details{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:12px;margin-top:16px}.observation-report-card{padding:12px;break-inside:avoid;page-break-inside:avoid}.observation-report-card,.observation-report-result,.observation-report-mode,figcaption,thead,tbody tr:nth-child(even){background:#fff}.observation-report-impression{font-size:12pt}.observation-report-note{font-size:10pt}.observation-report-help{display:none}table{font-size:9pt}th,td{padding:5px 8px}tr{break-inside:avoid}a{color:inherit}}'
      ].join('\n'));
      var main = element('main', report.body, null, { 'data-perception-observation-report-document': data.id }), header = element('header', main);
      element('p', header, t('observation_report_title', 'Perception Lab · observation report'), { class: 'observation-report-eyebrow' });
      element('h1', header, t(data.id + '_title', data.title));
      element('p', header, (record.model.matching ? t('match_by_eye', 'Match by eye') : t('observe', 'Observe')) + ' · ' + (record.model.reveal ? t('observation_guides_shown', 'Measurements shown') : t('observation_guides_hidden', 'Measurements hidden')), { class: 'observation-report-mode' });
      var created = new Date(), createdLine = element('p', header, t('report_created', 'Report created') + ': ', { class: 'observation-report-date' }); element('time', createdLine, created.toLocaleString(), { datetime: created.toISOString() });
      var saved = new Date(record.date), savedLine = element('p', header, t('saved_date_label', 'Observation saved') + ': ', { class: 'observation-report-date', 'data-perception-observation-report-date': true });
      if (Number.isFinite(saved.getTime())) element('time', savedLine, saved.toLocaleString(), { datetime: saved.toISOString() }); else savedLine.appendChild(report.createTextNode(t('saved_date_unavailable', 'Saved date unavailable')));
      var drawing = element('section', main, null, { class: 'observation-report-section', 'aria-label': t('recorded_drawing', 'Recorded drawing') });
      var figure = element('figure', drawing); element('figcaption', figure, t('recorded_drawing', 'Recorded drawing'));
      var svgNames = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', textAnchor: 'text-anchor', fontSize: 'font-size', fontFamily: 'font-family', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity' };
      function svgNode(item, parent) {
        if (typeof item === 'string') { parent.appendChild(report.createTextNode(item)); return; }
        var child = report.createElementNS('http://www.w3.org/2000/svg', item.tag);
        Object.keys(item.props).forEach(function (key) { child.setAttribute(svgNames[key] || key, String(item.props[key])); }); parent.appendChild(child); item.children.forEach(function (entry) { svgNode(entry, child); });
      }
      var svg = report.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 800 480'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-labelledby', 'observation-report-title observation-report-desc'); svg.setAttribute('data-perception-observation-report-drawing', record.id); figure.appendChild(svg);
      svgNode(node('title', { id: 'observation-report-title' }, [t(data.id + '_title', data.title)]), svg); svgNode(node('desc', { id: 'observation-report-desc' }, [descriptionText(data.id, record.model)]), svg); scene(data.id, record.model, t).forEach(function (item) { svgNode(item, svg); });
      element('p', drawing, observationResult(record), { class: 'observation-report-result', 'data-perception-observation-report-result': true });
      var details = element('div', main, null, { class: 'observation-report-details' }), impression = element('section', details, null, { class: 'observation-report-card' }), note = element('section', details, null, { class: 'observation-report-card' });
      element('h2', impression, t('recorded_impression', 'Recorded impression')); element('p', impression, observationImpression(record), { class: 'observation-report-impression', 'data-perception-observation-report-impression': true });
      element('h2', note, t('observation_note', 'Observation note')); element('p', note, record.model.note || t('not_recorded', 'Not recorded'), { class: 'observation-report-note', 'data-perception-observation-report-note': true });
      var settings = element('section', main, null, { class: 'observation-report-section', 'aria-label': t('saved_settings_label', 'Saved drawing settings') });
      var table = element('table', settings, null, { 'data-perception-observation-report-settings': true }); element('caption', table, t('saved_settings_label', 'Saved drawing settings'));
      var head = element('tr', element('thead', table)); element('th', head, t('setting_label', 'Setting'), { scope: 'col' }); element('th', head, t('saved_value_label', 'Saved value'), { scope: 'col' });
      var body = element('tbody', table); observationSettings(record).forEach(function (row) { var line = element('tr', body, null, { 'data-perception-observation-report-setting': row.key }); element('th', line, row.label, { scope: 'row' }); element('td', line, row.value); });
      var footer = element('footer', main, null, { class: 'observation-report-section' }); element('p', footer, t('observation_report_interpretation', 'This report records one saved drawing and impression. It does not summarize a repeated study. Viewing size and displays can affect the impression.'));
      element('p', footer, t('observation_report_print_hint', 'Open this file in a browser to read or print. This report preserves the saved drawing, settings, and observation.'), { class: 'observation-report-help' });
      element('a', footer, t('reference', 'Scientific reference: Michael Bach'), { href: data.source, target: '_blank', rel: 'noopener noreferrer' });
      return '<!doctype html>\n' + root.outerHTML;
    }
    function currentObservationPlan() {
      var source = observationSource.current;
      if (!viewer || !viewer.recordId || observationSession.current !== viewer || !studyAlive.current || viewer.profile !== importProfile.current || source.activeProfileId !== viewer.profile || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return null;
      var plan = planObservationReview((source.toolData || {}).perceptionLab, viewer.recordId);
      return plan.status === 'ready' && plan.identity === viewer.identity ? plan : null;
    }
    function exportObservationReport() {
      var plan = currentObservationPlan(); if (!plan) return;
      try {
        var blob = new Blob([observationReportDocument(plan)], { type: 'text/html;charset=utf-8' });
        var exported = download(blob, 'perception-observation-' + plan.record.experiment + '.html', function () { var latest = currentObservationPlan(); return !!latest && latest.identity === plan.identity; });
        if (viewer.profile === importProfile.current && studyAlive.current) announce(exported ? t('observation_report_exported', 'Observation report exported as HTML. Open it in a browser to read or print.') : t('observation_review_expired', 'The saved observation changed or is no longer available. Open its review again.'));
      } catch (_) { if (viewer.profile === importProfile.current && studyAlive.current) announce(t('observation_report_unavailable', 'The observation report could not be created. Try again.')); }
    }
    function inquiryReportDocument(plan) {
      var data = experiment(plan.experiment), title = t('inquiry_report_title', 'Perception Lab · inquiry report') + ' · ' + t(data.id + '_title', data.title);
      var report = document.implementation.createHTMLDocument(title), root = report.documentElement;
      root.lang = text(document.documentElement.lang, 64) || 'en'; if (document.documentElement.dir === 'rtl') root.dir = 'rtl';
      function element(tag, parent, value, attrs) {
        var item = report.createElement(tag); if (value !== undefined && value !== null) item.textContent = String(value);
        Object.keys(attrs || {}).forEach(function (key) { item.setAttribute(key, String(attrs[key])); }); parent.appendChild(item); return item;
      }
      var charset = element('meta', report.head, null, { charset: 'utf-8' }); report.head.insertBefore(charset, report.head.firstChild);
      element('meta', report.head, null, { name: 'viewport', content: 'width=device-width,initial-scale=1' });
      element('meta', report.head, null, { 'http-equiv': 'Content-Security-Policy', content: "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" });
      element('style', report.head, [
        'html{color-scheme:light}*{box-sizing:border-box}body{font-family:system-ui,sans-serif;color:#163449;background:#fff;margin:0 auto;padding:24px;max-width:1200px;line-height:1.5;overflow-wrap:anywhere}h1,h2,h3{line-height:1.3}h1{font-size:1.75rem}h2{font-size:1.3rem}h3{font-size:1rem}p{margin:8px 0}a{color:#15566c}header,footer{margin-bottom:24px}.inquiry-report-section{margin-top:24px;border-top:2px solid #627785;padding-top:16px}',
        'table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.875rem;margin:16px 0}caption{text-align:start;font-weight:700;margin-bottom:8px}th,td{padding:8px;border-bottom:1px solid #bccfd7;text-align:start;vertical-align:top;overflow-wrap:anywhere}thead{display:table-header-group}th:first-child{width:40%}.inquiry-report-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.inquiry-report-view{min-width:0;border:1px solid #bccfd7;border-radius:8px;padding:16px}.inquiry-report-view figure{margin:12px 0}.inquiry-report-view figcaption{font-weight:700;margin-bottom:8px}.inquiry-report-view svg{display:block;width:100%;height:auto;aspect-ratio:5/3;background:#fff;overflow:hidden;forced-color-adjust:none}.inquiry-report-note{white-space:pre-wrap;overflow-wrap:anywhere}.inquiry-report-warning{border-left:3px solid #9a3412;padding:8px 12px}.inquiry-report-created{font-size:.875rem}',
        '@media(max-width:760px){body{padding:16px}.inquiry-report-pair{grid-template-columns:1fr}.inquiry-report-view{padding:12px}}@media(forced-colors:active){body{color:CanvasText;background:Canvas}.inquiry-report-section,.inquiry-report-view,th,td,.inquiry-report-warning{border-color:CanvasText}a{color:LinkText}}@page{margin:14mm}@media print{body{padding:0;max-width:none;font-size:10pt;color:#000;background:#fff;forced-color-adjust:none}h1{font-size:18pt}h2{font-size:14pt}h3{font-size:11pt}table{font-size:9pt}th,td{padding:5px}.inquiry-report-pair{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.inquiry-report-view{padding:8px;font-size:9pt}.inquiry-report-view figure{break-inside:avoid;page-break-inside:avoid}.inquiry-report-section,.inquiry-report-view,th,td,.inquiry-report-warning{border-color:#627785}a{color:inherit}}'
      ].join('\n'));
      var main = element('main', report.body, null, { 'data-perception-inquiry-report-document': plan.experiment }), header = element('header', main);
      element('h1', header, title);
      var created = new Date(), createdLine = element('p', header, t('report_created', 'Report created') + ': ', { class: 'inquiry-report-created' });
      element('time', createdLine, created.toLocaleString(), { datetime: created.toISOString() });
      element('p', header, t('inquiry_report_print_hint', 'Open this file in a browser to read or print it. Both drawings and observations are fixed snapshots from this inquiry.'));
      element('p', header, t('inquiry_setting', 'Setting to explore') + ': ' + comparisonLabel(plan.selected, plan.experiment), { 'data-perception-inquiry-report-selected': plan.selected });
      element('p', header, t('inquiry_scale_hint', 'Both drawings use the same scale. The starting view keeps the settings captured at that moment.'));
      var statusText = plan.inquiryStatus === 'selected' ? format(t('inquiry_one_changed', 'One drawing setting changed: {setting}.'), { setting: comparisonLabel(plan.selected, plan.experiment) }) : plan.inquiryStatus === 'other' ? t('inquiry_other_changed', 'A different setting changed. To explore your chosen setting, return the other setting to its starting value.') : plan.inquiryStatus === 'multiple' ? format(t('inquiry_many_changed', '{count} drawing settings changed. Compare one setting at a time to separate their effects.'), { count: plan.changes.length }) : t('inquiry_report_none_changed', 'No drawing settings changed between these snapshots.');
      element('p', header, statusText, { 'data-perception-inquiry-report-status': plan.inquiryStatus, 'data-count': plan.changes.length });
      var pair = element('section', main, null, { class: 'inquiry-report-section' }); element('h2', pair, t('inquiry_report_drawings', 'Starting and current drawings'));
      var views = element('div', pair, null, { class: 'inquiry-report-pair' });
      var svgNames = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', textAnchor: 'text-anchor', fontSize: 'font-size', fontFamily: 'font-family', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity' };
      function svgNode(item, parent) {
        if (typeof item === 'string') { parent.appendChild(report.createTextNode(item)); return; }
        var child = report.createElementNS('http://www.w3.org/2000/svg', item.tag);
        Object.keys(item.props).forEach(function (key) { child.setAttribute(svgNames[key] || key, String(item.props[key])); }); parent.appendChild(child); item.children.forEach(function (entry) { svgNode(entry, child); });
      }
      [['starting', plan.baseline, t('inquiry_starting_view', 'Starting view')], ['current', plan.current, t('current_experiment', 'Current experiment')]].forEach(function (entry) {
        var slot = entry[0], settings = entry[1], heading = entry[2], card = element('article', views, null, { class: 'inquiry-report-view' }); element('h3', card, heading);
        var figure = element('figure', card); element('figcaption', figure, t(data.id + '_title', data.title));
        var svg = report.createElementNS('http://www.w3.org/2000/svg', 'svg'), prefix = 'inquiry-report-' + slot;
        svg.setAttribute('viewBox', '0 0 800 480'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-labelledby', prefix + '-title ' + prefix + '-desc'); svg.setAttribute('data-perception-inquiry-report-drawing', slot); figure.appendChild(svg);
        svgNode(node('title', { id: prefix + '-title' }, [heading + ' · ' + t(data.id + '_title', data.title)]), svg); svgNode(node('desc', { id: prefix + '-desc' }, [descriptionText(data.id, settings)]), svg); scene(data.id, settings, t).forEach(function (item) { svgNode(item, svg); });
        element('p', card, t('measurements_label', 'Measurements') + ': ' + comparisonValue('reveal', settings.reveal, settings, data.id), { 'data-perception-inquiry-report-guides': slot });
        element('h3', card, slot === 'starting' ? t('inquiry_start_impression', 'Starting impression') : t('inquiry_current_impression', 'Current impression'));
        element('p', card, impressionText(settings), { 'data-perception-inquiry-report-impression': slot });
        element('h3', card, t('observation_note', 'Observation note')); element('p', card, settings.note || t('not_recorded', 'Not recorded'), { class: 'inquiry-report-note', 'data-perception-inquiry-report-note': slot });
      });
      function table(parent, caption, rows, attribute) {
        var attrs = {}; attrs[attribute] = 'true'; var grid = element('table', parent, null, attrs); element('caption', grid, caption);
        var head = element('tr', element('thead', grid)); [t('setting_label', 'Setting'), t('inquiry_starting_view', 'Starting view'), t('current_label', 'Current')].forEach(function (label) { element('th', head, label, { scope: 'col' }); });
        var body = element('tbody', grid); rows.forEach(function (row) { var line = element('tr', body, null, { 'data-perception-inquiry-report-setting': row.key }); [comparisonLabel(row.key, data.id), comparisonValue(row.key, row.before, plan.baseline, data.id), comparisonValue(row.key, row.after, plan.current, data.id)].forEach(function (value, index) { element(index ? 'td' : 'th', line, value, index ? {} : { scope: 'row' }); }); });
      }
      var settingsSection = element('section', main, null, { class: 'inquiry-report-section' }); element('h2', settingsSection, t('inquiry_report_settings', 'Drawing settings'));
      var keys = data.controls.map(function (control) { return control.key; }).concat(['context']); if (data.cue) keys.push('cue'); keys.push('reveal');
      table(settingsSection, t('inquiry_report_all_settings', 'All settings in the two snapshots'), keys.map(function (key) { return { key: key, before: plan.baseline[key], after: plan.current[key] }; }), 'data-perception-inquiry-report-settings');
      table(settingsSection, t('inquiry_changes', 'Changes from starting view'), plan.changes, 'data-perception-inquiry-report-changes');
      if (!plan.changes.length) element('p', settingsSection, t('no_settings_changed', 'No drawing settings have changed.'));
      element('p', settingsSection, t('inquiry_hidden_hint', 'The count describes drawing settings. A hidden grid or face cue may make a setting change invisible. Notes, impressions, and measurement guides are not counted.'));
      if (plan.baseline.reveal !== plan.current.reveal) element('p', settingsSection, t('inquiry_report_guides_differ', 'Measurement guide visibility also differs between the two snapshots. This difference is shown in the drawings and settings table, and is excluded from the drawing-setting count.'), { class: 'inquiry-report-warning', 'data-perception-inquiry-report-warning': 'guides' });
      var footer = element('footer', main, null, { class: 'inquiry-report-section' }); element('h2', footer, t('inquiry_report_reflection', 'Compare your impressions'));
      element('p', footer, inquiryPrompt(data.id));
      element('p', footer, t('inquiry_report_interpretation', 'These snapshots record your drawing settings and observations, not a score or proof of a general effect. A setting change may be invisible or may leave your impression unchanged. Viewing size and displays can affect what you see.'));
      element('a', footer, t('reference', 'Scientific reference: Michael Bach'), { href: data.source, target: '_blank', rel: 'noopener noreferrer' });
      return '<!doctype html>\n' + root.outerHTML;
    }
    function exportInquiryReport() {
      if (!inquiryComparing || inquiryReportSession.current !== inquirySession || !studyAlive.current || ctx.activeProfileId !== importProfile.current || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
      var current = normalize((ctx.toolData || {}).perceptionLab); if (current.experiment !== meta.id || JSON.stringify(current.models[meta.id]) !== JSON.stringify(model)) return;
      var plan = planInquiryReport(meta.id, inquirySession.model, activeModel, inquiryData.selected); if (plan.status !== 'ready') return;
      try { download(new Blob([inquiryReportDocument(plan)], { type: 'text/html;charset=utf-8' }), 'perception-' + plan.experiment + '-inquiry.html'); announce(t('inquiry_report_exported', 'Inquiry report exported as HTML. Open it in a browser to read or print.')); }
      catch (_) { announce(t('inquiry_report_unavailable', 'The inquiry report could not be created. Try again.')); }
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
      if (studyLocked || studyBusyRef.current || importBusyRef.current || matchStart.current || inquiryRequest.current) return;
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
      if (!request || !importDraft || importDraft.phase !== 'preview' || studyLocked || studyBusyRef.current || importBusyRef.current || matchStart.current || inquiryRequest.current || planNotebookImport(state, importDraft.records).status !== 'ready') return;
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
      if (!importUndo || studyLocked || studyBusyRef.current || importBusyRef.current || matchStart.current || inquiryRequest.current) return;
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
    function focusNotebook() { setControlsOpen(true); if (focusSession) { focusReturn.current = uid + '-notebook'; closeFocusedExperiment(); return; } var heading = document.getElementById(uid + '-notebook'); if (heading) heading.focus(); }
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
      if (studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
      if (model.matching === value) return;
      if (value) { requestMatchStart('enter'); return; }
      stop();
      change({ matching: false, reveal: false });
    }
    function cancelMatchStart() { matchStart.current = null; matchStartFocus.current = null; setMatchStartBusy(false); }
    function requestMatchStart(kind) {
      if (!own(MATCHING, meta.id) || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current || kind !== 'enter' && !model.matching) return;
      var values = kind === 'equalize' ? normalizeModel(meta.id, Object.assign({}, model, { matching: true, matchValue: measurements(meta.id, model).reference, reveal: false, prediction: '' })) : newMatchStart(meta.id, model, Math.random());
      var request = { kind: kind, experiment: meta.id, profile: ctx.activeProfileId, before: JSON.stringify(model), values: values, done: false };
      matchStart.current = request; matchStartFocus.current = null; setMatchStartBusy(true); setControlsOpen(true); setPinnedViewIdentity(''); announce(t('match_start_pending', 'Preparing comparison…'));
      update(function (next) {
        if (matchStart.current !== request) return next;
        var valid = studyAlive.current && request.profile === importProfile.current && next.experiment === request.experiment && JSON.stringify(next.models[request.experiment]) === request.before && !studyBusyRef.current && !importBusyRef.current && !focusBrowse.current;
        request.done = true; request.success = valid;
        if (valid) { next.models[request.experiment] = request.values; request.after = JSON.stringify(request.values); }
        return next;
      });
    }
    React.useEffect(function () {
      var request = matchStart.current;
      if (!request) return;
      var sameContext = request.profile === ctx.activeProfileId && request.experiment === meta.id;
      if (request.done || !sameContext || JSON.stringify(model) !== request.before) {
        matchStart.current = null; setMatchStartBusy(false);
        var valid = request.done && request.success && sameContext && request.after === JSON.stringify(model);
        if (valid) {
          if (!request.noFocus) matchStartFocus.current = { experiment: meta.id, profile: ctx.activeProfileId };
          announce(request.kind === 'equalize' ? t('match_equalized', 'Comparison set to equal drawing values. Your previous impression and measurement reveal are cleared.') : t('match_start_changed', 'A different starting point is ready. Make a fresh visual match, then record your impression. Drawing values stay hidden until reveal.'));
        } else announce(t('match_start_expired', 'The experiment changed before the starting point was applied. Your latest settings are kept.'));
      }
    });
    React.useEffect(function () {
      var target = matchStartFocus.current;
      if (!target || matchStartBusy) return;
      matchStartFocus.current = null;
      var control = document.getElementById('perception-match-value');
      if (target.experiment === meta.id && target.profile === ctx.activeProfileId && control && !control.disabled) control.focus();
    }, [matchStartBusy, meta.id, ctx.activeProfileId, controlsOpen]);
    React.useEffect(function () { return function () { matchStart.current = null; matchStartFocus.current = null; }; }, []);
    function endStudy(quiet) {
      pendingStudy.current = null; guidedRun.current = null; studyBusyRef.current = false; setStudyBusy(false); setActiveStudy(null); studyRevisions.current = null;
      if (!quiet) { setControlsOpen(true); focusTrial.current = 'match'; announce(t('study_ended', 'Repeated study ended. Recorded matches remain in your notebook.')); }
    }
    function startStudyFrom(recordId) {
      if (studyBusyRef.current || studyLocked || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
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
    function openObservationViewer(recordId, event) {
      var source = observationSource.current;
      if (!studyAlive.current || source.activeProfileId !== importProfile.current || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
      var plan = planObservationReview((source.toolData || {}).perceptionLab, recordId); if (plan.status !== 'ready') return;
      viewerReturn.current = event.currentTarget;
      setViewer({ recordId: plan.record.id, identity: plan.identity, profile: source.activeProfileId });
    }
    function observationPreview(plan) {
      var record = plan.record, data = experiment(record.experiment), prefix = uid + '-observation', date = new Date(record.date), validDate = Number.isFinite(date.getTime());
      return h('section', { className: 'perception-recorded-preview perception-observation-review', 'data-perception-observation-viewer': true, 'aria-labelledby': uid + '-viewer-heading' },
        h('div', { id: prefix + '-layout', className: 'perception-observation-layout', 'data-perception-observation-layout': true, 'data-full-width': !!viewer.fullWidth },
          h('div', { className: 'perception-observation-stage' },
            h('figure', null, h('figcaption', null, t('recorded_drawing', 'Recorded drawing')),
              h('svg', { viewBox: '0 0 800 480', xmlns: 'http://www.w3.org/2000/svg', role: 'img', 'data-perception-observation-scene': record.id, 'aria-labelledby': prefix + '-title ' + prefix + '-desc' },
                h('title', { id: prefix + '-title' }, t(data.id + '_title', data.title)), h('desc', { id: prefix + '-desc' }, descriptionText(data.id, record.model)), scene(data.id, record.model, t).map(renderNode))),
            h('div', { className: 'perception-observation-badges' }, h('span', null, record.model.matching ? t('match_by_eye', 'Match by eye') : t('observe', 'Observe')), h('span', null, record.model.reveal ? t('observation_guides_shown', 'Measurements shown') : t('observation_guides_hidden', 'Measurements hidden'))),
            h('div', { className: 'perception-actions perception-observation-toolbar' },
              button(t('observation_full_width', 'Give drawing full width'), function () { if (currentObservationPlan()) setViewer(function (previous) { return previous && previous.recordId === record.id ? Object.assign({}, previous, { fullWidth: !previous.fullWidth }) : previous; }); }, { 'data-perception-observation-full-width': true, 'aria-pressed': !!viewer.fullWidth, 'aria-controls': prefix + '-layout' }),
              button(t('export_observation_report', 'Export observation report'), exportObservationReport, { 'data-perception-export-observation-report': true })),
            h('p', { id: uid + '-viewer-hint', className: 'perception-observation-hint' }, t('saved_observation_hint', 'The saved drawing and measurement visibility are preserved.')),
            h('p', { className: 'perception-observation-result', 'data-perception-observation-result': true }, observationResult(record))),
          h('div', { className: 'perception-observation-sidebar' },
            h('section', { className: 'perception-observation-card', 'aria-labelledby': prefix + '-impression' }, h('h3', { id: prefix + '-impression' }, t('recorded_impression', 'Recorded impression')),
              h('p', { className: 'perception-observation-impression' }, observationImpression(record)),
              h('p', { className: 'perception-observation-date' }, t('saved_date_label', 'Observation saved') + ': ', validDate ? h('time', { dateTime: date.toISOString() }, date.toLocaleString()) : t('saved_date_unavailable', 'Saved date unavailable'))),
            h('section', { className: 'perception-observation-card', 'aria-labelledby': prefix + '-note' }, h('h3', { id: prefix + '-note' }, t('observation_note', 'Observation note')),
              h('p', { className: 'perception-recorded-note', 'data-perception-observation-note': true }, record.model.note || t('not_recorded', 'Not recorded'))),
            h('div', { className: 'perception-observation-card perception-observation-settings-card' }, h('table', { className: 'perception-observation-settings', 'data-perception-observation-settings': true }, h('caption', null, t('saved_settings_label', 'Saved drawing settings')),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('setting_label', 'Setting')), h('th', { scope: 'col' }, t('saved_value_label', 'Saved value')))),
              h('tbody', null, observationSettings(record).map(function (row) { return h('tr', { key: row.key, 'data-perception-observation-setting': row.key }, h('th', { scope: 'row' }, row.label), h('td', null, row.value)); })))),
            h('a', { className: 'perception-observation-reference', href: data.source, target: '_blank', rel: 'noopener noreferrer' }, t('reference', 'Scientific reference: Michael Bach')))));
    }
    function openRecordedViewer(groupId, slot, heading, event, comparison) {
      if (!previewIdentities[slot] || studyBusyRef.current || importBusyRef.current || comparison && (!previewIdentities.b || comparison.groupId !== comparedGroup)) return;
      viewerReturn.current = event.currentTarget;
      setViewer({ groupId: groupId, slot: slot, heading: heading, identity: previewIdentities[slot], profile: ctx.activeProfileId, comparison: comparison || null, stacked: false, switching: false, showing: 'a' });
    }
    function closeRecordedViewer() { cancelRecordedDrag(); setViewer(null); }
    function recordedCameraReady() {
      var latest = recordedCameraLatest.current;
      return studyAlive.current && latest && latest.viewer === viewer && latest.context === recordedCameraContext && latest.profile === importProfile.current && !studyBusyRef.current && !importBusyRef.current;
    }
    function setRecordedCamera(patch) {
      if (!recordedCameraReady()) return;
      var session = recordedCameraLatest.current;
      setViewer(function (previous) {
        if (!recordedCameraReady() || recordedCameraLatest.current !== session || !previous || previous.recordId || previous.groupId !== viewer.groupId || previous.identity !== viewer.identity) return previous;
        var base = previous.inspection || { zoom: 1, x: .5, y: .5, pan: false, open: false }, next = Object.assign({}, base, patch), zoom = [1, 1.5, 2, 3].indexOf(next.zoom) >= 0 ? next.zoom : 1, edge = .5 / zoom;
        return Object.assign({}, previous, { inspection: { zoom: zoom, x: zoom === 1 ? .5 : Math.max(edge, Math.min(1 - edge, Number.isFinite(next.x) ? next.x : .5)), y: zoom === 1 ? .5 : Math.max(edge, Math.min(1 - edge, Number.isFinite(next.y) ? next.y : .5)), pan: zoom > 1 && !!next.pan, open: !!next.open } });
      });
    }
    function cancelRecordedDrag() {
      var drag = recordedCameraDrag.current; recordedCameraDrag.current = null;
      if (drag && drag.target && typeof drag.target.hasPointerCapture === 'function' && drag.target.hasPointerCapture(drag.pointer)) { try { drag.target.releasePointerCapture(drag.pointer); } catch (_) {} }
    }
    function fitRecordedCamera() { cancelRecordedDrag(); setRecordedCamera({ zoom: 1, x: .5, y: .5, pan: false }); }
    function nudgeRecordedCamera(direction, faster) {
      if (!recordedCameraReady() || recordedCamera.zoom <= 1) return;
      cancelRecordedDrag();
      var step = (faster ? .3 : .1) / recordedCamera.zoom;
      setRecordedCamera(direction === 'center' ? { x: .5, y: .5 } : { x: recordedCamera.x + (direction === 'left' ? -step : direction === 'right' ? step : 0), y: recordedCamera.y + (direction === 'up' ? -step : direction === 'down' ? step : 0) });
    }
    function moveRecordedPointer(event) {
      var drag = recordedCameraDrag.current;
      if (!drag || drag.pointer !== event.pointerId) return;
      if (!recordedCameraReady() || !drag.target.isConnected || drag.context !== recordedCameraContext || drag.zoom !== recordedCamera.zoom || !recordedCamera.pan) { cancelRecordedDrag(); return; }
      var rect = drag.target.getBoundingClientRect();
      if (['left', 'top', 'width', 'height'].some(function (key) { return Math.abs(rect[key] - drag.rect[key]) > 1; })) { cancelRecordedDrag(); return; }
      setRecordedCamera({ x: drag.x - (event.clientX - drag.clientX) / (drag.rect.width * drag.zoom), y: drag.y - (event.clientY - drag.clientY) / (drag.rect.height * drag.zoom) });
    }
    function startRecordedDrag(event) {
      if (!recordedCameraReady() || recordedCamera.zoom <= 1 || !recordedCamera.pan || event.button !== 0 || event.isPrimary === false || recordedCameraDrag.current || event.currentTarget.closest('[inert],[aria-hidden=true]')) return;
      var rect = event.currentTarget.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return;
      event.preventDefault();
      recordedCameraDrag.current = { pointer: event.pointerId, target: event.currentTarget, context: recordedCameraContext, zoom: recordedCamera.zoom, x: recordedCamera.x, y: recordedCamera.y, clientX: event.clientX, clientY: event.clientY, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
      if (typeof event.currentTarget.setPointerCapture === 'function') { try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {} }
      event.currentTarget.focus({ preventScroll: true });
    }
    function cancelRecordedPointer(event) { if (recordedCameraDrag.current && recordedCameraDrag.current.pointer === event.pointerId) cancelRecordedDrag(); }
    function finishRecordedPointer(event) { if (recordedCameraDrag.current && recordedCameraDrag.current.pointer === event.pointerId) { moveRecordedPointer(event); cancelRecordedDrag(); } }
    function recordedCameraKeyDown(event) {
      if (event.target !== event.currentTarget || event.ctrlKey || event.altKey || event.metaKey || recordedCamera.zoom <= 1 || !recordedCameraReady()) return;
      var direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
      if (direction || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); nudgeRecordedCamera(direction || 'center', event.shiftKey); }
      else if (event.key === 'Home') {
        event.preventDefault(); event.stopPropagation(); fitRecordedCamera();
        var control = document.getElementById(uid + (recordedCamera.open ? '-recorded-zoom' : '-recorded-inspect')); if (control) control.focus({ preventScroll: true });
      }
    }
    function recordedFrameAction(event) {
      var target = event.currentTarget;
      if (!recordedCameraReady() || !target.isConnected || target.closest('[hidden],[inert],[aria-hidden=true]')) return;
      if (recordedCamera.zoom > 1) {
        recordedInspectFocus.current = null; fitRecordedCamera(); target.focus({ preventScroll: true });
      } else {
        cancelRecordedDrag();
        recordedInspectFocus.current = { target: target, profile: viewer.profile, groupId: viewer.groupId, identity: viewer.identity };
        setRecordedCamera({ open: true, pan: false });
      }
    }
    function recordedDrawingStage(slot, label, drawing) {
      var magnified = recordedCamera.zoom > 1, statusId = uid + '-recorded-' + slot + '-frame-status';
      return h('div', { className: 'perception-recorded-stage', 'data-perception-recorded-stage': slot },
        h('div', { className: 'perception-recorded-frame', 'data-perception-recorded-frame': slot, 'data-magnified': magnified },
          h('span', { id: statusId, className: 'perception-recorded-frame-status', 'data-perception-recorded-frame-status': slot }, magnified ? format(t('recorded_frame_zoom', '{percent}% · Cropped view'), { percent: recordedCamera.zoom * 100 }) : t('recorded_frame_whole', 'Whole drawing')),
          button(magnified ? t('camera_fit', 'Fit whole drawing') : t('inspect_drawing', 'Inspect drawing'), recordedFrameAction, { 'data-perception-recorded-frame-action': slot, 'data-action': magnified ? 'fit' : 'inspect', 'aria-describedby': statusId })),
        recordedCameraViewport(slot, label, drawing));
    }
    function recordedCameraViewport(slot, label, drawing) {
      return h('div', { className: 'perception-recorded-viewport', 'data-perception-recorded-viewport': slot, 'data-camera-zoom': recordedCamera.zoom, 'data-camera-x': recordedCamera.x, 'data-camera-y': recordedCamera.y, 'data-pan-mode': recordedCamera.pan, tabIndex: recordedCamera.zoom > 1 ? 0 : undefined, role: recordedCamera.zoom > 1 ? 'region' : undefined,
        'aria-label': recordedCamera.zoom > 1 ? format(t('camera_viewport', '{view}, {percent}% drawing inspection'), { view: label, percent: recordedCamera.zoom * 100 }) : undefined, 'aria-describedby': recordedCamera.zoom > 1 ? uid + '-recorded-pan-hint ' + uid + '-recorded-crop-hint' : undefined,
        onPointerDown: startRecordedDrag, onPointerMove: moveRecordedPointer, onPointerUp: finishRecordedPointer, onPointerCancel: cancelRecordedPointer, onLostPointerCapture: cancelRecordedPointer, onKeyDown: recordedCameraKeyDown },
        h('div', { className: 'perception-recorded-layer', 'data-perception-recorded-layer': slot, style: { transform: 'translate(' + ((.5 - recordedCamera.zoom * recordedCamera.x) * 100).toFixed(5) + '%, ' + ((.5 - recordedCamera.zoom * recordedCamera.y) * 100).toFixed(5) + '%) scale(' + recordedCamera.zoom + ')' } }, drawing));
    }
    function recordedInspectionTools() {
      var edge = .5 / recordedCamera.zoom;
      return h(React.Fragment, null,
        h('div', { className: 'perception-actions perception-recorded-inspect-toggle' }, button(h(React.Fragment, null, t('inspect_drawing', 'Inspect drawing'), recordedCamera.zoom > 1 && h('small', { className: 'perception-camera-badge', 'aria-hidden': true }, format(t('camera_magnified_label', '{percent}% inspection'), { percent: recordedCamera.zoom * 100 }))), function () { cancelRecordedDrag(); setRecordedCamera({ open: !recordedCamera.open, pan: false }); }, { id: uid + '-recorded-inspect', 'data-perception-recorded-inspect': true, 'aria-expanded': recordedCamera.open, 'aria-controls': uid + '-recorded-inspector', 'aria-label': format(t('camera_toggle_label', 'Inspect drawing, {percent}% magnification'), { percent: recordedCamera.zoom * 100 }) })),
        h('section', { className: 'perception-inspector perception-recorded-inspector', id: uid + '-recorded-inspector', 'data-perception-recorded-inspector': true, hidden: !recordedCamera.open, 'aria-label': t('camera_controls', 'Drawing inspection') },
          h('div', { className: 'perception-inspector-controls' },
            h('label', { className: 'perception-field', htmlFor: uid + '-recorded-zoom' }, h('span', null, t('camera_zoom', 'Drawing zoom')), h('select', { id: uid + '-recorded-zoom', 'data-perception-recorded-zoom': true, value: recordedCamera.zoom, onChange: function (event) { cancelRecordedDrag(); setRecordedCamera({ zoom: Number(event.target.value) }); } }, [1, 1.5, 2, 3].map(function (zoom) { return h('option', { key: zoom, value: zoom }, zoom === 1 ? t('camera_fit_short', 'Fit') : zoom * 100 + '%'); }))),
            button(t('camera_fit', 'Fit whole drawing'), fitRecordedCamera, { 'data-perception-recorded-fit': true, disabled: recordedCamera.zoom === 1 }),
            button(t('camera_pan', 'Pan drawing'), function () { cancelRecordedDrag(); setRecordedCamera({ pan: !recordedCamera.pan }); }, { 'data-perception-recorded-pan': true, 'aria-pressed': recordedCamera.pan, disabled: recordedCamera.zoom <= 1, 'aria-describedby': uid + '-recorded-pan-hint' })),
          recordedCamera.zoom > 1 && h('div', { className: 'perception-camera-navigation', role: 'group', 'aria-label': t('camera_navigation', 'Move viewing window'), dir: 'ltr' }, ['up', 'left', 'center', 'right', 'down'].map(function (direction) {
            var labels = { left: t('camera_look_left', 'Look left'), right: t('camera_look_right', 'Look right'), up: t('camera_look_up', 'Look up'), down: t('camera_look_down', 'Look down'), center: t('camera_center', 'Center view') };
            var atEdge = direction === 'left' ? recordedCamera.x <= edge + 1e-8 : direction === 'right' ? recordedCamera.x >= 1 - edge - 1e-8 : direction === 'up' ? recordedCamera.y <= edge + 1e-8 : direction === 'down' ? recordedCamera.y >= 1 - edge - 1e-8 : false;
            return button(cameraIcon(direction), function () { nudgeRecordedCamera(direction); }, { key: direction, 'data-perception-recorded-move': direction, style: { gridArea: direction }, 'aria-label': labels[direction], title: labels[direction], disabled: atEdge });
          })),
          recordedCamera.zoom > 1 && h('p', { className: 'perception-camera-linked', 'data-perception-recorded-position': true }, format(t('camera_overview_position', 'View center: {horizontal}% across · {vertical}% down'), { horizontal: Math.round(recordedCamera.x * 100), vertical: Math.round(recordedCamera.y * 100) })),
          h('p', { id: uid + '-recorded-pan-hint' }, t('camera_pan_hint', 'Turn on Pan drawing to drag. You can also focus a magnified drawing and use Arrow keys; Home fits the whole drawing. Escape turns panning off.')),
          h('p', { id: uid + '-recorded-crop-hint' }, t('recorded_camera_hint', 'Magnification crops the visible surroundings. Return to Fit whole drawing before comparing your impression. Saved drawings and reports stay complete.')),
          viewer.comparison && h('p', { className: 'perception-camera-linked' }, t('camera_linked_hint', 'Both drawings use the same magnification and viewing position.'))));
    }
    function updatePairedViewer(values) {
      var session = pairedViewerLatest.current;
      if (!session || session !== viewer || !studyAlive.current || session.profile !== importProfile.current || studyBusyRef.current || importBusyRef.current) return;
      setViewer(function (previous) {
        if (pairedViewerLatest.current !== session || !previous || previous.recordId || previous.profile !== session.profile || previous.groupId !== session.groupId || previous.identity !== session.identity || !previous.comparison || previous.comparison.groupId !== session.comparison.groupId || previous.comparison.identity !== session.comparison.identity) return previous;
        return Object.assign({}, previous, values);
      });
    }
    function showRecordedDrawing(side, focus) {
      if (side !== 'a' && side !== 'b' || !viewerValid || !viewer.comparison || !viewer.switching) return;
      updatePairedViewer({ showing: side });
      if (focus) { var target = document.getElementById(uid + '-viewer-show-' + side); if (target) target.focus({ preventScroll: true }); }
    }
    function recordedSwitchKeyDown(event) {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || !event.target.hasAttribute('data-perception-viewer-show')) return;
      var side = { ArrowLeft: 'a', ArrowRight: 'b', Home: 'a', End: 'b' }[event.key];
      if (side) { event.preventDefault(); event.stopPropagation(); showRecordedDrawing(side, true); }
    }
    function recordedSwitchControls() {
      return h(React.Fragment, null,
        h('p', { className: 'perception-recorded-switch-hint', id: uid + '-viewer-switch-hint' }, t('viewer_switch_hint', 'Use the buttons to alternate complete drawings at the same position. Left and Right Arrow also switch when a drawing button has focus.')),
        h('div', { className: 'perception-switch-views perception-recorded-switch', role: 'group', dir: 'ltr', 'data-perception-viewer-switch-controls': true, 'aria-label': t('viewer_visible_recorded', 'Visible recorded drawing'), 'aria-describedby': uid + '-viewer-switch-hint', onKeyDown: recordedSwitchKeyDown }, ['a', 'b'].map(function (side) {
          var slot = side === 'a' ? viewer.slot : 'b', saved = object(previewOptions[slot]), trial = saved.identity === previewIdentities[slot] ? saved.trial : 1;
          return button(h(React.Fragment, null, h('strong', null, side === 'a' ? t('viewer_drawing_a', 'Drawing A') : t('viewer_drawing_b', 'Drawing B')), h('span', null, format(t('recorded_trial_option', 'Trial {trial}'), { trial: trial }))), function () { showRecordedDrawing(side, false); },
            { key: side, id: uid + '-viewer-show-' + side, dir: 'auto', 'data-perception-viewer-show': side, 'aria-pressed': (viewer.showing === 'b' ? 'b' : 'a') === side, 'aria-controls': uid + '-recorded-viewer-' + side + '-panel' });
        })));
    }
    function openFocusedExperiment() {
      if (studyBusyRef.current || importBusyRef.current || matchStart.current || inquiryRequest.current) return;
      stop(); focusReturn.current = uid + '-focus-open'; setControlsOpen(true);
      setFocusSession({ experiment: meta.id, profile: ctx.activeProfileId });
    }
    function closeFocusedExperiment() { if (inquiryRequest.current) inquiryRequest.current.noFocus = true; inquiryFocus.current = false; if (matchStart.current) matchStart.current.noFocus = true; matchStartFocus.current = null; focusBrowse.current = null; focusBrowseReturn.current = ''; setFocusBrowseBusy(false); stop(); setFocusSession(null); }
    function browseFocusedExperiment(id, control) {
      if (!focusSession || focusSession.profile !== ctx.activeProfileId || focusSession.experiment !== meta.id || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current || id === meta.id || !EXPERIMENTS.some(function (item) { return item.id === id; })) return;
      stop(); setControlsOpen(true);
      var request = { from: meta.id, to: id, control: control, profile: ctx.activeProfileId, revision: experimentRevision.current, done: false, success: false };
      focusBrowse.current = request; setFocusBrowseBusy(true);
      update(function (next) {
        var valid = studyAlive.current && focusBrowse.current === request && request.profile === importProfile.current && request.revision === experimentRevision.current && next.experiment === request.from;
        request.done = true; request.success = valid;
        if (valid) { next.experiment = request.to; request.fingerprint = JSON.stringify({ experiment: next.experiment, models: next.models }); }
        return next;
      });
    }
    function focusedDescription() {
      if (model.matching && meta.id === 'brightness') return t('brightness_match_description', 'A fixed gray square on the left and an adjustable gray square on the right. Match their apparent brightness by eye.');
      if (model.matching && meta.id === 'ebbinghaus') return t('ebbinghaus_match_description', 'A fixed orange circle on the left and an adjustable orange circle on the right. Match their apparent size by eye.');
      if (model.matching && meta.id === 'mullerLyer') return t('mullerLyer_match_description', 'A fixed horizontal shaft at the top and an adjustable shaft below. Match their apparent length by eye; exclude the fins.');
      return t(meta.id + '_description', meta.description);
    }
    function focusWorkspacePart(part) {
      var dialog = focusRef.current;
      if (!dialog) return;
      if (part === 'controls') setControlsOpen(true);
      var target = dialog.querySelector(part === 'controls' ? '.perception-controls summary' : '.perception-live-pair');
      if (target) {
        target.focus();
        var drawing = part === 'drawing' && target.querySelector('[data-comparison-inactive=false] .perception-figure'), scrollTarget = drawing || target;
        if (typeof scrollTarget.scrollIntoView === 'function') scrollTarget.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
      }
    }
    function focusedExperimentKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeFocusedExperiment(); return; }
      if (event.key !== 'Tab') return;
      var controls = Array.prototype.filter.call(event.currentTarget.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary'), function (item) {
        var closed = item.closest('details:not([open])');
        return !item.closest('[hidden],[inert],[aria-hidden=true]') && (!closed || item === closed.querySelector('summary'));
      });
      var first = controls[0], last = controls[controls.length - 1], focused = document.activeElement;
      if (!first) return;
      if (event.shiftKey && (focused === first || controls.indexOf(focused) < 0)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && focused === last) { event.preventDefault(); first.focus(); }
    }
    function recordedViewerKeyDown(event) {
      if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.metaKey && recordedCameraReady() && recordedCamera.pan) { event.preventDefault(); event.stopPropagation(); cancelRecordedDrag(); setRecordedCamera({ pan: false }); return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRecordedViewer(); return; }
      if (event.key !== 'Tab') return;
      var controls = Array.prototype.filter.call(event.currentTarget.querySelectorAll('button:not([disabled]),select:not([disabled]),a[href],[data-perception-recorded-viewport][tabindex="0"]'), function (item) { return !item.closest('[hidden],[inert],[aria-hidden=true]'); });
      var first = controls[0], last = controls[controls.length - 1], focused = document.activeElement;
      if (!first) return;
      if (event.shiftKey && (focused === first || !Array.prototype.includes.call(controls, focused))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && focused === last) { event.preventDefault(); first.focus(); }
    }
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
      var displaySlot = typeof enlarged === 'string' ? enlarged : enlarged ? 'viewer' : slot, prefix = uid + '-recorded-' + displaySlot, date = new Date(recorded.date), validDate = Number.isFinite(date.getTime());
      var paired = displaySlot === 'viewer-a' || displaySlot === 'viewer-b', inactive = paired && viewer && viewer.switching && (displaySlot === 'viewer-b') !== (viewer.showing === 'b');
      var label = heading || t('recorded_drawing', 'Recorded drawing');
      var trialTitle = format(t('recorded_trial_title', 'Recorded trial {trial} · {title}'), { trial: recorded.trial, title: t(data.id + '_title', data.title) });
      var savedDrawing = h('svg', { viewBox: '0 0 800 480', xmlns: 'http://www.w3.org/2000/svg', role: 'img', 'data-perception-recorded-scene': displaySlot, 'aria-labelledby': prefix + '-title ' + prefix + '-desc' },
        h('title', { id: prefix + '-title' }, label + ' · ' + trialTitle), h('desc', { id: prefix + '-desc' }, descriptionText(recorded.experiment, drawing)), scene(recorded.experiment, drawing, t).map(renderNode));
      function selectPreview(values) { setPreviewOptions(function (previous) { var next = Object.assign({}, previous); next[slot] = Object.assign({}, options, values); return next; }); }
      return h('section', { className: 'perception-recorded-preview', id: paired ? prefix + '-panel' : undefined, 'data-viewer-inactive': paired ? String(!!inactive) : undefined, 'aria-hidden': inactive ? true : undefined, inert: inactive ? '' : undefined, 'data-perception-recorded-preview': displaySlot, 'data-perception-recorded-trial': recorded.trial, 'aria-labelledby': prefix + '-heading' },
        h(enlarged ? 'h3' : 'h5', { id: prefix + '-heading' }, label),
        !enlarged && h('p', null, t('recorded_drawing_hint', 'Inspect an actual saved match. Trial selections and guides apply only to these previews.')),
        h('div', { className: 'perception-preview-toolbar' }, h('label', { className: 'perception-field', htmlFor: prefix + '-trial' }, t('recorded_trial_label', 'Recorded trial'),
          h('select', { id: prefix + '-trial', value: options.trial, 'data-perception-preview-trial': displaySlot, 'aria-describedby': prefix + '-heading', onChange: function (event) { selectPreview({ trial: Number(event.target.value) }); } },
            [1, 2, 3].map(function (trial) { return h('option', { key: trial, value: trial }, format(t('recorded_trial_option', 'Trial {trial}'), { trial: trial })); }))),
        h('div', { className: 'perception-actions' }, button(t('show_measurement_guides', 'Show measurement guides'), function () { selectPreview({ guides: !options.guides }); }, { 'data-perception-preview-guides': displaySlot, 'aria-pressed': options.guides, 'aria-describedby': prefix + '-heading' }),
          !enlarged && button(t('enlarge_recorded_drawing', 'Enlarge drawing'), function (event) { openRecordedViewer(groupId, slot, heading, event); }, { 'data-perception-enlarge': slot, 'aria-haspopup': 'dialog', 'aria-describedby': prefix + '-heading', disabled: studyBusy || importBusy }))),
        h('figure', null,
          h('figcaption', null, trialTitle),
          enlarged ? recordedDrawingStage(displaySlot, label, savedDrawing) : savedDrawing),
        h('div', { className: 'perception-recorded-details' }, h('p', { 'data-perception-recorded-values': displaySlot }, resultText(recorded.experiment, recorded.model)),
          h('div', { className: 'perception-recorded-meta' }, h('p', null, t('recorded_impression', 'Recorded impression') + ': ' + t(data.id + '_choice_' + data.choices.indexOf(recorded.model.prediction), recorded.model.prediction)),
            validDate && h('p', null, h('time', { dateTime: date.toISOString() }, date.toLocaleString()))),
          recorded.model.note && h('p', { className: 'perception-recorded-note' }, t('observation_note', 'Observation note') + ': ' + recorded.model.note)));
    }
    function studyProgressView(study) {
      var count = study.trials.length, phase = count < 3 ? 'collecting' : study.revealed ? 'revealed' : 'ready';
      var heading = phase === 'collecting' ? format(t('study_progress_position', 'Match {number} of 3'), { number: count + 1 }) : phase === 'ready' ? t('study_progress_ready', 'Ready to reveal') : t('study_progress_revealed', 'Results revealed');
      return h('div', { className: 'perception-study-progress', 'data-perception-study-progress': true, 'data-perception-progress-phase': phase },
        h('p', { className: 'perception-study-progress-heading' }, h('strong', null, heading)),
        h('ol', { className: 'perception-study-progress-steps', role: 'list', 'aria-label': t('study_progress_label', 'Three-match study progress') },
          [1, 2, 3].map(function (trial) {
            var step = trial <= count ? 'recorded' : trial === count + 1 ? 'current' : 'upcoming';
            var label = step === 'recorded' ? t('study_progress_recorded', 'Recorded') : step === 'current' ? t('study_progress_current', 'Current match') : t('study_progress_upcoming', 'Upcoming');
            return h('li', { key: trial, 'aria-current': step === 'current' ? 'step' : undefined, 'data-perception-progress-trial': trial, 'data-perception-progress-state': step },
              h('span', { className: 'perception-study-progress-number', 'aria-hidden': true, dir: 'ltr' }, trial),
              h('span', { className: 'perception-study-progress-copy' },
                h('span', { className: 'perception-study-progress-sr' }, format(t('study_progress_position', 'Match {number} of 3'), { number: trial }) + ': '), label));
          })));
    }
    function trialLedger(summary, slot, unit) {
      var prefix = uid + '-' + slot + '-trial-ledger', columns = [
        { key: 'start', label: t('starting_value', 'Starting value') },
        { key: 'match', label: t('recorded_match', 'Recorded match') },
        { key: 'difference', label: t('difference_from_reference', 'Difference from reference') }
      ];
      return h('div', { className: 'perception-trial-ledger', 'data-perception-trial-ledger': slot },
        h('table', { className: 'perception-study-table perception-trial-table', role: 'table', 'aria-labelledby': prefix + '-caption', 'data-perception-trial-table': slot },
          h('caption', { id: prefix + '-caption' }, t('three_recorded_matches', 'Three recorded matches'),
            h('span', { 'data-perception-trial-unit': true }, format(t('trial_values_unit', 'Drawing values in {unit}.'), { unit: unit }))),
          h('thead', { role: 'rowgroup' }, h('tr', { role: 'row' },
            h('th', { id: prefix + '-trial', scope: 'col', role: 'columnheader' }, t('trial_label', 'Trial')),
            columns.map(function (column) { return h('th', { key: column.key, id: prefix + '-' + column.key, scope: 'col', role: 'columnheader' }, column.label); }))),
          h('tbody', { role: 'rowgroup' }, summary.values.map(function (value, index) {
            var rowId = prefix + '-row-' + (index + 1), values = [summary.starts[index], value, signed(value - summary.reference)];
            return h('tr', { key: index, role: 'row', 'data-perception-trial-row': index + 1 },
              h('th', { id: rowId, scope: 'row', role: 'rowheader', headers: prefix + '-trial' },
                h('span', { className: 'perception-trial-name' }, format(t('trial_number_label', 'Trial {number}'), { number: index + 1 }))),
              columns.map(function (column, columnIndex) { return h('td', { key: column.key, role: 'cell', headers: rowId + ' ' + prefix + '-' + column.key },
                h('span', { className: 'perception-trial-cell-label', 'aria-hidden': true }, column.label),
                h('bdi', { className: 'perception-trial-value', dir: 'ltr', 'data-perception-trial-value': column.key }, values[columnIndex])); }));
          }))));
    }
    function summaryView(study, slot) {
      var summary = studySummary(study); if (!summary) return null;
      var unit = study.experiment === 'brightness' ? t('rgb_steps', 'RGB-code steps') : t('units_label', 'units');
      return h('div', { 'data-perception-study-summary': study.id },
        h('p', null, format(t('study_reference_value', 'Fixed reference: {value} {unit}.'), { value: summary.reference, unit: study.experiment === 'brightness' ? 'RGB' : unit })),
        trialLedger(summary, slot, unit),
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
      if (studyLocked || studyBusyRef.current || importBusyRef.current || matchStart.current || inquiryRequest.current || !guideDraft || !guideSelection.current || guideSelection.current.epoch !== guideDraft.epoch) return;
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
      function position(value) { return (value - min) / (max - min) * 100 + '%'; }
      var titleId = uid + '-pair-plot-title', descriptionId = uid + '-pair-plot-description', unit = pair.experiment === 'brightness' ? 'RGB' : t('units_label', 'units');
      var labels = [t('study_a_label', 'Study A · reviewed'), t('study_b_label', 'Study B · selected')];
      var description = format(t('pair_plot_description', 'Scale {min} to {max} {unit}. Fixed reference {reference}. {studyA}: matches {valuesA}; median {medianA}. {studyB}: matches {valuesB}; median {medianB}.'), { min: min, max: max, unit: unit, reference: pair.reference, studyA: labels[0], studyB: labels[1], valuesA: pair.summaryA.values.join(', '), valuesB: pair.summaryB.values.join(', '), medianA: pair.summaryA.median, medianB: pair.summaryB.median });
      return h('figure', { className: 'perception-pair-plot', 'data-perception-study-plot-figure': true },
        h('figcaption', { className: 'perception-pair-plot-heading' },
          h('h5', { id: titleId, 'data-perception-pair-label': 'heading' }, t('pair_plot_heading', 'Recorded matches on a shared scale')),
          h('p', { className: 'perception-pair-reference-label', 'data-perception-pair-label': 'reference' }, format(t('pair_plot_reference_value', 'Fixed reference: {value} {unit}'), { value: pair.reference, unit: unit }))),
        h('p', { id: descriptionId, className: 'perception-pair-plot-description' }, description),
        h('div', { className: 'perception-pair-chart', role: 'img', 'aria-labelledby': titleId, 'aria-describedby': descriptionId, 'data-perception-study-plot': true, 'data-perception-pair-min': min, 'data-perception-pair-max': max },
          [pair.summaryA, pair.summaryB].map(function (summary, index) {
            var side = index ? 'b' : 'a';
            return h('div', { key: side, className: 'perception-pair-series', 'data-perception-pair-series': side },
              h('div', { className: 'perception-pair-series-heading' },
                h('strong', { 'data-perception-pair-label': side }, labels[index]),
                h('span', { className: 'perception-pair-median-label' }, t('median_match', 'Median match') + ': ', h('bdi', null, summary.median + ' ' + unit))),
              h('div', { className: 'perception-pair-track', 'data-perception-pair-track': side, dir: 'ltr' },
                h('span', { className: 'perception-pair-reference-mark', 'data-perception-pair-reference': pair.reference, style: { left: position(pair.reference) } }),
                h('span', { className: 'perception-pair-range-mark', 'data-perception-pair-range': side, style: { left: position(summary.min), width: (summary.max - summary.min) / (max - min) * 100 + '%' } }),
                h('span', { className: 'perception-pair-median-mark', 'data-perception-pair-median': summary.median, style: { left: position(summary.median) } }),
                summary.values.map(function (value, trial) { return h('span', { key: trial, className: 'perception-pair-dot', 'data-perception-pair-value': value, 'data-perception-pair-trial': trial + 1, style: { left: position(value), top: 22 + trial * 28 + '%' } }); })),
              h('p', { className: 'perception-pair-values', 'data-perception-pair-values-text': side }, t('recorded_matches', 'Recorded matches') + ': ', h('bdi', null, summary.values.join(', ') + ' ' + unit)));
          }),
          h('div', { className: 'perception-pair-axis-wrap' },
            h('div', { className: 'perception-pair-axis', 'data-perception-pair-axis': true, dir: 'ltr' }, h('span', { 'data-perception-pair-bound': 'min' }, min), h('span', { 'data-perception-pair-bound': 'max' }, max)),
            h('p', { className: 'perception-pair-axis-label' }, format(t('pair_plot_scale_label', 'Drawing-value scale · {unit}'), { unit: unit })))),
        h('ul', { className: 'perception-pair-legend', 'aria-label': t('pair_plot_title', 'Three matches and the median of each study, on one shared drawing-value scale.') },
          [['dot', t('recorded_matches', 'Recorded matches')], ['range', t('match_range', 'Match range')], ['median', t('median_match', 'Median match')], ['reference', format(t('pair_plot_reference', 'Reference {value}'), { value: pair.reference })]].map(function (entry) { return h('li', { key: entry[0] }, h('span', { className: 'perception-pair-key perception-pair-key-' + entry[0], 'aria-hidden': true }), h('span', null, entry[1])); })),
        h('p', { className: 'perception-pair-plot-hint' }, t('pair_plot_hint', 'Each dot is a trial, top to bottom 1–3; vertical spacing only separates the dots. Horizontal lines show ranges, solid vertical marks show medians, and dashed lines show the fixed reference. Both rows use the same scale.')));
    }
    function pairDetailTable(kind, caption, rowLabel, labels, rows) {
      var prefix = uid + '-pair-details-' + kind;
      return h('div', { className: 'perception-pair-details', 'data-perception-pair-details': kind },
        h('table', { className: 'perception-study-table perception-pair-detail-table' + (kind === 'settings' ? ' perception-pair-settings' : ''), role: 'table', 'aria-labelledby': prefix + '-caption', 'data-perception-pair-detail-table': kind },
          h('caption', { id: prefix + '-caption' }, caption),
          h('thead', { role: 'rowgroup' }, h('tr', { role: 'row' },
            h('th', { id: prefix + '-label', scope: 'col', role: 'columnheader' }, rowLabel),
            labels.map(function (label, index) { return h('th', { key: index, id: prefix + '-' + (index ? 'b' : 'a'), scope: 'col', role: 'columnheader' }, label); }))),
          h('tbody', { role: 'rowgroup' }, rows.map(function (row) {
            var rowId = prefix + '-row-' + row.key;
            return h('tr', { key: row.key, role: 'row', 'data-perception-pair-detail-row': row.key, 'data-perception-pair-setting': kind === 'settings' ? row.key : undefined },
              h('th', { id: rowId, scope: 'row', role: 'rowheader', headers: prefix + '-label' }, row.label,
                row.inactive && h('small', null, ' · ' + t('inactive_setting', 'Inactive'))),
              row.values.map(function (value, index) {
                var side = index ? 'b' : 'a';
                return h('td', { key: side, role: 'cell', headers: rowId + ' ' + prefix + '-' + side, 'data-perception-pair-side': side },
                  h('span', { className: 'perception-pair-cell-label', 'aria-hidden': true }, labels[index]),
                  h('bdi', { className: 'perception-pair-detail-value', dir: kind === 'results' ? 'ltr' : 'auto', 'data-perception-pair-detail-value': true }, value));
              }));
          }))));
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
          pairDetailTable('results', t('pair_table_caption', 'Separate results from each three-match study'), t('measure_label', 'Measure'), [firstLabel, secondLabel], [
            { key: 'matches', label: t('recorded_matches', 'Recorded matches'), values: [pair.summaryA.values.join(', '), pair.summaryB.values.join(', ')] },
            { key: 'starts', label: t('starting_positions', 'Starting positions'), values: [pair.summaryA.starts.join(', '), pair.summaryB.starts.join(', ')] },
            { key: 'median', label: t('median_match', 'Median match'), values: [valueLabel(pair.summaryA), valueLabel(pair.summaryB)] },
            { key: 'range', label: t('match_range', 'Match range'), values: [rangeLabel(pair.summaryA), rangeLabel(pair.summaryB)] },
            { key: 'difference', label: t('median_difference', 'Median difference'), values: [signed(pair.summaryA.difference) + ' ' + unit, signed(pair.summaryB.difference) + ' ' + unit] }
          ]),
          h('p', { className: 'perception-pair-shift', 'data-perception-median-shift': 'true' }, h('strong', null, t('median_shift_direction', 'Median shift · B minus A') + ': ' + signed(pair.medianShift) + ' ' + unit + (pair.percentShift === null ? '' : ' (' + signed(pair.percentShift) + '% ' + t('of_fixed_reference', 'of the fixed reference') + ')'))),
          pair.changes.length ? pairDetailTable('settings', t('study_settings_changes', 'Changed surrounding settings'), t('setting_label', 'Setting'), [firstLabel, secondLabel],
            pair.changes.map(function (change) { return { key: change.key, label: comparisonLabel(change.key, pair.experiment), inactive: !change.active, values: [comparisonValue(change.key, change.before, {}, pair.experiment), comparisonValue(change.key, change.after, {}, pair.experiment)] }; })) : h('p', null, t('pair_same_settings', 'The two studies used the same surrounding settings. Their matches can still vary.')),
          pair.changes.some(function (change) { return !change.active; }) && h('p', null, t('pair_inactive_hint', 'Surroundings were removed in both studies. Settings marked Inactive did not change the displayed targets.')),
          pair.changes.filter(function (change) { return change.active; }).length > 1 && h('p', null, t('pair_multiple_changes', 'Several surrounding settings differ. This comparison does not isolate the effect of one variable.')),
          pair.startsDiffer && h('p', null, t('pair_start_changes', 'These studies used different starting positions. Keep that difference in mind when comparing their matches.')),
          h('p', null, t('recorded_pair_hint', 'Inspect trials from each study independently. Both drawings use the same scale; each preview shows its selected recorded match.')),
          button(t('enlarge_comparison_drawings', 'Compare enlarged drawings'), function (event) { openRecordedViewer(pair.a.groupId, 'a', firstLabel, event, { groupId: pair.b.groupId, heading: secondLabel, identity: previewIdentities.b }); }, { 'data-perception-enlarge-pair': true, 'aria-haspopup': 'dialog', 'aria-describedby': uid + '-pair-results', disabled: studyBusy || importBusy }),
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
          !study.repeat && button(t('review_observation', 'Review observation'), function (event) { openObservationViewer(study.id, event); }, { 'data-perception-review-observation': study.id, 'aria-haspopup': 'dialog', 'aria-describedby': titleId, disabled: studyLocked || studyBusy || importBusy || focusBrowseBusy || matchStartBusy || inquiryBusy }),
          button(t('restore_observation', 'Restore observation'), function () { cancelMatchStart(); stop(); endStudy(true); update(function (next) { next.experiment = study.experiment; next.models[study.experiment] = normalizeModel(study.experiment, study.model); return next; }); announce(t('observation_restored', 'Observation settings restored.')); }, { 'aria-describedby': titleId }),
          button(t('pin_observation', 'Pin observation'), function () { if (matchStart.current || inquiryRequest.current) return; inquiryReportSession.current = null; stop(); setInquirySession(null); setContextSession(null); update(function (next) { next.comparison = { experiment: study.experiment, model: normalizeModel(study.experiment, study.model) }; return next; }); announce(t('saved_observation_pinned', 'Saved observation pinned for comparison.')); }, { 'aria-describedby': titleId, disabled: (matchStartBusy || inquiryBusy) }),
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
      cancelMatchStart(); stop(); endStudy(true);
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
    var maskStudyViews = collecting || studyBusy && pendingStudy.current && pendingStudy.current.kind === 'start';
    var inquiryAvailable = ['cafeWall', 'necker', 'moire', 'ponzo'].indexOf(meta.id) >= 0;
    var inquiryComparing = inquiryAvailable && !!inquirySession && inquirySession.experiment === meta.id && inquirySession.profile === ctx.activeProfileId && !studyLocked && !studyBusy && !importBusy && !focusBrowseBusy;
    inquiryReportSession.current = inquiryComparing ? inquirySession : null;
    var inquiryData = inquiryAvailable ? inquiryChanges(meta.id, inquiryComparing ? inquirySession.model : activeModel, activeModel, inquirySetting) : null;
    var changedSettings = inquiryComparing ? inquiryData.changes : comparisonChanges(Object.assign({}, state, { models: comparisonModels }));
    var contextAvailable = meta.id !== 'necker' || activeModel.cue !== 'none';
    var contextComparing = !inquiryComparing && !!contextSession && contextSession.experiment === meta.id && contextSession.profile === ctx.activeProfileId && contextAvailable && !studyLocked && !studyBusy && !importBusy && !focusBrowseBusy;
    // The second drawing follows the visible model, changing only its context.
    // This view preference never replaces the learner's saved pin or observation.
    var liveReference = inquiryComparing ? inquirySession : contextComparing ? { experiment: meta.id, model: normalizeModel(meta.id, Object.assign({}, activeModel, { context: !activeModel.context })) } : state.comparison;
    var hasComparison = !!liveReference && !maskStudyViews;
    // View preferences never enter the saved experiment. A drawing edit invalidates
    // a selected pinned view immediately; notes and predictions do not move it.
    var drawingSettings = Object.assign({}, activeModel); delete drawingSettings.note; delete drawingSettings.prediction;
    var liveComparisonIdentity = JSON.stringify([ctx.activeProfileId, meta.id, inquiryComparing ? 'inquiry' : contextComparing ? 'context' : 'pinned', contextComparing ? null : liveReference, drawingSettings]);
    var slideAvailable = hasComparison && liveReference.experiment === meta.id;
    var liveLayout = hasComparison && (comparisonLayout !== 'slide' || slideAvailable) ? comparisonLayout : 'auto';
    // A view-only divider follows the current drawing, but resets for a new reference.
    // Context comparisons derive both drawings live, so their model edits keep the divider.
    var slideIdentity = hasComparison ? JSON.stringify([ctx.activeProfileId, meta.id, inquiryComparing ? 'inquiry' : contextComparing ? 'context' : 'pinned', contextComparing ? null : liveReference]) : '';
    var slidePosition = slideSession.identity === slideIdentity ? slideSession.position : 50;
    var slideCurrentLabel = contextComparing ? contextHeading(activeModel) : t('current_experiment', 'Current experiment');
    var slideReferenceLabel = hasComparison ? inquiryComparing ? t('inquiry_starting_view', 'Starting view') : contextComparing ? contextHeading(liveReference.model) : t('pinned_reference', 'Pinned comparison') : '';
    // Shared inspection is presentation only. A new activity or reference starts with the whole drawing.
    var cameraIdentity = !studyLocked && !maskStudyViews ? JSON.stringify([ctx.activeProfileId, meta.id, model.matching ? 'matching' : 'observe', hasComparison ? inquiryComparing ? 'inquiry' : contextComparing ? 'context' : 'pinned' : 'single', hasComparison && !contextComparing ? liveReference : null]) : '';
    var camera = cameraSession.identity === cameraIdentity && cameraIdentity ? cameraSession : { zoom: 1, x: .5, y: .5, pan: false, open: false };
    var cameraEnabled = !!cameraIdentity && !studyBusy && !importBusy && !focusBrowseBusy && !matchStartBusy && !inquiryBusy;
    cameraLatest.current = { identity: cameraIdentity, profile: ctx.activeProfileId, enabled: cameraEnabled };
    React.useEffect(function () { setCameraSession(function (previous) { return previous.identity === cameraIdentity ? previous : { identity: cameraIdentity, zoom: 1, x: .5, y: .5, pan: false, open: false }; }); }, [cameraIdentity]);
    React.useEffect(function () { cancelCameraDrag(); return cancelCameraDrag; }, [cameraIdentity, camera.zoom, camera.pan, camera.open, liveLayout, focusValid, state.expanded, cameraEnabled]);
    var showingPinned = hasComparison && liveLayout === 'switch' && pinnedViewIdentity === liveComparisonIdentity;
    React.useEffect(function () { setPinnedViewIdentity(''); }, [maskStudyViews, liveComparisonIdentity]);
    React.useEffect(function () {
      if (contextSession && (contextSession.experiment !== meta.id || contextSession.profile !== ctx.activeProfileId || !contextAvailable || studyLocked || studyBusy || importBusy || focusBrowseBusy)) setContextSession(null);
    }, [meta.id, ctx.activeProfileId, contextAvailable, studyLocked, studyBusy, importBusy, focusBrowseBusy]);
    React.useEffect(function () {
      if (!contextComparing && contextReturn.current) { contextReturn.current = false; var target = document.getElementById(uid + '-compare-context'); if (target && !target.disabled) target.focus(); }
    }, [contextComparing]);
    React.useEffect(function () {
      setInquirySession(null); setInquirySetting(''); setInquiryOpen(false); inquiryReturn.current = false;
      inquiryRequest.current = null; inquiryFocus.current = false; setInquiryNavigation(null); setInquiryBusy(false);
    }, [meta.id, ctx.activeProfileId]);
    React.useEffect(function () {
      if (studyLocked || studyBusy || importBusy || focusBrowseBusy) setInquirySession(null);
    }, [studyLocked, studyBusy, importBusy, focusBrowseBusy]);
    React.useEffect(function () {
      var request = inquiryRequest.current; if (!request) return;
      var current = JSON.stringify(model), validIdentity = request.profile === ctx.activeProfileId && request.experiment === meta.id;
      if (!request.done && validIdentity && current === request.before) return;
      inquiryRequest.current = null; setInquiryBusy(false); setAnimatedAngle(null);
      var validBaseline = request.kind === 'capture' || inquiryComparing && JSON.stringify(inquirySession.model) === request.baseline;
      if (request.done && request.success && validIdentity && validBaseline && current === request.after) {
        setContextSession(null); setPinnedViewIdentity(''); setInquiryOpen(true);
        if (request.kind === 'capture') {
          setInquirySession({ experiment: request.experiment, profile: request.profile, model: request.model });
          inquiryFocus.current = request.focus && !request.noFocus;
          announce(t('inquiry_captured', 'Starting view captured. Adjust your chosen setting and compare your impression. Your saved pin is kept.'));
        } else {
          if (!request.noFocus && (!document.activeElement || document.activeElement === document.body || document.activeElement === request.origin)) setInquiryNavigation({ profile: request.profile, experiment: request.experiment, selected: request.selected, focused: !!focusValid });
          announce(request.kind === 'selected' ? format(t('inquiry_chosen_restored', '{setting} returned to its starting value. Your impression and note are kept.'), { setting: comparisonLabel(request.selected) }) : format(t('inquiry_others_restored', '{count} other drawing settings restored. Your chosen setting, impression, and note are kept.'), { count: request.count }));
        }
      } else announce(request.kind === 'capture' ? t('inquiry_expired', 'The experiment changed before the starting view was captured. Your latest settings are kept; capture again when ready.') : t('inquiry_restore_expired', 'The experiment changed before settings were restored. Your latest settings are kept.'));
    });
    React.useEffect(function () {
      if (!inquiryBusy && inquiryFocus.current) { inquiryFocus.current = false; var target = document.getElementById(uid + '-inquiry-start'); if (target && !target.disabled && (!document.activeElement || document.activeElement === document.body || document.activeElement === target)) target.focus(); }
    }, [inquiryBusy, inquirySession]);
    React.useEffect(function () {
      if (!inquiryComparing && inquiryReturn.current) { inquiryReturn.current = false; var target = document.getElementById(uid + '-inquiry-start'); if (target && !target.disabled) target.focus(); }
    }, [inquiryComparing]);
    React.useEffect(function () { return function () { inquiryRequest.current = null; }; }, []);
    function captureInquiry() {
      if (!inquiryAvailable || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
      var request = { kind: 'capture', profile: ctx.activeProfileId, experiment: meta.id, before: JSON.stringify(model), angle: activeModel.angle, freezeAngle: meta.id === 'moire' && animatedAngle !== null, focus: document.activeElement && document.activeElement.id === uid + '-inquiry-start', done: false, success: false };
      inquiryRequest.current = request; setInquiryBusy(true); setInquiryOpen(true); setControlsOpen(true);
      var run = motionRun.current; if (run) { run.active = false; window.cancelAnimationFrame(run.frame); } setPlaying(false);
      announce(t('inquiry_capturing', 'Capturing starting view…'));
      update(function (next) {
        if (inquiryRequest.current !== request) return next;
        var valid = studyAlive.current && request.profile === importProfile.current && next.experiment === request.experiment && JSON.stringify(next.models[request.experiment]) === request.before && !studyBusyRef.current && !importBusyRef.current && !focusBrowse.current && !matchStart.current;
        if (valid) {
          if (request.freezeAngle) next.models[request.experiment] = normalizeModel(request.experiment, Object.assign({}, next.models[request.experiment], { angle: request.angle }));
          request.model = normalizeModel(request.experiment, next.models[request.experiment]); request.after = JSON.stringify(request.model);
        }
        request.success = valid; request.done = true; return next;
      });
    }
    function inquiryControlId(key) { return key === 'context' ? uid + '-context-toggle' : 'perception-' + key; }
    function adjustInquirySetting() {
      if (!inquiryComparing || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
      setControlsOpen(true); setInquiryOpen(true);
      setInquiryNavigation({ profile: ctx.activeProfileId, experiment: meta.id, selected: inquiryData.selected, focused: !!focusValid });
    }
    function restoreInquiry(scope) {
      if (!inquiryComparing || studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current) return;
      var plan = planInquiryRestore(meta.id, inquirySession.model, activeModel, inquiryData.selected, scope); if (!plan || !plan.changes.length) return;
      var request = { kind: scope, profile: ctx.activeProfileId, experiment: meta.id, selected: plan.selected, count: plan.changes.length, baseline: JSON.stringify(inquirySession.model), before: JSON.stringify(model), proposed: plan.model, origin: document.activeElement, done: false, success: false };
      inquiryRequest.current = request; inquiryFocus.current = false; setInquiryNavigation(null); setInquiryBusy(true); setControlsOpen(true); setInquiryOpen(true);
      var run = motionRun.current; if (run) { run.active = false; window.cancelAnimationFrame(run.frame); } setPlaying(false);
      announce(t('inquiry_restoring', 'Restoring drawing settings…'));
      update(function (next) {
        if (inquiryRequest.current !== request) return next;
        var valid = studyAlive.current && request.profile === importProfile.current && next.experiment === request.experiment && JSON.stringify(next.models[request.experiment]) === request.before && !studyBusyRef.current && !importBusyRef.current && !focusBrowse.current && !matchStart.current;
        if (valid) { next.models[request.experiment] = normalizeModel(request.experiment, request.proposed); request.after = JSON.stringify(next.models[request.experiment]); }
        request.success = valid; request.done = true; return next;
      });
    }
    function closeInquiry() {
      if (inquiryRequest.current) return;
      inquiryReportSession.current = null; inquiryReturn.current = true; setControlsOpen(true); setInquiryOpen(true); setInquirySession(null); setPinnedViewIdentity('');
      announce(t('inquiry_closed', 'Starting-view comparison closed. Your current settings and saved pin are kept.'));
    }
    function inquiryStatusText() {
      if (inquiryData.status === 'selected') return format(t('inquiry_one_changed', 'One drawing setting changed: {setting}.'), { setting: comparisonLabel(inquiryData.selected) });
      if (inquiryData.status === 'other') return t('inquiry_other_changed', 'A different setting changed. To explore your chosen setting, return the other setting to its starting value.');
      if (inquiryData.status === 'multiple') return format(t('inquiry_many_changed', '{count} drawing settings changed. Compare one setting at a time to separate their effects.'), { count: inquiryData.changes.length });
      return t('inquiry_none_changed', 'No drawing settings changed. Adjust the setting you chose, then compare your impression.');
    }
    function inquiryPrompt(id) {
      if (id === 'ponzo') return t('inquiry_ponzo_prompt', 'How does the apparent length of the upper bar change when the rails or its position change? Compare again with the rails removed.');
      if (id === 'cafeWall') return t('inquiry_cafe_prompt', 'How does the apparent direction of the mortar bands change?');
      if (id === 'necker') return t('inquiry_cube_prompt', 'Which face seems closest, and does that impression stay steady?');
      return t('inquiry_moire_prompt', 'What changes in the broad bands compared with the fine lines?');
    }
    function impressionText(settings) {
      var index = meta.choices.indexOf(settings.prediction); return index < 0 ? t('not_recorded', 'Not recorded') : t(meta.id + '_choice_' + index, meta.choices[index]);
    }
    function contextHeading(settings) {
      if (meta.id === 'ponzo') return settings.context ? t('perspective_rails_visible', 'Perspective rails visible') : t('perspective_rails_removed', 'Perspective rails removed');
      if (meta.id === 'cafeWall') return settings.context ? t('tiles_visible', 'Tiles visible') : t('tiles_removed', 'Tiles removed');
      if (meta.id === 'necker') return settings.context ? t('face_cue_visible', 'Face cue visible') : t('face_cue_removed', 'Face cue removed');
      if (meta.id === 'moire') return settings.context ? t('both_grids', 'Both grids') : t('first_grid_only', 'First grid only');
      return settings.context ? t('with_surroundings', 'With surroundings') : t('without_surroundings', 'Without surroundings');
    }
    function closeContextComparison() {
      contextReturn.current = true; setContextSession(null); setPinnedViewIdentity('');
      announce(t('context_comparison_closed', 'Surroundings comparison closed. Your experiment settings are kept.'));
    }
    function toggleContextComparison() {
      if (studyLocked || studyBusyRef.current || importBusyRef.current || focusBrowse.current || matchStart.current || inquiryRequest.current || !contextAvailable) return;
      if (contextComparing) { closeContextComparison(); return; }
      inquiryReportSession.current = null; stop(); setInquirySession(null); inquiryReturn.current = false; setPinnedViewIdentity(''); setContextSession({ experiment: meta.id, profile: ctx.activeProfileId });
      announce(t('context_comparison_opened', 'Comparing the same drawing with and without its context. Both views follow your adjustments.'));
    }
    var savedReview = reviewedGroup ? savedStudy(state, reviewedGroup) : null;
    var observationPlan = viewer && viewer.recordId ? planObservationReview(state, viewer.recordId) : null;
    var observationValid = !!observationPlan && observationPlan.status === 'ready' && observationPlan.identity === viewer.identity && !studyLocked && !focusBrowseBusy && !matchStartBusy && !inquiryBusy;
    var viewerValid = !!viewer && viewer.profile === ctx.activeProfileId && !maskStudyViews && !studyBusy && !importBusy && (viewer.recordId ? observationValid : viewer.identity === previewIdentities[viewer.slot] && (!viewer.comparison || viewer.comparison.identity === previewIdentities.b));
    observationSession.current = viewerValid && viewer.recordId ? viewer : null;
    pairedViewerLatest.current = viewerValid && viewer.comparison ? viewer : null;
    var recordedCamera = viewerValid && !viewer.recordId && viewer.inspection || { zoom: 1, x: .5, y: .5, pan: false, open: false };
    var recordedCameraContext = viewerValid && !viewer.recordId ? JSON.stringify([viewer.profile, viewer.groupId, viewer.slot, viewer.identity, viewer.comparison && viewer.comparison.identity, viewer.stacked, viewer.switching, viewer.showing, previewOptions[viewer.slot], viewer.comparison && previewOptions.b]) : '';
    recordedCameraLatest.current = recordedCameraContext ? { viewer: viewer, context: recordedCameraContext, profile: ctx.activeProfileId } : null;
    React.useEffect(function () { cancelRecordedDrag(); return cancelRecordedDrag; }, [recordedCameraContext, recordedCamera.zoom, recordedCamera.pan, recordedCamera.open]);
    React.useEffect(function () {
      var request = recordedInspectFocus.current; if (!request) return;
      recordedInspectFocus.current = null;
      if (!viewerValid || !recordedCamera.open || !recordedCameraReady() || viewer.profile !== request.profile || viewer.groupId !== request.groupId || viewer.identity !== request.identity || !request.target.isConnected || request.target.closest('[hidden],[inert],[aria-hidden=true]')) return;
      var control = document.getElementById(uid + '-recorded-zoom');
      if (control) { control.focus({ preventScroll: true }); control.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); }
    }, [viewer, viewerValid, recordedCamera.open]);
    React.useEffect(function () {
      if (recordedCamera.open) return;
      var active = document.activeElement, panel = document.getElementById(uid + '-recorded-inspector');
      if (panel && active && panel.contains(active)) { var toggle = document.getElementById(uid + '-recorded-inspect'); if (toggle) toggle.focus({ preventScroll: true }); }
    }, [recordedCamera.open]);
    React.useEffect(function () {
      if (!viewerValid || !viewer.comparison || !viewer.switching) return;
      var active = document.activeElement, dialog = viewerRef.current;
      if (dialog && active && dialog.contains(active) && active.closest('[data-viewer-inactive=true]')) {
        var target = document.getElementById(uid + '-viewer-show-' + (viewer.showing === 'b' ? 'b' : 'a')); if (target) target.focus({ preventScroll: true });
      }
    }, [viewerValid, viewer && viewer.switching, viewer && viewer.showing]);
    React.useEffect(function () {
      var dialog = viewerRef.current;
      if (!dialog) return;
      if (viewerValid) {
        if (!dialog.open) {
          try { dialog.showModal(); var heading = document.getElementById(uid + '-viewer-heading'); if (heading) heading.focus(); }
          catch (_) { setViewer(null); announce(viewer.recordId ? t('observation_review_unavailable', 'The saved observation could not open. Try Review observation again.') : t('drawing_viewer_unavailable', 'The enlarged drawing could not open. You can still inspect it in the recorded drawing panel.')); }
        }
      } else {
        if (dialog.open) dialog.close();
        if (viewer) setViewer(null);
        if (viewerReturn.current) returnFromViewer();
      }
    }, [viewer, viewerValid]);
    var browseRequest = focusBrowse.current;
    // A delayed parent commit may change the drawing before the local session is updated.
    // Only a successfully applied request is allowed to bridge that transition.
    var browsedCommit = !!browseRequest && browseRequest.done && browseRequest.success && browseRequest.revision === experimentRevision.current && browseRequest.fingerprint === experimentFingerprint && browseRequest.profile === ctx.activeProfileId && focusSession && focusSession.experiment === browseRequest.from && meta.id === browseRequest.to;
    var focusValid = !!focusSession && focusSession.profile === ctx.activeProfileId && (focusSession.experiment === meta.id || browsedCommit);
    React.useEffect(function () {
      var request = inquiryNavigation; if (!request || inquiryBusy) return;
      setInquiryNavigation(null);
      if (request.profile !== ctx.activeProfileId || request.experiment !== meta.id || !inquiryComparing || request.selected !== inquiryData.selected || request.focused !== !!focusValid) return;
      var target = document.getElementById(inquiryControlId(request.selected));
      if (target && !target.disabled) { target.focus({ preventScroll: true }); if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); }
    }, [inquiryNavigation, inquiryBusy, controlsOpen, inquiryOpen, focusValid, meta.id, ctx.activeProfileId]);
    React.useEffect(function () {
      var request = focusBrowse.current;
      if (!request) return;
      if (request.done || !focusValid || request.revision !== experimentRevision.current) {
        focusBrowse.current = null; setFocusBrowseBusy(false);
        if (browsedCommit && focusValid && request.revision === experimentRevision.current && request.fingerprint === experimentFingerprint) {
          setFocusSession({ experiment: meta.id, profile: ctx.activeProfileId });
          focusBrowseReturn.current = request.control;
          announce(format(t('focus_browse_changed', 'Focused experiment changed to {experiment}.'), { experiment: t(meta.id + '_title', meta.title) }));
        } else if (focusValid) announce(t('focus_browse_expired', 'The experiment changed before browsing finished. Choose an experiment again.'));
      }
    }, [focusValid, meta.id, browseRequest && browseRequest.done, experimentRevision.current]);
    React.useEffect(function () {
      if (!focusValid) { focusBrowseReturn.current = ''; return; }
      if (!focusBrowseReturn.current || focusBrowseBusy) return;
      var dialog = focusRef.current, control = focusBrowseReturn.current; focusBrowseReturn.current = '';
      if (dialog) {
        ['.perception-focus-body', '.perception-controls', '.perception-scenes'].forEach(function (selector) { var node = dialog.querySelector(selector); if (node) { node.scrollTop = 0; node.scrollLeft = 0; } });
        dialog.scrollTop = 0; dialog.scrollLeft = 0;
        var target = dialog.querySelector('[data-perception-focus-' + control + ']'); if (target && !target.disabled) target.focus();
      }
    }, [focusBrowseBusy, focusValid, meta.id]);
    React.useEffect(function () {
      var dialog = focusRef.current;
      if (!dialog) return;
      if (focusValid) {
        if (!dialog.open) {
          try { dialog.showModal(); var heading = document.getElementById(uid + '-focus-heading'); if (heading) heading.focus(); }
          catch (_) { setFocusSession(null); announce(t('focus_unavailable', 'The focused view could not open. Your experiment is still available in the workspace.')); }
        }
      } else {
        if (dialog.open) dialog.close();
        if (focusSession) setFocusSession(null);
        if (focusReturn.current) {
          var target = document.getElementById(focusReturn.current);
          if (target && !target.disabled) { focusReturn.current = false; var active = document.activeElement; if (!active || active === document.body || active === target || !dialog.open && dialog.contains(active)) target.focus(); }
          else if (!target) focusReturn.current = false;
        }
      }
    }, [focusSession, focusValid, studyBusy, importBusy, inquiryBusy]);
    var controlsBusy = studyBusy || focusBrowseBusy || matchStartBusy || inquiryBusy;
    var controls = h('aside', { className: 'perception-controls perception-card', 'aria-label': t('experiment_controls', 'Experiment controls'), 'aria-busy': controlsBusy },
      controlsBusy && pendingStudy.current && pendingStudy.current.kind === 'start' && pendingStudy.current.guide && button(t('cancel_study_plan', 'Cancel study plan'), cancelGuidePlan),
      h('details', { open: controlsOpen, onToggle: function (event) { setControlsOpen(event.currentTarget.open); } },
        h('summary', null, t('adjust_experiment', 'Adjust experiment')),
        h('div', null,
          h('div', null,
            own(MATCHING, meta.id) && h('div', { className: 'perception-actions', role: 'group', 'aria-label': t('experiment_mode', 'Experiment mode') },
              button(t('observe', 'Observe'), function () { setMatching(false); }, { 'aria-pressed': !model.matching, disabled: studyLocked || controlsBusy }),
              button(t('match_by_eye', 'Match by eye'), function () { setMatching(true); }, { 'aria-pressed': model.matching, disabled: studyLocked || controlsBusy })),
            model.matching && h('div', { className: 'perception-matching' },
              h('p', null, t('match_hint', 'Keep the reference fixed. Adjust the right or bottom target until it looks like the reference, then reveal the drawing values.')),
              h('label', { className: 'perception-field', htmlFor: 'perception-match-value' },
                h('span', null, t('comparison_target', 'Comparison target'), model.reveal && h('output', { htmlFor: 'perception-match-value', 'aria-hidden': 'true' }, model.matchValue + ' ' + (meta.id === 'brightness' ? 'RGB' : t('units_label', 'units')))),
                h('input', { id: 'perception-match-value', type: 'range', min: MATCHING[meta.id].min, max: MATCHING[meta.id].max, step: 1, value: model.matchValue, disabled: comparisonLocked || controlsBusy, 'aria-label': t('comparison_target', 'Comparison target'), 'aria-describedby': activeStudy ? uid + '-study-instructions' : undefined, 'aria-valuetext': model.reveal ? model.matchValue + ' ' + (meta.id === 'brightness' ? 'RGB' : t('units_label', 'units')) : format(t('hidden_match_value', '{position} percent of adjustment range; drawing values hidden until reveal.'), { position: Math.round((model.matchValue - MATCHING[meta.id].min) / (MATCHING[meta.id].max - MATCHING[meta.id].min) * 100) }), onChange: function (event) { change({ matchValue: Number(event.target.value) }); } })),
              h('div', { className: 'perception-actions' },
                button(t('decrease_comparison', 'Decrease comparison'), function () { change({ matchValue: model.matchValue - 1 }); }, { disabled: comparisonLocked || controlsBusy || model.matchValue <= MATCHING[meta.id].min }),
                button(t('increase_comparison', 'Increase comparison'), function () { change({ matchValue: model.matchValue + 1 }); }, { disabled: comparisonLocked || controlsBusy || model.matchValue >= MATCHING[meta.id].max }),
                button(t('new_match_start', 'New starting point'), function () { requestMatchStart('new'); }, { 'data-perception-new-match-start': true, 'aria-describedby': uid + '-match-start-hint', disabled: studyLocked || controlsBusy || importBusy }),
                button(t('equalize_match', 'Equalize drawing values'), function () { requestMatchStart('equalize'); }, { 'data-perception-equalize-match': true, 'aria-describedby': uid + '-match-start-hint', disabled: studyLocked || controlsBusy || importBusy })),
              h('p', { id: uid + '-match-start-hint', 'data-perception-match-start-hint': true }, t('match_start_hint', 'New starting point keeps your settings and note, and clears the previous impression and reveal. Equalize drawing values deliberately makes the comparison equal to the reference. Repeated studies use their own starting points.')),
              meta.id === 'ebbinghaus' && h('p', null, t('matching_circle_gap_hint', 'Ring positions stay fixed while you match. The gap setting leaves room for the largest comparison circle.')),
              h('div', { className: 'perception-study', 'data-perception-repeat-active': activeStudy ? activeStudy.id : undefined },
                h('h4', null, t('repeated_study', 'Repeated matching study')),
                h('p', { id: uid + '-study-instructions' }, activeStudy ? collecting ? format(t('study_trial_progress', 'Match {trial} of 3. Adjust the comparison and choose an impression below. Your note is saved with this match; the next match starts with a blank note.'), { trial: activeStudy.trials.length + 1 }) : t('study_all_recorded', 'All three matches are recorded. Reveal the results, or end the study to return to free matching.') : t('study_start_hint', 'Try three separate matches with the reference and surroundings held fixed. Starting positions vary; numbers stay hidden until all three are recorded.')),
                activeStudy && h('p', null, t('study_frozen_hint', 'Surrounding settings stay fixed during this study. The notebook and pinned view return after recording or ending the study.')),
                activeStudy && guidedRun.current && h('p', null, t('guided_collecting', 'One-setting repeat: the baseline reference and starting positions are preserved. The two studies will be selected for comparison after the third match.')),
                !activeStudy && capacity.free < 3 && h('p', { 'data-perception-capacity-reason': 'study' }, capacityMessage(3)),
                h('div', { className: 'perception-actions' },
                  !activeStudy && button(t('start_three_matches', 'Start three matches'), function () { startStudyFrom(); }, { disabled: controlsBusy || importBusy || capacity.free < 3 }),
                  !activeStudy && capacity.free < 3 && button(t('review_notebook_capacity', 'Review notebook'), focusNotebook),
                  collecting && button(t('record_match', 'Record match'), recordMatch, { disabled: !model.prediction || controlsBusy }),
                  activeStudy && !collecting && !activeStudy.revealed && button(t('reveal_study_results', 'Reveal study results'), revealMatches, { disabled: controlsBusy, id: uid + '-reveal-study' }),
                  activeStudy && button(t('end_repeated_study', 'End repeated study'), function () { endStudy(false); }, { disabled: controlsBusy })))),
            inquiryAvailable && h('details', { className: 'perception-study perception-inquiry', 'data-perception-inquiry': true, open: inquiryOpen || inquiryBusy, 'aria-busy': inquiryBusy, onToggle: function (event) { setInquiryOpen(event.currentTarget.open); } },
              h('summary', null, t('inquiry_title', 'Try one change')),
              h('p', { id: uid + '-inquiry-hint' }, t('inquiry_hint', 'Choose a drawing setting and capture a starting view. Adjust that setting, then compare what you see. The starting view stays fixed.')),
              h('label', { className: 'perception-field', htmlFor: uid + '-inquiry-setting' }, t('inquiry_setting', 'Setting to explore'),
                h('select', { id: uid + '-inquiry-setting', 'data-perception-inquiry-setting': true, value: inquiryData.selected, disabled: controlsBusy || studyLocked || importBusy, 'aria-describedby': uid + '-inquiry-hint', onChange: function (event) { if (!inquiryRequest.current && !studyBusyRef.current && !importBusyRef.current && !focusBrowse.current && !matchStart.current) setInquirySetting(event.target.value); } },
                  meta.controls.map(function (control) { return h('option', { key: control.key, value: control.key }, comparisonLabel(control.key)); }),
                  h('option', { value: 'context' }, comparisonLabel('context')),
                  meta.cue && h('option', { value: 'cue' }, comparisonLabel('cue')))),
              button(inquiryBusy ? inquiryRequest.current && inquiryRequest.current.kind === 'capture' ? t('inquiry_capturing', 'Capturing starting view…') : t('inquiry_restoring', 'Restoring drawing settings…') : inquiryComparing ? t('inquiry_replace', 'Replace starting view') : t('inquiry_capture', 'Capture starting view'), captureInquiry, { id: uid + '-inquiry-start', 'data-perception-inquiry-start': true, disabled: controlsBusy || studyLocked || importBusy }),
              inquiryComparing && h(React.Fragment, null,
                h('dl', { className: 'perception-inquiry-values', 'aria-label': comparisonLabel(inquiryData.selected) },
                  h('div', null, h('dt', null, t('inquiry_starting_value', 'Starting value')), h('dd', { 'data-perception-inquiry-value': 'starting' }, comparisonValue(inquiryData.selected, inquirySession.model[inquiryData.selected], inquirySession.model))),
                  h('div', null, h('dt', null, t('inquiry_current_value', 'Current value')), h('dd', { 'data-perception-inquiry-value': 'current' }, comparisonValue(inquiryData.selected, activeModel[inquiryData.selected], activeModel)))),
                h('div', { className: 'perception-actions' },
                  button(t('inquiry_adjust_chosen', 'Adjust chosen setting'), adjustInquirySetting, { 'data-perception-inquiry-adjust': 'controls', 'aria-controls': inquiryControlId(inquiryData.selected), disabled: controlsBusy || studyLocked || importBusy }),
                  button(t('inquiry_restore_chosen', 'Restore chosen setting'), function () { restoreInquiry('selected'); }, { 'data-perception-inquiry-restore': 'selected', disabled: controlsBusy || studyLocked || importBusy || !inquiryData.selectedChanged }),
                  button(t('inquiry_restore_others', 'Restore other settings'), function () { restoreInquiry('others'); }, { 'data-perception-inquiry-restore': 'others', disabled: controlsBusy || studyLocked || importBusy || !inquiryData.otherChanges.length })),
                h('p', null, t('inquiry_restore_hint', 'Restore chosen setting returns only that setting to its starting value. Restore other settings keeps your chosen setting and returns the other changed settings. Both keep your current impression, note, and measurement guides.')),
                h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': true, 'data-perception-inquiry-status': true, 'data-status': inquiryData.status, 'data-count': inquiryData.changes.length }, inquiryStatusText()),
                h('p', { 'data-perception-inquiry-impression': 'starting' }, t('inquiry_start_impression', 'Starting impression') + ': ' + impressionText(inquirySession.model)),
                h('p', { 'data-perception-inquiry-impression': 'current' }, t('inquiry_current_impression', 'Current impression') + ': ' + impressionText(activeModel)),
                button(t('export_inquiry_report', 'Export inquiry report'), exportInquiryReport, { 'data-perception-inquiry-report': true, 'aria-describedby': uid + '-inquiry-report-hint', disabled: controlsBusy || studyLocked || importBusy }),
                h('p', { id: uid + '-inquiry-report-hint' }, t('inquiry_report_hint', 'Keep both drawings, settings, impressions, and notes in a file you can read or print. The report captures the current visible frame.'))),
              h('p', null, inquiryPrompt(meta.id)),
              meta.id === 'ponzo' && h('p', null, t('ponzo_controls_hint', 'Rail convergence at 0% gives parallel rails. Larger values narrow their upper opening. Increasing Upper bar position moves that bar downward; both bars keep their 240-unit width.'))),
            h('fieldset', { className: 'perception-observation' }, h('legend', null, t(meta.id + '_question', meta.question)),
              h('div', { className: 'perception-choices' }, meta.choices.map(function (choice, i) { return button(t(meta.id + '_choice_' + i, choice), function () { change({ prediction: choice }); }, { key: choice, 'aria-pressed': model.prediction === choice, 'data-perception-choice': choice, disabled: comparisonLocked || controlsBusy }); }))),
            h('p', null, t('observation_hint', 'Record your impression. You can revise it; this is an observation, not a scored test.')),
            h('p', { id: uid + '-precision-hint' }, t('precision_hint', 'Exact values apply on Enter or when you leave the field. Escape cancels an edit.')),
            meta.controls.filter(function (control) { return !(model.matching && meta.id === 'brightness' && control.key === 'target'); }).map(function (control) {
              var name = model.matching && meta.id === 'ebbinghaus' && control.key === 'gap' ? t('minimum_surround_gap', 'Minimum surround gap') : t(meta.id + '_' + control.key, control.label);
              return h(PerceptionAdjustment, { key: meta.id + '-' + control.key, React: React, t: t, id: 'perception-' + control.key, hintId: uid + '-precision-hint', name: name, control: control, value: activeModel[control.key], disabled: studyLocked || controlsBusy,
                onBegin: stop, onAdjust: function (value) { stop(); var changeSet = {}; changeSet[control.key] = value; change(changeSet); },
                onReset: function () { stop(); if (activeModel[control.key] !== control.value) { var changeSet = {}; changeSet[control.key] = control.value; change(changeSet); } announce(format(t('setting_reset', '{setting} reset to {value}{unit}.'), { setting: name, value: control.value, unit: control.unit })); } });
            }),
            meta.cue && h('label', { className: 'perception-field', htmlFor: 'perception-cue' }, t('depth_cue', 'Face cue'), h('select', { id: 'perception-cue', value: model.cue, disabled: controlsBusy, onChange: function (event) { change({ cue: event.target.value }); } }, h('option', { value: 'none' }, t('no_cue', 'No cue')), h('option', { value: 'front' }, t('lower_left_face', 'Lower left face')), h('option', { value: 'back' }, t('upper_right_face', 'Upper right face')))),
            h('div', { className: 'perception-actions' }, button(t('remove_surroundings', 'Remove surroundings'), function () { stop(); change({ context: !model.context }); }, { id: uid + '-context-toggle', 'data-perception-context-toggle': true, 'aria-pressed': !model.context, disabled: studyLocked || controlsBusy }), button(t('reveal_measurements', 'Reveal measurements'), function () { stop(); change({ reveal: !model.reveal }); }, { 'aria-pressed': model.reveal, disabled: studyLocked || controlsBusy })),
            own(MATCHING, meta.id) && button(t('swap_surroundings', 'Swap surroundings'), function () { change({ swap: !model.swap }); }, { 'aria-pressed': model.swap, disabled: studyLocked || controlsBusy || !model.context }),
            meta.id === 'moire' && button(playing ? t('pause_rotation', 'Pause rotation') : t('play_rotation', 'Play slow rotation'), function () { if (focusBrowse.current || inquiryRequest.current) return; if (playing || (motionMedia && motionMedia.matches)) stop(); else setPlaying(true); }, { disabled: !model.context || reducedMotion || controlsBusy, 'aria-pressed': playing }),
            meta.id === 'moire' && reducedMotion && h('p', null, t('reduced_motion_hint', 'Reduced motion is enabled. Use the crossing-angle slider to compare still frames.')),
            button(t('reset_experiment', 'Reset this experiment'), function () { stop(); change(normalizeModel(meta.id, {})); announce(t('experiment_reset', 'This experiment was reset.')); }, { disabled: studyLocked || controlsBusy })),
          h('div', null,
            h('label', { className: 'perception-field', htmlFor: 'perception-note' }, t('observation_note', 'Observation note'), h('textarea', { id: 'perception-note', className: 'perception-note', maxLength: 500, value: model.note, disabled: comparisonLocked || controlsBusy, placeholder: t('note_placeholder', 'What changed when you adjusted the surroundings?'), onChange: function (event) { change({ note: event.target.value }); } })),
            !studyLocked && capacity.free < 1 && h('p', { 'data-perception-capacity-reason': 'save' }, capacityMessage(1)),
            h('div', { className: 'perception-actions' }, button(t('save_observation', 'Save observation'), save, { disabled: studyLocked || controlsBusy || !model.prediction || capacity.free < 1 }), button(t('pin_comparison', 'Pin comparison'), function () { if (matchStart.current || inquiryRequest.current) return; inquiryReportSession.current = null; stop(); setInquirySession(null); setContextSession(null); update(function (next) { next.comparison = { experiment: meta.id, model: normalizeModel(meta.id, activeModel) }; return next; }); announce(t('comparison_pinned', 'Current settings pinned. Adjust the experiment to compare.')); }, { disabled: maskStudyViews || focusBrowseBusy || (matchStartBusy || inquiryBusy) }), button(t('export_svg', 'Export SVG'), exportSVG, { disabled: controlsBusy || activeStudy && !activeStudy.revealed }), button(pngBusy ? t('png_exporting', 'Creating PNG…') : t('export_png', 'Export PNG'), exportPNG, { disabled: pngBusy || controlsBusy || activeStudy && !activeStudy.revealed, 'aria-busy': pngBusy, title: t('png_export_size', '2400 × 1440 pixels with a white background'), 'data-perception-export-png': true })),
            h('p', null, t('viewing_hint', 'The viewing area uses a fixed white background to keep comparisons consistent. Different people may notice different effects.')),
            h('p', null, model.matching && meta.id === 'brightness' ? t('matching_art_handoff_hint', 'Art Studio uses the reference gray for both center squares. Your unequal visual match is kept in Perception Lab.') : t('art_handoff_hint', 'Art Studio adapts shared pattern settings for composition. Your experiments and observations stay here.'))))));
    var clearComparisonFocus = React.useRef(false);
    React.useEffect(function () { if (!hasComparison && clearComparisonFocus.current) { clearComparisonFocus.current = false; var heading = document.getElementById(uid + '-current-view'); if (heading) heading.focus(); } }, [hasComparison]);
    var sceneActions = h('div', { className: 'perception-actions perception-scene-actions' },
      button(h(React.Fragment, null, t('inspect_drawing', 'Inspect drawing'), cameraBadge()), function () { setCameraView({ open: !camera.open }); }, { 'data-perception-inspect-drawing': true, 'aria-expanded': camera.open, 'aria-controls': uid + '-drawing-inspector', 'aria-label': format(t('camera_toggle_label', 'Inspect drawing, {percent}% magnification'), { percent: camera.zoom * 100 }), 'aria-describedby': studyLocked ? uid + '-camera-study-locked' : undefined, disabled: !cameraEnabled }),
      studyLocked && h('p', { id: uid + '-camera-study-locked', 'data-perception-camera-study-locked': true }, t('camera_study_locked', 'Drawing inspection is paused during this study. The whole drawing stays visible.')),
      button(t('compare_surroundings', 'Compare surroundings'), toggleContextComparison, { id: uid + '-compare-context', 'data-perception-compare-context': true, 'aria-pressed': contextComparing, 'aria-controls': uid + '-live-pair', 'aria-describedby': !contextAvailable ? uid + '-context-unavailable' : contextComparing ? uid + '-context-hint' : undefined, disabled: !contextAvailable || studyLocked || controlsBusy || importBusy }),
      button(state.expanded ? t('compact_view', 'Compact viewing area') : t('expand_view', 'Expand viewing area'), function () { update(function (next) { next.expanded = !next.expanded; return next; }); setControlsOpen(state.expanded); }, { 'aria-pressed': state.expanded }),
      !focusValid && button(t('focus_experiment', 'Focus experiment'), openFocusedExperiment, { id: uid + '-focus-open', 'aria-haspopup': 'dialog', disabled: studyBusy || importBusy || inquiryBusy }),
      !contextAvailable && h('p', { id: uid + '-context-unavailable', 'data-perception-context-unavailable': true }, t('context_cube_hint', 'Choose a face cue in the controls to compare the cube with and without that cue.')));
    var sceneSupplement = h(React.Fragment, null,
          activeStudy && h('section', { className: 'perception-card perception-study-result', 'aria-label': t('repeated_study', 'Repeated matching study') },
            h('h3', { id: uid + '-study-results', tabIndex: -1 }, t('repeated_study', 'Repeated matching study')),
            studyProgressView(activeStudy),
            collecting ? h('p', null, format(t('study_scene_progress', '{count} of 3 matches recorded. Make each match by eye with the same surroundings.'), { count: activeStudy.trials.length })) : activeStudy.revealed ? summaryView(activeStudy, 'active') : h('p', null, t('study_results_hidden', 'Three matches recorded. Use Reveal study results in the controls to see their drawing values, median, and range.'))),
          !contextComparing && liveReference && !maskStudyViews && liveReference.experiment === meta.id && h('section', { className: 'perception-card perception-deltas', 'aria-label': inquiryComparing ? t('inquiry_changes', 'Changes from starting view') : t('changes_from_pinned', 'Changes from pinned view') },
            h('h3', null, inquiryComparing ? t('inquiry_changes', 'Changes from starting view') : t('changes_from_pinned', 'Changes from pinned view')),
            h('p', null, inquiryComparing ? t('inquiry_scale_hint', 'Both drawings use the same scale. The starting view keeps the settings captured at that moment.') : t('equal_scale_hint', 'Both drawings use the same scale. Matching target values stay hidden in each view until that view is revealed.')),
            changedSettings.length ? h('table', null,
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('setting_label', 'Setting')), h('th', { scope: 'col' }, inquiryComparing ? t('inquiry_starting_view', 'Starting view') : t('pinned_label', 'Pinned')), h('th', { scope: 'col' }, t('current_label', 'Current')))),
              h('tbody', null, changedSettings.map(function (item) { return h('tr', { key: item.key, 'data-perception-change': item.key }, h('th', { scope: 'row' }, comparisonLabel(item.key)), h('td', null, comparisonValue(item.key, item.before, liveReference.model)), h('td', null, comparisonValue(item.key, item.after, activeModel))); }))) : h('p', null, t('no_settings_changed', 'No drawing settings have changed.'))));
    function slideReady() {
      return studyAlive.current && ctx.activeProfileId === importProfile.current && hasComparison && slideAvailable && liveLayout === 'slide' && !maskStudyViews && !studyBusyRef.current && !importBusyRef.current && !focusBrowse.current && !matchStart.current && !inquiryRequest.current;
    }
    function setSlidePosition(value) {
      if (!slideReady() || !Number.isFinite(value)) return;
      setSlideSession({ identity: slideIdentity, position: Math.max(0, Math.min(100, Math.round(value))) });
    }
    function cancelSlideDrag() {
      var drag = slideDrag.current; slideDrag.current = null;
      if (drag && drag.target && typeof drag.target.hasPointerCapture === 'function' && drag.target.hasPointerCapture(drag.pointer)) {
        try { drag.target.releasePointerCapture(drag.pointer); } catch (_) {}
      }
    }
    function slidePointerPosition(event) {
      var drag = slideDrag.current, stage = slideStageRef.current;
      if (!drag || drag.pointer !== event.pointerId) return;
      if (drag.identity !== slideIdentity || drag.stage !== stage || !drag.target.isConnected || !stage || !stage.isConnected || !slideReady()) { cancelSlideDrag(); return; }
      var rect = stage.getBoundingClientRect(); if (rect.width > 0) setSlidePosition((event.clientX - rect.left) / rect.width * 100);
    }
    function startSlideDrag(event) {
      if (!slideReady() || event.button !== 0 || event.isPrimary === false || !slideStageRef.current) return;
      if (slideDrag.current || cameraDrag.current) return;
      event.preventDefault();
      slideDrag.current = { pointer: event.pointerId, target: event.currentTarget, stage: slideStageRef.current, identity: slideIdentity };
      if (typeof event.currentTarget.setPointerCapture === 'function') { try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {} }
      var input = document.getElementById(uid + '-slide-position'); if (input) input.focus({ preventScroll: true });
      slidePointerPosition(event);
    }
    function cancelSlidePointer(event) { if (slideDrag.current && slideDrag.current.pointer === event.pointerId) cancelSlideDrag(); }
    function finishSlideDrag(event) { if (slideDrag.current && slideDrag.current.pointer === event.pointerId) { slidePointerPosition(event); cancelSlideDrag(); } }
    React.useEffect(function () { setSlideSession(function (previous) { return previous.identity === slideIdentity ? previous : { identity: slideIdentity, position: 50 }; }); }, [slideIdentity]);
    React.useEffect(function () { cancelSlideDrag(); return cancelSlideDrag; }, [slideIdentity, liveLayout, focusValid, controlsBusy, importBusy]);
    function slideValueText() {
      if (slidePosition === 0 || slidePosition === 100) return format(t('slide_entire', '{view} fills the drawing area.'), { view: slidePosition === 100 ? slideCurrentLabel : slideReferenceLabel });
      return format(t('slide_share', '{current}: {currentPercent}% · {reference}: {referencePercent}%'), { current: slideCurrentLabel, currentPercent: slidePosition, reference: slideReferenceLabel, referencePercent: 100 - slidePosition });
    }
    function slideComparison() {
      return h('section', { className: 'perception-card perception-slide-comparison', 'data-perception-slide-comparison': true, 'aria-label': t('comparison_slide', 'Slide drawings') },
        h('figure', { className: 'perception-slide-figure' },
          h('figcaption', { className: 'perception-slide-labels', dir: 'ltr' },
            h('div', { dir: 'auto' }, h('strong', { id: uid + '-current-view', tabIndex: -1 }, slideCurrentLabel), h('span', null, t(meta.id + '_title', meta.title))),
            h('div', { dir: 'auto' }, h('strong', null, slideReferenceLabel), h('span', null, t(liveReference.experiment + '_title', experiment(liveReference.experiment).title)))),
          cameraBadge(),
          h('div', Object.assign(cameraViewportProps('combined', t('live_comparison', 'Live comparison')), { ref: slideStageRef, className: 'perception-slide-stage perception-camera-viewport', 'data-perception-slide-stage': true, 'data-position': slidePosition, style: { '--perception-slide-position': slidePosition + '%' } }),
            h('div', { className: 'perception-slide-layer perception-comparison', 'data-perception-slide-layer': 'reference' }, cameraLayer(liveReference.experiment, liveReference.model, true)),
            h('div', { className: 'perception-slide-layer perception-live-stage', 'data-perception-slide-layer': 'current', style: { clipPath: 'inset(0 ' + (100 - slidePosition) + '% 0 0)' } }, cameraLayer(meta.id, activeModel, false)),
            h('div', { className: 'perception-slide-divider', 'aria-hidden': true, 'data-endpoint': slidePosition === 0 || slidePosition === 100 }),
            h('div', { className: 'perception-slide-drag', 'data-perception-slide-drag': true, 'aria-hidden': true, onPointerDown: startSlideDrag, onPointerMove: slidePointerPosition, onPointerUp: finishSlideDrag, onPointerCancel: cancelSlidePointer, onLostPointerCapture: cancelSlidePointer }))),
        h('label', { className: 'perception-field perception-slide-range', htmlFor: uid + '-slide-position' }, h('span', null, t('slide_divider', 'Divider position')),
          h('input', { id: uid + '-slide-position', type: 'range', min: 0, max: 100, step: 1, value: slidePosition, dir: 'ltr', disabled: controlsBusy || importBusy, 'data-perception-slide-position': true, 'aria-describedby': uid + '-comparison-hint', 'aria-controls': uid + '-live-pair', 'aria-valuetext': slideValueText(), onChange: function (event) { setSlidePosition(Number(event.target.value)); } }),
          h('output', { htmlFor: uid + '-slide-position', 'aria-hidden': true }, slideValueText())),
        h('div', { className: 'perception-actions perception-slide-actions' },
          button(t('slide_current_only', 'Current only'), function () { setSlidePosition(100); }, { 'data-perception-slide-show': 'current', 'aria-pressed': slidePosition === 100, 'aria-controls': uid + '-live-pair', disabled: controlsBusy || importBusy }),
          button(t('slide_reference_only', 'Comparison only'), function () { setSlidePosition(0); }, { 'data-perception-slide-show': 'reference', 'aria-pressed': slidePosition === 0, 'aria-controls': uid + '-live-pair', disabled: controlsBusy || importBusy }),
          button(t('slide_center', 'Center divider'), function () { setSlidePosition(50); }, { 'data-perception-slide-show': 'center', 'aria-pressed': slidePosition === 50, 'aria-controls': uid + '-live-pair', disabled: controlsBusy || importBusy })),
        (model.reveal || liveReference.model.reveal) && h('div', { className: 'perception-slide-readings' },
          model.reveal && h('div', { className: 'perception-reading', 'data-perception-result': 'true' }, h('h4', null, slideCurrentLabel), h('strong', null, resultText(meta.id, activeModel)), h('p', null, explanationText(meta.id, model)), h('a', { href: meta.source, target: '_blank', rel: 'noopener noreferrer' }, t('reference', 'Scientific reference: Michael Bach'))),
          liveReference.model.reveal && h('div', { className: 'perception-reading' }, h('h4', null, slideReferenceLabel), h('p', null, resultText(liveReference.experiment, liveReference.model)))));
    }
    var workspace = h('div', { className: 'perception-workspace' }, controls,
        h('div', { className: 'perception-scenes', 'data-comparing': String(hasComparison) },
          hasComparison && h('section', { className: 'perception-card perception-comparison-tools', 'aria-label': t('live_comparison', 'Live comparison'), 'data-perception-comparison-tools': true },
            h('div', { className: 'perception-comparison-toolbar' },
              h('label', { className: 'perception-field', htmlFor: uid + '-comparison-layout' }, h('span', null, t('comparison_layout', 'Comparison layout')),
                h('select', { id: uid + '-comparison-layout', 'data-perception-comparison-layout': true, 'aria-describedby': uid + '-comparison-hint', value: liveLayout, 'aria-controls': uid + '-live-pair', onChange: function (event) { var value = event.target.value; if (['auto', 'stacked', 'switch', 'slide'].indexOf(value) < 0 || value === 'slide' && !slideAvailable) return; if (value === 'switch') stop(); cancelSlideDrag(); setPinnedViewIdentity(''); setComparisonLayout(value); } },
                  h('option', { value: 'auto' }, t('comparison_side_by_side', 'Side by side')),
                  h('option', { value: 'stacked' }, t('comparison_stacked', 'Stacked')),
                  h('option', { value: 'switch' }, t('comparison_switch', 'Switch views')),
                  h('option', { value: 'slide', disabled: !slideAvailable }, t('comparison_slide', 'Slide drawings')))),
              sceneActions,
              inquiryComparing ? button(t('inquiry_close', 'Close starting-view comparison'), closeInquiry, { 'data-perception-end-inquiry': true, disabled: inquiryBusy }) : contextComparing ? button(t('close_context_comparison', 'Close surroundings comparison'), closeContextComparison, { 'data-perception-close-context': true }) : button(t('clear_comparison', 'Clear comparison'), function () { if (inquiryRequest.current) return; clearComparisonFocus.current = true; setPinnedViewIdentity(''); update(function (next) { next.comparison = null; return next; }); }, { 'data-perception-clear-comparison': true, disabled: inquiryBusy })),
            drawingInspectionTools(),
            h('p', { id: uid + '-comparison-hint' }, liveLayout === 'slide' ? t('comparison_slide_hint', 'Move the divider to inspect both drawings in the same position. This combines parts of two drawings; Switch views shows each complete drawing.') : liveLayout === 'switch' ? t('comparison_switch_hint', 'Switch between drawings in the same position. Controls and exports use the current experiment; changing a drawing setting brings it into view.') : liveLayout === 'stacked' ? t('comparison_stacked_hint', 'Each drawing uses the full available width at the same scale.') : t('comparison_columns_hint', 'Drawings sit side by side when space allows, and stack on narrower screens. Both use the same scale.')),
            !slideAvailable && h('p', { 'data-perception-slide-unavailable': true }, t('comparison_slide_unavailable', 'Slide drawings is available when both views use the same experiment.')),
            inquiryComparing && h('div', { className: 'perception-context-explanation', 'data-perception-inquiry-comparison': true },
              h('h3', null, t('inquiry_title', 'Try one change')),
              h('p', null, t('inquiry_comparison_hint', 'Compare the fixed starting view with your current drawing at the same scale. Switch views to compare them in the same position.')),
              button(t('inquiry_adjust_chosen', 'Adjust chosen setting'), adjustInquirySetting, { 'data-perception-inquiry-adjust': 'scene', 'aria-controls': inquiryControlId(inquiryData.selected), disabled: controlsBusy || studyLocked || importBusy }),
              h('p', null, t('inquiry_hidden_hint', 'The count describes drawing settings. A hidden grid or face cue may make a setting change invisible. Notes, impressions, and measurement guides are not counted.')),
              h('p', null, t('inquiry_save_hint', 'Save observation and SVG/PNG exports use the current drawing. Export inquiry report in the guide keeps both snapshots. The starting view is temporary; your saved pin is kept.'))),
            contextComparing && h('div', { className: 'perception-context-explanation', 'data-perception-context-comparison': true },
              h('h3', null, t('inspect_surroundings', 'Inspect surroundings')),
              h('p', { id: uid + '-context-hint' }, t('context_comparison_hint', 'Only the context differs. Adjust one setting and compare your impressions. Both drawings follow your adjustments.')),
              h('details', null, h('summary', null, t('context_comparison_guide', 'Comparison guide')),
                h('p', null, t('context_same_position', 'Choose Switch views to inspect both drawings in the same position. Changing a drawing setting brings the current experiment into view.')),
                meta.id === 'ponzo' && h('p', null, t('context_ponzo_hint', 'Removing the perspective rails keeps both bars at the same positions and lengths. Reveal measurements to compare their aligned horizontal endpoints.')),
                meta.id === 'cafeWall' && h('p', null, t('context_tiles_hint', 'Removing the tiles leaves a flat gray field. Reveal measurements to see horizontal mortar guides in both views.')),
                meta.id === 'necker' && h('p', null, t('context_face_hint', 'The second view adds or removes the selected face cue. The wireframe stays the same; a cue does not establish one correct interpretation.')),
                h('p', null, t('context_current_only', 'Save observation and drawing exports use the current experiment in the controls. The second view is a live comparison.'))),
              state.comparison && h('p', null, t('context_pin_kept', 'Your pinned comparison is kept. Close this comparison to return to it.'))),
            liveLayout === 'switch' && h('div', { className: 'perception-switch-views', role: 'group', 'aria-label': t('comparison_visible_drawing', 'Visible drawing'), 'aria-describedby': uid + '-comparison-hint' },
              button(h(React.Fragment, null, h('strong', null, contextComparing ? contextHeading(activeModel) : t('current_experiment', 'Current experiment')), h('span', null, contextComparing ? t('current_experiment', 'Current experiment') + ' · ' : '', t(meta.id + '_title', meta.title))), function () { setPinnedViewIdentity(''); }, { 'data-perception-show-current': true, 'aria-pressed': !showingPinned, 'aria-controls': uid + '-live-pair' }),
              button(h(React.Fragment, null, h('strong', null, inquiryComparing ? t('inquiry_starting_view', 'Starting view') : contextComparing ? contextHeading(liveReference.model) : t('pinned_reference', 'Pinned comparison')), h('span', null, contextComparing ? t('live_comparison', 'Live comparison') + ' · ' : '', t(liveReference.experiment + '_title', experiment(liveReference.experiment).title))), function () { stop(); setPinnedViewIdentity(liveComparisonIdentity); }, { 'data-perception-show-pinned': true, 'aria-pressed': showingPinned, 'aria-controls': uid + '-live-pair' }))),
          h('div', { className: 'perception-live-pair', id: uid + '-live-pair', tabIndex: focusValid ? -1 : undefined, role: focusValid ? 'region' : undefined, 'aria-label': focusValid ? t('experiment_drawings', 'Experiment drawings') : undefined, 'data-comparing': String(hasComparison), 'data-layout': liveLayout },
          liveLayout === 'slide' ? slideComparison() : h(React.Fragment, null,
          h('div', { className: 'perception-card perception-live-stage', 'data-comparison-inactive': String(showingPinned), 'aria-hidden': showingPinned ? true : undefined, inert: showingPinned ? '' : undefined },
          !hasComparison && sceneActions,
           !hasComparison && drawingInspectionTools(),
          figure(meta.id, activeModel, false, contextComparing ? contextHeading(activeModel) : undefined),
          model.reveal && h('div', { className: 'perception-reading', 'data-perception-result': 'true' }, h('strong', null, resultText(meta.id, activeModel)), h('p', null, explanationText(meta.id, model)), h('a', { href: meta.source, target: '_blank', rel: 'noopener noreferrer' }, t('reference', 'Scientific reference: Michael Bach')))),
          hasComparison && h('div', { className: 'perception-card perception-comparison', 'data-comparison-inactive': String(liveLayout === 'switch' && !showingPinned), 'aria-hidden': liveLayout === 'switch' && !showingPinned ? true : undefined, inert: liveLayout === 'switch' && !showingPinned ? '' : undefined },
            figure(liveReference.experiment, liveReference.model, true, inquiryComparing ? t('inquiry_starting_view', 'Starting view') : contextComparing ? contextHeading(liveReference.model) : undefined),
            liveReference.model.reveal && h('p', null, resultText(liveReference.experiment, liveReference.model))))), sceneSupplement));
    var focusBrowseLocked = studyLocked || studyBusy || importBusy || focusBrowseBusy || matchStartBusy || inquiryBusy;
    var focusExperimentIndex = EXPERIMENTS.indexOf(meta), previousExperiment = EXPERIMENTS[(focusExperimentIndex + EXPERIMENTS.length - 1) % EXPERIMENTS.length], nextExperiment = EXPERIMENTS[(focusExperimentIndex + 1) % EXPERIMENTS.length];
    var statusView = h('div', { className: 'perception-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, status);
    return h('section', { 'data-perception-lab': 'true', 'data-perception-theme': ctx.isContrast || ctx.theme === 'contrast' ? 'contrast' : ctx.isDark || ctx.theme === 'dark' ? 'dark' : 'light', 'data-perception-expanded': String(state.expanded), onKeyDown: function (event) { if (event.key === 'Escape') { stop(); if (state.expanded) { update(function (next) { next.expanded = false; return next; }); setControlsOpen(true); } } } },
      h('style', null, CSS),
      h('header', { className: 'perception-heading' }, h('div', null, h('div', { className: 'perception-eyebrow' }, t('eyebrow', 'Observe · adjust · compare')), h('h2', null, t('title', 'Perception Lab')), h('p', null, t('intro', 'Explore how an image and its surroundings shape what you see. Make a prediction, change one variable, then reveal the drawing.'))),
        h('div', { className: 'perception-actions' }, button(t('all_tools', 'All tools'), function () { openTool(null); }), button(t('open_art', 'Open Art Studio'), function () { openTool('artStudio'); }), button(t('open_optics', 'Open Optics Lab'), function () { openTool('opticsLab'); }))),
      h('nav', { className: 'perception-experiments', 'aria-label': t('choose_experiment', 'Choose an experiment') }, EXPERIMENTS.map(function (item, index) { return button(h(React.Fragment, null, experimentThumbnails[index], h('span', { className: 'perception-experiment-copy' }, h('strong', null, t(item.id + '_title', item.title)), h('small', null, t(item.id + '_family', item.family)))), function () { selectExperiment(item.id); }, { key: item.id, 'aria-pressed': item.id === meta.id, 'data-perception-experiment': item.id }); })),
      h('label', { className: 'perception-mobile-picker', htmlFor: 'perception-experiment-picker' }, t('choose_experiment', 'Choose an experiment'), h('select', { id: 'perception-experiment-picker', value: meta.id, onChange: function (event) { selectExperiment(event.target.value); } }, EXPERIMENTS.map(function (item) { return h('option', { key: item.id, value: item.id }, t(item.id + '_title', item.title)); }))),
      !focusValid && workspace,
      !focusValid && statusView,
      h('section', { className: 'perception-card perception-journal', 'aria-label': t('notebook', 'Observation notebook') },
        h('div', { className: 'perception-notebook-heading' }, h('h3', { id: uid + '-notebook', tabIndex: -1 }, t('notebook', 'Observation notebook')),
          h('div', { className: 'perception-actions' }, deleted && button(t('undo_deletion', 'Undo deletion'), undoDeletion, { id: uid + '-undo', disabled: maskStudyViews || importBusy || capacity.free < undoCount }), importUndo && button(t('undo_import', 'Undo import'), undoImport, { id: uid + '-import-undo', disabled: studyLocked || studyBusy || importBusy || (matchStartBusy || inquiryBusy) }), button(t('import_notebook', 'Import notebook'), openImport, { id: uid + '-import-open', disabled: studyLocked || studyBusy || importBusy || (matchStartBusy || inquiryBusy) }), button(t('export_notebook', 'Export notebook'), exportNotebook, { disabled: maskStudyViews || importBusy || !state.studies.length }))),
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
      h('dialog', { ref: focusRef, className: 'perception-focus-dialog', 'data-perception-focus-dialog': true, 'aria-labelledby': uid + '-focus-heading', 'aria-describedby': uid + '-focus-hint', onCancel: function (event) { event.preventDefault(); event.stopPropagation(); closeFocusedExperiment(); }, onClose: function (event) { if (!event.currentTarget.open) setFocusSession(null); }, onKeyDown: focusedExperimentKeyDown },
        focusValid && h(React.Fragment, null,
          h('header', { className: 'perception-focus-heading' }, h('div', null, h('h2', { id: uid + '-focus-heading', tabIndex: -1 }, format(t('focused_experiment', 'Focused experiment: {experiment}'), { experiment: t(meta.id + '_title', meta.title) })), h('p', { className: 'perception-focus-description', 'data-perception-focus-description': true }, focusedDescription()), h('p', { id: uid + '-focus-hint' }, t('focus_hint', 'In compact view, controls and drawings scroll separately when space allows. Closing this view keeps your drawing, notes, and layout.'))), h('nav', { className: 'perception-focus-navigation', 'aria-label': t('focused_navigation', 'Focused workspace navigation') }, button(t('close_focus', 'Back to workspace'), closeFocusedExperiment, { 'data-perception-close-focus': true }), button(t('go_to_drawing', 'Go to drawing'), function () { focusWorkspacePart('drawing'); }, { 'data-perception-focus-drawing': true, 'aria-controls': uid + '-live-pair' }), button(t('go_to_controls', 'Go to controls'), function () { focusWorkspacePart('controls'); }, { 'data-perception-focus-controls': true }))),
          h('div', { className: 'perception-focus-browser', role: 'group', 'aria-label': t('focus_browse', 'Browse experiments'), 'aria-busy': focusBrowseBusy },
            h('label', { className: 'perception-field', htmlFor: uid + '-focus-picker' }, t('choose_experiment', 'Choose an experiment'),
              h('select', { id: uid + '-focus-picker', 'data-perception-focus-picker': true, 'aria-describedby': uid + '-focus-browse-hint', value: meta.id, disabled: focusBrowseLocked, onChange: function (event) { browseFocusedExperiment(event.target.value, 'picker'); } }, EXPERIMENTS.map(function (item) { return h('option', { key: item.id, value: item.id }, t(item.id + '_title', item.title)); }))),
            h('div', { className: 'perception-actions' },
              button(t('previous_experiment_short', 'Previous'), function () { browseFocusedExperiment(previousExperiment.id, 'previous'); }, { 'data-perception-focus-previous': true, disabled: focusBrowseLocked, 'aria-describedby': uid + '-focus-browse-hint', 'aria-label': format(t('previous_experiment', 'Previous experiment: {experiment}'), { experiment: t(previousExperiment.id + '_title', previousExperiment.title) }) }),
              button(t('next_experiment_short', 'Next'), function () { browseFocusedExperiment(nextExperiment.id, 'next'); }, { 'data-perception-focus-next': true, disabled: focusBrowseLocked, 'aria-describedby': uid + '-focus-browse-hint', 'aria-label': format(t('next_experiment', 'Next experiment: {experiment}'), { experiment: t(nextExperiment.id + '_title', nextExperiment.title) }) })),
            h('p', { id: uid + '-focus-browse-hint' }, studyLocked ? t('focus_browse_locked', 'End the repeated study before choosing another experiment.') : focusBrowseBusy ? t('focus_browse_pending', 'Opening experiment…') : t('focus_browse_hint', 'Choose another drawing here. Your settings and notes are kept for each experiment.'))),
          h('div', { className: 'perception-focus-body' }, workspace), statusView)),
      h('dialog', { ref: viewerRef, className: 'perception-drawing-viewer', 'data-perception-drawing-viewer': true, 'data-observation-review': !!(viewer && viewer.recordId), 'aria-labelledby': uid + '-viewer-heading', 'aria-describedby': uid + '-viewer-hint', onCancel: function (event) { event.preventDefault(); event.stopPropagation(); closeRecordedViewer(); }, onClose: function () { setViewer(null); }, onKeyDown: recordedViewerKeyDown },
        viewerValid && h(React.Fragment, null,
          h('header', null, h('div', null, viewer.recordId && h('p', { className: 'perception-observation-eyebrow' }, t('saved_observation_review', 'Saved observation')), h('h2', { id: uid + '-viewer-heading', tabIndex: -1 }, viewer.recordId ? t(observationPlan.record.experiment + '_title', experiment(observationPlan.record.experiment).title) : viewer.comparison ? t('enlarged_comparison_drawings', 'Compare recorded drawings') : t('enlarged_recorded_drawing', 'Enlarged recorded drawing'))), button(viewer.recordId ? t('observation_close', 'Close') : t('close_drawing_viewer', 'Close enlarged drawing'), closeRecordedViewer, { 'data-perception-close-viewer': true, 'aria-label': t('close_drawing_viewer', 'Close enlarged drawing') })),
          !viewer.recordId && h('p', { id: uid + '-viewer-hint' }, viewer.comparison ? t('comparison_viewer_hint', 'Choose trials and guides for A and B independently. Both drawings use the same scale. Saved observations stay unchanged.') : t('drawing_viewer_hint', 'Choose a trial and toggle measurement guides. Saved observations stay unchanged.')),
          !viewer.recordId && recordedInspectionTools(),
          viewer.recordId ? observationPreview(observationPlan) : viewer.comparison ? h(React.Fragment, null,
            h('div', { className: 'perception-actions perception-viewer-layout' },
              button(t('stack_comparison_drawings', 'Stack drawings for more space'), function () { updatePairedViewer({ stacked: viewer.switching || !viewer.stacked, switching: false }); }, { 'data-perception-viewer-stack': true, 'aria-pressed': !viewer.switching && viewer.stacked, 'aria-controls': uid + '-viewer-pair' }),
              button(t('viewer_switch_drawings', 'Switch drawings in one position'), function () { updatePairedViewer({ switching: !viewer.switching, showing: 'a' }); }, { 'data-perception-viewer-switch': true, 'aria-pressed': !!viewer.switching, 'aria-controls': uid + '-viewer-pair' })),
            viewer.switching && recordedSwitchControls(),
            h('div', { id: uid + '-viewer-pair', className: 'perception-viewer-pair', 'data-perception-viewer-pair': true, 'data-layout': viewer.switching ? 'switch' : viewer.stacked ? 'stacked' : 'auto', 'data-stacked': String(viewer.stacked) }, recordedPreview(viewer.groupId, viewer.slot, viewer.heading, 'viewer-a'), recordedPreview(viewer.comparison.groupId, 'b', viewer.comparison.heading, 'viewer-b'))) :
            recordedPreview(viewer.groupId, viewer.slot, viewer.heading, true))));
  }
  window.StemLab.PerceptionEngine = { normalize: normalize, normalizeModel: normalizeModel, scene: scene, experiments: EXPERIMENTS, matching: MATCHING, measurements: measurements, newMatchStart: newMatchStart, notebookCapacity: notebookCapacity, deleteSavedStudy: deleteSavedStudy, restoreDeletedStudy: restoreDeletedStudy, deleteStudy: deleteStudy, restoreDeleted: restoreDeleted, parseNotebook: parseNotebook, planNotebookImport: planNotebookImport, notebookView: notebookView, comparisonChanges: comparisonChanges, inquiryChanges: inquiryChanges, planInquiryRestore: planInquiryRestore, planInquiryReport: planInquiryReport, createStudy: createStudy, normalizeStudy: normalizeStudy, studyModel: studyModel, sameStudySettings: sameStudySettings, recordStudyTrial: recordStudyTrial, studySummary: studySummary, revealStudy: revealStudy, savedStudy: savedStudy, revealSavedStudy: revealSavedStudy, recordedTrial: recordedTrial, planObservationReview: planObservationReview, planStudyReport: planStudyReport, guidedSettings: guidedSettings, planRepeat: planRepeat, savedStudies: savedStudies, compareStudies: compareStudies, defaults: function () { return normalize({}); } };
  window.StemLab.registerTool('perceptionLab', { icon: '👁', label: 'Perception Lab', desc: 'Seven adjustable visual experiments with predictions, comparisons, measurements, and saved observations.', color: 'cyan', category: 'science', render: function (ctx) { return ctx.React.createElement(PerceptionLab, { ctx: ctx, key: ctx.activeProfileId || 'default' }); } });
})();
