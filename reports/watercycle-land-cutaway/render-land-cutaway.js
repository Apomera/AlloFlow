          function renderWcLandCutaway() {
            var rain = Math.max(0, Math.min(100, landRainIntensity));
            var wetness = Math.max(0, Math.min(100, landSaturation));
            var cover = ['forest', 'grass', 'urban'].indexOf(landCover) >= 0 ? landCover : 'grass';
            var slope = ['gentle', 'moderate', 'steep'].indexOf(landSlope) >= 0 ? landSlope : 'moderate';
            var permeability = ['low', 'medium', 'high'].indexOf(landPermeability) >= 0 ? landPermeability : 'medium';
            var tilt = { gentle: 8, moderate: 30, steep: 66 }[slope];
            function surface(x) { return 112 + tilt * (x - 28) / 424 + Math.sin(x / 95) * 1.2; }
            function topPath(offset) {
              return 'M24 ' + (surface(24) + offset) + ' Q128 ' + (surface(128) + offset) + ' 236 ' + (surface(236) + offset) + ' T456 ' + (surface(456) + offset);
            }
            var soilPath = topPath(0) + 'V264H24Z';
            var features = [
              { input: 'landRainIntensity', title: 'Rainfall intensity', value: rain + '/100', detail: rain === 0 ? 'No new rain' : rain < 35 ? 'Lighter rain setting' : rain > 70 ? 'Heavier rain setting' : 'Moderate rain setting' },
              { input: 'landSaturation', title: 'Soil saturation', value: wetness + '/100', detail: 'Wetness before this rain' },
              { input: 'landCover', title: 'Land cover', value: { forest: 'Forest', grass: 'Grass', urban: 'Urban' }[cover], detail: cover === 'urban' ? 'Built surfaces and gaps' : cover === 'forest' ? 'Canopy and rooted ground' : 'Grass and rooted ground' },
              { input: 'landPermeability', title: 'Soil permeability', value: { low: 'Low', medium: 'Medium', high: 'High' }[permeability], detail: permeability === 'high' ? 'Water passes more easily' : permeability === 'low' ? 'Water passes less easily' : 'Intermediate ease of passage' },
              { input: 'landSlope', title: 'Slope', value: { gentle: 'Gentle', moderate: 'Moderate', steep: 'Steep' }[slope], detail: 'Downhill surface direction' }
            ];
            var grains = [[55,187,14],[113,224,16],[169,187,15],[236,240,15],[298,193,17],[359,247,12],[421,216,14]];
            var pores = [[84,202],[143,208],[205,211],[267,215],[330,220],[390,223]];
            var rainCount = rain > 0 ? 4 + Math.round(rain * 0.14) : 0;
            var runoffStartX = 156, runoffStartY = surface(runoffStartX) - 31;
            var runoffSlope = (surface(runoffStartX + 86) - surface(runoffStartX)) / 86;
            var runoffUnitX = 1 / Math.sqrt(1 + runoffSlope * runoffSlope), runoffUnitY = runoffSlope * runoffUnitX;
            var runoffEndX = runoffStartX + 86 * runoffUnitX, runoffEndY = runoffStartY + 86 * runoffUnitY;
            var runoffPath = 'M' + runoffStartX + ' ' + runoffStartY + 'L' + runoffEndX + ' ' + runoffEndY
              + 'M' + (runoffEndX - 9 * runoffUnitX + 7 * runoffUnitY) + ' ' + (runoffEndY - 9 * runoffUnitY - 7 * runoffUnitX)
              + 'L' + runoffEndX + ' ' + runoffEndY + 'L' + (runoffEndX - 9 * runoffUnitX - 7 * runoffUnitY) + ' ' + (runoffEndY - 9 * runoffUnitY + 7 * runoffUnitX);
            var entryY = surface(195) - 11;
            return React.createElement('figure', {
              className: 'wc-land-cutaway' + (isDark ? ' is-dark' : '') + (isContrast ? ' is-contrast' : ''),
              'data-land-cutaway': 'true', 'data-cutaway-rain': rain, 'data-cutaway-saturation': wetness,
              'data-cutaway-cover': cover, 'data-cutaway-permeability': permeability, 'data-cutaway-slope': slope,
              'aria-labelledby': 'wcLandCutawayTitle', 'aria-describedby': 'wcLandCutawayScope'
            },
              React.createElement('style', null, WC_LAND_CUTAWAY_STYLE),
              React.createElement('figcaption', { className: 'wc-land-cutaway-head' },
                React.createElement('span', { className: 'wc-land-cutaway-kicker' }, 'Your landscape'),
                React.createElement('h5', { id: 'wcLandCutawayTitle', tabIndex: -1 }, 'See what shapes the pathways'),
                React.createElement('p', null, 'Select a feature to adjust that condition. Compare both teaching indices below, then compare with your saved baseline.')
              ),
              React.createElement('div', { className: 'wc-land-cutaway-scene' },
                React.createElement('svg', { viewBox: '0 0 480 280', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false' },
                  React.createElement('defs', null,
                    React.createElement('linearGradient', { id: 'wcLandSceneSky', x1: '0', y1: '0', x2: '0', y2: '1' },
                      React.createElement('stop', { offset: '0', stopColor: 'var(--lc-sky)' }), React.createElement('stop', { offset: '1', stopColor: 'var(--lc-horizon)' })),
                    React.createElement('linearGradient', { id: 'wcLandSceneSoil', x1: '0', y1: '0', x2: '0', y2: '1' },
                      React.createElement('stop', { offset: '0', stopColor: 'var(--lc-soil)' }), React.createElement('stop', { offset: '1', stopColor: 'var(--lc-depth)' })),
                    React.createElement('clipPath', { id: 'wcLandSceneClip' }, React.createElement('path', { d: soilPath }))
                  ),
                  React.createElement('rect', { className: 'wc-lc-sky', x: 0, y: 0, width: 480, height: 280, rx: 16 }),
                  React.createElement('path', { className: 'wc-lc-horizon', d: 'M0 90Q80 58 151 84T310 72T480 91V160H0Z' }),
                  React.createElement('path', { className: 'wc-lc-cloud', d: 'M277 37Q278 22 293 23Q302 8 319 19Q337 14 343 31Q360 30 362 41Q327 51 277 45Z' }),
                  React.createElement('g', { 'data-cutaway-cue': 'rain', 'data-rain-marks': rainCount },
                    Array.from({ length: rainCount }, function(_, i) { var x = 37 + i * 397 / Math.max(1, rainCount - 1), y = 16 + i % 3 * 21; return React.createElement('path', { key: i, className: 'wc-lc-rain', d: 'M' + x + ' ' + y + 'l-5 13' }); })
                  ),
                  React.createElement('path', { className: 'wc-lc-soil', 'data-cutaway-cue': 'surface', d: soilPath }),
                  React.createElement('g', { clipPath: 'url(#wcLandSceneClip)' },
                    React.createElement('path', { className: 'wc-lc-topsoil', d: topPath(0) + 'L456 ' + (surface(456) + 20) + ' Q350 ' + (surface(350) + 20) + ' 236 ' + (surface(236) + 20) + ' T24 ' + (surface(24) + 20) + 'Z' }),
                    React.createElement('path', { className: 'wc-lc-stratum', d: topPath(67) }),
                    React.createElement('rect', { className: 'wc-lc-moisture', 'data-cutaway-cue': 'moisture', 'data-soil-wetness': wetness, x: 24, y: 110, width: 432, height: 154, opacity: wetness / 100 * 0.2 }),
                    cover !== 'urban' && [67,146,277,367].map(function(x, i) { var y = surface(x) + 4; return React.createElement('path', { key: i, className: 'wc-lc-roots', d: 'M' + x + ' ' + y + 'l-5 26m5-26 9 35m-5-16 12 7m-20-6-9 9' }); }),
                    React.createElement('path', { className: 'wc-lc-connections', 'data-cutaway-cue': 'permeability', 'data-ease-of-passage': permeability, d: 'M84 202Q117 197 143 208T205 211T267 215T330 220T390 223', strokeDasharray: permeability === 'low' ? '3 9' : permeability === 'medium' ? '7 5' : undefined }),
                    grains.map(function(g, i) { return React.createElement('g', { key: i, 'data-cutaway-grain': i },
                      React.createElement('ellipse', { className: 'wc-lc-grain', cx: g[0], cy: g[1], rx: g[2], ry: g[2] * 0.7 }),
                      React.createElement('path', { className: 'wc-lc-hatch', d: 'M' + (g[0] - 7) + ' ' + (g[1] + 4) + 'l13-8m-11 1 8-5' })); }),
                    pores.map(function(p, i) { return React.createElement('g', { key: i, 'data-cutaway-pore': i },
                      React.createElement('circle', { className: 'wc-lc-pore', cx: p[0], cy: p[1], r: 7 }),
                      React.createElement('circle', { className: 'wc-lc-pore-water', cx: p[0], cy: p[1], r: 6, opacity: wetness / 100 })); })
                  ),
                  cover === 'forest' ? [62,126,268,343,416].map(function(x, i) { var y = surface(x); return React.createElement('g', { key: i, 'data-cutaway-cover-cue': 'forest' },
                    React.createElement('path', { className: 'wc-lc-trunk', d: 'M' + x + ' ' + y + 'v-40m0 18-11-11m11 5 9-12' }),
                    React.createElement('ellipse', { className: 'wc-lc-canopy', cx: x - 9, cy: y - 46, rx: 17, ry: 22 }),
                    React.createElement('ellipse', { className: 'wc-lc-canopy is-light', cx: x + 8, cy: y - 53, rx: 19, ry: 24 })); })
                    : cover === 'urban' ? [64,262,386].map(function(x, i) { var y = surface(x), height = [43,58,36][i]; return React.createElement('g', { key: i, 'data-cutaway-cover-cue': 'urban' },
                      React.createElement('path', { className: 'wc-lc-building', d: 'M' + x + ' ' + (y - 3) + 'H' + (x + 38) + 'V' + surface(x + 38) + 'L' + x + ' ' + y + 'Z' }),
                      React.createElement('rect', { className: 'wc-lc-building', x: x, y: y - height, width: 38, height: height, rx: 3 }),
                      React.createElement('path', { className: 'wc-lc-roof', d: 'M' + (x - 3) + ' ' + (y - height) + 'l22-12 22 12Z' }),
                      [12,25].map(function(dx) { return React.createElement('rect', { key: dx, className: 'wc-lc-window', x: x + dx, y: y - height + 12, width: 6, height: 8, rx: 1 }); })); })
                    : [47,78,112,145,261,298,337,373,423].map(function(x, i) { var y = surface(x); return React.createElement('path', { key: i, className: 'wc-lc-grass', 'data-cutaway-cover-cue': 'grass', d: 'M' + x + ' ' + y + 'l-4-12m4 12 3-16m-3 16 8-8' }); }),
                  React.createElement('path', { className: cover === 'urban' ? 'wc-lc-paving' : 'wc-lc-turf', d: topPath(0) }),
                  cover === 'urban' && React.createElement('path', { className: 'wc-lc-gap', d: 'M181 ' + surface(181) + 'L210 ' + surface(210) }),
                  rain > 0 && React.createElement('g', { className: 'wc-lc-paths' },
                    React.createElement('path', { className: 'wc-lc-runoff', 'data-cutaway-cue': 'runoff', d: runoffPath }),
                    React.createElement('path', { className: 'wc-lc-infiltration', 'data-cutaway-cue': 'infiltration', d: 'M195 ' + entryY + 'V' + (entryY + 86) + 'm-7-9 7 9 7-9' })
                  )
                ),
                React.createElement('p', { className: 'wc-land-cutaway-weather', 'data-cutaway-weather': rain === 0 ? 'no-rain' : 'rain' }, rain === 0 ? 'No new rain · existing soil wetness remains.' : 'Rain reaches the surface · compare the two possible pathways.')
              ),
              React.createElement('div', { className: 'wc-land-cutaway-key', 'aria-label': 'Land pathway diagram key' },
                React.createElement('span', null, React.createElement('i', { className: 'is-runoff', 'aria-hidden': true }), 'Runoff · over the surface'),
                React.createElement('span', null, React.createElement('i', { className: 'is-infiltration', 'aria-hidden': true }), 'Infiltration · into soil pores')
              ),
              React.createElement('div', { className: 'wc-land-cutaway-features', role: 'group', 'aria-label': 'Adjust a landscape feature' }, features.map(function(feature) {
                return React.createElement('button', { key: feature.input, type: 'button', 'data-cutaway-input': feature.input,
                  'aria-label': 'Adjust ' + feature.title.toLowerCase() + ', currently ' + feature.value,
                  onClick: function() { openWcClimateControls(feature.input); } },
                  React.createElement('span', { className: 'wc-land-cutaway-feature-title' }, feature.title),
                  React.createElement('strong', null, feature.value, React.createElement('span', { className: 'wc-land-cutaway-link', 'aria-hidden': true }, '↗')),
                  React.createElement('small', null, feature.detail));
              })),
              React.createElement('p', { id: 'wcLandCutawayScope', className: 'wc-land-cutaway-scope' }, 'Illustrative land pathways. Arrows identify directions; the independent indices do not measure water amounts or groundwater recharge. Pore geometry is fixed; water tint illustrates the soil wetness setting.')
            );
          }
