/* Bounded source-discovery client for Text Inquiry Studio. */
(function (root, factory) {
  var api = factory(root);
  if (root) root.AlloFlowTextInquirySearch = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DEFAULT_PROXY_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/search';
  var DEFAULT_METADATA_PROXY_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/source-metadata';
  var MAX_QUERY_CHARS = 200;
  var MAX_RESULTS = 10;
  var DEFAULT_RESULTS = 5;
  var SOURCE_SCOPES = {
    web: { label: 'General web', domains: [] },
    open: { label: 'Public-domain and open archives', domains: ['gutenberg.org', 'archive.org', 'loc.gov'] },
    libraries: { label: 'Libraries and catalogs', domains: ['loc.gov', 'archive.org', 'worldcat.org', 'hathitrust.org', 'books.google.com'] },
    scholarly: { label: 'Scholarly records', domains: ['doi.org', 'crossref.org', 'jstor.org', 'muse.jhu.edu', 'projectmuse.jhu.edu'] },
  };
  var PREFERRED_DOMAINS = {
    'archive.org': 'Internet Archive',
    'books.google.com': 'Google Books',
    'crossref.org': 'Crossref',
    'doi.org': 'DOI record',
    'gutenberg.org': 'Project Gutenberg',
    'hathitrust.org': 'HathiTrust',
    'jstor.org': 'JSTOR',
    'loc.gov': 'Library of Congress',
    'muse.jhu.edu': 'Project MUSE',
    'projectmuse.jhu.edu': 'Project MUSE',
    'worldcat.org': 'WorldCat',
  };

  function clean(value, limit) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  }

  function redactString(value) {
    return String(value == null ? '' : value)
      .slice(0, 2000)
      .replace(/[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,}/gi, '[redacted]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted]')
      .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted]')
      .replace(/\b(?:AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,})\b/g, '[redacted]');
  }

  function safeUrl(value) {
    try {
      var parsed = new URL(String(value || '').trim());
      if (parsed.username || parsed.password) return '';
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
    } catch (_) {
      return '';
    }
  }

  function parseHttpsEndpoint(value) {
    try {
      var parsed = new URL(String(value || '').trim());
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function domainFor(url) {
    try { return new URL(url).hostname.replace(/^www\./i, ''); } catch (_) { return ''; }
  }

  function preferredDomainFor(domain) {
    var value = String(domain || '').toLowerCase();
    var keys = Object.keys(PREFERRED_DOMAINS);
    for (var i = 0; i < keys.length; i += 1) {
      if (value === keys[i] || value.slice(-(keys[i].length + 1)) === '.' + keys[i]) {
        return { recognized: true, label: PREFERRED_DOMAINS[keys[i]] };
      }
    }
    return { recognized: false, label: 'General web' };
  }

  function compareMetadataField(expected, observed) {
    var cleanObserved = clean(observed || '', 320);
    var left=clean(expected||'',240).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    var right=cleanObserved.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if(!left)return {kind:'neutral',label:'Not provided',observed:cleanObserved||'Not recorded'};
    if(!right)return {kind:'warn',label:'Not found',observed:'Not returned by the page'};
    if(left===right||left.indexOf(right)>=0||right.indexOf(left)>=0)return {kind:'ok',label:'Likely match',observed:cleanObserved};
    var words=left.split(' ').filter(function(word){return word.length>2;});
    var hits=words.filter(function(word){return right.indexOf(word)>=0;}).length;
    if(words.length&&hits/words.length>=0.5)return {kind:'warn',label:'Partial match',observed:cleanObserved};
    return {kind:'error',label:'Possible mismatch',observed:cleanObserved};
  }

  function assessConfidence(input) {
    input=input||{};
    var metadata=input.metadata||{};
    if(input.metadataStatus!=='ok')return {level:'unknown',label:'Not assessed',score:0,maxScore:10,reasons:['Metadata verification has not completed.'],comparisons:{}};
    var expected=input.expected||{};
    var comparisons={title:compareMetadataField(expected.title,metadata.title),creator:compareMetadataField(expected.creator,metadata.creator),edition:compareMetadataField(expected.edition,metadata.date)};
    var score=0;var reasons=[];
    if(comparisons.title.kind==='ok'){score+=2;reasons.push('title matches');}else if(comparisons.title.kind==='warn'){score+=1;reasons.push('title partially matches');}else if(comparisons.title.kind==='error')reasons.push('title may differ');
    if(comparisons.creator.kind==='ok'){score+=2;reasons.push('creator matches');}else if(comparisons.creator.kind==='warn'){score+=1;reasons.push('creator partially matches');}else if(comparisons.creator.kind==='error')reasons.push('creator may differ');
    if(comparisons.edition.kind==='ok'){score+=1;reasons.push('date or edition matches');}else if(comparisons.edition.kind==='warn'){score+=1;reasons.push('date or edition partially matches');}
    var signals=metadata.signals||{};
    if(signals.jsonLd||signals.citationMeta){score+=1;reasons.push(signals.jsonLd?'structured JSON-LD metadata found':'citation metadata found');}
    if(metadata.doi||metadata.isbn){score+=2;reasons.push(metadata.doi?'DOI identified':'ISBN identified');}
    if(metadata.canonicalUrl){score+=1;reasons.push('canonical URL found');}
    if(input.preferredDomain===true){score+=1;reasons.push('recognized library, archive, or scholarly domain');}
    var level=score>=7?'high':score>=4?'medium':'low';
    return {level:level,label:level==='high'?'High confidence':level==='medium'?'Medium confidence':'Low confidence',score:score,maxScore:10,reasons:reasons,comparisons:comparisons};
  }

  function scopeFor(value) {
    var key = clean(value, 30).toLowerCase();
    return Object.prototype.hasOwnProperty.call(SOURCE_SCOPES, key) ? key : 'web';
  }

  function scopedQuery(query, scope) {
    var details = SOURCE_SCOPES[scopeFor(scope)];
    if (!details.domains.length) return query;
    return '(' + details.domains.map(function (domain) { return 'site:' + domain; }).join(' OR ') + ') ' + query;
  }

  function normalizeResults(rows, fallbackSource) {
    return (Array.isArray(rows) ? rows : []).slice(0, MAX_RESULTS).map(function (row) {
      var url = safeUrl(row && (row.url || row.link || row.uri));
      if (!url) return null;
      var domain = domainFor(url);
      var preferred = preferredDomainFor(domain);
      return {
        title: clean(row && row.title || 'Web source', 300) || 'Web source',
        url: url,
        snippet: clean(row && (row.snippet || row.content || row.description) || '', 1000),
        source: clean(row && row.source || fallbackSource || 'Web search', 80) || 'Web search',
        domain: domain,
        preferredDomain: preferred.recognized,
        preferredDomainLabel: preferred.label,
      };
    }).filter(Boolean);
  }

  function readConfig(key) {
    var scopes = [root];
    try { if (root.opener && root.opener !== root) scopes.push(root.opener); } catch (_) {}
    for (var i = 0; i < scopes.length; i += 1) {
      try {
        var value = scopes[i] && scopes[i][key];
        if (value) return String(value).trim();
      } catch (_) {}
    }
    return '';
  }

  function findExistingProvider() {
    var scopes = [root];
    try { if (root.opener && root.opener !== root) scopes.push(root.opener); } catch (_) {}
    for (var i = 0; i < scopes.length; i += 1) {
      try {
        var provider = scopes[i] && scopes[i].WebSearchProvider;
        if (provider && typeof provider.search === 'function') return provider;
      } catch (_) {}
    }
    return null;
  }

  function proxyUrl() {
    return readConfig('ALLOFLOW_TEXT_INQUIRY_SEARCH_PROXY')
      || readConfig('ALLOFLOW_CANVAS_SEARCH_PROXY')
      || DEFAULT_PROXY_URL;
  }

  function metadataProxyUrl() {
    var configured = readConfig('ALLOFLOW_TEXT_INQUIRY_METADATA_PROXY');
    if (configured) return configured;
    var parsed = parseHttpsEndpoint(proxyUrl());
    if (parsed && /\/search\/?$/i.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/\/search\/?$/i, '/source-metadata');
      return parsed.toString();
    }
    return DEFAULT_METADATA_PROXY_URL;
  }

  function errorMessage(status) {
    if (status === 429) return 'The shared web-search budget is temporarily limited. Try again later.';
    if (status === 503) return 'Web search is not configured or is temporarily disabled.';
    if (status === 504) return 'The web-search service timed out. Try the search again.';
    if (status === 401 || status === 403) return 'The web-search transport rejected the request. Check the configured proxy.';
    if (status >= 500) return 'The web-search service could not complete this request.';
    return 'Web search returned an unexpected response.';
  }

  function metadataErrorMessage(status) {
    if (status === 404) return 'Metadata verification is not available for this search proxy.';
    if (status === 504) return 'The source page timed out before its metadata could be checked.';
    if (status === 502) return 'The source page could not be reached or returned unsupported content.';
    if (status >= 500) return 'The metadata service could not check this source.';
    return 'Metadata verification returned an unexpected response.';
  }

  function isDesktopOffline() {
    var scopes = [root];
    try { if (root.opener && root.opener !== root) scopes.push(root.opener); } catch (_) {}
    for (var i = 0; i < scopes.length; i += 1) {
      try {
        if (scopes[i] && (scopes[i]._isDesktopBundledApp === true || scopes[i].__ALLOFLOW_DESKTOP_OFFLINE__ === true)) {
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  function isManagedSearchDisabled() {
    var scopes = [root];
    try { if (root.opener && root.opener !== root) scopes.push(root.opener); } catch (_) {}
    for (var i = 0; i < scopes.length; i += 1) {
      try {
        var managed = scopes[i] && scopes[i].ALLOFLOW_MANAGED_AI_POLICY;
        if (managed != null && (managed.version !== 1 || managed.allowExternalSearch !== true)) {
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  async function fetchJsonWithTimeout(requestUrl, timeoutMs) {
    var controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = controller ? root.setTimeout(function () { try { controller.abort(); } catch (_) {} }, timeoutMs) : null;
    try {
      var opts = {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
        referrerPolicy: 'no-referrer',
      };
      if (controller) opts.signal = controller.signal;
      var response = await root.fetch(requestUrl, opts);
      if (!response || !response.ok) {
        return { ok: false, status: response && response.status || 0, data: null, jsonError: false };
      }
      try {
        var data = await response.json();
        return { ok: true, status: response.status || 200, data: data, jsonError: false };
      } catch (err) {
        if (controller && controller.signal && controller.signal.aborted) throw err;
        return { ok: true, status: response.status || 200, data: null, jsonError: true };
      }
    } finally {
      if (timer != null) root.clearTimeout(timer);
    }
  }

  async function search(query, options) {
    options = options || {};
    var safeQuery = clean(redactString(query), MAX_QUERY_CHARS);
    var scope = scopeFor(options.scope);
    var searchQuery = scopedQuery(safeQuery, scope);
    var requested = Number(options.maxResults);
    var maxResults = Number.isFinite(requested) ? Math.max(1, Math.min(Math.floor(requested), MAX_RESULTS)) : DEFAULT_RESULTS;
    if (safeQuery.length < 3) throw new Error('Enter at least three characters for a source search.');
    if (isDesktopOffline()) throw new Error('Web source search is disabled in offline Desktop mode.');
    if (isManagedSearchDisabled()) throw new Error('Web source search is disabled by managed organization policy.');
    if (root.navigator && root.navigator.onLine === false) throw new Error('This window is offline. Web source search is unavailable.');

    var started = Date.now();
    var provider = findExistingProvider();
    if (provider) {
      var providerResult = await provider.search(safeQuery, maxResults, searchQuery);
      if (providerResult && providerResult.policyBlocked) throw new Error('Web source search is disabled by managed organization policy.');
      if (providerResult && providerResult.privacyBlocked) throw new Error('This search query was blocked by privacy guardrails.');
      var providerRows = normalizeResults(providerResult && providerResult.results, providerResult && providerResult.source || 'Web search');
      return {
        ok: true,
        query: safeQuery,
        searchQuery: searchQuery,
        scope: scope,
        results: providerRows,
        source: clean(providerResult && providerResult.source || 'Web search', 80),
        cached: !!(providerResult && providerResult.cached),
        elapsedMs: Date.now() - started,
      };
    }

    var endpoint = parseHttpsEndpoint(proxyUrl());
    if (!endpoint) throw new Error('A secure source-search proxy is not configured.');
    var baseEndpoint = endpoint.toString();
    var requestUrl = baseEndpoint + (endpoint.search ? '&' : '?')
      + 'q=' + encodeURIComponent(searchQuery) + '&num=' + String(maxResults);
    var fetched;
    try {
      fetched = await fetchJsonWithTimeout(requestUrl, 12000);
    } catch (error) {
      throw new Error('The web-search service could not be reached. Check your connection or search proxy.');
    }
    if (!fetched || !fetched.ok) throw new Error(errorMessage(fetched && fetched.status || 0));
    if (fetched.jsonError) throw new Error('The web-search service returned invalid data.');
    var data = fetched.data;
    var rows = normalizeResults(data && (data.results || data.organic), 'Serper');
    return {
      ok: true,
      query: safeQuery,
      searchQuery: clean(data && data.searchQuery || searchQuery, MAX_QUERY_CHARS),
      scope: scope,
      results: rows,
      source: clean(data && data.source || 'Serper', 80) || 'Serper',
      cached: !!(data && data.cached),
      elapsedMs: Date.now() - started,
    };
  }

  async function verifyMetadata(url, options) {
    options = options || {};
    var safe = safeUrl(url);
    if (!safe) throw new Error('Only an HTTP or HTTPS source URL can be verified.');
    if (isDesktopOffline()) throw new Error('Metadata verification is disabled in offline Desktop mode.');
    if (isManagedSearchDisabled()) throw new Error('Metadata verification is disabled by managed organization policy.');
    if (root.navigator && root.navigator.onLine === false) throw new Error('This window is offline. Metadata verification is unavailable.');
    var endpoint = parseHttpsEndpoint(metadataProxyUrl());
    if (!endpoint) throw new Error('A secure metadata proxy is not configured.');
    var baseEndpoint = endpoint.toString();
    var requestUrl = baseEndpoint + (endpoint.search ? '&' : '?') + 'url=' + encodeURIComponent(safe);
    var started = Date.now();
    var fetched;
    try {
      fetched = await fetchJsonWithTimeout(requestUrl, 10000);
    } catch (_) {
      throw new Error('The metadata service could not be reached.');
    }
    if (!fetched || !fetched.ok) throw new Error(metadataErrorMessage(fetched && fetched.status || 0));
    if (fetched.jsonError) throw new Error('The metadata service returned invalid data.');
    var data = fetched.data;
    var rawSignals = data && data.metadata && data.metadata.signals && typeof data.metadata.signals === 'object' && !Array.isArray(data.metadata.signals)
      ? data.metadata.signals
      : null;
    var hasOwn = Object.prototype.hasOwnProperty;
    var cleanSignals = rawSignals ? {
      jsonLd: Boolean(hasOwn.call(rawSignals, 'jsonLd') && rawSignals.jsonLd),
      citationMeta: Boolean(hasOwn.call(rawSignals, 'citationMeta') && rawSignals.citationMeta),
      canonical: Boolean(hasOwn.call(rawSignals, 'canonical') && rawSignals.canonical),
      doi: Boolean(hasOwn.call(rawSignals, 'doi') && rawSignals.doi),
      isbn: Boolean(hasOwn.call(rawSignals, 'isbn') && rawSignals.isbn),
    } : {};
    return {
      ok: true,
      url: safe,
      finalUrl: safeUrl(data && data.finalUrl) || safe,
      accessible: data && data.accessible !== false,
      cached: !!(data && data.cached),
      metadata: {
        title: clean(data && data.metadata && data.metadata.title || '', 300),
        creator: clean(data && data.metadata && data.metadata.creator || '', 180),
        date: clean(data && data.metadata && data.metadata.date || '', 80),
        description: clean(data && data.metadata && data.metadata.description || '', 500),
        canonicalUrl: safeUrl(data && data.metadata && data.metadata.canonicalUrl) || '',
        publisher: clean(data && data.metadata && data.metadata.publisher || '', 180),
        type: clean(data && data.metadata && data.metadata.type || '', 80),
        doi: clean(data && data.metadata && data.metadata.doi || '', 180),
        isbn: clean(data && data.metadata && data.metadata.isbn || '', 32),
        signals: cleanSignals,
      },
      source: clean(data && data.source || 'Metadata check', 80),
      elapsedMs: Date.now() - started,
      mode: clean(options.mode || 'selected-source', 40),
    };
  }

  return Object.freeze({
    version: '1.2.0',
    defaultProxyUrl: DEFAULT_PROXY_URL,
    defaultMetadataProxyUrl: DEFAULT_METADATA_PROXY_URL,
    sourceScopes: Object.freeze(SOURCE_SCOPES),
    preferredDomainFor: preferredDomainFor,
    compareMetadataField: compareMetadataField,
    assessConfidence: assessConfidence,
    scopedQuery: scopedQuery,
    normalizeResults: normalizeResults,
    search: search,
    verifyMetadata: verifyMetadata,
  });
});
