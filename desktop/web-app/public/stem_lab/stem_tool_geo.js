// ═══════════════════════════════════════════
// stem_tool_geo.js — STEAM Lab Geo Tools
// 1 registered tools
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _geoAC = null;
  function getGeoAC() { if (!_geoAC) { try { _geoAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_geoAC && _geoAC.state === "suspended") { try { _geoAC.resume(); } catch(e) {} } return _geoAC; }
  function geoTone(f,d,tp,v) { var ac = getGeoAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxGeoClick() { geoTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-geo')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-geo';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ 🔬 geoQuiz (geoQuiz) ═══
  window.StemLab.registerTool('geoQuiz', {
    icon: '\uD83C\uDF10',
    label: "Geography Explorer",
    desc: "Interactive maps and quizzes for countries, capitals, continents, landmarks, distances, a 3D globe, and an AI quiz builder.",
    color: 'slate',
    category: 'geo',
    questHooks: [
      { id: 'score_5', label: 'Score 5+ on geography quiz', icon: '\uD83C\uDF0D', check: function(d) { return (d.geoScore || 0) >= 5; }, progress: function(d) { return (d.geoScore || 0) + '/5'; } },
      { id: 'score_10', label: 'Score 10+ on geography quiz', icon: '\uD83C\uDFC6', check: function(d) { return (d.geoScore || 0) >= 10; }, progress: function(d) { return (d.geoScore || 0) + '/10'; } },
      { id: 'streak_3', label: 'Get a 3-answer streak', icon: '\uD83D\uDD25', check: function(d) { return (d.geoStreak || 0) >= 3; }, progress: function(d) { return (d.geoStreak || 0) + '/3 streak'; } },
      { id: 'answer_10', label: 'Answer 10 geography questions', icon: '\uD83D\uDCDA', check: function(d) { return (d.geoAnswered || []).length >= 10; }, progress: function(d) { return (d.geoAnswered || []).length + '/10'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (geoQuiz) ──
      return (function() {
var d = labToolData || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('geo', 'init', {
              first: 'Geography Explorer loaded. Explore world maps, countries, capitals, and geographic features with interactive quizzes.',
              repeat: 'Geography active.',
              terse: 'Geography.'
            }, { debounce: 800 });
          }

          var upd = function (k, v) { setLabToolData(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };



          // ── CDN Library Loader ──

          if (!window._geoLibsLoaded) {

            window._geoLibsLoaded = null;

            window._geoLibsReady = false;

          }

          function loadGeoLibs() {

            if (window._geoLibsLoaded) return window._geoLibsLoaded;

            window._geoLibsLoaded = new Promise(function(res) {

              if (window.L) { window._geoLibsReady = true; res(); return; }

              var css = document.createElement('link');

              css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

              document.head.appendChild(css);

              var sc = document.createElement('script');

              sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

              sc.onload = function() { window._geoLibsReady = true; res(); };

              sc.onerror = function() { res(); };

              document.head.appendChild(sc);

            });

            return window._geoLibsLoaded;

          }

          function loadGlobeLib() {

            if (window._globeLibLoaded) return window._globeLibLoaded;

            window._globeLibLoaded = new Promise(function(res) {

              if (window._GlobeGLConstructor) { res(); return; }

              var sc = document.createElement('script');

              sc.src = 'https://unpkg.com/globe.gl@2.27.2/dist/globe.gl.min.js';

              sc.onload = function() { if (typeof window.Globe === 'function' && !window.Globe.$$typeof) window._GlobeGLConstructor = window.Globe; res(); };

              sc.onerror = function() { res(); };

              document.head.appendChild(sc);

            });

            return window._globeLibLoaded;

          }

          // ── Country outlines (GeoJSON) — ONE shared loader for the 2D map and the globe ──
          // Natural Earth 1:50m (~3 MB, ~100k vertices; every one of the 117 quiz
          // countries present, Singapore included) from jsdelivr, then the GitHub raw
          // copy, then the old datasets/geo-countries file (14.6 MB) as a last resort.
          // Property schemas differ per source (ISO_A3 / ISO_A3_EH / ADM0_A3 / ADMIN vs
          // "ISO3166-1-Alpha-3" / name), so every reader goes through featIso() and
          // featName() below instead of touching properties directly. The previous
          // hard-coded ISO_A3 read silently returned '' for every polygon once the
          // upstream file changed its schema, which graded every map click as wrong.
          var GEO_GEOJSON_SOURCES = [
            'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson',
            'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
            'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
          ];
          function fetchJsonWithTimeout(url, ms) {
            var controller = (typeof AbortController === 'function') ? new AbortController() : null;
            var timeoutId = setTimeout(function() { if (controller) controller.abort(); }, ms);
            return fetch(url, controller ? { signal: controller.signal } : undefined)
              .then(function(r) { clearTimeout(timeoutId); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
              .catch(function(e) { clearTimeout(timeoutId); throw e; });
          }
          function loadCountriesGeoJSON() {
            if (window._geoCountriesGeoJSON) return Promise.resolve(window._geoCountriesGeoJSON);
            if (window._geoCountriesGeoJSONPromise) return window._geoCountriesGeoJSONPromise;
            var attempt = function(i) {
              if (i >= GEO_GEOJSON_SOURCES.length) return Promise.reject(new Error('country outlines could not be downloaded'));
              return fetchJsonWithTimeout(GEO_GEOJSON_SOURCES[i], 15000).then(function(data) {
                if (!data || !data.features || !data.features.length) throw new Error('empty GeoJSON');
                return data;
              }).catch(function(e) {
                console.warn('[Geo] country outlines source ' + (i + 1) + '/' + GEO_GEOJSON_SOURCES.length + ' failed: ' + (e && e.message));
                return attempt(i + 1);
              });
            };
            window._geoCountriesGeoJSONPromise = attempt(0).then(function(data) {
              window._geoCountriesGeoJSON = data;
              window._geoGeoJsonError = null;
              return data;
            }).catch(function(e) {
              window._geoCountriesGeoJSONPromise = null; // let a Retry try again
              window._geoGeoJsonError = (e && e.message) || 'load failed';
              throw e;
            });
            return window._geoCountriesGeoJSONPromise;
          }
          // ISO-3166 alpha-3 code of a feature across schemas. Natural Earth stamps
          // '-99' on France and Norway in ISO_A3 (the real code sits in ISO_A3_EH /
          // ADM0_A3), so anything that is not three capital letters is skipped.
          function featIso(p) {
            if (!p) return '';
            var cands = [p.ISO_A3, p.ISO_A3_EH, p.ADM0_A3, p['ISO3166-1-Alpha-3'], p.iso_a3, p.ISO3, p.id];
            for (var i = 0; i < cands.length; i++) {
              var v = cands[i];
              if (typeof v === 'string' && /^[A-Z]{3}$/.test(v)) return v;
            }
            return '';
          }
          function featName(p) {
            if (!p) return '';
            return p.ADMIN || p.NAME_LONG || p.NAME || p.name || p.admin || '';
          }

          // ── Point-in-country, so the map can be answered from the KEYBOARD ──
          // Leaflet only reports a country when a pointer event lands on its polygon,
          // which left Find Country unusable without a mouse. Ray-casting the cached
          // GeoJSON ourselves gives "which country is under this lat/lng", so the
          // crosshair at the map's centre can be submitted with Enter.
          function pointInRing(lat, lng, ring) {
            var inside = false;
            for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
              var xi = ring[i][0], yi = ring[i][1];   // GeoJSON stores [lng, lat]
              var xj = ring[j][0], yj = ring[j][1];
              var dy = (yj - yi) || 1e-12;
              if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / dy + xi)) inside = !inside;
            }
            return inside;
          }
          function pointInPolygon(lat, lng, rings) {
            if (!rings || !rings.length) return false;
            if (!pointInRing(lat, lng, rings[0])) return false;
            for (var h = 1; h < rings.length; h++) {
              if (pointInRing(lat, lng, rings[h])) return false; // inside a hole (e.g. Lesotho in South Africa)
            }
            return true;
          }
          function pointInFeature(lat, lng, feature) {
            var g = feature && feature.geometry;
            if (!g || !g.coordinates) return false;
            if (g.type === 'Polygon') return pointInPolygon(lat, lng, g.coordinates);
            if (g.type === 'MultiPolygon') {
              for (var i = 0; i < g.coordinates.length; i++) {
                if (pointInPolygon(lat, lng, g.coordinates[i])) return true;
              }
            }
            return false;
          }
          function countryAtLatLng(lat, lng, geojson) {
            var gj = geojson || window._geoCountriesGeoJSON;
            if (!gj || !gj.features) return null;
            for (var i = 0; i < gj.features.length; i++) {
              var f = gj.features[i];
              if (pointInFeature(lat, lng, f)) {
                var p = f.properties || {};
                return { iso: featIso(p), name: featName(p) };
              }
            }
            return null;
          }

          // Test seam, mirroring __alloGeologyPure: Leaflet and globe.gl cannot run
          // under jsdom, so the unit tests drive these directly. Every entry is a
          // function DECLARATION in this scope, so hoisting makes them all defined
          // here even though some are written further down.
          window.__alloGeoPure = {
            pointInFeature: pointInFeature,
            countryAtLatLng: countryAtLatLng,
            featIso: featIso,
            featName: featName,
            resolveCountry: resolveCountry,
            isoFromName: isoFromName,
            normalizeAnswer: normalizeAnswer,
            capitalMatches: capitalMatches,
            capitalLatLng: capitalLatLng,
            haversineKm: haversineKm,
            greatCircleLatLngs: greatCircleLatLngs,
            buildPracticePack: buildPracticePack
          };



          // Auto-load on mount

          if (!window._geoLibsLoaded) {

            // The state write is the POINT: nothing reads _geoLibsReady, it exists to
            // re-render once Leaflet has landed so the map container mounts. Same for
            // _globeLibReady and _geoOutlinesGen. Do not "clean up" as dead state.
            loadGeoLibs().then(function() { upd('_geoLibsReady', true); });

          }

          // Auto-load the Globe library when the Globe View tab is active but the
          // library hasn't been kicked off yet (e.g. user switched directly to the
          // tab or rehydrated on it). The function is idempotent.
          if ((d.geoTab === 'globeView') && !window._globeLibLoaded) {
            loadGlobeLib().then(function() { upd('_globeLibReady', true); });
          }



          // ── Country Data (compact: [iso3, name, capital, continent, region, lat, lng, areaKm2]) ──

          var GEO_COUNTRIES = [

            ['AFG','Afghanistan','Kabul','Asia','Southern Asia',33.9,67.7,652230],

            ['ALB','Albania','Tirana','Europe','Southern Europe',41.2,19.8,28748],

            ['DZA','Algeria','Algiers','Africa','Northern Africa',28.0,1.7,2381741],

            ['AGO','Angola','Luanda','Africa','Middle Africa',-11.2,17.9,1246700],

            ['ARG','Argentina','Buenos Aires','South America','South America',-38.4,-63.6,2780400],

            ['ARM','Armenia','Yerevan','Asia','Western Asia',40.1,45.0,29743],

            ['AUS','Australia','Canberra','Oceania','Australia and New Zealand',-25.3,133.8,7741220],

            ['AUT','Austria','Vienna','Europe','Western Europe',47.5,14.6,83871],

            ['AZE','Azerbaijan','Baku','Asia','Western Asia',40.1,47.6,86600],

            ['BGD','Bangladesh','Dhaka','Asia','Southern Asia',23.7,90.4,147570],

            ['BLR','Belarus','Minsk','Europe','Eastern Europe',53.7,27.6,207600],

            ['BEL','Belgium','Brussels','Europe','Western Europe',50.5,4.5,30528],

            ['BEN','Benin','Porto-Novo','Africa','Western Africa',9.3,2.3,112622],

            ['BTN','Bhutan','Thimphu','Asia','Southern Asia',27.5,90.4,38394],

            ['BOL','Bolivia','La Paz','South America','South America',-16.3,-63.6,1098581],

            ['BIH','Bosnia and Herzegovina','Sarajevo','Europe','Southern Europe',43.9,17.7,51197],

            ['BWA','Botswana','Gaborone','Africa','Southern Africa',-22.3,24.7,581730],

            ['BRA','Brazil','Bras\u00edlia','South America','South America',-14.2,-51.9,8515767],

            ['BRN','Brunei','Bandar Seri Begawan','Asia','South-Eastern Asia',4.5,114.7,5765],

            ['BGR','Bulgaria','Sofia','Europe','Eastern Europe',42.7,25.5,110879],

            ['BFA','Burkina Faso','Ouagadougou','Africa','Western Africa',12.2,-1.6,272967],

            ['BDI','Burundi','Gitega','Africa','Eastern Africa',-3.4,29.9,27834],

            ['KHM','Cambodia','Phnom Penh','Asia','South-Eastern Asia',12.6,105.0,181035],

            ['CMR','Cameroon','Yaound\u00e9','Africa','Middle Africa',7.4,12.4,475442],

            ['CAN','Canada','Ottawa','North America','Northern America',56.1,-106.3,9984670],

            ['CAF','Central African Republic','Bangui','Africa','Middle Africa',6.6,20.9,622984],

            ['TCD','Chad','N\'Djamena','Africa','Middle Africa',15.5,18.7,1284000],

            ['CHL','Chile','Santiago','South America','South America',-35.7,-71.5,756102],

            ['CHN','China','Beijing','Asia','Eastern Asia',35.9,104.2,9596960],

            ['COL','Colombia','Bogot\u00e1','South America','South America',4.6,-74.3,1141748],

            ['COD','DR Congo','Kinshasa','Africa','Middle Africa',-4.0,21.8,2344858],

            ['COG','Republic of the Congo','Brazzaville','Africa','Middle Africa',-0.2,15.8,342000],

            ['CRI','Costa Rica','San Jos\u00e9','North America','Central America',9.7,-83.8,51100],

            ['CIV','C\u00f4te d\'Ivoire','Yamoussoukro','Africa','Western Africa',7.5,-5.5,322463],

            ['HRV','Croatia','Zagreb','Europe','Southern Europe',45.1,15.2,56594],

            ['CUB','Cuba','Havana','North America','Caribbean',21.5,-77.8,109884],

            ['CZE','Czech Republic','Prague','Europe','Eastern Europe',49.8,15.5,78867],

            ['DNK','Denmark','Copenhagen','Europe','Northern Europe',56.3,9.5,43094],

            ['DOM','Dominican Republic','Santo Domingo','North America','Caribbean',18.7,-70.2,48671],

            ['ECU','Ecuador','Quito','South America','South America',-1.8,-78.2,283561],

            ['EGY','Egypt','Cairo','Africa','Northern Africa',26.8,30.8,1002450],

            ['ETH','Ethiopia','Addis Ababa','Africa','Eastern Africa',9.1,40.5,1104300],

            ['FIN','Finland','Helsinki','Europe','Northern Europe',61.9,25.7,338424],

            ['FRA','France','Paris','Europe','Western Europe',46.2,2.2,643801],

            ['DEU','Germany','Berlin','Europe','Western Europe',51.2,10.5,357022],

            ['GHA','Ghana','Accra','Africa','Western Africa',7.9,-1.0,238533],

            ['GRC','Greece','Athens','Europe','Southern Europe',39.1,21.8,131957],

            ['GTM','Guatemala','Guatemala City','North America','Central America',15.8,-90.2,108889],

            ['HTI','Haiti','Port-au-Prince','North America','Caribbean',19.0,-72.3,27750],

            ['HND','Honduras','Tegucigalpa','North America','Central America',15.2,-86.2,112492],

            ['HUN','Hungary','Budapest','Europe','Eastern Europe',47.2,19.5,93028],

            ['ISL','Iceland','Reykjavik','Europe','Northern Europe',65.0,-19.0,103000],

            ['IND','India','New Delhi','Asia','Southern Asia',20.6,79.0,3287263],

            ['IDN','Indonesia','Jakarta','Asia','South-Eastern Asia',-0.8,113.9,1904569],

            ['IRN','Iran','Tehran','Asia','Southern Asia',32.4,53.7,1648195],

            ['IRQ','Iraq','Baghdad','Asia','Western Asia',33.2,43.7,438317],

            ['IRL','Ireland','Dublin','Europe','Northern Europe',53.1,-8.2,70273],

            ['ISR','Israel','Jerusalem','Asia','Western Asia',31.0,34.9,22072],

            ['ITA','Italy','Rome','Europe','Southern Europe',41.9,12.6,301340],

            ['JAM','Jamaica','Kingston','North America','Caribbean',18.1,-77.3,10991],

            ['JPN','Japan','Tokyo','Asia','Eastern Asia',36.2,138.3,377930],

            ['JOR','Jordan','Amman','Asia','Western Asia',30.6,36.2,89342],

            ['KAZ','Kazakhstan','Astana','Asia','Central Asia',48.0,68.0,2724900],

            ['KEN','Kenya','Nairobi','Africa','Eastern Africa',-0.0,37.9,580367],

            ['PRK','North Korea','Pyongyang','Asia','Eastern Asia',40.3,127.5,120538],

            ['KOR','South Korea','Seoul','Asia','Eastern Asia',35.9,127.8,100210],

            ['KWT','Kuwait','Kuwait City','Asia','Western Asia',29.3,47.5,17818],

            ['LAO','Laos','Vientiane','Asia','South-Eastern Asia',19.9,102.5,236800],

            ['LBN','Lebanon','Beirut','Asia','Western Asia',33.9,35.9,10400],

            ['LBY','Libya','Tripoli','Africa','Northern Africa',26.3,17.2,1759540],

            ['MDG','Madagascar','Antananarivo','Africa','Eastern Africa',-18.8,46.9,587041],

            ['MYS','Malaysia','Kuala Lumpur','Asia','South-Eastern Asia',4.2,101.98,330803],

            ['MLI','Mali','Bamako','Africa','Western Africa',17.6,-4.0,1240192],

            ['MEX','Mexico','Mexico City','North America','Central America',23.6,-102.6,1964375],

            ['MNG','Mongolia','Ulaanbaatar','Asia','Eastern Asia',46.9,103.8,1564116],

            ['MAR','Morocco','Rabat','Africa','Northern Africa',31.8,-7.1,446550],

            ['MOZ','Mozambique','Maputo','Africa','Eastern Africa',-18.7,35.5,801590],

            ['MMR','Myanmar','Naypyidaw','Asia','South-Eastern Asia',21.9,96.0,676578],

            ['NPL','Nepal','Kathmandu','Asia','Southern Asia',28.4,84.1,147181],

            ['NLD','Netherlands','Amsterdam','Europe','Western Europe',52.1,5.3,41543],

            ['NZL','New Zealand','Wellington','Oceania','Australia and New Zealand',-40.9,174.9,268838],

            ['NGA','Nigeria','Abuja','Africa','Western Africa',9.1,8.7,923768],

            ['NOR','Norway','Oslo','Europe','Northern Europe',60.5,8.5,323802],

            ['PAK','Pakistan','Islamabad','Asia','Southern Asia',30.4,69.3,881912],

            ['PAN','Panama','Panama City','North America','Central America',8.5,-80.8,75420],

            ['PRY','Paraguay','Asunci\u00f3n','South America','South America',-23.4,-58.4,406752],

            ['PER','Peru','Lima','South America','South America',-9.2,-75.0,1285216],

            ['PHL','Philippines','Manila','Asia','South-Eastern Asia',12.9,121.8,300000],

            ['POL','Poland','Warsaw','Europe','Eastern Europe',51.9,19.1,312696],

            ['PRT','Portugal','Lisbon','Europe','Southern Europe',39.4,-8.2,92090],

            ['ROU','Romania','Bucharest','Europe','Eastern Europe',45.9,25.0,238391],

            ['RUS','Russia','Moscow','Europe','Eastern Europe',61.5,105.3,17098242],

            ['SAU','Saudi Arabia','Riyadh','Asia','Western Asia',23.9,45.1,2149690],

            ['SEN','Senegal','Dakar','Africa','Western Africa',14.5,-14.5,196722],

            ['SRB','Serbia','Belgrade','Europe','Southern Europe',44.0,21.0,77474],

            ['SGP','Singapore','Singapore','Asia','South-Eastern Asia',1.4,103.8,719],

            ['ZAF','South Africa','Pretoria','Africa','Southern Africa',-30.6,22.9,1221037],

            ['ESP','Spain','Madrid','Europe','Southern Europe',40.5,-3.7,505992],

            ['LKA','Sri Lanka','Sri Jayawardenepura Kotte','Asia','Southern Asia',7.9,80.8,65610],

            ['SDN','Sudan','Khartoum','Africa','Northern Africa',12.9,30.2,1861484],

            ['SWE','Sweden','Stockholm','Europe','Northern Europe',60.1,18.6,450295],

            ['CHE','Switzerland','Bern','Europe','Western Europe',46.8,8.2,41285],

            ['SYR','Syria','Damascus','Asia','Western Asia',34.8,39.0,185180],

            ['TWN','Taiwan','Taipei','Asia','Eastern Asia',23.7,121.0,36193],

            ['TZA','Tanzania','Dodoma','Africa','Eastern Africa',-6.4,34.9,945087],

            ['THA','Thailand','Bangkok','Asia','South-Eastern Asia',15.9,100.9,513120],

            ['TUR','Turkey','Ankara','Asia','Western Asia',39.0,35.2,783562],

            ['UGA','Uganda','Kampala','Africa','Eastern Africa',1.4,32.3,241550],

            ['UKR','Ukraine','Kyiv','Europe','Eastern Europe',48.4,31.2,603500],

            ['ARE','United Arab Emirates','Abu Dhabi','Asia','Western Asia',23.4,53.8,83600],

            ['GBR','United Kingdom','London','Europe','Northern Europe',55.4,-3.4,243610],

            ['USA','United States','Washington, D.C.','North America','Northern America',37.1,-95.7,9833517],

            ['URY','Uruguay','Montevideo','South America','South America',-32.5,-55.8,176215],

            ['VEN','Venezuela','Caracas','South America','South America',6.4,-66.6,916445],

            ['VNM','Vietnam','Hanoi','Asia','South-Eastern Asia',14.1,108.3,331212],

            ['ZMB','Zambia','Lusaka','Africa','Eastern Africa',-13.1,27.8,752612],

            ['ZWE','Zimbabwe','Harare','Africa','Eastern Africa',-19.0,29.2,390757]

          ];



          // Parse countries into objects

          var countries = GEO_COUNTRIES.map(function(c) {

            return { iso: c[0], name: c[1], capital: c[2], continent: c[3], region: c[4], lat: c[5], lng: c[6], area: c[7] };

          });

          var countryByIso = {};
          countries.forEach(function(c) { countryByIso[c.iso] = c; });

          // Names other datasets use for the same country (lower-case), so a polygon
          // that arrives without a usable ISO code can still be matched by name.
          var GEO_NAME_ALIASES = {
            'democratic republic of the congo': 'COD', 'congo, democratic republic of the': 'COD', 'congo (kinshasa)': 'COD', 'dr congo': 'COD',
            'republic of congo': 'COG', 'congo': 'COG', 'congo (brazzaville)': 'COG',
            'ivory coast': 'CIV', "cote d'ivoire": 'CIV',
            'czechia': 'CZE', 'republic of serbia': 'SRB', 'united republic of tanzania': 'TZA',
            'united states of america': 'USA', 'usa': 'USA', 'united states': 'USA', 'russian federation': 'RUS',
            'turkiye': 'TUR', 'türkiye': 'TUR', 'iran, islamic republic of': 'IRN', 'viet nam': 'VNM',
            'lao pdr': 'LAO', "lao people's democratic republic": 'LAO', 'republic of korea': 'KOR',
            "democratic people's republic of korea": 'PRK', 'korea, republic of': 'KOR', 'syrian arab republic': 'SYR',
            'bolivia (plurinational state of)': 'BOL', 'venezuela (bolivarian republic of)': 'VEN',
            'brunei darussalam': 'BRN', 'burma': 'MMR', 'the netherlands': 'NLD', 'myanmar (burma)': 'MMR'
          };
          function isoFromName(name) {
            if (!name) return '';
            var key = String(name).toLowerCase().trim();
            if (GEO_NAME_ALIASES[key]) return GEO_NAME_ALIASES[key];
            var hit = countries.find(function(c) { return c.name.toLowerCase() === key; });
            return hit ? hit.iso : '';
          }
          // Resolve a clicked polygon to a dataset country: ISO first, name second.
          function resolveCountry(iso, name) {
            if (iso && countryByIso[iso]) return countryByIso[iso];
            var byName = isoFromName(name);
            return (byName && countryByIso[byName]) ? countryByIso[byName] : null;
          }

          // Capital-city coordinates [lat, lng]. The Distance tab measures capital to
          // capital — a journey a student can picture — instead of centroid to centroid
          // (Russia's centroid sits 3,700 km east of Moscow).
          var GEO_CAPITAL_LL = {
            AFG: [34.53, 69.17], ALB: [41.33, 19.82], DZA: [36.75, 3.06], AGO: [-8.84, 13.23], ARG: [-34.60, -58.38],
            ARM: [40.18, 44.51], AUS: [-35.28, 149.13], AUT: [48.21, 16.37], AZE: [40.41, 49.87], BGD: [23.81, 90.41],
            BLR: [53.90, 27.57], BEL: [50.85, 4.35], BEN: [6.50, 2.60], BTN: [27.47, 89.64], BOL: [-16.50, -68.15],
            BIH: [43.86, 18.41], BWA: [-24.65, 25.91], BRA: [-15.79, -47.88], BRN: [4.90, 114.94], BGR: [42.70, 23.32],
            BFA: [12.37, -1.52], BDI: [-3.43, 29.93], KHM: [11.56, 104.92], CMR: [3.87, 11.52], CAN: [45.42, -75.70],
            CAF: [4.39, 18.56], TCD: [12.13, 15.05], CHL: [-33.45, -70.67], CHN: [39.90, 116.40], COL: [4.71, -74.07],
            COD: [-4.32, 15.31], COG: [-4.27, 15.28], CRI: [9.93, -84.08], CIV: [6.83, -5.29], HRV: [45.81, 15.98],
            CUB: [23.11, -82.37], CZE: [50.08, 14.44], DNK: [55.68, 12.57], DOM: [18.49, -69.93], ECU: [-0.18, -78.47],
            EGY: [30.04, 31.24], ETH: [9.03, 38.74], FIN: [60.17, 24.94], FRA: [48.86, 2.35], DEU: [52.52, 13.41],
            GHA: [5.60, -0.19], GRC: [37.98, 23.73], GTM: [14.63, -90.51], HTI: [18.54, -72.34], HND: [14.07, -87.19],
            HUN: [47.50, 19.04], ISL: [64.15, -21.94], IND: [28.61, 77.21], IDN: [-6.21, 106.85], IRN: [35.69, 51.39],
            IRQ: [33.31, 44.37], IRL: [53.35, -6.26], ISR: [31.77, 35.22], ITA: [41.90, 12.50], JAM: [17.97, -76.79],
            JPN: [35.68, 139.69], JOR: [31.95, 35.93], KAZ: [51.17, 71.43], KEN: [-1.29, 36.82], PRK: [39.02, 125.75],
            KOR: [37.57, 126.98], KWT: [29.37, 47.98], LAO: [17.97, 102.63], LBN: [33.89, 35.50], LBY: [32.89, 13.19],
            MDG: [-18.88, 47.51], MYS: [3.14, 101.69], MLI: [12.64, -8.00], MEX: [19.43, -99.13], MNG: [47.92, 106.92],
            MAR: [34.02, -6.84], MOZ: [-25.97, 32.57], MMR: [19.76, 96.08], NPL: [27.72, 85.32], NLD: [52.37, 4.90],
            NZL: [-41.29, 174.78], NGA: [9.06, 7.49], NOR: [59.91, 10.75], PAK: [33.69, 73.04], PAN: [8.98, -79.52],
            PRY: [-25.28, -57.63], PER: [-12.05, -77.04], PHL: [14.60, 120.98], POL: [52.23, 21.01], PRT: [38.72, -9.14],
            ROU: [44.43, 26.10], RUS: [55.76, 37.62], SAU: [24.69, 46.72], SEN: [14.72, -17.47], SRB: [44.79, 20.45],
            SGP: [1.29, 103.85], ZAF: [-25.75, 28.19], ESP: [40.42, -3.70], LKA: [6.90, 79.90], SDN: [15.59, 32.53],
            SWE: [59.33, 18.07], CHE: [46.95, 7.45], SYR: [33.51, 36.29], TWN: [25.03, 121.57], TZA: [-6.17, 35.74],
            THA: [13.76, 100.50], TUR: [39.93, 32.85], UGA: [0.35, 32.58], UKR: [50.45, 30.52], ARE: [24.45, 54.38],
            GBR: [51.51, -0.13], USA: [38.91, -77.04], URY: [-34.90, -56.16], VEN: [10.48, -66.90], VNM: [21.03, 105.85],
            ZMB: [-15.42, 28.28], ZWE: [-17.83, 31.05]
          };
          function capitalLatLng(c) { var ll = c && GEO_CAPITAL_LL[c.iso]; return ll ? ll : [c.lat, c.lng]; }

          // Alternative answers accepted for capitals: multi-seat governments, an
          // official-vs-commercial split, or a common older spelling. The feedback
          // still names the official capital so the student learns it.
          var GEO_CAPITAL_ALIASES = {
            ZAF: ['Cape Town', 'Bloemfontein'],          // executive / legislative / judicial capitals
            BOL: ['Sucre'],                                // Sucre is the constitutional capital; La Paz the seat of government
            LKA: ['Kotte', 'Colombo'],                    // Colombo is the commercial capital
            MYS: ['Putrajaya'],                            // federal administrative centre
            NLD: ['The Hague', 'Den Haag'],                // seat of government
            CIV: ['Abidjan'],                              // de facto capital
            BEN: ['Cotonou'],                              // seat of government
            TZA: ['Dar es Salaam'],                        // former capital, still the largest city
            BDI: ['Bujumbura'],                            // capital until 2019
            KAZ: ['Nur-Sultan'],                           // 2019–2022 name
            USA: ['Washington', 'Washington DC', 'DC'],
            UKR: ['Kiev'], MMR: ['Nay Pyi Taw'], CHE: ['Berne'], MNG: ['Ulan Bator'], CHN: ['Peking'],
            IND: ['Delhi'], PAN: ['Panama'], GTM: ['Guatemala'], KWT: ['Kuwait'], MEX: ['Mexico'], SGP: ['Singapore City']
          };
          // Case-, accent- and punctuation-insensitive comparison ("Bogota" = "Bogotá",
          // "Port au Prince" = "Port-au-Prince"). Unicode-aware so non-Latin answers
          // are not stripped to an empty string.
          var _geoNormRe = (function() { try { return new RegExp('[^\\p{L}\\p{N}]+', 'gu'); } catch (e) { return /[^a-z0-9]+/g; } })();
          function normalizeAnswer(s) {
            var str = String(s || '').toLowerCase();
            try { str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
            return str.replace(_geoNormRe, '');
          }
          function capitalMatches(input, c) {
            var want = normalizeAnswer(input);
            if (!want || !c) return false;
            if (want === normalizeAnswer(c.capital)) return true;
            return (GEO_CAPITAL_ALIASES[c.iso] || []).some(function(a) { return normalizeAnswer(a) === want; });
          }



          // ── Landmark Data ──

          var GEO_LANDMARKS = [

            { name: __alloT('stem.geo.great_wall_of_china', 'Great Wall of China'), lat: 40.4, lng: 116.6, country: 'China', fact: __alloT('stem.geo.over_13_000_miles_long_built_over_2_00', 'Over 13,000 miles long, built over 2,000 years') },

            { name: __alloT('stem.geo.eiffel_tower', 'Eiffel Tower'), lat: 48.86, lng: 2.29, country: 'France', fact: __alloT('stem.geo.built_in_1889_1_083_feet_tall', 'Built in 1889, 1,083 feet tall') },

            { name: __alloT('stem.geo.taj_mahal', 'Taj Mahal'), lat: 27.17, lng: 78.04, country: 'India', fact: __alloT('stem.geo.mughal_mausoleum_built_1632_1653', 'Mughal mausoleum built 1632\u20131653') },

            { name: __alloT('stem.geo.machu_picchu', 'Machu Picchu'), lat: -13.16, lng: -72.55, country: 'Peru', fact: __alloT('stem.geo.15th_century_inca_citadel_at_7_970_ft_', '15th-century Inca citadel at 7,970 ft elevation') },

            { name: __alloT('stem.geo.great_pyramid_of_giza', 'Great Pyramid of Giza'), lat: 29.98, lng: 31.13, country: 'Egypt', fact: __alloT('stem.geo.built_2560_bc_only_surviving_ancient_w', 'Built ~2560 BC, only surviving Ancient Wonder') },

            { name: __alloT('stem.geo.statue_of_liberty', 'Statue of Liberty'), lat: 40.69, lng: -74.04, country: 'United States', fact: __alloT('stem.geo.gift_from_france_in_1886_305_feet_tall', 'Gift from France in 1886, 305 feet tall') },

            { name: __alloT('stem.geo.colosseum', 'Colosseum'), lat: 41.89, lng: 12.49, country: 'Italy', fact: __alloT('stem.geo.roman_amphitheater_built_ad_72_80', 'Roman amphitheater built AD 72\u201380') },

            { name: __alloT('stem.geo.christ_the_redeemer', 'Christ the Redeemer'), lat: -22.95, lng: -43.21, country: 'Brazil', fact: __alloT('stem.geo.98_foot_art_deco_statue_atop_corcovado', '98-foot Art Deco statue atop Corcovado mountain') },

            { name: __alloT('stem.geo.sydney_opera_house', 'Sydney Opera House'), lat: -33.86, lng: 151.21, country: 'Australia', fact: __alloT('stem.geo.opened_1973_unesco_world_heritage_site', 'Opened 1973, UNESCO World Heritage Site') },

            { name: __alloT('stem.geo.petra', 'Petra'), lat: 30.33, lng: 35.44, country: 'Jordan', fact: __alloT('stem.geo.ancient_city_carved_into_rose_red_sand', 'Ancient city carved into rose-red sandstone cliffs') },

            { name: __alloT('stem.geo.angkor_wat', 'Angkor Wat'), lat: 13.41, lng: 103.87, country: 'Cambodia', fact: __alloT('stem.geo.largest_religious_monument_in_the_worl', 'Largest religious monument in the world') },

            { name: __alloT('stem.geo.mount_everest', 'Mount Everest'), lat: 27.99, lng: 86.93, country: 'Nepal', alt: ['China'], fact: __alloT('stem.geo.earth_s_highest_peak_at_29_032_feet_on', 'Earth\'s highest peak at 29,032 feet, on the Nepal–China border') },

            { name: __alloT('stem.geo.stonehenge', 'Stonehenge'), lat: 51.18, lng: -1.83, country: 'United Kingdom', fact: __alloT('stem.geo.neolithic_stone_circle_3000_bc', 'Neolithic stone circle, ~3000 BC') },

            { name: __alloT('stem.geo.mount_fuji', 'Mount Fuji'), lat: 35.36, lng: 138.73, country: 'Japan', fact: __alloT('stem.geo.iconic_12_389_foot_stratovolcano', 'Iconic 12,389-foot stratovolcano') },

            { name: __alloT('stem.geo.niagara_falls', 'Niagara Falls'), lat: 43.08, lng: -79.07, country: 'Canada', alt: ['United States'], fact: __alloT('stem.geo.three_waterfalls_straddling_us_canada_', 'Three waterfalls straddling US-Canada border') },

            { name: __alloT('stem.geo.victoria_falls', 'Victoria Falls'), lat: -17.93, lng: 25.86, country: 'Zambia', alt: ['Zimbabwe'], fact: __alloT('stem.geo.world_s_largest_sheet_of_falling_water_', 'World\'s largest sheet of falling water, on the Zambia–Zimbabwe border') },

            { name: __alloT('stem.geo.grand_canyon', 'Grand Canyon'), lat: 36.11, lng: -112.11, country: 'United States', fact: __alloT('stem.geo.277_miles_long_up_to_18_miles_wide', '277 miles long, up to 18 miles wide') },

            { name: __alloT('stem.geo.great_barrier_reef', 'Great Barrier Reef'), lat: -18.29, lng: 147.70, country: 'Australia', fact: __alloT('stem.geo.world_s_largest_coral_reef_system', 'World\'s largest coral reef system') },

            { name: __alloT('stem.geo.sahara_desert', 'Sahara Desert'), lat: 23.42, lng: 25.66, country: 'Algeria', alt: ['Libya', 'Egypt', 'Morocco', 'Mali', 'Chad', 'Sudan', 'Niger', 'Tunisia', 'Mauritania'], fact: __alloT('stem.geo.largest_hot_desert_3_6_million_sq_mile_', 'Largest hot desert, 3.6 million sq miles across about ten countries') },

            { name: __alloT('stem.geo.amazon_river', 'Amazon River'), lat: -3.47, lng: -60.02, country: 'Brazil', alt: ['Peru', 'Colombia'], fact: __alloT('stem.geo.largest_river_by_water_flow_rivals_the', 'Largest river by water flow; rivals the Nile for longest (the measurement is disputed)') },

            // The first 20 leaned heavily on Europe and North America. These ten widen
            // the map: sub-Saharan Africa, the Horn, Central and Southeast Asia, the
            // Pacific, Mesoamerica and the Southern Cone.
            { name: __alloT('stem.geo.chichen_itza', 'Chichén Itzá'), lat: 20.68, lng: -88.57, country: 'Mexico', fact: __alloT('stem.geo.maya_city_its_step_pyramid_casts_a_ser', 'Maya city; at the equinoxes its step pyramid casts a serpent-shaped shadow') },

            { name: __alloT('stem.geo.great_mosque_of_djenne', 'Great Mosque of Djenné'), lat: 13.91, lng: -4.55, country: 'Mali', fact: __alloT('stem.geo.the_largest_mud_brick_building_in_the_', 'The largest mud-brick building in the world, re-plastered by the whole town each year') },

            { name: __alloT('stem.geo.serengeti', 'Serengeti'), lat: -2.33, lng: 34.83, country: 'Tanzania', fact: __alloT('stem.geo.over_a_million_wildebeest_migrate_acro', 'Over a million wildebeest migrate across it every year') },

            { name: __alloT('stem.geo.borobudur', 'Borobudur'), lat: -7.61, lng: 110.20, country: 'Indonesia', fact: __alloT('stem.geo.the_world_s_largest_buddhist_temple_bu', 'The world\'s largest Buddhist temple, built in the 9th century') },

            { name: __alloT('stem.geo.table_mountain', 'Table Mountain'), lat: -33.96, lng: 18.41, country: 'South Africa', fact: __alloT('stem.geo.flat_topped_sandstone_massif_above_cap', 'Flat-topped sandstone massif above Cape Town, about 1,085 m high') },

            { name: __alloT('stem.geo.ha_long_bay', 'Ha Long Bay'), lat: 20.91, lng: 107.18, country: 'Vietnam', fact: __alloT('stem.geo.around_1_600_limestone_karst_islands_r', 'Around 1,600 limestone karst islands rising straight out of the sea') },

            { name: __alloT('stem.geo.iguazu_falls', 'Iguazú Falls'), lat: -25.69, lng: -54.44, country: 'Argentina', alt: ['Brazil'], fact: __alloT('stem.geo.275_waterfalls_along_the_argentina_bra', '275 waterfalls along the Argentina–Brazil border') },

            { name: __alloT('stem.geo.mount_kilimanjaro', 'Mount Kilimanjaro'), lat: -3.07, lng: 37.35, country: 'Tanzania', fact: __alloT('stem.geo.africa_s_highest_peak_at_5_895_m_a_fre', 'Africa\'s highest peak at 5,895 m, and a free-standing volcano') },

            { name: __alloT('stem.geo.lalibela', 'Lalibela'), lat: 12.03, lng: 39.04, country: 'Ethiopia', fact: __alloT('stem.geo.eleven_medieval_churches_carved_downwa', 'Eleven medieval churches carved downward into solid rock') },

            { name: __alloT('stem.geo.uluru', 'Uluru'), lat: -25.34, lng: 131.04, country: 'Australia', fact: __alloT('stem.geo.sandstone_inselberg_sacred_to_the_anan', 'Sandstone inselberg sacred to the Anangu; climbing it closed in 2019') }

          ];



          // ── State ──

          var geoTab = d.geoTab || 'findCountry';

          var geoScore = d.geoScore || 0;

          var geoStreak = d.geoStreak || 0;

          var geoTarget = d.geoTarget || null;

          var geoAnswered = d.geoAnswered || [];

          var geoDifficulty = d.geoDifficulty || 'medium';

          var geoRegion = d.geoRegionFilter || 'world';

          var geoFeedback = d.geoFeedback || null;

          var geoRound = d.geoRound || 0;

          var geoLandmarkIdx = d.geoLandmarkIdx || 0;

          // Distance challenge state
          var geoDistA = d.geoDistA || null;
          var geoDistB = d.geoDistB || null;
          var geoDistGuess = d.geoDistGuess || '';
          var geoDistFeedback = d.geoDistFeedback || null;
          var geoDistCorrect = d.geoDistCorrect || 0;

          // Badge state
          var geoBadges = d.geoBadges || {};

          // Spaced-repetition state: countries the student got wrong and should re-see.
          // In normal mode, these are weighted 40% more likely to appear in pickTarget.
          // In review mode (toggled via header pill), they appear EXCLUSIVELY.
          var geoMissed = d.geoMissed || [];
          var geoReviewMode = !!d.geoReviewMode;

          // Landmark quiz state ('browse' = passive viewer, 'quiz' = 4-choice country quiz)
          var geoLandmarkMode = d.geoLandmarkMode || 'browse';
          var geoLandmarkChoices = d.geoLandmarkChoices || null;
          var geoLandmarkQuizFb = d.geoLandmarkQuizFb || null;

          // Capitals easy-mode choices (stable per target so the 4 buttons don't
          // re-shuffle on every render — previously a misclick hazard).
          var geoCapitalsChoices = d.geoCapitalsChoices || null;

          // Per-continent accuracy stats for the session. Shape:
          //   { 'Africa': { c: 3, w: 1 }, 'Asia': { c: 5, w: 2 }, ... }
          // Recorded from all country-based quizzes (Find Country, Capitals,
          // Continents, Landmark Quiz) via recordContinentStat() below.
          var geoSessionStats = d.geoSessionStats || {};
          var geoStatsOpen = !!d.geoStatsOpen;

          // Globe View: currently-selected country for the info card below the globe.
          var geoGlobeInfo = d.geoGlobeInfo || null;

          // Find Country: keyboard answering mode (centre crosshair + Enter).
          var geoCrosshair = !!d.geoCrosshair;

          // Reverse of _continentByRegionId, so a continent NAME from the stats panel
          // can drive the region filter. Built below the map it inverts.
          function regionIdForContinent(name) {
            var ids = Object.keys(_continentByRegionId);
            for (var i = 0; i < ids.length; i++) {
              if (_continentByRegionId[ids[i]] === name) return ids[i];
            }
            return null;
          }

          // The continent the student is actually worst at, from this session's own
          // record. Needs a few attempts before it means anything, and a continent they
          // have never missed is not a weakness.
          function weakestContinent(stats) {
            var worst = null;
            Object.keys(stats || {}).forEach(function(k) {
              var s = stats[k];
              var total = s.c + s.w;
              if (total < 3 || s.w === 0) return;
              var pct = s.c / total;
              if (!worst || pct < worst.pct) worst = { continent: k, pct: pct, correct: s.c, total: total };
            });
            return worst;
          }

          function recordContinentStat(continent, correct) {
            if (!continent) return;
            var next = Object.assign({}, geoSessionStats);
            var cur = next[continent] ? { c: next[continent].c, w: next[continent].w } : { c: 0, w: 0 };
            if (correct) cur.c++; else cur.w++;
            next[continent] = cur;
            upd('geoSessionStats', next);
          }

          // Plain-text feedback announcer for screen readers. The tool already sets
          // up an aria-live region (above), but nothing was writing to it until now.
          function announceFeedback(msg) {
            if (!msg) return;
            if (typeof announceToSR === 'function') announceToSR(msg);
            var live = document.getElementById('allo-live-geo');
            if (live) live.textContent = msg;
          }

          // ── Level progression — gamification based on countries mastered ──
          // Thresholds chosen so a focused session can reach Navigator; Master
          // Cartographer requires studying most of the 117 countries.
          var GEO_LEVELS = [
            { idx: 0, icon: '\uD83C\uDF31', name: __alloT('stem.geo.novice', 'Novice'),             min: 0,   next: 5   },
            { idx: 1, icon: '\uD83E\uDDED', name: __alloT('stem.geo.explorer', 'Explorer'),           min: 5,   next: 15  },
            { idx: 2, icon: '\uD83D\uDDFA\uFE0F', name: __alloT('stem.geo.navigator', 'Navigator'),    min: 15,  next: 30  },
            { idx: 3, icon: '\uD83C\uDF0F', name: __alloT('stem.geo.geographer', 'Geographer'),         min: 30,  next: 60  },
            { idx: 4, icon: '\u2708\uFE0F', name: __alloT('stem.geo.globetrotter', 'Globetrotter'),       min: 60,  next: 100 },
            { idx: 5, icon: '\uD83C\uDFC6', name: __alloT('stem.geo.master_cartographer', 'Master Cartographer'), min: 100, next: null }
          ];
          function getGeoLevel(count) {
            for (var i = GEO_LEVELS.length - 1; i >= 0; i--) {
              if (count >= GEO_LEVELS[i].min) return GEO_LEVELS[i];
            }
            return GEO_LEVELS[0];
          }
          var geoCurrentLevel = getGeoLevel(geoAnswered.length);

          // ── Region filter ──
          // Supports: 'world', continent keys (africa/asia/europe/n_america/s_america/oceania),
          // 'americas' (legacy combined), and 'r:<Sub-Region Name>' for finer-grained UN regions.
          var _continentByRegionId = {
            africa: 'Africa', asia: 'Asia', europe: 'Europe',
            n_america: 'North America', s_america: 'South America', oceania: 'Oceania'
          };
          function filterByRegion(regionId) {
            if (!regionId || regionId === 'world') return countries;
            if (regionId.indexOf('r:') === 0) {
              var regionName = regionId.slice(2);
              return countries.filter(function(c) { return c.region === regionName; });
            }
            if (regionId === 'americas') {
              return countries.filter(function(c) { return c.continent === 'North America' || c.continent === 'South America'; });
            }
            var cont = _continentByRegionId[regionId];
            if (cont) return countries.filter(function(c) { return c.continent === cont; });
            return countries;
          }
          var filteredCountries = filterByRegion(geoRegion);
          // geoAnswered spans every region (it is the mastered list behind the level
          // pill), so the Find Country counter needs the in-region subset.
          var answeredInRegion = filteredCountries.filter(function(c) { return geoAnswered.indexOf(c.iso) !== -1; }).length;

          // ── Graduated region options (grouped, counted, difficulty-ordered) ──
          // Continents ordered ascending by country count (fewest = easier start).
          // Within each continent, sub-regions listed by count (smallest first).
          var _regionGroups = (function() {
            var groups = [];
            Object.keys(_continentByRegionId).forEach(function(id) {
              var contName = _continentByRegionId[id];
              var contCountries = countries.filter(function(c) { return c.continent === contName; });
              if (contCountries.length === 0) return;
              // Unique sub-regions + counts; skip any that equal the full continent (redundant)
              var subCounts = {};
              contCountries.forEach(function(c) { subCounts[c.region] = (subCounts[c.region] || 0) + 1; });
              var subs = Object.keys(subCounts)
                .filter(function(r) { return subCounts[r] > 0 && subCounts[r] < contCountries.length; })
                .sort(function(a, b) { return subCounts[a] - subCounts[b]; })
                .map(function(r) { return { id: 'r:' + r, label: r, count: subCounts[r] }; });
              groups.push({ id: id, label: contName, count: contCountries.length, subs: subs });
            });
            groups.sort(function(a, b) { return a.count - b.count; });
            return groups;
          })();



          // Pick a new target. Reads the LATEST state through the functional updater
          // (the render-time snapshot still lacks the country just answered, which
          // used to let the same country come straight back), respects the region
          // filter and review mode, and weights missed countries. The mastered list
          // (geoAnswered) is never wiped here: once every country in the region has
          // been found we keep quizzing the region, avoiding an immediate repeat.

          function pickTarget(mode) {
            setLabToolData(function(p) {
              p = p || {};
              var regionPool = filterByRegion(p.geoRegionFilter || 'world');
              if (regionPool.length === 0) regionPool = countries;
              var answered = p.geoAnswered || [];
              var missed = p.geoMissed || [];
              // Never re-ask the country just shown: the answer was on screen a second ago.
              var prevIso = p.geoTarget ? p.geoTarget.iso : null;
              var notPrev = function(c) { return c.iso !== prevIso; };
              var missedPool = regionPool.filter(function(c) { return missed.indexOf(c.iso) !== -1; }).filter(notPrev);
              var freshPool = regionPool.filter(function(c) { return answered.indexOf(c.iso) === -1; }).filter(notPrev);
              var pool;
              if (p.geoReviewMode && missedPool.length > 0) {
                pool = missedPool;                       // review-only: drill what they got wrong
              } else if (missedPool.length > 0 && Math.random() < 0.4) {
                pool = missedPool;                       // adaptive: 40% of the time resurface a miss
              } else {
                pool = freshPool.length > 0 ? freshPool : regionPool.filter(notPrev);
              }
              if (pool.length === 0) pool = regionPool;  // a one-country region
              var n = Object.assign({}, p);
              n.geoTarget = pool[Math.floor(Math.random() * pool.length)] || null;
              n.geoFeedback = null;
              n.geoRound = (p.geoRound || 0) + 1;
              if (mode === 'capitals') { n.geoCapitalsChoices = null; n.geoCapitalInput = ''; }
              return n;
            });
          }

          // Functional-update helpers, so two quick answers never clobber each other
          // and the lists stay de-duplicated.
          function markAnswered(iso) {
            setLabToolData(function(p) {
              p = p || {};
              var a = p.geoAnswered || [];
              if (a.indexOf(iso) !== -1) return p;
              var n = Object.assign({}, p); n.geoAnswered = a.concat([iso]); return n;
            });
          }
          function addMissed(iso) {
            setLabToolData(function(p) {
              p = p || {};
              var m = p.geoMissed || [];
              if (m.indexOf(iso) !== -1) return p;
              var n = Object.assign({}, p); n.geoMissed = m.concat([iso]); return n;
            });
          }
          // Remove a now-learned country from the review pool, and leave review mode
          // automatically when the pool empties (was leaving the student stuck).
          function clearMissed(iso) {
            setLabToolData(function(p) {
              p = p || {};
              var m = p.geoMissed || [];
              if (m.indexOf(iso) === -1) return p;
              var n = Object.assign({}, p);
              n.geoMissed = m.filter(function(x) { return x !== iso; });
              if (n.geoMissed.length === 0 && p.geoReviewMode) n.geoReviewMode = false;
              return n;
            });
          }
          // True when answering `iso` correctly will empty the review pool in review mode
          // (the toast is fired from the handler; state changes live in clearMissed).
          function finishesReview(iso) {
            return geoReviewMode && geoMissed.length === 1 && geoMissed[0] === iso;
          }

          // Pick the first target — only on tabs that ask about a single country.
          // (The globe, distance, size and AI tabs have no use for one; a stray target
          // used to paint a random country amber on the globe with no explanation.)
          var GEO_TARGET_TABS = { findCountry: true, capitals: true, continents: true };
          if (!geoTarget && GEO_TARGET_TABS[geoTab] && filteredCountries.length > 0 && !window._geoPickPending) {
            window._geoPickPending = true;
            setTimeout(function() { window._geoPickPending = false; pickTarget(geoTab); }, 0);
          }



          // Check answer

          function checkAnswer(clickedIso, clickedName) {

            if (!geoTarget || geoFeedback) return; // a second click during feedback used to score twice

            // Resolve the clicked polygon: ISO first, then its name (some sources ship
            // '-99' or no code at all for a few countries).
            var picked = resolveCountry(clickedIso, clickedName);
            var pickedIso = picked ? picked.iso : (clickedIso || isoFromName(clickedName) || '');
            var correct = !!pickedIso && pickedIso === geoTarget.iso;

            if (correct) {

              var pts = geoDifficulty === 'hard' ? 15 : geoDifficulty === 'easy' ? 5 : 10;

              var newStreak = geoStreak + 1;

              var bonus = newStreak >= 5 ? 5 : 0;

              upd('geoScore', geoScore + pts + bonus);

              upd('geoStreak', newStreak);

              markAnswered(geoTarget.iso);

              upd('geoFeedback', { correct: true, msg: '\u2705 Correct! ' + geoTarget.name + ' \u2014 ' + geoTarget.region + '. +' + (pts + bonus) + ' pts' + (bonus > 0 ? ' (\uD83D\uDD25 streak!)' : '') });

              announceFeedback('Correct. ' + geoTarget.name + ' is in ' + geoTarget.region + ', ' + geoTarget.continent + '. Plus ' + (pts + bonus) + ' points.');

              if (typeof stemBeep === 'function') stemBeep('correct');
              // Confetti on milestone streaks only (was firing on every correct at 5+,
              // which spammed the celebration on long streaks).
              if (typeof stemCelebrate === 'function' && (newStreak === 5 || newStreak === 10 || newStreak === 15 || newStreak === 20 || (newStreak >= 25 && newStreak % 25 === 0))) stemCelebrate();

              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', pts, 'Identified ' + geoTarget.name);

              // Celebrate the correct polygon with a green pulse
              highlightCountry(geoTarget.iso, '#22c55e', 1400);

              // Spaced repetition: a country on the review list is now learned.
              if (finishesReview(geoTarget.iso) && addToast) addToast('\u2705 Review complete! Back to full rotation.', 'success');
              clearMissed(geoTarget.iso);

              recordContinentStat(geoTarget.continent, true);

              setTimeout(function() { pickTarget('findCountry'); }, 1500);

            } else {

              var pickedLabel = picked ? picked.name : (clickedName || pickedIso || 'that country');

              upd('geoStreak', 0);

              if (typeof stemBeep === 'function') stemBeep('wrong');

              upd('geoFeedback', { correct: false, msg: '\u274C You picked ' + pickedLabel + '. ' + geoTarget.name + ' is the green one \u2014 ' + geoTarget.region + '.' });

              announceFeedback('Incorrect. You picked ' + pickedLabel + '. The answer is ' + geoTarget.name + ', in ' + geoTarget.region + ', ' + geoTarget.continent + '.');

              // Spatial learning: flash the wrong pick in red, then reveal the
              // correct country in green and fly to it so the student SEES where it is.
              if (pickedIso) highlightCountry(pickedIso, '#ef4444', 2400);
              highlightCountry(geoTarget.iso, '#22c55e', 2400);
              flyToCountry(geoTarget);

              addMissed(geoTarget.iso);

              recordContinentStat(geoTarget.continent, false);

              // Clear the view key so the next question starts re-framed on the region
              // rather than zoomed in on the reveal.
              setTimeout(function() { window._geoLastZoomedRegion = null; pickTarget('findCountry'); }, 2500);

            }

          }

          // Keyboard-accessible escape hatch for Find Country (the map itself is
          // pointer-only): reveal the target, count it as a miss so it enters the
          // review pool, and move on. Also the only way to skip without guessing.
          function revealTarget() {
            if (!geoTarget || geoFeedback) return;
            upd('geoStreak', 0);
            upd('geoFeedback', { correct: false, msg: '\uD83D\uDC41\uFE0F ' + geoTarget.name + ' is highlighted in green \u2014 ' + geoTarget.region + ', ' + geoTarget.continent + '.' });
            announceFeedback(geoTarget.name + ' is in ' + geoTarget.region + ', ' + geoTarget.continent + '. It is highlighted on the map and added to your review list.');
            highlightCountry(geoTarget.iso, '#22c55e', 3200);
            flyToCountry(geoTarget);
            addMissed(geoTarget.iso);
            recordContinentStat(geoTarget.continent, false);
            setTimeout(function() { window._geoLastZoomedRegion = null; pickTarget('findCountry'); }, 3200);
          }



          // Check capital answer

          function checkCapitalAnswer(input) {

            if (!geoTarget || geoFeedback) return;

            var typed = String(input || '').trim();
            // Accent-, case- and punctuation-insensitive, plus accepted alternates
            // (Cape Town for South Africa, Sucre for Bolivia, Kiev for Kyiv ...).
            var correct = capitalMatches(typed, geoTarget);
            var usedAlias = correct && normalizeAnswer(typed) !== normalizeAnswer(geoTarget.capital);
            var aliasNote = usedAlias ? ' (' + typed + ' is accepted too; the official capital is ' + geoTarget.capital + ')' : '';

            if (correct) {

              upd('geoScore', geoScore + 10);

              upd('geoStreak', geoStreak + 1);

              markAnswered(geoTarget.iso);

              upd('geoFeedback', { correct: true, picked: typed, msg: '\u2705 Correct! The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + aliasNote });

              announceFeedback('Correct. The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + '.');

              if (typeof stemBeep === 'function') stemBeep('correct');

              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'Knew capital of ' + geoTarget.name);

              if (finishesReview(geoTarget.iso) && addToast) addToast('\u2705 Review complete! Back to full rotation.', 'success');
              clearMissed(geoTarget.iso);

              recordContinentStat(geoTarget.continent, true);

              setTimeout(function() { pickTarget('capitals'); }, 1500);

            } else {

              upd('geoStreak', 0);

              if (typeof stemBeep === 'function') stemBeep('wrong');

              upd('geoFeedback', { correct: false, picked: typed, msg: typed
                ? ('\u274C The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + ', not "' + typed + '".')
                : ('\u274C The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + '.') });

              announceFeedback('Incorrect. The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + '.');

              addMissed(geoTarget.iso);

              recordContinentStat(geoTarget.continent, false);

              setTimeout(function() { pickTarget('capitals'); }, 2500);

            }

          }

          // "Show answer" for Capitals: no points, goes to the review pool, moves on.
          function revealCapital() {
            if (!geoTarget || geoFeedback) return;
            upd('geoStreak', 0);
            upd('geoFeedback', { correct: false, picked: '', msg: '\uD83D\uDC41\uFE0F The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + '.' });
            announceFeedback('The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + '. Added to your review list.');
            addMissed(geoTarget.iso);
            recordContinentStat(geoTarget.continent, false);
            setTimeout(function() { pickTarget('capitals'); }, 3000);
          }



          // ── Leaflet Map Init ──

          if (!window._geoMapRef) window._geoMapRef = { current: null };

          if (!window._geoGeoJsonLayer) window._geoGeoJsonLayer = { current: null };

          var mapRef = window._geoMapRef;



          function initMap(container) {

            if (!container || !window.L) return;

            // If the stored map is attached to a DIFFERENT (detached) container — e.g.
            // the user tab-switched away and back — tear it down before making a new one.
            if (mapRef.current) {
              var sameContainer = typeof mapRef.current.getContainer === 'function' && mapRef.current.getContainer() === container;
              if (sameContainer) return; // still live, reuse
              try { mapRef.current.remove(); } catch(e) {}
              mapRef.current = null;
              if (window._geoGeoJsonLayer) window._geoGeoJsonLayer.current = null;
              window._geoLastZoomedRegion = null; // force re-zoom on the new map instance
            }

            var map = window.L.map(container, {
              worldCopyJump: false,
              maxBoundsViscosity: 1.0,
              minZoom: 2,
              maxBounds: [[-85, -180], [85, 180]]
            }).setView([20, 0], 2);

            geoTileLayer(map, false);

            mapRef.current = map;

            if (d._geoOutlinesErr) upd('_geoOutlinesErr', null); // stale error from an earlier session

            // Keyboard answering (WCAG 2.1.1). Leaflet already pans the map with the
            // arrow keys and zooms with +/- once the container has focus; this adds the
            // missing half — Enter submits whatever country sits under the centre
            // crosshair, so the tab can be completed without a pointer at all.
            container.addEventListener('keydown', function(ev) {
              if (!window._geoCrosshair) return;
              if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
              ev.preventDefault();
              var c = (typeof map.getCenter === 'function') ? map.getCenter() : null;
              if (!c) return;
              if (!window._geoCountriesGeoJSON) { announceFeedback('The country outlines are still loading.'); return; }
              var hit = countryAtLatLng(c.lat, c.lng);
              if (!hit) { announceFeedback('The crosshair is over water. Pan with the arrow keys until it is over land, then press Enter.'); return; }
              if (typeof window._geoClickHandler === 'function') window._geoClickHandler(hit.iso, hit.name);
            });

            attachOutlines(map);

          }

          // CARTO basemap. labels=false picks the *_nolabels style so the answer is not
          // printed on the map: dark_all prints country AND city names, which gave away
          // Find Country and Capitals at any zoom level.
          function geoTileLayer(m, labels) {
            var style = labels ? 'dark_all' : 'dark_nolabels';
            return window.L.tileLayer('https://{s}.basemaps.cartocdn.com/' + style + '/{z}/{x}/{y}{r}.png', {
              attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> \u00a9 <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
              maxZoom: 18, noWrap: true
            }).addTo(m);
          }

          // Shared factory for the small maps on the Capitals / Continents / Landmarks /
          // Distance tabs: same options and tiles, plus a compact attribution line
          // (CARTO's terms require one; the old mini-maps had none).
          function geoMiniMap(el, opts) {
            opts = opts || {};
            var m = window.L.map(el, Object.assign({
              zoomControl: true, scrollWheelZoom: false, dragging: true, attributionControl: false,
              maxBounds: [[-85, -180], [85, 180]], minZoom: opts.minZoom || 2
            }, opts.mapOptions || {}));
            geoTileLayer(m, !!opts.labels);
            try { window.L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(m); } catch(e) {}
            return m;
          }

          // Country polygons for the Find Country map. Separate from initMap so the
          // Retry button can call it again on the live map after a network failure.
          function attachOutlines(map) {
            loadCountriesGeoJSON()

              .then(function(geojson) {

                if (mapRef.current !== map) return; // the container was torn down while loading

                var layer = window.L.geoJSON(geojson, {

                  style: function() {

                    return { color: '#4fd1c5', weight: 1, fillColor: '#2d3748', fillOpacity: 0.6 };

                  },

                  onEachFeature: function(feature, lyr) {

                    var props = feature.properties || {};
                    var iso = featIso(props);
                    var local = resolveCountry(iso, featName(props));
                    if (!iso && local) iso = local.iso;
                    var countryName = local ? local.name : featName(props);
                    lyr._geoIso = iso;

                    lyr.on('click', function() {

                      if (typeof window._geoClickHandler === 'function') window._geoClickHandler(iso, countryName);

                    });

                    // Hover names are a scaffold: on in Easy, off otherwise (sweeping the
                    // mouse across the map would otherwise read out every country's name).
                    lyr.on('mouseover', function(ev) {

                      lyr.setStyle({ fillOpacity: 0.85, fillColor: '#4fd1c5' });
                      if (window._geoHoverNames && countryName) {
                        try { lyr.bindTooltip(countryName, { sticky: true, className: 'geo-tooltip' }).openTooltip(ev && ev.latlng); } catch(e) {}
                      }

                    });

                    lyr.on('mouseout', function() {

                      lyr.setStyle({ fillOpacity: 0.6, fillColor: '#2d3748' });
                      try { lyr.unbindTooltip(); } catch(e) {}

                    });

                  }

                }).addTo(map);

                window._geoGeoJsonLayer.current = layer;

                if (d._geoOutlinesErr) upd('_geoOutlinesErr', null);
                // Re-render trigger (see the note by _geoLibsReady): the "loading
                // outlines" pill is gated on a window ref, which React cannot see.
                upd('_geoOutlinesGen', (d._geoOutlinesGen || 0) + 1);

              })

              .catch(function(e) { console.warn('GeoJSON load failed:', e); upd('_geoOutlinesErr', String((e && e.message) || e)); });

          }



          // Set click handler — dispatches based on which tab the student is on.
          // findCountry tab: scores the click as an answer attempt.
          // globeView tab: surfaces a country info card so "Click countries for info"
          // in the tab header actually does something.

          window._geoClickHandler = function(iso, name) {

            if (geoTab === 'findCountry') { checkAnswer(iso, name); return; }

            if (geoTab === 'globeView') {
              var match = resolveCountry(iso, name);
              upd('geoGlobeInfo', match || { name: name || iso || 'Unknown', iso: iso || '', _unknown: true });
            }

          };

          // Flags read by long-lived map listeners at event time (never captured in
          // their closures, which are pinned to the first render that built the map).
          window._geoHoverNames = (geoTab === 'findCountry' && geoDifficulty === 'easy');
          window._geoCrosshair = !!(geoTab === 'findCountry' && geoCrosshair);



          // Highlight a country on the Leaflet map. Duration controls how long
          // the highlight stays visible before reverting to the default style.
          function highlightCountry(iso, color, duration) {

            var layer = window._geoGeoJsonLayer.current;

            if (!layer || !iso) return;

            layer.eachLayer(function(l) {

              var fIso = l._geoIso || featIso(l.feature && l.feature.properties);

              if (fIso === iso) {

                l.setStyle({ fillColor: color || '#48bb78', fillOpacity: 0.9, weight: 2 });

                setTimeout(function() { l.setStyle({ fillColor: '#2d3748', fillOpacity: 0.6, weight: 1 }); }, duration || 2000);

              }

            });

          }



          // Fly to country on map

          function flyToCountry(c) {

            if (mapRef.current && c) {

              mapRef.current.flyTo([c.lat, c.lng], c.area > 2000000 ? 3 : c.area > 500000 ? 4 : c.area > 100000 ? 5 : 6, { duration: 1.2 });

            }

          }



          function fitMapTo(pool, worldView) {
            var m = mapRef.current;
            if (!m) return;
            if (worldView || pool.length === 0) { m.setView([20, 0], 2); return; }
            if (pool.length === 1) { m.setView([pool[0].lat, pool[0].lng], 5); return; }
            var lats = pool.map(function(c) { return c.lat; });
            var lngs = pool.map(function(c) { return c.lng; });
            var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
            var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
            m.fitBounds([[minLat - 5, minLng - 10], [maxLat + 5, maxLng + 10]], { padding: [20, 20], maxZoom: 5 });
          }

          // Re-frame the map only when the view KEY changes, so ordinary re-renders
          // never fight the student's pan/zoom. The key is the region filter, plus the
          // target's continent in Easy mode (an auto-zoom scaffold: Easy narrows the
          // search to one continent; Medium/Hard leave the navigating to the student).
          // A wrong answer clears the key so the next question starts re-framed instead
          // of zoomed in on the reveal.
          var easyZoom = !!(geoTab === 'findCountry' && geoDifficulty === 'easy' && geoTarget);
          var _geoViewKey = geoRegion + (easyZoom ? '|' + geoTarget.continent : '');
          if (mapRef.current && window._geoLastZoomedRegion !== _geoViewKey) {
            window._geoLastZoomedRegion = _geoViewKey;
            var viewPool = filteredCountries;
            if (easyZoom) {
              var contPool = filteredCountries.filter(function(c) { return c.continent === geoTarget.continent; });
              if (contPool.length > 0) viewPool = contPool;
            }
            fitMapTo(viewPool, geoRegion === 'world' && !easyZoom);
          }



          // ── Continent colors ──

          var continentColors = { 'Africa': '#f6ad55', 'Asia': '#fc8181', 'Europe': '#63b3ed', 'North America': '#68d391', 'South America': '#b794f4', 'Oceania': '#4fd1c5' };



          // ── Globe Init ──

          if (!window._geoGlobeRef) window._geoGlobeRef = { current: null };

          var globeRef = window._geoGlobeRef;



          function initGlobe(container) {

            if (!container || !window._GlobeGLConstructor) return;

            // Stamp the container element itself — if the same DOM node is still here
            // we skip re-init, but when the tab unmounts and a fresh node comes back
            // there's no stamp, so we do re-init and get a working globe.
            if (container._geoGlobeInit) return;
            container._geoGlobeInit = true;
            globeRef.current = null; // drop any stale reference from an earlier mount

            var globeH = Math.max(320, container.clientHeight || 450);

            var globe = window._GlobeGLConstructor()(container)

              .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')

              .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')

              .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

              .showAtmosphere(true)

              .atmosphereColor('#4fd1c5')

              .atmosphereAltitude(0.25)

              .width(container.clientWidth || 600)

              .height(globeH); // was a fixed 400 inside a 450px box: a 50px dead band

            // Keep the canvas the width of its box (window resize, sidebar toggles).
            try {
              if (typeof ResizeObserver === 'function') {
                var ro = new ResizeObserver(function() {
                  if (!container.isConnected) { try { ro.disconnect(); } catch(e) {} return; }
                  var w = container.clientWidth;
                  if (w > 0) globe.width(w);
                });
                ro.observe(container);
              }
            } catch(e) {}



            // Country polygons — same cached Natural Earth file as the 2D map. Names
            // come from the quiz dataset when the ISO matches, so the globe says
            // "United States", not "United States of America". (An earlier version
            // also painted the quiz target amber here, which on this tab was a random
            // country with no explanation.)

            loadCountriesGeoJSON()

              .then(function(geojson) {

                if (!container.isConnected || !geojson || !geojson.features) return;

                var nameOf = function(f) {
                  var p = (f && f.properties) || {};
                  var local = resolveCountry(featIso(p), featName(p));
                  return local ? local.name : featName(p);
                };

                globe.polygonsData(geojson.features)
                  .polygonCapColor(function() { return 'rgba(79,209,197,0.28)'; })
                  .polygonSideColor(function() { return 'rgba(79,209,197,0.15)'; })
                  .polygonStrokeColor(function() { return '#4fd1c5'; })
                  .polygonAltitude(function() { return 0.006; })
                  .polygonLabel(function(f) {
                    var name = String(nameOf(f) || '').replace(/[<>&]/g, '');
                    return name ? '<div style="background:rgba(15,23,42,0.92);color:#fff;padding:4px 8px;border-radius:4px;font:11px system-ui"><b>' + name + '</b></div>' : '';
                  })
                  .onPolygonClick(function(f) {
                    var p = (f && f.properties) || {};
                    if (typeof window._geoClickHandler === 'function') window._geoClickHandler(featIso(p), featName(p));
                  })
                  .onPolygonHover(function(hovered) {
                    globe.polygonAltitude(function(f) { return f === hovered ? 0.02 : 0.006; });
                  });

              })

              .catch(function(e) { console.warn('Globe polygons load failed:', e); upd('_geoOutlinesErr', String((e && e.message) || e)); });



            // Add country labels

            globe.labelsData(countries.filter(function(c) { return c.area > 200000; }))

              .labelLat(function(c) { return c.lat; })

              .labelLng(function(c) { return c.lng; })

              .labelText(function(c) { return c.name; })

              .labelSize(0.6)

              .labelDotRadius(0.3)

              .labelColor(function() { return 'rgba(255,255,255,0.75)'; });



            // ── Realism upgrades: night mode, showroom spin, drifting clouds ──

            // Restore night mode if the student had it on (textures are the open-source
            // three-globe set: Blue Marble day / city-lights night, both NASA-derived)
            if (d.geoGlobeNight) {
              globe.globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg');
            }

            var geoPrefersRM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

            // Slow idle spin until the student takes the wheel
            try {
              var gControls = globe.controls();
              if (gControls && !geoPrefersRM) {
                gControls.autoRotate = true;
                gControls.autoRotateSpeed = 0.55;
                container.addEventListener('pointerdown', function() { gControls.autoRotate = false; }, { once: true });
              }
            } catch(e) {}

            // Drifting cloud shell — a slightly larger sphere wearing the three-globe
            // cloud texture. Pure enhancement: ANY failure (no THREE global, texture
            // 404, API drift) is swallowed and the globe renders exactly as before.
            function addGlobeClouds() {
              try {
                var T = window.THREE;
                if (!T || typeof globe.scene !== 'function' || typeof globe.getGlobeRadius !== 'function') return;
                new T.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-clouds.png', function(cloudTex) {
                  try {
                    var cloudMesh = new T.Mesh(
                      new T.SphereGeometry(globe.getGlobeRadius() * 1.01, 64, 64),
                      new T.MeshLambertMaterial({ map: cloudTex, transparent: true, opacity: 0.45, depthWrite: false })
                    );
                    globe.scene().add(cloudMesh);
                    (function spinClouds() {
                      if (!container.isConnected) return;
                      if (!geoPrefersRM) cloudMesh.rotation.y += 0.00032;
                      requestAnimationFrame(spinClouds);
                    })();
                  } catch(e) {}
                });
              } catch(e) {}
            }
            if (window.THREE) { addGlobeClouds(); }
            else {
              window.StemLab.ensureThree({ orbit: false }).then(addGlobeClouds).catch(function () { console.warn('[Geo] Three.js failed to load for globe clouds'); });
            }

            globeRef.current = globe;

          }



          // ── Size Compare helper ──

          var sizeTarget1 = d.geoSize1 || null;

          var sizeTarget2 = d.geoSize2 || null;

          // Pair pickers for Size Compare and Distance. A region with a single
          // qualifying country (Central Asia = Kazakhstan alone) used to spin the old
          // `while (b.iso === a.iso)` loop forever and freeze the tab.
          function pairPool(minArea) {
            var pool = filteredCountries.filter(function(c) { return c.area > minArea; });
            if (pool.length < 2) pool = countries.filter(function(c) { return c.area > minArea; });
            return pool;
          }
          function pickTwo(pool) {
            var a = pool[Math.floor(Math.random() * pool.length)];
            var b = a, guard = 0;
            while (b.iso === a.iso && guard++ < 50) b = pool[Math.floor(Math.random() * pool.length)];
            return [a, b];
          }

          function pickSizePair() {

            var pair = pickTwo(pairPool(5000));

            upd('geoSize1', pair[0]); upd('geoSize2', pair[1]); upd('geoFeedback', null);

          }

          if (geoTab === 'sizeCompare' && !sizeTarget1) setTimeout(pickSizePair, 0);



          function checkSizeAnswer(pickedIso) {

            if (!sizeTarget1 || !sizeTarget2 || geoFeedback) return;

            var bigger = sizeTarget1.area >= sizeTarget2.area ? sizeTarget1 : sizeTarget2;

            if (pickedIso === bigger.iso) {

              upd('geoScore', geoScore + 10);

              upd('geoStreak', geoStreak + 1);

              upd('geoFeedback', { correct: true, picked: pickedIso, msg: '\u2705 Correct! ' + bigger.name + ' (' + bigger.area.toLocaleString() + ' km\u00b2) is bigger.' });

              announceFeedback('Correct. ' + bigger.name + ', at ' + bigger.area.toLocaleString() + ' square kilometers, is larger.');

              if (typeof stemBeep === 'function') stemBeep('correct');
              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'Size compare');

              // Longer delay so students can study the proportional bars
              setTimeout(pickSizePair, 2200);

            } else {

              upd('geoStreak', 0);

              var smaller = pickedIso === sizeTarget1.iso ? sizeTarget2 : sizeTarget1;

              if (typeof stemBeep === 'function') stemBeep('wrong');

              upd('geoFeedback', { correct: false, picked: pickedIso, msg: '\u274C ' + bigger.name + ' (' + bigger.area.toLocaleString() + ' km\u00b2) is actually bigger than ' + smaller.name + ' (' + smaller.area.toLocaleString() + ' km\u00b2).' });

              announceFeedback('Incorrect. ' + bigger.name + ' is larger than ' + smaller.name + '.');

              setTimeout(pickSizePair, 3200);

            }

          }


          // ── Haversine distance (km) ──
          function haversineKm(lat1, lon1, lat2, lon2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          }

          // ── Great-circle interpolation — returns N+1 lat/lng points along the
          // shortest path on the sphere between two points. A straight line on
          // a Mercator map is NOT the shortest path (e.g. NYC→Tokyo curves
          // over the Arctic), so we interpolate with spherical slerp.
          function greatCircleLatLngs(lat1, lon1, lat2, lon2, numPoints) {
            var toRad = Math.PI / 180, toDeg = 180 / Math.PI;
            var f1 = lat1 * toRad, l1 = lon1 * toRad;
            var f2 = lat2 * toRad, l2 = lon2 * toRad;
            var dLat = f2 - f1, dLon = l2 - l1;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var d = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
            if (d === 0) return [[lat1, lon1]];
            var pts = [];
            var n = numPoints || 64;
            for (var i = 0; i <= n; i++) {
              var t = i / n;
              var A = Math.sin((1 - t) * d) / Math.sin(d);
              var B = Math.sin(t * d) / Math.sin(d);
              var x = A * Math.cos(f1) * Math.cos(l1) + B * Math.cos(f2) * Math.cos(l2);
              var y = A * Math.cos(f1) * Math.sin(l1) + B * Math.cos(f2) * Math.sin(l2);
              var z = A * Math.sin(f1) + B * Math.sin(f2);
              pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg, Math.atan2(y, x) * toDeg]);
            }
            return pts;
          }

          // ── Distance Challenge helpers ──
          // Capital to capital (see GEO_CAPITAL_LL), in the student's chosen unit.
          var KM_PER_MILE = 1.609344;
          var geoDistUnit = d.geoDistUnit === 'mi' ? 'mi' : 'km';
          function fmtDist(km, unit) {
            unit = unit || geoDistUnit;
            return Math.round(unit === 'mi' ? km / KM_PER_MILE : km).toLocaleString() + ' ' + unit;
          }
          function fmtBoth(km) {
            return geoDistUnit === 'mi'
              ? Math.round(km / KM_PER_MILE).toLocaleString() + ' mi (' + Math.round(km).toLocaleString() + ' km)'
              : Math.round(km).toLocaleString() + ' km (' + Math.round(km / KM_PER_MILE).toLocaleString() + ' mi)';
          }
          function distanceKmBetween(a, b) {
            var p = capitalLatLng(a), q = capitalLatLng(b);
            return haversineKm(p[0], p[1], q[0], q[1]);
          }

          // Offline question generator for the Quiz Builder. The AI path needs a
          // configured Gemini backend, which plenty of school deployments do not have —
          // the tab was a dead end there ("AI is not available in this build"). This
          // builds the same 10-question shape straight from the dataset, so the tab
          // works with AI off and doubles as a deliberate no-network drill.
          function buildPracticePack(count, pool) {
            var src = (pool && pool.length >= 8) ? pool : countries;
            var picks = src.slice();
            for (var i = picks.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var tmp = picks[i]; picks[i] = picks[j]; picks[j] = tmp;
            }
            var n = Math.min(count || 10, picks.length);
            var out = [];
            for (var k = 0; k < n; k++) {
              var c = picks[k];
              var other = picks[(k + 1) % n];
              var kind = k % 4;
              if (kind === 0) {
                out.push({
                  question: 'What is the capital of ' + c.name + '?',
                  answer: c.capital,
                  hint: 'It is in ' + c.region + '.',
                  fact: c.capital + ' is the capital of ' + c.name + ', in ' + c.continent + '.'
                });
              } else if (kind === 1) {
                out.push({
                  question: 'Which continent is ' + c.name + ' in?',
                  answer: c.continent,
                  // NOT the UN region: for every South American country the region IS
                  // "South America", so that hint handed over the answer.
                  hint: 'Its capital is ' + c.capital + '.',
                  fact: c.name + ' sits in ' + c.region + ', part of ' + c.continent + '.'
                });
              } else if (kind === 2) {
                out.push({
                  question: c.capital + ' is the capital of which country?',
                  answer: c.name,
                  hint: 'Look in ' + c.continent + '.',
                  fact: c.name + ' covers about ' + c.area.toLocaleString() + ' km².'
                });
              } else {
                var bigger = c.area >= other.area ? c : other;
                var smaller = bigger === c ? other : c;
                out.push({
                  question: 'Which is larger by land area, ' + c.name + ' or ' + other.name + '?',
                  answer: bigger.name,
                  hint: 'Judge the real area, not how big it looks on a Mercator map.',
                  fact: bigger.name + ' is about ' + (bigger.area / smaller.area).toFixed(1) + '× the area of ' + smaller.name + '.'
                });
              }
            }
            return out;
          }

          function pickDistancePair() {
            var pair = pickTwo(pairPool(10000));
            upd('geoDistA', pair[0]); upd('geoDistB', pair[1]);
            upd('geoDistGuess', ''); upd('geoDistFeedback', null);
          }

          if (geoTab === 'distance' && !geoDistA) setTimeout(pickDistancePair, 0);

          function checkDistanceAnswer() {
            if (!geoDistA || !geoDistB) return;
            if (geoDistFeedback && typeof geoDistFeedback.actual === 'number') return; // already graded
            var actualKm = Math.round(distanceKmBetween(geoDistA, geoDistB));
            var guessRaw = parseFloat(geoDistGuess);
            if (isNaN(guessRaw) || guessRaw <= 0) {
              upd('geoDistFeedback', { correct: false, msg: '⚠️ Type a distance in ' + (geoDistUnit === 'mi' ? 'miles' : 'kilometers') + ' first.' });
              return;
            }
            var guessKm = geoDistUnit === 'mi' ? guessRaw * KM_PER_MILE : guessRaw;
            var pctOff = Math.abs(guessKm - actualKm) / actualKm;
            var pctTxt = Math.round(pctOff * 100) + '%';
            var route = geoDistA.capital + ' → ' + geoDistB.capital;
            if (pctOff <= 0.15) {
              var pts = pctOff <= 0.05 ? 20 : pctOff <= 0.10 ? 15 : 10;
              upd('geoScore', geoScore + pts);
              upd('geoStreak', geoStreak + 1);
              upd('geoDistCorrect', geoDistCorrect + 1);
              upd('geoDistFeedback', { correct: true, actual: actualKm, guess: guessKm, pctOff: pctOff, msg: '✅ Great! ' + route + ' is ' + fmtBoth(actualKm) + ' — you were ' + pctTxt + ' off. +' + pts + ' pts' });
              announceFeedback('Close enough. ' + route + ' is ' + fmtDist(actualKm) + '. You were ' + pctTxt + ' off. Plus ' + pts + ' points.');
              if (typeof stemBeep === 'function') stemBeep('correct');
              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', pts, 'Distance estimate');
              setTimeout(pickDistancePair, 3500);
            } else {
              upd('geoStreak', 0);
              var direction = guessKm > actualKm ? 'Too far.' : 'Too close.';
              upd('geoDistFeedback', { correct: false, actual: actualKm, guess: guessKm, pctOff: pctOff, msg: '❌ ' + direction + ' ' + route + ' is ' + fmtBoth(actualKm) + '; you said ' + fmtDist(guessKm) + ' (' + pctTxt + ' off). Within 15% scores.' });
              announceFeedback('Not quite. ' + direction + ' ' + route + ' is ' + fmtDist(actualKm) + '. You were ' + pctTxt + ' off.');
              if (typeof stemBeep === 'function') stemBeep('wrong');
              setTimeout(pickDistancePair, 4500);
            }
          }

          // ── Badge definitions ──
          var GEO_BADGES = [
            { id: 'explorer', icon: '🧭', name: __alloT('stem.geo.explorer_2', 'Explorer'), desc: __alloT('stem.geo.answer_10_questions', 'Answer 10 questions'), check: function() { return geoAnswered.length >= 10; } },
            { id: 'streak5', icon: '🔥', name: __alloT('stem.geo.on_fire', 'On Fire'), desc: __alloT('stem.geo.5x_streak', '5x streak'), check: function() { return geoStreak >= 5; } },
            { id: 'century', icon: '💯', name: __alloT('stem.geo.century', 'Century'), desc: __alloT('stem.geo.reach_100_points', 'Reach 100 points'), check: function() { return geoScore >= 100; } },
            { id: 'distPro', icon: '📍', name: __alloT('stem.geo.distance_pro', 'Distance Pro'), desc: __alloT('stem.geo.nail_5_distance_challenges', 'Nail 5 distance challenges'), check: function() { return geoDistCorrect >= 5; } },
            { id: 'globetrotter', icon: '✈️', name: __alloT('stem.geo.globetrotter_2', 'Globetrotter'), desc: __alloT('stem.geo.answer_25_questions', 'Answer 25 questions'), check: function() { return geoAnswered.length >= 25; } },
            { id: 'streak10', icon: '⚡', name: __alloT('stem.geo.lightning', 'Lightning'), desc: __alloT('stem.geo.10x_streak', '10x streak'), check: function() { return geoStreak >= 10; } }
          ];

          // Derive newly-earned badges this render (pure — no side effects)
          var _newlyEarnedBadges = [];
          GEO_BADGES.forEach(function(b) {
            if (!geoBadges[b.id] && b.check()) _newlyEarnedBadges.push(b);
          });
          // Schedule a single deferred burst OUTSIDE React's render cycle.
          // The window-level flag prevents duplicate bursts from rapid re-renders that
          // would otherwise pile up pending timers and fire addToast mid-render
          // (root cause of "Cannot update StemLabModal while rendering StemPluginBridge").
          if (_newlyEarnedBadges.length > 0 && !window._geoBadgeAwardPending) {
            window._geoBadgeAwardPending = true;
            var _earnedSnapshot = _newlyEarnedBadges;
            var _prevBadges = geoBadges;
            setTimeout(function() {
              window._geoBadgeAwardPending = false;
              var merged = Object.assign({}, _prevBadges);
              _earnedSnapshot.forEach(function(b) {
                merged[b.id] = true;
                if (addToast) addToast(b.icon + ' Badge: ' + b.name + '!', 'success');
                if (typeof stemCelebrate === 'function') stemCelebrate();
              });
              upd('geoBadges', merged);
            }, 0);
          }


          // ── Tab definitions ──

          var geoTabs = [

            { id: 'findCountry', icon: '\uD83D\uDDFA\uFE0F', label: __alloT('stem.geo.find_country', 'Find Country') },

            { id: 'capitals', icon: '\uD83C\uDFDB\uFE0F', label: __alloT('stem.geo.capitals', 'Capitals') },

            { id: 'continents', icon: '\uD83C\uDF0D', label: __alloT('stem.geo.continents', 'Continents') },

            { id: 'landmarks', icon: '\uD83C\uDFD4\uFE0F', label: __alloT('stem.geo.landmarks', 'Landmarks') },

            { id: 'sizeCompare', icon: '\uD83D\uDCCF', label: __alloT('stem.geo.size_compare', 'Size Compare') },

            { id: 'globeView', icon: '\uD83C\uDF10', label: __alloT('stem.geo.globe_view', 'Globe View') },

            { id: 'quizBuilder', icon: '\uD83C\uDFC6', label: __alloT('stem.geo.quiz_builder', 'Quiz Builder') },

            { id: 'distance', icon: '\uD83D\uDCCD', label: __alloT('stem.geo.distance', 'Distance') },

            { id: 'distHunt', icon: '\uD83C\uDF9A\uFE0F', label: __alloT('stem.geo.distance_sense', 'Distance Sense') }

          ];



          // ── RENDER ──

          return React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg overflow-hidden', style: { minHeight: 600 } },



            // ── Header bar ──

            React.createElement('div', { className: 'bg-gradient-to-r from-teal-700 to-cyan-700 text-white p-3 flex items-center justify-between' },

              React.createElement('div', { className: 'flex items-center gap-2' },

                React.createElement('span', { className: 'text-xl' }, '\uD83C\uDF0D'),

                React.createElement('span', { className: 'font-bold text-sm' }, __alloT('stem.geo.geography_explorer', 'Geography Explorer')),

                React.createElement('span', { className: 'text-xs bg-white/20 rounded-full px-2 py-0.5' }, filteredCountries.length + ' countries')

              ),

              React.createElement('div', { className: 'flex items-center gap-3' },

                // Level pill — shows current rank + progress to the next level
                React.createElement('span', {
                  className: 'text-xs bg-white/25 text-white rounded-full px-2 py-0.5 font-bold flex items-center gap-1',
                  title: geoCurrentLevel.next
                    ? geoCurrentLevel.name + ' \u2014 ' + geoAnswered.length + '/' + geoCurrentLevel.next + ' mastered to reach the next rank'
                    : 'Highest rank reached \u2014 ' + geoAnswered.length + ' countries mastered'
                },
                  React.createElement('span', null, geoCurrentLevel.icon),
                  React.createElement('span', null, geoCurrentLevel.name)
                ),

                React.createElement('span', { className: 'text-xs bg-yellow-400 text-yellow-900 rounded-full px-2 py-0.5 font-bold' }, '\u2B50 ' + geoScore),

                geoStreak >= 3 && (function() {
                  // Tiered streak pill: color + icon escalate as the streak grows,
                  // giving visual feedback beyond a raw number.
                  var tier = geoStreak >= 20 ? 'gold' : geoStreak >= 10 ? 'red' : geoStreak >= 5 ? 'orange' : 'amber';
                  var icons = geoStreak >= 20 ? '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25'
                            : geoStreak >= 10 ? '\uD83D\uDD25\uD83D\uDD25'
                            : '\uD83D\uDD25';
                  var cls = tier === 'gold' ? 'bg-gradient-to-r from-amber-300 to-yellow-500 text-amber-900 ring-2 ring-amber-200'
                          : tier === 'red' ? 'bg-red-600 text-white'
                          : tier === 'orange' ? 'bg-orange-400 text-orange-950'
                          : 'bg-amber-300 text-amber-900';
                  return React.createElement('span', { className: 'text-xs rounded-full px-2 py-0.5 font-bold animate-pulse ' + cls, title: 'Current streak: ' + geoStreak + ' in a row' }, icons + ' ' + geoStreak + 'x');
                })(),

                // Review badge — spaced-repetition pill. Clickable to toggle review-only mode.
                geoMissed.length > 0 && React.createElement('button', {
                  onClick: function() {
                    var entering = !geoReviewMode;
                    upd('geoReviewMode', entering);
                    upd('geoTarget', null);
                    upd('geoFeedback', null);
                    if (addToast) addToast(entering ? '\uD83D\uDD01 Review mode: drilling ' + geoMissed.length + ' missed' : '\u2705 Back to full rotation', 'info');
                  },
                  className: 'text-xs rounded-full px-2 py-0.5 font-bold transition-colors ' +
                             (geoReviewMode ? 'bg-amber-400 text-amber-900 ring-2 ring-amber-200' : 'bg-white/20 text-white hover:bg-white/30'),
                  title: geoReviewMode
                    ? 'Review mode ON — only missed countries. Click to resume normal rotation.'
                    : 'Click to drill only the ' + geoMissed.length + ' ' + (geoMissed.length === 1 ? 'country' : 'countries') + ' you missed.'
                }, '\uD83D\uDD01 ' + geoMissed.length),

                // Region filter — graduated from easy (few countries) to hard (many).
                // Each continent is an optgroup with the continent as "All" option plus
                // sub-regions (Southern Europe, Southeast Asia, etc.) for finer control.
                React.createElement('select', {
                  'aria-label': __alloT('stem.geo.quiz_region', 'Quiz region'),
                  value: geoRegion,
                  // Changing region no longer wipes geoAnswered \u2014 that reset the level
                  // pill to Novice; the picker already recycles per region.
                  onChange: function(e) { upd('geoRegionFilter', e.target.value); upd('geoTarget', null); upd('geoFeedback', null); },
                  className: 'text-xs bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white',
                  title: __alloT('stem.geo.smaller_regions_easier_quiz_start_smal', 'Smaller regions = easier quiz. Start small, expand as you improve.')
                },
                  // Options carry their own dark ink: they inherit the select's white text,
                  // and the OS dropdown paints them on white \u2014 white-on-white otherwise.
                  [React.createElement('option', { key: 'world', value: 'world', style: { color: '#0f172a', background: '#ffffff' } }, '\uD83C\uDF0D World (' + countries.length + ')')]
                    .concat(_regionGroups.map(function(grp) {
                      var opts = [React.createElement('option', { key: grp.id, value: grp.id, style: { color: '#0f172a', background: '#ffffff' } }, 'All of ' + grp.label + ' (' + grp.count + ')')];
                      grp.subs.forEach(function(sub) {
                        opts.push(React.createElement('option', { key: sub.id, value: sub.id, style: { color: '#0f172a', background: '#ffffff' } }, '\u2002\u2014 ' + sub.label + ' (' + sub.count + ')'));
                      });
                      return React.createElement('optgroup', { key: grp.id + '_group', label: grp.label + ' (' + grp.count + ')' }, opts);
                    }))
                ),

                // Difficulty

                React.createElement('select', {
                  'aria-label': __alloT('stem.geo.quiz_difficulty', 'Quiz difficulty'),

                  value: geoDifficulty,

                  onChange: function(e) { upd('geoDifficulty', e.target.value); },

                  className: 'text-xs bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white',

                  title: __alloT('stem.geo.difficulty_title', 'Find Country: Easy zooms to the continent, names countries on hover and shows the region; Medium shows the continent; Hard shows nothing. Capitals: Easy adds multiple choice. Points scale 5 / 10 / 15.')

                },

                  React.createElement('option', { value: 'easy', style: { color: '#0f172a', background: '#ffffff' } }, __alloT('stem.geo.easy_hints', 'Easy — hints')),

                  React.createElement('option', { value: 'medium', style: { color: '#0f172a', background: '#ffffff' } }, __alloT('stem.geo.medium_continent_only', 'Medium — continent only')),

                  React.createElement('option', { value: 'hard', style: { color: '#0f172a', background: '#ffffff' } }, __alloT('stem.geo.hard_no_hints', 'Hard — no hints'))

                )

              )

            ),



            // ── Tab bar ──

            React.createElement('div', { className: 'flex overflow-x-auto border-b bg-slate-50', role: 'tablist', 'aria-label': __alloT('stem.geo.geography_activities', 'Geography activities') },

              geoTabs.map(function(tab) {

                return React.createElement('button', {

                  key: tab.id,

                  role: 'tab',

                  'aria-selected': geoTab === tab.id,

                  onClick: function() {

                    upd('geoTab', tab.id);

                    upd('geoFeedback', null);

                    upd('geoTarget', null);

                    if (tab.id === 'globeView' && !window._globeLibLoaded) {

                      loadGlobeLib().then(function() { upd('_globeLibReady', true); });

                    }

                  },

                  className: 'whitespace-nowrap px-3 py-2 text-xs font-medium transition-all border-b-2 ' +

                    (geoTab === tab.id ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-slate-600 hover:text-slate-700')

                }, tab.icon + ' ' + tab.label);

              })

            ),

            // ── Topic-accent hero band per tab ──
            (function() {
              // Accents are the 700 shades: the 600s measured 3.2\u20133.7:1 as 15px text on
              // the white card. Copy checked for unsupported claims (the old "sticks 10\u00d7
              // better" and "NCSS aligned" lines had no source) and for the
              // diameter/radius mix-up in the globe blurb.
              var TAB_META = {
                findCountry:  { accent: '#0f766e', soft: 'rgba(13,148,136,0.10)', icon: '\uD83D\uDDFA', title: __alloT('stem.geo.find_country_the_visual_atlas', 'Find Country \u2014 the visual atlas'),                hint: __alloT('stem.geo.hero_find_country', 'Click the country on the map. Easy zooms to its continent and names countries on hover; Hard gives no hints. The map is a Mercator projection, which stretches land near the poles \u2014 Greenland looks as big as Africa but is 14\u00d7 smaller.') },
                capitals:     { accent: '#7e22ce', soft: 'rgba(147,51,234,0.10)', icon: '\uD83C\uDFDB', title: __alloT('stem.geo.capitals_govt_seats_cultural_anchors', 'Capitals \u2014 govt seats + cultural anchors'),         hint: __alloT('stem.geo.hero_capitals', 'Spelling is forgiving: accents and punctuation are ignored. Some countries split their capital \u2014 South Africa has three (Pretoria, Cape Town, Bloemfontein), Bolivia two (Sucre, La Paz), and the Netherlands governs from The Hague while Amsterdam is the constitutional capital. Those alternates are accepted.') },
                continents:   { accent: '#15803d', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83C\uDF0D', title: __alloT('stem.geo.continents_7_or_5_depending_who_you_as', 'Continents \u2014 7 (or 5, depending who you ask)'),     hint: __alloT('stem.geo.hero_continents', 'The 7-continent model (US/UK): Africa, Antarctica, Asia, Australia, Europe, North America, South America. Many countries teach 6 (one America) or 5 (Eurasia). Here Australia and the Pacific islands are grouped as Oceania, and Antarctica has no countries. Russia and Turkey straddle two continents.') },
                landmarks:    { accent: '#b45309', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFD4', title: __alloT('stem.geo.landmarks_the_visual_mnemonics', 'Landmarks \u2014 the visual mnemonics'),                hint: __alloT('stem.geo.hero_landmarks', 'Eiffel Tower (Paris), Christ the Redeemer (Rio), Sydney Opera House, Petra (Jordan), Angkor Wat (Cambodia). A vivid place gives memory a second handle on the country (dual coding). Some landmarks sit on a border \u2014 either country is accepted.') },
                sizeCompare:  { accent: '#0e7490', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83D\uDCCF', title: __alloT('stem.geo.size_compare_fight_mercator_distortion', 'Size Compare \u2014 fight Mercator distortion'),          hint: __alloT('stem.geo.russia_is_17m_km_largest_usa_china_ind', 'Russia is 17M km\u00b2 (largest). USA + China + India fit inside Russia with room to spare. Africa is 30M km\u00b2 \u2014 fits USA + China + India + Mexico + Western Europe combined. Maps lie about scale.') },
                globeView:    { accent: '#1d4ed8', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83C\uDF10', title: __alloT('stem.geo.globe_view_honest_spherical_geometry', 'Globe View \u2014 honest spherical geometry'),           hint: __alloT('stem.geo.hero_globe', 'Earth is an oblate spheroid \u2014 about 43 km wider across the equator than from pole to pole. The shortest path between two cities is a great-circle arc, not a straight line on a flat map, which is why flights bend over the Arctic.') },
                quizBuilder:  { accent: '#b91c1c', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83C\uDFC6', title: __alloT('stem.geo.quiz_builder_graded_geography_practice', 'Quiz Builder \u2014 graded geography practice'),         hint: __alloT('stem.geo.hero_quiz_builder', 'Describe a topic and get 10 short-answer questions pitched at your grade. Retrieval practice \u2014 pulling an answer from memory \u2014 beats re-reading for long-term recall (Karpicke & Roediger, 2008).') },
                distance:     { accent: '#c2410c', soft: 'rgba(234,88,12,0.10)',  icon: '\uD83D\uDCCD', title: __alloT('stem.geo.distance_great_circle_math', 'Distance \u2014 great-circle math'),                    hint: __alloT('stem.geo.hero_distance', 'Capital to capital along the great circle (the haversine formula). New York to Tokyo is about 10,850 km over the Arctic \u2014 shorter than the flat-map straight line. Anchors: London\u2013Paris 340 km, New York\u2013Los Angeles 3,940 km, London\u2013Sydney 17,000 km.') },
                distHunt:     { accent: '#0e7490', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83C\uDF9A', title: __alloT('stem.geo.distance_sense_calibrate_your_gut', 'Distance Sense \u2014 calibrate your gut'),               hint: __alloT('stem.geo.hero_dist_hunt', 'No score here. Slide to a distance, see which real capital-to-capital journeys are about that far, and note how confident you feel. The farthest two places on Earth can be is 20,037 km \u2014 half the circumference.') }
              };
              var meta = TAB_META[geoTab] || TAB_META.findCountry;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // ── Feedback bar ──

            // Only for the tabs that do not render their own inline feedback line
            // (Continents / Size Compare / Quiz Builder do, so this showed every
            // message twice there).
            geoFeedback && (geoTab === 'findCountry' || geoTab === 'capitals') && React.createElement('div', {

              role: 'status',

              className: 'px-4 py-2 text-sm font-bold text-center transition-all ' +

                (geoFeedback.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')

            }, geoFeedback.msg),



            // ═══ FIND COUNTRY TAB ═══

            geoTab === 'findCountry' && React.createElement('div', null,

              // Question

              // Question \u2014 the hint scales with difficulty (Easy: continent + region,
              // Medium: continent, Hard: name only). Difficulty used to change only the
              // points while the region was always printed.
              geoTarget && React.createElement('div', { className: 'text-center py-3 bg-gradient-to-r from-slate-50 to-teal-50 border-b' },

                React.createElement('p', { className: 'text-xs text-slate-600' }, __alloT('stem.geo.click_on_the_map_to_find', 'Click on the map to find:')),

                React.createElement('p', { className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDDFA\uFE0F ' + geoTarget.name),

                geoDifficulty === 'easy' && React.createElement('p', { className: 'text-[11px] text-slate-600' }, geoTarget.continent + ' \u2022 ' + geoTarget.region),

                geoDifficulty === 'medium' && React.createElement('p', { className: 'text-[11px] text-slate-600' }, geoTarget.continent),

                geoDifficulty === 'hard' && React.createElement('p', { className: 'text-[11px] text-slate-500 italic' }, __alloT('stem.geo.no_hints_on_hard', 'No hints on Hard')),

                // Keyboard-reachable escape hatch: the map itself is pointer-only.
                React.createElement('button', {
                  onClick: revealTarget,
                  disabled: !!geoFeedback,
                  className: 'mt-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:border-teal-600 hover:text-teal-800 disabled:opacity-50',
                  title: __alloT('stem.geo.reveal_title', 'Show where it is (no points; the country goes to your review list)')
                }, __alloT('stem.geo.show_me', '\uD83D\uDC41\uFE0F Show me')),

                // Keyboard answering (WCAG 2.1.1): the map is otherwise pointer-only,
                // so the whole tab was unreachable without a mouse.
                React.createElement('button', {
                  onClick: function() {
                    var on = !geoCrosshair;
                    upd('geoCrosshair', on);
                    announceFeedback(on
                      ? 'Keyboard mode on. Click the map once to focus it, then use the arrow keys to move the crosshair, plus and minus to zoom, and Enter to answer with the country under the crosshair.'
                      : 'Keyboard mode off.');
                  },
                  'aria-pressed': geoCrosshair,
                  className: 'mt-1 ml-2 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ' +
                             (geoCrosshair ? 'bg-teal-700 text-white border-teal-800' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-600 hover:text-teal-800'),
                  title: __alloT('stem.geo.keyboard_mode_title', 'Answer without a mouse: focus the map, arrow keys move the crosshair, + and - zoom, Enter answers.')
                }, geoCrosshair ? __alloT('stem.geo.keyboard_mode_on', '\u2328\uFE0F Keyboard mode: on') : __alloT('stem.geo.keyboard_mode', '\u2328\uFE0F Keyboard mode')),

                geoCrosshair && React.createElement('p', { className: 'text-[11px] text-teal-800 mt-1' },
                  __alloT('stem.geo.keyboard_mode_help', 'Click the map once to focus it \u00B7 arrow keys move \u00B7 + and \u2212 zoom \u00B7 Enter answers with the country under the crosshair'))

              ),

              // Map container + status overlays (library loading / outlines loading / outlines failed)

              React.createElement('div', { className: 'relative' },

                React.createElement('div', {

                  ref: function(el) { if (el && window.L) initMap(el); },

                  style: { height: '100%', minHeight: 400, maxHeight: 'calc(100vh - 200px)', width: '100%', background: '#1a202c' },

                  id: 'geo-quiz-map',

                  role: 'region',

                  'aria-label': __alloT('stem.geo.map_aria', 'World map. Click the country named above, or use the Show me button if you cannot use the map.')

                }),

                // Centre crosshair — the target the Enter key answers with.
                geoCrosshair && React.createElement('div', {
                  className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
                  'aria-hidden': 'true'
                },
                  React.createElement('div', { style: { position: 'relative', width: 40, height: 40 } },
                    React.createElement('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #fbbf24', boxShadow: '0 0 0 2px rgba(0,0,0,0.55)' } }),
                    React.createElement('div', { style: { position: 'absolute', left: 19, top: -10, width: 2, height: 60, background: '#fbbf24', opacity: 0.85 } }),
                    React.createElement('div', { style: { position: 'absolute', top: 19, left: -10, height: 2, width: 60, background: '#fbbf24', opacity: 0.85 } })
                  )
                ),

                (!window.L || (!window._geoGeoJsonLayer.current && !d._geoOutlinesErr)) && React.createElement('div', {
                  className: 'absolute inset-x-0 top-2 flex justify-center pointer-events-none', 'aria-live': 'polite'
                },
                  React.createElement('span', { className: 'text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900/80 text-white' },
                    !window.L ? __alloT('stem.geo.loading_map', '\u23F3 Loading map\u2026') : __alloT('stem.geo.loading_country_outlines', '\u23F3 Loading country outlines\u2026'))
                ),

                d._geoOutlinesErr && React.createElement('div', { className: 'absolute inset-x-0 top-2 flex justify-center px-3' },
                  React.createElement('div', { className: 'text-xs px-3 py-2 rounded-lg bg-red-50 border border-red-300 text-red-800 flex items-center gap-2 shadow', role: 'alert' },
                    React.createElement('span', null, __alloT('stem.geo.outlines_failed', '\u26A0\uFE0F Country outlines could not be downloaded (offline?). The map cannot be clicked until they load.')),
                    React.createElement('button', {
                      onClick: function() { upd('_geoOutlinesErr', null); if (mapRef.current) attachOutlines(mapRef.current); },
                      className: 'px-2 py-0.5 rounded bg-red-700 text-white font-bold hover:bg-red-800 whitespace-nowrap'
                    }, __alloT('stem.geo.retry', 'Retry'))
                  )
                )

              ),

              // Progress (in-region count: geoAnswered spans every region)

              React.createElement('div', { className: 'px-4 py-2 bg-slate-50 flex justify-between text-[11px] text-slate-600' },

                React.createElement('span', null, '\u2705 ' + answeredInRegion + '/' + filteredCountries.length + ' found' +
                  ((filteredCountries.length > 0 && answeredInRegion >= filteredCountries.length) ? ' \u2014 all of them! Keep drilling, or pick a bigger region.' : '')),

                React.createElement('span', null, 'Round ' + geoRound),

                React.createElement('button', {

                  onClick: function() { upd('geoAnswered', []); upd('geoScore', 0); upd('geoStreak', 0); upd('geoRound', 0); pickTarget('findCountry'); },

                  className: 'text-teal-700 hover:text-teal-900 font-bold',

                  title: __alloT('stem.geo.reset_find_title', 'Clear the found list, score and streak')

                }, __alloT('stem.geo.reset', '\u267B Reset'))

              )

            ),



            // ═══ CAPITALS TAB ═══

            geoTab === 'capitals' && React.createElement('div', { className: 'p-4' },

              geoTarget && React.createElement('div', { className: 'max-w-lg mx-auto' },

                React.createElement('div', { className: 'text-center mb-3' },

                  React.createElement('p', { className: 'text-xs text-slate-600 mb-1' }, __alloT('stem.geo.what_is_the_capital_of', 'What is the capital of:')),

                  React.createElement('p', { className: 'text-2xl font-bold text-slate-800' }, '\uD83C\uDFDB\uFE0F ' + geoTarget.name),

                  React.createElement('p', { className: 'text-xs text-slate-600' }, geoTarget.continent)

                ),

                // Mini-map: where the country sits. Helps recall by anchoring the
                // capital question in spatial memory ("oh right, near the Indus...").
                window.L && React.createElement('div', {
                  ref: function(el) {
                    if (!el || !window.L) return;
                    if (!window._geoCapitalMapRef) window._geoCapitalMapRef = { current: null, iso: '', answered: false };
                    var cmRef = window._geoCapitalMapRef;
                    var answered = !!geoFeedback;
                    var sameContainer = cmRef.current && typeof cmRef.current.getContainer === 'function' && cmRef.current.getContainer() === el;
                    if (sameContainer && cmRef.iso === geoTarget.iso && cmRef.answered === answered) return;
                    if (cmRef.current) { try { cmRef.current.remove(); } catch(e) {} cmRef.current = null; }
                    el.innerHTML = '';
                    setTimeout(function() {
                      try {
                        var zoom = geoTarget.area > 5000000 ? 3 : geoTarget.area > 1500000 ? 4 : geoTarget.area > 300000 ? 5 : 6;
                        var capLL = capitalLatLng(geoTarget);
                        // No-label tiles: dark_all printed the capital's name right next to the marker.
                        var m = geoMiniMap(el, { labels: false }).setView([geoTarget.lat, geoTarget.lng], zoom);
                        var markerColor = answered ? (geoFeedback.correct ? '#22c55e' : '#ef4444') : '#fbbf24';
                        // Country = soft circle on the centroid; capital = dot at the REAL city
                        // (used to sit on the centroid too, which put "Ottawa" in Nunavut).
                        window.L.circle([geoTarget.lat, geoTarget.lng], { radius: 80000, color: markerColor, weight: 1.5, fillColor: markerColor, fillOpacity: 0.12 }).addTo(m);
                        var cap = window.L.circleMarker(capLL, { radius: answered ? 9 : 5, color: markerColor, weight: 3, fillColor: markerColor, fillOpacity: 0.6 }).addTo(m);
                        // After the answer, name the capital where it actually is
                        if (answered) cap.bindPopup('<b>\uD83D\uDCCD ' + geoTarget.capital + '</b>').openPopup();
                        cmRef.current = m;
                        cmRef.iso = geoTarget.iso;
                        cmRef.answered = answered;
                      } catch(e) { console.warn('Capital map error:', e); }
                    }, 50);
                  },
                  style: { height: 180, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '2px solid #e2e8f0' }
                }),

                React.createElement('div', { className: 'flex gap-2 mx-auto' },

                  React.createElement('input', {

                    type: 'text',

                    placeholder: __alloT('stem.geo.type_the_capital_city', 'Type the capital city...'),

                    'aria-label': __alloT('stem.geo.capital_city_answer', 'Capital city answer'),

                    value: d.geoCapitalInput || '',

                    disabled: !!geoFeedback,

                    onChange: function(e) { upd('geoCapitalInput', e.target.value); },

                    onKeyDown: function(e) { if (e.key === 'Enter' && !geoFeedback) { checkCapitalAnswer(d.geoCapitalInput || ''); upd('geoCapitalInput', ''); } },

                    className: 'flex-1 px-3 py-2 rounded-lg border border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-slate-50 disabled:text-slate-300'

                  }),

                  React.createElement('button', {

                    onClick: function() { if (!geoFeedback) { checkCapitalAnswer(d.geoCapitalInput || ''); upd('geoCapitalInput', ''); } },

                    disabled: !!geoFeedback,

                    className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-bold hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed'

                  }, __alloT('stem.geo.check', 'Check')),

                  React.createElement('button', {

                    onClick: revealCapital,

                    disabled: !!geoFeedback,

                    className: 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:border-teal-600 hover:text-teal-800 disabled:opacity-50',

                    title: __alloT('stem.geo.reveal_capital_title', 'Show the answer (no points; the country goes to your review list)')

                  }, __alloT('stem.geo.show', '👁️ Show'))

                ),

                // Multiple choice hints for easy mode — choices generated ONCE per target
                // and stashed in state so they don't re-shuffle on every render
                // (previously caused misclicks if React re-rendered during a click).
                geoDifficulty === 'easy' && (function() {

                  if (!geoCapitalsChoices) {
                    var opts = [geoTarget.capital];
                    var guard = 0;
                    while (opts.length < 4 && guard < 100) {
                      var r = countries[Math.floor(Math.random() * countries.length)];
                      if (opts.indexOf(r.capital) === -1) opts.push(r.capital);
                      guard++;
                    }
                    for (var si = opts.length - 1; si > 0; si--) {
                      var sj = Math.floor(Math.random() * (si + 1));
                      var tmp = opts[si]; opts[si] = opts[sj]; opts[sj] = tmp;
                    }
                    upd('geoCapitalsChoices', opts);
                    return null; // render nothing this frame; next render has stable opts
                  }

                  return React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center mt-3' },
                    geoCapitalsChoices.map(function(cap) {
                      var answered = !!geoFeedback;
                      var isCorrect = answered && cap === geoTarget.capital;
                      var isWrongClicked = answered && !geoFeedback.correct && geoFeedback.picked === cap;
                      return React.createElement('button', {
                        key: cap,
                        disabled: answered,
                        onClick: function() { if (!answered) checkCapitalAnswer(cap); },
                        className: 'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                                   (isCorrect ? 'bg-green-100 border-green-400 text-green-800' :
                                    isWrongClicked ? 'bg-red-100 border-red-400 text-red-800' :
                                    answered ? 'bg-slate-50 border-slate-400 text-slate-600' :
                                    'bg-slate-100 hover:bg-teal-100 text-slate-700 border-slate-200 hover:border-teal-600')
                      }, cap);
                    })
                  );

                })()

              )

            ),



            // ═══ CONTINENTS TAB ═══

            geoTab === 'continents' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, __alloT('stem.geo.sort_countries_by_continent', '\uD83C\uDF0D Sort Countries by Continent')),

              // The hero above names seven continents but only six are answerable, which
              // reads as a missing button until you say why.
              React.createElement('p', { className: 'text-[11px] text-slate-600 text-center mb-3 max-w-lg mx-auto' },
                __alloT('stem.geo.antarctica_note', 'Six buttons, not seven: Antarctica has no countries, so it is never the answer. Australia and the Pacific islands are grouped here as Oceania.')),

              geoTarget && React.createElement('div', { className: 'max-w-lg mx-auto' },

                React.createElement('div', { className: 'text-center mb-3' },
                  React.createElement('p', { className: 'text-xs text-slate-600 uppercase tracking-wide' }, __alloT('stem.geo.which_continent_is', 'Which continent is')),
                  React.createElement('p', { className: 'text-2xl font-bold text-slate-800' }, geoTarget.name + '?')
                ),

                // Mini-map: highlight the target country's location so students reason spatially
                window.L && React.createElement('div', {
                  ref: function(el) {
                    if (!el || !window.L) return;
                    if (!window._geoContinentMapRef) window._geoContinentMapRef = { current: null, iso: '', answered: false };
                    var cmRef = window._geoContinentMapRef;
                    var answered = !!geoFeedback;
                    // Skip rebuild only if state AND the container DOM node are the same.
                    // Checking the container guards against stale maps attached to an
                    // unmounted DOM node after the user tab-switched away and back.
                    var sameContainer = cmRef.current && typeof cmRef.current.getContainer === 'function' && cmRef.current.getContainer() === el;
                    if (sameContainer && cmRef.iso === geoTarget.iso && cmRef.answered === answered) return;
                    if (cmRef.current) { try { cmRef.current.remove(); } catch(e) {} cmRef.current = null; }
                    el.innerHTML = '';
                    setTimeout(function() {
                      try {
                        var zoom = geoTarget.area > 5000000 ? 2 : geoTarget.area > 1500000 ? 3 : geoTarget.area > 300000 ? 4 : 5;
                        var m = geoMiniMap(el, { labels: false }).setView([geoTarget.lat, geoTarget.lng], zoom);
                        // Yellow pulsing marker for the target country
                        var markerColor = answered ? (geoFeedback.correct ? '#22c55e' : '#ef4444') : '#fbbf24';
                        window.L.circleMarker([geoTarget.lat, geoTarget.lng], { radius: 14, color: markerColor, weight: 3, fillColor: markerColor, fillOpacity: 0.35 }).addTo(m);
                        cmRef.current = m;
                        cmRef.iso = geoTarget.iso;
                        cmRef.answered = answered;
                      } catch(e) { console.warn('Continent map error:', e); }
                    }, 50);
                  },
                  style: { height: 200, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '2px solid #e2e8f0' }
                }),

                // Feedback line (inline with the map + buttons, not below everything)
                geoFeedback && React.createElement('div', {
                  role: 'status',
                  className: 'text-center text-sm font-bold mb-2 ' + (geoFeedback.correct ? 'text-green-700' : 'text-red-700')
                }, geoFeedback.msg),

                React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },

                  ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'].map(function(cont) {

                    var answered = !!geoFeedback;
                    var isCorrect = answered && geoTarget.continent === cont;
                    var isPickedWrong = answered && !geoFeedback.correct && geoFeedback.picked === cont;

                    return React.createElement('button', {

                      key: cont,

                      disabled: answered,

                      onClick: function() {

                        if (answered) return;

                        var correct = geoTarget.continent === cont;

                        if (correct) {

                          upd('geoScore', geoScore + 10);

                          upd('geoStreak', geoStreak + 1);

                          markAnswered(geoTarget.iso);

                          upd('geoFeedback', { correct: true, picked: cont, msg: '\u2705 ' + geoTarget.name + ' is in ' + cont + ' (' + geoTarget.region + ')!' });

                          announceFeedback('Correct. ' + geoTarget.name + ' is in ' + geoTarget.region + ', ' + cont + '.');

                          if (typeof stemBeep === 'function') stemBeep('correct');

                          if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'Continent sort');

                          if (finishesReview(geoTarget.iso) && addToast) addToast('\u2705 Review complete! Back to full rotation.', 'success');
                          clearMissed(geoTarget.iso);

                          recordContinentStat(geoTarget.continent, true);

                          setTimeout(function() { pickTarget('continents'); }, 1500);

                        } else {

                          upd('geoStreak', 0);

                          upd('geoFeedback', { correct: false, picked: cont, msg: '\u274C ' + geoTarget.name + ' is in ' + geoTarget.continent + ' (' + geoTarget.region + '), not ' + cont });

                          announceFeedback('Incorrect. ' + geoTarget.name + ' is in ' + geoTarget.region + ', ' + geoTarget.continent + ', not ' + cont + '.');

                          if (typeof stemBeep === 'function') stemBeep('wrong');

                          addMissed(geoTarget.iso);

                          recordContinentStat(geoTarget.continent, false);

                          setTimeout(function() { pickTarget('continents'); }, 2500);

                        }

                      },

                      // Dark ink: white text on these pastel continent colours measured
                      // 1.9\u20132.5:1; #0f172a on the same fills is 7.3\u20139.6:1.
                      className: 'px-4 py-3 rounded-xl text-sm font-bold text-slate-900 shadow-md transition-all ' +
                                 (isCorrect ? 'ring-4 ring-green-300 scale-105' :
                                  isPickedWrong ? 'ring-4 ring-red-300 opacity-70' :
                                  answered ? 'opacity-40' :
                                  'hover:shadow-lg transform hover:scale-105'),

                      style: { background: continentColors[cont] || '#a0aec0' }

                    }, cont);

                  })

                )

              )

            ),



            // ═══ LANDMARKS TAB ═══

            geoTab === 'landmarks' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, __alloT('stem.geo.famous_landmarks', '\uD83C\uDFD4\uFE0F Famous Landmarks')),

              // Mode toggle: Browse (passive) vs Quiz (4-choice country ID)
              React.createElement('div', { className: 'flex justify-center gap-2 mb-3' },
                ['browse', 'quiz'].map(function(m) {
                  var isActive = geoLandmarkMode === m;
                  return React.createElement('button', {
                    key: m,
                    onClick: function() {
                      if (geoLandmarkMode === m) return;
                      upd('geoLandmarkMode', m);
                      upd('geoLandmarkChoices', null);
                      upd('geoLandmarkQuizFb', null);
                      if (m === 'quiz') {
                        // Fresh random order per quiz run (the fixed list order made
                        // question 1 always the Great Wall, question 2 always the Eiffel Tower).
                        var order = GEO_LANDMARKS.map(function(_, i) { return i; });
                        for (var oi = order.length - 1; oi > 0; oi--) { var oj = Math.floor(Math.random() * (oi + 1)); var ot = order[oi]; order[oi] = order[oj]; order[oj] = ot; }
                        upd('geoLandmarkOrder', order);
                        upd('geoLandmarkIdx', 0);
                      }
                    },
                    className: 'px-3 py-1 rounded-full text-xs font-bold transition-colors ' +
                               (isActive ? 'bg-teal-700 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }, m === 'browse' ? '\uD83D\uDCD6 Browse' : '\uD83C\uDFAF Quiz Me');
                })
              ),

              (function() {

                var lmCount = GEO_LANDMARKS.length;
                var lmOrder = (geoLandmarkMode === 'quiz' && Array.isArray(d.geoLandmarkOrder) && d.geoLandmarkOrder.length === lmCount) ? d.geoLandmarkOrder : null;
                var lmSlot = ((geoLandmarkIdx % lmCount) + lmCount) % lmCount;
                var lm = GEO_LANDMARKS[lmOrder ? lmOrder[lmSlot] : lmSlot];
                var lmCountries = [lm.country].concat(lm.alt || []); // every country the landmark touches
                var lmWhere = lm.alt && lm.alt.length > 2 ? ('in ' + lm.country + ' and its neighbours')
                            : lmCountries.length > 1 ? ('on the border of ' + lmCountries.join(' / '))
                            : ('in ' + lm.country);
                var fmtDeg = function(v, pos, neg) { return Math.abs(v).toFixed(1) + '° ' + (v >= 0 ? pos : neg); };

                // Quiz mode: ensure we have 4 multiple-choice country options (1 correct + 3 distractors)
                if (geoLandmarkMode === 'quiz' && !geoLandmarkChoices) {
                  var used = {};
                  lmCountries.forEach(function(n) { used[n] = true; }); // never offer a co-owner as a "wrong" answer
                  // Plausible distractors: two from the landmark's OWN continent, one
                  // from anywhere. Drawing all three at random from 117 countries made
                  // most items answerable by elimination ("Angkor Wat: Cambodia,
                  // Iceland, Uruguay, Kenya") without knowing the landmark at all.
                  var lmHome = countries.find(function(c) { return c.name === lm.country; });
                  var lmHomeCont = lmHome ? lmHome.continent : null;
                  var drawFrom = function(pool, want) {
                    var got = [], guard = 0;
                    while (got.length < want && guard < 200 && pool.length > 0) {
                      var pick = pool[Math.floor(Math.random() * pool.length)];
                      if (!used[pick.name]) { used[pick.name] = true; got.push(pick.name); }
                      guard++;
                    }
                    return got;
                  };
                  var sameCont = lmHomeCont ? countries.filter(function(c) { return c.continent === lmHomeCont; }) : [];
                  var distractors = drawFrom(sameCont, 2);
                  distractors = distractors.concat(drawFrom(countries, 3 - distractors.length));
                  var options = distractors.concat([lm.country]);
                  for (var si = options.length - 1; si > 0; si--) {
                    var sj = Math.floor(Math.random() * (si + 1));
                    var tmp = options[si]; options[si] = options[sj]; options[sj] = tmp;
                  }
                  upd('geoLandmarkChoices', options);
                }

                function advanceLandmark() {
                  upd('geoLandmarkIdx', geoLandmarkIdx + 1);
                  upd('geoLandmarkChoices', null);
                  upd('geoLandmarkQuizFb', null);
                }

                function answerLandmark(pickedName) {
                  if (geoLandmarkQuizFb) return; // already answered this round
                  var correct = lmCountries.indexOf(pickedName) !== -1; // border landmarks accept either side
                  // Look up the continent of the landmark's country for stats
                  var lmCountry = countries.find(function(c) { return c.name === lm.country; });
                  var lmContinent = lmCountry ? lmCountry.continent : null;
                  if (correct) {
                    upd('geoScore', geoScore + 10);
                    upd('geoStreak', geoStreak + 1);
                    upd('geoLandmarkQuizFb', { correct: true, msg: '\u2705 Yes! ' + lm.name + ' is ' + lmWhere + '.' });
                    announceFeedback('Correct. ' + lm.name + ' is ' + lmWhere + '.');
                    if (typeof stemBeep === 'function') stemBeep('correct');
                    if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'ID\'d ' + lm.name);
                    recordContinentStat(lmContinent, true);
                    setTimeout(advanceLandmark, 1600);
                  } else {
                    upd('geoStreak', 0);
                    upd('geoLandmarkQuizFb', { correct: false, picked: pickedName, msg: '\u274C That\'s ' + pickedName + '. ' + lm.name + ' is ' + lmWhere + '.' });
                    announceFeedback('Incorrect. ' + lm.name + ' is ' + lmWhere + ', not ' + pickedName + '.');
                    if (typeof stemBeep === 'function') stemBeep('wrong');
                    recordContinentStat(lmContinent, false);
                    setTimeout(advanceLandmark, 2600);
                  }
                }

                // Landmark mini-map ref
                if (!window._geoLandmarkMapRef) window._geoLandmarkMapRef = { current: null, idx: -1, mode: '' };
                var lmMapRef = window._geoLandmarkMapRef;

                var isQuiz = geoLandmarkMode === 'quiz';
                var fb = geoLandmarkQuizFb;
                var revealed = !!fb; // in quiz mode, reveal country name after answer

                return React.createElement('div', { className: 'max-w-lg mx-auto' },

                  React.createElement('div', { className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 text-center mb-3' },

                    React.createElement('p', { className: 'text-3xl mb-2' }, '\uD83C\uDFD4\uFE0F'),

                    React.createElement('h4', { className: 'text-lg font-bold text-slate-800' }, lm.name),

                    React.createElement('p', { className: 'text-xs text-slate-600 mt-1' }, lm.fact),

                    // Country label: always visible in browse; hidden in quiz until answered
                    (!isQuiz || revealed) && React.createElement('p', { className: 'text-xs text-amber-800 mt-2 font-bold' }, '\uD83D\uDCCD ' + lmCountries.join(' / ') + ' \u2014 ' + fmtDeg(lm.lat, 'N', 'S') + ', ' + fmtDeg(lm.lng, 'E', 'W')),

                    isQuiz && !revealed && React.createElement('p', { className: 'text-xs text-slate-600 italic mt-2' }, __alloT('stem.geo.which_country_is_this_in', 'Which country is this in?'))

                  ),

                  // Leaflet map showing landmark location (marker popup hides country until answered)
                  window.L && React.createElement('div', {

                    ref: function(el) {

                      if (!el || !window.L) return;

                      // Rebuild map when landmark OR mode changes (quiz hides country in popup).
                      // Also rebuild if the DOM container changed — tab-switching leaves the
                      // old map attached to an unmounted node.
                      var sameContainer = lmMapRef.current && typeof lmMapRef.current.getContainer === 'function' && lmMapRef.current.getContainer() === el;
                      var shouldRebuild = !sameContainer || lmMapRef.idx !== geoLandmarkIdx || lmMapRef.mode !== geoLandmarkMode || lmMapRef.revealed !== revealed;
                      if (!shouldRebuild) return;

                      if (lmMapRef.current) { try { lmMapRef.current.remove(); } catch(e) {} lmMapRef.current = null; }

                      el.innerHTML = '';

                      setTimeout(function() {

                        try {

                          // Labels only when the country is not a secret (browse, or after answering)
                          var m = geoMiniMap(el, { labels: !isQuiz || revealed }).setView([lm.lat, lm.lng], 6);

                          var popupHtml = (isQuiz && !revealed) ? ('<b>' + lm.name + '</b><br><i>country hidden — take a guess</i>') : ('<b>' + lm.name + '</b><br>' + lmCountries.join(' / '));
                          window.L.marker([lm.lat, lm.lng]).addTo(m).bindPopup(popupHtml).openPopup();

                          window.L.circle([lm.lat, lm.lng], { radius: 50000, color: '#f6ad55', fillColor: '#f6ad55', fillOpacity: 0.2 }).addTo(m);

                          lmMapRef.current = m;

                          lmMapRef.idx = geoLandmarkIdx;

                          lmMapRef.mode = geoLandmarkMode;

                          lmMapRef.revealed = revealed;

                        } catch(e) { console.warn('Landmark map error:', e); }

                      }, 50);

                    },

                    style: { height: 220, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '2px solid #e2e8f0' }

                  }),

                  // Feedback line (quiz mode)
                  isQuiz && fb && React.createElement('div', {
                    role: 'status',
                    className: 'text-center text-sm font-bold mb-2 ' + (fb.correct ? 'text-green-700' : 'text-red-700')
                  }, fb.msg),

                  // Quiz choices OR browse navigation
                  isQuiz ? (geoLandmarkChoices && React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                    geoLandmarkChoices.map(function(name) {
                      var isCorrect = revealed && name === lm.country;
                      var isPicked = revealed && fb && fb.picked === name;
                      var base = 'px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all ';
                      var style = isCorrect
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : isPicked
                          ? 'bg-red-100 border-red-500 text-red-800'
                          : revealed
                            ? 'bg-slate-50 border-slate-400 text-slate-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-400';
                      return React.createElement('button', {
                        key: name,
                        disabled: revealed,
                        onClick: function() { answerLandmark(name); },
                        className: base + style
                      }, name);
                    })
                  )) : React.createElement('div', { className: 'flex justify-between' },
                    React.createElement('button', {
                      onClick: function() { upd('geoLandmarkIdx', Math.max(0, geoLandmarkIdx - 1)); },
                      className: 'px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 hover:bg-slate-200',
                      disabled: geoLandmarkIdx === 0
                    }, __alloT('stem.geo.previous', '\u25C0 Previous')),
                    React.createElement('span', { className: 'text-[11px] text-slate-600 self-center' }, (lmSlot + 1) + '/' + lmCount), // wraps (used to show 21/20, 22/20 ...)
                    React.createElement('button', {
                      onClick: function() {
                        upd('geoLandmarkIdx', geoLandmarkIdx + 1);
                        if (typeof awardStemXP === 'function' && geoLandmarkIdx % 5 === 4) awardStemXP('geoQuiz', 5, 'Explored 5 landmarks');
                      },
                      className: 'px-3 py-1 bg-teal-700 rounded text-xs font-bold text-white hover:bg-teal-800'
                    }, __alloT('stem.geo.next', 'Next \u25B6'))
                  )

                );

              })()

            ),



            // ═══ SIZE COMPARE TAB ═══

            geoTab === 'sizeCompare' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, __alloT('stem.geo.which_country_is_bigger', '\uD83D\uDCCF Which Country is Bigger?')),

              sizeTarget1 && sizeTarget2 && (function() {

                var answered = !!geoFeedback;
                var bigger = sizeTarget1.area >= sizeTarget2.area ? sizeTarget1 : sizeTarget2;
                var biggerArea = Math.max(sizeTarget1.area, sizeTarget2.area);
                // For revealing a proportional ratio (how much times bigger)
                var ratio = biggerArea / Math.min(sizeTarget1.area, sizeTarget2.area);

                return React.createElement('div', { className: 'max-w-lg mx-auto' },

                  React.createElement('div', { className: 'flex gap-4 justify-center items-stretch' },

                    [sizeTarget1, sizeTarget2].map(function(c) {

                      var isBigger = c.iso === bigger.iso;
                      var isPicked = answered && geoFeedback.picked === c.iso;
                      var isCorrect = answered && isBigger;
                      var isWrongPick = answered && isPicked && !geoFeedback.correct;
                      // Side length ∝ √area, so the SQUARE'S AREA is in the real ratio.
                      // The old 6px fill bar encoded area as a width, which is the very
                      // length-for-area substitution this tab exists to argue against.
                      var sidePx = Math.max(8, Math.round(84 * Math.sqrt(c.area / biggerArea)));

                      return React.createElement('button', {

                        key: c.iso,

                        disabled: answered,

                        onClick: function() { if (!answered) checkSizeAnswer(c.iso); },

                        className: 'flex-1 p-4 rounded-xl border-2 relative overflow-hidden transition-all text-center bg-gradient-to-br from-white to-slate-50 ' +
                                   (isCorrect ? 'border-green-500 ring-2 ring-green-200' :
                                    isWrongPick ? 'border-red-500 ring-2 ring-red-200 opacity-80' :
                                    answered ? 'border-slate-200 opacity-50' :
                                    'border-slate-200 hover:border-teal-400 hover:shadow-lg transform hover:scale-105')

                      },

                        // To-scale square, both cards on one scale (the caption below
                        // says so). Decorative: the km² figure carries the same fact in
                        // text, so it is hidden from screen readers.
                        answered && React.createElement('div', {
                          style: { height: 92, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 },
                          'aria-hidden': 'true'
                        },
                          React.createElement('div', {
                            style: {
                              width: sidePx, height: sidePx, borderRadius: 3,
                              background: isBigger ? '#15803d' : '#64748b',
                              transition: 'width 0.8s ease-out, height 0.8s ease-out'
                            }
                          })
                        ),

                        React.createElement('p', { className: 'text-3xl mb-2' }, isCorrect ? '\uD83C\uDFC6' : isWrongPick ? '\u274C' : '\uD83C\uDF0D'),

                        React.createElement('h4', { className: 'text-lg font-bold text-slate-800' }, c.name),

                        React.createElement('p', { className: 'text-xs text-slate-600' }, c.continent),

                        // Area reveal — only after answering, color-coded
                        answered
                          ? React.createElement('p', { className: 'text-sm font-bold mt-2 ' + (isBigger ? 'text-green-700' : 'text-slate-600') },
                              c.area.toLocaleString() + ' km\u00b2')
                          : React.createElement('p', { className: 'text-[11px] text-slate-600 mt-1' }, __alloT('stem.geo.click_if_bigger', 'Click if bigger'))

                      );

                    })

                  ),

                  // Feedback + ratio context
                  answered && React.createElement('div', { className: 'mt-3 text-center' },

                    React.createElement('div', {
                      role: 'status',
                      className: 'text-sm font-bold ' + (geoFeedback.correct ? 'text-green-700' : 'text-red-700')
                    }, geoFeedback.msg),

                    ratio >= 1.3 && (function() {
                      var smaller = bigger.iso === sizeTarget1.iso ? sizeTarget2 : sizeTarget1;
                      var times = ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1);
                      return React.createElement('div', null,
                        React.createElement('p', { className: 'text-xs text-slate-600 mt-1' },
                          '\uD83D\uDCCA ' + bigger.name + ' is about ' + times + '\u00d7 the area of ' + smaller.name +
                          (ratio >= 2 ? ' \u2014 you could fit roughly ' + Math.round(ratio) + ' of it inside.' : '.')),
                        React.createElement('p', { className: 'text-[11px] text-slate-600 mt-0.5' },
                          __alloT('stem.geo.squares_to_scale', 'The two squares are drawn to one scale, so what you see is the real area ratio.'))
                      );
                    })()

                  )

                );

              })(),

              React.createElement('p', { className: 'text-center text-[11px] text-slate-600 mt-3' }, __alloT('stem.geo.mercator_maps_distort_sizes_countries_', '\uD83D\uDCA1 Mercator maps distort sizes \u2014 countries near the equator look smaller than they really are!'))

            ),



            // ═══ GLOBE VIEW TAB ═══

            geoTab === 'globeView' && React.createElement('div', null,

              React.createElement('div', { className: 'flex items-center justify-center gap-3 py-2 px-2 bg-slate-900 text-white text-xs flex-wrap' },
                React.createElement('span', null, __alloT('stem.geo.drag_to_rotate_scroll_to_zoom_click_co', '\uD83C\uDF10 Drag to rotate \u2022 Scroll to zoom \u2022 Click countries for info')),

                // Search-and-fly. A WebGL globe is unreachable by keyboard, so without
                // this the whole tab was pointer-only; it also turns aimless spinning
                // into "go and look at a specific place".
                React.createElement('form', {
                  onSubmit: function(e) {
                    e.preventDefault();
                    var typed = (d.geoGlobeSearch || '').trim();
                    if (!typed) return;
                    var iso = isoFromName(typed);
                    var hit = iso ? countryByIso[iso] : null;
                    if (!hit) {
                      var lower = normalizeAnswer(typed);
                      hit = countries.find(function(c) { return normalizeAnswer(c.name).indexOf(lower) === 0; }) || null;
                    }
                    if (!hit) { announceFeedback('No country called ' + typed + ' in this set of 117.'); if (addToast) addToast('\uD83D\uDD0D No match for "' + typed + '" in the 117-country set.', 'info'); return; }
                    upd('geoGlobeInfo', hit);
                    upd('geoGlobeSearch', '');
                    try {
                      if (globeRef.current && typeof globeRef.current.pointOfView === 'function') {
                        globeRef.current.pointOfView({ lat: hit.lat, lng: hit.lng, altitude: 1.6 }, 1200);
                      }
                    } catch (err) { console.warn('[Geo] globe pointOfView failed:', err); }
                    announceFeedback('Showing ' + hit.name + ', capital ' + hit.capital + ', in ' + hit.region + ', ' + hit.continent + '.');
                  },
                  className: 'flex items-center gap-1'
                },
                  React.createElement('input', {
                    type: 'text',
                    list: 'geo-globe-countries',
                    value: d.geoGlobeSearch || '',
                    onChange: function(e) { upd('geoGlobeSearch', e.target.value); },
                    placeholder: __alloT('stem.geo.jump_to_a_country', 'Jump to a country\u2026'),
                    'aria-label': __alloT('stem.geo.jump_to_a_country_on_the_globe', 'Jump to a country on the globe'),
                    className: 'px-2 py-1 rounded bg-slate-800 border border-slate-500 text-white placeholder-slate-400 text-[11px] w-40 focus:outline-none focus:ring-2 focus:ring-teal-400'
                  }),
                  React.createElement('datalist', { id: 'geo-globe-countries' },
                    countries.map(function(c) { return React.createElement('option', { key: c.iso, value: c.name }); })
                  ),
                  React.createElement('button', {
                    type: 'submit',
                    className: 'px-2 py-1 rounded bg-teal-700 text-white text-[11px] font-bold hover:bg-teal-800'
                  }, __alloT('stem.geo.go', 'Go'))
                ),
                React.createElement('button', {
                  onClick: function() {
                    var night = !d.geoGlobeNight;
                    upd('geoGlobeNight', night);
                    if (globeRef.current) {
                      globeRef.current.globeImageUrl(night
                        ? '//unpkg.com/three-globe/example/img/earth-night.jpg'
                        : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
                    }
                    if (typeof announceToSR === 'function') announceToSR(night ? 'Night view: city lights show where people live.' : 'Day view: NASA Blue Marble satellite imagery.');
                  },
                  'aria-pressed': !!d.geoGlobeNight,
                  'aria-label': __alloT('stem.geo.toggle_day_night_view', 'Toggle day / night view'),
                  className: 'px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ' + (d.geoGlobeNight ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-500 text-slate-200 hover:border-slate-400')
                }, d.geoGlobeNight ? '\uD83C\uDF19 Night' : '\u2600\uFE0F Day')
              ),

              !window._GlobeGLConstructor ? React.createElement('div', { className: 'text-center py-16 text-slate-600' },

                React.createElement('div', { className: 'text-4xl mb-3 animate-spin' }, '\uD83C\uDF10'),

                React.createElement('p', { className: 'text-sm' }, __alloT('stem.geo.loading_3d_globe', 'Loading 3D Globe...'))

              ) : React.createElement('div', {

                ref: function(el) { if (el && window._GlobeGLConstructor) initGlobe(el); },

                style: { height: 450, width: '100%', background: '#0a0a2e' },

                role: 'img',

                'aria-label': __alloT('stem.geo.globe_aria', 'Interactive 3D globe of Earth with country outlines. Drag to rotate, scroll to zoom, click a country for its details below.')

              }),

              // Country info card — populated when user clicks a country on the globe.
              // Sits below the globe so the 3D view stays full-size.
              window._GlobeGLConstructor && React.createElement('div', { className: 'p-3 bg-slate-900 text-white' },
                geoGlobeInfo ? React.createElement('div', { className: 'max-w-2xl mx-auto bg-slate-800/70 border border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3' },
                  React.createElement('div', { className: 'flex-1' },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                      React.createElement('span', { className: 'text-lg' }, '\uD83D\uDCCD'),
                      React.createElement('h4', { className: 'text-base font-bold' }, geoGlobeInfo.name),
                      geoGlobeInfo.iso && React.createElement('span', { className: 'text-[10px] text-slate-300 font-mono bg-slate-700 px-1.5 py-0.5 rounded' }, geoGlobeInfo.iso)
                    ),
                    geoGlobeInfo._unknown
                      ? React.createElement('p', { className: 'text-xs text-slate-400 italic' }, __alloT('stem.geo.not_in_the_117_country_dataset_basic_i', 'Not in the 117-country dataset \u2014 basic info only.'))
                      : React.createElement('div', { className: 'grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-200 mt-1' },
                          geoGlobeInfo.capital && React.createElement('div', null, React.createElement('span', { className: 'text-slate-400' }, 'Capital: '), geoGlobeInfo.capital),
                          geoGlobeInfo.continent && React.createElement('div', null, React.createElement('span', { className: 'text-slate-400' }, 'Continent: '), geoGlobeInfo.continent),
                          geoGlobeInfo.region && React.createElement('div', null, React.createElement('span', { className: 'text-slate-400' }, 'Region: '), geoGlobeInfo.region),
                          geoGlobeInfo.area && React.createElement('div', null, React.createElement('span', { className: 'text-slate-400' }, 'Area: '), geoGlobeInfo.area.toLocaleString() + ' km\u00b2')
                        )
                  ),
                  React.createElement('button', {
                    onClick: function() { upd('geoGlobeInfo', null); },
                    'aria-label': __alloT('stem.geo.close_country_info', 'Close country info'),
                    className: 'text-slate-400 hover:text-white text-sm leading-none'
                  }, '\u2715')
                ) : React.createElement('p', { className: 'text-xs text-slate-300 text-center italic' }, __alloT('stem.geo.click_any_country_on_the_globe_to_see_', 'Click any country on the globe to see its info here.'))
              )

            ),



            // ═══ QUIZ BUILDER TAB ═══

            geoTab === 'quizBuilder' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, __alloT('stem.geo.ai_quiz_builder', '\uD83C\uDFC6 AI Quiz Builder')),

              React.createElement('p', { className: 'text-xs text-slate-600 text-center mb-3' }, __alloT('stem.geo.describe_the_quiz_you_want_and_ai_will', 'Describe the quiz you want and AI will generate custom geography questions!')),

              React.createElement('div', { className: 'flex gap-2 max-w-md mx-auto mb-4' },

                React.createElement('input', {

                  type: 'text',

                  placeholder: __alloT('stem.geo.e_g_quiz_me_on_african_capitals_or_eur', 'e.g. "Quiz me on African capitals" or "European rivers"'),

                  'aria-label': __alloT('stem.geo.geography_quiz_prompt', 'Geography quiz prompt'),

                  value: d.geoQuizInput || '',

                  disabled: !!d.geoQuizLoading,

                  onChange: function(e) { upd('geoQuizInput', e.target.value); },

                  onKeyDown: function(e) { if (e.key === 'Enter' && d.geoQuizInput && !d.geoQuizLoading) { document.activeElement && document.activeElement.blur(); setTimeout(function() { var btn = document.querySelector('[data-geo-quiz-generate]'); if (btn) btn.click(); }, 0); } },

                  className: 'flex-1 px-3 py-2 rounded-lg border border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-slate-50'

                }),

                React.createElement('button', {

                  'data-geo-quiz-generate': 'true',

                  onClick: function() {

                    if (!d.geoQuizInput) return;

                    // Clear any prior quiz so the old one doesn't flash while the new one loads
                    upd('geoQuizLoading', true);
                    upd('geoQuizQuestions', null);
                    upd('geoQuizIdx', 0);
                    upd('geoQuizCorrectCount', 0);
                    upd('geoQuizAnswer', '');
                    upd('geoFeedback', null);

                    var gradeTxt = gradeLevel ? (' Pitch the difficulty at grade ' + gradeLevel + '.') : '';
                    var prompt = 'Generate 10 geography quiz questions about: ' + d.geoQuizInput + '.' + gradeTxt + ' Return a JSON array: [{"question":"...","answer":"...","hint":"...","fact":"..."}]. Each answer must be a single short term (1-3 words) with one clearly correct form; the hint must not contain the answer; the fact is one sentence of context shown after answering. Questions should be factual and educational. Return ONLY valid JSON, no markdown fences.';

                    // Fixed: was `callAI` (undefined — ctx provides callGemini).
                    // callGemini is Promise-based: (prompt, jsonMode, vision, temp).
                    if (typeof callGemini === 'function') {

                      callGemini(prompt, true, false, 0.7).then(function(resp) {

                        try {

                          var cleaned = String(resp || '').replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
                          var qs = JSON.parse(cleaned);
                          if (!Array.isArray(qs) || qs.length === 0) throw new Error('Not an array');

                          upd('geoQuizQuestions', qs);
                          upd('geoQuizIdx', 0);
                          upd('geoQuizCorrectCount', 0);
                          upd('geoQuizLoading', false);
                          if (addToast) addToast('\u2728 ' + qs.length + ' questions ready!', 'success');

                        } catch(e) {
                          upd('geoQuizLoading', false);
                          if (addToast) addToast('\u26A0 AI response wasn\'t valid JSON. Try a simpler prompt.', 'error');
                          console.warn('Quiz Builder parse error:', e, resp);
                        }

                      }).catch(function(err) {

                        upd('geoQuizLoading', false);
                        if (addToast) addToast('\u26A0 AI request failed. Check your connection.', 'error');
                        console.warn('Quiz Builder network error:', err);

                      });

                    } else {
                      upd('geoQuizLoading', false);
                      if (addToast) addToast('\u26A0 AI is not available in this build.', 'error');
                    }

                  },

                  disabled: !!d.geoQuizLoading || !d.geoQuizInput,

                  className: 'px-4 py-2 rounded-lg text-sm font-bold text-white ' + (d.geoQuizLoading ? 'bg-slate-400 cursor-wait' : !d.geoQuizInput ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg')

                }, d.geoQuizLoading ? '\u23F3 Generating\u2026' : '\uD83D\uDE80 Generate'),

                // Works with AI switched off: same 10-question shape, built from the
                // 117-country dataset instead of a model.
                React.createElement('button', {
                  'data-geo-practice-pack': 'true',
                  onClick: function() {
                    var pack = buildPracticePack(10, filteredCountries);
                    upd('geoQuizLoading', false);
                    upd('geoQuizQuestions', pack);
                    upd('geoQuizIdx', 0);
                    upd('geoQuizCorrectCount', 0);
                    upd('geoQuizAnswer', '');
                    upd('geoFeedback', null);
                    if (addToast) addToast('\uD83D\uDCDA ' + pack.length + ' practice questions ready.', 'success');
                    announceFeedback(pack.length + ' practice questions ready. No internet needed.');
                  },
                  disabled: !!d.geoQuizLoading,
                  title: __alloT('stem.geo.practice_pack_title', 'Build 10 questions from the built-in country data. No AI, no internet.'),
                  className: 'px-3 py-2 rounded-lg text-sm font-bold border border-teal-700 text-teal-800 bg-white hover:bg-teal-50 disabled:opacity-50'
                }, __alloT('stem.geo.practice_pack', '\uD83D\uDCDA Practice pack'))

              ),

              // AI unavailable: say so once, up front, and point at the offline pack \u2014
              // the old build only surfaced it as an error toast after a failed click.
              typeof callGemini !== 'function' && React.createElement('p', {
                className: 'text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 max-w-md mx-auto mb-3 text-center'
              }, __alloT('stem.geo.ai_off_use_practice_pack', '\u26A0\uFE0F AI is switched off in this build, so Generate will not work. Practice pack builds questions from the built-in country data instead.')),

              // Quick presets

              React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center mb-4' },

                ['African Capitals', 'European Countries', 'Asian Rivers', 'World Landmarks', 'Island Nations', 'Largest Countries'].map(function(preset) {

                  return React.createElement('button', {

                    key: preset,

                    onClick: function() { upd('geoQuizInput', preset); },

                    className: 'px-2 py-1 bg-slate-100 rounded-full text-[11px] text-slate-600 hover:bg-teal-100 hover:text-teal-700 transition-all'

                  }, preset);

                })

              ),

              // Display generated quiz
              d.geoQuizQuestions && d.geoQuizQuestions.length > 0 && (function() {

                var idx = d.geoQuizIdx || 0;
                var total = d.geoQuizQuestions.length;
                var quizCorrectCount = d.geoQuizCorrectCount || 0;

                // Completion screen — shown after the last question instead of looping forever
                if (idx >= total) {
                  var pct = Math.round((quizCorrectCount / total) * 100);
                  var medal = pct >= 90 ? '\uD83E\uDD47' : pct >= 70 ? '\uD83E\uDD48' : pct >= 50 ? '\uD83E\uDD49' : '\uD83C\uDFAF';
                  return React.createElement('div', { className: 'max-w-md mx-auto bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200 text-center' },
                    React.createElement('p', { className: 'text-5xl mb-2' }, medal),
                    React.createElement('h4', { className: 'text-lg font-bold text-slate-800 mb-1' }, __alloT('stem.geo.quiz_complete', 'Quiz complete!')),
                    React.createElement('p', { className: 'text-sm text-slate-700 mb-4' },
                      __alloT('stem.geo.you_got', 'You got '),
                      React.createElement('span', { className: 'font-bold text-teal-700' }, quizCorrectCount + ' / ' + total),
                      ' correct (' + pct + '%).'
                    ),
                    React.createElement('div', { className: 'flex gap-2 justify-center' },
                      React.createElement('button', {
                        onClick: function() {
                          upd('geoQuizIdx', 0);
                          upd('geoQuizCorrectCount', 0);
                          upd('geoQuizAnswer', '');
                          upd('geoFeedback', null);
                        },
                        className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-bold hover:bg-teal-800 shadow'
                      }, __alloT('stem.geo.retake', '\uD83D\uDD01 Retake')),
                      React.createElement('button', {
                        onClick: function() {
                          upd('geoQuizQuestions', null);
                          upd('geoQuizIdx', 0);
                          upd('geoQuizCorrectCount', 0);
                          upd('geoQuizAnswer', '');
                          upd('geoFeedback', null);
                        },
                        className: 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300'
                      }, __alloT('stem.geo.new_quiz', '\u2728 New Quiz'))
                    )
                  );
                }

                var q = d.geoQuizQuestions[idx];
                var answered = !!geoFeedback;

                // Normalize for comparison: strip case + non-alphanumeric so "Mexico City"
                // matches "mexico-city" and "mexico city!" but "a" no longer matches "Africa"
                // Shared with Capitals: accent/punctuation-insensitive and Unicode-aware,
                // so a non-Latin answer is no longer stripped to '' (which made every
                // guess "correct" via the empty-substring match).
                var norm = normalizeAnswer;
                function submitAnswer(userAnswer) {
                  if (answered) return;
                  var userNorm = norm(userAnswer);
                  var expectedNorm = norm(q.answer);
                  if (!userNorm) {
                    if (addToast) addToast('Type an answer first', 'info');
                    return;
                  }
                  // Correct = normalized user contains the full expected (so "north africa" matches "africa")
                  // but short substrings of the expected DO NOT count as correct.
                  var correct = !!expectedNorm && (userNorm === expectedNorm || userNorm.indexOf(expectedNorm) !== -1);
                  if (correct) {
                    upd('geoScore', geoScore + 10);
                    upd('geoQuizCorrectCount', quizCorrectCount + 1);
                    upd('geoFeedback', { correct: true, msg: '\u2705 Correct! ' + (q.fact || '') });
                    announceFeedback('Correct. ' + (q.fact || ''));
                    if (typeof stemBeep === 'function') stemBeep('correct');
                    if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'AI quiz answer');
                  } else {
                    upd('geoFeedback', { correct: false, msg: '\u274C Answer: ' + q.answer + '. ' + (q.fact || '') });
                    announceFeedback('Incorrect. The answer was ' + q.answer + '. ' + (q.fact || ''));
                    if (typeof stemBeep === 'function') stemBeep('wrong');
                  }
                  upd('geoQuizAnswer', '');
                  // Longer delay on wrong so student can absorb the fact
                  setTimeout(function() { upd('geoQuizIdx', idx + 1); upd('geoFeedback', null); }, correct ? 2200 : 3500);
                }

                return React.createElement('div', { className: 'max-w-md mx-auto bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200' },

                  React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                    React.createElement('p', { className: 'text-[11px] text-teal-700 font-bold' }, 'Question ' + (idx + 1) + ' / ' + total),
                    React.createElement('p', { className: 'text-[11px] text-slate-600' }, '\u2705 ' + quizCorrectCount + ' correct')
                  ),

                  // Progress bar
                  React.createElement('div', { className: 'h-1.5 bg-white/60 rounded-full overflow-hidden mb-3' },
                    React.createElement('div', { style: { width: ((idx / total) * 100) + '%', height: '100%', background: '#14b8a6', transition: 'width 0.3s' } })
                  ),

                  React.createElement('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, q.question),

                  q.hint && React.createElement('p', { className: 'text-[11px] text-slate-600 mb-2' }, '\uD83D\uDCA1 Hint: ' + q.hint),

                  // Feedback line (appears above input after answering)
                  answered && React.createElement('div', {
                    className: 'text-xs font-bold mb-2 p-2 rounded ' + (geoFeedback.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                  }, geoFeedback.msg),

                  React.createElement('div', { className: 'flex gap-2' },

                    React.createElement('input', {
                      type: 'text',
                      placeholder: __alloT('stem.geo.your_answer', 'Your answer...'),
                      'aria-label': __alloT('stem.geo.quiz_answer', 'Quiz answer'),
                      value: d.geoQuizAnswer || '',
                      disabled: answered,
                      onChange: function(e) { upd('geoQuizAnswer', e.target.value); },
                      onKeyDown: function(e) { if (e.key === 'Enter') submitAnswer(d.geoQuizAnswer || ''); },
                      className: 'flex-1 px-3 py-2 rounded-lg border border-teal-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-slate-50 disabled:text-slate-300'
                    }),

                    React.createElement('button', {
                      onClick: function() { submitAnswer(d.geoQuizAnswer || ''); },
                      disabled: answered,
                      className: 'px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 disabled:bg-slate-300'
                    }, __alloT('stem.geo.check_2', 'Check')),

                    React.createElement('button', {
                      onClick: function() {
                        if (answered) return;
                        upd('geoFeedback', { correct: false, msg: '\u27A1 Answer: ' + q.answer + '. ' + (q.fact || '') });
                        setTimeout(function() { upd('geoQuizIdx', idx + 1); upd('geoFeedback', null); }, 2500);
                      },
                      disabled: answered,
                      className: 'px-3 py-2 bg-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-50'
                    }, __alloT('stem.geo.skip', 'Skip'))

                  )

                );

              })()

            ),



            // ── Distance tab content ──
            geoTab === 'distance' && React.createElement('div', { className: 'p-5 space-y-4' },
              React.createElement('h3', { className: 'text-sm font-bold text-teal-700' }, __alloT('stem.geo.distance_challenge', '\uD83D\uDCCD Distance Challenge')),
              React.createElement('p', { className: 'text-xs text-slate-600' }, __alloT('stem.geo.estimate_capital_to_capital', 'Estimate the straight-line distance from one capital city to the other (within 15% to score!)')),

              geoDistA && geoDistB ? React.createElement('div', { className: 'space-y-4' },
                // Country cards
                React.createElement('div', { className: 'flex items-center gap-3 justify-center' },
                  React.createElement('div', { className: 'bg-teal-50 border-2 border-teal-300 rounded-xl px-4 py-3 text-center min-w-[120px]' },
                    React.createElement('div', { className: 'text-2xl' }, '\uD83C\uDFD9\uFE0F'),
                    React.createElement('div', { className: 'font-bold text-sm text-teal-800' }, geoDistA.name),
                    React.createElement('div', { className: 'text-[11px] text-teal-800' }, geoDistA.capital)
                  ),
                  React.createElement('div', { className: 'text-2xl text-slate-600' }, '\u2194\uFE0F'),
                  React.createElement('div', { className: 'bg-cyan-50 border-2 border-cyan-300 rounded-xl px-4 py-3 text-center min-w-[120px]' },
                    React.createElement('div', { className: 'text-2xl' }, '\uD83C\uDFD9\uFE0F'),
                    React.createElement('div', { className: 'font-bold text-sm text-cyan-800' }, geoDistB.name),
                    React.createElement('div', { className: 'text-[11px] text-cyan-800' }, geoDistB.capital)
                  )
                ),

                // Mini-map with both countries and the great-circle arc between them.
                // Dashed before answer (you're visualizing; not yet graded); solid +
                // midpoint label after answer (shows the real distance on the path).
                window.L && React.createElement('div', {
                  ref: function(el) {
                    if (!el || !window.L) return;
                    if (!window._geoDistMapRef) window._geoDistMapRef = { current: null, pairKey: '', answered: false };
                    var dmRef = window._geoDistMapRef;
                    var answered = !!(geoDistFeedback && typeof geoDistFeedback.actual === 'number');
                    var pairKey = geoDistA.iso + '-' + geoDistB.iso + '-' + geoDistUnit; // unit is on the midpoint badge
                    var sameContainer = dmRef.current && typeof dmRef.current.getContainer === 'function' && dmRef.current.getContainer() === el;
                    if (sameContainer && dmRef.pairKey === pairKey && dmRef.answered === answered) return;
                    if (dmRef.current) { try { dmRef.current.remove(); } catch(e) {} dmRef.current = null; }
                    el.innerHTML = '';
                    setTimeout(function() {
                      try {
                        var m = geoMiniMap(el, { labels: false, minZoom: 1 });
                        var aLL = capitalLatLng(geoDistA), bLL = capitalLatLng(geoDistB);
                        // Markers on the CAPITALS (teal for A, cyan for B — match the cards)
                        window.L.circleMarker(aLL, { radius: 10, color: '#14b8a6', weight: 3, fillColor: '#14b8a6', fillOpacity: 0.55 }).addTo(m).bindTooltip(geoDistA.capital, { permanent: true, direction: 'top', className: 'geo-dist-label' });
                        window.L.circleMarker(bLL, { radius: 10, color: '#06b6d4', weight: 3, fillColor: '#06b6d4', fillOpacity: 0.55 }).addTo(m).bindTooltip(geoDistB.capital, { permanent: true, direction: 'top', className: 'geo-dist-label' });
                        // Great-circle arc, split where it crosses the antimeridian so a
                        // Tokyo–Washington route does not draw a line across the whole map.
                        var arc = greatCircleLatLngs(aLL[0], aLL[1], bLL[0], bLL[1], 64);
                        // 700-shade greens/reds: white on the old #22c55e / #ef4444 badge was 2.3:1 / 3.8:1.
                        var lineColor = answered ? (geoDistFeedback.correct ? '#15803d' : '#b91c1c') : '#fbbf24';
                        var segments = [[]];
                        for (var ai = 0; ai < arc.length; ai++) {
                          if (ai > 0 && Math.abs(arc[ai][1] - arc[ai - 1][1]) > 180) segments.push([]);
                          segments[segments.length - 1].push(arc[ai]);
                        }
                        var group = window.L.featureGroup(segments.map(function(seg) {
                          return window.L.polyline(seg, { color: lineColor, weight: 3, dashArray: answered ? null : '6,6', opacity: 0.9 });
                        })).addTo(m);
                        // Midpoint label with the actual distance — only after answering
                        if (answered && arc.length > 0) {
                          var mid = arc[Math.floor(arc.length / 2)];
                          window.L.marker(mid, {
                            icon: window.L.divIcon({
                              className: 'geo-dist-midpoint',
                              html: '<div style="background:' + lineColor + ';color:#fff;padding:3px 8px;border-radius:10px;font-weight:bold;font-size:11px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">' + fmtDist(geoDistFeedback.actual) + '</div>',
                              iconSize: [90, 20], iconAnchor: [45, 10]
                            })
                          }).addTo(m);
                        }
                        // Fit bounds around the arc with padding
                        m.fitBounds(group.getBounds(), { padding: [35, 35], maxZoom: 5 });
                        dmRef.current = m;
                        dmRef.pairKey = pairKey;
                        dmRef.answered = answered;
                      } catch(e) { console.warn('Distance map error:', e); }
                    }, 50);
                  },
                  style: { height: 240, width: '100%', borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0' }
                }),

                // Input row
                React.createElement('div', { className: 'flex items-center gap-2 justify-center' },
                  React.createElement('input', {
                    type: 'number',
                    value: geoDistGuess,
                    onChange: function(e) { upd('geoDistGuess', e.target.value); },
                    onKeyDown: function(e) { if (e.key === 'Enter') checkDistanceAnswer(); },
                    placeholder: geoDistUnit === 'mi' ? __alloT('stem.geo.distance_in_miles', 'Distance in miles...') : __alloT('stem.geo.distance_in_km', 'Distance in km...'),
                    'aria-label': geoDistUnit === 'mi' ? __alloT('stem.geo.distance_guess_in_miles', 'Distance guess in miles') : __alloT('stem.geo.distance_guess_in_kilometers', 'Distance guess in kilometers'),
                    className: 'w-48 px-3 py-2 rounded-lg border border-teal-600 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-400'
                  }),
                  // km / mi toggle — US students think in miles; the answer shows both
                  React.createElement('div', { className: 'flex rounded-lg overflow-hidden border border-slate-300', role: 'group', 'aria-label': __alloT('stem.geo.distance_unit', 'Distance unit') },
                    ['km', 'mi'].map(function(u) {
                      var on = geoDistUnit === u;
                      return React.createElement('button', {
                        key: u,
                        onClick: function() { upd('geoDistUnit', u); },
                        'aria-pressed': on,
                        className: 'px-2 py-2 text-xs font-bold ' + (on ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100')
                      }, u);
                    })
                  ),
                  React.createElement('button', {
                    onClick: checkDistanceAnswer,
                    className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-bold hover:bg-teal-800 transition-colors'
                  }, __alloT('stem.geo.check_3', 'Check')),
                  React.createElement('button', {
                    onClick: pickDistancePair,
                    className: 'px-3 py-2 bg-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-300'
                  }, __alloT('stem.geo.skip_2', 'Skip'))
                ),

                // Feedback
                geoDistFeedback && React.createElement('div', {
                  role: 'status',
                  className: 'text-center py-2 px-4 rounded-lg text-sm font-medium ' + (geoDistFeedback.correct ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200')
                }, geoDistFeedback.msg),

                // Travel-time anchor \u2014 turns an abstract number into something a
                // student has a feel for. Cruising speed 900 km/h is a jet average.
                geoDistFeedback && typeof geoDistFeedback.actual === 'number' && (function() {
                  var hours = geoDistFeedback.actual / 900;
                  var h = Math.floor(hours);
                  var mins = Math.round((hours - h) * 60);
                  if (mins === 60) { h += 1; mins = 0; }
                  var flight = h > 0 ? (h + ' h ' + (mins < 10 ? '0' : '') + mins + ' min') : (mins + ' min');
                  var walkDays = Math.round(geoDistFeedback.actual / 32); // ~8 h a day at 4 km/h
                  return React.createElement('p', { className: 'text-center text-[11px] text-slate-600' },
                    '\u2708\uFE0F Nonstop at 900 km/h that is about ' + flight + ' in the air \u00B7 \uD83D\uDEB6 walking 8 hours a day, about ' + walkDays.toLocaleString() + ' days');
                })(),

                // Stats
                React.createElement('div', { className: 'text-center text-xs text-slate-600' },
                  '\uD83C\uDFAF Distance challenges nailed: ' + geoDistCorrect
                )
              ) : React.createElement('div', { className: 'text-center py-8 text-slate-600' }, 'Loading...')
            ),

            geoTab === 'distHunt' && (function() {
              // Inquiry widget, no score by design. Rewritten so the copy speaks to the
              // student (it used to read "Widget classifies distance scale into 4
              // discrete categories" and carried a developer "Design note"), the slider
              // value is anchored to REAL capital-to-capital journeys, and the top bucket
              // is named honestly ("antipodal" starts at 12,000 km nowhere; 20,037 km is
              // the true maximum).
              var h2 = React.createElement;
              var iq = d.distHunt || { distance: 5000, confidence: 70, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              var iqDist = +iq.distance || 0;
              function setIQ(patch) { upd('distHunt', Object.assign({}, iq, patch)); }
              var category;
              if (iqDist < 1000) category = 'short';
              else if (iqDist < 5000) category = 'medium';
              else if (iqDist < 12000) category = 'long';
              else category = 'farside';
              // Inks are 700/800 shades: the 600s measured 3.1-3.6:1 on these tinted grounds.
              var cm = {
                short:   { label: __alloT('stem.geo.short_hop_under_1000_km', '\uD83D\uDFE2 Short hop (under 1,000 km)'), color: '#047857', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.geo.short_hop_desc', 'Same continent or neighboring countries \u2014 a few hours by train, or a short flight.') },
                medium:  { label: __alloT('stem.geo.medium_1000_5000_km_2', '\uD83D\uDFE1 Medium (1,000\u20135,000 km)'), color: '#92400e', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.geo.medium_desc', 'Across a continent, e.g. New York to Los Angeles \u2014 a 2\u20136 hour flight.') },
                long:    { label: __alloT('stem.geo.long_haul_5000_12000_km_2', '\uD83D\uDFE0 Long-haul (5,000\u201312,000 km)'), color: '#c2410c', bg: '#fff7ed', border: '#fdba74', desc: __alloT('stem.geo.long_haul_desc', 'Across an ocean, e.g. San Francisco to Tokyo \u2014 an 8\u201314 hour flight.') },
                farside: { label: __alloT('stem.geo.far_side_over_12000_km', '\uD83C\uDF0D Far side of the world (over 12,000 km)'), color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.geo.far_side_desc', 'Most of the way round the planet. Nothing can be farther than 20,037 km \u2014 half of Earth\u2019s 40,075 km circumference.') }
              }[category];
              // The three real capital-to-capital journeys closest to the slider value,
              // so the number becomes something a student can picture.
              var nearby = (function() {
                var best = [];
                for (var i = 0; i < countries.length; i++) {
                  for (var j = i + 1; j < countries.length; j++) {
                    var km = distanceKmBetween(countries[i], countries[j]);
                    var diff = Math.abs(km - iqDist);
                    if (best.length < 3 || diff < best[best.length - 1].diff) {
                      best.push({ a: countries[i], b: countries[j], km: km, diff: diff });
                      best.sort(function(x, y) { return x.diff - y.diff; });
                      if (best.length > 3) best.pop();
                    }
                  }
                }
                return best;
              })();
              var log = Array.isArray(iq.log) ? iq.log : [];
              return h2('div', { className: 'p-5 space-y-4' },
                h2('div', { className: 'p-4 rounded-xl bg-white border border-cyan-300 shadow-sm space-y-3' },
                  h2('h3', { className: 'text-sm font-black text-cyan-800' }, __alloT('stem.geo.distance_sense_heading', '\uD83C\uDF9A\uFE0F Distance sense')),
                  h2('p', { className: 'text-[12px] text-slate-700 leading-relaxed' }, __alloT('stem.geo.dist_hunt_intro', 'Not a quiz \u2014 build a feel for how far "far" is. Slide to a distance, read which real journeys are about that long, and rate how confident you are. Log a few and compare them.')),
                  h2('div', { className: 'p-3 rounded-lg text-center', style: { background: cm.bg, border: '2px solid ' + cm.border }, role: 'status' },
                    h2('div', { className: 'text-base font-black', style: { color: cm.color } }, cm.label),
                    h2('div', { className: 'text-[11px] text-slate-700 mt-1' }, cm.desc),
                    h2('div', { className: 'text-[10px] text-slate-600 mt-1 font-mono' }, iqDist.toLocaleString() + ' km (' + Math.round(iqDist / KM_PER_MILE).toLocaleString() + ' mi) @ ' + iq.confidence + '% confidence')
                  ),
                  h2('div', { className: 'grid grid-cols-2 gap-3' },
                    [{ k: 'distance', l: __alloT('stem.geo.distance_km', 'Distance (km)'), mn: 100, mx: 20000, st: 100 },
                     { k: 'confidence', l: __alloT('stem.geo.confidence_pct', 'Confidence (%)'), mn: 0, mx: 100, st: 5 }].map(function(sl) {
                      return h2('div', { key: sl.k },
                        h2('label', { htmlFor: 'ds-' + sl.k, className: 'block text-[11px] font-bold text-slate-700' }, sl.l + ': ', h2('span', { className: 'font-mono text-cyan-800' }, iq[sl.k])),
                        h2('input', { id: 'ds-' + sl.k, type: 'range', min: sl.mn, max: sl.mx, step: sl.st, value: iq[sl.k],
                          onChange: function(e) { var p = {}; p[sl.k] = parseInt(e.target.value, 10); setIQ(p); },
                          className: 'w-full', 'aria-valuetext': (sl.k === 'confidence' ? (iq[sl.k] + ' percent confidence') : (iq[sl.k] + ' kilometers')), 'aria-label': sl.l }));
                    })
                  ),
                  h2('div', { className: 'text-[11px] text-slate-700' },
                    h2('div', { className: 'font-bold mb-1' }, __alloT('stem.geo.about_this_far', 'About this far, capital to capital:')),
                    h2('ul', { className: 'list-disc pl-5 space-y-0.5' }, nearby.map(function(n) {
                      return h2('li', { key: n.a.iso + n.b.iso }, n.a.capital + ' (' + n.a.name + ') \u2194 ' + n.b.capital + ' (' + n.b.name + '): ' + Math.round(n.km).toLocaleString() + ' km');
                    }))
                  ),
                  h2('div', { className: 'flex gap-2 items-center flex-wrap' },
                    h2('button', { onClick: function() { setIQ({ log: log.concat([{ d: iqDist, c: iq.confidence, cat: category }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300 hover:bg-slate-200' }, __alloT('stem.geo.log_this', '\uD83D\uDCCB Log this')),
                    h2('button', { onClick: function() { setIQ({ distance: 5000, confidence: 70, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100' }, __alloT('stem.geo.reset_2', '\u21BA Reset')),
                    log.length > 0 && h2('span', { className: 'text-[11px] text-slate-600' }, log.map(function(e) { return (+e.d || 0).toLocaleString() + ' km @ ' + e.c + '%'; }).join(' \u00B7 '))
                  ),
                  h2('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.geo.hypothesis_what_is_the_maximum_great_c', 'Hypothesis: What is the maximum great-circle distance on Earth?'), 'aria-label': __alloT('stem.geo.hypothesis', 'Hypothesis'),
                    className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                  !iq.stuckRevealed && h2('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, __alloT('stem.geo.stuck_show_open_prompts', '\uD83E\uDD14 Stuck \u2014 show open prompts')),
                  iq.stuckRevealed && h2('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                    h2('ul', { className: 'list-disc pl-5 space-y-1' },
                      h2('li', null, __alloT('stem.geo.prompt_circumference', 'Earth\u2019s circumference is 40,075 km. If you kept going past the far side, would the distance keep growing?')),
                      h2('li', null, __alloT('stem.geo.prompt_antipode', 'The antipode of a place is the point exactly opposite it, straight through the centre of Earth. Where is the antipode of your school?')),
                      h2('li', null, __alloT('stem.geo.prompt_rhumb', 'A great circle is the shortest path on a sphere; a rhumb line keeps one compass heading. Which do pilots fly, and why?')))),
                  h2('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                    h2('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                    __alloT('stem.geo.i_understand_explain', 'I understand \u2014 explain in my own words')),
                  iq.understood && h2('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.geo.explain_how_distance_scales_translate_', 'Explain how distance scales translate to travel time.'), 'aria-label': __alloT('stem.geo.your_explanation', 'Your explanation'),
                    className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })
                )
              );
            })(),

            // ── Badge shelf ──
            React.createElement('div', { className: 'px-4 py-2 border-t border-slate-100 flex flex-wrap gap-1 items-center' },
              React.createElement('span', { className: 'text-[11px] text-slate-600 mr-1' }, 'Badges:'),
              GEO_BADGES.map(function(b) {
                return React.createElement('span', {
                  key: b.id,
                  title: b.name + ' — ' + b.desc,
                  role: 'img',
                  'aria-label': (geoBadges[b.id] ? 'Earned: ' : 'Locked: ') + b.name + ' — ' + b.desc,
                  className: 'text-sm ' + (geoBadges[b.id] ? '' : 'grayscale opacity-30')
                }, b.icon);
              })
            ),

            // ── Per-continent progress panel (collapsible) ──
            (function() {
              // Has the student attempted ANY continent this session?
              var hasStats = Object.keys(geoSessionStats).length > 0;
              var totalCorrect = 0, totalAttempted = 0;
              Object.keys(geoSessionStats).forEach(function(k) {
                totalCorrect += geoSessionStats[k].c;
                totalAttempted += geoSessionStats[k].c + geoSessionStats[k].w;
              });
              var overallPct = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

              return React.createElement('div', { className: 'px-4 py-2 border-t border-slate-100 bg-slate-50' },

                React.createElement('button', {
                  onClick: function() { upd('geoStatsOpen', !geoStatsOpen); },
                  className: 'w-full flex items-center justify-between text-[11px] text-slate-700 font-bold hover:text-teal-700 transition-colors',
                  'aria-expanded': geoStatsOpen
                },
                  React.createElement('span', null, '\uD83D\uDCCA My Progress' + (hasStats ? ' \u2014 ' + overallPct + '% overall (' + totalCorrect + '/' + totalAttempted + ')' : '')),
                  React.createElement('span', { className: 'text-slate-400' }, geoStatsOpen ? '\u25B2' : '\u25BC')
                ),

                geoStatsOpen && React.createElement('div', { className: 'mt-2 space-y-1.5' },
                  !hasStats && React.createElement('p', { className: 'text-[11px] text-slate-600 italic text-center py-2' }, __alloT('stem.geo.answer_some_questions_to_see_your_prog', 'Answer some questions to see your progress per continent.')),
                  hasStats && ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'].map(function(cont) {
                    var s = geoSessionStats[cont];
                    var hasData = !!s;
                    var total = hasData ? s.c + s.w : 0;
                    var pct = total > 0 ? Math.round((s.c / total) * 100) : 0;
                    var barColor = !hasData ? '#cbd5e1' : pct >= 80 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#ef4444';
                    return React.createElement('div', { key: cont, className: 'flex items-center gap-2 text-[11px]' },
                      React.createElement('span', { className: 'inline-block w-2 h-2 rounded-full', style: { background: continentColors[cont] || '#a0aec0' } }),
                      React.createElement('span', { className: 'w-28 text-slate-700 font-medium' }, cont),
                      React.createElement('div', { className: 'flex-1 h-2 bg-slate-200 rounded-full overflow-hidden' },
                        React.createElement('div', {
                          style: { width: (hasData ? pct : 0) + '%', height: '100%', background: barColor, transition: 'width 0.4s ease-out' }
                        })
                      ),
                      React.createElement('span', { className: 'w-20 text-right text-slate-600 tabular-nums' },
                        hasData ? (s.c + '/' + total + ' \u2014 ' + pct + '%') : 'not yet')
                    );
                  }),
                  hasStats && React.createElement('div', { className: 'flex justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200 mt-2' },
                    React.createElement('span', null, '\uD83C\uDFC6 ' + geoAnswered.length + ' mastered'),
                    React.createElement('span', null, '\uD83D\uDD01 ' + geoMissed.length + ' in review')
                  ),

                  // The panel used to be read-only: it showed a student their weakest
                  // continent and gave them no way to act on it. This narrows the quiz
                  // to that continent in one click.
                  (function() {
                    var weak = weakestContinent(geoSessionStats);
                    if (!weak) return null;
                    var regionId = regionIdForContinent(weak.continent);
                    if (!regionId) return null;
                    var already = geoRegion === regionId;
                    return React.createElement('button', {
                      onClick: function() {
                        upd('geoRegionFilter', regionId);
                        upd('geoTarget', null);
                        upd('geoFeedback', null);
                        window._geoLastZoomedRegion = null;   // re-frame the map on the new region
                        if (addToast) addToast('\uD83C\uDFAF Now quizzing ' + weak.continent + ' only.', 'info');
                        announceFeedback('Quiz narrowed to ' + weak.continent + ', where you are at ' + Math.round(weak.pct * 100) + ' percent this session.');
                      },
                      disabled: already,
                      className: 'w-full mt-2 px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors ' +
                                 (already ? 'bg-slate-100 border-slate-300 text-slate-600 cursor-default'
                                          : 'bg-white border-teal-700 text-teal-800 hover:bg-teal-50')
                    }, already
                      ? ('\uD83C\uDFAF Already focused on ' + weak.continent + ' \u2014 ' + weak.correct + '/' + weak.total + ' this session')
                      : ('\uD83C\uDFAF Practise ' + weak.continent + ' \u2014 your weakest so far (' + weak.correct + '/' + weak.total + ')'));
                  })(),

                  // The review pill only ever showed a COUNT, so a student could not see
                  // what they were supposed to be studying. Naming them makes the
                  // spaced-repetition set reviewable away from the screen too; each is a
                  // button so it can be studied on demand.
                  geoMissed.length > 0 && React.createElement('div', { className: 'mt-2 pt-2 border-t border-slate-200' },
                    React.createElement('p', { className: 'text-[11px] text-slate-700 font-bold mb-1' },
                      '\uD83D\uDD01 ' + __alloT('stem.geo.to_review', 'To review') + ' (' + geoMissed.length + ') \u2014 ' + __alloT('stem.geo.tap_one_to_study_it_now', 'tap one to study it now')),
                    React.createElement('div', { className: 'flex flex-wrap gap-1' },
                      geoMissed.map(function(iso) {
                        var c = countryByIso[iso];
                        if (!c) return null;
                        return React.createElement('button', {
                          key: iso,
                          onClick: function() {
                            upd('geoTarget', c);
                            upd('geoFeedback', null);
                            upd('geoCapitalsChoices', null);
                            if (!GEO_TARGET_TABS[geoTab]) upd('geoTab', 'findCountry');
                            window._geoLastZoomedRegion = null;
                            announceFeedback('Now studying ' + c.name + ', in ' + c.region + ', ' + c.continent + '.');
                          },
                          className: 'px-2 py-1 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100',
                          title: c.name + ' \u2014 ' + c.region + ', ' + c.continent
                        }, c.name);
                      })
                    )
                  )
                )

              );
            })(),

            // ── Bottom stats ──

            React.createElement('div', { className: 'px-4 py-3 bg-gradient-to-r from-slate-50 to-teal-50 border-t flex justify-between items-center text-[11px] text-slate-600' },

              React.createElement('span', null, '\u2B50 Score: ' + geoScore + '  \u2022  \uD83D\uDD25 Streak: ' + geoStreak),

              React.createElement('span', null, '\u2705 ' + geoAnswered.length + ' answered'),

              React.createElement('button', {

                onClick: function() {
                  // Score & streak
                  upd('geoScore', 0); upd('geoStreak', 0);
                  // Answered pool + current target
                  upd('geoAnswered', []); upd('geoTarget', null); upd('geoRound', 0);
                  // Badges + review pool + stats
                  upd('geoBadges', {}); upd('geoMissed', []); upd('geoReviewMode', false); upd('geoSessionStats', {});
                  // Pending feedback across all quizzes
                  upd('geoFeedback', null); upd('geoDistFeedback', null); upd('geoLandmarkQuizFb', null);
                  // Pair-based quizzes (distance + size compare)
                  upd('geoDistA', null); upd('geoDistB', null); upd('geoDistGuess', ''); upd('geoDistCorrect', 0);
                  upd('geoSize1', null); upd('geoSize2', null);
                  // Cached multiple-choice options
                  upd('geoCapitalsChoices', null); upd('geoLandmarkChoices', null);
                  // Text inputs
                  upd('geoCapitalInput', ''); upd('geoQuizAnswer', '');
                  // AI quiz (questions, position, score)
                  upd('geoQuizQuestions', null); upd('geoQuizIdx', 0); upd('geoQuizCorrectCount', 0);
                  // Globe info card, landmark order, distance-sense notes, stale outline error
                  upd('geoGlobeInfo', null); upd('geoGlobeSearch', ''); upd('geoLandmarkIdx', 0); upd('geoLandmarkOrder', null); upd('distHunt', null); upd('_geoOutlinesErr', null);
                  if (addToast) addToast('\u267B Fresh start \u2014 score, streak, and progress cleared.', 'info');
                },

                className: 'text-teal-700 hover:text-teal-900 font-bold'

              }, __alloT('stem.geo.reset_all', '\u267B Reset All'))

            )

          );
      })();
    }
  });


  // Mutable drag tracker — avoids React re-renders during drag operations
  var _gpDrag = { reason: null, matchId: null, angleIdx: null };

  // ═══ 📐 geometryProver ═══
  window.StemLab.registerTool('geometryProver', {
    icon: '\uD83D\uDD3A',
    label: 'Geometry',
    desc: 'Explore theorems, construct proofs, discover geometric relationships',
    color: 'violet',
    category: 'math',
    render: function(ctx) {
      // geometryProver paints no ground, so its chrome sits on the HOST surface -
      // a white card in light AND dark, pure BLACK in the contrast theme. This is
      // the SECOND registerTool in this file and the layout gate used to read only
      // the first, so these sites had never been rendered by it.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
      const React = ctx.React;
      const labToolData = ctx.toolData;
      const setLabToolData = ctx.setToolData;
      const setStemLabTool = ctx.setStemLabTool;
      const addToast = ctx.addToast;
      const ArrowLeft = ctx.icons.ArrowLeft;
      const awardStemXP = ctx.awardXP;
      const setExploreScore = ctx.setExploreScore || (() => {});
      const exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      const setToolSnapshots = ctx.setToolSnapshots;
      const stemCelebrate = ctx.celebrate;
      const stemBeep = ctx.beep;

      return (function() {
        const gp = (labToolData && labToolData.geometryProver) || {};
        const gpUpd = (key, val) => setLabToolData(prev => ({
          ...prev, geometryProver: { ...(prev.geometryProver || {}), [key]: val }
        }));

        const gpTab = gp.tab || 'build';
        const gpMode = gp.mode || 'freeform';
        const gpPoints = gp.points || [];
        const gpSegments = gp.segments || [];
        const gpDragging = gp.dragging;
        const gpConnecting = gp.connecting;
        const gpChallenge = gp.challenge || null;
        const gpFeedback = gp.feedback || null;
        const gpShowLabels = gp.showLabels !== false;
        const gpHoverIdx = gp.hoverIdx != null ? gp.hoverIdx : -1;
        const gpInvestigate = gp.investigate || false;
        const gpRevealed = gp.revealed || false;
        const gpGuided = gp.guided || null;
        const gpMission = gp.mission || null;

        // Math helpers
        const dist = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        const angleBetween = (p1, vertex, p2) => {
          const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
          const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
          let deg = (a1 - a2) * 180 / Math.PI;
          if (deg < 0) deg += 360;
          if (deg > 180) deg = 360 - deg;
          return Math.round(deg * 10) / 10;
        };
        const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const labelFor = i => String.fromCharCode(65 + (i % 26));

        const W = 500, H = 370, gridStep = 25;

        // Collect all angles
        const findAnglesAtVertex = vIdx => {
          const v = gpPoints[vIdx];
          if (!v) return [];
          const connected = gpSegments
            .filter(s => s.from === vIdx || s.to === vIdx)
            .map(s => s.from === vIdx ? s.to : s.from)
            .filter((idx, i, arr) => arr.indexOf(idx) === i);
          if (connected.length < 2) return [];
          const angles = [];
          for (let i = 0; i < connected.length; i++)
            for (let j = i + 1; j < connected.length; j++) {
              const a = angleBetween(gpPoints[connected[i]], v, gpPoints[connected[j]]);
              angles.push({ p1: connected[i], vertex: vIdx, p2: connected[j], angle: a });
            }
          return angles;
        };
        const allAngles = [];
        for (let vi = 0; vi < gpPoints.length; vi++)
          findAnglesAtVertex(vi).forEach(a => allAngles.push(a));

        // Theorem detection
        const theorems = [];
        if (gpPoints.length >= 3 && gpSegments.length >= 3) {
          for (let i = 0; i < gpPoints.length; i++) {
            for (let j = i + 1; j < gpPoints.length; j++) {
              for (let k = j + 1; k < gpPoints.length; k++) {
                const hasIJ = gpSegments.some(s => (s.from===i&&s.to===j)||(s.from===j&&s.to===i));
                const hasJK = gpSegments.some(s => (s.from===j&&s.to===k)||(s.from===k&&s.to===j));
                const hasIK = gpSegments.some(s => (s.from===i&&s.to===k)||(s.from===k&&s.to===i));
                if (hasIJ && hasJK && hasIK) {
                  const a1 = angleBetween(gpPoints[j], gpPoints[i], gpPoints[k]);
                  const a2 = angleBetween(gpPoints[i], gpPoints[j], gpPoints[k]);
                  const a3 = angleBetween(gpPoints[i], gpPoints[k], gpPoints[j]);
                  const sum = a1 + a2 + a3;
                  theorems.push({ type:'triangle_sum', label:'△ Triangle Angle Sum', desc:`∠${labelFor(i)}+∠${labelFor(j)}+∠${labelFor(k)} = ${sum.toFixed(1)}°`, valid: Math.abs(sum-180)<2, icon:'△', detail:`${a1.toFixed(1)}°+${a2.toFixed(1)}°+${a3.toFixed(1)}° = ${sum.toFixed(1)}°` });
                  // Pythagorean detection (right angle tolerance: 3°)
                  [{ a:a1,v:i,l1:j,l2:k },{ a:a2,v:j,l1:i,l2:k },{ a:a3,v:k,l1:i,l2:j }]
                    .filter(r => Math.abs(r.a - 90) < 3)
                    .forEach(r => {
                      const lA = dist(gpPoints[r.v], gpPoints[r.l1]);
                      const lB = dist(gpPoints[r.v], gpPoints[r.l2]);
                      const hyp = dist(gpPoints[r.l1], gpPoints[r.l2]);
                      const lhs = lA**2 + lB**2, rhs = hyp**2;
                      theorems.push({ type:'pythagorean', label:'⊾ Pythagorean Theorem', desc:`${labelFor(r.l1)}${labelFor(r.l2)}² ≈ ${labelFor(r.v)}${labelFor(r.l1)}² + ${labelFor(r.v)}${labelFor(r.l2)}²`, valid: Math.abs(lhs-rhs)/Math.max(rhs,1)<0.05, icon:'⊾', detail:`${lA.toFixed(0)}²+${lB.toFixed(0)}² = ${lhs.toFixed(0)} ≈ ${hyp.toFixed(0)}² = ${rhs.toFixed(0)}` });
                    });
                  // Isosceles
                  const d1=dist(gpPoints[i],gpPoints[j]), d2=dist(gpPoints[j],gpPoints[k]), d3=dist(gpPoints[i],gpPoints[k]), tol=5;
                  if (Math.abs(d1-d2)<tol || Math.abs(d2-d3)<tol || Math.abs(d1-d3)<tol) {
                    let es='', ea='';
                    if (Math.abs(d1-d2)<tol) { es=`${labelFor(i)}${labelFor(j)}≈${labelFor(j)}${labelFor(k)}`; ea=`∠${labelFor(k)}≈∠${labelFor(i)}`; }
                    else if (Math.abs(d2-d3)<tol) { es=`${labelFor(j)}${labelFor(k)}≈${labelFor(i)}${labelFor(k)}`; ea=`∠${labelFor(i)}≈∠${labelFor(j)}`; }
                    else { es=`${labelFor(i)}${labelFor(j)}≈${labelFor(i)}${labelFor(k)}`; ea=`∠${labelFor(j)}≈∠${labelFor(k)}`; }
                    theorems.push({ type:'isosceles', label:'▲ Isosceles Triangle', desc:`${es} → ${ea}`, valid:true, icon:'▲', detail:'Equal sides → opposite angles equal.' });
                  }
                }
              }
            }
          }
        }
        allAngles.forEach(a => {
          if (Math.abs(a.angle-180)<3) theorems.push({ type:'straight', label:'─ Straight Angle', desc:`∠${labelFor(a.p1)}${labelFor(a.vertex)}${labelFor(a.p2)} = ${a.angle.toFixed(1)}°`, valid:true, icon:'─', detail:'Points are collinear — angle = 180°' });
        });
        for (let si = 0; si < gpSegments.length; si++) {
          for (let sj = si+1; sj < gpSegments.length; sj++) {
            const s1=gpSegments[si], s2=gpSegments[sj];
            let shared=-1;
            if (s1.from===s2.from||s1.from===s2.to) shared=s1.from;
            else if (s1.to===s2.from||s1.to===s2.to) shared=s1.to;
            if (shared>=0) {
              const e1=s1.from===shared?s1.to:s1.from, e2=s2.from===shared?s2.to:s2.from;
              const ang=angleBetween(gpPoints[e1],gpPoints[shared],gpPoints[e2]);
              if (ang>5&&ang<175) theorems.push({ type:'vertical', label:'✖ Vertical Angles', desc:`∠${labelFor(e1)}${labelFor(shared)}${labelFor(e2)} = ${ang.toFixed(1)}°, supp = ${(180-ang).toFixed(1)}°`, valid:true, icon:'✖', detail:'Vertical angles congruent; adjacent angles supplementary.' });
            }
          }
        }

        // Mode presets — batch update to avoid stale-closure issues
        const loadTriangle = () => setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), points:[{x:150,y:320},{x:350,y:320},{x:250,y:100}], segments:[{from:0,to:1},{from:1,to:2},{from:2,to:0}], mode:'triangle', connecting:null, feedback:null, challenge:null }}));
        const loadRightTriangle = () => setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), points:[{x:150,y:340},{x:150,y:120},{x:380,y:340}], segments:[{from:0,to:1},{from:0,to:2},{from:1,to:2}], mode:'right', connecting:null, feedback:null, challenge:null }}));
        const loadParallel = () => setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), points:[{x:80,y:140},{x:420,y:140},{x:80,y:300},{x:420,y:300},{x:190,y:50},{x:310,y:380}], segments:[{from:0,to:1},{from:2,to:3},{from:4,to:5}], mode:'parallel', connecting:null, feedback:null, challenge:null }}));
        const loadBisector = () => setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), points:[{x:250,y:330},{x:400,y:180},{x:100,y:180},{x:250,y:100}], segments:[{from:0,to:1},{from:0,to:2},{from:0,to:3}], mode:'bisector', connecting:null, feedback:null, challenge:null }}));

        // Challenge system (5 types)
        const generateChallenge = () => {
          const type = ['triangle_sum','vertical','missing_angle','exterior_angle','polygon_sum'][Math.floor(Math.random()*5)];
          if (type==='triangle_sum') { loadTriangle(); setTimeout(()=>gpUpd('challenge',{type,question:'What do the three angles of ANY triangle always sum to?',answer:'180'}),0); }
          else if (type==='vertical') {
            const a1=30+Math.floor(Math.random()*120);
            setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), points:[{x:250,y:190},{x:250+150*Math.cos(a1*Math.PI/180),y:190-150*Math.sin(a1*Math.PI/180)},{x:250-150*Math.cos(a1*Math.PI/180),y:190+150*Math.sin(a1*Math.PI/180)},{x:400,y:190},{x:100,y:190}], segments:[{from:1,to:2},{from:3,to:4}], mode:'freeform', challenge:{type,question:`If one angle is ${a1}°, what is the vertical angle?`,answer:String(a1)}, feedback:null, challengeAnswer:'' }}));
          } else if (type==='missing_angle') {
            const b1=30+Math.floor(Math.random()*50), b2=40+Math.floor(Math.random()*60);
            loadTriangle(); setTimeout(()=>gpUpd('challenge',{type,question:`Two angles of a triangle are ${b1}° and ${b2}°. What is the third?`,answer:String(180-b1-b2)}),0);
          } else if (type==='exterior_angle') {
            const rA=40+Math.floor(Math.random()*40), rB=30+Math.floor(Math.random()*40);
            loadTriangle(); setTimeout(()=>gpUpd('challenge',{type,question:`Two interior angles are ${rA}° and ${rB}°. What is the exterior angle at the third vertex?`,answer:String(rA+rB),hint:'Exterior angle = sum of the two non-adjacent interior angles.'}),0);
          } else {
            const n=[4,5,6,8][Math.floor(Math.random()*4)];
            gpUpd('challenge',{type,question:`What is the sum of the interior angles of a ${n}-sided polygon?`,answer:String((n-2)*180),hint:`(${n}−2)×180° = ${(n-2)*180}°`});
          }
          gpUpd('feedback',null); gpUpd('challengeAnswer','');
        };
        const checkChallenge = () => {
          if (!gpChallenge) return;
          const ok = Math.abs(parseFloat(gp.challengeAnswer||'') - parseFloat(gpChallenge.answer)) < 1;
          gpUpd('feedback',{ correct:ok, msg: ok ? `✅ Correct! ${gpChallenge.answer}°${gpChallenge.hint?' — '+gpChallenge.hint:''}` : `❌ Answer: ${gpChallenge.answer}°${gpChallenge.hint?'. Hint: '+gpChallenge.hint:''}` });
          setExploreScore(prev=>({correct:prev.correct+(ok?1:0),total:prev.total+1}));
          if (ok && typeof awardStemXP==='function') awardStemXP('geometryProver',5,gpChallenge.type);
        };

        // Guided proofs (5 proofs)
        const GUIDED_PROOFS = [
          { id:'tri_angle_sum', title:'△ Triangle Angle Sum', setup:'triangle', theorem:'The sum of the interior angles of any triangle equals 180°.',
            steps:[
              {statement:'Let △ABC be any triangle.',reason:'Given',options:['Given','Definition','Postulate']},
              {statement:'Draw line ℓ through A parallel to BC.',reason:'Parallel Postulate',options:['Parallel Postulate','Given','Angle Addition']},
              {statement:'∠DAB ≅ ∠ABC (alternate interior angles).',reason:'Alternate Interior Angles',options:['Alternate Interior Angles','Corresponding Angles','Vertical Angles']},
              {statement:'∠EAC ≅ ∠ACB (alternate interior angles).',reason:'Alternate Interior Angles',options:['Alternate Interior Angles','Supplementary Angles','Vertical Angles']},
              {statement:'∠DAB+∠BAC+∠EAC = 180° (straight line).',reason:'Linear Pair / Straight Angle',options:['Linear Pair / Straight Angle','Triangle Inequality','Angle Addition']},
              {statement:'∴ ∠ABC+∠BAC+∠ACB = 180°.',reason:'Substitution',options:['Substitution','Reflexive Property','Transitive Property']}
            ]
          },
          { id:'vertical_angles', title:'✖ Vertical Angles', setup:'vertical', theorem:'Vertical angles formed by two intersecting lines are congruent.',
            steps:[
              {statement:'Lines AB and CD intersect at point O.',reason:'Given',options:['Given','Construction','Postulate']},
              {statement:'∠AOC+∠COB = 180° (linear pair).',reason:'Linear Pair / Straight Angle',options:['Linear Pair / Straight Angle','Vertical Angles','Angle Addition']},
              {statement:'∠COB+∠BOD = 180° (linear pair).',reason:'Linear Pair / Straight Angle',options:['Linear Pair / Straight Angle','Corresponding Angles','Supplementary Angles']},
              {statement:'∠AOC+∠COB = ∠COB+∠BOD.',reason:'Transitive Property',options:['Transitive Property','Reflexive Property','Substitution']},
              {statement:'∴ ∠AOC ≅ ∠BOD.',reason:'Subtraction Property',options:['Subtraction Property','Addition Property','Substitution']}
            ]
          },
          { id:'isosceles', title:'▲ Isosceles Triangle', setup:'triangle', theorem:'If two sides of a triangle are equal, their opposite angles are equal.',
            steps:[
              {statement:'In △ABC, let AB = AC.',reason:'Given',options:['Given','Definition','Construction']},
              {statement:'Draw AD, the bisector of ∠BAC.',reason:'Angle Bisector Construction',options:['Angle Bisector Construction','Perpendicular Bisector','Given']},
              {statement:'∠BAD ≅ ∠CAD.',reason:'Definition of Bisector',options:['Definition of Bisector','Alternate Interior Angles','Given']},
              {statement:'AD ≅ AD.',reason:'Reflexive Property',options:['Reflexive Property','Symmetric Property','Transitive Property']},
              {statement:'△ABD ≅ △ACD (by SAS).',reason:'SAS Congruence',options:['SAS Congruence','SSS Congruence','ASA Congruence']},
              {statement:'∴ ∠ABC ≅ ∠ACB (CPCTC).',reason:'CPCTC',options:['CPCTC','Substitution','Definition']}
            ]
          },
          { id:'exterior_angle', title:'📐 Exterior Angle Thm', setup:'triangle', theorem:'An exterior angle of a triangle equals the sum of the two non-adjacent interior angles.',
            steps:[
              {statement:'Let △ABC be any triangle; extend BC to D.',reason:'Given',options:['Given','Construction','Postulate']},
              {statement:'∠ACD is an exterior angle of △ABC.',reason:'Definition of Exterior Angle',options:['Definition of Exterior Angle','Linear Pair','Given']},
              {statement:'∠ACB+∠ACD = 180° (linear pair on line BD).',reason:'Linear Pair / Straight Angle',options:['Linear Pair / Straight Angle','Supplementary Angles','Angle Addition']},
              {statement:'∠BAC+∠ABC+∠ACB = 180° (triangle angle sum).',reason:'Triangle Angle Sum',options:['Triangle Angle Sum','Exterior Angle','Given']},
              {statement:'∠BAC+∠ABC+∠ACB = ∠ACB+∠ACD (both = 180°).',reason:'Transitive Property',options:['Transitive Property','Substitution','Reflexive Property']},
              {statement:'∴ ∠ACD = ∠BAC+∠ABC.',reason:'Subtraction Property',options:['Subtraction Property','Addition Property','Division Property']}
            ]
          },
          { id:'pythagorean', title:'⊾ Pythagorean Theorem', setup:'right', theorem:'In a right triangle, a²+b²=c², where c is the hypotenuse.',
            steps:[
              {statement:'Let △ABC be a right triangle, right angle at C.',reason:'Given',options:['Given','Definition','Construction']},
              {statement:'Draw altitude CD from C perpendicular to AB.',reason:'Altitude Construction',options:['Altitude Construction','Angle Bisector','Perpendicular Bisector']},
              {statement:'△ACD ~ △ACB and △CBD ~ △ACB (AA similarity).',reason:'AA Similarity',options:['AA Similarity','SAS Similarity','SSS Similarity']},
              {statement:'AC/AB = AD/AC, so AC² = AB·AD.',reason:'Proportional Sides of Similar Triangles',options:['Proportional Sides of Similar Triangles','Pythagorean Theorem','Definition']},
              {statement:'BC/AB = BD/BC, so BC² = AB·BD.',reason:'Proportional Sides of Similar Triangles',options:['Proportional Sides of Similar Triangles','Triangle Inequality','Substitution']},
              {statement:'∴ AC²+BC² = AB(AD+BD) = AB².',reason:'Substitution',options:['Substitution','Reflexive Property','Transitive Property']}
            ]
          }
        ];
        const loadGuidedProof = proofId => {
          const proof = GUIDED_PROOFS.find(p => p.id===proofId);
          if (!proof) return;
          if (proof.setup==='triangle') loadTriangle();
          else if (proof.setup==='right') loadRightTriangle();
          else if (proof.setup==='vertical') setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), points:[{x:250,y:190},{x:370,y:110},{x:130,y:270},{x:400,y:190},{x:100,y:190}], segments:[{from:1,to:2},{from:3,to:4}], mode:'freeform' }}));
          setTimeout(()=>setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver||{}), mode:'guided', guided:{proofId,answers:{},completed:false}, feedback:null, challenge:null }})),0);
        };
        const checkGuidedStep = (stepIdx, selectedReason) => {
          if (!gpGuided) return;
          const proof = GUIDED_PROOFS.find(p => p.id===gpGuided.proofId);
          if (!proof) return;
          const correct = selectedReason===proof.steps[stepIdx].reason;
          const newAnswers = { ...gpGuided.answers, [stepIdx]:{ selected:selectedReason, correct } };
          const allDone = Object.keys(newAnswers).length===proof.steps.length;
          const allCorrect = allDone && Object.values(newAnswers).every(a=>a.correct);
          gpUpd('guided',{ ...gpGuided, answers:newAnswers, completed:allDone });
          if (correct && typeof awardStemXP==='function') awardStemXP('geometryProver',3,proof.id+' step');
          if (allCorrect) { addToast('🎉 Proof complete! +15 XP','success'); if (typeof awardStemXP==='function') awardStemXP('geometryProver',15,proof.id); setExploreScore(prev=>({correct:prev.correct+1,total:prev.total+1})); }
        };

        // ── Theorem Match Game ──
        const MATCH_PAIRS = [
          {id:0, theorem:'Triangle Angle Sum', desc:'Interior angles of a triangle always equal 180°', icon:'△'},
          {id:1, theorem:'Pythagorean Theorem', desc:'In a right triangle, a² + b² = c²', icon:'⊾'},
          {id:2, theorem:'Vertical Angles', desc:'Angles opposite each other at an intersection are equal', icon:'✖'},
          {id:3, theorem:'Isosceles Triangle', desc:'Equal sides produce equal opposite angles', icon:'▲'},
          {id:4, theorem:'Exterior Angle', desc:'Exterior angle = sum of two non-adjacent interior angles', icon:'📐'}
        ];
        const startMatchGame = () => {
          const shuffled = [...Array(5).keys()].sort(()=>Math.random()-0.5);
          gpUpd('matchGame',{shuffled, matches:{}, wrong:null, done:false});
          gpUpd('challenge',{type:'theorem_match',question:'Drag each theorem name to its matching description!'});
          gpUpd('feedback',null); gpUpd('challengeAnswer','');
        };
        const checkMatch = (theoremId, descSlot) => {
          const mg = gp.matchGame; if(!mg) return;
          const correct = MATCH_PAIRS[mg.shuffled[descSlot]].id===theoremId;
          if(correct) {
            const newMatches = {...mg.matches, [theoremId]:descSlot};
            const allDone = Object.keys(newMatches).length===5;
            gpUpd('matchGame',{...mg, matches:newMatches, wrong:null, done:allDone});
            if(typeof stemBeep==='function') stemBeep(523,0.12);
            if(typeof awardStemXP==='function') awardStemXP('geometryProver',4,'theorem_match');
            if(allDone) { addToast('🎉 All theorems matched! +20 XP','success'); if(typeof stemCelebrate==='function') stemCelebrate(); if(typeof awardStemXP==='function') awardStemXP('geometryProver',20,'match_complete'); setExploreScore(prev=>({correct:prev.correct+1,total:prev.total+1})); }
          } else {
            gpUpd('matchGame',{...mg, wrong:descSlot});
            if(typeof stemBeep==='function') stemBeep(180,0.2);
            setTimeout(()=>gpUpd('matchGame',{...(gp.matchGame||mg), wrong:null}),600);
          }
        };
        const renderMatchGame = () => {
          const mg = gp.matchGame; if(!mg) return null;
          const matches = mg.matches||{};
          const matchedIds = new Set(Object.keys(matches).map(Number));
          return React.createElement('div',{className:'space-y-3'},
            React.createElement('style',null,'@keyframes matchPop{0%{transform:scale(.85);opacity:.6}50%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}} .gp-match-pop{animation:matchPop .35s ease}'),
            React.createElement('p',{className:'text-sm font-bold text-violet-800 mb-1'},'🧩 Drag each theorem to its description:'),
            // Theorem chips (left)
            React.createElement('div',{className:'flex flex-wrap gap-2 mb-3'},
              MATCH_PAIRS.filter(p=>!matchedIds.has(p.id)).map(p=>React.createElement('div',{ 
                key:p.id, draggable:true,
                onDragStart:e=>{ _gpDrag.matchId=p.id; e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',p.theorem);}catch(ex){} },
                onDragEnd:()=>{ _gpDrag.matchId=null; },
                role:'button', tabIndex:0,
                'aria-label': 'Theorem: '+p.theorem+'. Press Enter to select, then choose a description.',
                onKeyDown:e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); gpUpd('selectedMatch',gp.selectedMatch===p.id?null:p.id); } },
                onClick:()=>gpUpd('selectedMatch',gp.selectedMatch===p.id?null:p.id),
                className:`px-3 py-2 text-xs font-bold rounded-xl cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-md hover:scale-105 transition-all ${gp.selectedMatch===p.id?'bg-violet-700 text-white ring-2 ring-violet-300':'bg-white border-2 border-violet-200 text-violet-700 hover:border-violet-400'}`,
                style:{touchAction:'none'}
              }, p.icon+' '+p.theorem))
            ),
            // Description slots (right)
            React.createElement('div',{className:'space-y-2'},
              mg.shuffled.map((pairIdx,slot)=>{
                const pair = MATCH_PAIRS[pairIdx];
                const matchedBy = Object.entries(matches).find(([,s])=>s===slot);
                const isMatched = !!matchedBy;
                const matchedPair = isMatched ? MATCH_PAIRS[parseInt(matchedBy[0])] : null;
                const isWrong = mg.wrong===slot;
                return React.createElement('div',{key:'slot'+slot,
                  onDragOver:e=>{ if(!isMatched){e.preventDefault();e.dataTransfer.dropEffect='move';gpUpd('matchDragOver',slot);} },
                  onDragLeave:()=>{ if(gp.matchDragOver===slot) gpUpd('matchDragOver',null); },
                  onDrop:e=>{ e.preventDefault(); if(!isMatched&&_gpDrag.matchId!=null){checkMatch(_gpDrag.matchId,slot);_gpDrag.matchId=null;} gpUpd('matchDragOver',null); },
                  role:'button', tabIndex:0,
                  'aria-label': 'Description slot '+(slot+1)+(isMatched?', filled':', empty. Select a theorem first, then press Enter to place it here.'),
                  onKeyDown:e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(!isMatched&&gp.selectedMatch!=null){checkMatch(gp.selectedMatch,slot);gpUpd('selectedMatch',null);} } },
                  onClick:()=>{ if(!isMatched&&gp.selectedMatch!=null){checkMatch(gp.selectedMatch,slot);gpUpd('selectedMatch',null);} },
                  className:`p-3 rounded-xl border-2 transition-all ${isMatched?'border-emerald-300 bg-emerald-50 gp-match-pop':isWrong?'border-red-400 bg-red-50 gp-shake':gp.matchDragOver===slot?'border-violet-400 bg-violet-50 shadow-md':'border-slate-200 bg-white hover:border-slate-300'}`
                },
                  isMatched
                    ? React.createElement('div',{className:'flex items-center gap-2'}, React.createElement('span',{className:'text-lg'},matchedPair.icon), React.createElement('span',{className:'text-xs font-bold text-emerald-700'},matchedPair.theorem), React.createElement('span',{className:'text-xs text-emerald-500 ml-auto'},'✅'))
                    : React.createElement('div',{className:'flex items-center gap-2'}, React.createElement('span',{className:'text-[11px] text-slate-600 font-bold'},(slot+1)+'.'), React.createElement('span',{className:'text-xs text-slate-600'},pair.desc), !isMatched&&React.createElement('span',{className:'text-[11px] text-violet-400 ml-auto italic'},gp.matchDragOver===slot?'⬇ Drop!':gp.selectedMatch!=null?'👆 Click':'🧩 Drop'))
                );
              })
            ),
            mg.done&&React.createElement('div',{className:'p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-center mt-2 gp-match-pop'}, React.createElement('p',{className:'text-sm font-bold text-emerald-700'},'🎉 Perfect Match! All theorems connected!'))
          );
        };

        // ── Angle Sorter ──
        const ANGLE_CATEGORIES = ['Acute (0°-90°)','Right (90°)','Obtuse (90°-180°)','Straight (180°)','Reflex (180°-360°)'];
        const classifyAngle = deg => deg===90?1:deg===180?3:deg<90?0:deg<180?2:4;
        const startAngleSorter = () => {
          const degs = [15+Math.floor(Math.random()*70), 90, 95+Math.floor(Math.random()*80), 180, 185+Math.floor(Math.random()*170), 5+Math.floor(Math.random()*80), 100+Math.floor(Math.random()*75), 270];
          gpUpd('sorter',{angles:degs.map((d,i)=>({deg:d,id:i})).sort(()=>Math.random()-0.5), sorted:{}, streak:0, wrong:null});
        };
        const sortAngle = (angleId, bucketIdx) => {
          const sr=gp.sorter; if(!sr) return;
          const angle = sr.angles.find(a=>a.id===angleId);
          if(!angle) return;
          const correct = classifyAngle(angle.deg)===bucketIdx;
          if(correct) {
            const newSorted = {...sr.sorted, [angleId]:bucketIdx};
            const newStreak = sr.streak+1;
            gpUpd('sorter',{...sr, sorted:newSorted, streak:newStreak, wrong:null});
            if(typeof stemBeep==='function') stemBeep(440+newStreak*40,0.1);
            if(typeof awardStemXP==='function') awardStemXP('geometryProver',2,'angle_sort');
            if(Object.keys(newSorted).length===sr.angles.length) { addToast('🎉 All angles sorted! +15 XP','success'); if(typeof stemCelebrate==='function') stemCelebrate(); if(typeof awardStemXP==='function') awardStemXP('geometryProver',15,'sort_complete'); setExploreScore(prev=>({correct:prev.correct+1,total:prev.total+1})); }
          } else {
            gpUpd('sorter',{...sr, streak:0, wrong:angleId});
            if(typeof stemBeep==='function') stemBeep(180,0.2);
            setTimeout(()=>{ const cur=gp.sorter||sr; gpUpd('sorter',{...cur, wrong:null}); },600);
          }
        };
        const renderAngleSorter = () => {
          const sr=gp.sorter;
          if(!sr) return React.createElement('div',{className:'text-center p-4'},
            React.createElement('p',{className:'text-sm text-slate-600 mb-3'},'Drag each angle into the correct category bucket!'),
            React.createElement('button',{onClick:startAngleSorter,className:'px-6 py-2 bg-violet-700 text-white font-bold rounded-lg text-sm hover:bg-violet-600 transition-all'},'🎯 Start Angle Sorter')
          );
          const sorted=sr.sorted||{}, unsorted=sr.angles.filter(a=>!sorted.hasOwnProperty(a.id));
          const allDone = Object.keys(sorted).length===sr.angles.length;
          return React.createElement('div',{className:'space-y-3'},
            React.createElement('style',null,'@keyframes sortBounce{0%{transform:scale(.8)}50%{transform:scale(1.1)}100%{transform:scale(1)}} .gp-sort-bounce{animation:sortBounce .3s ease}'),
            // Streak
            sr.streak>=3&&React.createElement('div',{className:'text-center text-xs font-bold text-orange-500'},'🔥 '+sr.streak+'x Streak!'),
            // Angle cards
            React.createElement('div',{className:'flex flex-wrap gap-2 justify-center mb-2'},
              unsorted.map(a=>React.createElement('div',{key:a.id,
                draggable:true,
                onDragStart:e=>{ _gpDrag.angleIdx=a.id; e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',String(a.deg));}catch(ex){} },
                onDragEnd:()=>{ _gpDrag.angleIdx=null; },
                role:'button', tabIndex:0,
                'aria-label': a.deg+' degree angle. Press Enter to select, then choose a category.',
                onKeyDown:e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); gpUpd('selectedAngle',gp.selectedAngle===a.id?null:a.id); } },
                onClick:()=>gpUpd('selectedAngle',gp.selectedAngle===a.id?null:a.id),
                className:`flex flex-col items-center p-2 rounded-xl cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-lg hover:scale-110 transition-all border-2 ${sr.wrong===a.id?'border-red-400 bg-red-50 gp-shake':gp.selectedAngle===a.id?'border-violet-400 bg-violet-50 scale-105':'border-slate-200 bg-white'}`,
                style:{touchAction:'none',width:'70px'}
              },
                // Mini SVG arc
                React.createElement('svg',{ 'aria-hidden': 'true',width:50,height:40,viewBox:'0 0 50 40'},
                  React.createElement('line',{x1:25,y1:35,x2:48,y2:35,stroke:'#6d28d9',strokeWidth:2}),
                  (()=>{ const rad=a.deg*Math.PI/180; const ex=25+22*Math.cos(-rad),ey=35+22*Math.sin(-rad); return React.createElement(React.Fragment,null,
                    React.createElement('line',{x1:25,y1:35,x2:ex,y2:ey,stroke:'#6d28d9',strokeWidth:2}),
                    React.createElement('path',{d:`M 38 35 A 13 13 0 ${a.deg>180?1:0} 0 ${25+13*Math.cos(-rad)} ${35+13*Math.sin(-rad)}`,fill:'hsla(270,80%,60%,0.15)',stroke:'#8b5cf6',strokeWidth:1.5})
                  ); })()
                ),
                React.createElement('span',{className:'text-xs font-bold text-violet-800 mt-0.5'},a.deg+'°')
              ))
            ),
            // Category buckets
            React.createElement('div',{className:'grid grid-cols-5 gap-1.5'},
              ANGLE_CATEGORIES.map((cat,ci)=>{
                const inBucket = sr.angles.filter(a=>sorted[a.id]===ci);
                return React.createElement('div',{key:ci,
                  onDragOver:e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; gpUpd('sorterDragOver',ci); },
                  onDragLeave:()=>{ if(gp.sorterDragOver===ci) gpUpd('sorterDragOver',null); },
                  onDrop:e=>{ e.preventDefault(); if(_gpDrag.angleIdx!=null){sortAngle(_gpDrag.angleIdx,ci);_gpDrag.angleIdx=null;} gpUpd('sorterDragOver',null); },
                  role:'button', tabIndex:0,
                  'aria-label': cat+' category. Select an angle first, then press Enter to place it here.',
                  onKeyDown:e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(gp.selectedAngle!=null){sortAngle(gp.selectedAngle,ci);gpUpd('selectedAngle',null);} } },
                  onClick:()=>{ if(gp.selectedAngle!=null){sortAngle(gp.selectedAngle,ci);gpUpd('selectedAngle',null);} },
                  className:`p-2 rounded-xl border-2 min-h-[70px] transition-all text-center ${gp.sorterDragOver===ci?'border-violet-400 bg-violet-50 shadow-md':'border-slate-200 bg-slate-50 hover:border-slate-300'}`
                },
                  React.createElement('p',{className:'text-[11px] font-bold text-slate-600 mb-1'},cat),
                  inBucket.map(a=>React.createElement('div',{key:a.id,className:'text-[11px] font-bold text-emerald-800 bg-emerald-100 rounded px-1 py-0.5 mb-0.5 gp-sort-bounce'},a.deg+'° ✅'))
                );
              })
            ),
            allDone&&React.createElement('div',{className:'p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-center gp-sort-bounce'}, React.createElement('p',{className:'text-sm font-bold text-emerald-700'},'🎉 All angles sorted correctly!'), React.createElement('button',{onClick:startAngleSorter,className:'mt-2 px-4 py-1.5 bg-violet-700 text-white font-bold rounded-lg text-xs hover:bg-violet-600'},'🔄 New Round'))
          );
        };

        // Discover missions (5 missions)
        const MISSIONS = [
          { id:'tri_sum', icon:'△', title:'Triangle Angle Sum',
            bigIdea:'The three angles of ANY triangle ALWAYS sum to exactly 180°. Drag it into any shape — the sum never changes!',
            steps:[
              {type:'action', text:'Click "△ Triangle" below to load a triangle. Three angle values appear at the vertices — read them.'},
              {type:'predict', field:'sum', q:'Add the three angles you see. What is their sum?', ph:'I measured ___+___+___ = ___°'},
              {type:'check', text:'Now drag any vertex to completely reshape the triangle. Watch the angles change. Does the total always stay the same?'},
              {type:'reflect', q:'What happened to the angle sum when you reshaped the triangle?', field:'ref', opts:['It stayed 180°','It changed slightly','It changed a lot'], correct:'It stayed 180°'},
              {type:'conclude', bigIdea:true}
            ]
          },
          { id:'exterior', icon:'📐', title:'Exterior Angle Discovery',
            bigIdea:'An exterior angle = the sum of the TWO non-adjacent interior angles. If two angles are 50° and 60°, the exterior angle at the third vertex is always 110°!',
            steps:[
              {type:'action', text:'Load a Triangle. The three angles are A, B, C. Imagine extending side BC beyond vertex C — the angle formed outside is the exterior angle at C.'},
              {type:'predict', field:'ext', q:'Read angles A and B from the canvas. What do you predict the exterior angle at C equals?', ph:'A+B = ___+___ = ___°'},
              {type:'check', text:'Verify: exterior = 180°−∠C, and since A+B+C=180°, exterior = A+B. Drag the triangle to test with different shapes!'},
              {type:'reflect', q:'The exterior angle at a vertex equals...', field:'ref2', opts:['The sum of the other two interior angles','180° minus the adjacent interior angle','Both — they\'re the same thing!'], correct:'Both — they\'re the same thing!'},
              {type:'conclude', bigIdea:true}
            ]
          },
          { id:'parallel', icon:'∥', title:'Parallel Lines & Transversal',
            bigIdea:'When a transversal crosses parallel lines: corresponding angles (same side) are EQUAL, alternate interior angles are EQUAL, and co-interior angles sum to 180°.',
            steps:[
              {type:'action', text:'Click "∥ Parallel" below to load the preset — two horizontal lines cut by a diagonal transversal.'},
              {type:'predict', field:'corr', q:'The transversal crosses both lines. Will the angle on the TOP crossing (left side) equal the angle on the BOTTOM crossing (left side)?', ph:'I predict they will be... equal / different'},
              {type:'check', text:'Look at the angle values at each intersection. Compare same-side angles (corresponding) and opposite-side angles (alternate interior). Drag the transversal end-points to try different angles.'},
              {type:'reflect', q:'Corresponding angles (same side at both intersections) are...', field:'ref3', opts:['Always equal','Always supplementary (sum to 180°)','Unrelated — they just happen to match sometimes'], correct:'Always equal'},
              {type:'conclude', bigIdea:true}
            ]
          },
          { id:'polygon', icon:'⬡', title:'Polygon Angle Sums',
            bigIdea:'For any polygon with n sides, the angle sum = (n−2)×180°. Every polygon can be divided into (n−2) triangles, each contributing 180°!',
            steps:[
              {type:'action', text:'You know triangles sum to 180°. Build a quadrilateral (4 sides): click 4 points and use "Connect Last Two" + connect the 4th back to the 1st. Or load a Triangle and add one more connected point.'},
              {type:'predict', field:'quad', q:'A quadrilateral can be split into 2 triangles. Each triangle = 180°. Predict the total angle sum:', ph:'2 × 180° = ___°'},
              {type:'check', text:'Look at the detected theorems — add up all 4 angles. Was your prediction right? Now think: a pentagon (5 sides) splits into 3 triangles...'},
              {type:'predict', field:'penta', q:'Pentagon (5 sides) angle sum = how many triangles × 180°?', ph:'___ × 180° = ___°'},
              {type:'conclude', bigIdea:true}
            ]
          }
        ];
        const startMission = missionId => {
          if (missionId==='tri_sum'||missionId==='exterior') loadTriangle();
          else if (missionId==='parallel') loadParallel();
          gpUpd('mission',{ id:missionId, step:0, data:{}, done:false });
        };
        const advanceMission = nextStep => { if (gpMission) gpUpd('mission',{ ...gpMission, step:nextStep }); };

        // Mouse handlers
        const handleCanvasMouseDown = e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx=e.clientX-rect.left, my=e.clientY-rect.top;
          for (let i=0; i<gpPoints.length; i++) {
            if (dist({x:mx,y:my},gpPoints[i])<12) {
              if (gpConnecting!=null && gpConnecting!==i) { gpUpd('segments',[...gpSegments,{from:gpConnecting,to:i}]); gpUpd('connecting',null); return; }
              gpUpd('dragging',i); return;
            }
          }
          const newPt={ x:Math.round(mx/gridStep)*gridStep, y:Math.round(my/gridStep)*gridStep };
          const newPts=[...gpPoints,newPt];
          gpUpd('points',newPts);
          if (gpConnecting!=null) { gpUpd('segments',[...gpSegments,{from:gpConnecting,to:newPts.length-1}]); gpUpd('connecting',null); }
        };
        const handleCanvasMouseMove = e => {
          if (gpDragging==null) return;
          const rect=e.currentTarget.getBoundingClientRect();
          gpUpd('points',gpPoints.map((p,i)=>i===gpDragging?{x:Math.max(10,Math.min(W-10,e.clientX-rect.left)),y:Math.max(10,Math.min(H-10,e.clientY-rect.top))}:p));
        };
        const handleCanvasMouseUp = () => { if (gpDragging!=null) gpUpd('dragging',null); };

        // Keyboard accessibility (WCAG 2.1.1): focus the SVG and use Enter to place,
        // arrow keys to nudge the most recent point, Delete to remove it, N to cycle selection.
        const gpSelected = (typeof gpHoverIdx === 'number' && gpHoverIdx >= 0 && gpHoverIdx < gpPoints.length) ? gpHoverIdx : (gpPoints.length - 1);
        const handleCanvasKeyDown = e => {
          const k = e.key;
          // Enter or Space: add a point at canvas center (or next to selected, with offset)
          if (k === 'Enter' || k === ' ') {
            let nx, ny;
            if (gpSelected >= 0 && gpPoints[gpSelected]) {
              nx = Math.min(W - 10, gpPoints[gpSelected].x + gridStep);
              ny = gpPoints[gpSelected].y;
            } else {
              nx = Math.round((W / 2) / gridStep) * gridStep;
              ny = Math.round((H / 2) / gridStep) * gridStep;
            }
            const newPts = [...gpPoints, { x: nx, y: ny }];
            gpUpd('points', newPts);
            gpUpd('hoverIdx', newPts.length - 1);
            if (gpConnecting != null) { gpUpd('segments', [...gpSegments, { from: gpConnecting, to: newPts.length - 1 }]); gpUpd('connecting', null); }
            e.preventDefault();
            return;
          }
          // Arrow keys: nudge selected point
          const step = e.shiftKey ? gridStep * 2 : gridStep;
          if (gpSelected >= 0 && gpPoints[gpSelected]) {
            let dx = 0, dy = 0;
            if (k === 'ArrowLeft') dx = -step;
            else if (k === 'ArrowRight') dx = step;
            else if (k === 'ArrowUp') dy = -step;
            else if (k === 'ArrowDown') dy = step;
            if (dx !== 0 || dy !== 0) {
              gpUpd('points', gpPoints.map((p, i) => i === gpSelected ? { x: Math.max(10, Math.min(W - 10, p.x + dx)), y: Math.max(10, Math.min(H - 10, p.y + dy)) } : p));
              e.preventDefault();
              return;
            }
          }
          // N or Tab-equivalent (we don't hijack Tab): cycle selection forward
          if (k === 'n' || k === 'N') {
            if (gpPoints.length > 0) gpUpd('hoverIdx', (gpSelected + 1) % gpPoints.length);
            e.preventDefault();
            return;
          }
          if (k === 'p' || k === 'P') {
            if (gpPoints.length > 0) gpUpd('hoverIdx', (gpSelected - 1 + gpPoints.length) % gpPoints.length);
            e.preventDefault();
            return;
          }
          // Delete or Backspace: remove selected point (and any segments connected to it)
          if (k === 'Delete' || k === 'Backspace') {
            if (gpSelected >= 0 && gpPoints[gpSelected]) {
              const newPts = gpPoints.filter((_, i) => i !== gpSelected);
              const newSegs = gpSegments
                .filter(s => s.from !== gpSelected && s.to !== gpSelected)
                .map(s => ({ from: s.from > gpSelected ? s.from - 1 : s.from, to: s.to > gpSelected ? s.to - 1 : s.to }));
              gpUpd('points', newPts);
              gpUpd('segments', newSegs);
              gpUpd('hoverIdx', Math.min(gpSelected, newPts.length - 1));
              e.preventDefault();
            }
          }
        };

        const helperText = gpPoints.length===0 ? '👆 Click canvas to place your first point'
          : gpConnecting!=null ? `↗️ Click a point or canvas to draw segment from ${labelFor(gpConnecting)}`
          : gpDragging!=null ? `✋ Dragging ${labelFor(gpDragging)} — release to drop`
          : gpPoints.length===1 ? 'Place another point, then "Draw Segment"'
          : gpSegments.length===0 ? 'Click "Draw Segment" or "Connect Last Two"'
          : theorems.length>0 ? (gpInvestigate&&!gpRevealed ? `🔍 ${theorems.length} relationship(s) detected — what do you think they are?` : `🔍 ${theorems.length} theorem(s) detected — drag to explore!`)
          : 'Drag points • Add segments to discover theorems';

        // SVG Canvas
        const renderCanvas = () => React.createElement('svg', { width:W, height:H, viewBox:`0 0 ${W} ${H}`, className:'cursor-crosshair select-none', style:{background:'#faf5ff', outline:'none'}, role:'application', tabIndex:0, 'aria-label': `Geometry prover canvas. ${gpPoints.length} point${gpPoints.length===1?'':'s'} placed${gpSelected>=0?', point '+(gpSelected+1)+' selected':''}. Keyboard: Enter or Space to place a point near the selection, arrow keys to nudge the selected point, N or P to cycle selection, Delete to remove selected point.`, onKeyDown:handleCanvasKeyDown, onMouseDown:handleCanvasMouseDown, onMouseMove:handleCanvasMouseMove, onMouseUp:handleCanvasMouseUp, onMouseLeave:()=>{ handleCanvasMouseUp(); gpUpd('hoverIdx',-1); } },
          React.createElement('title',null,'Geometry Prover Canvas'),
          Array.from({length:Math.floor(W/gridStep)+1}).map((_,i)=>React.createElement('line',{key:'gv'+i,x1:i*gridStep,y1:0,x2:i*gridStep,y2:H,stroke:'#ede9fe',strokeWidth:0.5})),
          Array.from({length:Math.floor(H/gridStep)+1}).map((_,i)=>React.createElement('line',{key:'gh'+i,x1:0,y1:i*gridStep,x2:W,y2:i*gridStep,stroke:'#ede9fe',strokeWidth:0.5})),
          gpSegments.map((seg,si)=>{ const p1=gpPoints[seg.from],p2=gpPoints[seg.to]; if(!p1||!p2) return null; const mid=midpoint(p1,p2); return React.createElement(React.Fragment,{key:'seg'+si}, React.createElement('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:'#6d28d9',strokeWidth:2.5,strokeLinecap:'round'}), gpShowLabels&&React.createElement('rect',{x:mid.x-18,y:mid.y-9,width:36,height:16,rx:4,fill:'#f5f3ff',stroke:'#c4b5fd',strokeWidth:0.5}), gpShowLabels&&React.createElement('text',{x:mid.x,y:mid.y+4,textAnchor:'middle',style:{fontSize:'9px',fontWeight:'bold',fill:'#6d28d9'}},dist(p1,p2).toFixed(0)+'px')); }),
          allAngles.filter(a=>a.angle>2&&a.angle<178).map((a,ai)=>{
            const v=gpPoints[a.vertex],p1=gpPoints[a.p1],p2=gpPoints[a.p2]; if(!v||!p1||!p2) return null;
            const arcR=28, ang1=Math.atan2(p1.y-v.y,p1.x-v.x), ang2=Math.atan2(p2.y-v.y,p2.x-v.x);
            let sA=ang1,eA=ang2,diff=eA-sA; if(diff<0) diff+=2*Math.PI; if(diff>Math.PI){sA=ang2;eA=ang1;diff=2*Math.PI-diff;}
            const sx=v.x+arcR*Math.cos(sA),sy=v.y+arcR*Math.sin(sA),ex=v.x+arcR*Math.cos(eA),ey=v.y+arcR*Math.sin(eA);
            const mA=sA+diff/2,lx=v.x+(arcR+14)*Math.cos(mA),ly=v.y+(arcR+14)*Math.sin(mA),isRight=Math.abs(a.angle-90)<2;
            return React.createElement(React.Fragment,{key:'arc'+ai},
              isRight ? React.createElement('rect',{x:v.x+6*Math.cos(mA)-6,y:v.y+6*Math.sin(mA)-6,width:12,height:12,fill:'none',stroke:'#7c3aed',strokeWidth:1.5,transform:`rotate(${mA*180/Math.PI} ${v.x+6*Math.cos(mA)} ${v.y+6*Math.sin(mA)})`})
                      : React.createElement('path',{d:`M ${sx} ${sy} A ${arcR} ${arcR} 0 ${diff>Math.PI?1:0} 1 ${ex} ${ey}`,fill:'hsla(270,80%,60%,0.12)',stroke:'#8b5cf6',strokeWidth:1.5}),
              gpShowLabels&&React.createElement('text',{x:lx,y:ly+3,textAnchor:'middle',style:{fontSize:'10px',fontWeight:'bold',fill:isRight?'#059669':'#7c3aed'}},a.angle.toFixed(1)+'°')
            );
          }),
          gpPoints.map((p,i)=>{ const isHover=gpHoverIdx===i,isDrag=gpDragging===i,isConn=gpConnecting===i; return React.createElement(React.Fragment,{key:'pt'+i}, isHover&&!isDrag&&React.createElement('circle',{cx:p.x,cy:p.y,r:14,fill:'none',stroke:'#a78bfa',strokeWidth:1.5,opacity:0.5}), React.createElement('circle',{cx:p.x,cy:p.y,r:isDrag?10:isHover?9:7,fill:isConn?'#6366f1':isDrag?'#a78bfa':isHover?'#8b5cf6':'#7c3aed',stroke:'#fff',strokeWidth:2.5,className:'cursor-grab',style:{filter:(isDrag||isHover||isConn)?'drop-shadow(0 0 5px rgba(139,92,246,0.75))':'none',transition:'filter 0.15s'},onMouseEnter:()=>gpUpd('hoverIdx',i),onMouseLeave:()=>gpUpd('hoverIdx',-1)}), React.createElement('text',{x:p.x+12,y:p.y-10,style:{fontSize:isHover?'14px':'13px',fontWeight:'bold',fill:'#4c1d95'}},labelFor(i))); }),
          gpConnecting!=null&&gpPoints[gpConnecting]&&React.createElement('line',{x1:gpPoints[gpConnecting].x,y1:gpPoints[gpConnecting].y,x2:gpPoints[gpConnecting].x+1,y2:gpPoints[gpConnecting].y+1,stroke:'#a78bfa',strokeWidth:1.5,strokeDasharray:'4,3',opacity:0.6}),
          gpPoints.length===0&&React.createElement('text',{x:W/2,y:H/2,textAnchor:'middle',style:{fontSize:'14px',fill:'#a78bfa',fontWeight:'600'}},'Click to place points • "Draw Segment" to connect')
        );

        // Theorem panel (with investigate gate)
        const renderTheoremPanel = () => {
          if (theorems.length===0) return null;
          if (gpInvestigate&&!gpRevealed) return React.createElement('div',{className:'bg-amber-50 rounded-xl p-3 border-2 border-amber-200 border-dashed'},
            React.createElement('div',{className:'flex items-center gap-2 mb-2'}, React.createElement('span',{className:'text-base'},'🔍'), React.createElement('p',{className:'text-sm font-bold text-amber-700 flex-1'},`${theorems.length} relationship${theorems.length>1?'s':''} detected!`)),
            React.createElement('p',{className:'text-xs text-amber-600 mb-2'},'Investigate Mode ON — write your prediction before revealing!'),
            React.createElement('textarea',{rows:2,placeholder:'What theorems or rules do you think apply here?','aria-label':'Theorem prediction',value:gp.prediction||'',onChange:e=>gpUpd('prediction',e.target.value),className:'w-full px-3 py-2 border-2 border-amber-600 rounded-lg text-sm mb-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-300 resize-none'}),
            React.createElement('button',{onClick:()=>gpUpd('revealed',true),disabled:!(gp.prediction||'').trim(),className:'w-full py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800 transition-all disabled:opacity-40'},'👁 Reveal Theorems')
          );
          return React.createElement('div',{className:'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200'},
            React.createElement('div',{className:'flex items-center justify-between mb-2'}, React.createElement('p',{className:'text-xs font-bold text-violet-700 uppercase'},'🔍 Detected Theorems'), gpInvestigate&&gpRevealed&&React.createElement('button',{onClick:()=>{gpUpd('revealed',false);gpUpd('prediction','');},className:'text-[11px] text-violet-500 underline hover:text-violet-700'},'Hide again')),
            React.createElement('div',{className:'space-y-2'},
              theorems.map((th,ti)=>React.createElement('div',{key:ti,className:`flex items-start gap-2 bg-white rounded-lg p-2.5 border ${th.valid?'border-emerald-200':'border-amber-200'}`},
                React.createElement('span',{className:'text-lg leading-none pt-0.5'},th.icon),
                React.createElement('div',{className:'flex-1 min-w-0'}, React.createElement('p',{className:`text-xs font-bold ${th.valid?'text-emerald-700':'text-amber-700'}`},th.label), React.createElement('p',{className:'text-[11px] text-slate-600 font-mono break-words'},th.desc), React.createElement('p',{className:'text-[11px] text-slate-600 mt-0.5 italic'},th.detail)),
                React.createElement('span',{className:`text-xs font-bold ${th.valid?'text-emerald-500':'text-amber-500'}`},th.valid?'✓':'≈')
              ))
            )
          );
        };

        // Guided proof panel — drag-and-drop reason chips
        const renderGuidedProof = () => {
          if (!gpGuided) return null;
          const proof = GUIDED_PROOFS.find(p=>p.id===gpGuided.proofId);
          if (!proof) return null;
          const answers=gpGuided.answers||{}, done=Object.values(answers).filter(a=>a.correct).length, pct=Math.round(done/proof.steps.length*100);
          // Collect all unique reasons from this proof, excluding already-placed correct ones
          const usedReasons = new Set(Object.entries(answers).filter(([,a])=>a.correct).map(([si])=>proof.steps[parseInt(si)].reason));
          const allReasons = [];
          proof.steps.forEach(s => { s.options.forEach(o => { if (allReasons.indexOf(o)===-1) allReasons.push(o); }); });
          const availableReasons = allReasons.filter(r=>!usedReasons.has(r));
          const selectedChip = gp.selectedChip || null;
          const dragOverStep = gp.dragOverStep;
          // Place chip via click fallback
          const placeChip = (si, reason) => { checkGuidedStep(si, reason); gpUpd('selectedChip',null); gpUpd('dragOverStep',null); if(typeof stemBeep==='function') stemBeep(523,0.12); };
          return React.createElement('div',{className:'bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-300 mt-3'},
            // CSS for DnD animations
            React.createElement('style',null,'@keyframes gpSnapIn{0%{transform:scale(.8);opacity:.5}100%{transform:scale(1);opacity:1}} @keyframes gpShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}} .gp-snap{animation:gpSnapIn .3s ease} .gp-shake{animation:gpShake .4s ease}'),
            // Header
            React.createElement('div',{className:'flex items-center gap-2 mb-3'}, React.createElement('div',{className:'w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-base'},'📝'), React.createElement('div',{className:'flex-1'}, React.createElement('h4',{className:'text-sm font-bold text-emerald-800'},proof.title), React.createElement('p',{className:'text-[11px] text-emerald-600 italic'},proof.theorem)), React.createElement('div',{className:`text-xs font-bold px-2 py-1 rounded-full ${pct===100?'bg-emerald-700 text-white':'bg-emerald-100 text-emerald-700'}`},pct+'%')),
            React.createElement('div',{className:'w-full h-1.5 bg-emerald-200 rounded-full mb-3 overflow-hidden'}, React.createElement('div',{className:'h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500',style:{width:pct+'%'}})),
            // Proof selector
            React.createElement('div',{className:'flex gap-1.5 mb-3 flex-wrap'}, GUIDED_PROOFS.map(p=>React.createElement('button',{key:p.id,onClick:()=>loadGuidedProof(p.id),className:`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${gpGuided.proofId===p.id?'bg-emerald-700 text-white':'bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-600'}`},p.title.split(' ').slice(0,3).join(' ')))),
            // ── Reason Chip Bank (draggable) ──
            React.createElement('div',{className:'mb-3'},
              React.createElement('p',{className:'text-[11px] font-bold text-emerald-700 uppercase mb-1.5'},'🧩 Drag a reason to the correct row (or click to select, then click the row):'),
              React.createElement('div',{className:'flex flex-wrap gap-1.5'},
                availableReasons.map(reason => React.createElement('div',{ 
                  key:reason,
                  draggable:true,
                  onDragStart:e=>{ _gpDrag.reason=reason; e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',reason);}catch(ex){} },
                  onDragEnd:()=>{ _gpDrag.reason=null; },
                  role:'button', tabIndex:0,
                  'aria-label': 'Reason: '+reason+'. Press Enter to select, then choose a proof row.',
                  onKeyDown:e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); gpUpd('selectedChip', selectedChip===reason?null:reason); } },
                  onClick:()=>{ gpUpd('selectedChip', selectedChip===reason?null:reason); },
                  className:`px-2.5 py-1.5 text-[11px] font-bold rounded-lg cursor-grab active:cursor-grabbing select-none transition-all shadow-sm hover:shadow-md hover:scale-105 ${selectedChip===reason?'bg-violet-700 text-white ring-2 ring-violet-300 scale-105':'bg-white text-emerald-700 border border-emerald-200 hover:border-emerald-400'}`,
                  style:{touchAction:'none'}
                }, '🧩 '+reason))
              )
            ),
            // ── Proof Table ──
            React.createElement('div',{className:'bg-white rounded-xl border border-emerald-200 overflow-hidden'},
              React.createElement('div',{className:'grid grid-cols-12 bg-emerald-100 text-[11px] font-bold text-emerald-800 border-b border-emerald-200'}, React.createElement('div',{className:'col-span-1 p-2 text-center'},'#'), React.createElement('div',{className:'col-span-6 p-2'},'Statement'), React.createElement('div',{className:'col-span-4 p-2'},'Reason'), React.createElement('div',{className:'col-span-1 p-2 text-center'},'✓')),
              proof.steps.map((step,si)=>{
                const ans=answers[si],isCorrect=ans&&ans.correct,canAnswer=!isCorrect&&(si===0||(answers[si-1]&&answers[si-1].correct));
                const isHovered = dragOverStep===si;
                return React.createElement('div',{key:'s'+si,
                  className:`grid grid-cols-12 border-b border-emerald-100 last:border-0 transition-all ${isCorrect?'bg-emerald-50':ans&&!isCorrect?'bg-red-50 gp-shake':isHovered?'bg-violet-50 ring-2 ring-violet-300 ring-inset':canAnswer?'bg-white':'bg-slate-50 opacity-60'}`,
                  onDragOver:e=>{ if(canAnswer){ e.preventDefault(); e.dataTransfer.dropEffect='move'; gpUpd('dragOverStep',si); } },
                  onDragLeave:()=>{ if(dragOverStep===si) gpUpd('dragOverStep',null); },
                  onDrop:e=>{ e.preventDefault(); if(canAnswer&&_gpDrag.reason){ placeChip(si,_gpDrag.reason); _gpDrag.reason=null; } gpUpd('dragOverStep',null); },
                  role:'button', tabIndex:0,
                  'aria-label': 'Proof row '+(si+1)+'. Select a reason first, then press Enter to place it here.',
                  onKeyDown:e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(canAnswer&&selectedChip){ placeChip(si,selectedChip); } } },
                  onClick:()=>{ if(canAnswer&&selectedChip){ placeChip(si,selectedChip); } }
                },
                  React.createElement('div',{className:'col-span-1 p-2 text-center text-xs font-bold text-emerald-600'},si+1),
                  React.createElement('div',{className:'col-span-6 p-2 text-[11px] text-slate-700 font-medium'},step.statement),
                  React.createElement('div',{className:'col-span-4 p-1.5'},
                    isCorrect ? React.createElement('div',{className:'text-[11px] font-bold text-emerald-800 bg-emerald-100 rounded px-2 py-1 gp-snap'},'✅ '+step.reason)
                    : canAnswer ? React.createElement('div',{className:`h-8 flex items-center justify-center rounded-lg border-2 border-dashed transition-all ${isHovered?'border-violet-400 bg-violet-50 text-violet-600':'border-emerald-200 text-emerald-400'} ${ans&&!isCorrect?'border-red-300 text-red-500':''} text-[11px] font-semibold`},
                        ans&&!isCorrect ? '❌ Try again — drag the correct reason here' : isHovered ? '⬇ Drop here!' : selectedChip ? '👆 Click to place' : '🧩 Drag reason here')
                    : React.createElement('div',{className:'text-[11px] text-slate-600 italic px-2 py-1'},'🔒 Locked')
                  ),
                  React.createElement('div',{className:'col-span-1 p-2 text-center text-sm'},isCorrect?'✅':ans?'❌':canAnswer?'⭕':'⏳')
                );
              })
            ),
            // Completion
            gpGuided.completed&&Object.values(answers).every(a=>a.correct)&&React.createElement('div',{className:'mt-3 p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-center gp-snap'},
              React.createElement('p',{className:'text-sm font-bold text-emerald-700'},'🎉 Proof Complete! Q.E.D.'),
              React.createElement('p',{className:'text-[11px] text-emerald-600 mt-1'},proof.theorem)
            ),
            Object.values(answers).some(a=>!a.correct)&&React.createElement('div',{className:'mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200'}, React.createElement('p',{className:'text-[11px] text-amber-700'},'💡 Drag a different reason chip from the bank above. Think about which property directly justifies the statement.'))
          );
        };

        // Discover tab
        const renderDiscover = () => {
          if (!gpMission) return React.createElement('div',{className:'space-y-3'},
            React.createElement('p',{className:'text-sm font-bold text-violet-800' + onHostInk},'🧭 Choose a Discovery Mission'),
            React.createElement('p',{className:'text-xs text-slate-600 mb-2' + onHostInk},'Each mission guides you to discover a theorem through measurement and prediction — no formulas given away!'),
            React.createElement('div',{className:'space-y-2'}, MISSIONS.map(m=>React.createElement('button',{key:m.id,onClick:()=>startMission(m.id),className:'w-full flex items-center gap-3 p-3 bg-white border-2 border-violet-100 rounded-xl hover:border-violet-400 hover:bg-violet-50 text-left transition-all'},
              React.createElement('span',{className:'text-2xl w-10 text-center shrink-0'},m.icon),
              React.createElement('div',null, React.createElement('p',{className:'text-sm font-bold text-violet-800'},m.title), React.createElement('p',{className:'text-[11px] text-slate-600'},'Discover the rule yourself through measurement & prediction'))
            ))),
            React.createElement('div',{className:'mt-3 pt-3 border-t-2 border-violet-100'},
              React.createElement('p',{className:'text-sm font-bold text-orange-700 mb-2'},'🎲 Quick Activities'),
              React.createElement('button',{onClick:function(){gpUpd('mission',{id:'angle_sorter',step:0,data:{}});startAngleSorter();},className:'w-full flex items-center gap-3 p-3 bg-white border-2 border-orange-100 rounded-xl hover:border-orange-400 hover:bg-orange-50 text-left transition-all'},
                React.createElement('span',{className:'text-2xl w-10 text-center shrink-0'},'📐'),
                React.createElement('div',null,React.createElement('p',{className:'text-sm font-bold text-orange-700'},'Angle Sorter'),React.createElement('p',{className:'text-[11px] text-slate-600'},'Drag angles into the correct category — acute, right, obtuse, straight, or reflex!'))
              )
            )
          );
          if (gpMission.id==='angle_sorter') return React.createElement('div',{className:'space-y-3'},
            React.createElement('div',{className:'flex items-center gap-2'},
              React.createElement('span',{className:'text-xl'},'📐'),
              React.createElement('p',{className:'text-sm font-bold text-orange-700 flex-1'},'Angle Sorter'),
              React.createElement('button',{onClick:function(){gpUpd('mission',null);gpUpd('sorter',null);},className:'text-[11px] text-slate-600 hover:text-slate-600 underline'},'Exit')
            ),
            renderAngleSorter()
          );
          const mission=MISSIONS.find(m=>m.id===gpMission.id);
          if (!mission) return null;
          const step=gpMission.step, data=gpMission.data||{};
          if (step>=mission.steps.length) return React.createElement('div',{className:'bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-300 text-center'},
            React.createElement('div',{className:'text-4xl mb-2'},'🎉'), React.createElement('h4',{className:'text-base font-bold text-emerald-800 mb-2'},'Mission Complete!'),
            React.createElement('div',{className:'bg-emerald-100 rounded-xl p-3 border border-emerald-300 mb-3 text-left'}, React.createElement('p',{className:'text-[11px] font-bold text-emerald-600 uppercase mb-1'},'💡 The Big Idea'), React.createElement('p',{className:'text-sm text-emerald-800'},mission.bigIdea)),
            React.createElement('div',{className:'flex gap-2'}, React.createElement('button',{onClick:()=>gpUpd('mission',null),className:'flex-1 py-2 bg-violet-700 text-white font-bold rounded-lg text-sm hover:bg-violet-600 transition-all'},'🧭 Try Another'), React.createElement('button',{onClick:()=>gpUpd('mission',{...gpMission,step:0,data:{}}),className:'flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'},'↺ Repeat'))
          );
          const cs=mission.steps[step], pct=Math.round(step/mission.steps.length*100);
          return React.createElement('div',{className:'space-y-3'},
            React.createElement('div',{className:'flex items-center gap-2'},
              React.createElement('span',{className:'text-xl'},mission.icon),
              React.createElement('div',{className:'flex-1'}, React.createElement('p',{className:'text-sm font-bold text-violet-800'},mission.title), React.createElement('div',{className:'w-full h-1.5 bg-violet-100 rounded-full mt-1 overflow-hidden'}, React.createElement('div',{className:'h-full bg-gradient-to-r from-violet-400 to-purple-400 rounded-full transition-all duration-500',style:{width:pct+'%'}}))),
              React.createElement('span',{className:'text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full'},`${step+1}/${mission.steps.length}`),
              React.createElement('button',{onClick:()=>gpUpd('mission',null),className:'text-[11px] text-slate-600 hover:text-slate-600 underline'},'Exit')
            ),
            React.createElement('div',{className:'bg-white rounded-xl p-3 border-2 border-violet-200'},
              cs.type==='action'&&React.createElement('div',null, React.createElement('p',{className:'text-[11px] font-bold text-violet-500 uppercase mb-1'},'📋 Do This'), React.createElement('p',{className:'text-sm text-slate-700 mb-2'},cs.text), React.createElement('button',{onClick:()=>advanceMission(step+1),className:'px-4 py-1.5 bg-violet-700 text-white font-bold rounded-lg text-xs hover:bg-violet-600 transition-all'},'Done →')),
              cs.type==='predict'&&React.createElement('div',null, React.createElement('p',{className:'text-[11px] font-bold text-amber-500 uppercase mb-1'},'🤔 Make a Prediction'), React.createElement('p',{className:'text-sm font-semibold text-slate-700 mb-2'},cs.q), React.createElement('input',{type:'text','aria-label':'Mission prediction',placeholder:cs.ph,value:data[cs.field]||'',onChange:e=>gpUpd('mission',{...gpMission,data:{...data,[cs.field]:e.target.value}}),className:'w-full px-3 py-2 border-2 border-amber-300 rounded-lg text-sm mb-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-300 font-semibold'}), React.createElement('button',{disabled:!(data[cs.field]||'').trim(),onClick:()=>advanceMission(step+1),className:'px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-xs hover:bg-amber-800 transition-all disabled:opacity-40'},'Commit Prediction →')),
              cs.type==='check'&&React.createElement('div',null, React.createElement('p',{className:'text-[11px] font-bold text-blue-500 uppercase mb-1'},'🔬 Investigate'), React.createElement('p',{className:'text-sm text-slate-700 mb-2'},cs.text), React.createElement('button',{onClick:()=>advanceMission(step+1),className:'px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg text-xs hover:bg-blue-600 transition-all'},'I verified it →')),
              cs.type==='reflect'&&React.createElement('div',null, React.createElement('p',{className:'text-[11px] font-bold text-purple-500 uppercase mb-1'},'💭 Reflect'), React.createElement('p',{className:'text-sm font-semibold text-slate-700 mb-2'},cs.q), React.createElement('div',{className:'flex flex-col gap-1.5'}, cs.opts.map(opt=>React.createElement('button',{key:opt,onClick:()=>{ gpUpd('mission',{...gpMission,data:{...data,[cs.field]:opt}}); setTimeout(()=>{ advanceMission(step+1); if(opt===cs.correct&&typeof awardStemXP==='function') awardStemXP('geometryProver',5,'discovery'); },500); },className:`px-3 py-2 text-sm font-semibold rounded-lg border-2 text-left transition-all ${data[cs.field]===opt?'bg-purple-700 text-white border-purple-500':'bg-white text-slate-700 border-purple-200 hover:border-purple-400'}`},opt)))),
              cs.type==='conclude'&&React.createElement('div',null, React.createElement('p',{className:'text-[11px] font-bold text-emerald-500 uppercase mb-1'},'🎯 Big Idea'), React.createElement('div',{className:'bg-emerald-50 rounded-xl p-3 border border-emerald-200 mb-2'}, React.createElement('p',{className:'text-sm text-emerald-800'},mission.bigIdea)), React.createElement('button',{onClick:()=>{ advanceMission(step+1); if(typeof awardStemXP==='function') awardStemXP('geometryProver',20,mission.id+' complete'); addToast('🎉 Discovery complete! +20 XP','success'); setExploreScore(prev=>({correct:prev.correct+1,total:prev.total+1})); },className:'w-full py-2 bg-emerald-700 text-white font-bold rounded-lg text-sm hover:bg-emerald-800 transition-all'},'✅ Got it! Complete Mission'))
            )
          );
        };

        // ── MAIN RENDER ──
        const gpTabs=[{id:'build',label:'🔨 Build'},{id:'discover',label:'🧭 Discover'},{id:'challenge',label:'🎯 Challenge'}];
        const moveGpTab=(event,index)=>{
          let next=index;
          if(event.key==='ArrowRight'||event.key==='ArrowDown') next=(index+1)%gpTabs.length;
          else if(event.key==='ArrowLeft'||event.key==='ArrowUp') next=(index-1+gpTabs.length)%gpTabs.length;
          else if(event.key==='Home') next=0;
          else if(event.key==='End') next=gpTabs.length-1;
          else return;
          event.preventDefault();
          const nextId=gpTabs[next].id;
          gpUpd('tab',nextId);
          requestAnimationFrame(()=>{const nextTab=document.getElementById('geometry-prover-tab-'+nextId);if(nextTab)nextTab.focus();});
        };
        return React.createElement('div',{className:'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200'},
          // Header
          React.createElement('div',{className:'flex items-center gap-3'},
            React.createElement('button',{onClick:()=>setStemLabTool(null),className:'p-1.5 hover:bg-slate-100 rounded-lg transition-colors','aria-label':'Back'},React.createElement(ArrowLeft,{size:18,className:'text-slate-600'})),
            React.createElement('h3',{className:'text-lg font-bold text-violet-800' + onHostInk},'📐 Geometry Prover'),
            React.createElement('div',{className:'flex items-center gap-2 ml-auto'},
              React.createElement('div',{className:'text-xs font-bold text-emerald-700'},exploreScore.correct+'/'+exploreScore.total),
              React.createElement('button',{onClick:()=>{ const snap={id:'snap-'+Date.now(),tool:'geometryProver',label:`Proof: ${gpPoints.length} pts`,data:{points:[...gpPoints],segments:[...gpSegments],theorems:theorems.map(t=>t.label)},timestamp:Date.now()}; setToolSnapshots(prev=>[...prev,snap]); addToast('📸 Snapshot saved!','success'); },className:'text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5'},'📸 Snapshot')
            )
          ),
          // Tab bar
          React.createElement('div',{className:'flex gap-1 bg-slate-100 p-1 rounded-xl',role:'tablist','aria-label':'Geometry Prover sections'},
            gpTabs.map((tab,index)=>
              React.createElement('button',{key:tab.id,id:'geometry-prover-tab-'+tab.id,role:'tab','aria-selected':gpTab===tab.id,'aria-controls':'geometry-prover-panel',tabIndex:gpTab===tab.id?0:-1,onClick:()=>gpUpd('tab',tab.id),onKeyDown:event=>moveGpTab(event,index),className:`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${gpTab===tab.id?'bg-white text-violet-700 shadow-sm':'text-slate-600 hover:text-violet-600'}`},tab.label)
            )
          ),
          // Canvas — always visible
          React.createElement('div',{className:'bg-white rounded-xl border-2 border-violet-200 p-2 flex justify-center overflow-hidden'},renderCanvas()),
          // Helper bar
          React.createElement('div',{className:'flex items-center gap-2 px-3 py-1.5 rounded-lg border',style:{background:'linear-gradient(90deg,#f5f3ff,#ede9fe)',borderColor:'#c4b5fd'}},
            React.createElement('span',{className:'text-xs'},'🧭'),
            React.createElement('span',{className:'text-xs font-semibold text-violet-700 flex-1'},helperText),
            React.createElement('span',{className:'text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full'},gpMode)
          ),
          // BUILD TAB
          gpTab==='build'&&React.createElement('div',{id:'geometry-prover-panel',role:'tabpanel','aria-labelledby':'geometry-prover-tab-build',tabIndex:0,className:'space-y-3'},
            React.createElement('div',{className:'flex items-center gap-2'},
              React.createElement('button',{'aria-pressed':gpInvestigate?'true':'false',onClick:()=>{gpUpd('investigate',!gpInvestigate);gpUpd('revealed',false);gpUpd('prediction','');},className:`px-3 py-1.5 text-xs font-bold rounded-lg transition-all focus:ring-2 focus:ring-amber-400 focus:outline-none ${gpInvestigate?'bg-amber-700 text-white shadow':'bg-amber-50 text-amber-700 border border-amber-600 hover:bg-amber-100'}`},gpInvestigate?'🔮 Investigate ON':'🔮 Investigate Mode'),
              React.createElement('span',{className:'text-[11px] text-slate-600 italic' + onHostInk},gpInvestigate?'Theorems hidden — predict first!':'Auto-show theorems')
            ),
            React.createElement('div',{className:'flex gap-1.5 flex-wrap'},
              [{id:'freeform',label:'✏️ Freeform',color:'violet',action:()=>{gpUpd('mode','freeform');gpUpd('points',[]);gpUpd('segments',[]);gpUpd('connecting',null);gpUpd('feedback',null);gpUpd('challenge',null);gpUpd('guided',null);}},
               {id:'triangle',label:'△ Triangle',color:'blue',action:loadTriangle},
               {id:'right',label:'⊾ Right △',color:'rose',action:loadRightTriangle},
               {id:'parallel',label:'∥ Parallel',color:'teal',action:loadParallel},
               {id:'bisector',label:'∠ Bisector',color:'amber',action:loadBisector},
               {id:'guided',label:'📝 Guided Proof',color:'emerald',action:()=>loadGuidedProof('tri_angle_sum')}
              ].map(m=>React.createElement('button',{key:m.id,onClick:m.action,className:`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${gpMode===m.id?'bg-'+m.color+'-600 text-white shadow-md':'bg-'+m.color+'-50 text-'+m.color+'-700 hover:bg-'+m.color+'-100 border border-'+m.color+'-600'}`},m.label))
            ),
            React.createElement('div',{className:'flex gap-2 flex-wrap'},
              React.createElement('button',{onClick:()=>{if(gpPoints.length>=2){const last=gpPoints.length-1;if(!gpSegments.some(s=>(s.from===last-1&&s.to===last)||(s.from===last&&s.to===last-1)))gpUpd('segments',[...gpSegments,{from:last-1,to:last}]);}},disabled:gpPoints.length<2,className:'px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-600 transition-all disabled:opacity-40'},'🔗 Connect Last Two'),
              React.createElement('button',{onClick:()=>{if(gpConnecting!=null)gpUpd('connecting',null);else if(gpPoints.length>0)gpUpd('connecting',gpPoints.length-1);},disabled:gpPoints.length<1,className:`px-3 py-1.5 text-xs font-bold rounded-lg transition-all focus:ring-2 focus:ring-indigo-300 focus:outline-none ${gpConnecting!=null?'bg-indigo-600 text-white':'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-600'} disabled:opacity-40`},gpConnecting!=null?'✔ Connecting from '+labelFor(gpConnecting):'↗️ Draw Segment'),
              React.createElement('button',{'aria-pressed':gpShowLabels?'true':'false',onClick:()=>gpUpd('showLabels',!gpShowLabels),className:`px-3 py-1.5 text-xs font-bold rounded-lg transition-all focus:ring-2 focus:ring-slate-300 focus:outline-none ${gpShowLabels?'bg-emerald-700 text-white':'bg-slate-100 text-slate-600 border border-slate-400'}`},gpShowLabels?'📏 Labels ON':'📏 Labels'),
              React.createElement('button',{onClick:()=>{if(gpPoints.length>0){const rm=gpPoints.length-1;gpUpd('points',gpPoints.slice(0,-1));gpUpd('segments',gpSegments.filter(s=>s.from!==rm&&s.to!==rm));gpUpd('connecting',null);}},disabled:gpPoints.length<1,className:'px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-600 transition-all disabled:opacity-40'},'⌫ Undo'),
              React.createElement('button',{onClick:()=>{gpUpd('points',[]);gpUpd('segments',[]);gpUpd('connecting',null);gpUpd('feedback',null);gpUpd('challenge',null);gpUpd('challengeAnswer','');},className:'px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all'},'↺ Clear')
            ),
            renderTheoremPanel(),
            gpPoints.length>=2&&React.createElement('div',{className:'grid grid-cols-3 gap-2'},
              [['Points',gpPoints.length],['Segments',gpSegments.length],['Theorems',theorems.length]].map(([lbl,val])=>
                React.createElement('div',{key:lbl,className:'bg-white rounded-xl p-2 border border-violet-100 text-center'}, React.createElement('div',{className:'text-[11px] font-bold text-violet-500 uppercase'},lbl), React.createElement('div',{className:'text-2xl font-bold text-violet-800'},val))
              )
            ),
            gpMode==='guided'&&renderGuidedProof()
          ),
          // DISCOVER TAB
          gpTab==='discover'&&React.createElement('div',{id:'geometry-prover-panel',role:'tabpanel','aria-labelledby':'geometry-prover-tab-discover',tabIndex:0},renderDiscover()),
          // CHALLENGE TAB
          gpTab==='challenge'&&React.createElement('div',{id:'geometry-prover-panel',role:'tabpanel','aria-labelledby':'geometry-prover-tab-challenge',tabIndex:0,className:'space-y-3'},
            React.createElement('p',{className:'text-xs text-slate-600' + onHostInk},'Answer without looking up the formula — use what you know from exploring!'),
            React.createElement('div',{className:'flex gap-2'},
              React.createElement('button',{onClick:generateChallenge,className:'flex-1 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md'},'🎯 New Challenge'),
              React.createElement('button',{onClick:startMatchGame,className:'flex-1 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md'},'🧩 Theorem Match'),
              React.createElement('button',{onClick:()=>{gpUpd('challenge',null);gpUpd('feedback',null);gpUpd('challengeAnswer','');gpUpd('matchGame',null);},disabled:!gpChallenge,className:'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all disabled:opacity-40'},'↺ Reset')
            ),
            gpChallenge&&gpChallenge.type==='theorem_match'&&renderMatchGame(),
            gpChallenge&&gpChallenge.type!=='theorem_match'&&React.createElement('div',{className:'bg-violet-50 rounded-xl p-4 border-2 border-violet-200'},
              React.createElement('p',{className:'text-sm font-bold text-violet-800 mb-3'},'🎯 '+gpChallenge.question),
              gpChallenge.type==='polygon_sum'&&React.createElement('p',{className:'text-[11px] text-violet-600 italic mb-2'},'💡 How many triangles fit inside the polygon?'),
              React.createElement('div',{className:'flex gap-2'},
                React.createElement('input',{type:'text','aria-label':'Challenge answer in degrees',value:gp.challengeAnswer||'',onChange:e=>gpUpd('challengeAnswer',e.target.value),onKeyDown:e=>{if(e.key==='Enter')checkChallenge();},placeholder:'Your answer (°)',className:'flex-1 px-3 py-2 border-2 border-violet-600 rounded-lg text-sm font-bold text-center focus:border-violet-500 focus:ring-2 focus:ring-violet-300 outline-none'}),
                React.createElement('button',{onClick:checkChallenge,className:'px-4 py-2 bg-violet-700 text-white font-bold rounded-lg text-sm hover:bg-violet-600 transition-all'},'✔ Check')
              ),
              gpFeedback&&React.createElement('div',{className:`mt-3 p-3 rounded-xl border ${gpFeedback.correct?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'}`}, React.createElement('p',{className:`text-sm font-bold ${gpFeedback.correct?'text-emerald-700':'text-red-600'}`},gpFeedback.msg))
            ),
            !gpChallenge&&React.createElement('div',{className:'bg-violet-50 rounded-xl p-4 border border-violet-200 text-center'},
              React.createElement('p',{className:'text-xs text-violet-600 mb-2'},'Challenges cover:'),
              React.createElement('div',{className:'flex flex-wrap gap-1.5 justify-center'},
                ['Triangle angle sum','Vertical angles','Missing angle','Exterior angle','Polygon sums','Theorem Match'].map(t=>React.createElement('span',{key:t,className:'text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold'},t))
              )
            )
          ),
          // Footer
          React.createElement('div',{className:'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-200 text-center'},
            React.createElement('p',{className:'text-[11px] text-violet-600'},React.createElement('strong',null,'📐 Euclidean Geometry'),' — drag points to explore how angles change.'),
            React.createElement('p',{className:'text-[11px] text-slate-600 mt-0.5'},'Place points • Draw segments • Drag to explore • Discover theorems')
          )
        );
      })();
    }
  });

  console.log('[StemLab] stem_tool_geo.js loaded — 2 tools');
})();
