
      function renderMagnitudeExplorer() {
        var m = magnitudeModel(d), bg = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#475569';
        var gold = '#fde68a', cyan = '#67e8f9', muted = '#cbd5e1', ghost = '#94a3b8';
        var panel = { padding: 12, border: '1px solid ' + border, borderRadius: 12, minWidth: 0, background: bg };
        var prose = { margin: '8px 0', fontSize: 13, lineHeight: 1.75, color: muted };
        var plot = { x: 66, y: 46, w: 264, h: 214 };
        function text(key, fallback) { return __alloT('stem.astronomy.mag_' + key, fallback); }
        function number(value) { return Number(value.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
        function signed(value) { return (value > 0 ? '+' : '') + number(value); }
        function ratio(value) { return value !== 0 && (value < 0.01 || value >= 10000) ? value.toExponential(2) + '×' : number(value) + '×'; }
        function refText(r, field) { return text(r.id + '_' + field, r[field]); }
        var name = m.reference ? refText(m.reference, 'name') : text('custom', 'Custom star');
        function button(label, action, on, key, disabled) {
          return h('button', { key: key, type: 'button', onClick: action, 'aria-pressed': key === 'brighten' || key === 'dim' || key === 'reset' ? undefined : on, disabled: !!disabled, className: 'astr-focus',
            style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.55 : 1, border: '2px solid ' + (on ? gold : border), background: on ? gold : bg, color: on ? '#020617' : '#f1f5f9' } }, label);
        }
        function chooseReference(r) {
          upd({ magnitudeReference: r.id, magnitudeDistancePc: r.distancePc, magnitudeAv: 0 });
        }
        function setDistance(value) {
          upd({ magnitudeDistancePc: Math.max(0.1, Math.min(10000, value)) });
        }
        function distanceKeys(e) {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          var next, step = e.shiftKey ? 0.25 : 0.05;
          if (e.key === 'Home') next = -1;
          else if (e.key === 'End') next = 4;
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = m.distanceLog + step;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = m.distanceLog - step;
          else return;
          e.preventDefault(); setDistance(Math.pow(10, Math.max(-1, Math.min(4, next))));
        }
        function magnitudeKeys(e) {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          var next, step = e.shiftKey ? 1 : 0.1;
          if (e.key === 'Home') next = -10;
          else if (e.key === 'End') next = 15;
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = m.absoluteV + step;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = m.absoluteV - step;
          else return;
          e.preventDefault(); upd({ magnitudeReference: 'custom', magnitudeMv: Math.max(-10, Math.min(15, next)) });
        }
        function scrub(e) {
          if (e.button != null && e.button !== 0) return;
          var rect = e.currentTarget.getBoundingClientRect(); if (!rect.width) return;
          var logPc = -1 + ((e.clientX - rect.left) * 360 / rect.width - plot.x) / plot.w * 5;
          setDistance(Math.pow(10, Math.max(-1, Math.min(4, logPc))));
          e.currentTarget.focus();
        }
        function px(logPc) { return plot.x + (logPc + 1) / 5 * plot.w; }
        function py(mag) { return plot.y + (mag + 20) / 55 * plot.h; }
        function fx(logFlux) { return 30 + (logFlux + 8) / 12 * 300; }
        function metric(key, label, value, display) {
          return h('div', { key: key, 'data-magnitude-metric': key, 'data-value': value, style: Object.assign({}, panel, { padding: 10 }) },
            h('div', { style: { fontSize: 12, color: muted, marginBottom: 5 } }, label),
            h('strong', { style: { fontSize: 17, color: gold, overflowWrap: 'anywhere' } }, display));
        }
        function fluxRow(key, title, value, logValue, color, y) {
          var x = fx(logValue);
          return h('g', { key: key, transform: 'translate(0 ' + y + ')', 'data-magnitude-flux-row': key, 'data-value': value, 'data-log-value': logValue },
            h('text', { x: 30, y: 22, fill: color, fontSize: 24, fontWeight: 700 }, title),
            h('line', { x1: 30, x2: 330, y1: 43, y2: 43, stroke: '#64748b', strokeWidth: 3 }),
            h('line', { x1: fx(0), x2: fx(0), y1: 34, y2: 52, stroke: cyan, strokeWidth: 2, strokeDasharray: '3 3' }),
            h('circle', { cx: x, cy: 43, r: 6, fill: color, stroke: bg, strokeWidth: 2, 'data-magnitude-flux-marker': key }),
            h('text', { x: 30, y: 79, fill: muted, fontSize: 22 }, ratio(value) + ' ' + text('reference_flux', 'reference flux')));
        }
        return h('div', { id: 'astronomy-magnitude-lab', style: { minWidth: 0, background: bg, padding: 12, borderRadius: 12, color: '#f1f5f9' } },
          h('p', { style: Object.assign({}, prose, { marginTop: 0 }) }, text('intro', 'How can a luminous star look faint? Change its distance and the dust in front of it. This explorer uses Johnson V magnitudes, a visual-light band. A smaller magnitude means more received light; a difference of 5 magnitudes means a factor of 100 in flux.')),
          h('div', { role: 'group', 'aria-label': text('reference_choices', 'Published brightness examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 } },
            m.references.map(function(r) { return button(refText(r, 'name'), function() { chooseReference(r); }, m.referenceId === r.id, r.id); }),
            button(text('custom', 'Custom star'), function() { upd({ magnitudeReference: 'custom', magnitudeMv: m.absoluteV }); }, m.referenceId === 'custom', 'custom')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 12 } },
            h('div', { style: panel },
              h('label', { htmlFor: 'astronomy-magnitude-mv', style: { color: gold, fontSize: 14, fontWeight: 700 } }, text('absolute_label', 'Absolute V magnitude M_V') + ': ' + signed(m.absoluteV)),
              h('input', { id: 'astronomy-magnitude-mv', type: 'range', min: -10, max: 15, step: 'any', value: m.absoluteV, className: 'astr-focus',
                'aria-valuetext': signed(m.absoluteV) + ' mag', 'aria-describedby': 'astronomy-magnitude-mv-help', onKeyDown: magnitudeKeys,
                onChange: function(e) { upd({ magnitudeReference: 'custom', magnitudeMv: Number(e.target.value) }); }, style: { width: '100%', minHeight: 44, accentColor: gold } }),
              h('p', { id: 'astronomy-magnitude-mv-help', style: prose }, text('absolute_help', 'M_V is the star’s magnitude at 10 pc with extinction removed. Editing it creates a custom star. Arrow keys change 0.1 mag; Shift changes 1 mag.')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
                button(text('brighter_five', 'Brighten by 5 mag'), function() { upd({ magnitudeReference: 'custom', magnitudeMv: m.absoluteV - 5 }); }, false, 'brighten', m.absoluteV < -5),
                button(text('fainter_five', 'Dim by 5 mag'), function() { upd({ magnitudeReference: 'custom', magnitudeMv: m.absoluteV + 5 }); }, false, 'dim', m.absoluteV > 10))),
            h('div', { style: panel },
              h('label', { htmlFor: 'astronomy-magnitude-distance', style: { color: gold, fontSize: 14, fontWeight: 700 } }, text('distance_label', 'Simulated distance') + ': ' + number(m.distancePc) + ' pc'),
              h('input', { id: 'astronomy-magnitude-distance', type: 'range', min: -1, max: 4, step: 'any', value: m.distanceLog, className: 'astr-focus',
                'aria-valuetext': number(m.distancePc) + ' pc', 'aria-describedby': 'astronomy-magnitude-distance-help', onKeyDown: distanceKeys,
                onChange: function(e) { setDistance(Math.pow(10, Number(e.target.value))); }, style: { width: '100%', minHeight: 44, accentColor: gold } }),
              h('p', { id: 'astronomy-magnitude-distance-help', style: prose }, number(m.distanceLy) + ' ' + text('light_years', 'light-years') + '. ' + text('distance_help', 'This control uses a logarithmic distance scale: equal movements multiply the distance. A distance of 10 pc is the standard for absolute magnitude.')),
              h('div', { role: 'group', 'aria-label': text('distance_examples', 'Distance examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
                [1, 10, 100, 1000].map(function(pc) { return button(pc + ' pc', function() { setDistance(pc); }, Math.abs(m.distancePc - pc) < 1e-9, pc); }))),
            h('div', { style: panel },
              h('label', { htmlFor: 'astronomy-magnitude-av', style: { color: gold, fontSize: 14, fontWeight: 700 } }, text('dust_label', 'Dust dimming A_V') + ': ' + number(m.extinctionV) + ' mag'),
              h('input', { id: 'astronomy-magnitude-av', type: 'range', min: 0, max: 5, step: 0.1, value: m.extinctionV, className: 'astr-focus',
                'aria-valuetext': number(m.extinctionV) + ' mag', 'aria-describedby': 'astronomy-magnitude-av-help',
                onChange: function(e) { upd({ magnitudeAv: Number(e.target.value) }); }, style: { width: '100%', minHeight: 44, accentColor: gold } }),
              h('p', { id: 'astronomy-magnitude-av-help', style: prose }, text('dust_help', 'A_V is foreground extinction in the V band. Adding 1 mag transmits about 40% of the original V-band light. This assumption can be changed independently of distance.')),
              h('div', { role: 'group', 'aria-label': text('dust_examples', 'Dust examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
                [0, 1, 3].map(function(av) { return button('A_V = ' + av, function() { upd({ magnitudeAv: av }); }, m.extinctionV === av, av); })))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 8, margin: '12px 0' } },
            metric('apparentV', text('apparent_label', 'Apparent V magnitude m_V'), m.apparentV, signed(m.apparentV) + ' mag'),
            metric('distanceModulus', text('distance_change', 'Change caused by distance'), m.distanceModulus, signed(m.distanceModulus) + ' mag'),
            metric('transmission', text('transmission_label', 'V light transmitted through dust'), m.transmission, number(m.transmission * 100) + '%'),
            metric('vLightVsSun', text('intrinsic_ratio', 'Intrinsic V-band light vs Sun'), m.vLightVsSun, ratio(m.vLightVsSun))),
          h('p', { id: 'astronomy-magnitude-status', role: 'status', 'aria-live': 'polite', 'data-regime': m.regime, style: Object.assign({}, prose, { padding: 10, borderLeft: '3px solid ' + gold }) },
            name + ': ' + (m.regime === 'equal' ? text('equal', 'the received V-band flux equals the same star’s flux at 10 pc without dust.') :
              m.regime === 'brighter' ? ratio(m.fluxRatio) + ' ' + text('brighter_status', 'the flux of the same star at 10 pc without dust.') :
              ratio(m.fluxRatio) + ' ' + text('fainter_status', 'the flux of the same star at 10 pc without dust.'))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 12, alignItems: 'start' } },
            h('figure', { style: Object.assign({}, panel, { margin: 0, padding: 8 }) },
              h('h3', { style: { margin: '4px 2px 8px', fontSize: 15, color: gold } }, text('curve_title', 'Apparent magnitude and distance')),
              h('svg', { id: 'astronomy-magnitude-curve', viewBox: '0 0 360 380', role: 'slider', tabIndex: 0, className: 'astr-focus',
                'aria-label': text('curve_control', 'Choose a simulated stellar distance'), 'aria-valuemin': 0.1, 'aria-valuemax': 10000, 'aria-valuenow': m.distancePc,
                'aria-valuetext': number(m.distancePc) + ' pc; m_V ' + signed(m.apparentV), 'aria-describedby': 'astronomy-magnitude-curve-desc',
                onPointerDown: scrub, onKeyDown: distanceKeys, 'data-distance-pc': m.distancePc, style: { width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y', cursor: 'crosshair' } },
                h('title', null, text('curve_title', 'Apparent magnitude and distance')),
                h('desc', { id: 'astronomy-magnitude-curve-desc' }, text('curve_desc', 'Magnitude becomes larger and fainter downward. Distance increases to the right on a logarithmic scale. The dashed line excludes dust, and the yellow line includes the selected extinction. Tap or use arrows to change distance; Shift makes a larger step. Home and End select the distance limits.')),
                [-20, 0, 20, 35].map(function(value) {
                  var y = py(value);
                  return h('g', { key: value }, h('line', { x1: plot.x, x2: plot.x + plot.w, y1: y, y2: y, stroke: '#334155' }),
                    h('text', { x: plot.x - 10, y: y + 7, textAnchor: 'end', fill: muted, fontSize: 22 }, String(value)));
                }),
                [-1, 0, 1, 2, 3, 4].map(function(logPc, i) {
                  var x = px(logPc);
                  return h('g', { key: logPc }, h('line', { x1: x, x2: x, y1: plot.y, y2: plot.y + plot.h, stroke: '#334155' }),
                    h('text', { x: x, y: 312, textAnchor: 'middle', fill: muted, fontSize: 22 }, ['0.1', '1', '10', '100', '1k', '10k'][i]));
                }),
                h('text', { x: 198, y: 32, textAnchor: 'middle', fill: muted, fontSize: 22 }, 'm_V'),
                h('text', { x: 198, y: 361, textAnchor: 'middle', fill: muted, fontSize: 22 }, text('distance_axis', 'Distance in parsecs')),
                h('polyline', { points: m.points.map(function(p) { return px(p.distanceLog) + ',' + py(p.unextinguishedV); }).join(' '),
                  fill: 'none', stroke: ghost, strokeWidth: 3, strokeDasharray: '7 5', 'data-magnitude-path': 'unextinguished' }),
                h('polyline', { points: m.points.map(function(p) { return px(p.distanceLog) + ',' + py(p.apparentV); }).join(' '),
                  fill: 'none', stroke: gold, strokeWidth: 3, 'data-magnitude-path': 'apparent' }),
                h('line', { x1: px(m.distanceLog), x2: px(m.distanceLog), y1: plot.y, y2: plot.y + plot.h, stroke: gold, strokeWidth: 1.5 }),
                h('circle', { cx: px(1), cy: py(m.absoluteV), r: 5, fill: bg, stroke: cyan, strokeWidth: 2, 'data-magnitude-standard': '10pc' }),
                h('circle', { cx: px(m.distanceLog), cy: py(m.unextinguishedV), r: 5, fill: bg, stroke: ghost, strokeWidth: 2 }),
                h('circle', { cx: px(m.distanceLog), cy: py(m.apparentV), r: 6, fill: gold, stroke: bg, strokeWidth: 2, 'data-magnitude-selected': 'apparent', 'data-value': m.apparentV })),
              h('figcaption', { style: Object.assign({}, prose, { padding: '0 2px' }) }, text('curve_caption', 'Yellow: with selected dust. Gray dashed: without dust. Cyan ring: the same star at 10 pc without dust. Smaller magnitudes appear at the top. Tap the plot to choose a distance.'), m.extinctionV === 0 ? ' ' + text('curves_overlap', 'At zero extinction, the two curves overlap.') : null)),
            h('figure', { style: Object.assign({}, panel, { margin: 0, padding: 8 }) },
              h('h3', { style: { margin: '4px 2px 8px', fontSize: 15, color: gold } }, text('flux_title', 'Received light on a logarithmic scale')),
              h('svg', { id: 'astronomy-magnitude-flux', viewBox: '0 0 360 380', role: 'img', 'aria-labelledby': 'astronomy-mag-flux-title astronomy-mag-flux-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                h('title', { id: 'astronomy-mag-flux-title' }, text('flux_title', 'Received light on a logarithmic scale')),
                h('desc', { id: 'astronomy-mag-flux-desc' }, text('flux_desc', 'Both tracks use the same logarithmic flux scale, from ten to the minus eighth through ten to the fourth. The reference is this star at 10 pc without dust. The cyan line is a flux ratio of one. Dust moves the received-light marker toward the fainter side.')),
                h('text', { x: 30, y: 25, fill: muted, fontSize: 24 }, text('fainter', 'Fainter')),
                h('text', { x: 330, y: 25, textAnchor: 'end', fill: muted, fontSize: 24 }, text('brighter', 'Brighter')),
                [-8, -4, 0, 4].map(function(logFlux) {
                  return h('text', { key: logFlux, x: fx(logFlux), y: 80, textAnchor: 'middle', fill: muted, fontSize: 22 },
                    h('tspan', null, '10'), h('tspan', { baselineShift: 'super', fontSize: 20 }, String(logFlux)));
                }),
                fluxRow('distance', text('distance_only', 'Distance only'), m.distanceFlux, m.distanceFluxLog, ghost, 125),
                fluxRow('received', text('distance_dust', 'Distance and dust'), m.fluxRatio, m.fluxLog, gold, 229),
                h('text', { x: 180, y: 361, textAnchor: 'middle', fill: cyan, fontSize: 22 }, text('unity', 'Cyan = reference flux (1×)'))),
              h('figcaption', { style: Object.assign({}, prose, { padding: '0 2px' }) }, text('flux_caption', 'The reference is this same star at 10 pc without dust. Multiplying distance by 10 reduces flux by 100. Dust further reduces the light reaching the observer.')))),
          h('div', { style: Object.assign({}, panel, { marginTop: 12 }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: cyan } }, text('calculation_title', 'How the numbers connect')),
            h('p', { style: Object.assign({}, prose, { fontFamily: 'ui-monospace, monospace', color: '#f1f5f9' }) }, 'm_V = M_V + 5 log₁₀(d / 10 pc) + A_V'),
            h('p', { 'data-magnitude-equation': 'sum', style: prose }, signed(m.absoluteV) + ' + (' + signed(m.distanceModulus) + ') + ' + number(m.extinctionV) + ' = ' + signed(m.apparentV) + ' mag'),
            h('p', { style: prose }, text('flux_equation', 'F / F₁₀ = (10 pc / d)² × 10^(−0.4 A_V). F₁₀ is this star’s received V-band flux at 10 pc with no dust.')),
            button(text('reset', 'Reset brightness explorer'), function() { upd({ magnitudeReference: 'sun', magnitudeMv: 4.81, magnitudeDistancePc: 10, magnitudeAv: 0 }); }, false, 'reset')),
          h('details', { style: Object.assign({}, panel, { marginTop: 12 }) },
            h('summary', { className: 'astr-focus', style: { minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', color: cyan, fontSize: 14, fontWeight: 700 } }, text('sources', 'Published inputs and model limits')),
            h('p', { style: prose }, m.reference ? refText(m.reference, 'basis') : text('custom_basis', 'Custom M_V is a teaching input. The selected distance and dust define the simulated apparent magnitude.')),
            m.reference ? h('a', { href: m.reference.href, target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, color: cyan, fontSize: 13 } }, refText(m.reference, 'source')) : null,
            h('table', { id: 'astronomy-magnitude-catalog', style: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 12, marginTop: 10 } },
              h('caption', { style: { textAlign: 'left', marginBottom: 8, fontSize: 13, lineHeight: 1.7, color: muted } }, text('catalog_caption', 'ESA 1997 Hipparcos examples: measured Johnson V and parallax. Distances use d(pc) = 1000 / parallax(mas).')),
              h('thead', null, h('tr', null, [text('star', 'Star'), text('v_mag', 'V mag'), text('parallax', 'Parallax'), text('distance', 'Distance')].map(function(label, i) {
                return h('th', { key: i, scope: 'col', style: { width: ['19%', '21%', '28%', '32%'][i], padding: '6px 2px', textAlign: 'left', color: muted, borderBottom: '1px solid ' + border, overflowWrap: 'anywhere' } }, label);
              }))),
              h('tbody', null, m.references.filter(function(r) { return r.hip; }).map(function(r) {
                return h('tr', { key: r.id, 'data-magnitude-hip': r.hip },
                  h('th', { scope: 'row', style: { padding: '8px 2px', textAlign: 'left', color: '#f1f5f9', overflowWrap: 'anywhere' } }, refText(r, 'name')),
                  h('td', { style: { padding: '8px 2px', color: gold } }, signed(r.apparentV)),
                  h('td', { style: { padding: '8px 2px', color: '#f1f5f9', overflowWrap: 'anywhere' } }, number(r.parallaxMas), h('br'), '± ' + number(r.parallaxErrorMas) + ' mas'),
                  h('td', { style: { padding: '8px 2px', color: '#f1f5f9' } }, number(r.distancePc) + ' pc'));
              }))),
            h('p', { style: prose }, text('band_limit', 'V-band light compares light through the same visual filter. Total energy across all wavelengths requires a bolometric correction. V-band ratios here use the adopted solar M_V = +4.81.')),
            h('p', { style: prose }, text('model_limit', 'The model treats each example as a steady point source in nearby space, with an independently chosen foreground extinction. Catalog parallax errors are displayed; measurement and calibration uncertainty are not propagated into the curves. Visibility also depends on sky brightness, atmosphere, color and instrument settings.')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              h('a', { href: 'https://arxiv.org/abs/1804.07788', target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, color: cyan, fontSize: 13 } }, text('solar_source', 'Willmer 2018 · Solar magnitude reference')),
              h('a', { href: 'https://astro.unl.edu/naap/distance/distance_modulus.html', target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, color: cyan, fontSize: 13 } }, text('modulus_source', 'UNL · Distance modulus')),
              h('a', { href: 'https://astro.wku.edu/labs/m100/mags.html', target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, color: cyan, fontSize: 13 } }, text('extinction_source', 'WKU · Magnitudes and extinction')))));
      }

