                h('figure', { style: { margin: '0 0 14px', padding: 10, borderRadius: 10, background: '#020617', border: '1px solid #164e63' } },
                  h('svg', { id: 'astronomy-inflation-diagram', viewBox: '0 0 600 180', role: 'img', 'aria-labelledby': 'astronomy-inflation-title astronomy-inflation-desc', style: { width: '100%', height: 'auto', display: 'block' } },
                    h('title', { id: 'astronomy-inflation-title' }, 'Schematic of cosmic inflation'),
                    h('desc', { id: 'astronomy-inflation-desc' }, 'A tiny causally connected patch expands exponentially by at least 10 to the 26th power, stretching small quantum fluctuations across a vastly larger region.'),
                    h('defs', null,
                      h('marker', { id: 'astronomy-inflation-arrow', markerWidth: 10, markerHeight: 10, refX: 8, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' },
                        h('path', { d: 'M0,0 L0,6 L9,3 z', fill: '#22d3ee' })
                      )
                    ),
                    h('circle', { cx: 92, cy: 82, r: 24, fill: 'rgba(34,211,238,0.18)', stroke: '#67e8f9', strokeWidth: 2 }),
                    [[84, 75], [98, 88], [91, 94], [101, 70]].map(function(point, i) {
                      return h('circle', { key: 'before-' + i, cx: point[0], cy: point[1], r: 2.5, fill: '#fef08a' });
                    }),
                    h('text', { x: 92, y: 126, textAnchor: 'middle', fill: '#a5f3fc', fontSize: 12, fontWeight: 700 }, 'Connected patch'),
                    h('line', { x1: 145, y1: 82, x2: 315, y2: 82, stroke: '#22d3ee', strokeWidth: 3, markerEnd: 'url(#astronomy-inflation-arrow)' }),
                    h('text', { x: 230, y: 61, textAnchor: 'middle', fill: '#67e8f9', fontSize: 12, fontWeight: 700 }, 'exponential expansion'),
                    h('text', { x: 230, y: 108, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11 }, 'at least 10²⁶×'),
                    h('ellipse', { cx: 450, cy: 82, rx: 105, ry: 64, fill: 'rgba(99,102,241,0.16)', stroke: '#818cf8', strokeWidth: 2 }),
                    [[386, 57], [420, 95], [451, 44], [482, 106], [515, 66], [457, 82], [398, 111], [502, 92]].map(function(point, i) {
                      return h('circle', { key: 'after-' + i, cx: point[0], cy: point[1], r: 3, fill: '#fef08a' });
                    }),
                    h('text', { x: 450, y: 166, textAnchor: 'middle', fill: '#c7d2fe', fontSize: 12, fontWeight: 700 }, 'Fluctuations stretched to cosmic scales')
                  ),
                  h('figcaption', { style: { marginTop: 5, color: '#94a3b8', fontSize: 11, textAlign: 'center' } }, 'Conceptual diagram — size and time are not to scale.')
                ),
