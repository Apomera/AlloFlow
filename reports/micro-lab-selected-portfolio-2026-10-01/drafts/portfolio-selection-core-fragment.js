    function selectPortfolio(value, activityIds, translate) {
      var raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      var source = Array.isArray(raw.sections) ? raw.sections : [];
      var requested = Array.isArray(activityIds) ? activityIds.filter(function(id) { return typeof id === 'string'; }) : [];
      var ht = typeof translate === 'function' ? translate : function(key, fallback) { return fallback; };
      var sections = [];
      ['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz'].forEach(function(id) {
        if (requested.indexOf(id) < 0) return;
        var section = source.find(function(item) { return item && typeof item === 'object' && !Array.isArray(item) && item.id === id; });
        if (!section || section.hasContent !== true || typeof section.title !== 'string' || !section.title.trim() || typeof section.text !== 'string' || !section.text.trim()) return;
        // Copy only the portable section fields; keep its complete text literal.
        // Never rebuild evidence or freeze any object supplied by the caller.
        sections.push(Object.freeze({ id: id, title: section.title, hasContent: true, text: section.text }));
      });
      var includedIds = sections.map(function(section) { return section.id; });
      var text = sections.length ? [ht('portfolio_selected_title', 'Micro Lab selected evidence portfolio'),
        ht('portfolio_included_activities', 'Included activities') + ': ' + sections.map(function(section) { return section.title; }).join(', '),
        ht('portfolio_scope', 'A readable collection of saved evidence, earlier versions, recoverable records, and recognized working notes. Labels distinguish original evidence from later reflection and unfinished work. This is not an importable backup or an overall mastery score.'),
        sections.map(function(section) { return '\n=== ' + section.title + ' ===\n' + section.text; }).join('\n')].join('\n') : '';
      return Object.freeze({ sections: Object.freeze(sections), includedIds: Object.freeze(includedIds), canDownload: sections.length > 0, text: text });
    }
