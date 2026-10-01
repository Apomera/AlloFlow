
        function renderHrSizeComparison() {
          var panel = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#334155';
          var trueScale = comparison.mode === 'true';
          function metric(label, value, key) {
            return h('div', null, h('dt', { style: { color: '#cbd5e1', fontSize: 12 } }, label),
              h('dd', { 'data-hr-metric': key, 'data-value': value, style: { margin: 0, color: '#f8fafc', fontWeight: 750 } }, hrNumber(value) + ' × ' + __alloT('stem.astronomy.hr_sun_short', 'Sun')));
          }
          function disk(which, cx, radius, color) {
            var tiny = radius < 1;
            return h('g', { key: which, 'aria-hidden': true },
              h('circle', { 'data-hr-disk': which, cx: cx, cy: 102, r: radius, fill: color }),
              tiny && h('path', { d: 'M' + cx + ',112 L' + cx + ',145', stroke: '#cbd5e1', strokeDasharray: '3 3', fill: 'none' }),
              tiny && h('text', { x: cx, y: 170, textAnchor: 'middle', fill: '#cbd5e1' }, __alloT('stem.astronomy.hr_tiny_disk', 'Tiny disk ↑')),
              h('text', { x: cx, y: 208, textAnchor: 'middle', fill: '#e2e8f0' }, which === 'sun' ? __alloT('stem.astronomy.hr_sun_short', 'Sun') : __alloT('stem.astronomy.hr_selected_short', 'Selected star')));
          }
          return h('div', { id: 'astronomy-hr-size-panel', style: { minWidth: 0, border: '1px solid ' + border, borderRadius: 14, padding: 14, background: panel } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 14, color: '#a5f3fc' } }, __alloT('stem.astronomy.hr_your_star', 'Your star beside the Sun')),
            h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.hr_scale_choices', 'Star size display'), style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
              [{ id: 'true', label: __alloT('stem.astronomy.hr_true_scale', 'True scale') }, { id: 'compressed', label: __alloT('stem.astronomy.hr_readable_sizes', 'Readable sizes') }].map(function(mode) {
                return h('button', { key: mode.id, type: 'button', className: 'astr-focus', 'aria-pressed': comparison.mode === mode.id, 'aria-describedby': 'astronomy-hr-scale-note',
                  onClick: function() { setIQ({ sizeScale: mode.id }); }, style: { padding: '9px 12px', minHeight: 44, border: '1px solid ' + border, borderRadius: 8, background: comparison.mode === mode.id ? '#164e63' : panel, color: '#e0f2fe', fontSize: 13, cursor: 'pointer' } }, mode.label);
              })),
            h('svg', { id: 'astronomy-hr-size', viewBox: '0 0 360 230', role: 'img', 'aria-labelledby': 'astronomy-hr-size-title', 'aria-describedby': 'astronomy-hr-scale-note astronomy-hr-readout',
              'data-size-scale': comparison.mode, style: { width: '100%', display: 'block', margin: '8px 0' } },
              h('title', { id: 'astronomy-hr-size-title' }, trueScale ? __alloT('stem.astronomy.hr_true_size_title', 'Sun and selected star with the same radius scale') : __alloT('stem.astronomy.hr_readable_size_title', 'Sun and selected star with compressed disk sizes')),
              h('defs', null,
                h('radialGradient', { id: 'astr-hr-star-face' }, h('stop', { offset: '0%', stopColor: '#fff' }), h('stop', { offset: '65%', stopColor: stellar.color }), h('stop', { offset: '100%', stopColor: stellar.color })),
                h('radialGradient', { id: 'astr-hr-sun-face' }, h('stop', { offset: '0%', stopColor: '#fff' }), h('stop', { offset: '65%', stopColor: '#fff4e6' }), h('stop', { offset: '100%', stopColor: '#fff4e6' }))),
              disk('sun', 90, comparison.sunDisk, 'url(#astr-hr-sun-face)'),
              disk('star', 270, comparison.starDisk, 'url(#astr-hr-star-face)')),
            h('p', { id: 'astronomy-hr-scale-note', style: { fontSize: 12, lineHeight: 1.6, color: '#cbd5e1', margin: '0 0 12px' } },
              trueScale ? __alloT('stem.astronomy.hr_true_scale_note', 'Both disks use the same scale; the view fits the larger star. Very small disks may be less than a pixel wide. Dashed pointers locate them without enlarging them. Spacing and colors are illustrative.')
                : __alloT('stem.astronomy.hr_compressed_scale_note', 'Sizes are compressed to keep both stars visible. Use True scale to compare their actual radius ratio. Spacing and colors are illustrative.')),
            h('dl', { id: 'astronomy-hr-readout', 'aria-live': 'polite', 'aria-atomic': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 10, margin: 0, fontSize: 13, lineHeight: 1.6 } },
              h('div', null, h('dt', { style: { color: '#cbd5e1', fontSize: 12 } }, __alloT('stem.astronomy.hr_temperature_value', 'Temperature')), h('dd', { style: { margin: 0, fontWeight: 750 } }, Math.round(iq.tempK).toLocaleString('en-US') + ' K')),
              h('div', null, h('dt', { style: { color: '#cbd5e1', fontSize: 12 } }, __alloT('stem.astronomy.hr_luminosity_value', 'Luminosity')), h('dd', { style: { margin: 0, fontWeight: 750 } }, hrNumber(iq.lumin) + ' L☉')),
              h('div', null, h('dt', { style: { color: '#cbd5e1', fontSize: 12 } }, __alloT('stem.astronomy.hr_radius_value', 'Inferred radius')), h('dd', { style: { margin: 0, fontWeight: 750 } }, hrNumber(stellar.radius) + ' R☉'))),
            h('div', { style: { marginTop: 14, padding: 12, borderRadius: 9, background: astronomyContrast ? '#000' : '#142238', border: '1px solid ' + border } },
              h('h5', { style: { margin: '0 0 8px', fontSize: 13, color: '#a5f3fc' } }, __alloT('stem.astronomy.hr_output_explained', 'Why this star gives off this much light')),
              h('dl', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 10, margin: 0, fontSize: 13, lineHeight: 1.6 } },
                metric(__alloT('stem.astronomy.hr_surface_area', 'Surface area'), comparison.surfaceArea, 'area'),
                metric(__alloT('stem.astronomy.hr_surface_power', 'Power per surface area'), comparison.emissionPerArea, 'emission')),
              h('p', { id: 'astronomy-hr-output-equation', style: { margin: '9px 0 0', color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 } }, hrNumber(comparison.surfaceArea) + ' × ' + hrNumber(comparison.emissionPerArea) + ' ≈ ' + hrNumber(stellar.lumin) + ' L☉'),
              h('p', { style: { margin: '6px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_output_relation', 'Surface area × power per surface area gives total luminosity across all wavelengths. Relative to the Sun, area scales as radius squared and surface power as temperature to the fourth power. This is the Stefan–Boltzmann relation.'))));
        }
        function renderHrReferences() {
          var reference = comparison.reference;
          return h('div', { id: 'astronomy-hr-references', style: { marginBottom: 12 } },
            h('h4', { style: { fontSize: 14, margin: '0 0 7px', color: '#a5f3fc' } }, __alloT('stem.astronomy.hr_published_examples', 'Published star examples')),
            h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.hr_reference_choices', 'Published stellar inputs'), style: { display: 'flex', flexWrap: 'wrap', gap: 7 } }, HR_STELLAR_REFERENCES.map(function(entry) {
              var selected = reference && reference.id === entry.id;
              return h('button', { key: entry.id, type: 'button', className: 'astr-focus', 'aria-pressed': !!selected, onClick: function() { setIQ({ tempK: entry.t, lumin: entry.l, mass: entry.m }); },
                style: { minHeight: 44, padding: '9px 12px', borderRadius: 9, border: '1px solid ' + (astronomyContrast ? '#fbbf24' : '#334155'), background: selected ? '#164e63' : '#091323', color: '#e0f2fe', cursor: 'pointer', fontSize: 13 } }, entry.id === 'sun' ? __alloT('stem.astronomy.hr_example_sun', 'Sun reference') : entry.name);
            })),
            h('p', { id: 'astronomy-hr-reference-status', role: 'status', 'aria-live': 'polite', 'data-reference': reference ? reference.id : 'custom', style: { fontSize: 12, color: '#e0f2fe', lineHeight: 1.6, margin: '8px 0' } },
              reference ? (reference.id === 'sun' ? __alloT('stem.astronomy.hr_solar_reference_status', 'Solar reference inputs: nominal temperature and one solar luminosity and mass.') : __alloT('stem.astronomy.hr_published_status', 'Published inputs:') + ' ' + reference.name + ' · Bond et al. (2017).')
                : __alloT('stem.astronomy.hr_custom_status', 'Custom star. Choose a published example to restore its temperature, luminosity and mass.')),
            h('details', { style: { border: '1px solid ' + (astronomyContrast ? '#fbbf24' : '#334155'), borderRadius: 9, padding: '0 10px', color: '#cbd5e1' } },
              h('summary', { className: 'astr-focus', style: { minHeight: 44, display: 'list-item', alignContent: 'center', cursor: 'pointer', fontSize: 13, padding: '10px 0' } }, __alloT('stem.astronomy.hr_reference_details', 'Sources, uncertainties and model')),
              h('p', { style: { fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_reference_inputs_note', 'Sirius inputs are fixed estimates adopted by the 2017 study, with its quoted uncertainties. They come from observations and fitted stellar atmospheres. Selecting an example uses central values; uncertainty is not simulated.')),
              HR_STELLAR_REFERENCES.slice(1).map(function(entry) {
                return h('p', { key: entry.id, style: { fontSize: 12, lineHeight: 1.7 } }, h('strong', { style: { color: '#e0f2fe' } }, entry.name + ': '),
                  entry.t.toLocaleString('en-US') + ' ± ' + entry.tError + ' K; ' + entry.l + ' ± ' + entry.lError + ' L☉; ' + entry.m + ' ± ' + entry.mError + ' M☉.');
              }),
              h('p', { style: { fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_sirius_uncertainty_note', 'Sirius B’s temperature and luminosity errors are internal model-fit errors; larger systematic uncertainty is not included. Radius here is inferred from luminosity and temperature, using the same solar reference for every example.')),
              h('p', { style: { fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_sun_nominal_note', 'The 5,772 K solar temperature is the IAU nominal conversion reference. Solar mass and luminosity are set to one for comparison. These reference numbers do not describe every change in the real Sun.')),
              h('p', { style: { fontSize: 12, lineHeight: 1.6 } },
                h('a', { href: 'https://arxiv.org/abs/1703.10625', target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginRight: 12 } }, __alloT('stem.astronomy.hr_sirius_source', 'Sirius study · Bond et al., 2017')),
                h('a', { href: 'https://arxiv.org/abs/1510.07674', target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus', style: { color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', minHeight: 44 } }, __alloT('stem.astronomy.hr_iau_source', 'IAU solar reference · 2015')))));
        }

