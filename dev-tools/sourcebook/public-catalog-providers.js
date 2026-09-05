  function metItemFromObject(object, query, requestedKind) {
    if (!object || object.isPublicDomain !== true) return null;
    var imageUrl = safeHttpsUrl(object.primaryImageSmall || object.primaryImage);
    var downloadUrl = safeHttpsUrl(object.primaryImage);
    var sourceUrl = safeHttpsUrl(object.objectURL);
    if (!imageUrl || !downloadUrl || !sourceUrl || !object.objectID) return null;
    var title = plainMetadata(object.title) || 'Open Access artwork';
    var creator = plainMetadata(object.artistDisplayName || object.culture || object.department) || 'Creator listed on The Met object record';
    var year = plainMetadata(object.objectDate || object.objectBeginDate) || 'See object record';
    var details = [object.objectName, object.medium, object.culture, object.period].map(plainMetadata).filter(Boolean);
    var description = details.join(' · ') || 'Public-domain Open Access image from The Metropolitan Museum of Art.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var tagTerms = Array.isArray(object.tags) ? object.tags.map(function (tag) { return tag && tag.term; }).filter(Boolean) : [];
    var classification = [title, object.objectName, object.classification, object.medium].concat(tagTerms).join(' ');
    return {
      id: 'met-live-' + String(object.objectID),
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium([object.objectName, object.medium, object.classification]),
      provider: 'The Met Open Access',
      year: year,
      creator: creator,
      description: description,
      license: 'Public Domain / CC0 Open Access',
      licenseUrl: MET_OPEN_ACCESS_TERMS,
      rightsType: 'pd',
      rightsShort: 'Public domain',
      rightsNote: 'The Met Collection API reports isPublicDomain=true and supplies this image through its CC0 Open Access program. Verify the linked object record.',
      tags: normalizeWords(classification),
      accent: ['#eadfcd', '#735f47'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      live: true,
      rightsMetadataSource: 'The Met Collection API isPublicDomain=true'
    };
  }

  function searchMetLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('The Met live search is unavailable in this browser.'));
    var kindHints = {
      Maps: ' map', Textures: ' material texture', Patterns: ' textile pattern ornament',
      Blueprints: ' architectural drawing', Science: ' scientific study',
      Botanical: ' botanical flower', Archival: ' print ephemera',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var maximum = Math.max(4, Math.min(12, Number(opts.limit || 8)));
    var page = normalizedSearchPage(opts.page);
    var offset = page * maximum;
    var requestContext = providerRequestContext(opts.signal, 12000);
    var requestOptions = requestContext.options;
    var searchUrl = MET_API + '/search?hasImages=true&q=' + encodeURIComponent(searchText);
    return fetchFn(searchUrl, requestOptions).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('The Met Open Access', response);
      return response.json();
    }).then(function (payload) {
      var ids = payload && Array.isArray(payload.objectIDs) ? payload.objectIDs.slice(offset, offset + maximum) : [];
      return mapWithConcurrency(ids, 3, function (id) {
        return fetchFn(MET_API + '/objects/' + encodeURIComponent(id), requestOptions)
          .then(function (response) { return response && response.ok ? response.json() : null; })
          .catch(function () { return null; });
      });
    }).then(function (objects) {
      requestContext.finish();
      return objects.map(function (object) { return metItemFromObject(object, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function aicItemFromArtwork(artwork, config, query, requestedKind) {
    if (!artwork || artwork.is_public_domain !== true || !artwork.id || !artwork.image_id) return null;
    var iiifBase = safeHttpsUrl(config && config.iiif_url).replace(/\/$/, '');
    if (!iiifBase) return null;
    var imageId = String(artwork.image_id || '').trim();
    if (!/^[a-z0-9-]+$/i.test(imageId)) return null;
    var title = plainMetadata(artwork.title) || 'Open Access artwork';
    var creator = plainMetadata(artwork.artist_display) || 'Creator listed on the Art Institute object record';
    var year = plainMetadata(artwork.date_display) || 'See object record';
    var details = [artwork.medium_display, artwork.classification_title].map(plainMetadata).filter(Boolean);
    var description = details.join(' · ') || 'Public-domain Open Access image from the Art Institute of Chicago.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [title, artwork.medium_display, artwork.classification_title].join(' ');
    return {
      id: 'aic-live-' + String(artwork.id),
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium([artwork.medium_display, artwork.classification_title]),
      provider: 'Art Institute of Chicago',
      year: year,
      creator: creator,
      description: description,
      license: 'CC0 Public Domain Designation',
      licenseUrl: AIC_OPEN_ACCESS_TERMS,
      rightsType: 'pd',
      rightsShort: 'Public domain',
      rightsNote: 'The Art Institute API reports is_public_domain=true for this artwork and supplies its image through the museum’s CC0 Open Access program. Verify the linked object record.',
      tags: normalizeWords(classification),
      accent: ['#e8ddd1', '#694b3c'],
      sourceUrl: 'https://www.artic.edu/artworks/' + encodeURIComponent(artwork.id),
      imageUrl: iiifBase + '/' + imageId + '/full/843,/0/default.jpg',
      downloadUrl: iiifBase + '/' + imageId + '/full/1686,/0/default.jpg',
      live: true,
      rightsMetadataSource: 'Art Institute of Chicago API is_public_domain=true'
    };
  }

  function searchAicLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Art Institute live search is unavailable in this browser.'));
    var kindHints = {
      Maps: ' map', Textures: ' material texture', Patterns: ' textile pattern ornament',
      Blueprints: ' architectural drawing', Science: ' scientific study',
      Botanical: ' botanical print', Archival: ' print ephemera',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var maximum = Math.max(4, Math.min(12, Number(opts.limit || 10)));
    var page = normalizedSearchPage(opts.page) + 1;
    var fields = 'id,title,artist_display,date_display,medium_display,classification_title,image_id,is_public_domain';
    var searchUrl = AIC_API + '/artworks/search?q=' + encodeURIComponent(searchText)
      + '&limit=' + maximum + '&page=' + page + '&fields=' + encodeURIComponent(fields)
      + '&query%5Bterm%5D%5Bis_public_domain%5D=true';
    var requestContext = providerRequestContext(opts.signal, 12000);
    return fetchFn(searchUrl, requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('Art Institute of Chicago', response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      var artworks = payload && Array.isArray(payload.data) ? payload.data : [];
      return artworks.map(function (artwork) { return aicItemFromArtwork(artwork, payload.config || {}, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function cmaItemFromArtwork(artwork, query, requestedKind) {
    if (!artwork || String(artwork.share_license_status || '').toUpperCase() !== 'CC0' || !artwork.id) return null;
    var images = artwork.images || {};
    var imageUrl = safeHttpsUrl(images.web && images.web.url);
    var downloadUrl = safeHttpsUrl(images.print && images.print.url) || imageUrl;
    var sourceUrl = safeHttpsUrl(artwork.url);
    if (!/^https:\/\/openaccess-cdn\.clevelandart\.org\//i.test(imageUrl)) return null;
    if (!/^https:\/\/openaccess-cdn\.clevelandart\.org\//i.test(downloadUrl)) return null;
    if (!/^https:\/\/(?:www\.)?clevelandart\.org\/art\//i.test(sourceUrl)) return null;
    var title = plainMetadata(artwork.title) || 'Cleveland Museum Open Access artwork';
    var creators = Array.isArray(artwork.creators) ? artwork.creators.map(function (creator) {
      return plainMetadata(creator && (creator.description || creator.name));
    }).filter(Boolean) : [];
    var cultures = Array.isArray(artwork.culture) ? artwork.culture.map(plainMetadata).filter(Boolean) : [];
    var creator = creators.join('; ') || cultures.join('; ') || 'Creator listed on the Cleveland Museum object record';
    var year = plainMetadata(artwork.creation_date || artwork.date_text) || 'See object record';
    var details = [artwork.technique, artwork.type, artwork.department].map(plainMetadata).filter(Boolean);
    var description = plainMetadata(artwork.description) || details.join(' · ') || 'CC0 Open Access image from the Cleveland Museum of Art.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [title, artwork.tombstone, artwork.technique, artwork.type, artwork.department, artwork.collection].join(' ');
    return {
      id: 'cma-live-' + String(artwork.id),
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium([artwork.type, artwork.technique]),
      provider: 'Cleveland Museum of Art',
      year: year,
      creator: creator,
      description: description,
      license: 'CC0 Open Access (public-domain artwork)',
      licenseUrl: CMA_OPEN_ACCESS_TERMS,
      rightsType: 'pd',
      rightsShort: 'Public domain',
      rightsNote: 'The Cleveland Museum API reports share_license_status=CC0 and supplies an Open Access image for this public-domain artwork. Verify the linked object record.',
      tags: normalizeWords(classification),
      accent: ['#d8e5e8', '#426471'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      pixelWidth: normalizedPixelDimension((images.print && images.print.width) || (images.web && images.web.width)),
      pixelHeight: normalizedPixelDimension((images.print && images.print.height) || (images.web && images.web.height)),
      live: true,
      rightsMetadataSource: 'Cleveland Museum of Art API share_license_status=CC0'
    };
  }

  function searchCmaLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Cleveland Museum live search is unavailable in this browser.'));
    var kindHints = {
      Maps: ' map cartography', Textures: ' material texture', Patterns: ' textile pattern ornament',
      Blueprints: ' architectural drawing plan', Science: ' scientific study diagram',
      Botanical: ' botanical flower print', Archival: ' print ephemera document',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var maximum = Math.max(4, Math.min(30, Number(opts.limit || 18)));
    var page = normalizedSearchPage(opts.page);
    var fields = 'id,share_license_status,title,creation_date,date_text,creators,culture,technique,type,department,collection,tombstone,description,url,images';
    var searchUrl = CMA_API + '/artworks/?q=' + encodeURIComponent(searchText)
      + '&cc0&has_image=1&limit=' + maximum + '&skip=' + (page * maximum) + '&fields=' + encodeURIComponent(fields);
    var requestContext = providerRequestContext(opts.signal, 12000);
    return fetchFn(searchUrl, requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('Cleveland Museum of Art', response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      var artworks = payload && Array.isArray(payload.data) ? payload.data : [];
      return artworks.map(function (artwork) { return cmaItemFromArtwork(artwork, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function locPayloadValue(payload, key) {
    if (!payload || typeof payload !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(payload, key)) return payload[key];
    if (key.indexOf('item.') === 0 && payload.item && typeof payload.item === 'object') {
      return payload.item[key.slice(5)];
    }
    if (key === 'resources.0' && Array.isArray(payload.resources)) return payload.resources[0] || null;
    return null;
  }

  function locMetadataText(value) {
    if (Array.isArray(value)) return value.map(locMetadataText).filter(Boolean).join(' ');
    if (value && typeof value === 'object') {
      return Object.keys(value).map(function (key) {
        var nested = value[key];
        return typeof nested === 'string' && /^https?:\/\//i.test(nested) ? key : locMetadataText(nested);
      }).filter(Boolean).join(' ');
    }
    return plainMetadata(value);
  }

  // LOC applies rights statements at the item or collection level and warns
  // that the Library does not own copyright in everything it holds. Sourcebook
  // therefore accepts only the strongest explicit reuse statement and rejects
  // common qualified formulations, including "no known restrictions."
  function normalizeLocRights(payload) {
    var rights = locMetadataText(locPayloadValue(payload, 'item.rights'));
    var rightsInformation = locMetadataText(locPayloadValue(payload, 'item.rights_information'));
    var combined = (rights + ' ' + rightsInformation).replace(/\s+/g, ' ').trim();
    var normalized = combined.toLowerCase();
    var uncertain = /\bno known restrictions?\b|\bbelieved to be\b|\bmay be (?:in )?the public domain\b|\bmight be\b|\bnot all\b|\bsome (?:items|materials|content|works)\b|\bmany (?:items|materials|collections|works)\b|\bfair use\b|\bpermission (?:is|may be|must be|should be|required|from)\b|\bprotected by copyright\b|\bunder copyright\b|\bcopyright(?:ed)? (?:material|content|items|works)\b|\brights? (?:status )?(?:unknown|undetermined)\b/i.test(normalized);
    var explicitPublicDomain = /\b(?:are|is) in the public domain\b/i.test(normalized);
    var explicitReuse = /\bfree to use and reuse\b/i.test(normalized);
    if (!combined || uncertain || !explicitPublicDomain || !explicitReuse) return null;
    return {
      rightsType: 'pd', rightsShort: 'Public domain',
      license: 'Public Domain - free to use and reuse',
      statement: combined
    };
  }

  function locTrustedHttpsUrl(value) {
    var url = String(value || '').trim().replace(/^http:\/\/(www\.loc\.gov|tile\.loc\.gov)(?=\/)/i, 'https://$1');
    return safeHttpsUrl(url);
  }

  function locItemPageUrl(value) {
    var url = locTrustedHttpsUrl(value);
    var match = url.match(/^https:\/\/www\.loc\.gov\/item\/([a-z0-9._-]+)\/?(?:[?#].*)?$/i);
    return match ? 'https://www.loc.gov/item/' + match[1] + '/' : '';
  }

  function flattenLocFiles(value, output) {
    var files = output || [];
    if (Array.isArray(value)) {
      value.forEach(function (entry) { flattenLocFiles(entry, files); });
    } else if (value && typeof value === 'object') {
      if (value.url) files.push(value);
      else Object.keys(value).forEach(function (key) { flattenLocFiles(value[key], files); });
    }
    return files;
  }

  function locContributorNames(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.reduce(function (names, entry) { return names.concat(locContributorNames(entry)); }, []);
    if (typeof value === 'object') return Object.keys(value).map(plainMetadata).filter(Boolean);
    var name = plainMetadata(value);
    return name ? [name] : [];
  }

  function locItemFromDetail(payload, searchRecord, query, requestedKind) {
    var record = searchRecord || {};
    var sourceUrl = locItemPageUrl(record.url || record.id || locPayloadValue(payload, 'item.id') || locPayloadValue(payload, 'item.url'));
    var rights = normalizeLocRights(payload);
    var resource = locPayloadValue(payload, 'resources.0');
    if (!sourceUrl || !rights || !resource || resource.download_restricted === true) return null;
    var jpegFiles = flattenLocFiles(resource.files).map(function (file) {
      var url = locTrustedHttpsUrl(file && file.url);
      var width = Math.max(0, Number(file && file.width) || 0);
      var height = Math.max(0, Number(file && file.height) || 0);
      var mime = String(file && (file.mimetype || file.mime_type || file.mimeType) || '').toLowerCase();
      if (!/^https:\/\/tile\.loc\.gov\//i.test(url) || !/^image\/jpe?g(?:$|;)/i.test(mime)) return null;
      return { url: url, width: width, height: height, area: width * height };
    }).filter(Boolean).sort(function (left, right) { return right.area - left.area; });
    if (!jpegFiles.length) return null;
    var download = jpegFiles[0];
    var preview = jpegFiles.filter(function (file) { return file.width > 0 && file.width <= 1800; })[0] || download;
    var title = locMetadataText(locPayloadValue(payload, 'item.title')) || plainMetadata(record.title) || 'Library of Congress visual material';
    var contributors = locContributorNames(locPayloadValue(payload, 'item.contributors'));
    var creator = contributors.join('; ') || 'Creator listed on the Library of Congress item record';
    var year = locMetadataText(locPayloadValue(payload, 'item.date')) || plainMetadata(record.date) || 'See item record';
    var medium = locMetadataText(locPayloadValue(payload, 'item.medium'));
    var notes = locMetadataText(locPayloadValue(payload, 'item.notes'));
    var subjects = locMetadataText(locPayloadValue(payload, 'item.subject'));
    var description = notes || medium || 'Public-domain visual material from the Library of Congress.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (year.length > 80) year = year.slice(0, 77) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var itemId = sourceUrl.match(/\/item\/([a-z0-9._-]+)\//i)[1];
    var classification = [title, medium, notes, subjects].join(' ');
    return {
      id: 'loc-live-' + itemId,
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium(medium),
      provider: 'Library of Congress',
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: sourceUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: 'The linked Library of Congress item record explicitly states that this material is in the public domain and free to use and reuse. Sourcebook excludes qualified or ambiguous rights statements; verify the linked item record.',
      tags: normalizeWords(classification),
      accent: ['#e5dfce', '#655b45'],
      sourceUrl: sourceUrl,
      imageUrl: preview.url,
      downloadUrl: download.url,
      pixelWidth: download.width,
      pixelHeight: download.height,
      live: true,
      rightsMetadataSource: 'Library of Congress item API: explicit Public Domain and free-to-use-and-reuse statement'
    };
  }

  function searchLocLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Library of Congress live search is unavailable in this browser.'));
    var kindHints = {
      Maps: ' cartography map', Textures: ' texture material', Patterns: ' ornament textile pattern',
      Blueprints: ' architectural drawing plan', Science: ' scientific diagram',
      Botanical: ' botanical illustration', Archival: ' archival ephemera document',
      Figures: ' figure portrait study', Landscapes: ' landscape scenery'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    // LOC item records are substantially heavier than the other providers.
    // Inspect a small, concurrent candidate set deeply instead of firing a
    // classroom-network-unfriendly burst of item requests.
    var maximum = Math.max(3, Math.min(6, Number(opts.limit || 6)));
    var candidateLimit = Math.max(12, Math.min(24, maximum * 3));
    var page = normalizedSearchPage(opts.page) + 1;
    var endpoint = opts.kind === 'Maps' ? '/maps/' : '/photos/';
    var searchUrl = LOC_API + endpoint + '?q=' + encodeURIComponent(searchText)
      + '&fa=online-format%3Aimage&fo=json&at=results&c=' + candidateLimit + '&sp=' + page;
    var requestContext = providerRequestContext(opts.signal, 65000);
    var requestOptions = requestContext.options;
    return fetchFn(searchUrl, requestOptions).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('Library of Congress', response);
      return response.json();
    }).then(function (payload) {
      var records = payload && Array.isArray(payload.results) ? payload.results : [];
      var candidates = records.filter(function (record) {
        return !!locItemPageUrl(record && (record.url || record.id));
      }).slice(0, maximum);
      var fields = 'item.rights_information,item.rights,item.title,item.contributors,item.date,item.subject,item.medium,item.notes,resources.0';
      return mapWithConcurrency(candidates, 3, function (record) {
        var itemUrl = locItemPageUrl(record.url || record.id);
        var detailUrl = itemUrl + '?fo=json&at=' + encodeURIComponent(fields);
        return fetchFn(detailUrl, requestOptions).then(function (response) {
          return response && response.ok ? response.json() : null;
        }).then(function (detail) {
          return detail ? locItemFromDetail(detail, record, q, opts.kind) : null;
        }).catch(function () { return null; });
      });
    }).then(function (items) {
      requestContext.finish();
      if (opts.signal && opts.signal.aborted) {
        var stopped = new Error('Library of Congress search cancelled.');
        stopped.name = 'AbortError';
        throw stopped;
      }
      return items.filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function normalizeWellcomeRights(location) {
    if (!location || typeof location !== 'object') return null;
    var accessConditions = Array.isArray(location.accessConditions) ? location.accessConditions : [];
    var openlyAccessible = accessConditions.some(function (condition) {
      return condition && condition.status && String(condition.status.id || '').toLowerCase() === 'open';
    });
    if (!openlyAccessible) return null;
    var license = location.license || {};
    var id = String(license.id || '').toLowerCase().trim();
    var label = plainMetadata(license.label);
    var licenseUrl = safeHttpsUrl(license.url);
    if (id === 'pdm' && label.toLowerCase() === 'public domain mark' &&
        (/^https:\/\/creativecommons\.org\/share-your-work\/public-domain\/pdm\/?$/i.test(licenseUrl) ||
         /^https:\/\/creativecommons\.org\/publicdomain\/mark\/1\.0\/?$/i.test(licenseUrl))) {
      return { rightsType: 'pd', rightsShort: 'Public domain', license: 'Public Domain Mark', licenseUrl: licenseUrl, apiId: 'pdm' };
    }
    if (id === 'cc-0' && label.toLowerCase() === 'cc0 1.0 universal' &&
        /^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/(?:legalcode\/?)?$/i.test(licenseUrl)) {
      return { rightsType: 'cc0', rightsShort: 'CC0', license: 'CC0 1.0 Universal', licenseUrl: licenseUrl, apiId: 'cc-0' };
    }
    return null;
  }

  function wellcomeLabels(values) {
    return (Array.isArray(values) ? values : []).map(function (entry) {
      return plainMetadata(entry && (entry.label || (entry.agent && entry.agent.label)));
    }).filter(Boolean);
  }

  function wellcomeImageFromRecord(record, query, requestedKind) {
    if (!record || !/^[a-z0-9]+$/i.test(String(record.id || ''))) return null;
    var source = record.source || {};
    if (!/^[a-z0-9]+$/i.test(String(source.id || ''))) return null;
    var locations = Array.isArray(record.locations) ? record.locations : [];
    var admitted = null;
    var rights = null;
    for (var i = 0; i < locations.length; i += 1) {
      var candidateRights = normalizeWellcomeRights(locations[i]);
      var candidateUrl = safeHttpsUrl(locations[i] && locations[i].url);
      if (candidateRights && /^https:\/\/iiif\.wellcomecollection\.org\/image\/[a-z0-9._-]+\/info\.json$/i.test(candidateUrl)) {
        admitted = locations[i];
        rights = candidateRights;
        break;
      }
    }
    if (!admitted || !rights) return null;
    var infoUrl = safeHttpsUrl(admitted.url);
    var iiifBase = infoUrl.replace(/info\.json$/i, '');
    var imageUrl = iiifBase + 'full/!1200,1200/0/default.jpg';
    var downloadUrl = iiifBase + 'full/!2400,2400/0/default.jpg';
    var sourceUrl = 'https://wellcomecollection.org/works/' + encodeURIComponent(source.id) + '/images?id=' + encodeURIComponent(record.id);
    var title = plainMetadata(source.title) || 'Wellcome Collection image';
    var contributors = wellcomeLabels(source.contributors);
    var creator = contributors.join('; ') || plainMetadata(admitted.credit) || 'Creator listed on the Wellcome Collection work record';
    var subjects = wellcomeLabels(source.subjects);
    var genres = wellcomeLabels(source.genres);
    var production = Array.isArray(source.production) ? source.production : [];
    var dates = production.reduce(function (labels, entry) {
      return labels.concat(wellcomeLabels(entry && entry.dates));
    }, []);
    var year = dates[0] || 'See work record';
    var description = subjects.concat(genres).slice(0, 6).join(' · ') || 'Open scientific or archival image from Wellcome Collection.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [title].concat(subjects, genres).join(' ');
    var averageColor = /^#[0-9a-f]{6}$/i.test(String(record.averageColor || '')) ? String(record.averageColor) : '#dce3df';
    return {
      id: 'wellcome-live-' + String(record.id).toLowerCase(),
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium(genres),
      provider: 'Wellcome Collection',
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: 'The Wellcome Catalogue API assigns ' + rights.license + ' to this exact image and reports its IIIF location as open. Verify the linked image record.',
      tags: normalizeWords(classification),
      accent: [averageColor, '#38534d'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
      live: true,
      rightsMetadataSource: 'Wellcome Catalogue API image location license=' + rights.apiId + ' and access status=open'
    };
  }

  function searchWellcomeLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Wellcome Collection live search is unavailable in this browser.'));
    // Wellcome's relevance query is already tuned for its visual catalogue and
    // can become too narrow when generic kind words are appended. Preserve the
    // user's or AI planner's concrete wording and classify the returned images
    // locally instead.
    var searchText = q;
    var maximum = Math.max(6, Math.min(36, Number(opts.limit || 24)));
    var page = normalizedSearchPage(opts.page) + 1;
    var includes = 'source.contributors,source.subjects,source.genres';
    var searchUrl = WELLCOME_API + '/images?query=' + encodeURIComponent(searchText)
      + '&locations.license=pdm%2Ccc-0&include=' + encodeURIComponent(includes)
      + '&pageSize=' + maximum + '&page=' + page;
    var requestContext = providerRequestContext(opts.signal, 12000);
    return fetchFn(searchUrl, requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('Wellcome Collection', response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      var images = payload && Array.isArray(payload.results) ? payload.results : [];
      return images.map(function (record) { return wellcomeImageFromRecord(record, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function normalizeGettyMediaRights(media) {
    if (!media || typeof media !== 'object') return null;
    var rights = Array.isArray(media.subject_to) ? media.subject_to : [];
    var classifications = rights.reduce(function (all, right) {
      return all.concat(Array.isArray(right && right.classified_as) ? right.classified_as : []);
    }, []);
    var exactCc0 = classifications.some(function (entry) {
      var id = String(entry && entry.id || '').replace(/^http:/i, 'https:');
      var label = plainMetadata(entry && entry._label).toLowerCase();
      return id === 'https://creativecommons.org/publicdomain/zero/1.0/' && label === 'creative commons public domain dedication';
    });
    var downloadCleared = classifications.some(function (entry) {
      return String(entry && entry.id || '') === 'https://data.getty.edu/local/thesaurus/clearance/download';
    });
    if (!exactCc0 || !downloadCleared) return null;
    return {
      rightsType: 'cc0', rightsShort: 'CC0', license: 'CC0 1.0 Getty Open Content',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
    };
  }

  function gettySearchTerms(query) {
    var ignored = {
      the: true, and: true, for: true, with: true, from: true, into: true, use: true,
      using: true, visual: true, visuals: true, asset: true, assets: true, material: true,
      materials: true, education: true, educational: true, artwork: true, historic: true,
      strong: true, quiet: true, faded: true, different: true
    };
    var expansions = {
      blueprint: ['architectural', 'architecture', 'plan', 'drawing'], blueprints: ['architectural', 'plan', 'drawing'],
      technical: ['drawing', 'design', 'study'], texture: ['texture', 'pattern', 'surface'], textures: ['texture', 'pattern'],
      map: ['map', 'atlas'], maps: ['map', 'atlas'], botanical: ['botanical', 'plant'],
      archival: ['archive', 'photograph', 'print'], ephemera: ['poster', 'print'],
      contour: ['drawing', 'study'], wood: ['wood'], grain: ['wood', 'pattern']
    };
    var seen = {};
    var terms = [];
    normalizeWords(query).forEach(function (word) {
      if (word.length < 3 || ignored[word]) return;
      [word].concat(expansions[word] || []).forEach(function (term) {
        if (!seen[term] && terms.length < 7) {
          seen[term] = true;
          terms.push(term);
        }
      });
    });
    return terms.length ? terms : ['drawing', 'design'];
  }

  function gettyLabels(values) {
    return (Array.isArray(values) ? values : []).map(function (entry) {
      return plainMetadata(entry && (entry._label || entry.label));
    }).filter(Boolean);
  }

  function gettyImageFromRecords(objectRecord, mediaRecord, query, requestedKind) {
    var objectUrl = safeHttpsUrl(objectRecord && objectRecord.id);
    var mediaUrl = safeHttpsUrl(mediaRecord && mediaRecord.id);
    if (!/^https:\/\/data\.getty\.edu\/museum\/collection\/object\/[a-f0-9-]{36}$/i.test(objectUrl)) return null;
    if (!/^https:\/\/data\.getty\.edu\/media\/image\/[a-f0-9-]{36}$/i.test(mediaUrl)) return null;
    var rights = normalizeGettyMediaRights(mediaRecord);
    if (!rights) return null;
    var digitalObjects = Array.isArray(mediaRecord.digitally_shown_by) ? mediaRecord.digitally_shown_by : [];
    var iiifService = '';
    digitalObjects.some(function (digital) {
      var accessPoints = Array.isArray(digital && digital.access_point) ? digital.access_point : [];
      return accessPoints.some(function (point) {
        var url = safeHttpsUrl(point && point.id);
        if (/^https:\/\/media\.getty\.edu\/iiif\/image\/[a-f0-9-]{36}$/i.test(url) &&
            String(point && point.conforms_to || '') === 'http://iiif.io/api/image') {
          iiifService = url;
          return true;
        }
        return false;
      });
    });
    if (!iiifService) return null;
    var mediaId = mediaUrl.slice(mediaUrl.lastIndexOf('/') + 1).toLowerCase();
    var title = plainMetadata(objectRecord._label) || 'Getty Museum Open Content image';
    var production = objectRecord.produced_by || {};
    var creators = gettyLabels(production.carried_out_by);
    var creator = creators.join('; ') || 'Creator listed on the Getty Museum object record';
    var timespan = production.timespan || {};
    var dateLabels = (Array.isArray(timespan.identified_by) ? timespan.identified_by : []).map(function (entry) {
      return plainMetadata(entry && entry.content);
    }).filter(Boolean);
    var year = dateLabels[0] || plainMetadata(timespan.begin_of_the_begin).slice(0, 4) || 'See object record';
    var categories = gettyLabels(objectRecord.classified_as).filter(function (label) {
      return !/^(artwork|object record structure)/i.test(label);
    });
    var description = categories.slice(0, 5).join(' · ') || 'CC0 Open Content image from the J. Paul Getty Museum.';
    if (creator.length > 160) creator = creator.slice(0, 157) + '...';
    if (description.length > 280) description = description.slice(0, 277) + '...';
    var classification = [title].concat(categories).join(' ');
    return {
      id: 'getty-live-' + mediaId,
      title: title,
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      medium: normalizedMedium(categories),
      provider: 'Getty Museum Open Content',
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: 'Getty’s media API assigns the exact CC0 Public Domain Dedication and download clearance to this image. Verify the linked object and media records.',
      tags: normalizeWords(classification),
      accent: ['#e4dfd3', '#574e43'],
      sourceUrl: objectUrl,
      imageUrl: iiifService + '/full/!1200,1200/0/default.jpg',
      downloadUrl: iiifService + '/full/!2400,2400/0/default.jpg',
      live: true,
      rightsMetadataSource: 'Getty media API ' + mediaUrl + ' exact CC0 classification + download clearance'
    };
  }

  function searchGettyLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Getty Museum live search is unavailable in this browser.'));
    var maximum = Math.max(3, Math.min(8, Number(opts.limit || 6)));
    var candidateLimit = Math.max(8, Math.min(16, maximum * 2));
    var page = normalizedSearchPage(opts.page);
    var terms = gettySearchTerms(q);
    var filters = terms.map(function (term) {
      return 'CONTAINS(LCASE(STR(?label)), "' + term + '")';
    }).join(' || ');
    var score = terms.map(function (term, index) {
      return 'IF(CONTAINS(LCASE(STR(?label)), "' + term + '"), ' + (terms.length - index) + ', 0)';
    }).join(' + ');
    var sparql = [
      'PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>',
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'SELECT DISTINCT ?object ?label WHERE {',
      '  ?object a crm:E22_Human-Made_Object ; rdfs:label ?label ; crm:P65_shows_visual_item ?visual .',
      '  FILTER(STRSTARTS(STR(?object), "https://data.getty.edu/museum/collection/object/"))',
      '  FILTER(' + filters + ')',
      '  BIND((' + score + ') AS ?score)',
      '}',
      'ORDER BY DESC(?score) ?label',
      'LIMIT ' + candidateLimit,
      'OFFSET ' + (page * candidateLimit)
    ].join('\n');
    var searchUrl = GETTY_COLLECTION_API + '/sparql?query=' + encodeURIComponent(sparql);
    var requestContext = providerRequestContext(opts.signal, 25000);
    var baseOptions = requestContext.options;
    var sparqlOptions = Object.assign({}, baseOptions, { headers: { Accept: 'application/sparql-results+json' } });
    var jsonOptions = Object.assign({}, baseOptions, { headers: { Accept: 'application/ld+json' } });
    return fetchFn(searchUrl, sparqlOptions).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('Getty Museum Open Content', response);
      return response.json();
    }).then(function (payload) {
      var bindings = payload && payload.results && Array.isArray(payload.results.bindings) ? payload.results.bindings : [];
      var seen = {};
      var objectUrls = bindings.map(function (binding) {
        return safeHttpsUrl(binding && binding.object && binding.object.value);
      }).filter(function (url) {
        if (!/^https:\/\/data\.getty\.edu\/museum\/collection\/object\/[a-f0-9-]{36}$/i.test(url) || seen[url]) return false;
        seen[url] = true;
        return true;
      }).slice(0, candidateLimit);
      return mapWithConcurrency(objectUrls, 3, function (url) {
        return fetchFn(url, jsonOptions).then(function (response) { return response && response.ok ? response.json() : null; });
      });
    }).then(function (objects) {
      var pairs = [];
      objects.filter(Boolean).forEach(function (objectRecord) {
        var mediaUrls = (Array.isArray(objectRecord.shows) ? objectRecord.shows : []).map(function (entry) {
          return safeHttpsUrl(entry && entry.id);
        }).filter(function (url) {
          return /^https:\/\/data\.getty\.edu\/media\/image\/[a-f0-9-]{36}$/i.test(url);
        }).slice(0, 2);
        mediaUrls.forEach(function (mediaUrl) { pairs.push({ objectRecord: objectRecord, mediaUrl: mediaUrl }); });
      });
      return mapWithConcurrency(pairs, 4, function (pair) {
        return fetchFn(pair.mediaUrl, jsonOptions).then(function (response) {
          return response && response.ok ? response.json() : null;
        }).then(function (mediaRecord) {
          return mediaRecord ? gettyImageFromRecords(pair.objectRecord, mediaRecord, q, opts.kind) : null;
        });
      });
    }).then(function (items) {
      requestContext.finish();
      if (opts.signal && opts.signal.aborted) {
        var stopped = new Error('Getty Museum search cancelled.');
        stopped.name = 'AbortError';
        throw stopped;
      }
      var seenSources = {};
      return items.filter(Boolean).filter(function (item) {
        if (seenSources[item.sourceUrl]) return false;
        seenSources[item.sourceUrl] = true;
        return true;
      }).slice(0, maximum);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }


  // Museums Victoria's search facet is record-level, but a record may mix open
  // and restricted media. Flatten media and bind every admitted result to its
  // exact record, image id, licence URI, and official printable rendition.
  function museumsVictoriaRecordIdentity(value) {
    var raw = value && typeof value === 'object' ? String(value.id || '') : String(value || '');
    raw = raw.trim();
    if (/^https:/i.test(raw)) {
      var parsed = parsedSmkHttpsUrl(raw);
      if (!parsed || parsed.hostname !== 'collections.museumsvictoria.com.au') return null;
      raw = parsed.pathname.replace(/^\/+/, '');
    } else {
      raw = raw.replace(/^\/+/, '');
    }
    var match = raw.match(/^(items|specimens|species|articles)\/(\d{1,12})$/i);
    if (!match) return null;
    var recordType = match[1].toLowerCase();
    var recordId = match[2];
    var recordPath = recordType + '/' + recordId;
    return {
      recordType: recordType, recordId: recordId, recordPath: recordPath,
      sourceUrl: 'https://collections.museumsvictoria.com.au/' + recordPath,
      apiUrl: MUSEUMS_VICTORIA_API + '/' + recordPath
    };
  }

  function safeMuseumsVictoriaSourceUrl(value) {
    var identity = museumsVictoriaRecordIdentity(value);
    var safe = safeHttpsUrl(value);
    return identity && safe === identity.sourceUrl ? identity.sourceUrl : '';
  }

  function normalizedMuseumsVictoriaMediaId(value) {
    var match = String(value || '').trim().match(/^(?:media\/)?(\d{1,12})$/i);
    return match ? match[1] : '';
  }

  function safeMuseumsVictoriaMediaUrl(value, expectedMediaId, expectedSize) {
    var safe = safeHttpsUrl(value);
    var match = safe.match(/^https:\/\/collections\.museumsvictoria\.com\.au\/content\/media\/\d{1,12}\/(\d{1,12})-(large|medium|small|thumbnail)\.jpg$/i);
    if (!match) return '';
    var mediaId = normalizedMuseumsVictoriaMediaId(expectedMediaId);
    var size = String(expectedSize || '').trim().toLowerCase();
    if ((mediaId && match[1] !== mediaId) || (size && match[2].toLowerCase() !== size)) return '';
    return safe;
  }

  function normalizeMuseumsVictoriaMediaRights(media) {
    var candidate = media && typeof media === 'object' ? media : {};
    var licence = candidate.licence && typeof candidate.licence === 'object' ? candidate.licence : {};
    var rawUrl = safeHttpsUrl(licence.uri);
    if (!rawUrl) return null;
    var normalizedUrl = rawUrl.replace(/\/+$/, '').toLowerCase();
    var descriptors = [licence.name, licence.shortName, candidate.rightsStatement].map(function (value) {
      return plainMetadata(value).toLowerCase();
    }).filter(Boolean).join(' | ');
    if (/all rights reserved|third[- ]party copyright|permission (?:is )?required|no derivatives|noncommercial|non-commercial|\bcc by(?:[- ](?:nc|nd|sa))+\b|\b(?:nc|nd|sa)\b/.test(descriptors)) return null;
    if (normalizedUrl === 'https://creativecommons.org/publicdomain/zero/1.0') {
      if (/\bcc by\b|attribution required/.test(descriptors)) return null;
      return { license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', rightsType: 'cc0', rightsShort: 'CC0' };
    }
    if (normalizedUrl === 'https://creativecommons.org/publicdomain/mark/1.0') {
      if (/\bcc by\b|attribution required/.test(descriptors)) return null;
      return { license: 'Public Domain Mark 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', rightsType: 'pd', rightsShort: 'Public domain' };
    }
    if (normalizedUrl === 'https://creativecommons.org/licenses/by/4.0') {
      if (descriptors && !/\bcc by\b|creative commons attribution/.test(descriptors)) return null;
      return { license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', rightsType: 'ccby', rightsShort: 'CC BY' };
    }
    return null;
  }

  function museumsVictoriaTextList(value) {
    var list = Array.isArray(value) ? value : (value == null ? [] : [value]);
    return list.map(function (entry) {
      if (entry && typeof entry === 'object') return plainMetadata(entry.name || entry.displayName || entry.label || entry.title || entry.value);
      return plainMetadata(entry);
    }).filter(Boolean);
  }

  function museumsVictoriaItemsFromRecord(record, query, requestedKind, onlyMediaId) {
    if (!record || typeof record !== 'object') return [];
    var identity = museumsVictoriaRecordIdentity(record);
    if (!identity) return [];
    var wantedMediaId = normalizedMuseumsVictoriaMediaId(onlyMediaId);
    var mediaList = Array.isArray(record.media) ? record.media : [];
    var baseTitle = plainMetadata(record.displayTitle || record.title || record.name || record.objectName);
    var recordSummary = plainMetadata(record.summary || record.description || record.objectSummary || record.classification || record.category || record.discipline);
    var recordYear = plainMetadata(record.date || record.dateDisplay || record.productionDate || record.dateModified) || 'See source record';
    return mediaList.map(function (media) {
      if (!media || String(media.type || '').trim().toLowerCase() !== 'image') return null;
      var mediaId = normalizedMuseumsVictoriaMediaId(media.id);
      if (!mediaId || (wantedMediaId && mediaId !== wantedMediaId)) return null;
      var rights = normalizeMuseumsVictoriaMediaRights(media);
      if (!rights) return null;
      var large = media.large && typeof media.large === 'object' ? media.large : {};
      var medium = media.medium && typeof media.medium === 'object' ? media.medium : {};
      var small = media.small && typeof media.small === 'object' ? media.small : {};
      var downloadUrl = safeMuseumsVictoriaMediaUrl(large.uri, mediaId, 'large');
      var imageUrl = safeMuseumsVictoriaMediaUrl(medium.uri, mediaId, 'medium')
        || safeMuseumsVictoriaMediaUrl(small.uri, mediaId, 'small')
        || downloadUrl;
      if (!imageUrl || !downloadUrl) return null;
      var caption = plainMetadata(media.caption || media.alternativeText);
      var title = baseTitle || caption || ('Museums Victoria image ' + mediaId);
      if (caption && baseTitle && caption.toLowerCase() !== baseTitle.toLowerCase()) title += ' — ' + caption;
      title = title.slice(0, 180);
      var creators = museumsVictoriaTextList(media.creators);
      var credit = plainMetadata(media.credit);
      var sources = museumsVictoriaTextList(media.sources);
      var creator = creators.join('; ') || credit || 'Creator listed on the Museums Victoria record';
      creator = creator.slice(0, 160);
      var description = [caption, recordSummary, credit, sources.join('; ')].filter(Boolean).join(' · ');
      if (!description) description = 'Openly reusable image from Museums Victoria Collections.';
      description = description.slice(0, 280);
      var rightsStatement = plainMetadata(media.rightsStatement);
      var rightsNote = rights.rightsType === 'ccby'
        ? 'Museums Victoria assigns CC BY 4.0 to this exact image; attribution is required. Review the linked record and cultural context before use.'
        : 'Museums Victoria marks this exact image ' + rights.rightsShort + '. Review the linked record and cultural context before use.';
      var classification = [title, creator, description, record.category, record.discipline, record.collection].join(' ');
      return {
        id: 'mv-live-' + identity.recordType + '-' + identity.recordId + '-' + mediaId,
        mvRecordPath: identity.recordPath, mvMediaId: mediaId,
        title: title, kind: inferMaterialKind([query, classification].join(' '), requestedKind), provider: MUSEUMS_VICTORIA_PROVIDER,
        year: recordYear.slice(0, 80), creator: creator, description: description,
        license: rights.license, licenseUrl: rights.licenseUrl, rightsType: rights.rightsType, rightsShort: rights.rightsShort,
        rightsNote: rightsNote, tags: normalizeWords(classification), accent: ['#dce9e4', '#315f57'],
        sourceUrl: identity.sourceUrl, imageUrl: imageUrl, downloadUrl: downloadUrl,
        pixelWidth: normalizedPixelDimension(large.width), pixelHeight: normalizedPixelDimension(large.height),
        live: true,
        rightsMetadataSource: 'Museums Victoria API ' + identity.recordPath + '; media/' + mediaId + '; media licence=' + rights.licenseUrl + (rightsStatement ? '; rightsStatement=' + rightsStatement : '')
      };
    }).filter(Boolean);
  }

  function isSerializedMuseumsVictoriaAsset(item) {
    if (!item || typeof item !== 'object') return false;
    if (String(item.provider || '').trim().toLowerCase() === MUSEUMS_VICTORIA_PROVIDER.toLowerCase()) return true;
    var hasOfficialHost = [item.sourceUrl, item.imageUrl, item.downloadUrl].some(function (value) {
      var safe = safeHttpsUrl(value);
      return /^https:\/\/collections\.museumsvictoria\.com\.au\//i.test(safe);
    });
    return hasOfficialHost || /^mv-live-/i.test(String(item.id || ''))
      || Object.prototype.hasOwnProperty.call(item, 'mvRecordPath')
      || Object.prototype.hasOwnProperty.call(item, 'mvMediaId');
  }

  function museumsVictoriaIdentityFromAsset(item) {
    if (!isSerializedMuseumsVictoriaAsset(item)) return null;
    var fromSource = museumsVictoriaRecordIdentity(item.sourceUrl);
    var fromSavedPath = item.mvRecordPath ? museumsVictoriaRecordIdentity(item.mvRecordPath) : fromSource;
    var mediaId = normalizedMuseumsVictoriaMediaId(item.mvMediaId);
    var imageUrl = safeMuseumsVictoriaMediaUrl(item.imageUrl, mediaId);
    var downloadUrl = safeMuseumsVictoriaMediaUrl(item.downloadUrl, mediaId, 'large');
    if (!fromSource || !fromSavedPath || fromSource.recordPath !== fromSavedPath.recordPath || !mediaId || !imageUrl || !downloadUrl) return null;
    return {
      asset: item, recordPath: fromSource.recordPath, recordType: fromSource.recordType,
      recordId: fromSource.recordId, mediaId: mediaId, sourceUrl: fromSource.sourceUrl,
      apiUrl: fromSource.apiUrl, imageUrl: imageUrl, downloadUrl: downloadUrl,
      cacheKey: fromSource.recordPath + '|media/' + mediaId
    };
  }

  function fetchMuseumsVictoriaJson(url, fetchFn, signal) {
    var requestContext = providerRequestContext(signal, 12000);
    return fetchFn(url, requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError(MUSEUMS_VICTORIA_PROVIDER, response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      return payload;
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }

  function museumsVictoriaRecordFromPayload(payload) {
    var responsePayload = payload && payload.response;
    return Array.isArray(responsePayload) ? (responsePayload.length === 1 ? responsePayload[0] : null)
      : (responsePayload && typeof responsePayload === 'object' ? responsePayload : payload);
  }

  function museumsVictoriaFreshAssetFromRecord(identity, record) {
    if (!identity) throw new Error('A Museums Victoria asset is missing a trustworthy record and media identity.');
    var fresh = museumsVictoriaItemsFromRecord(record, '', 'All', identity.mediaId)[0];
    if (!fresh) throw new Error('A Museums Victoria record no longer has the saved image with an allowed exact media licence.');
    var freshIdentity = museumsVictoriaIdentityFromAsset(fresh);
    if (!freshIdentity || freshIdentity.recordPath !== identity.recordPath || freshIdentity.mediaId !== identity.mediaId || freshIdentity.sourceUrl !== identity.sourceUrl) {
      throw new Error('A Museums Victoria record changed identity during verification.');
    }
    return cloneLiveSearchItem(fresh);
  }

  function fetchMuseumsVictoriaAssetByIdentity(identity, options) {
    var opts = options || {};
    var fetchFn = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Museums Victoria record verification is unavailable in this browser.'));
    if (!identity || !identity.apiUrl) return Promise.reject(new Error('A Museums Victoria asset is missing a trustworthy record and media identity.'));
    return fetchMuseumsVictoriaJson(identity.apiUrl, fetchFn, opts.signal).then(function (payload) {
      return museumsVictoriaFreshAssetFromRecord(identity, museumsVictoriaRecordFromPayload(payload));
    });
  }

  function fetchMuseumsVictoriaAssetsByIdentities(assets, options) {
    var opts = options || {};
    var candidates = Array.isArray(assets) ? assets : [];
    if (!candidates.length) return Promise.resolve([]);
    var identities = candidates.map(museumsVictoriaIdentityFromAsset);
    if (identities.some(function (identity) { return !identity; })) {
      return Promise.reject(new Error('A Museums Victoria asset is missing a trustworthy record, media, source, or rendition identity.'));
    }
    var fetchFn = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Museums Victoria record verification is unavailable in this browser.'));
    var identitiesByRecord = Object.create(null);
    identities.forEach(function (identity) {
      if (!identitiesByRecord[identity.recordPath]) identitiesByRecord[identity.recordPath] = [];
      if (!identitiesByRecord[identity.recordPath].some(function (saved) { return saved.cacheKey === identity.cacheKey; })) {
        identitiesByRecord[identity.recordPath].push(identity);
      }
    });
    var verifiedByKey = Object.create(null);
    var firstError = null;
    return mapWithConcurrency(Object.keys(identitiesByRecord), MUSEUMS_VICTORIA_REVALIDATION_CONCURRENCY, function (recordPath) {
      var recordIdentities = identitiesByRecord[recordPath];
      var representative = recordIdentities[0];
      return fetchMuseumsVictoriaJson(representative.apiUrl, fetchFn, opts.signal).then(function (payload) {
        var record = museumsVictoriaRecordFromPayload(payload);
        recordIdentities.forEach(function (identity) {
          verifiedByKey[identity.cacheKey] = museumsVictoriaFreshAssetFromRecord(identity, record);
        });
        return true;
      }).catch(function (error) {
        if (!firstError) firstError = error;
        throw error;
      });
    }).then(function (outcomes) {
      if (firstError || outcomes.some(function (outcome) { return outcome !== true; })) {
        throw firstError || new Error('Museums Victoria record verification did not complete.');
      }
      return identities.map(function (identity) {
        var fresh = verifiedByKey[identity.cacheKey];
        if (!fresh) throw new Error('A Museums Victoria record could not be verified against its saved identity.');
        return cloneLiveSearchItem(fresh);
      });
    });
  }
  function searchMuseumsVictoriaLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Museums Victoria live search is unavailable in this browser.'));
    var maximum = liveProviderLimit(MUSEUMS_VICTORIA_PROVIDER, opts.limit);
    var candidateLimit = Math.max(maximum, Math.min(60, maximum * 2));
    var page = normalizedSearchPage(opts.page) + 1;
    var licenceFacet = opts.rightsScope === 'all' ? 'public domain,cc by' : 'public domain';
    var searchUrl = MUSEUMS_VICTORIA_API + '/search?query=' + encodeURIComponent(q)
      + '&hasimages=yes&imagelicence=' + encodeURIComponent(licenceFacet)
      + '&sort=relevance&page=' + page + '&perpage=' + candidateLimit + '&envelope=true';
    return fetchMuseumsVictoriaJson(searchUrl, fetchFn, opts.signal).then(function (payload) {
      if (!payload || Number(payload.status) !== 200 || !Array.isArray(payload.response)) {
        throw new Error('Museums Victoria returned an invalid search response.');
      }
      var items = [];
      var seen = Object.create(null);
      payload.response.forEach(function (record) {
        museumsVictoriaItemsFromRecord(record, q, opts.kind).forEach(function (item) {
          if (items.length >= maximum || seen[item.id] || !allowedByRightsScope(item, opts.rightsScope || 'all')) return;
          seen[item.id] = true;
          items.push(item);
        });
      });
      return items;
    });
  }
  // Openverse aggregates many public repositories. Its own documentation asks
  // users to verify license metadata, so Sourcebook accepts only canonical PDM,
  // CC0, and unmodified CC BY combinations and keeps the Openverse record as the
  // provenance link. NC, ND, SA, unknown, mature, sensitive, small, and malformed
  // records are rejected even if an upstream search response includes them.
  function normalizeOpenverseRights(record) {
    var item = record || {};
    var slug = String(item.license || '').toLowerCase().trim();
    var version = String(item.license_version || '').trim();
    var licenseUrl = safeHttpsUrl(item.license_url);
    if (slug === 'pdm' && version === '1.0' && /^https:\/\/creativecommons\.org\/publicdomain\/mark\/1\.0\/(?:deed\.[a-z-]+\/?)?$/i.test(licenseUrl)) {
      return { rightsType: 'pd', rightsShort: 'Public domain', license: 'Public Domain Mark 1.0', licenseUrl: licenseUrl };
    }
    if (slug === 'cc0' && version === '1.0' && /^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/(?:deed\.[a-z-]+\/?)?$/i.test(licenseUrl)) {
      return { rightsType: 'cc0', rightsShort: 'CC0', license: 'CC0 1.0', licenseUrl: licenseUrl };
    }
    if (slug === 'by' && /^(2\.0|3\.0|4\.0)$/.test(version) && new RegExp('^https:\\/\\/creativecommons\\.org\\/licenses\\/by\\/' + version.replace('.', '\\.') + '\\/(?:deed\\.[a-z-]+\\/?)?$', 'i').test(licenseUrl)) {
      return { rightsType: 'ccby', rightsShort: 'CC BY', license: 'CC BY ' + version, licenseUrl: licenseUrl };
    }
    return null;
  }

  function openverseItemFromRecord(record, query, requestedKind) {
    if (!record || record.mature !== false || record.watermarked === true) return null;
    var sensitivity = record['unstable__sensitivity'];
    if (Array.isArray(sensitivity) && sensitivity.length) return null;
    var id = String(record.id || '').toLowerCase();
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) return null;
    var rights = normalizeOpenverseRights(record);
    if (!rights) return null;
    var width = Number(record.width);
    var height = Number(record.height);
    if (!isFinite(width) || !isFinite(height) || Math.max(width, height) < 600) return null;
    var recordUrl = OPENVERSE_API + '/images/' + id + '/';
    var thumbnailUrl = recordUrl + 'thumb/';
    if (safeHttpsUrl(record.detail_url) !== recordUrl || safeHttpsUrl(record.thumbnail) !== thumbnailUrl) return null;
    if (!safeHttpsUrl(record.foreign_landing_url) || !safeHttpsUrl(record.url)) return null;
    var title = plainMetadata(record.title) || 'Openly licensed visual asset';
    var creator = plainMetadata(record.creator);
    var attribution = plainMetadata(record.attribution);
    if (rights.rightsType === 'ccby' && (!creator || !attribution || attribution.toLowerCase().indexOf(rights.license.toLowerCase()) === -1)) return null;
    creator = creator || 'Creator listed on the linked Openverse record';
    var upstream = plainMetadata(record.provider || record.source) || 'an open repository';
    var tagValues = Array.isArray(record.tags) ? record.tags.map(function (tag) { return plainMetadata(tag && tag.name); }).filter(Boolean).slice(0, 16) : [];
    var classification = [title, record.category, upstream].concat(tagValues).join(' ');
    var description = 'A ' + width + ' × ' + height + ' open visual indexed from ' + upstream + ', with preparation access through Openverse.';
    var rightsNote = 'Openverse reports this record as ' + rights.license + ' and links its upstream source. Verify the linked record for the intended use; attribution is required for CC BY.';
    return {
      id: 'openverse-live-' + id,
      title: title.slice(0, 180),
      kind: inferMaterialKind([query, classification].join(' '), requestedKind),
      provider: 'Openverse',
      year: 'See linked source record',
      creator: creator.slice(0, 160),
      description: description.slice(0, 280),
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: rightsNote,
      tags: normalizeWords(classification),
      accent: ['#e0e1f5', '#4b4b86'],
      sourceUrl: recordUrl,
      imageUrl: thumbnailUrl,
      downloadUrl: thumbnailUrl + '?full_size=true',
      pixelWidth: normalizedPixelDimension(width),
      pixelHeight: normalizedPixelDimension(height),
      live: true,
      rightsMetadataSource: 'Openverse API item record ' + recordUrl
    };
  }

  function openverseLicenseFilter(scope) {
    if (scope === 'pd') return 'pdm';
    if (scope === 'pd-cc0') return 'pdm,cc0';
    return 'pdm,cc0,by';
  }

  function searchOpenverseLive(query, options) {
    var q = String(query || '').trim();
    if (!q) return Promise.resolve([]);
    var opts = options || {};
    var fetchFn = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (!fetchFn) return Promise.reject(new Error('Openverse live search is unavailable in this browser.'));
    var kindHints = {
      Maps: 'map', Textures: 'texture', Patterns: 'pattern', Blueprints: 'blueprint',
      Science: 'scientific', Botanical: 'botanical', Archival: 'archival',
      Figures: 'portrait', Landscapes: 'landscape'
    };
    var hint = kindHints[opts.kind] || '';
    var queryWords = normalizeWords(q);
    var searchText = q;
    if (hint && queryWords.length < 5 && queryWords.indexOf(hint) === -1) searchText += ' ' + hint;
    searchText = searchText.slice(0, 190);
    var maximum = Math.max(4, Math.min(40, Number(opts.limit || 24)));
    var page = normalizedSearchPage(opts.page) + 1;
    var licenseFilter = openverseLicenseFilter(opts.rightsScope || 'all');
    var searchUrl = OPENVERSE_API + '/images/?q=' + encodeURIComponent(searchText)
      + '&license=' + encodeURIComponent(licenseFilter)
      + '&mature=false&filter_dead=true&size=medium%2Clarge&page_size=' + maximum + '&page=' + page;
    var requestContext = providerRequestContext(opts.signal, 15000);
    return fetchFn(searchUrl, requestContext.options).then(function (response) {
      if (!response || !response.ok) throw providerHttpError('Openverse', response);
      return response.json();
    }).then(function (payload) {
      requestContext.finish();
      var records = payload && Array.isArray(payload.results) ? payload.results : [];
      return records.map(function (record) { return openverseItemFromRecord(record, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      requestContext.finish();
      throw error;
    });
  }
