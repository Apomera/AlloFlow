// ═══════════════════════════════════════════════════════════════
// sel_tool_genogram.js — Genogram
// A 3-generation family map using the standard symbols developed
// in Bowen family systems theory (Bowen, 1978; McGoldrick, Gerson,
// & Petry standard reference). Squares for male, circles for
// female, diamonds for non-binary or unknown; double lines for
// divorce/separation; dotted lines for adoption.
//
// IMPORTANT FRAMING: clinical genograms are a tool of family
// therapy and are usually drawn by or with a trained clinician.
// This tool is positioned as personal self-understanding ONLY,
// not a substitute for clinical work. The About view says so
// explicitly.
//
// Registered tool ID: "genogram"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('genogram'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-genogram')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-genogram';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The 3 generations.
  var GENS = [
    { id: 'grandparents', label: 'Grandparents (gen 1)', row: 0 },
    { id: 'parents',      label: 'Parents and aunts/uncles (gen 2)', row: 1 },
    { id: 'self',         label: 'Me, siblings, and cousins (gen 3)', row: 2 }
  ];

  var SHAPES = [
    { id: 'square', label: 'Square (male)' },
    { id: 'circle', label: 'Circle (female)' },
    { id: 'diamond', label: 'Diamond (non-binary or unknown)' }
  ];

  var RELATIONSHIP_TYPES = [
    { id: 'close',     label: 'Close',             color: '#16a34a', stroke: '3' },
    { id: 'conflict',  label: 'Conflictual',       color: '#ef4444', stroke: '3' },
    { id: 'distant',   label: 'Distant',           color: '#94a3b8', stroke: '2' },
    { id: 'estranged', label: 'Estranged / cut off', color: '#64748b', stroke: '2' }
  ];

  function defaultState() {
    return {
      view: 'tree',
      people: [],          // {id, gen, shape, name, year, alive, notes}
      relationships: [],   // {a, b, type}
      // Form modal state
      editingPersonId: null,
      addingForGen: null,
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function uid() { return 'p' + Math.random().toString(36).slice(2, 9); }

  window.SelHub.registerTool('genogram', {
    icon: '🌳',
    label: 'Genogram',
    desc: 'A three-generation family map using the standard family-systems symbols. For personal self-understanding (NOT clinical assessment). Based on Bowen family systems theory and McGoldrick, Gerson, & Petry conventions. Includes safe-framing guidance; for deeper family-system work, see a family therapist.',
    color: 'rose',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.genogram || defaultState();
      function setGEN(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.genogram) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.people || patch.relationships) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { genogram: next });
        });
      }
      var view = d.view || 'tree';
      function goto(v) { setGEN({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fda4af', fontSize: 22, fontWeight: 900 } }, '🌳 Genogram'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A three-generation family map for personal self-understanding.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'tree', label: 'My Genogram', icon: '🌳' },
          { id: 'people', label: 'People', icon: '👥' },
          { id: 'relationships', label: 'Relationships', icon: '🔗' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Genogram sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#fb7185' : '#334155'),
                background: active ? 'rgba(251,113,133,0.18)' : '#1e293b',
                color: active ? '#fecdd3' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.4)', borderRight: '1px solid rgba(245,158,11,0.4)', borderBottom: '1px solid rgba(245,158,11,0.4)', borderLeft: '3px solid #f59e0b', marginBottom: 12, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
          h('strong', null, '⚖️ Important framing. '),
          'A genogram is a clinical family-systems tool. Used for personal self-understanding (mapping where you come from) it is generally safe and often useful. Used for deeper work (family-of-origin therapy, intergenerational trauma, addiction patterns, etc.) it should be paired with a family therapist or licensed clinician. This tool is the first kind, not the second.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Family-of-origin work can stir up a lot. If a memory or pattern surfaces that feels heavy, that is real; bring it to a counselor, school psych, or family therapist. Crisis Text Line: text HOME to 741741. Crisis Companion is in this SEL Hub.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TREE — SVG visualization
      // ═══════════════════════════════════════════════════════════
      function renderTree() {
        var people = d.people || [];
        var rels = d.relationships || [];

        if (people.length === 0) {
          return h('div', null,
            safetyBanner(),
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,113,133,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(251,113,133,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🌳'),
              h('h3', { style: { margin: '0 0 8px', color: '#fecdd3', fontSize: 18 } }, 'Your genogram is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'A genogram is a family tree drawn with standardized symbols. Start with yourself, then add parents, then add grandparents. You can include siblings, aunts and uncles, and cousins if you want.'),
              h('button', { onClick: function() { goto('people'); }, 'aria-label': 'Start adding people',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start with myself')
            ),
            softPointer()
          );
        }

        // Layout people by generation (row 0/1/2)
        var byGen = { grandparents: [], parents: [], self: [] };
        people.forEach(function(p) { if (byGen[p.gen]) byGen[p.gen].push(p); });

        var svgW = 720, rowH = 130, paddingX = 60;
        var rowY = { grandparents: 60, parents: 200, self: 340 };

        // Assign x positions
        var positions = {};
        ['grandparents', 'parents', 'self'].forEach(function(gen) {
          var list = byGen[gen];
          var step = list.length > 0 ? (svgW - 2 * paddingX) / Math.max(1, list.length - 1 + 0.0001) : 0;
          list.forEach(function(p, i) {
            positions[p.id] = {
              x: list.length === 1 ? svgW / 2 : paddingX + i * step,
              y: rowY[gen]
            };
          });
        });

        function drawShape(p) {
          var pos = positions[p.id];
          var size = 36;
          var fill = '#1e293b';
          var stroke = p.alive === false ? '#94a3b8' : '#fb7185';
          var strokeDash = p.alive === false ? '' : '';
          var inner;
          if (p.shape === 'circle') {
            inner = h('circle', { cx: pos.x, cy: pos.y, r: size / 2, fill: fill, stroke: stroke, strokeWidth: 2.5 });
          } else if (p.shape === 'diamond') {
            inner = h('polygon', { points: pos.x + ',' + (pos.y - size/2) + ' ' + (pos.x + size/2) + ',' + pos.y + ' ' + pos.x + ',' + (pos.y + size/2) + ' ' + (pos.x - size/2) + ',' + pos.y, fill: fill, stroke: stroke, strokeWidth: 2.5 });
          } else {
            inner = h('rect', { x: pos.x - size/2, y: pos.y - size/2, width: size, height: size, fill: fill, stroke: stroke, strokeWidth: 2.5 });
          }
          // Cross through if deceased
          var deceased = p.alive === false ? h('line', { x1: pos.x - size/2 - 4, y1: pos.y - size/2 - 4, x2: pos.x + size/2 + 4, y2: pos.y + size/2 + 4, stroke: '#94a3b8', strokeWidth: 2 }) : null;

          return h('g', { key: 'p_' + p.id },
            inner,
            deceased,
            h('text', { x: pos.x, y: pos.y + size/2 + 16, textAnchor: 'middle', fontSize: 11, fill: '#e2e8f0', style: { fontWeight: 700 } }, (p.name || '?').slice(0, 14)),
            p.year ? h('text', { x: pos.x, y: pos.y + size/2 + 30, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8' }, p.year) : null
          );
        }

        function drawRel(r) {
          var pa = positions[r.a];
          var pb = positions[r.b];
          if (!pa || !pb) return null;
          var rt = RELATIONSHIP_TYPES.find(function(x) { return x.id === r.type; }) || RELATIONSHIP_TYPES[2];
          var dash = (r.type === 'distant' || r.type === 'estranged') ? '4 4' : '';
          return h('line', { key: 'r_' + r.a + '_' + r.b,
            x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y,
            stroke: rt.color, strokeWidth: rt.stroke, strokeDasharray: dash, opacity: 0.7 });
        }

        // Accessibility description
        var genCounts = { grandparents: byGen.grandparents.length, parents: byGen.parents.length, self: byGen.self.length };
        var deceasedCount = people.filter(function(p) { return p.alive === false; }).length;
        var svgDesc = 'Genogram with ' + people.length + ' people across three generations: ' +
          genCounts.grandparents + ' grandparent generation, ' + genCounts.parents + ' parent generation, ' +
          genCounts.self + ' in self/sibling generation. ' +
          (deceasedCount > 0 ? deceasedCount + ' deceased (marked with cross). ' : '') +
          rels.length + ' relationship line' + (rels.length === 1 ? '' : 's') + ' drawn between people.';

        return h('div', null,
          safetyBanner(),
          h('div', { style: { padding: 10, borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto' } },
            h('svg', { width: '100%', viewBox: '0 0 ' + svgW + ' 420', style: { maxWidth: svgW }, 'aria-labelledby': 'genogram-svg-title genogram-svg-desc', role: 'img' },
              h('title', { id: 'genogram-svg-title' }, 'Genogram visualization'),
              h('desc', { id: 'genogram-svg-desc' }, svgDesc),
              // Row labels
              ['grandparents', 'parents', 'self'].map(function(gen) {
                var lbl = GENS.find(function(g) { return g.id === gen; }).label;
                return h('text', { key: 'lbl_' + gen, x: 20, y: rowY[gen], fontSize: 10, fill: '#64748b', style: { fontWeight: 700 } }, 'Gen ' + (gen === 'grandparents' ? '1' : gen === 'parents' ? '2' : '3'));
              }),
              rels.map(drawRel),
              people.map(drawShape)
            )
          ),

          // Text-equivalent (accessible to all users; WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#fda4af', fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b' } }, '🔤 Read this genogram as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, svgDesc),
              GENS.map(function(g) {
                var genPeople = people.filter(function(p) { return p.gen === g.id; });
                if (genPeople.length === 0) return null;
                return h('div', { key: g.id, style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 12, color: '#fda4af', fontWeight: 700, marginBottom: 4 } }, g.label),
                  h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 12, lineHeight: 1.6 } },
                    genPeople.map(function(p) {
                      var sh = (SHAPES.find(function(s) { return s.id === p.shape; }) || SHAPES[0]).label;
                      return h('li', { key: p.id }, p.name + ' — ' + sh + (p.year ? ', born ' + p.year : '') + (p.alive === false ? ', deceased' : ''));
                    })
                  )
                );
              }),
              rels.length > 0 ? h('div', null,
                h('div', { style: { fontSize: 12, color: '#fda4af', fontWeight: 700, marginBottom: 4 } }, 'Relationships'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 12, lineHeight: 1.6 } },
                  rels.map(function(r, i) {
                    var pa = people.find(function(x) { return x.id === r.a; });
                    var pb = people.find(function(x) { return x.id === r.b; });
                    var rt = RELATIONSHIP_TYPES.find(function(x) { return x.id === r.type; }) || RELATIONSHIP_TYPES[2];
                    return h('li', { key: i }, (pa ? pa.name : '?') + ' ↔ ' + (pb ? pb.name : '?') + ': ' + rt.label);
                  })
                )
              ) : null
            )
          ),

          // Legend
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 12 } },
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Shape'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
                h('div', null, '■ Square: male'),
                h('div', null, '● Circle: female'),
                h('div', null, '◆ Diamond: non-binary or unknown'),
                h('div', null, '⊠ Crossed-through: deceased')
              )
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Relationship lines'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
                h('span', { style: { color: '#16a34a' } }, 'Green: close'), ' · ',
                h('span', { style: { color: '#ef4444' } }, 'Red: conflict'), ' · ',
                h('span', { style: { color: '#94a3b8' } }, 'Grey dashed: distant or estranged')
              )
            )
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('people'); }, 'aria-label': 'Add or edit people',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '👥 People'),
            h('button', { onClick: function() { goto('relationships'); }, 'aria-label': 'Add relationships',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🔗 Relationships'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PEOPLE — add / edit people
      // ═══════════════════════════════════════════════════════════
      function renderPeople() {
        var people = d.people || [];

        function startAdd(gen) { setGEN({ addingForGen: gen, editingPersonId: null }); }
        function startEdit(id) { setGEN({ editingPersonId: id, addingForGen: null }); }
        function cancel() { setGEN({ addingForGen: null, editingPersonId: null }); }
        function deletePerson(id) {
          var nx = people.filter(function(p) { return p.id !== id; });
          var rels = (d.relationships || []).filter(function(r) { return r.a !== id && r.b !== id; });
          setGEN({ people: nx, relationships: rels });
        }
        function saveForm() {
          var nameEl = document.getElementById('gen-name');
          var shapeEl = document.getElementById('gen-shape');
          var yearEl = document.getElementById('gen-year');
          var aliveEl = document.getElementById('gen-alive');
          var notesEl = document.getElementById('gen-notes');
          if (!nameEl || !nameEl.value.trim()) return;
          var entry = {
            name: nameEl.value.trim(),
            shape: shapeEl ? shapeEl.value : 'circle',
            year: yearEl ? yearEl.value.trim() : '',
            alive: aliveEl ? aliveEl.checked : true,
            notes: notesEl ? notesEl.value.trim() : ''
          };
          if (d.editingPersonId) {
            var nx = people.map(function(p) { return p.id === d.editingPersonId ? Object.assign({}, p, entry) : p; });
            setGEN({ people: nx, editingPersonId: null });
          } else {
            entry.id = uid();
            entry.gen = d.addingForGen;
            setGEN({ people: people.concat([entry]), addingForGen: null });
          }
        }

        function renderForm() {
          var editing = d.editingPersonId ? people.find(function(p) { return p.id === d.editingPersonId; }) : null;
          var gen = editing ? editing.gen : d.addingForGen;
          if (!gen) return null;
          var genLabel = (GENS.find(function(g) { return g.id === gen; }) || {}).label || '';

          return h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '2px solid #fb7185', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16, fontWeight: 800 } }, (editing ? 'Edit person' : 'Add to ') + genLabel),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 } },
              h('div', null,
                h('label', { htmlFor: 'gen-name', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Name or relation'),
                h('input', { id: 'gen-name', type: 'text', defaultValue: editing ? editing.name : '',
                  placeholder: 'e.g. Mom, Pop-pop, Aunt Lin, Me',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'gen-shape', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Shape'),
                h('select', { id: 'gen-shape', defaultValue: editing ? editing.shape : 'circle',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  SHAPES.map(function(s) { return h('option', { key: s.id, value: s.id }, s.label); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'gen-year', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Birth year (optional)'),
                h('input', { id: 'gen-year', type: 'text', defaultValue: editing ? editing.year : '',
                  placeholder: 'e.g. 1968',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', { style: { display: 'flex', alignItems: 'flex-end' } },
                h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' } },
                  h('input', { id: 'gen-alive', type: 'checkbox', defaultChecked: editing ? (editing.alive !== false) : true }),
                  h('span', null, 'Living')
                )
              )
            ),
            h('div', null,
              h('label', { htmlFor: 'gen-notes', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Notes (optional)'),
              h('textarea', { id: 'gen-notes', defaultValue: editing ? editing.notes : '',
                placeholder: 'Anything you want to remember about this person, your relationship, or your family history.',
                style: { width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' } })
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
              h('button', { onClick: saveForm, 'aria-label': editing ? 'Save' : 'Add',
                style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fb7185', color: '#fff', fontWeight: 800, fontSize: 13 } }, editing ? '✓ Save' : '+ Add'),
              h('button', { onClick: cancel, 'aria-label': 'Cancel',
                style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, 'Cancel')
            )
          );
        }

        return h('div', null,
          safetyBanner(),
          (d.addingForGen || d.editingPersonId) ? renderForm() : null,
          GENS.map(function(g) {
            var genPeople = people.filter(function(p) { return p.gen === g.id; });
            return h('div', { key: g.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fda4af', flex: 1 } }, g.label),
                h('button', { onClick: function() { startAdd(g.id); }, 'aria-label': 'Add person in ' + g.label,
                  style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #fb7185', background: 'transparent', color: '#fb7185', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '+ Add')
              ),
              genPeople.length === 0
                ? h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic', paddingLeft: 14 } }, '(no one added yet)')
                : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, paddingLeft: 14 } },
                    genPeople.map(function(p) {
                      var sh = (SHAPES.find(function(s) { return s.id === p.shape; }) || SHAPES[0]).label;
                      return h('div', { key: p.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', display: 'flex', flexDirection: 'column', gap: 3 } },
                        h('div', { style: { fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' } }, p.name),
                        h('div', { style: { fontSize: 10, color: '#94a3b8' } }, sh + (p.year ? ' · ' + p.year : '') + (p.alive === false ? ' · deceased' : '')),
                        p.notes ? h('div', { style: { fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' } }, p.notes.slice(0, 80) + (p.notes.length > 80 ? '...' : '')) : null,
                        h('div', { style: { display: 'flex', gap: 4, marginTop: 2 } },
                          h('button', { onClick: function() { startEdit(p.id); }, 'aria-label': 'Edit ' + p.name,
                            style: { padding: '2px 8px', borderRadius: 4, border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 10 } }, '✏️ Edit'),
                          h('button', { onClick: function() { deletePerson(p.id); }, 'aria-label': 'Remove ' + p.name,
                            style: { padding: '2px 8px', borderRadius: 4, border: '1px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 10 } }, '✕'))
                      );
                    })
                  )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RELATIONSHIPS
      // ═══════════════════════════════════════════════════════════
      function renderRelationships() {
        var people = d.people || [];
        var rels = d.relationships || [];

        function nameOf(id) { var p = people.find(function(x) { return x.id === id; }); return p ? p.name : '?'; }

        function addRel() {
          var aEl = document.getElementById('rel-a');
          var bEl = document.getElementById('rel-b');
          var tEl = document.getElementById('rel-t');
          if (!aEl || !bEl || !tEl || !aEl.value || !bEl.value || aEl.value === bEl.value) return;
          setGEN({ relationships: rels.concat([{ a: aEl.value, b: bEl.value, type: tEl.value }]) });
        }
        function removeRel(i) {
          var nx = rels.slice();
          nx.splice(i, 1);
          setGEN({ relationships: nx });
        }

        if (people.length < 2) {
          return h('div', null,
            safetyBanner(),
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '🔗'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Add at least two people first'),
              h('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'You need at least two people on your map before you can describe relationships between them.'),
              h('button', { onClick: function() { goto('people'); }, 'aria-label': 'Add people first',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #fb7185', background: 'rgba(251,113,133,0.18)', color: '#fecdd3', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Add people')
            )
          );
        }

        return h('div', null,
          safetyBanner(),
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fda4af', marginBottom: 10 } }, '+ Add a relationship'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 } },
              h('div', null,
                h('label', { htmlFor: 'rel-a', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Between'),
                h('select', { id: 'rel-a',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  h('option', { value: '' }, 'Select person...'),
                  people.map(function(p) { return h('option', { key: p.id, value: p.id }, p.name); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'rel-b', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'And'),
                h('select', { id: 'rel-b',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  h('option', { value: '' }, 'Select person...'),
                  people.map(function(p) { return h('option', { key: p.id, value: p.id }, p.name); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'rel-t', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Relationship'),
                h('select', { id: 'rel-t',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  RELATIONSHIP_TYPES.map(function(r) { return h('option', { key: r.id, value: r.id }, r.label); }))
              )
            ),
            h('button', { onClick: addRel, 'aria-label': 'Add this relationship',
              style: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fb7185', color: '#fff', fontWeight: 800, fontSize: 13 } }, '+ Add relationship')
          ),

          rels.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fda4af', marginBottom: 10 } }, 'Relationships (' + rels.length + ')'),
            rels.map(function(r, i) {
              var rt = RELATIONSHIP_TYPES.find(function(x) { return x.id === r.type; }) || RELATIONSHIP_TYPES[2];
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { width: 12, height: 4, background: rt.color, borderRadius: 2 } }),
                h('span', { style: { flex: 1, fontSize: 12.5, color: '#e2e8f0' } }, nameOf(r.a) + '  ↔  ' + nameOf(r.b) + '  ·  ' + rt.label),
                h('button', { onClick: function() { removeRel(i); }, 'aria-label': 'Remove relationship',
                  style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var people = d.people || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fecdd3', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Includes a summary list (the visual is best viewed on screen).'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('tree'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'genogram-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#genogram-print-region, #genogram-print-region * { visibility: visible !important; } ' +
              '#genogram-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #be123c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Genogram'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Family Map'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            GENS.map(function(g) {
              var genPeople = people.filter(function(p) { return p.gen === g.id; });
              if (genPeople.length === 0) return null;
              return h('div', { key: g.id, style: { marginBottom: 16, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, marginBottom: 6, background: '#be123c', color: '#fff' } },
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, g.label)
                ),
                genPeople.map(function(p) {
                  var sh = (SHAPES.find(function(s) { return s.id === p.shape; }) || SHAPES[0]).label;
                  return h('div', { key: p.id, style: { marginBottom: 8, paddingLeft: 12 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: '#0f172a' } }, p.name),
                    h('div', { style: { fontSize: 11, color: '#475569' } }, sh + (p.year ? ' · ' + p.year : '') + (p.alive === false ? ' · deceased' : '')),
                    p.notes ? h('div', { style: { fontSize: 11.5, color: '#0f172a', marginTop: 2, fontStyle: 'italic' } }, p.notes) : null
                  );
                })
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Genogram notation from McGoldrick, M., Gerson, R., and Petry, S. (2020), Genograms: Assessment and Treatment, W. W. Norton. ',
              'Based on Bowen family systems theory (Bowen, 1978). Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          // Strong, prominent safety frame at top
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.4)', borderRight: '1px solid rgba(245,158,11,0.4)', borderBottom: '1px solid rgba(245,158,11,0.4)', borderLeft: '4px solid #f59e0b', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fcd34d', fontSize: 16 } }, '⚖️ Read this first'),
            h('p', { style: { margin: '0 0 8px', color: '#fde68a', fontSize: 13.5, lineHeight: 1.7 } },
              'A genogram is a clinical family-systems tool. Used for personal self-understanding (mapping where you come from, naming the people in your family, noticing patterns you already know about) it is generally safe and often illuminating.'
            ),
            h('p', { style: { margin: 0, color: '#fde68a', fontSize: 13.5, lineHeight: 1.7 } },
              'Used for deeper work (intergenerational trauma, addiction, mental-illness patterns, family secrets) it should be paired with a family therapist, school psych, or licensed clinician. This tool is the first kind, not the second. If a pattern surfaces that feels heavy, that is a signal to bring it to a professional, not a signal to keep drawing.'
            )
          ),

          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('genogram', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'What a genogram is'),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A genogram is a family tree drawn with a standardized set of symbols. Squares are typically used for male, circles for female, diamonds for non-binary or unknown. Lines between people show the type of relationship. A genogram usually goes three generations: yourself, your parents (and aunts and uncles), and your grandparents. The visual makes patterns visible that a list of names does not show: clusters of conflict, lines of close support, generations of loss.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'Where the format comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The genogram comes from Bowen family systems theory, developed by psychiatrist Murray Bowen at the National Institute of Mental Health and at Georgetown University in the 1950s through 1970s. Bowen wanted a way to make a family system visible to itself, in the conviction that the family is a unit, and that the patterns of one generation tend to repeat in the next unless they are surfaced and worked on. The notation conventions used today were largely codified by Monica McGoldrick, Randy Gerson, and Sueli Petry; their book Genograms: Assessment and Treatment is the standard practitioner reference.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for the evidence base of genograms.'),
            sourceCard('Bowen, M. (1978)', 'Family Therapy in Clinical Practice, Jason Aronson', 'The foundational text of Bowen family systems theory.', null),
            sourceCard('McGoldrick, M., Gerson, R., and Petry, S. (2020)', 'Genograms: Assessment and Treatment (4th edition), W. W. Norton', 'The standard practitioner reference for genogram notation and use in clinical work.', null),
            sourceCard('Kerr, M. E. and Bowen, M. (1988)', 'Family Evaluation, W. W. Norton', 'Companion text to Bowen 1978; deeper on how genograms are used in family evaluation.', null),
            sourceCard('The Bowen Center for the Study of the Family', 'thebowencenter.org', 'The continuing institutional home of Bowen theory. Training, publications, and research.', 'https://www.thebowencenter.org/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits of this format'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Family-of-origin work is not a worksheet. The genogram is most useful when paired with a person who can hold the conversation that comes up around it.'),
              h('li', null, 'The square/circle/diamond convention is gendered notation from a particular cultural and historical moment. Use the diamond freely; use whatever notation makes sense to you.'),
              h('li', null, 'A genogram drawn alone can land hard, especially for students with complicated family-of-origin histories (foster placement, adoption, family secrets, estrangement, deceased parents). If you are in that position, please draw this with a counselor present, not alone.'),
              h('li', null, 'Bowen theory itself is one model of how families work; it is not the only one. Many cultural traditions hold richer, more relational, less individualizing pictures of family that a Western genogram does not capture.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: '#fecdd3', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Genograms are typically a clinician\'s tool, not a classroom assignment. If a student wants to draw their own as personal self-understanding, that is appropriate; if a teacher assigns it to a class as homework, that is not. The reason is that family-of-origin material is intimate, the patterns it surfaces can be heavy, and students do not get a choice about whose family they are mapping. For classroom use, the Ecomap or Circles of Support are much safer than a genogram.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fda4af', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'people') body = renderPeople();
      else if (view === 'relationships') body = renderRelationships();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderTree();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Genogram' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
