import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('ui_modals_source.jsx', 'utf8');
const moduleText = fs.readFileSync('ui_modals_module.js', 'utf8');

describe('Shared UI modal accessibility', () => {
  it('exposes Teacher Gate as a named and described Escape-dismissible dialog', () => {
    expect(source).toContain('useFocusTrap(gateRef, isOpen, closeGate)');
    expect(source).toContain('data-allo-ui-modal="teacher-gate"');
    expect(source).toContain('aria-labelledby="teacher-gate-title"');
    expect(source).toContain('aria-describedby="teacher-gate-helper"');
    expect(source).toContain('aria-invalid={Boolean(error)}');
    expect(source).toContain('aria-labelledby="teacher-gate-access-code-label"');
    expect(source).toContain("aria-describedby={error ? 'teacher-gate-helper teacher-gate-error' : 'teacher-gate-helper'}");
  });

  it('renders the password error only when present and announces it', () => {
    expect(source).toContain('{error && (');
    expect(source).not.toContain('{String(error) && (');
    expect(source).toContain('id="teacher-gate-error" role="alert"');
  });

  it('uses visible role and microphone names and announces microphone state', () => {
    expect(source).not.toContain("aria-label={t('common.like')}");
    expect(source).not.toContain("aria-label={t('common.confirm')}");
    expect(source).toContain('<p id="role-mic-status" className="sr-only" role="status" aria-live="polite" aria-atomic="true">');
    expect(source).toContain("micStatus === 'requesting' ? <RefreshCw aria-hidden=\"true\"");
    for (const fallback of [
      "roleCopy('roles.title', 'Welcome to AlloFlow')",
      "roleCopy('roles.subtitle', 'How will you be using the app today?')",
      "roleCopy('roles.student', 'Student')",
      "roleCopy('roles.teacher', 'Teacher')",
      "roleCopy('roles.parent', 'Parent')",
      "roleCopy('roles.independent', 'Independent Learner')",
    ]) expect(source).toContain(fallback);
  });

  // 2026-09-13: only the Parent card explained itself; the other three looked unfinished next
  // to it. Every card now carries one line, and the line reads the same key in ui_strings.
  it('gives every role card a description whose fallback matches ui_strings', () => {
    const strings = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
    const expected = {
      'roles.student_description': strings.roles.student_description,
      'roles.teacher_description': strings.roles.teacher_description,
      'parent_mode.role_description': strings.parent_mode.role_description,
      'roles.independent_description': strings.roles.independent_description,
    };
    for (const [key, english] of Object.entries(expected)) {
      expect(english, key).toBeTruthy();
      expect(source).toContain(`roleDescription('${key}', '${english}')`);
      expect(moduleText).toContain(english);
    }
    // The old one-off Parent span (slate-500: 4.26:1 on the indigo hover tint) is gone.
    expect(source).not.toContain("t('parent_mode.role_description') ||");
    expect(source).toContain('text-xs leading-snug text-slate-600 text-center max-w-[13rem]');
    // The remembered-role badge is offered on every card the host can remember, Student included.
    for (const role of ['student', 'teacher', 'parent', 'independent']) expect(source).toContain(`lastTimeBadge('${role}')`);
  });

  it('hands role-selection Voice Access to the host coordinator without a second recognizer', () => {
    expect(source).toContain('const RoleSelectionModal = React.memo(({ onSelect, onGateRequired, onStartVoiceAccess }) => {');
    expect(source).toContain("if (typeof onStartVoiceAccess === 'function') {");
    expect(source).toContain('const started = await onStartVoiceAccess();');
    expect(source).toContain("setMicStatus(started === false ? 'denied' : 'granted');");
    expect(source).toContain('// Safe legacy fallback: probe permission only when the host has not');
    expect(source.indexOf("if (typeof onStartVoiceAccess === 'function') {")).toBeLessThan(
      source.indexOf('const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;'),
    );
    expect(source).toContain("roleCopy('roles.voice_access_enable', 'Enable Voice Access')");
    expect(source).toContain('continuous voice command listening starts');
    expect(source).toContain('Voice Access is optional; touch, pointer, and keyboard remain available.');
  });

  it('names Student Entry and Welcome and connects Escape to their focus traps', () => {
    expect(source).toContain('useFocusTrap(entryRef, isOpen, onClose)');
    expect(source).toContain('aria-labelledby="student-entry-title"');
    expect(source).toContain('aria-describedby="student-entry-description"');
    expect(source).toContain('useFocusTrap(welcomeRef, isOpen, onClose)');
    expect(source).toContain('aria-labelledby="student-welcome-title"');
    expect(source).toContain('aria-describedby="student-welcome-description"');
  });

  it('announces codename changes and preserves visible button names', () => {
    expect(source).toContain('min-w-0 flex-grow break-words text-start text-xl');
    expect(source).toContain('tracking-tight me-2" role="status" aria-live="polite"');
    expect(source).not.toContain('tracking-tight truncate mr-2" role="status"');
    expect(source).not.toContain("aria-label={t('common.generate')}");
    expect(source).not.toContain("aria-label={t('common.upload')}");
    expect(source).toContain('mt-4 min-h-6 inline-flex items-center');
  });

  it('gives every modal strong focus, reduced-motion, forced-colors, target, and reflow safeguards', () => {
    expect(source).toContain('outline: 3px solid #0f172a !important');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('max-h-[calc(100vh-2rem)] overflow-y-auto');
    expect(source).toContain('grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2');
    expect(source).toContain('className="w-full min-h-11');
  });

  it('preserves all five runtime exports and deploy parity', () => {
    for (const name of ['StudentQuizOverlay', 'TeacherGate', 'RoleSelectionModal', 'StudentEntryModal', 'StudentWelcomeModal']) {
      expect(moduleText).toContain(`window.AlloModules.${name} = ${name}`);
    }
    expect(fs.readFileSync('desktop/web-app/public/ui_modals_module.js', 'utf8')).toBe(moduleText);
  });
});
