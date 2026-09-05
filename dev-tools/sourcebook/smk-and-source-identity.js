  function parsedSmkHttpsUrl(value) {
    var safe = safeHttpsUrl(value);
    var match = safe.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i);
    if (!match || /[@:]/.test(match[1])) return null;
    return { hostname: match[1].toLowerCase(), pathname: match[2] || '/', href: safe };
  }

  function safeSmkSourceUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname.toLowerCase() !== 'open.smk.dk') return '';
    var match = parsed.pathname.match(/^\/(?:[a-z]{2}\/)?artwork\/(?:image|view)\/(.+)$/i);
    if (!match) return '';
    var decoded = '';
    try { decoded = decodeURIComponent(match[1]); } catch (_) { return ''; }
    if (!normalizedSmkObjectNumber(decoded)) return '';
    return parsed.href;
  }

  function safeSmkMediaUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed) return '';
    var host = parsed.hostname.toLowerCase();
    if (host === 'api.smk.dk' && /^\/api\/v1\/(?:thumbnail|download)\/[^/]+(?:\/|$)/i.test(parsed.pathname)) return parsed.href;
    if ((host === 'iip.smk.dk' || host === 'iip-thumb.smk.dk') && /^\/iiif\/jp2\/.+/i.test(parsed.pathname)) return parsed.href;
    return '';
  }

  function normalizedSmkObjectNumber(value) {
    if (typeof value !== 'string') return '';
    var objectNumber = value.trim();
    if (!/^[A-Za-z0-9\u00c6\u00d8\u00e6\u00f8][A-Za-z0-9\u00c6\u00d8\u00e6\u00f8 .,\/()\-]{0,63}$/.test(objectNumber)) return '';
    if (/\/$|\/\//.test(objectNumber) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(objectNumber)) return '';
    return objectNumber;
  }

  function normalizedSmkProviderRecordId(value) {
    if (typeof value !== 'string') return '';
    var providerRecordId = value.trim();
    return /^\d{10}_object$/.test(providerRecordId) ? providerRecordId : '';
  }

  function smkObjectNumberFromSourceUrl(value) {
    var safe = safeSmkSourceUrl(value);
    var parsed = safe && parsedSmkHttpsUrl(safe);
    var match = parsed && parsed.pathname.match(/^\/(?:[a-z]{2}\/)?artwork\/(?:image|view)\/(.+)$/i);
    if (!match) return '';
    var decoded = '';
    try { decoded = decodeURIComponent(match[1]); } catch (_) { return ''; }
    return normalizedSmkObjectNumber(decoded);
  }

  function smkObjectNumberFromAsset(item) {
    if (!item || String(item.provider || '') !== SMK_PROVIDER) return '';
    var objectNumber = normalizedSmkObjectNumber(item.objectNumber);
    var sourceObjectNumber = smkObjectNumberFromSourceUrl(item.sourceUrl);
    if (item.objectNumber && !objectNumber) return '';
    if (objectNumber && sourceObjectNumber && objectNumber.toLowerCase() !== sourceObjectNumber.toLowerCase()) return '';
    return objectNumber || sourceObjectNumber;
  }

  function isSerializedRijksAsset(item) {
    if (!item || typeof item !== 'object') return false;
    if (String(item.provider || '').trim().toLowerCase() === RIJKS_PROVIDER.toLowerCase()) return true;
    var rijksHosts = {
      'data.rijksmuseum.nl': true, 'id.rijksmuseum.nl': true,
      'www.rijksmuseum.nl': true, 'iiif.micr.io': true
    };
    var hasRijksHost = [item.sourceUrl, item.imageUrl, item.downloadUrl, item.rijksIiifServiceUrl].some(function (value) {
      var parsed = parsedSmkHttpsUrl(value);
      return !!(parsed && rijksHosts[parsed.hostname]);
    });
    return hasRijksHost || /^rijks-live-/i.test(String(item.id || ''))
      || Object.prototype.hasOwnProperty.call(item, 'rijksRecordId')
      || Object.prototype.hasOwnProperty.call(item, 'rijksIiifServiceUrl');
  }

  function isSerializedSmkAsset(item) {
    if (!item || typeof item !== 'object') return false;
    if (String(item.provider || '').trim().toLowerCase() === SMK_PROVIDER.toLowerCase()) return true;
    var smkHosts = { 'open.smk.dk': true, 'api.smk.dk': true, 'iip.smk.dk': true, 'iip-thumb.smk.dk': true };
    var hasSmkHost = [item.sourceUrl, item.imageUrl, item.downloadUrl].some(function (value) {
      var parsed = parsedSmkHttpsUrl(value);
      return !!(parsed && smkHosts[parsed.hostname]);
    });
    if (hasSmkHost) return true;
    return Object.prototype.hasOwnProperty.call(item, 'objectNumber') || Object.prototype.hasOwnProperty.call(item, 'providerRecordId');
  }

  function isSerializedYaleAsset(item) {
    if (!item || typeof item !== 'object') return false;
    if (String(item.provider || '').trim().toLowerCase() === YALE_PROVIDER.toLowerCase()) return true;
    var yaleHosts = {
      'lux.collections.yale.edu': true, 'artgallery.yale.edu': true,
      'manifests.collections.yale.edu': true, 'media.art.yale.edu': true,
      'images.collections.yale.edu': true
    };
    var hasYaleHost = [item.sourceUrl, item.imageUrl, item.downloadUrl, item.yaleManifestUrl, item.yaleIiifServiceUrl].some(function (value) {
      var parsed = parsedSmkHttpsUrl(value);
      return !!(parsed && yaleHosts[parsed.hostname]);
    });
    return hasYaleHost || /^yale-live-/i.test(String(item.id || ''))
      || Object.prototype.hasOwnProperty.call(item, 'yaleLuxId')
      || Object.prototype.hasOwnProperty.call(item, 'yaleManifestUrl');
  }

  function isSerializedSourceVerifiedAsset(item) {
    return isSerializedRijksAsset(item) || isSerializedMuseumsVictoriaAsset(item) || isSerializedYaleAsset(item) || isSerializedSmkAsset(item)
      || (isCatalogSourcebookAsset(item) && !curatedSourcebookAsset(item));
  }

  function sourceVerifiedAssetIdentityMatches(raw, verified) {
    if (!raw || !verified) return false;
    if (verified.provider === RIJKS_PROVIDER) {
      var rawRijksIdentity = rijksIdentityFromAsset(Object.assign({}, raw, { provider: RIJKS_PROVIDER }));
      var verifiedRijksIdentity = rijksIdentityFromAsset(verified);
      return !!(rawRijksIdentity && verifiedRijksIdentity
        && rawRijksIdentity.recordId === verifiedRijksIdentity.recordId
        && rawRijksIdentity.sourceUrl === verifiedRijksIdentity.sourceUrl
        && rawRijksIdentity.iiifServiceUrl === verifiedRijksIdentity.iiifServiceUrl
        && rawRijksIdentity.imageUrl === verifiedRijksIdentity.imageUrl
        && rawRijksIdentity.downloadUrl === verifiedRijksIdentity.downloadUrl);
    }
    if (verified.provider === MUSEUMS_VICTORIA_PROVIDER) {
      var rawMuseumsVictoriaIdentity = museumsVictoriaIdentityFromAsset(raw);
      var verifiedMuseumsVictoriaIdentity = museumsVictoriaIdentityFromAsset(verified);
      return !!(rawMuseumsVictoriaIdentity && verifiedMuseumsVictoriaIdentity
        && rawMuseumsVictoriaIdentity.recordPath === verifiedMuseumsVictoriaIdentity.recordPath
        && rawMuseumsVictoriaIdentity.mediaId === verifiedMuseumsVictoriaIdentity.mediaId
        && rawMuseumsVictoriaIdentity.sourceUrl === verifiedMuseumsVictoriaIdentity.sourceUrl);
    }
    if (verified.provider === SMK_PROVIDER) {
      return isSerializedSmkAsset(raw)
        && smkObjectNumberFromAsset(Object.assign({}, raw, { provider: SMK_PROVIDER })).toLowerCase() === smkObjectNumberFromAsset(verified).toLowerCase();
    }
    if (verified.provider === YALE_PROVIDER) {
      var rawIdentity = yaleIdentityFromAsset(raw);
      return !!(rawIdentity
        && rawIdentity.sourceUrl === safeYaleSourceUrl(verified.sourceUrl)
        && rawIdentity.objectId === String(verified.providerRecordId || '')
        && rawIdentity.luxUuid === normalizedYaleLuxId(verified.yaleLuxId)
        && rawIdentity.manifestUrl === safeYaleManifestUrl(verified.yaleManifestUrl)
        && rawIdentity.iiifServiceUrl === yaleIiifServiceFromAsset(verified));
    }
    return isCatalogSourcebookAsset(raw) && sameCatalogIdentity(raw, verified) && raw.rightsType === verified.rightsType
      && String(raw.licenseUrl || '') === String(verified.licenseUrl || '');
  }

  function normalizeSmkRights(record) {
    if (!record || record.public_domain !== true || record.has_image !== true) return null;
    if (typeof record.rights !== 'string') return null;
    var rightsUrl = record.rights.trim();
    if (rightsUrl === 'https://creativecommons.org/publicdomain/mark/1.0/') {
      return { rightsType: 'pd', license: 'Public Domain Mark 1.0', rightsShort: 'Public domain', licenseUrl: rightsUrl };
    }
    if (rightsUrl === 'https://creativecommons.org/publicdomain/zero/1.0/') {
      return { rightsType: 'cc0', license: 'CC0 1.0', rightsShort: 'CC0', licenseUrl: rightsUrl };
    }
    return null;
  }

  function smkMetadataList(values, fields) {
    var keys = Array.isArray(fields) ? fields : [];
    return (Array.isArray(values) ? values : (values == null ? [] : [values])).map(function (entry) {
      if (typeof entry === 'string' || typeof entry === 'number') return plainMetadata(entry);
      if (!entry || typeof entry !== 'object') return '';
      for (var i = 0; i < keys.length; i += 1) {
        var text = plainMetadata(entry[keys[i]]);
        if (text) return text;
      }
      return '';
    }).filter(Boolean);
  }

  function smkItemFromArtwork(record, query, requestedKind) {
    var rights = normalizeSmkRights(record);
    if (!rights) return null;
    var objectNumber = normalizedSmkObjectNumber(record.object_number);
    if (!objectNumber) return null;
    var providerRecordId = normalizedSmkProviderRecordId(record.id);
    if (!providerRecordId) return null;
    var rawId = plainMetadata(record.id || objectNumber);
    var stableId = String(rawId || objectNumber).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 104);
    if (!stableId) return null;

    var fallbackSource = 'https://open.smk.dk/en/artwork/image/' + encodeURIComponent(objectNumber);
    var sourceUrl = safeSmkSourceUrl(record.frontend_url);
    if (sourceUrl && smkObjectNumberFromSourceUrl(sourceUrl).toLowerCase() !== objectNumber.toLowerCase()) sourceUrl = '';
    sourceUrl = sourceUrl || safeSmkSourceUrl(fallbackSource);
    var imageUrl = safeSmkMediaUrl(record.image_thumbnail || record.image_native);
    var downloadUrl = safeSmkMediaUrl(record.image_native || record.image_thumbnail);
    if (!sourceUrl || !imageUrl || !downloadUrl) return null;

    var titles = Array.isArray(record.titles) ? record.titles : [];
    var englishTitles = titles.filter(function (entry) { return entry && /^en(?:-|$)/i.test(String(entry.language || '')); });
    var title = smkMetadataList(englishTitles, ['title', 'translation'])[0]
      || smkMetadataList(titles, ['translation', 'title'])[0]
      || 'SMK Open artwork ' + objectNumber;
    var creators = smkMetadataList(record.artist, ['name', 'artist', 'creator']);
    if (!creators.length) creators = smkMetadataList(record.production, ['creator', 'craftsman', 'creator_surname']);
    var creator = creators.slice(0, 3).join('; ') || 'Creator listed on the SMK Open record';
    var productionDates = smkMetadataList(record.production_date, ['period', 'start', 'end']);
    var year = productionDates[0] || smkMetadataList(record.production_dates_notes, [])[0] || 'See source record';
    var objectNames = smkMetadataList(record.object_names, ['name']);
    var materials = smkMetadataList(record.materials, ['material', 'name']);
    var techniques = smkMetadataList(record.techniques, ['technique', 'name']);
    var content = smkMetadataList(record.content_description, ['text', 'description']);
    var details = objectNames.concat(materials, techniques, content).filter(function (value, index, all) { return all.indexOf(value) === index; });
    var description = details.slice(0, 6).join(' · ') || 'Public-domain visual asset from the National Gallery of Denmark.';
    if (title.length > 180) title = title.slice(0, 177) + '...';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [title, creator, objectNumber].concat(objectNames, materials, techniques, content).join(' ');
    return {
      id: 'smk-live-' + stableId,
      objectNumber: objectNumber,
      providerRecordId: providerRecordId,
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium(objectNames.concat(techniques, materials)),
      provider: SMK_PROVIDER,
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: 'The SMK API reports public_domain=true and has_image=true, and its item-level rights URL is exactly ' + rights.license + '. Verify the linked SMK Open record before use.',
      tags: normalizeWords(classification),
      accent: ['#ece3d1', '#7a342b'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      pixelWidth: normalizedPixelDimension(record.image_width),
      pixelHeight: normalizedPixelDimension(record.image_height),
      live: true,
      rightsMetadataSource: 'SMK API public_domain=true; has_image=true; rights=' + rights.licenseUrl
    };
  }

  function cloneSmkVerifiedItem(item) {
    return Object.assign({}, item, {
      tags: Array.isArray(item && item.tags) ? item.tags.slice() : [],
      accent: Array.isArray(item && item.accent) ? item.accent.slice() : ['#ece3d1', '#7a342b']
    });
  }

  function requestSmkArtworkChunk(chunk, options) {
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('SMK Open record verification is unavailable in this browser.'));
    var requestedByKey = {};
    chunk.forEach(function (objectNumber) { requestedByKey[objectNumber.toLowerCase()] = objectNumber; });
    var params = chunk.map(function (objectNumber) { return 'object_number=' + encodeURIComponent(objectNumber); });
    params.push('lang=en');
    var requestContext = providerRequestContext(opts.signal, 12000);
    return fetchFn(SMK_API + '/art/?' + params.join('&'), requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError(SMK_PROVIDER, response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      var records = payload && Array.isArray(payload.items) ? payload.items : null;
      if (!records) throw new Error('SMK Open returned an invalid record-verification response.');
      var freshByKey = {};
      records.forEach(function (record) {
        var objectNumber = normalizedSmkObjectNumber(record && record.object_number);
        var key = objectNumber && objectNumber.toLowerCase();
        if (!key || !requestedByKey[key]) throw new Error('SMK Open returned a mismatched record during verification.');
        if (freshByKey[key]) throw new Error('SMK Open returned duplicate records during verification.');
        var fresh = smkItemFromArtwork(record, '', 'All');
        if (!fresh) throw new Error('An SMK Open record no longer has compatible public-domain rights or usable media.');
        freshByKey[key] = fresh;
      });
      chunk.forEach(function (objectNumber) {
        if (!freshByKey[objectNumber.toLowerCase()]) throw new Error('An SMK Open record could not be found during verification.');
      });
      if (records.length !== chunk.length) throw new Error('SMK Open returned an ambiguous record-verification response.');
      return freshByKey;
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function fetchSmkArtworksByObjectNumbers(objectNumbers, options) {
    var opts = options || {};
    var requested = (Array.isArray(objectNumbers) ? objectNumbers : []).map(normalizedSmkObjectNumber);
    if (!requested.length || requested.some(function (value) { return !value; })) {
      return Promise.reject(new Error('An SMK Open record is missing a valid object number.'));
    }
    var unique = [];
    var seen = {};
    requested.forEach(function (objectNumber) {
      var key = objectNumber.toLowerCase();
      if (!seen[key]) { seen[key] = true; unique.push(objectNumber); }
    });
    var verifiedByKey = {};
    var missing = [];
    var now = Date.now();
    unique.forEach(function (objectNumber) {
      var key = objectNumber.toLowerCase();
      var cached = !opts.bypassCache && SMK_VERIFIED_RECORD_CACHE[key];
      if (cached && now - cached.savedAt <= SMK_REVALIDATION_CACHE_MS) verifiedByKey[key] = cloneSmkVerifiedItem(cached.item);
      else missing.push(objectNumber);
    });
    var chunks = [];
    for (var start = 0; start < missing.length; start += SMK_REVALIDATION_BATCH_SIZE) {
      chunks.push(missing.slice(start, start + SMK_REVALIDATION_BATCH_SIZE));
    }
    var firstError = null;
    return mapWithConcurrency(chunks, SMK_REVALIDATION_CONCURRENCY, function (chunk) {
      return requestSmkArtworkChunk(chunk, opts).then(function (freshByKey) {
        Object.keys(freshByKey).forEach(function (key) {
          var fresh = cloneSmkVerifiedItem(freshByKey[key]);
          verifiedByKey[key] = fresh;
          SMK_VERIFIED_RECORD_CACHE[key] = { savedAt: Date.now(), item: cloneSmkVerifiedItem(fresh) };
        });
        return true;
      }).catch(function (error) {
        if (!firstError) firstError = error;
        throw error;
      });
    }).then(function (outcomes) {
      if (firstError || outcomes.some(function (outcome) { return outcome !== true; })) {
        throw firstError || new Error('SMK Open record verification did not complete.');
      }
      return requested.map(function (objectNumber) {
        var fresh = verifiedByKey[objectNumber.toLowerCase()];
        if (!fresh) throw new Error('An SMK Open record could not be verified.');
        return cloneSmkVerifiedItem(fresh);
      });
    });
  }

  function fetchSmkArtworkByObjectNumber(objectNumber, options) {
    return fetchSmkArtworksByObjectNumbers([objectNumber], options).then(function (items) { return items[0]; });
  }

  function searchSmkLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('SMK Open live search is unavailable in this browser.'));
    var kindHints = {
      Maps: ' map cartography', Textures: ' surface texture', Patterns: ' ornament textile pattern',
      Blueprints: ' architectural technical drawing', Science: ' scientific anatomy diagram',
      Botanical: ' botanical natural history', Archival: ' historic print drawing',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var page = normalizedSearchPage(opts.page);
    var maximum = Math.max(4, Math.min(24, Number(opts.limit || 18)));
    var params = [
      'keys=' + encodeURIComponent(searchText),
      'qfields=titles,content_subject,tags,techniques,materials,medium',
      'filters=' + encodeURIComponent('[public_domain:true],[has_image:true]'),
      'offset=' + (page * maximum),
      'rows=' + maximum,
      'lang=en'
    ];
    var requestContext = providerRequestContext(opts.signal, 12000);
    return fetchFn(SMK_API + '/art/search/?' + params.join('&'), requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError(SMK_PROVIDER, response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      var records = payload && Array.isArray(payload.items) ? payload.items : [];
      return records.map(function (record) { return smkItemFromArtwork(record, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }
