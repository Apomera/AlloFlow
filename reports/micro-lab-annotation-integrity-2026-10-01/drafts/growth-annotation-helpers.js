    function annotationTarget(value, id) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.trials) || !validId(id)) return null;
      var retained = value.trials.map(function(item, index) { return { item: item, index: index }; })
        .filter(function(entry) { return validTrial(entry.item); }).slice(-MAX_RECORDS);
      // Normalization reserves original valid IDs; their first retained owner
      // keeps that ID. Repaired IDs never authorize an annotation by themselves.
      return retained.find(function(entry) { return validId(entry.item.id) && entry.item.id === id; }) || null;
    }
    function annotationOwner(value, id) {
      var target = annotationTarget(value, id);
      return target ? Object.freeze({ id: id, record: target.item }) : null;
    }
    function changeExplanation(value, id, text, owner) {
      function result(status, notebook) { return Object.freeze({ notebook: notebook === undefined ? value : notebook, changed: status === 'updated', status: status,
        id: status === 'updated' || status === 'unchanged' || status === 'stale' ? id : null }); }
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.trials) || !validId(id) || typeof text !== 'string') return result('invalid');
      var target = annotationTarget(value, id);
      if (!target) return result('missing');
      if (owner !== undefined && (!owner || typeof owner !== 'object' || Array.isArray(owner) || owner.id !== id || owner.record !== target.item)) return result('stale');
      var nextText = plainText(text, 1200);
      if (plainText(target.item.explanation, 1200) === nextText) return result('unchanged');
      var trials = value.trials.slice();
      trials[target.index] = Object.assign({}, target.item, { explanation: nextText });
      return result('updated', Object.assign({}, value, { trials: trials }));
    }
