
      function renderCosmicCalendar() {
        var m = cosmicCalendarModel(d), CC_DATES = m.events, topic = m.selected, sel = m.selectedId;
        var bg = astronomyContrast ? '#000' : '#091323', border = astronomyContrast ? '#fbbf24' : '#475569';
        var gold = '#fdba74', cyan = '#67e8f9', muted = '#cbd5e1';
        var box = { padding: 12, minWidth: 0, borderRadius: 12, background: bg, border: '1px solid ' + border };
        var prose = { fontSize: 13, lineHeight: 1.75, color: muted, margin: '8px 0' };
        function text(key, fallback) { return __alloT('stem.astronomy.cc_' + key, fallback); }
        function eventText(event, field) { return text(event.id + '_' + field, event[field]); }
        function number(value) { return value.toLocaleString('en-US', { maximumFractionDigits: value < 1 && value > 0 ? 4 : 2 }); }
        function years(value) { return (value >= 1e9 ? (value / 1e9).toLocaleString('en-US', { maximumFractionDigits: 6 }) : number(value >= 1e6 ? value / 1e6 : value)) + ' ' +
          (value >= 1e9 ? text('billion_years', 'billion years') : value >= 1e6 ? text('million_years', 'million years') : value === 1 ? text('year', 'year') : text('years', 'years')); }
        function button(label, action, on, key) {
          return h('button', { key: key, type: 'button', onClick: action, 'aria-pressed': on, className: 'astr-focus',
            style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              border: '2px solid ' + (on ? gold : border), color: on ? '#020617' : '#f1f5f9', background: on ? gold : bg } }, label);
        }
        function selectCCTopic(index, moveFocus) {
          var normalizedIndex = (index + CC_DATES.length) % CC_DATES.length;
          var nextTopic = CC_DATES[normalizedIndex];
          upd({ selectedCC: nextTopic.id });
          if (moveFocus && typeof document !== 'undefined') {
            setTimeout(function() {
              var target = document.getElementById('astronomy-cc-tab-' + nextTopic.id);
              if (target) target.focus();
            }, 0);
          }
        }
        function onCCTopicKeyDown(e, index) {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          var nextIndex = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = index + 1;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = index - 1;
          else if (e.key === 'Home') nextIndex = 0;
          else if (e.key === 'End') nextIndex = CC_DATES.length - 1;
          if (nextIndex == null) return;
          e.preventDefault(); selectCCTopic(nextIndex, true);
        }
        function metric(key, label, value, display) {
          return h('div', { key: key, 'data-calendar-metric': key, 'data-value': value, style: Object.assign({}, box, { padding: 10 }) },
            h('div', { style: { color: muted, fontSize: 12, marginBottom: 5 } }, label),
            h('strong', { style: { color: '#ffedd5', fontSize: 16, overflowWrap: 'anywhere' } }, display));
        }
        var rows = m.events.filter(function(e) { return e.visible; });
        var zoomName = m.zoom === 'hour' ? text('final_hour', 'Final cosmic hour') : m.zoom === 'second' ? text('final_second', 'Final cosmic second') : text('final_minute', 'Final cosmic minute');
        var zoomHeight = 70 + (rows.length + 1) * 100;
        function trackRow(row, i, lifetime) {
          var y = 70 + i * 100, fraction = lifetime ? m.lifetimeZoomFraction : row.zoomFraction;
          var active = !lifetime && row.id === sel, color = lifetime ? cyan : active ? gold : '#e2e8f0';
          var x = 30 + 300 * fraction, label = lifetime ? text('lifetime_example', 'Lifetime example') : eventText(row, 'name');
          var remaining = lifetime ? m.lifetime.beforeEndSeconds : row.position.beforeEndSeconds;
          var props = { key: lifetime ? 'lifetime' : row.id, transform: 'translate(0 ' + y + ')',
            'data-calendar-row': lifetime ? 'lifetime' : row.id, 'data-before-end': remaining, 'data-marker-x': x };
          if (!lifetime) {
            props.id = 'astronomy-cc-zoom-' + row.id; props.role = 'button'; props.tabIndex = 0; props.className = 'astr-focus';
            props['aria-pressed'] = active; props['aria-label'] = label + ': ' + number(remaining) + ' ' + text('seconds_before_end', 'cosmic seconds before year end');
            props.onClick = function() { selectCCTopic(row.index, false); };
            props.onKeyDown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCCTopic(row.index, false); } };
            props.style = { cursor: 'pointer' };
          }
          var range = !lifetime && row.range;
          var earlyX = range ? 30 + 300 * Math.max(0, 1 - range.early.beforeEndSeconds / m.windowSeconds) : x;
          var lateX = range ? 30 + 300 * Math.min(1, 1 - range.late.beforeEndSeconds / m.windowSeconds) : x;
          return h('g', props,
            h('rect', { x: 5, y: -2, width: 350, height: 94, rx: 8, fill: active ? '#29180a' : bg, stroke: active ? gold : border, strokeWidth: active ? 2 : 1 }),
            h('text', { x: 18, y: 24, fill: color, fontSize: 24, fontWeight: 700 }, label),
            h('line', { x1: 30, x2: 330, y1: 46, y2: 46, stroke: '#64748b', strokeWidth: 3 }),
            lifetime ? h('line', { x1: x, x2: 330, y1: 46, y2: 46, stroke: cyan, strokeWidth: 8 }) : null,
            range ? h('rect', { x: earlyX, y: 38, width: Math.max(0, lateX - earlyX), height: 16, fill: '#f59e0b', fillOpacity: 0.4, 'data-calendar-range': row.kind }) : null,
            h('circle', { cx: x, cy: 46, r: 6, fill: color, stroke: bg, strokeWidth: 2, 'data-calendar-marker': lifetime ? 'lifetime' : row.id }),
            h('text', { x: 18, y: 79, fill: muted, fontSize: 22 }, number(remaining) + ' ' + text('seconds_remaining', 'cosmic s before end'))
          );
        }
        var yearX = 30 + 300 * topic.position.yearFraction;
        return h('div', { id: 'astronomy-calendar-lab', style: { background: bg, color: '#f1f5f9', minWidth: 0, padding: 12, borderRadius: 12 } },
          h('p', { style: Object.assign({}, prose, { marginTop: 0 }) }, text('intro', 'Compress 13.8 billion years into a 365-day year. January 1 begins with the Big Bang; the present sits exactly at year end. Choose a milestone, then zoom in to see recent history.')),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.astronomy.a11y_cosmic_calendar_events', 'Cosmic Calendar events'), style: { display: 'flex', flexWrap: 'wrap', gap: 7, margin: '12px 0' } },
            CC_DATES.map(function(e, index) {
              var on = e.id === sel;
              return h('button', { id: 'astronomy-cc-tab-' + e.id, key: e.id, type: 'button', role: 'tab',
                'aria-selected': on ? 'true' : 'false', 'aria-controls': 'astronomy-cc-panel', tabIndex: on ? 0 : -1,
                onClick: function() { selectCCTopic(index, false); }, onKeyDown: function(ev) { onCCTopicKeyDown(ev, index); }, className: 'astr-focus',
                style: { minHeight: 44, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: on ? gold : '#1e293b', color: on ? '#020617' : '#f1f5f9', border: '2px solid ' + (on ? gold : border) } }, eventText(e, 'name'));
            })),
          h('div', { id: 'astronomy-cc-panel', role: 'tabpanel', 'aria-labelledby': 'astronomy-cc-tab-' + sel, tabIndex: 0, className: 'astr-focus', style: box },
            h('h3', { style: { color: gold, fontSize: 18, margin: '0 0 8px' } }, eventText(topic, 'name')),
            h('div', { 'data-calendar-date': sel, style: { color: '#ffedd5', fontSize: 17, fontWeight: 700, lineHeight: 1.6 } }, topic.position.date),
            h('p', { style: prose }, eventText(topic, 'story')),
            h('p', { 'data-calendar-basis': topic.kind, style: Object.assign({}, prose, { borderLeft: '3px solid ' + gold, paddingLeft: 10 }) }, eventText(topic, 'basis')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: 8 } },
              metric('lookbackYears', text('years_before_present', 'Time before the present'), topic.position.lookbackYears, years(topic.position.lookbackYears)),
              metric('elapsedYears', text('since_big_bang', 'Time since the Big Bang'), topic.position.elapsedYears, years(topic.position.elapsedYears)),
              metric('beforeEndSeconds', text('before_end', 'Time before cosmic year end'), topic.position.beforeEndSeconds, number(topic.position.beforeEndSeconds) + ' ' + text('cosmic_seconds', 'cosmic seconds'))),
            h('a', { href: topic.href, target: '_blank', rel: 'noopener noreferrer', className: 'astr-focus',
              style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, color: cyan, fontSize: 13, lineHeight: 1.6, overflowWrap: 'anywhere' } }, eventText(topic, 'source'))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 12, marginTop: 12, alignItems: 'start' } },
            h('figure', { style: Object.assign({}, box, { margin: 0, padding: 8 }) },
              h('h4', { style: { margin: '4px 2px 8px', fontSize: 15, color: gold } }, text('full_year', 'Full cosmic year')),
              h('svg', { id: 'astronomy-cosmic-calendar-diagram', viewBox: '0 0 360 270', role: 'img', 'aria-labelledby': 'astronomy-cc-title astronomy-cc-desc',
                'data-selected': sel, 'data-marker-x': yearX, style: { display: 'block', width: '100%', height: 'auto' } },
                h('title', { id: 'astronomy-cc-title' }, text('year_title', 'Cosmic Calendar timeline')),
                h('desc', { id: 'astronomy-cc-desc' }, text('year_desc', 'All markers use the same linear conversion from real years to a 365-day calendar. The orange marker identifies the selected milestone. Orange bands show the selected formation phase or quoted age uncertainty.')),
                h('text', { x: 30, y: 30, fill: muted, fontSize: 24 }, text('year_scale', '13.8 billion years → 365 days')),
                h('text', { x: 30, y: 72, fill: muted, fontSize: 22 }, text('beginning', 'Beginning')),
                h('text', { x: 330, y: 72, textAnchor: 'end', fill: muted, fontSize: 22 }, text('present', 'Present')),
                h('line', { x1: 30, x2: 330, y1: 104, y2: 104, stroke: '#64748b', strokeWidth: 6 }),
                topic.range ? h('rect', { x: 30 + 300 * topic.range.early.yearFraction, y: 91, width: 300 * (topic.range.late.yearFraction - topic.range.early.yearFraction), height: 26,
                  fill: '#f59e0b', fillOpacity: 0.4, 'data-calendar-range': topic.kind }) : null,
                m.events.map(function(e) { return h('line', { key: e.id, x1: 30 + 300 * e.position.yearFraction, x2: 30 + 300 * e.position.yearFraction,
                  y1: 97, y2: 111, stroke: '#e2e8f0', strokeWidth: 2 }); }),
                h('line', { x1: yearX, x2: yearX, y1: 85, y2: 123, stroke: gold, strokeWidth: 3 }),
                h('circle', { cx: yearX, cy: 104, r: 7, fill: gold, stroke: bg, strokeWidth: 2, 'data-calendar-marker': sel }),
                [{ day: 0, label: 'Jan 1' }, { day: 90, label: 'Apr 1' }, { day: 181, label: 'Jul 1' }, { day: 273, label: 'Oct 1' }, { day: 365, label: text('end', 'End') }].map(function(t, i) {
                  var x = 30 + 300 * t.day / 365;
                  return h('g', { key: t.day }, h('line', { x1: x, x2: x, y1: 129, y2: 138, stroke: muted }),
                    h('text', { x: x, y: 166, textAnchor: 'middle', fill: muted, fontSize: 22 }, t.label));
                }),
                h('text', { x: 30, y: 216, fill: gold, fontSize: 24, fontWeight: 700 }, eventText(topic, 'name')),
                h('text', { x: 30, y: 250, fill: muted, fontSize: 22 }, text('orange_selected', 'Orange = selected milestone'))),
              h('figcaption', { style: Object.assign({}, prose, { padding: '0 2px' }) }, text('year_caption', 'Recent events cluster at the year’s end. Marker width helps visibility and does not represent an event’s duration.'))),
            h('figure', { style: Object.assign({}, box, { margin: 0, padding: 8 }) },
              h('h4', { style: { margin: '4px 2px 8px', fontSize: 15, color: gold } }, zoomName),
              h('div', { role: 'group', 'aria-label': text('zoom_choices', 'Calendar zoom'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
                ['hour', 'minute', 'second'].map(function(z) { return button(z === 'hour' ? text('hour', 'Hour') : z === 'minute' ? text('minute', 'Minute') : text('second', 'Second'), function() { upd({ ccZoom: z }); }, m.zoom === z, z); })),
              h('svg', { id: 'astronomy-calendar-zoom', viewBox: '0 0 360 ' + zoomHeight, role: 'group',
                'aria-labelledby': 'astronomy-cc-zoom-title astronomy-cc-zoom-desc', 'data-window-seconds': m.windowSeconds,
                style: { display: 'block', width: '100%', height: 'auto' } },
                h('title', { id: 'astronomy-cc-zoom-title' }, zoomName),
                h('desc', { id: 'astronomy-cc-zoom-desc' }, text('zoom_desc', 'Each row has the same time scale. Select an event row with a click, touch, Enter or Space. The cyan interval shows the example lifetime ending at the present.')),
                [1, 0.5, 0].map(function(f, i) {
                  return h('text', { key: f, x: 30 + 300 * (1 - f), y: 27, fill: muted, fontSize: 22, textAnchor: i === 0 ? 'start' : i === 2 ? 'end' : 'middle' },
                    number(f * (m.zoom === 'hour' ? 60 : m.windowSeconds)));
                }),
                h('text', { x: 180, y: 56, textAnchor: 'middle', fill: muted, fontSize: 22 }, m.zoom === 'hour' ? text('minutes_before_end', 'Cosmic minutes before end') : text('seconds_axis', 'Cosmic seconds before end')),
                rows.map(function(e, i) { return trackRow(e, i, false); }), trackRow(null, rows.length, true)),
              h('figcaption', { id: 'astronomy-cc-zoom-status', 'data-selected-visible': topic.visible, style: Object.assign({}, prose, { padding: '0 2px' }) },
                topic.visible ? text('zoom_visible', 'The selected milestone is visible in this zoom.') : text('zoom_outside', 'The selected milestone is earlier than this zoom window. Its position remains on the full-year timeline.')))),
          h('div', { style: Object.assign({}, box, { marginTop: 12 }) },
            h('label', { htmlFor: 'astronomy-cc-lifetime', style: { color: cyan, fontSize: 15, fontWeight: 700 } },
              text('lifetime_label', 'Example lifetime') + ': ' + m.lifetimeYears + ' ' + (m.lifetimeYears === 1 ? text('year', 'year') : text('years', 'years'))),
            h('input', { id: 'astronomy-cc-lifetime', type: 'range', min: 0, max: 100, step: 1, value: m.lifetimeYears,
              className: 'astr-focus', 'aria-describedby': 'astronomy-cc-lifetime-help', 'aria-valuetext': m.lifetimeYears + ' ' + (m.lifetimeYears === 1 ? text('year', 'year') : text('years', 'years')),
              onChange: function(e) { upd({ ccLifetimeYears: Number(e.target.value) }); }, style: { width: '100%', minHeight: 44, accentColor: cyan } }),
            h('div', { role: 'group', 'aria-label': text('lifetime_presets', 'Lifetime examples'), style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
              [1, 12, 80].map(function(age) { return button(age + ' ' + (age === 1 ? text('year', 'year') : text('years', 'years')), function() { upd({ ccLifetimeYears: age }); }, m.lifetimeYears === age, age); })),
            h('p', { id: 'astronomy-cc-lifetime-help', 'data-calendar-lifetime-seconds': m.lifetime.beforeEndSeconds, style: prose },
              m.lifetimeYears + ' ' + (m.lifetimeYears === 1 ? text('year_equal', 'real year =') : text('years_equal', 'real years =')) + ' ' + number(m.lifetime.beforeEndSeconds) + ' ' + text('cosmic_seconds', 'cosmic seconds') + '. ' +
              text('lifetime_help', 'The cyan interval ends at the present. Choose Second to make it easier to see. Zero years collapses the interval to the end boundary.'))),
          h('details', { style: Object.assign({}, box, { marginTop: 12 }) },
            h('summary', { className: 'astr-focus', style: { minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: gold } },
              text('methods', 'Scale, sources and limits')),
            h('p', { style: prose }, text('formula', 'Cosmic seconds before year end = years before the present ÷ 13,800,000,000 × 31,536,000. The year has 365 days and February has 28 days. Months have their ordinary, unequal lengths.')),
            h('p', { style: prose }, '1 ' + text('cosmic_second_equals', 'cosmic second =') + ' ' + number(m.realYearsPerSecond) + ' ' + text('real_years', 'real years') + '.'),
            h('p', { style: prose }, text('precision', 'The clock shows the arithmetic to hundredths of a cosmic second. Scientific ages remain approximate or carry the quoted uncertainty. The rounded universe age is held fixed; its uncertainty is not propagated. Bands distinguish a formation phase from a dating uncertainty.')),
            h('p', { style: prose }, text('data_help', 'Milestone ages are saved with the simulator and work offline. Each event links to its source. This educational calendar uses a rounded modern age reference; its dates are recalculated rather than copied from an older calendar.'))));
      }

