        function renderHrExplorer() {
          var plot = { x: 80, y: 36, w: 320, h: 300 };
          function position(temp, lum) { var p = hrStellarModel(temp, lum); return { x: plot.x + p.x * plot.w, y: plot.y + p.y * plot.h }; }
          var current = position(iq.tempK, iq.lumin), sun = position(5772, 1), bandTop = [], bandBottom = [];
          for (var n = 0; n <= 40; n++) {
            var temp = 50000 * Math.pow(2000 / 50000, n / 40), logL = hrMainSequenceLogLum(temp);
            var a = position(temp, Math.pow(10, logL + 0.65)), b = position(temp, Math.pow(10, logL - 0.65));
            bandTop.push(a.x + ',' + a.y); bandBottom.unshift(b.x + ',' + b.y);
          }
          function setPlot(event) {
            var box = event.currentTarget.getBoundingClientRect();
            if (!box.width || !box.height) return;
            var x = Math.max(0, Math.min(1, ((event.clientX - box.left) * 430 / box.width - plot.x) / plot.w));
            var y = Math.max(0, Math.min(1, ((event.clientY - box.top) * 408 / box.height - plot.y) / plot.h));
            setIQ({ tempK: Math.round(50000 * Math.pow(2000 / 50000, x)), lumin: Number(Math.pow(10, 5 - y * 8).toPrecision(5)) });
          }
          var panel = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#334155';
          function hrMetric(label, value) { return h('div', null, h('dt', { style: { color: '#cbd5e1', fontSize: 12 } }, label), h('dd', { style: { margin: 0, color: '#f8fafc', fontWeight: 750 } }, value)); }
          var examples = [
            { id: 'sun', label: __alloT('stem.astronomy.hr_example_sun', 'Sun reference'), t: 5772, l: 1, m: 1 },
            { id: 'dwarf', label: __alloT('stem.astronomy.hr_example_dwarf', 'Cool dwarf'), t: 3500, l: 0.03, m: 0.3 },
            { id: 'giant', label: __alloT('stem.astronomy.hr_example_giant', 'Cool giant'), t: 4000, l: 1000, m: 1.5 },
            { id: 'white', label: __alloT('stem.astronomy.hr_example_white', 'White dwarf'), t: 20000, l: 0.01, m: 0.6 },
            { id: 'hot', label: __alloT('stem.astronomy.hr_example_hot', 'Hot main sequence'), t: 30000, l: 10000, m: 15 }
          ];
          return h('section', { id: 'astronomy-hr-explorer', 'aria-label': __alloT('stem.astronomy.hr_visual_explorer', 'Stellar diagram explorer'), style: { marginBottom: 14 } },
            h('style', null, '#astronomy-hr-plot text{font-size:17px}#astronomy-hr-lab button{min-height:44px}@media(max-width:600px){#astronomy-hr-plot text{font-size:21px}}'),
            h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.hr_examples', 'Example stars'), style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 } }, examples.map(function(example) {
              return h('button', { key: example.id, type: 'button', className: 'astr-focus', 'aria-pressed': iq.tempK === example.t && iq.lumin === example.l, onClick: function() { setIQ({ tempK: example.t, lumin: example.l, mass: example.m }); }, style: { minHeight: 44, padding: '9px 12px', borderRadius: 9, border: '1px solid ' + border, background: iq.tempK === example.t && iq.lumin === example.l ? '#164e63' : panel, color: '#e0f2fe', cursor: 'pointer', fontSize: 13 } }, example.label);
            })),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 14, alignItems: 'start' } },
              h('div', { style: { minWidth: 0, padding: 8, background: panel, border: '1px solid ' + border, borderRadius: 14 } },
                h('svg', { id: 'astronomy-hr-plot', viewBox: '0 0 430 408', role: 'group', tabIndex: 0, className: 'astr-focus', 'aria-label': __alloT('stem.astronomy.hr_plot_label', 'Temperature and luminosity diagram'), 'aria-describedby': 'astronomy-hr-help astronomy-hr-classification astronomy-hr-readout',
                  onPointerDown: function(event) { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId); setPlot(event); },
                  onPointerMove: function(event) { if (event.buttons === 1 && event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) setPlot(event); },
                  onKeyDown: function(event) { var step = event.shiftKey ? 0.1 : 0.025;
                    if (event.key === 'Home') { event.preventDefault(); setIQ({ tempK: 5772, lumin: 1 }); return; }
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(event.key) < 0) return;
                    event.preventDefault();
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') setIQ({ tempK: Math.round(iq.tempK * Math.pow(10, event.key === 'ArrowLeft' ? step : -step)) });
                    else setIQ({ lumin: Number((iq.lumin * Math.pow(10, event.key === 'ArrowUp' ? step * 4 : -step * 4)).toPrecision(5)) });
                  }, style: { display: 'block', width: '100%', height: 'auto', touchAction: 'none', borderRadius: 8, cursor: 'crosshair' } },
                  h('title', null, __alloT('stem.astronomy.hr_plot_title', 'Hertzsprung–Russell diagram: brighter stars are higher, hotter stars are left')),
                  h('defs', null,
                    h('linearGradient', { id: 'astr-hr-spectrum' }, h('stop', { offset: '0%', stopColor: '#91bfff' }), h('stop', { offset: '48%', stopColor: '#f4f5ff' }), h('stop', { offset: '73%', stopColor: '#fff0c2' }), h('stop', { offset: '100%', stopColor: '#f99b68' })),
                    h('clipPath', { id: 'astr-hr-clip' }, h('rect', { x: plot.x, y: plot.y, width: plot.w, height: plot.h }))),
                  h('rect', { x: plot.x, y: plot.y, width: plot.w, height: plot.h, rx: 5, fill: astronomyContrast ? '#000' : '#0e1c32', stroke: border }),
                  h('g', { clipPath: 'url(#astr-hr-clip)', 'aria-hidden': true },
                    h('polygon', { points: bandTop.concat(bandBottom).join(' '), fill: '#22d3ee', opacity: astronomyContrast ? 0.2 : 0.12, stroke: '#67e8f9', strokeWidth: 1.5, strokeDasharray: '4 4' }),
                    h('ellipse', { cx: position(3800, 700).x, cy: position(3800, 700).y, rx: 50, ry: 32, fill: '#fb923c', opacity: 0.12, stroke: '#fdba74', strokeDasharray: '3 3' }),
                    h('ellipse', { cx: position(15000, 0.016).x, cy: position(15000, 0.016).y, rx: 65, ry: 26, transform: 'rotate(18 ' + position(15000, 0.016).x + ' ' + position(15000, 0.016).y + ')', fill: '#c4b5fd', opacity: 0.14, stroke: '#ddd6fe', strokeDasharray: '3 3' })),
                  [5, 3, 1, 0, -1, -3].map(function(exponent) { var y = plot.y + (5 - exponent) / 8 * plot.h; return h('g', { key: 'l' + exponent, 'aria-hidden': true }, h('line', { x1: plot.x, y1: y, x2: plot.x + plot.w, y2: y, stroke: '#52627a', opacity: 0.5, strokeDasharray: exponent === 0 ? 'none' : '2 5' }), h('text', { x: plot.x - 9, y: y + 5, fill: '#d5deed', textAnchor: 'end', fontSize: 14 }, String(Math.pow(10, exponent)))); }),
                  [50000, 10000, 5000, 2000].map(function(temp) { var x = position(temp, 1).x; return h('g', { key: 't' + temp, 'aria-hidden': true }, h('line', { x1: x, y1: plot.y, x2: x, y2: plot.y + plot.h, stroke: '#52627a', opacity: 0.4, strokeDasharray: '2 5' }), h('text', { x: x, y: plot.y + plot.h + 36, textAnchor: temp === 50000 ? 'start' : temp === 2000 ? 'end' : 'middle', fill: '#d5deed', fontSize: 14 }, temp.toLocaleString('en-US'))); }),
                  h('text', { x: plot.x, y: 20, fill: '#e2e8f0', fontSize: 14 }, __alloT('stem.astronomy.hr_luminosity_axis', 'Luminosity (Sun = 1) ↑')),
                  h('text', { x: 238, y: 395, textAnchor: 'middle', fill: '#e2e8f0', fontSize: 14 }, __alloT('stem.astronomy.hr_temperature_axis', '← Hotter · Temperature (K) · Cooler →')),
                  h('rect', { x: plot.x, y: plot.y + plot.h + 9, width: plot.w, height: 7, rx: 3, fill: 'url(#astr-hr-spectrum)', 'aria-hidden': true }),
                  h('g', { fill: '#dce8f7', fontSize: 12, 'aria-hidden': true },
                    h('text', { x: 89, y: 59 }, __alloT('stem.astronomy.hr_sequence_short', 'Main sequence')),
                    h('text', { x: 302, y: 91 }, __alloT('stem.astronomy.hr_giants_short', 'Giants')),
                    h('text', { x: 133, y: 260 }, __alloT('stem.astronomy.hr_white_short', 'White dwarfs'))),
                  iq.log.map(function(entry, index) { var p = position(entry.t, entry.l); return h('circle', { key: 'saved' + index, cx: p.x, cy: p.y, r: 4, fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.5, opacity: 0.8, 'aria-hidden': true }); }),
                  h('g', { 'aria-hidden': true }, h('circle', { cx: sun.x, cy: sun.y, r: 5, fill: '#fde68a', stroke: '#fff', strokeWidth: 1 }), h('text', { x: sun.x + 10, y: sun.y + 20, fill: '#fde68a', fontSize: 13 }, __alloT('stem.astronomy.hr_sun_short', 'Sun'))),
                  h('g', { 'data-hr-marker': true, 'data-temperature': iq.tempK, 'data-luminosity': iq.lumin, 'aria-hidden': true },
                    h('line', { x1: plot.x, y1: current.y, x2: current.x, y2: current.y, stroke: '#f8fafc', strokeDasharray: '4 4', opacity: 0.5 }),
                    h('line', { x1: current.x, y1: current.y, x2: current.x, y2: plot.y + plot.h, stroke: '#f8fafc', strokeDasharray: '4 4', opacity: 0.5 }),
                    h('circle', { cx: current.x, cy: current.y, r: 12, fill: stellar.color, opacity: 0.18 }),
                    h('circle', { cx: current.x, cy: current.y, r: 6, fill: stellar.color, stroke: '#fff', strokeWidth: 2 }))),
                h('p', { id: 'astronomy-hr-help', style: { margin: '6px 5px', color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_plot_help_plain', 'Drag the point, or focus the diagram and use arrow keys. Left is hotter; up means more light output. Home returns to the Sun. The axes use log scales: equal steps represent multiplication, not equal additions.')),
                h('p', { style: { margin: '6px 5px', color: '#cbd5e1', fontSize: 12, lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_marker_legend', 'Filled marker: your star. Gold dot: Sun. Purple rings: logged observations.'))),
              h('div', { style: { minWidth: 0, border: '1px solid ' + border, borderRadius: 14, padding: 14, background: panel } },
                h('div', { style: { fontSize: 13, color: '#a5f3fc', fontWeight: 750 } }, __alloT('stem.astronomy.hr_your_star', 'Your star beside the Sun')),
                h('svg', { viewBox: '0 0 300 185', role: 'img', 'aria-label': __alloT('stem.astronomy.hr_radius_preview', 'Compressed star size comparison'), style: { width: '100%', display: 'block', maxHeight: 215 } },
                  h('defs', null, h('radialGradient', { id: 'astr-hr-star-face' }, h('stop', { offset: '0%', stopColor: '#fff' }), h('stop', { offset: '60%', stopColor: stellar.color }), h('stop', { offset: '100%', stopColor: stellar.color, stopOpacity: 0.75 })), h('radialGradient', { id: 'astr-hr-star-halo' }, h('stop', { offset: '0%', stopColor: stellar.color, stopOpacity: 0.3 }), h('stop', { offset: '100%', stopColor: stellar.color, stopOpacity: 0 })), h('radialGradient', { id: 'astr-hr-sun-face' }, h('stop', { offset: '0%', stopColor: '#fff' }), h('stop', { offset: '60%', stopColor: '#fff4e6' }), h('stop', { offset: '100%', stopColor: '#fff4e6', stopOpacity: 0.75 }))),
                  h('circle', { cx: 67, cy: 82, r: 36, fill: 'url(#astr-hr-sun-face)' }),
                  h('circle', { cx: 212, cy: 82, r: Math.max(10, Math.min(72, 36 + 18 * Math.log10(stellar.radius))) + 22, fill: 'url(#astr-hr-star-halo)' }),
                  h('circle', { cx: 212, cy: 82, r: Math.max(10, Math.min(72, 36 + 18 * Math.log10(stellar.radius))), fill: 'url(#astr-hr-star-face)' }),
                  h('text', { x: 67, y: 175, textAnchor: 'middle', fill: '#fde68a', fontSize: 14 }, __alloT('stem.astronomy.hr_sun_short', 'Sun')),
                  h('text', { x: 212, y: 175, textAnchor: 'middle', fill: '#e2e8f0', fontSize: 14 }, __alloT('stem.astronomy.hr_selected_short', 'Selected star'))),
                h('dl', { id: 'astronomy-hr-readout', 'aria-live': 'polite', 'aria-atomic': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 10, margin: 0, fontSize: 13, lineHeight: 1.6 } },
                  hrMetric(__alloT('stem.astronomy.hr_temperature_value', 'Temperature'), Math.round(iq.tempK).toLocaleString('en-US') + ' K'),
                  hrMetric(__alloT('stem.astronomy.hr_luminosity_value', 'Luminosity'), hrNumber(iq.lumin) + ' L☉'),
                  hrMetric(__alloT('stem.astronomy.hr_radius_value', 'Inferred radius'), hrNumber(stellar.radius) + ' R☉')),
                h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#cbd5e1', marginBottom: 0 } }, __alloT('stem.astronomy.hr_size_note', 'Disk sizes are compressed so small and giant stars stay visible. Radius follows the Stefan–Boltzmann relation: luminosity depends on surface area and temperature.')))),
            h('p', { style: { margin: '10px 0 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } }, __alloT('stem.astronomy.hr_regions_note', 'Shaded regions and example stars are teaching guides, not measured catalog points or an evolution track. Region boundaries are approximate. The Sun reference uses 5,772 K and one solar luminosity.')));
        }
