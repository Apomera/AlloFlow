// ═══════════════════════════════════════════
// stem_tool_geo.js — STEM Lab Geo Tools
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

  // ═══ 🔬 geoQuiz (geoQuiz) ═══
  window.StemLab.registerTool('geoQuiz', {
    icon: '🔬',
    label: 'geoQuiz',
    desc: '',
    color: 'slate',
    category: 'geo',
    render: function(ctx) {
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

      // ── Tool body (geoQuiz) ──
      return (function() {
var d = labToolData || {};

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



          // Auto-load on mount

          if (!window._geoLibsLoaded) {

            loadGeoLibs().then(function() { upd('_geoLibsReady', true); });

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



          // ── Landmark Data ──

          var GEO_LANDMARKS = [

            { name: 'Great Wall of China', lat: 40.4, lng: 116.6, country: 'China', fact: 'Over 13,000 miles long, built over 2,000 years' },

            { name: 'Eiffel Tower', lat: 48.86, lng: 2.29, country: 'France', fact: 'Built in 1889, 1,083 feet tall' },

            { name: 'Taj Mahal', lat: 27.17, lng: 78.04, country: 'India', fact: 'Mughal mausoleum built 1632\u20131653' },

            { name: 'Machu Picchu', lat: -13.16, lng: -72.55, country: 'Peru', fact: '15th-century Inca citadel at 7,970 ft elevation' },

            { name: 'Great Pyramid of Giza', lat: 29.98, lng: 31.13, country: 'Egypt', fact: 'Built ~2560 BC, only surviving Ancient Wonder' },

            { name: 'Statue of Liberty', lat: 40.69, lng: -74.04, country: 'United States', fact: 'Gift from France in 1886, 305 feet tall' },

            { name: 'Colosseum', lat: 41.89, lng: 12.49, country: 'Italy', fact: 'Roman amphitheater built AD 72\u201380' },

            { name: 'Christ the Redeemer', lat: -22.95, lng: -43.21, country: 'Brazil', fact: '98-foot Art Deco statue atop Corcovado mountain' },

            { name: 'Sydney Opera House', lat: -33.86, lng: 151.21, country: 'Australia', fact: 'Opened 1973, UNESCO World Heritage Site' },

            { name: 'Petra', lat: 30.33, lng: 35.44, country: 'Jordan', fact: 'Ancient city carved into rose-red sandstone cliffs' },

            { name: 'Angkor Wat', lat: 13.41, lng: 103.87, country: 'Cambodia', fact: 'Largest religious monument in the world' },

            { name: 'Mount Everest', lat: 27.99, lng: 86.93, country: 'Nepal', fact: 'Earth\'s highest peak at 29,032 feet' },

            { name: 'Stonehenge', lat: 51.18, lng: -1.83, country: 'United Kingdom', fact: 'Neolithic stone circle, ~3000 BC' },

            { name: 'Mount Fuji', lat: 35.36, lng: 138.73, country: 'Japan', fact: 'Iconic 12,389-foot stratovolcano' },

            { name: 'Niagara Falls', lat: 43.08, lng: -79.07, country: 'Canada', fact: 'Three waterfalls straddling US-Canada border' },

            { name: 'Victoria Falls', lat: -17.93, lng: 25.86, country: 'Zambia', fact: 'World\'s largest sheet of falling water' },

            { name: 'Grand Canyon', lat: 36.11, lng: -112.11, country: 'United States', fact: '277 miles long, up to 18 miles wide' },

            { name: 'Great Barrier Reef', lat: -18.29, lng: 147.70, country: 'Australia', fact: 'World\'s largest coral reef system' },

            { name: 'Sahara Desert', lat: 23.42, lng: 25.66, country: 'Algeria', fact: 'Largest hot desert, 3.6 million sq miles' },

            { name: 'Amazon River', lat: -3.47, lng: -60.02, country: 'Brazil', fact: 'Second longest river, largest by water flow' }

          ];



          // ── State ──

          var geoTab = d.geoTab || 'findCountry';

          var geoScore = d.geoScore || 0;

          var geoStreak = d.geoStreak || 0;

          var geoTarget = d.geoTarget || null;

          var geoAnswered = d.geoAnswered || [];

          var geoDifficulty = d.geoDifficulty || 'medium';

          var geoRegion = d.geoRegionFilter || 'world';

          var geoViewMode = d.geoViewMode || '2d';

          var geoFeedback = d.geoFeedback || null;

          var geoRound = d.geoRound || 0;

          var geoLandmarkIdx = d.geoLandmarkIdx || 0;



          // Filter countries by region

          var filteredCountries = geoRegion === 'world' ? countries : countries.filter(function(c) {

            if (geoRegion === 'africa') return c.continent === 'Africa';

            if (geoRegion === 'asia') return c.continent === 'Asia';

            if (geoRegion === 'europe') return c.continent === 'Europe';

            if (geoRegion === 'americas') return c.continent === 'North America' || c.continent === 'South America';

            if (geoRegion === 'oceania') return c.continent === 'Oceania';

            return true;

          });



          // Pick a new target

          function pickTarget(mode) {

            var pool = filteredCountries.filter(function(c) { return geoAnswered.indexOf(c.iso) === -1; });

            if (pool.length === 0) { upd('geoAnswered', []); pool = filteredCountries; }

            var t = pool[Math.floor(Math.random() * pool.length)];

            upd('geoTarget', t);

            upd('geoFeedback', null);

            upd('geoRound', geoRound + 1);

          }



          // Pick initial target

          if (!geoTarget && filteredCountries.length > 0) {

            var t0 = filteredCountries[Math.floor(Math.random() * filteredCountries.length)];

            setTimeout(function() { upd('geoTarget', t0); }, 0);

          }



          // Check answer

          function checkAnswer(clickedIso) {

            if (!geoTarget) return;

            var correct = clickedIso === geoTarget.iso;

            if (correct) {

              var pts = geoDifficulty === 'hard' ? 15 : geoDifficulty === 'easy' ? 5 : 10;

              var newStreak = geoStreak + 1;

              var bonus = newStreak >= 5 ? 5 : 0;

              upd('geoScore', geoScore + pts + bonus);

              upd('geoStreak', newStreak);

              upd('geoAnswered', geoAnswered.concat([geoTarget.iso]));

              upd('geoFeedback', { correct: true, msg: '\u2705 Correct! +' + (pts + bonus) + ' pts' + (bonus > 0 ? ' (\uD83D\uDD25 streak!)' : '') });

              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', pts, 'Identified ' + geoTarget.name);

              setTimeout(function() { pickTarget(geoTab); }, 1500);

            } else {

              var clicked = countries.find(function(c) { return c.iso === clickedIso; });

              upd('geoStreak', 0);

              upd('geoFeedback', { correct: false, msg: '\u274C That was ' + (clicked ? clicked.name : 'unknown') + '. The answer is ' + geoTarget.name + '.' });

              setTimeout(function() { pickTarget(geoTab); }, 2500);

            }

          }



          // Check capital answer

          function checkCapitalAnswer(input) {

            if (!geoTarget) return;

            var correct = input.trim().toLowerCase() === geoTarget.capital.toLowerCase();

            if (correct) {

              upd('geoScore', geoScore + 10);

              upd('geoStreak', geoStreak + 1);

              upd('geoAnswered', geoAnswered.concat([geoTarget.iso]));

              upd('geoFeedback', { correct: true, msg: '\u2705 Correct! The capital of ' + geoTarget.name + ' is ' + geoTarget.capital });

              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'Knew capital of ' + geoTarget.name);

              setTimeout(function() { pickTarget('capitals'); }, 1500);

            } else {

              upd('geoStreak', 0);

              upd('geoFeedback', { correct: false, msg: '\u274C The capital of ' + geoTarget.name + ' is ' + geoTarget.capital + ', not "' + input.trim() + '".' });

              setTimeout(function() { pickTarget('capitals'); }, 2500);

            }

          }



          // ── Leaflet Map Init ──

          if (!window._geoMapRef) window._geoMapRef = { current: null };

          if (!window._geoGeoJsonLayer) window._geoGeoJsonLayer = { current: null };

          var mapRef = window._geoMapRef;



          function initMap(container) {

            if (!container || !window.L || mapRef.current) return;

            var map = window.L.map(container, {
              worldCopyJump: false,
              maxBoundsViscosity: 1.0,
              minZoom: 2,
              maxBounds: [[-85, -180], [85, 180]]
            }).setView([20, 0], 2);

            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {

              attribution: '\u00a9 OpenStreetMap \u00a9 CARTO', maxZoom: 18, noWrap: true, noWrap: true

            }).addTo(map);

            mapRef.current = map;



            // Load GeoJSON

            fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')

              .then(function(r) { return r.json(); })

              .then(function(geojson) {

                var layer = window.L.geoJSON(geojson, {

                  style: function(f) {

                    return { color: '#4fd1c5', weight: 1, fillColor: '#2d3748', fillOpacity: 0.6 };

                  },

                  onEachFeature: function(feature, layer) {

                    var iso = feature.properties.ISO_A3 || feature.properties.ADM0_A3 || '';

                    var countryName = feature.properties.ADMIN || feature.properties.NAME || '';

                    layer.on('click', function() {

                      if (typeof window._geoClickHandler === 'function') window._geoClickHandler(iso, countryName);

                    });

                    layer.on('mouseover', function() {

                      layer.setStyle({ fillOpacity: 0.85, fillColor: '#4fd1c5' });

                    });

                    layer.on('mouseout', function() {

                      layer.setStyle({ fillOpacity: 0.6, fillColor: '#2d3748' });

                    });

                    layer.bindTooltip(countryName, { sticky: true, className: 'geo-tooltip' });

                  }

                }).addTo(map);

                window._geoGeoJsonLayer.current = layer;

              })

              .catch(function(e) { console.warn('GeoJSON load failed:', e); });

          }



          // Set click handler

          window._geoClickHandler = function(iso, name) {

            if (geoTab === 'findCountry') checkAnswer(iso);

          };



          // Highlight a country

          function highlightCountry(iso, color) {

            var layer = window._geoGeoJsonLayer.current;

            if (!layer) return;

            layer.eachLayer(function(l) {

              var fIso = l.feature && l.feature.properties ? (l.feature.properties.ISO_A3 || l.feature.properties.ADM0_A3) : '';

              if (fIso === iso) {

                l.setStyle({ fillColor: color || '#48bb78', fillOpacity: 0.9 });

                setTimeout(function() { l.setStyle({ fillColor: '#2d3748', fillOpacity: 0.6 }); }, 2000);

              }

            });

          }



          // Fly to country on map

          function flyToCountry(c) {

            if (mapRef.current && c) {

              mapRef.current.flyTo([c.lat, c.lng], c.area > 2000000 ? 3 : c.area > 500000 ? 4 : c.area > 100000 ? 5 : 6, { duration: 1.2 });

            }

          }



          // Region zoom presets

          var regionZooms = { world: [20, 0, 2], africa: [2, 20, 3], asia: [35, 85, 3], europe: [50, 15, 4], americas: [10, -80, 3], oceania: [-20, 140, 4] };

          if (mapRef.current && geoRegion) {

            var rz = regionZooms[geoRegion] || regionZooms.world;

            mapRef.current.setView([rz[0], rz[1]], rz[2]);

          }



          // ── Continent colors ──

          var continentColors = { 'Africa': '#f6ad55', 'Asia': '#fc8181', 'Europe': '#63b3ed', 'North America': '#68d391', 'South America': '#b794f4', 'Oceania': '#4fd1c5' };



          // ── Globe Init ──

          if (!window._geoGlobeRef) window._geoGlobeRef = { current: null };

          var globeRef = window._geoGlobeRef;



          function initGlobe(container) {

            if (!container || !window._GlobeGLConstructor || globeRef.current) return;

            var globe = window._GlobeGLConstructor()(container)

              .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')

              .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')

              .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

              .showAtmosphere(true)

              .atmosphereColor('#4fd1c5')

              .atmosphereAltitude(0.25)

              .width(container.clientWidth)

              .height(400);



            // Load country polygons

            fetch('https://unpkg.com/world-atlas@2/countries-110m.json')

              .then(function(r) { return r.json(); })

              .then(function(topo) {

                // Need topojson-client for parsing, use inline conversion

                if (window.topojson) {

                  var geoData = window.topojson.feature(topo, topo.objects.countries);

                  globe.polygonsData(geoData.features)

                    .polygonCapColor(function() { return 'rgba(79,209,197,0.3)'; })

                    .polygonSideColor(function() { return 'rgba(79,209,197,0.15)'; })

                    .polygonStrokeColor(function() { return '#4fd1c5'; })

                    .polygonLabel(function(d) { return '<b>' + (d.properties.name || '') + '</b>'; });

                }

              })

              .catch(function() {});



            // Add country labels

            globe.labelsData(countries.filter(function(c) { return c.area > 200000; }))

              .labelLat(function(c) { return c.lat; })

              .labelLng(function(c) { return c.lng; })

              .labelText(function(c) { return c.name; })

              .labelSize(0.6)

              .labelDotRadius(0.3)

              .labelColor(function() { return 'rgba(255,255,255,0.75)'; });



            globeRef.current = globe;

          }



          // ── Size Compare helper ──

          var sizeTarget1 = d.geoSize1 || null;

          var sizeTarget2 = d.geoSize2 || null;

          function pickSizePair() {

            var pool = filteredCountries.filter(function(c) { return c.area > 5000; });

            var a = pool[Math.floor(Math.random() * pool.length)];

            var b = pool[Math.floor(Math.random() * pool.length)];

            while (b.iso === a.iso) b = pool[Math.floor(Math.random() * pool.length)];

            upd('geoSize1', a); upd('geoSize2', b); upd('geoFeedback', null);

          }

          if (geoTab === 'sizeCompare' && !sizeTarget1) setTimeout(pickSizePair, 0);



          function checkSizeAnswer(pickedIso) {

            if (!sizeTarget1 || !sizeTarget2) return;

            var bigger = sizeTarget1.area >= sizeTarget2.area ? sizeTarget1 : sizeTarget2;

            if (pickedIso === bigger.iso) {

              upd('geoScore', geoScore + 10);

              upd('geoStreak', geoStreak + 1);

              upd('geoFeedback', { correct: true, msg: '\u2705 Correct! ' + bigger.name + ' (' + bigger.area.toLocaleString() + ' km\u00b2) is bigger!' });

              if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'Size compare');

              setTimeout(pickSizePair, 1500);

            } else {

              upd('geoStreak', 0);

              upd('geoFeedback', { correct: false, msg: '\u274C ' + bigger.name + ' (' + bigger.area.toLocaleString() + ' km\u00b2) is actually bigger than ' + (pickedIso === sizeTarget1.iso ? sizeTarget2 : sizeTarget1).name + ' (' + (pickedIso === sizeTarget1.iso ? sizeTarget2 : sizeTarget1).area.toLocaleString() + ' km\u00b2)' });

              setTimeout(pickSizePair, 2500);

            }

          }



          // ── Tab definitions ──

          var geoTabs = [

            { id: 'findCountry', icon: '\uD83D\uDDFA\uFE0F', label: 'Find Country' },

            { id: 'capitals', icon: '\uD83C\uDFDB\uFE0F', label: 'Capitals' },

            { id: 'continents', icon: '\uD83C\uDF0D', label: 'Continents' },

            { id: 'landmarks', icon: '\uD83C\uDFD4\uFE0F', label: 'Landmarks' },

            { id: 'sizeCompare', icon: '\uD83D\uDCCF', label: 'Size Compare' },

            { id: 'globeView', icon: '\uD83C\uDF10', label: 'Globe View' },

            { id: 'quizBuilder', icon: '\uD83C\uDFC6', label: 'Quiz Builder' }

          ];



          // ── RENDER ──

          return React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg overflow-hidden', style: { minHeight: 600 } },



            // ── Header bar ──

            React.createElement('div', { className: 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-3 flex items-center justify-between' },

              React.createElement('div', { className: 'flex items-center gap-2' },

                React.createElement('span', { className: 'text-xl' }, '\uD83C\uDF0D'),

                React.createElement('span', { className: 'font-bold text-sm' }, 'Geography Quiz'),

                React.createElement('span', { className: 'text-xs bg-white/20 rounded-full px-2 py-0.5' }, filteredCountries.length + ' countries')

              ),

              React.createElement('div', { className: 'flex items-center gap-3' },

                React.createElement('span', { className: 'text-xs bg-yellow-400 text-yellow-900 rounded-full px-2 py-0.5 font-bold' }, '\u2B50 ' + geoScore),

                geoStreak >= 3 && React.createElement('span', { className: 'text-xs bg-orange-400 text-orange-900 rounded-full px-2 py-0.5 font-bold animate-pulse' }, '\uD83D\uDD25 ' + geoStreak + 'x'),

                // Region filter

                React.createElement('select', {

                  value: geoRegion,

                  onChange: function(e) { upd('geoRegionFilter', e.target.value); upd('geoTarget', null); upd('geoAnswered', []); },

                  className: 'text-xs bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white'

                },

                  React.createElement('option', { value: 'world' }, '\uD83C\uDF0D World'),

                  React.createElement('option', { value: 'africa' }, '\uD83C\uDF0D Africa'),

                  React.createElement('option', { value: 'asia' }, '\uD83C\uDF0F Asia'),

                  React.createElement('option', { value: 'europe' }, '\uD83C\uDF0D Europe'),

                  React.createElement('option', { value: 'americas' }, '\uD83C\uDF0E Americas'),

                  React.createElement('option', { value: 'oceania' }, '\uD83C\uDF0F Oceania')

                ),

                // Difficulty

                React.createElement('select', {

                  value: geoDifficulty,

                  onChange: function(e) { upd('geoDifficulty', e.target.value); },

                  className: 'text-xs bg-white/20 border border-white/30 rounded px-1 py-0.5 text-white'

                },

                  React.createElement('option', { value: 'easy' }, 'Easy'),

                  React.createElement('option', { value: 'medium' }, 'Medium'),

                  React.createElement('option', { value: 'hard' }, 'Hard')

                )

              )

            ),



            // ── Tab bar ──

            React.createElement('div', { className: 'flex overflow-x-auto border-b bg-slate-50' },

              geoTabs.map(function(tab) {

                return React.createElement('button', {

                  key: tab.id,

                  onClick: function() {

                    upd('geoTab', tab.id);

                    upd('geoFeedback', null);

                    upd('geoTarget', null);

                    if (tab.id === 'globeView' && !window._globeLibLoaded) {

                      loadGlobeLib().then(function() { upd('_globeLibReady', true); });

                    }

                  },

                  className: 'whitespace-nowrap px-3 py-2 text-xs font-medium transition-all border-b-2 ' +

                    (geoTab === tab.id ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-slate-500 hover:text-slate-700')

                }, tab.icon + ' ' + tab.label);

              })

            ),



            // ── Feedback bar ──

            geoFeedback && React.createElement('div', {

              className: 'px-4 py-2 text-sm font-bold text-center transition-all ' +

                (geoFeedback.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')

            }, geoFeedback.msg),



            // ═══ FIND COUNTRY TAB ═══

            geoTab === 'findCountry' && React.createElement('div', null,

              // Question

              geoTarget && React.createElement('div', { className: 'text-center py-3 bg-gradient-to-r from-slate-50 to-teal-50 border-b' },

                React.createElement('p', { className: 'text-xs text-slate-500' }, 'Click on the map to find:'),

                React.createElement('p', { className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDDFA\uFE0F ' + geoTarget.name),

                React.createElement('p', { className: 'text-[10px] text-slate-400' }, geoTarget.continent + ' \u2022 ' + geoTarget.region)

              ),

              // Map container

              React.createElement('div', {

                ref: function(el) { if (el && window.L && !mapRef.current) initMap(el); },

                style: { height: 'calc(100vh - 280px)', minHeight: 400, maxHeight: 700, width: '100%', background: '#1a202c' },

                id: 'geo-quiz-map'

              }),

              // Progress

              React.createElement('div', { className: 'px-4 py-2 bg-slate-50 flex justify-between text-[10px] text-slate-500' },

                React.createElement('span', null, '\u2705 ' + geoAnswered.length + '/' + filteredCountries.length + ' found'),

                React.createElement('span', null, 'Round ' + geoRound),

                React.createElement('button', {

                  onClick: function() { upd('geoAnswered', []); upd('geoScore', 0); upd('geoStreak', 0); upd('geoRound', 0); pickTarget('findCountry'); },

                  className: 'text-teal-600 hover:text-teal-800 font-bold'

                }, '\u267B Reset')

              )

            ),



            // ═══ CAPITALS TAB ═══

            geoTab === 'capitals' && React.createElement('div', { className: 'p-4' },

              geoTarget && React.createElement('div', { className: 'text-center mb-4' },

                React.createElement('p', { className: 'text-xs text-slate-500 mb-1' }, 'What is the capital of:'),

                React.createElement('p', { className: 'text-2xl font-bold text-slate-800 mb-1' }, '\uD83C\uDFDB\uFE0F ' + geoTarget.name),

                React.createElement('p', { className: 'text-xs text-slate-400' }, geoTarget.continent),

                React.createElement('div', { className: 'flex gap-2 max-w-md mx-auto mt-3' },

                  React.createElement('input', {

                    type: 'text',

                    placeholder: 'Type the capital city...',

                    value: d.geoCapitalInput || '',

                    onChange: function(e) { upd('geoCapitalInput', e.target.value); },

                    onKeyDown: function(e) { if (e.key === 'Enter') { checkCapitalAnswer(d.geoCapitalInput || ''); upd('geoCapitalInput', ''); } },

                    className: 'flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'

                  }),

                  React.createElement('button', {

                    onClick: function() { checkCapitalAnswer(d.geoCapitalInput || ''); upd('geoCapitalInput', ''); },

                    className: 'px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600'

                  }, 'Check')

                ),

                // Multiple choice hints for easy mode

                geoDifficulty === 'easy' && React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center mt-3' },

                  (function() {

                    var opts = [geoTarget.capital];

                    while (opts.length < 4) {

                      var r = countries[Math.floor(Math.random() * countries.length)];

                      if (opts.indexOf(r.capital) === -1) opts.push(r.capital);

                    }

                    opts.sort(function() { return Math.random() - 0.5; });

                    return opts.map(function(cap) {

                      return React.createElement('button', {

                        key: cap,

                        onClick: function() { checkCapitalAnswer(cap); },

                        className: 'px-3 py-1.5 bg-slate-100 hover:bg-teal-100 rounded-lg text-xs font-medium text-slate-700 border border-slate-200 hover:border-teal-300 transition-all'

                      }, cap);

                    });

                  })()

                )

              )

            ),



            // ═══ CONTINENTS TAB ═══

            geoTab === 'continents' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, '\uD83C\uDF0D Sort Countries by Continent'),

              geoTarget && React.createElement('div', { className: 'text-center mb-4' },

                React.createElement('p', { className: 'text-xl font-bold text-slate-800 mb-3' }, geoTarget.name),

                React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center' },

                  ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'].map(function(cont) {

                    return React.createElement('button', {

                      key: cont,

                      onClick: function() {

                        var correct = geoTarget.continent === cont;

                        if (correct) {

                          upd('geoScore', geoScore + 10);

                          upd('geoStreak', geoStreak + 1);

                          upd('geoAnswered', geoAnswered.concat([geoTarget.iso]));

                          upd('geoFeedback', { correct: true, msg: '\u2705 ' + geoTarget.name + ' is in ' + cont + '!' });

                          if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'Continent sort');

                          setTimeout(function() { pickTarget('continents'); }, 1200);

                        } else {

                          upd('geoStreak', 0);

                          upd('geoFeedback', { correct: false, msg: '\u274C ' + geoTarget.name + ' is in ' + geoTarget.continent + ', not ' + cont });

                          setTimeout(function() { pickTarget('continents'); }, 2000);

                        }

                      },

                      className: 'px-4 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all transform hover:scale-105',

                      style: { background: continentColors[cont] || '#a0aec0' }

                    }, cont);

                  })

                )

              )

            ),



            // ═══ LANDMARKS TAB ═══

            geoTab === 'landmarks' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, '\uD83C\uDFD4\uFE0F Famous Landmarks'),

              (function() {

                var lm = GEO_LANDMARKS[geoLandmarkIdx % GEO_LANDMARKS.length];

                // Landmark mini-map ref

                if (!window._geoLandmarkMapRef) window._geoLandmarkMapRef = { current: null, idx: -1 };

                var lmMapRef = window._geoLandmarkMapRef;

                return React.createElement('div', { className: 'max-w-lg mx-auto' },

                  React.createElement('div', { className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 text-center mb-3' },

                    React.createElement('p', { className: 'text-3xl mb-2' }, '\uD83C\uDFD4\uFE0F'),

                    React.createElement('h4', { className: 'text-lg font-bold text-slate-800' }, lm.name),

                    React.createElement('p', { className: 'text-xs text-slate-500 mt-1' }, lm.fact),

                    React.createElement('p', { className: 'text-xs text-amber-600 mt-2 font-bold' }, '\uD83D\uDCCD ' + lm.country + ' \u2014 ' + lm.lat.toFixed(1) + '\u00b0, ' + lm.lng.toFixed(1) + '\u00b0')

                  ),

                  // Leaflet map showing landmark location

                  window.L && React.createElement('div', {

                    ref: function(el) {

                      if (!el || !window.L) return;

                      if (lmMapRef.current && lmMapRef.idx === geoLandmarkIdx) return;

                      // Destroy previous map

                      if (lmMapRef.current) { try { lmMapRef.current.remove(); } catch(e) {} lmMapRef.current = null; }

                      el.innerHTML = '';

                      setTimeout(function() {

                        try {

                          var m = window.L.map(el, { zoomControl: true, scrollWheelZoom: false, dragging: true, attributionControl: false, maxBounds: [[-85, -180], [85, 180]], minZoom: 2 }).setView([lm.lat, lm.lng], 6);

                          window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18, noWrap: true }).addTo(m);

                          window.L.marker([lm.lat, lm.lng]).addTo(m).bindPopup('<b>' + lm.name + '</b><br>' + lm.country).openPopup();

                          window.L.circle([lm.lat, lm.lng], { radius: 50000, color: '#f6ad55', fillColor: '#f6ad55', fillOpacity: 0.2 }).addTo(m);

                          lmMapRef.current = m;

                          lmMapRef.idx = geoLandmarkIdx;

                        } catch(e) { console.warn('Landmark map error:', e); }

                      }, 50);

                    },

                    style: { height: 220, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '2px solid #e2e8f0' }

                  }),

                  React.createElement('div', { className: 'flex justify-between' },

                    React.createElement('button', {

                      onClick: function() { upd('geoLandmarkIdx', Math.max(0, geoLandmarkIdx - 1)); },

                      className: 'px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 hover:bg-slate-200',

                      disabled: geoLandmarkIdx === 0

                    }, '\u25C0 Previous'),

                    React.createElement('span', { className: 'text-[10px] text-slate-400 self-center' }, (geoLandmarkIdx + 1) + '/' + GEO_LANDMARKS.length),

                    React.createElement('button', {

                      onClick: function() {

                        upd('geoLandmarkIdx', geoLandmarkIdx + 1);

                        if (typeof awardStemXP === 'function' && geoLandmarkIdx % 5 === 4) awardStemXP('geoQuiz', 5, 'Explored 5 landmarks');

                      },

                      className: 'px-3 py-1 bg-teal-500 rounded text-xs font-bold text-white hover:bg-teal-600'

                    }, 'Next \u25B6')

                  )

                );

              })()

            ),



            // ═══ SIZE COMPARE TAB ═══

            geoTab === 'sizeCompare' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, '\uD83D\uDCCF Which Country is Bigger?'),

              sizeTarget1 && sizeTarget2 && React.createElement('div', { className: 'flex gap-4 justify-center items-stretch max-w-lg mx-auto' },

                [sizeTarget1, sizeTarget2].map(function(c) {

                  return React.createElement('button', {

                    key: c.iso,

                    onClick: function() { checkSizeAnswer(c.iso); },

                    className: 'flex-1 p-4 rounded-xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-lg transition-all bg-gradient-to-br from-white to-slate-50 text-center transform hover:scale-105'

                  },

                    React.createElement('p', { className: 'text-3xl mb-2' }, '\uD83C\uDF0D'),

                    React.createElement('h4', { className: 'text-lg font-bold text-slate-800' }, c.name),

                    React.createElement('p', { className: 'text-xs text-slate-400' }, c.continent),

                    React.createElement('p', { className: 'text-[10px] text-slate-300 mt-1' }, 'Click if bigger')

                  );

                })

              ),

              React.createElement('p', { className: 'text-center text-[10px] text-slate-400 mt-3' }, '\uD83D\uDCA1 Mercator maps distort sizes \u2014 countries near the equator look smaller than they really are!')

            ),



            // ═══ GLOBE VIEW TAB ═══

            geoTab === 'globeView' && React.createElement('div', null,

              React.createElement('div', { className: 'text-center py-2 bg-slate-900 text-white text-xs' }, '\uD83C\uDF10 Drag to rotate \u2022 Scroll to zoom \u2022 Click countries for info'),

              !window._GlobeGLConstructor ? React.createElement('div', { className: 'text-center py-16 text-slate-500' },

                React.createElement('div', { className: 'text-4xl mb-3 animate-spin' }, '\uD83C\uDF10'),

                React.createElement('p', { className: 'text-sm' }, 'Loading 3D Globe...')

              ) : React.createElement('div', {

                ref: function(el) { if (el && window._GlobeGLConstructor && !globeRef.current) initGlobe(el); },

                style: { height: 450, width: '100%', background: '#0a0a2e' }

              })

            ),



            // ═══ QUIZ BUILDER TAB ═══

            geoTab === 'quizBuilder' && React.createElement('div', { className: 'p-4' },

              React.createElement('h3', { className: 'text-sm font-bold text-slate-700 mb-3 text-center' }, '\uD83C\uDFC6 AI Quiz Builder'),

              React.createElement('p', { className: 'text-xs text-slate-500 text-center mb-3' }, 'Describe the quiz you want and AI will generate custom geography questions!'),

              React.createElement('div', { className: 'flex gap-2 max-w-md mx-auto mb-4' },

                React.createElement('input', {

                  type: 'text',

                  placeholder: 'e.g. "Quiz me on African capitals" or "European rivers"',

                  value: d.geoQuizInput || '',

                  onChange: function(e) { upd('geoQuizInput', e.target.value); },

                  className: 'flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'

                }),

                React.createElement('button', {

                  onClick: function() {

                    if (!d.geoQuizInput) return;

                    upd('geoQuizLoading', true);

                    var prompt = 'Generate 10 geography quiz questions about: ' + d.geoQuizInput + '. Return JSON array: [{"question":"...","answer":"...","hint":"...","fact":"..."}]. Questions should be factual and educational. Return ONLY valid JSON.';

                    if (typeof callAI === 'function') {

                      callAI(prompt, function(resp) {

                        try {

                          var qs = JSON.parse(resp.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());

                          upd('geoQuizQuestions', qs);

                          upd('geoQuizIdx', 0);

                          upd('geoQuizLoading', false);

                        } catch(e) { upd('geoQuizLoading', false); upd('geoFeedback', { correct: false, msg: 'AI response error. Try again!' }); }

                      });

                    }

                  },

                  disabled: d.geoQuizLoading,

                  className: 'px-4 py-2 rounded-lg text-sm font-bold text-white ' + (d.geoQuizLoading ? 'bg-slate-300' : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg')

                }, d.geoQuizLoading ? '\u23F3' : '\uD83D\uDE80 Generate')

              ),

              // Quick presets

              React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center mb-4' },

                ['African Capitals', 'European Countries', 'Asian Rivers', 'World Landmarks', 'Island Nations', 'Largest Countries'].map(function(preset) {

                  return React.createElement('button', {

                    key: preset,

                    onClick: function() { upd('geoQuizInput', preset); },

                    className: 'px-2 py-1 bg-slate-100 rounded-full text-[10px] text-slate-600 hover:bg-teal-100 hover:text-teal-700 transition-all'

                  }, preset);

                })

              ),

              // Display generated quiz

              d.geoQuizQuestions && d.geoQuizQuestions.length > 0 && (function() {

                var idx = d.geoQuizIdx || 0;

                var q = d.geoQuizQuestions[idx % d.geoQuizQuestions.length];

                return React.createElement('div', { className: 'max-w-md mx-auto bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200' },

                  React.createElement('p', { className: 'text-[10px] text-teal-500 mb-1' }, 'Question ' + (idx + 1) + '/' + d.geoQuizQuestions.length),

                  React.createElement('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, q.question),

                  q.hint && React.createElement('p', { className: 'text-[10px] text-slate-400 mb-2' }, '\uD83D\uDCA1 Hint: ' + q.hint),

                  React.createElement('div', { className: 'flex gap-2' },

                    React.createElement('input', {

                      type: 'text',

                      placeholder: 'Your answer...',

                      value: d.geoQuizAnswer || '',

                      onChange: function(e) { upd('geoQuizAnswer', e.target.value); },

                      onKeyDown: function(e) {

                        if (e.key === 'Enter') {

                          var ans = (d.geoQuizAnswer || '').trim().toLowerCase();

                          var correct = q.answer.toLowerCase().indexOf(ans) !== -1 || ans.indexOf(q.answer.toLowerCase()) !== -1;

                          if (correct) {

                            upd('geoScore', geoScore + 10);

                            upd('geoFeedback', { correct: true, msg: '\u2705 Correct! ' + (q.fact || '') });

                            if (typeof awardStemXP === 'function') awardStemXP('geoQuiz', 10, 'AI quiz answer');

                          } else {

                            upd('geoFeedback', { correct: false, msg: '\u274C Answer: ' + q.answer + '. ' + (q.fact || '') });

                          }

                          upd('geoQuizAnswer', '');

                          setTimeout(function() { upd('geoQuizIdx', idx + 1); upd('geoFeedback', null); }, 2000);

                        }

                      },

                      className: 'flex-1 px-3 py-2 rounded-lg border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'

                    }),

                    React.createElement('button', {

                      onClick: function() { upd('geoFeedback', { correct: false, msg: 'Answer: ' + q.answer }); setTimeout(function() { upd('geoQuizIdx', idx + 1); upd('geoFeedback', null); }, 2000); },

                      className: 'px-3 py-2 bg-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-300'

                    }, 'Skip')

                  )

                );

              })()

            ),



            // ── Bottom stats ──

            React.createElement('div', { className: 'px-4 py-3 bg-gradient-to-r from-slate-50 to-teal-50 border-t flex justify-between items-center text-[10px] text-slate-500' },

              React.createElement('span', null, '\u2B50 Score: ' + geoScore + '  \u2022  \uD83D\uDD25 Streak: ' + geoStreak),

              React.createElement('span', null, '\u2705 ' + geoAnswered.length + ' answered'),

              React.createElement('button', {

                onClick: function() { upd('geoScore', 0); upd('geoStreak', 0); upd('geoAnswered', []); upd('geoTarget', null); upd('geoRound', 0); if (addToast) addToast('\u267B Score reset!', 'info'); },

                className: 'text-teal-600 hover:text-teal-800 font-bold'

              }, '\u267B Reset All')

            )

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_geo.js loaded — 1 tools');
})();