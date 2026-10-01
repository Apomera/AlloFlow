
describe('review recovery copies before restoring or removing them', () => {
  const leave = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
  async function createLocalCopy() { const rerender = await startConflict(); await click($('[data-reading-conflict-use]')); return rerender; }
  it('restores a reviewed copy into answer fields without saving and retains the displaced answer', async () => {
    await createLocalCopy(); const raw = localStorage.getItem(KEY); await click($('[data-reading-copy-review]'));
    expect(document.activeElement).toBe($('[data-reading-copy-panel]'));
    expect($('[data-reading-copy-current]').value).toContain('Saved elsewhere'); expect($('[data-reading-copy-selected]').value).toContain('This page draft');
    await click($('[data-reading-copy-restore]')); expect($('[data-section-prompt="mainIdea"]').value).toBe('This page draft'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect($('[data-reading-save-retry]').textContent).toBe('Save restored work'); expect(document.activeElement).toBe($('[data-reading-persistence] [role="status"]'));
    expect([...host.querySelectorAll('[data-reading-recovery-copy]')].some(x => x.value.includes('Saved elsewhere'))).toBe(true);
    await type($('[data-section-prompt="mainIdea"]'), 'Reviewed and edited'); expect(localStorage.getItem(KEY)).toBe(raw);
    await click($('[data-reading-save-retry]')); expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].mainIdea).toBe('Reviewed and edited');
  });

  it('rejects a stale restore review and leaves newer typing and the saved record intact', async () => {
    await createLocalCopy(); await click($('[data-reading-copy-review]')); await type($('[data-section-prompt="mainIdea"]'), 'New text since review');
    const raw = localStorage.getItem(KEY); await click($('[data-reading-copy-restore]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('New text since review'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect($('[data-reading-persistence]').textContent).toContain('draft or recovery copy changed');
  });

  it('removes only an explicitly confirmed copy and ends unnecessary reload warnings', async () => {
    await createLocalCopy(); const raw = localStorage.getItem(KEY); expect(leave()).toBe(true);
    await click($('[data-reading-copy-review]')); expect($('[data-reading-copy-remove]').disabled).toBe(true);
    await click($('[data-reading-copy-confirm]')); await click($('[data-reading-copy-remove]'));
    expect($('[data-reading-recovery-copy]')).toBeNull(); expect($('[data-section-prompt="mainIdea"]').value).toBe('Saved elsewhere');
    expect(localStorage.getItem(KEY)).toBe(raw); expect(leave()).toBe(false);
    expect(document.activeElement).toBe($('[data-reading-persistence] [role="status"]'));
  });

  it('cancels without changing data and hides a reviewed copy when the learner or passage changes', async () => {
    const rerender = await createLocalCopy(), raw = localStorage.getItem(KEY); await click($('[data-reading-copy-review]'));
    await click($('[data-reading-copy-cancel]')); expect(localStorage.getItem(KEY)).toBe(raw); expect($('[data-reading-recovery-copy]')).not.toBeNull();
    await click($('[data-reading-copy-review]')); rerender({ readingLearnerKey: 'Different learner' }); expect($('[data-reading-copy-panel]')).toBeNull();
    rerender({ generatedContent: item(LONG + '\n\nA revised passage.') }); expect($('[data-reading-copy-panel]')).toBeNull(); expect($('[data-reading-recovery-copy]')).toBeNull();
  });

  it('registers all restore/remove strings in the candidate catalog', () => {
    const strings = JSON.parse(readFileSync(candidate + 'ui_strings.js', 'utf8'));
    for (const [key, value] of Object.entries(JSON.parse(readFileSync('reports/reader-place-copy-controls/strings.json', 'utf8')))) expect(strings.simplified[key], key).toBe(value);
  });
});
