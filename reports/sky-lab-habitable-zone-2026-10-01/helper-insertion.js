      function renderHabitableZone() {
        var m = habitableZoneModel(d), bg = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#475569';
        var gold = '#fde68a', cyan = '#67e8f9', green = '#86efac', muted = '#cbd5e1';
        var panel = { padding: 12, border: '1px solid ' + border, borderRadius: 12, background: bg, minWidth: 0 };
        var prose = { margin: '8px 0', fontSize: 13, lineHeight: 1.75, color: muted };
        var minLog = Math.log10(0.03), maxLog = Math.log10(20), widthLog = maxLog - minLog;
        function text(key, fallback) { return __alloT('stem.astronomy.hz_' + key, fallback); }
        function n(value, digits) { return value.toLocaleString('en-US', { maximumFractionDigits: digits == null ? 3 : digits }); }
        function energy(value) { return value >= 100000 || value < 0.1 ? value.toExponential(2) : n(value, 1); }
        function x(au) { return 44 + (Math.log10(au) - minLog) / widthLog * 276; }
        function button(label, action, on, key) {
          return h('button', { key: key, type: 'button', className: 'astr-focus', onClick: action, 'aria-pressed': typeof on === 'boolean' ? on : undefined,
            style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '2px solid ' + (on ? gold : border), background: on ? gold : bg, color: on ? '#020617' : '#f1f5f9' } }, label);
        }
        function set(field, value) {
          var next = {}; next[field] = value; upd(next);
        }
        function distance(value) { set('hzDistanceAu', Math.max(0.03, Math.min(20, value))); }
        function keys(e, control) {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          var value, step = control.step * (e.shiftKey ? 5 : 1);
          if (e.key === 'Home') value = control.min;
          else if (e.key === 'End') value = control.max;
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') value = control.value + step;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') value = control.value - step;
          else return;
          e.preventDefault(); control.change(Math.max(control.min, Math.min(control.max, value)));
        }
        var distanceControl = { value: m.distanceLog, min: minLog, max: maxLog, step: 0.05, change: function(v) { distance(Math.pow(10, v)); } };
        function scrub(e) {
          if (e.button != null && e.button !== 0) return;
          var rect = e.currentTarget.getBoundingClientRect(); if (!rect.width) return;
          var fraction = Math.max(0, Math.min(1, ((e.clientX - rect.left) / rect.width * 360 - 44) / 276));
          distance(Math.pow(10, minLog + fraction * widthLog));
        }
        function choosePlanet(p) { upd({ hzTemperatureK: 5772, hzLuminosity: 1, hzDistanceAu: p.distanceAu, hzAlbedo: p.albedo }); }
        var controls = [
          { id: 'temperature', label: text('temperature', 'Stellar temperature'), value: m.temperatureK, readout: n(m.temperatureK, 0) + ' K',
            min: 2600, max: 7200, step: 100, change: function(v) { set('hzTemperatureK', v); },
            help: text('temperature_help', 'The published fit covers 2,600–7,200 K. Temperature changes the spectrum and the climate-model flux limits.') },
          { id: 'luminosity', label: text('luminosity', 'Total stellar luminosity'), value: m.luminosityLog, readout: n(m.luminosity) + ' × ' + text('sun_light', 'Sun'),
            min: -2, max: 1, step: 0.05, change: function(v) { set('hzLuminosity', Math.pow(10, v)); },
            help: text('luminosity_help', 'This is total light across all wavelengths. Equal slider movements multiply the luminosity. Temperature and luminosity are independent scenario inputs.') },
          Object.assign({}, distanceControl, { id: 'distance', label: text('distance', 'Orbital distance'), readout: n(m.distanceAu) + ' AU',
            help: text('distance_help', '1 AU is the standard Earth–Sun distance. This logarithmic control spans 0.03–20 AU; equal movements multiply the distance.') }),
          { id: 'albedo', label: text('albedo', 'Reflected fraction (Bond albedo)'), value: m.albedo, readout: n(m.albedo * 100, 1) + '%',
            min: 0, max: 0.9, step: 0.01, change: function(v) { set('hzAlbedo', v); },
            help: text('albedo_help', 'This is the fraction of incoming starlight reflected to space. It changes the simple energy balance; the published climate boundaries retain their own atmospheric assumptions.') }
        ];
        var status = m.regime === 'inner' ? text('inner_status', 'Inside the inner boundary: more irradiation than the runaway-greenhouse limit.')
          : m.regime === 'outer' ? text('outer_status', 'Beyond the outer boundary: less irradiation than the maximum-greenhouse limit.')
          : text('within_status', 'Between the conservative boundaries under the selected climate assumptions.');
        var referenceName = m.reference ? text(m.reference.id + '_name', m.reference.name) : text('custom', 'Custom scenario');
        var svgText = { fill: muted, fontSize: 22 };
        return h('div', { id: 'astronomy-habitable-zone-lab', style: { padding: 12, borderRadius: 14, background: bg, minWidth: 0 } },
          h('p', { style: Object.assign({}, prose, { marginTop: 0 }) }, text('intro', 'How far from a star could surface water persist? Move the planet and change the star. The green band shows one published climate model for a planet of one Earth mass. Its location is a starting point for investigation, not evidence of water or life.')),
          h('div', { role: 'group', 'aria-label': text('planet_examples', 'Published planet input examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
            m.references.map(function(p) { return button(text(p.id + '_name', p.name), function() { choosePlanet(p); }, !!m.reference && m.reference.id === p.id, p.id); })),
          h('p', { style: prose }, referenceName + ' · ' + text('reference_help', 'Planet buttons restore NASA orbital distance and reflectivity around the Sun. The zone model still assumes one Earth mass; planetary atmospheres are not simulated.')),
          h('div', { role: 'group', 'aria-label': text('star_scenarios', 'Stellar scenarios'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
            button(text('sun', 'Sun'), function() { upd({ hzTemperatureK: 5772, hzLuminosity: 1 }); }, m.temperatureK === 5772 && m.luminosity === 1, 'sun'),
            button(text('cool', 'Cool star scenario'), function() { upd({ hzTemperatureK: 3000, hzLuminosity: 0.01 }); }, m.temperatureK === 3000 && m.luminosity === 0.01, 'cool'),
            button(text('hot', 'Hot star scenario'), function() { upd({ hzTemperatureK: 7000, hzLuminosity: 5 }); }, m.temperatureK === 7000 && m.luminosity === 5, 'hot')),
          h('p', { style: prose }, text('scenario_help', 'The cool and hot star scenarios are illustrative inputs. They keep your selected distance and reflectivity.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: 12 } },
            controls.map(function(c) { return h('div', { key: c.id, style: panel },
              h('label', { htmlFor: 'astronomy-hz-' + c.id, style: { display: 'block', fontSize: 13, fontWeight: 700, color: gold } }, c.label + ': ' + c.readout),
              h('input', { id: 'astronomy-hz-' + c.id, type: 'range', className: 'astr-focus', min: c.min, max: c.max, step: 'any', value: c.value,
                'aria-label': c.label, 'aria-valuetext': c.readout, onChange: function(e) { c.change(Number(e.target.value)); }, onKeyDown: function(e) { keys(e, c); },
                style: { display: 'block', width: '100%', minHeight: 44, accentColor: gold } }),
              h('p', { style: prose }, c.help)); })),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(160px,100%),1fr))', gap: 8, marginTop: 12 } },
            [
              ['flux', text('flux', 'Starlight relative to Earth'), m.flux, energy(m.flux) + '×'],
              ['innerAu', text('inner_boundary', 'Inner boundary'), m.inner.distanceAu, n(m.inner.distanceAu) + ' AU'],
              ['outerAu', text('outer_boundary', 'Outer boundary'), m.outer.distanceAu, n(m.outer.distanceAu) + ' AU'],
              ['equilibriumK', text('equilibrium', 'Simple equilibrium temperature'), m.equilibriumK, n(m.equilibriumK, 1) + ' K']
            ].map(function(row) { return h('div', { key: row[0], 'data-hz-metric': row[0], 'data-value': row[2], style: panel },
              h('div', { style: { fontSize: 12, color: muted } }, row[1]), h('strong', { style: { display: 'block', marginTop: 4, fontSize: 16, color: gold } }, row[3])); })),
          h('p', { id: 'astronomy-hz-status', role: 'status', 'aria-live': 'polite', 'data-regime': m.regime, style: Object.assign({}, prose, { borderLeft: '3px solid ' + green, paddingLeft: 12 }) }, status),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
            button(text('zone_center', 'Move between the boundaries'), function() { distance(m.zoneCenterAu); }, undefined, 'center'),
            button(text('reset', 'Reset habitable-zone explorer'), function() { choosePlanet(m.references[1]); }, undefined, 'reset')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 12 } },
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) },
              h('figcaption', { style: { fontSize: 14, fontWeight: 700, color: gold } }, text('orbit_title', 'Orbit and climate-model boundaries')),
              h('svg', { id: 'astronomy-hz-orbit', viewBox: '0 0 360 330', role: 'slider', tabIndex: 0, className: 'astr-focus',
                'aria-label': text('orbit_a11y', 'Select orbital distance on the diagram'), 'aria-valuemin': 0.03, 'aria-valuemax': 20, 'aria-valuenow': m.distanceAu,
                'aria-valuetext': n(m.distanceAu) + ' AU. ' + status, 'aria-orientation': 'horizontal', 'aria-describedby': 'astronomy-hz-orbit-help',
                'data-distance-au': m.distanceAu, style: { width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' },
                onKeyDown: function(e) { keys(e, distanceControl); },
                onPointerDown: function(e) { if (e.button != null && e.button !== 0) return; e.currentTarget.focus({ preventScroll: true }); scrub(e); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} },
                onPointerMove: function(e) { if (e.buttons === 1) scrub(e); },
                onPointerUp: function(e) { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} },
                onPointerCancel: function(e) { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} }
              },
                h('title', null, text('orbit_title', 'Orbit and climate-model boundaries')),
                h('desc', null, status + ' ' + text('orbit_desc', 'Dashed lines mark the climate boundaries. The ring marks the selected distance.')),
                h('text', Object.assign({ x: 44, y: 45 }, svgText), text('closer', 'Closer')),
                h('text', Object.assign({ x: 320, y: 45, textAnchor: 'end' }, svgText), text('farther', 'Farther')),
                h('rect', { x: 44, y: 78, width: x(m.inner.distanceAu) - 44, height: 122, fill: '#7c2d12', stroke: '#fdba74', 'data-hz-band': 'inner' }),
                h('rect', { x: x(m.inner.distanceAu), y: 78, width: x(m.outer.distanceAu) - x(m.inner.distanceAu), height: 122, fill: '#14532d', stroke: green, 'data-hz-band': 'within' }),
                h('rect', { x: x(m.outer.distanceAu), y: 78, width: 320 - x(m.outer.distanceAu), height: 122, fill: '#0c4a6e', stroke: '#7dd3fc', 'data-hz-band': 'outer' }),
                m.boundaries.map(function(b) { return h('line', { key: b.id, 'data-hz-boundary': b.id, 'data-value': b.distanceAu, x1: x(b.distanceAu), x2: x(b.distanceAu), y1: 68, y2: 210, stroke: '#f1f5f9', strokeWidth: 2, strokeDasharray: '5 5' }); }),
                h('line', { x1: 44, x2: 320, y1: 140, y2: 140, stroke: '#cbd5e1', strokeWidth: 2 }),
                h('line', { x1: x(m.distanceAu), x2: x(m.distanceAu), y1: 60, y2: 216, stroke: gold, strokeWidth: 2 }),
                h('circle', { cx: x(m.distanceAu), cy: 140, r: 9, fill: bg, stroke: gold, strokeWidth: 4, 'data-hz-selected': true, 'data-value': m.distanceAu }),
                [0.03, 0.1, 1, 10, 20].map(function(au) { return h('g', { key: au },
                  h('line', { x1: x(au), x2: x(au), y1: 220, y2: 230, stroke: muted }),
                  h('text', Object.assign({ x: x(au), y: 264, textAnchor: au === 10 ? 'end' : au === 20 ? 'start' : 'middle' }, svgText), String(au))); }),
                h('text', Object.assign({ x: 180, y: 309, textAnchor: 'middle' }, svgText), text('axis', 'Distance in AU'))),
              h('p', { id: 'astronomy-hz-orbit-help', style: prose }, text('orbit_help', 'Tap the diagram to choose a distance. The scale is logarithmic; the planet marker shows distance only. The green band is between the conservative boundaries.')),
              h('p', { style: prose }, text('legend', 'Orange: inside the inner boundary. Green: between the limits. Blue: beyond the outer boundary.'))),
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) },
              h('figcaption', { style: { fontSize: 14, fontWeight: 700, color: gold } }, text('energy_title', 'Where the incoming starlight goes')),
              h('svg', { id: 'astronomy-hz-energy', viewBox: '0 0 360 330', role: 'img', 'aria-labelledby': 'astronomy-hz-energy-title astronomy-hz-energy-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                h('title', { id: 'astronomy-hz-energy-title' }, text('energy_title', 'Where the incoming starlight goes')),
                h('desc', { id: 'astronomy-hz-energy-desc' }, text('energy_desc', 'Each track represents all incident light. Reflected and absorbed fractions add to 100 percent.')),
                [
                  { id: 'incident', y: 42, name: text('incident', 'Incoming'), fraction: 1, color: gold },
                  { id: 'reflected', y: 143, name: text('reflected', 'Reflected'), fraction: m.reflectedFraction, color: cyan },
                  { id: 'absorbed', y: 244, name: text('absorbed', 'Absorbed'), fraction: m.absorbedFraction, color: green }
                ].map(function(row) { return h('g', { key: row.id, 'data-hz-energy-row': row.id, 'data-fraction': row.fraction },
                  h('text', Object.assign({ x: 32, y: row.y }, svgText), row.name),
                  h('text', Object.assign({ x: 328, y: row.y, textAnchor: 'end' }, svgText), n(row.fraction * 100, 1) + '%'),
                  h('rect', { x: 32, y: row.y + 20, width: 296, height: 28, fill: bg, stroke: muted }),
                  h('rect', { x: 32, y: row.y + 20, width: row.fraction * 296, height: 28, fill: row.color })); })),
              h('p', { style: prose }, text('energy_help', 'Tracks show fractions of the selected incoming light. Higher reflectivity reduces absorbed energy. Changing distance changes the total energy, while these fractions stay fixed.')),
              h('dl', { style: { margin: 0, fontSize: 13, color: muted, lineHeight: 1.75 } },
                h('dt', null, text('incoming_energy', 'Incoming irradiance')), h('dd', { 'data-hz-energy': 'irradiance', 'data-value': m.irradiance, style: { margin: '0 0 8px', color: gold } }, energy(m.irradiance) + ' W/m²'),
                h('dt', null, text('mean_absorbed', 'Absorbed, averaged over the globe')), h('dd', { 'data-hz-energy': 'meanAbsorbed', 'data-value': m.meanAbsorbed, style: { margin: 0, color: green } }, energy(m.meanAbsorbed) + ' W/m²')))),
          h('div', { style: Object.assign({}, panel, { marginTop: 12 }) },
            h('strong', { style: { fontSize: 14, color: cyan } }, text('temperature_limit', 'Equilibrium temperature and surface climate')),
            h('p', { style: prose }, text('temperature_help2', 'The simple temperature assumes a blackbody, uniform heat redistribution and no greenhouse warming or internal heat. Absorbed irradiance is divided by four to average intercepted sunlight over the globe. Real surface temperatures also depend on the atmosphere, clouds, circulation and pressure.')),
            h('p', { style: Object.assign({}, prose, { fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere' }) }, 'S / S_Earth = L / r²; T_eq = [1361 × (L / r²) × (1 − A) / (4σ)]^(1/4)'),
            m.reference ? h('p', { style: prose }, text('measured_surface', 'NASA reference mean surface temperature') + ': ' + n(m.reference.surfaceK, 0) + ' K. ' + text('comparison_help', 'Compare it with the simple equilibrium estimate above. The two describe different quantities.')) : null),
          h('details', { style: Object.assign({}, panel, { marginTop: 12 }) },
            h('summary', { className: 'astr-focus', style: { minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: cyan, cursor: 'pointer' } }, text('sources', 'Published inputs and model limits')),
            h('p', { style: prose }, text('climate_limits', 'The green band uses the one-Earth-mass conservative limits from Kopparapu et al. (2014): runaway greenhouse at the inner edge and maximum CO₂ greenhouse at the outer edge. The fit covers 2,600–7,200 K and uses the original 5,780 K polynomial offset. Clouds, rotation and different atmospheres can change the boundaries.')),
            h('p', { style: prose }, text('sun_basis', 'The Sun input uses the IAU 2015 nominal effective temperature of 5,772 K and a solar irradiance of 1,361 W/m² at 1 AU. The cool and hot inputs are teaching scenarios.')),
            h('table', { id: 'astronomy-hz-catalog', style: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 12, color: muted, marginTop: 10 } },
              h('caption', { style: { textAlign: 'left', fontSize: 13, lineHeight: 1.7, marginBottom: 8 } }, text('catalog_caption', 'NASA fact-sheet inputs: J2000 semimajor axes in AU, Bond albedo and reference mean surface temperatures in kelvin. Orbit values are rounded here; presets retain the published digits.')),
              h('thead', null, h('tr', null, [text('planet', 'Planet'), text('orbit', 'Orbit'), text('bond', 'Albedo'), text('surface', 'Surface')].map(function(label, i) { return h('th', { key: i, scope: 'col', style: { width: ['22%', '26%', '24%', '28%'][i], padding: '6px 2px', textAlign: 'left', borderBottom: '1px solid ' + border, overflowWrap: 'anywhere' } }, label); }))),
              h('tbody', null, m.references.map(function(p) {
                var style = { padding: '8px 2px', textAlign: 'left', overflowWrap: 'anywhere' };
                return h('tr', { key: p.id, 'data-hz-catalog-row': p.id },
                  h('th', { scope: 'row', style: style }, text(p.id + '_planet', p.id.charAt(0).toUpperCase() + p.id.slice(1))),
                  h('td', { style: style, 'data-value': p.distanceAu }, n(p.distanceAu, 3)),
                  h('td', { style: style, 'data-value': p.albedo }, n(p.albedo)),
                  h('td', { style: style, 'data-value': p.surfaceK }, n(p.surfaceK, 0)));
              }))),
            h('p', { style: prose }, text('data_limits', 'The inputs are published reference values, not a live forecast. The diagram treats semimajor axis as a constant distance and omits eccentricity, seasons, tides and stellar activity. Measurement uncertainty is not propagated. Neither position in the band nor equilibrium temperature establishes habitability.')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              [
                ['https://arxiv.org/abs/1404.5292', text('paper_link', 'Kopparapu 2014 · Climate boundaries')],
                ['https://personal.ems.psu.edu/~jfk4/ruk15/planets/', text('calculator_link', 'Author calculator and coefficients')],
                ['https://arxiv.org/abs/1510.07674', text('iau_link', 'IAU 2015 · Solar references')],
                ['https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/', text('energy_link', 'NASA · Planetary energy balance')]
              ].concat(m.references.map(function(p) { return [p.href, text(p.id + '_source', 'NASA · ' + p.id.charAt(0).toUpperCase() + p.id.slice(1) + ' fact sheet')]; })).map(function(link) {
                return h('a', { key: link[0], href: link[0], target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: cyan } }, link[1]);
              })))
        );
      }

