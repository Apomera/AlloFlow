import { beforeAll, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const Fragment = Symbol('TestFragment');

function flattenChildren(values) {
  const out = [];
  values.forEach((value) => {
    if (Array.isArray(value)) out.push(...flattenChildren(value));
    else if (value !== null && value !== undefined && value !== false && value !== true) out.push(value);
  });
  return out;
}

function createElement(type, props, ...rawChildren) {
  const children = flattenChildren(rawChildren);
  const mergedProps = { ...(props || {}) };
  if (children.length === 1) mergedProps.children = children[0];
  else if (children.length > 1) mergedProps.children = children;
  if (type === Fragment) return { type: 'fragment', props: mergedProps, children };
  if (typeof type === 'function') return type(mergedProps);
  return { type, props: mergedProps, children };
}

function walk(node, visitor) {
  if (node === null || node === undefined || node === false || node === true) return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visitor));
    return;
  }
  visitor(node);
  if (typeof node === 'object' && Array.isArray(node.children)) {
    node.children.forEach((child) => walk(child, visitor));
  }
}

function findAll(root, predicate) {
  const matches = [];
  walk(root, (node) => {
    if (typeof node === 'object' && predicate(node)) matches.push(node);
  });
  return matches;
}

function findById(root, id) {
  return findAll(root, (node) => node.props && node.props.id === id)[0] || null;
}

function textContent(node) {
  if (node === null || node === undefined || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return Array.isArray(node.children) ? node.children.map(textContent).join('') : '';
}

function appendTree(parent, node) {
  if (node === null || node === undefined || node === false || node === true) return;
  if (Array.isArray(node)) {
    node.forEach((child) => appendTree(parent, child));
    return;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    parent.appendChild(document.createTextNode(String(node)));
    return;
  }
  if (node.type === 'fragment') {
    node.children.forEach((child) => appendTree(parent, child));
    return;
  }

  const svgTags = new Set(['svg', 'circle', 'text']);
  const element = svgTags.has(node.type)
    ? document.createElementNS('http://www.w3.org/2000/svg', node.type)
    : document.createElement(node.type);
  Object.entries(node.props || {}).forEach(([name, value]) => {
    if (name === 'children' || name === 'key' || name === 'ref' || name.startsWith('on') || value === null || value === undefined || value === false) return;
    if (name === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
      return;
    }
    const attributeName = name === 'className' ? 'class' : name === 'htmlFor' ? 'for' : name === 'tabIndex' ? 'tabindex' : name;
    const attributeValue = value === true && !attributeName.startsWith('aria-') ? '' : String(value);
    element.setAttribute(attributeName, attributeValue);
  });
  node.children.forEach((child) => appendTree(element, child));
  parent.appendChild(element);
}

const dimensionKeys = [
  'standards',
  'vocabulary',
  'engagement',
  'accessibility',
  'udl',
  'accuracy',
  'differentiation',
  'cognitiveLoad',
  'culturalResponsiveness'
];

function auditFixture() {
  const dimensionScores = Object.fromEntries(dimensionKeys.map((key) => [key, {
    status: 'Not evaluated',
    points: null,
    notEvaluated: true
  }]));
  dimensionScores.accessibility = { status: 'Not Aligned', points: 0 };
  const perDimensionPercent = Object.fromEntries(dimensionKeys.map((key) => [key, null]));
  perDimensionPercent.accessibility = 0;
  return {
    type: 'alignment-report',
    data: {
      reports: [],
      comprehensive: {
        auditLanguage: 'en',
        auditMetadata: {
          schemaVersion: 3,
          generatedAt: '2026-07-13T22:00:00.000Z',
          gradeLevel: '5th Grade'
        },
        auditScope: {
          includedArtifactIds: ['lesson-1', 'quiz-1'],
          includedTypes: ['lesson-plan', 'quiz'],
          selectionMode: 'explicit artifact IDs',
          excludedArtifactCount: 1,
          warnings: [],
          contextTruncated: false
        },
        overall: {
          score: null,
          provisionalScore: 50,
          incomplete: true,
          status: 'Revise',
          label: 'Revise — critical issues',
          totalDimensions: 9,
          dimensionsApplicable: 9,
          dimensionsEvaluated: 1,
          dimensionScores,
          perDimensionPercent,
          blockingIssues: [{ dimension: 'Content accessibility', issue: 'Add missing alt text.' }],
          incompleteIssues: [{ dimension: 'Standards alignment', issue: 'Required evidence was unavailable.' }],
          scoreBasis: 'Equal weighting across all applicable dimensions.',
          notes: 'Missing evidence prevents certification.'
        },
        accessibility: {
          status: 'Not Aligned',
          totalImages: 1,
          imagesWithAlt: 0,
          altCoveragePct: 0,
          colorOnlyCount: 0,
          implicitImageCount: 0,
          recommendations: ['Add missing alt text.']
        },
        differentiation: {
          status: 'Not evaluated',
          notEvaluated: true,
          recommendations: ['No differentiation evidence was available.'],
          audioCoverage: {
            readableArtifacts: 2,
            readAloudCapableArtifacts: 2,
            readAloudCapabilityPct: 100,
            dedicatedReadAloudArtifacts: 1,
            dedicatedReadAloudPct: 50,
            embeddedAudioArtifacts: 1,
            embeddedAudioPct: 50,
            preparedSentences: 4,
            expectedSentences: 8,
            preparedSentenceCoveragePct: 50,
            runtimeFallbackAvailable: true,
            runtimeFallbackArtifacts: 1,
            unscopedAudioArtifacts: 1,
            unscopedEmbeddedAudioArtifacts: 1,
            notes: 'Audio evidence levels are reported separately.'
          }
        }
      }
    }
  };
}

beforeAll(() => {
  window.React = { createElement, Fragment };
  window.AlloIcons = {};
  loadAlloModule('view_alignment_report_module.js');
});

function renderAuditTree(generatedContent = auditFixture()) {
  const View = window.AlloModules.AlignmentReportView;
  return View({
    generatedContent,
    t: () => 'Curriculum audit summary'
  });
}

describe('rendered curriculum audit report', () => {
  it('renders a complete accessible report tree with resolvable dimension navigation', () => {
    const tree = renderAuditTree();

    expect(tree.type).toBe('section');
    expect(tree.props.role).toBe('region');
    expect(tree.props['aria-labelledby']).toBe('curriculum-audit-report-heading');
    expect(findById(tree, 'curriculum-audit-report-heading')?.type).toBe('h1');
    expect(findById(tree, 'audit-findings-heading')?.type).toBe('h2');

    const dimensionNav = findAll(tree, (node) => node.type === 'nav' && node.props['aria-label'] === 'Audit dimension results')[0];
    expect(dimensionNav).toBeTruthy();
    const dimensionLinks = findAll(dimensionNav, (node) => node.type === 'a');
    expect(dimensionLinks).toHaveLength(9);
    dimensionLinks.forEach((link) => {
      expect(link.props['aria-label']).toMatch(/: (Aligned|Partially Aligned|Not Aligned|Not evaluated|Not applicable|Compute failed)/);
      expect(findById(tree, link.props.href.slice(1))).toBeTruthy();
    });

    expect(findAll(tree, (node) => node.type === 'time' && node.props.dateTime === '2026-07-13T22:00:00.000Z')).toHaveLength(1);
    expect(textContent(tree)).toContain('Selection: explicit artifact IDs');
    expect(textContent(tree)).toContain('2 of 2 readable resources (100%)');
    expect(textContent(tree)).toContain('1 of 2 readable resources (50%)');
    expect(textContent(tree)).toContain('4 of 8 readable sentences (50%)');
    expect(textContent(tree)).toContain('How scoring works');
    expect(textContent(tree)).toContain('1 readable resource relies on on-demand speech');
    expect(textContent(tree)).toContain('1 audio-bearing artifact was excluded');

    const recommendationLists = findAll(tree, (node) => node.type === 'ol');
    expect(recommendationLists).toHaveLength(1);
    expect((textContent(recommendationLists[0]).match(/Add missing alt text\./g) || [])).toHaveLength(1);

    const dimensionTargets = findAll(tree, (node) => node.props && /^audit-(?:standards|vocabulary|engagement|accessibility|udl|accuracy|differentiation|cognitiveLoad|culturalResponsiveness)$/.test(node.props.id || ''));
    expect(dimensionTargets).toHaveLength(9);
    dimensionTargets.forEach((target) => {
      expect(target.type).toBe('section');
      expect(target.props['aria-labelledby']).toBe(`${target.props.id}-heading`);
      expect(findById(tree, `${target.props.id}-heading`)?.type).toBe('h3');
    });
  });

  it('keeps all dimension navigation available for older audits without dimensionScores', () => {
    const fixture = auditFixture();
    delete fixture.data.comprehensive.overall.dimensionScores;
    const tree = renderAuditTree(fixture);
    const dimensionNav = findAll(tree, (node) => node.type === 'nav' && node.props['aria-label'] === 'Audit dimension results')[0];
    const dimensionLinks = findAll(dimensionNav, (node) => node.type === 'a');

    expect(dimensionLinks).toHaveLength(9);
    expect(dimensionLinks.find((link) => link.props.href === '#audit-accessibility')?.props['aria-label']).toBe('Access: Not Aligned, 0%');
    dimensionLinks.forEach((link) => expect(findById(tree, link.props.href.slice(1))).toBeTruthy());
  });

  it('keeps all dimension navigation available when no dimensions were evaluated', () => {
    const fixture = auditFixture();
    fixture.data.comprehensive.overall.score = null;
    fixture.data.comprehensive.overall.provisionalScore = null;
    fixture.data.comprehensive.overall.dimensionsEvaluated = 0;
    fixture.data.comprehensive.overall.dimensionScores = {};
    fixture.data.comprehensive.overall.perDimensionPercent = {};
    fixture.data.comprehensive.overall.blockingIssues = [];
    const tree = renderAuditTree(fixture);
    const dimensionNav = findAll(tree, (node) => node.type === 'nav' && node.props['aria-label'] === 'Audit dimension results')[0];
    const dimensionLinks = findAll(dimensionNav, (node) => node.type === 'a');

    expect(textContent(tree)).toContain('Not enough artifacts to compute');
    expect(dimensionLinks).toHaveLength(9);
    dimensionLinks.forEach((link) => {
      expect(link.props['aria-label']).toMatch(/: Not evaluated$/);
      expect(findById(tree, link.props.href.slice(1))).toBeTruthy();
    });
  });

  it('renders a visible recovery message when comprehensive audit data is missing', () => {
    const tree = renderAuditTree({
      type: 'alignment-report',
      data: { reports: [] }
    });

    expect(tree.type).toBe('section');
    expect(tree.props['aria-labelledby']).toBe('curriculum-audit-report-heading');
    expect(findById(tree, 'curriculum-audit-report-heading')?.type).toBe('h1');
    expect(findAll(tree, (node) => node.props && node.props.role === 'status')).toHaveLength(1);
    expect(textContent(tree)).toContain('Audit details are unavailable');
    expect(textContent(tree)).toContain('Regenerate the curriculum audit');
  });

  it('uses canonical language tags for new and legacy saved reports', () => {
    const legacyFixture = auditFixture();
    legacyFixture.data.comprehensive.auditLanguage = 'Spanish (Latin America)';
    delete legacyFixture.data.comprehensive.auditLanguageTag;
    expect(renderAuditTree(legacyFixture).props.lang).toBe('es');

    const currentFixture = auditFixture();
    currentFixture.data.comprehensive.auditLanguage = 'Portuguese';
    currentFixture.data.comprehensive.auditLanguageTag = 'pt-BR';
    expect(renderAuditTree(currentFixture).props.lang).toBe('pt-BR');

    const unknownFixture = auditFixture();
    unknownFixture.data.comprehensive.auditLanguage = 'All Selected Languages';
    delete unknownFixture.data.comprehensive.auditLanguageTag;
    expect(renderAuditTree(unknownFixture).props.lang).toBe('und');
  });

  it('bounds malformed saved scores and coverage values before rendering', () => {
    const fixture = auditFixture();
    const comprehensive = fixture.data.comprehensive;
    comprehensive.overall.score = 130;
    comprehensive.overall.dimensionsEvaluated = 99;
    comprehensive.overall.dimensionsApplicable = 8;
    comprehensive.overall.totalDimensions = 9;
    comprehensive.overall.perDimensionPercent.accessibility = 150;
    comprehensive.differentiation.audioCoverage.preparedSentences = 99;
    comprehensive.differentiation.audioCoverage.expectedSentences = 8;
    comprehensive.differentiation.audioCoverage.preparedSentenceCoveragePct = 999;
    const tree = renderAuditTree(fixture);
    const dimensionNav = findAll(tree, (node) => node.type === 'nav' && node.props['aria-label'] === 'Audit dimension results')[0];
    const accessLink = findAll(dimensionNav, (node) => node.type === 'a' && node.props.href === '#audit-accessibility')[0];
    const renderedText = textContent(tree);

    expect(renderedText).toContain('Curriculum readiness score: 100 out of 100.');
    expect(renderedText).toContain('8 of 8 applicable comprehensive dimensions evaluated');
    expect(renderedText).toContain('8 of 8 readable sentences (100%)');
    expect(accessLink.props['aria-label']).toBe('Access: Not Aligned, 100%');
    expect(renderedText).not.toMatch(/(?:130|150|999|NaN|Infinity)/);
  });

  it('avoids animated scrolling and focus flashes when reduced motion is requested', () => {
    const tree = renderAuditTree();
    const jumpLink = findAll(tree, (node) => node.type === 'a' && node.props.href === '#audit-accessibility' && typeof node.props.onClick === 'function')[0];
    const target = document.createElement('div');
    target.id = 'audit-accessibility';
    target.tabIndex = -1;
    target.scrollIntoView = vi.fn();
    const focus = vi.spyOn(target, 'focus');
    const preventDefault = vi.fn();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: true }));
    document.body.appendChild(target);

    try {
      jumpLink.props.onClick({ preventDefault });
      expect(preventDefault).toHaveBeenCalledOnce();
      expect(target.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start'
      });
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(target.style.transition).toBe('');
      expect(target.style.boxShadow).toBe('');
    } finally {
      target.remove();
      window.matchMedia = originalMatchMedia;
      vi.restoreAllMocks();
    }
  });

  it('passes axe-core WCAG A and AA structural rules when mounted in the DOM', async () => {
    const host = document.createElement('main');
    host.setAttribute('aria-label', 'Curriculum audit test document');
    document.body.appendChild(host);
    appendTree(host, renderAuditTree());

    try {
      const results = await axe.run(host, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']
        },
        rules: {
          // JSDOM has no layout or computed color rendering; contrast remains a manual/browser check.
          'color-contrast': { enabled: false }
        }
      });

      expect(results.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.flatMap((node) => node.target)
      }))).toEqual([]);
    } finally {
      host.remove();
    }
  }, 15000);
});
