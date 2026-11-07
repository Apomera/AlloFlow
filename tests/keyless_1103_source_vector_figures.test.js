// A tagged source's own VECTOR figure (2026-11-03, civics: the USCIS logo drawn as paths inside
// "/Figure <</MCID 58>> BDC ... EMC"). _alloSourceVectorFigures finds such sections so Stage 4c can mark
// them like a vector Form drawing; before, their paths became /Artifact and the HTML's logo figure orphaned.
// The real source is sliced out; ALLO_PIPELINE_SOURCE points it at a private copy for mutation checks.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const find = new Function(sliceBetween(SRC, 'var _alloSourceVectorFigures = function', '\n};', { file: 'doc_pipeline_source.jsx', includeEnd: true })
  + '\nreturn _alloSourceVectorFigures;')();

// ~40 path segments, as a logo draws; the input is MASKED (strings blanked), as Stage 4c passes it
const PATHS = 'q 1 0 0 1 456.39 748.80 cm\n0 0 m\n' + Array.from({ length: 40 }, (_, i) => (i * 1.5).toFixed(3) + ' ' + (-i * 0.75).toFixed(3) + ' l').join('\n') + '\nh\nf\nQ\n';
// the source's MCID is already blanked (equal length) when Stage 4c runs
const FIG = (body) => '/Figure <<         >>BDC \n/PlacedGraphic BMC \nEMC \n' + body + 'EMC \n';

describe('_alloSourceVectorFigures', () => {
  it('finds the civics shape: a painted vector section the source tags /Figure', () => {
    const s = 'BT\n/TT2 1 Tf\n(         )Tj\nET\n' + FIG(PATHS);
    const out = find(s);
    expect(out).toHaveLength(1);
    expect(s.slice(out[0].start, out[0].headEnd)).toBe('/Figure <<         >>BDC');
    expect(s.slice(out[0].end - 3, out[0].end)).toBe('EMC');
    expect(s.slice(out[0].end - 30, out[0].end)).toContain('Q\nEMC');
  });
  it('a BMC figure counts too, and only the OUTERMOST of nested figures is returned', () => {
    expect(find('/Figure BMC\n' + PATHS + 'EMC\n')).toHaveLength(1);
    const nested = find('/Figure <<>> BDC\n' + PATHS + '/Figure <<>> BDC\n' + PATHS + 'EMC\nEMC\n');
    expect(nested).toHaveLength(1);
    expect(nested[0].start).toBe(0);
  });
  it('leaves alone a figure that shows text, calls an XObject, only clips, is tiny, or sits in an /Artifact', () => {
    expect(find(FIG(PATHS + 'BT\n/F1 12 Tf\n(  )Tj\nET\n'))).toEqual([]);
    expect(find(FIG(PATHS + '/Im0 Do\n'))).toEqual([]);
    expect(find(FIG(PATHS.replace('\nh\nf\n', '\nW n\n')))).toEqual([]);
    expect(find(FIG('q 0 0 m 10 10 l S Q\n'))).toEqual([]);
    expect(find('/Artifact BMC\n' + FIG(PATHS) + 'EMC\n')).toEqual([]);
  });
  it('another tag is not a figure', () => {
    expect(find('/Span <<>> BDC\n' + PATHS + 'EMC\n')).toEqual([]);
  });
});
