    function evidenceAt(value, hour) {
      if (!validTrial(value) || typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 24) return null;
      var trial = normalizeTrial(value, value.id), simulated = simulate(trial.conditions);
      var controlPopulation = trial.control ? simulate(trial.control).points[hour].population : null;
      var trialPopulation = simulated.points[hour].population;
      return Object.freeze({ hour: hour, controlPopulation: controlPopulation, trialPopulation: trialPopulation,
        difference: controlPopulation === null ? null : trialPopulation - controlPopulation });
    }
    function citedEvidence(value) {
      if (!validTrial(value)) return Object.freeze([]);
      return Object.freeze(normalizeCitedHours(value.citedHours).map(function(hour) { return evidenceAt(value, hour); }));
    }
    function setCitedHour(value, trialId, hour, pinned) {
      var raw = record(value);
      function result(status, notebook) { return { notebook: notebook || raw, status: status }; }
      if (!validId(trialId) || typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 24 || typeof pinned !== 'boolean') return result('invalid');
      var source = (Array.isArray(raw.trials) ? raw.trials : []).map(function(item, index) { return { item: item, index: index }; })
        .filter(function(entry) { return validTrial(entry.item); }).slice(-MAX_RECORDS);
      // An imported stale ID must not bind to a record that just received that
      // number during repair. An explicit selection canonicalizes its identity.
      if (!source.some(function(entry) { return validId(entry.item.id) && entry.item.id === trialId; })) return result('missing');
      var notebook = normalizeNotebook(raw), index = notebook.trials.findIndex(function(trial) { return trial.id === trialId; });
      if (index < 0) return result('missing');
      var hours = normalizeCitedHours(notebook.trials[index].citedHours), present = hours.indexOf(hour) >= 0;
      if (present === pinned) return result('unchanged');
      if (pinned && hours.length >= 3) return result('full');
      var nextHours = pinned ? hours.concat([hour]).sort(function(a, b) { return a - b; }) : hours.filter(function(value) { return value !== hour; });
      var target = Object.assign({}, source[index].item), trials = raw.trials.slice();
      if (nextHours.length) target.citedHours = nextHours;
      else delete target.citedHours;
      trials[source[index].index] = target;
      return result(pinned ? 'added' : 'removed', Object.assign({}, raw, { trials: trials }));
    }
    function citedCSVValues(trial) {
      var evidence = citedEvidence(trial);
      function population(value) { return value === null ? null : Number(value.toFixed(3)); }
      return [evidence.map(function(point) { return point.hour; }).join('; '), evidence.length ? JSON.stringify(evidence.map(function(point) {
        return { hour: point.hour, controlPopulation: population(point.controlPopulation), trialPopulation: population(point.trialPopulation), difference: population(point.difference) };
      })) : ''];
    }
