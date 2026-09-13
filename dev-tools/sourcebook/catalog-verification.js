// Included inside Sourcebook's existing IIFE by build_sourcebook_helpers.cjs.
// Only source-owned records, never serialized verification flags, establish trust.
  function isCatalogSourcebookAsset(raw) {
    return !!raw && ['Wikimedia Commons', NGA_PROVIDER, SMITHSONIAN_PROVIDER, BHL_PROVIDER, NARA_PROVIDER,
      'The Met Open Access', 'Art Institute of Chicago', 'Cleveland Museum of Art', 'Library of Congress',
      'Wellcome Collection', 'Getty Museum Open Content', 'Openverse'].indexOf(raw.provider) !== -1;
  }

  function curatedSourcebookAsset(raw) {
    if (!raw) return null;
    return MATERIALS.filter(function (item) {
      return item.id === raw.id && item.provider === raw.provider
        && item.sourceUrl === raw.sourceUrl && item.imageUrl === raw.imageUrl
        && item.downloadUrl === raw.downloadUrl && item.rightsType === raw.rightsType
        && String(item.licenseUrl || '') === String(raw.licenseUrl || '');
    })[0] || null;
  }

  function sameCatalogIdentity(raw, fresh) {
    return !!(raw && fresh && raw.provider === fresh.provider
      && raw.sourceUrl === fresh.sourceUrl && raw.imageUrl === fresh.imageUrl
      && raw.downloadUrl === fresh.downloadUrl);
  }

  function fetchCatalogRecord(url, options) {
    var opts = options || {};
    var fetchFn = opts.fetch || (typeof window.fetch === 'function' ? window.fetch.bind(window) : null);
    if (!fetchFn) return Promise.reject(new Error('Source record verification is unavailable. Connect and retry.'));
    var request = providerRequestContext(opts.signal, 12000);
    return Promise.resolve().then(function () {
      if (opts.signal && opts.signal.aborted) throw new Error('Source verification cancelled.');
      return fetchFn(url, Object.assign({}, request.options, { headers: { Accept: url.indexOf('https://data.getty.edu/') === 0 ? 'application/ld+json' : 'application/json' } }));
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('The source record could not be verified. Connect and retry.');
      return response.json();
    }).then(function (record) { request.finish(); return record; }, function (error) { request.finish(); throw error; });
  }

  // The four Commons-hosted profiles and Commons itself share one imageinfo
  // endpoint that accepts up to 50 titles per query, so a restored board is
  // verified in a couple of round trips instead of one serial request per record.
  var COMMONS_REVALIDATION_BATCH_SIZE = 50;

  function isCommonsFamilyProvider(provider) {
    return provider === 'Wikimedia Commons' || !!COMMONS_PROVIDER_PROFILES[provider];
  }

  function commonsRevalidationTitle(raw) {
    var match = String(raw && raw.sourceUrl || '').match(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:([^?#]+)$/);
    if (!match) return '';
    var title;
    try { title = 'File:' + decodeURIComponent(match[1]).replace(/_/g, ' '); } catch (_) { return ''; }
    return title && title.length <= 260 && title.indexOf('|') === -1 ? title : '';
  }

  // Compare the fresh source-owned record against the saved claims. The local
  // id is kept so notes and preparation stay attached; every catalog claim is
  // replaced. The record stays `live` because it is still an external provider
  // record: saving it must store the asset and "More from" must stay offered.
  function refreshedCatalogAsset(raw, fresh) {
    if (!fresh || !sameCatalogIdentity(raw, fresh) || raw.rightsType !== fresh.rightsType
      || String(raw.licenseUrl || '') !== String(fresh.licenseUrl || '')) {
      throw new Error('A saved source has changed its image identity or reuse rights. Find it again in its collection.');
    }
    return portableAsset(Object.assign({}, fresh, { id: raw.id, live: true,
      recommended: raw.recommended === true, recommendationSource: raw.recommendationSource }));
  }

  function catalogVerificationOutcome(raw, task) {
    return task.then(function (fresh) { return { asset: refreshedCatalogAsset(raw, fresh) }; }).catch(function (error) { return { error: error }; });
  }

  // One imageinfo query for a batch of same-provider Commons records. Pages come
  // back in the API's own order, so each saved record is matched by the
  // description URL the API itself issued when the record was first fetched.
  function revalidateCommonsAssetBatch(provider, entries, options) {
    var profile = COMMONS_PROVIDER_PROFILES[provider];
    var url = COMMONS_API + '?action=query&format=json&formatversion=2&origin=*&prop=imageinfo' + (profile ? '%7Ccategories' : '')
      + '&titles=' + encodeURIComponent(entries.map(function (entry) { return entry.title; }).join('|'))
      + '&iiprop=url%7Cextmetadata%7Csize%7Cmediatype&iiurlwidth=900&iiextmetadatalanguage=en'
      + (profile ? '&cllimit=max&clcategories=' + encodeURIComponent('Category:' + profile.category) : '');
    var task = COMMONS_SEARCH_QUEUE.then(function () { return fetchCatalogRecord(url, options); });
    COMMONS_SEARCH_QUEUE = task.then(function () {}, function () {});
    return task.then(function (payload) {
      var pages = payload && payload.query && Array.isArray(payload.query.pages) ? payload.query.pages : [];
      var pageBySource = Object.create(null);
      pages.forEach(function (page) {
        var info = page && Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
        var source = info ? safeHttpsUrl(info.descriptionurl) : '';
        if (!source || pageBySource[source]) return;
        if (profile && (!Array.isArray(page.categories) || !page.categories.some(function (category) { return category && category.title === 'Category:' + profile.category; }))) return;
        pageBySource[source] = page;
      });
      return Promise.all(entries.map(function (entry) {
        var page = pageBySource[String(entry.raw.sourceUrl || '')];
        var fresh = page ? commonsItemFromPage(page, '', entry.raw.kind) : null;
        return catalogVerificationOutcome(entry.raw, Promise.resolve(fresh ? Object.assign({}, fresh, { provider: provider }) : null));
      }));
    }, function (error) {
      return entries.map(function () { return { error: error }; });
    });
  }

  // Build every endpoint from a bounded identifier and a fixed provider origin.
  function revalidateCatalogAsset(raw, options) {
    var curated = curatedSourcebookAsset(raw);
    if (curated) return Promise.resolve(portableAsset(Object.assign({}, curated, { rightsMetadataSource: 'Built-in reviewed source record' })));
    if (!isCatalogSourcebookAsset(raw) || !sourcebookImportedDomainAllowed(raw.provider, raw.sourceUrl, raw.imageUrl, raw.downloadUrl)) {
      return Promise.reject(new Error('Unknown provider or untrusted source identity.'));
    }
    var provider = String(raw && raw.provider || '');
    var source = String(raw && raw.sourceUrl || '');
    var id = String(raw && raw.id || '');
    var match;
    var task;
    var read = function (url) { return fetchCatalogRecord(url, options); };
    if (isCommonsFamilyProvider(provider)) {
      var title = commonsRevalidationTitle(raw);
      if (title) {
        return revalidateCommonsAssetBatch(provider, [{ raw: raw, title: title }], options).then(function (outcomes) {
          if (outcomes[0].error) throw outcomes[0].error;
          return outcomes[0].asset;
        });
      }
    } else if (provider === 'The Met Open Access') {
      match = source.match(/^https:\/\/(?:www\.)?metmuseum\.org\/art\/collection\/search\/(\d{1,12})\/?$/);
      if (match) task = read(MET_API + '/objects/' + match[1]).then(function (record) { return metItemFromObject(record, '', raw.kind); });
    } else if (provider === 'Art Institute of Chicago') {
      match = source.match(/^https:\/\/www\.artic\.edu\/artworks\/(\d{1,12})$/);
      if (match) task = read(AIC_API + '/artworks/' + match[1]).then(function (payload) { return aicItemFromArtwork(payload.data, payload.config || {}, '', raw.kind); });
    } else if (provider === 'Cleveland Museum of Art') {
      match = id.match(/^cma-live-(\d{1,12})$/);
      if (match) task = read(CMA_API + '/artworks/' + match[1]).then(function (payload) { return cmaItemFromArtwork(payload.data, '', raw.kind); });
    } else if (provider === 'Library of Congress') {
      match = source.match(/^https:\/\/www\.loc\.gov\/item\/([a-z0-9._-]{1,100})\/$/i);
      if (match) task = read(LOC_API + '/item/' + match[1] + '/?fo=json').then(function (payload) { return locItemFromDetail(payload, null, '', raw.kind); });
    } else if (provider === 'Wellcome Collection') {
      match = id.match(/^wellcome-live-([a-z0-9]{1,80})$/);
      if (match) task = read(WELLCOME_API + '/images/' + match[1] + '?include=source.contributors,source.subjects,source.genres').then(function (record) { return wellcomeImageFromRecord(record, '', raw.kind); });
    } else if (provider === 'Getty Museum Open Content') {
      match = id.match(/^getty-live-([a-f0-9-]{36})$/);
      if (match && /^https:\/\/data\.getty\.edu\/museum\/collection\/object\/[a-f0-9-]{36}$/.test(source)) {
        var mediaUrl = 'https://data.getty.edu/media/image/' + match[1];
        task = read(source).then(function (object) {
          // A valid image licence alone does not establish its connection to the object.
          var linked = (Array.isArray(object.shows) ? object.shows : []).some(function (entry) { return entry && entry.id === mediaUrl; });
          if (!linked) return null;
          return read(mediaUrl).then(function (media) { return gettyImageFromRecords(object, media, '', raw.kind); });
        });
      }
    } else if (provider === 'Openverse') {
      match = source.match(/^https:\/\/api\.openverse\.org\/v1\/images\/([a-f0-9-]{36})\/$/);
      if (match) task = read(OPENVERSE_API + '/images/' + match[1] + '/').then(function (record) { return openverseItemFromRecord(record, '', raw.kind); });
    }
    if (!task) return Promise.reject(new Error('This saved asset has no verifiable source identity. Find it again in its collection.'));
    return task.then(function (fresh) { return refreshedCatalogAsset(raw, fresh); });
  }

  // Verify every catalog record and report each outcome in input order as
  // `{ asset }` or `{ error }`. Commons-family records travel in batches of
  // fifty per provider through the shared Commons queue; the rest keep their
  // per-record endpoints at a concurrency of two.
  function revalidateCatalogOutcomes(items, options) {
    var list = Array.isArray(items) ? items : [];
    var outcomes = new Array(list.length);
    var singles = [];
    var batches = Object.create(null);
    list.forEach(function (item, index) {
      var provider = String(item && item.provider || '');
      var title = isCommonsFamilyProvider(provider) && isCatalogSourcebookAsset(item) && !curatedSourcebookAsset(item)
        && sourcebookImportedDomainAllowed(provider, item.sourceUrl, item.imageUrl, item.downloadUrl) ? commonsRevalidationTitle(item) : '';
      if (!title) { singles.push(index); return; }
      (batches[provider] = batches[provider] || []).push({ index: index, raw: item, title: title });
    });
    var work = [mapWithConcurrency(singles, 2, function (index) {
      return revalidateCatalogAsset(list[index], options).then(function (asset) { outcomes[index] = { asset: asset }; }, function (error) { outcomes[index] = { error: error }; });
    })];
    Object.keys(batches).forEach(function (provider) {
      var entries = batches[provider];
      for (var offset = 0; offset < entries.length; offset += COMMONS_REVALIDATION_BATCH_SIZE) {
        (function (chunk) {
          work.push(revalidateCommonsAssetBatch(provider, chunk, options).then(function (results) {
            chunk.forEach(function (entry, position) { outcomes[entry.index] = results[position]; });
          }));
        })(entries.slice(offset, offset + COMMONS_REVALIDATION_BATCH_SIZE));
      }
    });
    return Promise.all(work).then(function () {
      return outcomes.map(function (outcome) { return outcome || { error: new Error('Source verification failed.') }; });
    });
  }

  function revalidateCatalogAssets(items, options) {
    return revalidateCatalogOutcomes(items, options).then(function (outcomes) {
      var failure = outcomes.filter(function (outcome) { return outcome.error; })[0];
      if (failure) throw failure.error;
      return outcomes.map(function (outcome) { return outcome.asset; });
    });
  }
