  function normalizedRijksRecordId(value) {
    var id = String(value || '').trim();
    return /^\d{1,16}$/.test(id) ? id : '';
  }

  function rijksSearchTerms(query, requestedKind) {
    var text = ' ' + plainMetadata(query).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    var rules = [
      { term: 'map', pattern: /\b(?:map|maps|mapping|atlas|cartograph(?:y|ic)?|topograph(?:y|ic)?|contour|geograph(?:y|ic)?)\b/ },
      { term: 'architecture', pattern: /\b(?:architecture|architectural|architect|blueprint|blueprints|building|buildings|floorplan|floorplans)\b/ },
      { term: 'wood', pattern: /\b(?:wood|wooden|timber|grain|oak|pine|maple|walnut)\b/ },
      { term: 'textile', pattern: /\b(?:textile|textiles|fabric|fabrics|woven|weaving|cloth|tapestry)\b/ },
      { term: 'ornament', pattern: /\b(?:ornament|ornamental|pattern|patterns|motif|motifs|decorative|decoration)\b/ },
      { term: 'anatomy', pattern: /\b(?:anatomy|anatomical|brainwave|brainwaves|nervous|neural|medical|physiology)\b/ },
      { term: 'plant', pattern: /\b(?:plant|plants|botanical|botany|flower|flowers|leaf|leaves|herbarium)\b/ },
      { term: 'print', pattern: /\b(?:archive|archival|ephemera|typography|typeface|letterpress|poster|posters|print|prints)\b/ },
      { term: 'drawing', pattern: /\b(?:drawing|drawings|diagram|diagrams|sketch|sketches|linework|illustration|illustrations)\b/ },
      { term: 'portrait', pattern: /\b(?:portrait|portraits|figure|figures|pose|poses|gesture|costume|costumes|nude|drapery|bust)\b/ },
      { term: 'landscape', pattern: /\b(?:landscape|landscapes|seascape|skyline|cityscape|clouds?|skies|mountain|mountains|coast|coastline|harbou?r|meadow|forest|river)\b/ }
    ];
    var kindFallback = {
      Maps: 'map', Blueprints: 'architecture', Textures: 'wood', Patterns: 'ornament',
      Science: 'anatomy', Botanical: 'plant', Archival: 'print',
      Figures: 'portrait', Landscapes: 'landscape',
      'Visual assets': 'drawing', All: 'drawing'
    };
    var terms = [];
    function add(term) {
      if (term && terms.indexOf(term) === -1) terms.push(term);
    }
    rules.forEach(function (rule) {
      if (rule.pattern.test(text)) add(rule.term);
    });
    add(kindFallback[String(requestedKind || '')] || 'drawing');
    add('drawing');
    return terms.slice(0, 3);
  }

  function rijksAggregationRecordId(value) {
    var match = String(value || '').trim().match(/^https:\/\/id\.rijksmuseum\.nl\/(\d{1,16})#aggregation$/);
    return match ? normalizedRijksRecordId(match[1]) : '';
  }
  function rijksRecordIdFromIdentifier(value) {
    var match = String(value || '').trim().match(/^https:\/\/id\.rijksmuseum\.nl\/(\d{1,16})(?:#(?:aggregation|object))?$/);
    return match ? normalizedRijksRecordId(match[1]) : '';
  }

  function safeRijksSourceUrl(value) {
    var safe = safeHttpsUrl(value);
    return /^https:\/\/www\.rijksmuseum\.nl\/(?:en\/collection|nl\/collectie)\/object\/[A-Za-z0-9][A-Za-z0-9._~%\/-]{0,240}$/.test(safe) ? safe : '';
  }

  function safeRijksIiifServiceUrl(value) {
    var safe = safeHttpsUrl(value);
    var match = safe.match(/^https:\/\/iiif\.micr\.io\/([A-Za-z0-9_-]{3,64})\/?$/);
    return match ? 'https://iiif.micr.io/' + match[1] : '';
  }

  function rijksIiifInfoUrl(serviceUrl) {
    var safeService = safeRijksIiifServiceUrl(serviceUrl);
    return safeService ? safeService + '/info.json' : '';
  }

  function rijksIiifStringList(value) {
    return (Array.isArray(value) ? value : []).map(function (entry) {
      return String(entry || '').trim();
    }).filter(Boolean);
  }

  function normalizeRijksIiifInfo(payload, expectedServiceUrl) {
    if (!payload || typeof payload !== 'object') return null;
    var expectedService = safeRijksIiifServiceUrl(expectedServiceUrl);
    var serviceUrl = safeRijksIiifServiceUrl(payload.id);
    if (!expectedService || serviceUrl !== expectedService
      || payload['@context'] !== 'http://iiif.io/api/image/3/context.json'
      || payload.type !== 'ImageService3'
      || payload.protocol !== 'http://iiif.io/api/image'
      || payload.profile !== 'level2') return null;
    var width = Number(payload.width);
    var height = Number(payload.height);
    if (!isFinite(width) || Math.floor(width) !== width || width < 1 || width > 100000
      || !isFinite(height) || Math.floor(height) !== height || height < 1 || height > 100000) return null;
    var formats = rijksIiifStringList(payload.extraFormats).concat(rijksIiifStringList(payload.formats));
    var qualities = rijksIiifStringList(payload.extraQualities).concat(rijksIiifStringList(payload.qualities));
    var features = rijksIiifStringList(payload.extraFeatures);
    if (formats.indexOf('jpg') === -1 || qualities.indexOf('default') === -1
      || features.indexOf('cors') === -1 || features.indexOf('sizeByConfinedWh') === -1) return null;
    var nativeArea = width * height;
    var maxArea = nativeArea;
    if (Object.prototype.hasOwnProperty.call(payload, 'maxArea')) {
      maxArea = Number(payload.maxArea);
      if (!isFinite(maxArea) || Math.floor(maxArea) !== maxArea || maxArea < 1 || maxArea > 10000000000) return null;
    }
    var scale = Math.min(1, Math.sqrt(maxArea / nativeArea));
    var pixelWidth = Math.floor(width * scale);
    var pixelHeight = Math.floor(height * scale);
    if (pixelWidth < 1 || pixelHeight < 1) return null;
    if (pixelWidth * pixelHeight > maxArea) {
      if (pixelWidth >= pixelHeight) pixelWidth = Math.max(1, Math.floor(maxArea / pixelHeight));
      else pixelHeight = Math.max(1, Math.floor(maxArea / pixelWidth));
    }
    if (pixelWidth * pixelHeight > maxArea) return null;
    return {
      serviceUrl: serviceUrl,
      infoUrl: rijksIiifInfoUrl(serviceUrl),
      nativeWidth: width,
      nativeHeight: height,
      maxArea: maxArea,
      pixelWidth: pixelWidth,
      pixelHeight: pixelHeight
    };
  }

  function rijksPreparedRendition(info) {
    var effectiveWidth = normalizedPixelDimension(info && info.pixelWidth);
    var effectiveHeight = normalizedPixelDimension(info && info.pixelHeight);
    if (!effectiveWidth || !effectiveHeight) return null;
    var scale = Math.min(1, RIJKS_PREPARATION_BOUND / effectiveWidth, RIJKS_PREPARATION_BOUND / effectiveHeight);
    var pixelWidth = Math.floor(effectiveWidth * scale);
    var pixelHeight = Math.floor(effectiveHeight * scale);
    var requestWidth = Math.min(RIJKS_PREPARATION_BOUND, effectiveWidth);
    var requestHeight = Math.min(RIJKS_PREPARATION_BOUND, effectiveHeight);
    if (!pixelWidth || !pixelHeight || !requestWidth || !requestHeight) return null;
    return {
      pixelWidth: pixelWidth,
      pixelHeight: pixelHeight,
      requestWidth: requestWidth,
      requestHeight: requestHeight
    };
  }

  function cloneRijksIiifInfo(info) {
    return info ? Object.assign({}, info) : null;
  }

  function removeRijksInfoCacheKey(key) {
    delete RIJKS_INFO_CACHE[key];
    RIJKS_INFO_CACHE_ORDER = RIJKS_INFO_CACHE_ORDER.filter(function (candidate) { return candidate !== key; });
  }

  function pruneRijksInfoCache(nowValue) {
    var now = Number(nowValue || Date.now());
    Object.keys(RIJKS_INFO_CACHE).forEach(function (key) {
      var savedAt = Number(RIJKS_INFO_CACHE[key] && RIJKS_INFO_CACHE[key].savedAt);
      if (!isFinite(savedAt) || savedAt > now + 300000 || now - savedAt >= RIJKS_INFO_CACHE_MS) removeRijksInfoCacheKey(key);
    });
    while (RIJKS_INFO_CACHE_ORDER.length > RIJKS_INFO_CACHE_LIMIT) removeRijksInfoCacheKey(RIJKS_INFO_CACHE_ORDER[0]);
  }

  function cachedRijksIiifInfo(key) {
    pruneRijksInfoCache(Date.now());
    var entry = RIJKS_INFO_CACHE[key];
    if (!entry || !entry.info) return null;
    RIJKS_INFO_CACHE_ORDER = RIJKS_INFO_CACHE_ORDER.filter(function (candidate) { return candidate !== key; });
    RIJKS_INFO_CACHE_ORDER.push(key);
    return cloneRijksIiifInfo(entry.info);
  }

  function rememberRijksIiifInfo(key, info) {
    if (!info) return;
    RIJKS_INFO_CACHE[key] = { savedAt: Date.now(), info: cloneRijksIiifInfo(info) };
    RIJKS_INFO_CACHE_ORDER = RIJKS_INFO_CACHE_ORDER.filter(function (candidate) { return candidate !== key; });
    RIJKS_INFO_CACHE_ORDER.push(key);
    pruneRijksInfoCache(Date.now());
  }

  function fetchRijksIiifInfo(serviceUrl, options) {
    var opts = options || {};
    var safeService = safeRijksIiifServiceUrl(serviceUrl);
    var fetchFn = opts.fetch || (typeof window.fetch === 'function' ? window.fetch.bind(window) : null);
    if (!safeService || !fetchFn) return Promise.reject(new Error('Rijksmuseum IIIF print evidence is unavailable.'));
    if (opts.bypassCache) {
      removeRijksInfoCacheKey(safeService);
      RIJKS_INFO_GENERATION[safeService] = Number(RIJKS_INFO_GENERATION[safeService] || 0) + 1;
    }
    var requestGeneration = Number(RIJKS_INFO_GENERATION[safeService] || 0);
    var cached = opts.bypassCache ? null : cachedRijksIiifInfo(safeService);
    if (cached) return Promise.resolve(cached);
    var shareable = !opts.bypassCache && !opts.signal;
    if (shareable && RIJKS_INFO_INFLIGHT[safeService]) {
      return RIJKS_INFO_INFLIGHT[safeService].then(cloneRijksIiifInfo);
    }
    var requestContext = providerRequestContext(opts.signal, 12000);
    var requestOptions = Object.assign({}, requestContext.options, {
      headers: { Accept: 'application/ld+json, application/json;q=0.9' }
    });
    var request = fetchFn(rijksIiifInfoUrl(safeService), requestOptions).then(function (response) {
      if (!response || !response.ok) throw providerHttpError(RIJKS_PROVIDER, response);
      var rawLength = response.headers && typeof response.headers.get === 'function'
        ? Number(response.headers.get('content-length')) : 0;
      if (isFinite(rawLength) && rawLength > 262144) throw new Error('Rijksmuseum returned oversized IIIF print metadata.');
      return response.json();
    }).then(function (payload) {
      return normalizeRijksIiifInfo(payload, safeService);
    });
    var completed = request.then(function (info) {
      requestContext.finish();
      if (info && Number(RIJKS_INFO_GENERATION[safeService] || 0) === requestGeneration) rememberRijksIiifInfo(safeService, info);
      return info;
    }, function (error) {
      requestContext.finish();
      throw error;
    });
    if (shareable) {
      RIJKS_INFO_INFLIGHT[safeService] = completed.then(function (info) {
        delete RIJKS_INFO_INFLIGHT[safeService];
        return info;
      }, function (error) {
        delete RIJKS_INFO_INFLIGHT[safeService];
        throw error;
      });
      return RIJKS_INFO_INFLIGHT[safeService].then(cloneRijksIiifInfo);
    }
    return completed.then(cloneRijksIiifInfo);
  }

  function rijksItemWithoutPrintEvidence(item) {
    return Object.assign({}, cloneLiveSearchItem(item), {
      pixelWidth: 0,
      pixelHeight: 0,
      pixelDimensionSource: 'unknown',
      rijksPreparationBoundWidth: 0,
      rijksPreparationBoundHeight: 0
    });
  }

  function enrichRijksPrintEvidence(item, options) {
    var opts = options || {};
    var identity = rijksIdentityFromAsset(item);
    var unknown = rijksItemWithoutPrintEvidence(item);
    if (!identity) return Promise.resolve(unknown);
    if (opts.signal && opts.signal.aborted) {
      var stopped = new Error('Search stopped.');
      stopped.name = 'AbortError';
      return Promise.reject(stopped);
    }
    return fetchRijksIiifInfo(identity.iiifServiceUrl, opts).then(function (info) {
      if (opts.signal && opts.signal.aborted) {
        var cancelled = new Error('Search stopped.');
        cancelled.name = 'AbortError';
        throw cancelled;
      }
      var prepared = rijksPreparedRendition(info);
      if (!prepared) return unknown;
      return Object.assign({}, unknown, {
        pixelWidth: prepared.pixelWidth,
        pixelHeight: prepared.pixelHeight,
        pixelDimensionSource: 'iiif-prepared',
        rijksPreparationBoundWidth: prepared.requestWidth,
        rijksPreparationBoundHeight: prepared.requestHeight
      });
    }, function (error) {
      if (opts.signal && opts.signal.aborted) {
        var cancelled = error instanceof Error ? error : new Error('Search stopped.');
        cancelled.name = 'AbortError';
        throw cancelled;
      }
      return unknown;
    });
  }

  function enrichRijksPrintEvidenceList(items, options) {
    var list = Array.isArray(items) ? items : [];
    var opts = options || {};
    var cancellation = null;
    return mapWithConcurrency(list, RIJKS_INFO_CONCURRENCY, function (item) {
      return enrichRijksPrintEvidence(item, opts).catch(function (error) {
        if (error && error.name === 'AbortError') cancellation = error;
        throw error;
      });
    }).then(function (results) {
      if (cancellation || (opts.signal && opts.signal.aborted)) {
        var stopped = cancellation || new Error('Search stopped.');
        stopped.name = 'AbortError';
        throw stopped;
      }
      return list.map(function (item, index) {
        return results[index] || rijksItemWithoutPrintEvidence(item);
      });
    });
  }

  function safeRijksImageUrl(value, expectedServiceUrl, expectedSize) {
    var safe = safeHttpsUrl(value);
    var match = safe.match(/^https:\/\/iiif\.micr\.io\/([A-Za-z0-9_-]{3,64})\/full\/(!1200,1200|max)\/0\/default\.jpg$/);
    if (!match) return '';
    var serviceUrl = 'https://iiif.micr.io/' + match[1];
    var expectedService = safeRijksIiifServiceUrl(expectedServiceUrl);
    var size = String(expectedSize || '');
    if ((expectedService && serviceUrl !== expectedService) || (size && match[2] !== size)) return '';
    return safe;
  }

  function rijksIiifServiceFromAsset(item) {
    if (!item || typeof item !== 'object') return '';
    var explicitValue = String(item.rijksIiifServiceUrl || '').trim();
    var explicitService = safeRijksIiifServiceUrl(explicitValue);
    if (explicitValue && !explicitService) return '';
    var candidates = explicitService ? [explicitService] : [];
    [item.imageUrl, item.downloadUrl].forEach(function (value) {
      var safe = safeRijksImageUrl(value);
      var markerIndex = safe.indexOf('/full/');
      if (markerIndex > 0) candidates.push(safe.slice(0, markerIndex));
    });
    var services = candidates.map(safeRijksIiifServiceUrl).filter(Boolean);
    if (!services.length || services.some(function (service) { return service !== services[0]; })) return '';
    return services[0];
  }

  function rijksAssetId(recordId, serviceUrl) {
    var normalizedId = normalizedRijksRecordId(recordId);
    var safeService = safeRijksIiifServiceUrl(serviceUrl);
    var match = safeService.match(/^https:\/\/iiif\.micr\.io\/([A-Za-z0-9_-]{3,64})$/);
    return normalizedId && match ? 'rijks-live-' + normalizedId + '-' + match[1] : '';
  }

  function rijksIdentityFromAsset(item) {
    if (!item || String(item.provider || '') !== RIJKS_PROVIDER) return null;
    var recordId = normalizedRijksRecordId(item.rijksRecordId);
    var sourceUrl = safeRijksSourceUrl(item.sourceUrl);
    var iiifServiceUrl = rijksIiifServiceFromAsset(item);
    var imageUrl = safeRijksImageUrl(item.imageUrl, iiifServiceUrl, '!1200,1200');
    var downloadUrl = safeRijksImageUrl(item.downloadUrl, iiifServiceUrl, 'max');
    var expectedId = rijksAssetId(recordId, iiifServiceUrl);
    if (!recordId || !sourceUrl || !iiifServiceUrl || !imageUrl || !downloadUrl || !expectedId || String(item.id || '') !== expectedId) return null;
    return {
      asset: item,
      recordId: recordId,
      sourceUrl: sourceUrl,
      iiifServiceUrl: iiifServiceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      resolverUrl: RIJKS_DATA_API + '/' + recordId + '?_profile=edm-framed'
    };
  }

  function normalizeRijksRights(value) {
    var raw = typeof value === 'string' ? value.trim() : '';
    var normalized = raw.charAt(raw.length - 1) === '/' ? raw.slice(0, -1) : raw;
    if (normalized === 'http://creativecommons.org/publicdomain/mark/1.0' || normalized === 'https://creativecommons.org/publicdomain/mark/1.0') {
      return {
        rightsType: 'pd', license: 'Public Domain Mark 1.0', rightsShort: 'Public domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', rawRightsUrl: raw
      };
    }
    if (normalized === 'http://creativecommons.org/publicdomain/zero/1.0' || normalized === 'https://creativecommons.org/publicdomain/zero/1.0') {
      return {
        rightsType: 'cc0', license: 'CC0 1.0', rightsShort: 'CC0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', rawRightsUrl: raw
      };
    }
    if (normalized === 'http://creativecommons.org/licenses/by/4.0' || normalized === 'https://creativecommons.org/licenses/by/4.0') {
      return {
        rightsType: 'ccby', license: 'CC BY 4.0', rightsShort: 'CC BY',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', rawRightsUrl: raw
      };
    }
    return null;
  }

  function rijksPreferredText(value) {
    if (typeof value === 'string' || typeof value === 'number') return plainMetadata(value);
    if (Array.isArray(value)) {
      for (var index = 0; index < value.length; index += 1) {
        var arrayText = rijksPreferredText(value[index]);
        if (arrayText) return arrayText;
      }
      return '';
    }
    if (!value || typeof value !== 'object') return '';
    var directKeys = ['en', '@value', 'nl', 'value', 'name', 'label'];
    for (var directIndex = 0; directIndex < directKeys.length; directIndex += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, directKeys[directIndex])) continue;
      var directText = rijksPreferredText(value[directKeys[directIndex]]);
      if (directText) return directText;
    }
    var labelKeys = [
      'http://www.w3.org/2004/02/skos/core#prefLabel',
      'http://www.w3.org/2004/02/skos/core#altLabel'
    ];
    for (var labelIndex = 0; labelIndex < labelKeys.length; labelIndex += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, labelKeys[labelIndex])) continue;
      var labelText = rijksPreferredText(value[labelKeys[labelIndex]]);
      if (labelText) return labelText;
    }
    return '';
  }

  function rijksLabeledValues(values) {
    var seen = {};
    return (Array.isArray(values) ? values : (values == null ? [] : [values])).map(function (entry) {
      return rijksPreferredText(entry);
    }).filter(function (text) {
      var key = text.toLowerCase();
      if (!text || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function rijksItemFromEdmRecord(record, query, requestedKind, expectedRecordId) {
    if (!record || typeof record !== 'object') return null;
    var recordId = rijksAggregationRecordId(record.id);
    var expectedId = normalizedRijksRecordId(expectedRecordId);
    var cho = record.aggregatedCHO && typeof record.aggregatedCHO === 'object' ? record.aggregatedCHO : {};
    var choRecordId = rijksRecordIdFromIdentifier(cho.id);
    if (record.type !== 'Aggregation' || !recordId || !choRecordId || (expectedId && recordId !== expectedId) || choRecordId !== recordId) return null;
    var rights = normalizeRijksRights(record.edmRights);
    if (!rights || !ALLOWED_RIGHTS[rights.rightsType]) return null;
    var sourceUrl = safeRijksSourceUrl(record.isShownAt && record.isShownAt.id);
    var serviceKey = 'http://rdfs.org/sioc/services#has_service';
    var shownBy = record.isShownBy && typeof record.isShownBy === 'object' ? record.isShownBy : {};
    var service = shownBy[serviceKey] && typeof shownBy[serviceKey] === 'object' ? shownBy[serviceKey] : {};
    var conformsToIiif = (Array.isArray(service.conformsTo) ? service.conformsTo : []).some(function (entry) {
      return entry && entry.id === 'http://iiif.io/api/image';
    });
    if (shownBy.type !== 'WebResource'
      || service.type !== 'http://rdfs.org/sioc/services#Service'
      || !conformsToIiif) return null;
    var iiifServiceUrl = safeRijksIiifServiceUrl(service.id);
    var downloadUrl = safeRijksImageUrl(shownBy.id, iiifServiceUrl, 'max');
    var objectUrl = record.object && typeof record.object === 'object' ? record.object.id : '';
    if (!sourceUrl || !iiifServiceUrl || !downloadUrl) return null;
    if (objectUrl && safeRijksImageUrl(objectUrl, iiifServiceUrl, 'max') !== downloadUrl) return null;
    var imageUrl = iiifServiceUrl + '/full/!1200,1200/0/default.jpg';
    if (!safeRijksImageUrl(imageUrl, iiifServiceUrl, '!1200,1200')) return null;

    var title = rijksPreferredText(cho.title) || 'Rijksmuseum object ' + recordId;
    var creators = rijksLabeledValues(cho.creator);
    var creator = creators.join('; ') || 'Creator listed on the Rijksmuseum object record';
    var year = rijksPreferredText(cho.created) || 'See source record';
    var types = rijksLabeledValues(cho.dcType);
    var media = rijksLabeledValues(cho.medium);
    var description = rijksPreferredText(cho.description) || types.concat(media).join(' · ') || 'Openly reusable visual asset from the Rijksmuseum.';
    if (title.length > 180) title = title.slice(0, 177) + '...';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [query, title, creator, year, description].concat(types, media).join(' ');
    var rightsNote = rights.rightsType === 'ccby'
      ? 'The exact Rijksmuseum EDM image record states CC BY 4.0. Attribution is required; verify the linked object record before use.'
      : 'The exact Rijksmuseum EDM image record states ' + rights.license + '. Verify the linked object record before use.';
    return {
      id: rijksAssetId(recordId, iiifServiceUrl),
      rijksRecordId: recordId,
      rijksIiifServiceUrl: iiifServiceUrl,
      title: title,
      kind: inferMaterialKind(classification, requestedKind),
      medium: normalizedMedium(types.concat(media)),
      provider: RIJKS_PROVIDER,
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: rightsNote,
      tags: normalizeWords(classification),
      accent: ['#e5e1d8', '#4f655e'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      live: true,
      rightsMetadataSource: 'Rijksmuseum EDM record ' + RIJKS_DATA_API + '/' + recordId + '?_profile=edm-framed; edmRights=' + rights.rawRightsUrl
    };
  }

  function decodedRijksQueryValue(value) {
    try { return decodeURIComponent(String(value || '').replace(/\+/g, ' ')); } catch (_) { return ''; }
  }

  function safeRijksNextPageUrl(value, expectedQuery) {
    var safe = safeHttpsUrl(value);
    var prefix = RIJKS_SEARCH_API + '?';
    if (!safe || safe.indexOf(prefix) !== 0 || safe.indexOf('#') !== -1 || safe.length > 2400) return '';
    var pairs = safe.slice(prefix.length).split('&');
    var params = {};
    for (var index = 0; index < pairs.length; index += 1) {
      var separatorIndex = pairs[index].indexOf('=');
      if (separatorIndex <= 0) return '';
      var key = decodedRijksQueryValue(pairs[index].slice(0, separatorIndex));
      var decoded = decodedRijksQueryValue(pairs[index].slice(separatorIndex + 1));
      if (!key || Object.prototype.hasOwnProperty.call(params, key) || ['description', 'imageAvailable', 'memberOfSetId', 'pageToken'].indexOf(key) === -1) return '';
      params[key] = decoded;
    }
    if (params.description !== expectedQuery || params.imageAvailable !== 'true' || params.memberOfSetId !== RIJKS_PUBLIC_DOMAIN_SET_ID || !/^[A-Za-z0-9+\/_=-]{8,1200}$/.test(params.pageToken || '')) return '';
    return safe;
  }

  function removeRijksPageCacheKey(key) {
    delete RIJKS_PAGE_CACHE[key];
    RIJKS_PAGE_CACHE_ORDER = RIJKS_PAGE_CACHE_ORDER.filter(function (candidate) { return candidate !== key; });
  }

  function pruneRijksPageCache(nowValue) {
    var now = Number(nowValue || Date.now());
    Object.keys(RIJKS_PAGE_CACHE).forEach(function (key) {
      var savedAt = Number(RIJKS_PAGE_CACHE[key] && RIJKS_PAGE_CACHE[key].savedAt);
      if (!isFinite(savedAt) || now - savedAt >= RIJKS_PAGE_CACHE_MS) removeRijksPageCacheKey(key);
    });
    while (RIJKS_PAGE_CACHE_ORDER.length > RIJKS_PAGE_CACHE_LIMIT) removeRijksPageCacheKey(RIJKS_PAGE_CACHE_ORDER[0]);
  }

  function rijksPageCacheEntry(query) {
    pruneRijksPageCache(Date.now());
    var key = String(query || '');
    var entry = RIJKS_PAGE_CACHE[key];
    if (!entry) {
      entry = {
        savedAt: Date.now(),
        urls: [RIJKS_SEARCH_API + '?description=' + encodeURIComponent(key) + '&imageAvailable=true&memberOfSetId=' + encodeURIComponent(RIJKS_PUBLIC_DOMAIN_SET_ID)]
      };
      RIJKS_PAGE_CACHE[key] = entry;
    }
    RIJKS_PAGE_CACHE_ORDER = RIJKS_PAGE_CACHE_ORDER.filter(function (candidate) { return candidate !== key; });
    RIJKS_PAGE_CACHE_ORDER.push(key);
    while (RIJKS_PAGE_CACHE_ORDER.length > RIJKS_PAGE_CACHE_LIMIT) removeRijksPageCacheKey(RIJKS_PAGE_CACHE_ORDER[0]);
    return entry;
  }

  function fetchRijksSearchPage(query, pageValue, fetchFn, signal) {
    var targetPage = Math.min(RIJKS_MAX_LOGICAL_PAGE, normalizedSearchPage(pageValue));
    var entry = rijksPageCacheEntry(query);
    var startPage = targetPage;
    while (startPage > 0 && !entry.urls[startPage]) startPage -= 1;
    var requestContext = providerRequestContext(signal, 16000);
    var requestOptions = Object.assign({}, requestContext.options, { headers: { Accept: 'application/ld+json' } });
    function fetchPage(pageIndex) {
      var pageUrl = entry.urls[pageIndex];
      if (!pageUrl) return Promise.resolve({ orderedItems: [] });
      return fetchFn(pageUrl, requestOptions).then(function (response) {
        if (!response || !response.ok) throw providerHttpError(RIJKS_PROVIDER, response);
        return response.json();
      }).then(function (payload) {
        if (!payload || payload.type !== 'OrderedCollectionPage' || !Array.isArray(payload.orderedItems)) {
          throw new Error('Rijksmuseum returned an unexpected collection-search response.');
        }
        var nextUrl = safeRijksNextPageUrl(payload.next && payload.next.id, query);
        if (nextUrl) entry.urls[pageIndex + 1] = nextUrl;
        else {
          Object.keys(entry.urls).forEach(function (key) {
            if (Number(key) > pageIndex) delete entry.urls[key];
          });
        }
        if (pageIndex >= targetPage) return payload;
        return nextUrl ? fetchPage(pageIndex + 1) : { orderedItems: [] };
      });
    }
    return fetchPage(startPage).then(function (payload) {
      requestContext.finish();
      return payload;
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function fetchRijksEdmRecord(recordId, fetchFn, signal) {
    var normalizedId = normalizedRijksRecordId(recordId);
    if (!normalizedId) return Promise.reject(new Error('A Rijksmuseum record is missing a trustworthy persistent identifier.'));
    var requestContext = providerRequestContext(signal, 12000);
    var requestOptions = Object.assign({}, requestContext.options, { headers: { Accept: 'application/ld+json' } });
    var url = RIJKS_DATA_API + '/' + normalizedId + '?_profile=edm-framed';
    return fetchFn(url, requestOptions).then(function (response) {
      if (!response || !response.ok) throw providerHttpError(RIJKS_PROVIDER, response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      return payload;
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function searchRijksLive(query, options) {
    var opts = options || {};
    var fetchFn = opts.fetch || (typeof window.fetch === 'function' ? window.fetch.bind(window) : null);
    if (!fetchFn) return Promise.reject(new Error('Rijksmuseum live search is unavailable in this browser.'));
    var q = plainMetadata(query).replace(/\s+/g, ' ').trim().slice(0, 140) || 'visual material';
    var page = normalizedSearchPage(opts.page);
    if (page > RIJKS_MAX_LOGICAL_PAGE) return Promise.resolve([]);
    var maximum = liveProviderLimit(RIJKS_PROVIDER, opts.limit);
    var candidateLimit = Math.min(24, Math.max(maximum, maximum * 2));
    var searchTerms = rijksSearchTerms(q, opts.kind);
    function fetchSearchPayload(termIndex) {
      return fetchRijksSearchPage(searchTerms[termIndex], page, fetchFn, opts.signal).then(function (payload) {
        if (page === 0 && !payload.orderedItems.length && termIndex + 1 < searchTerms.length) {
          return fetchSearchPayload(termIndex + 1);
        }
        return payload;
      });
    }
    return fetchSearchPayload(0).then(function (payload) {
      var seen = {};
      var ids = payload.orderedItems.map(function (entry) {
        return rijksRecordIdFromIdentifier(entry && entry.id);
      }).filter(function (id) {
        if (!id || seen[id]) return false;
        seen[id] = true;
        return true;
      }).slice(0, candidateLimit);
      return mapWithConcurrency(ids, 3, function (recordId) {
        return fetchRijksEdmRecord(recordId, fetchFn, opts.signal).then(function (record) {
          return rijksItemFromEdmRecord(record, q, opts.kind, recordId);
        }).then(function (item) {
          return { ok: true, item: item };
        }, function (error) {
          return { ok: false, error: error };
        });
      });
    }).then(function (settled) {
      var failures = settled.filter(function (result) { return result && result.ok === false; });
      var aborted = failures.filter(function (result) { return result.error && result.error.name === 'AbortError'; })[0];
      if (aborted) throw aborted.error;
      var completed = settled.filter(function (result) { return result && result.ok === true; });
      if (!completed.length && failures.length) throw failures[0].error;
      var seenIds = {};
      var admitted = completed.map(function (result) { return result.item; }).filter(Boolean).filter(function (item) {
        if (seenIds[item.id]) return false;
        seenIds[item.id] = true;
        return true;
      }).slice(0, maximum);
      return enrichRijksPrintEvidenceList(admitted, {
        fetch: fetchFn, signal: opts.signal, bypassCache: opts.bypassCache
      });
    });
  }

  function fetchRijksAssetsByIdentities(assets, options) {
    var opts = options || {};
    var fetchFn = opts.fetch || (typeof window.fetch === 'function' ? window.fetch.bind(window) : null);
    if (!fetchFn) return Promise.reject(new Error('Rijksmuseum record verification is unavailable in this browser.'));
    var identities = (Array.isArray(assets) ? assets : []).map(rijksIdentityFromAsset);
    if (identities.some(function (identity) { return !identity; })) {
      return Promise.reject(new Error('A Rijksmuseum asset is missing a trustworthy persistent identifier or IIIF identity.'));
    }
    return mapWithConcurrency(identities, RIJKS_REVALIDATION_CONCURRENCY, function (identity) {
      return fetchRijksEdmRecord(identity.recordId, fetchFn, opts.signal).then(function (record) {
        var fresh = rijksItemFromEdmRecord(record, identity.asset.title, identity.asset.kind, identity.recordId);
        if (!fresh) {
          throw new Error('A Rijksmuseum record no longer has an allowed exact image-rights statement and identity.');
        }
        if (!sourceVerifiedAssetIdentityMatches(identity.asset, fresh)) {
          throw new Error('A Rijksmuseum record has changed its source or IIIF identity since it was saved.');
        }
        return fresh;
      }).then(function (item) {
        return { ok: true, item: item };
      }, function (error) {
        return { ok: false, error: error };
      });
    }).then(function (settled) {
      var failed = settled.filter(function (result) { return !result || result.ok !== true; })[0];
      if (failed) throw (failed.error || new Error('A Rijksmuseum record could not be revalidated.'));
      return enrichRijksPrintEvidenceList(settled.map(function (result) { return result.item; }), {
        fetch: fetchFn, signal: opts.signal, bypassCache: opts.bypassCache
      });
    });
  }
