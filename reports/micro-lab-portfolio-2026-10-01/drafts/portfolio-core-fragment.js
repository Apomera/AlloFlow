    function portfolio(value, translate) {
      var raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      var ht = typeof translate === 'function' ? translate : function(key, fallback) { return fallback; };
      function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
      function note(value, limit) { return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, limit || 1600) : ''; }
      function number(value) { return Number(value.toFixed(2)); }
      var empty = ht('portfolio_empty', 'No evidence or working notes yet.');
      var missing = ht('portfolio_missing', 'Not recorded');
      var savedLabel = ht('portfolio_saved', 'Current saved evidence');
      var previousLabel = ht('portfolio_previous', 'Previous saved evidence (available to restore)');
      var recoveryLabel = ht('portfolio_recovery', 'Removed evidence (available to restore; outside the active notebook)');
      var workingLabel = ht('portfolio_working', 'Current working notes and observations');
      var predictionLabel = ht('portfolio_prediction', 'Original prediction');
      var explanationLabel = ht('portfolio_explanation', 'Written explanation');
      var sections = [];
      function add(id, title, lines) { sections.push(Object.freeze({ id: id, title: title, hasContent: lines.length > 0, text: lines.length ? lines.join('\n') : empty })); }

      // Mystery: the catalog supplies observation text, never answer feedback.
      var mysteries = MicroMystery.normalize(raw.mysteryLab), mysteryLines = [];
      var claimNames = { bacterium: ht('portfolio_claim_bacterium', 'Bacterium'), archaeon: ht('portfolio_claim_archaeon', 'Archaeon'), yeast: ht('portfolio_claim_yeast', 'Yeast'),
        protist: ht('portfolio_claim_protist', 'Protist'), phage: ht('portfolio_claim_phage', 'Bacteriophage'), unresolved: ht('portfolio_claim_unresolved', 'Not resolved by the supplied evidence') };
      var limitNames = { bounded: ht('portfolio_limit_bounded', 'A broad group only; species and safety are not established.'),
        species: ht('portfolio_limit_species', 'The learner selected a claim of exact species identification.'), safe: ht('portfolio_limit_safe', 'The learner selected a claim that the specimen is safe.') };
      var observationNames = { context: ht('portfolio_context', 'Context'), size: ht('portfolio_size', 'Size'), structure: ht('portfolio_structure', 'Structure'), behavior: ht('portfolio_behavior', 'Behavior') };
      MicroMystery.catalog(function(key, fallback) { return fallback; }).forEach(function(specimen) {
        var entry = mysteries.cases[specimen.id];
        var working = !!(entry.claim || entry.evidence.length || entry.reasoning.trim() || entry.limitation || entry.revealed.length > 1);
        if (!entry.record && !working) return;
        mysteryLines.push(specimen.code + '. ' + specimen.title);
        function report(label, report) {
          mysteryLines.push(label, ht('portfolio_claim', 'Learner claim') + ': ' + (claimNames[report.claim] || missing),
            ht('portfolio_reasoning', 'Learner reasoning') + ': ' + (report.reasoning || missing),
            ht('portfolio_limit', 'Selected limitation') + ': ' + (limitNames[report.limitation] || missing), ht('portfolio_cited', 'Cited supplied observations'));
          report.evidence.forEach(function(key) { mysteryLines.push(observationNames[key] + ': ' + specimen[key]); });
          if (!report.evidence.length) mysteryLines.push(missing);
        }
        if (entry.record) report(savedLabel, entry.record);
        if (entry.previousRecord) report(previousLabel, entry.previousRecord);
        if (working) {
          report(workingLabel, entry);
          mysteryLines.push(ht('portfolio_revealed', 'Observations revealed in the current investigation'));
          entry.revealed.forEach(function(key) { mysteryLines.push(observationNames[key] + ': ' + specimen[key]); });
        }
        mysteryLines.push('');
      });
      if (mysteryLines.length) mysteryLines.unshift(ht('portfolio_mystery_scope', 'Fictional supplied observations. Saved reports, earlier reports, and working reasoning are separate. Learner writing is not graded by this portfolio.'));
      add('mystery', ht('portfolio_mystery', 'Mystery specimens'), mysteryLines);

      var measurementRows = MicroMeasurements.exportRows(raw.microscopeMeasurements), measurementLines = [];
      measurementRows.forEach(function(row) {
        var checked = row.record_kind !== 'pending_draft';
        measurementLines.push(row.specimen_name + ' — ' + (checked ? row.record_kind === 'current_checked' ? savedLabel : previousLabel : ht('portfolio_unchecked', 'Unchecked working estimate')),
          ht('portfolio_feature', 'Measured feature') + ': ' + row.measured_feature,
          ht('portfolio_entered', 'Original estimate') + ': ' + row.original_value_text + ' ' + row.original_unit,
          ht('portfolio_conversion', 'Estimate in micrometers') + ': ' + (row.estimate_um === null ? ht('portfolio_invalid_number', 'Invalid numeric estimate') : row.estimate_um),
          ht('portfolio_view', 'Saved viewing context') + ': ' + row.viewing_method + '; ' + row.magnification_x + '×; ' + ht('portfolio_zoom', 'display zoom') + ' ' + row.display_zoom_x + '×',
          ht('portfolio_field', 'Field width (µm)') + ': ' + row.field_width_um + '; ' + ht('portfolio_scale', 'scale bar (µm)') + ': ' + row.scale_bar_um);
        if (checked) measurementLines.push(ht('portfolio_reference', 'Drawing reference (µm)') + ': ' + row.reference_um,
          ht('portfolio_error', 'Absolute difference from the drawing reference (%)') + ': ' + number(row.absolute_error_pct),
          ht('portfolio_band', 'Within the ±20% practice band') + ': ' + (row.within_practice_band ? ht('portfolio_yes', 'Yes') : ht('portfolio_no', 'No')));
        else measurementLines.push(ht('portfolio_draft_measurement', 'Unchecked estimate: readiness is not confirmed; no reference answer or accuracy review is included.'));
        measurementLines.push('');
      });
      if (measurementLines.length) measurementLines.unshift(ht('portfolio_measurement_scope', 'Calibrated teaching drawings, not biological samples or diagnostic results. Each estimate keeps its own viewing context; historical focus is not stored. um means micrometers; nm means nanometers. The practice band is not laboratory uncertainty.'));
      add('microscope', ht('portfolio_microscope', 'Microscope measurements'), measurementLines);

      var gram = MicroGram.report(raw.gramInvestigation, raw.gramStep), gramLines = [];
      if (gram.canDownload) {
        var gramPredictions = { thick: ht('portfolio_gram_thick', 'Only model A, with thick peptidoglycan'), thin: ht('portfolio_gram_thin', 'Only model B, with thin peptidoglycan and an outer membrane'), both: ht('portfolio_gram_both', 'Both models'), neither: ht('portfolio_gram_neither', 'Neither model') };
        var interpretations = { wall: ht('portfolio_gram_wall', 'Cell-envelope structure changes dye retention; shape alone does not explain the result.'), shape: ht('portfolio_gram_shape', 'Round cells retain purple dye, while rod-shaped cells lose it.'), species: ht('portfolio_gram_species', 'The final color identifies the exact bacterial species.'), drug: ht('portfolio_gram_drug', 'The final color tells us which antibiotic will work.') };
        function gramReport(label, record, saved) {
          gramLines.push(label, ht('portfolio_gram_prediction', 'Prediction about purple-stain retention') + ': ' + (gramPredictions[record.prediction] || missing),
            ht('portfolio_interpretation', 'Learner-selected interpretation') + ': ' + (interpretations[record.interpretation] || missing), explanationLabel + ': ' + (record.explanation || missing));
          if (saved) gramLines.push(ht('portfolio_gram_no_history', 'This saved report stores written fields only, with no historical log of observed stages.'));
          gramLines.push('');
        }
        gramLines.push(ht('portfolio_gram_scope', 'Idealized staining models, not a laboratory protocol. Learner-selected interpretations are recorded as written. A Gram result alone does not identify a species or establish antibiotic susceptibility.'));
        if (gram.saved) gramReport(savedLabel, gram.saved, true);
        if (gram.previousSaved) gramReport(previousLabel, gram.previousSaved, true);
        gramReport(workingLabel, gram.working, false);
        gramLines.push(ht('portfolio_gram_observed', 'Stages observed in the current investigation') + ': ' + gram.working.observedStages.length + '/4');
        var stages = [null, ht('portfolio_gram_stage1', 'Crystal violet: both models appear purple.'), ht('portfolio_gram_stage2', 'Iodine: both models remain purple.'),
          ht('portfolio_gram_stage3', 'Decolorization: model A remains purple; model B becomes colorless.'), ht('portfolio_gram_stage4', 'Safranin counterstain: model A remains purple; model B appears pink.')];
        gram.working.observedStages.forEach(function(at) { gramLines.push(at + '. ' + stages[at]); });
      }
      add('gram', ht('portfolio_gram', 'Gram-stain investigation'), gramLines);

      var growth = MicroGrowth.normalizeNotebook(raw.growthInvestigation), growthLines = [], setup = obj(raw.growthLab);
      var keys = ['profile', 'tempC', 'pH', 'oxygen'];
      var settingLabels = { profile: ht('portfolio_profile', 'Organism profile'), tempC: ht('portfolio_temperature', 'Temperature (°C)'), pH: ht('portfolio_ph', 'pH'), oxygen: ht('portfolio_oxygen', 'Relative oxygen availability (0–100)') };
      var growthPredictions = { higher: ht('portfolio_higher', 'Higher population'), similar: ht('portfolio_similar', 'Similar population'), lower: ht('portfolio_lower', 'Lower population'), unsure: ht('portfolio_unsure', 'Not sure yet') };
      function conditionsText(conditions, omit) { return keys.filter(function(key) { return key !== omit; }).map(function(key) { return settingLabels[key] + ': ' + (key === 'profile' ? MicroGrowth.profiles[conditions.profile].label : conditions[key]); }).join('; '); }
      function trialText(trial, label) {
        var comparison = trial.control ? MicroGrowth.compare(trial.control, trial.conditions) : null;
        var simulated = comparison ? comparison.trial : MicroGrowth.simulate(trial.conditions);
        growthLines.push(label + ' — ' + ht('portfolio_trial', 'Trial') + ' ' + trial.id,
          ht('portfolio_original_control', 'Original saved control') + ': ' + (trial.control ? conditionsText(trial.control) : missing),
          ht('portfolio_trial_settings', 'Saved trial settings') + ': ' + conditionsText(trial.conditions), predictionLabel + ': ' + (growthPredictions[trial.prediction] || missing),
          ht('portfolio_before_run', 'Reasoning before the run') + ': ' + (trial.hypothesis || missing),
          ht('portfolio_later_growth', 'Later evidence and explanation') + ': ' + (trial.explanation || missing));
        if (comparison) growthLines.push(ht('portfolio_hour24_outcome', 'Model comparison at hour 24') + ': ' + growthPredictions[comparison.outcome]);
        else growthLines.push(ht('portfolio_no_control', 'Comparison unavailable: no original control was saved.'));
        growthLines.push(ht('portfolio_hour_table', 'Model hour\tOriginal control population\tTrial population'));
        simulated.points.forEach(function(point, i) { growthLines.push([point.hour, comparison ? number(comparison.control.points[i].population) : '', number(point.population)].join('\t')); });
        growthLines.push('');
      }
      growth.trials.forEach(function(trial) { trialText(trial, savedLabel); });
      if (growth.removed) trialText(growth.removed.trial, recoveryLabel);
      [{ value: growth.sweep, label: ht('portfolio_current_sweep', 'Current saved sweep') }, { value: growth.previousSweep, label: ht('portfolio_previous_sweep', 'Previous saved sweep (available to restore)') }].forEach(function(entry) {
        if (!entry.value) return;
        var response = MicroGrowth.sweep(entry.value.conditions, entry.value.variable);
        growthLines.push(entry.label, ht('portfolio_swept', 'Varied setting') + ': ' + settingLabels[response.variable], ht('portfolio_fixed', 'Held constant') + ': ' + conditionsText(response.conditions, response.variable),
          ht('portfolio_sweep_note', 'Each sample starts at 5 units, runs for 24 model hours, and shares capacity 100 and maximum modeled rate 0.4 per hour. Sampled responses are not measurements; unsampled settings may differ.'),
          settingLabels[response.variable] + '\t' + ht('portfolio_sweep_table', 'Population at hour 24\tModeled lag (hours)'));
        response.points.forEach(function(point) { growthLines.push([point.value, number(point.finalPopulation), number(point.lagHours)].join('\t')); });
        growthLines.push('');
      });
      var legacyHypothesis = note(setup.hypothesis, 600), legacyExplanation = note(setup.explanation, 1200);
      var customSetup = (typeof setup.profile === 'string' && Object.prototype.hasOwnProperty.call(MicroGrowth.profiles, setup.profile) && setup.profile !== 'ecoli') ||
        [['tempC', 30], ['pH', 7], ['oxygen', 50]].some(function(pair) { return typeof setup[pair[0]] === 'number' && Number.isFinite(setup[pair[0]]) && setup[pair[0]] !== pair[1]; });
      if (growth.control || growth.prediction || growth.hypothesis.trim() || growth.explanation.trim() || customSetup) {
        growthLines.push(workingLabel, ht('portfolio_pending_growth', 'Next-run setup only; no outcome is calculated for this draft.'),
          ht('portfolio_proposed', 'Proposed settings') + ': ' + conditionsText(MicroGrowth.normalizeConditions(setup)),
          ht('portfolio_next_control', 'Control saved for the next comparison') + ': ' + (growth.control ? conditionsText(growth.control) : missing),
          ht('portfolio_draft_prediction', 'Working prediction') + ': ' + (growthPredictions[growth.prediction] || missing),
          ht('portfolio_draft_reasoning', 'Working reasoning') + ': ' + (growth.hypothesis || missing),
          ht('portfolio_draft_explanation', 'Working explanation') + ': ' + (growth.explanation || missing), '');
      }
      if (legacyHypothesis.trim() || legacyExplanation.trim()) growthLines.push(ht('portfolio_legacy_growth', 'Earlier Growth Lab written notes (not linked to a saved trial)'),
        ht('portfolio_legacy_hypothesis', 'Earlier hypothesis') + ': ' + (legacyHypothesis || missing), ht('portfolio_legacy_explanation', 'Earlier explanation') + ': ' + (legacyExplanation || missing));
      var legacyLog = (Array.isArray(setup.log) ? setup.log : []).filter(function(entry) { return entry && typeof entry === 'object' && !Array.isArray(entry); }).slice(-8).map(function(entry) {
        return [note(entry.profile, 80), typeof entry.t === 'number' && Number.isFinite(entry.t) ? settingLabels.tempC + ': ' + entry.t : '',
          typeof entry.p === 'number' && Number.isFinite(entry.p) ? settingLabels.pH + ': ' + entry.p : '',
          typeof entry.o === 'number' && Number.isFinite(entry.o) ? settingLabels.oxygen + ': ' + entry.o : '', note(entry.state, 120)].filter(Boolean).join('; ');
      }).filter(Boolean);
      if (legacyLog.length) growthLines.push(ht('portfolio_legacy_log', 'Earlier Growth Lab log (recorded labels; not paired trial evidence)'), legacyLog.join('\n'));
      if (growthLines.length) growthLines.unshift(ht('portfolio_growth_scope', 'Illustrative growth model v1; populations are arbitrary units, not measurements. Every saved trial starts at 5 units, with capacity 100 and maximum modeled rate 0.4 per hour. Prediction comparisons use hour 24 and the trial’s original control. Similar means a difference of at most 2 units. Zero modeled growth does not establish death.'));
      add('growth', ht('portfolio_growth', 'Growth investigations'), growthLines);

      var resistance = MicroResistanceNotebook.normalizeNotebook(raw.resistanceNotebook), resistanceLines = [];
      if (resistance.records.length) resistanceLines.push(savedLabel, MicroResistanceNotebook.exportText(raw.resistanceNotebook));
      if (resistance.removed) resistanceLines.push(recoveryLabel, MicroResistanceNotebook.exportText({ records: [resistance.removed.record] }));
      var run = MicroResistanceNotebook.evidence(raw.resistanceInvestigation), rawRun = obj(raw.resistanceInvestigation);
      var customRun = [['dose', 60], ['duration', 14], ['initRes', 3]].some(function(pair) { return typeof rawRun[pair[0]] === 'number' && Number.isFinite(rawRun[pair[0]]) && run[pair[0]] !== pair[1]; });
      if (run.day || run.prediction || run.notes.trim() || run.explanation || customRun) {
        resistanceLines.push(workingLabel, ht('portfolio_active_resistance', 'Current culture state, separate from saved snapshots. Only recorded rounds are included; no new random outcomes are generated.'),
          ht('portfolio_run_status', 'Run status') + ': ' + run.status,
          ht('portfolio_dose', 'Exposure strength (0–100)') + ': ' + run.dose + '; ' + ht('portfolio_duration', 'planned rounds') + ': ' + run.duration,
          ht('portfolio_initial_resistance', 'Requested initial resistance (%)') + ': ' + run.initRes,
          ht('portfolio_current_prediction', 'Current run prediction') + ': ' + (run.prediction || missing),
          ht('portfolio_current_explanation', 'Current selected explanation') + ': ' + (run.explanation || missing) + (run.explanation ? ' (' + (run.explanationSubmitted ? ht('portfolio_submitted', 'submitted') : ht('portfolio_unsubmitted', 'not submitted')) + ')' : ''),
          ht('portfolio_current_notes', 'Current written evidence') + ': ' + (run.notes || missing), ht('portfolio_resistance_table', 'Round\tSensitive\tResistant\tTotal alive\tResistant share'));
        run.history.forEach(function(point) { var total = point.sensitive + point.resistant; resistanceLines.push([point.day, point.sensitive, point.resistant, total, total ? Math.round(point.resistant / total * 100) + '%' : ht('portfolio_undefined', 'Undefined')].join('\t')); });
      }
      if (resistanceLines.length) resistanceLines.unshift(ht('portfolio_resistance_scope', 'Random teaching model, not measured culture or treatment data. Shares are rounded to whole percentages; with no living cells, resistant share is undefined. Saved snapshots may come from the same run. Later reflections remain separate from original snapshot notes.'));
      add('resistance', ht('portfolio_resistance', 'Resistance evidence'), resistanceLines);

      var quiz = MicroQuiz.report(raw);
      add('quiz', ht('portfolio_quiz', 'Quiz and practice'), quiz.canDownload ? [MicroQuiz.exportText(raw)] : []);
      var populated = sections.filter(function(section) { return section.hasContent; });
      var text = populated.length ? [ht('portfolio_title', 'Micro Lab evidence portfolio'),
        ht('portfolio_scope', 'A readable collection of saved evidence, earlier versions, recoverable records, and recognized working notes. Labels distinguish original evidence from later reflection and unfinished work. This is not an importable backup or an overall mastery score.'),
        populated.map(function(section) { return '\n=== ' + section.title + ' ===\n' + section.text; }).join('\n')].join('\n') : '';
      return Object.freeze({ sections: Object.freeze(sections), canDownload: populated.length > 0, text: text });
    }
