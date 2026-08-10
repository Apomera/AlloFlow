// GIS Studio - accessible, Maine-first geographic information systems lab.
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) {
      config.id = id; config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) < 0) this._order.push(id);
    },
    getRegisteredTools: function () {
      var self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) {
      var tool = this._registry[id];
      return tool && tool.render ? tool.render(ctx) : null;
    }
  };

  var MAINE = [
    { name: 'Androscoggin', lat: 44.10, lon: -70.23, density: 230, access: 88, coastal: false },
    { name: 'Aroostook', lat: 46.68, lon: -68.02, density: 11, access: 72, coastal: false },
    { name: 'Cumberland', lat: 43.66, lon: -70.26, density: 350, access: 93, coastal: true },
    { name: 'Franklin', lat: 44.67, lon: -70.15, density: 18, access: 76, coastal: false },
    { name: 'Hancock', lat: 44.54, lon: -68.42, density: 35, access: 84, coastal: true },
    { name: 'Kennebec', lat: 44.31, lon: -69.78, density: 59, access: 86, coastal: false },
    { name: 'Knox', lat: 44.10, lon: -69.11, density: 117, access: 88, coastal: true },
    { name: 'Lincoln', lat: 44.00, lon: -69.67, density: 80, access: 86, coastal: true },
    { name: 'Oxford', lat: 44.26, lon: -70.50, density: 28, access: 78, coastal: false },
    { name: 'Penobscot', lat: 44.80, lon: -68.77, density: 46, access: 82, coastal: false },
    { name: 'Piscataquis', lat: 45.18, lon: -69.23, density: 4, access: 68, coastal: false },
    { name: 'Sagadahoc', lat: 43.91, lon: -69.82, density: 139, access: 90, coastal: true },
    { name: 'Somerset', lat: 44.77, lon: -69.72, density: 13, access: 73, coastal: false },
    { name: 'Waldo', lat: 44.43, lon: -69.01, density: 50, access: 83, coastal: true },
    { name: 'Washington', lat: 44.72, lon: -67.46, density: 13, access: 70, coastal: true },
    { name: 'York', lat: 43.48, lon: -70.72, density: 208, access: 91, coastal: true }
  ];

  var NEW_ENGLAND = [
    { name: 'Portland, ME', lat: 43.66, lon: -70.26, density: 350, access: 93, coastal: true },
    { name: 'Burlington, VT', lat: 44.48, lon: -73.21, density: 190, access: 91, coastal: false },
    { name: 'Boston, MA', lat: 42.36, lon: -71.06, density: 5300, access: 96, coastal: true },
    { name: 'Providence, RI', lat: 41.82, lon: -71.41, density: 3800, access: 94, coastal: true },
    { name: 'Hartford, CT', lat: 41.76, lon: -72.67, density: 2800, access: 95, coastal: false },
    { name: 'Manchester, NH', lat: 42.99, lon: -71.45, density: 950, access: 94, coastal: false },
    { name: 'Northern Vermont', lat: 44.90, lon: -72.80, density: 30, access: 86, coastal: false },
    { name: 'Cape Cod, MA', lat: 41.70, lon: -70.30, density: 550, access: 92, coastal: true }
  ];

  var US_REGIONS = [
    { name: 'Pacific Northwest', lat: 47.61, lon: -122.33, density: 850, access: 95, coastal: true },
    { name: 'California Coast', lat: 37.77, lon: -122.42, density: 1800, access: 97, coastal: true },
    { name: 'Southwest', lat: 33.45, lon: -112.07, density: 350, access: 91, coastal: false },
    { name: 'Mountain West', lat: 39.74, lon: -104.99, density: 520, access: 94, coastal: false },
    { name: 'Great Plains', lat: 41.26, lon: -95.94, density: 180, access: 87, coastal: false },
    { name: 'Great Lakes', lat: 41.88, lon: -87.63, density: 1200, access: 93, coastal: false },
    { name: 'Northeast Corridor', lat: 40.71, lon: -74.01, density: 2900, access: 97, coastal: true },
    { name: 'Southeast', lat: 33.75, lon: -84.39, density: 650, access: 90, coastal: false },
    { name: 'Gulf Coast', lat: 29.76, lon: -95.37, density: 1100, access: 89, coastal: true },
    { name: 'Alaska', lat: 61.22, lon: -149.90, density: 15, access: 78, coastal: true },
    { name: 'Hawaii', lat: 21.31, lon: -157.86, density: 1250, access: 92, coastal: true }
  ];

  var GLOBAL_REGIONS = [
    { name: 'North America', lat: 43.65, lon: -79.38, density: 520, access: 94, coastal: true },
    { name: 'Latin America', lat: -23.55, lon: -46.63, density: 760, access: 78, coastal: true },
    { name: 'Europe', lat: 51.51, lon: -0.13, density: 1100, access: 96, coastal: true },
    { name: 'West Africa', lat: 6.52, lon: 3.38, density: 1300, access: 67, coastal: true },
    { name: 'East Africa', lat: -1.29, lon: 36.82, density: 430, access: 64, coastal: false },
    { name: 'Middle East', lat: 30.04, lon: 31.24, density: 900, access: 81, coastal: false },
    { name: 'South Asia', lat: 28.61, lon: 77.21, density: 1800, access: 72, coastal: false },
    { name: 'East Asia', lat: 35.68, lon: 139.65, density: 2100, access: 97, coastal: true },
    { name: 'Southeast Asia', lat: 1.35, lon: 103.82, density: 1500, access: 92, coastal: true },
    { name: 'Oceania', lat: -33.87, lon: 151.21, density: 420, access: 95, coastal: true },
    { name: 'Arctic North', lat: 64.15, lon: -21.94, density: 12, access: 88, coastal: true }
  ];

  // Region packs are deliberately data, not executable code. Keeping this
  // contract declarative lets a school or district supply a reviewed local pack
  // without giving the pack permission to run scripts or inject tile URLs.
  // Older project files only persist the pack id, so all of these fields are
  // additive and the original ids/record fields remain stable.
  var GIS_CORE_METRICS = [
    { id: 'density', field: 'density', label: 'Population density', labelKey: 'metric.population_density', unit: 'people/mi\u00B2', unitKey: 'unit.people_per_square_mile', maximumFractionDigits: 1 },
    { id: 'access', field: 'access', label: 'Broadband access index', labelKey: 'metric.broadband_access', unit: '/100', unitKey: 'unit.per_hundred', maximumFractionDigits: 1 }
  ];

  var GIS_REGION_PACKS = [
    {
      id: 'maine',
      revision: 1,
      label: 'Maine counties (16)',
      labelKey: 'region.maine.label',
      scope: 'Maine',
      defaultZoom: 6,
      view: { center: [45.15, -69.05], zoom: 6, bounds: [[42.9, -71.2], [47.5, -66.8]] },
      defaultMetric: 'density',
      metrics: GIS_CORE_METRICS,
      modules: { missions: ['coast-connectivity', 'service-area', 'ecoregion-boundaries'], officialLayers: ['maine-ecoregions'], remoteScene: 'maine-forest-edge' },
      standardsProfile: 'us-c3-ngss',
      description: 'Sixteen county reference points spanning coastal and inland Maine.',
      sourceNote: 'Illustrative classroom values; county reference points are not population or service-demand surfaces.',
      records: MAINE
    },
    {
      id: 'new-england',
      revision: 1,
      label: 'New England (6-state sample)',
      labelKey: 'region.new_england.label',
      scope: 'New England',
      defaultZoom: 5,
      view: { center: [43.55, -71.35], zoom: 5, bounds: [[40.9, -73.8], [47.6, -66.7]] },
      defaultMetric: 'density',
      metrics: GIS_CORE_METRICS,
      modules: { missions: [], officialLayers: [], remoteScene: null },
      standardsProfile: 'generic',
      description: 'Eight illustrative reference points across all six New England states.',
      sourceNote: 'Illustrative classroom values; points support comparison across states but are not official state estimates.',
      records: NEW_ENGLAND
    },
    {
      id: 'united-states',
      revision: 1,
      label: 'United States (macro-region sample)',
      labelKey: 'region.united_states.label',
      scope: 'United States',
      defaultZoom: 4,
      view: { center: [39.4, -98.2], zoom: 4 },
      defaultMetric: 'density',
      metrics: GIS_CORE_METRICS,
      modules: { missions: [], officialLayers: [], remoteScene: null },
      standardsProfile: 'generic',
      description: 'Eleven illustrative reference points for major U.S. macro-regions, including Alaska and Hawaii.',
      sourceNote: 'Illustrative classroom values; macro-region points are not national statistical estimates.',
      records: US_REGIONS
    },
    {
      id: 'global',
      revision: 1,
      label: 'Global regions (classroom sample)',
      labelKey: 'region.global.label',
      scope: 'Global',
      defaultZoom: 3,
      view: { center: [15, 10], zoom: 2 },
      defaultMetric: 'density',
      metrics: GIS_CORE_METRICS,
      modules: { missions: [], officialLayers: [], remoteScene: null },
      standardsProfile: 'generic',
      description: 'Eleven illustrative reference points spanning major world regions and climate contexts.',
      sourceNote: 'Illustrative classroom values; global points are prompts for comparison, not a complete world dataset.',
      records: GLOBAL_REGIONS
    }
  ];

  function getRegionPack(id) {
    return GIS_REGION_PACKS.filter(function (pack) { return pack.id === id; })[0] || GIS_REGION_PACKS[0];
  }

  function regionMetrics(pack) {
    return pack && Array.isArray(pack.metrics) && pack.metrics.length ? pack.metrics : GIS_CORE_METRICS;
  }

  function regionMetric(pack, id) {
    var metrics = regionMetrics(pack);
    return metrics.filter(function (item) { return item.id === id; })[0] || metrics[0];
  }

  // Online basemaps are described as data so deployments can audit the
  // network domains, attribution, coverage, and privacy implications in one
  // place. Region packs cannot inject providers or arbitrary URLs.
  var GIS_BASEMAP_PROVIDERS = {
    street: {
      id: 'street', label: 'OpenStreetMap Standard',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19,
      domains: ['tile.openstreetmap.org'], requestOrigin: 'https://tile.openstreetmap.org', online: true,
      policy: {
        url: 'https://operations.osmfoundation.org/policies/tiles/', interactiveOnly: true,
        allowsPrefetch: false, allowsOfflineCache: false, allowsSensitiveData: false, revealsViewport: true
      }
    },
    satellite: {
      id: 'satellite', label: 'Esri World Imagery',
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri and source contributors', maxZoom: 18,
      domains: ['services.arcgisonline.com'], requestOrigin: 'https://services.arcgisonline.com', online: true,
      creditsUrl: 'https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9',
      policy: { providerCreditsRequired: true, revealsViewport: true }
    },
    none: {
      id: 'none', label: 'Offline schematic', url: '', attribution: '',
      maxZoom: 18, domains: [], online: false, policy: { revealsViewport: false, allowsNetworkRequests: false }
    }
  };
  Object.keys(GIS_BASEMAP_PROVIDERS).forEach(function (id) {
    var provider = GIS_BASEMAP_PROVIDERS[id];
    if (Array.isArray(provider.domains)) Object.freeze(provider.domains);
    if (provider.policy) Object.freeze(provider.policy);
    Object.freeze(provider);
  });
  Object.freeze(GIS_BASEMAP_PROVIDERS);

  function getGISBasemapProvider(id) {
    return Object.prototype.hasOwnProperty.call(GIS_BASEMAP_PROVIDERS, id) ? GIS_BASEMAP_PROVIDERS[id] : null;
  }

  function createGISBasemapLayer(L, id, onTileError) {
    var provider = getGISBasemapProvider(id);
    if (!provider || !L || typeof L.tileLayer !== 'function' || !provider.url) return null;
    var layer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      attribution: provider.attribution
    });
    if (layer) layer._gisHadTileError = false;
    if (layer && typeof layer.on === 'function' && typeof onTileError === 'function') {
      var errorReported = false;
      var errorHandler = function (event) {
        if (errorReported) return;
        errorReported = true;
        layer._gisHadTileError = true;
        onTileError(event, layer);
      };
      layer._gisTileErrorHandler = errorHandler;
      layer.on('tileerror', errorHandler);
    }
    return layer;
  }

  function detachGISBasemapLayer(layer) {
    if (!layer) return;
    if (layer._gisTileErrorHandler && typeof layer.off === 'function') {
      layer.off('tileerror', layer._gisTileErrorHandler);
    }
    layer._gisTileErrorHandler = null;
  }

  var GIS_RTL_LANGUAGE = /^(ar|arc|ckb|dv|fa|he|ku-arab|nqo|ps|sd|ug|ur|yi)(-|$)/i;

  function canonicalGISLocale(value) {
    var candidate = String(value || '').trim().replace(/_/g, '-');
    if (!candidate) return '';
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.getCanonicalLocales === 'function') {
        return Intl.getCanonicalLocales(candidate)[0] || '';
      }
      new Intl.NumberFormat(candidate);
      return candidate;
    } catch (error) {
      return '';
    }
  }

  function resolveGISLocale(input) {
    var options = typeof input === 'string' ? { locale: input } : (input || {});
    var friendlyName = String(options.language || options.uiLanguage || '').trim();
    var candidate = options.locale || options.lang || '';
    try {
      if (!candidate && friendlyName && typeof window !== 'undefined' && window.AlloFlowLang && typeof window.AlloFlowLang.bcp47Full === 'function') {
        candidate = window.AlloFlowLang.bcp47Full(friendlyName);
      }
      if (!candidate && typeof window !== 'undefined' && window.AlloFlowLang && typeof window.AlloFlowLang.bcp47Full === 'function' && window.__alloTextLanguage) {
        candidate = window.AlloFlowLang.bcp47Full(window.__alloTextLanguage);
      }
    } catch (ignoreLanguageHelper) {}
    if (!candidate && typeof document !== 'undefined' && document.documentElement) candidate = document.documentElement.lang;
    if (!candidate && typeof navigator !== 'undefined') candidate = navigator.language;
    var locale = canonicalGISLocale(candidate) || 'en-US';
    var requestedDirection = String(options.dir || options.direction || '').toLowerCase();
    var documentDirection = '';
    try { documentDirection = document.documentElement && document.documentElement.dir || ''; } catch (ignoreDocumentDirection) {}
    var dir = requestedDirection === 'rtl' || requestedDirection === 'ltr'
      ? requestedDirection
      : GIS_RTL_LANGUAGE.test(locale) ? 'rtl' : (documentDirection === 'rtl' ? 'rtl' : 'ltr');
    return { locale: locale, lang: locale, language: friendlyName || locale, dir: dir };
  }

  function gisNumberOptions(value, defaults) {
    if (typeof value === 'number') return { minimumFractionDigits: value, maximumFractionDigits: value };
    return Object.assign({}, defaults || {}, value && typeof value === 'object' ? value : {});
  }

  function createGISFormatters(input) {
    var localeInfo = resolveGISLocale(input);
    function formatNumber(value, options) {
      var number = Number(value);
      if (!Number.isFinite(number)) return '\u2014';
      var resolvedOptions = gisNumberOptions(options, { maximumFractionDigits: 2 });
      try { return new Intl.NumberFormat(localeInfo.locale, resolvedOptions).format(number); }
      catch (error) { return number.toFixed(resolvedOptions.maximumFractionDigits == null ? 2 : resolvedOptions.maximumFractionDigits); }
    }
    function formatPercent(value, digits) {
      var number = Number(value);
      if (!Number.isFinite(number)) return '\u2014';
      var fractionDigits = Number.isFinite(Number(digits)) ? Math.max(0, Math.min(6, Number(digits))) : 1;
      try { return new Intl.NumberFormat(localeInfo.locale, { style: 'percent', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(number / 100); }
      catch (error) { return number.toFixed(fractionDigits) + '%'; }
    }
    function formatDateTime(value, options) {
      var date = value instanceof Date ? value : new Date(value);
      if (!date || !Number.isFinite(date.getTime())) return '';
      var resolvedOptions = options && typeof options === 'object' ? options : { dateStyle: 'medium', timeStyle: 'short' };
      try { return new Intl.DateTimeFormat(localeInfo.locale, resolvedOptions).format(date); }
      catch (error) { return date.toLocaleString(); }
    }
    function formatCoordinate(value, digits, axis) {
      var number = Number(value);
      if (!Number.isFinite(number)) return '\u2014';
      var fractionDigits = Number.isFinite(Number(digits)) ? Math.max(0, Math.min(8, Number(digits))) : 4;
      var suffix = '';
      if (axis === 'lat') suffix = number < 0 ? ' S' : ' N';
      if (axis === 'lon') suffix = number < 0 ? ' W' : ' E';
      var shown = suffix ? Math.abs(number) : number;
      return formatNumber(shown, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits, useGrouping: false }) + '\u00B0' + suffix;
    }
    function formatDistance(kilometres, system, digits) {
      var useImperial = system === 'imperial' || system === 'us';
      var value = useImperial ? Number(kilometres) * 0.621371 : Number(kilometres);
      return formatNumber(value, Number.isFinite(Number(digits)) ? Number(digits) : 2) + (useImperial ? ' mi' : ' km');
    }
    function formatArea(squareKilometres, system, digits) {
      var useImperial = system === 'imperial' || system === 'us';
      var value = useImperial ? Number(squareKilometres) * 0.386102 : Number(squareKilometres);
      return formatNumber(value, Number.isFinite(Number(digits)) ? Number(digits) : 2) + (useImperial ? ' mi\u00B2' : ' km\u00B2');
    }
    return {
      locale: localeInfo.locale, lang: localeInfo.lang, dir: localeInfo.dir,
      number: formatNumber, percent: formatPercent, dateTime: formatDateTime, coordinate: formatCoordinate,
      distance: formatDistance, area: formatArea
    };
  }

  function reportLocaleAttributes(model, override) {
    var options = override || (model && model.localeOptions) || (model && { locale: model.locale, lang: model.lang, dir: model.dir }) || {};
    var info = resolveGISLocale(options);
    return ' lang="' + escapeHTML(info.lang) + '" dir="' + (info.dir === 'rtl' ? 'rtl' : 'ltr') + '"';
  }

  var EXAMPLE = [
    'name,latitude,longitude,value',
    'School garden,43.66,-70.26,82',
    'River monitor,44.31,-69.78,64',
    'Forest plot,45.18,-69.23,38',
    'Coastal station,44.54,-68.42,91'
  ].join('\n');

  var EXAMPLE_GEOJSON = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'Northern forest', index: 28 }, geometry: { type: 'Polygon', coordinates: [[[-70.0, 45.2], [-67.7, 45.2], [-67.7, 47.0], [-70.0, 47.0], [-70.0, 45.2]]] } },
      { type: 'Feature', properties: { name: 'Western mountains', index: 46 }, geometry: { type: 'Polygon', coordinates: [[[-71.2, 44.0], [-69.8, 44.0], [-69.8, 45.4], [-71.2, 45.4], [-71.2, 44.0]]] } },
      { type: 'Feature', properties: { name: 'Central corridor', index: 67 }, geometry: { type: 'Polygon', coordinates: [[[-69.9, 43.9], [-68.5, 43.9], [-68.5, 45.3], [-69.9, 45.3], [-69.9, 43.9]]] } },
      { type: 'Feature', properties: { name: 'Coastal belt', index: 88 }, geometry: { type: 'Polygon', coordinates: [[[-70.9, 43.0], [-67.0, 43.0], [-67.0, 44.15], [-70.9, 44.15], [-70.9, 43.0]]] } }
    ]
  }, null, 2);

  function countGISDelimiter(line, delimiter) {
    var quoted = false, count = 0;
    for (var i = 0; i < line.length; i += 1) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && line[i] === delimiter) count += 1;
    }
    return count;
  }

  function detectGISDelimiter(text) {
    var source = String(text || '').replace(/^\uFEFF/, '');
    var header = source.split(/\r?\n/).filter(function (line) { return line.trim(); })[0] || '';
    var candidates = [',', ';', '\t', '|'];
    var best = ',', bestCount = -1;
    candidates.forEach(function (candidate) {
      var count = countGISDelimiter(header, candidate);
      if (count > bestCount) { best = candidate; bestCount = count; }
    });
    return bestCount > 0 ? best : ',';
  }

  function parseGISDelimitedRows(text, options) {
    options = options || {};
    var source = String(text || '').replace(/^\uFEFF/, '');
    var delimiter = options.delimiter && options.delimiter !== 'auto' ? String(options.delimiter) : detectGISDelimiter(source);
    if (delimiter === '\\t') delimiter = '\t';
    if ([',', ';', '\t', '|'].indexOf(delimiter) < 0) throw new Error('Choose a supported delimiter: comma, semicolon, tab, or pipe.');
    var rows = [], row = [], field = '', quoted = false, i;
    for (i = 0; i < source.length; i += 1) {
      var character = source[i];
      if (character === '"') {
        if (quoted && source[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = !quoted;
      } else if (character === delimiter && !quoted) {
        row.push(field.trim()); field = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && source[i + 1] === '\n') i += 1;
        row.push(field.trim()); field = '';
        if (row.some(function (cell) { return cell !== ''; })) rows.push(row);
        row = [];
      } else field += character;
    }
    row.push(field.trim());
    if (row.some(function (cell) { return cell !== ''; })) rows.push(row);
    return { rows: rows, delimiter: delimiter };
  }

  function normalizeGISHeader(value) {
    var result = String(value == null ? '' : value).trim();
    try { result = result.normalize('NFKD'); } catch (ignoreNormalization) {}
    return result.toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[\s_\-./]+/g, '');
  }

  function normalizeGISDigits(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0660-\u0669]/g, function (digit) { return String(digit.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (digit) { return String(digit.charCodeAt(0) - 0x06F0); });
  }

  function detectGISDecimalSeparator(rows, delimiter, options) {
    var explicit = options && (options.decimalSeparator || options.decimal);
    if (explicit === ',' || explicit === '.') return explicit;
    if (delimiter === ';') {
      var samples = (rows || []).slice(1, 8).reduce(function (all, row) { return all.concat(row); }, []);
      if (samples.some(function (cell) { return /^[+\-\u2212]?\d+,\d+$/.test(String(cell).trim()); })) return ',';
    }
    return '.';
  }

  function gisImportParseOptions(convention) {
    if (convention === 'comma-dot') return { delimiter: ',', decimalSeparator: '.' };
    if (convention === 'comma-comma') return { delimiter: ',', decimalSeparator: ',' };
    if (convention === 'semicolon-comma') return { delimiter: ';', decimalSeparator: ',' };
    if (convention === 'tab-dot') return { delimiter: '\t', decimalSeparator: '.' };
    if (convention === 'tab-comma') return { delimiter: '\t', decimalSeparator: ',' };
    if (convention === 'pipe-dot') return { delimiter: '|', decimalSeparator: '.' };
    if (convention === 'pipe-comma') return { delimiter: '|', decimalSeparator: ',' };
    return {};
  }

  function parseGISNumber(value, options) {
    options = options || {};
    var decimalSeparator = options.decimalSeparator || options.decimal || '.';
    var text = normalizeGISDigits(value).trim()
      .replace(/[\u00A0\u202F\s]/g, '')
      .replace(/\u2212/g, '-')
      .replace(/\u066B/g, '.')
      .replace(/\u066C/g, '');
    if (!text) return NaN;
    if (decimalSeparator === ',') text = text.replace(/\./g, '').replace(',', '.');
    else if (/^[+\-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
    var number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }
  function parseGISAngle(value, axis, options) {
    options = options || {};
    var source = normalizeGISDigits(value).trim()
      .replace(/\u2212/g, '-')
      .replace(/[\u00BA\u02DA]/g, '\u00B0')
      .replace(/[\u2032\u2019]/g, "'")
      .replace(/[\u2033\u201D]/g, '"');
    if (!source) return NaN;
    var hemisphereMatch = source.match(/[NSEW]/i);
    var hemisphere = hemisphereMatch ? hemisphereMatch[0].toUpperCase() : '';
    if (axis === 'lat' && (hemisphere === 'E' || hemisphere === 'W')) return NaN;
    if (axis === 'lon' && (hemisphere === 'N' || hemisphere === 'S')) return NaN;
    var tokenStrings = source.match(/[+\-]?\d+(?:[.,]\d+)?/g) || [];
    var hasDMSMarkers = /[\u00B0'"]/.test(source) || !!hemisphere || tokenStrings.length > 1;
    if (!hasDMSMarkers) return parseGISNumber(source, options);
    if (!tokenStrings.length || tokenStrings.length > 3) return NaN;
    var values = tokenStrings.map(function (token) { return parseGISNumber(token, options); });
    if (values.some(function (number) { return !Number.isFinite(number); })) return NaN;
    var degrees = values[0], minutes = Math.abs(values[1] || 0), seconds = Math.abs(values[2] || 0);
    if (minutes >= 60 || seconds >= 60) return NaN;
    var numericSign = degrees < 0 ? -1 : 1;
    var hemisphereSign = hemisphere === 'S' || hemisphere === 'W' ? -1 : hemisphere ? 1 : numericSign;
    if (hemisphere && degrees < 0 && hemisphereSign > 0) return NaN;
    return hemisphereSign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
  }

  function normalizeGISCRS(value, options) {
    options = options || {};
    var compact = String(value || 'EPSG:4326').trim().toUpperCase().replace(/\s+/g, '');
    if (compact === '4326' || compact === 'EPSG:4326' || compact === 'WGS84' || compact === 'WGS-84') {
      return { id: 'EPSG:4326', kind: 'geographic' };
    }
    if (compact === '3857' || compact === 'EPSG:3857' || compact === 'WEBMERCATOR' || compact === 'WEB-MERCATOR') {
      return { id: 'EPSG:3857', kind: 'web-mercator' };
    }
    var epsgUTM = /^EPSG:(326|327)(\d{2})$/.exec(compact);
    var zone = Number(options.utmZone || options.zone);
    var hemisphere = String(options.utmHemisphere || options.hemisphere || 'N').toUpperCase();
    if (epsgUTM) {
      zone = Number(epsgUTM[2]);
      hemisphere = epsgUTM[1] === '327' ? 'S' : 'N';
    } else if (compact !== 'UTM' && compact !== 'WGS84/UTM' && compact !== 'WGS84UTM') {
      throw new Error('Unsupported coordinate reference system. Choose WGS84, Web Mercator, or WGS84 UTM.');
    }
    if (!Number.isInteger(zone) || zone < 1 || zone > 60) throw new Error('UTM zone must be a whole number from 1 to 60.');
    if (hemisphere !== 'N' && hemisphere !== 'S') throw new Error('Choose the northern or southern UTM hemisphere.');
    return { id: 'EPSG:' + (hemisphere === 'S' ? '327' : '326') + String(zone).padStart(2, '0'), kind: 'utm', zone: zone, hemisphere: hemisphere };
  }

  function inverseGISWebMercator(x, y) {
    var extent = 20037508.342789244;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > extent * 1.001 || Math.abs(y) > extent * 1.001) {
      throw new Error('Web Mercator coordinates must fall within the EPSG:3857 world extent.');
    }
    var longitude = x / extent * 180;
    var latitude = (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * 180 / Math.PI;
    return { lat: latitude, lon: normalizeLongitude(longitude) };
  }

  function inverseGISUTM(easting, northing, zone, hemisphere) {
    if (!Number.isFinite(easting) || !Number.isFinite(northing) || easting < 100000 || easting > 1000000 || northing < 0 || northing > 10000000) {
      throw new Error('UTM easting or northing is outside the supported WGS84 range.');
    }
    var a = 6378137;
    var eccentricitySquared = 0.00669438;
    var eccentricityPrimeSquared = eccentricitySquared / (1 - eccentricitySquared);
    var k0 = 0.9996;
    var x = easting - 500000;
    var y = hemisphere === 'S' ? northing - 10000000 : northing;
    var longitudeOrigin = (zone - 1) * 6 - 180 + 3;
    var meridionalArc = y / k0;
    var mu = meridionalArc / (a * (1 - eccentricitySquared / 4 - 3 * Math.pow(eccentricitySquared, 2) / 64 - 5 * Math.pow(eccentricitySquared, 3) / 256));
    var e1 = (1 - Math.sqrt(1 - eccentricitySquared)) / (1 + Math.sqrt(1 - eccentricitySquared));
    var phi1 = mu +
      (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
      (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
      (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
      (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
    var sinPhi1 = Math.sin(phi1), cosPhi1 = Math.cos(phi1), tanPhi1 = Math.tan(phi1);
    var n1 = a / Math.sqrt(1 - eccentricitySquared * sinPhi1 * sinPhi1);
    var r1 = a * (1 - eccentricitySquared) / Math.pow(1 - eccentricitySquared * sinPhi1 * sinPhi1, 1.5);
    var t1 = tanPhi1 * tanPhi1;
    var c1 = eccentricityPrimeSquared * cosPhi1 * cosPhi1;
    var d = x / (n1 * k0);
    var latitude = phi1 - (n1 * tanPhi1 / r1) *
      (d * d / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * eccentricityPrimeSquared) * Math.pow(d, 4) / 24 +
      (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * eccentricityPrimeSquared - 3 * c1 * c1) * Math.pow(d, 6) / 720);
    var longitude = (d - (1 + 2 * t1 + c1) * Math.pow(d, 3) / 6 +
      (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * eccentricityPrimeSquared + 24 * t1 * t1) * Math.pow(d, 5) / 120) / cosPhi1;
    latitude = latitude * 180 / Math.PI;
    longitude = longitudeOrigin + longitude * 180 / Math.PI;
    if (!Number.isFinite(latitude) || latitude < -80.5 || latitude > 84.5 || !Number.isFinite(longitude)) {
      throw new Error('The UTM coordinate does not resolve to a valid WGS84 location.');
    }
    return { lat: latitude, lon: normalizeLongitude(longitude) };
  }

  function transformGISCoordinatePair(first, second, options) {
    options = options || {};
    var crs = normalizeGISCRS(options.crs || 'EPSG:4326', options);
    var axisOrder = String(options.axisOrder || (crs.kind === 'geographic' ? 'lat-lon' : 'x-y')).toLowerCase();
    if (crs.kind === 'geographic') {
      var latitudeRaw = axisOrder === 'lon-lat' ? second : first;
      var longitudeRaw = axisOrder === 'lon-lat' ? first : second;
      var latitude = parseGISAngle(latitudeRaw, 'lat', options);
      var longitude = parseGISAngle(longitudeRaw, 'lon', options);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('WGS84 latitude must be -90 to 90 and longitude must be -180 to 180.');
      }
      return { lat: latitude, lon: longitude };
    }
    var xRaw = axisOrder === 'y-x' ? second : first;
    var yRaw = axisOrder === 'y-x' ? first : second;
    var x = parseGISNumber(xRaw, options), y = parseGISNumber(yRaw, options);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Projected coordinates must be numeric.');
    if (crs.kind === 'web-mercator') return inverseGISWebMercator(x, y);
    return inverseGISUTM(x, y, crs.zone, crs.hemisphere);
  }

  function suggestGISImportColumns(headers, options, allowFallback) {
    options = options || {};
    var columns = options.columns || {};
    var crs = normalizeGISCRS(options.crs || 'EPSG:4326', options);
    var nameIndex = findGISColumn(headers, ['name', 'label', 'place', 'location', 'nom', 'nombre', 'nome', 'ort', 'naam'], columns.name);
    var valueIndex = findGISColumn(headers, ['value', 'amount', 'score', 'count', 'reading', 'measurement', 'valeur', 'valor', 'wert', 'waarde'], columns.value);
    var axisOrder = String(options.axisOrder || (crs.kind === 'geographic' ? 'lat-lon' : 'x-y')).toLowerCase();
    var coordinate1Index = findGISColumn(headers, [], columns.coordinate1);
    var coordinate2Index = findGISColumn(headers, [], columns.coordinate2);
    if (coordinate1Index < 0 || coordinate2Index < 0) {
      if (crs.kind === 'geographic') {
        var latitudeIndex = findGISColumn(headers, ['latitude', 'lat', 'latitud', 'breitengrad', '\u7EAC\u5EA6', '\u7DEF\u5EA6', '\u062E\u0637 \u0627\u0644\u0639\u0631\u0636', '\u0448\u0438\u0440\u043E\u0442\u0430'], columns.latitude == null ? columns.lat : columns.latitude);
        var longitudeIndex = findGISColumn(headers, ['longitude', 'lon', 'lng', 'long', 'longitud', 'lengtegraad', 'l\u00E4ngengrad', '\u7ECF\u5EA6', '\u7D4C\u5EA6', '\u062E\u0637 \u0627\u0644\u0637\u0648\u0644', '\u0434\u043E\u043B\u0433\u043E\u0442\u0430'], columns.longitude == null ? columns.lon : columns.longitude);
        coordinate1Index = axisOrder === 'lon-lat' ? longitudeIndex : latitudeIndex;
        coordinate2Index = axisOrder === 'lon-lat' ? latitudeIndex : longitudeIndex;
      } else {
        var xIndex = findGISColumn(headers, ['x', 'easting', 'east', 'webmercatorx'], columns.x == null ? columns.easting : columns.x);
        var yIndex = findGISColumn(headers, ['y', 'northing', 'north', 'webmercatory'], columns.y == null ? columns.northing : columns.y);
        coordinate1Index = axisOrder === 'y-x' ? yIndex : xIndex;
        coordinate2Index = axisOrder === 'y-x' ? xIndex : yIndex;
      }
    }
    var usedFallback = false;
    if (allowFallback) {
      var used = {};
      [nameIndex, valueIndex, coordinate1Index, coordinate2Index].forEach(function (index) { if (index >= 0) used[index] = true; });
      if (nameIndex < 0 && headers.length) { nameIndex = 0; used[0] = true; usedFallback = true; }
      if (valueIndex < 0) {
        for (var valueCandidate = headers.length - 1; valueCandidate >= 0; valueCandidate -= 1) {
          if (!used[valueCandidate]) { valueIndex = valueCandidate; used[valueCandidate] = true; usedFallback = true; break; }
        }
      }
      if (coordinate1Index < 0) {
        for (var firstCandidate = 0; firstCandidate < headers.length; firstCandidate += 1) {
          if (!used[firstCandidate]) { coordinate1Index = firstCandidate; used[firstCandidate] = true; usedFallback = true; break; }
        }
      }
      if (coordinate2Index < 0) {
        for (var secondCandidate = 0; secondCandidate < headers.length; secondCandidate += 1) {
          if (!used[secondCandidate]) { coordinate2Index = secondCandidate; used[secondCandidate] = true; usedFallback = true; break; }
        }
      }
    }
    return {
      name: nameIndex, coordinate1: coordinate1Index, coordinate2: coordinate2Index, value: valueIndex,
      axisOrder: axisOrder, crs: crs.id, usedFallback: usedFallback
    };
  }

  function inspectGISCSV(text, options) {
    options = options || {};
    var table = parseGISDelimitedRows(text, options), rows = table.rows;
    if (!rows.length) throw new Error('Add a CSV header row before previewing columns.');
    var headers = rows[0].map(function (value) { return String(value || '').trim(); });
    if (headers.length < 3) throw new Error('The CSV needs at least three columns for coordinates and a value.');
    var decimalSeparator = detectGISDecimalSeparator(rows, table.delimiter, options);
    var mapping = suggestGISImportColumns(headers, options, true);
    return {
      headers: headers,
      sampleRows: rows.slice(1, 6),
      totalRows: Math.max(0, rows.length - 1),
      delimiter: table.delimiter,
      decimalSeparator: decimalSeparator,
      suggestedColumns: mapping,
      crs: mapping.crs,
      axisOrder: mapping.axisOrder
    };
  }

  function findGISColumn(headers, aliases, explicit) {
    if (Number.isInteger(explicit) && explicit >= 0 && explicit < headers.length) return explicit;
    var normalized = headers.map(normalizeGISHeader);
    if (typeof explicit === 'string' && explicit.trim()) {
      var exact = headers.indexOf(explicit);
      if (exact >= 0) return exact;
      var normalizedExplicit = normalized.indexOf(normalizeGISHeader(explicit));
      if (normalizedExplicit >= 0) return normalizedExplicit;
    }
    var result = -1;
    aliases.some(function (alias) { result = normalized.indexOf(normalizeGISHeader(alias)); return result >= 0; });
    return result;
  }

  function parseCSV(text, options) {
    options = options || {};
    var table = parseGISDelimitedRows(text, options), rows = table.rows;
    if (rows.length < 2) throw new Error('Add a header and at least one data row. Check the selected delimiter.');
    var headers = rows[0].map(function (value) { return String(value || '').trim(); });
    var crs = normalizeGISCRS(options.crs || 'EPSG:4326', options);
    var mapping = suggestGISImportColumns(headers, Object.assign({}, options, { crs: crs.id }), false);
    if (mapping.coordinate1 < 0 || mapping.coordinate2 < 0 || mapping.value < 0) {
      throw new Error('Choose the two coordinate columns and numeric value column in the import preview.');
    }
    var decimalSeparator = detectGISDecimalSeparator(rows, table.delimiter, options);
    var transformOptions = Object.assign({}, options, {
      crs: crs.id,
      axisOrder: mapping.axisOrder,
      decimalSeparator: decimalSeparator
    });
    var rejectedRows = [];
    var parsed = rows.slice(1).map(function (cells, index) {
      var first = cells[mapping.coordinate1] == null ? '' : cells[mapping.coordinate1];
      var second = cells[mapping.coordinate2] == null ? '' : cells[mapping.coordinate2];
      var raw = {
        row: index + 2,
        name: mapping.name >= 0 && cells[mapping.name] ? cells[mapping.name] : 'Location ' + (index + 1),
        coordinate1: first,
        coordinate2: second,
        latitude: mapping.axisOrder === 'lon-lat' || mapping.axisOrder === 'x-y' ? second : first,
        longitude: mapping.axisOrder === 'lon-lat' || mapping.axisOrder === 'x-y' ? first : second,
        value: cells[mapping.value] == null ? '' : cells[mapping.value],
        crs: crs.id
      };
      var coordinate = { lat: NaN, lon: NaN };
      try {
        coordinate = transformGISCoordinatePair(first, second, transformOptions);
      } catch (coordinateError) {
        raw.reason = coordinateError.message;
      }
      return {
        raw: raw,
        record: {
          name: raw.name,
          lat: coordinate.lat,
          lon: coordinate.lon,
          value: parseGISNumber(raw.value, { decimalSeparator: decimalSeparator }),
          coastal: false
        }
      };
    }).filter(function (item) {
      var record = item.record, raw = item.raw;
      var valid = String(raw.coordinate1).trim() !== '' && String(raw.coordinate2).trim() !== '' && String(raw.value).trim() !== '' &&
        Number.isFinite(record.lat) && record.lat >= -90 && record.lat <= 90 &&
        Number.isFinite(record.lon) && record.lon >= -180 && record.lon <= 180 && Number.isFinite(record.value);
      if (!valid && rejectedRows.length < 50) {
        if (!raw.reason) raw.reason = 'A coordinate or value is missing, invalid, or outside the selected CRS range.';
        rejectedRows.push(raw);
      }
      return valid;
    }).map(function (item) { return item.record; });
    if (!parsed.length) throw new Error('No valid rows were found. Review the column mapping, coordinate reference system, axis order, and number convention.');
    var limited = parsed.slice(0, 250);
    limited.invalidRows = Math.max(0, rows.length - 1 - parsed.length);
    limited.truncatedRows = Math.max(0, parsed.length - limited.length);
    limited.invalidSamples = rejectedRows;
    limited.delimiter = table.delimiter;
    limited.decimalSeparator = decimalSeparator;
    limited.headers = headers;
    limited.crs = crs.id;
    limited.axisOrder = mapping.axisOrder;
    limited.columnMap = {
      name: mapping.name, coordinate1: mapping.coordinate1, coordinate2: mapping.coordinate2, value: mapping.value,
      latitude: mapping.axisOrder === 'lon-lat' || mapping.axisOrder === 'x-y' ? mapping.coordinate2 : mapping.coordinate1,
      longitude: mapping.axisOrder === 'lon-lat' || mapping.axisOrder === 'x-y' ? mapping.coordinate1 : mapping.coordinate2
    };
    return limited;
  }

  function parseLegacyCSV(text) {
    var rows = [], row = [], field = '', quoted = false, i;
    text = String(text || '');
    for (i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        row.push(field.trim()); field = '';
      } else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field.trim()); field = '';
        if (row.some(function (cell) { return cell; })) rows.push(row);
        row = [];
      } else field += ch;
    }
    row.push(field.trim());
    if (row.some(function (cell) { return cell; })) rows.push(row);
    if (rows.length < 2) throw new Error('Add a header and at least one data row.');
    var heads = rows[0].map(function (v) { return v.toLowerCase().replace(/\s+/g, ''); });
    function col(names) {
      var result = -1;
      names.some(function (name) { result = heads.indexOf(name); return result >= 0; });
      return result;
    }
    var n = col(['name', 'label', 'place', 'location']);
    var y = col(['latitude', 'lat']);
    var x = col(['longitude', 'lon', 'lng', 'long']);
    var v = col(['value', 'amount', 'score', 'count']);
    if (y < 0 || x < 0 || v < 0) throw new Error('Headers must include latitude, longitude, and value.');
    var rejectedRows = [];
    var parsed = rows.slice(1).map(function (cells, index) {
      var raw = {
        row: index + 2,
        name: n >= 0 && cells[n] ? cells[n] : 'Location ' + (index + 1),
        latitude: y >= 0 ? cells[y] : '', longitude: x >= 0 ? cells[x] : '', value: v >= 0 ? cells[v] : ''
      };
      return {
        raw: raw,
        record: { name: raw.name, lat: Number(raw.latitude), lon: Number(raw.longitude), value: Number(raw.value), coastal: false }
      };
    }).filter(function (item) {
      var record = item.record, raw = item.raw;
      var valid = String(raw.latitude).trim() !== '' && String(raw.longitude).trim() !== '' && String(raw.value).trim() !== '' &&
        Number.isFinite(record.lat) && record.lat >= -90 && record.lat <= 90 &&
        Number.isFinite(record.lon) && record.lon >= -180 && record.lon <= 180 && Number.isFinite(record.value);
      if (!valid && rejectedRows.length < 50) rejectedRows.push(raw);
      return valid;
    }).map(function (item) { return item.record; });
    if (!parsed.length) throw new Error('No valid rows were found. Check coordinates and values.');
    var limited = parsed.slice(0, 250);
    limited.invalidRows = Math.max(0, rows.length - 1 - parsed.length);
    limited.truncatedRows = Math.max(0, parsed.length - limited.length);
    limited.invalidSamples = rejectedRows;
    return limited;
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function rowsToCSV(rows) {
    return (rows || []).map(function (row) { return (row || []).map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  function safeFileStem(value, fallback) {
    return String(value || fallback || 'gis-studio').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback || 'gis-studio';
  }

  function validWGS84Position(position) {
    if (!Array.isArray(position) || position.length < 2) return false;
    if (typeof position[0] !== 'number' || typeof position[1] !== 'number') return false;
    if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) return false;
    if (position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) return false;
    return position.slice(2).every(function (coordinate) { return typeof coordinate === 'number' && Number.isFinite(coordinate); });
  }

  function sameWGS84Position(first, last) {
    return Array.isArray(first) && Array.isArray(last) && first.length >= 2 && last.length >= 2 &&
      first[0] === last[0] && first[1] === last[1];
  }

  function validateWGS84Geometry(geometry) {
    if (!geometry || typeof geometry !== 'object') throw new Error('Every GeoJSON feature needs a supported WGS84 geometry.');
    var coordinates = geometry.coordinates;
    function requirePositions(values, minimum, label) {
      if (!Array.isArray(values) || values.length < minimum || !values.every(validWGS84Position)) {
        throw new Error(label + ' coordinates must be finite WGS84 longitude-latitude numbers in range.');
      }
    }
    function requireRing(ring) {
      requirePositions(ring, 4, 'Polygon ring');
      if (!sameWGS84Position(ring[0], ring[ring.length - 1])) throw new Error('Polygon ring coordinates must close at the same WGS84 position.');
    }
    if (geometry.type === 'Point') {
      if (!validWGS84Position(coordinates)) throw new Error('Point coordinates must be numeric WGS84 longitude-latitude values in range.');
      return;
    }
    if (geometry.type === 'MultiPoint') { requirePositions(coordinates, 1, 'MultiPoint'); return; }
    if (geometry.type === 'LineString') { requirePositions(coordinates, 2, 'LineString'); return; }
    if (geometry.type === 'MultiLineString') {
      if (!Array.isArray(coordinates) || !coordinates.length) throw new Error('MultiLineString coordinates are required.');
      coordinates.forEach(function (line) { requirePositions(line, 2, 'MultiLineString'); });
      return;
    }
    if (geometry.type === 'Polygon') {
      if (!Array.isArray(coordinates) || !coordinates.length) throw new Error('Polygon coordinates are required.');
      coordinates.forEach(requireRing);
      return;
    }
    if (geometry.type === 'MultiPolygon') {
      if (!Array.isArray(coordinates) || !coordinates.length) throw new Error('MultiPolygon coordinates are required.');
      coordinates.forEach(function (polygon) {
        if (!Array.isArray(polygon) || !polygon.length) throw new Error('Every MultiPolygon member needs a polygon ring.');
        polygon.forEach(requireRing);
      });
      return;
    }
    throw new Error('Unsupported GeoJSON geometry type: ' + String(geometry.type || 'missing') + '.');
  }

  function parseGeoJSON(text) {
    var data;
    try { data = JSON.parse(String(text || '')); }
    catch (error) { throw new Error('GeoJSON is not valid JSON. Check commas, quotes, and brackets.'); }
    if (data && data.crs) {
      throw new Error('Legacy or projected GeoJSON CRS declarations are not supported. Reproject the layer to RFC 7946 WGS84 longitude-latitude coordinates first.');
    }
    if (data.type === 'Feature') data = { type: 'FeatureCollection', features: [data] };
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Use a GeoJSON FeatureCollection or Feature.');
    }
    var allowed = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
    data.features = data.features.slice(0, 500);
    data.features.forEach(function (feature, index) {
      if (!feature || feature.type !== 'Feature' || !feature.geometry || allowed.indexOf(feature.geometry.type) < 0) {
        throw new Error('GeoJSON feature ' + (index + 1) + ' needs a supported geometry.');
      }
      validateWGS84Geometry(feature.geometry);
    });
    if (!data.features.length) throw new Error('No supported GeoJSON features were found.');
    var numeric = {};
    data.features.forEach(function (feature) {
      Object.keys(feature.properties || {}).forEach(function (key) {
        var raw = feature.properties[key];
        if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) numeric[key] = true;
      });
    });
    var numericKeys = Object.keys(numeric).sort(function (a, b) {
      var aSystem = /^(objectid|fid|shape__)/i.test(a) ? 1 : 0;
      var bSystem = /^(objectid|fid|shape__)/i.test(b) ? 1 : 0;
      return aSystem - bSystem;
    });
    if (!numericKeys.length) throw new Error('Add at least one numeric property to create a thematic layer.');
    var nameKeys = ['name', 'Name', 'label', 'title', 'MNRCP_name', 'MNAP_name'];
    var nameKey = nameKeys.filter(function (key) {
      return data.features.some(function (feature) { return feature.properties && feature.properties[key] != null; });
    })[0] || null;
    return { data: data, numericKeys: numericKeys, nameKey: nameKey };
  }

  function gisXMLLocalName(node) {
    return String(node && (node.localName || node.nodeName) || '').split(':').pop().toLowerCase();
  }

  function gisXMLChildren(node, name) {
    var wanted = String(name || '').toLowerCase(), result = [];
    if (!node || !node.childNodes) return result;
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child && child.nodeType === 1 && gisXMLLocalName(child) === wanted) result.push(child);
    });
    return result;
  }

  function gisXMLDescendants(node, name) {
    var wanted = String(name || '').toLowerCase(), result = [];
    if (!node || !node.getElementsByTagName) return result;
    Array.prototype.forEach.call(node.getElementsByTagName('*'), function (child) {
      if (gisXMLLocalName(child) === wanted) result.push(child);
    });
    return result;
  }

  function gisXMLText(node) {
    return String(node && (node.textContent != null ? node.textContent : node.nodeValue) || '').trim();
  }

  function parseGISXMLDocument(text, label) {
    var Parser = typeof window !== 'undefined' && window.DOMParser ? window.DOMParser : (typeof DOMParser !== 'undefined' ? DOMParser : null);
    if (!Parser) throw new Error(label + ' import is unavailable in this browser.');
    var documentNode = new Parser().parseFromString(String(text || ''), 'application/xml');
    if (!documentNode || !documentNode.documentElement || gisXMLLocalName(documentNode.documentElement) === 'parsererror' || gisXMLDescendants(documentNode, 'parsererror').length) {
      throw new Error(label + ' is not valid XML. Check the file encoding and structure.');
    }
    return documentNode;
  }

  function parseGISCoordinates(text, label) {
    var values = String(text || '').trim().split(/\s+/).filter(Boolean).map(function (token) {
      var parts = token.split(',').map(function (part) { return Number(String(part).trim()); });
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) throw new Error(label + ' contains a non-numeric coordinate.');
      var position = [parts[0], parts[1]];
      if (parts.length > 2 && Number.isFinite(parts[2])) position.push(parts[2]);
      if (!validWGS84Position(position)) throw new Error(label + ' contains a coordinate outside WGS84 longitude-latitude bounds.');
      return position;
    });
    if (!values.length) throw new Error(label + ' has no coordinates.');
    return values;
  }

  function kmlProperties(placemark) {
    var properties = {}, nameNode = gisXMLDescendants(placemark, 'name')[0];
    if (nameNode) properties.name = gisXMLText(nameNode);
    gisXMLDescendants(placemark, 'data').forEach(function (dataNode) {
      var key = dataNode.getAttribute && dataNode.getAttribute('name');
      var valueNode = gisXMLChildren(dataNode, 'value')[0];
      if (key && valueNode) properties[key] = gisXMLText(valueNode);
    });
    gisXMLDescendants(placemark, 'simpledata').forEach(function (dataNode) {
      var key = dataNode.getAttribute && dataNode.getAttribute('name');
      if (key) properties[key] = gisXMLText(dataNode);
    });
    var numericKey = Object.keys(properties).filter(function (key) { return key !== 'name' && properties[key] !== '' && Number.isFinite(Number(properties[key])); })[0];
    properties.value = numericKey ? Number(properties[numericKey]) : 1;
    return properties;
  }

  function kmlGeometryFeatures(node, properties, output) {
    var geometryName = gisXMLLocalName(node);
    if (geometryName === 'multigeometry') {
      Array.prototype.forEach.call(node.childNodes || [], function (child) {
        if (child && child.nodeType === 1) kmlGeometryFeatures(child, properties, output);
      });
      return;
    }
    var coordinateNode = gisXMLDescendants(node, 'coordinates')[0];
    if (geometryName === 'point' && coordinateNode) {
      output.push({ type: 'Feature', properties: Object.assign({}, properties), geometry: { type: 'Point', coordinates: parseGISCoordinates(gisXMLText(coordinateNode), 'KML point')[0] } });
      return;
    }
    if (geometryName === 'linestring' && coordinateNode) {
      output.push({ type: 'Feature', properties: Object.assign({}, properties), geometry: { type: 'LineString', coordinates: parseGISCoordinates(gisXMLText(coordinateNode), 'KML line') } });
      return;
    }
    if (geometryName === 'polygon') {
      var outer = gisXMLDescendants(node, 'outerboundaryis')[0];
      var outerCoordinates = outer && gisXMLDescendants(outer, 'coordinates')[0];
      if (!outerCoordinates) throw new Error('KML polygon is missing an outer boundary.');
      var rings = [parseGISCoordinates(gisXMLText(outerCoordinates), 'KML polygon')];
      gisXMLDescendants(node, 'innerboundaryis').forEach(function (inner) {
        var innerCoordinates = gisXMLDescendants(inner, 'coordinates')[0];
        if (innerCoordinates) rings.push(parseGISCoordinates(gisXMLText(innerCoordinates), 'KML polygon hole'));
      });
      rings = rings.map(function (ring) {
        if (!sameWGS84Position(ring[0], ring[ring.length - 1])) ring.push(ring[0].slice());
        return ring;
      });
      output.push({ type: 'Feature', properties: Object.assign({}, properties), geometry: { type: 'Polygon', coordinates: rings } });
    }
  }

  function parseKML(text) {
    var documentNode = parseGISXMLDocument(text, 'KML'), root = documentNode.documentElement;
    if (gisXMLLocalName(root) !== 'kml') throw new Error('KML import must have a <kml> root element.');
    var features = [];
    gisXMLDescendants(root, 'placemark').forEach(function (placemark) {
      var properties = kmlProperties(placemark);
      Array.prototype.forEach.call(placemark.childNodes || [], function (child) {
        if (child && child.nodeType === 1 && ['point', 'linestring', 'polygon', 'multigeometry'].indexOf(gisXMLLocalName(child)) >= 0) kmlGeometryFeatures(child, properties, features);
      });
    });
    if (!features.length) throw new Error('KML did not contain a supported Placemark geometry.');
    return parseGeoJSON(JSON.stringify({ type: 'FeatureCollection', features: features }));
  }

  function gpxProperties(node) {
    var properties = {}, nameNode = gisXMLChildren(node, 'name')[0], elevationNode = gisXMLChildren(node, 'ele')[0];
    if (nameNode) properties.name = gisXMLText(nameNode);
    if (elevationNode && Number.isFinite(Number(gisXMLText(elevationNode)))) properties.elevation = Number(gisXMLText(elevationNode));
    properties.value = Number.isFinite(properties.elevation) ? properties.elevation : 1;
    return properties;
  }

  function gpxPoint(node, label) {
    var lat = Number(node.getAttribute && node.getAttribute('lat')), lon = Number(node.getAttribute && node.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !validWGS84Position([lon, lat])) throw new Error(label + ' contains an invalid WGS84 point.');
    var position = [lon, lat], elevation = gisXMLChildren(node, 'ele')[0];
    if (elevation && Number.isFinite(Number(gisXMLText(elevation)))) position.push(Number(gisXMLText(elevation)));
    return position;
  }

  function parseGPX(text) {
    var documentNode = parseGISXMLDocument(text, 'GPX'), root = documentNode.documentElement;
    if (gisXMLLocalName(root) !== 'gpx') throw new Error('GPX import must have a <gpx> root element.');
    var features = [];
    gisXMLDescendants(root, 'wpt').forEach(function (point) {
      features.push({ type: 'Feature', properties: gpxProperties(point), geometry: { type: 'Point', coordinates: gpxPoint(point, 'GPX waypoint') } });
    });
    gisXMLDescendants(root, 'rte').forEach(function (route) {
      var points = gisXMLChildren(route, 'rtept').map(function (point) { return gpxPoint(point, 'GPX route'); });
      if (points.length >= 2) features.push({ type: 'Feature', properties: gpxProperties(route), geometry: { type: 'LineString', coordinates: points } });
    });
    gisXMLDescendants(root, 'trkseg').forEach(function (segment) {
      var points = gisXMLChildren(segment, 'trkpt').map(function (point) { return gpxPoint(point, 'GPX track'); });
      if (points.length >= 2) features.push({ type: 'Feature', properties: gpxProperties(segment.parentNode && segment.parentNode.parentNode || segment), geometry: { type: 'LineString', coordinates: points } });
    });
    if (!features.length) throw new Error('GPX did not contain waypoints, routes, or tracks with usable coordinates.');
    return parseGeoJSON(JSON.stringify({ type: 'FeatureCollection', features: features }));
  }

  function detectGISVectorFormat(name, text) {
    var lower = String(name || '').toLowerCase(), trimmed = String(text || '').replace(/^\uFEFF/, '').trim();
    if (/\.kml$/.test(lower)) return 'kml';
    if (/\.gpx$/.test(lower)) return 'gpx';
    if (/\.geojson$|\.json$/.test(lower)) return 'geojson';
    if (/\.shp$|\.zip$/.test(lower)) return 'shapefile';
    if (/\.gpkg$/.test(lower)) return 'geopackage';
    if (/^\s*<\s*kml(?:\s|>)/i.test(trimmed)) return 'kml';
    if (/^\s*<\s*gpx(?:\s|>)/i.test(trimmed)) return 'gpx';
    if (/^\s*[\[{]/.test(trimmed)) return 'geojson';
    return 'unknown';
  }

  function parseGISVectorText(text, format, name) {
    var detected = format && format !== 'auto' ? String(format).toLowerCase() : detectGISVectorFormat(name, text);
    if (detected === 'geojson') return Object.assign({}, parseGeoJSON(text), { sourceFormat: 'geojson' });
    if (detected === 'kml') return Object.assign({}, parseKML(text), { sourceFormat: 'kml' });
    if (detected === 'gpx') return Object.assign({}, parseGPX(text), { sourceFormat: 'gpx' });
    if (detected === 'shapefile') throw new Error('Shapefile ZIP import needs a bundled binary parser. Export the layer as WGS84 GeoJSON, KML, or GPX for now.');
    if (detected === 'geopackage') throw new Error('GeoPackage import needs a bundled SQLite parser. Export the layer as WGS84 GeoJSON for now.');
    throw new Error('Choose a GeoJSON, KML, or GPX file, or paste one of those formats.');
  }

  var EXAMPLE_JOIN_CSV = [
    'name,students,priority_score',
    'Northern forest,140,34',
    'Western mountains,265,57',
    'Central corridor,510,76',
    'Coastal belt,680,91',
    'Unmatched example,25,48'
  ].join('\n');

  var GIS_MISSIONS = [
    {
      id: 'coast-connectivity',
      title: 'Coast and Connectivity',
      duration: '25-35 minutes',
      question: 'How do the sample population-density and broadband-access patterns compare across coastal and inland Maine counties?',
      workspace: 'compare',
      evidencePrompt: 'Make one comparison claim. Cite at least one county from each map and name one limitation of the illustrative access index.',
      teacherNote: 'Good for separating spatial correlation from causal explanation. Students should question the scale, county-centroid representation, and the illustrative access values.',
      practices: ['C3 geographic reasoning', 'AP Human Geography spatial patterns', 'Evidence-based argument'],
      steps: [
        { id: 'setup', label: 'Prepare the synchronized density and access maps.' },
        { id: 'pattern', label: 'Identify one similarity and one difference between the patterns.' },
        { id: 'evidence', label: 'Record evidence from at least two named counties.' },
        { id: 'limits', label: 'Explain why the maps cannot prove what caused the pattern.' }
      ]
    },
    {
      id: 'service-area',
      title: 'Community Service Area',
      duration: '20-30 minutes',
      question: 'Which mapped county centroids fall within a hypothetical 75 km straight-line service radius?',
      workspace: 'map',
      evidencePrompt: 'State which mapped points are inside the buffer, then explain why a circular straight-line buffer is not the same as travel time or equitable access.',
      teacherNote: 'This mission introduces buffers as a model with assumptions. The points are county reference locations, not people, schools, or service demand.',
      practices: ['GIS proximity analysis', 'NGSS model limitations', 'Quantitative spatial reasoning'],
      steps: [
        { id: 'setup', label: 'Prepare a 75 km radius-buffer analysis.' },
        { id: 'place', label: 'Place the center and inspect the selected point rows.' },
        { id: 'evidence', label: 'Summarize the selected count and selected attribute values.' },
        { id: 'limits', label: 'Contrast straight-line proximity with real transportation access.' }
      ]
    },
    {
      id: 'ecoregion-boundaries',
      title: 'Ecological Region Boundaries',
      duration: '30-40 minutes',
      question: 'How do point patterns and results change when Maine is divided into broad practice regions?',
      workspace: 'map',
      evidencePrompt: 'Choose a practice polygon, report its approximate area or perimeter and the points inside it, then describe how a different boundary could change the result.',
      teacherNote: 'The included polygons are intentionally simplified practice geometry. Follow with the official Maine ecoregions layer when internet access and instructional time allow.',
      practices: ['C3 scale and region concepts', 'NGSS systems and models', 'Boundary and classification literacy'],
      steps: [
        { id: 'setup', label: 'Load the simplified practice-region GeoJSON.' },
        { id: 'measure', label: 'Measure one polygon and select mapped points inside it.' },
        { id: 'evidence', label: 'Use the feature table and point table as evidence.' },
        { id: 'limits', label: 'Explain how boundaries and classification choices shape conclusions.' }
      ]
    }
  ];

  function missionCompletion(mission, progress) {
    var steps = mission && Array.isArray(mission.steps) ? mission.steps : [];
    var state = progress || {};
    var complete = steps.filter(function (step) { return !!state[step.id]; }).length;
    return { complete: complete, total: steps.length, percent: steps.length ? Math.round(complete / steps.length * 100) : 0 };
  }

  var CLASS_COLORS = ['#155e75', '#0891b2', '#65a30d', '#d97706', '#ea580c', '#be123c', '#881337'];

  function parseTableCSV(text, options) {
    options = options || {};
    var table = parseGISDelimitedRows(text, options), rows = table.rows;
    if (rows.length < 2) throw new Error('The join CSV needs a header and at least one data row. Check the selected delimiter.');
    var headers = rows[0].map(function (header) { return String(header || '').trim(); });
    if (headers.some(function (header) { return !header; })) throw new Error('Every join CSV column needs a header.');
    var decimalSeparator = detectGISDecimalSeparator(rows, table.delimiter, options);
    var objects = rows.slice(1, 5001).map(function (cells) {
      var object = {};
      headers.forEach(function (header, index) { object[header] = cells[index] == null ? '' : cells[index]; });
      return object;
    });
    var numericKeys = headers.filter(function (header) {
      return objects.some(function (object) {
        return object[header] !== '' && Number.isFinite(parseGISNumber(object[header], { decimalSeparator: decimalSeparator }));
      });
    });
    return { headers: headers, rows: objects, numericKeys: numericKeys, delimiter: table.delimiter, decimalSeparator: decimalSeparator };
  }

  function parseLegacyTableCSV(text) {
    var rows = [], row = [], field = '', quoted = false, i;
    text = String(text || '');
    for (i = 0; i < text.length; i += 1) {
      var character = text[i];
      if (character === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = !quoted;
      } else if (character === ',' && !quoted) {
        row.push(field.trim()); field = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field.trim()); field = '';
        if (row.some(function (cell) { return cell !== ''; })) rows.push(row);
        row = [];
      } else field += character;
    }
    row.push(field.trim());
    if (row.some(function (cell) { return cell !== ''; })) rows.push(row);
    if (rows.length < 2) throw new Error('The join CSV needs a header and at least one data row.');
    var headers = rows[0].map(function (header) { return header.trim(); });
    if (headers.some(function (header) { return !header; })) throw new Error('Every join CSV column needs a header.');
    var objects = rows.slice(1, 5001).map(function (cells) {
      var object = {};
      headers.forEach(function (header, index) { object[header] = cells[index] == null ? '' : cells[index]; });
      return object;
    });
    var numericKeys = headers.filter(function (header) {
      return objects.some(function (object) { return object[header] !== '' && Number.isFinite(Number(object[header])); });
    });
    return { headers: headers, rows: objects, numericKeys: numericKeys };
  }

  var EXAMPLE_TIME_CSV = [
    'name,latitude,longitude,year,value,unit,source',
    'Cumberland,43.66,-70.26,2015,78,index points,Illustrative classroom series',
    'Cumberland,43.66,-70.26,2020,86,index points,Illustrative classroom series',
    'Cumberland,43.66,-70.26,2025,93,index points,Illustrative classroom series',
    'Aroostook,46.68,-68.02,2015,55,index points,Illustrative classroom series',
    'Aroostook,46.68,-68.02,2020,64,index points,Illustrative classroom series',
    'Aroostook,46.68,-68.02,2025,72,index points,Illustrative classroom series',
    'York,43.48,-70.72,2015,76,index points,Illustrative classroom series',
    'York,43.48,-70.72,2020,84,index points,Illustrative classroom series',
    'York,43.48,-70.72,2025,91,index points,Illustrative classroom series',
    'Washington,44.72,-67.46,2015,52,index points,Illustrative classroom series',
    'Washington,44.72,-67.46,2020,61,index points,Illustrative classroom series',
    'Washington,44.72,-67.46,2025,70,index points,Illustrative classroom series',
    'Kennebec,44.31,-69.78,2015,71,index points,Illustrative classroom series',
    'Kennebec,44.31,-69.78,2020,79,index points,Illustrative classroom series',
    'Kennebec,44.31,-69.78,2025,86,index points,Illustrative classroom series',
    'Piscataquis,45.18,-69.23,2015,50,index points,Illustrative classroom series',
    'Piscataquis,45.18,-69.23,2020,58,index points,Illustrative classroom series',
    'Piscataquis,45.18,-69.23,2025,68,index points,Illustrative classroom series'
  ].join('\n');

  function parseTimeCSV(text, options) {
    var table = parseTableCSV(text, options);
    var headerLookup = {};
    table.headers.forEach(function (header) { headerLookup[normalizeGISHeader(header)] = header; });
    function field(names, required) {
      var match = names.map(function (name) { return headerLookup[name]; }).filter(Boolean)[0] || '';
      if (!match && required) throw new Error('Time-series CSV headers must include name, latitude, longitude, year, and value.');
      return match;
    }
    var nameKey = field(['name', 'label', 'place', 'location', 'nom', 'nombre', 'nome'], true);
    var latKey = field(['latitude', 'lat', 'latitud', 'breitengrad'], true);
    var lonKey = field(['longitude', 'lon', 'lng', 'long', 'longitud', 'lengtegraad'], true);
    var yearKey = field(['year', 'date', 'time'], true);
    var valueKey = field(['value', 'amount', 'score', 'count'], true);
    var unitKey = field(['unit', 'units'], false);
    var sourceKey = field(['source', 'datasource'], false);
    var methodKey = field(['method', 'methodology'], false);
    var rejectedRows = [], sourceRows = table.rows.slice(0, 3000);
    var candidates = sourceRows.map(function (row, index) {
      var raw = {
        row: index + 2,
        name: row[nameKey] == null ? '' : String(row[nameKey]).trim(),
        latitude: row[latKey] == null ? '' : String(row[latKey]).trim(),
        longitude: row[lonKey] == null ? '' : String(row[lonKey]).trim(),
        year: row[yearKey] == null ? '' : String(row[yearKey]).trim(),
        value: row[valueKey] == null ? '' : String(row[valueKey]).trim()
      };
      return {
        raw: raw,
        record: {
          name: raw.name,
          lat: parseGISNumber(raw.latitude, { decimalSeparator: table.decimalSeparator }),
          lon: parseGISNumber(raw.longitude, { decimalSeparator: table.decimalSeparator }),
          year: parseGISNumber(raw.year, { decimalSeparator: table.decimalSeparator }),
          value: parseGISNumber(raw.value, { decimalSeparator: table.decimalSeparator }),
          unit: unitKey ? String(row[unitKey] || '').trim() : '',
          source: sourceKey ? String(row[sourceKey] || '').trim() : '',
          method: methodKey ? String(row[methodKey] || '').trim() : ''
        }
      };
    });
    var rows = candidates.filter(function (candidate) {
      var row = candidate.record, raw = candidate.raw;
      var valid = raw.name && raw.latitude && raw.longitude && raw.year && raw.value &&
        Number.isFinite(row.lat) && row.lat >= -90 && row.lat <= 90 &&
        Number.isFinite(row.lon) && row.lon >= -180 && row.lon <= 180 &&
        Number.isFinite(row.year) && Number.isFinite(row.value);
      if (!valid && rejectedRows.length < 50) rejectedRows.push(raw);
      return valid;
    }).map(function (candidate) { return candidate.record; });
    var invalidRows = Math.max(0, sourceRows.length - rows.length);
    var truncatedRows = Math.max(0, table.rows.length - sourceRows.length);
    if (!rows.length) throw new Error('No valid time-series rows were found.');
    var keyCount = {}, duplicates = [];
    rows.forEach(function (row) {
      var key = row.name.toLowerCase() + '|' + row.year;
      keyCount[key] = (keyCount[key] || 0) + 1;
      if (keyCount[key] === 2) duplicates.push(row.name + ' (' + row.year + ')');
    });
    var years = rows.map(function (row) { return row.year; }).filter(function (year, index, all) { return all.indexOf(year) === index; })
      .sort(function (a, b) { return a - b; });
    if (years.length < 2) throw new Error('Add at least two distinct years to analyze change.');
    return {
      rows: rows, years: years, duplicates: duplicates, invalidRows: invalidRows, truncatedRows: truncatedRows, invalidSamples: rejectedRows,
      units: rows.map(function (row) { return row.unit; }).filter(function (value, index, all) { return value && all.indexOf(value) === index; }),
      delimiter: table.delimiter, decimalSeparator: table.decimalSeparator,
      sources: rows.map(function (row) { return row.source; }).filter(function (value, index, all) { return value && all.indexOf(value) === index; })
    };
  }

  function timelineSnapshot(rows, year) {
    return (rows || []).filter(function (row) { return Number(row.year) === Number(year); });
  }

  function calculateTemporalChange(rows, startYear, endYear) {
    var start = {}, end = {}, order = [], warnings = [];
    (rows || []).forEach(function (row) {
      var key = String(row.name || '').trim().toLowerCase();
      if (!key) return;
      if (order.indexOf(key) < 0) order.push(key);
      if (Number(row.year) === Number(startYear)) start[key] = row;
      if (Number(row.year) === Number(endYear)) end[key] = row;
    });
    var changes = order.filter(function (key) { return start[key] || end[key]; }).map(function (key) {
      var first = start[key], last = end[key], complete = !!first && !!last;
      var change = complete ? last.value - first.value : null;
      var percent = complete && first.value !== 0 ? change / Math.abs(first.value) * 100 : null;
      var location = last || first;
      return {
        name: location.name, lat: location.lat, lon: location.lon,
        startValue: first ? first.value : null, endValue: last ? last.value : null,
        change: change, percent: percent,
        trend: !complete ? 'Missing comparison' : change > 0 ? 'Increase' : change < 0 ? 'Decrease' : 'No change',
        unit: (last && last.unit) || (first && first.unit) || ''
      };
    });
    var missing = changes.filter(function (row) { return row.change === null; }).length;
    if (missing) warnings.push(missing + ' location' + (missing === 1 ? ' is' : 's are') + ' missing from one comparison year.');
    var units = (rows || []).filter(function (row) {
      return Number(row.year) === Number(startYear) || Number(row.year) === Number(endYear);
    }).map(function (row) { return row.unit; }).filter(function (value, index, all) { return value && all.indexOf(value) === index; });
    if (units.length > 1) warnings.push('The comparison years contain different units: ' + units.join(', ') + '.');
    return { rows: changes, warnings: warnings };
  }

  var EXAMPLE_TIME_DATA = parseTimeCSV(EXAMPLE_TIME_CSV);

  var REMOTE_LAND_COVER = {
    F: { label: 'Forest', trueColor: '#28543d', falseColor: '#e11d48', bands: { green: 0.12, red: 0.08, nir: 0.62, swir: 0.20 } },
    W: { label: 'Water', trueColor: '#245c83', falseColor: '#10243f', bands: { green: 0.06, red: 0.04, nir: 0.02, swir: 0.01 } },
    T: { label: 'Wetland', trueColor: '#587347', falseColor: '#fb7185', bands: { green: 0.18, red: 0.10, nir: 0.38, swir: 0.16 } },
    G: { label: 'Grass or low vegetation', trueColor: '#8fa45c', falseColor: '#f43f5e', bands: { green: 0.19, red: 0.12, nir: 0.48, swir: 0.25 } },
    D: { label: 'Developed', trueColor: '#8b817b', falseColor: '#67e8f9', bands: { green: 0.24, red: 0.22, nir: 0.25, swir: 0.34 } },
    B: { label: 'Bare soil', trueColor: '#a57955', falseColor: '#f5d0a9', bands: { green: 0.30, red: 0.27, nir: 0.32, swir: 0.38 } },
    C: { label: 'Cloud', trueColor: '#f8fafc', falseColor: '#f8fafc', bands: { green: 0.86, red: 0.84, nir: 0.82, swir: 0.72 } }
  };

  function adjustedRemoteBands(code, index, period) {
    var base = REMOTE_LAND_COVER[code].bands;
    var variation = ((index % 5) - 2) * 0.006 + (period === 'after' ? ((index % 3) - 1) * 0.004 : 0);
    var result = {};
    Object.keys(base).forEach(function (band) {
      result[band] = Math.max(0.001, Math.min(0.999, Number((base[band] + variation).toFixed(3))));
    });
    return result;
  }

  function createRemoteScene() {
    var beforeCodes = [
      'F', 'F', 'F', 'F', 'W', 'W',
      'F', 'F', 'F', 'F', 'W', 'W',
      'F', 'F', 'T', 'T', 'W', 'W',
      'F', 'F', 'T', 'T', 'G', 'G',
      'F', 'F', 'F', 'G', 'G', 'B',
      'F', 'F', 'G', 'G', 'D', 'D'
    ];
    var afterCodes = [
      'F', 'F', 'F', 'D', 'W', 'W',
      'F', 'F', 'D', 'D', 'W', 'W',
      'F', 'D', 'D', 'T', 'W', 'W',
      'F', 'F', 'T', 'G', 'G', 'G',
      'F', 'F', 'G', 'G', 'D', 'D',
      'F', 'G', 'G', 'D', 'D', 'D'
    ];
    var cloudAfter = { 5: true };
    var cells = beforeCodes.map(function (beforeCode, index) {
      var row = Math.floor(index / 6), column = index % 6;
      var afterCode = afterCodes[index];
      var cloudy = !!cloudAfter[index];
      return {
        id: String.fromCharCode(65 + row) + (column + 1),
        row: row, column: column,
        beforeCode: beforeCode,
        afterCode: afterCode,
        beforeClass: REMOTE_LAND_COVER[beforeCode].label,
        afterClass: cloudy ? 'Cloud obscured' : REMOTE_LAND_COVER[afterCode].label,
        beforeBands: adjustedRemoteBands(beforeCode, index, 'before'),
        afterBands: cloudy ? adjustedRemoteBands('C', index, 'after') : adjustedRemoteBands(afterCode, index, 'after'),
        quality: cloudy ? 'cloud' : 'clear'
      };
    });
    return {
      id: 'maine-forest-edge',
      title: 'Maine Forest Edge learning scene',
      location: 'Illustrative inland Maine landscape',
      beforeDate: '2016-08-15',
      afterDate: '2024-08-22',
      width: 6,
      height: 6,
      resolutionMeters: 30,
      source: 'Illustrative Landsat-style multispectral reflectance values created for GIS Studio instruction; not observed satellite measurements.',
      cells: cells
    };
  }

  var REMOTE_SCENE = createRemoteScene();

  function normalizedDifference(first, second) {
    first = Number(first); second = Number(second);
    if (!Number.isFinite(first) || !Number.isFinite(second) || Math.abs(first + second) < 1e-12) return null;
    return (first - second) / (first + second);
  }

  function calculateSpectralIndex(bands, indexName) {
    bands = bands || {};
    var key = String(indexName || 'ndvi').toLowerCase();
    if (key === 'ndwi') return normalizedDifference(bands.green, bands.nir);
    if (key === 'ndbi') return normalizedDifference(bands.swir, bands.nir);
    return normalizedDifference(bands.nir, bands.red);
  }

  function remoteIndexName(indexName) {
    return String(indexName || '').toLowerCase() === 'ndwi' ? 'NDWI — water and moisture' :
      String(indexName || '').toLowerCase() === 'ndbi' ? 'NDBI — built-up surfaces' :
        'NDVI — vegetation greenness';
  }

  function remoteIndexFormula(indexName) {
    return String(indexName || '').toLowerCase() === 'ndwi' ? '(Green − NIR) ÷ (Green + NIR)' :
      String(indexName || '').toLowerCase() === 'ndbi' ? '(SWIR − NIR) ÷ (SWIR + NIR)' :
        '(NIR − Red) ÷ (NIR + Red)';
  }

  function classifySpectralPixel(bands) {
    var ndvi = calculateSpectralIndex(bands, 'ndvi');
    var ndwi = calculateSpectralIndex(bands, 'ndwi');
    var ndbi = calculateSpectralIndex(bands, 'ndbi');
    if (ndwi != null && ndwi > 0.25 && Number(bands.nir) < 0.15) return { label: 'Likely water', evidence: 'High NDWI and low near-infrared reflectance' };
    if (ndvi != null && ndvi >= 0.55) return { label: 'Dense vegetation', evidence: 'High NDVI' };
    if (ndbi != null && ndbi > 0.08 && ndvi < 0.25) return { label: 'Built-up or bare surface', evidence: 'Positive NDBI with low NDVI' };
    if (ndvi != null && ndvi >= 0.25) return { label: 'Sparse or mixed vegetation', evidence: 'Moderate NDVI' };
    if (ndwi != null && ndwi > 0) return { label: 'Moist or wet surface', evidence: 'Positive NDWI' };
    return { label: 'Low vegetation or other surface', evidence: 'No strong index threshold matched' };
  }

  function normalizeRemoteSensingState(value) {
    value = value || {};
    var modes = ['trueColor', 'falseColor', 'ndvi', 'ndwi', 'ndbi'];
    var indices = ['ndvi', 'ndwi', 'ndbi'];
    var selected = String(value.selectedPixel || REMOTE_SCENE.cells[0].id);
    if (!REMOTE_SCENE.cells.some(function (cell) { return cell.id === selected; })) selected = REMOTE_SCENE.cells[0].id;
    var checks = value.qualityChecks && typeof value.qualityChecks === 'object' ? value.qualityChecks : {};
    var swipe = Number(value.swipe);
    if (!Number.isFinite(swipe)) swipe = 50;
    return {
      viewMode: modes.indexOf(value.viewMode) >= 0 ? value.viewMode : 'trueColor',
      analysisIndex: indices.indexOf(value.analysisIndex) >= 0 ? value.analysisIndex : 'ndvi',
      swipe: Math.max(0, Math.min(100, swipe)),
      selectedPixel: selected,
      cloudMask: value.cloudMask !== false,
      evidence: String(value.evidence || '').slice(0, 3000),
      qualityChecks: {
        dates: !!checks.dates,
        clouds: !!checks.clouds,
        scale: !!checks.scale,
        causation: !!checks.causation
      }
    };
  }

  function remoteIndexValue(cell, period, indexName, maskCloud) {
    if (!cell) return null;
    if (period === 'after' && cell.quality === 'cloud' && maskCloud !== false) return null;
    return calculateSpectralIndex(period === 'after' ? cell.afterBands : cell.beforeBands, indexName);
  }

  function remoteIndexColor(value, indexName) {
    if (!Number.isFinite(Number(value))) return '#475569';
    var numeric = Number(value);
    if (String(indexName).toLowerCase() === 'ndbi') {
      return numeric < -0.2 ? '#1d4ed8' : numeric < 0 ? '#67e8f9' : numeric < 0.15 ? '#fde68a' : '#c2410c';
    }
    if (String(indexName).toLowerCase() === 'ndwi') {
      return numeric < -0.2 ? '#a16207' : numeric < 0 ? '#84cc16' : numeric < 0.25 ? '#38bdf8' : '#1d4ed8';
    }
    return numeric < 0 ? '#334155' : numeric < 0.2 ? '#a16207' : numeric < 0.4 ? '#84cc16' : numeric < 0.6 ? '#16a34a' : '#065f46';
  }

  function remotePixelColor(cell, period, viewMode, maskCloud) {
    if (period === 'after' && cell.quality === 'cloud') {
      return maskCloud === false
        ? 'repeating-linear-gradient(135deg,#f8fafc 0,#f8fafc 7px,#cbd5e1 7px,#cbd5e1 14px)'
        : 'repeating-linear-gradient(135deg,#334155 0,#334155 7px,#64748b 7px,#64748b 14px)';
    }
    var code = period === 'after' ? cell.afterCode : cell.beforeCode;
    if (viewMode === 'trueColor') return REMOTE_LAND_COVER[code].trueColor;
    if (viewMode === 'falseColor') return REMOTE_LAND_COVER[code].falseColor;
    return remoteIndexColor(remoteIndexValue(cell, period, viewMode, maskCloud), viewMode);
  }

  function summarizeRemoteChange(scene, indexName, pixelSizeMeters) {
    scene = scene || REMOTE_SCENE;
    var pixelSize = Math.max(1, Number(pixelSizeMeters) || scene.resolutionMeters || 30);
    var valid = scene.cells.filter(function (cell) { return cell.quality !== 'cloud'; });
    var changed = valid.filter(function (cell) { return cell.beforeCode !== cell.afterCode; });
    var forestLoss = valid.filter(function (cell) { return cell.beforeCode === 'F' && cell.afterCode !== 'F'; });
    var developedGain = valid.filter(function (cell) { return cell.beforeCode !== 'D' && cell.afterCode === 'D'; });
    var values = valid.map(function (cell) {
      var before = remoteIndexValue(cell, 'before', indexName, true);
      var after = remoteIndexValue(cell, 'after', indexName, true);
      return { before: before, after: after, change: before == null || after == null ? null : after - before };
    }).filter(function (item) { return item.change != null; });
    function mean(key) {
      return values.length ? values.reduce(function (sum, item) { return sum + item[key]; }, 0) / values.length : null;
    }
    return {
      total: scene.cells.length,
      valid: valid.length,
      masked: scene.cells.length - valid.length,
      changed: changed.length,
      changedAreaHa: changed.length * pixelSize * pixelSize / 10000,
      forestLoss: forestLoss.length,
      developedGain: developedGain.length,
      meanBefore: mean('before'),
      meanAfter: mean('after'),
      meanChange: mean('change')
    };
  }

  function buildRemoteSensingReport(model) {
    model = model || {};
    var scene = model.scene || REMOTE_SCENE;
    var state = normalizeRemoteSensingState(model.state);
    var summary = summarizeRemoteChange(scene, state.analysisIndex, scene.resolutionMeters);
    function number(value) { return value == null || !Number.isFinite(Number(value)) ? 'Masked' : Number(value).toFixed(3); }
    function grid(period) {
      return '<div class="raster" role="img" aria-label="' + escapeHTML(
        (period === 'before' ? 'Before' : 'After') + ' illustrative raster with ' + scene.cells.length +
        ' pixels. Exact classes and index values are in the table.'
      ) + '">' + scene.cells.map(function (cell) {
        return '<span style="background:' + remotePixelColor(cell, period, state.viewMode, state.cloudMask) + '" aria-hidden="true"></span>';
      }).join('') + '</div>';
    }
    var tableRows = scene.cells.map(function (cell) {
      var before = remoteIndexValue(cell, 'before', state.analysisIndex, true);
      var after = remoteIndexValue(cell, 'after', state.analysisIndex, true);
      var change = before == null || after == null ? null : after - before;
      return '<tr><th scope="row">' + cell.id + '</th><td>' + escapeHTML(cell.beforeClass) + '</td><td>' +
        escapeHTML(cell.afterClass) + '</td><td>' + number(before) + '</td><td>' + number(after) + '</td><td>' +
        number(change) + '</td><td>' + (cell.quality === 'cloud' ? 'Cloud masked' : 'Clear') + '</td></tr>';
    }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Remote Sensing Evidence Report</title><style>' +
      'body{margin:0;background:#eef4f3;color:#172033;font:16px/1.55 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:30px}' +
      'header,section{background:#fff;border:1px solid #b7c8c6;border-radius:14px;padding:20px;margin-bottom:16px}header{border-top:8px solid #0f766e}' +
      'h1{margin:.15rem 0}h2{color:#0f5f5a}.pair{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:18px}' +
      '.raster{display:grid;grid-template-columns:repeat(6,1fr);aspect-ratio:1/1;border:2px solid #334155}.raster span{border:1px solid rgba(255,255,255,.22)}' +
      '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.stat{background:#ecfeff;border-radius:10px;padding:12px}' +
      'table{border-collapse:collapse;width:100%;font-size:.88rem}caption{text-align:left;font-weight:800;padding:.5rem 0}' +
      'th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.table-wrap{overflow-x:auto}.callout{border-left:5px solid #d97706;background:#fff7ed}' +
      '.actions button{padding:10px 14px}@media(max-width:650px){main{padding:12px}.pair{grid-template-columns:1fr}}' +
      '@media print{body{background:#fff}.actions{display:none}main{padding:0}header,section{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p>GIS STUDIO REMOTE SENSING LAB</p><h1>' + escapeHTML(scene.title) +
      '</h1><p>' + escapeHTML(scene.location) + '. Before: ' + escapeHTML(scene.beforeDate) + '; after: ' +
      escapeHTML(scene.afterDate) + '. ' + scene.resolutionMeters + ' m pixels.</p><p><strong>Instructional-data notice:</strong> ' +
      escapeHTML(scene.source) + '</p></header><div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div>' +
      '<section><h2>Matched-scene comparison</h2><div class="pair"><div><h3>Before</h3>' + grid('before') +
      '</div><div><h3>After</h3>' + grid('after') + '</div></div></section><section><h2>Change summary</h2>' +
      '<div class="stats"><div class="stat"><strong>' + summary.changed + '</strong><br>changed pixels</div><div class="stat"><strong>' +
      summary.changedAreaHa.toFixed(2) + ' ha</strong><br>mapped change area</div><div class="stat"><strong>' +
      summary.forestLoss + '</strong><br>forest-loss pixels</div><div class="stat"><strong>' + summary.developedGain +
      '</strong><br>developed-gain pixels</div><div class="stat"><strong>' + number(summary.meanChange) +
      '</strong><br>mean ' + escapeHTML(state.analysisIndex.toUpperCase()) + ' change</div><div class="stat"><strong>' +
      summary.masked + '</strong><br>cloud-masked pixels</div></div><p><strong>Index:</strong> ' +
      escapeHTML(remoteIndexName(state.analysisIndex)) + '. Formula: ' + escapeHTML(remoteIndexFormula(state.analysisIndex)) +
      '.</p></section><section class="callout"><h2>Evidence-based interpretation</h2><p>' +
      escapeHTML(state.evidence || 'No interpretation has been recorded yet.') +
      '</p><p>Observed spectral or land-cover change does not establish its cause. Field evidence, metadata, and additional dates are needed.</p></section>' +
      '<section><h2>Accessible pixel table</h2><div class="table-wrap"><table><caption>Before-and-after land cover and ' +
      escapeHTML(state.analysisIndex.toUpperCase()) + ' values</caption><thead><tr><th scope="col">Pixel</th><th scope="col">Before class</th>' +
      '<th scope="col">After class</th><th scope="col">Before index</th><th scope="col">After index</th><th scope="col">Change</th>' +
      '<th scope="col">Quality</th></tr></thead><tbody>' + tableRows + '</tbody></table></div></section>' +
      '<section><h2>Method and limitations</h2><ul><li>Dates are from the same season to reduce phenology differences.</li>' +
      '<li>One after-date pixel is cloud obscured and excluded from statistics.</li><li>Each 30 m pixel represents 900 m², or 0.09 ha.</li>' +
      '<li>Index thresholds are instructional heuristics, not a validated classification model.</li><li>Mixed pixels can contain several land-cover types.</li></ul></section>' +
      '</main></body></html>';
  }


  var STORY_FRAME_LIMIT = 12;

  function normalizeStoryFrame(value, index) {
    value = value || {};
    return {
      id: String(value.id || 'story-frame-' + (Number(index) + 1)).slice(0, 80),
      title: String(value.title || 'Untitled evidence frame').slice(0, 200),
      narrative: String(value.narrative || '').slice(0, 2500),
      evidence: String(value.evidence || '').slice(0, 2500),
      limitation: String(value.limitation || '').slice(0, 1800),
      view: String(value.view || 'GIS Studio').slice(0, 120),
      metric: String(value.metric || '').slice(0, 120),
      basemap: String(value.basemap || '').slice(0, 120),
      source: String(value.source || '').slice(0, 500),
      createdAt: String(value.createdAt || '').slice(0, 80)
    };
  }

  function normalizeStoryMap(value) {
    value = value || {};
    var frames = Array.isArray(value.slides) ? value.slides.slice(0, STORY_FRAME_LIMIT).map(normalizeStoryFrame) : [];
    var checks = value.checks && typeof value.checks === 'object' ? value.checks : {};
    return {
      title: String(value.title || 'Maine spatial investigation').slice(0, 200),
      subtitle: String(value.subtitle || 'Claim \u2192 evidence \u2192 limitation').slice(0, 300),
      slides: frames,
      checks: { claim: !!checks.claim, evidence: !!checks.evidence, limitation: !!checks.limitation }
    };
  }

  function createStoryFrame(value, index) {
    value = value || {};
    return normalizeStoryFrame(Object.assign({
      id: 'story-frame-' + Date.now() + '-' + (Number(index) || 0),
      title: 'Evidence frame',
      narrative: '', evidence: '', limitation: '', view: 'GIS Studio', metric: '', basemap: '', source: '',
      createdAt: new Date().toISOString()
    }, value), index || 0);
  }

  function storyMapProgress(value) {
    var story = normalizeStoryMap(value);
    var keys = ['claim', 'evidence', 'limitation'];
    var complete = keys.filter(function (key) { return story.checks[key]; }).length;
    return { complete: complete, total: keys.length, percent: Math.round(complete / keys.length * 100), frames: story.slides.length };
  }

  function buildStoryMapReport(model) {
    model = model || {};
    var story = normalizeStoryMap(model.story || model);
    var generated = String(model.generated || new Date().toLocaleString());
    var rows = Array.isArray(model.rows) ? model.rows.slice(0, 120) : [];
    var frameMarkup = story.slides.length ? story.slides.map(function (frame, index) {
      var metadata = [frame.view, frame.metric && 'Metric: ' + frame.metric, frame.basemap && 'Basemap: ' + frame.basemap, frame.source && 'Source: ' + frame.source]
        .filter(Boolean).join(' • ');
      return '<li><article><p class="kicker">FRAME ' + (index + 1) + '</p><h2>' + escapeHTML(frame.title) + '</h2>' +
        (metadata ? '<p class="meta">' + escapeHTML(metadata) + '</p>' : '') +
        '<h3>Observation</h3><p>' + escapeHTML(frame.narrative || 'No observation recorded yet.') + '</p>' +
        '<h3>Evidence</h3><p>' + escapeHTML(frame.evidence || 'No evidence note recorded yet.') + '</p>' +
        '<h3>Limitation or next question</h3><p>' + escapeHTML(frame.limitation || 'No limitation recorded yet.') + '</p></article></li>';
    }).join('') : '<li><article><p>No frames have been added yet. Return to GIS Studio and capture a view.</p></article></li>';
    var tableRows = rows.map(function (row) {
      return '<tr><th scope="row">' + escapeHTML(row.name || 'Record') + '</th><td>' + escapeHTML(row.geometry || 'Point') + '</td><td>' +
        escapeHTML(row.value == null ? '' : String(row.value)) + '</td></tr>';
    }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escapeHTML(story.title) + '</title><style>' +
      'body{margin:0;background:#eef4f3;color:#172033;font:16px/1.55 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:30px}' +
      'header,section,article{background:#fff;border:1px solid #b7c8c6;border-radius:14px;padding:20px;margin-bottom:16px}header{border-top:8px solid #0f766e}' +
      'h1{margin:.15rem 0}h2{color:#0f5f5a}h3{font-size:1rem;color:#172033;margin-bottom:3px}.kicker{color:#0f766e;font-weight:900;letter-spacing:.1em;font-size:.75rem}.meta{color:#52636f;font-size:.9rem}.trail{padding-left:24px}.status{background:#ecfeff;border-left:5px solid #0f766e;padding:12px}' +
      'table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:800;padding:.5rem 0}th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.table-wrap{overflow-x:auto}.actions button{padding:10px 14px}@media print{body{background:#fff}.actions{display:none}main{padding:0}header,section,article{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p class="kicker">GIS STUDIO STORY MAP</p><h1>' + escapeHTML(story.title) + '</h1><p>' + escapeHTML(story.subtitle) + '</p>' +
      '<p class="meta">Generated ' + escapeHTML(generated) + '. The sequence is an accessible evidence trail; each frame keeps its observation, evidence, and limitation together.</p></header>' +
      '<div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div>' +
      '<section class="status"><h2>Claim \u2192 evidence \u2192 limitation</h2><p>' + storyMapProgress(story).complete + ' of 3 reflection checks complete. Claim: ' +
      (story.checks.claim ? 'complete' : 'not yet') + '; evidence: ' + (story.checks.evidence ? 'complete' : 'not yet') + '; limitation: ' +
      (story.checks.limitation ? 'complete' : 'not yet') + '.</p></section>' +
      '<section><h2>Accessible evidence trail</h2><ol class="trail">' + frameMarkup + '</ol></section>' +
      (rows.length ? '<section><h2>Data-table twin</h2><div class="table-wrap"><table><caption>Sample records referenced by the story map</caption><thead><tr><th scope="col">Record</th><th scope="col">Geometry</th><th scope="col">Value</th></tr></thead><tbody>' + tableRows + '</tbody></table></div></section>' : '') +
      '<section><h2>Method and limitations</h2><p>This story map sequences views from GIS Studio; it does not turn a spatial association into causation. Verify data provenance, coordinate privacy, map projection, measurement units, and any cloud or missing-data masks before sharing decisions.</p></section>' +
      '</main></body></html>';
  }

  function normalizeQualityReviewState(value) {
    value = value || {};
    return {
      privacy: !!value.privacy,
      missingness: !!value.missingness,
      provenance: !!value.provenance,
      interpretation: !!value.interpretation
    };
  }

  function buildDataQualityReview(model) {
    model = model || {};
    var rows = Array.isArray(model.importedRows) ? model.importedRows : [];
    var timeRows = Array.isArray(model.timeRows) ? model.timeRows : [];
    var provenance = normalizeProvenance(model.provenance);
    var privacy = model.privacyAssessment || assessCoordinatePrivacy(rows, timeRows);
    var composer = model.composerAudit || { errors: 0, warnings: 0 };
    var remote = model.remoteSummary || summarizeRemoteChange(REMOTE_SCENE, 'ndvi', REMOTE_SCENE.resolutionMeters);
    var story = model.storyProgress || storyMapProgress(model.storyMap || {});
    var checks = [];
    function add(id, label, status, message, recommendation, points) {
      checks.push({ id: id, label: label, status: status, message: message, recommendation: recommendation, points: points });
    }
    var provenanceMissing = ['datasetTitle', 'source', 'method', 'limitations'].filter(function (key) { return !String(provenance[key] || '').trim(); });
    add('provenance', 'Provenance manifest', provenanceMissing.length === 0 ? 'pass' : provenanceMissing.length >= 3 ? 'error' : 'warning',
      provenanceMissing.length ? provenanceMissing.length + ' provenance field' + (provenanceMissing.length === 1 ? ' is' : 's are') + ' still blank.' : 'Dataset source, method, and limitations are recorded.',
      provenanceMissing.length ? 'Complete: ' + provenanceMissing.join(', ') + '.' : 'Keep the source and method attached when you share the map.',
      provenanceMissing.length === 0 ? 1 : provenanceMissing.length >= 3 ? 0 : 0.55);
    var missingRows = rows.filter(function (row) { return !Number.isFinite(Number(row.lat)) || !Number.isFinite(Number(row.lon)) || !Number.isFinite(Number(row.value)); }).length;
    var missingTime = timeRows.filter(function (row) { return !String(row.name || '').trim() || !Number.isFinite(Number(row.year)) || !Number.isFinite(Number(row.value)); }).length;
    var missingTotal = missingRows + missingTime;
    add('missingness', 'Missing and invalid values', missingTotal === 0 ? 'pass' : 'warning',
      missingTotal ? missingTotal + ' point or time-series row' + (missingTotal === 1 ? ' needs' : 's need') + ' review.' : 'All imported and time-series rows have the expected numeric fields.',
      missingTotal ? 'Remove, repair, or explain missing values before comparing locations or years.' : 'Still check whether zero and blank mean different things in the source.',
      missingTotal === 0 ? 1 : 0.45);
    var units = timeRows.map(function (row) { return String(row.unit || '').trim(); }).filter(function (value, index, all) { return value && all.indexOf(value) === index; });
    var unitStatus = units.length > 1 ? 'warning' : 'pass';
    add('units', 'Units and definitions', unitStatus,
      units.length > 1 ? 'The time-series rows use multiple units: ' + units.join(', ') + '.' : units.length === 1 ? 'Time-series rows use ' + units[0] + '.' : 'No conflicting time-series units detected.',
      units.length > 1 ? 'Do not compare values until the units and definitions are aligned.' : 'Record the unit explicitly in the provenance manifest.', units.length > 1 ? 0.45 : 1);
    var privacyStatus = privacy.highPrecision || privacy.identifierWarnings ? 'warning' : 'pass';
    add('privacy', 'Coordinate privacy', privacyStatus,
      privacy.highPrecision || privacy.identifierWarnings ? privacy.highPrecision + ' high-precision row' + (privacy.highPrecision === 1 ? '' : 's') + ' and ' + privacy.identifierWarnings + ' identifier-like label' + (privacy.identifierWarnings === 1 ? '' : 's') + ' need review.' : 'No high-precision or identifier-like coordinate risks detected.',
      privacyStatus === 'warning' ? 'Round or aggregate sensitive locations, then review labels separately.' : 'Keep student or household locations aggregated.', privacyStatus === 'warning' ? 0.45 : 1);
    var remoteStatus = remote.masked > 0 ? 'warning' : 'pass';
    add('imagery', 'Imagery quality', remoteStatus,
      remote.masked > 0 ? remote.masked + ' of ' + remote.total + ' illustrative pixels are cloud-masked.' : 'No masked pixels are affecting the current illustrative scene.',
      remoteStatus === 'warning' ? 'Keep masked pixels out of statistics and avoid explaining their surface class.' : 'Record dates, resolution, and sensor before interpreting imagery.', remoteStatus === 'warning' ? 0.55 : 1);
    var composerStatus = Number(composer.errors || 0) > 0 ? 'error' : Number(composer.warnings || 0) > 0 ? 'warning' : 'pass';
    add('cartography', 'Map communication', composerStatus,
      composerStatus === 'pass' ? 'Composer checks pass.' : composer.errors + ' required map fix' + (composer.errors === 1 ? '' : 'es') + ' and ' + composer.warnings + ' recommendation' + (composer.warnings === 1 ? '' : 's') + ' remain.',
      composerStatus === 'pass' ? 'Keep the table twin and map description with the export.' : 'Resolve required map checks before sharing a polished map.', composerStatus === 'pass' ? 1 : composerStatus === 'error' ? 0 : 0.6);
    var storyStatus = story.frames === 0 ? 'warning' : story.percent === 100 ? 'pass' : 'warning';
    add('interpretation', 'Interpretation trail', storyStatus,
      story.frames === 0 ? 'No Story Map frames have been captured yet.' : story.frames + ' Story Map frame' + (story.frames === 1 ? '' : 's') + '; ' + story.complete + ' of ' + story.total + ' reflection checks complete.',
      storyStatus === 'pass' ? 'Keep the claim, evidence, and limitation visible together.' : 'Add an observation, evidence note, and limitation before treating a pattern as a conclusion.', storyStatus === 'pass' ? 1 : 0.5);
    var points = checks.reduce(function (sum, item) { return sum + item.points; }, 0);
    var score = Math.round(points / checks.length * 100);
    var errors = checks.filter(function (item) { return item.status === 'error'; }).length;
    var warnings = checks.filter(function (item) { return item.status === 'warning'; }).length;
    return { score: score, checks: checks, errors: errors, warnings: warnings, ready: errors === 0, reviewed: normalizeQualityReviewState(model.reviewState), summary: errors ? 'Resolve required checks before sharing.' : warnings ? 'Ready for a careful review of the highlighted limitations.' : 'Evidence package is ready for sharing.' };
  }

  function buildDataQualityReport(model) {
    model = model || {};
    var review = model.review || buildDataQualityReview(model);
    var checked = normalizeQualityReviewState(model.reviewState || review.reviewed);
    var checklist = [['privacy', 'Coordinate privacy reviewed'], ['missingness', 'Missing values reviewed'], ['provenance', 'Provenance completed'], ['interpretation', 'Interpretation limits recorded']].map(function (item) {
      return '<li>' + (checked[item[0]] ? 'Complete: ' : 'Not yet: ') + escapeHTML(item[1]) + '</li>';
    }).join('');
    var rows = review.checks.map(function (item) {
      return '<tr><th scope="row">' + escapeHTML(item.label) + '</th><td>' + escapeHTML(item.status.toUpperCase()) + '</td><td>' + escapeHTML(item.message) + '</td><td>' + escapeHTML(item.recommendation) + '</td></tr>';
    }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GIS Studio Data Quality Review</title><style>' +
      'body{margin:0;background:#eef4f3;color:#172033;font:16px/1.55 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:30px}header,section{background:#fff;border:1px solid #b7c8c6;border-radius:14px;padding:20px;margin-bottom:16px}header{border-top:8px solid #0f766e}h1{margin:.15rem 0}h2{color:#0f5f5a}.score{font-size:2.1rem;font-weight:900;color:#0f766e}.callout{border-left:5px solid #d97706;background:#fff7ed;padding:14px}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:800;padding:.5rem 0}th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.actions button{padding:10px 14px}@media print{body{background:#fff}.actions{display:none}main{padding:0}header,section{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p>GIS STUDIO</p><h1>Data Quality and Uncertainty Review</h1><p>Use this review before treating a mapped pattern as a conclusion. It separates data readiness from interpretation confidence.</p><p class="score">' + review.score + '/100</p><p>' + escapeHTML(review.summary) + ' ' + review.errors + ' required check' + (review.errors === 1 ? '' : 's') + '; ' + review.warnings + ' highlighted limitation' + (review.warnings === 1 ? '' : 's') + '.</p></header>' +
      '<div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div><section><h2>Review checklist</h2><ul>' + checklist + '</ul></section><section class="callout"><h2>Evidence readiness</h2><p>This score is a teaching aid, not a statistical confidence interval. A passing check means the project records a safeguard; it does not prove that the data are accurate or representative.</p></section><section><h2>Accessible quality table</h2><div class="table-wrap"><table><caption>Quality checks, messages, and next actions</caption><thead><tr><th scope="col">Check</th><th scope="col">Status</th><th scope="col">What GIS Studio found</th><th scope="col">Next action</th></tr></thead><tbody>' + rows + '</tbody></table></div></section><section><h2>Method and limitations</h2><p>Review the original source, collection method, units, coordinate precision, missing records, map projection, imagery dates, and any cloud mask. Spatial association remains descriptive until additional evidence supports an explanation.</p></section></main></body></html>';
  }

  function buildInvestigationPacketReport(model) {
    model = model || {};
    var story = normalizeStoryMap(model.storyMap || model.story || {});
    var review = model.qualityReview || buildDataQualityReview(model);
    var provenance = normalizeProvenance(model.provenance);
    var generated = String(model.generated || new Date().toLocaleString());
    var rows = Array.isArray(model.rows) ? model.rows.slice(0, 120) : [];
    var firstFrame = story.slides[0] || {};
    var claim = String(model.claim || firstFrame.narrative || story.subtitle || 'Add a claim after reviewing the evidence sequence.');
    var frameMarkup = story.slides.length ? story.slides.map(function (frame, index) {
      return '<li><article><p class="kicker">EVIDENCE ' + (index + 1) + '</p><h3>' + escapeHTML(frame.title) + '</h3>' +
        '<p class="meta">' + escapeHTML(frame.view + (frame.metric ? ' • ' + frame.metric : '')) + '</p>' +
        '<p><strong>Observation:</strong> ' + escapeHTML(frame.narrative || 'Not recorded.') + '</p>' +
        '<p><strong>Evidence:</strong> ' + escapeHTML(frame.evidence || 'Not recorded.') + '</p>' +
        '<p><strong>Limitation:</strong> ' + escapeHTML(frame.limitation || 'Not recorded.') + '</p></article></li>';
    }).join('') : '<li><article><p>No Story Map frames have been captured yet.</p></article></li>';
    var qualityRows = review.checks.map(function (item) {
      return '<tr><th scope="row">' + escapeHTML(item.label) + '</th><td>' + escapeHTML(item.status.toUpperCase()) + '</td><td>' + escapeHTML(item.message) + '</td><td>' + escapeHTML(item.recommendation) + '</td></tr>';
    }).join('');
    var dataRows = rows.map(function (row) {
      return '<tr><th scope="row">' + escapeHTML(row.name || 'Record') + '</th><td>' + escapeHTML(row.geometry || 'Point') + '</td><td>' + escapeHTML(row.value == null ? '' : String(row.value)) + '</td></tr>';
    }).join('');
    var progress = storyMapProgress(story);
    var plan = normalizeInquiryPlan(model.inquiryPlan || {});
    var planProgress = inquiryPlanProgress(plan);
    var teacherReview = normalizeTeacherReview(model.teacherReview || {});
    var teacherProgress = teacherReviewProgress(teacherReview);
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GIS Studio Investigation Packet</title><style>' +
      'body{margin:0;background:#eef4f3;color:#172033;font:16px/1.55 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:30px}header,section,article{background:#fff;border:1px solid #b7c8c6;border-radius:14px;padding:20px;margin-bottom:16px}header{border-top:8px solid #0f766e}h1{margin:.15rem 0}h2{color:#0f5f5a}h3{margin-bottom:4px}.kicker{color:#0f766e;font-weight:900;letter-spacing:.1em;font-size:.75rem}.meta{color:#52636f;font-size:.9rem}.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.stat{background:#ecfeff;border-radius:10px;padding:12px}.trail{padding-left:24px}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:800;padding:.5rem 0}th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.callout{border-left:5px solid #d97706;background:#fff7ed;padding:14px}.actions button{padding:10px 14px}@media print{body{background:#fff}.actions{display:none}main{padding:0}header,section,article{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p class="kicker">GIS STUDIO INVESTIGATION PACKET</p><h1>' + escapeHTML(model.title || 'Untitled GIS investigation') + '</h1><p>' + escapeHTML(story.subtitle) + '</p><p class="meta">Generated ' + escapeHTML(generated) + '. Teacher handoff format: claim, evidence sequence, quality review, and next questions in one accessible document.</p></header>' +
      '<div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div><section><h2>Investigation at a glance</h2><div class="hero"><div class="stat"><strong>' + escapeHTML(String(review.score)) + '/100</strong><br>evidence readiness</div><div class="stat"><strong>' + progress.frames + '</strong><br>evidence frames</div><div class="stat"><strong>' + progress.complete + '/' + progress.total + '</strong><br>reflection checks</div><div class="stat"><strong>' + escapeHTML(provenance.source || 'Not specified') + '</strong><br>source</div></div><div class="callout"><strong>Working claim:</strong> ' + escapeHTML(claim) + '</div></section>' +
      '<section><h2>Accessible evidence sequence</h2><ol class="trail">' + frameMarkup + '</ol></section>' +
      '<section><h2>Quality and uncertainty review</h2><p>' + escapeHTML(review.summary) + ' ' + review.errors + ' required check' + (review.errors === 1 ? '' : 's') + '; ' + review.warnings + ' highlighted limitation' + (review.warnings === 1 ? '' : 's') + '.</p><div class="table-wrap"><table><caption>Quality checks and next actions</caption><thead><tr><th scope="col">Check</th><th scope="col">Status</th><th scope="col">Finding</th><th scope="col">Next action</th></tr></thead><tbody>' + qualityRows + '</tbody></table></div></section>' +
      (rows.length ? '<section><h2>Data-table twin</h2><div class="table-wrap"><table><caption>Mapped records referenced by this packet</caption><thead><tr><th scope="col">Record</th><th scope="col">Geometry</th><th scope="col">Value</th></tr></thead><tbody>' + dataRows + '</tbody></table></div></section>' : '') +
      '<section><h2>Investigation plan</h2><p><strong>Question:</strong> ' + escapeHTML(plan.question) + '</p><p><strong>Working claim:</strong> ' + escapeHTML(plan.claim || 'Not written yet.') + '</p><p><strong>Evidence plan:</strong> ' + escapeHTML(plan.evidencePlan) + '</p><p><strong>Alternative explanation:</strong> ' + escapeHTML(plan.alternative) + '</p><p><strong>Next step:</strong> ' + escapeHTML(plan.nextStep) + '</p><p>' + planProgress.complete + ' of ' + planProgress.total + ' planning checks complete.</p></section>' +
      '<section><h2>Teacher review</h2><p><strong>Reviewer:</strong> ' + escapeHTML(teacherReview.reviewer || 'Not named') + ' &middot; <strong>Status:</strong> ' + escapeHTML(teacherReview.status) + ' &middot; <strong>Rubric score:</strong> ' + teacherProgress.points + '/' + teacherProgress.max + '</p><p>' + escapeHTML(teacherReview.overall || 'No teacher feedback recorded yet.') + '</p><p><strong>Next revision:</strong> ' + escapeHTML(teacherReview.nextRevision || 'No next revision recorded yet.') + '</p></section>' +
      '<section><h2>Sources, method, and handoff questions</h2><dl><dt><strong>Dataset</strong></dt><dd>' + escapeHTML(provenance.datasetTitle || 'Not specified') + '</dd><dt><strong>Source</strong></dt><dd>' + escapeHTML(provenance.source || 'Not specified') + '</dd><dt><strong>Method</strong></dt><dd>' + escapeHTML(provenance.method || 'Not specified') + '</dd><dt><strong>Limitations</strong></dt><dd>' + escapeHTML(provenance.limitations || 'Not specified') + '</dd></dl><p><strong>Next questions:</strong> What additional date, field observation, comparison group, or source would make the working claim more trustworthy?</p><p>This packet organizes evidence; it does not turn spatial association into causation.</p></section></main></body></html>';
  }

  var GIS_INQUIRY_TEMPLATES = {
    distribution: { label: 'Distribution', question: 'Where is this metric clustered, and where is it sparse?', claim: '', evidencePlan: 'Map the metric, compare high and low locations, and describe the spatial pattern.', alternative: 'Could a different boundary, unit, or sampling method create this pattern?', nextStep: 'Compare the same metric with a second source or a nearby year.' },
    comparison: { label: 'Comparison', question: 'How do two mapped measures differ across the same places?', claim: '', evidencePlan: 'Use synchronized maps and a table twin to compare the same locations and units.', alternative: 'Could the measures use different definitions, scales, or collection methods?', nextStep: 'Align units and definitions, then test the strongest contrast.' },
    change: { label: 'Change over time', question: 'Which places changed most between the baseline and focus years?', claim: '', evidencePlan: 'Compare paired years, inspect missing locations, and report absolute and percent change.', alternative: 'Could a policy, seasonal effect, or data-definition change explain the difference?', nextStep: 'Add an intermediate year or an independent time-series source.' },
    impact: { label: 'Human-environment impact', question: 'What spatial relationship might connect people, infrastructure, and the environment?', claim: '', evidencePlan: 'Layer a human measure with an environmental measure and identify overlap without claiming causation.', alternative: 'Could access, exposure, or boundary placement explain the relationship instead?', nextStep: 'Add field observations or a comparison area with similar conditions.' },
    remote: { label: 'Remote sensing', question: 'What land-cover or spectral change is visible between matched scenes?', claim: '', evidencePlan: 'Check dates, clouds, resolution, index formula, and the accessible pixel table before interpreting change.', alternative: 'Could clouds, mixed pixels, phenology, or sensor conditions explain the signal?', nextStep: 'Verify with another date, field evidence, or a higher-resolution source.' }
  };

  function normalizeInquiryPlan(value) {
    value = value || {};
    var template = Object.prototype.hasOwnProperty.call(GIS_INQUIRY_TEMPLATES, value.template) ? value.template : 'distribution';
    var defaults = GIS_INQUIRY_TEMPLATES[template];
    var checklist = value.checklist && typeof value.checklist === 'object' ? value.checklist : {};
    return {
      template: template,
      question: String(value.question == null ? defaults.question : value.question).slice(0, 500),
      claim: String(value.claim || defaults.claim).slice(0, 1500),
      evidencePlan: String(value.evidencePlan == null ? defaults.evidencePlan : value.evidencePlan).slice(0, 1500),
      alternative: String(value.alternative == null ? defaults.alternative : value.alternative).slice(0, 1500),
      nextStep: String(value.nextStep == null ? defaults.nextStep : value.nextStep).slice(0, 1500),
      checklist: { question: !!checklist.question, evidence: !!checklist.evidence, alternative: !!checklist.alternative, nextStep: !!checklist.nextStep }
    };
  }

  function inquiryPlanProgress(value) {
    var plan = normalizeInquiryPlan(value), keys = ['question', 'evidence', 'alternative', 'nextStep'];
    var complete = keys.filter(function (key) { return plan.checklist[key]; }).length;
    return { complete: complete, total: keys.length, percent: Math.round(complete / keys.length * 100), ready: complete === keys.length };
  }

  var GIS_TEACHER_RUBRIC = [
    { id: 'question', label: 'Question and claim', prompt: 'Is the question specific, spatial, and open to evidence?' },
    { id: 'evidence', label: 'Evidence sequence', prompt: 'Does the map, table, and Story Map support the claim?' },
    { id: 'quality', label: 'Data quality', prompt: 'Are provenance, units, missingness, and privacy addressed?' },
    { id: 'limitations', label: 'Limitations and next steps', prompt: 'Does the investigation name uncertainty and a useful next step?' }
  ];

  function normalizeTeacherReview(value) {
    value = value || {};
    var ratings = value.ratings && typeof value.ratings === 'object' ? value.ratings : {};
    var normalized = {};
    GIS_TEACHER_RUBRIC.forEach(function (item) { var rating = Number(ratings[item.id]); normalized[item.id] = Number.isFinite(rating) ? Math.max(0, Math.min(3, Math.round(rating))) : 0; });
    var statuses = ['draft', 'revise', 'ready'];
    return {
      reviewer: String(value.reviewer || '').slice(0, 160),
      status: statuses.indexOf(value.status) >= 0 ? value.status : 'draft',
      overall: String(value.overall || '').slice(0, 2000),
      nextRevision: String(value.nextRevision || '').slice(0, 1500),
      ratings: normalized,
      reviewedAt: String(value.reviewedAt || '').slice(0, 80)
    };
  }

  function teacherReviewProgress(value) {
    var review = normalizeTeacherReview(value), total = GIS_TEACHER_RUBRIC.length;
    var rated = GIS_TEACHER_RUBRIC.filter(function (item) { return review.ratings[item.id] > 0; }).length;
    var points = GIS_TEACHER_RUBRIC.reduce(function (sum, item) { return sum + review.ratings[item.id]; }, 0);
    return { rated: rated, total: total, points: points, max: total * 3, percent: Math.round(points / (total * 3) * 100), ready: review.status === 'ready' && rated === total && !!review.overall.trim() };
  }

  function buildTeacherReviewReport(model) {
    model = model || {};
    var review = normalizeTeacherReview(model.review || model), progress = teacherReviewProgress(review);
    var rubricRows = GIS_TEACHER_RUBRIC.map(function (item) { return '<tr><th scope="row">' + escapeHTML(item.label) + '</th><td>' + review.ratings[item.id] + ' / 3</td><td>' + escapeHTML(item.prompt) + '</td></tr>'; }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GIS Studio Teacher Review</title><style>' +
      'body{margin:0;background:#eef4f3;color:#172033;font:16px/1.55 system-ui,sans-serif}main{max-width:900px;margin:auto;padding:30px}header,section{background:#fff;border:1px solid #b7c8c6;border-radius:14px;padding:20px;margin-bottom:16px}header{border-top:8px solid #0f766e}h1{margin:.15rem 0}h2{color:#0f5f5a}.score{font-size:2rem;font-weight:900;color:#0f766e}.callout{border-left:5px solid #d97706;background:#fff7ed;padding:14px}table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:800;padding:.5rem 0}th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.actions button{padding:10px 14px}@media print{body{background:#fff}.actions{display:none}main{padding:0}header,section{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p>GIS STUDIO</p><h1>Teacher Review</h1><p>Reviewer: ' + escapeHTML(review.reviewer || 'Not named') + '. Status: ' + escapeHTML(review.status) + '.</p><p class="score">' + progress.points + ' / ' + progress.max + '</p><p>' + progress.rated + ' of ' + progress.total + ' rubric areas rated.</p></header><div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div><section><h2>Overall feedback</h2><p>' + escapeHTML(review.overall || 'No overall feedback recorded yet.') + '</p><p><strong>Next revision:</strong> ' + escapeHTML(review.nextRevision || 'No next revision recorded yet.') + '</p></section><section><h2>Accessible rubric table</h2><table><caption>Teacher review rubric</caption><thead><tr><th scope="col">Area</th><th scope="col">Rating</th><th scope="col">Prompt</th></tr></thead><tbody>' + rubricRows + '</tbody></table></section><section class="callout"><h2>Review meaning</h2><p>Ratings guide revision and conversation; they are not a grade substitute or a claim that the mapped data are correct. Recheck the source and limitations before making decisions.</p></section></main></body></html>';
  }

  function normalizeJoinKey(value, options) {
    var text = String(value == null ? '' : value).trim();
    try { text = text.normalize('NFC'); } catch (ignoreNormalization) {}
    var locale = options && options.locale ? canonicalGISLocale(options.locale) : '';
    try { text = locale ? text.toLocaleLowerCase(locale) : text.toLowerCase(); }
    catch (ignoreLocaleCase) { text = text.toLowerCase(); }
    text = text.replace(/&/g, ' and ');
    try { text = text.replace(new RegExp('[^\\p{L}\\p{N}]+', 'gu'), ' '); }
    catch (ignoreUnicodeProperties) { text = text.replace(/[^a-z0-9\u00C0-\uFFFF]+/gi, ' '); }
    return text.replace(/\s+/g, ' ').trim();
  }

  function joinTableToGeoJSON(geoData, rows, geoKey, csvKey, valueKey, options) {
    if (!geoData || !Array.isArray(geoData.features)) throw new Error('Load a GeoJSON layer before joining data.');
    if (!geoKey || !csvKey || !valueKey) throw new Error('Choose both match fields and a numeric value field.');
    var lookup = Object.create(null), duplicates = [];
    rows.forEach(function (row) {
      var key = normalizeJoinKey(row[csvKey]);
      if (!key) return;
      if (lookup[key]) duplicates.push(String(row[csvKey]));
      else lookup[key] = row;
    });
    var used = Object.create(null), unmatchedGeo = [], matched = 0;
    var metric = 'joined_' + normalizeJoinKey(valueKey, options).replace(/\s+/g, '_');
    if (!metric || metric === 'joined_') metric = 'joined_value';
    var features = geoData.features.map(function (feature, index) {
      var properties = Object.assign({}, feature.properties || {});
      var rawGeoKey = properties[geoKey];
      var key = normalizeJoinKey(rawGeoKey);
      var row = key && lookup[key];
      var joinedValue = row ? parseGISNumber(row[valueKey], options) : NaN;
      if (row && Number.isFinite(joinedValue)) {
        properties[metric] = joinedValue;
        used[key] = true;
        matched += 1;
      } else {
        properties[metric] = null;
        unmatchedGeo.push(String(rawGeoKey == null ? 'Feature ' + (index + 1) : rawGeoKey));
      }
      return Object.assign({}, feature, { properties: properties });
    });
    var unmatchedCSV = Object.keys(lookup).filter(function (key) { return !used[key]; })
      .map(function (key) { return String(lookup[key][csvKey]); });
    return {
      data: { type: 'FeatureCollection', features: features },
      metric: metric,
      matched: matched,
      unmatchedCSV: unmatchedCSV,
      unmatchedGeo: unmatchedGeo,
      duplicates: duplicates
    };
  }

  function jenksThresholds(values, classCount) {
    var data = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (data.length < 2) return [];
    var classes = Math.max(2, Math.min(classCount, data.length));
    var lower = [], variance = [], i, j;
    for (i = 0; i <= data.length; i += 1) {
      lower[i] = new Array(classes + 1).fill(0);
      variance[i] = new Array(classes + 1).fill(Infinity);
    }
    for (i = 1; i <= classes; i += 1) {
      lower[1][i] = 1;
      variance[1][i] = 0;
    }
    for (var length = 2; length <= data.length; length += 1) {
      var sum = 0, sumSquares = 0, weight = 0, currentVariance = 0;
      for (var offset = 1; offset <= length; offset += 1) {
        var lowerLimit = length - offset + 1;
        var value = data[lowerLimit - 1];
        weight += 1;
        sum += value;
        sumSquares += value * value;
        currentVariance = sumSquares - (sum * sum) / weight;
        var previous = lowerLimit - 1;
        if (previous !== 0) {
          for (j = 2; j <= classes; j += 1) {
            if (variance[length][j] >= currentVariance + variance[previous][j - 1]) {
              lower[length][j] = lowerLimit;
              variance[length][j] = currentVariance + variance[previous][j - 1];
            }
          }
        }
      }
      lower[length][1] = 1;
      variance[length][1] = currentVariance;
    }
    var boundaries = new Array(classes + 1);
    boundaries[0] = data[0];
    boundaries[classes] = data[data.length - 1];
    var k = data.length;
    for (var count = classes; count > 1; count -= 1) {
      var boundaryIndex = Math.max(0, Math.floor(lower[k][count]) - 2);
      boundaries[count - 1] = data[boundaryIndex];
      k = Math.max(1, Math.floor(lower[k][count]) - 1);
    }
    return boundaries.slice(1, -1).filter(function (value, index, all) {
      return Number.isFinite(value) && (index === 0 || value > all[index - 1]);
    });
  }

  function calculateBreaks(values, method, classCount, customText) {
    var sorted = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (sorted.length < 2) return [];
    var classes = Math.max(3, Math.min(7, Number(classCount) || 5));
    if (method === 'custom') {
      var custom = String(customText || '').split(',').map(Number).filter(Number.isFinite)
        .sort(function (a, b) { return a - b; })
        .filter(function (value, index, all) { return index === 0 || value > all[index - 1]; });
      if (custom.length) return custom.slice(0, 6);
    }
    if (method === 'jenks') return jenksThresholds(sorted, classes);
    var thresholds = [];
    if (method === 'quantile') {
      for (var q = 1; q < classes; q += 1) thresholds.push(sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length / classes) - 1)]);
    } else {
      var min = sorted[0], max = sorted[sorted.length - 1];
      for (var e = 1; e < classes; e += 1) thresholds.push(min + (max - min) * e / classes);
    }
    return thresholds.filter(function (value, index, all) { return index === 0 || value > all[index - 1]; });
  }

  function toFiniteNumber(value) {
    return value === null || value === '' || value === undefined ? NaN : Number(value);
  }

  function paletteForClasses(classTotal) {
    var total = Math.max(3, Math.min(7, Number(classTotal) || 5));
    var palette = [];
    for (var index = 0; index < total; index += 1) {
      palette.push(CLASS_COLORS[Math.round(index * (CLASS_COLORS.length - 1) / Math.max(1, total - 1))]);
    }
    return palette;
  }

  function classColor(value, thresholds) {
    var numeric = toFiniteNumber(value);
    if (!Number.isFinite(numeric)) return '#475569';
    var index = 0;
    while (index < thresholds.length && numeric > thresholds[index]) index += 1;
    var palette = paletteForClasses(thresholds.length + 1);
    return palette[Math.min(index, palette.length - 1)];
  }

  var EARTH_RADIUS_KM = 6371.0088;

  function mapPoint(point) {
    if (Array.isArray(point)) return { lat: Number(point[1]), lon: Number(point[0]) };
    return { lat: Number(point && point.lat), lon: Number(point && (point.lon != null ? point.lon : point.lng)) };
  }

  function haversineKm(first, second) {
    var a = mapPoint(first), b = mapPoint(second);
    if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return NaN;
    var radians = Math.PI / 180;
    var dLat = (b.lat - a.lat) * radians;
    var dLon = (b.lon - a.lon) * radians;
    var sinLat = Math.sin(dLat / 2), sinLon = Math.sin(dLon / 2);
    var value = sinLat * sinLat + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * sinLon * sinLon;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
  }

  function pathLengthKm(points) {
    return (points || []).slice(1).reduce(function (sum, point, index) {
      var distance = haversineKm(points[index], point);
      return sum + (Number.isFinite(distance) ? distance : 0);
    }, 0);
  }

  function ringAreaSquareKm(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return 0;
    var total = 0, radians = Math.PI / 180;
    for (var index = 0; index < ring.length; index += 1) {
      var current = mapPoint(ring[index]);
      var next = mapPoint(ring[(index + 1) % ring.length]);
      var dLon = (next.lon - current.lon) * radians;
      if (dLon > Math.PI) dLon -= Math.PI * 2;
      if (dLon < -Math.PI) dLon += Math.PI * 2;
      total += dLon * (2 + Math.sin(current.lat * radians) + Math.sin(next.lat * radians));
    }
    return Math.abs(total * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2);
  }

  function polygonAreaSquareKm(coordinates) {
    if (!Array.isArray(coordinates) || !coordinates.length) return 0;
    return Math.max(0, ringAreaSquareKm(coordinates[0]) - coordinates.slice(1).reduce(function (sum, ring) {
      return sum + ringAreaSquareKm(ring);
    }, 0));
  }

  function pointInRing(point, ring) {
    var p = mapPoint(point), inside = false;
    if (!Array.isArray(ring) || ring.length < 3 || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    var mappedRing = ring.map(mapPoint);
    var ringArc = minimalLongitudeArc(mappedRing.map(function (vertex) { return vertex.lon; }));
    var queryLongitude = unwrapLongitudeForArc(p.lon, ringArc);
    for (var i = 0, j = mappedRing.length - 1; i < mappedRing.length; j = i, i += 1) {
      var a = mappedRing[i], b = mappedRing[j];
      var aLongitude = unwrapLongitudeForArc(a.lon, ringArc);
      var bLongitude = unwrapLongitudeForArc(b.lon, ringArc);
      var crosses = ((a.lat > p.lat) !== (b.lat > p.lat)) &&
        (queryLongitude < (bLongitude - aLongitude) * (p.lat - a.lat) / ((b.lat - a.lat) || Number.EPSILON) + aLongitude);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function pointInFeature(point, feature) {
    var geometry = feature && feature.geometry;
    if (!geometry) return false;
    function inPolygon(polygon) {
      return polygon.length > 0 && pointInRing(point, polygon[0]) &&
        !polygon.slice(1).some(function (hole) { return pointInRing(point, hole); });
    }
    if (geometry.type === 'Polygon') return inPolygon(geometry.coordinates || []);
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).some(inPolygon);
    return false;
  }

  function selectPointsInFeature(records, feature) {
    var selected = [];
    (records || []).forEach(function (record, index) {
      if (pointInFeature(record, feature)) selected.push(index);
    });
    return selected;
  }

  function selectWithinRadius(records, center, radiusKm) {
    var selected = [], radius = Math.max(0, Number(radiusKm) || 0);
    (records || []).forEach(function (record, index) {
      if (haversineKm(center, record) <= radius) selected.push(index);
    });
    return selected;
  }

  function nearestRecord(records, point) {
    var best = null;
    (records || []).forEach(function (record, index) {
      var distanceKm = haversineKm(point, record);
      if (Number.isFinite(distanceKm) && (!best || distanceKm < best.distanceKm)) {
        best = { index: index, record: record, distanceKm: distanceKm };
      }
    });
    return best;
  }

  function featureMeasurements(feature) {
    var geometry = feature && feature.geometry;
    var result = { areaSquareKm: 0, perimeterKm: 0, lengthKm: 0 };
    if (!geometry) return result;
    if (geometry.type === 'LineString') result.lengthKm = pathLengthKm(geometry.coordinates || []);
    if (geometry.type === 'MultiLineString') {
      result.lengthKm = (geometry.coordinates || []).reduce(function (sum, line) { return sum + pathLengthKm(line); }, 0);
    }
    if (geometry.type === 'Polygon') {
      result.areaSquareKm = polygonAreaSquareKm(geometry.coordinates || []);
      result.perimeterKm = (geometry.coordinates || []).reduce(function (sum, ring) { return sum + pathLengthKm(ring); }, 0);
    }
    if (geometry.type === 'MultiPolygon') {
      (geometry.coordinates || []).forEach(function (polygon) {
        result.areaSquareKm += polygonAreaSquareKm(polygon);
        result.perimeterKm += polygon.reduce(function (sum, ring) { return sum + pathLengthKm(ring); }, 0);
      });
    }
    return result;
  }

  // ── Offline schematic projection ────────────────────────────────────────────
  // Every map view in this tool needs Leaflet from unpkg plus raster tiles from
  // OpenStreetMap or Esri, so the map only exists if the network allows three
  // third-party origins — and each pan/zoom tells those origins WHERE the class is
  // looking, which for imported classroom points is approximately where the points
  // are. This projection lets the same data be drawn locally, with no request of any
  // kind: it powers both the new "no basemap" choice and the already-handled case
  // where the CDN is blocked, which until now offered only a table.
  //
  // Equirectangular with a cos(lat) correction on longitude, so shapes are not
  // stretched at Maine latitudes. It is a schematic, not a navigation projection,
  // and the UI says so — the same honesty the printed evidence report already uses.
  function normalizeLongitude(value) {
    var longitude = Number(value);
    if (!Number.isFinite(longitude)) return NaN;
    var normalized = ((longitude + 180) % 360 + 360) % 360 - 180;
    return Object.is(normalized, -0) ? 0 : normalized;
  }

  function minimalLongitudeArc(longitudes) {
    var values = (longitudes || []).map(normalizeLongitude).filter(Number.isFinite);
    if (!values.length) return { west: -180, east: 180, center: 0, span: 360, crossesAntimeridian: false, westUnwrapped: -180, eastUnwrapped: 180 };
    var sorted = values.map(function (value) { return value < 0 ? value + 360 : value; }).sort(function (a, b) { return a - b; });
    if (sorted.length === 1) {
      var only = normalizeLongitude(sorted[0]);
      return { west: only, east: only, center: only, span: 0, crossesAntimeridian: false, westUnwrapped: only, eastUnwrapped: only };
    }
    var largestGap = -1, gapIndex = 0;
    sorted.forEach(function (value, index) {
      var next = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
      var gap = next - value;
      if (gap > largestGap) { largestGap = gap; gapIndex = index; }
    });
    var start360 = sorted[(gapIndex + 1) % sorted.length];
    var span = Math.max(0, 360 - largestGap);
    var west = normalizeLongitude(start360);
    var east = normalizeLongitude(start360 + span);
    var center = normalizeLongitude(start360 + span / 2);
    return {
      west: west, east: east, center: center, span: span,
      crossesAntimeridian: span > 0 && west > east,
      westUnwrapped: west, eastUnwrapped: west + span
    };
  }

  function unwrapLongitudeForArc(value, arc) {
    var longitude = normalizeLongitude(value);
    if (!Number.isFinite(longitude) || !arc) return longitude;
    while (longitude < arc.westUnwrapped - 1e-9) longitude += 360;
    while (longitude > arc.westUnwrapped + 360) longitude -= 360;
    return longitude;
  }

  function dataViewport(points, options) {
    options = options || {};
    var valid = (points || []).map(function (point) {
      if (Array.isArray(point)) return { lat: Number(point[0]), lon: Number(point[1]) };
      point = point || {};
      return {
        lat: Number(point.lat == null ? point.latitude : point.lat),
        lon: Number(point.lon == null ? (point.lng == null ? point.longitude : point.lng) : point.lon)
      };
    }).filter(function (point) {
      return Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 && Number.isFinite(point.lon);
    });
    if (!valid.length) {
      var fallbackCenter = Array.isArray(options.center) ? options.center : [0, 0];
      return {
        center: [Number(fallbackCenter[0]) || 0, normalizeLongitude(fallbackCenter[1]) || 0],
        bounds: { south: Number(fallbackCenter[0]) || 0, west: normalizeLongitude(fallbackCenter[1]) || 0, north: Number(fallbackCenter[0]) || 0, east: normalizeLongitude(fallbackCenter[1]) || 0 },
        crossesAntimeridian: false, longitudeSpan: 0, latitudeSpan: 0, zoom: Number(options.zoom) || 2
      };
    }
    var latitudes = valid.map(function (point) { return point.lat; });
    var arc = minimalLongitudeArc(valid.map(function (point) { return point.lon; }));
    var south = Math.min.apply(Math, latitudes), north = Math.max.apply(Math, latitudes);
    var latitudeSpan = north - south;
    var midLatitude = (south + north) / 2;
    var adjustedLongitudeSpan = arc.span * Math.max(0.15, Math.cos(midLatitude * Math.PI / 180));
    var visibleSpan = Math.max(latitudeSpan, adjustedLongitudeSpan, 0.02);
    var calculatedZoom = Math.max(1, Math.min(16, Math.floor(Math.log(360 / visibleSpan) / Math.LN2) - 1));
    return {
      center: [midLatitude, arc.center],
      bounds: { south: south, west: arc.west, north: north, east: arc.east },
      crossesAntimeridian: arc.crossesAntimeridian, longitudeSpan: arc.span, latitudeSpan: latitudeSpan,
      zoom: Number.isFinite(Number(options.zoom)) ? Number(options.zoom) : calculatedZoom
    };
  }
  function leafletCenterForViewport(viewport, arc) {
    var center = viewport && Array.isArray(viewport.center) ? viewport.center.slice(0, 2) : [0, 0];
    if (arc && arc.crossesAntimeridian) center[1] = arc.westUnwrapped + arc.span / 2;
    return center;
  }

  function collectGISGeoJSONPoints(document) {
    var points = [];
    function coordinates(value) {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        points.push({ lon: Number(value[0]), lat: Number(value[1]) });
        return;
      }
      value.forEach(coordinates);
    }
    function geometry(value) {
      if (!value || typeof value !== 'object') return;
      if (value.type === 'GeometryCollection') {
        (value.geometries || []).forEach(geometry);
        return;
      }
      coordinates(value.coordinates);
    }
    function geoObject(value) {
      if (!value || typeof value !== 'object') return;
      if (value.type === 'FeatureCollection') {
        (value.features || []).forEach(geoObject);
      } else if (value.type === 'Feature') {
        geometry(value.geometry);
      } else {
        geometry(value);
      }
    }
    geoObject(document);
    return points;
  }

  function unwrapGISGeoJSONForArc(document, arc) {
    if (!document || !arc || !arc.crossesAntimeridian) return document;
    function coordinates(value) {
      if (!Array.isArray(value)) return value;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        return [unwrapLongitudeForArc(value[0], arc), Number(value[1])].concat(value.slice(2));
      }
      return value.map(coordinates);
    }
    function geometry(value) {
      if (!value || typeof value !== 'object') return value;
      if (value.type === 'GeometryCollection') {
        return Object.assign({}, value, { geometries: (value.geometries || []).map(geometry) });
      }
      return Object.assign({}, value, { coordinates: coordinates(value.coordinates) });
    }
    function geoObject(value) {
      if (!value || typeof value !== 'object') return value;
      if (value.type === 'FeatureCollection') {
        return Object.assign({}, value, { features: (value.features || []).map(geoObject) });
      }
      if (value.type === 'Feature') return Object.assign({}, value, { geometry: geometry(value.geometry) });
      return geometry(value);
    }
    return geoObject(document);
  }

  function schematicProjection(lonLatPoints, width, height, padding) {
    var w = Number(width) || 640, hgt = Number(height) || 390;
    var pad = padding == null ? 26 : padding;
    var pts = (lonLatPoints || []).map(mapPoint).filter(function (p) {
      return Number.isFinite(p.lat) && Number.isFinite(p.lon);
    });
    if (!pts.length) return null;
    var minLat = Math.min.apply(Math, pts.map(function (p) { return p.lat; }));
    var maxLat = Math.max.apply(Math, pts.map(function (p) { return p.lat; }));
    var longitudeArc = minimalLongitudeArc(pts.map(function (p) { return p.lon; }));
    var minLon = longitudeArc.westUnwrapped;
    var maxLon = longitudeArc.eastUnwrapped;
    // A single point (or a perfectly straight row of them) has zero extent in at
    // least one axis; give it a small window so it lands mid-canvas instead of
    // dividing by zero.
    if (maxLat - minLat < 1e-9) { minLat -= 0.05; maxLat += 0.05; }
    if (maxLon - minLon < 1e-9) { minLon -= 0.05; maxLon += 0.05; }
    var midLatRad = (minLat + maxLat) / 2 * Math.PI / 180;
    var lonScale = Math.max(0.15, Math.cos(midLatRad)); // guard the poles
    var spanX = (maxLon - minLon) * lonScale, spanY = maxLat - minLat;
    var usableW = Math.max(1, w - pad * 2), usableH = Math.max(1, hgt - pad * 2);
    // One scale for both axes keeps the aspect honest — an independently stretched
    // axis would misrepresent shape, which is the whole point of drawing a map.
    var scale = Math.min(usableW / spanX, usableH / spanY);
    var offsetX = pad + (usableW - spanX * scale) / 2;
    var offsetY = pad + (usableH - spanY * scale) / 2;
    return {
      width: w, height: hgt,
      bounds: { minLat: minLat, maxLat: maxLat, minLon: minLon, maxLon: maxLon },
      geographicExtent: { west: longitudeArc.west, east: longitudeArc.east, crossesAntimeridian: longitudeArc.crossesAntimeridian },
      project: function (lon, lat) {
        return {
          x: offsetX + (unwrapLongitudeForArc(lon, longitudeArc) - minLon) * lonScale * scale,
          y: offsetY + (maxLat - Number(lat)) * scale   // screen y grows downward
        };
      }
    };
  }

  // "Nice" round graticule steps, so the grid reads 0.5° / 1° / 2° rather than
  // whatever an even division of the data extent happens to produce.
  function graticuleStep(span) {
    var candidates = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30];
    for (var i = 0; i < candidates.length; i += 1) {
      if (span / candidates[i] <= 6) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function graticuleLines(bounds) {
    if (!bounds) return { lats: [], lons: [] };
    var latStep = graticuleStep(bounds.maxLat - bounds.minLat);
    var lonStep = graticuleStep(bounds.maxLon - bounds.minLon);
    var lats = [], lons = [], v;
    for (v = Math.ceil(bounds.minLat / latStep) * latStep; v <= bounds.maxLat + 1e-9; v += latStep) lats.push(Number(v.toFixed(6)));
    for (v = Math.ceil(bounds.minLon / lonStep) * lonStep; v <= bounds.maxLon + 1e-9; v += lonStep) lons.push(Number(v.toFixed(6)));
    return { lats: lats, lons: lons, latStep: latStep, lonStep: lonStep };
  }

  // Outer rings only — holes are not filled separately in the schematic, and the
  // measurement functions above remain the authority on area.
  function featureOuterRings(feature) {
    var geometry = feature && feature.geometry;
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return (geometry.coordinates || []).slice(0, 1);
    if (geometry.type === 'MultiPolygon') {
      return (geometry.coordinates || []).map(function (polygon) { return polygon[0]; }).filter(Boolean);
    }
    if (geometry.type === 'LineString') return [geometry.coordinates || []];
    if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
    return [];
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  var GIS_PROJECT_FORMAT = 'alloflow-gis-studio-project';
  var GIS_PROJECT_VERSION = 1;
  var GIS_DRAFT_KEY = 'alloflow_gis_studio_draft_v1';

  function normalizeProvenance(value) {
    value = value || {};
    return {
      datasetTitle: String(value.datasetTitle || '').slice(0, 200),
      source: String(value.source || '').slice(0, 500),
      collected: String(value.collected || '').slice(0, 100),
      units: String(value.units || '').slice(0, 100),
      method: String(value.method || '').slice(0, 1000),
      license: String(value.license || '').slice(0, 300),
      limitations: String(value.limitations || '').slice(0, 1500)
    };
  }

  function createGISProject(payload, savedAt) {
    payload = payload || {};
    return {
      format: GIS_PROJECT_FORMAT,
      version: GIS_PROJECT_VERSION,
      savedAt: String(savedAt || new Date().toISOString()),
      title: String(payload.title || 'Untitled GIS project').slice(0, 200),
      provenance: normalizeProvenance(payload.provenance),
      settings: payload.settings || {},
      data: payload.data || {},
      work: payload.work || {}
    };
  }

  function validateGISProject(project) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Project file must contain a JSON object.');
    if (project.format !== GIS_PROJECT_FORMAT) throw new Error('This is not a GIS Studio project file.');
    if (Number(project.version) !== GIS_PROJECT_VERSION) {
      throw new Error(Number(project.version) > GIS_PROJECT_VERSION ? 'This project was created by a newer GIS Studio version.' : 'This project version is not supported.');
    }
    var data = project.data && typeof project.data === 'object' ? project.data : {};
    var points = Array.isArray(data.importedRows) ? data.importedRows : [];
    if (points.length > 250) throw new Error('Project contains more than 250 coordinate records.');
    points.forEach(function (row) {
      if (!row || !Number.isFinite(Number(row.lat)) || Number(row.lat) < -90 || Number(row.lat) > 90 ||
        !Number.isFinite(Number(row.lon)) || Number(row.lon) < -180 || Number(row.lon) > 180 || !Number.isFinite(Number(row.value))) {
        throw new Error('Project contains an invalid coordinate record.');
      }
    });
    if (data.geoData) {
      var parsedGeo = parseGeoJSON(JSON.stringify(data.geoData));
      if (parsedGeo.data.features.length > 500) throw new Error('Project contains too many GeoJSON features.');
    }
    var rawComposer = project.work && project.work.composer;
    if (rawComposer) {
      if (rawComposer.annotations && (!Array.isArray(rawComposer.annotations) || rawComposer.annotations.length > 20)) {
        throw new Error('Project composer contains too many annotations.');
      }
      (rawComposer.annotations || []).forEach(function (annotation) {
        if (!annotation || !String(annotation.label || '').trim() || !Number.isFinite(Number(annotation.lat)) || Number(annotation.lat) < -90 || Number(annotation.lat) > 90 ||
          !Number.isFinite(Number(annotation.lon)) || Number(annotation.lon) < -180 || Number(annotation.lon) > 180) {
          throw new Error('Project composer contains an invalid annotation.');
        }
      });
    }
    var timeRows = data.timeDataset && Array.isArray(data.timeDataset.rows) ? data.timeDataset.rows : [];
    if (timeRows.length > 3000) throw new Error('Project contains more than 3,000 time-series records.');
    timeRows.forEach(function (row) {
      if (!row || !String(row.name || '').trim() || ![row.lat, row.lon, row.year, row.value].every(function (value) { return Number.isFinite(Number(value)); }) ||
        Number(row.lat) < -90 || Number(row.lat) > 90 || Number(row.lon) < -180 || Number(row.lon) > 180) {
        throw new Error('Project contains an invalid time-series record.');
      }
    });
    if (timeRows.length) {
      var years = timeRows.map(function (row) { return Number(row.year); }).filter(function (year, index, all) { return all.indexOf(year) === index; });
      if (years.length < 2) throw new Error('Saved time-series data need at least two years.');
    }
    return project;
  }

  function coordinatePrecision(value) {
    if (!Number.isFinite(Number(value))) return 0;
    var text = String(Math.abs(Number(value))).toLowerCase();
    if (text.indexOf('e-') >= 0) {
      var parts = text.split('e-');
      var exponent = Number(parts[1]) || 0;
      var fraction = (parts[0].split('.')[1] || '').length;
      return exponent + fraction;
    }
    return (text.split('.')[1] || '').length;
  }

  function assessCoordinatePrivacy(pointRows, timeRows) {
    var combined = (pointRows || []).map(function (row) { return { name: row.name, lat: row.lat, lon: row.lon, dataset: 'coordinate' }; })
      .concat((timeRows || []).map(function (row) { return { name: row.name, lat: row.lat, lon: row.lon, dataset: 'timeline' }; }));
    var precise = combined.filter(function (row) { return Math.max(coordinatePrecision(row.lat), coordinatePrecision(row.lon)) >= 4; });
    var identifierPattern = /(^|\b)(student|home|house|address|resident|child)(\b|$)|@/i;
    var identifiers = combined.filter(function (row) { return identifierPattern.test(String(row.name || '')); });
    return {
      total: combined.length,
      highPrecision: precise.length,
      identifierWarnings: identifiers.length,
      highPrecisionNames: precise.slice(0, 12).map(function (row) { return String(row.name || 'Unnamed point'); }),
      identifierNames: identifiers.slice(0, 12).map(function (row) { return String(row.name || 'Unnamed point'); })
    };
  }

  function roundPointCoordinates(rows, digits) {
    var places = Math.max(0, Math.min(5, Number(digits) || 0));
    var factor = Math.pow(10, places);
    return (rows || []).map(function (row) {
      return Object.assign({}, row, {
        lat: Math.round(Number(row.lat) * factor) / factor,
        lon: Math.round(Number(row.lon) * factor) / factor
      });
    });
  }

  function normalizeMapComposition(value) {
    value = value || {};
    var rawAnnotations = Array.isArray(value.annotations) ? value.annotations : [];
    var annotations = rawAnnotations.slice(0, 20).map(function (annotation, index) {
      return {
        id: String(annotation && annotation.id || 'annotation-' + (index + 1)).slice(0, 80),
        label: String(annotation && annotation.label || '').slice(0, 160),
        lat: Number(annotation && annotation.lat),
        lon: Number(annotation && annotation.lon)
      };
    }).filter(function (annotation) {
      return annotation.label.trim() && Number.isFinite(annotation.lat) && annotation.lat >= -90 && annotation.lat <= 90 &&
        Number.isFinite(annotation.lon) && annotation.lon >= -180 && annotation.lon <= 180;
    });
    return {
      title: String(value.title == null ? 'Maine spatial evidence map' : value.title).slice(0, 200),
      subtitle: String(value.subtitle == null ? 'GIS Studio classroom investigation' : value.subtitle).slice(0, 300),
      author: String(value.author || '').slice(0, 160),
      claim: String(value.claim || '').slice(0, 2000),
      altText: String(value.altText || '').slice(0, 2000),
      unit: String(value.unit || '').slice(0, 100),
      legendTitle: String(value.legendTitle || 'Mapped value').slice(0, 160),
      showLegend: value.showLegend !== false,
      annotations: annotations
    };
  }

  function suggestMapAltText(model) {
    model = model || {};
    var composition = normalizeMapComposition(model);
    var rows = (model.rows || []).filter(function (row) {
      return Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon)) && Number.isFinite(Number(row.value));
    });
    var title = composition.title.trim() || 'Untitled map';
    if (!rows.length) {
      return 'Schematic map titled "' + title + '" with no numeric point records currently visible. ' +
        composition.annotations.length + ' annotation' + (composition.annotations.length === 1 ? '' : 's') +
        ' are listed below the map.';
    }
    var sorted = rows.slice().sort(function (a, b) { return Number(b.value) - Number(a.value); });
    var low = sorted[sorted.length - 1], high = sorted[0];
    return 'Schematic map titled "' + title + '" showing ' + rows.length + ' locations for ' +
      String(model.metricLabel || composition.legendTitle || 'the mapped value') + '. ' +
      String(high.name || 'The highest location') + ' has the highest value, ' + high.value + ', while ' +
      String(low.name || 'the lowest location') + ' has the lowest value, ' + low.value + '. ' +
      composition.annotations.length + ' numbered annotation' + (composition.annotations.length === 1 ? '' : 's') +
      ' highlight evidence. Exact coordinates and values are provided in the table.';
  }

  function auditMapComposition(model) {
    model = model || {};
    var composition = normalizeMapComposition(model);
    var issues = [], passes = [];
    function issue(severity, id, message) { issues.push({ severity: severity, id: id, message: message }); }
    if (composition.title.trim().length < 4) issue('error', 'title', 'Add a specific map title.');
    else passes.push('Specific title included');
    if (composition.altText.trim().length < 40) issue('error', 'alt-text', 'Add a meaningful map description of at least 40 characters.');
    else passes.push('Map description included');
    if (composition.claim.trim().length < 20) issue('warning', 'claim', 'Add an evidence-based claim or takeaway.');
    else passes.push('Evidence claim included');
    if (!composition.showLegend) issue('warning', 'legend', 'Show a legend unless every symbol is explained directly.');
    else passes.push('Legend displayed');
    if (!String(model.unit || composition.unit || '').trim()) issue('warning', 'unit', 'Name the unit or state that the value is an index.');
    else passes.push('Unit identified');
    if (!String(model.source || '').trim()) issue('warning', 'source', 'Add a data source in the project provenance manifest.');
    else passes.push('Data source identified');
    if (!(model.rows || []).length) issue('warning', 'data', 'No point records are available for the composed map.');
    else passes.push('Map has a synchronized data-table twin');
    passes.push('Symbols use outlines and labels in addition to color');
    var errors = issues.filter(function (item) { return item.severity === 'error'; }).length;
    var warnings = issues.length - errors;
    return {
      issues: issues,
      passes: passes,
      errors: errors,
      warnings: warnings,
      score: Math.max(0, 100 - errors * 25 - warnings * 10)
    };
  }

  function niceScaleKilometers(maximum) {
    var candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
    var chosen = candidates[0];
    candidates.forEach(function (candidate) { if (candidate <= maximum) chosen = candidate; });
    return chosen;
  }

  function buildMapComposerReport(model) {
    model = model || {};
    var composition = normalizeMapComposition(model);
    var rows = (model.rows || []).filter(function (row) {
      return Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon));
    }).slice(0, 250);
    var provenance = normalizeProvenance(model.provenance);
    var numeric = rows.map(function (row) { return Number(row.value); }).filter(Number.isFinite);
    var min = numeric.length ? Math.min.apply(Math, numeric) : 0;
    var max = numeric.length ? Math.max.apply(Math, numeric) : 1;
    var mapPoints = rows.map(function (row) { return { lat: Number(row.lat), lon: Number(row.lon) }; })
      .concat(composition.annotations.map(function (annotation) { return { lat: annotation.lat, lon: annotation.lon }; }));
    var width = 800, height = 500, projection = schematicProjection(mapPoints, width, height, 52);
    var mapMarkup = '<div class="empty-map" role="img" aria-label="' + escapeHTML(composition.altText || suggestMapAltText(model)) +
      '">No mappable coordinates are available.</div>';
    if (projection) {
      var grid = graticuleLines(projection.bounds);
      var svg = [];
      grid.lats.forEach(function (lat) {
        var a = projection.project(projection.bounds.minLon, lat), b = projection.project(projection.bounds.maxLon, lat);
        svg.push('<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" class="grid"/>');
      });
      grid.lons.forEach(function (lon) {
        var a = projection.project(lon, projection.bounds.minLat), b = projection.project(lon, projection.bounds.maxLat);
        svg.push('<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" class="grid"/>');
      });
      rows.forEach(function (row, index) {
        var point = projection.project(row.lon, row.lat);
        var fill = Number.isFinite(Number(row.value)) ? color(Number(row.value), min, max) : '#475569';
        svg.push('<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="9" fill="' + fill +
          '" stroke="#fff" stroke-width="3" aria-hidden="true"/>');
        svg.push('<text x="' + point.x.toFixed(1) + '" y="' + (point.y - 13).toFixed(1) +
          '" text-anchor="middle" class="point-label" aria-hidden="true">' + (index + 1) + '</text>');
      });
      composition.annotations.forEach(function (annotation, index) {
        var point = projection.project(annotation.lon, annotation.lat);
        svg.push('<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) +
          '" r="15" class="annotation" aria-hidden="true"/>');
        svg.push('<text x="' + point.x.toFixed(1) + '" y="' + (point.y + 5).toFixed(1) +
          '" text-anchor="middle" class="annotation-label" aria-hidden="true">A' + (index + 1) + '</text>');
      });
      var middleLat = (projection.bounds.minLat + projection.bounds.maxLat) / 2;
      var spanKm = haversineKm({ lat: middleLat, lon: projection.bounds.minLon }, { lat: middleLat, lon: projection.bounds.maxLon });
      var scaleKm = niceScaleKilometers(Math.max(1, spanKm / 4));
      var spanStart = projection.project(projection.bounds.minLon, middleLat);
      var spanEnd = projection.project(projection.bounds.maxLon, middleLat);
      var scalePixels = Math.min(220, Math.max(35, Math.abs(spanEnd.x - spanStart.x) * scaleKm / Math.max(1, spanKm)));
      svg.push('<line x1="60" y1="458" x2="' + (60 + scalePixels).toFixed(1) + '" y2="458" class="scale" aria-hidden="true"/>');
      svg.push('<text x="60" y="448" class="scale-text" aria-hidden="true">approx. ' + scaleKm + ' km</text>');
      svg.push('<text x="760" y="34" class="north" aria-hidden="true">N &#8593;</text>');
      mapMarkup = '<figure><svg viewBox="0 0 800 500" role="img" aria-label="' +
        escapeHTML(composition.altText || suggestMapAltText(model)) + '">' + svg.join('') +
        '</svg><figcaption>Schematic coordinate map. Use the numbered key and data table for exact values; this is not a navigation map.</figcaption></figure>';
    }
    var legend = '';
    if (composition.showLegend) {
      legend = '<section class="legend" aria-label="Map legend"><h2>' + escapeHTML(composition.legendTitle || model.metricLabel || 'Mapped value') +
        '</h2><div><span class="swatch low"></span>Lower values <span class="swatch middle"></span>Middle values ' +
        '<span class="swatch high"></span>Higher values</div><p>Unit: ' +
        escapeHTML(model.unit || composition.unit || 'Not specified') + '. Classification: ' +
        escapeHTML(model.classification || 'continuous five-step scale') + '.</p></section>';
    }
    var annotationSection = composition.annotations.length ? '<section><h2>Annotation key</h2><ol>' +
      composition.annotations.map(function (annotation, index) {
        return '<li><strong>A' + (index + 1) + ':</strong> ' + escapeHTML(annotation.label) + ' (' +
          Number(annotation.lat).toFixed(4) + ', ' + Number(annotation.lon).toFixed(4) + ')</li>';
      }).join('') + '</ol></section>' : '';
    var tableRows = rows.map(function (row, index) {
      return '<tr><td>' + (index + 1) + '</td><th scope="row">' + escapeHTML(row.name || 'Unnamed location') +
        '</th><td>' + Number(row.lat).toFixed(4) + '</td><td>' + Number(row.lon).toFixed(4) + '</td><td>' +
        escapeHTML(row.value == null ? 'No data' : row.value) + '</td><td>' +
        escapeHTML(model.unit || composition.unit || 'Not specified') + '</td></tr>';
    }).join('');
    var audit = auditMapComposition(Object.assign({}, model, composition));
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escapeHTML(composition.title || 'GIS Studio Map') + '</title><style>' +
      'body{margin:0;background:#eef4f3;color:#172033;font:16px/1.55 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:30px}' +
      'header,.map-card,section{background:#fff;border:1px solid #b7c8c6;border-radius:14px;padding:20px;margin-bottom:16px}' +
      'header{border-top:8px solid #0f766e}h1{margin:.15rem 0;font-size:2rem}h2{color:#0f5f5a;font-size:1.15rem}' +
      '.subtitle,.meta,figcaption{color:#52636f}.claim{border-left:5px solid #d97706;background:#fff7ed;padding:14px}' +
      'figure{margin:0}svg{width:100%;height:auto;background:#071827;border-radius:10px}.grid{stroke:#64748b;stroke-width:1;stroke-dasharray:4 4;opacity:.55}' +
      '.point-label,.scale-text{fill:#e2e8f0;font-size:12px;font-weight:800}.annotation{fill:#fde047;stroke:#111827;stroke-width:3}' +
      '.annotation-label{fill:#111827;font-size:11px;font-weight:900}.north{fill:#fff;font-size:18px;font-weight:900}.scale{stroke:#fff;stroke-width:5}' +
      '.legend div{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.swatch{display:inline-block;width:26px;height:16px;border:2px solid #334155;border-radius:3px}' +
      '.low{background:#0e7490}.middle{background:#65a30d}.high{background:#be123c}table{border-collapse:collapse;width:100%;font-size:.9rem}' +
      'caption{text-align:left;font-weight:800;padding:.5rem 0}th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.table-wrap{overflow-x:auto}' +
      'dl{display:grid;grid-template-columns:minmax(130px,200px) 1fr;gap:7px}dt{font-weight:800}dd{margin:0}.actions button{padding:10px 14px}' +
      '.empty-map{min-height:260px;display:grid;place-items:center;background:#071827;color:#e2e8f0;padding:20px}.check{color:#405366}' +
      '@media(max-width:650px){main{padding:12px}dl{grid-template-columns:1fr}dd{margin-bottom:8px}}' +
      '@media print{body{background:#fff}.actions{display:none}main{padding:0}.map-card,section,header{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p>GIS STUDIO ACCESSIBLE MAP PACKAGE</p><h1>' +
      escapeHTML(composition.title || 'Untitled map') + '</h1><p class="subtitle">' + escapeHTML(composition.subtitle) +
      '</p><p class="meta">' + (composition.author ? 'Prepared by ' + escapeHTML(composition.author) + '. ' : '') +
      'Generated ' + escapeHTML(model.generated || '') + '.</p></header><div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div>' +
      '<section class="map-card"><h2>Map</h2>' + mapMarkup + '</section>' + legend +
      '<section class="claim"><h2>Evidence-based takeaway</h2><p>' +
      escapeHTML(composition.claim || 'No claim has been added yet.') + '</p><p><strong>Pattern summary:</strong> ' +
      escapeHTML(model.analysis || 'Use the data table to describe the visible pattern.') + '</p></section>' +
      annotationSection + '<section><h2>Accessible data-table twin</h2><div class="table-wrap"><table><caption>Mapped data table</caption>' +
      '<thead><tr><th scope="col">Map key</th><th scope="col">Location</th><th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>' +
      tableRows + '</tbody></table></div></section><section><h2>Sources, method, and limitations</h2><dl>' +
      '<dt>Dataset</dt><dd>' + escapeHTML(provenance.datasetTitle || composition.title) + '</dd><dt>Source</dt><dd>' +
      escapeHTML(provenance.source || 'Not specified') + '</dd><dt>Collected</dt><dd>' + escapeHTML(provenance.collected || 'Not specified') +
      '</dd><dt>Method</dt><dd>' + escapeHTML(provenance.method || 'Not specified') + '</dd><dt>License</dt><dd>' +
      escapeHTML(provenance.license || 'Not specified') + '</dd><dt>Limitations</dt><dd>' +
      escapeHTML(provenance.limitations || 'Not specified') + '</dd></dl></section>' +
      '<section class="check"><h2>Cartography review at export</h2><p>Score: ' + audit.score + '/100; ' + audit.errors +
      ' errors and ' + audit.warnings + ' warnings. The map includes a synchronized table, outlined symbols, a north arrow, an approximate scale, and explicit provenance fields.</p></section>' +
      '</main></body></html>';
  }

  function buildEvidenceReport(model) {
    model = model || {};
    var left = model.left || { label: 'Left map', rows: [] };
    var right = model.right || { label: 'Right map', rows: [] };
    var selected = Array.isArray(model.selected) ? model.selected : [];
    var spatial = model.spatialAnalysis && typeof model.spatialAnalysis === 'object' ? model.spatialAnalysis : {};
    function number(value, digits) {
      if (value === null || value === undefined || value === '') return '\u2014';
      return Number.isFinite(Number(value)) ? Number(value).toFixed(digits == null ? 2 : digits) : '\u2014';
    }
    function seriesSummary(series) {
      var values = (series.rows || []).map(function (row) { return Number(row.value); }).filter(Number.isFinite);
      if (!values.length) return 'No numeric values';
      var mean = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
      return values.length + ' records; range ' + Math.min.apply(Math, values) + ' to ' + Math.max.apply(Math, values) + '; mean ' + mean.toFixed(1);
    }
    function table(series, side) {
      var rows = (series.rows || []).map(function (row) {
        return '<tr><th scope="row">' + escapeHTML(row.name) + '</th><td>' + escapeHTML(row.geometry || 'Point') +
          '</td><td>' + number(row.lat, 4) + '</td><td>' + number(row.lon, 4) + '</td><td>' +
          escapeHTML(row.value == null ? 'No data' : row.value) + '</td></tr>';
      }).join('');
      return '<section><h2>' + escapeHTML(series.label || side + ' map') + '</h2><p><strong>Basemap:</strong> ' +
        escapeHTML(series.basemap || 'Not specified') + '. <strong>Legend:</strong> low values use teal; high values use rose. ' +
        escapeHTML(seriesSummary(series)) + '.</p><div class="table-wrap"><table><caption>' + escapeHTML(side) +
        ' comparison data</caption><thead><tr><th scope="col">Location or feature</th><th scope="col">Geometry</th>' +
        '<th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Value</th></tr></thead><tbody>' +
        rows + '</tbody></table></div></section>';
    }
    var points = (left.rows || []).filter(function (row) {
      return Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon));
    });
    var coordinatePlot = '';
    if (points.length) {
      var lats = points.map(function (row) { return Number(row.lat); });
      var lons = points.map(function (row) { return Number(row.lon); });
      var plotArc = minimalLongitudeArc(lons);
      var unwrappedLons = lons.map(function (longitude) { return unwrapLongitudeForArc(longitude, plotArc); });
      var minLat = Math.min.apply(Math, lats), maxLat = Math.max.apply(Math, lats);
      var minLon = Math.min.apply(Math, unwrappedLons), maxLon = Math.max.apply(Math, unwrappedLons);
      var dots = points.map(function (row, index) {
        var plotLongitude = unwrapLongitudeForArc(Number(row.lon), plotArc);
        var x = maxLon === minLon ? 50 : 5 + (plotLongitude - minLon) / (maxLon - minLon) * 90;
        var y = maxLat === minLat ? 50 : 95 - (Number(row.lat) - minLat) / (maxLat - minLat) * 90;
        return '<span class="plot-point" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) +
          '%" aria-hidden="true">' + (index + 1) + '</span>';
      }).join('');
      coordinatePlot = '<section><h2>Coordinate plot</h2><p>This schematic preserves relative latitude and longitude but is not a basemap or projected navigation map.</p>' +
        '<div class="plot" role="img" aria-label="' + escapeHTML(points.length + ' locations plotted by longitude and latitude. Exact coordinates are listed in the tables.') + '">' +
        dots + '<span class="north" aria-hidden="true">N ↑</span></div><ol class="plot-key">' +
        points.map(function (row, index) { return '<li>' + (index + 1) + '. ' + escapeHTML(row.name) + '</li>'; }).join('') +
        '</ol></section>';
    }
    var selectedTable = selected.length ? '<section><h2>Spatial-analysis selection</h2><table><caption>Selected mapped points</caption>' +
      '<thead><tr><th scope="col">Location</th><th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Value</th></tr></thead><tbody>' +
      selected.map(function (row) {
        return '<tr><th scope="row">' + escapeHTML(row.name) + '</th><td>' + number(row.lat, 4) + '</td><td>' +
          number(row.lon, 4) + '</td><td>' + escapeHTML(row.value == null ? 'No data' : row.value) + '</td></tr>';
      }).join('') + '</tbody></table></section>' : '';
    var spatialSection = '<section><h2>Spatial method and provenance</h2><dl>' +
      '<dt><strong>Method</strong></dt><dd>' + escapeHTML(spatial.method || 'No active spatial analysis') + '</dd>' +
      '<dt><strong>Region pack</strong></dt><dd>' + escapeHTML(spatial.regionPack || model.regionPack || 'Not specified') + '</dd>' +
      '<dt><strong>Interpretation</strong></dt><dd>' + escapeHTML(spatial.detail || 'No spatial method was active when this report was generated.') + '</dd>' +
      '<dt><strong>Analysis points</strong></dt><dd>' + escapeHTML(spatial.pointCount == null ? 0 : spatial.pointCount) + '</dd>' +
      '<dt><strong>Selected records</strong></dt><dd>' + escapeHTML(spatial.selectedCount == null ? selected.length : spatial.selectedCount) + '</dd>' +
      (spatial.selectedMean == null ? '' : '<dt><strong>Selected mean</strong></dt><dd>' + escapeHTML(number(spatial.selectedMean, 1) + (spatial.unit ? ' ' + spatial.unit : '')) + '</dd>') +
      '</dl><p>This records how the spatial result was produced. Straight-line proximity, boundaries, and point values are descriptive evidence; they do not establish cause and effect.</p></section>';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escapeHTML(model.title || 'GIS Studio Evidence Report') + '</title><style>' +
      'body{font:16px/1.5 system-ui,sans-serif;color:#172033;background:#fff;margin:0}main{max-width:980px;margin:auto;padding:32px}' +
      'header{border-bottom:5px solid #0f766e;padding-bottom:18px}h1{margin:.2rem 0}h2{color:#0f5f5a;margin-top:2rem}' +
      '.meta,.note{color:#405366}.callout{background:#ecfeff;border-left:5px solid #0891b2;padding:14px;margin:18px 0}' +
      'table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:700;padding:.4rem 0}' +
      'th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.table-wrap{overflow-x:auto}' +
      '.plot{height:330px;position:relative;border:2px solid #334155;background:linear-gradient(#eef9f8 1px,transparent 1px),linear-gradient(90deg,#eef9f8 1px,transparent 1px);background-size:10% 10%}' +
      '.plot-point{position:absolute;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:#be123c;color:white;text-align:center;line-height:28px;font-weight:800}' +
      '.north{position:absolute;right:12px;top:8px;font-weight:800}.plot-key{columns:2}.actions{margin:20px 0}.actions button{padding:10px 14px}' +
      '@media(max-width:650px){main{padding:18px}.plot-key{columns:1}}@media print{.actions{display:none}main{padding:0}.plot{break-inside:avoid}section{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p>GIS STUDIO</p><h1>' + escapeHTML(model.title || 'Geographic Evidence Report') +
      '</h1><p class="meta">Generated ' + escapeHTML(model.generated || '') + '</p></header>' +
      '<div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div>' +
      '<section class="callout"><h2>Claim and observation</h2><p>' + escapeHTML(model.observation || 'Add an evidence-based observation in GIS Studio.') +
      '</p><p><strong>Analysis note:</strong> ' + escapeHTML(model.analysis || 'Spatial patterns describe relationships; they do not establish cause and effect.') + '</p></section>' +
      coordinatePlot + table(left, 'Left') + table(right, 'Right') + spatialSection + selectedTable +
      '<section><h2>Sources and limitations</h2><p>' + escapeHTML(model.sources || 'Verify learning data with authoritative sources before making decisions.') +
      '</p><p>Basemap appearance can influence interpretation. Classification, scale, missing values, coordinate quality, and boundary definitions can change the visible pattern.</p></section>' +
      '</main></body></html>';
  }

  function getLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (window._geoLibsLoaded && typeof window._geoLibsLoaded.then === 'function') {
      return window._geoLibsLoaded.then(function () { return window.L && window.L.map ? window.L : null; });
    }
    if (window.__alloGISLeaflet) return window.__alloGISLeaflet;
    window.__alloGISLeaflet = new Promise(function (resolve) {
      if (!document.querySelector('link[data-gis-leaflet]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-gis-leaflet', 'true');
        document.head.appendChild(link);
      }
      var script = document.querySelector('script[data-gis-leaflet]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.setAttribute('data-gis-leaflet', 'true');
        document.head.appendChild(script);
      }
      function done() { resolve(window.L && window.L.map ? window.L : null); }
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', done, { once: true });
      window.setTimeout(done, 6500);
    });
    window._geoLibsLoaded = window.__alloGISLeaflet;
    return window.__alloGISLeaflet;
  }

  function valueOf(record, metric, imported) {
    return imported ? record.value : record[metric];
  }

  function color(value, min, max) {
    var p = max === min ? 0.5 : (value - min) / (max - min);
    return p < 0.2 ? '#0e7490' : p < 0.4 ? '#0891b2' : p < 0.6 ? '#65a30d' : p < 0.8 ? '#d97706' : '#be123c';
  }

  function describe(records, metric, imported) {
    if (!records.length) return 'No mapped records are available.';
    var sorted = records.slice().sort(function (a, b) { return valueOf(b, metric, imported) - valueOf(a, metric, imported); });
    var mean = records.reduce(function (sum, record) { return sum + valueOf(record, metric, imported); }, 0) / records.length;
    var result = sorted[0].name + ' is highest (' + valueOf(sorted[0], metric, imported) + '); ' +
      sorted[sorted.length - 1].name + ' is lowest (' + valueOf(sorted[sorted.length - 1], metric, imported) +
      '). The mean is ' + mean.toFixed(1) + '.';
    if (!imported) {
      var coast = records.filter(function (record) { return record.coastal; });
      var inland = records.filter(function (record) { return !record.coastal; });
      var ca = coast.reduce(function (sum, record) { return sum + valueOf(record, metric, false); }, 0) / coast.length;
      var ia = inland.reduce(function (sum, record) { return sum + valueOf(record, metric, false); }, 0) / inland.length;
      result += ' Coastal average: ' + ca.toFixed(1) + '; inland average: ' + ia.toFixed(1) +
        '. This pattern suggests a question; it does not establish causation.';
    }
    return result;
  }
  function localizeGISReportDocument(html, model, override) {
    var hasLocale = !!override || !!(model && (model.localeOptions || model.locale || model.lang || model.dir));
    if (!hasLocale) return html;
    return String(html || '').replace('<html lang="en">', '<html' + reportLocaleAttributes(model, override) + '>');
  }

  function localizedGISReportBuilder(builder) {
    return function (model, localeOptions) {
      var sourceModel = model || {};
      var hasLocale = !!localeOptions || !!(sourceModel.localeOptions || sourceModel.locale || sourceModel.lang || sourceModel.dir);
      var effectiveModel = sourceModel;
      if (hasLocale && !sourceModel.generated) {
        effectiveModel = Object.assign({}, sourceModel, { generated: createGISFormatters(localeOptions || sourceModel).dateTime(new Date()) });
      }
      return localizeGISReportDocument(builder(effectiveModel), effectiveModel, localeOptions);
    };
  }

  buildRemoteSensingReport = localizedGISReportBuilder(buildRemoteSensingReport);
  buildStoryMapReport = localizedGISReportBuilder(buildStoryMapReport);
  buildDataQualityReport = localizedGISReportBuilder(buildDataQualityReport);
  buildInvestigationPacketReport = localizedGISReportBuilder(buildInvestigationPacketReport);
  buildTeacherReviewReport = localizedGISReportBuilder(buildTeacherReviewReport);
  buildMapComposerReport = localizedGISReportBuilder(buildMapComposerReport);
  buildEvidenceReport = localizedGISReportBuilder(buildEvidenceReport);


  window.StemLab.registerTool('gisStudio', {
    icon: '\uD83D\uDDFA\uFE0F',
    label: 'GIS Studio',
    desc: 'Build, plan, compare, compose, sequence, review, and export accessible GIS and remote-sensing investigations.',
    color: 'teal',
    category: 'geo',
    aliases: ['GIS', 'mapping', 'spatial data', 'GIS project file', 'map composer', 'accessible map export', 'cartography coach', 'map annotations', 'remote sensing', 'satellite change detection', 'NDVI', 'NDWI', 'NDBI', 'multispectral imagery', 'autosave', 'data provenance', 'coordinate privacy', 'time series map', 'change over time', 'Maine inquiry', 'guided mission', 'spatial analysis', 'map comparison', 'evidence report', 'story map', 'evidence storyboard', 'quality review', 'uncertainty review', 'investigation packet', 'teacher handoff', 'inquiry planner', 'research question', 'teacher review', 'rubric feedback', 'buffer', 'choropleth', 'coordinates', 'map projections'],
    testing: {
      resolveGISLocale: resolveGISLocale, createGISFormatters: createGISFormatters, reportLocaleAttributes: reportLocaleAttributes,
      detectGISDelimiter: detectGISDelimiter, parseGISDelimitedRows: parseGISDelimitedRows, parseGISNumber: parseGISNumber,
      parseGISAngle: parseGISAngle, normalizeGISCRS: normalizeGISCRS,
      transformGISCoordinatePair: transformGISCoordinatePair, inverseGISWebMercator: inverseGISWebMercator, inverseGISUTM: inverseGISUTM,
      suggestGISImportColumns: suggestGISImportColumns, inspectGISCSV: inspectGISCSV,
      gisImportParseOptions: gisImportParseOptions,
      parseCSV: parseCSV, rowsToCSV: rowsToCSV, safeFileStem: safeFileStem, parseGeoJSON: parseGeoJSON, parseKML: parseKML, parseGPX: parseGPX, detectGISVectorFormat: detectGISVectorFormat, parseGISVectorText: parseGISVectorText, parseTableCSV: parseTableCSV,
      normalizeJoinKey: normalizeJoinKey, joinTableToGeoJSON: joinTableToGeoJSON, calculateBreaks: calculateBreaks, classColor: classColor,
      minimalLongitudeArc: minimalLongitudeArc, dataViewport: dataViewport, normalizeLongitude: normalizeLongitude,
      unwrapLongitudeForArc: unwrapLongitudeForArc, leafletCenterForViewport: leafletCenterForViewport,
      collectGISGeoJSONPoints: collectGISGeoJSONPoints, unwrapGISGeoJSONForArc: unwrapGISGeoJSONForArc,
      regionMetrics: regionMetrics, regionMetric: regionMetric,
      basemapProviders: GIS_BASEMAP_PROVIDERS, getGISBasemapProvider: getGISBasemapProvider, createGISBasemapLayer: createGISBasemapLayer,
      haversineKm: haversineKm, pathLengthKm: pathLengthKm, polygonAreaSquareKm: polygonAreaSquareKm,
      pointInFeature: pointInFeature, selectPointsInFeature: selectPointsInFeature,
      selectWithinRadius: selectWithinRadius, nearestRecord: nearestRecord, featureMeasurements: featureMeasurements,
      buildEvidenceReport: buildEvidenceReport, missionCompletion: missionCompletion, missions: GIS_MISSIONS, regionPacks: GIS_REGION_PACKS,
      parseTimeCSV: parseTimeCSV, timelineSnapshot: timelineSnapshot, calculateTemporalChange: calculateTemporalChange,
      calculateSpectralIndex: calculateSpectralIndex, classifySpectralPixel: classifySpectralPixel,
      normalizeRemoteSensingState: normalizeRemoteSensingState, summarizeRemoteChange: summarizeRemoteChange,
      buildRemoteSensingReport: buildRemoteSensingReport, remoteScene: REMOTE_SCENE,
      normalizeStoryMap: normalizeStoryMap, createStoryFrame: createStoryFrame, storyMapProgress: storyMapProgress,
      buildStoryMapReport: buildStoryMapReport,
      normalizeQualityReviewState: normalizeQualityReviewState, buildDataQualityReview: buildDataQualityReview,
      buildDataQualityReport: buildDataQualityReport,
      buildInvestigationPacketReport: buildInvestigationPacketReport,
      normalizeInquiryPlan: normalizeInquiryPlan, inquiryPlanProgress: inquiryPlanProgress, inquiryTemplates: GIS_INQUIRY_TEMPLATES,
      normalizeTeacherReview: normalizeTeacherReview, teacherReviewProgress: teacherReviewProgress, teacherRubric: GIS_TEACHER_RUBRIC, buildTeacherReviewReport: buildTeacherReviewReport,
      createGISProject: createGISProject, validateGISProject: validateGISProject,
      assessCoordinatePrivacy: assessCoordinatePrivacy, roundPointCoordinates: roundPointCoordinates,
      normalizeMapComposition: normalizeMapComposition, suggestMapAltText: suggestMapAltText,
      auditMapComposition: auditMapComposition, buildMapComposerReport: buildMapComposerReport,
      schematicProjection: schematicProjection, graticuleStep: graticuleStep,
      graticuleLines: graticuleLines, featureOuterRings: featureOuterRings
    },
    questHooks: [
      { id: 'import_data', label: 'Map your own coordinate data', icon: '\uD83D\uDCE5', check: function (d) { return !!d.gisImported; }, progress: function (d) { return d.gisImported ? 'Mapped' : 'Not yet'; } },
      { id: 'polygon_layer', label: 'Build a GeoJSON choropleth', icon: '\uD83C\uDFA8', check: function (d) { return !!d.gisGeoJSONImported; }, progress: function (d) { return d.gisGeoJSONImported ? 'Mapped' : 'Not yet'; } },
      { id: 'join_layer', label: 'Join a CSV to map boundaries', icon: '\uD83D\uDD17', check: function (d) { return !!d.gisJoinApplied; }, progress: function (d) { return d.gisJoinApplied ? 'Joined' : 'Not yet'; } },
      { id: 'spatial_analysis', label: 'Run a spatial analysis', icon: '\uD83D\uDCCF', check: function (d) { return !!d.gisSpatialAnalysis; }, progress: function (d) { return d.gisSpatialAnalysis ? 'Analyzed' : 'Not yet'; } },
      { id: 'compare_export', label: 'Compare maps and export evidence', icon: '\uD83D\uDCCA', check: function (d) { return !!d.gisEvidenceExported; }, progress: function (d) { return d.gisEvidenceExported ? 'Exported' : d.gisCompared ? 'Compared' : 'Not yet'; } },
      { id: 'maine_mission', label: 'Complete a Maine GIS mission', icon: '\uD83E\uDDED', check: function (d) { return !!d.gisMissionCompleted; }, progress: function (d) { return d.gisMissionCompleted ? 'Completed' : d.gisMissionStarted ? 'In progress' : 'Not yet'; } },
      { id: 'time_change', label: 'Analyze change over time', icon: '\u23F3', check: function (d) { return !!d.gisTimelineAnalyzed; }, progress: function (d) { return d.gisTimelineExported ? 'Exported' : d.gisTimelineAnalyzed ? 'Analyzed' : 'Not yet'; } },
      { id: 'project_portability', label: 'Save a privacy-reviewed GIS project', icon: '\uD83D\uDCBE', check: function (d) { return !!d.gisProjectSaved; }, progress: function (d) { return d.gisProjectSaved ? 'Saved' : d.gisProjectLoaded ? 'Opened' : 'Not yet'; } },
      { id: 'map_composer', label: 'Compose and export an accessible evidence map', icon: '\uD83D\uDDBC\uFE0F', check: function (d) { return !!d.gisMapComposed; }, progress: function (d) { return d.gisMapComposed ? 'Exported' : 'Not yet'; } },
      { id: 'remote_sensing', label: 'Analyze a remote-sensing change scene', icon: '\uD83D\uDEF0\uFE0F', check: function (d) { return !!d.gisRemoteSensingCompleted; }, progress: function (d) { return d.gisRemoteSensingCompleted ? 'Evidence exported' : d.gisRemoteSensingStarted ? 'In progress' : 'Not yet'; } },
      { id: 'story_map', label: 'Sequence a claim-evidence story map', icon: '\uD83D\uDCDA', check: function (d) { return !!d.gisStoryMapExported; }, progress: function (d) { return d.gisStoryMapExported ? 'Exported' : d.gisStoryMapStarted ? 'In progress' : 'Not yet'; } },
      { id: 'quality_review', label: 'Complete a GIS data-quality review', icon: '\u2705', check: function (d) { return !!d.gisQualityReviewed; }, progress: function (d) { return d.gisQualityReviewed ? 'Reviewed' : 'Not yet'; } },
      { id: 'teacher_review', label: 'Complete a teacher review and revision', icon: '\uD83D\uDCAC', check: function (d) { return !!d.gisTeacherReviewCompleted; }, progress: function (d) { return d.gisTeacherReviewCompleted ? 'Ready' : d.gisTeacherReviewStarted ? 'In progress' : 'Not yet'; } },
      { id: 'inquiry_planner', label: 'Plan a testable spatial investigation', icon: '\uD83E\uDDED', check: function (d) { return !!d.gisInquiryPlanCompleted; }, progress: function (d) { return d.gisInquiryPlanCompleted ? 'Planned' : d.gisInquiryPlanStarted ? 'In progress' : 'Not yet'; } },
      { id: 'investigation_packet', label: 'Build a teacher-ready investigation packet', icon: '\uD83D\uDCC4', check: function (d) { return !!d.gisInvestigationPacketExported; }, progress: function (d) { return d.gisInvestigationPacketExported ? 'Exported' : d.gisInvestigationPacketStarted ? 'In progress' : 'Not yet'; } },
      { id: 'projection_lab', label: 'Compare map projections', icon: '\uD83C\uDF10', check: function (d) { return !!d.gisProjectionCompared; }, progress: function (d) { return d.gisProjectionCompared ? 'Compared' : 'Not yet'; } }
    ],
    render: function (ctx) {
      var React = ctx.React, h = React.createElement;
      var setToolData = ctx.setToolData || function () {};
      var announce = ctx.announceToSR || function () {};
      var callGemini = ctx.callGemini;
      var t = typeof ctx.t === 'function' ? ctx.t : function (_key, fallback) { return fallback; };
      var localeInfo = resolveGISLocale({
        locale: ctx.locale || ctx.lang,
        language: ctx.language || (typeof window !== 'undefined' ? window.__alloTextLanguage : ''),
        dir: ctx.dir
      });
      var display = createGISFormatters(localeInfo);
      var gisText = {
        title: t('stem.gisstudio.title', 'GIS Studio'),
        kicker: t('stem.gisstudio.kicker', 'SPATIAL DATA LABORATORY'),
        tagline: t('stem.gisstudio.tagline', 'Layer it. Map it. Question the pattern.'),
        sections: t('stem.gisstudio.sections', 'GIS Studio sections'),
        addStory: t('stem.gisstudio.add_current_view', 'Add current view to story'),
        project: t('stem.gisstudio.tab.project', 'Project'),
        composer: t('stem.gisstudio.tab.composer', 'Map Composer'),
        remote: t('stem.gisstudio.tab.remote', 'Remote Sensing'),
        story: t('stem.gisstudio.tab.story', 'Story Map'),
        quality: t('stem.gisstudio.tab.quality', 'Quality Review'),
        planner: t('stem.gisstudio.tab.planner', 'Investigation Planner'),
        review: t('stem.gisstudio.tab.review', 'Teacher Review'),
        packet: t('stem.gisstudio.tab.packet', 'Investigation Packet'),
        missions: t('stem.gisstudio.tab.missions', 'Guided missions'),
        timeline: t('stem.gisstudio.tab.timeline', 'Change over time'),
        map: t('stem.gisstudio.tab.map', 'Map + layers'),
        compare: t('stem.gisstudio.tab.compare', 'Compare + export'),
        importData: t('stem.gisstudio.tab.import', 'Import data'),
        projection: t('stem.gisstudio.tab.projection', 'Projection lab'),
        metricDensity: t('stem.gisstudio.metric.population_density', 'Population density'),
        metricAccess: t('stem.gisstudio.metric.broadband_access', 'Broadband access index'),
        importedValue: t('stem.gisstudio.metric.imported_value', 'Imported value'),
        regionMaine: t('stem.gisstudio.region.maine', 'Maine counties (16)'),
        regionNewEngland: t('stem.gisstudio.region.new_england', 'New England (6-state sample)'),
        regionUnitedStates: t('stem.gisstudio.region.united_states', 'United States (macro-region sample)'),
        regionGlobal: t('stem.gisstudio.region.global', 'Global regions (classroom sample)'),
        csvConvention: t('stem.gisstudio.csv.convention', 'CSV number and separator convention'),
        csvAuto: t('stem.gisstudio.csv.auto', 'Auto-detect'),
        csvCommaDot: t('stem.gisstudio.csv.comma_dot', 'Comma separator + decimal point'),
        csvCommaComma: t('stem.gisstudio.csv.comma_comma', 'Comma separator + decimal comma (quote numeric fields)'),
        csvSemicolonComma: t('stem.gisstudio.csv.semicolon_comma', 'Semicolon separator + decimal comma'),
        csvTabDot: t('stem.gisstudio.csv.tab_dot', 'Tab separator + decimal point'),
        csvTabComma: t('stem.gisstudio.csv.tab_comma', 'Tab separator + decimal comma'),
        csvPipeDot: t('stem.gisstudio.csv.pipe_dot', 'Pipe separator + decimal point'),
        csvPipeComma: t('stem.gisstudio.csv.pipe_comma', 'Pipe separator + decimal comma'),
        csvDetected: t('stem.gisstudio.csv.detected', 'Detected CSV format'),
        csvTabLabel: t('stem.gisstudio.csv.tab_label', 'TAB'),
        csvDecimalLabel: t('stem.gisstudio.csv.decimal_label', 'decimal'),
        importPointKicker: t('stem.gisstudio.import.point_kicker', 'POINT DATA'),
        importHeading: t('stem.gisstudio.import.heading', 'Map a coordinate CSV'),
        importIntro: t('stem.gisstudio.import.intro', 'Preview columns, choose the coordinate system, and map up to 250 rows locally in your browser.'),
        vectorIntro: t('stem.gisstudio.import.vector_intro', 'Load up to 500 points, lines, or polygons from GeoJSON, KML, or GPX. GIS Studio converts them to validated WGS84 GeoJSON and maps the first numeric property.'),
        vectorChooseFile: t('stem.gisstudio.import.vector_choose_file', 'Choose GeoJSON, KML, or GPX'),
        vectorPaste: t('stem.gisstudio.import.vector_paste', 'Or paste GeoJSON, KML, or GPX'),
        importChooseFile: t('stem.gisstudio.import.choose_file', 'Choose a CSV file'),
        importPaste: t('stem.gisstudio.import.paste', 'Or paste CSV data'),
        importPreviewButton: t('stem.gisstudio.import.preview_button', 'Preview + map columns'),
        importQuickMapButton: t('stem.gisstudio.import.quick_map_button', 'Map this CSV'),
        importMapReviewedButton: t('stem.gisstudio.import.map_reviewed_button', 'Map reviewed data'),
        importRestore: t('stem.gisstudio.import.restore', 'Restore CSV example'),
        importCRSLabel: t('stem.gisstudio.import.crs_label', 'Coordinate reference system'),
        importCRSWGS84: t('stem.gisstudio.import.crs_wgs84', 'WGS84 latitude / longitude (EPSG:4326)'),
        importCRSWebMercator: t('stem.gisstudio.import.crs_web_mercator', 'Web Mercator X / Y (EPSG:3857)'),
        importCRSUTM: t('stem.gisstudio.import.crs_utm', 'WGS84 UTM easting / northing'),
        importAxisOrder: t('stem.gisstudio.import.axis_order', 'Coordinate order'),
        importAxisLatLon: t('stem.gisstudio.import.axis_lat_lon', 'Latitude, then longitude'),
        importAxisLonLat: t('stem.gisstudio.import.axis_lon_lat', 'Longitude, then latitude'),
        importAxisXY: t('stem.gisstudio.import.axis_xy', 'Easting/X, then northing/Y'),
        importAxisYX: t('stem.gisstudio.import.axis_yx', 'Northing/Y, then easting/X'),
        importUTMZone: t('stem.gisstudio.import.utm_zone', 'UTM zone'),
        importHemisphere: t('stem.gisstudio.import.hemisphere', 'Hemisphere'),
        importNorth: t('stem.gisstudio.import.north', 'Northern'),
        importSouth: t('stem.gisstudio.import.south', 'Southern'),
        importMappingHeading: t('stem.gisstudio.import.mapping_heading', 'Review column mapping'),
        importMappingHelp: t('stem.gisstudio.import.mapping_help', 'Confirm every suggested column before mapping. Source coordinates are converted to WGS84 without changing the pasted data.'),
        importNameColumn: t('stem.gisstudio.import.name_column', 'Location name column'),
        importCoordinateA: t('stem.gisstudio.import.coordinate_a', 'First coordinate column'),
        importCoordinateB: t('stem.gisstudio.import.coordinate_b', 'Second coordinate column'),
        importValueColumn: t('stem.gisstudio.import.value_column', 'Numeric value column'),
        importChooseColumn: t('stem.gisstudio.import.choose_column', 'Choose a column'),
        importPreviewCaption: t('stem.gisstudio.import.preview_caption', 'Source data preview'),
        importFallbackWarning: t('stem.gisstudio.import.fallback_warning', 'Some columns were suggested by position rather than a recognized header. Review them carefully.'),
        importLatitude: t('stem.gisstudio.import.latitude', 'latitude'),
        importLongitude: t('stem.gisstudio.import.longitude', 'longitude'),
        importEasting: t('stem.gisstudio.import.easting', 'easting / X'),
        importNorthing: t('stem.gisstudio.import.northing', 'northing / Y'),
        maineMissions: t('stem.gisstudio.missions.maine', 'Maine missions'),
        noMissions: t('stem.gisstudio.missions.none', 'This region pack does not include guided missions.'),
        switchMaine: t('stem.gisstudio.missions.switch_maine', 'Switch to the Maine sample missions'),
        switchMaineNotice: t('stem.gisstudio.missions.switch_notice', 'The Maine sample curriculum is separate from your current region pack.'),
        missionHeading: t('stem.gisstudio.missions.heading', 'Guided GIS missions')
      };
      function localizedMetricLabel(definition) {
        if (!definition) return gisText.importedValue;
        if (definition.id === 'density') return gisText.metricDensity;
        if (definition.id === 'access') return gisText.metricAccess;
        return definition.label || definition.id;
      }
      function localizedRegionLabel(pack) {
        if (!pack) return '';
        if (pack.id === 'maine') return gisText.regionMaine;
        if (pack.id === 'new-england') return gisText.regionNewEngland;
        if (pack.id === 'united-states') return gisText.regionUnitedStates;
        if (pack.id === 'global') return gisText.regionGlobal;
        return pack.label || pack.id;
      }

      function Studio() {
        var initial = ctx.toolData || {};
        var s1 = React.useState(initial.gisTab || 'map'), tab = s1[0], setTab = s1[1];
        var s2 = React.useState(initial.gisMetric || 'density'), metric = s2[0], setMetric = s2[1];
        var s3 = React.useState('sample'), source = s3[0], setSource = s3[1];
        var regionPackState = React.useState(initial.gisRegionPack || 'maine'), regionPackId = regionPackState[0], setRegionPackId = regionPackState[1];
        var importDiagnosticsState = React.useState({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] }), importDiagnostics = importDiagnosticsState[0], setImportDiagnostics = importDiagnosticsState[1];
        var s4 = React.useState([]), importedRows = s4[0], setImportedRows = s4[1];
        var s5 = React.useState(EXAMPLE), csv = s5[0], setCSV = s5[1];
        var importConventionState = React.useState('auto'), importConvention = importConventionState[0], setImportConvention = importConventionState[1];
        var importPreviewState = React.useState(null), importPreview = importPreviewState[0], setImportPreview = importPreviewState[1];
        var importColumnMapState = React.useState({ name: '', coordinate1: '', coordinate2: '', value: '' }), importColumnMap = importColumnMapState[0], setImportColumnMap = importColumnMapState[1];
        var importCRSState = React.useState('EPSG:4326'), importCRS = importCRSState[0], setImportCRS = importCRSState[1];
        var importAxisOrderState = React.useState('lat-lon'), importAxisOrder = importAxisOrderState[0], setImportAxisOrder = importAxisOrderState[1];
        var importUTMZoneState = React.useState(19), importUTMZone = importUTMZoneState[0], setImportUTMZone = importUTMZoneState[1];
        var importUTMHemisphereState = React.useState('N'), importUTMHemisphere = importUTMHemisphereState[0], setImportUTMHemisphere = importUTMHemisphereState[1];
        var s6 = React.useState(''), error = s6[0], setError = s6[1];
        var s7 = React.useState({ points: true, coast: true, grid: false, polygons: true }), layers = s7[0], setLayers = s7[1];
        var s8 = React.useState(''), aiText = s8[0], setAIText = s8[1];
        var s9 = React.useState(false), aiBusy = s9[0], setAIBusy = s9[1];
        var s10 = React.useState('mercator'), projection = s10[0], setProjection = s10[1];
        var s11 = React.useState(60), latitude = s11[0], setLatitude = s11[1];
        var s12 = React.useState('Loading the interactive map. The table is ready now.'), mapStatus = s12[0], setMapStatus = s12[1];
        var mapLoadingState = React.useState(true), mapLoading = mapLoadingState[0], setMapLoading = mapLoadingState[1];
        var s13 = React.useState(getGISBasemapProvider(initial.gisBasemap || 'street') ? (initial.gisBasemap || 'street') : 'none'), basemap = s13[0], setBasemap = s13[1];
        var s14 = React.useState(EXAMPLE_GEOJSON), geoText = s14[0], setGeoText = s14[1];
        var s15 = React.useState(null), geoData = s15[0], setGeoData = s15[1];
        var s16 = React.useState([]), geoKeys = s16[0], setGeoKeys = s16[1];
        var s17 = React.useState(''), geoMetric = s17[0], setGeoMetric = s17[1];
        var s18 = React.useState(null), geoNameKey = s18[0], setGeoNameKey = s18[1];
        var s19 = React.useState(''), geoError = s19[0], setGeoError = s19[1];
        var s20 = React.useState(''), imageryNote = s20[0], setImageryNote = s20[1];
        var s21 = React.useState(false), officialBusy = s21[0], setOfficialBusy = s21[1];
        var s22 = React.useState(EXAMPLE_JOIN_CSV), joinText = s22[0], setJoinText = s22[1];
        var joinConventionState = React.useState('auto'), joinConvention = joinConventionState[0], setJoinConvention = joinConventionState[1];
        var s23 = React.useState(null), joinTable = s23[0], setJoinTable = s23[1];
        var s24 = React.useState(''), joinCSVKey = s24[0], setJoinCSVKey = s24[1];
        var s25 = React.useState(''), joinGeoKey = s25[0], setJoinGeoKey = s25[1];
        var s26 = React.useState(''), joinValueKey = s26[0], setJoinValueKey = s26[1];
        var s27 = React.useState(''), joinError = s27[0], setJoinError = s27[1];
        var s28 = React.useState(null), joinPreview = s28[0], setJoinPreview = s28[1];
        var s29 = React.useState(initial.gisClassification || 'quantile'), classification = s29[0], setClassification = s29[1];
        var s30 = React.useState(5), classCount = s30[0], setClassCount = s30[1];
        var s31 = React.useState('25, 50, 75'), customBreaks = s31[0], setCustomBreaks = s31[1];
        var s32 = React.useState('distance'), analysisMode = s32[0], setAnalysisMode = s32[1];
        var s33 = React.useState([]), analysisPoints = s33[0], setAnalysisPoints = s33[1];
        var s34 = React.useState(25), bufferRadiusKm = s34[0], setBufferRadiusKm = s34[1];
        var s35 = React.useState(initial.gisAnalysisUnit || 'metric'), analysisUnit = s35[0], setAnalysisUnit = s35[1];
        var s36 = React.useState(0), selectedFeatureIndex = s36[0], setSelectedFeatureIndex = s36[1];
        var s37 = React.useState([]), analysisSelection = s37[0], setAnalysisSelection = s37[1];
        var s38 = React.useState('none'), analysisSelectionSource = s38[0], setAnalysisSelectionSource = s38[1];
        var analysisHistoryState = React.useState([]), analysisHistory = analysisHistoryState[0], setAnalysisHistory = analysisHistoryState[1];
        var analysisFutureState = React.useState([]), analysisFuture = analysisFutureState[0], setAnalysisFuture = analysisFutureState[1];
        var analysisCopyStatusState = React.useState(''), analysisCopyStatus = analysisCopyStatusState[0], setAnalysisCopyStatus = analysisCopyStatusState[1];
        var s39 = React.useState(initial.gisCompareLeft || 'point:density'), compareLeft = s39[0], setCompareLeft = s39[1];
        var s40 = React.useState(initial.gisCompareRight || 'point:access'), compareRight = s40[0], setCompareRight = s40[1];
        var initialCompareLeftBasemap = initial.gisCompareLeftBasemap || 'street';
        var initialCompareRightBasemap = initial.gisCompareRightBasemap || 'satellite';
        var s41 = React.useState(getGISBasemapProvider(initialCompareLeftBasemap) && initialCompareLeftBasemap !== 'none' ? initialCompareLeftBasemap : 'none'), compareLeftBasemap = s41[0], setCompareLeftBasemap = s41[1];
        var s42 = React.useState(getGISBasemapProvider(initialCompareRightBasemap) && initialCompareRightBasemap !== 'none' ? initialCompareRightBasemap : 'none'), compareRightBasemap = s42[0], setCompareRightBasemap = s42[1];
        var s43 = React.useState('Loading synchronized comparison maps. The comparison tables are ready now.'), compareStatus = s43[0], setCompareStatus = s43[1];
        var compareMapReadyState = React.useState(false), compareMapReady = compareMapReadyState[0], setCompareMapReady = compareMapReadyState[1];
        var compareMapUnavailableState = React.useState(false), compareMapUnavailable = compareMapUnavailableState[0], setCompareMapUnavailable = compareMapUnavailableState[1];
        var s44 = React.useState(''), comparisonObservation = s44[0], setComparisonObservation = s44[1];
        var s45 = React.useState(initial.gisActiveMission || GIS_MISSIONS[0].id), activeMissionId = s45[0], setActiveMissionId = s45[1];
        var s46 = React.useState(initial.gisMissionProgress || {}), missionProgress = s46[0], setMissionProgress = s46[1];
        var s47 = React.useState(initial.gisMissionResponses || {}), missionResponses = s47[0], setMissionResponses = s47[1];
        var s48 = React.useState(EXAMPLE_TIME_CSV), timeText = s48[0], setTimeText = s48[1];
        var timeConventionState = React.useState('auto'), timeConvention = timeConventionState[0], setTimeConvention = timeConventionState[1];
        var s49 = React.useState(EXAMPLE_TIME_DATA), timeDataset = s49[0], setTimeDataset = s49[1];
        var s50 = React.useState(EXAMPLE_TIME_DATA.years[0]), timeBaseline = s50[0], setTimeBaseline = s50[1];
        var s51 = React.useState(EXAMPLE_TIME_DATA.years[EXAMPLE_TIME_DATA.years.length - 1]), timeFocusYear = s51[0], setTimeFocusYear = s51[1];
        var s52 = React.useState(false), timePlaying = s52[0], setTimePlaying = s52[1];
        var s53 = React.useState(''), timeError = s53[0], setTimeError = s53[1];
        var timeImportDiagnosticsState = React.useState({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] }), timeImportDiagnostics = timeImportDiagnosticsState[0], setTimeImportDiagnostics = timeImportDiagnosticsState[1];
        var s54 = React.useState(''), timeObservation = s54[0], setTimeObservation = s54[1];
        var s55 = React.useState('Loading before-and-after maps. The change table is ready now.'), timeStatus = s55[0], setTimeStatus = s55[1];
        var timeMapReadyState = React.useState(false), timeMapReady = timeMapReadyState[0], setTimeMapReady = timeMapReadyState[1];
        var timeMapUnavailableState = React.useState(false), timeMapUnavailable = timeMapUnavailableState[0], setTimeMapUnavailable = timeMapUnavailableState[1];
        var s56 = React.useState('Untitled GIS project'), projectTitle = s56[0], setProjectTitle = s56[1];
        var s57 = React.useState(normalizeProvenance({ source: 'Classroom learning data', limitations: 'Verify illustrative data with authoritative sources before making decisions.' })), provenance = s57[0], setProvenance = s57[1];
        var s58 = React.useState(3), privacyDigits = s58[0], setPrivacyDigits = s58[1];
        var s59 = React.useState('Autosave is preparing.'), autosaveStatus = s59[0], setAutosaveStatus = s59[1];
        // Set when Leaflet resolves null (blocked CDN, offline, or the 6.5s timeout).
        // Declared with the other useState calls, never conditionally, so hook order
        // is fixed on every render.
        var s60 = React.useState(false), leafletBlocked = s60[0], setLeafletBlocked = s60[1];
        var leafletRetryState = React.useState(0), leafletRetry = leafletRetryState[0], setLeafletRetry = leafletRetryState[1];
        var recoveryState = React.useState(null), recoveryDraft = recoveryState[0], setRecoveryDraft = recoveryState[1];
        var s61 = React.useState(''), projectError = s61[0], setProjectError = s61[1];
        var s62 = React.useState(false), autosaveReady = s62[0], setAutosaveReady = s62[1];
        var s63 = React.useState(normalizeMapComposition(initial.gisComposer || {})), composer = s63[0], setComposer = s63[1];
        var s64 = React.useState({ label: '', lat: '', lon: '' }), annotationDraft = s64[0], setAnnotationDraft = s64[1];
        var s65 = React.useState('Composer ready. Complete the cartography review before sharing.'), composerStatus = s65[0], setComposerStatus = s65[1];
        var s66 = React.useState(normalizeRemoteSensingState(initial.gisRemoteSensing || {})), remoteSensing = s66[0], setRemoteSensing = s66[1];
        var s67 = React.useState(normalizeStoryMap(initial.gisStoryMap || {})), storyMap = s67[0], setStoryMap = s67[1];
        var s68 = React.useState({ title: '', narrative: '', evidence: '', limitation: '' }), storyDraft = s68[0], setStoryDraft = s68[1];
        var s69 = React.useState('Story Map ready. Capture a view, then add your claim, evidence, and limitation.'), storyStatus = s69[0], setStoryStatus = s69[1];
        var s70 = React.useState(normalizeQualityReviewState(initial.gisQualityReview || {})), qualityReviewState = s70[0], setQualityReviewState = s70[1];
        var s71 = React.useState('Quality review ready. Check the safeguards before sharing.'), qualityStatus = s71[0], setQualityStatus = s71[1];
        var s72 = React.useState('Investigation Packet ready. Combine your evidence before handing it off.'), packetStatus = s72[0], setPacketStatus = s72[1];
        var s73 = React.useState(normalizeInquiryPlan(initial.gisInquiryPlan || {})), inquiryPlan = s73[0], setInquiryPlan = s73[1];
        var s74 = React.useState('Investigation Planner ready. Choose a question type and name the evidence you need.'), plannerStatus = s74[0], setPlannerStatus = s74[1];
        var s75 = React.useState(normalizeTeacherReview(initial.gisTeacherReview || {})), teacherReview = s75[0], setTeacherReview = s75[1];
        var s76 = React.useState('Teacher Review ready. Score the rubric and leave a next revision.'), teacherReviewStatus = s76[0], setTeacherReviewStatus = s76[1];
        var mapNode = React.useRef(null);
        var mapViewState = React.useRef(null);
        var compareLeftNode = React.useRef(null);
        var compareRightNode = React.useRef(null);
        var compareViewState = React.useRef(null);
        var timeLeftNode = React.useRef(null);
        var timeRightNode = React.useRef(null);
        var timeViewState = React.useRef(null);
        var mapInstance = React.useRef(null);
        var compareLeftMapInstance = React.useRef(null);
        var compareRightMapInstance = React.useRef(null);
        var timeLeftMapInstance = React.useRef(null);
        var timeRightMapInstance = React.useRef(null);
        var mapTileLayer = React.useRef(null);
        var mapTileBasemap = React.useRef('');
        var compareLeftTileLayer = React.useRef(null);
        var compareRightTileLayer = React.useRef(null);
        var compareLeftTileBasemap = React.useRef('');
        var compareRightTileBasemap = React.useRef('');
        var timeLeftTileLayer = React.useRef(null);
        var timeRightTileLayer = React.useRef(null);
        var compareLeftMoveHandler = React.useRef(null);
        var compareRightMoveHandler = React.useRef(null);
        var timeLeftMoveHandler = React.useRef(null);
        var timeRightMoveHandler = React.useRef(null);
        var studioMounted = React.useRef(true);

        function disposeLeafletMap(mapRef, tileRef, basemapRef) {
          if (tileRef && tileRef.current) detachGISBasemapLayer(tileRef.current);
          if (mapRef.current) {
            try { mapRef.current.remove(); } catch (ignoreMapRemoval) {}
          }
          mapRef.current = null;
          if (tileRef) tileRef.current = null;
          if (basemapRef) basemapRef.current = '';
        }

        function clearMapOverlays(map, preservedTileLayer) {
          map.eachLayer(function (layer) {
            if (layer !== preservedTileLayer) map.removeLayer(layer);
          });
        }

        React.useEffect(function () {
          studioMounted.current = true;
          return function () {
            studioMounted.current = false;
            disposeLeafletMap(mapInstance, mapTileLayer, mapTileBasemap);
            disposeLeafletMap(compareLeftMapInstance, compareLeftTileLayer, compareLeftTileBasemap);
            disposeLeafletMap(compareRightMapInstance, compareRightTileLayer, compareRightTileBasemap);
            disposeLeafletMap(timeLeftMapInstance, timeLeftTileLayer);
            disposeLeafletMap(timeRightMapInstance, timeRightTileLayer);
          };
        }, []);

        var imported = source === 'import';
        var activeRegionPack = getRegionPack(regionPackId);
        var metricDefinition = regionMetric(activeRegionPack, metric);
        var records = imported ? importedRows : activeRegionPack.records.map(function (record) {
          if (!metricDefinition || !metricDefinition.field || metricDefinition.field === metric) return record;
          var compatibleRecord = Object.assign({}, record);
          compatibleRecord[metric] = record[metricDefinition.field];
          return compatibleRecord;
        });
        var values = records.map(function (record) { return valueOf(record, metric, imported); });
        var min = values.length ? Math.min.apply(Math, values) : 0;
        var max = values.length ? Math.max.apply(Math, values) : 1;
        var metricLabel = imported ? gisText.importedValue : localizedMetricLabel(metricDefinition);
        var unit = imported ? '' : (metricDefinition && metricDefinition.unit ? ' ' + metricDefinition.unit : '');
        var geoFeatures = geoData && Array.isArray(geoData.features) ? geoData.features : [];
        var geoValues = geoFeatures.map(function (feature) { return toFiniteNumber((feature.properties || {})[geoMetric]); }).filter(Number.isFinite);
        var geoMin = geoValues.length ? Math.min.apply(Math, geoValues) : 0;
        var geoMax = geoValues.length ? Math.max.apply(Math, geoValues) : 1;
        var geoPropertyKeys = [];
        geoFeatures.forEach(function (feature) {
          Object.keys(feature.properties || {}).forEach(function (key) { if (geoPropertyKeys.indexOf(key) < 0) geoPropertyKeys.push(key); });
        });
        var geoBreaks = calculateBreaks(geoValues, classification, classCount, customBreaks);
        // Draw locally when the learner asked for no basemap, or when Leaflet could
        // not be fetched. Declared here, above every consumer.
        var offlineMap = basemap === 'none' || leafletBlocked;
        var legendBounds = geoValues.length ? [geoMin].concat(geoBreaks).concat([geoMax]) : [];
        var geoSummary = geoFeatures.length ? ' Polygon layer: ' + geoFeatures.length + ' features mapped by ' + geoMetric +
          ' using ' + classification + ' classes, ranging from ' + geoMin + ' to ' + geoMax + '.' : '';
        var summary = describe(records, metric, imported) + geoSummary;
        var selectedGeoFeature = geoFeatures[selectedFeatureIndex] || null;
        var selectedGeometryType = selectedGeoFeature && selectedGeoFeature.geometry ? selectedGeoFeature.geometry.type : '';
        var measuredFeature = featureMeasurements(selectedGeoFeature);
        var pathKm = pathLengthKm(analysisPoints);
        var selectedIndices = analysisSelectionSource === 'buffer' && analysisPoints.length
          ? selectWithinRadius(records, analysisPoints[0], bufferRadiusKm) : analysisSelection;
        var selectedLookup = {};
        selectedIndices.forEach(function (index) { selectedLookup[index] = true; });
        var selectedRecords = selectedIndices.map(function (index) { return records[index]; }).filter(Boolean);
        var selectedValues = selectedRecords.map(function (record) { return valueOf(record, metric, imported); }).filter(Number.isFinite);
        var selectedMean = selectedValues.length ? selectedValues.reduce(function (sum, value) { return sum + value; }, 0) / selectedValues.length : NaN;
        var comparisonChoices = imported
          ? [{ value: 'point:value', label: gisText.importedValue }]
          : regionMetrics(activeRegionPack).map(function (definition) {
            return { value: 'point:' + (definition.field || definition.id), label: localizedMetricLabel(definition) };
          });
        geoKeys.forEach(function (key) { comparisonChoices.push({ value: 'geo:' + key, label: 'GeoJSON: ' + key }); });
        function validChoice(choice, fallbackIndex) {
          return comparisonChoices.some(function (option) { return option.value === choice; })
            ? choice : comparisonChoices[Math.min(fallbackIndex, comparisonChoices.length - 1)].value;
        }
        var leftChoice = validChoice(compareLeft, 0);
        var rightChoice = validChoice(compareRight, 1);
        var leftSeries = comparisonSeries(leftChoice);
        var rightSeries = comparisonSeries(rightChoice);
        var activeMissionIds = activeRegionPack.modules && Array.isArray(activeRegionPack.modules.missions) ? activeRegionPack.modules.missions : [];
        var availableMissions = GIS_MISSIONS.filter(function (mission) { return activeMissionIds.indexOf(mission.id) >= 0; });
        var activeMission = availableMissions.filter(function (mission) { return mission.id === activeMissionId; })[0] || availableMissions[0] || GIS_MISSIONS[0];
        var activeMissionProgress = missionProgress[activeMission.id] || {};
        var activeMissionCompletion = missionCompletion(activeMission, activeMissionProgress);
        var timeYears = timeDataset.years || [];
        var effectiveBaseline = timeYears.indexOf(Number(timeBaseline)) >= 0 ? Number(timeBaseline) : timeYears[0];
        var effectiveFocusYear = timeYears.indexOf(Number(timeFocusYear)) >= 0 ? Number(timeFocusYear) : timeYears[timeYears.length - 1];
        var baselineSnapshot = timelineSnapshot(timeDataset.rows, effectiveBaseline);
        var focusSnapshot = timelineSnapshot(timeDataset.rows, effectiveFocusYear);
        var temporalResult = calculateTemporalChange(timeDataset.rows, effectiveBaseline, effectiveFocusYear);
        var temporalComplete = temporalResult.rows.filter(function (row) { return Number.isFinite(row.change); });
        var temporalSorted = temporalComplete.slice().sort(function (a, b) { return b.change - a.change; });
        var temporalSummary = temporalSorted.length
          ? temporalSorted[0].name + ' has the largest increase (' + display.number(temporalSorted[0].change, 1) + '); ' +
            temporalSorted[temporalSorted.length - 1].name + ' has the smallest change (' + display.number(temporalSorted[temporalSorted.length - 1].change, 1) +
            '). These are descriptive changes and do not establish causes.'
          : 'No complete location pairs are available for the selected years.';
        var privacyAssessment = assessCoordinatePrivacy(importedRows, timeDataset.rows);
        var projectTransformations = [
          importedRows.length ? importedRows.length + ' imported coordinate records normalized' : 'Sample region pack active: ' + activeRegionPack.label,
          geoFeatures.length ? geoFeatures.length + ' GeoJSON features classified by ' + geoMetric : 'No GeoJSON layer loaded',
          'Choropleth classification: ' + classification,
          selectedRecords.length ? selectedRecords.length + ' point records selected by ' + analysisSelectionSource : 'No active point selection',
          'Timeline comparison: ' + effectiveBaseline + ' to ' + effectiveFocusYear,
          composer.annotations.length ? composer.annotations.length + ' map annotations composed' : 'No map annotations added',
          remoteSensing.evidence ? 'Remote-sensing evidence interpretation recorded' : 'Remote-sensing learning scene not yet interpreted'
        ];
        var composerRows = records.map(function (record) {
          return { name: record.name, lat: record.lat, lon: record.lon, value: valueOf(record, metric, imported) };
        });
        var composerModel = Object.assign({}, composer, {
          rows: composerRows,
          metricLabel: metricLabel,
          unit: composer.unit || String(unit || '').trim(),
          source: provenance.source,
          provenance: provenance,
          classification: geoFeatures.length ? classification + ' choropleth plus point scale' : 'continuous five-step point scale',
          generated: display.dateTime(new Date()),
          analysis: summary,
          basemap: basemap === 'none' ? 'No basemap — offline schematic' : basemap === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap'
        });
        var composerAudit = auditMapComposition(composerModel);
        var remoteScene = REMOTE_SCENE;
        var remoteSummary = summarizeRemoteChange(remoteScene, remoteSensing.analysisIndex, remoteScene.resolutionMeters);
        var remoteSelectedCell = remoteScene.cells.filter(function (cell) { return cell.id === remoteSensing.selectedPixel; })[0] || remoteScene.cells[0];
        var remoteBeforeIndex = remoteIndexValue(remoteSelectedCell, 'before', remoteSensing.analysisIndex, true);
        var remoteAfterIndex = remoteIndexValue(remoteSelectedCell, 'after', remoteSensing.analysisIndex, remoteSensing.cloudMask);
        var remoteBeforeClass = classifySpectralPixel(remoteSelectedCell.beforeBands);
        var storyProgress = storyMapProgress(storyMap);
        var qualityReview = buildDataQualityReview({ importedRows: importedRows, timeRows: timeDataset.rows, provenance: provenance, privacyAssessment: privacyAssessment, composerAudit: composerAudit, remoteSummary: remoteSummary, storyProgress: storyProgress, reviewState: qualityReviewState });
        var inquiryProgress = inquiryPlanProgress(inquiryPlan);
        var teacherProgress = teacherReviewProgress(teacherReview);
        var remoteAfterClass = remoteSelectedCell.quality === 'cloud'
          ? { label: remoteSensing.cloudMask ? 'Masked cloud' : 'Cloud-contaminated signal', evidence: remoteSensing.cloudMask ? 'No surface classification is made through cloud cover' : 'Raw reflectance is dominated by cloud, not surface cover' }
          : classifySpectralPixel(remoteSelectedCell.afterBands);

        function formatDistance(km) {
          return display.distance(km, analysisUnit);
        }

        function formatArea(squareKm) {
          return display.area(squareKm, analysisUnit);
        }

        function retryLeaflet() {
          if (!(window.L && window.L.map)) {
            try {
              Array.prototype.slice.call(document.querySelectorAll('[data-gis-leaflet]')).forEach(function (node) {
                if (node.parentNode) node.parentNode.removeChild(node);
              });
            } catch (ignoreLoaderNodes) {}
            window.__alloGISLeaflet = null;
            window._geoLibsLoaded = null;
          }
          setLeafletBlocked(false);
          setMapLoading(true);
          setCompareMapReady(false);
          setCompareMapUnavailable(false);
          setTimeMapReady(false);
          setTimeMapUnavailable(false);
          setLeafletRetry(function (value) { return value + 1; });
          announce('Retrying the online basemap. The data tables remain available while it loads.');
        }

        function interactiveMapSurface(ref, label, height, pending, unavailable) {
          var message = unavailable
            ? 'Interactive map unavailable. The equivalent data table remains available.'
            : 'Preparing interactive map?';
          return h('div', { style: { position: 'relative', height: height, borderRadius: 14, overflow: 'hidden', border: '1px solid #28516a', background: '#102c3b' } },
            h('div', { ref: ref, tabIndex: 0, role: 'application', 'aria-label': label, 'aria-busy': pending ? 'true' : 'false', style: { height: '100%', overflow: 'hidden', background: '#102c3b' } }),
            (pending || unavailable) && h('div', { role: 'status', 'aria-live': 'polite', style: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, boxSizing: 'border-box', background: 'linear-gradient(135deg,#102c3b,#173e4d)', color: '#cfe8f3', fontSize: 12, fontWeight: 700, textAlign: 'center' } },
              h('div', null, message,
                (unavailable || pending) && h('button', { type: 'button', onClick: retryLeaflet, style: Object.assign({}, control, { display: 'block', margin: '12px auto 0', cursor: 'pointer' }) }, unavailable ? 'Try online basemap again' : 'Retry loading'))));
        }

        function comparisonLabel(choice) {
          var match = comparisonChoices.filter(function (option) { return option.value === choice; })[0];
          return match ? match.label : choice;
        }

        function comparisonSeries(choice) {
          var parts = String(choice || '').split(':'), kind = parts[0], key = parts.slice(1).join(':');
          if (kind === 'geo') {
            return {
              kind: 'geo', key: key, label: 'GeoJSON: ' + key,
              rows: geoFeatures.map(function (feature, index) {
                var props = feature.properties || {};
                return {
                  name: geoNameKey && props[geoNameKey] != null ? String(props[geoNameKey]) : 'Feature ' + (index + 1),
                  geometry: feature.geometry ? feature.geometry.type : 'Unknown',
                  lat: null, lon: null, value: props[key]
                };
              })
            };
          }
          return {
            kind: 'point', key: key, label: imported ? 'Imported point value' : key === 'density' ? 'Population density' : 'Broadband access index',
            rows: records.map(function (record) {
              return { name: record.name, geometry: 'Point', lat: record.lat, lon: record.lon, value: key === 'value' ? record.value : record[key] };
            })
          };
        }

        function seriesStats(series) {
          var numeric = series.rows.map(function (row) { return Number(row.value); }).filter(Number.isFinite);
          if (!numeric.length) return { count: series.rows.length, min: null, max: null, mean: null };
          return {
            count: series.rows.length, min: Math.min.apply(Math, numeric), max: Math.max.apply(Math, numeric),
            mean: numeric.reduce(function (sum, value) { return sum + value; }, 0) / numeric.length
          };
        }

        function persist(key, value) {
          setToolData(function (previous) {
            var next = Object.assign({}, previous || {});
            next[key] = value;
            return next;
          });
        }

        function analysisSnapshot() {
          return {
            points: analysisPoints.map(function (point) { return { lat: point.lat, lon: point.lon }; }),
            selection: analysisSelection.slice(),
            source: analysisSelectionSource,
            mode: analysisMode,
            bufferRadiusKm: bufferRadiusKm,
            featureIndex: selectedFeatureIndex
          };
        }

        function applyAnalysisSnapshot(snapshot) {
          var next = snapshot || { points: [], selection: [], source: 'none', mode: analysisMode, bufferRadiusKm: bufferRadiusKm, featureIndex: selectedFeatureIndex };
          setAnalysisMode(['distance', 'buffer', 'nearest'].indexOf(next.mode) >= 0 ? next.mode : analysisMode);
          setAnalysisPoints(Array.isArray(next.points) ? next.points : []);
          setBufferRadiusKm(Math.max(1, Math.min(500, Number(next.bufferRadiusKm) || 25)));
          setSelectedFeatureIndex(Math.max(0, Number(next.featureIndex) || 0));
          setAnalysisSelection(Array.isArray(next.selection) ? next.selection : []);
          setAnalysisSelectionSource(next.source || 'none');
          setAnalysisCopyStatus('');
          persist('gisSpatialAnalysis', true);
        }

        function hasAnalysisState() {
          return analysisPoints.length > 0 || analysisSelection.length > 0 || analysisSelectionSource !== 'none';
        }

        function pushAnalysisHistory() {
          setAnalysisHistory(function (previous) { return previous.concat([analysisSnapshot()]).slice(-20); });
          setAnalysisCopyStatus('');
          setAnalysisFuture([]);
        }

        function undoAnalysis() {
          if (!analysisHistory.length) {
            announce('There is no spatial analysis change to undo.');
            return;
          }
          var previous = analysisHistory[analysisHistory.length - 1];
          setAnalysisHistory(function (items) { return items.slice(0, -1); });
          setAnalysisFuture(function (items) { return items.concat([analysisSnapshot()]).slice(-20); });
          applyAnalysisSnapshot(previous);
          announce('Last spatial analysis change undone.');
        }

        function redoAnalysis() {
          if (!analysisFuture.length) {
            announce('There is no spatial analysis change to redo.');
            return;
          }
          var next = analysisFuture[analysisFuture.length - 1];
          setAnalysisFuture(function (items) { return items.slice(0, -1); });
          setAnalysisHistory(function (items) { return items.concat([analysisSnapshot()]).slice(-20); });
          applyAnalysisSnapshot(next);
          announce('Spatial analysis change restored.');
        }
        React.useEffect(function () {
          function onAnalysisShortcut(event) {
            if (event.isComposing || event.altKey) return;
            var target = event.target;
            var tagName = target && target.tagName ? String(target.tagName).toLowerCase() : '';
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || (target && target.isContentEditable)) return;
            if (!event.ctrlKey && !event.metaKey) return;
            var key = String(event.key || '').toLowerCase();
            if (key === 'z' && event.shiftKey && analysisFuture.length) {
              event.preventDefault();
              redoAnalysis();
            } else if (key === 'z' && !event.shiftKey && analysisHistory.length) {
              event.preventDefault();
              undoAnalysis();
            } else if (key === 'y' && analysisFuture.length) {
              event.preventDefault();
              redoAnalysis();
            }
          }
          window.addEventListener('keydown', onAnalysisShortcut);
          return function () { window.removeEventListener('keydown', onAnalysisShortcut); };
        }, [analysisHistory, analysisFuture]);



        React.useEffect(function () {
          if (typeof ctx.canvasNarrate === 'function') {
            ctx.canvasNarrate('gis-studio', 'init', {
              first: 'GIS Studio loaded. Map layers and equivalent tables show Maine learning data. Import CSV or GeoJSON, compare satellite imagery, or explore projections.',
              repeat: 'GIS Studio active.', terse: 'GIS Studio.'
            }, { debounce: 800 });
          }
        }, []);

        React.useEffect(function () {
          try {
            var raw = window.localStorage && window.localStorage.getItem(GIS_DRAFT_KEY);
            if (raw) {
              var draft = validateGISProject(JSON.parse(raw));
              setRecoveryDraft(draft);
              setAutosaveStatus('A recoverable local draft is available from ' + (draft.savedAt || 'an earlier session') + '.');
              return;
            }
          } catch (draftError) {
            try { if (window.localStorage) window.localStorage.removeItem(GIS_DRAFT_KEY); } catch (ignoreDraftRemoval) {}
          }
          setAutosaveReady(true);
          setAutosaveStatus('Device-local autosave is ready.');
        }, []);

        React.useEffect(function () {
          if (!autosaveReady) return undefined;
          var timer = window.setTimeout(function () {
            try {
              var draft = projectSnapshot();
              window.localStorage.setItem(GIS_DRAFT_KEY, JSON.stringify(draft));
              setAutosaveStatus('Autosaved locally at ' + display.dateTime(new Date(), { hour: 'numeric', minute: '2-digit', second: '2-digit' }) + '.');
            } catch (saveError) {
              setAutosaveStatus('Local autosave is unavailable or the project is too large. Download a project file instead.');
            }
          }, 900);
          return function () { window.clearTimeout(timer); };
        }, [autosaveReady, tab, source, regionPackId, importedRows, metric, layers, basemap, geoData, geoMetric, classification, classCount, customBreaks, analysisMode, analysisPoints, bufferRadiusKm, analysisSelection, analysisSelectionSource, compareLeft, compareRight, compareLeftBasemap, compareRightBasemap, comparisonObservation, missionProgress, missionResponses, activeMissionId, timeDataset, timeBaseline, timeFocusYear, timeObservation, projectTitle, provenance, projection, latitude, composer, remoteSensing, storyMap, qualityReviewState, inquiryPlan, teacherReview]);

        React.useLayoutEffect(function () {
          if (tab !== 'map' || basemap === 'none' || leafletBlocked) {
            if (mapInstance.current) disposeLeafletMap(mapInstance, mapTileLayer, mapTileBasemap);
            if (tab === 'map' && basemap === 'none') {
              setMapStatus('Offline schematic map. Drawn on this device — no map tiles or map libraries were requested.');
              setMapLoading(false);
            }
            return undefined;
          }
          if (!mapNode.current) return undefined;
          var reusableAtStart = mapInstance.current && mapInstance.current.getContainer &&
            mapInstance.current.getContainer() === mapNode.current;
          if (!reusableAtStart) setMapLoading(true);

          var active = true, map = null;
          getLeaflet().then(function (L) {
            if (!active || !L || !mapNode.current) {
              if (active) {
                setMapLoading(false);
                setLeafletBlocked(!L);
                setMapStatus('The online base map is unavailable, so the offline schematic is shown instead. The synchronized data table remains available.');
              }
              return;
            }
            if (active) setLeafletBlocked(false);
            var canReuse = mapInstance.current && mapNode.current && mapInstance.current.getContainer &&
              mapInstance.current.getContainer() === mapNode.current;
            if (!canReuse && mapInstance.current) disposeLeafletMap(mapInstance, mapTileLayer, mapTileBasemap);
            if (!canReuse) mapNode.current.innerHTML = '';
            var packView = activeRegionPack.view || {};
            var viewportPoints = layers.points ? records.slice() : [];
            if (layers.polygons && geoData) viewportPoints = viewportPoints.concat(collectGISGeoJSONPoints(geoData));
            var viewport = dataViewport(viewportPoints, { center: packView.center || [45.15, -69.05], zoom: imported ? undefined : (packView.zoom || activeRegionPack.defaultZoom) });
            var mapArc = minimalLongitudeArc(viewportPoints.map(function (row) { return row.lon; }));
            var center = leafletCenterForViewport(viewport, mapArc);
            var storedView = mapViewState.current;
            map = canReuse ? mapInstance.current : L.map(mapNode.current, { keyboard: true, scrollWheelZoom: false }).setView(
              storedView ? storedView.center : center,
              storedView ? storedView.zoom : viewport.zoom
            );
            if (canReuse && !storedView) map.setView(center, viewport.zoom);
            mapInstance.current = map;
            if (!canReuse) {
            map.on('moveend', function () {
              var currentCenter = map.getCenter();
              mapViewState.current = { center: [currentCenter.lat, currentCenter.lng], zoom: map.getZoom() };
            });
            }
            if (canReuse) {
              clearMapOverlays(map, mapTileLayer.current);
              map.off('click');
            }
            var tileLayer = mapTileLayer.current;
            var tileMatches = tileLayer && mapTileBasemap.current === basemap &&
              (!map.hasLayer || map.hasLayer(tileLayer));
            if (!tileMatches) {
              if (tileLayer) {
                detachGISBasemapLayer(tileLayer);
                try { map.removeLayer(tileLayer); } catch (ignoreOldTileLayer) {}
              }
              tileLayer = createGISBasemapLayer(L, basemap, function (_event, ownedLayer) {
                if (studioMounted.current && mapTileLayer.current === ownedLayer) {
                  setMapLoading(false);
                  setMapStatus('Some online basemap tiles could not load. Mapped data remain interactive; choose the offline schematic if the tile service is blocked.');
                }
              });
              if (!tileLayer) {
                setBasemap('none'); persist('gisBasemap', 'none');
                setMapLoading(false);
                setMapStatus('The saved basemap provider is not available, so the offline schematic is shown.');
                return;
              }
              mapTileLayer.current = tileLayer;
              mapTileBasemap.current = basemap;
              tileLayer.addTo(map);
            }
            if (layers.coast && !imported && activeRegionPack.id === 'maine') {
              L.polyline([[43.08, -70.74], [43.54, -70.18], [43.91, -69.82], [44.05, -69.10], [44.39, -68.20], [44.68, -67.21], [45.19, -67.28]], {
                color: '#22d3ee', weight: 4, opacity: 0.75, dashArray: '8 7'
              }).bindTooltip('Coastal guide (schematic)').addTo(map);
            }
            if (layers.grid) {
              var lat, lon;
              for (lat = Math.floor((center[0] - 5) / 2) * 2; lat <= center[0] + 6; lat += 2) {
                L.polyline([[lat, center[1] - 10], [lat, center[1] + 10]], { color: '#64748b', weight: 1, opacity: 0.55, dashArray: '4 4' }).addTo(map);
              }
              for (lon = Math.floor((center[1] - 10) / 2) * 2; lon <= center[1] + 10; lon += 2) {
                L.polyline([[center[0] - 6, lon], [center[0] + 6, lon]], { color: '#64748b', weight: 1, opacity: 0.55, dashArray: '4 4' }).addTo(map);
              }
            }
            var polygonLayer = null;
            if (layers.polygons && geoData && geoMetric) {
              polygonLayer = L.geoJSON(unwrapGISGeoJSONForArc(geoData, mapArc), {
                style: function (feature) {
                  var geoValue = toFiniteNumber((feature.properties || {})[geoMetric]);
                  return { color: '#e2e8f0', weight: 1.5, fillColor: classColor(geoValue, geoBreaks), fillOpacity: 0.68 };
                },
                pointToLayer: function (feature, latlng) {
                  var geoValue = toFiniteNumber((feature.properties || {})[geoMetric]);
                  return L.circleMarker(latlng, { radius: 9, color: '#fff', weight: 2, fillColor: classColor(geoValue, geoBreaks), fillOpacity: 0.82 });
                },
                onEachFeature: function (feature, layer) {
                  var props = feature.properties || {};
                  var featureName = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature';
                  var geoValue = toFiniteNumber(props[geoMetric]);
                  var geoValueLabel = Number.isFinite(geoValue) ? geoValue : 'No data';
                  layer.bindTooltip(escapeHTML(featureName) + ': ' + escapeHTML(geoValueLabel));
                  layer.on('add', function () {
                    var element = layer.getElement && layer.getElement();
                    if (element) {
                      element.setAttribute('tabindex', '0');
                      element.setAttribute('role', 'img');
                      element.setAttribute('aria-label', featureName + ', ' + geoMetric + ' ' + geoValueLabel);
                    }
                  });
                }
              }).addTo(map);
            }
            if (!storedView && typeof map.fitBounds === 'function' && (viewport.latitudeSpan > 0 || viewport.longitudeSpan > 0)) {
              try {
                map.fitBounds([[viewport.bounds.south, mapArc.westUnwrapped], [viewport.bounds.north, mapArc.eastUnwrapped]], { padding: [18, 18], maxZoom: 10 });
              } catch (ignoreBounds) {}
            }
            if (layers.points) records.forEach(function (record, recordIndex) {
              var value = valueOf(record, metric, imported);
              var p = max === min ? 0.5 : (value - min) / (max - min);
              var isSelected = !!selectedLookup[recordIndex];
              L.circleMarker([record.lat, unwrapLongitudeForArc(record.lon, mapArc)], {
                radius: 7 + p * 11 + (isSelected ? 3 : 0),
                color: isSelected ? '#facc15' : '#fff', weight: isSelected ? 4 : 2,
                fillColor: color(value, min, max), fillOpacity: isSelected ? 1 : 0.86
              }).bindTooltip(escapeHTML(record.name) + ': ' + escapeHTML(value + unit) + (isSelected ? ' (selected)' : '')).addTo(map);
            });
            if (analysisMode === 'distance' && analysisPoints.length) {
              if (analysisPoints.length > 1) L.polyline(analysisPoints.map(function (point) { return [point.lat, unwrapLongitudeForArc(point.lon, mapArc)]; }), { color: '#facc15', weight: 4 }).addTo(map);
              analysisPoints.forEach(function (point, index) {
                L.circleMarker([point.lat, unwrapLongitudeForArc(point.lon, mapArc)], { radius: 5, color: '#111827', weight: 2, fillColor: '#facc15', fillOpacity: 1 })
                  .bindTooltip('Measurement vertex ' + (index + 1)).addTo(map);
              });
            }
            if (analysisMode === 'buffer' && analysisPoints.length) {
              L.circle([analysisPoints[0].lat, unwrapLongitudeForArc(analysisPoints[0].lon, mapArc)], {
                radius: Math.max(0, Number(bufferRadiusKm) || 0) * 1000,
                color: '#facc15', weight: 3, fillColor: '#facc15', fillOpacity: 0.13
              }).bindTooltip(formatDistance(Number(bufferRadiusKm) || 0) + ' radius').addTo(map);
            }
            if (analysisMode === 'nearest' && analysisPoints.length && selectedRecords[0]) {
              L.polyline([[analysisPoints[0].lat, unwrapLongitudeForArc(analysisPoints[0].lon, mapArc)], [selectedRecords[0].lat, unwrapLongitudeForArc(selectedRecords[0].lon, mapArc)]], {
                color: '#facc15', weight: 4, dashArray: '7 6'
              }).addTo(map);
            }
            map.on('click', function (event) {
              var point = { lat: event.latlng.lat, lon: normalizeLongitude(event.latlng.lng) };
              pushAnalysisHistory();
              if (analysisMode === 'distance') {
                setAnalysisPoints(function (previous) { return previous.concat([point]).slice(-20); });
                setAnalysisSelection([]); setAnalysisSelectionSource('none');
                persist('gisSpatialAnalysis', true);
                announce('Measurement vertex added at ' + display.coordinate(point.lat, 4, 'lat') + ', ' + display.coordinate(point.lon, 4, 'lon') + '.');
              } else if (analysisMode === 'buffer') {
                var buffered = selectWithinRadius(records, point, bufferRadiusKm);
                setAnalysisPoints([point]); setAnalysisSelection([]); setAnalysisSelectionSource('buffer');
                persist('gisSpatialAnalysis', true);
                announce(formatDistance(Number(bufferRadiusKm) || 0) + ' buffer selected ' + buffered.length + ' of ' + records.length + ' points.');
              } else {
                var nearest = nearestRecord(records, point);
                setAnalysisPoints([point]);
                setAnalysisSelection(nearest ? [nearest.index] : []);
                setAnalysisSelectionSource('nearest');
                persist('gisSpatialAnalysis', true);
                announce(nearest ? nearest.record.name + ' is nearest at ' + formatDistance(nearest.distanceKm) + '.' : 'No mapped points are available.');
              }
            });
            var instruction = analysisMode === 'distance' ? 'Click map vertices to measure a path.' :
              analysisMode === 'buffer' ? 'Click the map to place the buffer center.' : 'Click the map to find the nearest point.';
            if (!mapTileLayer.current._gisHadTileError) {
              setMapStatus('Interactive base map ready. ' + records.length + ' records mapped. ' + instruction);
            }
            setMapLoading(false);
          });
          return function () {
            active = false;
          };
        }, [tab, source, regionPackId, importedRows, metric, layers.points, layers.coast, layers.grid, layers.polygons, basemap, geoData, geoMetric, classification, classCount, customBreaks, analysisMode, analysisPoints, bufferRadiusKm, analysisSelection, analysisSelectionSource, analysisUnit, leafletBlocked, leafletRetry]);

        React.useLayoutEffect(function () {
          if (tab !== 'compare') {
            if (compareLeftMapInstance.current) disposeLeafletMap(compareLeftMapInstance, compareLeftTileLayer, compareLeftTileBasemap);
            if (compareRightMapInstance.current) disposeLeafletMap(compareRightMapInstance, compareRightTileLayer, compareRightTileBasemap);
            return undefined;
          }
          var comparisonLeftProvider = getGISBasemapProvider(compareLeftBasemap);
          var comparisonRightProvider = getGISBasemapProvider(compareRightBasemap);
          if (!comparisonLeftProvider || !comparisonLeftProvider.url || !comparisonRightProvider || !comparisonRightProvider.url) {
            if (compareLeftMapInstance.current) disposeLeafletMap(compareLeftMapInstance, compareLeftTileLayer, compareLeftTileBasemap);
            if (compareRightMapInstance.current) disposeLeafletMap(compareRightMapInstance, compareRightTileLayer, compareRightTileBasemap);
            setCompareMapReady(false);
            setCompareMapUnavailable(true);
            setCompareStatus('One or more saved basemap providers are unavailable. Comparison tables remain ready; choose an available provider.');
            return undefined;
          }
          if (!compareLeftNode.current || !compareRightNode.current) return undefined;
          var leftReusableAtStart = compareLeftMapInstance.current && compareLeftMapInstance.current.getContainer &&
            compareLeftMapInstance.current.getContainer() === compareLeftNode.current;
          var rightReusableAtStart = compareRightMapInstance.current && compareRightMapInstance.current.getContainer &&
            compareRightMapInstance.current.getContainer() === compareRightNode.current;
          if (!leftReusableAtStart || !rightReusableAtStart) setCompareMapReady(false);
          setCompareMapUnavailable(false);
          var active = true, leftMap = null, rightMap = null;
          getLeaflet().then(function (L) {
            if (!active || !L || !compareLeftNode.current || !compareRightNode.current) {
              if (active) {
                setCompareMapUnavailable(true);
                setCompareStatus('Comparison basemaps are unavailable. Both accessible comparison tables remain ready.');
              }
              return;
            }
            var comparisonPoints = leftSeries.kind === 'point' || rightSeries.kind === 'point' ? records.slice() : [];
            if ((leftSeries.kind === 'geo' || rightSeries.kind === 'geo') && geoData) comparisonPoints = comparisonPoints.concat(collectGISGeoJSONPoints(geoData));
            var comparisonViewport = dataViewport(comparisonPoints, { center: (activeRegionPack.view && activeRegionPack.view.center) || [45.15, -69.05], zoom: imported ? undefined : ((activeRegionPack.view && activeRegionPack.view.zoom) || activeRegionPack.defaultZoom) });
            var comparisonArc = minimalLongitudeArc(comparisonPoints.map(function (row) { return row.lon; }));
            var center = leafletCenterForViewport(comparisonViewport, comparisonArc);
            var stored = compareViewState.current;
            var initialCenter = stored ? stored.center : center;
            var initialZoom = stored ? stored.zoom : comparisonViewport.zoom;
            var leftCanReuse = compareLeftMapInstance.current && compareLeftNode.current && compareLeftMapInstance.current.getContainer &&
              compareLeftMapInstance.current.getContainer() === compareLeftNode.current;
            var rightCanReuse = compareRightMapInstance.current && compareRightNode.current && compareRightMapInstance.current.getContainer &&
              compareRightMapInstance.current.getContainer() === compareRightNode.current;
            if (!leftCanReuse && compareLeftMapInstance.current) disposeLeafletMap(compareLeftMapInstance, compareLeftTileLayer, compareLeftTileBasemap);
            if (!rightCanReuse && compareRightMapInstance.current) disposeLeafletMap(compareRightMapInstance, compareRightTileLayer, compareRightTileBasemap);
            if (!leftCanReuse) compareLeftNode.current.innerHTML = '';
            if (!rightCanReuse) compareRightNode.current.innerHTML = '';
            leftMap = leftCanReuse ? compareLeftMapInstance.current : L.map(compareLeftNode.current, { keyboard: true, scrollWheelZoom: false }).setView(initialCenter, initialZoom);
            rightMap = rightCanReuse ? compareRightMapInstance.current : L.map(compareRightNode.current, { keyboard: true, scrollWheelZoom: false }).setView(initialCenter, initialZoom);
            if (leftCanReuse && !stored) leftMap.setView(initialCenter, initialZoom);
            if (rightCanReuse && !stored) rightMap.setView(initialCenter, initialZoom);
            if (leftCanReuse) {
              clearMapOverlays(leftMap, compareLeftTileLayer.current);
              if (compareLeftMoveHandler.current) leftMap.off('moveend', compareLeftMoveHandler.current);
            }
            if (rightCanReuse) {
              clearMapOverlays(rightMap, compareRightTileLayer.current);
              if (compareRightMoveHandler.current) rightMap.off('moveend', compareRightMoveHandler.current);
            }
            compareLeftMapInstance.current = leftMap;
            compareRightMapInstance.current = rightMap;
            function ensureBasemap(map, name, tileRef, basemapRef) {
              var layer = tileRef.current;
              var matches = layer && basemapRef.current === name && (!map.hasLayer || map.hasLayer(layer));
              if (matches) return layer;
              if (layer) {
                detachGISBasemapLayer(layer);
                try { map.removeLayer(layer); } catch (ignoreOldComparisonTiles) {}
              }
              layer = createGISBasemapLayer(L, name, function (_event, ownedLayer) {
                if (studioMounted.current && tileRef.current === ownedLayer) setCompareStatus('Some comparison basemap tiles could not load. The mapped layers and accessible comparison tables remain available.');
              });
              if (!layer) return null;
              tileRef.current = layer;
              basemapRef.current = name;
              layer.addTo(map);
              return layer;
            }
            function addSeries(map, choice) {
              var series = comparisonSeries(choice);
              var numeric = series.rows.map(function (row) { return Number(row.value); }).filter(Number.isFinite);
              var low = numeric.length ? Math.min.apply(Math, numeric) : 0;
              var high = numeric.length ? Math.max.apply(Math, numeric) : 1;
              if (series.kind === 'point') {
                series.rows.forEach(function (row, index) {
                  var value = Number(row.value), p = high === low ? 0.5 : (value - low) / (high - low);
                  var selected = !!selectedLookup[index];
                  L.circleMarker([row.lat, unwrapLongitudeForArc(row.lon, comparisonArc)], {
                    radius: 7 + p * 10 + (selected ? 2 : 0), color: selected ? '#facc15' : '#fff',
                    weight: selected ? 4 : 2, fillColor: color(value, low, high), fillOpacity: 0.9
                  }).bindTooltip(escapeHTML(row.name) + ': ' + escapeHTML(row.value) + (selected ? ' (selected)' : '')).addTo(map);
                });
              } else if (geoData) {
                var breaks = calculateBreaks(numeric, classification, classCount, customBreaks);
                L.geoJSON(unwrapGISGeoJSONForArc(geoData, comparisonArc), {
                  style: function (feature) {
                    return { color: '#fff', weight: 1.4, fillColor: classColor((feature.properties || {})[series.key], breaks), fillOpacity: 0.72 };
                  },
                  pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, { radius: 9, color: '#fff', weight: 2, fillColor: classColor((feature.properties || {})[series.key], breaks), fillOpacity: 0.85 });
                  },
                  onEachFeature: function (feature, layer) {
                    var props = feature.properties || {};
                    var name = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature';
                    layer.bindTooltip(escapeHTML(name) + ': ' + escapeHTML(props[series.key] == null ? 'No data' : props[series.key]));
                  }
                }).addTo(map);
              }
            }
            var leftComparisonBasemap = ensureBasemap(leftMap, compareLeftBasemap, compareLeftTileLayer, compareLeftTileBasemap);
            var rightComparisonBasemap = ensureBasemap(rightMap, compareRightBasemap, compareRightTileLayer, compareRightTileBasemap);
            if (!leftComparisonBasemap || !rightComparisonBasemap) {
              setCompareMapUnavailable(true);
              setCompareMapReady(false);
              setCompareStatus('One or more saved basemap providers are unavailable. Comparison tables remain ready; choose an available provider.');
              return;
            }
            addSeries(leftMap, leftChoice);
            addSeries(rightMap, rightChoice);
            var syncing = false;
            function synchronize(sourceMap, targetMap) {
              if (syncing) return;
              syncing = true;
              var currentCenter = sourceMap.getCenter(), zoom = sourceMap.getZoom();
              compareViewState.current = { center: [currentCenter.lat, currentCenter.lng], zoom: zoom };
              targetMap.setView(currentCenter, zoom, { animate: false });
              syncing = false;
            }
            compareLeftMoveHandler.current = function () { synchronize(leftMap, rightMap); };
            compareRightMoveHandler.current = function () { synchronize(rightMap, leftMap); };
            leftMap.on('moveend', compareLeftMoveHandler.current);
            rightMap.on('moveend', compareRightMoveHandler.current);
            setCompareMapReady(true);
            if (!compareLeftTileLayer.current._gisHadTileError && !compareRightTileLayer.current._gisHadTileError) {
              setCompareStatus('Comparison maps ready and synchronized. Pan or zoom either map to move both.');
            }
          });
          return function () {
            active = false;
          };
        }, [tab, source, regionPackId, importedRows, geoData, geoNameKey, leftChoice, rightChoice, compareLeftBasemap, compareRightBasemap, classification, classCount, customBreaks, analysisSelection, analysisSelectionSource, bufferRadiusKm, analysisPoints, leafletRetry]);

        React.useEffect(function () {
          if (!timePlaying || timeYears.length < 2) return undefined;
          var timer = window.setInterval(function () {
            setTimeFocusYear(function (current) {
              var index = timeYears.indexOf(Number(current));
              if (index < 0) return timeYears[0];
              if (index >= timeYears.length - 1) {
                setTimePlaying(false);
                return current;
              }
              return timeYears[index + 1];
            });
          }, 1100);
          return function () { window.clearInterval(timer); };
        }, [timePlaying, timeYears.join('|')]);

        React.useLayoutEffect(function () {
          if (tab !== 'timeline') {
            if (timeLeftMapInstance.current) disposeLeafletMap(timeLeftMapInstance, timeLeftTileLayer);
            if (timeRightMapInstance.current) disposeLeafletMap(timeRightMapInstance, timeRightTileLayer);
            return undefined;
          }
          if (!timeLeftNode.current || !timeRightNode.current) return undefined;
          var leftReusableAtStart = timeLeftMapInstance.current && timeLeftMapInstance.current.getContainer &&
            timeLeftMapInstance.current.getContainer() === timeLeftNode.current;
          var rightReusableAtStart = timeRightMapInstance.current && timeRightMapInstance.current.getContainer &&
            timeRightMapInstance.current.getContainer() === timeRightNode.current;
          if (!leftReusableAtStart || !rightReusableAtStart) setTimeMapReady(false);
          setTimeMapUnavailable(false);
          var active = true, leftMap = null, rightMap = null;
          getLeaflet().then(function (L) {
            if (!active || !L || !timeLeftNode.current || !timeRightNode.current) {
              if (active) {
                setTimeMapUnavailable(true);
                setTimeStatus('Timeline basemaps are unavailable. The synchronized change table remains ready.');
              }
              return;
            }
            var leftCanReuse = timeLeftMapInstance.current && timeLeftNode.current && timeLeftMapInstance.current.getContainer &&
              timeLeftMapInstance.current.getContainer() === timeLeftNode.current;
            var rightCanReuse = timeRightMapInstance.current && timeRightNode.current && timeRightMapInstance.current.getContainer &&
              timeRightMapInstance.current.getContainer() === timeRightNode.current;
            if (!leftCanReuse && timeLeftMapInstance.current) disposeLeafletMap(timeLeftMapInstance, timeLeftTileLayer);
            if (!rightCanReuse && timeRightMapInstance.current) disposeLeafletMap(timeRightMapInstance, timeRightTileLayer);
            if (!leftCanReuse) timeLeftNode.current.innerHTML = '';
            if (!rightCanReuse) timeRightNode.current.innerHTML = '';
            var all = baselineSnapshot.concat(focusSnapshot);
            var timelineViewport = dataViewport(all, { center: [45.15, -69.05] });
            var timelineArc = minimalLongitudeArc(all.map(function (row) { return row.lon; }));
            var center = leafletCenterForViewport(timelineViewport, timelineArc);
            var stored = timeViewState.current;
            leftMap = leftCanReuse ? timeLeftMapInstance.current : L.map(timeLeftNode.current, { keyboard: true, scrollWheelZoom: false }).setView(stored ? stored.center : center, stored ? stored.zoom : timelineViewport.zoom);
            rightMap = rightCanReuse ? timeRightMapInstance.current : L.map(timeRightNode.current, { keyboard: true, scrollWheelZoom: false }).setView(stored ? stored.center : center, stored ? stored.zoom : timelineViewport.zoom);
            if (leftCanReuse) {
              clearMapOverlays(leftMap, timeLeftTileLayer.current);
              if (timeLeftMoveHandler.current) leftMap.off('moveend', timeLeftMoveHandler.current);
            }
            if (rightCanReuse) {
              clearMapOverlays(rightMap, timeRightTileLayer.current);
              if (timeRightMoveHandler.current) rightMap.off('moveend', timeRightMoveHandler.current);
            }
            timeLeftMapInstance.current = leftMap;
            timeRightMapInstance.current = rightMap;
            function ensureBasemap(map, tileRef) {
              var layer = tileRef.current;
              if (layer && (!map.hasLayer || map.hasLayer(layer))) return layer;
              if (layer) {
                detachGISBasemapLayer(layer);
                try { map.removeLayer(layer); } catch (ignoreOldTimelineTiles) {}
              }
              layer = createGISBasemapLayer(L, 'street', function (_event, ownedLayer) {
                if (studioMounted.current && tileRef.current === ownedLayer) setTimeStatus('Some timeline basemap tiles could not load. The mapped values and synchronized change table remain available.');
              });
              if (!layer) return null;
              tileRef.current = layer;
              layer.addTo(map);
              return layer;
            }
            var allValues = all.map(function (row) { return row.value; }).filter(Number.isFinite);
            var low = allValues.length ? Math.min.apply(Math, allValues) : 0;
            var high = allValues.length ? Math.max.apply(Math, allValues) : 1;
            var changeLookup = {};
            temporalResult.rows.forEach(function (row) { changeLookup[row.name.toLowerCase()] = row; });
            function addSnapshot(map, snapshot, isFocus) {
              snapshot.forEach(function (row) {
                var p = high === low ? 0.5 : (row.value - low) / (high - low);
                var changed = changeLookup[row.name.toLowerCase()];
                var detail = isFocus && changed && Number.isFinite(changed.change) ? ' (change ' + (changed.change >= 0 ? '+' : '') + display.number(changed.change, 1) + ')' : '';
                L.circleMarker([row.lat, unwrapLongitudeForArc(row.lon, timelineArc)], {
                  radius: 8 + p * 12, color: '#fff', weight: 2,
                  fillColor: color(row.value, low, high), fillOpacity: 0.9
                }).bindTooltip(escapeHTML(row.name) + ': ' + escapeHTML(row.value + (row.unit ? ' ' + row.unit : '') + detail)).addTo(map);
              });
            }
            var leftTimelineBasemap = ensureBasemap(leftMap, timeLeftTileLayer);
            var rightTimelineBasemap = ensureBasemap(rightMap, timeRightTileLayer);
            if (!leftTimelineBasemap || !rightTimelineBasemap) {
              setTimeMapUnavailable(true);
              setTimeStatus('Timeline basemaps are unavailable. The synchronized change table remains ready.');
              return;
            }
            addSnapshot(leftMap, baselineSnapshot, false);
            addSnapshot(rightMap, focusSnapshot, true);
            var syncing = false;
            function sync(sourceMap, targetMap) {
              if (syncing) return;
              syncing = true;
              var currentCenter = sourceMap.getCenter(), zoom = sourceMap.getZoom();
              timeViewState.current = { center: [currentCenter.lat, currentCenter.lng], zoom: zoom };
              targetMap.setView(currentCenter, zoom, { animate: false });
              syncing = false;
            }
            timeLeftMoveHandler.current = function () { sync(leftMap, rightMap); };
            timeRightMoveHandler.current = function () { sync(rightMap, leftMap); };
            leftMap.on('moveend', timeLeftMoveHandler.current);
            rightMap.on('moveend', timeRightMoveHandler.current);
            setTimeMapReady(true);
            if (!timeLeftTileLayer.current._gisHadTileError && !timeRightTileLayer.current._gisHadTileError) {
              setTimeStatus('Before-and-after maps ready and synchronized. Baseline ' + effectiveBaseline + '; focus year ' + effectiveFocusYear + '.');
            }
          });
          return function () {
            active = false;
          };
        }, [tab, effectiveBaseline, effectiveFocusYear, timeDataset, leafletRetry]);

        React.useEffect(function () {
          var maps = [mapInstance.current, compareLeftMapInstance.current, compareRightMapInstance.current, timeLeftMapInstance.current, timeRightMapInstance.current].filter(Boolean);
          if (!maps.length) return undefined;
          function resizeMaps() {
            maps.forEach(function (map) {
              try { map.invalidateSize({ animate: false, pan: false }); } catch (ignoreResize) {}
            });
          }
          var timer = window.setTimeout(resizeMaps, 0);
          window.addEventListener('resize', resizeMaps);
          return function () {
            window.clearTimeout(timer);
            window.removeEventListener('resize', resizeMaps);
          };
        }, [tab, mapLoading, compareMapReady, timeMapReady]);

        function go(next) {
          setTab(next); persist('gisTab', next);
          if (next === 'projection') persist('gisProjectionCompared', true);
          if (next === 'compare') persist('gisCompared', true);
          if (next === 'timeline') persist('gisTimelineAnalyzed', true);
          announce(next + ' workspace');
        }

        function csvConventionControl(value, onChange) {
          return h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, gisText.csvConvention,
            h('select', { value: value, onChange: function (event) { onChange(event.target.value); }, style: control },
              h('option', { value: 'auto' }, gisText.csvAuto),
              h('option', { value: 'comma-dot' }, gisText.csvCommaDot),
              h('option', { value: 'comma-comma' }, gisText.csvCommaComma),
              h('option', { value: 'semicolon-comma' }, gisText.csvSemicolonComma),
              h('option', { value: 'tab-dot' }, gisText.csvTabDot),
              h('option', { value: 'tab-comma' }, gisText.csvTabComma),
              h('option', { value: 'pipe-dot' }, gisText.csvPipeDot),
              h('option', { value: 'pipe-comma' }, gisText.csvPipeComma)));
        }

        function csvFormatSummary(diagnostics) {
          if (!diagnostics || !diagnostics.delimiter || !diagnostics.decimalSeparator) return '';
          var delimiter = diagnostics.delimiter === '\t' ? gisText.csvTabLabel : '"' + diagnostics.delimiter + '"';
          return gisText.csvDetected + ': ' + delimiter + ' \u00B7 ' + gisText.csvDecimalLabel + ' "' + diagnostics.decimalSeparator + '"';
        }

        function clearPointImportPreview() {
          setImportPreview(null);
          setImportColumnMap({ name: '', coordinate1: '', coordinate2: '', value: '' });
        }

        function pointImportOptions(useReviewedMapping) {
          var options = Object.assign({}, gisImportParseOptions(importConvention), {
            crs: importCRS,
            axisOrder: importAxisOrder,
            utmZone: Number(importUTMZone),
            utmHemisphere: importUTMHemisphere
          });
          if (useReviewedMapping) {
            if (!importPreview) throw new Error('Preview the CSV and review its column mapping first.');
            var coordinate1 = Number(importColumnMap.coordinate1);
            var coordinate2 = Number(importColumnMap.coordinate2);
            var value = Number(importColumnMap.value);
            if (!Number.isInteger(coordinate1) || !Number.isInteger(coordinate2) || !Number.isInteger(value)) {
              throw new Error('Choose both coordinate columns and the numeric value column.');
            }
            options.columns = {
              name: importColumnMap.name === '' ? -1 : Number(importColumnMap.name),
              coordinate1: coordinate1,
              coordinate2: coordinate2,
              value: value
            };
          }
          return options;
        }

        function previewPointImport() {
          try {
            var preview = inspectGISCSV(csv, pointImportOptions(false));
            var suggested = preview.suggestedColumns;
            setImportPreview(preview);
            setImportColumnMap({
              name: suggested.name >= 0 ? String(suggested.name) : '',
              coordinate1: suggested.coordinate1 >= 0 ? String(suggested.coordinate1) : '',
              coordinate2: suggested.coordinate2 >= 0 ? String(suggested.coordinate2) : '',
              value: suggested.value >= 0 ? String(suggested.value) : ''
            });
            setImportAxisOrder(preview.axisOrder);
            setError('');
            announce(preview.totalRows + ' CSV rows previewed. Review the coordinate system and column mapping.');
          } catch (problem) {
            clearPointImportPreview();
            setError(problem.message);
            announce('CSV preview error. ' + problem.message);
          }
        }

        function doImport(useReviewedMapping) {
          try {
            var rows = parseCSV(csv, pointImportOptions(!!useReviewedMapping));
            setImportDiagnostics({
              invalidRows: Number(rows.invalidRows) || 0,
              truncatedRows: Number(rows.truncatedRows) || 0,
              invalidSamples: Array.isArray(rows.invalidSamples) ? rows.invalidSamples : [],
              delimiter: rows.delimiter,
              decimalSeparator: rows.decimalSeparator,
              crs: rows.crs,
              axisOrder: rows.axisOrder,
              columnMap: rows.columnMap
            });
            mapViewState.current = null;
            compareViewState.current = null;
            timeViewState.current = null;
            setImportedRows(rows); setSource('import'); setError(''); setTab('map');
            persist('gisImported', true);
            announce(rows.length + ' CSV locations converted to WGS84 and mapped.');
          } catch (problem) { setError(problem.message); announce('CSV error. ' + problem.message); }
        }

        function readFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 1024 * 1024) { setError('Choose a CSV smaller than 1 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () {
            setCSV(String(reader.result || ''));
            setImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] });
            clearPointImportPreview();
            setError('');
          };
          reader.onerror = function () { setError('That file could not be read. Try pasting the CSV.'); };
          reader.readAsText(file);
        }

        function triggerDownload(contents, filename, mimeType) {
          var blob = new Blob([contents], { type: mimeType || 'text/plain;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }

        function downloadImportReport() {
          if (!importDiagnostics.invalidRows && !importDiagnostics.truncatedRows) {
            announce('There are no rejected or capped CSV rows to report.');
            return;
          }
          try {
            var samples = Array.isArray(importDiagnostics.invalidSamples) ? importDiagnostics.invalidSamples : [];
            var reportRows = [
              ['GIS Studio CSV import review'],
              ['Selected source CRS', importDiagnostics.crs || 'EPSG:4326'],
              ['Selected axis order', importDiagnostics.axisOrder || 'lat-lon'],
              ['Invalid rows rejected', importDiagnostics.invalidRows],
              ['Valid rows not loaded by the 250-row limit', importDiagnostics.truncatedRows],
              [],
              ['Source row', 'Name', 'Source coordinate A', 'Source coordinate B', 'Value', 'Reason']
            ].concat(samples.map(function (row) {
              return [
                row.row, row.name,
                row.coordinate1 == null ? row.latitude : row.coordinate1,
                row.coordinate2 == null ? row.longitude : row.coordinate2,
                row.value,
                row.reason || 'A coordinate or value is missing or outside the selected CRS range.'
              ];
            }));
            if (samples.length < importDiagnostics.invalidRows) reportRows.push([], ['Note', 'Only the first 50 rejected rows are included.']);
            triggerDownload(rowsToCSV(reportRows), safeFileStem(projectTitle, 'gis-import') + '-import-review.csv', 'text/csv;charset=utf-8');
            announce('CSV import review downloaded.');
          } catch (reportError) {
            setError('The import review could not be downloaded. ' + reportError.message);
          }
        }

        function applyGeoJSON(parsed, sourceLabel) {
          setGeoData(parsed.data);
          setGeoKeys(parsed.numericKeys);
          setGeoMetric(parsed.numericKeys[0]);
          setGeoNameKey(parsed.nameKey);
          var firstProperties = parsed.data.features[0] && parsed.data.features[0].properties ? Object.keys(parsed.data.features[0].properties) : [];
          setJoinGeoKey(parsed.nameKey || firstProperties[0] || '');
          setJoinPreview(null);
          setGeoError('');
          setLayers(function (previous) { return Object.assign({}, previous, { polygons: true }); });
          setTab('map');
          persist('gisGeoJSONImported', true);
          var formatLabel = parsed.sourceFormat === 'kml' ? 'KML' : parsed.sourceFormat === 'gpx' ? 'GPX' : 'GeoJSON';
          announce(parsed.data.features.length + ' ' + formatLabel + ' features mapped from ' + sourceLabel + '.');
        }

        function doGeoImport() {
          try { applyGeoJSON(parseGISVectorText(geoText, 'auto', 'pasted-data'), 'pasted data'); }
          catch (problem) { setGeoError(problem.message); announce('Spatial layer error. ' + problem.message); }
        }

        function readGeoFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) { setGeoError('Choose a GeoJSON, KML, or GPX file smaller than 3 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () {
            var text = String(reader.result || '');
            setGeoText(text);
            try { applyGeoJSON(parseGISVectorText(text, 'auto', file.name), file.name); }
            catch (problem) { setGeoError(problem.message); announce('Spatial layer error. ' + problem.message); }
          };
          reader.onerror = function () { setGeoError('That spatial layer file could not be read.'); };
          reader.readAsText(file);
        }

        function loadOfficialEcoregions() {
          setOfficialBusy(true); setGeoError('');
          if (typeof window.fetch !== 'function') {
            setOfficialBusy(false);
            setGeoError('Live web layers are unavailable in this browser. Upload GeoJSON instead.');
            return;
          }
          var url = 'https://gis.maine.gov/mapservices/rest/services/mnap/Maine_Ecoregions/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson';
          Promise.resolve(window.fetch(url)).then(function (response) {
            if (!response.ok) throw new Error('The Maine GIS service returned ' + response.status + '.');
            return response.json();
          }).then(function (data) {
            var text = JSON.stringify(data, null, 2);
            setGeoText(text);
            applyGeoJSON(parseGeoJSON(text), 'Maine GeoLibrary');
            setOfficialBusy(false);
          }).catch(function () {
            setOfficialBusy(false);
            setGeoError('The live Maine layer is unavailable right now. Use the included practice layer or upload GeoJSON.');
          });
        }


        function readJoinFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 1024 * 1024) { setJoinError('Choose a join CSV smaller than 1 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () { setJoinText(String(reader.result || '')); setJoinTable(null); setJoinPreview(null); setJoinError(''); };
          reader.onerror = function () { setJoinError('That join CSV could not be read.'); };
          reader.readAsText(file);
        }

        function readJoinColumns() {
          try {
            var table = parseTableCSV(joinText, gisImportParseOptions(joinConvention));
            var geoLookup = {};
            geoPropertyKeys.forEach(function (key) { geoLookup[key.toLowerCase()] = key; });
            var matchingHeader = table.headers.filter(function (header) { return geoLookup[header.toLowerCase()]; })[0];
            var csvKey = matchingHeader || table.headers[0];
            var valueKey = table.numericKeys.filter(function (key) { return key !== csvKey; })[0] || table.numericKeys[0] || '';
            setJoinTable(table);
            setJoinCSVKey(csvKey);
            setJoinGeoKey(matchingHeader ? geoLookup[matchingHeader.toLowerCase()] : (joinGeoKey || geoNameKey || geoPropertyKeys[0] || ''));
            setJoinValueKey(valueKey);
            setJoinPreview(null);
            setJoinError(valueKey ? '' : 'The join CSV needs at least one numeric value column.');
            announce(table.rows.length + ' join rows and ' + table.headers.length + ' columns ready.');
          } catch (problem) { setJoinError(problem.message); setJoinTable(null); }
        }

        function previewJoinData() {
          try {
            var preview = joinTableToGeoJSON(geoData, joinTable ? joinTable.rows : [], joinGeoKey, joinCSVKey, joinValueKey, { decimalSeparator: joinTable && joinTable.decimalSeparator });
            setJoinPreview(preview);
            setJoinError('');
            announce(preview.matched + ' boundaries matched. ' + preview.unmatchedCSV.length + ' CSV rows and ' + preview.unmatchedGeo.length + ' boundaries unmatched.');
          } catch (problem) { setJoinError(problem.message); setJoinPreview(null); }
        }

        function applyJoinData() {
          if (!joinPreview || !joinPreview.matched) return;
          setGeoData(joinPreview.data);
          setGeoKeys(function (previous) {
            return previous.indexOf(joinPreview.metric) >= 0 ? previous : previous.concat([joinPreview.metric]);
          });
          setGeoMetric(joinPreview.metric);
          setJoinPreview(null);
          setTab('map');
          persist('gisJoinApplied', true);
          announce('Join applied. Choropleth now maps ' + joinValueKey + '.');
        }

        function changeRegionPack(nextId) {
          var next = getRegionPack(nextId);
          var nextMetrics = regionMetrics(next);
          var nextMetric = nextMetrics.some(function (definition) { return definition.id === metric; })
            ? metric : (next.defaultMetric || nextMetrics[0].id);
          setRegionPackId(next.id);
          if (nextMetric !== metric) {
            setMetric(nextMetric);
            persist('gisMetric', nextMetric);
          }
          setSource('sample');
          mapViewState.current = null;
          compareViewState.current = null;
          setAnalysisPoints([]);
          setAnalysisSelection([]);
          setAnalysisSelectionSource('none');
          setAnalysisHistory([]);
          setAnalysisFuture([]);
          setAnalysisCopyStatus('');
          setProjectError('');
          persist('gisRegionPack', next.id);
          persist('gisSpatialAnalysis', false);
          announce(localizedRegionLabel(next) + ' loaded. ' + next.description + ' ' + next.sourceNote);
        }
        function clearAnalysis() {
          if (hasAnalysisState()) pushAnalysisHistory();
          setAnalysisPoints([]);
          setAnalysisSelection([]);
          setAnalysisSelectionSource('none');
          announce('Spatial analysis cleared.');
        }

        function analyzeBoundary() {
          if (!selectedGeoFeature || (selectedGeometryType !== 'Polygon' && selectedGeometryType !== 'MultiPolygon')) {
            announce('Choose a polygon or multipolygon boundary.');
            return;
          }
          pushAnalysisHistory();
          var selected = selectPointsInFeature(records, selectedGeoFeature);
          setAnalysisSelection(selected);
          setAnalysisSelectionSource('boundary');
          setAnalysisPoints([]);
          persist('gisSpatialAnalysis', true);
          announce(selected.length + ' of ' + records.length + ' points selected inside the boundary.');
        }

        function sonifySelection() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx || !selectedRecords.length) { announce('No selected records are available to sonify.'); return; }
          var ac;
          try { ac = new Ctx(); } catch (ignore) { return; }
          selectedRecords.forEach(function (record, index) {
            var p = max === min ? 0.5 : (valueOf(record, metric, imported) - min) / (max - min);
            var oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * 0.16;
            oscillator.type = 'triangle';
            oscillator.frequency.value = 300 + p * 700;
            gain.gain.setValueAtTime(0.05, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
            oscillator.connect(gain); gain.connect(ac.destination);
            oscillator.start(start); oscillator.stop(start + 0.13);
          });
          announce('Playing ' + selectedRecords.length + ' selected values from low pitch to high pitch.');
        }

        function explain() {
          if (typeof callGemini !== 'function') {
            setAIText(summary + ' Ask what process, data limitation, or scale effect could explain this.');
            return;
          }
          setAIBusy(true);
          var data = records.slice(0, 40).map(function (record) {
            return [record.name, record.lat, record.lon, valueOf(record, metric, imported)].join(':');
          }).join('; ');
          var geoPayload = geoFeatures.slice(0, 30).map(function (feature, index) {
            var props = feature.properties || {};
            return (geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature ' + (index + 1)) + ':' + props[geoMetric];
          }).join('; ');
          var prompt = 'Act as an accessible secondary-school GIS coach. In 120 words or fewer, name one spatial pattern, one possible explanation to investigate, one limitation, and one useful follow-up layer. Do not claim causation. Metric: ' + metricLabel + '. Summary: ' + summary + ' Point data: ' + data + ' Polygon data: ' + geoPayload;
          Promise.resolve(callGemini(prompt, false, false, 0.4)).then(function (answer) {
            setAIText(String(answer || summary)); setAIBusy(false); announce('Pattern explanation ready.');
          }).catch(function () { setAIText(summary); setAIBusy(false); });
        }

        function sonify() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx || !records.length) { announce('Audio is unavailable. Use the value column in the table.'); return; }
          var ac;
          try { ac = new Ctx(); } catch (ignore) { return; }
          records.slice().sort(function (a, b) { return valueOf(a, metric, imported) - valueOf(b, metric, imported); }).forEach(function (record, index) {
            var p = max === min ? 0.5 : (valueOf(record, metric, imported) - min) / (max - min);
            var oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * 0.12;
            oscillator.frequency.value = 220 + p * 660;
            gain.gain.setValueAtTime(0.045, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
            oscillator.connect(gain); gain.connect(ac.destination);
            oscillator.start(start); oscillator.stop(start + 0.1);
          });
          announce('Playing values from low pitch to high pitch.');
        }

        var panel = { background: '#102536', border: '1px solid #28516a', borderRadius: 14, padding: 14 };
        var control = { padding: '8px 9px', borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#f8fafc' };
        var primary = { padding: '9px 12px', border: 0, borderRadius: 9, background: '#0f766e', color: '#fff', fontWeight: 800, cursor: 'pointer' };

        function toggle(key, label) {
          return h('label', { key: key, style: { display: 'flex', gap: 7, color: '#dbeafe', fontSize: 12 } },
            h('input', { type: 'checkbox', checked: layers[key], onChange: function () {
              var next = Object.assign({}, layers); next[key] = !next[key]; setLayers(next);
            } }), label);
        }

        function tableTwin() {
          return h('section', { 'aria-labelledby': 'gis-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
            h('h2', { id: 'gis-table-heading', style: { margin: '0 0 4px', fontSize: 15, color: '#f0fdfa' } }, 'Accessible data-table twin'),
            h('p', { style: { margin: '0 0 10px', color: '#a7c7d8', fontSize: 11 } }, records.length + ' records. The table carries the same values as the map without relying on color or position.'),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, metricLabel + ' by location'),
                h('thead', null, h('tr', null, ['Location', 'Latitude', 'Longitude', metricLabel, 'Class', 'Analysis selection'].map(function (heading) {
                  return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 8, color: '#67e8f9', borderBottom: '1px solid #3f6b82' } }, heading);
                }))),
                h('tbody', null, records.slice().sort(function (a, b) { return valueOf(b, metric, imported) - valueOf(a, metric, imported); }).map(function (record) {
                  var value = valueOf(record, metric, imported);
                  var classification = value === max ? 'Highest' : value === min ? 'Lowest' : 'Middle range';
                  return h('tr', { key: record.name },
                    h('th', { scope: 'row', style: { textAlign: 'left', padding: 8, color: '#fff', borderBottom: '1px solid #1e4154' } }, record.name),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, display.number(record.lat, { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false })),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, display.number(record.lon, { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false })),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, value + unit),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, classification),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154', color: selectedLookup[records.indexOf(record)] ? '#fde047' : '#a7c7d8', fontWeight: selectedLookup[records.indexOf(record)] ? 800 : 400 } }, selectedLookup[records.indexOf(record)] ? 'Selected' : 'Not selected'));
                })))));
        }

        // ── Offline schematic map ───────────────────────────────────────────────
        // Shown when the learner chooses "no basemap", or when Leaflet could not be
        // fetched. Same data, same choropleth classes, same colours as the Leaflet
        // path (classColor is shared), drawn with zero network requests. It is
        // labelled a schematic everywhere it appears — it preserves relative position
        // but is not a projected navigation map, exactly as the printed report says
        // of its own coordinate plot.
        function schematicMap(options) {
          options = options || {};
          var annotationRows = Array.isArray(options.annotations) ? options.annotations : [];
          var SW = 640, SH = 390;
          var polyRings = [];
          if (layers.polygons) {
            geoFeatures.forEach(function (feature, featureIndex) {
              featureOuterRings(feature).forEach(function (ring, ringIndex) {
                polyRings.push({ key: 'f' + featureIndex + '-' + ringIndex, ring: ring, feature: feature });
              });
            });
          }
          var pointRows = layers.points ? records : [];
          var allPoints = [];
          polyRings.forEach(function (item) { allPoints = allPoints.concat(item.ring); });
          pointRows.forEach(function (record) { allPoints.push({ lat: record.lat, lon: record.lon }); });
          annotationRows.forEach(function (annotation) { allPoints.push({ lat: annotation.lat, lon: annotation.lon }); });
          var proj = schematicProjection(allPoints, SW, SH);
          if (!proj) {
            return h('div', {
              role: 'status',
              style: { height: SH, borderRadius: 14, border: '1px solid #28516a', background: '#071827', color: '#a7c7d8', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, fontSize: 12 }
            }, 'No mappable coordinates yet. Import points or a GeoJSON layer, or use the data table below.');
          }
          var grat = graticuleLines(proj.bounds);
          var kids = [];
          if (layers.grid) {
            grat.lats.forEach(function (lat) {
              var a = proj.project(proj.bounds.minLon, lat), b = proj.project(proj.bounds.maxLon, lat);
              kids.push(h('line', { key: 'glat' + lat, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.55 }));
              kids.push(h('text', { key: 'glatT' + lat, x: 4, y: a.y - 3, fill: '#9fb6c5', fontSize: 9 }, lat.toFixed(2) + '°'));
            });
            grat.lons.forEach(function (lon) {
              var a = proj.project(lon, proj.bounds.minLat), b = proj.project(lon, proj.bounds.maxLat);
              kids.push(h('line', { key: 'glon' + lon, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.55 }));
              kids.push(h('text', { key: 'glonT' + lon, x: a.x + 3, y: SH - 5, fill: '#9fb6c5', fontSize: 9 }, lon.toFixed(2) + '°'));
            });
          }
          polyRings.forEach(function (item) {
            var d = item.ring.map(function (coordinate, index) {
              var p = proj.project(coordinate[0], coordinate[1]);
              return (index === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
            }).join(' ') + ' Z';
            var value = (item.feature.properties || {})[geoMetric];
            kids.push(h('path', {
              key: 'poly' + item.key, d: d,
              fill: geoMetric ? classColor(value, geoBreaks) : 'rgba(34,211,238,0.15)',
              fillOpacity: 0.68, stroke: '#e2e8f0', strokeWidth: 1.2
            }));
          });
          pointRows.forEach(function (record, index) {
            var p = proj.project(record.lon, record.lat);
            var value = valueOf(record, metric, imported);
            kids.push(h('circle', {
              key: 'pt' + index, cx: p.x, cy: p.y, r: 7,
              fill: color(value, min, max), stroke: '#ffffff', strokeWidth: 2, fillOpacity: 0.85
            }));
          });
          annotationRows.forEach(function (annotation, index) {
            var p = proj.project(annotation.lon, annotation.lat);
            kids.push(h('circle', { key: 'annotation-' + index, cx: p.x, cy: p.y, r: 13, fill: '#fde047', stroke: '#111827', strokeWidth: 3 }));
            kids.push(h('text', { key: 'annotation-label-' + index, x: p.x, y: p.y + 4, textAnchor: 'middle', fill: '#111827', fontSize: 10, fontWeight: 900 }, 'A' + (index + 1)));
          });
          // North arrow + the honesty label, both decorative; the aria-label below
          // carries the same facts, and the table twin carries the numbers.
          kids.push(h('text', { key: 'north', x: SW - 14, y: 20, textAnchor: 'end', fill: '#cbd5e1', fontSize: 12, fontWeight: 800 }, 'N ↑'));
          kids.push(h('text', { key: 'schem', x: 8, y: 16, fill: '#7dd3fc', fontSize: 10, fontWeight: 700 }, 'Schematic — not a projected navigation map'));
          var summary = options.altText || (pointRows.length + ' points and ' + polyRings.length + ' boundaries drawn from latitude ' +
            display.coordinate(proj.bounds.minLat, 2, 'lat') + ' to ' + display.coordinate(proj.bounds.maxLat, 2, 'lat') + ' and longitude ' +
            display.coordinate(proj.bounds.minLon, 2, 'lon') + ' to ' + display.coordinate(proj.bounds.maxLon, 2, 'lon') +
            '. Schematic view drawn on this device with no map-tile requests. Exact values are in the data table below.');
          return h('svg', {
            viewBox: '0 0 ' + SW + ' ' + SH, width: '100%', role: 'img', 'aria-label': summary,
            style: { display: 'block', height: SH, borderRadius: 14, border: '1px solid #28516a', background: '#071827' }
          }, kids);
        }

        function analysisControls() {
          return h('section', { 'aria-labelledby': 'gis-analysis-controls-heading', style: { marginTop: 15, paddingTop: 14, borderTop: '1px solid #28516a' } },
            h('h3', { id: 'gis-analysis-controls-heading', style: { margin: '0 0 8px', color: '#fde68a', fontSize: 13 } }, 'Spatial analysis workbench'),
            h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } },
              h('span', { style: { fontWeight: 700 } }, 'Map-click tool'),
              h('select', { value: analysisMode, onChange: function (event) {
                setAnalysisMode(event.target.value); clearAnalysis();
              }, style: control },
                h('option', { value: 'distance' }, 'Measure path'),
                h('option', { value: 'buffer' }, 'Radius buffer'),
                h('option', { value: 'nearest' }, 'Find nearest point'))),
            h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } },
              h('span', { style: { fontWeight: 700 } }, 'Units'),
              h('select', { value: analysisUnit, onChange: function (event) { setAnalysisUnit(event.target.value); persist('gisAnalysisUnit', event.target.value); }, style: control },
                h('option', { value: 'metric' }, 'Metric (km)'),
                h('option', { value: 'imperial' }, 'U.S. customary (mi)'))),
            analysisMode === 'buffer' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } },
              h('span', { style: { fontWeight: 700 } }, 'Buffer radius'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'number', 'aria-label': 'Buffer radius in kilometers', min: 1, max: 500, step: 1, value: bufferRadiusKm, onChange: function (event) { setBufferRadiusKm(Math.max(1, Math.min(500, Number(event.target.value) || 1))); }, style: Object.assign({}, control, { width: 78 }) }),
                h('span', null, analysisUnit === 'imperial' ? 'km (' + formatDistance(bufferRadiusKm) + ')' : 'km'))),
            h('p', { style: { margin: '5px 0 9px', color: '#a7c7d8', fontSize: 10, lineHeight: 1.45 } },
              analysisMode === 'distance' ? 'Click two or more map locations. Each click adds a path segment.' :
                analysisMode === 'buffer' ? 'Click once to center a straight-line radius and select mapped points inside it.' :
                  'Click anywhere to identify the closest mapped point by straight-line distance.'),
            h('button', { type: 'button', onClick: clearAnalysis, style: Object.assign({}, control, { width: '100%', cursor: 'pointer' }) }, 'Clear map analysis'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, marginBottom: 2 } },
              h('button', { type: 'button', onClick: undoAnalysis, disabled: !analysisHistory.length, 'aria-label': 'Undo last spatial analysis change', style: Object.assign({}, control, { cursor: analysisHistory.length ? 'pointer' : 'not-allowed', opacity: analysisHistory.length ? 1 : 0.55 }) }, 'Undo analysis'),
              h('button', { type: 'button', onClick: redoAnalysis, disabled: !analysisFuture.length, 'aria-label': 'Redo spatial analysis change', style: Object.assign({}, control, { cursor: analysisFuture.length ? 'pointer' : 'not-allowed', opacity: analysisFuture.length ? 1 : 0.55 }) }, 'Redo analysis')),
            h('p', { style: { margin: '5px 0 0', color: '#7dd3fc', fontSize: 10 } },
              analysisHistory.length ? analysisHistory.length + ' undoable analysis change' + (analysisHistory.length === 1 ? '' : 's') + '.' : 'No undoable analysis changes yet.'),
            h('p', { style: { margin: '3px 0 0', color: '#8aa9bb', fontSize: 10 } }, 'Keyboard: Ctrl/Cmd+Z to undo; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo.'),
            geoFeatures.length > 0 && h('div', { style: { marginTop: 13, paddingTop: 12, borderTop: '1px solid #28516a' } },
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 8 } },
                h('span', { style: { fontWeight: 700 } }, 'GeoJSON feature to measure'),
                h('select', { value: selectedFeatureIndex, onChange: function (event) { if (hasAnalysisState()) pushAnalysisHistory(); setSelectedFeatureIndex(Number(event.target.value)); setAnalysisSelection([]); setAnalysisSelectionSource('none'); }, style: control },
                  geoFeatures.map(function (feature, index) {
                    var props = feature.properties || {};
                    var name = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature ' + (index + 1);
                    return h('option', { key: index, value: index }, String(name) + ' (' + feature.geometry.type + ')');
                  }))),
              h('button', { type: 'button', onClick: analyzeBoundary, disabled: selectedGeometryType !== 'Polygon' && selectedGeometryType !== 'MultiPolygon', style: Object.assign({}, primary, { width: '100%', opacity: selectedGeometryType === 'Polygon' || selectedGeometryType === 'MultiPolygon' ? 1 : 0.55 }) }, 'Select points inside boundary')));
        }

        function analysisResults() {
          var narrative;
          if (analysisSelectionSource === 'buffer' && analysisPoints.length) {
            narrative = formatDistance(Number(bufferRadiusKm) || 0) + ' radius contains ' + selectedRecords.length + ' of ' + records.length + ' mapped points. Proximity is not the same as access or travel time.';
          } else if (analysisSelectionSource === 'nearest' && selectedRecords.length && analysisPoints.length) {
            narrative = selectedRecords[0].name + ' is the nearest mapped point at ' + formatDistance(haversineKm(analysisPoints[0], selectedRecords[0])) + '. Straight-line distance may differ from route distance.';
          } else if (analysisSelectionSource === 'boundary') {
            narrative = selectedRecords.length + ' of ' + records.length + ' mapped points fall inside the chosen boundary. Results depend on boundary scale and coordinate quality.';
          } else if (analysisMode === 'distance' && analysisPoints.length > 1) {
            narrative = 'Measured path: ' + formatDistance(pathKm) + ' across ' + (analysisPoints.length - 1) + ' segment' + (analysisPoints.length === 2 ? '' : 's') + '. This is geodesic point-to-point distance, not road distance.';
          } else {
            narrative = analysisMode === 'distance' ? 'Click at least two map locations to measure a path.' :
              analysisMode === 'buffer' ? 'Click the map to place a buffer and select points.' : 'Click the map to find the nearest mapped point.';
          }
          return h('section', { 'aria-labelledby': 'gis-analysis-results-heading', style: panel },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              h('div', null,
                h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.08em' } }, 'MEASURE • BUFFER • SELECT'),
                h('h2', { id: 'gis-analysis-results-heading', style: { margin: '3px 0 0', color: '#f0fdfa', fontSize: 16 } }, 'Spatial analysis results')),
              h('button', { type: 'button', onClick: sonifySelection, disabled: !selectedRecords.length, style: Object.assign({}, primary, { background: '#083344', border: '1px solid #22d3ee', opacity: selectedRecords.length ? 1 : 0.55 }) }, '♫ Sonify selection')),
              h('button', { type: 'button', onClick: copyAnalysisSummary, disabled: !hasAnalysisState(), 'aria-label': 'Copy the current spatial analysis summary', style: Object.assign({}, control, { cursor: hasAnalysisState() ? 'pointer' : 'not-allowed', opacity: hasAnalysisState() ? 1 : 0.55 }) }, 'Copy analysis summary'),
            analysisCopyStatus && h('p', { role: 'status', style: { margin: '5px 0 0', color: '#86efac', fontSize: 11 } }, analysisCopyStatus),
            h('p', { role: 'status', style: { margin: '10px 0', color: '#cfe8f3', fontSize: 12, lineHeight: 1.55 } }, narrative),
            selectedGeoFeature && h('div', { style: { display: 'flex', gap: 9, flexWrap: 'wrap', padding: 10, borderRadius: 9, background: '#071827', color: '#dbeafe', fontSize: 11 } },
              (selectedGeometryType === 'Polygon' || selectedGeometryType === 'MultiPolygon') && h('strong', { style: { color: '#86efac' } }, 'Area: ' + formatArea(measuredFeature.areaSquareKm)),
              (selectedGeometryType === 'Polygon' || selectedGeometryType === 'MultiPolygon') && h('span', null, 'Perimeter: ' + formatDistance(measuredFeature.perimeterKm)),
              (selectedGeometryType === 'LineString' || selectedGeometryType === 'MultiLineString') && h('strong', { style: { color: '#86efac' } }, 'Line length: ' + formatDistance(measuredFeature.lengthKm))),
            selectedRecords.length > 0 && h('div', { style: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 } },
              h('div', { style: { padding: 9, borderRadius: 8, background: '#123143' } }, h('strong', { style: { display: 'block', color: '#fde047', fontSize: 18 } }, selectedRecords.length), h('span', { style: { fontSize: 10 } }, 'selected points')),
              h('div', { style: { padding: 9, borderRadius: 8, background: '#123143' } }, h('strong', { style: { display: 'block', color: '#67e8f9', fontSize: 18 } }, Number.isFinite(selectedMean) ? display.number(selectedMean, 1) : '\u2014'), h('span', { style: { fontSize: 10 } }, 'selected mean, ' + metricLabel)),
              h('div', { style: { padding: 9, borderRadius: 8, background: '#123143' } }, h('strong', { style: { display: 'block', color: '#f0fdfa', fontSize: 12 } }, selectedRecords.slice(0, 4).map(function (record) { return record.name; }).join(', ') + (selectedRecords.length > 4 ? ' +' + (selectedRecords.length - 4) : '')), h('span', { style: { fontSize: 10 } }, 'selected locations'))),
            h('p', { style: { margin: '10px 0 0', color: '#fcd34d', fontSize: 10, lineHeight: 1.45 } }, 'Analysis describes spatial relationships in the loaded data; it does not establish cause and effect. The table below marks every selected row.'));
        }

        function mapView() {
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('details', { open: true, style: Object.assign({}, panel, { padding: 14 }) },
              h('summary', { style: { cursor: 'pointer', color: '#f0fdfa', fontSize: 15, fontWeight: 900 } }, 'Start a first investigation'),
              h('p', { style: { margin: '9px 0', color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } }, 'Use this short path to move from a map pattern to a defensible evidence handoff.'),
              h('ol', { style: { margin: '0 0 11px', paddingLeft: 22, color: '#dbeafe', fontSize: 11, lineHeight: 1.65 } },
                h('li', null, 'Choose a sample or import your own coordinate data.'),
                h('li', null, 'Describe a visible pattern and check the table twin.'),
                h('li', null, 'Compare layers, name a limitation, and save the evidence packet.')),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: function () { go('import'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Import data'),
                h('button', { type: 'button', onClick: function () { go('compare'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Compare layers'),
                h('button', { type: 'button', onClick: function () { go('packet'); }, style: Object.assign({}, primary, { cursor: 'pointer' }) }, 'Build evidence packet'))),
            h('section', { 'aria-labelledby': 'gis-map-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 } },
              h('div', { style: panel },
                h('h2', { id: 'gis-map-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Layer workspace'),
                h('p', { style: { margin: '0 0 13px', color: '#a7c7d8', fontSize: 11, lineHeight: 1.5 } }, 'A GIS combines geometry, attributes, and layers.'),
                h('fieldset', { style: { border: 0, padding: 0, margin: '0 0 13px' } },
                  h('legend', { style: { color: '#67e8f9', fontWeight: 800, fontSize: 11, marginBottom: 7 } }, 'DATA SOURCE'),
                  h('label', { style: { display: 'block', fontSize: 12, marginBottom: 6 } }, h('input', { type: 'radio', name: 'gis-source', checked: !imported, onChange: function () { mapViewState.current = null; compareViewState.current = null; setSource('sample'); } }), ' Sample / region pack'),
                  h('label', { style: { display: 'block', fontSize: 12, color: importedRows.length ? '#dbeafe' : '#68849a' } }, h('input', { type: 'radio', name: 'gis-source', checked: imported, disabled: !importedRows.length, onChange: function () { mapViewState.current = null; compareViewState.current = null; setSource('import'); } }), ' My CSV')),
                !imported && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 13 } },
                  h('span', { style: { fontWeight: 700 } }, 'Sample region pack'),
                  h('select', { value: activeRegionPack.id, onChange: function (event) { changeRegionPack(event.target.value); }, style: control, 'aria-describedby': 'gis-region-pack-note' },
                    GIS_REGION_PACKS.map(function (pack) { return h('option', { key: pack.id, value: pack.id }, localizedRegionLabel(pack)); })),
                  h('span', { id: 'gis-region-pack-note', style: { color: '#9fb6c5', fontSize: 10, lineHeight: 1.45 } }, activeRegionPack.description + ' ' + activeRegionPack.sourceNote)),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 13 } },
                  h('span', { style: { fontWeight: 700 } }, 'Basemap'),
                  h('select', { value: basemap, onChange: function (event) { setBasemap(event.target.value); persist('gisBasemap', event.target.value); }, style: control },
                    h('option', { value: 'street' }, 'Street map'),
                    h('option', { value: 'satellite' }, 'Satellite imagery'),
                    h('option', { value: 'none' }, 'No basemap — offline schematic')),
                  h('span', { style: { color: '#9fb6c5', fontSize: 10, lineHeight: 1.45 } },
                    basemap === 'none'
                      ? 'Drawn on this device. No map-tile or map-library requests are made.'
                      : 'Street and satellite basemaps load Leaflet from unpkg.com and tiles from ' + (basemap === 'satellite' ? 'Esri' : 'OpenStreetMap') + '. Each pan or zoom tells that service which area you are viewing.')),
                !imported && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 13 } },
                  h('span', { style: { fontWeight: 700 } }, 'Thematic attribute'),
                  h('select', { value: metric, onChange: function (event) { setMetric(event.target.value); persist('gisMetric', event.target.value); }, style: control },
                    regionMetrics(activeRegionPack).map(function (definition) { return h('option', { key: definition.id, value: definition.id }, localizedMetricLabel(definition)); }))),
                geoKeys.length > 0 && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Choropleth attribute'),
                  h('select', { value: geoMetric, onChange: function (event) { setGeoMetric(event.target.value); }, style: control },
                    geoKeys.map(function (key) { return h('option', { key: key, value: key }, key); }))),
                geoFeatures.length > 0 && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Classification method'),
                  h('select', { value: classification, onChange: function (event) { setClassification(event.target.value); persist('gisClassification', event.target.value); }, style: control },
                    h('option', { value: 'quantile' }, 'Quantiles'),
                    h('option', { value: 'equal' }, 'Equal intervals'),
                    h('option', { value: 'jenks' }, 'Natural breaks (Jenks)'),
                    h('option', { value: 'custom' }, 'Custom thresholds'))),
                geoFeatures.length > 0 && classification !== 'custom' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Classes: ' + classCount),
                  h('input', { type: 'range', min: 3, max: 7, value: classCount, onChange: function (event) { setClassCount(Number(event.target.value)); } })),
                geoFeatures.length > 0 && classification === 'custom' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Thresholds, comma separated'),
                  h('input', { type: 'text', value: customBreaks, onChange: function (event) { setCustomBreaks(event.target.value); }, style: control })),
                h('fieldset', { style: { border: 0, padding: 0, display: 'grid', gap: 8, margin: '0 0 13px' } },
                  h('legend', { style: { color: '#67e8f9', fontWeight: 800, fontSize: 11, marginBottom: 7 } }, 'Visible layers'),
                  toggle('points', 'Thematic points'), geoFeatures.length > 0 && toggle('polygons', 'GeoJSON choropleth'), !imported && activeRegionPack.id === 'maine' && toggle('coast', 'Coastal guide'), toggle('grid', 'Coordinate grid')),
                h('button', { type: 'button', onClick: sonify, style: Object.assign({}, primary, { width: '100%', background: '#083344', border: '1px solid #22d3ee' }) }, '\u266B Sonify values'),
                h('p', { style: { color: '#9fb6c5', fontSize: 10, lineHeight: 1.4 } }, 'Low values use lower pitches. The table is the equivalent non-audio view.'),
                analysisControls()),
              h('div', null,
                offlineMap
                  ? schematicMap()
                  : interactiveMapSurface(mapNode, 'Interactive GIS map. Use keyboard controls to pan and zoom. An equivalent table follows.', 390, mapLoading, false),
                h('p', { role: 'status', style: { margin: '7px 2px 0', color: '#a7c7d8', fontSize: 11 } }, mapStatus),
                leafletBlocked && basemap !== 'none' && h('aside', { role: 'status', style: { marginTop: 8, padding: 10, borderLeft: '4px solid #38bdf8', borderRadius: 8, background: '#102c3b', color: '#bae6fd', fontSize: 11, lineHeight: 1.45 } },
                  h('strong', null, 'Online basemap unavailable. '), 'The offline schematic is active. ',
                  h('button', { type: 'button', onClick: retryLeaflet, style: Object.assign({}, control, { margin: '7px 6px 0 0', cursor: 'pointer' }) }, 'Try online basemap again'),
                  h('button', { type: 'button', onClick: function () { setBasemap('none'); persist('gisBasemap', 'none'); }, style: Object.assign({}, control, { marginTop: 7, cursor: 'pointer' }) }, 'Keep offline')),
                imported && basemap !== 'none' && h('p', { role: 'status', style: { margin: '7px 2px 0', color: '#fde68a', fontSize: 10, lineHeight: 1.45 } }, 'Online basemap privacy: the tile service can infer the area being viewed. Choose "No basemap - offline schematic" before working with sensitive classroom locations.'),
                imported && (privacyAssessment.highPrecision > 0 || privacyAssessment.identifierWarnings > 0) && h('aside', { role: 'alert', style: { marginTop: 8, padding: 10, borderLeft: '4px solid #f59e0b', borderRadius: 8, background: '#2b2617', color: '#fde68a', fontSize: 11, lineHeight: 1.45 } },
                  h('strong', null, 'Privacy check before sharing. '), privacyAssessment.highPrecision + ' point row' + (privacyAssessment.highPrecision === 1 ? '' : 's') + ' use highly precise coordinates and ' + privacyAssessment.identifierWarnings + ' have identifier-like labels. Review the Project privacy controls and round or aggregate sensitive points.'),
                imported && (importDiagnostics.invalidRows > 0 || importDiagnostics.truncatedRows > 0) && h('p', { role: 'status', style: { margin: '7px 2px 0', padding: 9, borderLeft: '4px solid #f59e0b', borderRadius: 6, background: '#2b2617', color: '#fde68a', fontSize: 11 } }, 'Import review: ' + importDiagnostics.invalidRows + ' row' + (importDiagnostics.invalidRows === 1 ? '' : 's') + ' skipped because coordinates or values were invalid.' + (importDiagnostics.truncatedRows > 0 ? ' ' + importDiagnostics.truncatedRows + ' additional valid row' + (importDiagnostics.truncatedRows === 1 ? '' : 's') + ' were not loaded; the 250-row limit applies.' : '')),
                geoValues.length > 0 ? h('div', { role: 'list', 'aria-label': classification + ' choropleth legend for ' + geoMetric, style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', color: '#b7d2df', fontSize: 10 } },
                  legendBounds.slice(0, -1).map(function (lower, index) {
                    var upper = legendBounds[index + 1];
                    var label = display.number(lower, 1) + ' to ' + display.number(upper, 1);
                    return h('span', { key: index, role: 'listitem', style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { width: 18, height: 10, display: 'inline-block', background: paletteForClasses(legendBounds.length - 1)[Math.min(index, legendBounds.length - 2)], borderRadius: 2, border: '1px solid rgba(255,255,255,.35)' } }),
                      label);
                  })) : h('div', { role: 'img', 'aria-label': 'Point values run from low teal to high rose', style: { color: '#b7d2df', fontSize: 10 } }, 'Point legend: low teal \u2192 high rose'))),
            analysisResults(),
            basemap === 'satellite' && h('section', { 'aria-labelledby': 'gis-imagery-heading', style: panel },
              h('h2', { id: 'gis-imagery-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 15 } }, 'Satellite imagery reading routine'),
              h('p', { style: { margin: '0 0 9px', color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } }, 'Observe before interpreting. Look for color, texture, pattern, shape, shadow, and context; then switch to the street map to test your idea.'),
              h('label', { style: { display: 'grid', gap: 5, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Evidence-based observation',
                h('textarea', { value: imageryNote, onChange: function (event) { setImageryNote(event.target.value); }, rows: 3, placeholder: 'I notice... I think it may be... because...', style: { width: '100%', boxSizing: 'border-box', padding: 9, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff' } }))),
            h('section', { 'aria-labelledby': 'gis-pattern-heading', style: panel },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
                h('h2', { id: 'gis-pattern-heading', style: { margin: 0, fontSize: 15, color: '#f0fdfa' } }, 'Spatial pattern coach'),
                h('button', { type: 'button', onClick: explain, disabled: aiBusy, style: primary }, aiBusy ? 'Analyzing\u2026' : '\u2728 Explain this pattern')),
              h('p', { style: { margin: '9px 0 0', color: '#cfe8f3', fontSize: 12, lineHeight: 1.55 } }, aiText || summary)),
            tableTwin(),
            geoFeatures.length > 0 && h('section', { 'aria-labelledby': 'gis-geo-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
              h('h2', { id: 'gis-geo-table-heading', style: { margin: '0 0 4px', fontSize: 15, color: '#f0fdfa' } }, 'Choropleth feature-table twin'),
              h('p', { style: { margin: '0 0 10px', color: '#a7c7d8', fontSize: 11 } }, geoFeatures.length + ' GeoJSON features mapped by ' + geoMetric + '.'),
              h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                  h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, 'GeoJSON feature values for the choropleth'),
                  h('thead', null, h('tr', null, ['Feature', 'Geometry', geoMetric].map(function (heading) {
                    return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 8, color: '#67e8f9', borderBottom: '1px solid #3f6b82' } }, heading);
                  }))),
                  h('tbody', null, geoFeatures.map(function (feature, index) {
                    var props = feature.properties || {};
                    var featureName = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature ' + (index + 1);
                    return h('tr', { key: index },
                      h('th', { scope: 'row', style: { textAlign: 'left', padding: 8, color: '#fff', borderBottom: '1px solid #1e4154' } }, String(featureName)),
                      h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, feature.geometry.type),
                      h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, String(props[geoMetric])));
                  }))))));
        }

        function importCoordinateRole(first) {
          if (importCRS === 'EPSG:4326') {
            if (importAxisOrder === 'lon-lat') return first ? gisText.importLongitude : gisText.importLatitude;
            return first ? gisText.importLatitude : gisText.importLongitude;
          }
          if (importAxisOrder === 'y-x') return first ? gisText.importNorthing : gisText.importEasting;
          return first ? gisText.importEasting : gisText.importNorthing;
        }

        function importColumnControl(label, key, required) {
          if (!importPreview) return null;
          return h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } },
            label + (required ? ' *' : ''),
            h('select', {
              value: importColumnMap[key],
              onChange: function (event) {
                var next = Object.assign({}, importColumnMap);
                next[key] = event.target.value;
                setImportColumnMap(next);
                setError('');
              },
              style: control,
              required: !!required
            },
              h('option', { value: '' }, gisText.importChooseColumn),
              importPreview.headers.map(function (header, index) {
                return h('option', { key: key + '-' + index, value: String(index) }, header || ('Column ' + (index + 1)));
              })));
        }

        function importPreviewPanel() {
          if (!importPreview) return null;
          return h('div', { style: { marginTop: 14, padding: 14, borderRadius: 12, background: '#071827', border: '1px solid #3f6b82', display: 'grid', gap: 12 } },
            h('div', null,
              h('h3', { style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 15 } }, gisText.importMappingHeading),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } }, gisText.importMappingHelp),
              h('p', { role: 'status', style: { margin: '7px 0 0', color: '#67e8f9', fontSize: 11 } },
                display.number(importPreview.totalRows, { maximumFractionDigits: 0 }) + ' source rows \u00B7 ' +
                importPreview.crs + ' \u00B7 ' + csvFormatSummary(importPreview))),
            importPreview.suggestedColumns.usedFallback && h('p', { role: 'status', style: { margin: 0, padding: 9, borderLeft: '4px solid #f59e0b', borderRadius: 6, background: '#2b2617', color: '#fde68a', fontSize: 11 } }, gisText.importFallbackWarning),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 } },
              importColumnControl(gisText.importNameColumn, 'name', false),
              importColumnControl(gisText.importCoordinateA + ' (' + importCoordinateRole(true) + ')', 'coordinate1', true),
              importColumnControl(gisText.importCoordinateB + ' (' + importCoordinateRole(false) + ')', 'coordinate2', true),
              importColumnControl(gisText.importValueColumn, 'value', true)),
            h('div', { style: { overflowX: 'auto', maxHeight: 260, overflowY: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                h('caption', { style: { textAlign: 'left', color: '#a7c7d8', paddingBottom: 7 } }, gisText.importPreviewCaption),
                h('thead', null, h('tr', null, importPreview.headers.map(function (header, index) {
                  return h('th', { key: 'preview-header-' + index, scope: 'col', style: { textAlign: 'left', padding: 7, color: '#67e8f9', borderBottom: '1px solid #3f6b82', position: 'sticky', top: 0, background: '#071827' } }, header || ('Column ' + (index + 1)));
                }))),
                h('tbody', null, importPreview.sampleRows.map(function (row, rowIndex) {
                  return h('tr', { key: 'preview-row-' + rowIndex }, importPreview.headers.map(function (_header, columnIndex) {
                    return h('td', { key: 'preview-cell-' + rowIndex + '-' + columnIndex, style: { padding: 7, color: '#e6fffb', borderBottom: '1px solid #1e4154', whiteSpace: 'nowrap' } }, row[columnIndex] == null ? '' : String(row[columnIndex]));
                  }));
                })))),
            h('button', { type: 'button', onClick: function () { doImport(true); }, style: Object.assign({}, primary, { justifySelf: 'start' }) }, gisText.importMapReviewedButton));
        }
        function importView() {
          return h('div', { style: { maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-import-heading', style: Object.assign({}, panel, { padding: 18 }) },
              h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, gisText.importPointKicker),
              h('h2', { id: 'gis-import-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, gisText.importHeading),
              h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, gisText.importIntro),
              h('label', { style: { display: 'grid', gap: 6, margin: '14px 0', fontSize: 12, fontWeight: 700 } }, gisText.importChooseFile,
                h('input', { type: 'file', accept: '.csv,text/csv', onChange: readFile })),
              h('div', { style: { margin: '0 0 12px' } },
                csvConventionControl(importConvention, function (next) {
                  setImportConvention(next);
                  setImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] });
                  clearPointImportPreview();
                  setError('');
                })),
              h('label', { style: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 } }, gisText.importPaste,
                h('textarea', { value: csv, onChange: function (event) {
                  setCSV(event.target.value);
                  setImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] });
                  clearPointImportPreview();
                  setError('');
                }, rows: 7, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #3f6b82', background: '#071827', color: '#e6fffb', fontFamily: 'monospace', lineHeight: 1.5 } })),
              h('fieldset', { style: { margin: '14px 0 0', padding: 12, border: '1px solid #3f6b82', borderRadius: 10 } },
                h('legend', { style: { color: '#67e8f9', fontWeight: 800, padding: '0 5px' } }, gisText.importCRSLabel),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 } },
                  h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, gisText.importCRSLabel,
                    h('select', { value: importCRS, onChange: function (event) {
                      var nextCRS = event.target.value;
                      setImportCRS(nextCRS);
                      setImportAxisOrder(nextCRS === 'EPSG:4326' ? 'lat-lon' : 'x-y');
                      clearPointImportPreview();
                      setError('');
                    }, style: control },
                      h('option', { value: 'EPSG:4326' }, gisText.importCRSWGS84),
                      h('option', { value: 'EPSG:3857' }, gisText.importCRSWebMercator),
                      h('option', { value: 'UTM' }, gisText.importCRSUTM))),
                  h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, gisText.importAxisOrder,
                    h('select', { value: importAxisOrder, onChange: function (event) { setImportAxisOrder(event.target.value); clearPointImportPreview(); setError(''); }, style: control },
                      importCRS === 'EPSG:4326'
                        ? [h('option', { key: 'lat-lon', value: 'lat-lon' }, gisText.importAxisLatLon), h('option', { key: 'lon-lat', value: 'lon-lat' }, gisText.importAxisLonLat)]
                        : [h('option', { key: 'x-y', value: 'x-y' }, gisText.importAxisXY), h('option', { key: 'y-x', value: 'y-x' }, gisText.importAxisYX)])),
                  importCRS === 'UTM' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, gisText.importUTMZone,
                    h('input', { type: 'number', min: 1, max: 60, step: 1, value: importUTMZone, onChange: function (event) { setImportUTMZone(event.target.value); clearPointImportPreview(); setError(''); }, style: control })),
                  importCRS === 'UTM' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, gisText.importHemisphere,
                    h('select', { value: importUTMHemisphere, onChange: function (event) { setImportUTMHemisphere(event.target.value); clearPointImportPreview(); setError(''); }, style: control },
                      h('option', { value: 'N' }, gisText.importNorth),
                      h('option', { value: 'S' }, gisText.importSouth))))),
              csvFormatSummary(importDiagnostics) && h('p', { role: 'status', style: { margin: '8px 0 0', color: '#a7c7d8', fontSize: 11 } }, csvFormatSummary(importDiagnostics) + (importDiagnostics.crs ? ' \u00B7 ' + importDiagnostics.crs + ' \u2192 WGS84' : '')),
              error && h('p', { role: 'alert', style: { background: '#7f1d1d', color: '#fecaca', padding: 9, borderRadius: 8 } }, error),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: previewPointImport, style: primary }, gisText.importPreviewButton),
                h('button', { type: 'button', onClick: function () { doImport(false); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, gisText.importQuickMapButton),
                h('button', { type: 'button', onClick: downloadImportReport, disabled: !importDiagnostics.invalidRows && !importDiagnostics.truncatedRows, style: Object.assign({}, control, { cursor: importDiagnostics.invalidRows || importDiagnostics.truncatedRows ? 'pointer' : 'not-allowed', opacity: importDiagnostics.invalidRows || importDiagnostics.truncatedRows ? 1 : 0.55 }) }, 'Download import review'),
                h('button', { type: 'button', onClick: function () {
                  setCSV(EXAMPLE);
                  setImportCRS('EPSG:4326');
                  setImportAxisOrder('lat-lon');
                  setImportUTMZone(19);
                  setImportUTMHemisphere('N');
                  setImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] });
                  clearPointImportPreview();
                  setError('');
                }, style: Object.assign({}, control, { cursor: 'pointer' }) }, gisText.importRestore)),
              importPreviewPanel()),
            h('section', { 'aria-labelledby': 'gis-geojson-heading', style: Object.assign({}, panel, { padding: 18 }) },
              h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'POLYGONS + FEATURES'),
              h('h2', { id: 'gis-geojson-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Import a GeoJSON choropleth'),
              h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, gisText.vectorIntro),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' } },
                h('label', { style: Object.assign({}, control, { cursor: 'pointer', fontWeight: 700 }) }, gisText.vectorChooseFile,
                  h('input', { type: 'file', accept: '.geojson,.json,.kml,.gpx,application/geo+json,application/json,application/vnd.google-earth.kml+xml,application/gpx+xml', onChange: readGeoFile, style: { display: 'block', marginTop: 7 } })),
                h('button', { type: 'button', onClick: loadOfficialEcoregions, disabled: officialBusy, style: Object.assign({}, primary, { background: '#155e75' }) }, officialBusy ? 'Loading Maine layer\u2026' : 'Load official Maine ecoregions')),
              h('label', { style: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 } }, gisText.vectorPaste,
                h('textarea', { value: geoText, onChange: function (event) { setGeoText(event.target.value); setGeoError(''); }, rows: 10, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #3f6b82', background: '#071827', color: '#e6fffb', fontFamily: 'monospace', lineHeight: 1.45 } })),
              geoError && h('p', { role: 'alert', style: { background: '#7f1d1d', color: '#fecaca', padding: 9, borderRadius: 8 } }, geoError),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: doGeoImport, style: primary }, 'Build choropleth'),
                h('button', { type: 'button', onClick: function () { setGeoText(EXAMPLE_GEOJSON); setGeoError(''); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Restore GeoJSON example')),
              geoKeys.length > 0 && h('label', { style: { display: 'grid', gap: 5, marginTop: 12, fontSize: 12, fontWeight: 700 } }, 'Choropleth attribute',
                h('select', { value: geoMetric, onChange: function (event) { setGeoMetric(event.target.value); }, style: control },
                  geoKeys.map(function (key) { return h('option', { key: key, value: key }, key); })))),

            h('section', { 'aria-labelledby': 'gis-join-heading', style: Object.assign({}, panel, { padding: 18 }) },
              h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'ATTRIBUTE JOIN'),
              h('h2', { id: 'gis-join-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Join a CSV to map boundaries'),
              h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, 'Match a CSV row to each GeoJSON feature using a shared identifier such as county name or FIPS code. Keys are compared without case, punctuation, or extra spaces. Review every mismatch before applying.'),
              !geoData && h('p', { role: 'status', style: { padding: 10, borderRadius: 8, background: '#172d3c', color: '#bae6fd', fontSize: 12 } }, 'Build or load a GeoJSON layer above before preparing a join.'),
              h('label', { style: { display: 'grid', gap: 6, margin: '12px 0', fontSize: 12, fontWeight: 700 } }, 'Choose attribute CSV',
                h('input', { type: 'file', accept: '.csv,text/csv', onChange: readJoinFile, disabled: !geoData })),
              h('div', { style: { margin: '0 0 12px' } },
                csvConventionControl(joinConvention, function (next) { setJoinConvention(next); setJoinTable(null); setJoinPreview(null); setJoinError(''); })),
              h('label', { style: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 } }, 'Or paste attribute CSV',
                h('textarea', { value: joinText, disabled: !geoData, onChange: function (event) { setJoinText(event.target.value); setJoinTable(null); setJoinPreview(null); setJoinError(''); }, rows: 7, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #3f6b82', background: '#071827', color: '#e6fffb', fontFamily: 'monospace', lineHeight: 1.45, opacity: geoData ? 1 : 0.55 } })),
              joinTable && csvFormatSummary(joinTable) && h('p', { role: 'status', style: { margin: '8px 0 0', color: '#a7c7d8', fontSize: 11 } }, csvFormatSummary(joinTable)),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: readJoinColumns, disabled: !geoData, style: Object.assign({}, primary, { opacity: geoData ? 1 : 0.55 }) }, '1. Read CSV columns'),
                h('button', { type: 'button', onClick: function () { setJoinText(EXAMPLE_JOIN_CSV); setJoinTable(null); setJoinPreview(null); setJoinError(''); }, disabled: !geoData, style: Object.assign({}, control, { cursor: geoData ? 'pointer' : 'not-allowed' }) }, 'Restore join example')),
              joinTable && h('div', { style: { marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'GeoJSON match field',
                  h('select', { value: joinGeoKey, onChange: function (event) { setJoinGeoKey(event.target.value); setJoinPreview(null); }, style: control },
                    geoPropertyKeys.map(function (key) { return h('option', { key: key, value: key }, key); }))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'CSV match field',
                  h('select', { value: joinCSVKey, onChange: function (event) { setJoinCSVKey(event.target.value); setJoinPreview(null); }, style: control },
                    joinTable.headers.map(function (key) { return h('option', { key: key, value: key }, key); }))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Numeric value to map',
                  h('select', { value: joinValueKey, onChange: function (event) { setJoinValueKey(event.target.value); setJoinPreview(null); }, style: control },
                    joinTable.numericKeys.map(function (key) { return h('option', { key: key, value: key }, key); })))),
              joinTable && h('button', { type: 'button', onClick: previewJoinData, disabled: !joinValueKey, style: Object.assign({}, primary, { marginTop: 12 }) }, '2. Preview matches'),
              joinError && h('p', { role: 'alert', style: { background: '#7f1d1d', color: '#fecaca', padding: 9, borderRadius: 8 } }, joinError),
              joinPreview && h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: '#071827', border: '1px solid #3f6b82' } },
                h('h3', { style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 14 } }, 'Join preview'),
                h('div', { role: 'status', style: { display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 } },
                  h('strong', { style: { color: '#86efac' } }, joinPreview.matched + ' matched'),
                  h('span', { style: { color: joinPreview.unmatchedCSV.length ? '#fde68a' : '#86efac' } }, joinPreview.unmatchedCSV.length + ' CSV rows unmatched'),
                  h('span', { style: { color: joinPreview.unmatchedGeo.length ? '#fde68a' : '#86efac' } }, joinPreview.unmatchedGeo.length + ' boundaries unmatched'),
                  h('span', { style: { color: joinPreview.duplicates.length ? '#fca5a5' : '#86efac' } }, joinPreview.duplicates.length + ' duplicate keys')),
                (joinPreview.unmatchedCSV.length > 0 || joinPreview.unmatchedGeo.length > 0 || joinPreview.duplicates.length > 0) && h('details', { style: { marginTop: 9, color: '#cfe8f3', fontSize: 12 } },
                  h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Review unmatched and duplicate keys'),
                  joinPreview.unmatchedCSV.length > 0 && h('p', null, 'CSV only: ' + joinPreview.unmatchedCSV.join(', ')),
                  joinPreview.unmatchedGeo.length > 0 && h('p', null, 'GeoJSON only: ' + joinPreview.unmatchedGeo.join(', ')),
                  joinPreview.duplicates.length > 0 && h('p', null, 'Duplicate CSV keys: ' + joinPreview.duplicates.join(', '))),
                h('button', { type: 'button', onClick: applyJoinData, disabled: !joinPreview.matched, style: Object.assign({}, primary, { marginTop: 10 }) }, '3. Apply join + map ' + joinValueKey))),
            h('aside', { style: { padding: 12, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', borderRadius: 8, fontSize: 12 } },
              h('strong', null, 'Data ethics: '), 'Do not map student home addresses or sensitive locations. Aggregate, blur, or suppress identifiable points.'));
        }

        function projectSnapshot() {
          return createGISProject({
            title: projectTitle,
            provenance: provenance,
            settings: {
              tab: tab, source: source, regionPack: activeRegionPack.id, metric: metric, layers: layers, basemap: basemap,
              geoMetric: geoMetric, classification: classification, classCount: classCount, customBreaks: customBreaks,
              analysisMode: analysisMode, analysisPoints: analysisPoints, bufferRadiusKm: bufferRadiusKm,
              analysisUnit: analysisUnit, selectedFeatureIndex: selectedFeatureIndex,
              analysisSelection: analysisSelection, analysisSelectionSource: analysisSelectionSource,
              compareLeft: compareLeft, compareRight: compareRight,
              compareLeftBasemap: compareLeftBasemap, compareRightBasemap: compareRightBasemap,
              projection: projection, latitude: latitude, timeBaseline: effectiveBaseline, timeFocusYear: effectiveFocusYear
            },
            data: {
              importedRows: importedRows,
              geoData: geoData,
              geoKeys: geoKeys,
              geoNameKey: geoNameKey,
              timeDataset: timeDataset
            },
            work: {
              comparisonObservation: comparisonObservation, imageryNote: imageryNote,
              activeMissionId: activeMissionId, missionProgress: missionProgress, missionResponses: missionResponses,
              timeObservation: timeObservation, transformations: projectTransformations,
              composer: composer,
              remoteSensing: remoteSensing,
              storyMap: storyMap,
              qualityReview: qualityReviewState,
              inquiryPlan: inquiryPlan,
              teacherReview: teacherReview
            }
          }, new Date().toISOString());
        }

        function applyProjectDocument(project, sourceLabel) {
          project = validateGISProject(project);
          var settings = project.settings || {}, data = project.data || {}, work = project.work || {};
          var restoredPoints = Array.isArray(data.importedRows) ? data.importedRows.slice(0, 250) : [];
          setProjectTitle(String(project.title || 'Untitled GIS project'));
          setProvenance(normalizeProvenance(project.provenance));
          setImportedRows(restoredPoints);
          setSource(settings.source === 'import' && restoredPoints.length ? 'import' : 'sample');
          var restoredPack = getRegionPack(settings.regionPack || 'maine');
          var restoredMetrics = regionMetrics(restoredPack);
          var restoredMetric = restoredMetrics.some(function (definition) { return definition.id === settings.metric; })
            ? settings.metric : (restoredPack.defaultMetric || restoredMetrics[0].id);
          setRegionPackId(restoredPack.id);
          setMetric(restoredMetric);
          setLayers(Object.assign({ points: true, coast: true, grid: false, polygons: true }, settings.layers || {}));
          var restoredBasemap = settings.basemap || 'street';
          setBasemap(getGISBasemapProvider(restoredBasemap) ? restoredBasemap : 'none');
          setGeoData(data.geoData || null);
          var restoredGeoKeys = Array.isArray(data.geoKeys) ? data.geoKeys.map(String).slice(0, 100) : [];
          setGeoKeys(restoredGeoKeys);
          setGeoMetric(String(settings.geoMetric || restoredGeoKeys[0] || ''));
          setGeoNameKey(data.geoNameKey == null ? null : String(data.geoNameKey));
          setClassification(['quantile', 'equal', 'jenks', 'custom'].indexOf(settings.classification) >= 0 ? settings.classification : 'quantile');
          setClassCount(Math.max(3, Math.min(7, Number(settings.classCount) || 5)));
          setCustomBreaks(String(settings.customBreaks || '25, 50, 75'));
          setAnalysisMode(['distance', 'buffer', 'nearest'].indexOf(settings.analysisMode) >= 0 ? settings.analysisMode : 'distance');
          setAnalysisPoints(Array.isArray(settings.analysisPoints) ? settings.analysisPoints.slice(0, 20) : []);
          setBufferRadiusKm(Math.max(1, Math.min(500, Number(settings.bufferRadiusKm) || 25)));
          setAnalysisUnit(settings.analysisUnit === 'imperial' ? 'imperial' : 'metric');
          setAnalysisHistory([]);
          setAnalysisFuture([]);
          setSelectedFeatureIndex(Math.max(0, Number(settings.selectedFeatureIndex) || 0));
          setAnalysisSelection(Array.isArray(settings.analysisSelection) ? settings.analysisSelection : []);
          setAnalysisSelectionSource(String(settings.analysisSelectionSource || 'none'));
          setCompareLeft(String(settings.compareLeft || 'point:density'));
          setCompareRight(String(settings.compareRight || 'point:access'));
          var restoredLeftBasemap = String(settings.compareLeftBasemap || 'street');
          var restoredRightBasemap = String(settings.compareRightBasemap || 'satellite');
          setCompareLeftBasemap(getGISBasemapProvider(restoredLeftBasemap) && restoredLeftBasemap !== 'none' ? restoredLeftBasemap : 'none');
          setCompareRightBasemap(getGISBasemapProvider(restoredRightBasemap) && restoredRightBasemap !== 'none' ? restoredRightBasemap : 'none');
          setProjection(['mercator', 'equirectangular', 'equalarea'].indexOf(settings.projection) >= 0 ? settings.projection : 'mercator');
          setLatitude(Number.isFinite(Number(settings.latitude)) ? Math.max(-80, Math.min(80, Number(settings.latitude))) : 60);
          var savedTimeRows = data.timeDataset && Array.isArray(data.timeDataset.rows) ? data.timeDataset.rows.slice(0, 3000) : [];
          var restoredTime = EXAMPLE_TIME_DATA;
          if (savedTimeRows.length) {
            var restoredYears = savedTimeRows.map(function (row) { return Number(row.year); })
              .filter(function (year, index, all) { return all.indexOf(year) === index; }).sort(function (a, b) { return a - b; });
            restoredTime = {
              rows: savedTimeRows,
              years: restoredYears,
              duplicates: Array.isArray(data.timeDataset.duplicates) ? data.timeDataset.duplicates.slice(0, 100) : [],
              units: savedTimeRows.map(function (row) { return String(row.unit || ''); }).filter(function (value, index, all) { return value && all.indexOf(value) === index; }),
              sources: savedTimeRows.map(function (row) { return String(row.source || ''); }).filter(function (value, index, all) { return value && all.indexOf(value) === index; })
            };
          }
          setTimeDataset(restoredTime);
          setTimeBaseline(restoredTime.years.indexOf(Number(settings.timeBaseline)) >= 0 ? Number(settings.timeBaseline) : restoredTime.years[0]);
          setTimeFocusYear(restoredTime.years.indexOf(Number(settings.timeFocusYear)) >= 0 ? Number(settings.timeFocusYear) : restoredTime.years[restoredTime.years.length - 1]);
          setComparisonObservation(String(work.comparisonObservation || ''));
          setImageryNote(String(work.imageryNote || ''));
          setActiveMissionId(GIS_MISSIONS.some(function (mission) { return mission.id === work.activeMissionId; }) ? work.activeMissionId : GIS_MISSIONS[0].id);
          setMissionProgress(work.missionProgress && typeof work.missionProgress === 'object' ? work.missionProgress : {});
          setMissionResponses(work.missionResponses && typeof work.missionResponses === 'object' ? work.missionResponses : {});
          setTimeObservation(String(work.timeObservation || ''));
          setComposer(normalizeMapComposition(work.composer || {}));
          setRemoteSensing(normalizeRemoteSensingState(work.remoteSensing || {}));
          setStoryMap(normalizeStoryMap(work.storyMap || {}));
          setQualityReviewState(normalizeQualityReviewState(work.qualityReview || {}));
          setInquiryPlan(normalizeInquiryPlan(work.inquiryPlan || {}));
          setTeacherReview(normalizeTeacherReview(work.teacherReview || {}));
          var allowedTabs = ['project', 'composer', 'remote', 'story', 'quality', 'planner', 'review', 'packet', 'missions', 'timeline', 'map', 'compare', 'import', 'projection'];
          setTab(allowedTabs.indexOf(settings.tab) >= 0 ? settings.tab : 'project');
          setTimePlaying(false);
          setProjectError('');
          persist('gisProjectLoaded', true);
          announce('GIS project opened from ' + sourceLabel + '.');
        }

        function downloadProjectFile() {
          try {
            var project = projectSnapshot();
            var blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            var safeName = String(projectTitle || 'gis-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gis-project';
            link.href = url;
            link.download = safeName + '.gisstudio.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            persist('gisProjectSaved', true);
            announce('GIS Studio project downloaded.');
          } catch (saveError) {
            setProjectError('The project could not be saved. ' + saveError.message);
          }
        }

        function downloadMappedCSV() {
          try {
            var rows = [['Name', 'Latitude', 'Longitude', 'Value', 'Source']].concat(records.map(function (record) {
              return [record.name, record.lat, record.lon, valueOf(record, metric, imported), imported ? 'Imported CSV' : activeRegionPack.label];
            }));
            triggerDownload(rowsToCSV(rows), safeFileStem(projectTitle, 'gis-project') + '-mapped-points.csv', 'text/csv;charset=utf-8');
            persist('gisMappedDataExported', true);
            announce('Mapped point data downloaded as CSV.');
          } catch (exportError) {
            setProjectError('The mapped CSV could not be downloaded. ' + exportError.message);
          }
        }

        function downloadGeoJSONLayer() {
          if (!geoData) {
            setProjectError('Load a GeoJSON layer before downloading it.');
            announce('No GeoJSON layer is available to download.');
            return;
          }
          try {
            triggerDownload(JSON.stringify(geoData, null, 2), safeFileStem(projectTitle, 'gis-project') + '-layer.geojson', 'application/geo+json;charset=utf-8');
            persist('gisGeoJSONExported', true);
            announce('GeoJSON layer downloaded.');
          } catch (exportError) {
            setProjectError('The GeoJSON layer could not be downloaded. ' + exportError.message);
          }
        }

        function readProjectFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) { setProjectError('Choose a GIS Studio project smaller than 10 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () {
            try {
              applyProjectDocument(JSON.parse(String(reader.result || '')), file.name);
              setRecoveryDraft(null);
              setAutosaveReady(true);
            } catch (openError) {
              setProjectError(openError.message);
              announce('Project file error. ' + openError.message);
            }
          };
          reader.onerror = function () { setProjectError('That project file could not be read.'); };
          reader.readAsText(file);
        }

        function restoreLocalDraft() {
          if (!recoveryDraft) return;
          try {
            applyProjectDocument(recoveryDraft, 'device-local autosave');
            setRecoveryDraft(null);
            setAutosaveReady(true);
            setAutosaveStatus('Recovered draft restored; autosave resumed.');
          } catch (restoreError) { setProjectError(restoreError.message); }
        }

        function discardLocalDraft() {
          try { window.localStorage.removeItem(GIS_DRAFT_KEY); } catch (ignoreRemoval) {}
          setRecoveryDraft(null);
          setAutosaveReady(true);
          setAutosaveStatus('Previous local draft discarded; autosave resumed.');
          announce('Previous local draft discarded.');
        }

        function updateProvenance(key, value) {
          var next = Object.assign({}, provenance);
          next[key] = value;
          setProvenance(normalizeProvenance(next));
        }

        function roundPrivateCoordinates() {
          setImportedRows(roundPointCoordinates(importedRows, privacyDigits));
          setTimeDataset(function (previous) {
            var rows = roundPointCoordinates(previous.rows || [], privacyDigits);
            return Object.assign({}, previous, { rows: rows });
          });
          setProjectError('');
          announce('Imported and timeline point coordinates rounded to ' + privacyDigits + ' decimal places. GeoJSON boundaries were not changed.');
        }

        function loadTimeSeries() {
          try {
            var parsed = parseTimeCSV(timeText, gisImportParseOptions(timeConvention));
            setTimeDataset(parsed);
            setTimeImportDiagnostics({ invalidRows: Number(parsed.invalidRows) || 0, truncatedRows: Number(parsed.truncatedRows) || 0, invalidSamples: Array.isArray(parsed.invalidSamples) ? parsed.invalidSamples : [], delimiter: parsed.delimiter, decimalSeparator: parsed.decimalSeparator });
            setTimeBaseline(parsed.years[0]);
            setTimeFocusYear(parsed.years[parsed.years.length - 1]);
            setTimePlaying(false);
            setTimeError(parsed.duplicates.length ? 'Duplicate location-year rows: ' + parsed.duplicates.join(', ') + '. The last duplicate is used for change calculations.' : '');
            persist('gisTimelineAnalyzed', true);
            announce(parsed.rows.length + ' time-series records across ' + parsed.years.length + ' years loaded.');
          } catch (problem) {
            setTimeImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] });
            setTimeError(problem.message);
            announce('Time-series CSV error. ' + problem.message);
          }
        }

        function readTimeFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) { setTimeError('Choose a time-series CSV smaller than 2 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () { setTimeText(String(reader.result || '')); setTimeImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] }); setTimeError(''); };
          reader.onerror = function () { setTimeError('That time-series file could not be read.'); };
          reader.readAsText(file);
        }

        function downloadTimeImportReport() {
          if (!timeImportDiagnostics.invalidRows && !timeImportDiagnostics.truncatedRows) {
            announce('There are no rejected or capped time-series rows to report.');
            return;
          }
          try {
            var samples = Array.isArray(timeImportDiagnostics.invalidSamples) ? timeImportDiagnostics.invalidSamples : [];
            var reportRows = [
              ['GIS Studio time-series import review'],
              ['Invalid rows rejected', timeImportDiagnostics.invalidRows],
              ['Additional source rows beyond the 3,000-row limit', timeImportDiagnostics.truncatedRows],
              [],
              ['Source row', 'Name', 'Latitude', 'Longitude', 'Year', 'Value', 'Reason']
            ].concat(samples.map(function (row) {
              return [row.row, row.name, row.latitude, row.longitude, row.year, row.value, 'A required field is missing or outside the allowed range'];
            }));
            if (samples.length < timeImportDiagnostics.invalidRows) reportRows.push([], ['Note', 'Only the first 50 rejected rows are included.']);
            triggerDownload(rowsToCSV(reportRows), safeFileStem(projectTitle, 'gis-project') + '-time-series-import-review.csv', 'text/csv;charset=utf-8');
            announce('Time-series import review downloaded.');
          } catch (reportError) {
            setTimeError('The time-series import review could not be downloaded. ' + reportError.message);
          }
        }

        function toggleTimelinePlayback() {
          if (!timePlaying && effectiveFocusYear === timeYears[timeYears.length - 1]) setTimeFocusYear(timeYears[0]);
          setTimePlaying(!timePlaying);
          persist('gisTimelineAnalyzed', true);
          announce(timePlaying ? 'Timeline paused.' : 'Timeline playback started.');
        }

        function sonifyTemporalChange() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx || !temporalComplete.length) { announce('No complete changes are available to sonify.'); return; }
          var ac;
          try { ac = new Ctx(); } catch (ignore) { return; }
          var maxAbs = Math.max.apply(Math, temporalComplete.map(function (row) { return Math.abs(row.change); })) || 1;
          temporalComplete.slice().sort(function (a, b) { return a.change - b.change; }).forEach(function (row, index) {
            var oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * 0.18;
            oscillator.type = row.change < 0 ? 'sawtooth' : 'sine';
            oscillator.frequency.value = 440 + row.change / maxAbs * 260;
            gain.gain.setValueAtTime(0.045, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
            oscillator.connect(gain); gain.connect(ac.destination);
            oscillator.start(start); oscillator.stop(start + 0.15);
          });
          announce('Playing changes from the largest decrease to the largest increase.');
        }

        function timeEvidenceModel() {
          return {
            title: 'GIS Studio Change-Over-Time Evidence Report',
            generated: display.dateTime(new Date()),
            observation: timeObservation || 'Add a claim comparing the baseline and focus years.',
            analysis: temporalSummary + (temporalResult.warnings.length ? ' Data warnings: ' + temporalResult.warnings.join(' ') : ''),
            sources: (timeDataset.sources.length ? timeDataset.sources.join('; ') : 'Learner-imported time-series data') +
              '. Compare collection methods, units, definitions, and missing records before interpreting change.',
            left: {
              label: 'Baseline year ' + effectiveBaseline, basemap: 'OpenStreetMap',
              rows: baselineSnapshot.map(function (row) { return { name: row.name, geometry: 'Point', lat: row.lat, lon: row.lon, value: row.value }; })
            },
            right: {
              label: 'Focus year ' + effectiveFocusYear, basemap: 'OpenStreetMap',
              rows: focusSnapshot.map(function (row) { return { name: row.name, geometry: 'Point', lat: row.lat, lon: row.lon, value: row.value }; })
            },
            selected: []
          };
        }

        function downloadTimeEvidence() {
          var html = buildEvidenceReport(timeEvidenceModel(), localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-change-' + effectiveBaseline + '-to-' + effectiveFocusYear + '.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisTimelineAnalyzed', true);
          persist('gisTimelineExported', true);
          announce('Accessible change-over-time evidence report downloaded.');
        }

        function saveMissionProgress(missionId, stepId, checked) {
          var next = Object.assign({}, missionProgress);
          next[missionId] = Object.assign({}, next[missionId] || {});
          next[missionId][stepId] = checked;
          setMissionProgress(next);
          persist('gisMissionProgress', next);
          persist('gisMissionStarted', true);
          var mission = GIS_MISSIONS.filter(function (item) { return item.id === missionId; })[0];
          if (missionCompletion(mission, next[missionId]).percent === 100) persist('gisMissionCompleted', true);
        }

        function saveMissionResponse(missionId, value) {
          var next = Object.assign({}, missionResponses);
          next[missionId] = value;
          setMissionResponses(next);
          persist('gisMissionResponses', next);
          persist('gisMissionStarted', true);
        }

        function prepareMission(mission) {
          if (!mission || availableMissions.indexOf(mission) < 0) { announce(gisText.noMissions); return; }
          setSource('sample');
          mapViewState.current = null;
          compareViewState.current = null;
          setAnalysisPoints([]);
          setAnalysisSelection([]);
          setAnalysisSelectionSource('none');
          setAnalysisHistory([]);
          setAnalysisFuture([]);
          if (mission.id === 'coast-connectivity') {
            setCompareLeft('point:density');
            setCompareRight('point:access');
            setCompareLeftBasemap('street');
            setCompareRightBasemap('satellite');
            setTab('compare');
            persist('gisTab', 'compare');
            persist('gisCompared', true);
          } else if (mission.id === 'service-area') {
            setMetric('access');
            setAnalysisMode('buffer');
            setBufferRadiusKm(75);
            setLayers(function (previous) { return Object.assign({}, previous, { points: true }); });
            setTab('map');
            persist('gisTab', 'map');
            persist('gisMetric', 'access');
          } else {
            var parsed = parseGeoJSON(EXAMPLE_GEOJSON);
            setGeoData(parsed.data);
            setGeoKeys(parsed.numericKeys);
            setGeoMetric(parsed.numericKeys.indexOf('index') >= 0 ? 'index' : parsed.numericKeys[0]);
            setGeoNameKey(parsed.nameKey);
            setSelectedFeatureIndex(0);
            setLayers(function (previous) { return Object.assign({}, previous, { points: true, polygons: true }); });
            setTab('map');
            persist('gisTab', 'map');
            persist('gisGeoJSONImported', true);
          }
          saveMissionProgress(mission.id, 'setup', true);
          persist('gisActiveMission', mission.id);
          announce(mission.title + ' prepared. ' + (mission.workspace === 'compare' ? 'Comparison workspace opened.' : 'Map workspace opened.'));
        }

        function missionEvidenceModel(mission) {
          var base = makeEvidenceModel();
          var completion = missionCompletion(mission, missionProgress[mission.id] || {});
          base.title = mission.title + ' - GIS Inquiry Evidence';
          base.observation = missionResponses[mission.id] || mission.evidencePrompt;
          base.analysis = mission.question + ' Progress: ' + completion.complete + ' of ' + completion.total + ' investigation steps complete. ' + base.analysis;
          base.sources += ' This mission uses classroom learning data; verify any real-world claim with current authoritative data.';
          return base;
        }

        function downloadMissionEvidence(mission) {
          var html = buildEvidenceReport(missionEvidenceModel(mission), localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-mission-' + mission.id + '.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisMissionCompleted', true);
          persist('gisEvidenceExported', true);
          announce(mission.title + ' evidence report downloaded.');
        }
        function spatialAnalysisEvidence() {
          var method = 'No active spatial analysis';
          var detail = 'No map-click or boundary analysis is active.';
          if (analysisSelectionSource === 'buffer' && analysisPoints.length) {
            method = 'Radius buffer';
            detail = formatDistance(Number(bufferRadiusKm) || 0) + ' straight-line radius centered on the map click; selected points are inside the radius.';
          } else if (analysisSelectionSource === 'nearest' && analysisPoints.length) {
            method = 'Nearest point';
            detail = selectedRecords.length
              ? selectedRecords[0].name + ' is ' + formatDistance(haversineKm(analysisPoints[0], selectedRecords[0])) + ' from the map click.'
              : 'No mapped point was available near the map click.';
          } else if (analysisSelectionSource === 'boundary') {
            method = 'Boundary selection';
            detail = selectedRecords.length + ' mapped points selected inside the chosen ' + (selectedGeometryType || 'boundary') + '.';
          } else if (analysisMode === 'distance' && analysisPoints.length > 1) {
            method = 'Distance path';
            detail = formatDistance(pathKm) + ' geodesic path across ' + (analysisPoints.length - 1) + ' segment' + (analysisPoints.length === 2 ? '' : 's') + '.';
          } else if (analysisPoints.length) {
            method = analysisMode === 'buffer' ? 'Radius buffer' : analysisMode === 'nearest' ? 'Nearest point' : 'Distance tool';
            detail = analysisPoints.length + ' analysis point' + (analysisPoints.length === 1 ? '' : 's') + ' placed; complete the interaction to produce a result.';
          }
          return {
            method: method,
            detail: detail,
            regionPack: imported ? 'Imported coordinate data' : activeRegionPack.label,
            pointCount: analysisPoints.length,
            selectedCount: selectedRecords.length,
            selectedMean: Number.isFinite(selectedMean) ? selectedMean : null,
            unit: String(unit || '').trim()
          };
        }
        function analysisEvidenceText() {
          var evidence = spatialAnalysisEvidence();
          var lines = [
            'GIS Studio spatial analysis',
            'Method: ' + evidence.method,
            'Interpretation: ' + evidence.detail,
            'Analysis points: ' + evidence.pointCount,
            'Selected records: ' + evidence.selectedCount
          ];
          if (evidence.selectedMean != null) {
            lines.push('Selected mean: ' + Number(evidence.selectedMean).toFixed(1) + (evidence.unit ? ' ' + evidence.unit : ''));
          }
          if (selectedRecords.length) {
            var names = selectedRecords.slice(0, 12).map(function (record) { return record.name; }).join(', ');
            lines.push('Selected locations: ' + names + (selectedRecords.length > 12 ? ' +' + (selectedRecords.length - 12) + ' more' : ''));
          }
          lines.push('Limitation: Spatial relationships are descriptive evidence; proximity and selection do not establish cause and effect.');
          return lines.join('\n');
        }

        function copyAnalysisSummary() {
          var text = analysisEvidenceText();
          function fallbackDownload() {
            try {
              triggerDownload(text, safeFileStem(projectTitle, 'gis-analysis') + '-summary.txt', 'text/plain;charset=utf-8');
              setAnalysisCopyStatus('Clipboard unavailable; analysis summary downloaded as a text file.');
              announce('Clipboard unavailable. Analysis summary downloaded as a text file.');
            } catch (downloadError) {
              setAnalysisCopyStatus('The analysis summary could not be copied or downloaded.');
              announce('The analysis summary could not be copied or downloaded.');
            }
          }
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
              navigator.clipboard.writeText(text).then(function () {
                setAnalysisCopyStatus('Analysis summary copied to the clipboard.');
                announce('Analysis summary copied to the clipboard.');
              }, fallbackDownload);
            } else {
              fallbackDownload();
            }
          } catch (copyError) {
            fallbackDownload();
          }
        }



        function makeEvidenceModel() {
          function evidenceBasemapLabel(id) {
            var provider = getGISBasemapProvider(id);
            return provider && provider.url ? provider.label : 'Unavailable saved provider';
          }
          var leftBasemapLabel = evidenceBasemapLabel(compareLeftBasemap);
          var rightBasemapLabel = evidenceBasemapLabel(compareRightBasemap);
          var basemapLabels = [leftBasemapLabel, rightBasemapLabel].filter(function (label, index, all) { return all.indexOf(label) === index; });
          var basemapSummary = 'Basemaps: ' + basemapLabels.join(' and ') + '.';
          return {
            title: 'GIS Studio Geographic Evidence Report',
            generated: display.dateTime(new Date()),
            observation: comparisonObservation || 'Compare the mapped patterns, then add a claim supported by at least two pieces of evidence.',
            analysis: summary + (selectedRecords.length ? ' Spatial analysis selected ' + selectedRecords.length + ' mapped points.' : ''),
            sources: imported ? 'Point data were imported locally by the learner. ' + basemapSummary :
              activeRegionPack.description + ' ' + activeRegionPack.sourceNote + ' ' + basemapSummary,
            left: Object.assign({}, leftSeries, { label: comparisonLabel(leftChoice), basemap: leftBasemapLabel }),
            right: Object.assign({}, rightSeries, { label: comparisonLabel(rightChoice), basemap: rightBasemapLabel }),
            spatialAnalysis: spatialAnalysisEvidence(),
            selected: selectedRecords.map(function (record) {
              return { name: record.name, lat: record.lat, lon: record.lon, value: valueOf(record, metric, imported) };
            })
          };
        }

        function downloadEvidenceReport() {
          var html = buildEvidenceReport(makeEvidenceModel(), localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-studio-evidence-report.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisEvidenceExported', true);
          announce('Accessible GIS evidence report downloaded.');
        }

        function printEvidenceReport() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) {
            announce('The print window was blocked. Download the accessible report instead.');
            return;
          }
          reportWindow.opener = null;
          reportWindow.document.open();
          reportWindow.document.write(buildEvidenceReport(makeEvidenceModel(), localeInfo));
          reportWindow.document.close();
          reportWindow.focus();
          window.setTimeout(function () { reportWindow.print(); }, 250);
          persist('gisEvidenceExported', true);
          announce('Print-ready GIS evidence report opened.');
        }



        function updateRemoteSensing(field, value) {
          var next = Object.assign({}, remoteSensing);
          next[field] = value;
          next = normalizeRemoteSensingState(next);
          setRemoteSensing(next);
          persist('gisRemoteSensing', next);
          persist('gisRemoteSensingStarted', true);
        }

        function toggleRemoteQualityCheck(field) {
          var checks = Object.assign({}, remoteSensing.qualityChecks);
          checks[field] = !checks[field];
          updateRemoteSensing('qualityChecks', checks);
        }

        function sonifyRemoteChange() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) { announce('Audio is unavailable. Use the accessible pixel table.'); return; }
          var context;
          try { context = new Ctx(); } catch (ignore) { return; }
          var changes = remoteScene.cells.map(function (cell) {
            var before = remoteIndexValue(cell, 'before', remoteSensing.analysisIndex, true);
            var after = remoteIndexValue(cell, 'after', remoteSensing.analysisIndex, true);
            return before == null || after == null ? null : after - before;
          }).filter(function (value) { return value != null; });
          changes.forEach(function (change, index) {
            var oscillator = context.createOscillator(), gain = context.createGain();
            var start = context.currentTime + index * 0.065;
            oscillator.type = change < 0 ? 'sawtooth' : 'sine';
            oscillator.frequency.value = 260 + Math.max(0, Math.min(1, (change + 0.8) / 1.6)) * 620;
            gain.gain.setValueAtTime(0.035, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
            oscillator.connect(gain); gain.connect(context.destination);
            oscillator.start(start); oscillator.stop(start + 0.055);
          });
          announce('Playing clear pixels in row order. Lower rough tones indicate decreases; higher smooth tones indicate increases.');
        }

        function downloadRemoteSensingReport() {
          var html = buildRemoteSensingReport({ scene: remoteScene, state: remoteSensing }, localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-studio-remote-sensing-evidence.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisRemoteSensingCompleted', true);
          announce('Accessible remote-sensing evidence report downloaded.');
        }

        function printRemoteSensingReport() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) {
            announce('The print window was blocked. Download the accessible remote-sensing report instead.');
            return;
          }
          reportWindow.opener = null;
          reportWindow.document.open();
          reportWindow.document.write(buildRemoteSensingReport({ scene: remoteScene, state: remoteSensing }, localeInfo));
          reportWindow.document.close();
          reportWindow.focus();
          window.setTimeout(function () { reportWindow.print(); }, 250);
          persist('gisRemoteSensingCompleted', true);
          announce('Print-ready remote-sensing report opened.');
        }

        function updateComposer(field, value) {
          var next = Object.assign({}, composer);
          next[field] = value;
          next = normalizeMapComposition(next);
          setComposer(next);
          persist('gisComposer', next);
        }

        function updateAnnotationDraft(field, value) {
          var next = Object.assign({}, annotationDraft);
          next[field] = value;
          setAnnotationDraft(next);
        }

        function addComposerAnnotation() {
          var lat = Number(annotationDraft.lat), lon = Number(annotationDraft.lon);
          if (!String(annotationDraft.label || '').trim() || !Number.isFinite(lat) || !Number.isFinite(lon) ||
            lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            setComposerStatus('Add an annotation label and valid latitude and longitude.');
            announce('Annotation needs a label and valid coordinates.');
            return;
          }
          if (composer.annotations.length >= 20) {
            setComposerStatus('A map can contain up to 20 annotations.');
            return;
          }
          var annotations = composer.annotations.concat([{
            id: 'annotation-' + Date.now(),
            label: String(annotationDraft.label).trim(),
            lat: lat,
            lon: lon
          }]);
          updateComposer('annotations', annotations);
          setAnnotationDraft({ label: '', lat: '', lon: '' });
          setComposerStatus('Annotation A' + annotations.length + ' added to the map.');
          announce('Map annotation added.');
        }

        function removeComposerAnnotation(index) {
          updateComposer('annotations', composer.annotations.filter(function (_, itemIndex) { return itemIndex !== index; }));
          setComposerStatus('Annotation removed.');
        }

        function generateComposerDescription() {
          updateComposer('altText', suggestMapAltText(composerModel));
          setComposerStatus('A draft map description was generated. Review it for context and accuracy.');
          announce('Draft map description generated.');
        }

        function downloadComposerPackage() {
          var html = buildMapComposerReport(composerModel, localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          var safeName = String(composer.title || 'gis-map-package').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gis-map-package';
          link.href = url;
          link.download = safeName + '-accessible-map.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisMapComposed', true);
          setComposerStatus('Accessible map package downloaded with its table, annotations, provenance, and cartography review.');
          announce('Accessible map package downloaded.');
        }

        function printComposerPackage() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) {
            setComposerStatus('The print window was blocked. Download the accessible map package instead.');
            return;
          }
          reportWindow.opener = null;
          reportWindow.document.open();
          reportWindow.document.write(buildMapComposerReport(composerModel, localeInfo));
          reportWindow.document.close();
          reportWindow.focus();
          window.setTimeout(function () { reportWindow.print(); }, 250);
          persist('gisMapComposed', true);
          announce('Print-ready accessible map package opened.');
        }

        function updateStoryDraft(field, value) {
          var next = Object.assign({}, storyDraft);
          next[field] = value;
          setStoryDraft(next);
        }

        function updateStoryMapField(field, value) {
          var next = Object.assign({}, storyMap);
          if (field === 'claim' || field === 'evidence' || field === 'limitation') {
            next.checks = Object.assign({}, storyMap.checks, (function () { var item = {}; item[field] = !!value; return item; })());
          } else next[field] = value;
          next = normalizeStoryMap(next);
          setStoryMap(next);
          persist('gisStoryMap', next);
        }

        function storyViewLabel() {
          if (tab === 'remote') return 'Remote Sensing — ' + remoteSensing.analysisIndex.toUpperCase() + ' comparison';
          if (tab === 'composer') return 'Map Composer — ' + (composer.title || 'accessible map');
          if (tab === 'compare') return 'Comparison — ' + comparisonLabel(leftChoice) + ' vs ' + comparisonLabel(rightChoice);
          if (tab === 'timeline') return 'Timeline — ' + effectiveBaseline + ' to ' + effectiveFocusYear;
          if (tab === 'map') return 'Map — ' + metricLabel;
          if (tab === 'projection') return 'Projection Lab — ' + projection;
          if (tab === 'missions') return availableMissions.length ? (activeRegionPack.id === 'maine' ? gisText.maineMissions : gisText.missions) + ' - ' + activeMission.title : gisText.noMissions;
          return 'GIS Studio — ' + tab;
        }

        function storyFrameForCurrentView() {
          var view = storyViewLabel();
          var narrative = tab === 'remote' ? (remoteSensing.evidence || ('The matched scene contains ' + remoteSummary.changed + ' changed clear pixels and ' + remoteSummary.masked + ' cloud-masked pixel.')) :
            tab === 'composer' ? (composer.claim || composer.altText || summary) :
            tab === 'compare' ? (comparisonObservation || 'Compare the two synchronized map layers and describe the strongest visible difference.') :
            tab === 'timeline' ? (timeObservation || temporalSummary) : summary;
          var evidence = tab === 'remote' ? (remoteSummary.changed + ' changed pixels; ' + display.number(remoteSummary.changedAreaHa, 2) + ' hectares mapped; mean ' + remoteSensing.analysisIndex.toUpperCase() + ' change ' + (remoteSummary.meanChange == null ? 'masked' : display.number(remoteSummary.meanChange, 3)) + '.') :
            tab === 'timeline' ? temporalSummary :
            tab === 'compare' ? (leftSeries.rows.length + ' left records and ' + rightSeries.rows.length + ' right records are synchronized for comparison.') :
            (selectedRecords.length ? selectedRecords.length + ' records are selected for spatial evidence.' : records.length + ' mapped records support this frame.');
          var limitation = tab === 'remote' ? 'The scene is illustrative, one after-date pixel is cloud masked, and spectral change does not establish its cause.' :
            'Spatial patterns are descriptive. Check source, units, projection, missing records, and coordinate privacy before claiming causation.';
          return createStoryFrame({ title: view, narrative: narrative, evidence: evidence, limitation: limitation, view: view,
            metric: metricLabel, basemap: tab === 'remote' ? 'Illustrative Landsat-style scene' : basemap === 'satellite' ? 'Esri World Imagery' : basemap === 'none' ? 'Offline schematic' : 'OpenStreetMap',
            source: provenance.source || 'Classroom learning data' }, storyMap.slides.length);
        }

        function addCurrentViewToStory() {
          if (storyMap.slides.length >= STORY_FRAME_LIMIT) {
            setStoryStatus('A story map can contain up to ' + STORY_FRAME_LIMIT + ' frames. Remove one before adding another.');
            return;
          }
          var frame = storyFrameForCurrentView();
          var next = normalizeStoryMap(Object.assign({}, storyMap, { slides: storyMap.slides.concat([frame]) }));
          setStoryMap(next);
          persist('gisStoryMap', next);
          persist('gisStoryMapStarted', true);
          setStoryStatus('Added “' + frame.title + '” to the story map.');
          announce('Current GIS view added to the story map.');
        }

        function addCustomStoryFrame() {
          if (storyMap.slides.length >= STORY_FRAME_LIMIT) { setStoryStatus('A story map can contain up to ' + STORY_FRAME_LIMIT + ' frames.'); return; }
          if (!String(storyDraft.title || '').trim() || !String(storyDraft.narrative || '').trim()) {
            setStoryStatus('Add a frame title and observation before saving the custom frame.');
            announce('Story frame needs a title and observation.');
            return;
          }
          var frame = createStoryFrame(Object.assign({}, storyDraft, { view: 'Custom evidence frame', source: provenance.source || 'Classroom learning data' }), storyMap.slides.length);
          var next = normalizeStoryMap(Object.assign({}, storyMap, { slides: storyMap.slides.concat([frame]) }));
          setStoryMap(next); persist('gisStoryMap', next); persist('gisStoryMapStarted', true);
          setStoryDraft({ title: '', narrative: '', evidence: '', limitation: '' });
          setStoryStatus('Custom story frame added.');
        }

        function removeStoryFrame(index) {
          var next = normalizeStoryMap(Object.assign({}, storyMap, { slides: storyMap.slides.filter(function (_, itemIndex) { return itemIndex !== index; }) }));
          setStoryMap(next); persist('gisStoryMap', next); setStoryStatus('Story frame removed.');
        }

        function moveStoryFrame(index, direction) {
          var nextSlides = storyMap.slides.slice();
          var target = index + direction;
          if (target < 0 || target >= nextSlides.length) return;
          var item = nextSlides[index]; nextSlides[index] = nextSlides[target]; nextSlides[target] = item;
          var next = normalizeStoryMap(Object.assign({}, storyMap, { slides: nextSlides }));
          setStoryMap(next); persist('gisStoryMap', next); setStoryStatus('Story frame order updated.');
        }

        function downloadStoryMapReport() {
          var html = buildStoryMapReport({ story: storyMap, rows: composerRows, generated: display.dateTime(new Date()) }, localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = (String(storyMap.title || 'gis-story-map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gis-story-map') + '.html';
          document.body.appendChild(link); link.click(); document.body.removeChild(link); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisStoryMapExported', true); persist('gisStoryMapStarted', true); setStoryStatus('Accessible story-map report downloaded.'); announce('Accessible story map report downloaded.');
        }

        function printStoryMapReport() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) { setStoryStatus('The print window was blocked. Download the story-map report instead.'); return; }
          reportWindow.opener = null; reportWindow.document.open(); reportWindow.document.write(buildStoryMapReport({ story: storyMap, rows: composerRows, generated: display.dateTime(new Date()) }, localeInfo)); reportWindow.document.close(); reportWindow.focus();
          window.setTimeout(function () { reportWindow.print(); }, 250); persist('gisStoryMapExported', true); announce('Print-ready story map opened.');
        }

        function updateQualityReviewCheck(field, value) {
          var next = normalizeQualityReviewState(Object.assign({}, qualityReviewState, (function () { var item = {}; item[field] = !!value; return item; })()));
          setQualityReviewState(next); persist('gisQualityReview', next); persist('gisQualityReviewed', Object.keys(next).every(function (key) { return next[key]; }));
          setQualityStatus(next[field] ? 'Marked ' + field + ' as reviewed.' : 'Marked ' + field + ' as not yet reviewed.');
        }

        function downloadDataQualityReport() {
          var html = buildDataQualityReport({ review: qualityReview, reviewState: qualityReviewState }, localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = 'gis-studio-data-quality-review.html'; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisQualityReviewed', true); setQualityStatus('Data quality review downloaded.'); announce('Data quality review downloaded.');
        }

        function printDataQualityReport() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) { setQualityStatus('The print window was blocked. Download the quality review instead.'); return; }
          reportWindow.opener = null; reportWindow.document.open(); reportWindow.document.write(buildDataQualityReport({ review: qualityReview, reviewState: qualityReviewState }, localeInfo)); reportWindow.document.close(); reportWindow.focus(); window.setTimeout(function () { reportWindow.print(); }, 250); persist('gisQualityReviewed', true); announce('Print-ready data quality review opened.');
        }

        function investigationPacketModel() {
          return { title: projectTitle, claim: inquiryPlan.claim || composer.claim || comparisonObservation || timeObservation || (storyMap.slides[0] && storyMap.slides[0].narrative) || '', storyMap: storyMap, inquiryPlan: inquiryPlan, teacherReview: teacherReview, qualityReview: qualityReview, reviewState: qualityReviewState, provenance: provenance, rows: composerRows, generated: display.dateTime(new Date()) };
        }

        function downloadInvestigationPacket() {
          var html = buildInvestigationPacketReport(investigationPacketModel(), localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = (String(projectTitle || 'gis-investigation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gis-investigation') + '-packet.html'; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisInvestigationPacketStarted', true); persist('gisInvestigationPacketExported', true); setPacketStatus('Investigation Packet downloaded.'); announce('Investigation Packet downloaded.');
        }

        function printInvestigationPacket() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) { setPacketStatus('The print window was blocked. Download the packet instead.'); return; }
          reportWindow.opener = null; reportWindow.document.open(); reportWindow.document.write(buildInvestigationPacketReport(investigationPacketModel(), localeInfo)); reportWindow.document.close(); reportWindow.focus(); window.setTimeout(function () { reportWindow.print(); }, 250); persist('gisInvestigationPacketStarted', true); persist('gisInvestigationPacketExported', true); announce('Print-ready Investigation Packet opened.');
        }

        function updateInquiryPlanField(field, value) {
          var next = normalizeInquiryPlan(Object.assign({}, inquiryPlan, (function () { var item = {}; item[field] = value; return item; })()));
          setInquiryPlan(next); persist('gisInquiryPlan', next); persist('gisInquiryPlanStarted', true);
          setPlannerStatus('Plan updated.');
        }

        function chooseInquiryTemplate(template) {
          var defaults = GIS_INQUIRY_TEMPLATES[template] || GIS_INQUIRY_TEMPLATES.distribution;
          var next = normalizeInquiryPlan({ template: template, question: defaults.question, claim: '', evidencePlan: defaults.evidencePlan, alternative: defaults.alternative, nextStep: defaults.nextStep, checklist: {} });
          setInquiryPlan(next); persist('gisInquiryPlan', next); persist('gisInquiryPlanStarted', true); setPlannerStatus(defaults.label + ' investigation template loaded.'); announce(defaults.label + ' investigation template loaded.');
        }

        function updateInquiryChecklist(field, value) {
          var checks = Object.assign({}, inquiryPlan.checklist); checks[field] = !!value;
          var next = normalizeInquiryPlan(Object.assign({}, inquiryPlan, { checklist: checks }));
          setInquiryPlan(next); persist('gisInquiryPlan', next); persist('gisInquiryPlanStarted', true);
          if (inquiryPlanProgress(next).ready) persist('gisInquiryPlanCompleted', true);
          setPlannerStatus(inquiryPlanProgress(next).complete + '/' + inquiryPlanProgress(next).total + ' planning checks complete.');
        }

        function updateTeacherReviewField(field, value) {
          var next = normalizeTeacherReview(Object.assign({}, teacherReview, (function () { var item = {}; item[field] = value; return item; })()));
          setTeacherReview(next); persist('gisTeacherReview', next); persist('gisTeacherReviewStarted', true);
          if (next.status === 'ready' && teacherReviewProgress(next).ready) persist('gisTeacherReviewCompleted', true);
          setTeacherReviewStatus('Teacher review updated.');
        }

        function updateTeacherRating(field, value) {
          var ratings = Object.assign({}, teacherReview.ratings); ratings[field] = Number(value);
          var next = normalizeTeacherReview(Object.assign({}, teacherReview, { ratings: ratings }));
          setTeacherReview(next); persist('gisTeacherReview', next); persist('gisTeacherReviewStarted', true); if (next.status === 'ready' && teacherReviewProgress(next).ready) persist('gisTeacherReviewCompleted', true); setTeacherReviewStatus('Rubric rating updated.');
        }

        function downloadTeacherReview() {
          var html = buildTeacherReviewReport({ review: teacherReview }, localeInfo);
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = 'gis-studio-teacher-review.html'; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000); persist('gisTeacherReviewStarted', true); setTeacherReviewStatus('Teacher review downloaded.'); announce('Teacher review downloaded.');
        }

        function printTeacherReview() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) { setTeacherReviewStatus('The print window was blocked. Download the teacher review instead.'); return; }
          reportWindow.opener = null; reportWindow.document.open(); reportWindow.document.write(buildTeacherReviewReport({ review: teacherReview }, localeInfo)); reportWindow.document.close(); reportWindow.focus(); window.setTimeout(function () { reportWindow.print(); }, 250); persist('gisTeacherReviewStarted', true); announce('Print-ready teacher review opened.');
        }

        function comparisonTable(series, side) {
          var stats = seriesStats(series);
          return h('section', { 'aria-labelledby': 'gis-compare-' + side + '-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
            h('h2', { id: 'gis-compare-' + side + '-table-heading', style: { margin: '0 0 4px', color: '#f0fdfa', fontSize: 15 } }, side === 'left' ? 'Left-map table twin' : 'Right-map table twin'),
            h('p', { style: { margin: '0 0 9px', color: '#a7c7d8', fontSize: 11 } },
              series.label + ': ' + stats.count + ' records' + (stats.mean == null ? '.' : ', range ' + display.number(stats.min) + ' to ' + display.number(stats.max) + ', mean ' + display.number(stats.mean, 1) + '.')),
            h('div', { style: { overflowX: 'auto', maxHeight: 320, overflowY: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, side + ' map values for ' + series.label),
                h('thead', null, h('tr', null, ['Location or feature', 'Geometry', 'Latitude', 'Longitude', 'Value'].map(function (heading) {
                  return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 7, color: '#67e8f9', borderBottom: '1px solid #3f6b82', position: 'sticky', top: 0, background: '#102536' } }, heading);
                }))),
                h('tbody', null, series.rows.map(function (row, index) {
                  return h('tr', { key: index },
                    h('th', { scope: 'row', style: { textAlign: 'left', padding: 7, color: '#fff', borderBottom: '1px solid #1e4154' } }, row.name),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.geometry),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, display.number(row.lat, { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false })),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, display.number(row.lon, { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false })),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, row.value == null ? 'No data' : String(row.value)));
                })))));
        }

        function comparisonView() {
          var leftStats = seriesStats(leftSeries), rightStats = seriesStats(rightSeries);
          function sideControls(side, choice, setChoice, base, setBase) {
            return h('fieldset', { style: Object.assign({}, panel, { margin: 0 }) },
              h('legend', { style: { color: '#67e8f9', fontWeight: 900, padding: '0 5px' } }, side + ' map'),
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } }, 'Data layer',
                h('select', { value: choice, onChange: function (event) { setChoice(event.target.value); persist(side === 'Left' ? 'gisCompareLeft' : 'gisCompareRight', event.target.value); persist('gisCompared', true); }, style: control },
                  comparisonChoices.map(function (option) { return h('option', { key: option.value, value: option.value }, option.label); }))),
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12 } }, 'Basemap',
                h('select', { value: base, onChange: function (event) { setBase(event.target.value); persist(side === 'Left' ? 'gisCompareLeftBasemap' : 'gisCompareRightBasemap', event.target.value); persist('gisCompared', true); }, style: control },
                  base === 'none' && h('option', { value: 'none' }, 'Unavailable saved provider'),
                  h('option', { value: 'street' }, 'Street map'),
                  h('option', { value: 'satellite' }, 'Satellite imagery'))));
          }
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-compare-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'SAME PLACE • DIFFERENT LENS'),
              h('h2', { id: 'gis-compare-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 19 } }, 'Synchronized map comparison'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } }, 'Change either layer or basemap. Pan and zoom one map; the other follows so scale and extent stay comparable.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 10, marginTop: 12 } },
                sideControls('Left', leftChoice, setCompareLeft, compareLeftBasemap, setCompareLeftBasemap),
                sideControls('Right', rightChoice, setCompareRight, compareRightBasemap, setCompareRightBasemap))),
            h('section', { 'aria-label': 'Synchronized comparison maps', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(330px,100%),1fr))', gap: 12 } },
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Left: ' + comparisonLabel(leftChoice)),
                interactiveMapSurface(compareLeftNode, 'Left interactive comparison map showing ' + comparisonLabel(leftChoice), 390, !compareMapReady, compareMapUnavailable),
                h('p', { style: { color: '#a7c7d8', fontSize: 10 } }, 'Legend: low teal → high rose. ' + leftStats.count + ' records.')),
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Right: ' + comparisonLabel(rightChoice)),
                interactiveMapSurface(compareRightNode, 'Right interactive comparison map showing ' + comparisonLabel(rightChoice), 390, !compareMapReady, compareMapUnavailable),
                h('p', { style: { color: '#a7c7d8', fontSize: 10 } }, 'Legend: low teal → high rose. ' + rightStats.count + ' records.'))),
            h('p', { role: 'status', style: { margin: 0, color: '#a7c7d8', fontSize: 11 } }, compareStatus),
            h('section', { 'aria-labelledby': 'gis-evidence-heading', style: panel },
              h('h2', { id: 'gis-evidence-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Evidence builder'),
              h('label', { style: { display: 'grid', gap: 6, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Observation or claim',
                h('textarea', { value: comparisonObservation, onChange: function (event) { setComparisonObservation(event.target.value); }, rows: 3, placeholder: 'I observe... Evidence from the left map... Evidence from the right map... A limitation is...', style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff' } })),
              h('p', { style: { margin: '8px 0', color: '#fcd34d', fontSize: 10 } }, 'Describe what the maps show. Treat explanations as hypotheses unless other evidence supports causation.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: downloadEvidenceReport, style: primary }, 'Download accessible report'),
                h('button', { type: 'button', onClick: printEvidenceReport, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'))),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12 } },
              comparisonTable(leftSeries, 'left'), comparisonTable(rightSeries, 'right')));
        }



        function remoteSensingView() {
          var selectedBefore = remoteSelectedCell.beforeBands;
          var selectedAfter = remoteSelectedCell.afterBands;
          var indexKey = remoteSensing.analysisIndex.toUpperCase();
          var validChange = remoteBeforeIndex == null || remoteAfterIndex == null ? null : remoteAfterIndex - remoteBeforeIndex;
          var checkedCount = Object.keys(remoteSensing.qualityChecks).filter(function (key) { return remoteSensing.qualityChecks[key]; }).length;
          var displayLabels = {
            trueColor: 'True color',
            falseColor: 'Color infrared',
            ndvi: 'NDVI',
            ndwi: 'NDWI',
            ndbi: 'NDBI'
          };
          function raster(period) {
            return h('div', {
              'aria-hidden': 'true',
              style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', width: '100%', height: '100%' }
            }, remoteScene.cells.map(function (cell) {
              return h('span', {
                key: period + '-' + cell.id,
                style: {
                  background: remotePixelColor(cell, period, remoteSensing.viewMode, remoteSensing.cloudMask),
                  border: '1px solid rgba(255,255,255,.22)',
                  boxSizing: 'border-box'
                }
              });
            }));
          }
          function indexNumber(value) {
            return value == null || !Number.isFinite(Number(value)) ? 'Masked' : display.number(value, 3);
          }
          var legendItems = remoteSensing.viewMode === 'trueColor'
            ? [['Forest', '#28543d'], ['Water', '#245c83'], ['Wetland', '#587347'], ['Developed', '#8b817b'], ['Bare soil', '#a57955']]
            : remoteSensing.viewMode === 'falseColor'
              ? [['Healthy vegetation', '#e11d48'], ['Water', '#10243f'], ['Developed', '#67e8f9'], ['Bare soil', '#f5d0a9']]
              : [['Low or negative', remoteIndexColor(-0.3, remoteSensing.viewMode)], ['Near zero', remoteIndexColor(0, remoteSensing.viewMode)], ['Moderate', remoteIndexColor(0.3, remoteSensing.viewMode)], ['High', remoteIndexColor(0.7, remoteSensing.viewMode)]];
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-remote-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'OBSERVE • MEASURE • VERIFY'),
              h('h2', { id: 'gis-remote-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Remote Sensing Lab'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } },
                'Compare matched-season multispectral scenes, inspect spectral signatures, mask clouds, calculate change area, and separate observations from causal explanations.'),
              h('aside', { style: { marginTop: 10, padding: 10, borderLeft: '4px solid #38bdf8', borderRadius: 8, background: '#082f49', color: '#bae6fd', fontSize: 11, lineHeight: 1.5 } },
                h('strong', null, 'Instructional-data notice: '), remoteScene.source)),
            h('section', { 'aria-labelledby': 'gis-remote-controls-heading', style: panel },
              h('h2', { id: 'gis-remote-controls-heading', style: { margin: '0 0 10px', color: '#f0fdfa', fontSize: 16 } }, 'Imagery and index controls'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Display',
                  h('select', { value: remoteSensing.viewMode, onChange: function (event) { updateRemoteSensing('viewMode', event.target.value); }, style: control },
                    h('option', { value: 'trueColor' }, 'True color'),
                    h('option', { value: 'falseColor' }, 'Color infrared'),
                    h('option', { value: 'ndvi' }, 'NDVI vegetation index'),
                    h('option', { value: 'ndwi' }, 'NDWI water index'),
                    h('option', { value: 'ndbi' }, 'NDBI built-up index'))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Analysis index',
                  h('select', { value: remoteSensing.analysisIndex, onChange: function (event) { updateRemoteSensing('analysisIndex', event.target.value); }, style: control },
                    h('option', { value: 'ndvi' }, 'NDVI — vegetation'),
                    h('option', { value: 'ndwi' }, 'NDWI — water and moisture'),
                    h('option', { value: 'ndbi' }, 'NDBI — built-up surfaces'))),
                h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, paddingTop: 20 } },
                  h('input', { type: 'checkbox', checked: remoteSensing.cloudMask, onChange: function (event) { updateRemoteSensing('cloudMask', event.target.checked); } }),
                  'Mask cloud-obscured pixels')),
              h('label', { style: { display: 'grid', gap: 6, marginTop: 12, fontSize: 12, fontWeight: 700 } },
                'Swipe position: ' + remoteSensing.swipe + '%',
                h('input', {
                  type: 'range', min: 0, max: 100, step: 1, value: remoteSensing.swipe,
                  onChange: function (event) { updateRemoteSensing('swipe', Number(event.target.value)); },
                  'aria-label': 'Before and after imagery swipe position', 'aria-valuetext': remoteSensing.swipe + ' percent'
                })),
              h('p', { style: { margin: '9px 0 0', color: '#a7c7d8', fontSize: 10 } },
                remoteIndexName(remoteSensing.analysisIndex) + ': ' + remoteIndexFormula(remoteSensing.analysisIndex) + '. Reflectance values range from 0 to 1.')),
            h('section', { 'aria-labelledby': 'gis-remote-swipe-heading', style: panel },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 10, flexWrap: 'wrap' } },
                h('div', null,
                  h('h2', { id: 'gis-remote-swipe-heading', style: { margin: '0 0 3px', color: '#f0fdfa', fontSize: 16 } }, 'Before-and-after swipe comparison'),
                  h('p', { style: { margin: 0, color: '#a7c7d8', fontSize: 10 } }, remoteScene.beforeDate + ' on the left; ' + remoteScene.afterDate + ' on the right. Same season, 30 m pixels.')),
                h('button', { type: 'button', onClick: sonifyRemoteChange, style: Object.assign({}, primary, { background: '#083344', border: '1px solid #22d3ee' }) }, '♫ Sonify index change')),
              h('div', {
                role: 'group',
                'aria-label': 'Illustrative before-and-after remote sensing raster. Select a pixel for exact values.',
                style: { position: 'relative', width: 'min(100%,620px)', aspectRatio: '1 / 1', margin: '12px auto 0', border: '2px solid #64748b', borderRadius: 10, overflow: 'hidden', background: '#071827' }
              },
                raster('before'),
                h('div', { style: { position: 'absolute', inset: 0, clipPath: 'inset(0 0 0 ' + remoteSensing.swipe + '%)' } }, raster('after')),
                h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 0, bottom: 0, left: 'calc(' + remoteSensing.swipe + '% - 2px)', width: 4, background: '#fde047', boxShadow: '0 0 0 1px #111827', pointerEvents: 'none' } }),
                h('span', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, left: 8, padding: '4px 7px', borderRadius: 6, background: 'rgba(7,24,39,.85)', color: '#fff', fontSize: 10, fontWeight: 900 } }, 'BEFORE'),
                h('span', { 'aria-hidden': 'true', style: { position: 'absolute', top: 8, right: 8, padding: '4px 7px', borderRadius: 6, background: 'rgba(7,24,39,.85)', color: '#fff', fontSize: 10, fontWeight: 900 } }, 'AFTER'),
                h('div', { style: { position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)' } },
                  remoteScene.cells.map(function (cell) {
                    var beforeValue = remoteIndexValue(cell, 'before', remoteSensing.analysisIndex, true);
                    var afterValue = remoteIndexValue(cell, 'after', remoteSensing.analysisIndex, true);
                    var change = beforeValue == null || afterValue == null ? 'masked by cloud' : 'change ' + display.number(afterValue - beforeValue, 3);
                    var selected = cell.id === remoteSensing.selectedPixel;
                    return h('button', {
                      key: cell.id,
                      type: 'button',
                      'data-remote-pixel': cell.id,
                      onClick: function () { updateRemoteSensing('selectedPixel', cell.id); },
                      'aria-pressed': selected,
                      'aria-label': 'Pixel ' + cell.id + '. Before ' + cell.beforeClass + '. After ' + cell.afterClass + '. ' + indexKey + ' ' + change + '.',
                      style: { minWidth: 0, minHeight: 0, padding: 2, border: selected ? '3px solid #fde047' : '1px solid transparent', background: 'transparent', color: '#fff', fontSize: 9, fontWeight: 900, textShadow: '0 1px 2px #000', cursor: 'pointer' }
                    }, cell.id);
                  }))),
              h('div', { role: 'list', 'aria-label': displayLabels[remoteSensing.viewMode] + ' legend', style: { display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10, color: '#dbeafe', fontSize: 10 } },
                legendItems.map(function (item) {
                  return h('span', { key: item[0], role: 'listitem', style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
                    h('span', { 'aria-hidden': 'true', style: { width: 20, height: 12, display: 'inline-block', borderRadius: 2, border: '1px solid #fff', background: item[1] } }),
                    item[0]);
                })),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#cfe8f3', fontSize: 11, lineHeight: 1.5 } },
                'Selected pixel ' + remoteSelectedCell.id + '. Before: ' + remoteSelectedCell.beforeClass + '; after: ' + remoteSelectedCell.afterClass +
                '. ' + indexKey + ' before ' + indexNumber(remoteBeforeIndex) + ', after ' + indexNumber(remoteAfterIndex) +
                (validChange == null ? '.' : ', change ' + display.number(validChange, 3) + '.'))),
            h('section', { 'aria-labelledby': 'gis-remote-summary-heading', style: panel },
              h('h2', { id: 'gis-remote-summary-heading', style: { margin: '0 0 9px', color: '#f0fdfa', fontSize: 16 } }, 'Change measurement'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 8 } },
                [
                  [remoteSummary.changed, 'changed pixels'],
                  [display.number(remoteSummary.changedAreaHa, 2) + ' ha', 'mapped change area'],
                  [remoteSummary.forestLoss, 'forest-loss pixels'],
                  [remoteSummary.developedGain, 'developed-gain pixels'],
                  [indexNumber(remoteSummary.meanChange), 'mean ' + indexKey + ' change'],
                  [remoteSummary.masked, 'cloud-masked pixels']
                ].map(function (item) {
                  return h('div', { key: item[1], style: { padding: 10, borderRadius: 9, background: '#071827' } },
                    h('strong', { style: { display: 'block', color: '#fde047', fontSize: 19 } }, item[0]),
                    h('span', { style: { color: '#a7c7d8', fontSize: 10 } }, item[1]));
                })),
              h('p', { style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 10 } },
                'Area model: ' + remoteScene.resolutionMeters + ' m × ' + remoteScene.resolutionMeters + ' m = 900 m² = 0.09 ha per pixel. Only clear pixels are compared.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 } },
              h('section', { 'aria-labelledby': 'gis-remote-inspector-heading', style: panel },
                h('h2', { id: 'gis-remote-inspector-heading', style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 16 } }, 'Pixel spectral inspector'),
                h('label', { style: { display: 'grid', gap: 5, marginBottom: 10, color: '#dbeafe', fontSize: 11, fontWeight: 700 } }, 'Selected pixel',
                  h('select', { value: remoteSensing.selectedPixel, onChange: function (event) { updateRemoteSensing('selectedPixel', event.target.value); }, style: control },
                    remoteScene.cells.map(function (cell) { return h('option', { key: cell.id, value: cell.id }, cell.id + ' — ' + cell.beforeClass + ' to ' + cell.afterClass); }))),
                h('div', { style: { overflowX: 'auto' } },
                  h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                    h('caption', { style: { textAlign: 'left', color: '#67e8f9', fontWeight: 800, paddingBottom: 6 } }, 'Reflectance proportions for pixel ' + remoteSelectedCell.id),
                    h('thead', null, h('tr', null, ['Band', 'Before', 'After', 'Common interpretation'].map(function (heading) {
                      return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid #3f6b82', color: '#67e8f9' } }, heading);
                    }))),
                    h('tbody', null, [
                      ['Green', 'green', 'Vegetation and water contrast'],
                      ['Red', 'red', 'Chlorophyll absorption'],
                      ['Near infrared', 'nir', 'Leaf structure and vegetation'],
                      ['Shortwave infrared', 'swir', 'Moisture and built surfaces']
                    ].map(function (band) {
                      return h('tr', { key: band[1] },
                        h('th', { scope: 'row', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid #1e4154' } }, band[0]),
                        h('td', { style: { padding: 6, borderBottom: '1px solid #1e4154' } }, display.number(selectedBefore[band[1]], 3)),
                        h('td', { style: { padding: 6, borderBottom: '1px solid #1e4154' } }, remoteSelectedCell.quality === 'cloud' && remoteSensing.cloudMask ? 'Masked' : display.number(selectedAfter[band[1]], 3)),
                        h('td', { style: { padding: 6, borderBottom: '1px solid #1e4154', color: '#a7c7d8' } }, band[2]));
                    })))),
                h('div', { style: { marginTop: 10, display: 'grid', gap: 7, fontSize: 11 } },
                  h('p', { style: { margin: 0 } }, h('strong', { style: { color: '#86efac' } }, 'Before estimate: '), remoteBeforeClass.label + ' — ' + remoteBeforeClass.evidence + '.'),
                  h('p', { style: { margin: 0 } }, h('strong', { style: { color: '#fde68a' } }, 'After estimate: '), remoteAfterClass.label + ' — ' + remoteAfterClass.evidence + '.'),
                  h('p', { style: { margin: 0, color: '#a7c7d8' } }, 'Threshold classifications are clues, not ground truth. Mixed pixels and atmospheric effects can change the signature.'))),
              h('section', { 'aria-labelledby': 'gis-remote-quality-heading', style: panel },
                h('h2', { id: 'gis-remote-quality-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Interpretation quality check'),
                h('p', { role: 'status', style: { margin: '0 0 9px', color: checkedCount === 4 ? '#86efac' : '#fde68a', fontSize: 11 } },
                  checkedCount + ' of 4 checks confirmed.'),
                [
                  ['dates', 'The dates are from comparable seasons.'],
                  ['clouds', 'Clouds and missing pixels are masked or disclosed.'],
                  ['scale', 'The 30 m pixel size fits the claim and area calculation.'],
                  ['causation', 'The interpretation distinguishes observed change from its possible causes.']
                ].map(function (item) {
                  return h('label', { key: item[0], style: { display: 'flex', gap: 8, alignItems: 'start', marginBottom: 8, color: '#dbeafe', fontSize: 11, lineHeight: 1.45 } },
                    h('input', { type: 'checkbox', checked: remoteSensing.qualityChecks[item[0]], onChange: function () { toggleRemoteQualityCheck(item[0]); } }),
                    item[1]);
                }),
                h('aside', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: '#2b2617', color: '#fde68a', fontSize: 10, lineHeight: 1.5 } },
                  h('strong', null, 'A change map answers “where and how much?” '), 'It does not by itself answer “why?” Use field observations, additional dates, metadata, and local knowledge before naming a cause.'))),
            h('section', { 'aria-labelledby': 'gis-remote-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
              h('h2', { id: 'gis-remote-table-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Accessible raster-table twin'),
              h('p', { style: { margin: '0 0 9px', color: '#a7c7d8', fontSize: 10 } }, 'Every visual pixel has an equivalent row. Cloud-obscured values are excluded from change statistics.'),
              h('div', { style: { overflowX: 'auto', maxHeight: 380, overflowY: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 10 } },
                  h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, 'Remote sensing before-and-after pixel values'),
                  h('thead', null, h('tr', null, ['Pixel', 'Before class', 'After class', 'Before ' + indexKey, 'After ' + indexKey, 'Change', 'Quality'].map(function (heading) {
                    return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 7, color: '#67e8f9', borderBottom: '1px solid #3f6b82', position: 'sticky', top: 0, background: '#102536' } }, heading);
                  }))),
                  h('tbody', null, remoteScene.cells.map(function (cell) {
                    var before = remoteIndexValue(cell, 'before', remoteSensing.analysisIndex, true);
                    var after = remoteIndexValue(cell, 'after', remoteSensing.analysisIndex, true);
                    var change = before == null || after == null ? null : after - before;
                    var selected = cell.id === remoteSensing.selectedPixel;
                    return h('tr', { key: cell.id, style: { background: selected ? '#183b4d' : 'transparent' } },
                      h('th', { scope: 'row', style: { textAlign: 'left', padding: 7, borderBottom: '1px solid #1e4154', color: selected ? '#fde047' : '#fff' } }, cell.id),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, cell.beforeClass),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, cell.afterClass),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, indexNumber(before)),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, indexNumber(after)),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, indexNumber(change)),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154', color: cell.quality === 'cloud' ? '#fde68a' : '#86efac' } }, cell.quality === 'cloud' ? 'Cloud masked' : 'Clear'));
                  }))))),
            h('section', { 'aria-labelledby': 'gis-remote-evidence-heading', style: panel },
              h('h2', { id: 'gis-remote-evidence-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Maine change investigation'),
              h('p', { style: { margin: '0 0 9px', color: '#cfe8f3', fontSize: 11, lineHeight: 1.5 } },
                'Prompt: What changed between the two matched-season scenes? Cite at least two pixels or summary measures, explain what the selected index contributes, and name one limitation.'),
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Evidence-based interpretation',
                h('textarea', {
                  value: remoteSensing.evidence, rows: 5, maxLength: 3000,
                  onChange: function (event) { updateRemoteSensing('evidence', event.target.value); },
                  placeholder: 'I observe... The change table shows... The index suggests... This does not prove... One limitation is...',
                  style: Object.assign({}, control, { resize: 'vertical' })
                })),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 } },
                h('button', { type: 'button', onClick: downloadRemoteSensingReport, style: primary }, 'Download remote-sensing evidence report'),
                h('button', { type: 'button', onClick: printRemoteSensingReport, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'),
                h('button', { type: 'button', onClick: function () { setBasemap('satellite'); persist('gisBasemap', 'satellite'); setTab('map'); persist('gisTab', 'map'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Open live satellite basemap for context')),
              h('p', { style: { margin: '9px 0 0', color: '#a7c7d8', fontSize: 10 } },
                'The live basemap is contextual imagery from Esri and does not provide the dated band values used in this illustrative learning scene.')));
        }

        function composerView() {
          var readyToShare = composerAudit.errors === 0;
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-composer-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'DESIGN • EXPLAIN • SHARE'),
              h('h2', { id: 'gis-composer-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Accessible Map Composer'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } },
                'Turn the current point layer into a classroom-ready evidence map. The export keeps the visual map, description, annotations, data table, method, source, and limitations together in one HTML file.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, alignItems: 'start' } },
              h('section', { 'aria-labelledby': 'gis-composer-controls-heading', style: panel },
                h('h3', { id: 'gis-composer-controls-heading', style: { margin: '0 0 10px', color: '#67e8f9', fontSize: 15 } }, 'Map text and legend'),
                [
                  ['title', 'Map title', 200],
                  ['subtitle', 'Subtitle or investigation question', 300],
                  ['author', 'Author or class', 160],
                  ['legendTitle', 'Legend title', 160],
                  ['unit', 'Unit or index name', 100]
                ].map(function (field) {
                  return h('label', { key: field[0], style: { display: 'grid', gap: 5, marginBottom: 9, fontSize: 12, fontWeight: 700 } }, field[1],
                    h('input', { type: 'text', value: composer[field[0]], maxLength: field[2], onChange: function (event) { updateComposer(field[0], event.target.value); }, style: control }));
                }),
                h('label', { style: { display: 'grid', gap: 5, marginBottom: 9, fontSize: 12, fontWeight: 700 } }, 'Evidence-based takeaway',
                  h('textarea', { value: composer.claim, maxLength: 2000, rows: 4, onChange: function (event) { updateComposer('claim', event.target.value); }, placeholder: 'State a claim, cite the mapped pattern, and name a limitation.', style: Object.assign({}, control, { resize: 'vertical' }) })),
                h('label', { style: { display: 'grid', gap: 5, marginBottom: 8, fontSize: 12, fontWeight: 700 } }, 'Map description for screen readers',
                  h('textarea', { value: composer.altText, maxLength: 2000, rows: 5, onChange: function (event) { updateComposer('altText', event.target.value); }, placeholder: 'Describe the spatial pattern, highest and lowest values, and notable annotations.', style: Object.assign({}, control, { resize: 'vertical' }) })),
                h('button', { type: 'button', onClick: generateComposerDescription, style: Object.assign({}, control, { cursor: 'pointer', marginBottom: 10 }) }, 'Draft description from data'),
                h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700 } },
                  h('input', { type: 'checkbox', checked: composer.showLegend, onChange: function (event) { updateComposer('showLegend', event.target.checked); } }),
                  'Show the legend in the composed map')),
              h('section', { 'aria-labelledby': 'gis-composer-preview-heading', style: Object.assign({}, panel, { background: '#f8fafc', color: '#172033' }) },
                h('p', { style: { margin: 0, color: '#0f766e', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'LIVE ACCESSIBLE PREVIEW'),
                h('h2', { id: 'gis-composer-preview-heading', style: { margin: '4px 0 2px', color: '#0f3d3a', fontSize: 24 } }, composer.title || 'Untitled map'),
                composer.subtitle && h('p', { style: { margin: '0 0 9px', color: '#52636f', fontSize: 13 } }, composer.subtitle),
                schematicMap({ annotations: composer.annotations, altText: composer.altText || suggestMapAltText(composerModel) }),
                composer.showLegend && h('div', { role: 'group', 'aria-label': 'Map legend', style: { marginTop: 10, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' } },
                  h('strong', { style: { display: 'block', color: '#0f5f5a', fontSize: 12 } }, composer.legendTitle || metricLabel),
                  h('p', { style: { margin: '4px 0 0', fontSize: 11 } }, 'Low teal → middle green → high rose. Unit: ' + (composerModel.unit || 'not specified') + '.')),
                composer.claim && h('div', { style: { marginTop: 10, borderLeft: '4px solid #d97706', background: '#fff7ed', padding: 10, fontSize: 12, lineHeight: 1.5 } },
                  h('strong', null, 'Takeaway: '), composer.claim),
                h('p', { style: { margin: '9px 0 0', color: '#52636f', fontSize: 10 } },
                  'Source: ' + (provenance.source || 'not specified') + '. ' + composerRows.length + ' synchronized table records.'),
                composer.annotations.length > 0 && h('ol', { 'aria-label': 'Map annotation key', style: { margin: '10px 0 0', paddingLeft: 22, fontSize: 11 } },
                  composer.annotations.map(function (annotation, index) {
                    return h('li', { key: annotation.id }, 'A' + (index + 1) + ': ' + annotation.label);
                  })))),
            h('section', { 'aria-labelledby': 'gis-annotation-heading', style: panel },
              h('h2', { id: 'gis-annotation-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Evidence annotations'),
              h('p', { style: { margin: '0 0 10px', color: '#a7c7d8', fontSize: 11 } }, 'Add up to 20 numbered callouts. Coordinates are included in the export and should not identify private locations.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, alignItems: 'end' } },
                h('label', { style: { display: 'grid', gap: 4, fontSize: 11, fontWeight: 700 } }, 'Callout text',
                  h('input', { type: 'text', value: annotationDraft.label, maxLength: 160, onChange: function (event) { updateAnnotationDraft('label', event.target.value); }, style: control })),
                h('label', { style: { display: 'grid', gap: 4, fontSize: 11, fontWeight: 700 } }, 'Latitude',
                  h('input', { type: 'number', min: -90, max: 90, step: 'any', value: annotationDraft.lat, onChange: function (event) { updateAnnotationDraft('lat', event.target.value); }, style: control })),
                h('label', { style: { display: 'grid', gap: 4, fontSize: 11, fontWeight: 700 } }, 'Longitude',
                  h('input', { type: 'number', min: -180, max: 180, step: 'any', value: annotationDraft.lon, onChange: function (event) { updateAnnotationDraft('lon', event.target.value); }, style: control })),
                h('button', { type: 'button', onClick: addComposerAnnotation, style: primary }, 'Add callout')),
              composer.annotations.length > 0 && h('ul', { style: { margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 } },
                composer.annotations.map(function (annotation, index) {
                  return h('li', { key: annotation.id, style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: 8, borderRadius: 8, background: '#071827', fontSize: 11 } },
                    h('span', null, h('strong', { style: { color: '#fde047' } }, 'A' + (index + 1) + ' '), annotation.label + ' (' + display.coordinate(annotation.lat, 4, 'lat') + ', ' + display.coordinate(annotation.lon, 4, 'lon') + ')'),
                    h('button', { type: 'button', onClick: function () { removeComposerAnnotation(index); }, 'aria-label': 'Remove annotation A' + (index + 1), style: Object.assign({}, control, { cursor: 'pointer', padding: '5px 8px' }) }, 'Remove'));
                }))),
            h('section', { 'aria-labelledby': 'gis-cartography-coach-heading', style: panel },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' } },
                h('div', null,
                  h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.08em' } }, 'CARTOGRAPHY COACH'),
                  h('h2', { id: 'gis-cartography-coach-heading', style: { margin: '4px 0', color: '#f0fdfa', fontSize: 16 } }, 'Share-readiness review')),
                h('strong', { style: { color: readyToShare ? '#86efac' : '#fca5a5', fontSize: 20 } }, composerAudit.score + '/100')),
              h('p', { role: 'status', style: { margin: '7px 0 10px', color: readyToShare ? '#86efac' : '#fde68a', fontSize: 12 } },
                composerAudit.errors + ' required fix' + (composerAudit.errors === 1 ? '' : 'es') + ' and ' + composerAudit.warnings + ' recommendation' + (composerAudit.warnings === 1 ? '' : 's') + '.'),
              composerAudit.issues.length ? h('ul', { style: { margin: 0, paddingLeft: 20, color: '#dbeafe', fontSize: 11, lineHeight: 1.7 } },
                composerAudit.issues.map(function (item) {
                  return h('li', { key: item.id }, h('strong', { style: { color: item.severity === 'error' ? '#fca5a5' : '#fde68a' } }, item.severity === 'error' ? 'Required: ' : 'Consider: '), item.message);
                })) : h('p', { style: { color: '#86efac', fontWeight: 800 } }, 'All composer checks pass.'),
              h('details', { style: { marginTop: 10, fontSize: 11, color: '#cfe8f3' } },
                h('summary', { style: { cursor: 'pointer', fontWeight: 800 } }, composerAudit.passes.length + ' safeguards already included'),
                h('ul', { style: { lineHeight: 1.7 } }, composerAudit.passes.map(function (item) { return h('li', { key: item }, item); })))),
            h('section', { 'aria-labelledby': 'gis-composer-export-heading', style: panel },
              h('h2', { id: 'gis-composer-export-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Export the accessible evidence package'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } },
                'The self-contained HTML package includes the schematic map, screen-reader description, legend, callout key, complete point-data table, provenance, method, limitations, and print styles.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: downloadComposerPackage, style: primary }, 'Download accessible map package'),
                h('button', { type: 'button', onClick: printComposerPackage, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'),
                h('button', { type: 'button', onClick: function () { setTab('project'); persist('gisTab', 'project'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Review project provenance')),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, composerStatus)));
        }

        function storyMapView() {
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-story-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'SEQUENCE • EXPLAIN • SHARE'),
              h('h2', { id: 'gis-story-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Story Map Studio'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Sequence views from GIS Studio into an accessible claim → evidence → limitation narrative. Every frame keeps its text, source, and limitation beside the visual view.'),
              h('label', { style: { display: 'grid', gap: 5, marginTop: 12, fontSize: 12, fontWeight: 700 } }, 'Story title', h('input', { type: 'text', value: storyMap.title, maxLength: 200, onChange: function (event) { updateStoryMapField('title', event.target.value); }, style: control })),
              h('label', { style: { display: 'grid', gap: 5, marginTop: 9, fontSize: 12, fontWeight: 700 } }, 'Guiding question or subtitle', h('input', { type: 'text', value: storyMap.subtitle, maxLength: 300, onChange: function (event) { updateStoryMapField('subtitle', event.target.value); }, style: control })),
              h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 } },
                ['claim', 'evidence', 'limitation'].map(function (key) { return h('label', { key: key, style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800 } }, h('input', { type: 'checkbox', checked: storyMap.checks[key], onChange: function (event) { updateStoryMapField(key, event.target.checked); } }), key.charAt(0).toUpperCase() + key.slice(1) + ' check'); })),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 13 } },
                h('progress', { max: storyProgress.total, value: storyProgress.complete, style: { width: 190, accentColor: '#5eead4' }, 'aria-label': 'Story Map reflection progress' }),
                h('strong', { style: { color: storyProgress.complete === storyProgress.total ? '#86efac' : '#fde68a' } }, storyProgress.complete + '/' + storyProgress.total + ' reflection checks complete'),
                h('span', { style: { color: '#a7c7d8', fontSize: 11 } }, storyProgress.frames + '/' + STORY_FRAME_LIMIT + ' frames')),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, storyStatus)),
            h('section', { 'aria-labelledby': 'gis-story-capture-heading', style: panel },
              h('h2', { id: 'gis-story-capture-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Capture evidence frames'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } }, 'Open a map, comparison, timeline, Composer, or Remote Sensing view, then use “Add current view to story.” You can also add a frame from scratch here.'),
              h('button', { type: 'button', onClick: addCurrentViewToStory, style: primary }, 'Add current view to story'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginTop: 12 } },
                [['title', 'Frame title', 200], ['narrative', 'Observation', 2500], ['evidence', 'Evidence note', 2500], ['limitation', 'Limitation or next question', 1800]].map(function (field) {
                  return h('label', { key: field[0], style: { display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 } }, field[1], field[0] === 'title' ? h('input', { type: 'text', value: storyDraft[field[0]], maxLength: field[2], onChange: function (event) { updateStoryDraft(field[0], event.target.value); }, style: control }) : h('textarea', { value: storyDraft[field[0]], maxLength: field[2], rows: field[0] === 'narrative' ? 3 : 2, onChange: function (event) { updateStoryDraft(field[0], event.target.value); }, style: Object.assign({}, control, { resize: 'vertical' }) }));
                })),
              h('button', { type: 'button', onClick: addCustomStoryFrame, style: Object.assign({}, control, { cursor: 'pointer', marginTop: 10 }) }, 'Add custom evidence frame')),
            h('section', { 'aria-labelledby': 'gis-story-trail-heading', style: panel },
              h('h2', { id: 'gis-story-trail-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Accessible evidence trail'),
              storyMap.slides.length ? h('ol', { style: { margin: 0, paddingLeft: 22, display: 'grid', gap: 10 } }, storyMap.slides.map(function (frame, index) {
                return h('li', { key: frame.id }, h('article', { style: { background: '#071827', border: '1px solid #36586b', borderRadius: 10, padding: 12 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'start' } }, h('div', null, h('strong', { style: { color: '#67e8f9' } }, frame.title), h('p', { style: { margin: '3px 0 0', color: '#8fb4c4', fontSize: 10 } }, frame.view + (frame.metric ? ' • ' + frame.metric : ''))), h('div', { style: { display: 'flex', gap: 5 } }, h('button', { type: 'button', disabled: index === 0, onClick: function () { moveStoryFrame(index, -1); }, 'aria-label': 'Move ' + frame.title + ' earlier', style: Object.assign({}, control, { cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '5px 8px' }) }, '↑'), h('button', { type: 'button', disabled: index === storyMap.slides.length - 1, onClick: function () { moveStoryFrame(index, 1); }, 'aria-label': 'Move ' + frame.title + ' later', style: Object.assign({}, control, { cursor: index === storyMap.slides.length - 1 ? 'not-allowed' : 'pointer', padding: '5px 8px' }) }, '↓'), h('button', { type: 'button', onClick: function () { removeStoryFrame(index); }, 'aria-label': 'Remove ' + frame.title, style: Object.assign({}, control, { cursor: 'pointer', padding: '5px 8px' }) }, 'Remove'))),
                  h('p', { style: { margin: '9px 0 0', fontSize: 11, lineHeight: 1.5 } }, h('strong', { style: { color: '#fde68a' } }, 'Observation: '), frame.narrative || 'Not recorded.'),
                  h('p', { style: { margin: '5px 0 0', fontSize: 11, lineHeight: 1.5 } }, h('strong', { style: { color: '#86efac' } }, 'Evidence: '), frame.evidence || 'Not recorded.'),
                  h('p', { style: { margin: '5px 0 0', fontSize: 11, lineHeight: 1.5 } }, h('strong', { style: { color: '#fca5a5' } }, 'Limitation: '), frame.limitation || 'Not recorded.')));
              })) : h('p', { style: { padding: 12, borderRadius: 9, background: '#071827', color: '#a7c7d8' } }, 'No frames yet. Capture the current GIS view or add a custom frame above.')),
            h('section', { 'aria-labelledby': 'gis-story-export-heading', style: panel },
              h('h2', { id: 'gis-story-export-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Export the story map'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } }, 'The self-contained HTML report includes an ordered, screen-reader-friendly evidence trail, reflection checks, a data-table twin, and method limitations. It prints cleanly to PDF.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h('button', { type: 'button', onClick: downloadStoryMapReport, style: primary }, 'Download story map report'), h('button', { type: 'button', onClick: printStoryMapReport, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'))));
        }

        function qualityReviewView() {
          var statusColor = qualityReview.errors ? '#fca5a5' : qualityReview.warnings ? '#fde68a' : '#86efac';
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-quality-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'CHECK • EXPLAIN • SHARE'),
              h('h2', { id: 'gis-quality-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Data Quality and Uncertainty Review'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Use the project’s existing safeguards to decide what the evidence can support. A score is a teaching aid, not a statistical confidence interval.'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap', marginTop: 14 } }, h('span', { style: { color: '#a7c7d8', fontSize: 11, fontWeight: 800 } }, 'Evidence readiness'), h('strong', { style: { fontSize: 34, color: statusColor } }, qualityReview.score + '/100'), h('p', { role: 'status', style: { margin: 0, color: statusColor, fontSize: 12, fontWeight: 800 } }, qualityReview.summary)),
              h('p', { style: { margin: '8px 0 0', color: '#a7c7d8', fontSize: 11 } }, qualityReview.errors + ' required check' + (qualityReview.errors === 1 ? '' : 's') + '; ' + qualityReview.warnings + ' highlighted limitation' + (qualityReview.warnings === 1 ? '' : 's') + '.')),
            h('section', { 'aria-labelledby': 'gis-quality-checklist-heading', style: panel },
              h('h2', { id: 'gis-quality-checklist-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Learner review checklist'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11 } }, 'These acknowledgements are saved with the project so a teacher or collaborator can see which safeguards were reviewed.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 9 } }, [['privacy', 'Coordinate privacy reviewed'], ['missingness', 'Missing values reviewed'], ['provenance', 'Provenance completed'], ['interpretation', 'Interpretation limits recorded']].map(function (item) { return h('label', { key: item[0], style: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 9, background: '#071827', fontSize: 12, fontWeight: 800 } }, h('input', { type: 'checkbox', checked: qualityReviewState[item[0]], onChange: function (event) { updateQualityReviewCheck(item[0], event.target.checked); } }), item[1]); })),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, qualityStatus)),
            h('section', { 'aria-labelledby': 'gis-quality-table-heading', style: panel },
              h('h2', { id: 'gis-quality-table-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Accessible quality table'),
              h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } }, h('caption', { style: { textAlign: 'left', padding: '6px 0', color: '#67e8f9', fontWeight: 800 } }, 'Quality checks, findings, and next actions'), h('thead', null, h('tr', null, ['Check', 'Status', 'Finding', 'Next action'].map(function (item) { return h('th', { key: item, scope: 'col', style: { textAlign: 'left', padding: 7, borderBottom: '1px solid #3f6b82', color: '#a7c7d8' } }, item); }))), h('tbody', null, qualityReview.checks.map(function (item) { var color = item.status === 'error' ? '#fca5a5' : item.status === 'warning' ? '#fde68a' : '#86efac'; return h('tr', { key: item.id }, h('th', { scope: 'row', style: { textAlign: 'left', padding: 7, borderBottom: '1px solid #234456' } }, item.label), h('td', { style: { padding: 7, borderBottom: '1px solid #234456', color: color, fontWeight: 900 } }, item.status.toUpperCase()), h('td', { style: { padding: 7, borderBottom: '1px solid #234456' } }, item.message), h('td', { style: { padding: 7, borderBottom: '1px solid #234456', color: '#b7d2df' } }, item.recommendation)); }))))),
            h('section', { 'aria-labelledby': 'gis-quality-export-heading', style: panel },
              h('h2', { id: 'gis-quality-export-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Export the quality review'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } }, 'The report preserves the score, review checklist, quality table, and plain-language limits for a teacher handoff or story-map appendix.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h('button', { type: 'button', onClick: downloadDataQualityReport, style: primary }, 'Download quality review'), h('button', { type: 'button', onClick: printDataQualityReport, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'))));
        }

        function investigationPacketView() {
          var ready = qualityReview.ready && storyProgress.frames > 0;
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-packet-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'ASSEMBLE • HAND OFF • REFLECT'),
              h('h2', { id: 'gis-packet-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Investigation Packet'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Combine the Story Map, Quality Review, mapped table, and provenance into one accessible teacher handoff. This is the natural final artifact for a GIS investigation.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 } }, [['Evidence readiness', qualityReview.score + '/100'], ['Story frames', storyProgress.frames], ['Reflection checks', storyProgress.complete + '/' + storyProgress.total], ['Mapped records', composerRows.length]].map(function (item) { return h('div', { key: item[0], style: { padding: 12, borderRadius: 9, background: '#071827' } }, h('strong', { style: { display: 'block', color: '#67e8f9', fontSize: 18 } }, item[1]), h('span', { style: { color: '#a7c7d8', fontSize: 10 } }, item[0])); })),
              h('p', { role: 'status', style: { margin: '12px 0 0', color: ready ? '#86efac' : '#fde68a', fontSize: 12, fontWeight: 800 } }, ready ? 'Packet contents are ready for a careful handoff.' : 'Add at least one Story Map frame and resolve required quality checks before calling this packet ready.')),
            h('section', { 'aria-labelledby': 'gis-packet-contents-heading', style: panel },
              h('h2', { id: 'gis-packet-contents-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Packet contents'),
              h('ul', { style: { margin: 0, paddingLeft: 21, color: '#dbeafe', fontSize: 12, lineHeight: 1.8 } }, h('li', null, 'Working claim and investigation question'), h('li', null, storyProgress.frames + ' ordered Story Map evidence frame' + (storyProgress.frames === 1 ? '' : 's')), h('li', null, 'Quality and uncertainty table with next actions'), h('li', null, composerRows.length + ' mapped records in a data-table twin'), h('li', null, 'Provenance, method, limitations, and handoff questions')),
              h('p', { style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, 'Source: ' + (provenance.source || 'Not specified') + '. Project: ' + (projectTitle || 'Untitled GIS project') + '.')),
            h('section', { 'aria-labelledby': 'gis-packet-export-heading', style: panel },
              h('h2', { id: 'gis-packet-export-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Export the teacher handoff'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } }, 'The self-contained report is screen-reader friendly and print-ready. It preserves evidence sequence and limitations instead of presenting a map without context.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h('button', { type: 'button', onClick: downloadInvestigationPacket, style: primary }, 'Download Investigation Packet'), h('button', { type: 'button', onClick: printInvestigationPacket, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF')),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, packetStatus)));
        }

        function investigationPlannerView() {
          var templateOptions = Object.keys(GIS_INQUIRY_TEMPLATES).map(function (key) { return h('option', { key: key, value: key }, GIS_INQUIRY_TEMPLATES[key].label); });
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-planner-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'ASK • TEST • REVISE'),
              h('h2', { id: 'gis-planner-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Investigation Planner'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Plan the reasoning before you interpret the map. A strong spatial investigation names a question, a claim, the evidence needed, an alternative explanation, and a next step.'),
              h('label', { style: { display: 'grid', gap: 5, marginTop: 13, fontSize: 12, fontWeight: 800 } }, 'Question type', h('select', { value: inquiryPlan.template, onChange: function (event) { chooseInquiryTemplate(event.target.value); }, style: control }, templateOptions)),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginTop: 12 } }, [['question', 'Testable spatial question', 500], ['claim', 'Working claim (revise as evidence changes)', 1500], ['evidencePlan', 'Evidence plan: what will you map or compare?', 1500], ['alternative', 'Alternative explanation or confounder', 1500], ['nextStep', 'Next step or additional evidence', 1500]].map(function (field) { return h('label', { key: field[0], style: { display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 } }, field[1], field[0] === 'question' ? h('input', { type: 'text', value: inquiryPlan[field[0]], maxLength: field[2], onChange: function (event) { updateInquiryPlanField(field[0], event.target.value); }, style: control }) : h('textarea', { value: inquiryPlan[field[0]], maxLength: field[2], rows: field[0] === 'claim' ? 4 : 3, onChange: function (event) { updateInquiryPlanField(field[0], event.target.value); }, style: Object.assign({}, control, { resize: 'vertical' }) })); })),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 13 } }, h('progress', { max: inquiryProgress.total, value: inquiryProgress.complete, style: { width: 190, accentColor: '#5eead4' }, 'aria-label': 'Investigation planning progress' }), h('strong', { style: { color: inquiryProgress.ready ? '#86efac' : '#fde68a' } }, inquiryProgress.complete + '/' + inquiryProgress.total + ' planning checks complete')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 9, marginTop: 11 } }, [['question', 'Question is specific'], ['evidence', 'Evidence is mapped or compared'], ['alternative', 'Alternative explanation named'], ['nextStep', 'Next evidence step named']].map(function (item) { return h('label', { key: item[0], style: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 9, background: '#071827', fontSize: 12, fontWeight: 800 } }, h('input', { type: 'checkbox', checked: inquiryPlan.checklist[item[0]], onChange: function (event) { updateInquiryChecklist(item[0], event.target.checked); } }), item[1]); })),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, plannerStatus)),
            h('section', { 'aria-labelledby': 'gis-planner-next-heading', style: panel },
              h('h2', { id: 'gis-planner-next-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Continue the investigation'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } }, 'Your plan is saved with the project and included in the Investigation Packet. Move between workspaces without losing the reasoning trail.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h('button', { type: 'button', onClick: function () { setTab('map'); persist('gisTab', 'map'); }, style: primary }, 'Open Map Workspace'), h('button', { type: 'button', onClick: function () { setTab('story'); persist('gisTab', 'story'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Build Story Map'), h('button', { type: 'button', onClick: function () { setTab('packet'); persist('gisTab', 'packet'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Review Investigation Packet'))));
        }

        function teacherReviewView() {
          var statusColor = teacherReview.status === 'ready' ? '#86efac' : teacherReview.status === 'revise' ? '#fde68a' : '#a7c7d8';
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-review-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'NOTICE • RESPOND • REVISE'),
              h('h2', { id: 'gis-review-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Teacher Review'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Use the rubric to make the investigation stronger. Feedback is saved with the project and carried into the Investigation Packet.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 13 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 11, fontWeight: 800 } }, 'Reviewer', h('input', { type: 'text', value: teacherReview.reviewer, maxLength: 160, onChange: function (event) { updateTeacherReviewField('reviewer', event.target.value); }, style: control })),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 11, fontWeight: 800 } }, 'Review status', h('select', { value: teacherReview.status, onChange: function (event) { updateTeacherReviewField('status', event.target.value); }, style: control }, h('option', { value: 'draft' }, 'Draft'), h('option', { value: 'revise' }, 'Revise and resubmit'), h('option', { value: 'ready' }, 'Ready to share')))),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 } }, h('strong', { style: { color: statusColor, fontSize: 26 } }, teacherProgress.points + '/' + teacherProgress.max), h('span', { style: { color: statusColor, fontSize: 11, fontWeight: 800 } }, teacherProgress.rated + '/' + teacherProgress.total + ' rubric areas rated' + (teacherProgress.ready ? ' • review complete' : ''))),
              h('p', { role: 'status', style: { margin: '9px 0 0', color: '#a7c7d8', fontSize: 11 } }, teacherReviewStatus)),
            h('section', { 'aria-labelledby': 'gis-review-rubric-heading', style: panel },
              h('h2', { id: 'gis-review-rubric-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Accessible review rubric'),
              h('div', { style: { display: 'grid', gap: 9 } }, GIS_TEACHER_RUBRIC.map(function (item) {
                return h('div', { key: item.id, style: { display: 'grid', gridTemplateColumns: 'minmax(170px,1fr) minmax(120px,160px)', gap: 10, alignItems: 'center', padding: 10, borderRadius: 9, background: '#071827' } },
                  h('div', null,
                    h('strong', { style: { display: 'block', color: '#67e8f9', fontSize: 12 } }, item.label),
                    h('span', { style: { color: '#a7c7d8', fontSize: 10 } }, item.prompt)
                  ),
                  h('label', { style: { display: 'grid', gap: 4, fontSize: 10, fontWeight: 800 } }, 'Rating (0-3)',
                    h('select', { value: teacherReview.ratings[item.id], onChange: function (event) { updateTeacherRating(item.id, event.target.value); }, style: control },
                      h('option', { value: 0 }, '0 - not yet reviewed'),
                      h('option', { value: 1 }, '1 - emerging'),
                      h('option', { value: 2 }, '2 - solid'),
                      h('option', { value: 3 }, '3 - strong')
                    )
                  )
                );
              })),
              h('label', { style: { display: 'grid', gap: 5, marginTop: 12, fontSize: 11, fontWeight: 800 } }, 'Overall feedback', h('textarea', { value: teacherReview.overall, maxLength: 2000, rows: 5, onChange: function (event) { updateTeacherReviewField('overall', event.target.value); }, placeholder: 'Name the strongest reasoning move and one thing to revise.', style: Object.assign({}, control, { resize: 'vertical' }) })),
              h('label', { style: { display: 'grid', gap: 5, marginTop: 9, fontSize: 11, fontWeight: 800 } }, 'Next revision', h('textarea', { value: teacherReview.nextRevision, maxLength: 1500, rows: 3, onChange: function (event) { updateTeacherReviewField('nextRevision', event.target.value); }, placeholder: 'What should the learner check, add, or reconsider next?', style: Object.assign({}, control, { resize: 'vertical' }) }))),
            h('section', { 'aria-labelledby': 'gis-review-export-heading', style: panel },
              h('h2', { id: 'gis-review-export-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Export and continue'),
              h('p', { style: { margin: '0 0 10px', color: '#b7d2df', fontSize: 11, lineHeight: 1.5 } }, 'The standalone review is useful for a conference; the Investigation Packet carries the same review beside the evidence and quality safeguards.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h('button', { type: 'button', onClick: downloadTeacherReview, style: primary }, 'Download teacher review'), h('button', { type: 'button', onClick: printTeacherReview, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'), h('button', { type: 'button', onClick: function () { setTab('packet'); persist('gisTab', 'packet'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Open Investigation Packet'))));
        }

        function projectView() {
          var inventory = [
            importedRows.length + ' imported point records',
            geoFeatures.length + ' GeoJSON features',
            timeDataset.rows.length + ' time-series records across ' + timeDataset.years.length + ' years',
            Object.keys(missionProgress).length + ' missions with saved progress',
            remoteSensing.evidence ? 'Remote-sensing interpretation and quality checklist saved' : 'Remote-sensing lab ready for investigation',
            storyMap.slides.length + ' story-map frames',
            qualityReview.ready ? 'Data-quality review has no required blockers' : 'Data-quality review: ' + qualityReview.score + '/100 with ' + qualityReview.errors + ' required blocker' + (qualityReview.errors === 1 ? '' : 's')
          ];
          var provenanceFields = [
            ['datasetTitle', 'Dataset title', 'Example: Maine broadband access study'],
            ['source', 'Source or organization', 'Agency, class survey, or URL'],
            ['collected', 'Collection date or period', 'Example: 2020-2025'],
            ['units', 'Units', 'Example: percent, people per square mile'],
            ['method', 'Collection or processing method', 'How were values measured or transformed?'],
            ['license', 'License or reuse terms', 'Example: public domain or CC BY 4.0'],
            ['limitations', 'Known limitations', 'Missing data, scale, uncertainty, definitions...']
          ];
          return h('div', { style: { display: 'grid', gap: 14 } },
            recoveryDraft && h('section', { 'aria-labelledby': 'gis-recovery-heading', style: { padding: 14, borderRadius: 12, border: '2px solid #f59e0b', background: '#2b2617' } },
              h('h2', { id: 'gis-recovery-heading', style: { margin: '0 0 5px', color: '#fde68a', fontSize: 16 } }, 'Recover a local draft?'),
              h('p', { style: { margin: '0 0 10px', color: '#fef3c7', fontSize: 12 } }, 'A device-local draft named "' + recoveryDraft.title + '" was saved ' + recoveryDraft.savedAt + '. Autosave is paused until you choose.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: restoreLocalDraft, style: primary }, 'Restore draft'),
                h('button', { type: 'button', onClick: discardLocalDraft, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Discard draft'))),
            h('section', { 'aria-labelledby': 'gis-project-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'PORTABLE CLASSROOM WORK'),
              h('h2', { id: 'gis-project-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Save, reopen, and recover projects'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Project files preserve normalized datasets, layers, analysis settings, timelines, mission work, and provenance. Raw pasted CSV text is intentionally excluded.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10, marginTop: 13 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Project name',
                  h('input', { type: 'text', value: projectTitle, maxLength: 200, onChange: function (event) { setProjectTitle(event.target.value); }, style: control })),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Open GIS Studio project',
                  h('input', { type: 'file', accept: '.json,.gisstudio.json,application/json', onChange: readProjectFile }))),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } },
                h('button', { type: 'button', onClick: downloadProjectFile, style: primary }, 'Download project file'),
                h('button', { type: 'button', onClick: downloadMappedCSV, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Download mapped CSV'),
                h('button', { type: 'button', onClick: downloadGeoJSONLayer, disabled: !geoData, style: Object.assign({}, control, { cursor: geoData ? 'pointer' : 'not-allowed', opacity: geoData ? 1 : 0.55 }) }, 'Download GeoJSON layer'),
                h('button', { type: 'button', onClick: function () { setTab('map'); persist('gisTab', 'map'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Return to map')),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, autosaveStatus),
              projectError && h('p', { role: 'alert', style: { margin: '10px 0 0', padding: 9, borderRadius: 8, background: '#7f1d1d', color: '#fecaca' } }, projectError)),
            h('section', { 'aria-labelledby': 'gis-provenance-heading', style: panel },
              h('h2', { id: 'gis-provenance-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Data provenance manifest'),
              h('p', { style: { margin: '0 0 11px', color: '#a7c7d8', fontSize: 11 } }, 'These fields travel with the project and help another reader judge whether the data and comparisons are appropriate.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 } },
                provenanceFields.map(function (field) {
                  var multiline = field[0] === 'method' || field[0] === 'limitations';
                  return h('label', { key: field[0], style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } },
                    field[1],
                    multiline
                      ? h('textarea', { value: provenance[field[0]], rows: 3, placeholder: field[2], onChange: function (event) { updateProvenance(field[0], event.target.value); }, style: Object.assign({}, control, { resize: 'vertical' }) })
                      : h('input', { type: 'text', value: provenance[field[0]], placeholder: field[2], onChange: function (event) { updateProvenance(field[0], event.target.value); }, style: control }));
                }))),
            h('section', { 'aria-labelledby': 'gis-project-inventory-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 } },
              h('div', { style: panel },
                h('h2', { id: 'gis-project-inventory-heading', style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 16 } }, 'Project inventory'),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.7 } },
                  inventory.map(function (item) { return h('li', { key: item }, item); })),
                h('h3', { style: { margin: '13px 0 6px', color: '#67e8f9', fontSize: 12 } }, 'Recorded transformations'),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.7 } },
                  projectTransformations.map(function (item) { return h('li', { key: item }, item); }))),
              h('div', { style: panel },
                h('h2', { style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 16 } }, 'Coordinate privacy review'),
                h('p', { role: 'status', style: { margin: '0 0 8px', color: privacyAssessment.highPrecision || privacyAssessment.identifierWarnings ? '#fde68a' : '#86efac', fontSize: 12, lineHeight: 1.5 } },
                  privacyAssessment.total + ' imported or timeline point rows checked. ' +
                  privacyAssessment.highPrecision + ' use 4 or more decimal places; ' +
                  privacyAssessment.identifierWarnings + ' have identifier-like labels.'),
                (privacyAssessment.highPrecision > 0 || privacyAssessment.identifierWarnings > 0) && h('details', { style: { color: '#cfe8f3', fontSize: 11, marginBottom: 10 } },
                  h('summary', { style: { cursor: 'pointer', fontWeight: 800 } }, 'Review flagged point labels'),
                  privacyAssessment.highPrecisionNames.length > 0 && h('p', null, 'High precision: ' + privacyAssessment.highPrecisionNames.join(', ')),
                  privacyAssessment.identifierNames.length > 0 && h('p', null, 'Identifier-like labels: ' + privacyAssessment.identifierNames.join(', '))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Round point coordinates to',
                  h('select', { value: privacyDigits, onChange: function (event) { setPrivacyDigits(Number(event.target.value)); }, style: control },
                    h('option', { value: 2 }, '2 decimal places (about 1 km)'),
                    h('option', { value: 3 }, '3 decimal places (about 100 m)'),
                    h('option', { value: 4 }, '4 decimal places (about 10 m)'))),
                h('button', { type: 'button', onClick: roundPrivateCoordinates, disabled: !importedRows.length && !timeDataset.rows.length, style: Object.assign({}, primary, { marginTop: 10, opacity: importedRows.length || timeDataset.rows.length ? 1 : 0.55 }) }, 'Round imported + timeline points'),
                h('p', { style: { margin: '10px 0 0', color: '#fcd34d', fontSize: 10, lineHeight: 1.45 } }, 'Rounding is applied to the current in-memory point datasets and will be reflected in future autosaves and downloads. GeoJSON boundaries are not changed. Review names and attributes separately.'),
                // This review used to cover only what leaves in the FILE. The basemap
                // leaves the device too: every pan or zoom tells the tile service which
                // area is being viewed, which for a class dataset is roughly where the
                // points are. Named plainly, with the setting that avoids it.
                h('div', { style: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #2c5468' } },
                  h('h3', { style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 13 } }, 'What leaves this device'),
                  h('p', { role: 'status', style: { margin: 0, color: offlineMap ? '#86efac' : '#fde68a', fontSize: 11, lineHeight: 1.5 } },
                    offlineMap
                      ? 'Basemap: none. The schematic map is drawn here, so no map-tile or map-library requests are made. Your coordinates stay on this device unless you download or share a file.'
                      : 'Basemap: ' + (basemap === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap') + '. Your coordinates are never uploaded, but the map library is fetched from unpkg.com and each pan or zoom tells the tile service which area you are viewing — for classroom points, that is approximately where they are. Choose "No basemap — offline schematic" on the Map tab to make no requests at all.')))),
            h('aside', { style: { padding: 12, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', borderRadius: 8, fontSize: 11, lineHeight: 1.5 } },
              h('strong', null, 'Before sharing: '), 'Project files may contain precise locations, names, notes, and joined attributes. Confirm consent, remove identifiers, aggregate where possible, and open the saved file once to verify its contents.'));
        }

        function timelineView() {
          var baselineIndex = Math.max(0, timeYears.indexOf(effectiveBaseline));
          var focusIndex = Math.max(0, timeYears.indexOf(effectiveFocusYear));
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-timeline-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'CHANGE OVER TIME'),
              h('h2', { id: 'gis-timeline-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Time-Series Change Lab'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Compare the same locations across years. Keep the baseline fixed, move or play the focus year, and distinguish measured change from explanations that require more evidence.'),
              h('details', { style: { marginTop: 11, color: '#cfe8f3', fontSize: 11 } },
                h('summary', { style: { cursor: 'pointer', fontWeight: 800, color: '#67e8f9' } }, 'Import a time-series CSV'),
                h('p', null, 'Required headers: name, latitude, longitude, year, value. Optional: unit, source, method. Up to 3,000 valid rows stay in this browser session.'),
                h('label', { style: { display: 'grid', gap: 5, margin: '9px 0', fontWeight: 700 } }, 'Choose CSV file',
                  h('input', { type: 'file', accept: '.csv,text/csv', onChange: readTimeFile })),
                h('div', { style: { margin: '0 0 9px' } },
                  csvConventionControl(timeConvention, function (next) { setTimeConvention(next); setTimeImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] }); setTimeError(''); })),
                h('label', { style: { display: 'grid', gap: 5, fontWeight: 700 } }, 'Or paste time-series CSV',
                  h('textarea', { value: timeText, onChange: function (event) { setTimeText(event.target.value); setTimeImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] }); setTimeError(''); }, rows: 8, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff', fontFamily: 'monospace' } })),
                csvFormatSummary(timeImportDiagnostics) && h('p', { role: 'status', style: { margin: '7px 0 0', color: '#a7c7d8', fontSize: 11 } }, csvFormatSummary(timeImportDiagnostics)),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 } },
                  h('button', { type: 'button', onClick: loadTimeSeries, style: primary }, 'Load time series'),
                  h('button', { type: 'button', onClick: downloadTimeImportReport, disabled: !timeImportDiagnostics.invalidRows && !timeImportDiagnostics.truncatedRows, style: Object.assign({}, control, { cursor: timeImportDiagnostics.invalidRows || timeImportDiagnostics.truncatedRows ? 'pointer' : 'not-allowed', opacity: timeImportDiagnostics.invalidRows || timeImportDiagnostics.truncatedRows ? 1 : 0.55 }) }, 'Download time-series import review'),
                  h('button', { type: 'button', onClick: function () { setTimeText(EXAMPLE_TIME_CSV); setTimeImportDiagnostics({ invalidRows: 0, truncatedRows: 0, invalidSamples: [] }); setTimeError(''); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Restore example'))),
              timeError && h('p', { role: 'alert', style: { margin: '10px 0 0', padding: 9, borderRadius: 8, background: '#7f1d1d', color: '#fecaca' } }, timeError)),
            (timeImportDiagnostics.invalidRows > 0 || timeImportDiagnostics.truncatedRows > 0) && h('p', { role: 'status', style: { margin: '8px 0 0', padding: 9, borderLeft: '4px solid #f59e0b', borderRadius: 8, background: '#2b2617', color: '#fde68a', fontSize: 11, lineHeight: 1.45 } }, 'Import review: ' + timeImportDiagnostics.invalidRows + ' row' + (timeImportDiagnostics.invalidRows === 1 ? '' : 's') + ' rejected.' + (timeImportDiagnostics.truncatedRows > 0 ? ' ' + timeImportDiagnostics.truncatedRows + ' additional source row' + (timeImportDiagnostics.truncatedRows === 1 ? '' : 's') + ' were beyond the 3,000-row limit.' : '')),
            h('section', { 'aria-labelledby': 'gis-time-controls-heading', style: panel },
              h('h2', { id: 'gis-time-controls-heading', style: { margin: '0 0 9px', color: '#f0fdfa', fontSize: 16 } }, 'Timeline controls'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12 } }, 'Baseline year',
                  h('select', { value: effectiveBaseline, onChange: function (event) { setTimeBaseline(Number(event.target.value)); setTimePlaying(false); persist('gisTimelineAnalyzed', true); }, style: control },
                    timeYears.map(function (year) { return h('option', { key: year, value: year }, year); }))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12 } }, 'Focus year: ' + effectiveFocusYear,
                  h('input', {
                    type: 'range', min: 0, max: Math.max(0, timeYears.length - 1), step: 1, value: focusIndex,
                    onChange: function (event) { setTimeFocusYear(timeYears[Number(event.target.value)]); setTimePlaying(false); persist('gisTimelineAnalyzed', true); },
                    'aria-valuetext': String(effectiveFocusYear)
                  }))),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 } },
                h('button', { type: 'button', onClick: function () { setTimeFocusYear(timeYears[Math.max(0, focusIndex - 1)]); setTimePlaying(false); }, disabled: focusIndex <= 0, style: Object.assign({}, control, { cursor: focusIndex <= 0 ? 'not-allowed' : 'pointer' }) }, 'Previous year'),
                h('button', { type: 'button', onClick: toggleTimelinePlayback, style: primary }, timePlaying ? 'Pause animation' : 'Play timeline'),
                h('button', { type: 'button', onClick: function () { setTimeFocusYear(timeYears[Math.min(timeYears.length - 1, focusIndex + 1)]); setTimePlaying(false); }, disabled: focusIndex >= timeYears.length - 1, style: Object.assign({}, control, { cursor: focusIndex >= timeYears.length - 1 ? 'not-allowed' : 'pointer' }) }, 'Next year'),
                h('button', { type: 'button', onClick: sonifyTemporalChange, disabled: !temporalComplete.length, style: Object.assign({}, primary, { background: '#083344', border: '1px solid #22d3ee', opacity: temporalComplete.length ? 1 : 0.55 }) }, '♫ Sonify changes')),
              h('p', { style: { margin: '9px 0 0', color: '#a7c7d8', fontSize: 10 } }, 'Sound orders locations from decrease to increase. Sawtooth tones mark decreases; sine tones mark increases.')),
            h('section', { 'aria-label': 'Synchronized before and after maps', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(330px,100%),1fr))', gap: 12 } },
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Baseline: ' + effectiveBaseline),
                interactiveMapSurface(timeLeftNode, 'Baseline interactive map for ' + effectiveBaseline, 370, !timeMapReady, timeMapUnavailable)),
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Focus year: ' + effectiveFocusYear),
                interactiveMapSurface(timeRightNode, 'Focus-year interactive map for ' + effectiveFocusYear, 370, !timeMapReady, timeMapUnavailable))),
            h('p', { role: 'status', style: { margin: 0, color: '#a7c7d8', fontSize: 11 } }, timeStatus),
            h('section', { 'aria-labelledby': 'gis-change-summary-heading', style: panel },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' } },
                h('div', null,
                  h('h2', { id: 'gis-change-summary-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Accessible change summary'),
                  h('p', { style: { margin: 0, color: '#cfe8f3', fontSize: 12, lineHeight: 1.5 } }, temporalSummary)),
                h('button', { type: 'button', onClick: downloadTimeEvidence, style: primary }, 'Download change evidence report')),
              temporalResult.warnings.length > 0 && h('div', { role: 'alert', style: { marginTop: 10, padding: 9, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', fontSize: 11 } },
                temporalResult.warnings.join(' ')),
              h('label', { style: { display: 'grid', gap: 6, marginTop: 12, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Change claim or observation',
                h('textarea', { value: timeObservation, onChange: function (event) { setTimeObservation(event.target.value); }, rows: 3, placeholder: 'From the baseline to the focus year... Evidence... A limitation...', style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff' } })),
              h('div', { style: { overflowX: 'auto', marginTop: 12 } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                  h('caption', { style: { textAlign: 'left', color: '#a7c7d8', paddingBottom: 7 } }, 'Change by location from ' + effectiveBaseline + ' to ' + effectiveFocusYear),
                  h('thead', null, h('tr', null, ['Location', 'Baseline', 'Focus year', 'Absolute change', 'Percent change', 'Trend'].map(function (heading) {
                    return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 7, color: '#67e8f9', borderBottom: '1px solid #3f6b82' } }, heading);
                  }))),
                  h('tbody', null, temporalResult.rows.map(function (row) {
                    return h('tr', { key: row.name },
                      h('th', { scope: 'row', style: { textAlign: 'left', padding: 7, color: '#fff', borderBottom: '1px solid #1e4154' } }, row.name),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.startValue == null ? 'Missing' : row.startValue),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.endValue == null ? 'Missing' : row.endValue),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, row.change == null ? 'Not calculated' : (row.change >= 0 ? '+' : '') + display.number(row.change, 1)),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.percent == null ? 'Not calculated' : (row.percent >= 0 ? '+' : '') + display.percent(row.percent, 1)),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.trend));
                  }))))),
            h('aside', { style: { padding: 12, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', borderRadius: 8, fontSize: 11, lineHeight: 1.5 } },
              h('strong', null, 'Compatibility check: '), 'A numeric difference is meaningful only when years use compatible definitions, units, geography, collection methods, and coverage. Missing records are excluded from ranked change.'));
        }

        function missionView() {
          if (!availableMissions.length) {
            return h('section', { 'aria-labelledby': 'gis-missions-heading', style: panel },
              h('h2', { id: 'gis-missions-heading', style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 20 } }, gisText.missionHeading),
              h('p', { role: 'status', style: { margin: '0 0 8px', color: '#dbeafe', fontSize: 13, lineHeight: 1.55 } }, gisText.noMissions),
              h('p', { style: { margin: '0 0 12px', color: '#a7c7d8', fontSize: 11, lineHeight: 1.5 } }, gisText.switchMaineNotice),
              h('button', { type: 'button', onClick: function () { setActiveMissionId(GIS_MISSIONS[0].id); persist('gisActiveMission', GIS_MISSIONS[0].id); changeRegionPack('maine'); }, style: primary }, gisText.switchMaine));
          }
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-missions-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, (activeRegionPack.id === 'maine' ? 'MAINE' : String(activeRegionPack.scope || activeRegionPack.label || 'REGION').toUpperCase()) + ' INQUIRY SERIES'),
              h('h2', { id: 'gis-missions-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, gisText.missionHeading),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Choose a question, prepare the right GIS workspace, gather evidence from the map or its table twin, and document what the data can and cannot support.'),
              h('div', { role: 'tablist', 'aria-label': activeRegionPack.id === 'maine' ? gisText.maineMissions : gisText.missions, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 9, marginTop: 13 } },
                availableMissions.map(function (mission) {
                  var active = mission.id === activeMission.id;
                  var completion = missionCompletion(mission, missionProgress[mission.id] || {});
                  return h('button', {
                    key: mission.id, type: 'button', role: 'tab', 'aria-selected': active,
                    onClick: function () { setActiveMissionId(mission.id); persist('gisActiveMission', mission.id); },
                    style: { textAlign: 'left', padding: 12, borderRadius: 10, border: '1px solid ' + (active ? '#5eead4' : '#36586b'), background: active ? '#0f766e' : '#071827', color: '#fff', cursor: 'pointer' }
                  },
                    h('strong', { style: { display: 'block', fontSize: 13 } }, mission.title),
                    h('span', { style: { display: 'block', marginTop: 4, color: active ? '#ecfeff' : '#a7c7d8', fontSize: 10 } }, mission.duration + ' - ' + completion.complete + '/' + completion.total + ' steps'));
                }))),
            h('section', { role: 'tabpanel', 'aria-labelledby': 'gis-active-mission-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 } },
              h('div', { style: Object.assign({}, panel, { padding: 18 }) },
                h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 10, fontWeight: 900 } }, activeMission.duration.toUpperCase()),
                h('h2', { id: 'gis-active-mission-heading', style: { margin: '5px 0 8px', color: '#f0fdfa', fontSize: 20 } }, activeMission.title),
                h('p', { style: { margin: '0 0 13px', color: '#dbeafe', fontSize: 14, lineHeight: 1.55 } }, activeMission.question),
                h('label', { style: { display: 'grid', gap: 5, color: '#a7c7d8', fontSize: 11, marginBottom: 14 } },
                  h('span', null, 'Mission progress: ' + activeMissionCompletion.complete + ' of ' + activeMissionCompletion.total + ' steps (' + activeMissionCompletion.percent + '%)'),
                  h('progress', { value: activeMissionCompletion.complete, max: activeMissionCompletion.total, style: { width: '100%', height: 16 } })),
                h('fieldset', { style: { margin: 0, padding: 12, border: '1px solid #3f6b82', borderRadius: 10 } },
                  h('legend', { style: { color: '#fde68a', fontWeight: 800, padding: '0 5px' } }, 'Investigation checklist'),
                  activeMission.steps.map(function (step) {
                    return h('label', { key: step.id, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', color: '#e2e8f0', fontSize: 12, lineHeight: 1.45 } },
                      h('input', { type: 'checkbox', checked: !!activeMissionProgress[step.id], onChange: function (event) { saveMissionProgress(activeMission.id, step.id, event.target.checked); } }),
                      step.label);
                  })),
                h('button', { type: 'button', onClick: function () { prepareMission(activeMission); }, style: Object.assign({}, primary, { marginTop: 13 }) },
                  activeMission.workspace === 'compare' ? 'Prepare and open comparison maps' : 'Prepare and open analysis map'),
                h('label', { style: { display: 'grid', gap: 6, marginTop: 15, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Evidence response',
                  h('span', { style: { color: '#a7c7d8', fontSize: 10, fontWeight: 400, lineHeight: 1.45 } }, activeMission.evidencePrompt),
                  h('textarea', {
                    value: missionResponses[activeMission.id] || '',
                    onChange: function (event) { saveMissionResponse(activeMission.id, event.target.value); },
                    rows: 6, placeholder: 'Claim... Evidence... Reasoning... Limitation...',
                    style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff', lineHeight: 1.5 }
                  })),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 } },
                  h('button', { type: 'button', onClick: function () { downloadMissionEvidence(activeMission); }, style: primary }, 'Download mission evidence report'),
                  h('button', { type: 'button', onClick: function () { setTab('missions'); persist('gisTab', 'missions'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Stay with mission guide'))),
              h('aside', { 'aria-labelledby': 'gis-teacher-lens-heading', style: Object.assign({}, panel, { alignSelf: 'start' }) },
                h('h2', { id: 'gis-teacher-lens-heading', style: { margin: '0 0 7px', color: '#86efac', fontSize: 15 } }, 'Teacher lens'),
                h('p', { style: { color: '#cfe8f3', fontSize: 11, lineHeight: 1.55 } }, activeMission.teacherNote),
                h('h3', { style: { color: '#67e8f9', fontSize: 12, margin: '13px 0 6px' } }, 'Curricular practices'),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.6 } },
                  activeMission.practices.map(function (practice) { return h('li', { key: practice }, practice); })),
                h('h3', { style: { color: '#67e8f9', fontSize: 12, margin: '13px 0 6px' } }, 'Quick evidence rubric'),
                h('ol', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.6 } },
                  h('li', null, 'Names a defensible spatial pattern.'),
                  h('li', null, 'Cites mapped or tabular evidence.'),
                  h('li', null, 'Explains a method or spatial relationship.'),
                  h('li', null, 'Names a meaningful limitation.')),
                h('p', { style: { margin: '13px 0 0', padding: 9, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', fontSize: 10, lineHeight: 1.45 } },
                  'The included values and simplified regions are for learning. Do not use them for public policy or resource-allocation decisions.'))));
        }

        function projectionView() {
          var scale = 1 / Math.max(0.05, Math.cos(latitude * Math.PI / 180));
          var factor = projection === 'mercator' ? scale * scale : projection === 'equirectangular' ? scale : 1;
          return h('section', { 'aria-labelledby': 'gis-projection-heading', style: Object.assign({}, panel, { maxWidth: 930, margin: '0 auto', padding: 18 }) },
            h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'COORDINATES + DISTORTION'),
            h('h2', { id: 'gis-projection-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Projection lab'),
            h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, 'Earth is curved; screens are flat. Every projection preserves some relationships and distorts others.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 } },
              h('div', null,
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, marginBottom: 15 } }, 'Projection',
                  h('select', { value: projection, onChange: function (event) { setProjection(event.target.value); persist('gisProjectionCompared', true); }, style: control },
                    h('option', { value: 'mercator' }, 'Mercator'),
                    h('option', { value: 'equirectangular' }, 'Equirectangular'),
                    h('option', { value: 'equalarea' }, 'Equal-area'))),
                h('label', { style: { display: 'grid', gap: 7, fontSize: 12, fontWeight: 700 } }, 'Latitude: ' + display.coordinate(latitude, 0, 'lat'),
                  h('input', { type: 'range', min: -80, max: 80, step: 5, value: latitude, onChange: function (event) { setLatitude(Number(event.target.value)); }, 'aria-describedby': 'gis-factor' })),
                h('div', { id: 'gis-factor', role: 'status', style: { marginTop: 14, padding: 11, borderRadius: 9, background: '#071827', color: '#cffafe' } },
                  h('strong', { style: { display: 'block', color: '#67e8f9', fontSize: 18 } }, display.number(factor, 2) + '\u00D7 visual area'),
                  projection === 'mercator' ? 'Preserves local angles; enlarges high latitudes.' : projection === 'equirectangular' ? 'Maps coordinates directly; stretches east-west distance.' : 'Preserves relative area; changes shape and angle.')),
              h('svg', { viewBox: '0 0 560 300', role: 'img', 'aria-label': projection + ' distortion diagram at ' + display.coordinate(latitude, 0, 'lat') + '. Area factor ' + display.number(factor, 2), style: { width: '100%', minHeight: 280, background: '#071827', borderRadius: 12 } },
                [0, 1, 2, 3, 4, 5, 6].map(function (n) { return h('line', { key: 'v' + n, x1: 40 + n * 80, x2: 40 + n * 80, y1: 30, y2: 260, stroke: '#294457' }); }),
                [0, 1, 2, 3, 4].map(function (n) { return h('line', { key: 'h' + n, x1: 40, x2: 520, y1: 30 + n * 57.5, y2: 30 + n * 57.5, stroke: '#294457' }); }),
                h('ellipse', { cx: 280, cy: 145, rx: Math.min(86, 20 * (projection === 'equalarea' ? 1 / Math.sqrt(scale) : scale)), ry: Math.min(86, 20 * (projection === 'equalarea' ? Math.sqrt(scale) : scale)), fill: 'rgba(34,211,238,.25)', stroke: '#67e8f9', strokeWidth: 4 }),
                h('text', { x: 280, y: 286, textAnchor: 'middle', fill: '#a7c7d8', fontSize: 12 }, 'Tissot indicatrix: one equal patch of ground'))),
            h('p', { style: { color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: '#86efac' } }, 'Choose intentionally: '),
              'Mercator for local direction, equirectangular for simple coordinate grids, and equal-area for choropleth comparisons.'));
        }

        var tabs = [['project', gisText.project], ['composer', gisText.composer], ['remote', gisText.remote], ['story', gisText.story], ['quality', gisText.quality], ['planner', gisText.planner], ['review', gisText.review], ['packet', gisText.packet], ['missions', activeRegionPack.id === 'maine' ? gisText.maineMissions : gisText.missions], ['timeline', gisText.timeline], ['map', gisText.map], ['compare', gisText.compare], ['import', gisText.importData], ['projection', gisText.projection]];
        return h('div', { 'data-gis-studio': 'true', lang: localeInfo.lang, dir: localeInfo.dir, style: { minHeight: '100%', background: 'linear-gradient(155deg,#06131f,#0b2531 52%,#102332)', color: '#e2e8f0', padding: 16, boxSizing: 'border-box', fontFamily: 'Inter,system-ui,sans-serif' } },
          h('header', { style: { maxWidth: 1180, margin: '0 auto 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' } },
            h('div', null,
              h('p', { style: { margin: 0, color: '#5eead4', fontSize: 11, fontWeight: 900, letterSpacing: '.11em' } }, gisText.kicker),
              h('h1', { style: { margin: '4px 0 3px', color: '#f0fdfa', fontSize: 26 } }, gisText.title),
              h('p', { style: { margin: 0, color: '#a7c7d8', fontSize: 12 } }, gisText.tagline),
              h('button', { type: 'button', onClick: addCurrentViewToStory, style: Object.assign({}, control, { cursor: 'pointer', marginTop: 9 }) }, gisText.addStory)),
            h('nav', { 'aria-label': gisText.sections, style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              tabs.map(function (item) {
                var active = tab === item[0];
                return h('button', { key: item[0], type: 'button', onClick: function () { go(item[0]); }, 'aria-current': active ? 'page' : undefined, style: { padding: '9px 12px', borderRadius: 9, border: '1px solid ' + (active ? '#5eead4' : '#36586b'), background: active ? '#0f766e' : '#102536', color: '#fff', fontWeight: 800, cursor: 'pointer' } }, item[1]);
              }))),
          h('main', { style: { maxWidth: 1180, margin: '0 auto' } }, tab === 'project' ? projectView() : tab === 'composer' ? composerView() : tab === 'remote' ? remoteSensingView() : tab === 'story' ? storyMapView() : tab === 'quality' ? qualityReviewView() : tab === 'planner' ? investigationPlannerView() : tab === 'review' ? teacherReviewView() : tab === 'packet' ? investigationPacketView() : tab === 'missions' ? missionView() : tab === 'timeline' ? timelineView() : tab === 'map' ? mapView() : tab === 'compare' ? comparisonView() : tab === 'import' ? importView() : projectionView()),
          h('footer', { style: { maxWidth: 1180, margin: '14px auto 0', color: '#8ba7b7', fontSize: 10, lineHeight: 1.5 } },
            'Learning data: density values are rounded approximations; the access index, practice polygons, coastal guide, and remote-sensing raster are illustrative. Basemaps \u00A9 OpenStreetMap, Esri, and contributors. Official ecoregions \u00A9 Maine Natural Areas Program. Verify claims with authoritative data before making decisions.'));
      }

      // StemPluginBridge is already a stable React component. Invoke Studio as
      // its render implementation so host data updates preserve GIS hook state
      // instead of creating a new nested component type on every persistence call.
      return Studio();
    }
  });
})();
