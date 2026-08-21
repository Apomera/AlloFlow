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
    }
  ];

  var PROVIDERS = [
    {
      id: 'commons', name: 'Wikimedia Commons', mark: 'W', note: 'File-level reuse terms',
      search: function (q) { return 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(q || 'public domain texture') + '&title=Special:MediaSearch&type=image'; }
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
    'aged paper and archival typography'
  ];

  var EXPANSIONS = {
    classroom: ['education', 'diagram', 'map'], handout: ['education', 'background', 'paper'],
    worksheet: ['education', 'diagram', 'background'], vintage: ['historic', 'archive', 'archival', 'paper'],
    old: ['historic', 'archive', 'vintage'], natural: ['wood', 'botanical', 'terrain'],
    lines: ['line', 'diagram', 'contour', 'technical'], technical: ['blueprint', 'plan', 'diagram', 'engineering'],
    brainwaves: ['brainwave', 'eeg', 'waveform'], maps: ['map', 'topographic', 'contour'],
    texture: ['texture', 'grain', 'paper', 'background'], textures: ['texture', 'grain', 'paper', 'background'],
    science: ['science', 'diagram', 'biology', 'neuroscience'], archive: ['archival', 'historic', 'vintage']
  };

  // Defensive eligibility check: future catalog additions do not render unless
  // their license class is explicitly approved here.
  var ALLOWED_RIGHTS = { pd: true, cc0: true, ccby: true };

  function normalizeWords(value) {
    return String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (word) { return word.length > 1; });
  }

  function searchMaterials(query, kind, provider) {
    var words = normalizeWords(query);
    var expanded = words.slice();
    words.forEach(function (word) {
      (EXPANSIONS[word] || []).forEach(function (extra) { if (expanded.indexOf(extra) === -1) expanded.push(extra); });
    });
    return MATERIALS.map(function (item, index) {
      if (!ALLOWED_RIGHTS[item.rightsType]) return null;
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

  function buildPaletteManifest(ids, preparation, title) {
    var selected = Array.isArray(ids) ? ids : [];
    var prep = preparation || {};
    return {
      schema: 'org.owlflow.sourcebook-palette',
      version: 1,
      title: String(title || 'My source palette').slice(0, 80),
      createdAt: new Date().toISOString(),
      rightsPolicy: 'allowlist:public-domain,cc0,cc-by',
      assets: MATERIALS.filter(function (item) {
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
          rightsType: item.rightsType,
          rightsNote: item.rightsNote,
          preparation: Object.assign({ mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 }, prep[item.id] || {})
        };
      })
    };
  }

  function downloadPaletteManifest(ids, preparation, title) {
    var manifest = buildPaletteManifest(ids, preparation, title);
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
      return '<article>' + visual + '<h2>' + escapeHtml(item.title) + '</h2><p class="meta">' + escapeHtml(item.creator) + ' · ' + escapeHtml(item.year) + '</p><p><strong>' + escapeHtml(item.license) + '</strong> — ' + escapeHtml(item.rightsNote) + '</p><p class="url">Source: ' + escapeHtml(item.sourceUrl) + '</p></article>';
    }).join('');
    popup.document.open();
    popup.document.write('<!doctype html><html><head><title>' + escapeHtml(title || 'Sourcebook palette') + '</title><style>@page{margin:.45in}*{box-sizing:border-box}body{font:11px/1.35 system-ui,sans-serif;color:#17221d;margin:0}header{border-bottom:2px solid #17221d;margin-bottom:16px;padding-bottom:10px}h1{font:700 28px Georgia,serif;margin:0}header p{margin:4px 0 0;color:#52635b}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}article{break-inside:avoid;border:1px solid #b8c4bd;padding:10px;background:white}.image,.tile{height:260px;overflow:hidden;background:#eef1ed}.image img{width:100%;height:100%;display:block}.tile{background-repeat:repeat}h2{font:700 17px Georgia,serif;margin:9px 0 2px}.meta{color:#52635b;margin:0 0 7px}p{margin:4px 0}.url{font-size:9px;overflow-wrap:anywhere;border-top:1px solid #d9dfdb;padding-top:6px}.notice{font-size:9px;margin-top:18px;color:#52635b}@media print{.screen{display:none}}</style></head><body><header><h1>' + escapeHtml(title || 'Sourcebook palette') + '</h1><p>Prepared visual assets with source and reuse notes</p></header><main class="grid">' + cards + '</main><p class="notice">Every item in this sheet passed Sourcebook’s Public Domain / CC0 allowlist. Rights statements are reproduced from the linked item records; verify the source record for your intended use.</p><script>window.addEventListener("load",function(){setTimeout(function(){window.print()},350)})<\/script></body></html>');
    popup.document.close();
    return true;
  }

  window.SourcebookProviders = {
    version: 1,
    providers: PROVIDERS,
    materials: MATERIALS.slice(),
    searchCurated: searchMaterials,
    buildPalette: buildPaletteManifest
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
      var preparation = rootState.preparation || {};
      var storedKind = rootState.kind || 'All';
      var storedProvider = rootState.provider || 'All';
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
      var _activeState = React.useState(rootState.activeId || MATERIALS[0].id);
      var activeId = _activeState[0];
      var setActiveId = _activeState[1];
      var _collectionView = React.useState(false);
      var showingCollection = _collectionView[0];
      var setShowingCollection = _collectionView[1];

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

      function submitSearch(value) {
        var next = String(value == null ? draft : value).trim();
        setDraft(next);
        setQuery(next);
        patch({ query: next });
        var count = searchMaterials(next, kind, provider).length;
        announce(count + ' Sourcebook results for ' + (next || 'all materials'));
      }

      function setFilter(filterKind, value) {
        if (filterKind === 'kind') { setKind(value); patch({ kind: value }); }
        else { setProvider(value); patch({ provider: value }); }
      }

      function toggleSaved(id) {
        var exists = collection.indexOf(id) !== -1;
        var next = exists ? collection.filter(function (saved) { return saved !== id; }) : collection.concat([id]);
        patch({ collection: next });
        toast(exists ? 'Removed from source palette.' : 'Saved to source palette.', exists ? 'info' : 'success');
        announce(exists ? 'Removed item from source palette' : 'Saved item to source palette');
      }

      function updatePrep(id, values) {
        var next = Object.assign({}, preparation);
        next[id] = Object.assign({ mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 }, next[id] || {}, values);
        patch({ preparation: next });
      }

      var results = searchMaterials(query, kind, provider);
      var visible = showingCollection ? MATERIALS.filter(function (item) { return collection.indexOf(item.id) !== -1; }) : results;
      var active = MATERIALS.filter(function (item) { return item.id === activeId; })[0] || visible[0] || MATERIALS[0];
      var activePrep = Object.assign({ mode: 'fit', zoom: 100, x: 50, y: 50, tile: 180 }, preparation[active.id] || {});
      var kinds = ['All', 'Maps', 'Textures', 'Blueprints', 'Science', 'Botanical', 'Archival'];
      var providers = ['All', 'Wikimedia Commons'];
      var selectedItems = MATERIALS.filter(function (item) { return collection.indexOf(item.id) !== -1; });

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
          h('p', { className: 'mt-3 text-xs leading-relaxed text-[#40564e]' }, item.description)
        )),
        h('div', { className: 'flex gap-2 px-4 pb-4' },
          h('button', {
            type: 'button', onClick: function () { toggleSaved(item.id); },
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
              activePrep.mode !== 'tile' && h('div', { className: 'grid grid-cols-2 gap-3' },
                h('label', { className: 'text-[11px] font-bold text-[#445950]' }, 'Zoom ' + activePrep.zoom + '%',
                  h('input', { type: 'range', min: 100, max: 220, step: 5, value: activePrep.zoom, onChange: function (event) { updatePrep(item.id, { zoom: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Image zoom' })
                ),
                h('label', { className: 'text-[11px] font-bold text-[#445950]' }, 'Focus ' + activePrep.x + '%',
                  h('input', { type: 'range', min: 0, max: 100, step: 5, value: activePrep.x, onChange: function (event) { updatePrep(item.id, { x: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Horizontal crop focus' })
                )
              ),
              activePrep.mode === 'tile' && h('label', { className: 'block text-[11px] font-bold text-[#445950]' }, 'Tile size ' + activePrep.tile + ' px',
                h('input', { type: 'range', min: 60, max: 360, step: 10, value: activePrep.tile, onChange: function (event) { updatePrep(item.id, { tile: Number(event.target.value) }); }, className: 'block w-full accent-[#276b57]', 'aria-label': 'Repeated tile size' })
              )
            ),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              h('button', { type: 'button', onClick: function () { toggleSaved(item.id); }, className: 'min-h-[44px] rounded-xl font-black text-xs ' + (saved ? 'bg-[#183b32] text-white' : 'bg-[#d9e9e2] text-[#20483c]') }, saved ? '✓ In palette' : '+ Save'),
              h('a', { href: item.downloadUrl, target: '_blank', rel: 'noopener noreferrer', className: 'min-h-[44px] inline-flex justify-center items-center rounded-xl bg-white border border-[#a9bbb3] font-black text-xs text-[#294d42]' }, 'Open image ↗')
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
            h('p', { className: 'text-[10px] uppercase tracking-[.28em] font-black text-[#507064]' }, 'Open visual materials · source-first'),
            h('div', { className: 'flex items-center gap-3 mt-1' },
              h('span', { 'aria-hidden': 'true', className: 'w-11 h-11 rounded-2xl bg-[#183b32] text-[#f7f2e7] inline-flex items-center justify-center text-2xl font-serif shadow-lg' }, 'S'),
              h('div', null,
                h('h1', { className: 'font-serif text-3xl md:text-4xl font-black tracking-tight text-[#17372e]' }, 'Sourcebook'),
                h('p', { className: 'mt-1 text-sm text-[#426157]' }, 'Find textures and visual assets for educational materials or artwork—then save, prepare, and print them with their source trail intact.')
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
        h('div', { className: 'sb-no-print flex flex-col md:flex-row md:items-center gap-3 mb-5' },
          h('div', { className: 'flex gap-2 flex-wrap flex-1', 'aria-label': 'Material type filters' }, kinds.map(function (value) { return controlButton(value, kind === value, function () { setFilter('kind', value); }); })),
          h('label', { className: 'text-xs font-black text-[#4d645b]' }, 'Source ',
            h('select', { value: provider, onChange: function (event) { setFilter('provider', event.target.value); }, className: 'ml-1 min-h-[40px] rounded-xl border border-[#a9bbb4] bg-white px-3 text-xs font-bold' }, providers.map(function (value) { return h('option', { key: value, value: value }, value); }))
          )
        ),
        h('div', { className: 'grid lg:grid-cols-[minmax(0,1fr)_350px] gap-5 items-start' },
          h('main', null,
            h('div', { className: 'flex flex-wrap items-end justify-between gap-3 mb-3' },
              h('div', null,
                h('p', { className: 'text-[10px] uppercase tracking-[.18em] font-black text-[#62766e]' }, showingCollection ? 'Saved working set' : 'Curated source index'),
                h('h2', { className: 'font-serif text-2xl font-black text-[#18352d]' }, showingCollection ? storedTitle : (query ? visible.length + ' matches for “' + query + '”' : 'Browse the starting shelf'))
              ),
              h('div', { className: 'sb-no-print flex gap-2' },
                controlButton('Results (' + results.length + ')', !showingCollection, function () { setShowingCollection(false); }),
                controlButton('Palette (' + collection.length + ')', showingCollection, function () { setShowingCollection(true); })
              )
            ),
            showingCollection && h('div', { className: 'sb-no-print flex gap-2 mb-3' },
              h('label', { className: 'sr-only', htmlFor: 'sourcebook-palette-title' }, 'Palette title'),
              h('input', { id: 'sourcebook-palette-title', value: storedTitle, onChange: function (event) { patch({ paletteTitle: event.target.value.slice(0, 80) }); }, className: 'flex-1 min-h-[42px] rounded-xl border border-[#afc0b8] px-3 text-sm font-bold', placeholder: 'Palette title' }),
              h('button', { type: 'button', disabled: !selectedItems.length, onClick: function () { if (!downloadPaletteManifest(collection, preparation, storedTitle)) toast('The palette manifest could not be downloaded in this browser.', 'error'); }, className: 'min-h-[42px] px-4 rounded-xl border border-[#507268] bg-white text-[#244c40] text-xs font-black disabled:opacity-40', title: 'Portable manifest for future Page Designer import' }, 'Export .json'),
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
              h('p', { className: 'mt-2 text-xs leading-relaxed text-[#cadbd5]' }, 'Sourcebook’s built-in shelf works offline once loaded. These links hand your current words to the provider; reuse terms still belong to each item record.'),
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
          'Built-in results are limited to files whose item records expressly identify them as Public Domain or CC0. Unknown, restricted, “no known restrictions,” and incompatible licenses are excluded. Always verify the linked item record for the use you intend.'
        )
      );
    }
  });
})();
