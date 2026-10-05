      function renderTidalForcing() {
        var m = tidalForcingModel(d), bg = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#475569';
        var cyan = '#67e8f9', gold = '#fde68a', green = '#86efac', muted = '#cbd5e1';
        var panel = { padding: 12, border: '1px solid ' + border, borderRadius: 12, background: bg, minWidth: 0 };
        var prose = { margin: '8px 0', fontSize: 13, lineHeight: 1.75, color: muted };
        function text(key, fallback) { return __alloT('stem.astronomy.tf_' + key, fallback); }
        function n(value, digits) { return value.toLocaleString('en-US', { maximumFractionDigits: digits == null ? 2 : digits }); }
        function signed(value) { return (value > 0 ? '+' : '') + n(value, 3); }
        function button(label, action, on, key) {
          return h('button', { key: key, type: 'button', className: 'astr-focus', onClick: action, 'aria-pressed': typeof on === 'boolean' ? on : undefined,
            style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '2px solid ' + (on ? gold : border), background: on ? gold : bg, color: on ? '#020617' : '#f1f5f9' } }, label);
        }
        function phase(value) { upd({ tidePhaseStart: Math.max(0, Math.min(1, value)), tideHours: 0 }); }
        function hours(value) { upd({ tideHours: Math.max(0, Math.min(48, value)) }); }
        var timeControl = { value: m.hours, min: 0, max: 48, step: 0.5, change: hours };
        function keys(e, c) {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          var value, step = c.step * (e.shiftKey ? 5 : 1);
          if (e.key === 'Home') value = c.min;
          else if (e.key === 'End') value = c.max;
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') value = c.value + step;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') value = c.value - step;
          else return;
          e.preventDefault(); c.change(Math.max(c.min, Math.min(c.max, value)));
        }
        function scrub(e) {
          var rect = e.currentTarget.getBoundingClientRect(); if (!rect.width) return;
          hours(Math.max(0, Math.min(1, ((e.clientX - rect.left) / rect.width * 360 - 64) / 270)) * 48);
        }
        var controls = [
          { id: 'phase', label: text('phase', 'Starting lunar phase'), value: m.phaseStart, min: 0, max: 1, step: 0.01,
            readout: n(m.phaseStart * 360, 0) + '°', change: phase, help: text('phase_help', 'Choose the Moon–Sun angle at hour zero. Changing it restarts model time. The Moon keeps moving as you explore the next 48 hours.') },
          { id: 'distance', label: text('distance', 'Earth–Moon distance'), value: m.distanceKm, min: 363300, max: 405500, step: 500,
            readout: n(m.distanceKm, 0) + ' km', change: function(v) { upd({ tideDistanceKm: v }); },
            help: text('distance_help', 'These presets use NASA mean perigee, semimajor-axis and apogee distances. The chosen distance stays fixed during the 48-hour model.') },
          Object.assign({}, timeControl, { id: 'time', label: text('time', 'Elapsed model time'), readout: n(m.hours, 2) + ' h',
            help: text('time_help', 'The sample point rotates once per solar day. The Moon moves too, producing a lunar day of about 24 h 50 min. Arrow keys move half an hour; Shift moves 2.5 hours.') })
        ];
        var status = !m.includeSun ? text('moon_status', 'Moon-only experiment: solar forcing is omitted.')
          : m.regime === 'spring' ? text('spring_status', 'Near spring alignment: lunar and solar contributions reinforce the largest spatial variation.')
          : m.regime === 'neap' ? text('neap_status', 'Near neap alignment: lunar and solar contributions partly cancel, reducing the spatial variation.')
          : text('transition_status', 'Between spring and neap alignments: the combined pattern changes as the Moon moves.');
        function shape(field) {
          return m.surface.map(function(p, i) { var r = 55 + 10 * p[field];
            return (i ? 'L' : 'M') + (156 + r * Math.cos(p.angle)) + ',' + (178 - r * Math.sin(p.angle)); }).join(' ') + ' Z';
        }
        var moonX = 156 + 100 * Math.cos(m.current.angle), moonY = 178 - 100 * Math.sin(m.current.angle);
        var pointX = 156 + 37 * Math.cos(m.current.observerAngle), pointY = 178 - 37 * Math.sin(m.current.observerAngle);
        function chartX(hh) { return 64 + hh / 48 * 270; }
        function chartY(value) { return 45 + (1.8 - value) / 3.6 * 210; }
        var legend = text('legend', 'Cyan: Moon. Yellow dashed: Sun. Green: combined. Gold dot: the sample location.');
        return h('div', { id: 'astronomy-tidal-forcing-lab', style: { padding: 12, borderRadius: 14, background: bg, minWidth: 0, marginBottom: 16 } },
          h('p', { style: Object.assign({}, prose, { marginTop: 0 }) }, text('intro', 'Explore why the Sun and Moon produce spring and neap tides. The diagrams show an idealized tidal-forcing pattern and a sample point rotating through it. Values are relative to the Moon at its mean distance; they do not show local sea level.')),
          h('div', { role: 'group', 'aria-label': text('phase_examples', 'Starting lunar phase examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
            [[0, text('new', 'New moon')], [0.25, text('first', 'First quarter')], [0.5, text('full', 'Full moon')], [0.75, text('last', 'Last quarter')]].map(function(p) {
              return button(p[1], function() { phase(p[0]); }, Math.abs(m.phaseStart % 1 - p[0]) < 1e-10, String(p[0]));
            })),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: 12 } },
            controls.map(function(c) { return h('div', { key: c.id, style: panel },
              h('label', { htmlFor: 'astronomy-tf-' + c.id, style: { display: 'block', fontSize: 13, fontWeight: 700, color: gold } }, c.label + ': ' + c.readout),
              h('input', { id: 'astronomy-tf-' + c.id, type: 'range', step: 'any', min: c.min, max: c.max, value: c.value, className: 'astr-focus',
                'aria-label': c.label, 'aria-valuetext': c.readout, onChange: function(e) { c.change(Number(e.target.value)); }, onKeyDown: function(e) { keys(e, c); },
                style: { display: 'block', width: '100%', minHeight: 44, accentColor: gold } }),
              h('p', { style: prose }, c.help),
              c.id === 'distance' ? h('div', { role: 'group', 'aria-label': text('distance_examples', 'Published lunar distance examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                [[363300, text('perigee', 'Mean perigee')], [384400, text('mean', 'Mean distance')], [405500, text('apogee', 'Mean apogee')]].map(function(p) {
                  return button(p[1], function() { upd({ tideDistanceKm: p[0] }); }, m.distanceKm === p[0], String(p[0]));
                })) : null);
            })),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0' } },
            button(text('sun_on', 'Moon + Sun'), function() { upd({ tideIncludeSun: true }); }, m.includeSun, 'sun-on'),
            button(text('sun_off', 'Moon only'), function() { upd({ tideIncludeSun: false }); }, !m.includeSun, 'sun-off'),
            button(text('reset', 'Reset tide explorer'), function() { upd({ tidePhaseStart: 0, tideHours: 0, tideDistanceKm: 384400, tideIncludeSun: true }); }, undefined, 'reset')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(160px,100%),1fr))', gap: 8 } },
            [
              ['moonStrength', text('moon_strength', 'Lunar contribution'), m.moonStrength, n(m.moonStrength, 3) + '×'],
              ['sunStrength', text('sun_strength', 'Solar contribution'), m.sunStrength, n(m.sunStrength, 3) + '×'],
              ['amplitude', text('amplitude', 'Combined spatial amplitude'), m.current.amplitude, n(m.current.amplitude, 3) + '×'],
              ['illumination', text('illumination', 'Moon illuminated from Earth'), m.illumination, n(m.illumination * 100, 1) + '%']
            ].map(function(row) { return h('div', { key: row[0], 'data-tf-metric': row[0], 'data-value': row[2], style: panel },
              h('div', { style: { fontSize: 12, color: muted } }, row[1]), h('strong', { style: { display: 'block', fontSize: 16, marginTop: 4, color: gold } }, row[3])); })),
          h('p', { id: 'astronomy-tf-status', role: 'status', 'aria-live': 'polite', 'data-regime': m.regime, style: Object.assign({}, prose, { borderLeft: '3px solid ' + green, paddingLeft: 12 }) }, status),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 12 } },
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) },
              h('figcaption', { style: { fontSize: 14, fontWeight: 700, color: gold } }, text('geometry_title', 'Earth, Moon and tidal contributions')),
              h('svg', { id: 'astronomy-tf-geometry', viewBox: '0 0 360 350', role: 'img', 'aria-labelledby': 'astronomy-tf-geometry-title astronomy-tf-geometry-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                h('title', { id: 'astronomy-tf-geometry-title' }, text('geometry_title', 'Earth, Moon and tidal contributions')),
                h('desc', { id: 'astronomy-tf-geometry-desc' }, text('geometry_desc', 'View above the orbital plane. The Sun is to the right. Cyan and yellow outlines show the separate contributions; the green outline combines them. Sizes, orbit spacing and bulges are exaggerated.')),
                h('circle', { cx: 156, cy: 178, r: 100, fill: 'none', stroke: '#94a3b8', strokeDasharray: '4 6' }),
                h('line', { x1: 156, y1: 178, x2: moonX, y2: moonY, stroke: cyan, strokeDasharray: '4 4', opacity: 0.7 }),
                h('path', { d: shape('total'), fill: '#14532d', stroke: green, strokeWidth: 3, fillOpacity: 0.6, 'data-tf-shape': 'total' }),
                h('path', { d: shape('moon'), fill: 'none', stroke: cyan, strokeWidth: 2, 'data-tf-shape': 'moon' }),
                h('path', { d: shape('sun'), fill: 'none', stroke: gold, strokeWidth: 2, strokeDasharray: '5 4', 'data-tf-shape': 'sun' }),
                h('circle', { cx: 156, cy: 178, r: 37, fill: '#0c4a6e', stroke: '#7dd3fc', strokeWidth: 2 }),
                h('ellipse', { cx: 156, cy: 178, rx: 15, ry: 37, fill: 'none', stroke: '#7dd3fc', opacity: 0.35 }),
                h('line', { x1: 119, x2: 193, y1: 178, y2: 178, stroke: '#7dd3fc', opacity: 0.35 }),
                h('text', { x: 156, y: 185, textAnchor: 'middle', fill: '#f1f5f9', fontSize: 21 }, text('earth', 'Earth')),
                h('circle', { cx: moonX, cy: moonY, r: 11, fill: '#334155', stroke: cyan, strokeWidth: 2, 'data-tf-moon': true }),
                h('path', { d: 'M' + moonX + ',' + (moonY - 11) + ' A11,11 0 0,1 ' + moonX + ',' + (moonY + 11) + ' Z', fill: '#e2e8f0' }),
                h('circle', { cx: pointX, cy: pointY, r: 5, fill: gold, stroke: bg, strokeWidth: 2, 'data-tf-observer': true }),
                h('circle', { cx: 327, cy: 178, r: 18, fill: gold, stroke: '#fbbf24', strokeWidth: 2 }),
                h('text', { x: 327, y: 136, textAnchor: 'middle', fill: gold, fontSize: 22 }, text('sun', 'Sun')),
                h('line', { x1: 303, x2: 280, y1: 178, y2: 178, stroke: gold, strokeWidth: 3 }),
                h('path', { d: 'M286,173 L279,178 L286,183', fill: 'none', stroke: gold, strokeWidth: 2 }),
                h('text', { x: 156, y: 39, textAnchor: 'middle', fill: cyan, fontSize: 22 }, text('moon_orbit', 'Moon orbit')),
                h('text', { x: 180, y: 326, textAnchor: 'middle', fill: muted, fontSize: 22 }, text('geometry_time', 'Model time') + ': ' + n(m.hours, 1) + ' h')),
              h('p', { style: prose }, legend),
              h('p', { style: prose }, text('geometry_help', 'Diagram sizes and tidal bulges are exaggerated. The orbit spacing stays fixed on screen; the distance control changes the strength. The Moon icon is lit on the side facing the Sun.'))),
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) },
              h('figcaption', { style: { fontSize: 14, fontWeight: 700, color: gold } }, text('chart_title', 'Forcing at the rotating sample point')),
              h('svg', { id: 'astronomy-tf-chart', viewBox: '0 0 360 360', role: 'slider', tabIndex: 0, className: 'astr-focus', 'aria-label': text('chart_a11y', 'Select elapsed time on the tidal-forcing graph'),
                'aria-valuemin': 0, 'aria-valuemax': 48, 'aria-valuenow': m.hours, 'aria-valuetext': n(m.hours, 2) + ' h; ' + signed(m.current.total) + ' ' + text('relative_units', 'relative forcing units'),
                'aria-orientation': 'horizontal', 'aria-describedby': 'astronomy-tf-chart-help', style: { width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' },
                onKeyDown: function(e) { keys(e, timeControl); },
                onPointerDown: function(e) { if (e.button != null && e.button !== 0) return; e.currentTarget.focus({ preventScroll: true }); scrub(e); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} },
                onPointerMove: function(e) { if (e.buttons === 1) scrub(e); },
                onPointerUp: function(e) { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} },
                onPointerCancel: function(e) { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} }
              },
                h('title', null, text('chart_title', 'Forcing at the rotating sample point')),
                h('desc', null, text('chart_desc', 'The two daily contributions add at every time. The vertical line and green point mark the selected time. Values are relative forcing, not water height.')),
                h('text', { x: 199, y: 28, textAnchor: 'middle', fill: muted, fontSize: 21 }, text('relative_forcing', 'Relative forcing')),
                [-1.8, 0, 1.8].map(function(v) { return h('g', { key: v },
                  h('line', { x1: 64, x2: 334, y1: chartY(v), y2: chartY(v), stroke: v === 0 ? '#94a3b8' : '#334155', strokeDasharray: v === 0 ? '4 4' : undefined }),
                  h('text', { x: 56, y: chartY(v) + 5, textAnchor: 'end', fill: muted, fontSize: 22 }, String(v))); }),
                [0, 12, 24, 36, 48].map(function(hh) { return h('g', { key: hh },
                  h('line', { x1: chartX(hh), x2: chartX(hh), y1: 45, y2: 265, stroke: '#334155' }),
                  h('text', { x: chartX(hh), y: 297, textAnchor: 'middle', fill: muted, fontSize: 22 }, String(hh))); }),
                ['moon', 'sun', 'total'].map(function(field) { return h('polyline', { key: field, 'data-tf-path': field,
                  points: m.points.map(function(p) { return chartX(p.hours) + ',' + chartY(p[field]); }).join(' '), fill: 'none', stroke: field === 'moon' ? cyan : field === 'sun' ? gold : green,
                  strokeWidth: field === 'total' ? 3 : 2, strokeDasharray: field === 'sun' ? '5 4' : undefined }); }),
                h('line', { x1: chartX(m.hours), x2: chartX(m.hours), y1: 40, y2: 270, stroke: gold, strokeWidth: 2 }),
                h('circle', { cx: chartX(m.hours), cy: chartY(m.current.total), r: 6, fill: bg, stroke: green, strokeWidth: 3, 'data-tf-selected': true, 'data-value': m.current.total, 'data-hours': m.hours }),
                h('text', { x: 199, y: 346, textAnchor: 'middle', fill: muted, fontSize: 22 }, text('hours_axis', 'Elapsed hours'))),
              h('p', { id: 'astronomy-tf-chart-help', style: prose }, text('chart_help', 'Tap or drag on the graph to select model time. The lunar and solar curves have different periods. Green is their sum; the fixed vertical scale makes spring and neap cases comparable.')),
              h('p', { style: prose }, text('current_forcing', 'Combined forcing at the sample point') + ': ' + signed(m.current.total) + '×')),
          ),
          h('div', { style: Object.assign({}, panel, { marginTop: 12 }) },
            h('strong', { style: { fontSize: 14, color: cyan } }, text('explanation', 'Why the two contributions behave this way')),
            h('p', { style: prose }, text('explanation_body', 'Tides depend on the change in gravity across Earth. The leading tidal term scales as GM / distance³, so moving the Moon closer increases its contribution. The two opposite lobes produce the twice-per-lunar-day pattern in this coplanar model.')),
            h('p', { style: prose }, text('periods', 'Model periods') + ': ' + text('lunar_period', 'lunar contribution') + ' ' + n(m.moonHalfPeriodHours, 3) + ' h; ' + text('solar_period', 'solar contribution') + ' 12 h.'),
            h('p', { style: prose }, text('local_limits', 'Real coasts can have one, two unequal, or two similar highs per day. Ocean depth, coast shape, latitude, friction and weather affect timing and water level. This model omits those effects.')),
            h('a', { href: 'https://tidesandcurrents.noaa.gov/map/', target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: cyan } }, text('local_link', 'NOAA · Local tide observations and predictions'))),
          h('details', { style: Object.assign({}, panel, { marginTop: 12 }) },
            h('summary', { className: 'astr-focus', style: { display: 'list-item', listStylePosition: 'inside', minHeight: 44, padding: '10px 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: cyan } }, text('sources', 'Published inputs and model limits')),
            h('p', { style: prose }, text('source_basis', 'The gravitational parameters use JPL DE440 values. Both are converted to km³/s² before forming their ratio. NASA provides the reference lunar distances. A 29.53059-day mean synodic month and a 24-hour solar day set the model rates; the Moon distance is held constant. The reference values are embedded, so the explorer works offline.')),
            h('table', { id: 'astronomy-tf-inputs', style: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 12, color: muted } },
              h('caption', { style: { textAlign: 'left', fontSize: 13, lineHeight: 1.7, margin: '8px 0' } }, text('table_caption', 'Reference inputs used in the forcing ratio. GM is the gravitational parameter; distance is center to center. Solar GM is converted to km³/s² and rounded for display.')),
              h('thead', null, h('tr', null, [text('input', 'Input'), text('value', 'Value')].map(function(label, i) { return h('th', { key: i, scope: 'col', style: { width: i ? '56%' : '44%', padding: '6px 2px', textAlign: 'left', borderBottom: '1px solid ' + border } }, label); }))),
              h('tbody', null, [
                [text('moon_gm', 'Moon GM'), '4,902.800118 km³/s²'],
                [text('sun_gm', 'Sun GM'), '1.3271244 × 10¹¹ km³/s²'],
                [text('lunar_mean', 'Lunar semimajor axis'), '384,400 km'],
                [text('lunar_near', 'Mean lunar perigee'), '363,300 km'],
                [text('lunar_far', 'Mean lunar apogee'), '405,500 km'],
                [text('solar_distance', 'Solar distance (1 AU)'), '149,597,870.7 km']
              ].map(function(row) { var style = { padding: '8px 2px', textAlign: 'left', overflowWrap: 'anywhere' }; return h('tr', { key: row[0] }, h('th', { scope: 'row', style: style }, row[0]), h('td', { style: style }, row[1])); }))),
            h('p', { style: Object.assign({}, prose, { fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere' }) }, 'q = M cos[2(θ − φ)] + S cos(2θ); M = (384400 / d)³; S = (GM_Sun / GM_Moon) × (384400 / AU_km)³'),
            h('p', { style: prose }, text('math_limits', 'q is the varying part of an idealized equatorial tidal term, normalized to the mean-distance lunar contribution. The diagram and graph use the same q. The Moon–Sun angle advances with model time; the sample point starts on the sunward side of Earth. Inclination, eccentricity, ocean response, delays and measurement uncertainty are omitted.')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, [
              ['https://ssd.jpl.nasa.gov/astro_par.html', text('jpl_link', 'JPL · Gravitational parameters')],
              ['https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html', text('nasa_link', 'NASA · Lunar reference distances')],
              ['https://oceanservice.noaa.gov/facts/springtide.html', text('noaa_link', 'NOAA · Spring and neap tides')],
              ['https://oceanservice.noaa.gov/education/tutorial_tides/tides07_cycles.html', text('cycles_link', 'NOAA · Coastal tide patterns')]
            ].map(function(link) { return h('a', { key: link[0], href: link[0], target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: cyan } }, link[1]); })))
        );
      }

