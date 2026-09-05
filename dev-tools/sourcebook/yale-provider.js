  function safeYaleLuxObjectUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname !== 'lux.collections.yale.edu') return '';
    return /^\/data\/object\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.pathname) ? parsed.href : '';
  }

  function safeYaleSourceUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname !== 'artgallery.yale.edu') return '';
    return /^\/collections\/objects\/\d{1,12}$/i.test(parsed.pathname) ? parsed.href : '';
  }

  function safeYaleManifestUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname !== 'manifests.collections.yale.edu') return '';
    return /^\/yuag\/obj\/\d{1,12}$/i.test(parsed.pathname) ? parsed.href : '';
  }

  function safeYaleMediaEquivalentUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname !== 'media.art.yale.edu') return '';
    return /^\/content\/lux\/obj\/\d{1,12}\.json$/i.test(parsed.pathname) ? parsed.href : '';
  }

  function safeYaleIiifServiceUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname !== 'images.collections.yale.edu') return '';
    return /^\/iiif\/2\/yuag:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.pathname) ? parsed.href.replace(/\/$/, '') : '';
  }

  function safeYalePreparedImageUrl(value) {
    var parsed = parsedSmkHttpsUrl(value);
    if (!parsed || parsed.hostname !== 'images.collections.yale.edu') return '';
    return /^\/iiif\/2\/yuag:[0-9a-f-]{36}\/full\/!(?:1200,1200|3000,3000)\/0\/default\.jpg$/i.test(parsed.pathname) ? parsed.href : '';
  }

  function yaleIiifServiceFromAsset(item) {
    if (!item || typeof item !== 'object') return '';
    var candidates = [item.yaleIiifServiceUrl];
    [item.imageUrl, item.downloadUrl].forEach(function (value) {
      var prepared = safeYalePreparedImageUrl(value);
      var marker = prepared.indexOf('/full/!');
      if (marker > 0) candidates.push(prepared.slice(0, marker));
    });
    for (var index = 0; index < candidates.length; index += 1) {
      var serviceUrl = safeYaleIiifServiceUrl(candidates[index]);
      var serviceUuid = yaleIdFromUrl(serviceUrl, /^\/iiif\/2\/yuag:([0-9a-f-]{36})$/i).toLowerCase();
      if (serviceUuid && normalizedYaleLuxId(serviceUuid)) {
        return 'https://images.collections.yale.edu/iiif/2/yuag:' + serviceUuid;
      }
    }
    return '';
  }

  function yaleCollectStrings(value, output, depth) {
    var list = output || [];
    var level = Number(depth || 0);
    if (level > 10 || list.length >= 2500 || value == null) return list;
    if (typeof value === 'string' || typeof value === 'number') {
      var text = String(value).trim();
      if (text) list.push(text);
      return list;
    }
    if (Array.isArray(value)) {
      value.forEach(function (entry) { yaleCollectStrings(entry, list, level + 1); });
      return list;
    }
    if (typeof value === 'object') {
      Object.keys(value).slice(0, 250).forEach(function (key) { yaleCollectStrings(value[key], list, level + 1); });
    }
    return list;
  }

  function yaleIdFromUrl(value, pattern) {
    var parsed = parsedSmkHttpsUrl(value);
    var match = parsed && parsed.pathname.match(pattern);
    return match ? match[1] : '';
  }

  function yaleRecordLinks(record) {
    if (!record || typeof record !== 'object') return null;
    var luxUrl = safeYaleLuxObjectUrl(record.id || record['@id']);
    if (!luxUrl) return null;
    var strings = yaleCollectStrings(record, [], 0);
    function firstSafe(normalizer) {
      for (var i = 0; i < strings.length; i += 1) {
        var safe = normalizer(strings[i]);
        if (safe) return safe;
      }
      return '';
    }
    var sourceUrl = firstSafe(safeYaleSourceUrl);
    var manifestUrl = firstSafe(safeYaleManifestUrl);
    var mediaEquivalentUrl = firstSafe(safeYaleMediaEquivalentUrl);
    var sourceId = yaleIdFromUrl(sourceUrl, /^\/collections\/objects\/(\d{1,12})$/i);
    var manifestId = yaleIdFromUrl(manifestUrl, /^\/yuag\/obj\/(\d{1,12})$/i);
    var mediaId = yaleIdFromUrl(mediaEquivalentUrl, /^\/content\/lux\/obj\/(\d{1,12})\.json$/i);
    var luxUuid = yaleIdFromUrl(luxUrl, /^\/data\/object\/([0-9a-f-]{36})$/i).toLowerCase();
    if (!sourceId || sourceId !== manifestId || sourceId !== mediaId || !luxUuid) return null;
    return {
      objectId: sourceId, luxUuid: luxUuid, luxUrl: luxUrl,
      sourceUrl: sourceUrl, manifestUrl: manifestUrl, mediaEquivalentUrl: mediaEquivalentUrl
    };
  }

  function yaleIiifTextValues(value, output, depth) {
    var list = output || [];
    var level = Number(depth || 0);
    if (level > 5 || list.length >= 100 || value == null) return list;
    if (typeof value === 'string' || typeof value === 'number') {
      var text = plainMetadata(value);
      if (text) list.push(text);
      return list;
    }
    if (Array.isArray(value)) {
      value.forEach(function (entry) { yaleIiifTextValues(entry, list, level + 1); });
      return list;
    }
    if (typeof value === 'object') {
      Object.keys(value).slice(0, 40).forEach(function (key) { yaleIiifTextValues(value[key], list, level + 1); });
    }
    return list;
  }

  function yaleIiifMetadataValue(metadata, labels) {
    var wanted = (Array.isArray(labels) ? labels : [labels]).map(function (label) { return String(label || '').trim().toLowerCase(); });
    var entries = Array.isArray(metadata) ? metadata : [];
    for (var i = 0; i < entries.length; i += 1) {
      var labelValues = yaleIiifTextValues(entries[i] && entries[i].label, [], 0).map(function (value) { return value.toLowerCase(); });
      if (!labelValues.some(function (value) { return wanted.indexOf(value) !== -1; })) continue;
      var values = yaleIiifTextValues(entries[i] && entries[i].value, [], 0);
      if (values.length) return values.join('; ');
    }
    return '';
  }

  function yaleImageBodies(canvas) {
    var bodies = [];
    (canvas && Array.isArray(canvas.items) ? canvas.items : []).forEach(function (page) {
      (page && Array.isArray(page.items) ? page.items : []).forEach(function (annotation) {
        var body = annotation && annotation.body;
        if (Array.isArray(body)) bodies = bodies.concat(body);
        else if (body && typeof body === 'object') bodies.push(body);
      });
    });
    return bodies;
  }

  function yaleItemFromManifest(record, manifest, query, requestedKind) {
    var links = yaleRecordLinks(record);
    if (!links || !manifest || typeof manifest !== 'object') return null;
    var manifestUrl = safeYaleManifestUrl(manifest.id || manifest['@id']);
    if (!manifestUrl || manifestUrl !== links.manifestUrl) return null;
    var homepageStrings = yaleCollectStrings(manifest.homepage, [], 0);
    var homepageMatches = homepageStrings.some(function (value) { return safeYaleSourceUrl(value) === links.sourceUrl; });
    if (!homepageMatches) return null;
    var copyrightStatement = yaleIiifMetadataValue(manifest.metadata, 'Copyright Statement');
    if (copyrightStatement.trim().toLowerCase() !== 'public domain') return null;

    var canvases = Array.isArray(manifest.items) ? manifest.items : [];
    var selected = null;
    for (var canvasIndex = 0; canvasIndex < canvases.length && !selected; canvasIndex += 1) {
      var canvas = canvases[canvasIndex];
      var imageUseRights = yaleIiifMetadataValue(canvas && canvas.metadata, 'Image Use Rights');
      if (imageUseRights.trim().toLowerCase() !== 'no copyright - united states') continue;
      var bodies = yaleImageBodies(canvas);
      for (var bodyIndex = 0; bodyIndex < bodies.length && !selected; bodyIndex += 1) {
        var body = bodies[bodyIndex];
        if (!body || body.type !== 'Image' || String(body.format || '').toLowerCase() !== 'image/jpeg') continue;
        var services = Array.isArray(body.service) ? body.service : (body.service ? [body.service] : []);
        var serviceUrl = '';
        for (var serviceIndex = 0; serviceIndex < services.length && !serviceUrl; serviceIndex += 1) {
          serviceUrl = safeYaleIiifServiceUrl(services[serviceIndex] && (services[serviceIndex].id || services[serviceIndex]['@id']));
        }
        if (!serviceUrl) continue;
        var bodyUrl = parsedSmkHttpsUrl(body.id || body['@id']);
        var serviceParsed = parsedSmkHttpsUrl(serviceUrl);
        if (!bodyUrl || !serviceParsed || bodyUrl.hostname !== serviceParsed.hostname || bodyUrl.pathname.indexOf(serviceParsed.pathname + '/') !== 0) continue;
        selected = { canvas: canvas, body: body, serviceUrl: serviceUrl, imageUseRights: imageUseRights };
      }
    }
    if (!selected) return null;

    var serviceUuid = yaleIdFromUrl(selected.serviceUrl, /^\/iiif\/2\/yuag:([0-9a-f-]{36})$/i).toLowerCase();
    if (!serviceUuid) return null;
    var title = yaleIiifTextValues(manifest.label, [], 0)[0] || plainMetadata(record._label) || 'Yale University Art Gallery object ' + links.objectId;
    var creator = yaleIiifMetadataValue(manifest.metadata, ['Artist/Maker', 'Creator', 'Artist', 'Maker']) || 'Creator listed on the Yale object record';
    var year = yaleIiifMetadataValue(manifest.metadata, ['Date', 'Creation Date']) || 'See source record';
    var details = [
      yaleIiifMetadataValue(manifest.metadata, ['Medium', 'Materials']),
      yaleIiifMetadataValue(manifest.metadata, ['Culture', 'Classification']),
      yaleIiifMetadataValue(manifest.metadata, ['Credit Line'])
    ].filter(Boolean);
    var description = details.join(' · ') || 'Public-domain visual asset from the Yale University Art Gallery.';
    if (title.length > 180) title = title.slice(0, 177) + '...';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [title, creator, year, description, plainMetadata(record._label)].join(' ');
    return {
      id: 'yale-live-' + links.objectId + '-' + serviceUuid.replace(/-/g, '').slice(0, 12),
      providerRecordId: links.objectId, yaleLuxId: links.luxUuid, yaleManifestUrl: links.manifestUrl,
      title: title, kind: inferMaterialKind([query, classification].join(' '), requestedKind), provider: YALE_PROVIDER, medium: normalizedMedium([yaleIiifMetadataValue(manifest.metadata, ['Medium', 'Materials']), yaleIiifMetadataValue(manifest.metadata, ['Classification'])]),
      year: year, creator: creator, description: description,
      license: 'Public domain — No Copyright in the United States', licenseUrl: YALE_OPEN_TERMS,
      rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The Yale IIIF manifest says Copyright Statement: Public domain, and this exact image canvas says Image Use Rights: No Copyright - United States. Verify the linked Gallery record before use.',
      tags: normalizeWords(classification), accent: ['#e8e2d4', '#3d5e71'],
      sourceUrl: links.sourceUrl,
      yaleIiifServiceUrl: 'https://images.collections.yale.edu/iiif/2/yuag:' + serviceUuid,
      imageUrl: selected.serviceUrl + '/full/!1200,1200/0/default.jpg',
      downloadUrl: selected.serviceUrl + '/full/!3000,3000/0/default.jpg',
      pixelWidth: normalizedPixelDimension(selected.body.width || selected.canvas.width),
      pixelHeight: normalizedPixelDimension(selected.body.height || selected.canvas.height),
      live: true,
      rightsMetadataSource: 'Yale IIIF manifest ' + links.manifestUrl + '; Copyright Statement=Public domain; canvas Image Use Rights=No Copyright - United States'
    };
  }

  function fetchYaleJson(url, fetchFn, signal) {
    var requestContext = providerRequestContext(signal, 12000);
    return fetchFn(url, requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError(YALE_PROVIDER, response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      return payload;
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function normalizedYaleLuxId(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized) ? normalized : '';
  }

  function yaleIdentityFromAsset(item) {
    if (!isSerializedYaleAsset(item)) return null;
    var luxUuid = normalizedYaleLuxId(item.yaleLuxId);
    var objectId = String(item.providerRecordId || '').trim();
    var sourceUrl = safeYaleSourceUrl(item.sourceUrl);
    var manifestUrl = safeYaleManifestUrl(item.yaleManifestUrl);
    var iiifServiceUrl = yaleIiifServiceFromAsset(item);
    var sourceId = yaleIdFromUrl(sourceUrl, /^\/collections\/objects\/(\d{1,12})$/i);
    var manifestId = yaleIdFromUrl(manifestUrl, /^\/yuag\/obj\/(\d{1,12})$/i);
    if (!luxUuid || !/^\d{1,12}$/.test(objectId) || objectId !== sourceId || objectId !== manifestId || !iiifServiceUrl) return null;
    var luxUrl = safeYaleLuxObjectUrl('https://lux.collections.yale.edu/data/object/' + luxUuid);
    if (!luxUrl) return null;
    return {
      asset: item, luxUuid: luxUuid, objectId: objectId, luxUrl: luxUrl,
      sourceUrl: sourceUrl, manifestUrl: manifestUrl, iiifServiceUrl: iiifServiceUrl,
      cacheKey: luxUuid + '|' + objectId + '|' + manifestUrl + '|' + iiifServiceUrl
    };
  }

  function cloneYaleVerifiedItem(item) {
    return Object.assign({}, item, {
      tags: Array.isArray(item && item.tags) ? item.tags.slice() : [],
      accent: Array.isArray(item && item.accent) ? item.accent.slice() : ['#e8e2d4', '#3d5e71']
    });
  }

  function pruneYaleVerifiedRecordCache(nowValue) {
    var now = Number(nowValue || Date.now());
    Object.keys(YALE_VERIFIED_RECORD_CACHE).forEach(function (key) {
      var entry = YALE_VERIFIED_RECORD_CACHE[key];
      if (!entry || !isFinite(entry.savedAt) || entry.savedAt > now + 300000 || now - entry.savedAt > YALE_REVALIDATION_CACHE_MS) {
        delete YALE_VERIFIED_RECORD_CACHE[key];
      }
    });
    var keys = Object.keys(YALE_VERIFIED_RECORD_CACHE);
    if (keys.length <= YALE_REVALIDATION_CACHE_LIMIT) return;
    keys.sort(function (a, b) {
      return Number(YALE_VERIFIED_RECORD_CACHE[a].savedAt || 0) - Number(YALE_VERIFIED_RECORD_CACHE[b].savedAt || 0);
    }).slice(0, keys.length - YALE_REVALIDATION_CACHE_LIMIT).forEach(function (key) {
      delete YALE_VERIFIED_RECORD_CACHE[key];
    });
  }

  function fetchYaleAssetByIdentity(identity, options) {
    var opts = options || {};
    var fetchFn = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Yale Gallery record verification is unavailable in this browser.'));
    if (!identity || !identity.luxUrl) return Promise.reject(new Error('A Yale Gallery asset is missing a trustworthy LUX identity.'));
    return fetchYaleJson(identity.luxUrl, fetchFn, opts.signal).then(function (record) {
      var links = yaleRecordLinks(record);
      if (!links
        || links.luxUrl !== identity.luxUrl
        || links.luxUuid !== identity.luxUuid
        || links.objectId !== identity.objectId
        || links.sourceUrl !== identity.sourceUrl
        || links.manifestUrl !== identity.manifestUrl) {
        throw new Error('A Yale Gallery LUX record no longer matches the saved object identity.');
      }
      return fetchYaleJson(links.manifestUrl, fetchFn, opts.signal).then(function (manifest) {
        var fresh = yaleItemFromManifest(record, manifest, '', 'All');
        if (!fresh) throw new Error('A Yale Gallery record no longer has verified public-domain canvas rights or usable media.');
        if (!sourceVerifiedAssetIdentityMatches(identity.asset, fresh)) {
          throw new Error('A Yale Gallery record changed identity during verification.');
        }
        return cloneYaleVerifiedItem(fresh);
      });
    });
  }

  function fetchYaleAssetsByIdentities(assets, options) {
    var opts = options || {};
    var candidates = Array.isArray(assets) ? assets : [];
    if (!candidates.length) return Promise.resolve([]);
    var identities = candidates.map(yaleIdentityFromAsset);
    if (identities.some(function (identity) { return !identity; })) {
      return Promise.reject(new Error('A Yale Gallery asset is missing a trustworthy LUX, object, source, or manifest identity.'));
    }
    var uniqueByKey = Object.create(null);
    identities.forEach(function (identity) {
      if (!uniqueByKey[identity.cacheKey]) uniqueByKey[identity.cacheKey] = identity;
    });
    var now = Date.now();
    pruneYaleVerifiedRecordCache(now);
    var verifiedByKey = Object.create(null);
    var missing = [];
    Object.keys(uniqueByKey).forEach(function (key) {
      var identity = uniqueByKey[key];
      var cached = !opts.bypassCache && YALE_VERIFIED_RECORD_CACHE[key];
      if (cached && now - cached.savedAt <= YALE_REVALIDATION_CACHE_MS
        && sourceVerifiedAssetIdentityMatches(identity.asset, cached.item)) {
        verifiedByKey[key] = cloneYaleVerifiedItem(cached.item);
      } else {
        if (cached) delete YALE_VERIFIED_RECORD_CACHE[key];
        missing.push(identity);
      }
    });
    var firstError = null;
    return mapWithConcurrency(missing, YALE_REVALIDATION_CONCURRENCY, function (identity) {
      return fetchYaleAssetByIdentity(identity, opts).then(function (fresh) {
        verifiedByKey[identity.cacheKey] = cloneYaleVerifiedItem(fresh);
        YALE_VERIFIED_RECORD_CACHE[identity.cacheKey] = {
          savedAt: Date.now(), item: cloneYaleVerifiedItem(fresh)
        };
        pruneYaleVerifiedRecordCache(Date.now());
        return true;
      }).catch(function (error) {
        if (!firstError) firstError = error;
        throw error;
      });
    }).then(function (outcomes) {
      if (firstError || outcomes.some(function (outcome) { return outcome !== true; })) {
        throw firstError || new Error('Yale Gallery record verification did not complete.');
      }
      return identities.map(function (identity) {
        var fresh = verifiedByKey[identity.cacheKey];
        if (!fresh || !sourceVerifiedAssetIdentityMatches(identity.asset, fresh)) {
          throw new Error('A Yale Gallery record could not be verified against its saved identity.');
        }
        return cloneYaleVerifiedItem(fresh);
      });
    });
  }

  function searchYaleLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Yale University Art Gallery live search is unavailable in this browser.'));
    var requestedLimit = Number(opts.limit);
    var maximum = isFinite(requestedLimit) && requestedLimit > 0 ? Math.max(1, Math.min(12, Math.floor(requestedLimit))) : 8;
    var page = normalizedSearchPage(opts.page);
    var kindHints = {
      Maps: ' map cartography', Textures: ' surface textile material', Patterns: ' textile ornament pattern',
      Blueprints: ' architecture plan technical drawing', Science: ' scientific anatomical study',
      Botanical: ' botanical natural history', Archival: ' historic works on paper ephemera',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var scopedQuery = {
      AND: [
        { hasDigitalImage: 1 },
        { text: q + (kindHints[opts.kind] || '') },
        { OR: [
          { memberOf: { curatedBy: { id: YALE_GALLERY_ID } } },
          { memberOf: { curatedBy: { memberOf: { id: YALE_GALLERY_ID } } } }
        ] }
      ]
    };
    var searchUrl = YALE_LUX_API + '/search/item?q=' + encodeURIComponent(JSON.stringify(scopedQuery))
      + '&page=' + (page + 1) + '&pageLength=' + maximum;
    return fetchYaleJson(searchUrl, fetchFn, opts.signal).then(function (payload) {
      if (!payload || !Array.isArray(payload.orderedItems)) throw new Error('Yale LUX returned an invalid search response.');
      var seen = {};
      var objectUrls = payload.orderedItems.map(function (entry) {
        return safeYaleLuxObjectUrl(typeof entry === 'string' ? entry : entry && (entry.id || entry['@id']));
      }).filter(function (url) {
        if (!url || seen[url]) return false;
        seen[url] = true;
        return true;
      }).slice(0, maximum);
      return mapWithConcurrency(objectUrls, 3, function (objectUrl) {
        return fetchYaleJson(objectUrl, fetchFn, opts.signal).then(function (record) {
          var links = yaleRecordLinks(record);
          if (!links || links.luxUrl !== objectUrl) return null;
          return fetchYaleJson(links.manifestUrl, fetchFn, opts.signal).then(function (manifest) {
            return yaleItemFromManifest(record, manifest, q, opts.kind);
          });
        });
      });
    }).then(function (items) {
      return (Array.isArray(items) ? items : []).filter(Boolean);
    });
  }
