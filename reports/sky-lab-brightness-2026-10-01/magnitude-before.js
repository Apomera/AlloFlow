          // Magnitude scale: apparent vs absolute
          sectionCard('🔆 The magnitude scale: how bright is bright?',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                __alloT('stem.astronomy.astronomers_measure_brightness_on_the_', 'Astronomers measure brightness on the magnitude scale, invented by the Greek astronomer Hipparchus around 130 BCE. It is '),
                h('strong', { style: { color: '#fbbf24' } }, 'inverted'),
                __alloT('stem.astronomy.smaller_number_brighter_the_historical', ' (smaller number = brighter, the historical convention) and '),
                h('strong', { style: { color: '#fbbf24' } }, 'logarithmic'),
                __alloT('stem.astronomy.each_step_of_5_magnitudes_is_exactly_1', ' (each step of 5 magnitudes is exactly 100× brighter). The Sun at magnitude -27 and the faintest galaxy ever imaged at magnitude +32 differ in brightness by a factor of about 10²³.')
              ),

              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid #fbbf24' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, __alloT('stem.astronomy.apparent_magnitude_m', 'Apparent magnitude (m)')),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, __alloT('stem.astronomy.how_bright_the_object_looks_from_earth', 'How bright the object LOOKS from Earth. Depends on both how much light the object emits AND how far away it is. A bright nearby star and a dim distant star can have the same apparent magnitude.'))
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid #c7d2fe' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } }, __alloT('stem.astronomy.absolute_magnitude_m', 'Absolute magnitude (M)')),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, __alloT('stem.astronomy.how_bright_the_object_would_appear_if_', 'How bright the object would APPEAR if placed at a standard distance of 10 parsecs (32.6 light-years). Lets us compare the actual luminosity of stars regardless of distance.'))
                )
              ),

              // Magnitude reference table
              h('div', { style: { padding: 12, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', overflowX: 'auto' } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, __alloT('stem.astronomy.apparent_magnitude_reference', 'Apparent magnitude reference:')),
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 480 } },
                  h('thead', null, h('tr', null,
                    ['Object', 'App. mag (m)', 'Visibility'].map(function(c, i) {
                      return h('th', { key: i, scope: 'col', style: { padding: 5, textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155', fontWeight: 700 } }, c);
                    })
                  )),
                  h('tbody', null,
                    [
                      { obj: 'Sun', m: '-26.7', vis: 'Too bright to look at safely' },
                      { obj: 'Full Moon', m: '-12.7', vis: 'Brightest natural night object' },
                      { obj: 'Venus (brightest)', m: '-4.9', vis: 'Visible in twilight' },
                      { obj: 'Jupiter (brightest)', m: '-3.0', vis: 'Easily naked-eye' },
                      { obj: 'Sirius (brightest star)', m: '-1.46', vis: 'Brightest star at night' },
                      { obj: 'Vega', m: '0.03', vis: 'Reference standard (~mag 0)' },
                      { obj: 'Polaris', m: '+1.97', vis: 'North Star, mid-bright' },
                      { obj: 'Naked-eye limit (dark sky)', m: '+6.5', vis: 'Threshold of naked-eye visibility' },
                      { obj: 'Naked-eye limit (city)', m: '+2 to +4', vis: 'Most stars erased by light pollution' },
                      { obj: 'Binocular limit (7×50)', m: '+9 to +10', vis: 'Adds thousands of stars' },
                      { obj: 'Small telescope limit', m: '+12 to +14', vis: 'Galaxies, deep-sky' },
                      { obj: 'Hubble deep field limit', m: '+30', vis: 'Beyond reach of most ground telescopes' },
                      { obj: 'JWST faintest', m: '+34 (estimated)', vis: 'The faintest galaxies ever imaged' }
                    ].map(function(r, i) {
                      return h('tr', { key: i, style: { background: i % 2 === 0 ? '#0a0e1a' : '#0f172a' } },
                        h('td', { style: { padding: 5, color: '#e2e8f0' } }, r.obj),
                        h('td', { style: { padding: 5, color: '#fbbf24', fontFamily: 'ui-monospace, monospace' } }, r.m),
                        h('td', { style: { padding: 5, color: '#94a3b8' } }, r.vis)
                      );
                    })
                  )
                )
              ),

              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.astronomy.why_this_matters_2', 'Why this matters: ')),
                __alloT('stem.astronomy.sirius_looks_brightest_in_our_sky_beca', 'Sirius LOOKS brightest in our sky because it is close (8.6 light-years), but its absolute magnitude is +1.4 — Vega (also close, 25 ly) is intrinsically brighter at +0.6. Betelgeuse looks medium-bright (+0.5) but is 550 light-years away — its absolute magnitude is -5.8, intrinsically about 100,000× more luminous than the Sun. Without correcting for distance, you cannot compare what stars actually are.')
              )
            ),
            '#fbbf24'
          ),

