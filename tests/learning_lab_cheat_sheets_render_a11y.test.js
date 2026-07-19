import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Personal Reference Sheet Builder rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkCheats', viewLabel: 'Personal Reference Sheet Builder',
      mytkCheats: { sheets: [
        { id: 'sheet-1', title: 'Biology', createdAt: 'invalid-date', sections: [{ id: 'section-1', title: 'Concepts', bullets: ['Cell membrane'] }] },
        { id: 'sheet-2', title: null, createdAt: '2000-01-02', sections: 'legacy-invalid-sections' },
        'legacy-invalid-sheet'
      ] }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders optional, private, non-causal guidance and safely skips invalid records', () => {
    expect(host.textContent).toContain('Personal Reference Sheet Builder');
    expect(host.textContent).toContain('Reference sheets are optional');
    expect(host.textContent).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
    expect(host.textContent).toContain('supplements, but does not replace');
    expect(host.querySelectorAll('ul[aria-label="Saved reference sheets"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Untitled reference sheet');
    expect(host.textContent).toContain('Date not recorded');
  });

  it('validates the required topic inline and moves focus to it', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-cheat-new-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const topic = host.querySelector('#learning-lab-cheat-new-title');
    expect(topic.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-cheat-title-error')?.textContent).toContain('Enter a topic');
    expect(document.activeElement).toBe(topic);
  });

  it('creates a blank user-controlled sheet and moves focus into the editor', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-cheat-new-title'), 'Chemistry'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-cheat-new-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelector('#learning-lab-cheat-editor-heading')?.textContent).toContain('Chemistry');
    expect(document.activeElement?.id).toBe('learning-lab-cheat-editor-heading');
    expect(host.querySelector('#learning-lab-cheat-section-title-0-0')?.value).toBe('');
    expect(host.querySelector('#learning-lab-cheat-bullet-0-0-0')?.value).toBe('');
  });

  it('uses an ordinary action group and visibly labels autosaved editable fields', async () => {
    await act(async () => { buttonByText(host, 'Open and edit').click(); await settleFocus(); });
    expect(host.querySelector('[role="toolbar"]')).toBeNull();
    expect(host.querySelector('[role="group"][aria-label="Reference sheet actions"]')).not.toBeNull();
    expect(host.textContent).toContain('Changes to the title, section titles, and bullets save automatically');
    expect(host.querySelector('label[for="learning-lab-cheat-sheet-title"]')?.textContent).toBe('Reference sheet title');
    expect(host.querySelector('label[for="learning-lab-cheat-section-title-0-0"]')?.textContent).toBe('Section title');
    expect(host.querySelector('label[for="learning-lab-cheat-bullet-0-0-0"]')?.textContent).toBe('Bullet 1');
    const sheetTitle = host.querySelector('input[id="learning-lab-cheat-sheet-title"]');
    expect(sheetTitle).not.toBeNull();
    await act(async () => { setValue(sheetTitle, 'Cell biology'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-cheat-sheet-title')?.value).toBe('Cell biology');
  });

  it('moves focus to newly added sections and bullets', async () => {
    await act(async () => { buttonByText(host, 'Open and edit').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Add section').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-cheat-section-title-0-1');
    const firstSection = host.querySelector('ol[aria-label="Reference sheet sections"] > li > section');
    await act(async () => { buttonByText(firstSection, 'Add bullet').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-cheat-bullet-0-0-1');
  });

  it('opens a confirmation dialog even when deleting a blank bullet', async () => {
    await act(async () => { buttonByText(host, 'Open and edit').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Add section').click(); await settleFocus(); });
    const sections = host.querySelectorAll('ol[aria-label="Reference sheet sections"] > li > section');
    await act(async () => { buttonByText(sections[1], 'Delete bullet').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this bullet?');
    expect(dialog?.textContent).toContain('bullet 1, from section 2');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
  });

  it('returns from the editor to the originating open control', async () => {
    await act(async () => { buttonByText(host, 'Open and edit').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, '← All reference sheets').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-cheat-open-0');
  });

  it('restores focus to the next record after confirmed sheet deletion', async () => {
    const firstDelete = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete reference sheet: Biology');
    await act(async () => { firstDelete.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this reference sheet?');
    await act(async () => { buttonByText(dialog, 'Delete reference sheet').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Saved reference sheets"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-cheat-open-0');
  });
});
