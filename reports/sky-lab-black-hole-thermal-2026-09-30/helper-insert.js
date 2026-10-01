
      function renderBlackHoleThermal() {
        var m = blackHoleThermalModel(d), panel = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#334155';
        var plot = { x: 80, y: 40, w: 250, h: 240 };
        function power(n) { return String(n).split('').map(function(c) { return { '-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' }[c] || c; }).join(''); }
        function number(value) {
          if (value >= 0.001 && value < 1e6) return Number(value.toPrecision(3)).toLocaleString('en-US', { maximumSignificantDigits: 3 });
          var parts = value.toExponential(2).split('e'); return parts[0] + ' × 10' + power(Number(parts[1]));
        }
        function temperature(value) {
          return value < 1e-9 ? number(value) + ' K' : value < 1e-6 ? number(value * 1e9) + ' nK'
            : value < 1e-3 ? number(value * 1e6) + ' µK' : value < 1 ? number(value * 1e3) + ' mK' : number(value) + ' K';
        }
        function diameter(value) { return value < 1 ? number(value * 1000) + ' mm' : value < 1000 ? number(value) + ' m' : number(value / 1000) + ' km'; }
        function point(p) { return { x: plot.x + p.x * plot.w, y: plot.y + p.y * plot.h }; }
        function setMass(value) { upd({ bhMassSolar: value }); }
        function setExponent(value) { setMass(Math.pow(10, Math.max(BH_THERMAL.logMin, Math.min(BH_THERMAL.logMax, value)))); }
        function setChart(event) {
          var box = event.currentTarget.getBoundingClientRect(); if (!box.width) return;
          var x = Math.max(0, Math.min(1, ((event.clientX - box.left) * 360 / box.width - plot.x) / plot.w));
          setExponent(BH_THERMAL.logMin + x * (BH_THERMAL.logMax - BH_THERMAL.logMin));
        }
        function massKeys(event, chart) {
          if (event.key === 'Home' && chart) { event.preventDefault(); setMass(1); return; }
          var delta = { ArrowLeft: -0.25, ArrowDown: -0.25, ArrowRight: 0.25, ArrowUp: 0.25, PageDown: -1, PageUp: 1 }[event.key];
          if (delta === undefined) return;
          event.preventDefault(); setExponent(m.logMass + delta * (event.shiftKey ? 4 : 1));
        }
        function label(id) {
          return { solar: __alloT('stem.astronomy.bht_solar_example', 'One solar mass'),
            millimeter: __alloT('stem.astronomy.bht_mm_example', '1 mm horizon'),
            cmb: __alloT('stem.astronomy.bht_cmb_example', 'Match CMB temperature'), sgrA: 'Sagittarius A*', m87: 'M87*' }[id];
        }
        function metric(labelText, text, key, value) {
          return h('div', null, h('dt', { style: { color: '#cbd5e1', fontSize: 12 } }, labelText),
            h('dd', { 'data-bht-metric': key, 'data-value': value, style: { margin: 0, color: '#f8fafc', fontSize: 14, fontWeight: 750, overflowWrap: 'anywhere' } }, text));
        }
        function sourceLink(url, text) {
          return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', minHeight: 44, alignItems: 'center', color: '#7dd3fc', fontSize: 12, marginRight: 12 } }, text);
        }
        function disk(id, cx, radius, tiny) {
          return h('g', { key: id, 'aria-hidden': true },
            h('circle', { 'data-bht-disk': id, cx: cx, cy: 100, r: radius, fill: id === 'solar' ? '#e2e8f0' : '#7dd3fc' }),
            tiny && h('path', { d: 'M' + cx + ',111 L' + cx + ',146', stroke: '#cbd5e1', strokeDasharray: '3 3' }),
            tiny && h('text', { x: cx, y: 172, textAnchor: 'middle', fill: '#cbd5e1' }, __alloT('stem.astronomy.bht_tiny_disk', 'Tiny horizon ↑')),
            h('text', { x: cx, y: 211, textAnchor: 'middle', fill: '#e2e8f0' }, id === 'solar' ? __alloT('stem.astronomy.bht_solar_disk', 'Solar mass') : __alloT('stem.astronomy.bht_selected_disk', 'Selected')));
        }
        var current = point(m.chart), cmb = point(m.cmbChart);
        var relation = {
          hotter: { title: __alloT('stem.astronomy.bht_hotter', 'Hotter than the CMB'), detail: __alloT('stem.astronomy.bht_hotter_detail', 'Considering photons alone, a black hole hotter than the cosmic microwave background would emit more photon energy than it absorbs from that background. This comparison does not calculate the total mass-loss rate.') },
          colder: { title: __alloT('stem.astronomy.bht_colder', 'Colder than the CMB'), detail: __alloT('stem.astronomy.bht_colder_detail', 'Considering photons alone, absorption from the cosmic microwave background would outweigh the hole’s photon emission. A cold black hole still emits in this theory.') },
          balanced: { title: __alloT('stem.astronomy.bht_balanced', 'At the CMB temperature'), detail: __alloT('stem.astronomy.bht_balanced_detail', 'The model temperatures match for photon exchange with the CMB. This ideal balance is unstable: gaining mass makes a black hole colder, and losing mass makes it hotter.') }
        }[m.cmbRelation];
        return h('section', { id: 'astronomy-black-hole-thermal', 'aria-labelledby': 'astronomy-bht-heading', style: { marginBottom: 14, padding: 14, border: '1px solid ' + border, borderRadius: 14, background: panel } },
          h('style', null, '#astronomy-black-hole-thermal button,#astronomy-black-hole-thermal summary{min-height:44px}#astronomy-bht-horizons text,#astronomy-bht-curve text{font-size:18px}#astronomy-page-curve-diagram text{font-size:19px}@media(max-width:600px){#astronomy-bht-horizons text,#astronomy-bht-curve text,#astronomy-page-curve-diagram text{font-size:24px}}'),
          h('h3', { id: 'astronomy-bht-heading', style: { margin: '0 0 7px', color: '#a5f3fc', fontSize: 16 } }, __alloT('stem.astronomy.bht_heading', 'Black-hole size and temperature')),
          h('p', { style: { fontSize: 13, lineHeight: 1.6, color: '#e2e8f0', margin: '0 0 12px' } }, __alloT('stem.astronomy.bht_intro', 'Increase the mass to enlarge the horizon and lower the predicted Hawking temperature. These calculations assume a nonrotating, uncharged black hole. A solar-mass black hole is hypothetical; the Sun is not a black hole.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.bht_examples', 'Black-hole mass examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7 } }, m.examples.map(function(example) {
            return h('button', { key: example.id, type: 'button', className: 'astr-focus', 'aria-pressed': m.example === example.id, onClick: function() { setMass(example.mass); },
              style: { padding: '9px 12px', border: '1px solid ' + border, borderRadius: 8, color: '#e0f2fe', fontSize: 13, background: m.example === example.id ? '#164e63' : panel, cursor: 'pointer' } }, label(example.id));
          })),
          h('p', { id: 'astronomy-bht-input-status', role: 'status', 'aria-live': 'polite', 'data-bht-example': m.example, style: { margin: '9px 0', fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' } },
            m.example === 'sgrA' || m.example === 'm87' ? __alloT('stem.astronomy.bht_published_status', 'Published mass input:') + ' ' + label(m.example) + ' · EHT ' + (m.example === 'sgrA' ? '2022' : '2019') + '.'
              : m.example === 'custom' ? __alloT('stem.astronomy.bht_custom_status', 'Custom mass. Published presets restore their original mass input.')
                : __alloT('stem.astronomy.bht_teaching_status', 'Teaching example. The millimetre horizon and CMB match are theoretical comparisons.')),
          h('label', { htmlFor: 'astronomy-bht-mass', style: { display: 'block', fontSize: 13, color: '#e0f2fe', fontWeight: 700 } }, __alloT('stem.astronomy.bht_mass_control', 'Mass (Sun = 1)'), ': ' + number(m.massSolar)),
          h('input', { id: 'astronomy-bht-mass', type: 'range', min: BH_THERMAL.logMin, max: BH_THERMAL.logMax, step: 'any', value: m.logMass,
            'aria-label': __alloT('stem.astronomy.bht_mass_control', 'Mass (Sun = 1)'), 'aria-valuetext': number(m.massSolar) + ' ' + __alloT('stem.astronomy.bht_solar_masses', 'solar masses'),
            'aria-describedby': 'astronomy-bht-control-help', onChange: function(event) { setExponent(Number(event.target.value)); }, onKeyDown: function(event) { massKeys(event, false); }, className: 'astr-focus', style: { width: '100%', minHeight: 44 } }),
          h('p', { id: 'astronomy-bht-control-help', style: { margin: '0 0 12px', fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' } }, __alloT('stem.astronomy.bht_control_help', 'The mass slider and chart use log scales: equal steps multiply the mass. Arrow keys change mass by a factor of about 1.78; Page Up or Down changes it tenfold. Shift makes arrow steps tenfold.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', alignItems: 'start', gap: 14 } },
            h('figure', { style: { margin: 0, padding: 10, border: '1px solid ' + border, borderRadius: 12, minWidth: 0 } },
              h('h4', { style: { fontSize: 14, color: '#a5f3fc', margin: '0 0 8px' } }, __alloT('stem.astronomy.bht_horizon_heading', 'Horizon size at a shared scale')),
              h('svg', { id: 'astronomy-bht-horizons', viewBox: '0 0 360 235', role: 'img', 'aria-labelledby': 'astronomy-bht-horizon-title', 'aria-describedby': 'astronomy-bht-horizon-note', 'data-mass-solar': m.massSolar, 'data-diameter-m': m.diameterM, style: { display: 'block', width: '100%' } },
                h('title', { id: 'astronomy-bht-horizon-title' }, __alloT('stem.astronomy.bht_horizon_title', 'Schwarzschild horizon cross sections for one solar mass and the selected mass')),
                disk('solar', 90, m.solarDisk, m.solarTiny), disk('selected', 270, m.selectedDisk, m.selectedTiny)),
              h('figcaption', { id: 'astronomy-bht-horizon-note', style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.bht_horizon_note', 'Both silhouettes use the same diameter scale, fitted to the larger horizon. Tiny horizons remain tiny; dashed pointers locate them. Colors and spacing are illustrative. These circles show a theoretical horizon, not an accretion ring or the larger lensed shadow in an EHT image.'))),
            h('figure', { style: { margin: 0, padding: 10, border: '1px solid ' + border, borderRadius: 12, minWidth: 0 } },
              h('svg', { id: 'astronomy-bht-curve', viewBox: '0 0 360 360', role: 'slider', tabIndex: 0, className: 'astr-focus',
                'aria-label': __alloT('stem.astronomy.bht_chart_label', 'Explore mass and Hawking temperature'), 'aria-orientation': 'horizontal', 'aria-valuemin': -14, 'aria-valuemax': 10, 'aria-valuenow': m.logMass,
                'aria-valuetext': number(m.massSolar) + ' ' + __alloT('stem.astronomy.bht_solar_masses', 'solar masses') + ', ' + temperature(m.temperatureK),
                'aria-describedby': 'astronomy-bht-chart-help astronomy-bht-cmb-status', 'data-temperature-k': m.temperatureK, 'data-mass-solar': m.massSolar,
                onPointerDown: function(event) { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId); setChart(event); },
                onPointerMove: function(event) { if (event.buttons === 1 && event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) setChart(event); },
                onKeyDown: function(event) { massKeys(event, true); }, style: { display: 'block', width: '100%', touchAction: 'none', cursor: 'ew-resize' } },
                h('title', null, __alloT('stem.astronomy.bht_chart_title', 'Higher mass means lower Hawking temperature')),
                h('rect', { x: plot.x, y: plot.y, width: plot.w, height: plot.h, fill: astronomyContrast ? '#000' : '#0e1c32', stroke: border }),
                [6,0,-6,-12,-18].map(function(exp) { var y = plot.y + (7 - exp) / 25 * plot.h; return h('g', { key: exp, 'aria-hidden': true },
                  h('line', { x1: plot.x, x2: plot.x + plot.w, y1: y, y2: y, stroke: '#52627a', strokeDasharray: '2 5' }),
                  h('text', { x: plot.x - 9, y: y + 5, textAnchor: 'end', fill: '#e2e8f0' }, exp === 0 ? '1' : '10' + power(exp))); }),
                [-14,0,10].map(function(exp) { var x = plot.x + (exp + 14) / 24 * plot.w; return h('g', { key: exp, 'data-bht-mass-tick': true, 'aria-hidden': true },
                  h('line', { x1: x, x2: x, y1: plot.y, y2: plot.y + plot.h, stroke: '#52627a', strokeDasharray: '2 5' }),
                  h('text', { x: x, y: 313, textAnchor: exp === -14 ? 'start' : exp === 10 ? 'end' : 'middle', fill: '#e2e8f0' }, exp === 0 ? '1' : '10' + power(exp))); }),
                h('text', { x: plot.x, y: 29, fill: '#e2e8f0', 'aria-hidden': true }, __alloT('stem.astronomy.bht_temperature_axis', 'Temperature (K)')),
                h('text', { x: 204, y: 351, textAnchor: 'middle', fill: '#e2e8f0', 'aria-hidden': true }, __alloT('stem.astronomy.bht_mass_axis', 'Mass (Sun = 1) →')),
                h('line', { x1: plot.x, x2: plot.x + plot.w, y1: cmb.y, y2: cmb.y, stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5 4', 'aria-hidden': true }),
                h('text', { x: plot.x + plot.w, y: cmb.y - 8, textAnchor: 'end', fill: '#fde68a', 'aria-hidden': true }, 'CMB'),
                h('polyline', { points: m.curve.map(function(p) { var q = point(p); return q.x + ',' + q.y; }).join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 3, 'aria-hidden': true }),
                h('g', { 'aria-hidden': true }, h('circle', { cx: current.x, cy: current.y, r: 10, fill: '#7dd3fc', opacity: 0.2 }), h('circle', { 'data-bht-marker': true, cx: current.x, cy: current.y, r: 5, fill: '#e0f2fe', stroke: '#fff', strokeWidth: 1.5 }))),
              h('figcaption', { id: 'astronomy-bht-chart-help', style: { fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' } }, __alloT('stem.astronomy.bht_chart_help', 'Drag across the chart or use arrow keys. Home on the chart selects one solar mass. The blue line is the temperature prediction; the gold dashed line is the measured CMB temperature. This is a mass comparison, not an evaporation timeline.')))),
          h('dl', { id: 'astronomy-bht-readout', 'aria-live': 'polite', 'aria-atomic': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,155px),1fr))', gap: 12, margin: '14px 0', lineHeight: 1.6 } },
            metric(__alloT('stem.astronomy.bht_mass_value', 'Mass'), number(m.massSolar) + ' M☉', 'mass', m.massSolar),
            metric(__alloT('stem.astronomy.bht_diameter_value', 'Horizon diameter'), diameter(m.diameterM), 'diameter', m.diameterM),
            metric(__alloT('stem.astronomy.bht_temperature_value', 'Hawking temperature'), temperature(m.temperatureK), 'temperature', m.temperatureK),
            metric(__alloT('stem.astronomy.bht_entropy_value', 'Entropy / kB'), number(m.entropyOverK), 'entropy', m.entropyOverK)),
          h('div', { id: 'astronomy-bht-cmb-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-cmb-relation': m.cmbRelation, style: { border: '1px solid ' + border, borderRadius: 10, padding: 12 } },
            h('strong', { style: { color: '#fde68a', fontSize: 14 } }, relation.title),
            h('p', { style: { margin: '6px 0', fontSize: 12, lineHeight: 1.6, color: '#e2e8f0' } }, relation.detail),
            h('p', { style: { margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' } }, __alloT('stem.astronomy.bht_cmb_reference', 'CMB reference: 2.72548 ± 0.00057 K · Fixsen (2009). Other radiation, matter, spin and charge are omitted.'))),
          h('p', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.bht_detection_note', 'Published examples supply mass estimates. Horizon size, entropy and Hawking temperature here are theoretical calculations. Hawking radiation from an astrophysical black hole has not been directly detected.')),
          h('details', { style: { border: '1px solid ' + border, borderRadius: 9, padding: '0 10px' } },
            h('summary', { className: 'astr-focus', style: { cursor: 'pointer', padding: '11px 0', color: '#e0f2fe', fontSize: 13 } }, __alloT('stem.astronomy.bht_source_details', 'Sources, uncertainties and equations')),
            h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } }, __alloT('stem.astronomy.bht_mass_sources', 'Sagittarius A*: 4.0 million solar masses, with a −0.6 / +1.1 million interval, from EHT (2022). M87*: 6.5 billion solar masses, ±0.2 billion statistical and ±0.7 billion systematic error, from EHT (2019). These are fixed study estimates; the explorer uses their central values without propagating uncertainty.')),
            h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } }, __alloT('stem.astronomy.bht_equations', 'Schwarzschild radius r = 2GM/c²; Hawking temperature T = ħc³/(8πGMkB); entropy S/kB = A/(4ℓP²), with A = 4πr² and ℓP² = ħG/c³. Mass units use the IAU nominal solar GM. Other constants use CODATA 2022 values.')),
            h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } }, __alloT('stem.astronomy.bht_equation_help', 'G is the gravitational constant, c the speed of light, ħ the reduced Planck constant, kB the Boltzmann constant, and A the horizon area. Entropy grows with mass squared; temperature falls in inverse proportion to mass. This explorer does not simulate the quantum endpoint of evaporation.')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              sourceLink('https://eventhorizontelescope.org/publications/first-sagittarius-event-horizon-telescope-results-iv-variability-morphology-and', __alloT('stem.astronomy.bht_sgra_source', 'Sagittarius A* · EHT 2022')),
              sourceLink('https://arxiv.org/abs/1906.11243', __alloT('stem.astronomy.bht_m87_source', 'M87* · EHT 2019')),
              sourceLink('https://doi.org/10.1007/BF02345020', __alloT('stem.astronomy.bht_hawking_source', 'Hawking · 1975')),
              sourceLink('https://arxiv.org/abs/0911.1955', __alloT('stem.astronomy.bht_cmb_source', 'CMB temperature · Fixsen 2009')),
              sourceLink('https://physics.nist.gov/cuu/Constants/index.html', __alloT('stem.astronomy.bht_constants_source', 'Physical constants · NIST')),
              sourceLink('https://arxiv.org/abs/1510.07674', __alloT('stem.astronomy.bht_solar_source', 'Solar units · IAU 2015')))),
          h('details', { id: 'astronomy-page-comparison', style: { border: '1px solid ' + border, borderRadius: 9, padding: '0 10px', marginTop: 10 } },
            h('summary', { className: 'astr-focus', style: { cursor: 'pointer', padding: '11px 0', color: '#e0f2fe', fontSize: 13 } }, __alloT('stem.astronomy.bht_page_details', 'Compare information models')),
            h('figure', { style: { margin: '0 0 12px' } },
              h('h4', { style: { fontSize: 14, color: '#a5f3fc', margin: '0 0 8px' } }, __alloT('stem.astronomy.bht_radiation_entropy', 'Entropy of emitted radiation')),
              h('svg', { id: 'astronomy-page-curve-diagram', viewBox: '0 0 360 260', role: 'img', 'aria-labelledby': 'astronomy-page-curve-title astronomy-page-curve-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                h('title', { id: 'astronomy-page-curve-title' }, __alloT('stem.astronomy.bht_page_title', 'Conceptual Page curve comparison')),
                h('desc', { id: 'astronomy-page-curve-desc' }, __alloT('stem.astronomy.bht_page_desc', 'The leading thermal calculation gives rising radiation entropy during evaporation. In a unitary model starting in a pure state, radiation entropy peaks near the Page time and returns to zero after complete evaporation.')),
                h('line', { x1: 40, y1: 200, x2: 335, y2: 200, stroke: '#94a3b8', strokeWidth: 2 }),
                h('line', { x1: 40, y1: 200, x2: 40, y2: 40, stroke: '#94a3b8', strokeWidth: 2 }),
                h('line', { x1: 185, y1: 40, x2: 185, y2: 200, stroke: '#94a3b8', strokeDasharray: '5 5' }),
                h('text', { x: 185, y: 29, textAnchor: 'middle', fill: '#e2e8f0', 'aria-hidden': true }, __alloT('stem.astronomy.bht_page_time', 'Page time')),
                h('path', { d: 'M40 200 C100 157 225 95 335 48', fill: 'none', stroke: '#fb7185', strokeWidth: 4 }),
                h('path', { d: 'M40 200 C95 157 145 70 185 67 C228 84 295 168 335 200', fill: 'none', stroke: '#38bdf8', strokeWidth: 4 }),
                h('text', { x: 185, y: 245, textAnchor: 'middle', fill: '#e2e8f0', 'aria-hidden': true }, __alloT('stem.astronomy.bht_evaporation_axis', 'Evaporation →'))),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, color: '#e2e8f0', fontSize: 12, lineHeight: 1.6, margin: '6px 0' } },
                h('span', null, h('span', { 'aria-hidden': true, style: { display: 'inline-block', width: 22, borderTop: '3px solid #fb7185', marginRight: 6 } }), __alloT('stem.astronomy.bht_thermal_curve', 'Thermal calculation: entropy rises')),
                h('span', null, h('span', { 'aria-hidden': true, style: { display: 'inline-block', width: 22, borderTop: '3px solid #38bdf8', marginRight: 6 } }), __alloT('stem.astronomy.bht_unitary_curve', 'Unitary Page curve: entropy returns to zero'))),
              h('figcaption', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } }, __alloT('stem.astronomy.bht_page_note', 'Conceptual curves: axes are not numerical or to scale. The horizontal axis is evaporation progress; the vertical axis is radiation entropy. Page time concerns an entropy balance, not a fixed fraction of mass lost. This figure is independent of the mass controls above.')),
              sourceLink('https://arxiv.org/abs/hep-th/9306083', __alloT('stem.astronomy.bht_page_source', 'Information in black-hole radiation · Page 1993')))));
      }

