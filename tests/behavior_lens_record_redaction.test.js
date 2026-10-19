import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

// Behavior Lens Record Review sent up to 30,000 characters of a pasted IEP or evaluation to the
// AI exactly as pasted: real names, dates of birth, student IDs, phone numbers. Behavior Lens only
// knows the student's codename, so the shared IdentifierRedaction could not find the real name on
// its own. The clinician now lists the names in the document (kept in component state only), and
// the text is scrubbed before it leaves the browser; structured identifiers are always removed.
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const BL = readFileSync(resolve(ROOT, process.env.BL_RECORD_MODULE || 'behavior_lens_module.js'), 'utf8');
const HELPERS = sliceBetween(BL, '    const blRecordNames = ', '    const RecordReview = ', { file: 'behavior_lens_module.js' });
const Redaction = require(resolve(ROOT, 'identifier_redaction_module.js'));

function load(withModule = true) {
  const window = { AlloModules: withModule ? { IdentifierRedaction: Redaction } : {} };
  // eslint-disable-next-line no-new-func
  return new Function('window', HELPERS + '\nreturn { blRecordNames, blRedactRecordText };')(window);
}

const DOC = [
  'Psychoeducational Evaluation for Jordan Rivera. DOB: 03/14/2015. Student ID: 4471902.',
  'Parent: Maria Rivera, (207) 555-0142, maria.rivera@example.com, 12 Elm Street.',
  'Jordan was referred by Ms. Chen after regression first noted at 18 months; reads at a 2nd grade level.',
  'Dr. Patel reviewed the results on March 3, 2026. Mark the date for the follow-up.',
].join('\n');

describe('Record Review scrubs pasted documents before they reach the AI', () => {
  it('removes the names the clinician lists, with roles kept', () => {
    const { blRedactRecordText } = load();
    const out = blRedactRecordText(DOC, 'Jordan Rivera, Maria Rivera, Ms. Chen').text;
    for (const leak of ['Jordan', 'Rivera', 'Chen']) expect(out.includes(leak), leak + ' reached the AI').toBe(false);
    expect(out).toContain('[Student]');
  });

  it('always removes structured identifiers, and keeps clinical timing', () => {
    const { blRedactRecordText } = load();
    const out = blRedactRecordText(DOC, '').text;
    for (const leak of ['03/14/2015', '4471902', '(207) 555-0142', 'maria.rivera@example.com', '12 Elm Street', 'March 3, 2026']) {
      expect(out.includes(leak), leak + ' reached the AI').toBe(false);
    }
    expect(out).toContain('at 18 months');
    expect(out).toContain('2nd grade level');
  });

  it('says what it could not remove: no student name, titled names not listed, common-word names', () => {
    const { blRedactRecordText } = load();
    const bare = blRedactRecordText(DOC, '');
    expect(bare.hasStudentName).toBe(false);
    expect(bare.unlisted).toEqual(expect.arrayContaining(['Chen', 'Patel']));
    const listed = blRedactRecordText(DOC, 'Jordan Rivera, Ms. Chen');
    expect(listed.hasStudentName).toBe(true);
    expect(listed.unlisted, 'a name the clinician listed is still reported as missed').not.toContain('Chen');
    expect(listed.unlisted).toContain('Patel');
    expect(blRedactRecordText('Mark Lee was observed. ' + DOC, 'Mark Lee').risky).toContain('Mark');
  });

  it('without the shared module it still strips listed names and patterns instead of sending raw text', () => {
    const { blRedactRecordText } = load(false);
    const out = blRedactRecordText(DOC, 'Jordan Rivera').text;
    for (const leak of ['Jordan Rivera', '(207) 555-0142', 'maria.rivera@example.com', '03/14/2015']) {
      expect(out.includes(leak), leak + ' reached the AI').toBe(false);
    }
  });

  it('parses the names field forgivingly and caps it', () => {
    const { blRecordNames } = load();
    expect(blRecordNames(' Jordan Rivera ;Maria Rivera,\nMs. Chen, , x')).toEqual(['Jordan Rivera', 'Maria Rivera', 'Ms. Chen']);
    expect(blRecordNames(Array.from({ length: 40 }, (_, i) => 'Name' + i).join(',')).length).toBe(20);
  });
});

describe('the component wiring', () => {
  const component = sliceBetween(BL, '    const RecordReview = ', '    const renderSection = ', { file: 'behavior_lens_module.js' });
  it('the prompt carries the scrubbed text, never the raw paste', () => {
    expect(component).toContain('${blRedactRecordText(text.substring(0, RECORD_REVIEW_MAX_CHARS), names).text}');
    expect(component, 'the raw paste is interpolated into the prompt again').not.toContain('${text.substring(0, RECORD_REVIEW_MAX_CHARS)}');
  });
  it('the typed names are component state only, never the durable workspace store', () => {
    expect(component).toContain("const [names, setNames] = useState('');");
    expect(component).not.toMatch(/useDurableToolState\(['"][^'"]*names/i);
  });
});
