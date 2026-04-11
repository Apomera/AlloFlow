// ═══════════════════════════════════════════════════════
// stem_tool_dna.js — DNA / Genetics Lab  v3.0
// Enhanced STEM Lab tool — 11 sub-tools
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
    'Stop':{full:'Stop codon',abbr:'*',type:'stop',color:'#6b7280'}
  };

  var BASE_COMPLEMENT = { 'A':'T', 'T':'A', 'G':'C', 'C':'G' };
  var DNA_TO_RNA = { 'A':'U', 'T':'A', 'G':'C', 'C':'G' };
  var BASE_COLORS = { 'A':'#ef4444', 'T':'#3b82f6', 'G':'#22c55e', 'C':'#f59e0b', 'U':'#a855f7' };

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
      '3-5': 'DNA (deoxyribonucleic acid) is a molecule found in the nucleus of every cell. It\u2019s shaped like a twisted ladder \u2014 the double helix. The sides are made of sugar and phosphate, and the rungs are base pairs: Adenine-Thymine and Guanine-Cytosine. Your DNA has about 3 billion base pairs!',
      '6-8': 'DNA is a polymer of nucleotides, each containing deoxyribose sugar, a phosphate group, and a nitrogenous base (A, T, G, or C). The antiparallel strands run 5\u2032\u21923\u2032 and 3\u2032\u21925\u2032, connected by hydrogen bonds (2 for A-T, 3 for G-C). Chromosomes are DNA wrapped around histone proteins forming chromatin.',
      '9-12': 'DNA is a right-handed B-form double helix with major and minor grooves. Each nucleotide: 2\u2032-deoxyribose, phosphodiester backbone, nitrogenous base. Chargaff\u2019s rules: %A=%T, %G=%C. Antiparallel strands, pitch of 3.4nm (10bp/turn). Supercoiling by topoisomerases regulates access. Telomeric TTAGGG repeats protect chromosome ends.'
    }},
    { title: 'Central Dogma', icon: '\uD83D\uDD04', tryIt: 'transcribe', content: {
      'K-2': 'DNA is like a recipe, and proteins are the food! First, the cell copies the recipe (transcription) to make a message called mRNA. Then tiny machines called ribosomes read the message and build proteins (translation). Proteins do almost everything in your body!',
      '3-5': 'The Central Dogma: DNA \u2192 RNA \u2192 Protein. In transcription, RNA polymerase reads DNA and makes mRNA. The mRNA goes to a ribosome for translation \u2014 it reads mRNA in groups of 3 letters (codons) and builds a chain of amino acids that folds into a protein!',
      '6-8': 'DNA is transcribed into mRNA by RNA polymerase (reading template 3\u2032\u21925\u2032, building mRNA 5\u2032\u21923\u2032). mRNA is processed (5\u2032 cap, poly-A tail, splicing of introns) then exported to ribosomes. tRNAs with anticodons deliver amino acids; the ribosome catalyzes peptide bonds during translation.',
      '9-12': 'Transcription: RNA Pol II binds TATA box via TBP/TFIID, assembles PIC, synthesizes pre-mRNA 5\u2032\u21923\u2032. Co-transcriptional processing: 7-methylguanosine cap, spliceosome-mediated intron removal, CstF/CPSF-directed polyadenylation. Translation: 43S PIC scans for Kozak-context AUG; 80S ribosome cycles A/P/E sites; EF-Tu delivers aminoacyl-tRNAs; release factors recognize stop codons.'
    }},
    { title: 'Mutations & Evolution', icon: '\uD83E\uDDA0', tryIt: 'mutate', content: {
      'K-2': 'Sometimes the cell makes a mistake when copying DNA \u2014 like a typo! These mistakes are called mutations. Most mutations don\u2019t do anything, but some can change how an organism looks or works. Over a very long time, helpful mutations help living things survive better!',
      '3-5': 'Mutations are changes in DNA sequence. A substitution swaps one base. An insertion adds a base. A deletion removes one. Insertions and deletions can shift the reading frame (frameshift), often breaking the protein. Natural selection acts on mutations over generations, driving evolution.',
      '6-8': 'Point mutations: transitions (purine\u2194purine) and transversions (purine\u2194pyrimidine). Effects: silent (synonymous), missense (different amino acid), nonsense (premature stop). Frameshift mutations from indels alter all downstream codons. Mutagens: UV light, chemicals, replication errors. Beneficial mutations spread via natural selection.',
      '9-12': 'Mutation rates: ~10\u207B\u2079/bp/replication after proofreading and mismatch repair. Transitions more common (tautomeric shifts). Trinucleotide repeat expansions (Huntington\u2019s: CAG>36). Neutral theory (Kimura): most molecular evolution is neutral drift. Positive selection detected by dN/dS>1. Ames test screens mutagens via Salmonella auxotrophs.'
    }},
    { title: 'Genetic Engineering', icon: '\u2702\uFE0F', tryIt: 'crispr', content: {
      'K-2': 'Scientists have learned to edit DNA like editing a story! They use special tools called CRISPR \u2014 like tiny scissors \u2014 to cut DNA at exactly the right spot. This helps cure diseases, make healthier crops, and even bring back extinct animals someday!',
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

        function draw() {
          ctx2d.clearRect(0, 0, w, hh);
          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = hh / 2;
          var helixAmp = 18;

          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (i === 0) ctx2d.moveTo(x, midY - 25 + yOff); else ctx2d.lineTo(x, midY - 25 + yOff);
          }
          ctx2d.stroke();

          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (tab === 'transcribe' && i < currentAnimStep) continue;
            if (i === 0 || (tab === 'transcribe' && i === currentAnimStep)) ctx2d.moveTo(x, midY + 25 - yOff);
            else ctx2d.lineTo(x, midY + 25 - yOff);
          }
          ctx2d.stroke();

          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
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

      return h("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200" },

        // ═══ HEADER ═══
        h("div", { className: "flex items-center justify-between" },
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { setStemLabTool(null); announceToSR('Returned to tool grid'); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools' },
              h(ArrowLeft, { size: 18, className: "text-slate-500" })),
            h("div", null,
              h("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDDEC DNA / Genetics Lab"),
              h("p", { className: "text-xs text-slate-500" }, "Build \u2022 Replicate \u2022 Transcribe \u2022 Translate \u2022 Mutate \u2022 CRISPR \u2022 Forensics"))
          ),
          h("div", { className: "flex items-center gap-2" },
            h("span", { className: "text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + getStemXP('dnaLab') + "/100 XP"),
            h("button", { onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'dna-' + Date.now(), tool: 'dnaLab', label: 'DNA: ' + dnaSeq.substring(0, 12) + '...', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all" }, "\uD83D\uDCF8 Snapshot")
          )
        ),

        // ═══ GRADE SELECTOR ═══
        h("div", { className: "flex items-center gap-1.5 flex-wrap" },
          h("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1" }, "\uD83C\uDF93 Grade:"),
          GRADE_BANDS.map(function(gb) {
            return h("button", {
              key: gb,
              onClick: function() { upd('dnaGradeOverride', gb); addToast('\uD83C\uDF93 Grade set to ' + gb, 'success'); },
              className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (gradeBand === gb ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-fuchsia-50 border border-slate-200')
            }, gb);
          }),
          h("span", { className: "ml-auto px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 text-[11px] font-bold rounded-full border border-fuchsia-200" },
            gradeBand === 'K-2' ? '\uD83E\uDDF8 Elementary' : gradeBand === '3-5' ? '\uD83D\uDCDA Upper Elementary' : gradeBand === '6-8' ? '\uD83E\uDD13 Middle School' : '\uD83C\uDF93 High School'
          )
        ),

        // ═══ TAB BAR ═══
        h("div", { className: "flex gap-1 bg-slate-100 p-1 rounded-xl flex-wrap", role: "tablist" },
          SUBTOOLS.map(function(tb) {
            return h("button", { key: tb.id, role: "tab", 'aria-selected': tab === tb.id ? 'true' : 'false',
              onClick: function() {
                var v = Object.assign({}, d.visitedTabs || {}); v[tb.id] = true;
                updMulti({ tab: tb.id, visitedTabs: v });
                if (Object.keys(v).length >= SUBTOOLS.length) checkBadge('explorer');
                announceToSR('Switched to ' + tb.label);
              },
              className: "flex-1 min-w-[70px] px-2 py-2 text-[11px] font-bold rounded-lg transition-all " + (tab === tb.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700")
            }, tb.icon + " " + tb.label);
          })
        ),

        // ═══ BADGE BAR ═══
        h("div", { className: "flex items-center gap-1 flex-wrap" },
          h("span", { className: "text-[11px] font-bold text-slate-500 mr-1" }, "\uD83C\uDFC6 " + earnedBadgeCount + "/" + DNA_BADGES.length),
          DNA_BADGES.map(function(b) {
            var earned = badges[b.id];
            return h("span", { key: b.id, className: "w-6 h-6 flex items-center justify-center rounded-full text-xs cursor-default transition-all " + (earned ? 'bg-amber-100 shadow-sm scale-100' : 'bg-slate-100 grayscale opacity-40'), title: b.label + ': ' + b.desc + (earned ? ' \u2705' : '') }, b.icon);
          })
        ),

        // ═══════════════════════════════════════════
        // BUILD TAB
        // ═══════════════════════════════════════════
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
                  return h("button", { key: p.name, onClick: function() { updMulti({ dnaSequence: p.seq, mRNA: '', protein: [], animStep: 0 }); addToast('\uD83E\uDDEC ' + p.name + ': ' + p.desc, 'success'); announceToSR('Loaded ' + p.name); checkBadge('firstStrand'); }, className: "px-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100", title: p.desc }, p.name);
                })
              )
            ),
            h("div", { className: "flex flex-wrap gap-1", role: "group", 'aria-label': 'DNA bases' },
              dnaSeq.split('').map(function(base, idx) {
                return h("button", { key: idx, onClick: function() { var order = 'ATGC'; var next = order[(order.indexOf(base) + 1) % 4]; updMulti({ dnaSequence: dnaSeq.substring(0, idx) + next + dnaSeq.substring(idx + 1), mRNA: '', protein: [], animStep: 0 }); },
                  className: "w-8 h-8 rounded-lg font-mono font-bold text-white text-sm hover:scale-110 transition-all", style: { background: BASE_COLORS[base] }, 'aria-label': 'Base ' + (idx + 1) + ': ' + base
                }, base);
              })
            ),
            h("div", { className: "text-xs text-slate-500" }, "Complement: ", h("span", { className: "font-mono font-bold text-slate-600" }, complementStrand), " | " + dnaSeq.length + " bp"),
            h("div", { className: "flex gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-100" },
              h("span", null, "GC: " + Math.round((dnaSeq.split('').filter(function(b) { return b === 'G' || b === 'C'; }).length / dnaSeq.length) * 100) + "%"),
              h("span", null, "AT: " + Math.round((dnaSeq.split('').filter(function(b) { return b === 'A' || b === 'T'; }).length / dnaSeq.length) * 100) + "%")
            ),
            h("div", { className: "flex gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-100" },
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
              h("span", { className: "text-xs text-slate-500" }, 'Speed:'),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[10px] font-bold rounded-lg " + (speed === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500') }, s + 'x'); })
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
              gradeText(
                '\uD83E\uDDEC DNA replication is like photocopying a recipe. The cell unzips the DNA ladder and builds two exact copies so both new cells get the instructions!',
                '\uD83E\uDDEC During replication, the enzyme helicase unwinds the double helix. Then DNA polymerase reads each strand and adds matching bases (A-T, G-C) to create two identical copies.',
                '\uD83E\uDDEC Semi-conservative replication: Helicase unwinds at the origin of replication. DNA Polymerase III adds nucleotides 5\u2032\u21923\u2032. The leading strand is continuous, while the lagging strand is synthesized in Okazaki fragments joined by ligase.',
                '\uD83E\uDDEC Replication initiates at origins (OriC in prokaryotes). Helicase unwinds; SSB proteins stabilize. Primase lays RNA primers. Pol III extends 5\u2032\u21923\u2032 (leading = continuous, lagging = Okazaki fragments). Pol I replaces primers; ligase seals nicks. Proofreading by 3\u2032\u21925\u2032 exonuclease achieves ~10\u207B\u2079 error rate.'
              )
            ),
            h("div", { className: "flex gap-3 flex-wrap text-[11px] text-slate-500 pt-2 border-t border-slate-100" },
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
            h("div", { className: "flex items-center gap-2 ml-auto" }, h("span", { className: "text-xs text-slate-500" }, "Speed:"),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[10px] font-bold rounded-lg " + (speed === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500") }, s + "x"); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("div", { className: "flex justify-between text-xs text-slate-500 mb-2" }, h("span", null, animStep + "/" + dnaSeq.length), h("span", null, Math.round(animStep / dnaSeq.length * 100) + "%")),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" }, h("div", { className: "bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full h-2 transition-all", style: { width: (animStep / dnaSeq.length * 100) + '%' } })),
            mRNA && h("div", { className: "mt-3" }, h("span", { className: "text-xs font-bold text-violet-600" }, "mRNA: "), h("span", { className: "font-mono text-xs text-slate-700 break-all" }, mRNA)),
            h("div", { className: "mt-2 text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2" }, "\uD83D\uDCA1 RNA Polymerase reads template 3'\u21925', builds mRNA 5'\u21923'. T becomes U in RNA.")
          )
        ),

        // ═══════════════════════════════════════════
        // TRANSLATION TAB
        // ═══════════════════════════════════════════
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
              builtProtein.length === 0 && h("span", { className: "text-[10px] text-slate-500 italic" }, "Press Start to begin...")
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
              h("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "Current Sequence (" + dnaSeq.length + " bp):"),
              h("div", { className: "font-mono text-xs break-all" },
                dnaSeq.split('').map(function(base, idx) { return h("span", { key: idx, className: "inline-block w-5 h-5 text-center leading-5 rounded font-bold text-white text-[10px] m-px", style: { background: BASE_COLORS[base] } }, base); })
              ),
              h("p", { className: "text-[10px] text-slate-500 mt-2" }, "Protein: " + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-') + (fullProtein.some(function(p) { return p.aa === 'Stop'; }) ? ' [STOP]' : ''))
            ),
            (d.mutationLog && d.mutationLog.length > 0) && h("div", { className: "mt-2" },
              h("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "\uD83D\uDCCB Mutation Log:"),
              h("div", { className: "space-y-1 max-h-32 overflow-y-auto" },
                (d.mutationLog || []).map(function(m, i) {
                  var emoji = m.type === 'Substitution' ? '\uD83D\uDD04' : m.type === 'Insertion' ? '\u2795' : '\u2796';
                  var desc = m.type === 'Substitution' ? m.from + '\u2192' + m.to + ' at pos ' + (m.pos + 1) :
                             m.type === 'Insertion' ? '+' + m.to + ' at pos ' + (m.pos + 1) :
                             '-' + m.from + ' at pos ' + (m.pos + 1);
                  return h("div", { key: i, className: "text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, emoji + ' ' + m.type + ': ' + desc);
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
              h("span", { className: "text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1" }, "\uD83E\uDDE0 AI Analysis"),
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
              h("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, 'Step 1: Select PAM Target Site'),
              pamSites.length === 0 ? h("p", { className: "text-xs text-amber-800 bg-amber-50 p-2 rounded-lg" }, '\u26A0\uFE0F No PAM sites (NGG) found. Try a different DNA sequence from the Build tab.') :
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

            // Cut phase
            crisprPhase === 'cut' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-red-600" }, '\u2702\uFE0F Double-strand break created! Choose repair pathway:'),
              h("div", { className: "grid grid-cols-2 gap-2" },
                h("button", { onClick: function() { applyCRISPRRepair('nhej'); }, className: "p-3 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all text-left" },
                  h("p", { className: "text-xs font-bold text-amber-700" }, '\uD83D\uDD27 NHEJ'),
                  h("p", { className: "text-[11px] text-amber-600 mt-0.5" }, 'Non-Homologous End Joining'),
                  h("p", { className: "text-[8px] text-slate-500 mt-1" }, gradeText('Quick fix \u2014 might make mistakes!', 'Error-prone, may add or delete bases.', 'Error-prone. Introduces indels. Used for gene knockouts.', 'Error-prone. Introduces indels. Used for gene knockouts.'))
                ),
                h("button", { onClick: function() { applyCRISPRRepair('hdr'); }, className: "p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all text-left" },
                  h("p", { className: "text-xs font-bold text-emerald-700" }, '\uD83E\uDDEC HDR'),
                  h("p", { className: "text-[11px] text-emerald-600 mt-0.5" }, 'Homology-Directed Repair'),
                  h("p", { className: "text-[8px] text-slate-500 mt-1" }, gradeText('Careful fix \u2014 uses a template!', 'Precise editing using a template.', 'Precise editing using donor template. Used for gene knock-ins.', 'Precise editing using donor template. Used for gene knock-ins and corrections.'))
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
              h("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, '\uD83D\uDCCB CRISPR Edit History:'),
              h("div", { className: "space-y-1 max-h-24 overflow-y-auto" },
                crisprEditLog.map(function(e, i) {
                  return h("div", { key: i, className: "text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, (e.type === 'NHEJ' ? '\uD83D\uDD27' : '\uD83E\uDDEC') + ' ' + e.desc);
                })
              )
            )
          ),

          h("details", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, '\uD83D\uDCDA CRISPR Quick Reference'),
            h("div", { className: "p-3 text-[10px] text-slate-600 space-y-2" },
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'What is CRISPR?'),
                h("p", null, 'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a gene editing technology adapted from bacteria\'s immune defense.')
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'Key Components:'),
                h("ul", { className: "list-disc ml-4 space-y-0.5" },
                  h("li", null, h("strong", null, 'Cas9'), ' \u2014 The molecular scissors (endonuclease)'),
                  h("li", null, h("strong", null, 'Guide RNA'), ' \u2014 A ~20nt RNA that directs Cas9 to the target'),
                  h("li", null, h("strong", null, 'PAM'), ' \u2014 Protospacer Adjacent Motif (NGG). Required for binding.')
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
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("div", { className: "flex items-center justify-between mb-3" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83E\uDDEA Protein \u2014 " + fullProtein.length + " amino acids"),
              fullProtein.length > 0 && h("span", { className: "text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full" },
                Math.round(fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length / Math.max(1, fullProtein.length) * 100) + '% hydrophobic'
              )
            ),
            fullProtein.length > 0 ? h("div", { className: "space-y-3" },
              h("div", { className: "flex flex-wrap gap-1.5 p-3 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl border border-slate-100" },
                fullProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa, abbr: '?', type: '?' };
                  return h("div", { key: idx, className: "flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[44px] hover:scale-105 transition-transform cursor-default", title: pr.full + ' (' + p.codon + ') - ' + pr.type },
                    h("span", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm", style: { background: pr.color } }, pr.abbr),
                    h("span", { className: "text-[8px] font-bold text-slate-600" }, p.aa),
                    h("span", { className: "text-[7px] text-slate-500 font-mono" }, p.codon),
                    idx < fullProtein.length - 1 && p.aa !== 'Stop' ? h("span", { className: "text-[8px] text-slate-500" }, '\u2500') : null
                  );
                })
              ),
              h("div", { className: "grid grid-cols-2 gap-2 mt-2" },
                h("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-100" },
                  h("p", { className: "text-[11px] font-bold text-amber-700 uppercase" }, 'Nonpolar (Hydrophobic)'),
                  h("p", { className: "text-sm font-black text-amber-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length),
                  h("p", { className: "text-[8px] text-amber-500" }, 'Ala, Val, Leu, Ile, Pro, Phe, Trp, Met, Gly')
                ),
                h("div", { className: "bg-blue-50 rounded-lg p-2 border border-blue-100" },
                  h("p", { className: "text-[11px] font-bold text-blue-700 uppercase" }, 'Polar (Hydrophilic)'),
                  h("p", { className: "text-sm font-black text-blue-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'polar'; }).length),
                  h("p", { className: "text-[8px] text-blue-500" }, 'Ser, Thr, Cys, Tyr, Asn, Gln')
                ),
                h("div", { className: "bg-red-50 rounded-lg p-2 border border-red-100" },
                  h("p", { className: "text-[11px] font-bold text-red-700 uppercase" }, 'Positively Charged'),
                  h("p", { className: "text-sm font-black text-red-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'positive'; }).length),
                  h("p", { className: "text-[8px] text-red-500" }, 'Arg, Lys, His')
                ),
                h("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-100" },
                  h("p", { className: "text-[11px] font-bold text-purple-700 uppercase" }, 'Negatively Charged'),
                  h("p", { className: "text-sm font-black text-purple-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'negative'; }).length),
                  h("p", { className: "text-[8px] text-purple-500" }, 'Asp, Glu')
                )
              ),
              h("div", { className: "bg-slate-50 rounded-lg p-2 border border-slate-200 mt-1" },
                h("p", { className: "text-[11px] font-bold text-slate-500" }, '\u2696\uFE0F Estimated MW: ~' + (fullProtein.length * 110) + ' Da (' + (fullProtein.length * 110 / 1000).toFixed(1) + ' kDa) | Seq: ' + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return (AA_PROPS[p.aa] || {}).abbr || '?'; }).join(''))
              ),
              h("div", { className: "flex gap-3 text-[10px] text-slate-500 pt-2 border-t flex-wrap" },
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
                  h("span", { className: "text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, '\uD83E\uDDE0 Protein Analysis'),
                  d.aiProtein
                )
              )
            ) : h("div", { className: "text-center py-8 text-slate-400" }, h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEA"), h("p", null, "Run Transcription and Translation first!"))
          ),
          h("details", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, '\uD83E\uDDA0 Genetic Disorders Reference'),
            h("div", { className: "p-3 space-y-2 max-h-60 overflow-y-auto" },
              GENETIC_DISORDERS.map(function(dis) {
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

        // ═══════════════════════════════════════════
        // FORENSICS TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'forensics' && h("div", { className: "space-y-4" },
          h("div", { className: "bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\uD83D\uDD0D"),
              h("h4", { className: "text-sm font-bold text-cyan-800" }, "DNA Forensics \u2014 Gel Electrophoresis"),
              h("span", { className: "px-2 py-0.5 bg-cyan-200 text-cyan-800 text-[11px] font-bold rounded-full" }, "CASE " + (forensicCase + 1) + "/" + FORENSIC_CASES.length)
            ),
            h("p", { className: "text-xs text-slate-600" },
              gradeText(
                'DNA fingerprinting is like finding someone\u2019s unique barcode! Scientists cut DNA into pieces and sort them by size to see who matches.',
                'Restriction enzymes cut DNA at specific sequences. The fragments are separated by size using gel electrophoresis \u2014 smaller pieces move faster through the gel. If two samples have the same banding pattern, they match!',
                'Restriction Fragment Length Polymorphism (RFLP): Restriction endonucleases cut DNA at palindromic sites. Gel electrophoresis separates fragments by size (smaller = faster migration). Matching banding patterns between samples indicates same DNA source.',
                'RFLP & STR analysis: Restriction endonucleases recognize 4-8bp palindromic sequences. Gel electrophoresis separates fragments inversely proportional to log(MW). Modern forensics uses PCR-amplified Short Tandem Repeats (STRs) at 13+ CODIS loci for statistical match probabilities <10\u207B\u00B9\u2070.'
              )
            ),

            // Case selector
            h("div", { className: "flex gap-1 flex-wrap" },
              FORENSIC_CASES.map(function(c, idx) {
                return h("button", { key: idx, onClick: function() { updMulti({ forensicCase: idx, forensicGelRun: false, forensicGuess: null, forensicResult: null }); },
                  className: "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all " + (forensicCase === idx ? 'bg-cyan-700 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-cyan-50 border border-slate-200')
                }, (idx + 1) + '. ' + c.name);
              })
            ),

            h("div", { className: "bg-white rounded-lg p-3 border" },
              h("p", { className: "text-xs font-bold text-slate-700" }, currentCase.name),
              h("p", { className: "text-[10px] text-slate-500 mt-1" }, currentCase.desc),
              h("p", { className: "text-[10px] text-cyan-600 mt-1" }, '\uD83E\uDDEC Restriction enzyme: ' + currentCase.enzyme)
            ),

            // Run gel button
            !forensicGelRun && h("button", { onClick: function() { upd('forensicGelRun', true); addToast('\u26A1 Running gel electrophoresis...', 'success'); }, className: "px-4 py-2 text-sm font-bold bg-cyan-700 text-white rounded-xl hover:bg-cyan-700 shadow-md transition-all" }, '\u26A1 Run Gel Electrophoresis'),

            // Gel visualization (SVG)
            forensicGelRun && h("div", { className: "space-y-3" },
              h("svg", { viewBox: '0 0 400 240', className: "w-full bg-slate-900 rounded-xl", style: { maxHeight: 280 }, 'aria-label': 'Gel electrophoresis results' },
                // Gel background
                h("rect", { x: 15, y: 10, width: 370, height: 220, fill: '#1a2744', rx: 6 }),
                // Negative electrode label
                h("text", { x: 200, y: 8, fill: '#ef4444', fontSize: 7, textAnchor: 'middle', fontWeight: 'bold' }, '\u2212 (cathode)'),
                // Positive electrode label
                h("text", { x: 200, y: 238, fill: '#22c55e', fontSize: 7, textAnchor: 'middle', fontWeight: 'bold' }, '+ (anode)'),
                // Size ladder
                h("rect", { x: 25, y: 18, width: 24, height: 5, fill: '#334155', rx: 1 }),
                h("text", { x: 37, y: 16, fill: '#64748b', fontSize: 7, textAnchor: 'middle' }, 'Ladder'),
                [100, 200, 300, 400, 500, 600, 700].map(function(size) {
                  var y = bandY(size);
                  return h("g", { key: 'l' + size },
                    h("rect", { x: 28, y: y, width: 18, height: 2.5, fill: '#f59e0b', rx: 0.5, opacity: 0.85 }),
                    h("text", { x: 50, y: y + 2, fill: '#64748b', fontSize: 5.5 }, size + 'bp')
                  );
                }),
                // Sample lanes
                currentCase.samples.map(function(s, si) {
                  var laneX = 80 + si * 80;
                  return h("g", { key: 'lane' + si },
                    h("rect", { x: laneX - 12, y: 18, width: 24, height: 5, fill: '#334155', rx: 1 }),
                    h("text", { x: laneX, y: 16, fill: s.isRef ? '#22d3ee' : '#94a3b8', fontSize: 6, textAnchor: 'middle', fontWeight: s.isRef ? 'bold' : 'normal' }, s.label),
                    s.fragments.map(function(frag, fi) {
                      var y = bandY(frag);
                      return h("rect", { key: fi, x: laneX - 10, y: y, width: 20, height: 3, fill: s.isRef ? '#22d3ee' : '#60a5fa', rx: 1, opacity: 0.9 });
                    })
                  );
                })
              ),

              // Answer selection
              !forensicResult && h("div", { className: "space-y-2" },
                h("p", { className: "text-[10px] font-bold text-slate-500 uppercase" }, 'Which sample matches the ' + currentCase.samples[0].label + '?'),
                h("div", { className: "flex gap-2 flex-wrap" },
                  currentCase.samples.map(function(s, idx) {
                    if (s.isRef) return null;
                    return h("button", { key: idx, onClick: function() { upd('forensicGuess', idx); },
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (forensicGuess === idx ? 'bg-cyan-700 text-white shadow-md ring-2 ring-cyan-300' : 'bg-white text-slate-600 hover:bg-cyan-50 border border-slate-200')
                    }, s.label);
                  })
                ),
                h("button", { onClick: checkForensicAnswer, disabled: forensicGuess == null, className: "px-4 py-2 text-sm font-bold rounded-xl transition-all " + (forensicGuess != null ? 'bg-cyan-700 text-white hover:bg-cyan-700 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed') }, '\u2713 Submit Answer')
              ),

              // Result
              forensicResult && h("div", { className: "space-y-2" },
                h("div", { className: "p-3 rounded-xl text-sm font-bold " + (forensicResult === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-red-50 text-red-700 border-2 border-red-200') },
                  forensicResult === 'correct' ? '\u2705 Correct! The banding patterns match perfectly. Case solved!' : '\u274c Incorrect. Compare the band positions more carefully \u2014 matching samples have identical fragment sizes.',
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
                    var prompt = 'You are a forensic genetics teacher. Grade: ' + gradeCtx + '. Case: "' + caseData.name + '" \u2014 ' + caseData.desc + ' The restriction enzyme ' + caseData.enzyme + ' was used. The ' + caseData.samples[0].label + ' matched ' + matchSample.label + ' because they share identical fragment sizes: ' + matchSample.fragments.join(', ') + ' bp. Explain in 3-4 sentences why the bands match, what restriction enzymes do, and how gel electrophoresis separates DNA. Be educational and engaging.';
                    callGemini(prompt, true, false, 0.7).then(function(r) { updMulti({ forensicAI: typeof r === 'string' ? r : 'Analysis unavailable.', forensicAILoading: false }); }).catch(function() { updMulti({ forensicAI: 'AI unavailable.', forensicAILoading: false }); });
                  }, disabled: d.forensicAILoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.forensicAILoading ? 'bg-cyan-300 text-white cursor-wait' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-md') }, d.forensicAILoading ? '\u23F3 Analyzing...' : '\u2728 AI: Explain the Evidence'),
                  d.forensicAI && h("div", { className: "mt-2 p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-xs text-cyan-900 leading-relaxed" },
                    h("span", { className: "text-[10px] font-bold text-cyan-600 uppercase tracking-wider block mb-1" }, '\uD83E\uDDE0 Forensic Analysis'),
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
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4 space-y-4" },
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
                  className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (challengeTier === tier.t ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-violet-50')
                }, tier.l);
              })
            ),

            !challengeQ ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEC"),
              h("p", { className: "text-xs text-slate-500 mb-3" }, "Test your genetics knowledge!"),
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
              challengeQ.isAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded-full" }, "\uD83E\uDDE0 AI-GENERATED"),
              h("p", { className: "text-sm font-medium text-slate-700" }, challengeQ.question),
              h("input", { type: "text", value: challengeAnswer, onChange: function(e) { upd('challengeAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkChallenge(); }, placeholder: "Type your answer...", className: "w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-violet-400 outline-none", 'aria-label': 'Answer' }),
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
          h("details", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },
            h("summary", { className: "px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50" }, "\uD83D\uDCD6 Codon Reference Table"),
            h("div", { className: "p-3 grid grid-cols-4 gap-1 text-[11px] font-mono max-h-60 overflow-y-auto" },
              Object.keys(CODON_TABLE).sort().map(function(c2) { var aa2 = CODON_TABLE[c2]; var pr2 = AA_PROPS[aa2] || { color: '#888' }; return h("div", { key: c2, className: "flex items-center gap-1 px-1.5 py-0.5 rounded", style: { background: pr2.color + '15' } }, h("span", { style: { color: pr2.color }, className: "font-bold" }, c2), h("span", { className: "text-slate-500" }, "\u2192 " + aa2)); })
            )
          )
        ),

        // ═══════════════════════════════════════════
        // BATTLE TAB (NEW — Gene Defense)
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
                  h("span", { className: "absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow" }, battlePlayerHP + ' HP')
                )
              ),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-red-600 w-20" }, "\uD83E\uDDA0 Virus"),
                h("div", { className: "flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden" },
                  h("div", { className: "bg-gradient-to-r from-red-500 to-orange-400 h-4 rounded-full transition-all duration-500", style: { width: battleEnemyHP + '%' } }),
                  h("span", { className: "absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow" }, battleEnemyHP + ' HP')
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
              h("p", { className: "text-xs text-slate-500" }, 'Your HP: ' + battlePlayerHP + ' | Virus HP: ' + battleEnemyHP),
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
                  battleUseAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded-full" }, "\uD83E\uDDE0 AI-GENERATED"),
                  h("p", { className: "text-sm font-medium text-slate-700" }, q.q),
                  h("input", { type: "text", value: battleAnswer, onChange: function(e) { upd('battleAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') battleAttack(); }, placeholder: "Type your answer...", className: "w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-red-400 outline-none", 'aria-label': 'Battle answer' }),
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
          h("div", { className: "bg-white rounded-xl border border-slate-200 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, "\uD83D\uDCDA Learn \u2014 Genetics Concepts"),
            h("p", { className: "text-xs text-slate-500 mb-4" }, "Explore key topics adapted to your grade level (" + gradeBand + ").")
          ),
          LEARN_TOPICS.map(function(topic) {
            var content = topic.content[gradeBand] || topic.content['3-5'];
            return h("div", { key: topic.title, className: "bg-white rounded-xl border border-slate-200 p-4 space-y-3" },
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-lg" }, topic.icon),
                h("h5", { className: "text-sm font-bold text-slate-700" }, topic.title)
              ),
              h("p", { className: "text-xs text-slate-600 leading-relaxed" }, content),
              h("div", { className: "flex gap-2 pt-2 border-t border-slate-100" },
                h("button", { onClick: function() { updMulti({ tab: topic.tryIt }); announceToSR('Switched to ' + topic.tryIt); }, className: "px-3 py-1.5 text-[10px] font-bold bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-all" }, '\uD83D\uDD2C Try It'),
                callTTS && h("button", { onClick: function() { callTTS(content); }, className: "px-3 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all" }, '\uD83D\uDD0A Read Aloud')
              )
            );
          })
        ),

        // SR status
        h("div", { className: "sr-only", role: "status", 'aria-live': "polite" }, "DNA Lab: " + tab + " view")
      );
    }
  });

  console.log('[StemLab] stem_tool_dna.js v3.0 loaded');
})();