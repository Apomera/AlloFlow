// Multi-Activity Unit Playlists ("Arc Builder") for offline student packets.
// Plain UMD script for browser pages (window.AlloPacketPlaylist) and Node (module.exports).
// Combines 2 to 5 distinct stages from Wave 2-4 builders into ONE verifiable offline .html student file,
// merging ONLY the extraAdapters and extraCss needed by the selected stages plus a visual Stage Roadmap banner
// and optional deterministic Mastery Branching (adaptiveScaffold + stretchItems).
// Deterministic local builder: no network calls, no markup strings.
(function (root) {
  'use strict';

  var VERSION = 1;
  var MIN_STAGES = 2;
  var MAX_STAGES = 5;

  var ROADMAP_CSS = [
    '.pl-wrap{display:grid;gap:14px}',
    '.pl-head{margin:0;font-size:1.18rem;font-weight:700;line-height:1.35}',
    '.pl-sub{margin:0;color:var(--muted);font-size:.95rem;line-height:1.45}',
    '.pl-badge-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.pl-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;border:1.5px solid var(--accent);background:var(--soft);color:var(--ink);font-size:.86rem;font-weight:700}',
    '.pl-roadmap{list-style:none;margin:0;padding:0;display:grid;gap:10px}',
    '.pl-stage{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px 14px;border:2px solid var(--line);border-radius:14px;background:var(--card)}',
    '@media (max-width:520px){.pl-stage{grid-template-columns:auto 1fr}.pl-count{grid-column:2}}',
    '.pl-num{min-width:34px;height:34px;border-radius:999px;background:var(--accent);color:var(--accent-ink);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem}',
    '.pl-stage-body{display:grid;gap:2px}',
    '.pl-stage-domain{margin:0;font-size:.78rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}',
    '.pl-stage-title{margin:0;font-size:1.05rem;font-weight:700;line-height:1.3}',
    '.pl-count{margin:0;font-size:.88rem;font-weight:700;color:var(--muted);white-space:nowrap}',
    '.pl-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.pl-actions button{min-height:46px}',
    '@media (forced-colors:active){.pl-stage,.pl-badge{forced-color-adjust:none;border:2px solid CanvasText;background:Canvas;color:CanvasText}.pl-num{forced-color-adjust:none;background:Highlight;color:HighlightText}}',
    '@media print{.pl-actions{display:none!important}.pl-stage{break-inside:avoid}}',
  ].join('\n');

  function str(v, max) {
    var s = v == null ? '' : String(v);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += (c < 32 || c === 127) ? ' ' : s.charAt(i);
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, max || 280);
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function fnv1a(text) {
    var h = 2166136261;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function slug(text, max) {
    var s = str(text, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (s || 'unit-playlist').slice(0, max || 44);
  }

  function codeName(raw) {
    return str(raw, 40);
  }

  function fileName(title, learner) {
    var base = slug(title, 44);
    var who = learner ? '__' + slug(learner, 24) : '';
    return base + who + '.html';
  }

  function withSpeechManifest(html) {
    if (typeof html !== 'string' || html.indexOf('speechSynthesis') < 0) return html;
    var tag = '<script type="application/json" id="packet-manifest">';
    var start = html.indexOf(tag);
    if (start < 0) return html;
    var bodyStart = start + tag.length;
    var end = html.indexOf('</script>', bodyStart);
    if (end < 0) return html;
    try {
      var obj = JSON.parse(html.slice(bodyStart, end), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return html;
      if (!obj.speech) {
        obj.speech = {
          engine: 'speechSynthesis',
          localOnly: true,
          when: 'only when the learner presses Read aloud',
        };
      }
      var json = JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      return html.slice(0, bodyStart) + json + html.slice(end);
    } catch (_) {
      return html;
    }
  }

  function withCodeName(html, learner) {
    var clean = codeName(learner);
    if (!clean) return html;
    var tag = '<script type="application/json" id="packet-manifest">';
    var start = html.indexOf(tag);
    if (start < 0) return html;
    var bodyStart = start + tag.length;
    var end = html.indexOf('</script>', bodyStart);
    if (end < 0) return html;
    try {
      var obj = JSON.parse(html.slice(bodyStart, end));
      obj.learner = clean;
      var json = JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      return html.slice(0, bodyStart) + json + html.slice(end);
    } catch (_) {
      return html;
    }
  }

  // Self-contained Stage Roadmap Banner adapter (block 0 of every playlist packet).
  function renderPlaylistRoadmap(item, ctx) {
    var stages = Array.isArray(item.stages) ? item.stages : [];
    var locked = false;
    var wrap = ctx.el('div', { class: 'pl-wrap', 'data-pl-roadmap': '' });
    wrap.appendChild(ctx.el('p', {
      class: 'pl-head',
      text: item.prompt || ('Your ' + stages.length + '-stage unit roadmap is ready. Work through each stage in order.'),
    }));

    var badges = [
      ctx.el('span', { class: 'pl-badge', text: stages.length + ' stages in this unit' }),
    ];
    if (item.adaptiveScaffold) {
      badges.push(ctx.el('span', { class: 'pl-badge', 'data-pl-adaptive-badge': '', text: 'Adaptive hints & stretch checks on' }));
    }
    wrap.appendChild(ctx.el('div', { class: 'pl-badge-row' }, badges));

    var list = ctx.el('ol', { class: 'pl-roadmap', 'aria-label': 'Unit stages in order' });
    stages.forEach(function (st, idx) {
      var n = idx + 1;
      var countLabel = st.itemCount === 1 ? '1 activity' : (st.itemCount + ' items');
      list.appendChild(ctx.el('li', { class: 'pl-stage', 'data-pl-stage': String(n) }, [
        ctx.el('span', { class: 'pl-num', 'aria-hidden': 'true', text: String(n) }),
        ctx.el('div', { class: 'pl-stage-body' }, [
          ctx.el('p', { class: 'pl-stage-domain', text: 'Stage ' + n + (st.domain ? ' \u00b7 ' + st.domain : '') }),
          ctx.el('p', { class: 'pl-stage-title', text: st.label || ('Stage ' + n) }),
        ]),
        ctx.el('p', { class: 'pl-count', text: countLabel }),
      ]));
    });
    wrap.appendChild(list);

    var startBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-pl-begin': '',
      on: { click: function () {
        if (locked || ctx.isDone()) return;
        ctx.support('playlistRoadmap');
        ctx.practice('roadmap', 'Starting Stage 1: ' + (stages[0] ? stages[0].label : 'First stage') + '.', { advance: true });
      } },
      text: 'Start Stage 1',
    });
    wrap.appendChild(ctx.el('div', { class: 'pl-actions' }, [startBtn]));
    ctx.root.appendChild(wrap);

    return {
      stop: function () { locked = true; startBtn.disabled = true; },
      reveal: function () { locked = true; startBtn.disabled = true; },
    };
  }

  var ROADMAP_ADAPTER = {
    id: 'playlist_roadmap',
    title: 'Unit Roadmap',
    labels: { playlist_roadmap_title: 'Unit Roadmap' },
    render: renderPlaylistRoadmap,
  };

  // Curated catalog of pickable stages across Wave 2-4 builders.
  var STAGE_CATALOG = [
    { id: 'st_states_matter_sort', source: 'choice', activity: 'concept_sort', starterId: 'sci_states_matter_sort', domain: 'Science', gradeBand: 'Grades 3-5', label: 'States of Matter Concept Sort', summary: 'Sort real-world examples into Solid, Liquid, and Gas.', defaultMaxItems: 0 },
    { id: 'st_water_cycle_seq', source: 'choice', activity: 'sequence_order', starterId: 'sci_water_cycle_seq', domain: 'Science', gradeBand: 'Grades 3-5', label: 'Water Cycle Sequencing', summary: 'Order the four stages of the water cycle from evaporation to collection.', defaultMaxItems: 0 },
    { id: 'st_bill_to_law_seq', source: 'choice', activity: 'sequence_order', starterId: 'ss_bill_to_law_seq', domain: 'Social Studies', gradeBand: 'Grades 6-8', label: 'How a Bill Becomes a Law Timeline', summary: 'Sequence civic steps from proposal through committee, vote, and signature.', defaultMaxItems: 0 },
    { id: 'st_claim_evidence_write', source: 'choice', activity: 'tiered_writing', starterId: 'ela_claim_evidence_write', domain: 'Writing', gradeBand: 'Grades 6-8', label: 'Claim, Evidence & Reasoning Writing', summary: 'Tiered sentence frames and word bank for an evidence-based paragraph.', defaultMaxItems: 0 },
    { id: 'st_ecosystems_choice', source: 'choice', activity: 'choice_board', starterId: 'sci_ecosystems_choice', domain: 'Science', gradeBand: 'Grades 3-5', label: 'Ecosystems UDL Choice Board', summary: 'Student selects one of three equivalent ways to show ecosystem understanding.', defaultMaxItems: 0 },
    { id: 'st_story_elements_choice', source: 'choice', activity: 'choice_board', starterId: 'ela_story_elements_choice', domain: 'Literacy', gradeBand: 'Grades 3-5', label: 'Story Elements UDL Choice Board', summary: 'Show character, setting, and problem via sort, timeline, or frame response.', defaultMaxItems: 0 },
    { id: 'st_maze_pond_g23', source: 'maze', activity: 'maze_reading', starterId: 'g2_3_pond_helpers', domain: 'Reading Fluency', gradeBand: 'Grades 2-3', label: 'Maze Reading: Busy Pond (6 blanks)', summary: 'Focused 6-blank contextual reading practice from The Busy Pond.', defaultMaxItems: 6 },
    { id: 'st_maze_monarch_g45', source: 'maze', activity: 'maze_reading', starterId: 'g4_5_monarch_journey', domain: 'Reading Fluency', gradeBand: 'Grades 4-5', label: 'Maze Reading: Monarch Journey (6 blanks)', summary: 'Focused 6-blank contextual reading practice on monarch migration.', defaultMaxItems: 6 },
    { id: 'st_maze_tides_g68', source: 'maze', activity: 'maze_reading', starterId: 'g6_8_tidal_clocks', domain: 'Reading Fluency', gradeBand: 'Grades 6-8', label: 'Maze Reading: Tidal Clocks (6 blanks)', summary: 'Focused 6-blank informational reading practice on ocean tides.', defaultMaxItems: 6 },
    { id: 'st_manip_base10_g2', source: 'manipulatives', activity: 'manip_base_ten', starterId: 'b10_place_value_g2', domain: 'Math Manipulatives', gradeBand: 'Grades 2-3', label: 'Place Value Base-10 Blocks', summary: 'Build numbers using interactive hundreds flats, tens rods, and ones cubes.', defaultMaxItems: 0 },
    { id: 'st_manip_frac_equiv_g4', source: 'manipulatives', activity: 'manip_fraction_bars', starterId: 'frac_equiv_g4', domain: 'Math Manipulatives', gradeBand: 'Grades 4-5', label: 'Equivalent Fractions Bars', summary: 'Shade interactive fraction bars to build and compare equivalent fractions.', defaultMaxItems: 0 },
    { id: 'st_manip_numline_g6', source: 'manipulatives', activity: 'manip_number_line', starterId: 'nl_integers_fracs_g6', domain: 'Math Manipulatives', gradeBand: 'Grades 5-6', label: 'Number Line Jumps & Integers', summary: 'Plot values and step across positive and negative numbers on a number line.', defaultMaxItems: 0 },
    { id: 'st_manip_balance_g6', source: 'manipulatives', activity: 'manip_balance_scale', starterId: 'bal_one_step_g6', domain: 'Math Manipulatives', gradeBand: 'Grades 6-7', label: 'One-Step Equations Balance Scale', summary: 'Keep both pans balanced to isolate x visually.', defaultMaxItems: 0 },
    { id: 'st_stem_circuit_series', source: 'stemLab', activity: 'stem_circuit', starterId: 'circuit_series_basics', domain: 'STEM Lab', gradeBand: 'Grades 4-6', label: 'Series Circuit Exploration', summary: 'Wire a battery, switch, and bulbs in an interactive circuit simulator.', defaultMaxItems: 0 },
    { id: 'st_stem_data_plants', source: 'stemLab', activity: 'stem_data_explorer', starterId: 'data_plant_growth', domain: 'STEM Lab', gradeBand: 'Grades 3-5', label: 'Plant Growth Data Explorer', summary: 'Inspect real experiment data in an interactive bar chart and table.', defaultMaxItems: 0 },
    { id: 'st_stem_geom_area', source: 'stemLab', activity: 'stem_geometry_grid', starterId: 'geom_area_perimeter', domain: 'STEM Lab', gradeBand: 'Grades 4-6', label: 'Area & Perimeter Tile Grid', summary: 'Build rectangles with target area and perimeter on a live unit grid.', defaultMaxItems: 0 },
    { id: 'st_life_money', source: 'lifeSkills', activity: 'life_money', starterId: 'ls_money_change', domain: 'Life Skills', gradeBand: 'Grades 6-12', label: 'Making Change & Budgeting', summary: 'Count US bills and coins for exact pay, change, and a $12 grocery budget.', defaultMaxItems: 0 },
    { id: 'st_life_transit', source: 'lifeSkills', activity: 'life_transit', starterId: 'ls_transit_routes', domain: 'Life Skills', gradeBand: 'Grades 6-12', label: 'Transit & Schedule Reading', summary: 'Read departure tables, transfer platforms, and travel times.', defaultMaxItems: 0 },
    { id: 'st_life_kitchen', source: 'lifeSkills', activity: 'life_kitchen', starterId: 'ls_kitchen_safety', domain: 'Life Skills', gradeBand: 'Grades 6-12', label: 'Kitchen & Home Safety', summary: 'Practice safe stove, food handling, and home emergency routines.', defaultMaxItems: 0 },
    { id: 'st_life_laundry', source: 'lifeSkills', activity: 'life_laundry', starterId: 'ls_laundry_care', domain: 'Life Skills', gradeBand: 'Grades 6-12', label: 'Laundry Sorting & Care Tags', summary: 'Sort garments by color and care labels for safe washing and drying.', defaultMaxItems: 0 },
    { id: 'st_life_signs', source: 'lifeSkills', activity: 'life_signs', starterId: 'ls_community_signs', domain: 'Life Skills', gradeBand: 'Grades 4-12', label: 'Community & Safety Signs', summary: 'Identify exit, caution, and accessible route signs in community settings.', defaultMaxItems: 0 },
    { id: 'st_sel_first_then', source: 'sel', activity: 'sel_first_then', starterId: 'sel_first_then_routine', domain: 'Focus & UDL', gradeBand: 'Grades K-12', label: 'First-Then & Task Checklist', summary: 'Plan the work steps before diving into the unit.', defaultMaxItems: 0 },
    { id: 'st_sel_calm', source: 'sel', activity: 'sel_calm_toolkit', starterId: 'sel_calm_reset_cards', domain: 'Focus & UDL', gradeBand: 'Grades K-12', label: 'Private Calm Reset Cards', summary: 'Optional private breathing, grounding, and stretch cards between tasks.', defaultMaxItems: 0 },
    { id: 'st_sel_udl_reflect', source: 'sel', activity: 'sel_udl_reflect', starterId: 'sel_udl_goal_check', domain: 'Focus & UDL', gradeBand: 'Grades 3-12', label: 'Private UDL Reflection & Goal Check', summary: 'Wrap up by choosing which learning supports helped most (notes private by default).', defaultMaxItems: 0 },
  ];

  // 4 Curated Cross-Curricular Starter Unit Arcs.
  var STARTER_ARCS = [
    {
      id: 'arc_sci_lit_g35',
      gradeBand: 'Grades 3-5',
      subject: 'Science & Literacy',
      name: 'Grades 3-5 Science & Literacy Arc',
      title: 'Science & Literacy Unit Arc',
      summary: 'Sort states of matter, analyze plant growth data in a mini-STEM lab, and close with a private UDL support reflection.',
      adaptiveScaffold: true,
      stageIds: ['st_states_matter_sort', 'st_stem_data_plants', 'st_sel_udl_reflect'],
    },
    {
      id: 'arc_frac_area_g46',
      gradeBand: 'Grades 4-6',
      subject: 'Math & STEM',
      name: 'Grades 4-6 Fractions & Area Arc',
      title: 'Fractions & Area Unit Arc',
      summary: 'Build equivalent fractions with visual bars, construct area and perimeter rectangles on a tile grid, and reflect on UDL supports.',
      adaptiveScaffold: true,
      stageIds: ['st_manip_frac_equiv_g4', 'st_stem_geom_area', 'st_sel_udl_reflect'],
    },
    {
      id: 'arc_evidence_civics_g68',
      gradeBand: 'Grades 6-8',
      subject: 'ELA & Social Studies',
      name: 'Grades 6-8 Evidence & Civic Timeline Arc',
      title: 'Evidence & Civic Timeline Arc',
      summary: 'Read a 6-blank Maze passage, sequence how a bill becomes a law, draft a claim with evidence, and check learning supports.',
      adaptiveScaffold: true,
      stageIds: ['st_maze_tides_g68', 'st_bill_to_law_seq', 'st_claim_evidence_write', 'st_sel_udl_reflect'],
    },
    {
      id: 'arc_transition_focus',
      gradeBand: 'Grades 6-12 / Transition',
      subject: 'Life Skills & Focus',
      name: 'Transition Daily Skills & Focus Arc',
      title: 'Daily Transition & Focus Arc',
      summary: 'Start with a First-Then plan, practice US money and transit schedules, and finish with private calm-down strategy cards.',
      adaptiveScaffold: true,
      stageIds: ['st_sel_first_then', 'st_life_money', 'st_life_transit', 'st_sel_calm'],
    },
  ];

  function stageById(id) {
    for (var i = 0; i < STAGE_CATALOG.length; i++) {
      if (STAGE_CATALOG[i].id === id) return STAGE_CATALOG[i];
    }
    return null;
  }

  function arcById(id) {
    for (var i = 0; i < STARTER_ARCS.length; i++) {
      if (STARTER_ARCS[i].id === id) return STARTER_ARCS[i];
    }
    return null;
  }

  function resolveBuilders(given) {
    var g = given && typeof given === 'object' ? given : {};
    return {
      choice: g.choice || root.AlloPacketChoice || null,
      sortWrite: g.sortWrite || root.AlloPacketSortWriteAdapters || null,
      maze: g.maze || root.AlloPacketMaze || null,
      manipulatives: g.manipulatives || root.AlloPacketManipulatives || null,
      stemLab: g.stemLab || root.AlloPacketStemLab || null,
      lifeSkills: g.lifeSkills || root.AlloPacketLifeSkills || null,
      sel: g.sel || root.AlloPacketSel || null,
    };
  }

  function resolveLoader(given) {
    if (given && typeof given.buildHtml === 'function') return given;
    if (root && root.AlloWordSoundsTakeHome && typeof root.AlloWordSoundsTakeHome.buildHtml === 'function') return root.AlloWordSoundsTakeHome;
    throw new Error('buildPlaylistPacket needs AlloWordSoundsTakeHome loader');
  }

  var ACTIVITY_META = {
    concept_sort: { source: 'choice', domain: 'Choice & Sort', badge: 'Choice & Sort', label: 'Concept Sort', summary: 'Sort examples into categories.', defaultStarterId: 'sci_states_matter_sort' },
    sequence_order: { source: 'choice', domain: 'Choice & Sort', badge: 'Choice & Sort', label: 'Sequence & Timeline', summary: 'Arrange steps or events in order.', defaultStarterId: 'sci_water_cycle_seq' },
    tiered_writing: { source: 'choice', domain: 'Writing', badge: 'Writing', label: 'Tiered Frame Writing', summary: 'Draft a response using sentence frames and a word bank.', defaultStarterId: 'ela_claim_evidence_write' },
    choice_board: { source: 'choice', domain: 'Choice & Sort', badge: 'Choice & Sort', label: 'UDL Choice Board', summary: 'Choose one of three equivalent ways to show understanding.', defaultStarterId: 'sci_ecosystems_choice' },
    maze_reading: { source: 'maze', domain: 'Reading Fluency', badge: 'Reading Fluency', label: 'Maze Reading', summary: 'Choose the word that fits each passage blank in context.', defaultStarterId: 'g2_3_pond_helpers' },
    manip_base_ten: { source: 'manipulatives', domain: 'Math Manipulatives', badge: 'Math Manipulatives', label: 'Place Value Base-10 Blocks', summary: 'Build numbers using interactive hundreds flats, tens rods, and ones cubes.', defaultStarterId: 'b10_place_value_g2' },
    manip_fraction_bars: { source: 'manipulatives', domain: 'Math Manipulatives', badge: 'Math Manipulatives', label: 'Equivalent Fractions Bars', summary: 'Shade interactive fraction bars to build and compare equivalent fractions.', defaultStarterId: 'frac_equiv_g4' },
    manip_number_line: { source: 'manipulatives', domain: 'Math Manipulatives', badge: 'Math Manipulatives', label: 'Number Line Jumps & Integers', summary: 'Plot values and step across positive and negative numbers on a number line.', defaultStarterId: 'nl_integers_fracs_g6' },
    manip_balance_scale: { source: 'manipulatives', domain: 'Math Manipulatives', badge: 'Math Manipulatives', label: 'One-Step Equations Balance Scale', summary: 'Keep both pans balanced to isolate x visually.', defaultStarterId: 'bal_one_step_g6' },
    stem_circuit: { source: 'stemLab', domain: 'STEM Lab', badge: 'STEM Lab', label: 'Series Circuit Exploration', summary: 'Wire a battery, switch, and bulbs in an interactive circuit simulator.', defaultStarterId: 'circuit_series_basics' },
    stem_data_explorer: { source: 'stemLab', domain: 'STEM Lab', badge: 'STEM Lab', label: 'Plant Growth Data Explorer', summary: 'Inspect real experiment data in an interactive bar chart and table.', defaultStarterId: 'data_plant_growth' },
    stem_geometry_grid: { source: 'stemLab', domain: 'STEM Lab', badge: 'STEM Lab', label: 'Area & Perimeter Tile Grid', summary: 'Build rectangles with target area and perimeter on a live unit grid.', defaultStarterId: 'geom_area_perimeter' },
    life_money: { source: 'lifeSkills', domain: 'Life Skills', badge: 'Life Skills', label: 'Making Change & Budgeting', summary: 'Count US bills and coins for exact pay, change, and budgeting.', defaultStarterId: 'ls_money_change' },
    life_transit: { source: 'lifeSkills', domain: 'Life Skills', badge: 'Life Skills', label: 'Transit & Schedule Reading', summary: 'Read departure tables, transfer platforms, and travel times.', defaultStarterId: 'ls_transit_routes' },
    life_kitchen: { source: 'lifeSkills', domain: 'Life Skills', badge: 'Life Skills', label: 'Kitchen & Home Safety', summary: 'Practice safe stove, food handling, and home emergency routines.', defaultStarterId: 'ls_kitchen_safety' },
    life_laundry: { source: 'lifeSkills', domain: 'Life Skills', badge: 'Life Skills', label: 'Laundry Sorting & Care Tags', summary: 'Sort garments by color and care labels for safe washing and drying.', defaultStarterId: 'ls_laundry_care' },
    life_signs: { source: 'lifeSkills', domain: 'Life Skills', badge: 'Life Skills', label: 'Community & Safety Signs', summary: 'Identify exit, caution, and accessible route signs in community settings.', defaultStarterId: 'ls_community_signs' },
    sel_first_then: { source: 'sel', domain: 'Focus & UDL', badge: 'Focus & UDL', label: 'First-Then & Task Checklist', summary: 'Plan the work steps before diving into the unit.', defaultStarterId: 'sel_first_then_routine' },
    sel_calm_toolkit: { source: 'sel', domain: 'Focus & UDL', badge: 'Focus & UDL', label: 'Private Calm Reset Cards', summary: 'Optional private breathing, grounding, and stretch cards between tasks.', defaultStarterId: 'sel_calm_reset_cards' },
    sel_udl_reflect: { source: 'sel', domain: 'Focus & UDL', badge: 'Focus & UDL', label: 'Private UDL Reflection & Goal Check', summary: 'Choose which learning supports helped most (notes private by default).', defaultStarterId: 'sel_udl_goal_check' },
  };

  function describeActivity(activity) {
    var key = String(activity || '').trim();
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(ACTIVITY_META, key)) {
      var m = ACTIVITY_META[key];
      return {
        activity: key,
        source: m.source,
        domain: m.domain,
        badge: m.badge,
        label: m.label,
        summary: m.summary,
        defaultStarterId: m.defaultStarterId,
      };
    }
    var src = resolveSourceForActivity(key);
    if (!src) return null;
    var domainMap = {
      choice: 'Choice & Sort',
      maze: 'Reading Fluency',
      manipulatives: 'Math Manipulatives',
      stemLab: 'STEM Lab',
      lifeSkills: 'Life Skills',
      sel: 'Focus & UDL',
    };
    var dom = domainMap[src] || 'Activity';
    return {
      activity: key,
      source: src,
      domain: dom,
      badge: dom,
      label: key.replace(/_/g, ' '),
      summary: '',
      defaultStarterId: '',
    };
  }

  function resolveSourceForActivity(act) {
    if (act === 'concept_sort' || act === 'sequence_order' || act === 'tiered_writing' || act === 'choice_board') return 'choice';
    if (act === 'maze_reading') return 'maze';
    if (/^manip_/.test(act)) return 'manipulatives';
    if (/^stem_/.test(act)) return 'stemLab';
    if (/^life_/.test(act)) return 'lifeSkills';
    if (/^sel_/.test(act)) return 'sel';
    return '';
  }

  function buildStagePayload(spec, builders) {
    var cat = spec && spec.stageId ? stageById(spec.stageId) : null;
    var activity = (spec && spec.activity) || (cat && cat.activity) || '';
    var meta = describeActivity(activity);
    var source = (spec && spec.source) || (cat && cat.source) || (meta && meta.source) || resolveSourceForActivity(activity);
    var starterId = (spec && spec.starterId) || (cat && cat.starterId) || (meta && meta.defaultStarterId) || '';
    var label = str((spec && spec.label) || (cat && cat.label) || (meta && meta.label) || activity, 80);
    var domain = str((spec && spec.domain) || (cat && cat.domain) || (meta && meta.domain) || '', 40);
    var summary = str((spec && spec.summary) || (cat && cat.summary) || (meta && meta.summary) || '', 180);
    var maxItems = (spec && spec.maxItems != null && spec.maxItems !== '')
      ? Math.max(0, Math.floor(Number(spec.maxItems) || 0))
      : (cat && cat.defaultMaxItems ? cat.defaultMaxItems : 0);

    var items = null;
    var stretchItems = [];
    var adapter = null;
    var extraCss = '';
    var extraLabels = null;

    if (source === 'choice') {
      if (!builders.sortWrite || !builders.sortWrite.ADAPTERS || !builders.sortWrite.ADAPTERS[activity]) {
        throw new Error('Playlist stage "' + activity + '" requires AlloPacketSortWriteAdapters.');
      }
      adapter = builders.sortWrite.ADAPTERS[activity];
      extraCss = builders.sortWrite.EXTRA_CSS || '';
      if (Array.isArray(spec && spec.items) && spec.items.length) {
        items = clone(spec.items);
      } else {
        if (!builders.choice || typeof builders.choice.templateById !== 'function') {
          throw new Error('Playlist stage "' + activity + '" requires AlloPacketChoice.');
        }
        var tpl = builders.choice.templateById(starterId);
        if (!tpl) throw new Error('Unknown choice template: ' + starterId);
        var cl = builders.choice.lessonFromChoice({ activity: tpl.activity, title: tpl.title, items: [tpl.item], mode: 'practice' }, builders.sortWrite);
        items = clone(cl.blocks[0].items);
      }
    } else if (source === 'maze') {
      if (!builders.maze || !builders.maze.ADAPTERS || !builders.maze.ADAPTERS[activity]) {
        throw new Error('Playlist stage "' + activity + '" requires AlloPacketMaze.');
      }
      adapter = builders.maze.ADAPTERS[activity];
      extraCss = builders.maze.EXTRA_CSS || '';
      extraLabels = builders.maze.MAZE_LABELS || null;
      if (Array.isArray(spec && spec.items) && spec.items.length) {
        items = clone(spec.items);
      } else {
        var psg = builders.maze.passageById(starterId);
        if (!psg) throw new Error('Unknown maze passage: ' + starterId);
        var ml = builders.maze.lessonFromMaze({ title: psg.title, passage: psg.passage, everyN: psg.everyN, mode: 'practice', includeWarmup: false });
        items = clone(ml.blocks[0].items);
      }
      if (maxItems > 0 && items.length > maxItems) {
        items = items.slice(0, maxItems);
        items.forEach(function (it, idx) { it.blankNumber = idx + 1; it.totalBlanks = items.length; });
      }
    } else if (source === 'manipulatives') {
      if (!builders.manipulatives || !builders.manipulatives.ADAPTERS || !builders.manipulatives.ADAPTERS[activity]) {
        throw new Error('Playlist stage "' + activity + '" requires AlloPacketManipulatives.');
      }
      adapter = builders.manipulatives.ADAPTERS[activity];
      extraCss = builders.manipulatives.EXTRA_CSS || '';
      if (Array.isArray(spec && spec.items) && spec.items.length) {
        items = clone(spec.items);
      } else {
        var mpl = builders.manipulatives.lessonFromManipulatives({ starterId: starterId, activity: activity, mode: 'practice', adaptiveScaffold: true });
        items = clone(mpl.blocks[0].items);
        if (mpl.stretchItems && Array.isArray(mpl.stretchItems[activity])) {
          stretchItems = clone(mpl.stretchItems[activity]);
        }
      }
    } else if (source === 'stemLab') {
      if (!builders.stemLab || !builders.stemLab.ADAPTERS || !builders.stemLab.ADAPTERS[activity]) {
        throw new Error('Playlist stage "' + activity + '" requires AlloPacketStemLab.');
      }
      adapter = builders.stemLab.ADAPTERS[activity];
      extraCss = builders.stemLab.EXTRA_CSS || '';
      if (Array.isArray(spec && spec.items) && spec.items.length) {
        items = clone(spec.items);
      } else {
        var st = builders.stemLab.starterById(starterId);
        if (!st) throw new Error('Unknown STEM lab starter: ' + starterId);
        var sll = builders.stemLab.lessonFromStemLab({
          activity: st.activity,
          title: st.title,
          items: st.items,
          datasetCsv: st.datasetCsv,
          datasetTitle: st.datasetTitle,
          unit: st.unit,
          stretchItems: st.stretchItems,
          adaptiveScaffold: true,
        });
        items = clone(sll.blocks[0].items);
        if (sll.stretchItems && Array.isArray(sll.stretchItems[activity])) {
          stretchItems = clone(sll.stretchItems[activity]);
        } else if (Array.isArray(sll.stretchItems) && sll.stretchItems.length) {
          stretchItems = clone(sll.stretchItems);
        }
      }
    } else if (source === 'lifeSkills') {
      if (!builders.lifeSkills || !builders.lifeSkills.ADAPTERS || !builders.lifeSkills.ADAPTERS[activity]) {
        throw new Error('Playlist stage "' + activity + '" requires AlloPacketLifeSkills.');
      }
      adapter = builders.lifeSkills.ADAPTERS[activity];
      extraCss = builders.lifeSkills.EXTRA_CSS || '';
      if (Array.isArray(spec && spec.items) && spec.items.length) {
        items = clone(spec.items);
      } else {
        var lsl = builders.lifeSkills.lessonFromLifeSkills({ starterId: starterId, activity: activity, mode: 'practice', adaptiveScaffold: true });
        items = clone(lsl.blocks[0].items);
        if (lsl.stretchItems && Array.isArray(lsl.stretchItems[activity])) {
          stretchItems = clone(lsl.stretchItems[activity]);
        }
      }
    } else if (source === 'sel') {
      if (!builders.sel || !builders.sel.ADAPTERS || !builders.sel.ADAPTERS[activity]) {
        throw new Error('Playlist stage "' + activity + '" requires AlloPacketSel.');
      }
      adapter = builders.sel.ADAPTERS[activity];
      extraCss = builders.sel.EXTRA_CSS || '';
      if (Array.isArray(spec && spec.items) && spec.items.length) {
        items = clone(spec.items);
      } else {
        var sell = builders.sel.lessonFromSel({ starterId: starterId, activity: activity });
        items = clone(sell.blocks[0].items);
      }
    } else {
      throw new Error('Unsupported playlist stage activity: ' + activity);
    }

    if (!items || !items.length) throw new Error('Stage "' + label + '" has no ready items.');
    if (maxItems > 0 && source !== 'maze' && items.length > maxItems) {
      items = items.slice(0, maxItems);
    }

    return {
      stageId: (cat && cat.id) || (spec && spec.stageId) || '',
      source: source,
      activity: activity,
      starterId: starterId,
      domain: domain,
      label: label || adapter.title || activity,
      summary: summary,
      maxItems: maxItems,
      items: items,
      stretchItems: stretchItems,
      adapter: adapter,
      extraCss: extraCss,
      extraLabels: extraLabels,
    };
  }

  function normalizeGlossary(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).slice(0, 80).forEach(function (k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      var term = str(k, 80);
      var map = raw[k];
      if (!term || !map || typeof map !== 'object' || Array.isArray(map)) return;
      var kept = {};
      Object.keys(map).forEach(function (lang) {
        if (/^(es|pt|fr|ar|vi|zh)$/.test(lang) && typeof map[lang] === 'string' && map[lang].trim()) {
          kept[lang] = str(map[lang], 180);
        }
      });
      if (Object.keys(kept).length) out[term] = kept;
    });
    return out;
  }

  function resolveStageSpecs(cfg) {
    var arc = cfg.arcId ? arcById(cfg.arcId) : null;
    if (Array.isArray(cfg.stages) && cfg.stages.length) {
      return {
        arc: arc,
        specs: cfg.stages.map(function (st) {
          return typeof st === 'string' ? { stageId: st } : st;
        }),
      };
    }
    var pickedArc = arc || STARTER_ARCS[0];
    return {
      arc: pickedArc,
      specs: pickedArc.stageIds.map(function (id) { return { stageId: id }; }),
    };
  }

  function assemblePlaylist(options) {
    var cfg = options && typeof options === 'object' ? options : {};
    var builders = resolveBuilders(cfg.builders);
    var resolved = resolveStageSpecs(cfg);
    var specs = resolved.specs;
    if (specs.length < MIN_STAGES || specs.length > MAX_STAGES) {
      throw new Error('A unit playlist needs between ' + MIN_STAGES + ' and ' + MAX_STAGES + ' stages.');
    }

    var builtStages = specs.map(function (sp) { return buildStagePayload(sp, builders); });
    var adaptiveOn = cfg.adaptiveScaffold !== false;
    var title = str(cfg.title || (resolved.arc && resolved.arc.title) || 'Unit Learning Playlist', 80);

    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(function (c) { return /^(es|pt|fr|ar|vi|zh)$/.test(c); })
      : [];
    var bilingualGlossary = normalizeGlossary(cfg.bilingualGlossary);
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;

    // Assign globally unique item IDs across stages and attach adaptive skill tags/hints.
    var seenIds = Object.create(null);
    var stretchMap = {};
    var blocks = [];
    var stageMeta = [];
    var actCounts = Object.create(null);

    builtStages.forEach(function (st) {
      actCounts[st.activity] = (actCounts[st.activity] || 0) + 1;
    });

    builtStages.forEach(function (st, sIdx) {
      var cleanItems = st.items.map(function (orig, iIdx) {
        var it = clone(orig);
        var rawId = str(it.id, 40) || (st.activity + '-' + (iIdx + 1));
        if (seenIds[rawId]) rawId = 's' + (sIdx + 1) + '-' + rawId;
        seenIds[rawId] = true;
        it.id = rawId;
        if (adaptiveOn) {
          if (!it.skill && !it.skillTag) it.skill = st.activity;
          if (!it.hint) it.hint = 'Re-read the prompt carefully and check each part of your answer before trying again.';
        }
        return it;
      });
      blocks.push({ activity: st.activity, items: cleanItems });
      stageMeta.push({
        stageId: st.stageId,
        source: st.source,
        activity: st.activity,
        starterId: st.starterId,
        domain: st.domain,
        label: st.label,
        summary: st.summary || '',
        maxItems: st.maxItems,
        itemCount: cleanItems.length,
      });
      if (adaptiveOn && Array.isArray(st.stretchItems) && st.stretchItems.length) {
        stretchMap[st.activity] = (stretchMap[st.activity] || []).concat(st.stretchItems.slice(0, 2).map(function (si, siIdx) {
          var cp = clone(si);
          cp.id = str(cp.id, 40) || ('stretch-' + st.activity + '-' + (siIdx + 1));
          return cp;
        }));
      }
    });

    // Prepend Stage 0 Visual Roadmap Banner block.
    var roadmapBlock = {
      activity: 'playlist_roadmap',
      items: [{
        id: 'pl-roadmap',
        word: title,
        prompt: 'Follow the ' + stageMeta.length + ' stages below in order. Your progress saves on this device as you go.',
        stages: stageMeta.map(function (m) {
          return { domain: m.domain, label: m.label, itemCount: m.itemCount, activity: m.activity };
        }),
        adaptiveScaffold: adaptiveOn,
      }],
    };
    var allBlocks = [roadmapBlock].concat(blocks);

    // Selectively collect ONLY adapters, CSS, and labels for used stages + stretch items.
    var extraAdapters = { playlist_roadmap: ROADMAP_ADAPTER };
    var cssParts = [ROADMAP_CSS];
    var seenSources = Object.create(null);
    var mergedLabels = {};
    var activityTitles = { playlist_roadmap: 'Unit Roadmap' };

    builtStages.forEach(function (st, sIdx) {
      if (!extraAdapters[st.activity]) {
        extraAdapters[st.activity] = st.adapter;
      }
      if (st.extraCss && !seenSources[st.source]) {
        seenSources[st.source] = true;
        cssParts.push(st.extraCss);
      }
      if (st.extraLabels) {
        Object.assign(mergedLabels, st.extraLabels);
      }
      var stageHeading = actCounts[st.activity] === 1
        ? ('Stage ' + (sIdx + 1) + ' of ' + builtStages.length + ': ' + st.label)
        : (st.adapter.title || st.label);
      activityTitles[st.activity] = stageHeading;
      mergedLabels[st.activity + '_title'] = stageHeading;
    });

    var introStages = stageMeta.map(function (m, i) { return (i + 1) + '. ' + m.label; }).join(' ');
    mergedLabels.intro = 'This ' + stageMeta.length + '-stage offline unit playlist runs without AI or internet: ' + introStages + '.';

    var basis = JSON.stringify({
      v: VERSION,
      title: title,
      stages: stageMeta,
      adaptiveScaffold: adaptiveOn,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
    });
    var rev = 'p' + fnv1a(basis);
    var lessonId = slug(title, 34) + '-playlist-' + rev.slice(0, 5);

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: 'practice',
      blocks: allBlocks,
      activityTitles: activityTitles,
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
      playlist: {
        version: VERSION,
        arcId: resolved.arc ? resolved.arc.id : '',
        stages: stageMeta,
      },
    };
    if (adaptiveOn) {
      lesson.adaptiveScaffold = { missThreshold: 2, streakThreshold: 4, maxReinforcements: 4 };
      if (Object.keys(stretchMap).length) lesson.stretchItems = stretchMap;
    }
    if (homeLanguages.length) lesson.homeLanguages = homeLanguages;
    if (hasGlossary) lesson.bilingualGlossary = bilingualGlossary;
    if (cfg.stationMode === true) lesson.stationMode = true;

    return {
      lesson: lesson,
      extraAdapters: extraAdapters,
      extraCss: cssParts.join('\n'),
      labels: mergedLabels,
      stages: stageMeta,
      sourcesUsed: Object.keys(seenSources),
    };
  }

  function lessonFromPlaylist(options) {
    return assemblePlaylist(options).lesson;
  }

  function buildPlaylistPacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var loader = resolveLoader(opts.loader);
    var assembled = assemblePlaylist(opts);
    var lesson = assembled.lesson;
    var rawLangs = opts.homeLanguages != null ? opts.homeLanguages : lesson.homeLanguages;
    var hasLangs = Array.isArray(rawLangs) ? rawLangs.length > 0 : !!(typeof rawLangs === 'string' && rawLangs.trim());
    var rawGloss = opts.bilingualGlossary != null ? opts.bilingualGlossary : lesson.bilingualGlossary;
    var hasGloss = !!(rawGloss && typeof rawGloss === 'object' && Object.keys(rawGloss).length > 0);

    var buildOpts = {
      extraAdapters: assembled.extraAdapters,
      extraCss: assembled.extraCss,
      labels: Object.assign({}, assembled.labels, opts.labels || {}),
      adaptiveScaffold: lesson.adaptiveScaffold || false,
      qrPublicKey: opts.qrPublicKey,
      qrCrypto: opts.qrCrypto,
      stationMode: opts.stationMode === true || lesson.stationMode === true,
      homeLanguages: hasLangs ? rawLangs : undefined,
      bilingualGlossary: hasGloss ? rawGloss : undefined,
      stationBilingual: opts.stationBilingual || root.AlloPacketStationBilingual,
    };

    var baseHtml = withSpeechManifest(loader.buildHtml(lesson, buildOpts));
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var plain = fileName(lesson.title, '');
    var name = fileName(lesson.title, cleanLearner);
    var bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(html).length : html.length;
    var itemCount = lesson.blocks.reduce(function (n, b) {
      return n + (b.activity === 'playlist_roadmap' ? 0 : (Array.isArray(b.items) ? b.items.length : 0));
    }, 0);

    return {
      html: html,
      baseHtml: baseHtml,
      bytes: bytes,
      lesson: lesson,
      name: name,
      plain: plain,
      learner: cleanLearner,
      stages: assembled.stages,
      sourcesUsed: assembled.sourcesUsed,
      mode: 'practice',
      itemCount: itemCount,
      revision: lesson.revision,
    };
  }

  function readPlaylistPacket(input, verifyCore) {
    var verify = verifyCore || root.AlloPacketVerify;
    var fail = function (kind, why, page) {
      return { ok: false, kind: kind, why: why, page: page || null, notes: [] };
    };
    if (!verify || typeof verify.readParts !== 'function') {
      return fail('other', 'This page could not load the file reader. Load the page again.');
    }
    var parts = verify.readParts(input);
    if (parts.refused === 'too_big') return fail('other', 'This file is larger than 60 MB.');
    if (parts.refused === 'empty') return fail('other', 'This file is empty.');
    if (parts.refused) return fail('other', 'This browser could not read the file.');
    if (parts.kind === 'results') {
      return fail('results', 'This is a results file, not a unit playlist. Add up results reads it.', { href: 'packets-results.html', name: 'Add up results' });
    }
    if (!parts.ok || !parts.lesson) {
      return fail('other', 'This is not a packet file made with this page. Choose the .html file you saved in step 3.');
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest || {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
    var isPlaylist = !!(lesson.playlist && Array.isArray(lesson.playlist.stages) && lesson.playlist.stages.length >= MIN_STAGES)
      || (blocks.length >= MIN_STAGES + 1 && blocks[0] && blocks[0].activity === 'playlist_roadmap');
    if (!isPlaylist) {
      return fail('other', 'This packet is not a multi-stage unit playlist. Open it in the maker page that built it.', { href: 'packets.html', name: 'Packets home' });
    }
    var stageBlocks = blocks.filter(function (b) { return b && b.activity !== 'playlist_roadmap' && Array.isArray(b.items); });
    var metaList = (lesson.playlist && Array.isArray(lesson.playlist.stages)) ? lesson.playlist.stages : [];
    var stages = stageBlocks.map(function (b, idx) {
      var m = metaList[idx] || {};
      var cat = m.stageId ? stageById(m.stageId) : null;
      var meta = describeActivity(b.activity);
      return {
        stageId: m.stageId || (cat ? cat.id : ''),
        source: m.source || (cat ? cat.source : '') || (meta ? meta.source : '') || resolveSourceForActivity(b.activity),
        activity: b.activity,
        starterId: m.starterId || (cat ? cat.starterId : '') || (meta ? meta.defaultStarterId : ''),
        domain: m.domain || (cat ? cat.domain : '') || (meta ? meta.domain : ''),
        label: str(m.label || (cat ? cat.label : '') || (meta ? meta.label : '') || b.activity, 80),
        summary: str(m.summary || (cat ? cat.summary : '') || (meta ? meta.summary : ''), 180),
        maxItems: (m.maxItems != null && m.maxItems !== '') ? Math.max(0, Math.floor(Number(m.maxItems) || 0)) : 0,
        items: clone(b.items),
      };
    });
    var homeLanguages = [];
    if (lesson.bilingual && Array.isArray(lesson.bilingual.codes)) {
      homeLanguages = lesson.bilingual.codes.map(function (c) { return String(c || '').toLowerCase(); }).filter(Boolean);
    } else if (Array.isArray(lesson.homeLanguages)) {
      homeLanguages = lesson.homeLanguages.slice();
    }
    return {
      ok: true,
      kind: 'playlist',
      title: str(lesson.title || manifest.title, 80),
      arcId: (lesson.playlist && typeof lesson.playlist.arcId === 'string') ? lesson.playlist.arcId : '',
      stages: stages,
      adaptiveScaffold: !!lesson.adaptiveScaffold,
      homeLanguages: homeLanguages,
      bilingualGlossary: lesson.bilingual && lesson.bilingual.glossary && typeof lesson.bilingual.glossary === 'object' ? clone(lesson.bilingual.glossary) : {},
      stationMode: lesson.stationMode === true || manifest.stationMode === true,
      qrPublicKey: (lesson.qr && typeof lesson.qr.k === 'string') ? lesson.qr.k : '',
      learner: codeName(manifest.learner || ''),
      notes: [],
    };
  }

  var api = {
    VERSION: VERSION,
    MIN_STAGES: MIN_STAGES,
    MAX_STAGES: MAX_STAGES,
    ROADMAP_CSS: ROADMAP_CSS,
    ROADMAP_ADAPTER: ROADMAP_ADAPTER,
    STAGE_CATALOG: STAGE_CATALOG,
    ACTIVITY_META: ACTIVITY_META,
    STARTER_ARCS: STARTER_ARCS,
    describeActivity: describeActivity,
    stageById: stageById,
    arcById: arcById,
    lessonFromPlaylist: lessonFromPlaylist,
    buildPlaylistPacket: buildPlaylistPacket,
    readPlaylistPacket: readPlaylistPacket,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketPlaylist = api;
})(typeof window !== 'undefined' ? window : globalThis);
