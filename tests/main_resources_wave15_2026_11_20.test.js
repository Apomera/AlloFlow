import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

let host, root;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = root = null;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  delete window.__alloStudentAiDisabled;
  delete window.__alloAiSecretsLocked;
});

describe('Wave 15: Shell Stacking, Focus Traps, AI-Off Parity & IME Safety', () => {
  it('view_project_settings: resets studentByokAdultsConfirmed on off, normalizes presetMatches, and isolates siblings', async () => {
    loadAlloModule('view_project_settings_module.js');
    const ProjectSettingsView = window.AlloModules.ProjectSettingsView;
    const sibling = document.createElement('div');
    sibling.id = 'wave15-bg-sibling';
    host = document.createElement('div');
    document.body.append(sibling, host);
    root = createRoot(host);

    const onClose = vi.fn();
    let latestSettings = {
      allowStudentByokAi: true,
      studentByokAdultsConfirmed: true,
      workStoryEnabled: false,
      adventurePermissions: {},
    };
    function Harness() {
      const [settings, setSettings] = React.useState(latestSettings);
      latestSettings = settings;
      return React.createElement(ProjectSettingsView, {
        t: () => '',
        studentProjectSettings: settings,
        setStudentProjectSettings: setSettings,
        isTeacherMode: true,
        isParentMode: false,
        isIndependentMode: false,
        handleSetIsProjectSettingsOpenToFalse: onClose,
      });
    }
    await act(async () => root.render(React.createElement(Harness)));
    expect(sibling.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    // Unchecking allowStudentByokAi must also clear studentByokAdultsConfirmed
    const byokToggle = host.querySelector('#proj-allow-student-byok-ai');
    expect(byokToggle).not.toBeNull();
    await act(async () => byokToggle.click());
    expect(latestSettings.allowStudentByokAi).toBe(false);
    expect(latestSettings.studentByokAdultsConfirmed).toBe(false);
    // Balanced preset matches even when individual fields are undefined (normalized defaults)
    const balancedBtn = [...host.querySelectorAll('button')].find(b => /balanced/i.test(b.textContent));
    expect(balancedBtn?.getAttribute('aria-pressed')).toBe('true');
    sibling.remove();
  });

  it('view_xp_modal: isolates nested ancestor siblings, not just document.body children', async () => {
    loadAlloModule('view_xp_modal_module.js');
    const XPModal = window.AlloModules.XPModal.XPModal || window.AlloModules.XPModal;
    const wrapper = document.createElement('div');
    const appContent = document.createElement('main');
    host = document.createElement('div');
    wrapper.append(appContent, host);
    document.body.appendChild(wrapper);
    root = createRoot(host);

    await act(async () => root.render(React.createElement(XPModal, {
      currentLevelXP: 50,
      globalLevel: 2,
      globalPoints: 150,
      globalProgress: 50,
      globalXPNext: 100,
      handleSetShowXPModalToFalse: () => {},
      pointHistory: [],
      t: k => k,
    })));
    expect(appContent.getAttribute('aria-hidden')).toBe('true');
    expect(appContent.hasAttribute('inert')).toBe(true);
    await act(async () => root.unmount());
    root = null;
    expect(appContent.getAttribute('aria-hidden')).toBeNull();
    expect(appContent.hasAttribute('inert')).toBe(false);
    wrapper.remove();
  });

  it('view_prompt_dialog: focuses pre-checked choice radio and guards drag-out backdrop dismissal', async () => {
    loadAlloModule('view_prompt_dialog_module.js');
    const PromptDialog = window.AlloModules.PromptDialog.PromptDialog || window.AlloModules.PromptDialog;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    const onCancel = vi.fn();
    await act(async () => root.render(React.createElement(PromptDialog, {
      t: () => '',
      setPromptDialog: () => {},
      promptDialog: {
        title: 'Pick one',
        message: 'Choose an option',
        defaultValue: 'second',
        choices: [
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second' },
        ],
        onSubmit: () => {},
        onCancel,
      },
    })));
    const radios = host.querySelectorAll('input[type="radio"]');
    expect(document.activeElement).toBe(radios[1]);
    // Drag-out from dialog to backdrop must not close
    const dialog = host.querySelector('[role="dialog"]');
    const backdrop = host.querySelector('[role="presentation"]');
    await act(async () => {
      dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('view_hints_modal: surfaces visible disabled-reason text linked via aria-describedby', async () => {
    loadAlloModule('view_hints_modal_module.js');
    const HintsModal = window.AlloModules.HintsModal.HintsModal || window.AlloModules.HintsModal;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => root.render(React.createElement(HintsModal, {
      handleApplyHint: () => {},
      handleGenerateLessonIdeas: () => {},
      handleSaveExtensionToHistory: () => {},
      handleSetShowHintsModalToFalse: () => {},
      hintHistory: [],
      history: [],
      isGeneratingExtension: false,
      renderFormattedText: s => s,
      t: () => '',
    })));
    const genBtn = host.querySelector('[data-help-key="hints_generate_extension"]');
    expect(genBtn.disabled).toBe(true);
    expect(genBtn.getAttribute('aria-describedby')).toBe('hints-generate-disabled-reason');
    expect(host.querySelector('#hints-generate-disabled-reason')?.textContent).toMatch(/Create or open a lesson resource/i);
  });

  it('view_fab_stack: hides Explain mode when __alloAiSecretsLocked is true and renders mobile backdrop when open', async () => {
    loadAlloModule('view_fab_stack_module.js');
    const FabStack = window.AlloModules.FabStack.FabStack || window.AlloModules.FabStack;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    window.__alloAiSecretsLocked = true;

    await act(async () => root.render(React.createElement(FabStack, {
      activeView: 'simplified',
      generatedContent: { id: 'r1' },
      isFabExpanded: true,
      isTeacherMode: false,
      studentAiFeaturesHidden: false,
      studentProjectSettings: {},
      handleToggleIsFabExpanded: () => {},
      t: k => k,
    })));
    expect(host.querySelector('[data-help-key="tool_explain_mode"]')).toBeNull();
    expect(host.querySelector('[data-fab-mobile-backdrop="true"]')).not.toBeNull();
  });

  it('view_header, view_misc_modals, view_history_panel & view_sidebar_panels: enforce portal stacking, focus-trap stack, AI-off & IME guards', () => {
    const header = readFileSync(resolve(process.cwd(), 'view_header_source.jsx'), 'utf8');
    expect(header).toContain('{showSetupPathMenu && _headerPortal(');
    expect(header).toContain('{isLiveStatusOpen && _headerPortal(');
    expect(header).toContain('{isJoinPopoverOpen && _headerPortal(');
    expect(header).toContain('{!(studentDeviceVoiceOnly || voiceLocalOnly) && <option value="gemini">');
    expect(header).toContain('z-[10001] animate-in fade-in zoom-in-95');

    const modals = readFileSync(resolve(process.cwd(), 'view_misc_modals_source.jsx'), 'utf8');
    expect(modals).toContain('aiBackendBackdropDownRef');
    expect(modals).toContain('aiBackendTrapRef');
    expect(modals).toContain('const activeModel = storedOverrides[slot] || current;');
    expect(modals).toContain('[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])');

    const history = readFileSync(resolve(process.cwd(), 'view_history_panel_source.jsx'), 'utf8');
    expect(history).toContain('max-w-[calc(100vw-1.5rem)]');
    expect(history).toContain("else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishResourceRename(e, itemInstanceId, true); }");

    const sidebar = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
    expect(sidebar).toContain("mathMode !== 'Fluency Maze' && mathMode !== 'Fluency Probes'");
    expect(sidebar).toContain('window.__alloFocusTrapStack');
    expect(sidebar).toContain('flex flex-wrap gap-1.5');
    expect(sidebar).toContain("reader.onerror = () => { addToast && addToast(t(\"errors.file_read_failed\")");
  });
});
