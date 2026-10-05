
      function renderCosmicDistance() {
        var m = cosmicDistanceModel(d), spectrum = cosmicRedshiftModel(d);
        var bg = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#475569';
        var gold = '#fde68a', violet = '#d8b4fe', cyan = '#67e8f9', muted = '#cbd5e1';
        var plot = { x: 64, y: 40, w: 274, h: 204 };
        var card = { padding: 12, border: '1px solid ' + border, borderRadius: 12, background: bg, minWidth: 0 };
        function number(value) { return Number(value.toPrecision(3)).toLocaleString('en-US', { maximumSignificantDigits: 3 }); }
        function zText(value) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }); }
        function distance(value) { return number(value) + ' ' + __alloT('stem.astronomy.cosmo_billion_ly', 'billion light-years'); }
        function time(value) { return value < 1 && value > 0 ? number(value * 1000) + ' ' + __alloT('stem.astronomy.cosmo_million_years', 'million years') : number(value) + ' ' + __alloT('stem.astronomy.cosmo_billion_years', 'billion years'); }
        function setZ(z) { upd({ cosmoZ: Math.round(Math.max(0, Math.min(15, z)) * 10000) / 10000, cosmoRedshiftReference: '' }); }
        function keys(event) {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          var next, step = event.shiftKey ? 1 : 0.1;
          if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = 15;
          else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = m.z + step;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = m.z - step;
          else return;
          event.preventDefault(); setZ(next);
        }
        function scrub(event) {
          var box = event.currentTarget.getBoundingClientRect(); if (!box.width) return;
          setZ(((event.clientX - box.left) * 360 / box.width - plot.x) / plot.w * 15);
        }
        function button(text, action, active, extra) {
          return h('button', Object.assign({ type: 'button', className: 'astr-focus', 'aria-pressed': active,
            onClick: action, style: { minHeight: 44, padding: '9px 12px', border: '1px solid ' + (active ? gold : border), borderRadius: 8,
              background: active ? '#422006' : bg, color: active ? gold : '#e2e8f0', fontSize: 13, cursor: 'pointer' } }, extra || {}), text);
        }
        var definitions = [
          { key: 'nowGly', color: gold, dash: undefined, label: __alloT('stem.astronomy.cosmo_now_key', 'Gold solid: separation today') },
          { key: 'thenGly', color: violet, dash: '8 5', label: __alloT('stem.astronomy.cosmo_then_key', 'Violet dashed: when light left') },
          { key: 'lightTravelGly', color: cyan, dash: '2 5', label: __alloT('stem.astronomy.cosmo_travel_key', 'Cyan dotted: light-travel equivalent') }
        ];
        function point(z, value) { return { x: plot.x + z / 15 * plot.w, y: plot.y + (1 - value / 50) * plot.h }; }
        function chart() {
          return h('svg', { id: 'astronomy-cosmo-chart', viewBox: '0 0 360 320', role: 'slider', tabIndex: 0, className: 'astr-focus',
            'aria-label': __alloT('stem.astronomy.cosmo_chart_control', 'Explore distance by redshift'), 'aria-describedby': 'astronomy-cosmo-help astronomy-cosmo-chart-caption',
            'aria-valuemin': 0, 'aria-valuemax': 15, 'aria-valuenow': m.z, 'aria-valuetext': 'z = ' + zText(m.z) + ' · ' + distance(m.nowGly),
            'data-redshift': m.z, 'data-h0': m.h0, style: { display: 'block', width: '100%', touchAction: 'pan-y', cursor: 'crosshair' }, onKeyDown: keys,
            onPointerDown: function(event) { if (event.button !== 0) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); scrub(event); },
            onPointerMove: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event); },
            onPointerUp: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
            onPointerCancel: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } },
            h('title', null, __alloT('stem.astronomy.cosmo_chart_title', 'Three distance measures in an expanding universe')),
            [0, 25, 50].map(function(value) { var p = point(0, value); return h('g', { key: value },
              h('line', { x1: plot.x, x2: plot.x + plot.w, y1: p.y, y2: p.y, stroke: border, strokeDasharray: value === 0 ? undefined : '3 5' }),
              h('text', { x: plot.x - 10, y: p.y + 7, textAnchor: 'end', fill: muted }, value)); }),
            definitions.map(function(definition) { return h('polyline', { key: definition.key, 'data-cosmo-trace': definition.key,
              points: m.samples.map(function(sample) { var p = point(sample.z, sample[definition.key]); return p.x.toFixed(3) + ',' + p.y.toFixed(3); }).join(' '),
              stroke: definition.color, strokeDasharray: definition.dash, strokeWidth: 2.5, fill: 'none' }); }),
            h('line', { 'data-cosmo-cursor': true, x1: point(m.z, 0).x, x2: point(m.z, 0).x, y1: plot.y, y2: plot.y + plot.h, stroke: '#f8fafc', strokeWidth: 1.5, strokeDasharray: '4 4' }),
            definitions.map(function(definition) { var p = point(m.z, m[definition.key]); return h('circle', { key: definition.key,
              'data-cosmo-dot': definition.key, 'data-value': m[definition.key], cx: p.x, cy: p.y, r: 5, fill: definition.color, stroke: bg, strokeWidth: 1.5 }); }),
            [0, 5, 10, 15].map(function(z) { return h('text', { key: z, 'data-cosmo-z-tick': true, x: point(z, 0).x, y: 275, textAnchor: z === 0 ? 'start' : z === 15 ? 'end' : 'middle', fill: muted }, z); }),
            h('text', { x: 180, y: 310, textAnchor: 'middle', fill: muted }, __alloT('stem.astronomy.cosmo_z_axis', 'Redshift z')));
        }
        function snapshots() {
          function row(key, y, title) {
            var value = m[key], x = 32 + value / 50 * 296, color = key === 'nowGly' ? gold : violet;
            return h('g', { key: key },
              h('text', { x: 18, y: y - 48, fill: color }, title),
              h('line', { x1: 32, x2: x, y1: y, y2: y, stroke: color, strokeWidth: 3, strokeDasharray: key === 'thenGly' ? '8 5' : undefined }),
              h('g', { 'aria-hidden': true }, h('circle', { cx: 32, cy: y, r: 8, fill: bg, stroke: '#f8fafc', strokeWidth: 2 }),
                h('path', { d: 'M28,' + y + 'h8 M32,' + (y - 4) + 'v8', stroke: '#f8fafc', strokeWidth: 1.5 })),
              h('g', { 'data-cosmo-galaxy': key, 'data-distance': value, 'data-position': x, 'aria-hidden': true },
                h('ellipse', { cx: x, cy: y, rx: 12, ry: 7, fill: color, fillOpacity: 0.3, stroke: color, strokeWidth: 1.5 }),
                h('ellipse', { cx: x, cy: y, rx: 6, ry: 3, fill: color }), h('circle', { cx: x, cy: y, r: 2, fill: '#fff' })),
              h('line', { x1: 32, x2: 328, y1: y + 22, y2: y + 22, stroke: border }),
              [0, 25, 50].map(function(value) { var tick = 32 + value / 50 * 296; return h('g', { key: value },
                h('line', { x1: tick, x2: tick, y1: y + 22, y2: y + 27, stroke: border }),
                h('text', { x: tick, y: y + 49, textAnchor: value === 0 ? 'start' : value === 50 ? 'end' : 'middle', fill: muted }, value)); }));
          }
          return h('svg', { id: 'astronomy-cosmo-epochs', viewBox: '0 0 360 320', role: 'img', 'aria-labelledby': 'astronomy-cosmo-epochs-title',
            'aria-describedby': 'astronomy-cosmo-epochs-caption', 'data-redshift': m.z, style: { display: 'block', width: '100%' } },
            h('title', { id: 'astronomy-cosmo-epochs-title' }, __alloT('stem.astronomy.cosmo_epochs_title', 'The same comoving galaxy at two cosmic times')),
            row('thenGly', 82, __alloT('stem.astronomy.cosmo_then_short', 'When light left')),
            row('nowGly', 220, __alloT('stem.astronomy.cosmo_now_short', 'Today')),
            h('text', { x: 180, y: 310, textAnchor: 'middle', fill: muted }, __alloT('stem.astronomy.cosmo_distance_axis', 'Distance (Gly)')));
        }
        function metric(key, label, value) {
          return h('div', { style: card }, h('dt', { style: { fontSize: 12, lineHeight: 1.6, color: muted, marginBottom: 5 } }, label),
            h('dd', { 'data-cosmo-metric': key, 'data-value': m[key], style: { margin: 0, color: '#f8fafc', fontSize: 18, fontWeight: 750, overflowWrap: 'anywhere' } }, value));
        }
        function link(url, text) {
          return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus',
            style: { color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginRight: 14 } }, text);
        }
        return h('section', { id: 'astronomy-cosmo-lab', tabIndex: -1, className: 'astr-focus', 'aria-labelledby': 'astronomy-cosmo-heading',
          style: { padding: 14, border: '1px solid ' + border, borderRadius: 14, background: astronomyContrast ? '#000' : '#111c30', marginBottom: 16, minWidth: 0 } },
          h('style', null, '#astronomy-cosmo-lab svg text{font-size:20px}#astronomy-cosmo-lab summary{min-height:44px;align-content:center}@media(max-width:600px){#astronomy-cosmo-lab svg text{font-size:24px}}'),
          h('h2', { id: 'astronomy-cosmo-heading', style: { margin: '0 0 7px', fontSize: 20, color: '#f8fafc' } }, __alloT('stem.astronomy.cosmo_heading', 'Cosmic distance and time')),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: muted, lineHeight: 1.7 } }, __alloT('stem.astronomy.cosmo_intro', 'Redshift tells us how much space grew while light traveled. Compare how long the journey took with the galaxy’s separation then and today. Distances and ages are inferred from the chosen expansion model.')),
          h('label', { htmlFor: 'astronomy-cosmo-z', style: { display: 'block', fontSize: 14, fontWeight: 750, color: '#e2e8f0' } }, __alloT('stem.astronomy.cosmo_redshift_control', 'Cosmological redshift'), ': z = ' + zText(m.z)),
          h('input', { id: 'astronomy-cosmo-z', type: 'range', min: 0, max: 15, step: 'any', value: m.z, className: 'astr-focus',
            'aria-valuetext': 'z = ' + zText(m.z), 'aria-describedby': 'astronomy-cosmo-help',
            onChange: function(event) { setZ(Number(event.target.value)); }, onKeyDown: keys, style: { width: '100%', minHeight: 44 } }),
          h('p', { id: 'astronomy-cosmo-help', style: { margin: '0 0 10px', fontSize: 12, color: muted, lineHeight: 1.7 } }, __alloT('stem.astronomy.cosmo_control_help', 'Drag the slider or chart. Arrow keys change z by 0.1; Shift changes it by 1. Home selects 0 and End selects 15. Both views and the readouts use the same redshift.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.cosmo_redshift_examples', 'Distance redshift examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 } },
            [0, 1, 3, 10, 15].map(function(z) { return button('z = ' + z, function() { setZ(z); }, m.z === z, { key: z }); }),
            button(__alloT('stem.astronomy.cosmo_import_z', 'Use spectrum redshift') + ' (z = ' + zText(spectrum.z) + ')', function() {
              upd({ cosmoZ: spectrum.z, cosmoRedshiftReference: spectrum.reference ? spectrum.reference.id : '' });
            }, undefined)),
          h('p', { id: 'astronomy-cosmo-redshift-source', 'data-cosmo-redshift-source': m.redshiftReference ? m.redshiftReference.id : 'chosen',
            style: { margin: '0 0 12px', color: muted, fontSize: 12, lineHeight: 1.7 } }, m.redshiftReference
              ? __alloT('stem.astronomy.cosmo_published_z', 'Published redshift input:') + ' ' + m.redshiftReference.name + ' · z = ' + zText(m.redshiftReference.z)
                + (m.redshiftReference.uncertainty ? ' ± ' + zText(m.redshiftReference.uncertainty) : '') + '. ' + __alloT('stem.astronomy.cosmo_inferred_note', 'The distance and age remain model calculations.')
              : __alloT('stem.astronomy.cosmo_chosen_z', 'Chosen redshift. Import a published galaxy example from the spectrum lab above to use its measured redshift.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14, alignItems: 'start' } },
            h('figure', { style: Object.assign({}, card, { margin: 0 }) },
              h('h3', { style: { margin: '0 0 8px', color: '#a5f3fc', fontSize: 15 } }, __alloT('stem.astronomy.cosmo_compare_heading', '1. Compare the distances')), chart(),
              h('figcaption', { id: 'astronomy-cosmo-chart-caption', style: { color: muted, fontSize: 12, lineHeight: 1.7 } },
                __alloT('stem.astronomy.cosmo_chart_caption', 'Vertical scale: billions of light-years (Gly). The light-travel equivalent is c × travel time. It differs from the galaxy’s separation because space expanded during the journey.'),
                h('ul', { style: { paddingLeft: 18, margin: '8px 0 0' } }, definitions.map(function(definition) { return h('li', { key: definition.key, style: { color: definition.color } }, definition.label); })))),
            h('figure', { style: Object.assign({}, card, { margin: 0 }) },
              h('h3', { style: { margin: '0 0 8px', color: '#a5f3fc', fontSize: 15 } }, __alloT('stem.astronomy.cosmo_epochs_heading', '2. Compare the same galaxy')), snapshots(),
              h('figcaption', { id: 'astronomy-cosmo-epochs-caption', style: { color: muted, fontSize: 12, lineHeight: 1.7 } }, __alloT('stem.astronomy.cosmo_epochs_caption', 'White cross: observer. Oval: a galaxy following cosmic expansion. Both rows use the same 0–50 Gly scale. Galaxy symbols have fixed illustrative sizes. These are separations at two times, not a photon’s path.')))),
          h('dl', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 8, margin: '14px 0' } },
            metric('lookbackGyr', __alloT('stem.astronomy.cosmo_travel_metric', 'Light-travel time'), time(m.lookbackGyr)),
            metric('thenGly', __alloT('stem.astronomy.cosmo_then_metric', 'Separation when light left'), distance(m.thenGly)),
            metric('nowGly', __alloT('stem.astronomy.cosmo_now_metric', 'Separation today'), distance(m.nowGly)),
            metric('ageGyr', __alloT('stem.astronomy.cosmo_age_metric', 'Universe age when light left'), time(m.ageGyr)),
            metric('ageNowGyr', __alloT('stem.astronomy.cosmo_today_age_metric', 'Universe age today in this model'), time(m.ageNowGyr))),
          h('div', { id: 'astronomy-cosmo-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: Object.assign({}, card, { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 }) },
            m.z === 0 ? __alloT('stem.astronomy.cosmo_zero_status', 'At z = 0 these expansion distances are zero. This is the limit at the observer, not a statement that every zero-redshift object is nearby. Local motions can cancel cosmological redshift.')
              : __alloT('stem.astronomy.cosmo_growth_status', 'Space grew by a factor of') + ' ' + number(1 + m.z) + '. '
                + __alloT('stem.astronomy.cosmo_scale_status', 'At emission, the scale factor was') + ' ' + number(m.scaleFactor) + ' ' + __alloT('stem.astronomy.cosmo_scale_end', 'of today’s value. The same factor stretches the light’s wavelength.'),
            h('p', { style: { margin: '7px 0 0' } }, __alloT('stem.astronomy.cosmo_peak_note', 'The dashed curve turns down at high z: the universe was much smaller when that light left. This does not make the galaxy closer today.'))),
          h('p', { id: 'astronomy-cosmo-model-status', 'data-cosmo-source': m.source, style: { margin: '10px 0', color: muted, fontSize: 12, lineHeight: 1.7 } },
            m.source === 'planck' ? __alloT('stem.astronomy.cosmo_planck_status', 'Rounded Planck 2018 inputs: H₀ = 67.4 km/s/Mpc; matter fraction Ωₘ = 0.315. This explorer uses a flat matter + Λ approximation.')
              : (m.source === 'shoes' ? __alloT('stem.astronomy.cosmo_shoes_status', 'SH0ES 2022 expansion-rate input: H₀ = 73.04 km/s/Mpc.') : __alloT('stem.astronomy.cosmo_custom_status', 'Chosen expansion rate:') + ' H₀ = ' + zText(m.h0) + ' km/s/Mpc.') + ' '
                + __alloT('stem.astronomy.cosmo_h0_scope', 'Only H₀ changes here. The matter fraction remains 0.315; this is a controlled comparison, not a new cosmological fit.')),
          h('details', { id: 'astronomy-cosmo-details', style: { fontSize: 13, lineHeight: 1.7, color: muted } },
            h('summary', { className: 'astr-focus', style: { cursor: 'pointer', fontWeight: 750, color: '#e2e8f0' } }, __alloT('stem.astronomy.cosmo_details_heading', 'Expansion rates, sources and equations')),
            h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.cosmo_rate_examples', 'Published expansion-rate inputs'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, margin: '8px 0' } },
              button('Planck 2018 · 67.4', function() { upd({ cosmoH0: 67.4 }); }, m.source === 'planck'),
              button('SH0ES 2022 · 73.04', function() { upd({ cosmoH0: 73.04 }); }, m.source === 'shoes'),
              button(__alloT('stem.astronomy.cosmo_reset', 'Reset distance lab'), function() { upd({ cosmoZ: 1, cosmoH0: 67.4, cosmoRedshiftReference: '' }); }, undefined)),
            h('label', { htmlFor: 'astronomy-cosmo-h0', style: { display: 'block', color: '#e2e8f0', fontWeight: 750 } }, __alloT('stem.astronomy.cosmo_h0_control', 'Expansion rate today (H₀)'), ': ' + zText(m.h0) + ' km/s/Mpc'),
            h('input', { id: 'astronomy-cosmo-h0', type: 'range', min: 50, max: 90, step: 0.01, value: m.h0, className: 'astr-focus',
              'aria-valuetext': zText(m.h0) + ' km/s/Mpc', 'aria-describedby': 'astronomy-cosmo-h0-help',
              onChange: function(event) { upd({ cosmoH0: Number(event.target.value) }); }, style: { width: '100%', minHeight: 44 } }),
            h('p', { id: 'astronomy-cosmo-h0-help' }, __alloT('stem.astronomy.cosmo_h0_help', 'A larger H₀ gives shorter inferred distances and ages at the same redshift when the matter fraction stays fixed. Each Mpc is about 3.26 million light-years; H₀ is an expansion rate, not a speed for every galaxy.')),
            h('p', null, __alloT('stem.astronomy.cosmo_measurement_scope', 'Planck Collaboration (2018 results, published 2020) infers H₀ = 67.4 ± 0.5 km/s/Mpc and Ωₘ = 0.315 ± 0.007 under base ΛCDM. Riess et al. (2022) measure H₀ = 73.04 ± 1.04 km/s/Mpc with the Cepheid–supernova distance ladder. These are named studies, not a live consensus estimate. Quoted uncertainties are not propagated into these curves.')),
            h('p', null, __alloT('stem.astronomy.cosmo_limits', 'The model assumes a homogeneous, spatially flat universe with matter and a constant Λ. It omits radiation, detailed neutrino evolution, peculiar velocities and gravitational redshifts. The range ends at z = 15; it does not model recombination, the CMB or inflation. Redshift alone does not give a model-independent distance.')),
            h('p', null, __alloT('stem.astronomy.cosmo_equations', 'a = 1/(1+z). E(z) = √[Ωₘ(1+z)³ + 1−Ωₘ]. Separation today: D = (c/H₀) ∫₀ᶻ dz′/E(z′). Separation then: D/(1+z), equal to angular-diameter distance in this flat model. Travel time: ∫₀ᶻ dz′/[(1+z′)H₀E(z′)]. The age uses the exact matter + Λ solution. Distances on the chart share one linear scale.')),
            link('https://arxiv.org/abs/1807.06209', 'Planck · 2018 parameters'),
            link('https://arxiv.org/abs/2112.04510', 'SH0ES · 2022 distance ladder'),
            link('https://arxiv.org/abs/astro-ph/9905116', __alloT('stem.astronomy.cosmo_hogg_link', 'Hogg · distance definitions')),
            m.redshiftReference ? link(m.redshiftReference.url, m.redshiftReference.name + ' · ' + __alloT('stem.astronomy.cosmo_redshift_paper', 'redshift measurement')) : null)
        );
      }

