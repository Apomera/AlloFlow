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
    desc: 'Build, replicate, transcribe, translate, mutate & CRISPR-edit DNA sequences.',
    color: 'fuchsia',
    category: 'biology',
    ready: true,

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var toolSnapshots = ctx.toolSnapshots;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var gradeLevel = ctx.gradeLevel;

      var d = (labToolData && labToolData.dnaLab) || {};
      var upd = function(key, val) { setLabToolData(function(prev) { var nd = Object.assign({}, prev.dnaLab || {}, {}); nd[key] = val; return Object.assign({}, prev, { dnaLab: nd }); }); };
      var updMulti = function(obj) { setLabToolData(function(prev) { return Object.assign({}, prev, { dnaLab: Object.assign({}, prev.dnaLab || {}, obj) }); }); };

      // ═══ GRADE BAND HELPER ═══
      var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
      function getGradeBand() {
        var ov = d.dnaGradeOverride;
        if (ov && GRADE_BANDS.indexOf(ov) >= 0) return ov;
        var gl = (gradeLevel || '5th Grade').toLowerCase();
        if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
        if (/3rd|4th|5th/.test(gl)) return '3-5';
        if (/6th|7th|8th/.test(gl)) return '6-8';
        if (/9th|10|11|12|high/.test(gl)) return '9-12';
        return '3-5';
      }
      var gradeBand = getGradeBand();

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
        { name: 'Insulin Fragment', seq: 'ATGTTCGTCAACCAACACCTGTGCGGCTCACAC', desc: 'Regulates blood sugar. Mutations cause diabetes.' },
        { name: 'Short Peptide', seq: 'ATGCGTACCTGAAACTGA', desc: 'A minimal protein for learning.' },
        { name: 'Hemoglobin Start', seq: 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCC', desc: 'Carries oxygen in red blood cells.' },
        { name: 'GFP Fragment', seq: 'ATGAGTAAAGGAGAAGAACTTTTCACTGA', desc: 'Green fluorescent protein from jellyfish.' },
        { name: 'p53 Fragment', seq: 'ATGGAGGAGCCGCAGTCAGATCCTAGCG', desc: 'Tumor suppressor. Mutated in ~50% of cancers.' },
        { name: 'Sickle Cell', seq: 'ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCC', desc: 'Single base change (GAG\u2192GTG) at pos 6 causes sickle cell disease.' },
        { name: 'BRCA1 Start', seq: 'ATGGATTTATCTGCTCTTCGCGTTGAAGAA', desc: 'Breast cancer susceptibility gene.' },
        { name: 'Collagen', seq: 'ATGGGACCACGAGGACCAGGCCCACCAGGC', desc: 'Structural protein; Gly-Pro-X repeat pattern.' }
      ];

      // ── Module-level cleanup tracker (avoids hooks) ──
      if (!window._dnaCleanup) window._dnaCleanup = {};

      // ── Canvas: DNA Helix (callback ref) ──
      var _dnaCanvasRef = function(cv) {
        if (window._dnaCleanup.dnaAnim) { window._dnaCleanup.dnaAnim(); window._dnaCleanup.dnaAnim = null; }
        if (!cv) return;
        if (tab !== 'build' && tab !== 'transcribe') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W/2, hh = H/2;
        var _tick = 0;
        var _animId = null;
        var currentAnimStep = animStep;

        function draw() {
          ctx2d.clearRect(0, 0, w, hh);
          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = hh / 2;
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
        window._dnaCleanup.dnaAnim = function() { if (_animId) cancelAnimationFrame(_animId); };
      };

      // Transcription timer (driven by state, no useEffect)
      if (tab === 'transcribe' && animPlaying) {
        if (animStep >= dnaSeq.length) {
          updMulti({ animPlaying: false, mRNA: fullMRNA });
          announceToSR('Transcription complete. mRNA: ' + fullMRNA);
          awardStemXP('dnaLab', 10, 'Completed transcription');
        } else {
          if (window._dnaCleanup.transcribeTimer) clearTimeout(window._dnaCleanup.transcribeTimer);
          window._dnaCleanup.transcribeTimer = setTimeout(function() {
            updMulti({ animStep: animStep + 1, mRNA: fullMRNA.substring(0, animStep + 1) });
          }, 600 / speed);
        }
      }

      // ── Replication Canvas + Timer ──
      var replStep = d.replStep || 0;
      var replPlaying = !!d.replPlaying;

      var _replCanvasRef = function(cv) {
        if (window._dnaCleanup.replAnim) { window._dnaCleanup.replAnim(); window._dnaCleanup.replAnim = null; }
        if (!cv) return;
        if (tab !== 'replicate') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W/2, h2 = H/2;
        var _tick = 0; var _animId = null;
        var currentReplStep = replStep;

        function drawRepl() {
          ctx2d.clearRect(0, 0, w, h2);
          var baseW = Math.min(28, (w - 100) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = h2 / 2;
          var helixAmp = 14;

          ctx2d.fillStyle = '#e2e8f0'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left';
          ctx2d.fillText('DNA Replication Fork', 10, 14);

          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW/2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            var base = dnaSeq[i];
            var comp = complementStrand[i];
            var topY = midY - 22 + yOff;
            var bottomY = midY + 22 - yOff;

            if (i >= currentReplStep) {
              ctx2d.fillStyle = BASE_COLORS[base] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, topY, baseW * 0.35, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.font = 'bold ' + Math.max(8, baseW * 0.5) + 'px monospace'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
              ctx2d.fillText(base, x, topY);

              ctx2d.setLineDash([2, 2]); ctx2d.strokeStyle = 'rgba(148,163,184,0.5)';
              ctx2d.beginPath(); ctx2d.moveTo(x, topY + baseW * 0.35); ctx2d.lineTo(x, bottomY - baseW * 0.35); ctx2d.stroke();
              ctx2d.setLineDash([]);

              ctx2d.fillStyle = BASE_COLORS[comp] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, bottomY, baseW * 0.35, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, bottomY);
            } else {
              var spreadTop = midY - 48 + yOff;
              var spreadBot = midY + 48 - yOff;
              ctx2d.fillStyle = BASE_COLORS[base] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, spreadTop, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(base, x, spreadTop);
              ctx2d.fillStyle = BASE_COLORS[comp] || '#888'; ctx2d.globalAlpha = 0.7;
              ctx2d.beginPath(); ctx2d.arc(x, spreadTop + baseW * 0.9, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, spreadTop + baseW * 0.9);
              ctx2d.globalAlpha = 1;
              ctx2d.fillStyle = BASE_COLORS[comp] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, spreadBot, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, spreadBot);
              ctx2d.fillStyle = BASE_COLORS[base] || '#888'; ctx2d.globalAlpha = 0.7;
              ctx2d.beginPath(); ctx2d.arc(x, spreadBot - baseW * 0.9, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(base, x, spreadBot - baseW * 0.9);
              ctx2d.globalAlpha = 1;
            }

            if (i === currentReplStep && currentReplStep < dnaSeq.length) {
              ctx2d.fillStyle = 'rgba(168, 85, 247, 0.25)';
              ctx2d.beginPath(); ctx2d.arc(x, midY, baseW * 2, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#7c3aed'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'center';
              ctx2d.fillText('Helicase', x, midY - baseW * 2.2);
              ctx2d.fillStyle = '#059669'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('DNA Pol III', x, midY + baseW * 2.5);
            }
          }

          ctx2d.fillStyle = '#94a3b8'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'right';
          ctx2d.fillText("5' \u2192 3' (Leading)", w - 10, midY - 55);
          ctx2d.textAlign = 'left';
          ctx2d.fillText("3' \u2192 5' (Lagging)", 10, midY + 60);

          _tick++;
          _animId = requestAnimationFrame(drawRepl);
        }
        drawRepl();
        window._dnaCleanup.replAnim = function() { if (_animId) cancelAnimationFrame(_animId); };
      };

      // Replication step timer (driven by state, no useEffect)
      if (tab === 'replicate' && replPlaying) {
        if (replStep >= dnaSeq.length) {
          updMulti({ replPlaying: false });
          announceToSR('DNA replication complete! Two identical copies created.');
          awardStemXP('dnaLab', 15, 'Completed DNA replication');
          addToast('\uD83E\uDDEC Replication complete! Two daughter strands formed.', 'success');
          if (typeof stemCelebrate === 'function') stemCelebrate();
        } else {
          if (window._dnaCleanup.replTimer) clearTimeout(window._dnaCleanup.replTimer);
          window._dnaCleanup.replTimer = setTimeout(function() {
            upd('replStep', replStep + 1);
          }, 500 / speed);
        }
      }

      // Translation (all state in ctx.toolData — no hooks)
      var transStep = d.transStep || 0;
      var transPlaying = !!d.transPlaying;
      var builtProtein = d.builtProtein || [];

      if (tab === 'translate' && transPlaying) {
        var tPos = transStep * 3;
        if (tPos + 3 > fullMRNA.length) {
          updMulti({ transPlaying: false });
        } else {
          var tCodon = fullMRNA.substring(tPos, tPos + 3);
          var tAA = CODON_TABLE[tCodon];
          if (!tAA || tAA === 'Stop') {
            updMulti({ transPlaying: false, protein: builtProtein });
            announceToSR('Translation complete. Protein has ' + builtProtein.length + ' amino acids.');
            awardStemXP('dnaLab', 15, 'Completed translation');
          } else {
            if (window._dnaCleanup.transTimer) clearTimeout(window._dnaCleanup.transTimer);
            window._dnaCleanup.transTimer = setTimeout(function() {
              updMulti({ transStep: transStep + 1, builtProtein: builtProtein.concat([{ codon: tCodon, aa: tAA, pos: tPos }]) });
              announceToSR('Codon ' + tCodon + ' = ' + (AA_PROPS[tAA] ? AA_PROPS[tAA].full : tAA));
            }, 800 / speed);
          }
        }
      }

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
          var newStreak = (d.challengeStreak || 0) + 1;
          updMulti({ challengeFeedback: '\u2705 Correct!', score: score + 10, challengeStreak: newStreak });
          awardStemXP('dnaLab', 10, 'Challenge correct');
          announceToSR('Correct!'); if (typeof stemCelebrate === 'function') stemCelebrate();
        } else {
          updMulti({ challengeFeedback: '\u274c The answer is ' + answers[0] + '. ' + (challengeQ.hint || ''), challengeStreak: 0 });
          announceToSR('Incorrect. Answer: ' + answers[0]);
        }
      }

      // ── Mutation helpers ──
      function applyMutation(type) {
        var bases = 'ATGC'; var seq = dnaSeq.split('');
        var pos = Math.floor(Math.random() * (seq.length - 6)) + 3;
        var original = seq[pos]; var mutated;
        if (type === 'substitution') {
          do { mutated = bases[Math.floor(Math.random() * 4)]; } while (mutated === original);
          seq[pos] = mutated;
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: (d.mutationLog || []).concat([{ type: 'Substitution', pos: pos, from: original, to: mutated }]) });
          addToast('\uD83E\uDDEC Substitution at pos ' + (pos+1) + ': ' + original + ' \u2192 ' + mutated, 'success');
        } else if (type === 'insertion') {
          mutated = bases[Math.floor(Math.random() * 4)];
          seq.splice(pos, 0, mutated);
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: (d.mutationLog || []).concat([{ type: 'Insertion', pos: pos, to: mutated }]) });
          addToast('\uD83E\uDDEC Insertion at pos ' + (pos+1) + ': +' + mutated, 'success');
        } else {
          var removed = seq.splice(pos, 1)[0];
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: (d.mutationLog || []).concat([{ type: 'Deletion', pos: pos, from: removed }]) });
          addToast('\uD83E\uDDEC Deletion at pos ' + (pos+1) + ': -' + removed, 'success');
        }
        awardStemXP('dnaLab', 3, 'Applied ' + type + ' mutation');
      }

      // ── CRISPR-Cas9 Simulator ──
      var crisprPhase = d.crisprPhase || 'design'; // design | scanning | cut | repair | done
      var crisprScanPos = d.crisprScanPos || 0;
      var crisprGuideLen = 6;
      var crisprRepairType = d.crisprRepairType || '';
      var crisprEditLog = d.crisprEditLog || [];

      // Find all PAM sites (NGG on coding strand) in the sequence
      function findPAMSites(seq) {
        var sites = [];
        for (var i = 0; i <= seq.length - 3; i++) {
          if (seq[i + 1] === 'G' && seq[i + 2] === 'G') {
            var cutPos = i;
            if (cutPos >= crisprGuideLen) sites.push({ pamStart: i, cutSite: cutPos });
          }
        }
        return sites;
      }
      var pamSites = findPAMSites(dnaSeq);
      var activePAM = d.crisprTargetPAM != null ? d.crisprTargetPAM : (pamSites.length > 0 ? 0 : -1);
      var selectedPAMSite = activePAM >= 0 && activePAM < pamSites.length ? pamSites[activePAM] : null;

      function startCRISPRScan() {
        updMulti({ crisprPhase: 'scanning', crisprScanPos: 0 });
        announceToSR('Cas9 scanning DNA for target sequence...');
      }

      function applyCRISPRRepair(type) {
        if (!selectedPAMSite) return;
        var seq = dnaSeq.split('');
        var cutPos = selectedPAMSite.cutSite;
        var resultSeq, desc;
        if (type === 'nhej') {
          var delLen = Math.floor(Math.random() * 3) + 1;
          var deleted = seq.splice(Math.max(0, cutPos - 1), delLen);
          resultSeq = seq.join('');
          desc = 'NHEJ: deleted ' + deleted.join('') + ' at pos ' + cutPos + ' (error-prone, may cause frameshift)';
        } else {
          var newBase = 'ATGC'[Math.floor(Math.random() * 4)];
          seq[cutPos] = newBase;
          resultSeq = seq.join('');
          desc = 'HDR: replaced base at pos ' + cutPos + ' with ' + newBase + ' (template-directed, precise)';
        }
        updMulti({
          dnaSequence: resultSeq, mRNA: '', protein: [], animStep: 0,
          crisprPhase: 'done', crisprRepairType: type,
          crisprEditLog: crisprEditLog.concat([{ type: type.toUpperCase(), pos: cutPos, desc: desc, time: Date.now() }])
        });
        addToast('\u2702\uFE0F CRISPR edit applied: ' + type.toUpperCase(), 'success');
        awardStemXP('dnaLab', 20, 'Completed CRISPR gene edit');
        if (typeof stemCelebrate === 'function') stemCelebrate();
      }

      // CRISPR scanning timer (state-driven, no useEffect)
      if (tab === 'crispr' && crisprPhase === 'scanning') {
        if (!selectedPAMSite) {
          updMulti({ crisprPhase: 'design' });
        } else {
          var targetPos = selectedPAMSite.cutSite;
          if (crisprScanPos >= targetPos) {
            updMulti({ crisprPhase: 'cut' });
            announceToSR('Cas9 found target! PAM site located. Ready to cut.');
            addToast('\uD83C\uDFAF Cas9 found the target PAM site!', 'success');
            stemBeep && stemBeep();
          } else {
            if (window._dnaCleanup.crisprTimer) clearTimeout(window._dnaCleanup.crisprTimer);
            window._dnaCleanup.crisprTimer = setTimeout(function() {
              upd('crisprScanPos', crisprScanPos + 1);
            }, 200 / speed);
          }
        }
      }

      // CRISPR canvas (callback ref, no useEffect)
      var _crisprCanvasRef = function(cv) {
        if (window._dnaCleanup.crisprAnim) { window._dnaCleanup.crisprAnim(); window._dnaCleanup.crisprAnim = null; }
        if (!cv) return;
        if (tab !== 'crispr') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W / 2, h2 = H / 2;
        var _tick = 0; var _animId = null;

        function drawCRISPR() {
          ctx2d.clearRect(0, 0, w, h2);
          var baseW = Math.min(24, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = h2 / 2;

          ctx2d.fillStyle = '#e2e8f0'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left';
          ctx2d.fillText('CRISPR-Cas9 Gene Editor', 10, 14);

          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            var base = dnaSeq[i];
            var comp = complementStrand[i];

            var isPAM = selectedPAMSite && (i >= selectedPAMSite.pamStart && i < selectedPAMSite.pamStart + 3);
            var isGuide = selectedPAMSite && (i >= selectedPAMSite.cutSite - crisprGuideLen && i < selectedPAMSite.cutSite);
            var isCutSite = selectedPAMSite && i === selectedPAMSite.cutSite;

            if (crisprPhase === 'cut' && isCutSite) {
              ctx2d.strokeStyle = '#ef4444'; ctx2d.lineWidth = 2;
              ctx2d.setLineDash([4, 2]);
              ctx2d.beginPath(); ctx2d.moveTo(x, midY - 35 + yOff); ctx2d.lineTo(x, midY + 35 - yOff); ctx2d.stroke();
              ctx2d.setLineDash([]);
              ctx2d.fillStyle = '#ef4444'; ctx2d.font = 'bold 8px sans-serif'; ctx2d.textAlign = 'center';
              ctx2d.fillText('\u2702 CUT', x, midY - 40 + yOff);
            }

            if (isPAM) {
              ctx2d.fillStyle = 'rgba(239,68,68,0.15)';
              ctx2d.fillRect(x - baseW / 2, midY - 30 + yOff, baseW, 60);
            } else if (isGuide) {
              ctx2d.fillStyle = 'rgba(59,130,246,0.1)';
              ctx2d.fillRect(x - baseW / 2, midY - 30 + yOff, baseW, 60);
            }

            ctx2d.fillStyle = isPAM ? '#ef4444' : isGuide ? '#3b82f6' : (BASE_COLORS[base] || '#888');
            ctx2d.beginPath(); ctx2d.arc(x, midY - 16 + yOff, baseW * 0.35, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff'; ctx2d.font = 'bold ' + Math.max(7, baseW * 0.45) + 'px monospace'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
            ctx2d.fillText(base, x, midY - 16 + yOff);

            ctx2d.setLineDash([2, 2]); ctx2d.strokeStyle = isCutSite && crisprPhase === 'cut' ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.4)';
            ctx2d.beginPath(); ctx2d.moveTo(x, midY - 16 + yOff + baseW * 0.35); ctx2d.lineTo(x, midY + 16 - yOff - baseW * 0.35); ctx2d.stroke();
            ctx2d.setLineDash([]);

            ctx2d.fillStyle = isPAM ? '#ef4444' : isGuide ? '#3b82f6' : (BASE_COLORS[comp] || '#888');
            ctx2d.beginPath(); ctx2d.arc(x, midY + 16 - yOff, baseW * 0.35, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, midY + 16 - yOff);
          }

          var cas9Pos = crisprPhase === 'scanning' ? crisprScanPos : (selectedPAMSite ? selectedPAMSite.cutSite : 0);
          if (crisprPhase === 'scanning' || crisprPhase === 'cut') {
            var cas9X = startX + cas9Pos * baseW + baseW / 2;
            var cas9Y = midY;
            ctx2d.fillStyle = 'rgba(168,85,247,0.2)';
            ctx2d.beginPath(); ctx2d.ellipse(cas9X, cas9Y, baseW * 3, 30, 0, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.strokeStyle = '#7c3aed'; ctx2d.lineWidth = 1.5;
            ctx2d.beginPath(); ctx2d.ellipse(cas9X, cas9Y, baseW * 3, 30, 0, 0, Math.PI * 2); ctx2d.stroke();
            ctx2d.fillStyle = '#7c3aed'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'center';
            ctx2d.fillText('Cas9', cas9X, cas9Y - 34);
            if (crisprPhase === 'cut') {
              ctx2d.fillStyle = '#2563eb'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('gRNA', cas9X - baseW * 2, cas9Y + 38);
            }
          }

          ctx2d.font = 'bold 8px sans-serif'; ctx2d.textAlign = 'left';
          ctx2d.fillStyle = '#3b82f6'; ctx2d.fillText('\u25CF Guide RNA target', 10, h2 / 2 + 48);
          ctx2d.fillStyle = '#ef4444'; ctx2d.fillText('\u25CF PAM site (NGG)', 10, h2 / 2 + 58);
          ctx2d.fillStyle = '#7c3aed'; ctx2d.fillText('\u25CF Cas9 protein', w - 100, h2 / 2 + 48);

          _tick++;
          _animId = requestAnimationFrame(drawCRISPR);
        }
        drawCRISPR();
        window._dnaCleanup.crisprAnim = function() { if (_animId) cancelAnimationFrame(_animId); };
      };

      var tabs = [
        { id: 'build', icon: '\uD83E\uDDEC', label: 'Build' },
        { id: 'replicate', icon: '\uD83D\uDD00', label: 'Replicate' },
        { id: 'transcribe', icon: '\uD83D\uDCDD', label: 'Transcribe' },
        { id: 'translate', icon: '\uD83D\uDD2C', label: 'Translate' },
        { id: 'mutate', icon: '\uD83E\uDDA0', label: 'Mutate' },
        { id: 'crispr', icon: '\u2702\uFE0F', label: 'CRISPR' },
        { id: 'protein', icon: '\uD83E\uDDEA', label: 'Protein' },
        { id: 'challenge', icon: '\uD83C\uDFAF', label: 'Challenge' }
      ];

      return h("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200" },

        // Header
        h("div", { className: "flex items-center justify-between" },
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { setStemLabTool(null); announceToSR('Returned to tool grid'); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools' },
              h(ArrowLeft, { size: 18, className: "text-slate-500" })),
            h("div", null,
              h("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDDEC DNA / Genetics Lab"),
              h("p", { className: "text-xs text-slate-400" }, "Build \u2022 Replicate \u2022 Transcribe \u2022 Translate \u2022 Mutate \u2022 CRISPR"))
          ),
          h("div", { className: "flex items-center gap-2" },
            h("span", { className: "text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + getStemXP('dnaLab') + "/100 XP"),
            h("button", { onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'dna-' + Date.now(), tool: 'dnaLab', label: 'DNA: ' + dnaSeq.substring(0,12) + '...', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        ),

        // ═══ GRADE LEVEL SELECTOR ═══
        h("div", { className: "flex items-center gap-1.5 flex-wrap" },
          h("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1" }, "\uD83C\uDF93 Grade:"),
          GRADE_BANDS.map(function(gb) {
            return h("button", {
              key: gb,
              onClick: function() { upd('dnaGradeOverride', gb); addToast('\uD83C\uDF93 Grade set to ' + gb, 'success'); },
              className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (gradeBand === gb ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-fuchsia-50 border border-slate-200')
            }, gb);
          }),
          h("span", { className: "ml-auto px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 text-[9px] font-bold rounded-full border border-fuchsia-200" },
            gradeBand === 'K-2' ? '\uD83E\uDDF8 Elementary' : gradeBand === '3-5' ? '\uD83D\uDCDA Upper Elementary' : gradeBand === '6-8' ? '\uD83E\uDD13 Middle School' : '\uD83C\uDF93 High School'
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
                  return h("button", { key: p.name, onClick: function() { updMulti({ dnaSequence: p.seq, mRNA: '', protein: [], animStep: 0 }); addToast('\uD83E\uDDEC ' + p.name + ': ' + p.desc, 'success'); announceToSR('Loaded ' + p.name); }, className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100", title: p.desc }, p.name);
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

        // REPLICATION TAB
        tab === 'replicate' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application", 'aria-label': 'DNA replication fork visualization' },
            h("canvas", { ref: _replCanvasRef, style: { width: '100%', height: 240 }, tabIndex: 0, 'aria-label': 'Replication: ' + replStep + '/' + dnaSeq.length })
          ),
          h("div", { className: "flex items-center gap-3 flex-wrap" },
            h("button", { onClick: function() {
              if (replPlaying) { upd('replPlaying', false); }
              else { if (replStep >= dnaSeq.length) updMulti({ replStep: 0, replPlaying: true }); else upd('replPlaying', true); }
            }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (replPlaying ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700') }, replPlaying ? '\u23F8 Pause' : '\u25B6 Replicate'),
            h("button", { onClick: function() { updMulti({ replStep: 0, replPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, '\u21BA Reset'),
            h("div", { className: "flex items-center gap-2 ml-auto" },
              h("span", { className: "text-xs text-slate-500" }, 'Speed:'),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[10px] font-bold rounded-lg " + (speed === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500') }, s + 'x'); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4 space-y-3" },
            h("div", { className: "flex justify-between text-xs text-slate-500 mb-1" },
              h("span", null, replStep + '/' + dnaSeq.length + ' bases replicated'),
              h("span", null, Math.round(replStep / dnaSeq.length * 100) + '%')
            ),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" },
              h("div", { className: "bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full h-2 transition-all", style: { width: (replStep / dnaSeq.length * 100) + '%' } })
            ),
            h("p", { className: "text-xs text-slate-600 mt-2 leading-relaxed" },
              gradeBand === 'K-2' ? '\uD83E\uDDEC DNA replication is like photocopying a recipe. The cell unzips the DNA ladder and builds two exact copies so both new cells get the instructions!' :
              gradeBand === '3-5' ? '\uD83E\uDDEC During replication, the enzyme helicase unwinds the double helix. Then DNA polymerase reads each strand and adds matching bases (A-T, G-C) to create two identical copies.' :
              gradeBand === '6-8' ? '\uD83E\uDDEC Semi-conservative replication: Helicase unwinds at the origin of replication. DNA Polymerase III adds nucleotides 5\u2032\u21923\u2032. The leading strand is continuous, while the lagging strand is synthesized in Okazaki fragments joined by ligase.' :
              '\uD83E\uDDEC Replication initiates at origins of replication (OriC in prokaryotes). Helicase unwinds; SSB proteins stabilize. Primase lays RNA primers. Pol III extends 5\u2032\u21923\u2032 (leading = continuous, lagging = Okazaki fragments). Pol I replaces primers; ligase seals nicks. Proofreading by 3\u2032\u21925\u2032 exonuclease achieves ~10\u207B\u2079 error rate.'
            ),
            h("div", { className: "flex gap-3 flex-wrap text-[9px] text-slate-500 pt-2 border-t border-slate-100" },
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-500" }), 'Helicase'),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500" }), 'DNA Pol III'),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-sky-400" }), 'Leading (continuous)'),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-orange-400" }), 'Lagging (Okazaki)')
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
                var isActive = idx === transStep && transPlaying;
                var isPast = idx < transStep;
                return h("span", { key: idx, className: "inline-block px-1 py-0.5 mx-0.5 rounded text-xs font-bold " + (isActive ? "bg-violet-600 text-white scale-110" : isPast ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"), title: codon + ' \u2192 ' + (CODON_TABLE[codon] || '?') }, codon);
              })
            ),
            h("div", { className: "flex flex-wrap gap-1 items-center", role: "list" },
              h("span", { className: "text-[10px] font-bold text-slate-500 mr-1" }, "Protein:"),
              builtProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa }; return h("span", { key: idx, role: "listitem", className: "px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white", style: { background: pr.color }, title: pr.full }, p.aa); }),
              builtProtein.length === 0 && h("span", { className: "text-[10px] text-slate-400 italic" }, "Press Start to begin...")
            ),
            h("div", { className: "flex items-center gap-3 mt-4" },
              h("button", { onClick: function() { if (transPlaying) updMulti({ transPlaying: false }); else { updMulti({ transStep: 0, builtProtein: [], transPlaying: true }); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (transPlaying ? "bg-amber-500 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700") }, transPlaying ? "\u23F8 Pause" : "\u25B6 Translate"),
              h("button", { onClick: function() { updMulti({ transStep: 0, builtProtein: [], transPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, "\u21BA Reset")
            )
          )
        ),

        // PROTEIN TAB
        tab === 'protein' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("div", { className: "flex items-center justify-between mb-3" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83E\uDDEA Protein \u2014 " + fullProtein.length + " amino acids"),
              fullProtein.length > 0 && h("span", { className: "text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" },
                Math.round(fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length / Math.max(1, fullProtein.length) * 100) + '% hydrophobic'
              )
            ),
            fullProtein.length > 0 ? h("div", { className: "space-y-3" },
              // Amino acid chain visualization
              h("div", { className: "flex flex-wrap gap-1.5 p-3 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl border border-slate-100" },
                fullProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa, abbr: '?', type: '?' };
                  return h("div", { key: idx, className: "flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[44px] hover:scale-105 transition-transform cursor-default", title: pr.full + ' (' + p.codon + ') - ' + pr.type },
                    h("span", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm", style: { background: pr.color } }, pr.abbr),
                    h("span", { className: "text-[8px] font-bold text-slate-600" }, p.aa),
                    h("span", { className: "text-[7px] text-slate-400 font-mono" }, p.codon),
                    idx < fullProtein.length - 1 && p.aa !== 'Stop' ? h("span", { className: "text-[8px] text-slate-300" }, '\u2500') : null
                  );
                })
              ),
              // Properties summary
              h("div", { className: "grid grid-cols-2 gap-2 mt-2" },
                h("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-100" },
                  h("p", { className: "text-[9px] font-bold text-amber-700 uppercase" }, 'Nonpolar (Hydrophobic)'),
                  h("p", { className: "text-sm font-black text-amber-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length),
                  h("p", { className: "text-[8px] text-amber-500" }, 'Ala, Val, Leu, Ile, Pro, Phe, Trp, Met, Gly')
                ),
                h("div", { className: "bg-blue-50 rounded-lg p-2 border border-blue-100" },
                  h("p", { className: "text-[9px] font-bold text-blue-700 uppercase" }, 'Polar (Hydrophilic)'),
                  h("p", { className: "text-sm font-black text-blue-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'polar'; }).length),
                  h("p", { className: "text-[8px] text-blue-500" }, 'Ser, Thr, Cys, Tyr, Asn, Gln')
                ),
                h("div", { className: "bg-red-50 rounded-lg p-2 border border-red-100" },
                  h("p", { className: "text-[9px] font-bold text-red-700 uppercase" }, 'Positively Charged'),
                  h("p", { className: "text-sm font-black text-red-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'positive'; }).length),
                  h("p", { className: "text-[8px] text-red-500" }, 'Arg, Lys, His')
                ),
                h("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-100" },
                  h("p", { className: "text-[9px] font-bold text-purple-700 uppercase" }, 'Negatively Charged'),
                  h("p", { className: "text-sm font-black text-purple-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'negative'; }).length),
                  h("p", { className: "text-[8px] text-purple-500" }, 'Asp, Glu')
                )
              ),
              // Estimated MW
              h("div", { className: "bg-slate-50 rounded-lg p-2 border border-slate-200 mt-1" },
                h("p", { className: "text-[9px] font-bold text-slate-500" }, '\u2696\uFE0F Estimated Molecular Weight: ~' + (fullProtein.length * 110) + ' Da (' + (fullProtein.length * 110 / 1000).toFixed(1) + ' kDa) | Sequence: ' + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return (AA_PROPS[p.aa] || {}).abbr || '?'; }).join(''))
              ),
              // Legend
              h("div", { className: "flex gap-3 text-[10px] text-slate-500 pt-2 border-t flex-wrap" },
                [{t:'nonpolar',c:'#f59e0b',l:'Nonpolar'},{t:'polar',c:'#3b82f6',l:'Polar'},{t:'positive',c:'#ef4444',l:'Positive (+)'},{t:'negative',c:'#a855f7',l:'Negative (\u2212)'}].map(function(lg) { return h("span", { key: lg.t, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: lg.c } }), lg.l); })
              ),
              // AI protein analysis
              callGemini && h("div", { className: "pt-2 border-t border-slate-100" },
                h("button", { onClick: function() {
                  if (d.aiProteinLoading) return;
                  upd('aiProteinLoading', true);
                  var gradeCtx = gradeBand === 'K-2' ? 'kindergarten, very simple' : gradeBand === '3-5' ? '3rd-5th grade' : gradeBand === '6-8' ? '6th-8th grade, scientific terms' : '9th-12th grade, advanced biochemistry';
                  var seq = fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-');
                  var prompt = 'You are a biochemistry teacher. Grade: ' + gradeCtx + '. Protein sequence: ' + seq + '. ' +
                    'Amino acid count: ' + fullProtein.length + '. ' +
                    'Analyze this protein in 3-4 sentences: predict its likely function based on amino acid properties (hydrophobic vs hydrophilic balance, charged residues), possible cellular location (membrane, cytoplasm, secreted), and any notable patterns. Be educational and engaging.';
                  callGemini(prompt, true, false, 0.7).then(function(r) { upd('aiProtein', typeof r === 'string' ? r : 'Analysis unavailable.'); upd('aiProteinLoading', false); }).catch(function() { upd('aiProtein', 'AI unavailable.'); upd('aiProteinLoading', false); });
                }, disabled: d.aiProteinLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiProteinLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md') }, d.aiProteinLoading ? '\u23F3 Analyzing...' : '\u2728 AI: Analyze Protein'),
                d.aiProtein && h("div", { className: "mt-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 leading-relaxed" },
                  h("span", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, '\uD83E\uDDE0 Protein Analysis'),
                  d.aiProtein
                )
              )
            ) : h("div", { className: "text-center py-8 text-slate-400" }, h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEA"), h("p", null, "Run Transcription and Translation first!"))
          ),
          // Genetic Disorders Reference
          h("details", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, '\uD83E\uDDA0 Genetic Disorders Reference'),
            h("div", { className: "p-3 space-y-2 max-h-60 overflow-y-auto" },
              [
                { name: 'Sickle Cell Disease', gene: 'HBB', mutation: 'Glu\u2192Val (pos 6)', type: 'Missense', effect: 'Hemoglobin S causes red blood cells to form sickle shapes, blocking blood flow.' },
                { name: 'Cystic Fibrosis', gene: 'CFTR', mutation: '\u0394F508 deletion', type: 'Deletion', effect: 'Misfolded chloride channel causes thick mucus in lungs and digestive system.' },
                { name: 'Huntington\'s Disease', gene: 'HTT', mutation: 'CAG repeat expansion', type: 'Trinucleotide Repeat', effect: 'Toxic polyglutamine aggregates destroy neurons. >36 repeats = disease.' },
                { name: 'Color Blindness', gene: 'OPN1LW/MW', mutation: 'Various missense', type: 'X-linked', effect: 'Altered opsin proteins change wavelength sensitivity of cone cells.' },
                { name: 'PKU', gene: 'PAH', mutation: 'Various (>500 known)', type: 'Missense/Nonsense', effect: 'Cannot metabolize phenylalanine. Managed by dietary restriction.' },
                { name: 'BRCA1/2 Cancers', gene: 'BRCA1, BRCA2', mutation: 'Frameshift/Nonsense', type: 'Loss of function', effect: 'DNA repair deficiency increases breast/ovarian cancer risk.' }
              ].map(function(dis) {
                return h("div", { key: dis.name, className: "p-2 bg-slate-50 rounded-lg" },
                  h("div", { className: "flex items-center gap-2" },
                    h("span", { className: "text-xs font-bold text-slate-700" }, dis.name),
                    h("span", { className: "px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-bold rounded-full" }, dis.type)
                  ),
                  h("p", { className: "text-[10px] text-slate-500 mt-0.5" }, 'Gene: ' + dis.gene + ' | Mutation: ' + dis.mutation),
                  h("p", { className: "text-[10px] text-slate-600 mt-0.5" }, dis.effect)
                );
              })
            )
          )
        ),

        // MUTATION TAB
        tab === 'mutate' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border-2 border-rose-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\uD83E\uDDA0"),
              h("h4", { className: "text-sm font-bold text-rose-800" }, "Mutation Simulator"),
              h("span", { className: "px-2 py-0.5 bg-rose-200 text-rose-800 text-[9px] font-bold rounded-full" }, "INTERACTIVE")
            ),
            h("p", { className: "text-xs text-slate-600" },
              gradeBand === 'K-2' ? 'Mutations are like typos in the DNA recipe. Even one small change can make a different protein!' :
              gradeBand === '3-5' ? 'A mutation changes the DNA sequence. This can change the mRNA, which can change the protein. Some mutations are harmless, others cause disease.' :
              gradeBand === '6-8' ? 'Point mutations (substitution, insertion, deletion) alter the reading frame of codons. Frameshift mutations from insertions/deletions often produce non-functional proteins.' :
              'Mutations drive evolution via natural selection. Substitutions may be synonymous (silent), missense, or nonsense. Insertions/deletions cause frameshifts altering all downstream codons.'
            ),
            h("div", { className: "flex gap-2 flex-wrap" },
              h("button", { onClick: function() { applyMutation('substitution'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-md transition-all" }, "\uD83D\uDD04 Substitution"),
              h("button", { onClick: function() { applyMutation('insertion'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition-all" }, "\u2795 Insertion"),
              h("button", { onClick: function() { applyMutation('deletion'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-md transition-all" }, "\u2796 Deletion"),
              h("button", { onClick: function() { updMulti({ dnaSequence: 'ATGCGTACCTGAAACTGA', mRNA: '', protein: [], animStep: 0, mutationLog: [] }); addToast('\u21BA Reset to original', 'success'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all" }, "\u21BA Reset")
            ),
            h("div", { className: "bg-white rounded-lg p-3 border" },
              h("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "Current Sequence (" + dnaSeq.length + " bp):"),
              h("div", { className: "font-mono text-xs break-all" },
                dnaSeq.split('').map(function(base, idx) { return h("span", { key: idx, className: "inline-block w-5 h-5 text-center leading-5 rounded font-bold text-white text-[10px] m-px", style: { background: BASE_COLORS[base] } }, base); })
              ),
              h("p", { className: "text-[10px] text-slate-400 mt-2" }, "Protein: " + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-') + (fullProtein.some(function(p) { return p.aa === 'Stop'; }) ? ' [STOP]' : ''))
            ),
            (d.mutationLog && d.mutationLog.length > 0) && h("div", { className: "mt-2" },
              h("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "\uD83D\uDCCB Mutation Log:"),
              h("div", { className: "space-y-1 max-h-32 overflow-y-auto" },
                (d.mutationLog || []).map(function(m, i) {
                  var emoji = m.type === 'Substitution' ? '\uD83D\uDD04' : m.type === 'Insertion' ? '\u2795' : '\u2796';
                  var desc = m.type === 'Substitution' ? m.from + '\u2192' + m.to + ' at pos ' + (m.pos+1) :
                             m.type === 'Insertion' ? '+' + m.to + ' at pos ' + (m.pos+1) :
                             '-' + m.from + ' at pos ' + (m.pos+1);
                  return h("div", { key: i, className: "text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, emoji + ' ' + m.type + ': ' + desc);
                })
              )
            )
          ),
          // AI Explain for mutations
          callGemini && h("div", { className: "mt-2" },
            h("button", { onClick: function() {
              if (d.aiExplainLoading) return;
              upd('aiExplainLoading', true); upd('aiExplain', '');
              var gradeCtx = gradeBand === 'K-2' ? 'kindergarten (ages 5-7), very simple words' : gradeBand === '3-5' ? '3rd-5th grade (ages 8-10)' : gradeBand === '6-8' ? '6th-8th grade (ages 11-13), use scientific terms' : '9th-12th grade (ages 14-18), use advanced biology terminology';
              var mutLog = (d.mutationLog || []).slice(-3).map(function(m) { return m.type + (m.from ? ' ' + m.from : '') + (m.to ? '\u2192' + m.to : '') + ' at pos ' + (m.pos+1); }).join('; ');
              var prompt = 'You are a genetics teacher. Grade level: ' + gradeCtx + '. ' +
                'DNA sequence: ' + dnaSeq + '. Protein: ' + fullProtein.map(function(p) { return p.aa; }).join('-') + '. ' +
                'Recent mutations: ' + (mutLog || 'none') + '. ' +
                'Explain in 3-4 sentences what this DNA codes for, how the mutations affected the protein, and whether the changes would be harmful/neutral/beneficial. Be engaging and educational.';
              callGemini(prompt, true, false, 0.7).then(function(resp) {
                upd('aiExplain', typeof resp === 'string' ? resp : 'Could not generate explanation.');
                upd('aiExplainLoading', false);
              }).catch(function() { upd('aiExplain', 'AI explanation unavailable.'); upd('aiExplainLoading', false); });
            }, disabled: d.aiExplainLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiExplainLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-600 hover:to-fuchsia-600 shadow-md') }, d.aiExplainLoading ? '\u23F3 Analyzing...' : '\u2728 AI: Explain This DNA'),
            d.aiExplain && h("div", { className: "mt-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed" },
              h("span", { className: "text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1" }, "\uD83E\uDDE0 AI Analysis"),
              d.aiExplain
            )
          )
        ),

        // CRISPR TAB
        tab === 'crispr' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application", 'aria-label': 'CRISPR-Cas9 gene editing simulation' },
            h("canvas", { ref: _crisprCanvasRef, style: { width: '100%', height: 260 }, tabIndex: 0, 'aria-label': 'CRISPR: ' + crisprPhase })
          ),

          // Phase controls
          h("div", { className: "bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border-2 border-violet-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\u2702\uFE0F"),
              h("h4", { className: "text-sm font-bold text-violet-800" }, "CRISPR-Cas9 Gene Editor"),
              h("span", { className: "px-2 py-0.5 text-[9px] font-bold rounded-full " + (
                crisprPhase === 'design' ? 'bg-blue-200 text-blue-800' :
                crisprPhase === 'scanning' ? 'bg-amber-200 text-amber-800 animate-pulse' :
                crisprPhase === 'cut' ? 'bg-red-200 text-red-800' :
                crisprPhase === 'done' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
              ) }, crisprPhase === 'design' ? 'DESIGN' : crisprPhase === 'scanning' ? 'SCANNING...' : crisprPhase === 'cut' ? 'TARGET FOUND' : crisprPhase === 'done' ? 'EDIT COMPLETE' : crisprPhase.toUpperCase())
            ),
            h("p", { className: "text-xs text-slate-600 leading-relaxed" },
              gradeBand === 'K-2' ? '\u2702\uFE0F CRISPR is like molecular scissors! Scientists use a tiny protein called Cas9 to find and cut a specific spot in the DNA, then fix it to cure diseases.' :
              gradeBand === '3-5' ? '\u2702\uFE0F CRISPR-Cas9 uses a guide RNA to lead the Cas9 protein to an exact location on the DNA. Once it finds the matching sequence next to a PAM site (NGG), it cuts both strands. The cell then repairs the break.' :
              gradeBand === '6-8' ? '\u2702\uFE0F CRISPR-Cas9: A guide RNA (gRNA) complementary to the target sequence directs Cas9 to the DNA. Cas9 recognizes the PAM motif (5\u2032-NGG-3\u2032), unwinds the DNA, and creates a double-strand break (DSB). Repair occurs via NHEJ (error-prone) or HDR (precise, requires template).' :
              '\u2702\uFE0F The CRISPR-Cas9 system: crRNA+tracrRNA (or synthetic sgRNA) guides Cas9 endonuclease to a 20nt target adjacent to a 5\u2032-NGG-3\u2032 PAM. RuvC and HNH nuclease domains each cleave one strand, creating a blunt-ended DSB. NHEJ introduces indels (knockouts); HDR with donor template enables precise edits (knock-ins). Off-target effects are minimized by high-fidelity Cas9 variants (eSpCas9, HiFi Cas9).'
            ),

            // Step 1: Target selection
            crisprPhase === 'design' && h("div", { className: "space-y-2" },
              h("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, 'Step 1: Select PAM Target Site'),
              pamSites.length === 0 ? h("p", { className: "text-xs text-amber-600 bg-amber-50 p-2 rounded-lg" }, '\u26A0\uFE0F No PAM sites (NGG) found in this sequence. Try a different DNA sequence from the Build tab.') :
              h("div", { className: "space-y-1" },
                h("p", { className: "text-[10px] text-slate-500" }, pamSites.length + ' PAM site(s) detected:'),
                h("div", { className: "flex gap-1 flex-wrap" },
                  pamSites.map(function(site, idx) {
                    return h("button", { key: idx, onClick: function() { upd('crisprTargetPAM', idx); },
                      className: "px-2 py-1 text-[10px] font-bold rounded-lg transition-all " + (activePAM === idx ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-violet-50')
                    }, 'Pos ' + (site.pamStart + 1) + ' (' + dnaSeq.substring(site.pamStart, site.pamStart + 3) + ')');
                  })
                ),
                selectedPAMSite && h("div", { className: "mt-2 p-2 bg-white rounded-lg border text-[10px]" },
                  h("p", { className: "text-slate-600" }, '\uD83C\uDFAF Target: pos ' + (selectedPAMSite.cutSite - crisprGuideLen + 1) + '-' + selectedPAMSite.cutSite + ' | PAM: ' + dnaSeq.substring(selectedPAMSite.pamStart, selectedPAMSite.pamStart + 3) + ' at pos ' + (selectedPAMSite.pamStart + 1)),
                  h("p", { className: "text-blue-600 font-mono mt-0.5" }, 'gRNA: ' + dnaSeq.substring(selectedPAMSite.cutSite - crisprGuideLen, selectedPAMSite.cutSite).split('').map(function(b) { return DNA_TO_RNA[b] || b; }).join(''))
                ),
                h("button", { onClick: startCRISPRScan, disabled: !selectedPAMSite, className: "mt-2 px-4 py-2 text-sm font-bold rounded-xl transition-all " + (selectedPAMSite ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed') }, '\uD83D\uDE80 Deploy Cas9')
              )
            ),

            // Scanning phase
            crisprPhase === 'scanning' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs text-amber-600 font-bold" }, '\uD83D\uDD0E Cas9 scanning... position ' + crisprScanPos + '/' + (selectedPAMSite ? selectedPAMSite.cutSite : '?')),
              h("div", { className: "w-full bg-slate-100 rounded-full h-2" },
                h("div", { className: "bg-gradient-to-r from-violet-500 to-blue-500 rounded-full h-2 transition-all", style: { width: (selectedPAMSite ? (crisprScanPos / selectedPAMSite.cutSite * 100) : 0) + '%' } })
              ),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs text-slate-500" }, 'Speed:'),
                [1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-0.5 text-[10px] font-bold rounded " + (speed === s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500') }, s + 'x'); })
              )
            ),

            // Cut phase: choose repair
            crisprPhase === 'cut' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-red-600" }, '\u2702\uFE0F Double-strand break created! Choose repair pathway:'),
              h("div", { className: "grid grid-cols-2 gap-2" },
                h("button", { onClick: function() { applyCRISPRRepair('nhej'); }, className: "p-3 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all text-left" },
                  h("p", { className: "text-xs font-bold text-amber-700" }, '\uD83D\uDD27 NHEJ'),
                  h("p", { className: "text-[9px] text-amber-600 mt-0.5" }, 'Non-Homologous End Joining'),
                  h("p", { className: "text-[8px] text-slate-500 mt-1" }, gradeBand === 'K-2' ? 'Quick fix — might make mistakes!' : 'Error-prone. Introduces insertions/deletions (indels). Used for gene knockouts.')
                ),
                h("button", { onClick: function() { applyCRISPRRepair('hdr'); }, className: "p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all text-left" },
                  h("p", { className: "text-xs font-bold text-emerald-700" }, '\uD83E\uDDEC HDR'),
                  h("p", { className: "text-[9px] text-emerald-600 mt-0.5" }, 'Homology-Directed Repair'),
                  h("p", { className: "text-[8px] text-slate-500 mt-1" }, gradeBand === 'K-2' ? 'Careful fix — uses a template to make the exact right change!' : 'Precise editing using donor template. Used for gene knock-ins and corrections.')
                )
              )
            ),

            // Done phase
            crisprPhase === 'done' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-emerald-600" }, '\u2705 Gene edit complete! Repair: ' + (crisprRepairType === 'nhej' ? 'NHEJ (Non-Homologous End Joining)' : 'HDR (Homology-Directed Repair)')),
              h("button", { onClick: function() { updMulti({ crisprPhase: 'design', crisprScanPos: 0, crisprRepairType: '' }); }, className: "px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700" }, '\u21BA New Edit')
            ),

            // Edit history
            crisprEditLog.length > 0 && h("div", { className: "mt-2 pt-2 border-t border-slate-200" },
              h("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, '\uD83D\uDCCB CRISPR Edit History:'),
              h("div", { className: "space-y-1 max-h-24 overflow-y-auto" },
                crisprEditLog.map(function(e, i) {
                  return h("div", { key: i, className: "text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, (e.type === 'NHEJ' ? '\uD83D\uDD27' : '\uD83E\uDDEC') + ' ' + e.desc);
                })
              )
            )
          ),

          // CRISPR quick reference
          h("details", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, '\uD83D\uDCDA CRISPR Quick Reference'),
            h("div", { className: "p-3 text-[10px] text-slate-600 space-y-2" },
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'What is CRISPR?'),
                h("p", null, 'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a revolutionary gene editing technology adapted from bacteria\'s immune defense system.')
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'Key Components:'),
                h("ul", { className: "list-disc ml-4 space-y-0.5" },
                  h("li", null, h("strong", null, 'Cas9'), ' — The molecular scissors (endonuclease)'),
                  h("li", null, h("strong", null, 'Guide RNA (gRNA)'), ' — A ~20nt RNA that directs Cas9 to the target'),
                  h("li", null, h("strong", null, 'PAM'), ' — Protospacer Adjacent Motif (NGG). Required for Cas9 binding.')
                )
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'Applications:'),
                h("p", null, 'Gene therapy (sickle cell \u2192 CASGEVY\u2122), cancer immunotherapy, crop engineering, disease models, antimicrobial resistance research.')
              )
            )
          )
        ),

        // CHALLENGE TAB
        tab === 'challenge' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4 space-y-4" },
            h("div", { className: "flex items-center justify-between flex-wrap gap-2" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83C\uDFAF DNA Challenge"),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + score + " pts"),
                (d.challengeStreak || 0) >= 2 && h("span", { className: "px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse" }, "\uD83D\uDD25 " + d.challengeStreak + " streak!")
              )
            ),
            !challengeQ ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEC"),
              h("p", { className: "text-xs text-slate-500 mb-3" }, "Test your genetics knowledge!"),
              h("div", { className: "flex gap-2 justify-center flex-wrap" },
                h("button", { onClick: generateChallenge, className: "px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg transition-all hover:shadow-xl" }, "\uD83C\uDFAF Static Challenge"),
                callGemini && h("button", { onClick: function() {
                  if (d.aiChallengeLoading) return;
                  upd('aiChallengeLoading', true);
                  var gradeCtx = gradeBand === 'K-2' ? 'kindergarten (ages 5-7), very simple' : gradeBand === '3-5' ? '3rd-5th grade' : gradeBand === '6-8' ? '6th-8th grade' : '9th-12th grade AP Biology level';
                  var prompt = 'Generate a genetics/DNA quiz question for ' + gradeCtx + ' students. Current DNA: ' + dnaSeq.substring(0,15) + '... ' +
                    'Return ONLY valid JSON: {"question":"...","answer":"...","hint":"..."}. ' +
                    'Topics: DNA structure, base pairing, replication, transcription, translation, mutations, codons, amino acids, genetic disorders. ' +
                    'Answer should be 1-3 words. Make it educational and grade-appropriate.';
                  callGemini(prompt, true, false, 0.7).then(function(resp) {
                    try {
                      var clean = (typeof resp === 'string' ? resp : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
                      var parsed = JSON.parse(clean);
                      if (parsed.question && parsed.answer) {
                        updMulti({ challengeQ: { type: 'ai', question: parsed.question, answer: parsed.answer, hint: parsed.hint || '', isAI: true }, challengeAnswer: '', challengeFeedback: '', aiChallengeLoading: false });
                      } else { throw new Error('bad'); }
                    } catch(e) {
                      addToast('\u26A0\uFE0F AI quiz failed, using static', 'error');
                      upd('aiChallengeLoading', false);
                      generateChallenge();
                    }
                  }).catch(function() { addToast('\u26A0\uFE0F AI unavailable', 'error'); upd('aiChallengeLoading', false); generateChallenge(); });
                }, disabled: d.aiChallengeLoading, className: "px-5 py-2.5 text-sm font-bold transition-all rounded-xl shadow-lg " + (d.aiChallengeLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-xl') }, d.aiChallengeLoading ? '\u23F3 Generating...' : '\u2728 AI Challenge')
              )
            ) : h("div", { className: "space-y-3" },
              challengeQ.isAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded-full" }, "\uD83E\uDDE0 AI-GENERATED"),
              h("p", { className: "text-sm font-medium text-slate-700" }, challengeQ.question),
              h("input", { type: "text", value: challengeAnswer, onChange: function(e) { upd('challengeAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkChallenge(); }, placeholder: "Type your answer...", className: "w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-violet-400 outline-none", 'aria-label': 'Answer' }),
              h("div", { className: "flex gap-2 flex-wrap" },
                h("button", { onClick: checkChallenge, className: "px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all" }, "\u2713 Check"),
                h("button", { onClick: function() { updMulti({ challengeFeedback: '\uD83D\uDCA1 ' + (challengeQ.hint || 'No hint available') }); }, className: "px-4 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl" }, "\uD83D\uDCA1 Hint"),
                h("button", { onClick: generateChallenge, className: "px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl" }, "\u21BB Next"),
                callGemini && h("button", { onClick: function() {
                  upd('aiChallengeLoading', true);
                  var gradeCtx = gradeBand === 'K-2' ? 'kindergarten' : gradeBand === '3-5' ? '3rd-5th grade' : gradeBand === '6-8' ? '6th-8th grade' : '9th-12th grade AP Bio';
                  var prompt = 'Generate a genetics quiz question for ' + gradeCtx + '. DNA: ' + dnaSeq.substring(0,12) + '. Return ONLY JSON: {"question":"...","answer":"...","hint":"..."}. Answer 1-3 words.';
                  callGemini(prompt, true, false, 0.7).then(function(r) {
                    try { var p = JSON.parse((typeof r === 'string' ? r : '').replace(/```json\s*/gi,'').replace(/```/g,'').trim()); updMulti({ challengeQ: { type: 'ai', question: p.question, answer: p.answer, hint: p.hint || '', isAI: true }, challengeAnswer: '', challengeFeedback: '', aiChallengeLoading: false }); }
                    catch(e) { addToast('\u26A0\uFE0F Parse error', 'error'); upd('aiChallengeLoading', false); generateChallenge(); }
                  }).catch(function() { upd('aiChallengeLoading', false); generateChallenge(); });
                }, disabled: d.aiChallengeLoading, className: "px-3 py-2 text-sm font-bold rounded-xl ml-auto transition-all " + (d.aiChallengeLoading ? 'bg-purple-200 text-purple-400 cursor-wait' : 'bg-purple-50 text-purple-600 hover:bg-purple-100') }, d.aiChallengeLoading ? '\u23F3...' : '\u2728 AI Next')
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

        h("div", { className: "sr-only", role: "status", 'aria-live': "polite" }, "DNA Lab: " + tab + " view")
      );
    }
  });

  console.log('[StemLab] stem_tool_dna.js loaded');
})();
