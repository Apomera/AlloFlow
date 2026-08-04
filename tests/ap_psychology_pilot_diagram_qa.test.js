import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const generatorSource = resolve(root, 'dev-tools/qa_ap_psychology_pilot.cjs');
const packSource = resolve(root, 'test_prep/ap_psychology_pilot.json');
const librarySource = resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json');
const temporaryRoots = [];

// The generator is copied into a sandbox and run there, so its sibling helpers
// have to travel with it. Pinning the copy-list to one filename went stale the
// moment qa_ap_psychology_pilot.cjs picked up write_generated_file.cjs — the
// script was fine, the sandbox just couldn't resolve the new require. Walk the
// local `require('./x.cjs')` graph instead so future helpers come along too.
function collectLocalDependencies(entrySource, seen = new Set()) {
  const resolved = resolve(entrySource);
  if (seen.has(resolved) || !fs.existsSync(resolved)) return seen;
  seen.add(resolved);
  const source = fs.readFileSync(resolved, 'utf8');
  for (const match of source.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g)) {
    collectLocalDependencies(resolve(path.dirname(resolved), match[1]), seen);
  }
  return seen;
}

function runWithLibraryMutation(mutate = () => {}) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-ap-diagram-qa-'));
  temporaryRoots.push(temporaryRoot);
  const devToolsDirectory = resolve(temporaryRoot, 'dev-tools');
  const testPrepDirectory = resolve(temporaryRoot, 'test_prep');
  fs.mkdirSync(devToolsDirectory, { recursive: true });
  fs.mkdirSync(testPrepDirectory, { recursive: true });
  for (const dependency of collectLocalDependencies(generatorSource)) {
    fs.copyFileSync(dependency, resolve(devToolsDirectory, path.basename(dependency)));
  }
  fs.copyFileSync(packSource, resolve(testPrepDirectory, 'ap_psychology_pilot.json'));

  const library = JSON.parse(fs.readFileSync(librarySource, 'utf8'));
  mutate(library);
  fs.writeFileSync(
    resolve(testPrepDirectory, 'ap_psychology_pilot_learning_library.json'),
    JSON.stringify(library, null, 2) + '\n',
    'utf8'
  );

  const result = spawnSync(process.execPath, [resolve(devToolsDirectory, 'qa_ap_psychology_pilot.cjs')], {
    cwd: temporaryRoot,
    encoding: 'utf8',
  });
  const reportPath = resolve(testPrepDirectory, 'ap_psychology_pilot_qa.json');
  const report = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    : null;
  return { result, report };
}

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    const resolvedTemporaryRoot = resolve(temporaryRoot);
    expect(path.basename(resolvedTemporaryRoot).startsWith('alloflow-ap-diagram-qa-')).toBe(true);
    fs.rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
  }
});

describe('AP Psychology diagram QA regression boundaries', () => {
  it('passes the reviewed five-unit diagram inventory without a visual-coverage advisory', () => {
    const { result, report } = runWithLibraryMutation();

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(report.automatedAssessment).toMatchObject({
      automatedQaStatus: 'pass',
      structuralFindingCount: 0,
      structuralFindings: [],
    });
    expect(
      report.automatedAssessment.signals.find((signal) => signal.check === 'diagram-integrity')
    ).toMatchObject({ status: 'pass' });
    expect(
      report.editorialReviewQueue.advisories.filter(
        (advisory) => advisory.check === 'visual-learning-coverage'
      )
    ).toEqual([]);
  });

  it.each([
    {
      label: 'missing declared inventory',
      mutate(library) {
        library.diagrams.pop();
      },
      expectedChecks: ['library-inventory', 'diagram-integrity'],
      expectsVisualCoverageAdvisory: true,
    },
    {
      label: 'duplicate diagram IDs',
      mutate(library) {
        library.diagrams[1].id = library.diagrams[0].id;
      },
      expectedChecks: ['diagram-integrity'],
      expectsVisualCoverageAdvisory: true,
    },
    {
      label: 'duplicate placement IDs',
      mutate(library) {
        library.diagramPlacements[1].id = library.diagramPlacements[0].id;
      },
      expectedChecks: ['diagram-integrity'],
      expectsVisualCoverageAdvisory: true,
    },
    {
      label: 'invalid section references',
      mutate(library) {
        library.diagramPlacements[0].sectionId = 'ap-psych-missing-section';
      },
      expectedChecks: ['diagram-integrity'],
      expectsVisualCoverageAdvisory: true,
    },
    {
      label: 'missing accessible text equivalents',
      mutate(library) {
        library.diagrams[0].accessibility.longDescription = '';
        library.diagrams[0].accessibility.textEquivalent = [];
      },
      expectedChecks: ['diagram-integrity'],
      expectsVisualCoverageAdvisory: true,
    },
  ])('fails deterministically for $label', ({ mutate, expectedChecks, expectsVisualCoverageAdvisory }) => {
    const { result, report } = runWithLibraryMutation(mutate);

    expect(result.status).toBe(1);
    expect(report.automatedAssessment.automatedQaStatus).toBe('fail');
    const findingChecks = new Set(
      report.automatedAssessment.structuralFindings.map((finding) => finding.check)
    );
    for (const expectedCheck of expectedChecks) {
      expect(findingChecks.has(expectedCheck)).toBe(true);
    }
    const hasVisualCoverageAdvisory = report.editorialReviewQueue.advisories.some(
      (advisory) => advisory.check === 'visual-learning-coverage'
    );
    expect(hasVisualCoverageAdvisory).toBe(expectsVisualCoverageAdvisory);
  });
});
