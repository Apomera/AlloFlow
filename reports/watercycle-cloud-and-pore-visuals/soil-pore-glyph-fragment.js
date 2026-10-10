              // An illustrative partially wet pore configuration with open air gaps.
              // This schematic does not prescribe saturation or establish recharge.
              lines = [
                path('M24 6v10m-4-4 4 4 4-4', 'soil-entry', { 'data-diagram-cue': 'infiltration-entry' }),
                React.createElement('path', { key: 'pore-water', d: 'M20 25Q24 27 28 25L29 32Q24 36 19 32Z', fill: 'currentColor', 'data-soil-material': 'water', 'data-diagram-cue': 'partial-pore-water', 'data-water-symbol': 'liquid' }),
                React.createElement('path', { key: 'water-film', d: 'M9 26Q13 29 18 26V29Q13 32 9 29Z', fill: 'currentColor', 'data-soil-material': 'water', 'data-diagram-cue': 'water-film', 'data-water-symbol': 'liquid' }),
                [[13,23],[35,23],[14,38],[34,38]].map(function(position, index) {
                  return React.createElement('g', { key: 'grain-' + index, 'data-soil-material': 'grain' },
                    React.createElement('ellipse', { cx: position[0], cy: position[1], rx: 5, ry: 4, fill: 'currentColor', fillOpacity: 0.1, stroke: 'currentColor', strokeWidth: 1.6 }),
                    path('M' + (position[0] - 3) + ' ' + (position[1] + 1) + 'l4-3m-1 4 3-3', 'hatch-' + index, { strokeWidth: 1.2 })
                  );
                })
              ];
