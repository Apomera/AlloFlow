import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const moduleSource = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');
const publicModuleSource = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/doc_pipeline_module.js'), 'utf8');

function extractScanner(text) {
  const start = text.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
  const end = text.indexOf('// ── S7', start);
  if (start < 0 || end < 0) throw new Error('active-content scanner not found');
  return new Function(`${text.slice(start, end)}\nreturn _alloScanActiveContent;`)();
}

function scannerBlock(text) {
  const start = text.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
  const end = text.indexOf('var _alloWcagScFromTags', start);
  if (start < 0 || end < 0) throw new Error('active-content scanner block not found');
  return text.slice(start, end);
}

const scanActiveContent = extractScanner(source);
const PDFLibNS = { PDFName: { of: (name) => name } };
const dict = (values = {}) => ({
  get: (name) => values[name],
  keys: () => Object.keys(values),
});
const array = (values) => ({
  size: () => values.length,
  get: (index) => values[index],
});

function scan(catalogValues = {}, pages = []) {
  return scanActiveContent({
    context: { lookup: (value) => value },
    catalog: dict(catalogValues),
    getPages: () => pages,
  }, PDFLibNS);
}

describe('active-content scan completeness', () => {
  it('marks a fully examined ordinary PDF clean', () => {
    expect(scan()).toEqual({
      schema: 1,
      complete: true,
      pageScanFailures: 0,
      unexaminedStructures: 0,
      any: false,
      findings: [],
      externalLinks: 0,
    });
  });

  it('withholds forms, outlines, and nested name trees as unexamined', () => {
    const result = scan({
      AcroForm: dict(),
      Outlines: dict(),
      Names: dict({
        JavaScript: dict({ Kids: array([]) }),
      }),
    });
    expect(result.complete).toBe(false);
    expect(result.unexaminedStructures).toBe(3);
  });

  it('finds attachments, interactive media, unknown actions, and action chains', () => {
    const annotations = array([
      dict({ Subtype: '/FileAttachment' }),
      dict({ Subtype: '/RichMedia' }),
      dict({
        Subtype: '/Link',
        A: dict({ S: '/SubmitForm', Next: dict({ S: '/JavaScript' }) }),
      }),
    ]);
    const result = scan({}, [{ node: dict({ Annots: annotations }) }]);
    expect(result.complete).toBe(true);
    expect(result.findings.map((finding) => finding.type)).toEqual([
      'embedded-files',
      'other-actions',
      'multimedia',
    ]);
    expect(result.findings.find((finding) => finding.type === 'other-actions').count).toBe(2);
  });

  it('allows an ordinary URI link but fails closed on an unreadable annotation', () => {
    const link = scan({}, [{
      node: dict({
        Annots: array([dict({ Subtype: '/Link', A: dict({ S: '/URI' }) })]),
      }),
    }]);
    expect(link).toMatchObject({
      complete: true,
      any: false,
      externalLinks: 1,
    });

    const unreadable = scan({}, [{
      node: dict({ Annots: array([{}]) }),
    }]);
    expect(unreadable).toMatchObject({
      complete: false,
      pageScanFailures: 1,
    });
  });

  it('fails closed when an indirect object cannot be resolved', () => {
    class PDFRef {}
    const result = scanActiveContent({
      context: { lookup: () => { throw new Error('broken xref'); } },
      catalog: dict({ Names: new PDFRef() }),
      getPages: () => [],
    }, PDFLibNS);

    expect(result).toMatchObject({
      complete: false,
      unexaminedStructures: 1,
      any: false,
    });
  });

  it('detects catalog and page associated files and withholds portfolios', () => {
    const result = scan({
      AF: array([dict()]),
      Collection: dict(),
    }, [{
      node: dict({ AF: array([dict()]) }),
    }]);

    expect(result.complete).toBe(false);
    expect(result.unexaminedStructures).toBe(1);
    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'embedded-files',
      count: 2,
    }));
  });

  it('fails closed on present name-tree objects with unexpected shapes', () => {
    const malformedNames = scan({ Names: {} });
    expect(malformedNames).toMatchObject({
      complete: false,
      unexaminedStructures: 1,
    });

    const malformedTrees = scan({
      Names: dict({
        JavaScript: {},
        EmbeddedFiles: {},
      }),
    });
    expect(malformedTrees.complete).toBe(false);
    expect(malformedTrees.unexaminedStructures).toBe(2);
    expect(malformedTrees.findings.map((finding) => finding.type)).toEqual([
      'javascript',
      'embedded-files',
    ]);
  });

  it('fails closed on malformed annotation arrays and action dictionaries', () => {
    const malformedAnnotations = scan({}, [{
      node: dict({ Annots: { size: () => 0 } }),
    }]);
    expect(malformedAnnotations).toMatchObject({
      complete: false,
      pageScanFailures: 1,
    });

    const malformedAction = scan({}, [{
      node: dict({ Annots: array([dict({ Subtype: '/Link', A: {} })]) }),
    }]);
    expect(malformedAction).toMatchObject({
      complete: false,
      pageScanFailures: 1,
    });
  });

  it('walks nested Form XObjects once and detects associated files and actions', () => {
    const resourceValues = {};
    const formValues = {
      Subtype: '/Form',
      AF: array([dict({ Type: '/Filespec' })]),
      A: dict({ S: '/JavaScript' }),
    };
    const resources = dict(resourceValues);
    const form = { dict: dict(formValues) };
    resourceValues.XObject = dict({ SharedForm: form });
    // A self-referential resource graph is legal to encounter in hostile input.
    // The same Form must not recurse forever or be counted twice.
    formValues.Resources = resources;

    const result = scan({}, [{
      node: dict({ Resources: resources }),
    }]);

    expect(result).toMatchObject({
      complete: true,
      pageScanFailures: 0,
      unexaminedStructures: 0,
      any: true,
    });
    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'embedded-files',
      count: 1,
    }));
    expect(result.findings).toContainEqual(expect.objectContaining({
      type: 'javascript',
      count: 1,
    }));
  });

  it('walks cyclic StructElem children for associated files and action-bearing entries', () => {
    const structValues = {
      Type: '/StructElem',
      AF: array([dict({ Type: '/Filespec' })]),
      A: dict({ S: '/Launch' }),
      AA: dict({ E: dict({ S: '/JavaScript' }) }),
    };
    const structElem = dict(structValues);
    structValues.K = array([structElem]);

    const result = scan({
      StructTreeRoot: dict({ Type: '/StructTreeRoot', K: structElem }),
    });

    expect(result).toMatchObject({
      complete: true,
      pageScanFailures: 0,
      unexaminedStructures: 0,
      any: true,
    });
    expect(result.findings.map((finding) => finding.type)).toEqual([
      'launch',
      'embedded-files',
      'additional-actions',
    ]);
  });

  it('fails closed on malformed Form XObject containers and unresolved XObject refs', () => {
    const malformed = scan({}, [{
      node: dict({
        Resources: dict({
          XObject: dict({
            BrokenForm: { dict: dict({ Subtype: '/Form', AF: {} }) },
          }),
        }),
      }),
    }]);
    expect(malformed).toMatchObject({
      complete: false,
      pageScanFailures: 1,
      any: true,
    });

    class PDFRef {}
    const unresolved = scanActiveContent({
      context: { lookup: () => { throw new Error('broken XObject xref'); } },
      catalog: dict(),
      getPages: () => [{
        node: dict({
          Resources: dict({
            XObject: dict({ BrokenRef: new PDFRef() }),
          }),
        }),
      }],
    }, PDFLibNS);
    expect(unresolved).toMatchObject({
      complete: false,
      pageScanFailures: 1,
      any: false,
    });
  });

  it('fails closed on malformed, unresolved, and over-depth structure children', () => {
    const malformed = scan({
      StructTreeRoot: dict({
        K: dict({ Type: '/StructElem', AF: {} }),
      }),
    });
    expect(malformed).toMatchObject({
      complete: false,
      unexaminedStructures: 1,
      any: true,
    });

    class PDFRef {}
    const unresolved = scanActiveContent({
      context: { lookup: () => { throw new Error('broken structure xref'); } },
      catalog: dict({ StructTreeRoot: dict({ K: new PDFRef() }) }),
      getPages: () => [],
    }, PDFLibNS);
    expect(unresolved).toMatchObject({
      complete: false,
      unexaminedStructures: 1,
      any: false,
    });

    let deepKid = dict({ Type: '/StructElem' });
    for (let depth = 0; depth < 130; depth++) {
      deepKid = dict({ Type: '/StructElem', K: deepKid });
    }
    const overDepth = scan({
      StructTreeRoot: dict({ K: deepKid }),
    });
    expect(overDepth).toMatchObject({
      complete: false,
      unexaminedStructures: 1,
    });
  });

  it('keeps source/module guards and executable classifications in sync', () => {
    expect(scannerBlock(moduleSource)).toBe(scannerBlock(source));
    expect(scannerBlock(publicModuleSource)).toBe(scannerBlock(source));
    for (const text of [source, moduleSource, publicModuleSource]) {
      expect(text).toContain("if (catalog.get(nm('AcroForm'))) unexaminedStructures++;");
      expect(text).toContain("if (catalog.get(nm('Outlines'))) unexaminedStructures++;");
      expect(text).toContain("if (catalog.get(nm('Collection'))) unexaminedStructures++;");
      expect(text).toContain("var catalogAssociatedFiles = _resolve(catalog.get(nm('AF')));");
      expect(text).toContain("catch (_) { unexaminedStructures++; return null; }");
      expect(text).toContain("'other-actions': 1, multimedia: 1");
      expect(text).toContain('var MAX_REACHABLE_OBJECTS = 20000;');
      expect(text).toContain("if (subtype === '/Form')");
      expect(text).toContain("var rawStructTree = catalog.get(nm('StructTreeRoot'));");
    }
  });
});
