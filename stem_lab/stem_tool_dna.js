// ═══════════════════════════════════════════════════════
// stem_tool_dna.js — DNA / Genetics Lab
// Standalone registered STEM Lab tool
// Usage: Add <script src="stem_tool_dna.js"></script> after stem_lab_module.js
// ═══════════════════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  window.StemLab.registerTool('dnaLab', {
    icon: '\uD83E\uDDEC',
    label: 'DNA Lab',
    desc: 'Transcription \u2192 Translation. Build a protein from a DNA sequence.',
    color: 'fuchsia',
    category: 'biology',
    ready: true,

    render: function(ctx) {
      var React = ctx.React;
      var d = (ctx.toolData && ctx.toolData.dnaLab) || {};
      var upd = function(key, val) { ctx.update('dnaLab', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('dnaLab', obj); };
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var stemCelebrate = ctx.celebrate;

      var tab = d.tab || 'build';
      var dnaSeq = d.dnaSequence || 'ATGCGTACCTGAAACTGA';
      var mRNA = d.mRNA || '';
      var protein = d.protein || [];
      var animStep = d.animStep || 0;
      var animPlaying = !!d.animPlaying;
      var speed = d.speed || 1;
      var challengeQ = d.challengeQ || null;
      var challengeAnswer = d.challengeAnswer || '';
      var challengeFeedback = d.challengeFeedback || '';
      var score = d.score || 0;

      // ── Codon Table (Standard Genetic Code) ──
      var CODON_TABLE = {
        'UUU':'Phe','UUC':'Phe','UUA':'Leu','UUG':'Leu',
        'CUU':'Leu','CUC':'Leu','CUA':'Leu','CUG':'Leu',
        'AUU':'Ile','AUC':'Ile','AUA':'Ile','AUG':'Met',
        'GUU':'Val','GUC':'Val','GUA':'Val','GUG':'Val',
        'UCU':'Ser','UCC':'Ser','UCA':'Ser','UCG':'Ser',
        'CCU':'Pro','CCC':'Pro','CCA':'Pro','CCG':'Pro',
        'ACU':'Thr','ACC':'Thr','ACA':'Thr','ACG':'Thr',
        'GCU':'Ala','GCC':'Ala','GCA':'Ala','GCG':'Ala',
        'UAU':'Tyr','UAC':'Tyr','UAA':'Stop','UAG':'Stop',
        'UGU':'Cys','UGC':'Cys','UGA':'Stop','UGG':'Trp',
        'CGU':'Arg','CGC':'Arg','CGA':'Arg','CGG':'Arg',
        'AGU':'Ser','AGC':'Ser','AGA':'Arg','AGG':'Arg',
        'GGU':'Gly','GGC':'Gly','GGA':'Gly','GGG':'Gly',
        'AAU':'Asn','AAC':'Asn','AAA':'Lys','AAG':'Lys',
        'GAU':'Asp','GAC':'Asp','GAA':'Glu','GAG':'Glu',
        'CAU':'His','CAC':'His','CAA':'Gln','CAG':'Gln'
      };

      var AA_PROPS = {
        'Phe':{full:'Phenylalanine',abbr:'F',type:'nonpolar',color:'#f59e0b'},
        'Leu':{full:'Leucine',abbr:'L',type:'nonpolar',color:'#f59e0b'},
        'Ile':{full:'Isoleucine',abbr:'I',type:'nonpolar',color:'#f59e0b'},
        'Met':{full:'Methionine',abbr:'M',type:'nonpolar',color:'#22c55e',start:true},
        'Val':{full:'Valine',abbr:'V',type:'nonpolar',color:'#f59e0b'},
        'Ser':{full:'Serine',abbr:'S',type:'polar',color:'#3b82f6'},
        'Pro':{full:'Proline',abbr:'P',type:'nonpolar',color:'#f59e0b'},
        'Thr':{full:'Threonine',abbr:'T',type:'polar',color:'#3b82f6'},
        'Ala':{full:'Alanine',abbr:'A',type:'nonpolar',color:'#f59e0b'},
        'Tyr':{full:'Tyrosine',abbr:'Y',type:'polar',color:'#3b82f6'},
        'Cys':{full:'Cysteine',abbr:'C',type:'polar',color:'#3b82f6'},
        'Trp':{full:'Tryptophan',abbr:'W',type:'nonpolar',color:'#f59e0b'},
        'Arg':{full:'Arginine',abbr:'R',type:'positive',color:'#ef4444'},
        'Gly':{full:'Glycine',abbr:'G',type:'nonpolar',color:'#f59e0b'},
        'Asn':{full:'Asparagine',abbr:'N',type:'polar',color:'#3b82f6'},
        'Lys':{full:'Lysine',abbr:'K',type:'positive',color:'#ef4444'},
        'Asp':{full:'Aspartic acid',abbr:'D',type:'negative',color:'#a855f7'},
        'Glu':{full:'Glutamic acid',abbr:'E',type:'negative',color:'#a855f7'},
        'His':{full:'Histidine',abbr:'H',type:'positive',color:'#ef4444'},
        'Gln':{full:'Glutamine',abbr:'Q',type:'polar',color:'#3b82f6'},
        'Stop':{full:'Stop codon',abbr:'*',type:'stop',color:'#6b7280'}
      };

      var BASE_COMPLEMENT = { 'A':'T', 'T':'A', 'G':'C', 'C':'G' };
      var DNA_TO_RNA = { 'A':'U', 'T':'A', 'G':'C', 'C':'G' };
      var BASE_COLORS = { 'A':'#ef4444', 'T':'#3b82f6', 'G':'#22c55e', 'C':'#f59e0b', 'U':'#a855f7' };

      var complementStrand = dnaSeq.split('').map(function(b){ return BASE_COMPLEMENT[b] || 'N'; }).join('');
      var fullMRNA = dnaSeq.split('').map(function(b){ return DNA_TO_RNA[b] || 'N'; }).join('');

      function translateMRNA(mrna) {
        var result = [];
        var started = false;
        for (var i = 0; i <= mrna.length - 3; i += 3) {
          var codon = mrna.substring(i, i+3);
          var aa = CODON_TABLE[codon];
          if (!aa) continue;
          if (!started && aa === 'Met') started = true;
          if (!started) continue;
          if (aa === 'Stop') { result.push({ codon: codon, aa: 'Stop', pos: i }); break; }
          result.push({ codon: codon, aa: aa, pos: i });
        }
        return result;
      }

      var fullProtein = translateMRNA(fullMRNA);

      function randomDNA(len) {
        var bases = 'ATGC';
        var seq = 'ATG';
        for (var i = 3; i < (len || 21) - 3; i++) seq += bases[Math.floor(Math.random() * 4)];
        var stops = ['TAC','ATT','ACT'];
        seq += stops[Math.floor(Math.random() * 3)];
        return seq;
      }

      var PRESETS = [
        { name: 'Insulin Fragment', seq: 'ATGTTCGTCAACCAACACCTGTGCGGCTCACAC' },
        { name: 'Short Peptide', seq: 'ATGCGTACCTGAAACTGA' },
        { name: 'Hemoglobin Start', seq: 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCC' },
        { name: 'GFP Fragment', seq: 'ATGAGTAAAGGAGAAGAACTTTTCACTGA' }
      ];

      // ── Canvas: DNA Helix ──
      var _dnaCanvasRef = React.useRef(null);

      React.useEffect(function() {
        if (tab !== 'build' && tab !== 'transcribe') return;
        var cv = _dnaCanvasRef.current;
        if (!cv) return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W/2, h = H/2;
        var _tick = 0;
        var _animId = null;
        var currentAnimStep = animStep;

        function draw() {
          ctx2d.clearRect(0, 0, w, h);
          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = h / 2;
          var helixAmp = 18;

          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW/2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (i === 0) ctx2d.moveTo(x, midY - 25 + yOff); else ctx2d.lineTo(x, midY - 25 + yOff);
          }
          ctx2d.stroke();

          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW/2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (tab === 'transcribe' && i < currentAnimStep) continue;
            if (i === 0 || (tab === 'transcribe' && i === currentAnimStep)) ctx2d.moveTo(x, midY + 25 - yOff);
            else ctx2d.lineTo(x, midY + 25 - yOff);
          }
          ctx2d.stroke();

          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW/2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            var base = dnaSeq[i]; var comp = complementStrand[i];
            var topY = midY - 25 + yOff;
            ctx2d.fillStyle = BASE_COLORS[base] || '#888';
            ctx2d.font = 'bold ' + Math.max(10, baseW * 0.6) + 'px monospace';
            ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
            ctx2d.beginPath(); ctx2d.arc(x, topY, baseW * 0.38, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff'; ctx2d.fillText(base, x, topY);

            if (!(tab === 'transcribe' && i < currentAnimStep)) {
              ctx2d.setLineDash([2, 2]); ctx2d.strokeStyle = '#cbd5e1';
              ctx2d.beginPath(); ctx2d.moveTo(x, topY + baseW * 0.38); ctx2d.lineTo(x, midY + 25 - yOff - baseW * 0.38); ctx2d.stroke();
              ctx2d.setLineDash([]);
            }

            var bottomY = midY + 25 - yOff;
            if (tab === 'transcribe' && i < currentAnimStep) {
              var rnaBase = DNA_TO_RNA[base];
              ctx2d.fillStyle = BASE_COLORS[rnaBase] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, bottomY + 15, baseW * 0.38, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(rnaBase, x, bottomY + 15);
            } else {
              ctx2d.fillStyle = BASE_COLORS[comp] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, bottomY, baseW * 0.38, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, bottomY);
            }

            if (tab === 'transcribe' && i === currentAnimStep && currentAnimStep < dnaSeq.length) {
              ctx2d.fillStyle = 'rgba(168, 85, 247, 0.2)';
              ctx2d.beginPath(); ctx2d.arc(x, midY, baseW * 1.5, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#7c3aed'; ctx2d.font = 'bold 8px sans-serif';
              ctx2d.fillText('RNA Pol', x, midY - baseW * 1.8);
            }
          }

          ctx2d.fillStyle = '#475569'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left';
          ctx2d.fillText("3'", startX - 18, midY - 25);
          ctx2d.fillText("5'", startX + dnaSeq.length * baseW + 4, midY - 25);
          ctx2d.fillText("5'", startX - 18, midY + 25);
          ctx2d.fillText("3'", startX + dnaSeq.length * baseW + 4, midY + 25);
          ctx2d.fillStyle = '#1e293b';
          ctx2d.fillText('Template', startX - 18, midY - 45);
          ctx2d.fillText('Coding', startX - 18, midY + 45);

          _tick++;
          _animId = requestAnimationFrame(draw);
        }
        draw();
        return function() { if (_animId) cancelAnimationFrame(_animId); };
      }, [tab, dnaSeq, animStep]);

      // Transcription timer
      React.useEffect(function() {
        if (tab !== 'transcribe' || !animPlaying) return;
        if (animStep >= dnaSeq.length) {
          updMulti({ animPlaying: false, mRNA: fullMRNA });
          announceToSR('Transcription complete. mRNA: ' + fullMRNA);
          awardStemXP('dnaLab', 10, 'Completed transcription');
          return;
        }
        var timer = setTimeout(function() {
          updMulti({ animStep: animStep + 1, mRNA: fullMRNA.substring(0, animStep + 1) });
        }, 600 / speed);
        return function() { clearTimeout(timer); };
      }, [tab, animPlaying, animStep, speed]);

      // Translation
      var _transStep = React.useRef(0);
      var [transPlaying, setTransPlaying] = React.useState(false);
      var [builtProtein, setBuiltProtein] = React.useState([]);
      var transStep = _transStep.current;

      React.useEffect(function() {
        if (tab !== 'translate' || !transPlaying) return;
        var pos = _transStep.current * 3;
        if (pos + 3 > fullMRNA.length) { setTransPlaying(false); return; }
        var codon = fullMRNA.substring(pos, pos + 3);
        var aa = CODON_TABLE[codon];
        if (!aa || aa === 'Stop') {
          setTransPlaying(false);
          updMulti({ protein: builtProtein });
          announceToSR('Translation complete. Protein has ' + builtProtein.length + ' amino acids.');
          awardStemXP('dnaLab', 15, 'Completed translation');
          return;
        }
        var timer = setTimeout(function() {
          setBuiltProtein(function(prev) { return prev.concat([{ codon: codon, aa: aa, pos: pos }]); });
          _transStep.current += 1;
          announceToSR('Codon ' + codon + ' = ' + (AA_PROPS[aa] ? AA_PROPS[aa].full : aa));
        }, 800 / speed);
        return function() { clearTimeout(timer); };
      }, [tab, transPlaying, builtProtein, speed]);

      // Challenge
      function generateChallenge() {
        var types = ['dna_to_mrna', 'mrna_to_aa', 'codon_id'];
        var type = types[Math.floor(Math.random() * types.length)];
        var bases = 'ATGC'; var q = {};
        if (type === 'dna_to_mrna') {
          var triplet = ''; for (var i = 0; i < 3; i++) triplet += bases[Math.floor(Math.random() * 4)];
          q = { type: type, question: 'What mRNA codon is transcribed from DNA template: ' + triplet + '?', answer: triplet.split('').map(function(b){ return DNA_TO_RNA[b]; }).join(''), hint: 'A\u2192U, T\u2192A, G\u2192C, C\u2192G' };
        } else if (type === 'mrna_to_aa') {
          var codons = Object.keys(CODON_TABLE); var codon = codons[Math.floor(Math.random() * codons.length)];
          q = { type: type, question: 'What amino acid does codon ' + codon + ' code for?', answer: CODON_TABLE[codon], hint: 'Check the codon table!' };
        } else {
          q = Math.random() > 0.5
            ? { type: type, question: 'What is the universal START codon?', answer: 'AUG', hint: 'Codes for Methionine' }
            : { type: type, question: 'Name one STOP codon.', answer: 'UAA,UAG,UGA', hint: 'UAA, UAG, or UGA' };
        }
        updMulti({ challengeQ: q, challengeAnswer: '', challengeFeedback: '' });
        announceToSR('Challenge: ' + q.question);
      }

      function checkChallenge() {
        if (!challengeQ || !challengeAnswer) return;
        var answers = challengeQ.answer.split(',');
        var correct = answers.some(function(a) { return challengeAnswer.trim().toUpperCase() === a.trim().toUpperCase(); });
        if (correct) {
          updMulti({ challengeFeedback: '\u2705 Correct!', score: score + 10 });
          awardStemXP('dnaLab', 10, 'Challenge correct');
          announceToSR('Correct!'); stemCelebrate();
        } else {
          updMulti({ challengeFeedback: '\u274c The answer is ' + answers[0] + '. ' + (challengeQ.hint || '') });
          announceToSR('Incorrect. Answer: ' + answers[0]);
        }
      }

      var tabs = [
        { id: 'build', icon: '\uD83E\uDDEC', label: 'DNA Builder' },
        { id: 'transcribe', icon: '\uD83D\uDCDD', label: 'Transcription' },
        { id: 'translate', icon: '\uD83D\uDD2C', label: 'Translation' },
        { id: 'protein', icon: '\uD83E\uDDEA', label: 'Protein' },
        { id: 'challenge', icon: '\uD83C\uDFAF', label: 'Challenge' }
      ];

      var h = React.createElement;

      return h("div", { className: "space-y-4 max-w-4xl mx-auto" },

        // Header
        h("div", { className: "flex items-center justify-between" },
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { setStemLabTool(null); announceToSR('Returned to tool grid'); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools' },
              h(ArrowLeft, { size: 18, className: "text-slate-500" })),
            h("div", null,
              h("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDDEC DNA / Genetics Lab"),
              h("p", { className: "text-xs text-slate-400" }, "Explore DNA structure, transcription, and translation"))
          ),
          h("div", { className: "flex items-center gap-2" },
            h("span", { className: "text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + getStemXP('dnaLab') + "/100 XP"),
            h("button", { onClick: function() { ctx.saveSnapshot('dnaLab', 'DNA: ' + dnaSeq.substring(0,12) + '...', d); }, className: "px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        ),

        // Tab bar
        h("div", { className: "flex gap-1 bg-slate-100 p-1 rounded-xl", role: "tablist" },
          tabs.map(function(tb) {
            return h("button", { key: tb.id, role: "tab", 'aria-selected': tab === tb.id ? 'true' : 'false',
              onClick: function() { upd('tab', tb.id); announceToSR('Switched to ' + tb.label); },
              className: "flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all " + (tab === tb.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700")
            }, tb.icon + " " + tb.label);
          })
        ),

        // BUILD TAB
        tab === 'build' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application", 'aria-label': 'DNA helix visualization' },
            h("canvas", { ref: _dnaCanvasRef, style: { width: '100%', height: 200 }, tabIndex: 0, 'aria-label': 'DNA helix: ' + dnaSeq })
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4 space-y-3" },
            h("div", { className: "flex items-center justify-between flex-wrap gap-2" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "Template Strand (3'\u21925')"),
              h("div", { className: "flex gap-1 flex-wrap" },
                h("button", { onClick: function() { updMulti({ dnaSequence: randomDNA(21), mRNA: '', protein: [], animStep: 0 }); announceToSR('Random sequence'); }, className: "px-2 py-1 text-[10px] font-bold bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100" }, "\uD83C\uDFB2 Random"),
                PRESETS.map(function(p) {
                  return h("button", { key: p.name, onClick: function() { updMulti({ dnaSequence: p.seq, mRNA: '', protein: [], animStep: 0 }); announceToSR('Loaded ' + p.name); }, className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100" }, p.name);
                })
              )
            ),
            h("div", { className: "flex flex-wrap gap-1", role: "group", 'aria-label': 'DNA bases' },
              dnaSeq.split('').map(function(base, idx) {
                return h("button", { key: idx, onClick: function() { var order = 'ATGC'; var next = order[(order.indexOf(base) + 1) % 4]; updMulti({ dnaSequence: dnaSeq.substring(0, idx) + next + dnaSeq.substring(idx + 1), mRNA: '', protein: [], animStep: 0 }); },
                  className: "w-8 h-8 rounded-lg font-mono font-bold text-white text-sm hover:scale-110 transition-all", style: { background: BASE_COLORS[base] }, 'aria-label': 'Base ' + (idx+1) + ': ' + base
                }, base);
              })
            ),
            h("div", { className: "text-xs text-slate-400" }, "Complement: ", h("span", { className: "font-mono font-bold text-slate-600" }, complementStrand), " | " + dnaSeq.length + " bp"),
            h("div", { className: "flex gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-100" },
              ['A','T','G','C'].map(function(b) { var names = {A:'Adenine',T:'Thymine',G:'Guanine',C:'Cytosine'}; return h("span", { key: b, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: BASE_COLORS[b] } }), b + "=" + names[b] + " \u2194 " + BASE_COMPLEMENT[b]); })
            )
          )
        ),

        // TRANSCRIPTION TAB
        tab === 'transcribe' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application" },
            h("canvas", { ref: _dnaCanvasRef, style: { width: '100%', height: 220 }, tabIndex: 0, 'aria-label': 'Transcription: ' + animStep + '/' + dnaSeq.length })
          ),
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { if (animPlaying) upd('animPlaying', false); else { if (animStep >= dnaSeq.length) updMulti({ animStep: 0, mRNA: '', animPlaying: true }); else upd('animPlaying', true); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (animPlaying ? "bg-amber-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700") }, animPlaying ? "\u23F8 Pause" : "\u25B6 Transcribe"),
            h("button", { onClick: function() { updMulti({ animStep: 0, mRNA: '', animPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, "\u21BA Reset"),
            h("div", { className: "flex items-center gap-2 ml-auto" }, h("span", { className: "text-xs text-slate-500" }, "Speed:"),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[10px] font-bold rounded-lg " + (speed === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500") }, s + "x"); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("div", { className: "flex justify-between text-xs text-slate-500 mb-2" }, h("span", null, animStep + "/" + dnaSeq.length), h("span", null, Math.round(animStep / dnaSeq.length * 100) + "%")),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" }, h("div", { className: "bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full h-2 transition-all", style: { width: (animStep / dnaSeq.length * 100) + '%' } })),
            mRNA && h("div", { className: "mt-3" }, h("span", { className: "text-xs font-bold text-violet-600" }, "mRNA: "), h("span", { className: "font-mono text-xs text-slate-700 break-all" }, mRNA)),
            h("div", { className: "mt-2 text-[10px] text-slate-400 bg-slate-50 rounded-lg p-2" }, "\uD83D\uDCA1 RNA Polymerase reads template 3'\u21925', builds mRNA 5'\u21923'. T becomes U in RNA.")
          )
        ),

        // TRANSLATION TAB
        tab === 'translate' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, "\uD83D\uDD2C Ribosome Translation"),
            h("div", { className: "font-mono text-xs break-all mb-3 p-3 bg-slate-50 rounded-lg" },
              h("span", { className: "text-[10px] font-bold text-violet-600 block mb-1" }, "mRNA:"),
              (fullMRNA.match(/.{1,3}/g) || []).map(function(codon, idx) {
                var isActive = idx === _transStep.current && transPlaying;
                var isPast = idx < _transStep.current;
                return h("span", { key: idx, className: "inline-block px-1 py-0.5 mx-0.5 rounded text-xs font-bold " + (isActive ? "bg-violet-600 text-white scale-110" : isPast ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"), title: codon + ' \u2192 ' + (CODON_TABLE[codon] || '?') }, codon);
              })
            ),
            h("div", { className: "flex flex-wrap gap-1 items-center", role: "list" },
              h("span", { className: "text-[10px] font-bold text-slate-500 mr-1" }, "Protein:"),
              builtProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa }; return h("span", { key: idx, role: "listitem", className: "px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white", style: { background: pr.color }, title: pr.full }, p.aa); }),
              builtProtein.length === 0 && h("span", { className: "text-[10px] text-slate-400 italic" }, "Press Start to begin...")
            ),
            h("div", { className: "flex items-center gap-3 mt-4" },
              h("button", { onClick: function() { if (transPlaying) setTransPlaying(false); else { _transStep.current = 0; setBuiltProtein([]); setTransPlaying(true); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (transPlaying ? "bg-amber-500 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700") }, transPlaying ? "\u23F8 Pause" : "\u25B6 Translate"),
              h("button", { onClick: function() { _transStep.current = 0; setBuiltProtein([]); setTransPlaying(false); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, "\u21BA Reset")
            )
          )
        ),

        // PROTEIN TAB
        tab === 'protein' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, "\uD83E\uDDEA Protein \u2014 " + fullProtein.length + " amino acids"),
            fullProtein.length > 0 ? h("div", { className: "space-y-2" },
              h("div", { className: "flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl" },
                fullProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa, abbr: '?', type: '?' };
                  return h("div", { key: idx, className: "flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[44px]", title: pr.full + ' (' + p.codon + ') - ' + pr.type },
                    h("span", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white", style: { background: pr.color } }, pr.abbr),
                    h("span", { className: "text-[8px] font-bold text-slate-600" }, p.aa),
                    h("span", { className: "text-[7px] text-slate-400 font-mono" }, p.codon));
                })
              ),
              h("div", { className: "flex gap-3 text-[10px] text-slate-500 pt-2 border-t flex-wrap" },
                [{t:'nonpolar',c:'#f59e0b',l:'Nonpolar'},{t:'polar',c:'#3b82f6',l:'Polar'},{t:'positive',c:'#ef4444',l:'Positive (+)'},{t:'negative',c:'#a855f7',l:'Negative (\u2212)'}].map(function(lg) { return h("span", { key: lg.t, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: lg.c } }), lg.l); })
              )
            ) : h("div", { className: "text-center py-8 text-slate-400" }, h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEA"), h("p", null, "Run Transcription and Translation first!"))
          )
        ),

        // CHALLENGE TAB
        tab === 'challenge' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4 space-y-4" },
            h("div", { className: "flex items-center justify-between" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83C\uDFAF DNA Challenge"),
              h("span", { className: "text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full" }, "Score: " + score)
            ),
            !challengeQ ? h("div", { className: "text-center py-6" },
              h("button", { onClick: generateChallenge, className: "px-6 py-3 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg transition-all" }, "\uD83C\uDFAF Start Challenge")
            ) : h("div", { className: "space-y-3" },
              h("p", { className: "text-sm font-medium text-slate-700" }, challengeQ.question),
              h("input", { type: "text", value: challengeAnswer, onChange: function(e) { upd('challengeAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkChallenge(); }, placeholder: "Type your answer...", className: "w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-violet-400 outline-none", 'aria-label': 'Answer' }),
              h("div", { className: "flex gap-2" },
                h("button", { onClick: checkChallenge, className: "px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl" }, "\u2713 Check"),
                h("button", { onClick: function() { updMulti({ challengeFeedback: '\uD83D\uDCA1 ' + (challengeQ.hint || '') }); }, className: "px-4 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl" }, "\uD83D\uDCA1 Hint"),
                h("button", { onClick: generateChallenge, className: "px-4 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl ml-auto" }, "\u21BB Next")
              ),
              challengeFeedback && h("p", { className: "text-sm font-bold p-2 rounded-lg " + (challengeFeedback[0] === '\u2705' ? "bg-green-50 text-green-700" : challengeFeedback[0] === '\u274c' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"), role: "alert" }, challengeFeedback)
            )
          ),
          h("details", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, "\uD83D\uDCD6 Codon Reference Table"),
            h("div", { className: "p-3 grid grid-cols-4 gap-1 text-[9px] font-mono max-h-60 overflow-y-auto" },
              Object.keys(CODON_TABLE).sort().map(function(c2) { var aa2 = CODON_TABLE[c2]; var pr2 = AA_PROPS[aa2] || { color: '#888' }; return h("div", { key: c2, className: "flex items-center gap-1 px-1.5 py-0.5 rounded", style: { background: pr2.color + '15' } }, h("span", { style: { color: pr2.color }, className: "font-bold" }, c2), h("span", { className: "text-slate-500" }, "\u2192 " + aa2)); })
            )
          )
        ),

        canvasA11yDesc ? canvasA11yDesc('dnaLab', 'DNA Lab: ' + tab + ' view') : null
      );
    }
  });

  console.log('[StemLab] stem_tool_dna.js loaded');
})();
