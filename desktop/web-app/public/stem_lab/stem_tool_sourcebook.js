// stem_tool_sourcebook.js — open visual-source finder for education and art
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) {
      return this._registry[id] && this._registry[id].render ? this._registry[id].render(ctx) : null;
    }
  };

  var COMMONS_FILE = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/';
  var COMMONS_PAGE = 'https://commons.wikimedia.org/wiki/File:';
  var MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';
  var MET_OPEN_ACCESS_TERMS = 'https://www.metmuseum.org/policies/terms-and-conditions';
  var AIC_API = 'https://api.artic.edu/api/v1';
  var AIC_OPEN_ACCESS_TERMS = 'https://www.artic.edu/open-access/open-access-images';
  var CMA_OPEN_ACCESS_TERMS = 'https://www.clevelandart.org/open-access';

  function commonsPreview(filename) {
    return COMMONS_FILE + encodeURIComponent(filename) + '?width=960';
  }

  function commonsOriginal(filename) {
    return COMMONS_FILE + encodeURIComponent(filename);
  }

  function commonsPage(filename) {
    return COMMONS_PAGE + encodeURIComponent(filename).replace(/%20/g, '_');
  }

  // Built-in results use a conservative allowlist. Every rights statement below
  // points to the item record that expressly identifies the file as PD or CC0.
  var MATERIALS = [
    {
      id: 'contour-psf', title: 'Contour map line drawing', kind: 'Maps', provider: 'Wikimedia Commons',
      year: 'undated', creator: 'Pearson Scott Foresman', file: 'Contour map (PSF).png',
      description: 'Crisp black-and-white contour lines with generous negative space.',
      license: 'Public domain dedication', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record says the copyright holder released this work into the public domain.',
      tags: ['contour', 'topographic', 'map', 'lines', 'terrain', 'geography', 'black white', 'education', 'diagram'],
      accent: ['#d9e7df', '#315c4b'], sourceUrl: commonsPage('Contour map (PSF).png'),
      imageUrl: commonsPreview('Contour map (PSF).png'), downloadUrl: commonsOriginal('Contour map (PSF).png')
    },
    {
      id: 'topo-stowe', title: 'Stowe topographic map sample', kind: 'Maps', provider: 'Wikimedia Commons',
      year: 'USGS source', creator: 'U.S. Geological Survey', file: 'Topographic map example.png',
      description: 'A detailed quadrangle excerpt with contours, roads, water, and map typography.',
      license: 'U.S. public domain', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record identifies the image as U.S. public domain because it contains USGS material.',
      tags: ['topographic', 'contour', 'map', 'terrain', 'geography', 'roads', 'survey', 'usgs', 'layered'],
      accent: ['#e7e2cb', '#866f47'], sourceUrl: commonsPage('Topographic map example.png'),
      imageUrl: commonsPreview('Topographic map example.png'), downloadUrl: commonsOriginal('Topographic map example.png')
    },
    {
      id: 'earth-topography', title: 'Earth topographic map', kind: 'Maps', provider: 'Wikimedia Commons',
      year: '2001', creator: 'NASA / USGS', file: 'Earth Topographic Map.jpg',
      description: 'Global land and ocean relief rendered as a wide topographic field.',
      license: 'U.S. public domain', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record identifies the NASA and USGS source material as U.S. public domain.',
      tags: ['world', 'earth', 'topography', 'relief', 'map', 'terrain', 'ocean', 'nasa', 'usgs'],
      accent: ['#c6d8d3', '#315a6b'], sourceUrl: commonsPage('Earth Topographic Map.jpg'),
      imageUrl: commonsPreview('Earth Topographic Map.jpg'), downloadUrl: commonsOriginal('Earth Topographic Map.jpg')
    },
    {
      id: 'wood-dark', title: 'Weathered wood grain', kind: 'Textures', provider: 'Wikimedia Commons',
      year: 'source date unknown', creator: 'Bango Textures', file: 'Wood Texture Background.jpg',
      description: 'High-resolution dark timber with long grain, knots, and weathered tonal shifts.',
      license: 'CC0 1.0', rightsType: 'cc0', rightsShort: 'CC0',
      rightsNote: 'The source record makes this file available under the CC0 1.0 public-domain dedication.',
      tags: ['wood', 'grain', 'texture', 'timber', 'brown', 'weathered', 'natural', 'repeat', 'background'],
      accent: ['#d3b38c', '#5f3824'], sourceUrl: commonsPage('Wood Texture Background.jpg'),
      imageUrl: commonsPreview('Wood Texture Background.jpg'), downloadUrl: commonsOriginal('Wood Texture Background.jpg')
    },
    {
      id: 'wood-light', title: 'Light wood grain', kind: 'Textures', provider: 'Wikimedia Commons',
      year: '2020', creator: 'Kurt Kaiser', file: 'Wood texture, light.jpg',
      description: 'Pale linear grain suited to quiet backgrounds, labels, and printable texture fields.',
      license: 'CC0 1.0', rightsType: 'cc0', rightsShort: 'CC0',
      rightsNote: 'The source record makes this file available under the CC0 1.0 public-domain dedication.',
      tags: ['wood', 'grain', 'texture', 'light', 'pale', 'natural', 'repeat', 'background', 'paper'],
      accent: ['#efe0c4', '#98724c'], sourceUrl: commonsPage('Wood texture, light.jpg'),
      imageUrl: commonsPreview('Wood texture, light.jpg'), downloadUrl: commonsOriginal('Wood texture, light.jpg')
    },
    {
      id: 'eeg-waves', title: 'EEG brainwave bands', kind: 'Science', provider: 'Wikimedia Commons',
      year: '2020', creator: 'Laurens R. Krol', file: 'EEG Brainwaves.svg',
      description: 'Ten seconds of simulated delta, theta, alpha, beta, and gamma waveforms.',
      license: 'CC0 1.0', rightsType: 'cc0', rightsShort: 'CC0',
      rightsNote: 'The creator dedicated this SVG to the public domain under CC0 1.0.',
      tags: ['brainwave', 'brain', 'eeg', 'waveform', 'neuroscience', 'signal', 'science', 'diagram', 'line'],
      accent: ['#d9dcf6', '#454b94'], sourceUrl: commonsPage('EEG Brainwaves.svg'),
      imageUrl: commonsPreview('EEG Brainwaves.svg'), downloadUrl: commonsOriginal('EEG Brainwaves.svg')
    },
    {
      id: 'neuron', title: 'Neuron anatomy drawing', kind: 'Science', provider: 'Wikimedia Commons',
      year: '2019', creator: 'Dana Scarinci Zabaleta', file: 'Drawing of a neuron.svg',
      description: 'A clean vector neuron with dendrites, cell body, axon, and terminal branches.',
      license: 'CC0 1.0', rightsType: 'cc0', rightsShort: 'CC0',
      rightsNote: 'The creator dedicated this SVG to the public domain under CC0 1.0.',
      tags: ['neuron', 'brain', 'nervous system', 'biology', 'science', 'diagram', 'anatomy', 'cell', 'vector'],
      accent: ['#f2d8da', '#9b4655'], sourceUrl: commonsPage('Drawing of a neuron.svg'),
      imageUrl: commonsPreview('Drawing of a neuron.svg'), downloadUrl: commonsOriginal('Drawing of a neuron.svg')
    },
    {
      id: 'brain-engraving', title: 'Historic brain line drawing', kind: 'Science', provider: 'Wikimedia Commons',
      year: '1892–1893', creator: 'T. Wesley Mills; vector by Offnfopt', file: 'Brain Drawing.svg',
      description: 'A historic cerebellum illustration converted into a crisp, scalable vector drawing.',
      license: 'Public Domain Mark', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record identifies the underlying historic work as public domain and free of known restrictions.',
      tags: ['brain', 'cerebellum', 'anatomy', 'science', 'historic', 'engraving', 'line art', 'neuroscience'],
      accent: ['#eadfd6', '#72594e'], sourceUrl: commonsPage('Brain Drawing.svg'),
      imageUrl: commonsPreview('Brain Drawing.svg'), downloadUrl: commonsOriginal('Brain Drawing.svg')
    },
    {
      id: 'botanical-plate', title: 'Botanical Magazine plate 324', kind: 'Botanical', provider: 'Wikimedia Commons',
      year: '1795', creator: 'William Curtis', file: 'The Botanical Magazine, Plate 324 (Volume 9, 1795).png',
      description: 'A hand-colored Linaria triphylla plate with period paper tone and fine botanical detail.',
      license: 'Public Domain Mark', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record identifies the original and its mechanical scan as public domain.',
      tags: ['botanical', 'flower', 'plant', 'natural history', 'archive', 'vintage', 'illustration', 'paper'],
      accent: ['#e8e0c4', '#63754d'], sourceUrl: commonsPage('The Botanical Magazine, Plate 324 (Volume 9, 1795).png'),
      imageUrl: commonsPreview('The Botanical Magazine, Plate 324 (Volume 9, 1795).png'), downloadUrl: commonsOriginal('The Botanical Magazine, Plate 324 (Volume 9, 1795).png')
    },
    {
      id: 'decorated-card', title: 'Cut decorated card, circa 1900', kind: 'Archival', provider: 'Wikimedia Commons',
      year: 'circa 1900', creator: 'Unknown; Cooper Hewitt collection', file: 'Ephemera, cut decorated card, ca. 1900 (CH 18643749).jpg',
      description: 'A delicate historic paper card with cut edges, illustration, typography, and visible age.',
      license: 'Public Domain Mark', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record marks the historic work and faithful reproduction as public domain.',
      tags: ['archival', 'ephemera', 'card', 'paper', 'vintage', 'typography', 'decorative', 'historic', 'ornament'],
      accent: ['#f2dfca', '#9c5f58'], sourceUrl: commonsPage('Ephemera, cut decorated card, ca. 1900 (CH 18643749).jpg'),
      imageUrl: commonsPreview('Ephemera, cut decorated card, ca. 1900 (CH 18643749).jpg'), downloadUrl: commonsOriginal('Ephemera, cut decorated card, ca. 1900 (CH 18643749).jpg')
    },
    {
      id: 'exposition-blueprint', title: 'Louisiana Purchase Exposition ground plan', kind: 'Blueprints', provider: 'Wikimedia Commons',
      year: 'circa 1904', creator: 'Unknown; Missouri History Museum', file: 'Blueprint- Ground Plan of Part of the Louisiana Purchase Exposition, ca. 1904.jpg',
      description: 'A true cyanotype ground plan with dense labels, pathways, and exhibition-building footprints.',
      license: 'U.S. public domain', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record identifies this U.S. work, published before 1931, and its faithful reproduction as public domain.',
      tags: ['blueprint', 'architecture', 'exposition', 'ground plan', 'technical', 'cyanotype', 'historic', 'map', 'drawing'],
      accent: ['#c6e6f4', '#155d87'], sourceUrl: commonsPage('Blueprint- Ground Plan of Part of the Louisiana Purchase Exposition, ca. 1904.jpg'),
      imageUrl: commonsPreview('Blueprint- Ground Plan of Part of the Louisiana Purchase Exposition, ca. 1904.jpg'), downloadUrl: commonsOriginal('Blueprint- Ground Plan of Part of the Louisiana Purchase Exposition, ca. 1904.jpg')
    },
    {
      id: 'architecture-plan', title: 'Eighteenth-century architecture plan', kind: 'Blueprints', provider: 'Wikimedia Commons',
      year: '1749', creator: 'William Halfpenny', file: 'A new and compleat system of architecture delineated, in a variety of plans and elevations of designs for convenient and decorated houses Fleuron T078316-2.png',
      description: 'An engraved architectural plan and elevation with room divisions, measurements, and period linework.',
      license: 'Public Domain Mark', rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The source record identifies the historic work and its faithful photographic reproduction as public domain.',
      tags: ['blueprint', 'architecture', 'house', 'plan', 'elevation', 'technical', 'engraving', 'historic', 'drawing'],
      accent: ['#ede3cf', '#6f6557'], sourceUrl: commonsPage('A new and compleat system of architecture delineated, in a variety of plans and elevations of designs for convenient and decorated houses Fleuron T078316-2.png'),
      imageUrl: commonsPreview('A new and compleat system of architecture delineated, in a variety of plans and elevations of designs for convenient and decorated houses Fleuron T078316-2.png'), downloadUrl: commonsOriginal('A new and compleat system of architecture delineated, in a variety of plans and elevations of designs for convenient and decorated houses Fleuron T078316-2.png')
    },
    {
      id: 'cma-binakol', title: 'Binakol textile fragment', kind: 'Patterns', provider: 'Cleveland Museum of Art',
      year: 'early 1900s', creator: 'Maker not identified; see CMA object record',
      description: 'A woven cotton textile fragment recorded as extended tabby weave, useful for studying repeating structure.',
      license: 'CC0 Open Access (public-domain artwork)', licenseUrl: CMA_OPEN_ACCESS_TERMS, rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The CMA API returned share_license_status=CC0 for accession 1921.1596 and supplies both web and print images.',
      tags: ['textile', 'pattern', 'woven', 'cotton', 'binakol', 'geometry', 'repeat', 'fabric', 'philippines'],
      accent: ['#ded8ca', '#554b41'], sourceUrl: 'https://clevelandart.org/art/1921.1596',
      imageUrl: 'https://openaccess-cdn.clevelandart.org/1921.1596/1921.1596_web.jpg', downloadUrl: 'https://openaccess-cdn.clevelandart.org/1921.1596/1921.1596_print.jpg'
    },
    {
      id: 'cma-palmettes', title: 'Textile with palmettes', kind: 'Patterns', provider: 'Cleveland Museum of Art',
      year: '1200s–1300s', creator: 'Maker not identified; see CMA object record',
      description: 'A silk-and-gold textile indexed by the museum as a palmette pattern with supplementary weft.',
      license: 'CC0 Open Access (public-domain artwork)', licenseUrl: CMA_OPEN_ACCESS_TERMS, rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The CMA API returned share_license_status=CC0 for accession 1993.253 and supplies both web and print images.',
      tags: ['textile', 'pattern', 'palmette', 'silk', 'gold', 'woven', 'ornament', 'repeat', 'historic'],
      accent: ['#e1cfa9', '#6b5032'], sourceUrl: 'https://clevelandart.org/art/1993.253',
      imageUrl: 'https://openaccess-cdn.clevelandart.org/1993.253/1993.253_web.jpg', downloadUrl: 'https://openaccess-cdn.clevelandart.org/1993.253/1993.253_print.jpg'
    },
    {
      id: 'cma-botanical-lily', title: 'White Cape Coast Lily botanical plate', kind: 'Botanical', provider: 'Cleveland Museum of Art',
      year: '1806', creator: 'Sydenham Edwards',
      description: 'A hand-colored engraving from The Botanical Magazine, prepared as a high-resolution printable plate.',
      license: 'CC0 Open Access (public-domain artwork)', licenseUrl: CMA_OPEN_ACCESS_TERMS, rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The CMA API returned share_license_status=CC0 for accession 1955.142 and supplies both web and print images.',
      tags: ['botanical', 'lily', 'flower', 'plant', 'engraving', 'hand colored', 'print', 'natural history', 'archive'],
      accent: ['#e7e0c4', '#60704c'], sourceUrl: 'https://clevelandart.org/art/1955.142',
      imageUrl: 'https://openaccess-cdn.clevelandart.org/1955.142/1955.142_web.jpg', downloadUrl: 'https://openaccess-cdn.clevelandart.org/1955.142/1955.142_print.jpg'
    },
    {
      id: 'cma-nolli-rome', title: 'Nolli plan of Rome sheet', kind: 'Maps', provider: 'Cleveland Museum of Art',
      year: '1748', creator: 'Giovanni Battista Nolli',
      description: 'An etched and engraved sheet from Nolli’s large 1748 plan of Rome, with dense historical map linework.',
      license: 'CC0 Open Access (public-domain artwork)', licenseUrl: CMA_OPEN_ACCESS_TERMS, rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The CMA API returned share_license_status=CC0 for accession 2020.276.15 and supplies both web and print images.',
      tags: ['map', 'rome', 'city plan', 'engraving', 'architecture', 'historic', 'linework', 'urban', 'nolli'],
      accent: ['#e7dfd0', '#62584a'], sourceUrl: 'https://clevelandart.org/art/2020.276.15',
      imageUrl: 'https://openaccess-cdn.clevelandart.org/2020.276.15/2020.276.15_web.jpg', downloadUrl: 'https://openaccess-cdn.clevelandart.org/2020.276.15/2020.276.15_print.jpg'
    },
    {
      id: 'cma-canaletto-courtyard', title: 'Palace courtyard architectural study', kind: 'Blueprints', provider: 'Cleveland Museum of Art',
      year: 'circa 1750–1755', creator: 'Antonio Canaletto',
      description: 'A pen-and-wash architectural capriccio of a palace courtyard, supplied as a printable Open Access drawing.',
      license: 'CC0 Open Access (public-domain artwork)', licenseUrl: CMA_OPEN_ACCESS_TERMS, rightsType: 'pd', rightsShort: 'Public domain',
      rightsNote: 'The CMA API returned share_license_status=CC0 for accession 1930.23 and supplies both web and print images.',
      tags: ['architecture', 'drawing', 'courtyard', 'palace', 'plan', 'linework', 'historic', 'ink', 'wash'],
      accent: ['#ddd5c7', '#665a4e'], sourceUrl: 'https://clevelandart.org/art/1930.23',
      imageUrl: 'https://openaccess-cdn.clevelandart.org/1930.23/1930.23_web.jpg', downloadUrl: 'https://openaccess-cdn.clevelandart.org/1930.23/1930.23_print.jpg'
    }
  ];

  var PROVIDERS = [
    {
      id: 'commons', name: 'Wikimedia Commons', mark: 'W', note: 'File-level reuse terms',
      search: function (q) { return 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(q || 'public domain texture') + '&title=Special:MediaSearch&type=image'; }
    },
    {
      id: 'met', name: 'The Met Open Access', mark: 'MET', note: 'Live public-domain object records',
      search: function (q) { return 'https://www.metmuseum.org/art/collection/search?q=' + encodeURIComponent(q || 'public domain visual material') + '&showOnly=openAccess'; }
    },
    {
      id: 'aic', name: 'Art Institute of Chicago', mark: 'AIC', note: 'Live CC0 public-domain records',
      search: function (q) { return 'https://www.artic.edu/collection?is_public_domain=1&q=' + encodeURIComponent(q || 'public domain visual material'); }
    },
    {
      id: 'cma', name: 'Cleveland Museum of Art', mark: 'CMA', note: 'Curated CC0 images · use Open Access filter',
      search: function () { return 'https://www.clevelandart.org/art/collection/search'; }
    },
    {
      id: 'loc', name: 'Library of Congress', mark: 'LOC', note: 'Item-level rights advisories',
      search: function (q) { return 'https://www.loc.gov/pictures/?fo=json&q=' + encodeURIComponent(q || 'visual materials') + '&sp=1'; }
    },
    {
      id: 'smithsonian', name: 'Smithsonian Open Access', mark: 'SI', note: 'Filter for CC0 records',
      search: function (q) { return 'https://www.si.edu/search?edan_q=' + encodeURIComponent(q || 'open access texture') + '&edan_fq%5B0%5D=media_usage%3ACC0'; }
    },
    {
      id: 'nypl', name: 'NYPL Digital Collections', mark: 'NYPL', note: 'Use public-domain filter',
      search: function (q) { return 'https://digitalcollections.nypl.org/search/index?keywords=' + encodeURIComponent(q || 'public domain visual material'); }
    }
  ];

  var STARTERS = [
    'quiet wood grain for a reading handout',
    'historic blueprint with strong linework',
    'brainwaves and nervous-system diagrams',
    'contour maps for a geography project',
    'aged paper and archival typography',
    'public domain textile patterns and ornament'
  ];

  var EXPANSIONS = {
    classroom: ['education', 'diagram', 'map'], handout: ['education', 'background', 'paper'],
    worksheet: ['education', 'diagram', 'background'], vintage: ['historic', 'archive', 'archival', 'paper'],
    old: ['historic', 'archive', 'vintage'], natural: ['wood', 'botanical', 'terrain'],
    lines: ['line', 'diagram', 'contour', 'technical'], technical: ['blueprint', 'plan', 'diagram', 'engineering'],
    brainwaves: ['brainwave', 'eeg', 'waveform'], maps: ['map', 'topographic', 'contour'],
    texture: ['texture', 'grain', 'paper', 'background'], textures: ['texture', 'grain', 'paper', 'background'],
    science: ['science', 'diagram', 'biology', 'neuroscience'], archive: ['archival', 'historic', 'vintage'],
    pattern: ['pattern', 'ornament', 'textile', 'decorative'], patterns: ['pattern', 'ornament', 'textile', 'decorative'],
    ornament: ['pattern', 'decorative', 'motif'], textile: ['pattern', 'fabric', 'decorative']
  };

  // Defensive eligibility check: future catalog additions do not render unless
  // their license class is explicitly approved here.
  var ALLOWED_RIGHTS = { pd: true, cc0: true, ccby: true };
  var RIGHTS_SCOPES = {
    pd: { pd: true },
    'pd-cc0': { pd: true, cc0: true },
    all: { pd: true, cc0: true, ccby: true }
  };
  var COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

  function allowedByRightsScope(item, scope) {
    var allowed = RIGHTS_SCOPES[scope] || RIGHTS_SCOPES.all;
    return !!(item && ALLOWED_RIGHTS[item.rightsType] && allowed[item.rightsType]);
  }

  function metadataValue(field) {
    return field && typeof field.value === 'string' ? field.value : '';
  }

  function plainMetadata(value) {
    var text = String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#(\d+);/g, function (_, code) {
        var number = Number(code);
        return number > 31 && number < 65536 ? String.fromCharCode(number) : ' ';
      })
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }

  function safeHttpsUrl(value) {
    var url = String(value || '').trim();
    if (url.indexOf('//') === 0) url = 'https:' + url;
    return /^https:\/\//i.test(url) ? url : '';
  }

  // Commons metadata is admitted only when both its short name and, where
  // applicable, its canonical license URL match this deliberately narrow set.
  // Unknown licenses and share-alike/noncommercial variants never reach the UI.
  function normalizeCommonsRights(extmetadata) {
    var meta = extmetadata || {};
    var shortName = plainMetadata(metadataValue(meta.LicenseShortName));
    var usageTerms = plainMetadata(metadataValue(meta.UsageTerms));
    var licenseUrl = safeHttpsUrl(metadataValue(meta.LicenseUrl));
    var normalized = shortName.toLowerCase().replace(/\s+/g, ' ').trim();
    var usage = usageTerms.toLowerCase().replace(/\s+/g, ' ').trim();

    if ((normalized === 'cc0' || normalized === 'cc0 1.0') &&
        (/creativecommons\.org\/publicdomain\/zero\/1\.0\/?$/i.test(licenseUrl) || usage === 'cc0')) {
      return { rightsType: 'cc0', license: shortName || 'CC0 1.0', rightsShort: 'CC0', licenseUrl: licenseUrl || 'https://creativecommons.org/publicdomain/zero/1.0/' };
    }
    if ((normalized === 'public domain mark' || normalized === 'pdm') &&
        /creativecommons\.org\/publicdomain\/mark\/1\.0\/?$/i.test(licenseUrl)) {
      return { rightsType: 'pd', license: 'Public Domain Mark', rightsShort: 'Public domain', licenseUrl: licenseUrl };
    }
    if (normalized === 'public domain' && usage === 'public domain') {
      return { rightsType: 'pd', license: 'Public domain', rightsShort: 'Public domain', licenseUrl: licenseUrl };
    }
    var byMatch = normalized.match(/^cc by (2\.0|3\.0|4\.0)$/);
    if (byMatch && new RegExp('creativecommons\\.org/licenses/by/' + byMatch[1].replace('.', '\\.') + '/?$', 'i').test(licenseUrl)) {
      return { rightsType: 'ccby', license: 'CC BY ' + byMatch[1], rightsShort: 'CC BY', licenseUrl: licenseUrl };
    }
    return null;
  }

  function inferMaterialKind(query, requestedKind) {
    if (requestedKind && requestedKind !== 'All') return requestedKind;
    var value = String(query || '').toLowerCase();
    if (/\b(map|maps|topograph|contour|terrain|cartograph)/.test(value)) return 'Maps';
    if (/\b(texture|textures|grain|wood|fabric|stone|paper background)/.test(value)) return 'Textures';
    if (/\b(pattern|patterns|ornament|motif|textile|wallpaper|decorative)/.test(value)) return 'Patterns';
    if (/\b(blueprint|architect|floor plan|technical drawing|engineering plan)/.test(value)) return 'Blueprints';
    if (/\b(science|scientific|diagram|anatom|brain|cell|botan|biology|physics|chemistry)/.test(value)) return 'Science';
    if (/\b(botanical|flower|plant|herbarium)/.test(value)) return 'Botanical';
    if (/\b(archive|archival|ephemera|historic|vintage|manuscript|engraving)/.test(value)) return 'Archival';
    return 'Visual assets';
  }

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
      kind: inferMaterialKind(query, requestedKind),
      provider: 'Wikimedia Commons',
      year: year,
      creator: creator,
      description: description,
      license: rights.license,
      licenseUrl: rights.licenseUrl,
      rightsType: rights.rightsType,
      rightsShort: rights.rightsShort,
      rightsNote: rightsNote,
      tags: normalizeWords([title, description, query].join(' ')),
      accent: ['#dce8e2', '#466b60'],
      sourceUrl: sourceUrl,
      imageUrl: imageUrl,
      downloadUrl: downloadUrl,
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
      Science: ' scientific diagram', Botanical: ' botanical illustration', Archival: ' archival ephemera'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var params = [
      'action=query', 'format=json', 'formatversion=2', 'origin=*',
      'generator=search', 'gsrnamespace=6', 'gsrlimit=' + Math.max(4, Math.min(24, Number(opts.limit || 18))),
      'gsrsort=relevance', 'gsrsearch=' + encodeURIComponent(searchText),
      'prop=imageinfo', 'iiprop=url%7Cextmetadata%7Csize%7Cmediatype', 'iiurlwidth=900',
      'iiextmetadatalanguage=en',
      'iiextmetadatafilter=LicenseShortName%7CLicenseUrl%7CUsageTerms%7CArtist%7CImageDescription%7CCredit%7CDateTimeOriginal'
    ];
    var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
    var requestOptions = { method: 'GET', mode: 'cors', credentials: 'omit' };
    if (controller) requestOptions.signal = controller.signal;
    return fetchFn(COMMONS_API + '?' + params.join('&'), requestOptions)
      .then(function (response) {
        if (!response || !response.ok) throw new Error('Commons search returned an error.');
        return response.json();
      })
      .then(function (payload) {
        var pages = payload && payload.query && Array.isArray(payload.query.pages) ? payload.query.pages : [];
        return pages.map(function (page) { return commonsItemFromPage(page, q, opts.kind); }).filter(Boolean);
      }).then(function (items) {
        if (timeoutId) clearTimeout(timeoutId);
        return items;
      }, function (error) {
        if (timeoutId) clearTimeout(timeoutId);
        throw error;
      });
  }

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
    var classification = [query, title, object.objectName, object.classification, object.medium].concat(tagTerms).join(' ');
    return {
      id: 'met-live-' + String(object.objectID),
      title: title,
      kind: inferMaterialKind(classification, requestedKind),
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
      Botanical: ' botanical flower', Archival: ' print ephemera'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var maximum = Math.max(4, Math.min(12, Number(opts.limit || 8)));
    var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
    var requestOptions = { method: 'GET', mode: 'cors', credentials: 'omit' };
    if (controller) requestOptions.signal = controller.signal;
    var searchUrl = MET_API + '/search?hasImages=true&q=' + encodeURIComponent(searchText);
    return fetchFn(searchUrl, requestOptions).then(function (response) {
      if (!response || !response.ok) throw new Error('The Met search returned an error.');
      return response.json();
    }).then(function (payload) {
      var ids = payload && Array.isArray(payload.objectIDs) ? payload.objectIDs.slice(0, maximum) : [];
      return Promise.all(ids.map(function (id) {
        return fetchFn(MET_API + '/objects/' + encodeURIComponent(id), requestOptions)
          .then(function (response) { return response && response.ok ? response.json() : null; })
          .catch(function () { return null; });
      }));
    }).then(function (objects) {
      if (timeoutId) clearTimeout(timeoutId);
      return objects.map(function (object) { return metItemFromObject(object, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      if (timeoutId) clearTimeout(timeoutId);
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
    var classification = [query, title, artwork.medium_display, artwork.classification_title].join(' ');
    return {
      id: 'aic-live-' + String(artwork.id),
      title: title,
      kind: inferMaterialKind(classification, requestedKind),
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
      Botanical: ' botanical print', Archival: ' print ephemera'
    };
    var searchText = q + (kindHints[opts.kind] || '');
    var maximum = Math.max(4, Math.min(12, Number(opts.limit || 10)));
    var fields = 'id,title,artist_display,date_display,medium_display,classification_title,image_id,is_public_domain';
    var searchUrl = AIC_API + '/artworks/search?q=' + encodeURIComponent(searchText)
      + '&limit=' + maximum + '&fields=' + encodeURIComponent(fields)
      + '&query%5Bterm%5D%5Bis_public_domain%5D=true';
    var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
    var requestOptions = { method: 'GET', mode: 'cors', credentials: 'omit' };
    if (controller) requestOptions.signal = controller.signal;
    return fetchFn(searchUrl, requestOptions).then(function (response) {
      if (!response || !response.ok) throw new Error('Art Institute search returned an error.');
      return response.json();
    }).then(function (payload) {
      if (timeoutId) clearTimeout(timeoutId);
      var artworks = payload && Array.isArray(payload.data) ? payload.data : [];
      return artworks.map(function (artwork) { return aicItemFromArtwork(artwork, payload.config || {}, q, opts.kind); }).filter(Boolean);
    }, function (error) {
      if (timeoutId) clearTimeout(timeoutId);
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
    var classification = [query, title, artwork.tombstone, artwork.technique, artwork.type, artwork.department, artwork.collection].join(' ');
    return {
      id: 'cma-live-' + String(artwork.id),
      title: title,
      kind: inferMaterialKind(classification, requestedKind),
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
      live: true,
      rightsMetadataSource: 'Cleveland Museum of Art API share_license_status=CC0'
    };
  }

  var LIVE_SEARCH_CACHE = {};
  var LIVE_SEARCH_CACHE_MS = 5 * 60 * 1000;

  function providerSupportsLiveSearch(provider) {
    return provider === 'All' || provider === 'Wikimedia Commons'
      || provider === 'The Met Open Access' || provider === 'Art Institute of Chicago';
  }

  function curatedProviderMessage(provider) {
    if (provider === 'Cleveland Museum of Art') {
      return 'Showing Sourcebook’s verified Cleveland Museum CC0 shelf. Its official API does not permit direct browser search, so no unverified proxy is used.';
    }
    return 'Showing verified results from Sourcebook’s curated shelf.';
  }

  function searchOpenSources(query, options) {
    var opts = options || {};
    var provider = opts.provider || 'All';
    var cacheKey = [String(query || '').trim().toLowerCase(), opts.kind || 'All', provider, opts.rightsScope || 'all'].join('|');
    var cached = LIVE_SEARCH_CACHE[cacheKey];
    if (cached && Date.now() - cached.savedAt < LIVE_SEARCH_CACHE_MS) return Promise.resolve(cached.items.slice());
    var jobs = [];
    if (provider === 'All' || provider === 'Wikimedia Commons') {
      jobs.push(searchCommonsLive(query, { kind: opts.kind, limit: Math.min(14, Number(opts.limit || 18)) }));
    }
    if (provider === 'All' || provider === 'The Met Open Access') {
      jobs.push(searchMetLive(query, { kind: opts.kind, limit: Math.min(10, Number(opts.limit || 10)) }));
    }
    if (provider === 'All' || provider === 'Art Institute of Chicago') {
      jobs.push(searchAicLive(query, { kind: opts.kind, limit: Math.min(10, Number(opts.limit || 10)) }));
    }
    if (!jobs.length) return Promise.resolve([]);
    return Promise.all(jobs.map(function (job) {
      return job.then(function (items) { return { ok: true, items: items }; }, function () { return { ok: false, items: [] }; });
    })).then(function (results) {
      if (!results.some(function (result) { return result.ok; })) throw new Error('Open-source search providers are unavailable.');
      var items = [];
      results.forEach(function (result) { items = items.concat(result.items); });
      var admitted = mergeAssets([], items).filter(function (item) { return allowedByRightsScope(item, opts.rightsScope || 'all'); });
      LIVE_SEARCH_CACHE[cacheKey] = { savedAt: Date.now(), items: admitted.slice() };
      return admitted;
    });
  }

  function normalizeWords(value) {
    return String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (word) { return word.length > 1; });
  }

  function searchMaterials(query, kind, provider, rightsScope) {
    var words = normalizeWords(query);
    var expanded = words.slice();
    words.forEach(function (word) {
      (EXPANSIONS[word] || []).forEach(function (extra) { if (expanded.indexOf(extra) === -1) expanded.push(extra); });
    });
    return MATERIALS.map(function (item, index) {
      if (!allowedByRightsScope(item, rightsScope || 'all')) return null;
      if (kind && kind !== 'All' && item.kind !== kind) return null;
      if (provider && provider !== 'All' && item.provider !== provider) return null;
      var title = item.title.toLowerCase();
      var haystack = [item.title, item.description, item.kind, item.provider, item.creator].concat(item.tags).join(' ').toLowerCase();
      var score = words.length ? 0 : (MATERIALS.length - index);
      expanded.forEach(function (word) {
        if (title.indexOf(word) !== -1) score += 7;
        else if (haystack.indexOf(word) !== -1) score += 3;
      });
      if (words.length && score === 0) return null;
      return { item: item, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).map(function (row) { return row.item; });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function attributionText(item) {
    if (!item) return '';
    return [item.creator, item.title, item.year, item.provider, item.license, item.sourceUrl].filter(Boolean).join(' · ');
  }

  function liveResultSummary(items) {
    var list = Array.isArray(items) ? items : [];
    if (!list.length) return 'No live results passed the selected rights allowlist.';
    var counts = {};
    list.forEach(function (item) { counts[item.provider] = (counts[item.provider] || 0) + 1; });
    var breakdown = ['Wikimedia Commons', 'The Met Open Access', 'Art Institute of Chicago'].filter(function (name) {
      return counts[name];
    }).map(function (name) { return counts[name] + ' ' + name; }).join(' · ');
    return list.length + ' live result' + (list.length === 1 ? '' : 's') + ' passed the selected rights allowlist.' + (breakdown ? ' ' + breakdown + '.' : '');
  }

  function portableAsset(item) {
    if (!item || !ALLOWED_RIGHTS[item.rightsType]) return null;
    return {
      id: item.id, title: item.title, kind: item.kind, creator: item.creator, year: item.year,
      provider: item.provider, imageUrl: item.imageUrl, downloadUrl: item.downloadUrl,
      sourceUrl: item.sourceUrl, license: item.license, licenseUrl: item.licenseUrl || '',
      rightsType: item.rightsType, rightsShort: item.rightsShort, rightsNote: item.rightsNote,
      description: item.description, accent: item.accent || ['#dce8e2', '#466b60'],
      live: item.live === true, rightsMetadataSource: item.rightsMetadataSource || ''
    };
  }

  function normalizedPreparation(value) {
    var prep = value && typeof value === 'object' ? value : {};
    var mode = prep.mode === 'crop' || prep.mode === 'tile' ? prep.mode : 'fit';
    var zoom = Number(prep.zoom);
    var x = Number(prep.x);
    var y = Number(prep.y);
    var tile = Number(prep.tile);
    return {
      mode: mode,
      zoom: Math.max(100, Math.min(220, isFinite(zoom) ? zoom : 100)),
      x: Math.max(0, Math.min(100, isFinite(x) ? x : 50)),
      y: Math.max(0, Math.min(100, isFinite(y) ? y : 50)),
      tile: Math.max(60, Math.min(360, isFinite(tile) ? tile : 180))
    };
  }

  function buildPageDesignerArtwork(item, preparation, dataUrl) {
    if (!item || !ALLOWED_RIGHTS[item.rightsType] || !/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(String(dataUrl || ''))) return null;
    var prep = normalizedPreparation(preparation);
    return {
      src: dataUrl,
      title: String(item.title || 'Sourcebook visual asset').slice(0, 120),
      altText: String(item.description || item.title || 'Sourcebook visual asset').replace(/\s+/g, ' ').trim().slice(0, 300),
      sourceTool: 'sourcebook',
      sourceTab: String(item.provider || '').slice(0, 60),
      assetId: String(item.id || '').slice(0, 100),
      provider: String(item.provider || '').slice(0, 100),
      sourceUrl: String(item.sourceUrl || '').slice(0, 2048),
      license: String(item.license || '').slice(0, 160),
      licenseUrl: String(item.licenseUrl || '').slice(0, 2048),
      rightsType: String(item.rightsType || '').slice(0, 20),
      rightsNote: String(item.rightsNote || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      attribution: attributionText(item).slice(0, 1200),
      preparation: prep,
      createdAt: Date.now()
    };
  }

  function readImageBlobAsDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      if (!blob || !/^image\/(?:png|jpe?g|webp|gif)$/i.test(String(blob.type || ''))) {
        reject(new Error('The source did not return a supported raster image.'));
        return;
      }
      if (blob.size > 14000000) {
        reject(new Error('The source image is too large to move safely into Page Designer.'));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('The source image could not be read.')); };
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.readAsDataURL(blob);
    });
  }

  function resolveFetchableImageUrl(item) {
    var initialUrl = item && String(item.imageUrl || '');
    if (!item || item.provider !== 'Wikimedia Commons') return Promise.resolve(initialUrl);
    var filename = String(item.file || '');
    if (!filename) {
      var marker = '/wiki/File:';
      var sourceUrl = String(item.sourceUrl || '');
      var markerIndex = sourceUrl.indexOf(marker);
      if (markerIndex !== -1) {
        try { filename = decodeURIComponent(sourceUrl.slice(markerIndex + marker.length)).replace(/_/g, ' '); }
        catch (_) { filename = ''; }
      }
    }
    if (!filename || typeof window.fetch !== 'function') return Promise.resolve(initialUrl);
    var params = [
      'action=query', 'format=json', 'formatversion=2', 'origin=*',
      'prop=imageinfo', 'iiprop=url', 'iiurlwidth=1400',
      'titles=' + encodeURIComponent('File:' + filename)
    ];
    return window.fetch(COMMONS_API + '?' + params.join('&'), { mode: 'cors', credentials: 'omit' })
      .then(function (response) {
        if (!response || !response.ok) return initialUrl;
        return response.json();
      }).then(function (payload) {
        var pages = payload && payload.query && Array.isArray(payload.query.pages) ? payload.query.pages : [];
        var info = pages[0] && Array.isArray(pages[0].imageinfo) ? pages[0].imageinfo[0] : null;
        return safeHttpsUrl(info && (info.thumburl || info.url)) || initialUrl;
      }).catch(function () { return initialUrl; });
  }

  function fetchImageDataUrl(item) {
    if (!item || typeof window.fetch !== 'function') return Promise.reject(new Error('This source cannot be fetched in this browser.'));
    return resolveFetchableImageUrl(item).then(function (url) {
      if (!/^https:\/\//i.test(url)) throw new Error('This source cannot be fetched in this browser.');
      return window.fetch(url, { mode: 'cors', credentials: 'omit' });
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('The source image could not be downloaded.');
      var length = Number(response.headers && response.headers.get && response.headers.get('content-length')) || 0;
      if (length > 14000000) throw new Error('The source image is too large to move safely into Page Designer.');
      return response.blob();
    }).then(readImageBlobAsDataUrl);
  }

  function renderPreparedDataUrl(dataUrl, preparation) {
    var prep = normalizedPreparation(preparation);
    if (prep.mode === 'fit') return Promise.resolve(dataUrl);
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onerror = function () { reject(new Error('The prepared image could not be decoded.')); };
      image.onload = function () {
        try {
          var size = 1200;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var context = canvas.getContext('2d');
          if (!context) throw new Error('Image preparation is unavailable in this browser.');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, size, size);
          if (prep.mode === 'tile') {
            var tileWidth = prep.tile;
            var tileHeight = Math.max(1, tileWidth * image.height / Math.max(1, image.width));
            for (var y = 0; y < size; y += tileHeight) {
              for (var x = 0; x < size; x += tileWidth) context.drawImage(image, x, y, tileWidth, tileHeight);
            }
          } else {
            var scale = Math.max(size / Math.max(1, image.width), size / Math.max(1, image.height)) * prep.zoom / 100;
            var drawWidth = image.width * scale;
            var drawHeight = image.height * scale;
            var drawX = (size - drawWidth) * prep.x / 100;
            var drawY = (size - drawHeight) * prep.y / 100;
            context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
          }
          resolve(canvas.toDataURL('image/png'));
        } catch (error) { reject(error); }
      };
      image.src = dataUrl;
    });
  }

  function mergeAssets(primary, extras) {
    var seen = {};
    return (primary || []).concat(extras || []).filter(function (item) {
      if (!item || !item.id || seen[item.id] || !ALLOWED_RIGHTS[item.rightsType]) return false;
      seen[item.id] = true;
      return true;
    });
  }

  function buildPaletteManifest(ids, preparation, title, extraAssets) {
    var selected = Array.isArray(ids) ? ids : [];
    var prep = preparation || {};
    var available = mergeAssets(MATERIALS, Array.isArray(extraAssets) ? extraAssets : []);
    return {
      schema: 'org.owlflow.sourcebook-palette',
      version: 1,
      title: String(title || 'My source palette').slice(0, 80),
      createdAt: new Date().toISOString(),
      rightsPolicy: 'allowlist:public-domain,cc0,cc-by',
      assets: available.filter(function (item) {
        return selected.indexOf(item.id) !== -1 && ALLOWED_RIGHTS[item.rightsType];
      }).map(function (item) {
        return {
          id: item.id,
          title: item.title,
          kind: item.kind,
          creator: item.creator,
          year: item.year,
          provider: item.provider,
          imageUrl: item.imageUrl,
          downloadUrl: item.downloadUrl,
          sourceUrl: item.sourceUrl,
          license: item.license,
          licenseUrl: item.licenseUrl || '',
          rightsType: item.rightsType,
          rightsNote: item.rightsNote,
          attribution: attributionText(item),
          rightsMetadataSource: item.rightsMetadataSource || 'Curated source record',
          preparation: Object.assign({ mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 }, prep[item.id] || {})
        };
      })
    };
  }

  function downloadPaletteManifest(ids, preparation, title, extraAssets) {
    var manifest = buildPaletteManifest(ids, preparation, title, extraAssets);
    if (!manifest.assets.length || typeof Blob === 'undefined' || !window.URL || !window.URL.createObjectURL) return false;
    var blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = String(manifest.title || 'sourcebook-palette').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.sourcebook.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
    return true;
  }

  function printCollection(items, preparation, title) {
    if (!items.length) return false;
    var popup = window.open('', '_blank');
    if (!popup) return false;
    try { popup.opener = null; } catch (_) {}
    var cards = items.map(function (item) {
      var prep = preparation[item.id] || { mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 };
      var visual;
      if (prep.mode === 'tile') {
        visual = '<div class="tile" style="background-image:url(&quot;' + escapeHtml(item.imageUrl) + '&quot;);background-size:' + Number(prep.tile || 180) + 'px auto"></div>';
      } else {
        visual = '<div class="image"><img src="' + escapeHtml(item.imageUrl) + '" alt="" style="object-fit:' + (prep.mode === 'crop' ? 'cover' : 'contain') + ';object-position:' + Number(prep.x || 50) + '% ' + Number(prep.y || 50) + '%;transform:scale(' + (Number(prep.zoom || 100) / 100) + ')"></div>';
      }
      return '<article>' + visual + '<h2>' + escapeHtml(item.title) + '</h2><p class="meta">' + escapeHtml(item.creator) + ' · ' + escapeHtml(item.year) + '</p><p><strong>' + escapeHtml(item.license) + '</strong> — ' + escapeHtml(item.rightsNote) + '</p><p class="url">Credit: ' + escapeHtml(attributionText(item)) + '</p></article>';
    }).join('');
    popup.document.open();
    popup.document.write('<!doctype html><html><head><title>' + escapeHtml(title || 'Sourcebook palette') + '</title><style>@page{margin:.45in}*{box-sizing:border-box}body{font:11px/1.35 system-ui,sans-serif;color:#17221d;margin:0}header{border-bottom:2px solid #17221d;margin-bottom:16px;padding-bottom:10px}h1{font:700 28px Georgia,serif;margin:0}header p{margin:4px 0 0;color:#52635b}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}article{break-inside:avoid;border:1px solid #b8c4bd;padding:10px;background:white}.image,.tile{height:260px;overflow:hidden;background:#eef1ed}.image img{width:100%;height:100%;display:block}.tile{background-repeat:repeat}h2{font:700 17px Georgia,serif;margin:9px 0 2px}.meta{color:#52635b;margin:0 0 7px}p{margin:4px 0}.url{font-size:9px;overflow-wrap:anywhere;border-top:1px solid #d9dfdb;padding-top:6px}.notice{font-size:9px;margin-top:18px;color:#52635b}@media print{.screen{display:none}}</style></head><body><header><h1>' + escapeHtml(title || 'Sourcebook palette') + '</h1><p>Prepared visual assets with source and reuse notes</p></header><main class="grid">' + cards + '</main><p class="notice">Every item in this sheet passed Sourcebook’s strict Public Domain, CC0, or CC BY allowlist. Rights metadata and attribution are reproduced from linked item records; verify the source record for your intended use.</p><script>window.addEventListener("load",function(){setTimeout(function(){window.print()},350)})<\/script></body></html>');
    popup.document.close();
    return true;
  }

  window.SourcebookProviders = {
    version: 6,
    providers: PROVIDERS,
    materials: MATERIALS.slice(),
    searchCurated: searchMaterials,
    searchOpen: searchOpenSources,
    searchCommons: searchCommonsLive,
    searchMet: searchMetLive,
    searchAic: searchAicLive,
    normalizeCommonsRights: normalizeCommonsRights,
    normalizeCommonsPage: commonsItemFromPage,
    normalizeMetObject: metItemFromObject,
    normalizeAicArtwork: aicItemFromArtwork,
    normalizeCmaArtwork: cmaItemFromArtwork,
    allowsRightsScope: allowedByRightsScope,
    buildAttribution: attributionText,
    buildPalette: buildPaletteManifest,
    buildPageDesignerArtwork: buildPageDesignerArtwork,
    resolveFetchableImageUrl: resolveFetchableImageUrl,
    fetchImageDataUrl: fetchImageDataUrl,
    renderPreparedDataUrl: renderPreparedDataUrl
  };

  window.StemLab.registerTool('sourcebook', {
    icon: '▧',
    label: 'Sourcebook',
    desc: 'Find open textures and visual assets for educational materials or artwork, with source and reuse information.',
    color: 'teal',
    category: 'creative',
    aliases: ['textures', 'visual assets', 'open images', 'maps', 'blueprints', 'archival materials'],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var rootState = (ctx.toolData && ctx.toolData.sourcebook) || {};
      var storedQuery = rootState.query || '';
      var collection = Array.isArray(rootState.collection) ? rootState.collection : [];
      var savedAssets = rootState.savedAssets && typeof rootState.savedAssets === 'object' ? rootState.savedAssets : {};
      var preparation = rootState.preparation || {};
      var storedKind = rootState.kind || 'All';
      var storedProvider = rootState.provider || 'All';
      var storedRightsScope = RIGHTS_SCOPES[rootState.rightsScope] ? rootState.rightsScope : 'pd';
      var storedTitle = rootState.paletteTitle || 'My source palette';
      var _draftState = React.useState(storedQuery);
      var draft = _draftState[0];
      var setDraft = _draftState[1];
      var _queryState = React.useState(storedQuery);
      var query = _queryState[0];
      var setQuery = _queryState[1];
      var _kindState = React.useState(storedKind);
      var kind = _kindState[0];
      var setKind = _kindState[1];
      var _providerState = React.useState(storedProvider);
      var provider = _providerState[0];
      var setProvider = _providerState[1];
      var _rightsScopeState = React.useState(storedRightsScope);
      var rightsScope = _rightsScopeState[0];
      var setRightsScope = _rightsScopeState[1];
      var _activeState = React.useState(rootState.activeId || MATERIALS[0].id);
      var activeId = _activeState[0];
      var setActiveId = _activeState[1];
      var _collectionView = React.useState(false);
      var showingCollection = _collectionView[0];
      var setShowingCollection = _collectionView[1];
      var _liveResultsState = React.useState([]);
      var liveResults = _liveResultsState[0];
      var setLiveResults = _liveResultsState[1];
      var _liveStatusState = React.useState('idle');
      var liveStatus = _liveStatusState[0];
      var setLiveStatus = _liveStatusState[1];
      var _liveMessageState = React.useState('');
      var liveMessage = _liveMessageState[0];
      var setLiveMessage = _liveMessageState[1];
      var _handoffState = React.useState('');
      var handoffId = _handoffState[0];
      var setHandoffId = _handoffState[1];
      var liveRequestRef = React.useRef(0);

      function patch(next) {
        if (typeof ctx.updateMulti === 'function') ctx.updateMulti('sourcebook', next);
        else if (typeof ctx.update === 'function') Object.keys(next).forEach(function (key) { ctx.update('sourcebook', key, next[key]); });
      }

      function announce(message) {
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
      }

      function toast(message, type) {
        if (typeof ctx.addToast === 'function') ctx.addToast(message, type || 'info');
      }

      function copyText(value) {
        var text = String(value || '');
        if (window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function') {
          return window.navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
        }
        try {
          var field = document.createElement('textarea');
          field.value = text;
          field.setAttribute('readonly', 'readonly');
          field.style.position = 'fixed';
          field.style.opacity = '0';
          document.body.appendChild(field);
          field.select();
          var copied = document.execCommand('copy');
          document.body.removeChild(field);
          return Promise.resolve(!!copied);
        } catch (_) {
          return Promise.resolve(false);
        }
      }

      function runLiveSearch(value, requestedKind) {
        var next = String(value || '').trim();
        var requestId = ++liveRequestRef.current;
        if (!next) {
          setLiveResults([]);
          setLiveStatus('idle');
          setLiveMessage('');
          return;
        }
        if (!providerSupportsLiveSearch(provider)) {
          setLiveResults([]);
          setLiveStatus('ready');
          setLiveMessage(curatedProviderMessage(provider));
          announce(searchMaterials(next, requestedKind || kind, provider, rightsScope).length + ' verified curated Sourcebook results for ' + next);
          return;
        }
        setLiveStatus('loading');
        setLiveMessage('Checking item-level public-domain metadata...');
        searchOpenSources(next, { kind: requestedKind || kind, provider: provider, rightsScope: rightsScope, limit: 18 }).then(function (items) {
          if (requestId !== liveRequestRef.current) return;
          setLiveResults(items);
          setLiveStatus('ready');
          setLiveMessage(liveResultSummary(items));
          var curatedCount = searchMaterials(next, requestedKind || kind, provider, rightsScope).length;
          announce((curatedCount + items.length) + ' Sourcebook results with verified reuse rights for ' + next);
        }).catch(function () {
          if (requestId !== liveRequestRef.current) return;
          setLiveResults([]);
          setLiveStatus('error');
          setLiveMessage('Live search is unavailable. The curated shelf is still ready to use.');
          announce('Live search unavailable. Showing curated Sourcebook results.');
        });
      }

      function submitSearch(value) {
        var next = String(value == null ? draft : value).trim();
        setDraft(next);
        setQuery(next);
        patch({ query: next });
        var count = searchMaterials(next, kind, provider, rightsScope).length;
        announce(count + ' curated Sourcebook results for ' + (next || 'all materials'));
        runLiveSearch(next, kind);
      }

      function setFilter(filterKind, value) {
        if (filterKind === 'kind') {
          setKind(value);
          patch({ kind: value });
          if (query) runLiveSearch(query, value);
        }
        else if (filterKind === 'provider') {
          setProvider(value);
          patch({ provider: value });
          if (query) {
            if (!providerSupportsLiveSearch(value)) {
              ++liveRequestRef.current;
              setLiveResults([]);
              setLiveStatus('ready');
              setLiveMessage(curatedProviderMessage(value));
              return;
            }
            var requestId = ++liveRequestRef.current;
            setLiveStatus('loading');
            searchOpenSources(query, { kind: kind, provider: value, rightsScope: rightsScope, limit: 18 }).then(function (items) {
              if (requestId !== liveRequestRef.current) return;
              setLiveResults(items);
              setLiveStatus('ready');
              setLiveMessage(liveResultSummary(items));
            }).catch(function () {
              if (requestId !== liveRequestRef.current) return;
              setLiveResults([]); setLiveStatus('error'); setLiveMessage('This live source is unavailable. The curated shelf is still ready to use.');
            });
          }
        }
        else {
          setRightsScope(value);
          patch({ rightsScope: value });
          var filteredRightsItems = liveResults.filter(function (item) { return allowedByRightsScope(item, value); });
          setLiveResults(filteredRightsItems);
          if (query) {
            if (!providerSupportsLiveSearch(provider)) {
              ++liveRequestRef.current;
              setLiveResults([]);
              setLiveStatus('ready');
              setLiveMessage(curatedProviderMessage(provider));
              return;
            }
            var rightsRequestId = ++liveRequestRef.current;
            setLiveStatus('loading');
            searchOpenSources(query, { kind: kind, provider: provider, rightsScope: value, limit: 18 }).then(function (items) {
              if (rightsRequestId !== liveRequestRef.current) return;
              setLiveResults(items); setLiveStatus('ready');
              setLiveMessage(liveResultSummary(items));
            }).catch(function () {
              if (rightsRequestId !== liveRequestRef.current) return;
              setLiveResults([]); setLiveStatus('error'); setLiveMessage('Live search is unavailable. The curated shelf is still ready to use.');
            });
          } else {
            setLiveStatus('idle');
            setLiveMessage('');
          }
        }
      }

      function toggleSaved(item) {
        var id = item.id;
        var exists = collection.indexOf(id) !== -1;
        var next = exists ? collection.filter(function (saved) { return saved !== id; }) : collection.concat([id]);
        var nextAssets = Object.assign({}, savedAssets);
        if (exists) delete nextAssets[id];
        else if (item.live) nextAssets[id] = portableAsset(item);
        patch({ collection: next, savedAssets: nextAssets });
        toast(exists ? 'Removed from source palette.' : 'Saved to source palette.', exists ? 'info' : 'success');
        announce(exists ? 'Removed item from source palette' : 'Saved item to source palette');
      }

      function updatePrep(id, values) {
        var next = Object.assign({}, preparation);
        next[id] = Object.assign({ mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 }, next[id] || {}, values);
        patch({ preparation: next });
      }

      function sendToPageDesigner(item) {
        if (!item || !ALLOWED_RIGHTS[item.rightsType]) {
          toast('Only an asset with verified reuse rights can be sent to Page Designer.', 'error');
          return;
        }
        if (typeof ctx.onUseArtwork !== 'function') {
          toast('Page Designer handoff is not available in this version of AlloFlow.', 'info');
          return;
        }
        var prep = normalizedPreparation(preparation[item.id]);
        setHandoffId(item.id);
        announce('Preparing ' + item.title + ' for Page Designer');
        fetchImageDataUrl(item).then(function (dataUrl) {
          return renderPreparedDataUrl(dataUrl, prep);
        }).then(function (preparedDataUrl) {
          var artwork = buildPageDesignerArtwork(item, prep, preparedDataUrl);
          if (!artwork) throw new Error('The prepared asset did not pass the Sourcebook handoff checks.');
          ctx.onUseArtwork(artwork, 'page-designer');
        }).catch(function (error) {
          var message = error && error.message ? error.message : 'The source image could not be prepared.';
          toast(message + ' You can still open the image and upload it in Page Designer.', 'error');
          announce('Could not prepare the Sourcebook asset for Page Designer');
        }).then(function () { setHandoffId(''); });
      }

      var results = searchMaterials(query, kind, provider, rightsScope);
      var savedAssetList = Object.keys(savedAssets).map(function (id) { return portableAsset(savedAssets[id]); }).filter(Boolean);
      var allAssets = mergeAssets(MATERIALS, liveResults.concat(savedAssetList));
      var combinedResults = mergeAssets(results, liveResults).filter(function (item) {
        return allowedByRightsScope(item, rightsScope) && (kind === 'All' || item.kind === kind) && (provider === 'All' || item.provider === provider);
      });
      var selectedItems = collection.map(function (id) {
        return allAssets.filter(function (item) { return item.id === id; })[0] || null;
      }).filter(Boolean);
      var visible = showingCollection ? selectedItems : combinedResults;
      var publicDomainResultCount = combinedResults.filter(function (item) { return item.rightsType === 'pd'; }).length;
      var active = allAssets.filter(function (item) { return item.id === activeId; })[0] || visible[0] || MATERIALS[0];
      var activePrep = Object.assign({ mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 }, preparation[active.id] || {});
      var kinds = ['All', 'Maps', 'Textures', 'Patterns', 'Blueprints', 'Science', 'Botanical', 'Archival', 'Visual assets'];
      var providers = ['All', 'Wikimedia Commons', 'The Met Open Access', 'Art Institute of Chicago', 'Cleveland Museum of Art'];

      function controlButton(label, selected, onClick, extra) {
        return h('button', Object.assign({
          type: 'button', onClick: onClick,
          className: 'px-3 py-2 rounded-full text-xs font-black border transition-colors ' + (selected ? 'bg-[#183b32] text-white border-[#183b32]' : 'bg-white text-[#38564d] border-[#a9bdb5] hover:border-[#315f52]')
        }, extra || {}), label);
      }

      function preview(item, prep, height) {
        var isTile = prep && prep.mode === 'tile';
        var fallback = 'linear-gradient(145deg,' + item.accent[0] + ',' + item.accent[1] + ')';
        return h('div', {
          className: 'relative overflow-hidden bg-[#e8ece7]',
          style: {
            height: height || 250,
            background: isTile ? fallback : fallback,
            backgroundImage: isTile ? 'url("' + item.imageUrl + '"), ' + fallback : fallback,
            backgroundRepeat: isTile ? 'repeat' : 'no-repeat',
            backgroundSize: isTile ? Number(prep.tile || 180) + 'px auto' : 'cover'
          }
        }, !isTile && h('img', {
          src: item.imageUrl, alt: '', loading: 'lazy',
          onError: function (event) { event.currentTarget.style.display = 'none'; },
          style: {
            width: '100%', height: '100%', display: 'block',
            objectFit: prep && prep.mode === 'crop' ? 'cover' : 'contain',
            objectPosition: Number((prep && prep.x) || 50) + '% ' + Number((prep && prep.y) || 50) + '%',
            transform: 'scale(' + (Number((prep && prep.zoom) || 100) / 100) + ')',
            transformOrigin: Number((prep && prep.x) || 50) + '% ' + Number((prep && prep.y) || 50) + '%'
          }
        }), h('span', {
          'aria-hidden': 'true', className: 'absolute left-3 bottom-2 text-[10px] font-black uppercase tracking-[.16em] px-2 py-1 rounded-full bg-white/90 text-[#29483f] shadow-sm'
        }, item.kind));
      }

      function resultCard(item) {
        var saved = collection.indexOf(item.id) !== -1;
        return h('article', {
          key: item.id,
          className: 'group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ' + (active.id === item.id ? 'border-[#2f6b59] ring-2 ring-[#aad3c5]' : 'border-[#cad6d0]')
        }, h('button', {
          type: 'button', onClick: function () { setActiveId(item.id); patch({ activeId: item.id }); },
          className: 'block w-full text-left', 'aria-label': 'Inspect ' + item.title
        }, preview(item, { mode: 'fit', zoom: 100, x: 50, y: 50 }, item.kind === 'Archival' || item.kind === 'Botanical' ? 280 : 210),
        h('div', { className: 'p-4' },
          h('div', { className: 'flex items-start gap-3' },
            h('div', { className: 'min-w-0 flex-1' },
              h('h3', { className: 'font-black text-[#18352d] leading-tight' }, item.title),
              h('p', { className: 'mt-1 text-[11px] text-[#5c6e67]' }, item.creator + ' · ' + item.year)
            ),
            h('span', { className: 'shrink-0 rounded-full px-2 py-1 text-[10px] font-black bg-emerald-100 text-emerald-900' }, '✓ ' + item.rightsShort)
          ),
          item.live && h('p', { className: 'mt-2 text-[10px] font-black uppercase tracking-[.12em] text-[#2f6b59]' }, 'Live result · rights metadata checked'),
          h('p', { className: 'mt-3 text-xs leading-relaxed text-[#40564e]' }, item.description)
        )),
        h('div', { className: 'flex gap-2 px-4 pb-4' },
          h('button', {
            type: 'button', onClick: function () { toggleSaved(item); },
            'aria-pressed': saved,
            className: 'flex-1 min-h-[42px] rounded-xl text-xs font-black border ' + (saved ? 'bg-[#183b32] text-white border-[#183b32]' : 'bg-[#eef5f1] text-[#244c40] border-[#b6cec4] hover:bg-[#e2eee9]')
          }, saved ? '✓ Saved' : '+ Save to palette'),
          h('a', {
            href: item.sourceUrl, target: '_blank', rel: 'noopener noreferrer',
            className: 'min-h-[42px] px-3 inline-flex items-center rounded-xl border border-[#b6c5bf] text-xs font-black text-[#38564d] hover:bg-[#f2f5f3]',
            'aria-label': 'Open source record for ' + item.title
          }, 'Source ↗')
        ));
      }

      function detailPanel(item) {
        var saved = collection.indexOf(item.id) !== -1;
        return h('aside', { className: 'lg:sticky lg:top-0 self-start rounded-3xl border border-[#a9beb5] bg-[#f5f1e8] overflow-hidden shadow-[0_18px_50px_rgba(37,63,54,.12)]' },
          preview(item, activePrep, 260),
          h('div', { className: 'p-5 space-y-4' },
            h('div', null,
              h('p', { className: 'text-[10px] uppercase tracking-[.2em] font-black text-[#6d806f]' }, item.provider + ' · ' + item.kind),
              h('h2', { className: 'font-serif text-2xl font-black text-[#19372e] mt-1 leading-tight' }, item.title),
              h('p', { className: 'text-xs text-[#596b63] mt-2' }, item.creator + ' · ' + item.year)
            ),
            h('section', { className: 'rounded-2xl bg-white border border-[#c8d4ce] p-4', 'aria-labelledby': 'sourcebook-rights-title' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { 'aria-hidden': 'true', className: 'w-2.5 h-2.5 rounded-full bg-emerald-600' }),
                h('h3', { id: 'sourcebook-rights-title', className: 'font-black text-sm text-[#243e35]' }, item.license)
              ),
              h('p', { className: 'mt-2 text-[11px] leading-relaxed text-[#4f625b]' }, item.rightsNote),
              item.licenseUrl && h('a', { href: item.licenseUrl, target: '_blank', rel: 'noopener noreferrer', className: 'inline-block mt-2 mr-3 text-xs font-black text-[#1e6a55] underline underline-offset-2' }, 'License terms ↗'),
              h('a', { href: item.sourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'inline-block mt-2 text-xs font-black text-[#1e6a55] underline underline-offset-2' }, 'Verify on source record ↗')
            ),
            h('section', { className: 'space-y-3', 'aria-labelledby': 'sourcebook-prepare-title' },
              h('div', { className: 'flex items-center justify-between' },
                h('h3', { id: 'sourcebook-prepare-title', className: 'font-black text-sm text-[#243e35]' }, 'Prepare for use'),
                h('span', { className: 'text-[10px] text-[#65756e]' }, 'Saved per item')
              ),
              h('div', { className: 'flex gap-2 flex-wrap' },
                controlButton('Fit', activePrep.mode === 'fit', function () { updatePrep(item.id, { mode: 'fit' }); }),
                controlButton('Crop', activePrep.mode === 'crop', function () { updatePrep(item.id, { mode: 'crop' }); }),
                controlButton('Repeat / tile', activePrep.mode === 'tile', function () { updatePrep(item.id, { mode: 'tile' }); })
              ),
              activePrep.mode !== 'tile' && h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                h('label', { className: 'text-[11px] font-bold text-[#445950]' }, 'Zoom ' + activePrep.zoom + '%',
                  h('input', { type: 'range', min: 100, max: 220, step: 5, value: activePrep.zoom, onChange: function (event) { updatePrep(item.id, { zoom: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Image zoom' })
                ),
                h('label', { className: 'text-[11px] font-bold text-[#445950]' }, 'Horizontal ' + activePrep.x + '%',
                  h('input', { type: 'range', min: 0, max: 100, step: 5, value: activePrep.x, onChange: function (event) { updatePrep(item.id, { x: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Horizontal crop focus' })
                ),
                h('label', { className: 'text-[11px] font-bold text-[#445950]' }, 'Vertical ' + activePrep.y + '%',
                  h('input', { type: 'range', min: 0, max: 100, step: 5, value: activePrep.y, onChange: function (event) { updatePrep(item.id, { y: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Vertical crop focus' })
                )
              ),
              activePrep.mode === 'tile' && h('label', { className: 'block text-[11px] font-bold text-[#445950]' }, 'Tile size ' + activePrep.tile + ' px',
                h('input', { type: 'range', min: 60, max: 360, step: 10, value: activePrep.tile, onChange: function (event) { updatePrep(item.id, { tile: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Repeated tile size' })
              )
            ),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              h('button', {
                type: 'button', onClick: function () { sendToPageDesigner(item); }, disabled: handoffId === item.id,
                className: 'col-span-2 min-h-[46px] rounded-xl bg-[#315f86] text-white font-black text-xs shadow-sm hover:bg-[#254b6b] disabled:opacity-60 disabled:cursor-wait',
                title: 'Insert this prepared asset into a new Page Designer document with its source and rights information'
              }, handoffId === item.id ? 'Preparing image...' : 'Open in Page Designer'),
              h('button', { type: 'button', onClick: function () { toggleSaved(item); }, className: 'min-h-[44px] rounded-xl font-black text-xs ' + (saved ? 'bg-[#183b32] text-white' : 'bg-[#d9e9e2] text-[#20483c]') }, saved ? '✓ In palette' : '+ Save'),
              h('button', { type: 'button', onClick: function () {
                copyText(attributionText(item)).then(function (copied) { toast(copied ? 'Attribution copied.' : 'Attribution could not be copied in this browser.', copied ? 'success' : 'error'); });
              }, className: 'min-h-[44px] rounded-xl bg-white border border-[#a9bbb3] font-black text-xs text-[#294d42]' }, 'Copy credit'),
              h('a', { href: item.downloadUrl, target: '_blank', rel: 'noopener noreferrer', className: 'col-span-2 min-h-[44px] inline-flex justify-center items-center rounded-xl bg-white border border-[#a9bbb3] font-black text-xs text-[#294d42]' }, 'Open printable image ↗')
            )
          )
        );
      }

      return h('div', { className: 'sourcebook-tool min-h-full text-[#1c342c]', 'data-sourcebook': 'true' },
        h('style', null, '.sourcebook-tool{--sb-ink:#18352d;--sb-paper:#f7f3e9}.sourcebook-tool input[type=range]{min-height:28px}@media(max-width:700px){.sourcebook-tool .sb-board{grid-template-columns:1fr!important}}@media print{.sourcebook-tool .sb-no-print{display:none!important}}'),
        h('header', { className: 'relative overflow-hidden rounded-3xl border border-[#a9c2b8] bg-[#e8efe9] p-5 md:p-7 mb-5' },
          h('div', { 'aria-hidden': 'true', className: 'absolute -right-12 -top-16 w-64 h-64 rounded-full border-[36px] border-[#c8ddd4] opacity-70' }),
          h('div', { 'aria-hidden': 'true', className: 'absolute right-12 bottom-0 text-[110px] leading-none font-serif text-[#d1e1da] select-none' }, 'S'),
          h('div', { className: 'relative max-w-3xl' },
            h('p', { className: 'text-[10px] uppercase tracking-[.28em] font-black text-[#507064]' }, 'Public-domain visual materials · source-first'),
            h('div', { className: 'flex items-center gap-3 mt-1' },
              h('span', { 'aria-hidden': 'true', className: 'w-11 h-11 rounded-2xl bg-[#183b32] text-[#f7f2e7] inline-flex items-center justify-center text-2xl font-serif shadow-lg' }, 'S'),
              h('div', null,
                h('h1', { className: 'font-serif text-3xl md:text-4xl font-black tracking-tight text-[#17372e]' }, 'Sourcebook'),
                h('p', { className: 'mt-1 text-sm text-[#426157]' }, 'Find public-domain textures and visual assets for educational materials or artwork—then save, prepare, and print them with their source trail intact.'),
                h('p', { className: 'mt-1 text-[11px] font-bold text-[#557168]' }, 'Public Domain is shown by default. CC0 and CC BY are optional, clearly labeled expansions.')
              )
            )
          )
        ),
        h('form', { className: 'sb-no-print rounded-2xl border border-[#adbbb5] bg-white p-3 shadow-sm mb-4', onSubmit: function (event) { event.preventDefault(); submitSearch(); } },
          h('label', { htmlFor: 'sourcebook-search', className: 'sr-only' }, 'Describe the visual material you need'),
          h('div', { className: 'flex flex-col sm:flex-row gap-2' },
            h('div', { className: 'relative flex-1' },
              h('span', { 'aria-hidden': 'true', className: 'absolute left-4 top-1/2 -translate-y-1/2 text-[#648075]' }, '⌕'),
              h('input', { id: 'sourcebook-search', type: 'search', value: draft, onChange: function (event) { setDraft(event.target.value); }, placeholder: 'Try “faded contour lines and technical diagrams”…', className: 'w-full min-h-[48px] rounded-xl border border-[#a9bbb4] bg-[#fbfcfa] pl-11 pr-4 text-sm text-[#203b32] placeholder:text-[#71857d] focus:outline-none focus:ring-2 focus:ring-[#6fae98]' })
            ),
            h('button', { type: 'submit', className: 'min-h-[48px] px-6 rounded-xl bg-[#183b32] text-white text-sm font-black shadow-md hover:bg-[#245447]' }, 'Find sources')
          ),
          h('div', { className: 'flex gap-2 flex-wrap mt-3', 'aria-label': 'Example searches' }, STARTERS.map(function (starter) {
            return h('button', { key: starter, type: 'button', onClick: function () { submitSearch(starter); }, className: 'px-3 py-1.5 rounded-full border border-[#c2d0ca] bg-[#f4f7f5] text-[10px] font-bold text-[#456057] hover:bg-[#e7efeb]' }, starter);
          }))
        ),
        query && liveStatus !== 'idle' && h('div', {
          className: 'sb-no-print mb-4 rounded-xl border px-3 py-2 text-xs font-bold ' + (liveStatus === 'error' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'),
          role: 'status', 'aria-live': 'polite', 'data-sourcebook-live-status': liveStatus
        }, liveStatus === 'loading' ? 'Searching public-domain collections and checking item-level rights metadata…' : liveMessage),
        h('div', { className: 'sb-no-print space-y-3 mb-5' },
          h('div', { className: 'flex gap-2 flex-wrap', 'aria-label': 'Material type filters' }, kinds.map(function (value) { return controlButton(value, kind === value, function () { setFilter('kind', value); }); })),
          h('div', { className: 'flex flex-col md:flex-row md:items-center gap-3' },
            h('div', { className: 'flex gap-2 flex-wrap flex-1 items-center', 'aria-label': 'Reuse rights filters' },
              h('span', { className: 'text-xs font-black text-[#4d645b] mr-1' }, 'Reuse rights'),
              controlButton('Public domain only', rightsScope === 'pd', function () { setFilter('rights', 'pd'); }),
              controlButton('Add CC0', rightsScope === 'pd-cc0', function () { setFilter('rights', 'pd-cc0'); }),
              controlButton('Add CC BY', rightsScope === 'all', function () { setFilter('rights', 'all'); })
            ),
            h('label', { className: 'text-xs font-black text-[#4d645b]' }, 'Source ',
              h('select', { value: provider, onChange: function (event) { setFilter('provider', event.target.value); }, className: 'ml-1 min-h-[40px] rounded-xl border border-[#a9bbb4] bg-white px-3 text-xs font-bold' }, providers.map(function (value) { return h('option', { key: value, value: value }, value); }))
            )
          )
        ),
        h('div', { className: 'grid lg:grid-cols-[minmax(0,1fr)_350px] gap-5 items-start' },
          h('main', null,
            h('div', { className: 'flex flex-wrap items-end justify-between gap-3 mb-3' },
              h('div', null,
                h('p', { className: 'text-[10px] uppercase tracking-[.18em] font-black text-[#62766e]' }, showingCollection ? 'Saved working set' : 'Curated source index'),
                h('h2', { className: 'font-serif text-2xl font-black text-[#18352d]' }, showingCollection ? storedTitle : (query ? visible.length + ' matches for “' + query + '”' : 'Browse the starting shelf')),
                !showingCollection && h('p', { className: 'mt-1 text-[11px] font-bold text-[#597067]' }, publicDomainResultCount + ' public-domain result' + (publicDomainResultCount === 1 ? '' : 's') + ' shown')
              ),
              h('div', { className: 'sb-no-print flex gap-2' },
                controlButton('Results (' + combinedResults.length + ')', !showingCollection, function () { setShowingCollection(false); }),
                controlButton('Palette (' + collection.length + ')', showingCollection, function () { setShowingCollection(true); })
              )
            ),
            showingCollection && h('div', { className: 'sb-no-print flex gap-2 mb-3' },
              h('label', { className: 'sr-only', htmlFor: 'sourcebook-palette-title' }, 'Palette title'),
              h('input', { id: 'sourcebook-palette-title', value: storedTitle, onChange: function (event) { patch({ paletteTitle: event.target.value.slice(0, 80) }); }, className: 'flex-1 min-h-[42px] rounded-xl border border-[#afc0b8] px-3 text-sm font-bold', placeholder: 'Palette title' }),
              h('button', { type: 'button', disabled: !selectedItems.length, onClick: function () { if (!downloadPaletteManifest(collection, preparation, storedTitle, selectedItems)) toast('The palette manifest could not be downloaded in this browser.', 'error'); }, className: 'min-h-[42px] px-4 rounded-xl border border-[#507268] bg-white text-[#244c40] text-xs font-black disabled:opacity-40', title: 'Portable manifest for future Page Designer import' }, 'Export .json'),
              h('button', { type: 'button', disabled: !selectedItems.length, onClick: function () { if (!printCollection(selectedItems, preparation, storedTitle)) toast('Allow pop-ups to open the print sheet.', 'error'); }, className: 'min-h-[42px] px-4 rounded-xl bg-[#b84d37] text-white text-xs font-black disabled:opacity-40' }, 'Print palette')
            ),
            visible.length ? h('div', { className: 'sb-board grid md:grid-cols-2 gap-4 items-start' }, visible.map(resultCard)) : h('div', { className: 'rounded-3xl border-2 border-dashed border-[#b7c7c0] bg-[#f5f7f4] p-10 text-center' },
              h('div', { 'aria-hidden': 'true', className: 'text-4xl' }, '⌕'),
              h('h3', { className: 'font-serif text-xl font-black mt-2' }, showingCollection ? 'Your palette is ready for its first source' : 'No close match on this shelf'),
              h('p', { className: 'text-xs text-[#5f7169] mt-2 max-w-md mx-auto' }, showingCollection ? 'Save a result to build a printable working set.' : 'Try fewer descriptive words, clear a filter, or continue the same search at an open-source provider below.')
            ),
            h('section', { className: 'sb-no-print mt-6 rounded-3xl bg-[#1d3a32] text-[#edf5f1] p-5', 'aria-labelledby': 'sourcebook-more-title' },
              h('div', { className: 'flex items-start justify-between gap-3' },
                h('div', null,
                  h('p', { className: 'text-[10px] uppercase tracking-[.2em] font-black text-[#a9c8bd]' }, 'Provider architecture'),
                  h('h2', { id: 'sourcebook-more-title', className: 'font-serif text-xl font-black' }, 'Continue at the collection')
                ),
                h('span', { className: 'text-[10px] rounded-full bg-[#315248] px-3 py-1' }, 'No API key required')
              ),
              h('p', { className: 'mt-2 text-xs leading-relaxed text-[#cadbd5]' }, 'Sourcebook’s built-in shelf works offline once loaded. Provider links are optional handoffs and may show items that have not passed Sourcebook’s allowlist; only results shown on the Sourcebook board are admitted.'),
              h('div', { className: 'grid sm:grid-cols-2 gap-2 mt-4' }, PROVIDERS.map(function (source) {
                return h('a', { key: source.id, href: source.search(query || draft), target: '_blank', rel: 'noopener noreferrer', className: 'rounded-2xl border border-[#527067] bg-[#27473e] p-3 hover:bg-[#31564b]' },
                  h('div', { className: 'flex items-center gap-3' },
                    h('span', { 'aria-hidden': 'true', className: 'w-9 h-9 rounded-xl bg-[#e5eee9] text-[#1e493d] inline-flex items-center justify-center text-[10px] font-black' }, source.mark),
                    h('div', null, h('p', { className: 'text-xs font-black' }, source.name + ' ↗'), h('p', { className: 'text-[10px] text-[#b8cec6] mt-0.5' }, source.note))
                  )
                );
              }))
            )
          ),
          detailPanel(active)
        ),
        h('footer', { className: 'mt-5 p-4 rounded-2xl border border-[#d2d9d5] bg-[#faf8f2] text-[10px] leading-relaxed text-[#5d6d66]' },
          h('strong', { className: 'text-[#334a41]' }, 'Rights allowlist: '),
          'Public Domain is the default. You may deliberately add exact CC0 or CC BY records; CC BY items retain a required attribution line. Unknown, restricted, “no known restrictions,” noncommercial, share-alike, and incompatible licenses are excluded. Always verify the linked item record for the use you intend.'
        )
      );
    }
  });
})();
