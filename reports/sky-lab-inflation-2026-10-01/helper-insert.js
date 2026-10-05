
      function renderInflationExpansion() {
        var m = inflationExpansionModel(d), bg = astronomyContrast ? '#000' : '#091323';
        var border = astronomyContrast ? '#fbbf24' : '#475569', gold = '#fde68a', violet = '#d8b4fe', cyan = '#67e8f9', muted = '#cbd5e1';
        var panel = { padding: 10, border: '1px solid ' + border, borderRadius: 12, background: bg, minWidth: 0 };
        var chart = { x: 82, y: 38, w: 250, h: 246 };
        function power(value) { return String(value).split('').map(function(c) { return { '-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' }[c] || c; }).join(''); }
        function number(value) {
          if (value === 0) return '0';
          if (value >= 0.001 && value < 1e5) return Number(value.toPrecision(3)).toLocaleString('en-US', { maximumSignificantDigits: 3 });
          var parts = value.toExponential(2).split('e'); return parts[0] + ' × 10' + power(Number(parts[1]));
        }
        function setFolds(value) { upd({ inflationFolds: Math.max(0, Math.min(60, value)) }); }
        function keys(event) {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          var next, step = event.shiftKey ? 5 : 0.5;
          if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = 60;
          else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = m.folds + step;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = m.folds - step;
          else return;
          event.preventDefault(); setFolds(next);
        }
        function scrub(event) {
          var box = event.currentTarget.getBoundingClientRect(); if (!box.width) return;
          setFolds(((event.clientX - box.left) * 360 / box.width - chart.x) / chart.w * 60);
        }
        function button(text, action, active, extra) {
          return h('button', Object.assign({ type: 'button', className: 'astr-focus', 'aria-pressed': active, onClick: action,
            style: { minHeight: 44, padding: '9px 11px', fontSize: 13, color: active ? gold : '#e2e8f0', background: active ? '#422006' : bg,
              border: '1px solid ' + (active ? gold : border), borderRadius: 8, cursor: 'pointer' } }, extra || {}), text);
        }
        function metric(key, label, value) {
          return h('div', { style: panel }, h('dt', { style: { color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 5 } }, label),
            h('dd', { 'data-inflation-metric': key, 'data-value': m[key], style: { margin: 0, color: '#f8fafc', fontSize: 17, fontWeight: 750, overflowWrap: 'anywhere' } }, value));
        }
        function pattern() {
          function points(samples, center) { return samples.map(function(p) { return (30 + p.xH * 300).toFixed(3) + ',' + (center - p.value * 30).toFixed(3); }).join(' '); }
          function row(samples, key, center, label, color) {
            return h('g', { key: key },
              h('text', { x: 18, y: center - 54, fill: color }, label),
              h('rect', { x: 30, y: center - 40, width: 300, height: 80, fill: color, fillOpacity: 0.05, stroke: border }),
              h('line', { x1: 30, x2: 330, y1: center, y2: center, stroke: border, strokeDasharray: '3 4' }),
              h('polyline', { 'data-inflation-pattern': key, 'data-wave-h': key === 'before' ? m.initialWaveH : m.waveH,
                points: points(samples, center), fill: 'none', stroke: color, strokeWidth: 2.5 }),
              [0, 0.5, 1].map(function(value) { var x = 30 + 300 * value; return h('g', { key: value },
                h('line', { x1: x, x2: x, y1: center + 40, y2: center + 45, stroke: border }),
                h('text', { x: x, y: center + 67, textAnchor: value === 0 ? 'start' : value === 1 ? 'end' : 'middle', fill: muted }, value)); }));
          }
          return h('svg', { id: 'astronomy-inflation-diagram', viewBox: '0 0 360 350', role: 'img',
            'aria-labelledby': 'astronomy-inflation-title astronomy-inflation-desc', 'aria-describedby': 'astronomy-inflation-pattern-caption',
            'data-folds': m.folds, 'data-stretch': m.stretch, style: { width: '100%', display: 'block' } },
            h('title', { id: 'astronomy-inflation-title' }, __alloT('stem.astronomy.inf_pattern_title', 'A pattern stretches during exponential expansion')),
            h('desc', { id: 'astronomy-inflation-desc' }, __alloT('stem.astronomy.inf_pattern_desc', 'Exponential expansion stretches an illustrative pattern. The two rows view the same fixed physical width: one Hubble length. The initial wavelength grows by e to the power N. Pattern amplitude stays illustrative.')),
            row(m.beforePattern, 'before', 92, __alloT('stem.astronomy.inf_start', 'At the start'), cyan),
            row(m.afterPattern, 'after', 240, __alloT('stem.astronomy.inf_selected', 'Selected stage'), gold),
            h('text', { x: 180, y: 343, textAnchor: 'middle', fill: muted }, __alloT('stem.astronomy.inf_window_axis', 'Position / Hubble length')));
        }
        function plotPoint(n, log) { return { x: chart.x + n / 60 * chart.w, y: chart.y + (28 - log) / 30 * chart.h }; }
        function growth() {
          var cursor = plotPoint(m.folds, 0);
          return h('svg', { id: 'astronomy-inflation-growth', viewBox: '0 0 360 350', role: 'slider', tabIndex: 0, className: 'astr-focus',
            'aria-label': __alloT('stem.astronomy.inf_chart_control', 'Explore inflation expansion stage'), 'aria-describedby': 'astronomy-inflation-help astronomy-inflation-growth-caption',
            'aria-valuemin': 0, 'aria-valuemax': 60, 'aria-valuenow': m.folds,
            'aria-valuetext': number(m.folds) + ' ' + __alloT('stem.astronomy.inf_folds_unit', 'e-folds') + ' · ' + number(m.stretch) + '×',
            'data-folds': m.folds, 'data-mode-scale': m.modeScale, style: { width: '100%', display: 'block', touchAction: 'pan-y', cursor: 'crosshair' },
            onKeyDown: keys, onPointerDown: function(event) { if (event.button !== 0) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); scrub(event); },
            onPointerMove: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event); },
            onPointerUp: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
            onPointerCancel: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } },
            h('title', null, __alloT('stem.astronomy.inf_growth_title', 'Length growth and mode scale on a log scale')),
            [0, 14, 28].map(function(log) { var p = plotPoint(0, log); return h('g', { key: log },
              h('line', { x1: chart.x, x2: chart.x + chart.w, y1: p.y, y2: p.y, stroke: log === 0 ? cyan : border, strokeDasharray: log === 0 ? '2 5' : '4 5' }),
              h('text', { x: chart.x - 10, y: p.y + 7, textAnchor: 'end', fill: log === 0 ? cyan : muted }, log === 0 ? '1' : '10' + power(log))); }),
            h('line', { x1: cursor.x, x2: cursor.x, y1: chart.y, y2: chart.y + chart.h, stroke: '#f8fafc', strokeDasharray: '4 4', strokeWidth: 1.5 }),
            [{ key:'logStretch', color:gold },{ key:'logModeScale', color:violet, dash:'8 5' }].map(function(line) {
              return h('g', { key: line.key },
                h('polyline', { 'data-inflation-trace': line.key, points: m.growth.map(function(p) { var q = plotPoint(p.folds, p[line.key]); return q.x.toFixed(3) + ',' + q.y.toFixed(3); }).join(' '), fill: 'none', stroke: line.color, strokeWidth: 2.5, strokeDasharray: line.dash }),
                h('circle', { 'data-inflation-dot': line.key, 'data-log-value': m[line.key], cx: cursor.x, cy: plotPoint(m.folds, m[line.key]).y, r: 5, fill: line.color, stroke: bg, strokeWidth: 1.5 }));
            }),
            [0, 30, 60].map(function(n) { return h('text', { key: n, 'data-inflation-fold-tick': true, x: plotPoint(n, 0).x, y: 315, textAnchor: n === 0 ? 'start' : n === 60 ? 'end' : 'middle', fill: muted }, n); }),
            h('text', { x: 180, y: 343, textAnchor: 'middle', fill: muted }, __alloT('stem.astronomy.inf_folds_axis', 'Expansion (e-folds N)')));
        }
        function spectrum() {
          var p = { x: 72, y: 38, w: 260, h: 190 };
          function point(sample, key) { return { x: p.x + (Math.log10(sample.q) + 1) / 2 * p.w, y: p.y + (1.1 - sample[key]) / 0.2 * p.h }; }
          function points(samples, key) { return samples.map(function(sample) { var q = point(sample, key); return q.x.toFixed(3) + ',' + q.y.toFixed(3); }).join(' '); }
          var band = points(m.spectrum.points, 'high') + ' ' + points(m.spectrum.points.slice().reverse(), 'low');
          return h('svg', { id: 'astronomy-inflation-spectrum', viewBox: '0 0 360 320', role: 'img',
            'aria-labelledby': 'astronomy-inflation-spectrum-title', 'aria-describedby': 'astronomy-inflation-spectrum-caption',
            'data-ns': m.spectrum.ns, 'data-ns-error': m.spectrum.nsError, style: { width: '100%', display: 'block' } },
            h('title', { id: 'astronomy-inflation-spectrum-title' }, __alloT('stem.astronomy.inf_spectrum_title', 'Normalized dimensionless primordial power inferred from Planck’s spectral index')),
            [0.9, 1, 1.1].map(function(value) { var y = p.y + (1.1 - value) / 0.2 * p.h; return h('g', { key: value },
              h('line', { x1: p.x, x2: p.x + p.w, y1: y, y2: y, stroke: value === 1 ? '#e2e8f0' : border, strokeDasharray: value === 1 ? '3 5' : '2 5' }),
              h('text', { x: p.x - 10, y: y + 7, textAnchor: 'end', fill: muted }, value)); }),
            h('polygon', { 'data-inflation-spectrum-band': true, points: band, fill: violet, fillOpacity: 0.22, stroke: violet, strokeOpacity: 0.45, strokeWidth: 0.5 }),
            h('polyline', { 'data-inflation-spectrum-mean': true, points: points(m.spectrum.points, 'power'), fill: 'none', stroke: violet, strokeWidth: 2.5 }),
            [0.1, 1, 10].map(function(value) { var x = p.x + (Math.log10(value) + 1) / 2 * p.w; return h('text', { key: value, x: x, y: 263, textAnchor: value === 0.1 ? 'start' : value === 10 ? 'end' : 'middle', fill: muted }, value); }),
            h('text', { x: 180, y: 308, textAnchor: 'middle', fill: muted }, __alloT('stem.astronomy.inf_spectrum_axis', 'Wavenumber / pivot')));
        }
        function link(url, text) { return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus',
          style: { minHeight: 44, display: 'inline-flex', alignItems: 'center', color: '#7dd3fc', marginRight: 14 } }, text); }
        var status = {
          below: __alloT('stem.astronomy.inf_below', 'Mode is below the Hubble scale'),
          crossing: __alloT('stem.astronomy.inf_crossing', 'Mode reaches the Hubble scale'),
          above: __alloT('stem.astronomy.inf_above', 'Mode exceeds the Hubble scale')
        }[m.regime];
        return h('section', { id: 'astronomy-inflation-lab', 'aria-labelledby': 'astronomy-inflation-heading',
          style: { marginBottom: 14, padding: 12, border: '1px solid ' + border, borderRadius: 14, background: bg, minWidth: 0 } },
          h('style', null, '#astronomy-inflation-lab svg text{font-size:20px}#astronomy-inflation-lab summary{min-height:44px;align-content:center}@media(max-width:600px){#astronomy-inflation-lab svg text{font-size:24px}}'),
          h('h3', { id: 'astronomy-inflation-heading', style: { margin: '0 0 7px', fontSize: 18, color: '#a5f3fc' } }, __alloT('stem.astronomy.inf_lab_heading', 'Inflation expansion explorer')),
          h('p', { style: { margin: '0 0 12px', color: muted, fontSize: 13, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_lab_intro', 'Explore an ideal period of exponential expansion. Distances and wavelengths grow while the expansion rate H stays constant. The pattern is a teaching choice; the curve inferred from published data below is a separate observational constraint.')),
          h('label', { htmlFor: 'astronomy-inflation-folds', style: { display: 'block', fontWeight: 750, color: '#e2e8f0', fontSize: 14 } }, __alloT('stem.astronomy.inf_folds_control', 'Expansion stage'), ': N = ' + number(m.folds)),
          h('input', { id: 'astronomy-inflation-folds', type: 'range', min: 0, max: 60, step: 'any', value: m.folds, className: 'astr-focus',
            'aria-valuetext': number(m.folds) + ' ' + __alloT('stem.astronomy.inf_folds_unit', 'e-folds'), 'aria-describedby': 'astronomy-inflation-help',
            onChange: function(event) { setFolds(Number(event.target.value)); }, onKeyDown: keys, style: { width: '100%', minHeight: 44 } }),
          h('p', { id: 'astronomy-inflation-help', style: { margin: '0 0 10px', color: muted, fontSize: 12, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_folds_help', 'Each e-fold multiplies lengths by e ≈ 2.718. Drag the slider or chart; arrow keys move by 0.5 e-fold and Shift moves by 5. Home returns to 0; End selects 60. N counts expansion, not elapsed seconds.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.inf_examples', 'Expansion examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 } },
            [0, 3, 10, 60].map(function(n) { return button('N = ' + n, function() { setFolds(n); }, m.folds === n, { key: n }); }),
            button(__alloT('stem.astronomy.inf_crossing_example', 'At Hubble scale'), function() { setFolds(m.crossingFolds); }, m.regime === 'crossing'),
            button(__alloT('stem.astronomy.inf_reset', 'Reset expansion'), function() { upd({ inflationFolds: 3, inflationWaveH: 0.5 }); }, undefined)),
          h('label', { htmlFor: 'astronomy-inflation-wavelength', style: { display: 'block', fontWeight: 750, color: '#e2e8f0', fontSize: 13 } }, __alloT('stem.astronomy.inf_wave_control', 'Starting wavelength / Hubble length'), ': ' + number(m.initialWaveH)),
          h('input', { id: 'astronomy-inflation-wavelength', type: 'range', min: 0.25, max: 2, step: 0.05, value: m.initialWaveH,
            className: 'astr-focus', 'aria-valuetext': number(m.initialWaveH) + ' ' + __alloT('stem.astronomy.inf_hubble_lengths', 'Hubble lengths'),
            'aria-describedby': 'astronomy-inflation-wavelength-help', onChange: function(event) { upd({ inflationWaveH: Number(event.target.value) }); }, style: { width: '100%', minHeight: 44 } }),
          h('p', { id: 'astronomy-inflation-wavelength-help', style: { margin: '0 0 12px', fontSize: 12, color: muted, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_wave_help', 'The Hubble length is c/H. Both pattern rows show a window exactly one Hubble length wide. Changing the starting wavelength moves when the selected mode reaches the Hubble scale.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14, alignItems: 'start' } },
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) }, h('h4', { style: { margin: '0 0 8px', color: '#a5f3fc', fontSize: 14 } }, __alloT('stem.astronomy.inf_pattern_heading', '1. Watch a pattern stretch')), pattern(),
              h('figcaption', { id: 'astronomy-inflation-pattern-caption', style: { fontSize: 12, color: muted, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_pattern_caption', 'Conceptual diagram: the wavelength stretches by eᴺ. A small fixed window can look smooth once it holds only part of a long wave. The sinusoidal shape, amplitude and color are illustrative; this is not a quantum fluctuation calculation or a CMB map.'))),
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) }, h('h4', { style: { margin: '0 0 8px', color: '#a5f3fc', fontSize: 14 } }, __alloT('stem.astronomy.inf_growth_heading', '2. Read exponential growth')), growth(),
              h('figcaption', { id: 'astronomy-inflation-growth-caption', style: { fontSize: 12, color: muted, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_growth_caption', 'Vertical axis: dimensionless ratios on a log scale. Straight rising lines represent exponential growth; equal vertical steps multiply values.'),
                h('ul', { style: { margin: '8px 0 0', paddingLeft: 18 } },
                  h('li', { style: { color: gold } }, __alloT('stem.astronomy.inf_length_key', 'Gold solid: length growth eᴺ.')),
                  h('li', { style: { color: violet } }, __alloT('stem.astronomy.inf_mode_key', 'Violet dashed: mode scale / Hubble length.')),
                  h('li', { style: { color: cyan } }, __alloT('stem.astronomy.inf_hubble_key', 'Cyan dotted: Hubble scale = 1.')))))),
          h('dl', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,185px),1fr))', gap: 8, margin: '12px 0' } },
            metric('stretch', __alloT('stem.astronomy.inf_length_metric', 'Length and wavelength growth'), number(m.stretch) + '×'),
            metric('volumeStretch', __alloT('stem.astronomy.inf_volume_metric', 'Volume growth in 3D'), number(m.volumeStretch) + '×'),
            metric('waveH', __alloT('stem.astronomy.inf_wave_metric', 'Wavelength / Hubble length'), number(m.waveH)),
            metric('modeScale', __alloT('stem.astronomy.inf_mode_metric', 'Mode scale / Hubble length'), number(m.modeScale))),
          h('div', { id: 'astronomy-inflation-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-regime': m.regime,
            style: Object.assign({}, panel, { color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 }) },
            h('strong', { style: { display: 'block', color: cyan, marginBottom: 5 } }, status),
            __alloT('stem.astronomy.inf_crossing_explanation', 'The convention compares λ/(2π) with c/H, where λ is the full wavelength. Equality corresponds to physical wavenumber k/a = H/c. The model tracks this size comparison without computing quantum evolution.')),
          h('p', { style: { margin: '10px 0', color: muted, fontSize: 12, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_sixty_scope', '60 e-folds gives about 1.14 × 10²⁶ in length growth. This is an illustrative amount of expansion. The required amount depends on the inflation model and the later thermal history; the controls do not set a measured duration or an absolute size.')),
          h('details', { id: 'astronomy-inflation-observations', style: { fontSize: 13, color: muted, lineHeight: 1.7 } },
            h('summary', { className: 'astr-focus', style: { cursor: 'pointer', color: '#e2e8f0', fontWeight: 750 } }, __alloT('stem.astronomy.inf_observations_heading', 'What published observations constrain')),
            h('p', null, __alloT('stem.astronomy.inf_planck_measurement', 'Planck 2018 temperature, polarization and lensing results give the scalar spectral index nₛ = 0.9649 ± 0.0042 (68% confidence), at pivot wavenumber k* = 0.05 Mpc⁻¹. These are inferred parameters of the primordial spectrum under the analysis assumptions.')),
            h('figure', { style: Object.assign({}, panel, { margin: '8px 0 12px', maxWidth: 480 }) },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: '#e9d5ff' } }, __alloT('stem.astronomy.inf_spectrum_heading', 'Relative dimensionless power')), spectrum(),
              h('figcaption', { id: 'astronomy-inflation-spectrum-caption', style: { fontSize: 12, lineHeight: 1.7 } }, __alloT('stem.astronomy.inf_spectrum_caption', 'Violet curve: (k/k*)^(nₛ−1), normalized to 1 at the pivot. The shaded band propagates only the quoted nₛ interval; normalization is held fixed. White dotted: scale invariance (nₛ = 1). Larger wavenumbers on the right mean shorter comoving wavelengths. This is an inferred power-law curve, not raw CMB data.'))),
            h('p', null, __alloT('stem.astronomy.inf_bk_measurement', 'BICEP/Keck XIII (2021), using observations through 2018 with Planck and WMAP, reports r < 0.036 at 95% confidence for k* = 0.05 Mpc⁻¹. Here r compares primordial tensor power with scalar power. This upper limit is not a tensor detection.')),
            h('p', null, __alloT('stem.astronomy.inf_observation_scope', 'These named results constrain families of early-universe models. They do not establish a unique inflaton, measure N in this explorer, or test a multiverse. Changing the teaching controls leaves the measured spectral-index curve unchanged.')),
            link('https://arxiv.org/abs/1807.06211', 'Planck 2018 · ' + __alloT('stem.astronomy.inf_spectral_index_link', 'spectral index')),
            link('https://arxiv.org/abs/2110.00483', 'BICEP/Keck 2021 · ' + __alloT('stem.astronomy.inf_tensor_limit_link', 'tensor upper limit'))),
          h('details', { style: { fontSize: 13, color: muted, lineHeight: 1.7 } },
            h('summary', { className: 'astr-focus', style: { cursor: 'pointer', color: '#e2e8f0', fontWeight: 750 } }, __alloT('stem.astronomy.inf_equations_heading', 'Model equations and limits')),
            h('p', null, __alloT('stem.astronomy.inf_equations', 'N = ln(a/a₀). With constant H, a/a₀ = exp[H(t−t₀)] = eᴺ. Physical wavelengths grow by eᴺ, volumes by e³ᴺ, and the comoving Hubble length shrinks by e⁻ᴺ. For a mode with fixed comoving wavenumber k, λ = 2πa/k. Its scale λ/(2π) equals c/H at the crossing marked here.')),
            h('p', null, __alloT('stem.astronomy.inf_model_limits', 'This kinematic model assumes constant H. It does not solve an inflaton potential, perturbation amplitudes, reheating, quantum freeze-out or later structure formation. The Hubble length is an expansion scale, not a general causal horizon. Both pattern rows retain the same physical window; no zoom or amplitude decay is used to create the smooth appearance.')),
            link('https://arxiv.org/abs/0907.5424', 'Baumann · ' + __alloT('stem.astronomy.inf_theory_link', 'inflation and Hubble scales')),
            link('https://arxiv.org/abs/astro-ph/0305263', 'Liddle & Leach · ' + __alloT('stem.astronomy.inf_folds_link', 'expansion and thermal history')))
        );
      }

