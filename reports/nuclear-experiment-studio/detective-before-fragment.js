  function nkStudioTranslate(ctx) {
    return function (key, fallback, values) {
      var text;
      try { text = ctx.t && ctx.t('stem.nuclearlab.studio_' + key, fallback); } catch (_) {}
      if (text == null || text === 'stem.nuclearlab.studio_' + key) text = fallback;
      return String(text).replace(/\{(\w+)\}/g, function (match, name) {
        return values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match;
      });
    };
  }

  function nkStudioHint(h, nt, text, key) {
    return h('details', { key: key, className: 'ns-hint' }, h('summary', null, nt('hint_label', 'Need a nudge?')), h('p', { className: 'ns-note' }, text));
  }

  function NuclearStudioPrediction(props) {
    var h = props.ctx.React.createElement, nt = nkStudioTranslate(props.ctx);
    return h('details', { className: 'ns-prediction', open: !props.observed },
      h('summary', null, props.observed ? nt('prediction_summary', 'Your prediction: {choice}', { choice: props.value || nt('prediction_missing', 'Not recorded') }) : nt('predict_step', '1 / Predict')),
      props.children);
  }

  function nkStudioGuidance(h, nt, text, label, action) {
    return h('div', { className: 'ns-guidance', 'data-ns-guide': 'true' },
      h('p', { className: 'ns-note' }, h('strong', null, nt('guide_label', 'Next step')), ' · ', text),
      action ? h('button', { type: 'button', className: 'ns-secondary', 'data-ns-prepare': 'true', onClick: action }, label) : null);
  }

  function NuclearStudioReflection(props) {
    var h = props.ctx.React.createElement, nt = nkStudioTranslate(props.ctx);
    var note = typeof props.note === 'string' ? props.note.slice(0, 300) : '';
    var fieldId = 'ns-reflection-' + props.kind, helpId = fieldId + '-help';
    return h('details', { className: 'ns-reflection', 'data-ns-reflection': props.kind },
      h('summary', null, note ? nt('reflection_saved_title', 'Your takeaway') : nt('reflection_add_title', 'Add a takeaway (optional)')),
      h('p', { id: helpId, className: 'ns-note' }, nt('reflection_prompt', 'What did you notice? Put one idea you want to remember in your own words.')),
      h('label', { htmlFor: fieldId }, nt('reflection_label', 'My takeaway from {title}', { title: props.title })),
      h('textarea', { id: fieldId, rows: 3, maxLength: 300, value: note, 'aria-describedby': helpId, onChange: function (event) { props.onChange(event.target.value.slice(0, 300)); } }),
      h('p', { className: 'ns-note', role: 'status' }, note ? nt('reflection_kept', 'Note kept with this discovery.') : nt('reflection_optional', 'You can leave this blank and continue exploring.')),
      note ? h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange(''); } }, nt('reflection_clear', 'Clear this note')) : null);
  }

  function nkStudioHasWork(id, value) {
    var data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    var predictions = { decay: [16, 32, 48], distance: ['half', 'quarter', 'same'], shield: ['water', 'concrete', 'lead'], counting: ['same', 'vary'], rays: ['alpha', 'both', 'neither'], chain: ['stop', 'steady', 'grow'] };
    if (!predictions[id]) return false;
    if (predictions[id].indexOf(data.prediction) >= 0) return true;
    if ((id === 'decay' || id === 'chain') && Number.isInteger(data.step) && data.step > 0 && data.step <= 4) return true;
    var rows = Array.isArray(id === 'shield' ? data.trials : data.runs) ? (id === 'shield' ? data.trials : data.runs) : [];
    return rows.some(function (row) {
      if (id === 'shield') return row && ['water', 'concrete', 'lead'].indexOf(row.material) >= 0 && typeof row.thickness === 'number' && isFinite(row.thickness) && row.thickness >= 0 && row.thickness <= 10;
      if (id === 'counting') return Number.isInteger(row) && row >= 0 && row <= 1000;
      return (id === 'distance' ? [1, 2, 4] : id === 'chain' ? [.8, 1, 1.2] : id === 'rays' ? ['alpha-open', 'alpha-paper', 'gamma-paper'] : []).indexOf(row) >= 0;
    });
  }

  var NK_STUDIO_CSS = `
    .nk-workspace{--ns-bg:#0b1424;--ns-panel:#111f33;--ns-ink:#edf5ff;--ns-muted:#afc3dc;--ns-line:#3c536e;--ns-accent:#65e2ce;--ns-on:#052c29;color:var(--ns-ink);background:var(--ns-bg);border-radius:18px;padding:clamp(12px,2vw,24px);font-size:15px;line-height:1.55;min-width:0}
    .nk-workspace[data-theme=light]{--ns-bg:#f2f6fa;--ns-panel:#fff;--ns-ink:#182d46;--ns-muted:#49617b;--ns-line:#a9b8c9;--ns-accent:#006e62;--ns-on:#fff}
    .nk-workspace *{box-sizing:border-box}.nk-workspace button,.nk-workspace input,.nk-workspace textarea{font:inherit}.nk-workspace button{cursor:pointer;min-height:44px}.nk-workspace button:disabled{cursor:default;opacity:.55}
    .nk-workspace :is(button,input,textarea,a,summary):focus-visible,.nk-workspace [tabindex='-1']:focus{outline:3px solid #f59e0b;outline-offset:4px}
    .nk-workspace button,.nk-workspace a{touch-action:manipulation}.nk-workspace p,.nk-workspace h3,.nk-workspace h4,.nk-workspace h5{margin-top:0}
    .ns-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}.ns-nav button,.ns-choice,.ns-secondary{border:1px solid var(--ns-line);border-radius:10px;padding:9px 14px;background:var(--ns-panel);color:var(--ns-ink);font-weight:700}
    .ns-nav button[aria-pressed=true],.ns-choice[aria-pressed=true]{border:2px solid var(--ns-accent);padding:8px 13px;background:var(--ns-accent);color:var(--ns-on)}
    .ns-hero{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:22px}.ns-eyebrow{color:var(--ns-accent);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:6px}.ns-hero h3{font-size:clamp(23px,3vw,34px);line-height:1.2;letter-spacing:-.025em;margin:0 0 8px}.ns-hero p{color:var(--ns-muted);max-width:50ch;margin-bottom:0}
    .ns-progress{flex-shrink:0;border:1px solid var(--ns-line);border-radius:14px;padding:12px 16px;max-width:190px}.ns-progress strong{display:block;font-size:23px;color:var(--ns-accent)}.ns-progress span{display:block;color:var(--ns-muted);font-size:12px}
    .ns-missions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}.ns-mission{display:flex;gap:12px;text-align:left;align-items:center;padding:16px;border-radius:14px;background:var(--ns-panel);border:1px solid var(--ns-line);color:var(--ns-ink)}.ns-mission[aria-pressed=true]{border:2px solid var(--ns-accent);padding:15px;box-shadow:inset 4px 0 var(--ns-accent)}.ns-mission strong,.ns-mission small{display:block}.ns-mission small{color:var(--ns-muted);font-size:13px}.ns-mission-icon{font-size:28px;line-height:1.2}.ns-selected-mark{margin-left:auto;color:var(--ns-accent);font-size:20px}
    .ns-heading h4{font-size:23px;line-height:1.3;margin:0 0 6px}.ns-heading p{color:var(--ns-muted);margin-bottom:16px}.ns-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:18px;align-items:start}.ns-grid>*{min-width:0}
    .ns-scene{background:radial-gradient(ellipse at 50% 25%,#1d4660,#10243b 65%);border:1px solid #44617d;border-radius:16px;padding:22px;color:#ecf8ff;overflow:hidden}.ns-scene-top{display:flex;justify-content:space-between;gap:12px;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#bed4eb}.ns-atom-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:clamp(7px,1.5vw,14px);max-width:340px;margin:28px auto}.ns-atom{aspect-ratio:1;border:1px solid #83f5e2;border-radius:50%;background:#65e2ce;box-shadow:0 0 14px #65e2ce33;transition:background .2s,box-shadow .2s}.ns-atom[data-decayed=true]{background:#18304b;border-color:#66839e;box-shadow:none}
    .ns-readout{text-align:center}.ns-readout strong{font-size:clamp(30px,5vw,44px);font-weight:800;line-height:1.2;color:#83f5e2}.ns-readout span{display:block;font-size:13px;color:#d0e3f5}.ns-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:18px;font-size:12px;color:#c5d9ee}.ns-legend i{display:inline-block;width:9px;height:9px;margin-right:5px;border-radius:50%;background:#65e2ce}.ns-legend i[data-decayed=true]{background:#18304b;border:1px solid #a2bad1}
    .ns-controls{background:var(--ns-panel);border:1px solid var(--ns-line);border-radius:16px;padding:20px}.ns-controls h5,.ns-notebook h5{font-size:16px;margin:0 0 10px}.ns-step{font-size:12px;color:var(--ns-accent);font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}.ns-controls p{margin-bottom:12px}.ns-choices{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 18px}.ns-choices .ns-choice{flex:1;min-width:70px}.ns-primary{width:100%;border:1px solid var(--ns-accent);background:var(--ns-accent);color:var(--ns-on);padding:12px 16px;border-radius:10px;font-weight:800}.ns-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ns-actions>*{flex:1}.ns-note{font-size:13px;color:var(--ns-muted)}.ns-feedback{padding:12px;border-left:3px solid var(--ns-accent);background:var(--ns-bg);border-radius:0 8px 8px 0;margin:14px 0}.ns-feedback[data-kind=retry]{border-color:#f59e0b}.ns-result{font-size:16px;font-weight:700}.ns-label{display:flex;justify-content:space-between;gap:12px;font-weight:700;margin:14px 0 6px}.ns-range{width:100%;min-height:44px;accent-color:var(--ns-accent)}
    .ns-beam{width:100%;height:auto;display:block;margin:25px 0}.ns-notebook{margin-top:18px;border:1px solid var(--ns-line);border-radius:12px;padding:16px;background:var(--ns-panel)}.ns-notebook table{border-collapse:collapse;width:100%;font-size:14px;color:var(--ns-ink)}.ns-notebook th,.ns-notebook td{text-align:left;padding:9px 6px;border-bottom:1px solid var(--ns-line)}.ns-notebook th{font-weight:700}.ns-notebook caption{text-align:left;color:var(--ns-muted);font-size:13px;margin-bottom:8px}.ns-notebook summary{cursor:pointer;min-height:44px;align-content:center;font-weight:700}.ns-notebook a{color:var(--ns-accent);text-decoration:underline}.ns-explain{border-top:1px solid var(--ns-line);margin-top:18px;padding-top:18px}.ns-explain .ns-choice{text-align:left;width:100%;margin-bottom:8px}.ns-complete{font-weight:700;color:var(--ns-accent)}.ns-studio-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:20px;color:var(--ns-muted);font-size:13px}
    @media(max-width:700px){.ns-grid{grid-template-columns:1fr}.ns-hero{align-items:flex-start}.ns-progress{padding:8px 10px;max-width:116px}.ns-missions{gap:8px}.ns-mission{padding:12px;align-items:flex-start;gap:8px}.ns-mission[aria-pressed=true]{padding:11px}.ns-mission-icon{display:none}.ns-mission small{font-size:12px}.ns-scene{padding:16px}.ns-atom-grid{max-width:240px;margin:20px auto}.ns-controls{padding:16px}}
    @container(max-width:650px){.ns-grid{grid-template-columns:1fr}.ns-grid>div:first-child{display:contents}.ns-grid>.ns-controls{grid-row:2}.ns-hero{flex-wrap:wrap}.ns-progress{max-width:none;display:flex;gap:10px;align-items:center}.ns-missions{grid-template-columns:1fr 1fr}.ns-mission-icon{display:none}.ns-nav button{flex:1;font-size:13px;padding:8px}.ns-scene{padding:16px}}
    .ns-chooser{border:1px solid var(--ns-line);border-radius:12px;padding:0 14px;margin-bottom:20px;background:var(--ns-panel)}.ns-chooser summary{cursor:pointer;padding:12px 0;min-height:48px;font-weight:700}.ns-chooser .ns-missions{margin:4px 0 14px}.ns-position{color:var(--ns-muted);font-size:13px;margin-left:10px}.ns-scene-note{color:#d0e3f5;font-size:13px;text-align:center;margin:12px 0 0}.ns-chain-chart{margin:26px 0}.ns-chain-row{display:grid;grid-template-columns:46px minmax(0,1fr) 44px;gap:10px;align-items:center;margin:14px 0;font-size:13px}.ns-chain-row>strong{text-align:right}.ns-chain-track{height:24px;border:1px solid #719cbd;border-radius:5px;overflow:hidden}.ns-chain-bar{height:100%;background:#65e2ce;border:1px solid #b8fff2}.ns-explain>.ns-primary{margin-top:12px}
    .ns-hint{margin:12px 0}.ns-hint summary{cursor:pointer;min-height:44px;align-content:center;color:var(--ns-accent);font-weight:700}.ns-hint p{margin:4px 0 12px}.ns-recap ul{list-style:none;padding:0;margin:8px 0 0}.ns-recap li{padding:14px 0;border-top:1px solid var(--ns-line)}.ns-recap li p{margin-bottom:10px}.ns-count-chart{display:flex;align-items:stretch;gap:8px;height:176px;margin:22px 0}.ns-count-column{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;font-size:13px}.ns-count-bar{width:100%;max-width:42px;background:#65e2ce;border:1px solid #b8fff2;border-radius:5px 5px 0 0;min-height:2px}.ns-count-column>span{color:#d0e3f5}.ns-count-empty{min-height:176px;display:grid;place-content:center;text-align:center;color:#d0e3f5}
    .ns-prediction{border-bottom:1px solid var(--ns-line);margin-bottom:16px;padding-bottom:10px}.ns-prediction summary{cursor:pointer;min-height:44px;align-content:center;color:var(--ns-accent);font-weight:700;font-size:14px}.ns-prediction h5{margin-top:8px}.ns-prediction .ns-choices{margin-bottom:8px}.ns-signal{font-size:clamp(22px,3vw,30px);line-height:1.3;font-weight:800;color:#83f5e2;text-align:center;margin:12px 0}.ns-path-choice{display:flex;align-items:center;gap:12px;text-align:left;width:100%;margin:8px 0}.ns-path-choice strong,.ns-path-choice small{display:block}.ns-path-choice small{font-size:13px;font-weight:400}.ns-path-number{font-size:22px;min-width:22px;text-align:center}.ns-ray-identity{border:1px solid #719cbd;border-radius:10px;padding:12px;margin:14px 0;color:#edf5ff}.ns-ray-identity p{margin:4px 0 0;font-size:14px}
    .nk-workspace[data-ns-large=true] [data-nk-studio]{font-size:18px}.nk-workspace[data-ns-large=true] :is(.ns-note,.ns-mission small,.ns-notebook table,.ns-notebook caption,.ns-studio-footer,.ns-scene-note,.ns-chain-row,.ns-count-column,.ns-readout span,.ns-prediction summary,.ns-ray-identity p,.ns-path-choice small){font-size:16px}
    .ns-guidance{margin:8px 0 14px}.ns-guidance p{margin-bottom:8px}.ns-guidance strong,.ns-mission-state{color:var(--ns-accent)}.ns-guidance button{width:100%;text-align:left}.ns-mission-state{display:block;margin-top:8px;font-size:13px;font-weight:700}.ns-resume{margin:0 0 14px;max-width:100%;text-align:left}.ns-mission{min-width:0}.ns-mission>span{min-width:0}.nk-workspace[data-ns-large=true] .ns-mission-state{font-size:16px}
    @container(max-width:450px){.ns-missions{grid-template-columns:1fr}}
    .ns-reflection{margin-top:12px}.ns-reflection label{display:block;font-weight:700;margin:10px 0 6px}.ns-reflection textarea{width:100%;min-height:104px;resize:vertical;line-height:1.5;padding:12px;border:1px solid var(--ns-line);border-radius:10px;color:var(--ns-ink);background:var(--ns-bg)}.ns-reflection p{margin:10px 0}.ns-reflection summary{color:var(--ns-accent)}
    .nk-workspace[data-ns-reduced=true] *{transition:none!important;animation:none!important;scroll-behavior:auto!important}
    @media(prefers-reduced-motion:reduce){.nk-workspace *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
    @media(forced-colors:active){.ns-choice[aria-pressed=true],.ns-mission[aria-pressed=true],.ns-nav button[aria-pressed=true]{outline:3px solid Highlight;outline-offset:-4px}.ns-atom{background:Highlight;border-color:Highlight}.ns-atom[data-decayed=true]{background:Canvas;border:1px dashed CanvasText}.ns-scene{background:Canvas;color:CanvasText}.ns-readout strong,.ns-readout span,.ns-scene-top,.ns-legend{color:CanvasText}}
  `;

  function NuclearStarterExperiment(props) {
    var React = props.ctx.React, h = React.createElement, nt = nkStudioTranslate(props.ctx);
    var distance = props.kind === 'distance';
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var settings = distance ? [1, 2, 4] : [.8, 1, 1.2];
    var setting = settings.indexOf(data.setting) >= 0 ? data.setting : 1;
    var step = Number.isInteger(data.step) ? Math.max(0, Math.min(4, data.step)) : 0;
    var predictions = distance ? [
      { id: 'half', label: nt('distance_half', 'Half as much') },
      { id: 'quarter', label: nt('distance_quarter', 'One quarter') },
      { id: 'same', label: nt('distance_same', 'No change') }
    ] : [
      { id: 'stop', label: nt('chain_stop', 'It stops') },
      { id: 'steady', label: nt('chain_steady', 'It stays steady') },
      { id: 'grow', label: nt('chain_grow', 'It grows') }
    ];
    var prediction = predictions.some(function (p) { return p.id === data.prediction; }) ? data.prediction : null;
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (value, i, all) { return settings.indexOf(value) >= 0 && all.indexOf(value) === i; }).slice(-3);
    var eligible = distance ? runs.indexOf(1) >= 0 && runs.indexOf(2) >= 0 : runs.indexOf(1) >= 0 && runs.some(function (value) { return value !== 1; });
    var last = runs.length ? runs[runs.length - 1] : null;
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var runRef = React.useRef(null), focusRun = React.useRef(false);
    React.useEffect(function () { if (focusRun.current && runRef.current && !runRef.current.disabled) { runRef.current.focus(); focusRun.current = false; } }, [setting, step]);
    var nextSetting = distance ? runs.indexOf(1) >= 0 ? 2 : 1 : runs.indexOf(1) >= 0 ? setting !== 1 ? setting : .8 : 1;
    if (!distance && step > 0 && step < 4 && runs.indexOf(setting) < 0) nextSetting = setting;
    var needsSetup = nextSetting !== setting || (!distance && step >= 4);
    function expected(factor, generation) { return 20 * Math.pow(factor, generation); }
    function intensity(metres) { return 100 / (metres * metres); }
    function metres(value) { return nt('distance_metres', '{value} m', { value: value }); }
    function factorName(value) {
      return value === 1 ? nt('factor_same', '1 · Same') : value < 1 ? nt('factor_fewer', '0.8 · Fewer') : nt('factor_more', '1.2 · More');
    }
    function prepareNext() {
      focusRun.current = true;
      props.onChange({ setting: nextSetting, step: 0 });
      setStatus(nt('guide_prepared', 'Setup ready. Run the experiment to record a result.'));
    }
    function button(label, selected, action, disabled, key) {
      return h('button', { key: key || label, type: 'button', className: 'ns-choice', 'aria-pressed': selected, disabled: disabled, onClick: action }, label);
    }
    function run() {
      if (!prediction || (!distance && step >= 4)) return;
      var nextStep = distance ? 0 : step + 1;
      var patch = { step: nextStep };
      if (distance || nextStep === 4) patch.runs = runs.filter(function (value) { return value !== setting; }).concat([setting]);
      props.onChange(patch);
      setStatus(distance ? nt('distance_result', 'At {distance}, the intensity is {percent}% of the 1 m reading.', { distance: metres(setting), percent: intensity(setting) }) : nt('chain_result', 'Generation {generation}: {count} expected reactions.', { generation: nextStep, count: expected(setting, nextStep).toFixed(1) }));
    }
    function explain(correct) {
      if (!eligible) return;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('try_explanation', 'Look at your observations, then try another explanation.'));
    }
    var scene = distance ? h('div', { className: 'ns-scene', 'data-ns-scene': 'distance' },
      h('div', { className: 'ns-scene-top' }, h('span', null, nt('point_source', 'Point source • fixed output')), h('span', null, nt('detector', 'Detector'))),
      h('svg', { className: 'ns-beam', viewBox: '0 0 440 230', 'aria-hidden': 'true' },
        [75, 150, 300].map(function (r) { return h('circle', { key: r, cx: 55, cy: 98, r: r, fill: 'none', stroke: '#719cbd', strokeWidth: 1.5, strokeDasharray: '5 5' }); }),
        h('circle', { cx: 55, cy: 98, r: 23, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
        h('text', { x: 55, y: 106, fill: '#171131', fontSize: 24, textAnchor: 'middle' }, 'γ'),
        h('path', { d: 'M55 172 H385', stroke: '#bed4eb', strokeWidth: 2 }),
        settings.map(function (value) { return h('g', { key: value }, h('path', { d: 'M' + (55 + value * 75) + ' 165 V179', stroke: '#bed4eb', strokeWidth: 2 }), h('text', { x: 55 + value * 75, y: 204, textAnchor: 'middle', fill: '#edf5ff', fontSize: 17 }, metres(value))); }),
        h('rect', { x: 45 + (last || setting) * 75, y: 69, width: 20, height: 58, rx: 5, fill: '#65e2ce', stroke: '#b8fff2', strokeWidth: 2 })),
      h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, last ? intensity(last) + '%' : '—'), h('span', null, nt('distance_relative', 'of the intensity at 1 m'))),
      h('p', { className: 'ns-scene-note' }, last ? nt('distance_last', 'Last test: detector at {distance}', { distance: metres(last) }) : nt('distance_ready', 'Choose a distance, then take a reading.')))
      : h('div', { className: 'ns-scene', 'data-ns-scene': 'chain' },
        h('div', { className: 'ns-scene-top' }, h('span', null, nt('chain_expected', 'Expected reactions')), h('span', null, nt('chain_start', 'Start with 20'))),
        h('div', { className: 'ns-chain-chart', role: 'img', 'aria-label': Array.from({ length: step + 1 }, function (_, g) { return nt('generation_value', 'Generation {generation}: {count} expected reactions', { generation: g, count: expected(setting, g).toFixed(1) }); }).join('. ') },
          Array.from({ length: 5 }, function (_, g) {
            return h('div', { key: g, className: 'ns-chain-row', 'aria-hidden': 'true' }, h('span', null, g === 0 ? nt('chain_start_short', 'Start') : nt('chain_generation_short', 'Gen {number}', { number: g })),
              h('div', { className: 'ns-chain-track' }, g <= step ? h('div', { className: 'ns-chain-bar', style: { width: expected(setting, g) * 2 + '%' } }) : null),
              h('strong', null, g <= step ? expected(setting, g).toFixed(1) : '—'));
          })),
        h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, expected(setting, step).toFixed(1)), h('span', null, nt('chain_generation_reading', 'expected reactions in generation {number}', { number: step }))),
        h('p', { className: 'ns-scene-note' }, nt('chain_factor_reading', 'Each generation is multiplied by {factor}.', { factor: setting })));
    return h('div', { className: 'ns-grid', 'data-ns-intro': props.kind },
      h('div', null, scene,
        h('div', { className: 'ns-notebook', 'data-ns-notebook': props.kind }, h('h5', null, nt('notebook', 'Your observations')),
          runs.length ? h('table', null, h('caption', null, distance ? nt('distance_caption', 'Compare readings with the same source.') : nt('chain_caption', 'Each run starts at 20. Compare after four generations.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, distance ? nt('distance_column', 'Distance') : nt('chain_factor_column', 'Factor')), h('th', { scope: 'col' }, distance ? nt('intensity_column', 'Intensity') : nt('chain_reactions_column', 'Reactions')))),
            h('tbody', null, runs.map(function (value) { return h('tr', { key: value }, h('th', { scope: 'row' }, distance ? metres(value) : value), h('td', null, distance ? intensity(value) + '%' : expected(value, 4).toFixed(1))); })))
            : h('p', { className: 'ns-note' }, distance ? nt('empty_notebook', 'Your first test will appear here.') : nt('chain_empty', 'Complete four generations to record a run.'))),
        h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
          h('p', { className: 'ns-note' }, distance ? nt('distance_model', 'For an ideal point source, intensity follows 1 / distance². The reference reading at 1 m is 100%. The model leaves out absorption, scattering, background, and detector noise; a real measurement can differ.') : nt('chain_model', 'This simplified model multiplies 20 starting reactions by the selected factor once per generation. Fractional counts are expected averages. A factor of 1 sustains the chain. Real reactors also involve neutron timing, losses, temperature feedback, and control systems.')),
          h('a', { href: distance ? 'https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/08.pdf' : 'https://www.nrc.gov/education-regulatory-research/glossary/criticality', target: '_blank', rel: 'noopener noreferrer' }, distance ? nt('distance_source', 'Source: NRC radiation protection guide') : nt('chain_source', 'Source: NRC criticality definition')))),
      h('div', { className: 'ns-controls' },
        h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0 || (!distance && step > 0), value: (predictions.filter(function (p) { return p.id === prediction; })[0] || {}).label },
        h('h5', null, distance ? nt('distance_prediction', 'Move from 1 m to 2 m. How much intensity will the detector read?') : nt('chain_prediction', 'If each reaction starts one more, what happens to the chain?')),
        h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, predictions.map(function (p) { return button(p.label, prediction === p.id, function () { props.onChange({ prediction: p.id }); }, runs.length > 0 || (!distance && step > 0), p.id); }))),
        h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
        prediction ? eligible ? null : nkStudioGuidance(h, nt,
          distance ? nt('guide_distance', '{count} of 2 comparison readings recorded. Take a reading at {distance}.', { count: (runs.indexOf(1) >= 0 ? 1 : 0) + (runs.indexOf(2) >= 0 ? 1 : 0), distance: metres(nextSetting) })
            : needsSetup ? nt('guide_chain_setup', '{count} of 2 comparison runs recorded. Prepare factor {factor}, then observe four generations.', { count: runs.length ? 1 : 0, factor: nextSetting })
              : nt('guide_chain_steps', 'This run: {count} of 4 generations observed. Advance until the run is recorded.', { count: step }),
          distance ? nt('guide_set_distance', 'Set distance to {distance}', { distance: metres(nextSetting) }) : nt('guide_set_factor', 'Prepare factor {factor}', { factor: nextSetting }), needsSetup ? prepareNext : null)
          : h('p', { className: 'ns-note' }, distance ? nt('distance_instruction', 'Take readings at 1 m and 2 m. Try 4 m when you are ready.') : nt('chain_instruction', 'Run four generations with factor 1, then compare with another factor.')),
        h('div', { className: 'ns-choices', role: 'group', 'aria-label': distance ? nt('distance_group', 'Detector distance') : nt('chain_group', 'Next-generation factor') }, settings.map(function (value) { return button(distance ? metres(value) : factorName(value), setting === value, function () { if (value !== setting) { props.onChange({ setting: value, step: 0 }); setStatus(''); } }, false, value); })),
        h('button', { ref: runRef, type: 'button', className: 'ns-primary', disabled: !prediction || (!distance && step >= 4), onClick: run }, distance ? nt('distance_test', 'Take a reading →') : step >= 4 ? nt('chain_four_done', 'Four generations observed') : nt('chain_advance', 'Advance one generation →')),
        !prediction ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
        h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status),
        distance && last !== null && last !== setting ? h('p', { className: 'ns-feedback' }, nt('distance_draft', 'Distance changed. Take a reading to update the detector.')) : null,
        eligible ? h('p', { className: 'ns-feedback' }, distance ? nt('distance_discovery', 'Doubling the distance gave 25% of the original intensity.') : nt('chain_discovery', 'With factor 1, every generation still has 20 expected reactions.')) : null,
        h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange({ prediction: null, step: 0, runs: [], explanation: null }); setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.')); } }, nt('intro_restart', 'Start again')),
        nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : distance ? nt('hint_distance', 'Record a reading at 1 m, then at 2 m. Compare the two numbers in your observations.') : nt('hint_chain', 'Finish four generations with factor 1. Then choose Fewer or More and finish four more. Compare the final counts.'), props.kind),
        eligible ? h('div', { className: 'ns-explain', 'data-ns-explain': props.kind },
          h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', null, nt('evidence_question', 'What does your evidence show?')),
          button(distance ? nt('distance_explain_no', 'Moving the detector makes the source emit less.') : nt('chain_explain_no', 'A steady chain has stopped reacting.'), data.explanation === 'retry', function () { explain(false); }),
          button(distance ? nt('distance_explain_yes', 'The same output spreads over a larger area.') : nt('chain_explain_yes', 'A steady chain keeps producing new reactions.'), data.explanation === 'correct', function () { explain(true); }),
          data.explanation === 'retry' ? h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('compare_again', 'Compare the numbers in your notebook. You can revise your explanation.')) : null,
          data.explanation === 'correct' ? h('div', null, h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')), h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel)) : null) : null));
  }

  function NuclearCountingExperiment(props) {
    var React = props.ctx.React, h = React.createElement, nt = nkStudioTranslate(props.ctx);
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var prediction = ['same', 'vary'].indexOf(data.prediction) >= 0 ? data.prediction : null;
    // Equal readings are separate measurements and must remain in the notebook.
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (value) { return Number.isInteger(value) && value >= 0 && value <= 1000; }).slice(-6);
    var eligible = runs.length >= 3;
    var total = runs.reduce(function (sum, value) { return sum + value; }, 0);
    var maximum = Math.max.apply(null, [1].concat(runs));
    var varied = runs.some(function (value) { return value !== runs[0]; });
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    function choice(id, label) {
      return h('button', { key: id, type: 'button', className: 'ns-choice', 'aria-pressed': prediction === id, disabled: runs.length > 0, onClick: function () { props.onChange({ prediction: id }); } }, label);
    }
    function explain(correct) {
      if (!eligible) return;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('try_explanation', 'Look at your observations, then try another explanation.'));
    }
    return h('div', { className: 'ns-grid', 'data-ns-intro': 'counting' },
      h('div', null,
        h('div', { className: 'ns-scene', 'data-ns-scene': 'counting' },
          h('div', { className: 'ns-scene-top' }, h('span', null, nt('counting_setup', 'Background only • same setup'))),
          runs.length ? h('div', { className: 'ns-count-chart', role: 'img', 'aria-label': nt('counting_chart', 'Successive 10-second readings: {counts} counts.', { counts: runs.join(', ') }) },
            runs.map(function (value, i) { return h('div', { key: i, className: 'ns-count-column', 'aria-hidden': 'true' }, h('strong', null, value), h('div', { className: 'ns-count-bar', style: { height: value / maximum * 120 + 'px' } }), h('span', null, i + 1)); }))
            : h('p', { className: 'ns-count-empty' }, nt('counting_empty', 'Take a count to start your comparison.')),
          h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, runs.length ? runs[runs.length - 1] : '—'), h('span', null, nt('counting_readout', 'counts in the last 10-second measurement'))),
          h('p', { className: 'ns-scene-note' }, nt('counting_simulated', 'Each press simulates a 10-second measurement.'))),
        h('div', { className: 'ns-notebook', 'data-ns-notebook': 'counting' }, h('h5', null, nt('notebook', 'Your observations')),
          runs.length ? h('table', null, h('caption', null, nt('counting_caption', 'Latest six readings. Every measurement lasts 10 seconds.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('counting_reading_column', 'Reading')), h('th', { scope: 'col' }, nt('counting_count_column', 'Counts')))),
            h('tbody', null, runs.map(function (value, i) { return h('tr', { key: i }, h('th', { scope: 'row' }, i + 1), h('td', null, value)); }))) : h('p', { className: 'ns-note' }, nt('empty_notebook', 'Your first test will appear here.')),
          runs.length ? h('p', { className: 'ns-note', style: { marginTop: 12, marginBottom: 0 } }, nt('counting_total', 'These readings: {counts} counts in {seconds} seconds.', { counts: total, seconds: runs.length * 10 })) : null),
        h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
          h('p', { className: 'ns-note' }, nt('counting_model', 'The background stays at an average of 0.42 counts per second. Each reading is a fresh random sample from the lab’s Poisson counting model. Real detectors have additional effects. Counts describe detected events; they are not a dose measurement.')),
          h('a', { href: 'https://www.nrc.gov/education-regulatory-research/the-student-corner/science-101/what-is-a-geiger-counter', target: '_blank', rel: 'noopener noreferrer' }, nt('counting_source', 'Source: NRC guide to Geiger counters')))),
      h('div', { className: 'ns-controls' },
        h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0, value: prediction === 'same' ? nt('counting_same', 'Exactly the same') : prediction === 'vary' ? nt('counting_vary', 'They can differ') : null },
        h('h5', null, nt('counting_prediction', 'Will three counts with the same setup always match?')),
        h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, choice('same', nt('counting_same', 'Exactly the same')), choice('vary', nt('counting_vary', 'They can differ')))),
        h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
        prediction ? eligible ? null : nkStudioGuidance(h, nt, nt('guide_counting', '{count} of 3 readings recorded. Take a 10-second count with the same setup.', { count: runs.length })) : h('p', { className: 'ns-note' }, nt('counting_instruction', 'Take three counts. Keep the setup and measuring time the same.')),
        h('button', { type: 'button', className: 'ns-primary', disabled: !prediction, onClick: function () {
          if (!prediction) return;
          var count = nkPoisson(GM_BACKGROUND * 10);
          props.onChange({ runs: runs.concat([count]).slice(-6) });
          setStatus(nt('counting_result', 'Recorded {count} counts in a simulated 10 seconds. {readings} readings in your notebook.', { count: count, readings: Math.min(6, runs.length + 1) }));
        } }, nt('counting_test', 'Take a 10-second count →')),
        !prediction ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
        h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status),
        eligible ? h('p', { className: 'ns-feedback' }, varied ? nt('counting_varied', 'Your readings range from {min} to {max}. The setup stayed the same.', { min: Math.min.apply(null, runs), max: Math.max.apply(null, runs) }) : nt('counting_matched', 'These readings match. Random readings can match by chance; try another if you like.')) : null,
        h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange({ prediction: null, runs: [], explanation: null }); setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.')); } }, nt('intro_restart', 'Start again')),
        nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : nt('hint_counting', 'Take at least three readings. Compare the counts while remembering that the setup did not change. Matching values are possible too.'), 'counting'),
        eligible ? h('div', { className: 'ns-explain', 'data-ns-explain': 'counting' },
          h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', null, nt('evidence_question', 'What does your evidence show?')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('counting_explain_no', 'Every higher count means the radiation level went up.')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'correct', onClick: function () { explain(true); } }, nt('counting_explain_yes', 'Random variation can change counts even with the same setup.')),
          data.explanation === 'retry' ? h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('counting_retry', 'The model kept the background constant. A single higher reading can come from random variation.')) : null,
          data.explanation === 'correct' ? h('div', null, h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')), h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel)) : null) : null));
  }

  function NuclearRayExperiment(props) {
    var React = props.ctx.React, h = React.createElement, nt = nkStudioTranslate(props.ctx);
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var setups = [
      { id: 'alpha-open', alpha: true, paper: false, label: nt('rays_alpha_open', 'Alpha · paper out') },
      { id: 'alpha-paper', alpha: true, paper: true, label: nt('rays_alpha_paper', 'Alpha · paper in') },
      { id: 'gamma-paper', alpha: false, paper: true, label: nt('rays_gamma_paper', 'Gamma · paper in') }
    ];
    var predictions = [
      { id: 'alpha', label: nt('rays_guess_alpha', 'Alpha only') },
      { id: 'both', label: nt('rays_guess_both', 'Both types') },
      { id: 'neither', label: nt('rays_guess_neither', 'Neither type') }
    ];
    var prediction = predictions.filter(function (item) { return item.id === data.prediction; })[0];
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (id, i, all) { return setups.some(function (item) { return item.id === id; }) && all.indexOf(id) === i; });
    var last = setups.filter(function (item) { return item.id === runs[runs.length - 1]; })[0];
    var eligible = setups.every(function (item) { return runs.indexOf(item.id) >= 0; });
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    function blocked(item) { return item.alpha && item.paper; }
    function result(item) { return blocked(item) ? nt('rays_stopped', 'Stopped by paper') : nt('rays_arrives', 'Reaches the detector'); }
    function testSetup(item) {
      if (!prediction) return;
      props.onChange({ runs: runs.filter(function (id) { return id !== item.id; }).concat([item.id]) });
      setStatus(nt('rays_result', '{setup}: {result}. The source is still emitting.', { setup: item.label, result: result(item) }));
    }
    function explain(correct) {
      if (!eligible) return;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('rays_retry', 'Look at the source in all three tests. Paper changes what reaches the detector.'));
    }
    var alpha = !last || last.alpha, hasPaper = last && last.paper, stopped = last && blocked(last);
    return h('div', { className: 'ns-grid', 'data-ns-intro': 'rays' },
      h('div', null,
        h('div', { className: 'ns-scene', 'data-ns-scene': 'rays' },
          h('div', { className: 'ns-scene-top' }, h('span', null, nt('rays_scene', 'Source → paper → detector'))),
          h('svg', { className: 'ns-beam', viewBox: '0 0 420 180', 'aria-hidden': 'true' },
            h('circle', { cx: 48, cy: 78, r: 28, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
            h('text', { x: 48, y: 87, textAnchor: 'middle', fill: '#171131', fontSize: 28 }, last ? alpha ? 'α' : 'γ' : '?'),
            h('rect', { x: 200, y: 20, width: 16, height: 112, rx: 3, fill: hasPaper ? '#d0e3f5' : 'none', stroke: '#d0e3f5', strokeWidth: 2, strokeDasharray: hasPaper ? undefined : '5 5' }),
            last ? h('path', { d: stopped ? 'M82 78 H198' : 'M82 78 H360', stroke: '#83f5e2', strokeWidth: 4, strokeDasharray: alpha ? '3 9' : '12 5' }) : null,
            stopped ? h('path', { d: 'M184 67 L198 89 M198 67 L184 89', stroke: '#fff1b5', strokeWidth: 3 }) : null,
            h('rect', { x: 367, y: 42, width: 28, height: 72, rx: 6, fill: last && !stopped ? '#65e2ce' : '#18304b', stroke: '#b8fff2', strokeWidth: 2 }),
            h('text', { x: 48, y: 155, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15 }, nt('rays_source_label', 'Source')),
            h('text', { x: 208, y: 155, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15 }, nt('rays_paper_label', 'Paper')),
            h('text', { x: 371, y: 155, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15 }, nt('detector', 'Detector'))),
          h('p', { className: 'ns-signal', 'data-ns-reading': 'true' }, last ? result(last) : nt('rays_ready', 'What will get through?')),
          h('p', { className: 'ns-scene-note' }, last ? nt('rays_emitting', '{setup}. Source: still emitting.', { setup: last.label }) : nt('rays_pick', 'Make a prediction, then try a setup.')),
          last ? h('div', { className: 'ns-ray-identity' }, h('strong', null, alpha ? nt('rays_alpha_name', 'Meet alpha · α') : nt('rays_gamma_name', 'Meet gamma · γ')),
            h('p', null, alpha ? nt('rays_alpha_identity', 'A particle made of two protons and two neutrons.') : nt('rays_gamma_identity', 'A photon: a packet of electromagnetic energy.'))) : null,
          h('p', { className: 'ns-scene-note' }, nt('rays_schematic', 'Simplified paths, not measured counts.'))),
        h('div', { className: 'ns-notebook', 'data-ns-notebook': 'rays' }, h('h5', null, nt('notebook', 'Your observations')),
          runs.length ? h('table', null, h('caption', null, nt('rays_caption', 'The source keeps emitting in every test.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('rays_setup_column', 'Setup')), h('th', { scope: 'col' }, nt('rays_path_column', 'Radiation path')))),
            h('tbody', null, setups.filter(function (item) { return runs.indexOf(item.id) >= 0; }).map(function (item) { return h('tr', { key: item.id }, h('th', { scope: 'row' }, item.label), h('td', null, result(item))); }))) : h('p', { className: 'ns-note' }, nt('empty_notebook', 'Your first test will appear here.'))),
        h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
          h('p', { className: 'ns-note' }, nt('rays_model', 'This qualitative model places the source very close to an ideal detector sensitive to both types. Paper stops typical alpha particles; gamma photons can pass through it. Real results depend on energy, material thickness, air gaps, and detector design. Background and scattering are omitted. Stopping a signal does not make a radioactive source stop emitting.')),
          h('a', { href: 'https://www.nrc.gov/facilities-safety/radiation-protection/radiation-and-its-health-effects/radiation-basics', target: '_blank', rel: 'noopener noreferrer' }, nt('rays_reference', 'Source: NRC radiation basics')))),
      h('div', { className: 'ns-controls' },
        h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0, value: prediction && prediction.label },
          h('h5', null, nt('rays_prediction', 'Which radiation will a sheet of paper stop in this model?')),
          h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, predictions.map(function (item) {
            return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'aria-pressed': prediction && prediction.id === item.id || false, disabled: runs.length > 0, onClick: function () { props.onChange({ prediction: item.id }); } }, item.label);
          }))),
        h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
        h('h5', null, nt('rays_tests_heading', 'Three quick tests')),
        prediction ? eligible ? null : nkStudioGuidance(h, nt, nt('guide_rays', '{count} of 3 setups tested. Try {setup} next.', { count: runs.length, setup: (setups.filter(function (item) { return runs.indexOf(item.id) < 0; })[0] || setups[0]).label })) : h('p', { className: 'ns-note' }, nt('rays_instruction', 'Select a setup to test it. Watch both the source and the detector.')),
        h('div', { className: 'ns-path-choices', role: 'group', 'aria-label': nt('rays_setups', 'Test a radiation path') }, setups.map(function (item, i) {
          return h('button', { key: item.id, type: 'button', className: 'ns-choice ns-path-choice', 'data-ns-setup': item.id, 'aria-pressed': !!last && last.id === item.id, disabled: !prediction, onClick: function () { testSetup(item); } },
            h('span', { className: 'ns-path-number', 'aria-hidden': 'true' }, runs.indexOf(item.id) >= 0 ? '✓' : i + 1), h('span', null, h('strong', null, item.label), h('small', null, runs.indexOf(item.id) >= 0 ? nt('rays_test_again', 'Tested · select to repeat') : nt('rays_test_action', 'Select to test'))));
        })),
        !prediction ? h('p', { className: 'ns-note' }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
        h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status),
        h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange({ prediction: null, runs: [], explanation: null }); setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.')); } }, nt('intro_restart', 'Start again')),
        nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : nt('rays_hint', 'Try all three setups. Does the paper change the source, or the path between the source and detector?'), 'rays'),
        eligible ? h('div', { className: 'ns-explain', 'data-ns-explain': 'rays' }, h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', null, nt('evidence_question', 'What does your evidence show?')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('rays_explain_no', 'Paper switches off the radioactive source.')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'correct', onClick: function () { explain(true); } }, nt('rays_explain_yes', 'Paper blocks the alpha path while the source keeps emitting.')),
          data.explanation === 'retry' ? h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('rays_retry', 'Look at the source in all three tests. Paper changes what reaches the detector.')) : null,
          data.explanation === 'correct' ? h('div', null, h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')), h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel)) : null) : null));
  }

  function NuclearExperimentStudio(props) {
    var React = props.ctx.React, h = React.createElement, nt = nkStudioTranslate(props.ctx);
    var raw = props.state && typeof props.state === 'object' && !Array.isArray(props.state) ? props.state : {};
    var journey = [
      { id: 'decay', icon: '◉', title: nt('decay_title', 'The disappearing sample'), sub: nt('decay_sub', 'Explore half-life, one step at a time.') },
      { id: 'distance', icon: '↔', title: nt('distance_title', 'Give it some space'), sub: nt('distance_sub', 'Move a detector. Notice the difference.') },
      { id: 'rays', icon: 'α γ', title: nt('rays_title', 'What can paper stop?'), sub: nt('rays_sub', 'Meet alpha and gamma. Follow their paths.') },
      { id: 'shield', icon: '▥', title: nt('shield_title', 'The shielding challenge'), sub: nt('shield_sub', 'Build a fair test. Follow the beam.') },
      { id: 'counting', icon: '▂▅▃', title: nt('counting_title', 'One count, or a pattern?'), sub: nt('counting_sub', 'Repeat a reading. Look for variation.') },
      { id: 'chain', icon: '⇢', title: nt('chain_title', 'Keep the chain going'), sub: nt('chain_sub', 'Explore what steady really means.') }
    ];
    var mission = journey.some(function (item) { return item.id === raw.mission; }) ? raw.mission : 'decay';
    var missionIndex = journey.findIndex(function (item) { return item.id === mission; });
    var decay = raw.decay && typeof raw.decay === 'object' ? raw.decay : {};
    var shield = raw.shield && typeof raw.shield === 'object' ? raw.shield : {};
    var step = Number.isInteger(decay.step) ? Math.max(0, Math.min(4, decay.step)) : 0;
    var prediction = [16, 32, 48].indexOf(decay.prediction) >= 0 ? decay.prediction : null;
    var materials = SHIELDS.filter(function (item) { return ['water', 'concrete', 'lead'].indexOf(item.id) >= 0; });
    function materialFor(id) { return materials.filter(function (item) { return item.id === id; })[0] || materials[0]; }
    function materialName(id) {
      return id === 'lead' ? nt('lead', 'Lead') : id === 'concrete' ? nt('concrete', 'Concrete') : nt('water', 'Water');
    }
    var material = materialFor(shield.material || 'water');
    var thickness = typeof shield.thickness === 'number' && isFinite(shield.thickness) ? Math.max(0, Math.min(10, Math.round(shield.thickness * 2) / 2)) : 2;
    var shieldPrediction = materials.some(function (item) { return item.id === shield.prediction; }) ? shield.prediction : null;
    var trials = (Array.isArray(shield.trials) ? shield.trials : []).filter(function (item) {
      return item && materials.some(function (mat) { return mat.id === item.material; })
        && typeof item.thickness === 'number' && isFinite(item.thickness) && item.thickness >= 0 && item.thickness <= 10;
    }).slice(-6).map(function (item) {
      return { material: item.material, thickness: item.thickness, percent: 100 * Math.exp(-materialFor(item.material).mu * item.thickness) };
    });
    var last = trials[trials.length - 1];
    var fairPair = trials.some(function (a, i) { return trials.some(function (b, j) { return j > i && a.material !== b.material && a.thickness > 0 && a.thickness === b.thickness; }); });
    var comparison = trials.filter(function (item) { return item.thickness > 0 && Number.isInteger(item.thickness * 2); }).slice(-1)[0];
    var comparisonThickness = comparison ? comparison.thickness : thickness > 0 ? thickness : 2;
    var comparisonMaterial = comparison && material.id === comparison.material ? comparison.material === 'lead' ? 'water' : 'lead' : material.id;
    var needsShieldSetup = thickness !== comparisonThickness || material.id !== comparisonMaterial;
    var completed = (Array.isArray(raw.completed) ? raw.completed : []).filter(function (item, i, all) { return journey.some(function (entry) { return entry.id === item; }) && all.indexOf(item) === i; });
    var unfinished = journey.filter(function (item) { return completed.indexOf(item.id) < 0 && nkStudioHasWork(item.id, raw[item.id]); });
    var resume = unfinished.filter(function (item) { return item.id === raw.lastWorked; })[0] || unfinished[0];
    var takeaways = {
      decay: nt('recap_decay', 'Each half-life halves the remaining parent atoms on average.'),
      distance: nt('recap_distance', 'Doubling the distance gives one quarter of the intensity in this ideal point-source model.'),
      rays: nt('recap_rays', 'Paper can stop alpha particles while the source keeps emitting. Gamma photons can pass through.'),
      shield: nt('recap_shield', 'At the same thickness, different materials transmit different amounts of radiation.'),
      counting: nt('recap_counting', 'Repeated counts can vary even when the setup stays the same.'),
      chain: nt('recap_chain', 'A steady chain keeps producing new reactions in each generation.')
    };
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var titleRef = React.useRef(null), focusNext = React.useRef(false), chooserRef = React.useRef(null);
    var shieldRunRef = React.useRef(null), focusShieldRun = React.useRef(false);
    React.useEffect(function () { if (focusNext.current && titleRef.current) { titleRef.current.focus(); focusNext.current = false; } }, [mission]);
    React.useEffect(function () { if (focusShieldRun.current && shieldRunRef.current && !shieldRunRef.current.disabled) { shieldRunRef.current.focus(); focusShieldRun.current = false; } }, [material.id, thickness]);
    function update(part, patch, extra) {
      props.onChange(function (current) {
        var next = Object.assign({}, current, extra || {}, { lastWorked: part });
        next[part] = Object.assign({}, current && current[part], patch);
        return next;
      });
    }
    function say(text) { setStatus(text); }
    function liveResult() {
      return h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status);
    }
    function selectMission(id) {
      focusNext.current = id !== mission;
      if (chooserRef.current) chooserRef.current.open = false;
      if (id === mission && titleRef.current) titleRef.current.focus();
      setStatus('');
      props.onChange(function (current) { return Object.assign({}, current, { mission: id }); });
    }
    function goNext() {
      if (missionIndex < journey.length - 1) selectMission(journey[missionIndex + 1].id);
      else props.onView('reactor');
    }
    var nextLabel = missionIndex < journey.length - 1 ? nt('continue_experiment', 'Continue: {title} →', { title: journey[missionIndex + 1].title }) : nt('continue_reactor', 'Continue to the reactor →');
    function conclude(part, correct) {
      var eligible = part === 'decay' ? step >= 2 : fairPair;
      if (!eligible) return;
      update(part, { explanation: correct ? 'correct' : 'retry' }, correct ? { completed: completed.indexOf(part) >= 0 ? completed : completed.concat([part]) } : null);
      say(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('try_explanation', 'Look at your observations, then try another explanation.'));
    }
    function choice(label, selected, click, disabled, key) {
      return h('button', { key: key || label, type: 'button', className: 'ns-choice', 'aria-pressed': selected, disabled: disabled, onClick: click }, label);
    }
    function explanation(part, correctText, otherText) {
      var value = part === 'decay' ? decay : shield;
      return h('div', { className: 'ns-explain', 'data-ns-explain': part },
        h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')),
        h('h5', null, nt('evidence_question', 'What does your evidence show?')),
        choice(otherText, value.explanation === 'retry', function () { conclude(part, false); }),
        choice(correctText, value.explanation === 'correct', function () { conclude(part, true); }),
        value.explanation === 'correct' ? h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')) : null,
        value.explanation === 'retry' ? h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('compare_again', 'Compare the numbers in your notebook. You can revise your explanation.')) : null,
        value.explanation === 'correct' ? h('button', { type: 'button', className: 'ns-primary', onClick: goNext }, nextLabel) : null);
    }
    var remaining = 64 * Math.pow(0.5, step);
    var decayScene = h('div', { className: 'ns-scene', 'data-ns-scene': 'decay' },
      h('div', { className: 'ns-scene-top' }, h('span', null, nt('sample_chamber', 'Sample chamber')), h('span', null, nt('elapsed', '{count} half-lives', { count: step }))),
      h('div', { className: 'ns-atom-grid', role: 'img', 'aria-label': nt('atom_summary', 'Expected population: {remaining} of 64 parent atoms remain after {count} half-lives.', { remaining: remaining, count: step }) },
        Array.from({ length: 64 }, function (_, i) { return h('span', { key: i, className: 'ns-atom', 'data-decayed': (i * 17 % 64) >= remaining, 'aria-hidden': 'true' }); })),
      h('div', { className: 'ns-readout' }, h('strong', null, remaining), h('span', null, nt('parent_atoms', 'parent atoms remaining (expected)'))),
      h('div', { className: 'ns-legend', 'aria-hidden': 'true' }, h('span', null, h('i'), nt('remaining', 'Remaining')), h('span', null, h('i', { 'data-decayed': 'true' }), nt('decayed', 'Decayed'))));
    var decayControls = h('div', { className: 'ns-controls' },
      h(NuclearStudioPrediction, { key: 'decay-prediction', ctx: props.ctx, observed: step > 0, value: prediction },
      h('h5', null, nt('decay_prediction', 'After two half-lives, how many of 64 parent atoms remain?')),
      h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('decay_choices', 'Predict the remaining atoms') }, [16, 32, 48].map(function (n) {
        return choice(String(n), prediction === n, function () { update('decay', { prediction: n }); }, step > 0, n);
      }))),
      h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
      prediction && step < 2 ? nkStudioGuidance(h, nt, nt('guide_decay', '{count} of 2 half-lives observed. Advance one interval and watch the remaining atoms.', { count: step })) : null,
      h('button', { type: 'button', className: 'ns-primary', disabled: prediction === null || step >= 4, onClick: function () {
        var next = step + 1;
        update('decay', { step: next });
        say(nt('decay_result', 'After {count} half-lives, {remaining} of 64 parent atoms remain in the expected model.', { count: next, remaining: 64 * Math.pow(0.5, next) }));
      } }, step >= 4 ? nt('four_intervals', 'Four half-lives observed') : nt('advance_half', 'Advance one half-life →')),
      prediction === null ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
      liveResult(),
      step >= 2 ? h('div', { className: 'ns-feedback ns-result' }, prediction === 16 ? nt('decay_match', 'Your prediction matched: 64 → 32 → 16.') : nt('decay_surprise', 'A useful surprise: you predicted {guess}; the model gives 16 after two half-lives.', { guess: prediction })) : null,
      h('button', { type: 'button', className: 'ns-secondary', onClick: function () { update('decay', { step: 0, prediction: null, explanation: null }); say(nt('decay_reset', 'Sample reset. Make a new prediction.')); } }, nt('reset_sample', 'Reset sample')),
      nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : step < 2 ? nt('hint_decay_run', 'Advance until you have observed two half-lives. Watch the number of parent atoms still remaining.') : nt('hint_decay_compare', 'Compare 64, 32, and 16. Ask what happens to the remaining atoms each time.'), 'decay'),
      step >= 2 ? explanation('decay', nt('decay_explain_yes', 'Each interval halves the atoms still remaining.'), nt('decay_explain_no', 'Each interval removes 32 atoms, every time.')) : null);
    var changedSettings = last && (last.material !== material.id || last.thickness !== thickness);
    var shieldScene = h('div', { className: 'ns-scene', 'data-ns-scene': 'shield' },
      h('div', { className: 'ns-scene-top' }, h('span', null, nt('gamma_beam', 'Gamma beam • 1 MeV')), h('span', null, nt('detector', 'Detector'))),
      h('svg', { className: 'ns-beam', viewBox: '0 0 500 210', 'aria-hidden': 'true' },
        h('circle', { cx: 52, cy: 100, r: 32, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
        h('text', { x: 52, y: 110, fill: '#171131', fontSize: 30, textAnchor: 'middle' }, 'γ'),
        [55, 77, 100, 123, 145].map(function (y) { return h('path', { key: 'in' + y, d: 'M90 ' + y + ' H217', stroke: '#c4b5fd', strokeWidth: 3, strokeDasharray: '7 5' }); }),
        h('rect', { x: 223, y: 28, width: 58 + (last ? last.thickness : thickness) * 6, height: 145, rx: 8, fill: (last ? last.thickness : thickness) === 0 ? 'none' : '#3d6480', stroke: '#a7d8f2', strokeDasharray: (last ? last.thickness : thickness) === 0 ? '5 5' : undefined, strokeWidth: 2 }),
        h('text', { x: 263, y: 102, fill: '#f1f8ff', fontSize: 19, textAnchor: 'middle' }, (last ? last.thickness : thickness) + ' cm'),
        last ? [55, 77, 100, 123, 145].map(function (y) { return h('path', { key: 'out' + y, d: 'M350 ' + y + ' H433', stroke: '#83f5e2', strokeWidth: 2 + 4 * last.percent / 100, opacity: .2 + .8 * last.percent / 100, strokeDasharray: '7 5' }); }) : null,
        h('rect', { x: 443, y: 30, width: 20, height: 143, rx: 6, fill: '#65e2ce', stroke: '#b8fff2', strokeWidth: 2 })),
      h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, last ? last.percent.toFixed(1) + '%' : '—'), h('span', null, nt('transmitted', 'of the original beam transmitted'))),
      h('p', { className: 'ns-note', style: { color: '#d0e3f5', textAlign: 'center', margin: '12px 0 0' } }, last ? nt('tested_setting', 'Last test: {material}, {thickness} cm', { material: materialName(last.material), thickness: last.thickness }) : nt('ready_test', 'Set up a shield, then test the beam.')));
    var shieldControls = h('div', { className: 'ns-controls' },
      h(NuclearStudioPrediction, { key: 'shield-prediction', ctx: props.ctx, observed: trials.length > 0, value: shieldPrediction ? materialName(shieldPrediction) : null },
      h('h5', null, nt('shield_prediction', 'At the same thickness, which passes the least gamma radiation?')),
      h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('shield_predict_group', 'Predict a shielding material') }, materials.map(function (item) {
        return choice(materialName(item.id), shieldPrediction === item.id, function () { update('shield', { prediction: item.id }); }, trials.length > 0, item.id);
      }))),
      h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
      shieldPrediction ? fairPair ? null : nkStudioGuidance(h, nt,
        comparison ? nt('guide_shield_compare', 'Compare with your {material} result at {thickness} cm. Test another material at that same thickness.', { material: materialName(comparison.material), thickness: comparisonThickness })
          : nt('guide_shield_first', 'Start with one material at a thickness above zero. Then compare another material at the same thickness.'),
        nt('guide_set_shield', 'Prepare {material} at {thickness} cm', { material: materialName(comparisonMaterial), thickness: comparisonThickness }), needsShieldSetup ? function () {
          focusShieldRun.current = true;
          update('shield', { material: comparisonMaterial, thickness: comparisonThickness });
          say(nt('guide_prepared', 'Setup ready. Run the experiment to record a result.'));
        } : null)
        : h('p', { className: 'ns-note' }, nt('fair_test', 'Try two materials at the same nonzero thickness for a fair comparison.')),
      h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('test_material_group', 'Material to test') }, materials.map(function (item) {
        return choice(materialName(item.id), material.id === item.id, function () { update('shield', { material: item.id }); }, false, item.id);
      })),
      h('label', { className: 'ns-label', htmlFor: 'ns-thickness' }, nt('thickness', 'Thickness'), h('span', null, nt('centimetres', '{value} cm', { value: thickness }))),
      h('input', { id: 'ns-thickness', className: 'ns-range', type: 'range', min: 0, max: 10, step: .5, value: thickness, 'aria-valuetext': nt('centimetres_long', '{value} centimetres', { value: thickness }), onChange: function (e) { update('shield', { thickness: Number(e.target.value) }); } }),
      h('button', { ref: shieldRunRef, type: 'button', className: 'ns-primary', disabled: !shieldPrediction, onClick: function () {
        var row = { material: material.id, thickness: thickness };
        var duplicate = trials.some(function (item) { return item.material === row.material && item.thickness === row.thickness; });
        var next = trials.filter(function (item) { return item.material !== row.material || item.thickness !== row.thickness; }).concat([row]).slice(-6);
        update('shield', { trials: next });
        say(nt('shield_result', '{material}, {thickness} cm: {percent} percent of the beam transmitted.', { material: materialName(material.id), thickness: thickness, percent: (100 * Math.exp(-material.mu * thickness)).toFixed(1) }) + (duplicate ? ' ' + nt('repeat_test', 'Repeated setup; notebook updated.') : ''));
      } }, nt('test_shield', 'Test this shield →')),
      !shieldPrediction ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
      changedSettings ? h('p', { className: 'ns-feedback' }, nt('settings_changed', 'Settings changed. Test again to update the detector.')) : null,
      liveResult(),
      fairPair ? h('p', { className: 'ns-feedback' }, nt('fair_pair_done', 'You have a fair comparison. Use your notebook to explain the difference.')) : null,
      h('button', { type: 'button', className: 'ns-secondary', style: { marginTop: 12 }, onClick: function () { update('shield', { prediction: null, trials: [], explanation: null }); say(nt('shield_reset', 'Trials cleared. Make a new prediction.')); } }, nt('new_shield_trial', 'Start a new comparison')),
      nkStudioHint(h, nt, !shieldPrediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : nt('hint_shield', 'Test one material at 2 cm. Keep 2 cm selected, choose another material, and test again. Compare how much of the beam passes through.'), 'shield'),
      fairPair ? explanation('shield', nt('shield_explain_yes', 'At the same thickness, different materials transmit different amounts.'), nt('shield_explain_no', 'Any material blocks all gamma radiation.')) : null);
    return h('div', { 'data-nk-studio': mission },
      h('div', { className: 'ns-hero' },
        h('div', null, h('p', { className: 'ns-eyebrow' }, nt('eyebrow', 'Nuclear & Radiation Lab')), h('h3', null, nt('title', 'Small experiments. Big discoveries.')), h('p', null, nt('intro', 'Make a prediction, change one thing, and see what the evidence says.'))),
        h('div', { className: 'ns-progress', 'aria-label': nt('progress_total', '{count} of {total} discoveries recorded', { count: completed.length, total: journey.length }) }, h('strong', null, completed.length + ' / ' + journey.length), h('span', null, nt('discoveries', 'discoveries recorded')))),
      h('details', { className: 'ns-chooser', ref: chooserRef },
        h('summary', null, nt('choose_experiment', 'Choose an experiment'), h('span', { className: 'ns-position' }, nt('experiment_number', '{number} of {total}', { number: missionIndex + 1, total: journey.length }))),
        resume ? h('button', { type: 'button', className: 'ns-secondary ns-resume', 'data-ns-resume': resume.id, onClick: function () { selectMission(resume.id); } }, nt('resume_experiment', 'Resume: {title}', { title: resume.title })) : null,
        h('div', { className: 'ns-missions', role: 'group', 'aria-label': nt('choose_experiment', 'Choose an experiment') }, journey.map(function (item) {
          var saved = completed.indexOf(item.id) >= 0;
          return h('button', { key: item.id, className: 'ns-mission', 'data-ns-mission': item.id, type: 'button', 'aria-pressed': mission === item.id, onClick: function () { selectMission(item.id); } }, h('span', { className: 'ns-mission-icon', 'aria-hidden': 'true' }, item.icon), h('span', null, h('strong', null, item.title), h('small', null, item.sub), h('span', { className: 'ns-mission-state' }, saved ? nt('activity_recorded', 'Discovery recorded') : nkStudioHasWork(item.id, raw[item.id]) ? nt('activity_in_progress', 'In progress') : nt('activity_not_started', 'Not started'))), saved ? h('span', { className: 'ns-selected-mark', 'aria-label': nt('completed', 'Completed') }, '✓') : null);
        }))),
      h('div', { className: 'ns-heading' }, h('h4', { ref: titleRef, tabIndex: -1 }, mission === 'rays' ? nt('rays_heading', 'A signal disappears. Has the source stopped?') : mission === 'counting' ? nt('counting_heading', 'Can the same setup give different counts?') : mission === 'distance' ? nt('distance_heading', 'What changes when you move farther away?') : mission === 'chain' ? nt('chain_heading', 'Can a chain stay steady?') : mission === 'decay' ? nt('decay_heading', 'Where did the other atoms go?') : nt('shield_heading', 'Can you weaken the beam?')), h('p', null, mission === 'rays' ? nt('rays_goal', 'Compare two types of radiation. Put paper in the path and watch what changes.') : mission === 'counting' ? nt('counting_goal', 'A count is one detected event. Keep the setup unchanged and repeat.') : mission === 'distance' ? nt('distance_goal_plain', 'Keep the source the same. Compare how much radiation reaches the detector.') : mission === 'chain' ? nt('chain_goal_plain', 'A generation is one round of reactions. Watch what each round starts.') : mission === 'decay' ? nt('decay_goal', 'Start with 64 parent atoms. Predict what remains after two half-lives.') : nt('shield_goal', 'Compare water, concrete, and lead. Keep the thickness equal first.'))),
      ['distance', 'chain', 'counting', 'rays'].indexOf(mission) >= 0 ? h(mission === 'rays' ? NuclearRayExperiment : mission === 'counting' ? NuclearCountingExperiment : NuclearStarterExperiment, { key: mission, ctx: props.ctx, kind: mission, data: raw[mission], nextLabel: nextLabel, onNext: goNext, onChange: function (patch) { update(mission, patch); }, onExplain: function (correct) { update(mission, { explanation: correct ? 'correct' : 'retry' }, correct ? { completed: completed.indexOf(mission) >= 0 ? completed : completed.concat([mission]) } : null); } }) : h('div', { className: 'ns-grid' },
        h('div', null, mission === 'decay' ? decayScene : shieldScene,
          h('div', { className: 'ns-notebook', 'data-ns-notebook': mission }, h('h5', null, nt('notebook', 'Your observations')),
            mission === 'decay' ? h('table', null, h('caption', null, nt('decay_notebook', 'Expected population after each interval')), h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('half_lives', 'Half-lives')), h('th', { scope: 'col' }, nt('atoms_left', 'Parent atoms remaining')))), h('tbody', null, Array.from({ length: step + 1 }, function (_, n) { return h('tr', { key: n }, h('th', { scope: 'row' }, n), h('td', null, 64 * Math.pow(.5, n))); })))
              : trials.length ? h('table', null, h('caption', null, nt('shield_notebook', 'Most recent six distinct test setups')), h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('material', 'Material')), h('th', { scope: 'col' }, nt('thickness', 'Thickness')), h('th', { scope: 'col' }, nt('beam_left', 'Beam left')))), h('tbody', null, trials.map(function (row, i) { return h('tr', { key: i }, h('th', { scope: 'row' }, materialName(row.material)), h('td', null, row.thickness + ' cm'), h('td', null, row.percent.toFixed(1) + '%')); })))
                : h('p', { className: 'ns-note' }, nt('empty_notebook', 'Your first test will appear here.'))),
          h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
            h('p', { className: 'ns-note' }, mission === 'decay' ? nt('decay_model_note', 'The dots show the expected trend, not a prediction of which individual atom decays. Real radioactive decay is random: a sample of 64 can differ from these exact counts. Decayed parent atoms have changed into daughter nuclei; they have not vanished.') : nt('shield_model_note', 'This model uses exponential attenuation for a narrow beam of 1 MeV gamma photons and the lab’s existing material coefficients. It tracks radiation removed from the direct beam, including scattering. It is a teaching model, not a real shielding design.')),
            h('a', { href: mission === 'decay' ? 'https://www.nrc.gov/education-regulatory-research/glossary/half-life' : 'https://physics.nist.gov/PhysRefData/XrayMassCoef/chap2.html', target: '_blank', rel: 'noopener noreferrer' }, mission === 'decay' ? nt('nrc_source', 'Source: NRC half-life definition') : nt('nist_source', 'Source: NIST attenuation model')))),
        mission === 'decay' ? decayControls : shieldControls),
      completed.length ? h('details', { className: 'ns-notebook ns-recap' }, h('summary', null, nt('recap_notes_title', 'Your discoveries & notes ({count})', { count: completed.length })),
        h('ul', null, journey.filter(function (item) { return completed.indexOf(item.id) >= 0; }).map(function (item) {
          return h('li', { key: item.id, 'data-ns-discovery': item.id }, h('p', null, takeaways[item.id]), h('button', { type: 'button', className: 'ns-secondary', onClick: function () { selectMission(item.id); } }, nt('recap_revisit', 'Revisit: {title}', { title: item.title })),
            h(NuclearStudioReflection, { ctx: props.ctx, kind: item.id, title: item.title, note: raw[item.id] && raw[item.id].reflection, onChange: function (note) { update(item.id, { reflection: note }); } }));
        }))) : null,
      h('div', { className: 'ns-studio-footer' }, h('span', null, nt('self_paced_footer', 'No timer. Test, revisit, and revise.')), h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onView('reactor'); } }, nt('reactor_invite', 'Ready for more? Operate a reactor →'))));
  }

  function NuclearLabWorkspace(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    var d = ctx.toolData && ctx.toolData._nuclearLab || {};
    var mode = d.nkView === 'reference' || (!d.nkView && ['safe', 'me', 'safety', 'works', 'know'].indexOf(d.nkPath) >= 0) ? 'reference' : d.nkView === 'reactor' ? 'reactor' : 'studio';
    var contentRef = React.useRef(null), pendingFocus = React.useRef(false);
    React.useEffect(function () { if (pendingFocus.current && contentRef.current) { contentRef.current.focus(); pendingFocus.current = false; } }, [mode]);
    function changeView(next) {
      if (next === mode) return;
      pendingFocus.current = true;
      ctx.setToolData(function (prev) { return Object.assign({}, prev, { _nuclearLab: Object.assign({}, prev && prev._nuclearLab, { nkView: next, nkPath: null, nkOpen: false }) }); });
    }
    return h('div', { className: 'nk-workspace', 'data-nuclear-lab': mode === 'studio' ? 'true' : undefined, 'data-ns-large': !!d.nkLargeText, 'data-ns-reduced': !!d.nkReduceMotion, 'data-theme': ctx.theme === 'light' ? 'light' : 'dark', style: { containerType: 'inline-size' } },
      h('style', null, NK_STUDIO_CSS),
      h('nav', { className: 'ns-nav', 'aria-label': nt('workspace_views', 'Nuclear Lab views') },
        [{ id: 'studio', label: nt('studio_view', 'Experiment studio') }, { id: 'reference', label: nt('reference_view', 'All topics & routes') }, { id: 'reactor', label: nt('reactor_view', 'Reactor control room') }].map(function (view) {
          return h('button', { key: view.id, type: 'button', 'aria-pressed': mode === view.id, onClick: function () { changeView(view.id); } }, view.label);
        })),
      h('div', { ref: contentRef, tabIndex: -1, role: 'region', 'aria-label': mode === 'studio' ? nt('studio_view', 'Experiment studio') : mode === 'reactor' ? nt('reactor_view', 'Reactor control room') : nt('reference_view', 'All topics & routes') },
        mode === 'studio' ? h(NuclearExperimentStudio, { ctx: ctx, state: d.nkStudio, onView: changeView, onChange: function (update) {
          ctx.setToolData(function (prev) {
            var current = prev && prev._nuclearLab || {}, studio = current.nkStudio;
            if (!studio || typeof studio !== 'object' || Array.isArray(studio)) studio = {};
            return Object.assign({}, prev, { _nuclearLab: Object.assign({}, current, { nkStudio: update(studio), nkView: 'studio' }) });
          });
        } }) : h(props.Reference, { key: mode, ctx: ctx })),
      mode === 'studio' && typeof ctx.setStemLabTool === 'function' ? h('button', { type: 'button', className: 'ns-secondary', style: { marginTop: 12 }, onClick: function () { ctx.setStemLabTool(null); } }, nt('back_tools', '← Back to tools')) : null);
  }
