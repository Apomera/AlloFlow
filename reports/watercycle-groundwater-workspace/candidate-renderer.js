          function renderWcGroundwaterLens(scope) {
            var checkSession = scope === 'check' ? WCCheckInvestigation.normalizeSession(d.wcCheckInvestigation) : null;
            var identity = checkSession ? checkSession.key : '';
            var reading = WCGroundwaterLens.read(d.wcGroundwaterLens, scope, identity);
            if (!reading) return null;
            var part = WCGroundwaterLens.parts().filter(function(item) { return item.id === reading.part; })[0];
            var prefix = 'wcGroundwater-' + scope;
            function choose(id) {
              upd('wcGroundwaterLens', WCGroundwaterLens.select(d.wcGroundwaterLens, scope, id, identity));
            }
            function answer(id) {
              upd('wcGroundwaterLens', WCGroundwaterLens.answer(d.wcGroundwaterLens, scope, id, identity));
              focusWcComparisonTarget(prefix + '-FeedbackTitle');
            }
            function grain(x, y, radius, key) {
              return React.createElement('g', { key: key, 'data-gw-material': 'grain' },
                React.createElement('ellipse', { className: 'wc-gw-grain', cx: x, cy: y, rx: radius, ry: radius * 0.78 }),
                React.createElement('path', { className: 'wc-gw-crosshatch', d: 'M' + (x-radius*.48) + ' ' + (y+radius*.32) + 'l' + radius*.85 + ' ' + (-radius*.62) + 'm' + (-radius*.64) + ' ' + (-radius*.09) + 'l' + radius*.55 + ' ' + (-radius*.4) })
              );
            }
            var feedback = reading.result === 'supported'
              ? 'Soil water is evidence of water in soil. Recharge means adding water to the groundwater system; entering soil alone does not show how much reaches it or when.'
              : reading.answer === 'all_recharge'
                ? 'Entry into soil is infiltration. Water can stay in soil or take other pathways. Reaching the groundwater system is an additional step.'
                : reading.answer === 'dry_soil'
                  ? 'Unsaturated soil can hold both air and water. Compare its open air spaces with the water-filled spaces in the groundwater view.'
                  : 'Use the soil pore view and the boundary explanation. This practice is unscored.';
            return React.createElement('details', { className: 'wc-groundwater-lens' + (scope === 'check' ? ' wc-check-pores' : '') + (isDark ? ' is-dark' : '') + (isContrast ? ' is-contrast' : ''), 'data-gw-scope': scope, 'data-gw-part': part.id },
              React.createElement('style', null, WC_GROUNDWATER_LENS_STYLE),
              React.createElement('summary', { id: prefix + '-Summary' }, 'Look inside the ground'),
              React.createElement('div', { className: 'wc-gw-content' },
                React.createElement('p', { className: 'wc-gw-intro' }, 'Choose a zone to highlight it. Read the observation, then compare the cutaway and pore view.'),
                React.createElement('div', { className: 'wc-gw-options', role: 'group', 'aria-label': 'Choose a groundwater feature to inspect' },
                  WCGroundwaterLens.parts().map(function(item) { return React.createElement('button', { key: item.id, type: 'button', 'data-gw-select': item.id, 'aria-pressed': reading.part === item.id, 'aria-controls': prefix + '-Detail', onClick: function() { choose(item.id); } }, React.createElement('span', { className: 'wc-gw-choice-mark', 'aria-hidden': true }, reading.part === item.id ? '✓' : '○'), item.label); })
                ),
                React.createElement('section', { id: prefix + '-Detail', className: 'wc-gw-reading', 'aria-labelledby': prefix + '-DetailTitle' },
                  React.createElement('small', null, 'Inspecting · ' + part.label),
                  React.createElement('h5', { id: prefix + '-DetailTitle', tabIndex: -1 }, part.title),
                  React.createElement('p', null, React.createElement('strong', null, 'Look for: '), part.look)
                ),
                React.createElement('div', { className: 'wc-gw-announcement', role: 'status', 'aria-live': 'polite', 'aria-atomic': true }, part.label + ' selected. ' + part.title),
                React.createElement('div', { className: 'wc-gw-diagrams' },
                  React.createElement('figure', { 'data-gw-figure': 'cutaway' },
                    React.createElement('figcaption', null, 'Find it in the cutaway'),
                    React.createElement('div', { className: 'wc-gw-cutaway' },
                      React.createElement('svg', { viewBox: '0 0 120 210', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': true, focusable: 'false' },
                        React.createElement('rect', { className: 'wc-gw-soil', x: 3, y: 3, width: 114, height: 204, rx: 10 }),
                        React.createElement('path', { className: 'wc-gw-water', 'data-gw-material': 'water', d: 'M5 112Q35 107 60 112T115 112V196Q115 207 104 207H16Q5 207 5 196Z' }),
                        React.createElement('path', { className: 'wc-gw-water', 'data-gw-cue': 'capillary-fringe', d: 'M5 93Q28 96 60 91T115 94V112H5Z' }),
                        React.createElement('path', { className: 'wc-gw-water', 'data-gw-cue': 'soil-water', d: 'M7 31Q25 36 43 28L42 43Q21 48 7 41ZM61 57Q81 51 113 58V69Q81 72 62 66Z' }),
                        [[24,20],[66,28],[101,20],[29,65],[77,75],[105,88],[26,103],[67,106],[29,145],[79,145],[105,172],[33,189],[76,189]].map(function(position, index) { return grain(position[0], position[1], 10, index); }),
                        React.createElement('path', { className: 'wc-gw-boundary', 'data-gw-cue': 'water-table', d: 'M5 112Q35 107 60 112T115 112' }),
                        React.createElement('rect', { className: 'wc-gw-outline', 'data-gw-cue': 'inspected-zone', x: 3, y: part.id === 'soil' ? 3 : part.id === 'boundary' ? 87 : 121, width: 114, height: part.id === 'soil' ? 80 : part.id === 'boundary' ? 33 : 86, rx: 8 })
                      ),
                      React.createElement('div', { className: 'wc-gw-layer-labels' },
                        [['soil','Air + water'],['boundary','Water table'],['groundwater','Water in pores']].map(function(item) { return React.createElement('div', { key: item[0], 'data-gw-layer': item[0], 'data-active': String(part.id === item[0]) }, item[1]); })
                      )
                    ),
                    React.createElement('p', { className: 'wc-gw-scope' }, 'Dashed line: schematic water table. The thin band above it represents the capillary fringe.')
                  ),
                  React.createElement('figure', { 'data-gw-figure': 'pores' },
                    React.createElement('figcaption', null, 'Magnified · ' + part.condition),
                    React.createElement('svg', { className: 'wc-gw-pore-view', viewBox: '0 0 260 210', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': true, focusable: 'false', 'data-gw-pore-state': part.id },
                      React.createElement('rect', { className: 'wc-gw-air', 'data-gw-material': 'air', x: 2, y: 2, width: 256, height: 206, rx: 12 }),
                      part.id === 'soil' ? React.createElement('path', { className: 'wc-gw-water', 'data-gw-material': 'water', 'data-gw-cue': 'partial-water', d: 'M3 36Q45 54 73 34L78 60Q43 82 3 55ZM148 58Q207 47 257 55V77Q206 88 151 76ZM54 106Q105 102 138 116L135 133Q99 128 56 126ZM3 180Q27 182 46 176L56 208H14Q3 208 3 196ZM163 184Q205 172 257 182V196Q257 208 244 208H159Z' })
                        : React.createElement('path', { className: 'wc-gw-water', 'data-gw-material': 'water', 'data-gw-cue': part.id === 'boundary' ? 'capillary-water' : 'filled-pores', d: part.id === 'boundary' ? 'M3 89Q54 98 89 86T166 91T257 88V196Q257 208 244 208H14Q3 208 3 196Z' : 'M14 2H246Q258 2 258 14V196Q258 208 246 208H14Q2 208 2 196V14Q2 2 14 2Z' }),
                      [[28,30],[92,25],[166,30],[228,28],[45,88],[123,88],[203,88],[29,165],[105,165],[184,165],[239,170]].map(function(position, index) { return grain(position[0], position[1], 19 + index % 3, index); }),
                      part.id === 'soil' && [[75,40],[164,106],[69,169]].map(function(position, index) { return React.createElement('g', { key: index, 'data-gw-cue': 'open-air' }, React.createElement('circle', { className: 'wc-gw-pore-dot', cx: position[0], cy: position[1], r: 2 }), React.createElement('circle', { className: 'wc-gw-pore-dot', cx: position[0]+5, cy: position[1]-4, r: 1.5 })); }),
                      part.id === 'boundary' && React.createElement('path', { className: 'wc-gw-boundary', 'data-gw-cue': 'water-table', d: 'M4 116H256' }),
                      part.id === 'groundwater' && React.createElement('path', { className: 'wc-gw-flow', style: { stroke: 'var(--gw-air)' }, 'data-gw-cue': 'possible-flow', d: 'M24 118Q60 128 84 119T141 119T218 121L232 121m-8-6 8 6-8 6' })
                    ),
                    React.createElement('p', { className: 'wc-gw-scope' }, part.reading)
                  )
                ),
                React.createElement('ul', { className: 'wc-gw-key', 'aria-label': 'Diagram key' }, [['grain','Solid grains · hatched'],['water','Liquid water'],['air','Air space · open']].map(function(item) { return React.createElement('li', { key: item[0] }, React.createElement('span', { className: 'wc-gw-swatch', 'data-material': item[0], 'aria-hidden': true }), item[1]); })),
                React.createElement('details', { className: 'wc-gw-context' },
                  React.createElement('summary', null, 'Understand this zone'),
                  React.createElement('p', null, part.detail)
                ),
                React.createElement('details', { className: 'wc-gw-check' },
                  React.createElement('summary', null, 'Check the distinction'),
                  React.createElement('h6', { id: prefix + '-Question' }, 'Does seeing water in soil establish groundwater recharge?'),
                  React.createElement('div', { className: 'wc-gw-answers', role: 'group', 'aria-labelledby': prefix + '-Question' }, WCGroundwaterLens.choices().map(function(item) { return React.createElement('button', { key: item.id, type: 'button', 'data-gw-answer': item.id, 'aria-pressed': reading.answer === item.id, onClick: function() { answer(item.id); } }, item.label); })),
                  React.createElement('div', { className: 'wc-gw-feedback', role: 'status', 'data-gw-result': reading.result },
                    React.createElement('h6', { id: prefix + '-FeedbackTitle', tabIndex: -1 }, reading.result === 'supported' ? 'Your interpretation fits the evidence.' : reading.result === 'retry' ? 'Look at the pore spaces again.' : 'Choose an interpretation.'),
                    React.createElement('p', null, feedback)
                  )
                ),
                React.createElement('p', { className: 'wc-gw-scope' }, 'Magnified schematic of an unconfined groundwater setting. Grain sizes, layer depths and arrows are illustrative. This view does not measure recharge, water-table depth or travel time.'),
                React.createElement('a', { href: 'https://pubs.usgs.gov/circ/circ1186/html/gen_facts.html', target: '_blank', rel: 'noopener noreferrer' }, 'Read the USGS explanation of groundwater zones')
              )
            );
          }