    function annotationTarget(value, id) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.records) || !validId(id)) return null;
      var retained = value.records.map(function(item, index) { return { item: item, index: index }; }).filter(function(entry) {
        var item = entry.item;
        return item && typeof item === 'object' && item.evidence && typeof item.evidence === 'object' && !Array.isArray(item.evidence);
      }).filter(function(entry) { return evidence(entry.item.evidence).day > 0; }).slice(-MAX_RECORDS);
      // Use the same valid-evidence window as normalization, retaining the
      // original source position and first valid-ID owner without repairing it.
      return retained.find(function(entry) { return validId(entry.item.id) && entry.item.id === id; }) || null;
    }
    function annotationOwner(value, id) {
      var target = annotationTarget(value, id);
      return target ? Object.freeze({ id: id, record: target.item }) : null;
    }
    function changeReviewNote(value, id, text, owner) {
      function result(status, notebook) { return Object.freeze({ notebook: notebook === undefined ? value : notebook, changed: status === 'updated', status: status,
        id: status === 'updated' || status === 'unchanged' || status === 'stale' ? id : null }); }
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.records) || !validId(id) || typeof text !== 'string') return result('invalid');
      var target = annotationTarget(value, id);
      if (!target) return result('missing');
      if (owner !== undefined && (!owner || typeof owner !== 'object' || Array.isArray(owner) || owner.id !== id || owner.record !== target.item)) return result('stale');
      var nextText = normalizeReviewNote(text);
      if (normalizeReviewNote(target.item.reviewNote) === nextText) return result('unchanged');
      var records = value.records.slice();
      records[target.index] = Object.assign({}, target.item, { reviewNote: nextText });
      return result('updated', Object.assign({}, value, { records: records }));
    }
