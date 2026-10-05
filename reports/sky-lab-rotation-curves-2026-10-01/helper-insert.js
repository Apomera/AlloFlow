
      function renderGalaxyRotation() {
        var m = galaxyRotationModel(d), p = m.selected, bg = astronomyContrast ? '#000' : '#091323';
        var border = astronomyContrast ? '#fbbf24' : '#475569', muted = '#cbd5e1', gold = '#fde68a', cyan = '#67e8f9';
        var panel = { padding: 10, border: '1px solid ' + border, borderRadius: 12, background: bg, minWidth: 0 };
        var plot = { x: 70, y: 44, w: 264, h: 214 };
        function number(value) { return value === null ? '—' : Number(value.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
        function selectPoint(index) { upd({ rotationPoint: Math.max(0, Math.min(m.points.length - 1, Math.round(index))) }); }
        function keys(event) {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          var next, step = event.shiftKey ? 5 : 1;
          if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = m.points.length - 1;
          else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = m.index + step;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = m.index - step;
          else return;
          event.preventDefault(); selectPoint(next);
        }
        function scrub(event) {
          var box = event.currentTarget.getBoundingClientRect(); if (!box.width) return;
          var radius = ((event.clientX - box.left) * 360 / box.width - plot.x) / plot.w * m.radiusMaxKpc;
          var nearest = m.points.reduce(function(best, q) { return Math.abs(q.radiusKpc - radius) < Math.abs(best.radiusKpc - radius) ? q : best; }, m.points[0]);
          selectPoint(nearest.index);
        }
        function button(text, action, active, key) {
          return h('button', { key: key, type: 'button', className: 'astr-focus', 'aria-pressed': active, onClick: action,
            style: { minHeight: 44, padding: '9px 11px', fontSize: 13, color: active ? gold : '#e2e8f0', background: active ? '#422006' : bg,
              border: '1px solid ' + (active ? gold : border), borderRadius: 8, cursor: 'pointer' } }, text);
        }
        function point(q, value, difference) {
          return { x: plot.x + q.radiusKpc / m.radiusMaxKpc * plot.w,
            y: plot.y + ((difference ? 150 : 200) - value) / (difference ? 300 : 250) * plot.h };
        }
        function graph(difference) {
          var id = difference ? 'astronomy-rotation-difference' : 'astronomy-rotation-chart';
          var attrs = { id: id, viewBox: '0 0 360 330', role: difference ? 'img' : 'slider',
            'data-galaxy': m.galaxy, 'data-index': m.index, 'data-ml': m.ml,
            'aria-describedby': difference ? 'astronomy-rotation-difference-caption' : 'astronomy-rotation-help astronomy-rotation-chart-caption',
            style: { width: '100%', display: 'block', touchAction: 'pan-y', cursor: difference ? 'default' : 'crosshair' } };
          if (difference) attrs['aria-labelledby'] = id + '-title';
          else Object.assign(attrs, { tabIndex: 0, className: 'astr-focus',
            'aria-label': __alloT('stem.astronomy.rot_chart_control', 'Select a measured galaxy radius'), 'aria-valuemin': 0,
            'aria-valuemax': m.points.length - 1, 'aria-valuenow': m.index, 'aria-valuetext': number(p.radiusKpc) + ' kpc · ' + number(p.observedKms) + ' km/s',
            onKeyDown: keys, onPointerDown: function(event) { if (event.button !== 0) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); scrub(event); },
            onPointerMove: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event); },
            onPointerUp: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
            onPointerCancel: function(event) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } });
          var cursor = point(p, 0, difference);
          var line = m.points.filter(function(q) { return q.baryonKms !== null; }).map(function(q) { var r = point(q, q.baryonKms, false); return r.x.toFixed(3) + ',' + r.y.toFixed(3); }).join(' ');
          return h('svg', attrs,
            h('title', { id: id + '-title' }, difference ? __alloT('stem.astronomy.rot_difference_title', 'Observed speed minus the stars and gas model, with quoted measurement errors') : __alloT('stem.astronomy.rot_chart_title', 'SPARC measured rotation speeds with error bars and an adjustable stars and gas model')),
            h('text', { x: plot.x, y: 30, fill: muted }, difference ? __alloT('stem.astronomy.rot_delta_axis', 'Difference (km/s)') : __alloT('stem.astronomy.rot_speed_axis', 'Speed (km/s)')),
            (difference ? [-100, 0, 100] : [-50, 0, 100, 200]).map(function(value) {
              var y = point(p, value, difference).y; return h('g', { key: value },
                h('line', { x1: plot.x, x2: plot.x + plot.w, y1: y, y2: y, stroke: value === 0 ? cyan : border, strokeDasharray: value === 0 ? '3 5' : '2 5' }),
                h('text', { x: plot.x - 10, y: y + 7, textAnchor: 'end', fill: value === 0 ? cyan : muted }, value));
            }),
            h('line', { x1: cursor.x, x2: cursor.x, y1: plot.y, y2: plot.y + plot.h, stroke: cyan, strokeDasharray: '5 5', strokeWidth: 1.5 }),
            difference ? null : h('polyline', { 'data-rotation-model': true, points: line, fill: 'none', stroke: gold, strokeWidth: 2.5, strokeDasharray: '8 5' }),
            m.points.map(function(q) {
              var value = difference ? q.differenceKms : q.observedKms; if (value === null) return null;
              var r = point(q, value, difference), low = point(q, value - q.errorKms, difference), high = point(q, value + q.errorKms, difference), selected = q.index === m.index;
              return h('g', { key: q.index, 'data-rotation-sample': q.index, 'data-radius': q.radiusKpc, 'data-value': value, 'data-error': q.errorKms },
                h('line', { x1: r.x, x2: r.x, y1: low.y, y2: high.y, stroke: selected ? cyan : '#cbd5e1', strokeWidth: selected ? 2 : 1, strokeOpacity: selected ? 1 : 0.7 }),
                h('line', { x1: r.x - 2.5, x2: r.x + 2.5, y1: low.y, y2: low.y, stroke: selected ? cyan : muted }),
                h('line', { x1: r.x - 2.5, x2: r.x + 2.5, y1: high.y, y2: high.y, stroke: selected ? cyan : muted }),
                h('circle', { cx: r.x, cy: r.y, r: selected ? 5 : 2.5, fill: selected ? cyan : '#f8fafc', stroke: bg, strokeWidth: 1 }));
            }),
            difference || p.baryonKms === null ? null : h('circle', { 'data-rotation-model-dot': true, 'data-value': p.baryonKms, cx: cursor.x, cy: point(p, p.baryonKms, false).y, r: 5, fill: gold, stroke: bg, strokeWidth: 1.5 }),
            [0, m.radiusMaxKpc / 2, m.radiusMaxKpc].map(function(radius) { return h('text', { key: radius, x: plot.x + radius / m.radiusMaxKpc * plot.w, y: 294,
              textAnchor: radius === 0 ? 'start' : radius === m.radiusMaxKpc ? 'end' : 'middle', fill: muted }, radius); }),
            h('text', { x: 180, y: 324, textAnchor: 'middle', fill: muted }, __alloT('stem.astronomy.rot_radius_axis', 'Radius (kpc)')));
        }
        function metric(key, label, value, text) {
          return h('div', { style: panel }, h('dt', { style: { color: muted, fontSize: 12, lineHeight: 1.6, marginBottom: 5 } }, label),
            h('dd', { 'data-rotation-metric': key, 'data-value': value, style: { margin: 0, color: '#f8fafc', fontSize: 17, fontWeight: 750, overflowWrap: 'anywhere' } }, text));
        }
        function link(url, text) { return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus',
          style: { minHeight: 44, display: 'inline-flex', alignItems: 'center', color: '#7dd3fc', marginRight: 14 } }, text); }
        var status = { above: __alloT('stem.astronomy.rot_above', 'Observed speed is above the stars and gas model'),
          below: __alloT('stem.astronomy.rot_below', 'The stars and gas model is above the observed speed'),
          overlap: __alloT('stem.astronomy.rot_overlap', 'The model lies within the quoted speed error bar'),
          undefined: __alloT('stem.astronomy.rot_undefined', 'This mass choice gives no circular-speed solution') }[m.regime];
        return h('section', { id: 'astronomy-rotation-lab', 'aria-labelledby': 'astronomy-rotation-heading',
          style: { marginBottom: 14, padding: 12, border: '1px solid ' + border, borderRadius: 14, background: bg, minWidth: 0 } },
          h('style', null, '#astronomy-rotation-lab svg text{font-size:20px}#astronomy-rotation-lab summary{min-height:44px;align-content:center}@media(max-width:600px){#astronomy-rotation-lab svg text{font-size:24px}}'),
          h('h3', { id: 'astronomy-rotation-heading', style: { margin: '0 0 7px', fontSize: 18, color: '#a5f3fc' } }, __alloT('stem.astronomy.rot_heading', 'Galaxy rotation: measurements and mass')),
          h('p', { style: { margin: '0 0 12px', color: muted, fontSize: 13, lineHeight: 1.7 } }, __alloT('stem.astronomy.rot_intro', 'Compare published SPARC speeds with the Newtonian contribution from stars and gas. Choose a galaxy, change the assumed stellar mass per unit light, and inspect a measured radius. The observations stay fixed.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.rot_examples', 'Published galaxy examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 } },
            m.examples.map(function(g) { return button(g.name, function() { upd({ rotationGalaxy: g.id, rotationPoint: g.count - 1 }); }, m.galaxy === g.id, g.id); })),
          h('p', { id: 'astronomy-rotation-provenance', style: { margin: '0 0 12px', color: muted, fontSize: 12, lineHeight: 1.7 } }, m.name + ' · ' + m.points.length + ' ' + __alloT('stem.astronomy.rot_published_points', 'published radial samples') + ' · ' + __alloT('stem.astronomy.rot_distance', 'adopted distance') + ' ' + number(m.distanceMpc) + ' ± ' + number(m.distanceErrorMpc) + ' Mpc · ' + __alloT('stem.astronomy.rot_inclination', 'inclination') + ' ' + m.inclinationDeg + '° ± ' + m.inclinationErrorDeg + '°'),
          h('label', { htmlFor: 'astronomy-rotation-ml', style: { display: 'block', color: '#e2e8f0', fontSize: 14, fontWeight: 750 } }, __alloT('stem.astronomy.rot_ml_control', 'Stellar mass-to-light ratio at 3.6 μm'), ': ' + number(m.ml) + ' M☉/L☉'),
          h('input', { id: 'astronomy-rotation-ml', type: 'range', min: 0.1, max: 1, step: 0.05, value: m.ml, className: 'astr-focus',
            'aria-valuetext': number(m.ml) + ' M☉/L☉', 'aria-describedby': 'astronomy-rotation-ml-help', onChange: function(event) { upd({ rotationML: Number(event.target.value) }); }, style: { width: '100%', minHeight: 44 } }),
          h('p', { id: 'astronomy-rotation-ml-help', style: { margin: '0 0 10px', color: muted, fontSize: 12, lineHeight: 1.7 } }, __alloT('stem.astronomy.rot_ml_help', 'Higher M/L assigns more stellar mass to the same light. Stellar speed contributions scale with √(M/L). The 0.5 example follows a reference choice in SPARC; this control explores an assumption.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.rot_ml_examples', 'Stellar mass assumptions'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 } },
            [0.2, 0.5, 1].map(function(ml) { return button('M/L = ' + ml, function() { upd({ rotationML: ml }); }, m.ml === ml, ml); }),
            button(__alloT('stem.astronomy.rot_reset', 'Reset rotation explorer'), function() { upd({ rotationGalaxy: 'NGC3198', rotationML: 0.5, rotationPoint: 42 }); })),
          h('label', { htmlFor: 'astronomy-rotation-point', style: { display: 'block', color: '#e2e8f0', fontSize: 14, fontWeight: 750 } }, __alloT('stem.astronomy.rot_radius_control', 'Inspect a measured radius'), ': ' + number(p.radiusKpc) + ' kpc'),
          h('input', { id: 'astronomy-rotation-point', type: 'range', min: 0, max: m.points.length - 1, step: 1, value: m.index, className: 'astr-focus',
            'aria-valuetext': number(p.radiusKpc) + ' kpc', 'aria-describedby': 'astronomy-rotation-help', onChange: function(event) { selectPoint(Number(event.target.value)); }, onKeyDown: keys, style: { width: '100%', minHeight: 44 } }),
          h('p', { id: 'astronomy-rotation-help', style: { margin: '0 0 12px', color: muted, fontSize: 12, lineHeight: 1.7 } }, __alloT('stem.astronomy.rot_radius_help', 'Drag the radius slider or speed chart. Selection snaps to a published sample. Arrow keys move one sample; Shift moves five. Home selects the innermost sample and End selects the outermost. One kiloparsec (kpc) is about 3,260 light-years.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14, alignItems: 'start' } },
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) }, h('h4', { style: { margin: '0 0 8px', color: '#a5f3fc', fontSize: 14 } }, __alloT('stem.astronomy.rot_chart_heading', '1. Compare speeds')), graph(false),
              h('figcaption', { id: 'astronomy-rotation-chart-caption', style: { fontSize: 12, color: muted, lineHeight: 1.7 } },
                h('ul', { style: { margin: 0, paddingLeft: 18 } },
                  h('li', null, __alloT('stem.astronomy.rot_observed_key', 'White points and bars: published speeds and quoted errors.')),
                  h('li', { style: { color: gold } }, __alloT('stem.astronomy.rot_model_key', 'Gold dashed: stars and gas model at this M/L.')),
                  h('li', { style: { color: cyan } }, __alloT('stem.astronomy.rot_selection_key', 'Cyan: selected radial sample.'))),
                __alloT('stem.astronomy.rot_chart_caption', 'Both examples use the same speed scale. Straight model segments join the tabulated radii. The curve contains no fitted dark halo.'))),
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) }, h('h4', { style: { margin: '0 0 8px', color: '#a5f3fc', fontSize: 14 } }, __alloT('stem.astronomy.rot_difference_heading', '2. Inspect the difference')), graph(true),
              h('figcaption', { id: 'astronomy-rotation-difference-caption', style: { fontSize: 12, color: muted, lineHeight: 1.7 } }, __alloT('stem.astronomy.rot_difference_caption', 'Difference = observed speed − stars and gas speed. Zero means equal speeds. Positive values put the observed speed above the model; negative values retain an overprediction. Bars carry the quoted speed errors only. Model uncertainty is not included.')))),
          h('dl', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,185px),1fr))', gap: 8, margin: '12px 0' } },
            metric('radiusKpc', __alloT('stem.astronomy.rot_radius_metric', 'Selected radius'), p.radiusKpc, number(p.radiusKpc) + ' kpc'),
            metric('observedKms', __alloT('stem.astronomy.rot_observed_metric', 'Published speed and error'), p.observedKms, number(p.observedKms) + ' ± ' + number(p.errorKms) + ' km/s'),
            metric('baryonKms', __alloT('stem.astronomy.rot_model_metric', 'Stars and gas speed'), p.baryonKms, number(p.baryonKms) + ' km/s'),
            metric('differenceKms', __alloT('stem.astronomy.rot_difference_metric', 'Observed − model'), p.differenceKms, number(p.differenceKms) + ' km/s')),
          h('div', { id: 'astronomy-rotation-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-regime': m.regime,
            style: Object.assign({}, panel, { color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 }) },
            h('strong', { style: { display: 'block', color: cyan, marginBottom: 5 } }, status),
            __alloT('stem.astronomy.rot_status_scope', 'This comparison uses the listed random error at one radius. It is not a statistical fit or a dark-matter detection. Interpreting a gap needs assumptions about gravity, distance, inclination and the stellar population.')),
          h('details', { style: { fontSize: 13, color: muted, lineHeight: 1.7 } },
            h('summary', { className: 'astr-focus', style: { cursor: 'pointer', color: '#e2e8f0', fontWeight: 750 } }, __alloT('stem.astronomy.rot_data_heading', 'Measurements, sources and model limits')),
            h('p', null, __alloT('stem.astronomy.rot_data_source', 'SPARC (Lelli, McGaugh & Schombert, 2016), Tables 1 and 2. NGC 3198 and NGC 6503 are shown at the published distances and inclinations. The quoted speed errors describe random non-circular motions and kinematic asymmetries; they exclude inclination systematics.')),
            h('p', null, __alloT('stem.astronomy.rot_equation', 'The Newtonian model adds squared speed contributions: v² = Vgas|Vgas| + (M/L)Vdisk|Vdisk| + (M/L)Vbulge|Vbulge|. SPARC tabulates stellar terms at M/L = 1. These two examples have zero bulge terms. The signed gas term preserves an outward force from central gas depressions.')),
            h('p', null, __alloT('stem.astronomy.rot_model_limits', 'Gas terms include the catalog’s factor 1.33 for helium. The model keeps gas, light profiles, adopted distance and inclination fixed. It does not fit a halo, compute a joint likelihood, infer a particle type or model modified gravity. The numerical data are bundled for offline use.')),
            h('p', null, __alloT('stem.astronomy.rot_original_sources', 'Original rotation-curve references listed by SPARC: NGC 3198 — Daigle et al. (2006), Begeman et al. (1991), Begeman (1987); NGC 6503 — Begeman et al. (1991), Begeman (1987).')),
            link('https://astroweb.cwru.edu/SPARC/', __alloT('stem.astronomy.rot_catalog_link', 'SPARC catalog and source references')),
            link('https://arxiv.org/abs/1606.09251', __alloT('stem.astronomy.rot_paper_link', 'SPARC 2016 · mass model equations')),
            link('https://astroweb.cwru.edu/SPARC/MassModels_Lelli2016c.mrt', __alloT('stem.astronomy.rot_table_link', 'Published rotation and mass-model table')))
        );
      }

