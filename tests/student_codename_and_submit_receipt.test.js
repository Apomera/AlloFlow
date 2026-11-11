// 2026-11-10: a student picks a codename once, is not asked for a "name" again
// at submit, and gets a receipt that stays on screen. Also: the privacy line in
// the header speaks to students in their own words, and join errors drop the
// backend names.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const MIRRORS = ['', 'desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'];

describe('submit dialog', () => {
  const src = read('student_interaction_source.jsx');
  const start = src.indexOf('const StudentSubmitModal = React.memo(');
  const modal = src.slice(start, src.indexOf('const DraftFeedbackInterface', start));

  it('sends as the codename already chosen and only shows the pickers on request', () => {
    expect(modal).toContain('const hasKnownName = !!(knownName.adj && knownName.animal);');
    expect(modal).toContain('const pickingName = !hasKnownName || changingName;');
    expect(modal).toContain('{pickingName && (');
    expect(modal).toContain('data-submit-change-codename=""');
    expect(modal).toContain("say('modals.submit_sending_as', 'Sending as')");
  });

  it('no longer asks for a "Student Name" in English', () => {
    expect(modal).not.toContain("{t('modals.student_name_label')}</label>");
    expect(modal).toContain("oldNameLabel !== 'Student Name / Nickname' ? oldNameLabel : 'Pick a codename'");
  });

  it('keeps a receipt open instead of closing on success', () => {
    expect(modal).not.toContain('if (succeeded) onClose();');
    expect(modal).toContain('if (succeeded) setReceipt({ delivery:');
    expect(modal).toContain('data-submit-receipt={receipt.delivery}');
    expect(modal).toContain('data-submit-receipt-done=""');
  });

  it('says plainly when the teacher does not have the work yet', () => {
    expect(modal).toContain("'Sent to your teacher'");
    expect(modal).toContain("'Not sent yet'");
    expect(modal).toContain('Your teacher does not have it yet');
  });

  it('cannot submit a second time from the receipt, by click or by voice', () => {
    expect(modal).toContain('if (!selectedAdj || !selectedAnimal || submitting || receipt) return false;');
    expect(modal).toContain('canSubmit: !!(selectedAdj && selectedAnimal && !submitting && !receipt),');
  });

  it('clears the receipt each time the dialog opens, on isOpen alone', () => {
    expect(modal).toContain('useEffect(() => { if (isOpen) { setChangingName(false); setReceipt(null); } }, [isOpen]);');
  });
});

describe('codename dialog', () => {
  const src = read('ui_modals_source.jsx');
  it('describes what is on screen and starts with a plain verb', () => {
    expect(src).toContain("'Choose two words to make your codename.'");
    expect(src).toContain("entryFresh('entry.start_plain', 'entry.start', 'Start New Adventure', 'Start')");
    expect(src).toContain("'Your codename'");
  });
  it('keeps an existing translation of the old wording', () => {
    expect(src).toContain('return old && old !== oldEnglish ? old : english;');
  });
});

describe('header', () => {
  const src = read('view_header_source.jsx');
  it('gives students their own privacy reminder and keeps the teacher one', () => {
    expect(src).toContain("Don't type your real name or other personal information.");
    expect(src).toContain("(!isTeacherMode && !isParentMode && !isIndependentMode)");
    expect(src).toContain("t('header.pii_warning_plain')");
  });
  it('shows the codename beside the session button on wider screens', () => {
    expect(src).toContain('data-live-status-codename=""');
  });
});

describe('join errors a student can act on', () => {
  for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
    it(f + ' has no backend names in the student join messages', () => {
      const src = read(f);
      expect(src).not.toContain('The class Firebase project refused this student device');
      expect(src).not.toContain('Anonymous student sign-in is turned off on the class Firebase project');
      expect(src).toContain('Tell your teacher: the class setup is blocking student devices.');
      expect(src).toContain('Tell your teacher: student sign-in is turned off in the class setup.');
    }, 60000);
  }
});

describe('built modules', () => {
  for (const [name, needle] of [
    ['student_interaction_module.js', 'data-submit-receipt-done'],
    ['ui_modals_module.js', 'Choose two words to make your codename.'],
    ['view_header_module.js', 'data-live-status-codename'],
  ]) {
    it(name + ' carries the change in all four copies', () => {
      const first = read(name);
      expect(first).toContain(needle);
      for (const dir of MIRRORS) expect(read(dir + name) === first, dir + name).toBe(true);
    }, 60000);
  }
});
