import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_lifeskills.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const PUBLIC_ROOT_FILE = 'desktop/web-app/public/stem_tool_lifeskills.js';
const MODULE_FILES = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
];
const BUILD_FILE = 'build.js';
const TOOL_ID = 'lifeSkills';

function read(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function loadLifeSkills() {
  resetStemLab();
  return loadTool(FILE, TOOL_ID);
}

function renderLifeSkills(state) {
  loadLifeSkills();
  return renderTool(TOOL_ID, state || { lifeSkills: {} });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Life Skills Lab visibility', () => {
  it('keeps source and public copies aligned', () => {
    const source = read(FILE);

    expect(read(PUBLIC_FILE)).toBe(source);
    expect(read(PUBLIC_ROOT_FILE)).toBe(source);
  });

  it('is present in the STEM Lab tool picker and plugin fallback list', () => {
    for (const moduleFile of MODULE_FILES) {
      const source = read(moduleFile);

      expect(source).toContain("id: 'lifeSkills'");
      expect(source).toContain("label: 'Life Skills Lab'");
      expect(source).toContain('lifeSkills: true');
      expect(source).toContain('/* lifeSkills: removed -- see stem_tool_lifeskills.js */');
    }
  });

  it('is included in the deploy plugin file manifest', () => {
    expect(read(BUILD_FILE)).toContain("'stem_lab/stem_tool_lifeskills.js'");
  });

  it('registers and renders the user-facing lab workspace', () => {
    const cfg = loadLifeSkills();
    expect(cfg.title).toBe('Life Skills Lab');
    expect(cfg.category).toBe('Life Skills');
    expect(cfg.ready).toBe(true);

    const html = renderLifeSkills();
    expect(html).toContain('Life Skills Lab');
    expect(html).toContain('Start Here');
    expect(html).toContain('Paycheck');
    expect(html).toContain('Insurance');
    expect(html).toContain('Records');
    expect(html).toContain('Transportation');
    expect(html).toContain('Job Readiness');
    expect(html).toContain('Resume Builder');
    expect(html).toContain('Proof Locker');
    expect(html).toContain('Interview Studio');
    expect(html).toContain('Communication');
    expect(html).toContain('Time Management');
    expect(html).toContain('Dental Care');
    expect(html).toContain('Body Care');
    expect(html).toContain('Sleep &amp; Energy');
    expect(html).toContain('Meds &amp; Labels');
    expect(html).toContain('Appointments');
    expect(html).toContain('Home Safety');
    expect(html).toContain('Digital Safety');
    expect(html).toContain('Food Confidence');
    expect(html).toContain('Laundry Lab');
  });

  it('renders the Start Here dashboard as the default landing view', () => {
    const html = renderLifeSkills();

    expect(html).toContain('data-lifeskills-overview="true"');
    expect(html).toContain('What do you want to practice today?');
    expect(html).toContain('Money basics');
    expect(html).toContain('Health routines');
    expect(html).toContain('Home confidence');
    expect(html).toContain('10-minute money check');
    expect(html).toContain('Digital safety scan');
    expect(html).toContain('Paperwork quick sort');
    expect(html).toContain('Trip plan check');
    expect(html).toContain('Job readiness check');
    expect(html).toContain('Resume builder check');
    expect(html).toContain('Proof locker check');
    expect(html).toContain('Interview practice check');
    expect(html).toContain('Communication reset');
    expect(html).toContain('Time plan reset');
    expect(html).toContain('Body comfort reset');
    expect(html).toContain('Food confidence check');
    expect(html).toContain('Appointment prep');
    expect(html).toContain('Home safety check');
    expect(html).toContain('Sleep wind-down');
    expect(html).toContain('Medication label check');
    expect(html).toContain('Daily care reset');
    expect(html).toContain('data-lifeskills-action-plan="true"');
    expect(html).toContain('My Life Skills Plan');
    expect(html).toContain('Pick one focus and one next step');
  });

  it('renders the dental care Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'dental' } });

    expect(html).toContain('data-lifeskills-dental-care="true"');
    expect(html).toContain('Dental Care Lab');
    expect(html).toContain('Daily routine builder');
    expect(html).toContain('Tooth trouble decisions');
    expect(html).toContain('Dental plan math');
    expect(html).toContain('Snack and drink risk check');
    expect(html).toContain('professional dental guidance');
  });

  it('renders the body care and ergonomics Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'bodycare' } });

    expect(html).toContain('data-lifeskills-body-care="true"');
    expect(html).toContain('Body Care &amp; Ergonomics Lab');
    expect(html).toContain('Comfort check');
    expect(html).toContain('Setup builder');
    expect(html).toContain('Body-care decisions');
    expect(html).toContain('Reset routine cards');
    expect(html).toContain('Educational practice only');
  });

  it('renders the sleep and energy Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'sleep' } });

    expect(html).toContain('data-lifeskills-sleep-energy="true"');
    expect(html).toContain('Sleep &amp; Energy Lab');
    expect(html).toContain('Wind-down routine builder');
    expect(html).toContain('Bedtime calculator');
    expect(html).toContain('Sleep and energy decisions');
    expect(html).toContain('Daytime energy supports');
    expect(html).toContain('Educational practice only');
  });

  it('renders the medication labels Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'meds' } });

    expect(html).toContain('data-lifeskills-medication-labels="true"');
    expect(html).toContain('Medication &amp; Labels Lab');
    expect(html).toContain('Label safety checklist');
    expect(html).toContain('Mock label decoder');
    expect(html).toContain('Medication label decisions');
    expect(html).toContain('Questions to ask');
    expect(html).toContain('mock labels, not dosing instructions');
  });

  it('renders the appointments and self-advocacy Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'appointments' } });

    expect(html).toContain('data-lifeskills-appointments="true"');
    expect(html).toContain('Appointments &amp; Self-Advocacy Lab');
    expect(html).toContain('Appointment prep checklist');
    expect(html).toContain('Appointment type planner');
    expect(html).toContain('Appointment decisions');
    expect(html).toContain('Self-advocacy script builder');
    expect(html).toContain('Urgent symptoms or safety concerns');
  });

  it('renders the home safety Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'homesafety' } });

    expect(html).toContain('data-lifeskills-home-safety="true"');
    expect(html).toContain('Home Safety Lab');
    expect(html).toContain('Home safety checklist');
    expect(html).toContain('Home safety decisions');
    expect(html).toContain('First-aid decision cards');
    expect(html).toContain('Emergency plan builder');
    expect(html).toContain('immediate danger');
  });

  it('renders the digital safety Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'digitalsafety' } });

    expect(html).toContain('data-lifeskills-digital-safety="true"');
    expect(html).toContain('Digital Safety Lab');
    expect(html).toContain('Digital safety checklist');
    expect(html).toContain('Digital safety decisions');
    expect(html).toContain('Scam signal cards');
    expect(html).toContain('Privacy and recovery plan');
    expect(html).toContain('block/report');
  });

  it('renders the food confidence Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'foodconfidence' } });

    expect(html).toContain('data-lifeskills-food-confidence="true"');
    expect(html).toContain('Food Confidence Lab');
    expect(html).toContain('Food confidence checklist');
    expect(html).toContain('Leftover and storage decisions');
    expect(html).toContain('Storage confidence cards');
    expect(html).toContain('Budget meal builder');
    expect(html).toContain('Simple nutrition label practice');
    expect(html).toContain('When in doubt');
  });

  it('renders the records and paperwork Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'records' } });

    expect(html).toContain('data-lifeskills-records-paperwork="true"');
    expect(html).toContain('Records &amp; Paperwork Lab');
    expect(html).toContain('Records checklist');
    expect(html).toContain('Paperwork decisions');
    expect(html).toContain('Document type cards');
    expect(html).toContain('Form field decoder');
    expect(html).toContain('Paperwork plan builder');
    expect(html).toContain('Ask before sharing or signing');
  });

  it('renders the transportation and navigation Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'transport' } });

    expect(html).toContain('data-lifeskills-transportation="true"');
    expect(html).toContain('Transportation &amp; Navigation Lab');
    expect(html).toContain('Trip readiness checklist');
    expect(html).toContain('Route and delay decisions');
    expect(html).toContain('Transportation mode cards');
    expect(html).toContain('Map and sign decoder');
    expect(html).toContain('Trip plan builder');
    expect(html).toContain('backup plan');
  });

  it('renders the job readiness Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'workreadiness' } });

    expect(html).toContain('data-lifeskills-job-readiness="true"');
    expect(html).toContain('Job Readiness &amp; Workplace Basics Lab');
    expect(html).toContain('Job readiness checklist');
    expect(html).toContain('Workplace decisions');
    expect(html).toContain('Workplace basics cards');
    expect(html).toContain('Interview practice cards');
    expect(html).toContain('Work readiness plan builder');
    expect(html).toContain('Ask a clarifying question');
  });

  it('renders the resume builder Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'resumebuilder' } });

    expect(html).toContain('data-lifeskills-resume-builder="true"');
    expect(html).toContain('Resume Builder &amp; Evidence Review Lab');
    expect(html).toContain('Resume readiness checklist');
    expect(html).toContain('Resume decisions');
    expect(html).toContain('Evidence bullet builder');
    expect(html).toContain('Resume section cards');
    expect(html).toContain('Bullet examples');
    expect(html).toContain('Literature review cards');
    expect(html).toContain('NACE');
    expect(html).toContain('O*NET');
    expect(html).toContain('Applicant tracking system');
  });

  it('renders the proof locker Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'prooflocker' } });

    expect(html).toContain('data-lifeskills-proof-locker="true"');
    expect(html).toContain('Portfolio &amp; Proof Locker Lab');
    expect(html).toContain('Proof locker checklist');
    expect(html).toContain('Proof decisions');
    expect(html).toContain('Proof item builder');
    expect(html).toContain('Proof type cards');
    expect(html).toContain('Proof quality cards');
    expect(html).toContain('Share-level cards');
    expect(html).toContain('Portfolio share packet');
    expect(html).toContain('Privacy first');
  });

  it('renders the interview practice studio Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'interviewstudio' } });

    expect(html).toContain('data-lifeskills-interview-studio="true"');
    expect(html).toContain('data-lifeskills-interview-practice-plan="true"');
    expect(html).toContain('data-lifeskills-interview-rehearsal="true"');
    expect(html).toContain('data-lifeskills-interview-proof-matcher="true"');
    expect(html).toContain('data-lifeskills-interview-day-sheet="true"');
    expect(html).toContain('data-lifeskills-interview-prep-packet="true"');
    expect(html).toContain('Interview Practice Studio');
    expect(html).toContain('Interview practice plan');
    expect(html).toContain('5-10 minute routine');
    expect(html).toContain('Practice plan progress');
    expect(html).toContain('Use coaching feedback');
    expect(html).toContain('Save practice plan');
    expect(html).toContain('Daily practice steps');
    expect(html).toContain('Interview practice plan progress');
    expect(html).toContain('Calm rehearsal coach');
    expect(html).toContain('Practice pace, confidence, and support scripts');
    expect(html).toContain('Confidence before practice');
    expect(html).toContain('Answer length target');
    expect(html).toContain('Support script');
    expect(html).toContain('Save rehearsal note');
    expect(html).toContain('Use script in chat');
    expect(html).toContain('Question-to-proof matcher');
    expect(html).toContain('Pick the evidence before answering');
    expect(html).toContain('Proof item or real example');
    expect(html).toContain('Answer cue');
    expect(html).toContain('Save proof cue');
    expect(html).toContain('Use cue in chat');
    expect(html).toContain('Question-to-proof cue');
    expect(html).toContain('Interview day run sheet');
    expect(html).toContain('Before, during, after checklist');
    expect(html).toContain('Arrival/tech plan');
    expect(html).toContain('Materials note');
    expect(html).toContain('Backup/access plan');
    expect(html).toContain('Save run sheet');
    expect(html).toContain('Interview prep checklist');
    expect(html).toContain('Interview decisions');
    expect(html).toContain('Persona-style practice chat');
    expect(html).toContain('Auto-read off');
    expect(html).toContain('Guided mode');
    expect(html).toContain('Suggested responses');
    expect(html).toContain('Mock interview conversation');
    expect(html).toContain('Interview question bank');
    expect(html).toContain('STAR answer builder');
    expect(html).toContain('Interview reflection');
    expect(html).toContain('Interview prep packet');
    expect(html).toContain('Printable/exportable interview sheet');
    expect(html).toContain('Packet preview');
    expect(html).toContain('Save packet');
    expect(html).toContain('Copy packet');
    expect(html).toContain('Download .txt');
    expect(html).toContain('Open print view');
    expect(html).toContain('Save transcript');
  });

  it('renders the communication and conflict Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'communication' } });

    expect(html).toContain('data-lifeskills-communication="true"');
    expect(html).toContain('Communication &amp; Conflict Basics Lab');
    expect(html).toContain('Communication checklist');
    expect(html).toContain('Conversation decisions');
    expect(html).toContain('Message tone cards');
    expect(html).toContain('Boundary and repair cards');
    expect(html).toContain('Conversation plan builder');
    expect(html).toContain('Get trusted support');
  });

  it('renders the time management Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'timemanagement' } });

    expect(html).toContain('data-lifeskills-time-management="true"');
    expect(html).toContain('Time Management &amp; Planning Lab');
    expect(html).toContain('Time management checklist');
    expect(html).toContain('Planning and deadline decisions');
    expect(html).toContain('Priority cards');
    expect(html).toContain('Planning tool cards');
    expect(html).toContain('Time plan builder');
    expect(html).toContain('Next step plus recovery');
  });
});
