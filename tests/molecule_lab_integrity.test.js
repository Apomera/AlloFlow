import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('Molecule Lab element catalog integrity', () => {
  beforeEach(() => {
    resetStemLab();
    document.head.querySelectorAll('style').forEach((style) => style.remove());
    loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
  });

  it('renders every element in the secondary reference table', () => {
    const html = renderTool('molecule', {
      molecule: { moleculeMode: 'table', expSection: 'allelements' },
    });

    // One header row plus one row for each of the 118 elements.
    expect((html.match(/<tr/g) || []).length).toBe(119);
    expect(html).toContain('Periodic table (118 elements)');
    expect(html).toContain('Complete 118-element periodic table reference');
    expect(html).toContain('Group / series');
    expect(html).toContain('Isotopes');
    expect(html).toContain('118');
  });

  it('filters the fixed periodic-table grid without dropping the matching tile', () => {
    const html = renderTool('molecule', {
      molecule: { moleculeMode: 'table', elementSearch: '118' },
    });

    expect((html.match(/aria-label="Select element:/g) || []).length).toBe(1);
    expect(html).toContain('(Og)');
    expect(html).toContain('Showing 1 of 118 elements');
  });

  it('searches periodic metadata and combines period and block filters', () => {
    const groupHtml = renderTool('molecule', {
      molecule: { moleculeMode: 'table', elementSearch: 'group 18' },
    });

    expect((groupHtml.match(/aria-label="Select element:/g) || []).length).toBe(7);
    expect(groupHtml).toContain('Showing 7 of 118 elements');
    expect(groupHtml).toContain('id="molecule-element-period"');
    expect(groupHtml).toContain('id="molecule-element-block"');
    expect(groupHtml).toContain('aria-label="Clear all element filters"');

    const blockHtml = renderTool('molecule', {
      molecule: { moleculeMode: 'table', elementPeriod: '6', elementBlock: 'd' },
    });

    expect((blockHtml.match(/aria-label="Select element:/g) || []).length).toBe(9);
    expect(blockHtml).toContain('Showing 9 of 118 elements');
    expect(blockHtml).toContain('value="6" selected=""');
    expect(blockHtml).toContain('value="d" selected=""');
  });

  it('announces when the selected element is hidden by the active filters', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        elementSearch: '118',
        selectedElement: { name: 'Carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
      },
    });

    expect(html).toContain('Selected element Carbon is hidden by these filters.');
    expect(html).toContain('Show selected');
  });

  it('uses one electron-shell model across the complete catalog', () => {
    renderTool('molecule', { molecule: { moleculeMode: 'table' } });

    const tools = window.__alloMoleculeElementTools;
    expect(tools.count).toBe(118);
    expect(tools.getShellDistribution(19)).toEqual([2, 8, 8, 1]);
    expect(tools.getShellDistribution(26)).toEqual([2, 8, 14, 2]);

    const oganessonShells = tools.getShellDistribution(118);
    expect(oganessonShells).toHaveLength(7);
    expect(oganessonShells.reduce((sum, count) => sum + count, 0)).toBe(118);
  });

  it('provides complete periodic-position metadata for every element', () => {
    renderTool('molecule', { molecule: { moleculeMode: 'table' } });

    const tools = window.__alloMoleculeElementTools;
    expect(tools.symbols).toHaveLength(118);
    tools.symbols.forEach((symbol) => {
      const metadata = tools.getMetadata(symbol);
      expect(metadata.symbol).toBe(symbol);
      expect(metadata.period).toBeGreaterThanOrEqual(1);
      expect(metadata.period).toBeLessThanOrEqual(7);
      expect(['s', 'p', 'd', 'f']).toContain(metadata.block);
      expect(metadata.positionLabel.length).toBeGreaterThan(0);
      expect(['Has stable isotope(s)', 'No stable isotopes']).toContain(metadata.isotopeStability);
      expect(metadata.mass).toBeGreaterThan(0);
      expect(metadata.configuration.length).toBeGreaterThan(0);
    });

    expect(tools.getMetadata('H')).toMatchObject({ period: 1, group: 1, block: 's', isotopeStability: 'Has stable isotope(s)' });
    expect(tools.getMetadata('He')).toMatchObject({ period: 1, group: 18, block: 's' });
    expect(tools.getMetadata('Fe')).toMatchObject({ period: 4, group: 8, block: 'd' });
    expect(tools.getMetadata('Ce')).toMatchObject({ period: 6, group: null, block: 'f', positionLabel: 'Lanthanide series' });
    expect(tools.getMetadata('U')).toMatchObject({ period: 7, group: null, block: 'f', positionLabel: 'Actinide series', isotopeStability: 'No stable isotopes' });
    expect(tools.getMetadata('Og')).toMatchObject({ period: 7, group: 18, block: 'p', isotopeStability: 'No stable isotopes' });
    expect(tools.getMetadata('Tc').isotopeStability).toBe('No stable isotopes');
  });

  it('keeps all 118 element entries complete and free of unresolved localization keys', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        selectedElement: { name: 'stem.periodic.carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
        elementDetailsOpen: true,
        elementCompareOpen: true,
        elementCompareA: 'Na',
        elementCompareB: 'Cl',
      },
    });

    const catalog = window.__alloMoleculeElementCatalog;
    expect(catalog.count).toBe(118);
    expect(catalog.entries).toHaveLength(118);
    expect(new Set(catalog.entries.map((entry) => entry.atomicNumber)).size).toBe(118);
    expect(new Set(catalog.entries.map((entry) => entry.symbol)).size).toBe(118);

    catalog.entries.forEach((entry) => {
      expect(entry.name.length).toBeGreaterThan(1);
      expect(entry.description.length).toBeGreaterThan(20);
      expect(entry.uses.length).toBeGreaterThan(0);
      expect(entry.compounds.length).toBeGreaterThan(0);
      expect(entry.name).not.toMatch(/^stem\./i);
      expect(entry.description).not.toMatch(/stem\./i);
      expect(entry.uses.join(' ')).not.toMatch(/stem\./i);
      expect(entry.compounds.join(' ')).not.toMatch(/stem\./i);
    });

    const carbon = catalog.entries.find((entry) => entry.symbol === 'C');
    expect(carbon.name).toBe('Carbon');
    expect(carbon.description).toBe('Carbon forms the backbone of all known life and an enormous range of compounds.');
    expect(html).toContain('Carbon forms the backbone of all known life');
    expect(html).toContain('Carbon Dioxide (CO₂)');
    expect(html).toContain('Lanthanide');
    expect(html).toContain('Actinide');
    expect(html).not.toMatch(/stem\.(?:periodic|chem_balance)\./i);
  });

  it('renders an accessible side-by-side comparison for any two elements', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        elementCompareOpen: true,
        elementCompareA: 'Na',
        elementCompareB: 'Cl',
      },
    });

    const comparison = window.__alloMoleculeElementTools.compare('Na', 'Cl');
    expect(comparison.metricsA.shells).toEqual([2, 8, 1]);
    expect(comparison.metricsB.shells).toEqual([2, 8, 7]);
    expect(comparison.metricsB.electronegativity).toBe(3.16);
    expect(comparison.metricsA).toMatchObject({ period: 3, group: 1, block: 's' });
    expect(comparison.metricsB).toMatchObject({ period: 3, group: 17, block: 'p' });
    expect(comparison.insights.length).toBeGreaterThanOrEqual(4);

    expect(html).toContain('data-element-comparison="true"');
    expect(html).toContain('id="molecule-element-compare-a"');
    expect(html).toContain('id="molecule-element-compare-b"');
    expect(html).toContain('What the evidence suggests');
    expect(html).toContain('Pauling electronegativity');
    expect(html).toContain('Periodic position');
    expect(html).toContain('Isotope stability');
  });

  it('describes equal electronegativity values as a tie', () => {
    renderTool('molecule', { molecule: { moleculeMode: 'table' } });
    const comparison = window.__alloMoleculeElementTools.compare('Si', 'Cu');

    expect(comparison.metricsA.electronegativity).toBe(1.9);
    expect(comparison.metricsB.electronegativity).toBe(1.9);
    expect(comparison.insights).toContain('Both elements have the same listed Pauling electronegativity (1.90).');
    expect(comparison.insights.join(' ')).not.toContain('has the higher Pauling electronegativity');
  });

  it('adds calm previous and next navigation to the selected-element region', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        selectedElement: { name: 'Carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
      },
    });

    expect(html).toContain('aria-labelledby="molecule-selected-element-title"');
    expect(html).toContain('aria-label="Browse elements by atomic number"');
    expect(html).toContain('aria-label="Previous element:');
    expect(html).toContain('aria-label="Next element:');
    expect(html).toContain('6 of 118');
    expect(html).not.toContain('hover:scale-125');
  });

  it('renders a complete stable fact panel for the selected element', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        selectedElement: { name: 'Oganesson', s: 'Og', n: 118, cat: 'noble', c: '#c084fc' },
        elementDetailsOpen: true,
      },
    });

    expect(html).toContain('Complete element facts');
    expect(html).toContain('aria-label="Complete facts for Oganesson"');
    expect(html).toContain('294.000 g/mol');
    expect(html).toContain('Group 18');
    expect(html).toContain('p-block');
    expect(html).toContain('No stable isotopes');
    expect(html).toContain('Simplified Aufbau configuration');
  });

  it('keeps the map first and the selected-element inspector compact by default', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        elementCategory: 'nonmetal',
        selectedElement: { name: 'Carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
      },
    });

    expect(html).toContain('data-element-workspace="true"');
    expect(html).toContain('data-matching-elements-tray="true"');
    expect(html).toContain('data-matching-element="C"');
    expect(html).toContain('aria-label="Remove filter: Nonmetals"');
    expect(html).toContain('Explore complete facts');
    expect(html).not.toContain('data-element-details-panel="true"');
    expect(html).not.toContain('data-stable-bohr-panel="true"');
    expect(html.indexOf('data-molecule-periodic-grid="true"')).toBeLessThan(html.indexOf('data-selected-element-card="true"'));
  });

  it('labels the quiz as complete-catalog practice and explains answered questions', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        elQuiz: {
          text: 'How many shells?',
          answer: '4',
          chosen: '4',
          answered: true,
          explanation: 'Potassium has the shell distribution 2-8-8-1.',
        },
      },
    });

    expect(html).toContain('data-element-quiz-catalog="118"');
    expect(html).toContain('data-element-quiz-types="6"');
    expect(html).toContain('All 118 elements • 6 question types');
    expect(html).toContain('role="status"');
    expect(html).toContain('Potassium has the shell distribution 2-8-8-1.');
  });

  it('can constrain quiz targets to the learner\'s current filtered results', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        elementCategory: 'noble',
        elementPeriod: '7',
        elementBlock: 'p',
        elQuizScope: 'filtered',
      },
    });

    expect(html).toContain('data-element-quiz-catalog="1"');
    expect(html).toContain('data-element-quiz-scope="filtered"');
    expect(html).toContain('id="molecule-element-quiz-scope"');
    expect(html).toContain('Current filtered results (1)');
    expect(html).toContain('1 filtered element • 6 question types');
  });

  it('reports quiz attempts and accuracy and offers a session reset', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        elScore: 3,
        elAttempts: 4,
        elStreak: 2,
      },
    });

    expect(html).toContain('3/4 • 75%');
    expect(html).toContain('3 correct out of 4 attempts, 75 percent accuracy, streak 2');
    expect(html).toContain('aria-label="Reset element quiz session"');
  });

  it('organizes research into stable, visually distinct learning regions', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        elementCategory: 'nonmetal',
        selectedElement: { name: 'Carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
        elementDetailsOpen: true,
      },
    });

    expect(html).toContain('data-molecule-command-state="compact"');
    expect(html).toContain('data-molecule-command-summary="true"');
    expect(html).toContain('Explore all modes');
    expect(html).toContain('data-molecule-primary-tabs="true"');
    expect(html).not.toContain('data-molecule-mode-grid="true"');
    expect(html).toContain('data-element-explorer-controls="true"');
    expect(html).toContain('Find an element without losing its place');
    expect(html).toContain('Layout preserved while filtering');
    expect(html).toContain('data-selected-element-card="true"');
    expect(html).toContain('8 reference fields');
    expect(html).toContain('data-stable-bohr-panel="true"');
    expect(html).toContain('data-molecule-periodic-grid="true"');
    expect(html).toContain('aria-label="Scrollable periodic table map"');
    expect(html).toContain('data-periodic-map-viewport-controls="true"');
    expect(html).toContain('data-periodic-map-visible-groups="1-9"');
    expect(html).toContain('data-periodic-map-move="earlier"');
    expect(html).toContain('data-periodic-map-move="later"');
    expect(html).toContain('data-periodic-map-track="true"');
    expect(html).toContain('data-periodic-group="18"');
    expect(html).toContain('data-periodic-map-overflow-cue="right"');
    expect(html).toContain('18 groups • 7 periods');
    expect(html).toContain('id="molecule-element-practice-title"');
    expect(html).toContain('Test the patterns you can see');
  });

  it('keeps the complete mode guide available without making it permanent', () => {
    const expandedHtml = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        modeDeckOpen: true,
      },
    });
    const firstVisitHtml = renderTool('molecule', {
      molecule: {
        moleculeMode: 'viewer',
        tutorialDismissed: false,
      },
    });

    expect(expandedHtml).toContain('data-molecule-command-state="expanded"');
    expect(expandedHtml).toContain('aria-expanded="true"');
    expect(expandedHtml).toContain('data-molecule-mode-grid="true"');
    expect((expandedHtml.match(/data-molecule-route=/g) || []).length).toBe(6);
    expect(expandedHtml).toContain('data-molecule-route="realStructures"');
    expect(expandedHtml).toContain('Hide mode guide');
    expect(firstVisitHtml).toContain('data-molecule-command-state="expanded"');
    expect(firstVisitHtml).toContain('data-molecule-mode-grid="true"');
  });

  it('keeps the 53-topic reference library compact until the learner opens it', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
      },
    });

    expect(html).toContain('data-reference-library-launcher="true"');
    expect(html).toContain('Browse 53 topics');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-reference-library-browser="true"');
    expect(html).not.toContain('data-reference-topic=');
  });

  it('exposes every reference topic while showing only one selected domain', () => {
    const html = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        referenceLibraryOpen: true,
        referenceLibraryGroup: 'applications',
      },
    });

    const catalog = window.__alloMoleculeReferenceCatalog;
    expect(catalog.count).toBe(53);
    expect(catalog.groups).toHaveLength(7);
    expect(new Set(catalog.topicIds).size).toBe(53);
    expect((html.match(/data-reference-group=/g) || []).length).toBe(7);
    expect((html.match(/data-reference-topic=/g) || []).length).toBe(12);
    expect(html).toContain('data-reference-topic="pharma"');
    expect(html).not.toContain('data-reference-topic="vsepr"');

    const source = readFileSync('stem_lab/stem_tool_molecule.js', 'utf8');
    const routedTopicIds = Array.from(source.matchAll(/if \(expSection === '([^']+)'\)/g), (match) => match[1]);
    expect(new Set(routedTopicIds)).toEqual(new Set(catalog.topicIds));
  });

  it('searches across all reference domains and provides a clear empty state', () => {
    const resultHtml = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        referenceLibraryOpen: true,
        referenceLibraryQuery: 'solvent',
      },
    });

    expect(resultHtml).toContain('1 search result');
    expect(resultHtml).toContain('data-reference-topic="solventMystery"');
    expect((resultHtml.match(/data-reference-topic=/g) || []).length).toBe(1);

    const emptyHtml = renderTool('molecule', {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        referenceLibraryOpen: true,
        referenceLibraryQuery: 'not-a-chemistry-topic',
      },
    });

    expect(emptyHtml).toContain('No matching topics');
    expect(emptyHtml).toContain('0 search results');
    expect(emptyHtml).not.toContain('data-reference-topic=');
  });
});
