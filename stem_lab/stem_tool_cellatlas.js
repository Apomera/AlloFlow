// AlloFlow STEM Lab - Cell Atlas Lab
// A classroom-scale bridge from tissue to cell type to gene to protein across organs.
//
// Scientific boundary:
// - Source context comes from attributed HCA pancreas, lung, and brain records.
// - The cluster positions are an illustrative teaching layout, not a published UMAP.
// - Expression values are teaching-normalized marker evidence (0-100), not raw counts.
(function () {
  'use strict';

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var SOURCE = {
    title: 'A Single-Cell Transcriptome Atlas of the Human Pancreas',
    project: 'Muraro et al. (2016), Cell Systems',
    hcaId: '894ae6ac-5b48-41a8-a72f-315a9b60a62e',
    hcaUrl: 'https://explore.data.humancellatlas.org/projects/894ae6ac-5b48-41a8-a72f-315a9b60a62e',
    cellxgeneUrl: 'https://cellxgene.cziscience.com/collections/6e8c5415-302c-492a-a5f9-f29c57ff18fb',
    licenseUrl: 'https://data.humancellatlas.org/about/data-use-agreement',
    license: 'CC BY 4.0',
    organism: 'Homo sapiens',
    tissue: 'pancreas',
    condition: 'normal',
    donors: 4,
    estimatedCells: '12.3k',
    methodNote: 'This source study used single-cell transcriptomics. The classroom model does not reproduce its original processing pipeline or donor-level measurements.'
  };

  var GENES = [
    { id: 'INS', name: 'Insulin', role: 'Hormone made at high levels by pancreatic beta cells.', protein: 'Insulin precursor', accession: 'P01308' },
    { id: 'GCG', name: 'Glucagon', role: 'Hormone marker of pancreatic alpha cells.', protein: 'Glucagon precursor', accession: 'P01275' },
    { id: 'SST', name: 'Somatostatin', role: 'Hormone marker of pancreatic delta cells.', protein: 'Somatostatin precursor', accession: 'P61278' },
    { id: 'KRT19', name: 'Keratin 19', role: 'Structural marker commonly associated with ductal epithelial cells.', protein: 'Keratin, type I cytoskeletal 19', accession: 'P08727' },
    { id: 'PRSS1', name: 'Trypsinogen-1', role: 'Digestive enzyme precursor produced by acinar cells.', protein: 'Trypsin-1 precursor', accession: 'P07477' },
    { id: 'COL3A1', name: 'Collagen III', role: 'Extracellular-matrix marker associated with stellate cells.', protein: 'Collagen alpha-1(III) chain', accession: 'P02461' },
    { id: 'KDR', name: 'VEGFR2', role: 'Receptor marker associated with vascular endothelial cells.', protein: 'Vascular endothelial growth factor receptor 2', accession: 'P35968' },
    { id: 'PTPRC', name: 'CD45', role: 'Broad marker found on many immune cells.', protein: 'Receptor-type tyrosine-protein phosphatase C', accession: 'P08575' }
  ];

  var CELL_TYPES = [
    {
      id: 'beta', label: 'Beta cell', color: '#0f766e', center: [188, 116], marker: 'INS',
      job: 'Senses blood glucose and secretes insulin to help tissues take up and store glucose.',
      evidence: { INS: 100, GCG: 8, SST: 3, KRT19: 2, PRSS1: 2, COL3A1: 2, KDR: 1, PTPRC: 1 }
    },
    {
      id: 'alpha', label: 'Alpha cell', color: '#b45309', center: [355, 87], marker: 'GCG',
      job: 'Secretes glucagon, which helps raise blood glucose when energy is needed.',
      evidence: { INS: 10, GCG: 100, SST: 4, KRT19: 2, PRSS1: 1, COL3A1: 1, KDR: 1, PTPRC: 1 }
    },
    {
      id: 'delta', label: 'Delta cell', color: '#7c3aed', center: [511, 137], marker: 'SST',
      job: 'Secretes somatostatin, a local signal that regulates nearby endocrine cells.',
      evidence: { INS: 8, GCG: 7, SST: 100, KRT19: 2, PRSS1: 1, COL3A1: 1, KDR: 1, PTPRC: 1 }
    },
    {
      id: 'ductal', label: 'Ductal cell', color: '#0369a1', center: [584, 282], marker: 'KRT19',
      job: 'Lines pancreatic ducts that carry digestive secretions toward the intestine.',
      evidence: { INS: 2, GCG: 2, SST: 1, KRT19: 100, PRSS1: 8, COL3A1: 9, KDR: 3, PTPRC: 2 }
    },
    {
      id: 'acinar', label: 'Acinar cell', color: '#be123c', center: [412, 340], marker: 'PRSS1',
      job: 'Produces digestive enzyme precursors that are released into pancreatic ducts.',
      evidence: { INS: 2, GCG: 1, SST: 1, KRT19: 6, PRSS1: 100, COL3A1: 2, KDR: 1, PTPRC: 1 }
    },
    {
      id: 'stellate', label: 'Stellate cell', color: '#4d7c0f', center: [229, 323], marker: 'COL3A1',
      job: 'Maintains extracellular matrix and participates in tissue repair and fibrosis.',
      evidence: { INS: 1, GCG: 1, SST: 1, KRT19: 7, PRSS1: 2, COL3A1: 100, KDR: 8, PTPRC: 3 }
    },
    {
      id: 'endothelial', label: 'Endothelial cell', color: '#0e7490', center: [93, 245], marker: 'KDR',
      job: 'Forms the inner lining of blood vessels that supply pancreatic tissue.',
      evidence: { INS: 1, GCG: 1, SST: 1, KRT19: 3, PRSS1: 1, COL3A1: 12, KDR: 100, PTPRC: 3 }
    },
    {
      id: 'immune', label: 'Immune cell', color: '#9f1239', center: [104, 369], marker: 'PTPRC',
      job: 'Surveys tissue, communicates with other cells, and responds to damage or infection.',
      evidence: { INS: 1, GCG: 1, SST: 1, KRT19: 1, PRSS1: 1, COL3A1: 3, KDR: 2, PTPRC: 100 }
    }
  ];

  var CHALLENGES = [
    {
      id: 'hormone',
      title: 'Glucose-control mystery',
      prompt: 'This endocrine cell strongly expresses INS and only weakly expresses the other displayed markers.',
      answer: 'beta',
      profile: { INS: 96, GCG: 7, SST: 3, KRT19: 2, PRSS1: 1, COL3A1: 2, KDR: 1, PTPRC: 1 }
    },
    {
      id: 'duct',
      title: 'Pancreatic plumbing mystery',
      prompt: 'This epithelial cell strongly expresses KRT19 and does not show a strong endocrine-hormone marker.',
      answer: 'ductal',
      profile: { INS: 2, GCG: 2, SST: 1, KRT19: 94, PRSS1: 7, COL3A1: 8, KDR: 3, PTPRC: 2 }
    },
    {
      id: 'matrix',
      title: 'Tissue-support mystery',
      prompt: 'This cell strongly expresses COL3A1, evidence that it contributes to extracellular matrix.',
      answer: 'stellate',
      profile: { INS: 1, GCG: 1, SST: 1, KRT19: 8, PRSS1: 2, COL3A1: 91, KDR: 9, PTPRC: 3 }
    }
  ];


  var LUNG_SOURCE = {
    title: 'The integrated Human Lung Cell Atlas (HLCA) v1.0',
    project: 'Sikkema et al. (2023), Nature Medicine',
    hcaId: 'HLCA-v1.0',
    hcaUrl: 'https://data.humancellatlas.org/hca-bio-networks/lung/atlases/lung-v1-0',
    codeUrl: 'https://github.com/LungCellAtlas/HLCA',
    licenseUrl: 'https://data.humancellatlas.org/about/data-use-agreement',
    license: 'CC BY 4.0',
    organism: 'Homo sapiens',
    tissue: 'respiratory tract',
    condition: 'healthy core plus mapped disease datasets',
    sampleSummary: '486 individuals in the full atlas; 107 healthy individuals in the core reference',
    estimatedCells: '2.3M',
    methodNote: 'The healthy HLCA core integrates 107 individuals using scANVI and consensus annotations from six experts; additional datasets were mapped to the core with scArches.'
  };

  var LUNG_GENES = [
    { id: 'SFTPC', name: 'Surfactant protein C', role: 'Canonical marker of alveolar type 2 cells that produce pulmonary surfactant.', protein: 'Pulmonary surfactant-associated protein C', accession: 'P11686' },
    { id: 'AGER', name: 'RAGE', role: 'Cell-surface receptor commonly used as an alveolar type 1 cell marker.', protein: 'Advanced glycosylation end product-specific receptor', accession: 'Q15109' },
    { id: 'FOXJ1', name: 'Forkhead box J1', role: 'Transcription factor associated with the motile-cilia program in airway ciliated cells.', protein: 'Forkhead box protein J1', accession: 'Q92949' },
    { id: 'SCGB1A1', name: 'Secretoglobin 1A1', role: 'Secreted protein strongly associated with airway club cells.', protein: 'Uteroglobin', accession: 'P11684' },
    { id: 'KRT5', name: 'Keratin 5', role: 'Structural marker associated with airway basal epithelial cells.', protein: 'Keratin, type II cytoskeletal 5', accession: 'P13647' },
    { id: 'COL1A1', name: 'Collagen I', role: 'Extracellular-matrix marker associated with lung fibroblasts.', protein: 'Collagen alpha-1(I) chain', accession: 'P02452' },
    { id: 'PECAM1', name: 'CD31', role: 'Cell-adhesion marker associated with vascular endothelial cells.', protein: 'Platelet endothelial cell adhesion molecule', accession: 'P16284' },
    { id: 'PTPRC', name: 'CD45', role: 'Broad marker found on many immune cells.', protein: 'Receptor-type tyrosine-protein phosphatase C', accession: 'P08575' }
  ];

  var LUNG_CELL_TYPES = [
    { id: 'at2', label: 'Alveolar type 2 cell', color: '#0f766e', center: [176, 112], marker: 'SFTPC', job: 'Produces surfactant and can help renew the alveolar epithelium after injury.', evidence: { SFTPC: 100, AGER: 12, FOXJ1: 3, SCGB1A1: 16, KRT5: 2, COL1A1: 2, PECAM1: 1, PTPRC: 1 } },
    { id: 'at1', label: 'Alveolar type 1 cell', color: '#2563eb', center: [356, 86], marker: 'AGER', job: 'Forms an extremely thin surface across which oxygen and carbon dioxide diffuse.', evidence: { SFTPC: 8, AGER: 100, FOXJ1: 2, SCGB1A1: 3, KRT5: 2, COL1A1: 5, PECAM1: 9, PTPRC: 1 } },
    { id: 'ciliated', label: 'Ciliated cell', color: '#7c3aed', center: [520, 137], marker: 'FOXJ1', job: 'Moves mucus and trapped particles along the airway using coordinated motile cilia.', evidence: { SFTPC: 2, AGER: 2, FOXJ1: 100, SCGB1A1: 14, KRT5: 8, COL1A1: 1, PECAM1: 1, PTPRC: 1 } },
    { id: 'club', label: 'Club cell', color: '#b45309', center: [584, 280], marker: 'SCGB1A1', job: 'Secretes protective molecules and helps maintain smaller airway epithelium.', evidence: { SFTPC: 8, AGER: 2, FOXJ1: 10, SCGB1A1: 100, KRT5: 7, COL1A1: 2, PECAM1: 1, PTPRC: 1 } },
    { id: 'basal', label: 'Basal cell', color: '#be123c', center: [421, 344], marker: 'KRT5', job: 'Acts as a progenitor-like epithelial cell that helps renew conducting airways.', evidence: { SFTPC: 2, AGER: 2, FOXJ1: 6, SCGB1A1: 8, KRT5: 100, COL1A1: 3, PECAM1: 1, PTPRC: 1 } },
    { id: 'fibroblast', label: 'Fibroblast', color: '#4d7c0f', center: [234, 324], marker: 'COL1A1', job: 'Builds and remodels extracellular matrix that supports lung structure.', evidence: { SFTPC: 1, AGER: 3, FOXJ1: 1, SCGB1A1: 1, KRT5: 3, COL1A1: 100, PECAM1: 8, PTPRC: 2 } },
    { id: 'lung_endothelial', label: 'Endothelial cell', color: '#0e7490', center: [94, 244], marker: 'PECAM1', job: 'Lines pulmonary blood vessels beside the gas-exchange surface.', evidence: { SFTPC: 1, AGER: 7, FOXJ1: 1, SCGB1A1: 1, KRT5: 1, COL1A1: 10, PECAM1: 100, PTPRC: 3 } },
    { id: 'lung_immune', label: 'Immune cell', color: '#9f1239', center: [106, 370], marker: 'PTPRC', job: 'Surveys the respiratory tract and responds to particles, microbes, and tissue signals.', evidence: { SFTPC: 1, AGER: 1, FOXJ1: 1, SCGB1A1: 1, KRT5: 1, COL1A1: 2, PECAM1: 4, PTPRC: 100 } }
  ];

  var LUNG_CHALLENGES = [
    { id: 'surfactant', title: 'Surfactant mystery', prompt: 'This alveolar cell strongly expresses SFTPC, evidence for a surfactant-producing identity.', answer: 'at2', profile: { SFTPC: 96, AGER: 11, FOXJ1: 3, SCGB1A1: 14, KRT5: 2, COL1A1: 2, PECAM1: 1, PTPRC: 1 } },
    { id: 'mucociliary', title: 'Airway conveyor mystery', prompt: 'This epithelial cell strongly expresses FOXJ1, a regulator associated with motile cilia.', answer: 'ciliated', profile: { SFTPC: 2, AGER: 2, FOXJ1: 95, SCGB1A1: 12, KRT5: 7, COL1A1: 1, PECAM1: 1, PTPRC: 1 } },
    { id: 'capillary', title: 'Vessel-lining mystery', prompt: 'This cell strongly expresses PECAM1, supporting a vascular endothelial identity.', answer: 'lung_endothelial', profile: { SFTPC: 1, AGER: 8, FOXJ1: 1, SCGB1A1: 1, KRT5: 1, COL1A1: 9, PECAM1: 94, PTPRC: 3 } }
  ];

  var BRAIN_SOURCE = {
    title: 'Human Brain Cell Atlas v1.0',
    project: 'Siletti et al. (2023), Science',
    hcaId: 'Human-Brain-v1.0',
    hcaUrl: 'https://data.humancellatlas.org/hca-bio-networks/nervous-system/atlases/brain-v1-0',
    codeUrl: 'https://github.com/linnarsson-lab/adult-human-brain',
    licenseUrl: 'https://data.humancellatlas.org/about/data-use-agreement',
    license: 'CC BY 4.0',
    organism: 'Homo sapiens',
    tissue: 'adult brain',
    condition: 'normal',
    sampleSummary: '3 postmortem donors; approximately 100 dissections across forebrain, midbrain, and hindbrain',
    estimatedCells: 'over 3M nuclei',
    methodNote: 'This atlas used high-throughput single-nucleus RNA sequencing across approximately 100 adult-brain dissections from three postmortem donors.'
  };

  var BRAIN_GENES = [
    { id: 'SLC17A7', name: 'VGLUT1', role: 'Vesicular glutamate transporter associated with many excitatory neurons.', protein: 'Vesicular glutamate transporter 1', accession: 'Q9P2U7' },
    { id: 'GAD1', name: 'Glutamate decarboxylase 1', role: 'Enzyme marker associated with GABA-producing inhibitory neurons.', protein: 'Glutamate decarboxylase 1', accession: 'Q99259' },
    { id: 'GFAP', name: 'Glial fibrillary acidic protein', role: 'Intermediate-filament marker associated with astrocytes.', protein: 'Glial fibrillary acidic protein', accession: 'P14136' },
    { id: 'MBP', name: 'Myelin basic protein', role: 'Myelin-associated marker of mature oligodendrocytes.', protein: 'Myelin basic protein', accession: 'P02686' },
    { id: 'PDGFRA', name: 'PDGF receptor alpha', role: 'Receptor marker associated with oligodendrocyte precursor cells.', protein: 'Platelet-derived growth factor receptor alpha', accession: 'P16234' },
    { id: 'AIF1', name: 'Allograft inflammatory factor 1', role: 'Immune-lineage marker commonly associated with microglia.', protein: 'Allograft inflammatory factor 1', accession: 'P55008' },
    { id: 'CLDN5', name: 'Claudin-5', role: 'Tight-junction marker associated with brain vascular endothelial cells.', protein: 'Claudin-5', accession: 'O00501' },
    { id: 'RGS5', name: 'Regulator of G-protein signaling 5', role: 'Vascular mural-cell marker associated with pericytes.', protein: 'Regulator of G-protein signaling 5', accession: 'O15539' }
  ];

  var BRAIN_CELL_TYPES = [
    { id: 'excitatory', label: 'Excitatory neuron', color: '#0f766e', center: [176, 112], marker: 'SLC17A7', job: 'Uses glutamatergic signaling in circuits that transmit and process information.', evidence: { SLC17A7: 100, GAD1: 4, GFAP: 2, MBP: 1, PDGFRA: 1, AIF1: 1, CLDN5: 1, RGS5: 1 } },
    { id: 'inhibitory', label: 'Inhibitory neuron', color: '#b45309', center: [356, 86], marker: 'GAD1', job: 'Uses GABAergic signaling to shape timing and limit activity in neural circuits.', evidence: { SLC17A7: 5, GAD1: 100, GFAP: 2, MBP: 1, PDGFRA: 1, AIF1: 1, CLDN5: 1, RGS5: 1 } },
    { id: 'astrocyte', label: 'Astrocyte', color: '#7c3aed', center: [520, 137], marker: 'GFAP', job: 'Supports neuronal environments, neurotransmitter balance, metabolism, and barrier functions.', evidence: { SLC17A7: 2, GAD1: 2, GFAP: 100, MBP: 5, PDGFRA: 8, AIF1: 2, CLDN5: 2, RGS5: 2 } },
    { id: 'oligodendrocyte', label: 'Oligodendrocyte', color: '#2563eb', center: [584, 280], marker: 'MBP', job: 'Produces myelin that insulates many axons in the central nervous system.', evidence: { SLC17A7: 1, GAD1: 1, GFAP: 5, MBP: 100, PDGFRA: 12, AIF1: 1, CLDN5: 1, RGS5: 1 } },
    { id: 'opc', label: 'Oligodendrocyte precursor', color: '#be123c', center: [421, 344], marker: 'PDGFRA', job: 'Can proliferate and differentiate along the oligodendrocyte lineage.', evidence: { SLC17A7: 1, GAD1: 1, GFAP: 7, MBP: 14, PDGFRA: 100, AIF1: 1, CLDN5: 1, RGS5: 2 } },
    { id: 'microglia', label: 'Microglia', color: '#9f1239', center: [234, 324], marker: 'AIF1', job: 'Acts as a resident immune cell that surveys the central nervous system.', evidence: { SLC17A7: 1, GAD1: 1, GFAP: 2, MBP: 1, PDGFRA: 1, AIF1: 100, CLDN5: 2, RGS5: 2 } },
    { id: 'brain_endothelial', label: 'Endothelial cell', color: '#0e7490', center: [94, 244], marker: 'CLDN5', job: 'Lines brain blood vessels and contributes to blood-brain barrier properties.', evidence: { SLC17A7: 1, GAD1: 1, GFAP: 2, MBP: 1, PDGFRA: 2, AIF1: 3, CLDN5: 100, RGS5: 12 } },
    { id: 'pericyte', label: 'Pericyte', color: '#4d7c0f', center: [106, 370], marker: 'RGS5', job: 'Wraps small blood vessels and helps support vascular stability and signaling.', evidence: { SLC17A7: 1, GAD1: 1, GFAP: 2, MBP: 1, PDGFRA: 4, AIF1: 2, CLDN5: 12, RGS5: 100 } }
  ];

  var BRAIN_CHALLENGES = [
    { id: 'glutamate', title: 'Excitatory-circuit mystery', prompt: 'This neural cell strongly expresses SLC17A7, evidence for a glutamatergic excitatory identity.', answer: 'excitatory', profile: { SLC17A7: 96, GAD1: 4, GFAP: 2, MBP: 1, PDGFRA: 1, AIF1: 1, CLDN5: 1, RGS5: 1 } },
    { id: 'myelin', title: 'Axon-insulation mystery', prompt: 'This glial cell strongly expresses MBP, evidence for a mature myelin-producing identity.', answer: 'oligodendrocyte', profile: { SLC17A7: 1, GAD1: 1, GFAP: 5, MBP: 95, PDGFRA: 12, AIF1: 1, CLDN5: 1, RGS5: 1 } },
    { id: 'barrier', title: 'Blood-brain barrier mystery', prompt: 'This vascular cell strongly expresses CLDN5, supporting an endothelial identity.', answer: 'brain_endothelial', profile: { SLC17A7: 1, GAD1: 1, GFAP: 2, MBP: 1, PDGFRA: 2, AIF1: 3, CLDN5: 94, RGS5: 11 } }
  ];

  var TISSUES = [
    {
      id: 'pancreas', label: 'Pancreas', icon: '\u25c9', source: SOURCE, genes: GENES, cells: CELL_TYPES, challenges: CHALLENGES,
      defaultCell: 'beta', defaultCompare: 'ductal', crossGene: 'INS',
      subtitle: 'Classify pancreatic cells, then follow insulin from beta-cell identity toward protein structure.',
      mapTitle: 'Pancreas cell neighborhood',
      mapAria: 'Illustrative pancreas cell-type expression neighborhood',
      mission: 'How do endocrine, digestive, vascular, and support cells divide the work of one organ?',
      primaryJourney: { toolId: 'alphaFoldExplorer', stateKey: '_alphaFoldExplorer', label: 'AlphaFold Explorer with human insulin', button: 'INS to AlphaFold', state: { prefillAccession: 'P01308', prefillLabel: 'Human insulin', prefillSource: 'Cell Atlas Lab pancreas investigation' } }
    },
    {
      id: 'lung', label: 'Lung', icon: '\u223f', source: LUNG_SOURCE, genes: LUNG_GENES, cells: LUNG_CELL_TYPES, challenges: LUNG_CHALLENGES,
      defaultCell: 'at2', defaultCompare: 'ciliated', crossGene: 'SFTPC',
      subtitle: 'Compare gas-exchange, airway, vascular, structural, and immune cell programs.',
      mapTitle: 'Lung cell neighborhood',
      mapAria: 'Illustrative lung cell-type expression neighborhood',
      mission: 'How do airway and alveolar cells specialize for defense, renewal, and gas exchange?',
      primaryJourney: { toolId: 'anatomy', stateKey: 'anatomy', label: 'Human Anatomy Explorer respiratory system', button: 'Zoom out to lung anatomy', state: { _activeTab: 'explore', _cellAtlasFocus: 'lung' } }
    },
    {
      id: 'brain', label: 'Brain', icon: '\u2736', source: BRAIN_SOURCE, genes: BRAIN_GENES, cells: BRAIN_CELL_TYPES, challenges: BRAIN_CHALLENGES,
      defaultCell: 'excitatory', defaultCompare: 'astrocyte', crossGene: 'SLC17A7',
      subtitle: 'Compare neuronal, glial, immune, and vascular identities across the adult brain.',
      mapTitle: 'Brain cell neighborhood',
      mapAria: 'Illustrative brain cell-type expression neighborhood',
      mission: 'How do neurons, glia, immune cells, and vascular cells support brain circuits together?',
      primaryJourney: { toolId: 'brainAtlas', stateKey: 'brainAtlas', label: 'Brain Atlas Explorer', button: 'Zoom out to Brain Atlas', state: { _cellAtlasFocus: 'cell-types' } }
    }
  ];

  var DESIGN_DEFAULT = {
    question: 'diversity',
    donors: '10',
    regions: '5',
    preparation: 'cells',
    depth: 'balanced',
    batchPlan: 'balanced'
  };

  var DESIGN_FIELDS = [
    {
      id: 'question', label: 'Study question',
      options: [
        { value: 'diversity', label: 'Map common diversity', note: 'Prioritize broad representation of common cell programs.' },
        { value: 'rare', label: 'Search for rare cells', note: 'Prioritize recovery and sensitivity; enrichment may alter apparent proportions.' },
        { value: 'comparison', label: 'Compare two groups', note: 'Prioritize biological replication and avoid confounding group with batch.' }
      ]
    },
    {
      id: 'donors', label: 'Biological donors',
      options: [
        { value: '3', label: '3 donors', note: 'A small first draft; individual variation can dominate.' },
        { value: '10', label: '10 donors', note: 'Broader biological replication with moderate complexity.' },
        { value: '30', label: '30 donors', note: 'Stronger population coverage with much greater coordination.' }
      ]
    },
    {
      id: 'regions', label: 'Tissue regions',
      options: [
        { value: '1', label: '1 region', note: 'Focused sampling that may miss spatial diversity.' },
        { value: '5', label: '5 regions', note: 'Moderate anatomical coverage.' },
        { value: '20', label: '20 regions', note: 'Broad spatial coverage with substantial processing demands.' }
      ]
    },
    {
      id: 'preparation', label: 'Material captured',
      options: [
        { value: 'cells', label: 'Intact cells', note: 'Richer whole-cell RNA, but dissociation can underrecover fragile cells.' },
        { value: 'nuclei', label: 'Nuclei', note: 'Useful for frozen or difficult tissue; measures a different RNA compartment.' },
        { value: 'mixed', label: 'Cells + nuclei', note: 'Broader recovery, but protocols must be compared and integrated carefully.' }
      ]
    },
    {
      id: 'depth', label: 'Sequencing strategy',
      options: [
        { value: 'survey', label: 'Broad, shallow survey', note: 'More profiles with less information captured per profile.' },
        { value: 'balanced', label: 'Balanced depth', note: 'A compromise between cell count and per-cell sensitivity.' },
        { value: 'deep', label: 'Deep profiles', note: 'More transcript sensitivity per profile, usually at higher resource cost.' }
      ]
    },
    {
      id: 'batchPlan', label: 'Group-to-batch plan',
      options: [
        { value: 'confounded', label: 'Groups in separate batches', note: 'Biology and batch cannot be cleanly separated.' },
        { value: 'balanced', label: 'Groups balanced per batch', note: 'Reduces systematic confounding.' },
        { value: 'replicated', label: 'Balanced + replicated batches', note: 'Adds robustness and complexity.' }
      ]
    }
  ];

  var DESIGN_CASES = [
    {
      id: 'fragile',
      title: 'Missing fragile cells',
      signal: 'A known fragile cell population is common in microscopy but nearly absent after tissue dissociation.',
      answer: 'preparation',
      choices: [
        { id: 'label', label: 'Rename the remaining clusters' },
        { id: 'preparation', label: 'Compare preparation methods or use nuclei' },
        { id: 'depth', label: 'Interpret absence as proof the cells are not present' }
      ],
      explanation: 'Dissociation can preferentially lose fragile or tightly attached cells. A preparation comparison can test recovery bias; nuclei measure a different RNA compartment and are not a perfect substitute.'
    },
    {
      id: 'doublet',
      title: 'Two identities in one droplet',
      signal: 'A small cluster strongly expresses mutually incompatible marker programs from two abundant cell types.',
      answer: 'doublet',
      choices: [
        { id: 'newtype', label: 'Declare a new hybrid cell type immediately' },
        { id: 'doublet', label: 'Check doublet scores and library complexity' },
        { id: 'average', label: 'Average it into the nearest cluster' }
      ],
      explanation: 'Two cells can be captured together, producing a mixed expression profile. Doublet detection and supporting metadata should be checked before proposing a new biological identity.'
    },
    {
      id: 'batch',
      title: 'Clusters follow processing day',
      signal: 'Cells separate mainly by sequencing run and processing day rather than donor, region, or expected biology.',
      answer: 'metadata',
      choices: [
        { id: 'metadata', label: 'Inspect batch metadata and integration choices' },
        { id: 'delete', label: 'Delete the smaller run without review' },
        { id: 'biology', label: 'Call every run-specific cluster a new cell state' }
      ],
      explanation: 'Technical batch can create apparent structure. Inspect metadata, experimental balance, quality metrics, and integration behavior while preserving genuine biological differences.'
    },
    {
      id: 'dropout',
      title: 'Expected marker reads zero',
      signal: 'One cell has zero observed RNA for an expected marker, while nearby cells with the same multigene profile express it.',
      answer: 'panel',
      choices: [
        { id: 'reject', label: 'Reject the identity from that single zero alone' },
        { id: 'panel', label: 'Use the full marker panel and neighboring evidence' },
        { id: 'invent', label: 'Replace the zero with an invented count' }
      ],
      explanation: 'Failure to observe a transcript in one profile is not proof of biological absence. Annotation should use multigene patterns, replicated cells, and quality information without fabricating values.'
    },
    {
      id: 'singlemarker',
      title: 'One marker disagrees',
      signal: 'A proposed label is supported by one marker but conflicts with several other genes and the reference profile.',
      answer: 'validate',
      choices: [
        { id: 'validate', label: 'Recheck a broader panel and independent references' },
        { id: 'force', label: 'Keep the label because one marker is enough' },
        { id: 'distance', label: 'Use plot distance as proof of physical location' }
      ],
      explanation: 'Cell annotation is a converging-evidence problem. A broader panel, reference mapping, expert review, and orthogonal validation are stronger than one marker alone.'
    }
  ];

  var DESIGN_METHOD_URL = 'https://explore.data.humancellatlas.org/projects/6e177195-0ac0-468b-99a2-87de96dc9db4';
  var CONTROLLED_DATA_URL = 'https://data.humancellatlas.org/guides/requesting-access-to-controlled-access-data';

  var CROSS_TISSUE_LENSES = [
    {
      id: 'vascular',
      title: 'Vascular interfaces',
      question: 'How do vessel-lining cells adapt to the organ they supply?',
      conserved: 'All three selected cells contribute to an interface between blood and tissue.',
      caution: 'Shared vascular function does not mean that one displayed marker defines every endothelial cell.',
      members: [
        { tissueId: 'pancreas', cellId: 'endothelial', connection: 'KDR evidence highlights a vascular receptor program in this teaching panel.' },
        { tissueId: 'lung', cellId: 'lung_endothelial', connection: 'PECAM1 evidence highlights cell adhesion at the pulmonary vascular surface.' },
        { tissueId: 'brain', cellId: 'brain_endothelial', connection: 'CLDN5 evidence highlights tight-junction specialization at the blood-brain barrier.' }
      ]
    },
    {
      id: 'immune',
      title: 'Immune surveillance',
      question: 'How can immune surveillance be shared yet tissue-specialized?',
      conserved: 'Each selected cell participates in sensing disturbances and coordinating responses.',
      caution: 'Microglia are specialized central-nervous-system residents; functional comparison does not make all three cells interchangeable.',
      members: [
        { tissueId: 'pancreas', cellId: 'immune', connection: 'PTPRC supports a broad immune identity in pancreatic tissue.' },
        { tissueId: 'lung', cellId: 'lung_immune', connection: 'PTPRC supports immune surveillance at an environmentally exposed surface.' },
        { tissueId: 'brain', cellId: 'microglia', connection: 'AIF1 supports a specialized resident immune identity in the brain.' }
      ]
    },
    {
      id: 'support',
      title: 'Tissue support systems',
      question: 'How can different cell lineages solve related support problems?',
      conserved: 'Each selected cell helps maintain the local environment needed by more specialized cells.',
      caution: 'This is a functional analogy, not a claim that stellate cells, fibroblasts, and astrocytes share one cell lineage.',
      members: [
        { tissueId: 'pancreas', cellId: 'stellate', connection: 'COL3A1 evidence emphasizes extracellular-matrix support and remodeling.' },
        { tissueId: 'lung', cellId: 'fibroblast', connection: 'COL1A1 evidence emphasizes structural extracellular matrix in lung tissue.' },
        { tissueId: 'brain', cellId: 'astrocyte', connection: 'GFAP evidence highlights a glial support program around neural circuits.' }
      ]
    }
  ];

  var ATLAS_PIPELINE = [
    { id: 'design', label: '1. Design + sample', action: 'Choose donors, tissue regions, conditions, and metadata that answer a defined question.', uncertainty: 'Who and which regions are sampled determines what the atlas can represent.' },
    { id: 'isolate', label: '2. Isolate cells or nuclei', action: 'Separate tissue into cells, or isolate nuclei when intact cells are difficult to recover.', uncertainty: 'Fragile or tightly attached cell types may be lost or overrepresented.' },
    { id: 'sequence', label: '3. Capture + sequence RNA', action: 'Tag RNA molecules so expression can be estimated for individual cells or nuclei.', uncertainty: 'Capture efficiency, sequencing depth, and technical dropout affect observed counts.' },
    { id: 'quality', label: '4. Quality control + matrix', action: 'Filter low-quality profiles and possible doublets, then build a cell-by-gene expression matrix.', uncertainty: 'Filtering thresholds are analytical choices, not neutral facts.' },
    { id: 'integrate', label: '5. Integrate + cluster', action: 'Reduce technical differences and group cells with similar multigene profiles.', uncertainty: 'Batch correction, parameters, and embeddings can change apparent neighborhoods.' },
    { id: 'annotate', label: '6. Annotate + validate', action: 'Use marker panels, references, biological knowledge, and expert review to propose cell labels.', uncertainty: 'Labels are evidence-based interpretations that can be refined as references improve.' }
  ];

  function designLevel(score) {
    return score >= 75 ? 'strong' : score >= 50 ? 'developing' : 'limited';
  }

  function evaluateDesign(input) {
    var config = Object.assign({}, DESIGN_DEFAULT, input || {});
    var donorScore = { '3': 35, '10': 68, '30': 92 }[config.donors] || 35;
    var regionScore = { '1': 30, '5': 65, '20': 92 }[config.regions] || 30;
    var depthScore = { survey: 35, balanced: 68, deep: 92 }[config.depth] || 35;
    var recoveryScore = { cells: 52, nuclei: 72, mixed: 90 }[config.preparation] || 52;
    var batchScore = { confounded: 20, balanced: 72, replicated: 92 }[config.batchPlan] || 20;
    var representation = Math.round(donorScore * .55 + regionScore * .45);
    var rare = Math.min(100, Math.round(depthScore * .5 + recoveryScore * .3 + donorScore * .2 + (config.question === 'rare' ? 6 : 0)));
    var comparison = Math.min(100, Math.round(donorScore * .48 + batchScore * .52 + (config.question === 'comparison' ? 5 : 0)));
    var recovery = recoveryScore;
    var complexityPoints =
      ({ '3': 0, '10': 1, '30': 2 }[config.donors] || 0) +
      ({ '1': 0, '5': 1, '20': 2 }[config.regions] || 0) +
      ({ survey: 0, balanced: 1, deep: 2 }[config.depth] || 0) +
      ({ cells: 0, nuclei: 0, mixed: 2 }[config.preparation] || 0) +
      ({ confounded: 0, balanced: 1, replicated: 2 }[config.batchPlan] || 0);
    var complexity = complexityPoints >= 7 ? 'high' : complexityPoints >= 4 ? 'moderate' : 'lower';
    var priority = config.question === 'rare'
      ? 'Rare-cell searches benefit from recovery and sensitivity, but enrichment or deeper sampling can change apparent cell proportions.'
      : config.question === 'comparison'
        ? 'Group comparisons need biological replication and balanced batches; computational correction cannot fully rescue a confounded design.'
        : 'Diversity mapping benefits from donor and regional coverage, while every added stratum increases coordination and metadata demands.';
    return {
      config: config,
      dimensions: [
        { id: 'representation', label: 'Population + regional representation', level: designLevel(representation), reason: config.donors + ' donors across ' + config.regions + ' region(s).' },
        { id: 'rare', label: 'Rare-program sensitivity', level: designLevel(rare), reason: config.depth + ' depth with ' + config.preparation + ' preparation.' },
        { id: 'comparison', label: 'Group-comparison robustness', level: designLevel(comparison), reason: config.batchPlan + ' batch plan with ' + config.donors + ' donors.' },
        { id: 'recovery', label: 'Preparation breadth', level: designLevel(recovery), reason: config.preparation === 'mixed' ? 'Two material types broaden recovery but complicate integration.' : 'One material type has a clearer protocol boundary.' }
      ],
      raw: { representation: representation, rare: rare, comparison: comparison, recovery: recovery },
      complexity: complexity,
      priority: priority
    };
  }

  function tissueById(id) {
    return TISSUES.filter(function (item) { return item.id === id; })[0] || TISSUES[0];
  }

  function lensById(id) {
    return CROSS_TISSUE_LENSES.filter(function (item) { return item.id === id; })[0] || CROSS_TISSUE_LENSES[0];
  }

  function notebookProgress(entry, lensId) {
    var note = entry || {};
    var lens = lensById(lensId);
    var markers = lens.members.map(function (member) {
      return cellById(member.cellId, member.tissueId).marker;
    });
    var evidenceText = String(note.evidence || '').toUpperCase();
    var markerHits = markers.filter(function (marker) { return evidenceText.indexOf(marker) >= 0; }).length;
    return {
      claim: String(note.claim || '').trim().length >= 20,
      evidence: markerHits >= 2,
      reasoning: String(note.reasoning || '').trim().length >= 35,
      markerHits: markerHits,
      complete: String(note.claim || '').trim().length >= 20 && markerHits >= 2 && String(note.reasoning || '').trim().length >= 35
    };
  }

  function cellById(id, tissueId) {
    var tissue = tissueById(tissueId);
    return tissue.cells.filter(function (item) { return item.id === id; })[0] || tissue.cells[0];
  }

  function geneById(id, tissueId) {
    var tissue = tissueById(tissueId);
    return tissue.genes.filter(function (item) { return item.id === id; })[0] || tissue.genes[0];
  }

  function cosineSimilarity(left, right, tissueId) {
    var dot = 0, leftSq = 0, rightSq = 0;
    tissueById(tissueId).genes.forEach(function (gene) {
      var a = Number(left[gene.id]) || 0;
      var b = Number(right[gene.id]) || 0;
      dot += a * b;
      leftSq += a * a;
      rightSq += b * b;
    });
    if (!leftSq || !rightSq) return 0;
    return dot / Math.sqrt(leftSq * rightSq);
  }

  function classifyExpression(profile, tissueId) {
    var tissue = tissueById(tissueId);
    return tissue.cells.map(function (cell) {
      return { id: cell.id, label: cell.label, score: cosineSimilarity(profile || {}, cell.evidence, tissue.id) };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function markerStrength(cellId, geneId, tissueId) {
    return Number(cellById(cellId, tissueId).evidence[geneId]) || 0;
  }

  function realEvidence(snapshot, cellId, geneId, metricId) {
    if (!snapshot || !snapshot.cellTypes || !snapshot.cellTypes[cellId]) return null;
    var cell = snapshot.cellTypes[cellId];
    if (!cell.available || !cell.genes || !cell.genes[geneId]) return null;
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    return Number(cell.genes[geneId][metric]);
  }

  function mappedSnapshotCellCount(snapshot) {
    if (!snapshot || !snapshot.cellTypes) return 0;
    return Object.keys(snapshot.cellTypes).reduce(function (total, key) {
      var cell = snapshot.cellTypes[key];
      return total + (cell && cell.available ? Number(cell.cellCount) || 0 : 0);
    }, 0);
  }

  function benchmarkRealMetrics(snapshot) {
    var definitions = [
      { id: 'detectionPct', label: 'Detection frequency' },
      { id: 'relativeMeanPct', label: 'Relative mean signal' }
    ];
    if (!snapshot || !snapshot.cellTypes || !Array.isArray(snapshot.genes)) return [];
    return definitions.map(function (definition) {
      var rows = tissueById('pancreas').cells.reduce(function (items, cell) {
        var aggregate = snapshot.cellTypes[cell.id];
        if (!aggregate || !aggregate.available) return items;
        var profile = {};
        snapshot.genes.forEach(function (geneId) {
          profile[geneId] = realEvidence(snapshot, cell.id, geneId, definition.id) || 0;
        });
        var ranking = classifyExpression(profile, 'pancreas');
        var best = ranking[0] || { id: '', label: 'No result', score: 0 };
        var runnerUp = ranking[1] || { score: 0 };
        items.push({
          actualId: cell.id,
          actualLabel: cell.label,
          sourceCellType: aggregate.sourceCellType,
          predictedId: best.id,
          predictedLabel: best.label,
          aligned: best.id === cell.id,
          score: best.score,
          margin: best.score - runnerUp.score,
          ranking: ranking.slice(0, 3)
        });
        return items;
      }, []);
      return {
        id: definition.id,
        label: definition.label,
        alignedCount: rows.filter(function (row) { return row.aligned; }).length,
        totalCount: rows.length,
        distinctPredictions: rows.reduce(function (seen, row) {
          if (seen.indexOf(row.predictedId) === -1) seen.push(row.predictedId);
          return seen;
        }, []),
        rows: rows
      };
    });
  }

  function markerAblation(snapshot, cellId, metricId, omittedGeneId) {
    if (!snapshot || !snapshot.cellTypes || !snapshot.cellTypes[cellId] || !snapshot.cellTypes[cellId].available || !Array.isArray(snapshot.genes)) return null;
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    var omitted = snapshot.genes.indexOf(omittedGeneId) >= 0 ? omittedGeneId : '';
    var baselineProfile = {};
    snapshot.genes.forEach(function (geneId) {
      baselineProfile[geneId] = realEvidence(snapshot, cellId, geneId, metric) || 0;
    });
    var ablatedProfile = Object.assign({}, baselineProfile);
    if (omitted) ablatedProfile[omitted] = 0;
    var baselineRanking = classifyExpression(baselineProfile, 'pancreas');
    var ablatedRanking = classifyExpression(ablatedProfile, 'pancreas');
    return {
      cellId: cellId,
      cellLabel: cellById(cellId, 'pancreas').label,
      metricId: metric,
      omittedGeneId: omitted,
      baselineTop: baselineRanking[0],
      ablatedTop: ablatedRanking[0],
      changed: !!omitted && baselineRanking[0].id !== ablatedRanking[0].id,
      baselineRanking: baselineRanking.slice(0, 3),
      ablatedRanking: ablatedRanking.slice(0, 3)
    };
  }

  function auditMarkerAblation(snapshot, metricId) {
    if (!snapshot || !snapshot.cellTypes || !Array.isArray(snapshot.genes)) return [];
    return tissueById('pancreas').cells.reduce(function (rows, cell) {
      var aggregate = snapshot.cellTypes[cell.id];
      if (!aggregate || !aggregate.available) return rows;
      var baseline = markerAblation(snapshot, cell.id, metricId, '');
      var influentialGenes = snapshot.genes.filter(function (geneId) {
        var trial = markerAblation(snapshot, cell.id, metricId, geneId);
        return trial && trial.changed;
      });
      rows.push({
        cellId: cell.id,
        cellLabel: cell.label,
        baselineId: baseline.baselineTop.id,
        baselineLabel: baseline.baselineTop.label,
        influentialGenes: influentialGenes
      });
      return rows;
    }, []);
  }

  var PANEL_SEARCH_CACHE = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var PERTURBATION_CACHE = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var REPLICATE_TRANSFER_CACHE = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function evaluateGenePanel(snapshot, metricId, selectedGenes) {
    if (!snapshot || !snapshot.cellTypes || !Array.isArray(snapshot.genes)) return { genes: [], alignedCount: 0, totalCount: 0, rows: [] };
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    var requested = Array.isArray(selectedGenes) ? selectedGenes : [];
    var genes = snapshot.genes.filter(function (geneId) { return requested.indexOf(geneId) >= 0; });
    var availableCells = tissueById('pancreas').cells.filter(function (cell) {
      return snapshot.cellTypes[cell.id] && snapshot.cellTypes[cell.id].available;
    });
    if (!genes.length) return { genes: [], alignedCount: 0, totalCount: availableCells.length, rows: [] };
    var rows = availableCells.map(function (cell) {
      var profile = {};
      snapshot.genes.forEach(function (geneId) {
        profile[geneId] = genes.indexOf(geneId) >= 0 ? (realEvidence(snapshot, cell.id, geneId, metric) || 0) : 0;
      });
      var ranking = classifyExpression(profile, 'pancreas');
      return {
        actualId: cell.id,
        actualLabel: cell.label,
        predictedId: ranking[0].id,
        predictedLabel: ranking[0].label,
        aligned: ranking[0].id === cell.id,
        score: ranking[0].score,
        margin: ranking[0].score - ranking[1].score
      };
    });
    return {
      genes: genes,
      alignedCount: rows.filter(function (row) { return row.aligned; }).length,
      totalCount: rows.length,
      rows: rows
    };
  }

  function searchGenePanels(snapshot, metricId) {
    if (!snapshot || !Array.isArray(snapshot.genes) || snapshot.genes.length > 12) return [];
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    var cached = PANEL_SEARCH_CACHE && PANEL_SEARCH_CACHE.get(snapshot);
    if (cached && cached[metric]) return cached[metric];
    var genes = snapshot.genes;
    var bestBySize = {};
    var limit = Math.pow(2, genes.length);
    for (var mask = 1; mask < limit; mask += 1) {
      var panel = genes.filter(function (_, index) { return !!(mask & Math.pow(2, index)); });
      var result = evaluateGenePanel(snapshot, metricId, panel);
      var current = bestBySize[panel.length];
      if (!current || result.alignedCount > current.alignedCount) {
        bestBySize[panel.length] = {
          size: panel.length,
          alignedCount: result.alignedCount,
          totalCount: result.totalCount,
          genes: panel
        };
      }
    }
    var frontier = Object.keys(bestBySize).map(function (key) { return bestBySize[key]; }).sort(function (a, b) { return a.size - b.size; });
    if (PANEL_SEARCH_CACHE) {
      cached = cached || {};
      cached[metric] = frontier;
      PANEL_SEARCH_CACHE.set(snapshot, cached);
    }
    return frontier;
  }

  function perturbationStability(snapshot, cellId, metricId, amount) {
    if (!snapshot || !snapshot.cellTypes || !snapshot.cellTypes[cellId] || !snapshot.cellTypes[cellId].available || !Array.isArray(snapshot.genes)) return null;
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    var allowed = [0.1, 0.25, 0.5];
    var fraction = allowed.indexOf(Number(amount)) >= 0 ? Number(amount) : 0.25;
    var profile = {};
    snapshot.genes.forEach(function (geneId) {
      profile[geneId] = realEvidence(snapshot, cellId, geneId, metric) || 0;
    });
    var baselineRanking = classifyExpression(profile, 'pancreas');
    var baselineTop = baselineRanking[0];
    var totalPatterns = Math.pow(2, snapshot.genes.length);
    var outcomeCounts = {};
    for (var mask = 0; mask < totalPatterns; mask += 1) {
      var perturbed = {};
      snapshot.genes.forEach(function (geneId, index) {
        var multiplier = mask & Math.pow(2, index) ? 1 + fraction : 1 - fraction;
        perturbed[geneId] = profile[geneId] * multiplier;
      });
      var top = classifyExpression(perturbed, 'pancreas')[0];
      outcomeCounts[top.id] = (outcomeCounts[top.id] || 0) + 1;
    }
    var outcomes = Object.keys(outcomeCounts).map(function (id) {
      return { id: id, label: cellById(id, 'pancreas').label, count: outcomeCounts[id], pct: outcomeCounts[id] / totalPatterns * 100 };
    }).sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
    var stableCount = outcomeCounts[baselineTop.id] || 0;
    return {
      cellId: cellId,
      cellLabel: cellById(cellId, 'pancreas').label,
      metricId: metric,
      amount: fraction,
      baselineTop: baselineTop,
      baselineAligned: baselineTop.id === cellId,
      stableCount: stableCount,
      totalPatterns: totalPatterns,
      stabilityPct: stableCount / totalPatterns * 100,
      outcomes: outcomes
    };
  }

  function auditPerturbationStability(snapshot, metricId, amount) {
    if (!snapshot || !snapshot.cellTypes || !Array.isArray(snapshot.genes)) return [];
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    var allowed = [0.1, 0.25, 0.5];
    var fraction = allowed.indexOf(Number(amount)) >= 0 ? Number(amount) : 0.25;
    var key = metric + ':' + fraction;
    var cached = PERTURBATION_CACHE && PERTURBATION_CACHE.get(snapshot);
    if (cached && cached[key]) return cached[key];
    var rows = tissueById('pancreas').cells.reduce(function (items, cell) {
      var result = perturbationStability(snapshot, cell.id, metric, fraction);
      if (result) items.push(result);
      return items;
    }, []);
    if (PERTURBATION_CACHE) {
      cached = cached || {};
      cached[key] = rows;
      PERTURBATION_CACHE.set(snapshot, cached);
    }
    return rows;
  }

  function replicateEvidence(snapshot, replicateId, cellId, geneId) {
    if (!snapshot || !Array.isArray(snapshot.replicates)) return null;
    var replicate = snapshot.replicates.filter(function (item) { return item.id === replicateId; })[0];
    var cell = replicate && replicate.cellTypes && replicate.cellTypes[cellId];
    return cell && cell.available && cell.genes && cell.genes[geneId] ? cell.genes[geneId] : null;
  }

  function leaveOneReplicateOutTransfer(snapshot, metricId) {
    if (!snapshot || !Array.isArray(snapshot.replicates) || snapshot.replicates.length < 2 || !Array.isArray(snapshot.genes)) return [];
    var metric = metricId === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
    var cached = REPLICATE_TRANSFER_CACHE && REPLICATE_TRANSFER_CACHE.get(snapshot);
    if (cached && cached[metric]) return cached[metric];
    var cellIds = tissueById('pancreas').cells.filter(function (cell) {
      return snapshot.cellTypes && snapshot.cellTypes[cell.id] && snapshot.cellTypes[cell.id].available &&
        snapshot.replicates.every(function (replicate) { return replicate.cellTypes[cell.id] && replicate.cellTypes[cell.id].available; });
    }).map(function (cell) { return cell.id; });
    var audits = snapshot.replicates.map(function (heldOut) {
      var training = snapshot.replicates.filter(function (replicate) { return replicate.id !== heldOut.id; });
      var centroids = {};
      cellIds.forEach(function (cellId) {
        centroids[cellId] = {};
        snapshot.genes.forEach(function (geneId) {
          centroids[cellId][geneId] = training.reduce(function (total, replicate) {
            return total + (Number(replicate.cellTypes[cellId].genes[geneId][metric]) || 0);
          }, 0) / training.length;
        });
      });
      var rows = cellIds.map(function (cellId) {
        var profile = {};
        snapshot.genes.forEach(function (geneId) {
          profile[geneId] = Number(heldOut.cellTypes[cellId].genes[geneId][metric]) || 0;
        });
        var ranking = cellIds.map(function (candidateId) {
          return {
            id: candidateId,
            label: cellById(candidateId, 'pancreas').label,
            score: cosineSimilarity(profile, centroids[candidateId], 'pancreas')
          };
        }).sort(function (a, b) { return b.score - a.score; });
        return {
          actualId: cellId,
          actualLabel: cellById(cellId, 'pancreas').label,
          predictedId: ranking[0].id,
          predictedLabel: ranking[0].label,
          aligned: ranking[0].id === cellId,
          score: ranking[0].score,
          margin: ranking[0].score - ranking[1].score,
          cellCount: heldOut.cellTypes[cellId].cellCount,
          lowCellCount: !!heldOut.cellTypes[cellId].lowCellCount,
          ranking: ranking.slice(0, 3)
        };
      });
      return {
        replicateId: heldOut.id,
        replicateLabel: heldOut.label,
        trainingReplicateCount: training.length,
        alignedCount: rows.filter(function (row) { return row.aligned; }).length,
        totalCount: rows.length,
        rows: rows
      };
    });
    if (REPLICATE_TRANSFER_CACHE) {
      cached = cached || {};
      cached[metric] = audits;
      REPLICATE_TRANSFER_CACHE.set(snapshot, cached);
    }
    return audits;
  }

  function wilsonInterval(successes, trials) {
    var n = Number(trials) || 0;
    var k = Number(successes) || 0;
    if (!n) return { lowPct: 0, highPct: 0 };
    var z = 1.96;
    var proportion = k / n;
    var denominator = 1 + z * z / n;
    var center = (proportion + z * z / (2 * n)) / denominator;
    var half = z * Math.sqrt(proportion * (1 - proportion) / n + z * z / (4 * n * n)) / denominator;
    return { lowPct: (center - half) * 100, highPct: (center + half) * 100 };
  }

  function replicateDetectionSummary(snapshot, cellId, geneId) {
    if (!snapshot || !snapshot.cellTypes || !snapshot.cellTypes[cellId] || !snapshot.cellTypes[cellId].available || !Array.isArray(snapshot.replicates)) return null;
    var pooledCell = snapshot.cellTypes[cellId];
    var pooledGene = pooledCell.genes && pooledCell.genes[geneId];
    if (!pooledGene) return null;
    var rows = snapshot.replicates.reduce(function (items, replicate) {
      var cell = replicate.cellTypes && replicate.cellTypes[cellId];
      var gene = cell && cell.available && cell.genes && cell.genes[geneId];
      if (!gene) return items;
      items.push({
        replicateId: replicate.id,
        replicateLabel: replicate.label,
        cellCount: cell.cellCount,
        detectedCells: gene.detectedCells,
        detectionPct: gene.detectionPct,
        lowCellCount: !!cell.lowCellCount
      });
      return items;
    }, []);
    var replicateDetected = rows.reduce(function (total, row) { return total + row.detectedCells; }, 0);
    var replicateCells = rows.reduce(function (total, row) { return total + row.cellCount; }, 0);
    var exactReplicateMeanPct = rows.length ? rows.reduce(function (total, row) {
      return total + (row.cellCount ? row.detectedCells / row.cellCount * 100 : 0);
    }, 0) / rows.length : 0;
    var percentages = rows.map(function (row) { return row.detectionPct; });
    var interval = wilsonInterval(pooledGene.detectedCells, pooledCell.cellCount);
    return {
      cellId: cellId,
      cellLabel: cellById(cellId, 'pancreas').label,
      geneId: geneId,
      donorCount: rows.length,
      pooledCellCount: pooledCell.cellCount,
      pooledDetectedCells: pooledGene.detectedCells,
      pooledDetectionPct: pooledGene.detectionPct,
      equalReplicateMeanPct: exactReplicateMeanPct,
      replicateMinPct: percentages.length ? Math.min.apply(Math, percentages) : 0,
      replicateMaxPct: percentages.length ? Math.max.apply(Math, percentages) : 0,
      naiveWilsonLowPct: interval.lowPct,
      naiveWilsonHighPct: interval.highPct,
      pooledMatchesReplicateTotals: replicateDetected === pooledGene.detectedCells && replicateCells === pooledCell.cellCount,
      rows: rows
    };
  }

  try {
    window.__alloCellAtlasPure = {
      SOURCE: SOURCE,
      GENES: GENES,
      CELL_TYPES: CELL_TYPES,
      CHALLENGES: CHALLENGES,
      TISSUES: TISSUES,
      DESIGN_DEFAULT: DESIGN_DEFAULT,
      DESIGN_FIELDS: DESIGN_FIELDS,
      DESIGN_CASES: DESIGN_CASES,
      evaluateDesign: evaluateDesign,
      CROSS_TISSUE_LENSES: CROSS_TISSUE_LENSES,
      ATLAS_PIPELINE: ATLAS_PIPELINE,
      tissueById: tissueById,
      lensById: lensById,
      notebookProgress: notebookProgress,
      realEvidence: realEvidence,
      mappedSnapshotCellCount: mappedSnapshotCellCount,
      benchmarkRealMetrics: benchmarkRealMetrics,
      markerAblation: markerAblation,
      auditMarkerAblation: auditMarkerAblation,
      evaluateGenePanel: evaluateGenePanel,
      searchGenePanels: searchGenePanels,
      perturbationStability: perturbationStability,
      auditPerturbationStability: auditPerturbationStability,
      replicateEvidence: replicateEvidence,
      leaveOneReplicateOutTransfer: leaveOneReplicateOutTransfer,
      wilsonInterval: wilsonInterval,
      replicateDetectionSummary: replicateDetectionSummary,
      classifyExpression: classifyExpression,
      markerStrength: markerStrength
    };
  } catch (_) {}

  if (typeof document !== 'undefined' && !document.getElementById('allo-cell-atlas-css')) {
    var style = document.createElement('style');
    style.id = 'allo-cell-atlas-css';
    style.textContent = [
      '.cal-shell{--cal-ink:#102a43;--cal-muted:#486581;--cal-line:#bcccdc;--cal-panel:#f7fbff;--cal-soft:#eaf4fb;--cal-blue:#075985;--cal-teal:#0f766e;box-sizing:border-box;width:min(100%,1240px);margin:0 auto;color:var(--cal-ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;}',
      '.cal-shell *{box-sizing:border-box}.cal-shell button,.cal-shell select,.cal-shell textarea{font:inherit}.cal-shell button:focus-visible,.cal-shell select:focus-visible,.cal-shell textarea:focus-visible,.cal-shell a:focus-visible,.cal-cluster:focus-visible{outline:3px solid #0369a1;outline-offset:3px}',
      '.cal-top{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--cal-line);border-radius:16px;background:#fff;box-shadow:0 12px 34px rgba(16,42,67,.09)}',
      '.cal-back{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--cal-line);border-radius:11px;background:#fff;color:var(--cal-ink);font-weight:900}.cal-brand{min-width:0;flex:1}.cal-kicker{margin:0 0 2px;color:var(--cal-teal);font-size:10px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.cal-title{margin:0;font-size:clamp(20px,3vw,30px);line-height:1.08}.cal-subtitle{margin:5px 0 0;color:var(--cal-muted);font-size:12px;line-height:1.45}.cal-source-chip{flex:0 0 auto;border:1px solid #99f6e4;border-radius:999px;background:#f0fdfa;color:#115e59;padding:7px 10px;font-size:10px;font-weight:900}',
      '.cal-mission{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.6fr);gap:14px;margin-top:14px;padding:18px;border:1px solid #a5d8ff;border-radius:18px;background:radial-gradient(circle at 92% 10%,rgba(14,116,144,.13),transparent 38%),linear-gradient(135deg,#f8fcff,#eef8f8)}.cal-mission h2{margin:0;font-size:20px}.cal-mission p{margin:7px 0 0;color:var(--cal-muted);font-size:12px;line-height:1.58}.cal-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.cal-metric{padding:10px;border:1px solid #cbd5e1;border-radius:11px;background:#fff}.cal-metric b{display:block;font-size:18px}.cal-metric span{display:block;margin-top:3px;color:var(--cal-muted);font-size:9px;font-weight:800}.cal-route{margin-top:12px;padding:13px 14px;border:1px solid #bae6fd;border-radius:14px;background:linear-gradient(135deg,#f0f9ff,#ecfeff)}.cal-route-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.cal-route-head strong{color:#0f3b4d;font-size:12px}.cal-route-head span{color:#0e7490;font-size:10px;font-weight:950}.cal-route-bar{height:7px;margin-top:8px;overflow:hidden;border-radius:999px;background:#dbeafe}.cal-route-bar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0e7490,#14b8a6);transition:width .2s ease}.cal-route-steps{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.cal-route-step{display:flex;align-items:center;gap:6px;flex:1 1 150px;min-width:0;padding:7px 8px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#47616d;font-size:9px;line-height:1.35}.cal-route-step[data-done=true]{border-color:#86efac;background:#f0fdf4;color:#166534}.cal-route-step-icon{display:grid;place-items:center;width:16px;height:16px;flex:0 0 auto;border-radius:50%;background:#e2e8f0;color:#64748b;font-size:9px;font-weight:950}.cal-route-step[data-done=true] .cal-route-step-icon{background:#bbf7d0;color:#166534}.cal-next-step{margin-top:10px;padding-top:9px;border-top:1px solid #bae6fd;color:#164e63;font-size:10px;line-height:1.45}.cal-next-step strong{display:block;margin-bottom:3px}.cal-next-step span{display:block}.cal-next-step button{margin-top:7px;border:1px solid #0e7490;border-radius:8px;background:#fff;color:#0e7490;padding:6px 9px;font-size:9px;font-weight:900;cursor:pointer}.cal-next-step button:hover{background:#ecfeff}.cal-import-card{border-left:5px solid #0e7490;background:linear-gradient(135deg,#f0fdfa,#f0f9ff)}.cal-import-input{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:9px}.cal-import-input input{max-width:100%;font-size:10px}.cal-import-status{margin-top:9px;padding:8px 10px;border-radius:9px;background:#ecfeff;color:#155e75;font-size:10px;line-height:1.45}.cal-import-status[data-error=true]{background:#fff7ed;color:#9a3412}.cal-import-status .cal-import-route{display:block;margin-top:5px;font-size:9px;font-weight:850}.cal-import-provenance{margin-top:7px;padding:8px 10px;border-radius:9px;font-size:10px;line-height:1.45}.cal-import-provenance[data-status=verified]{background:#f0fdf4;color:#166534}.cal-import-provenance[data-status=review]{background:#fffbeb;color:#92400e}.cal-import-provenance[data-status=missing]{background:#fff7ed;color:#9a3412}.cal-teacher-review{border-left:5px solid #7c3aed;background:linear-gradient(135deg,#faf5ff,#f5f3ff)}.cal-teacher-review-intro{margin:5px 0 9px;color:#6b21a8;font-size:9px;line-height:1.45}.cal-teacher-review-total{margin:8px 0;color:#5b21b6;font-size:12px;font-weight:950}.cal-teacher-review-table{width:100%;border-collapse:collapse;font-size:10px}.cal-teacher-review-table th,.cal-teacher-review-table td{border-bottom:1px solid #ddd6fe;padding:7px;text-align:left;vertical-align:top}.cal-teacher-review-table th{color:#5b21b6;font-size:9px;text-transform:uppercase}.cal-teacher-review-score{font-weight:950;color:#6d28d9;white-space:nowrap}.cal-teacher-review textarea{width:100%;min-height:62px;margin-top:8px;border:1px solid #c4b5fd;border-radius:9px;padding:8px;color:var(--cal-ink);resize:vertical;font-size:10px;line-height:1.4}.cal-teacher-review-next{margin:9px 0;padding:9px 10px;border-left:4px solid #7c3aed;border-radius:9px;background:#ede9fe;color:#5b21b6;font-size:10px;line-height:1.45}.cal-teacher-review-next strong{display:block;margin-bottom:3px;font-size:9px;text-transform:uppercase}.cal-teacher-review-next span{display:block;color:#6b21a8}.cal-portfolio-history{margin-top:12px;padding-top:10px;border-top:1px solid #ddd6fe}.cal-self-check{margin:10px 0;padding:10px;border:1px solid #c4b5fd;border-radius:10px;background:#fff}.cal-self-check h4{margin:0;color:#5b21b6;font-size:12px}.cal-self-check p{margin:4px 0 8px;color:#6b21a8;font-size:9px;line-height:1.45}.cal-self-check-options{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.cal-self-check-options button{border:1px solid #c4b5fd;border-radius:999px;background:#faf5ff;color:#6d28d9;padding:6px 8px;font-size:9px;font-weight:900;cursor:pointer}.cal-self-check-options button[aria-pressed=true]{border-color:#7c3aed;background:#ede9fe;color:#4c1d95}.cal-self-check label{display:block;margin-top:7px;color:#5b21b6;font-size:8px;font-weight:900;text-transform:uppercase}.cal-self-check textarea{width:100%;min-height:44px;margin-top:4px;border:1px solid #ddd6fe;border-radius:8px;padding:7px;color:var(--cal-ink);resize:vertical;font-size:10px;line-height:1.4}.cal-portfolio-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.cal-portfolio-head h4{margin:0;color:#5b21b6;font-size:12px}.cal-portfolio-head span{color:#6d28d9;font-size:9px;font-weight:900}.cal-portfolio-delta{margin:7px 0;padding:8px 10px;border-radius:9px;background:#f5f3ff;color:#5b21b6;font-size:10px;line-height:1.45}.cal-portfolio-list{margin:7px 0 0;padding-left:18px;color:#6b21a8;font-size:10px;line-height:1.55}.cal-portfolio-list li[data-direction=up]{color:#166534}.cal-portfolio-list li[data-direction=down]{color:#9a3412}.cal-evidence-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.cal-evidence-map-item{padding:8px;border:1px solid #ddd6fe;border-radius:9px;background:#fff;color:#5b21b6;font-size:9px;line-height:1.45}.cal-evidence-map-item strong{display:block;margin-bottom:3px;font-size:8px;text-transform:uppercase}.cal-evidence-map-item span{display:block;color:#6b21a8}.cal-portfolio-boundary{margin-top:8px;color:#6b21a8;font-size:9px;line-height:1.45}',
      '.cal-tissues{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0 8px}.cal-tissue{display:flex;align-items:center;gap:9px;min-height:52px;border:1px solid var(--cal-line);border-radius:13px;background:#fff;color:var(--cal-ink);padding:9px 11px;text-align:left}.cal-tissue b{display:block;font-size:12px}.cal-tissue span{color:var(--cal-muted);font-size:9px}.cal-tissue[aria-pressed=true]{border-color:#0f766e;background:#f0fdfa;box-shadow:inset 0 0 0 1px #0f766e}.cal-tissue-icon{font-size:20px;color:#0f766e}',
      '.cal-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 14px}.cal-tab{min-height:38px;border:1px solid var(--cal-line);border-radius:10px;background:#fff;color:var(--cal-ink);padding:8px 12px;font-size:11px;font-weight:900}.cal-tab[aria-pressed=true]{border-color:#075985;background:#075985;color:#fff}',
      '.cal-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(290px,.75fr);gap:14px}.cal-card{border:1px solid var(--cal-line);border-radius:16px;background:#fff;padding:14px;box-shadow:0 9px 26px rgba(16,42,67,.06)}.cal-card h3,.cal-card h4{margin:0}.cal-card-intro{margin:5px 0 12px;color:var(--cal-muted);font-size:11px;line-height:1.5}',
      '.cal-gene-row,.cal-cell-row,.cal-actions{display:flex;flex-wrap:wrap;gap:6px}.cal-pill{border:1px solid var(--cal-line);border-radius:999px;background:#fff;color:var(--cal-ink);padding:6px 9px;font-size:10px;font-weight:850}.cal-pill[aria-pressed=true]{border-color:#0f766e;background:#0f766e;color:#fff}',
      '.cal-map-stack{display:grid;gap:12px}.cal-evidence-switch{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:10px 0;padding:10px;border:1px solid #bae6fd;border-radius:12px;background:#f0f9ff}.cal-evidence-switch strong{font-size:10px}.cal-mode-buttons{display:flex;flex-wrap:wrap;gap:6px}.cal-real-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0}.cal-real-meta div{padding:8px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc}.cal-real-meta b{display:block;font-size:11px}.cal-real-meta span{display:block;margin-top:3px;color:var(--cal-muted);font-size:8px}.cal-real-insight{border-left:5px solid #0284c7;background:#f0f9ff}.cal-unavailable{margin:10px 0;padding:12px;border:1px dashed #f59e0b;border-radius:11px;background:#fffbeb;color:#78350f;font-size:10px;line-height:1.5}.cal-provenance-code{display:block;overflow-wrap:anywhere;margin-top:7px;padding:7px;border-radius:8px;background:#0f172a;color:#e2e8f0;font-family:ui-monospace,monospace;font-size:8px}.cal-provenance-wrap{display:grid;gap:6px;margin-top:7px}.cal-provenance-link{color:#075985;font-size:10px;font-weight:900;overflow-wrap:anywhere}',
      '.cal-benchmark{border-left:5px solid #7c3aed}.cal-benchmark-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:11px 0}.cal-benchmark-card{border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;padding:11px}.cal-benchmark-card[data-current=true]{border-color:#7c3aed;background:#f5f3ff}.cal-benchmark-card strong{display:block;margin:5px 0;font-size:20px}.cal-benchmark-card p{min-height:40px;margin:0 0 9px;color:var(--cal-muted);font-size:9px;line-height:1.45}.cal-benchmark-detail{margin-top:12px;padding:12px;border:1px solid #ddd6fe;border-radius:12px;background:#faf5ff}.cal-benchmark-detail h4{margin-bottom:8px}.cal-rank-list{margin:8px 0 0;padding-left:22px;color:#4c1d95;font-size:10px;line-height:1.65}.cal-model-boundary{margin-top:11px;padding:10px;border-left:4px solid #b45309;background:#fffbeb;color:#78350f;font-size:10px;line-height:1.5}.cal-benchmark .cal-table tr[data-selected=true]{background:#ede9fe}.cal-benchmark .cal-table td:last-child{white-space:nowrap}',
      '.cal-ablation{border-left:5px solid #0891b2}.cal-ablation-controls{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:10px;margin:11px 0}.cal-ablation-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:11px}.cal-ablation-result{padding:12px;border:1px solid #a5f3fc;border-radius:12px;background:#ecfeff}.cal-ablation-result strong{display:block;margin-top:5px;font-size:18px}.cal-ablation-result p{margin:5px 0 0;color:var(--cal-muted);font-size:9px;line-height:1.45}.cal-ablation-status{margin-top:10px;padding:10px;border-radius:10px;font-size:10px;font-weight:850;line-height:1.45}.cal-ablation-status[data-changed=true]{background:#fef3c7;color:#92400e}.cal-ablation-status[data-changed=false]{background:#dcfce7;color:#166534}.cal-ablation .cal-gene-row{margin-top:7px}.cal-ablation .cal-table td:last-child{font-weight:850}',
      '.cal-panel-builder{border-left:5px solid #059669}.cal-panel-builder>summary{cursor:pointer;font-size:14px;font-weight:950;color:#065f46}.cal-panel-builder>summary::marker{color:#059669}.cal-panel-inner{margin-top:13px}.cal-panel-score{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:11px 0;padding:12px;border:1px solid #a7f3d0;border-radius:12px;background:#ecfdf5}.cal-panel-score strong{font-size:22px;color:#065f46}.cal-panel-score span{color:#047857;font-size:10px;font-weight:850}.cal-frontier{margin-top:12px}.cal-panel-builder .cal-table tr[data-aligned=false]{background:#fff7ed}.cal-panel-builder .cal-table td:last-child{font-weight:850}',
      '.cal-stability{border-left:5px solid #dc2626}.cal-stability>summary{cursor:pointer;font-size:14px;font-weight:950;color:#991b1b}.cal-stability>summary::marker{color:#dc2626}.cal-stability-grid{display:grid;grid-template-columns:minmax(220px,.65fr) minmax(0,1.35fr);gap:10px;margin:11px 0}.cal-stability-score{padding:12px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2}.cal-stability-score strong{display:block;margin:4px 0;font-size:24px;color:#991b1b}.cal-stability-score span{color:#7f1d1d;font-size:9px;line-height:1.45}.cal-stability .cal-table tr[data-stable=false]{background:#fff7ed}.cal-outcomes{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.cal-outcome{padding:6px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:9px;font-weight:850}',
      '.cal-replicate{border-left:5px solid #2563eb}.cal-replicate-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:11px 0}.cal-replicate-tab{border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1e3a8a;padding:9px;text-align:left}.cal-replicate-tab[aria-pressed=true]{border-color:#2563eb;background:#dbeafe;box-shadow:inset 0 0 0 1px #2563eb}.cal-replicate-tab strong,.cal-replicate-tab span{display:block}.cal-replicate-tab strong{font-size:11px}.cal-replicate-tab span{margin-top:3px;font-size:8px}.cal-replicate-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.cal-transfer-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:11px 0}.cal-transfer-card{padding:11px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff}.cal-transfer-card strong{display:block;margin:4px 0;font-size:21px;color:#1e40af}.cal-transfer-card span{color:#1e3a8a;font-size:9px;line-height:1.4}.cal-low-n{display:inline-block;border-radius:999px;background:#fef3c7;color:#92400e;padding:3px 6px;font-size:8px;font-weight:950}.cal-replicate .cal-table tr[data-low=true]{background:#fffbeb}',
      '.cal-pseudo{margin-top:12px;border:1px solid #f0abfc;border-radius:12px;background:#fdf4ff;padding:11px}.cal-pseudo>summary{cursor:pointer;color:#86198f;font-size:11px;font-weight:950}.cal-pseudo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:11px 0}.cal-pseudo-card{padding:10px;border:1px solid #f5d0fe;border-radius:11px;background:#fff}.cal-pseudo-card strong{display:block;margin:4px 0;font-size:19px;color:#86198f}.cal-pseudo-card span{color:#701a75;font-size:8px;line-height:1.4}.cal-formula{display:block;margin-top:8px;padding:8px;border-radius:8px;background:#3b0764;color:#fae8ff;font-family:ui-monospace,monospace;font-size:9px;overflow-wrap:anywhere}',
      '.cal-map-wrap{margin-top:11px;overflow:hidden;border:1px solid #1e3a5f;border-radius:14px;background:#071b2f}.cal-map{display:block;width:100%;height:auto}.cal-cluster{cursor:pointer}.cal-cluster text{font-size:11px;font-weight:900;paint-order:stroke;stroke:#071b2f;stroke-width:4px;stroke-linejoin:round}.cal-axis{font-size:9px;fill:#9fb3c8;letter-spacing:.08em;text-transform:uppercase}.cal-map-note{margin:8px 2px 0;color:var(--cal-muted);font-size:10px;line-height:1.45}',
      '.cal-profile-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.cal-marker{border-radius:999px;padding:4px 8px;color:#fff;font-size:9px;font-weight:900}.cal-job{margin:8px 0 12px;color:var(--cal-muted);font-size:12px;line-height:1.55}.cal-bar-row{display:grid;grid-template-columns:54px 1fr 32px;align-items:center;gap:7px;margin:6px 0;font-size:10px}.cal-bar-track{height:10px;overflow:hidden;border-radius:999px;background:#e2e8f0}.cal-bar-fill{height:100%;border-radius:999px}.cal-bar-row b{text-align:right}.cal-callout{margin-top:12px;padding:10px;border:1px solid #99f6e4;border-radius:11px;background:#f0fdfa;color:#134e4a;font-size:10px;line-height:1.48}.cal-primary,.cal-secondary{min-height:38px;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:900}.cal-primary{border:1px solid #0f766e;background:#0f766e;color:#fff}.cal-secondary{border:1px solid var(--cal-line);background:#fff;color:var(--cal-ink)}.cal-primary:disabled{cursor:not-allowed;opacity:.5}',
      '.cal-compare-controls{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:10px}.cal-field label{display:block;margin-bottom:5px;color:var(--cal-muted);font-size:10px;font-weight:900;text-transform:uppercase}.cal-field select,.cal-field textarea{width:100%;border:1px solid var(--cal-line);border-radius:10px;background:#fff;color:var(--cal-ink);padding:9px}.cal-compare-vs{padding-bottom:10px;font-weight:950;color:var(--cal-teal)}',
      '.cal-table-wrap{margin-top:12px;overflow-x:auto}.cal-table{width:100%;border-collapse:collapse;font-size:11px}.cal-table th,.cal-table td{border-bottom:1px solid #d9e2ec;padding:8px;text-align:left}.cal-table th{background:#f0f4f8;color:#334e68;font-size:10px;text-transform:uppercase}.cal-score{display:inline-flex;align-items:center;gap:6px;min-width:90px}.cal-score i{display:block;width:60px;height:8px;overflow:hidden;border-radius:999px;background:#d9e2ec}.cal-score i span{display:block;height:100%;background:#0f766e}',
      '.cal-mystery{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(270px,.9fr);gap:14px}.cal-question{padding:14px;border:1px solid #c4b5fd;border-radius:14px;background:#f5f3ff}.cal-question h3{color:#5b21b6}.cal-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px}.cal-choice{border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#243b53;padding:9px;text-align:left;font-size:11px;font-weight:850}.cal-choice[aria-pressed=true]{border-color:#7c3aed;background:#ede9fe}.cal-feedback{margin-top:10px;padding:10px;border-radius:10px;font-size:11px;font-weight:800}.cal-feedback[data-correct=true]{background:#dcfce7;color:#14532d}.cal-feedback[data-correct=false]{background:#fff7ed;color:#9a3412}',
      '.cal-design{display:grid;gap:12px}.cal-design-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cal-design-control{padding:11px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc}.cal-design-control label{display:block;margin-bottom:6px;color:#334e68;font-size:10px;font-weight:900;text-transform:uppercase}.cal-design-control select{width:100%;border:1px solid #bcccdc;border-radius:9px;background:#fff;padding:8px;color:var(--cal-ink)}.cal-design-control p{margin:7px 0 0;color:var(--cal-muted);font-size:9px;line-height:1.4}.cal-rubric{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.cal-rubric-card{border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:11px}.cal-rubric-card b{display:block;font-size:11px}.cal-rubric-card p{margin:7px 0 0;color:var(--cal-muted);font-size:9px;line-height:1.4}.cal-level{display:inline-block;margin-top:8px;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:950;text-transform:uppercase}.cal-level[data-level=strong]{background:#dcfce7;color:#166534}.cal-level[data-level=developing]{background:#fef3c7;color:#92400e}.cal-level[data-level=limited]{background:#fee2e2;color:#991b1b}.cal-complexity{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:11px;padding:10px;border-radius:11px;background:#eff6ff;color:#1e3a8a;font-size:10px}.cal-case-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);gap:12px}.cal-case-signal{padding:12px;border:1px solid #fbbf24;border-radius:12px;background:#fffbeb;color:#78350f;font-size:11px;line-height:1.5}',
      '.cal-cross{display:grid;gap:12px}.cal-lens-tabs{display:flex;flex-wrap:wrap;gap:7px}.cal-cross-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cal-cross-card{border:1px solid #cbd5e1;border-radius:14px;background:#fff;padding:13px}.cal-cross-card h4{margin:5px 0}.cal-cross-card .cal-marker{display:inline-block}.cal-cross-link{margin:8px 0 0;color:var(--cal-muted);font-size:10px;line-height:1.48}.cal-conserved{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cal-cer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cal-cer .cal-field{padding:10px;border:1px solid #d9e2ec;border-radius:12px;background:#f8fafc}.cal-checks{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.cal-check{border-radius:999px;background:#e2e8f0;color:#475569;padding:5px 8px;font-size:9px;font-weight:900}.cal-check[data-done=true]{background:#dcfce7;color:#166534}.cal-caution{border-left:5px solid #7c3aed;background:#f5f3ff}.cal-methods{grid-column:1/-1}.cal-pipeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:11px}.cal-stage{border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;padding:11px}.cal-stage b{display:block;font-size:11px}.cal-stage p{margin:6px 0;color:var(--cal-muted);font-size:10px;line-height:1.45}.cal-stage small{display:block;border-left:3px solid #b45309;padding-left:7px;color:#7c2d12;font-size:9px;line-height:1.4}',
      '.cal-source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cal-source-list{margin:9px 0 0;padding-left:18px;color:var(--cal-muted);font-size:11px;line-height:1.6}.cal-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}.cal-links a{color:#075985;font-size:11px;font-weight:900}.cal-boundary{border-left:5px solid #b45309;background:#fffbeb}.cal-af-return{border-left:5px solid #0e7490;background:linear-gradient(135deg,#f0fdfa,#f0f9ff)}.cal-af-return-meta{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.cal-af-return-meta span{padding:5px 8px;border-radius:999px;background:#cffafe;color:#155e75;font-size:9px;font-weight:900}.cal-af-record-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.cal-af-record-item{padding:11px;border:1px solid #bae6fd;border-radius:12px;background:#fff}.cal-af-record-item span{display:block;color:#0e7490;font-size:8px;font-weight:950;text-transform:uppercase}.cal-af-record-item p{margin:6px 0 0;color:#334e68;font-size:10px;line-height:1.5}.cal-af-atlas-evidence{padding:10px;border-left:4px solid #0e7490;background:#ecfeff;color:#164e63;font-size:10px;line-height:1.5}.cal-af-review{margin-top:13px;padding:12px;border:1px solid #c4b5fd;border-radius:13px;background:#faf5ff}.cal-af-review h4{margin:0;color:#5b21b6;font-size:13px}.cal-af-review-intro{margin:5px 0 9px;color:#6b21a8;font-size:9px;line-height:1.45}.cal-af-review-table{width:100%;border-collapse:collapse;font-size:10px}.cal-af-review-table th,.cal-af-review-table td{border-bottom:1px solid #ddd6fe;padding:7px;text-align:left;vertical-align:top}.cal-af-review-table th{color:#5b21b6;font-size:9px;text-transform:uppercase}.cal-af-review-score{font-weight:950;color:#6d28d9;white-space:nowrap}.cal-af-review-total{margin-top:9px;color:#5b21b6;font-size:10px;font-weight:900}.cal-af-review textarea{width:100%;min-height:62px;margin-top:8px;border:1px solid #c4b5fd;border-radius:9px;padding:8px;color:var(--cal-ink);resize:vertical;font-size:10px;line-height:1.4}.cal-af-review .cal-actions{margin-top:8px}.cal-footer{margin-top:14px;padding:11px 13px;border:1px solid var(--cal-line);border-radius:12px;background:#f8fafc;color:var(--cal-muted);font-size:10px;line-height:1.5}',
      '@media(max-width:850px){.cal-mission,.cal-layout,.cal-mystery,.cal-cross-grid,.cal-cer,.cal-pipeline,.cal-design-controls,.cal-rubric,.cal-case-grid,.cal-real-meta,.cal-benchmark-grid,.cal-ablation-controls,.cal-ablation-results,.cal-stability-grid,.cal-replicate-tabs,.cal-replicate-controls,.cal-transfer-summary,.cal-pseudo-grid,.cal-af-record-grid,.cal-af-review-table{grid-template-columns:1fr}.cal-source-chip{display:none}.cal-source-grid{grid-template-columns:1fr}}',
      '@media(max-width:560px){.cal-top{align-items:flex-start}.cal-tissues{grid-template-columns:1fr}.cal-progress{grid-template-columns:1fr}.cal-compare-controls{grid-template-columns:1fr}.cal-compare-vs{padding:0}.cal-choice-grid{grid-template-columns:1fr}}',
      '@media(prefers-reduced-motion:reduce){.cal-shell *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}'
    ].join('');
    if (document.head) document.head.appendChild(style);
  }

  window.StemLab.registerTool('cellAtlasLab', {
    icon: '\u2237',
    label: 'Cell Atlas Lab',
    desc: 'Move between a version-pinned real pancreas snapshot and teaching models for pancreas, lung, and brain; reason about markers, methods, bias, and protein structure.',
    color: 'cyan',
    category: 'biology',
    ready: true,
    questHooks: [
      {
        id: 'atlas_explore_3',
        label: 'Explore 3 cell types',
        icon: '\u2237',
        check: function (d) { return Object.keys((d && d.exploredTypes) || {}).length >= 3; },
        progress: function (d) { return Object.keys((d && d.exploredTypes) || {}).length + '/3 cell types'; }
      },
      {
        id: 'atlas_tissues_3',
        label: 'Visit all 3 tissue atlases',
        icon: '\u25ce',
        check: function (d) { var seen = Object.assign({}, (d && d.tissuesVisited) || {}); seen[(d && d.tissue) || 'pancreas'] = true; return Object.keys(seen).length >= 3; },
        progress: function (d) { var seen = Object.assign({}, (d && d.tissuesVisited) || {}); seen[(d && d.tissue) || 'pancreas'] = true; return Object.keys(seen).length + '/3 tissues'; }
      },
      {
        id: 'atlas_compare',
        label: 'Compare two cell types using marker evidence',
        icon: '\u2194',
        check: function (d) { return !!(d && d.comparisonViewed); }
      },
      {
        id: 'atlas_mystery_2',
        label: 'Correctly classify 2 mystery cells',
        icon: '?',
        check: function (d) { return Object.keys((d && d.completedChallenges) || {}).filter(function (key) { return d.completedChallenges[key]; }).length >= 2; },
        progress: function (d) { return Object.keys((d && d.completedChallenges) || {}).filter(function (key) { return d.completedChallenges[key]; }).length + '/2 mysteries'; }
      },
      {
        id: 'atlas_real_bridge',
        label: 'Interpret the real Muraro snapshot',
        icon: '\u25c8',
        check: function (d) { return !!(d && d.realDataViewed) && Object.keys((d && d.realMetricsSeen) || {}).length >= 2 && !!(d && d.realInterpretation === 'cautious'); },
        progress: function (d) { return Object.keys((d && d.realMetricsSeen) || {}).length + '/2 real-data metrics'; }
      },
      {
        id: 'atlas_metric_stress',
        label: 'Explain why a metric changes the ranking',
        icon: '\u2248',
        check: function (d) { return Object.keys((d && d.benchmarkMetricsSeen) || {}).length >= 2 && !!(d && d.metricStressAnswer === 'representation'); },
        progress: function (d) { return Object.keys((d && d.benchmarkMetricsSeen) || {}).length + '/2 ranking views'; }
      },
      {
        id: 'atlas_ablation',
        label: 'Stress-test a marker panel',
        icon: '\u2298',
        check: function (d) { return Object.keys((d && d.ablationTrials) || {}).length >= 2 && !!(d && d.ablationInterpretation === 'panel'); },
        progress: function (d) { return Object.keys((d && d.ablationTrials) || {}).length + '/2 feature removals'; }
      },
      {
        id: 'atlas_replicates',
        label: 'Audit donor-replicate transfer',
        icon: '\u25c9',
        check: function (d) { return Object.keys((d && d.replicatesVisited) || {}).length >= 2 && Object.keys((d && d.replicateMetricsSeen) || {}).length >= 2 && !!(d && d.replicateInterpretation === 'cautious'); },
        progress: function (d) { return Object.keys((d && d.replicatesVisited) || {}).length + '/2 replicates'; }
      },
      {
        id: 'atlas_reproducibility',
        label: 'Separate internal transfer from independent replication',
        icon: '\u21c4',
        check: function (d) { return !!(d && d.reproducibilityInterpretation === 'external-study'); }
      },
      {
        id: 'atlas_design_3',
        label: 'Design a study and solve 3 QC cases',
        icon: '\u2699',
        check: function (d) { return !!(d && d.designChanged) && Object.keys((d && d.completedDesignCases) || {}).filter(function (key) { return d.completedDesignCases[key]; }).length >= 3; },
        progress: function (d) { return Object.keys((d && d.completedDesignCases) || {}).filter(function (key) { return d.completedDesignCases[key]; }).length + '/3 QC cases'; }
      },
      {
        id: 'atlas_reasoning',
        label: 'Complete a cross-tissue CER argument',
        icon: '\u2234',
        check: function (d) {
          var notes = (d && d.crossNotebook) || {};
          return Object.keys(notes).some(function (key) { return notebookProgress(notes[key], key).complete; }) && !!(d && d.cautionAnswer === 'cautious');
        }
      },
      {
        id: 'atlas_scale_journey',
        label: 'Connect a cell atlas to another scale',
        icon: '\u2197',
        check: function (d) { return Object.keys((d && d.journeyHandoffs) || {}).length >= 1; }
      },
      {
        id: 'atlas_scale_record',
        label: 'Build a cross-scale evidence record',
        icon: '\u2234',
        check: function (d) { return !!(d && d.alphaFoldEvidenceRecord && d.alphaFoldEvidenceRecord.complete); }
      },
      {
        id: 'atlas_export',
        label: 'Export an auditable evidence packet',
        icon: '\u21e9',
        check: function (d) { return Object.keys((d && d.exportedArtifacts) || {}).length >= 1; },
        progress: function (d) { return Object.keys((d && d.exportedArtifacts) || {}).length + '/1 packet'; }
      }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var data = ctx.toolData || {};
      var d = data.cellAtlasLab || {};
      var alphaFoldEvidenceRecord = d.alphaFoldEvidenceRecord && typeof d.alphaFoldEvidenceRecord === 'object' && d.alphaFoldEvidenceRecord.kind === 'cell-atlas-alphafold-evidence' ? d.alphaFoldEvidenceRecord : null;
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var announce = ctx.announceToSR || function () {};
      function downloadTextFile(filename, content, mimeType) {
        try {
          if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false;
          var blob = new Blob([content], { type: mimeType || 'text/markdown;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.rel = 'noopener';
          link.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 0);
          return true;
        } catch (error) {
          return false;
        }
      }
      var EXPORT_SCHEMA_VERSION = 'cell-atlas-artifact/v1';
      var EXPORT_BOUNDARY = 'This artifact is an instructional evidence record. It preserves source context and learner reasoning, but it is not a raw donor dataset, clinical interpretation, or proof of biological mechanism.';
      function buildExportArtifact(artifactType, title, markdown, extra) {
        var base = {
          schemaVersion: EXPORT_SCHEMA_VERSION,
          artifactType: artifactType,
          title: title,
          generatedAt: new Date().toISOString(),
          context: { tissueId: tissue.id, tissueLabel: tissue.label, view: view },
          provenance: SOURCE ? { project: SOURCE.project, hcaId: SOURCE.hcaId, hcaUrl: SOURCE.hcaUrl, license: SOURCE.license } : null,
          boundary: EXPORT_BOUNDARY,
          learningPath: {
            routeId: 'cell-atlas-evidence-route/v1',
            completedCount: routeDoneCount,
            total: routeSteps.length,
            steps: routeSteps.map(function (step) { return { id: step.id, label: step.label, complete: step.done }; }),
            nextStep: nextRouteStep ? { id: nextRouteStep.id, label: nextRouteStep.label, action: nextRouteStep.action } : null
          },
          markdown: markdown
        };
        return Object.assign(base, extra || {});
      }
      function exportMarkdown(artifact) {
        var context = artifact.context || {};
        var provenance = artifact.provenance || {};
        var sourceLine = Array.isArray(provenance.sources) ? provenance.sources.map(function (source) { return source.project + ' (' + (source.hcaId || source.hcaUrl || 'source context') + ')'; }).join('; ') : (provenance.project ? provenance.project + ' (' + (provenance.hcaId || provenance.hcaUrl || 'source context') + ')' : 'not recorded');
        var learningPath = artifact.learningPath || {};
        var learningRouteLine = learningPath.total ? String(learningPath.completedCount || 0) + '/' + String(learningPath.total) + ' milestones complete' : 'not recorded';
        var nextRouteLine = learningPath.nextStep && learningPath.nextStep.label ? learningPath.nextStep.label : 'none recorded';
        return ['# ' + artifact.title, '', 'Learning route: ' + learningRouteLine, 'Next recommended step: ' + nextRouteLine, '', 'Artifact schema: ' + artifact.schemaVersion, 'Artifact type: ' + artifact.artifactType, 'Generated: ' + artifact.generatedAt, 'Context: ' + (context.tissueLabel || context.tissueId || 'not recorded'), 'Source context: ' + sourceLine, 'Boundary: ' + artifact.boundary, '', '## Packet content', '', artifact.markdown].join('\n');
      }
      function downloadArtifact(filenameBase, artifact, format) {
        var isJson = format === 'json';
        var body = isJson ? JSON.stringify(artifact, null, 2) : exportMarkdown(artifact);
        return downloadTextFile(filenameBase + (isJson ? '.json' : '.md'), body, isJson ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8');
      }
      function recordArtifactExport(kind, format) {
        var exports = Object.assign({}, d.exportedArtifacts || {});
        exports[kind] = { format: format, exportedAt: new Date().toISOString() };
        return exports;
      }
      var view = d.view || 'map';
      var tissue = tissueById(d.tissue || 'pancreas');
      var SOURCE = tissue.source;
      var GENES = tissue.genes;
      var CELL_TYPES = tissue.cells;
      var CHALLENGES = tissue.challenges;
      var localCellById = function (id) { return cellById(id, tissue.id); };
      var localGeneById = function (id) { return geneById(id, tissue.id); };
      var localMarkerStrength = function (cellId, geneId) { return markerStrength(cellId, geneId, tissue.id); };
      var localClassifyExpression = function (profile) { return classifyExpression(profile, tissue.id); };
      var selectedCell = localCellById(d.selectedCell || tissue.defaultCell);
      var selectedGene = localGeneById(d.selectedGene || selectedCell.marker);
      var compareA = localCellById(d.compareA || tissue.defaultCell);
      var compareB = localCellById(d.compareB || tissue.defaultCompare);
      var challengeIndex = Math.max(0, Math.min(CHALLENGES.length - 1, Number(d.challengeIndex) || 0));
      var challenge = CHALLENGES[challengeIndex];
      var exploredCount = Object.keys(d.exploredTypes || {}).filter(function (key) { return key.indexOf(tissue.id + ':') === 0; }).length;
      var correctCount = Object.keys(d.completedChallenges || {}).filter(function (key) { return key.indexOf(tissue.id + ':') === 0 && d.completedChallenges[key]; }).length;
      var visitedForProgress = Object.assign({}, d.tissuesVisited || {});
      visitedForProgress[tissue.id] = true;
      var visitedCount = Object.keys(visitedForProgress).length;
      var exportedArtifactCount = Object.keys(d.exportedArtifacts || {}).length;
      var packetImportStatus = String(d.packetImportStatus || '');
      var packetImportLabel = String(d.packetImportLabel || '').slice(0, 120);
      var packetImportProvenance = String(d.packetImportProvenance || '');
      var packetImportSourceSummary = String(d.packetImportSourceSummary || '').slice(0, 180);
      var packetImportRouteSummary = String(d.packetImportRouteSummary || '').slice(0, 120);
      var reasoningComplete = Object.keys(d.crossNotebook || {}).some(function (key) { return notebookProgress(d.crossNotebook[key], key).complete; }) && d.cautionAnswer === 'cautious';
      var routeSteps = [
        { id: 'observe', label: 'Explore 3 cell types', done: exploredCount >= 3, view: 'map', action: 'Open the map', detail: 'Use marker evidence to build a first identity claim.' },
        { id: 'compare', label: 'Compare marker evidence', done: !!d.comparisonViewed, view: 'compare', action: 'Open comparison', detail: 'Put two cell types side by side and explain the strongest contrast.' },
        { id: 'test', label: 'Solve 2 mystery cells', done: correctCount >= 2, view: 'mystery', action: 'Try a mystery', detail: 'Test whether a marker panel supports the proposed identity.' },
        { id: 'reason', label: 'Write a cautious CER', done: reasoningComplete, view: 'cross', action: 'Open the CER', detail: 'Connect a claim, two markers, and a limitation across tissues.' },
        { id: 'export', label: 'Save an evidence packet', done: exportedArtifactCount >= 1, view: 'design', action: 'Open study design', detail: 'Package the reasoning with provenance and an explicit boundary.' }
      ];
      var routeDoneCount = routeSteps.filter(function (step) { return step.done; }).length;
      var routePercent = Math.round((routeDoneCount / routeSteps.length) * 100);
      var nextRouteStep = routeSteps.filter(function (step) { return !step.done; })[0] || null;
      var systemLens = lensById(d.systemLens || 'vascular');
      var notebook = (d.crossNotebook && d.crossNotebook[systemLens.id]) || {};
      var notebookState = notebookProgress(notebook, systemLens.id);
      var PORTFOLIO_SCHEMA_VERSION = 'cell-atlas-portfolio/v1';
      var portfolioState = d.cellAtlasPortfolio && typeof d.cellAtlasPortfolio === 'object' ? d.cellAtlasPortfolio : {};
      var portfolioAttempts = Array.isArray(portfolioState.attempts) ? portfolioState.attempts.filter(function (attempt) { return attempt && typeof attempt === 'object' && attempt.schemaVersion === PORTFOLIO_SCHEMA_VERSION; }).slice(-8) : [];
      var portfolioLatest = portfolioAttempts.length ? portfolioAttempts[portfolioAttempts.length - 1] : null;
      var portfolioPrevious = portfolioAttempts.length > 1 ? portfolioAttempts[portfolioAttempts.length - 2] : null;
      var learnerSelfCheck = d.cellAtlasLearnerSelfCheck && typeof d.cellAtlasLearnerSelfCheck === 'object' ? d.cellAtlasLearnerSelfCheck : {};
      var studyDesign = Object.assign({}, DESIGN_DEFAULT, d.studyDesign || {});
      var designEvaluation = evaluateDesign(studyDesign);
      var designCaseIndex = Math.max(0, Math.min(DESIGN_CASES.length - 1, Number(d.designCaseIndex) || 0));
      var designCase = DESIGN_CASES[designCaseIndex];
      var completedDesignCount = Object.keys(d.completedDesignCases || {}).filter(function (key) { return d.completedDesignCases[key]; }).length;
      var realSnapshot = (typeof window !== 'undefined' && window.__alloCellAtlasRealSnapshots && window.__alloCellAtlasRealSnapshots.muraroPancreas) || null;
      var realAvailable = tissue.id === 'pancreas' && !!realSnapshot;
      var evidenceMode = d.evidenceMode === 'real' && realAvailable ? 'real' : 'teaching';
      var realMetric = d.realMetric === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
      var realCellSummary = realSnapshot && realSnapshot.cellTypes ? realSnapshot.cellTypes[selectedCell.id] : null;
      var mappedRealCells = mappedSnapshotCellCount(realSnapshot);
      var realBenchmarks = benchmarkRealMetrics(realSnapshot);
      var benchmarkMetricId = d.benchmarkMetric === 'relativeMeanPct' ? 'relativeMeanPct' : 'detectionPct';
      var benchmarkSummary = realBenchmarks.filter(function (item) { return item.id === benchmarkMetricId; })[0] || realBenchmarks[0] || null;
      var benchmarkCellId = d.benchmarkCell || 'beta';
      var benchmarkSelectedRow = benchmarkSummary && (benchmarkSummary.rows.filter(function (row) { return row.actualId === benchmarkCellId; })[0] || benchmarkSummary.rows[0]);
      var ablationMetricId = d.ablationMetric === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
      var ablationCellId = realSnapshot && realSnapshot.cellTypes && realSnapshot.cellTypes[d.ablationCell] && realSnapshot.cellTypes[d.ablationCell].available ? d.ablationCell : 'beta';
      var ablationGeneId = realSnapshot && Array.isArray(realSnapshot.genes) && realSnapshot.genes.indexOf(d.ablationGene) >= 0 ? d.ablationGene : '';
      var ablationResult = markerAblation(realSnapshot, ablationCellId, ablationMetricId, ablationGeneId);
      var ablationAudit = auditMarkerAblation(realSnapshot, ablationMetricId);
      var panelMetricId = d.panelMetric === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
      var storedPanelGenes = d.panelGenes && Object.keys(d.panelGenes).length ? d.panelGenes : null;
      var selectedPanelGenes = realSnapshot && Array.isArray(realSnapshot.genes) ? realSnapshot.genes.filter(function (geneId) { return !storedPanelGenes || !!storedPanelGenes[geneId]; }) : [];
      var panelResult = evaluateGenePanel(realSnapshot, panelMetricId, selectedPanelGenes);
      var panelFrontier = searchGenePanels(realSnapshot, panelMetricId);
      var stabilityMetricId = d.stabilityMetric === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
      var stabilityAmount = [0.1, 0.25, 0.5].indexOf(Number(d.stabilityAmount)) >= 0 ? Number(d.stabilityAmount) : 0.25;
      var stabilityAudit = auditPerturbationStability(realSnapshot, stabilityMetricId, stabilityAmount);
      var stabilityCellId = stabilityAudit.some(function (row) { return row.cellId === d.stabilityCell; }) ? d.stabilityCell : 'ductal';
      var stabilitySelected = stabilityAudit.filter(function (row) { return row.cellId === stabilityCellId; })[0] || stabilityAudit[0] || null;
      var replicateOptions = realSnapshot && Array.isArray(realSnapshot.replicates) ? realSnapshot.replicates : [];
      var replicateMetricId = d.replicateMetric === 'detectionPct' ? 'detectionPct' : 'relativeMeanPct';
      var relativeReplicateTransfer = leaveOneReplicateOutTransfer(realSnapshot, 'relativeMeanPct');
      var detectionReplicateTransfer = leaveOneReplicateOutTransfer(realSnapshot, 'detectionPct');
      var activeReplicateTransfer = replicateMetricId === 'detectionPct' ? detectionReplicateTransfer : relativeReplicateTransfer;
      var selectedReplicate = replicateOptions.filter(function (item) { return item.id === d.replicateId; })[0] || replicateOptions[0] || null;
      var replicateCellId = selectedReplicate && selectedReplicate.cellTypes[d.replicateCell] && selectedReplicate.cellTypes[d.replicateCell].available ? d.replicateCell : 'endothelial';
      var replicateGeneId = realSnapshot && realSnapshot.genes.indexOf(d.replicateGene) >= 0 ? d.replicateGene : localCellById(replicateCellId).marker;
      var selectedTransferAudit = selectedReplicate && activeReplicateTransfer.filter(function (item) { return item.replicateId === selectedReplicate.id; })[0];
      var pseudorepCellId = realSnapshot && realSnapshot.cellTypes[d.pseudorepCell] && realSnapshot.cellTypes[d.pseudorepCell].available ? d.pseudorepCell : 'stellate';
      var pseudorepGeneId = realSnapshot && realSnapshot.genes.indexOf(d.pseudorepGene) >= 0 ? d.pseudorepGene : 'KRT19';
      var pseudorepSummary = replicateDetectionSummary(realSnapshot, pseudorepCellId, pseudorepGeneId);

      function patch(nextPatch) {
        setToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          next.cellAtlasLab = Object.assign({}, next.cellAtlasLab || {}, nextPatch || {});
          return next;
        });
      }

      function portfolioSafeText(value, fallback) {
        var safe = String(value == null ? '' : value).replace(/\s+/g, ' ').replace(/\b[ACGTN]{16,}\b/gi, '[sequence omitted]').trim().slice(0, 700);
        return safe || fallback;
      }
      function portfolioSafeId(value, fallback) {
        var safe = portfolioSafeText(value, fallback).replace(/[^a-z0-9_-]/gi, '-').slice(0, 80);
        return safe || fallback;
      }
      function sanitizePortfolioAttempt(raw) {
        if (!raw || typeof raw !== 'object' || raw.schemaVersion !== PORTFOLIO_SCHEMA_VERSION) return null;
        var rubric = Array.isArray(raw.rubric) ? raw.rubric.slice(0, 4).map(function (item) {
          if (!item || typeof item !== 'object' || !item.label) return null;
          var score = Math.max(1, Math.min(4, Math.round(Number(item.score) || 1)));
          return { label: portfolioSafeText(item.label, 'Criterion'), score: score, detail: portfolioSafeText(item.detail, 'Evidence signal not recorded.'), nextMove: portfolioSafeText(item.nextMove, 'Review this criterion with the learner.') };
        }).filter(Boolean) : [];
        if (rubric.length !== 4) return null;
        var map = raw.evidenceMap && typeof raw.evidenceMap === 'object' ? raw.evidenceMap : {};
        var markers = Array.isArray(map.markers) ? map.markers.slice(0, 8).map(function (marker) { return portfolioSafeText(marker, 'marker reference'); }).filter(Boolean) : [];
        var sources = raw.provenance && Array.isArray(raw.provenance.sources) ? raw.provenance.sources.slice(0, 8).map(function (source) {
          if (!source || typeof source !== 'object') return null;
          return { tissue: portfolioSafeText(source.tissue, 'tissue context'), project: portfolioSafeText(source.project, 'HCA source'), hcaId: portfolioSafeText(source.hcaId, ''), hcaUrl: portfolioSafeText(source.hcaUrl, ''), license: portfolioSafeText(source.license, '') };
        }).filter(Boolean) : [];
        var total = rubric.reduce(function (sum, item) { return sum + item.score; }, 0);
        return {
          schemaVersion: PORTFOLIO_SCHEMA_VERSION,
          id: portfolioSafeId(raw.id, 'imported-attempt'),
          createdAt: portfolioSafeText(raw.createdAt, new Date().toISOString()),
          tissue: { id: portfolioSafeId(raw.tissue && raw.tissue.id, tissue.id), label: portfolioSafeText(raw.tissue && raw.tissue.label, tissue.label), lens: portfolioSafeText(raw.tissue && raw.tissue.lens, systemLens.id) },
          rubric: rubric,
          total: total,
          route: { completedCount: Math.max(0, Math.min(5, Math.round(Number(raw.route && raw.route.completedCount) || 0))), total: 5 },
          nextMove: { label: portfolioSafeText(raw.nextMove && raw.nextMove.label, 'Review evidence'), action: portfolioSafeText(raw.nextMove && raw.nextMove.action, 'Review the learner work with a teacher.') },
          evidenceMap: { claim: portfolioSafeText(map.claim, 'not recorded'), evidence: portfolioSafeText(map.evidence, 'not recorded'), reasoning: portfolioSafeText(map.reasoning, 'not recorded'), limitation: portfolioSafeText(map.limitation, 'not recorded'), markers: markers },
          provenance: { sources: sources },
          reflection: { confidence: ['uncertain', 'developing', 'confident'].indexOf(String(raw.reflection && raw.reflection.confidence || '')) >= 0 ? String(raw.reflection.confidence) : '', strongestEvidence: portfolioSafeText(raw.reflection && raw.reflection.strongestEvidence, 'not recorded'), uncertainty: portfolioSafeText(raw.reflection && raw.reflection.uncertainty, 'not recorded') },
          teacherFeedback: portfolioSafeText(raw.teacherFeedback, 'not recorded'),
          revision: { previousAttemptId: portfolioSafeId(raw.revision && raw.revision.previousAttemptId, ''), scoreDelta: Math.max(-16, Math.min(16, Math.round(Number(raw.revision && raw.revision.scoreDelta) || 0))) },
          boundary: 'Local, sequence-free learning record; not a raw donor dataset, clinical interpretation, or automatic grade.'
        };
      }
      function openRouteStep(step) {
        if (!step) return;
        var nextPatch = { view: step.view };
        if (step.view === 'cross') nextPatch.crossTissueCompared = true;
        patch(nextPatch);
        announce('Next route step opened: ' + step.label + '.');
      }

      function importLearningPacket(event) {
        var input = event && event.target;
        var file = input && input.files && input.files[0];
        if (!file) return;
        function resetInput() { try { input.value = ''; } catch (error) {} }
        function fail(status, message) {
          patch({ packetImportStatus: status, packetImportLabel: message });
          announce(message);
          resetInput();
        }
        if (Number(file.size) > 2 * 1024 * 1024) {
          fail('too-large', 'That packet is larger than 2 MB. Choose a JSON export from Cell Atlas.');
          return;
        }
        if (typeof FileReader === 'undefined') {
          fail('unsupported', 'This browser cannot read packet files here.');
          return;
        }
        var reader = new FileReader();
        reader.onerror = function () { fail('error', 'The packet could not be read.'); };
        reader.onload = function () {
          var artifact = null;
          try { artifact = JSON.parse(String(reader.result || '')); } catch (error) { fail('invalid', 'That file is not valid JSON.'); return; }
          var allowed = ['cross-tissue-cer', 'reproducibility-audit', 'study-design'];
          allowed.push('teacher-review-portfolio');
          if (!artifact || artifact.schemaVersion !== EXPORT_SCHEMA_VERSION || allowed.indexOf(artifact.artifactType) < 0 || !artifact.fields || typeof artifact.fields !== 'object') {
            fail('unsupported', 'Choose a Cell Atlas JSON packet exported by this lab.');
            return;
          }
          function clip(value, max) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max); }
          var next = {
            packetImportStatus: 'imported',
            packetImportLabel: clip(artifact.title || artifact.artifactType, 120),
            packetImportAt: new Date().toISOString()
          };
          var provenance = artifact.provenance && typeof artifact.provenance === 'object' ? artifact.provenance : {};
          var provenanceEntries = Array.isArray(provenance.sources) ? provenance.sources : (provenance.hcaId ? [provenance] : []);
          var knownHcaIds = TISSUES.map(function (item) { return item.source.hcaId; });
          var knownProvenanceCount = provenanceEntries.filter(function (entry) { return entry && knownHcaIds.indexOf(entry.hcaId) >= 0; }).length;
          var provenanceStatus = provenanceEntries.length && knownProvenanceCount === provenanceEntries.length ? 'verified' : provenanceEntries.length ? 'review' : 'missing';
          next.packetImportProvenance = provenanceStatus;
          next.packetImportSourceSummary = provenanceEntries.length ? knownProvenanceCount + '/' + provenanceEntries.length + ' pinned HCA source records recognized' : 'No pinned HCA source records found; review before continuing.';
          var savedRoute = artifact.learningPath && typeof artifact.learningPath === 'object' ? artifact.learningPath : {};
          next.packetImportRouteSummary = savedRoute.total ? String(savedRoute.completedCount || 0) + '/' + String(savedRoute.total) + ' saved route milestones' : 'Route snapshot unavailable; continue with local checks.';
          var contextId = artifact.context && String(artifact.context.tissueId || '');
          var importedTissue = TISSUES.filter(function (item) { return item.id === contextId; })[0];
          if (importedTissue) {
            var visited = Object.assign({}, d.tissuesVisited || {});
            visited[importedTissue.id] = true;
            next.tissue = importedTissue.id;
            next.tissuesVisited = visited;
          }
          var fields = artifact.fields;
          if (artifact.artifactType === 'teacher-review-portfolio') {
            var importedAttempt = sanitizePortfolioAttempt(fields.portfolioAttempt);
            if (!importedAttempt) { fail('invalid', 'That portfolio packet is missing a bounded review attempt.'); return; }
            var importedAttempts = (Array.isArray(d.cellAtlasPortfolio && d.cellAtlasPortfolio.attempts) ? d.cellAtlasPortfolio.attempts : []).filter(function (attempt) { return attempt && attempt.schemaVersion === PORTFOLIO_SCHEMA_VERSION; });
            importedAttempts.push(Object.assign({}, importedAttempt, { imported: true, importedAt: new Date().toISOString() }));
            next.cellAtlasPortfolio = { schemaVersion: PORTFOLIO_SCHEMA_VERSION, activeAttemptId: importedAttempt.id, attempts: importedAttempts.slice(-8) };
            next.cellAtlasPortfolioStatus = 'imported';
            next.cellAtlasPortfolioLabel = 'Imported revision attempt ' + importedAttempt.id + '.';
            next.view = 'source';
          } else if (artifact.artifactType === 'cross-tissue-cer') {
            var lensId = CROSS_TISSUE_LENSES.some(function (lens) { return lens.id === fields.lens; }) ? fields.lens : 'vascular';
            var notes = Object.assign({}, d.crossNotebook || {});
            notes[lensId] = { claim: clip(fields.claim, 600), evidence: clip(fields.evidence, 900), reasoning: clip(fields.reasoning, 900) };
            next.crossNotebook = notes;
            next.systemLens = lensId;
            next.cautionAnswer = ['cautious', 'marker', 'lineage'].indexOf(fields.caution) >= 0 ? fields.caution : '';
            next.crossTissueCompared = true;
            next.view = 'cross';
          } else if (artifact.artifactType === 'study-design') {
            var importedDesign = fields.studyDesign && typeof fields.studyDesign === 'object' ? fields.studyDesign : {};
            var safeDesign = Object.assign({}, DESIGN_DEFAULT);
            DESIGN_FIELDS.forEach(function (field) {
              var value = importedDesign[field.id];
              if (field.options.some(function (option) { return option.value === value; })) safeDesign[field.id] = value;
            });
            next.studyDesign = safeDesign;
            next.designChanged = true;
            next.view = 'design';
          } else {
            var validReplicateIds = replicateOptions.map(function (item) { return item.id; });
            var importedReplicates = Array.isArray(fields.replicatesInspected) ? fields.replicatesInspected : [];
            var visitedReplicates = Object.assign({}, d.replicatesVisited || {});
            importedReplicates.forEach(function (id) { if (validReplicateIds.indexOf(id) >= 0) visitedReplicates[id] = true; });
            next.replicatesVisited = visitedReplicates;
            if (['rerun', 'heldout', 'external-study'].indexOf(fields.interpretation) >= 0) next.reproducibilityInterpretation = fields.interpretation;
            next.reproducibilityViewed = true;
            next.view = 'source';
          }
          patch(next);
          announce('Imported ' + next.packetImportLabel + '. Review the restored fields, then save a local packet to record your new export.');
          resetInput();
        };
        reader.readAsText(file);
      }

      function chooseTissue(nextTissue) {
        var visited = Object.assign({}, d.tissuesVisited || {});
        visited[nextTissue.id] = true;
        patch({
          tissue: nextTissue.id,
          selectedCell: nextTissue.defaultCell,
          selectedGene: nextTissue.cells[0].marker,
          compareA: nextTissue.defaultCell,
          compareB: nextTissue.defaultCompare,
          challengeIndex: 0,
          mysteryAnswer: '',
          evidenceMode: nextTissue.id === 'pancreas' ? d.evidenceMode : 'teaching',
          tissuesVisited: visited
        });
        announce(nextTissue.label + ' atlas selected.');
      }

      function chooseCell(id) {
        var explored = Object.assign({}, d.exploredTypes || {});
        explored[tissue.id + ':' + id] = true;
        var item = localCellById(id);
        patch({ selectedCell: id, selectedGene: item.marker, exploredTypes: explored });
        announce(item.label + ' selected. Strong marker ' + item.marker + '.');
      }

      function openConnected(toolId, stateKey, statePatch, label) {
        setToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          next[stateKey] = Object.assign({}, next[stateKey] || {}, statePatch || {}, { _scaleJourneySource: 'cellAtlasLab' });
          var handoffs = Object.assign({}, (next.cellAtlasLab && next.cellAtlasLab.journeyHandoffs) || {});
          handoffs[tissue.id] = true;
          next.cellAtlasLab = Object.assign({}, next.cellAtlasLab || {}, {
            journeyHandoffs: handoffs,
            alphaFoldHandoff: toolId === 'alphaFoldExplorer' ? true : !!(next.cellAtlasLab && next.cellAtlasLab.alphaFoldHandoff)
          });
          return next;
        });
        if (typeof setStemLabTab === 'function') setStemLabTab('explore');
        if (typeof setStemLabTool === 'function') setStemLabTool(toolId);
        announce('Cell Atlas journey: opening ' + label + '.');
      }

      function goGeneAlphaFold() {
        if (!selectedGene.accession) return;
        var handoffValue = currentEvidenceValue(selectedCell.id, selectedGene.id);
        var realGene = realCellSummary && realCellSummary.available && realCellSummary.genes && realCellSummary.genes[selectedGene.id];
        var evidenceDetail = evidenceMode === 'real' && realGene
          ? selectedGene.id + ' in ' + selectedCell.label + ': detected in ' + realGene.detectionPct + '% of ' + realCellSummary.cellCount + ' mapped cells; mean raw count ' + realGene.meanRawCount + '; within-gene relative mean ' + realGene.relativeMeanPct + '%.'
          : selectedGene.id + ' in ' + selectedCell.label + ': curated teaching evidence ' + (Math.round((Number(handoffValue) || 0) * 10) / 10) + ' out of 100.';
        openConnected('alphaFoldExplorer', '_alphaFoldExplorer', {
          prefillAccession: selectedGene.accession,
          prefillLabel: 'Human ' + selectedGene.protein,
          prefillSource: 'Cell Atlas Lab ' + tissue.label + ' investigation',
          prefillGene: selectedGene.id,
          prefillProtein: selectedGene.protein,
          prefillCellType: selectedCell.label,
          prefillTissue: tissue.label,
          prefillEvidenceMode: evidenceMode === 'real' ? 'Real aggregate RNA evidence' : 'Curated teaching RNA evidence',
          prefillMetricLabel: evidenceMode === 'real' ? (realMetric === 'detectionPct' ? 'Detection frequency' : 'Within-gene relative mean') : 'Teaching-normalized marker evidence',
          prefillEvidenceValue: handoffValue === null ? null : Number(handoffValue),
          prefillEvidenceDetail: evidenceDetail,
          prefillCellCount: realCellSummary && realCellSummary.available ? realCellSummary.cellCount : null,
          prefillBiologicalRole: selectedGene.role,
          prefillEvidenceBoundary: 'RNA evidence supports a transcript-level hypothesis. It does not directly measure protein abundance, localization, molecular activity, or cell function.',
          prefillAtlasDatasetVersion: evidenceMode === 'real' && realSnapshot ? realSnapshot.source.datasetVersionId : '',
          prefillAtlasAssetSha256: evidenceMode === 'real' && realSnapshot ? realSnapshot.source.assetSha256 : '',
          prefillAtlasSourceTitle: evidenceMode === 'real' && realSnapshot ? realSnapshot.source.title : '',
          prefillAtlasSourceUrl: evidenceMode === 'real' && realSnapshot ? realSnapshot.source.assetUrl : '',
          prefillAtlasCitation: evidenceMode === 'real' && realSnapshot ? realSnapshot.source.citation : ''
        }, 'AlphaFold Explorer with ' + selectedGene.protein);
      }

      function goPrimaryJourney() {
        var journey = tissue.primaryJourney;
        openConnected(journey.toolId, journey.stateKey, journey.state, journey.label);
      }

      function selectEvidenceMode(mode) {
        if (mode === 'real' && !realAvailable) return;
        var seen = Object.assign({}, d.realMetricsSeen || {});
        if (mode === 'real') seen[realMetric] = true;
        patch({ evidenceMode: mode, realDataViewed: mode === 'real' ? true : d.realDataViewed, realMetricsSeen: seen });
        announce(mode === 'real' ? 'Real aggregate Muraro evidence opened.' : 'Curated teaching evidence opened.');
      }

      function selectRealMetric(metric) {
        var seen = Object.assign({}, d.realMetricsSeen || {});
        seen[metric] = true;
        patch({ realMetric: metric, realDataViewed: true, realMetricsSeen: seen });
        announce(metric === 'detectionPct' ? 'Detection frequency selected.' : 'Relative mean signal selected.');
      }

      function selectBenchmarkMetric(metric) {
        var seen = Object.assign({}, d.benchmarkMetricsSeen || {});
        seen[metric] = true;
        patch({ benchmarkMetric: metric, benchmarkMetricsSeen: seen, realBenchmarkViewed: true, realDataViewed: true });
        announce((metric === 'detectionPct' ? 'Detection-frequency' : 'Relative-mean') + ' teaching-template rankings selected.');
      }

      function selectBenchmarkCell(cellId) {
        patch({ benchmarkCell: cellId, realBenchmarkViewed: true });
        announce('Ranking details opened for ' + localCellById(cellId).label + '.');
      }

      function selectAblationMetric(metric) {
        patch({ ablationMetric: metric, ablationGene: '', realBenchmarkViewed: true });
        announce((metric === 'detectionPct' ? 'Detection-frequency' : 'Relative-mean') + ' feature-ablation audit selected.');
      }

      function selectAblationCell(cellId) {
        patch({ ablationCell: cellId, ablationGene: '', realBenchmarkViewed: true });
        announce('Feature-ablation profile changed to ' + localCellById(cellId).label + '.');
      }

      function runMarkerAblation(geneId) {
        if (!geneId) {
          patch({ ablationGene: '' });
          announce('All marker features restored.');
          return;
        }
        var trials = Object.assign({}, d.ablationTrials || {});
        trials[ablationMetricId + ':' + ablationCellId + ':' + geneId] = true;
        patch({ ablationGene: geneId, ablationTrials: trials, realBenchmarkViewed: true });
        announce(geneId + ' removed from the ranking input as a counterfactual feature-ablation trial.');
      }

      function selectPanelMetric(metric) {
        patch({ panelMetric: metric, panelChanged: true });
        announce((metric === 'detectionPct' ? 'Detection-frequency' : 'Relative-mean') + ' panel search selected.');
      }

      function setPanelGenes(geneIds, metric, label) {
        var selection = {};
        geneIds.forEach(function (geneId) { selection[geneId] = true; });
        patch({ panelGenes: selection, panelMetric: metric || panelMetricId, panelChanged: true });
        announce(label + ' marker panel selected.');
      }

      function togglePanelGene(geneId) {
        var isSelected = selectedPanelGenes.indexOf(geneId) >= 0;
        if (isSelected && selectedPanelGenes.length === 1) {
          announce('Keep at least one gene in the marker panel.');
          return;
        }
        var nextGenes = isSelected
          ? selectedPanelGenes.filter(function (id) { return id !== geneId; })
          : selectedPanelGenes.concat([geneId]);
        setPanelGenes(nextGenes, panelMetricId, geneId + (isSelected ? ' removed from' : ' added to'));
      }

      function selectStabilityMetric(metric) {
        patch({ stabilityMetric: metric, stabilityViewed: true });
        announce((metric === 'detectionPct' ? 'Detection-frequency' : 'Relative-mean') + ' perturbation stability selected.');
      }

      function selectStabilityAmount(amount) {
        patch({ stabilityAmount: amount, stabilityViewed: true });
        announce('Plus or minus ' + Math.round(amount * 100) + ' percent perturbation envelope selected.');
      }

      function selectStabilityCell(cellId) {
        patch({ stabilityCell: cellId, stabilityViewed: true });
        announce('Perturbation outcomes opened for ' + localCellById(cellId).label + '.');
      }

      function selectReplicate(replicateId) {
        var visited = Object.assign({}, d.replicatesVisited || {});
        visited[replicateId] = true;
        patch({ replicateId: replicateId, replicatesVisited: visited, replicateDataViewed: true });
        var item = replicateOptions.filter(function (replicate) { return replicate.id === replicateId; })[0];
        announce((item ? item.label : 'Replicate') + ' aggregate evidence selected.');
      }

      function selectReplicateMetric(metric) {
        var seen = Object.assign({}, d.replicateMetricsSeen || {});
        seen[metric] = true;
        patch({ replicateMetric: metric, replicateMetricsSeen: seen, replicateDataViewed: true });
        announce((metric === 'detectionPct' ? 'Detection-frequency' : 'Relative-mean') + ' leave-one-replicate-out transfer selected.');
      }

      function selectReplicateCell(cellId) {
        patch({ replicateCell: cellId, replicateGene: localCellById(cellId).marker, replicateDataViewed: true });
        announce(localCellById(cellId).label + ' replicate comparison selected.');
      }

      function currentEvidenceValue(cellId, geneId) {
        if (evidenceMode === 'real') return realEvidence(realSnapshot, cellId, geneId, realMetric);
        return localMarkerStrength(cellId, geneId);
      }

      function renderBar(gene, value, color, metricLabel) {
        var numeric = Number(value) || 0;
        var rounded = Math.round(numeric * 10) / 10;
        return h('div', { key: gene.id, className: 'cal-bar-row' },
          h('span', { title: gene.name }, gene.id),
          h('span', { className: 'cal-bar-track', role: 'img', 'aria-label': gene.id + ' ' + (metricLabel || 'teaching-normalized evidence') + ' ' + rounded + ' out of 100' },
            h('span', { className: 'cal-bar-fill', style: { width: Math.max(0, Math.min(100, numeric)) + '%', background: color || '#0f766e' } })),
          h('b', null, rounded));
      }

      function reviewText(value, fallback) {
        var safe = String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 700);
        return safe || fallback;
      }

      function scoreReviewCriterion(text, type) {
        var value = String(text || '').toLowerCase();
        if (!value) return 1;
        if (type === 'source') return alphaFoldEvidenceRecord.captureMethod === 'alphafold-companion-explicit-send' ? 4 : 3;
        if (type === 'claim') {
          var cautious = /(hypothes|support|suggest|not prove|does not|cannot|separate|still require)/.test(value);
          var overclaim = /(proves|guarantee|definitive|certain|causes|is active)/.test(value);
          return overclaim ? 1 : cautious ? 4 : 2;
        }
        if (type === 'evidence') {
          var specific = /(plddt|confidence|pae|region|core|flexib|domain|residue|structure)/.test(value);
          return specific ? 4 : 2;
        }
        var testable = /(test|measure|assay|experiment|locali[sz]|abundance|function|activity|secretion|proteom|immun)/.test(value);
        return testable ? 4 : 2;
      }

      function renderAlphaFoldEvidenceRecord() {
        var record = alphaFoldEvidenceRecord;
        if (!record || !record.complete) return null;
        var recordProvenance = record.atlasProvenance && record.atlasProvenance.datasetVersion
          ? record.atlasProvenance
          : (record.tissue === tissue.label && tissue.id === 'pancreas' && realSnapshot && realSnapshot.source ? {
            datasetVersion: realSnapshot.source.datasetVersionId,
            assetSha256: realSnapshot.source.assetSha256,
            sourceTitle: realSnapshot.source.title,
            sourceUrl: realSnapshot.source.assetUrl,
            citation: realSnapshot.source.citation
          } : null);
        var provenanceUrl = recordProvenance && /^https?:\/\/[^\s]+$/i.test(String(recordProvenance.sourceUrl || '').trim())
          ? String(recordProvenance.sourceUrl).trim().slice(0, 320)
          : '';
        function text(value, fallback) {
          var safe = String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 600);
          return safe || fallback;
        }
        var fields = [
          { label: 'Learner structural observation', value: text(record.structureObservation, 'No structural observation recorded.') },
          { label: 'AlphaFold model evidence', value: text(record.structureEvidence, 'No model evidence recorded.') },
          { label: 'Cautious cross-scale claim', value: text(record.cautiousClaim, 'No cautious claim recorded.') },
          { label: 'Missing evidence or next test', value: text(record.nextTest, 'No next test recorded.') }
        ];
        var reviewItems = [
          { label: 'Source provenance', score: scoreReviewCriterion(record.accession, 'source'), detail: record.captureMethod === 'alphafold-companion-explicit-send' ? 'Public accession and successful companion load were captured.' : 'An accession is present, but companion load confirmation was not captured.' },
          { label: 'Claim caution', score: scoreReviewCriterion(record.cautiousClaim, 'claim'), detail: 'Looks for language that separates prediction from protein abundance, localization, and function.' },
          { label: 'Evidence specificity', score: scoreReviewCriterion(record.structureEvidence, 'evidence'), detail: 'Looks for a named model feature, confidence/PAE clue, region, or residue.' },
          { label: 'Validation planning', score: scoreReviewCriterion(record.nextTest, 'next'), detail: 'Looks for a measurable follow-up such as abundance, localization, activity, or an experiment.' }
        ];
        var reviewTotal = reviewItems.reduce(function (total, item) { return total + item.score; }, 0);
        function teacherPacket() {
          return [
            'Cell Atlas ↔ AlphaFold teacher review packet',
            'Record: ' + text(record.gene, 'gene') + ' / ' + text(record.protein, 'protein') + ' / ' + text(record.accession, 'accession'),
            'Tissue and cell: ' + text(record.tissue, 'tissue') + ' / ' + text(record.cellType, 'cell type'),
            'Source atlas observation: ' + text(record.atlasEvidence, 'not recorded'),
            recordProvenance && recordProvenance.datasetVersion ? 'Atlas provenance: dataset version ' + text(recordProvenance.datasetVersion, 'not recorded') + ' | asset SHA-256 ' + text(recordProvenance.assetSha256, 'not recorded') + ' | ' + text(recordProvenance.citation || recordProvenance.sourceTitle, 'source not recorded') : 'Atlas provenance: curated teaching context or legacy record without a pinned dataset.',
            'Rubric suggestion: ' + reviewTotal + '/16',
            reviewItems.map(function (item) { return item.label + ': ' + item.score + '/4 — ' + item.detail; }).join('\n'),
            'Learner claim: ' + text(record.cautiousClaim, 'not recorded'),
            'Structure evidence: ' + text(record.structureEvidence, 'not recorded'),
            'Limit or next test: ' + text(record.nextTest, 'not recorded'),
            'Teacher feedback: ' + text(d.alphaFoldTeacherNote, 'not recorded'),
            'Boundary: RNA, protein abundance, localization, structure, and function remain distinct evidence levels. No sequence is included.'
          ].join('\n');
        }
        function copyTeacherPacket() {
          var report = teacherPacket();
          if (!navigator.clipboard || !navigator.clipboard.writeText) { patch({ alphaFoldTeacherReviewStatus: 'unavailable' }); return; }
          navigator.clipboard.writeText(report).then(function () { patch({ alphaFoldTeacherReviewStatus: 'copied' }); }).catch(function () { patch({ alphaFoldTeacherReviewStatus: 'failed' }); });
        }
        function learnerPacket() {
          return [
            'Cell Atlas ↔ AlphaFold learner evidence record',
            'Record: ' + text(record.gene, 'gene') + ' / ' + text(record.protein, 'protein') + ' / ' + text(record.accession, 'accession'),
            'Tissue and cell: ' + text(record.tissue, 'tissue') + ' / ' + text(record.cellType, 'cell type'),
            'Source atlas observation: ' + text(record.atlasEvidence, 'not recorded'),
            recordProvenance && recordProvenance.datasetVersion ? 'Atlas provenance: dataset version ' + text(recordProvenance.datasetVersion, 'not recorded') + ' | asset SHA-256 ' + text(recordProvenance.assetSha256, 'not recorded') : 'Atlas provenance: not recorded',
            provenanceUrl ? 'Pinned atlas source URL: ' + provenanceUrl : 'Pinned atlas source URL: not recorded',
            'Learner structural observation: ' + text(record.structureObservation, 'not recorded'),
            'AlphaFold model evidence: ' + text(record.structureEvidence, 'not recorded'),
            'Cautious cross-scale claim: ' + text(record.cautiousClaim, 'not recorded'),
            'Missing evidence or next test: ' + text(record.nextTest, 'not recorded'),
            'Boundary: RNA, protein abundance, localization, structure, and function remain distinct evidence levels. No sequence is included.'
          ].join('\n');
        }
        function copyLearnerPacket() {
          var report = learnerPacket();
          if (!navigator.clipboard || !navigator.clipboard.writeText) { patch({ alphaFoldLearnerExportStatus: 'unavailable' }); return; }
          navigator.clipboard.writeText(report).then(function () { patch({ alphaFoldLearnerExportStatus: 'copied' }); }).catch(function () { patch({ alphaFoldLearnerExportStatus: 'failed' }); });
        }
        return h('section', { className: 'cal-card cal-af-return', 'aria-labelledby': 'cal-af-return-title' },
          h('p', { className: 'cal-kicker' }, 'Returned from AlphaFold'),
          h('h3', { id: 'cal-af-return-title' }, 'Cross-scale evidence record'),
          h('p', { className: 'cal-card-intro' }, 'This record keeps the source RNA observation, learner-authored model interpretation, and unmeasured biological questions visibly separate.'),
          h('div', { className: 'cal-af-return-meta', role: 'list', 'aria-label': 'Cross-scale record context' },
            h('span', { role: 'listitem' }, text(record.tissue, 'Tissue atlas')),
            h('span', { role: 'listitem' }, text(record.cellType, 'Selected cell')),
            h('span', { role: 'listitem' }, text(record.gene, 'Gene') + ' → ' + text(record.protein, 'protein')),
            h('span', { role: 'listitem' }, text(record.accession, 'No accession'))),
          h('div', { className: 'cal-af-atlas-evidence' },
            h('strong', null, 'Source atlas observation (' + text(record.atlasMetricLabel, 'RNA evidence') + '): '),
            text(record.atlasEvidence, 'No atlas evidence detail recorded.')),
          recordProvenance && recordProvenance.datasetVersion && h('div', { className: 'cal-provenance-wrap' },
            h('code', { className: 'cal-provenance-code' }, 'Atlas provenance: dataset version ' + text(recordProvenance.datasetVersion, 'not recorded') + ' | SHA-256 ' + text(recordProvenance.assetSha256, 'not recorded') + ' | ' + text(recordProvenance.citation || recordProvenance.sourceTitle, 'source not recorded')),
            provenanceUrl && h('a', { className: 'cal-provenance-link', href: provenanceUrl, target: '_blank', rel: 'noreferrer' }, 'Open pinned atlas source ↗')),
          record.captureMethod === 'alphafold-companion-explicit-send' && record.structureRecord && h('div', { className: 'cal-callout' },
            h('strong', null, 'Companion verification: '),
            'The public AlphaFold DB record ' + text(record.structureRecord.accession, record.accession) + ' was successfully loaded before this explicit handoff. Confidence summary: ' + text(record.structureRecord.confidenceSummary, 'not reported') + '.',
            record.structureRecord.paeSelection && record.structureRecord.paeSelection.available
              ? ' Selected PAE pair: residues ' + record.structureRecord.paeSelection.alignedResidue + ' and ' + record.structureRecord.paeSelection.comparedResidue + ', forward ' + record.structureRecord.paeSelection.forwardAngstroms + ' Å and reverse ' + record.structureRecord.paeSelection.reverseAngstroms + ' Å.'
              : ' No numeric PAE pair was returned.'),
          h('div', { className: 'cal-af-record-grid' }, fields.map(function (field) {
            return h('article', { key: field.label, className: 'cal-af-record-item' }, h('span', null, field.label), h('p', null, field.value));
          })),
          h('div', { className: 'cal-af-review', 'aria-labelledby': 'cal-af-review-title' },
            h('h4', { id: 'cal-af-review-title' }, 'Teacher review packet'),
            h('p', { className: 'cal-af-review-intro' }, 'Draft rubric suggestion only: review the learner’s actual reasoning and adjust the score. The tool never infers a grade from a single number.'),
            h('table', { className: 'cal-af-review-table' },
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Criterion'), h('th', { scope: 'col' }, 'Draft score'), h('th', { scope: 'col' }, 'What it checks'))),
              h('tbody', null, reviewItems.map(function (item) { return h('tr', { key: item.label }, h('th', { scope: 'row' }, item.label), h('td', { className: 'cal-af-review-score' }, item.score + '/4'), h('td', null, item.detail)); }))),
            h('div', { className: 'cal-af-review-total' }, 'Draft total: ' + reviewTotal + '/16'),
            h('label', { htmlFor: 'cal-af-teacher-feedback', style: { display: 'block', marginTop: '9px', color: '#5b21b6', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' } }, 'Teacher feedback'),
            h('textarea', { id: 'cal-af-teacher-feedback', rows: 3, maxLength: 800, value: d.alphaFoldTeacherNote || '', placeholder: 'Name one strength and one revision that would make the evidence or limitation more specific.', onChange: function (event) { patch({ alphaFoldTeacherNote: event.target.value.slice(0, 800), alphaFoldTeacherReviewStatus: '' }); } }),
            h('div', { className: 'cal-actions' },
              h('button', { type: 'button', className: 'cal-secondary', onClick: copyTeacherPacket }, 'Copy teacher review packet'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: copyLearnerPacket }, 'Copy learner evidence record'),
              d.alphaFoldTeacherReviewStatus === 'copied' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copied a sequence-free review packet.'),
              d.alphaFoldTeacherReviewStatus === 'unavailable' && h('span', { className: 'cal-map-note', role: 'status' }, 'Clipboard unavailable; select the review text manually.'),
              d.alphaFoldTeacherReviewStatus === 'failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copy failed; select the review text manually.'),
              d.alphaFoldLearnerExportStatus === 'copied' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copied a sequence-free learner record.'),
              d.alphaFoldLearnerExportStatus === 'unavailable' && h('span', { className: 'cal-map-note', role: 'status' }, 'Clipboard unavailable; select the learner record manually.'),
              d.alphaFoldLearnerExportStatus === 'failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copy failed; select the learner record manually.'))),
          h('div', { className: 'cal-model-boundary' },
            h('strong', null, 'Record boundary: '),
            'The structural notes are learner-authored interpretations of a prediction, not measurements imported from AlphaFold DB. No amino-acid sequence is stored. RNA, protein abundance, localization, structure, and function remain distinct evidence levels.'));
      }

      function renderRealInterpretation() {
        if (evidenceMode !== 'real' || !realSnapshot) return null;
        var acinar = realSnapshot.cellTypes.acinar;
        var gcg = acinar && acinar.genes && acinar.genes.GCG;
        if (!gcg) return null;
        var answer = d.realInterpretation || '';
        var correct = answer === 'cautious';
        return h('section', { className: 'cal-card cal-real-insight', 'aria-labelledby': 'cal-real-insight-title' },
          h('p', { className: 'cal-kicker' }, 'Real-data interpretation checkpoint'),
          h('h3', { id: 'cal-real-insight-title' }, 'Detected does not mean defining'),
          h('p', { className: 'cal-card-intro' },
            'In this raw-count snapshot, GCG is detected in ' + gcg.detectionPct + '% of mapped acinar cells, but their mean GCG signal is only ' + gcg.relativeMeanPct + '% of the highest displayed cell-type mean for GCG. What is the strongest conclusion?'),
          h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Real-data interpretation choices' },
            h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'same' ? 'true' : 'false', onClick: function () { patch({ realInterpretation: 'same' }); } }, 'The acinar cells must actually be alpha cells because GCG was detected.'),
            h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'invalid' ? 'true' : 'false', onClick: function () { patch({ realInterpretation: 'invalid' }); } }, 'Any unexpected detection makes the entire dataset invalid.'),
            h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'cautious' ? 'true' : 'false', onClick: function () { patch({ realInterpretation: 'cautious', realDataViewed: true }); } }, 'Detection alone is insufficient; signal magnitude, the multigene panel, and possible ambient/background RNA all matter.')),
          answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
            correct ? 'Defensible: abundant transcripts can appear as low background across other cell types, so annotation needs converging evidence.' : 'That conclusion overinterprets one observation. Compare the detection and relative-signal metrics together.'));
      }

      function renderMetricStressTest() {
        if (evidenceMode !== 'real' || !realSnapshot || !benchmarkSummary) return null;
        var answer = d.metricStressAnswer || '';
        var correct = answer === 'representation';
        var detection = realBenchmarks.filter(function (item) { return item.id === 'detectionPct'; })[0];
        var relative = realBenchmarks.filter(function (item) { return item.id === 'relativeMeanPct'; })[0];
        var detectedPrediction = detection && detection.distinctPredictions.length === 1
          ? localCellById(detection.distinctPredictions[0]).label
          : (detection ? detection.distinctPredictions.length + ' different templates' : 'no result');
        return h('section', { className: 'cal-card cal-benchmark', 'aria-labelledby': 'cal-benchmark-title' },
          h('p', { className: 'cal-kicker' }, 'Metric stress test'),
          h('h3', { id: 'cal-benchmark-title' }, 'Same source cells, different computational representation'),
          h('p', { className: 'cal-card-intro' },
            'Each aggregate profile is compared with the same eight hand-curated teaching templates using cosine similarity. Only the profile metric changes. “Aligned” means the top template has the same broad identity as the dataset annotation.'),
          h('div', { className: 'cal-benchmark-grid' },
            [detection, relative].filter(Boolean).map(function (summary) {
              var isDetection = summary.id === 'detectionPct';
              return h('article', { key: summary.id, className: 'cal-benchmark-card', 'data-current': benchmarkMetricId === summary.id ? 'true' : 'false' },
                h('h4', null, summary.label),
                h('strong', null, summary.alignedCount + ' of ' + summary.totalCount + ' aligned'),
                h('p', null, isDetection
                  ? 'Presence is broad here: all seven profiles rank ' + detectedPrediction + ' first.'
                  : 'Relative within-gene magnitude preserves the dominant marker pattern for all seven displayed identities.'),
                h('button', {
                  type: 'button',
                  className: benchmarkMetricId === summary.id ? 'cal-primary' : 'cal-secondary',
                  'aria-pressed': benchmarkMetricId === summary.id ? 'true' : 'false',
                  onClick: function () { selectBenchmarkMetric(summary.id); }
                }, isDetection ? 'Inspect detection rankings' : 'Inspect relative-signal rankings'));
            })),
          h('div', { className: 'cal-table-wrap' },
            h('table', { className: 'cal-table' },
              h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, benchmarkSummary.label + ': source annotations versus top teaching templates'),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, 'Source annotation'),
                h('th', { scope: 'col' }, 'Top template'),
                h('th', { scope: 'col' }, 'Cosine similarity'),
                h('th', { scope: 'col' }, 'Top-two gap'))),
              h('tbody', null, benchmarkSummary.rows.map(function (row) {
                return h('tr', { key: row.actualId, 'data-selected': benchmarkSelectedRow && benchmarkSelectedRow.actualId === row.actualId ? 'true' : 'false' },
                  h('th', { scope: 'row' }, row.actualLabel),
                  h('td', null, row.predictedLabel + (row.aligned ? ' ✓' : ' ≠')),
                  h('td', null, (row.score * 100).toFixed(1) + '%'),
                  h('td', null, (row.margin * 100).toFixed(1) + ' points'));
              })))),
          h('div', { className: 'cal-benchmark-detail' },
            h('div', { className: 'cal-field' },
              h('label', { htmlFor: 'cal-benchmark-cell' }, 'Inspect one annotated source group'),
              h('select', { id: 'cal-benchmark-cell', value: benchmarkSelectedRow ? benchmarkSelectedRow.actualId : '', onChange: function (event) { selectBenchmarkCell(event.target.value); } },
                benchmarkSummary.rows.map(function (row) { return h('option', { key: row.actualId, value: row.actualId }, row.actualLabel); }))),
            benchmarkSelectedRow && h('div', null,
              h('h4', { style: { marginTop: '11px' } }, 'Top three templates for ' + benchmarkSelectedRow.actualLabel),
              h('ol', { className: 'cal-rank-list' }, benchmarkSelectedRow.ranking.map(function (item) {
                return h('li', { key: item.id }, item.label + ' — ' + (item.score * 100).toFixed(1) + '% cosine similarity');
              })),
              h('p', { className: 'cal-map-note' }, 'Cosine similarity measures profile direction. It is not a probability, confidence score, or proof of identity.'))),
          h('div', { className: 'cal-model-boundary' },
            h('strong', null, 'Teaching-template agreement is not validation. '),
            'The source labels and marker templates are not independent, only eight genes are compared, and the two metrics encode different biological questions. A 7-of-7 result here does not establish that relative mean is universally superior.'),
          h('div', { className: 'cal-question', style: { marginTop: '12px' } },
            h('h3', null, 'Why did the ranking change so much?'),
            h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Metric stress-test explanation choices' },
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'zeros' ? 'true' : 'false', onClick: function () { patch({ metricStressAnswer: 'zeros' }); } }, 'A metric with fewer zero values is automatically more scientifically accurate.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'representation' ? 'true' : 'false', onClick: function () { patch({ metricStressAnswer: 'representation', realBenchmarkViewed: true }); } }, 'Detection frequency emphasizes broad presence, including background; relative magnitude preserves which marker dominates each displayed identity.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'labels' ? 'true' : 'false', onClick: function () { patch({ metricStressAnswer: 'labels' }); } }, 'The mismatch proves the source annotations are wrong.')),
            answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
              correct
                ? 'Exactly: a representation can preserve or erase the contrast a ranking method needs. The result is evidence about this pipeline, not a universal metric contest.'
                : 'Not supported. A ranking mismatch can come from the representation, the templates, the selected genes, or biological and technical noise.')));
      }

      function renderPseudoreplicationLab() {
        if (!pseudorepSummary) return null;
        var answer = d.pseudoreplicationInterpretation || '';
        var correct = answer === 'nested';
        return h('details', { className: 'cal-pseudo' },
          h('summary', null, 'Why pooled cells can mislead: open the pseudoreplication lab'),
          h('div', { className: 'cal-panel-inner' },
            h('p', { className: 'cal-kicker' }, 'Cells are nested within people'),
            h('h4', null, 'What should count as an independent replicate?'),
            h('p', { className: 'cal-card-intro' },
              'Compare a cell-weighted pooled percentage with an equal-replicate descriptive mean. The default stellate KRT19 example is intentionally stark because Replicate A contributes one cell while Replicate C contributes fifty.'),
            h('div', { className: 'cal-replicate-controls' },
              h('div', { className: 'cal-field' },
                h('label', { htmlFor: 'cal-pseudo-cell' }, 'Cell identity'),
                h('select', { id: 'cal-pseudo-cell', value: pseudorepCellId, onChange: function (event) { patch({ pseudorepCell: event.target.value, pseudoreplicationViewed: true }); } },
                  tissueById('pancreas').cells.filter(function (cell) { return realSnapshot.cellTypes[cell.id] && realSnapshot.cellTypes[cell.id].available; }).map(function (cell) {
                    return h('option', { key: cell.id, value: cell.id }, cell.label);
                  }))),
              h('div', { className: 'cal-field' },
                h('label', { htmlFor: 'cal-pseudo-gene' }, 'Gene'),
                h('select', { id: 'cal-pseudo-gene', value: pseudorepGeneId, onChange: function (event) { patch({ pseudorepGene: event.target.value, pseudoreplicationViewed: true }); } },
                  realSnapshot.genes.map(function (geneId) { return h('option', { key: geneId, value: geneId }, geneId); })))),
            h('div', { className: 'cal-pseudo-grid' },
              h('article', { className: 'cal-pseudo-card' },
                h('span', null, 'Pooled, cell-weighted detection'),
                h('strong', null, pseudorepSummary.pooledDetectionPct + '%'),
                h('span', null, pseudorepSummary.pooledDetectedCells + ' detected cells / ' + pseudorepSummary.pooledCellCount + ' total cells')),
              h('article', { className: 'cal-pseudo-card' },
                h('span', null, 'Equal-replicate descriptive mean'),
                h('strong', null, pseudorepSummary.equalReplicateMeanPct.toFixed(1) + '%'),
                h('span', null, 'each of ' + pseudorepSummary.donorCount + ' pseudonymous donors receives equal weight')),
              h('article', { className: 'cal-pseudo-card' },
                h('span', null, 'Observed replicate range'),
                h('strong', null, pseudorepSummary.replicateMinPct + '–' + pseudorepSummary.replicateMaxPct + '%'),
                h('span', null, 'descriptive heterogeneity; not a population interval'))),
            h('div', { className: 'cal-table-wrap' },
              h('table', { className: 'cal-table' },
                h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, pseudorepSummary.cellLabel + ' · ' + pseudorepSummary.geneId + ' detection denominators'),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col' }, 'Replicate'),
                  h('th', { scope: 'col' }, 'Detected / cells'),
                  h('th', { scope: 'col' }, 'Detection'))),
                h('tbody', null, pseudorepSummary.rows.map(function (row) {
                  return h('tr', { key: row.replicateId, 'data-low': row.lowCellCount ? 'true' : 'false' },
                    h('th', { scope: 'row' }, row.replicateLabel),
                    h('td', null, row.detectedCells + ' / ' + row.cellCount, row.lowCellCount && h('span', { className: 'cal-low-n', style: { marginLeft: '5px' } }, 'low n')),
                    h('td', null, row.detectionPct + '%'));
                })))),
            h('div', { className: 'cal-model-boundary' },
              h('strong', null, 'The naïve cell-level 95% Wilson interval is ' + pseudorepSummary.naiveWilsonLowPct.toFixed(1) + '–' + pseudorepSummary.naiveWilsonHighPct.toFixed(1) + '%. '),
              'That calculation treats cells as independent Bernoulli trials. It can describe cell-count uncertainty under that assumption, but it is not a donor-population confidence interval because cells share a donor, preparation, and technical environment.',
              h('code', { className: 'cal-formula' }, 'pooled = Σ detected cells / Σ cells · equal-replicate mean = Σ(within-replicate %) / 4')),
            h('p', { className: 'cal-map-note' },
              'Equal weighting is also only descriptive: four donors are too few for broad population claims, and a defensible analysis would define its estimand and use a donor-aware hierarchical or replicate-level model.'),
            h('div', { className: 'cal-question', style: { marginTop: '12px' } },
              h('h3', null, 'Why can 14.1% pooled and 31.4% equal-replicate mean both be arithmetically correct?'),
              h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Pseudoreplication interpretation choices' },
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'error' ? 'true' : 'false', onClick: function () { patch({ pseudoreplicationInterpretation: 'error' }); } }, 'One result must be a calculation error because valid summaries cannot differ.'),
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'nested' ? 'true' : 'false', onClick: function () { patch({ pseudoreplicationInterpretation: 'nested', pseudoreplicationViewed: true }); } }, 'They answer different weighting questions: pooled cells emphasize donors with more captured cells, while the descriptive replicate mean weights each donor equally; neither alone proves a population rate.'),
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'cells' ? 'true' : 'false', onClick: function () { patch({ pseudoreplicationInterpretation: 'cells' }); } }, 'The 78 cells should be treated as 78 independent people for population inference.')),
              answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
                correct
                  ? 'Exactly: the estimand and hierarchy matter. Cell count increases within-donor detail, but donor count limits claims about variation across people.'
                  : 'That ignores the nested design. Cells from one donor share biological and technical context, so more cells do not create more independent donors.'))));
      }

      function renderReplicateLab() {
        if (evidenceMode !== 'real' || !realSnapshot || !selectedReplicate || !selectedTransferAudit) return null;
        var answer = d.replicateInterpretation || '';
        var correct = answer === 'cautious';
        var reproducibilityAnswer = d.reproducibilityInterpretation || '';
        var reproducibilityCorrect = reproducibilityAnswer === 'external-study';
        function reproducibilityPacket() {
          var visited = Object.keys(d.replicatesVisited || {}).filter(function (id) { return (d.replicatesVisited || {})[id]; }).sort().join(', ') || 'not recorded';
          return [
            'Cell Atlas reproducibility audit',
            'Dataset version: ' + realSnapshot.source.datasetVersionId,
            'Asset SHA-256: ' + realSnapshot.source.assetSha256,
            'Pseudonymous replicates inspected: ' + visited,
            'Relative-mean held-out transfer: ' + relativeAligned + ' of ' + relativeTotal,
            'Detection-frequency held-out transfer: ' + detectionAligned + ' of ' + detectionTotal,
            'External study status: not included',
            'Learner independent-replication interpretation: ' + (reproducibilityAnswer || 'not answered'),
            'Boundary: donor holdout is internal transfer within one study. Independent replication requires a separate pinned source, prespecified mapping and QC rules, and uncertainty reporting. No source donor identifiers are included.'
          ].join('\n');
        }
        function copyReproducibilityPacket() {
          var report = reproducibilityPacket();
          if (!navigator.clipboard || !navigator.clipboard.writeText) { patch({ reproducibilityPacketStatus: 'unavailable' }); return; }
          navigator.clipboard.writeText(report).then(function () { patch({ reproducibilityPacketStatus: 'copied' }); }).catch(function () { patch({ reproducibilityPacketStatus: 'failed' }); });
        }
        function reproducibilityArtifact() {
          return buildExportArtifact('reproducibility-audit', 'Cell Atlas reproducibility audit', reproducibilityPacket(), {
            context: { tissueId: 'pancreas', tissueLabel: 'Pancreas', view: view, evidenceMode: evidenceMode },
            provenance: { datasetVersionId: realSnapshot.source.datasetVersionId, assetSha256: realSnapshot.source.assetSha256, project: realSnapshot.source.citation, sourceTitle: realSnapshot.source.title, sourceUrl: realSnapshot.source.assetUrl },
            fields: { replicatesInspected: Object.keys(d.replicatesVisited || {}).filter(function (id) { return (d.replicatesVisited || {})[id]; }).sort(), relativeAligned: relativeAligned, relativeTotal: relativeTotal, detectionAligned: detectionAligned, detectionTotal: detectionTotal, externalStudyStatus: 'not included', interpretation: reproducibilityAnswer || '' }
          });
        }
        function downloadReproducibilityPacket(format) {
          var downloaded = downloadArtifact('cell-atlas-reproducibility-audit', reproducibilityArtifact(), format);
          var status = downloaded ? (format === 'json' ? 'downloaded-json' : 'downloaded') : 'download-failed';
          var nextPatch = { reproducibilityPacketStatus: status };
          if (downloaded) nextPatch.exportedArtifacts = recordArtifactExport('reproducibility-audit', format);
          patch(nextPatch);
        }        var relativeAligned = relativeReplicateTransfer.reduce(function (total, item) { return total + item.alignedCount; }, 0);
        var relativeTotal = relativeReplicateTransfer.reduce(function (total, item) { return total + item.totalCount; }, 0);
        var detectionAligned = detectionReplicateTransfer.reduce(function (total, item) { return total + item.alignedCount; }, 0);
        var detectionTotal = detectionReplicateTransfer.reduce(function (total, item) { return total + item.totalCount; }, 0);
        var selectedAvailableCells = tissueById('pancreas').cells.filter(function (cell) {
          return selectedReplicate.cellTypes[cell.id] && selectedReplicate.cellTypes[cell.id].available;
        });
        var replicateB = replicateOptions.filter(function (item) { return item.id === 'replicate_b'; })[0];
        var smallEndothelial = replicateB && replicateB.cellTypes.endothelial;
        var smallKdr = smallEndothelial && smallEndothelial.genes.KDR;
        return h('section', { className: 'cal-card cal-replicate', 'aria-labelledby': 'cal-replicate-title' },
          h('p', { className: 'cal-kicker' }, 'Real donor-replicate evidence'),
          h('h3', { id: 'cal-replicate-title' }, 'Does the pattern transfer across people?'),
          h('p', { className: 'cal-card-intro' },
            'The four public source donor categories are deterministically relabeled Replicate A–D. Original donor IDs and cell rows are not exported. Compare denominators first, then hold out each replicate and build empirical cell-type centroids from the other three.'),
          h('div', { className: 'cal-replicate-tabs', role: 'group', 'aria-label': 'Pseudonymous source replicate' },
            replicateOptions.map(function (replicate) {
              var lowGroups = Object.keys(replicate.cellTypes).filter(function (cellId) {
                return replicate.cellTypes[cellId].available && replicate.cellTypes[cellId].lowCellCount;
              }).length;
              return h('button', {
                key: replicate.id,
                type: 'button',
                className: 'cal-replicate-tab',
                'aria-pressed': selectedReplicate.id === replicate.id ? 'true' : 'false',
                onClick: function () { selectReplicate(replicate.id); }
              }, h('strong', null, replicate.label), h('span', null, replicate.mappedCellCount + ' mapped cells; ' + lowGroups + ' group(s) below n=10'));
            })),
          h('div', { className: 'cal-replicate-controls' },
            h('div', { className: 'cal-field' },
              h('label', { htmlFor: 'cal-replicate-cell' }, 'Cell identity'),
              h('select', { id: 'cal-replicate-cell', value: replicateCellId, onChange: function (event) { selectReplicateCell(event.target.value); } },
                selectedAvailableCells.map(function (cell) { return h('option', { key: cell.id, value: cell.id }, cell.label); }))),
            h('div', { className: 'cal-field' },
              h('label', { htmlFor: 'cal-replicate-gene' }, 'Gene'),
              h('select', { id: 'cal-replicate-gene', value: replicateGeneId, onChange: function (event) { patch({ replicateGene: event.target.value, replicateDataViewed: true }); } },
                realSnapshot.genes.map(function (geneId) { return h('option', { key: geneId, value: geneId }, geneId); })))),
          h('div', { className: 'cal-table-wrap' },
            h('table', { className: 'cal-table' },
              h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, localCellById(replicateCellId).label + ' · ' + replicateGeneId + ' across four pseudonymous replicates'),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, 'Replicate'),
                h('th', { scope: 'col' }, 'Cells (n)'),
                h('th', { scope: 'col' }, 'Detected'),
                h('th', { scope: 'col' }, 'Mean raw count'),
                h('th', { scope: 'col' }, 'Within-replicate relative mean'))),
              h('tbody', null, replicateOptions.map(function (replicate) {
                var cell = replicate.cellTypes[replicateCellId];
                var gene = cell && cell.available && cell.genes[replicateGeneId];
                return h('tr', { key: replicate.id, 'data-low': cell && cell.lowCellCount ? 'true' : 'false' },
                  h('th', { scope: 'row' }, replicate.label),
                  h('td', null, cell ? cell.cellCount : 0, cell && cell.lowCellCount && h('span', { className: 'cal-low-n', style: { marginLeft: '5px' } }, 'low n')),
                  h('td', null, gene ? gene.detectionPct + '%' : 'Unavailable'),
                  h('td', null, gene ? gene.meanRawCount : '—'),
                  h('td', null, gene ? gene.relativeMeanPct + '%' : '—'));
              })))),
          h('div', { className: 'cal-transfer-summary' },
            h('article', { className: 'cal-transfer-card' },
              h('span', null, 'Relative-mean held-out transfer'),
              h('strong', null, relativeAligned + ' of ' + relativeTotal),
              h('span', null, 'source identities align with empirical centroids trained on the other three replicates')),
            h('article', { className: 'cal-transfer-card' },
              h('span', null, 'Detection-frequency held-out transfer'),
              h('strong', null, detectionAligned + ' of ' + detectionTotal),
              h('span', null, 'source identities align; broad detection produces smaller gaps and several mismatches'))),
          h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Replicate transfer metric' },
            h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': replicateMetricId === 'relativeMeanPct' ? 'true' : 'false', onClick: function () { selectReplicateMetric('relativeMeanPct'); } }, 'Inspect relative-mean transfer'),
            h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': replicateMetricId === 'detectionPct' ? 'true' : 'false', onClick: function () { selectReplicateMetric('detectionPct'); } }, 'Inspect detection transfer')),
          h('div', { className: 'cal-table-wrap' },
            h('table', { className: 'cal-table' },
              h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, selectedReplicate.label + ': predictions from centroids trained on the other three replicates'),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, 'Held-out source group'),
                h('th', { scope: 'col' }, 'n'),
                h('th', { scope: 'col' }, 'Top empirical centroid'),
                h('th', { scope: 'col' }, 'Similarity'),
                h('th', { scope: 'col' }, 'Top-two gap'))),
              h('tbody', null, selectedTransferAudit.rows.map(function (row) {
                return h('tr', { key: row.actualId, 'data-low': row.lowCellCount ? 'true' : 'false' },
                  h('th', { scope: 'row' }, row.actualLabel),
                  h('td', null, row.cellCount, row.lowCellCount && h('span', { className: 'cal-low-n', style: { marginLeft: '5px' } }, 'low n')),
                  h('td', null, row.predictedLabel + (row.aligned ? ' ✓' : ' ≠')),
                  h('td', null, (row.score * 100).toFixed(1) + '%'),
                  h('td', null, (row.margin * 100).toFixed(1) + ' points'));
              })))),
          renderPseudoreplicationLab(),
          h('div', { className: 'cal-model-boundary' },
            h('strong', null, 'Held-out here is internal, not external. '),
            'There are only four source donors from one study, assay, and preprocessing pipeline. Replicate-relative scaling can sharpen within-replicate contrasts. These aggregate rotations test donor transfer inside this dataset; they do not establish population coverage or clinical validity.'),
          h('div', { className: 'cal-model-boundary cal-reproducibility-status' },
            h('strong', null, 'External study status: not included. '),
            'This snapshot contains four pseudonymous donor aggregates from one study, assay, and preprocessing pipeline. A held-out donor transfer is useful internal validation, but independent replication requires a separate version-pinned study with a prespecified mapping, quality-control rule, and uncertainty report.'),
          h('div', { className: 'cal-question', style: { marginTop: '12px' } },
            h('h3', null, 'What result would count as independent replication?'),
            h('p', { className: 'cal-card-intro' }, 'Choose the strongest next test, not the most convenient re-analysis.'),
            h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Independent replication choices' },
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': reproducibilityAnswer === 'rerun' ? 'true' : 'false', onClick: function () { patch({ reproducibilityInterpretation: 'rerun', reproducibilityViewed: true }); } }, 'Rerun the same source cells with the same pipeline and call the agreement independent.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': reproducibilityAnswer === 'heldout' ? 'true' : 'false', onClick: function () { patch({ reproducibilityInterpretation: 'heldout', reproducibilityViewed: true }); } }, 'Hold out one donor from this study; this tests internal transfer, but it is not external replication.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': reproducibilityAnswer === 'external-study' ? 'true' : 'false', onClick: function () { patch({ reproducibilityInterpretation: 'external-study', reproducibilityViewed: true }); } }, 'Apply a prespecified marker and QC plan to a separate version-pinned pancreas study, then report mapping failures and uncertainty.')),
            reproducibilityAnswer && h('div', { className: 'cal-feedback', 'data-correct': reproducibilityCorrect ? 'true' : 'false', role: 'status' },
              reproducibilityCorrect
                ? 'Correct: a separate study, declared mapping rules, and visible failures make the replication claim auditable.'
                : 'That is still a re-analysis of the same study. Donor holdout can test internal transfer, but independent replication needs a separate pinned source.')),
            h('div', { className: 'cal-actions', style: { marginTop: '10px' } },
              h('button', { type: 'button', className: 'cal-secondary', onClick: copyReproducibilityPacket }, 'Copy reproducibility audit'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadReproducibilityPacket('md'); }, 'aria-label': 'Download cell-atlas-reproducibility-audit.md' }, 'Download audit (.md)'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadReproducibilityPacket('json'); }, 'aria-label': 'Download cell-atlas-reproducibility-audit.json' }, 'Download audit (.json)'),
              d.reproducibilityPacketStatus === 'downloaded' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded cell-atlas-reproducibility-audit.md.'),
              d.reproducibilityPacketStatus === 'downloaded-json' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded cell-atlas-reproducibility-audit.json.'),
              d.reproducibilityPacketStatus === 'copied' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copied a sequence-free reproducibility audit.'),
              d.reproducibilityPacketStatus === 'unavailable' && h('span', { className: 'cal-map-note', role: 'status' }, 'Clipboard unavailable; select the audit text manually.'),
              d.reproducibilityPacketStatus === 'failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copy failed; select the audit text manually.'),
              d.reproducibilityPacketStatus === 'download-failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Download unavailable; select the audit text manually.')),
          smallKdr && h('div', { className: 'cal-question', style: { marginTop: '12px' } },
            h('h3', null, 'Replicate B has ' + smallEndothelial.cellCount + ' endothelial cells, with KDR detected in ' + smallKdr.detectionPct + '%. What is justified?'),
            h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Replicate sample-size interpretation choices' },
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'population' ? 'true' : 'false', onClick: function () { patch({ replicateInterpretation: 'population' }); } }, 'The 100% estimate precisely describes all endothelial cells in the human population.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'cautious' ? 'true' : 'false', onClick: function () { patch({ replicateInterpretation: 'cautious', replicateDataViewed: true }); } }, 'Both sampled cells had detected KDR, but n=2 gives weak precision; inspect other replicates and avoid population-level certainty.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'discard' ? 'true' : 'false', onClick: function () { patch({ replicateInterpretation: 'discard' }); } }, 'Any group below ten cells must be silently deleted from the atlas.')),
            answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
              correct
                ? 'Correct: percentages need denominators. Replicate agreement can be encouraging while a tiny group still carries substantial sampling uncertainty.'
                : 'That conclusion ignores either the denominator or the evidence. Keep the small group visible, label its limitation, and compare independent evidence.')));
      }

      function renderMarkerAblation() {
        if (evidenceMode !== 'real' || !realSnapshot || !ablationResult) return null;
        var answer = d.ablationInterpretation || '';
        var correct = answer === 'panel';
        var baseline = ablationResult.baselineTop;
        var after = ablationResult.ablatedTop;
        return h('section', { className: 'cal-card cal-ablation', 'aria-labelledby': 'cal-ablation-title' },
          h('p', { className: 'cal-kicker' }, 'Counterfactual robustness lab'),
          h('h3', { id: 'cal-ablation-title' }, 'How fragile is an eight-gene ranking?'),
          h('p', { className: 'cal-card-intro' },
            'Set one aggregate input feature to zero, recompute the same cosine ranking, and ask whether the top teaching template changes. This tests the displayed pipeline’s dependence on one gene.'),
          h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Ablation metric' },
            h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': ablationMetricId === 'relativeMeanPct' ? 'true' : 'false', onClick: function () { selectAblationMetric('relativeMeanPct'); } }, 'Ablate relative-mean profile'),
            h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': ablationMetricId === 'detectionPct' ? 'true' : 'false', onClick: function () { selectAblationMetric('detectionPct'); } }, 'Ablate detection profile')),
          h('div', { className: 'cal-ablation-controls' },
            h('div', { className: 'cal-field' },
              h('label', { htmlFor: 'cal-ablation-cell' }, 'Annotated source group'),
              h('select', { id: 'cal-ablation-cell', value: ablationCellId, onChange: function (event) { selectAblationCell(event.target.value); } },
                ablationAudit.map(function (row) { return h('option', { key: row.cellId, value: row.cellId }, row.cellLabel); }))),
            h('div', null,
              h('p', { className: 'cal-kicker' }, 'Feature to set to zero'),
              h('div', { className: 'cal-gene-row', role: 'group', 'aria-label': 'Gene feature to remove' },
                realSnapshot.genes.map(function (geneId) {
                  return h('button', { key: geneId, type: 'button', className: 'cal-pill', 'aria-pressed': ablationGeneId === geneId ? 'true' : 'false', onClick: function () { runMarkerAblation(geneId); } }, 'Remove ' + geneId);
                }),
                h('button', { type: 'button', className: 'cal-secondary', onClick: function () { runMarkerAblation(''); } }, 'Restore all genes')))),
          h('div', { className: 'cal-ablation-results' },
            h('article', { className: 'cal-ablation-result' },
              h('span', null, 'Baseline top template'),
              h('strong', null, baseline.label),
              h('p', null, (baseline.score * 100).toFixed(1) + '% cosine similarity with all eight features')),
            h('article', { className: 'cal-ablation-result' },
              h('span', null, ablationGeneId ? 'After removing ' + ablationGeneId : 'Counterfactual result'),
              h('strong', null, after.label),
              h('p', null, (after.score * 100).toFixed(1) + '% cosine similarity' + (ablationGeneId ? ' after one feature is set to zero' : '; choose a feature to run a trial')))),
          ablationGeneId && h('div', { className: 'cal-ablation-status', 'data-changed': ablationResult.changed ? 'true' : 'false', role: 'status' },
            ablationResult.changed
              ? 'Ranking changed: ' + baseline.label + ' → ' + after.label + '. This panel is sensitive to ' + ablationGeneId + ' for the selected profile.'
              : 'Ranking stayed at ' + baseline.label + '. This single removal did not change the top template, though lower ranks and similarity can still move.'),
          ablationGeneId && h('div', { className: 'cal-benchmark-detail' },
            h('h4', null, 'Top three after removing ' + ablationGeneId),
            h('ol', { className: 'cal-rank-list' }, ablationResult.ablatedRanking.map(function (item) {
              return h('li', { key: item.id }, item.label + ' — ' + (item.score * 100).toFixed(1) + '% cosine similarity');
            }))),
          h('div', { className: 'cal-table-wrap' },
            h('table', { className: 'cal-table' },
              h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, 'Leave-one-gene-out sensitivity across all seven represented identities'),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, 'Source group'),
                h('th', { scope: 'col' }, 'Baseline top template'),
                h('th', { scope: 'col' }, 'Single removals that change it'))),
              h('tbody', null, ablationAudit.map(function (row) {
                return h('tr', { key: row.cellId },
                  h('th', { scope: 'row' }, row.cellLabel),
                  h('td', null, row.baselineLabel),
                  h('td', null, row.influentialGenes.length ? row.influentialGenes.join(', ') : 'None in this panel'));
              })))),
          h('div', { className: 'cal-model-boundary' },
            h('strong', null, 'Feature ablation is not biological ablation. '),
            'Setting an aggregate input to zero does not simulate a gene knockout, estimate a single-cell dropout rate, or show that the cells changed identity. It is a counterfactual test of this small ranking pipeline.'),
          h('div', { className: 'cal-question', style: { marginTop: '12px' } },
            h('h3', null, 'What does a marker-dependent flip justify?'),
            h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Marker-ablation interpretation choices' },
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'identity' ? 'true' : 'false', onClick: function () { patch({ ablationInterpretation: 'identity' }); } }, 'The source cells physically changed into the newly ranked cell type.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'panel' ? 'true' : 'false', onClick: function () { patch({ ablationInterpretation: 'panel', realBenchmarkViewed: true }); } }, 'This limited panel and template ranking lack redundancy for that profile; stronger annotation should use converging markers, QC, and replication.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'knockout' ? 'true' : 'false', onClick: function () { patch({ ablationInterpretation: 'knockout' }); } }, 'The trial predicts what a laboratory gene knockout would cause.')),
            answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
              correct
                ? 'Well bounded: the flip diagnoses feature dependence in this pipeline. It motivates a broader, independently checked marker panel—not a claim that cell identity changed.'
                : 'That goes beyond this computation. The intervention changed one model input, not the biological cells or their genome.')));
      }

      function renderPanelBuilder() {
        if (evidenceMode !== 'real' || !realSnapshot) return null;
        var answer = d.panelInterpretation || '';
        var correct = answer === 'holdout';
        var bestFiveDetection = ['INS', 'KRT19', 'PRSS1', 'COL3A1', 'KDR'];
        var representedMarkers = ['INS', 'GCG', 'SST', 'KRT19', 'PRSS1', 'COL3A1', 'KDR'];
        return h('details', { className: 'cal-card cal-panel-builder' },
          h('summary', null, 'Extend the investigation: design a marker panel'),
          h('div', { className: 'cal-panel-inner' },
            h('p', { className: 'cal-kicker' }, 'Exhaustive 255-panel search'),
            h('h3', null, 'Can a smaller panel preserve the distinctions?'),
            h('p', { className: 'cal-card-intro' },
              'Choose any non-empty subset of the eight genes. The lab zeros excluded features, reranks all seven represented source groups, and compares your result with the best apparent agreement found at every panel size.'),
            h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Panel metric' },
              h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': panelMetricId === 'relativeMeanPct' ? 'true' : 'false', onClick: function () { selectPanelMetric('relativeMeanPct'); } }, 'Build with relative mean'),
              h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': panelMetricId === 'detectionPct' ? 'true' : 'false', onClick: function () { selectPanelMetric('detectionPct'); } }, 'Build with detection frequency')),
            h('div', { className: 'cal-gene-row', role: 'group', 'aria-label': 'Genes included in marker panel', style: { marginTop: '10px' } },
              realSnapshot.genes.map(function (geneId) {
                var selected = selectedPanelGenes.indexOf(geneId) >= 0;
                return h('button', { key: geneId, type: 'button', className: 'cal-pill', 'aria-pressed': selected ? 'true' : 'false', onClick: function () { togglePanelGene(geneId); } }, geneId);
              })),
            h('div', { className: 'cal-actions', style: { marginTop: '10px' } },
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { setPanelGenes(realSnapshot.genes, panelMetricId, 'All-eight-gene'); } }, 'Use all 8 genes'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { setPanelGenes(representedMarkers, 'relativeMeanPct', 'Seven represented-marker'); } }, 'Use 7 represented markers'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { setPanelGenes(bestFiveDetection, 'detectionPct', 'Searched five-gene detection'); } }, 'Use searched five-gene example')),
            h('div', { className: 'cal-panel-score', role: 'status' },
              h('strong', null, panelResult.alignedCount + ' of ' + panelResult.totalCount),
              h('span', null, 'top templates aligned with source annotations using ' + selectedPanelGenes.length + ' gene(s)')),
            h('div', { className: 'cal-table-wrap' },
              h('table', { className: 'cal-table' },
                h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, 'Current panel: ' + selectedPanelGenes.join(', ')),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col' }, 'Source group'),
                  h('th', { scope: 'col' }, 'Top template'),
                  h('th', { scope: 'col' }, 'Agreement'))),
                h('tbody', null, panelResult.rows.map(function (row) {
                  return h('tr', { key: row.actualId, 'data-aligned': row.aligned ? 'true' : 'false' },
                    h('th', { scope: 'row' }, row.actualLabel),
                    h('td', null, row.predictedLabel),
                    h('td', null, row.aligned ? 'Aligned' : 'Different'));
                })))),
            h('div', { className: 'cal-table-wrap cal-frontier' },
              h('table', { className: 'cal-table' },
                h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, 'Best apparent agreement found at each panel size for ' + (panelMetricId === 'detectionPct' ? 'detection frequency' : 'relative mean')),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col' }, 'Panel size'),
                  h('th', { scope: 'col' }, 'Best aligned'),
                  h('th', { scope: 'col' }, 'One best-scoring example'))),
                h('tbody', null, panelFrontier.map(function (row) {
                  return h('tr', { key: row.size },
                    h('th', { scope: 'row' }, row.size),
                    h('td', null, row.alignedCount + '/' + row.totalCount),
                    h('td', null, row.genes.join(', ')));
                })))),
            h('div', { className: 'cal-model-boundary' },
              h('strong', null, 'This is resubstitution, not validation. '),
              'The same seven annotated groups are used to search for and score the panels. Trying all 255 subsets can overfit this tiny display; a chosen panel needs testing on held-out donors, datasets, technologies, and plausible perturbations.'),
            h('div', { className: 'cal-question', style: { marginTop: '12px' } },
              h('h3', null, 'Why not choose the best-scoring panel and declare the problem solved?'),
              h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Panel-selection interpretation choices' },
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'perfect' ? 'true' : 'false', onClick: function () { patch({ panelInterpretation: 'perfect' }); } }, 'Exhaustive search guarantees the selected genes will generalize to any new atlas.'),
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'holdout' ? 'true' : 'false', onClick: function () { patch({ panelInterpretation: 'holdout', panelChanged: true }); } }, 'Selection and scoring used the same small dataset, so apparent agreement is optimistic; test the panel on independent held-out data.'),
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'more' ? 'true' : 'false', onClick: function () { patch({ panelInterpretation: 'more' }); } }, 'Adding more genes must always improve a cosine-template ranking.')),
              answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
                correct
                  ? 'Exactly: panel search can capitalize on this dataset’s quirks. Independent evaluation asks whether the distinctions survive new biological and technical variation.'
                  : 'The search table itself contradicts that claim: for detection frequency, some larger panels reduce apparent agreement. Search performance is not out-of-sample evidence.'))));
      }

      function renderStabilityLab() {
        if (evidenceMode !== 'real' || !realSnapshot || !stabilitySelected) return null;
        var answer = d.stabilityInterpretation || '';
        var correct = answer === 'sensitivity';
        var envelopeLabel = '±' + Math.round(stabilityAmount * 100) + '%';
        return h('details', { className: 'cal-card cal-stability' },
          h('summary', null, 'Extend the investigation: test bounded perturbation stability'),
          h('div', { className: 'cal-panel-inner' },
            h('p', { className: 'cal-kicker' }, 'Exact 256-pattern robustness envelope'),
            h('h3', null, 'Does the top ranking survive small input changes?'),
            h('p', { className: 'cal-card-intro' },
              'For every gene, choose the low or high edge of a symmetric multiplicative envelope. The lab evaluates all 2⁸ = 256 sign patterns, so the result is deterministic and reproducible.'),
            h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Perturbation metric' },
              h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': stabilityMetricId === 'relativeMeanPct' ? 'true' : 'false', onClick: function () { selectStabilityMetric('relativeMeanPct'); } }, 'Stress relative mean'),
              h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': stabilityMetricId === 'detectionPct' ? 'true' : 'false', onClick: function () { selectStabilityMetric('detectionPct'); } }, 'Stress detection frequency')),
            h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Perturbation envelope', style: { marginTop: '8px' } },
              [0.1, 0.25, 0.5].map(function (amount) {
                return h('button', { key: amount, type: 'button', className: 'cal-pill', 'aria-pressed': stabilityAmount === amount ? 'true' : 'false', onClick: function () { selectStabilityAmount(amount); } }, 'Use ±' + Math.round(amount * 100) + '% envelope');
              })),
            h('div', { className: 'cal-stability-grid' },
              h('div', { className: 'cal-field' },
                h('label', { htmlFor: 'cal-stability-cell' }, 'Inspect one source group'),
                h('select', { id: 'cal-stability-cell', value: stabilitySelected.cellId, onChange: function (event) { selectStabilityCell(event.target.value); } },
                  stabilityAudit.map(function (row) { return h('option', { key: row.cellId, value: row.cellId }, row.cellLabel); }))),
              h('div', { className: 'cal-stability-score', role: 'status' },
                h('span', null, stabilitySelected.baselineTop.label + ' remains top in'),
                h('strong', null, stabilitySelected.stableCount + ' of ' + stabilitySelected.totalPatterns),
                h('span', null, envelopeLabel + ' perturbation patterns (' + stabilitySelected.stabilityPct.toFixed(1) + '% computational stability)'))),
            h('h4', null, 'Top-template outcomes for ' + stabilitySelected.cellLabel),
            h('div', { className: 'cal-outcomes', role: 'list', 'aria-label': 'Perturbation outcome distribution' },
              stabilitySelected.outcomes.map(function (outcome) {
                return h('span', { key: outcome.id, className: 'cal-outcome', role: 'listitem' }, outcome.label + ': ' + outcome.count + '/256');
              })),
            h('div', { className: 'cal-table-wrap' },
              h('table', { className: 'cal-table' },
                h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, envelopeLabel + ' exhaustive perturbation stability across seven represented identities'),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col' }, 'Source group'),
                  h('th', { scope: 'col' }, 'Baseline top'),
                  h('th', { scope: 'col' }, 'Source aligned?'),
                  h('th', { scope: 'col' }, 'Baseline retained'))),
                h('tbody', null, stabilityAudit.map(function (row) {
                  return h('tr', { key: row.cellId, 'data-stable': row.stableCount === row.totalPatterns ? 'true' : 'false' },
                    h('th', { scope: 'row' }, row.cellLabel),
                    h('td', null, row.baselineTop.label),
                    h('td', null, row.baselineAligned ? 'Yes' : 'No'),
                    h('td', null, row.stableCount + '/' + row.totalPatterns + ' (' + row.stabilityPct.toFixed(1) + '%)'));
                })))),
            h('div', { className: 'cal-model-boundary' },
              h('strong', null, 'A robustness envelope is not a confidence interval. '),
              'The symmetric multipliers are a chosen computational stress test, not an estimate of donor variation, technical error, or biological probability. Zero inputs remain zero, correlations are ignored, and a stable ranking can still be systematically misaligned.'),
            h('div', { className: 'cal-question', style: { marginTop: '12px' } },
              h('h3', null, 'What does 192/256 stable patterns mean?'),
              h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Perturbation-stability interpretation choices' },
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'probability' ? 'true' : 'false', onClick: function () { patch({ stabilityInterpretation: 'probability' }); } }, 'There is a 75% biological probability that the source cells truly have the baseline identity.'),
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'sensitivity' ? 'true' : 'false', onClick: function () { patch({ stabilityInterpretation: 'sensitivity', stabilityViewed: true }); } }, 'The top template survives 75% of this chosen perturbation grid; that measures pipeline sensitivity, not biological confidence or correctness.'),
                h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': answer === 'label' ? 'true' : 'false', onClick: function () { patch({ stabilityInterpretation: 'label' }); } }, 'Any instability proves the source annotation is incorrect.')),
              answer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
                correct
                  ? 'Correct: robustness and validity are separate axes. Pair stability tests with source agreement, independent validation, and a realistic uncertainty model.'
                  : 'That interpretation treats a designed stress grid as biological sampling. These 256 cases were constructed, not observed from donors or replicate experiments.'))));
      }

      function renderMap() {
        var offsets = [[-20,-7],[-10,14],[0,-17],[10,7],[21,-2],[3,20]];
        var metricLabel = evidenceMode === 'real'
          ? (realMetric === 'detectionPct' ? 'raw RNA detection frequency (%)' : 'within-gene relative mean raw signal (%)')
          : 'teaching-normalized expression evidence';
        var selectedRealAvailable = evidenceMode !== 'real' || (realCellSummary && realCellSummary.available);
        return h('div', { className: 'cal-map-stack' },
          h('div', { className: 'cal-layout' },
            h('section', { className: 'cal-card', 'aria-labelledby': 'cal-map-title' },
              h('h3', { id: 'cal-map-title' }, tissue.mapTitle),
              h('p', { className: 'cal-card-intro' }, 'Choose a marker gene, then inspect which ' + tissue.label.toLowerCase() + ' cell cluster carries the strongest evidence. Each labeled cluster is keyboard selectable.'),
              h('div', { className: 'cal-evidence-switch' },
                h('strong', null, 'Evidence layer'),
                h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Evidence source mode' },
                  h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': evidenceMode === 'teaching' ? 'true' : 'false', onClick: function () { selectEvidenceMode('teaching'); } }, 'Curated teaching model'),
                  h('button', { type: 'button', className: 'cal-pill', disabled: !realAvailable, 'aria-pressed': evidenceMode === 'real' ? 'true' : 'false', onClick: function () { selectEvidenceMode('real'); } }, realAvailable ? 'Real Muraro snapshot' : 'Real snapshot: pancreas only'))),
              evidenceMode === 'real' && h('div', { className: 'cal-mode-buttons', role: 'group', 'aria-label': 'Real-data metric', style: { marginBottom: '9px' } },
                h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': realMetric === 'relativeMeanPct' ? 'true' : 'false', onClick: function () { selectRealMetric('relativeMeanPct'); } }, 'Relative mean signal'),
                h('button', { type: 'button', className: 'cal-pill', 'aria-pressed': realMetric === 'detectionPct' ? 'true' : 'false', onClick: function () { selectRealMetric('detectionPct'); } }, 'Detection frequency')),
              evidenceMode === 'real' && h('div', { className: 'cal-real-meta', role: 'list', 'aria-label': 'Real snapshot provenance summary' },
                h('div', { role: 'listitem' }, h('b', null, realSnapshot.source.primaryCellCount), h('span', null, 'primary cells in asset')),
                h('div', { role: 'listitem' }, h('b', null, mappedRealCells), h('span', null, 'cells mapped to this lesson')),
                h('div', { role: 'listitem' }, h('b', null, realSnapshot.source.donorCount), h('span', null, 'donors')),
                h('div', { role: 'listitem' }, h('b', null, realSnapshot.source.assay), h('span', null, 'assay'))),
              h('div', { className: 'cal-gene-row', role: 'group', 'aria-label': 'Marker gene' },
                GENES.map(function (gene) {
                  return h('button', { key: gene.id, type: 'button', className: 'cal-pill', 'aria-pressed': selectedGene.id === gene.id ? 'true' : 'false', onClick: function () { patch({ selectedGene: gene.id }); announce(gene.id + ' marker selected.'); } }, gene.id);
                })),
              h('div', { className: 'cal-map-wrap' },
                h('svg', { className: 'cal-map', viewBox: '0 0 680 430', role: 'img', 'aria-labelledby': 'cal-svg-title cal-svg-desc' },
                  h('title', { id: 'cal-svg-title' }, tissue.mapAria),
                  h('desc', { id: 'cal-svg-desc' }, 'Eight labeled cell-type clusters. Dot size and brightness indicate ' + metricLabel + ' for ' + selectedGene.id + '. Coordinates are illustrative, not a published UMAP.'),
                  h('defs', null,
                    h('radialGradient', { id: 'cal-bg-glow' }, h('stop', { offset: '0%', stopColor: '#164e63', stopOpacity: .45 }), h('stop', { offset: '100%', stopColor: '#071b2f', stopOpacity: 0 }))),
                  h('rect', { x: 0, y: 0, width: 680, height: 430, fill: '#071b2f' }),
                  h('circle', { cx: 340, cy: 215, r: 260, fill: 'url(#cal-bg-glow)' }),
                  h('text', { className: 'cal-axis', x: 15, y: 215, transform: 'rotate(-90 15 215)' }, 'illustrative expression neighborhood 2'),
                  h('text', { className: 'cal-axis', x: 245, y: 418 }, 'illustrative expression neighborhood 1'),
                  CELL_TYPES.map(function (cell) {
                    var rawStrength = currentEvidenceValue(cell.id, selectedGene.id);
                    var strength = rawStrength === null ? 0 : rawStrength;
                    var radius = 4.5 + strength / 22;
                    var opacity = rawStrength === null ? .16 : .28 + strength / 140;
                    return h('g', {
                      key: cell.id,
                      className: 'cal-cluster',
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': cell.label + ', ' + selectedGene.id + ' ' + (rawStrength === null ? 'not represented in snapshot' : metricLabel + ' ' + Math.round(strength * 10) / 10),
                      onClick: function () { chooseCell(cell.id); },
                      onKeyDown: function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseCell(cell.id); } }
                    },
                      offsets.map(function (point, index) {
                        return h('circle', { key: index, cx: cell.center[0] + point[0], cy: cell.center[1] + point[1], r: radius + (index % 2), fill: cell.color, opacity: opacity, stroke: strength >= 80 ? '#f8fafc' : 'rgba(255,255,255,.28)', strokeWidth: strength >= 80 ? 2 : 1 });
                      }),
                      h('text', { x: cell.center[0], y: cell.center[1] + 38, textAnchor: 'middle', fill: strength >= 80 ? '#fff' : '#cbd5e1' }, cell.label + (rawStrength === null ? ' *' : ''))
                    );
                  }))),
              h('p', { className: 'cal-map-note' },
                evidenceMode === 'real'
                  ? (realMetric === 'detectionPct'
                    ? 'Real aggregate: percent of mapped source cells with raw count greater than zero. Detection can include low background or ambient RNA and does not establish identity.'
                    : 'Real aggregate: each mean raw count is scaled to the largest displayed cell-type mean for the same gene. Compare cell types within one gene only—not different genes.')
                  : 'Scientific model boundary: coordinates and dots are illustrative. Marker strengths are curated 0-100 teaching scores, not raw RNA counts or physical distances.')),
            h('aside', { className: 'cal-card', 'aria-labelledby': 'cal-profile-title' },
              h('div', { className: 'cal-profile-head' },
                h('div', null, h('p', { className: 'cal-kicker' }, 'Selected cell identity'), h('h3', { id: 'cal-profile-title' }, selectedCell.label)),
                h('span', { className: 'cal-marker', style: { background: selectedCell.color } }, 'marker ' + selectedCell.marker)),
              h('p', { className: 'cal-job' }, selectedCell.job),
              !selectedRealAvailable && h('div', { className: 'cal-unavailable' },
                h('strong', null, 'Not represented in this snapshot. '),
                realCellSummary ? realCellSummary.reason : 'No matching source annotation is available. The interface does not substitute a zero profile or fabricate cells.'),
              selectedRealAvailable && h('h4', null, evidenceMode === 'real' ? 'Aggregate source profile' : 'Marker evidence profile'),
              selectedRealAvailable && GENES.map(function (gene) {
                var value = evidenceMode === 'real' ? realEvidence(realSnapshot, selectedCell.id, gene.id, realMetric) : selectedCell.evidence[gene.id];
                return renderBar(gene, value, selectedCell.color, metricLabel);
              }),
              evidenceMode === 'real' && selectedRealAvailable
                ? h('div', { className: 'cal-callout' },
                    h('strong', null, selectedGene.id + ' audit: '),
                    realCellSummary.genes[selectedGene.id].detectionPct + '% detected; mean raw count ' + realCellSummary.genes[selectedGene.id].meanRawCount + '; within-gene relative mean ' + realCellSummary.genes[selectedGene.id].relativeMeanPct + '%.',
                    h('br'), realCellSummary.cellCount + ' mapped cells across ' + realCellSummary.donorCount + ' donor(s), source label “' + realCellSummary.sourceCellType + '”.')
                : h('div', { className: 'cal-callout' },
                    h('strong', null, selectedGene.id + ': '), selectedGene.role,
                    h('br'), 'Expression evidence supports cell identity, but it does not directly measure final protein abundance or prove function.'),
              evidenceMode === 'real' && h('code', { className: 'cal-provenance-code' }, 'dataset ' + realSnapshot.source.datasetVersionId + ' | SHA-256 ' + realSnapshot.source.assetSha256),
              h('div', { className: 'cal-actions', style: { marginTop: '12px' } },
                h('button', { type: 'button', className: 'cal-primary', disabled: !selectedGene.accession, onClick: goGeneAlphaFold }, selectedGene.accession ? 'Follow ' + selectedGene.id + ' to AlphaFold \u2192' : 'No structure link for this marker'),
                h('button', { type: 'button', className: 'cal-secondary', onClick: function () { openConnected('cell', 'cell', { mode: 'processes', cellProcess: 'protein' }, 'Cell Simulator protein pathway'); } }, 'Cell processes \u2192')))),
          renderAlphaFoldEvidenceRecord(),
          renderRealInterpretation(),
          renderMetricStressTest(),
          renderReplicateLab(),
          renderMarkerAblation(),
          renderPanelBuilder(),
          renderStabilityLab()
        );
      }

      function scoreCell(value) {
        return h('span', { className: 'cal-score', 'aria-label': value + ' out of 100' },
          h('i', { 'aria-hidden': 'true' }, h('span', { style: { width: value + '%' } })),
          h('b', null, value));
      }

      function renderCompare() {
        return h('section', { className: 'cal-card', 'aria-labelledby': 'cal-compare-title' },
          h('h3', { id: 'cal-compare-title' }, 'Compare cell identities'),
          h('p', { className: 'cal-card-intro' }, 'Cells in one organ can contain essentially the same genome while activating very different gene programs. Compare two evidence profiles.'),
          h('div', { className: 'cal-compare-controls' },
            h('div', { className: 'cal-field' }, h('label', { htmlFor: 'cal-compare-a' }, 'Cell type A'), h('select', { id: 'cal-compare-a', value: compareA.id, onChange: function (event) { patch({ compareA: event.target.value, comparisonViewed: true }); } }, CELL_TYPES.map(function (cell) { return h('option', { key: cell.id, value: cell.id }, cell.label); }))),
            h('div', { className: 'cal-compare-vs', 'aria-hidden': 'true' }, 'VS'),
            h('div', { className: 'cal-field' }, h('label', { htmlFor: 'cal-compare-b' }, 'Cell type B'), h('select', { id: 'cal-compare-b', value: compareB.id, onChange: function (event) { patch({ compareB: event.target.value, comparisonViewed: true }); } }, CELL_TYPES.map(function (cell) { return h('option', { key: cell.id, value: cell.id }, cell.label); })))),
          h('div', { className: 'cal-table-wrap' },
            h('table', { className: 'cal-table' },
              h('caption', { style: { textAlign: 'left', padding: '8px 0', fontWeight: 900 } }, (evidenceMode === 'real' ? 'Real aggregate ' + (realMetric === 'detectionPct' ? 'detection frequency' : 'relative mean signal') : 'Teaching-normalized marker evidence') + ': ' + compareA.label + ' and ' + compareB.label),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Gene'), h('th', { scope: 'col' }, compareA.label), h('th', { scope: 'col' }, compareB.label), h('th', { scope: 'col' }, 'Interpretation'))),
              h('tbody', null, GENES.map(function (gene) {
                var a = evidenceMode === 'real' ? (realEvidence(realSnapshot, compareA.id, gene.id, realMetric) || 0) : compareA.evidence[gene.id], b = evidenceMode === 'real' ? (realEvidence(realSnapshot, compareB.id, gene.id, realMetric) || 0) : compareB.evidence[gene.id];
                var reading = Math.abs(a - b) < 15 ? 'Similar displayed evidence' : (a > b ? 'Higher in ' + compareA.label : 'Higher in ' + compareB.label);
                return h('tr', { key: gene.id }, h('th', { scope: 'row' }, gene.id), h('td', null, scoreCell(a)), h('td', null, scoreCell(b)), h('td', null, reading));
              })))),
          h('div', { className: 'cal-field', style: { marginTop: '14px' } },
            h('label', { htmlFor: 'cal-claim' }, 'Evidence-based claim'),
            h('textarea', {
              id: 'cal-claim',
              rows: 3,
              value: d.claim || '',
              placeholder: compareA.label + ' and ' + compareB.label + ' differ because the marker evidence shows...',
              onChange: function (event) { patch({ claim: event.target.value, comparisonViewed: true }); }
            }),
            h('p', { className: 'cal-map-note' }, 'Strong claim pattern: identify the difference, cite a marker value, and name one limitation of the teaching model. RNA abundance does not directly measure final protein abundance or activity.')),
          h('div', { className: 'cal-actions', style: { marginTop: '12px' } },
            h('button', { type: 'button', className: 'cal-secondary', onClick: function () { openConnected('dnaLab', 'dnaLab', { tab: 'translate', _cellAtlasGene: tissue.crossGene }, 'DNA Lab translation pathway'); } }, 'DNA to protein \u2192'),
            h('button', { type: 'button', className: 'cal-secondary', onClick: function () { openConnected('anatomy', 'anatomy', { _activeTab: 'explore' }, 'Human Anatomy Explorer'); } }, 'Zoom out to anatomy \u2192'))
        );
      }

      function answerMystery(id) {
        var correct = id === challenge.answer;
        var completed = Object.assign({}, d.completedChallenges || {});
        if (correct) completed[tissue.id + ':' + challenge.id] = true;
        patch({ mysteryAnswer: id, completedChallenges: completed });
        announce(correct ? 'Correct. The marker pattern supports ' + localCellById(id).label + '.' : 'Not yet. Compare the strongest marker with the evidence table.');
      }

      function renderMystery() {
        var selectedAnswer = d.mysteryAnswer || '';
        var isCorrect = selectedAnswer === challenge.answer;
        var ranking = localClassifyExpression(challenge.profile);
        return h('section', { className: 'cal-mystery', 'aria-labelledby': 'cal-mystery-title' },
          h('div', { className: 'cal-card' },
            h('p', { className: 'cal-kicker' }, 'Mystery ' + (challengeIndex + 1) + ' of ' + CHALLENGES.length),
            h('h3', { id: 'cal-mystery-title' }, challenge.title),
            h('p', { className: 'cal-card-intro' }, challenge.prompt),
            GENES.map(function (gene) { return renderBar(gene, challenge.profile[gene.id], '#7c3aed'); }),
            h('p', { className: 'cal-map-note' }, 'The bars summarize a curated teaching profile. A real analysis would consider many more genes, cells, quality checks, and possible batch effects.')),
          h('div', { className: 'cal-question' },
            h('h3', null, 'Which cell identity is best supported?'),
            h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Mystery cell answer choices' },
              CELL_TYPES.map(function (cell) {
                return h('button', { key: cell.id, type: 'button', className: 'cal-choice', 'aria-pressed': selectedAnswer === cell.id ? 'true' : 'false', onClick: function () { answerMystery(cell.id); } }, cell.label, h('span', { style: { display: 'block', marginTop: '3px', color: '#627d98', fontSize: '9px' } }, 'marker ' + cell.marker));
              })),
            selectedAnswer && h('div', { className: 'cal-feedback', 'data-correct': isCorrect ? 'true' : 'false', role: 'status' },
              isCorrect
                ? 'Supported: ' + localCellById(challenge.answer).label + '. The strongest marker matches ' + localCellById(challenge.answer).marker + '.'
                : 'Try again. Your choice uses ' + localCellById(selectedAnswer).marker + ', but the strongest displayed evidence points to ' + localGeneById(localCellById(ranking[0].id).marker).id + '.'),
            selectedAnswer && h('p', { className: 'cal-map-note' }, 'Pattern-matching model top result: ' + ranking[0].label + ' (' + Math.round(ranking[0].score * 100) + '% similarity). A similarity score is guidance, not proof.'),
            h('div', { className: 'cal-actions', style: { marginTop: '12px' } },
              h('button', { type: 'button', className: 'cal-primary', disabled: !isCorrect, onClick: function () { patch({ challengeIndex: (challengeIndex + 1) % CHALLENGES.length, mysteryAnswer: '' }); } }, challengeIndex === CHALLENGES.length - 1 ? 'Cycle to first mystery' : 'Next mystery'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { patch({ view: 'compare', compareA: ranking[0].id, compareB: selectedAnswer || tissue.defaultCompare, comparisonViewed: true }); } }, 'Compare evidence')))
        );
      }

      function updateStudyDesign(field, value) {
        var nextDesign = Object.assign({}, studyDesign);
        nextDesign[field] = value;
        patch({ studyDesign: nextDesign, designChanged: true });
        announce('Study design updated: ' + field + '.');
      }

      function answerDesignCase(answerId) {
        var correct = answerId === designCase.answer;
        var completed = Object.assign({}, d.completedDesignCases || {});
        if (correct) completed[designCase.id] = true;
        patch({ designAnswer: answerId, completedDesignCases: completed });
        announce(correct ? 'Quality-control diagnosis supported.' : 'That response goes beyond or does not address the evidence.');
      }

      function renderDesignStudio() {
        var selectedAnswer = d.designAnswer || '';
        var correct = selectedAnswer === designCase.answer;
        function designPacket() {
          var decisions = DESIGN_FIELDS.map(function (field) {
            var selected = field.options.filter(function (option) { return option.value === studyDesign[field.id]; })[0] || field.options[0];
            return field.label + ': ' + selected.label + ' — ' + selected.note;
          }).join('\n');
          var dimensions = designEvaluation.dimensions.map(function (dimension) { return dimension.label + ': ' + dimension.level + ' — ' + dimension.reason; }).join('\n');
          return [
            'Cell Atlas study-design packet',
            'Tissue context: ' + tissue.label,
            'Selected decisions:',
            decisions,
            'Qualitative rubric emphasis: ' + designEvaluation.priority,
            'Rubric dimensions:',
            dimensions,
            'Resource complexity: ' + designEvaluation.complexity,
            'QC cases diagnosed: ' + completedDesignCount + '/' + DESIGN_CASES.length,
            'Boundary: these are teaching heuristics, not power calculations, budgets, ethics approval, or a prespecified real-world analysis plan.'
          ].join('\n');
        }
        function copyDesignPacket() {
          var report = designPacket();
          if (!navigator.clipboard || !navigator.clipboard.writeText) { patch({ designPacketStatus: 'unavailable' }); return; }
          navigator.clipboard.writeText(report).then(function () { patch({ designPacketStatus: 'copied' }); }).catch(function () { patch({ designPacketStatus: 'failed' }); });
        }
        function designArtifact() {
          return buildExportArtifact('study-design', 'Cell Atlas study-design packet', designPacket(), {
            context: { tissueId: tissue.id, tissueLabel: tissue.label, view: view, studyQuestion: studyDesign.question },
            fields: { studyDesign: Object.assign({}, studyDesign), completedQcCases: completedDesignCount, totalQcCases: DESIGN_CASES.length, rubric: designEvaluation }
          });
        }
        function downloadDesignPacket(format) {
          var downloaded = downloadArtifact('cell-atlas-study-design', designArtifact(), format);
          var status = downloaded ? (format === 'json' ? 'downloaded-json' : 'downloaded') : 'download-failed';
          var nextPatch = { designPacketStatus: status };
          if (downloaded) nextPatch.exportedArtifacts = recordArtifactExport('study-design', format);
          patch(nextPatch);
        }        return h('section', { className: 'cal-design', 'aria-labelledby': 'cal-design-title' },
          h('div', { className: 'cal-card' },
            h('p', { className: 'cal-kicker' }, 'Experimental design studio'),
            h('h3', { id: 'cal-design-title' }, 'Design a cell-atlas study'),
            h('p', { className: 'cal-card-intro' }, 'Change one decision at a time and explain the tradeoff. The ratings are qualitative teaching heuristics—not budgets, power calculations, or predictions for a real protocol.'),
            h('div', { className: 'cal-design-controls' },
              DESIGN_FIELDS.map(function (field) {
                var selected = field.options.filter(function (option) { return option.value === studyDesign[field.id]; })[0] || field.options[0];
                return h('div', { key: field.id, className: 'cal-design-control' },
                  h('label', { htmlFor: 'cal-design-' + field.id }, field.label),
                  h('select', { id: 'cal-design-' + field.id, value: selected.value, onChange: function (event) { updateStudyDesign(field.id, event.target.value); } },
                    field.options.map(function (option) { return h('option', { key: option.value, value: option.value }, option.label); })),
                  h('p', null, selected.note));
              }))),
          h('div', { className: 'cal-card' },
            h('p', { className: 'cal-kicker' }, 'Qualitative rubric'),
            h('h3', null, 'What this design emphasizes'),
            h('p', { className: 'cal-card-intro' }, designEvaluation.priority),
            h('div', { className: 'cal-rubric' },
              designEvaluation.dimensions.map(function (dimension) {
                return h('article', { key: dimension.id, className: 'cal-rubric-card' },
                  h('b', null, dimension.label),
                  h('span', { className: 'cal-level', 'data-level': dimension.level }, dimension.level),
                  h('p', null, dimension.reason));
              })),
            h('div', { className: 'cal-complexity' },
              h('span', null, h('strong', null, 'Coordination + resource complexity: '), designEvaluation.complexity),
              h('span', null, 'No configuration removes every bias.'))),
          h('div', { className: 'cal-card cal-boundary' },
            h('h3', null, 'Model boundary'),
            h('p', { className: 'cal-job' }, 'These categories only make tradeoffs visible. A real design requires tissue-specific pilot data, statistical power analysis, ethics and consent review, technical expertise, cost estimates, and a prespecified analysis plan. More samples do not automatically repair biased sampling or confounded batches.')),
          h('div', { className: 'cal-case-grid' },
            h('div', { className: 'cal-card' },
              h('p', { className: 'cal-kicker' }, 'Quality-control case ' + (designCaseIndex + 1) + ' of ' + DESIGN_CASES.length),
              h('h3', null, designCase.title),
              h('p', { className: 'cal-case-signal' }, designCase.signal),
              h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Quality-control response choices' },
                designCase.choices.map(function (choice) {
                  return h('button', { key: choice.id, type: 'button', className: 'cal-choice', 'aria-pressed': selectedAnswer === choice.id ? 'true' : 'false', onClick: function () { answerDesignCase(choice.id); } }, choice.label);
                })),
              selectedAnswer && h('div', { className: 'cal-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
                correct ? designCase.explanation : 'Reconsider what alternative explanation or quality check best addresses the observed signal.'),
              h('div', { className: 'cal-actions', style: { marginTop: '11px' } },
                h('button', {
                  type: 'button',
                  className: 'cal-primary',
                  disabled: !correct,
                  onClick: function () { patch({ designCaseIndex: (designCaseIndex + 1) % DESIGN_CASES.length, designAnswer: '' }); }
                }, designCaseIndex === DESIGN_CASES.length - 1 ? 'Cycle to first case' : 'Next QC case'))),
            h('aside', { className: 'cal-card' },
              h('p', { className: 'cal-kicker' }, 'Design literacy progress'),
              h('h3', null, completedDesignCount + '/' + DESIGN_CASES.length + ' cases diagnosed'),
              h('ul', { className: 'cal-source-list' },
                h('li', null, 'Separate biological absence from failed recovery.'),
                h('li', null, 'Check mixed profiles for doublets before naming new types.'),
                h('li', null, 'Use metadata to detect batch structure.'),
                h('li', null, 'Use panels and replicated cells—not one zero or one marker.')),
              h('p', { className: 'cal-map-note' }, 'The aim is not to memorize one correction. It is to ask what else could produce the observation.'),
              h('div', { className: 'cal-actions', style: { marginTop: '10px' } },
                h('button', { type: 'button', className: 'cal-secondary', onClick: copyDesignPacket }, 'Copy study plan packet'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadDesignPacket('md'); }, 'aria-label': 'Download cell-atlas-study-design.md' }, 'Download plan (.md)'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadDesignPacket('json'); }, 'aria-label': 'Download cell-atlas-study-design.json' }, 'Download plan (.json)'),
              d.designPacketStatus === 'downloaded' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded cell-atlas-study-design.md.'),
              d.designPacketStatus === 'downloaded-json' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded cell-atlas-study-design.json.'),
                d.designPacketStatus === 'copied' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copied a sequence-free study plan packet.'),
                d.designPacketStatus === 'unavailable' && h('span', { className: 'cal-map-note', role: 'status' }, 'Clipboard unavailable; select the study plan text manually.'),
                d.designPacketStatus === 'failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copy failed; select the study plan text manually.'),
                d.designPacketStatus === 'download-failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Download unavailable; select the study plan text manually.'))))
        );
      }

      function updateNotebook(field, value) {
        var allNotes = Object.assign({}, d.crossNotebook || {});
        allNotes[systemLens.id] = Object.assign({}, allNotes[systemLens.id] || {});
        allNotes[systemLens.id][field] = value;
        patch({ crossNotebook: allNotes, crossTissueCompared: true });
      }

      function renderCrossTissue() {
        var cautionAnswer = d.cautionAnswer || '';
        var cautious = cautionAnswer === 'cautious';
        function crossTissuePacket() {
          var members = systemLens.members.map(function (member) {
            var memberTissue = tissueById(member.tissueId);
            var memberCell = cellById(member.cellId, member.tissueId);
            return memberTissue.label + ' / ' + memberCell.label + ' / ' + memberCell.marker + ' evidence ' + memberCell.evidence[memberCell.marker] + '/100';
          }).join('\n');
          var sourceContexts = systemLens.members.map(function (member) {
            var source = tissueById(member.tissueId).source;
            return source.project + ' | ' + (source.hcaId || source.title) + ' | ' + source.license;
          }).join('\n');
          return [
            'Cell Atlas cross-tissue CER packet',
            'Lens: ' + systemLens.title,
            'Question: ' + systemLens.question,
            'Displayed members:',
            members,
            'Source contexts:',
            sourceContexts,
            'Conserved problem: ' + systemLens.conserved,
            'Claim: ' + (notebook.claim || 'not recorded'),
            'Evidence: ' + (notebook.evidence || 'not recorded'),
            'Reasoning + limitation: ' + (notebook.reasoning || 'not recorded'),
            'Caution checkpoint: ' + (cautionAnswer || 'not answered'),
            'Boundary: these are curated teaching profiles with attributed source context, not pooled cross-study statistics. Related support jobs can motivate comparison, but this model cannot prove shared identity, developmental lineage, or mechanism.'
          ].join('\n');
        }
        function copyCrossTissuePacket() {
          var report = crossTissuePacket();
          if (!navigator.clipboard || !navigator.clipboard.writeText) { patch({ crossTissuePacketStatus: 'unavailable' }); return; }
          navigator.clipboard.writeText(report).then(function () { patch({ crossTissuePacketStatus: 'copied' }); }).catch(function () { patch({ crossTissuePacketStatus: 'failed' }); });
        }
        function crossTissueArtifact() {
          return buildExportArtifact('cross-tissue-cer', 'Cell Atlas cross-tissue CER packet', crossTissuePacket(), {
            context: { tissueId: 'multi-tissue', tissueLabel: 'Pancreas, Lung, Brain', view: view, lens: systemLens.id },
            provenance: { sources: systemLens.members.map(function (member) {
              var memberTissue = tissueById(member.tissueId);
              return { tissue: memberTissue.label, project: memberTissue.source.project, hcaId: memberTissue.source.hcaId, hcaUrl: memberTissue.source.hcaUrl, license: memberTissue.source.license };
            }) },
            fields: { lens: systemLens.id, claim: notebook.claim || '', evidence: notebook.evidence || '', reasoning: notebook.reasoning || '', caution: cautionAnswer || '' }
          });
        }
        function downloadCrossTissuePacket(format) {
          var downloaded = downloadArtifact('cell-atlas-cross-tissue-cer', crossTissueArtifact(), format);
          var status = downloaded ? (format === 'json' ? 'downloaded-json' : 'downloaded') : 'download-failed';
          var nextPatch = { crossTissuePacketStatus: status };
          if (downloaded) nextPatch.exportedArtifacts = recordArtifactExport('cross-tissue-cer', format);
          patch(nextPatch);
        }
        return h('section', { className: 'cal-cross', 'aria-labelledby': 'cal-cross-title' },
          h('div', { className: 'cal-card' },
            h('p', { className: 'cal-kicker' }, 'Across organs'),
            h('h3', { id: 'cal-cross-title' }, 'Cross-tissue evidence studio'),
            h('p', { className: 'cal-card-intro' }, 'Compare a shared biological problem across three organs. Similar jobs can use related or different molecular programs; functional analogy is not automatically shared lineage.'),
            h('div', { className: 'cal-lens-tabs', role: 'group', 'aria-label': 'Cross-tissue systems lens' },
              CROSS_TISSUE_LENSES.map(function (lens) {
                return h('button', {
                  key: lens.id,
                  type: 'button',
                  className: 'cal-pill',
                  'aria-pressed': systemLens.id === lens.id ? 'true' : 'false',
                  onClick: function () { patch({ systemLens: lens.id, crossTissueCompared: true }); announce(lens.title + ' comparison opened.'); }
                }, lens.title);
              })),
            h('h4', { style: { marginTop: '14px' } }, systemLens.question),
            h('div', { className: 'cal-cross-grid', style: { marginTop: '10px' } },
              systemLens.members.map(function (member) {
                var memberTissue = tissueById(member.tissueId);
                var memberCell = cellById(member.cellId, member.tissueId);
                var strength = memberCell.evidence[memberCell.marker];
                return h('article', { key: member.tissueId, className: 'cal-cross-card' },
                  h('p', { className: 'cal-kicker' }, memberTissue.label),
                  h('h4', null, memberCell.label),
                  h('span', { className: 'cal-marker', style: { background: memberCell.color } }, memberCell.marker + ' evidence ' + strength + '/100'),
                  h('p', { className: 'cal-job' }, memberCell.job),
                  h('p', { className: 'cal-cross-link' }, member.connection),
                  h('p', { className: 'cal-cross-link' }, 'Source: ' + memberTissue.source.project),
                  memberTissue.source.hcaUrl && h('a', { className: 'cal-cross-link', href: memberTissue.source.hcaUrl, target: '_blank', rel: 'noopener', 'aria-label': 'Open ' + memberTissue.source.hcaId + ' source context' }, 'Open ' + memberTissue.source.hcaId + ' source context'));
              }))),
          h('div', { className: 'cal-conserved' },
            h('div', { className: 'cal-card' }, h('p', { className: 'cal-kicker' }, 'Pattern that carries across'), h('h3', null, 'Conserved problem'), h('p', { className: 'cal-job' }, systemLens.conserved)),
            h('div', { className: 'cal-card cal-boundary' }, h('p', { className: 'cal-kicker' }, 'Do not overclaim'), h('h3', null, 'Comparison boundary'), h('p', { className: 'cal-job' }, systemLens.caution))),
          h('div', { className: 'cal-card' },
            h('p', { className: 'cal-kicker' }, 'Scientific notebook'),
            h('h3', null, 'Build a claim–evidence–reasoning argument'),
            h('p', { className: 'cal-card-intro' }, 'Write in your own words. Evidence should name at least two displayed marker genes; reasoning should explain why those observations support—but do not prove—your claim.'),
            h('div', { className: 'cal-cer' },
              h('div', { className: 'cal-field' },
                h('label', { htmlFor: 'cal-cer-claim' }, 'Claim'),
                h('textarea', { id: 'cal-cer-claim', rows: 5, value: notebook.claim || '', placeholder: 'Across these tissues, the cells...', onChange: function (event) { updateNotebook('claim', event.target.value); } })),
              h('div', { className: 'cal-field' },
                h('label', { htmlFor: 'cal-cer-evidence' }, 'Evidence'),
                h('textarea', { id: 'cal-cer-evidence', rows: 5, value: notebook.evidence || '', placeholder: 'In the teaching panels, [marker] is... while [marker] is...', onChange: function (event) { updateNotebook('evidence', event.target.value); } })),
              h('div', { className: 'cal-field' },
                h('label', { htmlFor: 'cal-cer-reasoning' }, 'Reasoning + limitation'),
                h('textarea', { id: 'cal-cer-reasoning', rows: 5, value: notebook.reasoning || '', placeholder: 'This supports the claim because... However, the model cannot show...', onChange: function (event) { updateNotebook('reasoning', event.target.value); } }))),
            h('div', { className: 'cal-checks', role: 'status', 'aria-label': 'Notebook completion checks' },
              h('span', { className: 'cal-check', 'data-done': notebookState.claim ? 'true' : 'false' }, notebookState.claim ? '\u2713 specific claim' : 'claim needs more detail'),
              h('span', { className: 'cal-check', 'data-done': notebookState.evidence ? 'true' : 'false' }, notebookState.evidence ? '\u2713 two markers cited' : notebookState.markerHits + '/2 markers cited'),
              h('span', { className: 'cal-check', 'data-done': notebookState.reasoning ? 'true' : 'false' }, notebookState.reasoning ? '\u2713 reasoning developed' : 'reasoning needs more detail')),
            h('div', { className: 'cal-actions', style: { marginTop: '10px' } },
              h('button', { type: 'button', className: 'cal-secondary', onClick: copyCrossTissuePacket }, 'Copy cross-tissue CER packet'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadCrossTissuePacket('md'); }, 'aria-label': 'Download cell-atlas-cross-tissue-cer.md' }, 'Download CER packet (.md)'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadCrossTissuePacket('json'); }, 'aria-label': 'Download cell-atlas-cross-tissue-cer.json' }, 'Download CER packet (.json)'),
              d.crossTissuePacketStatus === 'copied' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copied a sequence-free CER packet.'),
              d.crossTissuePacketStatus === 'downloaded' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded cell-atlas-cross-tissue-cer.md.'),
              d.crossTissuePacketStatus === 'downloaded-json' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded cell-atlas-cross-tissue-cer.json.'),
              d.crossTissuePacketStatus === 'unavailable' && h('span', { className: 'cal-map-note', role: 'status' }, 'Clipboard unavailable; select the CER text manually.'),
              d.crossTissuePacketStatus === 'failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copy failed; select the CER text manually.'),
              d.crossTissuePacketStatus === 'download-failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Download unavailable; select the CER text manually.'))),
          h('div', { className: 'cal-card cal-caution' },
            h('p', { className: 'cal-kicker' }, 'Caution checkpoint'),
            h('h3', null, 'Which conclusion is scientifically defensible?'),
            h('div', { className: 'cal-choice-grid', role: 'group', 'aria-label': 'Cautious conclusion choices' },
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': cautionAnswer === 'marker' ? 'true' : 'false', onClick: function () { patch({ cautionAnswer: 'marker' }); } }, 'One shared marker always proves two cells are the same type.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': cautionAnswer === 'lineage' ? 'true' : 'false', onClick: function () { patch({ cautionAnswer: 'lineage' }); } }, 'Cells with similar support jobs must share the same developmental lineage.'),
              h('button', { type: 'button', className: 'cal-choice', 'aria-pressed': cautionAnswer === 'cautious' ? 'true' : 'false', onClick: function () { patch({ cautionAnswer: 'cautious', crossTissueCompared: true }); } }, 'Marker panels can support a functional comparison, but this model alone cannot prove identity or lineage.')),
            cautionAnswer && h('div', { className: 'cal-feedback', 'data-correct': cautious ? 'true' : 'false', role: 'status' },
              cautious ? 'Defensible: the conclusion matches the evidence and names what the model cannot establish.' : 'That conclusion goes beyond the displayed evidence. Look for the option that separates support from proof.'))
        );
      }

      function cellAtlasReviewItems() {
        var routeScore = routeDoneCount >= routeSteps.length ? 4 : routeDoneCount >= 3 ? 3 : routeDoneCount >= 1 ? 2 : 1;
        var claimScore = reasoningComplete ? 4 : notebookState.claim && notebookState.evidence ? 3 : notebookState.claim ? 2 : 1;
        var provenanceScore = packetImportStatus === 'imported' ? (packetImportProvenance === 'verified' ? 4 : packetImportProvenance === 'review' ? 2 : 1) : (SOURCE && SOURCE.hcaId ? 3 : 1);
        var packetScore = exportedArtifactCount >= 1 ? 4 : packetImportStatus === 'imported' ? 2 : 1;
        return [
          { label: 'Evidence route', score: routeScore, detail: routeDoneCount + '/' + routeSteps.length + ' milestones completed; use the route as a learning signal, not a grade.', nextMove: routeScore >= 4 ? 'Maintain: revisit the route when you package or present the work.' : (nextRouteStep ? 'Open ' + nextRouteStep.action + ': ' + nextRouteStep.detail : 'Complete the next route milestone before sharing.') },
          { label: 'Claim + limitation', score: claimScore, detail: reasoningComplete ? 'A complete CER includes a specific claim, two marker references, reasoning, and a cautious limitation.' : 'Look for a specific claim, two marker references, reasoning, and a cautious limitation.', nextMove: reasoningComplete ? 'Maintain: keep the claim tied to two marker references and a stated limit.' : 'Revise: state one claim, cite two marker references, explain the reasoning, and name one limitation.' },
          { label: 'Source provenance', score: provenanceScore, detail: packetImportStatus === 'imported' ? (packetImportSourceSummary || 'Imported source context needs review.') : 'Current atlas view is tied to the displayed HCA source record.', nextMove: provenanceScore >= 4 ? 'Maintain: carry the recognized HCA record into the next packet.' : packetImportStatus === 'imported' ? 'Review: compare the packet source record with the current pinned HCA source before sharing.' : 'Add: include the pinned HCA source ID in the packet before sharing.' },
          { label: 'Portfolio evidence', score: packetScore, detail: exportedArtifactCount >= 1 ? exportedArtifactCount + ' local packet type(s) saved.' : packetImportStatus === 'imported' ? 'Packet resumed; save a local copy after review.' : 'Save an auditable packet after revising the work.', nextMove: packetScore >= 4 ? 'Maintain: keep the local packet with its route and feedback.' : 'Save: export a JSON packet after revising the evidence.' }
        ];
      }
      function cellAtlasReviewNextMove(items) {
        return items.slice().sort(function (a, b) { return a.score - b.score || a.label.localeCompare(b.label); })[0] || null;
      }
      function cellAtlasLearnerReflection() {
        var reflection = d.cellAtlasLearnerSelfCheck && typeof d.cellAtlasLearnerSelfCheck === 'object' ? d.cellAtlasLearnerSelfCheck : {};
        var confidence = ['uncertain', 'developing', 'confident'].indexOf(String(reflection.confidence || '')) >= 0 ? String(reflection.confidence) : '';
        return { confidence: confidence, strongestEvidence: portfolioSafeText(reflection.strongestEvidence, 'not recorded'), uncertainty: portfolioSafeText(reflection.uncertainty, 'not recorded') };
      }
      function cellAtlasEvidenceMap() {
        return {
          claim: portfolioSafeText(notebook.claim, 'not recorded'),
          evidence: portfolioSafeText(notebook.evidence, 'not recorded'),
          reasoning: portfolioSafeText(notebook.reasoning, 'not recorded'),
          limitation: d.cautionAnswer === 'cautious' ? 'Cautious checkpoint selected: support is not proof of identity or lineage.' : 'Caution checkpoint not completed.',
          markers: systemLens.members.slice(0, 8).map(function (member) { var memberCell = cellById(member.cellId, member.tissueId); return memberCell.label + ' / ' + memberCell.marker; })
        };
      }
      function portfolioSourceRecords() {
        var records = [];
        var seen = {};
        function add(source, tissueLabel) {
          if (!source) return;
          var key = String(source.hcaId || source.project || source.hcaUrl || tissueLabel || 'source');
          if (seen[key]) return;
          seen[key] = true;
          records.push({ tissue: portfolioSafeText(tissueLabel, tissue.label), project: portfolioSafeText(source.project, 'HCA source'), hcaId: portfolioSafeText(source.hcaId, ''), hcaUrl: portfolioSafeText(source.hcaUrl, ''), license: portfolioSafeText(source.license, '') });
        }
        add(SOURCE, tissue.label);
        systemLens.members.forEach(function (member) { var memberTissue = tissueById(member.tissueId); add(memberTissue.source, memberTissue.label); });
        return records.slice(0, 8);
      }
      function cellAtlasPortfolioDelta(latest, previous) {
        if (!latest) return { direction: 'neutral', label: 'No saved attempts yet.', detail: 'Save an attempt after reviewing this work to begin a revision history.' };
        if (!previous) return { direction: 'neutral', label: 'First saved attempt.', detail: 'This snapshot is the baseline for a future revision comparison.' };
        var delta = Number(latest.total || 0) - Number(previous.total || 0);
        var direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
        var label = delta > 0 ? '+' + delta + ' rubric points' : delta < 0 ? delta + ' rubric points' : 'No rubric change';
        return { direction: direction, label: label, detail: 'Compared with the previous saved attempt; review the evidence map and feedback before interpreting the change.' };
      }
      function cellAtlasPortfolioSnapshot() {
        var items = cellAtlasReviewItems();
        var total = items.reduce(function (sum, item) { return sum + item.score; }, 0);
        var nextMove = cellAtlasReviewNextMove(items);
        var previousTotal = portfolioLatest ? Number(portfolioLatest.total || 0) : null;
        return {
          schemaVersion: PORTFOLIO_SCHEMA_VERSION,
          id: 'attempt-' + Date.now().toString(36) + '-' + (portfolioAttempts.length + 1),
          createdAt: new Date().toISOString(),
          tissue: { id: tissue.id, label: tissue.label, lens: systemLens.id },
          rubric: items.map(function (item) { return { label: item.label, score: item.score, detail: item.detail, nextMove: item.nextMove }; }),
          total: total,
          route: { completedCount: routeDoneCount, total: routeSteps.length },
          nextMove: { label: nextMove ? nextMove.label : 'Review evidence', action: nextMove ? nextMove.nextMove : 'Review the learner work with a teacher.' },
          evidenceMap: cellAtlasEvidenceMap(),
          provenance: { sources: portfolioSourceRecords() },
          reflection: cellAtlasLearnerReflection(),
          teacherFeedback: portfolioSafeText(d.cellAtlasTeacherNote, 'not recorded'),
          revision: { previousAttemptId: portfolioLatest ? portfolioLatest.id : '', scoreDelta: previousTotal == null ? 0 : total - previousTotal },
          boundary: 'Local, sequence-free learning record; not a raw donor dataset, clinical interpretation, or automatic grade.'
        };
      }
      function cellAtlasPortfolioPacket(snapshot) {
        var map = snapshot.evidenceMap || {};
        var rubric = (snapshot.rubric || []).map(function (item) { return item.label + ': ' + item.score + '/4 - ' + item.detail + ' Next move: ' + item.nextMove; }).join('\n');
        var sources = snapshot.provenance && Array.isArray(snapshot.provenance.sources) ? snapshot.provenance.sources.map(function (source) { return source.tissue + ' | ' + source.project + ' | ' + (source.hcaId || 'HCA source'); }).join('\n') : 'not recorded';
        return [
          'Cell Atlas teacher review portfolio snapshot',
          'Attempt: ' + snapshot.id,
          'Created: ' + snapshot.createdAt,
          'Tissue + lens: ' + snapshot.tissue.label + ' / ' + snapshot.tissue.lens,
          'Draft rubric suggestion: ' + snapshot.total + '/16 (not an automatic grade)',
          'Revision delta: ' + (snapshot.revision && snapshot.revision.scoreDelta > 0 ? '+' : '') + (snapshot.revision ? snapshot.revision.scoreDelta : 0) + ' points',
          'Route: ' + snapshot.route.completedCount + '/' + snapshot.route.total + ' milestones',
          'Best next move: ' + snapshot.nextMove.label + ' - ' + snapshot.nextMove.action,
          'Rubric:', rubric,
          'Claim: ' + map.claim,
          'Evidence: ' + map.evidence,
          'Reasoning: ' + map.reasoning,
          'Limitation: ' + map.limitation,
          'Marker anchors: ' + (Array.isArray(map.markers) ? map.markers.join('; ') : 'not recorded'),
          'Source records:', sources,
          'Learner confidence: ' + ((snapshot.reflection && snapshot.reflection.confidence) || 'not recorded'),
          'Strongest evidence reflection: ' + ((snapshot.reflection && snapshot.reflection.strongestEvidence) || 'not recorded'),
          'Remaining uncertainty reflection: ' + ((snapshot.reflection && snapshot.reflection.uncertainty) || 'not recorded'),
          'Teacher feedback: ' + snapshot.teacherFeedback,
          'Boundary: ' + snapshot.boundary
        ].join('\n');
      }
      function cellAtlasPortfolioArtifact(snapshot) {
        return buildExportArtifact('teacher-review-portfolio', 'Cell Atlas teacher review portfolio snapshot', cellAtlasPortfolioPacket(snapshot), {
          context: { tissueId: snapshot.tissue.id, tissueLabel: snapshot.tissue.label, view: 'source', lens: snapshot.tissue.lens },
          provenance: { sources: snapshot.provenance.sources },
          fields: { portfolioAttempt: snapshot }
        });
      }
      function persistCellAtlasPortfolioAttempt(snapshot, status, format) {
        var attempts = portfolioAttempts.concat(snapshot).slice(-8);
        var nextPatch = { cellAtlasPortfolio: { schemaVersion: PORTFOLIO_SCHEMA_VERSION, activeAttemptId: snapshot.id, attempts: attempts }, cellAtlasPortfolioStatus: status || 'saved', cellAtlasPortfolioLabel: 'Attempt ' + attempts.length + ' of 8 retained.' };
        if (format) nextPatch.exportedArtifacts = recordArtifactExport('teacher-review-portfolio', format);
        patch(nextPatch);
      }
      function saveCellAtlasPortfolioAttempt() {
        var snapshot = cellAtlasPortfolioSnapshot();
        persistCellAtlasPortfolioAttempt(snapshot, 'saved');
        announce('Saved Cell Atlas revision attempt ' + snapshot.id + '.');
      }
      function downloadCellAtlasPortfolio(format) {
        var snapshot = cellAtlasPortfolioSnapshot();
        var downloaded = downloadArtifact('cell-atlas-teacher-review-' + snapshot.id, cellAtlasPortfolioArtifact(snapshot), format);
        if (downloaded) {
          persistCellAtlasPortfolioAttempt(snapshot, 'downloaded', format);
          announce('Downloaded and saved Cell Atlas revision attempt.');
        } else {
          patch({ cellAtlasPortfolioStatus: 'download-failed' });
        }
      }
      function cellAtlasTeacherPacket() {
        var items = cellAtlasReviewItems();
        var total = items.reduce(function (sum, item) { return sum + item.score; }, 0);
        var nextMove = cellAtlasReviewNextMove(items);
        return [
          'Cell Atlas teacher review snapshot',
          'Tissue: ' + tissue.label,
          'Draft rubric suggestion: ' + total + '/16 (not an automatic grade)',
          'Evidence route: ' + routeDoneCount + '/' + routeSteps.length + ' milestones',
          'Source context: ' + (packetImportSourceSummary || SOURCE.project + ' | HCA ' + SOURCE.hcaId),
          'Next recommended step: ' + (nextRouteStep ? nextRouteStep.label : 'Core route complete'),
          'Best next move: ' + (nextMove ? nextMove.label + ' - ' + nextMove.nextMove : 'none recorded'),
          items.map(function (item) { return item.label + ': ' + item.score + '/4 - ' + item.detail + ' Next move: ' + item.nextMove; }).join('\n'),
          'Teacher feedback: ' + reviewText(d.cellAtlasTeacherNote, 'not recorded'),
          'Boundary: draft review aid only. No raw donor rows, sequences, clinical data, or automatic grade inference.'
        ].join('\n');
      }
      function copyCellAtlasTeacherReview() {
        var report = cellAtlasTeacherPacket();
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) { patch({ cellAtlasTeacherReviewStatus: 'unavailable' }); return; }
        navigator.clipboard.writeText(report).then(function () { patch({ cellAtlasTeacherReviewStatus: 'copied' }); }).catch(function () { patch({ cellAtlasTeacherReviewStatus: 'failed' }); });
      }

      function renderSource() {
        var teacherReviewItems = cellAtlasReviewItems();
        var teacherReviewTotal = teacherReviewItems.reduce(function (sum, item) { return sum + item.score; }, 0);
        var teacherReviewNextMove = cellAtlasReviewNextMove(teacherReviewItems);
        var teacherEvidenceMap = cellAtlasEvidenceMap();
        var teacherPortfolioDelta = cellAtlasPortfolioDelta(portfolioLatest, portfolioPrevious);
        return h('div', { className: 'cal-source-grid' },
          h('section', { className: 'cal-card cal-methods', 'aria-labelledby': 'cal-pipeline-title' },
            h('p', { className: 'cal-kicker' }, 'From specimen to atlas'),
            h('h3', { id: 'cal-pipeline-title' }, 'How an expression atlas is built'),
            h('p', { className: 'cal-card-intro' }, 'An atlas is a chain of measurements and decisions. Open each step mentally as a place where evidence can strengthen—or uncertainty can enter.'),
            h('div', { className: 'cal-pipeline' }, ATLAS_PIPELINE.map(function (stage) {
              return h('article', { key: stage.id, className: 'cal-stage' }, h('b', null, stage.label), h('p', null, stage.action), h('small', null, 'Uncertainty: ' + stage.uncertainty));
            })),
            h('div', { className: 'cal-callout' }, h('strong', null, tissue.label + ' method context: '), SOURCE.methodNote),
            h('div', { className: 'cal-links' },
              h('a', { href: DESIGN_METHOD_URL, target: '_blank', rel: 'noopener' }, 'HCA protocol benchmarking study'),
              h('a', { href: CONTROLLED_DATA_URL, target: '_blank', rel: 'noopener' }, 'Open vs managed data access'))),
          tissue.id === 'pancreas' && realSnapshot && h('section', { className: 'cal-card cal-methods', 'aria-labelledby': 'cal-real-source-title' },
            h('p', { className: 'cal-kicker' }, 'Reproducible offline bridge'),
            h('h3', { id: 'cal-real-source-title' }, realSnapshot.title),
            h('p', { className: 'cal-card-intro' }, 'This bundled artifact is computed from the pinned public H5AD. It contains aggregate counts and marker summaries only—no cell rows, donor identifiers, or sequences.'),
            h('div', { className: 'cal-real-meta' },
              h('div', null, h('b', null, realSnapshot.source.primaryCellCount), h('span', null, 'primary cells in source')),
              h('div', null, h('b', null, mappedSnapshotCellCount(realSnapshot)), h('span', null, 'mapped to lesson identities')),
              h('div', null, h('b', null, realSnapshot.source.featureCount), h('span', null, 'features in source matrix')),
              h('div', null, h('b', null, realSnapshot.source.schemaVersion), h('span', null, 'CELLxGENE schema'))),
            h('ul', { className: 'cal-source-list' },
              h('li', null, 'Metric 1: raw detection frequency—percent of cells with count greater than zero.'),
              h('li', null, 'Metric 2: mean raw count relative to the largest displayed cell-type mean for the same gene.'),
              h('li', null, 'Seven lesson identities map to source annotations; the broad immune identity is honestly marked unavailable.'),
              h('li', null, 'Generator: dev-tools/generate_cellatlas_real_snapshot.py')),
            h('code', { className: 'cal-provenance-code' }, realSnapshot.source.assetSha256),
            h('div', { className: 'cal-links' },
              h('a', { href: realSnapshot.source.assetUrl, target: '_blank', rel: 'noopener' }, 'Pinned H5AD asset'),
              h('a', { href: SOURCE.cellxgeneUrl, target: '_blank', rel: 'noopener' }, 'CELLxGENE collection'))),
          h('section', { className: 'cal-card', 'aria-labelledby': 'cal-source-title' },
            h('p', { className: 'cal-kicker' }, 'Open science provenance'),
            h('h3', { id: 'cal-source-title' }, SOURCE.title),
            h('ul', { className: 'cal-source-list' },
              h('li', null, SOURCE.project),
              h('li', null, SOURCE.organism + ', ' + SOURCE.tissue + ', ' + SOURCE.condition),
              h('li', null, SOURCE.sampleSummary || (SOURCE.donors + ' donors; HCA project estimate ' + SOURCE.estimatedCells + ' cells')),
              h('li', null, 'HCA source record ' + SOURCE.hcaId + '; approximately ' + SOURCE.estimatedCells),
              h('li', null, 'Downloaded/exported HCA data: ' + SOURCE.license)),
            h('div', { className: 'cal-links' },
              h('a', { href: SOURCE.hcaUrl, target: '_blank', rel: 'noopener' }, 'Open HCA source'),
              SOURCE.cellxgeneUrl && h('a', { href: SOURCE.cellxgeneUrl, target: '_blank', rel: 'noopener' }, 'Explore in CELLxGENE'),
              SOURCE.codeUrl && h('a', { href: SOURCE.codeUrl, target: '_blank', rel: 'noopener' }, 'Open atlas code'),
              h('a', { href: SOURCE.licenseUrl, target: '_blank', rel: 'noopener' }, 'Read data-use terms'))),
          h('section', { className: 'cal-card', 'aria-labelledby': 'cal-method-title' },
            h('p', { className: 'cal-kicker' }, 'Classroom transformation'),
            h('h3', { id: 'cal-method-title' }, 'What is real, curated, and illustrative?'),
            h('ul', { className: 'cal-source-list' },
              h('li', null, h('strong', null, 'Real source context: '), 'tissue, study, major cell identities, marker relationships, provenance, and licensing.'),
              h('li', null, h('strong', null, 'Curated teaching layer: '), 'a focused set of eight cell types and marker genes per tissue, short functional descriptions, and 0-100 evidence scores.'),
              h('li', null, h('strong', null, 'Illustrative layer: '), 'cluster coordinates and representative dots. They are not raw cells or a published UMAP.'),
              h('li', null, h('strong', null, 'Not included: '), 'donor-level demographics, personal identifiers, raw sequences, disease prediction, or clinical advice.'))),
          h('section', { className: 'cal-card cal-boundary', 'aria-labelledby': 'cal-limit-title' },
            h('h3', { id: 'cal-limit-title' }, 'Interpretation limits'),
            h('ul', { className: 'cal-source-list' },
              h('li', null, 'RNA abundance does not equal final protein abundance or activity.'),
              h('li', null, 'One marker alone can be misleading; real annotation uses multiple genes and expert review.'),
              h('li', null, 'Cluster distance is not physical distance inside the ' + tissue.label.toLowerCase() + '.'),
              h('li', null, 'Sampling, tissue processing, sequencing chemistry, and analysis choices can influence results.'))),
          h('section', { className: 'cal-card cal-teacher-review', 'aria-labelledby': 'cal-teacher-review-title' },
            h('p', { className: 'cal-kicker' }, 'Teacher review + portfolio'),
            h('h3', { id: 'cal-teacher-review-title' }, 'Draft review snapshot'),
            h('p', { className: 'cal-teacher-review-intro' }, 'Use this transparent rubric suggestion to guide feedback. It is not an automatic grade and should be checked against the learner’s actual reasoning.'),
            h('div', { className: 'cal-teacher-review-total' }, 'Draft rubric suggestion: ' + teacherReviewTotal + '/16'),
            h('div', { className: 'cal-teacher-review-next', role: 'status' }, h('strong', null, 'Best next move'), h('span', null, teacherReviewNextMove ? teacherReviewNextMove.label + ': ' + teacherReviewNextMove.nextMove : 'Review the evidence with the learner before sharing.')),
            h('table', { className: 'cal-teacher-review-table' },
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Criterion'), h('th', { scope: 'col' }, 'Score'), h('th', { scope: 'col' }, 'Evidence signal'), h('th', { scope: 'col' }, 'Next move'))),
              h('tbody', null, teacherReviewItems.map(function (item) { return h('tr', { key: item.label }, h('th', { scope: 'row' }, item.label), h('td', { className: 'cal-teacher-review-score' }, item.score + '/4'), h('td', null, item.detail), h('td', null, item.nextMove)); }))),
            h('div', { className: 'cal-evidence-map', role: 'group', 'aria-label': 'Claim to evidence map' },
              h('div', { className: 'cal-evidence-map-item' }, h('strong', null, 'Claim'), h('span', null, teacherEvidenceMap.claim)),
              h('div', { className: 'cal-evidence-map-item' }, h('strong', null, 'Evidence'), h('span', null, teacherEvidenceMap.evidence)),
              h('div', { className: 'cal-evidence-map-item' }, h('strong', null, 'Reasoning'), h('span', null, teacherEvidenceMap.reasoning)),
              h('div', { className: 'cal-evidence-map-item' }, h('strong', null, 'Limitation'), h('span', null, teacherEvidenceMap.limitation)),
              h('div', { className: 'cal-evidence-map-item' }, h('strong', null, 'Marker anchors'), h('span', null, teacherEvidenceMap.markers.join('; '))),
              h('div', { className: 'cal-evidence-map-item' }, h('strong', null, 'Provenance'), h('span', null, packetImportSourceSummary || (SOURCE.project + ' | HCA ' + SOURCE.hcaId)))),
            h('p', { className: 'cal-portfolio-boundary' }, 'This map links learner reasoning to displayed evidence and provenance; it never claims raw donor access or biological proof.'),
            h('label', { htmlFor: 'cal-teacher-feedback', style: { display: 'block', marginTop: '9px', color: '#5b21b6', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' } }, 'Teacher feedback'),
            h('textarea', { id: 'cal-teacher-feedback', rows: 3, maxLength: 800, value: d.cellAtlasTeacherNote || '', placeholder: 'Name one strength and one revision that would make the evidence or limitation more specific.', onChange: function (event) { patch({ cellAtlasTeacherNote: event.target.value.slice(0, 800), cellAtlasTeacherReviewStatus: '' }); } }),
            h('div', { className: 'cal-actions' },
              h('button', { type: 'button', className: 'cal-secondary', onClick: copyCellAtlasTeacherReview }, 'Copy teacher review snapshot'),
              d.cellAtlasTeacherReviewStatus === 'copied' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copied a sequence-free review snapshot.'),
              d.cellAtlasTeacherReviewStatus === 'unavailable' && h('span', { className: 'cal-map-note', role: 'status' }, 'Clipboard unavailable; select the review text manually.'),
              d.cellAtlasTeacherReviewStatus === 'failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Copy failed; select the review text manually.'))),
          h('section', { className: 'cal-card cal-portfolio-history', 'aria-labelledby': 'cal-portfolio-title' },
            h('div', { className: 'cal-self-check', role: 'group', 'aria-labelledby': 'cal-self-check-title' },
              h('h4', { id: 'cal-self-check-title' }, 'Learner self-check'),
              h('p', null, 'Record your confidence and uncertainty before saving. This reflection is preserved with the attempt but is not part of the rubric score.'),
              h('div', { className: 'cal-self-check-options', role: 'group', 'aria-label': 'Confidence level' },
                [{ id: 'uncertain', label: 'I need more evidence' }, { id: 'developing', label: 'I can explain a tentative claim' }, { id: 'confident', label: 'I can defend the claim and its limits' }].map(function (option) { return h('button', { key: option.id, type: 'button', 'aria-pressed': learnerSelfCheck.confidence === option.id ? 'true' : 'false', onClick: function () { patch({ cellAtlasLearnerSelfCheck: Object.assign({}, learnerSelfCheck, { confidence: option.id }), cellAtlasPortfolioStatus: '' }); } }, option.label); })),
              h('label', { htmlFor: 'cal-self-check-evidence' }, 'Strongest evidence I used'),
              h('textarea', { id: 'cal-self-check-evidence', rows: 2, maxLength: 500, value: learnerSelfCheck.strongestEvidence || '', placeholder: 'Name the marker, comparison, or source detail that most supports your claim.', onChange: function (event) { patch({ cellAtlasLearnerSelfCheck: Object.assign({}, learnerSelfCheck, { strongestEvidence: portfolioSafeText(event.target.value, '').slice(0, 500) }), cellAtlasPortfolioStatus: '' }); } }),
              h('label', { htmlFor: 'cal-self-check-uncertainty' }, 'What remains uncertain?'),
              h('textarea', { id: 'cal-self-check-uncertainty', rows: 2, maxLength: 500, value: learnerSelfCheck.uncertainty || '', placeholder: 'Name one limitation, alternative explanation, or next test.', onChange: function (event) { patch({ cellAtlasLearnerSelfCheck: Object.assign({}, learnerSelfCheck, { uncertainty: portfolioSafeText(event.target.value, '').slice(0, 500) }), cellAtlasPortfolioStatus: '' }); } })),
            h('div', { className: 'cal-portfolio-head' }, h('h4', { id: 'cal-portfolio-title' }, 'Revision portfolio'), h('span', null, portfolioAttempts.length + '/8 attempts saved')),
            h('div', { className: 'cal-portfolio-delta', 'data-direction': teacherPortfolioDelta.direction, role: 'status' }, h('strong', null, teacherPortfolioDelta.label), ' ', teacherPortfolioDelta.detail),
            portfolioAttempts.length ? h('ol', { className: 'cal-portfolio-list', 'aria-label': 'Saved revision attempts' }, portfolioAttempts.slice(-4).reverse().map(function (attempt) { var previous = portfolioAttempts[portfolioAttempts.indexOf(attempt) - 1]; var delta = cellAtlasPortfolioDelta(attempt, previous); return h('li', { key: attempt.id, 'data-direction': delta.direction }, String(attempt.createdAt || '').slice(0, 10) + ' - ' + attempt.total + '/16 - ' + (attempt.imported ? 'imported' : 'local') + ' - ' + delta.label); })) : h('p', { className: 'cal-card-intro' }, 'No saved attempts yet. Save one after reviewing this work to begin a revision history.'),
            h('div', { className: 'cal-actions' },
              h('button', { type: 'button', className: 'cal-primary', onClick: saveCellAtlasPortfolioAttempt }, 'Save portfolio attempt'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadCellAtlasPortfolio('json'); }, 'aria-label': 'Download Cell Atlas teacher review portfolio JSON' }, 'Download snapshot (.json)'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { downloadCellAtlasPortfolio('md'); }, 'aria-label': 'Download Cell Atlas teacher review portfolio markdown' }, 'Download snapshot (.md)'),
              d.cellAtlasPortfolioStatus === 'saved' && h('span', { className: 'cal-map-note', role: 'status' }, 'Saved a local, sequence-free revision attempt.'),
              d.cellAtlasPortfolioStatus === 'imported' && h('span', { className: 'cal-map-note', role: 'status' }, d.cellAtlasPortfolioLabel || 'Imported a bounded portfolio attempt.'),
              d.cellAtlasPortfolioStatus === 'downloaded' && h('span', { className: 'cal-map-note', role: 'status' }, 'Downloaded and saved the revision snapshot.'),
              d.cellAtlasPortfolioStatus === 'download-failed' && h('span', { className: 'cal-map-note', role: 'status' }, 'Download unavailable; use Save portfolio attempt to retain progress locally.'))),
          h('section', { className: 'cal-card cal-import-card', 'aria-labelledby': 'cal-import-title' },
            h('p', { className: 'cal-kicker' }, 'Resume a saved investigation'),
            h('h3', { id: 'cal-import-title' }, 'Resume from a Cell Atlas JSON packet'),
            h('p', { className: 'cal-card-intro' }, 'Import only a packet exported by this lab. The resume path restores bounded learner notes and study controls; it never loads raw donor rows, sequences, or clinical data.'),
            h('div', { className: 'cal-import-input' },
              h('label', null, 'Choose packet (.json)', h('input', { type: 'file', accept: '.json,application/json', onChange: importLearningPacket }))),
            packetImportStatus === 'imported' && h('div', { className: 'cal-import-status', role: 'status' }, 'Imported: ' + packetImportLabel + '. Review the restored work, then save a local packet to complete the export milestone.', h('span', { className: 'cal-import-route' }, 'Saved route: ' + packetImportRouteSummary)),
            packetImportStatus === 'imported' && h('div', { className: 'cal-import-provenance', 'data-status': packetImportProvenance || 'missing', role: 'status' }, 'Source check: ' + (packetImportSourceSummary || 'not recorded')),
            packetImportStatus && packetImportStatus !== 'imported' && h('div', { className: 'cal-import-status', 'data-error': 'true', role: 'alert' }, packetImportLabel)),
          h('section', { className: 'cal-card', 'aria-labelledby': 'cal-journey-title' },
            h('h3', { id: 'cal-journey-title' }, 'Continue the scale journey'),
            h('p', { className: 'cal-card-intro' }, 'Carry the same evidence outward to organs or inward to molecular structure.'),
            h('div', { className: 'cal-actions' },
              h('button', { type: 'button', className: 'cal-primary', onClick: goPrimaryJourney }, tissue.primaryJourney.button),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { openConnected('dnaLab', 'dnaLab', { tab: 'translate', _cellAtlasGene: tissue.crossGene }, 'DNA Lab'); } }, tissue.crossGene + ' in DNA Lab'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { openConnected('cell', 'cell', { mode: 'processes', cellProcess: 'protein' }, 'Cell Simulator'); } }, 'Cell Simulator'),
              h('button', { type: 'button', className: 'cal-secondary', onClick: function () { openConnected('anatomy', 'anatomy', { _activeTab: 'explore' }, 'Human Anatomy Explorer'); } }, 'Anatomy')))
        );
      }

      var views = [
        { id: 'map', label: '1. Explore map' },
        { id: 'compare', label: '2. Compare cells' },
        { id: 'mystery', label: '3. Mystery cell' },
        { id: 'cross', label: '4. Across tissues' },
        { id: 'design', label: '5. Design a study' },
        { id: 'source', label: '6. Methods + sources' }
      ];

      return h('main', { className: 'cal-shell', 'data-cell-atlas-tool': 'true' },
        h('header', { className: 'cal-top' },
          h('button', { type: 'button', className: 'cal-back', onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(null); announce('Returned to STEM Lab tools.'); }, 'aria-label': 'Back to STEM Lab tools' }, '\u2190'),
          h('div', { className: 'cal-brand' },
            h('p', { className: 'cal-kicker' }, 'Tissue to cell to gene to protein'),
            h('h1', { className: 'cal-title' }, 'Cell Atlas Lab'),
            h('p', { className: 'cal-subtitle' }, tissue.subtitle)),
          h('span', { className: 'cal-source-chip' }, 'Open HCA source | ' + SOURCE.license)),
        h('section', { className: 'cal-mission', 'aria-labelledby': 'cal-mission-title' },
          h('div', null,
            h('p', { className: 'cal-kicker' }, 'Investigation question'),
            h('h2', { id: 'cal-mission-title' }, view === 'cross' ? 'What stays conserved—and what becomes specialized—across organs?' : view === 'design' ? 'How do study-design choices shape what a cell atlas can claim?' : tissue.mission),
            h('p', null, 'Single-cell RNA sequencing measures which genes are active in individual cells. Scientists compare expression patterns to identify cell types, states, and specialized functions. Your task is to build a cautious identity claim from marker evidence.')),
          h('div', { className: 'cal-progress', role: 'list', 'aria-label': 'Investigation progress' },
            h('div', { className: 'cal-metric', role: 'listitem' }, h('b', null, exploredCount), h('span', null, 'cell types explored')),
            h('div', { className: 'cal-metric', role: 'listitem' }, h('b', null, correctCount + '/3'), h('span', null, 'mysteries solved')),
            h('div', { className: 'cal-metric', role: 'listitem' }, h('b', null, visitedCount + '/3'), h('span', null, 'tissue atlases visited')),
            h('div', { className: 'cal-metric', role: 'listitem' }, h('b', null, exportedArtifactCount), h('span', null, 'packets saved')))),
        h('section', { className: 'cal-route', 'aria-labelledby': 'cal-route-title' },
          h('div', { className: 'cal-route-head' },
            h('strong', { id: 'cal-route-title' }, 'Evidence route'),
            h('span', null, routeDoneCount + '/5 milestones')),
          h('div', { className: 'cal-route-bar', role: 'progressbar', 'aria-label': 'Evidence route progress', 'aria-valuemin': '0', 'aria-valuemax': '5', 'aria-valuenow': String(routeDoneCount), 'aria-valuetext': routeDoneCount + ' of 5 milestones complete' },
            h('span', { style: { width: routePercent + '%' } })),
          h('div', { className: 'cal-route-steps', role: 'list' },
            routeSteps.map(function (step) {
              return h('div', { key: step.id, className: 'cal-route-step', 'data-done': step.done ? 'true' : 'false', role: 'listitem' },
                h('span', { className: 'cal-route-step-icon', 'aria-hidden': 'true' }, step.done ? '\u2713' : '\u2022'),
                h('span', null, step.label));
            })),
          h('div', { className: 'cal-next-step', role: 'status' },
            h('strong', null, nextRouteStep ? 'Next recommended step' : 'Core route complete'),
            h('span', null, nextRouteStep ? nextRouteStep.detail : 'All five milestones are complete; revisit Methods + sources when preparing to share your work.'),
            nextRouteStep && h('button', { type: 'button', onClick: function () { openRouteStep(nextRouteStep); } }, 'Open ' + nextRouteStep.action))),
        h('nav', { className: 'cal-tissues', 'aria-label': 'Choose a Human Cell Atlas tissue investigation' },
          TISSUES.map(function (item) {
            return h('button', { key: item.id, type: 'button', className: 'cal-tissue', 'aria-pressed': tissue.id === item.id ? 'true' : 'false', onClick: function () { chooseTissue(item); } },
              h('span', { className: 'cal-tissue-icon', 'aria-hidden': 'true' }, item.icon),
              h('span', null, h('b', null, item.label), item.source.hcaId));
          })),
        h('nav', { className: 'cal-tabs', 'aria-label': 'Cell Atlas investigation views' },
          views.map(function (item) {
            return h('button', { key: item.id, type: 'button', className: 'cal-tab', 'aria-pressed': view === item.id ? 'true' : 'false', onClick: function () { patch({ view: item.id, comparisonViewed: item.id === 'compare' ? true : d.comparisonViewed, crossTissueCompared: item.id === 'cross' ? true : d.crossTissueCompared }); announce(item.label + ' opened.'); } }, item.label);
          })),
        view === 'map' ? renderMap() : view === 'compare' ? renderCompare() : view === 'mystery' ? renderMystery() : view === 'cross' ? renderCrossTissue() : view === 'design' ? renderDesignStudio() : renderSource(),
        h('footer', { className: 'cal-footer' },
          h('strong', null, 'Evidence boundary: '),
          'This classroom model uses openly documented HCA source context and curated marker relationships. Its coordinates and normalized scores are instructional representations, not raw donor measurements. Do not use it for diagnosis or individual health decisions.')
      );
    }
  });

  console.log('[StemLab] stem_tool_cellatlas.js loaded - Cell Atlas Lab');
})();
