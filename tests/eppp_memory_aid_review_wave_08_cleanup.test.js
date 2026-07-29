import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const domainPaths = Array.from({ length: 8 }, (_, index) =>
  `dev-tools/eppp_memory_aid_wave08/domain_0${index + 1}.json`);
const modules = domainPaths.map(read);
const items = modules.flatMap((module) => module.items);
const byId = new Map(items.map((item) => [item.legacyId, item]));
const sha256 = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

const sourceFragmentsById = {
  'memory-aid-b3a772bd778ae61d': ['NBK621611'],
  'memory-aid-40c0a030c7b41c9f': ['stages-of-sleep', '/4-introduction'],
  'memory-aid-b3ba39b4891aa7b7': ['17739108', 'frames-of-mind/9781541608528', '10.1016/j.intell.2006.04.001'],
  'memory-aid-5081c24a4375de71': ['CBO9780511571312', '10.1016/j.intell.2008.08.004', '17739108'],
  'memory-aid-a1e18632c095ece7': ['overcoming-cognitive-biases', 'science.185.4157.1124', '7455683', '10626367'],
  'memory-aid-cc8866807d4bf8bb': ['11-2-freud-and-the-psychodynamic-perspective'],
  'memory-aid-ad5470dbbffc45c8': ['6356198', '0022-3514.37.6.822'],
  'memory-aid-c8d858e2dc0f281e': ['h0076486', '12-1-what-is-social-psychology'],
  'memory-aid-5f71d0b69480ed77': ['7-3-process-theories-of-motivation', '0003-066X.55.1.68'],
  'memory-aid-c1b6abe0825db31b': ['scientificamerican1155-31', '002200275800200106'],
  'memory-aid-02a8d4d16e083c7b': ['12-3-attitudes-and-persuasion', 'changing-attitudes-by-changing-behavior', '0022-3514.41.5.847'],
  'memory-aid-72621809ea1d4230': ['0033-2909.127.3.376', '7-3-process-theories-of-motivation', '0030-5073(76)90016-7', '0003-066X.55.1.68', '0003-066X.57.9.705'],
  'memory-aid-e33b99c2b0aa1617': ['MIND_IN_SOCIETY', '932126'],
  'memory-aid-6290d6a3345d5317': ['9-2-lifespan-theories'],
  'memory-aid-ca270c0741c0028e': ['3rd%20Edition-%20final.pdf'],
  'memory-aid-5e244915b5dd5317': ['3rd%20Edition-%20final.pdf'],
  'memory-aid-febc6d1a31a94702': ['h0022100', 'FqGLDwAAQBAJ'],
  'memory-aid-4a299b4f3974dac2': ['pr0.2003.92.1.235', 'jclp.21908'],
  'memory-aid-fdf0a2fb0c99325e': ['DBT-Skills-Training-Manual', '1845222'],
  'memory-aid-8e3710bff03d7b78': ['psychiatryint5040069', '34449043'],
  'memory-aid-4fd6c7da62d0bebc': ['prc433.htm', 'features/anova-manova'],
  'memory-aid-7d2f96a594eead04': ['PMC7883798'],
  'memory-aid-bb66fe8fb6f02c1d': ['11-5-comparison-of-the-chi-square-tests'],
  'memory-aid-a61cdd6e3cd02ea2': ['1-3-frequency-frequency-tables-and-levels-of-measurement'],
  'memory-aid-b557559dc2425242': ['PMC8572982', 'PMC5079093'],
  'memory-aid-0ca3b7179ab743d4': ['what-statistical-analysis-should-i-use', 'multivariate-statistics-reference-manual'],
  'memory-aid-221c8e94619ab7ee': ['guidelines-supervision.pdf', '9781118846360.ch28', '1979.tb00906.x', 'clinical-supervision-second-edition'],
  'memory-aid-918e1bfb5f9c81b2': ['guidelines-supervision.pdf', '9781118846360.ch28', '1979.tb00906.x', 'clinical-supervision-second-edition', '1998.tb00554.x'],
  'memory-aid-bbb9d9d6f991a7fc': ['psychologyboard.gov.au/Standards-and-Guidelines/FAQ/Code-of-conduct', 'apa.org/ethics/code'],
};

const forbiddenSources = [
  'https://www.nibib.nih.gov/science-education/science-topics/medical-imaging',
  'https://doi.org/10.1017/CBO9780511627082',
  'https://books.google.com/books?id=_Qd3AAAAQBAJ',
  'https://doi.org/10.1177/0734282909332278',
  'https://doi.org/10.1146/annurev.ps.37.020186.002351',
  'https://doi.org/10.1037/0033-2909.82.2.213',
  'https://www.sfbta.org/resources/Documents/SFBT_Revised_Treatment_Manual_2013.pdf',
  'https://www.cdc.gov/epi-info/php/user-guide/statcalc/index.html',
];

describe('EPPP memory-aid Wave 08 audited cleanup', () => {
  it('keeps the fixed IDs, counts, provenance contract, and conservative release gates', () => {
    expect(modules.map((module) => module.items.length)).toEqual([13, 21, 15, 16, 25, 27, 19, 13]);
    expect(items).toHaveLength(149);
    expect(new Set(items.map((item) => item.legacyId)).size).toBe(149);
    for (const item of items) {
      expect(item.references, item.legacyId).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.independentExpertStatus, item.legacyId).toBe('not-started');
      expect(item.productionStatus, item.legacyId).toBe('not-production-validated');
    }
  });

  it('removes all eight dead or mispointed URLs and pins direct sources for every audited gap', () => {
    const allUrls = new Set(items.flatMap((item) => item.references));
    for (const url of forbiddenSources) expect(allUrls.has(url), url).toBe(false);
    for (const [id, fragments] of Object.entries(sourceFragmentsById)) {
      const references = byId.get(id)?.references ?? [];
      for (const fragment of fragments) {
        expect(references.some((url) => url.includes(fragment)), `${id}: ${fragment}`).toBe(true);
      }
    }
  });

  it('preserves all repaired possessives in learner and provenance copy', () => {
    const serialized = JSON.stringify(items);
    expect(serialized).not.toMatch(/Carrolls|Tuckmans|Frankls|Yaloms|Minuchins|Becks|the persons beliefs|the clients|one theorists/);
    expect(JSON.stringify(byId.get('memory-aid-5081c24a4375de71'))).toContain("Carroll's foundational scholarly synthesis");
    expect(JSON.stringify(byId.get('memory-aid-febc6d1a31a94702'))).toContain("Tuckman's foundational peer-reviewed review");
    expect(byId.get('memory-aid-8e3710bff03d7b78').content).toContain("Frankl's paradoxical intention");
    expect(byId.get('memory-aid-29c7e0bde6aced0a').content).toContain("Yalom's organizing concerns");
    expect(JSON.stringify(byId.get('memory-aid-29c7e0bde6aced0a').sourceDetails)).toContain("Yalom's primary scholarly text");
    expect(JSON.stringify(byId.get('memory-aid-86bbf1e2190692a0'))).toContain("Minuchin's primary scholarly text");
    expect(JSON.stringify(byId.get('memory-aid-447e44206fc38e31'))).toContain("Beck's primary scholarly text");
    expect(byId.get('memory-aid-4a299b4f3974dac2').content).toContain("the person's beliefs");
    expect(byId.get('memory-aid-71234ee8bcfa9e14').content).toContain("the client's moment-to-moment response");
    expect(JSON.stringify(byId.get('memory-aid-cfc8bb910d8b863f'))).toContain("one theorist's language");
    expect(byId.get('memory-aid-5e244915b5dd5317').content).toContain("the client's language");
    expect(byId.get('memory-aid-ca270c0741c0028e').content).toContain("the client's language");
  });

  it('uses explicit DSM-5-TR learner titles without changing stable IDs', () => {
    expect(byId.get('memory-aid-1c6c42c0298ca5f4').title).toBe('Anxiety, OCD & Trauma: DSM-5-TR Chapter Map');
    expect(byId.get('memory-aid-482b603596c65a36').title).toBe('Personality-Disorder Clusters: DSM-5-TR Map');
    expect(byId.get('memory-aid-c03593684f409ca7').title).toBe('Substance Use Disorder: DSM-5-TR Framework');
  });

  it('separates rater-error recognition from performance-rating measurement quality', () => {
    const raterErrors = byId.get('memory-aid-d0a767ba6ab53439');
    const measurementQuality = byId.get('memory-aid-837304de54d62f68');
    expect(raterErrors.title).toBe('Performance Appraisal Rater Errors');
    expect(measurementQuality.title).toBe('Performance Rating Measurement Quality');
    expect(raterErrors.content).toContain('frame-of-reference training');
    expect(measurementQuality.content).toContain('construct underrepresentation');
    expect(raterErrors.references).toEqual(['https://www.opm.gov/policy-data-oversight/performance-management/']);
    expect(measurementQuality.references).toEqual([
      'https://www.testingstandards.net/open-access-files.html',
      'https://www.opm.gov/policy-data-oversight/performance-management/',
    ]);
    const tokens = (content) => new Set(content.toLowerCase().match(/[a-z]{4,}/g) ?? []);
    const first = tokens(raterErrors.content);
    const second = tokens(measurementQuality.content);
    const intersection = [...first].filter((token) => second.has(token)).length;
    expect(intersection / new Set([...first, ...second]).size).toBeLessThan(0.2);
  });

  it('rebuilds twice byte-identically from the current postbuild catalog in a disposable fixture', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-wave08-cleanup-'));
    const tempTools = path.join(tempRoot, 'dev-tools');
    const tempModuleRoot = path.join(tempTools, 'eppp_memory_aid_wave08');
    const tempPrep = path.join(tempRoot, 'test_prep');
    const tempCatalog = path.join(tempPrep, 'eppp_learning_library.json');
    const tempOutput = path.join(tempPrep, 'eppp_memory_aid_review_wave_08.json');
    const pipeline = [
      'build_domain_01_02.cjs',
      'refine_domain_02_comparison_sources.cjs',
      'build_domain_03_04.cjs',
      'refine_domain_03_combined_sources.cjs',
      'build_domain_05.cjs',
      'build_domain_06.cjs',
      'build_domain_07_08.cjs',
      'refine_domain_07_internal_validity_source.cjs',
      'normalize_completed_modules_ascii.cjs',
    ];
    const relativeTargets = [...domainPaths, 'test_prep/eppp_memory_aid_review_wave_08.json'];
    try {
      fs.mkdirSync(tempTools, { recursive: true });
      fs.mkdirSync(tempPrep, { recursive: true });
      fs.cpSync(resolve(process.cwd(), 'dev-tools/eppp_memory_aid_wave08'), tempModuleRoot, { recursive: true });
      fs.copyFileSync(
        resolve(process.cwd(), 'dev-tools/compose_eppp_memory_aid_review_wave_08.cjs'),
        path.join(tempTools, 'compose_eppp_memory_aid_review_wave_08.cjs'),
      );
      fs.copyFileSync(resolve(process.cwd(), 'test_prep/eppp_learning_library.json'), tempCatalog);
      const run = () => {
        for (const script of pipeline) {
          execFileSync(process.execPath, [path.join(tempModuleRoot, script)], { cwd: tempRoot, stdio: 'pipe' });
        }
        execFileSync(process.execPath, [path.join(tempTools, 'compose_eppp_memory_aid_review_wave_08.cjs')], {
          cwd: tempRoot,
          env: { ...process.env, EPPP_WAVE08_CATALOG_PATH: tempCatalog, EPPP_WAVE08_OUTPUT_PATH: tempOutput },
          stdio: 'pipe',
        });
      };
      const hashes = (root) => Object.fromEntries(relativeTargets.map((relativePath) => [
        relativePath,
        sha256(path.join(root, relativePath)),
      ]));
      run();
      const first = hashes(tempRoot);
      expect(first).toEqual(hashes(process.cwd()));
      run();
      expect(hashes(tempRoot)).toEqual(first);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 20_000);
});