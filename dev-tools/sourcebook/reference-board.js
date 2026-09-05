// Included inside Sourcebook's existing IIFE. Each page stays below 12 images.
  function throwIfSourcebookAborted(signal) {
    if (signal && signal.aborted) {
      var error = new Error('Reference board preparation cancelled.');
      error.name = 'AbortError';
      throw error;
    }
  }

  function referenceBoardPages(items) {
    var list = (Array.isArray(items) ? items : []).slice(0, PALETTE_MAX_ASSETS);
    var pages = [];
    for (var i = 0; i < list.length; i += 12) pages.push(list.slice(i, i + 12));
    return pages;
  }

  function buildReferenceBoardPages(items, preparation, options) {
    var opts = options || {};
    var pages = referenceBoardPages(items);
    var output = [];
    // Process one page at a time to bound canvas and decoded-image memory.
    return pages.reduce(function (pending, page, index) {
      return pending.then(function () {
        throwIfSourcebookAborted(opts.signal);
        return loadReferenceBoardEntries(page, preparation, function (done) {
          if (opts.onProgress && !(opts.signal && opts.signal.aborted)) opts.onProgress(index * 12 + done, items.length);
        }, opts.signal).then(function (entries) {
          throwIfSourcebookAborted(opts.signal);
          if (entries.length !== page.length) {
            var loadedIds = entries.map(function (entry) { return (entry.item || entry).id; });
            var missing = page.filter(function (item) { return loadedIds.indexOf(item.id) === -1; });
            var names = missing.slice(0, 3).map(function (item) { return String(item.title || item.id || 'Image').slice(0, 180); }).join('; ');
            var message = typeof sbTf === 'function'
              ? sbTf('stem.sourcebook.board_images_failed', 'Could not prepare: {names}. Retry these images or remove them from your selection; no incomplete board was created.', { names: names })
              : 'Could not prepare: ' + names + '. Retry these images or remove them from your selection; no incomplete board was created.';
            throw new Error(message);
          }
          var title = String(opts.title || 'Reference board');
          if (pages.length > 1) title += ' (' + (index + 1) + '/' + pages.length + ')';
          var dataUrl = buildReferenceBoardDataUrl(entries, { title: title, columns: opts.columns });
          if (!dataUrl) throw new Error('A reference board could not be encoded.');
          output.push({ dataUrl: dataUrl, count: page.length, page: index + 1,
            filename: sourcebookSlug(opts.title, 'sourcebook-palette') + (pages.length === 1 ? '.reference-board.png' : '.reference-board-' + (index + 1) + '.png') });
        });
      });
    }, Promise.resolve()).then(function () { return output; });
  }
