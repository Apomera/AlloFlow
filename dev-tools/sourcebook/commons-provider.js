  function commonsItemFromPage(page, query, requestedKind) {
    var info = page && Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
    if (!info) return null;
    var mediaType = String(info.mediatype || '').toUpperCase();
    if (mediaType && mediaType !== 'BITMAP' && mediaType !== 'DRAWING') return null;
    var rights = normalizeCommonsRights(info.extmetadata);
    if (!rights || !ALLOWED_RIGHTS[rights.rightsType]) return null;
    var imageUrl = safeHttpsUrl(info.thumburl || info.url);
    var downloadUrl = safeHttpsUrl(info.url);
    var sourceUrl = safeHttpsUrl(info.descriptionurl);
    if (!imageUrl || !downloadUrl || !sourceUrl) return null;

    var meta = info.extmetadata || {};
    var rawTitle = String((page && page.title) || 'Open visual asset').replace(/^File:/i, '');
    var title = rawTitle.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim() || rawTitle;
    var creator = plainMetadata(metadataValue(meta.Artist) || metadataValue(meta.Credit)) || 'Creator listed on source record';
    var year = plainMetadata(metadataValue(meta.DateTimeOriginal)) || 'See source record';
    var description = plainMetadata(metadataValue(meta.ImageDescription)) || 'Open visual asset from Wikimedia Commons.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var rightsNote = rights.rightsType === 'ccby'
      ? 'Wikimedia Commons reports this file under ' + rights.license + '. Attribution is required; verify the linked item record.'
      : 'Wikimedia Commons reports this file as ' + rights.license + '. Verify the linked item record before use.';
    return {
      id: 'commons-live-' + String((page && page.pageid) || rawTitle).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(),
      title: title,
      kind: inferMaterialKind([query, title, description].join(' '), requestedKind),
      provider: 'Wikimedia Commons',
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: rightsNote,
      tags: normalizeWords([title, description].join(' ')),
      accent: ['#dce8e2', '#466b60'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      pixelWidth: normalizedPixelDimension(info.width),
      pixelHeight: normalizedPixelDimension(info.height),
      live: true,
      rightsMetadataSource: 'Wikimedia Commons imageinfo extmetadata'
    };
  }

  function searchCommonsLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Live search is unavailable in this browser.'));
    var kindHints = {
      Maps: ' map cartography', Textures: ' texture background', Blueprints: ' blueprint technical drawing',
      Patterns: ' pattern ornament textile', Science: ' scientific diagram', Botanical: ' botanical illustration', Archival: ' archival ephemera',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var focusedProfile = COMMONS_PROVIDER_PROFILES[String(opts.providerLabel || '')];
    var focusedProvider = focusedProfile && opts.commonsCategory === focusedProfile.category;
    var providerLabel = focusedProvider ? String(opts.providerLabel) : 'Wikimedia Commons';
    var commonsCategory = focusedProvider ? focusedProfile.category : '';
    var searchText = q + (kindHints[opts.kind] || '') + (commonsCategory ? ' incategory:"' + commonsCategory + '"' : '');
    var page = normalizedSearchPage(opts.page);
    var batchLimit = Math.max(4, Math.min(24, Number(opts.limit || 18)));
    var params = [
      'action=query', 'format=json', 'formatversion=2', 'origin=*',
      'generator=search', 'gsrnamespace=6', 'gsrlimit=' + batchLimit,
      'gsroffset=' + (page * batchLimit),
      'gsrsort=relevance', 'gsrsearch=' + encodeURIComponent(searchText),
      'prop=imageinfo', 'iiprop=url%7Cextmetadata%7Csize%7Cmediatype', 'iiurlwidth=900',
      'iiextmetadatalanguage=en',
      'iiextmetadatafilter=LicenseShortName%7CLicenseUrl%7CUsageTerms%7CArtist%7CImageDescription%7CCredit%7CDateTimeOriginal'
    ];
    var queuedRequest = COMMONS_SEARCH_QUEUE.then(function () {
      var requestContext = providerRequestContext(opts.signal, 12000);
      return fetchFn(COMMONS_API + '?' + params.join('&'), requestContext.options)
        .then(function (response) {
          if (!response || !response.ok) throw providerHttpError(providerLabel, response);
          return response.json();
        })
        .then(function (payload) {
          var pages = payload && payload.query && Array.isArray(payload.query.pages) ? payload.query.pages : [];
          return pages.map(function (page) {
            var item = commonsItemFromPage(page, q, opts.kind);
            if (!item || providerLabel === 'Wikimedia Commons') return item;
            return Object.assign({}, item, {
              provider: providerLabel,
              accent: focusedProfile.accent.slice(),
              rightsMetadataSource: 'Wikimedia Commons imageinfo extmetadata; ' + providerLabel + ' source category'
            });
          }).filter(Boolean);
        }).then(function (items) {
          requestContext.finish();
          return items;
        }, function (error) {
          requestContext.finish();
          throw error;
        });
    });
    COMMONS_SEARCH_QUEUE = queuedRequest.then(function () {}, function () {});
    return queuedRequest;
  }

  function searchNgaLive(query, options) {
    return searchCommonsLive(query, Object.assign({}, options || {}, {
      providerLabel: NGA_PROVIDER,
      commonsCategory: NGA_COMMONS_CATEGORY
    }));
  }

  function searchSmithsonianLive(query, options) {
    return searchCommonsLive(query, Object.assign({}, options || {}, {
      providerLabel: SMITHSONIAN_PROVIDER,
      commonsCategory: SMITHSONIAN_COMMONS_CATEGORY
    }));
  }

  function searchBhlLive(query, options) {
    return searchCommonsLive(query, Object.assign({}, options || {}, {
      providerLabel: BHL_PROVIDER,
      commonsCategory: BHL_COMMONS_CATEGORY
    }));
  }

  function searchNaraLive(query, options) {
    return searchCommonsLive(query, Object.assign({}, options || {}, {
      providerLabel: NARA_PROVIDER,
      commonsCategory: NARA_COMMONS_CATEGORY
    }));
  }
