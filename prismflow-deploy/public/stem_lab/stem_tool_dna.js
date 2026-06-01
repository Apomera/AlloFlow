// ═══════════════════════════════════════════════════════
// stem_tool_dna.js - DNA / Genetics Lab  v3.0
// Enhanced STEM Lab tool - 11 sub-tools
// Build · Replicate · Transcribe · Translate · Mutate
// CRISPR · Protein · Forensics · Challenge · Battle · Learn
// ═══════════════════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
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
  // ── Reduced motion CSS (WCAG 2.3.3) - shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-dna')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-dna';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  // ── Audio (auto-injected) ──
  var _dnaAC = null;
  function getDnaAC() { if (!_dnaAC) { try { _dnaAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_dnaAC && _dnaAC.state === "suspended") { try { _dnaAC.resume(); } catch(e) {} } return _dnaAC; }
  function dnaTone(f,d,tp,v) { var ac = getDnaAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxDnaClick() { dnaTone(600, 0.03, "sine", 0.04); }
  function sfxDnaSuccess() { dnaTone(523, 0.08, "sine", 0.07); setTimeout(function() { dnaTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { dnaTone(784, 0.1, "sine", 0.08); }, 140); }


  // ═══════════════════════════════════════════════════════
  // IIFE-Scope Static Data (shared across renders)
  // ═══════════════════════════════════════════════════════

  var SUBTOOLS = [
    { id: 'build', icon: '\uD83E\uDDEC', label: 'Build' },
    { id: 'replicate', icon: '\uD83D\uDD00', label: 'Replicate' },
    { id: 'transcribe', icon: '\uD83D\uDCDD', label: 'Transcribe' },
    { id: 'translate', icon: '\uD83D\uDD2C', label: 'Translate' },
    { id: 'mutate', icon: '\uD83E\uDDA0', label: 'Mutate' },
    { id: 'crispr', icon: '\u2702\uFE0F', label: 'CRISPR' },
    { id: 'protein', icon: '\uD83E\uDDEA', label: 'Protein' },
    { id: 'forensics', icon: '\uD83D\uDD0D', label: 'Forensics' },
    { id: 'challenge', icon: '\uD83C\uDFAF', label: 'Challenge' },
    { id: 'battle', icon: '\u2694\uFE0F', label: 'Battle' },
    { id: 'learn', icon: '\uD83D\uDCDA', label: 'Learn' }
  ];

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
    'Stop':{full:'Stop codon',abbr:'*',type:'stop',color: 'var(--allo-stem-text-soft, #94a3b8)'}
  };

  var BASE_COMPLEMENT = { 'A':'T', 'T':'A', 'G':'C', 'C':'G' };
  var DNA_TO_RNA = { 'A':'U', 'T':'A', 'G':'C', 'C':'G' };
  var BASE_COLORS = { 'A':'#ef4444', 'T':'#3b82f6', 'G':'#22c55e', 'C':'#f59e0b', 'U':'#a855f7' };
  var BASE_DARK_COLORS = { 'A':'#991b1b', 'T':'#1e3a8a', 'G':'#166534', 'C':'#9a3412', 'U':'#6b21a8' };

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

  var GENETIC_DISORDERS = [
    { name: 'Sickle Cell Disease', gene: 'HBB', mutation: 'Glu\u2192Val (pos 6)', type: 'Missense', effect: 'Hemoglobin S causes red blood cells to form sickle shapes, blocking blood flow.' },
    { name: 'Cystic Fibrosis', gene: 'CFTR', mutation: '\u0394F508 deletion', type: 'Deletion', effect: 'Misfolded chloride channel causes thick mucus in lungs and digestive system.' },
    { name: 'Huntington\'s Disease', gene: 'HTT', mutation: 'CAG repeat expansion', type: 'Trinucleotide Repeat', effect: 'Toxic polyglutamine aggregates destroy neurons. >36 repeats = disease.' },
    { name: 'Color Blindness', gene: 'OPN1LW/MW', mutation: 'Various missense', type: 'X-linked', effect: 'Altered opsin proteins change wavelength sensitivity of cone cells.' },
    { name: 'PKU', gene: 'PAH', mutation: 'Various (>500 known)', type: 'Missense/Nonsense', effect: 'Cannot metabolize phenylalanine. Managed by dietary restriction.' },
    { name: 'BRCA1/2 Cancers', gene: 'BRCA1, BRCA2', mutation: 'Frameshift/Nonsense', type: 'Loss of function', effect: 'DNA repair deficiency increases breast/ovarian cancer risk.' }
  ];

  // ── Badges ──
  var DNA_BADGES = [
    { id: 'firstStrand', icon: '\uD83E\uDDEC', label: 'First Strand', desc: 'Load a DNA preset' },
    { id: 'copyMachine', icon: '\uD83D\uDD00', label: 'Copy Machine', desc: 'Complete replication' },
    { id: 'messenger', icon: '\uD83D\uDCDD', label: 'Messenger', desc: 'Complete transcription' },
    { id: 'ribosomePro', icon: '\uD83D\uDD2C', label: 'Ribosome Pro', desc: 'Complete translation' },
    { id: 'mutantMaker', icon: '\uD83E\uDDA0', label: 'Mutant Maker', desc: 'Apply 5 mutations' },
    { id: 'geneEditor', icon: '\u2702\uFE0F', label: 'Gene Editor', desc: 'Complete CRISPR edit' },
    { id: 'proteinSci', icon: '\uD83E\uDDEA', label: 'Protein Scientist', desc: 'AI-analyze a protein' },
    { id: 'csiGenetics', icon: '\uD83D\uDD0D', label: 'CSI Genetics', desc: 'Solve a forensics case' },
    { id: 'quizWhiz', icon: '\uD83C\uDFAF', label: 'Quiz Whiz', desc: 'Score 50+ in challenges' },
    { id: 'streakMaster', icon: '\uD83D\uDD25', label: 'Streak Master', desc: '5-question streak' },
    { id: 'geneWarrior', icon: '\u2694\uFE0F', label: 'Gene Warrior', desc: 'Win a battle' },
    { id: 'speedDemon', icon: '\u26A1', label: 'Speed Demon', desc: 'Replicate at 4x speed' },
    { id: 'explorer', icon: '\uD83D\uDDFA\uFE0F', label: 'Explorer', desc: 'Visit all sub-tools' },
    { id: 'dnaMaster', icon: '\uD83D\uDC51', label: 'DNA Master', desc: 'Earn 100 XP' }
  ];

  // ── Forensics Cases ──
  var FORENSIC_CASES = [
    { name: 'Crime Scene Match', desc: 'A robbery occurred. Match the evidence DNA to a suspect using restriction fragment analysis.',
      enzyme: 'EcoRI', samples: [
        { label: 'Evidence', fragments: [130, 250, 380, 510, 680], isRef: true },
        { label: 'Suspect A', fragments: [130, 290, 380, 510, 680] },
        { label: 'Suspect B', fragments: [130, 250, 380, 510, 680] },
        { label: 'Suspect C', fragments: [180, 250, 420, 510, 720] }
      ], match: 2 },
    { name: 'Paternity Test', desc: 'Determine biological parentage from DNA banding patterns.',
      enzyme: 'BamHI', samples: [
        { label: 'Child', fragments: [140, 310, 450, 600], isRef: true },
        { label: 'Mother', fragments: [140, 310, 520, 670] },
        { label: 'Father A', fragments: [200, 370, 450, 600] },
        { label: 'Father B', fragments: [140, 280, 520, 680] }
      ], match: 2 },
    { name: 'Species ID', desc: 'Identify a confiscated wildlife sample using DNA barcoding.',
      enzyme: 'HindIII', samples: [
        { label: 'Unknown', fragments: [160, 290, 430, 560, 710], isRef: true },
        { label: 'Wolf', fragments: [160, 290, 430, 560, 710] },
        { label: 'Coyote', fragments: [160, 330, 430, 600, 710] },
        { label: 'Dog', fragments: [160, 290, 470, 560, 750] }
      ], match: 1 },
    { name: 'Outbreak Source', desc: 'Trace a bacterial outbreak to its restaurant source.',
      enzyme: 'PstI', samples: [
        { label: 'Patient', fragments: [180, 340, 480, 610], isRef: true },
        { label: 'Restaurant A', fragments: [180, 340, 480, 610] },
        { label: 'Restaurant B', fragments: [220, 340, 520, 610] },
        { label: 'Restaurant C', fragments: [180, 380, 480, 650] }
      ], match: 1 }
  ];

  // ── Challenge Questions (3 tiers × 8) ──
  var CHALLENGE_QS = [
    { q: 'How many strands does DNA have?', a: '2', h: 'Think "double" helix', tier: 0 },
    { q: 'What base pairs with Adenine in DNA?', a: 'Thymine', h: 'A-T, G-C', tier: 0 },
    { q: 'What sugar is found in DNA?', a: 'Deoxyribose', h: 'The "D" in DNA', tier: 0 },
    { q: 'What shape is DNA?', a: 'Double helix', h: 'A twisted ladder', tier: 0 },
    { q: 'Which base pairs with Cytosine?', a: 'Guanine', h: 'A-T, G-C', tier: 0 },
    { q: 'Where is DNA found in eukaryotic cells?', a: 'Nucleus', h: 'The control center of the cell', tier: 0 },
    { q: 'What are DNA building blocks called?', a: 'Nucleotides', h: 'Sugar + phosphate + base', tier: 0 },
    { q: 'What does DNA stand for?', a: 'Deoxyribonucleic acid', h: 'Deoxyribo-nucleic acid', tier: 0 },
    { q: 'What enzyme unwinds DNA during replication?', a: 'Helicase', h: 'It "unzips" the helix', tier: 1 },
    { q: 'In mRNA, what base replaces Thymine?', a: 'Uracil', h: 'U replaces T in RNA', tier: 1 },
    { q: 'What is the universal START codon?', a: 'AUG', h: 'Also codes for Methionine', tier: 1 },
    { q: 'What amino acid does AUG code for?', a: 'Methionine', h: 'Also the start signal', tier: 1 },
    { q: 'What RNA carries amino acids to the ribosome?', a: 'tRNA', h: 'Transfer RNA', tier: 1 },
    { q: 'How many nucleotides code for one amino acid?', a: '3', h: 'Called a codon', tier: 1 },
    { q: 'What is a permanent change in DNA called?', a: 'Mutation', h: 'Substitution, insertion, or deletion', tier: 1 },
    { q: 'What type of bond holds DNA strands together?', a: 'Hydrogen', h: 'Weak individually, strong together', tier: 1 },
    { q: 'Name the enzyme that joins Okazaki fragments.', a: 'Ligase', h: 'DNA Ligase seals nicks', tier: 2 },
    { q: 'What does PAM stand for in CRISPR?', a: 'Protospacer Adjacent Motif', h: 'The Cas9 recognition sequence', tier: 2 },
    { q: 'A mutation that does NOT change the amino acid?', a: 'Silent,Synonymous', h: 'Also called synonymous', tier: 2 },
    { q: 'How many possible codons exist?', a: '64', h: '4 bases \u00d7 4 \u00d7 4', tier: 2 },
    { q: 'Which CRISPR repair pathway introduces random indels?', a: 'NHEJ', h: 'Non-Homologous End Joining', tier: 2 },
    { q: 'What is the wobble position of a codon?', a: '3rd,Third', h: 'The least specific position', tier: 2 },
    { q: 'Name the enzyme that adds RNA primers.', a: 'Primase', h: 'Creates short RNA segments', tier: 2 },
    { q: 'A single-base deletion causes what mutation type?', a: 'Frameshift', h: 'Shifts the entire reading frame', tier: 2 }
  ];

  // ── Battle Questions (10) ──
  var BATTLE_QS = [
    { q: 'What enzyme reads DNA and builds mRNA?', a: 'RNA Polymerase', h: 'RNA Pol' },
    { q: 'Name one of the three STOP codons.', a: 'UAA,UAG,UGA', h: 'U-A-A, U-A-G, or U-G-A' },
    { q: 'What holds the two strands of DNA together?', a: 'Hydrogen bonds', h: 'Between base pairs' },
    { q: 'What organelle is the site of translation?', a: 'Ribosome', h: 'Made of rRNA and protein' },
    { q: 'What mutation replaces one base with another?', a: 'Substitution', h: 'Also called a point mutation' },
    { q: 'DNA replication is called semi-conservative because?', a: 'Each new DNA has one old strand', h: 'Half old, half new' },
    { q: 'What does the "A" in ATP stand for?', a: 'Adenosine', h: 'Same base as in DNA!' },
    { q: 'What structure does tRNA have?', a: 'Cloverleaf', h: 'Three loops and a stem' },
    { q: 'How many amino acids does the genetic code encode?', a: '20', h: '64 codons code for this many' },
    { q: 'What is an anticodon?', a: 'tRNA sequence that pairs with mRNA codon', h: 'Found on transfer RNA' }
  ];

  // ── Learn Topics (4 topics × 4 grade bands) ──
  var LEARN_TOPICS = [
    { title: 'DNA Structure', icon: '\uD83E\uDDEC', tryIt: 'build', content: {
      'K-2': 'DNA is like a recipe book inside every cell! It tells your body how to grow. DNA looks like a twisted ladder called a double helix. The steps of the ladder are made of four letters: A, T, G, and C. A always pairs with T, and G always pairs with C!',
      '3-5': 'DNA (deoxyribonucleic acid) is a molecule found in the nucleus of every cell. It\u2019s shaped like a twisted ladder - the double helix. The sides are made of sugar and phosphate, and the rungs are base pairs: Adenine-Thymine and Guanine-Cytosine. Your DNA has about 3 billion base pairs!',
      '6-8': 'DNA is a polymer of nucleotides, each containing deoxyribose sugar, a phosphate group, and a nitrogenous base (A, T, G, or C). The antiparallel strands run 5\u2032\u21923\u2032 and 3\u2032\u21925\u2032, connected by hydrogen bonds (2 for A-T, 3 for G-C). Chromosomes are DNA wrapped around histone proteins forming chromatin.',
      '9-12': 'DNA is a right-handed B-form double helix with major and minor grooves. Each nucleotide: 2\u2032-deoxyribose, phosphodiester backbone, nitrogenous base. Chargaff\u2019s rules: %A=%T, %G=%C. Antiparallel strands, pitch of 3.4nm (10bp/turn). Supercoiling by topoisomerases regulates access. Telomeric TTAGGG repeats protect chromosome ends.'
    }},
    { title: 'Central Dogma', icon: '\uD83D\uDD04', tryIt: 'transcribe', content: {
      'K-2': 'DNA is like a recipe, and proteins are the food! First, the cell copies the recipe (transcription) to make a message called mRNA. Then tiny machines called ribosomes read the message and build proteins (translation). Proteins do almost everything in your body!',
      '3-5': 'The Central Dogma: DNA \u2192 RNA \u2192 Protein. In transcription, RNA polymerase reads DNA and makes mRNA. The mRNA goes to a ribosome for translation - it reads mRNA in groups of 3 letters (codons) and builds a chain of amino acids that folds into a protein!',
      '6-8': 'DNA is transcribed into mRNA by RNA polymerase (reading template 3\u2032\u21925\u2032, building mRNA 5\u2032\u21923\u2032). mRNA is processed (5\u2032 cap, poly-A tail, splicing of introns) then exported to ribosomes. tRNAs with anticodons deliver amino acids; the ribosome catalyzes peptide bonds during translation.',
      '9-12': 'Transcription: RNA Pol II binds TATA box via TBP/TFIID, assembles PIC, synthesizes pre-mRNA 5\u2032\u21923\u2032. Co-transcriptional processing: 7-methylguanosine cap, spliceosome-mediated intron removal, CstF/CPSF-directed polyadenylation. Translation: 43S PIC scans for Kozak-context AUG; 80S ribosome cycles A/P/E sites; EF-Tu delivers aminoacyl-tRNAs; release factors recognize stop codons.'
    }},
    { title: 'Mutations & Evolution', icon: '\uD83E\uDDA0', tryIt: 'mutate', content: {
      'K-2': 'Sometimes the cell makes a mistake when copying DNA - like a typo! These mistakes are called mutations. Most mutations don\u2019t do anything, but some can change how an organism looks or works. Over a very long time, helpful mutations help living things survive better!',
      '3-5': 'Mutations are changes in DNA sequence. A substitution swaps one base. An insertion adds a base. A deletion removes one. Insertions and deletions can shift the reading frame (frameshift), often breaking the protein. Natural selection acts on mutations over generations, driving evolution.',
      '6-8': 'Point mutations: transitions (purine\u2194purine) and transversions (purine\u2194pyrimidine). Effects: silent (synonymous), missense (different amino acid), nonsense (premature stop). Frameshift mutations from indels alter all downstream codons. Mutagens: UV light, chemicals, replication errors. Beneficial mutations spread via natural selection.',
      '9-12': 'Mutation rates: ~10\u207B\u2079/bp/replication after proofreading and mismatch repair. Transitions more common (tautomeric shifts). Trinucleotide repeat expansions (Huntington\u2019s: CAG>36). Neutral theory (Kimura): most molecular evolution is neutral drift. Positive selection detected by dN/dS>1. Ames test screens mutagens via Salmonella auxotrophs.'
    }},
    { title: 'Genetic Engineering', icon: '\u2702\uFE0F', tryIt: 'crispr', content: {
      'K-2': 'Scientists have learned to edit DNA like editing a story! They use special tools called CRISPR - like tiny scissors - to cut DNA at exactly the right spot. This helps cure diseases, make healthier crops, and even bring back extinct animals someday!',
      '3-5': 'Genetic engineering means changing an organism\u2019s DNA on purpose. CRISPR-Cas9 uses a guide RNA to find the right spot, then Cas9 cuts the DNA. The cell repairs the cut, and scientists can add, remove, or change genes. It\u2019s already being used to treat sickle cell disease!',
      '6-8': 'CRISPR-Cas9: A synthetic guide RNA (sgRNA) directs the Cas9 nuclease to a 20nt target adjacent to a PAM (NGG). The double-strand break is repaired by NHEJ (error-prone, knockouts) or HDR (precise, with donor template). Applications: CASGEVY\u2122 for sickle cell, CAR-T therapy, disease-resistant crops, gene drives.',
      '9-12': 'Beyond Cas9: Cas12a (Cpf1) recognizes T-rich PAMs, staggered cuts. Base editors (CBE/ABE) enable C\u2192T or A\u2192G without DSBs. Prime editing: pegRNA + Cas9 nickase-RT fusion for all 12 substitution types plus small indels. Epigenome editors (dCas9-DNMT3A/TET1/p300) modulate expression without sequence changes. Delivery: AAV, LNPs, RNP electroporation.'
    }}
  ];

  // ── Module-level cleanup tracker ──
  if (!window._dnaCleanup) window._dnaCleanup = {};

  // ═══════════════════════════════════════════════════════
  // Tool Registration
  // ═══════════════════════════════════════════════════════

  window.StemLab.registerTool('dnaLab', {
    icon: '\uD83E\uDDEC',
    label: 'DNA Lab',
    desc: 'Build, replicate, transcribe, translate, mutate, CRISPR-edit, forensics & more.',
    color: 'fuchsia',
    category: 'biology',
    questHooks: [
      { id: 'transcribe', label: 'Transcribe DNA to mRNA', icon: '\uD83E\uDDEC', check: function(d) { return !!(d.mRNA && d.mRNA.length > 0); }, progress: function(d) { return d.mRNA ? 'Done!' : 'Not yet'; } },
      { id: 'translate', label: 'Translate mRNA to protein', icon: '\uD83E\uDDAA', check: function(d) { return (d.protein || []).length >= 1; }, progress: function(d) { return (d.protein || []).length >= 1 ? 'Translated!' : 'Not yet'; } },
      { id: 'mutate', label: 'Create a DNA mutation and observe the effect', icon: '\u26A0\uFE0F', check: function(d) { return d.mutationApplied || false; }, progress: function(d) { return d.mutationApplied ? 'Mutated!' : 'Try mutating'; } },
      { id: 'explore_3_tabs', label: 'Explore 3 DNA lab modes', icon: '\uD83D\uDD2C', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3 modes'; } }
    ],
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
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var toolSnapshots = ctx.toolSnapshots;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;

      var d = (labToolData && labToolData.dnaLab) || {};
      var upd = function(key, val) { setLabToolData(function(prev) { var nd = Object.assign({}, prev.dnaLab || {}); nd[key] = val; return Object.assign({}, prev, { dnaLab: nd }); }); };
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
      function gradeText(k2, g35, g68, g912) { return gradeBand === 'K-2' ? k2 : gradeBand === '3-5' ? g35 : gradeBand === '6-8' ? g68 : g912; }

      // ═══ STATE EXTRACTION ═══
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

      // ═══ DERIVED VALUES ═══
      var complementStrand = dnaSeq.split('').map(function(b) { return BASE_COMPLEMENT[b] || 'N'; }).join('');
      var fullMRNA = dnaSeq.split('').map(function(b) { return DNA_TO_RNA[b] || 'N'; }).join('');

      function translateMRNA(mrna) {
        var result = [];
        var started = false;
        for (var i = 0; i <= mrna.length - 3; i += 3) {
          var codon = mrna.substring(i, i + 3);
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
        var stops = ['TAC', 'ATT', 'ACT'];
        seq += stops[Math.floor(Math.random() * 3)];
        return seq;
      }

      // ═══ BADGE HELPER ═══
      function checkBadge(id) {
        var badges = d.badges || {};
        if (badges[id]) return;
        var nb = Object.assign({}, badges);
        nb[id] = true;
        upd('badges', nb);
        var b = null;
        for (var i = 0; i < DNA_BADGES.length; i++) { if (DNA_BADGES[i].id === id) { b = DNA_BADGES[i]; break; } }
        if (b) addToast(b.icon + ' Badge: ' + b.label + '!', 'success');
        if (typeof stemCelebrate === 'function') stemCelebrate();
      }

      // XP badge check
      if (getStemXP('dnaLab') >= 100) checkBadge('dnaMaster');

      // ═══════════════════════════════════════════
      // CANVAS: DNA Helix (callback ref)
      // ═══════════════════════════════════════════
      var _dnaCanvasRef = function(cv) {
        if (window._dnaCleanup.dnaAnim) { window._dnaCleanup.dnaAnim(); window._dnaCleanup.dnaAnim = null; }
        if (!cv) return;
        if (tab !== 'build' && tab !== 'transcribe') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W / 2, hh = H / 2;
        var _tick = 0;
        var _animId = null;
        var currentAnimStep = animStep;
        var hoveredIndex = -1;

        function draw3DSphere(ctx, x, y, r, baseChar) {
          var baseColor = BASE_COLORS[baseChar] || '#888';
          var darkColor = BASE_DARK_COLORS[baseChar] || '#444';
          var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.3, baseColor);
          grad.addColorStop(1, darkColor);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold ' + Math.max(9, r * 1.2) + 'px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 3;
          ctx.fillText(baseChar, x, y);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        cv.onmousemove = function(e) {
          var rect = cv.getBoundingClientRect();
          var scaleX = cv.width / rect.width / 2;
          var scaleY = cv.height / rect.height / 2;
          var mX = (e.clientX - rect.left) * scaleX;
          var mY = (e.clientY - rect.top) * scaleY;

          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = hh / 2;

          var found = -1;
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * 18;
            var topY = midY - 25 + yOff;
            var bottomY = midY + 25 - yOff;

            var distTop = Math.sqrt((mX - x)*(mX - x) + (mY - topY)*(mY - topY));
            var distBottom = Math.sqrt((mX - x)*(mX - x) + (mY - bottomY)*(mY - bottomY));
            var radius = baseW * 0.38;

            if (distTop <= radius + 5 || distBottom <= radius + 5) {
              found = i;
              break;
            }
          }

          if (found !== hoveredIndex) {
            hoveredIndex = found;
            cv.style.cursor = (found !== -1) ? 'pointer' : '';
          }
        };

        cv.onmouseleave = function() {
          hoveredIndex = -1;
          cv.style.cursor = '';
        };

        cv.onclick = function(e) {
          if (hoveredIndex !== -1) {
            sfxDnaClick();
            var order = 'ATGC';
            var currentBase = dnaSeq[hoveredIndex];
            var next = order[(order.indexOf(currentBase) + 1) % 4];
            var newSeq = dnaSeq.substring(0, hoveredIndex) + next + dnaSeq.substring(hoveredIndex + 1);
            updMulti({ dnaSequence: newSeq, mRNA: '', protein: [], animStep: 0, animPlaying: false });
            announceToSR('Mutated base at position ' + (hoveredIndex + 1) + ' to ' + next);
          }
        };

        function draw() {
          ctx2d.clearRect(0, 0, w, hh);
          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = hh / 2;
          var helixAmp = 18;

          // Draw template strand backbone
          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 2.5;
          ctx2d.shadowColor = 'rgba(148, 163, 184, 0.3)'; ctx2d.shadowBlur = 4;
          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (i === 0) ctx2d.moveTo(x, midY - 25 + yOff); else ctx2d.lineTo(x, midY - 25 + yOff);
          }
          ctx2d.stroke();

          // Draw coding/mRNA strand backbone
          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (tab === 'transcribe' && i < currentAnimStep) continue;
            if (i === 0 || (tab === 'transcribe' && i === currentAnimStep)) ctx2d.moveTo(x, midY + 25 - yOff);
            else ctx2d.lineTo(x, midY + 25 - yOff);
          }
          ctx2d.stroke();
          ctx2d.shadowColor = 'transparent'; ctx2d.shadowBlur = 0;

          // Draw bonds and base spheres
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            var base = dnaSeq[i]; var comp = complementStrand[i];
            var topY = midY - 25 + yOff;
            var bottomY = midY + 25 - yOff;

            // Draw hydrogen bonds
            if (!(tab === 'transcribe' && i < currentAnimStep)) {
              var pulseDashOffset = -_tick * 0.5;
              ctx2d.setLineDash([3, 3]);
              ctx2d.lineDashOffset = pulseDashOffset;
              var isGC = (base === 'G' && comp === 'C') || (base === 'C' && comp === 'G');
              ctx2d.strokeStyle = isGC ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.8)';
              ctx2d.lineWidth = isGC ? 2.5 : 1.5;
              ctx2d.shadowColor = isGC ? '#22c55e' : '#3b82f6';
              ctx2d.shadowBlur = 8;

              var bY = tab === 'transcribe' ? bottomY + 15 : bottomY;
              ctx2d.beginPath();
              ctx2d.moveTo(x, topY + baseW * 0.38);
              ctx2d.lineTo(x, bY - baseW * 0.38);
              ctx2d.stroke();

              ctx2d.shadowColor = 'transparent';
              ctx2d.shadowBlur = 0;
              ctx2d.setLineDash([]);
              ctx2d.lineDashOffset = 0;
            }

            // Draw 3D base spheres
            draw3DSphere(ctx2d, x, topY, baseW * 0.38, base);

            if (tab === 'transcribe' && i < currentAnimStep) {
              var rnaBase = DNA_TO_RNA[base];
              draw3DSphere(ctx2d, x, bottomY + 15, baseW * 0.38, rnaBase);
            } else {
              draw3DSphere(ctx2d, x, bottomY, baseW * 0.38, comp);
            }

            // Draw hover rings
            if (i === hoveredIndex) {
              var pulse = 1 + 0.15 * Math.sin(_tick * 0.15);
              ctx2d.strokeStyle = 'rgba(234, 179, 8, 0.95)';
              ctx2d.lineWidth = 2.5;
              ctx2d.shadowColor = '#eab308';
              ctx2d.shadowBlur = 8;
              
              ctx2d.beginPath();
              ctx2d.arc(x, topY, baseW * 0.38 * pulse, 0, Math.PI * 2);
              ctx2d.stroke();

              if (!(tab === 'transcribe' && i < currentAnimStep)) {
                ctx2d.beginPath();
                ctx2d.arc(x, (tab === 'transcribe' ? bottomY + 15 : bottomY), baseW * 0.38 * pulse, 0, Math.PI * 2);
                ctx2d.stroke();
              }
              ctx2d.shadowColor = 'transparent';
              ctx2d.shadowBlur = 0;
            }

            // Draw RNA Polymerase
            if (tab === 'transcribe' && i === currentAnimStep && currentAnimStep < dnaSeq.length) {
              ctx2d.fillStyle = 'rgba(168, 85, 247, 0.15)';
              ctx2d.strokeStyle = 'rgba(168, 85, 247, 0.4)';
              ctx2d.lineWidth = 1.5;
              ctx2d.beginPath(); ctx2d.arc(x, midY, baseW * 1.6, 0, Math.PI * 2); ctx2d.fill(); ctx2d.stroke();
              ctx2d.fillStyle = '#a855f7'; ctx2d.font = 'bold 9px sans-serif';
              ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
              ctx2d.fillText('RNA Pol', x, midY - baseW * 1.9);
            }
          }

          ctx2d.fillStyle = '#475569'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
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

      // ═══ Transcription timer ═══
      if (tab === 'transcribe' && animPlaying) {
        if (animStep >= dnaSeq.length) {
          updMulti({ animPlaying: false, mRNA: fullMRNA });
          announceToSR('Transcription complete. mRNA: ' + fullMRNA);
          awardStemXP('dnaLab', 10, 'Completed transcription');
          checkBadge('messenger');
        } else {
          if (window._dnaCleanup.transcribeTimer) clearTimeout(window._dnaCleanup.transcribeTimer);
          window._dnaCleanup.transcribeTimer = setTimeout(function() {
            updMulti({ animStep: animStep + 1, mRNA: fullMRNA.substring(0, animStep + 1) });
          }, 600 / speed);
        }
      }

      // ═══════════════════════════════════════════
      // CANVAS: Replication Fork (callback ref)
      // ═══════════════════════════════════════════
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
        var w = W / 2, h2 = H / 2;
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
            var x = startX + i * baseW + baseW / 2;
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

      // ═══════════════════════════════════════════
      // CANVAS: Translation (callback ref)
      // ═══════════════════════════════════════════
      var _translationCanvasRef = function(cv) {
        if (window._dnaCleanup.transAnim) { window._dnaCleanup.transAnim(); window._dnaCleanup.transAnim = null; }
        if (!cv) return;
        if (tab !== 'translate') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W / 2, hh = H / 2;
        var _tick = 0;
        var _animId = null;

        var lastStep = -1;
        var stepStartTime = Date.now();

        function drawTRNA(ctx, x, y, anticodon, aaChar, hasAA, alpha) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 4;
          
          // Cloverleaf structure
          ctx.beginPath();
          ctx.moveTo(x, y - 15); ctx.lineTo(x, y);
          ctx.arc(x - 9, y - 8, 4, 0, Math.PI * 2);
          ctx.arc(x + 9, y - 8, 4, 0, Math.PI * 2);
          ctx.arc(x, y + 8, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          if (anticodon) {
            ctx.fillStyle = '#bae6fd';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(anticodon, x, y + 8);
          }

          if (hasAA && aaChar) {
            var aaColor = (AA_PROPS[aaChar] && AA_PROPS[aaChar].color) || '#cbd5e1';
            var r = 6;
            var grad = ctx.createRadialGradient(x - r*0.3, y - 20 - r*0.3, r*0.1, x, y - 20, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, aaColor);
            grad.addColorStop(1, '#222');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y - 20, r, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 6px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((AA_PROPS[aaChar] && AA_PROPS[aaChar].abbr) || aaChar.substring(0,1), x, y - 20);
          }
          ctx.restore();
        }

        function drawTrans() {
          ctx2d.clearRect(0, 0, w, hh);

          // Track step duration & progress
          var duration = 800 / speed;
          if (transStep !== lastStep) {
            lastStep = transStep;
            stepStartTime = Date.now();
          }
          var pct = transPlaying ? Math.min(1, (Date.now() - stepStartTime) / duration) : 0;

          var midY = hh / 2 + 10;
          var yChannel = midY + 15;

          // ─── 1. DRAW RIBOSOME ENVELOPE ───
          ctx2d.shadowColor = 'rgba(16, 185, 129, 0.2)';
          ctx2d.shadowBlur = 10;

          // Large Subunit (top green dome)
          ctx2d.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx2d.strokeStyle = 'rgba(16, 185, 129, 0.6)';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          ctx2d.moveTo(w / 2 - 90, yChannel - 5);
          ctx2d.bezierCurveTo(w / 2 - 90, yChannel - 85, w / 2 + 90, yChannel - 85, w / 2 + 90, yChannel - 5);
          ctx2d.closePath();
          ctx2d.fill();
          ctx2d.stroke();

          // Small Subunit (bottom green capsule)
          ctx2d.fillStyle = 'rgba(52, 211, 153, 0.15)';
          ctx2d.strokeStyle = 'rgba(52, 211, 153, 0.6)';
          ctx2d.beginPath();
          ctx2d.roundRect(w / 2 - 80, yChannel + 5, 160, 30, 10);
          ctx2d.fill();
          ctx2d.stroke();
          ctx2d.shadowBlur = 0;

          // E, P, A Site Boxes
          var xP = w / 2;
          var xE = w / 2 - 45;
          var xA = w / 2 + 45;

          ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx2d.lineWidth = 1;
          ctx2d.setLineDash([2, 2]);
          [xE, xP, xA].forEach(function(slotX) {
            ctx2d.strokeRect(slotX - 15, yChannel - 50, 30, 45);
          });
          ctx2d.setLineDash([]);

          // EPA Labels
          ctx2d.fillStyle = 'rgba(16, 185, 129, 0.8)';
          ctx2d.font = 'bold 9px sans-serif';
          ctx2d.textAlign = 'center';
          ctx2d.fillText('E', xE, yChannel - 55);
          ctx2d.fillText('P', xP, yChannel - 55);
          ctx2d.fillText('A', xA, yChannel - 55);

          // ─── 2. DRAW mRNA STRAND ───
          // Draw mRNA backbone
          ctx2d.strokeStyle = '#a855f7';
          ctx2d.lineWidth = 3;
          ctx2d.beginPath();
          ctx2d.moveTo(0, yChannel + 15);
          ctx2d.lineTo(w, yChannel + 15);
          ctx2d.stroke();

          var codonW = 42;
          var startX = w / 2; // P-site align

          var codons = (fullMRNA.match(/.{1,3}/g) || []);
          codons.forEach(function(codon, idx) {
            // codon horizontal center
            var cx = startX + (idx - transStep - pct) * codonW;
            if (cx < -40 || cx > w + 40) return;

            // Draw 3 bases inside the codon
            for (var b = 0; b < 3; b++) {
              var baseChar = codon[b];
              var bx = cx - 12 + b * 12;
              var baseColor = BASE_COLORS[baseChar] || '#888';

              // Draw base dot
              ctx2d.fillStyle = baseColor;
              ctx2d.beginPath();
              ctx2d.arc(bx, yChannel + 15, 4.5, 0, Math.PI * 2);
              ctx2d.fill();

              // Draw base label
              ctx2d.fillStyle = '#fff';
              ctx2d.font = 'bold 6px monospace';
              ctx2d.fillText(baseChar, bx, yChannel + 15);
            }

            // Codon boundary bracket
            ctx2d.strokeStyle = 'rgba(168, 85, 247, 0.3)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(cx - 16, yChannel + 22);
            ctx2d.lineTo(cx - 16, yChannel + 25);
            ctx2d.lineTo(cx + 16, yChannel + 25);
            ctx2d.lineTo(cx + 16, yChannel + 22);
            ctx2d.stroke();

            ctx2d.fillStyle = 'rgba(168, 85, 247, 0.7)';
            ctx2d.font = 'bold 7px sans-serif';
            ctx2d.fillText(codon, cx, yChannel + 32);
          });

          // ─── 3. DRAW ANIMATING tRNAs & POLYPEPTIDE CHAIN ───
          // tRNA 1: Exiting E-site
          if (transStep > 0) {
            var t1Codon = codons[transStep - 1];
            var compMap = { 'A':'U', 'U':'A', 'G':'C', 'C':'G' };
            var t1Anti = t1Codon ? t1Codon.split('').map(function(c) { return compMap[c] || 'U'; }).join('') : '';

            var t1X = xE - pct * 35;
            var t1Y = (yChannel - 20) - pct * 60;
            var t1Alpha = Math.max(0, 1 - pct * 1.5);
            drawTRNA(ctx2d, t1X, t1Y, t1Anti, null, false, t1Alpha);
          }

          // tRNA 2: P-site shifting to E-site
          var t2Codon = transStep > 0 ? codons[transStep - 1] : null;
          if (t2Codon) {
            var compMap = { 'A':'U', 'U':'A', 'G':'C', 'C':'G' };
            var t2Anti = t2Codon.split('').map(function(c) { return compMap[c] || 'U'; }).join('');
            var t2X = xP - pct * codonW;
            var t2Y = yChannel - 20;
            var t2AA = CODON_TABLE[t2Codon];
            var t2HasAA = pct < 0.4;
            drawTRNA(ctx2d, t2X, t2Y, t2Anti, t2AA, t2HasAA, 1);
          }

          // tRNA 3: Incoming A-site landing & shifting to P-site
          var t3Codon = transStep < codons.length ? codons[transStep] : null;
          if (t3Codon && transPlaying) {
            var compMap = { 'A':'U', 'U':'A', 'G':'C', 'C':'G' };
            var t3Anti = t3Codon.split('').map(function(c) { return compMap[c] || 'U'; }).join('');
            
            var t3X = xA - pct * codonW;
            var t3Y = yChannel - 20;
            if (pct < 0.5) {
              var f = (0.5 - pct) * 2;
              t3Y = (yChannel - 20) + f * 50;
            }
            var t3AA = CODON_TABLE[t3Codon];
            drawTRNA(ctx2d, t3X, t3Y, t3Anti, t3AA, true, 1);
          }

          // ─── 4. DRAW GROWING POLYPEPTIDE CHAIN ───
          if (builtProtein.length > 0) {
            var anchorX, anchorY;
            if (pct < 0.4) {
              anchorX = xP - pct * codonW;
              anchorY = yChannel - 40;
            } else {
              var t3X = xA - pct * codonW;
              var t3Y = yChannel - 20;
              if (pct < 0.5) {
                var f = (0.5 - pct) * 2;
                t3Y = (yChannel - 20) + f * 50;
              }
              anchorX = t3X;
              anchorY = t3Y - 20;
            }

            ctx2d.strokeStyle = '#94a3b8';
            ctx2d.lineWidth = 1.5;
            
            var prevX = anchorX;
            var prevY = anchorY;

            for (var k = builtProtein.length - 1; k >= 0; k--) {
              var aaData = builtProtein[k];
              var aaChar = aaData.aa;
              var depth = builtProtein.length - 1 - k;

              var sx = anchorX + Math.sin(_tick * 0.06 + depth * 0.5) * 5;
              var sy = anchorY - 14 - depth * 12;

              ctx2d.beginPath();
              ctx2d.moveTo(prevX, prevY);
              ctx2d.lineTo(sx, sy);
              ctx2d.stroke();

              var aaColor = (AA_PROPS[aaChar] && AA_PROPS[aaChar].color) || '#cbd5e1';
              var r = 5.5;
              var grad = ctx2d.createRadialGradient(sx - r*0.3, sy - r*0.3, r*0.1, sx, sy, r);
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.3, aaColor);
              grad.addColorStop(1, '#222');

              ctx2d.fillStyle = grad;
              ctx2d.beginPath();
              ctx2d.arc(sx, sy, r, 0, Math.PI * 2);
              ctx2d.fill();

              ctx2d.fillStyle = '#ffffff';
              ctx2d.font = 'bold 5px sans-serif';
              ctx2d.fillText((AA_PROPS[aaChar] && AA_PROPS[aaChar].abbr) || aaChar.substring(0,1), sx, sy);

              prevX = sx;
              prevY = sy;
            }
          }

          _tick++;
          _animId = requestAnimationFrame(drawTrans);
        }

        drawTrans();
        window._dnaCleanup.transAnim = function() { if (_animId) cancelAnimationFrame(_animId); };
      };

      // ═══ Replication timer ═══
      if (tab === 'replicate' && replPlaying) {
        if (replStep >= dnaSeq.length) {
          updMulti({ replPlaying: false });
          announceToSR('DNA replication complete! Two identical copies created.');
          awardStemXP('dnaLab', 15, 'Completed DNA replication');
          addToast('\uD83E\uDDEC Replication complete! Two daughter strands formed.', 'success');
          if (typeof stemCelebrate === 'function') stemCelebrate();
          checkBadge('copyMachine');
          if (speed >= 4) checkBadge('speedDemon');
        } else {
          if (window._dnaCleanup.replTimer) clearTimeout(window._dnaCleanup.replTimer);
          window._dnaCleanup.replTimer = setTimeout(function() {
            upd('replStep', replStep + 1);
          }, 500 / speed);
        }
      }

      // ═══ Translation state + timer ═══
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
            checkBadge('ribosomePro');
          } else {
            if (window._dnaCleanup.transTimer) clearTimeout(window._dnaCleanup.transTimer);
            window._dnaCleanup.transTimer = setTimeout(function() {
              updMulti({ transStep: transStep + 1, builtProtein: builtProtein.concat([{ codon: tCodon, aa: tAA, pos: tPos }]) });
              announceToSR('Codon ' + tCodon + ' = ' + (AA_PROPS[tAA] ? AA_PROPS[tAA].full : tAA));
            }, 800 / speed);
          }
        }
      }

      // ═══ CHALLENGE HELPERS ═══
      var challengeTier = d.challengeTier || 0;

      function generateChallenge() {
        var tierQs = CHALLENGE_QS.filter(function(q) { return q.tier === challengeTier; });
        var q = tierQs[Math.floor(Math.random() * tierQs.length)];
        updMulti({ challengeQ: { type: 'static', question: q.q, answer: q.a, hint: q.h }, challengeAnswer: '', challengeFeedback: '' });
        announceToSR('Challenge: ' + q.q);
      }

      function checkChallenge() {
        if (!challengeQ || !challengeAnswer) return;
        var answers = challengeQ.answer.split(',');
        var correct = answers.some(function(a) { return challengeAnswer.trim().toUpperCase() === a.trim().toUpperCase(); });
        if (correct) {
          var newStreak = (d.challengeStreak || 0) + 1;
          var bonus = newStreak >= 3 ? 5 : 0;
          updMulti({ challengeFeedback: '\u2705 Correct!' + (bonus ? ' (+' + bonus + ' streak bonus!)' : ''), score: score + 10 + bonus, challengeStreak: newStreak });
          awardStemXP('dnaLab', 10, 'Challenge correct');
          announceToSR('Correct!'); if (typeof stemCelebrate === 'function') stemCelebrate();
          if (score + 10 >= 50) checkBadge('quizWhiz');
          if (newStreak >= 5) checkBadge('streakMaster');
        } else {
          updMulti({ challengeFeedback: '\u274c The answer is ' + answers[0] + '. ' + (challengeQ.hint || ''), challengeStreak: 0 });
          announceToSR('Incorrect. Answer: ' + answers[0]);
        }
      }

      // ═══ MUTATION HELPERS ═══
      function applyMutation(type) {
        var bases = 'ATGC'; var seq = dnaSeq.split('');
        var pos = Math.floor(Math.random() * (seq.length - 6)) + 3;
        var original = seq[pos]; var mutated;
        var newLog = (d.mutationLog || []).slice();
        if (type === 'substitution') {
          do { mutated = bases[Math.floor(Math.random() * 4)]; } while (mutated === original);
          seq[pos] = mutated;
          newLog.push({ type: 'Substitution', pos: pos, from: original, to: mutated });
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: newLog });
          addToast('\uD83E\uDDEC Substitution at pos ' + (pos + 1) + ': ' + original + ' \u2192 ' + mutated, 'success');
        } else if (type === 'insertion') {
          mutated = bases[Math.floor(Math.random() * 4)];
          seq.splice(pos, 0, mutated);
          newLog.push({ type: 'Insertion', pos: pos, to: mutated });
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: newLog });
          addToast('\uD83E\uDDEC Insertion at pos ' + (pos + 1) + ': +' + mutated, 'success');
        } else {
          var removed = seq.splice(pos, 1)[0];
          newLog.push({ type: 'Deletion', pos: pos, from: removed });
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: newLog });
          addToast('\uD83E\uDDEC Deletion at pos ' + (pos + 1) + ': -' + removed, 'success');
        }
        awardStemXP('dnaLab', 3, 'Applied ' + type + ' mutation');
        if (newLog.length >= 5) checkBadge('mutantMaker');
      }

      // ═══ CRISPR HELPERS ═══
      var crisprPhase = d.crisprPhase || 'design';
      var crisprScanPos = d.crisprScanPos || 0;
      var crisprGuideLen = 6;
      var crisprRepairType = d.crisprRepairType || '';
      var crisprEditLog = d.crisprEditLog || [];

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
        checkBadge('geneEditor');
      }

      // CRISPR scanning timer
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

      // ═══════════════════════════════════════════
      // CANVAS: CRISPR (callback ref)
      // ═══════════════════════════════════════════
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

        var lastPhase = '';
        var phaseStartTime = Date.now();

        function drawCRISPR() {
          ctx2d.clearRect(0, 0, w, h2);
          var baseW = Math.min(24, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = h2 / 2 - 5;

          if (crisprPhase !== lastPhase) {
            lastPhase = crisprPhase;
            phaseStartTime = Date.now();
          }
          var elapsed = Date.now() - phaseStartTime;

          var cutSite = selectedPAMSite ? selectedPAMSite.cutSite : 0;
          
          // Calculate cut split displacement
          var displacement = 0;
          if (crisprPhase === 'cut') {
            var cutPct = Math.min(1, elapsed / 800);
            displacement = 22 * cutPct;
          } else if (crisprPhase === 'done') {
            var repairPct = Math.min(1, elapsed / 1200);
            displacement = 22 * (1 - repairPct);
          }

          ctx2d.fillStyle = '#e2e8f0'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'top';
          ctx2d.fillText('CRISPR-Cas9 Gene Editor', 10, 10);

          // Draw DNA template & coding backbones in two broken segments
          ctx2d.strokeStyle = '#94a3b8';
          ctx2d.lineWidth = 2.5;

          // Segment 1 (Left of cut site)
          ctx2d.beginPath();
          for (var i = 0; i < cutSite; i++) {
            var x = startX + i * baseW + baseW / 2 - displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === 0) ctx2d.moveTo(x, midY - 16 + yOff); else ctx2d.lineTo(x, midY - 16 + yOff);
          }
          ctx2d.stroke();

          ctx2d.beginPath();
          for (var i = 0; i < cutSite; i++) {
            var x = startX + i * baseW + baseW / 2 - displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === 0) ctx2d.moveTo(x, midY + 16 - yOff); else ctx2d.lineTo(x, midY + 16 - yOff);
          }
          ctx2d.stroke();

          // Segment 2 (Right of cut site)
          ctx2d.beginPath();
          for (var i = cutSite; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2 + displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === cutSite) ctx2d.moveTo(x, midY - 16 + yOff); else ctx2d.lineTo(x, midY - 16 + yOff);
          }
          ctx2d.stroke();

          ctx2d.beginPath();
          for (var i = cutSite; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2 + displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === cutSite) ctx2d.moveTo(x, midY + 16 - yOff); else ctx2d.lineTo(x, midY + 16 - yOff);
          }
          ctx2d.stroke();

          // Draw bases
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2 + (i < cutSite ? -displacement : displacement);
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            var base = dnaSeq[i];
            var comp = complementStrand[i];

            var isPAM = selectedPAMSite && (i >= selectedPAMSite.pamStart && i < selectedPAMSite.pamStart + 3);
            var isGuide = selectedPAMSite && (i >= selectedPAMSite.cutSite - crisprGuideLen && i < selectedPAMSite.cutSite);
            var isCutSite = selectedPAMSite && i === selectedPAMSite.cutSite;

            // Highlight PAM and Guide regions
            if (isPAM) {
              ctx2d.fillStyle = 'rgba(239, 68, 68, 0.08)';
              ctx2d.fillRect(x - baseW / 2, midY - 26 + yOff, baseW, 52);
            } else if (isGuide) {
              ctx2d.fillStyle = 'rgba(59, 130, 246, 0.06)';
              ctx2d.fillRect(x - baseW / 2, midY - 26 + yOff, baseW, 52);
            }

            // Hydrogen bonds
            if (!(crisprPhase === 'cut' && isCutSite)) {
              ctx2d.setLineDash([2, 2]);
              ctx2d.strokeStyle = 'rgba(148, 163, 184, 0.3)';
              ctx2d.beginPath();
              ctx2d.moveTo(x, midY - 16 + yOff + baseW * 0.35);
              ctx2d.lineTo(x, midY + 16 - yOff - baseW * 0.35);
              ctx2d.stroke();
              ctx2d.setLineDash([]);
            }

            // NHEJ Flashing mutation at cut site during done animation
            var isNHEJFlashing = (crisprPhase === 'done' && crisprRepairType === 'nhej' && elapsed >= 400 && elapsed < 1000 && i === cutSite);

            if (isNHEJFlashing) {
              var flashBases = ['A', 'T', 'G', 'C'];
              base = flashBases[Math.floor(_tick / 4) % 4];
              comp = BASE_COMPLEMENT[base] || 'A';
              ctx2d.fillStyle = '#f59e0b';
            } else {
              ctx2d.fillStyle = isPAM ? '#ef4444' : isGuide ? '#3b82f6' : (BASE_COLORS[base] || '#888');
            }

            // Draw 3D Base Spheres
            var r = baseW * 0.35;
            var baseColor = ctx2d.fillStyle;
            var darkColor = isNHEJFlashing ? '#b45309' : (isPAM ? '#991b1b' : isGuide ? '#1e3a8a' : (BASE_DARK_COLORS[dnaSeq[i]] || '#444'));

            // Top sphere
            var gradTop = ctx2d.createRadialGradient(x - r*0.3, midY - 16 + yOff - r*0.3, r*0.1, x, midY - 16 + yOff, r);
            gradTop.addColorStop(0, '#ffffff');
            gradTop.addColorStop(0.3, baseColor);
            gradTop.addColorStop(1, darkColor);
            ctx2d.fillStyle = gradTop;
            ctx2d.beginPath(); ctx2d.arc(x, midY - 16 + yOff, r, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff'; ctx2d.font = 'bold ' + Math.max(7, baseW * 0.45) + 'px monospace'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
            ctx2d.fillText(base, x, midY - 16 + yOff);

            // Bottom sphere
            if (isNHEJFlashing) {
              ctx2d.fillStyle = '#f59e0b';
            } else {
              ctx2d.fillStyle = isPAM ? '#ef4444' : isGuide ? '#3b82f6' : (BASE_COLORS[comp] || '#888');
            }
            var compColor = ctx2d.fillStyle;
            var compDarkColor = isNHEJFlashing ? '#b45309' : (isPAM ? '#991b1b' : isGuide ? '#1e3a8a' : (BASE_DARK_COLORS[complementStrand[i]] || '#444'));

            var gradBot = ctx2d.createRadialGradient(x - r*0.3, midY + 16 - yOff - r*0.3, r*0.1, x, midY + 16 - yOff, r);
            gradBot.addColorStop(0, '#ffffff');
            gradBot.addColorStop(0.3, compColor);
            gradBot.addColorStop(1, compDarkColor);
            ctx2d.fillStyle = gradBot;
            ctx2d.beginPath(); ctx2d.arc(x, midY + 16 - yOff, r, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff';
            ctx2d.fillText(comp, x, midY + 16 - yOff);

            // Scissor line during cut phase
            if (crisprPhase === 'cut' && isCutSite) {
              ctx2d.strokeStyle = '#ef4444'; ctx2d.lineWidth = 1.5;
              ctx2d.setLineDash([3, 2]);
              ctx2d.beginPath(); ctx2d.moveTo(x, midY - 32 + yOff); ctx2d.lineTo(x, midY + 32 - yOff); ctx2d.stroke();
              ctx2d.setLineDash([]);
              ctx2d.fillStyle = '#ef4444'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('\u2702 CUT', x, midY - 36 + yOff);
            }
          }

          // ─── GUIDE RNA DOCKING ───
          if (selectedPAMSite && (crisprPhase === 'scanning' || crisprPhase === 'cut')) {
            // Draw Guide RNA backbone
            ctx2d.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx2d.lineWidth = 1.5;
            ctx2d.shadowColor = '#3b82f6';
            ctx2d.shadowBlur = 6;
            ctx2d.beginPath();
            var first = true;
            for (var i = selectedPAMSite.cutSite - crisprGuideLen; i < selectedPAMSite.cutSite; i++) {
              var x = startX + i * baseW + baseW / 2 + (i < cutSite ? -displacement : displacement);
              var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
              var gy = midY - 4 + yOff;
              if (first) { ctx2d.moveTo(x, gy); first = false; }
              else ctx2d.lineTo(x, gy);
            }
            ctx2d.stroke();
            ctx2d.shadowBlur = 0;

            // Draw gRNA bases
            for (var i = selectedPAMSite.cutSite - crisprGuideLen; i < selectedPAMSite.cutSite; i++) {
              var x = startX + i * baseW + baseW / 2 + (i < cutSite ? -displacement : displacement);
              var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
              var gy = midY - 4 + yOff;
              var rnaBase = DNA_TO_RNA[dnaSeq[i]];

              ctx2d.fillStyle = 'rgba(59, 130, 246, 0.95)';
              ctx2d.beginPath();
              ctx2d.arc(x, gy, baseW * 0.22, 0, Math.PI * 2);
              ctx2d.fill();

              ctx2d.fillStyle = '#fff';
              ctx2d.font = 'bold 5px monospace';
              ctx2d.fillText(rnaBase, x, gy);
            }
          }

          // ─── CAS9 ENVELOPE MOLECULAR GRAPHICS ───
          var cas9Pos = crisprPhase === 'scanning' ? crisprScanPos : (selectedPAMSite ? selectedPAMSite.cutSite : 0);
          if (crisprPhase === 'scanning' || crisprPhase === 'cut') {
            var cas9X = startX + cas9Pos * baseW + baseW / 2;
            var cas9Y = midY;
            var lobeR = baseW * 2.8;

            ctx2d.fillStyle = 'rgba(139, 92, 246, 0.12)';
            ctx2d.strokeStyle = 'rgba(139, 92, 246, 0.6)';
            ctx2d.lineWidth = 1.5;
            ctx2d.beginPath();
            ctx2d.ellipse(cas9X - baseW * 0.8, cas9Y, lobeR, 28, 0, 0, Math.PI * 2);
            ctx2d.ellipse(cas9X + baseW * 0.8, cas9Y, lobeR, 28, 0, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.stroke();

            ctx2d.fillStyle = '#8b5cf6'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'center';
            ctx2d.fillText('Cas9 Protein Lobe', cas9X, cas9Y - 33);
            
            if (crisprPhase === 'cut') {
              ctx2d.fillStyle = '#2563eb'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('gRNA guide', cas9X - baseW * 1.8, cas9Y + 36);
            }
          }

          // ─── CLEAVAGE PARTICLE SPRAY ───
          if (crisprPhase === 'cut' && elapsed < 1200) {
            var xL = startX + (cutSite - 1) * baseW + baseW / 2 - displacement;
            var xR = startX + cutSite * baseW + baseW / 2 + displacement;
            var xMid = (xL + xR) / 2;
            var yMid = midY + Math.sin(((cutSite - 0.5) * 0.4) + _tick * 0.015) * 10;

            ctx2d.fillStyle = 'rgba(245, 158, 11, 0.9)';
            for (var p = 0; p < 12; p++) {
              var angle = (p / 12) * Math.PI * 2 + _tick * 0.03;
              var speedDist = 12 + 28 * Math.sin(p * 55.7) * (elapsed / 1200);
              var px = xMid + Math.cos(angle) * speedDist;
              var py = yMid + Math.sin(angle) * speedDist;
              var size = Math.max(1, 2.5 * (1 - elapsed / 1200));
              ctx2d.beginPath();
              ctx2d.arc(px, py, size, 0, Math.PI * 2);
              ctx2d.fill();
            }
          }

          // ─── HDR DONOR DNA TEMPLATE FLOATING ───
          if (crisprPhase === 'done' && crisprRepairType === 'hdr') {
            var repairPct = Math.min(1, elapsed / 1200);
            if (repairPct < 0.5) {
              var dy = 10 + (repairPct / 0.5) * (midY - 10);
              var donorX = startX + cutSite * baseW + baseW / 2;
              
              ctx2d.strokeStyle = 'rgba(234, 179, 8, 0.8)';
              ctx2d.lineWidth = 1.5;
              ctx2d.setLineDash([2, 2]);
              ctx2d.strokeRect(donorX - 16, dy - 20, 32, 40);
              ctx2d.setLineDash([]);
              
              ctx2d.fillStyle = '#eab308';
              ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('Donor DNA Template', donorX, dy - 24);
            }

            // HDR Suture Glow
            if (repairPct >= 0.5 && repairPct < 0.9) {
              var glowX = startX + cutSite * baseW + baseW / 2;
              var glowYOff = Math.sin((cutSite * 0.4) + _tick * 0.015) * 10;
              ctx2d.strokeStyle = 'rgba(234, 179, 8, ' + (1 - (repairPct - 0.5) / 0.4) + ')';
              ctx2d.lineWidth = 3.5;
              ctx2d.shadowColor = '#eab308';
              ctx2d.shadowBlur = 12;
              ctx2d.strokeRect(glowX - 18, midY - 26 + glowYOff, 36, 52);
              ctx2d.shadowBlur = 0;
            }
          }

          ctx2d.font = 'bold 8px sans-serif'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
          ctx2d.fillStyle = '#3b82f6'; ctx2d.fillText('\u25CF Guide RNA target', 10, h2 - 25);
          ctx2d.fillStyle = '#ef4444'; ctx2d.fillText('\u25CF PAM site (NGG)', 10, h2 - 13);
          ctx2d.fillStyle = '#8b5cf6'; ctx2d.fillText('\u25CF Cas9 protein', w - 90, h2 - 25);

          _tick++;
          _animId = requestAnimationFrame(drawCRISPR);
        }
        drawCRISPR();
        window._dnaCleanup.crisprAnim = function() { if (_animId) cancelAnimationFrame(_animId); };
      };

      // ═══ FORENSICS HELPERS ═══
      var forensicCase = d.forensicCase || 0;
      var forensicGelRun = !!d.forensicGelRun;
      var forensicGuess = d.forensicGuess;
      var forensicResult = d.forensicResult || null;
      var forensicSolved = d.forensicSolved || 0;
      var currentCase = FORENSIC_CASES[forensicCase] || FORENSIC_CASES[0];

      function bandY(size) {
        var logMin = Math.log(80), logMax = Math.log(850);
        var logSize = Math.log(Math.max(80, Math.min(850, size)));
        return 35 + 180 * (logMax - logSize) / (logMax - logMin);
      }

      var _forensicCanvasRef = function(cv) {
        if (window._dnaCleanup.forensicAnim) { window._dnaCleanup.forensicAnim(); window._dnaCleanup.forensicAnim = null; }
        if (!cv) return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var W = cv.width = cv.offsetWidth * 2;
        var H = cv.height = cv.offsetHeight * 2;
        ctx2d.scale(2, 2);
        var w = W / 2, h2 = H / 2;
        var _tick = 0; var _animId = null;
        var start = Date.now();

        function drawForensics() {
          ctx2d.clearRect(0, 0, w, h2);
          
          var progress = Math.min(1, (Date.now() - start) / 3000); // 3 seconds migration duration

          // Gel background (high-contrast dark indigo)
          ctx2d.fillStyle = '#0c1322';
          ctx2d.beginPath();
          ctx2d.roundRect(15, 10, w - 30, h2 - 20, 8);
          ctx2d.fill();
          ctx2d.strokeStyle = 'rgba(56, 189, 248, 0.3)';
          ctx2d.lineWidth = 1.5;
          ctx2d.stroke();

          // Electrode labels
          ctx2d.font = 'bold 7px sans-serif';
          ctx2d.textAlign = 'center';
          ctx2d.textBaseline = 'middle';
          ctx2d.fillStyle = '#ef4444';
          ctx2d.fillText('- (cathode)', w / 2, 6);
          ctx2d.fillStyle = '#22c55e';
          ctx2d.fillText('+ (anode)', w / 2, h2 - 6);

          var wellY = 18;

          // Draw wells (sample loading slots)
          ctx2d.fillStyle = '#1e293b';
          [25, 68, 148, 228, 308].forEach(function(wx) {
            ctx2d.fillRect(wx, wellY, 24, 5);
          });

          // Draw Ladder label
          ctx2d.fillStyle = '#64748b';
          ctx2d.font = 'bold 6.5px sans-serif';
          ctx2d.fillText('Ladder', 37, 13);

          // Draw Ladder bands
          var ladderSizes = [100, 200, 300, 400, 500, 600, 700];
          ladderSizes.forEach(function(size) {
            var finalY = bandY(size);
            var logMin = Math.log(80), logMax = Math.log(850);
            var logSize = Math.log(size);
            var speedFactor = 1.8 - (logSize - logMin) / (logMax - logMin);
            var currentY = wellY + (finalY - wellY) * Math.min(1, progress * speedFactor);

            ctx2d.fillStyle = 'rgba(245, 158, 11, 0.9)';
            ctx2d.beginPath();
            ctx2d.roundRect(28, currentY, 18, 2.5, 0.5);
            ctx2d.fill();

            // Label text
            ctx2d.fillStyle = '#64748b';
            ctx2d.font = '5px sans-serif';
            ctx2d.textAlign = 'left';
            ctx2d.fillText(size + 'bp', 50, currentY + 1.25);
          });

          // Draw Sample lanes
          currentCase.samples.forEach(function(s, si) {
            var laneX = 80 + si * 80;

            // Lane label text
            ctx2d.fillStyle = s.isRef ? '#22d3ee' : '#94a3b8';
            ctx2d.font = 'bold 6.5px sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText(s.label, laneX, 13);

            s.fragments.forEach(function(frag) {
              var finalY = bandY(frag);
              var logMin = Math.log(80), logMax = Math.log(850);
              var logSize = Math.log(frag);
              var speedFactor = 1.8 - (logSize - logMin) / (logMax - logMin);
              var currentY = wellY + (finalY - wellY) * Math.min(1, progress * speedFactor);

              ctx2d.fillStyle = s.isRef ? '#22d3ee' : '#3b82f6';
              ctx2d.shadowColor = s.isRef ? '#22d3ee' : '#3b82f6';
              ctx2d.shadowBlur = 4;
              ctx2d.beginPath();
              ctx2d.roundRect(laneX - 10, currentY, 20, 2.5, 0.5);
              ctx2d.fill();
              ctx2d.shadowBlur = 0;
            });
          });

          // Draw rising bubbles in gel lanes
          if (progress < 1) {
            ctx2d.fillStyle = 'rgba(255, 255, 255, 0.25)';
            for (var b = 0; b < 24; b++) {
              var laneIdx = b % 5;
              var bx = (laneIdx === 0 ? 37 : 80 + (laneIdx - 1) * 80);
              var bOffset = Math.sin(b * 12.7 + _tick * 0.08) * 6;
              var by = h2 - 12 - ((_tick * 1.5 + b * 15) % (h2 - 24));
              var radius = 0.8 + (b % 3) * 0.4;
              
              ctx2d.beginPath();
              ctx2d.arc(bx + bOffset, by, radius, 0, Math.PI * 2);
              ctx2d.fill();
            }
          }

          _tick++;
          _animId = requestAnimationFrame(drawForensics);
        }

        drawForensics();
        window._dnaCleanup.forensicAnim = function() { if (_animId) cancelAnimationFrame(_animId); };
      };

      function checkForensicAnswer() {
        if (forensicGuess == null) return;
        var correct = forensicGuess === currentCase.match;
        if (correct) {
          var ns = forensicSolved + 1;
          updMulti({ forensicResult: 'correct', forensicSolved: ns });
          addToast('\u2705 Correct! DNA match confirmed!', 'success');
          awardStemXP('dnaLab', 15, 'Solved forensics case');
          if (typeof stemCelebrate === 'function') stemCelebrate();
          checkBadge('csiGenetics');
        } else {
          updMulti({ forensicResult: 'wrong' });
          addToast('\u274c Not a match. Look at the banding pattern more carefully.', 'error');
        }
      }

      // ═══ BATTLE HELPERS ═══
      var battleRound = d.battleRound || 0;
      var battlePlayerHP = d.battlePlayerHP != null ? d.battlePlayerHP : 100;
      var battleEnemyHP = d.battleEnemyHP != null ? d.battleEnemyHP : 100;
      var battleOrder = d.battleOrder || [];
      var battleAnswer = d.battleAnswer || '';
      var battleFeedback = d.battleFeedback || '';
      var battleDone = !!d.battleDone;
      var battleWon = !!d.battleWon;
      var battleUseAI = !!d.battleUseAI;
      var battleAIQ = d.battleAIQ || null; // current AI-generated question

      function startBattle(useAI) {
        var order = [];
        for (var i = 0; i < BATTLE_QS.length; i++) order.push(i);
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }
        updMulti({ battleRound: 0, battlePlayerHP: 100, battleEnemyHP: 100, battleOrder: order, battleAnswer: '', battleFeedback: '', battleDone: false, battleWon: false, battleUseAI: !!useAI, battleAIQ: null, battleAILoading: false });
        if (useAI) generateBattleAIQ(0);
      }

      function generateBattleAIQ(round) {
        if (!callGemini) return;
        upd('battleAILoading', true);
        var gradeCtx = gradeText('kindergarten (ages 5-7), very simple', '3rd-5th grade', '6th-8th grade', '9th-12th grade AP Biology');
        var prompt = 'Generate a genetics/DNA battle quiz question (round ' + (round + 1) + '/10) for ' + gradeCtx + ' students. Make it exciting and varied. Topics: DNA structure, replication, transcription, translation, mutations, codons, amino acids, CRISPR, genetic disorders, proteins. Return ONLY valid JSON: {"question":"...","answer":"...","hint":"..."}. Answer should be 1-3 words.';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          try {
            var clean = (typeof resp === 'string' ? resp : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
            var parsed = JSON.parse(clean);
            if (parsed.question && parsed.answer) {
              updMulti({ battleAIQ: { q: parsed.question, a: parsed.answer, h: parsed.hint || '' }, battleAILoading: false });
            } else { throw new Error('bad'); }
          } catch (e) { updMulti({ battleAIQ: null, battleAILoading: false, battleUseAI: false }); }
        }).catch(function() { updMulti({ battleAIQ: null, battleAILoading: false, battleUseAI: false }); });
      }

      function getCurrentBattleQ() {
        if (battleUseAI && battleAIQ) return battleAIQ;
        var qIdx = (battleOrder || [])[battleRound];
        return BATTLE_QS[qIdx] || null;
      }

      function battleAttack() {
        if (!battleAnswer.trim() || battleDone) return;
        var q = getCurrentBattleQ();
        if (!q) return;
        var answers = q.a.split(',');
        var correct = answers.some(function(a) { return battleAnswer.trim().toUpperCase().indexOf(a.trim().toUpperCase()) >= 0; });
        var newEHP = battleEnemyHP;
        var newPHP = battlePlayerHP;
        var fb;
        if (correct) {
          var dmg = 12 + Math.floor(Math.random() * 8);
          newEHP = Math.max(0, newEHP - dmg);
          fb = '\u2705 Correct! Dealt ' + dmg + ' damage!';
          awardStemXP('dnaLab', 5, 'Battle correct');
          if (typeof stemBeep === 'function') stemBeep();
        } else {
          var dmg2 = 10 + Math.floor(Math.random() * 8);
          newPHP = Math.max(0, newPHP - dmg2);
          fb = '\u274c Wrong! ' + answers[0] + '. Took ' + dmg2 + ' damage!';
        }
        var maxRounds = battleUseAI ? 10 : BATTLE_QS.length;
        var nextRound = battleRound + 1;
        var done = newEHP <= 0 || newPHP <= 0 || nextRound >= maxRounds;
        var won = done && newEHP <= newPHP;
        updMulti({ battleEnemyHP: newEHP, battlePlayerHP: newPHP, battleRound: nextRound, battleAnswer: '', battleFeedback: fb, battleDone: done, battleWon: won, battleAIQ: null });
        if (!done && battleUseAI) generateBattleAIQ(nextRound);
        if (done && won) {
          checkBadge('geneWarrior');
          awardStemXP('dnaLab', 25, 'Won Gene Defense battle');
          if (typeof stemCelebrate === 'function') stemCelebrate();
        }
      }

      // ═══════════════════════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════════════════════

      var badges = d.badges || {};
      var earnedBadgeCount = 0;
      for (var bi = 0; bi < DNA_BADGES.length; bi++) { if (badges[DNA_BADGES[bi].id]) earnedBadgeCount++; }

      var __dnaMainView = h("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200" },

        // ═══ HEADER ═══
        h("div", { className: "flex items-center justify-between" },
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { setStemLabTool(null); announceToSR('Returned to tool grid'); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools' },
              h(ArrowLeft, { size: 18, className: "text-slate-200" })),
            h("div", null,
              h("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDDEC DNA / Genetics Lab"),
              h("p", { className: "text-xs text-slate-600" }, "Build \u2022 Replicate \u2022 Transcribe \u2022 Translate \u2022 Mutate \u2022 CRISPR \u2022 Forensics"))
          ),
          h("div", { className: "flex items-center gap-2" },
            h("span", { className: "text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + getStemXP('dnaLab') + "/100 XP"),
            h("button", { onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'dna-' + Date.now(), tool: 'dnaLab', label: 'DNA: ' + dnaSeq.substring(0, 12) + '...', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        ),

        // ═══ GRADE SELECTOR ═══
        h("div", { className: "flex items-center gap-1.5 flex-wrap" },
          h("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1" }, "\uD83C\uDF93 Grade:"),
          GRADE_BANDS.map(function(gb) {
            return h("button", {
              key: gb,
              onClick: function() { upd('dnaGradeOverride', gb); addToast('\uD83C\uDF93 Grade set to ' + gb, 'success'); },
              className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (gradeBand === gb ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-fuchsia-50 border border-slate-400')
            }, gb);
          }),
          h("span", { className: "ml-auto px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 text-[11px] font-bold rounded-full border border-fuchsia-200" },
            gradeBand === 'K-2' ? '\uD83E\uDDF8 Elementary' : gradeBand === '3-5' ? '\uD83D\uDCDA Upper Elementary' : gradeBand === '6-8' ? '\uD83E\uDD13 Middle School' : '\uD83C\uDF93 High School'
          )
        ),

        // ═══ TAB BAR ═══
        h("div", { className: "flex gap-1 bg-[#0a0e1a]/85 backdrop-blur-md p-1 rounded-xl flex-wrap border border-slate-700/50 shadow-lg", role: "tablist" },
          SUBTOOLS.map(function(tb) {
            var isActive = tab === tb.id;
            return h("button", {
              key: tb.id,
              role: "tab",
              'aria-selected': isActive ? 'true' : 'false',
              onClick: function() {
                var v = Object.assign({}, d.visitedTabs || {}); v[tb.id] = true;
                updMulti({ tab: tb.id, visitedTabs: v });
                if (Object.keys(v).length >= SUBTOOLS.length) checkBadge('explorer');
                announceToSR('Switched to ' + tb.label);
              },
              className: "relative flex-1 min-w-[70px] px-2 py-2 text-[11px] font-bold rounded-lg transition-all focus:outline-none focus:ring-2 " +
                (isActive
                  ? "bg-white/10 text-white border border-fuchsia-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] focus:ring-fuchsia-500 focus:ring-offset-1 focus:ring-offset-[#0a0e1a]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent focus:ring-violet-500/60"
                )
            }, [
              h("span", { key: "text", className: "relative z-10" }, tb.icon + " " + tb.label),
              isActive && h("span", {
                key: "indicator",
                className: "absolute bottom-0.5 left-1/4 right-1/4 h-[3px] rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 shadow-[0_0_8px_#d946ef]"
              })
            ]);
          })
        ),

        // ── Topic-accent hero band per tab ──
        (function() {
          var TAB_META = {
            build:      { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83E\uDDEC', title: 'Build - the double helix from 4 letters',         hint: 'A pairs with T (2 bonds), G with C (3). Watson + Crick + Franklin (1953) cracked the structure from X-ray crystallography. The shape itself encodes how DNA copies and reads.' },
            replicate:  { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDD00', title: 'Replicate - unzip, copy, rezip',                      hint: 'Helicase splits the strands; DNA polymerase synthesizes complements. Semi-conservative: each new helix has one old strand + one new. Meselson & Stahl proved it 1958.' },
            transcribe: { accent: '#10b981', soft: 'rgba(16,185,129,0.10)', icon: '\uD83D\uDCDD', title: 'Transcribe - DNA \u2192 mRNA in the nucleus',          hint: 'RNA polymerase reads one DNA strand 3\u2032\u21925\u2032 and builds RNA 5\u2032\u21923\u2032. Same letters except T becomes U. mRNA carries the recipe out to the ribosomes - the central dogma\u2019s first arrow.' },
            translate:  { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83D\uDD2C', title: 'Translate - mRNA \u2192 protein at the ribosome',     hint: '64 codons \u2192 20 amino acids (the genetic code is redundant). AUG starts; UAA/UAG/UGA stop. tRNA reads codons, charges them with the right amino acid, peptide bond forms.' },
            mutate:     { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83E\uDDA0', title: 'Mutate - substitution, insertion, deletion',          hint: 'Point mutation: one letter swapped. Insertion/deletion: frameshift, the entire downstream protein is garbled. Sickle-cell is a single A\u2192T - one letter, lifelong consequence.' },
            crispr:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\u2702',         title: 'CRISPR - the precision edit',                      hint: 'Bacterial immune system, repurposed. Cas9 enzyme + guide RNA = molecular scissors. Doudna + Charpentier won the 2020 Nobel. First CRISPR therapy (sickle-cell) FDA-approved Dec 2023.' },
            protein:    { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  icon: '\uD83E\uDDEA', title: 'Protein - fold, function, malfunction',              hint: 'Sequence determines structure determines function. Hemoglobin carries O\u2082, antibodies recognize, enzymes catalyze. AlphaFold (2020) predicted ~200M structures - a problem that took 50 years, cracked in 18 months.' },
            forensics:  { accent: '#475569', soft: 'rgba(71,85,105,0.10)',  icon: '\uD83D\uDD0D', title: 'Forensics - STR profiling + DNA evidence',           hint: 'CODIS uses 20 short tandem repeat (STR) loci. Match probability is one-in-quadrillions when all loci agree. Innocence Project: 245+ wrongful convictions overturned by post-conviction DNA testing.' },
            challenge:  { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFAF', title: 'Challenge - graded problems',                          hint: 'Practice transcription, translation, mutation classification. AP Bio Big Idea 3.A.1: DNA, sometimes RNA, is the primary source of heritable information. NGSS HS-LS3-1.' },
            battle:     { accent: '#ea580c', soft: 'rgba(234,88,12,0.10)',  icon: '\u2694',         title: 'Battle - head-to-head retrieval',                  hint: 'Retrieval-practice gamified. Speed builds automaticity - once codon-table lookups are automatic, your working memory is free for higher-order thinking like predicting mutation impact.' },
            learn:      { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCDA', title: 'Learn - the central dogma + history',                hint: 'DNA \u2192 RNA \u2192 protein - with retroviruses (HIV) running it backward via reverse transcriptase. Crick coined \u201Cdogma\u201D in 1957; he later said he meant it as a hypothesis, not scripture.' }
          };
          var meta = TAB_META[tab] || TAB_META.build;
          return h('div', {
            style: {
              margin: '0 0 12px',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══ BADGE BAR ═══
        h("div", { className: "flex items-center gap-1 flex-wrap" },
          h("span", { className: "text-[11px] font-bold text-slate-600 mr-1" }, "\uD83C\uDFC6 " + earnedBadgeCount + "/" + DNA_BADGES.length),
          DNA_BADGES.map(function(b) {
            var earned = badges[b.id];
            return h("span", { key: b.id, className: "w-6 h-6 flex items-center justify-center rounded-full text-xs cursor-default transition-all " + (earned ? 'bg-amber-100 shadow-sm scale-100' : 'bg-slate-100 grayscale opacity-40'), title: b.label + ': ' + b.desc + (earned ? ' \u2705' : '') }, b.icon);
          })
        ),

        // ═══ TOPIC HERO BAND (per-tab) ═══
        (function() {
          var TAB_META = {
            build:      { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83E\uDDEC', title: 'Build a DNA strand',          hint: 'Pick a sequence - the complementary strand fills in via base pairing (A-T, G-C). Real DNA is built like this constantly.' },
            replicate:  { accent: '#3b82f6', soft: 'rgba(59,130,246,0.10)', icon: '\uD83D\uDD00', title: 'DNA replication',              hint: 'Helicase unwinds the helix; DNA polymerase reads each template strand and lays down its complement. Semiconservative - each daughter has one old + one new strand.' },
            transcribe: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCDD', title: 'Transcription - DNA \u2192 mRNA', hint: 'RNA polymerase reads the template strand. Same complementary rules but T \u2192 U. Output: a single-stranded mRNA copy ready to leave the nucleus.' },
            translate:  { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDD2C', title: 'Translation - mRNA \u2192 protein', hint: 'Ribosome reads codons (3 bases at a time). Each codon \u2192 one amino acid. The genetic code is read in non-overlapping triplets, no commas.' },
            mutate:     { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83E\uDDA0', title: 'Mutations',                     hint: 'Point mutations: silent (no protein change), missense (one AA different), nonsense (premature stop). Frameshifts (insertion/deletion) are usually catastrophic.' },
            crispr:     { accent: '#ef4444', soft: 'rgba(239,68,68,0.10)',  icon: '\u2702\uFE0F',  title: 'CRISPR-Cas9 editing',          hint: 'Guide RNA points Cas9 to a 20-base target. Cas9 cuts both strands. Cell repair pathways either knock out the gene or insert a template you provide.' },
            protein:    { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  icon: '\uD83E\uDDEA', title: 'Protein structure',            hint: 'Primary (sequence) \u2192 secondary (\u03B1-helix, \u03B2-sheet) \u2192 tertiary (3D fold) \u2192 quaternary (multi-subunit). One amino acid swap can break the fold.' },
            forensics:  { accent: '#8b5cf6', soft: 'rgba(139,92,246,0.10)', icon: '\uD83D\uDD0D', title: 'DNA forensics',                hint: 'STR profiling: 13-20 short-tandem-repeat loci. Probability of a random match across all loci is roughly one in a billion. Used in CODIS, paternity, and crime labs.' },
            challenge:  { accent: '#fbbf24', soft: 'rgba(251,191,36,0.10)', icon: '\uD83C\uDFAF', title: 'Daily challenge',              hint: 'A new DNA puzzle every session. Translate, identify the mutation, find the ORF, or solve a forensic case. Streak counter tracks daily wins.' },
            battle:     { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\u2694\uFE0F',  title: 'Codon battle',                 hint: 'Speed-translation duel. Decode codons fast against a timer. Tests whether the genetic code is in your head, not just your reference card.' },
            learn:      { accent: '#64748b', soft: 'rgba(100,116,139,0.10)', icon: '\uD83D\uDCDA', title: 'Reference + glossary',         hint: 'Codon table, base-pairing rules, key terms (ORF, intron, exon, promoter, repressor) - the cheat sheet you keep coming back to.' }
          };
          var meta = TAB_META[tab] || TAB_META.build;
          return h('div', {
            style: {
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══════════════════════════════════════════
        // BUILD TAB
        // ═══════════════════════════════════════════
        tab === 'build' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application", 'aria-label': 'DNA helix visualization' },
            h("canvas", { ref: _dnaCanvasRef, style: { width: '100%', height: 200 }, tabIndex: 0, 'aria-label': 'DNA helix: ' + dnaSeq })
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4 space-y-3" },
            h("div", { className: "flex items-center justify-between flex-wrap gap-2" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "Template Strand (3'\u21925')"),
              h("div", { className: "flex gap-1 flex-wrap" },
                h("button", { onClick: function() { updMulti({ dnaSequence: randomDNA(21), mRNA: '', protein: [], animStep: 0 }); announceToSR('Random sequence'); }, className: "px-2 py-1 text-[11px] font-bold bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100" }, "\uD83C\uDFB2 Random"),
                PRESETS.map(function(p) {
                  return h("button", { key: p.name, onClick: function() { updMulti({ dnaSequence: p.seq, mRNA: '', protein: [], animStep: 0 }); addToast('\uD83E\uDDEC ' + p.name + ': ' + p.desc, 'success'); announceToSR('Loaded ' + p.name); checkBadge('firstStrand'); }, className: "px-2 py-1 text-[11px] font-bold bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100", title: p.desc }, p.name);
                })
              )
            ),
            h("div", { className: "flex flex-wrap gap-1", role: "group", },
              dnaSeq.split('').map(function(base, idx) {
                return h("button", { key: idx, onClick: function() { var order = 'ATGC'; var next = order[(order.indexOf(base) + 1) % 4]; updMulti({ dnaSequence: dnaSeq.substring(0, idx) + next + dnaSeq.substring(idx + 1), mRNA: '', protein: [], animStep: 0 }); },
                  className: "w-8 h-8 rounded-lg font-mono font-bold text-white text-sm hover:scale-110 transition-all", style: { background: BASE_COLORS[base] }, 'aria-label': 'Base ' + (idx + 1) + ': ' + base
                }, base);
              })
            ),
            h("div", { className: "text-xs text-slate-600" }, "Complement: ", h("span", { className: "font-mono font-bold text-slate-600" }, complementStrand), " | " + dnaSeq.length + " bp"),
            h("div", { className: "flex gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100" },
              h("span", null, "GC: " + Math.round((dnaSeq.split('').filter(function(b) { return b === 'G' || b === 'C'; }).length / dnaSeq.length) * 100) + "%"),
              h("span", null, "AT: " + Math.round((dnaSeq.split('').filter(function(b) { return b === 'A' || b === 'T'; }).length / dnaSeq.length) * 100) + "%")
            ),
            h("div", { className: "flex gap-4 text-[11px] text-slate-600 pt-2 border-t border-slate-100" },
              ['A', 'T', 'G', 'C'].map(function(b) { var names = { A: 'Adenine', T: 'Thymine', G: 'Guanine', C: 'Cytosine' }; return h("span", { key: b, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: BASE_COLORS[b] } }), b + "=" + names[b] + " \u2194 " + BASE_COMPLEMENT[b]); })
            )
          )
        ),

        // ═══════════════════════════════════════════
        // REPLICATION TAB
        // ═══════════════════════════════════════════
        tab === 'replicate' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application", 'aria-label': 'DNA replication fork visualization' },
            h("canvas", { ref: _replCanvasRef, style: { width: '100%', height: 240 }, tabIndex: 0, 'aria-label': 'Replication: ' + replStep + '/' + dnaSeq.length })
          ),
          h("div", { className: "flex items-center gap-3 flex-wrap" },
            h("button", { onClick: function() {
              if (replPlaying) { upd('replPlaying', false); }
              else { if (replStep >= dnaSeq.length) updMulti({ replStep: 0, replPlaying: true }); else upd('replPlaying', true); }
            }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (replPlaying ? 'bg-amber-700 text-white' : 'bg-teal-700 text-white hover:bg-teal-700') }, replPlaying ? '\u23F8 Pause' : '\u25B6 Replicate'),
            h("button", { onClick: function() { updMulti({ replStep: 0, replPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, '\u21BA Reset'),
            h("div", { className: "flex items-center gap-2 ml-auto" },
              h("span", { className: "text-xs text-slate-600" }, 'Speed:'),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[11px] font-bold rounded-lg " + (speed === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-200') }, s + 'x'); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4 space-y-3" },
            h("div", { className: "flex justify-between text-xs text-slate-600 mb-1" },
              h("span", null, replStep + '/' + dnaSeq.length + ' bases replicated'),
              h("span", null, Math.round(replStep / dnaSeq.length * 100) + '%')
            ),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" },
              h("div", { className: "bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full h-2 transition-all", style: { width: (replStep / dnaSeq.length * 100) + '%' } })
            ),
            h("p", { className: "text-xs text-slate-600 mt-2 leading-relaxed" },
              gradeText(
                '\uD83E\uDDEC DNA replication is like photocopying a recipe. The cell unzips the DNA ladder and builds two exact copies so both new cells get the instructions!',
                '\uD83E\uDDEC During replication, the enzyme helicase unwinds the double helix. Then DNA polymerase reads each strand and adds matching bases (A-T, G-C) to create two identical copies.',
                '\uD83E\uDDEC Semi-conservative replication: Helicase unwinds at the origin of replication. DNA Polymerase III adds nucleotides 5\u2032\u21923\u2032. The leading strand is continuous, while the lagging strand is synthesized in Okazaki fragments joined by ligase.',
                '\uD83E\uDDEC Replication initiates at origins (OriC in prokaryotes). Helicase unwinds; SSB proteins stabilize. Primase lays RNA primers. Pol III extends 5\u2032\u21923\u2032 (leading = continuous, lagging = Okazaki fragments). Pol I replaces primers; ligase seals nicks. Proofreading by 3\u2032\u21925\u2032 exonuclease achieves ~10\u207B\u2079 error rate.'
              )
            ),
            h("div", { className: "flex gap-3 flex-wrap text-[11px] text-slate-600 pt-2 border-t border-slate-100" },
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-500" }), 'Helicase'),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500" }), 'DNA Pol III'),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-sky-400" }), 'Leading (continuous)'),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-orange-400" }), 'Lagging (Okazaki)')
            )
          )
        ),

        // ═══════════════════════════════════════════
        // TRANSCRIPTION TAB
        // ═══════════════════════════════════════════
        tab === 'transcribe' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application" },
            h("canvas", { ref: _dnaCanvasRef, style: { width: '100%', height: 220 }, tabIndex: 0, 'aria-label': 'Transcription: ' + animStep + '/' + dnaSeq.length })
          ),
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { if (animPlaying) upd('animPlaying', false); else { if (animStep >= dnaSeq.length) updMulti({ animStep: 0, mRNA: '', animPlaying: true }); else upd('animPlaying', true); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (animPlaying ? "bg-amber-700 text-white" : "bg-violet-600 text-white hover:bg-violet-700") }, animPlaying ? "\u23F8 Pause" : "\u25B6 Transcribe"),
            h("button", { onClick: function() { updMulti({ animStep: 0, mRNA: '', animPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, "\u21BA Reset"),
            h("div", { className: "flex items-center gap-2 ml-auto" }, h("span", { className: "text-xs text-slate-600" }, "Speed:"),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[11px] font-bold rounded-lg " + (speed === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600") }, s + "x"); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("div", { className: "flex justify-between text-xs text-slate-600 mb-2" }, h("span", null, animStep + "/" + dnaSeq.length), h("span", null, Math.round(animStep / dnaSeq.length * 100) + "%")),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" }, h("div", { className: "bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full h-2 transition-all", style: { width: (animStep / dnaSeq.length * 100) + '%' } })),
            mRNA && h("div", { className: "mt-3" }, h("span", { className: "text-xs font-bold text-violet-600" }, "mRNA: "), h("span", { className: "font-mono text-xs text-slate-700 break-all" }, mRNA)),
            h("div", { className: "mt-2 text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2" }, "\uD83D\uDCA1 RNA Polymerase reads template 3'\u21925', builds mRNA 5'\u21923'. T becomes U in RNA.")
          )
        ),

        // ═══════════════════════════════════════════
        // TRANSLATION TAB
        // ═══════════════════════════════════════════
        tab === 'translate' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, "\uD83D\uDD2C Ribosome Translation"),
            h("div", { className: "font-mono text-xs break-all mb-3 p-3 bg-slate-50 rounded-lg" },
              h("span", { className: "text-[11px] font-bold text-violet-600 block mb-1" }, "mRNA:"),
              (fullMRNA.match(/.{1,3}/g) || []).map(function(codon, idx) {
                var isActive = idx === transStep && transPlaying;
                var isPast = idx < transStep;
                return h("span", { key: idx, className: "inline-block px-1 py-0.5 mx-0.5 rounded text-xs font-bold " + (isActive ? "bg-violet-600 text-white scale-110" : isPast ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"), title: codon + ' \u2192 ' + (CODON_TABLE[codon] || '?') }, codon);
              })
            ),
            h("div", { className: "flex flex-wrap gap-1 items-center mb-3", role: "list" },
              h("span", { className: "text-[11px] font-bold text-slate-600 mr-1" }, "Protein:"),
              builtProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa }; return h("span", { key: idx, role: "listitem", className: "px-1.5 py-0.5 rounded-md text-[11px] font-bold text-white", style: { background: pr.color }, title: pr.full }, p.aa); }),
              builtProtein.length === 0 && h("span", { className: "text-[11px] text-slate-600 italic" }, "Press Start to begin...")
            ),
            h("div", { className: "bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-4 shadow-inner" },
              h("canvas", { ref: _translationCanvasRef, style: { width: '100%', height: 240 }, tabIndex: 0, 'aria-label': 'Ribosome Translation Simulator' })
            ),
            h("div", { className: "flex items-center gap-3 mt-4" },
              h("button", { onClick: function() { if (transPlaying) updMulti({ transPlaying: false }); else { updMulti({ transStep: 0, builtProtein: [], transPlaying: true }); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (transPlaying ? "bg-amber-700 text-white" : "bg-emerald-700 text-white hover:bg-emerald-700") }, transPlaying ? "\u23F8 Pause" : "\u25B6 Translate"),
              h("button", { onClick: function() { updMulti({ transStep: 0, builtProtein: [], transPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, "\u21BA Reset")
            )
          )
        ),

        // ═══════════════════════════════════════════
        // MUTATE TAB
        // ═══════════════════════════════════════════
        tab === 'mutate' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border-2 border-rose-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\uD83E\uDDA0"),
              h("h4", { className: "text-sm font-bold text-rose-800" }, "Mutation Simulator"),
              h("span", { className: "px-2 py-0.5 bg-rose-200 text-rose-800 text-[11px] font-bold rounded-full" }, "INTERACTIVE")
            ),
            h("p", { className: "text-xs text-slate-600" },
              gradeText(
                'Mutations are like typos in the DNA recipe. Even one small change can make a different protein!',
                'A mutation changes the DNA sequence. This can change the mRNA, which can change the protein. Some mutations are harmless, others cause disease.',
                'Point mutations (substitution, insertion, deletion) alter the reading frame. Frameshift mutations from insertions/deletions often produce non-functional proteins.',
                'Mutations drive evolution via natural selection. Substitutions may be synonymous (silent), missense, or nonsense. Insertions/deletions cause frameshifts altering all downstream codons.'
              )
            ),
            h("div", { className: "flex gap-2 flex-wrap" },
              h("button", { onClick: function() { applyMutation('substitution'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 shadow-md transition-all" }, "\uD83D\uDD04 Substitution"),
              h("button", { onClick: function() { applyMutation('insertion'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 shadow-md transition-all" }, "\u2795 Insertion"),
              h("button", { onClick: function() { applyMutation('deletion'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-red-700 text-white hover:bg-red-600 shadow-md transition-all" }, "\u2796 Deletion"),
              h("button", { onClick: function() { updMulti({ dnaSequence: 'ATGCGTACCTGAAACTGA', mRNA: '', protein: [], animStep: 0, mutationLog: [] }); addToast('\u21BA Reset to original', 'success'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all" }, "\u21BA Reset")
            ),
            h("div", { className: "bg-white rounded-lg p-3 border" },
              h("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, "Current Sequence (" + dnaSeq.length + " bp):"),
              h("div", { className: "font-mono text-xs break-all" },
                dnaSeq.split('').map(function(base, idx) { return h("span", { key: idx, className: "inline-block w-5 h-5 text-center leading-5 rounded font-bold text-white text-[11px] m-px", style: { background: BASE_COLORS[base] } }, base); })
              ),
              h("p", { className: "text-[11px] text-slate-600 mt-2" }, "Protein: " + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-') + (fullProtein.some(function(p) { return p.aa === 'Stop'; }) ? ' [STOP]' : ''))
            ),
            (d.mutationLog && d.mutationLog.length > 0) && h("div", { className: "mt-2" },
              h("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, "\uD83D\uDCCB Mutation Log:"),
              h("div", { className: "space-y-1 max-h-32 overflow-y-auto" },
                (d.mutationLog || []).map(function(m, i) {
                  var emoji = m.type === 'Substitution' ? '\uD83D\uDD04' : m.type === 'Insertion' ? '\u2795' : '\u2796';
                  var desc = m.type === 'Substitution' ? m.from + '\u2192' + m.to + ' at pos ' + (m.pos + 1) :
                             m.type === 'Insertion' ? '+' + m.to + ' at pos ' + (m.pos + 1) :
                             '-' + m.from + ' at pos ' + (m.pos + 1);
                  return h("div", { key: i, className: "text-[11px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, emoji + ' ' + m.type + ': ' + desc);
                })
              )
            )
          ),
          callGemini && h("div", { className: "mt-2" },
            h("button", { onClick: function() {
              if (d.aiExplainLoading) return;
              upd('aiExplainLoading', true); upd('aiExplain', '');
              var gradeCtx = gradeText('kindergarten (ages 5-7), very simple words', '3rd-5th grade (ages 8-10)', '6th-8th grade (ages 11-13), use scientific terms', '9th-12th grade (ages 14-18), use advanced biology terminology');
              var mutLog = (d.mutationLog || []).slice(-3).map(function(m) { return m.type + (m.from ? ' ' + m.from : '') + (m.to ? '\u2192' + m.to : '') + ' at pos ' + (m.pos + 1); }).join('; ');
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
              h("span", { className: "text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1" }, "\uD83E\uDDE0 AI Analysis"),
              d.aiExplain
            )
          )
        ),

        // ═══════════════════════════════════════════
        // CRISPR TAB
        // ═══════════════════════════════════════════
        tab === 'crispr' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-slate-900 rounded-xl p-4", role: "application", 'aria-label': 'CRISPR-Cas9 gene editing simulation' },
            h("canvas", { ref: _crisprCanvasRef, style: { width: '100%', height: 260 }, tabIndex: 0, 'aria-label': 'CRISPR: ' + crisprPhase })
          ),

          h("div", { className: "bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border-2 border-violet-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\u2702\uFE0F"),
              h("h4", { className: "text-sm font-bold text-violet-800" }, "CRISPR-Cas9 Gene Editor"),
              h("span", { className: "px-2 py-0.5 text-[11px] font-bold rounded-full " + (
                crisprPhase === 'design' ? 'bg-blue-200 text-blue-800' :
                crisprPhase === 'scanning' ? 'bg-amber-200 text-amber-800 animate-pulse' :
                crisprPhase === 'cut' ? 'bg-red-200 text-red-800' :
                crisprPhase === 'done' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
              ) }, crisprPhase === 'design' ? 'DESIGN' : crisprPhase === 'scanning' ? 'SCANNING...' : crisprPhase === 'cut' ? 'TARGET FOUND' : crisprPhase === 'done' ? 'EDIT COMPLETE' : crisprPhase.toUpperCase())
            ),
            h("p", { className: "text-xs text-slate-600 leading-relaxed" },
              gradeText(
                '\u2702\uFE0F CRISPR is like molecular scissors! Scientists use a tiny protein called Cas9 to find and cut a specific spot in the DNA, then fix it to cure diseases.',
                '\u2702\uFE0F CRISPR-Cas9 uses a guide RNA to lead the Cas9 protein to an exact location on the DNA. Once it finds the matching sequence next to a PAM site (NGG), it cuts both strands. The cell then repairs the break.',
                '\u2702\uFE0F CRISPR-Cas9: A guide RNA (gRNA) complementary to the target sequence directs Cas9 to the DNA. Cas9 recognizes the PAM motif (5\u2032-NGG-3\u2032), unwinds DNA, creates a double-strand break (DSB). Repair via NHEJ (error-prone) or HDR (precise, requires template).',
                '\u2702\uFE0F The CRISPR-Cas9 system: crRNA+tracrRNA (or synthetic sgRNA) guides Cas9 endonuclease to a 20nt target adjacent to 5\u2032-NGG-3\u2032 PAM. RuvC and HNH domains each cleave one strand, creating a blunt DSB. NHEJ introduces indels (knockouts); HDR with donor template enables precise edits. Off-target effects minimized by high-fidelity Cas9 variants.'
              )
            ),

            // Design phase
            crisprPhase === 'design' && h("div", { className: "space-y-2" },
              h("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Step 1: Select PAM Target Site'),
              pamSites.length === 0 ? h("p", { className: "text-xs text-amber-800 bg-amber-50 p-2 rounded-lg" }, '\u26A0\uFE0F No PAM sites (NGG) found. Try a different DNA sequence from the Build tab.') :
              h("div", { className: "space-y-1" },
                h("p", { className: "text-[11px] text-slate-600" }, pamSites.length + ' PAM site(s) detected:'),
                h("div", { className: "flex gap-1 flex-wrap" },
                  pamSites.map(function(site, idx) {
                    return h("button", { key: idx, onClick: function() { upd('crisprTargetPAM', idx); },
                      className: "px-2 py-1 text-[11px] font-bold rounded-lg transition-all " + (activePAM === idx ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-violet-50')
                    }, 'Pos ' + (site.pamStart + 1) + ' (' + dnaSeq.substring(site.pamStart, site.pamStart + 3) + ')');
                  })
                ),
                selectedPAMSite && h("div", { className: "mt-2 p-2 bg-white rounded-lg border text-[11px]" },
                  h("p", { className: "text-slate-600" }, '\uD83C\uDFAF Target: pos ' + (selectedPAMSite.cutSite - crisprGuideLen + 1) + '-' + selectedPAMSite.cutSite + ' | PAM: ' + dnaSeq.substring(selectedPAMSite.pamStart, selectedPAMSite.pamStart + 3) + ' at pos ' + (selectedPAMSite.pamStart + 1)),
                  h("p", { className: "text-blue-600 font-mono mt-0.5" }, 'gRNA: ' + dnaSeq.substring(selectedPAMSite.cutSite - crisprGuideLen, selectedPAMSite.cutSite).split('').map(function(b) { return DNA_TO_RNA[b] || b; }).join(''))
                ),
                h("button", { onClick: startCRISPRScan, disabled: !selectedPAMSite, className: "mt-2 px-4 py-2 text-sm font-bold rounded-xl transition-all " + (selectedPAMSite ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md' : 'bg-slate-200 text-slate-200 cursor-not-allowed') }, '\uD83D\uDE80 Deploy Cas9')
              )
            ),

            // Scanning phase
            crisprPhase === 'scanning' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs text-amber-600 font-bold" }, '\uD83D\uDD0E Cas9 scanning... position ' + crisprScanPos + '/' + (selectedPAMSite ? selectedPAMSite.cutSite : '?')),
              h("div", { className: "w-full bg-slate-100 rounded-full h-2" },
                h("div", { className: "bg-gradient-to-r from-violet-500 to-blue-500 rounded-full h-2 transition-all", style: { width: (selectedPAMSite ? (crisprScanPos / selectedPAMSite.cutSite * 100) : 0) + '%' } })
              ),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs text-slate-600" }, 'Speed:'),
                [1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-0.5 text-[11px] font-bold rounded " + (speed === s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-200') }, s + 'x'); })
              )
            ),

            // Cut phase
            crisprPhase === 'cut' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-red-600" }, '\u2702\uFE0F Double-strand break created! Choose repair pathway:'),
              h("div", { className: "grid grid-cols-2 gap-2" },
                h("button", { onClick: function() { applyCRISPRRepair('nhej'); }, className: "p-3 rounded-xl border-2 border-amber-600 bg-amber-50 hover:bg-amber-100 transition-all text-left" },
                  h("p", { className: "text-xs font-bold text-amber-700" }, '\uD83D\uDD27 NHEJ'),
                  h("p", { className: "text-[11px] text-amber-600 mt-0.5" }, 'Non-Homologous End Joining'),
                  h("p", { className: "text-[11px] text-slate-600 mt-1" }, gradeText('Quick fix - might make mistakes!', 'Error-prone, may add or delete bases.', 'Error-prone. Introduces indels. Used for gene knockouts.', 'Error-prone. Introduces indels. Used for gene knockouts.'))
                ),
                h("button", { onClick: function() { applyCRISPRRepair('hdr'); }, className: "p-3 rounded-xl border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all text-left" },
                  h("p", { className: "text-xs font-bold text-emerald-700" }, '\uD83E\uDDEC HDR'),
                  h("p", { className: "text-[11px] text-emerald-600 mt-0.5" }, 'Homology-Directed Repair'),
                  h("p", { className: "text-[11px] text-slate-600 mt-1" }, gradeText('Careful fix - uses a template!', 'Precise editing using a template.', 'Precise editing using donor template. Used for gene knock-ins.', 'Precise editing using donor template. Used for gene knock-ins and corrections.'))
                )
              )
            ),

            // Done phase
            crisprPhase === 'done' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-emerald-600" }, '\u2705 Gene edit complete! Repair: ' + (crisprRepairType === 'nhej' ? 'NHEJ' : 'HDR')),
              h("button", { onClick: function() { updMulti({ crisprPhase: 'design', crisprScanPos: 0, crisprRepairType: '' }); }, className: "px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700" }, '\u21BA New Edit')
            ),

            // Edit history
            crisprEditLog.length > 0 && h("div", { className: "mt-2 pt-2 border-t border-slate-200" },
              h("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, '\uD83D\uDCCB CRISPR Edit History:'),
              h("div", { className: "space-y-1 max-h-24 overflow-y-auto" },
                crisprEditLog.map(function(e, i) {
                  return h("div", { key: i, className: "text-[11px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, (e.type === 'NHEJ' ? '\uD83D\uDD27' : '\uD83E\uDDEC') + ' ' + e.desc);
                })
              )
            )
          ),

          h("details", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, '\uD83D\uDCDA CRISPR Quick Reference'),
            h("div", { className: "p-3 text-[11px] text-slate-600 space-y-2" },
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'What is CRISPR?'),
                h("p", null, 'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a gene editing technology adapted from bacteria\'s immune defense.')
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'Key Components:'),
                h("ul", { className: "list-disc ml-4 space-y-0.5" },
                  h("li", null, h("strong", null, 'Cas9'), ' - The molecular scissors (endonuclease)'),
                  h("li", null, h("strong", null, 'Guide RNA'), ' - A ~20nt RNA that directs Cas9 to the target'),
                  h("li", null, h("strong", null, 'PAM'), ' - Protospacer Adjacent Motif (NGG). Required for binding.')
                )
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'Applications:'),
                h("p", null, 'Gene therapy (sickle cell \u2192 CASGEVY\u2122), cancer immunotherapy, crop engineering, disease models.')
              )
            )
          )
        ),

        // ═══════════════════════════════════════════
        // PROTEIN TAB
        // ═══════════════════════════════════════════
        tab === 'protein' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("div", { className: "flex items-center justify-between mb-3" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83E\uDDEA Protein - " + fullProtein.length + " amino acids"),
              fullProtein.length > 0 && h("span", { className: "text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full" },
                Math.round(fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length / Math.max(1, fullProtein.length) * 100) + '% hydrophobic'
              )
            ),
            fullProtein.length > 0 ? h("div", { className: "space-y-3" },
              h("div", { className: "flex flex-wrap gap-1.5 p-3 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl border border-slate-100" },
                fullProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa, abbr: '?', type: '?' };
                  return h("div", { key: idx, className: "flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[44px] hover:scale-105 transition-transform cursor-default", title: pr.full + ' (' + p.codon + ') - ' + pr.type },
                    h("span", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm", style: { background: pr.color } }, pr.abbr),
                    h("span", { className: "text-[11px] font-bold text-slate-600" }, p.aa),
                    h("span", { className: "text-[11px] text-slate-600 font-mono" }, p.codon),
                    idx < fullProtein.length - 1 && p.aa !== 'Stop' ? h("span", { className: "text-[11px] text-slate-600" }, '\u2500') : null
                  );
                })
              ),
              h("div", { className: "grid grid-cols-2 gap-2 mt-2" },
                h("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-100" },
                  h("p", { className: "text-[11px] font-bold text-amber-700 uppercase" }, 'Nonpolar (Hydrophobic)'),
                  h("p", { className: "text-sm font-black text-amber-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length),
                  h("p", { className: "text-[11px] text-amber-500" }, 'Ala, Val, Leu, Ile, Pro, Phe, Trp, Met, Gly')
                ),
                h("div", { className: "bg-blue-50 rounded-lg p-2 border border-blue-100" },
                  h("p", { className: "text-[11px] font-bold text-blue-700 uppercase" }, 'Polar (Hydrophilic)'),
                  h("p", { className: "text-sm font-black text-blue-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'polar'; }).length),
                  h("p", { className: "text-[11px] text-blue-500" }, 'Ser, Thr, Cys, Tyr, Asn, Gln')
                ),
                h("div", { className: "bg-red-50 rounded-lg p-2 border border-red-100" },
                  h("p", { className: "text-[11px] font-bold text-red-700 uppercase" }, 'Positively Charged'),
                  h("p", { className: "text-sm font-black text-red-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'positive'; }).length),
                  h("p", { className: "text-[11px] text-red-500" }, 'Arg, Lys, His')
                ),
                h("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-100" },
                  h("p", { className: "text-[11px] font-bold text-purple-700 uppercase" }, 'Negatively Charged'),
                  h("p", { className: "text-sm font-black text-purple-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'negative'; }).length),
                  h("p", { className: "text-[11px] text-purple-500" }, 'Asp, Glu')
                )
              ),
              h("div", { className: "bg-slate-50 rounded-lg p-2 border border-slate-400 mt-1" },
                h("p", { className: "text-[11px] font-bold text-slate-600" }, '\u2696\uFE0F Estimated MW: ~' + (fullProtein.length * 110) + ' Da (' + (fullProtein.length * 110 / 1000).toFixed(1) + ' kDa) | Seq: ' + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return (AA_PROPS[p.aa] || {}).abbr || '?'; }).join(''))
              ),
              h("div", { className: "flex gap-3 text-[11px] text-slate-600 pt-2 border-t flex-wrap" },
                [{ t: 'nonpolar', c: '#f59e0b', l: 'Nonpolar' }, { t: 'polar', c: '#3b82f6', l: 'Polar' }, { t: 'positive', c: '#ef4444', l: 'Positive (+)' }, { t: 'negative', c: '#a855f7', l: 'Negative (\u2212)' }].map(function(lg) { return h("span", { key: lg.t, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: lg.c } }), lg.l); })
              ),
              callGemini && h("div", { className: "pt-2 border-t border-slate-100" },
                h("button", { onClick: function() {
                  if (d.aiProteinLoading) return;
                  upd('aiProteinLoading', true);
                  var gradeCtx = gradeText('kindergarten, very simple', '3rd-5th grade', '6th-8th grade, scientific terms', '9th-12th grade, advanced biochemistry');
                  var seq = fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-');
                  var prompt = 'You are a biochemistry teacher. Grade: ' + gradeCtx + '. Protein sequence: ' + seq + '. Amino acid count: ' + fullProtein.length + '. Analyze this protein in 3-4 sentences: predict likely function, cellular location, and any notable patterns. Be educational and engaging.';
                  callGemini(prompt, true, false, 0.7).then(function(r) { updMulti({ aiProtein: typeof r === 'string' ? r : 'Analysis unavailable.', aiProteinLoading: false }); checkBadge('proteinSci'); }).catch(function() { updMulti({ aiProtein: 'AI unavailable.', aiProteinLoading: false }); });
                }, disabled: d.aiProteinLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiProteinLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md') }, d.aiProteinLoading ? '\u23F3 Analyzing...' : '\u2728 AI: Analyze Protein'),
                d.aiProtein && h("div", { className: "mt-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 leading-relaxed" },
                  h("span", { className: "text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, '\uD83E\uDDE0 Protein Analysis'),
                  d.aiProtein
                )
              )
            ) : h("div", { className: "text-center py-8 text-slate-200" }, h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEA"), h("p", null, "Run Transcription and Translation first!"))
          ),
          h("details", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, '\uD83E\uDDA0 Genetic Disorders Reference'),
            h("div", { className: "p-3 space-y-2 max-h-60 overflow-y-auto" },
              GENETIC_DISORDERS.map(function(dis) {
                return h("div", { key: dis.name, className: "p-2 bg-slate-50 rounded-lg" },
                  h("div", { className: "flex items-center gap-2" },
                    h("span", { className: "text-xs font-bold text-slate-700" }, dis.name),
                    h("span", { className: "px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[11px] font-bold rounded-full" }, dis.type)
                  ),
                  h("p", { className: "text-[11px] text-slate-600 mt-0.5" }, 'Gene: ' + dis.gene + ' | Mutation: ' + dis.mutation),
                  h("p", { className: "text-[11px] text-slate-600 mt-0.5" }, dis.effect)
                );
              })
            )
          ),

          // \u2550\u2550\u2550 MUTATION EFFECT SLEUTH (net-new mini-game) \u2550\u2550\u2550
          // 10 mutation vignettes. Player picks the effect type from 5 options
          // (silent / missense / nonsense / frameshift / in-frame indel). Tests the
          // AP Bio canonical concept that mutation TYPE matters more than mutation
          // existence - silent mutations don't change protein, frameshifts are
          // usually catastrophic, missense varies by which AA changes.
          (function() {
            var MS_TYPES = [
              { id: 'silent',     label: 'Silent',           color: '#22c55e', icon: '\uD83E\uDD2D', def: 'Codon changes but encodes the same amino acid (wobble, mostly 3rd position). No protein change.' },
              { id: 'missense',   label: 'Missense',         color: '#f59e0b', icon: '\uD83D\uDD04', def: 'Codon changes to a different amino acid. Effect ranges from harmless (conservative) to catastrophic (e.g., sickle cell).' },
              { id: 'nonsense',   label: 'Nonsense',         color: '#dc2626', icon: '\uD83D\uDED1', def: 'Sense codon changes to STOP. Protein is truncated - usually nonfunctional.' },
              { id: 'frameshift', label: 'Frameshift',       color: '#7c3aed', icon: '\u21AA\uFE0F',  def: 'Insertion or deletion NOT divisible by 3. Reading frame shifts; downstream protein is garbage. Usually catastrophic.' },
              { id: 'inframe',    label: 'In-frame indel',   color: '#0ea5e9', icon: '\u2795', def: 'Insertion or deletion that IS divisible by 3. Adds or removes whole amino acids; rest of protein is unchanged.' }
            ];
            var MS_VIGNETTES = [
              { id: 1, before: 'ATG GCC TTC TAA',  after: 'ATG GCC TTT TAA',          change: 'TTC \u2192 TTT (3rd-position C\u2192T)',
                aaBefore: 'Met-Ala-Phe-stop', aaAfter: 'Met-Ala-Phe-stop', correct: 'silent',
                why: 'Both TTC and TTT encode phenylalanine - the 3rd-position change is wobble and produces no protein change. Common at the 3rd codon position because of the genetic code\'s redundancy there.' },
              { id: 2, before: 'ATG GAG GTG TAA', after: 'ATG GTG GTG TAA',           change: 'GAG \u2192 GTG (2nd-position A\u2192T)',
                aaBefore: 'Met-Glu-Val-stop', aaAfter: 'Met-Val-Val-stop', correct: 'missense',
                why: 'Glutamate \u2192 Valine. This is the actual sickle-cell hemoglobin mutation (HbS). Single AA swap radically changes hemoglobin folding under low O\u2082. Missense effect depends entirely on which AA changes to which.' },
              { id: 3, before: 'ATG CAG GCC TAA', after: 'ATG TAG GCC TAA',           change: 'CAG \u2192 TAG (1st-position C\u2192T)',
                aaBefore: 'Met-Gln-Ala-stop', aaAfter: 'Met-STOP', correct: 'nonsense',
                why: 'Glutamine \u2192 STOP. Protein is truncated immediately after Met. CAG\u2192TAG (and CGA\u2192TGA, TGG\u2192TGA, TGG\u2192TAG) are the most common nonsense mutations - single base flip from a sense codon to a stop.' },
              { id: 4, before: 'ATG GCC TTC GGG TAA', after: 'ATG GCC GTT CGG GTA A',  change: 'Single G inserted between codons 2 and 3',
                aaBefore: 'Met-Ala-Phe-Gly-stop', aaAfter: 'Met-Ala-Val-Arg-Val-...', correct: 'frameshift',
                why: 'Inserting one base shifts the reading frame for everything downstream. Every codon past the insertion is a different triplet - usually creating a premature stop within ~20 codons. Frameshifts almost always destroy protein function.' },
              { id: 5, before: 'ATG GCC TTC TAA', after: 'ATG GCC GGG TTC TAA',       change: 'GGG (3 bases) inserted between codons 2 and 3',
                aaBefore: 'Met-Ala-Phe-stop', aaAfter: 'Met-Ala-Gly-Phe-stop', correct: 'inframe',
                why: 'Inserting 3 bases keeps the reading frame intact. One extra glycine added between Ala and Phe. The rest of the protein is unchanged - effect depends on whether the new AA disrupts folding. Often less severe than frameshift.' },
              { id: 6, before: 'ATG CCG GCC TAA', after: 'ATG CCA GCC TAA',           change: 'CCG \u2192 CCA (3rd-position G\u2192A)',
                aaBefore: 'Met-Pro-Ala-stop', aaAfter: 'Met-Pro-Ala-stop', correct: 'silent',
                why: 'Both CCG and CCA encode proline. All four CC_ codons code for proline - the 3rd position is fully wobble for proline. Silent mutations are common in coding sequences and one reason synonymous-substitution rates are used in molecular evolution.' },
              { id: 7, before: 'ATG TGG GCC TAA', after: 'ATG TGA GCC TAA',           change: 'TGG \u2192 TGA (3rd-position G\u2192A)',
                aaBefore: 'Met-Trp-Ala-stop', aaAfter: 'Met-STOP', correct: 'nonsense',
                why: 'Tryptophan \u2192 STOP. TGG is the only Trp codon, and a single 3rd-position G\u2192A change makes it a stop. This is one reason Trp residues are often essential - they are fragile in the genetic code.' },
              { id: 8, before: 'ATG GCC TTC GGG TAA', after: 'ATG GCC TTC GGA',       change: 'Last base of stop codon deleted',
                aaBefore: 'Met-Ala-Phe-Gly-stop', aaAfter: 'Met-Ala-Phe-Gly-...', correct: 'frameshift',
                why: 'Deleting one base causes a frameshift. The stop codon is destroyed; ribosome reads through into UTR until it hits the next in-frame stop somewhere downstream. The extended protein is usually misfolded.' },
              { id: 9, before: 'ATG TTC GGG GCC TAA', after: 'ATG GCC TAA',           change: 'TTC GGG (6 bases, 2 codons) deleted in-frame',
                aaBefore: 'Met-Phe-Gly-Ala-stop', aaAfter: 'Met-Ala-stop', correct: 'inframe',
                why: 'Deleting 6 bases (2 codons) keeps the reading frame intact. Phe and Gly are removed; Ala remains. Classic example: cystic fibrosis \u0394F508 is a 3-base deletion that removes one phenylalanine - in-frame, but breaks CFTR folding.' },
              { id: 10, before: 'ATG AAA GCC TAA', after: 'ATG AGA GCC TAA',          change: 'AAA \u2192 AGA (2nd-position A\u2192G)',
                aaBefore: 'Met-Lys-Ala-stop', aaAfter: 'Met-Arg-Ala-stop', correct: 'missense',
                why: 'Lysine \u2192 Arginine. Both are basic, positively-charged AAs - chemically very similar. This is a CONSERVATIVE missense. Often has minimal protein-function impact, unlike radical missense (e.g., Glu\u2192Val in #2).' }
            ];
            var msIdx = d.msIdx == null ? -1 : d.msIdx;
            var msSeed = d.msSeed || 1;
            var msAnswered = !!d.msAnswered;
            var msPick = d.msPick;
            var msScore = d.msScore || 0;
            var msRounds = d.msRounds || 0;
            var msStreak = d.msStreak || 0;
            var msBest = d.msBest || 0;
            var msShown = d.msShown || [];
            var msOpen = !!d.msOpen;
            function startMs() {
              var pool = [];
              for (var i = 0; i < MS_VIGNETTES.length; i++) if (msShown.indexOf(i) < 0) pool.push(i);
              if (pool.length === 0) { pool = []; for (var j = 0; j < MS_VIGNETTES.length; j++) pool.push(j); msShown = []; }
              var seedNext = ((msSeed * 16807 + 11) % 2147483647) || 7;
              var pick = pool[seedNext % pool.length];
              upd('msSeed', seedNext);
              upd('msIdx', pick);
              upd('msAnswered', false);
              upd('msPick', null);
              upd('msShown', msShown.concat([pick]));
            }
            function pickMs(typeId) {
              if (msAnswered) return;
              var v = MS_VIGNETTES[msIdx];
              var correct = typeId === v.correct;
              var newScore = msScore + (correct ? 1 : 0);
              var newStreak = correct ? (msStreak + 1) : 0;
              var newBest = Math.max(msBest, newStreak);
              upd('msAnswered', true);
              upd('msPick', typeId);
              upd('msScore', newScore);
              upd('msRounds', msRounds + 1);
              upd('msStreak', newStreak);
              upd('msBest', newBest);
            }
            return h("div", { className: "bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border-2 border-violet-300 p-4" },
              h("div", { className: "flex items-center justify-between mb-2 flex-wrap gap-2" },
                h("div", { className: "flex items-center gap-2" },
                  h("span", { style: { fontSize: 22 }, "aria-hidden": "true" }, '\uD83D\uDD75\uFE0F'),
                  h("div", null,
                    h("div", { className: "text-sm font-black text-violet-800" }, 'Mutation Effect Sleuth'),
                    h("div", { className: "text-[11px] text-slate-600 italic" }, 'Predict the effect type from 5 options.')
                  )
                ),
                h("button", {
                  onClick: function() { upd('msOpen', !msOpen); },
                  className: "px-3 py-1 rounded-lg bg-violet-200 text-violet-800 text-[11px] font-bold hover:bg-violet-300"
                }, msOpen ? 'Hide \u25B4' : 'Play \u2192')
              ),
              msOpen && (msIdx < 0
                ? h("div", { className: "text-center py-3" },
                    h("p", { className: "text-[11px] text-slate-700 leading-relaxed mb-3" },
                      '10 mutation vignettes. Each shows a short before/after DNA sequence with the change highlighted. Pick the effect type - silent, missense, nonsense, frameshift, or in-frame indel. Coaching after each pick names what makes this effect more likely than the others.'),
                    h("button", {
                      onClick: startMs,
                      'aria-label': 'Start Mutation Effect Sleuth',
                      className: "px-4 py-2 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500"
                    }, '\uD83D\uDD75\uFE0F Start - vignette 1 of 10')
                  )
                : (function() {
                    var v = MS_VIGNETTES[msIdx];
                    var pickedCorrect = msAnswered && msPick === v.correct;
                    var pct = msRounds > 0 ? Math.round((msScore / msRounds) * 100) : 0;
                    var allDone = msShown.length >= MS_VIGNETTES.length && msAnswered;
                    return h("div", null,
                      h("div", { className: "flex items-center flex-wrap gap-3 mb-3 text-[11px] text-slate-600" },
                        h("span", null, 'Vignette ', h('strong', { className: "text-slate-800" }, msShown.length)),
                        h("span", null, 'Score ', h('strong', { className: "text-emerald-700" }, msScore + ' / ' + msRounds)),
                        msRounds > 0 && h("span", null, 'Accuracy ', h('strong', { className: "text-cyan-700" }, pct + '%')),
                        h("span", null, 'Streak ', h('strong', { className: "text-amber-700" }, msStreak)),
                        h("span", null, 'Best ', h('strong', { className: "text-fuchsia-700" }, msBest))
                      ),
                      h("div", { className: "bg-white rounded-lg p-3 border border-violet-200 mb-2" },
                        h("div", { className: "text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1" }, 'Vignette ' + msShown.length + ' of ' + MS_VIGNETTES.length),
                        h("div", { className: "font-mono text-[12px] text-slate-700 mb-1" },
                          h('span', { className: "text-slate-500" }, 'Before:  '),
                          h('span', { className: "text-emerald-700 font-bold" }, v.before)
                        ),
                        h("div", { className: "font-mono text-[12px] text-slate-700 mb-1" },
                          h('span', { className: "text-slate-500" }, 'After:   '),
                          h('span', { className: "text-rose-700 font-bold" }, v.after)
                        ),
                        h("div", { className: "text-[11px] text-slate-700 italic mt-1" }, 'Change: ' + v.change),
                        msAnswered && h("div", { className: "mt-2 pt-2 border-t border-violet-100 text-[11px] text-slate-700 font-mono" },
                          h('div', null, h('span', { className: 'text-slate-500' }, 'AA before: '), v.aaBefore),
                          h('div', null, h('span', { className: 'text-slate-500' }, 'AA after:  '), v.aaAfter)
                        )
                      ),
                      h("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2", role: 'radiogroup', 'aria-label': 'Pick the mutation effect type' },
                        MS_TYPES.map(function(t) {
                          var picked = msAnswered && msPick === t.id;
                          var isRight = msAnswered && t.id === v.correct;
                          var bg, border, color;
                          if (msAnswered) {
                            if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                            else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                            else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
                          } else {
                            bg = t.color + '15'; border = t.color + '60'; color = '#1e293b';
                          }
                          return h('button', {
                            key: t.id, role: 'radio',
                            'aria-checked': picked ? 'true' : 'false',
                            'aria-label': t.label,
                            disabled: msAnswered,
                            onClick: function() { pickMs(t.id); },
                            style: { padding: '10px 10px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: msAnswered ? 'default' : 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 700, transition: 'all 0.15s', minHeight: 64 }
                          },
                            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                              h('span', { style: { fontSize: 14 }, 'aria-hidden': 'true' }, t.icon),
                              h('span', { style: { color: msAnswered ? color : t.color, fontSize: 12, fontWeight: 800 } }, t.label)
                            ),
                            h('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: msAnswered ? color: 'var(--allo-stem-text-soft, #475569)' } }, t.def)
                          );
                        })
                      ),
                      msAnswered && h("div", {
                        className: "mt-3 p-3 rounded-lg",
                        style: {
                          background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
                          border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
                        }
                      },
                        h("div", { className: "text-[12px] font-bold mb-1", style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
                          pickedCorrect
                            ? '\u2705 Correct - ' + (MS_TYPES.filter(function(x) { return x.id === v.correct; })[0]).label
                            : '\u274C The effect is ' + (MS_TYPES.filter(function(x) { return x.id === v.correct; })[0]).label + (msPick ? ' (you picked ' + (MS_TYPES.filter(function(x) { return x.id === msPick; })[0]).label + ')' : '')
                        ),
                        h("p", { className: "text-[11px] text-slate-700 leading-relaxed mb-2" }, v.why),
                        allDone
                          ? h("div", { className: "p-2 rounded bg-violet-100 border border-violet-300" },
                              h("div", { className: "text-[12px] font-bold text-violet-800 mb-1" }, '\uD83C\uDFC6 All 10 vignettes complete'),
                              h("div", { className: "text-[11px] text-slate-700 leading-relaxed" },
                                'Final: ', h('strong', null, msScore + ' / ' + MS_VIGNETTES.length + ' (' + Math.round((msScore / MS_VIGNETTES.length) * 100) + '%)'),
                                msScore === MS_VIGNETTES.length ? ' - every effect type correctly identified. Ready for AP Bio FRQ work.' :
                                msScore >= 8 ? ' - strong codon-effect reasoning. The most-confused pair is usually missense vs silent (3rd-position changes can go either way) and frameshift vs in-frame indel (count the bases mod 3).' :
                                msScore >= 6 ? ' - solid baseline. The mod-3 rule for indels and the wobble-rule for 3rd position are the two reflexes to build.' :
                                ' - these distinctions take practice. Re-read the codon table + the rationales on misses, then retake.'
                              ),
                              h("button", {
                                onClick: function() { upd('msIdx', -1); upd('msShown', []); upd('msScore', 0); upd('msRounds', 0); upd('msStreak', 0); },
                                className: "mt-2 px-3 py-1.5 rounded bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500"
                              }, '\uD83D\uDD04 Restart')
                            )
                          : h("button", {
                              onClick: startMs,
                              className: "px-3 py-1.5 rounded bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500"
                            }, '\u27A1\uFE0F Next vignette')
                      )
                    );
                  })()
              )
            );
          })()
        ),

        // ═══════════════════════════════════════════
        // FORENSICS TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'forensics' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\uD83D\uDD0D"),
              h("h4", { className: "text-sm font-bold text-cyan-800" }, "DNA Forensics - Gel Electrophoresis"),
              h("span", { className: "px-2 py-0.5 bg-cyan-200 text-cyan-800 text-[11px] font-bold rounded-full" }, "CASE " + (forensicCase + 1) + "/" + FORENSIC_CASES.length)
            ),
            h("p", { className: "text-xs text-slate-600" },
              gradeText(
                'DNA fingerprinting is like finding someone\u2019s unique barcode! Scientists cut DNA into pieces and sort them by size to see who matches.',
                'Restriction enzymes cut DNA at specific sequences. The fragments are separated by size using gel electrophoresis - smaller pieces move faster through the gel. If two samples have the same banding pattern, they match!',
                'Restriction Fragment Length Polymorphism (RFLP): Restriction endonucleases cut DNA at palindromic sites. Gel electrophoresis separates fragments by size (smaller = faster migration). Matching banding patterns between samples indicates same DNA source.',
                'RFLP & STR analysis: Restriction endonucleases recognize 4-8bp palindromic sequences. Gel electrophoresis separates fragments inversely proportional to log(MW). Modern forensics uses PCR-amplified Short Tandem Repeats (STRs) at 13+ CODIS loci for statistical match probabilities <10\u207B\u00B9\u2070.'
              )
            ),

            // Case selector
            h("div", { className: "flex gap-1 flex-wrap" },
              FORENSIC_CASES.map(function(c, idx) {
                return h("button", { key: idx, onClick: function() { updMulti({ forensicCase: idx, forensicGelRun: false, forensicGuess: null, forensicResult: null }); },
                  className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (forensicCase === idx ? 'bg-cyan-700 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-cyan-50 border border-slate-400')
                }, (idx + 1) + '. ' + c.name);
              })
            ),

            h("div", { className: "bg-white rounded-lg p-3 border" },
              h("p", { className: "text-xs font-bold text-slate-700" }, currentCase.name),
              h("p", { className: "text-[11px] text-slate-600 mt-1" }, currentCase.desc),
              h("p", { className: "text-[11px] text-cyan-600 mt-1" }, '\uD83E\uDDEC Restriction enzyme: ' + currentCase.enzyme)
            ),

            // Run gel button
            !forensicGelRun && h("button", { onClick: function() { upd('forensicGelRun', true); addToast('\u26A1 Running gel electrophoresis...', 'success'); }, className: "px-4 py-2 text-sm font-bold bg-cyan-700 text-white rounded-xl hover:bg-cyan-700 shadow-md transition-all" }, '\u26A1 Run Gel Electrophoresis'),

            forensicGelRun && h("div", { className: "space-y-3" },
              h("canvas", { ref: _forensicCanvasRef, style: { width: '100%', height: 240 }, tabIndex: 0, 'aria-label': 'Gel electrophoresis results' }),

              // Answer selection
              !forensicResult && h("div", { className: "space-y-2" },
                h("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Which sample matches the ' + currentCase.samples[0].label + '?'),
                h("div", { className: "flex gap-2 flex-wrap" },
                  currentCase.samples.map(function(s, idx) {
                    if (s.isRef) return null;
                    return h("button", { key: idx, onClick: function() { upd('forensicGuess', idx); },
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (forensicGuess === idx ? 'bg-cyan-700 text-white shadow-md ring-2 ring-cyan-300' : 'bg-white text-slate-600 hover:bg-cyan-50 border border-slate-400')
                    }, s.label);
                  })
                ),
                h("button", { onClick: checkForensicAnswer, disabled: forensicGuess == null, className: "px-4 py-2 text-sm font-bold rounded-xl transition-all " + (forensicGuess != null ? 'bg-cyan-700 text-white hover:bg-cyan-700 shadow-md' : 'bg-slate-200 text-slate-200 cursor-not-allowed') }, '\u2713 Submit Answer')
              ),

              // Result
              forensicResult && h("div", { className: "space-y-2" },
                h("div", { className: "p-3 rounded-xl text-sm font-bold " + (forensicResult === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-red-50 text-red-700 border-2 border-red-200') },
                  forensicResult === 'correct' ? '\u2705 Correct! The banding patterns match perfectly. Case solved!' : '\u274c Incorrect. Compare the band positions more carefully - matching samples have identical fragment sizes.',
                  h("button", { onClick: function() {
                    var nextCase = (forensicCase + 1) % FORENSIC_CASES.length;
                    updMulti({ forensicCase: nextCase, forensicGelRun: false, forensicGuess: null, forensicResult: null, forensicAI: null });
                  }, className: "mt-2 px-3 py-1.5 text-xs font-bold bg-white text-slate-600 rounded-lg border block" }, '\u21BB Next Case')
                ),
                // AI Forensics Analysis
                callGemini && h("div", null,
                  h("button", { onClick: function() {
                    if (d.forensicAILoading) return;
                    upd('forensicAILoading', true);
                    var gradeCtx = gradeText('kindergarten, very simple', '3rd-5th grade', '6th-8th grade, scientific terms', '9th-12th grade, advanced forensic science');
                    var caseData = currentCase;
                    var matchSample = caseData.samples[caseData.match];
                    var prompt = 'You are a forensic genetics teacher. Grade: ' + gradeCtx + '. Case: "' + caseData.name + '" - ' + caseData.desc + ' The restriction enzyme ' + caseData.enzyme + ' was used. The ' + caseData.samples[0].label + ' matched ' + matchSample.label + ' because they share identical fragment sizes: ' + matchSample.fragments.join(', ') + ' bp. Explain in 3-4 sentences why the bands match, what restriction enzymes do, and how gel electrophoresis separates DNA. Be educational and engaging.';
                    callGemini(prompt, true, false, 0.7).then(function(r) { updMulti({ forensicAI: typeof r === 'string' ? r : 'Analysis unavailable.', forensicAILoading: false }); }).catch(function() { updMulti({ forensicAI: 'AI unavailable.', forensicAILoading: false }); });
                  }, disabled: d.forensicAILoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.forensicAILoading ? 'bg-cyan-300 text-white cursor-wait' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-md') }, d.forensicAILoading ? '\u23F3 Analyzing...' : '\u2728 AI: Explain the Evidence'),
                  d.forensicAI && h("div", { className: "mt-2 p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-xs text-cyan-900 leading-relaxed" },
                    h("span", { className: "text-[11px] font-bold text-cyan-600 uppercase tracking-wider block mb-1" }, '\uD83E\uDDE0 Forensic Analysis'),
                    d.forensicAI
                  )
                )
              )
            )
          )
        ),

        // ═══════════════════════════════════════════
        // CHALLENGE TAB (Enhanced)
        // ═══════════════════════════════════════════
        tab === 'challenge' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4 space-y-4" },
            h("div", { className: "flex items-center justify-between flex-wrap gap-2" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83C\uDFAF DNA Challenge"),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + score + " pts"),
                (d.challengeStreak || 0) >= 2 && h("span", { className: "px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[11px] font-bold rounded-full shadow-sm animate-pulse" }, "\uD83D\uDD25 " + d.challengeStreak + " streak!")
              )
            ),

            // Tier selector
            h("div", { className: "flex gap-1" },
              [{ l: '\uD83C\uDF3F Easy', t: 0 }, { l: '\u26A1 Medium', t: 1 }, { l: '\uD83D\uDD25 Hard', t: 2 }].map(function(tier) {
                return h("button", { key: tier.t, onClick: function() { upd('challengeTier', tier.t); },
                  className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (challengeTier === tier.t ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-violet-50')
                }, tier.l);
              })
            ),

            !challengeQ ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEC"),
              h("p", { className: "text-xs text-slate-600 mb-3" }, "Test your genetics knowledge!"),
              h("div", { className: "flex gap-2 justify-center flex-wrap" },
                h("button", { onClick: generateChallenge, className: "px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg transition-all hover:shadow-xl" }, "\uD83C\uDFAF Start Challenge"),
                callGemini && h("button", { onClick: function() {
                  if (d.aiChallengeLoading) return;
                  upd('aiChallengeLoading', true);
                  var gradeCtx = gradeText('kindergarten (ages 5-7), very simple', '3rd-5th grade', '6th-8th grade', '9th-12th grade AP Biology level');
                  var prompt = 'Generate a genetics/DNA quiz question for ' + gradeCtx + ' students. DNA: ' + dnaSeq.substring(0, 15) + '... Return ONLY valid JSON: {"question":"...","answer":"...","hint":"..."}. Topics: DNA structure, base pairing, replication, transcription, translation, mutations, codons, amino acids, genetic disorders. Answer should be 1-3 words.';
                  callGemini(prompt, true, false, 0.7).then(function(resp) {
                    try {
                      var clean = (typeof resp === 'string' ? resp : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
                      var parsed = JSON.parse(clean);
                      if (parsed.question && parsed.answer) {
                        updMulti({ challengeQ: { type: 'ai', question: parsed.question, answer: parsed.answer, hint: parsed.hint || '', isAI: true }, challengeAnswer: '', challengeFeedback: '', aiChallengeLoading: false });
                      } else { throw new Error('bad'); }
                    } catch (e) {
                      addToast('\u26A0\uFE0F AI quiz failed, using static', 'error');
                      upd('aiChallengeLoading', false);
                      generateChallenge();
                    }
                  }).catch(function() { addToast('\u26A0\uFE0F AI unavailable', 'error'); upd('aiChallengeLoading', false); generateChallenge(); });
                }, disabled: d.aiChallengeLoading, className: "px-5 py-2.5 text-sm font-bold transition-all rounded-xl shadow-lg " + (d.aiChallengeLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-xl') }, d.aiChallengeLoading ? '\u23F3 Generating...' : '\u2728 AI Challenge')
              )
            ) : h("div", { className: "space-y-3" },
              challengeQ.isAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full" }, "\uD83E\uDDE0 AI-GENERATED"),
              h("p", { className: "text-sm font-medium text-slate-700" }, challengeQ.question),
              h("input", { type: "text", value: challengeAnswer, onChange: function(e) { upd('challengeAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkChallenge(); }, placeholder: "Type your answer...", className: "w-full px-4 py-2 border border-slate-400 rounded-xl text-sm font-mono focus:border-violet-400", 'aria-label': 'Answer' }),
              h("div", { className: "flex gap-2 flex-wrap" },
                h("button", { onClick: checkChallenge, className: "px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all" }, "\u2713 Check"),
                h("button", { onClick: function() { updMulti({ challengeFeedback: '\uD83D\uDCA1 ' + (challengeQ.hint || 'No hint available') }); }, className: "px-4 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl" }, "\uD83D\uDCA1 Hint"),
                h("button", { onClick: generateChallenge, className: "px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl" }, "\u21BB Next"),
                callGemini && h("button", { onClick: function() {
                  upd('aiChallengeLoading', true);
                  var gradeCtx = gradeText('kindergarten', '3rd-5th grade', '6th-8th grade', '9th-12th grade AP Bio');
                  var prompt = 'Generate a genetics quiz question for ' + gradeCtx + '. DNA: ' + dnaSeq.substring(0, 12) + '. Return ONLY JSON: {"question":"...","answer":"...","hint":"..."}. Answer 1-3 words.';
                  callGemini(prompt, true, false, 0.7).then(function(r) {
                    try { var p = JSON.parse((typeof r === 'string' ? r : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim()); updMulti({ challengeQ: { type: 'ai', question: p.question, answer: p.answer, hint: p.hint || '', isAI: true }, challengeAnswer: '', challengeFeedback: '', aiChallengeLoading: false }); }
                    catch (e) { addToast('\u26A0\uFE0F Parse error', 'error'); upd('aiChallengeLoading', false); generateChallenge(); }
                  }).catch(function() { upd('aiChallengeLoading', false); generateChallenge(); });
                }, disabled: d.aiChallengeLoading, className: "px-3 py-2 text-sm font-bold rounded-xl ml-auto transition-all " + (d.aiChallengeLoading ? 'bg-purple-200 text-purple-400 cursor-wait' : 'bg-purple-50 text-purple-600 hover:bg-purple-100') }, d.aiChallengeLoading ? '\u23F3...' : '\u2728 AI Next')
              ),
              challengeFeedback && h("p", { className: "text-sm font-bold p-2 rounded-lg " + (challengeFeedback[0] === '\u2705' ? "bg-green-50 text-green-700" : challengeFeedback[0] === '\u274c' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"), role: "alert" }, challengeFeedback)
            )
          ),
          h("details", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, "\uD83D\uDCD6 Codon Reference Table"),
            h("div", { className: "p-3 grid grid-cols-4 gap-1 text-[11px] font-mono max-h-60 overflow-y-auto" },
              Object.keys(CODON_TABLE).sort().map(function(c2) { var aa2 = CODON_TABLE[c2]; var pr2 = AA_PROPS[aa2] || { color: '#888' }; return h("div", { key: c2, className: "flex items-center gap-1 px-1.5 py-0.5 rounded", style: { background: pr2.color + '15' } }, h("span", { style: { color: pr2.color }, className: "font-bold" }, c2), h("span", { className: "text-slate-200" }, "\u2192 " + aa2)); })
            )
          )
        ),

        // ═══════════════════════════════════════════
        // BATTLE TAB (NEW - Gene Defense)
        // ═══════════════════════════════════════════
        tab === 'battle' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-4 space-y-4" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\u2694\uFE0F"),
              h("h4", { className: "text-sm font-bold text-red-800" }, "Gene Defense Battle"),
              !battleDone && battleOrder.length > 0 && h("span", { className: "px-2 py-0.5 bg-red-200 text-red-800 text-[11px] font-bold rounded-full animate-pulse" }, "Round " + (battleRound + 1) + "/" + (battleUseAI ? 10 : BATTLE_QS.length) + (battleUseAI ? ' \uD83E\uDDE0' : ''))
            ),
            h("p", { className: "text-xs text-slate-600" }, gradeText(
              'A virus is attacking the cell! Answer genetics questions to fight it off!',
              'Defend the cell against an invading virus! Correct answers deal damage, wrong answers let the virus strike back.',
              'Use your genetics knowledge to defend against a viral pathogen. Each correct answer activates your immune response.',
              'Defend the cell against viral infection. Demonstrate mastery of molecular biology to mount an effective immune response.'
            )),

            // HP bars
            (battleOrder.length > 0 && !battleDone) && h("div", { className: "space-y-2" },
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-emerald-600 w-20" }, "\uD83D\uDEE1\uFE0F You"),
                h("div", { className: "flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden" },
                  h("div", { className: "bg-gradient-to-r from-emerald-500 to-green-400 h-4 rounded-full transition-all duration-500", style: { width: battlePlayerHP + '%' } }),
                  h("span", { className: "absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow" }, battlePlayerHP + ' HP')
                )
              ),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-red-600 w-20" }, "\uD83E\uDDA0 Virus"),
                h("div", { className: "flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden" },
                  h("div", { className: "bg-gradient-to-r from-red-500 to-orange-400 h-4 rounded-full transition-all duration-500", style: { width: battleEnemyHP + '%' } }),
                  h("span", { className: "absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow" }, battleEnemyHP + ' HP')
                )
              )
            ),

            // Start / question / done
            battleOrder.length === 0 ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl mb-2" }, "\u2694\uFE0F"),
              h("div", { className: "flex gap-2 justify-center flex-wrap" },
                h("button", { onClick: function() { startBattle(false); }, className: "px-6 py-3 text-sm font-bold bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" }, "\u2694\uFE0F Start Battle"),
                callGemini && h("button", { onClick: function() { startBattle(true); }, className: "px-6 py-3 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" }, "\u2728 AI Battle")
              )
            ) : battleDone ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl" }, battleWon ? '\uD83C\uDFC6' : '\uD83D\uDC80'),
              h("p", { className: "text-lg font-bold " + (battleWon ? 'text-emerald-700' : 'text-red-700') }, battleWon ? 'Victory! Cell Defended!' : 'Defeated! Virus Won!'),
              h("p", { className: "text-xs text-slate-600" }, 'Your HP: ' + battlePlayerHP + ' | Virus HP: ' + battleEnemyHP),
              battleFeedback && h("p", { className: "text-xs font-bold mt-1 " + (battleFeedback[0] === '\u2705' ? 'text-emerald-600' : 'text-red-600') }, battleFeedback),
              h("div", { className: "flex gap-2 justify-center mt-2" },
                h("button", { onClick: function() { startBattle(false); }, className: "px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all" }, "\u21BA Play Again"),
                callGemini && h("button", { onClick: function() { startBattle(true); }, className: "px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all" }, "\u2728 AI Rematch")
              )
            ) : h("div", { className: "space-y-3" },
              // Current question (static or AI)
              (function() {
                if (battleUseAI && d.battleAILoading) {
                  return h("div", { className: "text-center py-4" },
                    h("div", { className: "text-2xl animate-pulse mb-2" }, "\uD83E\uDDE0"),
                    h("p", { className: "text-xs text-purple-600 font-bold" }, "AI generating question...")
                  );
                }
                var q = getCurrentBattleQ();
                if (!q) return null;
                return h("div", { className: "space-y-3" },
                  battleUseAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full" }, "\uD83E\uDDE0 AI-GENERATED"),
                  h("p", { className: "text-sm font-medium text-slate-700" }, q.q),
                  h("input", { type: "text", value: battleAnswer, onChange: function(e) { upd('battleAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') battleAttack(); }, placeholder: "Type your answer...", className: "w-full px-4 py-2 border border-slate-400 rounded-xl text-sm font-mono focus:border-red-400", 'aria-label': 'Battle answer' }),
                  h("div", { className: "flex gap-2" },
                    h("button", { onClick: battleAttack, className: "px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all" }, "\u2694\uFE0F Attack!"),
                    h("button", { onClick: function() { updMulti({ battleFeedback: '\uD83D\uDCA1 ' + (q.h || 'No hint') }); }, className: "px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl" }, "\uD83D\uDCA1 Hint")
                  ),
                  battleFeedback && h("p", { className: "text-sm font-bold p-2 rounded-lg " + (battleFeedback[0] === '\u2705' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700") }, battleFeedback)
                );
              })()
            )
          )
        ),

        // ═══════════════════════════════════════════
        // LEARN TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'learn' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, "\uD83D\uDCDA Learn - Genetics Concepts"),
            h("p", { className: "text-xs text-slate-600 mb-4" }, "Explore key topics adapted to your grade level (" + gradeBand + ").")
          ),
          LEARN_TOPICS.map(function(topic) {
            var content = topic.content[gradeBand] || topic.content['3-5'];
            return h("div", { key: topic.title, className: "bg-white rounded-xl border border-slate-400 p-4 space-y-3" },
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-lg" }, topic.icon),
                h("h5", { className: "text-sm font-bold text-slate-700" }, topic.title)
              ),
              h("p", { className: "text-xs text-slate-600 leading-relaxed" }, content),
              h("div", { className: "flex gap-2 pt-2 border-t border-slate-100" },
                h("button", { onClick: function() { updMulti({ tab: topic.tryIt }); announceToSR('Switched to ' + topic.tryIt); }, className: "px-3 py-1.5 text-[11px] font-bold bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-all" }, '\uD83D\uDD2C Try It'),
                callTTS && h("button", { onClick: function() { callTTS(content); }, className: "px-3 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all" }, '\uD83D\uDD0A Read Aloud')
              )
            );
          })
        ),

        // SR status
        h("div", { className: "sr-only", role: "status", 'aria-live': "polite" }, "DNA Lab: " + tab + " view")
      );

      // ═══════════════════════════════════════════════════════════════════
      // DNA EXPANSION SECTIONS — interactive genetics reference (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      var d2 = (labToolData && labToolData.dna) || {};
      var expSection = d2.expSection || null;
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.dna) || {};
          return Object.assign({}, prev, { dna: Object.assign({}, prior, patch) });
        });
      }

      // ── Reference data ──
      var BASE_PAIRS = [
        { base: 'Adenine (A)', cat: 'Purine (2-ring)', pairs: 'Thymine (T) in DNA · Uracil (U) in RNA', bonds: '2 hydrogen bonds', icon: 'A', color: '#3b82f6', notes: 'One of the four DNA bases. Paired with T via 2 H-bonds — weaker than G-C.' },
        { base: 'Thymine (T)', cat: 'Pyrimidine (1-ring)', pairs: 'Adenine (A)', bonds: '2 hydrogen bonds', icon: 'T', color: '#ef4444', notes: 'DNA only — replaced by uracil in RNA. Methyl group at C5 distinguishes it from U.' },
        { base: 'Guanine (G)', cat: 'Purine (2-ring)', pairs: 'Cytosine (C)', bonds: '3 hydrogen bonds', icon: 'G', color: '#22c55e', notes: 'Stronger pairing than A-T due to 3 H-bonds. G-C rich regions are more thermally stable.' },
        { base: 'Cytosine (C)', cat: 'Pyrimidine (1-ring)', pairs: 'Guanine (G)', bonds: '3 hydrogen bonds', icon: 'C', color: '#f59e0b', notes: 'Pyrimidine. Subject to deamination → uracil (a major source of DNA damage).' },
        { base: 'Uracil (U)', cat: 'Pyrimidine (1-ring)', pairs: 'Adenine (A) in RNA', bonds: '2 hydrogen bonds', icon: 'U', color: '#a855f7', notes: 'RNA-only. Cheaper for cell to make than T; T more stable for genetic-info storage.' }
      ];

      var GENETIC_CODE = [
        { codon: 'AUG', aa: 'Met', name: 'Methionine', note: 'START codon' },
        { codon: 'UAA', aa: '—', name: 'STOP', note: 'ochre' },
        { codon: 'UAG', aa: '—', name: 'STOP', note: 'amber' },
        { codon: 'UGA', aa: '—', name: 'STOP', note: 'opal (sometimes selenocysteine)' },
        { codon: 'UUU/UUC', aa: 'Phe', name: 'Phenylalanine', note: 'Aromatic, hydrophobic' },
        { codon: 'UUA/UUG/CUx', aa: 'Leu', name: 'Leucine', note: '6 codons. Branched, hydrophobic.' },
        { codon: 'AUU/AUC/AUA', aa: 'Ile', name: 'Isoleucine', note: 'Branched, hydrophobic' },
        { codon: 'GUx', aa: 'Val', name: 'Valine', note: 'Branched, hydrophobic' },
        { codon: 'UCx/AGU/AGC', aa: 'Ser', name: 'Serine', note: 'Polar, hydroxyl side chain. Often phosphorylated.' },
        { codon: 'ACx', aa: 'Thr', name: 'Threonine', note: 'Polar, hydroxyl. Often phosphorylated.' },
        { codon: 'UAU/UAC', aa: 'Tyr', name: 'Tyrosine', note: 'Aromatic, polar' },
        { codon: 'UGU/UGC', aa: 'Cys', name: 'Cysteine', note: 'Forms disulfide bonds (S-S). Critical for protein folding.' },
        { codon: 'UGG', aa: 'Trp', name: 'Tryptophan', note: 'Aromatic, hydrophobic. Largest amino acid.' },
        { codon: 'CCx', aa: 'Pro', name: 'Proline', note: 'Rigid (ring). Disrupts α-helices.' },
        { codon: 'CAU/CAC', aa: 'His', name: 'Histidine', note: 'Basic side chain. Active site of many enzymes (pKa near 7).' },
        { codon: 'CAA/CAG', aa: 'Gln', name: 'Glutamine', note: 'Polar amide. Often surface-exposed.' },
        { codon: 'AAU/AAC', aa: 'Asn', name: 'Asparagine', note: 'Polar amide. Common N-glycosylation site.' },
        { codon: 'AAA/AAG', aa: 'Lys', name: 'Lysine', note: 'Basic, long side chain. Often acetylated/methylated.' },
        { codon: 'CGx/AGA/AGG', aa: 'Arg', name: 'Arginine', note: 'Basic, guanidinium group. 6 codons — most degenerate.' },
        { codon: 'GAU/GAC', aa: 'Asp', name: 'Aspartate', note: 'Acidic. Often active-site nucleophile.' },
        { codon: 'GAA/GAG', aa: 'Glu', name: 'Glutamate', note: 'Acidic. Most abundant in proteins.' },
        { codon: 'GGx', aa: 'Gly', name: 'Glycine', note: 'Smallest. No side chain — high flexibility.' },
        { codon: 'GCx', aa: 'Ala', name: 'Alanine', note: 'Small, hydrophobic. "Generic" residue.' }
      ];

      var DNA_REPLICATION_STEPS = [
        { step: 1, name: 'Initiation', enzymes: 'Helicase, SSBs, Topoisomerase', detail: 'Helicase unwinds the double helix at origins of replication. Single-strand binding proteins prevent re-annealing. Topoisomerase relieves the supercoiling tension ahead of the fork.' },
        { step: 2, name: 'Primer synthesis', enzymes: 'Primase (RNA polymerase)', detail: 'Primase lays down short (~10 nt) RNA primers — DNA polymerase needs a 3\'-OH to extend from, so it cannot start a new strand alone.' },
        { step: 3, name: 'Leading strand', enzymes: 'DNA polymerase III (prokaryotes) / Pol δ (eukaryotes)', detail: 'Synthesized continuously 5\'→3\' in the same direction as the replication fork moves. One primer per origin.' },
        { step: 4, name: 'Lagging strand (Okazaki fragments)', enzymes: 'DNA polymerase III / Pol δ + Pol α', detail: 'Synthesized in short 100–1000 nt fragments (Okazaki fragments) because polymerase can only extend 5\'→3\'. Each fragment needs its own primer.' },
        { step: 5, name: 'Primer removal + gap filling', enzymes: 'DNA polymerase I (prokaryotes) / RNase H + Pol δ (eukaryotes)', detail: 'RNA primers are excised and replaced with DNA nucleotides.' },
        { step: 6, name: 'Ligation', enzymes: 'DNA ligase', detail: 'Joins Okazaki fragments by forming the final phosphodiester bond.' },
        { step: 7, name: 'Proofreading', enzymes: 'DNA Pol III 3\'→5\' exonuclease', detail: 'Polymerase checks each base; mismatches removed and replaced. Lowers error rate from ~10⁻⁵ to ~10⁻⁷.' },
        { step: 8, name: 'Mismatch repair', enzymes: 'MutS, MutL, MutH (prokaryotes); MSH, MLH (eukaryotes)', detail: 'Catches the few mismatches that escape proofreading. Final error rate: ~10⁻¹⁰ per base pair.' }
      ];

      var TRANSCRIPTION_STEPS = [
        { step: 1, name: 'Initiation', detail: 'RNA polymerase binds the promoter (e.g., TATA box ~25 bp upstream of transcription start). Helps melt the DNA double helix.' },
        { step: 2, name: 'Elongation', detail: 'Polymerase reads template strand 3\'→5\', synthesizing mRNA 5\'→3\'. Adds ~30 nucleotides per second in bacteria; ~10-50 in eukaryotes.' },
        { step: 3, name: 'Termination', detail: 'Bacteria: rho-dependent or intrinsic termination (hairpin loop). Eukaryotes: cleavage and polyadenylation signals.' },
        { step: 4, name: '5\' capping (eukaryotes)', detail: '7-methylguanosine cap added to 5\' end. Helps ribosome recognize mRNA + protects from degradation.' },
        { step: 5, name: 'Splicing (eukaryotes)', detail: 'Introns removed, exons joined by the spliceosome. Alternative splicing → multiple proteins from one gene.' },
        { step: 6, name: 'Polyadenylation (eukaryotes)', detail: '~100-250 adenine nucleotides added to 3\' end. Stabilizes mRNA + signals export.' },
        { step: 7, name: 'Nuclear export (eukaryotes)', detail: 'Mature mRNA exits through nuclear pore complexes to the cytoplasm.' }
      ];

      var TRANSLATION_STEPS = [
        { step: 1, name: 'Initiation', detail: 'Small ribosomal subunit binds mRNA. Initiator tRNA (carrying Met) binds AUG start codon. Large subunit joins.' },
        { step: 2, name: 'Elongation', detail: 'Each cycle: aminoacyl-tRNA enters A site → peptide bond forms (catalyzed by 23S rRNA, a ribozyme) → ribosome translocates one codon → tRNA shifts A→P→E.' },
        { step: 3, name: 'Termination', detail: 'Stop codon (UAA/UAG/UGA) recognized by release factors. Peptide released, ribosome dissociates.' },
        { step: 4, name: 'Folding + modification', detail: 'Chaperones (Hsp70, GroEL) help proteins fold correctly. Post-translational modifications: phosphorylation, glycosylation, cleavage, disulfide bonds.' }
      ];

      var MUTATION_TYPES = [
        { type: 'Substitution (point)', subtype: 'Silent', desc: 'Codon changes but amino acid is the same (genetic code redundancy). No effect.' },
        { type: 'Substitution (point)', subtype: 'Missense', desc: 'Codon changes → different amino acid. Effect ranges from none (conservative substitution) to severe (sickle cell: Glu→Val).' },
        { type: 'Substitution (point)', subtype: 'Nonsense', desc: 'Codon changes → STOP codon. Truncated protein, usually non-functional.' },
        { type: 'Insertion', subtype: 'Frameshift (if not ÷3)', desc: 'Adds nucleotide(s). If not a multiple of 3, shifts reading frame → all downstream codons changed. Usually severe.' },
        { type: 'Deletion', subtype: 'Frameshift (if not ÷3)', desc: 'Removes nucleotide(s). Same frameshift consequence as insertion.' },
        { type: 'Duplication', subtype: 'Gene/chromosome', desc: 'Extra copies of a gene or region. Can lead to dosage effects (Down syndrome = extra chrom 21).' },
        { type: 'Inversion', subtype: 'Chromosomal', desc: 'Segment of chromosome flipped. May disrupt genes at breakpoints.' },
        { type: 'Translocation', subtype: 'Chromosomal', desc: 'Segment moves to a different chromosome. Famous: Philadelphia chromosome (CML; BCR-ABL fusion).' },
        { type: 'Repeat expansion', subtype: 'Trinucleotide repeat', desc: 'Repeating unit (e.g., CAG) expands across generations. Huntington\'s (CAG repeats in HTT), fragile X (CGG in FMR1), myotonic dystrophy.' }
      ];

      var CHROMOSOMES = [
        { name: 'Human autosomes', count: '22 pairs', detail: 'Pairs 1-22 (numbered roughly by size, with exceptions: chr 21 is smaller than chr 22).' },
        { name: 'Sex chromosomes', count: '1 pair', detail: 'XX (female) or XY (male). Y is much smaller, carries few genes (~70) vs X (~800).' },
        { name: 'Total human chromosomes', count: '46', detail: '23 pairs (diploid in somatic cells). Gametes are haploid (23 chromosomes, no pairs).' },
        { name: 'Total human genes', count: '~20,000', detail: 'Surprisingly few — many genes produce multiple proteins via alternative splicing. Much of the genome is regulatory or non-coding.' },
        { name: 'Total base pairs (haploid)', count: '~3.2 billion', detail: 'If stretched out, ~1.8 m of DNA per cell. Packed into a nucleus ~10 µm across via histones + supercoiling.' },
        { name: 'Mitochondrial DNA', count: '16,569 bp (circular)', detail: 'Maternally inherited. Codes for 37 genes (13 proteins, 22 tRNAs, 2 rRNAs). Multiple copies per mitochondrion.' }
      ];

      var DNA_VS_RNA = [
        { feature: 'Sugar', dna: 'Deoxyribose (no -OH at 2\')', rna: 'Ribose (-OH at 2\')' },
        { feature: 'Bases', dna: 'A, T, G, C', rna: 'A, U, G, C (uracil replaces thymine)' },
        { feature: 'Strands', dna: 'Double-stranded helix', rna: 'Usually single-stranded; can fold into 3D structures' },
        { feature: 'Stability', dna: 'Very stable; long-term info storage', rna: 'Less stable (the 2\'-OH makes it susceptible to hydrolysis)' },
        { feature: 'Length', dna: 'Very long (chromosomes)', rna: 'Short to medium; mRNA up to ~kb, rRNA few kb' },
        { feature: 'Location', dna: 'Mostly nucleus (eukaryotes) + mitochondria', rna: 'Nucleus, cytoplasm, ribosomes' },
        { feature: 'Function', dna: 'Genetic blueprint', rna: 'mRNA (messenger), tRNA (transfer), rRNA (ribosomal), regulatory (miRNA, lncRNA)' }
      ];

      var BIOTECH_TOOLS = [
        { name: 'PCR (Polymerase Chain Reaction)', invented: '1983 (Kary Mullis)', desc: 'Amplifies a specific DNA segment by 2ⁿ (n cycles). Uses heat-stable Taq polymerase. Foundation of modern molecular biology.' },
        { name: 'Sanger sequencing', invented: '1977 (Frederick Sanger)', desc: 'Reads DNA sequence using chain-terminating dideoxynucleotides. Read length ~800-1000 bp. Now largely replaced by next-gen sequencing.' },
        { name: 'Next-gen sequencing (NGS)', invented: '2005+ (multiple)', desc: 'Massively parallel — sequences millions of fragments simultaneously. Illumina dominates. ~100-300 bp reads, billions per run.' },
        { name: 'CRISPR-Cas9', invented: '2012 (Doudna, Charpentier, Zhang)', desc: 'Programmable gene editing. Guide RNA targets Cas9 nuclease to specific DNA. Cuts allow gene knockout or HDR-mediated insertion. Nobel 2020.' },
        { name: 'CRISPR base editing', invented: '2016 (Liu lab)', desc: 'Edits a single base without double-strand break. Lower off-target effects than Cas9.' },
        { name: 'Restriction enzymes', invented: '1970s (Smith, Nathans, Arber)', desc: 'Bacterial proteins that cut DNA at specific 4-8 bp sequences. Enabled recombinant DNA technology. Nobel 1978.' },
        { name: 'DNA ligase', invented: '1967', desc: 'Joins DNA fragments via phosphodiester bonds. T4 DNA ligase is the workhorse for cloning.' },
        { name: 'Gel electrophoresis', invented: '1960s', desc: 'Separates DNA fragments by size in an electric field. Smaller fragments migrate faster through gel matrix.' },
        { name: 'Microarrays', invented: '1990s', desc: 'Thousands of DNA probes on a chip. Measure gene expression or detect SNPs in parallel.' },
        { name: 'Single-cell RNA-seq', invented: '2009+', desc: 'Sequences mRNA from individual cells. Reveals cell-type heterogeneity that bulk RNA-seq misses.' },
        { name: 'Cryo-EM for nucleic acids', invented: '2010s+ (revolution)', desc: 'Near-atomic structures of RNA/DNA complexes without crystallization. Particularly powerful for ribosomes, spliceosomes, replisomes.' },
        { name: 'Long-read sequencing (PacBio, Nanopore)', invented: '2010s', desc: 'Read lengths up to 100kb+ (vs Illumina\'s ~300bp). Better for structural variants, repeats, full-length transcripts.' }
      ];

      var DISEASES_AND_GENES = [
        { disease: 'Sickle cell anemia', gene: 'HBB (β-globin)', mutation: 'Glu6Val (GAG→GTG)', inheritance: 'Autosomal recessive', notes: 'Heterozygotes have malaria resistance — balanced polymorphism in malaria-endemic regions.' },
        { disease: 'Cystic fibrosis', gene: 'CFTR (chloride channel)', mutation: 'ΔF508 (Phe508 deletion, most common); 1900+ known mutations', inheritance: 'Autosomal recessive', notes: 'Carrier frequency ~1/25 in Europeans. Thick mucus in lungs + pancreas + gut.' },
        { disease: 'Huntington disease', gene: 'HTT', mutation: 'CAG repeat expansion (≥36 repeats)', inheritance: 'Autosomal dominant', notes: 'Anticipation: repeats expand across generations, earlier onset in offspring.' },
        { disease: 'BRCA-related breast/ovarian cancer', gene: 'BRCA1, BRCA2', mutation: '1000+ pathogenic variants', inheritance: 'Autosomal dominant (high penetrance)', notes: '60-85% lifetime breast cancer risk if pathogenic variant present. PARP inhibitors therapeutic.' },
        { disease: 'Phenylketonuria (PKU)', gene: 'PAH', mutation: '500+ variants', inheritance: 'Autosomal recessive', notes: 'Newborn screening (Guthrie test) — early dietary management (low Phe) prevents intellectual disability.' },
        { disease: 'Down syndrome', gene: 'Whole chr 21 (trisomy)', mutation: 'Three copies of chr 21', inheritance: 'Sporadic (non-disjunction)', notes: 'Most common autosomal aneuploidy. Risk increases with maternal age.' },
        { disease: 'Tay-Sachs disease', gene: 'HEXA', mutation: 'Various (1278insTATC common in Ashkenazi)', inheritance: 'Autosomal recessive', notes: 'Founder effect in Ashkenazi Jewish (~1/27 carriers) and French Canadian populations.' },
        { disease: 'Hemophilia A', gene: 'F8 (factor VIII)', mutation: 'Inversions, deletions, points', inheritance: 'X-linked recessive', notes: 'Mostly affects males. Famous in European royal families via Queen Victoria.' },
        { disease: 'Duchenne muscular dystrophy', gene: 'DMD (dystrophin)', mutation: 'Large deletions common', inheritance: 'X-linked recessive', notes: 'Largest gene known (~2.4 Mb, ~99% introns). Boys typically wheelchair-bound by adolescence.' },
        { disease: 'Lactose intolerance (adults)', gene: 'LCT (lactase)', mutation: 'Regulatory SNP (rs4988235) keeps gene "on" in adults', inheritance: 'Variable by population', notes: 'Persistence (continuing to make lactase as adult) is the derived trait — appeared with dairy-farming cultures.' }
      ];

      var EVOLUTION_CONCEPTS = [
        { concept: 'Natural selection', detail: 'Differential reproduction based on heritable variation. Genes that improve survival/reproduction become more common over generations.' },
        { concept: 'Mutation', detail: 'Random source of new genetic variation. Most are neutral or harmful; rarely beneficial. Substrate for selection.' },
        { concept: 'Genetic drift', detail: 'Random changes in allele frequency, especially in small populations. Founder effect + bottlenecks are extreme cases.' },
        { concept: 'Gene flow', detail: 'Movement of alleles between populations via migration. Reduces between-population differences; increases within-population diversity.' },
        { concept: 'Speciation', detail: 'Formation of new species, usually via reproductive isolation. Allopatric (geographic separation) most common.' },
        { concept: 'Convergent evolution', detail: 'Unrelated organisms evolve similar traits independently (wings in birds + bats + insects; eyes in vertebrates + cephalopods).' },
        { concept: 'Common ancestry', detail: 'All life shares a common ancestor (LUCA). Evidence: shared genetic code, ribosomes, ATP, glycolysis, basic biochemistry.' },
        { concept: 'Phylogenetic tree', detail: 'Diagram showing evolutionary relationships. Increasingly built from DNA sequence comparisons rather than morphology.' },
        { concept: 'Hardy-Weinberg equilibrium', detail: 'Allele frequencies stay constant under no-evolution assumptions: large pop, random mating, no selection/mutation/migration/drift. p² + 2pq + q² = 1.' }
      ];

      var DNA_GLOSSARY = [
        { term: 'Gene', def: 'A segment of DNA that codes for a functional product (protein or RNA).' },
        { term: 'Allele', def: 'A variant of a gene. Different alleles can produce different versions of the same trait.' },
        { term: 'Genotype', def: 'The complete set of alleles an organism has.' },
        { term: 'Phenotype', def: 'The observable traits — result of genotype + environment + chance.' },
        { term: 'Homozygous', def: 'Two identical alleles at a locus (AA or aa).' },
        { term: 'Heterozygous', def: 'Two different alleles at a locus (Aa).' },
        { term: 'Dominant allele', def: 'Expressed in heterozygote. Capital letter (A).' },
        { term: 'Recessive allele', def: 'Only expressed in homozygote (aa). Lowercase (a).' },
        { term: 'Codominance', def: 'Both alleles fully expressed in heterozygote (ABO blood: AB shows both A + B antigens).' },
        { term: 'Incomplete dominance', def: 'Heterozygote has intermediate phenotype (red × white → pink flowers).' },
        { term: 'Locus', def: 'Specific physical location of a gene on a chromosome.' },
        { term: 'Genome', def: 'Complete set of an organism\'s DNA. Human ~3.2 billion bp.' },
        { term: 'Chromosome', def: 'Single, long, condensed DNA molecule with associated proteins (mainly histones).' },
        { term: 'Chromatin', def: 'DNA + protein in the nucleus. Euchromatin (loose, active) vs heterochromatin (condensed, inactive).' },
        { term: 'Exon', def: 'Coding region of a gene; retained in mature mRNA.' },
        { term: 'Intron', def: 'Non-coding region of a gene; removed by splicing.' },
        { term: 'Promoter', def: 'DNA sequence where RNA polymerase binds to start transcription. ~25-100 bp upstream of gene.' },
        { term: 'Codon', def: 'Three-nucleotide sequence specifying one amino acid (or stop signal). 64 possible codons.' },
        { term: 'Anticodon', def: 'Three-nucleotide sequence on tRNA that pairs with mRNA codon during translation.' },
        { term: 'Ribosome', def: 'Cellular machine that synthesizes proteins. Made of rRNA + proteins. Catalytic activity is in the 23S rRNA — it\'s a ribozyme.' },
        { term: 'tRNA', def: 'Transfer RNA. Adapter molecule that carries amino acids to the ribosome based on codon-anticodon pairing.' },
        { term: 'mRNA', def: 'Messenger RNA. Carries genetic code from DNA to ribosomes for translation.' },
        { term: 'rRNA', def: 'Ribosomal RNA. Structural + catalytic component of ribosomes. Most abundant RNA in cells.' },
        { term: 'siRNA / miRNA', def: 'Small interfering / microRNA. Regulatory RNAs that silence gene expression via RNAi pathway. Therapeutic + research tools.' },
        { term: 'Plasmid', def: 'Small, circular DNA found in bacteria, separate from chromosomes. Often carries antibiotic resistance. Workhorse of molecular cloning.' },
        { term: 'Karyotype', def: 'Visual representation of an individual\'s full chromosome set. Reveals numerical or large structural abnormalities.' },
        { term: 'Pedigree', def: 'Diagram tracing a trait through a family tree. Reveals inheritance pattern (dominant/recessive, autosomal/sex-linked).' },
        { term: 'Epigenetics', def: 'Heritable changes in gene expression NOT caused by changes in DNA sequence. Methylation, histone modification, etc.' },
        { term: 'Telomere', def: 'Repetitive DNA at chromosome ends (TTAGGG in vertebrates). Shortens with each division — linked to aging.' },
        { term: 'Centromere', def: 'Constricted region where sister chromatids attach. Site of kinetochore + spindle attachment during cell division.' }
      ];

      function expHeader() {
        return h('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-emerald-900' }, '🧬 Genetics Reference Library'),
            h('div', { className: 'text-[11px] text-emerald-700 mt-0.5' }, 'Interactive references — pick a topic below to explore.')
          ),
          expSection && h('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'px-3 py-1 rounded-md text-xs font-bold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
          }, '✕ Close section')
        );
      }

      function expTabBar() {
        var sections = [
          { id: 'bases', label: 'Base pairs', icon: '🅰🅣' },
          { id: 'code', label: 'Genetic code', icon: '🔡' },
          { id: 'replication', label: 'DNA replication', icon: '🔄' },
          { id: 'transcription', label: 'Transcription', icon: '✍' },
          { id: 'translation', label: 'Translation', icon: '🏭' },
          { id: 'mutations', label: 'Mutations', icon: '⚠' },
          { id: 'chromosomes', label: 'Chromosomes', icon: '🧬' },
          { id: 'dnarna', label: 'DNA vs RNA', icon: '⇌' },
          { id: 'biotech', label: 'Biotech tools', icon: '🔬' },
          { id: 'diseases', label: 'Disease genes', icon: '🏥' },
          { id: 'evolution', label: 'Evolution', icon: '🌳' },
          { id: 'genomes', label: 'Genome sizes', icon: '📏' },
          { id: 'meiosis', label: 'Meiosis vs mitosis', icon: '⊞' },
          { id: 'mendel', label: 'Mendelian genetics', icon: '🫛' },
          { id: 'epigenetics', label: 'Epigenetics', icon: '✎' },
          { id: 'amino', label: 'Amino acids', icon: '⚕' },
          { id: 'organelles', label: 'Cell organelles', icon: '🔬' },
          { id: 'celltypes', label: 'Cell types', icon: '🧫' },
          { id: 'sequencing', label: 'Sequencing tech', icon: '📊' },
          { id: 'ethics', label: 'Bioethics', icon: '⚖' },
          { id: 'famous', label: 'History', icon: '🕰' },
          { id: 'pcr', label: 'PCR + lab', icon: '🧪' },
          { id: 'crispr', label: 'CRISPR detail', icon: '✂' },
          { id: 'viruses', label: 'Virus families', icon: '🦠' },
          { id: 'microbiome', label: 'Microbiome', icon: '🦠' },
          { id: 'devel', label: 'Embryology', icon: '🥚' },
          { id: 'cancer', label: 'Cancer biology', icon: '⚕' },
          { id: 'immunity', label: 'Immune system', icon: '🛡' },
          { id: 'neuro', label: 'Neuroscience', icon: '🧠' },
          { id: 'tree', label: 'Tree of life', icon: '🌳' },
          { id: 'biotech2', label: 'Biotech apps', icon: '💉' },
          { id: 'glossary', label: 'Glossary', icon: '📖' }
        ];
        return h('div', { className: 'flex flex-wrap gap-1.5 mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200' },
          sections.map(function(s) {
            var active = expSection === s.id;
            return h('button', {
              key: s.id,
              onClick: function() { setExp({ expSection: active ? null : s.id }); },
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300')
            }, s.icon + ' ' + s.label);
          })
        );
      }

      function renderBasesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🅰🅣 DNA + RNA bases'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Five nitrogenous bases make up DNA + RNA: A, T, G, C (DNA); A, U, G, C (RNA). Purines (A, G) are 2-ringed; pyrimidines (T, U, C) are 1-ringed. Pairing follows specific H-bond patterns.'),
          h('div', { className: 'space-y-2' },
            BASE_PAIRS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-center gap-3 mb-1' },
                  h('div', { className: 'w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg', style: { background: b.color } }, b.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'text-sm font-black text-slate-800' }, b.base),
                    h('div', { className: 'text-[11px] text-slate-600' }, b.cat + ' · ' + b.bonds)
                  )
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Pairs with: '), b.pairs),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.notes)
              );
            })
          )
        );
      }

      function renderCodeSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔡 Genetic code — codon table'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, '64 codons (4³) encode 20 amino acids + 3 stop signals. Code is redundant (degenerate) — most amino acids have multiple codons, usually differing in the 3rd position ("wobble"). Universal across nearly all life.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Codon(s)', 'AA', 'Name', 'Note'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                GENETIC_CODE.map(function(g, i) {
                  var isStop = g.aa === '—';
                  var isStart = g.note === 'START codon';
                  return h('tr', { key: 'g'+i, className: isStop ? 'bg-red-50' : isStart ? 'bg-emerald-50' : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50') },
                    h('td', { className: 'px-2 py-1 text-slate-800 font-mono font-bold' }, g.codon),
                    h('td', { className: 'px-2 py-1 text-slate-800 font-mono font-bold' }, g.aa),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, g.name),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, g.note)
                  );
                })
              )
            )
          ),
          h('div', { className: 'mt-3 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            h('strong', null, '💡 Wobble: '), 'Third codon position pairs less strictly — a single tRNA can recognize multiple codons. Reduces the number of tRNAs needed (cells have ~30-40, not 64).'
          )
        );
      }

      function renderReplicationSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔄 DNA replication'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Semi-conservative — each new helix has one parent + one newly-synthesized strand. Proven by Meselson-Stahl 1958. ~50 bp/sec in bacteria, ~50 bp/sec per fork in eukaryotes (but thousands of forks in parallel).'),
          h('div', { className: 'space-y-2' },
            DNA_REPLICATION_STEPS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-base font-black text-emerald-700 min-w-[28px] mt-0.5' }, s.step),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-0.5' }, s.name),
                  h('div', { className: 'text-[10px] font-bold text-emerald-700 mb-1' }, 'Enzymes: ', s.enzymes),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
                )
              );
            })
          )
        );
      }

      function renderTranscriptionSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '✍ Transcription (DNA → RNA)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'RNA polymerase reads DNA template (3\'→5\') and synthesizes mRNA (5\'→3\'). In eukaryotes, the primary transcript is heavily processed before export.'),
          h('div', { className: 'space-y-2' },
            TRANSCRIPTION_STEPS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-base font-black text-emerald-700 min-w-[28px] mt-0.5' }, s.step),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-0.5' }, s.name),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
                )
              );
            })
          )
        );
      }

      function renderTranslationSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏭 Translation (mRNA → protein)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Ribosome reads mRNA in 3-base codons and builds protein. ~10-20 amino acids per second in bacteria; ~3-5 in eukaryotes. Multiple ribosomes can translate the same mRNA (polyribosome).'),
          h('div', { className: 'space-y-2' },
            TRANSLATION_STEPS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-base font-black text-emerald-700 min-w-[28px] mt-0.5' }, s.step),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-0.5' }, s.name),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
                )
              );
            })
          )
        );
      }

      function renderMutationsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚠ Mutation types'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Mutations range from invisible (silent) to lethal. Their effect depends on what changes, where, and in which cell type (germline vs somatic).'),
          h('div', { className: 'space-y-2' },
            MUTATION_TYPES.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, m.type),
                  h('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-800' }, m.subtype)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.desc)
              );
            })
          )
        );
      }

      function renderChromosomesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧬 Human chromosomes + genome'),
          h('div', { className: 'space-y-2' },
            CHROMOSOMES.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'flex items-baseline gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'min-w-[180px]' },
                  h('div', { className: 'text-[12px] font-black text-slate-800' }, c.name),
                  h('div', { className: 'text-[10px] font-bold text-emerald-700 font-mono' }, c.count)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed flex-1' }, c.detail)
              );
            })
          )
        );
      }

      function renderDnaRnaSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⇌ DNA vs RNA'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Feature', 'DNA', 'RNA'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                DNA_VS_RNA.map(function(d, i) {
                  return h('tr', { key: 'd'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 text-slate-800 font-bold' }, d.feature),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, d.dna),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, d.rna)
                  );
                })
              )
            )
          )
        );
      }

      function renderBiotechSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔬 Biotech tools'),
          h('div', { className: 'space-y-1.5' },
            BIOTECH_TOOLS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, t.name),
                  h('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 italic' }, t.invented)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.desc)
              );
            })
          )
        );
      }

      function renderDiseasesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏥 Disease-causing genes (examples)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'A sampling of well-characterized genetic disorders. Genetic counseling resources and current treatments evolve — verify with current literature for clinical decisions.'),
          h('div', { className: 'space-y-2' },
            DISEASES_AND_GENES.map(function(d, i) {
              return h('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, d.disease),
                  h('span', { className: 'text-[10px] font-mono ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-800' }, d.gene)
                ),
                h('div', { className: 'text-[11px] text-slate-600 mb-1' }, h('strong', null, 'Inheritance: '), d.inheritance),
                h('div', { className: 'text-[11px] text-slate-600 mb-1' }, h('strong', null, 'Mutation: '), d.mutation),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed italic' }, d.notes)
              );
            })
          )
        );
      }

      function renderEvolutionSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌳 Evolution concepts'),
          h('div', { className: 'space-y-1.5' },
            EVOLUTION_CONCEPTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, c.concept),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      function renderGlossarySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 Genetics glossary'),
          h('div', { className: 'space-y-1' },
            DNA_GLOSSARY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900' }, g.term),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — Additional genetics references (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var GENOME_SIZES = [
        { organism: 'φX174 (bacteriophage)', size: '~5,400 bp', genes: '11', notes: 'One of the smallest. First DNA genome sequenced (Sanger, 1977).' },
        { organism: 'HIV-1', size: '~9,700 bp', genes: '9', notes: 'RNA genome. Compact, with overlapping reading frames.' },
        { organism: 'E. coli', size: '~4.6 million bp', genes: '~4,300', notes: 'Workhorse of molecular biology. Circular chromosome.' },
        { organism: 'Yeast (S. cerevisiae)', size: '~12 million bp', genes: '~6,000', notes: 'First eukaryote sequenced (1996). 16 chromosomes.' },
        { organism: 'C. elegans (roundworm)', size: '~100 million bp', genes: '~20,000', notes: 'First multicellular sequenced. Cell-by-cell fate mapped.' },
        { organism: 'Fruit fly (D. melanogaster)', size: '~140 million bp', genes: '~14,000', notes: 'Classic genetics model. Polytene chromosomes.' },
        { organism: 'Arabidopsis (plant model)', size: '~135 million bp', genes: '~27,500', notes: 'First plant sequenced (2000).' },
        { organism: 'Pufferfish (Takifugu)', size: '~390 million bp', genes: '~22,000', notes: 'Compact vertebrate genome — little "junk" DNA.' },
        { organism: 'Human', size: '~3.0 billion bp', genes: '~20,000', notes: 'Reference draft 2001. Telomere-to-telomere finished 2022.' },
        { organism: 'Wheat', size: '~16 billion bp', genes: '~108,000', notes: 'Hexaploid (6 copies). Much larger than human.' },
        { organism: 'Axolotl (salamander)', size: '~32 billion bp', genes: '~23,000', notes: 'One of the largest sequenced. Lots of repetitive DNA.' },
        { organism: 'Paris japonica (plant)', size: '~150 billion bp', genes: 'unknown', notes: 'Largest known eukaryotic genome. ~50× bigger than human.' }
      ];

      var MEIOSIS_VS_MITOSIS = [
        { feature: 'Purpose', mitosis: 'Growth, repair, asexual reproduction', meiosis: 'Produce gametes (sperm, egg) for sexual reproduction' },
        { feature: 'Divisions', mitosis: '1', meiosis: '2 (meiosis I + meiosis II)' },
        { feature: 'Daughter cells', mitosis: '2', meiosis: '4' },
        { feature: 'Daughter chromosome count', mitosis: 'Same as parent (diploid → diploid)', meiosis: 'Half of parent (diploid → haploid)' },
        { feature: 'Genetic variation', mitosis: 'None (clones, barring mutations)', meiosis: 'Crossing over + independent assortment = huge variation' },
        { feature: 'Homologous pairing', mitosis: 'No', meiosis: 'Yes (synapsis in prophase I)' },
        { feature: 'Crossing over', mitosis: 'No', meiosis: 'Yes — exchanges DNA between homologs' },
        { feature: 'Where it happens', mitosis: 'All somatic cells', meiosis: 'Only germ cells (gonads)' }
      ];

      var MENDEL_LAWS = [
        { name: 'Law of Segregation', description: 'During gamete formation, the two alleles for each gene separate so each gamete carries only one allele.', example: 'Pea plant Tt (heterozygous) produces ½ T gametes and ½ t gametes.' },
        { name: 'Law of Independent Assortment', description: 'Alleles for different genes assort independently of one another during gamete formation (genes on different chromosomes).', example: 'A TtYy plant produces TY, Ty, tY, ty gametes in equal proportions.' },
        { name: 'Law of Dominance', description: 'When two different alleles are present, one (dominant) is expressed while the other (recessive) is masked.', example: 'In peas, purple (P) is dominant to white (p). Pp plants are purple.' }
      ];

      var MENDEL_RATIOS = [
        { cross: 'Monohybrid (Aa × Aa)', phenotype: '3:1', genotype: '1 AA : 2 Aa : 1 aa', notes: 'Classic dominance pattern.' },
        { cross: 'Dihybrid (AaBb × AaBb)', phenotype: '9:3:3:1', genotype: '16 combinations', notes: 'Independent assortment of two genes.' },
        { cross: 'Test cross (Aa × aa)', phenotype: '1:1', genotype: '1 Aa : 1 aa', notes: 'Used to determine if dominant phenotype is heterozygous or homozygous.' },
        { cross: 'Incomplete dominance (RR × WW)', phenotype: 'All pink', genotype: 'All RW', notes: 'Heterozygotes show blended phenotype. Snapdragons, four o\'clocks.' },
        { cross: 'Codominance (IᴬIᴮ blood type)', phenotype: 'AB blood', genotype: 'Both alleles expressed', notes: 'Both alleles fully expressed. Roan cattle (red + white = roan).' },
        { cross: 'X-linked recessive (carrier female)', phenotype: 'Affected sons (50%)', genotype: 'XᴬXᵃ × XᴬY', notes: 'Pattern for hemophilia, color blindness, DMD.' }
      ];

      var EPIGENETIC_MECHANISMS = [
        { mechanism: 'DNA methylation', description: 'Methyl group (–CH₃) added to cytosines, especially at CpG islands. Generally silences gene expression.', example: 'Methylation of tumor-suppressor gene promoters can drive cancer.' },
        { mechanism: 'Histone modifications', description: 'Acetylation, methylation, phosphorylation of histone tails. Changes chromatin packing.', example: 'Histone acetylation → open chromatin → active transcription. Deacetylation → silent.' },
        { mechanism: 'Chromatin remodeling', description: 'ATP-dependent complexes slide or eject nucleosomes to expose DNA.', example: 'SWI/SNF complex repositions nucleosomes during gene activation.' },
        { mechanism: 'Non-coding RNA', description: 'miRNA, lncRNA regulate gene expression post-transcriptionally.', example: 'XIST lncRNA coats one X chromosome in females → X-inactivation.' },
        { mechanism: 'Genomic imprinting', description: 'Some genes expressed only from maternal or paternal allele. Methylation marks.', example: 'IGF2 expressed only from paternal allele; H19 only from maternal.' },
        { mechanism: 'Trans-generational inheritance', description: 'Some epigenetic marks survive gametogenesis and pass to offspring.', example: 'Dutch Hunger Winter (1944-45) descendants show altered metabolism, methylation patterns.' }
      ];

      var AMINO_ACIDS = [
        { letter: 'A', three: 'Ala', name: 'Alanine', side: 'Nonpolar, hydrophobic', notes: 'Smallest after glycine. Common in protein cores.' },
        { letter: 'R', three: 'Arg', name: 'Arginine', side: 'Basic, positively charged', notes: 'Long side chain. Binds DNA/RNA (negatively charged).' },
        { letter: 'N', three: 'Asn', name: 'Asparagine', side: 'Polar, uncharged', notes: 'Can be glycosylated. Hydrogen bonds with water.' },
        { letter: 'D', three: 'Asp', name: 'Aspartate', side: 'Acidic, negatively charged', notes: 'Active site of many enzymes.' },
        { letter: 'C', three: 'Cys', name: 'Cysteine', side: 'Polar, contains –SH', notes: 'Forms disulfide bonds (S-S) — stabilize protein folds.' },
        { letter: 'E', three: 'Glu', name: 'Glutamate', side: 'Acidic, negatively charged', notes: 'Important neurotransmitter (in brain).' },
        { letter: 'Q', three: 'Gln', name: 'Glutamine', side: 'Polar, uncharged', notes: 'Most abundant amino acid in blood.' },
        { letter: 'G', three: 'Gly', name: 'Glycine', side: 'Nonpolar, smallest', notes: 'No side chain (just –H). Found in tight turns + collagen.' },
        { letter: 'H', three: 'His', name: 'Histidine', side: 'Basic, can be neutral or +', notes: 'pKa near 6 — important in enzyme active sites (proton transfer).' },
        { letter: 'I', three: 'Ile', name: 'Isoleucine', side: 'Nonpolar, hydrophobic', notes: 'Branched chain. Essential.' },
        { letter: 'L', three: 'Leu', name: 'Leucine', side: 'Nonpolar, hydrophobic', notes: 'Most common in proteins. Branched chain. Essential.' },
        { letter: 'K', three: 'Lys', name: 'Lysine', side: 'Basic, positively charged', notes: 'Long side chain. Often modified (acetylation, methylation) in histones.' },
        { letter: 'M', three: 'Met', name: 'Methionine', side: 'Nonpolar, contains S', notes: 'Start codon. Sulfur in side chain. Essential.' },
        { letter: 'F', three: 'Phe', name: 'Phenylalanine', side: 'Nonpolar, aromatic', notes: 'Benzene ring. Hydrophobic core of proteins. Essential.' },
        { letter: 'P', three: 'Pro', name: 'Proline', side: 'Special — cyclic', notes: 'Side chain loops back to N. Creates kinks in protein chain.' },
        { letter: 'S', three: 'Ser', name: 'Serine', side: 'Polar, contains –OH', notes: 'Active site of serine proteases. Phosphorylation target.' },
        { letter: 'T', three: 'Thr', name: 'Threonine', side: 'Polar, contains –OH', notes: 'Phosphorylation target. Essential.' },
        { letter: 'W', three: 'Trp', name: 'Tryptophan', side: 'Nonpolar, aromatic', notes: 'Largest amino acid. Fluorescent — used for protein detection. Essential.' },
        { letter: 'Y', three: 'Tyr', name: 'Tyrosine', side: 'Polar, aromatic with –OH', notes: 'Phosphorylation target in signaling.' },
        { letter: 'V', three: 'Val', name: 'Valine', side: 'Nonpolar, hydrophobic', notes: 'Branched chain. Sickle cell anemia: Glu→Val mutation in β-globin. Essential.' }
      ];

      var ORGANELLES = [
        { name: 'Nucleus', function: 'Houses DNA, controls gene expression, site of transcription', notes: 'Surrounded by double membrane (nuclear envelope). Pores allow regulated transport.' },
        { name: 'Nucleolus', function: 'Produces ribosomal RNA + assembles ribosomes', notes: 'Dense region within the nucleus. Not membrane-bound.' },
        { name: 'Mitochondrion', function: 'Cellular respiration → ATP production', notes: 'Has own DNA (mtDNA, ~16,500 bp in humans). Maternally inherited. Endosymbiotic origin.' },
        { name: 'Chloroplast (plants)', function: 'Photosynthesis: light energy → glucose', notes: 'Has own DNA. Contains chlorophyll. Endosymbiotic origin (cyanobacterium).' },
        { name: 'Endoplasmic reticulum (rough)', function: 'Protein synthesis (ribosomes on surface), modification', notes: 'Continuous with nuclear envelope.' },
        { name: 'Endoplasmic reticulum (smooth)', function: 'Lipid synthesis, detoxification, calcium storage', notes: 'No ribosomes. Abundant in liver cells.' },
        { name: 'Golgi apparatus', function: 'Modifies, sorts, packages proteins for secretion or delivery', notes: 'Stack of flattened sacs (cisternae).' },
        { name: 'Lysosome', function: 'Digestion via hydrolytic enzymes', notes: 'pH ~5 (acidic). Recycles cell components (autophagy).' },
        { name: 'Peroxisome', function: 'Breakdown of fatty acids, detox of H₂O₂', notes: 'Contains catalase. Important in liver and kidney.' },
        { name: 'Vacuole (plant central)', function: 'Storage, turgor pressure', notes: 'Can be 90% of plant cell volume. Maintains shape.' },
        { name: 'Cytoskeleton', function: 'Structure, motility, intracellular transport', notes: 'Microtubules, microfilaments, intermediate filaments.' },
        { name: 'Ribosome', function: 'Protein synthesis (translation)', notes: 'Made of rRNA + protein. Free in cytoplasm or attached to rough ER.' },
        { name: 'Cell membrane', function: 'Selective barrier, signaling', notes: 'Phospholipid bilayer with embedded proteins (fluid mosaic model).' },
        { name: 'Cell wall (plants, fungi, bacteria)', function: 'Structure, protection', notes: 'Plants: cellulose. Fungi: chitin. Bacteria: peptidoglycan.' }
      ];

      var CELL_TYPES = [
        { type: 'Prokaryote (bacteria/archaea)', size: '~1–10 μm', features: 'No nucleus or membrane-bound organelles. Circular DNA in nucleoid.', example: 'E. coli, Streptococcus' },
        { type: 'Eukaryote (general)', size: '~10–100 μm', features: 'Nucleus + organelles. Linear chromosomes with histones.', example: 'All animals, plants, fungi, protists' },
        { type: 'Neuron', size: 'soma ~10–100 μm; axon up to 1 m', features: 'Specialized for electrical signaling. Doesn\'t divide (mostly).', example: 'Brain, spinal cord, peripheral nerves' },
        { type: 'Red blood cell (RBC)', size: '~7–8 μm', features: 'No nucleus or organelles in mature form. Packed with hemoglobin.', example: 'Mammalian erythrocytes' },
        { type: 'White blood cell (lymphocyte)', size: '~7–15 μm', features: 'Immune surveillance. B cells make antibodies; T cells kill infected cells.', example: 'Lymph, blood, lymphoid tissue' },
        { type: 'Muscle cell (skeletal)', size: 'long fibers, up to many cm', features: 'Multinucleate. Packed with myofibrils (actin + myosin).', example: 'Biceps, quadriceps' },
        { type: 'Cardiac muscle', size: '~50–100 μm long', features: 'Branched. Intercalated discs synchronize contraction.', example: 'Heart' },
        { type: 'Smooth muscle', size: '~100 μm long', features: 'Involuntary, no striations. Around hollow organs.', example: 'Intestines, blood vessels, uterus' },
        { type: 'Epithelial cell', size: 'varies', features: 'Sheet-forming. Polarized (apical vs basal surfaces).', example: 'Skin, gut lining, glands' },
        { type: 'Sperm', size: '~50 μm long', features: 'Highly streamlined. Mitochondria for flagellum power. Haploid.', example: 'Male gamete' },
        { type: 'Egg (oocyte)', size: '~100 μm (human) up to ostrich egg', features: 'Huge cytoplasm with maternal mRNAs + organelles. Haploid.', example: 'Female gamete' },
        { type: 'Stem cell', size: 'varies', features: 'Can self-renew + differentiate. Pluripotent (ESCs) or multipotent (adult).', example: 'Bone marrow HSCs, embryonic stem cells, iPSCs' }
      ];

      var SEQUENCING_METHODS = [
        { name: 'Sanger sequencing', year: '1977', readLength: '~800 bp', cost: 'high per base', notes: 'Chain termination with ddNTPs. Still used for short, accurate reads. Used for Human Genome Project.' },
        { name: 'Illumina (short-read NGS)', year: '~2007', readLength: '~150-300 bp', cost: 'low per base', notes: 'Sequencing by synthesis with reversible terminators. High throughput, dominates whole-genome sequencing.' },
        { name: 'Ion Torrent', year: '2010', readLength: '~200-400 bp', cost: 'moderate', notes: 'Detects H⁺ release as bases are added. No fluorescence — simpler optics.' },
        { name: 'PacBio (SMRT)', year: '2011', readLength: '10-100 kb', cost: 'moderate', notes: 'Long reads. Good for spanning repeats, structural variants, full transcripts.' },
        { name: 'Oxford Nanopore', year: '~2014', readLength: '1 kb – 4 Mb', cost: 'low per device', notes: 'Detects current changes as DNA passes through pore. Portable (MinION). Used in Ebola, COVID field sequencing.' },
        { name: 'Hi-C / chromosome conformation capture', year: '2009', readLength: 'paired-end', cost: 'high', notes: 'Maps 3D genome organization, scaffolds genomes. Reveals chromatin loops and TADs.' }
      ];

      var BIOETHICS = [
        { topic: 'Genetic privacy', detail: 'Who can access your genome? GINA (2008, US) prohibits genetic discrimination in employment + health insurance, NOT life insurance.' },
        { topic: 'Direct-to-consumer testing', detail: '23andMe, AncestryDNA reveal ancestry + health risk. Concerns: incidental findings, accuracy, third-party data sharing.' },
        { topic: 'CRISPR germline editing', detail: 'In 2018, He Jiankui edited embryos for HIV resistance → twin births. Widely condemned. Most countries ban germline editing.' },
        { topic: 'Designer babies', detail: 'Hypothetical selection or editing of embryos for non-medical traits (height, IQ). Currently technically limited; ethically contested.' },
        { topic: 'Gene drives', detail: 'Engineered to spread through wild populations (e.g., mosquito malaria-resistance). Potential ecological irreversibility.' },
        { topic: 'Genetic testing for disease', detail: 'Should we test for untreatable diseases (Huntington)? Some people choose not to know.' },
        { topic: 'Forensic DNA', detail: 'Familial DNA searches solved cold cases (Golden State Killer, 2018) but raise privacy issues for relatives who never consented.' },
        { topic: 'Patenting genes', detail: 'US Supreme Court (2013) ruled that naturally-occurring DNA cannot be patented, but synthetic cDNA can.' },
        { topic: 'Equity in genomics', detail: 'Reference genomes historically Eurocentric. Improving reference diversity is ongoing (e.g., human pangenome project).' }
      ];

      var DNA_HISTORY = [
        { year: '1865', who: 'Gregor Mendel', what: 'Pea plant experiments → laws of inheritance. Largely ignored until 1900.' },
        { year: '1869', who: 'Friedrich Miescher', what: 'Isolated "nuclein" (DNA) from pus cells. Didn\'t know its function.' },
        { year: '1928', who: 'Frederick Griffith', what: 'Transformation experiments in pneumonia bacteria → some "transforming principle" carries heredity.' },
        { year: '1944', who: 'Avery, MacLeod, McCarty', what: 'Showed Griffith\'s transforming principle is DNA.' },
        { year: '1952', who: 'Hershey + Chase', what: 'Blender experiment with radiolabeled phages confirmed DNA = genetic material.' },
        { year: '1953', who: 'Watson, Crick, Franklin, Wilkins', what: 'Double helix structure of DNA (using Franklin\'s Photo 51).' },
        { year: '1958', who: 'Meselson + Stahl', what: 'Showed DNA replication is semi-conservative.' },
        { year: '1961', who: 'Jacob + Monod', what: 'Operon model — how genes are regulated (lac operon in E. coli).' },
        { year: '1966', who: 'Nirenberg, Khorana, Holley', what: 'Cracked the genetic code — codon → amino acid mapping.' },
        { year: '1977', who: 'Frederick Sanger', what: 'Developed Sanger sequencing. Earlier (1958) sequenced insulin (proteins). Two Nobels.' },
        { year: '1983', who: 'Kary Mullis', what: 'Invented PCR (polymerase chain reaction).' },
        { year: '1990', who: 'NIH + international', what: 'Human Genome Project launched.' },
        { year: '2001', who: 'HGP + Celera', what: 'First draft of human genome published.' },
        { year: '2012', who: 'Doudna + Charpentier', what: 'CRISPR-Cas9 demonstrated as programmable gene-editing tool.' },
        { year: '2022', who: 'T2T consortium', what: 'First complete (telomere-to-telomere) human genome published.' }
      ];

      function renderGenomesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📏 Genome sizes across life'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Genome size does not correlate with organism complexity (C-value paradox). Humans have similar gene counts to roundworms — much of "extra" DNA in larger genomes is non-coding.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Organism', 'Genome size', 'Genes', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                GENOME_SIZES.map(function(g, i) {
                  return h('tr', { key: 'g'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, g.organism),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 font-bold' }, g.size),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, g.genes),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, g.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMeiosisSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⊞ Meiosis vs Mitosis'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Feature', 'Mitosis', 'Meiosis'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MEIOSIS_VS_MITOSIS.map(function(r, i) {
                  return h('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, r.feature),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, r.mitosis),
                    h('td', { className: 'px-2 py-1 text-emerald-700 font-medium' }, r.meiosis)
                  );
                })
              )
            )
          )
        );
      }

      function renderMendelSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🫛 Mendelian genetics'),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Mendel\'s Laws (1865)'),
            h('div', { className: 'space-y-2' },
              MENDEL_LAWS.map(function(L, i) {
                return h('div', { key: 'L'+i, className: 'p-3 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, L.name),
                  h('div', { className: 'text-[11px] text-slate-700 mb-1' }, L.description),
                  h('div', { className: 'text-[10px] text-emerald-700 italic font-mono' }, '→ ' + L.example)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Common cross outcomes'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Cross', 'Phenotype ratio', 'Genotype', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MENDEL_RATIOS.map(function(m, i) {
                  return h('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.cross),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 font-bold' }, m.phenotype),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, m.genotype),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, m.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderEpigeneticsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '✎ Epigenetics — beyond the sequence'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Heritable changes in gene expression that don\'t involve changes to DNA sequence. Influenced by environment, diet, stress.'),
          h('div', { className: 'space-y-2' },
            EPIGENETIC_MECHANISMS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, m.mechanism),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, m.description),
                h('div', { className: 'text-[10px] text-emerald-700 italic' }, '→ ' + m.example)
              );
            })
          )
        );
      }

      function renderAminoSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚕ The 20 standard amino acids'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Building blocks of proteins. 9 are "essential" (can\'t be synthesized — must come from diet): His, Ile, Leu, Lys, Met, Phe, Thr, Trp, Val.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['1-letter', '3-letter', 'Name', 'Side chain', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                AMINO_ACIDS.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-black text-emerald-700' }, a.letter),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, a.three),
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.name),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, a.side),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderOrganellesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔬 Cell organelles'),
          h('div', { className: 'space-y-2' },
            ORGANELLES.map(function(o, i) {
              return h('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, o.name),
                h('div', { className: 'text-[11px] text-emerald-700 font-bold mb-1' }, 'Function: ' + o.function),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.notes)
              );
            })
          )
        );
      }

      function renderCellTypesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧫 Cell types'),
          h('div', { className: 'space-y-2' },
            CELL_TYPES.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, c.type),
                  h('span', { className: 'text-[10px] text-emerald-700 font-mono ml-auto px-2 py-0.5 rounded bg-emerald-100' }, c.size)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, c.features),
                h('div', { className: 'text-[10px] text-slate-600 italic' }, 'Example: ' + c.example)
              );
            })
          )
        );
      }

      function renderSequencingSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📊 DNA sequencing technologies'),
          h('div', { className: 'space-y-2' },
            SEQUENCING_METHODS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.name),
                  h('span', { className: 'text-[10px] text-slate-500 ml-auto font-mono' }, s.year)
                ),
                h('div', { className: 'flex gap-3 text-[10px] mb-1' },
                  h('span', { className: 'font-mono text-emerald-700' }, 'Read length: ' + s.readLength),
                  h('span', { className: 'font-mono text-slate-600' }, 'Cost: ' + s.cost)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderEthicsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚖ Bioethics in genetics'),
          h('div', { className: 'space-y-2' },
            BIOETHICS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, b.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.detail)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 History of genetics'),
          h('div', { className: 'space-y-2' },
            DNA_HISTORY.map(function(d, i) {
              return h('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  h('span', { className: 'text-[10px] font-mono text-emerald-700 font-bold' }, d.year),
                  h('span', { className: 'text-[12px] font-black text-emerald-900' }, d.who)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, d.what)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'bases') return renderBasesSection();
        if (expSection === 'code') return renderCodeSection();
        if (expSection === 'replication') return renderReplicationSection();
        if (expSection === 'transcription') return renderTranscriptionSection();
        if (expSection === 'translation') return renderTranslationSection();
        if (expSection === 'mutations') return renderMutationsSection();
        if (expSection === 'chromosomes') return renderChromosomesSection();
        if (expSection === 'dnarna') return renderDnaRnaSection();
        if (expSection === 'biotech') return renderBiotechSection();
        if (expSection === 'diseases') return renderDiseasesSection();
        if (expSection === 'evolution') return renderEvolutionSection();
        if (expSection === 'genomes') return renderGenomesSection();
        if (expSection === 'meiosis') return renderMeiosisSection();
        if (expSection === 'mendel') return renderMendelSection();
        if (expSection === 'epigenetics') return renderEpigeneticsSection();
        if (expSection === 'amino') return renderAminoSection();
        if (expSection === 'organelles') return renderOrganellesSection();
        if (expSection === 'celltypes') return renderCellTypesSection();
        if (expSection === 'sequencing') return renderSequencingSection();
        if (expSection === 'ethics') return renderEthicsSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var __dnaExpansions = h('div', { className: 'mt-4 max-w-4xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && h('div', { className: 'mt-2' }, renderActiveSection())
      );

      return h(React.Fragment, null, __dnaMainView, __dnaExpansions);
    }
  });

  console.log('[StemLab] stem_tool_dna.js v3.0 loaded');
})();