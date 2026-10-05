      function renderBinaryOrbit() {
        var m = binaryOrbitModel(d), bg = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#475569';
        var cyan = '#67e8f9', gold = '#fde68a', green = '#86efac', muted = '#cbd5e1';
        var panel = { padding: 12, border: '1px solid ' + border, borderRadius: 12, background: bg, minWidth: 0 };
        var prose = { margin: '8px 0', fontSize: 13, lineHeight: 1.75, color: muted };
        function text(key, fallback) { return __alloT('stem.astronomy.binary_' + key, fallback); }
        function n(v, digits) { return v.toLocaleString('en-US', { maximumFractionDigits: digits == null ? 2 : digits }); }
        function phase(value) { upd({ binaryPhase: Math.max(0, Math.min(1, value)) }); }
        function button(label, action, on, key) {
          return h('button', { key: key, type: 'button', className: 'astr-focus', onClick: action, 'aria-pressed': typeof on === 'boolean' ? on : undefined,
            style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '2px solid ' + (on ? gold : border), background: on ? gold : bg, color: on ? '#020617' : '#f1f5f9' } }, label);
        }
        function sirius() { upd({ binaryMassA: m.reference.massA, binaryMassB: m.reference.massB, binarySeparationAu: m.siriusSeparationAu, binaryEccentricity: m.reference.eccentricity, binaryPhase: 0 }); }
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
        var timeControl = { value: m.phase, min: 0, max: 1, step: 0.01, change: phase };
        function scrub(e) {
          var rect = e.currentTarget.getBoundingClientRect(); if (!rect.width) return;
          phase(((e.clientX - rect.left) / rect.width * 360 - 56) / 276);
        }
        var controls = [
          { id: 'mass-a', label: text('mass_a', 'Star A mass'), value: m.massA, min: 0.1, max: 5, step: 0.1, unit: text('solar_masses', 'solar masses'), key: 'binaryMassA' },
          { id: 'mass-b', label: text('mass_b', 'Star B mass'), value: m.massB, min: 0.1, max: 5, step: 0.1, unit: text('solar_masses', 'solar masses'), key: 'binaryMassB' },
          { id: 'separation', label: text('separation', 'Relative orbit semimajor axis'), value: m.separationAu, min: 0.5, max: 40, step: 0.5, unit: 'AU', key: 'binarySeparationAu' },
          { id: 'eccentricity', label: text('eccentricity', 'Orbital eccentricity'), value: m.eccentricity, min: 0, max: 0.8, step: 0.01, unit: '', key: 'binaryEccentricity' },
          Object.assign({}, timeControl, { id: 'time', label: text('time', 'Elapsed fraction of one orbit'), unit: '', readout: n(m.phase * 100, 1) + '% · ' + n(m.elapsedYears) + ' ' + text('years', 'years') })
        ];
        controls.forEach(function(c) { if (!c.change) c.change = function(v) { var patch = {}; patch[c.key] = v; upd(patch); }; });
        var scale = 118 / m.plotRadiusAu;
        function xy(p) { return { x: 180 + p.x * scale, y: 170 - p.y * scale }; }
        function chartX(f) { return 56 + 276 * f; }
        function chartY(v) { return 262 - v / 3.2 * 210; }
        var A = xy(m.current.a), B = xy(m.current.b), barAu = Math.pow(10, Math.floor(Math.log10(65 / scale)));
        var balance = Math.abs(m.massA - m.massB) < 1e-10 ? text('equal_status', 'Equal masses: both stars trace equally sized paths around the shared center of mass.')
          : (m.massA > m.massB ? text('a_status', 'Star A is heavier: it traces the smaller path and moves more slowly than B at every time.') : text('b_status', 'Star B is heavier: it traces the smaller path and moves more slowly than A at every time.'));
        var metrics = [
          ['periodYears', text('period', 'One orbit'), m.periodYears, text('years', 'years')],
          ['separationAu', text('current_separation', 'Current star separation'), m.current.separationAu, 'AU'],
          ['relativeSpeedKmS', text('speed', 'Relative orbital speed'), m.current.relativeSpeedKmS, 'km/s'],
          ['fastestToSlowest', text('speed_ratio', 'Fastest / slowest speed'), m.fastestToSlowest, '×']
        ];
        return h('section', { id: 'astronomy-binary-orbit-lab', 'aria-labelledby': 'astronomy-binary-title', style: Object.assign({}, panel, { margin: '16px 0', color: '#f1f5f9' }) },
          h('h3', { id: 'astronomy-binary-title', style: { margin: 0, fontSize: 18, color: gold } }, text('title', 'Binary stars: weigh a system with its orbit')),
          h('p', { style: prose }, text('intro', 'Explore two stars orbiting a shared center of mass. Change their masses, orbit size or shape, then select a time to connect the orbital positions with the speed curve.')),
          h('div', { role: 'group', 'aria-label': text('examples', 'Binary orbit examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            button(text('sirius', 'Sirius A + B reference'), sirius, m.isSirius, 'sirius'),
            button(text('equal_example', 'Equal masses, circular orbit'), function() { upd({ binaryMassA: 1, binaryMassB: 1, binarySeparationAu: 10, binaryEccentricity: 0, binaryPhase: 0 }); }, m.massA === 1 && m.massB === 1 && m.separationAu === 10 && m.eccentricity === 0, 'equal'),
            button(text('eccentric_example', 'Equal masses, eccentric orbit'), function() { upd({ binaryMassA: 1, binaryMassB: 1, binarySeparationAu: 10, binaryEccentricity: 0.6, binaryPhase: 0 }); }, m.massA === 1 && m.massB === 1 && m.separationAu === 10 && m.eccentricity === 0.6, 'eccentric')),
          h('p', { 'data-binary-reference': m.isSirius, style: prose }, m.isSirius ? text('reference_status', 'Sirius reference inputs from Bond et al. (2017). Orbit size is derived from the measured period and masses.') : text('custom_status', 'Custom teaching experiment. Use the Sirius button to restore published reference inputs.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12 } }, controls.map(function(c) {
            return h('div', { key: c.id, style: panel },
              h('label', { htmlFor: 'astronomy-binary-' + c.id, style: { display: 'block', fontSize: 14, fontWeight: 700, color: '#f1f5f9' } }, c.label),
              h('output', { htmlFor: 'astronomy-binary-' + c.id, style: { display: 'block', fontSize: 14, color: gold, marginTop: 6 } }, c.readout || n(c.value, 5) + (c.unit ? ' ' + c.unit : '')),
              h('input', { id: 'astronomy-binary-' + c.id, type: 'range', min: c.min, max: c.max, step: 'any', value: c.value, className: 'astr-focus',
                'aria-valuetext': c.readout || n(c.value, 5) + ' ' + c.unit, 'aria-describedby': 'astronomy-binary-controls-help',
                onChange: function(e) { c.change(Number(e.target.value)); }, onKeyDown: function(e) { keys(e, c); },
                style: { width: '100%', minHeight: 44, margin: '4px 0 0', accentColor: cyan } }));
          })),
          h('p', { id: 'astronomy-binary-controls-help', style: prose }, text('controls_help', 'Arrow keys adjust mass by 0.1, orbit size by 0.5 AU, and eccentricity or time fraction by 0.01. Shift uses five steps; Home and End reach the limits. Time starts at closest approach. Changing inputs keeps the selected time fraction.')),
          h('p', { style: prose }, text('size_help', 'The semimajor axis is half the long diameter of the relative orbit, not the stars’ current separation. Eccentricity 0 is circular; larger values make a more elongated ellipse. Both stars complete an orbit in the same period.')),
          h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: Object.assign({}, panel, { borderColor: cyan, fontSize: 14, lineHeight: 1.75, margin: '12px 0' }) }, balance),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10, marginBottom: 12 } }, metrics.map(function(row) {
            return h('div', { key: row[0], style: panel, 'data-binary-metric': row[0], 'data-value': row[2] }, h('div', { style: { fontSize: 13, color: muted } }, row[1]), h('strong', { style: { display: 'block', fontSize: 18, color: gold, marginTop: 4 } }, n(row[2]) + ' ' + row[3]));
          })),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 } },
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) },
              h('figcaption', { style: { fontSize: 14, fontWeight: 700, color: gold } }, text('geometry_title', 'Two paths, one shared center')),
              h('svg', { id: 'astronomy-binary-geometry', viewBox: '0 0 360 360', role: 'img', 'aria-labelledby': 'astronomy-binary-geometry-title astronomy-binary-geometry-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                h('title', { id: 'astronomy-binary-geometry-title' }, text('geometry_title', 'Two paths, one shared center')),
                h('desc', { id: 'astronomy-binary-geometry-desc' }, balance + ' ' + text('geometry_desc', 'A cyan solid path marks A; a white dashed path marks B. The cross is their fixed center of mass. Colored sectors on B’s path span equal amounts of time.')),
                h('text', { x: 180, y: 28, textAnchor: 'middle', fill: muted, fontSize: 21 }, text('plane_view', 'View above orbital plane')),
                m.sectors.map(function(s, i) { return h('polygon', { key: i, 'data-binary-sector': i, 'data-area-au2': s.areaAu2,
                  points: '180,170 ' + s.points.map(function(p) { var v = xy(p); return v.x + ',' + v.y; }).join(' '),
                  fill: i ? green : gold, fillOpacity: 0.2, stroke: i ? green : gold, strokeWidth: 1.5 }); }),
                ['a', 'b'].map(function(which) { return h('polyline', { key: which, 'data-binary-orbit': which,
                  points: m.orbit.map(function(p) { var v = xy(p[which]); return v.x + ',' + v.y; }).join(' '), fill: 'none', stroke: which === 'a' ? cyan : '#f8fafc', strokeWidth: 2, strokeDasharray: which === 'b' ? '5 4' : undefined }); }),
                h('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: '#94a3b8', strokeDasharray: '3 3' }),
                h('circle', { cx: A.x, cy: A.y, r: 9, fill: cyan, stroke: bg, strokeWidth: 2, 'data-binary-star': 'a' }),
                h('circle', { cx: B.x, cy: B.y, r: 7, fill: bg, stroke: '#f8fafc', strokeWidth: 3, 'data-binary-star': 'b' }),
                h('path', { d: 'M 174 170 H 186 M 180 164 V 176', stroke: gold, strokeWidth: 2, 'data-binary-center': true }),
                h('line', { x1: 26, x2: 26 + barAu * scale, y1: 311, y2: 311, stroke: muted, strokeWidth: 3 }),
                h('text', { x: 26 + barAu * scale + 10, y: 318, fill: muted, fontSize: 21 }, n(barAu) + ' AU'),
                h('text', { x: 180, y: 350, textAnchor: 'middle', fill: gold, fontSize: 21 }, text('center_label', '× Shared center of mass'))),
              h('p', { style: prose }, text('geometry_legend', 'A: cyan solid path and filled marker. B: white dashed path and ring marker. The cross stays fixed. Markers are enlarged for clarity; their size and brightness do not represent stellar radii or luminosity. The drawing fits each experiment; use the AU scale bar to compare sizes.')),
              h('p', { style: prose }, text('areas', 'Gold and green sectors each cover 1/12 of B’s orbit period. They have equal area despite their different shapes.') + ' ' + n(m.sectors[0].areaAu2, 3) + ' AU² ' + text('each', 'each') + ' · ' + n(m.periodYears / 12) + ' ' + text('years', 'years')),
              h('p', { style: prose }, 'A: ' + n(m.semimajorA) + ' AU · B: ' + n(m.semimajorB) + ' AU · ' + text('individual_sizes', 'individual semimajor axes'))),
            h('figure', { style: Object.assign({}, panel, { margin: 0 }) },
              h('figcaption', { style: { fontSize: 14, fontWeight: 700, color: gold } }, text('chart_title', 'How orbital speed changes')),
              h('svg', { id: 'astronomy-binary-chart', viewBox: '0 0 360 350', role: 'slider', tabIndex: 0, className: 'astr-focus',
                'aria-label': text('chart_a11y', 'Select elapsed fraction of the binary orbit'), 'aria-valuemin': 0, 'aria-valuemax': 1, 'aria-valuenow': m.phase,
                'aria-valuetext': n(m.phase * 100, 1) + '%; ' + n(m.elapsedYears) + ' ' + text('years', 'years') + '; ' + n(m.current.relativeSpeedKmS) + ' km/s',
                'aria-orientation': 'horizontal', 'aria-describedby': 'astronomy-binary-chart-help', style: { width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' },
                onKeyDown: function(e) { keys(e, timeControl); },
                onPointerDown: function(e) { if (e.button != null && e.button !== 0) return; e.currentTarget.focus({ preventScroll: true }); scrub(e); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} },
                onPointerMove: function(e) { if (e.buttons === 1) scrub(e); },
                onPointerUp: function(e) { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {} },
                onPointerCancel: function(e) { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {} }
              },
                h('title', null, text('chart_title', 'How orbital speed changes')),
                h('desc', null, text('chart_desc', 'Green is relative speed divided by the circular speed for the same total mass and semimajor axis. A circular orbit stays at one. Eccentric orbits speed up at closest approach and slow down at widest separation.')),
                h('text', { x: 194, y: 28, textAnchor: 'middle', fill: muted, fontSize: 21 }, text('speed_axis', 'Relative orbital speed')),
                [0, 1, 2, 3].map(function(v) { return h('g', { key: v }, h('line', { x1: 56, x2: 332, y1: chartY(v), y2: chartY(v), stroke: v === 1 ? '#94a3b8' : '#334155', strokeDasharray: v === 1 ? '4 4' : undefined }), h('text', { x: 46, y: chartY(v) + 6, textAnchor: 'end', fill: muted, fontSize: 21 }, v + '×')); }),
                [0, 0.25, 0.5, 0.75, 1].map(function(f) { return h('g', { key: f }, h('line', { x1: chartX(f), x2: chartX(f), y1: 52, y2: 262, stroke: '#334155' }), h('text', { x: chartX(f), y: 293, textAnchor: 'middle', fill: muted, fontSize: 21 }, f * 100)); }),
                h('polyline', { 'data-binary-speed-path': true, points: m.points.map(function(p) { return chartX(p.phase) + ',' + chartY(p.speedRatio); }).join(' '), fill: 'none', stroke: green, strokeWidth: 3 }),
                h('line', { x1: chartX(m.phase), x2: chartX(m.phase), y1: 45, y2: 268, stroke: gold, strokeWidth: 2 }),
                h('circle', { cx: chartX(m.phase), cy: chartY(m.current.speedRatio), r: 6, fill: bg, stroke: green, strokeWidth: 3, 'data-binary-selected': true, 'data-value': m.current.speedRatio }),
                h('text', { x: 194, y: 340, textAnchor: 'middle', fill: muted, fontSize: 21 }, text('time_axis', 'Elapsed orbit (%)'))),
              h('p', { id: 'astronomy-binary-chart-help', style: prose }, text('chart_help', 'Tap or drag the graph to select time. Arrow keys move 1% of the period; Shift moves 5%. The curve uses a fixed 0–3.2× scale relative to circular speed at the same mass and orbit size. 0% and 100% are closest approach; 50% is widest separation.')),
              h('div', { role: 'group', 'aria-label': text('time_examples', 'Binary orbit time examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                button(text('closest', 'Closest approach'), function() { phase(0); }, m.phase === 0, 'near'),
                button(text('quarter', 'Quarter period'), function() { phase(0.25); }, m.phase === 0.25, 'quarter'),
                button(text('widest', 'Widest separation'), function() { phase(0.5); }, m.phase === 0.5, 'far')),
              h('p', { style: prose }, text('individual_speeds', 'Speeds around the shared center') + ' · A: ' + n(m.current.a.speedKmS) + ' km/s · B: ' + n(m.current.b.speedKmS) + ' km/s'))),
          h('details', { style: { marginTop: 12 } },
            h('summary', { className: 'astr-focus', style: { display: 'list-item', listStylePosition: 'inside', minHeight: 44, padding: '10px 0', fontSize: 14, color: gold, cursor: 'pointer' } }, text('sources_title', 'Published inputs and model limits')),
            h('table', { id: 'astronomy-binary-inputs', style: { width: '100%', tableLayout: 'fixed', fontSize: 13, lineHeight: 1.7, color: muted, borderCollapse: 'collapse' } },
              h('caption', { style: { textAlign: 'left', marginBottom: 8 } }, text('table_caption', 'Sirius A/B reference values, with published one-sigma uncertainties. The simulator uses the central values; it does not propagate uncertainty.')),
              h('thead', null, h('tr', null, h('th', { scope: 'col', style: { textAlign: 'left' } }, text('input', 'Input')), h('th', { scope: 'col', style: { textAlign: 'left' } }, text('reference_value', 'Reference value')))),
              h('tbody', null, [
                [text('mass_a', 'Star A mass'), '2.063 ± 0.023 ' + text('solar_masses', 'solar masses')],
                [text('mass_b', 'Star B mass'), '1.018 ± 0.011 ' + text('solar_masses', 'solar masses')],
                [text('period', 'One orbit'), '50.1284 ± 0.0043 ' + text('years', 'years')],
                [text('eccentricity', 'Orbital eccentricity'), '0.59142 ± 0.00037'],
                [text('derived_size', 'Derived semimajor axis'), n(m.siriusSeparationAu, 4) + ' AU'],
                [text('gm', 'Nominal solar GM'), '1.3271244 × 10²⁰ m³/s²']
              ].map(function(row) { var style = { textAlign: 'left', padding: '8px 2px', overflowWrap: 'anywhere' }; return h('tr', { key: row[0] }, h('th', { scope: 'row', style: style }, row[0]), h('td', { style: style }, row[1])); }))),
            h('p', { style: Object.assign({}, prose, { fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere' }) }, 'P² = 4π²a³ / [GM☉ × (mA + mB)]; aA = a × mB / (mA + mB); aB = a × mA / (mA + mB)'),
            h('p', { style: prose }, text('math_note', 'a is the relative semimajor axis, converted from AU to meters. P uses seconds internally and Julian years (365.25 days) on screen. The solar GM is an IAU nominal conversion constant; 1 AU is exactly 149,597,870,700 meters. Orbital positions solve Kepler’s equation and speeds follow the vis-viva equation.')),
            h('p', { style: prose }, text('limits', 'This is an isolated Newtonian two-body model viewed above its orbital plane. The Sirius preset uses published masses, period and eccentricity, with a consistent orbit size derived from those central values. The diagram omits the system’s actual sky inclination and orientation. Model time starts at closest approach and does not predict today’s positions. Stellar radii, collisions, eclipses, mass transfer, relativity and external bodies are omitted.')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, [
              ['https://arxiv.org/abs/1703.10625', text('bond_link', 'Bond et al. · Sirius orbital measurements')],
              ['https://arxiv.org/abs/1510.07674', text('iau_link', 'IAU · Nominal conversion constants')],
              ['https://openstax.org/books/astronomy-2e/pages/18-2-measuring-stellar-masses', text('openstax_link', 'OpenStax · Measuring stellar masses')]
            ].map(function(link) { return h('a', { key: link[0], href: link[0], target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: cyan } }, link[1]); }))),
          h('div', { style: { marginTop: 12 } }, button(text('reset', 'Reset binary explorer'), sirius, undefined, 'reset')));
      }

